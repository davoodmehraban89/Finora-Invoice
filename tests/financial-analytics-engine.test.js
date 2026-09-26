const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { GeneralLedger } = require('../src/ledger/general-ledger');
const { FinancialAnalyticsEngine } = require('../src/analytics/financial-analytics-engine');

describe('Executive Financial Intelligence & Analytics Engine (Chapters 026, 040, 056, 073, 100, 124, 150, 176)', () => {
  let ledger;
  let analytics;

  beforeEach(() => {
    ledger = new GeneralLedger();
    ledger.registerAccount({ code: '1101', name: 'Cash and Bank', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '1102', name: 'Notes Receivable - Vault', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '1103', name: 'Accounts Receivable', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '1104', name: 'Notes in Collection', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '1105', name: 'Inventory Asset', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '2101', name: 'Accounts Payable', category: 'liability', nature: 'credit' });
    ledger.registerAccount({ code: '2102', name: 'VAT Payable', category: 'liability', nature: 'credit' });
    ledger.registerAccount({ code: '2104', name: 'Notes Payable', category: 'liability', nature: 'credit' });
    ledger.registerAccount({ code: '4101', name: 'Sales Revenue', category: 'revenue', nature: 'credit' });

    analytics = new FinancialAnalyticsEngine({ ledger });
  });

  it('Calculates working capital, current ratio, and quick ratio', () => {
    const metrics = analytics.calculateLiquidityMetrics({
      cashAndBank: 150000000,
      accountsReceivable: 250000000,
      notesReceivable: 100000000,
      inventory: 200000000, // Total Current Assets = 700M
      accountsPayable: 200000000,
      notesPayable: 100000000,
      vatPayable: 50000000 // Total Current Liabilities = 350M
    });

    assert.strictEqual(metrics.current_assets, 700000000);
    assert.strictEqual(metrics.current_liabilities, 350000000);
    assert.strictEqual(metrics.working_capital, 350000000);
    assert.strictEqual(metrics.current_ratio, 2.0); // 700 / 350
    assert.strictEqual(metrics.quick_ratio, 1.43); // 500 / 350
    assert.strictEqual(metrics.liquidity_status, 'HEALTHY');
  });

  it('Calculates Cash Conversion Cycle (CCC): DSO, DIO, DPO', () => {
    // Annual Credit Sales: 1,200,000,000, Accounts Receivable: 200,000,000 -> DSO = (200M/1200M)*365 = 61 days
    // COGS: 800,000,000, Inventory: 100,000,000 -> DIO = (100M/800M)*365 = 46 days
    // Accounts Payable: 150,000,000 -> DPO = (150M/800M)*365 = 68 days
    // CCC = 46 + 61 - 68 = 39 days
    const cccResult = analytics.calculateCashConversionCycle({
      creditSales: 1200000000,
      accountsReceivable: 200000000,
      cogs: 800000000,
      inventory: 100000000,
      accountsPayable: 150000000,
      periodDays: 365
    });

    assert.strictEqual(cccResult.days_sales_outstanding_dso, 61);
    assert.strictEqual(cccResult.days_inventory_outstanding_dio, 46);
    assert.strictEqual(cccResult.days_payable_outstanding_dpo, 68);
    assert.strictEqual(cccResult.cash_conversion_cycle_days, 39);
    assert.strictEqual(cccResult.working_capital_efficiency, 'EXCELLENT');
  });

  it('Calculates monthly cash burn and runway in months', () => {
    const runway = analytics.calculateCashRunway({
      totalLiquidCash: 600000000,
      monthlyOperatingExpenses: 150000000,
      monthlyRevenues: 100000000 // Net Burn = 50M/month -> 600M / 50M = 12 months
    });

    assert.strictEqual(runway.net_monthly_burn, 50000000);
    assert.strictEqual(runway.runway_months, 12.0);
    assert.strictEqual(runway.status, 'SECURE');
  });

  it('Performs Accounts Receivable Aging Analysis across duration buckets', () => {
    const invoices = [
      { id: 'inv_01', total_final_amount: 50000000, due_date: '2026-09-15', status: 'posted' }, // 10 days ago (0-30)
      { id: 'inv_02', total_final_amount: 30000000, due_date: '2026-08-10', status: 'posted' }, // 46 days ago (31-60)
      { id: 'inv_03', total_final_amount: 20000000, due_date: '2026-07-01', status: 'posted' }, // 86 days ago (61-90)
      { id: 'inv_04', total_final_amount: 40000000, due_date: '2026-05-01', status: 'posted' }  // 147 days ago (90+)
    ];

    const aging = analytics.calculateReceivablesAging(invoices, '2026-09-25');
    assert.strictEqual(aging.total_receivables, 140000000);
    assert.strictEqual(aging.total_overdue, 90000000); // 30M + 20M + 40M
    assert.strictEqual(aging.buckets.current_0_30.amount, 50000000);
    assert.strictEqual(aging.buckets.past_due_31_60.amount, 30000000);
    assert.strictEqual(aging.buckets.past_due_61_90.amount, 20000000);
    assert.strictEqual(aging.buckets.past_due_over_90.amount, 40000000);
  });

  it('Calculates profitability margins: Gross, Operating and Net Margin', () => {
    const margins = analytics.calculateProfitability({
      revenue: 1000000000,
      cogs: 600000000,
      operatingExpenses: 250000000,
      taxExpense: 37500000 // 25% corporate tax on 150M EBT
    });

    assert.strictEqual(margins.gross_profit, 400000000);
    assert.strictEqual(margins.gross_margin_pct, 40.0);
    assert.strictEqual(margins.operating_profit, 150000000);
    assert.strictEqual(margins.operating_margin_pct, 15.0);
    assert.strictEqual(margins.net_profit, 112500000);
    assert.strictEqual(margins.net_margin_pct, 11.25);
  });
});
