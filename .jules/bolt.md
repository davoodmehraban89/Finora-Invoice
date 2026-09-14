## 2024-05-24 - Caching Intl.NumberFormat Instances
**Learning:** Repeatedly instantiating `Intl.NumberFormat` inside heavily called functions (like money formatters) causes significant processing delays due to the overhead of initializing locale data.
**Action:** Always cache `Intl.NumberFormat` instances in a higher scope or module level and reuse them for formatting tasks.
