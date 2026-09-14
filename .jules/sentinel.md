## 2024-05-24 - Fix XSS in Finora.escape

**Vulnerability:** The application was using DOM manipulation (`document.createElement('div').innerHTML`) in the `Finora.escape` function to sanitize user input. This failed to escape quotes, causing attribute-based XSS vulnerabilities, and also caused severe DOM thrashing, which is bad for performance and security.

**Learning:** Relying on DOM manipulation to escape HTML entities is flawed. It does not properly escape all necessary characters (like quotes) which are critical for preventing attribute injection XSS.

**Prevention:** Always use native JavaScript regex-based string manipulation for escaping HTML entities to ensure comprehensive sanitization and better performance.
