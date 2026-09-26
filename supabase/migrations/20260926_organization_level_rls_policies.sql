-- =========================================================================
-- FINORA DATABASE MIGRATION: 20260926_organization_level_rls_policies.sql
-- Governed by Chapters 008, 009, 027, 057, 137, 234, 250.
-- Remediates DEFECT 10: Enforces Multi-Organization Data Isolation in PostgreSQL
-- =========================================================================

-- Function to retrieve active organization ID for the authenticated user
CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id 
  FROM public.organization_members 
  WHERE user_id = auth.uid() AND is_active = true 
  ORDER BY created_at ASC
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to check if user has consolidated holding/group-level access
CREATE OR REPLACE FUNCTION public.user_has_holding_access()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members 
    WHERE user_id = auth.uid() 
      AND is_active = true 
      AND (role IN ('holding_auditor', 'super_admin', 'owner') 
           OR permissions ? 'view_consolidated_reports')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 1. Counterparties: Org-level Read and Mutation Policy
DROP POLICY IF EXISTS counterparties_tenant_isolation ON public.counterparties;

CREATE POLICY counterparties_org_isolation ON public.counterparties
  FOR ALL USING (
    tenant_id = public.current_user_tenant_id() AND (
      organization_id = public.current_user_organization_id() OR
      public.user_has_holding_access()
    )
  )
  WITH CHECK (
    tenant_id = public.current_user_tenant_id() AND
    organization_id = public.current_user_organization_id()
  );

-- 2. Invoices: Org-level Read and Mutation Policy
DROP POLICY IF EXISTS invoices_tenant_isolation ON public.invoices;

CREATE POLICY invoices_org_isolation ON public.invoices
  FOR ALL USING (
    tenant_id = public.current_user_tenant_id() AND (
      organization_id = public.current_user_organization_id() OR
      public.user_has_holding_access()
    )
  )
  WITH CHECK (
    tenant_id = public.current_user_tenant_id() AND
    organization_id = public.current_user_organization_id()
  );

-- 3. General Ledger Entries: Org-level Read and Post Policy
DROP POLICY IF EXISTS gl_entries_tenant_isolation ON public.general_ledger_entries;

CREATE POLICY gl_entries_org_isolation ON public.general_ledger_entries
  FOR SELECT USING (
    tenant_id = public.current_user_tenant_id() AND (
      organization_id = public.current_user_organization_id() OR
      public.user_has_holding_access()
    )
  );

-- 4. Audit Logs: Tenant and Org level Read Policy
DROP POLICY IF EXISTS audit_logs_tenant_isolation ON public.audit_logs;

CREATE POLICY audit_logs_org_isolation ON public.audit_logs
  FOR SELECT USING (
    tenant_id = public.current_user_tenant_id() AND (
      organization_id = public.current_user_organization_id() OR
      public.user_has_holding_access()
    )
  );
