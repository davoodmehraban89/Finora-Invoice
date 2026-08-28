# Finora Latest Handoff

Prepared: 2026-08-28 UTC  
Authoritative HEAD: always resolve from GitHub at recovery time  
Latest verified code baseline: `62fe92eacbfd3a369432ece83e642fad46b62239`

Durable control foundation: `c58c3356dbfe04d74589e897d7f90aaa21d8564e`

## Product and roadmap

- Product: **Finora — Comprehensive Enterprise ERP Software / فینورا — نرم‌افزار جامع ERP سازمانی**
- Current workstream: **صدور فاکتور**
- Roadmap authority: `Finora_Master_Specification_Final_Chapters_001_260.docx`
- Roadmap integrity anchor: `f445ec30b395319aece8bd7eb7d98e80bd4655eff6cc81b0253688b551bbc29b`
- Chapters present: 260/260

## Current technical state

- Frontend: static Persian RTL HTML/CSS/JavaScript.
- Authentication/data: Supabase Auth and PostgreSQL.
- Security boundary: per-user `auth.uid()` ownership with RLS.
- Hosting: Cloudflare Workers Builds connected to GitHub `main`.
- Runtime tables: `invoice_counters`, `customers`, `products`, `seller_settings`, `invoices`.
- Demo mode: isolated LocalStorage flow.

## Last completed code change

Customer type values were aligned with the SQL constraint: `person | legal`. This prevents natural-person customer creation from being rejected by the real Supabase database.

Evidence: `62fe92eacbfd3a369432ece83e642fad46b62239`.

## Last completed project-control change

The repository now contains the mandatory bootstrap prompt, agent contract, roadmap integrity control, current status, append-oriented project and decision logs, acceptance policy, task template, pull-request checklist, and automated control tests.

Evidence: `c58c3356dbfe04d74589e897d7f90aaa21d8564e`.

## Verified behavior

- Customer and product save on the live demo.
- Quick customer/product creation inside invoice.
- Add invoice line and save draft to preview.
- Invoice unit tests: 4/4 passing.
- JavaScript syntax and UI contract checks passing.

## Unverified or incomplete

- Authenticated production UAT after the customer enum correction.
- Two-account RLS isolation test.
- Automated CI and browser regression.
- Final organization/tenant architecture.
- Remaining Version 1 domains from Chapter 251.
- Full 260-chapter implementation, which remains the permanent roadmap.

## Safety notes

- Do not request or expose passwords, OTPs, service-role keys, or secret keys.
- Do not treat the publishable Supabase key as an authorization boundary; RLS is the boundary.
- Do not call the product “invoice software.” Invoicing is only the current workstream.
- Do not claim roadmap completion from UI presence.

## Safest next action

Execute and record authenticated mobile UAT and a two-user isolation test for the invoice workstream before expanding scope.
