const test = require("node:test");
const assert = require("node:assert/strict");

const { reverseSearchUrl, reverseSearchUploadPage } = require("../osint-lib.js");
const { extractEntities } = require("../ocr-pipeline.js");

test("reverseSearchUrl builds expected engine URLs", () => {
  const url = "https://example.com/a b.jpg?x=1&y=2";
  assert.equal(
    reverseSearchUrl("lens", url),
    `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}`,
  );
  assert.equal(
    reverseSearchUrl("tineye", url),
    `https://tineye.com/search?url=${encodeURIComponent(url)}`,
  );
  assert.equal(reverseSearchUrl("nope", url), "");
});

test("reverseSearchUploadPage returns engine upload pages", () => {
  assert.equal(reverseSearchUploadPage("lens"), "https://lens.google.com/upload");
  assert.equal(reverseSearchUploadPage("bing"), "https://www.bing.com/visualsearch");
  assert.equal(reverseSearchUploadPage("nope"), "about:blank");
});

test("extractEntities pulls urls/emails/handles/phones", () => {
  const t =
    "Contact: hello@example.com @some_user https://example.com/path and www.test.com\n" +
    "Phone: +1 (415) 555-1234 and 020 7946 0958";

  const ent = extractEntities(t);
  assert.deepEqual(ent.emails, ["hello@example.com"]);
  assert.deepEqual(ent.handles, ["@some_user"]);
  assert.ok(ent.urls.some((u) => u === "https://example.com/path"));
  assert.ok(ent.urls.some((u) => u === "https://www.test.com"));
  assert.ok(ent.phones.length >= 2);
});

