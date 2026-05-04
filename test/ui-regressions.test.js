const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const indexHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const helpHtml = fs.readFileSync(path.join(__dirname, "..", "help.html"), "utf8");
const stylesCss = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
const setupTabsBlock = appJs.match(/function setupTabs\(\) \{[\s\S]*?\n\}/)?.[0] || "";

test("mission preset selector stays reachable in the HTML", () => {
  assert.match(indexHtml, /<select id="missionPreset" class="select" disabled title="One mission = one run">/);
  assert.doesNotMatch(indexHtml, /<select id="missionPreset"[^>]*\shidden\b/);
  assert.match(indexHtml, />Quick OCR</);
  assert.match(indexHtml, />Deep OCR</);
  assert.match(indexHtml, />Upload \+ Launchpad</);
});

test("help button points to the rendered help page", () => {
  assert.match(indexHtml, /href="\.\/help\.html"/);
  assert.doesNotMatch(indexHtml, /href="\.\/README\.md"/);
  assert.match(helpHtml, />BlueLens Help</);
  assert.match(helpHtml, />Operator defaults</);
});

test("search-all UI is framed as link preparation, not automatic querying", () => {
  assert.match(indexHtml, />\s*Prepare Engine Links\s*</);
  assert.match(appJs, /Preparing engine links…/);
  assert.match(appJs, /Prepare Engine Links/);
});


test("sharing copy matches the automatic upload flow", () => {
  assert.match(indexHtml, /Automatic launch uploads the image to generate a temporary public URL as soon as you choose a file\./);
  assert.doesNotMatch(indexHtml, /Enable one-click provider launcher/);
});


test("primary and secondary actions stay in a static order", () => {
  assert.ok(indexHtml.indexOf('id="missionRow"') < indexHtml.indexOf('id="manualRow"'));
  assert.doesNotMatch(appJs, /advBody\.prepend\(elements\.manualRow\)/);
  assert.doesNotMatch(appJs, /appendChild\(elements\.btnCopyReport\)/);
});

test("landing UI stays focused on image search", () => {
  assert.match(indexHtml, /Drop an image and get to reverse search fast\./);
  assert.match(indexHtml, /alt="BlueLens image search workflow demo"/);
  assert.match(indexHtml, /<div class="focus-demo">[\s\S]*?<img/);
  assert.doesNotMatch(indexHtml, /Local file signals/);
});

test("caseboard UI is removed from the landing workflow", () => {
  assert.doesNotMatch(indexHtml, /Caseboard/);
  assert.doesNotMatch(appJs, /caseboard:v1/);
  assert.doesNotMatch(appJs, /Save to Caseboard/);
});

test("search tab is always the first panel shown on load", () => {
  assert.match(setupTabsBlock, /activate\("search"\);/);
  assert.doesNotMatch(setupTabsBlock, /localStorage\.getItem\("ui:tab"\)/);
});

test("uploading an image auto-prepares search links", () => {
  assert.match(appJs, /handleSearchAll\(\{ autoEnableShare: true, openLens: false \}\)/);
  assert.match(appJs, /window\.__osintActivateTab\?\.\("search"\);/);
});


test("command palette copy uses fixed UTF-8 text and row clicks run the clicked action", () => {
  assert.match(indexHtml, /placeholder="Type a command…"/);
  assert.match(indexHtml, />Enter • ↑\/↓ • Esc</);
  assert.match(appJs, /const chosen = action;/);
});


test("operator theme is calm by default and fun mode is explicit", () => {
  assert.match(indexHtml, /id="chkFunMode"/);
  assert.match(appJs, /applyFunMode\(funMode, \{ persist: false \}\)/);
  assert.match(stylesCss, /--scanline: 0;/);
  assert.match(stylesCss, /--chromatic: 0;/);
  assert.match(stylesCss, /body\.fun-mode \.bg-overlay/);
});

test("mutation lab copy is clearly framed as analyst review", () => {
  assert.match(appJs, /Analyst review board:/);
  assert.match(appJs, /Manual notes only — BlueLens does not score reverse-search results automatically\./);
  assert.doesNotMatch(appJs, /Mutation scoreboard:/);
});

test("batch OCR failures are surfaced instead of silently ignored", () => {
  assert.match(appJs, /ocr_error\s*=\s*e\?\.message\s*\|\|\s*"OCR failed"/);
  assert.match(appJs, /Batch OCR: \$\{pick\.length - failures\}\/\$\{pick\.length\} ok · \$\{failures\} failed/);
});
