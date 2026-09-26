# ADR-005: Versioned Tax and Regulatory Rule Engine

## Status
Accepted (Normative Compliance Architecture Decision)

## Context
Statutory tax rates (e.g., Iran VAT changing across fiscal years), exemption thresholds, calculation algorithms, and electronic invoice schemas change frequently due to legislative updates. Hardcoding rates or schemas into source code causes regressions, breaks historical calculations, and prevents multi-period audits.

## Decision
1. Statutory tax rates, thresholds, and calculation rules must never be hardcoded into application business logic.
2. All tax and regulatory rules are defined as versioned data packages within the  and  with explicit metadata:
   -  (e.g., , , )
   -  and  (UTC/Jalali dates)
   -  (e.g., , )
   -  (e.g., )
   -  / 
3. When processing an invoice or financial event, the system resolves the applicable rule package strictly based on the transaction's effective tax date.

## Consequences
- Historical transactions retain exact mathematical accuracy when viewed or re-evaluated years later.
- Regulatory changes are deployed as versioned configuration packages without modifying or recompiling core engine code.
