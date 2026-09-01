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

test('keeps balance while presenting document lifecycle', () => {
  const draft = core.documentStatus({ documentStatus: 'draft', total: 1200, paidAmount: 200 });
  assert.equal(draft.label, 'پیش‌نویس');
  assert.equal(draft.balance, 1000);
  assert.equal(core.documentStatus({ documentStatus: 'void', total: 1200, paidAmount: 0 }).label, 'باطل‌شده');
});

test('validates required invoice fields', () => {
  assert.equal(core.validateInvoice({ items:[] }).length, 3);
});

test('handles calculateLine edge cases (NaN, extreme values, high precision)', () => {
  const edge = core.calculateLine({ quantity: 'bad', unitPrice: -10, discountPercent: 150, taxPercent: -5 });
  assert.deepEqual([edge.quantity, edge.unitPrice, edge.discountPercent, edge.taxPercent, edge.total], [0, 0, 100, 0, 0]);

  const precise = core.calculateLine({ quantity: 3, unitPrice: 33.3333, taxPercent: 9.999 });
  assert.deepEqual([precise.gross, precise.tax, precise.total], [100, 10, 110]);
});
