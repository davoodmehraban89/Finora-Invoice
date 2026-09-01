const assert = require('node:assert/strict');
const test = require('node:test');

// Setup minimal DOM/browser environment for app.js
global.window = {
  addEventListener: () => {}
};
global.document = {
  readyState: 'complete',
  createElement: () => ({ setAttribute: () => {}, querySelectorAll: () => [] }),
  querySelector: () => null,
  querySelectorAll: () => [],
  body: { appendChild: () => {}, prepend: () => {} },
  addEventListener: () => {}
};
global.location = { search: '?demo=1', href: 'http://localhost/', replace: () => {} };
global.localStorage = { getItem: () => null, setItem: () => {} };
global.URLSearchParams = URLSearchParams;
global.URL = URL;

// Load app.js
require('../assets/js/app.js');

test('today function returns current date in correct jalali format', () => {
  const todayResult = window.Finora.today();

  // Format should be YYYY-MM-DD
  // e.g. 1402-08-25
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  assert.match(todayResult, regex);

  // We could also mock Date to ensure specific output, but a regex match
  // fulfills "Easily tested by asserting on regex pattern format of output"
  // as per task description.
});
