const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { GeneralLedger } = require('../src/ledger/general-ledger');
const { Article141ComplianceEngine } = require('../src/governance/article-141-compliance-engine');

describe('Corporate Trade Law & Article 141 Solvency Intelligence (Chapters 141, 167, 193, 219, 245)', () => {
  let ledger;
  let engine;

  beforeEach(() => {
    ledger = new GeneralLedger();
    ledger.registerAccount({ code: '3101', name: 'Share Capital', category: 'equity', nature: 'credit' });
    ledger.registerAccount({ code: '3201', name: 'Retained Earnings / Accumulated Loss', category: 'equity', nature: 'credit' });
    ledger.registerAccount({ code: '3202', name: 'Legal Reserve', category: 'equity', nature: 'credit' });

    engine = new Article141ComplianceEngine({ generalLedger: ledger });
  });

  it('Classifies a solvent enterprise with low loss as HEALTHY', () => {
    const res = engine.evaluateSolvencyStatus({
      tenant_id: 'ten_ara_beten',
      organization_id: 'org_ara_beten',
      registered_capital_override: 1000000000, // 1 Billion IRR Capital
      accumulated_loss_override: 100000000    // 100M Loss (10%)
    });

    assert.strictEqual(res.impairment_metrics.is_subject_to_article_141, false);
    assert.strictEqual(res.impairment_metrics.loss_percentage, 10.0);
    assert.strictEqual(res.impairment_metrics.severity_tier, 'HEALTHY');
    assert.strictEqual(res.compliance_enforcement.mandatory_actions.length, 0);
  });

  it('Identifies early warning threshold when loss is between 35% and 49% (WATCHLIST)', () => {
    const res = engine.evaluateSolvencyStatus({
      tenant_id: 'ten_gas_co',
      organization_id: 'org_gas_co',
      registered_capital_override: 2000000000,
      accumulated_loss_override: 800000000 // 40% loss
    });

    assert.strictEqual(res.impairment_metrics.is_subject_to_article_141, false);
    assert.strictEqual(res.impairment_metrics.loss_percentage, 40.0);
    assert.strictEqual(res.impairment_metrics.severity_tier, 'WATCHLIST');
  });

  it('Detects Article 141 trigger at >= 50% loss and enforces statutory 60-day EGA mandate', () => {
    const res = engine.evaluateSolvencyStatus({
      tenant_id: 'ten_distressed',
      organization_id: 'org_distressed',
      registered_capital_override: 1000000000,
      accumulated_loss_override: 600000000 // 60% loss -> Subject to Art 141
    });

    assert.strictEqual(res.impairment_metrics.is_subject_to_article_141, true);
    assert.strictEqual(res.impairment_metrics.loss_percentage, 60.0);
    assert.strictEqual(res.impairment_metrics.severity_tier, 'ARTICLE_141_TRIGGERED');

    // Statutory board actions
    assert.strictEqual(res.compliance_enforcement.statutory_assembly_deadline_days, 60);
    assert.ok(res.compliance_enforcement.mandatory_actions.some(a => a.code === 'ACTION_CONVENE_EGA'));

    // Min capital increase required = (600M * 2) - 1000M = 200M
    assert.strictEqual(res.compliance_enforcement.remediation_thresholds.min_capital_increase_to_exit, 200000000);
  });

  it('Detects severe negative equity when accumulated losses exceed 100% of share capital', () => {
    const res = engine.evaluateSolvencyStatus({
      tenant_id: 'ten_insolvent',
      organization_id: 'org_insolvent',
      registered_capital_override: 500000000,
      accumulated_loss_override: 750000000 // 150% loss
    });

    assert.strictEqual(res.impairment_metrics.is_subject_to_article_141, true);
    assert.strictEqual(res.impairment_metrics.severity_tier, 'NEGATIVE_EQUITY_INSOLVENCY');
    assert.ok(res.financial_figures.net_equity < 0);
  });

  it('Simulates corporate restructuring solutions: Cash Capital Increase and Asset Revaluation', () => {
    // Current state: Capital 1,000M, Loss 600M (60% ratio)
    // 1. Solution A: Cash capital increase of 300M -> New capital 1,300M, Loss 600M -> 46.15% (Exits Art 141)
    const simCash = engine.simulateRemediation({
      current_capital: 1000000000,
      current_loss: 600000000,
      method: 'CASH_CAPITAL_INCREASE',
      injection_amount: 300000000
    });

    assert.strictEqual(simCash.exited_article_141, true);
    assert.ok(simCash.new_loss_to_capital_ratio < 0.50);

    // 2. Solution B: Asset revaluation surplus of 500M -> Capital 1,500M, Loss 600M -> 40.0% (Exits Art 141)
    const simReval = engine.simulateRemediation({
      current_capital: 1000000000,
      current_loss: 600000000,
      method: 'ASSET_REVALUATION',
      revaluation_surplus: 500000000
    });

    assert.strictEqual(simReval.exited_article_141, true);
    assert.strictEqual(simReval.new_loss_percentage, 40.0);

    // 3. Solution C: Insufficient capital reduction of only 50M -> Pro-forma capital 950M, loss 550M -> 57.89% (Fails to exit)
    const simFail = engine.simulateRemediation({
      current_capital: 1000000000,
      current_loss: 600000000,
      method: 'CAPITAL_REDUCTION',
      injection_amount: 50000000
    });

    assert.strictEqual(simFail.exited_article_141, false);
  });

  it('Generates formal legal Extraordinary General Assembly Notice in Persian', () => {
    const notice = engine.generateExtraordinaryAssemblyNotice({
      company_name: 'آرا بتن مهربان (سهامی خاص)',
      national_id: '10101589542',
      assembly_date: '1405/08/15',
      assembly_time: '11:00',
      location: 'تهران، شهر قدس، بلوار دامداران',
      current_capital: 1000000000,
      current_loss: 650000000
    });

    assert.ok(notice.notice_title.includes('ماده ۱۴۱'));
    assert.ok(notice.notice_body.includes('مجمع عمومی فوق‌العاده'));
    assert.ok(notice.notice_body.includes('آرا بتن مهربان'));
    assert.ok(notice.notice_body.includes('بقا یا انحلال'));
  });
});
