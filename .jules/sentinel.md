## 2025-02-14 - DOM-based HTML Escaping Vulnerability
**Vulnerability:** The `Finora.escape` function used `document.createElement('div').textContent = value; return el.innerHTML;`, which does not escape quotes (`'` and `"`). This allows attribute-based XSS when escaped values are placed inside HTML attributes.
**Learning:** Using the browser's DOM for HTML escaping is insecure because it is designed to preserve text, not to sanitize HTML attributes. It also causes severe DOM thrashing.
**Prevention:** Always use regex-based string replacement mapping special characters (`&`, `<`, `>`, `"`, `'`) to their corresponding HTML entities.
