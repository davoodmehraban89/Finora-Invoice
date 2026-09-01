# Finora Project Log

This is an append-oriented evidence log. Do not erase historical entries. Correct mistakes with a new dated entry.

## 2026-09-01 — Production database migration and deployed template UAT

- Status: `VERIFIED` for migration application and deployed demo flow; authenticated data UAT is waiting for email confirmation of the newly created test account.
- Production database: Supabase project `npqeyfghtewymiqyxuce` was opened through the authorized dashboard. Pre-migration inspection confirmed the five operational tables and five `owner_all` RLS policies scoped to `auth.uid()`.
- Applied migrations, in order: `supabase/migrations/202608310001_invoice_tax_context.sql` and `supabase/migrations/202608310002_invoice_settings_numbering.sql`. The SQL editor returned `Success. No rows returned`; both files are additive and completed inside explicit transactions.
- Deployed UAT: the Cloudflare branch preview loaded successfully. A formal VAT-enabled 1405 invoice was created in demo mode with an automatically locked `FI-000001` number, one catalog line, 10% versioned VAT, official seller/buyer panels, signatures, totals, balance, and tax-profile evidence.
- Automated verification: `node --test tests/*.test.js` passed 16/16; JavaScript syntax and `git diff --check` passed on branch HEAD `6d61d5214ecb91749e0bcf6e05faa7c4036d07af`.
- Auth: a Supabase Auth test account was created successfully. Supabase requires email confirmation before authenticated UAT can continue; no matching confirmation message was found in the connected Gmail account, so the account may use another email address or delivery may be delayed.
- Remaining acceptance gates: confirm the test-account email, run authenticated create/update/archive/payment/settings flows, run an independent second-user isolation test, and verify the production deployment after merge.

## 2026-08-31 — One-page professional invoice print templates

- Status: `PLANNED` on PR #2 from the product-owner PDF evidence `فاکتور | فینورا-4.pdf`.
- Evidence: the Safari A4 export contains two pages with one line item; page 2 contains only receipt/balance and the legal footer. The print viewport activates the mobile `max-width` rule, collapsing invoice metadata to one column and consuming excessive vertical space.
- Requested scope: professional compact A4 output, separate ordinary and official visual/data structures, and one-page output for normal invoice sizes.
- Planned controls: print-specific grid overrides, compact header/party/summary layout, distinct official legal-identification table, distinct ordinary commercial layout, controlled page breaks, automated UI contracts, deployed PDF visual verification, and synchronized status/handoff evidence.

### Implementation evidence

- Status: `IMPLEMENTED_UNVERIFIED` pending deployed PDF visual verification.
- Replaced the shared title-only print view with separate ordinary and official structures. Official output has legal seller/buyer identification panels; ordinary output uses compact commercial party cards.
- Added print-specific A4 rules after mobile CSS so Safari print cannot collapse party metadata into one column. Header, metadata, rows, totals, signatures, and legal footer are compact and use controlled page breaks.
- Local checks pass 16/16, the inline preview script parses, `git diff --check` passes, and GitHub Actions run `33409656301` succeeded on `0486750a20e6b7dfe80687c8c0727f866c502330`.
- PDF visual QA: a combined A4 fixture rendered as exactly two pages—page 1 contained the complete ordinary invoice and page 2 contained the complete official invoice. Neither template overflowed to an additional page; headers, party panels, line table, totals, signatures, and legal footer were visually inspected without clipping or overlap.

## 2026-08-31 — Cloudflare static-assets deployment repair

- Status: `PLANNED` on PR #2 after direct build-log evidence supplied by the product owner.
- Root cause: Cloudflare successfully initialized, cloned, and installed, then `npx wrangler versions upload` failed because the repository had neither a Wrangler configuration nor an explicit static-assets directory.
- Planned repair: add an assets-only `wrangler.jsonc`, preserve `.assetsignore` exclusions, validate the configuration, push to the review branch, and use the Cloudflare branch build as acceptance evidence.

### Implementation evidence

- Status: `IMPLEMENTED_UNVERIFIED` pending a new Cloudflare branch build.
- Added assets-only `wrangler.jsonc` for `finora-invoice` with the repository root as the static directory.
- Hardened `.assetsignore` so repository controls, documentation, tests, migrations, and deployment configuration are not published as website files.
- Local tests pass 15/15 and GitHub Actions run `33406241542` succeeded on commit `0064cdd4b032d7297aeb077ac70588038e1e4179`.
- GitHub's Cloudflare comment still references the older failed commit `2fcd34d`; a new Cloudflare build/preview has not yet been observed and must not be claimed successful.
- Follow-up deployment evidence: Cloudflare successfully deployed repair commit `0064cdd4`; stable branch preview is `https://codex-invoice-tax-print-options-finora-invoice.davoodmehraban89.workers.dev` and commit preview is `https://64eed8bd-finora-invoice.davoodmehraban89.workers.dev`.

## 2026-08-31 — Invoice numbering policy and settings expansion

- Status: `PLANNED` on `codex/invoice-tax-print-options`.
- Requested scope: allow user-defined invoice numbers when enabled, allow administrators to lock invoice-number editing from settings, and expand invoice-related seller defaults.
- Planned controls: database-enforced lock, per-user uniqueness, editable/manual mode, automatic prefix, invoice/tax/payment/output defaults, seller identity/contact/print fields, additive migration, tests, and synchronized status/log/handoff evidence.
- Acceptance boundary: implementation on the review branch is not accepted until migration application, CI, Cloudflare preview, and authenticated UAT are evidenced.

