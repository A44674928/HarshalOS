/* ═══════════════════════════════════════════════════════════════
   HarshalOS — manuscript index builder (shared by the preview server
   and the deploy-time asset staging step)

   A manuscript collection is one subfolder of manuscript/ holding
   plaintext chapter files. Nothing here is executable content: this
   module reads bytes, counts words, hashes files, and emits a manifest
   the browser can read. It never imports or evaluates a manuscript.

   Rules (documented for the author in manuscript/README.md):
     · manuscript/<collection>/*.txt (and *.md) are chapters
     · names starting with "." or "_" and README* are not chapters
     · a leading number in the file name sets the chapter order
     · "_collection.json" in a collection folder may set title /
       subtitle / author / description

   Run directly for a human-readable index:
     node scripts/manuscript-index.mjs
   ═══════════════════════════════════════════════════════════════ */

import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const MANUSCRIPT_DIRNAME = "manuscript";
export const MANIFEST_SCHEMA = "harshalos-manuscript-v1";
export const MANIFEST_FILENAME = "manifest.json";
export const COLLECTION_METADATA_FILENAME = "_collection.json";
export const CHAPTER_EXTENSIONS = [".txt", ".md"];
const ORDER_PREFIX = /^(\d{1,4})[\s._-]+/;

const sha256 = value => createHash("sha256").update(value).digest("hex");

/** A file is a chapter when it is plaintext, not hidden, and not an index/README. */
export function isChapterFileName(name) {
  if (typeof name !== "string" || !name) return false;
  if (name.startsWith(".") || name.startsWith("_")) return false;
  if (/^readme(\.[a-z0-9]+)?$/i.test(name)) return false;
  const lower = name.toLowerCase();
  return CHAPTER_EXTENSIONS.some(extension => lower.endsWith(extension));
}

/** Numeric-aware, case-insensitive ordering so "2" sorts before "10". */
export function naturalCompare(a, b) {
  return String(a).localeCompare(String(b), "en", { numeric: true, sensitivity: "base" });
}

/** Explicit order from a leading number in the file name, or null. */
export function orderFromFileName(name) {
  const match = String(name).replace(/\.(txt|md)$/i, "").match(ORDER_PREFIX);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

/**
 * Derive a chapter title from the file name.
 *   · a lower-case slug is title-cased:  "03-the-grand-river.txt" → "The Grand River"
 *   · a name with its own capitalisation is preserved and only the first
 *     letter is raised:                 "04-About the River.txt" → "About the River"
 * (js/manuscript.js carries the same fallback for chapters opened without an index.)
 */
export function titleFromFileName(name) {
  const base = String(name).replace(/\.(txt|md)$/i, "");
  const withoutOrder = base.replace(ORDER_PREFIX, "");
  const words = withoutOrder.replace(/_+/g, " ").replace(/-+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return base;
  const authored = /[A-Z]/.test(withoutOrder);
  return words.map((word, index) => {
    if (authored && index > 0) return word;
    return word[0].toUpperCase() + word.slice(1);
  }).join(" ");
}

export function countWords(text) {
  const matches = String(text).match(/\S+/g);
  return matches ? matches.length : 0;
}

/** Strip a UTF-8 BOM; manuscript files written on Windows often carry one. */
export function decodeText(buffer) {
  const text = Buffer.isBuffer(buffer) ? buffer.toString("utf8") : String(buffer);
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

async function readCollectionMetadata(directory) {
  try {
    const raw = decodeText(await readFile(path.join(directory, COLLECTION_METADATA_FILENAME)));
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const pick = value => (typeof value === "string" && value.trim() ? value.trim() : null);
    return {
      title: pick(parsed.title),
      subtitle: pick(parsed.subtitle),
      author: pick(parsed.author),
      description: pick(parsed.description)
    };
  } catch {
    // A missing or malformed metadata file is not fatal; the folder name is used.
    return {};
  }
}

async function readCollection(directory, id) {
  const metadata = await readCollectionMetadata(directory);
  let entries = [];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    entries = [];
  }

  const chapters = [];
  for (const entry of entries) {
    if (!entry.isFile() || !isChapterFileName(entry.name)) continue;
    const buffer = await readFile(path.join(directory, entry.name));
    const text = decodeText(buffer);
    chapters.push({
      id: entry.name.replace(/\.(txt|md)$/i, ""),
      name: entry.name,
      file: `${MANUSCRIPT_DIRNAME}/${id}/${entry.name}`,
      title: titleFromFileName(entry.name),
      order: orderFromFileName(entry.name),
      bytes: buffer.byteLength,
      words: countWords(text),
      sha256: sha256(buffer)
    });
  }

  chapters.sort((a, b) => {
    const left = a.order === null ? Number.MAX_SAFE_INTEGER : a.order;
    const right = b.order === null ? Number.MAX_SAFE_INTEGER : b.order;
    if (left !== right) return left - right;
    return naturalCompare(a.name, b.name);
  });
  chapters.forEach((chapter, position) => { chapter.index = position + 1; });

  const words = chapters.reduce((sum, chapter) => sum + chapter.words, 0);
  const bytes = chapters.reduce((sum, chapter) => sum + chapter.bytes, 0);
  return {
    id,
    book: metadata.book || null,
    status: metadata.status || null,
    provenance: metadata.provenance || null,
    setting: metadata.setting || null,
    canonicalCompanion: metadata.canonicalCompanion || null,
    title: metadata.title || titleFromFileName(id),
    subtitle: metadata.subtitle || null,
    author: metadata.author || null,
    description: metadata.description || null,
    chapterCount: chapters.length,
    words,
    bytes,
    // A content digest over the chapter hashes. It identifies this exact
    // manuscript state; it is not a signature and authenticates nothing.
    digest: sha256(chapters.map(chapter => chapter.sha256).join("\n")),
    chapters
  };
}

/**
 * Build the manuscript manifest for a checkout root.
 * Missing manuscript/ or an empty folder yields a valid empty manifest.
 */
export async function buildManifest(root = process.cwd(), { directory = MANUSCRIPT_DIRNAME } = {}) {
  const base = path.join(root, directory);
  let entries = [];
  try {
    entries = await readdir(base, { withFileTypes: true });
  } catch {
    entries = [];
  }

  const collections = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name.startsWith("_")) continue;
    collections.push(await readCollection(path.join(base, entry.name), entry.name));
  }
  collections.sort((a, b) => naturalCompare(a.id, b.id));

  const chapters = collections.flatMap(collection => collection.chapters);
  return {
    schema: MANIFEST_SCHEMA,
    manuscript: {
      collections: collections.length,
      chapters: chapters.length,
      words: collections.reduce((sum, collection) => sum + collection.words, 0),
      bytes: collections.reduce((sum, collection) => sum + collection.bytes, 0)
    },
    digest: sha256(collections.map(collection => collection.digest).join("\n")),
    collections
  };
}

