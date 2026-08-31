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
    const lines = (items || []).map(calculateLine);
    const subtotal = round(lines.reduce((sum, line) => sum + line.gross, 0));
    const lineDiscount = round(lines.reduce((sum, line) => sum + line.discount, 0));
    const discountPercent = clamp(invoiceDiscount, 0, 100);
    const afterLineDiscount = round(subtotal - lineDiscount);
    const invoiceDiscountAmount = round(afterLineDiscount * discountPercent / 100);
    const taxableRatio = afterLineDiscount ? (afterLineDiscount - invoiceDiscountAmount) / afterLineDiscount : 0;
    const tax = round(lines.reduce((sum, line) => sum + line.tax * taxableRatio, 0));
    const total = round(afterLineDiscount - invoiceDiscountAmount + tax);
    return { lines, subtotal, lineDiscount, discountPercent, invoiceDiscountAmount, tax, total };
  }

  function applyTaxMode(items, vatMode = 'excluded', vatRate = 0) {
    const enabled = vatMode === 'included';
    const rate = enabled ? clamp(vatRate, 0, 100) : 0;
    return (items || []).map(item => ({ ...item, taxPercent: rate }));
  }

  function taxContext(invoice = {}) {
    const invoiceType = invoice.invoiceType === 'official' ? 'official' : 'ordinary';
    const vatMode = invoice.vatMode === 'included' ? 'included' : 'excluded';
    return {
      invoiceType,
      invoiceTypeLabel: invoiceType === 'official' ? 'فاکتور رسمی' : 'فاکتور معمولی',
      vatMode,
      vatModeLabel: vatMode === 'included' ? 'با ارزش افزوده' : 'بدون ارزش افزوده',
      vatRate: vatMode === 'included' ? clamp(invoice.vatRate, 0, 100) : 0
    };
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
    if (invoice.invoiceType != null && !['ordinary', 'official'].includes(invoice.invoiceType)) errors.push('نوع فاکتور معتبر نیست.');
    if (invoice.vatMode != null && !['excluded', 'included'].includes(invoice.vatMode)) errors.push('وضعیت ارزش افزوده معتبر نیست.');
    if (invoice.vatMode === 'included' && !(Number(invoice.vatRate) > 0)) errors.push('برای فاکتور دارای ارزش افزوده، نرخ معتبر لازم است.');
    (invoice.items || []).forEach((item, index) => {
      if (!item.description) errors.push(`شرح قلم ${index + 1} الزامی است.`);
      if (!(Number(item.quantity) > 0)) errors.push(`تعداد قلم ${index + 1} باید بیشتر از صفر باشد.`);
      if (Number(item.unitPrice) < 0) errors.push(`مبلغ قلم ${index + 1} معتبر نیست.`);
    });
    return errors;
  }

  return { calculateLine, calculateInvoice, applyTaxMode, taxContext, paymentStatus, documentStatus, validateInvoice, round };
});
