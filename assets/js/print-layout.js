'use strict';

// Measure the real print rules before opening the native dialog. Never trim data
// or shrink financial text to make an overfilled document appear to fit.
window.FinoraPrint = {
  async fits(paper) {
    await document.fonts.ready;
    const style = document.createElement('style');
    const rules = [];
    for (const sheet of document.styleSheets) {
      if (sheet.href && new URL(sheet.href).origin !== location.origin) continue;
      for (const rule of sheet.cssRules) {
        if (rule.type === CSSRule.MEDIA_RULE && rule.conditionText === 'print') {
          rules.push(...Array.from(rule.cssRules, child => child.cssText));
        }
      }
    }
    if (!rules.length) throw new Error('Print styles are unavailable');
    style.textContent = rules.join('\n');
    try {
      document.head.appendChild(style);
      const rect = paper.getBoundingClientRect();
      const height = (paper.dataset.paperSize === 'A4' ? 200 : 138) * 96 / 25.4;
      const elements = Array.from(paper.querySelectorAll('*'));
      return rect.height <= height && elements.every(element => {
        const bounds = element.getBoundingClientRect();
        return bounds.bottom <= rect.top + height && bounds.left >= rect.left - 1 &&
          bounds.right <= rect.right + 1 && element.scrollWidth <= element.clientWidth + 1;
      });
    } finally {
      style.remove();
    }
  }
};
