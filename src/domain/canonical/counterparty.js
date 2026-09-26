/**
 * Finora Canonical Domain Model: Counterparty (Party)
 * Governed by Chapters 010, 024, 036, 050, 067, 142, 252.
 */

class Counterparty {
  constructor({
    id,
    tenant_id,
    organization_id,
    type, // 'person' | 'legal' | 'government'
    name,
    trade_name = null,
    national_id,
    economic_code = null,
    registration_number = null,
    postal_code = null,
    address = null,
    phone = null,
    email = null,
    roles = ['customer'], // 'customer' | 'supplier' | 'contractor' | 'partner'
    credit_limit = 0,
    currency = 'IRR',
    tax_status = 'taxable', // 'taxable' | 'exempt' | 'special'
    status = 'active',
    created_at = new Date().toISOString()
  }) {
    if (!id) throw new Error('Counterparty id is required.');
    if (!tenant_id) throw new Error('Counterparty tenant_id is required.');
    if (!organization_id) throw new Error('Counterparty organization_id is required.');
    if (!name || name.trim() === '') throw new Error('Counterparty name is required.');
    if (!['person', 'legal', 'government'].includes(type)) {
      throw new Error(`Invalid counterparty type: ${type}. Must be person, legal, or government.`);
    }

    this.id = id;
    this.tenant_id = tenant_id;
    this.organization_id = organization_id;
    this.type = type;
    this.name = name.trim();
    this.trade_name = trade_name;
    this.national_id = national_id;
    this.economic_code = economic_code;
    this.registration_number = registration_number;
    this.postal_code = postal_code;
    this.address = address;
    this.phone = phone;
    this.email = email;
    this.roles = Array.isArray(roles) ? roles : [roles];
    this.credit_limit = Number(credit_limit) || 0;
    this.currency = currency;
    this.tax_status = tax_status;
    this.status = status;
    this.created_at = created_at;
  }

  isEligibleForCredit(requestedAmount) {
    if (this.credit_limit <= 0) return false;
    return Number(requestedAmount) <= this.credit_limit;
  }

  hasRole(roleName) {
    return this.roles.includes(roleName);
  }
}

module.exports = { Counterparty };
