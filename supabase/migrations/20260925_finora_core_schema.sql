-- =========================================================================
-- FINORA ENTERPRISE PLATFORM CORE SCHEMA & RLS POLICIES
-- Governed by Chapters 008, 009, 021, 045, 061, 062, 137, 242, 250, 252.
-- =========================================================================

-- Enable pgcrypto for UUIDs and digest generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TENANTS & MULTI-TENANCY
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    country_code VARCHAR(2) DEFAULT 'IR' NOT NULL,
    base_currency VARCHAR(3) DEFAULT 'IRR' NOT NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. ORGANIZATIONS
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE RESTRICT NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    national_id VARCHAR(32) NOT NULL,
    economic_code VARCHAR(32),
    registration_number VARCHAR(32),
    postal_code VARCHAR(16),
    address TEXT,
    phone VARCHAR(32),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT uq_org_tenant_national UNIQUE (tenant_id, national_id)
);

-- 3. ORGANIZATION MEMBERS (IAM & Role-Based Access)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL, -- references auth.users in Supabase
    role VARCHAR(64) DEFAULT 'user' NOT NULL,
    permissions JSONB DEFAULT '[]'::jsonb NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT uq_member_org_user UNIQUE (organization_id, user_id)
);

-- 4. COUNTERPARTIES (Customers, Suppliers, Partners)
CREATE TYPE public.customer_type AS ENUM ('person', 'legal', 'government');

CREATE TABLE IF NOT EXISTS public.counterparties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE RESTRICT NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT NOT NULL,
    type public.customer_type DEFAULT 'legal' NOT NULL,
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    national_id VARCHAR(32),
    economic_code VARCHAR(32),
    registration_number VARCHAR(32),
    postal_code VARCHAR(16),
    address TEXT,
    phone VARCHAR(32),
    email VARCHAR(128),
    roles TEXT[] DEFAULT ARRAY['customer']::TEXT[] NOT NULL,
    credit_limit NUMERIC(18, 2) DEFAULT 0 NOT NULL,
    currency VARCHAR(3) DEFAULT 'IRR' NOT NULL,
    tax_status VARCHAR(32) DEFAULT 'taxable' NOT NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. CATALOG ITEMS (Products & Services)
CREATE TABLE IF NOT EXISTS public.catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE RESTRICT NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT NOT NULL,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(32) DEFAULT 'goods' NOT NULL, -- 'goods', 'service', 'raw_material', 'fixed_asset'
    unit VARCHAR(16) DEFAULT 'EA' NOT NULL,
    tax_item_identifier VARCHAR(64), -- Moadian commodity/service ID
    base_sale_price NUMERIC(18, 2) DEFAULT 0 NOT NULL,
    base_purchase_price NUMERIC(18, 2) DEFAULT 0 NOT NULL,
    currency VARCHAR(3) DEFAULT 'IRR' NOT NULL,
    is_taxable BOOLEAN DEFAULT true NOT NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT uq_catalog_code UNIQUE (organization_id, code)
);

-- 6. INVOICES
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE RESTRICT NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT NOT NULL,
    invoice_number VARCHAR(64) NOT NULL,
    invoice_type VARCHAR(32) DEFAULT 'B2B' NOT NULL,
    pattern_type INT DEFAULT 1 NOT NULL,
    subject_type INT DEFAULT 1 NOT NULL, -- 1: Original, 2: Correction, 3: Cancellation, 4: Return
    customer_id UUID REFERENCES public.counterparties(id) ON DELETE RESTRICT NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    currency VARCHAR(3) DEFAULT 'IRR' NOT NULL,
    exchange_rate NUMERIC(18, 6) DEFAULT 1.0 NOT NULL,
    total_gross_amount NUMERIC(18, 2) DEFAULT 0 NOT NULL,
    total_discount_amount NUMERIC(18, 2) DEFAULT 0 NOT NULL,
    total_net_amount NUMERIC(18, 2) DEFAULT 0 NOT NULL,
    total_tax_amount NUMERIC(18, 2) DEFAULT 0 NOT NULL,
    total_final_amount NUMERIC(18, 2) DEFAULT 0 NOT NULL,
    status VARCHAR(32) DEFAULT 'draft' NOT NULL,
    moadian_status VARCHAR(32) DEFAULT 'unsubmitted' NOT NULL,
    tax_unique_code VARCHAR(128),
    reference_tax_id VARCHAR(128),
    accounting_posted BOOLEAN DEFAULT false NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT uq_invoice_number UNIQUE (organization_id, invoice_number)
);

