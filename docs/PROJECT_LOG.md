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

- Status: `IN_PROGRESS` until remote commit and deployment evidence are recorded
- Planned files: `AGENTS.md`, `PROJECT_STATUS.md`, bootstrap/recovery and handoff files, roadmap control, acceptance policy, decision log, project log, task template, and PR checklist.
- Purpose: make GitHub the durable project memory and prevent loss of the 260-chapter roadmap when chats disappear.
- Tests planned: file-link validation, required-section checks, roadmap integrity hash, `git diff --check`, and existing invoice tests.
- Rollback: documentation-only files can be reverted without changing runtime behavior; code baseline remains `62fe92e`.

