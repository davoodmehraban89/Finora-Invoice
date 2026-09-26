/**
 * Finora Payroll & Human Resources Engine
 * Governed strictly by Chapters 035, 049, 066, 093, 125, 143, 239, 242, 252.
 */

const { defaultPayrollTaxEngine } = require('./payroll-tax-engine');
const { defaultSocialSecurityEngine } = require('./social-security-engine');

class PayrollEngine {
  constructor({ postingEngine = null, taxEngine = defaultPayrollTaxEngine, ssoEngine = defaultSocialSecurityEngine }) {
    this.postingEngine = postingEngine;
    this.taxEngine = taxEngine;
    this.ssoEngine = ssoEngine;
    this.employees = new Map(); // id -> Employee
    this.payrollRuns = new Map(); // periodKey -> PayrollRun
  }

  registerEmployee({
    id,
    tenant_id,
    organization_id,
    employee_code,
    first_name,
    last_name,
    national_id,
    department = 'عمومی',
    position = 'کارشناس',
    hire_date = new Date().toISOString().split('T')[0],
    base_salary = 100000000, // 100M Rials
    housing_allowance = 9000000, // حق مسکن (ریال)
    grocery_allowance = 14000000, // بن کارگری (ریال)
    child_allowance_per_child = 7166184, // حق اولاد مصوب (ریال)
    child_count = 0,
    marital_status = 'single',
    insurance_exempt = false,
    bank_account_number = null,
    iban = null,
    status = 'active'
  }) {
    if (!id || !tenant_id || !organization_id || !employee_code || !first_name || !last_name) {
      throw new Error('Missing mandatory employee profile attributes.');
    }

    const emp = {
      id,
      tenant_id,
      organization_id,
      employee_code,
      first_name,
      last_name,
      full_name: `${first_name} ${last_name}`.trim(),
      national_id,
      department,
      position,
      hire_date,
      base_salary: Number(base_salary) || 0,
      housing_allowance: Number(housing_allowance) || 0,
      grocery_allowance: Number(grocery_allowance) || 0,
      child_allowance_per_child: Number(child_allowance_per_child) || 0,
      child_count: Number(child_count) || 0,
      marital_status,
      insurance_exempt: Boolean(insurance_exempt),
      bank_account_number,
      iban,
      status,
      created_at: new Date().toISOString()
    };

    this.employees.set(id, emp);
    return emp;
  }

  getEmployee(id) {
    return this.employees.get(id);
  }

  listEmployees(tenantId = null) {
    const list = Array.from(this.employees.values());
    if (tenantId) return list.filter(e => e.tenant_id === tenantId);
    return list;
  }

  calculateEmployeeSalary({
    employee_id,
    effective_date,
    overtime_hours = 0,
    bonus_amount = 0,
    loan_deduction = 0
  }) {
    const emp = this.employees.get(employee_id);
    if (!emp) throw new Error(`Employee '${employee_id}' not found.`);

    // 1. Calculate Statutory Fixed Allowances
    const childAllowanceTotal = emp.child_count * emp.child_allowance_per_child;

    // 2. Overtime Pay Calculation per Iranian Labor Law:
    // Statutory hourly wage = base_salary / 220 hours
    // Overtime rate = hourly wage * 1.4
    const hourlyWage = emp.base_salary > 0 ? (emp.base_salary / 220) : 0;
    const overtimeHourlyRate = Math.round(hourlyWage * 1.4);
    const overtimePay = Math.round(Number(overtime_hours) * overtimeHourlyRate);

    // 3. Gross Earnings
    const grossEarnings = emp.base_salary +
      emp.housing_allowance +
      emp.grocery_allowance +
      childAllowanceTotal +
      overtimePay +
      Number(bonus_amount);

    // 4. Social Security Insurable Base (Child allowance is exempt from SSO)
    const insurableGross = Math.max(0, grossEarnings - childAllowanceTotal);
    const ssoContributions = this.ssoEngine.calculateContributions({
      insurable_gross: insurableGross,
      is_exempt: emp.insurance_exempt
    });

    // 5. Salary Tax Calculation (Housing and grocery have statutory treatment)
    const taxResult = this.taxEngine.calculateMonthlySalaryTax({
      taxable_gross: grossEarnings,
      effective_date
    });

    // 6. Deductions & Net Payable
    const totalDeductions = ssoContributions.employee_share + taxResult.tax_amount + Number(loan_deduction);
    const netPayable = grossEarnings - totalDeductions;
    const totalEmployerCost = grossEarnings + ssoContributions.total_employer_contribution;

    return {
      employee_id: emp.id,
      employee_code: emp.employee_code,
      full_name: emp.full_name,
      department: emp.department,
      position: emp.position,
      effective_date,
      // Earnings Breakdown
      base_salary: emp.base_salary,
      housing_allowance: emp.housing_allowance,
      grocery_allowance: emp.grocery_allowance,
      child_allowance: childAllowanceTotal,
      overtime_hours: Number(overtime_hours),
      overtime_pay: overtimePay,
      bonus_amount: Number(bonus_amount),
      gross_earnings: grossEarnings,
      // Deductions Breakdown
      employee_sso_share: ssoContributions.employee_share,
      salary_tax: taxResult.tax_amount,
      loan_deduction: Number(loan_deduction),
      total_deductions: totalDeductions,
      // Net & Employer Cost
      net_payable: netPayable,
      employer_sso_contribution: ssoContributions.total_employer_contribution,
      total_sso_contribution: ssoContributions.total_sso_contribution,
      total_employer_cost: totalEmployerCost,
      tax_details: taxResult
    };
  }

