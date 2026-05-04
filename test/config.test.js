const test = require("node:test");
const assert = require("node:assert/strict");

const config = require("../bluelens-config.js");

test("shared config exports key runtime defaults", () => {
  assert.equal(config.meta.appVersion, "2026.05.04");
  assert.equal(config.meta.exportSchemaVersion, "bluelens-report-v3");
  assert.equal(config.server.port, 8787);
  assert.equal(config.server.waitJobs.defaultTimeoutMs, 25_000);
  assert.deepEqual(config.server.upload.hosts, ["uguu", "catbox", "litterbox", "0x0"]);
  assert.equal(config.app.ocr.fastPreprocessMaxDim, 1_200);
  assert.equal(config.app.ocr.defaultLanguage, "eng");
  assert.ok(config.app.ocr.languages.some((row) => row.value === "rus"));
  assert.ok(config.app.ocr.languages.some((row) => row.value === "chi_sim"));
  assert.equal(config.app.waitPage.initialRetryMs, 350);
  assert.equal(config.app.dhash.batchClusterThreshold, 8);
  assert.equal(config.fx.funModeDefault, false);
  assert.ok(Array.isArray(config.help.defaults));
  assert.ok(config.help.defaults.some((row) => row.label === "Local server port"));
  assert.ok(config.help.defaults.some((row) => row.label === "Wait-job long poll"));
});
