const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { IdpPipeline } = require('../src/documents/idp-ocr-pipeline');

describe('Intelligent Document Processing (IDP) & Persian OCR Pipeline (Chapters 047, 074, 101, 126, 151, 178)', () => {
  let pipeline;

  beforeEach(() => {
    pipeline = new IdpPipeline({});
  });

  it('Normalizes Arabic/Persian characters and converts Persian numerals', () => {
    const raw = 'شركت كالاهاي ديجيتال شماره فاکتور: ۱۲۳۴۵۶ تاریخ: ۱۴۰۵/۰۲/۱۵';
    const norm = IdpPipeline.normalizePersianText(raw);

    assert.ok(norm.includes('شرکت'));
    assert.ok(norm.includes('کالاهای'));
    assert.ok(norm.includes('123456'));
    assert.ok(norm.includes('1405/02/15'));
  });

  it('Parses raw OCR invoice text into structured financial entities and passes validation', () => {
    const ocrText = `
صورتحساب فروش کالا و خدمات
فروشنده: صنایع الکترونیک شیراز
شناسه ملی: ۱۰۱۰۳۸۲۹۱۰۰
کد اقتصادی: ۴۱۱۳۸۲۹۱۰۰۰۱
شماره فاکتور: INV-1405-9988
تاریخ: ۱۴۰۵/۰۲/۲۰

شرح کالا | تعداد | قیمت واحد | مبلغ کل
سرور اختصاصی ۴۲ یونیت | ۲ | ۱۰۰,۰۰۰,۰۰۰ | ۲۰۰,۰۰۰,۰۰۰

جمع خالص: ۲۰۰,۰۰۰,۰۰۰
مالیات ارزش افزوده: ۲۰,۰۰۰,۰۰۰
مبلغ کل نهایی: ۲۲۰,۰۰۰,۰۰۰ ریال
    `;

    const doc = pipeline.processDocument({
      id: 'doc_ocr_01',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      file_name: 'invoice_shiraz_scan.pdf',
      raw_text: ocrText
    });

    assert.strictEqual(doc.extracted_data.invoice_number, 'INV-1405-9988');
    assert.strictEqual(doc.extracted_data.seller.name, 'صنایع الکترونیک شیراز');
    assert.strictEqual(doc.extracted_data.seller.national_id, '10103829100');
    assert.strictEqual(doc.extracted_data.seller.economic_code, '411382910001');
    assert.strictEqual(doc.extracted_data.financials.subtotal, 200000000);
    assert.strictEqual(doc.extracted_data.financials.tax, 20000000);
    assert.strictEqual(doc.extracted_data.financials.total, 220000000);
    assert.strictEqual(doc.extracted_data.lines.length, 1);
    assert.strictEqual(doc.extracted_data.lines[0].quantity, 2);

    assert.strictEqual(doc.validation.is_math_valid, true);
    assert.strictEqual(doc.validation.requires_human_review, false);
    assert.strictEqual(doc.validation.status, 'VERIFIED');
    assert.ok(doc.validation.confidence_score >= 0.85);
  });

  it('Detects mathematical discrepancy in OCR and routes to Human-in-the-Loop review', () => {
    const corruptedOcrText = `
فروشنده: شرکت بتن آرا
شماره فاکتور: INV-ERR-01
جمع خالص: ۱۰۰,۰۰۰,۰۰۰
مالیات: ۱۰,۰۰۰,۰۰۰
مبلغ کل: ۱۴۰,۰۰۰,۰۰۰
    `;

    const doc = pipeline.processDocument({
      id: 'doc_corrupt_01',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      file_name: 'corrupted_scan.png',
      raw_text: corruptedOcrText
    });

    assert.strictEqual(doc.validation.is_math_valid, false);
    assert.strictEqual(doc.validation.status, 'PENDING_REVIEW');
    assert.strictEqual(doc.validation.requires_human_review, true);
    assert.ok(doc.validation.anomaly_reason.includes('Mathematical discrepancy'));
  });

  it('Allows Human-in-the-Loop review and correction of flagged document', () => {
    const flawedText = `
فروشنده: بازرگانی پارس
جمع کل: ۵۰,۰۰۰,۰۰۰
    `;

    const doc = pipeline.processDocument({
      id: 'doc_flawed_01',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      file_name: 'incomplete_receipt.jpg',
      raw_text: flawedText
    });

    assert.strictEqual(doc.validation.status, 'PENDING_REVIEW');

    // Reviewer manually corrects invoice number and tax
    const approved = pipeline.reviewAndApprove(doc.id, {
      invoice_number: 'MANUAL-INV-500',
      total: 50000000,
      subtotal: 45454545,
      tax: 4545455
    }, 'حسابرس داوود مهربان');

    assert.strictEqual(approved.extracted_data.invoice_number, 'MANUAL-INV-500');
    assert.strictEqual(approved.validation.status, 'VERIFIED');
    assert.strictEqual(approved.validation.requires_human_review, false);
    assert.strictEqual(approved.reviewed_by, 'حسابرس داوود مهربان');
  });
});
