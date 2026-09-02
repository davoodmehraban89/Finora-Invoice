# Finora ERP - Final Invoice Release Document

## Release Information
- **Version:** Invoice Print Engine & Project Stabilization v1.0
- **Date:** 2026-09-02
- **Deployment Status:** Ready for Cloudflare Production Promotion

## Changed Files
- `invoice-preview.html` (Print template logic)
- `assets/css/app.css` (Print media styles)
- `docs/releases/RELEASE_v1.0.md` (This document)

## Features Completed
- **Official Invoice Engine (A4):** Fixed to exactly 10 rows per page. Removed "صورت حساب رسمی" in favor of "فاکتور فروش کالا و خدمات". Condensed metadata to specific legal fields (Name, National ID, Economic Code, Registration Number, Postal Code, Phone, Address). Removed non-compliant print labels and redundant payment conditions.
- **Unofficial Invoice Engine (A5):** Removed technical print labels, standardized layout to match ERP design, updated header and layout.
- **Deployment CI/CD Fix:** Resolved Cloudflare deployments failing by configuring `wrangler.toml` explicitly for static asset uploading via GitHub Actions/Cloudflare Integration.

## Database and Architectural Notes
### The "Data Safety & Snapshot" Review
Currently, the invoice architecture stores `customer_name` and `customer_national_id` statically on the `invoices` table when created. However, it dynamically joins/pulls other seller and customer fields (like phone, address, economic code, postal code, etc.) from the `seller_settings` and `customers` tables at render time (in `invoice-preview.html`).

**Important Data Safety Limitation:** This means historical invoices might change if the customer or seller updates their address, phone number, or other settings in the future.
**Future Recommendation:** This incomplete snapshot architecture must be resolved in a future accounting phase. We recommend either migrating to a full immutable JSON snapshot of all buyer/seller data at the time of invoice issuance (`snapshot` JSONB column) OR creating immutable versioned records for customers and settings. No risky database schema refactors were attempted in this UI-focused release.

## Testing Results
- **Unit Tests:** `node --test tests/invoice-core.test.js` - 4/4 passing (100% coverage on core calc logic).
- **Frontend Verification:** Automated Playwright scripts verified the exact visual layout for Official A4 and Unofficial A5 invoices. Spacing, data rendering, fixed rows, and RTL layouts are all strictly preserved.

## Future Recommended Phases
1. Implement full data snapshotting for invoices to ensure complete immutability of historical records.
2. Advance to the next master specification phase (e.g., Inventory or CRM).
3. Finalize complete multi-tenant / multi-organization structures.
