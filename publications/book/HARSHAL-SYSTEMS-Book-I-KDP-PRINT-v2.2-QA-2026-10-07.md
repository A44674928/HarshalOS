# Book I — KDP Print Package v2.2 — QA & Handoff (2026-10-07)

Production Edition v2.2 = v2.1 print source + machine-readable **Appendix G**
companion to Part I, rebuilt end-to-end as a KDP-submittable package:
press interior PDF, editable DOCX master, and wraparound cover.

## Deliverables (this directory)

| File | Size | SHA-256 (prefix) |
|---|---|---|
| `HARSHAL-SYSTEMS-Book-I-KDP-print-interior-v2.2-2026-10-07.pdf` | 1,639,438 B | `b4da7a63…` |
| `HARSHAL-SYSTEMS-Book-I-KDP-print-interior-v2.2-2026-10-07.docx` | 693,182 B | `7cf5de66…` |
| `HARSHAL-SYSTEMS-Book-I-KDP-cover-wrap-v2.2-2026-10-07-WHITE-514pp.pdf` | 50,808 B | `03accdd3…` |
| `HARSHAL-SYSTEMS-Book-I-KDP-cover-wrap-v2.2-2026-10-07-CREAM-514pp.pdf` | 50,806 B | `d24f5675…` |
| `HARSHAL-SYSTEMS-Book-I-v2.2-PRINT-SOURCE-2026-10-07.txt` (print source) | 1,477,847 B | `e7a92cd8…` |

Pipeline: `build_kdp_v22_source.py` → `build_kdp_v22_docx.py` →
`render_kdp_v22_pdf.py` → `build_kdp_v22_cover.py`. Fonts vendored under
`kdp_v22/fonts/` (Tinos/Cousine/DejaVu; see `fonts/README.md` for licenses).
Measurement evidence: `kdp_v22/folios.json`,
`kdp_v22/pagination-audit.txt`, `kdp_v22/render_log.txt`, `kdp_v22/proofs/`.

## Interior (514 pages — within the 75–550 KDP band for 8.25×11)

- Trim 8.25 × 11 in, no bleed; every page exactly 594 × 792 pt.
- Mirrored margins (inside 0.90 / outside 0.65 / top-bottom 0.75 in).
- 25 front-matter pages (roman folios i–xxv) + blank p.26; body folio 1 on
  physical p.27; all 25 Parts open on odd pages; 17 blank versos carry a
  folio only (pp. 26, 50, 54, 72, 90, 96, 122, 166, 170, 228, 238, 306,
  320, 338, 370, 398, 452).
- Contents: 38/38 printed folios match independently measured anchors
  (orientation xvii, Part I → 1 … Part XXV → 427, Appendices → 434,
  Appendix G → 461, Glossary → 485).
- Headers (`HARSHAL'S SYSTEMS · BOOK I`) on all 497 content pages; p.1
  clean; folios byte-exact on all 514 pages (mechanical check).
- All 10 used font faces embedded as subsets; word count 197,651 vs
  193,309 source words (+2.25% = running heads/folios).
- Optical proofs checked: title, contents, part opener, body, code boxes,
  tables, Appendix G, glossary, blank verso (`kdp_v22/proofs/`).
- PDF-only substitutions for two glyphs absent from every print font
  (DOCX/source keep the originals): U+2E3B → `———`, U+A527 → `«»`.

## Covers (pick ONE at upload — must match the paper chosen in KDP)

| Variant | Spine (KDP black-ink rate) | Full size with 0.125 in bleed |
|---|---|---|
| WHITE | 514 × 0.002252 = 1.1575 in | 1289.34 × 810 pt |
| CREAM | 514 × 0.0025 = 1.2850 in | 1298.52 × 810 pt |

- Single-page PDF, exact size, fonts embedded, live matter ≥ 0.25 in
  from trim, no printer's marks.
- Spine reads top-to-bottom; back carries the edition blurb and a white
  2.0 × 1.2 in barcode box (spine side, lower) that KDP overprints with
  its assigned barcode. ISBN placeholders inside the book
  (`979-8-________-_-_`) are assigned in the KDP dashboard.

## Upload checklist

1. In KDP, create the paperback (8.25 × 11, no bleed, black ink) and pick
   white or cream paper.
2. Upload the interior PDF and the matching cover PDF (WHITE or CREAM).
3. Assign the ISBN in the dashboard; confirm the barcode box placement in
   KDP's Print Previewer before approving.
4. Keep the DOCX as the editable master; to re-spin after text edits, run
   `render_kdp_v22_pdf.py` (it rebuilds the DOCX, re-measures folios to a
   fixpoint, and rewrites the PDF + source) and then `build_kdp_v22_cover.py`
   (page count feeds the spine math, so re-check the cover if it changes).
