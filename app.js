/* global exifr, sha256, SparkMD5 */

/* global OCR_PIPELINE */
/* global OSINT_LIB */
/* global BLUELENS_HELPERS */
/* global BLUELENS_CONFIG */

const elements = {
  dropzone: document.getElementById("dropzone"),
  fileInput: document.getElementById("fileInput"),
  cameraInput: document.getElementById("cameraInput"),
  btnCamera: document.getElementById("btnCamera"),
  btnChoose: document.getElementById("btnChoose"),
  btnReset: document.getElementById("btnReset"),
  btnDownloadClean: document.getElementById("btnDownloadClean"),
  previewImg: document.getElementById("previewImg"),
  previewEmpty: document.getElementById("previewEmpty"),
  statusPill: document.getElementById("statusPill"),
  statusLine: document.getElementById("statusLine"),
  metaName: document.getElementById("metaName"),
  metaType: document.getElementById("metaType"),
  metaSize: document.getElementById("metaSize"),
  metaDim: document.getElementById("metaDim"),
  sha256: document.getElementById("sha256"),
  md5: document.getElementById("md5"),
  dhash: document.getElementById("dhash"),
  cleanDetails: document.getElementById("cleanDetails"),
  cleanSha256: document.getElementById("cleanSha256"),
  cleanMd5: document.getElementById("cleanMd5"),
  cleanDhash: document.getElementById("cleanDhash"),
  cleanDiffOut: document.getElementById("cleanDiffOut"),
  copySha: document.getElementById("copySha"),
  copyMd5: document.getElementById("copyMd5"),
  copyDhash: document.getElementById("copyDhash"),
  exifOut: document.getElementById("exifOut"),
  btnCopyExif: document.getElementById("btnCopyExif"),
  btnTogglePretty: document.getElementById("btnTogglePretty"),
  gpsPill: document.getElementById("gpsPill"),
  editPill: document.getElementById("editPill"),
  btnOpenMap: document.getElementById("btnOpenMap"),
  btnCopyCoords: document.getElementById("btnCopyCoords"),
  kfCaptured: document.getElementById("kfCaptured"),
  kfCamera: document.getElementById("kfCamera"),
  kfSoftware: document.getElementById("kfSoftware"),
  kfGps: document.getElementById("kfGps"),
  ocrPill: document.getElementById("ocrPill"),
  ocrLang: document.getElementById("ocrLang"),
  btnRunOcr: document.getElementById("btnRunOcr"),
  btnPivotSearch: document.getElementById("btnPivotSearch"),
  btnCopyOcr: document.getElementById("btnCopyOcr"),
  ocrOut: document.getElementById("ocrOut"),
  ocrEntities: document.getElementById("ocrEntities"),
  btnChooseCompare: document.getElementById("btnChooseCompare"),
  btnClearCompare: document.getElementById("btnClearCompare"),
  compareInput: document.getElementById("compareInput"),
  compareImg: document.getElementById("compareImg"),
  compareEmpty: document.getElementById("compareEmpty"),
  compareDiffCanvas: document.getElementById("compareDiffCanvas"),
  compareDiffEmpty: document.getElementById("compareDiffEmpty"),
  cmpA: document.getElementById("cmpA"),
  cmpB: document.getElementById("cmpB"),
  cmpDist: document.getElementById("cmpDist"),
  cmpVerdict: document.getElementById("cmpVerdict"),
  cmpExplain: document.getElementById("cmpExplain"),
  chkEnableShare: document.getElementById("chkEnableShare"),
  chkShareSafe: document.getElementById("chkShareSafe"),
  shareProvider: document.getElementById("shareProvider"),
  btnCopyPublicUrl: document.getElementById("btnCopyPublicUrl"),
  publicUrlOut: document.getElementById("publicUrlOut"),
  engineLinks: document.getElementById("engineLinks"),
  hostStatsOut: document.getElementById("hostStatsOut"),
  sharePill: document.getElementById("sharePill"),
  btnSearchAll: document.getElementById("btnSearchAll"),
  btnRunPass: document.getElementById("btnRunPass"),
  btnCopyReport: document.getElementById("btnCopyReport"),
  btnEvidencePack: document.getElementById("btnEvidencePack"),
  missionPreset: document.getElementById("missionPreset"),
  btnRunMission: document.getElementById("btnRunMission"),
  manualRow: document.getElementById("manualRow"),
  missionRow: document.getElementById("missionRow"),
  radar: document.getElementById("radar"),
  repostScore: document.getElementById("repostScore"),
  repostReasons: document.getElementById("repostReasons"),
  attrHints: document.getElementById("attrHints"),
  srcWhere: document.getElementById("srcWhere"),
  srcWhen: document.getElementById("srcWhen"),
  srcWho: document.getElementById("srcWho"),
  srcOrig: document.getElementById("srcOrig"),
  manualNotes: document.getElementById("manualNotes"),
  confLevel: document.getElementById("confLevel"),
  btnMutateSearch: document.getElementById("btnMutateSearch"),
  btnCopyMutations: document.getElementById("btnCopyMutations"),
  mutationOut: document.getElementById("mutationOut"),
  batchInput: document.getElementById("batchInput"),
  btnRunBatch: document.getElementById("btnRunBatch"),
  btnDownloadBatch: document.getElementById("btnDownloadBatch"),
  batchOut: document.getElementById("batchOut"),
  scanlineSlider: document.getElementById("scanlineSlider"),
  chromaticSlider: document.getElementById("chromaticSlider"),
  btnOverclock: document.getElementById("btnOverclock"),
  chkFunMode: document.getElementById("chkFunMode"),
  chkOperatorMode: document.getElementById("chkOperatorMode"),
  chkChrome: document.getElementById("chkChrome"),
  chkHud: document.getElementById("chkHud"),
  btnOpenLens: document.getElementById("btnOpenLens"),
  btnOpenBing: document.getElementById("btnOpenBing"),
  btnOpenTineye: document.getElementById("btnOpenTineye"),
  btnOpenYandex: document.getElementById("btnOpenYandex"),
  btnOpenGoogleImages: document.getElementById("btnOpenGoogleImages"),
  btnRetryUpload: document.getElementById("btnRetryUpload"),
  ocrLangHint: document.getElementById("ocrLangHint"),
  onboardingStrip: document.getElementById("onboardingStrip"),
  actionLogOut: document.getElementById("actionLogOut"),
  btnRunDoctor: document.getElementById("btnRunDoctor"),
  doctorOut: document.getElementById("doctorOut"),

  // Command palette
  cmdk: document.getElementById("cmdk"),
  cmdkInput: document.getElementById("cmdkInput"),
  cmdkList: document.getElementById("cmdkList"),

};

const appHelpers = BLUELENS_HELPERS || {};
const hammingHex =
  appHelpers.hammingHex ||
  ((a, b) => {
    if (!a || !b || a.length !== b.length) return null;
    const bitCounts = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
    let dist = 0;
    for (let i = 0; i < a.length; i += 1) {
      const na = parseInt(a[i], 16);
      const nb = parseInt(b[i], 16);
      if (Number.isNaN(na) || Number.isNaN(nb)) return null;
      dist += bitCounts[na ^ nb];
    }
    return dist;
  });
const sortBatchItems =
  appHelpers.sortBatchItems ||
  ((items, sortKey = "lead", sortDir = "desc") => {
    const dir = sortDir === "asc" ? 1 : -1;
    return items.slice().sort((a, b) => {
      const dimsA = String(a?.report?.dimensions || "").match(/(\d+)\s*[×x]\s*(\d+)/);
      const dimsB = String(b?.report?.dimensions || "").match(/(\d+)\s*[×x]\s*(\d+)/);
      const ta = a?.triage || {};
      const tb = b?.triage || {};
      const pick = (item, triage, dims) =>
        sortKey === "name"
          ? String(item?.report?.file?.name || "")
          : sortKey === "gps"
            ? (triage.gps ? 1 : 0)
            : sortKey === "ent"
              ? (triage.entCount || 0)
              : sortKey === "repost"
                ? (Number.isFinite(triage.repost) ? triage.repost : -1)
                : sortKey === "cluster"
                  ? (item?.clusterId || 0)
                  : sortKey === "dim"
                    ? (dims ? Number(dims[1]) * Number(dims[2]) : -1)
                    : (triage.lead || 0);
      const va = pick(a, ta, dimsA);
      const vb = pick(b, tb, dimsB);
      if (typeof va === "string" || typeof vb === "string") return dir * String(va).localeCompare(String(vb));
      return dir * ((va || 0) - (vb || 0));
    });
  });

const runtimeConfig = BLUELENS_CONFIG || {};
const CONFIG_META = runtimeConfig.meta || {};
const APP_CONFIG = runtimeConfig.app || {};
const SERVER_CONFIG = runtimeConfig.server || {};
const FX_CONFIG = runtimeConfig.fx || {};
const STORAGE_KEYS = runtimeConfig.storageKeys || {};

const ENGINE_ORDER = APP_CONFIG.engines?.order || ["lens", "bing", "tineye", "yandex", "google_images"];
const ENGINE_LABEL = APP_CONFIG.engines?.labels || {
  lens: "Lens",
  bing: "Bing",
  tineye: "TinEye",
  yandex: "Yandex",
  google_images: "Google",
};
const ENGINE_ICON = APP_CONFIG.engines?.icons || {
  lens: "⌕",
  bing: "⧉",
  tineye: "◎",
  yandex: "⟡",
  google_images: "◉",
};
const BATCH_TOP_LENS_DEFAULT = APP_CONFIG.batch?.topLensDefault || 5;
const BATCH_TOP_LENS_MAX = APP_CONFIG.batch?.topLensMax || 10;
const BATCH_OCR_DEFAULT = APP_CONFIG.batch?.ocrDefault || 8;
const BATCH_OCR_MAX = APP_CONFIG.batch?.ocrMax || 20;
const OCR_DEFAULT_LANGUAGE = APP_CONFIG.ocr?.defaultLanguage || "eng";
const OCR_LANGUAGE_OPTIONS = Array.isArray(APP_CONFIG.ocr?.languages) && APP_CONFIG.ocr.languages.length
  ? APP_CONFIG.ocr.languages
  : [
      { value: "eng", label: "English" },
      { value: "spa", label: "Spanish" },
      { value: "fra", label: "French" },
      { value: "deu", label: "German" },
    ];
const OCR_FAST_PREPROCESS_MAX_DIM = APP_CONFIG.ocr?.fastPreprocessMaxDim || 1200;
const OCR_BATCH_PREPROCESS_MAX_DIM = APP_CONFIG.ocr?.batchPreprocessMaxDim || 1400;
const DHASH_BATCH_CLUSTER_THRESHOLD = APP_CONFIG.dhash?.batchClusterThreshold || 8;
const DHASH_MUTATION_CLUSTER_THRESHOLD = APP_CONFIG.dhash?.mutationClusterThreshold || 10;
const HOST_STATS_REFRESH_TIMEOUT_MS = APP_CONFIG.hostStats?.refreshTimeoutMs || 2000;
const UPLOAD_PROXY_TIMEOUT_MS = APP_CONFIG.upload?.endpointTimeoutMs || 45000;
const UPLOAD_PREFLIGHT_TIMEOUT_MS = APP_CONFIG.upload?.preflightTimeoutMs || 2500;
const WAIT_JOB_DEFAULT_TIMEOUT_MS = SERVER_CONFIG.waitJobs?.defaultTimeoutMs || 25000;
const LOCAL_SERVER_HINT_TIMEOUT_MS = APP_CONFIG.localServerHint?.timeoutMs || 900;
const LOCAL_SERVER_HINT_MESSAGE = APP_CONFIG.localServerHint?.offlineMessage || "Local server offline — start `bluelens-start.cmd` (or `node server.js`) for Upload + Launchpad.";
const WAIT_JOB_ENDPOINT_PREFIX = "/api/wait-jobs/";
const SESSION_KEY = STORAGE_KEYS.session || "osint:session:v1";
const LAST_RUN_KEY = STORAGE_KEYS.lastRun || "osint:lastRun:v1";
const STORAGE_MISSION_PRESET_KEY = STORAGE_KEYS.missionPreset || "ui:missionPreset";
const STORAGE_SHARE_SAFE_KEY = STORAGE_KEYS.shareSafe || "ui:shareSafe";
const STORAGE_FX_SCANLINE_KEY = STORAGE_KEYS.fxScanline || "fx:scanline";
const STORAGE_FX_CHROMATIC_KEY = STORAGE_KEYS.fxChromatic || "fx:chromatic";
const STORAGE_FX_FUN_MODE_KEY = STORAGE_KEYS.fxFunMode || "fx:funMode";
const STORAGE_FX_HUD_KEY = STORAGE_KEYS.fxHud || "fx:hud";
const STORAGE_SKIN_CHROME_KEY = STORAGE_KEYS.skinChrome || "ui:skinChrome";
const STORAGE_OPERATOR_MODE_KEY = STORAGE_KEYS.operatorMode || "ui:operatorMode";
const APP_VERSION = CONFIG_META.appVersion || "dev";
const EXPORT_SCHEMA_VERSION = CONFIG_META.exportSchemaVersion || "bluelens-report-v1";
const METADATA_SUSPICION_BANDS = {
  high: 75,
  elevated: 60,
  mixed: 40,
};
const UTF8_ENCODER = new TextEncoder();
const TAR_HEADER_SIZE = 512;
const TAR_END_PADDING = 1024;
const OCR_SCRIPT_HINTS = [
  { label: "Arabic", test: /[\u0600-\u06FF]/g, models: ["ara"] },
  { label: "Hebrew", test: /[\u0590-\u05FF]/g, models: ["heb"] },
  { label: "Cyrillic", test: /[\u0400-\u04FF]/g, models: ["rus", "ukr"] },
  { label: "Hangul", test: /[\uAC00-\uD7AF]/g, models: ["kor"] },
  { label: "Japanese", test: /[\u3040-\u30FF]/g, models: ["jpn"] },
  { label: "Han", test: /[\u4E00-\u9FFF]/g, models: ["chi_sim", "chi_tra", "jpn"] },
  { label: "Latin", test: /[A-Za-zÀ-ÿ]/g, models: ["eng", "spa", "fra", "deu", "ita", "por", "nld", "pol", "tur"] },
];
const FX_SCANLINE_DEFAULT = Number.isFinite(FX_CONFIG.scanlineDefault) ? FX_CONFIG.scanlineDefault : 0;
const FX_CHROMATIC_DEFAULT = Number.isFinite(FX_CONFIG.chromaticDefault) ? FX_CONFIG.chromaticDefault : 0;
const FX_SCANLINE_FUN_DEFAULT = Number.isFinite(FX_CONFIG.scanlineFunDefault) ? FX_CONFIG.scanlineFunDefault : 0.18;
const FX_CHROMATIC_FUN_DEFAULT = Number.isFinite(FX_CONFIG.chromaticFunDefault) ? FX_CONFIG.chromaticFunDefault : 0.7;
const FX_SCANLINE_MAX = Number.isFinite(FX_CONFIG.scanlineMax) ? FX_CONFIG.scanlineMax : 0.35;
const FX_CHROMATIC_MAX = Number.isFinite(FX_CONFIG.chromaticMax) ? FX_CONFIG.chromaticMax : 1.2;
const FX_OVERCLOCK_SCANLINE = Number.isFinite(FX_CONFIG.overclockScanline) ? FX_CONFIG.overclockScanline : 0.28;
const FX_OVERCLOCK_CHROMATIC = Number.isFinite(FX_CONFIG.overclockChromatic) ? FX_CONFIG.overclockChromatic : 1.05;
const FX_FUN_MODE_DEFAULT = Boolean(FX_CONFIG.funModeDefault);
const FX_HUD_DEFAULT = Boolean(FX_CONFIG.hudDefault);
const FX_CHROME_DEFAULT = Boolean(FX_CONFIG.chromeDefault);
const COMPARE_DIFF_SIZE = 96;
const TEMP_EXTERNAL_ARTIFACT_WARNING = "Temporary external artifact — third-party upload URLs may expire or disappear before a reader opens the report.";
const TEMP_EXTERNAL_ARTIFACT_NOTE = "Host retention is controlled by the third-party service and is not guaranteed by BlueLens.";
const compareDiffScratchA = document.createElement("canvas");
const compareDiffScratchB = document.createElement("canvas");
const EXPORT_RUNTIME_CONFIG_SOURCE = JSON.stringify({
  meta: CONFIG_META,
  upload: {
    hosts: SERVER_CONFIG.upload?.hosts || [],
    preferredHostsByPurpose: SERVER_CONFIG.upload?.preferredHostsByPurpose || {},
    litterboxExpiry: SERVER_CONFIG.upload?.litterboxExpiry || null,
  },
  ocr: {
    defaultLanguage: APP_CONFIG.ocr?.defaultLanguage || null,
    languages: APP_CONFIG.ocr?.languages || [],
    fastPreprocessMaxDim: APP_CONFIG.ocr?.fastPreprocessMaxDim || null,
    batchPreprocessMaxDim: APP_CONFIG.ocr?.batchPreprocessMaxDim || null,
  },
  heuristics: {
    dhash: APP_CONFIG.dhash || {},
    metadataSuspicionBands: METADATA_SUSPICION_BANDS,
  },
});
const EXPORT_RUNTIME_CONFIG_FINGERPRINT = typeof sha256 === "function" ? sha256(EXPORT_RUNTIME_CONFIG_SOURCE) : EXPORT_RUNTIME_CONFIG_SOURCE;

const nonFatalErrorState = new Map();

function reportNonFatalError(scope, error, { harmless = false, detail = null, dedupeMs = 0 } = {}) {
  const msg = error?.message || String(error || "unknown error");
  const key = `${scope}:${msg}`;
  const now = Date.now();
  if (dedupeMs > 0) {
    const last = Number(nonFatalErrorState.get(key) || 0);
    if (now - last < dedupeMs) return;
    nonFatalErrorState.set(key, now);
    if (nonFatalErrorState.size > 200) {
      const oldestKey = nonFatalErrorState.keys().next().value;
      if (oldestKey) nonFatalErrorState.delete(oldestKey);
    }
  }
  const logger = harmless ? console.info : console.warn;
  try {
    if (detail) logger(`[BlueLens:${scope}] ${msg}`, detail);
    else logger(`[BlueLens:${scope}] ${msg}`);
  } catch {
    // ignore
  }
}

function readStorage(key, fallback, scope, storage = localStorage) {
  try {
    const value = storage.getItem(key);
    return value == null ? fallback : value;
  } catch (error) {
    reportNonFatalError(scope, error, { harmless: true, detail: { key } });
    return fallback;
  }
}

function writeStorage(key, value, scope, storage = localStorage) {
  try {
    storage.setItem(key, value);
    return true;
  } catch (error) {
    reportNonFatalError(scope, error, { harmless: true, detail: { key } });
    return false;
  }
}

function removeStorage(key, scope, storage = localStorage) {
  try {
    storage.removeItem(key);
    return true;
  } catch (error) {
    reportNonFatalError(scope, error, { harmless: true, detail: { key } });
    return false;
  }
}

const state = {
  file: null,
  objectUrl: null,
  prettyExif: true,
  cleanBlob: null,
  cleanSignals: null,
  shareEnabled: false,
  shareSafe: false,
  publicUrl: "",
  publicUrlPurpose: "",
  publicUrlArtifact: "original",
  uploadMeta: null,
  uiBusy: false,
  uploading: false,
  funMode: FX_FUN_MODE_DEFAULT,
  chromeSkinWanted: FX_CHROME_DEFAULT,
  hudWanted: FX_HUD_DEFAULT,
  session: {
    started_at: Date.now(),
    uploads_ok: 0,
    uploads_fail: 0,
    engines_opened: 0,
    last_host: "",
    last_ms: null,
  },
  gps: null,
  ocrText: "",
  ocrRunning: false,
  batchReports: [],
  batchItems: [],
  batchUi: {
    sortKey: "lead",
    sortDir: "desc",
    query: "",
    gpsOnly: false,
    entOnly: false,
    cluster: "all",
    selected: {},
  },
  sourceInfo: {
    where_obtained: "",
    when_obtained: "",
    who_provided: "",
    original_filename: "",
    manual_notes: "",
    analyst_confidence: "unverified",
  },
  sourceReviewLog: [],
  insights: {
    metadata_suspicion_score: null,
    metadata_suspicion_band: null,
    metadata_suspicion_inputs: [],
  },
  mutations: [],
  compare: {
    file: null,
    objectUrl: null,
    dhash: "",
    diffScore: null,
  },
  signals: {
    sha256: "",
    md5: "",
    dhash: "",
  },
  exif: null,
  entityConfidence: {},
  entityReviewLog: [],
  ocrDerivedEntries: [],
  lastEngineRun: null,
  manualNotes: "",
  actionLog: [],
  operatorMode: true,
  localServerOnline: null,
  popupLikely: true,
  lastOcrMode: "not_run",
  captureTimeInfo: null,
  doctorReport: null,
};

function setStatus(label, tone = "muted") {
  elements.statusPill.textContent = label;
  elements.statusPill.classList.toggle("pill-muted", tone === "muted");
  elements.statusPill.classList.toggle("pill-busy", tone === "busy");
}

function setStatusLine(text) {
  if (!elements.statusLine) return;
  elements.statusLine.textContent = text || "";
}

function renderActionLog() {
  const el = elements.actionLogOut;
  if (!el) return;
  const rows = Array.isArray(state.actionLog) ? state.actionLog.slice(-40) : [];
  if (rows.length === 0) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = rows.map((row) => `${row.ts} · ${row.event}${row.detail ? ` · ${row.detail}` : ""}`).join("\n");
}

function logAction(event, detail = "") {
  const ts = new Date().toISOString();
  state.actionLog = Array.isArray(state.actionLog) ? state.actionLog : [];
  state.actionLog.push({ ts, event: String(event || "event"), detail: detail ? String(detail) : "" });
  if (state.actionLog.length > 200) state.actionLog = state.actionLog.slice(-200);
  renderActionLog();
}

function appendReviewEntry(listName, entry, max = 400) {
  state[listName] = Array.isArray(state[listName]) ? state[listName] : [];
  state[listName].push(entry);
  if (state[listName].length > max) state[listName] = state[listName].slice(-max);
}

function createReviewEntry({
  source = "manual",
  scope = "annotation",
  field = "",
  value = null,
  previousValue = null,
  entityType = null,
  entityKey = null,
  entityValue = null,
  note = "",
} = {}) {
  return {
    ts: new Date().toISOString(),
    source: String(source || "manual"),
    scope: String(scope || "annotation"),
    field: field ? String(field) : null,
    value,
    previous_value: previousValue,
    entity_type: entityType ? String(entityType) : null,
    entity_key: entityKey ? String(entityKey) : null,
    entity_value: entityValue == null ? null : String(entityValue),
    note: note ? String(note) : null,
  };
}

function updateSourceInfoField(field, value, { source = "manual", note = "" } = {}) {
  state.sourceInfo = state.sourceInfo || {};
  const normalized = typeof value === "string" ? value : value == null ? "" : String(value);
  const previous = typeof state.sourceInfo[field] === "string" ? state.sourceInfo[field] : state.sourceInfo[field] == null ? "" : String(state.sourceInfo[field]);
  if (normalized === previous) return false;
  state.sourceInfo[field] = normalized;
  appendReviewEntry(
    "sourceReviewLog",
    createReviewEntry({
      source,
      scope: "source_reliability",
      field,
      value: normalized,
      previousValue: previous || null,
      note,
    }),
  );
  return true;
}

function uploadExpiryWindowForHost(host) {
  if (!host) return null;
  if (host === "litterbox") return SERVER_CONFIG.upload?.litterboxExpiry || "72h";
  return "unknown";
}

function uploadRetentionNoteForHost(host) {
  if (!host) return null;
  if (host === "litterbox") {
    return `Litterbox uploads are configured for ${SERVER_CONFIG.upload?.litterboxExpiry || "72h"} and should be treated as disposable.`;
  }
  return TEMP_EXTERNAL_ARTIFACT_NOTE;
}

function buildUploadLifecycleMeta(uploadMeta = state.uploadMeta, purpose = state.publicUrlPurpose || "") {
  if (!uploadMeta && !state.publicUrl) return null;
  const host = uploadMeta?.host || null;
  return {
    ...(uploadMeta && typeof uploadMeta === "object" ? uploadMeta : {}),
    host,
    purpose: uploadMeta?.purpose || purpose || null,
    created_at: uploadMeta?.created_at || null,
    expected_expiry_window: uploadMeta?.expected_expiry_window || uploadExpiryWindowForHost(host),
    retention_note: uploadMeta?.retention_note || uploadRetentionNoteForHost(host),
    temporary_external_artifact: Boolean(host || state.publicUrl),
    temporary_external_artifact_warning: uploadMeta?.temporary_external_artifact_warning || TEMP_EXTERNAL_ARTIFACT_WARNING,
  };
}

