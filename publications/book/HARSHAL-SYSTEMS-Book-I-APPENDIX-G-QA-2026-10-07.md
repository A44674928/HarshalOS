# Appendix G — Core Book AI Companion (Python) — handoff and QA

**Date:** 7 October 2026 (rev. 2 — print now includes the full module listing)
**Status:** Appendix G module built, self-test passing. No changes to existing
Appendices A–F or the glossary. The print Appendix G (Full Book and the derived
AGS v0.1 short edition) now prints the complete module in Section G.3,
“Complete Machine-Readable Module (Python)”, replacing the earlier abridged
schema excerpt; the module file itself is unchanged.

## Handoff file

- `HARSHAL-SYSTEMS-Book-I-APPENDIX-G-CORE-BOOK-AI-COMPANION-2026-10-07.py`
  — install-free Python 3 module (standard library only) carrying the full
  verbatim text of Part I, “The Core Book” (Chapters 1–10 + Epilogue).

## Source

- Drive file `AGS_v0_2__Harshal_s_Systems_September_2026__UPDATED.docx`
  (`1P0OI6YAxQbdynjNgVKGyAosfTB68Nbu3`, 5,024,723 bytes, SHA-256
  `c2da74ca…e22867`), `word/document.xml` paragraphs 426–1675.
- A byte-identical copy already in this repo
  (`publications/harshal-systems/AGS_v0_2__…UPDATED.docx`) was used for the
  mechanical extraction, so no retyping was involved. Front matter, TOC,
  Part II Formalization, and supporting material are excluded by design.

## Contents and counts

- 10 chapters + epilogue, 94 sections, 774 paragraphs, **5,961 words**
  under the Book I QA counting rule
  (`(?u)\b[\w]+(?:[’'-][\w]+)*\b`).
- Chapter title paragraphs sit at document.xml indices
  426 / 605 / 736 / 830 / 969 / 1103 / 1210 / 1319 / 1430 / 1519 / 1651.
  Chapters 3, 4, 9 use the short `N — Title` form and Chapters 7, 10 the
  `CHAPTER N — …` form in the source body; canonical TOC titles are kept
  alongside the exact source titles.

## AI-compatibility features

- Typed, immutable `Chapter` / `Section` dataclasses; JSON-serializable
  `to_dict()` / `to_json()`; readable `to_markdown()` export.
- Stable citation IDs: chapters `HS-B1-APPG-2026-10-07-CH01…`,
  sections `…-S1-1…`, paragraphs `…-P0001…P0774` in document order.
- `search(query)` keyword search and `as_records()` flat RAG-ready records.
- CLI: `--list`, `--chapter N [--section N.M]`, `--search Q`,
  `--json/--markdown PATH`, `--stats`, `--self-test`.

## Verification

- `python3 <file> --self-test` → **PASS** (11 units, 94 sections,
  774 paragraphs, 5,961 words; section-count map, verbatim spot checks,
  JSON round-trip, Markdown titles).
- `node --test tests/repository-layout-test.mjs` → 8 pass, 0 fail.
- `node --test tests/manuscript-test.mjs` → 7 pass, 0 fail.
- Print listing (rev. 2): the Section G.3 listing is generated from this file
  at source-build time (`build_ags_v02_source.py`), so the module remains the
  single source of truth. The Full Book interior prints the listing on
  physical pp. 509–544 (548-page interior); the AGS v0.1 6 × 9 proof prints it
  on pp. 78–130 (130-page proof). Section G.2 of the print text records this
  file’s byte size and SHA-256 so a distributed copy can be verified.
  Long lines wrap at spaces in print and module blank lines are preserved;
  the module’s own bytes are unchanged.

## Drive copy

Uploaded to My Drive root alongside the source `.docx`:

- `HARSHAL-SYSTEMS-Book-I-APPENDIX-G-CORE-BOOK-AI-COMPANION-2026-10-07.py`
  (Drive file `1cFR2HeGjZkE9Mzsi7plimaxcepA55NWR`, `text/x-python`,
  112,276 bytes — byte-identical size to this repo copy; head text
  re-read from Drive and confirmed).
