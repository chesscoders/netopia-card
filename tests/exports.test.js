const { execFileSync } = require('child_process');
const path = require('path');
const { pathToFileURL } = require('url');
const netopiaCard = require('..');

const EXPORTS = [
  'CHARGEBACK_STATUSES',
  'captureRawBody',
  'collectBrowserInfo',
  'ErrorCode',
  'FINAL_FAILURE_STATUSES',
  'isPaymentError',
  'Netopia',
  'PaymentStatus',
  'rawTextBodyParser',
  'resolvePaymentAction',
  'SETTLED_PAYMENT_STATUSES',
  'verifyNotification',
];

describe('package exports', () => {
  test('exports exactly the documented surface', () => {
    expect(Object.keys(netopiaCard).sort()).toEqual([...EXPORTS].sort());
  });

  // A spread in module.exports is invisible to cjs-module-lexer, so an ESM consumer
  // importing those names by name fails at load with a SyntaxError.
  test('every export is reachable as a named ESM import', () => {
    const entry = pathToFileURL(path.join(__dirname, '..', 'index.js')).href;
    const script = `import { ${EXPORTS.join(', ')} } from '${entry}';
      const missing = Object.entries({ ${EXPORTS.join(', ')} })
        .filter(([, value]) => value === undefined)
        .map(([name]) => name);
      if (missing.length) {
        throw new Error('undefined named imports: ' + missing.join(', '));
      }`;

    expect(() =>
      execFileSync(process.execPath, ['--input-type=module', '-e', script], { stdio: 'pipe' })
    ).not.toThrow();
  });
});
