# FINORA AUTOMATED TEST RESULTS & VERIFICATION REPORT

## Execution Overview
- **Test Framework:** Native Node.js Test Runner (
> finora-invoice@1.0.0 test
> node --test tests/accounting-posting.test.js tests/contract-governance.test.js tests/contract-lifecycle.test.js tests/depreciation-engine.test.js tests/financial-analytics-engine.test.js tests/financial-invariants.test.js tests/frontend-integration.test.js tests/idp-ocr-pipeline.test.js tests/invoice-lifecycle.test.js tests/mrp-bom-engine.test.js tests/multi-tenant-rls.test.js tests/payroll-engine.test.js tests/procurement-engine.test.js tests/tax-engine-versioning.test.js tests/treasury-engine.test.js tests/warehouse-transfer-engine.test.js

TAP version 13
# Subtest: Accounting Posting & Ledger Architecture (Chapters 021, 045, 062, 241, 242)
    # Subtest: Rejects posting to unregistered account codes
    ok 1 - Rejects posting to unregistered account codes
      ---
      duration_ms: 3.543892
      ...
    # Subtest: Calculates net debit/credit balance correctly according to account nature
    ok 2 - Calculates net debit/credit balance correctly according to account nature
      ---
      duration_ms: 0.788736
      ...
    1..2
ok 1 - Accounting Posting & Ledger Architecture (Chapters 021, 045, 062, 241, 242)
  ---
  duration_ms: 8.430132
  type: 'suite'
  ...
# Subtest: Contracts, Inventory Valuation & Document Evidence (Chapters 012, 015, 020, 032, 238)
    # Subtest: DocumentStore enforces immutability, checksumming, and legal hold
    ok 1 - DocumentStore enforces immutability, checksumming, and legal hold
      ---
      duration_ms: 4.040306
      ...
    # Subtest: StockEngine enforces moving average cost and prevents stockouts
    ok 2 - StockEngine enforces moving average cost and prevents stockouts
      ---
      duration_ms: 1.991798
      ...
    # Subtest: CashFlowEngine calculates bank positions and records receipts
    ok 3 - CashFlowEngine calculates bank positions and records receipts
      ---
      duration_ms: 0.944943
      ...
    1..3
ok 2 - Contracts, Inventory Valuation & Document Evidence (Chapters 012, 015, 020, 032, 238)
  ---
  duration_ms: 12.420092
  type: 'suite'
  ...
# Subtest: Advanced Contract Lifecycle & Legal Risk Intelligence (Chapters 019, 034, 052, 072, 099, 116, 177)
    # Subtest: Creates draft contract, adds clauses, and evaluates risk score
    ok 1 - Creates draft contract, adds clauses, and evaluates risk score
      ---
      duration_ms: 4.220293
      ...
    # Subtest: Detects critical risk for unlimited liability and excessive penalties
    ok 2 - Detects critical risk for unlimited liability and excessive penalties
      ---
      duration_ms: 2.07694
      ...
    # Subtest: Manages lifecycle: Approve -> Sign -> Freeze -> Rejection of direct mutation
    ok 3 - Manages lifecycle: Approve -> Sign -> Freeze -> Rejection of direct mutation
      ---
      duration_ms: 2.733062
      ...
    # Subtest: Creates versioned amendment (الحاقیه) advancing version and adjusting financial terms
    ok 4 - Creates versioned amendment (الحاقیه) advancing version and adjusting financial terms
      ---
      duration_ms: 1.017329
      ...
    # Subtest: Manages contractual obligations, due date window filtering, and evidence completion
    ok 5 - Manages contractual obligations, due date window filtering, and evidence completion
      ---
      duration_ms: 2.046047
      ...
    1..5
ok 3 - Advanced Contract Lifecycle & Legal Risk Intelligence (Chapters 019, 034, 052, 072, 099, 116, 177)
  ---
  duration_ms: 17.607469
  type: 'suite'
  ...
# Subtest: Fixed Assets & Depreciation Engine (Chapters 048, 071, 097, 121, 147, 173 - Article 149 Tax Code)
    # Subtest: Calculates straight-line depreciation accurately per fiscal year
    ok 1 - Calculates straight-line depreciation accurately per fiscal year
      ---
      duration_ms: 3.1178
      ...
    # Subtest: Calculates declining balance depreciation per Article 149 Iranian Tax Law
    ok 2 - Calculates declining balance depreciation per Article 149 Iranian Tax Law
      ---
      duration_ms: 0.519253
      ...
    # Subtest: Executes annual depreciation run and posts balanced Double-Entry journal to General Ledger
    ok 3 - Executes annual depreciation run and posts balanced Double-Entry journal to General Ledger
      ---
      duration_ms: 7.461336
      ...
    # Subtest: Calculates net book value and handles capital asset disposal (Gain/Loss on sale)
    ok 4 - Calculates net book value and handles capital asset disposal (Gain/Loss on sale)
      ---
      duration_ms: 1.37509
      ...
    1..4
ok 4 - Fixed Assets & Depreciation Engine (Chapters 048, 071, 097, 121, 147, 173 - Article 149 Tax Code)
  ---
  duration_ms: 16.944989
  type: 'suite'
  ...
# Subtest: Executive Financial Intelligence & Analytics Engine (Chapters 026, 040, 056, 073, 100, 124, 150, 176)
    # Subtest: Calculates working capital, current ratio, and quick ratio
    ok 1 - Calculates working capital, current ratio, and quick ratio
      ---
      duration_ms: 2.378192
      ...
    # Subtest: Calculates Cash Conversion Cycle (CCC): DSO, DIO, DPO
    ok 2 - Calculates Cash Conversion Cycle (CCC): DSO, DIO, DPO
      ---
      duration_ms: 1.548644
      ...
    # Subtest: Calculates monthly cash burn and runway in months
    ok 3 - Calculates monthly cash burn and runway in months
      ---
      duration_ms: 0.538397
      ...
    # Subtest: Performs Accounts Receivable Aging Analysis across duration buckets
    ok 4 - Performs Accounts Receivable Aging Analysis across duration buckets
      ---
      duration_ms: 1.474937
      ...
    # Subtest: Calculates profitability margins: Gross, Operating and Net Margin
    ok 5 - Calculates profitability margins: Gross, Operating and Net Margin
      ---
      duration_ms: 0.707152
      ...
    1..5
ok 5 - Executive Financial Intelligence & Analytics Engine (Chapters 026, 040, 056, 073, 100, 124, 150, 176)
  ---
  duration_ms: 11.879613
  type: 'suite'
  ...
# Subtest: Financial Invariants & Double-Entry Integrity (Chapters 021, 045, 141, 242, 252)
    # Subtest: Invariant 1: Rejects unbalanced accounting events (sum(Debit) != sum(Credit))
    ok 1 - Invariant 1: Rejects unbalanced accounting events (sum(Debit) != sum(Credit))
      ---
      duration_ms: 4.098309
      ...
    # Subtest: Invariant 2: Successfully posts balanced events and updates accounts
    ok 2 - Invariant 2: Successfully posts balanced events and updates accounts
      ---
      duration_ms: 2.792809
      ...
    # Subtest: Invariant 3: Idempotency eliminates duplicate financial postings
    ok 3 - Invariant 3: Idempotency eliminates duplicate financial postings
      ---
      duration_ms: 2.620217
      ...
    # Subtest: Invariant 4: Period Lock forbids postings into closed or locked periods
    ok 4 - Invariant 4: Period Lock forbids postings into closed or locked periods
      ---
      duration_ms: 0.892876
      ...
    # Subtest: Invariant 5: Immutability and Traceable Reversal (No silent deletions)
    ok 5 - Invariant 5: Immutability and Traceable Reversal (No silent deletions)
      ---
      duration_ms: 3.066014
      ...
    1..5
ok 6 - Financial Invariants & Double-Entry Integrity (Chapters 021, 045, 141, 242, 252)
  ---
  duration_ms: 18.037624
  type: 'suite'
  ...
# Subtest: Frontend Client Bridge & Web Interface Integration (Chapters 006, 007, 013, 014, 021, 232)
    # Subtest: Initializes FinoraClient with seed data and verified General Ledger
    ok 1 - Initializes FinoraClient with seed data and verified General Ledger
      ---
      duration_ms: 11.748757
      ...
    # Subtest: Creates new customer and product via client bridge
    ok 2 - Creates new customer and product via client bridge
      ---
      duration_ms: 2.736572
      ...
    # Subtest: Simulates full new-invoice.html workflow and updates General Ledger & Moadian payload
    ok 3 - Simulates full new-invoice.html workflow and updates General Ledger & Moadian payload
      ---
      duration_ms: 6.242946
      ...
    1..3
ok 7 - Frontend Client Bridge & Web Interface Integration (Chapters 006, 007, 013, 014, 021, 232)
  ---
  duration_ms: 25.731549
  type: 'suite'
  ...
# Subtest: Intelligent Document Processing (IDP) & Persian OCR Pipeline (Chapters 047, 074, 101, 126, 151, 178)
    # Subtest: Normalizes Arabic/Persian characters and converts Persian numerals
    ok 1 - Normalizes Arabic/Persian characters and converts Persian numerals
      ---
      duration_ms: 4.744621
      ...
    # Subtest: Parses raw OCR invoice text into structured financial entities and passes validation
    ok 2 - Parses raw OCR invoice text into structured financial entities and passes validation
      ---
      duration_ms: 9.629577
      ...
    # Subtest: Detects mathematical discrepancy in OCR and routes to Human-in-the-Loop review
    ok 3 - Detects mathematical discrepancy in OCR and routes to Human-in-the-Loop review
      ---
      duration_ms: 4.314583
      ...
    # Subtest: Allows Human-in-the-Loop review and correction of flagged document
    ok 4 - Allows Human-in-the-Loop review and correction of flagged document
      ---
      duration_ms: 1.588294
      ...
    1..4
ok 8 - Intelligent Document Processing (IDP) & Persian OCR Pipeline (Chapters 047, 074, 101, 126, 151, 178)
  ---
  duration_ms: 25.606781
  type: 'suite'
  ...
# Subtest: Full Invoicing & Accounting Lifecycle (Chapters 013, 014, 016, 045, 242, 252)
    # Subtest: Executes Draft -> Line Calculation -> Approval -> Automatic Ledger Posting
    ok 1 - Executes Draft -> Line Calculation -> Approval -> Automatic Ledger Posting
      ---
      duration_ms: 6.019063
      ...
    1..1
ok 9 - Full Invoicing & Accounting Lifecycle (Chapters 013, 014, 016, 045, 242, 252)
  ---
  duration_ms: 10.957208
  type: 'suite'
  ...
# Subtest: Manufacturing, Bill of Materials (BOM), MRP & Standard Costing (Chapters 070, 103, 128, 153, 180)
    # Subtest: Registers BOM and calculates standard cost rollup (Materials + Labor + Overhead)
    ok 1 - Registers BOM and calculates standard cost rollup (Materials + Labor + Overhead)
      ---
      duration_ms: 3.665697
      ...
    # Subtest: Runs Material Requirements Planning (MRP) and detects raw material shortages
    ok 2 - Runs Material Requirements Planning (MRP) and detects raw material shortages
      ---
      duration_ms: 1.515332
      ...
    # Subtest: Executes full Work Order lifecycle: Release -> Issue Materials to WIP -> Complete Finished Goods
    ok 3 - Executes full Work Order lifecycle: Release -> Issue Materials to WIP -> Complete Finished Goods
      ---
      duration_ms: 3.538191
      ...
    1..3
ok 10 - Manufacturing, Bill of Materials (BOM), MRP & Standard Costing (Chapters 070, 103, 128, 153, 180)
  ---
  duration_ms: 12.924539
  type: 'suite'
  ...
# Subtest: Multi-Tenant Row Level Security & Data Isolation (Chapters 008, 009, 027, 057, 137, 234, 250)
    # Subtest: Blocks cross-tenant data access between distinct tenants
    ok 1 - Blocks cross-tenant data access between distinct tenants
      ---
      duration_ms: 2.482355
      ...
    # Subtest: RlsEnforcer filters mixed datasets down strictly to the active tenant
    ok 2 - RlsEnforcer filters mixed datasets down strictly to the active tenant
      ---
      duration_ms: 2.132914
      ...
    # Subtest: Superadmin bypasses tenant filtering when explicitly authorized
    ok 3 - Superadmin bypasses tenant filtering when explicitly authorized
      ---
      duration_ms: 0.304131
      ...
    1..3
ok 11 - Multi-Tenant Row Level Security & Data Isolation (Chapters 008, 009, 027, 057, 137, 234, 250)
  ---
  duration_ms: 9.704878
  type: 'suite'
  ...
# Subtest: Enterprise Payroll, Social Security & Salary Tax Engine (Chapters 035, 049, 066, 125, 143, 239)
    # Subtest: Calculates statutory Social Security (SSO) contributions: 7% employee and 23% employer
    ok 1 - Calculates statutory Social Security (SSO) contributions: 7% employee and 23% employer
      ---
      duration_ms: 2.25492
      ...
    # Subtest: Applies progressive salary tax brackets per Article 84 and 85 Tax Code
    ok 2 - Applies progressive salary tax brackets per Article 84 and 85 Tax Code
      ---
      duration_ms: 1.575412
      ...
    # Subtest: Calculates employee salary with statutory overtime (1.4x factor) and allowances
    ok 3 - Calculates employee salary with statutory overtime (1.4x factor) and allowances
      ---
      duration_ms: 1.383081
      ...
    # Subtest: Executes monthly payroll run and automatically posts balanced Double-Entry journal to General Ledger
    ok 4 - Executes monthly payroll run and automatically posts balanced Double-Entry journal to General Ledger
      ---
      duration_ms: 5.546562
      ...
    1..4
ok 12 - Enterprise Payroll, Social Security & Salary Tax Engine (Chapters 035, 049, 066, 125, 143, 239)
  ---
  duration_ms: 15.247035
  type: 'suite'
  ...
# Subtest: Enterprise Procurement, Purchase Orders & Three-Way Matching (Chapters 023, 037, 051, 068, 094, 117, 144, 170)
    # Subtest: Manages Purchase Request lifecycle from draft to approval
    ok 1 - Manages Purchase Request lifecycle from draft to approval
      ---
      duration_ms: 2.861957
      ...
    # Subtest: Issues RFQ and captures multi-supplier quotations
    ok 2 - Issues RFQ and captures multi-supplier quotations
      ---
      duration_ms: 1.917433
      ...
    # Subtest: Executes Three-Way Match: Succeeds on exact quantity and price alignment
    ok 3 - Executes Three-Way Match: Succeeds on exact quantity and price alignment
      ---
      duration_ms: 5.941669
      ...
    # Subtest: Three-Way Match rejects invoice when billed price exceeds agreed PO price (PRICE_MISMATCH)
    ok 4 - Three-Way Match rejects invoice when billed price exceeds agreed PO price (PRICE_MISMATCH)
      ---
      duration_ms: 2.574178
      ...
    # Subtest: Three-Way Match rejects invoice when billed quantity exceeds received quantity (QUANTITY_MISMATCH)
    ok 5 - Three-Way Match rejects invoice when billed quantity exceeds received quantity (QUANTITY_MISMATCH)
      ---
      duration_ms: 1.812852
      ...
    # Subtest: Three-Way Match rejects invoice when goods have not yet arrived in warehouse (UNRECEIVED_GOODS)
    ok 6 - Three-Way Match rejects invoice when goods have not yet arrived in warehouse (UNRECEIVED_GOODS)
      ---
      duration_ms: 1.060931
      ...
    1..6
ok 13 - Enterprise Procurement, Purchase Orders & Three-Way Matching (Chapters 023, 037, 051, 068, 094, 117, 144, 170)
  ---
  duration_ms: 21.262404
  type: 'suite'
  ...
# Subtest: Versioned Tax Engine & Iranian Moadian Compliance (Chapters 016, 017, 031, 046, 232, 233)
    # Subtest: Resolves 9% VAT for transactions prior to 1403/01/01
    ok 1 - Resolves 9% VAT for transactions prior to 1403/01/01
      ---
      duration_ms: 1.165344
      ...
    # Subtest: Resolves 10% VAT for transactions on or after 1403/01/01
    ok 2 - Resolves 10% VAT for transactions on or after 1403/01/01
      ---
      duration_ms: 0.309009
      ...
    # Subtest: Enforces tax exemptions dynamically per statutory category
    ok 3 - Enforces tax exemptions dynamically per statutory category
      ---
      duration_ms: 0.971658
      ...
    # Subtest: Moadian Adapter generates compliant signed payload and validates identifiers
    ok 4 - Moadian Adapter generates compliant signed payload and validates identifiers
      ---
      duration_ms: 4.048211
      ...
    # Subtest: Moadian Adapter rejects invalid invoices lacking commodity identifier
    ok 5 - Moadian Adapter rejects invalid invoices lacking commodity identifier
      ---
      duration_ms: 0.929448
      ...
    1..5
ok 14 - Versioned Tax Engine & Iranian Moadian Compliance (Chapters 016, 017, 031, 046, 232, 233)
  ---
  duration_ms: 12.449878
  type: 'suite'
  ...
# Subtest: Treasury, Sayad Cheques & Bank Reconciliation (Chapters 020, 033, 243)
    # Subtest: Validates 16-digit Sayad IDs and rejects malformed formats
    ok 1 - Validates 16-digit Sayad IDs and rejects malformed formats
      ---
      duration_ms: 3.078582
      ...
    # Subtest: Manages Received Cheque lifecycle: Register -> Deposit to Bank -> Clear and verifies GL balance
    ok 2 - Manages Received Cheque lifecycle: Register -> Deposit to Bank -> Clear and verifies GL balance
      ---
      duration_ms: 26.142614
      ...
    # Subtest: Handles Dishonored/Bounced Received Cheque and reinstates Customer Accounts Receivable
    ok 3 - Handles Dishonored/Bounced Received Cheque and reinstates Customer Accounts Receivable
      ---
      duration_ms: 3.018621
      ...
    # Subtest: Endorses received cheque to a supplier and settles Accounts Payable
    ok 4 - Endorses received cheque to a supplier and settles Accounts Payable
      ---
      duration_ms: 2.693443
      ...
    # Subtest: Manages Issued Cheque lifecycle: Chequebook -> Issuance to Supplier -> Bank Clearance
    ok 5 - Manages Issued Cheque lifecycle: Chequebook -> Issuance to Supplier -> Bank Clearance
      ---
      duration_ms: 2.742243
      ...
    # Subtest: Executes Bank Reconciliation and enforces invariant: Adjusted Bank === Adjusted Book Balance
    ok 6 - Executes Bank Reconciliation and enforces invariant: Adjusted Bank === Adjusted Book Balance
      ---
      duration_ms: 3.171388
      ...
    1..6
ok 15 - Treasury, Sayad Cheques & Bank Reconciliation (Chapters 020, 033, 243)
  ---
  duration_ms: 46.128713
  type: 'suite'
  ...
# Subtest: Multi-Warehouse, Stock Transfers & Batch/Serial Tracking (Chapters 012, 038, 055, 069, 095, 118, 145, 171)
    # Subtest: Registers unique serial numbers and prevents duplicate registration
    ok 1 - Registers unique serial numbers and prevents duplicate registration
      ---
      duration_ms: 3.070508
      ...
    # Subtest: Registers batch/lot numbers with manufacturing and expiration dates
    ok 2 - Registers batch/lot numbers with manufacturing and expiration dates
      ---
      duration_ms: 1.552028
      ...
    # Subtest: Prevents inter-warehouse transfer when source warehouse stock is insufficient
    ok 3 - Prevents inter-warehouse transfer when source warehouse stock is insufficient
      ---
      duration_ms: 1.231466
      ...
    # Subtest: Executes full 3-step transfer lifecycle: Request -> Dispatch (In-Transit) -> Receive (Destination)
    ok 4 - Executes full 3-step transfer lifecycle: Request -> Dispatch (In-Transit) -> Receive (Destination)
      ---
      duration_ms: 3.08065
      ...
    # Subtest: Calculates Reorder Point and triggers restocking alerts when inventory is low
    ok 5 - Calculates Reorder Point and triggers restocking alerts when inventory is low
      ---
      duration_ms: 1.575079
      ...
    1..5
ok 16 - Multi-Warehouse, Stock Transfers & Batch/Serial Tracking (Chapters 012, 038, 055, 069, 095, 118, 145, 171)
  ---
  duration_ms: 15.044237
  type: 'suite'
  ...
1..16
# tests 64
# suites 16
# pass 64
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 11188.410526)
- **Execution Date:** 2026-09-26T01:45:03-07:00
- **Total Test Suites:** 16
- **Total Unit/Integration Tests:** 64
- **Passed:** 64
- **Failed:** 0
- **Skipped:** 0
- **Overall Status:** PASS (100% Verifiable Assertion Success)

