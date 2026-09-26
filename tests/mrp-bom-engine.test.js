const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { GeneralLedger } = require('../src/ledger/general-ledger');
const { PostingEngine } = require('../src/ledger/posting-engine');
const { StockEngine } = require('../src/inventory/stock-engine');
const { MrpBomEngine } = require('../src/manufacturing/mrp-bom-engine');

describe('Manufacturing, Bill of Materials (BOM), MRP & Standard Costing (Chapters 070, 103, 128, 153, 180)', () => {
  let ledger;
  let postingEngine;
  let stockEngine;
  let mrpEngine;

  beforeEach(() => {
    ledger = new GeneralLedger();
    ledger.registerAccount({ code: '1105', name: 'Raw Materials Inventory', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '1106', name: 'Work in Process (WIP)', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '1107', name: 'Finished Goods Inventory', category: 'asset', nature: 'debit' });

    postingEngine = new PostingEngine(ledger);
    stockEngine = new StockEngine({ postingEngine });
    mrpEngine = new MrpBomEngine({ stockEngine, postingEngine });
  });

  it('Registers BOM and calculates standard cost rollup (Materials + Labor + Overhead)', () => {
    // Finished Good: بتن آماده عیار ۳۵۰ (Ready-Mix Concrete) per 1 m³
    const bom = mrpEngine.registerBOM({
      id: 'bom_concrete_350',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      bom_code: 'BOM-CONC-350',
      finished_good_id: 'prod_concrete_350',
      finished_good_name: 'بتن آماده استاندارد عیار ۳۵۰',
      base_quantity: 1, // 1 m³
      unit: 'M3',
      components: [
        { itemId: 'raw_cement', itemName: 'سیمان تیپ ۲', quantity: 350, unitCost: 1500, scrapPercentage: 2 }, // 350kg * 1.02 = 357kg @ 1500 = 535,500
        { itemId: 'raw_sand', itemName: 'ماسه شسته', quantity: 1000, unitCost: 300, scrapPercentage: 5 }, // 1000kg * 1.05 = 1050kg @ 300 = 315,000
        { itemId: 'raw_gravel', itemName: 'شن نخودی', quantity: 800, unitCost: 250, scrapPercentage: 3 }, // 800kg * 1.03 = 824kg @ 250 = 206,000
        { itemId: 'raw_water', itemName: 'آب صنعتی', quantity: 180, unitCost: 50, scrapPercentage: 0 } // 180L @ 50 = 9,000
      ],
      routings: [
        { operation: 'میکس و بچینگ ماشینی', standardHours: 0.25, hourlyRate: 400000, overheadRate: 600000 } // 0.25 * (400k + 600k) = 250,000
      ]
    });

    // Material total = 535,500 + 315,000 + 206,000 + 9,000 = 1,065,500
    // Labor = 100,000
    // Overhead = 150,000
    // Standard Unit Cost = 1,315,500
    assert.strictEqual(bom.cost_breakdown.total_material_cost, 1065500);
    assert.strictEqual(bom.cost_breakdown.unit_labor_cost, 100000);
    assert.strictEqual(bom.cost_breakdown.unit_overhead_cost, 150000);
    assert.strictEqual(bom.cost_breakdown.unit_standard_cost, 1315500);
  });

  it('Runs Material Requirements Planning (MRP) and detects raw material shortages', () => {
    // Register BOM for 1 Server Assembly
    mrpEngine.registerBOM({
      id: 'bom_server_42u',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      bom_code: 'BOM-SRV-42U',
      finished_good_id: 'item_server_finished',
      finished_good_name: 'سرور شبکه ۴۲ یونیت سفارشی',
      base_quantity: 1,
      components: [
        { itemId: 'part_chassis', itemName: 'شاسی سرور', quantity: 1, unitCost: 30000000, scrapPercentage: 0 },
        { itemId: 'part_cpu', itemName: 'پردازنده زنون', quantity: 2, unitCost: 40000000, scrapPercentage: 0 },
        { itemId: 'part_ram', itemName: 'رم ۶۴ گیگابایت', quantity: 4, unitCost: 10000000, scrapPercentage: 0 }
      ]
    });

    // Seed raw material warehouse with: 5 chassis, 4 CPUs, 30 RAMs
    stockEngine.receiveGoods({
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      warehouse_id: 'wh_raw_mat',
      item_id: 'part_chassis',
      quantity: 5,
      unit_cost: 30000000
    });
    stockEngine.receiveGoods({
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      warehouse_id: 'wh_raw_mat',
      item_id: 'part_cpu',
      quantity: 4,
      unit_cost: 40000000
    });
    stockEngine.receiveGoods({
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      warehouse_id: 'wh_raw_mat',
      item_id: 'part_ram',
      quantity: 30,
      unit_cost: 10000000
    });

    // Plan to produce 5 servers:
    // Requires: 5 chassis (Have 5 -> Shortage 0)
    // Requires: 10 CPUs (Have 4 -> Shortage 6)
    // Requires: 20 RAMs (Have 30 -> Shortage 0)
    const mrp = mrpEngine.runMRP({
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      raw_material_warehouse_id: 'wh_raw_mat',
      finished_good_id: 'item_server_finished',
      planned_quantity: 5
    });

    assert.strictEqual(mrp.has_shortage, true);
    const cpuPlan = mrp.materials.find(m => m.itemId === 'part_cpu');
    assert.strictEqual(cpuPlan.gross_required, 10);
    assert.strictEqual(cpuPlan.on_hand, 4);
    assert.strictEqual(cpuPlan.shortage, 6);
    assert.strictEqual(cpuPlan.requires_procurement, true);
    assert.strictEqual(cpuPlan.estimated_shortage_cost, 240000000); // 6 * 40M
  });

  it('Executes full Work Order lifecycle: Release -> Issue Materials to WIP -> Complete Finished Goods', () => {
    // 1. Register BOM for Network Rack
    mrpEngine.registerBOM({
      id: 'bom_rack',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      bom_code: 'BOM-RCK-01',
      finished_good_id: 'prod_rack_assembled',
      finished_good_name: 'رک سرور مونتاژ شده',
      base_quantity: 1,
      components: [
        { itemId: 'raw_metal_sheet', itemName: 'ورق فولادی', quantity: 10, unitCost: 1000000, scrapPercentage: 0 },
        { itemId: 'raw_glass_door', itemName: 'درب شیشه‌ای سکوریت', quantity: 1, unitCost: 5000000, scrapPercentage: 0 }
      ],
      routings: [
        { operation: 'برشکاری و مونتاژ', standardHours: 2, hourlyRate: 500000, overheadRate: 500000 } // 2 * 1,000,000 = 2,000,000
      ]
    });
    // Standard cost = (10*1M + 1*5M) + 2M = 17,000,000 per rack

    // 2. Stock raw materials: 20 metal sheets, 2 glass doors (enough for 2 racks)
    stockEngine.receiveGoods({
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      warehouse_id: 'wh_raw',
      item_id: 'raw_metal_sheet',
      quantity: 20,
      unit_cost: 1000000
    });
    stockEngine.receiveGoods({
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      warehouse_id: 'wh_raw',
      item_id: 'raw_glass_door',
      quantity: 2,
      unit_cost: 5000000
    });

    // 3. Create Work Order for 2 units
    const wo = mrpEngine.createWorkOrder({
      id: 'wo_1405_01',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      work_order_number: 'WO-1405-001',
      finished_good_id: 'prod_rack_assembled',
      planned_quantity: 2,
      raw_materials_warehouse_id: 'wh_raw',
      finished_goods_warehouse_id: 'wh_fg',
      start_date: '1405/03/01',
      due_date: '1405/03/05'
    });
    assert.strictEqual(wo.status, 'released');

    // 4. Issue materials to production (leaves raw warehouse -> WIP)
    mrpEngine.issueMaterialsToProduction(wo.id);
    assert.strictEqual(wo.status, 'in_progress');

    // Verify raw warehouse on-hand is now 0
    const rawMetalBal = stockEngine.getBalance('ten_main', 'org_main', 'wh_raw', 'raw_metal_sheet');
    const rawGlassBal = stockEngine.getBalance('ten_main', 'org_main', 'wh_raw', 'raw_glass_door');
    assert.strictEqual(rawMetalBal.on_hand_quantity, 0);
    assert.strictEqual(rawGlassBal.on_hand_quantity, 0);

    // 5. Complete Production (receives 2 finished racks into finished goods warehouse)
    mrpEngine.completeProduction(wo.id, 2);
    assert.strictEqual(wo.status, 'completed');
    assert.strictEqual(wo.produced_quantity, 2);

    // Verify finished goods warehouse has 2 units @ 17,000,000 = 34,000,000
    const fgBal = stockEngine.getBalance('ten_main', 'org_main', 'wh_fg', 'prod_rack_assembled');
    assert.strictEqual(fgBal.on_hand_quantity, 2);
    assert.strictEqual(fgBal.average_cost, 17000000);
    assert.strictEqual(fgBal.total_valuation, 34000000);
  });
});
