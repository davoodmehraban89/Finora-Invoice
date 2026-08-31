# Finora Latest Handoff

Prepared: 2026-08-28 UTC  
Authoritative HEAD: always resolve from GitHub at recovery time  
Latest verified code baseline: `62fe92eacbfd3a369432ece83e642fad46b62239`

Durable control foundation: `c58c3356dbfe04d74589e897d7f90aaa21d8564e`

## Product and roadmap

- Product: **Finora — Comprehensive Enterprise ERP Software / فینورا — نرم‌افزار جامع ERP سازمانی**
- Current workstream: **صدور فاکتور**
- Roadmap authority: `Finora_Master_Specification_Final_Chapters_001_260.docx`
- Roadmap integrity anchor: `f445ec30b395319aece8bd7eb7d98e80bd4655eff6cc81b0253688b551bbc29b`
- Chapters present: 260/260

## Current technical state

- Frontend: static Persian RTL HTML/CSS/JavaScript.
- Authentication/data: Supabase Auth and PostgreSQL.
- Security boundary: per-user `auth.uid()` ownership with RLS.
- Hosting: Cloudflare Workers Builds connected to GitHub `main`.
- Runtime tables: `invoice_counters`, `customers`, `products`, `seller_settings`, `invoices`.
- Demo mode: isolated LocalStorage flow.

## Last completed code change

Customer type values were aligned with the SQL constraint: `person | legal`. This prevents natural-person customer creation from being rejected by the real Supabase database.

Evidence: `62fe92eacbfd3a369432ece83e642fad46b62239`.

## Last completed project-control change

The repository now contains the mandatory bootstrap prompt, agent contract, roadmap integrity control, current status, append-oriented project and decision logs, acceptance policy, task template, pull-request checklist, and automated control tests.

Evidence: `c58c3356dbfe04d74589e897d7f90aaa21d8564e`.

## Verified behavior

- Customer and product save on the live demo.
- Quick customer/product creation inside invoice.
- Add invoice line and save draft to preview.
- Invoice unit tests: 4/4 passing.
- JavaScript syntax and UI contract checks passing.

## Unverified or incomplete

- Authenticated production UAT after the customer enum correction.
- Two-account RLS isolation test.
- Automated CI and browser regression.
- Final organization/tenant architecture.
- Remaining Version 1 domains from Chapter 251.
- Full 260-chapter implementation, which remains the permanent roadmap.

## Safety notes

- Do not request or expose passwords, OTPs, service-role keys, or secret keys.
- Do not treat the publishable Supabase key as an authorization boundary; RLS is the boundary.
- Do not call the product “invoice software.” Invoicing is only the current workstream.
- Do not claim roadmap completion from UI presence.

## Safest next action

Execute and record authenticated mobile UAT and a two-user isolation test for the invoice workstream before expanding scope.

## Review branch update — 2026-08-31

- Branch: `codex/invoice-tax-print-options`.
- Status: `IMPLEMENTED_UNVERIFIED`; not merged, deployed, or accepted.
- Added: formal/ordinary invoice type, VAT on/off, provisional versioned 1405 general rate (10%), stored tax context, PDF/printer output choice, additive migration, compliance register, and automated tests.
- Test evidence: `node --test tests/*.test.js` passed 13/13; JavaScript syntax and diff checks passed.
- Required before merge/deployment: review the PR, verify the enacted 1405 VAT source and applicability with a qualified accountant/legal reviewer, apply `202608310001_invoice_tax_context.sql`, then run authenticated and demo UAT on the Cloudflare deployment.
- This change does not submit invoices to the Taxpayer System and must not be represented as complete Iranian legal compliance.

## Invoice-number and settings continuation — 2026-08-31

- Same branch and PR: `codex/invoice-tax-print-options`, PR #2.
- Added an invoice number field governed by seller settings. `automatic locked` assigns the configured prefix plus a per-user counter and prevents later edits; `editable` permits a user-defined unique value and falls back to automatic numbering when empty.
- Enforcement exists in PostgreSQL through `assign_invoice_number` and `guard_invoice_number_update`, not only in the browser.
- Expanded settings include seller registration, website, province, city, postal code, invoice prefix, invoice/tax/payment/output defaults, and footer text.
- New required migration: `supabase/migrations/202608310002_invoice_settings_numbering.sql`, applied after `202608310001_invoice_tax_context.sql`.
- Local verification: 14/14 Node tests, all affected inline scripts parsed, JavaScript syntax passed, and `git diff --check` passed.
- Remote evidence: PR #2 is mergeable and Draft. GitHub Actions run `33402769849` succeeded on `2a3c9f3bd564ea7b525622210921bb1cd6a98a10`.
- Status remains `IMPLEMENTED_UNVERIFIED`: Cloudflare preview, migration application, and authenticated UAT are still required. Production was not changed.

## Cloudflare repair continuation — 2026-08-31

- Product-owner screenshots confirmed that `npx wrangler versions upload` failed because no assets directory or Wrangler configuration existed.
- Added `wrangler.jsonc` for an assets-only static Worker and expanded `.assetsignore` to keep non-runtime repository files private.
- GitHub CI run `33406241542` passed on `0064cdd4b032d7297aeb077ac70588038e1e4179` with 15/15 tests.
- Cloudflare has not yet reported a build for the repair commit; the last visible report remains the failed `2fcd34d` build. Do not claim a preview until a later Cloudflare report supplies a successful URL.
- Cloudflare subsequently reported a successful deployment for `0064cdd4`. Stable branch preview: `https://codex-invoice-tax-print-options-finora-invoice.davoodmehraban89.workers.dev`; commit preview: `https://64eed8bd-finora-invoice.davoodmehraban89.workers.dev`.
- GitHub CI run `33406506407` also passed after the evidence-lock update. Production remains unchanged; Supabase migrations and authenticated UAT are still required before merge.

## Invoice A4 template repair — 2026-08-31

- Product-owner PDF evidence showed a one-line invoice spanning two A4 pages because Safari print activated mobile single-column rules.
- Ordinary and official invoices now have different DOM/template structures; official uses legal identification panels and ordinary uses a compact commercial layout.
- Print CSS explicitly restores multi-column metadata, uses 6 mm A4 margins, compacts totals and signatures, and controls internal page breaks.
- GitHub Actions run `33409656301` succeeded on `0486750a20e6b7dfe80687c8c0727f866c502330`; deployed PDF visual verification remains the acceptance gate.
- Local PDF visual QA passed: one combined fixture rendered as two A4 pages total, with the complete ordinary template on page 1 and the complete official template on page 2; neither invoice overflowed, clipped, or overlapped.
- Latest GitHub CI run `33410529987` passed on evidence commit `775447d4a3ab198f9197b07665c94c65608a5a03` with 16/16 tests.
- Cloudflare's PR report still points to the older successful `47335538` deployment and has not rebuilt the newer A4-template commits. The branch preview must be rebuilt at `775447d` or later before product-owner browser acceptance.
