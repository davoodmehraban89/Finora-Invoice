/**
 * Finora Sayad Cheque Lifecycle Engine with Endorsed Dishonor Handling
 * Governed by Chapters 020, 033, 243.
 * Implements Iranian New Cheque Law (قانون جدید چک صیادی):
 * - 16-digit unique Sayad ID validation.
 * - Received Cheque state machine:
 *     vault -> in_collection -> cleared | bounced | endorsed -> endorsed_bounced
 * - Issued Cheque state machine:
 *     issued -> cleared | cancelled
 * - Endorsed Cheque Dishonor (برگشت چک خرج شده): Restores AP to supplier and AR to customer.
 * - Automated double-entry GL journal posting at each transition.
 */

const { MoneyPrecision } = require('../common/money-precision');

class SayadChequeEngine {
  constructor({ postingEngine = null } = {}) {
    this.postingEngine = postingEngine;
    this.receivedCheques = new Map(); // id -> Cheque
    this.issuedCheques = new Map(); // id -> Cheque
    this.chequebooks = new Map(); // id -> Chequebook
  }

  static validateSayadId(sayadId) {
    if (!sayadId || typeof sayadId !== 'string') return false;
    const clean = sayadId.trim();
    return /^\d{16}$/.test(clean);
  }

  /**
   * Register a new received Sayad cheque into treasury vault
   */
  registerReceivedCheque({
    id,
    tenant_id,
    organization_id,
    sayad_id,
    cheque_number,
    bank_name,
    branch_name,
    drawer_name,
    drawer_national_id,
    customer_id,
    amount,
    issue_date,
    due_date,
    currency = 'IRR',
    description = '',
    actor = 'treasury_officer'
  }) {
    if (!SayadChequeEngine.validateSayadId(sayad_id)) {
      throw new Error(`Invalid Sayad ID '${sayad_id}'. Must be exactly 16 numeric digits.`);
    }
    const numAmt = MoneyPrecision.toRials(amount, false);
    if (numAmt <= 0) throw new Error('Cheque amount must be greater than zero.');

    const cheque = {
      id,
      tenant_id,
      organization_id,
      direction: 'received',
      sayad_id,
      cheque_number,
      bank_name,
      branch_name,
      drawer_name,
      drawer_national_id,
      customer_id,
      amount: numAmt,
      issue_date,
      due_date,
      currency,
      description,
      status: 'vault', // vault, in_collection, cleared, bounced, endorsed, endorsed_bounced
      collection_bank_id: null,
      endorsed_to: null,
      history: [{
        status: 'vault',
        timestamp: new Date().toISOString(),
        actor,
        note: 'Registered into treasury vault'
      }]
    };

    this.receivedCheques.set(id, cheque);

    // GL Posting: Debit 1102 (Notes Receivable), Credit 1103 (Accounts Receivable)
    if (this.postingEngine) {
      this.postingEngine.postEvent({
        event_id: `EVT-CHQ-REC-${id}`,
        event_type: 'CHEQUE_RECEIVED',
        tenant_id,
        organization_id,
        occurred_at: new Date().toISOString(),
        effective_date: issue_date || new Date().toISOString().split('T')[0],
        source_module: 'treasury',
        source_entity_id: id,
        currency,
        idempotency_key: `IDEMP-CHQ-REC-${id}`,
        description: `دریافت چک صیاد ${sayad_id} به مبلغ ${numAmt.toLocaleString('fa-IR')} از ${drawer_name}`,
        lines: [
          {
            account_code: '1102',
            debit: numAmt,
            credit: 0,
            description: `چک صیاد ${sayad_id} - ${drawer_name}`
          },
          {
            account_code: '1103',
            debit: 0,
            credit: numAmt,
            party_id: customer_id,
            description: `تسویه دریافتنی مشتری با چک ${sayad_id}`
          }
        ]
      }, actor);
    }

    return cheque;
  }

