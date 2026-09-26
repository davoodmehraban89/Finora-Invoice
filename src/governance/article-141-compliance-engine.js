/**
 * Finora Corporate Trade Law & Article 141 Solvency Intelligence Engine
 * Governed by Chapters 141, 167, 193, 219, 245 of the Finora Master Specification.
 *
 * Implements:
 * - Trade Law Compliance: Detection of Article 141 Trigger (Accumulated Loss >= 50% of Registered Capital)
 * - Versioned Statutory Capital Rules (Articles 5 & 141 of Iranian Commercial Code)
 * - Entity-Type Aware Minimum Capital Floors:
 *     * Public Joint Stock (سهامی عام): 5,000,000 IRR minimum capital (Article 5)
 *     * Private Joint Stock (سهامی خاص): 1,000,000 IRR minimum capital (Article 5)
 *     * Limited Liability (با مسئولیت محدود): 1,000,000 IRR minimum capital
 * - Severity Tiers: HEALTHY, WATCHLIST, ARTICLE_141_TRIGGERED, NEGATIVE_EQUITY_INSOLVENCY
 * - Statutory Board Obligations & 60-Day Extraordinary General Assembly (EGA) Countdown
 * - Quantitative Remediation Simulator with Strict Minimum Capital Floor Validation
 * - Official EGA Assembly Resolution & Gazette Notice Generator in Persian
 */

const { MoneyPrecision } = require('../common/money-precision');

class Article141ComplianceEngine {
  constructor({ generalLedger = null } = {}) {
    this.generalLedger = generalLedger;
    this.complianceRecords = new Map(); // tenant_id -> ComplianceRecord

    // Versioned Statutory Rules (قانون تجارت و مصوبات هیئت وزیران)
    this.statutoryRules = {
      version: '1405.1',
      effective_date: '1400/01/01',
      minimum_capital: {
        PUBLIC_JOINT_STOCK: 5000000,   // سهامی عام: حداقل ۵ میلیون ریال (ماده ۵)
        PRIVATE_JOINT_STOCK: 1000000,  // سهامی خاص: حداقل ۱ میلیون ریال (ماده ۵)
        LIMITED_LIABILITY: 1000000     // با مسئولیت محدود: حداقل ۱ میلیون ریال
      },
      assembly_notice_window_days: 60, // مهلت قانونی دعوت مجمع فوق‌العاده
      restructuring_grace_period_months: 12 // مهلت یکساله خروج از شمول یا تبدیل شرکت
    };
  }

  _getNetBalance(code) {
    if (!this.generalLedger) return 0;
    const acc = this.generalLedger.getAccount(code);
    if (!acc) return 0;
    if (acc.nature === 'debit') {
      return acc.debitBalance - acc.creditBalance;
    } else {
      return acc.creditBalance - acc.debitBalance;
    }
  }

  /**
   * Retrieves minimum legal capital floor for a given company type.
   */
  getMinimumStatutoryCapital(companyType = 'PRIVATE_JOINT_STOCK') {
    const typeKey = String(companyType).toUpperCase();
    return this.statutoryRules.minimum_capital[typeKey] || this.statutoryRules.minimum_capital.PRIVATE_JOINT_STOCK;
  }

