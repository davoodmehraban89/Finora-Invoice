/**
 * Finora Payroll Tax Engine
 * Governed strictly by Chapters 035, 049, 066, 125, 239.
 * 
 * Invariants:
 * 1. ZERO hardcoded exemption ceilings or brackets in core logic.
 * 2. Progressive brackets resolved dynamically by fiscal year & effective date.
 * 3. Exact mathematical breakdown of taxable base, exemption, and progressive tax tiers.
 */

class PayrollTaxEngine {
  constructor() {
    this.taxBrackets = []; // versioned packages
  }

  registerTaxPackage({
    package_id,
    fiscal_year, // e.g., '1404', '1405'
    effective_from,
    effective_to = '9999-12-31',
    monthly_exemption_ceiling, // سقف معافیت ماهانه ماده ۸۴ (ریال)
    brackets = [], // array of { min, max, rate }
    source_authority = 'سازمان امور مالیاتی - بخشنامه مالیات بر درآمد حقوق ماده ۸۴ و ۸۵ ق.م.م',
    status = 'active'
  }) {
    if (!package_id || !fiscal_year || monthly_exemption_ceiling === undefined) {
      throw new Error('Incomplete PayrollTaxPackage definition.');
    }

    const pkg = {
      package_id,
      fiscal_year,
      effective_from,
      effective_to,
      monthly_exemption_ceiling: Number(monthly_exemption_ceiling),
      brackets: brackets.map(b => ({
        min: Number(b.min),
        max: b.max === null || b.max === undefined ? Infinity : Number(b.max),
        rate: Number(b.rate)
      })),
      source_authority,
      status
    };

    this.taxBrackets.push(pkg);
    return pkg;
  }

  resolvePackage(effectiveDate) {
    const pkg = this.taxBrackets.find(p => 
      p.status === 'active' &&
      effectiveDate >= p.effective_from &&
      effectiveDate <= p.effective_to
    );

    if (!pkg) {
      throw new Error(`Compliance Exception: No active payroll tax package found for date '${effectiveDate}'.`);
    }
    return pkg;
  }

  calculateMonthlySalaryTax({ taxable_gross, effective_date }) {
    const pkg = this.resolvePackage(effective_date);
    const gross = Number(taxable_gross) || 0;
    const ceiling = pkg.monthly_exemption_ceiling;

    if (gross <= ceiling) {
      return {
        package_id: pkg.package_id,
        fiscal_year: pkg.fiscal_year,
        taxable_gross: gross,
        exemption_applied: gross,
        net_taxable_base: 0,
        tax_amount: 0,
        bracket_breakdown: []
      };
    }

    const netTaxableBase = gross - ceiling;
    let remainingToTax = netTaxableBase;
    let totalTax = 0;
    const breakdown = [];

    for (const b of pkg.brackets) {
      if (remainingToTax <= 0) break;

      const bracketCapacity = b.max - b.min;
      const amountInBracket = Math.min(remainingToTax, bracketCapacity);
      const taxForBracket = Math.round(amountInBracket * b.rate);

      breakdown.push({
        min: b.min,
        max: b.max,
        rate: b.rate,
        taxable_amount: amountInBracket,
        tax_amount: taxForBracket
      });

      totalTax += taxForBracket;
      remainingToTax -= amountInBracket;
    }

    return {
      package_id: pkg.package_id,
      fiscal_year: pkg.fiscal_year,
      taxable_gross: gross,
      exemption_applied: ceiling,
      net_taxable_base: netTaxableBase,
      tax_amount: totalTax,
      bracket_breakdown: breakdown
    };
  }
}

// Built-in Seed: Iranian Statutory Salary Tax Brackets (Effective Dated)
const defaultPayrollTaxEngine = new PayrollTaxEngine();

// 1403-1405 Progressive Brackets (Monthly ceiling: 120,000,000 Rials / 12M Tomans)
// Tier 1: 0 - 120,000,000 Rials (0% Exempt)
// Tier 2: 120,000,001 - 165,000,000 Rials (45,000,000 span @ 10%)
// Tier 3: 165,000,001 - 270,000,000 Rials (105,000,000 span @ 15%)
// Tier 4: 270,000,001 - 400,000,000 Rials (130,000,000 span @ 20%)
// Tier 5: Above 400,000,000 Rials @ 30%
defaultPayrollTaxEngine.registerTaxPackage({
  package_id: 'IR-PAYROLL-TAX-1403-1405',
  fiscal_year: '1405',
  effective_from: '2024-03-20',
  effective_to: '2028-03-20',
  monthly_exemption_ceiling: 120000000, // 120M Rials exempt
  brackets: [
    { min: 0, max: 45000000, rate: 0.10 },          // First 45M taxable @ 10%
    { min: 45000000, max: 150000000, rate: 0.15 },  // Next 105M taxable @ 15%
    { min: 150000000, max: 280000000, rate: 0.20 }, // Next 130M taxable @ 20%
    { min: 280000000, max: Infinity, rate: 0.30 }   // Surplus @ 30%
  ]
});

module.exports = { PayrollTaxEngine, defaultPayrollTaxEngine };
