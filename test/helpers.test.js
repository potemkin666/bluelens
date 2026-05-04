const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");

const {
  extractPivotsFromReport,
  hammingHex,
  parseDimensions,
  sortBatchItems,
} = require("../bluelens-helpers.js");

const SERVER_START_TIMEOUT = 5000;

test("hammingHex compares perceptual hashes", () => {
  assert.equal(hammingHex("0000", "0000"), 0);
  assert.equal(hammingHex("0f", "f0"), 8);
  assert.equal(hammingHex("00", "xyz"), null);
});

test("parseDimensions and sortBatchItems support dimension sorting", () => {
  assert.deepEqual(parseDimensions("640 × 480"), { width: 640, height: 480, area: 307200 });
  assert.equal(parseDimensions("unknown"), null);

  const items = [
    { report: { file: { name: "b" }, dimensions: "300 × 300" }, triage: { lead: 9, gps: false, entCount: 1, repost: 10 }, clusterId: 2 },
    { report: { file: { name: "a" }, dimensions: "1200 × 800" }, triage: { lead: 4, gps: true, entCount: 2, repost: 50 }, clusterId: 1 },
    { report: { file: { name: "c" }, dimensions: "640 × 480" }, triage: { lead: 7, gps: false, entCount: 0, repost: 20 }, clusterId: 3 },
  ];

  const byDim = sortBatchItems(items, "dim", "desc").map((x) => x.report.file.name);
  assert.deepEqual(byDim, ["a", "c", "b"]);
});

test("extractPivotsFromReport keeps OCR handles to a single @ prefix", () => {
  const pivots = extractPivotsFromReport({
    key_fields: {
      camera: "Camera",
      software: "Editor",
      ocr_entities: {
        urls: ["https://example.com/a"],
        emails: ["user@example.com"],
        handles: ["@alice", "@bob"],
        phones: ["+1 415 555 1234"],
      },
    },
    gps: { lat: 1.234567, lon: 2.345678 },
  });

  assert.ok(pivots.includes("@alice"));
  assert.ok(pivots.includes("@bob"));
  assert.ok(!pivots.includes("@@alice"));
});

