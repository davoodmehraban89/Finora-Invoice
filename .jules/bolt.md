
## 2026-09-02 - DOM Manipulation for String Escaping
**Learning:** Using `document.createElement` to escape HTML entities in heavily used rendering loops (like list filtering on every keystroke) causes severe DOM thrashing and memory allocation overhead. A simple Regex dictionary replacement is orders of magnitude faster for pure string transformation.
**Action:** Always prefer pure JavaScript string manipulation (like Regex replacements) over DOM operations for formatting and escaping data in render cycles.
