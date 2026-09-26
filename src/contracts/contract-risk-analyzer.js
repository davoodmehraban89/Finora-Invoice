/**
 * Finora Contract Risk Analyzer & Intelligence Engine
 * Governed strictly by Chapters 019, 034, 052, 072, 099, 116, 177.
 */

class ContractRiskAnalyzer {
  static evaluateRisk(contract, clauses = []) {
    let score = 0;
    const findings = [];

    // 1. Financial Exposure Risk
    const amount = Number(contract.contract_amount) || 0;
    if (amount > 10000000000) { // > 10 Billion Rials
      score += 15;
      findings.push({
        id: 'FR-01',
        title: 'ریسک حجم مالی بالا (High Financial Exposure)',
        severity: 'medium',
        description: 'مبلغ قرارداد بیش از ۱۰ میلیارد ریال است و نیازمند وثایق حسن انجام کار و نظارت مستقیم مالی است.',
        recommendation: 'دریافت ضمانت‌نامه بانکی حسن انجام تعهدات معادل حداقل ۵ درصد مبلغ کل.'
      });
    }

    // 2. Duration & Inflation Adjustment Risk
    if (contract.start_date && contract.end_date) {
      const start = new Date(contract.start_date);
      const end = new Date(contract.end_date);
      const durationMonths = (end - start) / (1000 * 60 * 60 * 24 * 30.4);

      if (durationMonths > 12) {
        const hasPriceAdjustmentClause = clauses.some(c => 
          c.type === 'price_adjustment' || (c.text && c.text.includes('تعدیل'))
        );
        if (!hasPriceAdjustmentClause) {
          score += 25;
          findings.push({
            id: 'FR-02',
            title: 'فقدان بند تعدیل نرخ در قرارداد بلندمدت (Missing Price Adjustment Clause)',
            severity: 'high',
            description: 'مدت قرارداد بیش از یک سال است اما بند تعدیل نرخ متناسب با تورم در آن پیش‌بینی نشده است.',
            recommendation: 'افزودن بند شاخص تعدیل رسمی سازمان برنامه و بودجه جهت پوشش نوسانات نرخ ارز و تورم.'
          });
        }
      }
    }

    // 3. Clause-Specific Risk Checks
    let hasDisputeResolution = false;
    let hasUnlimitedLiability = false;
    let hasExcessiveDelayPenalty = false;

    for (const c of clauses) {
      const txt = c.text || '';
      
      // Unlimited liability check
      if (c.type === 'liability' || txt.includes('مسئولیت نامحدود') || txt.includes('جبران کلیه خسارات بدون سقف')) {
        hasUnlimitedLiability = true;
      }

      // Excessive liquidated damages check (> 0.5% per day or > 20% cap)
      if (c.type === 'penalty' && (txt.includes('روزانه ۱ درصد') || txt.includes('بیش از ۲۰ درصد') || txt.includes('بدون سقف خسارت'))) {
        hasExcessiveDelayPenalty = true;
      }

      // Dispute resolution / governing law check
      if (c.type === 'dispute_resolution' || txt.includes('داوری') || txt.includes('حل اختلاف') || txt.includes('قوانین جمهوری اسلامی ایران')) {
        hasDisputeResolution = true;
      }
    }

    if (hasUnlimitedLiability) {
      score += 30;
      findings.push({
        id: 'LEG-01',
        title: 'بند مسئولیت مدنی نامحدود (Unlimited Liability Clause)',
        severity: 'critical',
        description: 'بند عدم سقف‌گذاری برای خسارات و مسئولیت مدنی در قرارداد شناسایی شد که ریسک حقوقی بسیار بالایی دارد.',
        recommendation: 'محدود کردن سقف کلی مسئولیت به حداکثر ۱۰۰ درصد مبلغ کل قرارداد.'
      });
    }

    if (hasExcessiveDelayPenalty) {
      score += 20;
      findings.push({
        id: 'LEG-02',
        title: 'جریمه دیرکرد نامتعارف (Excessive Liquidated Damages)',
        severity: 'high',
        description: 'نرخ جریمه تأخیر تحویل خارج از عرف بازار یا فاقد سقف حداکثری است.',
        recommendation: 'تعیین سقف خسارت تأخیر به حداکثر ۱۰ درصد از مبلغ تعهد معوق.'
      });
    }

    if (!hasDisputeResolution && clauses.length > 0) {
      score += 15;
      findings.push({
        id: 'LEG-03',
        title: 'فقدان سازوکار داوری و حل اختلاف (Missing Dispute Resolution Mechanism)',
        severity: 'medium',
        description: 'مرجع رسمی حل اختلاف یا داوری در مفاد قرارداد تصریح نشده است.',
        recommendation: 'افزودن بند ارجاع به مرکز داوری اتاق بازرگانی ایران یا مراجع صالحه قضایی تهران.'
      });
    }

    // Determine overall risk category
    let riskLevel = 'low';
    if (score >= 60) {
      riskLevel = 'critical';
    } else if (score >= 40) {
      riskLevel = 'high';
    } else if (score >= 20) {
      riskLevel = 'medium';
    }

    return {
      risk_score: Math.min(100, score),
      risk_level: riskLevel, // 'low' | 'medium' | 'high' | 'critical'
      findings_count: findings.length,
      findings
    };
  }
}

module.exports = { ContractRiskAnalyzer };
