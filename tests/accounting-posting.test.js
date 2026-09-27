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

describe('Posting replay integrity', () => {
  function fixture() {
    const ledger = new GeneralLedger();
    ledger.registerAccount({ code: 'cash', name: 'Cash', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: 'income', name: 'Income', category: 'revenue', nature: 'credit' });
    const engine = new PostingEngine(ledger);
    const event = { event_id: 'e1', event_type: 'PAYMENT_RECEIVED', tenant_id: 't1', organization_id: 'o1', occurred_at: '2026-09-27T00:00:00Z', effective_date: '2026-09-27', source_module: 'treasury', source_entity_id: 'p1', currency: 'IRR', idempotency_key: 'k1', lines: [{ account_code: 'cash', debit: 100 }, { account_code: 'income', credit: 100 }] };
    return { ledger, engine, event };
  }
  it('replays identical intent without changing balances or audit history', () => {
    const { ledger, engine, event } = fixture();
    const first = engine.postEvent(structuredClone(event));
    const replay = engine.postEvent({ ...structuredClone(event), event_id: 'retry' });
    assert.strictEqual(replay.journalEntry, first.journalEntry);
    assert.strictEqual(replay.isIdempotentReplay, true);
    assert.strictEqual(ledger.auditLogs.length, 1);
    assert.strictEqual(ledger.getAccount('cash').debitBalance, 100);
  });
  for (const field of ['amount', 'tenant_id', 'organization_id', 'project_id', 'reversal_of', 'description']) {
    it(`rejects conflicting ${field} without mutating posted state`, () => {
      const { ledger, engine, event } = fixture();
      engine.postEvent(structuredClone(event));
      const changed = structuredClone(event);
      if (field === 'amount') { changed.lines[0].debit = 200; changed.lines[1].credit = 200; }
      else if (field === 'project_id') changed.lines[0].project_id = 'another-project';
      else changed[field] = 'changed';
      const before = JSON.stringify({ entries: ledger.journalEntries, accounts: [...ledger.accounts], audit: ledger.auditLogs });
      assert.throws(() => engine.postEvent(changed), /Idempotency conflict/);
      assert.strictEqual(JSON.stringify({ entries: ledger.journalEntries, accounts: [...ledger.accounts], audit: ledger.auditLogs }), before);
    });
  }
  it('prevents appending or removing posted lines', () => {
    const { engine, event } = fixture();
    const { journalEntry } = engine.postEvent(event);
    assert.throws(() => journalEntry.lines.push({ account_code: 'cash', debit: 500 }), TypeError);
    assert.throws(() => journalEntry.lines.pop(), TypeError);
    event.lines[0].debit = 999;
    assert.strictEqual(journalEntry.lines[0].debit, 100);
  });
});
