const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { GeneralLedger } = require('../src/ledger/general-ledger');
const { PostingEngine } = require('../src/ledger/posting-engine');
const { InvoiceEngine } = require('../src/invoicing/invoice-engine');
const { defaultTaxEngine } = require('../src/tax/tax-rule-engine');
const { Counterparty } = require('../src/domain/canonical/counterparty');
const { CatalogItem } = require('../src/domain/canonical/catalog-item');

describe('Full Invoicing & Accounting Lifecycle (Chapters 013, 014, 016, 045, 242, 252)', () => {
  let ledger;
  let postingEngine;
  let invoiceEngine;

  beforeEach(() => {
    ledger = new GeneralLedger();
    ledger.registerAccount({ code: '1101', name: 'Cash and Bank', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '1103', name: 'Accounts Receivable', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '2102', name: 'VAT Output Tax Payable', category: 'liability', nature: 'credit' });
    ledger.registerAccount({ code: '4101', name: 'Sales Revenue', category: 'revenue', nature: 'credit' });
    postingEngine = new PostingEngine(ledger);
    invoiceEngine = new InvoiceEngine({ postingEngine, taxEngine: defaultTaxEngine });
  });

  it('Executes Draft -> Line Calculation -> Approval -> Automatic Ledger Posting', () => {
    const customer = new Counterparty({
      id: 'cust_tehran_01',
      tenant_id: 'ten_tehran',
      organization_id: 'org_tehran',
      type: 'legal',
      name: 'شرکت فناوری نوین پارس',
      national_id: '10103504444',
      economic_code: '411544444444'
    });

    const productLaptop = new CatalogItem({
      id: 'prod_lap_01',
      tenant_id: 'ten_tehran',
      organization_id: 'org_tehran',
      code: 'LAP-PRO-16',
      name: 'لپ‌تاپ مهندسی ۱۶ اینچ',
      type: 'goods',
      tax_item_identifier: '2710000000001',
      base_sale_price: 50000000,
      is_taxable: true
    });

    // 1. Create Draft Invoice
    const invoice = invoiceEngine.createDraftInvoice({
      id: 'inv_2026_001',
      tenant_id: 'ten_tehran',
      organization_id: 'org_tehran',
      invoice_number: 'INV-1405-00101',
      customer,
      invoice_date: '2026-09-25'
    });

    assert.strictEqual(invoice.status, 'draft');

    // 2. Add Line Item: 2 units @ 50,000,000 = 100,000,000 gross. 10% VAT = 10,000,000. Total = 110,000,000.
    invoiceEngine.addItemLine(invoice.id, {
      item: productLaptop,
      quantity: 2,
      unit_price: 50000000,
      discount_amount: 0
    });

    assert.strictEqual(invoice.total_gross_amount, 100000000);
    assert.strictEqual(invoice.total_net_amount, 100000000);
    assert.strictEqual(invoice.total_tax_amount, 10000000);
    assert.strictEqual(invoice.total_final_amount, 110000000);

    // 3. Approve and Post Invoice to General Ledger
    const postResult = invoiceEngine.approveAndPost(invoice.id, 'accountant_mohammad');
    assert.strictEqual(postResult.invoice.status, 'posted');
    assert.strictEqual(postResult.invoice.accounting_posted, true);
    assert.ok(postResult.journalEntry);

    // 4. Verify Financial Invariant in General Ledger:
    // Debit AR (1103) = 110,000,000
    // Credit Revenue (4101) = 100,000,000
    // Credit VAT (2102) = 10,000,000
    const tb = ledger.getTrialBalance();
    assert.strictEqual(tb.isBalanced, true);
    assert.strictEqual(tb.totalDebit, 110000000);
    assert.strictEqual(tb.totalCredit, 110000000);

    const arAcc = ledger.getAccount('1103');
    const revAcc = ledger.getAccount('4101');
    const vatAcc = ledger.getAccount('2102');

    assert.strictEqual(arAcc.netBalance, 110000000);
    assert.strictEqual(revAcc.netBalance, 100000000);
    assert.strictEqual(vatAcc.netBalance, 10000000);
  });
});
