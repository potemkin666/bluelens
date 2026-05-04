/* Ocean OSINT Lens local server (static + upload proxy)
   - Serves static files from this folder
   - Provides POST /api/upload to proxy-upload images to a public host (avoids browser CORS limitations)
   - Provides durable /api/wait-jobs/:id handoff routes for wait tabs

   Run:
     node server.js
   Then open:
     http://localhost:8787
*/

const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { URL } = require("url");
const BLUELENS_CONFIG = require("./bluelens-config.js");

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

// Durable wait-job handoff for wait tabs.
// Key: jobId -> { id, engine, label, status, url, err, seq, created_at, updated_at, expires_at }
const WAIT_JOBS = new Map();
const WAIT_JOB_LISTENERS = new Map();

// Upload host telemetry for auto-fastest selection.
// host -> { ok: number, fail: number, avgMs: number }
const UPLOAD_STATS = new Map();
function reportServerIssue(scope, error, detail = null) {
  const msg = error?.message || String(error || "unknown error");
  if (detail) console.warn(`[BlueLens:${scope}] ${msg}`, detail);
  else console.warn(`[BlueLens:${scope}] ${msg}`);
}

function safeJsonParse(txt, fallback, scope, detail = null) {
  try {
    return JSON.parse(txt);
  } catch (error) {
    if (scope) reportServerIssue(scope, error, detail);
    return fallback;
  }
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

    // Node 18+ has global Blob/FormData/fetch.
    const blob = new Blob([buf], { type: mime });

    const fetchWithTimeout = async (url, init, ms) => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), ms);
      try {
        return await fetch(url, { ...init, signal: controller.signal });
      } finally {
        clearTimeout(t);
      }
    };

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
      }
    }

    send(
      res,
      502,
      JSON.stringify({ ok: false, error: "all_hosts_failed", details: errors, attempts: attemptMeta }),
      { "Content-Type": "application/json; charset=utf-8" },
    );
  } catch (e) {
    reportServerIssue("upload.handle", e, { path: req.url });
    send(
      res,
      500,
      JSON.stringify({ ok: false, error: "upload_error", message: e?.message || "unknown" }),
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
  console.log(`Ocean OSINT Lens running at http://localhost:${PORT}`);
});
