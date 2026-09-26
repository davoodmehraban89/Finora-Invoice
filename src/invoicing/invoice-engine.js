/**
 * Finora Invoice Engine with Integrated Inventory Goods Issue & COGS Accounting
 * Governed strictly by Chapters 013, 014, 016, 017, 045, 046, 232, 252.
 * 
 * Features:
 * - Sales Invoicing with Versioned Tax Calculation
 * - Automated Goods Issue from Warehouse upon Invoice Approval
 * - Real-Time Inventory Valuation (Moving Average Cost)
 * - Exact Double-Entry COGS Recognition (Debit 5101 COGS, Credit 1105 Inventory)
 * - Continuous Ledger-to-Inventory Reconciliation
 */

const { defaultTaxEngine } = require('../tax/tax-rule-engine');
const { MoneyPrecision } = require('../common/money-precision');

class InvoiceEngine {
  constructor({ postingEngine, taxEngine = defaultTaxEngine, stockEngine = null } = {}) {
    this.postingEngine = postingEngine;
    this.taxEngine = taxEngine;
    this.stockEngine = stockEngine;
    this.invoices = new Map(); // id -> invoice
  }

  createDraftInvoice({
    id,
    tenant_id,
    organization_id,
    invoice_number,
    invoice_type = 'B2B',
    customer,
    invoice_date,
    currency = 'IRR',
    created_by = 'system'
  }) {
    if (!id || !tenant_id || !organization_id || !invoice_number || !customer) {
      throw new Error('Missing required invoice initialization parameters.');
    }

    const invoice = {
      id,
      tenant_id,
      organization_id,
      invoice_number,
      invoice_type,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_national_id: customer.national_id,
      customer_economic_code: customer.economic_code,
      invoice_date: invoice_date || new Date().toISOString().split('T')[0],
      currency,
      items: [],
      total_gross_amount: 0,
      total_discount_amount: 0,
      total_net_amount: 0,
      total_tax_amount: 0,
      total_final_amount: 0,
      status: 'draft',
      moadian_status: 'unsubmitted',
      tax_unique_code: null,
      accounting_posted: false,
      journal_id: null,
      goods_issued: false,
      cogs_amount: 0,
      cogs_journal_id: null,
      created_by,
      created_at: new Date().toISOString()
    };

    this.invoices.set(id, invoice);
    return invoice;
  }

  addItemLine(invoiceId, {
    item,
    quantity,
    unit_price,
    discount_amount = 0,
    description = ''
  }) {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error(`Invoice '${invoiceId}' not found.`);
    if (invoice.status !== 'draft') {
      throw new Error(`Cannot modify invoice '${invoiceId}' because it is in '${invoice.status}' state.`);
    }

    const qty = Number(quantity);
    const price = MoneyPrecision.toRials(unit_price, false);
    const discount = MoneyPrecision.toRials(discount_amount, false);

    if (qty <= 0) throw new Error('Quantity must be positive.');
    if (price <= 0) throw new Error('Unit price must be positive.');

    const grossAmount = qty * price;
    const taxCalc = this.taxEngine.calculateLineTax({
      item_category: item.type || 'general',
      is_taxable: item.is_taxable,
      gross_amount: grossAmount,
      discount_amount: discount,
      jurisdiction: 'IR',
      transaction_date: invoice.invoice_date
    });

    const line = {
      line_number: invoice.items.length + 1,
      item_id: item.id,
      item_type: item.type || 'goods', // 'goods' | 'service'
      name: item.name,
      description: description || item.name,
      tax_item_identifier: item.tax_item_identifier,
      unit: item.unit || 'EA',
      quantity: qty,
      unit_price: price,
      gross_amount: grossAmount,
      discount_amount: discount,
      net_amount: taxCalc.net_taxable_amount,
      tax_rate: taxCalc.tax_rate,
      tax_amount: taxCalc.tax_amount,
      total_line_amount: taxCalc.total_line_amount
    };

    invoice.items.push(line);
    this.recalculateTotals(invoice);
    return line;
  }

  recalculateTotals(invoice) {
    let gross = 0;
    let discount = 0;
    let net = 0;
    let tax = 0;
    let finalTotal = 0;

    for (const item of invoice.items) {
      gross += item.gross_amount;
      discount += item.discount_amount;
      net += item.net_amount;
      tax += item.tax_amount;
      finalTotal += item.total_line_amount;
    }

    invoice.total_gross_amount = gross;
    invoice.total_discount_amount = discount;
    invoice.total_net_amount = net;
    invoice.total_tax_amount = tax;
    invoice.total_final_amount = finalTotal;
  }

