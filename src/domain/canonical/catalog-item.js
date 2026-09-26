/**
 * Finora Canonical Domain Model: Catalog Item (Product / Service)
 * Governed by Chapters 011, 012, 022, 038, 055, 069, 144, 252.
 */

class CatalogItem {
  constructor({
    id,
    tenant_id,
    organization_id,
    code,
    name,
    description = '',
    type, // 'goods' | 'service' | 'raw_material' | 'fixed_asset'
    unit, // 'EA' | 'KG' | 'M' | 'HOUR' | etc.
    tax_item_identifier = null, // e.g., Iranian Moadian commodity ID (شناسه کالا/خدمت)
    base_sale_price = 0,
    base_purchase_price = 0,
    currency = 'IRR',
    is_taxable = true,
    default_tax_rate = null, // Resolved dynamically from TaxRuleEngine
    status = 'active',
    created_at = new Date().toISOString()
  }) {
    if (!id) throw new Error('CatalogItem id is required.');
    if (!tenant_id) throw new Error('CatalogItem tenant_id is required.');
    if (!organization_id) throw new Error('CatalogItem organization_id is required.');
    if (!code) throw new Error('CatalogItem code is required.');
    if (!name || name.trim() === '') throw new Error('CatalogItem name is required.');
    if (!['goods', 'service', 'raw_material', 'fixed_asset'].includes(type)) {
      throw new Error(`Invalid item type: ${type}`);
    }

    this.id = id;
    this.tenant_id = tenant_id;
    this.organization_id = organization_id;
    this.code = code;
    this.name = name.trim();
    this.description = description;
    this.type = type;
    this.unit = unit || 'EA';
    this.tax_item_identifier = tax_item_identifier;
    this.base_sale_price = Number(base_sale_price) || 0;
    this.base_purchase_price = Number(base_purchase_price) || 0;
    this.currency = currency;
    this.is_taxable = Boolean(is_taxable);
    this.default_tax_rate = default_tax_rate;
    this.status = status;
    this.created_at = created_at;
  }

  isInventoryTracked() {
    return ['goods', 'raw_material'].includes(this.type);
  }
}

module.exports = { CatalogItem };
