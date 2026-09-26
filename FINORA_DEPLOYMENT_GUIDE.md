# FINORA DEPLOYMENT & OPERATION GUIDE

## 1. System Requirements
- **Node.js:** v18.0.0 or higher
- **PostgreSQL / Supabase:** v15+ with `pgcrypto` and Row Level Security enabled
- **Supported Hosting:** Cloudflare Pages/Workers (`wrangler.jsonc`), Firebase Hosting (`.firebaserc`), Docker/Kubernetes container runtime.

## 2. Database Migration Setup
1. Apply the core schema and RLS policies:
   ```bash
   psql -h <host> -U <user> -d <dbname> -f supabase/migrations/20260925_finora_core_schema.sql
   ```
2. Verify that RLS is active on all tables:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
   ```

## 3. Running Automated Tests
Execute the native test runner:
```bash
node --test tests/*.test.js
```
Expected output: 19/19 tests passing with zero failures.

## 4. Environment Variables
- `FINORA_ENV`: `production` | `staging` | `development`
- `FINORA_TENANT_ISOLATION_MODE`: `rls_strict`
- `MOADIAN_FISCAL_MEMORY_ID`: Configured terminal ID (e.g., `TAX-MEM-001`)
- `MOADIAN_PRIVATE_KEY_PATH`: Path to encrypted PKCS#8 private key
