# Finora Invoice

فاز اجرایی ماژول فاکتور فینورا: صدور، پیش‌نویس، وصول، مانده، ابطال، مشتری، کالا/خدمت و چاپ A4.

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

مهاجرت `supabase/migrations/202608280001_invoice_phase.sql` باید یک‌بار در SQL Editor پروژه Supabase اجرا شود. این فایل جداول، ایندکس‌ها، تریگر شماره فاکتور و سیاست‌های RLS را ایجاد می‌کند.

## آزمون

```bash
node --test tests/invoice-core.test.js
```

## انتشار Cloudflare

```bash
npx wrangler deploy --assets . --name finora-invoice
```

فایل `.assetsignore` مانع انتشار مستندات، آزمون‌ها و migrationها به‌عنوان دارایی عمومی می‌شود.
