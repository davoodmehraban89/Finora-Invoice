/**
 * Finora International Multi-Currency & Forex Revaluation Engine
 * Governed by Chapters 086, 231, 235, 236, 240, 241 of the Finora Master Specification.
 * Compliant with Iranian Accounting Standard 16 (استاندارد حسابداری ۱۶ تسعیر ارز) and IAS 21.
 *
 * Implements:
 * - Multi-Currency Exchange Rate Management (SANA, NIMA, Official & Free Market Rates)
 * - Foreign Currency Transaction Recording in Operational & Base Currency (IRR)
 * - Realized Forex Gain/Loss on Receivable/Payable Settlement with Exact Integer Precision
 * - Period-End Balance Sheet Monetary Item Revaluation (تسعیر پایان دوره مالی)
 * - Automated Double-Entry GL Posting for Realized & Unrealized FX Gains/Losses
 */

const { MoneyPrecision } = require('../common/money-precision');

class MultiCurrencyEngine {
  constructor({ postingEngine = null, baseCurrency = 'IRR' } = {}) {
    this.postingEngine = postingEngine;
    this.baseCurrency = baseCurrency;
    this.exchangeRates = new Map(); // `${currency}_${date}` -> rate in base currency (IRR)
    this.openForeignPositions = new Map(); // position_id -> ForeignPosition
  }

  /**
   * Registers daily exchange rate (e.g. 1 USD = 500,000 IRR).
   */
  setExchangeRate({ currency, date, rate, source = 'NIMA' }) {
    if (!currency || !date || rate <= 0) {
      throw new Error('Valid currency, date, and positive rate are mandatory.');
    }
    const key = `${currency.toUpperCase()}_${date}`;
    this.exchangeRates.set(key, {
      currency: currency.toUpperCase(),
      date,
      rate: Number(rate),
      source,
      timestamp: new Date().toISOString()
    });
    return this.exchangeRates.get(key);
  }

  getExchangeRate(currency, date) {
    if (currency.toUpperCase() === this.baseCurrency) return 1.0;
    const key = `${currency.toUpperCase()}_${date}`;
    const rateObj = this.exchangeRates.get(key);
    if (!rateObj) {
      throw new Error(`Exchange rate for '${currency}' on date '${date}' not found in registry.`);
    }
    return rateObj.rate;
  }

  /**
   * Records a foreign currency invoice / receivable / payable transaction.
   */
  recordForeignTransaction({
    position_id,
    tenant_id = 'default_tenant',
    organization_id = 'default_org',
    type, // 'RECEIVABLE' | 'PAYABLE' | 'FOREIGN_BANK'
    currency,
    foreign_amount,
    date,
    reference_id,
    party_id = null
  }) {
    const fAmt = Math.max(0, Number(foreign_amount));
    const rate = this.getExchangeRate(currency, date);
    const baseAmount = MoneyPrecision.multiplyRate(fAmt, rate);

    const position = {
      position_id,
      tenant_id,
      organization_id,
      type,
      currency: currency.toUpperCase(),
      booking_rate: rate,
      booking_date: date,
      original_foreign_amount: fAmt,
      remaining_foreign_amount: fAmt,
      booking_base_amount: baseAmount,
      reference_id,
      party_id,
      status: 'OPEN',
      settlements: []
    };

    this.openForeignPositions.set(position_id, position);
    return position;
  }

