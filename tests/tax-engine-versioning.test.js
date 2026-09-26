const { describe, it } = require('node:test');
const assert = require('node:assert');
const { defaultTaxEngine, TaxRuleEngine } = require('../src/tax/tax-rule-engine');
const { IranMoadianAdapter } = require('../src/tax/iran-moadian-adapter');

describe('Versioned Tax Engine & Iranian Moadian Compliance (Chapters 016, 017, 031, 046, 232, 233)', () => {
  it('Resolves 9% VAT for transactions prior to 1403/01/01', () => {
    const historicalCalc = defaultTaxEngine.calculateLineTax({
      item_category: 'general',
      is_taxable: true,
      gross_amount: 10000000,
      discount_amount: 0,
      jurisdiction: 'IR',
      transaction_date: '2023-08-15'
    });

    assert.strictEqual(historicalCalc.rule_version, '1402.1');
    assert.strictEqual(historicalCalc.tax_rate, 0.09);
    assert.strictEqual(historicalCalc.tax_amount, 900000);
    assert.strictEqual(historicalCalc.total_line_amount, 10900000);
    assert.strictEqual(historicalCalc.is_exempt, false);
  });

  it('Resolves 10% VAT for transactions on or after 1403/01/01', () => {
    const currentCalc = defaultTaxEngine.calculateLineTax({
      item_category: 'general',
      is_taxable: true,
      gross_amount: 10000000,
      discount_amount: 1000000, // 1,000,000 discount -> 9,000,000 net
      jurisdiction: 'IR',
      transaction_date: '2026-09-25'
    });

    assert.strictEqual(currentCalc.rule_version, '1403.1');
    assert.strictEqual(currentCalc.tax_rate, 0.10);
    assert.strictEqual(currentCalc.net_taxable_amount, 9000000);
    assert.strictEqual(currentCalc.tax_amount, 900000); // 10% of 9,000,000
    assert.strictEqual(currentCalc.total_line_amount, 9900000);
  });

  it('Enforces tax exemptions dynamically per statutory category', () => {
    const exemptCalc = defaultTaxEngine.calculateLineTax({
      item_category: 'medical',
      is_taxable: true,
      gross_amount: 5000000,
      jurisdiction: 'IR',
      transaction_date: '2026-09-25'
    });

    assert.strictEqual(exemptCalc.is_exempt, true);
    assert.strictEqual(exemptCalc.tax_rate, 0);
    assert.strictEqual(exemptCalc.tax_amount, 0);
    assert.strictEqual(exemptCalc.total_line_amount, 5000000);
  });

  it('Moadian Adapter generates compliant signed payload and validates identifiers', () => {
    const adapter = new IranMoadianAdapter({ fiscalMemoryId: 'MEM-TEHRAN-99' });

    const invoice = {
      id: 'INV-1001',
      invoice_number: 'INV-1405-0001',
      type: 'B2B',
      date: '2026-09-25',
      pattern_type: 1,
      total_gross_amount: 20000000,
      total_discount_amount: 0,
      total_net_amount: 20000000,
      total_tax_amount: 2000000,
      total_final_amount: 22000000,
      payment_method: 'cash',
      items: [
        {
          tax_item_identifier: '2710000123456',
          name: 'Server Rack 42U',
          quantity: 2,
          unit: 'EA',
          unit_price: 10000000,
          gross_amount: 20000000,
          discount_amount: 0,
          net_amount: 20000000,
          tax_rate: 0.10,
          tax_amount: 2000000,
          total_line_amount: 22000000
        }
      ]
    };

    const seller = { national_id: '10101010101', economic_code: '411111111111' };
    const buyer = { type: 'legal', national_id: '14002345678', economic_code: '412222222222' };

    const payload = adapter.generateMoadianPayload(invoice, seller, buyer);
    assert.ok(payload.header);
    assert.ok(payload.body);
    assert.ok(payload.payload_hash);
    assert.ok(payload.signature);
    assert.strictEqual(payload.fiscal_memory_id, 'MEM-TEHRAN-99');
    assert.strictEqual(payload.header.tbill, 22000000);
    assert.strictEqual(payload.body[0].sstid, '2710000123456');
  });

  it('Moadian Adapter rejects invalid invoices lacking commodity identifier', () => {
    const adapter = new IranMoadianAdapter({ fiscalMemoryId: 'MEM-TEST' });
    const invalidInvoice = {
      id: 'INV-BAD',
      invoice_number: 'INV-BAD',
      items: [{ name: 'Bad item', quantity: 1, unit_price: 1000 }] // Missing tax_item_identifier
    };
    const seller = { national_id: '101' };
    const buyer = { national_id: '102' };

    assert.throws(
      () => adapter.generateMoadianPayload(invalidInvoice, seller, buyer),
      /Missing Moadian commodity\/service identifier/
    );
  });
});
