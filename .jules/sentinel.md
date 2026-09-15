## 2026-09-15 - DOM-based XSS via innerHTML escaping
**Vulnerability:** The global `escape` function used `document.createElement('div').textContent = value; return el.innerHTML;` which escaped HTML tags (`<`, `>`) and ampersands (`&`), but failed to escape single and double quotes. This allowed attribute-based XSS attacks when escaped data was inserted into DOM attributes.
**Learning:** Browser native DOM manipulation for encoding strings is inherently unsafe for generating HTML to be interpolated back into a document as it does not guarantee safe encoding of quote characters.
**Prevention:** Always use regex-based string manipulation explicitly replacing `&`, `<`, `>`, `"`, and `'` with their respective HTML entities instead of relying on implicit browser DOM encoding.
