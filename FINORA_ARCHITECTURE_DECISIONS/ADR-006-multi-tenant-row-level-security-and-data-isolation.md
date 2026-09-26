# ADR-006: Multi-Tenant Architecture with PostgreSQL Row Level Security (RLS)

## Status
Accepted (Normative Security Architecture Decision)

## Context
Chapters 8, 9, 27, 57, 137, 234, and 250 require complete tenant isolation. In multi-tenant enterprise platforms, application-level filtering () alone is vulnerable to developer oversight, SQL injection, or flawed joins, creating cross-tenant data leak risks.

## Decision
1. Implement multi-tenancy at the database level using PostgreSQL **Row Level Security (RLS)** backed by Supabase Auth ().
2. Every multi-tenant table must include an immutable  and  foreign key.
3. RLS policies must strictly enforce that database queries only return or mutate rows belonging to the authenticated user's active tenant membership:
   
4. Automated security tests must verify that User A in Tenant 1 cannot access, read, or mutate data in Tenant 2 under any circumstance.

## Consequences
- Defense-in-depth security: Even if an application query omits a tenant filter, the database engine enforces tenant boundaries.
- Full compliance with international data privacy and residency mandates.
