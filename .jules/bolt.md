## 2023-10-27 - Cache Intl.NumberFormat instance in money()
**Learning:** Repeatedly instantiating Intl.NumberFormat in heavily called functions (like `money()` for formatting table cells) causes measurable processing delays.
**Action:** Cache the formatter instances rather than creating a new one on every call.
