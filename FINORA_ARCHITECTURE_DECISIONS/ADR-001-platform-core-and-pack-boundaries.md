# ADR-001: Separation of Platform Core, Country Packs, and Industry Packs

## Status
Accepted (Normative Architecture Decision)

## Context
The Finora Master Product Specification covers 260 chapters ranging from core accounting and ERP to vertical industry clouds (Chapters 181–230) and country-specific tax/regulatory compliance (Iran, EU, GCC, global). Attempting to build a monolithic codebase with ad-hoc forks for each country or industry leads to runaway complexity, code bloat, and regression failures.

## Decision
1. Establish a strict architectural boundary dividing the system into three distinct layers:
   - **Platform Core:** Owns tenant isolation, security, canonical domain models (Party, Product, Contract, Account, Document), double-entry General Ledger, posting engine, audit trail, and integration contracts.
   - **Country Packs (Localization):** Encapsulate country-specific rules, tax profiles, electronic invoice formats (e.g., Iran Moadian, SETAD), statutory calendars (Solar Hijri / Jalali), currency conventions, and local statutory filings. Country packs extend Platform Core contracts without forking the domain model.
   - **Industry Packs (Verticals):** Provide specialized domain capabilities (e.g., Banking, Healthcare, Automotive, Manufacturing) via modular extensions, schema extensions, and dedicated workflows.
2. Core services must never hardcode country-specific identifiers or industry-specific logic directly into the central tables or posting engine.

## Consequences
- Clean separation of concerns and high maintainability.
- Country and Industry packs can be versioned, tested, and certified independently.
- Version 1 scope can focus on Platform Core + Iran Country Pack without carrying premature runtime overhead of 50 industry packs.
