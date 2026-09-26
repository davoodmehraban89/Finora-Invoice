const crypto = require('crypto');

class AccountingEventContract {
  static SCHEMA_VERSION = '2026.1';
  static SUPPORTED_EVENT_TYPES = [
    'INVOICE_ISSUED', 'INVOICE_CANCELLED', 'PAYMENT_RECEIVED', 'PAYMENT_DISBURSED',
    'INVENTORY_RECEIVED', 'INVENTORY_SHIPPED', 'TAX_ASSESSMENT_POSTED', 'REVERSAL_ENTRY',
    'CHEQUE_RECEIVED', 'CHEQUE_DEPOSITED', 'CHEQUE_CLEARED', 'CHEQUE_BOUNCED',
    'CHEQUE_ENDORSED', 'CHEQUE_ISSUED', 'ISSUED_CHEQUE_CLEARED',
    'BANK_EXPENSE_RECORDED', 'DIRECT_DEPOSIT_RECORDED'
  ];

  static validate(event) {
    if (!event) throw new Error('Accounting event cannot be null.');
    const required = ['event_id', 'event_type', 'tenant_id', 'organization_id', 'occurred_at', 'effective_date', 'currency', 'idempotency_key', 'lines'];
    for (const f of required) {
      if (!event[f]) throw new Error(`Missing required field: ${f}`);
    }
    if (!this.SUPPORTED_EVENT_TYPES.includes(event.event_type)) {
      throw new Error(`Unsupported event type: ${event.event_type}`);
    }
    let totalDebit = 0, totalCredit = 0;
    for (const l of event.lines) {
      const d = Number(l.debit) || 0, c = Number(l.credit) || 0;
      if (d < 0 || c < 0) throw new Error('Negative amounts forbidden.');
      totalDebit += d;
      totalCredit += c;
    }
    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      throw new Error(`Imbalanced entry: Debits(${totalDebit}) != Credits(${totalCredit})`);
    }
    return { isValid: true, totalDebit, totalCredit };
  }
}
module.exports = { AccountingEventContract };
