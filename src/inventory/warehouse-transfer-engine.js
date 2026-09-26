/**
 * Finora Multi-Location Warehouse, Stock Transfer & Batch/Serial Engine
 * Governed by Chapters 012, 038, 055, 069, 095, 118, 145, 171.
 * 
 * Features:
 * 1. Multi-Warehouse Registry (کد انبار، نام، نوع انبار، ظرفیت).
 * 2. In-Transit Warehouse (انبار مجازی کالای در راه).
 * 3. Batch / Lot Number Tracking with Expiration Dates (کد بهر و انقضا).
 * 4. Unique Serial Number Tracking (ردیابی سریال فیزیکی قطعات).
 * 5. Inter-Warehouse Transfer Lifecycle:
 *    request -> dispatch (leaves source -> enters in-transit) -> receive (enters destination)
 * 6. Automated Reorder Point & Safety Stock Alerts.
 */

class WarehouseTransferEngine {
  constructor({ stockEngine = null, postingEngine = null }) {
    this.stockEngine = stockEngine;
    this.postingEngine = postingEngine;
    this.warehouses = new Map(); // id -> Warehouse
    this.serials = new Map(); // `${tenantId}:${itemId}:${serialNumber}` -> SerialRecord
    this.batches = new Map(); // `${tenantId}:${itemId}:${batchNumber}` -> BatchRecord
    this.transfers = new Map(); // id -> TransferDocument
  }

  registerWarehouse({
    id,
    tenant_id,
    organization_id,
    code,
    name,
    type = 'physical', // physical, in_transit, quarantine, scrap
    location = '',
    manager = ''
  }) {
    const wh = {
      id,
      tenant_id,
      organization_id,
      code,
      name,
      type,
      location,
      manager,
      active: true
    };
    this.warehouses.set(id, wh);
    return wh;
  }

  registerBatch({
    tenant_id,
    organization_id,
    item_id,
    batch_number,
    manufacture_date,
    expiry_date,
    quantity = 0
  }) {
    const key = `${tenant_id}:${item_id}:${batch_number}`;
    const batch = {
      key,
      tenant_id,
      organization_id,
      item_id,
      batch_number,
      manufacture_date,
      expiry_date,
      quantity: Number(quantity),
      active: true
    };
    this.batches.set(key, batch);
    return batch;
  }

  registerSerial({
    tenant_id,
    organization_id,
    warehouse_id,
    item_id,
    serial_number,
    warranty_months = 12
  }) {
    const key = `${tenant_id}:${item_id}:${serial_number}`;
    if (this.serials.has(key)) {
      throw new Error(`Serial number '${serial_number}' already exists for item '${item_id}'.`);
    }

    const serial = {
      key,
      tenant_id,
      organization_id,
      warehouse_id,
      item_id,
      serial_number,
      warranty_months,
      status: 'in_stock', // in_stock, in_transit, delivered, damaged
      history: [{
        action: 'registered',
        warehouse_id,
        timestamp: new Date().toISOString()
      }]
    };
    this.serials.set(key, serial);
    return serial;
  }

  /**
   * Request an Inter-Warehouse Transfer (درخواست انتقال بین انبارها)
   */
  requestTransfer({
    id,
    tenant_id,
    organization_id,
    transfer_number,
    source_warehouse_id,
    destination_warehouse_id,
    items = [], // [{ itemId, quantity, serials: [], batch_number }]
    reason = '',
    requester = 'warehouse_officer'
  }) {
    if (source_warehouse_id === destination_warehouse_id) {
      throw new Error('Source and destination warehouses cannot be the same.');
    }

    const srcWh = this.warehouses.get(source_warehouse_id);
    const dstWh = this.warehouses.get(destination_warehouse_id);
    if (!srcWh) throw new Error(`Source warehouse '${source_warehouse_id}' not found.`);
    if (!dstWh) throw new Error(`Destination warehouse '${destination_warehouse_id}' not found.`);

    // Verify stock availability in source warehouse
    if (this.stockEngine) {
      for (const item of items) {
        const bal = this.stockEngine.getBalance(tenant_id, organization_id, source_warehouse_id, item.itemId);
        if (bal.on_hand_quantity < item.quantity) {
          throw new Error(
            `Insufficient stock in source warehouse '${srcWh.name}'. Requested: ${item.quantity}, Available: ${bal.on_hand_quantity}`
          );
        }
      }
    }

    const transfer = {
      id,
      tenant_id,
      organization_id,
      transfer_number,
      source_warehouse_id,
      destination_warehouse_id,
      items,
      reason,
      requester,
      status: 'requested', // requested, dispatched (in_transit), received, cancelled
      created_at: new Date().toISOString(),
      history: [{
        status: 'requested',
        actor: requester,
        timestamp: new Date().toISOString()
      }]
    };

    this.transfers.set(id, transfer);
    return transfer;
  }

