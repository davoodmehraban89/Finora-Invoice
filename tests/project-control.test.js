const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('durable recovery control files exist', () => {
  const required = [
    'AGENTS.md',
    'PROJECT_STATUS.md',
    'FINORA_CHATGPT_BOOTSTRAP_PROMPT.txt',
    'docs/ROADMAP_260_CONTROL.md',
    'docs/ACCEPTANCE_POLICY.md',
    'docs/DECISION_LOG.md',
    'docs/PROJECT_LOG.md',
    'docs/JULES_TASK_TEMPLATE.md',
    'docs/handoff/MASTER_RECOVERY_PROMPT.md',
    'docs/handoff/LATEST_HANDOFF.md',
    '.github/pull_request_template.md'
  ];
  for (const relative of required) {
    assert.ok(fs.existsSync(path.join(root, relative)), `missing ${relative}`);
  }
});

test('master roadmap integrity anchor matches repository file', () => {
  const bytes = fs.readFileSync(path.join(root, 'Finora_Master_Specification_Final_Chapters_001_260.docx'));
  const actual = crypto.createHash('sha256').update(bytes).digest('hex');
  assert.equal(actual, 'f445ec30b395319aece8bd7eb7d98e80bd4655eff6cc81b0253688b551bbc29b');
  assert.match(read('docs/ROADMAP_260_CONTROL.md'), new RegExp(actual));
});

test('product identity and current workstream cannot silently regress', () => {
  for (const relative of ['README.md', 'PROJECT_STATUS.md', 'AGENTS.md', 'docs/handoff/LATEST_HANDOFF.md']) {
    const content = read(relative);
    assert.match(content, /Comprehensive Enterprise ERP Software|نرم‌افزار جامع ERP سازمانی/, relative);
    assert.match(content, /صدور فاکتور/, relative);
  }
});

test('bootstrap prompt enforces evidence-first recovery', () => {
  const content = read('FINORA_CHATGPT_BOOTSTRAP_PROMPT.txt');
  for (const marker of [
    'davoodmehraban89/Finora-Invoice',
    'Finora_Master_Specification_Final_Chapters_001_260.docx',
    'Chapters 251, 259, and 260',
    'GitHub remote evidence is the source of truth',
    'Do not ask Davood to explain the project from the beginning'
  ]) assert.ok(content.includes(marker), `missing bootstrap rule: ${marker}`);
});

test('customer UI enum matches the Supabase database contract', () => {
  const migration = read('supabase/migrations/202608280001_invoice_phase.sql');
  assert.match(migration, /type in\('person','legal'\)/);
  for (const relative of ['customers.html', 'new-invoice.html']) {
    const content = read(relative);
    assert.ok(content.includes('value="person"'), `${relative} must persist person`);
    assert.ok(!content.includes('individual'), `${relative} contains incompatible customer type`);
  }
});

test('invoice tax context is versioned in UI, core and migration', () => {
  const form = read('new-invoice.html');
  const preview = read('invoice-preview.html');
  const migration = read('supabase/migrations/202608310001_invoice_tax_context.sql');
  const rules = read('assets/js/tax-rules.js');
  for (const token of ['invoiceType', 'vatMode', 'taxRuleVersion']) assert.match(form, new RegExp(token));
  assert.match(preview, /ذخیره PDF/);
  assert.match(preview, /چاپ با چاپگر/);
  for (const column of ['invoice_type', 'vat_mode', 'vat_rate', 'tax_year', 'tax_rule_version']) assert.match(migration, new RegExp(column));
  assert.match(rules, /IR-VAT-1405\.1/);
});

test('invoice-number editing is controlled by settings and the database', () => {
  const settings = read('settings.html');
  const form = read('new-invoice.html');
  const migration = read('supabase/migrations/202608310002_invoice_settings_numbering.sql');
  for (const token of ['invoiceNumberPolicy', 'invoicePrefix', 'defaultInvoiceType', 'defaultVatMode', 'defaultPaymentMethod', 'defaultOutputMode']) {
    assert.match(settings, new RegExp(token), `missing ${token}`);
  }
  assert.match(form, /id="invoiceNumber"/);
  assert.match(form, /settings\.invoiceNumberEditable/);
  assert.match(migration, /guard_invoice_number_update/);
  assert.match(migration, /unique|invoice_number_editable/);
  assert.match(migration, /raise exception 'Invoice number editing is locked/);
});

test('Cloudflare Worker is configured as an assets-only static deployment', () => {
  const config = JSON.parse(read('wrangler.jsonc'));
  assert.equal(config.name, 'finora-invoice');
  assert.equal(config.assets.directory, '.');
  const ignored = read('.assetsignore');
  for (const privatePath of ['docs', 'supabase', 'tests', 'AGENTS.md', 'PROJECT_STATUS.md']) {
    assert.match(ignored, new RegExp(`^${privatePath}$`, 'm'), `${privatePath} must not be public`);
  }
});

test('ordinary and official invoices use distinct compact A4 print contracts', () => {
  const preview = read('invoice-preview.html');
  const mobileCss = read('assets/css/mobile.css');
  for (const token of ['invoice-official', 'invoice-ordinary', 'صورتحساب رسمی فروش کالا و خدمات', 'فاکتور فروش', 'official-parties', 'ordinary-parties']) {
    assert.match(preview, new RegExp(token), `missing print contract ${token}`);
  }
  assert.match(mobileCss, /@media print/);
  assert.match(mobileCss, /grid-template-columns:repeat\(4,1fr\)!important/);
  assert.match(mobileCss, /@page\{size:A4 portrait;margin:6mm\}/);
  assert.match(mobileCss, /break-inside:avoid/);
});
