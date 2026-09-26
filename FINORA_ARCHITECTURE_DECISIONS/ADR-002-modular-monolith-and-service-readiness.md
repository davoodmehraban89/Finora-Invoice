# ADR-002: Modular Monolith with Contract-First Service Readiness

## Status
Accepted (Normative Architecture Decision)

## Context
Chapter 4, Chapter 28, and Chapter 75 discuss microservices and enterprise distributed topologies. However, premature adoption of distributed microservices across 260 domains introduces distributed transaction hazards, network latency, deployment complexity, and fragile consistency models before the core business invariants are proven.

## Decision
1. Implement Finora Version 1 as a **Modular Monolith** with strict domain boundaries enforced via contracts and module interfaces.
2. Each domain module (, , , , , , ) maintains its own internal domain logic and interacts with other modules exclusively through typed APIs and Event Contracts.
3. Database schemas and tables are strictly partitioned by bounded context to allow extraction into independent microservices in later release stages without schema rewrites.
4. Distributed event messaging abstractions () are utilized for asynchronous domain notifications and outbox processing.

## Consequences
- Fast developer velocity, deterministic local test execution, and zero network serialization overhead for V1 transactions.
- Zero distributed transaction dual-write bugs in the General Ledger.
- Path to distributed microservices is preserved via clean bounded contexts and event contracts.
