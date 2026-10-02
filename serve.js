/* ═══════════════════════════════════════════════════════════════
   HarshalOS — local preview server (node serve.js)

   Why this exists: `python3 -m http.server` sends no cache headers,
   which let browsers heuristically cache stale engine builds during
   development (the black-square saga). This server sends:
     · "?v=…" URLs  → public, max-age=31536000, immutable
     · everything else → no-cache (always revalidate)
   and knows the right MIME type for .avif (the orb film frames).

   It also serves an allowlist, not the checkout. On a laptop that hardly
   matters; behind a preview proxy or on a shared network the port is
   reachable by other people, and this directory holds .git (a 754 MiB
   packfile and every credential-free-but-private commit), the Business Plan
   working documents, and private papers that .assetsignore says must never be
   published. So what is served here is exactly what the deployed site is —
   index.html, about.html, css/, js/, assets/, the versioned specs/ the
   Ground-0 app fetches at runtime, the selected Book I document at
   /book/01-core-book.md, the curated Harshal's Systems Markdown library at
   /book-library/, and the plaintext chapters of manuscript/ — everything
   else is a plain 404 that does not admit what exists.

   The manuscript index is not a checked-in file: it is built from the
   chapter files on request, so dropping a new .txt into
   manuscript/<collection>/ and reloading is the whole submission step.

   Not part of the deployed site — excluded in .assetsignore.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8000);

/* The manuscript index builder is ESM and shared with the deploy-time
   staging script, so it is imported once, lazily. */
let manuscriptIndex = null;
const loadManuscriptIndex = async () => {
  if (!manuscriptIndex) manuscriptIndex = await import("./scripts/manuscript-index.mjs");
  return manuscriptIndex;
};
let bookLibraryIndex = null;
const loadBookLibraryIndex = async () => {
  if (!bookLibraryIndex) bookLibraryIndex = await import("./scripts/book-library-index.mjs");
  return bookLibraryIndex;
};
/* The manifest is rebuilt from disk at most once every 1.5 s: long enough
   that a page load asking twice does not re-read every chapter, short enough
   that a saved edit appears on the next reload. */
let manifestCache = { at: 0, body: null };
const MANIFEST_TTL_MS = 1500;

async function manuscriptManifest() {
  const now = Date.now();
  if (manifestCache.body && now - manifestCache.at < MANIFEST_TTL_MS) return manifestCache.body;
  const { buildManifest, serializeManifest } = await loadManuscriptIndex();
  const body = serializeManifest(await buildManifest(ROOT));
  manifestCache = { at: now, body };
  return body;
}
let bookLibraryCache = { at: 0, body: null };
async function bookLibraryManifest() {
  const now = Date.now();
  if (bookLibraryCache.body && now - bookLibraryCache.at < MANIFEST_TTL_MS) return bookLibraryCache.body;
  const { buildBookLibrary, serializeBookLibrary } = await loadBookLibraryIndex();
  const { manifest } = await buildBookLibrary(ROOT);
  const body = serializeBookLibrary(manifest);
  bookLibraryCache = { at: now, body };
  return body;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".avif": "image/avif",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".flame": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2"
};

/* The deployed site, as a set of path patterns. Repository documents are
   exposed only through the selected Core Book route, the curated
   docs/harshal-systems collection library, and the versioned Ground-0 specs;
   unrelated docs/ paths remain private. Manuscript chapters are indexed. */
