const assert = require('node:assert/strict');
const test = require('node:test');

// Mock browser environment required by app.js
global.window = {
  addEventListener: () => {},
  FINORA_SUPABASE_CONFIG: {}
};
global.location = { search: '' };
global.document = {
  readyState: 'complete',
  addEventListener: () => {},
  querySelector: () => null,
  body: { appendChild: () => {}, prepend: () => {} },
  createElement: () => ({ className: '', textContent: '', setAttribute: () => {} })
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

// Require app.js to populate window.Finora
require('../assets/js/app.js');
const { toDb, fromDb } = global.window.Finora;

test('toDb: correctly converts camelCase keys to snake_case', () => {
  const input = { myKey: 1, anotherKeyName: 2, simple: 3 };
  const expected = { my_key: 1, another_key_name: 2, simple: 3 };
  assert.deepEqual(toDb(input), expected);
});

test('toDb: filters out undefined values', () => {
  const input = { myKey: 1, undefKey: undefined, anotherKey: 2 };
  const expected = { my_key: 1, another_key: 2 };
  assert.deepEqual(toDb(input), expected);
});

test('toDb: retains null, false, and 0 values', () => {
  const input = { myNull: null, myFalse: false, myZero: 0, myEmpty: '' };
  const expected = { my_null: null, my_false: false, my_zero: 0, my_empty: '' };
  assert.deepEqual(toDb(input), expected);
});

test('fromDb: returns null for falsy inputs', () => {
  assert.equal(fromDb(null), null);
  assert.equal(fromDb(undefined), null);
});

test('fromDb: correctly converts snake_case keys to camelCase', () => {
  const input = { my_key: 1, another_key_name: 2, simple: 3 };
  const expected = { myKey: 1, anotherKeyName: 2, simple: 3 };
  assert.deepEqual(fromDb(input), expected);
});

test('fromDb: removes userId key', () => {
  const input = { my_key: 1, user_id: '123' };
  // user_id becomes userId, which is then deleted
  const expected = { myKey: 1 };
  assert.deepEqual(fromDb(input), expected);
});
