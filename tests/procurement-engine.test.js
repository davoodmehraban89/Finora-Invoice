const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { GeneralLedger } = require('../src/ledger/general-ledger');
const { PostingEngine } = require('../src/ledger/posting-engine');
const { StockEngine } = require('../src/inventory/stock-engine');
const { ProcurementEngine } = require('../src/procurement/procurement-engine');
const { Counterparty } = require('../src/domain/canonical/counterparty');

describe('Enterprise Procurement, Purchase Orders & Three-Way Matching (Chapters 023, 037, 051, 068, 094, 117, 144, 170)', () => {
  let ledger;
  let postingEngine;
  let stockEngine;
  let procurementEngine;
  let supplier;

  beforeEach(() => {
    ledger = new GeneralLedger();
    ledger.registerAccount({ code: '1101', name: 'Cash and Bank', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '1105', name: 'Inventory Asset', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '2101', name: 'Accounts Payable to Suppliers', category: 'liability', nature: 'credit' });
    postingEngine = new PostingEngine(ledger);
    stockEngine = new StockEngine({ postingEngine });

    procurementEngine = new ProcurementEngine({
      postingEngine,
      stockEngine
    });

    supplier = new Counterparty({
      id: 'supp_shiraz_01',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      type: 'legal',
      name: 'صنایع الکترونیک شیراز',
      national_id: '10100998877',
      economic_code: '411998877001'
    });
  });

  it('Manages Purchase Request lifecycle from draft to approval', () => {
    const pr = procurementEngine.createPurchaseRequest({
      id: 'pr_001',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      request_number: 'PR-1405-001',
      requester: 'واحد فناوری اطلاعات',
      department: 'مهندسی',
      items: [
        { itemId: 'item_server_42u', name: 'رک سرور ۴۲ یونیت', quantity: 3, estimatedPrice: 150000000 }
      ],
      reason: 'توسعه زیرساخت مرکز داده'
    });

    assert.strictEqual(pr.status, 'pending_approval');
    assert.strictEqual(pr.items.length, 1);
    assert.strictEqual(pr.items[0].quantity, 3);

    procurementEngine.approvePurchaseRequest(pr.id, 'مدیر تدارکات');
    assert.strictEqual(pr.status, 'approved');
  });

  it('Issues RFQ and captures multi-supplier quotations', () => {
    const pr = procurementEngine.createPurchaseRequest({
      id: 'pr_002',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      request_number: 'PR-1405-002',
      requester: 'فناوری',
      department: 'IT',
      items: [{ itemId: 'item_switch_24', name: 'سوییچ شبکه ۲۴ پورت', quantity: 2 }]
    });

    const rfq = procurementEngine.createRFQ({
      id: 'rfq_001',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      rfq_number: 'RFQ-1405-01',
      purchase_request_id: pr.id,
      invited_suppliers: ['supp_shiraz_01', 'supp_tehran_02']
    });

    assert.strictEqual(rfq.status, 'open');

    // Supplier 1 submits quote
    const quote1 = procurementEngine.submitSupplierQuote(rfq.id, {
      supplier_id: 'supp_shiraz_01',
      supplier_name: 'صنایع الکترونیک شیراز',
      item_quotes: [{ itemId: 'item_switch_24', unitPrice: 85000000 }],
      delivery_days: 5,
      supplier_rating: 95
    });

    assert.strictEqual(rfq.quotes.length, 1);
    assert.strictEqual(quote1.total_quote_amount, 170000000); // 2 * 85M
  });

  it('Executes Three-Way Match: Succeeds on exact quantity and price alignment', () => {
    // 1. Create Purchase Order for 10 units @ 5,000,000 = 50,000,000 gross. 10% VAT = 5,000,000. Total = 55,000,000.
    const po = procurementEngine.createPurchaseOrder({
      id: 'po_test_01',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      po_number: 'PO-1405-TEST-01',
      supplier,
      delivery_date: '2026-10-10',
      items: [{ itemId: 'item_router_cisco', name: 'روتر شبکه', quantity: 10, unitPrice: 5000000 }]
    });

    // 2. Receive 10 units in warehouse -> Updates inventory
    const gr = procurementEngine.recordGoodsReceipt({
      id: 'gr_test_01',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      po_id: po.id,
      items: [{ itemId: 'item_router_cisco', receivedQuantity: 10 }]
    });

    assert.strictEqual(gr.items[0].received_quantity, 10);
    const stockBal = stockEngine.getBalance('ten_main', 'org_main', 'wh_central', 'item_router_cisco');
    assert.strictEqual(stockBal.on_hand_quantity, 10);
    assert.strictEqual(stockBal.total_valuation, 50000000);

    // 3. Supplier sends invoice matching exact quantity and agreed price
    const pi = procurementEngine.submitSupplierInvoice({
      id: 'pi_test_01',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      invoice_number: 'INV-SUPP-9911',
      po_id: po.id,
      items: [{ itemId: 'item_router_cisco', billedQuantity: 10, billedUnitPrice: 5000000 }]
    });

    // 4. Execute Three-Way Match: MUST PASS
    const match = procurementEngine.executeThreeWayMatch(pi.id);
    assert.strictEqual(match.is_matched, true);
    assert.strictEqual(match.status, 'MATCHED');
    assert.strictEqual(match.discrepancies_count, 0);

    // 5. Approve and Post to General Ledger
    const postRes = procurementEngine.approveMatchedInvoice(pi.id, 'مدیر مالی');
    assert.strictEqual(postRes.success, true);
    assert.ok(postRes.journal_id.startsWith('JRN-'));

    // Verify Double-Entry Balance
    const tb = ledger.getTrialBalance();
    assert.strictEqual(tb.isBalanced, true);
    const apAccount = ledger.getAccount('2101');
    assert.strictEqual(apAccount.netBalance, 55000000); // 50M gross + 5M VAT
  });

  it('Three-Way Match rejects invoice when billed price exceeds agreed PO price (PRICE_MISMATCH)', () => {
    // PO agreed price: 10,000,000 per unit
    const po = procurementEngine.createPurchaseOrder({
      id: 'po_price_err',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      po_number: 'PO-PRICE-ERR',
      supplier,
      items: [{ itemId: 'item_cable', name: 'کابل شبکه', quantity: 5, unitPrice: 10000000 }]
    });

    // Warehouse receives 5 units
    procurementEngine.recordGoodsReceipt({
      id: 'gr_price_err',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      po_id: po.id,
      items: [{ itemId: 'item_cable', receivedQuantity: 5 }]
    });

    // Supplier sends invoice with price inflation (12,000,000 instead of 10,000,000)
    const pi = procurementEngine.submitSupplierInvoice({
      id: 'pi_price_err',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      invoice_number: 'PINV-INFLATED',
      po_id: po.id,
      items: [{ itemId: 'item_cable', billedQuantity: 5, billedUnitPrice: 12000000 }]
    });

    const match = procurementEngine.executeThreeWayMatch(pi.id);
    assert.strictEqual(match.is_matched, false);
    assert.strictEqual(match.status, 'MISMATCH_DETECTED');
    assert.ok(match.discrepancies.some(d => d.type === 'PRICE_MISMATCH'));

    // Attempting to approve must fail
    assert.throws(
      () => procurementEngine.approveMatchedInvoice(pi.id),
      /Three-Way Match failed/
    );
  });

  it('Three-Way Match rejects invoice when billed quantity exceeds received quantity (QUANTITY_MISMATCH)', () => {
    const po = procurementEngine.createPurchaseOrder({
      id: 'po_qty_err',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      po_number: 'PO-QTY-ERR',
      supplier,
      items: [{ itemId: 'item_ram', name: 'حافظه رم ۳۲ گیگابایت', quantity: 10, unitPrice: 4000000 }]
    });

    // Warehouse receives partial delivery: 6 units only
    procurementEngine.recordGoodsReceipt({
      id: 'gr_qty_err',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      po_id: po.id,
      items: [{ itemId: 'item_ram', receivedQuantity: 6 }]
    });

    // Supplier bills for all 10 units!
    const pi = procurementEngine.submitSupplierInvoice({
      id: 'pi_qty_err',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      invoice_number: 'PINV-OVERBILL',
      po_id: po.id,
      items: [{ itemId: 'item_ram', billedQuantity: 10, billedUnitPrice: 4000000 }]
    });

    const match = procurementEngine.executeThreeWayMatch(pi.id);
    assert.strictEqual(match.is_matched, false);
    assert.ok(match.discrepancies.some(d => d.type === 'QUANTITY_MISMATCH'));

    assert.throws(
      () => procurementEngine.approveMatchedInvoice(pi.id),
      /Three-Way Match failed/
    );
  });

  it('Three-Way Match rejects invoice when goods have not yet arrived in warehouse (UNRECEIVED_GOODS)', () => {
    const po = procurementEngine.createPurchaseOrder({
      id: 'po_unrec_err',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      po_number: 'PO-UNREC-ERR',
      supplier,
      items: [{ itemId: 'item_disk', name: 'هارد سرور', quantity: 4, unitPrice: 15000000 }]
    });

    // Zero goods received in warehouse!
    const pi = procurementEngine.submitSupplierInvoice({
      id: 'pi_unrec_err',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      invoice_number: 'PINV-PREMATURE',
      po_id: po.id,
      items: [{ itemId: 'item_disk', billedQuantity: 4, billedUnitPrice: 15000000 }]
    });

    const match = procurementEngine.executeThreeWayMatch(pi.id);
    assert.strictEqual(match.is_matched, false);
    assert.ok(match.discrepancies.some(d => d.type === 'UNRECEIVED_GOODS'));
  });
});
