# Publication builds

This directory contains the checked-in, single-file editions built from canonical source material. The source of each work stays in its maintained authoring folder; these files are convenience builds and are not runtime assets for `main.empty.domains`.

| Work | Maintained source | Publication build |
|---|---|---|
| **Book I — Harshal's Systems** | [`docs/harshal-systems/`](../docs/harshal-systems/README.md) and [`source/working-draft.md`](../source/working-draft.md) | [`harshal-systems/HARSHAL-SYSTEMS-USER-MANUAL.md`](harshal-systems/HARSHAL-SYSTEMS-USER-MANUAL.md) · [Word edition](harshal-systems/HARSHAL-SYSTEMS-USER-MANUAL.docx) |
| **Book II — The Grand River Foundation (Preview)** | [`manuscript/the-grand-river-foundation/`](../manuscript/README.md) | [`grand-river-foundation/BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md`](grand-river-foundation/BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md) · [Word edition](grand-river-foundation/BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.docx) |

Regenerate the Book I umbrella Markdown build with `python3 source/build.py`. Export its Word edition with `python3 scripts/export-docx.py`. The Book II preview Markdown is synchronized from the plaintext manuscript with `node scripts/write-chapter.mjs --compile`.
