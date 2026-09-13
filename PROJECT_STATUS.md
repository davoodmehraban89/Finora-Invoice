# Finora Project Status

Last evidence review: 2026-09-13 UTC

Repository: `davoodmehraban89/Finora-Invoice`

Canonical branch: `main`

Verified main baseline: `2e73cbbe2fa918b2bb909cd5b26130d35fd92a85`

Current review branch: `codex/finora-security-evidence-closeout`

Live deployment: <https://finora-invoice.davoodmehraban89.workers.dev>

## Product identity

**Finora — Comprehensive Enterprise ERP Software**

**فینورا — نرم‌افزار جامع ERP سازمانی**

The current delivery slice is **صدور فاکتور**. The permanent product scope remains the 260-chapter ERP roadmap in `Finora_Master_Specification_Final_Chapters_001_260.docx`.

## Accepted on main

- Persian RTL static frontend deployed by Cloudflare Workers Builds.
- Supabase Auth and PostgreSQL data layer with per-user `auth.uid()` ownership policies.
- Customer, product/service, seller settings, invoice draft/issue/edit/payment/balance/void/list/dashboard flows.
- Explicit registration mode with password confirmation, verification-email messaging, resend action, and defensive sign-out when signup unexpectedly returns a session.
- Official invoices: A4 landscape, fixed 15-row print table, legal party fields, VAT column, totals, Persian amount in words, signatures, and payment notes.
- Unofficial invoices: A5 landscape, 5–10 print rows, no VAT column, legal party fields, totals, Persian amount in words, signatures, and payment notes.
- Browser UI blocks row 16 for official invoices and row 11 for unofficial invoices.
- Issued and void invoice party snapshots remain immutable when customer or seller master data changes.
- Amounts remain stored in rial while the selected presentation unit can be rial or toman.
- GitHub CI, static deployment configuration, and demo-mode browser workflow.

## Verified evidence

- Remote `main` and local baseline both resolved to `2e73cbbe2fa918b2bb909cd5b26130d35fd92a85` before this review.
- `node --test tests/*.test.js`: 23/23 passed after adding the security migration contract.
- Every application JavaScript file passed `node --check`; every inline application script parsed; `git diff --check` passed.
- All five migration files parsed successfully with PostgreSQL 17 grammar through `pgsql-parser`.
- Live Cloudflare demo UAT on 2026-09-13 created an official 15-row invoice and an unofficial 10-row invoice. A 16th/11th row was rejected with the correct paper-specific message.
- The deployed official preview showed 15 rows, A4 marker, tight density, no horizontal overflow, no email or party-type fields, and an enabled output action.
- The deployed unofficial preview showed 10 rows, A5 marker, compact density, no VAT header, no horizontal overflow, no email field, and an enabled output action.
- Full-page screenshots of both deployed previews were inspected: headers, party panels, all rows, totals, amount in words, signatures, and legal footer were visible without clipping or overlap.
- The master roadmap hash remains `f445ec30b395319aece8bd7eb7d98e80bd4655eff6cc81b0253688b551bbc29b`; Chapters 10, 11, 14, 16, 29, 31, 77, 231, 247, 251, 259, and 260 were reviewed for this work.

## Current review change

- Migration `20260913212458_harden_invoice_snapshot_trigger.sql` moves all invoice trigger functions from exposed `public` to unexposed `private`.
- Direct function execution is revoked from `PUBLIC`, `anon`, and `authenticated`.
- Snapshot capture and invoice-number update guard run as `SECURITY INVOKER`, preserving caller RLS.
- Atomic counter assignment remains `SECURITY DEFINER` because authenticated users have no direct counter-table privileges, but the function is trigger-only, outside the exposed schema, and not directly executable.
- CI now requires both the completion-snapshot migration and the security-hardening migration.

## Open acceptance gates

- The Supabase connector currently exposes only project `lzvkobokpdmlfckyjxzt` (`AvanTech`), while production Finora is configured for `npqeyfghtewymiqyxuce`. The hardening migration therefore has not been applied or catalog-verified on production.
- Production Auth `Confirm email`, SMTP delivery, a real verified signup, and rejection before confirmation still require end-to-end evidence on the Finora Supabase project.
- Authenticated persistence and two-account RLS isolation remain unverified on production.
- Native physical PDF page count could not be generated in this execution environment: the managed browser does not expose print export, and locally downloaded Chromium exited with `SIGTRAP`. The deployed visual frame and print CSS contracts passed, but exact PDF page count remains unverified.
- Legal certification of the provisional Iran 1405 VAT profile and Taxpayer System submission are outside the current evidence.
- The final enterprise organization/tenant model, backup/restore drill, monitoring, incident process, and the remaining Version 1 domains are not yet implemented.

## Single safest next action

Connect the Supabase account that owns project `npqeyfghtewymiqyxuce`, apply the hardening migration, then run catalog/advisor/authenticated two-user acceptance checks before production acceptance.