  depositChequeToBank(chequeId, bankAccountId, bankAccountName, actor = 'treasury_officer') {
    const cheque = this.receivedCheques.get(chequeId);
    if (!cheque) throw new Error(`Received cheque '${chequeId}' not found.`);
    if (cheque.status !== 'vault') {
      throw new Error(`Cannot deposit cheque with status '${cheque.status}'. Must be in 'vault'.`);
    }

    cheque.status = 'in_collection';
    cheque.collection_bank_id = bankAccountId;
    cheque.history.push({
      status: 'in_collection',
      timestamp: new Date().toISOString(),
      actor,
      note: `Deposited to bank ${bankAccountName} for collection`
    });

    if (this.postingEngine) {
      this.postingEngine.postEvent({
        event_id: `EVT-CHQ-DEP-${cheque.id}`,
        event_type: 'CHEQUE_DEPOSITED',
        tenant_id: cheque.tenant_id,
        organization_id: cheque.organization_id,
        occurred_at: new Date().toISOString(),
        effective_date: new Date().toISOString().split('T')[0],
        source_module: 'treasury',
        source_entity_id: cheque.id,
        currency: cheque.currency,
        idempotency_key: `IDEMP-CHQ-DEP-${cheque.id}`,
        description: `واگذاری چک صیاد ${cheque.sayad_id} به بانک ${bankAccountName} جهت وصول`,
        lines: [
          {
            account_code: '1104',
            debit: cheque.amount,
            credit: 0,
            description: `اسناد در جریان وصول - چک ${cheque.sayad_id}`
          },
          {
            account_code: '1102',
            debit: 0,
            credit: cheque.amount,
            description: `خروج از صندوق و تحویل به بانک`
          }
        ]
      }, actor);
    }

    return cheque;
  }

  clearReceivedCheque(chequeId, effectiveDate = null, actor = 'bank_teller') {
    const cheque = this.receivedCheques.get(chequeId);
    if (!cheque) throw new Error(`Received cheque '${chequeId}' not found.`);
    if (cheque.status !== 'in_collection') {
      throw new Error(`Cannot clear cheque with status '${cheque.status}'. Must be 'in_collection'.`);
    }

    cheque.status = 'cleared';
    cheque.cleared_date = effectiveDate || new Date().toISOString().split('T')[0];
    cheque.history.push({
      status: 'cleared',
      timestamp: new Date().toISOString(),
      actor,
      note: 'Cleared successfully and credited to bank account'
    });

    if (this.postingEngine) {
      this.postingEngine.postEvent({
        event_id: `EVT-CHQ-CLR-${cheque.id}`,
        event_type: 'CHEQUE_CLEARED',
        tenant_id: cheque.tenant_id,
        organization_id: cheque.organization_id,
        occurred_at: new Date().toISOString(),
        effective_date: cheque.cleared_date,
        source_module: 'treasury',
        source_entity_id: cheque.id,
        currency: cheque.currency,
        idempotency_key: `IDEMP-CHQ-CLR-${cheque.id}`,
        description: `وصول چک صیاد ${cheque.sayad_id} و واریز به حساب بانکی`,
        lines: [
          {
            account_code: '1101',
            debit: cheque.amount,
            credit: 0,
            description: `واریز وصولی چک صیاد ${cheque.sayad_id}`
          },
          {
            account_code: '1104',
            debit: 0,
            credit: cheque.amount,
            description: `تسویه اسناد در جریان وصول`
          }
        ]
      }, actor);
    }

    return cheque;
  }

