(function (root, factory) {
  const config = factory();
  try {
    if (typeof module !== "undefined" && module.exports) module.exports = config;
  } catch {
    // ignore
  }
  try {
    root.BLUELENS_CONFIG = config;
  } catch {
    // ignore
  }
})(typeof globalThis !== "undefined" ? globalThis : this, () => ({
  server: {
    port: 8787,
    waitJobs: {
      maxAgeMs: 10 * 60 * 1000,
      defaultTimeoutMs: 25_000,
      maxTimeoutMs: 30_000,
      pruneIntervalMs: 60 * 1000,
    },
    upload: {
      timeoutMs: 35_000,
      uploadPath: "/api/upload",
      pingPath: "/api/ping",
      statsPath: "/api/upload-stats",
      hosts: ["uguu", "catbox", "litterbox", "0x0"],
      preferredHostsByPurpose: {
        default: ["uguu", "catbox", "0x0", "litterbox"],
        lens: ["catbox", "0x0", "litterbox", "uguu"],
        google: ["catbox", "0x0", "litterbox", "uguu"],
      },
      litterboxExpiry: "72h",
    },
  },
  app: {
    upload: {
      endpointTimeoutMs: 45_000,
      preflightTimeoutMs: 2_500,
      retryDisabledProviderValue: "0x0",
    },
    hostStats: {
      refreshTimeoutMs: 2_000,
    },
    localServerHint: {
      timeoutMs: 900,
      offlineMessage: "Local server offline — start `bluelens-start.cmd` (or `node server.js`) for Upload + Launchpad.",
    },
    batch: {
      topLensDefault: 5,
      topLensMax: 10,
      ocrDefault: 8,
      ocrMax: 20,
    },
    ocr: {
      fastPreprocessMaxDim: 1_200,
      batchPreprocessMaxDim: 1_400,
    },
    dhash: {
      batchClusterThreshold: 8,
      mutationClusterThreshold: 10,
    },
    engines: {
      order: ["lens", "bing", "tineye", "yandex", "google_images"],
      labels: {
        lens: "Lens",
        bing: "Bing",
        tineye: "TinEye",
        yandex: "Yandex",
        google_images: "Google",
      },
      icons: {
        lens: "⌕",
        bing: "⧉",
        tineye: "◎",
        yandex: "⟡",
        google_images: "◉",
      },
    },
  },
  fx: {
    funModeDefault: false,
    scanlineDefault: 0,
    chromaticDefault: 0,
    scanlineFunDefault: 0.18,
    chromaticFunDefault: 0.7,
    scanlineMax: 0.35,
    chromaticMax: 1.2,
    overclockScanline: 0.28,
    overclockChromatic: 1.05,
    hudDefault: false,
    chromeDefault: false,
  },
  storageKeys: {
    missionPreset: "ui:missionPreset",
    shareSafe: "ui:shareSafe",
    session: "osint:session:v1",
    lastRun: "osint:lastRun:v1",
    fxScanline: "fx:scanline",
    fxChromatic: "fx:chromatic",
    fxFunMode: "fx:funMode",
    fxHud: "fx:hud",
    skinChrome: "ui:skinChrome",
  },
  help: {
    defaults: [
      { label: "Local server port", value: "8787", detail: "Used by the built-in upload proxy and wait-job handoff." },
      { label: "Wait-job long poll", value: "25s", detail: "Wait tabs reconnect after a timed hold instead of busy polling." },
      { label: "Wait-job retention", value: "10 min", detail: "Completed handoff jobs stay available briefly for reconnects." },
      { label: "Upload host order", value: "Uguu → Catbox → 0x0 → Litterbox", detail: "Default failover order before purpose-specific weighting." },
      { label: "Lens/Google host bias", value: "Catbox → 0x0 → Litterbox → Uguu", detail: "Preferred for upload-by-URL launches." },
      { label: "Upload timeout", value: "35s upstream / 45s browser", detail: "Server host attempts and browser proxy requests time out independently." },
      { label: "Batch OCR default", value: "Top 8 images", detail: "Top-candidate OCR pass size before manual expansion." },
      { label: "dHash cluster thresholds", value: "8 batch / 10 mutation", detail: "Near-duplicate grouping defaults used in dashboards." },
      { label: "Fun mode default", value: "Off", detail: "Operator theme ships calm; ambient FX are opt-in." },
    ],
  },
}));
