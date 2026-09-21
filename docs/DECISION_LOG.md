# Finora Decision Log

## ADR-001 — Product identity is enterprise ERP

- Date: 2026-08-28
- Status: Accepted
- Decision: The permanent name and scope is **Finora — Comprehensive Enterprise ERP Software / فینورا — نرم‌افزار جامع ERP سازمانی**. “صدور فاکتور” is only the current implementation workstream.
- Reason: The 260-chapter master specification covers the whole organization, including finance, CRM, HR/payroll, personnel, management, supply chain, operations, analytics, security, AI, compliance, and industry solutions.
- Consequence: No document or UI-level slice may redefine Finora as invoice-only software.

## ADR-002 — The 260-chapter Word document is the roadmap authority

- Date: 2026-08-28
- Status: Accepted
- Decision: `Finora_Master_Specification_Final_Chapters_001_260.docx` is the canonical roadmap. Chapters 251, 259, and 260 govern release scope, acceptance, and constitution.
- Consequence: Any change requires a recorded hash change and chapter-level impact review.

## ADR-003 — Repository evidence replaces chat memory

- Date: 2026-08-28
- Status: Accepted
- Decision: GitHub files, commits, diffs, checks, and deployment evidence are the durable project memory. Chat summaries are non-authoritative.
- Consequence: Every agent must execute the pre-work and post-work protocol in `AGENTS.md`.

## ADR-004 — Supabase is the current operational data platform

- Date: 2026-08-28
- Status: Accepted for the invoice workstream
- Decision: Use Supabase Auth and PostgreSQL with mandatory RLS; deploy the static frontend through Cloudflare Workers Builds.
- Consequence: Publishable keys may exist in browser configuration; service-role keys and secrets must never be committed. Every new table requires RLS and a versioned migration.

## ADR-005 — Current isolation is per authenticated user

- Date: 2026-08-28
- Status: Transitional
- Decision: The invoice slice currently owns rows through `user_id = auth.uid()`.
- Consequence: This is not the final enterprise organization/tenant model. Migration to organization membership must be designed before multi-user enterprise rollout.

## ADR-006 — Customer type contract uses `person | legal`

- Date: 2026-08-28
- Status: Accepted
- Decision: UI and database share the exact values `person` and `legal`.
- Evidence: code baseline `62fe92eacbfd3a369432ece83e642fad46b62239`.
- Consequence: Display labels may be Persian, but persisted enum values must follow the database contract.

## ADR-007 — Iranian legal rules use versioned compliance profiles

- Date: 2026-08-31
- Status: Accepted for architecture; legal verification remains open
- Decision: Invoice classification, VAT mode, applied rate, tax year, and rule version are persisted with the invoice. Annual rates and other legal rules are maintained outside the calculation engine as effective-dated compliance profiles.
- Reason: Chapters 16, 31, 46, 63, 231, 251, 259, and 260 prohibit silent hardcoding and require source/version/evidence traceability.
- Consequence: `IR-VAT-1405.1` is a provisional 10% general-rate profile requested by the product owner. Exemptions, special rates, Taxpayer System submission, and complete Iranian legal compliance remain unverified until official-source and specialist acceptance evidence is recorded in `docs/IRAN_COMPLIANCE_REGISTER.md`.

## ADR-008 — Invoice-number policy is enforced in PostgreSQL

- Date: 2026-08-31
- Status: Accepted for architecture; deployment verification remains open
- Decision: Each seller chooses either automatic locked numbering or user-editable numbering. The UI reflects the policy, while PostgreSQL assigns locked numbers and rejects later edits when the policy is locked.
- Reason: A UI-only lock can be bypassed and cannot protect accounting document identity across clients or integrations.
- Consequence: Invoice numbers remain unique per user. Manual mode permits any non-empty value up to 80 characters, but does not itself certify statutory sequence compliance. Policy changes and manual renumbering require audit logging in a later accounting-control workstream.

## ADR-009 — Trigger-only privileged functions are outside exposed schemas

