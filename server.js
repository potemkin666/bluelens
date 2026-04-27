/* Ocean OSINT Lens local server (static + upload proxy)
   - Serves static files from this folder
   - Provides POST /api/upload to proxy-upload images to a public host (avoids browser CORS limitations)
   - Provides /api/status so "wait tabs" can receive the URL reliably

   Run:
     node server.js
   Then open:
     http://localhost:8787
*/

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = __dirname;
const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;

// In-memory status handoff for wait tabs (avoids relying on localStorage being available).
// Key: `${token}:${engine}` -> { status?, url?, err?, ts }
const WAIT_STATUS = new Map();

// Upload host telemetry for auto-fastest selection.
// host -> { ok: number, fail: number, avgMs: number }
const UPLOAD_STATS = new Map();
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
function pruneWaitStatus(maxAgeMs = 10 * 60 * 1000) {
  const now = Date.now();
  for (const [k, v] of WAIT_STATUS.entries()) {
    if (!v || typeof v.ts !== "number" || now - v.ts > maxAgeMs) WAIT_STATUS.delete(k);
  }
}
setInterval(() => pruneWaitStatus(), 60 * 1000).unref?.();

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
      // Uguu expects `files[]` (plural) and returns JSON with a direct URL.
      const fd = new FormData();
      fd.append("files[]", blob, filename);
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
      // Anonymous uploads supported when no userhash is supplied.
      const fd = new FormData();
      fd.append("reqtype", "fileupload");
      fd.append("fileToUpload", blob, filename);
      const upstream = await fetchWithTimeout("https://catbox.moe/user/api.php", { method: "POST", body: fd }, 35_000);
      const txt = await upstream.text();
      if (!upstream.ok) throw new Error(`catbox (${upstream.status})`);
      const url = parseUrlFromText(txt);
      if (!url) throw new Error("catbox (bad response)");
      return url;
    };

    const uploadLitterbox = async () => {
      // Temporary hosting (1h–72h). `time` is required. Returns a direct URL as plain text.
      const fd = new FormData();
      fd.append("reqtype", "fileupload");
      fd.append("time", "72h");
      fd.append("fileToUpload", blob, filename);
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
      // 0x0.st: simple multipart field `file`, returns direct URL as plain text.
      const fd = new FormData();
      fd.append("file", blob, filename);
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

    // Auto-fastest routing (based on recent telemetry), with purpose-aware nudges.
    // Some engines (notably Lens) behave better with stable hosts that allow third-party fetches.
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
    send(
      res,
      500,
      JSON.stringify({ ok: false, error: "upload_error", message: e?.message || "unknown" }),
      { "Content-Type": "application/json; charset=utf-8" },
    );
  }
}

async function handleWaitStatusGet(req, res, u) {
  pruneWaitStatus();
  const token = u.searchParams.get("token") || "";
  const engine = u.searchParams.get("engine") || "";
  const v = WAIT_STATUS.get(waitKey(token, engine));
  if (!v) {
    send(res, 404, JSON.stringify({ ok: false, error: "not_found" }), { "Content-Type": "application/json" });
    return;
  }
  send(res, 200, JSON.stringify({ ok: true, ...v }), { "Content-Type": "application/json" });
}

async function handleWaitStatusPost(req, res) {
  try {
    const buf = await readBody(req, 1 * 1024 * 1024);
    let obj = null;
    try {
      obj = JSON.parse(buf.toString("utf8"));
    } catch {
      obj = null;
    }

    const token = (obj?.token || "").toString();
    const engine = (obj?.engine || "").toString();
    if (!token || !engine) {
      send(res, 400, JSON.stringify({ ok: false, error: "missing_token_or_engine" }), {
        "Content-Type": "application/json",
      });
      return;
    }

    const status = obj?.status != null ? String(obj.status) : undefined;
    const url = obj?.url != null ? String(obj.url) : undefined;
    const err = obj?.err != null ? String(obj.err) : undefined;

    WAIT_STATUS.set(waitKey(token, engine), {
      ts: Date.now(),
      ...(status ? { status } : {}),
      ...(url ? { url } : {}),
      ...(err ? { err } : {}),
    });

    send(res, 200, JSON.stringify({ ok: true }), { "Content-Type": "application/json" });
  } catch (e) {
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
  if (u.pathname === "/api/status" && req.method === "GET") {
    await handleWaitStatusGet(req, res, u);
    return;
  }
  if (u.pathname === "/api/status" && req.method === "POST") {
    await handleWaitStatusPost(req, res);
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
