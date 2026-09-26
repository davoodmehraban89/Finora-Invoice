/**
 * Finora Executive Financial Intelligence & Analytics Engine
 * Governed by Chapters 026, 040, 056, 073, 100, 124, 150, 176.
 * 
 * Provides automated calculation of:
 * 1. Working Capital & Liquidity Ratios (Current Ratio, Quick Ratio).
 * 2. Operating Efficiency Ratios (DSO, DPO, DIO, Cash Conversion Cycle).
 * 3. Profitability Ratios (Gross Margin, Operating Margin, Net Margin).
 * 4. Cash Flow & Burn Analytics (Monthly Burn Rate, Cash Runway in months).
 * 5. Accounts Receivable Aging Ladder (0-30, 31-60, 61-90, 90+ days).
 */

class FinancialAnalyticsEngine {
  constructor({ ledger = null }) {
    this.ledger = ledger;
  }

  /**
   * Calculate comprehensive liquidity & working capital metrics
   */
  calculateLiquidityMetrics({
    cashAndBank = 0,
    accountsReceivable = 0,
    notesReceivable = 0,
    inventory = 0,
    accountsPayable = 0,
    notesPayable = 0,
    vatPayable = 0,
    otherCurrentLiabilities = 0
  } = {}) {
    // If ledger is provided, attempt to derive balances directly if not overridden
    if (this.ledger) {
      const getBal = (code) => {
        const acc = this.ledger.getAccount(code);
        return acc ? Math.abs(acc.netBalance) : 0;
      };
      if (cashAndBank === 0) cashAndBank = getBal('1101');
      if (notesReceivable === 0) notesReceivable = getBal('1102') + getBal('1104');
      if (accountsReceivable === 0) accountsReceivable = getBal('1103');
      if (inventory === 0) inventory = getBal('1105');
      if (accountsPayable === 0) accountsPayable = getBal('2101');
      if (notesPayable === 0) notesPayable = getBal('2104');
      if (vatPayable === 0) vatPayable = getBal('2102');
    }

    const currentAssets = cashAndBank + accountsReceivable + notesReceivable + inventory;
    const currentLiabilities = accountsPayable + notesPayable + vatPayable + otherCurrentLiabilities;
    const workingCapital = currentAssets - currentLiabilities;

    const currentRatio = currentLiabilities > 0 
      ? Number((currentAssets / currentLiabilities).toFixed(2)) 
      : (currentAssets > 0 ? 999.99 : 1.0);

    const quickAssets = cashAndBank + accountsReceivable + notesReceivable;
    const quickRatio = currentLiabilities > 0 
      ? Number((quickAssets / currentLiabilities).toFixed(2)) 
      : (quickAssets > 0 ? 999.99 : 1.0);

    return {
      current_assets: currentAssets,
      current_liabilities: currentLiabilities,
      working_capital: workingCapital,
      current_ratio: currentRatio,
      quick_ratio: quickRatio,
      liquidity_status: quickRatio >= 1.2 ? 'HEALTHY' : (quickRatio >= 1.0 ? 'ADEQUATE' : 'VULNERABLE')
    };
  }

  /**
   * Calculate Cash Conversion Cycle (CCC) & Operating cycle components
   */
  calculateCashConversionCycle({
    creditSales = 0,
    accountsReceivable = 0,
    cogs = 0,
    inventory = 0,
    accountsPayable = 0,
    periodDays = 365
  }) {
    if (this.ledger) {
      const getBal = (code) => {
        const acc = this.ledger.getAccount(code);
        return acc ? Math.abs(acc.netBalance) : 0;
      };
      if (creditSales === 0) creditSales = getBal('4101');
      if (accountsReceivable === 0) accountsReceivable = getBal('1103');
      if (inventory === 0) inventory = getBal('1105');
      if (accountsPayable === 0) accountsPayable = getBal('2101');
    }

    // DSO = (AR / Credit Sales) * Period Days
    const dso = creditSales > 0 
      ? Math.round((accountsReceivable / creditSales) * periodDays) 
      : 0;

    // DIO = (Inventory / COGS) * Period Days
    const dio = cogs > 0 
      ? Math.round((inventory / cogs) * periodDays) 
      : 0;

    // DPO = (AP / COGS) * Period Days
    const dpo = cogs > 0 
      ? Math.round((accountsPayable / cogs) * periodDays) 
      : 0;

    // CCC = DIO + DSO - DPO
    const ccc = dio + dso - dpo;

    return {
      days_sales_outstanding_dso: dso,
      days_inventory_outstanding_dio: dio,
      days_payable_outstanding_dpo: dpo,
      cash_conversion_cycle_days: ccc,
      working_capital_efficiency: ccc <= 45 ? 'EXCELLENT' : (ccc <= 90 ? 'MODERATE' : 'SLOW_TURNOVER')
    };
  }

