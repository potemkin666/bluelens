const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");

const {
  buildSearchQuerySpecs,
  buildEntityGraph,
  buildInvestigationTimeline,
  collectLogoLookupCandidates,
  extractPivotsFromReport,
  hammingHex,
  inferDocumentKinds,
  parseDimensions,
  parseFilenameStem,
  sortBatchItems,
  summarizeDocumentLayout,
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

test("document helpers summarize layout, infer document kinds, and collect logo candidates", () => {
  const text = [
    "CITY MENU",
    "",
    "Name: Alex Example",
    "Date: 2024-05-01",
    "Burger      $12.00",
    "Subtotal    $12.00",
  ].join("\n");

  const layout = summarizeDocumentLayout(text);
  assert.equal(layout.line_count, 5);
  assert.ok(layout.heading_candidates.includes("CITY MENU"));
  assert.ok(layout.key_value_rows.some((line) => line.includes("Name: Alex Example")));
  assert.ok(layout.tabular_rows.some((line) => line.includes("Subtotal")));

  const kinds = inferDocumentKinds({
    text: `${text}\nDessert\nAppetizers`,
    fileName: "dinner-menu.pdf",
    ent: { dates: ["2024-05-01", "2024-05-02"] },
  });
  assert.ok(kinds.includes("menu"));
  assert.ok(kinds.includes("pdf"));

  const logos = collectLogoLookupCandidates({
    text: "ACME FESTIVAL\nOfficial Poster",
    ent: { organizations: ["Acme Org"] },
    domains: ["events.example.org"],
    handles: ["@acmefest"],
  });
  assert.deepEqual(logos.slice(0, 4), ["Acme Org", "events.example.org", "acmefest", "ACME"]);
});

test("query generator specs combine OCR brands, locations, handles, filename, and dimensions", () => {
  assert.equal(parseFilenameStem("march_flyer-final.png"), "march flyer final");

  const specs = buildSearchQuerySpecs({
    text: "ACME FESTIVAL\nJOIN US THIS FRIDAY",
    fileName: "march_flyer-final.png",
    dimensions: "1080 × 1350",
    language: "English",
    ent: {
      organizations: ["Acme Festival"],
      locations: ["Berlin"],
    },
    handles: ["@acmefest"],
    domains: ["instagram.com"],
  });

  const labels = specs.map((spec) => spec.label);
  assert.ok(labels.includes("Brand + city"));
  assert.ok(labels.includes("OCR text + logo"));
  assert.ok(labels.includes("Object + language"));
  assert.ok(labels.includes("File name + dimensions"));
  assert.ok(labels.includes("Visible username + platform"));
  assert.ok(specs.some((spec) => spec.query.includes('"Acme Festival" "Berlin"')));
  assert.ok(specs.some((spec) => spec.query.includes('"@acmefest" instagram.com')));
});

test("investigation graph keeps file/entity provenance and evidence counts", () => {
  const graph = buildEntityGraph({
    reports: [
      {
        file: { name: "alpha.png" },
        ocr_text: "Contact @alpha via alpha@example.com on https://example.com/path",
        key_fields: {
          camera: "Test Camera",
          software: "Editor X",
          ocr_entities: {
            handles: ["@alpha"],
            emails: ["alpha@example.com"],
            urls: ["https://example.com/path"],
            phones: [],
            details: {
              handles: [{ value: "@alpha", offsets: [{ start: 8, end: 14, source: "handle_regex", raw: "@alpha", confidence: 0.94 }] }],
              emails: [{ value: "alpha@example.com", offsets: [{ start: 19, end: 36, source: "email_regex", raw: "alpha@example.com", confidence: 0.99 }] }],
              urls: [{ value: "https://example.com/path", offsets: [{ start: 40, end: 64, source: "url_regex", raw: "https://example.com/path", confidence: 0.99 }] }],
            },
          },
        },
        gps: { lat: 1.23456, lon: 2.34567 },
      },
      {
        file: { name: "bravo.png" },
        key_fields: {
          ocr_entities: {
            handles: ["@alpha"],
            emails: [],
            urls: [],
            phones: [],
            details: { handles: [{ value: "@alpha", offsets: [{ start: 0, end: 6, source: "handle_regex", raw: "@alpha", confidence: 0.94 }] }] },
          },
        },
      },
    ],
  });

  const handleNode = graph.nodes.find((node) => node.key === "handle:@alpha");
  assert.equal(graph.summary.file_nodes, 2);
  assert.ok(handleNode);
  assert.equal(handleNode.file_count, 2);
  assert.ok(handleNode.provenance[0].source);
  assert.ok(graph.edges.some((edge) => edge.target === "handle:@alpha" && edge.file_count >= 1));
});

test("investigation timeline separates claimed capture, acquisition, export, and analyst actions", () => {
  const timeline = buildInvestigationTimeline({
    reports: [
      {
        file: { name: "alpha.png" },
        generated_at: "2024-03-05T11:00:00Z",
        source_reliability: { when_obtained: "2024-03-05T10:15" },
        key_fields: {
          captured_at: {
            normalized: "2024-03-04T08:00:00",
            display: "2024-03-04T08:00:00 (timezone unknown)",
            has_timezone: false,
          },
          ocr_entities: {
            dates: ["2024-03-04"],
            details: {
              dates: [{ value: "2024-03-04", offsets: [{ source: "date_iso", raw: "2024-03-04", confidence: 0.96 }] }],
            },
          },
        },
        session_action_log: [{ ts: "2024-03-05T11:05:00Z", event: "annotated", detail: "note" }],
      },
    ],
    actionLog: [{ ts: "2024-03-05T11:06:00Z", event: "result_intake_ingested", detail: "2 lines" }],
    lastEngineRun: { ts: Date.parse("2024-03-05T10:30:00Z"), mode: "swarm", targets: { lens: "x" } },
    resultIntake: { last_ingested_at: "2024-03-05T11:07:00Z", entries: [{}, {}] },
  });

  const categories = new Set(timeline.events.map((event) => event.category));
  assert.ok(categories.has("claimed_capture"));
  assert.ok(categories.has("acquisition"));
  assert.ok(categories.has("launch"));
  assert.ok(categories.has("export"));
  assert.ok(categories.has("analyst_action"));
  assert.ok(timeline.events.some((event) => event.ambiguous));
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
  assert.ok(Array.isArray(doctorData.cdn_reachability));
  assert.ok(Array.isArray(doctorData.engine_availability));
  assert.ok(Array.isArray(doctorData.recent_upload_attempts));
  assert.equal(typeof doctorData.recommended_upload_host, "string");
  assert.equal(typeof doctorData.history?.upload_hosts, "object");

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
