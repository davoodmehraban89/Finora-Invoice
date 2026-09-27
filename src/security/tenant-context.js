/**
 * Finora Multi-Tenant Security & Context Management
 * Governed strictly by Chapters 008, 009, 027, 057, 074, 091, 137, 139, 234, 250.
 */

const SUPER_ADMIN_EMAILS = new Set([
  'davoodmehraban89@gmail.com'
]);

class TenantContext {
  constructor({
    user_id,
    tenant_id,
    organization_id,
    roles = ['user'],
    permissions = [],
    is_super_admin = false,
    email = null
  }) {
    if (!user_id) throw new Error('Security violation: user_id is required in TenantContext.');

    this.email = email ? email.toLowerCase().trim() : null;
    const isDesignatedAdminEmail = this.email && SUPER_ADMIN_EMAILS.has(this.email);

    this.is_super_admin = Boolean(is_super_admin || isDesignatedAdminEmail);

    if (!tenant_id && !this.is_super_admin) {
      throw new Error('Security violation: tenant_id is required for non-superadmin context.');
    }

    this.user_id = user_id;
    this.tenant_id = tenant_id || (this.is_super_admin ? 'ten_tehran_default' : null);
    this.organization_id = organization_id || (this.is_super_admin ? 'org_tehran_default' : null);

    const baseRoles = Array.isArray(roles) ? roles : [roles];
    if (this.is_super_admin) {
      const adminRoles = ['owner', 'super_admin', 'finance_manager', 'hr_manager', 'procurement_manager', 'holding_auditor'];
      this.roles = Array.from(new Set([...baseRoles, ...adminRoles]));
      this.permissions = new Set(['*']);
    } else {
      this.roles = baseRoles;
      this.permissions = new Set(permissions);
    }

    this.authenticated_at = new Date().toISOString();
  }

  hasPermission(permission) {
    if (this.is_super_admin) return true;
    return this.permissions.has(permission) || this.permissions.has('*');
  }

  hasRole(role) {
    if (this.is_super_admin) return true;
    return this.roles.includes(role);
  }

  assertTenantAccess(recordTenantId) {
    if (this.is_super_admin) return true;
    if (!recordTenantId) {
      throw new Error('Security Breach: Target entity is missing tenant_id.');
    }
    if (this.tenant_id !== recordTenantId) {
      throw new Error(
        `Cross-Tenant Access Denied! Actor tenant '${this.tenant_id}' cannot access resource in tenant '${recordTenantId}'.`
      );
    }
    return true;
  }
}

module.exports = { TenantContext, SUPER_ADMIN_EMAILS };
