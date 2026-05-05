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
const desktopIconPs1 = fs.readFileSync(path.join(__dirname, "..", "create-desktop-icon.ps1"), "utf8");
const launchpadCoreJs = fs.readFileSync(path.join(__dirname, "..", "launchpad-core.js"), "utf8");
const ocrEntitiesUiJs = fs.readFileSync(path.join(__dirname, "..", "ocr-entities-ui.js"), "utf8");
const bluelensHelpersJs = fs.readFileSync(path.join(__dirname, "..", "bluelens-helpers.js"), "utf8");
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
const readmeMd = fs.readFileSync(path.join(__dirname, "..", "README.md"), "utf8");
const faviconSvgPath = path.join(__dirname, "..", "favicon.svg");
const desktopIcoPath = path.join(__dirname, "..", "bluelens.ico");
const oceanBgPath = path.join(__dirname, "..", "assets", "ocean-bg.jpg");
const setupTabsBlock = appJs.match(/function setupTabs\(\) \{[\s\S]*?\n\}/)?.[0] || "";

test("mission preset selector stays reachable in the HTML", () => {
  assert.match(indexHtml, /<select id="missionPreset" class="select" disabled title="One mission = one run">/);
  assert.doesNotMatch(indexHtml, /<select id="missionPreset"[^>]*\shidden\b/);
  assert.match(indexHtml, />Quick OCR</);
  assert.match(indexHtml, />Deep OCR</);
  assert.match(indexHtml, />Document Image</);
  assert.match(indexHtml, />Search Query Generator</);
  assert.match(indexHtml, />Upload \+ Launchpad</);
  assert.match(indexHtml, />Handle Recon</);
  assert.match(indexHtml, />Domain Recon</);
  assert.match(indexHtml, />Metadata Pass</);
  assert.match(indexHtml, />Cross-Engine Swarm</);
});

test("help button points to the rendered help page", () => {
  assert.match(indexHtml, /href="\.\/help\.html"/);
  assert.doesNotMatch(indexHtml, /href="\.\/README\.md"/);
  assert.match(helpHtml, />BlueLens Help</);
  assert.match(helpHtml, />Operator defaults</);
});

test("package startup contract declares Node 18+ and a server start script", () => {
  assert.equal(packageJson.scripts.start, "node server.js");
  assert.equal(packageJson.engines.node, ">=18");
  assert.match(readmeMd, /Node\.js 18 or newer/);
  assert.match(readmeMd, /npm start/);
});

test("search-all UI is framed as link preparation, not automatic querying", () => {
  assert.match(indexHtml, /id="btnSearchAll"[\s\S]*class="btn btn-search-cta"/);
  assert.match(indexHtml, />\s*SEARCH\s*</);
  assert.match(appJs, /Uploading \+ preparing links…/);
  assert.match(appJs, /Upload \+ Prepare Links/);
  assert.match(appJs, /Paste titles, snippets, and URLs back into Result Intake/);
  assert.match(appJs, /Prepared \$\{ENGINE_ORDER\.length\} engine targets from one upload/);
});


test("sharing copy matches explicit upload consent", () => {
  assert.match(indexHtml, /Uploads start only when you choose search\./);
  assert.match(appJs, /Local review ready\. Uploads start only when you choose a launch action\./);
});


test("primary and secondary actions stay in a static order", () => {
  assert.ok(indexHtml.indexOf('id="missionRow"') < indexHtml.indexOf('id="manualRow"'));
  assert.doesNotMatch(appJs, /advBody\.prepend\(elements\.manualRow\)/);
  assert.doesNotMatch(appJs, /appendChild\(elements\.btnCopyReport\)/);
});

test("landing UI stays focused on image search", () => {
  assert.doesNotMatch(indexHtml, /Inspect images locally, extract context, and launch reverse-search providers\./);
  assert.doesNotMatch(indexHtml, /Know what runs before you click it\./);
  assert.doesNotMatch(indexHtml, /Load image<\/strong> — BlueLens inspects it locally first\./);
  assert.doesNotMatch(indexHtml, /Run local tools<\/strong> — hashes, EXIF, OCR, and compare stay on this device\./);
  assert.doesNotMatch(indexHtml, /Search-first workflow/);
  assert.doesNotMatch(indexHtml, /Local file signals/);
});

