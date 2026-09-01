# Finora Iran Compliance Register

This register is the controlled backlog for Iranian legal and regulatory behavior. A listed source is not equivalent to implemented or certified compliance.

## Status vocabulary

- `REGISTERED`: source/domain identified; executable rules are not complete.
- `FOUNDATION`: versioned data model or UI foundation exists.
- `IMPLEMENTED_UNVERIFIED`: code exists but legal/accounting and production evidence are incomplete.
- `VERIFIED`: source version, effective dates, test vectors, and specialist review are recorded.

## Current register

| Domain | Primary authority | Current status | Current product coverage | Next evidence gate |
|---|---|---|---|---|
| Value-added tax | National Tax Administration (`intamedia.ir`) and annual budget law | `FOUNDATION` | Annual general-rate profile, invoice VAT on/off, stored rule version | Verify the enacted 1405 source text, exemptions, special rates, and accountant-approved golden cases |
| Taxpayer System and electronic invoices | National Tax Administration and Taxpayer System law | `REGISTERED` | Formal-invoice label only; no submission claim | Schema/type rules, fiscal memory, signing/key custody, API sandbox, rejection/correction flows |
| Direct Taxes Act | National Tax Administration and national laws database | `REGISTERED` | No executable income/direct-tax engine | Versioned articles, applicability, withholding and reporting test vectors |
| Commercial Code | National laws database and competent corporate authority | `REGISTERED` | Parties and sales documents only | Entity/legal-form rules, commercial books, negotiable instruments and specialist review |
| Accounting and financial reporting | Audit Organization and applicable statutory standards | `REGISTERED` | Invoice calculations; no posting engine | Accounting-event contract, chart of accounts, posting/reversal and reconciliation evidence |
| Social security and payroll | Social Security Organization | `REGISTERED` | Not implemented in current invoice workstream | Employer/payroll rule packs, effective dates, test vectors and legal review |
| E-commerce, privacy and evidence | National laws database and competent authorities | `REGISTERED` | Authentication, RLS and basic audit-related project rules | Consent, retention, evidence, signature and privacy requirements |

## Rule-package requirements

Every executable legal rule must record jurisdiction, legal source, source URL, enactment/effective dates, version, applicability, exemptions/special cases, reviewer, test vectors, superseded version, migration impact, and rollback behavior. Rates or legal text must not be silently hardcoded.

## Current limitation

`IR-VAT-1405.1` carries the requested 10% general rate as a provisional product profile. It is not a legal opinion, does not classify exempt or special-rate goods/services, and must not be represented as Taxpayer System acceptance or complete Iranian tax compliance.
