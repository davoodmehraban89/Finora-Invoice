/**
 * Finora Social Security Organization (SSO) Insurance Engine
 * Governed strictly by Chapters 035, 049, 066, 143, 239.
 * Conforms to Articles 36 & 39 of the Iranian Social Security Law.
 */

class SocialSecurityEngine {
  constructor(options = {}) {
    // Statutory ratios per Iranian Social Security Act:
    this.employeeRate = options.employeeRate !== undefined ? options.employeeRate : 0.07; // 7%
    this.employerRate = options.employerRate !== undefined ? options.employerRate : 0.20; // 20%
    this.unemploymentRate = options.unemploymentRate !== undefined ? options.unemploymentRate : 0.03; // 3%
    this.monthlyCeiling = options.monthlyCeiling || 500000000; // 500M Rials statutory insurable ceiling
  }

  calculateContributions({ insurable_gross, is_exempt = false }) {
    if (is_exempt) {
      return {
        insurable_base: 0,
        employee_share: 0,
        employer_share: 0,
        unemployment_share: 0,
        total_employer_contribution: 0,
        total_sso_contribution: 0
      };
    }

    const rawGross = Number(insurable_gross) || 0;
    // Cap at statutory ceiling
    const insurableBase = Math.min(rawGross, this.monthlyCeiling);

    const employeeShare = Math.round(insurableBase * this.employeeRate);
    const employerShare = Math.round(insurableBase * this.employerRate);
    const unemploymentShare = Math.round(insurableBase * this.unemploymentRate);
    const totalEmployerContribution = employerShare + unemploymentShare; // 23%
    const totalSsoContribution = employeeShare + totalEmployerContribution; // 30%

    return {
      insurable_base: insurableBase,
      employee_rate: this.employeeRate,
      employer_rate: this.employerRate,
      unemployment_rate: this.unemploymentRate,
      employee_share: employeeShare,
      employer_share: employerShare,
      unemployment_share: unemploymentShare,
      total_employer_contribution: totalEmployerContribution,
      total_sso_contribution: totalSsoContribution
    };
  }
}

const defaultSocialSecurityEngine = new SocialSecurityEngine();

module.exports = { SocialSecurityEngine, defaultSocialSecurityEngine };
