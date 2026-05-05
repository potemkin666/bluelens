/* BlueLens local server (static + upload proxy + acquisition layer)
   - Serves static files from this folder
   - Provides POST /api/upload to proxy-upload images to a public host (avoids browser CORS limitations)
   - Provides durable /api/wait-jobs/:id handoff routes for wait tabs

   Run:
     node server.js
   Then open:
     http://localhost:8787
*/

const http = require("http");
const dns = require("node:dns").promises;
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { URL } = require("url");
const BLUELENS_CONFIG = require("./bluelens-config.js");
const { reverseSearchUploadPage } = require("./osint-lib.js");

const ROOT = __dirname;
const SERVER_CONFIG = BLUELENS_CONFIG.server || {};
const WAIT_JOB_CONFIG = SERVER_CONFIG.waitJobs || {};
const UPLOAD_CONFIG = SERVER_CONFIG.upload || {};
const PORT = process.env.PORT ? Number(process.env.PORT) : SERVER_CONFIG.port || 8787;
const WAIT_JOB_MAX_AGE_MS = WAIT_JOB_CONFIG.maxAgeMs || 10 * 60 * 1000;
const WAIT_JOB_DEFAULT_TIMEOUT_MS = WAIT_JOB_CONFIG.defaultTimeoutMs || 25_000;
const WAIT_JOB_MAX_TIMEOUT_MS = WAIT_JOB_CONFIG.maxTimeoutMs || 30_000;
const WAIT_JOB_PRUNE_INTERVAL_MS = WAIT_JOB_CONFIG.pruneIntervalMs || 60 * 1000;
const UPLOAD_TIMEOUT_MS = UPLOAD_CONFIG.timeoutMs || 35_000;
const UPLOAD_HOSTS = Array.isArray(UPLOAD_CONFIG.hosts) ? UPLOAD_CONFIG.hosts : ["uguu", "catbox", "litterbox", "0x0"];
const PREFERRED_HOSTS_BY_PURPOSE = UPLOAD_CONFIG.preferredHostsByPurpose || {};
const LITTERBOX_EXPIRY = UPLOAD_CONFIG.litterboxExpiry || "72h";
const WAIT_JOB_STORE_PATH = path.join(os.tmpdir(), "bluelens-wait-jobs-v1.json");
const SERVER_STARTED_AT = Date.now();
const DOCTOR_TIMEOUT_MS = 2500;
const DOCTOR_HISTORY_MAX = 24;
const ACQ_CONFIG = SERVER_CONFIG.acquisition || {};
const ACQ_TIMEOUT_MS = ACQ_CONFIG.timeoutMs || 10_000;
const ACQ_MAX_BYTES = ACQ_CONFIG.maxBytes || 768 * 1024;
const ACQ_RATE_LIMIT_MAX = ACQ_CONFIG.rateLimitMax || 18;
const ACQ_RATE_LIMIT_WINDOW_MS = ACQ_CONFIG.rateLimitWindowMs || 60_000;
const ACQ_ARCHIVE_API_BASE = process.env.BLUELENS_ARCHIVE_API_BASE || "https://archive.org/wayback/available";
const ALLOW_PRIVATE_FETCH = process.env.BLUELENS_ALLOW_PRIVATE_FETCH === "1";
const APP_VERSION = BLUELENS_CONFIG.meta?.appVersion || "dev";
const FETCH_USER_AGENT = `BlueLens/${APP_VERSION} (+local acquisition layer)`;
const UPLOAD_DOCTOR_URLS = {
  uguu: "https://uguu.se/",
  catbox: "https://catbox.moe/",
  litterbox: "https://litterbox.catbox.moe/",
  "0x0": "https://0x0.st/",
};
const CDN_DOCTOR_URLS = [
  { name: "unpkg", url: "https://unpkg.com/" },
  { name: "jsdelivr", url: "https://cdn.jsdelivr.net/" },
  { name: "google_lens", url: "https://lens.google.com/" },
];
const ACQ_RATE_LIMITS = new Map();

// Durable wait-job handoff for wait tabs.
// Key: jobId -> { id, engine, label, status, url, err, seq, created_at, updated_at, expires_at }
const WAIT_JOBS = new Map();
const WAIT_JOB_LISTENERS = new Map();

// Upload host telemetry for auto-fastest selection.
// host -> { ok: number, fail: number, avgMs: number }
const UPLOAD_STATS = new Map();
const DOCTOR_HISTORY = {
  uploadReachability: [],
  cdnReachability: [],
  engineAvailability: [],
  uploadAttempts: [],
};
function reportServerIssue(scope, error, detail = null) {
  const msg = error?.message || String(error || "unknown error");
  if (detail) console.warn("[BlueLens]", { scope, message: msg, detail });
  else console.warn("[BlueLens]", { scope, message: msg });
}

function safeJsonParse(txt, fallback, scope, detail = null) {
  try {
    return JSON.parse(txt);
  } catch (error) {
    if (scope) reportServerIssue(scope, error, detail);
    return fallback;
  }
}

async function fetchWithTimeout(url, init, ms) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

function clientAddress(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket?.remoteAddress || "local";
}

function pruneAcquisitionRateLimits(now = Date.now()) {
  for (const [key, value] of ACQ_RATE_LIMITS.entries()) {
    if (!value || value.reset_at <= now) ACQ_RATE_LIMITS.delete(key);
  }
}

