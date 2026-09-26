const { describe, it } = require('node:test');
const assert = require('node:assert');
const { TenantContext } = require('../src/security/tenant-context');
const { RlsEnforcer } = require('../src/security/rls-enforcer');

describe('Multi-Tenant Row Level Security & Data Isolation (Chapters 008, 009, 027, 057, 137, 234, 250)', () => {
  it('Blocks cross-tenant data access between distinct tenants', () => {
    const tenantUserA = new TenantContext({
      user_id: 'usr_alice',
      tenant_id: 'tenant_alpha',
      organization_id: 'org_alpha',
      roles: ['finance_manager']
    });

    const tenantUserB = new TenantContext({
      user_id: 'usr_bob',
      tenant_id: 'tenant_beta',
      organization_id: 'org_beta',
      roles: ['finance_manager']
    });

    const invoiceAlpha = { id: 'inv_101', tenant_id: 'tenant_alpha', amount: 5000 };
    const invoiceBeta = { id: 'inv_201', tenant_id: 'tenant_beta', amount: 8000 };

    // User A can access invoiceAlpha
    assert.strictEqual(tenantUserA.assertTenantAccess(invoiceAlpha.tenant_id), true);

    // User A attempting to access invoiceBeta throws cross-tenant security error
    assert.throws(
      () => tenantUserA.assertTenantAccess(invoiceBeta.tenant_id),
      /Cross-Tenant Access Denied!/
    );

    // User B attempting to access invoiceAlpha throws cross-tenant security error
    assert.throws(
      () => tenantUserB.assertTenantAccess(invoiceAlpha.tenant_id),
      /Cross-Tenant Access Denied!/
    );
  });

  it('RlsEnforcer filters mixed datasets down strictly to the active tenant', () => {
    const context = new TenantContext({
      user_id: 'usr_charlie',
      tenant_id: 'tenant_gamma',
      organization_id: 'org_gamma'
    });

    const multiTenantDataset = [
      { id: '1', tenant_id: 'tenant_alpha', title: 'Doc A' },
      { id: '2', tenant_id: 'tenant_gamma', title: 'Doc Gamma 1' },
      { id: '3', tenant_id: 'tenant_beta', title: 'Doc B' },
      { id: '4', tenant_id: 'tenant_gamma', title: 'Doc Gamma 2' }
    ];

    const filtered = RlsEnforcer.filterDatasetByTenant(multiTenantDataset, context);
    assert.strictEqual(filtered.length, 2);
    assert.deepStrictEqual(filtered.map(f => f.id), ['2', '4']);
  });

  it('Superadmin bypasses tenant filtering when explicitly authorized', () => {
    const superAdmin = new TenantContext({
      user_id: 'usr_super',
      tenant_id: null,
      is_super_admin: true
    });

    const invoice = { id: 'inv_99', tenant_id: 'tenant_xyz' };
    assert.strictEqual(superAdmin.assertTenantAccess(invoice.tenant_id), true);
  });
});
