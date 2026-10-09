const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function loadPicker(available) {
  let imports = 0;
  let received;
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync("src/utils/document-picker.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require(name) {
    if (name === "expo") return { requireOptionalNativeModule: () => available ? {} : null };
    if (name === "expo-document-picker") {
      imports++;
      assert.ok(available, "Unavailable native module must never be imported");
      return { getDocumentAsync: async (options) => { received = options; return { canceled: true, assets: null }; } };
    }
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return { pick: exports.pickDocument, imports: () => imports, received: () => received };
}
test("old native builds load routes safely and show an actionable upload error", () => {
  const picker = loadPicker(false);
  assert.equal(picker.imports(), 0);
  assert.throws(() => picker.pick({ type: "application/pdf" }), /Install the latest CarePlus APK/);
  assert.equal(picker.imports(), 0);
});
test("supported builds load the picker only when pressed and preserve upload options", async () => {
  const picker = loadPicker(true);
  assert.equal(picker.imports(), 0);
  const options = { type: ["image/jpeg", "application/pdf"], copyToCacheDirectory: true };
  assert.equal((await picker.pick(options)).canceled, true);
  assert.equal(picker.imports(), 1);
  assert.equal(picker.received(), options);
});
