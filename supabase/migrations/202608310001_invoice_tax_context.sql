begin;

alter table public.invoices
  add column if not exists invoice_type text not null default 'ordinary',
  add column if not exists vat_mode text not null default 'excluded',
  add column if not exists vat_rate numeric(5,2) not null default 0,
  add column if not exists tax_year integer,
  add column if not exists tax_rule_version text not null default '';

alter table public.invoices
  drop constraint if exists invoices_invoice_type_check,
  add constraint invoices_invoice_type_check check (invoice_type in ('ordinary','official')),
  drop constraint if exists invoices_vat_mode_check,
  add constraint invoices_vat_mode_check check (vat_mode in ('excluded','included')),
  drop constraint if exists invoices_vat_rate_check,
  add constraint invoices_vat_rate_check check (vat_rate between 0 and 100),
  drop constraint if exists invoices_vat_consistency_check,
  add constraint invoices_vat_consistency_check check (
    (vat_mode = 'excluded' and vat_rate = 0)
    or (vat_mode = 'included' and vat_rate > 0)
  );

comment on column public.invoices.invoice_type is 'ordinary or official; classification selected by the issuer';
comment on column public.invoices.vat_mode is 'excluded or included; does not itself prove legal taxability';
comment on column public.invoices.tax_rule_version is 'versioned compliance profile applied during calculation';

commit;
