(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FinoraInvoice = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const round = value => Math.round((Number(value) || 0) * 100) / 100;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

  function calculateLine(item) {
    const quantity = Math.max(0, Number(item.quantity) || 0);
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    const discountPercent = clamp(item.discountPercent, 0, 100);
    const taxPercent = clamp(item.taxPercent, 0, 100);
    const gross = round(quantity * unitPrice);
    const discount = round(gross * discountPercent / 100);
    const taxable = round(gross - discount);
    const tax = round(taxable * taxPercent / 100);
    return { ...item, quantity, unitPrice, discountPercent, taxPercent, gross, discount, taxable, tax, total: round(taxable + tax) };
  }

  function calculateInvoice(items, invoiceDiscount = 0) {
    let sumGross = 0;
    let sumDiscount = 0;

    const lines = (items || []).map(item => {
      const line = calculateLine(item);
      sumGross += line.gross;
      sumDiscount += line.discount;
      return line;
    });

    const subtotal = round(sumGross);
    const lineDiscount = round(sumDiscount);
    const discountPercent = clamp(invoiceDiscount, 0, 100);
    const afterLineDiscount = round(subtotal - lineDiscount);
    const invoiceDiscountAmount = round(afterLineDiscount * discountPercent / 100);
    const taxableRatio = afterLineDiscount ? (afterLineDiscount - invoiceDiscountAmount) / afterLineDiscount : 0;

    let sumTax = 0;
    for (const line of lines) {
      sumTax += line.tax * taxableRatio;
    }
    const tax = round(sumTax);

    const total = round(afterLineDiscount - invoiceDiscountAmount + tax);
    return { lines, subtotal, lineDiscount, discountPercent, invoiceDiscountAmount, tax, total };
  }

  function paymentStatus(total, paid) {
    const balance = round(Math.max(0, (Number(total) || 0) - (Number(paid) || 0)));
    if (!total || !paid) return { code: 'unpaid', label: 'پرداخت‌نشده', balance };
    if (balance <= 0) return { code: 'paid', label: 'پرداخت‌شده', balance: 0 };
    return { code: 'partial', label: 'پرداخت ناقص', balance };
  }

  function documentStatus(invoice) {
    const payment = paymentStatus(invoice.total, invoice.paidAmount);
    if (invoice.documentStatus === 'void') return { ...payment, code: 'draft', label: 'باطل‌شده' };
    if (invoice.documentStatus === 'draft') return { ...payment, code: 'draft', label: 'پیش‌نویس' };
    return payment;
  }

  function validateInvoice(invoice) {
    const errors = [];
    if (!invoice.customerId || !invoice.customerName) errors.push('انتخاب مشتری الزامی است.');
    if (!invoice.issueDate) errors.push('تاریخ صدور الزامی است.');
    if (!invoice.items || invoice.items.length === 0) errors.push('حداقل یک قلم فاکتور لازم است.');
    (invoice.items || []).forEach((item, index) => {
      if (!item.description) errors.push(`شرح قلم ${index + 1} الزامی است.`);
      if (!(Number(item.quantity) > 0)) errors.push(`تعداد قلم ${index + 1} باید بیشتر از صفر باشد.`);
      if (Number(item.unitPrice) < 0) errors.push(`مبلغ قلم ${index + 1} معتبر نیست.`);
    });
    return errors;
  }

  return { calculateLine, calculateInvoice, paymentStatus, documentStatus, validateInvoice, round };
});
