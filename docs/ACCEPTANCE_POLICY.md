# Finora Acceptance Policy

## Status vocabulary

- `PLANNED`: approved intent exists; no implementation evidence.
- `IN_PROGRESS`: implementation started; not ready for acceptance.
- `IMPLEMENTED_UNVERIFIED`: code exists but required evidence is incomplete.
- `VERIFIED`: tests and deployed behavior were independently checked.
- `ACCEPTED`: verified work is on the authoritative branch and all applicable gates passed.
- `BLOCKED`: a named dependency or authorization prevents safe continuation.

## Required evidence for acceptance

Every material change must have:

1. A roadmap/chapter reference and explicit scope boundary.
2. Exact changed-file list and remote commit or pull-request evidence.
3. Automated test commands and results.
4. Negative/error-path tests, not only a happy path.
5. Security and data-isolation review when data or authentication changes.
6. Versioned migration and rollback/compatibility notes for database changes.
7. Deployed verification for user-visible changes.
8. Updated status, project log, decision log when applicable, and latest handoff.
9. No unresolved critical or high-severity defect.
10. Chapter 259 evidence for release/go-live claims.

## Financial and operational invariants

- Issued/posted records are never silently deleted or rewritten.
- Invoice numbers are unique within their defined organizational scope.
- Monetary calculations are deterministic and covered by test vectors.
- Document status and payment status are separate concepts.
- Archive is soft deletion for master data referenced by historical transactions.
- Every protected row belongs to an authenticated user/tenant and is constrained by RLS.
- Retried financial operations must be idempotent before production acceptance.

## Prohibited claims

An agent may not say “finished,” “production-ready,” “secure,” “compliant,” or “fully tested” when the corresponding evidence is absent. A locally working UI is not proof of database, security, multi-user, legal, or deployment correctness.

