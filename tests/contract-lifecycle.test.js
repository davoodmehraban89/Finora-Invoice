const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { ContractEngine } = require('../src/contracts/contract-engine');
const { ContractRiskAnalyzer } = require('../src/contracts/contract-risk-analyzer');
const { Counterparty } = require('../src/domain/canonical/counterparty');

describe('Advanced Contract Lifecycle & Legal Risk Intelligence (Chapters 019, 034, 052, 072, 099, 116, 177)', () => {
  let engine;
  let counterparty;

  beforeEach(() => {
    engine = new ContractEngine({});
    counterparty = new Counterparty({
      id: 'cust_petro_01',
      tenant_id: 'ten_tehran',
      organization_id: 'org_tehran',
      type: 'legal',
      name: 'شرکت پترو تجهیز سپهر',
      national_id: '10103829100'
    });
  });

  it('Creates draft contract, adds clauses, and evaluates risk score', () => {
    const contract = engine.createContract({
      id: 'cnt_2026_01',
      tenant_id: 'ten_tehran',
      organization_id: 'org_tehran',
      contract_number: 'CNT-1405-001',
      contract_type: 'sales',
      counterparty,
      title: 'قرارداد تأمین تجهیزات و پشتیبانی نرم‌افزار',
      start_date: '2026-09-01',
      end_date: '2028-08-31', // 24 months long-term contract
      contract_amount: 15000000000 // 15 Billion Rials (> 10B triggers high exposure risk)
    });

    assert.strictEqual(contract.status, 'draft');
    assert.strictEqual(contract.version, 1);
    assert.strictEqual(contract.is_locked, false);

    // Add normal scope clause
    engine.addClause(contract.id, {
      type: 'scope',
      title: 'موضوع قرارداد',
      text: 'پیاده‌سازی ماژول‌های ERP'
    });

    // Evaluate risk: Should flag Financial Exposure (>10B) and Missing Price Adjustment (>12 months without price adjustment)
    const risk = engine.evaluateContractRisk(contract.id);
    assert.ok(risk.risk_score >= 40);
    assert.strictEqual(risk.risk_level, 'high');
    assert.ok(risk.findings.some(f => f.id === 'FR-01')); // High Financial Exposure
    assert.ok(risk.findings.some(f => f.id === 'FR-02')); // Missing Price Adjustment
  });

  it('Detects critical risk for unlimited liability and excessive penalties', () => {
    const contract = engine.createContract({
      id: 'cnt_crit_01',
      tenant_id: 'ten_tehran',
      organization_id: 'org_tehran',
      contract_number: 'CNT-CRIT-99',
      contract_type: 'service',
      counterparty,
      title: 'قرارداد خدمات پرخطر',
      start_date: '2026-09-01',
      end_date: '2027-03-01',
      contract_amount: 5000000000
    });

    // Add unlimited liability clause
    engine.addClause(contract.id, {
      type: 'liability',
      title: 'مسئولیت مدنی',
      text: 'پیمانکار مسئولیت نامحدود برای جبران کلیه خسارات وارده را به عهده می‌گیرد.'
    });

    // Add excessive penalty clause
    engine.addClause(contract.id, {
      type: 'penalty',
      title: 'جریمه دیرکرد',
      text: 'جریمه تأخیر تحویل روزانه ۱ درصد بدون سقف خسارت محاسبه خواهد شد.'
    });

    const risk = engine.evaluateContractRisk(contract.id);
    assert.ok(risk.risk_score >= 60);
    assert.strictEqual(risk.risk_level, 'critical');
    assert.ok(risk.findings.some(f => f.id === 'LEG-01')); // Unlimited Liability
    assert.ok(risk.findings.some(f => f.id === 'LEG-02')); // Excessive Liquidated Damages
  });

  it('Manages lifecycle: Approve -> Sign -> Freeze -> Rejection of direct mutation', () => {
    const contract = engine.createContract({
      id: 'cnt_sign_01',
      tenant_id: 'ten_tehran',
      organization_id: 'org_tehran',
      contract_number: 'CNT-SIGN-01',
      counterparty,
      title: 'قرارداد رسمی امضاشده',
      start_date: '2026-09-01',
      end_date: '2027-09-01',
      contract_amount: 8000000000
    });

    // Cannot sign directly from draft without approval
    assert.throws(() => engine.signContract(contract.id, { signerId: 'usr_director' }), /must be approved prior to signing/);

    // Approve contract
    engine.approveContract(contract.id, 'legal_counsel_reza');
    assert.strictEqual(contract.status, 'approved');

    // Sign contract -> Freezes snapshot
    const signResult = engine.signContract(contract.id, { signerId: 'usr_director' });
    assert.strictEqual(contract.status, 'signed');
    assert.strictEqual(contract.is_locked, true);
    assert.ok(signResult.snapshotDigest);

    // Direct mutation of clauses after signing is rejected
    assert.throws(
      () => engine.addClause(contract.id, { type: 'scope', title: 'تغییر', text: 'تغییر غیرمجاز' }),
      /Cannot modify clauses of signed contract/
    );
  });

  it('Creates versioned amendment (الحاقیه) advancing version and adjusting financial terms', () => {
    const contract = engine.createContract({
      id: 'cnt_amend_01',
      tenant_id: 'ten_tehran',
      organization_id: 'org_tehran',
      contract_number: 'CNT-AMD-01',
      counterparty,
      title: 'قرارداد پایه',
      start_date: '2026-09-01',
      end_date: '2027-09-01',
      contract_amount: 10000000000 // 10B
    });

    engine.approveContract(contract.id, 'legal_user');
    engine.signContract(contract.id, { signerId: 'director_user' });

    // Issue Amendment: Increase amount by 3 Billion Rials & extend end date
    const amendResult = engine.createAmendment(contract.id, {
      amendment_type: 'amount_change',
      amount_change: 3000000000,
      date_change: '2027-12-30',
      reason: 'افزایش حجم کار و الحاق فاز دوم استقرار',
      actor: 'contract_manager_ali'
    });

    assert.strictEqual(contract.version, 2);
    assert.strictEqual(contract.contract_amount, 13000000000); // 10B + 3B = 13B
    assert.strictEqual(contract.end_date, '2027-12-30');
    assert.strictEqual(contract.status, 'amended');
    assert.strictEqual(amendResult.amendment.previous_version, 1);
    assert.strictEqual(amendResult.amendment.new_version, 2);
  });

  it('Manages contractual obligations, due date window filtering, and evidence completion', () => {
    const contract = engine.createContract({
      id: 'cnt_obl_01',
      tenant_id: 'ten_tehran',
      organization_id: 'org_tehran',
      contract_number: 'CNT-OBL-01',
      counterparty,
      title: 'قرارداد با تعهدات زمان‌دار',
      start_date: '2026-09-01',
      end_date: '2027-09-01',
      contract_amount: 6000000000
    });

    // Add Obligation 1: Due in 10 days
    const in10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const obl1 = engine.addObligation({
      contract_id: contract.id,
      party_role: 'organization',
      type: 'delivery',
      description: 'ارائه گزارش پیشرفت کار ماه اول',
      due_date: in10Days,
      responsible_person: 'کارشناس پروژه'
    });

    // Add Obligation 2: Due in 90 days (outside 30-day window)
    const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    engine.addObligation({
      contract_id: contract.id,
      party_role: 'counterparty',
      type: 'payment',
      description: 'پرداخت نهایی قرارداد',
      due_date: in90Days
    });

    // Check due obligations within 30-day window
    const dueList = engine.getDueObligations(30);
    assert.strictEqual(dueList.length, 1);
    assert.strictEqual(dueList[0].id, obl1.id);

    // Complete obligation with evidence document reference
    engine.updateObligationStatus(obl1.id, 'completed', 'DOC-EVIDENCE-REPORT-01');
    assert.strictEqual(obl1.status, 'completed');
    assert.strictEqual(obl1.evidence_document_id, 'DOC-EVIDENCE-REPORT-01');
    assert.ok(obl1.completed_at);

    // After completion, it should no longer be listed in pending due obligations
    const dueAfterCompletion = engine.getDueObligations(30);
    assert.strictEqual(dueAfterCompletion.length, 0);
  });
});
