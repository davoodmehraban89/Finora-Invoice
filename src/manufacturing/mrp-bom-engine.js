/**
 * Finora Manufacturing, BOM, MRP & Standard Costing Engine
 * Governed by Chapters 070, 103, 128, 153, 180.
 * 
 * Features:
 * 1. Multi-level Bill of Materials (BOM / درخت محصول).
 * 2. Standard Cost Rollup (مواد مستقیم + دستمزد مستقیم + سربار ساخت).
 * 3. Material Requirements Planning (MRP) with scrap/loss factors.
 * 4. Work Order Lifecycle (Draft -> Released -> In-Progress -> Completed).
 * 5. Automated WIP & Finished Goods Inventory movements.
 */

class MrpBomEngine {
  constructor({ stockEngine = null, postingEngine = null }) {
    this.stockEngine = stockEngine;
    this.postingEngine = postingEngine;
    this.boms = new Map(); // finished_good_id -> BOM
    this.workOrders = new Map(); // id -> WorkOrder
  }

  /**
   * Register a Bill of Materials (BOM)
   */
  registerBOM({
    id,
    tenant_id,
    organization_id,
    bom_code,
    finished_good_id,
    finished_good_name,
    base_quantity = 1,
    unit = 'EA',
    components = [], // [{ itemId, itemName, quantity, unitCost, scrapPercentage: 0 }]
    routings = [] // [{ operation, standardHours, hourlyRate, overheadRate }]
  }) {
    const baseQty = Number(base_quantity) || 1;
    let totalMaterialCost = 0;
    let totalLaborCost = 0;
    let totalOverheadCost = 0;

    const validatedComponents = components.map(c => {
      const q = Number(c.quantity);
      const uCost = Number(c.unitCost) || 0;
      const scrap = Number(c.scrapPercentage) || 0;
      const effectiveQty = q * (1 + scrap / 100);
      const lineCost = effectiveQty * uCost;
      totalMaterialCost += lineCost;

      return {
        itemId: c.itemId,
        itemName: c.itemName,
        quantity: q,
        scrapPercentage: scrap,
        effectiveQuantity: effectiveQty,
        unitCost: uCost,
        lineCost
      };
    });

    const validatedRoutings = routings.map(r => {
      const hours = Number(r.standardHours) || 0;
      const laborRate = Number(r.hourlyRate) || 0;
      const ohRate = Number(r.overheadRate) || 0;

      const laborCost = hours * laborRate;
      const ohCost = hours * ohRate;
      totalLaborCost += laborCost;
      totalOverheadCost += ohCost;

      return {
        operation: r.operation,
        standardHours: hours,
        hourlyRate: laborRate,
        overheadRate: ohRate,
        laborCost,
        overheadCost: ohCost
      };
    });

    const unitMaterialCost = totalMaterialCost / baseQty;
    const unitLaborCost = totalLaborCost / baseQty;
    const unitOverheadCost = totalOverheadCost / baseQty;
    const unitStandardCost = unitMaterialCost + unitLaborCost + unitOverheadCost;

    const bom = {
      id,
      tenant_id,
      organization_id,
      bom_code,
      finished_good_id,
      finished_good_name,
      base_quantity: baseQty,
      unit,
      components: validatedComponents,
      routings: validatedRoutings,
      cost_breakdown: {
        total_material_cost: totalMaterialCost,
        total_labor_cost: totalLaborCost,
        total_overhead_cost: totalOverheadCost,
        unit_standard_cost: unitStandardCost,
        unit_material_cost: unitMaterialCost,
        unit_labor_cost: unitLaborCost,
        unit_overhead_cost: unitOverheadCost
      },
      created_at: new Date().toISOString()
    };

    this.boms.set(finished_good_id, bom);
    return bom;
  }

  getBOM(finishedGoodId) {
    return this.boms.get(finishedGoodId);
  }

  /**
   * Run Material Requirements Planning (MRP) for a target production quantity
   */
  runMRP({
    tenant_id,
    organization_id,
    raw_material_warehouse_id,
    finished_good_id,
    planned_quantity
  }) {
    const bom = this.boms.get(finished_good_id);
    if (!bom) throw new Error(`BOM for finished good '${finished_good_id}' not found.`);

    const targetQty = Number(planned_quantity);
    if (targetQty <= 0) throw new Error('Planned production quantity must be positive.');

    const multiplier = targetQty / bom.base_quantity;
    const materialPlan = [];
    let hasShortage = false;

    for (const comp of bom.components) {
      const grossRequired = comp.effectiveQuantity * multiplier;
      let onHand = 0;

      if (this.stockEngine && raw_material_warehouse_id) {
        const bal = this.stockEngine.getBalance(tenant_id, organization_id, raw_material_warehouse_id, comp.itemId);
        onHand = bal.on_hand_quantity;
      }

      const shortage = Math.max(0, grossRequired - onHand);
      if (shortage > 0) hasShortage = true;

      materialPlan.push({
        itemId: comp.itemId,
        itemName: comp.itemName,
        unitCost: comp.unitCost,
        gross_required: grossRequired,
        on_hand: onHand,
        shortage,
        requires_procurement: shortage > 0,
        estimated_shortage_cost: shortage * comp.unitCost
      });
    }

    return {
      finished_good_id,
      finished_good_name: bom.finished_good_name,
      planned_quantity: targetQty,
      has_shortage: hasShortage,
      materials: materialPlan,
      estimated_total_material_cost: materialPlan.reduce((acc, m) => acc + (m.gross_required * m.unitCost), 0)
    };
  }

