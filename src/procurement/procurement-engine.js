/**
 * Finora Procurement, Purchase Orders & Three-Way Matching Engine
 * Governed strictly by Chapters 023, 037, 051, 068, 094, 117, 144, 170, 242, 252.
 * 
 * Features:
 * - Purchase Requests, RFQs, Supplier Quotations, and Purchase Orders
 * - Goods Receipts with Warehouse & Moving Average Cost Integration
 * - Three-Way Matching Engine (PO vs GR vs Supplier Invoice)
 * - Anti-Duplicate Billing Guard: Tracks cumulative invoiced quantities
 * - Controlled Weighbridge Quantity Tolerance (e.g. ±1-2% for bulk commodities)
 * - Partial Invoicing, Invoice Cancellation, and Reversal Workflows
 */

const { MoneyPrecision } = require('../common/money-precision');

class ProcurementEngine {
  constructor({ postingEngine = null, stockEngine = null, taxEngine = null } = {}) {
    this.postingEngine = postingEngine;
    this.stockEngine = stockEngine;
    this.taxEngine = taxEngine;

    this.purchaseRequests = new Map(); // id -> PurchaseRequest
    this.rfqs = new Map(); // id -> RFQ
    this.purchaseOrders = new Map(); // id -> PurchaseOrder
    this.goodsReceipts = new Map(); // id -> GoodsReceipt
    this.supplierInvoices = new Map(); // id -> SupplierInvoice
    this.matchRecords = new Map(); // invoice_id -> MatchResult
    this.matchLocks = new Set(); // Concurrency locks on POs during matching/approval
  }

  // 1. Purchase Request Management
  createPurchaseRequest({
    id,
    tenant_id,
    organization_id,
    request_number,
    requester,
    department,
    priority = 'normal',
    items = [],
    reason = ''
  }) {
    if (!id || !tenant_id || !organization_id || !request_number || items.length === 0) {
      throw new Error('Missing mandatory parameters for purchase request.');
    }

    const pr = {
      id,
      tenant_id,
      organization_id,
      request_number,
      requester,
      department,
      priority,
      items: items.map((it, idx) => ({
        line_number: idx + 1,
        item_id: it.itemId,
        name: it.name,
        quantity: Number(it.quantity) || 1,
        estimated_price: MoneyPrecision.toRials(it.estimatedPrice, false),
        required_date: it.requiredDate || new Date().toISOString().split('T')[0]
      })),
      reason,
      status: 'pending_approval',
      created_at: new Date().toISOString()
    };

    this.purchaseRequests.set(id, pr);
    return pr;
  }

  approvePurchaseRequest(requestId, actor = 'purchasing_manager') {
    const pr = this.purchaseRequests.get(requestId);
    if (!pr) throw new Error(`Purchase Request '${requestId}' not found.`);
    pr.status = 'approved';
    pr.approved_by = actor;
    pr.approved_at = new Date().toISOString();
    return pr;
  }

  // 2. Request For Quotation (RFQ)
  createRFQ({
    id,
    tenant_id,
    organization_id,
    rfq_number,
    purchase_request_id,
    invited_suppliers = [],
    deadline_date
  }) {
    const pr = this.purchaseRequests.get(purchase_request_id);
    if (!pr) throw new Error(`Purchase Request '${purchase_request_id}' not found.`);

    const rfq = {
      id,
      tenant_id,
      organization_id,
      rfq_number,
      purchase_request_id,
      items: pr.items,
      invited_suppliers,
      quotes: [],
      deadline_date,
      status: 'open',
      created_at: new Date().toISOString()
    };

    this.rfqs.set(id, rfq);
    return rfq;
  }

  submitSupplierQuote(rfqId, {
    supplier_id,
    supplier_name,
    item_quotes,
    delivery_days = 7,
    payment_terms = 'net_30',
    supplier_rating = 90
  }) {
    const rfq = this.rfqs.get(rfqId);
    if (!rfq) throw new Error(`RFQ '${rfqId}' not found.`);

    let totalQuoteAmount = 0;
    const quotesMapped = {};

    item_quotes.forEach(iq => {
      const price = MoneyPrecision.toRials(iq.unitPrice, false);
      quotesMapped[iq.itemId] = price;
      const prItem = rfq.items.find(it => it.item_id === iq.itemId);
      const qty = prItem ? prItem.quantity : 1;
      totalQuoteAmount += qty * price;
    });

    const quote = {
      quote_id: `QUO-${supplier_id}-${Date.now()}`,
      supplier_id,
      supplier_name,
      item_quotes: quotesMapped,
      total_quote_amount: totalQuoteAmount,
      delivery_days: Number(delivery_days),
      payment_terms,
      supplier_rating: Number(supplier_rating),
      submitted_at: new Date().toISOString()
    };

    rfq.quotes.push(quote);
    return quote;
  }

