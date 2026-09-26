/**
 * Finora Executive Financial Intelligence & Analytics Engine
 * Governed by Chapters 026, 040, 056, 073, 100, 124, 150, 176 of the Finora Master Specification.
 *
 * Implements:
 * - Real-Time Working Capital & Liquidity Ratios (Current Ratio, Quick Ratio)
 * - Cash Conversion Cycle (DSO, DIO, DPO, CCC)
 * - Cash Burn Rate, Inflow/Outflow Trajectory & Cash Runway (Survival Horizon)
 * - Comprehensive Profitability Analysis (Gross, Operating & Net Margins)
 * - Enterprise Risk Digital Twin & Early Warning Anomaly Detection
 * - Automated Executive Briefing Payload for Persian RTL Executive Dashboard
 */

class FinancialAnalyticsEngine {
  constructor({ generalLedger, cashFlowEngine = null }) {
    if (!generalLedger) {
      throw new Error('FinancialAnalyticsEngine requires a valid GeneralLedger instance.');
    }
    this.generalLedger = generalLedger;
    this.cashFlowEngine = cashFlowEngine;
  }

  /**
   * Helper to retrieve net balance of an account code.
   * If account does not exist, returns 0.
   */
  _getNetBalance(code) {
    const acc = this.generalLedger.getAccount(code);
    if (!acc) return 0;
    // Debit nature accounts: positive net balance = debitBalance - creditBalance
    // Credit nature accounts: positive net balance = creditBalance - debitBalance
    if (acc.nature === 'debit') {
      return acc.debitBalance - acc.creditBalance;
    } else {
      return acc.creditBalance - acc.debitBalance;
    }
  }

  /**
   * Calculate Current Assets, Current Liabilities, and Working Capital.
   * Current Assets (دارایی‌های جاری):
   * - 1101: Cash & Bank (نقد و بانک)
   * - 1102: Notes Receivable / Vault Cheques (اسناد دریافتنی / چک‌های نزد صندوق)
   * - 1103: Accounts Receivable (حساب‌های دریافتنی تجاری)
   * - 1104: Cheques in Collection (اسناد در جریان وصول)
   * - 1105: Merchandise Inventory (موجودی کالا و مواد)
   *
   * Current Liabilities (بدهی‌های جاری):
   * - 2101: Accounts Payable (حساب‌های پرداختنی تجاری)
   * - 2102: Commercial Notes / Cheques Payable (اسناد پرداختنی تجاری)
   * - 2103: VAT / Tax Liabilities Payable (مالیات و عوارض پرداختنی)
   * - 2104: Salary & Social Security Payable (حقوق و بیمه پرداختنی)
   */
  calculateWorkingCapital() {
    const cashAndBank = Math.max(0, this._getNetBalance('1101'));
    const vaultCheques = Math.max(0, this._getNetBalance('1102'));
    const accountsReceivable = Math.max(0, this._getNetBalance('1103'));
    const chequesInCollection = Math.max(0, this._getNetBalance('1104'));
    const inventory = Math.max(0, this._getNetBalance('1105'));

    // Dynamic fallback: scan all asset accounts starting with '11' (current assets)
    let totalCurrentAssets = cashAndBank + vaultCheques + accountsReceivable + chequesInCollection + inventory;
    for (const [code, acc] of this.generalLedger.accounts.entries()) {
      if (code.startsWith('11') && !['1101', '1102', '1103', '1104', '1105'].includes(code)) {
        totalCurrentAssets += Math.max(0, acc.nature === 'debit' ? (acc.debitBalance - acc.creditBalance) : 0);
      }
    }

    const accountsPayable = Math.max(0, this._getNetBalance('2101'));
    const notesPayable = Math.max(0, this._getNetBalance('2102'));
    const taxPayable = Math.max(0, this._getNetBalance('2103'));
    const payrollPayable = Math.max(0, this._getNetBalance('2104'));

    let totalCurrentLiabilities = accountsPayable + notesPayable + taxPayable + payrollPayable;
    for (const [code, acc] of this.generalLedger.accounts.entries()) {
      if (code.startsWith('21') && !['2101', '2102', '2103', '2104'].includes(code)) {
        totalCurrentLiabilities += Math.max(0, acc.nature === 'credit' ? (acc.creditBalance - acc.debitBalance) : 0);
      }
    }

    const netWorkingCapital = totalCurrentAssets - totalCurrentLiabilities;
    const currentRatio = totalCurrentLiabilities > 0
      ? Number((totalCurrentAssets / totalCurrentLiabilities).toFixed(2))
      : (totalCurrentAssets > 0 ? 999.0 : 1.0);

    const quickAssets = totalCurrentAssets - inventory;
    const quickRatio = totalCurrentLiabilities > 0
      ? Number((quickAssets / totalCurrentLiabilities).toFixed(2))
      : (quickAssets > 0 ? 999.0 : 1.0);

    let status = 'OPTIMAL';
    let statusFa = 'مطلوب و پایدار';
    if (netWorkingCapital < 0 || currentRatio < 1.0) {
      status = 'CRITICAL_DEFICIT';
      statusFa = 'کسری بحرانی سرمایه در گردش';
    } else if (currentRatio < 1.2 || quickRatio < 0.8) {
      status = 'TIGHT_LIQUIDITY';
      statusFa = 'نقدینگی شکننده و پرریسک';
    }

    return {
      current_assets: {
        total: totalCurrentAssets,
        cash_and_bank: cashAndBank,
        vault_cheques: vaultCheques,
        accounts_receivable: accountsReceivable,
        cheques_in_collection: chequesInCollection,
        inventory: inventory
      },
      current_liabilities: {
        total: totalCurrentLiabilities,
        accounts_payable: accountsPayable,
        notes_payable: notesPayable,
        tax_payable: taxPayable,
        payroll_payable: payrollPayable
      },
      net_working_capital: netWorkingCapital,
      current_ratio: currentRatio,
      quick_ratio: quickRatio,
      health_status: status,
      health_status_fa: statusFa
    };
  }