  /**
   * Create and execute a Work Order (دستور ساخت)
   */
  createWorkOrder({
    id,
    tenant_id,
    organization_id,
    work_order_number,
    finished_good_id,
    planned_quantity,
    raw_materials_warehouse_id,
    finished_goods_warehouse_id,
    start_date,
    due_date
  }) {
    const bom = this.boms.get(finished_good_id);
    if (!bom) throw new Error(`BOM for finished good '${finished_good_id}' not found.`);

    const qty = Number(planned_quantity);
    const multiplier = qty / bom.base_quantity;

    const requiredMaterials = bom.components.map(c => ({
      itemId: c.itemId,
      itemName: c.itemName,
      required_quantity: c.effectiveQuantity * multiplier,
      unitCost: c.unitCost,
      issued: false
    }));

    const workOrder = {
      id,
      tenant_id,
      organization_id,
      work_order_number,
      finished_good_id,
      finished_good_name: bom.finished_good_name,
      planned_quantity: qty,
      produced_quantity: 0,
      unit_standard_cost: bom.cost_breakdown.unit_standard_cost,
      raw_materials_warehouse_id,
      finished_goods_warehouse_id,
      start_date,
      due_date,
      status: 'released', // released, in_progress, completed, cancelled
      materials: requiredMaterials,
      history: [{
        status: 'released',
        timestamp: new Date().toISOString()
      }]
    };

    this.workOrders.set(id, workOrder);
    return workOrder;
  }

  /**
   * Issue raw materials to production floor (کالای در جریان ساخت - WIP)
   */
  issueMaterialsToProduction(workOrderId, actor = 'production_manager') {
    const wo = this.workOrders.get(workOrderId);
    if (!wo) throw new Error(`Work order '${workOrderId}' not found.`);
    if (wo.status !== 'released') {
      throw new Error(`Cannot issue materials for work order in status '${wo.status}'.`);
    }

    let totalIssuedCost = 0;

    if (this.stockEngine) {
      for (const mat of wo.materials) {
        const issueRes = this.stockEngine.issueGoods({
          tenant_id: wo.tenant_id,
          organization_id: wo.organization_id,
          warehouse_id: wo.raw_materials_warehouse_id,
          item_id: mat.itemId,
          quantity: mat.required_quantity,
          reference_type: 'work_order_wip',
          reference_id: wo.work_order_number,
          actor
        });

        const actualUnitCost = issueRes.transaction.unit_cost || mat.unitCost;
        mat.issued = true;
        mat.actual_issued_cost = mat.required_quantity * actualUnitCost;
        totalIssuedCost += mat.actual_issued_cost;
      }
    }

    wo.status = 'in_progress';
    wo.total_wip_materials_cost = totalIssuedCost;
    wo.history.push({
      status: 'in_progress',
      actor,
      timestamp: new Date().toISOString(),
      note: `Issued raw materials to WIP floor totaling ${totalIssuedCost}`
    });

    return wo;
  }

  /**
   * Complete Work Order and receive Finished Goods into warehouse
   */
  completeProduction(workOrderId, actualProducedQty = null, actor = 'production_manager') {
    const wo = this.workOrders.get(workOrderId);
    if (!wo) throw new Error(`Work order '${workOrderId}' not found.`);
    if (wo.status !== 'in_progress') {
      throw new Error(`Cannot complete work order in status '${wo.status}'. Must be 'in_progress'.`);
    }

    const prodQty = actualProducedQty !== null ? Number(actualProducedQty) : wo.planned_quantity;
    if (prodQty <= 0) throw new Error('Completed production quantity must be positive.');

    wo.produced_quantity = prodQty;
    wo.status = 'completed';

    const unitCost = wo.unit_standard_cost;

    // Receive Finished Goods into Finished Goods Warehouse
    if (this.stockEngine) {
      this.stockEngine.receiveGoods({
        tenant_id: wo.tenant_id,
        organization_id: wo.organization_id,
        warehouse_id: wo.finished_goods_warehouse_id,
        item_id: wo.finished_good_id,
        quantity: prodQty,
        unit_cost: unitCost,
        reference_type: 'production_receipt',
        reference_id: wo.work_order_number,
        actor
      });
    }

    wo.history.push({
      status: 'completed',
      actor,
      timestamp: new Date().toISOString(),
      note: `Completed production of ${prodQty} units of ${wo.finished_good_name}`
    });

    return wo;
  }
}

module.exports = { MrpBomEngine };
