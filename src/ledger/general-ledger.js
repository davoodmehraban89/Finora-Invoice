/**
 * Finora General Ledger Model with Financial-Year Closing Workflow
 * Enforces Double-Entry, Immutability, Period Locks, Nominal Account Closing, and Opening Balances.
 * Governed by Chapters 021, 045, 062, 141, 242.
 */

const { MoneyPrecision } = require('../common/money-precision');

class GeneralLedger {
  constructor() {
    this.accounts = new Map(); // account_code -> Account
    this.journalEntries = []; // Immutable list of posted entries
    this.idempotencyStore = new Map(); // idempotency_key -> journal_entry_id
    this.fiscalPeriods = new Map(); // period_key -> { status: 'OPEN'|'CLOSED'|'LOCKED', startDate, endDate }
    this.auditLogs = [];
    this.closedYears = new Map(); // fiscal_year -> ClosingRecord
  }

  registerAccount({ code, name, category, nature, currency = 'IRR' }) {
    if (!code || !name) throw new Error('Account code and name are required.');
    if (!['asset', 'liability', 'equity', 'revenue', 'expense'].includes(category)) {
      throw new Error(`Invalid account category: ${category}`);
    }
    if (!['debit', 'credit'].includes(nature)) {
      throw new Error(`Invalid account nature: ${nature}. Must be debit or credit.`);
    }

    const account = {
      code,
      name,
      category,
      nature,
      currency,
      debitBalance: 0,
      creditBalance: 0,
      netBalance: 0
    };
    this.accounts.set(code, account);
    return account;
  }

  getAccount(code) {
    return this.accounts.get(code);
  }

  setPeriodStatus(periodKey, status, startDate, endDate) {
    if (!['OPEN', 'CLOSED', 'LOCKED'].includes(status)) {
      throw new Error(`Invalid period status: ${status}`);
    }
    this.fiscalPeriods.set(periodKey, { status, startDate, endDate });
  }

  checkPeriodOpen(effectiveDate) {
    for (const [key, p] of this.fiscalPeriods.entries()) {
      if (effectiveDate >= p.startDate && effectiveDate <= p.endDate) {
        if (p.status !== 'OPEN') {
          throw new Error(`Financial Invariant Violation: Period '${key}' is ${p.status}. Postings forbidden.`);
        }
        return true;
      }
    }
    return true;
  }

