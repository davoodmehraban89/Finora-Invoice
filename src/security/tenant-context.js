/**
 * Finora Multi-Tenant Security & Context Management
 * Governed strictly by Chapters 008, 009, 027, 057, 074, 091, 137, 139, 234, 250.
 */

class TenantContext {
  constructor({
    user_id,
    tenant_id,
    organization_id,
    roles = ['user'],
    permissions = [],
    is_super_admin = false
  }) {
    if (!user_id) throw new Error('Security violation: user_id is required in TenantContext.');
    if (!tenant_id && !is_super_admin) {
      throw new Error('Security violation: tenant_id is required for non-superadmin context.');
    }

    this.user_id = user_id;
    this.tenant_id = tenant_id;
    this.organization_id = organization_id;
    this.roles = Array.isArray(roles) ? roles : [roles];
    this.permissions = new Set(permissions);
    this.is_super_admin = Boolean(is_super_admin);
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

module.exports = { TenantContext };
