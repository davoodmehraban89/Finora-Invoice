'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const baseUrl = process.env.FINORA_BASE_URL || 'http://127.0.0.1:4173';
const evidenceDir = process.env.FINORA_EVIDENCE_DIR || path.resolve(process.cwd(), '.uat-evidence');
fs.mkdirSync(evidenceDir, { recursive: true });

const seller = {
  id: 'seller', businessName: 'شرکت آزمون فینورا', nationalId: '۱۴۰۰۱۲۳۴۵۶۷', economicCode: '۴۱۱۱۱۱۱۱۱۱۱۱', registrationNumber: '۱۲۳۴۵',
  phone: '۰۲۱۸۸۷۷۶۶۵۵', postalCode: '۱۵۸۷۵۴۳۶۹۱', province: 'تهران', city: 'تهران', address: 'خیابان آزمون، پلاک ۱۲', bankAccount: 'IR۱۲۳۴۵۶۷۸۹۰۱۲۳۴۵۶۷۸۹۰۱۲۳۴',
  invoiceFooter: 'پرداخت حداکثر تا تاریخ سررسید انجام شود.', invoiceNumberEditable: false, invoicePrefix: 'FI-', defaultInvoiceType: 'ordinary', defaultVatMode: 'excluded', defaultPaymentMethod: 'نقدی', defaultOutputMode: 'pdf', currencyUnit: 'rial'
};
const customer = { id: 'uat-customer', name: 'شرکت خریدار آزمون', type: 'legal', nationalId: '۱۰۱۰۱۲۳۴۵۶۷', economicCode: '۴۲۲۲۲۲۲۲۲۲۲۲', registrationNumber: '۵۴۳۲۱', phone: '۰۲۱۴۴۴۴۴۴۴۴', postalCode: '۱۴۵۶۷۸۹۰۱۲', address: 'تهران، خیابان خریدار', email: 'must-not-print@example.com', active: true };
const line = index => ({ description: `قلم آزمون ${index + 1}`, unit: 'عدد', quantity: 1, unitPrice: 100000, gross: 100000, discount: 0, taxable: 100000, tax: 10000, total: 110000 });
const invoice = (id, type, count) => ({ id, invoiceNumber: `UAT-${type}`, customerId: customer.id, customerName: customer.name, customerNationalId: customer.nationalId, customerSnapshot: { name: customer.name, nationalId: customer.nationalId, economicCode: customer.economicCode, registrationNumber: customer.registrationNumber, phone: customer.phone, postalCode: customer.postalCode, address: customer.address }, sellerSnapshot: { businessName: seller.businessName, nationalId: seller.nationalId, economicCode: seller.economicCode, registrationNumber: seller.registrationNumber, phone: seller.phone, postalCode: seller.postalCode, province: seller.province, city: seller.city, address: seller.address, bankAccount: seller.bankAccount, invoiceFooter: seller.invoiceFooter }, currencyUnit: 'rial', issueDate: '۱۴۰۵-۰۶-۱۱', dueDate: '۱۴۰۵-۰۶-۲۰', items: Array.from({ length: count }, (_, index) => line(index)), subtotal: count * 100000, lineDiscount: 0, invoiceDiscountAmount: 0, tax: count * 10000, total: count * 110000, paidAmount: 0, paymentMethod: 'نقدی', notes: 'یادداشت کنترل کیفیت', invoiceType: type, vatMode: type === 'official' ? 'included' : 'excluded', vatRate: type === 'official' ? 10 : 0, taxYear: '۱۴۰۵', taxRuleVersion: 'IR-VAT-1405.1', documentStatus: 'issued', createdAt: new Date().toISOString() });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'fa-IR' });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));

  await page.goto(`${baseUrl}/customers.html?demo=1`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ seller, customer, invoices }) => {
    localStorage.clear();
    localStorage.setItem('finora:demo-user:settings', JSON.stringify([seller]));
    localStorage.setItem('finora:demo-user:customers', JSON.stringify([customer]));
    localStorage.setItem('finora:demo-user:invoices', JSON.stringify(invoices));
  }, { seller, customer, invoices: [invoice('official-uat', 'official', 10), invoice('ordinary-uat', 'ordinary', 10), invoice('short-uat', 'ordinary', 1), invoice('legacy-uat', 'official', 15), invoice('official-overflow', 'official', 11), invoice('ordinary-overflow', 'ordinary', 11), invoice('official-short', 'official', 1)] });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#newCustomer').click();
  assert.equal(await page.locator('#customerDialog').evaluate(dialog => dialog.open), true);
  await page.locator('#closeCustomer').click();

  await page.goto(`${baseUrl}/products.html?demo=1`, { waitUntil: 'domcontentloaded' });
  await page.locator('#newProduct').click();
  assert.equal(await page.locator('#productDialog').evaluate(dialog => dialog.open), true);
  await page.locator('#closeProduct').click();

  await page.goto(`${baseUrl}/invoice-preview.html?id=official-uat&demo=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.invoice-official');
  assert.equal(await page.locator('.official-lines tbody tr').count(), 10);
  assert.equal(await page.locator('[data-paper-size="A4"]').count(), 1);
  const officialParties = await page.locator('.official-parties').innerText();
  assert.doesNotMatch(officialParties, /must-not-print|ایمیل|نوع شخص|شماره شبا/);
  await page.screenshot({ path: path.join(evidenceDir, 'official-a4.png'), fullPage: true });
  await page.pdf({ path: path.join(evidenceDir, 'official-a4.pdf'), printBackground: true, preferCSSPageSize: true });

  await page.goto(`${baseUrl}/invoice-preview.html?id=ordinary-uat&demo=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.invoice-unofficial');
  assert.equal(await page.locator('.unofficial-lines tbody tr').count(), 10);
  assert.equal(await page.locator('[data-paper-size="A5"]').count(), 1);
  assert.doesNotMatch(await page.locator('.unofficial-lines thead').innerText(), /مالیات|عوارض/);
  await page.screenshot({ path: path.join(evidenceDir, 'unofficial-a5.png'), fullPage: true });
  await page.pdf({ path: path.join(evidenceDir, 'unofficial-a5.pdf'), printBackground: true, preferCSSPageSize: true });

  for (const [filename, width, height] of [['official-a4.pdf', 841.89, 595.28], ['unofficial-a5.pdf', 595.28, 419.53]]) {
    const info = execFileSync('pdfinfo', [path.join(evidenceDir, filename)], { encoding: 'utf8' });
    assert.match(info, /Pages:\s+1\b/);
    const dimensions = info.match(/Page size:\s+([\d.]+) x ([\d.]+)/);
    assert.ok(dimensions, info);
    assert.ok(Math.abs(Number(dimensions[1]) - width) < 2, info);
    assert.ok(Math.abs(Number(dimensions[2]) - height) < 2, info);
    execFileSync('pdftoppm', ['-scale-to', '1500', '-singlefile', '-png', path.join(evidenceDir, filename), path.join(evidenceDir, filename.replace('.pdf', '-printed'))]);
  }
  await page.goto(`${baseUrl}/invoice-preview.html?id=short-uat&demo=1`);
  await page.waitForSelector('.invoice-unofficial');
  assert.equal(await page.locator('.unofficial-lines tbody tr').count(), 10);
  assert.equal(await page.locator('.blank-line').count(), 9);
  await page.goto(`${baseUrl}/invoice-preview.html?id=legacy-uat&demo=1`);
  await page.waitForSelector('.invoice-official');
  assert.equal(await page.locator('.official-lines tbody tr').count(), 15);
  assert.equal(await page.locator('#outputButton').isDisabled(), true);

  for (const type of ['official', 'ordinary']) {
    await page.goto(`${baseUrl}/invoice-preview.html?id=${type}-overflow&demo=1`);
    await page.waitForSelector('.invoice-lines tbody tr');
    assert.equal(await page.locator('.invoice-lines tbody tr').count(), 11);
    assert.equal(await page.locator('#outputButton').isDisabled(), true);
  }
  await page.goto(`${baseUrl}/invoice-preview.html?id=official-short&demo=1`);
  await page.waitForSelector('.official-lines tbody tr');
  assert.equal(await page.locator('.official-lines tbody tr').count(), 10);
  assert.equal(await page.locator('.blank-line').count(), 9);
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(JSON.stringify({ ok: true, baseUrl, evidenceDir }));
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