function recordEntityConfidenceReview({ entityType, entityKey, entityValue, confidence }) {
  if (!entityKey) return;
  state.entityConfidence = state.entityConfidence || {};
  const normalized = confidence || "unverified";
  const previous = state.entityConfidence[entityKey] || "unverified";
  if (normalized === previous) return;
  state.entityConfidence[entityKey] = normalized;
  appendReviewEntry(
    "entityReviewLog",
    createReviewEntry({
      source: "manual",
      scope: "ocr_entity",
      field: "confidence",
      value: normalized,
      previousValue: previous,
      entityType,
      entityKey,
      entityValue,
      note: "Analyst confidence label",
    }),
  );
}

function buildCurrentOcrReviewEntries() {
  const derived = Array.isArray(state.ocrDerivedEntries) ? state.ocrDerivedEntries.slice() : [];
  const currentKeys = new Set(derived.map((entry) => entry.entity_key).filter(Boolean));
  const manual = Array.isArray(state.entityReviewLog)
    ? state.entityReviewLog.filter((entry) => !entry?.entity_key || currentKeys.has(entry.entity_key))
    : [];
  const merged = [...derived, ...manual];
  return merged.length ? merged : null;
}

function formatReviewHistory(entries, empty = "- —") {
  if (!Array.isArray(entries) || entries.length === 0) return empty;
  return entries
    .map((entry) => {
      const scope = entry?.source || entry?.scope || "entry";
      const target = entry?.field || entry?.entity_key || entry?.entity_type || "value";
      const value = entry?.entity_value || entry?.value || "—";
      const note = entry?.note ? ` · ${entry.note}` : "";
      return `- ${entry?.ts || "—"} · ${scope} · ${target} · ${value}${note}`;
    })
    .join("\n");
}

function renderOnboardingStrip() {
  const el = elements.onboardingStrip;
  if (!el) return;
  const chips = [
    {
      tone: state.localServerOnline === false ? "warn" : "ok",
      text:
        state.localServerOnline === null
          ? "Checking local server — upload and launch actions need the local proxy."
          : state.localServerOnline === false
          ? "Server offline — uploads/search launchpad need `node server.js`."
          : "Server reachable — launchpad uploads available when you ask for them.",
    },
    { tone: "warn", text: "Uploads will be external — launch actions send the image to a temporary third-party host." },
    { tone: state.popupLikely ? "warn" : "ok", text: state.popupLikely ? "Popup blocker likely — provider tabs may require another click." : "Provider popups opened in-session." },
    { tone: "warn", text: "OCR model loads from CDN — first run needs network access to fetch Tesseract assets." },
    { tone: "warn", text: "Batch export omits failures — only successful batch reports are included right now." },
  ];
  el.hidden = false;
  el.innerHTML = chips
    .map((chip) => `<span class="onboarding-chip ${chip.tone === "warn" ? "warn" : "ok"}">${escapeHtml(chip.text)}</span>`)
    .join("");
}

function applyOperatorMode(enabled, { persist = true } = {}) {
  state.operatorMode = Boolean(enabled);
  document.body.classList.toggle("operator-mode", state.operatorMode);
  if (elements.chkOperatorMode) elements.chkOperatorMode.checked = state.operatorMode;
  if (persist) writeStorage(STORAGE_OPERATOR_MODE_KEY, state.operatorMode ? "1" : "0", "ui.operator-mode.write");
  renderActionLog();
}

function toUtf8Bytes(text) {
  return UTF8_ENCODER.encode(String(text || ""));
}

function padTarSize(size) {
  return Math.ceil(size / TAR_HEADER_SIZE) * TAR_HEADER_SIZE;
}

function tarOctal(value, width) {
  const txt = Math.max(0, Number(value) || 0).toString(8);
  return txt.padStart(width - 1, "0") + "\0";
}

function writeTarString(view, offset, value, width) {
  const bytes = toUtf8Bytes(String(value || "").slice(0, width));
  for (let i = 0; i < Math.min(bytes.length, width); i += 1) view[offset + i] = bytes[i];
}

function createTar(entries) {
  const files = entries.filter((entry) => entry?.name && entry?.data instanceof Uint8Array);
  const total = files.reduce((sum, entry) => sum + TAR_HEADER_SIZE + padTarSize(entry.data.length), 0) + TAR_END_PADDING;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const entry of files) {
    const header = out.subarray(offset, offset + TAR_HEADER_SIZE);
    writeTarString(header, 0, entry.name, 100);
    writeTarString(header, 100, tarOctal(0o644, 8), 8);
    writeTarString(header, 108, tarOctal(0, 8), 8);
    writeTarString(header, 116, tarOctal(0, 8), 8);
    writeTarString(header, 124, tarOctal(entry.data.length, 12), 12);
    writeTarString(header, 136, tarOctal(entry.mtime || 0, 12), 12);
    for (let i = 148; i < 156; i += 1) header[i] = 32;
    header[156] = "0".charCodeAt(0);
    writeTarString(header, 257, "ustar", 6);
    writeTarString(header, 263, "00", 2);
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    writeTarString(header, 148, `${checksum.toString(8).padStart(6, "0")}\0 `, 8);
    offset += TAR_HEADER_SIZE;
    out.set(entry.data, offset);
    offset += padTarSize(entry.data.length);
  }
  return new Blob([out], { type: "application/x-tar" });
}

async function fileToBytes(file) {
  return new Uint8Array(await file.arrayBuffer());
}

function setUiBusy(busy, label = "") {
  state.uiBusy = Boolean(busy);
  document.body.classList.toggle("ui-busy", state.uiBusy);
  if (label) setStatus(label, busy ? "busy" : "muted");

  const disabled = state.uiBusy;
  const controls = [
    elements.btnReset,
    elements.btnChoose,
    elements.dropzone,
    elements.fileInput,
    elements.cameraInput,
    elements.btnCamera,
    elements.btnDownloadClean,
    elements.btnCopyExif,
    elements.btnTogglePretty,
    elements.copySha,
    elements.copyMd5,
    elements.copyDhash,
    elements.ocrLang,
    elements.btnRunOcr,
    elements.btnPivotSearch,
    elements.btnCopyOcr,
    elements.btnChooseCompare,
    elements.btnClearCompare,
    elements.compareInput,
    elements.chkEnableShare,
    elements.chkShareSafe,
    elements.shareProvider,
    elements.btnCopyPublicUrl,
    elements.btnSearchAll,
    elements.btnRunPass,
    elements.btnCopyReport,
    elements.btnEvidencePack,
    elements.missionPreset,
    elements.btnRunMission,
    elements.btnMutateSearch,
    elements.btnCopyMutations,
    elements.batchInput,
    elements.btnRunBatch,
    elements.btnDownloadBatch,
    elements.scanlineSlider,
    elements.chromaticSlider,
    elements.btnOverclock,
    elements.chkHud,
    elements.btnOpenLens,
    elements.btnOpenBing,
    elements.btnOpenTineye,
    elements.btnOpenYandex,
    elements.btnOpenGoogleImages,
    elements.srcWhere,
    elements.srcWhen,
    elements.srcWho,
    elements.srcOrig,
    elements.confLevel,
  ].filter(Boolean);

  for (const el of controls) {
    if ("disabled" in el) el.disabled = disabled;
    if (el === elements.dropzone) el.classList.toggle("disabled", disabled);
  }
}

async function withUiLock(label, fn) {
  if (state.uiBusy) return;
  setUiBusy(true, label);
  try {
    return await fn();
  } finally {
    setUiBusy(false);
    setButtonsEnabled(Boolean(state.file));
    setShareControlsEnabled(Boolean(state.file));
    setStatusLine("");
  }
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function formatOcrError(error) {
  return `OCR failed: ${error?.message || "unknown error"}`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

function setButtonsEnabled(enabled) {
  const fileControls = [
    elements.btnDownloadClean,
    elements.btnCopyExif,
    elements.btnTogglePretty,
    elements.copySha,
    elements.copyMd5,
    elements.copyDhash,
    elements.ocrLang,
    elements.btnRunOcr,
    elements.btnChooseCompare,
    elements.btnSearchAll,
    elements.btnRunPass,
    elements.btnCopyReport,
    elements.missionPreset,
    elements.btnRunMission,
    elements.btnMutateSearch,
    elements.btnOpenLens,
    elements.btnOpenBing,
    elements.btnOpenTineye,
    elements.btnOpenYandex,
    elements.btnOpenGoogleImages,
  ];
  for (const b of fileControls.filter(Boolean)) {
    if (!("disabled" in b)) continue;
    b.disabled = state.uiBusy ? true : !enabled;
  }
}

function reset() {
  state.uiBusy = false;
  document.body.classList.remove("ui-busy");
  state.file = null;
  state.cleanBlob = null;
  state.cleanSignals = null;
  state.signals = { sha256: "", md5: "", dhash: "" };
  state.exif = null;
  state.captureTimeInfo = null;
  state.publicUrl = "";
  state.publicUrlPurpose = "";
  state.publicUrlArtifact = "original";
  state.uploadMeta = null;
  state.shareEnabled = false;
  state.uploading = false;
  state.gps = null;
  state.ocrText = "";
  state.ocrRunning = false;
  state.lastOcrMode = "not_run";
  state.entityConfidence = {};
  state.entityReviewLog = [];
  state.ocrDerivedEntries = [];
  state.lastEngineRun = null;
  state.batchReports = [];
  state.batchItems = [];
  state.manualNotes = "";
  state.actionLog = [];
  state.doctorReport = null;
  state.batchUi.selected = {};
  state.sourceInfo = {
    where_obtained: "",
    when_obtained: "",
    who_provided: "",
    original_filename: "",
    manual_notes: "",
    analyst_confidence: "unverified",
  };
  state.sourceReviewLog = [];
  state.insights = { metadata_suspicion_score: null, metadata_suspicion_band: null, metadata_suspicion_inputs: [] };
  state.mutations = [];
  if (state.compare?.objectUrl) URL.revokeObjectURL(state.compare.objectUrl);
  state.compare = { file: null, objectUrl: null, dhash: "", diffScore: null };

  if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
  state.objectUrl = null;

  elements.fileInput.value = "";
  elements.previewImg.removeAttribute("src");
  elements.previewImg.style.display = "none";
  elements.previewEmpty.style.display = "grid";
  elements.metaName.textContent = "—";
  elements.metaType.textContent = "—";
  elements.metaSize.textContent = "—";
  elements.metaDim.textContent = "—";
  elements.repostScore.textContent = "—";
  elements.attrHints.textContent = "—";
  elements.sha256.textContent = "—";
  elements.md5.textContent = "—";
  elements.dhash.textContent = "—";
  if (elements.cleanDetails) elements.cleanDetails.hidden = true;
  if (elements.cleanSha256) elements.cleanSha256.textContent = "—";
  if (elements.cleanMd5) elements.cleanMd5.textContent = "—";
  if (elements.cleanDhash) elements.cleanDhash.textContent = "—";
  if (elements.cleanDiffOut) elements.cleanDiffOut.textContent = "—";
  elements.exifOut.textContent = "—";
  elements.gpsPill.hidden = true;
  elements.editPill.hidden = true;
  elements.btnOpenMap.disabled = true;
  elements.btnCopyCoords.disabled = true;
  elements.kfCaptured.textContent = "—";
  elements.kfCamera.textContent = "—";
  elements.kfSoftware.textContent = "—";
  elements.kfGps.textContent = "—";

  elements.ocrOut.textContent = "—";
  if (elements.ocrEntities) {
    elements.ocrEntities.hidden = true;
    elements.ocrEntities.innerHTML = "";
  }
  if (elements.ocrLangHint) {
    elements.ocrLangHint.hidden = true;
    elements.ocrLangHint.textContent = "Weak script hint";
  }
  if (elements.ocrLang && !elements.ocrLang.value) elements.ocrLang.value = OCR_DEFAULT_LANGUAGE;
  elements.ocrLang.disabled = true;
  elements.btnRunOcr.disabled = true;
  elements.btnCopyOcr.disabled = true;
  if (elements.btnEvidencePack) elements.btnEvidencePack.disabled = true;
  if (elements.btnPivotSearch) elements.btnPivotSearch.disabled = true;
  elements.ocrPill.textContent = "Idle";
  elements.ocrPill.classList.add("pill-muted");

  elements.btnChooseCompare.disabled = true;
  elements.btnClearCompare.disabled = true;
  elements.compareInput.value = "";
  elements.compareImg.removeAttribute("src");
  elements.compareImg.style.display = "none";
  elements.compareEmpty.style.display = "grid";
  if (elements.compareDiffCanvas) {
    const ctx = elements.compareDiffCanvas.getContext("2d");
    ctx?.clearRect(0, 0, elements.compareDiffCanvas.width || 0, elements.compareDiffCanvas.height || 0);
    elements.compareDiffCanvas.style.display = "none";
  }
  if (elements.compareDiffEmpty) elements.compareDiffEmpty.style.display = "grid";
  elements.cmpA.textContent = "—";
  elements.cmpB.textContent = "—";
  elements.cmpDist.textContent = "—";
  elements.cmpVerdict.textContent = "—";
  if (elements.cmpExplain) {
    elements.cmpExplain.textContent =
      "dHash is a 64-bit perceptual heuristic. Lower Hamming distance means the thumbnails look closer, not that the files are proven to be the same image.";
  }
  setButtonsEnabled(false);
  setShareControlsEnabled(false);
  setShareStatus("Not shared");
  elements.publicUrlOut.textContent = "—";
  elements.engineLinks.hidden = true;
  elements.engineLinks.textContent = "";
  if (elements.btnRetryUpload) {
    elements.btnRetryUpload.disabled = true;
    elements.btnRetryUpload.hidden = true;
  }
  elements.chkEnableShare.checked = false;
  if (elements.chkShareSafe) elements.chkShareSafe.checked = state.shareSafe;
  elements.srcWhere.value = "";
  elements.srcWhen.value = "";
  elements.srcWho.value = "";
  elements.srcOrig.value = "";
  if (elements.manualNotes) elements.manualNotes.value = "";
  if (elements.confLevel) elements.confLevel.value = "unverified";
  if (elements.mutationOut) elements.mutationOut.textContent = "—";
  if (elements.mutationOut) elements.mutationOut.classList.remove("mut-box");
  if (elements.btnCopyMutations) elements.btnCopyMutations.disabled = true;
  elements.batchOut.textContent = "—";
  elements.btnDownloadBatch.disabled = true;
  if (elements.actionLogOut) {
    elements.actionLogOut.hidden = true;
    elements.actionLogOut.textContent = "";
  }
  setStatus("Idle");
  setStatusLine("");
  elements.btnTogglePretty.textContent = "Pretty: On";
  renderOnboardingStrip();

  try {
    document.dispatchEvent(new Event("osint:file-changed"));
  } catch (error) {
    reportNonFatalError("file-change.dispatch", error, { harmless: true, dedupeMs: 5000 });
  }
}

function openUrl(url) {
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    state.popupLikely = !w;
    renderOnboardingStrip();
    return w;
  } catch {
    state.popupLikely = true;
    renderOnboardingStrip();
    return null;
  }
}

function renderEngineLaunchpad(run) {
  const el = elements.engineLinks;
  if (!el) return;
  const r = run || state.lastEngineRun || loadLastRun();
  if (!r || !r.targets) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }

  state.lastEngineRun = r;
  const ts = r.ts ? new Date(r.ts).toLocaleTimeString() : "";
  const opened = r.opened && typeof r.opened === "object" ? r.opened : {};
  const blocked = r.blocked && typeof r.blocked === "object" ? r.blocked : {};
  const chosen = r.chosen && typeof r.chosen === "object" ? r.chosen : {};

  const chips = ENGINE_ORDER.map((eng) => {
    const url = r.targets?.[eng] || "";
    const on = chosen?.[eng] !== false;
    const st = blocked?.[eng] ? "blocked" : opened?.[eng] ? "opened" : "";
    const title = blocked?.[eng] ? "Popup blocked" : opened?.[eng] ? "Opened" : "Not opened";
    const disabled = url ? "" : "disabled";
    return `
      <label class="engine-chip ${st} ${disabled}" title="${escapeAttr(title)}">
        <input type="checkbox" data-eng="${escapeAttr(eng)}" ${on ? "checked" : ""} ${url ? "" : "disabled"} />
        <span class="ico" aria-hidden="true">${escapeHtml(ENGINE_ICON[eng] || "•")}</span>
        <span class="name">${escapeHtml(ENGINE_LABEL[eng] || eng)}</span>
      </label>
    `;
  }).join("");

  el.classList.add("launchpad");
  el.hidden = false;
  el.innerHTML = `
    <div class="lp-top">
      <div class="lp-title">Launchpad</div>
      <div class="lp-meta">${escapeHtml(ts ? `Last: ${ts}` : "")}</div>
    </div>
    <div class="lp-chips">${chips}</div>
    <div class="lp-actions">
      <button class="btn btn-secondary btn-small" type="button" data-lp-open="chosen" title="Open checked engines">Open chosen</button>
      <button class="btn btn-ghost btn-small" type="button" data-lp-open="all" title="Open all engines">Open all</button>
    </div>
  `;
}

function setupEngineLaunchpad() {
  const el = elements.engineLinks;
  if (!el) return;
  const saved = loadLastRun();
  if (saved) renderEngineLaunchpad(saved);

  el.addEventListener("change", (e) => {
    const inp = e.target;
    if (!(inp instanceof HTMLInputElement)) return;
    const eng = inp.getAttribute("data-eng");
    if (!eng) return;
    const r = state.lastEngineRun || loadLastRun();
    if (!r) return;
    r.chosen = r.chosen && typeof r.chosen === "object" ? r.chosen : {};
    r.chosen[eng] = Boolean(inp.checked);
    state.lastEngineRun = r;
    saveLastRun(r);
  });

  el.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("button[data-lp-open]");
    if (!btn) return;
    const mode = btn.getAttribute("data-lp-open") || "all";
    const r = state.lastEngineRun || loadLastRun();
    if (!r || !r.targets) return;

    const chosen = r.chosen && typeof r.chosen === "object" ? r.chosen : {};
    const openList =
      mode === "chosen"
        ? ENGINE_ORDER.filter((eng) => chosen?.[eng] !== false && r.targets?.[eng])
        : ENGINE_ORDER.filter((eng) => r.targets?.[eng]);

    // Synchronous opens: must stay inside click handler.
    r.opened = {};
    r.blocked = {};
    for (const eng of openList) {
      const url = r.targets[eng];
      try {
        const w = openUrl(url);
        if (w) r.opened[eng] = true;
        else r.blocked[eng] = true;
      } catch {
        r.blocked[eng] = true;
      }
    }

    r.ts = Date.now();
    state.lastEngineRun = r;
    saveLastRun(r);
    renderEngineLaunchpad(r);
    setStatusLine(`Launchpad: opened ${openList.length}${Object.keys(r.blocked).length ? " (some blocked)" : ""}`);
  });
}

function setupSimpleUi() {
  if (!elements.missionPreset) return;
  elements.missionPreset.hidden = false;
  const saved = readStorage(STORAGE_MISSION_PRESET_KEY, "", "ui.missionPreset.read");
  elements.missionPreset.value = saved || "share_search";
  elements.missionPreset.addEventListener("change", () => {
    writeStorage(STORAGE_MISSION_PRESET_KEY, elements.missionPreset.value || "share_search", "ui.missionPreset.write");
  });

  const syncRunLabel = () => {
    if (!elements.btnRunMission || !elements.missionPreset) return;
    const p = elements.missionPreset.value || "fast";
    elements.btnRunMission.textContent = p === "share_search" ? "Upload + Launchpad" : p === "deep" ? "Deep OCR" : "Quick OCR";
  };
  elements.missionPreset.addEventListener("change", syncRunLabel);
  syncRunLabel();
}

