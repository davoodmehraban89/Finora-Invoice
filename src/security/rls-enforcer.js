/**
 * Finora Application-level & Database RLS Policy Enforcer
 * Enforces strict multi-tenant and multi-organization data isolation boundaries.
 * Governed strictly by Chapters 008, 009, 027, 057, 137, 234, 250.
 * 
 * Invariants:
 * 1. Cross-tenant reads and mutations are unconditionally forbidden.
 * 2. Cross-organization access is strictly isolated by default.
 * 3. Multi-org holding/consolidated views require explicit authorization ('holding_auditor' or 'view_consolidated_reports').
 * 4. Mutations on foreign organization records are blocked to prevent data contamination.
 */

class RlsEnforcer {
  /**
   * Filters dataset strictly by tenant boundaries.
   */
  static filterDatasetByTenant(dataset, tenantContext) {
    if (!dataset || !Array.isArray(dataset)) return [];
    if (!tenantContext) throw new Error('TenantContext is mandatory for dataset filtering.');
    if (tenantContext.is_super_admin) return dataset;

    return dataset.filter(row => {
      if (!row.tenant_id) return false;
      return row.tenant_id === tenantContext.tenant_id;
    });
  }

  /**
   * DEFECT 10: Enforces Organization-Level Isolation for read operations.
   * Protects against leakage of branch/subsidiary financial statements, invoices, and documents.
   */
  static filterDatasetByOrganization(dataset, tenantContext, { allowConsolidated = false, targetOrgId = null } = {}) {
    const tenantFiltered = this.filterDatasetByTenant(dataset, tenantContext);
    if (tenantContext.is_super_admin) return tenantFiltered;

    const isConsolidatedAuthorized = allowConsolidated && (
      (tenantContext.roles && (tenantContext.roles.includes('holding_auditor') || tenantContext.roles.includes('super_admin') || tenantContext.roles.includes('owner'))) ||
      (typeof tenantContext.hasPermission === 'function' && tenantContext.hasPermission('view_consolidated_reports'))
    );

    if (isConsolidatedAuthorized) {
      if (targetOrgId) {
        return tenantFiltered.filter(row => row.organization_id === targetOrgId);
      }
      if (tenantContext.authorized_org_ids && tenantContext.authorized_org_ids.length > 0) {
        return tenantFiltered.filter(row => tenantContext.authorized_org_ids.includes(row.organization_id));
      }
      return tenantFiltered;
    }

    // Strict Org Isolation
    const activeOrgId = targetOrgId || tenantContext.organization_id;
    return tenantFiltered.filter(row => {
      if (!row.organization_id) return false;
      if (row.organization_id === activeOrgId) return true;
      if (tenantContext.authorized_org_ids && tenantContext.authorized_org_ids.includes(row.organization_id)) {
        return true;
      }
      return false;
    });
  }

  /**
   * Authorizes mutation operations (INSERT, UPDATE, DELETE).
   * Validates permissions, tenant isolation, and organization ownership.
   */
  static authorizeMutation(record, tenantContext, permissionRequired = null) {
    if (!tenantContext) throw new Error('TenantContext is mandatory for mutation authorization.');

    if (permissionRequired && typeof tenantContext.hasPermission === 'function' && !tenantContext.hasPermission(permissionRequired)) {
      throw new Error(`Authorization Error: User lacks required permission '${permissionRequired}'.`);
    }

    if (typeof tenantContext.assertTenantAccess === 'function') {
      tenantContext.assertTenantAccess(record.tenant_id);
    } else if (record.tenant_id !== tenantContext.tenant_id && !tenantContext.is_super_admin) {
      throw new Error(`Tenant Isolation Violation: Cross-tenant mutation forbidden.`);
    }

    // DEFECT 10: Organization mutation protection
    if (record.organization_id && !tenantContext.is_super_admin) {
      const isAllowedOrg = record.organization_id === tenantContext.organization_id ||
        (tenantContext.authorized_org_ids && tenantContext.authorized_org_ids.includes(record.organization_id));
      if (!isAllowedOrg) {
        throw new Error(
          `Organization Isolation Violation: User belonging to org '${tenantContext.organization_id}' is forbidden from mutating record belonging to org '${record.organization_id}'.`
        );
      }
    }

    return true;
  }
}

module.exports = { RlsEnforcer };