  /**
   * Evaluates solvency and Article 141 trigger status.
   */
  evaluateSolvencyStatus({
    tenant_id = 'default_tenant',
    organization_id = 'default_org',
    company_type = 'PRIVATE_JOINT_STOCK',
    registered_capital_override = null,
    accumulated_loss_override = null,
    legal_reserve_override = null
  } = {}) {
    // 3101: Share Capital
    const registeredCapital = registered_capital_override !== null
      ? MoneyPrecision.toRials(registered_capital_override, false)
      : Math.max(0, this._getNetBalance('3101'));

    // 3201: Retained Earnings / Accumulated Loss
    let accumulatedLoss = 0;
    let retainedEarnings = 0;

    if (accumulated_loss_override !== null) {
      accumulatedLoss = MoneyPrecision.toRials(accumulated_loss_override, false);
    } else if (this.generalLedger) {
      const acc = this.generalLedger.getAccount('3201');
      if (acc) {
        if (acc.debitBalance > acc.creditBalance) {
          accumulatedLoss = acc.debitBalance - acc.creditBalance;
        } else {
          retainedEarnings = acc.creditBalance - acc.debitBalance;
        }
      }
    }

    // 3202: Legal Reserve
    const legalReserve = legal_reserve_override !== null
      ? MoneyPrecision.toRials(legal_reserve_override, false)
      : Math.max(0, this._getNetBalance('3202'));

    const minLegalCapital = this.getMinimumStatutoryCapital(company_type);
    const netEquity = registeredCapital + legalReserve + retainedEarnings - accumulatedLoss;

    const lossToCapitalRatio = registeredCapital > 0
      ? Number((accumulatedLoss / registeredCapital).toFixed(4))
      : 0.0;

    const isSubjectToArticle141 = lossToCapitalRatio >= 0.50;

    let severityTier = 'HEALTHY';
    let severityTierFa = 'پایدار و عادی';

    if (netEquity < 0 || lossToCapitalRatio >= 1.0) {
      severityTier = 'NEGATIVE_EQUITY_INSOLVENCY';
      severityTierFa = 'بحران ورشکستگی و حقوق صاحبان سهام منفی';
    } else if (isSubjectToArticle141) {
      severityTier = 'ARTICLE_141_TRIGGERED';
      severityTierFa = 'مشمول قطعی ماده ۱۴۱ لایحه اصلاحی قانون تجارت';
    } else if (lossToCapitalRatio >= 0.35) {
      severityTier = 'WATCHLIST';
      severityTierFa = 'هشدار زودهنگام: در آستانه شمول ماده ۱۴۱';
    }

    const mandatoryActions = [];
    if (isSubjectToArticle141) {
      mandatoryActions.push({
        code: 'ACTION_CONVENE_EGA',
        title: 'دعوت فوری مجمع عمومی فوق‌العاده',
        legal_basis: 'ماده ۱۴۱ لایحه قانونی اصلاح قسمتی از قانون تجارت',
        description: 'هیئت مدیره مکلف است بلافاصله مجمع عمومی فوق‌العاده صاحبان سهام را جهت تصمیم‌گیری در خصوص بقا یا انحلال شرکت دعوت نماید.',
        deadline_days: 60
      });
      mandatoryActions.push({
        code: 'ACTION_CAPITAL_RESTRUCTURING',
        title: 'اصلاح ساختار مالی یا خروج از شمول',
        legal_basis: 'ماده ۱۴۱ و ماده ۵ و ۶ قانون تجارت',
        description: 'در صورت عدم رای به انحلال، هیئت مدیره موظف است نسبت به افزایش سرمایه نقدی، تجدید ارزیابی یا کاهش اجباری سرمایه (مشروط به رعایت حداقل سرمایه ماده ۵) اقدام کند.',
        deadline_days: 60
      });
    }

    const minCapitalIncreaseRequired = isSubjectToArticle141
      ? Math.max(0, (accumulatedLoss * 2) - registeredCapital)
      : 0;

    // Max legal capital reduction respecting minimum statutory capital (Article 5)
    const theoreticalReduction = isSubjectToArticle141
      ? Math.min(accumulatedLoss, registeredCapital - (accumulatedLoss * 2))
      : 0;
    const maxLegalCapitalReduction = Math.max(0, Math.min(theoreticalReduction, registeredCapital - minLegalCapital));

    const record = {
      tenant_id,
      organization_id,
      company_type,
      evaluated_at: new Date().toISOString(),
      statutory_version: this.statutoryRules.version,
      financial_figures: {
        registered_capital: registeredCapital,
        accumulated_loss: accumulatedLoss,
        retained_earnings: retainedEarnings,
        legal_reserve: legalReserve,
        net_equity: netEquity,
        min_statutory_capital: minLegalCapital
      },
      impairment_metrics: {
        loss_to_capital_ratio: lossToCapitalRatio,
        loss_percentage: Number((lossToCapitalRatio * 100).toFixed(2)),
        is_subject_to_article_141: isSubjectToArticle141,
        severity_tier: severityTier,
        severity_tier_fa: severityTierFa
      },
      compliance_enforcement: {
        statutory_assembly_deadline_days: isSubjectToArticle141 ? 60 : 0,
        mandatory_actions: mandatoryActions,
        remediation_thresholds: {
          min_capital_increase_to_exit: minCapitalIncreaseRequired,
          max_legal_capital_reduction: maxLegalCapitalReduction,
          suggested_capital_reduction: Math.min(accumulatedLoss, registeredCapital - minLegalCapital)
        }
      }
    };

    this.complianceRecords.set(tenant_id, record);
    return record;
  }

