# Finora Project Log

This is an append-oriented evidence log. Do not erase historical entries. Correct mistakes with a new dated entry.

## 2026-08-28 — Invoice vertical slice foundation

- Status: `ACCEPTED` on `main`
- Scope: customer, product/service, seller settings, invoice calculation, draft/issue, payment, balance, void, dashboard, list, and print.
- Evidence: commits `76d4ff9`, `13a7325`.
- Data: Supabase Auth/PostgreSQL migration with per-user RLS and atomic invoice numbering.
- Deployment: Cloudflare Workers Builds from GitHub `main`.
- Remaining: authenticated UAT, two-user isolation test, CI, accessibility, monitoring, and enterprise tenant model.

## 2026-08-28 — Mobile save and in-invoice quick creation

- Status: `VERIFIED` for deployed demo; authenticated UAT still required
- Scope: repair customer/product form handlers, display real save errors, add quick customer/product creation inside invoice, harden settings/payment/void operations.
- Evidence: commit `0667f3a7572d5bc8d870249e1180933f76d79bf2`.
- Tests: `node --test tests/invoice-core.test.js` passed 4/4; inline scripts parsed; live demo flow completed through draft preview.
- Risk found later: persisted customer type differed from the database enum for natural persons.

## 2026-08-28 — Customer type contract correction

- Status: `VERIFIED` by static contract check; authenticated UAT still required
- Scope: replace UI value `individual` with database value `person` in normal and quick customer creation.
- Evidence: commit `62fe92eacbfd3a369432ece83e642fad46b62239`.
- Tests: inline scripts parsed, no remaining `individual` token in affected files, invoice unit tests passed 4/4.

## 2026-08-28 — Durable project-control foundation

- Status: `ACCEPTED` on `main`
- Files: `AGENTS.md`, `PROJECT_STATUS.md`, bootstrap/recovery and handoff files, roadmap control, acceptance policy, decision log, project log, task template, PR checklist, and automated control tests.
- Purpose: make GitHub the durable project memory and prevent loss of the 260-chapter roadmap when chats disappear.
- Evidence: commit `c58c3356dbfe04d74589e897d7f90aaa21d8564e`.
- Tests: `node --test tests/*.test.js` passed 9/9; master roadmap SHA-256 matched; required control files and product identity rules passed; all inline scripts parsed; `git diff --check` passed.
- Rollback: documentation-only files can be reverted without changing runtime behavior; code baseline remains `62fe92e`.

## 2026-08-31 — Invoice type, VAT profile, and print/PDF choices

- Status: `PLANNED`
- Work branch: `codex/invoice-tax-print-options`
- Roadmap chapters: 14, 16, 17, 31, 46, 63, 231, 251, 259, 260.
- Scope class: `IN_V1` for invoice UX and persisted tax context; `FOUNDATION_ONLY` for the wider Iran compliance register.
- User outcome: choose formal or ordinary invoice, choose VAT-enabled or VAT-free calculation, retain the applied annual tax profile, and explicitly choose printer or PDF output.
- In scope: invoice form controls, deterministic VAT mode calculation, versioned Iran VAT profile, A4 preview labels, output-choice dialog, database migration, automated tests, and durable documentation.
- Out of scope: production Taxpayer System submission, legal certification, automatic ingestion of every Iranian law, special-goods/exemption classification, and final accountant/legal approval.
- Intended files: `new-invoice.html`, `invoice-preview.html`, `assets/js/invoice-core.js`, `assets/js/tax-rules.js`, `assets/css/app.css`, `supabase/migrations/202608310001_invoice_tax_context.sql`, tests, and project-control documents.
- Tests: Node unit/negative tests, JavaScript syntax checks, migration/static contract checks, and demo browser flow when a preview deployment is available.
- Risks: an annual general VAT rate does not determine exemptions or special rates; browser security does not permit preselecting “Save as PDF”; the migration must be applied before authenticated production saves use the new columns.
- Security/data impact: no secret or credential change; new invoice classification and tax-rule provenance remain subject to existing per-user RLS.
- Migration impact: additive nullable/defaulted columns; existing invoices remain readable through compatibility defaults.
- Rollback: revert UI/core changes and the additive migration; do not destructively remove populated columns without an explicit data-retention decision.
