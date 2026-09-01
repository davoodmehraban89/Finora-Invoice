(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FinoraTaxRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const profiles = Object.freeze([
    Object.freeze({
      jurisdiction: 'IR',
      taxYear: 1405,
      generalVatRate: 10,
      version: 'IR-VAT-1405.1',
      effectiveFrom: '1405-01-01',
      sourceTitle: 'نرخ عمومی مورد درخواست کاربر؛ تأیید مصداق کالا/خدمت با مقررات رسمی الزامی است',
      sourceUrl: 'https://intamedia.ir/',
      status: 'provisional'
    })
  ]);

  function normalizeDigits(value) {
    return String(value || '').replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
  }

  function taxYearFromDate(issueDate) {
    const match = normalizeDigits(issueDate).match(/^(\d{4})/);
    return match ? Number(match[1]) : null;
  }

  function getProfile(issueDate) {
    const requestedYear = taxYearFromDate(issueDate);
    const exact = profiles.find(profile => profile.taxYear === requestedYear);
    if (exact) return { ...exact, fallback: false };
    const latest = profiles[profiles.length - 1];
    return { ...latest, fallback: true, requestedYear };
  }

  return { profiles, normalizeDigits, taxYearFromDate, getProfile };
});
