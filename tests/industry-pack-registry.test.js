const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { IndustryPackRegistry } = require('../src/industry/industry-pack-registry');

describe('Industry Extension Packs Registry & Architecture (Chapters 181-230 & ADR-001)', () => {
  let registry;

  beforeEach(() => {
    registry = new IndustryPackRegistry();
  });

  it('Verifies complete registration of all 50 vertical industry packs (Chapters 181 to 230)', () => {
    const packs = registry.getAllPacks();
    assert.strictEqual(packs.length, 50, 'Must contain exactly 50 certified industry extension packs.');

    // Check boundary chapters
    const firstPack = registry.getPack('finora-pack-banking');
    assert.strictEqual(firstPack.chapter_number, 181);
    assert.strictEqual(firstPack.name_en, 'Banking & Financial Services');

    const lastPack = registry.getPack('finora-pack-cloud-composer');
    assert.strictEqual(lastPack.chapter_number, 230);
    assert.strictEqual(lastPack.name_en, 'Vertical Industry Cloud Orchestrator');
  });

  it('Retrieves Construction & Building Materials Pack (Chapter 189) with proper metadata', () => {
    const constPack = registry.getPack('finora-pack-construction');
    assert.ok(constPack);
    assert.strictEqual(constPack.chapter_number, 189);
    assert.ok(constPack.name_fa.includes('ساختمان'));
    assert.strictEqual(constPack.status, 'CERTIFIED');
  });

  it('Enforces multi-tenant pack activation and isolation', () => {
    // Enable Construction pack for Ara Beten
    registry.enablePackForTenant('ten_ara_beten', 'finora-pack-construction');
    // Enable Telecom pack for another tenant
    registry.enablePackForTenant('ten_telecom_org', 'finora-pack-telecom');

    assert.strictEqual(registry.isPackEnabled('ten_ara_beten', 'finora-pack-construction'), true);
    assert.strictEqual(registry.isPackEnabled('ten_ara_beten', 'finora-pack-telecom'), false);

    const araPacks = registry.getTenantPacks('ten_ara_beten');
    assert.strictEqual(araPacks.length, 1);
    assert.strictEqual(araPacks[0].pack_id, 'finora-pack-construction');
  });

  it('Allows dynamic registration of specialized custom industry extension manifests', () => {
    const custom = registry.registerPack({
      pack_id: 'finora-pack-concrete-precast',
      chapter_number: 189,
      name_fa: 'اکستنشن تخصصی قطعات پیش‌ساخته بتنی و سنگفرش',
      name_en: 'Precast Concrete & Kerbstone Specialized Extension',
      version: '1.2.0'
    });

    assert.strictEqual(custom.pack_id, 'finora-pack-concrete-precast');
    assert.ok(registry.getPack('finora-pack-concrete-precast'));
  });
});
