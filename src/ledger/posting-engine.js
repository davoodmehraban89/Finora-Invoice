/**
 * Finora Posting Engine
 * The sole authorized authority for posting Accounting Events into General Ledger.
 * Governed by Chapters 021, 045, 062, 141, 241, 242, 252.
 */

const { AccountingEventContract } = require('../accounting/accounting-event-contract');

class PostingEngine {
  constructor(generalLedger) {
    if (!generalLedger) throw new Error('PostingEngine requires a GeneralLedger instance.');
    this.ledger = generalLedger;
  }

  postEvent(event, actor = 'system') {
    // 1. Contract & Invariant Validation
    const validation = AccountingEventContract.validate(event);

    // 2. Idempotency Check (prevent duplicate financial entries)
    if (this.ledger.idempotencyStore.has(event.idempotency_key)) {
      const existingJournalId = this.ledger.idempotencyStore.get(event.idempotency_key);
      const existingEntry = this.ledger.journalEntries.find(j => j.journal_id === existingJournalId);
      return {
        success: true,
        isIdempotentReplay: true,
        journalEntry: existingEntry,
        message: 'Idempotent request: Returning already-posted journal entry.'
      };
    }

    // 3. Period Lock Verification
    this.ledger.checkPeriodOpen(event.effective_date);

    // 4. Verify that all referenced accounts exist in Chart of Accounts
    for (const line of event.lines) {
      if (!this.ledger.getAccount(line.account_code)) {
        throw new Error(`Posting Failed: Account '${line.account_code}' does not exist in Chart of Accounts.`);
      }
    }

    // 5. Generate Immutable Journal Entry
    const journalId = `JRN-${Date.now()}-${this.ledger.journalEntries.length + 1}`;
    const journalEntry = Object.freeze({
      journal_id: journalId,
      event_id: event.event_id,
      event_type: event.event_type,
      tenant_id: event.tenant_id,
      organization_id: event.organization_id,
      effective_date: event.effective_date,
      occurred_at: event.occurred_at,
      posted_at: new Date().toISOString(),
      posted_by: actor,
      source_module: event.source_module,
      source_entity_id: event.source_entity_id,
      currency: event.currency,
      payload_hash: validation.payloadHash,
      lines: event.lines.map((l, idx) => Object.freeze({
        line_number: idx + 1,
        account_code: l.account_code,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        party_id: l.party_id || null,
        cost_center: l.cost_center || null,
        project_id: l.project_id || null,
        description: l.description || event.description || ''
      })),
      total_debit: validation.totalDebit,
      total_credit: validation.totalCredit,
      is_reversed: false,
      reversal_of: event.reversal_of || null
    });

    // 6. Mutate Account Balances (Atomic Ledger State Transition)
    for (const line of journalEntry.lines) {
      const account = this.ledger.getAccount(line.account_code);
      account.debitBalance += line.debit;
      account.creditBalance += line.credit;
      account.netBalance = account.nature === 'debit'
        ? (account.debitBalance - account.creditBalance)
        : (account.creditBalance - account.debitBalance);
    }

    // 7. Store Journal Entry & Index Idempotency Key
    this.ledger.journalEntries.push(journalEntry);
    this.ledger.idempotencyStore.set(event.idempotency_key, journalId);

    // 8. Audit Record
    this.ledger.recordAudit(
      actor,
      'POST_JOURNAL_ENTRY',
      'JournalEntry',
      journalId,
      { event_id: event.event_id, total_amount: validation.totalDebit }
    );

    return {
      success: true,
      isIdempotentReplay: false,
      journalEntry
    };
  }

  createReversal(originalJournalId, actor = 'system', reason = 'Correction') {
    const original = this.ledger.journalEntries.find(j => j.journal_id === originalJournalId);
    if (!original) {
      throw new Error(`Cannot reverse journal entry: '${originalJournalId}' not found.`);
    }

    if (original.is_reversed) {
      throw new Error(`Journal entry '${originalJournalId}' has already been reversed.`);
    }

    // Period Lock Check for reversal date
    const effectiveDate = new Date().toISOString().split('T')[0];
    this.ledger.checkPeriodOpen(effectiveDate);

    // Swap Debits and Credits
    const reversalLines = original.lines.map(l => ({
      account_code: l.account_code,
      debit: l.credit,
      credit: l.debit,
      party_id: l.party_id,
      cost_center: l.cost_center,
      project_id: l.project_id,
      description: `Reversal of ${original.journal_id}: ${reason}`
    }));

    const reversalEvent = {
      event_id: `EVT-REV-${Date.now()}`,
      event_type: 'REVERSAL_ENTRY',
      tenant_id: original.tenant_id,
      organization_id: original.organization_id,
      occurred_at: new Date().toISOString(),
      effective_date: effectiveDate,
      source_module: 'accounting',
      source_entity_id: original.journal_id,
      currency: original.currency,
      idempotency_key: `IDEMP-REV-${original.journal_id}`,
      reversal_of: original.journal_id,
      lines: reversalLines
    };

    const postResult = this.postEvent(reversalEvent, actor);
    
    // Mark original as reversed (retaining original in place, never deleting)
    const mutableOriginal = this.ledger.journalEntries.find(j => j.journal_id === originalJournalId);
    if (mutableOriginal) {
      // Create new updated frozen object
      const idx = this.ledger.journalEntries.indexOf(mutableOriginal);
      this.ledger.journalEntries[idx] = Object.freeze({
        ...mutableOriginal,
        is_reversed: true,
        reversed_by_journal_id: postResult.journalEntry.journal_id
      });
    }

    return postResult;
  }
}

module.exports = { PostingEngine };
