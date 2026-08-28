# مستندات Finora Invoice

- `PHASE_1_INVOICE.md`: دامنه، چرخه عمر، مدل داده و معیارهای پذیرش فاز فاکتور
- `v1-FaktoraPro/README.md`: شواهد استخراج‌شده از مرجع فاکتورا پرو
- `../supabase/migrations/202608280001_invoice_phase.sql`: اسکیمای اجرایی و سیاست‌های امنیتی Supabase

## مسیر عملیاتی

مرورگر ← Supabase Auth ← PostgreSQL با RLS

GitHub `main` ← Cloudflare Workers Builds ← نسخه آنلاین

تمام تغییرات ساختاری دیتابیس باید به شکل migration نسخه‌دار ثبت شوند و هیچ کلید Secret در مخزن قرار نگیرد.
