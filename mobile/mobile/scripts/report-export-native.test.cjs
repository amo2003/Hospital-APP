// Tests native orchestration with mocked Expo APIs; does not claim device testing.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('src/features/nurse/reports/exportReport.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const report = { from: '2026-10-01', to: '2026-10-09' };
const bytes = Buffer.from('%PDF-1.7\nsample').toString('base64');
function setup({ os = 'android', granted = true, failWrite = false, missingBytes = false } = {}) {
  const calls = [];
  const modules = {
    'react-native': { Platform: { OS: os } },
    './reportDocument': { reportDocument: () => '<html><body>Report</body></html>' },
    'expo-print': { printToFileAsync: async options => { calls.push(['generate', options]); return { base64: missingBytes ? undefined : bytes, uri: 'file:///outside-expo-scope/report.pdf' }; } },
    'expo-file-system/legacy': {
      cacheDirectory: 'file:///expo-project-cache/', EncodingType: { Base64: 'base64' },
      StorageAccessFramework: {
        requestDirectoryPermissionsAsync: async () => ({ granted, directoryUri: 'content://selected-folder' }),
        createFileAsync: async (...args) => { calls.push(['create', ...args]); return 'content://selected-folder/report.pdf'; },
      },
      writeAsStringAsync: async (...args) => { calls.push(['write', ...args]); if (failWrite) throw new Error('Disk full'); },
      deleteAsync: async (...args) => { calls.push(['delete', ...args]); },
    },
    'expo-sharing': {
      isAvailableAsync: async () => true,
      shareAsync: async (...args) => calls.push(['share', ...args]),
    },
  };
  const context = { exports: {}, require: name => { if (!modules[name]) throw Error(name); return modules[name]; } };
  vm.runInNewContext(source, context);
  return { calls, run: () => context.exports.exportReport(report, value => value, 'en') };
}
test('Android saves PDF bytes directly to permitted folder, without sharing or reading Print URI', async () => {
  const { calls, run } = setup(); assert.equal(await run(), true);
  assert.equal(calls[0][1].base64, true);
  assert.equal(calls.find(c => c[0] === 'create')[3], 'application/pdf');
  const write = calls.find(c => c[0] === 'write');
  assert.equal(write[1], 'content://selected-folder/report.pdf');
  assert.equal(Buffer.from(write[2], 'base64').subarray(0, 5).toString(), '%PDF-');
  assert.ok(!calls.some(c => c[0] === 'share'));
});
test('cancelling folder selection does not create a file or claim success', async () => {
  const { calls, run } = setup({ granted: false }); assert.equal(await run(), false); assert.equal(calls.length, 0);
});
test('failed save removes only its newly created partial file and reports the error', async () => {
  const { calls, run } = setup({ failWrite: true }); await assert.rejects(run, /Disk full/);
  assert.equal(calls.find(c => c[0] === 'delete')[1], 'content://selected-folder/report.pdf');
});
test('missing PDF bytes does not create an empty PDF', async () => {
  const { calls, run } = setup({ missingBytes: true }); await assert.rejects(run, /Could not generate/);
  assert.ok(!calls.some(c => c[0] === 'create'));
});
test('iOS shares only the re-created file within the current project cache', async () => {
  const { calls, run } = setup({ os: 'ios' }); assert.equal(await run(), false);
  const shared = calls.find(c => c[0] === 'share')[1];
  assert.ok(shared.startsWith('file:///expo-project-cache/'));
  assert.equal(calls.find(c => c[0] === 'write')[1], shared);
  assert.equal(calls.find(c => c[0] === 'delete')[1], shared);
});
