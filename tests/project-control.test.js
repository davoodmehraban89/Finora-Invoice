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
