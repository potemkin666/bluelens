/* global exifr, sha256, SparkMD5 */

/* global OCR_PIPELINE */
/* global OSINT_LIB */
/* global BLUELENS_HELPERS */

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
  cmpA: document.getElementById("cmpA"),
  cmpB: document.getElementById("cmpB"),
  cmpDist: document.getElementById("cmpDist"),
  cmpVerdict: document.getElementById("cmpVerdict"),
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
  chkChrome: document.getElementById("chkChrome"),
  chkHud: document.getElementById("chkHud"),
  btnOpenLens: document.getElementById("btnOpenLens"),
  btnOpenBing: document.getElementById("btnOpenBing"),
  btnOpenTineye: document.getElementById("btnOpenTineye"),
  btnOpenYandex: document.getElementById("btnOpenYandex"),
  btnOpenGoogleImages: document.getElementById("btnOpenGoogleImages"),
  btnRetryUpload: document.getElementById("btnRetryUpload"),
  ocrLangHint: document.getElementById("ocrLangHint"),

  // Command palette
  cmdk: document.getElementById("cmdk"),
  cmdkInput: document.getElementById("cmdkInput"),
  cmdkList: document.getElementById("cmdkList"),

  // Caseboard
  caseName: document.getElementById("caseName"),
  btnNewCase: document.getElementById("btnNewCase"),
  btnSaveCase: document.getElementById("btnSaveCase"),
  caseSelect: document.getElementById("caseSelect"),
  btnLoadCase: document.getElementById("btnLoadCase"),
  btnExportCase: document.getElementById("btnExportCase"),
  btnDeleteCase: document.getElementById("btnDeleteCase"),
  caseOut: document.getElementById("caseOut"),
  caseNote: document.getElementById("caseNote"),
};

const osintBroadcast = (() => {
  try {
    return typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("osint-lens") : null;
  } catch {
    return null;
  }
})();

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
  ocrLangTouched: false,
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
  caseInfo: {
    where_obtained: "",
    when_obtained: "",
    who_provided: "",
    original_filename: "",
    analyst_confidence: "unverified",
  },
  insights: {
    repost_score: null,
    repost_reasons: [],
  },
  mutations: [],
  compare: {
    file: null,
    objectUrl: null,
    dhash: "",
  },
  signals: {
    sha256: "",
    md5: "",
    dhash: "",
  },
  exif: null,
  entityConfidence: {},
  lastEngineRun: null,
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
    elements.caseName,
    elements.btnNewCase,
    elements.btnSaveCase,
    elements.caseSelect,
    elements.btnLoadCase,
    elements.btnExportCase,
    elements.btnDeleteCase,
    elements.caseNote,
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
    elements.btnSaveCase,
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
  state.publicUrl = "";
  state.publicUrlPurpose = "";
  state.publicUrlArtifact = "original";
  state.uploadMeta = null;
  state.shareEnabled = false;
  state.uploading = false;
  state.gps = null;
  state.ocrText = "";
  state.ocrRunning = false;
  state.ocrLangTouched = false;
  state.entityConfidence = {};
  state.batchReports = [];
  state.batchItems = [];
  state.batchUi.selected = {};
  state.caseInfo = {
    where_obtained: "",
    when_obtained: "",
    who_provided: "",
    original_filename: "",
    analyst_confidence: "unverified",
  };
  state.insights = { repost_score: null, repost_reasons: [] };
  state.mutations = [];
  if (state.compare?.objectUrl) URL.revokeObjectURL(state.compare.objectUrl);
  state.compare = { file: null, objectUrl: null, dhash: "" };

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
    elements.ocrLangHint.textContent = "Hint";
  }
  elements.ocrLang.disabled = true;
  elements.btnRunOcr.disabled = true;
  elements.btnCopyOcr.disabled = true;
  if (elements.btnPivotSearch) elements.btnPivotSearch.disabled = true;
  elements.ocrPill.textContent = "Idle";
  elements.ocrPill.classList.add("pill-muted");

  elements.btnChooseCompare.disabled = true;
  elements.btnClearCompare.disabled = true;
  elements.compareInput.value = "";
  elements.compareImg.removeAttribute("src");
  elements.compareImg.style.display = "none";
  elements.compareEmpty.style.display = "grid";
  elements.cmpA.textContent = "—";
  elements.cmpB.textContent = "—";
  elements.cmpDist.textContent = "—";
  elements.cmpVerdict.textContent = "—";
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
  if (elements.confLevel) elements.confLevel.value = "unverified";
  if (elements.mutationOut) elements.mutationOut.textContent = "—";
  if (elements.mutationOut) elements.mutationOut.classList.remove("mut-box");
  if (elements.btnCopyMutations) elements.btnCopyMutations.disabled = true;
  elements.batchOut.textContent = "—";
  elements.btnDownloadBatch.disabled = true;
  setStatus("Idle");
  setStatusLine("");
  elements.btnTogglePretty.textContent = "Pretty: On";

  try {
    document.dispatchEvent(new Event("osint:file-changed"));
  } catch {
    // ignore
  }
}

function openUrl(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}

const ENGINE_ORDER = ["lens", "bing", "tineye", "yandex", "google_images"];
const ENGINE_LABEL = {
  lens: "Lens",
  bing: "Bing",
  tineye: "TinEye",
  yandex: "Yandex",
  google_images: "Google",
};
const ENGINE_ICON = {
  lens: "⌕",
  bing: "⧉",
  tineye: "◎",
  yandex: "⟡",
  google_images: "◉",
};

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
        const w = window.open(url, "_blank", "noopener,noreferrer");
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
  // Make "missions" the default control surface; tuck manual buttons into Advanced drawer.
  try {
    if (elements.btnRunMission) {
      elements.btnRunMission.classList.remove("btn-secondary");
      elements.btnRunMission.classList.add("btn");
    }

    // Move Copy Report into the mission row (keeps IDs, reduces visible button clutter).
    if (elements.missionRow && elements.btnCopyReport && elements.btnCopyReport.parentElement !== elements.missionRow) {
      elements.missionRow.appendChild(elements.btnCopyReport);
    }

    // Move the manual action row into the Advanced drawer body.
    const advBody = document.querySelector("details.drawer .drawer-body");
    if (advBody && elements.manualRow && elements.manualRow.parentElement !== advBody) {
      advBody.prepend(elements.manualRow);
    }

    // Default to the one thing most people want (persisted).
    if (elements.missionPreset) {
      elements.missionPreset.hidden = false;
      let saved = "";
      try {
        saved = localStorage.getItem("ui:missionPreset") || "";
      } catch {
        saved = "";
      }
      elements.missionPreset.value = saved || "share_search";
      elements.missionPreset.addEventListener("change", () => {
        try {
          localStorage.setItem("ui:missionPreset", elements.missionPreset.value || "share_search");
        } catch {
          // ignore
        }
      });
    }

    const syncRunLabel = () => {
      if (!elements.btnRunMission || !elements.missionPreset) return;
      const p = elements.missionPreset.value || "fast";
      elements.btnRunMission.textContent = p === "share_search" ? "Share+Search" : p === "deep" ? "Deep Scan" : "Fast Scan";
    };
    elements.missionPreset?.addEventListener?.("change", syncRunLabel);
    syncRunLabel();
  } catch {
    // ignore
  }
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

