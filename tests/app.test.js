const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('fs');
const vm = require('node:vm');

test('test escape utility', () => {
  const context = {
    window: {
      addEventListener: () => {},
      FINORA_SUPABASE_CONFIG: {}
    },
    location: { search: '?demo=1', origin: 'http://localhost', replace: () => {} },
    localStorage: {
      getItem: () => null,
      setItem: () => {}
    },
    document: {
      readyState: 'complete',
      addEventListener: () => {},
      querySelector: () => null,
      body: {
        prepend: () => {},
        appendChild: () => {}
      },
      createElement: (tag) => {
        if (tag === 'div') {
          return {
            _text: '',
            set textContent(value) {
              this._text = value;
            },
            get innerHTML() {
              return String(this._text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            }
          };
        } else if (tag === 'button') {
          return {
            setAttribute: () => {},
            classList: { toggle: () => {} }
          };
        }
        return {};
      }
    },
    console: console,
    Date: Date,
    Math: Math,
    Number: Number,
    String: String,
    Object: Object,
    JSON: JSON,
    URLSearchParams: URLSearchParams,
    URL: URL,
    Intl: Intl,
    Error: Error
  };
  vm.createContext(context);

  const appJsContent = fs.readFileSync('assets/js/app.js', 'utf-8');
  vm.runInContext(appJsContent, context);

  const escape = context.window.Finora.escape;

  assert.equal(escape('<script>alert("xss")</script>'), '&lt;script&gt;alert("xss")&lt;/script&gt;');
  assert.equal(escape('<b>bold</b>'), '&lt;b&gt;bold&lt;/b&gt;');
  assert.equal(escape(null), '');
  assert.equal(escape(undefined), '');
  assert.equal(escape(123), '123');
  assert.equal(escape('test & string'), 'test &amp; string');
});
