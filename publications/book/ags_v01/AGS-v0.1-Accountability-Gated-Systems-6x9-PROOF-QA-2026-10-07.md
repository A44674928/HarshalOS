# AGS v0.1: Accountability-Gated Systems — 6 × 9 Proof QA (rev. 2)

**Status:** readability/page-count proof only; not for KDP upload  
**Working trim:** 6 × 9 in for paperback and hardcover, as approved by the author  
**Proof date:** 2026-10-07 (rev. 2 — includes the complete Appendix G Python module listing)

## Proof files

| File | Bytes | SHA-256 |
|---|---:|---|
| `AGS-v0.1-Accountability-Gated-Systems-6x9-INTERIOR-PROOF-2026-10-07.pdf` | 360,951 | `5fb45394145688d4d63c6661cf290a217e58a6de7b4ae1da8424a8724105e149` |
| `AGS-v0.1-Accountability-Gated-Systems-6x9-INTERIOR-PROOF-2026-10-07.docx` | 128,594 | `45fa9d3e121a02e934dd5c88df835d9ce2c76db96749f0a399e9486121679843` |

The proof uses the derived 26,399-word manuscript: Part I / Core Book plus
Appendix G, with Appendix G now printing the **complete machine-readable Python
module** (Section G.3). Both user-supplied v0.1 ISBNs are reproduced on the
copyright page: paperback `979-8-24548-379-5`; hardcover `979-8-16078-278-2`.

## Pagination and trim checks

- **130 physical pages**, all exactly 432 × 648 pt (6 × 9 in), no bleed.
- Four front-matter pages (title, copyright/ISBN, scope note, contents); body
  folio 1 begins on physical p.5. The body runs through folio 126 on
  physical p.130.
- Part I opens on physical p.5; Appendix G opens on p.42; the G.3 module
  listing opens on p.78 and ends on p.130 with `sys.exit(main())`.
- The 130-page proof is **55 pages above the 75-page hardcover planning
  threshold** — a comfortable margin.
- Mirrored margins: 0.70 in inside, 0.55 in outside, 0.60 in top and bottom.
- No blank versos; every page carries content.
- Contents entries intentionally have no folio references yet; they will be
  inserted after the proof trim/layout is accepted.

## Appendix G listing checks

- Section G.3 is “Complete Machine-Readable Module (Python)”; the listing
  reproduces `HARSHAL-SYSTEMS-Book-I-APPENDIX-G-CORE-BOOK-AI-COMPANION-2026-10-07.py`
  in full (1,745 lines), beginning with the shebang and ending with
  `sys.exit(main())`.
- Section G.2 prints the module identity: 112,276 bytes, SHA-256
  `63f7fecff04f9f01c1967b652d4899914e3046e6427278a94798a656e9fc5829`,
  standard-library-only Python 3, self-test PASS (11 units, 94 sections,
  774 paragraphs, 5,961 words).
- Long module lines wrap at spaces onto continuation lines; module blank lines
  are preserved; the docstring line beginning “Appendix G carries…” renders as
  code, not a heading.
- Visually reviewed: G.3 opener (p.78), a wrapped data page (p.83), and the
  listing end (p.130).

## Readability and technical checks

- Proof typography: 11 pt body, 8 pt monospaced code, 7.8 pt table text;
  running header and folios are present.
- Visually reviewed title page, contents, first Core Book chapter, Appendix G
  opener/provenance page, and the listing pages listed above. The title lockup
  does not overlap; sampled body, table, and code text are legible at page
  scale.
- Automated page-box/content check: all pages are 6 × 9 in; no blank pages;
  expected ISBN, section, and module-listing anchors are present; text spans
  remain within the mirrored safe area; the renderer reports no missing
  glyphs.
- Tinos regular/italic/bold and Cousine regular subsets are embedded (DejaVu
  fallbacks used only where needed). The `/Helvetica` resource is an unused
  initializer.

## Not final / next checks

This is a typeset proof, not a final KDP upload file. KDP Print Previewer has
not been run. The PDF deliberately marks itself as a proof and the contents
folios are unfinished. This review proof shows both assigned ISBNs together on
the copyright page; the production paperback and hardcover interiors must be
separate, each printing only its format’s ISBN. Paperback and hardcover need
separate covers (6 × 9, page-count-dependent spines); neither cover is
included here. Finalize the interior folios, produce binding-specific covers
using the approved 6 × 9 trim and final page count, then run KDP’s
Previewer/validator before publication.
