begin;

-- Add new fields to seller_settings
alter table public.seller_settings
  add column if not exists registration_number text not null default '',
  add column if not exists invoice_type_default text not null default 'unofficial' check(invoice_type_default in('official','unofficial')),
  add column if not exists currency text not null default 'rial' check(currency in('rial','toman')),
  add column if not exists logo_url text not null default '';

-- Add new fields to invoices
alter table public.invoices
  add column if not exists invoice_type text not null default 'unofficial' check(invoice_type in('official','unofficial'));

commit;