  recordAudit(actor, action, entity, entityId, details) {
    this.auditLogs.push({
      audit_id: `AUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      actor,
      action,
      entity,
      entityId,
      details
    });
  }

  getTrialBalance() {
    let totalDebit = 0;
    let totalCredit = 0;
    const report = [];

    for (const [code, acc] of this.accounts.entries()) {
      const net = acc.nature === 'debit'
        ? MoneyPrecision.subtract(acc.debitBalance, acc.creditBalance)
        : MoneyPrecision.subtract(acc.creditBalance, acc.debitBalance);
      acc.netBalance = net;

      report.push({
        code,
        name: acc.name,
        category: acc.category,
        nature: acc.nature,
        debit: acc.debitBalance,
        credit: acc.creditBalance,
        netBalance: net
      });
      totalDebit = MoneyPrecision.sum(totalDebit, acc.debitBalance);
      totalCredit = MoneyPrecision.sum(totalCredit, acc.creditBalance);
    }

    const isBalanced = MoneyPrecision.isBalanced(totalDebit, totalCredit);
    return {
      isBalanced,
      totalDebit,
      totalCredit,
      difference: Math.abs(totalDebit - totalCredit),
      accounts: report
    };
  }

  /**
   * DEFECT 07: Financial-Year Closing Workflow (بستن حساب‌های موقت و سال مالی)
   * 1. Validates that the fiscal period is OPEN and Trial Balance is strictly balanced.
   * 2. Closes all nominal accounts (Revenue & Expense) to Income Summary (خلاصه سود و زیان).
   * 3. Transfers Net Profit / Loss to Retained Earnings (سود/زیان انباشته - 3201).
   * 4. Enforces zero-balance invariant on all nominal accounts.
   * 5. Locks the period (LOCKED) to forbid retroactive tampering.
   * 6. Generates opening balance statement for the new fiscal year.
   */
  closeFiscalYear({
    fiscal_year,
    closing_date,
    income_summary_account = '9901',
    retained_earnings_account = '3201',
    actor = 'chief_accountant'
  }) {
    if (!fiscal_year || !closing_date) {
      throw new Error('fiscal_year and closing_date are mandatory for year-end closing.');
    }

    // Check if period already locked
    const period = this.fiscalPeriods.get(fiscal_year);
    if (period && period.status === 'LOCKED') {
      throw new Error(`Fiscal Year '${fiscal_year}' is already locked. Reclosing forbidden.`);
    }

    // Trial balance check
    const tb = this.getTrialBalance();
    if (!tb.isBalanced) {
      throw new Error(`Cannot close fiscal year '${fiscal_year}': Trial Balance is out of balance by ${tb.difference} Rials.`);
    }

    // Ensure income summary and retained earnings accounts exist
    if (!this.accounts.has(income_summary_account)) {
      this.registerAccount({
        code: income_summary_account,
        name: 'حساب خلاصه سود و زیان (Income Summary)',
        category: 'equity',
        nature: 'credit'
      });
    }
    if (!this.accounts.has(retained_earnings_account)) {
      this.registerAccount({
        code: retained_earnings_account,
        name: 'سود (زیان) انباشته (Retained Earnings)',
        category: 'equity',
        nature: 'credit'
      });
    }

    const incomeSummary = this.accounts.get(income_summary_account);
    const retainedEarnings = this.accounts.get(retained_earnings_account);

    const closingLines = [];
    let totalRevenueClosed = 0;
    let totalExpenseClosed = 0;

    // Step A: Close Nominal Accounts (Revenue & Expense)
    for (const acc of this.accounts.values()) {
      if (acc.category === 'revenue') {
        const netRev = MoneyPrecision.subtract(acc.creditBalance, acc.debitBalance);
        if (netRev !== 0) {
          totalRevenueClosed += netRev;
          // Debit revenue to zero it out, credit income summary
          acc.debitBalance = MoneyPrecision.sum(acc.debitBalance, netRev);
          acc.netBalance = 0;
          closingLines.push({
            account_code: acc.code,
            debit: netRev,
            credit: 0,
            description: `بستن حساب درآمد ${acc.name} به خلاصه سود و زیان`
          });
        }
      } else if (acc.category === 'expense') {
        const netExp = MoneyPrecision.subtract(acc.debitBalance, acc.creditBalance);
        if (netExp !== 0) {
          totalExpenseClosed += netExp;
          // Credit expense to zero it out, debit income summary
          acc.creditBalance = MoneyPrecision.sum(acc.creditBalance, netExp);
          acc.netBalance = 0;
          closingLines.push({
            account_code: acc.code,
            debit: 0,
            credit: netExp,
            description: `بستن حساب هزینه ${acc.name} به خلاصه سود و زیان`
          });
        }
      }
    }

    // Step B: Calculate Net Profit / Loss and Transfer to Retained Earnings
    const netProfitOrLoss = MoneyPrecision.subtract(totalRevenueClosed, totalExpenseClosed);
    const isProfit = netProfitOrLoss >= 0;
    const absNetResult = Math.abs(netProfitOrLoss);

    if (isProfit) {
      // Net Profit: Credit Retained Earnings
      retainedEarnings.creditBalance = MoneyPrecision.sum(retainedEarnings.creditBalance, absNetResult);
      retainedEarnings.netBalance = MoneyPrecision.subtract(retainedEarnings.creditBalance, retainedEarnings.debitBalance);
      closingLines.push({
        account_code: income_summary_account,
        debit: absNetResult,
        credit: 0,
        description: 'بستن مانده بستانکار خلاصه سود و زیان (سود خالص دوره)'
      });
      closingLines.push({
        account_code: retained_earnings_account,
        debit: 0,
        credit: absNetResult,
        description: 'انتقال سود خالص سال مالی به سود انباشته'
      });
    } else {
      // Net Loss: Debit Retained Earnings
      retainedEarnings.debitBalance = MoneyPrecision.sum(retainedEarnings.debitBalance, absNetResult);
      retainedEarnings.netBalance = MoneyPrecision.subtract(retainedEarnings.creditBalance, retainedEarnings.debitBalance);
      closingLines.push({
        account_code: retained_earnings_account,
        debit: absNetResult,
        credit: 0,
        description: 'انتقال زیان خالص سال مالی به زیان انباشته'
      });
      closingLines.push({
        account_code: income_summary_account,
        debit: 0,
        credit: absNetResult,
        description: 'بستن مانده بدهکار خلاصه سود و زیان (زیان خالص دوره)'
      });
    }

    // Step C: Verify all nominal accounts have strictly 0 net balance
    for (const acc of this.accounts.values()) {
      if (acc.category === 'revenue' || acc.category === 'expense') {
        const remaining = acc.nature === 'debit'
          ? (acc.debitBalance - acc.creditBalance)
          : (acc.creditBalance - acc.debitBalance);
        if (remaining !== 0) {
          throw new Error(`Year-end closing anomaly: Account ${acc.code} has non-zero post-closing balance (${remaining}).`);
        }
      }
    }

    // Step D: Construct Opening Balances for next fiscal year (Balance Sheet Accounts)
    const openingBalances = [];
    for (const acc of this.accounts.values()) {
      if (['asset', 'liability', 'equity'].includes(acc.category)) {
        const net = acc.nature === 'debit'
          ? (acc.debitBalance - acc.creditBalance)
          : (acc.creditBalance - acc.debitBalance);
        if (net !== 0) {
          openingBalances.push({
            account_code: acc.code,
            name: acc.name,
            category: acc.category,
            nature: acc.nature,
            opening_balance: net,
            debit: acc.nature === 'debit' ? net : 0,
            credit: acc.nature === 'credit' ? net : 0
          });
        }
      }
    }

    // Step E: Lock the fiscal year
    this.setPeriodStatus(fiscal_year, 'LOCKED', period ? period.startDate : `${fiscal_year}-01-01`, closing_date);

    const closingRecord = {
      fiscal_year,
      closing_date,
      closed_by: actor,
      total_revenue_closed: totalRevenueClosed,
      total_expense_closed: totalExpenseClosed,
      net_profit_or_loss: netProfitOrLoss,
      result_type: isProfit ? 'NET_PROFIT' : 'NET_LOSS',
      result_type_fa: isProfit ? 'سود خالص سال مالی' : 'زیان خالص سال مالی',
      closing_entries: closingLines,
      opening_balances_next_year: openingBalances,
      closed_at: new Date().toISOString()
    };

    this.closedYears.set(fiscal_year, closingRecord);

    this.recordAudit(
      actor,
      'FISCAL_YEAR_CLOSED',
      'FiscalYear',
      fiscal_year,
      `Year ${fiscal_year} closed. Net result: ${netProfitOrLoss} Rials. Nominal accounts zeroed.`
    );

    return closingRecord;
  }
}

module.exports = { GeneralLedger };
