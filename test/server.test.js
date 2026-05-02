const test = require("node:test");
const assert = require("node:assert/strict");

const {
  WAIT_STATUS,
  WAIT_STATUS_TTL_MS,
  cacheControlFor,
  createAppServer,
  isValidWaitToken,
  pruneWaitStatus,
  validateUploadRequest,
  waitKey,
} = require("../server.js");

test("validateUploadRequest accepts supported raster images", () => {
  const result = validateUploadRequest("sample.png", "image/png");
  assert.equal(result.ok, true);
  assert.equal(result.filename, "sample.png");
  assert.equal(result.mime, "image/png");
});

test("validateUploadRequest rejects unsupported inputs", () => {
  assert.equal(validateUploadRequest("sample.svg", "image/svg+xml").ok, false);
  assert.equal(validateUploadRequest("sample.txt", "text/plain").ok, false);
});

test("isValidWaitToken enforces stronger token format", () => {
  assert.equal(isValidWaitToken("short-token"), false);
  assert.equal(isValidWaitToken("0123456789abcdef0123456789abcdef"), true);
});

test("pruneWaitStatus drops expired wait records", () => {
  WAIT_STATUS.clear();
  WAIT_STATUS.set(waitKey("0123456789abcdef0123456789abcdef", "lens"), { ts: Date.now() - WAIT_STATUS_TTL_MS - 10 });
  WAIT_STATUS.set(waitKey("fedcba9876543210fedcba9876543210", "lens"), { ts: Date.now() });

  pruneWaitStatus();

  assert.equal(WAIT_STATUS.size, 1);
  assert.ok(WAIT_STATUS.has(waitKey("fedcba9876543210fedcba9876543210", "lens")));
  WAIT_STATUS.clear();
});

test("cacheControlFor uses no-store for HTML and short caching for assets", () => {
  assert.equal(cacheControlFor("/tmp/index.html"), "no-store");
  assert.equal(cacheControlFor("/tmp/app.js"), "public, max-age=300");
});

test("local server serves static files with security headers and handles HEAD", async (t) => {
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/wait.html`, { method: "HEAD" });

  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-security-policy")?.includes("default-src 'self'"), true);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(await res.text(), "");
});

test("status endpoint rejects invalid wait tokens", async (t) => {
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/status?token=bad&engine=lens`);
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, "invalid_status_key");
});