  executeMonthlyPayrollRun({
    tenant_id,
    organization_id,
    period_key, // e.g., '1405-06'
    effective_date, // e.g., '2026-09-25'
    overtime_records = {}, // employee_id -> hours
    bonus_records = {}, // employee_id -> bonus
    actor = 'hr_manager'
  }) {
    if (!tenant_id || !organization_id || !period_key || !effective_date) {
      throw new Error('Missing required payroll run parameters.');
    }

    const runKey = `${tenant_id}:${organization_id}:${period_key}`;
    if (this.payrollRuns.has(runKey)) {
      return {
        success: true,
        isIdempotentReplay: true,
        payrollRun: this.payrollRuns.get(runKey),
        message: `Payroll run for period '${period_key}' was already executed.`
      };
    }

    const activeEmployees = Array.from(this.employees.values()).filter(e => 
      e.tenant_id === tenant_id &&
      e.organization_id === organization_id &&
      e.status === 'active'
    );

    if (activeEmployees.length === 0) {
      throw new Error(`No active employees found in organization '${organization_id}'.`);
    }

    const payslips = [];
    let sumGrossEarnings = 0;
    let sumNetPayable = 0;
    let sumEmployeeSso = 0;
    let sumEmployerSso = 0;
    let sumTotalSso = 0;
    let sumSalaryTax = 0;
    let sumTotalEmployerCost = 0;

    for (const emp of activeEmployees) {
      const overtime = overtime_records[emp.id] || 0;
      const bonus = bonus_records[emp.id] || 0;

      const slip = this.calculateEmployeeSalary({
        employee_id: emp.id,
        effective_date,
        overtime_hours: overtime,
        bonus_amount: bonus
      });

      payslips.push(slip);
      sumGrossEarnings += slip.gross_earnings;
      sumNetPayable += slip.net_payable;
      sumEmployeeSso += slip.employee_sso_share;
      sumEmployerSso += slip.employer_sso_contribution;
      sumTotalSso += slip.total_sso_contribution;
      sumSalaryTax += slip.salary_tax;
      sumTotalEmployerCost += slip.total_employer_cost;
    }

    const payrollRun = {
      run_id: `PAYROLL-${period_key}-${Date.now()}`,
      tenant_id,
      organization_id,
      period_key,
      effective_date,
      executed_at: new Date().toISOString(),
      executed_by: actor,
      employee_count: activeEmployees.length,
      totals: {
        gross_earnings: sumGrossEarnings,
        net_payable: sumNetPayable,
        employee_sso: sumEmployeeSso,
        employer_sso: sumEmployerSso,
        total_sso_payable: sumTotalSso,
        salary_tax_payable: sumSalaryTax,
        total_employer_cost: sumTotalEmployerCost
      },
      payslips,
      journal_id: null,
      accounting_posted: false
    };

    // Construct and post Double-Entry Journal Entry to General Ledger if postingEngine is available
    if (this.postingEngine) {
      // General Ledger Invariant:
      // Total Debits = Gross Salary Expense (5102) + Employer Insurance Expense (5103)
      // Total Credits = Salary Payable (2103) + Social Security Payable (2104) + Tax Payable (2105)
      // Debits (sumGrossEarnings + sumEmployerSso) === Credits (sumNetPayable + sumTotalSso + sumSalaryTax)
      const accountingEvent = {
        event_id: `EVT-PAYROLL-${period_key}`,
        event_type: 'PAYMENT_DISBURSED',
        tenant_id,
        organization_id,
        occurred_at: new Date().toISOString(),
        effective_date,
        source_module: 'payroll',
        source_entity_id: payrollRun.run_id,
        currency: 'IRR',
        idempotency_key: `IDEMP-PAYROLL-${runKey}`,
        description: `حقوق و مزایای کارکنان دوره ${period_key} (تعداد پرسنل: ${activeEmployees.length})`,
        lines: [
          {
            account_code: '5101', // Salary and Wages Expense (هزینه حقوق و دستمزد)
            debit: sumGrossEarnings,
            credit: 0,
            description: `هزینه ناخالص حقوق دوره ${period_key}`
          },
          {
            account_code: '5101', // Employer Insurance Expense 23% (هزینه بیمه سهم کارفرما)
            debit: sumEmployerSso,
            credit: 0,
            description: `هزینه بیمه سهم کارفرما (۲۳٪) دوره ${period_key}`
          },
          {
            account_code: '2101', // Net Salary Payable to Employees (حقوق پرداختنی کارکنان)
            debit: 0,
            credit: sumNetPayable,
            description: `حقوق خالص پرداختنی به پرسنل دوره ${period_key}`
          },
          {
            account_code: '2101', // Total Social Security Payable 30% (بیمه پرداختنی سازمان تأمین اجتماعی)
            debit: 0,
            credit: sumTotalSso,
            description: `بیمه تأمین اجتماعی پرداختنی (۳۰٪) دوره ${period_key}`
          }
        ]
      };

      if (sumSalaryTax > 0) {
        accountingEvent.lines.push({
          account_code: '2102', // Salary Income Tax Payable (مالیات حقوق پرداختنی ماده ۸۶)
          debit: 0,
          credit: sumSalaryTax,
          description: `مالیات حقوق کسر شده ماده ۸۴ و ۸۵ ق.م.م دوره ${period_key}`
        });
      }

      const postResult = this.postingEngine.postEvent(accountingEvent, actor);
      payrollRun.journal_id = postResult.journalEntry.journal_id;
      payrollRun.accounting_posted = true;
    }

    this.payrollRuns.set(runKey, payrollRun);
    return {
      success: true,
      isIdempotentReplay: false,
      payrollRun
    };
  }
}

module.exports = { PayrollEngine };