  /**
   * Calculate Cash Burn Rate & Runway in months
   */
  calculateCashRunway({
    totalLiquidCash,
    monthlyOperatingExpenses,
    monthlyRevenues = 0
  }) {
    const liquid = Number(totalLiquidCash);
    const opex = Number(monthlyOperatingExpenses);
    const rev = Number(monthlyRevenues);

    const netMonthlyBurn = Math.max(0, opex - rev);
    let runwayMonths = 999;

    if (netMonthlyBurn > 0) {
      runwayMonths = Number((liquid / netMonthlyBurn).toFixed(1));
    }

    return {
      total_liquid_cash: liquid,
      monthly_operating_expenses: opex,
      monthly_revenues: rev,
      net_monthly_burn: netMonthlyBurn,
      runway_months: runwayMonths,
      status: runwayMonths >= 12 ? 'SECURE' : (runwayMonths >= 6 ? 'CAUTION' : 'CRITICAL_RUNWAY')
    };
  }

  /**
   * Aging Analysis of Accounts Receivable
   */
  calculateReceivablesAging(invoices = [], asOfDate = new Date().toISOString().split('T')[0]) {
    const buckets = {
      current_0_30: { count: 0, amount: 0, invoices: [] },
      past_due_31_60: { count: 0, amount: 0, invoices: [] },
      past_due_61_90: { count: 0, amount: 0, invoices: [] },
      past_due_over_90: { count: 0, amount: 0, invoices: [] }
    };

    const targetDate = new Date(asOfDate);

    for (const inv of invoices) {
      if (inv.status !== 'posted' && inv.status !== 'issued') continue;
      const outstanding = inv.total_final_amount || inv.amount || 0;
      if (outstanding <= 0) continue;

      const dueDate = new Date(inv.due_date || inv.date);
      const diffTime = targetDate - dueDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 30) {
        buckets.current_0_30.count++;
        buckets.current_0_30.amount += outstanding;
        buckets.current_0_30.invoices.push(inv.id);
      } else if (diffDays <= 60) {
        buckets.past_due_31_60.count++;
        buckets.past_due_31_60.amount += outstanding;
        buckets.past_due_31_60.invoices.push(inv.id);
      } else if (diffDays <= 90) {
        buckets.past_due_61_90.count++;
        buckets.past_due_61_90.amount += outstanding;
        buckets.past_due_61_90.invoices.push(inv.id);
      } else {
        buckets.past_due_over_90.count++;
        buckets.past_due_over_90.amount += outstanding;
        buckets.past_due_over_90.invoices.push(inv.id);
      }
    }

    const totalOverdue = buckets.past_due_31_60.amount + buckets.past_due_61_90.amount + buckets.past_due_over_90.amount;
    const totalReceivables = buckets.current_0_30.amount + totalOverdue;

    return {
      total_receivables: totalReceivables,
      total_overdue: totalOverdue,
      overdue_percentage: totalReceivables > 0 ? Number(((totalOverdue / totalReceivables) * 100).toFixed(1)) : 0,
      buckets
    };
  }

  /**
   * Profitability & Margins
   */
  calculateProfitability({
    revenue = 0,
    cogs = 0,
    operatingExpenses = 0,
    taxExpense = 0
  }) {
    const rev = Number(revenue);
    const grossProfit = rev - Number(cogs);
    const operatingProfit = grossProfit - Number(operatingExpenses);
    const netProfit = operatingProfit - Number(taxExpense);

    return {
      revenue: rev,
      cogs: Number(cogs),
      gross_profit: grossProfit,
      gross_margin_pct: rev > 0 ? Number(((grossProfit / rev) * 100).toFixed(2)) : 0,
      operating_profit: operatingProfit,
      operating_margin_pct: rev > 0 ? Number(((operatingProfit / rev) * 100).toFixed(2)) : 0,
      net_profit: netProfit,
      net_margin_pct: rev > 0 ? Number(((netProfit / rev) * 100).toFixed(2)) : 0
    };
  }
}

module.exports = { FinancialAnalyticsEngine };
