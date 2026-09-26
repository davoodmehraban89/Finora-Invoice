/**
 * Finora Fixed Assets & Depreciation Engine
 * Governed by Chapters 048, 071, 097, 121, 147, 173.
 * Compliant with Iranian Direct Taxes Act Article 149 (ماده ۱۴۹ قانون مالیات‌های مستقیم):
 * - Straight-Line Depreciation (روش خط مستقیم).
 * - Declining Balance Depreciation (روش مانده نزولی).
 * - Asset Disposal & Gain/Loss Recognition (فروش و اسقاط دارایی ثابت).
 * - Automated Balanced Double-Entry Journal Posting.
 */

class DepreciationEngine {
  constructor({ postingEngine = null }) {
    this.postingEngine = postingEngine;
    this.assets = new Map(); // id -> AssetRecord
    this.depreciationRuns = [];
  }

  /**
   * Register a new capital fixed asset
   */
  registerAsset({
    id,
    tenant_id,
    organization_id,
    asset_code,
    name,
    category, // 'machinery', 'vehicles', 'it_hardware', 'furniture', 'buildings'
    acquisition_date,
    acquisition_cost,
    salvage_value = 0,
    useful_life_years = 5,
    depreciation_method = 'straight_line', // 'straight_line' | 'declining_balance'
    declining_rate = 0.20, // 20%
    location = '',
    custodian = ''
  }) {
    const cost = Number(acquisition_cost);
    const salvage = Number(salvage_value);
    if (cost <= 0) throw new Error('Acquisition cost must be positive.');
    if (salvage < 0 || salvage >= cost) throw new Error('Salvage value must be non-negative and less than acquisition cost.');

    const asset = {
      id,
      tenant_id,
      organization_id,
      asset_code,
      name,
      category,
      acquisition_date,
      acquisition_cost: cost,
      salvage_value: salvage,
      depreciable_base: cost - salvage,
      useful_life_years: Number(useful_life_years),
      depreciation_method,
      declining_rate: Number(declining_rate),
      accumulated_depreciation: 0,
      net_book_value: cost,
      status: 'active', // 'active', 'fully_depreciated', 'disposed'
      location,
      custodian,
      depreciation_history: []
    };

    this.assets.set(id, asset);
    return asset;
  }

  /**
   * Calculate periodic depreciation for a fiscal year or month
   */
  calculatePeriodicDepreciation(assetId, periodMonths = 12) {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error(`Asset '${assetId}' not found.`);
    if (asset.status !== 'active') return 0;

    let depreciationAmount = 0;

    if (asset.depreciation_method === 'straight_line') {
      const annualDepreciation = asset.depreciable_base / asset.useful_life_years;
      depreciationAmount = annualDepreciation * (periodMonths / 12);
    } else if (asset.depreciation_method === 'declining_balance') {
      const annualDepreciation = asset.net_book_value * asset.declining_rate;
      depreciationAmount = annualDepreciation * (periodMonths / 12);
    }

    // Do not depreciate below salvage value
    const maxAllowable = asset.net_book_value - asset.salvage_value;
    if (depreciationAmount > maxAllowable) {
      depreciationAmount = maxAllowable;
    }

    return Math.max(0, Math.round(depreciationAmount));
  }

  /**
   * Execute depreciation run and post balanced Double-Entry journal to General Ledger
   */
  executeDepreciationRun({
    run_id,
    tenant_id,
    organization_id,
    fiscal_year,
    effective_date,
    period_months = 12,
    actor = 'finance_manager'
  }) {
    let totalDepreciation = 0;
    const processedAssets = [];

    for (const asset of this.assets.values()) {
      if (asset.tenant_id === tenant_id && asset.organization_id === organization_id && asset.status === 'active') {
        const depAmt = this.calculatePeriodicDepreciation(asset.id, period_months);
        if (depAmt > 0) {
          asset.accumulated_depreciation += depAmt;
          asset.net_book_value = asset.acquisition_cost - asset.accumulated_depreciation;

          if (asset.net_book_value <= asset.salvage_value + 1) {
            asset.status = 'fully_depreciated';
          }

          const record = {
            run_id,
            fiscal_year,
            amount: depAmt,
            accumulated_after: asset.accumulated_depreciation,
            net_book_value_after: asset.net_book_value,
            date: effective_date,
            timestamp: new Date().toISOString()
          };

          asset.depreciation_history.push(record);
          processedAssets.push({ assetId: asset.id, code: asset.asset_code, amount: depAmt });
          totalDepreciation += depAmt;
        }
      }
    }

    // Post to General Ledger:
    // Debit: Depreciation Expense (5102 - هزینه استهلاک دارایی‌ها)
    // Credit: Accumulated Depreciation (1202 - استهلاک انباشته)
    let journalId = null;
    if (this.postingEngine && totalDepreciation > 0) {
      const postRes = this.postingEngine.postEvent({
        event_id: `EVT-DEP-${run_id}`,
        event_type: 'PAYMENT_DISBURSED',
        tenant_id,
        organization_id,
        occurred_at: new Date().toISOString(),
        effective_date: effective_date || new Date().toISOString().split('T')[0],
        source_module: 'fixed_assets',
        source_entity_id: run_id,
        currency: 'IRR',
        idempotency_key: `IDEMP-DEP-${run_id}`,
        description: `ثبت سند هزینه استهلاک دارایی‌های ثابت دوره مالی ${fiscal_year}`,
        lines: [
          {
            account_code: '5102', // Depreciation Expense (هزینه استهلاک)
            debit: totalDepreciation,
            credit: 0,
            description: `هزینه استهلاک دارایی‌های ثابت - سال مالی ${fiscal_year}`
          },
          {
            account_code: '1202', // Accumulated Depreciation (استهلاک انباشته دارایی‌های ثابت)
            debit: 0,
            credit: totalDepreciation,
            description: `استهلاک انباشته دارایی‌های ثابت تا پایان دوره`
          }
        ]
      }, actor);

      journalId = postRes.journalEntry.journal_id;
    }

    const runSummary = {
      run_id,
      tenant_id,
      organization_id,
      fiscal_year,
      effective_date,
      total_depreciation: totalDepreciation,
      asset_count: processedAssets.length,
      processed_assets: processedAssets,
      journal_id: journalId,
      timestamp: new Date().toISOString()
    };

    this.depreciationRuns.push(runSummary);
    return runSummary;
  }

  /**
   * Retire / Dispose Fixed Asset and calculate Gain or Loss on sale
   */
  disposeAsset({
    asset_id,
    disposal_date,
    sale_proceeds = 0,
    actor = 'finance_manager'
  }) {
    const asset = this.assets.get(asset_id);
    if (!asset) throw new Error(`Asset '${asset_id}' not found.`);
    if (asset.status === 'disposed') throw new Error(`Asset '${asset_id}' is already disposed.`);

    const proceeds = Number(sale_proceeds);
    const bookValue = asset.net_book_value;
    const gainOrLoss = proceeds - bookValue; // positive = gain, negative = loss

    asset.status = 'disposed';
    asset.disposal_date = disposal_date;
    asset.disposal_proceeds = proceeds;
    asset.gain_or_loss = gainOrLoss;

    return {
      asset_id,
      acquisition_cost: asset.acquisition_cost,
      accumulated_depreciation: asset.accumulated_depreciation,
      net_book_value: bookValue,
      sale_proceeds: proceeds,
      gain_or_loss: gainOrLoss,
      result_type: gainOrLoss >= 0 ? 'GAIN_ON_DISPOSAL' : 'LOSS_ON_DISPOSAL'
    };
  }
}

module.exports = { DepreciationEngine };