function setupGlobalErrorSurface() {
  // If anything explodes, surface it instead of "buttons do nothing".
  window.addEventListener("error", (e) => {
    const msg = e?.message || "Unknown error";
    setStatus("Error");
    setStatusLine(`JS error: ${msg}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const msg = e?.reason?.message || String(e?.reason || "Unknown rejection");
    setStatus("Error");
    setStatusLine(`Promise error: ${msg}`);
  });
}

function newWaitJobId() {
  try {
    return crypto?.randomUUID ? `wait_${crypto.randomUUID()}` : `wait_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  } catch {
    return `wait_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

function publishWaitState(jobId, data) {
  if (!jobId || !data) return;
  try {
    void fetch(`${WAIT_JOB_ENDPOINT_PREFIX}${encodeURIComponent(jobId)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    }).catch((error) => {
      reportNonFatalError("wait.publish.fetch", error, { detail: { jobId }, dedupeMs: 5000 });
    });
  } catch (error) {
    reportNonFatalError("wait.publish.init", error, { detail: { jobId }, dedupeMs: 5000 });
  }
}

function openWaitJob(engine, label) {
  const jobId = newWaitJobId();
  const waitUrl = `/wait.html?job=${encodeURIComponent(jobId)}&engine=${encodeURIComponent(engine)}&label=${encodeURIComponent(label || "")}`;
  openUrl(waitUrl);
  publishWaitState(jobId, { engine, label: label || "", status: "uploading" });
  logAction("wait_tab_opened", `${engine}${label ? ` (${label})` : ""}`);
  return jobId;
}

function isFunModeEnabled() {
  return Boolean(state.funMode);
}

function pulseRadar(kind) {
  const el = elements.radar;
  if (!el || !isFunModeEnabled() || state.operatorMode) return;
  el.classList.toggle("ocr", kind === "ocr");
  el.classList.remove("pulse");
  void el.offsetWidth;
  el.classList.add("pulse");
  window.setTimeout(() => el.classList.remove("pulse"), 950);
}

function setShareStatus(label) {
  elements.sharePill.textContent = label;
  elements.sharePill.classList.toggle("pill-muted", label !== "Shared");
}

function setShareControlsEnabled(fileLoaded) {
  elements.chkEnableShare.disabled = !fileLoaded;
  if (elements.chkShareSafe) elements.chkShareSafe.disabled = !fileLoaded;
  const shareUiEnabled = Boolean(fileLoaded && state.shareEnabled);
  elements.shareProvider.disabled = !shareUiEnabled;
  elements.btnCopyPublicUrl.disabled = !shareUiEnabled || !state.publicUrl;
  if (elements.btnRetryUpload) {
    elements.btnRetryUpload.hidden = !shareUiEnabled;
    elements.btnRetryUpload.disabled = !shareUiEnabled;
  }
}

function loadSession() {
  const fallback = { started_at: Date.now(), uploads_ok: 0, uploads_fail: 0, engines_opened: 0, last_host: "", last_ms: null };
  const raw = readStorage(SESSION_KEY, "", "session.read", sessionStorage);
  const obj = raw ? safeJsonParse(raw, fallback, "session.parse", { harmless: true }) : fallback;
  if (!obj || typeof obj !== "object") return fallback;
  return { ...fallback, ...obj };
}

function loadLastRun() {
  const raw = readStorage(LAST_RUN_KEY, "", "launchpad.read", sessionStorage);
  const obj = raw ? safeJsonParse(raw, null, "launchpad.parse", { harmless: true }) : null;
  if (!obj || typeof obj !== "object") return null;
  if (!obj.targets || typeof obj.targets !== "object") return null;
  return obj;
}

function saveLastRun(run) {
  writeStorage(LAST_RUN_KEY, JSON.stringify(run || null), "launchpad.write", sessionStorage);
}

function saveSession() {
  writeStorage(SESSION_KEY, JSON.stringify(state.session), "session.write", sessionStorage);
}

function fmtMs(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return "—";
  if (n < 1000) return `${Math.round(n)}ms`;
  return `${(n / 1000).toFixed(1)}s`;
}

function triageSignalsForReport(report) {
  const gps = report?.gps && Number.isFinite(report.gps.lat) && Number.isFinite(report.gps.lon);
  // Keep reading the old field from saved cases/reports until they have all been re-exported with metadata_suspicion_score.
  const repost = Number(report?.insights?.metadata_suspicion_score ?? report?.insights?.repost_heuristic ?? report?.insights?.repost_likelihood);
  const hasExif = Boolean(report?.exif && Object.keys(report.exif).length > 0);
  const software = String(report?.key_fields?.software || report?.exif?.Software || "").trim();

  const dims = String(report?.dimensions || "");
  const m = dims.match(/(\d+)\s*[×x]\s*(\d+)/);
  const w = m ? Number(m[1]) : null;
  const h = m ? Number(m[2]) : null;
  const mp = w && h ? (w * h) / 1_000_000 : null;
  const lowRes = mp != null ? mp < 1.0 : false;

  // "Entities" from OCR if available; otherwise from whatever text we have without forcing batch OCR.
  let ent =
    report?.key_fields?.ocr_entities && typeof report.key_fields.ocr_entities === "object"
      ? report.key_fields.ocr_entities
      : null;

  if (!ent && report?.ocr_text) {
    ent = OCR_PIPELINE?.extractEntities?.(String(report.ocr_text)) || null;
  }

  if (!ent) {
    const text = `${report?.file?.name || ""}\n${software}\n${hasExif ? JSON.stringify(report.exif).slice(0, 60_000) : ""}`;
    ent = OCR_PIPELINE?.extractEntities?.(text) || { urls: [], emails: [], handles: [], phones: [] };
  }
  const entCount = (ent.urls?.length || 0) + (ent.emails?.length || 0) + (ent.handles?.length || 0) + (ent.phones?.length || 0);

  // Lead score: prioritize local pivotability + quick-review suspicion cues.
  let lead = 0;
  lead += gps ? 30 : 0;
  lead += Math.min(24, entCount * 6);
  lead += software ? 8 : 0;
  lead += lowRes ? 5 : 0;
  lead += Number.isFinite(repost) ? Math.round((repost / 100) * 10) : 0;
  lead += hasExif ? 4 : 0;

  const tags = [];
  if (gps) tags.push({ t: "GPS", tone: "ok" });
  if (entCount) tags.push({ t: `ENT:${entCount}`, tone: "ok" });
  if (!hasExif) tags.push({ t: "NOEXIF", tone: "warn" });
  if (software) tags.push({ t: "EDITED", tone: repost >= 70 ? "hot" : "warn" });
  if (lowRes) tags.push({ t: "LOWRES", tone: "warn" });
  if (Number.isFinite(repost) && repost >= 80) tags.push({ t: "SUSP↑", tone: "hot" });
  if (report?.ocr_error) tags.push({ t: "OCRERR", tone: "warn" });

  return { lead, gps, repost: Number.isFinite(repost) ? repost : null, software, lowRes, hasExif, ent, entCount, tags, w, h, mp };
}

function clusterBatchItems(items, threshold = DHASH_BATCH_CLUSTER_THRESHOLD) {
  const clusters = [];
  for (const it of items) {
    const dh = it?.report?.hashes?.dhash || "";
    if (!dh) continue;
    let placed = false;
    for (const c of clusters) {
      const d = hammingHex(c.rep, dh);
      if (d != null && d <= threshold) {
        c.items.push(it);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push({ rep: dh, items: [it] });
  }
  clusters.sort((a, b) => b.items.length - a.items.length);
  for (let i = 0; i < clusters.length; i += 1) {
    for (const it of clusters[i].items) it.clusterId = i + 1;
  }
  return clusters;
}

function renderBatchDashboard() {
  const el = elements.batchOut;
  if (!el) return;
  const items = Array.isArray(state.batchItems) ? state.batchItems.filter((x) => x?.report) : [];
  if (items.length === 0) {
    el.textContent = "—";
    return;
  }

  el.classList.add("batchdash");

  // Attach triage signals.
  for (const it of items) {
    if (!it.triage) it.triage = triageSignalsForReport(it.report);
  }

  // Anomaly flags: outliers vs batch medians (size/resolution).
  const mpVals = items.map((x) => x.triage?.mp).filter((x) => Number.isFinite(x));
  const szVals = items.map((x) => x.report?.file?.size_bytes).filter((x) => Number.isFinite(x));
  const median = (arr) => {
    const a = arr.slice().sort((x, y) => x - y);
    if (a.length === 0) return null;
    const mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  };
  const mpMed = median(mpVals);
  const szMed = median(szVals);

  for (const it of items) {
    const t = it.triage;
    t.tags = Array.isArray(t.tags) ? t.tags : [];
    if (mpMed != null && Number.isFinite(t.mp)) {
      if (t.mp <= mpMed * 0.25 || t.mp >= mpMed * 4) t.tags.push({ t: "OUTLIER:RES", tone: "warn" });
    }
    if (szMed != null && Number.isFinite(it.report?.file?.size_bytes)) {
      const s = it.report.file.size_bytes;
      if (s <= szMed * 0.25 || s >= szMed * 4) t.tags.push({ t: "OUTLIER:SIZE", tone: "warn" });
    }
  }

  const clusters = clusterBatchItems(items, DHASH_BATCH_CLUSTER_THRESHOLD);

  const applyFilters = () => {
    const q = String(state.batchUi.query || "").toLowerCase().trim();
    const gpsOnly = Boolean(state.batchUi.gpsOnly);
    const entOnly = Boolean(state.batchUi.entOnly);
    const cl = state.batchUi.cluster;

    return items.filter((it) => {
      const t = it.triage || triageSignalsForReport(it.report);
      if (gpsOnly && !t.gps) return false;
      if (entOnly && !t.entCount) return false;
      if (cl !== "all" && String(it.clusterId || "") !== String(cl)) return false;
      if (q) {
        const hay = `${it.report?.file?.name || ""} ${it.triage?.software || ""} ${(t.ent?.urls || []).join(" ")} ${(t.ent?.handles || []).join(" ")} ${(t.ent?.emails || []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  };

  const sortKey = state.batchUi.sortKey || "lead";
  const sorted = sortBatchItems(applyFilters(), sortKey, state.batchUi.sortDir);

  const head = (k, label) => {
    const arrow = state.batchUi.sortKey === k ? (state.batchUi.sortDir === "asc" ? " ▲" : " ▼") : "";
    return `<th data-sort="${escapeAttr(k)}">${escapeHtml(label)}${arrow}</th>`;
  };

  const clusterChips = clusters
    .slice(0, 12)
    .map((c, idx) => {
      const id = idx + 1;
      const on = String(state.batchUi.cluster) === String(id);
      return `<button class="chip ${on ? "active" : ""}" type="button" data-cluster="${id}" title="Filter cluster">${id}·${c.items.length}</button>`;
    })
    .join("");

  const clusterSummary = clusters
    .slice(0, 6)
    .map((c, idx) => {
      const id = idx + 1;
      const rep = c.items[0];
      const thumb = rep?.thumb ? `<img class="thumb" alt="" src="${escapeAttr(rep.thumb)}" />` : "";
      const name = rep?.report?.file?.name || `Cluster ${id}`;
      return `<div class="cluster-card" title="Filter cluster" data-cluster="${id}">${thumb}<div><div>Cluster ${id}</div><div class="meta">${escapeHtml(name)} · ${c.items.length} items</div></div></div>`;
    })
    .join("");

  const selected = state.batchUi.selected && typeof state.batchUi.selected === "object" ? state.batchUi.selected : {};
  const selectedCount = Object.values(selected).filter(Boolean).length;

  const topBar = `
    <div class="dash-top">
      <div class="dash-filters">
        <input class="dash-input" data-batch-q placeholder="Filter (name/domain/@handle)" value="${escapeAttr(state.batchUi.query || "")}"/>
        <label class="toggle toggle-mini" title="Only items with GPS"><input type="checkbox" data-batch-gps ${state.batchUi.gpsOnly ? "checked" : ""}/><span class="toggle-ui" aria-hidden="true"></span><span class="toggle-text">GPS only</span></label>
        <label class="toggle toggle-mini" title="Only items with entities"><input type="checkbox" data-batch-ent ${state.batchUi.entOnly ? "checked" : ""}/><span class="toggle-ui" aria-hidden="true"></span><span class="toggle-text">Entities only</span></label>
        <button class="btn btn-secondary" type="button" data-batch-open-top title="Open Lens for top 5 by lead score">Open top 5 (Lens)</button>
        <button class="btn btn-secondary" type="button" data-batch-open-sel title="Open Lens searches for selected rows">Open selected (Lens)</button>
        <span class="tag" title="Selected rows">${selectedCount} selected</span>
        <input class="dash-input" style="min-width: 120px" data-batch-ocr-n type="number" min="1" max="20" step="1" value="8" title="How many top candidates to OCR (capped)" />
        <button class="btn btn-secondary" type="button" data-batch-ocr-top title="Run OCR on top candidates and update entity counts">OCR top</button>
      </div>
      <div class="dash-tags">
        <span class="tag">Items: ${sorted.length}/${items.length}</span>
        <span class="tag">Clusters: ${clusters.length}</span>
      </div>
    </div>
    <div class="dash-clusters">
      <button class="chip" type="button" data-cluster="all" title="Clear cluster filter">All</button>
      ${clusterChips || ""}
    </div>
    ${clusterSummary ? `<div class="cluster-summary">${clusterSummary}</div>` : ""}
  `;

  const rows = sorted
    .slice(0, 120)
    .map((it) => {
      const t = it.triage;
      const name = it.report?.file?.name || "image";
      const dims = it.report?.dimensions || "—";
      const rep = t.repost != null ? formatMetadataSuspicionBand(t.repost) : "—";
      const gps = t.gps ? "✓" : "—";
      const ent = t.entCount ? String(t.entCount) : "—";
      const cl = it.clusterId || "—";
      const checked = selected?.[it.id] ? "checked" : "";
      const thumb = it.thumb ? `<img class="thumb" alt="" src="${escapeAttr(it.thumb)}" />` : "";
      const tagHtml = (t.tags || [])
        .slice(0, 4)
        .map((x) => `<span class="tag ${x.tone === "hot" ? "tag-hot" : x.tone === "warn" ? "tag-warn" : ""}">${escapeHtml(x.t)}</span>`)
        .join(" ");
      return `
        <tr>
          <td><input class="selbox" type="checkbox" data-sel="${escapeAttr(it.id)}" ${checked} /></td>
          <td>${escapeHtml(String(t.lead))}</td>
          <td title="${escapeAttr(name)}">${thumb} ${escapeHtml(name)}</td>
          <td>${escapeHtml(dims)}</td>
          <td>${escapeHtml(gps)}</td>
          <td>${escapeHtml(ent)}</td>
          <td>${escapeHtml(rep)}</td>
          <td>${escapeHtml(String(cl))}</td>
          <td><div class="dash-tags">${tagHtml}</div></td>
        </tr>
      `;
    })
    .join("");

  el.innerHTML = `
    ${topBar}
    <table>
      <thead>
        <tr>
          <th>Select</th>
          ${head("lead", "Lead")}
          ${head("name", "Name")}
          ${head("dim", "Dim")}
          ${head("gps", "GPS")}
          ${head("ent", "Ent")}
          ${head("repost", "Metadata suspicion")}
          ${head("cluster", "Cluster")}
          <th>Flags</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  // Wire interactivity (delegated).
  el.onclick = (e) => {
    const sort = e.target?.getAttribute?.("data-sort");
    if (sort) {
      if (state.batchUi.sortKey === sort) state.batchUi.sortDir = state.batchUi.sortDir === "asc" ? "desc" : "asc";
      else {
        state.batchUi.sortKey = sort;
        state.batchUi.sortDir = sort === "name" ? "asc" : "desc";
      }
      renderBatchDashboard();
      return;
    }
    const cl = e.target?.getAttribute?.("data-cluster");
    if (cl) {
      state.batchUi.cluster = cl;
      renderBatchDashboard();
      return;
    }
    const openTop = e.target?.getAttribute?.("data-batch-open-top");
    if (openTop != null) {
      void openBatchTopLens(BATCH_TOP_LENS_DEFAULT);
    }
    const openSel = e.target?.getAttribute?.("data-batch-open-sel");
    if (openSel != null) {
      void openBatchSelectedLens();
    }
    const ocrTop = e.target?.getAttribute?.("data-batch-ocr-top");
    if (ocrTop != null) {
      const nEl = el.querySelector?.("[data-batch-ocr-n]");
      const n = nEl ? Number(nEl.value) : 8;
      void runBatchOcrTopCandidates(n);
    }
  };

  el.onchange = (e) => {
    const id = e.target?.getAttribute?.("data-sel");
    if (!id) return;
    const inp = e.target;
    if (!(inp instanceof HTMLInputElement)) return;
    state.batchUi.selected = state.batchUi.selected && typeof state.batchUi.selected === "object" ? state.batchUi.selected : {};
    state.batchUi.selected[id] = Boolean(inp.checked);
    renderBatchDashboard();
  };

  const qEl = el.querySelector?.("[data-batch-q]");
  if (qEl) {
    qEl.oninput = () => {
      state.batchUi.query = qEl.value || "";
      renderBatchDashboard();
    };
  }
  const gpsEl = el.querySelector?.("[data-batch-gps]");
  if (gpsEl) {
    gpsEl.onchange = () => {
      state.batchUi.gpsOnly = Boolean(gpsEl.checked);
      renderBatchDashboard();
    };
  }
  const entEl = el.querySelector?.("[data-batch-ent]");
  if (entEl) {
    entEl.onchange = () => {
      state.batchUi.entOnly = Boolean(entEl.checked);
      renderBatchDashboard();
    };
  }
}

async function fileToUploadForBatch(file) {
  if (!state.shareSafe) return file;
  // Share-safe for batch: only for small N (top results). Re-encode to strip metadata.
  const standalone = await loadImageStandalone(file);
  const blob = await encodeCleanCopy(standalone.img, file.type);
  URL.revokeObjectURL(standalone.url);
  const clean = cleanFileFromBlob(blob);
  return clean || file;
}

async function openBatchTopLens(n = BATCH_TOP_LENS_DEFAULT) {
  if (state.uiBusy) return;
  const items = Array.isArray(state.batchItems) ? state.batchItems.filter((x) => x?.file && x?.report) : [];
  if (items.length === 0) return;

  // Ensure triage computed.
  for (const it of items) if (!it.triage) it.triage = triageSignalsForReport(it.report);
  const pick = items
    .slice()
    .sort((a, b) => (b.triage?.lead || 0) - (a.triage?.lead || 0))
    .slice(0, Math.max(1, Math.min(BATCH_TOP_LENS_MAX, n)));

  const jobIds = [];
  for (let i = 0; i < pick.length; i += 1) {
    const label = `Batch · Lens · ${pick[i].report?.file?.name || `#${i + 1}`}`;
    jobIds.push(openWaitJob("lens", label));
  }

  await withUiLock("Top lens…", async () => {
    for (let i = 0; i < pick.length; i += 1) {
      try {
        const f = await fileToUploadForBatch(pick[i].file);
        const url = await publicUrlForFile(f, "lens");
        publishWaitState(jobIds[i], { url });
      } catch (e) {
        publishWaitState(jobIds[i], { err: e?.message || "upload failed" });
      }
    }
    setStatus("Ready");
  });
}

async function openBatchSelectedLens() {
  if (state.uiBusy) return;
  const items = Array.isArray(state.batchItems) ? state.batchItems.filter((x) => x?.file && x?.report) : [];
  if (items.length === 0) return;

  const selected = state.batchUi.selected && typeof state.batchUi.selected === "object" ? state.batchUi.selected : {};
  const picked = items.filter((it) => Boolean(selected?.[it.id]));
  if (picked.length === 0) return;

  const cap = Math.min(BATCH_TOP_LENS_MAX, picked.length);
  const pick = picked.slice(0, cap);

  const jobIds = [];
  for (let i = 0; i < pick.length; i += 1) {
    const label = `Batch · Selected · Lens · ${pick[i].report?.file?.name || `#${i + 1}`}`;
    jobIds.push(openWaitJob("lens", label));
  }

  await withUiLock(`Selected lens (${pick.length})…`, async () => {
    for (let i = 0; i < pick.length; i += 1) {
      try {
        const f = await fileToUploadForBatch(pick[i].file);
        const url = await publicUrlForFile(f, "lens");
        publishWaitState(jobIds[i], { url });
      } catch (e) {
        publishWaitState(jobIds[i], { err: e?.message || "upload failed" });
      }
    }
    setStatus("Ready");
  });
}

async function ocrForBatchFile(file, lang) {
  const worker = await getOcrWorker(lang || OCR_DEFAULT_LANGUAGE);
  let enhanced = null;
  const url = URL.createObjectURL(file);
  try {
    try {
      enhanced = await OCR_PIPELINE.preprocessOtsu(url, { maxDim: OCR_BATCH_PREPROCESS_MAX_DIM });
    } catch (error) {
      reportNonFatalError("ocr.batch.preprocess", error, { harmless: true, detail: { file: file?.name || "" }, dedupeMs: 5000 });
      enhanced = null;
    }
    const rr = await worker.recognize(enhanced || file);
    return (rr?.data?.text || "").trim();
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function runBatchOcrTopCandidates(n = BATCH_OCR_DEFAULT) {
  if (state.uiBusy) return;
  const items = Array.isArray(state.batchItems) ? state.batchItems.filter((x) => x?.file && x?.report) : [];
  if (items.length === 0) return;

  const cap = Math.max(1, Math.min(BATCH_OCR_MAX, Number(n) || BATCH_OCR_DEFAULT));
  for (const it of items) if (!it.triage) it.triage = triageSignalsForReport(it.report);

  const pick = items
    .slice()
    .sort((a, b) => (b.triage?.lead || 0) - (a.triage?.lead || 0))
    .slice(0, cap);

  await withUiLock(`Batch OCR (${pick.length})…`, async () => {
    const lang = elements.ocrLang?.value || OCR_DEFAULT_LANGUAGE;
    let failures = 0;
    for (let i = 0; i < pick.length; i += 1) {
      const it = pick[i];
      setStatusLine(`Batch OCR: ${i + 1}/${pick.length} · ${it.report?.file?.name || "image"}`);
      try {
        const text = await ocrForBatchFile(it.file, lang);
        it.report.ocr_text = text || null;
        delete it.report.ocr_error;
        it.report.key_fields = it.report.key_fields || {};
        it.report.key_fields.ocr_entities = text ? OCR_PIPELINE?.extractEntities?.(text) || null : null;
        it.triage = triageSignalsForReport(it.report);
      } catch (e) {
        failures += 1;
        it.report.ocr_error = e?.message || "OCR failed";
        it.triage = triageSignalsForReport(it.report);
      }
      renderBatchDashboard();
    }
    setStatus(failures ? `Batch OCR completed with ${failures} failures` : "Ready");
    setStatusLine(failures ? `Batch OCR: ${pick.length - failures}/${pick.length} ok · ${failures} failed` : "Batch OCR: ✓");
  });
}

async function runMissionPreset(preset) {
  if (!state.file) return;
  if (state.uiBusy) return;
  const p = String(preset || "fast");

  await withUiLock(p === "share_search" ? "Upload + launchpad…" : p === "deep" ? "Deep OCR…" : "Quick OCR…", async () => {
    const base = `Hashes: ✓ · EXIF: ✓`;
    if (p === "fast") {
      setStatusLine(`${base} · OCR: …`);
      try {
        await runOcrForCurrent({ mode: "fast" });
      } catch (e) {
        elements.ocrOut.textContent = formatOcrError(e);
        setOcrStatus("Failed");
        setStatus("OCR failed");
        return;
      }
      setStatusLine(`${base} · OCR: ✓`);
      setStatus("Ready");
      return;
    }

    if (p === "deep") {
      setStatusLine(`${base} · OCR: …`);
      try {
        await runOcrForCurrent({ mode: "deep" });
      } catch (e) {
        elements.ocrOut.textContent = formatOcrError(e);
        setOcrStatus("Failed");
        setStatus("OCR failed");
        return;
      }
      setStatusLine(`${base} · OCR: ✓`);
      setStatus("Ready");
      return;
    }

    if (p === "share_search") {
      // Reduce popup chaos: open ONE tab (Lens) + render launchpad for the rest.
      const engines = ["lens", "bing", "tineye", "yandex", "google_images"];
      const jobId = openWaitJob("lens", "Mission · Lens");

      if (!state.shareEnabled) {
        state.shareEnabled = true;
        elements.chkEnableShare.checked = true;
        setShareControlsEnabled(true);
      }

      setStatusLine("Upload: … · Lens: …");
      const url = await ensurePublicUrl({ purpose: "lens" });
      publishWaitState(jobId, { url });

      const targets = engines.map((e) => reverseSearchUrl(e, url));
      const run = {
        ts: Date.now(),
        url,
        token: jobId,
        artifact: state.publicUrlArtifact || "original",
        targets: {
          lens: targets[0],
          bing: targets[1],
          tineye: targets[2],
          yandex: targets[3],
          google_images: targets[4],
        },
        chosen: { lens: true, bing: true, tineye: true, yandex: true, google_images: true },
        opened: { lens: true },
        blocked: {},
      };
      state.lastEngineRun = run;
      saveLastRun(run);
      renderEngineLaunchpad(run);
      logAction("launchpad_prepared", `targets=${Object.keys(run.targets || {}).length} artifact=${run.artifact}`);

      state.session = loadSession();
      state.session.engines_opened += 1;
      saveSession();
      void refreshHostStats();

      setStatusLine("Upload: ✓ · Lens: ✓ · Launchpad ready");
      setStatus("Ready");
    }
  });
}

async function refreshHostStats() {
  if (!elements.hostStatsOut) return;
  try {
    const controller = new AbortController();
    const t = window.setTimeout(() => controller.abort(), HOST_STATS_REFRESH_TIMEOUT_MS);
    const res = await fetch("/api/upload-stats", { cache: "no-store", signal: controller.signal });
    window.clearTimeout(t);
    if (!res.ok) throw new Error("no server");
    const obj = await res.json();
    const stats = obj?.stats && typeof obj.stats === "object" ? obj.stats : {};

    const rows = Object.entries(stats)
      .map(([host, v]) => {
        const ok = Number(v?.ok || 0);
        const fail = Number(v?.fail || 0);
        const avgMs = Number(v?.avgMs || 0);
        const attempts = ok + fail;
        return { host, ok, fail, avgMs, attempts };
      })
      .filter((row) => row.attempts > 0)
      .sort((a, b) => b.attempts - a.attempts || a.avgMs - b.avgMs);

    const session = state.session || loadSession();
    const sessionAttempts = session.uploads_ok + session.uploads_fail;
    if (!rows.length && sessionAttempts === 0) {
      elements.hostStatsOut.hidden = true;
      return;
    }
    const lines = [
      `Upload stats (session-only diagnostic): engines ${session.engines_opened} · uploads ok ${session.uploads_ok} · fail ${session.uploads_fail} · last ${session.last_host || "—"} ${fmtMs(session.last_ms)}`,
      rows.length ? `Hosts: ${rows.map((r) => `${r.host} ok ${r.ok} · fail ${r.fail} · avg ${fmtMs(r.avgMs)}`).join(" · ")}` : "Hosts: no completed upload samples yet",
    ];

    elements.hostStatsOut.textContent = lines.join("\n");
    elements.hostStatsOut.hidden = false;
  } catch (error) {
    reportNonFatalError("host-stats.refresh", error, { harmless: true, dedupeMs: 5000 });
    elements.hostStatsOut.hidden = true;
  }
}

const reverseSearchUrl = (engine, imageUrl) => OSINT_LIB?.reverseSearchUrl?.(engine, imageUrl) || "";
const reverseSearchUploadPage = (engine) => OSINT_LIB?.reverseSearchUploadPage?.(engine) || "about:blank";

async function uploadViaLocalProxy(file, purpose = "") {
  // Prefer local proxy to avoid CORS limitations in browsers when posting to third-party hosts.
  const ab = await file.arrayBuffer();
  const controller = new AbortController();
  const t = window.setTimeout(() => controller.abort(), UPLOAD_PROXY_TIMEOUT_MS);
  let res;
  try {
    res = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "content-type": file.type || "application/octet-stream",
        "x-filename": file.name || "image",
        ...(purpose ? { "x-purpose": String(purpose) } : {}),
      },
      body: ab,
      signal: controller.signal,
    });
  } catch (error) {
    window.clearTimeout(t);
    state.session = loadSession();
    state.session.uploads_fail += 1;
    saveSession();
    void refreshHostStats();
    reportNonFatalError("upload.proxy.fetch", error, { detail: { purpose }, dedupeMs: 5000 });
    throw new Error("Local upload endpoint unreachable. Start `node server.js` and reload.");
  }
  window.clearTimeout(t);

  const txt = (await res.text()).trim();
  const parsed = txt ? safeJsonParse(txt, null, "upload.proxy.parse", { harmless: true, detail: { status: res.status } }) : null;

  if (!res.ok) {
    state.session = loadSession();
    state.session.uploads_fail += 1;
    saveSession();
    void refreshHostStats();
    if (res.status === 404) {
      throw new Error("Local upload endpoint not running. Start `node server.js` and reload.");
    }
    if (parsed && typeof parsed === "object") {
      const details = Array.isArray(parsed.details) ? `\n\n${parsed.details.join("\n")}` : "";
      throw new Error(`Local upload failed (${res.status}).${details}`);
    }
    const detail = txt ? `\n\n${txt}` : "";
    throw new Error(`Local upload failed (${res.status}).${detail}`);
  }

  if (parsed && typeof parsed === "object" && parsed.url) {
    const host = parsed.host || null;
    state.uploadMeta = {
      host,
      ms: parsed.ms || null,
      attempts: parsed.attempts || null,
      created_at: new Date().toISOString(),
      purpose: purpose || null,
      expected_expiry_window: uploadExpiryWindowForHost(host),
      retention_note: uploadRetentionNoteForHost(host),
      temporary_external_artifact: true,
      temporary_external_artifact_warning: TEMP_EXTERNAL_ARTIFACT_WARNING,
    };
    state.session = loadSession();
    state.session.uploads_ok += 1;
    state.session.last_host = String(parsed.host || "");
    state.session.last_ms = Number.isFinite(parsed.ms) ? Number(parsed.ms) : null;
    saveSession();
    void refreshHostStats();
    return String(parsed.url);
  }

  const first = txt.split(/\s+/)[0];
  if (!/^https?:\/\//i.test(first)) throw new Error("Local proxy returned an unexpected response");
  state.uploadMeta = null;
  return first;
}

async function publicUrlForFile(file, purpose = "") {
  // For reliability, prefer the local proxy (it handles multi-host failover).
  return await uploadViaLocalProxy(file, purpose);
}

async function ensurePublicUrl({ purpose = "" } = {}) {
  if (!state.file) throw new Error("No file loaded");
  const normalizedPurpose = purpose ? String(purpose).toLowerCase() : "";

  const artifactWanted = state.shareSafe ? "clean" : "original";
  if (
    state.publicUrl &&
    (!normalizedPurpose || normalizedPurpose === state.publicUrlPurpose) &&
    (state.publicUrlArtifact || "original") === artifactWanted
  ) {
    return state.publicUrl;
  }
  if (!state.shareEnabled) throw new Error("Sharing disabled");
  if (state.uploading) throw new Error("Upload in progress");

  // If caller asks for a purpose-specific URL (e.g., Lens-friendly host), re-upload when needed.
  if (state.publicUrl && normalizedPurpose && normalizedPurpose !== state.publicUrlPurpose) {
    state.publicUrl = "";
    state.publicUrlPurpose = "";
  }

  if (state.publicUrl && (state.publicUrlArtifact || "original") !== artifactWanted) {
    state.publicUrl = "";
    state.publicUrlArtifact = artifactWanted;
  }

  state.uploading = true;
  setShareStatus("Uploading...");
  elements.publicUrlOut.textContent = "Uploading...";
  elements.engineLinks.hidden = true;

  try {
    // Quick preflight so we don't open a bunch of dead-end tabs.
    try {
      const controller = new AbortController();
      const t = window.setTimeout(() => controller.abort(), UPLOAD_PREFLIGHT_TIMEOUT_MS);
      const r = await fetch("/api/ping", { cache: "no-store", signal: controller.signal });
      window.clearTimeout(t);
      if (!r.ok) throw new Error("ping failed");
    } catch (error) {
      reportNonFatalError("upload.preflight", error, { harmless: true, dedupeMs: 5000 });
      throw new Error("Local server not running. Start `node server.js` and reload.");
    }

    const provider = elements.shareProvider.value;

    const ensureCleanCopyFile = async () => {
      if (!state.file) throw new Error("No file loaded");
      if (!state.cleanBlob) {
        if (!state.objectUrl) throw new Error("No image decoded yet");
        const img = await new Promise((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = reject;
          el.src = state.objectUrl;
        });
        state.cleanBlob = await encodeCleanCopy(img, state.file.type);
        if (state.cleanBlob) {
          try {
            await computeCleanSignalsFromBlob(state.cleanBlob);
          } catch (error) {
            reportNonFatalError("clean-signals.compute", error, { harmless: true, dedupeMs: 5000 });
            state.cleanSignals = null;
            renderCleanSignals();
          }
        }
      }
      const cleanFile = cleanFileFromBlob(state.cleanBlob);
      if (!cleanFile) throw new Error("Clean copy unavailable");
      return cleanFile;
    };

    const uploadFile = artifactWanted === "clean" ? await ensureCleanCopyFile() : state.file;
    const url =
      provider === "0x0"
        ? await publicUrlForFile(uploadFile, normalizedPurpose)
        : "";
    if (!url) throw new Error("Unsupported provider");
    state.publicUrl = url;
    state.publicUrlPurpose = normalizedPurpose;
    state.publicUrlArtifact = artifactWanted;
    if (state.uploadMeta?.host && Number.isFinite(state.uploadMeta?.ms)) {
      elements.publicUrlOut.textContent = `${url}\n\nArtifact: ${artifactWanted}\nHost: ${state.uploadMeta.host} (${Math.round(state.uploadMeta.ms)}ms)`;
    } else {
      elements.publicUrlOut.textContent = `${url}\n\nArtifact: ${artifactWanted}`;
    }
    elements.btnCopyPublicUrl.disabled = false;
    if (elements.btnRetryUpload) elements.btnRetryUpload.disabled = false;
    setShareStatus("Shared");
    logAction("upload_ready", `host=${state.uploadMeta?.host || "unknown"} artifact=${artifactWanted}`);
    return url;
  } catch (e) {
    const msg = e?.message || "Upload failed";
    elements.publicUrlOut.textContent = `Upload failed: ${msg}`;
    if (elements.btnRetryUpload) {
      elements.btnRetryUpload.hidden = false;
      elements.btnRetryUpload.disabled = false;
    }
    setShareStatus("Upload failed");
    throw e;
  } finally {
    state.uploading = false;
  }
}

async function handleQuickJump(engine) {
  if (!state.file) return;
  if (state.uiBusy) return;

  if (!state.shareEnabled) {
    const ok = window.confirm(
      "To open reverse-search provider pages from one click, this will upload your image to a temporary file host to generate a public URL. Allow the upload?",
    );
    if (!ok) {
      openUrl(reverseSearchUploadPage(engine));
      return;
    }
    state.shareEnabled = true;
    elements.chkEnableShare.checked = true;
    setShareControlsEnabled(true);
  }

  // Popup blockers: open a wait tab immediately, then upload.
  const jobId = newWaitJobId();
  const label =
    engine === "lens"
      ? "Lens"
      : engine === "bing"
        ? "Bing"
        : engine === "tineye"
          ? "TinEye"
          : engine === "yandex"
            ? "Yandex"
            : "Google Images";
  const waitUrl = `/wait.html?job=${encodeURIComponent(jobId)}&engine=${encodeURIComponent(engine)}&label=${encodeURIComponent(label)}`;
  openUrl(waitUrl);
  state.session = loadSession();
  state.session.engines_opened += 1;
  saveSession();
  void refreshHostStats();
  publishWaitState(jobId, { engine, label, status: "uploading" });

  await withUiLock("Uploading…", async () => {
    try {
      const url = await ensurePublicUrl({ purpose: engine === "lens" ? "lens" : "" });
      publishWaitState(jobId, { url });
      setStatus("Ready");
    } catch (e) {
      const msg = e?.message || "unknown error";
      setShareStatus("Upload failed");
      elements.publicUrlOut.textContent = `Upload failed: ${msg}`;
      publishWaitState(jobId, { err: msg });
      openUrl(reverseSearchUploadPage(engine));
    }
  });
}

async function handleSearchAll({ autoEnableShare = false, openLens = true } = {}) {
  if (!state.file) return;
  if (state.uiBusy) return;

  const engines = ["lens", "bing", "tineye", "yandex", "google_images"];
  const jobId = openLens ? openWaitJob("lens", "Lens") : "";

  if (!state.shareEnabled) {
    if (!autoEnableShare) {
      const ok = window.confirm(
        "To prepare provider links from one upload, this will upload your image to a temporary file host to generate a public URL. Allow the upload?",
      );
      if (!ok) return;
    }
    state.shareEnabled = true;
    elements.chkEnableShare.checked = true;
    setShareControlsEnabled(true);
  }

  await withUiLock("Preparing engine links…", async () => {
    const url = await ensurePublicUrl({ purpose: "lens" });
    if (jobId) publishWaitState(jobId, { url });

    const targets = engines.map((e) => reverseSearchUrl(e, url));
    const run = {
      ts: Date.now(),
      url,
      token: jobId,
      artifact: state.publicUrlArtifact || "original",
      targets: {
        lens: targets[0],
        bing: targets[1],
        tineye: targets[2],
        yandex: targets[3],
        google_images: targets[4],
      },
      chosen: { lens: true, bing: true, tineye: true, yandex: true, google_images: true },
      opened: openLens ? { lens: true } : {},
      blocked: {},
    };
    state.lastEngineRun = run;
    saveLastRun(run);
    renderEngineLaunchpad(run);
    logAction("launchpad_prepared", `targets=${Object.keys(run.targets || {}).length} artifact=${run.artifact}`);

    state.session = loadSession();
    if (openLens) state.session.engines_opened += 1;
    saveSession();
    void refreshHostStats();

    triggerGlitterStorm(68);
    setStatus("Ready");
  }).catch((e) => {
    setShareStatus("Upload failed");
    const msg = e?.message || "unknown error";
    elements.publicUrlOut.textContent = `Upload failed: ${msg}`;
    if (jobId) publishWaitState(jobId, { err: msg });
  });
}

function wireReverseSearchButtons() {
  elements.btnSearchAll.addEventListener("click", () => void handleSearchAll());
  elements.btnOpenLens.addEventListener("click", () => void handleQuickJump("lens"));
  elements.btnOpenBing.addEventListener("click", () => void handleQuickJump("bing"));
  elements.btnOpenTineye.addEventListener("click", () => void handleQuickJump("tineye"));
  elements.btnOpenYandex.addEventListener("click", () => void handleQuickJump("yandex"));
  elements.btnOpenGoogleImages.addEventListener("click", () => void handleQuickJump("google_images"));
}

async function loadImageFromFile(file) {
  const url = URL.createObjectURL(file);
  state.objectUrl = url;

  elements.previewImg.src = url;
  elements.previewImg.onload = () => {
    elements.previewImg.style.display = "block";
    elements.previewEmpty.style.display = "none";
  };

  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadImageStandalone(file) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = url;
  });
  return { url, img };
}

async function canvasToBlob(canvas, type, quality) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new Error("Failed to encode image");
  return blob;
}

async function generateMutationFiles() {
  if (!state.file || !state.objectUrl) throw new Error("No image loaded");
  const baseName = (state.file.name || "image").replace(/\.[^/.]+$/, "");

  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = state.objectUrl;
  });

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const outType = "image/jpeg";
  const q = 0.92;

  const makeCanvas = () => {
    const c = document.createElement("canvas");
    c.width = iw;
    c.height = ih;
    const ctx = c.getContext("2d");
    return { c, ctx };
  };

  // 1) Center crop (85%) scaled back to original size.
  const crop = makeCanvas();
  const sw = Math.floor(iw * 0.85);
  const sh = Math.floor(ih * 0.85);
  const sx = Math.floor((iw - sw) / 2);
  const sy = Math.floor((ih - sh) / 2);
  crop.ctx.drawImage(img, sx, sy, sw, sh, 0, 0, iw, ih);

  // 2) Slight rotate (+3.5deg) with edge fill.
  const rot = makeCanvas();
  rot.ctx.fillStyle = "#06172d";
  rot.ctx.fillRect(0, 0, iw, ih);
  rot.ctx.translate(iw / 2, ih / 2);
  rot.ctx.rotate((3.5 * Math.PI) / 180);
  rot.ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
  rot.ctx.setTransform(1, 0, 0, 1, 0, 0);

  // 3) Low contrast / slight desat.
  const low = makeCanvas();
  low.ctx.filter = "contrast(70%) brightness(98%) saturate(80%)";
  low.ctx.drawImage(img, 0, 0, iw, ih);
  low.ctx.filter = "none";

  const blobs = await Promise.all([
    canvasToBlob(crop.c, outType, q),
    canvasToBlob(rot.c, outType, q),
    canvasToBlob(low.c, outType, q),
  ]);

  const files = [
    new File([blobs[0]], `${baseName}_mut_crop.jpg`, { type: outType }),
    new File([blobs[1]], `${baseName}_mut_rot.jpg`, { type: outType }),
    new File([blobs[2]], `${baseName}_mut_lowc.jpg`, { type: outType }),
  ];

  return [
    { label: "Crop", file: files[0] },
    { label: "Rotate", file: files[1] },
    { label: "Low-contrast", file: files[2] },
  ];
}

function clusterByDhash(items, threshold = DHASH_MUTATION_CLUSTER_THRESHOLD) {
  const clusters = [];
  for (const it of items) {
    const dh = it?.dhash || "";
    let placed = false;
    for (const c of clusters) {
      const rep = c.rep || "";
      const dist = rep && dh ? hammingHex(rep, dh) : null;
      if (dist != null && dist <= threshold) {
        c.items.push(it);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push({ rep: dh, items: [it] });
  }
  return clusters;
}

function renderMutationSummary(entries) {
  const el = elements.mutationOut;
  if (!el) return;
  const rows = Array.isArray(entries) ? entries : [];
  if (rows.length === 0) {
    el.textContent = "—";
    return;
  }

  const engines = ["lens", "bing", "tineye", "yandex", "google_images"];
  const engineLabel = (e) =>
    e === "lens" ? "Lens" : e === "bing" ? "Bing" : e === "tineye" ? "TinEye" : e === "yandex" ? "Yandex" : "Google";
  const analystAnnotationRank = (value) => (value === "best" ? 2 : value === "possible" ? 1 : 0);
  const getEngineReviewValue = (row, engine) => {
    const raw = row?.engine_review?.[engine] || row?.score?.[engine] || "review";
    return raw === "hit" ? "match" : raw === "no" ? "no_match" : raw;
  };

  const pickWinner = (engine) => {
    const hits = rows
      .filter((r) => getEngineReviewValue(r, engine) === "match")
      .sort((a, b) => {
        const ca = analystAnnotationRank(a.analyst_annotation || a.confidence);
        const cb = analystAnnotationRank(b.analyst_annotation || b.confidence);
        return cb - ca;
      });
    return hits[0] || null;
  };

  const wins = engines
    .map((e) => {
      const w = pickWinner(e);
      return `${engineLabel(e)}=${w ? w.label || "Variant" : "—"}`;
    })
    .join(" · ");

  const byCluster = new Map();
  for (const r of rows) {
    const k = Number(r.cluster || 0) || 0;
    if (!byCluster.has(k)) byCluster.set(k, []);
    byCluster.get(k).push(r);
  }

  const clusters = Array.from(byCluster.entries()).sort((a, b) => a[0] - b[0]);
  const parts = [];
  parts.push(`<div class="mut-wins">Analyst review board: ${escapeHtml(wins)}</div>`);
  parts.push(`<div class="mut-wins">Manual notes only — BlueLens does not score reverse-search results automatically.</div>`);
  for (const [clusterId, items] of clusters) {
    const title = clusterId ? `Cluster ${clusterId}` : "Cluster";
    parts.push(`<div class="mut-cluster"><div class="mut-title">${title}</div>`);
    for (const r of items) {
      const status = r.status === "ok" ? "OK" : r.status === "fail" ? "FAIL" : r.status === "uploading" ? "UP" : "—";
      const dist = r.base_hamming != null ? `${r.base_hamming}` : "—";
      const url = r.url && /^https?:\/\//i.test(r.url) ? r.url : "";
      const lens = url ? reverseSearchUrl("lens", url) : "";
      const analystAnnotation = r.analyst_annotation || r.confidence || "unreviewed";
      const disabled = r.status !== "ok" ? "disabled" : "";
      const score = r.engine_review && typeof r.engine_review === "object" ? r.engine_review : r.score && typeof r.score === "object" ? r.score : {};

      parts.push(`<div class="mut-row">`);
      parts.push(`<div class="mut-a"><span class="mut-tag">${status}</span> <span class="mut-label">${escapeHtml(r.label || "Variant")}</span></div>`);
      parts.push(`<div class="mut-b">Δ ${escapeHtml(dist)}</div>`);
      parts.push(
        `<div class="mut-c"><select class="select mut-select" data-mut="${escapeAttr(r.id || "")}" ${disabled}>` +
          `<option value="unreviewed"${analystAnnotation === "unreviewed" ? " selected" : ""}>Unreviewed</option>` +
          `<option value="possible"${analystAnnotation === "possible" ? " selected" : ""}>Possible</option>` +
          `<option value="best"${analystAnnotation === "best" ? " selected" : ""}>Best</option>` +
          `</select></div>`,
      );

      const scoreCells = engines
        .map((eng) => {
          const v = getEngineReviewValue({ engine_review: score }, eng);
          const dis = r.status !== "ok" ? "disabled" : "";
          return (
            `<label class="mut-cell" title="Analyst review for ${engineLabel(eng)}">` +
            `<span class="mut-e">${engineLabel(eng).slice(0, 1)}</span>` +
            `<select class="select mut-hit" data-mut="${escapeAttr(r.id || "")}" data-eng="${escapeAttr(eng)}" ${dis}>` +
            `<option value="review"${v === "review" ? " selected" : ""}>Review</option>` +
            `<option value="match"${v === "match" ? " selected" : ""}>Match</option>` +
            `<option value="no_match"${v === "no_match" ? " selected" : ""}>No</option>` +
            `</select>` +
            `</label>`
          );
        })
        .join("");

      parts.push(
        `<div class="mut-d">` +
          (lens
            ? `<a class="mut-link" target="_blank" rel="noreferrer" href="${escapeAttr(lens)}">Lens</a>`
            : `<span class="mut-muted">—</span>`) +
          (url ? `<button class="mut-link mut-openall" type="button" data-openall="${escapeAttr(r.id || "")}">All</button>` : "") +
          `<div class="mut-score">${scoreCells}</div>` +
          `</div>`,
      );
      parts.push(`</div>`);
    }
    parts.push(`</div>`);
  }

  el.classList.add("mut-box");
  el.innerHTML = parts.join("");

  // Wire analyst annotation selectors.
  el.querySelectorAll?.("select.mut-select")?.forEach?.((sel) => {
    sel.addEventListener("change", () => {
      const id = sel.getAttribute("data-mut") || "";
      const v = sel.value || "unreviewed";
      const m = state.mutations?.find?.((x) => String(x.id) === String(id));
      if (m) m.analyst_annotation = v;
    });
  });

  // Wire per-engine analyst review selectors.
  el.querySelectorAll?.("select.mut-hit")?.forEach?.((sel) => {
    sel.addEventListener("change", () => {
      const id = sel.getAttribute("data-mut") || "";
      const eng = sel.getAttribute("data-eng") || "";
      const v = sel.value || "review";
      const m = state.mutations?.find?.((x) => String(x.id) === String(id));
      if (!m) return;
      m.engine_review = m.engine_review && typeof m.engine_review === "object" ? m.engine_review : {};
      m.engine_review[eng] = v;
      // update wins line without rebuilding everything
      renderMutationSummary(state.mutations);
    });
  });

  // Wire open-all per variant.
  el.querySelectorAll?.("button.mut-openall")?.forEach?.((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-openall") || "";
      const m = state.mutations?.find?.((x) => String(x.id) === String(id));
      if (!m?.url) return;
      for (const eng of engines) {
        const t = reverseSearchUrl(eng, m.url);
        if (t) window.open(t, "_blank", "noopener,noreferrer");
      }
    });
  });
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/`/g, "&#96;");
}

function buildPivotSearchUrlsFromEntities(ent) {
  const google = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  const urls = new Set();
  const add = (u) => {
    if (!u) return;
    urls.add(u);
  };
  for (const u of (ent?.urls || []).slice(0, 5)) add(u);
  for (const e of (ent?.emails || []).slice(0, 6)) add(google(`"${e}"`));
  for (const p of (ent?.phones || []).slice(0, 4)) add(google(`"${p}"`));
  for (const hRaw of (ent?.handles || []).slice(0, 8)) {
    const h = String(hRaw || "").replace(/^@/, "").trim();
    if (!h) continue;
    add(google(`@${h}`));
    add(`https://www.instagram.com/${encodeURIComponent(h)}/`);
    add(`https://www.tiktok.com/@${encodeURIComponent(h)}`);
    add(`https://x.com/${encodeURIComponent(h)}`);
  }
  for (const u of (ent?.urls || []).slice(0, 10)) {
    try {
      const parsed = new URL(u);
      const host = (parsed.hostname || "").replace(/^www\./i, "");
      if (!host) continue;
      add(google(`site:${host}`));
      add(`https://www.whois.com/whois/${encodeURIComponent(host)}`);
      add(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`);
      add(`https://crt.sh/?q=${encodeURIComponent(host)}`);
    } catch (error) {
      reportNonFatalError("pivot.domains.parse", error, { harmless: true, detail: { value: u }, dedupeMs: 5000 });
    }
  }
  return Array.from(urls);
}

function buildMarkdownReport(report) {
  const r = report || {};
  const file = r.file || {};
  const clean = r.clean_copy || null;
  const gps = r.gps;
  const kf = r.key_fields || {};
  const capturedAt = kf.captured_at || null;
  const sr = r.source_reliability || {};
  const entities = kf.ocr_entities || {};
  const upload = r.upload || {};
  const sourceReviewEntries = Array.isArray(sr.review_entries) ? sr.review_entries : [];
  const ocrReviewEntries = Array.isArray(kf.ocr_entity_review_entries) ? kf.ocr_entity_review_entries : [];

  const lines = [];
  lines.push(`# OSINT Report`);
  lines.push(`Generated: ${r.generated_at || "—"}`);
  lines.push(`Schema: ${r.schema_version || EXPORT_SCHEMA_VERSION} · App: ${r.app_version || APP_VERSION}`);
  lines.push("");
  lines.push(`## File`);
  lines.push(`- Name: \`${file.name || "—"}\``);
  lines.push(`- Type: \`${file.type || "—"}\``);
  lines.push(`- Size: \`${file.size_bytes != null ? formatBytes(file.size_bytes) : "—"}\``);
  lines.push(`- Dimensions: \`${r.dimensions || "—"}\``);
  lines.push("");
  lines.push(`## Signals`);
  lines.push(`- SHA-256: \`${r.hashes?.sha256 || "—"}\``);
  lines.push(`- MD5: \`${r.hashes?.md5 || "—"}\``);
  lines.push(`- dHash: \`${r.hashes?.dhash || "—"}\``);
  if (clean) {
    lines.push(`- Clean SHA-256: \`${clean.sha256 || "—"}\``);
    lines.push(`- Clean MD5: \`${clean.md5 || "—"}\``);
    lines.push(`- Clean dHash: \`${clean.dhash || "—"}\``);
  }
  lines.push("");
  lines.push(`## Key Fields`);
  lines.push(`- Captured: ${capturedAt?.display ? `\`${capturedAt.display}\`` : kf.captured ? `\`${kf.captured}\`` : "—"}`);
  if (capturedAt?.raw) lines.push(`- Captured raw: \`${capturedAt.raw}\``);
  if (capturedAt?.source_field) lines.push(`- Capture source: \`${capturedAt.source_field}\``);
  if (capturedAt?.timezone_note) lines.push(`- Capture timezone note: ${capturedAt.timezone_note}`);
  lines.push(`- Camera: ${kf.camera ? `\`${kf.camera}\`` : "—"}`);
  lines.push(`- Software: ${kf.software ? `\`${kf.software}\`` : "—"}`);
  lines.push(`- GPS: ${gps ? `\`${fmtCoord(gps.lat)}, ${fmtCoord(gps.lon)}\`` : "—"}`);
  lines.push("");
  lines.push(`## Insights`);
  const suspicionScore = r.insights?.metadata_suspicion_score ?? r.insights?.repost_heuristic ?? null;
  const suspicionBand = r.insights?.metadata_suspicion_band || formatMetadataSuspicionBand(Number(suspicionScore));
  lines.push(`- Metadata suspicion: ${suspicionBand !== "—" ? `**${suspicionBand}**` : "—"}`);
  const suspicionInputs = r.insights?.metadata_suspicion_inputs || r.insights?.repost_reasons;
  if (Array.isArray(suspicionInputs) && suspicionInputs.length) {
    lines.push(`- Suspicion inputs: ${suspicionInputs.map((x) => `\`${String(x)}\``).join(" · ")}`);
  }
  if (r.insights?.attribution_hints) lines.push(`- Attribution hints: ${String(r.insights.attribution_hints)}`);
  lines.push("");
  lines.push(`## Public URL`);
  lines.push(`- URL: ${r.public_url ? `${r.public_url}` : "—"}`);
  lines.push(`- Upload artifact: \`${r.public_upload_artifact || "—"}\``);
  lines.push(`- Share safe: \`${r.share_safe ? "on" : "off"}\``);
  lines.push(`- Upload host: \`${upload.host || "—"}\``);
  lines.push(`- Created: ${upload.created_at ? `\`${upload.created_at}\`` : "—"}`);
  lines.push(`- Purpose: ${upload.purpose ? `\`${upload.purpose}\`` : "—"}`);
  lines.push(`- Expected expiry window: ${upload.expected_expiry_window ? `\`${upload.expected_expiry_window}\`` : "—"}`);
  lines.push(`- Retention note: ${upload.retention_note || "—"}`);
  lines.push(`- Warning: ${upload.temporary_external_artifact_warning || "—"}`);
  if (r.export_metadata?.runtime_config_fingerprint) lines.push(`- Runtime fingerprint: \`${r.export_metadata.runtime_config_fingerprint}\``);
  lines.push("");
  lines.push(`## OCR Pivots`);
  const u = Array.isArray(entities.urls) ? entities.urls.slice(0, 8) : [];
  const e = Array.isArray(entities.emails) ? entities.emails.slice(0, 8) : [];
  const h = Array.isArray(entities.handles) ? entities.handles.slice(0, 8) : [];
  const p = Array.isArray(entities.phones) ? entities.phones.slice(0, 6) : [];
  lines.push(`- URLs: ${u.length ? u.map((x) => x).join(" · ") : "—"}`);
  lines.push(`- Emails: ${e.length ? e.map((x) => `\`${x}\``).join(" · ") : "—"}`);
  lines.push(`- Handles: ${h.length ? h.map((x) => `\`${x}\``).join(" · ") : "—"}`);
  lines.push(`- Phones: ${p.length ? p.map((x) => `\`${x}\``).join(" · ") : "—"}`);
  lines.push(`- Review entry count: \`${ocrReviewEntries.length}\``);
  lines.push("");
  lines.push(`### OCR Annotation History`);
  lines.push(formatReviewHistory(ocrReviewEntries));
  lines.push("");
  lines.push(`## Source Reliability`);
  lines.push(`- Where: ${sr.where_obtained ? `\`${sr.where_obtained}\`` : "—"}`);
  lines.push(`- When: ${sr.when_obtained ? `\`${sr.when_obtained}\`` : "—"}`);
  lines.push(`- Who: ${sr.who_provided ? `\`${sr.who_provided}\`` : "—"}`);
  lines.push(`- Original filename: ${sr.original_filename ? `\`${sr.original_filename}\`` : "—"}`);
  lines.push(`- Analyst confidence (manual): \`${sr.analyst_confidence || "unverified"}\``);
  lines.push(`- Manual notes: ${sr.manual_notes ? `\`${sr.manual_notes}\`` : "—"}`);
  lines.push("");
  lines.push(`### Source Review History`);
  lines.push(formatReviewHistory(sourceReviewEntries));
  lines.push("");
  lines.push(`## Launchpad`);
  const targets = r.launchpad?.targets || {};
  const targetList = Object.entries(targets)
    .filter(([, value]) => value)
    .map(([key, value]) => `\`${key}\`: ${value}`);
  lines.push(`- Targets: ${targetList.length ? targetList.join(" · ") : "—"}`);
  lines.push(`- OCR mode: \`${r.ocr?.mode || "—"}\``);
  lines.push(`- OCR language: \`${r.ocr?.selected_model || "—"}\``);
  lines.push("");
  lines.push(`## Action Log`);
  const actionLog = Array.isArray(r.session_action_log) ? r.session_action_log : [];
  lines.push(actionLog.length ? actionLog.map((row) => `- ${row.ts || "—"} · ${row.event || "event"}${row.detail ? ` · ${row.detail}` : ""}`).join("\n") : "- —");
  lines.push("");
  lines.push(`---`);
  lines.push("");
  lines.push(`### Raw JSON`);
  lines.push("```json");
  try {
    lines.push(JSON.stringify(r, null, 2));
  } catch {
    lines.push("{}");
  }
  lines.push("```");
  return lines.join("\n");
}

