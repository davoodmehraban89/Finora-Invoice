/**
 * Finora Customer 360, Credit Limit Enforcement & Sales Intelligence Engine
 * Governed by Chapters 024, 036, 050, 067, 093, 115, 123, 142, 166 of the Finora Master Specification.
 *
 * Implements:
 * - Customer 360 Profile & Multi-Dimensional Exposure Calculation
 * - Strict Credit Limit Enforcement with Durable Concurrency Controls & Over-Allocation Prevention
 * - Atomic Credit Hold/Reservation mechanism for concurrent order pipelines
 * - Sales Pipeline & Opportunity Funnel with Weighted Probability
 * - RFM Customer Segmentation & Churn Risk Prediction
 */

const { MoneyPrecision } = require('../common/money-precision');

class Customer360Engine {
  constructor({ generalLedger = null } = {}) {
    this.generalLedger = generalLedger;
    this.customers = new Map(); // customer_id -> CustomerProfile
    this.opportunities = new Map(); // opp_id -> Opportunity
    this.creditOverrides = []; // Audit log of credit limit overrides
    this.creditReservations = new Map(); // reservation_id -> { customerId, amount, expiresAt }
    this.customerLocks = new Set(); // Concurrency locks
  }

  _acquireCustomerLock(customerId) {
    if (this.customerLocks.has(customerId)) {
      throw new Error(`Customer '${customerId}' is currently locked by a concurrent financial operation.`);
    }
    this.customerLocks.add(customerId);
  }

  _releaseCustomerLock(customerId) {
    this.customerLocks.delete(customerId);
  }

  /**
   * Registers a customer 360 profile with approved credit limits and risk rating.
   */
  registerCustomer({
    id,
    tenant_id = 'default_tenant',
    name,
    national_id,
    economic_code,
    credit_limit = 0,
    payment_terms_days = 30,
    risk_category = 'STANDARD' // 'LOW_RISK' | 'STANDARD' | 'HIGH_RISK' | 'SUSPENDED'
  }) {
    if (!id || !name) throw new Error('Customer ID and Name are mandatory.');

    const profile = {
      id,
      tenant_id,
      name,
      national_id: national_id || '',
      economic_code: economic_code || '',
      credit_limit: MoneyPrecision.toRials(credit_limit, false),
      payment_terms_days: Math.max(0, Number(payment_terms_days)),
      risk_category,
      current_ar_balance: 0,
      unsettled_cheques_amount: 0,
      pending_orders_amount: 0,
      total_lifetime_revenue: 0,
      completed_orders_count: 0,
      last_order_date: null,
      status: 'active',
      created_at: new Date().toISOString()
    };

    this.customers.set(id, profile);
    return profile;
  }

  /**
   * Retrieves customer 360 profile and calculates real-time exposure.
   */
  getCustomerProfile(customerId) {
    const cust = this.customers.get(customerId);
    if (!cust) throw new Error(`Customer '${customerId}' not found.`);

    const totalExposure = cust.current_ar_balance + cust.unsettled_cheques_amount + cust.pending_orders_amount;
    const availableCredit = Math.max(0, cust.credit_limit - totalExposure);
    const utilizationPercentage = cust.credit_limit > 0
      ? Number(((totalExposure / cust.credit_limit) * 100).toFixed(2))
      : (totalExposure > 0 ? 100 : 0);

    return {
      ...cust,
      exposure: {
        accounts_receivable: cust.current_ar_balance,
        unsettled_cheques: cust.unsettled_cheques_amount,
        pending_orders: cust.pending_orders_amount,
        total_exposure: totalExposure,
        credit_limit: cust.credit_limit,
        available_credit: availableCredit,
        utilization_percentage: utilizationPercentage,
        is_limit_exceeded: totalExposure > cust.credit_limit
      }
    };
  }

