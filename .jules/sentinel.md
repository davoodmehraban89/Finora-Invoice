## 2026-09-09 - Fix DOM-based HTML escaping for XSS prevention
**Vulnerability:** The `Finora.escape` function used `document.createElement('div').textContent = value; return el.innerHTML;` which escaped tags but NOT double/single quotes, enabling attribute-based XSS if user input is interpolated into HTML attributes.
**Learning:** Using DOM-based escaping (`.innerHTML`) is inadequate for overall safety because browser DOM parsers do not escape quotes in text content, only `<`, `>`, and `&`.
**Prevention:** Always use regex-based substitution explicitly for `&`, `<`, `>`, `"`, and `'` or established libraries to properly escape untrusted inputs, rather than relying on browser DOM serialization quirks.