### Implementation evidence

- Status: `IMPLEMENTED_UNVERIFIED` on the review branch.
- Added database-enforced automatic locked/manual editable numbering, configurable prefix, duplicate protection, and demo-mode parity.
- Expanded seller settings with legal identity/contact/location fields plus invoice, VAT, payment, output, and footer defaults.
- Added migration `202608310002_invoice_settings_numbering.sql` and ADR-008.
- Local checks: `node --test tests/*.test.js` 14/14 passed; affected inline scripts parsed; JavaScript syntax and `git diff --check` passed.
- Remote evidence: PR #2 is mergeable and remains Draft; GitHub Actions run `33402769849` succeeded for commit `2a3c9f3bd564ea7b525622210921bb1cd6a98a10`.
- Deployment evidence: no new Cloudflare preview URL exists; the Cloudflare PR report still shows a failed branch build. Production was not changed.

## 2026-08-31 — CI contract repair for Supabase

- Status: `IMPLEMENTED_UNVERIFIED` pending the follow-up GitHub Actions run on PR #2.
- Scope: replace the obsolete Firebase `firestore.rules` presence check with the active Supabase migration checks, add the tax-rule module check, and run all Node test files in CI.
- Evidence: the first PR #2 workflow passed all seven invoice tests and failed only at the stale `firestore.rules` check.

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

## 2026-08-31 — Invoice tax and output controls implemented for review

- Status: `IMPLEMENTED_UNVERIFIED` on `codex/invoice-tax-print-options`; not accepted on `main`.
- Outcome: formal/ordinary invoice selection, VAT on/off selection, provisional 1405 general rate of 10%, stored tax year/rule version, preview labels, and explicit PDF/printer choices.
- Files: `new-invoice.html`, `invoice-preview.html`, `assets/js/invoice-core.js`, `assets/js/tax-rules.js`, `assets/css/app.css`, `supabase/migrations/202608310001_invoice_tax_context.sql`, `docs/IRAN_COMPLIANCE_REGISTER.md`, README, tests, status, decision log, and handoff.
- Tests: `node --test tests/*.test.js` passed 13/13; `node --check` passed for application/core/rule scripts; `git diff --check` passed.
- Negative coverage: VAT-enabled invoices reject zero rates; VAT-free mode deterministically removes tax; unknown tax year visibly falls back and warns.
- Database/security: additive invoice columns inherit the existing table RLS; no credential or policy broadening.
- Limitation: browser security requires the user to choose “Save as PDF” in the native print dialog; the application cannot preselect it.
- Legal limitation: this is compliance infrastructure, not certification or complete implementation of Iranian tax, commercial, direct-tax, or Taxpayer System law.
- Verification gap: the cloud browser could not reach the isolated local preview; authenticated Supabase UAT and deployed Cloudflare verification remain open.
- Rollback: revert the branch before merge; after migration/data use, retain populated additive columns unless a separately approved data migration removes them.

## 2026-09-01 — Landscape single-page invoice printing

- Status: `PLANNED` on the existing review branch `codex/invoice-tax-print-options`.
- Roadmap chapters: 14, 29, 247, 251, 259, and 260; scope class `IN_V1`.
- User outcome: every formal and ordinary invoice print/PDF uses A4 landscape and stays on one physical page for the supported invoice line budget.
- In scope: explicit landscape page contract, compact official/ordinary layouts, print-density classes based on item count, single-page overflow protection, automated contract tests, and rendered PDF inspection.
- Acceptance target: both formal and ordinary fixtures with 15 invoice rows each produce one readable A4 landscape PDF page without clipped content.
- Intended files: `invoice-preview.html`, `assets/css/mobile.css`, `tests/project-control.test.js`, status/log/handoff documents, and temporary PDF QA fixtures.
- Risks: browser print engines can apply different header/footer and scaling defaults; unbounded item counts cannot remain readable on a fixed A4 sheet. The application will enforce its supported single-page row budget rather than silently clipping rows.
- Security/data/migration impact: none; presentation-only change with no database, RLS, credential, or invoice-calculation change.
- Rollback: revert the print CSS, density marker, row-budget validation, and related tests.

### Implementation evidence

- Status: `IMPLEMENTED_UNVERIFIED` on the deployed review branch; not accepted on `main`.
- Print contract: `@page` is explicitly `A4 landscape` with 6 mm margins; the printable frame is fixed at 285 × 198 mm and uses standard, compact, or tight density according to item count.
- Single-page guard: invoice creation stops at 15 rows. Legacy invoices above 15 rows disable output and show an explicit correction message instead of clipping an unknown number of rows.
- Deployed demo UAT: both a formal VAT-enabled invoice and an ordinary invoice were issued with 15 rows. Each preview rendered all 15 rows, selected `print-density-tight`, displayed its footer, and kept output enabled.
- Automated evidence: 16/16 Node tests passed locally and GitHub Actions run `33464364756` succeeded on review commit `1d9eed324504ab97d6fc1c8835f2692ed53f82bc`; both affected inline scripts parsed and `git diff --check` passed.
- Remaining visual gate: the deployed Cloudflare stylesheet and complete 15-row DOMs were verified, but this cloud browser cannot export the native print preview to a file. Final Safari/Chrome PDF page-count inspection remains required before acceptance or merge.
