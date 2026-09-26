# FINORA SECURITY & REGULATORY REVIEW

## 1. Threat Model & Architecture
Governed by Chapters 008, 009, 027, 057, 074, 091, 109, 127, 137, 139, 234, 245, 250.

- **Zero Trust Model:** Default deny on all inter-module and database access.
- **Tenant Isolation:** Enforced at the database layer via PostgreSQL Row Level Security (RLS) on all multi-tenant tables (`tenants`, `organizations`, `counterparties`, `catalog_items`, `invoices`, `general_ledger_entries`, `journal_lines`, `audit_logs`).
- **Cryptographic Protection:**
  - Sensitive secrets (Moadian private keys, API credentials) stored exclusively as references to secure vault storage; plain-text credentials in database or logs are strictly prohibited.
  - Electronic tax invoices signed using RSA PKCS#8 with SHA-256 payload digest.
  - Document store hashes contents using SHA-256 for non-repudiation.

## 2. Regulatory Compliance Matrix
- **Iran Tax & Moadian:** Chapters 016, 017, 031, 046, 063, 232. Compliant payload builder, 10% standard rate, commodity ID validation, fiscal memory adapter.
- **Data Privacy & Residency:** Chapter 234. Purpose-based access, field-level masking, strict tenant isolation.
- **Audit & Internal Controls:** Chapter 237, 242, 248. Append-only audit logs with actor ID, IP address, timestamp, and entity state hashes.
- **Responsible AI:** Chapter 244. Advisory role, model versioning, confidence scoring, explanation codes, human-in-the-loop authority.
