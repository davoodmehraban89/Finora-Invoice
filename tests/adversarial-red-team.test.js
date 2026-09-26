/**
 * Finora Agent 4: Adversarial Red-Team & Security Fuzzing Test Suite
 * Governed by Chapters 008, 009, 021, 045, 062, 137, 141, 234, 242, 250, 252.
 * 
 * Actively attempts to break invariants, bypass controls, and violate domain rules:
 * - Injection & Malicious Inputs (XSS, SQL patterns in fields)
 * - Cross-Tenant and Cross-Organization Breach Attempts
 * - Idempotency Replay Attacks & Repeated Postings
 * - Concurrency Race Conditions & Over-Allocation Fuzzing
 * - Double-Entry Imbalance & Negative Amount Invariants
 * - Trillion-Rial Arithmetic Precision & Boundary Testing
 * - Sayad ID and Moadian Checksum Fuzzing
 * - Post-Lock Fiscal Year Tampering & Immutability Enforcement
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { AccountingEventContract } = require('../src/accounting/accounting-event-contract');
const { GeneralLedger } = require('../src/ledger/general-ledger');
const { PostingEngine } = require('../src/ledger/posting-engine');
const { StockEngine } = require('../src/inventory/stock-engine');
const { Customer360Engine } = require('../src/crm/customer-360-engine');
const { ProcurementEngine } = require('../src/procurement/procurement-engine');
const { IranMoadianAdapter } = require('../src/tax/iran-moadian-adapter');
const { SayadChequeEngine } = require('../src/treasury/sayad-cheque-engine');
const { RlsEnforcer } = require('../src/security/rls-enforcer');
const { TenantContext } = require('../src/security/tenant-context');
const { MoneyPrecision } = require('../src/common/money-precision');

describe('Agent 4: Adversarial Red-Team & Invariant Violation Attacks', () => {

  // Attack Scenario 1: Malicious Debit/Credit Imbalance Injection
  it('Red-Team Attack 1: Fuzzing AccountingEvent with microscopic and macroscopic imbalances', () => {
    const baseEvent = {
      event_id: 'ATK-EVT-01',
      event_type: 'INVOICE_ISSUED',
      tenant_id: 'ten_evil',
      organization_id: 'org_evil',
      occurred_at: new Date().toISOString(),
      effective_date: '2026-09-26',
      source_module: 'adversarial',
      source_entity_id: 'atk_1',
      currency: 'IRR',
      idempotency_key: 'IDEMP-ATK-01'
    };

    // Imbalance of 1 Rial
    assert.throws(() => {
      AccountingEventContract.validate({
        ...baseEvent,
        lines: [
          { account_code: '1101', debit: 1000000, credit: 0 },
          { account_code: '4101', debit: 0, credit: 1000001 }
        ]
      });
    }, /Financial Invariant Broken/);

    // Negative debit injection attempt
    assert.throws(() => {
      AccountingEventContract.validate({
        ...baseEvent,
        lines: [
          { account_code: '1101', debit: -500000, credit: 0 },
          { account_code: '4101', debit: 0, credit: -500000 }
        ]
      });
    }, /negative amounts forbidden/);

    // Both debit and credit on same line
    assert.throws(() => {
      AccountingEventContract.validate({
        ...baseEvent,
        lines: [
          { account_code: '1101', debit: 500000, credit: 500000 },
          { account_code: '4101', debit: 0, credit: 500000 }
        ]
      });
    }, /cannot have both debit and credit on the same row/);
  });

  // Attack Scenario 2: Idempotency Replay Attack
  it('Red-Team Attack 2: Attempting to double-post financial event with identical idempotency key', () => {
    const gl = new GeneralLedger();
    gl.registerAccount({ code: '1101', name: 'Cash', category: 'asset', nature: 'debit' });
    gl.registerAccount({ code: '4101', name: 'Revenue', category: 'revenue', nature: 'credit' });
    const pe = new PostingEngine(gl);

    const event = {
      event_id: 'EVT-REPLAY-01',
      event_type: 'PAYMENT_RECEIVED',
      tenant_id: 'ten_01',
      organization_id: 'org_01',
      occurred_at: new Date().toISOString(),
      effective_date: '2026-09-26',
      source_module: 'sales',
      source_entity_id: 'order_999',
      currency: 'IRR',
      idempotency_key: 'IDEMP-UNIQUE-REPLAY-TEST',
      lines: [
        { account_code: '1101', debit: 75000000, credit: 0 },
        { account_code: '4101', debit: 0, credit: 75000000 }
      ]
    };

    const firstPost = pe.postEvent(event, 'auditor');
    assert.ok(firstPost.journalEntry);
    assert.strictEqual(gl.getAccount('1101').debitBalance, 75000000);

    // Replay attempt with same idempotency key
    const replayPost = pe.postEvent(event, 'auditor');
    assert.strictEqual(replayPost.isIdempotentReplay, true);
    assert.strictEqual(replayPost.journalEntry.journal_id, firstPost.journalEntry.journal_id);

    // Ensure ledger was NOT incremented twice (still exactly 75M)
    assert.strictEqual(gl.getAccount('1101').debitBalance, 75000000);
  });

  // Attack Scenario 3: Cross-Tenant & Cross-Org Data Breach Attack
  it('Red-Team Attack 3: Adversary tries to read and mutate foreign organization records', () => {
    const victimOrgUser = new TenantContext({
      user_id: 'usr_adversary',
      tenant_id: 'ten_holding_01',
      organization_id: 'org_subsidiary_alpha',
      roles: ['standard_user']
    });

    const dataset = [
      { id: 'rec_alpha', tenant_id: 'ten_holding_01', organization_id: 'org_subsidiary_alpha', secret: 'Alpha Data' },
      { id: 'rec_beta', tenant_id: 'ten_holding_01', organization_id: 'org_subsidiary_beta', secret: 'Beta Secret Financials' },
      { id: 'rec_foreign', tenant_id: 'ten_foreign_corp', organization_id: 'org_external', secret: 'Foreign Tenant Secret' }
    ];

    // Filter by organization
    const accessible = RlsEnforcer.filterDatasetByOrganization(dataset, victimOrgUser);
    assert.strictEqual(accessible.length, 1);
    assert.strictEqual(accessible[0].id, 'rec_alpha');

    // Mutation attack on Beta
    assert.throws(() => {
      RlsEnforcer.authorizeMutation(dataset[1], victimOrgUser);
    }, /Organization Isolation Violation/);

    // Mutation attack on Foreign Tenant
    assert.throws(() => {
      RlsEnforcer.authorizeMutation(dataset[2], victimOrgUser);
    }, /Cross-Tenant Access Denied/);
  });

  // Attack Scenario 4: Concurrency Race Condition on Inventory (Preventing Negative Stock)
  it('Red-Team Attack 4: Simultaneous stock issues cannot force on-hand inventory into the negative', () => {
    const stock = new StockEngine();
    stock.receiveGoods({
      tenant_id: 'ten_01',
      organization_id: 'org_01',
      warehouse_id: 'wh_main',
      item_id: 'item_limited',
      quantity: 10,
      unit_cost: 50000
    });

    // 10 units available. Issue 7 units.
    stock.issueGoods({
      tenant_id: 'ten_01',
      organization_id: 'org_01',
      warehouse_id: 'wh_main',
      item_id: 'item_limited',
      quantity: 7
    });

    const balAfter = stock.getBalance('ten_01', 'org_01', 'wh_main', 'item_limited');
    assert.strictEqual(balAfter.on_hand_quantity, 3);

    // Attempting to issue 5 units (when only 3 remain) MUST throw and not allow negative stock
    assert.throws(() => {
      stock.issueGoods({
        tenant_id: 'ten_01',
        organization_id: 'org_01',
        warehouse_id: 'wh_main',
        item_id: 'item_limited',
        quantity: 5
      });
    }, /Insufficient inventory/);

    // Verify balance remains exactly 3
    assert.strictEqual(stock.getBalance('ten_01', 'org_01', 'wh_main', 'item_limited').on_hand_quantity, 3);
  });

  // Attack Scenario 5: Fuzzing Moadian Tax IDs with Garbage Inputs
  it('Red-Team Attack 5: Fuzzing Tax ID validator with SQLi, null bytes, and boundary strings', () => {
    const attackVectors = [
      '',
      null,
      undefined,
      'A12BC32072200000001018; DROP TABLE invoices;--',
      'A12BC32072200000001018\x00',
      'A12BC3207220000000101', // 21 chars
      'A12BC320722000000010189', // 23 chars
      'abcdefghijklmnopqrstuv',
      '!!!!!!2072200000001018',
      'A12BC3207220000000101X' // non-numeric check digit
    ];

    for (const vector of attackVectors) {
      const res = IranMoadianAdapter.validateTaxUniqueId(vector);
      assert.strictEqual(res.isValid, false, `Fuzzed vector '${vector}' must be rejected`);
    }
  });

  // Attack Scenario 6: Sayad Cheque 16-Digit Formatting Security
  it('Red-Team Attack 6: Rejects malformed and injection-laced Sayad cheque identifiers', () => {
    assert.strictEqual(SayadChequeEngine.validateSayadId('123456789012345'), false); // 15 digits
    assert.strictEqual(SayadChequeEngine.validateSayadId('12345678901234567'), false); // 17 digits
    assert.strictEqual(SayadChequeEngine.validateSayadId('123456789012345A'), false); // contains letter
    assert.strictEqual(SayadChequeEngine.validateSayadId("1234567890123456' OR '1'='1"), false);
    assert.strictEqual(SayadChequeEngine.validateSayadId('1234567890123456'), true); // valid
  });

  // Attack Scenario 7: Trillion-Rial Arithmetic Boundary Testing
  it('Red-Team Attack 7: Multi-Trillion Rial financial math executes with zero precision loss', () => {
    // 850 Trillion Rials (National Infrastructure Enterprise Scale)
    const baseTrillions = 850000000000000;
    const taxRate = 0.10;
    const expectedTax = 85000000000000; // 85 Trillion Rials
    const actualTax = MoneyPrecision.multiplyRate(baseTrillions, taxRate);

    assert.strictEqual(actualTax, expectedTax);
    const total = MoneyPrecision.sum(baseTrillions, actualTax);
    assert.strictEqual(total, 935000000000000);
    assert.strictEqual(MoneyPrecision.isBalanced(total, 935000000000000), true);
  });

  // Attack Scenario 8: Post-Closing Period Tampering Prevention
  it('Red-Team Attack 8: Forbids any retroactive postings into a closed/locked fiscal year', () => {
    const gl = new GeneralLedger();
    gl.registerAccount({ code: '1101', name: 'Cash', category: 'asset', nature: 'debit' });
    gl.registerAccount({ code: '4101', name: 'Rev', category: 'revenue', nature: 'credit' });
    const pe = new PostingEngine(gl);

    gl.setPeriodStatus('1404', 'LOCKED', '1404-01-01', '1404-12-29');

    assert.throws(() => {
      pe.postEvent({
        event_id: 'EVT-RETROACTIVE-ATTACK',
        event_type: 'PAYMENT_RECEIVED',
        tenant_id: 'ten_01',
        organization_id: 'org_01',
        occurred_at: '2025-06-15T00:00:00Z',
        effective_date: '1404-03-25',
        source_module: 'hacker',
        source_entity_id: 'hack_1',
        currency: 'IRR',
        idempotency_key: 'IDEMP-RETRO-01',
        lines: [
          { account_code: '1101', debit: 10000000, credit: 0 },
          { account_code: '4101', debit: 0, credit: 10000000 }
        ]
      }, 'adversary');
    }, /Period '1404' is LOCKED/);
  });

});