  bounceReceivedCheque(chequeId, bounceReason = 'کسری موجودی', actor = 'bank_teller') {
    const cheque = this.receivedCheques.get(chequeId);
    if (!cheque) throw new Error(`Received cheque '${chequeId}' not found.`);
    if (cheque.status !== 'in_collection') {
      throw new Error(`Cannot bounce cheque with status '${cheque.status}'. Must be 'in_collection'.`);
    }

    cheque.status = 'bounced';
    cheque.bounce_reason = bounceReason;
    cheque.history.push({
      status: 'bounced',
      timestamp: new Date().toISOString(),
      actor,
      note: `Cheque bounced: ${bounceReason}`
    });

    if (this.postingEngine) {
      this.postingEngine.postEvent({
        event_id: `EVT-CHQ-BNC-${cheque.id}`,
        event_type: 'CHEQUE_BOUNCED',
        tenant_id: cheque.tenant_id,
        organization_id: cheque.organization_id,
        occurred_at: new Date().toISOString(),
        effective_date: new Date().toISOString().split('T')[0],
        source_module: 'treasury',
        source_entity_id: cheque.id,
        currency: cheque.currency,
        idempotency_key: `IDEMP-CHQ-BNC-${cheque.id}`,
        description: `برگشت چک صیاد ${cheque.sayad_id} به دلیل ${bounceReason}`,
        lines: [
          {
            account_code: '1103',
            debit: cheque.amount,
            credit: 0,
            party_id: cheque.customer_id,
            description: `احیای بدهی ناشی از برگشت چک ${cheque.sayad_id}`
          },
          {
            account_code: '1104',
            debit: 0,
            credit: cheque.amount,
            description: `خروج چک برگشتی از اسناد در جریان وصول`
          }
        ]
      }, actor);
    }

    return cheque;
  }

  endorseChequeToSupplier(chequeId, supplierId, supplierName, actor = 'finance_manager') {
    const cheque = this.receivedCheques.get(chequeId);
    if (!cheque) throw new Error(`Received cheque '${chequeId}' not found.`);
    if (cheque.status !== 'vault') {
      throw new Error(`Cannot endorse cheque with status '${cheque.status}'. Must be in 'vault'.`);
    }

    cheque.status = 'endorsed';
    cheque.endorsed_to = { supplierId, supplierName };
    cheque.history.push({
      status: 'endorsed',
      timestamp: new Date().toISOString(),
      actor,
      note: `Endorsed to supplier ${supplierName}`
    });

    if (this.postingEngine) {
      this.postingEngine.postEvent({
        event_id: `EVT-CHQ-END-${cheque.id}`,
        event_type: 'CHEQUE_ENDORSED',
        tenant_id: cheque.tenant_id,
        organization_id: cheque.organization_id,
        occurred_at: new Date().toISOString(),
        effective_date: new Date().toISOString().split('T')[0],
        source_module: 'treasury',
        source_entity_id: cheque.id,
        currency: cheque.currency,
        idempotency_key: `IDEMP-CHQ-END-${cheque.id}`,
        description: `واگذاری و خرج چک صیاد ${cheque.sayad_id} به تأمین‌کننده ${supplierName}`,
        lines: [
          {
            account_code: '2101',
            debit: cheque.amount,
            credit: 0,
            party_id: supplierId,
            description: `تسویه بدهی تأمین‌کننده ${supplierName}`
          },
          {
            account_code: '1102',
            debit: 0,
            credit: cheque.amount,
            description: `واگذاری فیزیکی چک به تأمین‌کننده`
          }
        ]
      }, actor);
    }

    return cheque;
  }

