# ADR-007: Contract-First API and Semantic Event Governance

## Status
Accepted (Normative Architecture Decision)

## Context
Chapter 253 defines strict governance for API and event compatibility. Unversioned payload changes cause silent downstream failures in reporting, tax submission, and accounting integrations.

## Decision
1. All public and inter-module APIs are contract-first, with typed schemas and strict semantic versioning ().
2. Event schemas are registered in a central registry with immutable schema versions (, ).
3. Breaking changes require a new major version or new event topic/name, with a deprecation and migration window for downstream consumers.
4. All mutation commands and financial event handlers must enforce **Idempotency** via unique  or  headers to eliminate duplicate processing during retries.

## Consequences
- Guaranteed backward compatibility across releases.
- Safe automated retries in unreliable network or webhook conditions.
