## 2024-09-13 - Cache Intl.NumberFormat
**Learning:** Repeated instantiation of Intl.NumberFormat within heavily called functions causes significant processing delays.
**Action:** Cache Intl.NumberFormat instances globally instead of instantiating them repeatedly inside formatting tasks like money().