## Detailed Test Suite Results
1. Financial Invariants & Double-Entry Integrity () — 5/5 PASS
2. Accounting Posting & Ledger Architecture () — 2/2 PASS
3. Versioned Tax Engine & Iranian Moadian Compliance () — 5/5 PASS
4. Multi-Tenant Row Level Security & Data Isolation () — 3/3 PASS
5. Full Invoicing & Accounting Lifecycle () — 1/1 PASS
6. Contracts, Inventory Valuation & Document Evidence () — 3/3 PASS
7. Frontend Client Bridge & Web Interface Integration () — 3/3 PASS
8. Advanced Contract Lifecycle & Legal Risk Intelligence () — 5/5 PASS
9. Enterprise Payroll, Social Security & Salary Tax Engine () — 4/4 PASS
10. Enterprise Procurement, Purchase Orders & Three-Way Matching () — 6/6 PASS
11. Treasury, Sayad Cheques & Bank Reconciliation () — 6/6 PASS
12. Multi-Warehouse, Stock Transfers & Batch/Serial Tracking () — 5/5 PASS
13. Fixed Assets & Depreciation Engine () — 4/4 PASS
14. Executive Financial Intelligence & Analytics () — 5/5 PASS
15. Intelligent Document Processing & Persian OCR () — 4/4 PASS
16. Manufacturing, BOM, MRP & Standard Costing () — 3/3 PASS
