const test = require("node:test");
const assert = require("node:assert/strict");

const { reverseSearchUrl, reverseSearchUploadPage } = require("../osint-lib.js");
const { extractEntities, normalizePhone, phoneCountryHint } = require("../ocr-pipeline.js");

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

test("extractEntities enriches OCR text with people orgs places dates aliases and offsets", () => {
  const t = [
    "John Doe met Jane Smith at North Harbor Station on March 4, 2024.",
    "Contoso Media LLC filed the note in Seattle City.",
    'Alias: "abyss_watch" aka abyss_watch',
  ].join("\n");

  const ent = extractEntities(t);
  assert.ok(ent.people.includes("John Doe"));
  assert.ok(ent.people.includes("Jane Smith"));
  assert.ok(ent.organizations.includes("Contoso Media LLC"));
  assert.ok(ent.locations.includes("North Harbor Station"));
  assert.ok(ent.locations.includes("Seattle City"));
  assert.ok(ent.dates.includes("2024-03-04"));
  assert.ok(ent.aliases.includes("abyss_watch"));
  assert.ok(Array.isArray(ent.details.people));
  assert.ok(ent.details.people[0].offsets.length >= 1);
  assert.ok(ent.spans.some((span) => span.type === "organizations"));
});

test("normalizePhone returns E.164 region plausibility and confidence", () => {
  const intl = normalizePhone("+1 (415) 555-1234");
  assert.equal(intl.e164, "+14155551234");
  assert.equal(intl.region, "US/CA");
  assert.equal(intl.plausible, true);
  assert.match(String(intl.confidence), /^0\./);
  assert.match(phoneCountryHint(intl.e164), /US\/CA/);

  const national = normalizePhone("020 7946 0958");
  assert.equal(national.e164, "+442079460958");
  assert.equal(national.region, "GB");
  assert.equal(national.plausible, true);
});
