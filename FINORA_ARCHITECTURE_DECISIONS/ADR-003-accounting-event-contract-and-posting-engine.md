# ADR-003: Accounting Event Contract and Dedicated Posting Engine

## Status
Accepted (Normative Financial Architecture Decision)

## Context
Chapters 21, 45, 62, 141, 242, and 252 mandate strict financial correctness. In legacy systems, disparate business modules (Sales, Purchasing, Warehouse, Payroll) directly insert or update rows in accounting ledger tables. This creates unbalanced journals, missing financial dimensions, and broken audit trails.

## Decision
1. No business domain service is permitted to write directly to General Ledger tables.
2. All business transactions that produce a financial impact must emit an immutable **Accounting Event** conforming to the canonical .
3. An authorized, centralized **Posting Engine** is the sole subsystem with write access to the General Ledger.
4. The Posting Engine validates the event, executes versioned accounting mapping rules, enforces double-entry invariants, generates balanced journal entries, and immutably posts them to the ledger.

## Consequences
- Guaranteed ledger integrity and universal enforcement of financial invariants across all business operations.
- Operational source records (invoices, receipts, payments) are decoupled from the chart of accounts structure.
