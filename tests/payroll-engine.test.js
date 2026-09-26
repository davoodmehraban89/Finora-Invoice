const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { GeneralLedger } = require('../src/ledger/general-ledger');
const { PostingEngine } = require('../src/ledger/posting-engine');
const { PayrollEngine } = require('../src/payroll/payroll-engine');
const { defaultPayrollTaxEngine } = require('../src/payroll/payroll-tax-engine');
const { defaultSocialSecurityEngine } = require('../src/payroll/social-security-engine');

describe('Enterprise Payroll, Social Security & Salary Tax Engine (Chapters 035, 049, 066, 125, 143, 239)', () => {
  let ledger;
  let postingEngine;
  let payrollEngine;

  beforeEach(() => {
    ledger = new GeneralLedger();
    ledger.registerAccount({ code: '1101', name: 'Cash and Bank', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '2101', name: 'Current Payables & Deductions', category: 'liability', nature: 'credit' });
    ledger.registerAccount({ code: '2102', name: 'Tax Organization Payable', category: 'liability', nature: 'credit' });
    ledger.registerAccount({ code: '5101', name: 'Personnel & Salary Expense', category: 'expense', nature: 'debit' });
    postingEngine = new PostingEngine(ledger);

    payrollEngine = new PayrollEngine({
      postingEngine,
      taxEngine: defaultPayrollTaxEngine,
      ssoEngine: defaultSocialSecurityEngine
    });
  });

  it('Calculates statutory Social Security (SSO) contributions: 7% employee and 23% employer', () => {
    // 100,000,000 Rials insurable gross
    const sso = defaultSocialSecurityEngine.calculateContributions({
      insurable_gross: 100000000,
      is_exempt: false
    });

    assert.strictEqual(sso.insurable_base, 100000000);
    assert.strictEqual(sso.employee_share, 7000000); // 7%
    assert.strictEqual(sso.employer_share, 20000000); // 20%
    assert.strictEqual(sso.unemployment_share, 3000000); // 3%
    assert.strictEqual(sso.total_employer_contribution, 23000000); // 23%
    assert.strictEqual(sso.total_sso_contribution, 30000000); // 30%
  });

  it('Applies progressive salary tax brackets per Article 84 and 85 Tax Code', () => {
    // Case 1: Below monthly exemption ceiling (100,000,000 <= 120,000,000) -> 0 Tax
    const belowTax = defaultPayrollTaxEngine.calculateMonthlySalaryTax({
      taxable_gross: 100000000,
      effective_date: '2026-09-25'
    });
    assert.strictEqual(belowTax.tax_amount, 0);
    assert.strictEqual(belowTax.exemption_applied, 100000000);

    // Case 2: Above ceiling (150,000,000 Rials)
    // 150M - 120M exemption = 30M taxable in Tier 1 (10%) -> 3,000,000 Rials tax
    const tier1Tax = defaultPayrollTaxEngine.calculateMonthlySalaryTax({
      taxable_gross: 150000000,
      effective_date: '2026-09-25'
    });
    assert.strictEqual(tier1Tax.net_taxable_base, 30000000);
    assert.strictEqual(tier1Tax.tax_amount, 3000000);

    // Case 3: In Tier 2 (180,000,000 Rials)
    // 180M - 120M exemption = 60M taxable:
    // First 45M @ 10% = 4,500,000
    // Remaining 15M @ 15% = 2,250,000
    // Total Tax = 6,750,000 Rials
    const tier2Tax = defaultPayrollTaxEngine.calculateMonthlySalaryTax({
      taxable_gross: 180000000,
      effective_date: '2026-09-25'
    });
    assert.strictEqual(tier2Tax.net_taxable_base, 60000000);
    assert.strictEqual(tier2Tax.tax_amount, 6750000);
  });

  it('Calculates employee salary with statutory overtime (1.4x factor) and allowances', () => {
    const emp = payrollEngine.registerEmployee({
      id: 'emp_t1',
      tenant_id: 'ten_01',
      organization_id: 'org_01',
      employee_code: 'EMP-001',
      first_name: 'رضا',
      last_name: 'کریمی',
      base_salary: 110000000, // 110M
      housing_allowance: 9000000, // 9M
      grocery_allowance: 14000000, // 14M
      child_count: 2,
      child_allowance_per_child: 7166184
    });

    // 10 hours overtime:
    // Hourly rate = 110,000,000 / 220 = 500,000 Rials
    // Overtime rate = 500,000 * 1.4 = 700,000 Rials/hr
    // Overtime pay = 10 * 700,000 = 7,000,000 Rials
    const slip = payrollEngine.calculateEmployeeSalary({
      employee_id: emp.id,
      effective_date: '2026-09-25',
      overtime_hours: 10,
      bonus_amount: 5000000
    });

    assert.strictEqual(slip.overtime_pay, 7000000);
    assert.strictEqual(slip.child_allowance, 2 * 7166184);
    // Gross = 110M + 9M + 14M + 14,332,368 + 7M + 5M = 159,332,368
    assert.strictEqual(slip.gross_earnings, 110000000 + 9000000 + 14000000 + (2 * 7166184) + 7000000 + 5000000);
    assert.ok(slip.employee_sso_share > 0);
    assert.ok(slip.employer_sso_contribution > 0);
    assert.ok(slip.net_payable > 0);
    assert.strictEqual(slip.total_deductions, slip.employee_sso_share + slip.salary_tax);
    assert.strictEqual(slip.net_payable, slip.gross_earnings - slip.total_deductions);
  });

  it('Executes monthly payroll run and automatically posts balanced Double-Entry journal to General Ledger', () => {
    payrollEngine.registerEmployee({
      id: 'emp_run_1',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      employee_code: 'EMP-01',
      first_name: 'داوود',
      last_name: 'مهربان',
      base_salary: 150000000,
      housing_allowance: 9000000,
      grocery_allowance: 14000000
    });

    payrollEngine.registerEmployee({
      id: 'emp_run_2',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      employee_code: 'EMP-02',
      first_name: 'مریم',
      last_name: 'اسکندری',
      base_salary: 120000000,
      housing_allowance: 9000000,
      grocery_allowance: 14000000
    });

    const runResult = payrollEngine.executeMonthlyPayrollRun({
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      period_key: '1405-06',
      effective_date: '2026-09-25',
      overtime_records: { 'emp_run_1': 10 },
      actor: 'hr_lead'
    });

    assert.strictEqual(runResult.success, true);
    assert.strictEqual(runResult.isIdempotentReplay, false);
    const run = runResult.payrollRun;
    assert.strictEqual(run.employee_count, 2);
    assert.strictEqual(run.accounting_posted, true);
    assert.ok(run.journal_id.startsWith('JRN-'));

    // Verify General Ledger Trial Balance: MUST BE BALANCED!
    const tb = ledger.getTrialBalance();
    assert.strictEqual(tb.isBalanced, true);
    assert.strictEqual(tb.difference, 0);

    // Total Debits must equal Total Credits
    assert.strictEqual(tb.totalDebit, tb.totalCredit);

    // Verify Idempotency: Running again for same period returns cached run without duplicate posting
    const replayResult = payrollEngine.executeMonthlyPayrollRun({
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      period_key: '1405-06',
      effective_date: '2026-09-25'
    });
    assert.strictEqual(replayResult.isIdempotentReplay, true);
    assert.strictEqual(replayResult.payrollRun.run_id, run.run_id);
    assert.strictEqual(ledger.journalEntries.length, 1); // exactly 1 journal entry posted!
  });
});