  /**
   * Dispatch Transfer Out (خروج کالا از انبار مبدأ و انتقال به کالای در راه)
   */
  dispatchTransfer(transferId, inTransitWarehouseId = 'wh_in_transit', actor = 'warehouse_manager') {
    const transfer = this.transfers.get(transferId);
    if (!transfer) throw new Error(`Transfer '${transferId}' not found.`);
    if (transfer.status !== 'requested') {
      throw new Error(`Cannot dispatch transfer with status '${transfer.status}'. Must be 'requested'.`);
    }

    // 1. Move stock from source to in_transit
    if (this.stockEngine) {
      for (const item of transfer.items) {
        // Issue from source warehouse
        const issueRes = this.stockEngine.issueGoods({
          tenant_id: transfer.tenant_id,
          organization_id: transfer.organization_id,
          warehouse_id: transfer.source_warehouse_id,
          item_id: item.itemId,
          quantity: item.quantity,
          reference_id: `XFER-OUT-${transfer.transfer_number}`
        });

        // Receive into in-transit warehouse
        this.stockEngine.receiveGoods({
          tenant_id: transfer.tenant_id,
          organization_id: transfer.organization_id,
          warehouse_id: inTransitWarehouseId,
          item_id: item.itemId,
          quantity: item.quantity,
          unit_cost: issueRes.transaction.unit_cost,
          reference_id: `XFER-TRANSIT-${transfer.transfer_number}`
        });

        item.dispatched_unit_cost = issueRes.transaction.unit_cost;
      }
    }

    // 2. Update Serials status to in_transit
    for (const item of transfer.items) {
      if (Array.isArray(item.serials)) {
        for (const sn of item.serials) {
          const key = `${transfer.tenant_id}:${item.itemId}:${sn}`;
          const serialObj = this.serials.get(key);
          if (serialObj) {
            serialObj.status = 'in_transit';
            serialObj.warehouse_id = inTransitWarehouseId;
            serialObj.history.push({
              action: 'dispatched_in_transit',
              transferId,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    }

    transfer.status = 'dispatched';
    transfer.in_transit_warehouse_id = inTransitWarehouseId;
    transfer.dispatched_at = new Date().toISOString();
    transfer.history.push({
      status: 'dispatched',
      actor,
      timestamp: transfer.dispatched_at
    });

    return transfer;
  }

  /**
   * Receive Transfer at Destination Warehouse (ورود کالا به انبار مقصد)
   */
  receiveTransfer(transferId, actor = 'dest_warehouse_officer') {
    const transfer = this.transfers.get(transferId);
    if (!transfer) throw new Error(`Transfer '${transferId}' not found.`);
    if (transfer.status !== 'dispatched') {
      throw new Error(`Cannot receive transfer with status '${transfer.status}'. Must be 'dispatched'.`);
    }

    // 1. Move stock from in_transit to destination warehouse
    if (this.stockEngine) {
      for (const item of transfer.items) {
        // Issue from in_transit
        const transitIssue = this.stockEngine.issueGoods({
          tenant_id: transfer.tenant_id,
          organization_id: transfer.organization_id,
          warehouse_id: transfer.in_transit_warehouse_id,
          item_id: item.itemId,
          quantity: item.quantity,
          reference_id: `XFER-IN-ISSUE-${transfer.transfer_number}`
        });

        // Receive in destination warehouse
        this.stockEngine.receiveGoods({
          tenant_id: transfer.tenant_id,
          organization_id: transfer.organization_id,
          warehouse_id: transfer.destination_warehouse_id,
          item_id: item.itemId,
          quantity: item.quantity,
          unit_cost: transitIssue.transaction.unit_cost,
          reference_id: `XFER-IN-${transfer.transfer_number}`
        });
      }
    }

    // 2. Update Serials to destination warehouse
    for (const item of transfer.items) {
      if (Array.isArray(item.serials)) {
        for (const sn of item.serials) {
          const key = `${transfer.tenant_id}:${item.itemId}:${sn}`;
          const serialObj = this.serials.get(key);
          if (serialObj) {
            serialObj.status = 'in_stock';
            serialObj.warehouse_id = transfer.destination_warehouse_id;
            serialObj.history.push({
              action: 'received_at_destination',
              warehouse_id: transfer.destination_warehouse_id,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    }

    transfer.status = 'received';
    transfer.received_at = new Date().toISOString();
    transfer.history.push({
      status: 'received',
      actor,
      timestamp: transfer.received_at
    });

    return transfer;
  }

  /**
   * Evaluate Reorder Points across items and generate restocking alerts
   */
  evaluateReorderAlerts(tenantId, organizationId, catalogItems = [], reorderRules = {}) {
    const alerts = [];

    for (const item of catalogItems) {
      const rule = reorderRules[item.id] || { minStock: 5, reorderPoint: 10, targetStock: 25 };
      let totalOnHand = 0;

      if (this.stockEngine) {
        for (const wh of this.warehouses.values()) {
          if (wh.tenant_id === tenantId && wh.organization_id === organizationId && wh.type === 'physical') {
            const bal = this.stockEngine.getBalance(tenantId, organizationId, wh.id, item.id);
            totalOnHand += bal.on_hand_quantity;
          }
        }
      }

      if (totalOnHand <= rule.reorderPoint) {
        alerts.push({
          itemId: item.id,
          itemName: item.name,
          current_stock: totalOnHand,
          min_stock: rule.minStock,
          reorder_point: rule.reorderPoint,
          suggested_order_qty: Math.max(0, rule.targetStock - totalOnHand),
          urgency: totalOnHand <= rule.minStock ? 'CRITICAL' : 'WARNING'
        });
      }
    }

    return alerts;
  }
}

module.exports = { WarehouseTransferEngine };
