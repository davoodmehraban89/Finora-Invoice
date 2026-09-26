# FINORA FINANCIAL & LEDGER INVARIANTS MANUAL

## 1. The 15 Non-Negotiable Financial Invariants
Governed strictly by Chapters 021, 045, 062, 141, 241, 242, and 252.

1. **Strict Double-Entry Balance:** Every posted journal entry must satisfy:
   $$\sum \text{Debits} == \sum \text{Credits}$$
   Any deviation greater than zero ($> 0.0001$) triggers an unconditional rejection exception.

2. **Decoupled Ledger Write Authority:** Domain services (Sales, Inventory, HR, Treasury) are strictly forbidden from writing directly to General Ledger tables. All entries must pass through the `AccountingEventContract` and `PostingEngine`.

3. **Immutability of Posted Records:** Posted journal entries, ledger lines, and financial snapshots cannot be physically updated (`UPDATE`) or deleted (`DELETE`).

4. **Traceable Reversals:** Corrections of posted records must use explicit compensating `ReversalEntry` objects referencing the original `journal_id`.

5. **Period Lock Integrity:** Once an accounting fiscal period is marked `CLOSED` or `LOCKED`, no transaction with an effective date in that period can be posted.

6. **Idempotency Guarantee:** Financial postings require an `idempotency_key`. Duplicate requests return the original posted journal entry and do not create duplicate ledger rows.

7. **Historical Effective Dating:** Tax and legal rules must be evaluated against the versioned rule package active on the transaction's effective date, not the server clock.

8. **Zero Hardcoded Legal Rates:** Tax rates, thresholds, and penalty rates reside exclusively in versioned rule engines with explicit jurisdiction and statutory references.

9. **Deterministic Rounding:** Currency amounts are rounded to the tenant's base currency decimal specification before double-entry balance evaluation.

10. **Positive Amounts Only:** Ledger rows must have non-negative debit and credit amounts ($>= 0$). Dual debit/credit on the same row is forbidden.

11. **Account Existence:** All account codes in an event must be registered in the Chart of Accounts prior to posting.

12. **Lineage Preservation:** Every journal entry retains its `source_module`, `source_entity_id`, and `payload_hash`.

13. **Tenant & Organization Boundary:** Financial postings are partitioned by `tenant_id` and `organization_id`.

14. **Audit Immutability:** Audit events accompany all state transitions.

15. **Human Authority Guardrail:** High-risk financial, legal, credit, and employment commitments require authenticated human approval.

## 2. Test Verification Evidence
Automated verification is codified in `tests/financial-invariants.test.js` and `tests/accounting-posting.test.js`, passing with zero defects.
