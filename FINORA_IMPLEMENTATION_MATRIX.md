# FINORA 260-CHAPTER IMPLEMENTATION & COMPLIANCE REGISTER

> **Status Authority:** Governed strictly by Chapter 251 (Release 1 Boundary) and Chapter 259 (Acceptance Matrix & Independent Assurance).
> **Classification Scale:** NOT STARTED | ANALYZED | DESIGNED | IN PROGRESS | IMPLEMENTED | TESTED | VERIFIED | BLOCKED | NOT APPLICABLE

## Summary Statistics
- **ANALYZED:** 33 chapters
- **DESIGNED:** 149 chapters
- **IMPLEMENTED:** 78 chapters
- **Total Registered Chapters:** 260

## Chapter Master Register (001–260)

| Ch | Title | Domain | Release | Priority | Status | Entities | Tests / Evidence |
|---|---|---|---|---|---|---|---|
| 001 | معرفی محصول Finora | Product Vision | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 002 | اهداف و فلسفه ساخت | Product Philosophy | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 003 | مدل مدیریت پروژه | Project Governance | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 004 | اصول معماری نرم‌افزار Finora | Architecture Principles | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 005 | معماری کلان Finora | Platform Architecture | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 006 | طراحی کامل منوها و ساختار Navigation | Navigation & UX | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 007 | ماژول داشبورد (Dashboard) | Executive Dashboard | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 008 | ماژول مدیریت کاربران و دسترسی‌ها | IAM & RBAC | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, UserSession |  |
| 009 | تنظیمات سازمان (Organization Setting... | Multi-Tenant Org | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 010 | اشخاص و طرف حساب‌ها | Parties & Counterparties | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 011 | ماژول کالا و خدمات (Product & Servic... | Catalog & Products | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, StockTransaction |  |
| 012 | ماژول انبار (Inventory Management) | Inventory Core | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, StockTransaction |  |
| 013 | ماژول فروش (Sales Management) | Sales Management | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Invoice |  |
| 014 | موتور فاکتور (Invoice Engine) | Invoicing Engine | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 015 | مدیریت اسناد و هوش مصنوعی پردازش اسن... | Document AI & OCR | Release | P1 | **DESIGNED** | Tenant, AuditLog, Document |  |
| 016 | موتور قوانین کسب‌وکار، مالیات و ارزش... | Business Rules & Tax | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, TaxpayerProfile |  |
| 017 | Taxpayer System & Electronic Invoice... | Iran Moadian E-Invoicing | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, TaxpayerProfile |  |
| 018 | Government Procurement, Tendering & ... | Government Procurement | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 019 | مدیریت قراردادها، تعهدات، دریافت‌ها ... | Contracts & Operational Fina... | Release | P1 | **IMPLEMENTED** | Tenant, AuditLog, AccountingEvent |  |
| 020 | خزانه‌داری، بانک، چک، نقدینگی و موتو... | Treasury & Cash Flow | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, BankAccount |  |
| 021 | حسابداری، دفتر کل، کدینگ حساب‌ها و م... | General Ledger & Accounting | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, AccountingEvent |  |
| 022 | مدیریت کالا، انبار، زنجیره تأمین و م... | Supply Chain & Inventory | Release | P1 | **DESIGNED** | Tenant, AuditLog, StockTransaction |  |
| 023 | مدیریت خرید، تأمین‌کنندگان، سفارش خر... | Procurement Core | Release | P1 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 024 | مدیریت مشتری، CRM، فروش و موتور ارتب... | CRM & Sales Intelligence | Release | P1 | **DESIGNED** | Tenant, AuditLog, Invoice |  |
| 025 | هوش مصنوعی Finora AI، دستیار سازمانی... | AI Assistant & Copilot | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 026 | داشبورد مدیریتی، هوش تجاری، گزارش‌سا... | BI & Reporting | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 027 | امنیت سازمانی، مدیریت کاربران، دسترس... | Enterprise Security & Audit | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, UserSession |  |
| 028 | معماری فنی نهایی Finora | Technical Architecture | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 029 | طراحی تجربه کاربری کامل Finora | UX/UI Design System | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 030 | برنامه اجرایی توسعه Finora، نقشه راه... | Delivery Strategy & Roadmap | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 031 | موتور مالیاتی ایران، سامانه مؤدیان، ... | Iran Tax Compliance | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, TaxpayerProfile |  |
| 032 | مدیریت اسناد، بایگانی سازمانی، گردش ... | DMS & e-Signature | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 033 | خزانه‌داری، بانک، چک، دریافت، پرداخت... | Treasury & Liquidity | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, BankAccount |  |
| 034 | مدیریت چرخه عمر قراردادها، تعهدات حق... | CLM & Legal Ops | Release | P1 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 035 | مدیریت منابع انسانی، کارکنان، حقوق و... | HRM & Payroll | Release | P2 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 036 | مدیریت فروش، CRM پیشرفته، مشتری ۳۶۰ ... | Advanced CRM | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 037 | مدیریت خرید، تأمین‌کنندگان، تدارکات،... | Advanced Procurement | Release | P1 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 038 | مدیریت انبار، زنجیره تأمین، موجودی، ... | Advanced WMS | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 039 | مدیریت تولید، برنامه‌ریزی مواد، BOM،... | Manufacturing & MRP | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 040 | هوش تجاری، داشبوردهای مدیریتی، انبار... | Enterprise BI & DWH | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 041 | معماری هوش مصنوعی Finora، دستیار ساز... | Enterprise AI & RAG | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 042 | معماری فنی نهایی Finora، انتخاب تکنو... | Cloud Infrastructure | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 043 | طراحی تجربه کاربری نهایی، رابط کاربر... | Design System | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 044 | برنامه اجرایی ساخت Finora، Roadmap ت... | Execution Governance | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 045 | طراحی اجرایی هسته مالی و حسابداری Fi... | Financial Core | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 046 | موتور انطباق مالیاتی ایران، سامانه م... | Iran Moadian Engine | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, TaxpayerProfile |  |
| 047 | مدیریت اسناد سازمانی، آرشیو هوشمند، ... | IDP & OCR Engine | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 048 | موتور گردش کار سازمانی، اعلان‌ها، کا... | Workflow & BPM | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 049 | مدیریت منابع انسانی، پرسنل، حقوق و د... | HCM & Payroll | Release | P2 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 050 | مدیریت ارتباط با مشتریان، فروش هوشمن... | CRM 360 | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 051 | مدیریت خرید و زنجیره تأمین، تأمین‌کن... | Procurement Intelligence | Release | P1 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 052 | مدیریت قراردادها، چرخه عمر قرارداد، ... | Contract Intelligence | Release | P1 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 053 | مدیریت پروژه، کنترل هزینه، برنامه‌ری... | Project Controls | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 054 | مدیریت تولید، برنامه‌ریزی مواد، BOM،... | Production Execution | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 055 | مدیریت انبار و لجستیک پیشرفته، کنترل... | Advanced Logistics | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 056 | هوش تجاری، داشبوردهای مدیریتی، انبار... | Executive Intelligence | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 057 | معماری امنیت سازمانی، مدیریت هویت، ک... | Security Architecture | Release | P1 | **DESIGNED** | Tenant, AuditLog, UserSession |  |
| 058 | معماری فنی نهایی Finora، انتخاب تکنو... | Production Engineering | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 059 | طراحی تجربه کاربری، سیستم طراحی، راب... | Design System Standard | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 060 | برنامه اجرایی ساخت Finora، Roadmap ت... | Sprint Governance | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 061 | طراحی دیتامدل جامع Finora، استاندارد... | Data Architecture & MDM | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 062 | موتور مالی جامع Finora، حسابداری چند... | Comprehensive Finance | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, AccountingEvent |  |
| 063 | موتور قوانین مالیاتی ایران، ارزش افز... | Tax Engine & Moadian | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, TaxpayerProfile |  |
| 064 | مدیریت اسناد سازمانی، آرشیو دیجیتال،... | Document Integration | Release | P1 | **DESIGNED** | Tenant, AuditLog, Document |  |
| 065 | موتور گردش کار سازمانی، BPM، Approva... | BPM & Approval Engine | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 066 | مدیریت منابع انسانی پیشرفته، پرونده ... | Advanced HCM | Release | P2 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 067 | مدیریت ارتباط با مشتری، فروش، بازاری... | Customer Lifecycle | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 068 | مدیریت خرید، تأمین زنجیره تأمین، تأم... | Supplier Lifecycle | Release | P1 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 069 | مدیریت انبار، لجستیک، موجودی، ردیابی... | Logistics & Barcoding | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 070 | مدیریت تولید و برنامه‌ریزی کارخانه، ... | Smart Factory & MRP | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 071 | مدیریت پروژه سازمانی، کنترل هزینه، ز... | EPM Platform | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 072 | مدیریت چرخه عمر قراردادها، حقوقی، تع... | CLM Platform | Release | P1 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 073 | هوش تجاری سازمانی، انبار داده، داشبو... | Enterprise DWH & BI | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 074 | امنیت سازمانی، مدیریت کاربران، نقش‌ه... | SSO & Cyber Security | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, UserSession |  |
| 075 | معماری فنی نهایی Finora، Microservic... | Event Driven Cloud | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 076 | تجربه کاربری، Design System، رابط کا... | Enterprise Visual Design | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 077 | تست، کنترل کیفیت نرم‌افزار، QA Frame... | QA & Automated Testing | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 078 | استقرار سازمانی، مهاجرت داده، Onboar... | Data Migration & Rollout | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 079 | مدیریت محصول، Roadmap، Feature Manag... | Product Lifecycle | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 080 | مدل کسب‌وکار، استراتژی درآمد، فروش E... | SaaS Business Model | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 081 | استانداردهای صنعتی، Compliance، حاکم... | GRC & Standards | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 082 | مدیریت داده سازمانی، Master Data Man... | Data Governance & MDM | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 083 | اتوماسیون فرآیندهای سازمانی، Workflo... | BPM Automation | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 084 | مدیریت ارتباطات سازمانی، همکاری تیمی... | Digital Workplace | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 085 | مدیریت هوش مصنوعی سازمانی، AI Platfo... | AI Platform & MLOps | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 086 | معماری جهانی Finora، Localization، چ... | Globalization & Multicurrenc... | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 087 | مدیریت زیرساخت ابری، Cloud Native Ar... | Cloud Infrastructure | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 088 | اکوسیستم توسعه‌دهندگان، API Marketpl... | Developer Platform | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 089 | مدیریت صنعت‌ها، Industry Cloud، راهک... | Industry Clouds Framework | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 090 | مدیریت تجربه کاربر، UX Platform، Des... | Inclusive UX | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 091 | امنیت نسل سازمانی، Zero Trust Archit... | Zero Trust IAM | Release | P1 | **DESIGNED** | Tenant, AuditLog, UserSession |  |
| 092 | مدیریت مالی خود Finora، ERP داخلی شر... | SaaS Financial Ops | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 093 | مدیریت سرمایه انسانی Finora، HR Plat... | Talent Intelligence | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 094 | مدیریت زنجیره تأمین، Procurement، Ve... | Strategic Sourcing | Release | P1 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 095 | مدیریت تولید، Manufacturing Executio... | Industrial Operations | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 096 | مدیریت پروژه و دارایی‌های سازمانی، P... | PPM & PMO | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 097 | مدیریت دارایی‌های سازمانی، Enterpris... | EAM & Asset Twin | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 098 | مدیریت مشتری، Customer Experience Pl... | Customer Experience | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 099 | مدیریت قراردادها، Contract Lifecycle... | Contract Intelligence | Release | P1 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 100 | مدیریت دانش سازمانی پیشرفته، Enterpr... | Knowledge Graph | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 101 | مدیریت دولت الکترونیک و سازمان‌های ع... | Public Sector Platform | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 102 | مدیریت سلامت دیجیتال، Healthcare Pla... | Healthcare Platform | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 103 | مدیریت آموزش و دانشگاه دیجیتال، Lear... | Education Platform | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 104 | مدیریت رسانه، محتوا، ارتباطات سازمان... | Media Platform | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 105 | مدیریت همکاری سازمانی، Digital Workp... | Digital Workplace | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 106 | مدیریت داده سازمانی، Data Governance... | Data Mesh & Fabric | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 107 | هوش تجاری سازمانی، Business Intellig... | Decision Intelligence | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 108 | مدیریت هوش مصنوعی سازمانی، AI Platfo... | AI Operations & Agents | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 109 | امنیت سایبری سازمانی، Zero Trust Arc... | Cyber Defense & SIEM | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 110 | زیرساخت ابری سازمانی، Cloud Platform... | Cloud Automation & SRE | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 111 | معماری نرم‌افزار Enterprise، Microse... | Application Architecture | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 112 | تجربه کاربری سازمانی، Design System،... | Omnichannel UX | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 113 | مدیریت تست سازمانی، Quality Engineer... | Quality Engineering | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 114 | مدیریت محصول سازمانی، Product Manage... | Product Intelligence | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 115 | مدیریت پروژه و برنامه‌های سازمانی، E... | Portfolio Intelligence | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 116 | مدیریت قراردادها و حقوق سازمانی، Con... | Legal Operations | Release | P1 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 117 | مدیریت زنجیره تأمین سازمانی، Supply ... | Supply Chain Twin | Release | P1 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 118 | مدیریت تولید و عملیات صنعتی، Smart M... | Smart Manufacturing | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 119 | مدیریت انرژی و پایداری سازمانی، Ener... | ESG & Carbon | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 120 | مدیریت نوآوری سازمانی، Innovation Ma... | Innovation Intelligence | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 121 | مدیریت دانش سازمانی، Knowledge Manag... | Knowledge Management | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 122 | آموزش سازمانی، Learning Management S... | Corporate Learning | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 123 | مدیریت ارتباط با مشتری نسل آینده، Cu... | Hyper-Personalized CRM | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 124 | مدیریت مالی نسل آینده، Intelligent F... | Intelligent Finance | Release | P1 | **DESIGNED** | Tenant, AuditLog, AccountingEvent |  |
| 125 | مدیریت منابع انسانی نسل آینده، Intel... | Intelligent Workforce | Release | P2 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 126 | مدیریت دولت و حکمرانی سازمانی، Enter... | Policy & Governance | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 127 | مدیریت امنیت سازمانی نسل آینده، Cybe... | Autonomous Defense | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 128 | مدیریت زیرساخت سازمانی نسل آینده، Cl... | Infrastructure Intelligence | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 129 | مدیریت داده سازمانی نسل آینده، Data ... | Data Intelligence Layer | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 130 | هوش تجاری نسل آینده، Business Intell... | Predictive Analytics | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 131 | مدیریت هوش مصنوعی سازمانی، Enterpris... | Enterprise AI Platform | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 132 | معماری نهایی Autonomous Enterprise، ... | Autonomous Enterprise OS | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 133 | برنامه اجرایی ساخت Finora، Roadmap، ... | Engineering Strategy | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 134 | مدل کسب‌وکار Finora، Enterprise SaaS... | SaaS & GTM Strategy | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 135 | استانداردهای نهایی Finora، Enterpris... | Architecture Standards | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 136 | شروع برنامه عملیاتی ساخت Finora، تشک... | Launch Blueprint | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 137 | طراحی دقیق Platform Foundation، Mult... | Platform Foundation | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 138 | طراحی Data Foundation اجرایی، Databa... | Data Foundation Core | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 139 | طراحی Security Foundation اجرایی، Ze... | Security Foundation Core | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, UserSession |  |
| 140 | طراحی AI Foundation اجرایی، Enterpri... | AI Foundation Core | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 141 | طراحی اولین Business Domain اجرایی، ... | Finance Core Execution | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, AccountingEvent |  |
| 142 | طراحی Customer Intelligence Core، CR... | Customer Core Execution | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 143 | طراحی Workforce Intelligence Core، H... | Workforce Core Execution | Release | P2 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 144 | طراحی Supply Chain Intelligence Core... | Supply Chain Core Execution | Release | P1 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 145 | طراحی Manufacturing Intelligence Cor... | Manufacturing Core Execution | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 146 | طراحی Asset Intelligence Core، Enter... | Asset Core Execution | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 147 | طراحی Project & Portfolio Intelligen... | Project Core Execution | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 148 | طراحی Enterprise Workflow & Automati... | Workflow Core Execution | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 149 | طراحی Enterprise Knowledge Intellige... | Knowledge Core Execution | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 150 | طراحی Finora Enterprise Operating Sy... | Release & Deployment Archite... | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 151 | طراحی Autonomous Enterprise Evolutio... | Autonomous Evolution | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 152 | طراحی Enterprise Intelligence Contro... | Control Tower & Command | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 153 | طراحی Enterprise Simulation Platform... | Simulation & Scenario Planni... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 154 | طراحی Enterprise AI Governance، Resp... | AI Governance Architecture | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 155 | طراحی Enterprise Cyber Intelligence ... | Cyber Intelligence Platform | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 156 | طراحی Enterprise Data Intelligence E... | Data Mesh & Evolution | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 157 | طراحی Enterprise Integration Intelli... | Integration Mesh | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 158 | طراحی Enterprise Marketplace & Ecosy... | Ecosystem Platform | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 159 | طراحی Enterprise Digital Experience ... | Digital Experience Layer | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 160 | طراحی Enterprise Knowledge Economy، ... | Organizational Evolution | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 161 | طراحی Enterprise Globalization Platf... | Globalization Platform | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 162 | طراحی Enterprise Industry Intelligen... | Industry Cloud Architecture | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 163 | طراحی Enterprise Sustainability Inte... | Sustainability Platform | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 164 | طراحی Enterprise Trust Intelligence ... | Trust Intelligence Architect... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 165 | طراحی Enterprise Financial Intellige... | Autonomous Financial OS | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 166 | طراحی Enterprise Customer Intelligen... | Autonomous Customer OS | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 167 | طراحی Enterprise Workforce Intellige... | Autonomous Workforce OS | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 168 | طراحی Enterprise Operations Intellig... | Autonomous Operations OS | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 169 | طراحی Enterprise Manufacturing Intel... | Industry 4.0 Platform | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 170 | طراحی Enterprise Supply Chain Intell... | Autonomous Supply Chain OS | Release | P1 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 171 | طراحی Enterprise Asset Intelligence ... | Autonomous Asset OS | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 172 | طراحی Enterprise Knowledge Graph Pla... | Enterprise Brain Architectur... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 173 | طراحی Enterprise Autonomous Governan... | Digital Board & Governance | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 174 | طراحی Enterprise Autonomous Ecosyste... | Autonomous Ecosystem OS | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 175 | طراحی Enterprise Autonomous Strategy... | Autonomous Strategy & AI CEO | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 176 | طراحی Enterprise Autonomous Risk & R... | Systemic Risk & Resilience | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 177 | طراحی Enterprise Legal & Regulatory ... | Autonomous Legal Ops | Release | P2 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 178 | طراحی Enterprise Quality & Excellenc... | Quality & Excellence Engine | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 179 | طراحی Enterprise Innovation & R&D In... | Autonomous Innovation OS | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 180 | طراحی Enterprise Sustainability & ES... | Autonomous ESG OS | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 181 | Finora Banking Cloud — معماری کلان B... | Industry Pack: Banking | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 182 | طراحی Finora Insurance Cloud، Policy... | Industry Pack: Insurance | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 183 | طراحی Finora Healthcare Cloud، Patie... | Industry Pack: Healthcare | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 184 | طراحی Finora Manufacturing Cloud، ME... | Industry Pack: Manufacturing | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 185 | طراحی Finora Retail & Commerce Cloud... | Industry Pack: Retail & Comm... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 186 | طراحی Finora Telecom Cloud، Subscrib... | Industry Pack: Telecom | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 187 | طراحی Finora Energy & Utilities Clou... | Industry Pack: Energy & Util... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 188 | طراحی Finora Transportation & Logist... | Industry Pack: Logistics | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 189 | طراحی Finora Construction & Real Est... | Industry Pack: Construction ... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 190 | طراحی Finora Government & Public Sec... | Industry Pack: Government & ... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 191 | Finora Education Cloud | Industry Pack: Education | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 192 | Finora Agriculture & AgriFood Cloud | Industry Pack: Agriculture | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 193 | Finora Hospitality & Travel Cloud | Industry Pack: Hospitality | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 194 | Finora Automotive & Mobility Cloud | Industry Pack: Automotive | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 195 | Finora Aerospace & Aviation Cloud | Industry Pack: Aerospace | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 196 | Finora Pharmaceutical & Life Science... | Industry Pack: Pharma & Life... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 197 | Finora Food & Beverage Cloud | Industry Pack: Food & Bevera... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 198 | Finora Mining & Metals Cloud | Industry Pack: Mining & Meta... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 199 | Finora Oil & Gas Cloud | Industry Pack: Oil & Gas | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 200 | Finora Chemicals Cloud | Industry Pack: Chemicals | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 201 | Finora Media & Entertainment Cloud | Industry Pack: Media & Enter... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 202 | Finora Professional Services Cloud | Industry Pack: Professional ... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 203 | Finora Legal Services Cloud | Industry Pack: Legal Service... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 204 | Finora Accounting & Audit Cloud | Industry Pack: Accounting & ... | Release | P2 | **DESIGNED** | Tenant, AuditLog, AccountingEvent |  |
| 205 | Finora Nonprofit & NGO Cloud | Industry Pack: Nonprofit & N... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 206 | Finora Sports & Venue Cloud | Industry Pack: Sports & Venu... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 207 | Finora Smart City Cloud | Industry Pack: Smart City | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 208 | Finora Defense & Mission Operations ... | Industry Pack: Defense | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 209 | Finora Ports & Maritime Cloud | Industry Pack: Ports & Marit... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 210 | Finora Rail & Transit Cloud | Industry Pack: Rail & Transi... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 211 | Finora Postal & Parcel Cloud | Industry Pack: Postal & Parc... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 212 | Finora Waste & Environmental Service... | Industry Pack: Waste & Envir... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 213 | Finora Water & Wastewater Cloud | Industry Pack: Water & Waste... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 214 | Finora Renewable Energy Cloud | Industry Pack: Renewable Ene... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 215 | Finora Data Center & Cloud Infrastru... | Industry Pack: Data Center &... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 216 | Finora Semiconductor & High-Tech Man... | Industry Pack: Semiconductor | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 217 | Finora Electronics & Device Lifecycl... | Industry Pack: Electronics &... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 218 | Finora Fashion & Apparel Cloud | Industry Pack: Fashion & App... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 219 | Finora Luxury & Consumer Goods Cloud | Industry Pack: Luxury & Cons... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 220 | Finora Wholesale & Distribution Clou... | Industry Pack: Wholesale & D... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 221 | Finora Franchise & Multi-Unit Operat... | Industry Pack: Franchise | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 222 | Finora Security Services Cloud | Industry Pack: Security Serv... | Release | P2 | **DESIGNED** | Tenant, AuditLog, UserSession |  |
| 223 | Finora Facilities & Integrated Workp... | Industry Pack: Facilities & ... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 224 | Finora Humanitarian & Disaster Respo... | Industry Pack: Humanitarian ... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 225 | Finora Scientific Research & Laborat... | Industry Pack: Scientific Re... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 226 | Finora Marketplace & Platform Busine... | Industry Pack: Marketplace &... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 227 | Finora Subscription & Digital Servic... | Industry Pack: Subscription ... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 228 | Finora Cybersecurity Operations Clou... | Industry Pack: Cybersecurity... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 229 | Finora Enterprise Holding & Conglome... | Industry Pack: Holding & Con... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 230 | Finora Industry Cloud Composition & ... | Industry Cloud Architecture ... | Release | P2 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 231 | Global Accounting Standards & Digita... | Normative Architecture: Acco... | Release | P1 | **DESIGNED** | Tenant, AuditLog, AccountingEvent |  |
| 232 | Global Tax & E-Invoicing Compliance ... | Normative Architecture: Glob... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, TaxpayerProfile |  |
| 233 | Regulatory Knowledge Graph & Rules L... | Normative Architecture: Regu... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 234 | Privacy, Data Residency & Records of... | Normative Architecture: Priv... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 235 | Financial Crime, KYC/KYB, AML/CFT & ... | Normative Architecture: AML/... | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 236 | Payments, Open Banking & ISO 20022 | Normative Architecture: Paym... | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 237 | Internal Controls, GRC & Continuous ... | Normative Architecture: GRC ... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 238 | Electronic Records, e-Signature, Leg... | Normative Architecture: Reco... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 239 | Global Payroll, Labor & Social Insur... | Normative Architecture: Glob... | Release | P2 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 240 | Consolidation, Intercompany, FX, Tra... | Normative Architecture: Cons... | Release | P2 | **ANALYZED** | Tenant, AuditLog, Organization |  |
| 241 | Financial Instruments, Revenue, Leas... | Normative Architecture: Fina... | Release | P1 | **DESIGNED** | Tenant, AuditLog, Organization |  |
| 242 | Subledger, Ledger Integrity, Reconci... | Normative Architecture: Ledg... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, AccountingEvent |  |
| 243 | Treasury, Liquidity, Market Risk & H... | Normative Architecture: Trea... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, BankAccount |  |
| 244 | Responsible AI, Model Risk & Human A... | Normative Architecture: Resp... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 245 | Secure SDLC, Software Supply Chain &... | Normative Architecture: Secu... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 246 | Operational Resilience, BCP/DR, DORA... | Normative Architecture: Resi... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 247 | Accessibility, Internationalization ... | Normative Architecture: Acce... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 248 | Data Governance, Lineage, MDM, XBRL ... | Normative Architecture: Data... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 249 | Conformance Testing, Certification &... | Normative Architecture: Conf... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 250 | Deployment, Tenant Isolation, Sovere... | Normative Architecture: Depl... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 251 | Version 1 Product Boundary & Release... | Normative Release: V1 Bounda... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 252 | Canonical Domain Model & Accounting ... | Normative Model: Canonical &... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 253 | API/Event Contract Governance & Inte... | Normative Architecture: API/... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 254 | Migration, Reconciliation & Opening ... | Normative Migration: Opening... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 255 | Observability, SRE, FinOps & Capacit... | Normative Operations: SRE & ... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 256 | Support, Incident, Problem, Change &... | Normative Operations: Suppor... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 257 | Implementation Method, RACI, Stage G... | Normative Governance: Implem... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 258 | Commercial, Licensing, DPA, SLA & En... | Normative Contracts: Licensi... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 259 | Acceptance Matrix, Go-Live Readiness... | Normative Release: Acceptanc... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
| 260 | Finora Product Constitution & Final ... | Normative Constitution: Prod... | Release | P0 | **IMPLEMENTED** | Tenant, AuditLog, Organization |  |
