// Native bridge is mocked; no patient files, credentials or live API calls are used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports = {}, globals = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    module, exports: module.exports, Error, Blob, FormData, AbortController, setTimeout, clearTimeout,
    process: { env: { EXPO_PUBLIC_API_URL: 'http://test.invalid/api' } }, __DEV__: false,
    require(name) { assert.ok(name in imports, `Unexpected import: ${name}`); return imports[name]; }, ...globals,
  }, { filename: file });
  return module.exports;
}
async function main() {
  let exists = true, size = 1234, status = 201, failure = null, calls = 0, releases = 0;
  const controller = new AbortController();
  const url = 'http://test.invalid/api/patient/payments/slips/doctor-test';
  const headers = { Authorization: 'Bearer fake-token' };
  const contentUri = 'content://com.android.providers.downloads.documents/document/123';
  let cancelled = false;
  const picker = load('src/features/patient/payments/pick-payment-slip.android.ts', {
    'expo-file-system': { File: { pickFileAsync: async (options) => {
      assert.equal(options.multipleFiles, false);
      assert.equal(Array.from(options.mimeTypes).join(','), 'image/jpeg,image/png,application/pdf');
      return cancelled ? { canceled: true, result: null } : {
        canceled: false, result: { uri: contentUri, name: 'receipt.png', type: 'image/png', size: 1234 },
      };
    } } },
  });
  const selection = await picker.pickPaymentSlip();
  assert.equal(selection.canceled, false);
  assert.equal(selection.assets[0].uri, contentUri);
  assert.equal(selection.assets[0].mimeType, 'image/png');
  cancelled = true;
  assert.equal((await picker.pickPaymentSlip()).assets, null);
  class NativeFile {
    constructor(uri) { assert.ok(uri === contentUri || /^file:\/\/\/cache\/receipt with spaces\./.test(uri)); }
    get exists() { return exists; }
    get size() { return size; }
    get type() { return 'image/png'; }
    createUploadTask(target, options) {
      calls++;
      assert.equal(target, url);
      assert.equal(options.httpMethod, 'POST');
      assert.equal(options.fieldName, 'slip');
      assert.equal(options.uploadType, 1);
      assert.equal(options.headers.Authorization, headers.Authorization);
      assert.equal(options.headers['Content-Type'], undefined);
      assert.equal(options.signal, controller.signal);
      assert.ok(['image/jpeg', 'image/png', 'application/pdf'].includes(options.mimeType));
      return {
        async uploadAsync() {
          if (failure) throw failure;
          return { status, body: JSON.stringify(status === 201 ? { id: 'slip-test' } : { message: 'Invalid receipt' }) };
        },
        release() { releases++; },
      };
    }
  }
  const native = load('src/features/patient/payments/upload-payment-slip.ts', {
    'expo-file-system': { File: NativeFile, UploadType: { MULTIPART: 1 } },
  });
  const asset = { uri: 'file:///cache/receipt with spaces.png', mimeType: 'image/png', name: 'receipt.png' };
  const options = { headers, signal: controller.signal };
  for (const mimeType of ['image/jpeg', 'image/png', 'application/pdf']) {
    const result = await native.uploadPaymentSlip(url, { ...asset, mimeType }, options);
    assert.equal(result.status, 201); assert.equal(result.ok, true); assert.equal((await result.json()).id, 'slip-test');
  }
  const pickedUpload = await native.uploadPaymentSlip(url, selection.assets[0], options);
  assert.equal(pickedUpload.status, 201);
  status = 400;
  const rejected = await native.uploadPaymentSlip(url, asset, options);
  assert.equal(rejected.ok, false); assert.equal((await rejected.json()).message, 'Invalid receipt');
  failure = new Error('network failure');
  await assert.rejects(native.uploadPaymentSlip(url, asset, options), /network failure/);
  assert.equal(calls, releases);
  exists = false;
  await assert.rejects(native.uploadPaymentSlip(url, asset, options), /UPLOAD_FILE_UNAVAILABLE/);
  exists = true; size = 6 * 1024 * 1024;
  await assert.rejects(native.uploadPaymentSlip(url, asset, options), /UPLOAD_TOO_LARGE/);
  assert.equal(calls, 6);

  const web = load('src/features/patient/payments/upload-payment-slip.web.ts', {}, {
    fetch: async (target, init) => {
      assert.equal(target, url); assert.equal(init.headers.Authorization, headers.Authorization);
      assert.equal(init.body.get('slip').name, 'receipt.png');
      assert.equal(await init.body.get('slip').text(), 'test receipt');
      return new Response(JSON.stringify({ id: 'web-slip' }), { status: 201 });
    },
  });
  const file = new File(['test receipt'], 'receipt.png', { type: 'image/png' });
  assert.equal((await web.uploadPaymentSlip(url, { ...asset, file }, options)).status, 201);
  await assert.rejects(web.uploadPaymentSlip(url, asset, options), /UPLOAD_FILE_UNAVAILABLE/);

  let uploadStatus = 201, uploadError = null, cleared = false, replaced;
  const { api } = load('src/features/patient/shared/api.ts', {
    'expo-router': { router: { replace: (value) => { replaced = value; } } },
    'expo-constants': { default: { expoConfig: {} } },
    'react-native': { Platform: { OS: 'android' } },
    '@/utils/storage': { Storage: { getUserToken: async () => 'fake-token', clearSession: async () => { cleared = true; } } },
    '../payments/upload-payment-slip': { uploadPaymentSlip: async (target, chosen, init) => {
      assert.equal(target, url); assert.equal(chosen, asset);
      assert.equal(init.headers.Authorization, headers.Authorization);
      if (uploadError) throw uploadError;
      return { status: uploadStatus, ok: uploadStatus === 201, json: async () => ({ id: 'slip-test', message: 'Server validation failed' }) };
    } },
  });
  assert.equal((await api.uploadPaymentSlip('doctor-test', asset)).id, 'slip-test');
  uploadStatus = 400;
  await assert.rejects(api.uploadPaymentSlip('doctor-test', asset), /Server validation failed/);
  uploadStatus = 401;
  await assert.rejects(api.uploadPaymentSlip('doctor-test', asset), /Server validation failed/);
  assert.ok(cleared); assert.equal(replaced, '/login');
  uploadError = new Error('network connection failed');
  await assert.rejects(api.uploadPaymentSlip('doctor-test', asset), /UPLOAD_NETWORK/);
  uploadError = new Error('native task failed');
  await assert.rejects(api.uploadPaymentSlip('doctor-test', asset), /UPLOAD_NATIVE/);
  uploadError = new Error('UPLOAD_FILE_UNAVAILABLE');
  await assert.rejects(api.uploadPaymentSlip('doctor-test', asset), /Please upload it again/);
  console.log('PASS: native upload configuration, JPG/PNG/PDF, file validation, resource cleanup, web upload, API auth/status handling and diagnostic errors.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
