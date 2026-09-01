begin;

alter table public.seller_settings
  add column if not exists registration_number text not null default '',
  add column if not exists website text not null default '',
  add column if not exists postal_code text not null default '',
  add column if not exists province text not null default '',
  add column if not exists city text not null default '',
  add column if not exists invoice_number_editable boolean not null default false,
  add column if not exists invoice_prefix text not null default 'FI-',
  add column if not exists default_invoice_type text not null default 'ordinary',
  add column if not exists default_vat_mode text not null default 'excluded',
  add column if not exists default_payment_method text not null default 'نقدی',
  add column if not exists default_output_mode text not null default 'printer',
  add column if not exists invoice_footer text not null default '';

alter table public.seller_settings
  drop constraint if exists seller_settings_invoice_prefix_check,
  add constraint seller_settings_invoice_prefix_check check (char_length(invoice_prefix) <= 20),
  drop constraint if exists seller_settings_default_invoice_type_check,
  add constraint seller_settings_default_invoice_type_check check (default_invoice_type in ('ordinary','official')),
  drop constraint if exists seller_settings_default_vat_mode_check,
  add constraint seller_settings_default_vat_mode_check check (default_vat_mode in ('excluded','included')),
  drop constraint if exists seller_settings_default_output_mode_check,
  add constraint seller_settings_default_output_mode_check check (default_output_mode in ('printer','pdf'));

alter table public.invoices
  drop constraint if exists invoices_invoice_number_length_check,
  add constraint invoices_invoice_number_length_check check (
    invoice_number is null or char_length(btrim(invoice_number)) between 1 and 80
  );

create or replace function public.assign_invoice_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_value bigint;
  number_editable boolean := false;
  configured_prefix text := 'FI-';
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;

  select s.invoice_number_editable, s.invoice_prefix
    into number_editable, configured_prefix
    from public.seller_settings s
   where s.user_id = new.user_id;

  number_editable := coalesce(number_editable, false);
  configured_prefix := coalesce(configured_prefix, 'FI-');

  if not number_editable or new.invoice_number is null or btrim(new.invoice_number) = '' then
    insert into public.invoice_counters(user_id, value)
    values(new.user_id, 1)
    on conflict(user_id) do update
      set value = public.invoice_counters.value + 1
    returning value into next_value;
    new.invoice_number := configured_prefix || lpad(next_value::text, 6, '0');
  else
    new.invoice_number := btrim(new.invoice_number);
  end if;

  return new;
end;
$$;

create or replace function public.guard_invoice_number_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  number_editable boolean := false;
begin
  if old.invoice_number is not distinct from new.invoice_number then
    return new;
  end if;

  select s.invoice_number_editable
    into number_editable
    from public.seller_settings s
   where s.user_id = old.user_id;

  if not coalesce(number_editable, false) then
    raise exception 'Invoice number editing is locked in seller settings.'
      using errcode = '42501';
  end if;

  if new.invoice_number is null or char_length(btrim(new.invoice_number)) = 0 then
    raise exception 'Invoice number cannot be empty.'
      using errcode = '23514';
  end if;

  new.invoice_number := btrim(new.invoice_number);
  return new;
end;
$$;

drop trigger if exists invoices_number_guard on public.invoices;
create trigger invoices_number_guard
before update of invoice_number on public.invoices
for each row execute function public.guard_invoice_number_update();

comment on column public.seller_settings.invoice_number_editable is
  'When false, invoice numbers are assigned automatically and cannot be changed after creation.';
comment on column public.seller_settings.invoice_prefix is
  'Prefix used by the automatic per-user invoice counter.';

commit;