function toGrayscaleLuma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function computeDHash(img) {
  const canvas = document.createElement("canvas");
  const w = 9;
  const h = 8;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const bits = [];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w - 1; x += 1) {
      const idxA = (y * w + x) * 4;
      const idxB = (y * w + (x + 1)) * 4;
      const a = toGrayscaleLuma(data[idxA], data[idxA + 1], data[idxA + 2]);
      const b = toGrayscaleLuma(data[idxB], data[idxB + 1], data[idxB + 2]);
      bits.push(a > b ? 1 : 0);
    }
  }

  // Convert 64 bits -> 16 hex chars
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
    hex += nibble.toString(16);
  }
  return hex;
}

async function parseExif(file) {
  if (!window.exifr) return null;
  try {
    // Keep it practical (OSINT-relevant), without pulling huge ICC/XMP blobs by default.
    return await exifr.parse(file, {
      gps: true,
      xmp: true,
      iptc: true,
      icc: false,
      jfif: true,
      ifd0: true,
      exif: true,
    });
  } catch {
    return null;
  }
}

function hasGps(exifObj) {
  if (!exifObj) return false;
  const lat = exifObj.latitude ?? exifObj.GPSLatitude ?? exifObj.GPSLatitudeRef;
  const lon = exifObj.longitude ?? exifObj.GPSLongitude ?? exifObj.GPSLongitudeRef;
  return typeof lat !== "undefined" && typeof lon !== "undefined";
}

