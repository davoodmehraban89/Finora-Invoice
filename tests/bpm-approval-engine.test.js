const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { BpmApprovalEngine } = require('../src/workflow/bpm-approval-engine');

describe('BPM & Multi-Level Approval Workflow Engine (Chapters 018, 065, 083, 148)', () => {
  let bpm;

  beforeEach(() => {
    bpm = new BpmApprovalEngine();
  });

  it('Routes low-value purchase order to Tier 1 and approves successfully', () => {
    const wf = bpm.submitWorkflow({
      instance_id: 'WF-PO-001',
      document_type: 'PURCHASE_ORDER',
      document_id: 'PO-101',
      amount: 30000000, // 30M IRR (Tier 1 <= 50M)
      initiator_id: 'procurement_buyer'
    });

    assert.strictEqual(wf.status, 'PENDING_APPROVAL');
    assert.strictEqual(wf.current_tier, 1);
    assert.strictEqual(wf.dual_signoff_required, false);

    const approved = bpm.approveWorkflow('WF-PO-001', {
      approver_id: 'dept_head_hasan',
      approver_role: 'DEPARTMENT_HEAD',
      comments: 'تایید اقلام مصرفی کارگاه'
    });

    assert.strictEqual(approved.status, 'APPROVED');
    assert.strictEqual(approved.approvals.length, 1);
  });

  it('Enforces Separation of Duties (SoD): Rejects initiator self-approval', () => {
    bpm.submitWorkflow({
      instance_id: 'WF-PO-002',
      document_type: 'PURCHASE_ORDER',
      document_id: 'PO-102',
      amount: 40000000,
      initiator_id: 'procurement_buyer'
    });

    assert.throws(
      () => bpm.approveWorkflow('WF-PO-002', {
        approver_id: 'procurement_buyer', // Same as initiator!
        approver_role: 'DEPARTMENT_HEAD'
      }),
      /Separation of Duties violation/
    );
  });

  it('Routes high-value order (> 500M) to Tier 3 and enforces Dual-Signoff (CFO + CEO)', () => {
    const wf = bpm.submitWorkflow({
      instance_id: 'WF-PO-BIG',
      document_type: 'PURCHASE_ORDER',
      document_id: 'PO-888',
      amount: 1200000000, // 1.2 Billion IRR
      initiator_id: 'buyer_ali'
    });

    assert.strictEqual(wf.current_tier, 3);
    assert.strictEqual(wf.dual_signoff_required, true);

    // 1st sign-off by CFO
    const afterFirst = bpm.approveWorkflow('WF-PO-BIG', {
      approver_id: 'cfo_davood',
      approver_role: 'CFO',
      comments: 'تایید بودجه و نقدینگی'
    });

    // Still pending because 2nd sign-off is needed!
    assert.strictEqual(afterFirst.status, 'PENDING_APPROVAL');
    assert.strictEqual(afterFirst.approvals.length, 1);

    // Cannot be approved twice by same actor!
    assert.throws(
      () => bpm.approveWorkflow('WF-PO-BIG', {
        approver_id: 'cfo_davood',
        approver_role: 'CFO'
      }),
      /has already recorded an approval/
    );

    // 2nd sign-off by CEO
    const afterSecond = bpm.approveWorkflow('WF-PO-BIG', {
      approver_id: 'ceo_director',
      approver_role: 'CEO',
      comments: 'تایید نهایی قرارداد تامین مصالح'
    });

    assert.strictEqual(afterSecond.status, 'APPROVED');
    assert.strictEqual(afterSecond.approvals.length, 2);
  });

  it('Allows approved delegatee to sign on behalf of absent executive', () => {
    bpm.registerDelegation({
      delegator_id: 'cfo_davood',
      delegatee_id: 'assistant_maryam',
      start_date: '2026-09-01',
      end_date: '2026-09-30'
    });

    bpm.submitWorkflow({
      instance_id: 'WF-PO-DELEGATED',
      document_type: 'PURCHASE_ORDER',
      document_id: 'PO-900',
      amount: 250000000, // 250M IRR (Tier 2 requires Financial Manager/CFO)
      initiator_id: 'buyer_reza'
    });

    const approved = bpm.approveWorkflow('WF-PO-DELEGATED', {
      approver_id: 'assistant_maryam',
      approver_role: 'FINANCIAL_ANALYST', // Role normally lower, but delegated!
      comments: 'تایید بر اساس تفویض اختیار مدیریت مالی'
    });

    assert.strictEqual(approved.status, 'APPROVED');
  });

  it('Handles rejection with documented reason and halts progression', () => {
    bpm.submitWorkflow({
      instance_id: 'WF-PO-REJECT',
      document_type: 'PURCHASE_ORDER',
      document_id: 'PO-REJ-01',
      amount: 80000000,
      initiator_id: 'buyer_ali'
    });

    const rejected = bpm.rejectWorkflow('WF-PO-REJECT', {
      rejecter_id: 'fm_sara',
      rejecter_role: 'FINANCIAL_MANAGER',
      reason: 'عدم تطابق قیمت با استعلام رسمی ستاد'
    });

    assert.strictEqual(rejected.status, 'REJECTED');
    assert.strictEqual(rejected.rejected_by.reason, 'عدم تطابق قیمت با استعلام رسمی ستاد');
  });
});
