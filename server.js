/* BlueLens local server (static + upload proxy)
   - Serves static files from this folder
   - Provides POST /api/upload to proxy-upload images to a public host
   - Provides /api/status so wait tabs can receive the URL reliably

   Run:
     node server.js
   Then open:
     http://localhost:8787
*/

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const ROOT = __dirname;
const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const WAIT_STATUS_TTL_MS = 5 * 60 * 1000;
const WAIT_STATUS_PRUNE_MS = 30 * 1000;
const WAIT_STATUS_MAX_ENTRIES = 500;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_UPLOADS = 20;
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".gif", ".bmp", ".tif", ".tiff"]);
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
  "image/bmp",
  "image/tiff",
]);
const ALLOWED_ENGINES = new Set(["lens", "bing", "tineye", "yandex", "google_images"]);

const WAIT_STATUS = new Map();
const UPLOAD_STATS = new Map();
const UPLOAD_RATE_LIMIT = new Map();

function logEvent(event, fields = {}) {
  const payload = { ts: new Date().toISOString(), event, ...fields };
  try {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload));
  } catch {
    // eslint-disable-next-line no-console
    console.log(`[${payload.ts}] ${event}`);
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

function waitKey(token, engine) {
  return `${token || ""}:${engine || ""}`;
}

function isValidWaitToken(token) {
  return /^[A-Za-z0-9_-]{24,128}$/.test(String(token || ""));
}

function isAllowedEngine(engine) {
  return ALLOWED_ENGINES.has(String(engine || ""));
}

function pruneWaitStatus(maxAgeMs = WAIT_STATUS_TTL_MS) {
  const now = Date.now();
  for (const [k, v] of WAIT_STATUS.entries()) {
    if (!v || typeof v.ts !== "number" || now - v.ts > maxAgeMs) WAIT_STATUS.delete(k);
  }

  const overflow = WAIT_STATUS.size - WAIT_STATUS_MAX_ENTRIES;
  if (overflow > 0) {
    const entries = [...WAIT_STATUS.entries()].sort((a, b) => (a[1]?.ts || 0) - (b[1]?.ts || 0));
    for (let i = 0; i < overflow; i += 1) WAIT_STATUS.delete(entries[i][0]);
  }
}

function pruneRateLimit(now = Date.now()) {
  for (const [ip, entry] of UPLOAD_RATE_LIMIT.entries()) {
    if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) UPLOAD_RATE_LIMIT.delete(ip);
  }
}

function parseClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)[0];
  return forwarded || req.socket?.remoteAddress || "127.0.0.1";
}

function checkUploadRateLimit(ip, now = Date.now()) {
  pruneRateLimit(now);
  const current = UPLOAD_RATE_LIMIT.get(ip);
  if (!current || now - current.windowStart >= RATE_LIMIT_WINDOW_MS) {
    UPLOAD_RATE_LIMIT.set(ip, { windowStart: now, count: 1 });
    return { allowed: true, remaining: RATE_LIMIT_MAX_UPLOADS - 1 };
  }
  if (current.count >= RATE_LIMIT_MAX_UPLOADS) {
    return { allowed: false, remaining: 0, retryAfterMs: RATE_LIMIT_WINDOW_MS - (now - current.windowStart) };
  }
  current.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_MAX_UPLOADS - current.count };
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

function cacheControlFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html" || ext === ".json" || ext === ".md") return "no-store";
  return "public, max-age=300";
}

function buildContentSecurityPolicy() {
  return [
    "default-src 'self'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' https://unpkg.com https://cdn.jsdelivr.net",
    "connect-src 'self' https://cdn.jsdelivr.net https://uguu.se https://catbox.moe https://litterbox.catbox.moe https://0x0.st",
    "worker-src 'self' blob:",
    "form-action 'self'",
  ].join("; ");
}

function securityHeaders(extra = {}) {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
    "X-Robots-Tag": "noindex, nofollow",
    "Content-Security-Policy": buildContentSecurityPolicy(),
    ...extra,
  };
}

