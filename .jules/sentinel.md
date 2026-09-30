## 2024-05-20 - DOM-Based HTML Escaping Vulnerability
**Vulnerability:** XSS vulnerability through attribute injection because DOM-based escaping (via `innerHTML`) failed to properly escape single and double quotes.
**Learning:** Using `document.createElement().innerHTML` for HTML escaping is fundamentally insecure because it does not reliably escape quotes, leaving attributes vulnerable, and also introduces severe DOM thrashing overhead.
**Prevention:** Always use a native JavaScript regular expression replacement strategy to securely and thoroughly escape all special HTML characters (`&`, `<`, `>`, `"`, `'`).