  /**
   * DEFECT 08: Endorsed Cheque Bounce Lifecycle (برگشت چک خرج شده)
   * When an endorsed cheque is dishonored in the supplier's bank:
   * 1. Reinstates the liability to the supplier (Credit 2101 Accounts Payable).
   * 2. Reinstates the claim against the original drawer/customer (Debit 1103 Accounts Receivable).
   * 3. Transitions status to 'endorsed_bounced'.
   * 4. Records legal protest certificate and central bank bounce documentation.
   */
  bounceEndorsedCheque(chequeId, {
    bounceReason = 'کسری موجودی در بانک مقصد',
    protestCertificateNumber = null,
    actor = 'treasury_officer'
  } = {}) {
    const cheque = this.receivedCheques.get(chequeId);
    if (!cheque) throw new Error(`Received cheque '${chequeId}' not found.`);
    if (cheque.status !== 'endorsed') {
      throw new Error(`Cannot bounce endorsed cheque with status '${cheque.status}'. Must be 'endorsed'.`);
    }

    const endorsedSupplier = cheque.endorsed_to;
    if (!endorsedSupplier) {
      throw new Error(`Endorsement details missing for cheque '${chequeId}'.`);
    }

    cheque.status = 'endorsed_bounced';
    cheque.bounce_reason = bounceReason;
    cheque.protest_certificate_number = protestCertificateNumber;
    cheque.bounced_at = new Date().toISOString();

    cheque.history.push({
      status: 'endorsed_bounced',
      timestamp: new Date().toISOString(),
      actor,
      note: `Endorsed cheque dishonored. Protest Cert: ${protestCertificateNumber || 'N/A'}. Reason: ${bounceReason}`
    });

    // GL Posting:
    // Debit: 1103 Accounts Receivable (مشتری بدهکار می‌شود)
    // Credit: 2101 Accounts Payable (بستانکاری مجدد تأمین‌کننده)
    if (this.postingEngine) {
      this.postingEngine.postEvent({
        event_id: `EVT-CHQ-EBNC-${cheque.id}`,
        event_type: 'CHEQUE_ENDORSED_BOUNCED',
        tenant_id: cheque.tenant_id,
        organization_id: cheque.organization_id,
        occurred_at: new Date().toISOString(),
        effective_date: new Date().toISOString().split('T')[0],
        source_module: 'treasury',
        source_entity_id: cheque.id,
        currency: cheque.currency,
        idempotency_key: `IDEMP-CHQ-EBNC-${cheque.id}`,
        description: `برگشت چک صیاد خرج‌شده ${cheque.sayad_id}: احیای بدهی به تأمین‌کننده ${endorsedSupplier.supplierName} و احیای طلب از مشتری ${cheque.drawer_name}`,
        lines: [
          {
            account_code: '1103', // Accounts Receivable
            debit: cheque.amount,
            credit: 0,
            party_id: cheque.customer_id,
            description: `احیای طلب از مشتری به دلیل برگشت چک صیاد ${cheque.sayad_id}`
          },
          {
            account_code: '2101', // Accounts Payable
            debit: 0,
            credit: cheque.amount,
            party_id: endorsedSupplier.supplierId,
            description: `احیای بدهی به تأمین‌کننده ${endorsedSupplier.supplierName} ناشی از عدم وصول چک واگذار شده`
          }
        ]
      }, actor);
    }

    return cheque;
  }

  registerChequebook({
    id,
    tenant_id,
    organization_id,
    bank_account_id,
    bank_name,
    start_serial,
    end_serial,
    total_leaves
  }) {
    const book = {
      id,
      tenant_id,
      organization_id,
      bank_account_id,
      bank_name,
      start_serial: Number(start_serial),
      end_serial: Number(end_serial),
      total_leaves: Number(total_leaves),
      used_leaves: 0,
      active: true
    };
    this.chequebooks.set(id, book);
    return book;
  }

  issuePaymentCheque({
    id,
    tenant_id,
    organization_id,
    chequebook_id,
    sayad_id,
    cheque_number,
    bank_account_id,
    payee_id,
    payee_name,
    amount,
    issue_date,
    due_date,
    currency = 'IRR',
    description = '',
    actor = 'finance_manager'
  }) {
    if (!SayadChequeEngine.validateSayadId(sayad_id)) {
      throw new Error(`Invalid Sayad ID '${sayad_id}'. Must be exactly 16 numeric digits.`);
    }
    const numAmt = MoneyPrecision.toRials(amount, false);
    if (numAmt <= 0) throw new Error('Cheque amount must be greater than zero.');

    const cheque = {
      id,
      tenant_id,
      organization_id,
      direction: 'issued',
      chequebook_id,
      sayad_id,
      cheque_number,
      bank_account_id,
      payee_id,
      payee_name,
      amount: numAmt,
      issue_date,
      due_date,
      currency,
      description,
      status: 'issued',
      history: [{
        status: 'issued',
        timestamp: new Date().toISOString(),
        actor,
        note: `Issued to payee ${payee_name}`
      }]
    };

    this.issuedCheques.set(id, cheque);

    if (this.postingEngine) {
      this.postingEngine.postEvent({
        event_id: `EVT-CHQ-ISS-${id}`,
        event_type: 'CHEQUE_ISSUED',
        tenant_id,
        organization_id,
        occurred_at: new Date().toISOString(),
        effective_date: issue_date || new Date().toISOString().split('T')[0],
        source_module: 'treasury',
        source_entity_id: id,
        currency,
        idempotency_key: `IDEMP-CHQ-ISS-${id}`,
        description: `صدور چک صیاد ${sayad_id} در وجه ${payee_name} به مبلغ ${numAmt.toLocaleString('fa-IR')}`,
        lines: [
          {
            account_code: '2101',
            debit: numAmt,
            credit: 0,
            party_id: payee_id,
            description: `تسویه حساب با صدور چک برای ${payee_name}`
          },
          {
            account_code: '2104',
            debit: 0,
            credit: numAmt,
            description: `تعهد چک صیاد شماره ${sayad_id}`
          }
        ]
      }, actor);
    }

    return cheque;
  }