function acquisitionRateLimit(scope, req) {
  pruneAcquisitionRateLimits();
  const now = Date.now();
  const key = `${scope}:${clientAddress(req)}`;
  const current = ACQ_RATE_LIMITS.get(key);
  if (!current || current.reset_at <= now) {
    const next = { count: 1, reset_at: now + ACQ_RATE_LIMIT_WINDOW_MS };
    ACQ_RATE_LIMITS.set(key, next);
    return {
      scope,
      limit: ACQ_RATE_LIMIT_MAX,
      remaining: Math.max(0, ACQ_RATE_LIMIT_MAX - next.count),
      reset_at: next.reset_at,
    };
  }
  if (current.count >= ACQ_RATE_LIMIT_MAX) {
    const error = new Error(`Rate limit exceeded for ${scope}`);
    error.statusCode = 429;
    error.errorCode = "rate_limited";
    error.rateLimit = {
      scope,
      limit: ACQ_RATE_LIMIT_MAX,
      remaining: 0,
      reset_at: current.reset_at,
    };
    throw error;
  }
  current.count += 1;
  ACQ_RATE_LIMITS.set(key, current);
  return {
    scope,
    limit: ACQ_RATE_LIMIT_MAX,
    remaining: Math.max(0, ACQ_RATE_LIMIT_MAX - current.count),
    reset_at: current.reset_at,
  };
}

function isPrivateIpv4(address) {
  const parts = String(address || "")
    .split(".")
    .map((value) => Number(value));
  if (parts.length !== 4 || parts.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return false;
  if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  return false;
}

function isPrivateIpv6(address) {
  const normalized = String(address || "").toLowerCase();
  if (!normalized) return false;
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  return false;
}

function isPrivateIp(address) {
  const version = net.isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return false;
}

async function assertScopedPublicUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || "").trim());
  } catch {
    const error = new Error("Invalid target URL");
    error.statusCode = 400;
    error.errorCode = "invalid_target_url";
    throw error;
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    const error = new Error("Only http(s) targets are supported");
    error.statusCode = 400;
    error.errorCode = "invalid_target_url";
    throw error;
  }
  parsed.hash = "";
  if (!parsed.pathname) parsed.pathname = "/";
  const hostname = (parsed.hostname || "").toLowerCase();
  if (!hostname) {
    const error = new Error("Missing hostname");
    error.statusCode = 400;
    error.errorCode = "invalid_target_url";
    throw error;
  }
  if (!ALLOW_PRIVATE_FETCH) {
    if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
      const error = new Error("Local or internal targets are blocked");
      error.statusCode = 403;
      error.errorCode = "blocked_target";
      throw error;
    }
    if (isPrivateIp(hostname)) {
      const error = new Error("Private-network targets are blocked");
      error.statusCode = 403;
      error.errorCode = "blocked_target";
      throw error;
    }
    try {
      const lookups = await dns.lookup(hostname, { all: true, verbatim: true });
      if (lookups.some((entry) => isPrivateIp(entry.address))) {
        const error = new Error("Private-network targets are blocked");
        error.statusCode = 403;
        error.errorCode = "blocked_target";
        throw error;
      }
    } catch (error) {
      if (error?.statusCode) throw error;
      const wrapped = new Error(`Could not resolve target host: ${hostname}`);
      wrapped.statusCode = 400;
      wrapped.errorCode = "unresolvable_target";
      throw wrapped;
    }
  }
  return parsed.toString();
}

