const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const appJsPath = path.join(__dirname, '../assets/js/app.js');
const appJs = fs.readFileSync(appJsPath, 'utf-8');

test('escape utility', () => {
  const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, { runScripts: "dangerously" });

  // Set up necessary globals in JSDOM before running the script
  dom.window.localStorage = { getItem: () => null, setItem: () => {} };

  dom.window.eval(appJs);

  const escape = dom.window.Finora.escape;

  // Test happy path and HTML escaping
  assert.equal(escape('<script>alert("xss")</script>'), '&lt;script&gt;alert("xss")&lt;/script&gt;');
  assert.equal(escape('hello & world'), 'hello &amp; world');

  // Test edge cases
  assert.equal(escape(null), '');
  assert.equal(escape(undefined), '');

  // Test numbers
  assert.equal(escape(123), '123');
  assert.equal(escape(0), '0');
});
