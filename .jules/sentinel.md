## 2026-09-03 - [HIGH] Fix XSS escaping performance and reliability
**Vulnerability:** The `Finora.escape` function used `document.createElement` and `innerHTML` for HTML entity escaping in tight rendering loops, which has severe performance impacts (DOM thrashing) and potentially differing XSS edge-case behaviors compared to standard regex escaping.
**Learning:** Using DOM manipulation for sanitizing large data arrays causes severe memory overhead. Escaping should use native JavaScript string replacement.
**Prevention:** Use a standard map and regex `/[&<>"']/g` for escaping HTML entities without touching the DOM.