-- 7. INVOICE LINES
CREATE TABLE IF NOT EXISTS public.invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    line_number INT NOT NULL,
    item_id UUID REFERENCES public.catalog_items(id) ON DELETE RESTRICT NOT NULL,
    description TEXT,
    tax_item_identifier VARCHAR(64),
    quantity NUMERIC(18, 4) DEFAULT 1 NOT NULL,
    unit VARCHAR(16) DEFAULT 'EA' NOT NULL,
    unit_price NUMERIC(18, 2) NOT NULL,
    gross_amount NUMERIC(18, 2) NOT NULL,
    discount_amount NUMERIC(18, 2) DEFAULT 0 NOT NULL,
    net_amount NUMERIC(18, 2) NOT NULL,
    tax_rate NUMERIC(6, 4) DEFAULT 0.10 NOT NULL,
    tax_amount NUMERIC(18, 2) DEFAULT 0 NOT NULL,
    total_line_amount NUMERIC(18, 2) NOT NULL,
    CONSTRAINT uq_invoice_line_no UNIQUE (invoice_id, line_number)
);

-- 8. GENERAL LEDGER ENTRIES (Immutable Journal Entries)
CREATE TABLE IF NOT EXISTS public.general_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE RESTRICT NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT NOT NULL,
    journal_id VARCHAR(64) UNIQUE NOT NULL,
    event_id VARCHAR(64) UNIQUE NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    effective_date DATE NOT NULL,
    posted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    posted_by VARCHAR(128) NOT NULL,
    source_module VARCHAR(64) NOT NULL,
    source_entity_id VARCHAR(64) NOT NULL,
    currency VARCHAR(3) DEFAULT 'IRR' NOT NULL,
    payload_hash VARCHAR(128) NOT NULL,
    total_debit NUMERIC(18, 2) NOT NULL,
    total_credit NUMERIC(18, 2) NOT NULL,
    is_reversed BOOLEAN DEFAULT false NOT NULL,
    reversal_of VARCHAR(64),
    reversed_by_journal_id VARCHAR(64),
    CONSTRAINT chk_debit_credit_balance CHECK (total_debit = total_credit)
);

-- 9. JOURNAL LINES
CREATE TABLE IF NOT EXISTS public.journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID REFERENCES public.general_ledger_entries(id) ON DELETE RESTRICT NOT NULL,
    line_number INT NOT NULL,
    account_code VARCHAR(32) NOT NULL,
    debit NUMERIC(18, 2) DEFAULT 0 NOT NULL,
    credit NUMERIC(18, 2) DEFAULT 0 NOT NULL,
    party_id UUID,
    cost_center VARCHAR(64),
    project_id VARCHAR(64),
    description TEXT,
    CONSTRAINT chk_positive_amounts CHECK (debit >= 0 AND credit >= 0 AND (debit > 0 OR credit > 0)),
    CONSTRAINT uq_journal_line UNIQUE (entry_id, line_number)
);

-- 10. AUDIT LOG (Immutable Forensics)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    organization_id UUID,
    actor_id VARCHAR(128) NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    entity_name VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb NOT NULL,
    ip_address VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 11. ENABLE ROW LEVEL SECURITY ON ALL MULTI-TENANT TABLES
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counterparties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper security function to get current user's active tenant
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id 
  FROM public.organization_members 
  WHERE user_id = auth.uid() AND is_active = true 
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- RLS Policy Examples (Enforcing tenant-level isolation)
CREATE POLICY counterparties_tenant_isolation ON public.counterparties
  FOR ALL USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY catalog_items_tenant_isolation ON public.catalog_items
  FOR ALL USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY invoices_tenant_isolation ON public.invoices
  FOR ALL USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY gl_entries_tenant_isolation ON public.general_ledger_entries
  FOR SELECT USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY audit_logs_tenant_isolation ON public.audit_logs
  FOR SELECT USING (tenant_id = public.current_user_tenant_id());