function writeResponse(req, res, status, body = "", headers = {}) {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  const merged = securityHeaders({
    "Cache-Control": "no-store",
    "Content-Length": String(payload.length),
    ...headers,
  });
  res.writeHead(status, merged);
  if (req.method !== "HEAD") res.end(payload);
  else res.end();
}

function sendJson(req, res, status, payload, headers = {}) {
  writeResponse(req, res, status, JSON.stringify(payload), {
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
}

function apiSuccess(req, res, status, data, headers = {}) {
  sendJson(req, res, status, { ok: true, ...data }, headers);
}

function apiError(req, res, status, code, message, details, headers = {}) {
  const payload = {
    ok: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
  sendJson(req, res, status, payload, headers);
}

async function readBody(req, maxBytes = MAX_UPLOAD_BYTES) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      const err = new Error(`Payload too large. Max ${Math.floor(maxBytes / (1024 * 1024))}MB.`);
      err.code = "payload_too_large";
      throw err;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function validateUploadRequest(filename, mime) {
  const cleanFilename = path.basename(String(filename || "image")).slice(0, 200);
  const ext = path.extname(cleanFilename).toLowerCase();
  const cleanMime = String(mime || "").split(";")[0].trim().toLowerCase();

  if (!cleanMime || !cleanMime.startsWith("image/")) {
    return { ok: false, code: "unsupported_media_type", message: "Only image uploads are supported." };
  }
  if (!ALLOWED_MIME_TYPES.has(cleanMime)) {
    return { ok: false, code: "unsupported_media_type", message: `Unsupported image type: ${cleanMime}` };
  }
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    return { ok: false, code: "unsupported_extension", message: `Unsupported file extension: ${ext}` };
  }
  return { ok: true, filename: cleanFilename || "image", mime: cleanMime };
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

function parseUrlFromText(txt) {
  const first = (txt || "").trim().split(/\s+/)[0];
  return /^https?:\/\//i.test(first) ? first : null;
}

async function handleUpload(req, res) {
  const ip = parseClientIp(req);
  const limit = checkUploadRateLimit(ip);
  if (!limit.allowed) {
    apiError(
      req,
      res,
      429,
      "rate_limited",
      "Too many uploads. Please wait a moment and try again.",
      { retryAfterMs: limit.retryAfterMs },
      { "Retry-After": String(Math.ceil((limit.retryAfterMs || RATE_LIMIT_WINDOW_MS) / 1000)) },
    );
    logEvent("upload.rate_limited", { ip });
    return;
  }

  try {
    const filename = (req.headers["x-filename"] || "image").toString();
    const mime = (req.headers["content-type"] || "application/octet-stream").toString();
    const purpose = (req.headers["x-purpose"] || "").toString().toLowerCase();
    const validation = validateUploadRequest(filename, mime);
    if (!validation.ok) {
      apiError(req, res, 415, validation.code, validation.message);
      logEvent("upload.rejected", { ip, filename, mime, reason: validation.code });
      return;
    }

    const buf = await readBody(req);
    const blob = new Blob([buf], { type: validation.mime });

    const uploadUguu = async () => {
      const fd = new FormData();
      fd.append("files[]", blob, validation.filename);
      const upstream = await fetchWithTimeout("https://uguu.se/upload.php", { method: "POST", body: fd }, 35_000);
      const txt = await upstream.text();
      if (!upstream.ok) throw new Error(`uguu (${upstream.status})`);
      let obj = null;
      try {
        obj = JSON.parse(txt);
      } catch {
        obj = null;
      }
      const url = obj?.files?.[0]?.url;
      if (!url || !/^https?:\/\//i.test(url)) throw new Error("uguu (bad response)");
      return url;
    };

    const uploadCatbox = async () => {
      const fd = new FormData();
      fd.append("reqtype", "fileupload");
      fd.append("fileToUpload", blob, validation.filename);
      const upstream = await fetchWithTimeout("https://catbox.moe/user/api.php", { method: "POST", body: fd }, 35_000);
      const txt = await upstream.text();
      if (!upstream.ok) throw new Error(`catbox (${upstream.status})`);
      const url = parseUrlFromText(txt);
      if (!url) throw new Error("catbox (bad response)");
      return url;
    };

    const uploadLitterbox = async () => {
      const fd = new FormData();
      fd.append("reqtype", "fileupload");
      fd.append("time", "72h");
      fd.append("fileToUpload", blob, validation.filename);
      const upstream = await fetchWithTimeout(
        "https://litterbox.catbox.moe/resources/internals/api.php",
        { method: "POST", body: fd },
        35_000,
      );
      const txt = await upstream.text();
      if (!upstream.ok) throw new Error(`litterbox (${upstream.status})`);
      const url = parseUrlFromText(txt);
      if (!url) throw new Error("litterbox (bad response)");
      return url;
    };

    const upload0x0 = async () => {
      const fd = new FormData();
      fd.append("file", blob, validation.filename);
      const upstream = await fetchWithTimeout("https://0x0.st", { method: "POST", body: fd }, 35_000);
      const txt = await upstream.text();
      if (!upstream.ok) throw new Error(`0x0 (${upstream.status})`);
      const url = parseUrlFromText(txt);
      if (!url) throw new Error("0x0 (bad response)");
      return url;
    };

    const attempts = [
      { name: "uguu", fn: uploadUguu },
      { name: "catbox", fn: uploadCatbox },
      { name: "litterbox", fn: uploadLitterbox },
      { name: "0x0", fn: upload0x0 },
    ];

    const purposePreferredOrder =
      purpose === "lens" || purpose === "google"
        ? ["catbox", "0x0", "litterbox", "uguu"]
        : ["uguu", "catbox", "0x0", "litterbox"];

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
        apiSuccess(req, res, 200, { url, host: a.name, ms, attempts: attemptMeta });
        logEvent("upload.ok", { ip, host: a.name, ms, purpose, filename: validation.filename });
        return;
      } catch (e) {
        const ms = Date.now() - t0;
        const msg = e?.message || "failed";
        errors.push(`${a.name}: ${msg}`);
        updateUploadStats(a.name, false, ms);
        attemptMeta.push({ host: a.name, ok: false, ms, err: msg });
      }
    }

    apiError(req, res, 502, "all_hosts_failed", "All upload hosts failed.", {
      attempts: attemptMeta,
      providers: errors,
    });
    logEvent("upload.failed", { ip, purpose, filename: validation.filename, errors });
  } catch (e) {
    if (e?.code === "payload_too_large") {
      apiError(req, res, 413, "payload_too_large", e.message);
      logEvent("upload.rejected", { ip, reason: "payload_too_large" });
      return;
    }
    apiError(req, res, 500, "upload_error", e?.message || "Unknown upload error.");
    logEvent("upload.error", { ip, message: e?.message || "unknown" });
  }
}

async function handleWaitStatusGet(req, res, u) {
  pruneWaitStatus();
  const token = u.searchParams.get("token") || "";
  const engine = u.searchParams.get("engine") || "";
  if (!isValidWaitToken(token) || !isAllowedEngine(engine)) {
    apiError(req, res, 400, "invalid_status_key", "Invalid wait token or engine.");
    return;
  }
  const v = WAIT_STATUS.get(waitKey(token, engine));
  if (!v) {
    apiError(req, res, 404, "not_found", "No pending wait status was found for that token.");
    return;
  }
  apiSuccess(req, res, 200, v);
}

async function handleWaitStatusPost(req, res) {
  try {
    const buf = await readBody(req, 1024 * 1024);
    let obj = null;
    try {
      obj = JSON.parse(buf.toString("utf8"));
    } catch {
      obj = null;
    }

    const token = (obj?.token || "").toString();
    const engine = (obj?.engine || "").toString();
    if (!isValidWaitToken(token) || !isAllowedEngine(engine)) {
      apiError(req, res, 400, "invalid_status_key", "Invalid wait token or engine.");
      return;
    }

    const status = obj?.status != null ? String(obj.status).slice(0, 120) : undefined;
    const url = obj?.url != null ? String(obj.url).slice(0, 2000) : undefined;
    const err = obj?.err != null ? String(obj.err).slice(0, 240) : undefined;

    WAIT_STATUS.set(waitKey(token, engine), {
      ts: Date.now(),
      ...(status ? { status } : {}),
      ...(url ? { url } : {}),
      ...(err ? { err } : {}),
    });
    pruneWaitStatus();

    apiSuccess(req, res, 200, {});
    logEvent("status.updated", { engine });
  } catch (e) {
    if (e?.code === "payload_too_large") {
      apiError(req, res, 413, "payload_too_large", e.message);
      return;
    }
    apiError(req, res, 500, "status_error", e?.message || "Unknown status error.");
  }
}

function serveStatic(req, res, pathname) {
  const p = pathname === "/" ? "/index.html" : pathname;
  const filePath = safeJoin(ROOT, p);
  if (!filePath) {
    writeResponse(req, res, 400, "Bad path\n", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      writeResponse(req, res, 404, "Not found\n", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }

    const ct = contentType(filePath);
    const headers = securityHeaders({
      "Content-Type": ct,
      "Cache-Control": cacheControlFor(filePath),
      "Last-Modified": st.mtime.toUTCString(),
      "Content-Length": String(st.size),
    });
    res.writeHead(200, headers);
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  });
}

function requestHandler() {
  return async (req, res) => {
    const u = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "POST" && u.pathname === "/api/upload") {
      await handleUpload(req, res);
      return;
    }
    if (u.pathname === "/api/ping") {
      apiSuccess(req, res, 200, {});
      return;
    }
    if (u.pathname === "/api/upload-stats") {
      const stats = {};
      for (const [k, v] of UPLOAD_STATS.entries()) stats[k] = v;
      apiSuccess(req, res, 200, { stats });
      return;
    }
    if (u.pathname === "/api/status" && req.method === "GET") {
      await handleWaitStatusGet(req, res, u);
      return;
    }
    if (u.pathname === "/api/status" && req.method === "POST") {
      await handleWaitStatusPost(req, res);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      writeResponse(req, res, 405, "Method not allowed\n", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }

    serveStatic(req, res, u.pathname);
  };
}

function createAppServer() {
  return http.createServer(requestHandler());
}

let pruneTimer = null;

function installBackgroundTasks() {
  if (pruneTimer) return;
  pruneTimer = setInterval(() => {
    pruneWaitStatus();
    pruneRateLimit();
  }, WAIT_STATUS_PRUNE_MS);
  pruneTimer.unref?.();
}

function shutdown(server, signal) {
  if (pruneTimer) {
    clearInterval(pruneTimer);
    pruneTimer = null;
  }
  server.close(() => {
    logEvent("server.stopped", { signal });
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref?.();
}

if (require.main === module) {
  installBackgroundTasks();
  const server = createAppServer();
  server.listen(PORT, "127.0.0.1", () => {
    logEvent("server.started", { port: PORT, url: `http://localhost:${PORT}` });
  });
  process.on("SIGINT", () => shutdown(server, "SIGINT"));
  process.on("SIGTERM", () => shutdown(server, "SIGTERM"));
}

module.exports = {
  ALLOWED_ENGINES,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  WAIT_STATUS,
  WAIT_STATUS_TTL_MS,
  buildContentSecurityPolicy,
  cacheControlFor,
  contentType,
  createAppServer,
  installBackgroundTasks,
  isAllowedEngine,
  isValidWaitToken,
  parseClientIp,
  pruneWaitStatus,
  validateUploadRequest,
  waitKey,
};
