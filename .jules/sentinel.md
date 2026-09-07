## 2026-09-07 - Fix attribute-based XSS vulnerability in HTML escaping
**Vulnerability:** The `Finora.escape` function used `document.createElement('div').textContent` to escape HTML, but this fails to escape double and single quotes. This allowed attribute-based XSS when `Finora.escape()` was used inside HTML attributes like `data-edit`.
**Learning:** Using DOM manipulation for escaping user input is unsafe because it only escapes characters that would break text nodes (`<`, `>`, `&`) and leaves quotes unescaped, which is dangerous in attribute contexts. It also causes severe DOM thrashing.
**Prevention:** Always use native JavaScript regex-based string manipulation to properly escape `&`, `<`, `>`, `"`, and `'` characters for safe HTML and attribute interpolation.
