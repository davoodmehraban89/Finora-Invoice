# مستندات فینورا — نرم‌افزار جامع ERP سازمانی

- `PHASE_1_INVOICE.md`: دامنه، چرخه عمر، مدل داده و معیارهای پذیرش برش جاری «صدور فاکتور»
- `v1-FaktoraPro/README.md`: شواهد استخراج‌شده از مرجع فاکتورا پرو
- `../supabase/migrations/202608280001_invoice_phase.sql`: اسکیمای اجرایی و سیاست‌های امنیتی Supabase
- `ROADMAP_260_CONTROL.md`: کنترل تمامیت و تفسیر نقشه راه دائمی ۲۶۰‌فصلی
- `PROJECT_LOG.md`: دفتر ثبت برنامه، اجرا، آزمون و شواهد هر تغییر
- `DECISION_LOG.md`: تصمیم‌های معماری و دامنه
- `ACCEPTANCE_POLICY.md`: تعریف وضعیت‌ها و شواهد لازم برای پذیرش
- `handoff/MASTER_RECOVERY_PROMPT.md`: پروتکل بازیابی پروژه از GitHub
- `handoff/LATEST_HANDOFF.md`: آخرین وضعیت قابل تحویل به عامل بعدی
- `JULES_TASK_TEMPLATE.md`: قالب اجباری وظیفه برای Jules، Codex یا عامل بعدی

## مسیر عملیاتی

مرورگر ← Supabase Auth ← PostgreSQL با RLS

GitHub `main` ← Cloudflare Workers Builds ← نسخه آنلاین

تمام تغییرات ساختاری دیتابیس باید به شکل migration نسخه‌دار ثبت شوند و هیچ کلید Secret در مخزن قرار نگیرد.
