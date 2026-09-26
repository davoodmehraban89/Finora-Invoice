/**
 * Finora Intelligent Document Processing (IDP) & Persian OCR Extraction Engine
 * Governed by Chapters 047, 074, 101, 126, 151, 178.
 * 
 * Features:
 * 1. Multi-format ingestion (PDF, Scanned Image OCR, Excel/CSV).
 * 2. Persian Text & Digit Normalization (ی/ک standard, Persian digits to integer).
 * 3. Financial Entity Extraction (Seller, Buyer, Invoice No, Date, Line Items, Taxes).
 * 4. Mathematical Invariant Verification (Subtotal + VAT === Total).
 * 5. Confidence Scoring & Human-in-the-Loop (HITL) Escalation.
 */

const crypto = require('crypto');

class IdpPipeline {
  constructor({ documentStore = null, procurementEngine = null }) {
    this.documentStore = documentStore;
    this.procurementEngine = procurementEngine;
    this.processedDocuments = new Map(); // id -> ProcessedDoc
  }

  /**
   * Normalizes Persian characters and converts Persian/Arabic numerals to standard digits
   */
  static normalizePersianText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/[\u064B-\u065F\u0670]/g, '') // remove diacritics
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/ة/g, 'ه')
      .replace(/[۰٠]/g, '0')
      .replace(/[۱١]/g, '1')
      .replace(/[۲٢]/g, '2')
      .replace(/[۳٣]/g, '3')
      .replace(/[۴٤]/g, '4')
      .replace(/[۵٥]/g, '5')
      .replace(/[۶٦]/g, '6')
      .replace(/[۷٧]/g, '7')
      .replace(/[۸٨]/g, '8')
      .replace(/[۹٩]/g, '9')
      .trim();
  }

  /**
   * Extracts clean numeric amounts from Persian/formatted strings
   */
  static extractNumber(str) {
    if (!str) return 0;
    const clean = IdpPipeline.normalizePersianText(str).replace(/[^\d.-]/g, '');
    return Number(clean) || 0;
  }

  /**
   * Process raw document text from OCR / PDF parser into structured fiscal entities
   */
  processDocument({
    id,
    tenant_id,
    organization_id,
    document_type = 'supplier_invoice', // supplier_invoice, bank_receipt, contract
    file_name,
    raw_text,
    source_channel = 'pdf_upload'
  }) {
    if (!raw_text || typeof raw_text !== 'string') {
      throw new Error('raw_text is required for IDP extraction.');
    }

    const normalized = IdpPipeline.normalizePersianText(raw_text);
    const checksum = crypto.createHash('sha256').update(raw_text).digest('hex');

    // 1. Regex Extraction Heuristics for Iranian Invoices
    const invoiceNoMatch = normalized.match(/(?:شماره\s*فاکتور|شماره\s*صورتحساب|شماره\s*سریال|فاکتور\s*شماره)\s*[:#\-]?\s*([A-Za-z0-9\-_]+)/i);
    const invoiceNumber = invoiceNoMatch ? invoiceNoMatch[1] : `AUTO-${Date.now().toString().slice(-6)}`;

    const dateMatch = normalized.match(/(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/);
    const documentDate = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

    const sellerMatch = normalized.match(/(?:فروشنده|نام\s*فروشنده|شرکت)\s*[:\-]?\s*([^\n\r,]+)/);
    const sellerName = sellerMatch ? sellerMatch[1].trim() : 'تأمین‌کننده ناشناس';

    const nationalIdMatch = normalized.match(/(?:شناسه\s*ملی|کد\s*ملی)\s*[:\-]?\s*(\d{10,11})/);
    const nationalId = nationalIdMatch ? nationalIdMatch[1] : null;

    const economicCodeMatch = normalized.match(/(?:کد\s*اقتصادی|شماره\s*اقتصادی)\s*[:\-]?\s*(\d{12,14})/);
    const economicCode = economicCodeMatch ? economicCodeMatch[1] : null;

    const totalMatch = normalized.match(/(?:مبلغ\s*کل(?:\s*نهایی)?|جمع\s*کل|مبلغ\s*قابل\s*پرداخت|مبلغ\s*نهایی)\s*[:\-]?\s*([\d,]+)/);
    const totalAmount = totalMatch ? IdpPipeline.extractNumber(totalMatch[1]) : 0;

    const vatMatch = normalized.match(/(?:مالیات|ارزش\s*افزوده|عوارض)\s*[:\-]?\s*([\d,]+)/);
    const taxAmount = vatMatch ? IdpPipeline.extractNumber(vatMatch[1]) : 0;

    const subtotalMatch = normalized.match(/(?:جمع\s*خالص|مبلغ\s*پایه|جمع\s*قبل\s*از\s*مالیات)\s*[:\-]?\s*([\d,]+)/);
    let subtotalAmount = subtotalMatch ? IdpPipeline.extractNumber(subtotalMatch[1]) : (totalAmount - taxAmount);

    if (subtotalAmount <= 0 && totalAmount > 0) {
      subtotalAmount = totalAmount - taxAmount;
    }

    // 2. Line Items Extraction Heuristics
    // Looking for lines with name, quantity, unit price, total price
    const lines = [];
    const rawLines = normalized.split(/\r?\n/);
    for (const rLine of rawLines) {
      const lineTokens = rLine.split(/[\t,|]/).map(t => t.trim()).filter(Boolean);
      if (lineTokens.length >= 4) {
        const itemDesc = lineTokens[0];
        const qty = IdpPipeline.extractNumber(lineTokens[1]);
        const unitPrice = IdpPipeline.extractNumber(lineTokens[2]);
        const lineTotal = IdpPipeline.extractNumber(lineTokens[3]);

        if (qty > 0 && unitPrice > 0) {
          lines.push({
            description: itemDesc,
            quantity: qty,
            unit_price: unitPrice,
            line_total: lineTotal || (qty * unitPrice)
          });
        }
      }
    }

    // 3. Mathematical Consistency & Anomaly Check
    let mathValid = true;
    let anomalyReason = null;

    const expectedTotal = subtotalAmount + taxAmount;
    if (totalAmount > 0 && Math.abs(expectedTotal - totalAmount) > 100) {
      mathValid = false;
      anomalyReason = `Mathematical discrepancy: Subtotal (${subtotalAmount}) + Tax (${taxAmount}) != Total (${totalAmount})`;
    }

    // 4. Calculate Extraction Confidence Score
    let confidenceScore = 1.0;
    if (!invoiceNoMatch) confidenceScore -= 0.15;
    if (!nationalId) confidenceScore -= 0.15;
    if (!economicCode) confidenceScore -= 0.10;
    if (!mathValid) confidenceScore -= 0.30;
    if (lines.length === 0) confidenceScore -= 0.15;

    confidenceScore = Number(Math.max(0.1, confidenceScore).toFixed(2));
    const requiresReview = confidenceScore < 0.85 || !mathValid;

    const processedDoc = {
      id,
      tenant_id,
      organization_id,
      document_type,
      file_name,
      checksum,
      source_channel,
      extracted_data: {
        invoice_number: invoiceNumber,
        document_date: documentDate,
        seller: {
          name: sellerName,
          national_id: nationalId,
          economic_code: economicCode
        },
        financials: {
          subtotal: subtotalAmount,
          tax: taxAmount,
          total: totalAmount,
          currency: 'IRR'
        },
        lines
      },
      validation: {
        is_math_valid: mathValid,
        anomaly_reason: anomalyReason,
        confidence_score: confidenceScore,
        requires_human_review: requiresReview,
        status: requiresReview ? 'PENDING_REVIEW' : 'VERIFIED'
      },
      created_at: new Date().toISOString()
    };

    this.processedDocuments.set(id, processedDoc);
    return processedDoc;
  }

  /**
   * Human-in-the-loop manual review approval or correction
   */
  reviewAndApprove(docId, correctedData = {}, reviewer = 'auditor') {
    const doc = this.processedDocuments.get(docId);
    if (!doc) throw new Error(`Document '${docId}' not found.`);

    if (correctedData.invoice_number) doc.extracted_data.invoice_number = correctedData.invoice_number;
    if (correctedData.total) doc.extracted_data.financials.total = Number(correctedData.total);
    if (correctedData.tax) doc.extracted_data.financials.tax = Number(correctedData.tax);
    if (correctedData.subtotal) doc.extracted_data.financials.subtotal = Number(correctedData.subtotal);

    doc.validation.status = 'VERIFIED';
    doc.validation.requires_human_review = false;
    doc.reviewed_by = reviewer;
    doc.reviewed_at = new Date().toISOString();

    return doc;
  }
}

module.exports = { IdpPipeline };
