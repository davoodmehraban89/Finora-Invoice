## 2024-05-18 - Optimize HTML escaping to prevent DOM thrashing
**Learning:** Using DOM APIs like `document.createElement` in utility functions like string escaping causes severe DOM thrashing and performance overhead, particularly when rendering lists or tables.
**Action:** Always prefer native string manipulation (like regex replacements) over DOM-based solutions for text formatting and escaping in hot paths.
