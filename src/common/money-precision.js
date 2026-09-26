/**
 * Finora Exact Financial & Monetary Precision Strategy
 * Governed strictly by Chapters 021, 045, 086, 231, 241, 252.
 * 
 * Replaces unsafe IEEE-754 floating-point arithmetic with exact integer / scaled decimal arithmetic.
 * In Iranian Rial (IRR), monetary amounts are non-fractional whole integers.
 * Foreign exchange rates, tax percentages, and unit allocations use 4-decimal-place scaled integers.
 */

class MoneyPrecision {
  /**
   * Converts any numeric/string monetary value into exact integer Rials.
   * Throws if negative when allowNegative is false.
   */
  static toRials(val, allowNegative = false) {
    if (val === null || val === undefined) return 0;
    let num;
    if (typeof val === 'bigint') {
      num = Number(val);
    } else if (typeof val === 'string') {
      num = Math.round(parseFloat(val.replace(/,/g, '')));
    } else {
      num = Math.round(val);
    }
    if (isNaN(num)) throw new Error(`Invalid monetary amount: ${val}`);
    if (!allowNegative && num < 0) {
      throw new Error(`Monetary amount cannot be negative: ${num}`);
    }
    return num;
  }

  /**
   * Sums multiple monetary amounts with exact precision.
   */
  static sum(...amounts) {
    return amounts.reduce((acc, curr) => acc + MoneyPrecision.toRials(curr, true), 0);
  }

  /**
   * Subtracts b from a with exact precision.
   */
  static subtract(a, b) {
    return MoneyPrecision.toRials(a, true) - MoneyPrecision.toRials(b, true);
  }

  /**
   * Multiplies an exact monetary amount by a decimal rate (e.g. FX rate, tax rate, discount rate)
   * using scaled integer arithmetic with Bankers' / standard half-up rounding.
   */
  static multiplyRate(amount, rate, rateScale = 10000) {
    const amt = BigInt(MoneyPrecision.toRials(amount, true));
    const scaledRate = BigInt(Math.round(Number(rate) * rateScale));
    const scale = BigInt(rateScale);
    // Multiply and round half-up: (amt * scaledRate + scale / 2) / scale
    const isNegative = (amt * scaledRate) < 0n;
    const absProduct = isNegative ? -(amt * scaledRate) : (amt * scaledRate);
    const rounded = (absProduct + scale / 2n) / scale;
    const result = isNegative ? -rounded : rounded;
    return Number(result);
  }

  /**
   * Strict debit/credit equality check.
   */
  static isBalanced(totalDebit, totalCredit) {
    const deb = MoneyPrecision.toRials(totalDebit, true);
    const cred = MoneyPrecision.toRials(totalCredit, true);
    return deb === cred;
  }
}

module.exports = { MoneyPrecision };
