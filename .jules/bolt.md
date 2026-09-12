## 2026-09-12 - Replace DOM-based string escaping with regex
**Learning:** Using `document.createElement('div').innerHTML` for HTML escaping causes severe DOM thrashing in this application, specifically blocking the main thread during rendering of large lists and data tables. It also fails to escape quotes properly.
**Action:** Always use native JavaScript regex-based string manipulation (`String.prototype.replace`) with a character map for HTML escaping to avoid layout thrashing and safely prevent attribute-based XSS.
