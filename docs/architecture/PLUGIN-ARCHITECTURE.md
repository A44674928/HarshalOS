# Plugin Architecture

> **Status: Reserved / Future Architecture — not implemented.**
>
> The nested `business plan/StarPortal/` directory tree is an intentional set of reserved plugin/data slots. It is a preservation contract for the repository layout, not a currently active production plugin loader.

## Preservation rules

- Every directory under `business plan/StarPortal/` is an intentional slot, regardless of its present contents.
- Empty files and empty directories are intentional. Do not remove or flatten a slot merely because it has no payload or contains a zero-byte file.
- Git does not store directories on their own; existing `.gitkeep` files (and any other tracked sentinels) preserve paths. Keep those sentinels unless the slot owner explicitly changes the layout.
- Per-slot `README.md` purpose notes are deferred to a later pass. This document describes the current reservation policy; it does not assign detailed semantics to every slot.

## Current implementation boundary

The static site does not scan or load `business plan/StarPortal/` or `archives/`. These repository-only trees are outside the asset allowlist used by `scripts/prepare-assets.mjs` and the route allowlist in `serve.js`. A folder's presence in the repository therefore does not make it a live plugin or a deployed data source.

The Flame application has an individual-file selector for `.flame` and `.txt` inputs. That is separate from the reserved directory tree: it does not ingest a folder, read the StarPortal hierarchy, or implement production-side folder drop-in behavior.

The production-side instruction to drop files into a plugin folder describes a **future workflow**, not a capability available today. Do not present it as implemented until a dedicated ingestion path exists and is covered by tests.

## Requirements before activation

Before any reserved slot is connected to production behavior, define and test at least:

1. A versioned manifest/schema that maps slots to data types and stable identifiers.
2. An explicit file allowlist, size limits, validation rules, and safe handling for malformed or hostile inputs.
3. Provenance, licensing, privacy, review status, and publication rules for every ingested item.
4. A deliberate ingestion interface and authorization boundary; never recursively publish or execute arbitrary files found in a slot.
5. Slot-specific documentation and tests for preservation, loading, rejection, and rollback behavior.

## Archive locations

`archives/` is the unified repository archive, combining the former `Archive/` review staging area with the pre-existing lowercase `archives/` tree. `archives/Duplicates/` holds surplus byte-identical copies with a CSV path/hash manifest; review drafts, preview art, Supply Chain material, historical bundles, and screenshot backups remain in their own subfolders. The former top-level `Business Plan/` directory is now `business plan/`; it remains separate from the archive and retains the reserved `StarPortal/` slots. Neither tree is a privacy boundary: repository visibility is unchanged by moving or renaming files.
