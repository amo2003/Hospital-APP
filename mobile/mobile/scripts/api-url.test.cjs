/* global __dirname */
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const moduleExports = {};
const source = fs.readFileSync(path.join(__dirname, '../src/utils/resolve-api-url.ts'), 'utf8');
new Function('exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(moduleExports);
const { resolveApiUrl } = moduleExports;

test('auto follows different Wi-Fi and hotspot Metro hosts', () => {
  for (const host of ['10.134.150.10', '172.25.135.10', '192.168.43.15']) {
    assert.equal(resolveApiUrl({ configured: 'auto', development: true, metroHost: `${host}:8081` }), `http://${host}:4000/api`);
  }
});
test('old local development configuration follows new host and preserves API port/path', () => {
  assert.equal(resolveApiUrl({ configured: 'http://10.58.252.10:4001/api/', development: true, metroHost: '172.25.135.10:8081' }), 'http://172.25.135.10:4001/api');
});
test('browser host takes priority over stale Metro address', () => {
  assert.equal(resolveApiUrl({ configured: 'auto', development: true, metroHost: '10.58.252.10:8081', browserHost: 'localhost' }), 'http://localhost:4000/api');
});
test('hosted and release APIs are never rewritten', () => {
  const remote = 'https://careplus.example/api';
  assert.equal(resolveApiUrl({ configured: remote, development: true, metroHost: '172.25.135.10:8081' }), remote);
  const local = 'http://10.58.252.10:4000/api';
  assert.equal(resolveApiUrl({ configured: local, development: false, metroHost: '172.25.135.10:8081' }), local);
  assert.equal(resolveApiUrl({ configured: 'auto', development: false }), undefined);
});
test('missing hosts and Expo tunnels do not become invalid backend URLs', () => {
  assert.equal(resolveApiUrl({ configured: 'auto', development: true }), undefined);
  assert.equal(resolveApiUrl({ configured: 'auto', development: true, metroHost: 'test.exp.direct:80' }), undefined);
});