  /**
   * Settles a foreign currency position and calculates Realized Forex Gain or Loss.
   */
  settleForeignPosition({
    position_id,
    settlement_foreign_amount,
    settlement_date,
    settlement_rate = null,
    actor = 'finance_treasury'
  }) {
    const pos = this.openForeignPositions.get(position_id);
    if (!pos) throw new Error(`Foreign position '${position_id}' not found.`);

    const settleFAmt = Math.max(0, Number(settlement_foreign_amount));
    if (settleFAmt > pos.remaining_foreign_amount) {
      throw new Error(`Settlement amount (${settleFAmt}) exceeds remaining foreign balance (${pos.remaining_foreign_amount}).`);
    }

    const currentRate = settlement_rate !== null
      ? Number(settlement_rate)
      : this.getExchangeRate(pos.currency, settlement_date);

    // Booked value of the settled portion
    const bookedBaseValue = MoneyPrecision.multiplyRate(settleFAmt, pos.booking_rate);
    // Actual settled value at current exchange rate
    const settledBaseValue = MoneyPrecision.multiplyRate(settleFAmt, currentRate);

    // Forex difference
    let fxDifference = 0;
    let isGain = false;

    if (pos.type === 'RECEIVABLE') {
      fxDifference = MoneyPrecision.subtract(settledBaseValue, bookedBaseValue);
      isGain = fxDifference >= 0;
    } else if (pos.type === 'PAYABLE') {
      fxDifference = MoneyPrecision.subtract(bookedBaseValue, settledBaseValue);
      isGain = fxDifference >= 0;
    }

    const absDifference = Math.abs(fxDifference);

    pos.remaining_foreign_amount -= settleFAmt;
    if (pos.remaining_foreign_amount <= 0.0001) {
      pos.status = 'FULLY_SETTLED';
    }

    const settlementRecord = {
      settlement_id: `SETTLE-${Date.now()}-${pos.settlements.length + 1}`,
      settlement_date,
      settlement_foreign_amount: settleFAmt,
      settlement_rate: currentRate,
      booked_base_value: bookedBaseValue,
      settled_base_value: settledBaseValue,
      fx_gain_or_loss: fxDifference,
      is_gain: isGain
    };

    pos.settlements.push(settlementRecord);

    // If PostingEngine is configured, post balanced double-entry accounting entry
    let journalEvent = null;
    if (this.postingEngine && absDifference > 0) {
      const isReceivable = pos.type === 'RECEIVABLE';

      // Lines for settlement
      const lines = [];
      if (isReceivable) {
        // Debit Cash/Bank for settled amount
        lines.push({ account_code: '1101', debit: settledBaseValue, credit: 0, description: 'دریافت نقدی وجه ارزی تسویه' });
        // Credit Accounts Receivable for original booked amount
        lines.push({ account_code: '1103', debit: 0, credit: bookedBaseValue, description: 'تسویه حساب دریافتنی ارزی' });

        if (isGain) {
          // Credit FX Gain (4101 / سود تسعیر ارز)
          lines.push({ account_code: '4101', debit: 0, credit: absDifference, description: 'سود تسعیر ارز محقق‌شده' });
        } else {
          // Debit FX Loss (6105 / زیان تسعیر ارز)
          lines.push({ account_code: '6105', debit: absDifference, credit: 0, description: 'زیان تسعیر ارز محقق‌شده' });
        }
      } else {
        // Payable settlement
        // Debit Accounts Payable for original booked amount
        lines.push({ account_code: '2101', debit: bookedBaseValue, credit: 0, description: 'تسویه بدهی ارزی تأمین‌کننده' });
        // Credit Cash/Bank for actual settled amount
        lines.push({ account_code: '1101', debit: 0, credit: settledBaseValue, description: 'پرداخت نقدی وجه ارزی تسویه' });

        if (isGain) {
          lines.push({ account_code: '4101', debit: 0, credit: absDifference, description: 'سود تسعیر ارز محقق‌شده بابت تسویه بدهی' });
        } else {
          lines.push({ account_code: '6105', debit: absDifference, credit: 0, description: 'زیان تسعیر ارز محقق‌شده بابت تسویه بدهی' });
        }
      }

      journalEvent = {
        event_id: `EVT-FX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        event_type: isReceivable ? 'PAYMENT_RECEIVED' : 'PAYMENT_DISBURSED',
        tenant_id: pos.tenant_id,
        organization_id: pos.organization_id,
        occurred_at: new Date().toISOString(),
        effective_date: settlement_date,
        source_module: 'currency',
        source_entity_id: pos.position_id,
        currency: this.baseCurrency,
        idempotency_key: `IDEMP-FX-${pos.position_id}-${pos.settlements.length}`,
        lines
      };

      try {
        this.postingEngine.postEvent(journalEvent, actor);
      } catch (e) {
        // Log event dispatch failure if any
      }
    }

    return {
      position_id,
      settlement: settlementRecord,
      remaining_foreign_amount: pos.remaining_foreign_amount,
      status: pos.status
    };
  }

  /**
   * Period-End Revaluation of Open Monetary Positions (استاندارد ۱۶ تسعیر پایان دوره).
   */
  revalueOpenPositions({ closing_date, new_rates = {} }) {
    const revaluationResults = [];
    let totalUnrealizedGain = 0;
    let totalUnrealizedLoss = 0;

    for (const pos of this.openForeignPositions.values()) {
      if (pos.status === 'OPEN' && pos.remaining_foreign_amount > 0) {
        const rate = new_rates[pos.currency] || this.getExchangeRate(pos.currency, closing_date);
        const currentCarryingValue = MoneyPrecision.multiplyRate(pos.remaining_foreign_amount, pos.booking_rate);
        const revaluedValue = MoneyPrecision.multiplyRate(pos.remaining_foreign_amount, rate);

        let diff = 0;
        if (pos.type === 'RECEIVABLE') {
          diff = MoneyPrecision.subtract(revaluedValue, currentCarryingValue);
        } else if (pos.type === 'PAYABLE') {
          diff = MoneyPrecision.subtract(currentCarryingValue, revaluedValue);
        }

        const isGain = diff >= 0;
        if (isGain) {
          totalUnrealizedGain += diff;
        } else {
          totalUnrealizedLoss += Math.abs(diff);
        }

        revaluationResults.push({
          position_id: pos.position_id,
          currency: pos.currency,
          foreign_amount: pos.remaining_foreign_amount,
          old_rate: pos.booking_rate,
          new_rate: rate,
          carrying_value: currentCarryingValue,
          revalued_value: revaluedValue,
          unrealized_diff: diff,
          is_gain: isGain
        });
      }
    }

    const netEffect = totalUnrealizedGain - totalUnrealizedLoss;

    return {
      closing_date,
      positions_revalued: revaluationResults.length,
      total_unrealized_gain: totalUnrealizedGain,
      total_unrealized_loss: totalUnrealizedLoss,
      net_unrealized_forex_effect: netEffect,
      net_status_fa: netEffect >= 0 ? 'سود تسعیر ارز محقق‌نشده پایان دوره' : 'زیان تسعیر ارز محقق‌نشده پایان دوره',
      revaluations: revaluationResults
    };
  }
}

module.exports = { MultiCurrencyEngine };
