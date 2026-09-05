## 2024-05-24 - XSS via DOM-based escape function
**Vulnerability:** The `Finora.escape()` function used `document.createElement().innerHTML` to escape values. This fails to escape quotes, leading to attribute-based XSS vulnerabilities if the escaped value is used inside HTML attributes.
**Learning:** DOM-based escaping is unreliable for preventing attribute-based XSS because `innerHTML` does not consistently encode quotes (`'` and `"`).
**Prevention:** Always use native JavaScript regex-based string replacement to explicitly encode `&`, `<`, `>`, `"`, and `'` characters.
