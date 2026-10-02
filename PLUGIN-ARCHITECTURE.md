# Plugin Architecture

> **Status: Reserved / Future Architecture — not implemented.**
>
> The nested `Business Plan/StarPortal/` directory tree is an intentional set of reserved plugin/data slots. It is a preservation contract for the repository layout, not a currently active production plugin loader.

## Preservation rules

- Every directory under `Business Plan/StarPortal/` is an intentional slot, regardless of its present contents.
- Empty files and empty directories are intentional. Do not remove or flatten a slot merely because it has no payload or contains a zero-byte file.
- Git does not store directories on their own; existing `.gitkeep` files (and any other tracked sentinels) preserve paths. Keep those sentinels unless the slot owner explicitly changes the layout.
- Per-slot `README.md` purpose notes are deferred to a later pass. This document describes the current reservation policy; it does not assign detailed semantics to every slot.

## Current implementation boundary

The static site does not scan or load `Business Plan/StarPortal/`, `Archive/`, or `archives/`. They are outside the asset allowlist used by `scripts/prepare-assets.mjs` and the route allowlist in `serve.js`. A folder's presence in the repository therefore does not make it a live plugin or a deployed data source.

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

`Archive/` is the review staging area for selected author-archive material moved for owner review; `Archive/Duplicates/` holds surplus byte-identical copies with a CSV path/hash manifest. The existing lowercase `archives/` tree remains the project's established archive area, including the dated screenshot backup. Neither path is a privacy boundary: repository visibility is unchanged by moving a file into an archive directory.
