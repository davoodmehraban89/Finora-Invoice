# ADR-004: Immutable General Ledger and Double-Entry Invariants

## Status
Accepted (Normative Financial Architecture Decision)

## Context
Financial systems require absolute auditability and non-repudiation. Modifying or deleting posted financial entries violates international accounting standards (IFRS, US GAAP), tax regulations, and internal controls (COSO, SOX).

## Decision
1. Every posted journal entry must satisfy the fundamental double-entry invariant:
   6037\sum 	ext{Debits} == \sum 	ext{Credits}6037
   where both sums are evaluated in the tenant's base functional currency.
2. Posted journal entries and ledger transaction lines are **immutable**.  and  operations are strictly forbidden on posted financial rows.
3. Corrections of posted transactions must be executed via explicit, traceable **Reversal Entries** () or **Correction Entries** linked directly to the original entry ID.
4. Once an accounting period is marked  or , no new journal entries may be posted with effective dates falling within that period.

## Consequences
- Total auditability and forensic traceability for regulatory and external auditor review.
- High data integrity with mathematical guarantees against arbitrary manual balance overrides.