test("local server exposes ping and durable wait-job handoff routes", async (t) => {
  const port = 8879;
  const cwd = path.resolve(__dirname, "..");
  const server = spawn(process.execPath, ["server.js"], {
    cwd,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server start timeout")), SERVER_START_TIMEOUT);
    server.stdout.on("data", (buf) => {
      if (String(buf).includes(`http://localhost:${port}`)) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    server.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited early: ${code}`));
    });
  });

  t.after(() => {
    server.kill("SIGTERM");
  });

  const ping = await fetch(`http://127.0.0.1:${port}/api/ping`);
  assert.equal(ping.status, 200);
  assert.deepEqual(await ping.json(), { ok: true });

  const doctor = await fetch(`http://127.0.0.1:${port}/api/doctor`);
  assert.equal(doctor.status, 200);
  const doctorData = await doctor.json();
  assert.equal(doctorData.ok, true);
  assert.equal(doctorData.app_version, "2026.05.04");
  assert.equal(doctorData.schema_version, "bluelens-report-v3");
  assert.match(doctorData.node_version, /^v\d+\./);
  assert.ok(Array.isArray(doctorData.upload_reachability));

  const jobId = `job-${Date.now()}`;

  const waitRead = fetch(`http://127.0.0.1:${port}/api/wait-jobs/${jobId}?since=-1&timeout=2000`, {
    cache: "no-store",
  });

  const post = await fetch(`http://127.0.0.1:${port}/api/wait-jobs/${jobId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ engine: "lens", label: "Lens", status: "uploading" }),
  });
  assert.equal(post.status, 200);
  const created = await post.json();
  assert.equal(created.ok, true);
  assert.equal(created.job.id, jobId);
  assert.equal(created.job.engine, "lens");
  assert.equal(created.job.label, "Lens");
  assert.equal(created.job.status, "uploading");

  const first = await waitRead;
  assert.equal(first.status, 200);
  const firstData = await first.json();
  assert.equal(firstData.ok, true);
  assert.equal(firstData.timeout, false);
  assert.equal(firstData.job.id, jobId);
  assert.equal(firstData.job.status, "uploading");
  assert.ok(Number.isFinite(firstData.meta?.server_started_at));
  const firstSeq = firstData.job.seq;

  const update = await fetch(`http://127.0.0.1:${port}/api/wait-jobs/${jobId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: "https://example.com/a.jpg" }),
  });
  assert.equal(update.status, 200);

  const get = await fetch(`http://127.0.0.1:${port}/api/wait-jobs/${jobId}?since=${firstSeq}&timeout=2000`, {
    cache: "no-store",
  });
  assert.equal(get.status, 200);
  const data = await get.json();
  assert.equal(data.ok, true);
  assert.equal(data.timeout, false);
  assert.equal(data.job.url, "https://example.com/a.jpg");
  assert.equal(data.job.status, "ready");
  assert.ok(data.job.seq > firstSeq);

  const timeout = await fetch(`http://127.0.0.1:${port}/api/wait-jobs/missing-${Date.now()}?since=-1&timeout=20`, {
    cache: "no-store",
  });
  assert.equal(timeout.status, 200);
  const timeoutData = await timeout.json();
  assert.equal(timeoutData.ok, true);
  assert.equal(timeoutData.timeout, true);
  assert.equal(timeoutData.job, null);
  assert.equal(timeoutData.missing, true);
  assert.ok(Number.isFinite(timeoutData.meta?.server_started_at));

  const badUpload = await fetch(`http://127.0.0.1:${port}/api/upload`, {
    method: "POST",
    headers: { "content-type": "image/png", "x-filename": "not-image.png" },
    body: Buffer.from("definitely not a png"),
  });
  assert.equal(badUpload.status, 415);
  const badUploadData = await badUpload.json();
  assert.equal(badUploadData.ok, false);
  assert.equal(badUploadData.error, "invalid_image_payload");
});

test("local server exposes scoped acquisition routes with provenance", async (t) => {
  const upstreamPort = 8880;
  const appPort = 8881;
  const upstream = http.createServer((req, res) => {
    const u = new URL(req.url, `http://${req.headers.host}`);
    if (u.pathname === "/page") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(`<!doctype html>
        <html>
          <head>
            <title>Example Evidence</title>
            <meta name="description" content="Structured metadata capture for BlueLens." />
            <link rel="canonical" href="https://example.test/evidence" />
          </head>
          <body>
            <h1>Example Evidence</h1>
            <p>Mirror profile cluster seen in multiple reposts.</p>
            <a href="https://instagram.com/example_handle">Instagram</a>
          </body>
        </html>`);
      return;
    }
    if (u.pathname === "/robots.txt") {
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      res.end(`User-agent: *\nAllow: /\nDisallow: /private\nSitemap: http://127.0.0.1:${upstreamPort}/sitemap.xml\n`);
      return;
    }
    if (u.pathname === "/archive") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        archived_snapshots: {
          closest: {
            available: true,
            url: "https://web.archive.org/web/20200102030405/https://example.test/evidence",
            timestamp: "20200102030405",
            status: "200",
          },
        },
      }));
      return;
    }
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
  });

  await new Promise((resolve) => upstream.listen(upstreamPort, "127.0.0.1", resolve));
  t.after(() => upstream.close());

  const cwd = path.resolve(__dirname, "..");
  const server = spawn(process.execPath, ["server.js"], {
    cwd,
    env: {
      ...process.env,
      PORT: String(appPort),
      BLUELENS_ALLOW_PRIVATE_FETCH: "1",
      BLUELENS_ARCHIVE_API_BASE: `http://127.0.0.1:${upstreamPort}/archive`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server start timeout")), SERVER_START_TIMEOUT);
    server.stdout.on("data", (buf) => {
      if (String(buf).includes(`http://localhost:${appPort}`)) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    server.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited early: ${code}`));
    });
  });

  t.after(() => {
    server.kill("SIGTERM");
  });

  const target = `http://127.0.0.1:${upstreamPort}/page`;
  const metadata = await fetch(`http://127.0.0.1:${appPort}/api/metadata?url=${encodeURIComponent(target)}`);
  assert.equal(metadata.status, 200);
  const metadataData = await metadata.json();
  assert.equal(metadataData.ok, true);
  assert.equal(metadataData.metadata.title, "Example Evidence");
  assert.equal(metadataData.metadata.canonical_url, "https://example.test/evidence");
  assert.equal(metadataData.metadata.h1, "Example Evidence");
  assert.ok(Array.isArray(metadataData.metadata.identities));
  assert.equal(metadataData.metadata.identities[0].platform, "instagram");
  assert.equal(metadataData.provenance.rate_limit.scope, "metadata");

  const scopedFetch = await fetch(`http://127.0.0.1:${appPort}/api/fetch?url=${encodeURIComponent(target)}`);
  assert.equal(scopedFetch.status, 200);
  const fetchData = await scopedFetch.json();
  assert.equal(fetchData.ok, true);
  assert.match(fetchData.snippet, /Mirror profile cluster/);

  const discover = await fetch(`http://127.0.0.1:${appPort}/api/discover?url=${encodeURIComponent(target)}`);
  assert.equal(discover.status, 200);
  const discoverData = await discover.json();
  assert.equal(discoverData.ok, true);
  assert.equal(discoverData.robots_status, 200);
  assert.deepEqual(discoverData.disallow, ["/private"]);
  assert.deepEqual(discoverData.sitemaps, [`http://127.0.0.1:${upstreamPort}/sitemap.xml`]);

  const archive = await fetch(`http://127.0.0.1:${appPort}/api/archive?url=${encodeURIComponent(target)}`);
  assert.equal(archive.status, 200);
  const archiveData = await archive.json();
  assert.equal(archiveData.ok, true);
  assert.equal(archiveData.snapshot.available, true);
  assert.equal(archiveData.snapshot.timestamp, "20200102030405");
  assert.equal(archiveData.provenance.rate_limit.scope, "archive");
});
