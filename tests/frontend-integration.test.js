const { describe, it } = require('node:test');
const assert = require('node:assert');
const { FinoraClient } = require('../assets/js/finora-core-client');

describe('Frontend Client Bridge & Web Interface Integration (Chapters 006, 007, 013, 014, 021, 232)', () => {
  it('Initializes FinoraClient with seed data and verified General Ledger', () => {
    const client = new FinoraClient();
    const metrics = client.getDashboardMetrics();

    assert.strictEqual(metrics.trial_balance_balanced, true);
    assert.strictEqual(metrics.total_liquid_cash, 150000000);
    assert.strictEqual(client.getCustomers().length, 1);
    assert.strictEqual(client.getProducts().length, 2);
  });

  it('Creates new customer and product via client bridge', () => {
    const client = new FinoraClient();

    const newCust = client.createCustomer({
      type: 'legal',
      name: 'شرکت مهندسی داده‌پرداز خلیج فارس',
      national_id: '14008922222',
      economic_code: '411892222222',
      phone: '021-22334455'
    });

    const newProd = client.createProduct({
      code: 'CONS-AI-01',
      name: 'مشاوره استقرار هوش مصنوعی سازمانی',
      type: 'service',
      unit: 'HOUR',
      tax_item_identifier: '2710000033333',
      base_sale_price: 25000000,
      is_taxable: true
    });

    assert.ok(newCust.id);
    assert.ok(newProd.id);
    assert.strictEqual(client.getCustomers().length, 2);
    assert.strictEqual(client.getProducts().length, 3);
  });

  it('Simulates full new-invoice.html workflow and updates General Ledger & Moadian payload', () => {
    const client = new FinoraClient();
    const customer = client.getCustomers()[0];
    const product = client.getProducts()[0];

    // 1. Create invoice with 2 units @ 120,000,000 = 240,000,000 gross. 10% VAT = 24,000,000. Total = 264,000,000.
    const invoice = client.createInvoiceWithLines({
      invoiceNumber: 'INV-1405-UI-01',
      customerId: customer.id,
      invoiceDate: '2026-09-25',
      lines: [
        {
          productId: product.id,
          quantity: 2,
          unitPrice: product.base_sale_price,
          discount: 0
        }
      ],
      actor: 'داوود مهربان'
    });

    assert.strictEqual(invoice.status, 'draft');
    assert.strictEqual(invoice.total_gross_amount, 240000000);
    assert.strictEqual(invoice.total_tax_amount, 24000000);
    assert.strictEqual(invoice.total_final_amount, 264000000);

    // 2. Approve and post to General Ledger
    const postResult = client.approveAndPostInvoice(invoice.id, 'داوود مهربان');
    assert.strictEqual(postResult.invoice.status, 'posted');
    assert.strictEqual(postResult.invoice.accounting_posted, true);
    assert.ok(postResult.journalEntry.journal_id);

    // 3. Verify Dashboard Metrics update
    const metrics = client.getDashboardMetrics();
    assert.strictEqual(metrics.total_sales_revenue, 240000000);
    assert.strictEqual(metrics.total_vat_output, 24000000);
    assert.strictEqual(metrics.total_receivables, 264000000);
    assert.strictEqual(metrics.posted_invoices_count, 1);
    assert.strictEqual(metrics.trial_balance_balanced, true);

    // 4. Generate Moadian E-Invoice Payload
    const moadianPayload = client.exportMoadianPayload(invoice.id);
    assert.strictEqual(moadianPayload.header.inno, 'INV-1405-UI-01');
    assert.strictEqual(moadianPayload.header.tbill, 264000000);
    assert.strictEqual(moadianPayload.header.tvam, 24000000);
    assert.ok(moadianPayload.signature);
    assert.ok(moadianPayload.payload_hash);
  });
});
