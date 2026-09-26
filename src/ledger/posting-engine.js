const { AccountingEventContract } = require('../accounting/accounting-event-contract');

class PostingEngine {
  constructor(ledger) {
    this.ledger = ledger;
    this.processedIdempotencyKeys = new Set();
  }
  postEvent(event, actor = 'system') {
    if (this.processedIdempotencyKeys.has(event.idempotency_key)) {
      return { status: 'DUPLICATE_IGNORED', idempotency_key: event.idempotency_key };
    }
    AccountingEventContract.validate(event);
    const journalEntry = {
      journal_id: `JRN-${Date.now()}-${this.ledger.journalEntries.length + 1}`,
      event_id: event.event_id,
      event_type: event.event_type,
      effective_date: event.effective_date,
      description: event.description,
      lines: event.lines,
      posted_by: actor,
      posted_at: new Date().toISOString()
    };
    this.ledger.recordPosting(journalEntry);
    this.processedIdempotencyKeys.add(event.idempotency_key);
    return { status: 'POSTED', journalEntry };
  }
}
module.exports = { PostingEngine };
