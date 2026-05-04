const test = require("node:test");
const assert = require("node:assert/strict");
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
