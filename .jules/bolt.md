## 2026-09-09 - Replace DOM-based HTML escaping with native Regex
**Learning:** Using `document.createElement('div').textContent` to escape HTML strings causes severe DOM thrashing and is unacceptably slow for rendering lists or large datasets, while also failing to escape quotes (an XSS vulnerability in attributes).
**Action:** Always use native JavaScript regex-based string manipulation for HTML escaping instead of interacting with the DOM.
