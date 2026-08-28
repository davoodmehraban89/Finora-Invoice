# Finora Agent Operating Contract

This repository is the durable source of project context. Chat history is never authoritative.

## Mandatory start-of-work protocol

Before planning, editing, reviewing, or deploying:

1. Connect to GitHub through the official connector and resolve the current `main` HEAD SHA.
2. Read, in this order:
   - `docs/handoff/MASTER_RECOVERY_PROMPT.md`
   - `docs/handoff/LATEST_HANDOFF.md`
   - `PROJECT_STATUS.md`
   - `docs/ROADMAP_260_CONTROL.md`
   - `docs/DECISION_LOG.md`
   - `docs/PROJECT_LOG.md`
   - `docs/ACCEPTANCE_POLICY.md`
3. Treat `Finora_Master_Specification_Final_Chapters_001_260.docx` as the complete product roadmap and product constitution. Read the chapters relevant to the task and always read Chapters 251, 259, and 260 for scope and acceptance.
4. Verify every material handoff claim against GitHub files, commits, diffs, checks, and deployment evidence.
5. Add a `PLANNED` entry to `docs/PROJECT_LOG.md` describing scope, intended files, tests, risks, and rollback before implementation begins.

## Mandatory end-of-work protocol

Before declaring work complete:

1. Run relevant automated tests and record exact commands and results.
2. Verify the changed user flow on the deployed product when a deployment is involved.
3. Update `PROJECT_STATUS.md`, `docs/PROJECT_LOG.md`, and `docs/handoff/LATEST_HANDOFF.md` in the same delivery batch.
4. Record architecture or scope decisions in `docs/DECISION_LOG.md`.
5. Record exact file paths, commit/PR/deployment evidence, known limitations, and the single safest next action.
6. Never describe unmerged or unverified work as accepted.

## Product identity and scope

- Product: **Finora — Comprehensive Enterprise ERP Software**
- Persian name: **فینورا — نرم‌افزار جامع ERP سازمانی**
- Current execution workstream: **صدور فاکتور**
- The current workstream is only one vertical slice of the 260-chapter roadmap. Do not rename the whole product to “invoice software” and do not discard the remaining ERP scope.
- The roadmap includes finance, accounting, CRM, sales, procurement, inventory, production, projects, contracts, HR, payroll, personnel, management reporting, BI, security, workflow, documents, AI, localization, compliance, industry clouds, and enterprise operations.

## Non-negotiable engineering rules

- GitHub remote evidence is the source of truth; agent summaries are not evidence.
- No secret, password, service-role key, token, OTP, or recovery code may be committed or requested in chat.
- Browser code may use only the Supabase publishable key. Service-role credentials are backend-only and must never be exposed.
- RLS and tenant/user isolation are mandatory for every operational table.
- Posted financial history is corrected by reversal/correction, never destructive rewrite.
- Every database change must be a versioned migration with rollback and compatibility notes.
- Legal rates and jurisdiction rules must not be hardcoded; they belong in versioned country/compliance packs.
- AI is advisory for high-risk financial, legal, employment, medical, credit, or governance decisions; final human authority is required.
- Prefer pull requests and independent review for material changes. Direct changes to `main` require explicit user authorization or a documented emergency reason.

