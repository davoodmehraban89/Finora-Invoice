## 2024-05-18 - Fix DOM-based XSS in Finora.escape()
**Vulnerability:** The `escape` function used DOM manipulation (`document.createElement('div').innerHTML`) to sanitize user input. This causes severe DOM thrashing and fails to escape quotes (like `"` and `'`), leading to potential attribute-based XSS when user input is injected into HTML attributes.
**Learning:** Using `innerHTML` for escaping in vanilla JS projects is dangerous and inefficient, especially for attribute context. Always use regex-based character replacement for HTML encoding.
**Prevention:** Always use a native string replacement function to escape special HTML characters (`&`, `<`, `>`, `"`, `'`).
