const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const indexHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

test("mission preset selector stays reachable in the HTML", () => {
  assert.match(indexHtml, /<select id="missionPreset" class="select" disabled title="One mission = one run">/);
  assert.doesNotMatch(indexHtml, /<select id="missionPreset"[^>]*\shidden\b/);
});

test("mutation lab copy is clearly framed as analyst review", () => {
  assert.match(appJs, /Analyst review board:/);
  assert.match(appJs, /Manual notes only — BlueLens does not score reverse-search results automatically\./);
  assert.doesNotMatch(appJs, /Mutation scoreboard:/);
});

test("batch OCR failures are surfaced instead of silently ignored", () => {
  assert.match(appJs, /it\.report\.ocr_error = e\?\.message \|\| "OCR failed";/);
  assert.match(appJs, /Batch OCR: \$\{pick\.length - failures\}\/\$\{pick\.length\} ok · \$\{failures\} failed/);
});
