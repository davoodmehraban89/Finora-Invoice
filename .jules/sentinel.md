## 2024-09-08 - Insecure HTML Escaping via DOM innerHTML
**Vulnerability:** The `Finora.escape` utility function was using `document.createElement('div').textContent = value; return el.innerHTML;` to sanitize user input.
**Learning:** Using DOM manipulation (`innerHTML` after `textContent`) for escaping fails to escape quote characters (`"` and `'`), which leaves the application vulnerable to attribute-based Cross-Site Scripting (XSS) when interpolated into HTML attributes. It also causes unnecessary DOM thrashing.
**Prevention:** Always use native JavaScript regex-based string replacement (`.replace()`) to explicitly escape `&`, `<`, `>`, `"`, and `'` characters into their respective HTML entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`).