  /**
   * Calculate Cash Conversion Cycle (CCC):
   * - DSO: (Accounts Receivable / Total Credit Sales) * periodDays
   * - DIO: (Inventory / COGS) * periodDays
   * - DPO: (Accounts Payable / COGS) * periodDays
   * - CCC = DSO + DIO - DPO
   */
  calculateCashConversionCycle({ periodDays = 365, creditSalesOverride = null, cogsOverride = null } = {}) {
    const days = Math.max(1, Number(periodDays) || 365);
    const ar = Math.max(0, this._getNetBalance('1103'));
    const inventory = Math.max(0, this._getNetBalance('1105'));
    const ap = Math.max(0, this._getNetBalance('2101'));

    // Revenue from 4101 or override
    const revenue = creditSalesOverride !== null
      ? Number(creditSalesOverride)
      : Math.max(0, this._getNetBalance('4101'));

    // COGS from 5101 or override
    const cogs = cogsOverride !== null
      ? Number(cogsOverride)
      : Math.max(0, this._getNetBalance('5101'));

    const dso = revenue > 0 ? Number(((ar / revenue) * days).toFixed(1)) : 0;
    const dio = cogs > 0 ? Number(((inventory / cogs) * days).toFixed(1)) : 0;
    const dpo = cogs > 0 ? Number(((ap / cogs) * days).toFixed(1)) : 0;
    const ccc = Number((dso + dio - dpo).toFixed(1));

    let efficiencyRating = 'EXCELLENT';
    let efficiencyRatingFa = 'بهره‌وری نقدینگی ممتاز';
    if (ccc > 120) {
      efficiencyRating = 'POOR_CASH_LOCK';
      efficiencyRatingFa = 'انسداد شدید نقدینگی در زنجیره';
    } else if (ccc > 60) {
      efficiencyRating = 'MODERATE';
      efficiencyRatingFa = 'متوسط با پتانسیل بهینه‌سازی';
    }

    return {
      period_days: days,
      metrics: {
        dso_days: dso,
        dio_days: dio,
        dpo_days: dpo,
        cash_conversion_cycle_days: ccc
      },
      underlying_balances: {
        accounts_receivable: ar,
        inventory: inventory,
        accounts_payable: ap,
        total_sales: revenue,
        total_cogs: cogs
      },
      efficiency_rating: efficiencyRating,
      efficiency_rating_fa: efficiencyRatingFa
    };
  }