function getGps(exifObj) {
  if (!exifObj) return null;
  const lat = exifObj.latitude ?? exifObj.GPSLatitude;
  const lon = exifObj.longitude ?? exifObj.GPSLongitude;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function fmtCoord(n) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(6);
}

function parseExifDateValue(rawValue) {
  if (rawValue === null || rawValue === undefined) return null;
  const sourceType = rawValue instanceof Date ? "date" : typeof rawValue;
  const raw = rawValue instanceof Date ? rawValue.toISOString() : String(rawValue).trim();
  if (!raw) return null;
  if (rawValue instanceof Date) {
    return {
      raw,
      normalized: raw.replace(/\.000Z$/, "Z"),
      normalized_utc: raw,
      has_timezone: false,
      timezone_note: "EXIF parser returned a Date object; the original EXIF timezone is still ambiguous unless a source offset is documented elsewhere.",
      source_type: sourceType,
    };
  }
  const exifLike = raw.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if (exifLike) {
    const [, year, month, day, hour, minute, second] = exifLike;
    const normalized = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    return {
      raw,
      normalized,
      normalized_utc: null,
      has_timezone: false,
      timezone_note: "Timezone not present in EXIF field; treat this as a local/unknown capture time until corroborated.",
      source_type: sourceType,
    };
  }

  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw);
  const parsedMs = Date.parse(raw);
  if (!Number.isFinite(parsedMs)) {
    return {
      raw,
      normalized: raw,
      normalized_utc: null,
      has_timezone: false,
      timezone_note: "Could not normalize this EXIF date value safely.",
      source_type: sourceType,
    };
  }

  const parsed = new Date(parsedMs);
  return {
    raw,
    normalized: hasTimezone ? raw : parsed.toISOString().replace(/\.000Z$/, ""),
    normalized_utc: hasTimezone ? parsed.toISOString() : null,
    has_timezone: hasTimezone,
    timezone_note: hasTimezone
      ? "Timezone present in the parsed EXIF value."
      : "Timezone not present in EXIF field; parser normalization may not reflect the original local capture timezone.",
    source_type: sourceType,
  };
}

function normalizeCapturedAt(exifObj) {
  const candidates = [
    { field: "DateTimeOriginal", value: exifObj?.DateTimeOriginal },
    { field: "CreateDate", value: exifObj?.CreateDate },
    { field: "ModifyDate", value: exifObj?.ModifyDate },
    { field: "DateTimeDigitized", value: exifObj?.DateTimeDigitized },
    { field: "datetime", value: exifObj?.datetime },
  ];
  const found = candidates.find((entry) => entry.value != null);
  if (!found) return null;
  const parsed = parseExifDateValue(found.value);
  if (!parsed) return null;
  return {
    source_field: found.field,
    raw: parsed.raw,
    normalized: parsed.normalized,
    normalized_utc: parsed.normalized_utc,
    has_timezone: parsed.has_timezone,
    timezone_note: parsed.timezone_note,
    source_type: parsed.source_type,
    display: parsed.normalized
      ? `${parsed.normalized}${parsed.has_timezone ? "" : " (timezone unknown)"}`
      : `${parsed.raw}${parsed.has_timezone ? "" : " (timezone unknown)"}`,
  };
}

function buildExportMetadata({ ocrMode = state.lastOcrMode || "not_run", ocrLanguage = elements.ocrLang?.value || OCR_DEFAULT_LANGUAGE, uploadMeta = state.uploadMeta ? { ...state.uploadMeta } : null } = {}) {
  const upload = buildUploadLifecycleMeta(uploadMeta, uploadMeta?.purpose || state.publicUrlPurpose || "");
  return {
    schema_version: EXPORT_SCHEMA_VERSION,
    app_version: APP_VERSION,
    runtime_config_fingerprint: EXPORT_RUNTIME_CONFIG_FINGERPRINT,
    runtime_config_source: EXPORT_RUNTIME_CONFIG_SOURCE,
    ocr_mode: ocrMode,
    ocr_language: ocrLanguage,
    heuristic_config: {
      metadata_suspicion_bands: { ...METADATA_SUSPICION_BANDS },
      dhash: {
        batch_cluster_threshold: DHASH_BATCH_CLUSTER_THRESHOLD,
        mutation_cluster_threshold: DHASH_MUTATION_CLUSTER_THRESHOLD,
      },
    },
    upload_host_metadata: {
      preferred_host_order: SERVER_CONFIG.upload?.hosts || [],
      preferred_hosts_by_purpose: SERVER_CONFIG.upload?.preferredHostsByPurpose || {},
      selected_host: upload?.host || null,
      selected_host_latency_ms: upload?.ms || null,
      attempt_count: Array.isArray(upload?.attempts) ? upload.attempts.length : null,
      selected_strategy: elements.shareProvider?.value || null,
      created_at: upload?.created_at || null,
      expected_expiry_window: upload?.expected_expiry_window || null,
      retention_note: upload?.retention_note || null,
      temporary_external_artifact_warning: upload?.temporary_external_artifact_warning || null,
    },
  };
}

function renderDoctorReport(report) {
  const el = elements.doctorOut;
  if (!el) return;
  if (!report) {
    el.textContent = "—";
    return;
  }
  const lines = [];
  lines.push(`App: ${report.app_version || APP_VERSION} · schema ${report.schema_version || EXPORT_SCHEMA_VERSION}`);
  lines.push(`Ping: ${report.server?.ping_ok ? "OK" : "FAIL"}${report.server?.node_version ? ` · Node ${report.server.node_version}` : ""}`);
  lines.push(`Popup: ${report.popup?.ok ? "OK" : "BLOCKED"} · Storage: ${report.storage?.ok ? "OK" : "FAIL"}`);
  lines.push(`Libraries: ${report.libs?.summary || "unknown"}`);
  if (Array.isArray(report.server?.upload_reachability) && report.server.upload_reachability.length) {
    lines.push(`Upload reachability:`);
    for (const row of report.server.upload_reachability) {
      lines.push(`- ${row.host}: ${row.reachable ? "OK" : "FAIL"}${row.status_code ? ` (${row.status_code})` : ""}${row.error ? ` · ${row.error}` : ""}`);
    }
  }
  el.textContent = lines.join("\n");
}

async function runDoctorChecks() {
  const libs = {
    exifr: Boolean(window.exifr),
    sha256: Boolean(window.sha256),
    sparkMd5: Boolean(window.SparkMD5),
    ocrPipeline: Boolean(window.OCR_PIPELINE),
  };
  let storage = { ok: false, error: "" };
  try {
    localStorage.setItem("__bluelens_doctor__", "1");
    localStorage.removeItem("__bluelens_doctor__");
    storage = { ok: true, error: "" };
  } catch (error) {
    storage = { ok: false, error: error?.message || "storage unavailable" };
  }

  let popup = { ok: false, error: "blocked" };
  try {
    const w = window.open("about:blank", "_blank", "noopener,noreferrer");
    popup = w ? { ok: true, error: "" } : { ok: false, error: "blocked" };
    w?.close?.();
  } catch (error) {
    popup = { ok: false, error: error?.message || "blocked" };
  }

  let server = { ping_ok: false, node_version: null, upload_reachability: [], error: "" };
  try {
    const [pingRes, doctorRes] = await Promise.all([
      fetch("/api/ping", { cache: "no-store" }),
      fetch("/api/doctor", { cache: "no-store" }),
    ]);
    const parsed = await doctorRes.json();
    if (!pingRes.ok) throw new Error(`ping ${pingRes.status}`);
    if (!doctorRes.ok || !parsed?.ok) throw new Error(parsed?.message || `doctor ${doctorRes.status}`);
    server = {
      ping_ok: true,
      node_version: parsed.node_version || null,
      upload_reachability: Array.isArray(parsed.upload_reachability) ? parsed.upload_reachability : [],
      error: "",
    };
  } catch (error) {
    server = { ping_ok: false, node_version: null, upload_reachability: [], error: error?.message || "doctor unavailable" };
  }

  state.doctorReport = {
    schema_version: EXPORT_SCHEMA_VERSION,
    app_version: APP_VERSION,
    libs: {
      ...libs,
      summary: Object.entries(libs)
        .map(([name, ok]) => `${name}:${ok ? "ok" : "fail"}`)
        .join(" · "),
    },
    storage,
    popup,
    server,
  };
  state.localServerOnline = Boolean(server.ping_ok);
  renderOnboardingStrip();
  renderDoctorReport(state.doctorReport);
}

function updateKeyFields(exifObj) {
  const captured = normalizeCapturedAt(exifObj);

  const make = exifObj?.Make || "";
  const model = exifObj?.Model || "";
  const camera = `${make} ${model}`.trim();
  const software = (exifObj?.Software || exifObj?.ProcessingSoftware || exifObj?.CreatorTool || "").trim();
  const softwareLower = software.toLowerCase();
  const looksEdited =
    softwareLower.includes("photoshop") ||
    softwareLower.includes("lightroom") ||
    softwareLower.includes("affinity") ||
    softwareLower.includes("gimp") ||
    softwareLower.includes("snapseed") ||
    softwareLower.includes("picsart") ||
    softwareLower.includes("capcut") ||
    softwareLower.includes("vsco") ||
    softwareLower.includes("instagram") ||
    softwareLower.includes("tiktok");

  const gps = getGps(exifObj);
  state.gps = gps;
  state.captureTimeInfo = captured;

  elements.kfCaptured.textContent = captured?.display || "—";
  elements.kfCamera.textContent = camera || "—";
  elements.kfSoftware.textContent = software || "—";
  elements.kfGps.textContent = gps ? `${fmtCoord(gps.lat)}, ${fmtCoord(gps.lon)}` : "—";
  elements.editPill.hidden = !looksEdited;

  const has = Boolean(gps);
  elements.btnOpenMap.disabled = !has;
  elements.btnCopyCoords.disabled = !has;
  if (has) pulseRadar("gps");
}

function detectPlatformFromSoftware(software) {
  const s = (software || "").toLowerCase();
  const platforms = [];
  if (s.includes("instagram")) platforms.push("Instagram");
  if (s.includes("tiktok")) platforms.push("TikTok");
  if (s.includes("snapchat")) platforms.push("Snapchat");
  if (s.includes("capcut")) platforms.push("CapCut");
  if (s.includes("vsco")) platforms.push("VSCO");
  if (s.includes("picsart")) platforms.push("PicsArt");
  return platforms;
}