export function serializeManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function collectionById(manifest, id) {
  if (!manifest || !Array.isArray(manifest.collections)) return null;
  return manifest.collections.find(collection => collection.id === id) || null;
}

/**
 * Resolve one chapter file for serving. Returns null unless the request
 * names a public chapter of a known collection — no arbitrary file reads.
 */
export async function readChapter(root, collectionId, fileName) {
  if (typeof collectionId !== "string" || typeof fileName !== "string") return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(collectionId)) return null;
  if (!isChapterFileName(fileName) || fileName.includes("/") || fileName.includes("\\")) return null;
  const manifest = await buildManifest(root);
  const collection = collectionById(manifest, collectionId);
  if (!collection || !collection.chapters.some(chapter => chapter.name === fileName)) return null;
  try {
    return decodeText(await readFile(path.join(root, MANUSCRIPT_DIRNAME, collectionId, fileName)));
  } catch {
    return null;
  }
}

/** Relative paths of every public manuscript file, for asset staging. */
export async function publicManuscriptFiles(root = process.cwd()) {
  const manifest = await buildManifest(root);
  return manifest.collections.flatMap(collection => collection.chapters.map(chapter => chapter.file));
}

export function formatManifestSummary(manifest) {
  const lines = [`${manifest.schema} · ${manifest.manuscript.chapters} chapter(s) in ${manifest.manuscript.collections} collection(s)`];
  for (const collection of manifest.collections) {
    lines.push(`  ${collection.id} — ${collection.title} (${collection.chapterCount} chapter(s), ${collection.words} words)`);
    for (const chapter of collection.chapters) {
      lines.push(`    ${String(chapter.index).padStart(3, " ")}. ${chapter.title} · ${chapter.words} words · ${chapter.sha256.slice(0, 12)}`);
    }
  }
  lines.push(`  manifest digest ${manifest.digest}`);
  return lines.join("\n");
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  const root = path.resolve(process.argv[2] || process.cwd());
  console.log(formatManifestSummary(await buildManifest(root)));
}