test("landing UI no longer renders the promo block", () => {
  assert.doesNotMatch(indexHtml, /class="focus-shell"/);
});

test("caseboard UI is removed from the landing workflow", () => {
  assert.doesNotMatch(indexHtml, /Caseboard/);
  assert.doesNotMatch(appJs, /caseboard:v1/);
  assert.doesNotMatch(appJs, /Save to Caseboard/);
});

test("source reliability state no longer uses stale caseInfo naming", () => {
  assert.match(appJs, /sourceInfo:/);
  assert.match(appJs, /source_reliability:\s*\{\s*\.\.\.state\.sourceInfo,/);
  assert.match(appJs, /review_entries: Array\.isArray\(state\.sourceReviewLog\)/);
  assert.doesNotMatch(appJs, /caseInfo/);
});

test("landing background layers the provided artwork over the squid fallback", () => {
  assert.match(stylesCss, /github\.com\/user-attachments\/assets\/e061975f-68eb-4d6f-b6a9-bff2785854ed/);
  assert.match(stylesCss, /assets\/squid-bg\.jpg/);
  assert.doesNotMatch(stylesCss, /assets\/ocean-bg\.jpg/);
  assert.equal(fs.existsSync(oceanBgPath), false);
});

test("brand identity is carried through favicon, wait page, and shortcut icon", () => {
  assert.match(indexHtml, /rel="icon" type="image\/svg\+xml" href="\.\/favicon\.svg"/);
  assert.match(helpHtml, /rel="icon" type="image\/svg\+xml" href="\.\/favicon\.svg"/);
  assert.match(waitHtml, /rel="icon" type="image\/svg\+xml" href="\.\/favicon\.svg"/);
  assert.match(indexHtml, /<img class="brand-mark" src="\.\/favicon\.svg"/);
  assert.match(waitHtml, /<img class="mark" src="\.\/favicon\.svg"/);
  assert.match(stylesCss, /background: center \/ contain no-repeat url\("\.\/favicon\.svg"\)/);
  assert.match(desktopIconPs1, /bluelens\.ico/);
  assert.match(desktopIconPs1, /IconLocation/);
  assert.equal(fs.existsSync(faviconSvgPath), true);
  assert.equal(fs.existsSync(desktopIcoPath), true);
});

test("search tab is always the first panel shown on load", () => {
  assert.match(setupTabsBlock, /activate\("search"\);/);
  assert.doesNotMatch(setupTabsBlock, /localStorage\.getItem\("ui:tab"\)/);
});

test("investigation surface exposes graph timeline sonar and swarm views", () => {
  assert.match(indexHtml, /data-tab="investigation"/);
  assert.match(indexHtml, /data-investigation-view="graph"/);
  assert.match(indexHtml, /data-investigation-view="timeline"/);
  assert.match(indexHtml, /data-investigation-view="sonar"/);
  assert.match(indexHtml, /data-investigation-view="swarm"/);
  assert.match(indexHtml, /id="investigationGraph"/);
  assert.match(indexHtml, /id="investigationTimeline"/);
  assert.match(indexHtml, /id="investigationSonarOut"/);
  assert.match(indexHtml, /id="investigationSwarmOut"/);
  assert.match(appJs, /function buildInvestigationModel\(/);
  assert.match(appJs, /function renderInvestigationSurface\(/);
});

test("loading an image stays local until a launch action is chosen", () => {
  assert.doesNotMatch(appJs, /handleSearchAll\(\{ autoEnableShare: true, openLens: false \}\)/);
  assert.match(appJs, /window\.__osintActivateTab\?\.\("search"\);/);
  assert.match(appJs, /Local review ready\. Uploads start only when you choose a launch action\./);
});

test("preview exposes crop-and-search controls for selected regions", () => {
  assert.match(indexHtml, /id="previewStage"/);
  assert.match(indexHtml, /id="previewCropBox"/);
  assert.match(indexHtml, /id="btnSearchCrop"/);
  assert.match(indexHtml, />\s*Search Crop\s*</);
  assert.match(indexHtml, /id="btnClearCrop"/);
  assert.match(indexHtml, /Drag a box around a face, logo, object, tattoo, sign, vehicle, building, product, artwork, or text area/);
  assert.match(stylesCss, /\.preview-crop-box/);
  assert.match(stylesCss, /\.preview\.crop-ready/);
  assert.match(appJs, /function setupCropTool\(/);
  assert.match(appJs, /function ensureCropSearchFile\(/);
  assert.match(appJs, /SEARCH now uses only the selected region/);
  assert.match(appJs, /return isCropActive\(\) \? "crop" : state\.shareSafe \? "clean" : "original"/);
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
  assert.match(ocrEntitiesUiJs, /const detectScriptHint = \(\{ text, scriptHints = \[\] \}\) =>/);
  assert.match(ocrEntitiesUiJs, /Weak script hint: \$\{hint\.label\}/);
  assert.doesNotMatch(appJs, /elements\.ocrLang\.value\s*=\s*hint/);
});

test("OCR pivots are framed as manual follow-ups", () => {
  assert.match(indexHtml, />Manual pivots</);
  assert.match(indexHtml, />Document mode</);
  assert.match(indexHtml, />Generate queries</);
  assert.match(indexHtml, /id="documentModeOut"/);
  assert.match(indexHtml, /id="queryGeneratorOut"/);
  assert.match(ocrEntitiesUiJs, /Manual pivots only — these are templated follow-ups from OCR hits/);
  assert.match(appJs, /Manual pivots \(\$\{targets\.length\}\)/);
  assert.match(appJs, /function runPivotStructuredTask\(/);
  assert.match(ocrEntitiesUiJs, /pivot_task_acquired/);
  assert.match(appJs, /\/api\/metadata\?/);
  assert.match(appJs, /\/api\/discover\?/);
  assert.match(appJs, /People: /);
  assert.match(appJs, /Organizations: /);
  assert.match(appJs, /Locations: /);
});

test("document-image mode and query generator build OCR-driven review output", () => {
  assert.match(appJs, /function summarizeDocumentLayout\(/);
  assert.match(appJs, /function buildDocumentImageOutput\(/);
  assert.match(appJs, /function buildSearchQueryGeneratorOutput\(/);
  assert.match(appJs, /Detected kinds:/);
  assert.match(appJs, /Heading candidates:/);
  assert.match(appJs, /Candidates: /);
  assert.match(bluelensHelpersJs, /Brand \+ city/);
  assert.match(bluelensHelpersJs, /OCR text \+ logo/);
  assert.match(bluelensHelpersJs, /Object \+ language/);
  assert.match(bluelensHelpersJs, /File name \+ dimensions/);
  assert.match(bluelensHelpersJs, /Visible username \+ platform/);
  assert.match(appJs, /document_image_mode:/);
  assert.match(appJs, /search_query_generator:/);
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
  assert.match(appJs, /const COMPARE_DIFF_SIZE = 96;/);
  assert.match(appJs, /function renderCompareDiff\(baseImg, compareImg, size = COMPARE_DIFF_SIZE\)/);
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
  assert.match(appJs, /temporary_external_artifact_warning/);
  assert.match(appJs, /expected_expiry_window/);
  assert.match(appJs, /ocr_entity_review_entries/);
  assert.match(appJs, /crop_selection:/);
  assert.match(appJs, /investigation: report\.investigation/);
  assert.match(appJs, /report\.investigation = buildInvestigationExport/);
});

test("share provider UI is explicit about automatic host ranking", () => {
  assert.match(indexHtml, /Automatic host selection — the local proxy ranks temporary hosts/);
  assert.match(indexHtml, />Auto host</);
});

test("easy mode keeps the search launchpad visible with a giant primary CTA", () => {
  assert.match(indexHtml, /id="btnQuickLens"/);
  assert.match(indexHtml, />\s*Lens only\s*</);
  assert.match(indexHtml, /id="btnQuickOcr"/);
  assert.match(indexHtml, /id="btnSearchAll"/);
  assert.match(indexHtml, /btn-search-cta/);
  assert.match(indexHtml, /id="workflowAdvanced"/);
  assert.match(indexHtml, /id="searchConsoleAdvanced"/);
  assert.doesNotMatch(indexHtml, /<details id="searchConsoleAdvanced"/);
  assert.match(indexHtml, />AI-image suspicion</);
  assert.match(indexHtml, /Checklist only — not an oracle\./);
  assert.match(appJs, /function computeAiImageSuspicionChecklist/);
  assert.match(appJs, /Impossible anatomy/);
  assert.match(appJs, /Weird reflections/);
  assert.match(appJs, /Synthetic texture/);
  assert.match(appJs, /ai_image_suspicion/);
  assert.match(stylesCss, /\.ai-suspicion-list/);
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
  assert.match(indexHtml, /id="progressPanel"/);
  assert.match(indexHtml, /id="missionExplain"/);
  assert.match(indexHtml, /id="btnEvidencePack"/);
  assert.match(indexHtml, /id="btnRunDoctor"/);
  assert.match(indexHtml, /id="doctorOut"/);
  assert.match(indexHtml, /id="missionOutputOut"/);
  assert.match(indexHtml, /id="resultIntakeInput"/);
  assert.match(indexHtml, /id="btnIngestResults"/);
  assert.match(indexHtml, /id="resultIntakeSummary"/);
  assert.match(indexHtml, /id="noResultAutopsyOut"/);
  assert.match(indexHtml, /id="sourceContradictionOut"/);
  assert.match(indexHtml, /id="manualNotes"/);
  assert.match(indexHtml, /id="actionLogOut"/);
  assert.match(appJs, /function downloadEvidencePack\(\)/);
  assert.match(appJs, /async function runDoctorChecks\(/);
  assert.match(appJs, /function ingestResults\(raw\)/);
  assert.match(appJs, /function computeNoResultAutopsy\(/);
  assert.match(appJs, /function buildSourceContradictionModel\(/);
  assert.match(appJs, /function setResultSuppressed\(/);
  assert.match(appJs, /function renderMissionOutput\(\)/);
  assert.doesNotMatch(indexHtml, /Quick start: 1\) load image/);
  assert.match(appJs, /function renderProgress\(\)/);
  assert.match(appJs, /Load an image to start\./);
  assert.match(helpHtml, />Doctor</);
});

test("launchpad now renders queue-aware swarm cockpit state", () => {
  assert.match(appJs, /Swarm Cockpit/);
  assert.match(appJs, /data-lp-open="pending"/);
  assert.match(appJs, /function prepareEngineSwarm\(/);
  assert.match(appJs, /ENGINE_SWARM_DELAY_MS/);
  assert.match(indexHtml, /id="btnCopySwarmJson"/);
  assert.match(appJs, /data-swarm-disposition/);
  assert.match(appJs, /data-swarm-notes/);
  assert.match(waitHtml, /Uploading… \(check main tab\)\./);
});

test("engine relay covers broad web and art-focused providers", () => {
  assert.match(indexHtml, /id="btnOpenPinterest"/);
  assert.match(indexHtml, /id="btnOpenSauceNAO"/);
  assert.match(indexHtml, /id="btnOpenIQDB"/);
  assert.match(indexHtml, /id="btnOpenBaidu"/);
  assert.match(indexHtml, /id="btnOpenAscii2d"/);
  assert.match(appJs, /const ENGINE_ORDER = APP_CONFIG\.engines\?\.order \|\| \["lens", "bing", "yandex", "tineye", "pinterest", "saucenao", "iqdb", "baidu", "ascii2d", "google_images"\]/);
  assert.match(appJs, /ENGINE_BUTTON_BY_KEY/);
  assert.match(readmeMd, /SauceNAO/);
  assert.match(readmeMd, /IQDB/);
  assert.match(readmeMd, /ASCII2D/);
});

test("result intake supports per-session false-positive suppression and no-result autopsy", () => {
  assert.match(appJs, /data-result-suppress/);
  assert.match(appJs, /data-result-restore/);
  assert.match(appJs, /Match suppressed for this session/);
  assert.match(appJs, /Private image \/ not indexed/);
  assert.match(appJs, /Manual-only engine follow-up/);
  assert.match(appJs, /Likely original/);
  assert.match(appJs, /Likely repost/);
  assert.match(appJs, /Source label:/);
  assert.match(appJs, /Contradictory source dates detected/);
  assert.match(stylesCss, /\.result-suppressed/);
  assert.match(stylesCss, /\.autopsy-card/);
  assert.match(stylesCss, /\.contradiction-card/);
});

test("readme reflects the current image-recon workflow and embeds the attached image", () => {
  assert.match(readmeMd, /bluelens-ocean-banner\.svg/);
  assert.match(readmeMd, /github\.com\/user-attachments\/assets\//);
  assert.match(readmeMd, /Local-first image reconnaissance/);
  assert.match(readmeMd, /No-result autopsy/);
  assert.match(readmeMd, /False-positive suppressor/);
  assert.match(readmeMd, /Source contradiction panel/);
  assert.match(readmeMd, /Likely original \/ repost labeling/);
  assert.match(readmeMd, /github\.com\/user-attachments\/assets\/[^"\s)]+/);
});

test("batch dashboard exposes aggregated entity follow-up controls", () => {
  assert.match(appJs, /function getBatchEntityClusters\(/);
  assert.match(appJs, /data-batch-entity-open/);
  assert.match(appJs, /data-batch-entity-mission/);
  assert.match(stylesCss, /\.entity-cluster-summary/);
  assert.match(indexHtml, /id="btnDownloadBatchCsv"/);
  assert.match(appJs, /function buildBatchSummaryRows\(/);
  assert.match(appJs, /downloadCsvRows\(buildBatchSummaryRows\(state\.batchItems\)/);
});

test("result intake accepts loose pipe delimiters and tracks blocked wait tabs honestly", () => {
  assert.ok(appJs.includes('split(/\\s*\\|\\s*/)'));
  assert.ok(appJs.includes('split("\\t")'));
  assert.match(appJs, /wait_tab_blocked/);
});

test("browser modules split launchpad core and OCR entity UI out of app.js", () => {
  assert.match(indexHtml, /src="\.\/launchpad-core\.js"/);
  assert.match(indexHtml, /src="\.\/ocr-entities-ui\.js"/);
  assert.match(appJs, /const LAUNCHPAD_CORE = window\.BLUELENS_LAUNCHPAD \|\| \{\};/);
  assert.match(appJs, /const OCR_ENTITIES_UI = window\.BLUELENS_OCR_ENTITIES \|\| \{\};/);
  assert.match(appJs, /async function prepareLaunchpad\(/);
  assert.match(launchpadCoreJs, /const createEngineRunRecord = \(\{/);
  assert.match(ocrEntitiesUiJs, /const renderOcrEntities = \(\{/);
  assert.match(appJs, /source: "mission:share_search"/);
  assert.match(appJs, /source: "search-all"/);
  assert.doesNotMatch(appJs, /const run = await prepareLaunchpadRun\(\{ engines: ENGINE_ORDER, openLens: true, mode: "launchpad", labelPrefix: "Mission" \}\);/);
  assert.doesNotMatch(appJs, /const run = await prepareLaunchpadRun\(\{ engines: ENGINE_ORDER, openLens, mode: "launchpad", labelPrefix: "Launchpad" \}\);/);
});

test("windows start script waits for ping before opening the browser", () => {
  assert.match(startCmd, /node server\.js/);
  assert.match(startCmd, /api\/ping/);
  assert.match(startCmd, /Invoke-WebRequest/);
  assert.ok(startCmd.indexOf("node server.js") < startCmd.lastIndexOf("start \"\" \"%BLUELENS_URL%\""));
});

test("global error surface is installed before storage-backed startup work", () => {
  assert.ok(appJs.indexOf("setupGlobalErrorSurface();") < appJs.indexOf("void runDoctorChecks();"));
  assert.ok(appJs.indexOf("setupGlobalErrorSurface();") < appJs.indexOf("setupFx();"));
  assert.doesNotMatch(setupTabsBlock, /localStorage\.setItem\("ui:tab"/);
});
