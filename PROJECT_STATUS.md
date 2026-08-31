# Finora Project Status

Last evidence review: 2026-08-31 UTC
Repository: `davoodmehraban89/Finora-Invoice`  
Canonical branch: `main`  
Latest verified code baseline at preparation time: `62fe92eacbfd3a369432ece83e642fad46b62239`  
Live deployment: <https://finora-invoice.davoodmehraban89.workers.dev>

## Product identity

**Finora — Comprehensive Enterprise ERP Software**  
**فینورا — نرم‌افزار جامع ERP سازمانی**

Finora is not limited to invoicing. The complete scope is governed by `Finora_Master_Specification_Final_Chapters_001_260.docx`. The current delivery slice is **صدور فاکتور** and is intended to become part of the wider ERP platform.

## Durable source hierarchy

1. GitHub remote branch, commits, diffs, checks, releases, and deployment evidence.
2. `Finora_Master_Specification_Final_Chapters_001_260.docx`, with Chapters 251, 259, and 260 governing release boundary and acceptance.
3. `AGENTS.md` and `docs/ROADMAP_260_CONTROL.md`.
4. `docs/DECISION_LOG.md` and `docs/ACCEPTANCE_POLICY.md`.
5. This status file, `docs/PROJECT_LOG.md`, and `docs/handoff/LATEST_HANDOFF.md`.
6. Chat narratives, which are never authoritative without repository evidence.

## Accepted on `main`

- Persian RTL static frontend for the invoice workstream.
- Supabase Authentication and PostgreSQL data layer.
- RLS ownership isolation through `auth.uid()` for operational tables.
- Versioned migration for customers, products, seller settings, invoices, and atomic invoice numbering.
- Customer and product create/edit/search/archive flows.
- Quick customer and product creation inside invoice issuance.
- Invoice draft, issue, edit, payment tracking, balance, void, list, dashboard, and A4 print view.
- Mobile navigation and mobile-friendly dialogs.
- Cloudflare Workers static deployment connected to GitHub `main`.
- Independent demo mode using browser LocalStorage.
- Unit tests for invoice calculation, validation, payment, and document state.

## Verified evidence

- `13a7325`: migration from Firebase-era assumptions to Supabase.
- `0667f3a`: mobile save repair and quick-add customer/product workflow.
- `62fe92e`: customer type contract aligned with the database (`person | legal`).
- Unit command: `node --test tests/invoice-core.test.js` — 4/4 passing on 2026-08-28.
- Live demo workflow verified for customer creation, product creation, quick-add in invoice, line creation, and draft preview.

## Not yet accepted / requires evidence

- Authenticated production UAT covering create/update/archive against Supabase with a real user session.
- Cross-user isolation test using two authenticated accounts.
- CI workflow running tests on every pull request and `main` update.
- Full browser regression suite and accessibility audit.
- Production-grade organization/tenant model beyond the current per-user ownership model.
- Iranian tax/e-invoicing compliance, accounting posting engine, inventory integration, and the rest of Version 1 defined by Chapter 251.
- Backup/restore drill, monitoring, incident process, and independent security review.

## Implemented on review branch — not accepted

- Branch: `codex/invoice-tax-print-options`.
- Formal/ordinary invoice classification and VAT-enabled/VAT-free selection are implemented.
- The applied VAT rate, tax year, and rule version are persisted through an additive Supabase migration.
- The 1405 general VAT profile is provisionally set to 10% as requested; exemptions, special rates, and enacted-source verification remain open.
- Invoice preview distinguishes invoice/VAT type and provides explicit PDF or printer output choices.
- Automated Node and static contract tests pass; authenticated production UAT, migration application, Cloudflare preview/deployment, and legal/accounting review remain required before acceptance.
- The same review branch now includes expanded seller/invoice settings and a database-enforced invoice-number policy: automatic locked numbering or user-editable numbering, with per-user uniqueness retained.
- Invoice defaults now cover ordinary/formal type, VAT mode, payment method, output preference, automatic prefix, seller registration/location/contact data, and invoice footer text.
- Evidence: all inline scripts parse, `git diff --check` passes, `node --test tests/*.test.js` passes 14/14, and GitHub Actions run `33402769849` succeeded on review commit `2a3c9f3`.

## Current blockers and risks

- The repository currently represents only the invoice vertical slice, not the complete ERP architecture.
- User-level ownership is a safe initial boundary but is not yet the final multi-tenant organization model.
- The application depends on correct Supabase Auth settings, RLS policies, and the applied migration.
- Review-branch saves require both additive migrations `202608310001` and `202608310002`; deploying the UI before the migrations will make the new settings fail against Supabase.
- Cloudflare branch deployment succeeded after adding `wrangler.jsonc`; review URL: `https://codex-invoice-tax-print-options-finora-invoice.davoodmehraban89.workers.dev`. Production remains on the prior accepted code.
- The 260-chapter specification is broad; work must be gated by Chapter 251 and accepted by Chapter 259 to prevent scope collapse.

## Safest next action

Run an authenticated mobile UAT of customer, product, invoice, payment, archive, and isolation paths; record evidence before expanding the invoice workstream.
