# Finora — نرم‌افزار جامع ERP سازمانی

این مخزن اجرای تدریجی **Finora — Comprehensive Enterprise ERP Software** است. نقشه راه دائمی محصول در سند مادر ۲۶۰‌فصلی نگهداری می‌شود. برش اجرایی فعلی با عنوان **صدور فاکتور** شامل صدور، پیش‌نویس، وصول، مانده، ابطال، مشتری، کالا/خدمت و چاپ A4 است.

## بازیابی پروژه در هر چت جدید

فایل `FINORA_CHATGPT_BOOTSTRAP_PROMPT.txt` را کامل به عامل جدید بدهید. عامل موظف است وضعیت را از GitHub و فایل‌های پایدار زیر بازسازی کند:

- `AGENTS.md`
- `PROJECT_STATUS.md`
- `docs/handoff/MASTER_RECOVERY_PROMPT.md`
- `docs/handoff/LATEST_HANDOFF.md`
- `docs/ROADMAP_260_CONTROL.md`
- `docs/PROJECT_LOG.md`
- `docs/DECISION_LOG.md`
- `docs/ACCEPTANCE_POLICY.md`

## نسخه آنلاین

Cloudflare Workers Builds شاخه `main` را به‌صورت خودکار منتشر می‌کند:

https://finora-invoice.davoodmehraban89.workers.dev

## زیرساخت

- Frontend استاتیک و راست‌چین
- Supabase Auth و PostgreSQL
- مالکیت داده بر اساس `auth.uid()`
- RLS اجباری روی همه جداول عملیاتی
- شماره‌گذاری اتمیک فاکتور در دیتابیس
- حالت نمایشی مستقل در LocalStorage

## راه‌اندازی دیتابیس

مهاجرت‌ها باید به ترتیب در SQL Editor پروژه Supabase اجرا شوند:

1. `supabase/migrations/202608280001_invoice_phase.sql` برای جداول، ایندکس‌ها، شماره‌گذاری و RLS.
2. `supabase/migrations/202608310001_invoice_tax_context.sql` برای نوع فاکتور و زمینه نسخه‌دار ارزش افزوده.

## آزمون

```bash
node --test tests/invoice-core.test.js
```

## انتشار Cloudflare

```bash
npx wrangler deploy --assets . --name finora-invoice
```

فایل `.assetsignore` مانع انتشار مستندات، آزمون‌ها و migrationها به‌عنوان دارایی عمومی می‌شود.
