const assert = require('node:assert/strict');
const test = require('node:test');

// Mock browser APIs required by app.js
global.window = {
  addEventListener: () => {}
};
global.location = { search: '', replace: () => {} };
global.document = {
  readyState: 'complete',
  createElement: () => ({ setAttribute: () => {}, querySelectorAll: () => [], classList: { toggle: () => {}, remove: () => {} } }),
  body: { appendChild: () => {}, prepend: () => {} },
  querySelector: () => null,
  addEventListener: () => {},
  querySelectorAll: () => []
};
global.URLSearchParams = class { get() { return null; } };
global.localStorage = { getItem: () => null, setItem: () => {} };

// Require the file to test
require('../assets/js/app.js');

test('money formatting correctly formats numbers into Rial', () => {
  const money = window.Finora.money;

  // Happy paths
  assert.equal(money(1000), '۱٬۰۰۰ ریال');
  assert.equal(money(0), '۰ ریال');
  assert.equal(money(-500), '‎−۵۰۰ ریال');

  // Type coercion (strings)
  assert.equal(money("1000"), '۱٬۰۰۰ ریال');
  assert.equal(money("1234.56"), '۱٬۲۳۵ ریال'); // Should round correctly

  // Edge cases and error conditions
  assert.equal(money(null), '۰ ریال');
  assert.equal(money(undefined), '۰ ریال');
  assert.equal(money("invalid"), '۰ ریال');
  assert.equal(money(NaN), '۰ ریال');
});