- Date: 2026-09-13
- Status: Accepted for architecture; production application pending
- Decision: Invoice trigger functions live in the unexposed `private` schema and have no direct `EXECUTE` grant for `PUBLIC`, `anon`, or `authenticated`. Snapshot capture and invoice-number guarding use caller privileges. Only atomic counter assignment retains definer privileges because the counter table intentionally has no client access.
- Reason: A definer function in `public` can bypass RLS and may be exposed as an RPC surface through default function privileges. Trigger attachment does not require a client-callable function.
- Consequence: The browser API shape is unchanged. Existing table triggers remain attached by object identity when their functions move schemas. Any future privileged function requires an explicit threat model, unexposed schema, minimal grants, fixed search path, migration, rollback notes, and advisor evidence.


## 2026-09-20 — Ten-row landscape print delivery

Owner decision: official A4 landscape and ordinary A5 landscape, both 10 rows with 5 mm margins. This supersedes the earlier portrait/12-row proposal. Short invoices receive blank rows; legacy over-budget invoices retain every row and disable output. Finora remains the ERP product; this delivery is limited to invoice printing (Chapters 251, 259 and 260).

Status: IMPLEMENTED_UNVERIFIED overall; print tests passed, not yet accepted on main. GitHub Actions run 35557493375 passed on a4ccab64406eafce0d25e38284da92284486e5e0: 23 Node tests, four one-page PDFs (official/ordinary, ten populated rows/one populated plus nine blank rows), exact landscape paper-size checks, preservation of historical 11/15-row records, long-note output rejection without storage mutation, and both entry-form ten-row boundaries. PDF artifacts were downloaded for visual review. Earlier failing runs correctly exposed two-page output; explicit print line height and a compact A5 layout fixed that defect.

Scope: invoice-preview.html, new-invoice.html, assets/css/mobile.css, assets/js/print-layout.js, tests/browser-uat.js, tests/project-control.test.js, .github/workflows/ci.yml and these control documents. The print preflight measures active print CSS and rejects overflow instead of clipping or rewriting invoice data. No database, credentials or calculation changes. Rollback: revert PR 62 as a unit.

Live demo verification on 2026-09-21: the deployed entry form rejects item 11 and preserves all ten items; an ordinary invoice was issued and previewed through the public UI using disposable browser-local demo data. Cloudflare's PR bot reported deployment of a4ccab64 even before merge: deployment and main-branch acceptance must not be conflated.

Known limits: browser/printer overrides and physical Safari printing are not certified; existing Supabase/RLS and autonomous-model-runtime gates are outside this print delivery. Native browser print shortcuts can bypass the application's preflight, but no rows are hidden or truncated. Long descriptions may require manual correction to fit the fixed page budget. Next gate: complete final CI/visual review, merge PR 62 through the normal workflow, and verify the deployed print UI.


## 2026-09-21 — Merged print milestone

Status: VERIFIED for this print workstream only. PR #62 merged as `237e9782beeeb7a9bbaa4f08dfacab7d9587f57f`. Main-branch CI run `35557880383` succeeded; the `Workers Builds: finora-invoice` check also succeeded for that exact commit (build `a65ef742-dbd4-4cc6-b2ee-42d6563152e5`). The prior unmerged status above is historical and superseded by this entry.

Evidence: PR https://github.com/davoodmehraban89/Finora-Invoice/pull/62 ; CI https://github.com/davoodmehraban89/Finora-Invoice/actions/runs/35557880383 . Four final PDF renders were visually reviewed with all rows, totals, signatures and footers visible. Deployed demo entry, ten-row limit, issue, preview and A5 output selection were checked using browser-local synthetic data. No customer production records were created.

Boundary: this is not acceptance of the full ERP, authenticated two-user security, physical Safari/printer output or autonomous model execution. The native print shortcut remains outside application preflight. No data is clipped or discarded.

Safest continuation: integrate this evidenced pilot outcome with Davood-AI-OS's task acceptance flow; do not describe the agent as autonomous until its model-authentication and worker execution gates have real evidence. Keep the existing unrelated security acceptance backlog intact.
