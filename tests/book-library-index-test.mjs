import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildBookLibrary } from "../scripts/book-library-index.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const { manifest, documents } = await buildBookLibrary(ROOT);

async function markdownPaths(directory, prefix = "") {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) paths.push(...await markdownPaths(path.join(directory, entry.name), relative));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) paths.push(relative);
  }
  return paths.sort();
}

test("Collections index covers every Harshal's Systems Markdown file", async () => {
  assert.equal(manifest.schema, "harshalos-book-library-v1");
  assert.equal(manifest.collectionCount, 7);
  assert.equal(manifest.moduleCount, 32);
  assert.equal(manifest.documentCount, 42);
  assert.equal(documents.length, 42);

  const sourceFiles = await markdownPaths(path.join(ROOT, "docs", "harshal-systems"));
  assert.deepEqual(documents.map(document => document.file).sort(), sourceFiles);
  assert.equal(new Set(documents.map(document => document.file)).size, documents.length, "every Markdown path is indexed exactly once");
  assert.equal(manifest.guides.length, 3, "the library guide, collections index, and editorial report are browsable");

  for (const document of documents) {
    assert.equal(document.url, `/book-library/harshal-systems/${document.file}`);
    assert.equal(document.githubUrl, `https://github.com/A44674928/HarshalOS/blob/main/docs/harshal-systems/${document.file}`);
  }
});

test("each collection exposes its overview and ordered modules with source metadata", () => {
  const core = manifest.collections.find(collection => collection.id === "01-foundations");
  assert.ok(core);
  assert.equal(core.title, "Collection I — Foundational Doctrine & Core Book");
  assert.equal(core.overview.file, "collections/01-foundations/README.md");
  assert.ok(core.description.includes("core thesis"));
  assert.equal(core.modules[0].file, "00-front-matter.md");
  const coreBook = core.modules.find(module => module.file === "01-core-book.md");
  assert.ok(coreBook);
  assert.equal(coreBook.title, "Part I — The Core Book");
  assert.equal(coreBook.provenance, "CANONICAL_SOURCE");
  assert.equal(coreBook.status, "CONCEPTUAL_DOCTRINE");
  assert.equal(coreBook.words, 8511);
  assert.ok(coreBook.githubUrl.endsWith("/docs/harshal-systems/01-core-book.md"));
});
