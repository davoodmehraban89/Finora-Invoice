const assert = require('node:assert/strict');
const test = require('node:test');
const core = require('../assets/js/invoice-core.js');
const taxRules = require('../assets/js/tax-rules.js');

test('calculates line, discount, tax and invoice discount', () => {
  const result = core.calculateInvoice([{ description:'A', quantity:2, unitPrice:1000, discountPercent:10, taxPercent:10 }], 10);
  assert.equal(result.subtotal, 2000);
  assert.equal(result.lineDiscount, 200);
  assert.equal(result.invoiceDiscountAmount, 180);
  assert.equal(result.tax, 162);
  assert.equal(result.total, 1782);
});

test('reports payment states', () => {
  assert.equal(core.paymentStatus(1000, 0).code, 'unpaid');
  assert.equal(core.paymentStatus(1000, 400).balance, 600);
  assert.equal(core.paymentStatus(1000, 1000).code, 'paid');
});

test('keeps balance while presenting document lifecycle', () => {
  const draft = core.documentStatus({ documentStatus: 'draft', total: 1200, paidAmount: 200 });
  assert.equal(draft.label, 'پیش‌نویس');
  assert.equal(draft.balance, 1000);
  assert.equal(core.documentStatus({ documentStatus: 'void', total: 1200, paidAmount: 0 }).label, 'باطل‌شده');
});

test('validates required invoice fields', () => {
  assert.equal(core.validateInvoice({ items:[] }).length, 3);
});

test('applies or removes the annual VAT rate deterministically', () => {
  const source = [{ description:'A', quantity:1, unitPrice:1000, taxPercent:3 }];
  assert.equal(core.calculateInvoice(core.applyTaxMode(source, 'included', 10)).tax, 100);
  assert.equal(core.calculateInvoice(core.applyTaxMode(source, 'excluded', 10)).tax, 0);
});

test('requires a positive VAT rate when VAT is enabled', () => {
  const invoice = { customerId:'c', customerName:'C', issueDate:'1405-06-09', items:[{description:'A',quantity:1,unitPrice:1}], invoiceType:'official', vatMode:'included', vatRate:0 };
  assert.match(core.validateInvoice(invoice).join(' '), /نرخ معتبر/);
});

test('resolves the versioned 1405 Iran VAT profile from Persian or Latin digits', () => {
  assert.equal(taxRules.getProfile('۱۴۰۵-۰۶-۰۹').generalVatRate, 10);
  assert.equal(taxRules.getProfile('1405-06-09').version, 'IR-VAT-1405.1');
  assert.equal(taxRules.getProfile('1406-01-01').fallback, true);
});

test('converts invoice amounts to deterministic Persian words', () => {
  assert.equal(core.amountToWords(0), 'صفر');
  assert.equal(core.amountToWords(19), 'نوزده');
  assert.equal(core.amountToWords(1250), 'یک هزار و دویست و پنجاه');
  assert.equal(core.amountToWords(1000001), 'یک میلیون و یک');
});
