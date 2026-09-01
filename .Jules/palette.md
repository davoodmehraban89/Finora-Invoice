## 2024-05-15 - Initial Journal\n**Learning:** Creating initial journal as per instructions.\n**Action:** Use journal to record UX patterns.

## 2024-05-15 - Focus Visibility and Disabled States
**Learning:** The app's global buttons and navigation links lacked visual indication for keyboard focus (`:focus-visible`) and clear disabled states (`:disabled`). Providing explicit visual cues greatly enhances keyboard navigation and screen reader interactions.
**Action:** Always check global CSS definitions (`app.css`) for interactive pseudo-classes, especially for primary interactive elements like `.btn` and `.nav-link`.
