/* Manuscript pipeline tests: the shared index builder, the browser reader's
   plaintext parser, and the preview server's manuscript routes.
   Run: node tests/manuscript-test.mjs */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import {
  buildManifest,
  countWords,
  isChapterFileName,
  naturalCompare,
  orderFromFileName,
  readChapter,
  serializeManifest,
  titleFromFileName
} from "../scripts/manuscript-index.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const COLLECTION = "the-grand-river-foundation";
const readerSource = await readFile(path.join(ROOT, "js", "manuscript.js"), "utf8");

function readerHarness() {
  const window = {};
  const context = vm.createContext({ window, console, encodeURI, Number, String, JSON, Math });
  vm.runInContext(readerSource, context, { filename: "js/manuscript.js" });
  return window.ManuscriptReader;
}

async function withFixture(files, run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hos-manuscript-"));
  try {
    for (const [relative, contents] of Object.entries(files)) {
      const target = path.join(root, relative);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, contents);
    }
    return await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

function waitForPreview(child) {
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", chunk => { stdout += chunk; });
  child.stderr.setEncoding("utf8").on("data", chunk => { stderr += chunk; });
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`preview server did not start; stderr: ${stderr}`)), 5000);
    const ready = () => {
      if (!stdout.includes("HarshalOS static server")) return;
      clearTimeout(timeout);
      resolve();
    };
    child.stdout.on("data", ready);
    child.once("error", error => { clearTimeout(timeout); reject(error); });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(`preview server exited before listening (${code ?? signal}); stderr: ${stderr}`));
    });
  });
}

test("only plaintext chapters are published as chapters", () => {
  for (const name of ["01-the-arrival.txt", "prologue.md", "Chapter Two.TXT", "a b c.txt"]) {
    assert.equal(isChapterFileName(name), true, `${name} is a chapter`);
  }
  for (const name of ["_collection.json", ".hidden.txt", "README.md", "readme.txt", "cover.docx", "notes.rtf", "draft.txt.bak", ""]) {
    assert.equal(isChapterFileName(name), false, `${name} is not a chapter`);
  }
});

test("chapter titles and order come from the file name, preserving author capitalisation", () => {
  assert.equal(titleFromFileName("03-the-grand-river.txt"), "The Grand River");
  assert.equal(titleFromFileName("02_the_river_remembers.md"), "The River Remembers");
  assert.equal(titleFromFileName("prologue.txt"), "Prologue");
  assert.equal(titleFromFileName("04-About the River.txt"), "About the River");
  assert.equal(orderFromFileName("10-ten.txt"), 10);
  assert.equal(orderFromFileName("2-two.txt"), 2);
  assert.equal(orderFromFileName("prologue.txt"), null);
  assert.ok(naturalCompare("2-two.txt", "10-ten.txt") < 0, "natural order puts 2 before 10");
  assert.equal(countWords("  one two\nthree  "), 3);
});

test("a fixture collection is ordered by its file names and every chapter is hashed", async () => {
  await withFixture({
    "manuscript/the-great-test/10-ten.txt": "Ten.\n",
    "manuscript/the-great-test/2-two.txt": "\uFEFFTwo, with a byte-order mark.\n",
    "manuscript/the-great-test/03-three.txt": "Three.\n",
    "manuscript/the-great-test/prologue.md": "# A Prologue\n\nText.\n",
    "manuscript/the-great-test/_draft.txt": "Not published.\n",
    "manuscript/the-great-test/cover.docx": "binary-ish",
    "manuscript/the-great-test/README.md": "Not a chapter.\n",
    "manuscript/the-great-test/_collection.json": JSON.stringify({ title: "The Great Test", subtitle: "Fixture" })
  }, async root => {
    const manifest = await buildManifest(root);
    assert.equal(manifest.schema, "harshalos-manuscript-v1");
    assert.equal(manifest.collections.length, 1);
    const collection = manifest.collections[0];
    assert.equal(collection.id, "the-great-test");
    assert.equal(collection.title, "The Great Test");
    assert.equal(collection.subtitle, "Fixture");
    assert.deepEqual(collection.chapters.map(chapter => chapter.name), [
      "2-two.txt", "03-three.txt", "10-ten.txt", "prologue.md"
    ]);
    assert.deepEqual(collection.chapters.map(chapter => chapter.index), [1, 2, 3, 4]);
    assert.equal(collection.chapters[0].title, "Two");
    assert.equal(collection.words, collection.chapters.reduce((sum, chapter) => sum + chapter.words, 0));

    const two = collection.chapters[0];
    const bytes = await readFile(path.join(root, two.file));
    assert.equal(two.sha256, createHash("sha256").update(bytes).digest("hex"), "the index hashes the file bytes as committed");
    assert.match(manifest.digest, /^[0-9a-f]{64}$/);
    assert.match(serializeManifest(manifest), /"schema": "harshalos-manuscript-v1"/);
  });
});

