class GeneralLedger {
  constructor() {
    this.accounts = new Map();
    this.journalEntries = [];
  }
  registerAccount({ code, name, category, nature }) {
    const acc = { code, name, category, nature, totalDebit: 0, totalCredit: 0, netBalance: 0 };
    this.accounts.set(code, acc);
    return acc;
  }
  getAccount(code) { return this.accounts.get(code); }
  recordPosting(journalEntry) {
    for (const line of journalEntry.lines) {
      const acc = this.accounts.get(line.account_code);
      if (!acc) throw new Error(`Account code ${line.account_code} not registered.`);
      const d = Number(line.debit) || 0, c = Number(line.credit) || 0;
      acc.totalDebit += d;
      acc.totalCredit += c;
      acc.netBalance = acc.nature === 'debit' ? (acc.totalDebit - acc.totalCredit) : (acc.totalCredit - acc.totalDebit);
    }
    this.journalEntries.push(journalEntry);
    return journalEntry;
  }
  getTrialBalance() {
    let totD = 0, totC = 0;
    for (const a of this.accounts.values()) {
      totD += a.totalDebit;
      totC += a.totalCredit;
    }
    return { totalDebit: totD, totalCredit: totC, isBalanced: Math.abs(totD - totC) < 0.0001 };
  }
}
module.exports = { GeneralLedger };
