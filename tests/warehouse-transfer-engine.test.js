const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { GeneralLedger } = require('../src/ledger/general-ledger');
const { PostingEngine } = require('../src/ledger/posting-engine');
const { StockEngine } = require('../src/inventory/stock-engine');
const { WarehouseTransferEngine } = require('../src/inventory/warehouse-transfer-engine');

describe('Multi-Warehouse, Stock Transfers & Batch/Serial Tracking (Chapters 012, 038, 055, 069, 095, 118, 145, 171)', () => {
  let ledger;
  let postingEngine;
  let stockEngine;
  let transferEngine;

  beforeEach(() => {
    ledger = new GeneralLedger();
    ledger.registerAccount({ code: '1105', name: 'Inventory Asset', category: 'asset', nature: 'debit' });
    postingEngine = new PostingEngine(ledger);
    stockEngine = new StockEngine({ postingEngine });
    transferEngine = new WarehouseTransferEngine({ stockEngine, postingEngine });

    // Register warehouses
    transferEngine.registerWarehouse({
      id: 'wh_tehran_central',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      code: 'WH-TEH-01',
      name: 'انبار مرکزی تهران',
      type: 'physical',
      location: 'تهران، جاده مخصوص'
    });

    transferEngine.registerWarehouse({
      id: 'wh_shiraz_branch',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      code: 'WH-SHZ-02',
      name: 'انبار شعبه شیراز',
      type: 'physical',
      location: 'شیراز، شهرک صنعتی'
    });

    transferEngine.registerWarehouse({
      id: 'wh_in_transit',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      code: 'WH-TRANSIT',
      name: 'انبار مجازی کالای در راه',
      type: 'in_transit'
    });
  });

  it('Registers unique serial numbers and prevents duplicate registration', () => {
    const s1 = transferEngine.registerSerial({
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      warehouse_id: 'wh_tehran_central',
      item_id: 'item_server_42u',
      serial_number: 'SN-42U-99001',
      warranty_months: 24
    });

    assert.strictEqual(s1.status, 'in_stock');
    assert.strictEqual(s1.serial_number, 'SN-42U-99001');

    // Duplicate registration must throw
    assert.throws(
      () => transferEngine.registerSerial({
        tenant_id: 'ten_main',
        organization_id: 'org_main',
        warehouse_id: 'wh_tehran_central',
        item_id: 'item_server_42u',
        serial_number: 'SN-42U-99001'
      }),
      /already exists/
    );
  });

  it('Registers batch/lot numbers with manufacturing and expiration dates', () => {
    const batch = transferEngine.registerBatch({
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      item_id: 'item_chemical_resin',
      batch_number: 'LOT-2026-A1',
      manufacture_date: '2026-01-10',
      expiry_date: '2027-01-10',
      quantity: 500
    });

    assert.strictEqual(batch.batch_number, 'LOT-2026-A1');
    assert.strictEqual(batch.quantity, 500);
  });

  it('Prevents inter-warehouse transfer when source warehouse stock is insufficient', () => {
    // Seed 5 units in Tehran warehouse
    stockEngine.receiveGoods({
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      warehouse_id: 'wh_tehran_central',
      item_id: 'item_switch',
      quantity: 5,
      unit_cost: 20000000
    });

    // Request transfer of 10 units (more than available)
    assert.throws(
      () => transferEngine.requestTransfer({
        id: 'xfer_fail_01',
        tenant_id: 'ten_main',
        organization_id: 'org_main',
        transfer_number: 'TR-1405-FAIL',
        source_warehouse_id: 'wh_tehran_central',
        destination_warehouse_id: 'wh_shiraz_branch',
        items: [{ itemId: 'item_switch', quantity: 10 }]
      }),
      /Insufficient stock/
    );
  });

  it('Executes full 3-step transfer lifecycle: Request -> Dispatch (In-Transit) -> Receive (Destination)', () => {
    // 1. Initial stock in Tehran Central: 20 units @ 15,000,000 = 300,000,000
    stockEngine.receiveGoods({
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      warehouse_id: 'wh_tehran_central',
      item_id: 'item_router_cisco',
      quantity: 20,
      unit_cost: 15000000
    });

    // Register 2 serials for this item
    transferEngine.registerSerial({
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      warehouse_id: 'wh_tehran_central',
      item_id: 'item_router_cisco',
      serial_number: 'SN-RTR-001'
    });
    transferEngine.registerSerial({
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      warehouse_id: 'wh_tehran_central',
      item_id: 'item_router_cisco',
      serial_number: 'SN-RTR-002'
    });

    // 2. Request Transfer of 5 units to Shiraz branch
    const xfer = transferEngine.requestTransfer({
      id: 'xfer_001',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      transfer_number: 'TR-1405-001',
      source_warehouse_id: 'wh_tehran_central',
      destination_warehouse_id: 'wh_shiraz_branch',
      items: [{
        itemId: 'item_router_cisco',
        quantity: 5,
        serials: ['SN-RTR-001', 'SN-RTR-002']
      }],
      reason: 'تأمین کالای سفارش مشتری شیراز'
    });

    assert.strictEqual(xfer.status, 'requested');

    // 3. Dispatch Transfer (leaves Tehran -> enters In-Transit)
    transferEngine.dispatchTransfer(xfer.id, 'wh_in_transit');
    assert.strictEqual(xfer.status, 'dispatched');

    // Check balances: Tehran has 15, In-Transit has 5, Shiraz has 0
    const tehranBal1 = stockEngine.getBalance('ten_main', 'org_main', 'wh_tehran_central', 'item_router_cisco');
    const transitBal1 = stockEngine.getBalance('ten_main', 'org_main', 'wh_in_transit', 'item_router_cisco');
    const shirazBal1 = stockEngine.getBalance('ten_main', 'org_main', 'wh_shiraz_branch', 'item_router_cisco');

    assert.strictEqual(tehranBal1.on_hand_quantity, 15);
    assert.strictEqual(transitBal1.on_hand_quantity, 5);
    assert.strictEqual(shirazBal1.on_hand_quantity, 0);

    // Verify serial numbers moved to in_transit
    const sn1 = transferEngine.serials.get('ten_main:item_router_cisco:SN-RTR-001');
    assert.strictEqual(sn1.status, 'in_transit');
    assert.strictEqual(sn1.warehouse_id, 'wh_in_transit');

    // 4. Receive Transfer in Shiraz (leaves In-Transit -> enters Shiraz)
    transferEngine.receiveTransfer(xfer.id);
    assert.strictEqual(xfer.status, 'received');

    // Check balances: Tehran has 15, In-Transit has 0, Shiraz has 5
    const tehranBal2 = stockEngine.getBalance('ten_main', 'org_main', 'wh_tehran_central', 'item_router_cisco');
    const transitBal2 = stockEngine.getBalance('ten_main', 'org_main', 'wh_in_transit', 'item_router_cisco');
    const shirazBal2 = stockEngine.getBalance('ten_main', 'org_main', 'wh_shiraz_branch', 'item_router_cisco');

    assert.strictEqual(tehranBal2.on_hand_quantity, 15);
    assert.strictEqual(transitBal2.on_hand_quantity, 0);
    assert.strictEqual(shirazBal2.on_hand_quantity, 5);
    assert.strictEqual(shirazBal2.average_cost, 15000000);

    // Verify serial numbers now located at Shiraz branch
    assert.strictEqual(sn1.status, 'in_stock');
    assert.strictEqual(sn1.warehouse_id, 'wh_shiraz_branch');
  });

  it('Calculates Reorder Point and triggers restocking alerts when inventory is low', () => {
    // Product has only 3 units in Tehran, 0 in Shiraz
    stockEngine.receiveGoods({
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      warehouse_id: 'wh_tehran_central',
      item_id: 'item_switch_24',
      quantity: 3,
      unit_cost: 10000000
    });

    const catalogItems = [
      { id: 'item_switch_24', name: 'سوییچ شبکه ۲۴ پورت' }
    ];

    const rules = {
      item_switch_24: { minStock: 5, reorderPoint: 8, targetStock: 20 }
    };

    const alerts = transferEngine.evaluateReorderAlerts('ten_main', 'org_main', catalogItems, rules);
    assert.strictEqual(alerts.length, 1);
    assert.strictEqual(alerts[0].itemId, 'item_switch_24');
    assert.strictEqual(alerts[0].current_stock, 3);
    assert.strictEqual(alerts[0].urgency, 'CRITICAL'); // 3 <= minStock (5)
    assert.strictEqual(alerts[0].suggested_order_qty, 17); // 20 - 3
  });
});