  /**
   * Concurrency-safe: Atomically checks and reserves credit for a new order.
   * Eliminates race conditions where concurrent orders would otherwise over-allocate available credit.
   */
  reserveCredit(customerId, requestedOrderAmount, { allowOverride = false, approver_id = null, reason = '' } = {}) {
    this._acquireCustomerLock(customerId);

    try {
      const cust = this.getCustomerProfile(customerId);
      const amount = MoneyPrecision.toRials(requestedOrderAmount, false);
      const newTotalExposure = cust.exposure.total_exposure + amount;

      if (cust.risk_category === 'SUSPENDED') {
        return {
          approved: false,
          rejection_reason: 'CUSTOMER_SUSPENDED: حساب مشتری به دلیل سابقه چک برگشتی یا ریسک بالا مسدود است.',
          code: 'SUSPENDED'
        };
      }

      if (newTotalExposure > cust.credit_limit) {
        const excessAmount = newTotalExposure - cust.credit_limit;

        if (allowOverride && approver_id) {
          const overrideId = `OVR-${Date.now()}-${this.creditOverrides.length + 1}`;
          this.creditOverrides.push({
            override_id: overrideId,
            customer_id: customerId,
            requested_amount: amount,
            excess_amount: excessAmount,
            approver_id,
            reason,
            timestamp: new Date().toISOString()
          });

          // Reserve credit
          const reservationId = `RES-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          const rawCust = this.customers.get(customerId);
          rawCust.pending_orders_amount += amount;
          this.creditReservations.set(reservationId, { customerId, amount, override: true });

          return {
            approved: true,
            reservation_id: reservationId,
            override_applied: true,
            approver_id,
            message_fa: `سفارش با تایید مدیریت (${approver_id}) فراتر از سقف اعتبار تایید و رزرو شد.`
          };
        }

        return {
          approved: false,
          rejection_reason: `CREDIT_LIMIT_EXCEEDED: سقف اعتبار مشتری (${cust.credit_limit.toLocaleString('fa-IR')} ریال) تکمیل شده است. مازاد اعتبار: ${excessAmount.toLocaleString('fa-IR')} ریال.`,
          code: 'LIMIT_EXCEEDED',
          current_exposure: cust.exposure.total_exposure,
          credit_limit: cust.credit_limit,
          excess_amount: excessAmount
        };
      }

      // Safe reservation
      const reservationId = `RES-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const rawCust = this.customers.get(customerId);
      rawCust.pending_orders_amount += amount;
      this.creditReservations.set(reservationId, { customerId, amount, override: false });

      return {
        approved: true,
        reservation_id: reservationId,
        override_applied: false,
        reserved_amount: amount,
        new_exposure: newTotalExposure,
        remaining_credit: cust.credit_limit - newTotalExposure
      };
    } finally {
      this._releaseCustomerLock(customerId);
    }
  }

  /**
   * Commits a reserved credit upon invoice generation, moving pending_orders into AR.
   */
  commitCreditReservation(reservationId) {
    const res = this.creditReservations.get(reservationId);
    if (!res) throw new Error(`Credit reservation '${reservationId}' not found.`);

    this._acquireCustomerLock(res.customerId);
    try {
      const cust = this.customers.get(res.customerId);
      cust.pending_orders_amount = Math.max(0, cust.pending_orders_amount - res.amount);
      cust.current_ar_balance += res.amount;
      this.creditReservations.delete(reservationId);
      return { success: true, customerId: res.customerId, committedAmount: res.amount };
    } finally {
      this._releaseCustomerLock(res.customerId);
    }
  }

  /**
   * Releases a reserved credit if an order is cancelled.
   */
  releaseCreditReservation(reservationId) {
    const res = this.creditReservations.get(reservationId);
    if (!res) return { success: true };

    this._acquireCustomerLock(res.customerId);
    try {
      const cust = this.customers.get(res.customerId);
      cust.pending_orders_amount = Math.max(0, cust.pending_orders_amount - res.amount);
      this.creditReservations.delete(reservationId);
      return { success: true, releasedAmount: res.amount };
    } finally {
      this._releaseCustomerLock(res.customerId);
    }
  }

  /**
   * Legacy synchronous check for backwards compatibility with tests.
   */
  checkCreditApproval(customerId, requestedOrderAmount, options = {}) {
    const res = this.reserveCredit(customerId, requestedOrderAmount, options);
    // Release immediately if just checking without placing an order
    if (res.approved && res.reservation_id) {
      this.releaseCreditReservation(res.reservation_id);
    }
    return res;
  }

  createOpportunity({
    id,
    tenant_id = 'default_tenant',
    customer_id,
    title,
    expected_value,
    stage = 'QUALIFIED',
    expected_close_date = null,
    owner_id = 'sales_rep_1'
  }) {
    if (!id || !customer_id || !title) throw new Error('Incomplete opportunity details.');

    const probabilities = {
      LEAD: 0.10,
      QUALIFIED: 0.25,
      PROPOSAL: 0.50,
      NEGOTIATION: 0.80,
      CLOSED_WON: 1.00,
      CLOSED_LOST: 0.00
    };

    const val = MoneyPrecision.toRials(expected_value, false);
    const prob = probabilities[stage] !== undefined ? probabilities[stage] : 0.20;
    const weightedVal = MoneyPrecision.multiplyRate(val, prob);

    const opp = {
      id,
      tenant_id,
      customer_id,
      title,
      expected_value: val,
      stage,
      win_probability: prob,
      weighted_value: weightedVal,
      expected_close_date,
      owner_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.opportunities.set(id, opp);
    return opp;
  }

  updateOpportunityStage(oppId, newStage) {
    const opp = this.opportunities.get(oppId);
    if (!opp) throw new Error(`Opportunity '${oppId}' not found.`);

    const probabilities = {
      LEAD: 0.10,
      QUALIFIED: 0.25,
      PROPOSAL: 0.50,
      NEGOTIATION: 0.80,
      CLOSED_WON: 1.00,
      CLOSED_LOST: 0.00
    };

    if (probabilities[newStage] === undefined) {
      throw new Error(`Invalid stage: ${newStage}`);
    }

    opp.stage = newStage;
    opp.win_probability = probabilities[newStage];
    opp.weighted_value = MoneyPrecision.multiplyRate(opp.expected_value, opp.win_probability);
    opp.updated_at = new Date().toISOString();

    return opp;
  }

  getSalesPipelineSummary(tenantId = 'default_tenant') {
    let totalUnweightedValue = 0;
    let totalWeightedValue = 0;
    const stageCounts = {
      LEAD: 0,
      QUALIFIED: 0,
      PROPOSAL: 0,
      NEGOTIATION: 0,
      CLOSED_WON: 0,
      CLOSED_LOST: 0
    };
    const stageValues = { ...stageCounts };

    for (const opp of this.opportunities.values()) {
      if (opp.tenant_id === tenantId) {
        totalUnweightedValue += opp.expected_value;
        totalWeightedValue += opp.weighted_value;
        if (stageCounts[opp.stage] !== undefined) {
          stageCounts[opp.stage]++;
          stageValues[opp.stage] += opp.expected_value;
        }
      }
    }

    return {
      total_opportunities: this.opportunities.size,
      total_unweighted_value: totalUnweightedValue,
      total_weighted_forecast: totalWeightedValue,
      stage_distribution: stageCounts,
      stage_values: stageValues
    };
  }

  calculateCustomerRfmScore(customerId) {
    const cust = this.getCustomerProfile(customerId);

    let recencyDays = 999;
    if (cust.last_order_date) {
      const diffMs = Date.now() - new Date(cust.last_order_date).getTime();
      recencyDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    const frequency = cust.completed_orders_count;
    const monetary = cust.total_lifetime_revenue;

    let segment = 'NEW';
    let segmentFa = 'مشتری جدید';

    if (frequency >= 10 && monetary >= 500000000) {
      segment = 'CHAMPION';
      segmentFa = 'مشتری کلیدی و وفادار (VIP)';
    } else if (recencyDays > 90 && frequency > 3) {
      segment = 'AT_RISK';
      segmentFa = 'در معرض ریزش (نیاز به پیگیری فروش)';
    } else if (monetary >= 200000000) {
      segment = 'HIGH_VALUE';
      segmentFa = 'باارزش تجاری بالا';
    }

    return {
      customer_id: customerId,
      customer_name: cust.name,
      recency_days: recencyDays,
      frequency_orders: frequency,
      monetary_lifetime: monetary,
      segment,
      segment_fa: segmentFa
    };
  }
}

module.exports = { Customer360Engine };