  // 3. Purchase Order Management
  createPurchaseOrder({
    id,
    tenant_id,
    organization_id,
    po_number,
    supplier,
    delivery_date,
    items = [],
    item_tolerances = {}, // itemId -> quantity tolerance percentage (e.g. 2 for ±2% weighbridge tolerance)
    payment_terms = 'net_30',
    actor = 'purchasing_agent'
  }) {
    if (!id || !tenant_id || !organization_id || !po_number || !supplier || items.length === 0) {
      throw new Error('Missing mandatory parameters for purchase order.');
    }

    let grossTotal = 0;
    let taxTotal = 0;

    const lines = items.map((it, idx) => {
      const qty = Number(it.quantity) || 1;
      const price = MoneyPrecision.toRials(it.unitPrice, false);
      const gross = qty * price;
      const rate = it.taxRate !== undefined ? Number(it.taxRate) : 0.10;
      const tax = MoneyPrecision.multiplyRate(gross, rate);
      const total = gross + tax;

      grossTotal += gross;
      taxTotal += tax;

      return {
        line_number: idx + 1,
        item_id: it.itemId,
        name: it.name,
        ordered_quantity: qty,
        unit_price: price,
        gross_amount: gross,
        tax_rate: rate,
        tax_amount: tax,
        total_amount: total
      };
    });

    const po = {
      id,
      tenant_id,
      organization_id,
      po_number,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      supplier_national_id: supplier.national_id,
      supplier_economic_code: supplier.economic_code,
      delivery_date,
      payment_terms,
      items: lines,
      item_tolerances, // Configurable weighbridge tolerance
      total_gross_amount: grossTotal,
      total_tax_amount: taxTotal,
      total_final_amount: grossTotal + taxTotal,
      status: 'approved',
      received_items: {}, // itemId -> total received quantity
      invoiced_items: {}, // itemId -> total billed/invoiced quantity
      created_by: actor,
      created_at: new Date().toISOString()
    };

    this.purchaseOrders.set(id, po);
    return po;
  }

  // 4. Goods Receipt
  recordGoodsReceipt({
    id,
    tenant_id,
    organization_id,
    po_id,
    warehouse_id = 'wh_central',
    items = [],
    actor = 'warehouse_officer'
  }) {
    const po = this.purchaseOrders.get(po_id);
    if (!po) throw new Error(`Purchase Order '${po_id}' not found.`);

    const receiptLines = [];

    items.forEach(it => {
      const poLine = po.items.find(l => l.item_id === it.itemId);
      if (!poLine) throw new Error(`Item '${it.itemId}' was not ordered in PO '${po_id}'.`);

      const qty = Number(it.receivedQuantity);
      if (qty <= 0) throw new Error('Received quantity must be positive.');

      po.received_items[it.itemId] = (po.received_items[it.itemId] || 0) + qty;

      receiptLines.push({
        item_id: it.itemId,
        name: poLine.name,
        received_quantity: qty,
        unit_price: poLine.unit_price,
        total_value: qty * poLine.unit_price
      });

      if (this.stockEngine) {
        this.stockEngine.receiveGoods({
          tenant_id,
          organization_id,
          warehouse_id,
          item_id: it.itemId,
          quantity: qty,
          unit_cost: poLine.unit_price,
          reference_type: 'purchase_order',
          reference_id: po.po_number,
          actor
        });
      }
    });

    const gr = {
      id,
      tenant_id,
      organization_id,
      po_id,
      po_number: po.po_number,
      warehouse_id,
      items: receiptLines,
      received_at: new Date().toISOString(),
      received_by: actor
    };

    this.goodsReceipts.set(id, gr);
    return gr;
  }

