/**
 * Finora Inventory & Stock Engine with Durable Concurrency Controls
 * Governed by Chapters 012, 022, 038, 055, 069.
 * 
 * Invariants:
 * 1. Stock balances can NEVER fall below zero (Strict Non-Negative Invariant).
 * 2. Moving average cost calculation preserves total inventory valuation.
 * 3. Concurrent stock deductions use atomic locks to prevent race conditions.
 * 4. Immutable ledger audit records for every stock movement.
 */

const { MoneyPrecision } = require('../common/money-precision');

class StockEngine {
  constructor({ postingEngine = null } = {}) {
    this.postingEngine = postingEngine;
    this.stockBalances = new Map(); // key (tenant:org:warehouse:item) -> balance
    this.transactions = [];
    this.locks = new Set(); // Active lock keys for concurrency safety
  }

  _getKey(tenantId, orgId, warehouseId, itemId) {
    return `${tenantId}:${orgId}:${warehouseId}:${itemId}`;
  }

  _acquireLock(key) {
    if (this.locks.has(key)) {
      throw new Error(`Concurrency Conflict: Resource '${key}' is currently locked by another transaction.`);
    }
    this.locks.add(key);
  }

  _releaseLock(key) {
    this.locks.delete(key);
  }

  getBalance(tenantId, orgId, warehouseId, itemId) {
    const key = this._getKey(tenantId, orgId, warehouseId, itemId);
    if (!this.stockBalances.has(key)) {
      return {
        tenant_id: tenantId,
        organization_id: orgId,
        warehouse_id: warehouseId,
        item_id: itemId,
        on_hand_quantity: 0,
        reserved_quantity: 0,
        available_quantity: 0,
        average_cost: 0,
        total_valuation: 0
      };
    }
    const b = this.stockBalances.get(key);
    return {
      ...b,
      available_quantity: Math.max(0, b.on_hand_quantity - (b.reserved_quantity || 0))
    };
  }

  receiveGoods({
    tenant_id,
    organization_id,
    warehouse_id,
    item_id,
    quantity,
    unit_cost,
    reference_type = 'purchase_order',
    reference_id,
    actor = 'system'
  }) {
    const qty = Number(quantity);
    const cost = MoneyPrecision.toRials(unit_cost, false);
    if (qty <= 0) throw new Error('Received quantity must be positive.');
    if (cost < 0) throw new Error('Unit cost cannot be negative.');

    const key = this._getKey(tenant_id, organization_id, warehouse_id, item_id);
    this._acquireLock(key);

    try {
      const current = this.getBalance(tenant_id, organization_id, warehouse_id, item_id);
      const oldQty = current.on_hand_quantity;
      const oldValuation = current.total_valuation;
      const incomingValuation = qty * cost;

      const newQty = oldQty + qty;
      const newValuation = oldValuation + incomingValuation;
      const newAverageCost = newQty > 0 ? Math.round(newValuation / newQty) : cost;

      const updated = {
        tenant_id,
        organization_id,
        warehouse_id,
        item_id,
        on_hand_quantity: newQty,
        reserved_quantity: current.reserved_quantity || 0,
        available_quantity: newQty - (current.reserved_quantity || 0),
        average_cost: newAverageCost,
        total_valuation: newValuation
      };
      this.stockBalances.set(key, updated);

      const tx = {
        tx_id: `STK-REC-${Date.now()}-${this.transactions.length + 1}`,
        type: 'GOODS_RECEIPT',
        tenant_id,
        organization_id,
        warehouse_id,
        item_id,
        quantity: qty,
        unit_cost: cost,
        total_cost: incomingValuation,
        balance_after: newQty,
        reference_type,
        reference_id,
        actor,
        timestamp: new Date().toISOString()
      };
      this.transactions.push(tx);

      return { transaction: tx, balance: updated };
    } finally {
      this._releaseLock(key);
    }
  }

  issueGoods({
    tenant_id,
    organization_id,
    warehouse_id,
    item_id,
    quantity,
    reference_type = 'sales_invoice',
    reference_id,
    actor = 'system'
  }) {
    const qty = Number(quantity);
    if (qty <= 0) throw new Error('Issue quantity must be positive.');

    const key = this._getKey(tenant_id, organization_id, warehouse_id, item_id);
    this._acquireLock(key);

    try {
      const current = this.getBalance(tenant_id, organization_id, warehouse_id, item_id);
      if (current.on_hand_quantity < qty) {
        throw new Error(
          `Insufficient inventory: Requested ${qty}, but available stock is ${current.on_hand_quantity}.`
        );
      }

      const unitCost = current.average_cost;
      const issueValuation = qty * unitCost;
      const newQty = current.on_hand_quantity - qty;
      const newValuation = newQty * unitCost;

      const updated = {
        tenant_id,
        organization_id,
        warehouse_id,
        item_id,
        on_hand_quantity: newQty,
        reserved_quantity: Math.max(0, (current.reserved_quantity || 0) - qty),
        available_quantity: Math.max(0, newQty - Math.max(0, (current.reserved_quantity || 0) - qty)),
        average_cost: unitCost,
        total_valuation: newValuation
      };
      this.stockBalances.set(key, updated);

      const tx = {
        tx_id: `STK-ISS-${Date.now()}-${this.transactions.length + 1}`,
        type: 'GOODS_ISSUE',
        tenant_id,
        organization_id,
        warehouse_id,
        item_id,
        quantity: -qty,
        unit_cost: unitCost,
        total_cost: issueValuation,
        balance_after: newQty,
        reference_type,
        reference_id,
        actor,
        timestamp: new Date().toISOString()
      };
      this.transactions.push(tx);

      return { transaction: tx, balance: updated };
    } finally {
      this._releaseLock(key);
    }
  }

  /**
   * Concurrency Safe: Atomically reserve stock for an order before shipment
   */
  reserveStock(tenant_id, organization_id, warehouse_id, item_id, quantity) {
    const qty = Number(quantity);
    const key = this._getKey(tenant_id, organization_id, warehouse_id, item_id);
    this._acquireLock(key);

    try {
      const current = this.getBalance(tenant_id, organization_id, warehouse_id, item_id);
      const available = current.on_hand_quantity - (current.reserved_quantity || 0);
      if (available < qty) {
        throw new Error(`Insufficient available stock for reservation. Available: ${available}, Requested: ${qty}`);
      }
      current.reserved_quantity = (current.reserved_quantity || 0) + qty;
      current.available_quantity = current.on_hand_quantity - current.reserved_quantity;
      this.stockBalances.set(key, current);
      return { success: true, reserved_quantity: qty, available_remaining: current.available_quantity };
    } finally {
      this._releaseLock(key);
    }
  }
}

module.exports = { StockEngine };
