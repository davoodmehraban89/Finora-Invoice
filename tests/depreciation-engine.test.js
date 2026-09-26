const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { GeneralLedger } = require('../src/ledger/general-ledger');
const { PostingEngine } = require('../src/ledger/posting-engine');
const { DepreciationEngine } = require('../src/assets/depreciation-engine');

describe('Fixed Assets & Depreciation Engine (Chapters 048, 071, 097, 121, 147, 173 - Article 149 Tax Code)', () => {
  let ledger;
  let postingEngine;
  let assetEngine;

  beforeEach(() => {
    ledger = new GeneralLedger();
    ledger.registerAccount({ code: '1101', name: 'Cash & Bank', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '1201', name: 'Fixed Assets Historical Cost', category: 'asset', nature: 'debit' });
    ledger.registerAccount({ code: '1202', name: 'Accumulated Depreciation', category: 'asset', nature: 'credit' });
    ledger.registerAccount({ code: '5102', name: 'Depreciation Expense', category: 'expense', nature: 'debit' });

    postingEngine = new PostingEngine(ledger);
    assetEngine = new DepreciationEngine({ postingEngine });
  });

  it('Calculates straight-line depreciation accurately per fiscal year', () => {
    // Machine purchased for 600,000,000 IRR, salvage 0, 5 years useful life
    const asset = assetEngine.registerAsset({
      id: 'ast_machinery_01',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      asset_code: 'AST-MCH-001',
      name: 'دستگاه بچینگ و تولید بتن آماده',
      category: 'machinery',
      acquisition_date: '1405/01/01',
      acquisition_cost: 600000000,
      salvage_value: 0,
      useful_life_years: 5,
      depreciation_method: 'straight_line'
    });

    const annualDep = assetEngine.calculatePeriodicDepreciation(asset.id, 12);
    assert.strictEqual(annualDep, 120000000); // 600M / 5

    const monthlyDep = assetEngine.calculatePeriodicDepreciation(asset.id, 1);
    assert.strictEqual(monthlyDep, 10000000); // 120M / 12
  });

  it('Calculates declining balance depreciation per Article 149 Iranian Tax Law', () => {
    // Vehicle purchased for 200,000,000 IRR, declining rate 25% (ماده ۱۴۹ جدول استهلاکات)
    const asset = assetEngine.registerAsset({
      id: 'ast_vehicle_01',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      asset_code: 'AST-VEH-001',
      name: 'خودرو وانت نیسان باربری',
      category: 'vehicles',
      acquisition_date: '1405/01/01',
      acquisition_cost: 200000000,
      salvage_value: 10000000,
      depreciation_method: 'declining_balance',
      declining_rate: 0.25
    });

    // Year 1: 200M * 0.25 = 50M
    const y1 = assetEngine.calculatePeriodicDepreciation(asset.id, 12);
    assert.strictEqual(y1, 50000000);
  });

  it('Executes annual depreciation run and posts balanced Double-Entry journal to General Ledger', () => {
    assetEngine.registerAsset({
      id: 'ast_server_01',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      asset_code: 'AST-SRV-01',
      name: 'سرور اختصاصی دیتاسنتر',
      category: 'it_hardware',
      acquisition_date: '1405/01/01',
      acquisition_cost: 300000000,
      salvage_value: 0,
      useful_life_years: 3,
      depreciation_method: 'straight_line'
    });

    const runRes = assetEngine.executeDepreciationRun({
      run_id: 'DEP-RUN-1405',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      fiscal_year: '1405',
      effective_date: '1405/12/29'
    });

    assert.strictEqual(runRes.total_depreciation, 100000000); // 300M / 3
    assert.strictEqual(runRes.asset_count, 1);
    assert.ok(runRes.journal_id);

    // Verify GL Account Balances
    const expAcc = ledger.getAccount('5102');
    const accDepAcc = ledger.getAccount('1202');

    assert.strictEqual(expAcc.netBalance, 100000000);
    assert.strictEqual(accDepAcc.netBalance, 100000000);

    // Verify Trial Balance
    const tb = ledger.getTrialBalance();
    assert.strictEqual(tb.isBalanced, true);
  });

  it('Calculates net book value and handles capital asset disposal (Gain/Loss on sale)', () => {
    const asset = assetEngine.registerAsset({
      id: 'ast_laptop_01',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      asset_code: 'AST-LAP-01',
      name: 'لپ‌تاپ مهندسی',
      category: 'it_hardware',
      acquisition_date: '1403/01/01',
      acquisition_cost: 80000000,
      salvage_value: 5000000,
      useful_life_years: 4,
      depreciation_method: 'straight_line'
    });

    // Run 2 years of depreciation
    assetEngine.executeDepreciationRun({
      run_id: 'DEP-Y1',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      fiscal_year: '1403',
      period_months: 12
    });
    assetEngine.executeDepreciationRun({
      run_id: 'DEP-Y2',
      tenant_id: 'ten_main',
      organization_id: 'org_main',
      fiscal_year: '1404',
      period_months: 12
    });

    // Depreciable base = 75M. Annual = 18,750,000. 2 years = 37,500,000.
    // Net book value = 80M - 37.5M = 42,500,000.
    assert.strictEqual(asset.accumulated_depreciation, 37500000);
    assert.strictEqual(asset.net_book_value, 42500000);

    // Dispose by selling for 50,000,000 IRR -> Gain = 7,500,000
    const disposalGain = assetEngine.disposeAsset({
      asset_id: asset.id,
      disposal_date: '1405/02/10',
      sale_proceeds: 50000000
    });

    assert.strictEqual(disposalGain.result_type, 'GAIN_ON_DISPOSAL');
    assert.strictEqual(disposalGain.gain_or_loss, 7500000);
    assert.strictEqual(asset.status, 'disposed');
  });
});