test("a missing or empty manuscript folder is a valid empty index, never an error", async () => {
  await withFixture({ "README.md": "no manuscript here\n" }, async root => {
    const manifest = await buildManifest(root);
    assert.deepEqual(manifest.collections, []);
    assert.equal(manifest.manuscript.chapters, 0);
    assert.match(manifest.digest, /^[0-9a-f]{64}$/);
  });
});

test("readChapter serves indexed chapters only", async () => {
  const text = await readChapter(ROOT, COLLECTION, "01-sample-chapter.txt");
  assert.match(text, /The Grand River Foundation/);
  for (const [collectionId, name] of [
    [COLLECTION, "_collection.json"],
    [COLLECTION, "README.md"],
    [COLLECTION, "../serve.js"],
    [COLLECTION, "99-not-a-chapter.txt"],
    ["..", "01-sample-chapter.txt"],
    ["../scripts", "manuscript-index.mjs"]
  ]) {
    assert.equal(await readChapter(ROOT, collectionId, name), null, `${collectionId}/${name} must not resolve`);
  }
});

test("the reader parses plaintext into blocks and escapes everything it renders", () => {
  const reader = readerHarness();
  const parsed = reader.parseChapter([
    "# The Arrival",
    "",
    "A first line that wraps",
    "onto a second line.",
    "",
    "***",
    "",
    "## A Section",
    "",
    "> Quoted words.",
    "",
    "Safe <script>alert(1)</script> & *emphasis* and **weight**."
  ].join("\n"));

  /* Blocks come from a vm realm, so compare their text, not their prototypes. */
  assert.equal(parsed.title, "The Arrival");
  assert.equal(parsed.blocks.map(block => block.type).join(","), "p,break,heading,quote,p");
  assert.equal(parsed.blocks[0].text, "A first line that wraps onto a second line.");
  assert.equal(parsed.blocks[2].text, "A Section");
  assert.equal(parsed.blocks[3].text, "Quoted words.");
  assert.ok(parsed.words >= 20);

  const html = reader.blocksHtml(parsed.blocks);
  assert.ok(!html.includes("<script>"), "manuscript markup is escaped, not executed");
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(html.includes("<em>emphasis</em>") && html.includes("<strong>weight</strong>"));
  assert.ok(html.includes('class="ms-break"'));

  const untitled = reader.parseChapter("Just a paragraph.\n\nAnd another one.\n");
  assert.equal(untitled.title, null);
  assert.equal(untitled.blocks.map(block => block.type).join(","), "p,p");
  assert.equal(reader.parseChapter("").blocks.length, 0);
  assert.equal(reader.parseChapter(undefined).blocks.length, 0);
});

test("the preview server publishes the generated index and indexed chapters only", async () => {
  const port = await reservePort();
  const child = spawn(process.execPath, ["serve.js"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  try {
    await waitForPreview(child);
    const base = `http://127.0.0.1:${port}`;

    const manifestResponse = await fetch(`${base}/manuscript/manifest.json`);
    assert.equal(manifestResponse.status, 200);
    assert.match(manifestResponse.headers.get("content-type"), /application\/json/);
    const manifest = await manifestResponse.json();
    assert.equal(manifest.schema, "harshalos-manuscript-v1");
    assert.ok(manifest.collections.some(collection => collection.id === COLLECTION));

    const chapterResponse = await fetch(`${base}/manuscript/${COLLECTION}/01-sample-chapter.txt`);
    assert.equal(chapterResponse.status, 200);
    assert.match(chapterResponse.headers.get("content-type"), /text\/plain/);
    assert.match(await chapterResponse.text(), /The Grand River Foundation/);

    for (const pathname of [
      `/manuscript/${COLLECTION}/_collection.json`,
      "/manuscript/README.md",
      `/manuscript/${COLLECTION}/99-nope.txt`,
      "/manuscript/../README.md",
      "/docs/REPOSITORY-STRUCTURE.md",
      "/scripts/manuscript-index.mjs"
    ]) {
      const response = await fetch(`${base}${pathname}`);
      assert.equal(response.status, 404, `${pathname} must stay outside the public preview allowlist`);
    }
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const stopped = once(child, "exit").catch(() => {});
      child.kill("SIGTERM");
      await stopped;
    }
  }
});
