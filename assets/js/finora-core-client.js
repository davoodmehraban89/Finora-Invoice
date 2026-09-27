function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports.escapeHtml = escapeHtml;
}

/**
 * Finora Client-Side Core Bridge & State Management
 * Connects HTML frontend pages directly to verified Finora domain engines.
 * Governed by Chapters 006, 007, 013, 014, 019, 021, 023, 034, 035, 037, 045, 049, 051, 052, 062, 066, 068, 072, 094, 117, 125, 141, 143, 144, 170, 232, 239, 242, 252.
 */

let GeneralLedger, PostingEngine, InvoiceEngine, TaxRuleEngine, defaultTaxEngine, IranMoadianAdapter, Counterparty, CatalogItem, TenantContext, CashFlowEngine, DocumentStore, ContractEngine, ContractRiskAnalyzer, PayrollEngine, defaultPayrollTaxEngine, defaultSocialSecurityEngine, StockEngine, ProcurementEngine, SayadChequeEngine, BankReconciliationEngine;

if (typeof require !== 'undefined') {
  GeneralLedger = require('../../src/ledger/general-ledger').GeneralLedger;
  PostingEngine = require('../../src/ledger/posting-engine').PostingEngine;
  InvoiceEngine = require('../../src/invoicing/invoice-engine').InvoiceEngine;
  const taxModule = require('../../src/tax/tax-rule-engine');
  TaxRuleEngine = taxModule.TaxRuleEngine;
  defaultTaxEngine = taxModule.defaultTaxEngine;
  IranMoadianAdapter = require('../../src/tax/iran-moadian-adapter').IranMoadianAdapter;
  Counterparty = require('../../src/domain/canonical/counterparty').Counterparty;
  CatalogItem = require('../../src/domain/canonical/catalog-item').CatalogItem;
  TenantContext = require('../../src/security/tenant-context').TenantContext;
  CashFlowEngine = require('../../src/treasury/cash-flow-engine').CashFlowEngine;
  DocumentStore = require('../../src/documents/document-store').DocumentStore;
  ContractEngine = require('../../src/contracts/contract-engine').ContractEngine;
  ContractRiskAnalyzer = require('../../src/contracts/contract-risk-analyzer').ContractRiskAnalyzer;
  PayrollEngine = require('../../src/payroll/payroll-engine').PayrollEngine;
  defaultPayrollTaxEngine = require('../../src/payroll/payroll-tax-engine').defaultPayrollTaxEngine;
  defaultSocialSecurityEngine = require('../../src/payroll/social-security-engine').defaultSocialSecurityEngine;
  StockEngine = require('../../src/inventory/stock-engine').StockEngine;
  ProcurementEngine = require('../../src/procurement/procurement-engine').ProcurementEngine;
  const SUPER_ADMIN_EMAILS = new Set([
  'davoodmehraban89@gmail.com'
]);

class FinoraClient {
  constructor(options = {}) {
    this.tenantId = options.tenantId || 'ten_tehran_default';
    this.organizationId = options.organizationId || 'org_tehran_default';
    this.userId = options.userId || 'usr_davood';

    let storedEmail = 'davoodmehraban89@gmail.com';
    let storedName = 'داوود مهربان';
    if (typeof localStorage !== 'undefined') {
      const localEmail = localStorage.getItem('finora_user_email');
      const localName = localStorage.getItem('finora_user_name');
      if (localEmail) storedEmail = localEmail;
      if (localName) storedName = localName;
    }

    this.userEmail = (options.userEmail || storedEmail).toLowerCase().trim();
    this.userName = options.userName || storedName;
    const isSuperAdmin = SUPER_ADMIN_EMAILS.has(this.userEmail) || options.is_super_admin;

    // 1. Initialize Tenant Context with Super Admin auto-detection
    this.context = new TenantContext({
      user_id: this.userId,
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      email: this.userEmail,
      is_super_admin: isSuperAdmin,
      roles: isSuperAdmin 
        ? ['owner', 'super_admin', 'finance_manager', 'hr_manager', 'procurement_manager', 'holding_auditor']
        : (options.roles || ['user'])
    });

    this.procurementEngine = new ProcurementEngine({
      postingEngine: this.postingEngine,
      stockEngine: this.stockEngine,
      taxEngine: this.taxEngine
    });

    this.invoiceEngine = new InvoiceEngine({
      postingEngine: this.postingEngine,
      taxEngine: this.taxEngine
    });

    this.treasury = new CashFlowEngine({ postingEngine: this.postingEngine });
    this.documentStore = new DocumentStore();
    this.contractEngine = new ContractEngine({ documentStore: this.documentStore });
    this.payrollEngine = new PayrollEngine({
      postingEngine: this.postingEngine,
      taxEngine: defaultPayrollTaxEngine,
      ssoEngine: defaultSocialSecurityEngine
    });
    this.moadianAdapter = new IranMoadianAdapter({ fiscalMemoryId: 'TAX-MEM-1405-TEH' });
    this.chequeEngine = new SayadChequeEngine({ postingEngine: this.postingEngine });
    this.bankReconEngine = new BankReconciliationEngine({ postingEngine: this.postingEngine });

    // 4. In-Memory Store & Seed Data
    this.customers = new Map();
    this.suppliers = new Map();
    this.products = new Map();
    this.seedDefaultData();
  }

  initChartOfAccounts() {
    this.ledger.registerAccount({ code: '1101', name: 'موجودی نقد و بانک (Cash & Bank)', category: 'asset', nature: 'debit' });
    this.ledger.registerAccount({ code: '1102', name: 'اسناد دریافتنی نزد صندوق (Notes Receivable)', category: 'asset', nature: 'debit' });
    this.ledger.registerAccount({ code: '1104', name: 'اسناد در جریان وصول (Notes in Collection)', category: 'asset', nature: 'debit' });
    this.ledger.registerAccount({ code: '2104', name: 'اسناد پرداختنی تجاری (Notes Payable)', category: 'liability', nature: 'credit' });
    this.ledger.registerAccount({ code: '6105', name: 'کارمزد و هزینه‌های مالی بانکی (Bank Charges)', category: 'expense', nature: 'debit' });
    this.ledger.registerAccount({ code: '1103', name: 'حساب‌های دریافتنی تجاری (Accounts Receivable)', category: 'asset', nature: 'debit' });
    this.ledger.registerAccount({ code: '1105', name: 'موجودی کالا (Inventory)', category: 'asset', nature: 'debit' });
    this.ledger.registerAccount({ code: '2101', name: 'حساب‌های پرداختنی تجاری / بستانکاران (Accounts Payable)', category: 'liability', nature: 'credit' });
    this.ledger.registerAccount({ code: '2102', name: 'مالیات بر ارزش افزوده پرداختنی (Output VAT Payable)', category: 'liability', nature: 'credit' });
    this.ledger.registerAccount({ code: '4101', name: 'درآمد فروش کالا و خدمات (Sales Revenue)', category: 'revenue', nature: 'credit' });
    this.ledger.registerAccount({ code: '5101', name: 'هزینه‌های عملیاتی و حقوق (Salary & Operating Expense)', category: 'expense', nature: 'debit' });
  }

  seedDefaultData() {
    // Default Organization Bank Account
    this.treasury.registerBankAccount({
      id: 'bank_acc_01',
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      bank_name: 'بانک ملت - شعبه مرکزی تهران',
      account_number: '48882001122',
      iban: 'IR020120000000004888200112',
      opening_balance: 150000000
    });

    // Default Customer
    const cust = new Counterparty({
      id: 'cust_01',
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      type: 'legal',
      name: 'شرکت پترو تجهیز سپهر',
      national_id: '10103829100',
      economic_code: '411382910001',
      roles: ['customer'],
      phone: '021-88776655',
      address: 'تهران، خیابان ولیعصر'
    });
    this.customers.set(cust.id, cust);

    // Seed Sample Chequebook
    this.chequeEngine.registerChequebook({
      id: 'book_melli_01',
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      bank_account_id: 'bank_acc_01',
      bank_name: 'بانک ملت - شعبه مرکزی تهران',
      start_serial: 10001,
      end_serial: 10050,
      total_leaves: 50
    });

    // Default Supplier
    const supp = new Counterparty({
      id: 'supp_01',
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      type: 'legal',
      name: 'صنایع الکترونیک شیراز (تأمین‌کننده)',
      national_id: '10100998877',
      economic_code: '411998877001',
      roles: ['supplier'],
      phone: '071-33221100',
      address: 'شیراز، شهرک صنعتی بزرگ'
    });
    this.suppliers.set(supp.id, supp);

    // Default Products
    const prod1 = new CatalogItem({
      id: 'prod_01',
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      code: 'SRV-ENT-01',
      name: 'لایسنس نرم‌افزار جامع مدیریت فینورا',
      type: 'service',
      unit: 'LICENSE',
      tax_item_identifier: '2710000011111',
      base_sale_price: 120000000,
      base_purchase_price: 60000000,
      is_taxable: true
    });

    const prod2 = new CatalogItem({
      id: 'prod_02',
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      code: 'HW-RACK-42',
      name: 'سرور اختصاصی رک ۴۲ یونیت',
      type: 'goods',
      unit: 'EA',
      tax_item_identifier: '2710000022222',
      base_sale_price: 350000000,
      base_purchase_price: 250000000,
      is_taxable: true
    });

    this.products.set(prod1.id, prod1);
    this.products.set(prod2.id, prod2);

    // Seed Sample Contract
    const contract = this.contractEngine.createContract({
      id: 'cnt_sample_01',
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      contract_number: 'CNT-1405-001',
      contract_type: 'sales',
      counterparty: cust,
      title: 'قرارداد توسعه و استقرار زیرساخت سازمانی فینورا',
      description: 'استقرار نسخه یکپارچه ERP سازمانی و انطباق با سامانه مؤدیان',
      start_date: '2026-09-01',
      end_date: '2027-08-31',
      contract_amount: 12000000000,
      payment_terms: '۳۰٪ پیش‌پرداخت، ۴۰٪ تحویل فاز ۱، ۳۰٪ تسویه نهایی'
    });

    this.contractEngine.addClause(contract.id, {
      type: 'scope',
      title: 'موضوع و محدوده تعهدات',
      text: 'پیاده‌سازی ماژول‌های حسابداری، انبار، صورتحساب و سامانه مؤدیان.'
    });

    this.contractEngine.addObligation({
      id: 'obl_01',
      contract_id: contract.id,
      party_role: 'organization',
      type: 'delivery',
      description: 'تحویل و نصب ماژول هسته مالی و ثبت دفترکل',
      due_date: '2026-10-15',
      amount: 4000000000,
      responsible_person: 'داوود مهربان'
    });

    this.contractEngine.evaluateContractRisk(contract.id);

    // Seed Sample Employees
    this.payrollEngine.registerEmployee({
      id: 'emp_01',
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      employee_code: 'EMP-101',
      first_name: 'داوود',
      last_name: 'مهربان',
      national_id: '0012345678',
      department: 'فناوری و مهندسی',
      position: 'معمار ارشد سیستم',
      base_salary: 180000000,
      housing_allowance: 9000000,
      grocery_allowance: 14000000,
      child_count: 1
    });

    this.payrollEngine.registerEmployee({
      id: 'emp_02',
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      employee_code: 'EMP-102',
      first_name: 'مریم',
      last_name: 'اسکندری',
      national_id: '0023456789',
      department: 'مالی و حسابداری',
      position: 'کارشناس ارشد حسابداری',
      base_salary: 130000000,
      housing_allowance: 9000000,
      grocery_allowance: 14000000,
      child_count: 1
    });

    // Seed Sample Procurement PO & Goods Receipt for Three-Way Matching demonstration
    const samplePO = this.procurementEngine.createPurchaseOrder({
      id: 'po_sample_01',
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      po_number: 'PO-1405-001',
      supplier: supp,
      delivery_date: '2026-10-01',
      items: [
        {
          itemId: prod2.id,
          name: prod2.name,
          quantity: 5,
          unitPrice: 200000000 // 200M Rials agreed unit price
        }
      ],
      actor: 'داوود مهربان'
    });

    // Receive 5 units in warehouse
    this.procurementEngine.recordGoodsReceipt({
      id: 'gr_sample_01',
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      po_id: samplePO.id,
      items: [{ itemId: prod2.id, receivedQuantity: 5 }],
      actor: 'انباردار مرکزی'
    });

    // Submit matching supplier purchase invoice
    const samplePI = this.procurementEngine.submitSupplierInvoice({
      id: 'pi_sample_01',
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      invoice_number: 'PINV-SHIRAZ-9988',
      po_id: samplePO.id,
      items: [{ itemId: prod2.id, billedQuantity: 5, billedUnitPrice: 200000000 }]
    });

    // Execute Three-Way Match & Approve
    this.procurementEngine.executeThreeWayMatch(samplePI.id);
    this.procurementEngine.approveMatchedInvoice(samplePI.id, 'داوود مهربان');
  }

  seedTreasuryData() {
    this.chequeEngine.registerReceivedCheque({
      id: 'chq_seed_01',
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      sayad_id: '7012987654321098',
      cheque_number: '883920',
      bank_name: 'بانک پاسارگاد',
      branch_name: 'شعبه سعادت‌آباد',
      drawer_name: 'شرکت پترو تجهیز سپهر',
      customer_id: 'cust_01',
      amount: 120000000,
      issue_date: '1405/02/15',
      due_date: '1405/03/30',
      description: 'بابت تسویه فاکتور فروش تجهیزات'
    });
  }

  getDashboardMetrics() {
    const trialBalance = this.ledger.getTrialBalance();
    const invoices = Array.from(this.invoiceEngine.invoices.values());
    const cashPos = this.treasury.calculateCashPosition(this.tenantId, this.organizationId);

    let totalSalesGross = 0;
    let totalVatOutput = 0;
    let postedInvoicesCount = 0;

    for (const inv of invoices) {
      if (inv.status === 'posted') {
        totalSalesGross += inv.total_net_amount;
        totalVatOutput += inv.total_tax_amount;
        postedInvoicesCount++;
      }
    }

    const arAcc = this.ledger.getAccount('1103');
    const totalReceivables = arAcc ? arAcc.netBalance : 0;
    const apAcc = this.ledger.getAccount('2101');
    const totalPayables = apAcc ? apAcc.netBalance : 0;

    const contracts = Array.from(this.contractEngine.contracts.values());
    let totalContractValue = 0;
    let activeContractsCount = 0;

    for (const c of contracts) {
      totalContractValue += c.contract_amount;
      if (['approved', 'signed', 'active', 'amended'].includes(c.status)) {
        activeContractsCount++;
      }
    }

    const dueObligations = this.contractEngine.getDueObligations(30);

    const employees = this.payrollEngine.listEmployees(this.tenantId);
    const pos = Array.from(this.procurementEngine.purchaseOrders.values());
    let totalPoSpend = 0;
    pos.forEach(p => totalPoSpend += p.total_final_amount);

    return {
      total_sales_revenue: totalSalesGross,
      total_vat_output: totalVatOutput,
      total_liquid_cash: cashPos.total_liquid_cash,
      total_receivables: totalReceivables,
      total_payables: totalPayables,
      total_invoices_count: invoices.length,
      posted_invoices_count: postedInvoicesCount,
      total_contracts_count: contracts.length,
      active_contracts_count: activeContractsCount,
      total_contract_value: totalContractValue,
      due_obligations_count: dueObligations.length,
      active_employees_count: employees.length,
      total_po_spend: totalPoSpend,
      purchase_orders_count: pos.length,
      trial_balance_balanced: trialBalance.isBalanced,
      total_debit: trialBalance.totalDebit,
      total_credit: trialBalance.totalCredit,
      bank_accounts: cashPos.accounts
    };
  }

  // Procurement Methods
  getSuppliers() {
    return Array.from(this.suppliers.values());
  }

  getPurchaseOrders() {
    return Array.from(this.procurementEngine.purchaseOrders.values());
  }

  getSupplierInvoices() {
    return Array.from(this.procurementEngine.supplierInvoices.values());
  }

  createPurchaseOrder(data) {
    const supp = this.suppliers.get(data.supplierId) || this.customers.get(data.supplierId);
    if (!supp) throw new Error(`Supplier '${data.supplierId}' not found.`);

    return this.procurementEngine.createPurchaseOrder({
      id: data.id || `po_${Date.now()}`,
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      po_number: data.po_number,
      supplier: supp,
      delivery_date: data.delivery_date,
      items: data.items,
      actor: data.actor || 'داوود مهربان'
    });
  }

  recordGoodsReceipt(data) {
    return this.procurementEngine.recordGoodsReceipt({
      id: data.id || `gr_${Date.now()}`,
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      po_id: data.po_id,
      items: data.items,
      actor: data.actor || 'انباردار مرکزی'
    });
  }

  submitSupplierInvoice(data) {
    return this.procurementEngine.submitSupplierInvoice({
      id: data.id || `pi_${Date.now()}`,
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      invoice_number: data.invoice_number,
      po_id: data.po_id,
      items: data.items,
      actor: data.actor || 'حسابداری خرید'
    });
  }

  executeThreeWayMatch(supplierInvoiceId) {
    return this.procurementEngine.executeThreeWayMatch(supplierInvoiceId);
  }

  approveMatchedPurchaseInvoice(supplierInvoiceId, actor = 'مدیر مالی') {
    return this.procurementEngine.approveMatchedInvoice(supplierInvoiceId, actor);
  }

  // Payroll Methods
  getEmployees() {
    return this.payrollEngine.listEmployees(this.tenantId);
  }

  createEmployee(data) {
    return this.payrollEngine.registerEmployee({
      ...data,
      tenant_id: this.tenantId,
      organization_id: this.organizationId
    });
  }

  calculateEmployeeSalary(params) {
    return this.payrollEngine.calculateEmployeeSalary(params);
  }

  executeMonthlyPayrollRun(params) {
    return this.payrollEngine.executeMonthlyPayrollRun({
      ...params,
      tenant_id: this.tenantId,
      organization_id: this.organizationId
    });
  }

  getPayrollRuns() {
    return Array.from(this.payrollEngine.payrollRuns.values());
  }

  // Contract Methods
  getContracts() {
    return Array.from(this.contractEngine.contracts.values());
  }

  getContract(id) {
    return this.contractEngine.contracts.get(id);
  }

  createContract(data) {
    const cust = this.customers.get(data.counterpartyId);
    if (!cust) throw new Error(`Counterparty '${data.counterpartyId}' not found.`);

    return this.contractEngine.createContract({
      id: data.id || `cnt_${Date.now()}`,
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      contract_number: data.contract_number,
      contract_type: data.contract_type || 'sales',
      counterparty: cust,
      title: data.title,
      description: data.description || '',
      start_date: data.start_date,
      end_date: data.end_date,
      contract_amount: data.contract_amount,
      payment_terms: data.payment_terms || ''
    });
  }

  addContractClause(contractId, clauseData) {
    return this.contractEngine.addClause(contractId, clauseData);
  }

  addContractObligation(contractId, oblData) {
    return this.contractEngine.addObligation({
      ...oblData,
      contract_id: contractId
    });
  }

  approveContract(contractId, actor = 'داوود مهربان') {
    return this.contractEngine.approveContract(contractId, actor);
  }

  signContract(contractId, signerId = 'داوود مهربان') {
    return this.contractEngine.signContract(contractId, { signerId });
  }

  createContractAmendment(contractId, amendmentData) {
    return this.contractEngine.createAmendment(contractId, amendmentData);
  }

  evaluateContractRisk(contractId) {
    return this.contractEngine.evaluateContractRisk(contractId);
  }

  getCustomers() {
    return Array.from(this.customers.values());
  }

  createCustomer(data) {
    const cust = new Counterparty({
      id: data.id || `cust_${Date.now()}`,
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      type: data.type || 'legal',
      name: data.name,
      national_id: data.national_id,
      economic_code: data.economic_code,
      phone: data.phone,
      address: data.address
    });
    this.customers.set(cust.id, cust);

    // Seed Sample Chequebook
    this.chequeEngine.registerChequebook({
      id: 'book_melli_01',
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      bank_account_id: 'bank_acc_01',
      bank_name: 'بانک ملت - شعبه مرکزی تهران',
      start_serial: 10001,
      end_serial: 10050,
      total_leaves: 50
    });
    return cust;
  }

  getProducts() {
    return Array.from(this.products.values());
  }

  createProduct(data) {
    const item = new CatalogItem({
      id: data.id || `prod_${Date.now()}`,
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      code: data.code,
      name: data.name,
      type: data.type || 'goods',
      unit: data.unit || 'EA',
      tax_item_identifier: data.tax_item_identifier,
      base_sale_price: Number(data.base_sale_price) || 0,
      base_purchase_price: Number(data.base_purchase_price) || 0,
      is_taxable: data.is_taxable !== false
    });
    this.products.set(item.id, item);
    return item;
  }

  getInvoices() {
    return Array.from(this.invoiceEngine.invoices.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  createInvoiceWithLines({ invoiceNumber, customerId, invoiceDate, lines, actor = 'user' }) {
    const customer = this.customers.get(customerId);
    if (!customer) throw new Error(`Customer '${customerId}' not found.`);

    const invoiceId = `inv_${Date.now()}`;
    const invoice = this.invoiceEngine.createDraftInvoice({
      id: invoiceId,
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      invoice_number: invoiceNumber,
      customer,
      invoice_date: invoiceDate,
      created_by: actor
    });

    for (const l of lines) {
      const prod = this.products.get(l.productId);
      if (!prod) throw new Error(`Product '${l.productId}' not found.`);
      this.invoiceEngine.addItemLine(invoice.id, {
        item: prod,
        quantity: l.quantity,
        unit_price: l.unitPrice,
        discount_amount: l.discount || 0
      });
    }

    return invoice;
  }

  approveAndPostInvoice(invoiceId, actor = 'finance_manager') {
    return this.invoiceEngine.approveAndPost(invoiceId, actor);
  }

  exportMoadianPayload(invoiceId) {
    const invoice = this.invoiceEngine.invoices.get(invoiceId);
    if (!invoice) throw new Error(`Invoice '${invoiceId}' not found.`);
    const customer = this.customers.get(invoice.customer_id);

    const seller = {
      national_id: '10101010101',
      economic_code: '411111111111',
      legal_name: 'شرکت پلتفرم مالی فینورا'
    };

    return this.moadianAdapter.generateMoadianPayload(invoice, seller, customer);
  }
}

  authenticate({ email, fullName, password } = {}) {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const isAdmin = SUPER_ADMIN_EMAILS.has(normalizedEmail);

    this.userEmail = normalizedEmail || 'davoodmehraban89@gmail.com';
    this.userName = fullName || (isAdmin ? 'داوود مهربان' : 'کاربر سازمانی');
    this.userId = isAdmin ? 'usr_davood' : 'usr_' + Date.now();

    this.context = new TenantContext({
      user_id: this.userId,
      tenant_id: this.tenantId,
      organization_id: this.organizationId,
      email: this.userEmail,
      is_super_admin: isAdmin,
      roles: isAdmin 
        ? ['owner', 'super_admin', 'finance_manager', 'hr_manager', 'procurement_manager', 'holding_auditor']
        : ['user']
    });

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('finora_user_email', this.userEmail);
      localStorage.setItem('finora_user_name', this.userName);
      localStorage.setItem('finora_is_admin', isAdmin ? 'true' : 'false');
    }

    return {
      success: true,
      email: this.userEmail,
      userName: this.userName,
      isAdmin,
      isSuperAdmin: isAdmin,
      roles: this.context.roles
    };
  }

  registerUser({ email, fullName, password } = {}) {
    return this.authenticate({ email, fullName, password });
  }

  getCurrentUser() {
    const isAdmin = SUPER_ADMIN_EMAILS.has(this.userEmail) || this.context.is_super_admin;
    return {
      userId: this.userId,
      userName: this.userName,
      email: this.userEmail,
      isAdmin,
      isSuperAdmin: isAdmin,
      roles: this.context.roles,
      tenantId: this.tenantId,
      organizationId: this.organizationId
    };
  }

  isAdmin() {
    return this.context.is_super_admin || SUPER_ADMIN_EMAILS.has(this.userEmail);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FinoraClient, escapeHtml };
}

// Global client instance & DOM UI Sync
if (typeof window !== 'undefined') {
  window.SUPER_ADMIN_EMAILS = SUPER_ADMIN_EMAILS;
  if (!window.finora) {
    window.finora = new FinoraClient();
  }

  document.addEventListener('DOMContentLoaded', () => {
    try {
      const client = window.finora;
      if (!client) return;
      const user = client.getCurrentUser();
      
      const emailEl = document.getElementById('current-user-email');
      const nameEl = document.getElementById('current-user-name');
      const roleEl = document.getElementById('current-user-role');
      
      if (emailEl) emailEl.textContent = user.email;
      if (nameEl) nameEl.textContent = user.userName;
      if (roleEl) {
        if (user.isAdmin) {
          roleEl.textContent = '👑 مدیر کل و مالک سامانه (Super Admin & Owner)';
        } else {
          roleEl.textContent = 'کاربر استاندارد';
        }
      }
    } catch (e) {
      console.warn('Finora user badge init warning:', e);
    }
  });
}
  
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FinoraClient, escapeHtml };
}