async function readResponseTextLimited(response, maxBytes = ACQ_MAX_BYTES) {
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body || []) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > maxBytes) {
      const error = new Error("Response body exceeded size limit");
      error.statusCode = 413;
      error.errorCode = "response_too_large";
      throw error;
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function firstMatch(text, pattern) {
  const match = String(text || "").match(pattern);
  return match ? match[1].trim() : "";
}

function stripTags(html) {
  return String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script[^>]*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrlOrEmpty(value, baseUrl = "") {
  if (!value) return "";
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function extractIdentityLinks(html, baseUrl) {
  const identities = new Map();
  for (const match of String(html || "").matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) {
    const href = absoluteUrlOrEmpty(match[1], baseUrl);
    if (!href) continue;
    let hostname = "";
    try {
      hostname = new URL(href).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      hostname = "";
    }
    const platform =
      hostname === "instagram.com"
        ? "instagram"
        : hostname === "tiktok.com"
          ? "tiktok"
          : hostname === "x.com" || hostname === "twitter.com"
            ? "x"
            : hostname === "youtube.com" || hostname === "youtu.be"
              ? "youtube"
              : hostname === "facebook.com"
                ? "facebook"
                : "";
    if (!platform) continue;
    identities.set(href, { platform, url: href });
  }
  return Array.from(identities.values()).slice(0, 10);
}

function extractNormalizedMetadata(html, sourceUrl, finalUrl) {
  const title =
    firstMatch(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description =
    firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    firstMatch(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const canonical =
    firstMatch(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || finalUrl || sourceUrl;
  const h1 = firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/\s+/g, " ").trim();
  const text = stripTags(html);
  const snippet = text.slice(0, 240);
  return {
    title: title || "",
    description: description || "",
    canonical_url: absoluteUrlOrEmpty(canonical, finalUrl || sourceUrl) || "",
    h1: h1 || "",
    snippet,
    identities: extractIdentityLinks(html, finalUrl || sourceUrl),
  };
}

function extractSitemapsFromRobots(robotsText, baseUrl) {
  const sitemaps = [];
  for (const match of String(robotsText || "").matchAll(/^\s*Sitemap:\s*(.+)\s*$/gim)) {
    const absolute = absoluteUrlOrEmpty(match[1], baseUrl);
    if (absolute) sitemaps.push(absolute);
  }
  return Array.from(new Set(sitemaps)).slice(0, 12);
}

async function fetchScopedUrl(rawUrl, { req, scope = "fetch", accept = "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5" } = {}) {
  const target = await assertScopedPublicUrl(rawUrl);
  const rate_limit = acquisitionRateLimit(scope, req);
  const startedAt = Date.now();
  const response = await fetchWithTimeout(
    target,
    {
      method: "GET",
      redirect: "follow",
      headers: {
        accept,
        "user-agent": FETCH_USER_AGENT,
      },
    },
    ACQ_TIMEOUT_MS,
  );
  const body = await readResponseTextLimited(response, ACQ_MAX_BYTES);
  const finalUrl = response.url || target;
  const contentType = String(response.headers.get("content-type") || "");
  return {
    target,
    final_url: finalUrl,
    status: response.status,
    ok: response.ok,
    content_type: contentType,
    body,
    fetched_at: new Date().toISOString(),
    provenance: {
      requested_url: target,
      final_url: finalUrl,
      fetched_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      status: response.status,
      content_type: contentType || null,
      etag: response.headers.get("etag") || null,
      last_modified: response.headers.get("last-modified") || null,
      rate_limit,
    },
  };
}

async function collectDoctorUploadReachability() {
  const rows = await Promise.all(UPLOAD_HOSTS.map(async (host) => {
    const url = UPLOAD_DOCTOR_URLS[host];
    if (!url) {
      return { host, reachable: false, status_code: null, error: "no diagnostic url configured" };
    }
    try {
      const res = await fetchWithTimeout(url, { method: "GET" }, DOCTOR_TIMEOUT_MS);
      return { host, reachable: res.ok, status_code: res.status, error: res.ok ? "" : `http ${res.status}` };
    } catch (error) {
      return { host, reachable: false, status_code: null, error: error?.message || "unreachable" };
    }
  }));
  pushDoctorHistory(DOCTOR_HISTORY.uploadReachability, { ts: new Date().toISOString(), rows });
  return rows;
}

function updateUploadStats(host, ok, ms) {
  const cur = UPLOAD_STATS.get(host) || { ok: 0, fail: 0, avgMs: 0 };
  if (ok) cur.ok += 1;
  else cur.fail += 1;
  const n = cur.ok + cur.fail;
  const alpha = n <= 1 ? 1 : 0.25;
  cur.avgMs = cur.avgMs ? cur.avgMs * (1 - alpha) + ms * alpha : ms;
  UPLOAD_STATS.set(host, cur);
}
function hostScore(host) {
  const s = UPLOAD_STATS.get(host);
  if (!s) return { failRate: 0.2, avgMs: 45_000 };
  const n = Math.max(1, s.ok + s.fail);
  return { failRate: s.fail / n, avgMs: s.avgMs || 45_000 };
}

function pushDoctorHistory(bucket, sample, max = DOCTOR_HISTORY_MAX) {
  if (!Array.isArray(bucket) || !sample) return;
  bucket.push(sample);
  if (bucket.length > max) bucket.splice(0, bucket.length - max);
}

async function collectReachabilityRows(rows = []) {
  return await Promise.all(rows.map(async (row) => {
    try {
      const startedAt = Date.now();
      const res = await fetchWithTimeout(row.url, { method: "GET", redirect: "follow" }, DOCTOR_TIMEOUT_MS);
      return {
        ...row,
        reachable: res.ok,
        status_code: res.status,
        error: res.ok ? "" : `http ${res.status}`,
        duration_ms: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        ...row,
        reachable: false,
        status_code: null,
        error: error?.message || "unreachable",
        duration_ms: null,
      };
    }
  }));
}

async function collectDoctorCdnReachability() {
  return await collectReachabilityRows(CDN_DOCTOR_URLS);
}

async function collectDoctorEngineAvailability() {
  return await collectReachabilityRows(
    ["lens", "bing", "yandex", "tineye", "pinterest", "saucenao", "iqdb", "baidu", "ascii2d", "google_images"].map((engine) => ({
      engine,
      url: reverseSearchUploadPage(engine),
    })),
  );
}

function summarizeUploadHostHistory() {
  const summary = {};
  for (const host of UPLOAD_HOSTS) {
    const stats = UPLOAD_STATS.get(host) || { ok: 0, fail: 0, avgMs: 0 };
    const total = Math.max(1, Number(stats.ok || 0) + Number(stats.fail || 0));
    summary[host] = {
      ok: Number(stats.ok || 0),
      fail: Number(stats.fail || 0),
      avg_ms: Number(stats.avgMs || 0),
      fail_rate: Number(stats.fail || 0) / total,
    };
  }
  return summary;
}

function bestUploadHost() {
  const ranked = UPLOAD_HOSTS
    .slice()
    .map((host) => ({ host, ...hostScore(host) }))
    .sort((a, b) => a.failRate - b.failRate || a.avgMs - b.avgMs);
  return ranked[0]?.host || "";
}

function sanitizeWaitJob(entry, idHint = "") {
  if (!entry || typeof entry !== "object") return null;
  const id = String(entry.id || idHint || "").trim();
  if (!id) return null;
  const now = Date.now();
  const createdAt = Number(entry.created_at || entry.updated_at || now);
  const updatedAt = Number(entry.updated_at || createdAt || now);
  const expiresAt = Number(entry.expires_at || updatedAt + WAIT_JOB_MAX_AGE_MS);
  const seq = Number(entry.seq || 0);
  if (!Number.isFinite(createdAt)) return null;
  if (!Number.isFinite(updatedAt)) return null;
  if (!Number.isFinite(expiresAt)) return null;
  if (!Number.isFinite(seq)) return null;
  return {
    id,
    engine: String(entry.engine || ""),
    label: String(entry.label || ""),
    status: String(entry.status || "queued"),
    url: entry.url != null ? String(entry.url) : "",
    err: entry.err != null ? String(entry.err) : "",
    seq: Math.max(0, Math.floor(seq)),
    created_at: createdAt,
    updated_at: updatedAt,
    expires_at: expiresAt,
  };
}

function persistWaitJobs() {
  try {
    const tmpPath = `${WAIT_JOB_STORE_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(Array.from(WAIT_JOBS.values()), null, 2), "utf8");
    fs.renameSync(tmpPath, WAIT_JOB_STORE_PATH);
  } catch (error) {
    reportServerIssue("wait-jobs.persist", error);
  }
}

function loadWaitJobs() {
  try {
    const raw = fs.readFileSync(WAIT_JOB_STORE_PATH, "utf8");
    const parsed = safeJsonParse(raw, [], "wait-jobs.load.parse");
    const entries = Array.isArray(parsed) ? parsed : Object.values(parsed || {});
    for (const entry of entries) {
      const job = sanitizeWaitJob(entry);
      if (!job || job.expires_at <= Date.now()) continue;
      WAIT_JOBS.set(job.id, job);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") reportServerIssue("wait-jobs.load", error);
  }
}

function pruneWaitJobs(maxAgeMs = WAIT_JOB_MAX_AGE_MS) {
  const now = Date.now();
  let changed = false;
  for (const [k, v] of WAIT_JOBS.entries()) {
    if (!v || typeof v.updated_at !== "number" || now - v.updated_at > maxAgeMs || v.expires_at <= now) {
      WAIT_JOBS.delete(k);
      WAIT_JOB_LISTENERS.delete(k);
      changed = true;
    }
  }
  if (changed) persistWaitJobs();
}
setInterval(() => pruneWaitJobs(), WAIT_JOB_PRUNE_INTERVAL_MS).unref?.();
loadWaitJobs();

function waitJobIdFromPath(pathname) {
  const prefix = "/api/wait-jobs/";
  if (!pathname.startsWith(prefix)) return "";
  return decodeURIComponent(pathname.slice(prefix.length)).trim();
}

function waitJobListenersFor(jobId) {
  const existing = WAIT_JOB_LISTENERS.get(jobId);
  if (existing) return existing;
  const next = new Set();
  WAIT_JOB_LISTENERS.set(jobId, next);
  return next;
}

function resolveWaitJobListeners(jobId, job) {
  const listeners = WAIT_JOB_LISTENERS.get(jobId);
  if (!listeners || listeners.size === 0) return;
  WAIT_JOB_LISTENERS.delete(jobId);
  for (const resolve of listeners) resolve(job);
}

function getWaitJob(jobId) {
  pruneWaitJobs();
  return WAIT_JOBS.get(jobId) || null;
}

function upsertWaitJob(jobId, patch = {}) {
  const now = Date.now();
  const current =
    WAIT_JOBS.get(jobId) || {
      id: jobId,
      engine: "",
      label: "",
      status: "queued",
      url: "",
      err: "",
      seq: 0,
      created_at: now,
      updated_at: now,
      expires_at: now + WAIT_JOB_MAX_AGE_MS,
    };

  const next = {
    ...current,
    ...(patch.engine != null ? { engine: String(patch.engine) } : {}),
    ...(patch.label != null ? { label: String(patch.label) } : {}),
    ...(patch.status != null ? { status: String(patch.status) } : {}),
    ...(patch.url != null ? { url: String(patch.url), err: "", status: patch.status != null ? String(patch.status) : "ready" } : {}),
    ...(patch.err != null ? { err: String(patch.err), url: "", status: patch.status != null ? String(patch.status) : "error" } : {}),
    seq: current.seq + 1,
    updated_at: now,
    expires_at: now + WAIT_JOB_MAX_AGE_MS,
  };

  WAIT_JOBS.set(jobId, next);
  persistWaitJobs();
  resolveWaitJobListeners(jobId, next);
  return next;
}

function waitForWaitJobUpdate(jobId, since = -1, timeoutMs = WAIT_JOB_DEFAULT_TIMEOUT_MS) {
  const current = getWaitJob(jobId);
  if (current && current.seq > since) return Promise.resolve(current);

  return new Promise((resolve) => {
    const listeners = waitJobListenersFor(jobId);
    let done = false;
    const finish = (job) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      listeners.delete(finish);
      if (listeners.size === 0) WAIT_JOB_LISTENERS.delete(jobId);
      resolve(job || null);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    listeners.add(finish);
  });
}

function waitJobMeta() {
  return {
    server_started_at: SERVER_STARTED_AT,
    wait_job_max_age_ms: WAIT_JOB_MAX_AGE_MS,
    wait_job_default_timeout_ms: WAIT_JOB_DEFAULT_TIMEOUT_MS,
  };
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Cache-Control": "no-store", ...headers });
  res.end(body);
}

function safeJoin(root, reqPath) {
  const decoded = decodeURIComponent(reqPath);
  const clean = decoded.replace(/^\/+/, "");
  const full = path.join(root, clean);
  const rel = path.relative(root, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return full;
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".json":
      return "application/json; charset=utf-8";
    case ".md":
      return "text/markdown; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
]);

function normalizeMime(mime) {
  return String(mime || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
}

function detectImageMime(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return "image/png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.length >= 6) {
    const gif = buf.toString("ascii", 0, 6);
    if (gif === "GIF87a" || gif === "GIF89a") return "image/gif";
  }
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (["heic", "heix", "hevc", "hevx"].includes(brand)) return "image/heic";
    if (["mif1", "msf1"].includes(brand)) return "image/heif";
    if (["avif", "avis"].includes(brand)) return "image/avif";
  }
  return null;
}

function validateImageUploadPayload(buf, mime) {
  const normalizedMime = normalizeMime(mime);
  const detectedMime = detectImageMime(buf);
  if (!detectedMime) {
    const error = new Error("Payload is not a supported image");
    error.statusCode = 415;
    error.errorCode = "invalid_image_payload";
    throw error;
  }
  if (normalizedMime && !ALLOWED_UPLOAD_MIME_TYPES.has(normalizedMime)) {
    const error = new Error(`Unsupported upload MIME type: ${normalizedMime}`);
    error.statusCode = 415;
    error.errorCode = "invalid_image_payload";
    throw error;
  }
  if (normalizedMime && normalizedMime !== detectedMime) {
    const error = new Error(`Upload MIME does not match file signature (${normalizedMime} vs ${detectedMime})`);
    error.statusCode = 415;
    error.errorCode = "invalid_image_payload";
    throw error;
  }
  return detectedMime;
}

async function readBody(req, maxBytes = 25 * 1024 * 1024) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw new Error("Payload too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function handleUpload(req, res) {
  try {
    const filename = (req.headers["x-filename"] || "image").toString();
    const mime = (req.headers["content-type"] || "application/octet-stream").toString();
    const purpose = (req.headers["x-purpose"] || "").toString().toLowerCase();
    const buf = await readBody(req);
    const detectedMime = validateImageUploadPayload(buf, mime);

    // Node 18+ has global Blob/FormData/fetch.
    const blob = new Blob([buf], { type: detectedMime });

    const parseUrlFromText = (txt) => {
      const first = (txt || "").trim().split(/\s+/)[0];
      return /^https?:\/\//i.test(first) ? first : null;
    };

    const uploadUguu = async () => {
      const fd = new FormData();
      fd.append("files[]", blob, filename);
      const upstream = await fetchWithTimeout("https://uguu.se/upload.php", { method: "POST", body: fd }, UPLOAD_TIMEOUT_MS);
      const txt = await upstream.text();
      if (!upstream.ok) throw new Error(`uguu (${upstream.status})`);
      const obj = safeJsonParse(txt, null, "upload.uguu.parse", { host: "uguu" });
      const url = obj?.files?.[0]?.url;
      if (!url || !/^https?:\/\//i.test(url)) throw new Error("uguu (bad response)");
      return url;
    };

    const uploadCatbox = async () => {
      const fd = new FormData();
      fd.append("reqtype", "fileupload");
      fd.append("fileToUpload", blob, filename);
      const upstream = await fetchWithTimeout("https://catbox.moe/user/api.php", { method: "POST", body: fd }, UPLOAD_TIMEOUT_MS);
      const txt = await upstream.text();
      if (!upstream.ok) throw new Error(`catbox (${upstream.status})`);
      const url = parseUrlFromText(txt);
      if (!url) throw new Error("catbox (bad response)");
      return url;
    };

    const uploadLitterbox = async () => {
      const fd = new FormData();
      fd.append("reqtype", "fileupload");
      fd.append("time", LITTERBOX_EXPIRY);
      fd.append("fileToUpload", blob, filename);
      const upstream = await fetchWithTimeout(
        "https://litterbox.catbox.moe/resources/internals/api.php",
        { method: "POST", body: fd },
        UPLOAD_TIMEOUT_MS,
      );
      const txt = await upstream.text();
      if (!upstream.ok) throw new Error(`litterbox (${upstream.status})`);
      const url = parseUrlFromText(txt);
      if (!url) throw new Error("litterbox (bad response)");
      return url;
    };

    const upload0x0 = async () => {
      const fd = new FormData();
      fd.append("file", blob, filename);
      const upstream = await fetchWithTimeout("https://0x0.st", { method: "POST", body: fd }, UPLOAD_TIMEOUT_MS);
      const txt = await upstream.text();
      if (!upstream.ok) throw new Error(`0x0 (${upstream.status})`);
      const url = parseUrlFromText(txt);
      if (!url) throw new Error("0x0 (bad response)");
      return url;
    };

    const uploadFns = {
      uguu: uploadUguu,
      catbox: uploadCatbox,
      litterbox: uploadLitterbox,
      "0x0": upload0x0,
    };
    const attempts = UPLOAD_HOSTS.map((name) => ({ name, fn: uploadFns[name] })).filter((entry) => typeof entry.fn === "function");

    const purposePreferredOrder = PREFERRED_HOSTS_BY_PURPOSE[purpose] || PREFERRED_HOSTS_BY_PURPOSE.default || UPLOAD_HOSTS;

    const purposeRank = (host) => {
      const i = purposePreferredOrder.indexOf(host);
      return i === -1 ? 99 : i;
    };

    attempts.sort((a, b) => {
      const ra = purposeRank(a.name);
      const rb = purposeRank(b.name);
      if (ra !== rb) return ra - rb;
      const sa = hostScore(a.name);
      const sb = hostScore(b.name);
      if (sa.failRate !== sb.failRate) return sa.failRate - sb.failRate;
      return sa.avgMs - sb.avgMs;
    });

    const errors = [];
    const attemptMeta = [];
    for (const a of attempts) {
      const t0 = Date.now();
      try {
        const url = await a.fn();
        const ms = Date.now() - t0;
        updateUploadStats(a.name, true, ms);
        attemptMeta.push({ host: a.name, ok: true, ms });
        pushDoctorHistory(DOCTOR_HISTORY.uploadAttempts, { ts: new Date().toISOString(), host: a.name, ok: true, ms, purpose });

        send(
          res,
          200,
          JSON.stringify({ ok: true, url, host: a.name, ms, attempts: attemptMeta }),
          { "Content-Type": "application/json; charset=utf-8" },
        );
        return;
      } catch (e) {
        const ms = Date.now() - t0;
        const msg = e?.message || "failed";
        errors.push(`${a.name}: ${msg}`);
        updateUploadStats(a.name, false, ms);
        attemptMeta.push({ host: a.name, ok: false, ms, err: msg });
        pushDoctorHistory(DOCTOR_HISTORY.uploadAttempts, { ts: new Date().toISOString(), host: a.name, ok: false, ms, err: msg, purpose });
      }
    }

    send(
      res,
      502,
      JSON.stringify({ ok: false, error: "all_hosts_failed", details: errors, attempts: attemptMeta }),
      { "Content-Type": "application/json; charset=utf-8" },
    );
  } catch (e) {
    const statusCode = Number(e?.statusCode) || 500;
    const errorCode = e?.errorCode || "upload_error";
    reportServerIssue("upload.handle", e, { path: req.url, statusCode, errorCode });
    send(
      res,
      statusCode,
      JSON.stringify({ ok: false, error: errorCode, message: e?.message || "unknown" }),
      { "Content-Type": "application/json; charset=utf-8" },
    );
  }
}

async function handleWaitJobGet(req, res, u, jobId) {
  if (!jobId) {
    send(res, 400, JSON.stringify({ ok: false, error: "missing_job_id" }), { "Content-Type": "application/json" });
    return;
  }

  const sinceRaw = Number(u.searchParams.get("since"));
  const since = Number.isFinite(sinceRaw) ? sinceRaw : -1;
  const timeoutRaw = Number(u.searchParams.get("timeout"));
  const timeoutMs = Number.isFinite(timeoutRaw) ? Math.max(0, Math.min(WAIT_JOB_MAX_TIMEOUT_MS, timeoutRaw)) : WAIT_JOB_DEFAULT_TIMEOUT_MS;
  const job = await waitForWaitJobUpdate(jobId, since, timeoutMs);

  if (job) {
    send(res, 200, JSON.stringify({ ok: true, timeout: false, job, meta: waitJobMeta() }), { "Content-Type": "application/json" });
    return;
  }

  const latest = getWaitJob(jobId);
  send(res, 200, JSON.stringify({ ok: true, timeout: true, job: latest, missing: !latest, meta: waitJobMeta() }), { "Content-Type": "application/json" });
}

async function handleWaitJobPost(req, res, jobId) {
  try {
    if (!jobId) {
      send(res, 400, JSON.stringify({ ok: false, error: "missing_job_id" }), { "Content-Type": "application/json" });
      return;
    }

    const buf = await readBody(req, 1 * 1024 * 1024);
    const obj = safeJsonParse(buf.toString("utf8"), null, "wait-jobs.post.parse");
    if (!obj || typeof obj !== "object") {
      send(res, 400, JSON.stringify({ ok: false, error: "invalid_json" }), { "Content-Type": "application/json" });
      return;
    }

    const patch = {
      ...(obj?.engine != null ? { engine: obj.engine } : {}),
      ...(obj?.label != null ? { label: obj.label } : {}),
      ...(obj?.status != null ? { status: obj.status } : {}),
      ...(obj?.url != null ? { url: obj.url } : {}),
      ...(obj?.err != null ? { err: obj.err } : {}),
    };

    const job = upsertWaitJob(jobId, patch);
    send(res, 200, JSON.stringify({ ok: true, job }), { "Content-Type": "application/json" });
  } catch (e) {
    reportServerIssue("wait-jobs.post", e, { jobId });
    send(res, 500, JSON.stringify({ ok: false, error: e?.message || "unknown" }), { "Content-Type": "application/json" });
  }
}

async function handleScopedFetch(req, res, u) {
  try {
    const target = u.searchParams.get("url") || "";
    const fetched = await fetchScopedUrl(target, { req, scope: "fetch" });
    const metadata = /html/i.test(fetched.content_type) ? extractNormalizedMetadata(fetched.body, fetched.target, fetched.final_url) : null;
    send(
      res,
      200,
      JSON.stringify({
        ok: true,
        target: fetched.target,
        final_url: fetched.final_url,
        status: fetched.status,
        content_type: fetched.content_type,
        snippet: metadata?.snippet || stripTags(fetched.body).slice(0, 240),
        metadata,
        provenance: fetched.provenance,
      }),
      { "Content-Type": "application/json; charset=utf-8" },
    );
  } catch (error) {
    reportServerIssue("acq.fetch", error, { path: req.url });
    send(
      res,
      Number(error?.statusCode) || 500,
      JSON.stringify({ ok: false, error: error?.errorCode || "fetch_failed", message: error?.message || "unknown", rate_limit: error?.rateLimit || null }),
      { "Content-Type": "application/json; charset=utf-8" },
    );
  }
}

async function handleMetadata(req, res, u) {
  try {
    const target = u.searchParams.get("url") || "";
    const fetched = await fetchScopedUrl(target, { req, scope: "metadata" });
    const metadata = extractNormalizedMetadata(fetched.body, fetched.target, fetched.final_url);
    send(
      res,
      200,
      JSON.stringify({
        ok: true,
        target: fetched.target,
        final_url: fetched.final_url,
        status: fetched.status,
        metadata,
        provenance: fetched.provenance,
      }),
      { "Content-Type": "application/json; charset=utf-8" },
    );
  } catch (error) {
    reportServerIssue("acq.metadata", error, { path: req.url });
    send(
      res,
      Number(error?.statusCode) || 500,
      JSON.stringify({ ok: false, error: error?.errorCode || "metadata_failed", message: error?.message || "unknown", rate_limit: error?.rateLimit || null }),
      { "Content-Type": "application/json; charset=utf-8" },
    );
  }
}

async function handleDiscover(req, res, u) {
  try {
    const target = await assertScopedPublicUrl(u.searchParams.get("url") || "");
    const rate_limit = acquisitionRateLimit("discover", req);
    const origin = new URL(target).origin;
    const robotsUrl = `${origin}/robots.txt`;
    const startedAt = Date.now();
    const robotsRes = await fetchWithTimeout(
      robotsUrl,
      { method: "GET", redirect: "follow", headers: { accept: "text/plain,*/*;q=0.5", "user-agent": FETCH_USER_AGENT } },
      ACQ_TIMEOUT_MS,
    );
    const robotsText = await readResponseTextLimited(robotsRes, ACQ_MAX_BYTES);
    const sitemaps = extractSitemapsFromRobots(robotsText, origin);
    const allow = Array.from(robotsText.matchAll(/^\s*Allow:\s*(.+)\s*$/gim)).map((match) => match[1].trim()).slice(0, 12);
    const disallow = Array.from(robotsText.matchAll(/^\s*Disallow:\s*(.+)\s*$/gim)).map((match) => match[1].trim()).slice(0, 12);
    send(
      res,
      200,
      JSON.stringify({
        ok: true,
        target,
        origin,
        robots_url: robotsUrl,
        robots_status: robotsRes.status,
        sitemaps,
        allow,
        disallow,
        provenance: {
          requested_url: target,
          final_url: robotsRes.url || robotsUrl,
          fetched_at: new Date().toISOString(),
          duration_ms: Date.now() - startedAt,
          status: robotsRes.status,
          content_type: robotsRes.headers.get("content-type") || null,
          rate_limit,
        },
      }),
      { "Content-Type": "application/json; charset=utf-8" },
    );
  } catch (error) {
    reportServerIssue("acq.discover", error, { path: req.url });
    send(
      res,
      Number(error?.statusCode) || 500,
      JSON.stringify({ ok: false, error: error?.errorCode || "discover_failed", message: error?.message || "unknown", rate_limit: error?.rateLimit || null }),
      { "Content-Type": "application/json; charset=utf-8" },
    );
  }
}

async function handleArchive(req, res, u) {
  try {
    const target = await assertScopedPublicUrl(u.searchParams.get("url") || "");
    const rate_limit = acquisitionRateLimit("archive", req);
    const startedAt = Date.now();
    const archiveUrl = new URL(ACQ_ARCHIVE_API_BASE);
    archiveUrl.searchParams.set("url", target);
    const response = await fetchWithTimeout(
      archiveUrl,
      { method: "GET", headers: { accept: "application/json", "user-agent": FETCH_USER_AGENT } },
      ACQ_TIMEOUT_MS,
    );
    const text = await readResponseTextLimited(response, ACQ_MAX_BYTES);
    const parsed = safeJsonParse(text, {}, "archive.parse", { target });
    const closest = parsed?.archived_snapshots?.closest || null;
    send(
      res,
      200,
      JSON.stringify({
        ok: true,
        target,
        snapshot: closest
          ? {
              available: Boolean(closest.available),
              url: closest.url || null,
              timestamp: closest.timestamp || null,
              status: closest.status || null,
            }
          : null,
        provenance: {
          requested_url: target,
          final_url: response.url || archiveUrl.toString(),
          fetched_at: new Date().toISOString(),
          duration_ms: Date.now() - startedAt,
          status: response.status,
          content_type: response.headers.get("content-type") || null,
          rate_limit,
        },
      }),
      { "Content-Type": "application/json; charset=utf-8" },
    );
  } catch (error) {
    reportServerIssue("acq.archive", error, { path: req.url });
    send(
      res,
      Number(error?.statusCode) || 500,
      JSON.stringify({ ok: false, error: error?.errorCode || "archive_failed", message: error?.message || "unknown", rate_limit: error?.rateLimit || null }),
      { "Content-Type": "application/json; charset=utf-8" },
    );
  }
}

function serveStatic(req, res, pathname) {
  const p = pathname === "/" ? "/index.html" : pathname;
  const filePath = safeJoin(ROOT, p);
  if (!filePath) {
    send(res, 400, "Bad path\n", { "Content-Type": "text/plain" });
    return;
  }

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      send(res, 404, "Not found\n", { "Content-Type": "text/plain" });
      return;
    }

    const ct = contentType(filePath);
    res.writeHead(200, { "Content-Type": ct, "Cache-Control": "no-store" });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const waitJobId = waitJobIdFromPath(u.pathname);
  if (req.method === "POST" && u.pathname === "/api/upload") {
    await handleUpload(req, res);
    return;
  }
  if (u.pathname === "/api/ping") {
    send(res, 200, JSON.stringify({ ok: true }), { "Content-Type": "application/json" });
    return;
  }
  if (u.pathname === "/api/doctor") {
    const uploadReachability = await collectDoctorUploadReachability();
    const cdnReachability = await collectDoctorCdnReachability();
    const engineAvailability = await collectDoctorEngineAvailability();
    pushDoctorHistory(DOCTOR_HISTORY.cdnReachability, { ts: new Date().toISOString(), rows: cdnReachability });
    pushDoctorHistory(DOCTOR_HISTORY.engineAvailability, { ts: new Date().toISOString(), rows: engineAvailability });
    send(
      res,
      200,
      JSON.stringify({
        ok: true,
        ping_ok: true,
        app_version: BLUELENS_CONFIG.meta?.appVersion || "dev",
        schema_version: BLUELENS_CONFIG.meta?.exportSchemaVersion || "bluelens-report-v1",
        node_version: process.version,
        server_started_at: SERVER_STARTED_AT,
        acquisition: {
          allow_private_fetch: ALLOW_PRIVATE_FETCH,
          timeout_ms: ACQ_TIMEOUT_MS,
          max_bytes: ACQ_MAX_BYTES,
          rate_limit_max: ACQ_RATE_LIMIT_MAX,
          rate_limit_window_ms: ACQ_RATE_LIMIT_WINDOW_MS,
        },
        upload_reachability: uploadReachability,
        cdn_reachability: cdnReachability,
        engine_availability: engineAvailability,
        recent_upload_attempts: DOCTOR_HISTORY.uploadAttempts.slice(-8).reverse(),
        recommended_upload_host: bestUploadHost(),
        history: {
          upload_hosts: summarizeUploadHostHistory(),
          upload_reachability: DOCTOR_HISTORY.uploadReachability.slice(-6),
          cdn_reachability: DOCTOR_HISTORY.cdnReachability.slice(-6),
          engine_availability: DOCTOR_HISTORY.engineAvailability.slice(-6),
        },
      }),
      { "Content-Type": "application/json" },
    );
    return;
  }
  if (req.method === "GET" && u.pathname === "/api/fetch") {
    await handleScopedFetch(req, res, u);
    return;
  }
  if (req.method === "GET" && u.pathname === "/api/metadata") {
    await handleMetadata(req, res, u);
    return;
  }
  if (req.method === "GET" && u.pathname === "/api/discover") {
    await handleDiscover(req, res, u);
    return;
  }
  if (req.method === "GET" && u.pathname === "/api/archive") {
    await handleArchive(req, res, u);
    return;
  }
  if (u.pathname === "/api/upload-stats") {
    const obj = {};
    for (const [k, v] of UPLOAD_STATS.entries()) obj[k] = v;
    send(res, 200, JSON.stringify({ ok: true, stats: obj }), { "Content-Type": "application/json" });
    return;
  }
  if (waitJobId && req.method === "GET") {
    await handleWaitJobGet(req, res, u, waitJobId);
    return;
  }
  if (waitJobId && req.method === "POST") {
    await handleWaitJobPost(req, res, waitJobId);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, "Method not allowed\n", { "Content-Type": "text/plain" });
    return;
  }

  serveStatic(req, res, u.pathname);
});

server.listen(PORT, "127.0.0.1", () => {
  // eslint-disable-next-line no-console
  console.log(`BlueLens running at http://localhost:${PORT}`);
});
