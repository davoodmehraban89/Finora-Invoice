const { describe, it } = require('node:test');
const assert = require('node:assert');
const { DocumentStore } = require('../src/documents/document-store');
const { StockEngine } = require('../src/inventory/stock-engine');
const { CashFlowEngine } = require('../src/treasury/cash-flow-engine');

describe('Contracts, Inventory Valuation & Document Evidence (Chapters 012, 015, 020, 032, 238)', () => {
  it('DocumentStore enforces immutability, checksumming, and legal hold', () => {
    const store = new DocumentStore();
    const doc = store.ingestDocument({
      id: 'doc_contract_01',
      tenant_id: 'ten_01',
      organization_id: 'org_01',
      title: 'Commercial Supply Contract 1405',
      document_type: 'contract',
      content_raw: 'CONFIDENTIAL CONTRACT TERMS AGREEMENT 2026'
    });

    assert.strictEqual(doc.version, 1);
    assert.ok(doc.sha256_checksum);

    // Apply digital signature
    const sig = store.applyDigitalSignature(doc.id, {
      signer_id: 'usr_director_legal',
      certificate_reference: 'CERT-RSA-2026'
    });
    assert.ok(sig.signature_hash);

    // Apply Legal Hold
    const heldDoc = store.setLegalHold(doc.id, true, 'compliance_officer');
    assert.strictEqual(heldDoc.legal_hold, true);
  });

  it('StockEngine enforces moving average cost and prevents stockouts', () => {
    const stock = new StockEngine({});

    // Receive 10 units @ 10,000 = 100,000 valuation
    stock.receiveGoods({
      tenant_id: 'ten_1',
      organization_id: 'org_1',
      warehouse_id: 'wh_main',
      item_id: 'item_widget',
      quantity: 10,
      unit_cost: 10000,
      reference_id: 'PO-01'
    });

    // Receive 10 more units @ 20,000 = 200,000 valuation
    // Total 20 units, Total valuation 300,000 -> Average cost 15,000
    const rec2 = stock.receiveGoods({
      tenant_id: 'ten_1',
      organization_id: 'org_1',
      warehouse_id: 'wh_main',
      item_id: 'item_widget',
      quantity: 10,
      unit_cost: 20000,
      reference_id: 'PO-02'
    });

    assert.strictEqual(rec2.balance.on_hand_quantity, 20);
    assert.strictEqual(rec2.balance.average_cost, 15000);
    assert.strictEqual(rec2.balance.total_valuation, 300000);

    // Issue 5 units
    const issue1 = stock.issueGoods({
      tenant_id: 'ten_1',
      organization_id: 'org_1',
      warehouse_id: 'wh_main',
      item_id: 'item_widget',
      quantity: 5,
      reference_id: 'SO-01'
    });

    assert.strictEqual(issue1.balance.on_hand_quantity, 15);
    assert.strictEqual(issue1.balance.average_cost, 15000);
    assert.strictEqual(issue1.balance.total_valuation, 225000);

    // Attempt to issue 20 units (only 15 available) -> Must throw insufficient stock
    assert.throws(
      () => stock.issueGoods({
        tenant_id: 'ten_1',
        organization_id: 'org_1',
        warehouse_id: 'wh_main',
        item_id: 'item_widget',
        quantity: 20,
        reference_id: 'SO-02'
      }),
      /Insufficient inventory/
    );
  });

  it('CashFlowEngine calculates bank positions and records receipts', () => {
    const treasury = new CashFlowEngine({});
    const bank = treasury.registerBankAccount({
      id: 'bank_melli_01',
      tenant_id: 'ten_1',
      organization_id: 'org_1',
      bank_name: 'بانک ملی ایران',
      account_number: '0100000000001',
      iban: 'IR010000000000000000000001',
      opening_balance: 50000000
    });

    assert.strictEqual(bank.balance, 50000000);

    // Record Receipt of 25,000,000
    treasury.recordReceipt({
      id: 'rcp_001',
      tenant_id: 'ten_1',
      organization_id: 'org_1',
      bank_account_id: bank.id,
      customer_id: 'cust_01',
      amount: 25000000,
      reference_number: 'TR-9988'
    });

    const pos = treasury.calculateCashPosition('ten_1', 'org_1');
    assert.strictEqual(pos.total_liquid_cash, 75000000);
    assert.strictEqual(pos.accounts[0].balance, 75000000);
  });
});
