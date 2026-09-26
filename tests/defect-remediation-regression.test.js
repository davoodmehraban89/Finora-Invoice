/**
 * Finora Defect Remediation & Quality Gate Regression Test Suite
 * Validates root-cause fixes for DEFECT 01 through DEFECT 11:
 * - DEFECT 01: Stored XSS Prevention & HTML Sanitization
 * - DEFECT 02: Official 22-Character Moadian Tax ID & Verhoeff Checksum
 * - DEFECT 03: Anti-Duplicate Billing Guard in Three-Way Matching
 * - DEFECT 04: Sales Invoice, Stock Movement & COGS Ledger Integration
 * - DEFECT 05: Floating-Point Elimination & Exact Precision Financial Arithmetic
 * - DEFECT 06: Durable Concurrency Controls & Over-Allocation Prevention
 * - DEFECT 07: Financial-Year Closing Workflow & Nominal Account Zeroing
 * - DEFECT 08: Dishonored Endorsed Cheque Lifecycle & Liability Restoration
 * - DEFECT 09: Controlled Weighbridge Quantity Tolerance Management
 * - DEFECT 10: Strict Multi-Organization Data Isolation & Mutation Protection
 * - DEFECT 11: Article 141 & Article 5 Statutory Minimum Capital Compliance
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { escapeHtml } = require('../assets/js/finora-core-client');
const { IranMoadianAdapter } = require('../src/tax/iran-moadian-adapter');
const { ProcurementEngine } = require('../src/procurement/procurement-engine');
const { InvoiceEngine } = require('../src/invoicing/invoice-engine');
const { StockEngine } = require('../src/inventory/stock-engine');
const { MoneyPrecision } = require('../src/common/money-precision');
const { AccountingEventContract } = require('../src/accounting/accounting-event-contract');
const { MultiCurrencyEngine } = require('../src/currency/multi-currency-engine');
const { Customer360Engine } = require('../src/crm/customer-360-engine');
const { GeneralLedger } = require('../src/ledger/general-ledger');
const { PostingEngine } = require('../src/ledger/posting-engine');
const { SayadChequeEngine } = require('../src/treasury/sayad-cheque-engine');
const { RlsEnforcer } = require('../src/security/rls-enforcer');
const { Article141ComplianceEngine } = require('../src/governance/article-141-compliance-engine');
const { TenantContext } = require('../src/security/tenant-context');

describe('Master Autonomous Remediation: Defect Backlog Regression Verification', () => {

  // DEFECT 01
  it('DEFECT 01 — Stored XSS: Sanitizes malicious input while preserving Persian and English text', () => {
    const maliciousScript = '<script>alert("XSS")</script>';
    const maliciousImg = '<img src=x onerror=alert(1)>';
    const legitimatePersian = 'شرکت مهندسی آوا & بتن پیش‌ساخته (سهامی خاص)';
    const legitimateEnglish = 'Finora Cloud Platform <v1.0>';

    assert.strictEqual(escapeHtml(maliciousScript), '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    assert.strictEqual(escapeHtml(maliciousImg), '&lt;img src=x onerror=alert(1)&gt;');
    assert.strictEqual(escapeHtml(legitimatePersian), 'شرکت مهندسی آوا &amp; بتن پیش‌ساخته (سهامی خاص)');
    assert.strictEqual(escapeHtml(legitimateEnglish), 'Finora Cloud Platform &lt;v1.0&gt;');
  });

  // DEFECT 02
  it('DEFECT 02 — Moadian Tax ID: Generates valid 22-char ID with Verhoeff checksum and validates vectors', () => {
    const adapter = new IranMoadianAdapter({ fiscalMemoryId: 'A12BC3' });
    const taxId = adapter.generateTaxUniqueId({ invoice_number: 'INV-1405-9988', date: '2026-09-26' });

    assert.strictEqual(taxId.length, 22, 'Tax ID must be exactly 22 characters');
    const valResult = IranMoadianAdapter.validateTaxUniqueId(taxId);
    assert.strictEqual(valResult.isValid, true, 'Generated Tax ID must pass Verhoeff validation');
    assert.strictEqual(valResult.fiscalMemoryId, 'A12BC3');

    // Test Invalid Vector 1: Tampered check digit
    const tamperedCheckDigit = taxId.slice(0, 21) + (taxId[21] === '9' ? '0' : '9');
    const invalidVal1 = IranMoadianAdapter.validateTaxUniqueId(tamperedCheckDigit);
    assert.strictEqual(invalidVal1.isValid, false);
    assert.ok(invalidVal1.error.includes('Verhoeff checksum failure'));

    // Test Invalid Vector 2: Invalid length
    assert.strictEqual(IranMoadianAdapter.validateTaxUniqueId('TAX-12345').isValid, false);

    // Test Invalid Vector 3: Invalid characters in body
    assert.strictEqual(IranMoadianAdapter.validateTaxUniqueId('A12BC3207220000000101-').isValid, false);
  });

  // DEFECT 03
  it('DEFECT 03 — Duplicate Billing: Rejects multiple invoices billing the same received PO quantity', () => {
    const gl = new GeneralLedger();
    gl.registerAccount({ code: '1105', name: 'Inventory', category: 'asset', nature: 'debit' });
    gl.registerAccount({ code: '2101', name: 'AP', category: 'liability', nature: 'credit' });
    gl.registerAccount({ code: '1101', name: 'VAT', category: 'asset', nature: 'debit' });
    const pe = new PostingEngine(gl);
    const proc = new ProcurementEngine({ postingEngine: pe });

    const po = proc.createPurchaseOrder({
      id: 'po_dup_01',
      tenant_id: 'ten_01',
      organization_id: 'org_01',
      po_number: 'PO-DUP-01',
      supplier: { id: 'supp_01', name: 'تأمین‌کننده آلفا' },
      items: [{ itemId: 'item_raw_01', name: 'ورق فولادی', quantity: 100, unitPrice: 50000 }]
    });

    // Goods Receipt: 100 units received
    proc.recordGoodsReceipt({
      id: 'gr_dup_01',
      tenant_id: 'ten_01',
      organization_id: 'org_01',
      po_id: po.id,
      items: [{ itemId: 'item_raw_01', receivedQuantity: 100 }]
    });

    // Invoice 1: Billed 100 units -> Matches and Approves
    const pi1 = proc.submitSupplierInvoice({
      id: 'pi_dup_01',
      tenant_id: 'ten_01',
      organization_id: 'org_01',
      invoice_number: 'PINV-001',
      po_id: po.id,
      items: [{ itemId: 'item_raw_01', billedQuantity: 100, billedUnitPrice: 50000 }]
    });

    const match1 = proc.executeThreeWayMatch(pi1.id);
    assert.strictEqual(match1.is_matched, true);
    proc.approveMatchedInvoice(pi1.id);

    // Invoice 2: Billed 100 units again on the same PO -> DUPLICATE BILLING REJECTED!
    const pi2 = proc.submitSupplierInvoice({
      id: 'pi_dup_02',
      tenant_id: 'ten_01',
      organization_id: 'org_01',
      invoice_number: 'PINV-002-DUPLICATE',
      po_id: po.id,
      items: [{ itemId: 'item_raw_01', billedQuantity: 100, billedUnitPrice: 50000 }]
    });

    const match2 = proc.executeThreeWayMatch(pi2.id);
    assert.strictEqual(match2.is_matched, false);
    assert.strictEqual(match2.discrepancies[0].type, 'DUPLICATE_BILLING');
    assert.throws(() => proc.approveMatchedInvoice(pi2.id), /Three-Way Match failed/);
  });

  // DEFECT 04
  it('DEFECT 04 — Invoicing & COGS: Issues inventory and posts balanced Double-Entry COGS journal', () => {
    const gl = new GeneralLedger();
    gl.registerAccount({ code: '1101', name: 'Cash', category: 'asset', nature: 'debit' });
    gl.registerAccount({ code: '1103', name: 'AR', category: 'asset', nature: 'debit' });
    gl.registerAccount({ code: '1105', name: 'Inventory', category: 'asset', nature: 'debit' });
    gl.registerAccount({ code: '2102', name: 'VAT Output', category: 'liability', nature: 'credit' });
    gl.registerAccount({ code: '4101', name: 'Sales Revenue', category: 'revenue', nature: 'credit' });
    gl.registerAccount({ code: '5101', name: 'Cost of Goods Sold', category: 'expense', nature: 'debit' });
    const pe = new PostingEngine(gl);
    const stock = new StockEngine({ postingEngine: pe });

    // Seed inventory: 10 units @ 2,000,000 IRR
    stock.receiveGoods({
      tenant_id: 'ten_01',
      organization_id: 'org_01',
      warehouse_id: 'wh_central',
      item_id: 'prod_server_01',
      quantity: 10,
      unit_cost: 2000000
    });

    const invEngine = new InvoiceEngine({ postingEngine: pe, stockEngine: stock });
    const inv = invEngine.createDraftInvoice({
      id: 'inv_cogs_test',
      tenant_id: 'ten_01',
      organization_id: 'org_01',
      invoice_number: 'INV-COGS-101',
      customer: { id: 'cust_101', name: 'خریدار تجهیزات' }
    });

    invEngine.addItemLine(inv.id, {
      item: { id: 'prod_server_01', name: 'Server Rack', type: 'goods', tax_item_identifier: '271000' },
      quantity: 4,
      unit_price: 3500000 // Sale price: 3.5M each
    });

    const approveResult = invEngine.approveAndPost(inv.id, 'auditor');
    assert.strictEqual(approveResult.invoice.status, 'posted');
    assert.strictEqual(approveResult.invoice.goods_issued, true);
    // Cost of 4 units @ 2M cost = 8,000,000 IRR
    assert.strictEqual(approveResult.cogsAmount, 8000000);
    assert.ok(approveResult.cogsJournalId);

    // Verify stock balance decremented from 10 to 6
    const stockAfter = stock.getBalance('ten_01', 'org_01', 'wh_central', 'prod_server_01');
    assert.strictEqual(stockAfter.on_hand_quantity, 6);

    // Verify GL Account 5101 COGS has 8M debit and Account 1105 Inventory was credited
    const cogsAcc = gl.getAccount('5101');
    assert.strictEqual(cogsAcc.debitBalance, 8000000);
    const invAcc = gl.getAccount('1105');
    assert.strictEqual(invAcc.creditBalance, 8000000);
  });

  // DEFECT 05
  it('DEFECT 05 — Exact Precision: MoneyPrecision prevents floating-point drift and validates large sums', () => {
    // 0.1 + 0.2 float issue
    const floatSum = 0.1 + 0.2;
    assert.notStrictEqual(floatSum, 0.3); // In JS IEEE-754 this is 0.30000000000000004

    // MoneyPrecision exact math
    const val1 = MoneyPrecision.multiplyRate(1000000000, 0.09); // 9% tax on 1B Rials
    assert.strictEqual(val1, 90000000);

    // Large monetary value: 500 Billion Rials
    const largeAmount = 500000000000;
    const rate = 1.055;
    const multiplied = MoneyPrecision.multiplyRate(largeAmount, rate);
    assert.strictEqual(multiplied, 527500000000);

    // Invariant balance check
    const valid = AccountingEventContract.validate({
      event_id: 'EVT-TEST-EXACT',
      event_type: 'PAYMENT_RECEIVED',
      tenant_id: 'ten_01',
      organization_id: 'org_01',
      occurred_at: new Date().toISOString(),
      effective_date: '2026-09-26',
      source_module: 'test',
      source_entity_id: 'test_1',
      currency: 'IRR',
      idempotency_key: 'IDEMP-TEST-EXACT',
      lines: [
        { account_code: '1101', debit: 527500000000, credit: 0 },
        { account_code: '1103', debit: 0, credit: 527500000000 }
      ]
    });
    assert.strictEqual(valid.isValid, true);
    assert.strictEqual(valid.totalDebit, 527500000000);
  });

  // DEFECT 06
  it('DEFECT 06 — Concurrency & Over-Allocation: Prevents negative stock and limits credit exposure', () => {
    const stock = new StockEngine();
    stock.receiveGoods({
      tenant_id: 'ten_01',
      organization_id: 'org_01',
      warehouse_id: 'wh_1',
      item_id: 'item_conc_01',
      quantity: 5,
      unit_cost: 100000
    });

    // Reserving 4 units succeeds
    const res1 = stock.reserveStock('ten_01', 'org_01', 'wh_1', 'item_conc_01', 4);
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.available_remaining, 1);

    // Attempting to reserve 2 units when only 1 is available throws error
    assert.throws(() => {
      stock.reserveStock('ten_01', 'org_01', 'wh_1', 'item_conc_01', 2);
    }, /Insufficient available stock for reservation/);

    // Customer 360 Credit Reservation
    const crm = new Customer360Engine();
    crm.registerCustomer({
      id: 'cust_limit_01',
      name: 'مشتری اعتباری',
      credit_limit: 100000000 // 100M limit
    });

    // Reserve 80M -> Succeeds
    const credRes1 = crm.reserveCredit('cust_limit_01', 80000000);
    assert.strictEqual(credRes1.approved, true);

    // Concurrent order for 30M -> Exceeds remaining 20M -> Rejected!
    const credRes2 = crm.reserveCredit('cust_limit_01', 30000000);
    assert.strictEqual(credRes2.approved, false);
    assert.strictEqual(credRes2.code, 'LIMIT_EXCEEDED');
  });

  // DEFECT 07
  it('DEFECT 07 — Year-End Closing: Closes nominal accounts to Retained Earnings and locks fiscal year', () => {
    const gl = new GeneralLedger();
    gl.registerAccount({ code: '1101', name: 'Cash', category: 'asset', nature: 'debit' });
    gl.registerAccount({ code: '4101', name: 'Sales Revenue', category: 'revenue', nature: 'credit' });
    gl.registerAccount({ code: '5101', name: 'Operating Expense', category: 'expense', nature: 'debit' });
    const pe = new PostingEngine(gl);

    // Sales Revenue: 50,000,000 IRR
    pe.postEvent({
      event_id: 'EVT-YE-REV',
      event_type: 'INVOICE_ISSUED',
      tenant_id: 'ten_01',
      organization_id: 'org_01',
      occurred_at: '2026-09-01T00:00:00Z',
      effective_date: '2026-09-01',
      source_module: 'sales',
      source_entity_id: 's1',
      currency: 'IRR',
      idempotency_key: 'IDEMP-YE-REV',
      lines: [
        { account_code: '1101', debit: 50000000, credit: 0 },
        { account_code: '4101', debit: 0, credit: 50000000 }
      ]
    });

    // Expense: 20,000,000 IRR
    pe.postEvent({
      event_id: 'EVT-YE-EXP',
      event_type: 'PAYMENT_DISBURSED',
      tenant_id: 'ten_01',
      organization_id: 'org_01',
      occurred_at: '2026-09-02T00:00:00Z',
      effective_date: '2026-09-02',
      source_module: 'expense',
      source_entity_id: 'e1',
      currency: 'IRR',
      idempotency_key: 'IDEMP-YE-EXP',
      lines: [
        { account_code: '5101', debit: 20000000, credit: 0 },
        { account_code: '1101', debit: 0, credit: 20000000 }
      ]
    });

    // Execute Fiscal Year Closing for 1405
    const closing = gl.closeFiscalYear({
      fiscal_year: '1405',
      closing_date: '1405/12/29',
      income_summary_account: '9901',
      retained_earnings_account: '3201',
      actor: 'chief_accountant'
    });

    assert.strictEqual(closing.net_profit_or_loss, 30000000);
    assert.strictEqual(closing.result_type, 'NET_PROFIT');

    // Nominal accounts must have exactly zero balance
    assert.strictEqual(gl.getAccount('4101').netBalance, 0);
    assert.strictEqual(gl.getAccount('5101').netBalance, 0);

    // Retained Earnings (3201) must hold the 30M profit
    assert.strictEqual(gl.getAccount('3201').netBalance, 30000000);

    // Fiscal period 1405 is LOCKED
    assert.throws(() => gl.checkPeriodOpen('1405-06-15'), /Period '1405' is LOCKED/);
  });

  // DEFECT 08
  it('DEFECT 08 — Endorsed Cheque Bounce: Restores supplier liability and customer receivable', () => {
    const gl = new GeneralLedger();
    gl.registerAccount({ code: '1102', name: 'Notes Receivable', category: 'asset', nature: 'debit' });
    gl.registerAccount({ code: '1103', name: 'Accounts Receivable', category: 'asset', nature: 'debit' });
    gl.registerAccount({ code: '2101', name: 'Accounts Payable', category: 'liability', nature: 'credit' });
    const pe = new PostingEngine(gl);
    const treasury = new SayadChequeEngine({ postingEngine: pe });

    // 1. Receive cheque from customer
    const chq = treasury.registerReceivedCheque({
      id: 'chq_end_01',
      tenant_id: 'ten_01',
      organization_id: 'org_01',
      sayad_id: '1234567890123456',
      drawer_name: 'شرکت مشتری الف',
      customer_id: 'cust_alpha',
      amount: 45000000
    });

    // 2. Endorse cheque to supplier
    treasury.endorseChequeToSupplier(chq.id, 'supp_beta', 'تأمین‌کننده بتا');
    assert.strictEqual(chq.status, 'endorsed');

    // 3. Cheque bounces at supplier bank -> bounceEndorsedCheque
    const bouncedChq = treasury.bounceEndorsedCheque(chq.id, {
      bounceReason: 'عدم تطابق امضا و کسری موجودی',
      protestCertificateNumber: 'CERT-CBI-998877'
    });

    assert.strictEqual(bouncedChq.status, 'endorsed_bounced');
    assert.strictEqual(bouncedChq.protest_certificate_number, 'CERT-CBI-998877');

    // GL Verification: Supplier is payable again (Credit 2101) & Customer is receivable again (Debit 1103)
    const apAcc = gl.getAccount('2101');
    assert.strictEqual(apAcc.creditBalance, 45000000);
    const arAcc = gl.getAccount('1103');
    assert.strictEqual(arAcc.debitBalance, 45000000);
  });

  // DEFECT 09
  it('DEFECT 09 — Weighbridge Tolerance: Controlled tolerance accepts minor variances and rejects overbilling', () => {
    const proc = new ProcurementEngine();
    const po = proc.createPurchaseOrder({
      id: 'po_wt_01',
      tenant_id: 'ten_01',
      organization_id: 'org_01',
      po_number: 'PO-CEMENT-01',
      supplier: { id: 'supp_cement', name: 'سیمان تهران' },
      items: [{ itemId: 'item_cement_bulk', name: 'سیمان فله تیپ ۲', quantity: 1000, unitPrice: 15000 }],
      item_tolerances: { item_cement_bulk: 2.0 } // 2% weighbridge tolerance
    });

    // Received 1000 tons
    proc.recordGoodsReceipt({
      id: 'gr_wt_01',
      tenant_id: 'ten_01',
      organization_id: 'org_01',
      po_id: po.id,
      items: [{ itemId: 'item_cement_bulk', receivedQuantity: 1000 }]
    });

    // Supplier bills 1015 tons (1.5% variance -> within 2% tolerance) -> MATCHED!
    const pi1 = proc.submitSupplierInvoice({
      id: 'pi_wt_acceptable',
      tenant_id: 'ten_01',
      organization_id: 'org_01',
      invoice_number: 'PINV-1015',
      po_id: po.id,
      items: [{ itemId: 'item_cement_bulk', billedQuantity: 1015, billedUnitPrice: 15000 }]
    });
    const match1 = proc.executeThreeWayMatch(pi1.id);
    assert.strictEqual(match1.is_matched, true);

    // Supplier bills 1060 tons (6% variance -> exceeds 2% tolerance and 5% hard cap) -> REJECTED!
    const pi2 = proc.submitSupplierInvoice({
      id: 'pi_wt_rejected',
      tenant_id: 'ten_01',
      organization_id: 'org_01',
      invoice_number: 'PINV-1060',
      po_id: po.id,
      items: [{ itemId: 'item_cement_bulk', billedQuantity: 1060, billedUnitPrice: 15000 }]
    });
    const match2 = proc.executeThreeWayMatch(pi2.id);
    assert.strictEqual(match2.is_matched, false);
    assert.strictEqual(match2.discrepancies[0].type, 'QUANTITY_MISMATCH');
  });

  // DEFECT 10
  it('DEFECT 10 — Organization Isolation: Blocks cross-organization reads and mutations', () => {
    const userOrg1 = new TenantContext({
      user_id: 'u1',
      tenant_id: 'ten_holding',
      organization_id: 'org_tehran_branch',
      roles: ['branch_accountant']
    });

    const dataset = [
      { id: 1, tenant_id: 'ten_holding', organization_id: 'org_tehran_branch', title: 'فاکتور تهران' },
      { id: 2, tenant_id: 'ten_holding', organization_id: 'org_tabriz_branch', title: 'فاکتور تبریز' }
    ];

    // Read isolation: user in Tehran branch only sees Tehran records
    const filtered = RlsEnforcer.filterDatasetByOrganization(dataset, userOrg1);
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].organization_id, 'org_tehran_branch');

    // Mutation isolation: user in Tehran branch cannot mutate Tabriz records
    const foreignRecord = { tenant_id: 'ten_holding', organization_id: 'org_tabriz_branch', title: 'ویرایش تبریز' };
    assert.throws(() => {
      RlsEnforcer.authorizeMutation(foreignRecord, userOrg1);
    }, /Organization Isolation Violation/);

    // Holding Auditor with authorized consolidated access sees all orgs in tenant
    const auditor = new TenantContext({
      user_id: 'auditor_1',
      tenant_id: 'ten_holding',
      organization_id: 'org_hq',
      roles: ['holding_auditor']
    });
    const auditView = RlsEnforcer.filterDatasetByOrganization(dataset, auditor, { allowConsolidated: true });
    assert.strictEqual(auditView.length, 2);
  });

  // DEFECT 11
  it('DEFECT 11 — Article 141 & Article 5: Enforces statutory minimum capital floors during restructuring', () => {
    const gov = new Article141ComplianceEngine();

    // Public Joint Stock: Minimum legal capital is 5,000,000 IRR under Article 5
    const pubMin = gov.getMinimumStatutoryCapital('PUBLIC_JOINT_STOCK');
    assert.strictEqual(pubMin, 5000000);

    // Company has 10M capital and 8M accumulated loss (80% loss -> Article 141 triggered)
    const sim = gov.simulateRemediation({
      current_capital: 10000000,
      current_loss: 8000000,
      company_type: 'PUBLIC_JOINT_STOCK',
      method: 'CAPITAL_REDUCTION',
      injection_amount: 8000000 // Attempting to reduce capital by 8M down to 2M (< 5M statutory floor)
    });

    assert.strictEqual(sim.legal_floor_violation, true);
    assert.strictEqual(sim.pro_forma_capital, 5000000, 'Capital reduction must be capped at statutory minimum 5,000,000 IRR');
    assert.ok(sim.warning_message.includes('ماده ۵'));
  });

});
