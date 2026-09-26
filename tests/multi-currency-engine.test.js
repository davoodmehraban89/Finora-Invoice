const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { GeneralLedger } = require('../src/ledger/general-ledger');
const { PostingEngine } = require('../src/ledger/posting-engine');
const { MultiCurrencyEngine } = require('../src/currency/multi-currency-engine');

describe('International Multi-Currency & FX Revaluation Engine (Chapters 086, 231, 235, 236, 240, 241 - Standard 16)', () => {
  let ledger;
  let postingEngine;
  let mc;

  beforeEach(() => {
    ledger = new GeneralLedger();
    ledger.registerAccount({ code: '1101', name: 'Cash and Bank', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '1103', name: 'Accounts Receivable', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '2101', name: 'Accounts Payable', category: 'liability', nature: 'credit' });
    ledger.registerAccount({ code: '4101', name: 'Sales Revenue & FX Gain', category: 'revenue', nature: 'credit' });
    ledger.registerAccount({ code: '6105', name: 'Financial Charges & FX Loss', category: 'expense', nature: 'debit' });

    postingEngine = new PostingEngine(ledger);
    mc = new MultiCurrencyEngine({ postingEngine, baseCurrency: 'IRR' });

    // Seed rates
    mc.setExchangeRate({ currency: 'USD', date: '2026-09-01', rate: 500000 }); // 1 USD = 500,000 IRR
    mc.setExchangeRate({ currency: 'USD', date: '2026-09-15', rate: 540000 }); // USD appreciated
    mc.setExchangeRate({ currency: 'USD', date: '2026-09-20', rate: 480000 }); // USD depreciated
    mc.setExchangeRate({ currency: 'EUR', date: '2026-09-01', rate: 550000 });
  });

  it('Registers exchange rates and converts foreign transactions to base currency (IRR)', () => {
    const pos = mc.recordForeignTransaction({
      position_id: 'POS-EXP-01',
      type: 'RECEIVABLE',
      currency: 'USD',
      foreign_amount: 10000, // $10,000 USD
      date: '2026-09-01'
    });

    assert.strictEqual(pos.booking_rate, 500000);
    // $10,000 * 500,000 = 5,000,000,000 IRR (5 Billion IRR)
    assert.strictEqual(pos.booking_base_amount, 5000000000);
    assert.strictEqual(pos.status, 'OPEN');
  });

  it('Calculates Realized FX Gain when settling foreign receivable at higher rate', () => {
    mc.recordForeignTransaction({
      position_id: 'POS-REC-01',
      type: 'RECEIVABLE',
      currency: 'USD',
      foreign_amount: 5000, // $5,000 USD booked at 500,000 = 2,500,000,000 IRR
      date: '2026-09-01'
    });

    // Settle on 2026-09-15 at 540,000 IRR/USD
    // Settled value = 5,000 * 540,000 = 2,700,000,000 IRR
    // Realized FX Gain = 2,700,000,000 - 2,500,000,000 = +200,000,000 IRR
    const res = mc.settleForeignPosition({
      position_id: 'POS-REC-01',
      settlement_foreign_amount: 5000,
      settlement_date: '2026-09-15'
    });

    assert.strictEqual(res.settlement.is_gain, true);
    assert.strictEqual(res.settlement.fx_gain_or_loss, 200000000);
    assert.strictEqual(res.status, 'FULLY_SETTLED');
  });

  it('Calculates Realized FX Loss when settling foreign receivable at lower rate', () => {
    mc.recordForeignTransaction({
      position_id: 'POS-REC-02',
      type: 'RECEIVABLE',
      currency: 'USD',
      foreign_amount: 2000, // $2,000 USD booked at 500,000 = 1,000,000,000 IRR
      date: '2026-09-01'
    });

    // Settle on 2026-09-20 at 480,000 IRR/USD
    // Settled value = 2,000 * 480,000 = 960,000,000 IRR
    // Realized FX Loss = 960,000,000 - 1,000,000,000 = -40,000,000 IRR
    const res = mc.settleForeignPosition({
      position_id: 'POS-REC-02',
      settlement_foreign_amount: 2000,
      settlement_date: '2026-09-20'
    });

    assert.strictEqual(res.settlement.is_gain, false);
    assert.strictEqual(res.settlement.fx_gain_or_loss, -40000000);
  });

  it('Calculates Realized FX Loss when settling foreign payable at higher rate', () => {
    mc.recordForeignTransaction({
      position_id: 'POS-PAY-01',
      type: 'PAYABLE',
      currency: 'USD',
      foreign_amount: 3000, // Booked at 500,000 = 1,500,000,000 IRR
      date: '2026-09-01'
    });

    // Settle at 540,000 -> We have to pay 1,620,000,000 IRR -> Loss of 120,000,000 IRR
    const res = mc.settleForeignPosition({
      position_id: 'POS-PAY-01',
      settlement_foreign_amount: 3000,
      settlement_date: '2026-09-15'
    });

    assert.strictEqual(res.settlement.is_gain, false);
    assert.strictEqual(res.settlement.fx_gain_or_loss, -120000000);
  });

  it('Performs Period-End Balance Sheet Revaluation per Iranian Accounting Standard 16', () => {
    // Open position 1: Receivable $10,000 USD booked at 500,000 (Carrying = 5,000,000,000 IRR)
    mc.recordForeignTransaction({
      position_id: 'POS-MONETARY-01',
      type: 'RECEIVABLE',
      currency: 'USD',
      foreign_amount: 10000,
      date: '2026-09-01'
    });

    // Year-end rate: 1 USD = 560,000 IRR
    const reval = mc.revalueOpenPositions({
      closing_date: '2026-09-30',
      new_rates: { USD: 560000 }
    });

    assert.strictEqual(reval.positions_revalued, 1);
    // 10,000 * (560,000 - 500,000) = +600,000,000 IRR Unrealized Gain
    assert.strictEqual(reval.total_unrealized_gain, 600000000);
    assert.strictEqual(reval.total_unrealized_loss, 0);
    assert.strictEqual(reval.net_unrealized_forex_effect, 600000000);
    assert.ok(reval.net_status_fa.includes('سود تسعیر ارز'));
  });
});
