## 2025-02-14 - Replace DOM-based escaping with Regex
**Learning:** Using `document.createElement().innerHTML` for HTML escaping is slow, causes DOM thrashing, and fails to escape quotes properly (leading to XSS vulnerabilities).
**Action:** Replace `document.createElement('div')` based escaping with a regex-based string manipulation function for significantly better performance and correctness, especially in client-side rendering loops.
