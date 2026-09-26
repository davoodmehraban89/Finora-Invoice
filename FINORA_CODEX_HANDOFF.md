# FINORA INDEPENDENT CODEX AUDIT HANDOFF

## 1. Repository & Baseline Information
- **Authoritative Repository:** [https://github.com/davoodmehraban89/Finora-Invoice](https://github.com/davoodmehraban89/Finora-Invoice)
- **Authoritative Specification:** `Finora_Master_Specification_Final_Chapters_001_260.txt` (Revision 2.0)
- **Governing Architecture Chapters:** Chapters 231 through 260.

## 2. Implemented Architecture & Technology Stack
- **Architecture:** Modular Monolith with Event-Ready Contract Boundaries (Platform Core + Country Packs + Industry Extension Hooks).
- **Backend & Business Logic:** Node.js ES6+ / TypeScript-ready domain architecture.
- **Database & Security:** PostgreSQL with Row Level Security (RLS) via Supabase migrations.
- **Invoicing & Compliance:** Iran Moadian E-Invoicing PKCS#8 signing, dynamic VAT rule engine.
- **Testing:** Native Node.js Test Runner (`node --test tests/*.test.js`).

## 3. Key Documentation Index
- `FINORA_AGENT_STATE.md` — Execution state & recovery log
- `FINORA_IMPLEMENTATION_MATRIX.md` & `.json` — 260-chapter master registry
- `FINORA_ARCHITECTURE_DECISIONS/` — ADRs 001 through 010
- `FINORA_FINANCIAL_INVARIANTS.md` — Invariant definition & mathematical proof rules
- `FINORA_SECURITY_REVIEW.md` — Threat model & RLS verification
- `FINORA_TEST_RESULTS.md` & `FINORA_TEST_EVIDENCE.md` — Test outputs
- `FINORA_KNOWN_LIMITATIONS.md` — Explicit scope boundaries & mitigations
- `FINORA_CODEX_REVIEW_PROMPT.md` — Adversarial audit instructions for OpenAI Codex
