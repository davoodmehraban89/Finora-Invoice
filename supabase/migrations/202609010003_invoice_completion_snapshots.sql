begin;

alter table public.customers
  add column if not exists postal_code text not null default '',
  add column if not exists economic_code text not null default '',
  add column if not exists registration_number text not null default '';

alter table public.seller_settings
  add column if not exists currency_unit text not null default 'rial';

alter table public.seller_settings
  drop constraint if exists seller_settings_currency_unit_check,
  add constraint seller_settings_currency_unit_check
    check (currency_unit in ('rial', 'toman'));

alter table public.invoices
  add column if not exists seller_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists customer_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists currency_unit text not null default 'rial';

alter table public.invoices
  drop constraint if exists invoices_seller_snapshot_object_check,
  add constraint invoices_seller_snapshot_object_check
    check (jsonb_typeof(seller_snapshot) = 'object'),
  drop constraint if exists invoices_customer_snapshot_object_check,
  add constraint invoices_customer_snapshot_object_check
    check (jsonb_typeof(customer_snapshot) = 'object'),
  drop constraint if exists invoices_currency_unit_check,
  add constraint invoices_currency_unit_check
    check (currency_unit in ('rial', 'toman'));

create or replace function public.capture_invoice_party_snapshots()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  customer_row public.customers%rowtype;
  seller_row public.seller_settings%rowtype;
begin
  if tg_op = 'UPDATE' and old.document_status in ('issued', 'void') then
    new.seller_snapshot := old.seller_snapshot;
    new.customer_snapshot := old.customer_snapshot;
    new.currency_unit := old.currency_unit;
    return new;
  end if;

  select * into customer_row
    from public.customers
   where id = new.customer_id and user_id = new.user_id;
  select * into seller_row
    from public.seller_settings
   where user_id = new.user_id;

  new.customer_snapshot := jsonb_build_object(
    'name', coalesce(customer_row.name, new.customer_name, ''),
    'nationalId', coalesce(customer_row.national_id, new.customer_national_id, ''),
    'economicCode', coalesce(customer_row.economic_code, ''),
    'registrationNumber', coalesce(customer_row.registration_number, ''),
    'phone', coalesce(customer_row.phone, ''),
    'postalCode', coalesce(customer_row.postal_code, ''),
    'address', coalesce(customer_row.address, '')
  );
  new.seller_snapshot := jsonb_build_object(
    'businessName', coalesce(seller_row.business_name, ''),
    'nationalId', coalesce(seller_row.national_id, ''),
    'economicCode', coalesce(seller_row.economic_code, ''),
    'registrationNumber', coalesce(seller_row.registration_number, ''),
    'phone', coalesce(seller_row.phone, ''),
    'postalCode', coalesce(seller_row.postal_code, ''),
    'province', coalesce(seller_row.province, ''),
    'city', coalesce(seller_row.city, ''),
    'address', coalesce(seller_row.address, ''),
    'invoiceFooter', coalesce(seller_row.invoice_footer, ''),
    'bankAccount', coalesce(seller_row.bank_account, '')
  );
  new.currency_unit := coalesce(nullif(new.currency_unit, ''), seller_row.currency_unit, 'rial');
  return new;
end;
$$;

drop trigger if exists invoices_party_snapshots on public.invoices;
create trigger invoices_party_snapshots
before insert or update of customer_id, customer_name, customer_national_id, document_status,
  seller_snapshot, customer_snapshot, currency_unit
on public.invoices
for each row execute function public.capture_invoice_party_snapshots();

comment on column public.invoices.seller_snapshot is
  'Immutable seller identity used when reprinting issued or void invoices.';
comment on column public.invoices.customer_snapshot is
  'Immutable customer identity used when reprinting issued or void invoices.';
comment on column public.invoices.currency_unit is
  'Presentation unit captured with the invoice; monetary storage remains in rial base units.';

commit;
