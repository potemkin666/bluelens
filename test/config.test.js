const test = require("node:test");
const assert = require("node:assert/strict");

const config = require("../bluelens-config.js");

test("shared config exports key runtime defaults", () => {
  assert.equal(config.server.port, 8787);
  assert.equal(config.server.waitJobs.defaultTimeoutMs, 25_000);
  assert.deepEqual(config.server.upload.hosts, ["uguu", "catbox", "litterbox", "0x0"]);
  assert.equal(config.app.ocr.fastPreprocessMaxDim, 1_200);
  assert.equal(config.app.dhash.batchClusterThreshold, 8);
  assert.equal(config.fx.funModeDefault, false);
  assert.ok(Array.isArray(config.help.defaults));
  assert.ok(config.help.defaults.some((row) => row.label === "Local server port"));
  assert.ok(config.help.defaults.some((row) => row.label === "Wait-job long poll"));
});