  /**
   * Profitability & Operating Margins:
   * Revenue (4101), COGS (5101), Operating Expenses (6101, 5102, 6105), Net Income
   */
  calculateProfitability() {
    const revenue = Math.max(0, this._getNetBalance('4101'));
    const cogs = Math.max(0, this._getNetBalance('5101'));
    const grossProfit = revenue - cogs;
    const grossMargin = revenue > 0 ? Number(((grossProfit / revenue) * 100).toFixed(2)) : 0;

    const generalAdminExp = Math.max(0, this._getNetBalance('6101'));
    const depreciationExp = Math.max(0, this._getNetBalance('5102'));
    const financialExp = Math.max(0, this._getNetBalance('6105'));

    // Dynamic scanning of all expense accounts starting with 5 or 6 (excluding COGS 5101)
    let totalOpex = generalAdminExp + depreciationExp + financialExp;
    for (const [code, acc] of this.generalLedger.accounts.entries()) {
      if ((code.startsWith('5') || code.startsWith('6')) && !['5101', '6101', '5102', '6105'].includes(code)) {
        totalOpex += Math.max(0, acc.nature === 'debit' ? (acc.debitBalance - acc.creditBalance) : 0);
      }
    }

    const operatingIncome = grossProfit - totalOpex;
    const operatingMargin = revenue > 0 ? Number(((operatingIncome / revenue) * 100).toFixed(2)) : 0;

    // Net income before tax
    const netIncome = operatingIncome;
    const netMargin = revenue > 0 ? Number(((netIncome / revenue) * 100).toFixed(2)) : 0;

    return {
      revenue,
      cogs,
      gross_profit: grossProfit,
      gross_margin_percentage: grossMargin,
      operating_expenses: {
        total: totalOpex,
        general_and_admin: generalAdminExp,
        depreciation: depreciationExp,
        financial_charges: financialExp
      },
      operating_income_ebit: operatingIncome,
      operating_margin_percentage: operatingMargin,
      net_income: netIncome,
      net_margin_percentage: netMargin
    };
  }

  /**
   * Cash Burn Rate & Runway Analysis (طول بقای نقدینگی و نرخ مصرف سرمایه):
   * Runway = Total Liquid Cash / Monthly Burn Rate
   */
  calculateCashBurnAndRunway({ lookbackMonths = 3, monthlyExpensesOverride = null } = {}) {
    let liquidCash = Math.max(0, this._getNetBalance('1101'));

    // If CashFlowEngine provides more detailed bank accounts, cross-verify
    if (this.cashFlowEngine && typeof this.cashFlowEngine.calculateCashPosition === 'function') {
      try {
        const cashPos = this.cashFlowEngine.calculateCashPosition('default_tenant', 'default_org');
        if (cashPos && cashPos.total_liquid_cash > 0) {
          liquidCash = Math.max(liquidCash, cashPos.total_liquid_cash);
        }
      } catch (e) {
        // Fallback to ledger 1101
      }
    }

    let monthlyBurn = 0;
    if (monthlyExpensesOverride !== null) {
      monthlyBurn = Math.max(0, Number(monthlyExpensesOverride));
    } else {
      // Estimate monthly burn from recorded expense accounts
      const profitability = this.calculateProfitability();
      const totalCashExpenses = profitability.operating_expenses.general_and_admin +
                                profitability.operating_expenses.financial_charges;
      // In the absence of multi-month records, normalize by lookbackMonths
      monthlyBurn = Number((totalCashExpenses / Math.max(1, lookbackMonths)).toFixed(0));
    }

    let runwayMonths = 999.0;
    let status = 'SELF_SUSTAINING';
    let statusFa = 'خودکفا و بدون وابستگی فوری به تزریق نقدینگی';

    if (monthlyBurn > 0) {
      runwayMonths = Number((liquidCash / monthlyBurn).toFixed(1));
      if (runwayMonths < 3.0) {
        status = 'CRITICAL_RUNWAY';
        statusFa = 'وضعیت بحرانی: طول بقای نقدینگی کمتر از ۳ ماه';
      } else if (runwayMonths < 6.0) {
        status = 'WARNING_RUNWAY';
        statusFa = 'هشدار نقدینگی: نیاز به مدیریت سریع سرمایه در گردش یا جذب منابع';
      } else {
        status = 'STABLE_RUNWAY';
        statusFa = 'پایدار: تاب‌آوری نقدینگی بیش از ۶ ماه';
      }
    }

    return {
      total_liquid_cash: liquidCash,
      monthly_burn_rate: monthlyBurn,
      runway_months: runwayMonths,
      status,
      status_fa: statusFa
    };
  }