  /**
   * DEFECT 11: Simulates corporate restructuring with Article 5 minimum capital validation.
   */
  simulateRemediation({
    current_capital,
    current_loss,
    company_type = 'PRIVATE_JOINT_STOCK',
    method, // 'CASH_CAPITAL_INCREASE' | 'CAPITAL_REDUCTION' | 'ASSET_REVALUATION'
    injection_amount = 0,
    revaluation_surplus = 0
  }) {
    const capital = MoneyPrecision.toRials(current_capital, false);
    const loss = MoneyPrecision.toRials(current_loss, false);
    const minLegalCapital = this.getMinimumStatutoryCapital(company_type);

    let proFormaCapital = capital;
    let proFormaLoss = loss;
    let proFormaSurplus = 0;
    let legalFloorViolation = false;
    let warningMessage = null;

    if (method === 'CASH_CAPITAL_INCREASE') {
      proFormaCapital += MoneyPrecision.toRials(injection_amount, false);
    } else if (method === 'CAPITAL_REDUCTION') {
      const requestedReduction = MoneyPrecision.toRials(injection_amount, false);
      const targetCapital = capital - requestedReduction;

      // DEFECT 11: Check against Article 5 statutory floor
      if (targetCapital < minLegalCapital) {
        legalFloorViolation = true;
        warningMessage = `ممنوعیت قانونی ماده ۵ و ۱۴۱: سرمایه شرکت پس از کاهش اجباری نمی‌تواند کمتر از حداقل سرمایه قانونی مقرر (${minLegalCapital.toLocaleString('fa-IR')} ریال برای ${company_type === 'PUBLIC_JOINT_STOCK' ? 'سهامی عام' : 'سهامی خاص'}) باشد.`;
        // Bound to minimum statutory floor
        const cappedReduction = Math.max(0, capital - minLegalCapital);
        proFormaCapital = minLegalCapital;
        proFormaLoss = Math.max(0, loss - cappedReduction);
      } else {
        const reduction = Math.min(loss, requestedReduction);
        proFormaCapital = proFormaCapital - reduction;
        proFormaLoss = Math.max(0, proFormaLoss - reduction);
      }
    } else if (method === 'ASSET_REVALUATION') {
      proFormaSurplus = MoneyPrecision.toRials(revaluation_surplus, false);
      proFormaCapital += proFormaSurplus;
    }

    const newRatio = proFormaCapital > 0 ? Number((proFormaLoss / proFormaCapital).toFixed(4)) : 1.0;
    const successfullyExited = newRatio < 0.50 && !legalFloorViolation;

    return {
      method,
      company_type,
      min_legal_capital: minLegalCapital,
      pro_forma_capital: proFormaCapital,
      pro_forma_loss: proFormaLoss,
      revaluation_surplus: proFormaSurplus,
      new_loss_to_capital_ratio: newRatio,
      new_loss_percentage: Number((newRatio * 100).toFixed(2)),
      exited_article_141: successfullyExited,
      legal_floor_violation: legalFloorViolation,
      warning_message: warningMessage,
      status_fa: successfullyExited
        ? 'موفق: خروج کامل از شمول ماده ۱۴۱ با رعایت حداقل سرمایه قانونی'
        : (legalFloorViolation ? 'ناموفق: نقض حداقل سرمایه قانونی ماده ۵ قانون تجارت' : 'ناموفق: میزان تعدیل برای خروج از شمول کافی نیست')
    };
  }

  generateExtraordinaryAssemblyNotice({
    company_name,
    national_id,
    assembly_date,
    assembly_time = '10:00',
    location,
    current_capital,
    current_loss
  }) {
    const capFormatted = Number(current_capital).toLocaleString('fa-IR');
    const lossFormatted = Number(current_loss).toLocaleString('fa-IR');

    return {
      notice_title: `آگهی دعوت به مجمع عمومی فوق‌العاده شرکت ${company_name} (مشمول ماده ۱۴۱ قانون تجارت)`,
      notice_body: `بدینوسیله از کلیه سهامداران محترم شرکت ${company_name} (شناسه ملی: ${national_id}) دعوت به عمل می‌آید تا در جلسه مجمع عمومی فوق‌العاده که در تاریخ ${assembly_date} ساعت ${assembly_time} در محل قانونی شرکت واقع در ${location} تشکیل می‌گردد، حضور به هم رسانند.\n\nدستور جلسه:\n۱. استماع گزارش هیئت مدیره و بازرس قانونی در خصوص شمول ماده ۱۴۱ لایحه اصلاحی قانون تجارت.\n۲. تصمیم‌گیری در خصوص بقا یا انحلال شرکت طبق مفاد ماده ۱۴۱ قانون تجارت.\n۳. در صورت تداوم فعالیت، تصمیم‌گیری پیرامون اصلاح ساختار مالی از طریق افزایش سرمایه نقدی، مازاد تجدید ارزیابی دارایی‌ها یا کاهش اجباری سرمایه با رعایت حداقل سرمایه مقرر در ماده ۵ قانون تجارت.\n۴. سایر مواردی که در صلاحیت مجمع عمومی فوق‌العاده می‌باشد.\n\nسرمایه ثبت‌شده فعلی: ${capFormatted} ریال\nزیان انباشته دفتری: ${lossFormatted} ریال\n\nهیئت مدیره شرکت ${company_name}`,
      issued_at: new Date().toISOString()
    };
  }
}

module.exports = { Article141ComplianceEngine };
