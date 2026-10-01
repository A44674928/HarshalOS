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
   index.html, about.html, css/, js/, assets/, and the versioned specs/ the
   Ground-0 app fetches at runtime — and everything else is a plain 404 that
   does not admit what exists.

   Not part of the deployed site — excluded in .assetsignore.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8000);

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

/* The deployed site, as a set of path patterns. The `specs/normative/*.md`
   and `specs/draft/*.md` paths are the only non-asset documentation exposed
   to the browser; they are fetched by the Ground-0 specification reader. */
const SERVED = [
  /^\/$/,                                   // index.html
  /^\/[A-Za-z0-9_-]+\.html$/,               // about.html and friends
  /^\/css\/[A-Za-z0-9._-]+$/,
  /^\/js\/[A-Za-z0-9._-]+$/,
  /^\/assets\/[A-Za-z0-9._/-]+$/,
  /^\/specs\/(?:normative|draft)\/[A-Za-z0-9._-]+\.md$/
];
/* `new URL` collapses "/../" before we ever see it, so a prefix check on the
   joined path is not enough on its own: "/../.git/config" arrives as
   "/.git/config", which is inside ROOT and would be served. Refuse any path
   with a dot segment first — .git, .DS_Store, .env, .wrangler. */
const hasDotSegment = value => value.split("/").some(segment => segment.startsWith("."));
const isServed = value => !hasDotSegment(value) && SERVED.some(pattern => pattern.test(value));

http.createServer((req, res) => {
  try {
    const u = new URL(req.url, "http://localhost");
    let p = decodeURIComponent(u.pathname);
    if (p.endsWith("/")) p += "index.html";
    if (!isServed(p)) {
      res.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
      res.end("404 " + p);
      return;
    }
    const file = path.normalize(path.join(ROOT, p));
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