function publishWaitState(token, engine, data) {
  if (!token || !engine || !data) return;
  try {
    localStorage.setItem(`osint:${token}:${engine}`, JSON.stringify(data));
  } catch {
    // ignore
  }
  try {
    osintBroadcast?.postMessage({ token, engine, ...data });
  } catch {
    // ignore
  }
  try {
    void fetch("/api/status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, engine, ...data }),
    }).catch(() => {
      // ignore
    });
  } catch {
    // ignore
  }
}

function pulseRadar(kind) {
  const el = elements.radar;
  if (!el) return;
  el.classList.toggle("ocr", kind === "ocr");
  el.classList.remove("pulse");
  // force reflow for restart
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

const SESSION_KEY = "osint:session:v1";
const LAST_RUN_KEY = "osint:lastRun:v1";

function loadSession() {
  const fallback = { started_at: Date.now(), uploads_ok: 0, uploads_fail: 0, engines_opened: 0, last_host: "", last_ms: null };
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || "";
    const obj = raw ? safeJsonParse(raw, fallback) : fallback;
    if (!obj || typeof obj !== "object") return fallback;
    return { ...fallback, ...obj };
  } catch {
    return fallback;
  }
}

function loadLastRun() {
  try {
    const raw = sessionStorage.getItem(LAST_RUN_KEY) || "";
    const obj = raw ? safeJsonParse(raw, null) : null;
    if (!obj || typeof obj !== "object") return null;
    if (!obj.targets || typeof obj.targets !== "object") return null;
    return obj;
  } catch {
    return null;
  }
}

function saveLastRun(run) {
  try {
    sessionStorage.setItem(LAST_RUN_KEY, JSON.stringify(run || null));
  } catch {
    // ignore
  }
}

function saveSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
  } catch {
    // ignore
  }
}

function fmtMs(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return "—";
  if (n < 1000) return `${Math.round(n)}ms`;
  return `${(n / 1000).toFixed(1)}s`;
}

function triageSignalsForReport(report) {
  const gps = report?.gps && Number.isFinite(report.gps.lat) && Number.isFinite(report.gps.lon);
  // Keep reading the old field from saved cases/reports until they have all been re-exported with repost_heuristic.
  const repost = Number(report?.insights?.repost_heuristic ?? report?.insights?.repost_likelihood);
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

  // Lead score: prioritize local pivotability + quick-review heuristics.
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
  if (Number.isFinite(repost) && repost >= 80) tags.push({ t: "REPOST↑", tone: "hot" });
  if (report?.ocr_error) tags.push({ t: "OCRERR", tone: "warn" });

  return { lead, gps, repost: Number.isFinite(repost) ? repost : null, software, lowRes, hasExif, ent, entCount, tags, w, h, mp };
}

