/**
 * Finora Accounting Event Contract
 * Governed strictly by Chapters 021, 045, 062, 141, 241, 242, 252.
 * 
 * Invariants:
 * 1. Financial entries must enter the ledger exclusively via this contract.
 * 2. sum(Debits) === sum(Credits) in base currency with exact precision.
 * 3. Idempotency key is required to eliminate duplicate postings.
 * 4. Immutable payload with cryptographic digest.
 */

const crypto = require('crypto');
const { MoneyPrecision } = require('../common/money-precision');

class AccountingEventContract {
  static SCHEMA_VERSION = '2026.1';

  static SUPPORTED_EVENT_TYPES = [
    'INVOICE_ISSUED',
    'INVOICE_CANCELLED',
    'PAYMENT_RECEIVED',
    'PAYMENT_DISBURSED',
    'INVENTORY_RECEIVED',
    'INVENTORY_SHIPPED',
    'TAX_ASSESSMENT_POSTED',
    'REVERSAL_ENTRY',
    // Treasury & Sayad Cheques (Chapters 020, 033, 243)
    'CHEQUE_RECEIVED',
    'CHEQUE_DEPOSITED',
    'CHEQUE_CLEARED',
    'CHEQUE_BOUNCED',
    'CHEQUE_ENDORSED',
    'CHEQUE_ENDORSED_BOUNCED',
    'CHEQUE_ISSUED',
    'ISSUED_CHEQUE_CLEARED',
    'BANK_EXPENSE_RECORDED',
    'DIRECT_DEPOSIT_RECORDED',
    // Financial Year Closing (Chapters 021, 045, 242)
    'FISCAL_YEAR_CLOSING',
    'OPENING_BALANCE_ENTRY'
  ];

  static validate(event) {
    if (!event) throw new Error('Accounting event cannot be null or undefined.');

    const requiredFields = [
      'event_id',
      'event_type',
      'tenant_id',
      'organization_id',
      'occurred_at',
      'effective_date',
      'source_module',
      'source_entity_id',
      'currency',
      'idempotency_key',
      'lines'
    ];

    for (const field of requiredFields) {
      if (!event[field]) {
        throw new Error(`AccountingEvent violation: missing required field '${field}'.`);
      }
    }

    if (!this.SUPPORTED_EVENT_TYPES.includes(event.event_type)) {
      throw new Error(`Unsupported accounting event type: '${event.event_type}'.`);
    }

    if (!Array.isArray(event.lines) || event.lines.length < 2) {
      throw new Error('AccountingEvent must contain at least two transaction lines (double-entry).');
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (let i = 0; i < event.lines.length; i++) {
      const line = event.lines[i];
      if (!line.account_code) {
        throw new Error(`Line ${i} missing account_code.`);
      }

      const rawDebit = line.debit !== undefined && line.debit !== null ? line.debit : 0;
      const rawCredit = line.credit !== undefined && line.credit !== null ? line.credit : 0;

      if (rawDebit < 0 || rawCredit < 0) {
        throw new Error(`Line ${i} negative amounts forbidden. Debit: ${rawDebit}, Credit: ${rawCredit}`);
      }

      const debit = MoneyPrecision.toRials(rawDebit, false);
      const credit = MoneyPrecision.toRials(rawCredit, false);

      line.debit = debit;
      line.credit = credit;

      if (debit === 0 && credit === 0) {
        throw new Error(`Line ${i} must have non-zero debit or credit amount.`);
      }

      if (debit > 0 && credit > 0) {
        throw new Error(`Line ${i} cannot have both debit and credit on the same row.`);
      }

      totalDebit += debit;
      totalCredit += credit;
    }

    // Exact mathematical balance check using MoneyPrecision
    if (!MoneyPrecision.isBalanced(totalDebit, totalCredit)) {
      const diff = Math.abs(totalDebit - totalCredit);
      throw new Error(
        `Financial Invariant Broken: Double-entry imbalance detected. Total Debits (${totalDebit}) != Total Credits (${totalCredit}). Difference: ${diff}`
      );
    }

    // Attach canonical payload hash if not present
    const normalized = JSON.stringify({
      tenant_id: event.tenant_id,
      organization_id: event.organization_id,
      effective_date: event.effective_date,
      event_type: event.event_type,
      source_module: event.source_module,
      source_entity_id: event.source_entity_id,
      currency: event.currency,
      lines: event.lines.map(l => ({
        account_code: l.account_code,
        debit: l.debit || 0,
        credit: l.credit || 0,
        party_id: l.party_id || null,
        cost_center: l.cost_center || null
      }))
    });

    const payloadHash = crypto.createHash('sha256').update(normalized).digest('hex');

    return {
      isValid: true,
      totalDebit,
      totalCredit,
      payloadHash,
      schema_version: this.SCHEMA_VERSION
    };
  }
}

module.exports = { AccountingEventContract };