  // 5. Submit Supplier Invoice
  submitSupplierInvoice({
    id,
    tenant_id,
    organization_id,
    invoice_number,
    po_id,
    invoice_date = new Date().toISOString().split('T')[0],
    items = [],
    actor = 'accounts_payable'
  }) {
    const po = this.purchaseOrders.get(po_id);
    if (!po) throw new Error(`Purchase Order '${po_id}' not found.`);

    let gross = 0;
    let tax = 0;

    const lines = items.map((it, idx) => {
      const qty = Number(it.billedQuantity);
      const price = MoneyPrecision.toRials(it.billedUnitPrice, false);
      const lineGross = qty * price;
      const lineTax = MoneyPrecision.multiplyRate(lineGross, 0.10);
      const lineTotal = lineGross + lineTax;

      gross += lineGross;
      tax += lineTax;

      return {
        line_number: idx + 1,
        item_id: it.itemId,
        billed_quantity: qty,
        billed_unit_price: price,
        gross_amount: lineGross,
        tax_amount: lineTax,
        total_amount: lineTotal
      };
    });

    const pi = {
      id,
      tenant_id,
      organization_id,
      invoice_number,
      po_id,
      po_number: po.po_number,
      supplier_id: po.supplier_id,
      supplier_name: po.supplier_name,
      invoice_date,
      items: lines,
      total_gross_amount: gross,
      total_tax_amount: tax,
      total_final_amount: gross + tax,
      status: 'pending_match',
      journal_id: null,
      created_at: new Date().toISOString()
    };

    this.supplierInvoices.set(id, pi);
    return pi;
  }

  // 6. Three-Way Matching with Anti-Duplicate Billing & Weighbridge Tolerance
  executeThreeWayMatch(supplierInvoiceId, options = {}) {
    const tolerancePricePercent = options.tolerancePricePercent || 0;
    const defaultToleranceQtyPercent = options.toleranceQuantityPercent || 0;

    const pi = this.supplierInvoices.get(supplierInvoiceId);
    if (!pi) throw new Error(`Supplier Invoice '${supplierInvoiceId}' not found.`);

    const po = this.purchaseOrders.get(pi.po_id);
    if (!po) throw new Error(`Linked Purchase Order '${pi.po_id}' not found.`);

    const discrepancies = [];
    const matchedLines = [];

    for (const billedLine of pi.items) {
      const poLine = po.items.find(l => l.item_id === billedLine.item_id);
      if (!poLine) {
        discrepancies.push({
          type: 'ITEM_NOT_ORDERED',
          item_id: billedLine.item_id,
          message: `Item ${billedLine.item_id} on invoice was not ordered in PO ${po.po_number}.`
        });
        continue;
      }

      const receivedQty = po.received_items[billedLine.item_id] || 0;
      const previouslyInvoicedQty = po.invoiced_items[billedLine.item_id] || 0;
      const remainingDeliverable = Math.max(0, receivedQty - previouslyInvoicedQty);

      // Controlled weighbridge quantity tolerance (capped at max 5% to prevent uncontrolled overbilling)
      const configuredItemTolerance = po.item_tolerances && po.item_tolerances[billedLine.item_id] !== undefined
        ? Number(po.item_tolerances[billedLine.item_id])
        : defaultToleranceQtyPercent;
      const allowedTolerancePercent = Math.min(5.0, Math.max(0, configuredItemTolerance));
      const maxAllowedBilledQty = remainingDeliverable * (1 + allowedTolerancePercent / 100);

      if (receivedQty === 0) {
        discrepancies.push({
          type: 'UNRECEIVED_GOODS',
          item_id: billedLine.item_id,
          ordered_qty: poLine.ordered_quantity,
          received_qty: 0,
          billed_qty: billedLine.billed_quantity,
          message: `Goods not yet received in warehouse for item '${poLine.name}'. Billed: ${billedLine.billed_quantity}, Received: 0.`
        });
      } else if (previouslyInvoicedQty >= receivedQty && billedLine.billed_quantity > 0) {
        // DEFECT 03: DUPLICATE BILLING
        discrepancies.push({
          type: 'DUPLICATE_BILLING',
          item_id: billedLine.item_id,
          received_qty: receivedQty,
          previously_invoiced_qty: previouslyInvoicedQty,
          billed_qty: billedLine.billed_quantity,
          message: `Duplicate billing detected: Item '${poLine.name}' has already been fully billed (Received: ${receivedQty}, Previously Billed: ${previouslyInvoicedQty}).`
        });
      } else if (billedLine.billed_quantity > maxAllowedBilledQty) {
        discrepancies.push({
          type: 'QUANTITY_MISMATCH',
          item_id: billedLine.item_id,
          ordered_qty: poLine.ordered_quantity,
          received_qty: receivedQty,
          previously_invoiced_qty: previouslyInvoicedQty,
          remaining_unbilled: remainingDeliverable,
          billed_qty: billedLine.billed_quantity,
          tolerance_percent: allowedTolerancePercent,
          message: `Billed quantity (${billedLine.billed_quantity}) exceeds permitted deliverable balance (${remainingDeliverable}) with ${allowedTolerancePercent}% tolerance for item '${poLine.name}'.`
        });
      }

      // Check Price Variance
      const priceDiffPercent = ((billedLine.billed_unit_price - poLine.unit_price) / poLine.unit_price) * 100;
      if (priceDiffPercent > tolerancePricePercent) {
        discrepancies.push({
          type: 'PRICE_MISMATCH',
          item_id: billedLine.item_id,
          agreed_unit_price: poLine.unit_price,
          billed_unit_price: billedLine.billed_unit_price,
          variance_percent: priceDiffPercent.toFixed(2),
          message: `Billed price (${billedLine.billed_unit_price}) is higher than agreed PO unit price (${poLine.unit_price}) for item '${poLine.name}'.`
        });
      }

      matchedLines.push({
        item_id: billedLine.item_id,
        name: poLine.name,
        ordered_qty: poLine.ordered_quantity,
        received_qty: receivedQty,
        previously_invoiced_qty: previouslyInvoicedQty,
        billed_qty: billedLine.billed_quantity,
        agreed_price: poLine.unit_price,
        billed_price: billedLine.billed_unit_price,
        is_line_matched: discrepancies.length === 0
      });
    }

    const isMatchSuccess = discrepancies.length === 0;
    const matchResult = {
      invoice_id: pi.id,
      po_id: po.id,
      is_matched: isMatchSuccess,
      status: isMatchSuccess ? 'MATCHED' : 'MISMATCH_DETECTED',
      discrepancies_count: discrepancies.length,
      discrepancies,
      lines: matchedLines,
      evaluated_at: new Date().toISOString()
    };

    pi.status = isMatchSuccess ? 'matched' : 'mismatch_rejected';
    this.matchRecords.set(pi.id, matchResult);
    return matchResult;
  }

