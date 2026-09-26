const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { GeneralLedger } = require('../src/ledger/general-ledger');
const { PostingEngine } = require('../src/ledger/posting-engine');
const { SayadChequeEngine } = require('../src/treasury/sayad-cheque-engine');
const { BankReconciliationEngine } = require('../src/treasury/bank-reconciliation-engine');

describe('Treasury, Sayad Cheques & Bank Reconciliation (Chapters 020, 033, 243)', () => {
  let ledger;
  let postingEngine;
  let chequeEngine;
  let reconEngine;

  beforeEach(() => {
    ledger = new GeneralLedger();
    ledger.registerAccount({ code: '1101', name: 'Cash and Bank', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '1102', name: 'Notes Receivable - Vault', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '1103', name: 'Accounts Receivable', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '1104', name: 'Notes in Collection', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '2101', name: 'Accounts Payable', category: 'liability', nature: 'credit' });
    ledger.registerAccount({ code: '2104', name: 'Notes Payable', category: 'liability', nature: 'credit' });
    ledger.registerAccount({ code: '6105', name: 'Bank Charges and Financial Expenses', category: 'expense', nature: 'debit' });

    postingEngine = new PostingEngine(ledger);
    chequeEngine = new SayadChequeEngine({ postingEngine });
    reconEngine = new BankReconciliationEngine({ postingEngine });
  });

  it('Validates 16-digit Sayad IDs and rejects malformed formats', () => {
    assert.strictEqual(SayadChequeEngine.validateSayadId('1234567890123456'), true);
    assert.strictEqual(SayadChequeEngine.validateSayadId('123456789012345'), false); // 15 digits
    assert.strictEqual(SayadChequeEngine.validateSayadId('12345678901234567'), false); // 17 digits
    assert.strictEqual(SayadChequeEngine.validateSayadId('123456789012345a'), false); // letters
    assert.strictEqual(SayadChequeEngine.validateSayadId(null), false);
  });

  it('Manages Received Cheque lifecycle: Register -> Deposit to Bank -> Clear and verifies GL balance', () => {
    // 1. Receive Cheque from customer
    const chq = chequeEngine.registerReceivedCheque({
      id: 'chq_rec_01',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      sayad_id: '4012987654321098',
      cheque_number: '748291',
      bank_name: 'بانک ملت',
      branch_name: 'شعبه مرکزی',
      drawer_name: 'فروشگاه آوان‌تک',
      customer_id: 'cust_avan_01',
      amount: 450000000,
      issue_date: '1405/02/10',
      due_date: '1405/03/15'
    });

    assert.strictEqual(chq.status, 'vault');
    assert.strictEqual(ledger.getAccount('1102').netBalance, 450000000); // In Vault
    assert.strictEqual(ledger.getAccount('1103').netBalance, -450000000); // A/R credited

    // 2. Deposit to bank for collection
    chequeEngine.depositChequeToBank(chq.id, 'bank_acc_melli', 'بانک ملی شعبه مرکزی');
    assert.strictEqual(chq.status, 'in_collection');
    assert.strictEqual(ledger.getAccount('1102').netBalance, 0); // Vault emptied
    assert.strictEqual(ledger.getAccount('1104').netBalance, 450000000); // In Collection

    // 3. Cheque clears at due date
    chequeEngine.clearReceivedCheque(chq.id, '1405/03/15');
    assert.strictEqual(chq.status, 'cleared');
    assert.strictEqual(ledger.getAccount('1104').netBalance, 0); // Collection cleared
    assert.strictEqual(ledger.getAccount('1101').netBalance, 450000000); // Bank debited (cash in)

    // Verify trial balance
    const tb = ledger.getTrialBalance();
    assert.strictEqual(tb.isBalanced, true);
  });

  it('Handles Dishonored/Bounced Received Cheque and reinstates Customer Accounts Receivable', () => {
    const chq = chequeEngine.registerReceivedCheque({
      id: 'chq_bounce_01',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      sayad_id: '5012345678901234',
      cheque_number: '992811',
      bank_name: 'بانک صادرات',
      drawer_name: 'شرکت بتن پارس',
      customer_id: 'cust_pars_02',
      amount: 120000000
    });

    chequeEngine.depositChequeToBank(chq.id, 'bank_acc_01', 'بانک سپه');
    chequeEngine.bounceReceivedCheque(chq.id, 'کسری موجودی حساب صادرکننده');

    assert.strictEqual(chq.status, 'bounced');
    assert.strictEqual(ledger.getAccount('1104').netBalance, 0);
    // Customer debt is reinstated
    assert.strictEqual(ledger.getAccount('1103').netBalance, 0);
    assert.strictEqual(ledger.getTrialBalance().isBalanced, true);
  });

  it('Endorses received cheque to a supplier and settles Accounts Payable', () => {
    const chq = chequeEngine.registerReceivedCheque({
      id: 'chq_endorse_01',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      sayad_id: '9876543210123456',
      drawer_name: 'مشتری آرا بتن',
      customer_id: 'cust_ara_01',
      amount: 300000000
    });

    chequeEngine.endorseChequeToSupplier(chq.id, 'supp_cement_01', 'سیمان تهران');

    assert.strictEqual(chq.status, 'endorsed');
    assert.strictEqual(ledger.getAccount('1102').netBalance, 0);
    assert.strictEqual(ledger.getAccount('2101').netBalance, -300000000); // AP debited
    assert.strictEqual(ledger.getTrialBalance().isBalanced, true);
  });

  it('Manages Issued Cheque lifecycle: Chequebook -> Issuance to Supplier -> Bank Clearance', () => {
    chequeEngine.registerChequebook({
      id: 'book_tejarat_01',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      bank_name: 'بانک تجارت',
      start_serial: 1001,
      end_serial: 1050,
      total_leaves: 50
    });

    const issued = chequeEngine.issuePaymentCheque({
      id: 'chq_iss_01',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      chequebook_id: 'book_tejarat_01',
      sayad_id: '1122334455667788',
      cheque_number: '1001',
      payee_id: 'supp_shiraz_01',
      payee_name: 'صنایع الکترونیک شیراز',
      amount: 180000000,
      issue_date: '1405/02/01',
      due_date: '1405/04/01'
    });

    assert.strictEqual(issued.status, 'issued');
    assert.strictEqual(ledger.getAccount('2104').netBalance, 180000000); // Notes payable liability created

    // Bank clears issued cheque on due date
    chequeEngine.clearIssuedCheque(issued.id, '1405/04/01');
    assert.strictEqual(issued.status, 'cleared');
    assert.strictEqual(ledger.getAccount('2104').netBalance, 0); // Liability cleared
    assert.strictEqual(ledger.getAccount('1101').netBalance, -180000000); // Bank reduced
    assert.strictEqual(ledger.getTrialBalance().isBalanced, true);
  });

  it('Executes Bank Reconciliation and enforces invariant: Adjusted Bank === Adjusted Book Balance', () => {
    // Starting book balance: 500,000,000
    // Starting bank statement balance: 535,000,000
    // Book entries:
    // 1. Matched deposit: 100,000,000 (Ref: 101)
    // 2. Matched payment: 50,000,000 (Ref: 202)
    // 3. Deposit in transit: 70,000,000 (Ref: 303) - not yet on bank statement
    // 4. Outstanding payment cheque: 110,000,000 (Cheque: 404) - not yet cleared by payee
    // Statement entries:
    // 1. Matched deposit: 100,000,000 (Ref: 101)
    // 2. Matched withdrawal: 50,000,000 (Ref: 202)
    // 3. Unrecorded credit: 60,000,000 (Direct wire transfer from customer)
    // 4. Unrecorded debit: 5,000,000 (Bank service charge / کارمزد)

    const recon = reconEngine.performReconciliation({
      id: 'recon_1405_02',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      bank_account_id: 'bank_acc_melli',
      statement_date: '1405/02/31',
      statement_ending_balance: 535000000,
      book_ending_balance: 500000000,
      book_entries: [
        { id: 'b1', amount: 100000000, direction: 'debit', reference: 'REF-101' },
        { id: 'b2', amount: 50000000, direction: 'credit', reference: 'REF-202' },
        { id: 'b3', amount: 70000000, direction: 'debit', reference: 'REF-303' },
        { id: 'b4', amount: 110000000, direction: 'credit', reference: 'REF-404' }
      ],
      statement_entries: [
        { id: 's1', amount: 100000000, direction: 'deposit', reference: 'REF-101' },
        { id: 's2', amount: 50000000, direction: 'withdrawal', reference: 'REF-202' },
        { id: 's3', amount: 60000000, direction: 'deposit', reference: 'WIRE-99', description: 'واریز پایا مشتری' },
        { id: 's4', amount: 5000000, direction: 'withdrawal', reference: 'FEE-01', description: 'کارمزد نگهداری و همراه بانک' }
      ]
    });

    assert.strictEqual(recon.summary.total_matched_count, 2);
    assert.strictEqual(recon.summary.deposits_in_transit_count, 1);
    assert.strictEqual(recon.summary.deposits_in_transit_amount, 70000000);
    assert.strictEqual(recon.summary.outstanding_cheques_count, 1);
    assert.strictEqual(recon.summary.outstanding_cheques_amount, 110000000);

    // Calculation:
    // Adjusted Bank Balance = 535,000,000 + 70,000,000 - 110,000,000 = 495,000,000
    // Adjusted Book Balance = 500,000,000 + 60,000,000 - 5,000,000 = 555,000,000
    assert.strictEqual(recon.balances.adjusted_bank_balance, 495000000);
    assert.strictEqual(recon.balances.adjusted_book_balance, 555000000);

    // Now post the unrecorded bank charge to General Ledger
    const postRes = reconEngine.postUnrecordedBankItem({
      reconciliation_id: recon.id,
      item_id: 's4',
      account_code: '6105'
    });
    assert.strictEqual(postRes.success, true);
    assert.strictEqual(ledger.getAccount('6105').netBalance, 5000000); // Expense recorded
    assert.strictEqual(ledger.getTrialBalance().isBalanced, true);
  });
});
