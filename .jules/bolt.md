## 2026-09-08 - Fast DOM Escaping
**Learning:** Using `document.createElement().innerHTML` for HTML escaping is slow and causes DOM thrashing. It also misses some quotes (attribute-based XSS vulnerabilities).
**Action:** Use native JavaScript regex replacement with a map (`const _escMap = ...; return String(val).replace(/[&<>"']/g, m => _escMap[m])`) for safe and extremely fast text escaping.
