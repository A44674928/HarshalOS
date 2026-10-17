// Stage only browser-deliverable files. Never let the asset uploader walk the checkout.
import { cp, mkdir, rm, lstat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildManifest, serializeManifest, MANUSCRIPT_DIRNAME, MANIFEST_FILENAME } from './manuscript-index.mjs';
import { buildBookLibrary, serializeBookLibrary } from './book-library-index.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const dest = path.join(root, '.site-assets');
const allowedSpecDirectories = new Set(['specs', 'specs/normative', 'specs/draft']);
const allowedSpecDocument = /^specs\/(?:normative\/[A-Za-z0-9._-]+\.(?:md|json)|draft\/[A-Za-z0-9._-]+\.md)$/;
const excludedRuntimeAssets = new Set([
  'assets/eye-closing-hq.gif',
  'assets/eye-open-close-hq.gif'
]);
await rm(dest, { recursive: true, force: true });
await mkdir(dest);
for (const entry of ['index.html', 'neo-orb.html', 'about.html', 'account.html', 'audits.html', 'observations.html', 'css', 'js', 'assets', 'trades', 'specs']) {
  await cp(path.join(root, entry), path.join(dest, entry), {
    recursive: true,
    filter: async source => {
      const relative = path.relative(root, source);
      const normalized = relative.split(path.sep).join('/');
      if (relative.split(path.sep).some(part => part.startsWith('.'))) return false;
      const stat = await lstat(source);
      if (excludedRuntimeAssets.has(normalized)) return false;
      if (normalized === 'specs' || normalized.startsWith('specs/')) {
        if (stat.isSymbolicLink()) return false;
        if (stat.isDirectory()) return allowedSpecDirectories.has(normalized);
        return allowedSpecDocument.test(normalized);
      }
      return !stat.isSymbolicLink();
    }
  });
}

/* FRONTIERSHIP / OUTPOST ONE is intentionally a named deploy-list, not a copy
   of the project folder. Its browser bundle contains project/economic details;
   Cloudflare Access must protect the site and every static/media route. Access
   is configured outside this repository and is not enforced by this stager. */
const outpostSourceRoot = path.join(root, 'single-parcel-APN30055004', 'terrain_preliminary');
const outpostDeployAssets = [
  ['best-wishes-edition/frontiership-outpost-one-best-wishes-3d.mp4', 'private/outpost-one-best-wishes-3d-film.mp4'],
  ['best-wishes-edition/frontiership-outpost-one-best-wishes-3d-poster.png', 'private/outpost-one-best-wishes-3d-poster.png'],
  ['best-wishes-edition/BEST_WISHES_EDITION_GUIDE.md', 'private/outpost-one-best-wishes-guide.md'],
  ['outpost-one-full-feature-film.mp4', 'private/outpost-one-full-feature-film.mp4'],
  ['outpost-one-full-feature-poster.png', 'private/outpost-one-full-feature-poster.png'],
  ['OUTPOST_ONE_FEATURE_FILM_GUIDE.md', 'private/outpost-one-feature-film-guide.md'],
  ['outpost-one-concept-model.zip', 'private/outpost-one-concept-model.zip'],
  ['index.html', 'terrain/index.html'],
  ['README.md', 'terrain/README.md'],
  ['epqs_samples.csv', 'terrain/epqs_samples.csv'],
  ['parcel_outline.geojson', 'terrain/parcel_outline.geojson']
];
for (const [sourceRelative, publicRelative] of outpostDeployAssets) {
  const source = path.resolve(outpostSourceRoot, ...sourceRelative.split('/'));
  if (!source.startsWith(`${outpostSourceRoot}${path.sep}`)) throw new Error(`OUTPOST source path escapes its package: ${sourceRelative}`);
  const sourceStat = await lstat(source);
  if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) throw new Error(`OUTPOST deploy asset must be a regular file: ${sourceRelative}`);
  const target = path.join(dest, ...publicRelative.split('/'));
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target);
}

/* Book I is the one explicitly selected document from the otherwise-private
   docs/ tree. Publish it under a narrow runtime path; never stage docs/ itself. */
const coreBookSource = 'docs/harshal-systems/01-core-book.md';
const coreBookTarget = path.join(dest, 'book', '01-core-book.md');
await mkdir(path.dirname(coreBookTarget), { recursive: true });
await cp(path.join(root, coreBookSource), coreBookTarget);

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

/* The Book's Collections tab exposes every Markdown file in the Harshal's
   Systems subtree through a curated manifest; unrelated docs/ stay private. */
const bookLibrary = await buildBookLibrary(root);
const stagedLibraryRoot = path.join(dest, 'book-library', 'harshal-systems');
for (const document of bookLibrary.documents) {
  const source = path.join(root, 'docs', 'harshal-systems', ...document.file.split('/'));
  const target = path.join(stagedLibraryRoot, ...document.file.split('/'));
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target);
}
await mkdir(path.join(dest, 'book-library'), { recursive: true });
await writeFile(path.join(dest, 'book-library', 'manifest.json'), serializeBookLibrary(bookLibrary.manifest));

console.log(`Staged browser assets, the selected Book I core text, ${bookLibrary.manifest.documentCount} collection-library file(s), the normative/draft Ground-0 specifications, ${manifest.manuscript.chapters} manuscript chapter(s) with indexes, and the named OUTPOST ONE app/media/terrain assets. Cloudflare Access remains externally configured.`);
