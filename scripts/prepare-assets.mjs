// Stage only browser-deliverable files. Never let the asset uploader walk the checkout.
import { cp, mkdir, rm, lstat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildManifest, serializeManifest, MANUSCRIPT_DIRNAME, MANIFEST_FILENAME } from './manuscript-index.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const dest = path.join(root, '.site-assets');
const allowedSpecDirectories = new Set(['specs', 'specs/normative', 'specs/draft']);
const allowedSpecDocument = /^specs\/(?:normative|draft)\/[A-Za-z0-9._-]+\.md$/;
await rm(dest, { recursive: true, force: true });
await mkdir(dest);
for (const entry of ['index.html', 'about.html', 'css', 'js', 'assets', 'specs']) {
  await cp(path.join(root, entry), path.join(dest, entry), {
    recursive: true,
    filter: async source => {
      const relative = path.relative(root, source);
      const normalized = relative.split(path.sep).join('/');
      if (relative.split(path.sep).some(part => part.startsWith('.'))) return false;
      const stat = await lstat(source);
      if (normalized === 'specs' || normalized.startsWith('specs/')) {
        if (stat.isSymbolicLink()) return false;
        if (stat.isDirectory()) return allowedSpecDirectories.has(normalized);
        return allowedSpecDocument.test(normalized);
      }
      return !stat.isSymbolicLink();
    }
  });
}

/* Manuscript chapters are published as data, never as repository files: only
   files the generated index lists are copied, plus the index itself. A stray
   .docx, note, or private draft in the folder is left out of the deploy. */
const manifest = await buildManifest(root);
for (const collection of manifest.collections) {
  for (const chapter of collection.chapters) {
    const target = path.join(dest, chapter.file);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(path.join(root, chapter.file), target);
  }
}
await mkdir(path.join(dest, MANUSCRIPT_DIRNAME), { recursive: true });
await writeFile(path.join(dest, MANUSCRIPT_DIRNAME, MANIFEST_FILENAME), serializeManifest(manifest));
console.log(`Staged public assets, the normative/draft Ground-0 specifications, and ${manifest.manuscript.chapters} manuscript chapter(s) with a generated index.`);