function extractHandlesAndDomains(text) {
  const t = (text || "").toString();
  const handles = new Set();
  const domains = new Set();

  for (const m of t.matchAll(/(^|[^@\w])@([a-zA-Z0-9_.]{3,30})/g)) handles.add(`@${m[2]}`);
  for (const m of t.matchAll(/\b([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b/g)) domains.add(m[0]);

  return { handles: [...handles].slice(0, 8), domains: [...domains].slice(0, 8) };
}

function formatMetadataSuspicionBand(score) {
  if (!Number.isFinite(score)) return "—";
  if (score >= METADATA_SUSPICION_BANDS.high) return "High";
  if (score >= METADATA_SUSPICION_BANDS.elevated) return "Elevated";
  if (score >= METADATA_SUSPICION_BANDS.mixed) return "Mixed";
  return "Low";
}

function computeMetadataSuspicionScore({ exifObj, file, width, height, ocrText }) {
  const inputs = [];
  let score = 50;
  const addInput = (delta, label) => {
    score += delta;
    inputs.push(`${delta >= 0 ? "+" : ""}${delta} ${label}`);
  };

  const hasExif = Boolean(exifObj && Object.keys(exifObj).length > 0);
  if (!hasExif) {
    addInput(18, "No EXIF/metadata found");
  }

  const gps = getGps(exifObj);
  if (gps) {
    addInput(-20, "GPS present (often original capture)");
  }

  const make = (exifObj?.Make || "").trim();
  const model = (exifObj?.Model || "").trim();
  if (make || model) {
    addInput(-12, "Camera make/model present");
  }

  const captured = exifObj?.DateTimeOriginal || exifObj?.CreateDate || exifObj?.DateTimeDigitized;
  if (captured) {
    addInput(-8, "Capture timestamp present");
  }

  const software = (exifObj?.Software || exifObj?.ProcessingSoftware || exifObj?.CreatorTool || "").trim();
  const platforms = detectPlatformFromSoftware(software);
  if (software) {
    addInput(10, `Software tag: ${software}`);
  }
  if (platforms.length > 0) {
    addInput(22, `Platform/app hint: ${platforms.join(", ")}`);
  }

  if (file?.type === "image/jpeg" && file?.size && file.size < 450_000) {
    addInput(10, "Small JPEG (common repost/compress)");
  }

  if (Number.isFinite(width) && Number.isFinite(height)) {
    const mp = (width * height) / 1_000_000;
    if (mp < 1.0) {
      addInput(12, "Low resolution (common repost)");
    } else if (mp > 10) {
      addInput(-6, "Very high resolution (more likely original)");
    }
  }

  const { handles, domains } = extractHandlesAndDomains(ocrText);
  if (handles.length > 0 || domains.length > 0) {
    addInput(10, "OCR contains handles/domains (likely shared graphic)");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, band: formatMetadataSuspicionBand(score), inputs };
}

function computeAttributionHints(exifObj, ocrText) {
  const hints = [];
  const make = (exifObj?.Make || "").trim();
  const model = (exifObj?.Model || "").trim();
  if (make || model) hints.push(`Camera: ${(make + " " + model).trim()}`);

  const software = (exifObj?.Software || exifObj?.ProcessingSoftware || exifObj?.CreatorTool || "").trim();
  if (software) hints.push(`Software: ${software}`);

  const platforms = detectPlatformFromSoftware(software);
  if (platforms.length > 0) hints.push(`App/platform: ${platforms.join(", ")}`);

  const gps = getGps(exifObj);
  if (gps) hints.push(`GPS: ${fmtCoord(gps.lat)}, ${fmtCoord(gps.lon)}`);

  const { handles, domains } = extractHandlesAndDomains(ocrText);
  if (handles.length > 0) hints.push(`OCR handles: ${handles.join(" ")}`);
  if (domains.length > 0) hints.push(`OCR domains: ${domains.join(" ")}`);

  return hints.length > 0 ? hints.join(" · ") : "—";
}

function updateConsoleInsights({ exifObj, file, width, height, ocrText }) {
  elements.attrHints.textContent = computeAttributionHints(exifObj, ocrText);
  const { score, band, inputs } = computeMetadataSuspicionScore({ exifObj, file, width, height, ocrText });
  elements.repostScore.textContent = band;

  if (elements.repostReasons) {
    const top = Array.isArray(inputs) ? (state.operatorMode ? inputs : inputs.slice(0, 4)) : [];
    if (top.length === 0) {
      elements.repostReasons.hidden = true;
      elements.repostReasons.innerHTML = "";
    } else {
      elements.repostReasons.hidden = false;
      elements.repostReasons.innerHTML = top
        .map((r) => `<span class="chip">${escapeHtml(String(r))}</span>`)
        .join("");
    }
  }
  return { score, band, inputs };
}

function stringifyExif(exifObj, pretty = true) {
  if (!exifObj) return "No metadata found (or unsupported format).";
  try {
    return JSON.stringify(exifObj, null, pretty ? 2 : 0);
  } catch {
    return String(exifObj);
  }
}

async function computeHashes(file) {
  const buf = await file.arrayBuffer();
  const sha = sha256(buf);
  const md5 = SparkMD5.ArrayBuffer.hash(buf);
  return { sha, md5 };
}

function cleanFileFromBlob(blob) {
  const b = blob;
  if (!b) return null;
  const name = state.file ? suggestedCleanFilename(state.file.name, b.type || state.file.type) : "clean_copy.jpg";
  const type = b.type || state.file?.type || "image/jpeg";
  try {
    return new File([b], name, { type });
  } catch {
    // Safari-ish fallback
    const f = new Blob([b], { type });
    // eslint-disable-next-line no-undef
    f.name = name;
    return f;
  }
}

function renderCleanSignals() {
  if (!elements.cleanDetails || !elements.cleanSha256 || !elements.cleanMd5 || !elements.cleanDhash || !elements.cleanDiffOut) return;
  if (!state.cleanSignals) {
    elements.cleanDetails.hidden = true;
    return;
  }

  elements.cleanDetails.hidden = false;
  elements.cleanSha256.textContent = state.cleanSignals.sha256 || "—";
  elements.cleanMd5.textContent = state.cleanSignals.md5 || "—";
  elements.cleanDhash.textContent = state.cleanSignals.dhash || "—";

  const origSha = state.signals.sha256 || "";
  const origMd5 = state.signals.md5 || "";
  const origDh = state.signals.dhash || "";
  const cleanSha = state.cleanSignals.sha256 || "";
  const cleanMd5 = state.cleanSignals.md5 || "";
  const cleanDh = state.cleanSignals.dhash || "";

  const shaSame = origSha && cleanSha ? origSha === cleanSha : null;
  const md5Same = origMd5 && cleanMd5 ? origMd5 === cleanMd5 : null;
  const dhDist = origDh && cleanDh ? hammingHex(origDh, cleanDh) : null;

  const lines = [
    `Clean size: ${formatBytes(state.cleanSignals.size_bytes)} · type: ${state.cleanSignals.type || "—"}`,
    `SHA: ${shaSame == null ? "—" : shaSame ? "same" : "DIFF"} · MD5: ${md5Same == null ? "—" : md5Same ? "same" : "DIFF"} · dHash Δ: ${dhDist == null ? "—" : dhDist}`,
  ];
  elements.cleanDiffOut.textContent = lines.join("\n");

  // If share-safe is on, keep this visible by default.
  try {
    if (state.shareSafe) elements.cleanDetails.open = true;
  } catch {
    // ignore
  }
}

async function computeCleanSignalsFromBlob(blob) {
  const file = cleanFileFromBlob(blob);
  if (!file) return;
  const [hashes, standalone] = await Promise.all([computeHashes(file), loadImageStandalone(file)]);
  const dh = computeDHash(standalone.img);
  URL.revokeObjectURL(standalone.url);

  state.cleanSignals = {
    name: file.name || null,
    type: file.type || null,
    size_bytes: file.size || null,
    sha256: hashes.sha,
    md5: hashes.md5,
    dhash: dh,
  };
  renderCleanSignals();
}

async function encodeCleanCopy(img, preferredType) {
  const maxPixels = 14_000_000; // avoid massive canvases freezing the tab
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  let scale = 1;
  if (iw * ih > maxPixels) {
    scale = Math.sqrt(maxPixels / (iw * ih));
  }

  const w = Math.max(1, Math.floor(iw * scale));
  const h = Math.max(1, Math.floor(ih * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  const type =
    preferredType && (preferredType === "image/png" || preferredType === "image/webp")
      ? preferredType
      : "image/jpeg";

  const quality = type === "image/jpeg" ? 0.92 : undefined;
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  return blob || null;
}

function suggestedCleanFilename(originalName, mimeType) {
  const base = (originalName || "image").replace(/\.[^/.]+$/, "");
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return `${base}_clean.${ext}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

function safeJsonParse(txt, fallback, scope = "", { harmless = true, detail = null } = {}) {
  try {
    return JSON.parse(txt);
  } catch (error) {
    if (scope) reportNonFatalError(scope, error, { harmless, detail });
    return fallback;
  }
}

async function makeThumbnailDataUrl(file, maxEdge = 240) {
  try {
    const bmp = await createImageBitmap(file);
    const iw = bmp.width;
    const ih = bmp.height;
    const scale = Math.min(1, maxEdge / Math.max(1, Math.max(iw, ih)));
    const w = Math.max(1, Math.round(iw * scale));
    const h = Math.max(1, Math.round(ih * scale));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { alpha: false });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    return c.toDataURL("image/webp", 0.72);
  } catch {
    return null;
  }
}

function extractPivotsFromReport(report) {
  if (appHelpers.extractPivotsFromReport) return appHelpers.extractPivotsFromReport(report);
  const pivots = [];
  const ents = report?.key_fields?.ocr_entities;
  if (ents?.urls?.length) pivots.push(...ents.urls.slice(0, 2).map((x) => `url:${x}`));
  if (ents?.emails?.length) pivots.push(...ents.emails.slice(0, 2).map((x) => `email:${x}`));
  if (ents?.handles?.length) {
    pivots.push(
      ...ents.handles
        .slice(0, 3)
        .map((x) => {
          const handle = String(x || "").replace(/^@+/, "");
          return handle ? `@${handle}` : null;
        })
        .filter(Boolean),
    );
  }
  if (ents?.phones?.length) pivots.push(...ents.phones.slice(0, 2).map((x) => `phone:${x}`));
  const gps = report?.gps;
  if (gps && Number.isFinite(gps.lat) && Number.isFinite(gps.lon)) pivots.push(`gps:${gps.lat.toFixed(5)},${gps.lon.toFixed(5)}`);
  const cam = report?.key_fields?.camera;
  if (cam) pivots.push(`cam:${String(cam).slice(0, 42)}`);
  const sw = report?.key_fields?.software;
  if (sw) pivots.push(`sw:${String(sw).slice(0, 42)}`);
  return Array.from(new Set(pivots)).slice(0, 8);
}

function buildOsintReport() {
  const keyFields = extractKeyFieldsObj(state.exif);
  const exportMetadata = buildExportMetadata();
  const upload = buildUploadLifecycleMeta();
  return {
    schema_version: EXPORT_SCHEMA_VERSION,
    app_version: APP_VERSION,
    generated_at: new Date().toISOString(),
    export_metadata: exportMetadata,
    source_reliability: {
      ...state.sourceInfo,
      review_entries: Array.isArray(state.sourceReviewLog) && state.sourceReviewLog.length ? state.sourceReviewLog.slice() : null,
    },
    file: state.file
      ? {
          name: state.file.name || null,
          type: state.file.type || null,
          size_bytes: state.file.size || null,
        }
      : null,
    clean_copy: state.cleanSignals ? { ...state.cleanSignals } : null,
    dimensions: elements.metaDim?.textContent || null,
    hashes: { ...state.signals },
    public_url: state.publicUrl || null,
    public_upload_artifact: state.publicUrl ? state.publicUrlArtifact || "original" : null,
    share_safe: Boolean(state.shareSafe),
    upload,
    gps: state.gps ? { lat: state.gps.lat, lon: state.gps.lon } : null,
    insights: {
      metadata_suspicion_score: state.insights.metadata_suspicion_score,
      metadata_suspicion_band: state.insights.metadata_suspicion_band,
      metadata_suspicion_inputs: state.insights.metadata_suspicion_inputs || [],
      repost_heuristic: state.insights.metadata_suspicion_score,
      repost_reasons: state.insights.metadata_suspicion_inputs || [],
      attribution_hints: elements.attrHints?.textContent || null,
    },
    key_fields: {
      captured: keyFields.captured || elements.kfCaptured?.textContent || null,
      captured_at: keyFields.captured_at || state.captureTimeInfo || null,
      camera: keyFields.camera || elements.kfCamera?.textContent || null,
      software: keyFields.software || elements.kfSoftware?.textContent || null,
      ocr_entities: state.ocrText ? OCR_PIPELINE?.extractEntities?.(state.ocrText) || null : null,
      ocr_entity_confidence: state.entityConfidence && Object.keys(state.entityConfidence).length ? { ...state.entityConfidence } : null,
      ocr_entity_review_entries: buildCurrentOcrReviewEntries(),
    },
    exif: state.exif || null,
    ocr_text: state.ocrText || null,
    ocr: {
      mode: state.lastOcrMode || "not_run",
      selected_model: elements.ocrLang?.value || OCR_DEFAULT_LANGUAGE,
    },
    launchpad: state.lastEngineRun
      ? {
          ts: state.lastEngineRun.ts || null,
          artifact: state.lastEngineRun.artifact || null,
          targets: state.lastEngineRun.targets ? { ...state.lastEngineRun.targets } : null,
          opened: state.lastEngineRun.opened ? { ...state.lastEngineRun.opened } : null,
          blocked: state.lastEngineRun.blocked ? { ...state.lastEngineRun.blocked } : null,
        }
      : null,
    session_action_log: Array.isArray(state.actionLog) ? state.actionLog.slice() : [],
    mutation_lab: state.mutations && state.mutations.length > 0 ? state.mutations : null,
    compare: state.compare?.dhash
      ? {
          dhash_a: state.signals.dhash,
          dhash_b: state.compare.dhash,
          hamming: hammingHex(state.signals.dhash, state.compare.dhash),
        }
      : null,
  };
}

function extractKeyFieldsObj(exifObj) {
  const captured = normalizeCapturedAt(exifObj);
  const make = (exifObj?.Make || "").trim();
  const model = (exifObj?.Model || "").trim();
  const camera = `${make} ${model}`.trim() || null;
  const software = (exifObj?.Software || exifObj?.ProcessingSoftware || exifObj?.CreatorTool || "").trim() || null;
  const gps = getGps(exifObj);
  return {
    captured: captured?.display || null,
    captured_at: captured,
    camera,
    software,
    gps: gps ? { lat: gps.lat, lon: gps.lon } : null,
  };
}

async function buildReportForFileHeadless(file) {
  const [hashes, exifObj, decoded] = await Promise.all([
    computeHashes(file),
    parseExif(file),
    loadImageStandalone(file),
  ]);

  const width = decoded.img.naturalWidth || decoded.img.width;
  const height = decoded.img.naturalHeight || decoded.img.height;
  const dh = computeDHash(decoded.img);
  URL.revokeObjectURL(decoded.url);

  const key = extractKeyFieldsObj(exifObj);
  const hints = computeAttributionHints(exifObj, "");
  const { score, band, inputs } = computeMetadataSuspicionScore({ exifObj, file, width, height, ocrText: "" });

  return {
    schema_version: EXPORT_SCHEMA_VERSION,
    app_version: APP_VERSION,
    generated_at: new Date().toISOString(),
    export_metadata: buildExportMetadata({ ocrMode: "not_run", ocrLanguage: OCR_DEFAULT_LANGUAGE, uploadMeta: null }),
    file: { name: file.name || null, type: file.type || null, size_bytes: file.size || null },
    dimensions: `${width} × ${height}`,
    hashes: { sha256: hashes.sha, md5: hashes.md5, dhash: dh },
    gps: key.gps,
    insights: {
      metadata_suspicion_score: score,
      metadata_suspicion_band: band,
      metadata_suspicion_inputs: inputs,
      repost_heuristic: score,
      repost_reasons: inputs,
      attribution_hints: hints,
    },
    key_fields: { captured: key.captured, captured_at: key.captured_at, camera: key.camera, software: key.software },
    exif: exifObj || null,
  };
}

async function runBatchFiles(files) {
  const imageFiles = Array.from(files || []).filter((f) => f && (f.type || "").startsWith("image/"));
  if (imageFiles.length === 0) {
    elements.batchOut.textContent = "No images selected.";
    return;
  }

  elements.btnRunBatch.disabled = true;
  elements.btnDownloadBatch.disabled = true;
  elements.batchOut.textContent = `Running batch (${imageFiles.length} files)…`;
  elements.batchOut.classList.remove("batchdash");
  state.batchReports = [];
  state.batchItems = [];

  const lines = [];
  for (let i = 0; i < imageFiles.length; i += 1) {
    const f = imageFiles[i];
    lines.push(`[${i + 1}/${imageFiles.length}] ${f.name}`);
    elements.batchOut.textContent = lines.join("\n");
    try {
      const r = await buildReportForFileHeadless(f);
      state.batchReports.push(r);
      const id = r?.hashes?.sha256 || `${f.name}:${f.size}:${i}`;
      let thumb = null;
      try {
        thumb = await makeThumbnailDataUrl(f, 96);
      } catch {
        thumb = null;
      }
      state.batchItems.push({ id, file: f, report: r, triage: null, clusterId: 0, thumb });
      const suspicion = r.insights?.metadata_suspicion_band || formatMetadataSuspicionBand(Number(r.insights?.metadata_suspicion_score ?? r.insights?.repost_heuristic));
      lines.push(`  OK · suspicion ${suspicion}`);
    } catch (e) {
      lines.push(`  FAIL · ${e?.message || "unknown error"}`);
    }
    elements.batchOut.textContent = lines.join("\n");
  }

  elements.btnRunBatch.disabled = false;
  elements.btnDownloadBatch.disabled = state.batchReports.length === 0;
  if (state.batchReports.length > 0) {
    // Render triage dashboard (sortable + filters + clustering).
    renderBatchDashboard();
  }
}

function downloadJson(obj, filename) {
  const payload = Array.isArray(obj)
    ? obj.map((item) =>
        item && typeof item === "object" && !item.schema_version
          ? {
              ...item,
              schema_version: EXPORT_SCHEMA_VERSION,
              app_version: APP_VERSION,
              export_metadata: buildExportMetadata(),
            }
          : item,
      )
    : obj && typeof obj === "object" && !obj.schema_version
      ? {
          ...obj,
          schema_version: EXPORT_SCHEMA_VERSION,
          app_version: APP_VERSION,
          export_metadata: buildExportMetadata(),
        }
      : obj;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(blob, filename);
}

async function downloadEvidencePack() {
  if (!state.file) throw new Error("Cannot create evidence pack: no image file is currently loaded");
  const report = buildOsintReport();
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = (state.file.name || "image").replace(/\.[^/.]+$/, "") || "image";
  const manifest = {
    schema_version: report.schema_version || EXPORT_SCHEMA_VERSION,
    app_version: report.app_version || APP_VERSION,
    generated_at: report.generated_at,
    export_metadata: report.export_metadata || buildExportMetadata(),
    package: {
      format: "bluelens-evidence-pack-v1",
      original_filename: state.file.name || null,
      clean_filename: state.cleanSignals?.name || null,
    },
    file_hashes: report.hashes,
    clean_copy_hashes: report.clean_copy || null,
    ocr: report.ocr,
    upload: report.upload,
    launchpad: report.launchpad,
    source_reliability: report.source_reliability,
    session_action_log: report.session_action_log,
  };
  const mtime = Math.floor(new Date(report.generated_at || Date.now()).getTime() / 1000);
  const notes = [
    `Manual notes: ${report.source_reliability?.manual_notes || "—"}`,
    `Analyst confidence: ${report.source_reliability?.analyst_confidence || "unverified"}`,
    `OCR mode: ${report.ocr?.mode || "not_run"}`,
    `OCR language: ${report.ocr?.selected_model || OCR_DEFAULT_LANGUAGE}`,
    `Upload host: ${report.upload?.host || "—"}`,
    `Upload created: ${report.upload?.created_at || "—"}`,
    `Upload expiry window: ${report.upload?.expected_expiry_window || "—"}`,
    `Upload warning: ${report.upload?.temporary_external_artifact_warning || "—"}`,
    `Capture time: ${report.key_fields?.captured_at?.display || report.key_fields?.captured || "—"}`,
  ].join("\n");
  const entries = [
    { name: "manifest.json", data: toUtf8Bytes(JSON.stringify(manifest, null, 2)), mtime },
    { name: "report.json", data: toUtf8Bytes(JSON.stringify(report, null, 2)), mtime },
    { name: "report.md", data: toUtf8Bytes(buildMarkdownReport(report)), mtime },
    { name: "notes.txt", data: toUtf8Bytes(notes), mtime },
    { name: state.file.name || `${baseName}.bin`, data: await fileToBytes(state.file), mtime },
  ];
  if (state.cleanBlob) {
    const cleanFile = cleanFileFromBlob(state.cleanBlob);
    if (cleanFile) entries.push({ name: cleanFile.name || `${baseName}_clean.jpg`, data: await fileToBytes(cleanFile), mtime });
  }
  downloadBlob(createTar(entries), `${baseName}_evidence_pack_${ts}.tar`);
}

const scriptCache = new Map();
function loadScriptOnce(src) {
  if (scriptCache.has(src)) return scriptCache.get(src);
  const p = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
  scriptCache.set(src, p);
  return p;
}

async function ensureTesseract() {
  if (window.Tesseract) return window.Tesseract;
  await loadScriptOnce("https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/tesseract.min.js");
  if (!window.Tesseract) throw new Error("OCR library failed to load");
  return window.Tesseract;
}

function setOcrStatus(label) {
  elements.ocrPill.textContent = label;
  elements.ocrPill.classList.toggle("pill-muted", label === "Idle" || label === "Ready");
}

function getOcrLanguageLabel(code) {
  return OCR_LANGUAGE_OPTIONS.find((opt) => opt.value === code)?.label || code;
}

function populateOcrLanguageOptions() {
  if (!elements.ocrLang) return;
  const current = elements.ocrLang.value || OCR_DEFAULT_LANGUAGE;
  elements.ocrLang.innerHTML = OCR_LANGUAGE_OPTIONS.map((opt) => `<option value="${escapeAttr(opt.value)}">${escapeHtml(opt.label)}</option>`).join("");
  const fallback = OCR_LANGUAGE_OPTIONS.some((opt) => opt.value === current) ? current : OCR_DEFAULT_LANGUAGE;
  elements.ocrLang.value = fallback;
}

const ocrWorkerState = {
  worker: null,
  lang: null,
  creating: null,
};

async function getOcrWorker(lang) {
  const normalizedLang = lang || OCR_DEFAULT_LANGUAGE;
  if (ocrWorkerState.worker && ocrWorkerState.lang === normalizedLang) return ocrWorkerState.worker;
  if (ocrWorkerState.creating) return await ocrWorkerState.creating;

  ocrWorkerState.creating = (async () => {
    const Tesseract = await ensureTesseract();

    if (ocrWorkerState.worker) {
      try {
        await ocrWorkerState.worker.terminate();
      } catch {
        // ignore
      }
      ocrWorkerState.worker = null;
      ocrWorkerState.lang = null;
    }

    const worker = await Tesseract.createWorker(normalizedLang, 1, {
      logger: (m) => {
        if (!m || !m.status) return;
        const pct = typeof m.progress === "number" ? ` ${(m.progress * 100).toFixed(0)}%` : "";
        setOcrStatus(`${m.status}${pct}`);
      },
    });

    // Defaults tuned for watermarks / sparse text.
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: 11, // SPARSE_TEXT
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });
    } catch {
      // ignore
    }

    ocrWorkerState.worker = worker;
    ocrWorkerState.lang = normalizedLang;
    return worker;
  })().finally(() => {
    ocrWorkerState.creating = null;
  });

  return await ocrWorkerState.creating;
}

function renderOcrEntities(text) {
  const wrap = elements.ocrEntities;
  if (!wrap) return;

  const ent = OCR_PIPELINE?.extractEntities?.(text) || { urls: [], emails: [], handles: [], phones: [] };
  const total =
    ent.urls.length + ent.emails.length + ent.handles.length + ent.phones.length;

  if (!total) {
    state.ocrDerivedEntries = [];
    wrap.hidden = true;
    wrap.innerHTML = "";
    if (elements.btnPivotSearch) elements.btnPivotSearch.disabled = true;
    return;
  }

  const derivedEntries = [];
  wrap.hidden = false;
  wrap.innerHTML = "";
  if (elements.btnPivotSearch) elements.btnPivotSearch.disabled = false;

  const group = (title, source) => {
    const g = document.createElement("div");
    g.className = "pivot-group";
    const head = document.createElement("div");
    head.className = "pivot-head";
    head.textContent = source ? `${title} — ${source}` : title;
    g.appendChild(head);
    wrap.appendChild(g);
    return g;
  };

  const addLinkChip = (parent, label, url, { title } = {}) => {
    const a = document.createElement("a");
    a.className = "chip chip-link";
    a.href = url;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.title = title || label;
    a.textContent = label;
    parent.appendChild(a);
  };

  const addCopyChip = (parent, label, value) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.title = `Copy ${label}`;
    b.textContent = label;
    b.addEventListener("click", () => void copyText(value));
    parent.appendChild(b);
  };

  const addInfoChip = (parent, label) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = label;
    parent.appendChild(chip);
  };

  const addConfidence = (parent, { entityType, entityKey, entityValue }) => {
    const sel = document.createElement("select");
    sel.className = "select chip-select";
    sel.title = "Analyst confidence (manual)";
    sel.innerHTML =
      `<option value="unverified">?</option>` +
      `<option value="likely">~</option>` +
      `<option value="confirmed">✓</option>`;
    sel.value = state.entityConfidence?.[entityKey] || "unverified";
    sel.addEventListener("change", () => {
      recordEntityConfidenceReview({ entityType, entityKey, entityValue, confidence: sel.value || "unverified" });
    });
    parent.appendChild(sel);
  };

  const addDerivedEntry = ({ entityType, entityKey, entityValue, note }) => {
    derivedEntries.push(
      createReviewEntry({
        source: "derived",
        scope: "ocr_entity",
        field: "detected",
        value: entityValue,
        entityType,
        entityKey,
        entityValue,
        note,
      }),
    );
  };

  const google = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  const note = document.createElement("div");
  note.className = "pivot-head";
  note.textContent = "Manual pivots only — these are templated follow-ups from OCR hits, not investigative scoring.";
  wrap.appendChild(note);

  if (ent.handles.length) {
    const g = group("Handles", "Source: direct OCR hit · Confidence: direct text");
    for (const raw of ent.handles.slice(0, 6)) {
      const h = OCR_PIPELINE?.normalizeHandle?.(raw) || raw.replace(/^@/, "");
      if (!h) continue;
      const row = document.createElement("div");
      row.className = "pivot-row";
      addCopyChip(row, `@${h}`, `@${h}`);
      addInfoChip(row, "Manual follow-up");
      addLinkChip(row, "IG", `https://www.instagram.com/${encodeURIComponent(h)}/`, { title: "Open Instagram profile" });
      addLinkChip(row, "TikTok", `https://www.tiktok.com/@${encodeURIComponent(h)}`, { title: "Open TikTok profile" });
      addLinkChip(row, "X", `https://x.com/${encodeURIComponent(h)}`, { title: "Open X profile" });
      addLinkChip(row, "Search", google(`@${h}`), { title: "Search handle" });
      addDerivedEntry({ entityType: "handle", entityKey: `handle:${h.toLowerCase()}`, entityValue: `@${h}`, note: "Direct OCR hit" });
      addConfidence(row, { entityType: "handle", entityKey: `handle:${h.toLowerCase()}`, entityValue: `@${h}` });
      g.appendChild(row);
    }
  }

  if (ent.urls.length) {
    const g = group("URLs / Domains", "Source: direct OCR hit · Confidence: direct text");
    for (const u of ent.urls.slice(0, 6)) {
      const d = OCR_PIPELINE?.normalizeDomain?.(u);
      const row = document.createElement("div");
      row.className = "pivot-row";
      const short = String(u).replace(/^https?:\/\//i, "").slice(0, 44);
      addLinkChip(row, short, u, { title: "Open URL" });
      if (d) {
        addInfoChip(row, "Derived domain follow-up");
        addDerivedEntry({ entityType: "domain", entityKey: `domain:${d}`, entityValue: d, note: "Derived from OCR URL/domain text" });
        addLinkChip(row, "WHOIS", `https://www.whois.com/whois/${encodeURIComponent(d)}`, { title: "WHOIS lookup" });
        addLinkChip(row, "DNS", `https://dns.google/resolve?name=${encodeURIComponent(d)}&type=A`, { title: "DNS over HTTPS (Google)" });
        addLinkChip(row, "CRT", `https://crt.sh/?q=${encodeURIComponent(d)}`, { title: "Certificate transparency" });
        addLinkChip(row, "Search", google(`site:${d}`), { title: "Search site" });
        addConfidence(row, { entityType: "domain", entityKey: `domain:${d}`, entityValue: d });
      } else {
        addDerivedEntry({ entityType: "url", entityKey: `url:${String(u).toLowerCase()}`, entityValue: u, note: "Direct OCR hit" });
        addLinkChip(row, "Search", google(u), { title: "Search URL" });
      }
      g.appendChild(row);
    }
  }

  if (ent.emails.length) {
    const g = group("Emails", "Source: direct OCR hit · Confidence: direct text");
    for (const e of ent.emails.slice(0, 6)) {
      const row = document.createElement("div");
      row.className = "pivot-row";
      addCopyChip(row, e, e);
      addInfoChip(row, "Manual search");
      addLinkChip(row, "Search", google(`"${e}"`), { title: "Search email" });
      addLinkChip(row, "Breach?", google(`"${e}" breach`), { title: "Search breach mentions" });
      addDerivedEntry({ entityType: "email", entityKey: `email:${e.toLowerCase()}`, entityValue: e, note: "Direct OCR hit" });
      addConfidence(row, { entityType: "email", entityKey: `email:${e.toLowerCase()}`, entityValue: e });
      g.appendChild(row);
    }
  }

  if (ent.phones.length) {
    const g = group("Phones", "Source: direct OCR hit · Confidence: direct text");
    for (const p of ent.phones.slice(0, 6)) {
      const n = OCR_PIPELINE?.normalizePhone?.(p);
      const row = document.createElement("div");
      row.className = "pivot-row";
      const label = n?.e164 ? `${n.e164}${n.country_hint ? ` (${n.country_hint})` : ""}` : p;
      addCopyChip(row, label, n?.e164 || p);
      addInfoChip(row, "Manual search");
      const q = n?.e164 || n?.digits || p;
      addLinkChip(row, "Search", google(`"${q}"`), { title: "Search phone" });
      addDerivedEntry({ entityType: "phone", entityKey: `phone:${String(q).replace(/\s+/g, "")}`, entityValue: label, note: "Direct OCR hit" });
      addConfidence(row, { entityType: "phone", entityKey: `phone:${String(q).replace(/\s+/g, "")}`, entityValue: label });
      g.appendChild(row);
    }
  }
  state.ocrDerivedEntries = derivedEntries;
}

function detectScriptHint(text) {
  const t = String(text || "");
  if (!t) return null;
  const ranked = OCR_SCRIPT_HINTS
    .map((script) => ({ ...script, score: (t.match(script.test) || []).length }))
    .filter((script) => script.score > 0)
    .sort((a, b) => b.score - a.score);
  const top = ranked[0];
  if (!top) return null;
  if (top.label !== "Latin" && top.score < 2) return null;
  if (top.label === "Latin" && top.score < 8) return null;
  return top;
}

function renderOcrLangHint(text) {
  const el = elements.ocrLangHint;
  if (!el) return;
  const hint = detectScriptHint(text);
  if (!hint) {
    el.hidden = true;
    return;
  }
  const labels = hint.models.slice(0, 3).map((code) => getOcrLanguageLabel(code)).join(" / ");
  el.hidden = false;
  el.textContent = `Weak script hint: ${hint.label} → try ${labels}`;
}

async function runOcrForCurrent({ mode = "deep" } = {}) {
  if (!state.file || !state.objectUrl) throw new Error("No image loaded");
  if (state.ocrRunning) throw new Error("OCR already running");

  state.ocrRunning = true;
  state.lastOcrMode = mode === "fast" ? "fast" : "deep";
  elements.btnRunOcr.disabled = true;
  elements.btnCopyOcr.disabled = true;
  elements.ocrOut.textContent = "Loading OCR…";
  setOcrStatus("Running…");
  setStatusLine(mode === "fast" ? "OCR: fast pass…" : "OCR: pass 1/3…");

  try {
    const lang = elements.ocrLang.value || "eng";
    const worker = await getOcrWorker(lang);

    if (mode === "fast") {
      let enhanced = null;
      try {
        enhanced = await OCR_PIPELINE.preprocessOtsu(state.objectUrl, { maxDim: OCR_FAST_PREPROCESS_MAX_DIM });
      } catch {
        enhanced = null;
      }
      const rr = await worker.recognize(enhanced || state.file);
      const text = (rr?.data?.text || "").trim();

      state.ocrText = text;
      elements.ocrOut.textContent = text || "No text detected.";
      renderOcrEntities(text);
      renderOcrLangHint(text);
      elements.btnCopyOcr.disabled = !text;
      setOcrStatus("Ready");
      if (text) pulseRadar("ocr");
      setStatusLine("OCR: ✓");
      return text;
    }

    let enhanced = null;
    let adaptive = null;
    try {
      enhanced = await OCR_PIPELINE.preprocessOtsu(state.objectUrl);
    } catch {
      enhanced = null;
    }
    try {
      adaptive = await OCR_PIPELINE.preprocessAdaptive(state.objectUrl);
    } catch {
      adaptive = null;
    }

    setStatusLine("OCR: pass 1/3…");
    const r1 = await worker.recognize(state.file);
    setStatusLine("OCR: pass 2/3…");
    const r2 = enhanced ? await worker.recognize(enhanced) : null;
    setStatusLine("OCR: pass 3/3…");
    const r3 = adaptive ? await worker.recognize(adaptive) : null;

    const t1 = (r1?.data?.text || "").trim();
    const c1 = typeof r1?.data?.confidence === "number" ? r1.data.confidence : null;
    const t2 = (r2?.data?.text || "").trim();
    const c2 = typeof r2?.data?.confidence === "number" ? r2.data.confidence : null;
    const t3 = (r3?.data?.text || "").trim();
    const c3 = typeof r3?.data?.confidence === "number" ? r3.data.confidence : null;

    const score = (t, c) => {
      const len = (t || "").replace(/\s+/g, "").length;
      const conf = typeof c === "number" ? c : 0;
      return conf * 1.2 + Math.min(40, len);
    };

    const baseCandidates = [
      { mode: "original", text: t1, conf: c1 },
      ...(r2 ? [{ mode: "enhanced-otsu", text: t2, conf: c2 }] : []),
      ...(r3 ? [{ mode: "enhanced-adaptive", text: t3, conf: c3 }] : []),
    ];
    baseCandidates.sort((a, b) => score(b.text, b.conf) - score(a.text, a.conf));
    const best = baseCandidates[0] || { mode: "original", text: t1, conf: c1 };

    let bestText = best.text;
    let bestConf = best.conf;
    let bestMode = best.mode;

    // Rescue pass for watermarks/handles when OCR is weak.
    let rescueText = "";
    let rescueConf = null;
    let psm6Text = "";
    let psm6Conf = null;

    const weak = !bestText || (typeof bestConf === "number" && bestConf < 55);
    const bestCanvas = bestMode === "enhanced-adaptive" ? adaptive : enhanced;

    // Dense-text fallback: PSM 6 on the adaptive variant.
    if (weak && adaptive) {
      try {
        await worker.setParameters({ tessedit_pageseg_mode: 6 });
        const rr = await worker.recognize(adaptive);
        psm6Text = (rr?.data?.text || "").trim();
        psm6Conf = typeof rr?.data?.confidence === "number" ? rr.data.confidence : null;
      } catch {
        // ignore
      } finally {
        try {
          await worker.setParameters({ tessedit_pageseg_mode: 11 });
        } catch {
          // ignore
        }
      }
    }

    if (weak && bestCanvas) {
      try {
        await worker.setParameters({
          tessedit_char_whitelist: "@ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-:/",
          tessedit_pageseg_mode: 11,
        });
        const rr = await worker.recognize(bestCanvas);
        rescueText = (rr?.data?.text || "").trim();
        rescueConf = typeof rr?.data?.confidence === "number" ? rr.data.confidence : null;
      } catch {
        // ignore
      } finally {
        try {
          await worker.setParameters({ tessedit_char_whitelist: "" });
        } catch {
          // ignore
        }
      }
    }

    const specials = [
      ...(psm6Text ? [{ mode: "adaptive+psm6", text: psm6Text, conf: psm6Conf }] : []),
      ...(rescueText ? [{ mode: "whitelist", text: rescueText, conf: rescueConf }] : []),
    ];

    const all = [...baseCandidates, ...specials].filter((c) => c && typeof c.text === "string");
    all.sort((a, b) => score(b.text, b.conf) - score(a.text, a.conf));
    const final = all[0] || { mode: bestMode, text: bestText, conf: bestConf };
    bestText = final.text;
    bestConf = final.conf;
    bestMode = final.mode;

    const finalText = bestText;
    const finalConf = bestConf;

    state.ocrText = finalText;
    const header = `Best: ${bestMode}${typeof finalConf === "number" ? ` (conf ${finalConf.toFixed(1)})` : ""}`;
    elements.ocrOut.textContent = finalText ? `${header}\n\n${finalText}` : `${header}\n\nNo text detected.`;
    renderOcrEntities(finalText);
    renderOcrLangHint(finalText);
    elements.btnCopyOcr.disabled = !finalText;
    setOcrStatus("Ready");
    if (finalText) pulseRadar("ocr");
    logAction("ocr_run", `${state.lastOcrMode} · ${finalText ? "text" : "no_text"}`);

    // Refresh hints with OCR-derived entities.
    try {
      const imgW = (() => {
        const m = (elements.metaDim.textContent || "").match(/(\d+)\s*×\s*(\d+)/);
        return m ? Number(m[1]) : null;
      })();
      const imgH = (() => {
        const m = (elements.metaDim.textContent || "").match(/(\d+)\s*×\s*(\d+)/);
        return m ? Number(m[2]) : null;
      })();
      const { score: s, band, inputs } = updateConsoleInsights({
        exifObj: state.exif,
        file: state.file,
        width: imgW,
        height: imgH,
        ocrText: finalText,
      });
      state.insights.metadata_suspicion_score = s;
      state.insights.metadata_suspicion_band = band;
      state.insights.metadata_suspicion_inputs = inputs;
    } catch {
      // ignore
    }

    return finalText;
  } finally {
    state.ocrRunning = false;
    elements.btnRunOcr.disabled = !state.file;
    setStatusLine("");
  }
}

async function analyzeFile(file) {
  if (!file) return;
  if (state.uiBusy) return;

  reset();
  state.file = file;

  elements.metaName.textContent = file.name || "—";
  elements.metaType.textContent = file.type || "—";
  elements.metaSize.textContent = formatBytes(file.size);

  await withUiLock("Processing…", async () => {
    let img;
    try {
      img = await loadImageFromFile(file);
    } catch {
      setStatus("Failed to load image");
      elements.exifOut.textContent = "Could not decode this image in the browser.";
      return;
    }

    elements.metaDim.textContent = `${img.naturalWidth || img.width} × ${img.naturalHeight || img.height}`;

    const [hashes, exifObj] = await Promise.all([computeHashes(file), parseExif(file)]);
    state.signals.sha256 = hashes.sha;
    state.signals.md5 = hashes.md5;
    state.signals.dhash = computeDHash(img);
    state.exif = exifObj;

    elements.sha256.textContent = state.signals.sha256;
    elements.md5.textContent = state.signals.md5;
    elements.dhash.textContent = state.signals.dhash;

    const gps = getGps(exifObj);
    elements.gpsPill.hidden = !gps;
    updateKeyFields(exifObj);
    elements.exifOut.textContent = stringifyExif(exifObj, state.prettyExif);

    const { score, band, inputs } = updateConsoleInsights({
      exifObj,
      file,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      ocrText: state.ocrText,
    });
    state.insights.metadata_suspicion_score = score;
    state.insights.metadata_suspicion_band = band;
    state.insights.metadata_suspicion_inputs = inputs;

    state.cleanBlob = await encodeCleanCopy(img, file.type);
    if (state.cleanBlob) {
      try {
        await computeCleanSignalsFromBlob(state.cleanBlob);
      } catch {
        state.cleanSignals = null;
        renderCleanSignals();
      }
    } else {
      state.cleanSignals = null;
      renderCleanSignals();
    }
    setShareControlsEnabled(true);
    setShareStatus(state.publicUrl ? "Shared" : "Not shared");
    clearCompare();

    if (!elements.srcOrig.value) {
      elements.srcOrig.value = file.name || "";
      updateSourceInfoField("original_filename", elements.srcOrig.value, { source: "derived", note: "Loaded from current local file name" });
    }

    setStatus("Ready");
  });

  try {
    document.dispatchEvent(new Event("osint:file-changed"));
  } catch {
    // ignore
  }

  window.__osintActivateTab?.("search");
  if (elements.btnEvidencePack) elements.btnEvidencePack.disabled = false;
  logAction("image_loaded", `${file.name || "image"} · local review ready`);
  setStatusLine("Local review ready. Uploads start only when you choose a launch action.");
  renderOnboardingStrip();
}

function clearCompare() {
  if (state.compare?.objectUrl) URL.revokeObjectURL(state.compare.objectUrl);
  state.compare = { file: null, objectUrl: null, dhash: "", diffScore: null };
  elements.compareInput.value = "";
  elements.compareImg.removeAttribute("src");
  elements.compareImg.style.display = "none";
  elements.compareEmpty.style.display = "grid";
  if (elements.compareDiffCanvas) {
    const ctx = elements.compareDiffCanvas.getContext("2d");
    ctx?.clearRect(0, 0, elements.compareDiffCanvas.width || 0, elements.compareDiffCanvas.height || 0);
    elements.compareDiffCanvas.style.display = "none";
  }
  if (elements.compareDiffEmpty) elements.compareDiffEmpty.style.display = "grid";
  elements.cmpA.textContent = state.signals.dhash || "—";
  elements.cmpB.textContent = "—";
  elements.cmpDist.textContent = "—";
  elements.cmpVerdict.textContent = "—";
  if (elements.cmpExplain) {
    elements.cmpExplain.textContent =
      "dHash is a 64-bit perceptual heuristic. Lower Hamming distance means the thumbnails look closer, not that the files are proven to be the same image.";
  }
  elements.btnClearCompare.disabled = true;
}

function renderCompareDiff(baseImg, compareImg, size = COMPARE_DIFF_SIZE) {
  if (!elements.compareDiffCanvas) return null;
  const canvas = elements.compareDiffCanvas;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  canvas.width = size;
  canvas.height = size;
  ctx.clearRect(0, 0, size, size);

  compareDiffScratchA.width = size;
  compareDiffScratchA.height = size;
  compareDiffScratchB.width = size;
  compareDiffScratchB.height = size;
  const ctxA = compareDiffScratchA.getContext("2d", { willReadFrequently: true });
  const ctxB = compareDiffScratchB.getContext("2d", { willReadFrequently: true });
  if (!ctxA || !ctxB) return null;

  ctxA.drawImage(baseImg, 0, 0, size, size);
  ctxB.drawImage(compareImg, 0, 0, size, size);
  const imgA = ctxA.getImageData(0, 0, size, size);
  const imgB = ctxB.getImageData(0, 0, size, size);
  const out = ctx.createImageData(size, size);

  let total = 0;
  for (let i = 0; i < imgA.data.length; i += 4) {
    const dr = Math.abs(imgA.data[i] - imgB.data[i]);
    const dg = Math.abs(imgA.data[i + 1] - imgB.data[i + 1]);
    const db = Math.abs(imgA.data[i + 2] - imgB.data[i + 2]);
    const diff = Math.round((dr + dg + db) / 3);
    total += diff;
    out.data[i] = diff;
    out.data[i + 1] = Math.max(0, 255 - diff);
    out.data[i + 2] = 255 - Math.round(diff / 2);
    out.data[i + 3] = 255;
  }

  ctx.putImageData(out, 0, 0);
  canvas.style.display = "block";
  if (elements.compareDiffEmpty) elements.compareDiffEmpty.style.display = "none";
  return Math.round(total / (size * size));
}

async function analyzeCompareFile(file) {
  if (!state.file) return;
  await withUiLock("Comparing…", async () => {
    clearCompare();
    state.compare.file = file;

    let standalone;
    let baseStandalone;
    try {
      baseStandalone = await loadImageStandalone(state.file);
      standalone = await loadImageStandalone(file);
    } catch {
      if (baseStandalone?.url) URL.revokeObjectURL(baseStandalone.url);
      elements.cmpVerdict.textContent = "Could not decode comparison image.";
      return;
    }

    state.compare.objectUrl = standalone.url;
    elements.compareImg.src = standalone.url;
    elements.compareImg.onload = () => {
      elements.compareImg.style.display = "block";
      elements.compareEmpty.style.display = "none";
    };

    const dh = computeDHash(standalone.img);
    state.compare.dhash = dh;
    try {
      state.compare.diffScore = renderCompareDiff(baseStandalone.img, standalone.img);
    } finally {
      URL.revokeObjectURL(baseStandalone.url);
    }

    elements.cmpA.textContent = state.signals.dhash || "—";
    elements.cmpB.textContent = dh || "—";

    const dist = hammingHex(state.signals.dhash, dh);
    if (dist === null) {
      elements.cmpDist.textContent = "—";
      elements.cmpVerdict.textContent = "Could not compare.";
      if (elements.cmpExplain) {
        elements.cmpExplain.textContent = "BlueLens could not derive a valid dHash distance from one of the images.";
      }
      return;
    }

    elements.cmpDist.textContent = `${dist} / 64 · lower is closer`;
    let verdict = "No near-duplicate signal from dHash alone";
    if (dist <= 12) verdict = "Possible near-duplicate";
    else if (dist <= 20) verdict = "Possible near-duplicate (weak dHash signal)";
    elements.cmpVerdict.textContent = verdict;
    if (elements.cmpExplain) {
      const diffText = Number.isFinite(state.compare.diffScore) ? ` Thumbnail diff intensity: ${state.compare.diffScore}/255.` : "";
      elements.cmpExplain.textContent =
        `dHash compares tiny perceptual thumbnails; 0 means identical hashes and larger numbers mean less visual agreement.${diffText} Treat this as a screening signal, not proof that two files are the same image.`;
    }
    elements.btnClearCompare.disabled = false;
    setStatus("Ready");
  });
}

function setupDnD() {
  const dz = elements.dropzone;

  dz.addEventListener("click", () => elements.fileInput.click());
  elements.btnChoose.addEventListener("click", () => elements.fileInput.click());

  if (elements.btnCamera && elements.cameraInput) {
    elements.btnCamera.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.cameraInput.click();
    });
  }

  dz.addEventListener("dragover", (e) => {
    e.preventDefault();
    dz.classList.add("dragover");
  });
  dz.addEventListener("dragleave", () => dz.classList.remove("dragover"));
  dz.addEventListener("drop", (e) => {
    e.preventDefault();
    dz.classList.remove("dragover");
    const dt = e.dataTransfer;
    const files = dt?.files;
    if (files && files.length > 0) {
      if (files.length === 1) {
        const file = files[0];
        if (file) void analyzeFile(file);
        return;
      }

      // Multi-drop: treat as batch.
      window.__osintActivateTab?.("search");
      void withUiLock("Batch…", async () => {
        await runBatchFiles(files);
        setStatus("Ready");
      });
      return;
    }

    // Drag from another tab/app: try URL or HTML <img src="...">.
    const items = dt?.items;
    if (!items || items.length === 0) return;

    const getString = (type) =>
      new Promise((resolve) => {
        const it = Array.from(items).find((x) => x && x.kind === "string" && x.type === type);
        if (!it) return resolve("");
        it.getAsString((s) => resolve(s || ""));
      });

    void (async () => {
      const uri = (await getString("text/uri-list")) || (await getString("text/plain")) || "";
      const html = (await getString("text/html")) || "";

      let url = (uri || "").trim().split(/\s+/)[0];
      if (!url && html) {
        const m = html.match(/<img[^>]+src=[\"']([^\"']+)[\"']/i);
        url = m ? String(m[1] || "").trim() : "";
      }
      if (!url) return;

      // Data URL -> convert directly.
      if (/^data:image\//i.test(url)) {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const ext = blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png";
          const name = `drop_${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;
          await analyzeFile(new File([blob], name, { type: blob.type || "image/png" }));
        } catch (error) {
          reportNonFatalError("drop.data-url.ingest", error, { detail: { source: "data-url" }, dedupeMs: 5000 });
          elements.exifOut.textContent = "Could not ingest the dropped image data. Save the image locally and choose the file instead.";
        }
        return;
      }

      // Try to fetch the image URL (may fail due to CORS).
      if (!/^https?:\/\//i.test(url)) return;
      try {
        setStatus("Ingesting…", "busy");
        setStatusLine("Drop: fetching image…");
        const res = await fetch(url, { mode: "cors", credentials: "omit", cache: "no-store" });
        if (!res.ok) throw new Error("fetch failed");
        const blob = await res.blob();
        if (!String(blob.type || "").startsWith("image/")) throw new Error("not an image");
        const ext = blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png";
        const name = `drop_${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;
        await analyzeFile(new File([blob], name, { type: blob.type || "image/png" }));
      } catch (error) {
        reportNonFatalError("drop.remote-url.ingest", error, { detail: { url }, dedupeMs: 5000 });
        elements.exifOut.textContent =
          "Could not ingest dragged image URL (likely CORS). Save the image locally and drop the file, or copy-paste the image.";
      } finally {
        setStatusLine("");
        setStatus("Ready");
      }
    })();
  });

  dz.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      elements.fileInput.click();
    }
  });
}

function setupActions() {
  elements.btnReset.addEventListener("click", reset);

  if (elements.btnRetryUpload) {
    elements.btnRetryUpload.addEventListener("click", async () => {
      if (!state.file) return;
      if (!state.shareEnabled) return;
      if (state.uiBusy) return;
      state.publicUrl = "";
      state.publicUrlPurpose = "";
      state.publicUrlArtifact = state.shareSafe ? "clean" : "original";
      await withUiLock("Retrying upload…", async () => {
        try {
          await ensurePublicUrl();
          setStatus("Ready");
        } catch (error) {
          reportNonFatalError("upload.retry", error, { harmless: true, dedupeMs: 5000 });
        }
      });
    });
  }

  // Share-safe mode: use clean copy for uploads.
  if (elements.chkShareSafe) {
    const saved = readStorage(STORAGE_SHARE_SAFE_KEY, "0", "share-safe.read");
    state.shareSafe = saved === "1";
    elements.chkShareSafe.checked = state.shareSafe;

    elements.chkShareSafe.addEventListener("change", () => {
      state.shareSafe = Boolean(elements.chkShareSafe.checked);
      writeStorage(STORAGE_SHARE_SAFE_KEY, state.shareSafe ? "1" : "0", "share-safe.write");
      // Changing artifacts invalidates the previously shared URL.
      if (state.shareEnabled) {
        state.publicUrl = "";
        state.publicUrlPurpose = "";
        state.publicUrlArtifact = state.shareSafe ? "clean" : "original";
        setShareStatus("Not shared");
        elements.publicUrlOut.textContent = "—";
      }
      renderCleanSignals();
    });
  }

  const syncSourceInfo = () => {
    updateSourceInfoField("where_obtained", elements.srcWhere.value || "");
    updateSourceInfoField("when_obtained", elements.srcWhen.value || "");
    updateSourceInfoField("who_provided", elements.srcWho.value || "");
    updateSourceInfoField("original_filename", elements.srcOrig.value || "");
    updateSourceInfoField("manual_notes", elements.manualNotes?.value || "");
    state.manualNotes = state.sourceInfo.manual_notes;
    if (elements.confLevel) updateSourceInfoField("analyst_confidence", elements.confLevel.value || "unverified");
  };
  elements.srcWhere.addEventListener("input", syncSourceInfo);
  elements.srcWhen.addEventListener("input", syncSourceInfo);
  elements.srcWho.addEventListener("input", syncSourceInfo);
  elements.srcOrig.addEventListener("input", syncSourceInfo);
  elements.manualNotes?.addEventListener("input", syncSourceInfo);
  elements.confLevel?.addEventListener("change", syncSourceInfo);

  elements.chkEnableShare.addEventListener("change", () => {
    state.shareEnabled = Boolean(elements.chkEnableShare.checked);
    if (!state.shareEnabled) {
      state.publicUrl = "";
      state.publicUrlPurpose = "";
      setShareStatus("Not shared");
      elements.publicUrlOut.textContent = "—";
    } else if (state.file) {
      setShareStatus(state.publicUrl ? "Shared" : "Not shared");
    }
    setShareControlsEnabled(Boolean(state.file));
  });

  elements.btnCopyPublicUrl.addEventListener("click", async () => {
    if (!state.publicUrl) return;
    await copyText(state.publicUrl);
  });

  elements.btnCopyReport.addEventListener("click", async (e) => {
    if (!state.file) return;
    const report = buildOsintReport();
    if (e?.shiftKey) {
      await copyText(JSON.stringify(report, null, 2));
      logAction("report_copied", "json");
      setStatus("Copied (JSON)");
      return;
    }

    const md = buildMarkdownReport(report);
    await copyText(md);
    logAction("report_copied", "markdown");
    setStatus("Copied (MD)");
  });

  elements.btnEvidencePack?.addEventListener("click", async () => {
    if (!state.file) return;
    await downloadEvidencePack();
    logAction("evidence_pack_downloaded", state.file.name || "image");
    setStatus("Evidence Pack ready");
  });

  elements.btnRunDoctor?.addEventListener("click", async () => {
    if (elements.doctorOut) elements.doctorOut.textContent = "Running doctor…";
    await runDoctorChecks();
    setStatus("Doctor updated");
  });

  elements.btnPivotSearch?.addEventListener("click", () => {
    if (!state.ocrText) return;
    if (state.uiBusy) return;
    const ent = OCR_PIPELINE?.extractEntities?.(state.ocrText) || { urls: [], emails: [], handles: [], phones: [] };
    const targets = buildPivotSearchUrlsFromEntities(ent).slice(0, 14);
    if (targets.length === 0) return;

    // Popup blockers: open synchronously, no awaits here.
    for (const u of targets) openUrl(u);
    logAction("manual_pivots_opened", String(targets.length));
    setStatus(`Manual pivots (${targets.length})`);
  });

  elements.btnRunPass.addEventListener("click", async () => {
    if (!state.file) return;
    await withUiLock("OSINT pass…", async () => {
      try {
        // OCR is the only heavyweight step; hashes/EXIF already computed on load.
        await runOcrForCurrent({ mode: "deep" });
      } catch {
        // OCR is optional; continue with whatever signals we have.
      }

      const imgW = (() => {
        const m = (elements.metaDim.textContent || "").match(/(\d+)\s*×\s*(\d+)/);
        return m ? Number(m[1]) : null;
      })();
      const imgH = (() => {
        const m = (elements.metaDim.textContent || "").match(/(\d+)\s*×\s*(\d+)/);
        return m ? Number(m[2]) : null;
      })();

      const { score, band, inputs } = updateConsoleInsights({
        exifObj: state.exif,
        file: state.file,
        width: imgW,
        height: imgH,
        ocrText: state.ocrText,
      });
      state.insights.metadata_suspicion_score = score;
      state.insights.metadata_suspicion_band = band;
      state.insights.metadata_suspicion_inputs = inputs;

      setStatus("Ready");
    });
  });

  elements.btnRunMission?.addEventListener("click", () => {
    const preset = elements.missionPreset?.value || "fast";
    void runMissionPreset(preset);
  });

  elements.btnMutateSearch.addEventListener("click", async () => {
    if (!state.file) return;
    if (state.uiBusy) return;

    await withUiLock("Mutating…", async () => {
      if (!state.shareEnabled) {
        const ok = window.confirm(
          "Mutation Lab needs automatic uploads (uploads variants to generate public URLs). Allow it?",
        );
        if (!ok) return;
        state.shareEnabled = true;
        elements.chkEnableShare.checked = true;
        setShareControlsEnabled(true);
      }

      state.mutations = [];
      elements.mutationOut.textContent = "Generating variants…";
      elements.btnCopyMutations.disabled = true;

      let muts;
      try {
        muts = await generateMutationFiles();
      } catch (e) {
        elements.mutationOut.textContent = `Mutation failed: ${e?.message || "unknown error"}`;
        setStatus("Mutation failed");
        return;
      }

      // Precompute dHash + base distances for clustering/scoring.
      const baseDhash = state.signals.dhash || "";
      for (const m of muts) {
        try {
          const standalone = await loadImageStandalone(m.file);
          const dh = computeDHash(standalone.img);
          URL.revokeObjectURL(standalone.url);
          m.dhash = dh;
          m.base_hamming = baseDhash ? hammingHex(baseDhash, dh) : null;
        } catch {
          m.dhash = "";
          m.base_hamming = null;
        }
      }

      const clusters = clusterByDhash(muts.filter((m) => m.dhash), DHASH_MUTATION_CLUSTER_THRESHOLD);
      for (let ci = 0; ci < clusters.length; ci += 1) {
        for (const m of clusters[ci].items) m.cluster = ci + 1;
      }

      const jobIds = [];
      for (let i = 0; i < muts.length; i += 1) {
        const label = `Lens · ${muts[i].label}`;
        jobIds.push(openWaitJob("lens", label));
      }
      state.session = loadSession();
      state.session.engines_opened += muts.length;
      saveSession();
      void refreshHostStats();

      const working = muts.map((m) => ({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}-${m.label}`,
        label: m.label,
        url: "",
        status: "uploading",
        dhash: m.dhash || "",
        base_hamming: m.base_hamming ?? null,
        cluster: m.cluster || 0,
        analyst_annotation: "unreviewed",
        engine_review: { lens: "review", bing: "review", tineye: "review", yandex: "review", google_images: "review" },
      }));
      elements.mutationOut.textContent = "Uploading variants…";
      for (let i = 0; i < muts.length; i += 1) {
        const m = muts[i];
        working[i].status = "uploading";
        try {
          const url = await publicUrlForFile(m.file);
          working[i].url = url;
          working[i].status = "ok";
          state.mutations.push({ ...working[i] });
          publishWaitState(jobIds[i], { url });
        } catch (e) {
          const msg = e?.message || "upload failed";
          publishWaitState(jobIds[i], { err: msg });
          working[i].status = "fail";
          working[i].url = "";
        }
        renderMutationSummary(state.mutations.length ? state.mutations : working);
      }

      elements.btnCopyMutations.disabled = state.mutations.length === 0;
      pulseRadar("ocr");
      setStatus("Ready");
    });
  });

  elements.btnCopyMutations.addEventListener("click", async () => {
    if (!state.mutations || state.mutations.length === 0) return;
    await copyText(JSON.stringify(state.mutations, null, 2));
  });

  elements.btnRunOcr.addEventListener("click", async () => {
    if (!state.file) return;
    await withUiLock("OCR…", async () => {
      try {
        await runOcrForCurrent();
      } catch (e) {
        elements.ocrOut.textContent = formatOcrError(e);
        setOcrStatus("Failed");
      }
    });
  });

  elements.btnCopyOcr.addEventListener("click", async () => {
    if (!state.ocrText) return;
    await copyText(state.ocrText);
  });

  elements.copySha.addEventListener("click", async () => {
    if (!state.signals.sha256) return;
    await copyText(state.signals.sha256);
  });
  elements.copyMd5.addEventListener("click", async () => {
    if (!state.signals.md5) return;
    await copyText(state.signals.md5);
  });
  elements.copyDhash.addEventListener("click", async () => {
    if (!state.signals.dhash) return;
    await copyText(state.signals.dhash);
  });

  elements.btnCopyExif.addEventListener("click", async () => {
    await copyText(stringifyExif(state.exif, true));
  });

  elements.btnTogglePretty.addEventListener("click", () => {
    state.prettyExif = !state.prettyExif;
    elements.exifOut.textContent = stringifyExif(state.exif, state.prettyExif);
    elements.btnTogglePretty.textContent = state.prettyExif ? "Pretty: On" : "Pretty: Off";
  });

  elements.btnOpenMap.addEventListener("click", () => {
    if (!state.gps) return;
    const { lat, lon } = state.gps;
    openUrl(`https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lon)}#map=16/${encodeURIComponent(lat)}/${encodeURIComponent(lon)}`);
  });

  elements.btnCopyCoords.addEventListener("click", async () => {
    if (!state.gps) return;
    await copyText(`${fmtCoord(state.gps.lat)}, ${fmtCoord(state.gps.lon)}`);
  });

  elements.btnDownloadClean.addEventListener("click", () => {
    if (!state.cleanBlob || !state.file) return;
    downloadBlob(state.cleanBlob, suggestedCleanFilename(state.file.name, state.cleanBlob.type));
  });

  elements.fileInput.addEventListener("change", () => {
    const file = elements.fileInput.files?.[0];
    if (file) void analyzeFile(file);
  });

  elements.cameraInput?.addEventListener("change", () => {
    const file = elements.cameraInput.files?.[0];
    // allow re-capture of the same filename
    try {
      elements.cameraInput.value = "";
    } catch {
      // ignore
    }
    if (file) void analyzeFile(file);
  });

  document.addEventListener("paste", (e) => {
    if (state.uiBusy) return;
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;

    // If user is typing in an input/textarea, only intercept when clipboard has an image.
    const active = document.activeElement;
    const activeTag = active?.tagName?.toLowerCase?.() || "";
    const isTypingTarget = activeTag === "input" || activeTag === "textarea" || Boolean(active?.isContentEditable);

    let imgItem = null;
    for (const it of items) {
      if (it && typeof it.type === "string" && it.type.startsWith("image/")) {
        imgItem = it;
        break;
      }
    }
    if (!imgItem) return;
    if (isTypingTarget && imgItem.type !== "image/png" && imgItem.type !== "image/jpeg" && imgItem.type !== "image/webp") {
      // Let normal paste continue for odd formats in text fields.
      return;
    }

    const blob = imgItem.getAsFile?.();
    if (!blob) return;
    e.preventDefault();
    const ext = blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png";
    const name = `paste_${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;
    void analyzeFile(new File([blob], name, { type: blob.type || "image/png" }));
  });

  elements.btnRunBatch.addEventListener("click", async () => {
    await withUiLock("Batch…", async () => {
      await runBatchFiles(elements.batchInput.files || []);
      setStatus("Ready");
    });
  });

  elements.btnDownloadBatch.addEventListener("click", () => {
    if (!state.batchReports || state.batchReports.length === 0) return;
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    downloadJson(state.batchReports, `osint_reports_${ts}.json`);
    logAction("batch_export_downloaded", `${state.batchReports.length} reports`);
  });

  elements.btnChooseCompare.addEventListener("click", () => {
    if (!state.file) return;
    elements.compareInput.click();
  });

  elements.compareInput.addEventListener("change", () => {
    const file = elements.compareInput.files?.[0];
    if (file) void analyzeCompareFile(file);
  });

  elements.btnClearCompare.addEventListener("click", clearCompare);
}

function validateLibs() {
  const missing = [];
  if (!window.exifr) missing.push("exifr");
  if (!window.sha256) missing.push("js-sha256");
  if (!window.SparkMD5) missing.push("spark-md5");
  if (missing.length > 0) {
    elements.exifOut.textContent =
      "Some libraries failed to load. If you opened this via file://, try running a local server (see README).";
  }
}

async function checkLocalServerHint() {
  // Non-blocking hint: uploads/search need the local server.
  try {
    const controller = new AbortController();
    const t = window.setTimeout(() => controller.abort(), LOCAL_SERVER_HINT_TIMEOUT_MS);
    const res = await fetch("/api/ping", { cache: "no-store", signal: controller.signal });
    window.clearTimeout(t);
    if (!res.ok) throw new Error("ping");
    state.localServerOnline = true;
    renderOnboardingStrip();
  } catch (error) {
    reportNonFatalError("server-hint.ping", error, { harmless: true, dedupeMs: 5000 });
    state.localServerOnline = false;
    renderOnboardingStrip();
    setStatusLine(LOCAL_SERVER_HINT_MESSAGE);
  }
}

function setFxVars(scanline, chromatic) {
  const root = document.documentElement;
  if (typeof scanline === "number") root.style.setProperty("--scanline", String(scanline));
  if (typeof chromatic === "number") root.style.setProperty("--chromatic", String(chromatic));
}

function setFxControlsEnabled(enabled) {
  if (elements.scanlineSlider) elements.scanlineSlider.disabled = !enabled;
  if (elements.chromaticSlider) elements.chromaticSlider.disabled = !enabled;
  if (elements.btnOverclock) elements.btnOverclock.disabled = !enabled;
  if (elements.chkChrome) elements.chkChrome.disabled = !enabled;
  if (elements.chkHud) elements.chkHud.disabled = !enabled;
}

function resetHudLayout() {
  document.querySelectorAll(".hud.floating").forEach((c) => {
    c.classList.remove("floating");
    c.style.removeProperty("left");
    c.style.removeProperty("top");
    c.style.removeProperty("width");
  });
}

function applyChromeSkin() {
  document.body.classList.toggle("skin-chrome", Boolean(state.chromeSkinWanted && isFunModeEnabled()));
}

function applyHudMode() {
  const on = Boolean(state.hudWanted && isFunModeEnabled());
  document.body.classList.toggle("hud-mode", on);
  if (!on) {
    resetHudLayout();
    return;
  }
  document.querySelectorAll(".hud").forEach((card) => {
    const key = card.getAttribute("data-hud-key");
    if (!key) return;
    const raw = readStorage(`hud:${key}`, "", `hud.${key}.read`);
    if (!raw) return;
    const p = safeJsonParse(raw, null, `hud.${key}.parse`, { harmless: true });
    if (!p) return;
    if (typeof p.left !== "number" || typeof p.top !== "number") return;
    if (typeof p.width !== "number") return;
    card.classList.add("floating");
    card.style.left = `${p.left}px`;
    card.style.top = `${p.top}px`;
    card.style.width = `${p.width}px`;
  });
}

function applyFunMode(enabled, { persist = true } = {}) {
  state.funMode = Boolean(enabled);
  document.body.classList.toggle("fun-mode", state.funMode);
  const scanline = state.funMode ? Number(elements.scanlineSlider?.value || FX_SCANLINE_FUN_DEFAULT) : FX_SCANLINE_DEFAULT;
  const chromatic = state.funMode ? Number(elements.chromaticSlider?.value || FX_CHROMATIC_FUN_DEFAULT) : FX_CHROMATIC_DEFAULT;
  setFxVars(scanline, chromatic);
  setFxControlsEnabled(state.funMode);
  applyHudMode();
  applyChromeSkin();
  if (persist) writeStorage(STORAGE_FX_FUN_MODE_KEY, state.funMode ? "1" : "0", "fx.fun-mode.write");
}

function setupFx() {
  const funMode = readStorage(STORAGE_FX_FUN_MODE_KEY, FX_FUN_MODE_DEFAULT ? "1" : "0", "fx.fun-mode.read") === "1";
  const operatorMode = readStorage(STORAGE_OPERATOR_MODE_KEY, "1", "ui.operator-mode.read") === "1";
  const scanline = Number(readStorage(STORAGE_FX_SCANLINE_KEY, String(FX_SCANLINE_FUN_DEFAULT), "fx.scanline.read"));
  const chromatic = Number(readStorage(STORAGE_FX_CHROMATIC_KEY, String(FX_CHROMATIC_FUN_DEFAULT), "fx.chromatic.read"));
  state.hudWanted = readStorage(STORAGE_FX_HUD_KEY, FX_HUD_DEFAULT ? "1" : "0", "fx.hud.read") === "1";
  state.chromeSkinWanted = readStorage(STORAGE_SKIN_CHROME_KEY, FX_CHROME_DEFAULT ? "1" : "0", "fx.chrome.read") === "1";

  if (elements.chkFunMode) elements.chkFunMode.checked = funMode;
  if (elements.chkOperatorMode) elements.chkOperatorMode.checked = operatorMode;
  if (elements.scanlineSlider)
    elements.scanlineSlider.value = String(Math.max(0, Math.min(FX_SCANLINE_MAX, Number.isFinite(scanline) ? scanline : FX_SCANLINE_FUN_DEFAULT)));
  if (elements.chromaticSlider)
    elements.chromaticSlider.value = String(Math.max(0, Math.min(FX_CHROMATIC_MAX, Number.isFinite(chromatic) ? chromatic : FX_CHROMATIC_FUN_DEFAULT)));
  if (elements.chkHud) elements.chkHud.checked = state.hudWanted;
  if (elements.chkChrome) elements.chkChrome.checked = state.chromeSkinWanted;

  applyFunMode(funMode, { persist: false });
  applyOperatorMode(operatorMode, { persist: false });

  elements.chkFunMode?.addEventListener("change", () => {
    applyFunMode(Boolean(elements.chkFunMode.checked));
  });
  elements.chkOperatorMode?.addEventListener("change", () => {
    applyOperatorMode(Boolean(elements.chkOperatorMode.checked));
  });
  elements.scanlineSlider?.addEventListener("input", () => {
    const v = Number(elements.scanlineSlider.value);
    writeStorage(STORAGE_FX_SCANLINE_KEY, String(v), "fx.scanline.write");
    if (isFunModeEnabled()) setFxVars(v, null);
  });

  elements.chromaticSlider?.addEventListener("input", () => {
    const v = Number(elements.chromaticSlider.value);
    writeStorage(STORAGE_FX_CHROMATIC_KEY, String(v), "fx.chromatic.write");
    if (isFunModeEnabled()) setFxVars(null, v);
  });

  elements.btnOverclock?.addEventListener("click", () => {
    const s = FX_OVERCLOCK_SCANLINE;
    const c = FX_OVERCLOCK_CHROMATIC;
    if (elements.scanlineSlider) elements.scanlineSlider.value = String(s);
    if (elements.chromaticSlider) elements.chromaticSlider.value = String(c);
    writeStorage(STORAGE_FX_SCANLINE_KEY, String(s), "fx.scanline.write");
    writeStorage(STORAGE_FX_CHROMATIC_KEY, String(c), "fx.chromatic.write");
    if (!isFunModeEnabled() && elements.chkFunMode) elements.chkFunMode.checked = true;
    applyFunMode(true);
  });

  elements.chkHud?.addEventListener("change", () => {
    state.hudWanted = Boolean(elements.chkHud.checked);
    writeStorage(STORAGE_FX_HUD_KEY, state.hudWanted ? "1" : "0", "fx.hud.write");
    applyHudMode();
  });
  elements.chkChrome?.addEventListener("change", () => {
    state.chromeSkinWanted = Boolean(elements.chkChrome.checked);
    writeStorage(STORAGE_SKIN_CHROME_KEY, state.chromeSkinWanted ? "1" : "0", "fx.chrome.write");
    applyChromeSkin();
  });
}

function setupHudDrag() {
  let z = 60;
  let dragging = null;

  const onMove = (e) => {
    if (!dragging) return;
    const { card, dx, dy } = dragging;
    card.style.left = `${e.clientX - dx}px`;
    card.style.top = `${e.clientY - dy}px`;
  };

  const onUp = () => {
    if (!dragging) return;
    const { card } = dragging;
    dragging = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp, true);

    const key = card.getAttribute("data-hud-key");
    if (!key) return;
    const left = Number.parseFloat(card.style.left);
    const top = Number.parseFloat(card.style.top);
    const width = Number.parseFloat(card.style.width);
    if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(width)) return;
    writeStorage(`hud:${key}`, JSON.stringify({ left, top, width }), `hud.${key}.write`);
  };

  document.addEventListener("pointerdown", (e) => {
    if (!document.body.classList.contains("hud-mode")) return;
    const title = e.target?.closest?.(".hud .subcard-head, .hud .card-title-row");
    if (!title) return;
    const card = title.closest(".hud");
    if (!card) return;

    const rect = card.getBoundingClientRect();
    if (!card.classList.contains("floating")) {
      card.classList.add("floating");
      card.style.left = `${rect.left}px`;
      card.style.top = `${rect.top}px`;
      card.style.width = `${rect.width}px`;
    }

    z += 1;
    card.style.zIndex = String(z);

    dragging = { card, dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, true);
  });
}

function setupTabs() {
  const tabs = Array.from(document.querySelectorAll(".tab[data-tab]"));
  const panels = Array.from(document.querySelectorAll(".tabpanel[data-panel]"));
  const tabsWrap = document.querySelector(".tabs");
  if (tabs.length === 0 || panels.length === 0) return;

  const activate = (name) => {
    if (tabsWrap) {
      tabsWrap.classList.remove("wave");
      // force reflow for restart
      void tabsWrap.offsetWidth;
      tabsWrap.classList.add("wave");
      window.setTimeout(() => tabsWrap.classList.remove("wave"), 560);
    }
    for (const t of tabs) {
      const on = t.getAttribute("data-tab") === name;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    }
    for (const p of panels) {
      p.classList.toggle("active", p.getAttribute("data-panel") === name);
    }
  };

  window.__osintActivateTab = activate;

  for (const t of tabs) {
    t.addEventListener("click", () => activate(t.getAttribute("data-tab")));
  }

  activate("search");
}

function setupCursorBubbles() {
  let last = 0;
  window.addEventListener("pointermove", (e) => {
    if (!isFunModeEnabled()) return;
    const now = performance.now();
    if (now - last < 140) return;
    last = now;
    if (Math.random() > 0.25) return;

    const b = document.createElement("div");
    b.className = "cursor-bubble";
    b.style.left = `${e.clientX + (Math.random() * 10 - 5)}px`;
    b.style.top = `${e.clientY + (Math.random() * 10 - 5)}px`;
    b.style.width = `${8 + Math.random() * 10}px`;
    b.style.height = b.style.width;
    document.body.appendChild(b);
    window.setTimeout(() => b.remove(), 950);
  });
}

function setupHoloTilt() {
  const card = document.querySelector(".console-card");
  if (!card) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let raf = 0;
  let lastX = 0;
  let lastY = 0;

  const apply = () => {
    raf = 0;
    const r = card.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (lastX - r.left) / Math.max(1, r.width)));
    const y = Math.max(0, Math.min(1, (lastY - r.top) / Math.max(1, r.height)));

    const tiltY = (x - 0.5) * 9;
    const tiltX = (y - 0.5) * -8;

    card.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
    card.style.setProperty("--glint-x", `${(x * 100).toFixed(1)}%`);
    card.style.setProperty("--glint-y", `${(y * 100).toFixed(1)}%`);
  };

  card.addEventListener("pointermove", (e) => {
    if (!isFunModeEnabled()) return;
    lastX = e.clientX;
    lastY = e.clientY;
    if (raf) return;
    raf = window.requestAnimationFrame(apply);
  });

  card.addEventListener("pointerleave", () => {
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
    card.style.setProperty("--glint-x", "55%");
    card.style.setProperty("--glint-y", "28%");
  });
}

function setupButtonRipples() {
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!isFunModeEnabled()) return;
      const btn = e.target?.closest?.(".btn");
      if (!btn) return;
      if (btn.disabled) return;

      const rect = btn.getBoundingClientRect();
      const rx = e.clientX - rect.left;
      const ry = e.clientY - rect.top;

      const r = document.createElement("span");
      r.className = "ripple";
      r.style.setProperty("--rx", `${rx}px`);
      r.style.setProperty("--ry", `${ry}px`);
      btn.appendChild(r);
      window.setTimeout(() => r.remove(), 900);
    },
    { passive: true },
  );
}

function setupChromeSkin() {
  applyChromeSkin();
}

function setupCommandPalette() {
  if (!elements.cmdk || !elements.cmdkInput || !elements.cmdkList) return;

  let open = false;
  let activeIndex = 0;

  const actions = [
    { name: "Prepare Engine Links", meta: "Reverse-search launchpad", keys: ["prepare", "search", "all", "reverse", "engines", "launchpad"], run: () => void handleSearchAll() },
    { name: "OSINT Pass", meta: "OCR + signals", keys: ["pass", "ocr", "signals", "attribution"], run: () => elements.btnRunPass?.click() },
    { name: "Copy Report", meta: "JSON to clipboard", keys: ["copy", "report", "json"], run: () => elements.btnCopyReport?.click() },
    { name: "Copy Public URL", meta: "If shared", keys: ["copy", "url", "public"], run: () => elements.btnCopyPublicUrl?.click() },
    { name: "Tab: Search", meta: "Console", keys: ["tab", "search"], run: () => window.__osintActivateTab?.("search") },
    { name: "Tab: Signals", meta: "Hashes + EXIF", keys: ["tab", "signals", "exif", "hash"], run: () => window.__osintActivateTab?.("signals") },
    { name: "Tab: Text", meta: "OCR", keys: ["tab", "text", "ocr"], run: () => window.__osintActivateTab?.("text") },
    { name: "Tab: Compare", meta: "Similarity", keys: ["tab", "compare", "dhash"], run: () => window.__osintActivateTab?.("compare") },
    { name: "Toggle Blue Chrome", meta: "Y2K skin", keys: ["toggle", "chrome", "skin"], run: () => (elements.chkChrome.checked = !elements.chkChrome.checked, elements.chkChrome.dispatchEvent(new Event("change"))) },
    { name: "Toggle HUD Mode", meta: "Drag panels", keys: ["toggle", "hud", "cockpit"], run: () => (elements.chkHud.checked = !elements.chkHud.checked, elements.chkHud.dispatchEvent(new Event("change"))) },
    { name: "Reset", meta: "Clear current image", keys: ["reset", "clear"], run: () => elements.btnReset?.click() },
  ].filter((a) => typeof a.run === "function");

  const setOpen = (v) => {
    open = Boolean(v);
    elements.cmdk.hidden = !open;
    elements.cmdk.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("cmdk-open", open);
    if (open) {
      elements.cmdkInput.value = "";
      activeIndex = 0;
      render();
      window.setTimeout(() => elements.cmdkInput.focus(), 0);
    }
  };

  const score = (a, q) => {
    if (!q) return 1;
    const hay = `${a.name} ${a.meta || ""} ${(a.keys || []).join(" ")}`.toLowerCase();
    const parts = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let s = 0;
    for (const p of parts) {
      if (hay.includes(p)) s += 2;
      else return 0;
    }
    if (a.name.toLowerCase().startsWith(parts[0])) s += 1;
    return s;
  };

  const filtered = () => {
    const q = elements.cmdkInput.value || "";
    return actions
      .map((a) => ({ a, s: score(a, q) }))
      .filter((x) => x.s > 0)
      .sort((x, y) => y.s - x.s)
      .map((x) => x.a);
  };

  const render = () => {
    const list = filtered();
    if (activeIndex >= list.length) activeIndex = Math.max(0, list.length - 1);

    elements.cmdkList.innerHTML = "";
    list.forEach((action, idx) => {
      const row = document.createElement("div");
      row.className = `cmdk-item${idx === activeIndex ? " active" : ""}`;
      row.setAttribute("role", "option");
      row.setAttribute("data-idx", String(idx));

      const left = document.createElement("div");
      left.textContent = action.name;

      const right = document.createElement("div");
      right.className = "meta";
      right.textContent = action.meta || "";

      row.appendChild(left);
      row.appendChild(right);
      row.addEventListener("mouseenter", () => {
        activeIndex = idx;
        render();
      });
      row.addEventListener("click", () => {
        const chosen = action;
        if (!chosen) return;
        setOpen(false);
        chosen.run();
      });

      elements.cmdkList.appendChild(row);
    });
  };

  const runActive = () => {
    const list = filtered();
    const chosen = list[activeIndex];
    if (!chosen) return;
    setOpen(false);
    chosen.run();
  };

  elements.cmdk.addEventListener("click", (e) => {
    if (e.target?.closest?.("[data-cmdk-close]")) setOpen(false);
  });

  elements.cmdkInput.addEventListener("input", render);
  elements.cmdkInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    const list = filtered();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = Math.min(list.length - 1, activeIndex + 1);
      render();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(0, activeIndex - 1);
      render();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      runActive();
    }
  });

  document.addEventListener("keydown", (e) => {
    const k = e.key?.toLowerCase?.();
    const hot = (k === "k" && (e.ctrlKey || e.metaKey) && !e.altKey) || (k === "p" && e.ctrlKey && e.shiftKey);
    if (!hot && !(open && e.key === "Escape")) return;

    e.preventDefault();
    if (hot) setOpen(!open);
    else if (open) setOpen(false);
  });
}

function triggerGlitterStorm(intensity = 52) {
  if (!isFunModeEnabled() || state.operatorMode) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layer = document.createElement("div");
  layer.className = "glitter-storm";
  document.body.appendChild(layer);

  const rect = document.querySelector(".console-card")?.getBoundingClientRect?.() || null;
  const baseX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const baseY = rect ? rect.top + 60 : 120;

  const n = Math.max(20, Math.min(120, intensity));
  for (let i = 0; i < n; i += 1) {
    const g = document.createElement("div");
    g.className = "glitter";
    const x = baseX + (Math.random() - 0.5) * (rect ? rect.width * 0.9 : 520);
    const y = baseY + (Math.random() - 0.2) * (rect ? rect.height * 0.35 : 180);
    const s = 6 + Math.random() * 10;
    const dx = (Math.random() - 0.5) * (120 + Math.random() * 240);
    const dy = -40 - Math.random() * 220;
    g.style.setProperty("--x", `${x}px`);
    g.style.setProperty("--y", `${y}px`);
    g.style.setProperty("--s", `${s}px`);
    g.style.setProperty("--dx", `${dx.toFixed(0)}px`);
    g.style.setProperty("--dy", `${dy.toFixed(0)}px`);
    layer.appendChild(g);
  }

  window.setTimeout(() => layer.remove(), 1050);
}

setupGlobalErrorSurface();
wireReverseSearchButtons();
setupDnD();
populateOcrLanguageOptions();
setupActions();
reset();
renderOnboardingStrip();
validateLibs();
void checkLocalServerHint();
void runDoctorChecks();
setupFx();
setupHudDrag();
setupTabs();
setupCommandPalette();
setupCursorBubbles();
setupButtonRipples();
setupChromeSkin();
state.session = loadSession();
void refreshHostStats();
setupEngineLaunchpad();
setupSimpleUi();
