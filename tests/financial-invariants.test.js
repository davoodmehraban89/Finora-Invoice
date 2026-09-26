const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { GeneralLedger } = require('../src/ledger/general-ledger');
const { PostingEngine } = require('../src/ledger/posting-engine');
const { AccountingEventContract } = require('../src/accounting/accounting-event-contract');

describe('Financial Invariants & Double-Entry Integrity (Chapters 021, 045, 141, 242, 252)', () => {
  let ledger;
  let postingEngine;

  beforeEach(() => {
    ledger = new GeneralLedger();
    ledger.registerAccount({ code: '1101', name: 'Cash and Bank', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '1103', name: 'Accounts Receivable', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '2101', name: 'Accounts Payable', category: 'liability', nature: 'credit' });
    ledger.registerAccount({ code: '4101', name: 'Sales Revenue', category: 'revenue', nature: 'credit' });
    postingEngine = new PostingEngine(ledger);
  });

  it('Invariant 1: Rejects unbalanced accounting events (sum(Debit) != sum(Credit))', () => {
    const unbalancedEvent = {
      event_id: 'EVT-ERR-01',
      event_type: 'INVOICE_ISSUED',
      tenant_id: 'TEN-001',
      organization_id: 'ORG-001',
      occurred_at: new Date().toISOString(),
      effective_date: '2026-09-25',
      source_module: 'sales',
      source_entity_id: 'INV-101',
      currency: 'IRR',
      idempotency_key: 'IDEMP-ERR-01',
      lines: [
        { account_code: '1103', debit: 1000000, credit: 0 },
        { account_code: '4101', debit: 0, credit: 950000 } // 50,000 imbalance!
      ]
    };

    assert.throws(
      () => postingEngine.postEvent(unbalancedEvent),
      /Financial Invariant Broken: Double-entry imbalance detected/
    );
  });

  it('Invariant 2: Successfully posts balanced events and updates accounts', () => {
    const balancedEvent = {
      event_id: 'EVT-OK-01',
      event_type: 'INVOICE_ISSUED',
      tenant_id: 'TEN-001',
      organization_id: 'ORG-001',
      occurred_at: new Date().toISOString(),
      effective_date: '2026-09-25',
      source_module: 'sales',
      source_entity_id: 'INV-102',
      currency: 'IRR',
      idempotency_key: 'IDEMP-OK-01',
      lines: [
        { account_code: '1103', debit: 5000000, credit: 0 },
        { account_code: '4101', debit: 0, credit: 5000000 }
      ]
    };

    const result = postingEngine.postEvent(balancedEvent, 'auditor_1');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.isIdempotentReplay, false);
    assert.ok(result.journalEntry.journal_id.startsWith('JRN-'));

    // Check account balances
    const arAccount = ledger.getAccount('1103');
    const revAccount = ledger.getAccount('4101');
    assert.strictEqual(arAccount.netBalance, 5000000);
    assert.strictEqual(revAccount.netBalance, 5000000);

    // Verify Trial Balance equality
    const tb = ledger.getTrialBalance();
    assert.strictEqual(tb.isBalanced, true);
    assert.strictEqual(tb.totalDebit, 5000000);
    assert.strictEqual(tb.totalCredit, 5000000);
  });

  it('Invariant 3: Idempotency eliminates duplicate financial postings', () => {
    const event = {
      event_id: 'EVT-IDEMP-01',
      event_type: 'PAYMENT_RECEIVED',
      tenant_id: 'TEN-001',
      organization_id: 'ORG-001',
      occurred_at: new Date().toISOString(),
      effective_date: '2026-09-25',
      source_module: 'treasury',
      source_entity_id: 'PAY-201',
      currency: 'IRR',
      idempotency_key: 'REPEATABLE_KEY_123',
      lines: [
        { account_code: '1101', debit: 2000000, credit: 0 },
        { account_code: '1103', debit: 0, credit: 2000000 }
      ]
    };

    const firstPost = postingEngine.postEvent(event, 'user_1');
    assert.strictEqual(firstPost.isIdempotentReplay, false);
    assert.strictEqual(ledger.journalEntries.length, 1);

    // Replay identical event with same idempotency key
    const secondPost = postingEngine.postEvent(event, 'user_1');
    assert.strictEqual(secondPost.isIdempotentReplay, true);
    assert.strictEqual(secondPost.journalEntry.journal_id, firstPost.journalEntry.journal_id);
    // Ensure no duplicate row was added to ledger!
    assert.strictEqual(ledger.journalEntries.length, 1);
  });

  it('Invariant 4: Period Lock forbids postings into closed or locked periods', () => {
    // Lock the month of August 2026
    ledger.setPeriodStatus('2026-08', 'LOCKED', '2026-08-01', '2026-08-31');

    const pastEvent = {
      event_id: 'EVT-PAST-01',
      event_type: 'INVOICE_ISSUED',
      tenant_id: 'TEN-001',
      organization_id: 'ORG-001',
      occurred_at: new Date().toISOString(),
      effective_date: '2026-08-15', // Falls into locked period!
      source_module: 'sales',
      source_entity_id: 'INV-PAST',
      currency: 'IRR',
      idempotency_key: 'IDEMP-PAST-01',
      lines: [
        { account_code: '1103', debit: 1000000, credit: 0 },
        { account_code: '4101', debit: 0, credit: 1000000 }
      ]
    };

    assert.throws(
      () => postingEngine.postEvent(pastEvent),
      /Financial Invariant Violation: Period '2026-08' is LOCKED/
    );
  });

  it('Invariant 5: Immutability and Traceable Reversal (No silent deletions)', () => {
    const event = {
      event_id: 'EVT-REV-ORIG',
      event_type: 'INVOICE_ISSUED',
      tenant_id: 'TEN-001',
      organization_id: 'ORG-001',
      occurred_at: new Date().toISOString(),
      effective_date: '2026-09-25',
      source_module: 'sales',
      source_entity_id: 'INV-TO-REVERSE',
      currency: 'IRR',
      idempotency_key: 'IDEMP-REV-ORIG',
      lines: [
        { account_code: '1103', debit: 3000000, credit: 0 },
        { account_code: '4101', debit: 0, credit: 3000000 }
      ]
    };

    const postResult = postingEngine.postEvent(event, 'user_1');
    const originalJrnId = postResult.journalEntry.journal_id;

    // Execute reversal
    const revResult = postingEngine.createReversal(originalJrnId, 'auditor_1', 'Erroneous invoice entry');
    assert.strictEqual(revResult.success, true);
    assert.strictEqual(ledger.journalEntries.length, 2);

    // Original entry is preserved (not deleted) and marked reversed
    const updatedOriginal = ledger.journalEntries.find(j => j.journal_id === originalJrnId);
    assert.strictEqual(updatedOriginal.is_reversed, true);
    assert.strictEqual(updatedOriginal.reversed_by_journal_id, revResult.journalEntry.journal_id);

    // Net trial balance should be restored to zero
    const tb = ledger.getTrialBalance();
    assert.strictEqual(tb.isBalanced, true);
    const ar = ledger.getAccount('1103');
    assert.strictEqual(ar.netBalance, 0);
  });
});
