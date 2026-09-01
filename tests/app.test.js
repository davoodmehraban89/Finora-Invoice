const test = require('node:test');
const assert = require('node:assert/strict');

// Mock DOM environment for app.js
global.window = {
  addEventListener: () => {},
  FINORA_SUPABASE_CONFIG: {}
};
global.location = { search: '' };
global.document = {
  readyState: 'complete',
  createElement: () => ({}),
  body: { prepend: () => {}, appendChild: () => {} },
  querySelector: () => null,
};

// Load app.js which populates window.Finora
require('../assets/js/app.js');
const { fromDb, toDb } = window.Finora;

test('fromDb handles null/undefined input correctly', () => {
  assert.equal(fromDb(null), null);
  assert.equal(fromDb(undefined), null);
});

test('fromDb converts snake_case keys to camelCase keys', () => {
  const input = {
    first_name: 'John',
    last_name: 'Doe',
    is_active: true,
    age: 30
  };
  const expected = {
    firstName: 'John',
    lastName: 'Doe',
    isActive: true,
    age: 30
  };
  assert.deepEqual(fromDb(input), expected);
});

test('fromDb removes userId property', () => {
  const input = {
    user_id: '123-abc',
    name: 'Test Project'
  };
  const expected = {
    name: 'Test Project'
  };
  // user_id converts to userId, and then it is deleted
  assert.deepEqual(fromDb(input), expected);
});

test('fromDb preserves value types correctly', () => {
  const date = new Date();
  const input = {
    str_val: 'string',
    num_val: 42,
    bool_val: false,
    obj_val: { nested: true },
    arr_val: [1, 2, 3],
    date_val: date
  };
  const expected = {
    strVal: 'string',
    numVal: 42,
    boolVal: false,
    objVal: { nested: true },
    arrVal: [1, 2, 3],
    dateVal: date
  };
  assert.deepEqual(fromDb(input), expected);
});

test('toDb converts camelCase keys to snake_case keys', () => {
  const input = {
    firstName: 'Jane',
    lastName: 'Smith',
    isActive: false,
    age: 25
  };
  const expected = {
    first_name: 'Jane',
    last_name: 'Smith',
    is_active: false,
    age: 25
  };
  assert.deepEqual(toDb(input), expected);
});

test('toDb filters out undefined values but keeps nulls and falsy values', () => {
  const input = {
    validString: 'test',
    emptyString: '',
    zeroNum: 0,
    nullVal: null,
    falseVal: false,
    undefinedVal: undefined,
    anotherUndefined: undefined
  };
  const expected = {
    valid_string: 'test',
    empty_string: '',
    zero_num: 0,
    null_val: null,
    false_val: false
  };
  assert.deepEqual(toDb(input), expected);
});