const BOOK_LIBRARY_MANIFEST_PATH = "/book-library/manifest.json";
const BOOK_LIBRARY_SOURCE_ROOT = path.resolve(ROOT, "docs", "harshal-systems");
const BOOK_LIBRARY_FILE_PATH = /^\/book-library\/harshal-systems\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.md$/;
const SERVED = [
  /^\/$/,                                   // index.html
  /^\/[A-Za-z0-9_-]+\.html$/,               // about.html and friends
  /^\/css\/[A-Za-z0-9._-]+$/,
  /^\/js\/[A-Za-z0-9._-]+$/,
  /^\/assets\/[A-Za-z0-9._/-]+$/,
  /^\/book\/01-core-book\.md$/,            // one explicitly selected source document
  /^\/book-library\/manifest\.json$/,
  BOOK_LIBRARY_FILE_PATH,                    // curated Markdown subtree only
  /^\/specs\/(?:normative\/[A-Za-z0-9._-]+\.(?:md|json)|draft\/[A-Za-z0-9._-]+\.md)$/,
  /^\/manuscript\/[A-Za-z0-9._/-]+$/      // manifest.json and public chapters only
];
const MANUSCRIPT_MANIFEST_PATH = "/manuscript/manifest.json";
const MANUSCRIPT_CHAPTER_PATH = /^\/manuscript\/([A-Za-z0-9][A-Za-z0-9._-]*)\/([A-Za-z0-9][A-Za-z0-9._-]*\.(?:txt|md))$/i;
/* `new URL` collapses "/../" before we ever see it, so a prefix check on the
   joined path is not enough on its own: "/../.git/config" arrives as
   "/.git/config", which is inside ROOT and would be served. Refuse any path
   with a dot segment first — .git, .DS_Store, .env, .wrangler. */
const hasDotSegment = value => value.split("/").some(segment => segment.startsWith("."));
const isServed = value => !hasDotSegment(value) && SERVED.some(pattern => pattern.test(value));

http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, "http://localhost");
    let p = decodeURIComponent(u.pathname);
    if (p.endsWith("/")) p += "index.html";
    if (!isServed(p)) {
      res.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
      res.end("404 " + p);
      return;
    }

    /* The manuscript index is generated from the chapter files; chapters are
       served only when the index names them, so a stray file dropped in the
       folder is not published by accident. */
    if (p === BOOK_LIBRARY_MANIFEST_PATH) {
      const body = await bookLibraryManifest();
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        "Cache-Control": "no-store"
      });
      res.end(body);
      return;
    }
    if (p.startsWith("/book-library/harshal-systems/")) {
      const relative = p.slice("/book-library/harshal-systems/".length);
      const file = path.resolve(BOOK_LIBRARY_SOURCE_ROOT, ...relative.split("/"));
      if (!file.startsWith(BOOK_LIBRARY_SOURCE_ROOT + path.sep) || !file.toLowerCase().endsWith(".md")) {
        res.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
        res.end("404 " + p);
        return;
      }
      try {
        const data = await fs.promises.readFile(file);
        res.writeHead(200, {
          "Content-Type": MIME[".md"],
          "Content-Length": data.length,
          "Cache-Control": "no-cache"
        });
        res.end(data);
      } catch {
        res.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
        res.end("404 " + p);
      }
      return;
    }
    if (p === MANUSCRIPT_MANIFEST_PATH) {
      const body = await manuscriptManifest();
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        "Cache-Control": "no-store"
      });
      res.end(body);
      return;
    }
    if (p.startsWith("/manuscript/")) {
      const chapterMatch = p.match(MANUSCRIPT_CHAPTER_PATH);
      let text = null;
      if (chapterMatch) {
        const { readChapter } = await loadManuscriptIndex();
        text = await readChapter(ROOT, chapterMatch[1], chapterMatch[2]);
      }
      if (text === null) {
        res.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
        res.end("404 " + p);
        return;
      }
      const payload = Buffer.from(text, "utf8");
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Length": payload.length,
        "Cache-Control": "no-cache"
      });
      res.end(payload);
      return;
    }

    const file = p === "/book/01-core-book.md"
      ? path.join(ROOT, "docs", "harshal-systems", "01-core-book.md")
      : path.normalize(path.join(ROOT, p));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end("forbidden"); return; }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 " + p);
        return;
      }
      const ext = path.extname(file).toLowerCase();
      const headers = {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Content-Length": data.length
      };
      if (u.search) headers["Cache-Control"] = "public, max-age=31536000, immutable";
      else headers["Cache-Control"] = "no-cache";
      res.writeHead(200, headers);
      res.end(data);
    });
  } catch (e) {
    res.writeHead(500);
    res.end("500");
  }
}).listen(PORT, "0.0.0.0", () => {
  console.log("HarshalOS static server — http://0.0.0.0:" + PORT);
  console.log("  ?v=… → immutable long-cache · else no-cache · avif MIME enabled");
});
