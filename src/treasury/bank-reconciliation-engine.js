/**
 * Finora Bank Reconciliation Engine (موتور صورت مغایرت بانکی)
 * Governed by Chapters 020, 033, 243.
 * Automates two-way reconciliation between:
 *   1. Internal Book Transactions (دفتر نقد و بانک - معین ۱۱۰۱)
 *   2. Electronic Bank Statement Items (صورت‌حساب بانک)
 *
 * Enforces Financial Invariant:
 *   Adjusted Bank Balance === Adjusted Book Balance
 */

class BankReconciliationEngine {
  constructor({ postingEngine = null }) {
    this.postingEngine = postingEngine;
    this.reconciliations = new Map(); // id -> ReconciliationSession
  }

  /**
   * Run automated reconciliation for a specific period and bank account
   */
  performReconciliation({
    id,
    tenant_id,
    organization_id,
    bank_account_id,
    statement_date,
    statement_ending_balance,
    book_ending_balance,
    book_entries = [], // [{ id, date, amount, direction: 'debit'|'credit', reference, description, cheque_id }]
    statement_entries = [] // [{ id, date, amount, direction: 'deposit'|'withdrawal', reference, description }]
  }) {
    const matchedBookIds = new Set();
    const matchedStmtIds = new Set();
    const matches = [];

    // 1. Match exact references and amounts
    for (const stmt of statement_entries) {
      const stmtAmt = Number(stmt.amount);
      const isDeposit = stmt.direction === 'deposit';

      // Find matching book entry
      // For bank deposit -> book must be 'debit' (cash increase)
      // For bank withdrawal -> book must be 'credit' (cash decrease)
      const expectedBookDir = isDeposit ? 'debit' : 'credit';

      const candidate = book_entries.find(b =>
        !matchedBookIds.has(b.id) &&
        b.direction === expectedBookDir &&
        Number(b.amount) === stmtAmt &&
        ((b.reference && stmt.reference && b.reference === stmt.reference) ||
         (b.cheque_number && stmt.description && stmt.description.includes(b.cheque_number)))
      );

      if (candidate) {
        matchedBookIds.add(candidate.id);
        matchedStmtIds.add(stmt.id);
        matches.push({
          book_entry_id: candidate.id,
          statement_entry_id: stmt.id,
          amount: stmtAmt,
          match_type: 'EXACT_REF_AMOUNT'
        });
      }
    }

    // 2. Secondary matching: match by unique amount when single match exists in period
    for (const stmt of statement_entries) {
      if (matchedStmtIds.has(stmt.id)) continue;
      const stmtAmt = Number(stmt.amount);
      const isDeposit = stmt.direction === 'deposit';
      const expectedBookDir = isDeposit ? 'debit' : 'credit';

      const candidates = book_entries.filter(b =>
        !matchedBookIds.has(b.id) &&
        b.direction === expectedBookDir &&
        Number(b.amount) === stmtAmt
      );

      if (candidates.length === 1) {
        const candidate = candidates[0];
        matchedBookIds.add(candidate.id);
        matchedStmtIds.add(stmt.id);
        matches.push({
          book_entry_id: candidate.id,
          statement_entry_id: stmt.id,
          amount: stmtAmt,
          match_type: 'AMOUNT_HEURISTIC'
        });
      }
    }

    // 3. Classify Discrepancies
    // Deposits in Transit: In book as debit (deposit) but missing from bank statement
    const depositsInTransit = book_entries
      .filter(b => !matchedBookIds.has(b.id) && b.direction === 'debit')
      .map(b => ({ ...b, type: 'DEPOSIT_IN_TRANSIT' }));

    // Outstanding Cheques: In book as credit (payment) but not yet presented at bank
    const outstandingCheques = book_entries
      .filter(b => !matchedBookIds.has(b.id) && b.direction === 'credit')
      .map(b => ({ ...b, type: 'OUTSTANDING_CHEQUE' }));

    // Unrecorded Bank Credits: In bank statement as deposit, missing from books
    const unrecordedCredits = statement_entries
      .filter(s => !matchedStmtIds.has(s.id) && s.direction === 'deposit')
      .map(s => ({ ...s, type: 'UNRECORDED_BANK_CREDIT' }));

    // Unrecorded Bank Debits / Fees: In bank statement as withdrawal, missing from books
    const unrecordedDebits = statement_entries
      .filter(s => !matchedStmtIds.has(s.id) && s.direction === 'withdrawal')
      .map(s => ({ ...s, type: 'UNRECORDED_BANK_DEBIT' }));

    // 4. Mathematical Reconciliation Statement
    const sum = (arr) => arr.reduce((acc, x) => acc + Number(x.amount), 0);

    const totalDepositsInTransit = sum(depositsInTransit);
    const totalOutstandingCheques = sum(outstandingCheques);
    const totalUnrecordedCredits = sum(unrecordedCredits);
    const totalUnrecordedDebits = sum(unrecordedDebits);

    // Adjusted Bank Balance = StmtBalance + DepositsInTransit - OutstandingCheques
    const adjustedBankBalance = Number(statement_ending_balance) + totalDepositsInTransit - totalOutstandingCheques;

    // Adjusted Book Balance = BookBalance + UnrecordedCredits - UnrecordedDebits
    const adjustedBookBalance = Number(book_ending_balance) + totalUnrecordedCredits - totalUnrecordedDebits;

    const variance = Math.abs(adjustedBankBalance - adjustedBookBalance);
    const isReconciled = variance < 0.01;

    const report = {
      id,
      tenant_id,
      organization_id,
      bank_account_id,
      statement_date,
      created_at: new Date().toISOString(),
      balances: {
        statement_ending_balance: Number(statement_ending_balance),
        book_ending_balance: Number(book_ending_balance),
        adjusted_bank_balance: adjustedBankBalance,
        adjusted_book_balance: adjustedBookBalance,
        variance,
        is_reconciled: isReconciled
      },
      summary: {
        total_matched_count: matches.length,
        deposits_in_transit_count: depositsInTransit.length,
        deposits_in_transit_amount: totalDepositsInTransit,
        outstanding_cheques_count: outstandingCheques.length,
        outstanding_cheques_amount: totalOutstandingCheques,
        unrecorded_credits_count: unrecordedCredits.length,
        unrecorded_credits_amount: totalUnrecordedCredits,
        unrecorded_debits_count: unrecordedDebits.length,
        unrecorded_debits_amount: totalUnrecordedDebits
      },
      details: {
        matches,
        deposits_in_transit: depositsInTransit,
        outstanding_cheques: outstandingCheques,
        unrecorded_credits: unrecordedCredits,
        unrecorded_debits: unrecordedDebits
      }
    };

    this.reconciliations.set(id, report);
    return report;
  }

