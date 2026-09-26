const { describe, it } = require('node:test');
const assert = require('node:assert');
const { GeneralLedger } = require('../src/ledger/general-ledger');
const { PostingEngine } = require('../src/ledger/posting-engine');

describe('Accounting Posting & Ledger Architecture (Chapters 021, 045, 062, 241, 242)', () => {
  it('Rejects posting to unregistered account codes', () => {
    const ledger = new GeneralLedger();
    ledger.registerAccount({ code: '1101', name: 'Cash', category: 'asset', nature: 'debit' });
    // 9999 is NOT registered!
    const posting = new PostingEngine(ledger);

    const event = {
      event_id: 'EVT-TEST-UNKNOWN',
      event_type: 'PAYMENT_RECEIVED',
      tenant_id: 'TEN-1',
      organization_id: 'ORG-1',
      occurred_at: new Date().toISOString(),
      effective_date: '2026-09-25',
      source_module: 'treasury',
      source_entity_id: 'PAY-1',
      currency: 'IRR',
      idempotency_key: 'IDEMP-TEST-UNKNOWN',
      lines: [
        { account_code: '1101', debit: 500, credit: 0 },
        { account_code: '9999', debit: 0, credit: 500 }
      ]
    };

    assert.throws(
      () => posting.postEvent(event),
      /Account '9999' does not exist in Chart of Accounts/
    );
  });

  it('Calculates net debit/credit balance correctly according to account nature', () => {
    const ledger = new GeneralLedger();
    const assetAcc = ledger.registerAccount({ code: '1101', name: 'Cash', category: 'asset', nature: 'debit' });
    const liabAcc = ledger.registerAccount({ code: '2101', name: 'Payable', category: 'liability', nature: 'credit' });
    const posting = new PostingEngine(ledger);

    posting.postEvent({
      event_id: 'EVT-BAL-1',
      event_type: 'PAYMENT_RECEIVED',
      tenant_id: 'TEN-1',
      organization_id: 'ORG-1',
      occurred_at: new Date().toISOString(),
      effective_date: '2026-09-25',
      source_module: 'treasury',
      source_entity_id: 'PAY-1',
      currency: 'IRR',
      idempotency_key: 'IDEMP-BAL-1',
      lines: [
        { account_code: '1101', debit: 1000, credit: 0 },
        { account_code: '2101', debit: 0, credit: 1000 }
      ]
    });

    assert.strictEqual(assetAcc.debitBalance, 1000);
    assert.strictEqual(assetAcc.creditBalance, 0);
    assert.strictEqual(assetAcc.netBalance, 1000); // debit nature

    assert.strictEqual(liabAcc.debitBalance, 0);
    assert.strictEqual(liabAcc.creditBalance, 1000);
    assert.strictEqual(liabAcc.netBalance, 1000); // credit nature
  });
});
