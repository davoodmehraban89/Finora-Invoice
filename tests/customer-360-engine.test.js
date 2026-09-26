const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { Customer360Engine } = require('../src/crm/customer-360-engine');

describe('Customer 360, Credit Limit Enforcement & Sales Intelligence (Chapters 024, 036, 050, 067, 093, 115, 123, 142, 166)', () => {
  let crm;

  beforeEach(() => {
    crm = new Customer360Engine();
  });

  it('Registers customer 360 profile and calculates available credit limit accurately', () => {
    const cust = crm.registerCustomer({
      id: 'CUST-001',
      name: 'شرکت توسعه مسکن تهران',
      national_id: '10101589542',
      credit_limit: 500000000, // 500M IRR
      payment_terms_days: 45
    });

    const profile = crm.getCustomerProfile('CUST-001');
    assert.strictEqual(profile.exposure.credit_limit, 500000000);
    assert.strictEqual(profile.exposure.available_credit, 500000000);
    assert.strictEqual(profile.exposure.utilization_percentage, 0);
    assert.strictEqual(profile.exposure.is_limit_exceeded, false);
  });

  it('Strictly enforces credit limits and blocks orders that exceed available credit', () => {
    crm.registerCustomer({
      id: 'CUST-002',
      name: 'مصالح ساختمانی ملک‌پور',
      credit_limit: 200000000 // 200M IRR
    });

    // 1. Order of 150M within 200M limit -> APPROVED
    const check1 = crm.checkCreditApproval('CUST-002', 150000000);
    assert.strictEqual(check1.approved, true);
    assert.strictEqual(check1.remaining_credit, 50000000);

    // 2. Order of 250M exceeding 200M limit -> BLOCKED
    const check2 = crm.checkCreditApproval('CUST-002', 250000000);
    assert.strictEqual(check2.approved, false);
    assert.strictEqual(check2.code, 'LIMIT_EXCEEDED');
    assert.strictEqual(check2.excess_amount, 50000000);
    assert.ok(check2.rejection_reason.includes('CREDIT_LIMIT_EXCEEDED'));
  });

  it('Allows authorized managerial override for credit limit expansion with audit tracking', () => {
    crm.registerCustomer({
      id: 'CUST-003',
      name: 'فروشگاه مصالح ساختمانی کالینول',
      credit_limit: 100000000
    });

    const check = crm.checkCreditApproval('CUST-003', 180000000, {
      allowOverride: true,
      approver_id: 'cfo_davood',
      reason: 'سرمایه‌گذاری در پروژه عمرانی بزرگ و اخذ وثیقه ملکی'
    });

    assert.strictEqual(check.approved, true);
    assert.strictEqual(check.override_applied, true);
    assert.strictEqual(check.approver_id, 'cfo_davood');
    assert.strictEqual(crm.creditOverrides.length, 1);
    assert.strictEqual(crm.creditOverrides[0].excess_amount, 80000000);
  });

  it('Blocks any credit allocation to suspended counterparties', () => {
    crm.registerCustomer({
      id: 'CUST-004',
      name: 'مشتری پرریسک با چک برگشتی',
      credit_limit: 300000000,
      risk_category: 'SUSPENDED'
    });

    const check = crm.checkCreditApproval('CUST-004', 10000000);
    assert.strictEqual(check.approved, false);
    assert.strictEqual(check.code, 'SUSPENDED');
  });

  it('Manages Sales Opportunities, Funnel Stages, and calculates weighted revenue forecast', () => {
    crm.createOpportunity({
      id: 'OPP-01',
      customer_id: 'CUST-001',
      title: 'تأمین ۲۰,۰۰۰ عدد بلوک سبک سیمانی پروژه چیتگر',
      expected_value: 1000000000, // 1 Billion IRR
      stage: 'QUALIFIED' // 25% probability -> 250M weighted
    });

    crm.createOpportunity({
      id: 'OPP-02',
      customer_id: 'CUST-002',
      title: 'خرید مصالح جدول دور باغچه و کفپوش بتنی',
      expected_value: 500000000, // 500M IRR
      stage: 'NEGOTIATION' // 80% probability -> 400M weighted
    });

    let summary = crm.getSalesPipelineSummary();
    assert.strictEqual(summary.total_opportunities, 2);
    assert.strictEqual(summary.total_unweighted_value, 1500000000);
    assert.strictEqual(summary.total_weighted_forecast, 650000000); // 250M + 400M

    // Progress OPP-01 from QUALIFIED to CLOSED_WON (100%)
    crm.updateOpportunityStage('OPP-01', 'CLOSED_WON');
    summary = crm.getSalesPipelineSummary();
    assert.strictEqual(summary.total_weighted_forecast, 1400000000); // 1000M + 400M
    assert.strictEqual(summary.stage_distribution.CLOSED_WON, 1);
  });

  it('Calculates RFM segmentation and identifies customers at churn risk', () => {
    const cust = crm.registerCustomer({
      id: 'CUST-VIP',
      name: 'آرا بتن مرکزی',
      credit_limit: 1000000000
    });
    cust.completed_orders_count = 15;
    cust.total_lifetime_revenue = 800000000;
    cust.last_order_date = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days ago

    const rfm = crm.calculateCustomerRfmScore('CUST-VIP');
    assert.strictEqual(rfm.segment, 'CHAMPION');
    assert.strictEqual(rfm.frequency_orders, 15);
  });
});
