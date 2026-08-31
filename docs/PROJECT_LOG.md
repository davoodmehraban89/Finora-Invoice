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


## 2026-08-31 — Formal and informal invoice templates

- Status: `PLANNED`
- Roadmap chapters: 10, 13, 14, 16, 31, 45, 46, 141, 142, 231–260; scope class: `IN_V1`.
- User outcome: connect the existing Finora invoice slice end-to-end and provide distinct Persian A4 print outputs for رسمی and غیررسمی invoices based on supplied references.
- In scope: invoice template type, seller/buyer legal identity fields, serial and payment terms, official tax columns, informal compact layout, print preview, database compatibility migration, automated calculation/UI/security contract tests, deployed verification.
- Out of scope: legal certification, production tax-authority submission, final organization/tenant architecture, and storing sample personal data from reference images.
- Intended files: invoice pages, shared JS/CSS, Supabase migration, tests, status/handoff/decision documentation.
- Data/security impact: new optional document metadata remains protected by existing authenticated-user RLS; no service-role credential or personal sample data is introduced.
- Migration/rollback: additive versioned migration with nullable/defaulted columns; UI remains compatible with existing invoice rows; rollback is documented and avoids destructive loss of posted financial history.
- Risks: official-layout claims without legal review, tax-rate hardcoding, print clipping, migration not yet applied, and missing two-user isolation evidence.
- Planned tests: invoice math and validation, formal/informal rendering contracts, legacy-row compatibility, JavaScript syntax, print layout inspection, live demo regression, and authenticated/two-user UAT when credentials can be securely authorized.
