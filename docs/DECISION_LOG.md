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
