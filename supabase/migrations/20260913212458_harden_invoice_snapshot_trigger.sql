-- Compatibility: trigger OIDs remain attached to their existing tables while the
-- functions move out of the exposed public schema. No table or API shape changes.
-- Rollback: move the functions back to public only in a separately reviewed
-- migration; never restore direct EXECUTE grants on privileged trigger functions.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter function public.assign_invoice_number() set schema private;
alter function public.guard_invoice_number_update() set schema private;
alter function public.capture_invoice_party_snapshots() set schema private;

alter function private.guard_invoice_number_update() security invoker;
alter function private.capture_invoice_party_snapshots() security invoker;

revoke all on function private.assign_invoice_number() from public, anon, authenticated;
revoke all on function private.guard_invoice_number_update() from public, anon, authenticated;
revoke all on function private.capture_invoice_party_snapshots() from public, anon, authenticated;

comment on function private.assign_invoice_number() is
  'Privileged trigger-only invoice numbering function. Direct execution is revoked.';
comment on function private.guard_invoice_number_update() is
  'Trigger-only invoice number guard running with caller privileges and RLS.';
comment on function private.capture_invoice_party_snapshots() is
  'Trigger-only party snapshot capture running with caller privileges and RLS.';

commit;
