# Finora Invoice

فاز نخست نرم‌افزار فینورا: گردش فاکتور فروش از پیش‌نویس و صدور تا ثبت دریافت، محاسبه مانده و چاپ A4.

## اجرای محلی

از ریشه مخزن یک وب‌سرور استاتیک اجرا کنید:

```bash
python3 -m http.server 4173
```

سپس `http://localhost:4173/?demo=1` یا پیوند «مشاهده نسخه نمایشی» را باز کنید. حالت نمایشی به Firebase نیاز ندارد و داده را در LocalStorage نگه می‌دارد.

## Firebase

پروژه به `finora-49289` متصل است. قبل از استفاده عملی:

1. Email/Password را در Firebase Authentication فعال کنید.
2. قواعد و ایندکس‌ها را با `firebase deploy --only firestore` منتشر کنید.
3. Hosting را با `firebase deploy --only hosting` منتشر کنید.

داده‌ها به‌صورت tenant-per-user در `users/{uid}/...` نگهداری می‌شوند. شماره فاکتور داخل Firestore transaction تولید می‌شود.

## آزمون

```bash
node --test tests/invoice-core.test.js
```

## محدوده این فاز

- داشبورد فروش و مطالبات
- صدور و ذخیره پیش‌نویس فاکتور
- محاسبه اقلام، تخفیف و مالیات
- ثبت مبلغ وصول‌شده و نمایش مانده
- فهرست و فیلتر فاکتورها
- پیش‌نمایش و چاپ A4
- قواعد امنیتی Firestore و حالت نمایشی

معماری کل محصول در `Finora_Master_Specification_Final_Chapters_001_260.docx` باقی مانده و این انتشار عمداً فقط vertical slice فاکتور را عملیاتی می‌کند.
