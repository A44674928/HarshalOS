// Stage only browser-deliverable files. Never let the asset uploader walk the checkout.
import { cp, mkdir, rm, lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const dest = path.join(root, '.site-assets');
const allowedSpecDirectories = new Set(['specs', 'specs/normative', 'specs/draft']);
const allowedSpecDocument = /^specs\/(?:normative|draft)\/[A-Za-z0-9._-]+\.md$/;
await rm(dest, { recursive: true, force: true });
await mkdir(dest);
for (const entry of ['index.html', 'about.html', 'css', 'js', 'assets', 'specs']) {
  await cp(path.join(root, entry), path.join(dest, entry), {
    recursive: true, filter: async source => {
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
console.log('Staged public assets and the normative/draft Ground-0 specifications only.');
