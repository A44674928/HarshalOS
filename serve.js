/* ═══════════════════════════════════════════════════════════════
   HarshalOS — local preview server (node serve.js)

   Why this exists: `python3 -m http.server` sends no cache headers,
   which let browsers heuristically cache stale engine builds during
   development (the black-square saga). This server sends:
     · "?v=…" URLs  → public, max-age=31536000, immutable
     · everything else → no-cache (always revalidate)
   and knows the right MIME types for .avif and the named OUTPOST ONE media/data assets.

   It also serves an allowlist, not the checkout. On a laptop that hardly
   matters; behind a preview proxy or on a shared network the port is
   reachable by other people, and this directory holds .git (a 754 MiB
   packfile and every credential-free-but-private commit), the business plan
   working documents, and private papers that .assetsignore keeps out of the
   site bundle. The named OUTPOST ONE app and its explicitly listed runtime
   media/site files are the only project-package exception. What is served is
   the deployed asset allowlist: index.html, about.html, Community pages,
   css/, js/, assets/, versioned specs, selected Book I/library routes,
   indexed manuscript chapters, read-only trade files, and named /private/*
   and /terrain/* project routes. Everything else is a plain 404. Project
   content relies on Cloudflare Access at the hosting edge; this local server
   does not provide authentication.

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
  ".apng": "image/apng",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".flame": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/geo+json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".mp4": "video/mp4",
  ".zip": "application/zip",
  ".woff2": "font/woff2"
};

/* The deployed site, as a set of path patterns. Repository documents are
   exposed only through the selected Core Book route, the curated
   docs/harshal-systems collection library, and the versioned Ground-0 specs;
   unrelated docs/ paths remain private. Manuscript chapters are indexed. */