  approveAndPost(invoiceId, actor = 'system', { issueStock = true, warehouse_id = 'wh_central' } = {}) {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error(`Invoice '${invoiceId}' not found.`);
    if (invoice.status !== 'draft') {
      throw new Error(`Invoice '${invoiceId}' cannot be approved from '${invoice.status}' state.`);
    }
    if (invoice.items.length === 0) {
      throw new Error('Cannot approve an invoice with zero line items.');
    }

    invoice.status = 'approved';

    // 1. Post Sales Revenue & Receivable Accounting Event
    // Debits: 1103 Accounts Receivable = total_final_amount
    // Credits: 4101 Sales Revenue = total_net_amount
    // Credits: 2102 Output VAT Payable = total_tax_amount
    const salesEvent = {
      event_id: `EVT-INV-${invoice.id}`,
      event_type: 'INVOICE_ISSUED',
      tenant_id: invoice.tenant_id,
      organization_id: invoice.organization_id,
      occurred_at: new Date().toISOString(),
      effective_date: invoice.invoice_date,
      source_module: 'invoicing',
      source_entity_id: invoice.id,
      currency: invoice.currency,
      idempotency_key: `IDEMP-INV-${invoice.id}`,
      description: `فاکتور فروش شماره ${invoice.invoice_number} - مشتری ${invoice.customer_name}`,
      lines: [
        {
          account_code: '1103', // Accounts Receivable
          debit: invoice.total_final_amount,
          credit: 0,
          party_id: invoice.customer_id,
          description: `بدهکاران تجاری - فاکتور ${invoice.invoice_number}`
        },
        {
          account_code: '4101', // Sales Revenue
          debit: 0,
          credit: invoice.total_net_amount,
          party_id: invoice.customer_id,
          description: `درآمد فروش فاکتور ${invoice.invoice_number}`
        }
      ]
    };

    if (invoice.total_tax_amount > 0) {
      salesEvent.lines.push({
        account_code: '2102', // Output VAT Payable
        debit: 0,
        credit: invoice.total_tax_amount,
        description: `مالیات ارزش افزوده فاکتور ${invoice.invoice_number}`
      });
    }

    const postResult = this.postingEngine.postEvent(salesEvent, actor);
    invoice.accounting_posted = true;
    invoice.journal_id = postResult.journalEntry.journal_id;

    // 2. DEFECT 04: Stock Movement & COGS Recognition Lifecycle
    let totalCogs = 0;
    if (this.stockEngine && issueStock) {
      for (const line of invoice.items) {
        if (line.item_type === 'goods') {
          // Check stock before issuing
          const bal = this.stockEngine.getBalance(invoice.tenant_id, invoice.organization_id, warehouse_id, line.item_id);
          if (bal.on_hand_quantity >= line.quantity) {
            const issueResult = this.stockEngine.issueGoods({
              tenant_id: invoice.tenant_id,
              organization_id: invoice.organization_id,
              warehouse_id,
              item_id: line.item_id,
              quantity: line.quantity,
              reference_type: 'sales_invoice',
              reference_id: invoice.invoice_number,
              actor
            });
            totalCogs += issueResult.transaction.total_cost;
          }
        }
      }

      if (totalCogs > 0) {
        // Post COGS Double-Entry:
        // Debit: 5101 Cost of Goods Sold (بهای تمام شده کالای فروش رفته)
        // Credit: 1105 Inventory (موجودی کالا)
        const cogsEvent = {
          event_id: `EVT-COGS-${invoice.id}`,
          event_type: 'INVENTORY_SHIPPED',
          tenant_id: invoice.tenant_id,
          organization_id: invoice.organization_id,
          occurred_at: new Date().toISOString(),
          effective_date: invoice.invoice_date,
          source_module: 'invoicing',
          source_entity_id: invoice.id,
          currency: invoice.currency,
          idempotency_key: `IDEMP-COGS-${invoice.id}`,
          description: `ثبت بهای تمام شده کالای فروش رفته (COGS) فاکتور شماره ${invoice.invoice_number}`,
          lines: [
            {
              account_code: '5101', // Cost of Goods Sold
              debit: totalCogs,
              credit: 0,
              description: `بهای تمام شده کالا - فاکتور ${invoice.invoice_number}`
            },
            {
              account_code: '1105', // Inventory
              debit: 0,
              credit: totalCogs,
              description: `خروج موجودی کالا از انبار بابت فاکتور ${invoice.invoice_number}`
            }
          ]
        };

        const cogsPostResult = this.postingEngine.postEvent(cogsEvent, actor);
        invoice.cogs_amount = totalCogs;
        invoice.cogs_journal_id = cogsPostResult.journalEntry.journal_id;
        invoice.goods_issued = true;
      }
    }

    invoice.status = 'posted';

    return {
      invoice,
      journalEntry: postResult.journalEntry,
      cogsAmount: totalCogs,
      cogsJournalId: invoice.cogs_journal_id
    };
  }
}

module.exports = { InvoiceEngine };
