/**
 * Finora Versioned Tax & Compliance Rule Engine
 * Governed strictly by Chapters 016, 017, 031, 046, 063, 232, 233.
 * 
 * Invariants:
 * 1. ZERO hardcoded statutory rates.
 * 2. Every calculation resolves rule packages by jurisdiction & effective date.
 * 3. Historical transactions evaluate against the rule package active on transaction date.
 */

class TaxRuleEngine {
  constructor() {
    this.rulePackages = [];
  }

  registerRulePackage({
    package_id,
    jurisdiction, // e.g. 'IR', 'EU', 'GCC'
    rule_version, // e.g. '1404.1', '1405.1'
    source_authority, // e.g. 'سازمان امور مالیاتی کشور - ماده ۲۶ قانون مالیات بر ارزش افزوده'
    effective_from,
    effective_to = '9999-12-31',
    standard_vat_rate, // e.g. 0.10 (10%)
    exempt_categories = [],
    special_rates = {},
    status = 'active'
  }) {
    if (!package_id || !jurisdiction || !rule_version || standard_vat_rate === undefined) {
      throw new Error('Incomplete TaxRulePackage definition.');
    }

    const pkg = {
      package_id,
      jurisdiction,
      rule_version,
      source_authority,
      effective_from,
      effective_to,
      standard_vat_rate: Number(standard_vat_rate),
      exempt_categories: Array.isArray(exempt_categories) ? exempt_categories : [],
      special_rates: special_rates || {},
      status
    };

    this.rulePackages.push(pkg);
    return pkg;
  }

  resolveRulePackage(jurisdiction, transactionDate) {
    const pkg = this.rulePackages.find(p => 
      p.jurisdiction === jurisdiction &&
      p.status === 'active' &&
      transactionDate >= p.effective_from &&
      transactionDate <= p.effective_to
    );

    if (!pkg) {
      throw new Error(
        `Compliance Exception: No active tax rule package found for jurisdiction '${jurisdiction}' on date '${transactionDate}'.`
      );
    }
    return pkg;
  }

  calculateLineTax({
    item_category = 'general',
    is_taxable = true,
    gross_amount,
    discount_amount = 0,
    jurisdiction = 'IR',
    transaction_date
  }) {
    const pkg = this.resolveRulePackage(jurisdiction, transaction_date);
    const netTaxableAmount = Math.max(0, Number(gross_amount) - Number(discount_amount));

    if (!is_taxable || pkg.exempt_categories.includes(item_category)) {
      return {
        rule_package_id: pkg.package_id,
        rule_version: pkg.rule_version,
        tax_rate: 0,
        tax_amount: 0,
        net_taxable_amount: netTaxableAmount,
        total_line_amount: netTaxableAmount,
        is_exempt: true,
        source_authority: pkg.source_authority
      };
    }

    const applicableRate = (item_category in pkg.special_rates)
      ? pkg.special_rates[item_category]
      : pkg.standard_vat_rate;

    const taxAmount = Math.round(netTaxableAmount * applicableRate);
    const totalLineAmount = netTaxableAmount + taxAmount;

    return {
      rule_package_id: pkg.package_id,
      rule_version: pkg.rule_version,
      tax_rate: applicableRate,
      tax_amount: taxAmount,
      net_taxable_amount: netTaxableAmount,
      total_line_amount: totalLineAmount,
      is_exempt: false,
      source_authority: pkg.source_authority
    };
  }
}

// Built-in Seed: Iranian Tax Rule Packages (Effective dated per statutory enactments)
const defaultTaxEngine = new TaxRuleEngine();

// Historic VAT 9% (Prior to 1403/01/01)
defaultTaxEngine.registerRulePackage({
  package_id: 'IR-VAT-1402',
  jurisdiction: 'IR',
  rule_version: '1402.1',
  source_authority: 'قانون مالیات بر ارزش افزوده - نرخ ۹ درصد',
  effective_from: '2020-01-01',
  effective_to: '2024-03-19',
  standard_vat_rate: 0.09,
  exempt_categories: ['basic_food', 'medical', 'education'],
  special_rates: { 'tobacco': 0.15 }
});

// Current VAT 10% (Effective from 1403/01/01 onwards per Budget Law)
defaultTaxEngine.registerRulePackage({
  package_id: 'IR-VAT-1403-1405',
  jurisdiction: 'IR',
  rule_version: '1403.1',
  source_authority: 'قانون بودجه و مالیات بر ارزش افزوده - نرخ ۱۰ درصد',
  effective_from: '2024-03-20',
  effective_to: '2028-03-20',
  standard_vat_rate: 0.10,
  exempt_categories: ['basic_food', 'medical', 'education', 'books'],
  special_rates: { 'tobacco': 0.16 }
});

module.exports = { TaxRuleEngine, defaultTaxEngine };
