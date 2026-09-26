/**
 * Finora Treasury & Cash Flow Engine
 * Governed by Chapters 020, 033, 243.
 */

class CashFlowEngine {
  constructor({ postingEngine = null }) {
    this.postingEngine = postingEngine;
    this.bankAccounts = new Map(); // id -> BankAccount
    this.cashBoxes = new Map(); // id -> CashBox
    this.payments = [];
    this.receipts = [];
  }

  registerBankAccount({
    id,
    tenant_id,
    organization_id,
    bank_name,
    account_number,
    iban,
    currency = 'IRR',
    opening_balance = 0
  }) {
    const acc = {
      id,
      tenant_id,
      organization_id,
      bank_name,
      account_number,
      iban,
      currency,
      balance: Number(opening_balance) || 0,
      status: 'active'
    };
    this.bankAccounts.set(id, acc);
    return acc;
  }

  recordReceipt({
    id,
    tenant_id,
    organization_id,
    bank_account_id,
    customer_id,
    amount,
    currency = 'IRR',
    date = new Date().toISOString().split('T')[0],
    reference_number,
    actor = 'system'
  }) {
    const amt = Number(amount);
    if (amt <= 0) throw new Error('Receipt amount must be positive.');

    const bank = this.bankAccounts.get(bank_account_id);
    if (!bank) throw new Error(`Bank account '${bank_account_id}' not found.`);

    bank.balance += amt;

    const receipt = {
      id,
      tenant_id,
      organization_id,
      bank_account_id,
      customer_id,
      amount: amt,
      currency,
      date,
      reference_number,
      actor,
      status: 'settled',
      timestamp: new Date().toISOString()
    };
    this.receipts.push(receipt);

    // If posting engine is integrated, emit accounting event
    if (this.postingEngine) {
      this.postingEngine.postEvent({
        event_id: `EVT-RCP-${id}`,
        event_type: 'PAYMENT_RECEIVED',
        tenant_id,
        organization_id,
        occurred_at: receipt.timestamp,
        effective_date: date,
        source_module: 'treasury',
        source_entity_id: id,
        currency,
        idempotency_key: `IDEMP-RCP-${id}`,
        description: `Receipt from Customer ${customer_id} to Bank ${bank.account_number}`,
        lines: [
          {
            account_code: '1101', // Cash & Bank (موجودی نقد و بانک)
            debit: amt,
            credit: 0,
            description: `Bank deposit ${reference_number || id}`
          },
          {
            account_code: '1103', // Accounts Receivable (حساب‌های دریافتنی)
            debit: 0,
            credit: amt,
            party_id: customer_id,
            description: `Settlement for customer ${customer_id}`
          }
        ]
      }, actor);
    }

    return receipt;
  }

  calculateCashPosition(tenantId, organizationId) {
    let totalCashAndBank = 0;
    const accounts = [];

    for (const bank of this.bankAccounts.values()) {
      if (bank.tenant_id === tenantId && bank.organization_id === organizationId) {
        totalCashAndBank += bank.balance;
        accounts.push({
          id: bank.id,
          name: bank.bank_name,
          account_number: bank.account_number,
          balance: bank.balance,
          currency: bank.currency
        });
      }
    }

    return {
      tenant_id: tenantId,
      organization_id: organizationId,
      total_liquid_cash: totalCashAndBank,
      accounts
    };
  }
}

module.exports = { CashFlowEngine };
