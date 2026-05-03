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

test("local server exposes ping and wait-tab handoff routes", async (t) => {
  const port = 8879;
  const cwd = path.resolve(__dirname, "..");
  const server = spawn(process.execPath, ["server.js"], {
    cwd,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server start timeout")), 5000);
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

  const post = await fetch(`http://127.0.0.1:${port}/api/status`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: "tok", engine: "lens", status: "uploading", url: "https://example.com/a.jpg" }),
  });
  assert.equal(post.status, 200);
  assert.deepEqual(await post.json(), { ok: true });

  const get = await fetch(`http://127.0.0.1:${port}/api/status?token=tok&engine=lens`);
  assert.equal(get.status, 200);
  const data = await get.json();
  assert.equal(data.ok, true);
  assert.equal(data.status, "uploading");
  assert.equal(data.url, "https://example.com/a.jpg");
  assert.equal(typeof data.ts, "number");
});
