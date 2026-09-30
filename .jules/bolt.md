## 2026-09-11 - Fast Escape via Regex Pre-compilation
**Learning:** The previous \`escape\` function created a DOM element (\`document.createElement('div')\`) and updated \`textContent\` on every call to escape strings. This causes severe DOM thrashing and is very slow. It is also an anti-pattern as mentioned in memory: "Avoid using DOM manipulation... to escape HTML entities".
**Action:** Replace DOM-based escaping with a pure string/regex replacement using a pre-defined map for characters like \`&<>"'\`\`.
