/*
 * Allowlisted local preview server for the private OUTPOST ONE prototype.
 * It is intentionally not part of npm scripts, public assets, or deployment.
 * Routes are limited to HarshalOS runtime files, the terrain viewer and its
 * small source-data files, the short reference film, the original feature,
 * the separate Best-Wishes 3D feature, their named posters/guides, and a named
 * model package. No unlisted project documents, workbooks, source files, or
 * other project folders are served by this process.
 */
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReadStream } from 'node:fs';
import { lstat, readFile } from 'node:fs/promises';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PORT = Number(process.env.PORT || 8001);
const privateFiles = new Map([
  ['/', path.join(HERE, 'harshalos-private-preview.html')],
  ['/os', path.join(ROOT, 'index.html')],
  ['/private/frontiership-outpost-app.js', path.join(HERE, 'frontiership-outpost-app.js')],
  ['/private/frontiership-outpost-app.css', path.join(HERE, 'frontiership-outpost-app.css')],
  ['/private/outpost-one-pixel-concept-film.mp4', path.join(HERE, 'outpost-one-pixel-concept-film.mp4')],
  ['/private/outpost-one-pixel-concept-poster.png', path.join(HERE, 'outpost-one-pixel-concept-poster.png')],
  ['/private/outpost-one-full-feature-film.mp4', path.join(HERE, 'outpost-one-full-feature-film.mp4')],
  ['/private/outpost-one-full-feature-poster.png', path.join(HERE, 'outpost-one-full-feature-poster.png')],
  ['/private/outpost-one-best-wishes-3d-film.mp4', path.join(HERE, 'best-wishes-edition', 'frontiership-outpost-one-best-wishes-3d.mp4')],
  ['/private/outpost-one-best-wishes-3d-poster.png', path.join(HERE, 'best-wishes-edition', 'frontiership-outpost-one-best-wishes-3d-poster.png')],
  ['/private/outpost-one-best-wishes-guide.md', path.join(HERE, 'best-wishes-edition', 'BEST_WISHES_EDITION_GUIDE.md')],
  ['/private/outpost-one-feature-film-guide.md', path.join(HERE, 'OUTPOST_ONE_FEATURE_FILM_GUIDE.md')],
  ['/private/outpost-one-concept-model.zip', path.join(HERE, 'outpost-one-concept-model.zip')],
  ['/terrain', path.join(HERE, 'index.html')],
  ['/terrain/', path.join(HERE, 'index.html')],
  ['/terrain/README.md', path.join(HERE, 'README.md')],
  ['/terrain/epqs_samples.csv', path.join(HERE, 'epqs_samples.csv')],
  ['/terrain/parcel_outline.geojson', path.join(HERE, 'parcel_outline.geojson')]
]);
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.geojson', 'application/geo+json; charset=utf-8'],
  ['.csv', 'text/csv; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.gif', 'image/gif'],
  ['.apng', 'image/apng'],
  ['.webp', 'image/webp'],
  ['.mp4', 'video/mp4'],
  ['.zip', 'application/zip'],
  ['.ico', 'image/x-icon'],
  ['.flame', 'text/plain; charset=utf-8']
]);

function runtimeAssetPath(pathname) {
  const match = /^\/(css|js|assets)\/([A-Za-z0-9._/-]+)$/.exec(pathname);
  if (!match) return null;
  const parts = match[2].split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || part.startsWith('.'))) return null;
  const base = path.resolve(ROOT, match[1]);
  const target = path.resolve(base, ...parts);
  if (!target.startsWith(`${base}${path.sep}`)) return null;
  return target;
}

async function sendFile(response, target, method, rangeHeader = '') {
  let stat;
  try {
    const linkStat = await lstat(target);
    if (!linkStat.isFile() || linkStat.isSymbolicLink()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
      response.end('Not found');
      return;
    }
    stat = linkStat;
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
    response.end('Not found');
    return;
  }
  const contentType = mime.get(path.extname(target).toLowerCase()) || 'application/octet-stream';
  const common = {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  };
  if (rangeHeader && contentType === 'video/mp4') {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
    if (!match || stat.size === 0) {
      response.writeHead(416, { ...common, 'Content-Range': `bytes */${stat.size}` });
      response.end();
      return;
    }
    let start;
    let end;
    if (match[1] === '') {
      const suffixLength = Number(match[2]);
      if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
        response.writeHead(416, { ...common, 'Content-Range': `bytes */${stat.size}` });
        response.end();
        return;
      }
      start = Math.max(0, stat.size - suffixLength);
      end = stat.size - 1;
    } else {
      start = Number(match[1]);
      end = match[2] === '' ? stat.size - 1 : Math.min(Number(match[2]), stat.size - 1);
    }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= stat.size || end < start) {
      response.writeHead(416, { ...common, 'Content-Range': `bytes */${stat.size}` });
      response.end();
      return;
    }
    const length = end - start + 1;
    response.writeHead(206, {
      ...common,
      'Accept-Ranges': 'bytes',
      'Content-Length': length,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`
    });
    if (method === 'HEAD') response.end();
    else createReadStream(target, { start, end }).pipe(response);
    return;
  }
  response.writeHead(200, {
    ...common,
    'Content-Length': stat.size,
    ...(contentType === 'video/mp4' ? { 'Accept-Ranges': 'bytes' } : {})
  });
  if (method === 'HEAD') response.end();
  else if (contentType === 'video/mp4') createReadStream(target).pipe(response);
  else response.end(await readFile(target));
}

const server = http.createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Method not allowed');
    return;
  }
  let pathname;
  try { pathname = new URL(request.url || '/', 'http://localhost').pathname; }
  catch {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }
  const target = privateFiles.get(pathname) || runtimeAssetPath(pathname);
  if (!target) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
    response.end('Not found');
    return;
  }
  try { await sendFile(response, target, request.method, request.headers.range || ''); }
  catch {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
    response.end('Local preview error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Private OUTPOST ONE preview listening on 0.0.0.0:${PORT}`);
  console.log('Allowed routes: /, /os, /private/*, /terrain/*, /css/*, /js/*, /assets/*');
});
