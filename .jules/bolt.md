## 2026-09-04 - [DOM Thrashing in escape function]
**Learning:** Found that `Finora.escape` function creates a DOM element (`document.createElement('div')`) in `assets/js/app.js` to escape HTML entities. This causes severe DOM thrashing and memory overhead, which is bad for heavily used rendering loops.
**Action:** Replace it with native JavaScript regex-based string manipulation to prevent performance bottleneck without relying on browser DOM APIs.
