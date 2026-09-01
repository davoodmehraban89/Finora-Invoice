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

test('validates required invoice fields and edge cases', () => {
  // Empty invoice
  assert.equal(core.validateInvoice({ items:[] }).length, 3);

  // Happy path
  const validInvoice = {
    customerId: '123',
    customerName: 'Test Customer',
    issueDate: '2023-01-01',
    items: [{ description: 'Item 1', quantity: 1, unitPrice: 100 }]
  };
  assert.equal(core.validateInvoice(validInvoice).length, 0);

  // Missing customer
  const missingCustomer = { ...validInvoice, customerId: null, customerName: null };
  assert.equal(core.validateInvoice(missingCustomer).includes('انتخاب مشتری الزامی است.'), true);

  // Missing issue date
  const missingDate = { ...validInvoice, issueDate: null };
  assert.equal(core.validateInvoice(missingDate).includes('تاریخ صدور الزامی است.'), true);

  // Item validation: Missing description
  const missingItemDesc = { ...validInvoice, items: [{ quantity: 1, unitPrice: 100 }] };
  assert.equal(core.validateInvoice(missingItemDesc).includes('شرح قلم 1 الزامی است.'), true);

  // Item validation: Zero or negative quantity
  const invalidQuantity = { ...validInvoice, items: [{ description: 'Item 1', quantity: 0, unitPrice: 100 }] };
  assert.equal(core.validateInvoice(invalidQuantity).includes('تعداد قلم 1 باید بیشتر از صفر باشد.'), true);

  // Item validation: Negative unit price
  const invalidPrice = { ...validInvoice, items: [{ description: 'Item 1', quantity: 1, unitPrice: -100 }] };
  assert.equal(core.validateInvoice(invalidPrice).includes('مبلغ قلم 1 معتبر نیست.'), true);

  // Multiple items validation
  const multiInvalidItems = { ...validInvoice, items: [
    { quantity: 1, unitPrice: 100 }, // missing desc (item 1)
    { description: 'Item 2', quantity: -1, unitPrice: 100 }, // invalid quantity (item 2)
    { description: 'Item 3', quantity: 1, unitPrice: -50 }  // invalid price (item 3)
  ]};
  const multiErrors = core.validateInvoice(multiInvalidItems);
  assert.equal(multiErrors.includes('شرح قلم 1 الزامی است.'), true);
  assert.equal(multiErrors.includes('تعداد قلم 2 باید بیشتر از صفر باشد.'), true);
  assert.equal(multiErrors.includes('مبلغ قلم 3 معتبر نیست.'), true);
});