function clusterBatchItems(items, threshold = 8) {
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

  const clusters = clusterBatchItems(items, 8);

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
      const rep = t.repost != null ? `${t.repost}/100` : "—";
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
          ${head("repost", "Repost heuristic")}
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
      void openBatchTopLens(5);
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

async function openBatchTopLens(n = 5) {
  if (state.uiBusy) return;
  const items = Array.isArray(state.batchItems) ? state.batchItems.filter((x) => x?.file && x?.report) : [];
  if (items.length === 0) return;

  // Ensure triage computed.
  for (const it of items) if (!it.triage) it.triage = triageSignalsForReport(it.report);
  const pick = items
    .slice()
    .sort((a, b) => (b.triage?.lead || 0) - (a.triage?.lead || 0))
    .slice(0, Math.max(1, Math.min(10, n)));

  const tokens = pick.map((_, i) => `${Date.now()}-${Math.random().toString(16).slice(2)}-${i}`);
  for (let i = 0; i < pick.length; i += 1) {
    const label = `Batch · Lens · ${pick[i].report?.file?.name || `#${i + 1}`}`;
    const waitUrl = `/wait.html?token=${encodeURIComponent(tokens[i])}&engine=lens&label=${encodeURIComponent(label)}`;
    window.open(waitUrl, "_blank");
    publishWaitState(tokens[i], "lens", { status: "uploading" });
  }

  await withUiLock("Top lens…", async () => {
    for (let i = 0; i < pick.length; i += 1) {
      try {
        const f = await fileToUploadForBatch(pick[i].file);
        const url = await publicUrlForFile(f, "lens");
        publishWaitState(tokens[i], "lens", { url });
      } catch (e) {
        publishWaitState(tokens[i], "lens", { err: e?.message || "upload failed" });
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

  const cap = Math.min(10, picked.length);
  const pick = picked.slice(0, cap);

  const tokens = pick.map((_, i) => `${Date.now()}-${Math.random().toString(16).slice(2)}-${i}`);
  for (let i = 0; i < pick.length; i += 1) {
    const label = `Batch · Selected · Lens · ${pick[i].report?.file?.name || `#${i + 1}`}`;
    const waitUrl = `/wait.html?token=${encodeURIComponent(tokens[i])}&engine=lens&label=${encodeURIComponent(label)}`;
    window.open(waitUrl, "_blank");
    publishWaitState(tokens[i], "lens", { status: "uploading" });
  }

  await withUiLock(`Selected lens (${pick.length})…`, async () => {
    for (let i = 0; i < pick.length; i += 1) {
      try {
        const f = await fileToUploadForBatch(pick[i].file);
        const url = await publicUrlForFile(f, "lens");
        publishWaitState(tokens[i], "lens", { url });
      } catch (e) {
        publishWaitState(tokens[i], "lens", { err: e?.message || "upload failed" });
      }
    }
    setStatus("Ready");
  });
}

async function ocrForBatchFile(file, lang) {
  const worker = await getOcrWorker(lang || "eng");
  let enhanced = null;
  const url = URL.createObjectURL(file);
  try {
    try {
      enhanced = await OCR_PIPELINE.preprocessOtsu(url, { maxDim: 1400 });
    } catch {
      enhanced = null;
    }
    const rr = await worker.recognize(enhanced || file);
    return (rr?.data?.text || "").trim();
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function runBatchOcrTopCandidates(n = 8) {
  if (state.uiBusy) return;
  const items = Array.isArray(state.batchItems) ? state.batchItems.filter((x) => x?.file && x?.report) : [];
  if (items.length === 0) return;

  const cap = Math.max(1, Math.min(20, Number(n) || 8));
  for (const it of items) if (!it.triage) it.triage = triageSignalsForReport(it.report);

  const pick = items
    .slice()
    .sort((a, b) => (b.triage?.lead || 0) - (a.triage?.lead || 0))
    .slice(0, cap);

  await withUiLock(`Batch OCR (${pick.length})…`, async () => {
    const lang = elements.ocrLang?.value || "eng";
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

  await withUiLock(p === "share_search" ? "Share+Search…" : p === "deep" ? "Deep scan…" : "Fast scan…", async () => {
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
      const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const waitUrl = `/wait.html?token=${encodeURIComponent(token)}&engine=lens&label=${encodeURIComponent("Mission · Lens")}`;
      window.open(waitUrl, "_blank");
      publishWaitState(token, "lens", { status: "uploading" });

      if (!state.shareEnabled) {
        state.shareEnabled = true;
        elements.chkEnableShare.checked = true;
        setShareControlsEnabled(true);
      }

      setStatusLine("Upload: … · Lens: …");
      const url = await ensurePublicUrl({ purpose: "lens" });
      publishWaitState(token, "lens", { url });

      const targets = engines.map((e) => reverseSearchUrl(e, url));
      const run = {
        ts: Date.now(),
        url,
        token,
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
    const t = window.setTimeout(() => controller.abort(), 2000);
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
        const n = Math.max(1, ok + fail);
        const fr = fail / n;
        const badge = fr >= 0.4 ? "HOT" : fr >= 0.2 ? "WARN" : "OK";
        return { host, ok, fail, avgMs, fr, badge };
      })
      .sort((a, b) => a.fr - b.fr || a.avgMs - b.avgMs);

    const session = state.session || loadSession();
    const lines = [
      `Session: engines ${session.engines_opened} · uploads ${session.uploads_ok}/${session.uploads_ok + session.uploads_fail} · last ${session.last_host || "—"} ${fmtMs(session.last_ms)}`,
      rows.length ? `Hosts: ${rows.map((r) => `${r.host} ${r.badge} ok${r.ok}/f${r.fail} avg${fmtMs(r.avgMs)}`).join(" · ")}` : "Hosts: —",
    ];

    elements.hostStatsOut.textContent = lines.join("\n");
    elements.hostStatsOut.hidden = false;
  } catch {
    elements.hostStatsOut.hidden = true;
  }
}

const reverseSearchUrl = (engine, imageUrl) => OSINT_LIB?.reverseSearchUrl?.(engine, imageUrl) || "";
const reverseSearchUploadPage = (engine) => OSINT_LIB?.reverseSearchUploadPage?.(engine) || "about:blank";

async function uploadViaLocalProxy(file, purpose = "") {
  // Prefer local proxy to avoid CORS limitations in browsers when posting to third-party hosts.
  const ab = await file.arrayBuffer();
  const controller = new AbortController();
  const t = window.setTimeout(() => controller.abort(), 45_000);
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
  } catch {
    window.clearTimeout(t);
    state.session = loadSession();
    state.session.uploads_fail += 1;
    saveSession();
    void refreshHostStats();
    throw new Error("Local upload endpoint unreachable. Start `node server.js` and reload.");
  }
  window.clearTimeout(t);

  const txt = (await res.text()).trim();
  let parsed = null;
  try {
    parsed = txt ? JSON.parse(txt) : null;
  } catch {
    parsed = null;
  }

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
    state.uploadMeta = { host: parsed.host || null, ms: parsed.ms || null, attempts: parsed.attempts || null };
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
      const t = window.setTimeout(() => controller.abort(), 2500);
      const r = await fetch("/api/ping", { cache: "no-store", signal: controller.signal });
      window.clearTimeout(t);
      if (!r.ok) throw new Error("ping failed");
    } catch {
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
          } catch {
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
      "To one-click reverse search, this will upload your image to a temporary file host to generate a public URL. Enable one-click mode?",
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
  const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
  const waitUrl = `/wait.html?token=${encodeURIComponent(token)}&engine=${encodeURIComponent(engine)}&label=${encodeURIComponent(label)}`;
  window.open(waitUrl, "_blank");
  state.session = loadSession();
  state.session.engines_opened += 1;
  saveSession();
  void refreshHostStats();
  publishWaitState(token, engine, { status: "uploading" });

  await withUiLock("Uploading…", async () => {
    try {
      const url = await ensurePublicUrl({ purpose: engine === "lens" ? "lens" : "" });
      publishWaitState(token, engine, { url });
      setStatus("Ready");
    } catch (e) {
      const msg = e?.message || "unknown error";
      setShareStatus("Upload failed");
      elements.publicUrlOut.textContent = `Upload failed: ${msg}`;
      publishWaitState(token, engine, { err: msg });
      openUrl(reverseSearchUploadPage(engine));
    }
  });
}

async function handleSearchAll() {
  if (!state.file) return;
  if (state.uiBusy) return;

  // Less chaos: open ONE tab (Lens) + render launchpad for the rest.
  const engines = ["lens", "bing", "tineye", "yandex", "google_images"];
  const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const waitUrl = `/wait.html?token=${encodeURIComponent(token)}&engine=lens&label=${encodeURIComponent("Lens")}`;
  window.open(waitUrl, "_blank");
  publishWaitState(token, "lens", { status: "uploading" });

  if (!state.shareEnabled) {
    const ok = window.confirm(
      "To run all engines automatically, this will upload your image to a temporary file host to generate a public URL. Enable one-click mode?",
    );
    if (!ok) return;
    state.shareEnabled = true;
    elements.chkEnableShare.checked = true;
    setShareControlsEnabled(true);
  }

  await withUiLock("Search all…", async () => {
    const url = await ensurePublicUrl({ purpose: "lens" });
    publishWaitState(token, "lens", { url });

    const targets = engines.map((e) => reverseSearchUrl(e, url));
    const run = {
      ts: Date.now(),
      url,
      token,
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

    state.session = loadSession();
    state.session.engines_opened += 1;
    saveSession();
    void refreshHostStats();

    triggerGlitterStorm(68);
    setStatus("Ready");
  }).catch((e) => {
    setShareStatus("Upload failed");
    const msg = e?.message || "unknown error";
    elements.publicUrlOut.textContent = `Upload failed: ${msg}`;
    publishWaitState(token, "lens", { err: msg });
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

function clusterByDhash(items, threshold = 10) {
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
  const noteRank = (value) => (value === "best_candidate" ? 2 : value === "possible_match" ? 1 : 0);
  const getEngineReviewValue = (row, engine) => {
    const raw = row?.engine_review?.[engine] || row?.score?.[engine] || "review";
    return raw === "hit" ? "match" : raw === "no" ? "no_match" : raw;
  };

  const pickWinner = (engine) => {
    const hits = rows
      .filter((r) => getEngineReviewValue(r, engine) === "match")
      .sort((a, b) => {
        const ca = noteRank(a.analyst_annotation || a.confidence);
        const cb = noteRank(b.analyst_annotation || b.confidence);
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
          `<option value="possible_match"${analystAnnotation === "possible_match" ? " selected" : ""}>Possible</option>` +
          `<option value="best_candidate"${analystAnnotation === "best_candidate" ? " selected" : ""}>Best</option>` +
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
  const urls = new Set();
  const add = (u) => {
    if (!u) return;
    urls.add(u);
  };

  const google = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

  const domains = [];
  for (const u of (ent?.urls || []).slice(0, 10)) {
    try {
      const parsed = new URL(u);
      const host = (parsed.hostname || "").replace(/^www\./i, "");
      if (host) domains.push(host);
    } catch {
      // ignore
    }
  }

  for (const d of Array.from(new Set(domains)).slice(0, 6)) {
    add(google(`site:${d}`));
    add(google(`"${d}" repost`));
  }

  for (const e of (ent?.emails || []).slice(0, 6)) add(google(`"${e}"`));
  for (const p of (ent?.phones || []).slice(0, 4)) add(google(`"${p}"`));

  for (const hRaw of (ent?.handles || []).slice(0, 8)) {
    const h = String(hRaw || "").replace(/^@/, "").trim();
    if (!h) continue;
    add(google(`@${h}`));
    // Lightweight platform-aware pivot (premium can do more; MVP keeps it capped).
    add(google(`"${h}" (site:instagram.com OR site:tiktok.com OR site:x.com OR site:youtube.com)`));
  }

  // Also pivot on the actual URLs found (open the first few directly).
  for (const u of (ent?.urls || []).slice(0, 5)) add(u);

  return Array.from(urls);
}

function buildMarkdownReport(report) {
  const r = report || {};
  const file = r.file || {};
  const clean = r.clean_copy || null;
  const gps = r.gps;
  const kf = r.key_fields || {};
  const sr = r.source_reliability || {};
  const entities = kf.ocr_entities || {};

  const lines = [];
  lines.push(`# OSINT Report`);
  lines.push(`Generated: ${r.generated_at || "—"}`);
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
  lines.push(`- Captured: ${kf.captured ? `\`${kf.captured}\`` : "—"}`);
  lines.push(`- Camera: ${kf.camera ? `\`${kf.camera}\`` : "—"}`);
  lines.push(`- Software: ${kf.software ? `\`${kf.software}\`` : "—"}`);
  lines.push(`- GPS: ${gps ? `\`${fmtCoord(gps.lat)}, ${fmtCoord(gps.lon)}\`` : "—"}`);
  lines.push("");
  lines.push(`## Insights`);
  lines.push(`- Repost heuristic: ${r.insights?.repost_heuristic != null ? `**${r.insights.repost_heuristic}/100**` : "—"}`);
  if (Array.isArray(r.insights?.repost_reasons) && r.insights.repost_reasons.length) {
    lines.push(`- Heuristic reasons: ${r.insights.repost_reasons.map((x) => `\`${String(x)}\``).join(" · ")}`);
  }
  if (r.insights?.attribution_hints) lines.push(`- Attribution hints: ${String(r.insights.attribution_hints)}`);
  lines.push("");
  lines.push(`## Public URL`);
  lines.push(`- URL: ${r.public_url ? `${r.public_url}` : "—"}`);
  lines.push(`- Upload artifact: \`${r.public_upload_artifact || "—"}\``);
  lines.push(`- Share safe: \`${r.share_safe ? "on" : "off"}\``);
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
  lines.push("");
  lines.push(`## Source Reliability`);
  lines.push(`- Where: ${sr.where_obtained ? `\`${sr.where_obtained}\`` : "—"}`);
  lines.push(`- When: ${sr.when_obtained ? `\`${sr.when_obtained}\`` : "—"}`);
  lines.push(`- Who: ${sr.who_provided ? `\`${sr.who_provided}\`` : "—"}`);
  lines.push(`- Original filename: ${sr.original_filename ? `\`${sr.original_filename}\`` : "—"}`);
  lines.push(`- Analyst confidence (manual): \`${sr.analyst_confidence || "unverified"}\``);
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

function updateKeyFields(exifObj) {
  const captured =
    exifObj?.DateTimeOriginal ||
    exifObj?.CreateDate ||
    exifObj?.ModifyDate ||
    exifObj?.DateTimeDigitized ||
    exifObj?.datetime ||
    null;

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

  elements.kfCaptured.textContent = captured ? String(captured) : "—";
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

function computeRepostScore({ exifObj, file, width, height, ocrText }) {
  const reasons = [];
  let score = 50;

  const hasExif = Boolean(exifObj && Object.keys(exifObj).length > 0);
  if (!hasExif) {
    score += 18;
    reasons.push("No EXIF/metadata found");
  }

  const gps = getGps(exifObj);
  if (gps) {
    score -= 20;
    reasons.push("GPS present (often original capture)");
  }

  const make = (exifObj?.Make || "").trim();
  const model = (exifObj?.Model || "").trim();
  if (make || model) {
    score -= 12;
    reasons.push("Camera make/model present");
  }

  const captured = exifObj?.DateTimeOriginal || exifObj?.CreateDate || exifObj?.DateTimeDigitized;
  if (captured) {
    score -= 8;
    reasons.push("Capture timestamp present");
  }

  const software = (exifObj?.Software || exifObj?.ProcessingSoftware || exifObj?.CreatorTool || "").trim();
  const platforms = detectPlatformFromSoftware(software);
  if (software) {
    score += 10;
    reasons.push(`Software tag: ${software}`);
  }
  if (platforms.length > 0) {
    score += 22;
    reasons.push(`Platform/app hint: ${platforms.join(", ")}`);
  }

  if (file?.type === "image/jpeg" && file?.size && file.size < 450_000) {
    score += 10;
    reasons.push("Small JPEG (common repost/compress)");
  }

  if (Number.isFinite(width) && Number.isFinite(height)) {
    const mp = (width * height) / 1_000_000;
    if (mp < 1.0) {
      score += 12;
      reasons.push("Low resolution (common repost)");
    } else if (mp > 10) {
      score -= 6;
      reasons.push("Very high resolution (more likely original)");
    }
  }

  const { handles, domains } = extractHandlesAndDomains(ocrText);
  if (handles.length > 0 || domains.length > 0) {
    score += 10;
    reasons.push("OCR contains handles/domains (likely shared graphic)");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, reasons };
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
  const { score, reasons } = computeRepostScore({ exifObj, file, width, height, ocrText });
  elements.repostScore.textContent = `${score}/100`;

  if (elements.repostReasons) {
    const top = Array.isArray(reasons) ? reasons.slice(0, 3) : [];
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
  return { score, reasons };
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

const CASEBOARD_STORAGE_KEY = "caseboard:v1";
const CASEBOARD_ACTIVE_KEY = "caseboard:activeCaseId";
const CASEBOARD_MAX_EVENTS = 80;

function safeJsonParse(txt, fallback) {
  try {
    return JSON.parse(txt);
  } catch {
    return fallback;
  }
}

function loadCaseboard() {
  const fallback = { version: 1, cases: [] };
  let obj = fallback;
  try {
    obj = safeJsonParse(localStorage.getItem(CASEBOARD_STORAGE_KEY) || "", fallback);
  } catch {
    obj = fallback;
  }
  if (!obj || typeof obj !== "object") return fallback;
  if (!Array.isArray(obj.cases)) obj.cases = [];
  obj.version = 1;
  return obj;
}

function saveCaseboard(obj) {
  try {
    localStorage.setItem(CASEBOARD_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // ignore (storage full / blocked)
  }
}

function getActiveCaseId() {
  try {
    return localStorage.getItem(CASEBOARD_ACTIVE_KEY) || "";
  } catch {
    return "";
  }
}

function setActiveCaseId(id) {
  try {
    localStorage.setItem(CASEBOARD_ACTIVE_KEY, id || "");
  } catch {
    // ignore
  }
}

function newCaseId() {
  try {
    return crypto?.randomUUID ? crypto.randomUUID() : `case_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  } catch {
    return `case_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

function fmtTs(ts) {
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

async function sha256HexUtf8(str) {
  const enc = new TextEncoder();
  const buf = enc.encode(String(str || ""));
  const dig = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(dig);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
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

function renderCaseSelect(caseboard, activeId) {
  if (!elements.caseSelect) return;
  const cases = [...(caseboard?.cases || [])].sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  elements.caseSelect.innerHTML = "";
  for (const c of cases) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.name || c.id} · ${c.events?.length || 0}`;
    elements.caseSelect.appendChild(opt);
  }
  elements.caseSelect.disabled = state.uiBusy ? true : cases.length === 0;
  if (activeId && cases.some((c) => c.id === activeId)) elements.caseSelect.value = activeId;
  else if (cases[0]) elements.caseSelect.value = cases[0].id;
}

function renderActiveCase(caseboard, activeId) {
  if (!elements.caseOut) return;
  const c = (caseboard?.cases || []).find((x) => x.id === activeId) || null;
  const hasCase = Boolean(c);
  if (!hasCase) {
    elements.caseOut.textContent = "—";
    if (elements.btnExportCase) elements.btnExportCase.disabled = true;
    if (elements.btnDeleteCase) elements.btnDeleteCase.disabled = true;
    if (elements.btnLoadCase) elements.btnLoadCase.disabled = true;
    return;
  }

  const events = Array.isArray(c.events) ? c.events : [];
  const last = events[events.length - 1] || null;
  const pivots = last?.pivots || [];
  const lines = [
    `Active: ${c.name || c.id}`,
    `Events: ${events.length} · Updated: ${fmtTs(c.updated_at)}`,
    last ? `Last: ${fmtTs(last.ts)} · ${last.file_name || "image"}` : "Last: —",
    pivots.length ? `Pivots: ${pivots.join(" · ")}` : "Pivots: —",
    last?.hash ? `Chain: ${String(last.hash).slice(0, 16)}…` : "Chain: —",
  ];

  elements.caseOut.textContent = lines.join("\n");
  if (elements.btnExportCase) elements.btnExportCase.disabled = state.uiBusy ? true : false;
  if (elements.btnDeleteCase) elements.btnDeleteCase.disabled = state.uiBusy ? true : false;
  if (elements.btnLoadCase) elements.btnLoadCase.disabled = state.uiBusy ? true : false;
}

async function saveCurrentToCaseboard({ createIfMissing = true } = {}) {
  if (!state.file) throw new Error("No file loaded");
  const caseboard = loadCaseboard();
  let activeId = getActiveCaseId();

  if (!activeId && createIfMissing) {
    const nameRaw = (elements.caseName?.value || "").trim();
    const name = nameRaw || `Case-${new Date().toISOString().slice(0, 10)}`;
    activeId = newCaseId();
    caseboard.cases.push({ id: activeId, name, created_at: Date.now(), updated_at: Date.now(), events: [] });
    setActiveCaseId(activeId);
  }

  const c = caseboard.cases.find((x) => x.id === activeId) || null;
  if (!c) throw new Error("No active case selected");
  if (!Array.isArray(c.events)) c.events = [];

  const report = buildOsintReport();
  const pivots = extractPivotsFromReport(report);
  const note = (elements.caseNote?.value || "").trim();
  const thumb = await makeThumbnailDataUrl(state.file);

  const prevHash = c.events.length ? c.events[c.events.length - 1]?.hash || "" : "";
  const core = {
    ts: Date.now(),
    type: "image_report",
    file_name: state.file?.name || null,
    note: note || null,
    pivots,
    report,
    thumb,
    prev_hash: prevHash || null,
  };
  const hash = await sha256HexUtf8(`${prevHash}\n${JSON.stringify(core)}`);
  const ev = { id: newCaseId(), ...core, hash };

  c.events.push(ev);
  if (c.events.length > CASEBOARD_MAX_EVENTS) c.events.splice(0, c.events.length - CASEBOARD_MAX_EVENTS);
  c.updated_at = Date.now();

  saveCaseboard(caseboard);
  setActiveCaseId(activeId);
  renderCaseSelect(caseboard, activeId);
  renderActiveCase(caseboard, activeId);
  if (elements.btnSaveCase) elements.btnSaveCase.disabled = state.uiBusy ? true : false;
}

function exportActiveCase() {
  const caseboard = loadCaseboard();
  const activeId = getActiveCaseId();
  const c = caseboard.cases.find((x) => x.id === activeId) || null;
  if (!c) return;
  const payload = {
    version: 1,
    exported_at: new Date().toISOString(),
    case: c,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const name = (c.name || "case").replace(/[^\w.-]+/g, "_").slice(0, 80);
  downloadBlob(blob, `${name}_caseboard.json`);
}

function deleteActiveCase() {
  const caseboard = loadCaseboard();
  const activeId = getActiveCaseId();
  const idx = caseboard.cases.findIndex((x) => x.id === activeId);
  if (idx === -1) return;
  caseboard.cases.splice(idx, 1);
  saveCaseboard(caseboard);
  setActiveCaseId(caseboard.cases[0]?.id || "");
  renderCaseSelect(caseboard, getActiveCaseId());
  renderActiveCase(caseboard, getActiveCaseId());
}

function setupCaseboard() {
  if (!elements.caseOut || !elements.btnSaveCase || !elements.btnNewCase || !elements.caseSelect) return;

  const refresh = () => {
    const cb = loadCaseboard();
    const activeId = getActiveCaseId();
    renderCaseSelect(cb, activeId);
    const selectedId = elements.caseSelect.value || activeId;
    renderActiveCase(cb, selectedId || activeId);

    if (elements.btnNewCase) elements.btnNewCase.disabled = state.uiBusy ? true : false;
    if (elements.btnSaveCase) elements.btnSaveCase.disabled = state.uiBusy ? true : !Boolean(state.file);
    if (elements.btnLoadCase) elements.btnLoadCase.disabled = state.uiBusy ? true : elements.caseSelect.disabled;
    if (elements.btnExportCase) elements.btnExportCase.disabled = state.uiBusy ? true : elements.caseSelect.disabled;
    if (elements.btnDeleteCase) elements.btnDeleteCase.disabled = state.uiBusy ? true : elements.caseSelect.disabled;
  };

  refresh();

  elements.btnNewCase.addEventListener("click", () => {
    if (state.uiBusy) return;
    const cb = loadCaseboard();
    const nameRaw = (elements.caseName?.value || "").trim();
    const name = nameRaw || `Case-${new Date().toISOString().slice(0, 10)}`;
    const id = newCaseId();
    cb.cases.push({ id, name, created_at: Date.now(), updated_at: Date.now(), events: [] });
    saveCaseboard(cb);
    setActiveCaseId(id);
    refresh();
  });

  elements.btnSaveCase.addEventListener("click", () => {
    void withUiLock("Saving…", async () => {
      await saveCurrentToCaseboard({ createIfMissing: true });
      setStatus("Saved");
    }).catch((e) => {
      const msg = e?.message || "Save failed";
      if (elements.caseOut) elements.caseOut.textContent = `Save failed: ${msg}`;
    });
  });

  if (elements.btnLoadCase) {
    elements.btnLoadCase.addEventListener("click", () => {
      if (state.uiBusy) return;
      const id = elements.caseSelect.value || "";
      if (!id) return;
      setActiveCaseId(id);
      refresh();
    });
  }

  if (elements.btnExportCase) elements.btnExportCase.addEventListener("click", () => exportActiveCase());
  if (elements.btnDeleteCase) {
    elements.btnDeleteCase.addEventListener("click", () => {
      if (state.uiBusy) return;
      const ok = window.confirm("Delete this case from local Caseboard? This cannot be undone.");
      if (!ok) return;
      deleteActiveCase();
      refresh();
    });
  }

  elements.caseSelect.addEventListener("change", () => refresh());

  // Keep UI in sync when a new file loads / resets.
  document.addEventListener("osint:file-changed", () => refresh());
}

function buildOsintReport() {
  return {
    generated_at: new Date().toISOString(),
    source_reliability: { ...state.caseInfo },
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
    gps: state.gps ? { lat: state.gps.lat, lon: state.gps.lon } : null,
    insights: {
      repost_heuristic: state.insights.repost_score,
      repost_reasons: state.insights.repost_reasons || [],
      attribution_hints: elements.attrHints?.textContent || null,
    },
    key_fields: {
      captured: elements.kfCaptured?.textContent || null,
      camera: elements.kfCamera?.textContent || null,
      software: elements.kfSoftware?.textContent || null,
      ocr_entities: state.ocrText ? OCR_PIPELINE?.extractEntities?.(state.ocrText) || null : null,
      ocr_entity_confidence: state.entityConfidence && Object.keys(state.entityConfidence).length ? { ...state.entityConfidence } : null,
    },
    exif: state.exif || null,
    ocr_text: state.ocrText || null,
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
  const captured =
    exifObj?.DateTimeOriginal ||
    exifObj?.CreateDate ||
    exifObj?.ModifyDate ||
    exifObj?.DateTimeDigitized ||
    exifObj?.datetime ||
    null;
  const make = (exifObj?.Make || "").trim();
  const model = (exifObj?.Model || "").trim();
  const camera = `${make} ${model}`.trim() || null;
  const software = (exifObj?.Software || exifObj?.ProcessingSoftware || exifObj?.CreatorTool || "").trim() || null;
  const gps = getGps(exifObj);
  return {
    captured: captured ? String(captured) : null,
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
  const { score, reasons } = computeRepostScore({ exifObj, file, width, height, ocrText: "" });

  return {
    generated_at: new Date().toISOString(),
    file: { name: file.name || null, type: file.type || null, size_bytes: file.size || null },
    dimensions: `${width} × ${height}`,
    hashes: { sha256: hashes.sha, md5: hashes.md5, dhash: dh },
    gps: key.gps,
    insights: {
      repost_heuristic: score,
      repost_reasons: reasons,
      attribution_hints: hints,
    },
    key_fields: { captured: key.captured, camera: key.camera, software: key.software },
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
      lines.push(`  OK · heuristic ${r.insights.repost_heuristic}/100`);
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
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  downloadBlob(blob, filename);
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

const ocrWorkerState = {
  worker: null,
  lang: null,
  creating: null,
};

async function getOcrWorker(lang) {
  if (ocrWorkerState.worker && ocrWorkerState.lang === lang) return ocrWorkerState.worker;
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

    const worker = await Tesseract.createWorker(lang, 1, {
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
    ocrWorkerState.lang = lang;
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
    wrap.hidden = true;
    wrap.innerHTML = "";
    if (elements.btnPivotSearch) elements.btnPivotSearch.disabled = true;
    return;
  }

  wrap.hidden = false;
  wrap.innerHTML = "";
  if (elements.btnPivotSearch) elements.btnPivotSearch.disabled = false;

  const group = (title) => {
    const g = document.createElement("div");
    g.className = "pivot-group";
    const head = document.createElement("div");
    head.className = "pivot-head";
    head.textContent = title;
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

  const addConfidence = (parent, key) => {
    const sel = document.createElement("select");
    sel.className = "select chip-select";
    sel.title = "Analyst confidence (manual)";
    sel.innerHTML =
      `<option value="unverified">?</option>` +
      `<option value="likely">~</option>` +
      `<option value="confirmed">✓</option>`;
    sel.addEventListener("change", () => {
      state.caseInfo = state.caseInfo || {};
      state.entityConfidence = state.entityConfidence || {};
      state.entityConfidence[key] = sel.value;
    });
    parent.appendChild(sel);
  };

  const google = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

  if (ent.handles.length) {
    const g = group("Handles");
    for (const raw of ent.handles.slice(0, 6)) {
      const h = OCR_PIPELINE?.normalizeHandle?.(raw) || raw.replace(/^@/, "");
      if (!h) continue;
      const row = document.createElement("div");
      row.className = "pivot-row";
      addCopyChip(row, `@${h}`, `@${h}`);
      addLinkChip(row, "IG", `https://www.instagram.com/${encodeURIComponent(h)}/`, { title: "Open Instagram profile" });
      addLinkChip(row, "TikTok", `https://www.tiktok.com/@${encodeURIComponent(h)}`, { title: "Open TikTok profile" });
      addLinkChip(row, "X", `https://x.com/${encodeURIComponent(h)}`, { title: "Open X profile" });
      addLinkChip(row, "Search", google(`@${h}`), { title: "Search handle" });
      addConfidence(row, `handle:${h.toLowerCase()}`);
      g.appendChild(row);
    }
  }

  if (ent.urls.length) {
    const g = group("URLs / Domains");
    for (const u of ent.urls.slice(0, 6)) {
      const d = OCR_PIPELINE?.normalizeDomain?.(u);
      const row = document.createElement("div");
      row.className = "pivot-row";
      const short = String(u).replace(/^https?:\/\//i, "").slice(0, 44);
      addLinkChip(row, short, u, { title: "Open URL" });
      if (d) {
        addLinkChip(row, "WHOIS", `https://www.whois.com/whois/${encodeURIComponent(d)}`, { title: "WHOIS lookup" });
        addLinkChip(row, "DNS", `https://dns.google/resolve?name=${encodeURIComponent(d)}&type=A`, { title: "DNS over HTTPS (Google)" });
        addLinkChip(row, "CRT", `https://crt.sh/?q=${encodeURIComponent(d)}`, { title: "Certificate transparency" });
        addLinkChip(row, "Search", google(`site:${d}`), { title: "Search site" });
        addConfidence(row, `domain:${d}`);
      } else {
        addLinkChip(row, "Search", google(u), { title: "Search URL" });
      }
      g.appendChild(row);
    }
  }

  if (ent.emails.length) {
    const g = group("Emails");
    for (const e of ent.emails.slice(0, 6)) {
      const row = document.createElement("div");
      row.className = "pivot-row";
      addCopyChip(row, e, e);
      addLinkChip(row, "Search", google(`"${e}"`), { title: "Search email" });
      addLinkChip(row, "Breach?", google(`"${e}" breach`), { title: "Search breach mentions" });
      addConfidence(row, `email:${e.toLowerCase()}`);
      g.appendChild(row);
    }
  }

  if (ent.phones.length) {
    const g = group("Phones");
    for (const p of ent.phones.slice(0, 6)) {
      const n = OCR_PIPELINE?.normalizePhone?.(p);
      const row = document.createElement("div");
      row.className = "pivot-row";
      const label = n?.e164 ? `${n.e164}${n.country_hint ? ` (${n.country_hint})` : ""}` : p;
      addCopyChip(row, label, n?.e164 || p);
      const q = n?.e164 || n?.digits || p;
      addLinkChip(row, "Search", google(`"${q}"`), { title: "Search phone" });
      addConfidence(row, `phone:${String(q).replace(/\s+/g, "")}`);
      g.appendChild(row);
    }
  }
}

function detectLangHint(text) {
  const t = String(text || "");
  if (!t) return null;

  const counts = { eng: 0, spa: 0, fra: 0, deu: 0 };

  const add = (lang, n) => {
    counts[lang] += n;
  };

  // Spanish
  add("spa", (t.match(/[ñÑ]/g) || []).length * 6);
  add("spa", (t.match(/[¡¿]/g) || []).length * 8);
  add("spa", (t.match(/[áéíóúÁÉÍÓÚ]/g) || []).length * 2);

  // French
  add("fra", (t.match(/[àâæçéèêëîïôœùûüÿÀÂÆÇÉÈÊËÎÏÔŒÙÛÜŸ]/g) || []).length * 3);
  add("fra", (t.match(/\b(c'est|l'|d'|qu')/gi) || []).length * 3);

  // German
  add("deu", (t.match(/[äöüÄÖÜ]/g) || []).length * 4);
  add("deu", (t.match(/[ß]/g) || []).length * 10);

  // English baseline: reward plain ASCII letters.
  add("eng", (t.match(/[A-Za-z]/g) || []).length / 30);

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = entries[0];
  if (!top || top[1] < 6) return null;

  return top[0];
}

function renderOcrLangHint(text) {
  const el = elements.ocrLangHint;
  if (!el) return;
  const hint = detectLangHint(text);
  if (!hint) {
    el.hidden = true;
    return;
  }
  const label = hint === "spa" ? "Spanish" : hint === "fra" ? "French" : hint === "deu" ? "German" : "English";
  el.hidden = false;
  el.textContent = `Hint: ${label}`;

  // If user hasn't explicitly changed the selector, gently set it.
  if (!state.ocrLangTouched) {
    try {
      elements.ocrLang.value = hint;
    } catch {
      // ignore
    }
  }
}

async function runOcrForCurrent({ mode = "deep" } = {}) {
  if (!state.file || !state.objectUrl) throw new Error("No image loaded");
  if (state.ocrRunning) throw new Error("OCR already running");

  state.ocrRunning = true;
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
        enhanced = await OCR_PIPELINE.preprocessOtsu(state.objectUrl, { maxDim: 1200 });
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
      const { score: s, reasons } = updateConsoleInsights({
        exifObj: state.exif,
        file: state.file,
        width: imgW,
        height: imgH,
        ocrText: finalText,
      });
      state.insights.repost_score = s;
      state.insights.repost_reasons = reasons;
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

    const { score, reasons } = updateConsoleInsights({
      exifObj,
      file,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      ocrText: state.ocrText,
    });
    state.insights.repost_score = score;
    state.insights.repost_reasons = reasons;

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
      state.caseInfo.original_filename = elements.srcOrig.value;
    }

    setStatus("Ready");
  });

  try {
    document.dispatchEvent(new Event("osint:file-changed"));
  } catch {
    // ignore
  }
}

function clearCompare() {
  if (state.compare?.objectUrl) URL.revokeObjectURL(state.compare.objectUrl);
  state.compare = { file: null, objectUrl: null, dhash: "" };
  elements.compareInput.value = "";
  elements.compareImg.removeAttribute("src");
  elements.compareImg.style.display = "none";
  elements.compareEmpty.style.display = "grid";
  elements.cmpA.textContent = state.signals.dhash || "—";
  elements.cmpB.textContent = "—";
  elements.cmpDist.textContent = "—";
  elements.cmpVerdict.textContent = "—";
  elements.btnClearCompare.disabled = true;
}

async function analyzeCompareFile(file) {
  if (!state.file) return;
  await withUiLock("Comparing…", async () => {
    clearCompare();
    state.compare.file = file;

    let standalone;
    try {
      standalone = await loadImageStandalone(file);
    } catch {
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

    elements.cmpA.textContent = state.signals.dhash || "—";
    elements.cmpB.textContent = dh || "—";

    const dist = hammingHex(state.signals.dhash, dh);
    if (dist === null) {
      elements.cmpDist.textContent = "—";
      elements.cmpVerdict.textContent = "Could not compare.";
      return;
    }

    elements.cmpDist.textContent = String(dist);
    let verdict = "Different";
    if (dist === 0) verdict = "Perceptual match";
    else if (dist <= 6) verdict = "Likely same image";
    else if (dist <= 12) verdict = "Very similar";
    else if (dist <= 20) verdict = "Similar";
    elements.cmpVerdict.textContent = verdict;
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
        } catch {
          // ignore
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
      } catch {
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
        } catch {
          // ensurePublicUrl already updated UI
        }
      });
    });
  }

  // Share-safe mode: use clean copy for uploads.
  if (elements.chkShareSafe) {
    let saved = "0";
    try {
      saved = localStorage.getItem("ui:shareSafe") || "0";
    } catch {
      saved = "0";
    }
    state.shareSafe = saved === "1";
    elements.chkShareSafe.checked = state.shareSafe;

    elements.chkShareSafe.addEventListener("change", () => {
      state.shareSafe = Boolean(elements.chkShareSafe.checked);
      try {
        localStorage.setItem("ui:shareSafe", state.shareSafe ? "1" : "0");
      } catch {
        // ignore
      }
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

  const syncCase = () => {
    state.caseInfo.where_obtained = elements.srcWhere.value || "";
    state.caseInfo.when_obtained = elements.srcWhen.value || "";
    state.caseInfo.who_provided = elements.srcWho.value || "";
    state.caseInfo.original_filename = elements.srcOrig.value || "";
    if (elements.confLevel) state.caseInfo.analyst_confidence = elements.confLevel.value || "unverified";
  };
  elements.srcWhere.addEventListener("input", syncCase);
  elements.srcWhen.addEventListener("input", syncCase);
  elements.srcWho.addEventListener("input", syncCase);
  elements.srcOrig.addEventListener("input", syncCase);
  elements.confLevel?.addEventListener("change", syncCase);

  elements.ocrLang?.addEventListener("change", () => {
    state.ocrLangTouched = true;
  });

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
      setStatus("Copied (JSON)");
      return;
    }

    const md = buildMarkdownReport(report);
    await copyText(md);
    setStatus("Copied (MD)");
  });

  elements.btnPivotSearch?.addEventListener("click", () => {
    if (!state.ocrText) return;
    if (state.uiBusy) return;
    const ent = OCR_PIPELINE?.extractEntities?.(state.ocrText) || { urls: [], emails: [], handles: [], phones: [] };
    const targets = buildPivotSearchUrlsFromEntities(ent).slice(0, 14);
    if (targets.length === 0) return;

    // Popup blockers: open synchronously, no awaits here.
    for (const u of targets) window.open(u, "_blank", "noopener,noreferrer");
    setStatus(`Pivoted (${targets.length})`);
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

      const { score, reasons } = updateConsoleInsights({
        exifObj: state.exif,
        file: state.file,
        width: imgW,
        height: imgH,
        ocrText: state.ocrText,
      });
      state.insights.repost_score = score;
      state.insights.repost_reasons = reasons;

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
          "Mutation Lab needs one-click mode (uploads variants to generate public URLs). Enable it?",
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

      const clusters = clusterByDhash(muts.filter((m) => m.dhash), 10);
      for (let ci = 0; ci < clusters.length; ci += 1) {
        for (const m of clusters[ci].items) m.cluster = ci + 1;
      }

      const tokens = muts.map((_, i) => `${Date.now()}-${Math.random().toString(16).slice(2)}-${i}`);
      for (let i = 0; i < muts.length; i += 1) {
        const label = `Lens · ${muts[i].label}`;
        const waitUrl = `/wait.html?token=${encodeURIComponent(tokens[i])}&engine=lens&label=${encodeURIComponent(label)}`;
        window.open(waitUrl, "_blank");
        publishWaitState(tokens[i], "lens", { status: "uploading" });
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
          publishWaitState(tokens[i], "lens", { url });
        } catch (e) {
          const msg = e?.message || "upload failed";
          publishWaitState(tokens[i], "lens", { err: msg });
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
    const t = window.setTimeout(() => controller.abort(), 900);
    const res = await fetch("/api/ping", { cache: "no-store", signal: controller.signal });
    window.clearTimeout(t);
    if (!res.ok) throw new Error("ping");
  } catch {
    setStatusLine("Local server offline — start `bluelens-start.cmd` (or `node server.js`) for Share+Search.");
  }
}

function setFxVars(scanline, chromatic) {
  const root = document.documentElement;
  if (typeof scanline === "number") root.style.setProperty("--scanline", String(scanline));
  if (typeof chromatic === "number") root.style.setProperty("--chromatic", String(chromatic));
}

function setupFx() {
  const scanline = Number(localStorage.getItem("fx:scanline") || "0.18");
  const chromatic = Number(localStorage.getItem("fx:chromatic") || "0.70");
  const hudEnabled = localStorage.getItem("fx:hud") === "1";

  if (elements.scanlineSlider) elements.scanlineSlider.value = String(Math.max(0, Math.min(0.35, scanline)));
  if (elements.chromaticSlider) elements.chromaticSlider.value = String(Math.max(0, Math.min(1.2, chromatic)));
  if (elements.chkHud) elements.chkHud.checked = hudEnabled;

  setFxVars(scanline, chromatic);
  document.body.classList.toggle("hud-mode", hudEnabled);

  elements.scanlineSlider?.addEventListener("input", () => {
    const v = Number(elements.scanlineSlider.value);
    setFxVars(v, null);
    localStorage.setItem("fx:scanline", String(v));
  });

  elements.chromaticSlider?.addEventListener("input", () => {
    const v = Number(elements.chromaticSlider.value);
    setFxVars(null, v);
    localStorage.setItem("fx:chromatic", String(v));
  });

  elements.btnOverclock?.addEventListener("click", () => {
    const s = 0.28;
    const c = 1.05;
    if (elements.scanlineSlider) elements.scanlineSlider.value = String(s);
    if (elements.chromaticSlider) elements.chromaticSlider.value = String(c);
    setFxVars(s, c);
    localStorage.setItem("fx:scanline", String(s));
    localStorage.setItem("fx:chromatic", String(c));
  });

  elements.chkHud?.addEventListener("change", () => {
    const on = Boolean(elements.chkHud.checked);
    localStorage.setItem("fx:hud", on ? "1" : "0");
    document.body.classList.toggle("hud-mode", on);
    if (!on) {
      // Snap everything back into layout
      document.querySelectorAll(".hud.floating").forEach((c) => {
        c.classList.remove("floating");
        c.style.removeProperty("left");
        c.style.removeProperty("top");
        c.style.removeProperty("width");
      });
    } else {
      // Restore saved positions
      document.querySelectorAll(".hud").forEach((card) => {
        const key = card.getAttribute("data-hud-key");
        if (!key) return;
        const raw = localStorage.getItem(`hud:${key}`);
        if (!raw) return;
        try {
          const p = JSON.parse(raw);
          if (typeof p.left !== "number" || typeof p.top !== "number") return;
          if (typeof p.width !== "number") return;
          card.classList.add("floating");
          card.style.left = `${p.left}px`;
          card.style.top = `${p.top}px`;
          card.style.width = `${p.width}px`;
        } catch {
          // ignore
        }
      });
    }
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
    localStorage.setItem(`hud:${key}`, JSON.stringify({ left, top, width }));
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
    localStorage.setItem("ui:tab", name);
  };

  window.__osintActivateTab = activate;

  for (const t of tabs) {
    t.addEventListener("click", () => activate(t.getAttribute("data-tab")));
  }

  const saved = localStorage.getItem("ui:tab");
  if (saved && tabs.some((t) => t.getAttribute("data-tab") === saved)) activate(saved);
}

function setupCursorBubbles() {
  let last = 0;
  window.addEventListener("pointermove", (e) => {
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
  if (!elements.chkChrome) return;
  const apply = (on) => {
    document.body.classList.toggle("skin-chrome", Boolean(on));
    try {
      localStorage.setItem("ui:skinChrome", on ? "1" : "0");
    } catch {
      // ignore
    }
  };

  let saved = "0";
  try {
    saved = localStorage.getItem("ui:skinChrome") || "0";
  } catch {
    saved = "0";
  }
  const on = saved === "1";
  elements.chkChrome.checked = on;
  apply(on);

  elements.chkChrome.addEventListener("change", () => apply(elements.chkChrome.checked));
}

function setupCommandPalette() {
  if (!elements.cmdk || !elements.cmdkInput || !elements.cmdkList) return;

  let open = false;
  let activeIndex = 0;

  const actions = [
    { name: "Search All", meta: "Reverse search", keys: ["search", "all", "reverse", "engines"], run: () => void handleSearchAll() },
    { name: "OSINT Pass", meta: "OCR + signals", keys: ["pass", "ocr", "signals", "attribution"], run: () => elements.btnRunPass?.click() },
    { name: "Copy Report", meta: "JSON to clipboard", keys: ["copy", "report", "json"], run: () => elements.btnCopyReport?.click() },
    { name: "Copy Public URL", meta: "If shared", keys: ["copy", "url", "public"], run: () => elements.btnCopyPublicUrl?.click() },
    { name: "Save to Caseboard", meta: "Append event", keys: ["save", "case", "caseboard"], run: () => elements.btnSaveCase?.click() },
    { name: "Export Case", meta: "JSON bundle", keys: ["export", "case"], run: () => elements.btnExportCase?.click() },
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
    list.forEach((a, idx) => {
      const row = document.createElement("div");
      row.className = `cmdk-item${idx === activeIndex ? " active" : ""}`;
      row.setAttribute("role", "option");
      row.setAttribute("data-idx", String(idx));

      const left = document.createElement("div");
      left.textContent = a.name;

      const right = document.createElement("div");
      right.className = "meta";
      right.textContent = a.meta || "";

      row.appendChild(left);
      row.appendChild(right);
      row.addEventListener("mouseenter", () => {
        activeIndex = idx;
        render();
      });
      row.addEventListener("click", () => {
        const chosen = filtered()[activeIndex];
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

wireReverseSearchButtons();
setupDnD();
setupActions();
setupCaseboard();
reset();
validateLibs();
void checkLocalServerHint();
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
setupGlobalErrorSurface();
