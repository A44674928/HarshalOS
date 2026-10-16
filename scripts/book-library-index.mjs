/* Build the public The Book → Collections catalog from the repository's
   collection indexes. Every Markdown file under docs/harshal-systems must be
   catalogued, so new documents cannot silently disappear from the reader. */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const BOOK_LIBRARY_SOURCE = "docs/harshal-systems";
export const BOOK_LIBRARY_PUBLIC_ROOT = "/book-library/harshal-systems";
export const BOOK_LIBRARY_MANIFEST = "/book-library/manifest.json";
export const BOOK_LIBRARY_GITHUB_ROOT = "https://github.com/A44674928/HarshalOS/blob/main/docs/harshal-systems";

const toPosix = value => value.split(path.sep).join("/");
const encodePath = value => value.split("/").map(encodeURIComponent).join("/");
const markdownTitle = source => source.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim() || "Untitled document";
const firstCode = value => value.match(/`([^`]+)`/)?.[1] || "";

async function markdownFiles(directory, relativeTo) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symbolic links are not allowed in the public Book library: ${absolute}`);
    if (entry.isDirectory()) files.push(...await markdownFiles(absolute, relativeTo));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) files.push(toPosix(path.relative(relativeTo, absolute)));
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function makeDocument({ file, title, kind, collectionId = "", collectionTitle = "", provenance = "", status = "", evidence = "", words = 0 }) {
  const safeFile = toPosix(file);
  return {
    file: safeFile,
    title: title || "Untitled document",
    kind,
    collectionId,
    collectionTitle,
    provenance,
    status,
    evidence,
    words: Number(words) || 0,
    url: `${BOOK_LIBRARY_PUBLIC_ROOT}/${encodePath(safeFile)}`,
    githubUrl: `${BOOK_LIBRARY_GITHUB_ROOT}/${encodePath(safeFile)}`
  };
}

function parseModuleRows(source, collectionDirectory, sourceDirectory, collection) {
  const modules = [];
  for (const line of source.split(/\r?\n/)) {
    if (!/^\|/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map(cell => cell.trim());
    const idMatch = cells[0]?.match(/^`([^`]+)`$/);
    const linkMatch = cells[1]?.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!idMatch || !linkMatch) continue;

    const absolute = path.resolve(collectionDirectory, linkMatch[2]);
    const relativeFromSource = path.relative(sourceDirectory, absolute);
    if (relativeFromSource.startsWith(`..${path.sep}`) || relativeFromSource === ".." || path.isAbsolute(relativeFromSource)) {
      throw new Error(`Collection module escapes ${BOOK_LIBRARY_SOURCE}: ${linkMatch[2]}`);
    }
    const file = toPosix(relativeFromSource);
    const wordsMatch = cells[4]?.match(/\(([0-9,]+)\s+words?\)/i);
    modules.push(makeDocument({
      file,
      title: linkMatch[1],
      kind: "module",
      collectionId: collection.id,
      collectionTitle: collection.title,
      provenance: firstCode(cells[2] || ""),
      status: firstCode(cells[3] || ""),
      evidence: firstCode(cells[4] || ""),
      words: wordsMatch ? Number(wordsMatch[1].replaceAll(",", "")) : 0
    }));
  }
  return modules;
}

export async function buildBookLibrary(root) {
  const sourceDirectory = path.resolve(root, BOOK_LIBRARY_SOURCE);
  const guideDefinitions = [
    { file: "README.md", title: "Library guide" },
    { file: "collections/README.md", title: "Functional collections index" },
    { file: "EDITORIAL-REPORT.md", title: "Editorial report" },
    { file: "TERMINOLOGY-ERRATUM-2026-10-16.md", title: "Terminology erratum (AGS v0.2 Part XI)" }
  ];
  const guides = [];
  for (const guide of guideDefinitions) {
    const absolute = path.join(sourceDirectory, ...guide.file.split("/"));
    const text = await readFile(absolute, "utf8");
    guides.push(makeDocument({ file: guide.file, title: guide.title, kind: "guide" }));
    if (!text.trim()) throw new Error(`Book library guide is empty: ${guide.file}`);
  }

  const collectionRoot = path.join(sourceDirectory, "collections");
  const entries = await readdir(collectionRoot, { withFileTypes: true });
  const directories = entries.filter(entry => entry.isDirectory() && /^\d{2}-[a-z0-9-]+$/.test(entry.name)).sort((a, b) => a.name.localeCompare(b.name));
  const collections = [];

  for (const entry of directories) {
    const directory = path.join(collectionRoot, entry.name);
    const readmePath = path.join(directory, "README.md");
    const source = await readFile(readmePath, "utf8");
    const id = source.match(/^\*\*Collection ID:\*\*\s*`([^`]+)`/m)?.[1];
    const title = markdownTitle(source);
    const researchLayer = source.match(/^\*\*Primary Research Layer:\*\*\s*`([^`]+)`/m)?.[1] || "";
    const description = source.match(/^>\s*(.+)$/m)?.[1]?.trim() || "";
    if (!id || id !== entry.name) throw new Error(`Collection ID must match its directory: ${entry.name}`);

    const overview = makeDocument({
      file: `collections/${entry.name}/README.md`,
      title: "Collection overview",
      kind: "overview",
      collectionId: id,
      collectionTitle: title
    });
    const modules = parseModuleRows(source, directory, sourceDirectory, { id, title });
    for (const module of modules) await readFile(path.join(sourceDirectory, ...module.file.split("/")));
    collections.push({ id, title, researchLayer, description, overview, moduleCount: modules.length, modules });
  }

  if (!collections.length) throw new Error("No functional collections were found in docs/harshal-systems/collections.");
  const documents = [
    ...guides,
    ...collections.flatMap(collection => [collection.overview, ...collection.modules])
  ];
  const listed = documents.map(document => document.file);
  const duplicates = listed.filter((file, index) => listed.indexOf(file) !== index);
  if (duplicates.length) throw new Error(`Book library documents appear more than once: ${[...new Set(duplicates)].join(", ")}`);

  const allMarkdown = await markdownFiles(sourceDirectory, sourceDirectory);
  const listedSet = new Set(listed);
  const allSet = new Set(allMarkdown);
  const unindexed = allMarkdown.filter(file => !listedSet.has(file));
  const missing = listed.filter(file => !allSet.has(file));
  if (unindexed.length || missing.length) {
    throw new Error([
      unindexed.length ? `Unindexed Markdown files: ${unindexed.join(", ")}` : "",
      missing.length ? `Catalog entries without source files: ${missing.join(", ")}` : ""
    ].filter(Boolean).join("; "));
  }

  const manifest = {
    schema: "harshalos-book-library-v1",
    repository: "A44674928/HarshalOS",
    sourceDirectory: BOOK_LIBRARY_SOURCE,
    documentCount: documents.length,
    collectionCount: collections.length,
    moduleCount: collections.reduce((count, collection) => count + collection.moduleCount, 0),
    guides,
    collections
  };
  return { manifest, documents };
}

export function serializeBookLibrary(manifest) {
  return JSON.stringify(manifest, null, 2) + "\n";
}
