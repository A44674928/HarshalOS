/* ═══════════════════════════════════════════════════════════════
   HarshalOS — local preview server (node serve.js)

   Why this exists: `python3 -m http.server` sends no cache headers,
   which let browsers heuristically cache stale engine builds during
   development (the black-square saga). This server sends:
     · "?v=…" URLs  → public, max-age=31536000, immutable
     · everything else → no-cache (always revalidate)
   and knows the right MIME type for .avif (the orb film frames).

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

http.createServer((req, res) => {
  try {
    const u = new URL(req.url, "http://localhost");
    let p = decodeURIComponent(u.pathname);
    if (p.endsWith("/")) p += "index.html";
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
