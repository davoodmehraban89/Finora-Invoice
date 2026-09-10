## 2023-10-27 - Insecure DOM-based HTML escaping
**Vulnerability:** The application used `document.createElement('div').textContent = value; return div.innerHTML` to escape user input. This pattern fails to escape quotes (`"` and `'`), leading to Cross-Site Scripting (XSS) when the escaped value is used inside HTML attributes.
**Learning:** DOM manipulation for escaping is inherently insecure for attribute contexts and causes unnecessary DOM thrashing. It only safely encodes `<` and `>`.
**Prevention:** Always use native JavaScript regex replacement (e.g., `replace(/[&<>"']/g, ...)`) with a complete mapping of all five special characters (`&`, `<`, `>`, `"`, `'`) to their corresponding HTML entities.