  /**
   * Enterprise Risk Digital Twin (Chapter 176):
   * Aggregates financial ratios into a unified Risk Score (0 = Zero Risk, 100 = Imminent Insolvency).
   */
  evaluateEnterpriseRiskTwin() {
    const workingCapital = this.calculateWorkingCapital();
    const ccc = this.calculateCashConversionCycle();
    const runway = this.calculateCashBurnAndRunway();
    const profitability = this.calculateProfitability();

    let riskScore = 10; // Baseline healthy score
    const riskFactors = [];

    // Factor 1: Current Ratio
    if (workingCapital.current_ratio < 1.0) {
      riskScore += 35;
      riskFactors.push({
        severity: 'HIGH',
        code: 'RISK_LIQUIDITY_DEFICIT',
        title: 'کسری نقدینگی جاری',
        message: `نسبت جاری (${workingCapital.current_ratio}) کمتر از ۱.۰ است. دارایی‌های جاری پاسخگوی تعهدات کوتاه‌مدت نیست.`
      });
    } else if (workingCapital.current_ratio < 1.2) {
      riskScore += 15;
      riskFactors.push({
        severity: 'MEDIUM',
        code: 'RISK_TIGHT_CURRENT_RATIO',
        title: 'حاشیه امن اندک نقدینگی',
        message: `نسبت جاری (${workingCapital.current_ratio}) شکننده است.`
      });
    }

    // Factor 2: Runway
    if (runway.monthly_burn_rate > 0 && runway.runway_months < 3.0) {
      riskScore += 40;
      riskFactors.push({
        severity: 'CRITICAL',
        code: 'RISK_CASH_STARVATION',
        title: 'خطر انجماد نقدینگی',
        message: `طول عمر بقای نقدی تنها ${runway.runway_months} ماه تخمین زده می‌شود.`
      });
    }

    // Factor 3: DSO / Collection Risk
    if (ccc.metrics.dso_days > 90) {
      riskScore += 20;
      riskFactors.push({
        severity: 'MEDIUM',
        code: 'RISK_SLOW_COLLECTIONS',
        title: 'طولانی بودن دوره وصول مطالبات',
        message: `دوره وصول (${ccc.metrics.dso_days} روز) نشان‌دهنده خواب بالای سرمایه نزد مشتریان است.`
      });
    }

    // Factor 4: Operating Profitability
    if (profitability.revenue > 0 && profitability.operating_income_ebit < 0) {
      riskScore += 25;
      riskFactors.push({
        severity: 'HIGH',
        code: 'RISK_OPERATING_LOSS',
        title: 'زیان عملیاتی',
        message: `عملیات جاری شرکت زیان‌ده است (حاشیه عملیاتی: ${profitability.operating_margin_percentage}%).`
      });
    }

    riskScore = Math.min(100, Math.max(0, riskScore));

    let riskTier = 'LOW';
    let riskTierFa = 'ریسک پایین / سطح تاب‌آوری بالا';
    if (riskScore >= 70) {
      riskTier = 'CRITICAL';
      riskTierFa = 'ریسک بحرانی / نیازمند اقدام فوری هیئت مدیره';
    } else if (riskScore >= 45) {
      riskTier = 'HIGH';
      riskTierFa = 'ریسک بالا / ضرورت پایش روزانه نقدینگی';
    } else if (riskScore >= 25) {
      riskTier = 'MEDIUM';
      riskTierFa = 'ریسک متوسط / کنترل سرمایه در گردش';
    }

    return {
      overall_risk_score: riskScore,
      risk_tier: riskTier,
      risk_tier_fa: riskTierFa,
      active_threat_count: riskFactors.length,
      identified_factors: riskFactors
    };
  }

  /**
   * Generates Complete Executive Briefing Snapshot (Chapter 026/040/073):
   * Ready for direct display in executive dashboards and board reporting.
   */
  generateExecutiveDashboard({ periodDays = 365, monthlyExpensesOverride = null } = {}) {
    const workingCapital = this.calculateWorkingCapital();
    const ccc = this.calculateCashConversionCycle({ periodDays });
    const profitability = this.calculateProfitability();
    const runway = this.calculateCashBurnAndRunway({ monthlyExpensesOverride });
    const riskTwin = this.evaluateEnterpriseRiskTwin();

    return {
      generated_at: new Date().toISOString(),
      executive_summary: {
        total_liquid_cash: workingCapital.current_assets.cash_and_bank,
        working_capital: workingCapital.net_working_capital,
        current_ratio: workingCapital.current_ratio,
        quick_ratio: workingCapital.quick_ratio,
        revenue: profitability.revenue,
        gross_profit: profitability.gross_profit,
        operating_income: profitability.operating_income_ebit,
        dso_days: ccc.metrics.dso_days,
        dio_days: ccc.metrics.dio_days,
        dpo_days: ccc.metrics.dpo_days,
        ccc_days: ccc.metrics.cash_conversion_cycle_days,
        runway_months: runway.runway_months,
        risk_score: riskTwin.overall_risk_score,
        risk_tier_fa: riskTwin.risk_tier_fa
      },
      detailed_sections: {
        working_capital: workingCapital,
        cash_conversion_cycle: ccc,
        profitability: profitability,
        cash_runway: runway,
        risk_digital_twin: riskTwin
      }
    };
  }
}

module.exports = { FinancialAnalyticsEngine };