  // 7. Approve Matched Invoice & Atomically Lock Invoiced Quantity
  approveMatchedInvoice(supplierInvoiceId, actor = 'finance_manager') {
    const pi = this.supplierInvoices.get(supplierInvoiceId);
    if (!pi) throw new Error(`Supplier Invoice '${supplierInvoiceId}' not found.`);

    const po = this.purchaseOrders.get(pi.po_id);
    if (!po) throw new Error(`Linked Purchase Order '${pi.po_id}' not found.`);

    if (this.matchLocks.has(po.id)) {
      throw new Error(`Concurrent modification lock active for PO '${po.po_number}'.`);
    }
    this.matchLocks.add(po.id);

    try {
      const match = this.matchRecords.get(supplierInvoiceId) || this.executeThreeWayMatch(supplierInvoiceId);
      if (!match.is_matched) {
        throw new Error(`Cannot approve invoice '${supplierInvoiceId}': Three-Way Match failed with ${match.discrepancies_count} discrepancies.`);
      }

      if (pi.status === 'approved_posted') {
        throw new Error(`Invoice '${supplierInvoiceId}' has already been approved and posted.`);
      }

      // Atomically update invoiced quantity on PO
      for (const line of pi.items) {
        const prev = po.invoiced_items[line.item_id] || 0;
        po.invoiced_items[line.item_id] = prev + line.billed_quantity;
      }

      // Check if PO is completely invoiced
      let fullyInvoiced = true;
      for (const poLine of po.items) {
        const invoiced = po.invoiced_items[poLine.item_id] || 0;
        if (invoiced < poLine.ordered_quantity) {
          fullyInvoiced = false;
          break;
        }
      }
      po.status = fullyInvoiced ? 'completed' : 'partially_invoiced';

      // Double-Entry General Ledger Posting
      if (this.postingEngine) {
        const event = {
          event_id: `EVT-PURCHASE-${pi.id}`,
          event_type: 'INVENTORY_RECEIVED',
          tenant_id: pi.tenant_id,
          organization_id: pi.organization_id,
          occurred_at: new Date().toISOString(),
          effective_date: pi.invoice_date,
          source_module: 'procurement',
          source_entity_id: pi.id,
          currency: 'IRR',
          idempotency_key: `IDEMP-PURCHASE-${pi.id}`,
          description: `فاکتور خرید ${pi.invoice_number} از تأمین‌کننده ${pi.supplier_name} (سفارش خرید ${po.po_number})`,
          lines: [
            {
              account_code: '1105',
              debit: pi.total_gross_amount,
              credit: 0,
              party_id: pi.supplier_id,
              description: `ثبت خرید کالا بر مبنای سفارش ${po.po_number}`
            },
            {
              account_code: '2101',
              debit: 0,
              credit: pi.total_final_amount,
              party_id: pi.supplier_id,
              description: `بدهی به تأمین‌کننده ${pi.supplier_name}`
            }
          ]
        };

        if (pi.total_tax_amount > 0) {
          event.lines.push({
            account_code: '1101',
            debit: pi.total_tax_amount,
            credit: 0,
            description: `اعتبار مالیات بر ارزش افزوده فاکتور خرید ${pi.invoice_number}`
          });
        }

        const postResult = this.postingEngine.postEvent(event, actor);
        pi.journal_id = postResult.journalEntry.journal_id;
      }

      pi.status = 'approved_posted';
      return {
        success: true,
        invoice: pi,
        matchResult: match,
        journal_id: pi.journal_id
      };
    } finally {
      this.matchLocks.delete(po.id);
    }
  }

