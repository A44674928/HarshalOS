# Duplicate quarantine

Surplus byte-identical copies of retained repository files, moved here during
repository reorganization so each unique piece of content has exactly one
canonical retained path.

- `DUPLICATE-QUARANTINE-MANIFEST.csv` records the SHA-256 hash, size, the
  canonical `retained_path`, the `original_duplicate_path` (where the file was
  first found in the imported bundle), and the `quarantined_path` (where it
  now lives in this tree).
- `Business Plan/` mirrors the legacy import tree so provenance paths in the
  manifest remain human-readable. These are copies of the canonical files
  retained under [`../../business plan/`](../../business%20plan/).
- `archives/` holds surplus byte-identical copies of files retained under
  [`../`](../) (e.g. an extra screenshot file).
- `Harshal's Systems (Copyrighted) [Owner's Working Draft].md` is a
  byte-identical copy of the canonical build input
  [`../../source/working-draft.md`](../../source/working-draft.md); it is kept
  here under its original filename for provenance.

Nothing in this directory is read at runtime or staged as a browser asset.
