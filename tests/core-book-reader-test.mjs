import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const sourcePath = path.join(ROOT, "docs", "harshal-systems", "01-core-book.md");
const readerSource = await readFile(path.join(ROOT, "js", "core-book-reader.js"), "utf8");
const sandbox = { globalThis: {} };
vm.runInNewContext(readerSource, sandbox, { filename: "core-book-reader.js" });
const reader = sandbox.globalThis.CoreBookReader;

test("Core Book reader renders the selected source and retains its canonical metadata", async () => {
  const source = await readFile(sourcePath, "utf8");
  const result = reader.renderMarkdown(source);

  assert.equal(result.title, "Part I — The Core Book");
  assert.equal(result.part, "Part I");
  assert.equal(result.provenance, "CANONICAL_SOURCE");
  assert.equal(result.status, "CONCEPTUAL_DOCTRINE");
  assert.equal(result.words, 8511);
  assert.ok(result.sections >= 100, "the chapter and subsection headings are rendered");
  assert.match(result.html, /core-book-table/);
  assert.match(result.html, /core-book-callout/);
  assert.match(result.html, /Ownership Is Not Possession/);
  assert.doesNotMatch(result.html, /<script\b/i);
});

test("Core Book Markdown formatting is safe for untrusted markup and links", () => {
  const fixture = `---
title: Safe Fixture
part: Part I
status_taxonomy: TEST_DOCTRINE
words: 7
---
# Safe Fixture

## Formatting

Text with **bold**, *italic*, and \`<tag>\` inline.

- first item
- second item

1. first ordered item
2. second ordered item

> [!IMPORTANT]
> <script>alert(1)</script> is text.

| left | right |
| --- | --- |
| value | <img src=x onerror=attack()> |

[external](https://example.com/path) and [unsafe](javascript:alert(1)).
`;
  const result = reader.renderMarkdown(fixture);

  assert.match(result.html, /<strong>bold<\/strong>/);
  assert.match(result.html, /<em>italic<\/em>/);
  assert.match(result.html, /&lt;tag&gt;/);
  assert.match(result.html, /<ul class="core-book-list">/);
  assert.match(result.html, /<ol class="core-book-list">/);
  assert.match(result.html, /core-book-callout/);
  assert.match(result.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(result.html, /&lt;img src=x onerror=attack\(\)&gt;/);
  assert.match(result.html, /href="https:\/\/example\.com\/path" target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(result.html, /href="javascript:/i);
  assert.doesNotMatch(result.html, /<script\b|<img\b/i);
});