const BOOK_LIBRARY_MANIFEST_PATH = "/book-library/manifest.json";
const BOOK_LIBRARY_SOURCE_ROOT = path.resolve(ROOT, "docs", "harshal-systems");
const BOOK_LIBRARY_FILE_PATH = /^\/book-library\/harshal-systems\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.md$/;
const OUTPOST_SOURCE_ROOT = path.join(ROOT, "single-parcel-APN30055004", "terrain_preliminary");
const OUTPOST_ASSETS = new Map([
  ["/private/outpost-one-best-wishes-3d-film.mp4", path.join(OUTPOST_SOURCE_ROOT, "best-wishes-edition", "frontiership-outpost-one-best-wishes-3d.mp4")],
  ["/private/outpost-one-best-wishes-3d-poster.png", path.join(OUTPOST_SOURCE_ROOT, "best-wishes-edition", "frontiership-outpost-one-best-wishes-3d-poster.png")],
  ["/private/outpost-one-best-wishes-guide.md", path.join(OUTPOST_SOURCE_ROOT, "best-wishes-edition", "BEST_WISHES_EDITION_GUIDE.md")],
  ["/private/outpost-one-full-feature-film.mp4", path.join(OUTPOST_SOURCE_ROOT, "outpost-one-full-feature-film.mp4")],
  ["/private/outpost-one-full-feature-poster.png", path.join(OUTPOST_SOURCE_ROOT, "outpost-one-full-feature-poster.png")],
  ["/private/outpost-one-feature-film-guide.md", path.join(OUTPOST_SOURCE_ROOT, "OUTPOST_ONE_FEATURE_FILM_GUIDE.md")],
  ["/private/outpost-one-concept-model.zip", path.join(OUTPOST_SOURCE_ROOT, "outpost-one-concept-model.zip")],
  ["/terrain/index.html", path.join(OUTPOST_SOURCE_ROOT, "index.html")],
  ["/terrain/README.md", path.join(OUTPOST_SOURCE_ROOT, "README.md")],
  ["/terrain/epqs_samples.csv", path.join(OUTPOST_SOURCE_ROOT, "epqs_samples.csv")],
  ["/terrain/parcel_outline.geojson", path.join(OUTPOST_SOURCE_ROOT, "parcel_outline.geojson")]
]);
const SERVED = [
  /^\/$/,                                   // index.html
  /^\/[A-Za-z0-9_-]+\.html$/,               // about.html and friends
  /^\/css\/[A-Za-z0-9._-]+$/,
  /^\/js\/[A-Za-z0-9._-]+$/,
  /^\/assets\/[A-Za-z0-9._/-]+$/,
  /^\/private\/(?:outpost-one-best-wishes-3d-film\.mp4|outpost-one-best-wishes-3d-poster\.png|outpost-one-best-wishes-guide\.md|outpost-one-full-feature-film\.mp4|outpost-one-full-feature-poster\.png|outpost-one-feature-film-guide\.md|outpost-one-concept-model\.zip)$/,
  /^\/terrain\/(?:index\.html|README\.md|epqs_samples\.csv|parcel_outline\.geojson)$/,
  /^\/book\/01-core-book\.md$/,            // one explicitly selected source document
  /^\/book-library\/manifest\.json$/,
  BOOK_LIBRARY_FILE_PATH,                    // curated Markdown subtree only
  /^\/specs\/(?:normative\/[A-Za-z0-9._-]+\.(?:md|json)|draft\/[A-Za-z0-9._-]+\.md)$/,
  /^\/manuscript\/[A-Za-z0-9._/-]+$/,     // manifest.json and public chapters only
  /^\/trades\/[A-Za-z0-9][A-Za-z0-9._-]*\.txt$/ // public index and ticker logs
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
    // Cloudflare handles Worker-first Community routes in production. Keep the
    // canonical extensionless Community URLs usable in this deliberately static
    // local preview too; they expose only the same allowlisted HTML shells.
    if (p === "/account" || p === "/audits" || p === "/observations") p += ".html";
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

    const file = OUTPOST_ASSETS.get(p) || (p === "/book/01-core-book.md"
      ? path.join(ROOT, "docs", "harshal-systems", "01-core-book.md")
      : path.normalize(path.join(ROOT, p)));
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end("forbidden"); return; }
    let stat;
    try { stat = await fs.promises.stat(file); }
    catch {
      res.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
      res.end("404 " + p);
      return;
    }
    if (!stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
      res.end("404 " + p);
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const baseHeaders = {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": u.search ? "public, max-age=31536000, immutable" : "no-cache",
      ...(ext === ".mp4" ? { "Accept-Ranges": "bytes" } : {})
    };
    if (ext === ".mp4" && req.headers.range) {
      const match = /^bytes=([0-9]*)-([0-9]*)$/.exec(req.headers.range);
      let start;
      let end;
      if (!match || stat.size === 0) {
        res.writeHead(416, { ...baseHeaders, "Content-Range": `bytes */${stat.size}` });
        res.end();
        return;
      }
      if (match[1] === "") {
        const suffixLength = Number(match[2]);
        if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
          res.writeHead(416, { ...baseHeaders, "Content-Range": `bytes */${stat.size}` });
          res.end();
          return;
        }
        start = Math.max(0, stat.size - suffixLength);
        end = stat.size - 1;
      } else {
        start = Number(match[1]);
        end = match[2] === "" ? stat.size - 1 : Math.min(Number(match[2]), stat.size - 1);
      }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= stat.size || end < start) {
        res.writeHead(416, { ...baseHeaders, "Content-Range": `bytes */${stat.size}` });
        res.end();
        return;
      }
      const length = end - start + 1;
      res.writeHead(206, {
        ...baseHeaders,
        "Content-Length": length,
        "Content-Range": `bytes ${start}-${end}/${stat.size}`
      });
      if (req.method === "HEAD") res.end();
      else fs.createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { ...baseHeaders, "Content-Length": stat.size });
    if (req.method === "HEAD") res.end();
    else if (ext === ".mp4") fs.createReadStream(file).pipe(res);
    else res.end(await fs.promises.readFile(file));
  } catch (e) {
    res.writeHead(500);
    res.end("500");
  }
}).listen(PORT, "0.0.0.0", () => {
  console.log("HarshalOS static server — http://0.0.0.0:" + PORT);
  console.log("  ?v=… → immutable long-cache · else no-cache · avif MIME enabled");
});
