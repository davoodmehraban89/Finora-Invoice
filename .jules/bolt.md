## 2023-09-16 - Cached Intl formatters for performance
**Learning:** Instantiating `Intl.NumberFormat` and `Intl.DateTimeFormat` within frequently called functions like `money()` and `today()` causes significant processing delays, especially in tight loops like rendering large tables of invoice items.
**Action:** Move `Intl` instance creation outside the function to cache the formatter, reusing the single instance for all formatting calls.

## 2023-09-16 - Use Regex for HTML escaping instead of DOM node creation
**Learning:** The existing `escape()` function created a DOM node (`document.createElement('div')`) and set `textContent` to escape HTML strings. This is extremely slow and causes DOM thrashing if called many times during a large render (e.g., rendering an invoice). It also fails to escape quotes correctly for attributes, potentially leading to XSS if used in HTML attributes.
**Action:** Replace DOM-based escaping with native JavaScript regex-based string manipulation using a map for characters (`&`, `<`, `>`, `"`, `'`).