  clearIssuedCheque(chequeId, effectiveDate = null, actor = 'treasury_officer') {
    const cheque = this.issuedCheques.get(chequeId);
    if (!cheque) throw new Error(`Issued cheque '${chequeId}' not found.`);
    if (cheque.status !== 'issued') {
      throw new Error(`Cannot clear issued cheque with status '${cheque.status}'. Must be 'issued'.`);
    }

    cheque.status = 'cleared';
    cheque.cleared_date = effectiveDate || new Date().toISOString().split('T')[0];
    cheque.history.push({
      status: 'cleared',
      timestamp: new Date().toISOString(),
      actor,
      note: 'Funds debited from company bank account'
    });

    if (this.postingEngine) {
      this.postingEngine.postEvent({
        event_id: `EVT-CHQ-PCLR-${cheque.id}`,
        event_type: 'ISSUED_CHEQUE_CLEARED',
        tenant_id: cheque.tenant_id,
        organization_id: cheque.organization_id,
        occurred_at: new Date().toISOString(),
        effective_date: cheque.cleared_date,
        source_module: 'treasury',
        source_entity_id: cheque.id,
        currency: cheque.currency,
        idempotency_key: `IDEMP-CHQ-PCLR-${cheque.id}`,
        description: `پاس شدن چک صیاد پرداختنی ${cheque.sayad_id} و کسر از حساب بانک`,
        lines: [
          {
            account_code: '2104',
            debit: cheque.amount,
            credit: 0,
            description: `تسویه تعهد اسناد پرداختنی - چک ${cheque.sayad_id}`
          },
          {
            account_code: '1101',
            debit: 0,
            credit: cheque.amount,
            description: `برداشت بانکی بابت چک صیاد ${cheque.sayad_id}`
          }
        ]
      }, actor);
    }

    return cheque;
  }

  getSummary(tenantId, organizationId) {
    let receivedVault = 0;
    let receivedCollection = 0;
    let receivedCleared = 0;
    let receivedBounced = 0;
    let receivedEndorsed = 0;
    let receivedEndorsedBounced = 0;
    let issuedOutstanding = 0;
    let issuedCleared = 0;

    for (const chq of this.receivedCheques.values()) {
      if (chq.tenant_id === tenantId && chq.organization_id === organizationId) {
        if (chq.status === 'vault') receivedVault += chq.amount;
        else if (chq.status === 'in_collection') receivedCollection += chq.amount;
        else if (chq.status === 'cleared') receivedCleared += chq.amount;
        else if (chq.status === 'bounced') receivedBounced += chq.amount;
        else if (chq.status === 'endorsed') receivedEndorsed += chq.amount;
        else if (chq.status === 'endorsed_bounced') receivedEndorsedBounced += chq.amount;
      }
    }

    for (const chq of this.issuedCheques.values()) {
      if (chq.tenant_id === tenantId && chq.organization_id === organizationId) {
        if (chq.status === 'issued') issuedOutstanding += chq.amount;
        else if (chq.status === 'cleared') issuedCleared += chq.amount;
      }
    }

    return {
      received: {
        vault: receivedVault,
        in_collection: receivedCollection,
        cleared: receivedCleared,
        bounced: receivedBounced,
        endorsed: receivedEndorsed,
        endorsed_bounced: receivedEndorsedBounced,
        total_active: receivedVault + receivedCollection
      },
      issued: {
        outstanding: issuedOutstanding,
        cleared: issuedCleared,
        total_liability: issuedOutstanding
      }
    };
  }
}

module.exports = { SayadChequeEngine };