  /**
   * Automatically resolve an unrecorded bank charge or credit into the General Ledger
   */
  postUnrecordedBankItem({
    reconciliation_id,
    item_id,
    account_code, // e.g. '6105' (Bank Fees / کارمزد بانکی) or '1103' (Customer A/R)
    actor = 'accountant'
  }) {
    const recon = this.reconciliations.get(reconciliation_id);
    if (!recon) throw new Error(`Reconciliation '${reconciliation_id}' not found.`);

    let targetItem = recon.details.unrecorded_debits.find(d => d.id === item_id);
    let isDebit = true;

    if (!targetItem) {
      targetItem = recon.details.unrecorded_credits.find(c => c.id === item_id);
      isDebit = false;
    }

    if (!targetItem) throw new Error(`Unrecorded statement item '${item_id}' not found.`);

    if (!this.postingEngine) throw new Error('Posting engine required to post unrecorded items.');

    const amt = Number(targetItem.amount);

    if (isDebit) {
      // Bank Withdrawal (e.g. Bank Fee): Debit Expense (6105), Credit Cash & Bank (1101)
      this.postingEngine.postEvent({
        event_id: `EVT-RECON-DEB-${item_id}`,
        event_type: 'BANK_EXPENSE_RECORDED',
        tenant_id: recon.tenant_id,
        organization_id: recon.organization_id,
        occurred_at: new Date().toISOString(),
        effective_date: targetItem.date || recon.statement_date,
        source_module: 'treasury',
        source_entity_id: item_id,
        currency: 'IRR',
        idempotency_key: `IDEMP-RECON-DEB-${item_id}`,
        description: `ثبت کارمزد/هزینه بانکی شناسایی شده در صورت‌حساب: ${targetItem.description || item_id}`,
        lines: [
          {
            account_code: account_code || '6105', // Bank Fees / هزینه‌های مالی و کارمزد بانکی
            debit: amt,
            credit: 0,
            description: targetItem.description || 'کارمزد بانکی'
          },
          {
            account_code: '1101', // Cash & Bank
            debit: 0,
            credit: amt,
            description: `برداشت کارمزد از حساب بانکی ${recon.bank_account_id}`
          }
        ]
      }, actor);
    } else {
      // Bank Deposit (e.g. Direct wire transfer): Debit Cash & Bank (1101), Credit Customer A/R (1103)
      this.postingEngine.postEvent({
        event_id: `EVT-RECON-CRD-${item_id}`,
        event_type: 'DIRECT_DEPOSIT_RECORDED',
        tenant_id: recon.tenant_id,
        organization_id: recon.organization_id,
        occurred_at: new Date().toISOString(),
        effective_date: targetItem.date || recon.statement_date,
        source_module: 'treasury',
        source_entity_id: item_id,
        currency: 'IRR',
        idempotency_key: `IDEMP-RECON-CRD-${item_id}`,
        description: `ثبت واریز مستقیم شناسایی شده در صورت‌حساب: ${targetItem.description || item_id}`,
        lines: [
          {
            account_code: '1101', // Cash & Bank
            debit: amt,
            credit: 0,
            description: `واریز مستقیم به حساب بانکی ${recon.bank_account_id}`
          },
          {
            account_code: account_code || '1103', // Customer A/R or other income
            debit: 0,
            credit: amt,
            description: targetItem.description || 'واریز ناشناس / پیش‌دریافت'
          }
        ]
      }, actor);
    }

    targetItem.posted = true;
    return { success: true, item_id, posted_amount: amt };
  }
}

module.exports = { BankReconciliationEngine };