  // 8. Cancel / Void Supplier Invoice with Reversal
  cancelSupplierInvoice(supplierInvoiceId, reason = 'ابطال فاکتور خرید', actor = 'finance_manager') {
    const pi = this.supplierInvoices.get(supplierInvoiceId);
    if (!pi) throw new Error(`Supplier Invoice '${supplierInvoiceId}' not found.`);

    const po = this.purchaseOrders.get(pi.po_id);
    if (!po) throw new Error(`Linked Purchase Order '${pi.po_id}' not found.`);

    if (pi.status === 'approved_posted') {
      // Revert invoiced quantities on PO
      for (const line of pi.items) {
        const prev = po.invoiced_items[line.item_id] || 0;
        po.invoiced_items[line.item_id] = Math.max(0, prev - line.billed_quantity);
      }
      po.status = 'partially_received';

      // Reversal accounting event
      if (this.postingEngine && pi.journal_id) {
        this.postingEngine.postEvent({
          event_id: `EVT-PURCHASE-REV-${pi.id}`,
          event_type: 'REVERSAL_ENTRY',
          tenant_id: pi.tenant_id,
          organization_id: pi.organization_id,
          occurred_at: new Date().toISOString(),
          effective_date: new Date().toISOString().split('T')[0],
          source_module: 'procurement',
          source_entity_id: pi.id,
          currency: 'IRR',
          idempotency_key: `IDEMP-REV-PURCHASE-${pi.id}`,
          description: `برگشت سند فاکتور خرید ${pi.invoice_number}: ${reason}`,
          lines: [
            {
              account_code: '2101',
              debit: pi.total_final_amount,
              credit: 0,
              party_id: pi.supplier_id,
              description: `برگشت بدهی تأمین‌کننده`
            },
            {
              account_code: '1105',
              debit: 0,
              credit: pi.total_gross_amount,
              description: `برگشت موجودی کالا`
            }
          ].concat(pi.total_tax_amount > 0 ? [{
            account_code: '1101',
            debit: 0,
            credit: pi.total_tax_amount,
            description: `برگشت اعتبار مالیاتی`
          }] : [])
        }, actor);
      }
    }

    pi.status = 'cancelled';
    pi.cancellation_reason = reason;
    return { success: true, invoice: pi };
  }
}

module.exports = { ProcurementEngine };
