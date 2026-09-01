begin;

alter table public.seller_settings
  add column if not exists postal_code text not null default '';

alter table public.customers
  add column if not exists postal_code text not null default '',
  add column if not exists economic_code text not null default '',
  add column if not exists registration_number text not null default '';

commit;
