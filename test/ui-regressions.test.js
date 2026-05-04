const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const indexHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const helpHtml = fs.readFileSync(path.join(__dirname, "..", "help.html"), "utf8");
const stylesCss = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
const waitHtml = fs.readFileSync(path.join(__dirname, "..", "wait.html"), "utf8");
const startCmd = fs.readFileSync(path.join(__dirname, "..", "bluelens-start.cmd"), "utf8");
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


test("sharing copy matches explicit upload consent", () => {
  assert.match(indexHtml, /Launch actions upload to a temporary public host only after you explicitly choose them\./);
  assert.match(indexHtml, /uploads happen only after you ask for launchpad links/i);
});


test("primary and secondary actions stay in a static order", () => {
  assert.ok(indexHtml.indexOf('id="missionRow"') < indexHtml.indexOf('id="manualRow"'));
  assert.doesNotMatch(appJs, /advBody\.prepend\(elements\.manualRow\)/);
  assert.doesNotMatch(appJs, /appendChild\(elements\.btnCopyReport\)/);
});

test("landing UI stays focused on image search", () => {
  assert.match(indexHtml, /Drop an image, inspect locally, then choose when to upload\./);
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

test("loading an image stays local until a launch action is chosen", () => {
  assert.doesNotMatch(appJs, /handleSearchAll\(\{ autoEnableShare: true, openLens: false \}\)/);
  assert.match(appJs, /window\.__osintActivateTab\?\.\("search"\);/);
  assert.match(appJs, /Local review ready\. Uploads start only when you choose a launch action\./);
});


test("command palette copy uses fixed UTF-8 text and row clicks run the clicked action", () => {
  assert.match(indexHtml, /placeholder="Type a command…"/);
  assert.match(indexHtml, />Enter • ↑\/↓ • Esc</);
  assert.match(appJs, /const chosen = action;/);
});


test("operator theme is calm by default and fun mode is explicit", () => {
  assert.match(indexHtml, /id="chkFunMode"/);
  assert.match(indexHtml, /id="chkOperatorMode"/);
  assert.match(appJs, /applyFunMode\(funMode, \{ persist: false \}\)/);
  assert.match(appJs, /applyOperatorMode\(operatorMode, \{ persist: false \}\)/);
  assert.match(stylesCss, /--scanline: 0;/);
  assert.match(stylesCss, /--chromatic: 0;/);
  assert.match(stylesCss, /body\.fun-mode \.bg-overlay/);
  assert.match(stylesCss, /body\.operator-mode \.bg-overlay/);
});

test("OCR UI uses manual models and weak script hints", () => {
  assert.match(indexHtml, />OCR model</);
  assert.match(indexHtml, /Weak script hint/);
  assert.match(indexHtml, /<option value="rus">Russian</);
  assert.match(indexHtml, /<option value="chi_sim">Chinese \(Simplified\)</);
  assert.match(appJs, /function detectScriptHint\(text\)/);
  assert.match(appJs, /Weak script hint: \$\{hint\.label\}/);
  assert.doesNotMatch(appJs, /elements\.ocrLang\.value\s*=\s*hint/);
});

test("OCR pivots are framed as manual follow-ups", () => {
  assert.match(indexHtml, />Manual pivots</);
  assert.match(appJs, /Manual pivots only — these are templated follow-ups from OCR hits/);
  assert.match(appJs, /Manual pivots \(\$\{targets\.length\}\)/);
});

test("metadata suspicion copy avoids faux-precise repost scoring", () => {
  assert.match(indexHtml, />Metadata suspicion</);
  assert.doesNotMatch(indexHtml, />Repost heuristic</);
  assert.match(appJs, /function computeMetadataSuspicionScore/);
  assert.match(appJs, /formatMetadataSuspicionBand/);
  assert.doesNotMatch(appJs, /elements\.repostScore\.textContent = `\$\{score\}\/100`/);
});

test("compare UI frames dHash as a heuristic with thumbnail diffing", () => {
  assert.match(indexHtml, /Perceptual thumbnail difference preview/);
  assert.match(indexHtml, />No thumbnail diff yet\./);
  assert.match(indexHtml, />Hamming \(0–64\)</);
  assert.match(appJs, /function renderCompareDiff\(baseImg, compareImg, size = 96\)/);
  assert.match(appJs, /Possible near-duplicate/);
  assert.match(appJs, /No near-duplicate signal from dHash alone/);
  assert.doesNotMatch(appJs, /Likely same image/);
  assert.doesNotMatch(appJs, /Very similar/);
});

test("host stats are framed as diagnostic raw counts, not mood badges", () => {
  assert.match(appJs, /Upload stats \(session-only diagnostic\):/);
  assert.match(appJs, /ok \$\{r\.ok\} · fail \$\{r\.fail\}/);
  assert.doesNotMatch(appJs, /const badge = fr >= 0\.4 \? "HOT"/);
});

test("reports export structured capture provenance and runtime metadata", () => {
  assert.match(appJs, /function normalizeCapturedAt\(exifObj\)/);
  assert.match(appJs, /Timezone not present in EXIF field/);
  assert.match(appJs, /schema_version: EXPORT_SCHEMA_VERSION/);
  assert.match(appJs, /app_version: APP_VERSION/);
  assert.match(appJs, /runtime_config_fingerprint/);
  assert.match(appJs, /ocr_language/);
  assert.match(appJs, /upload_host_metadata/);
});

test("wait tab uses backoff and exposes reopen guidance", () => {
  assert.match(waitHtml, /retryMs = Math\.min\(maxRetryMs, Math\.round\(retryMs \* backoffFactor\)\)/);
  assert.match(waitHtml, /Open main tab/);
  assert.match(waitHtml, /server restarted/i);
  assert.doesNotMatch(waitHtml, /title\.innerHTML/);
  assert.match(waitHtml, /strong\.textContent = nextLabel/);
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

test("onboarding and evidence-pack UI expose operator caveats and export path", () => {
  assert.match(indexHtml, /id="onboardingStrip"/);
  assert.match(indexHtml, /id="btnEvidencePack"/);
  assert.match(indexHtml, /id="btnRunDoctor"/);
  assert.match(indexHtml, /id="doctorOut"/);
  assert.match(indexHtml, /id="manualNotes"/);
  assert.match(indexHtml, /id="actionLogOut"/);
  assert.match(appJs, /function downloadEvidencePack\(\)/);
  assert.match(appJs, /function runDoctorChecks\(\)/);
  assert.match(indexHtml, /Operator workflow: 1\) load image locally/);
  assert.match(appJs, /Batch export omits failures/);
  assert.match(helpHtml, />Doctor</);
});

test("windows start script waits for ping before opening the browser", () => {
  assert.match(startCmd, /node server\.js/);
  assert.match(startCmd, /api\/ping/);
  assert.match(startCmd, /Invoke-WebRequest/);
  assert.ok(startCmd.indexOf("node server.js") < startCmd.lastIndexOf("start \"\" \"%BLUELENS_URL%\""));
});
