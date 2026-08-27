const assert = require('node:assert/strict');
const test = require('node:test');
const core = require('../assets/js/invoice-core.js');

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

test('validates required invoice fields', () => {
  assert.equal(core.validateInvoice({ items:[] }).length, 3);
});
