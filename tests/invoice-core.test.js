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
  const emptyInvoice = { items: [] };
  const emptyErrors = core.validateInvoice(emptyInvoice);
  assert.equal(emptyErrors.length, 3);
  assert.ok(emptyErrors.includes('انتخاب مشتری الزامی است.'));
  assert.ok(emptyErrors.includes('تاریخ صدور الزامی است.'));
  assert.ok(emptyErrors.includes('حداقل یک قلم فاکتور لازم است.'));

  const validInvoice = {
    customerId: '123',
    customerName: 'Test Customer',
    issueDate: '2023-10-10',
    items: [
      { description: 'Item 1', quantity: 1, unitPrice: 100 }
    ]
  };
  assert.equal(core.validateInvoice(validInvoice).length, 0);

  const invalidItemsInvoice = {
    customerId: '123',
    customerName: 'Test Customer',
    issueDate: '2023-10-10',
    items: [
      { quantity: 0, unitPrice: -10 }
    ]
  };
  const itemErrors = core.validateInvoice(invalidItemsInvoice);
  assert.equal(itemErrors.length, 3);
  assert.ok(itemErrors.includes('شرح قلم 1 الزامی است.'));
  assert.ok(itemErrors.includes('تعداد قلم 1 باید بیشتر از صفر باشد.'));
  assert.ok(itemErrors.includes('مبلغ قلم 1 معتبر نیست.'));
});
