const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const workflow = fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", "test.yml"), "utf8");

test("GitHub Actions runs npm test on push and pull request", () => {
  assert.match(workflow, /on:\s*\n\s*push:/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /uses: actions\/checkout@v4/);
  assert.match(workflow, /uses: actions\/setup-node@v4/);
  assert.match(workflow, /run: npm test/);
});
