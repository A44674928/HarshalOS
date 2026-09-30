// Stage only public files. Never let the asset uploader walk the repository.
import { cp, mkdir, rm, lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const dest = path.join(root, '.site-assets');
await rm(dest, { recursive: true, force: true });
await mkdir(dest);
for (const entry of ['index.html', 'about.html', 'css', 'js', 'assets', 'specs']) {
  await cp(path.join(root, entry), path.join(dest, entry), {
    recursive: true, filter: async source => {
      const relative = path.relative(root, source);
      if (relative.split(path.sep).some(part => part.startsWith('.'))) return false;
      const stat = await lstat(source);
      if (relative.startsWith('specs' + path.sep) && !stat.isDirectory() && !relative.endsWith('.md')) return false;
      return !stat.isSymbolicLink();
    }
  });
}
console.log('Staged public site assets only.');
