# AGS v0.2: Harshal’s Systems — Full Book
## KDP print QA & handoff · 2026-10-07 (rev. 2 — Appendix G full Python listing)

**Production title:** *AGS v0.2: Harshal’s Systems* (Full Book). The public-facing
edition label is v0.2, used consistently in the interior and cover PDFs.

## Deliverables

| File | Size | SHA-256 |
|---|---:|---|
| `AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-interior-2026-10-07.pdf` | 1,716,501 B | `6c67feae3881c11bab8e2654e1f58d23aabbbb1dfdcd536464218c2bbf839823` |
| `AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-interior-2026-10-07.docx` | 730,559 B | `2ce7e04bc1de316c8952b26fbb87c0128d6f95dac7dd2abca76f1384eced6d59` |
| `AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-cover-WHITE-548pp-2026-10-07.pdf` | 974,325 B | `09ad581ca473bb80664a1ad9ca9789e7294d5cdd07d721290f7394c6d39c2b80` |
| `AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-cover-CREAM-548pp-2026-10-07.pdf` | 974,311 B | `b3418f155238cd9864418600041a7aef9784e0812ffea8f3bf4bbe7afc6b4222` |
| `AGS-v0.2-Harshal-s-Systems-Full-Book-PRINT-SOURCE-2026-10-07.txt` | 1,596,879 B | `ba92bdb4655b653e695af5e2b86521fad5dfa727f438bca8919db9192346d7d8` |

The compact full-book front-cover art used in both wraps is
`ags_v02/assets/AGS-v0.2-fullbook-art-300dpi.jpg` (2250 × 1500 px, 300 dpi),
prepared from the user-provided Drive image `IMG_0970.BMP` (Drive ID
`1rE1ZquVTQmXNiD_7S4IuN136XKR6uJOg`). Pipeline scripts are
`build_ags_v02_source.py` → `build_ags_v02_docx.py` → `render_ags_v02_pdf.py` →
`build_ags_v02_cover.py`; pagination evidence and proofs are under `ags_v02/`.
The earlier 514-page package (covers `…-514pp-…`) is superseded by this
548-page revision and should be discarded.

## Interior verification

- 548 pages, 8.25 × 11 in, no bleed; every page exactly 594 × 792 pt. This is
  within the 550-page KDP ceiling for the trim but with only 2 pages of
  headroom — re-check the count after any further content change.
- 25 roman-numbered front-matter pages (i–xxv); p.26 blank; body folio 1 starts
  on physical p.27. All 25 Parts open on odd pages; 17 blank versos are folio
  only (pp. 26, 50, 54, 72, 90, 96, 122, 166, 170, 228, 238, 306, 320, 338,
  370, 398, 452).
- Contents: all 38 printed folios match measured anchors (folio fixpoint
  converged). Appendix G starts at folio 460 (physical p.486); the
  consolidated glossary starts at folio 519 (physical p.545).
- Running header `AGS v0.2 · HARSHAL’S SYSTEMS` on every nonblank page from p.2
  through p.548; p.1 is clean. All page-size, folio, and blank-verso checks pass.
- All used interior font faces are embedded. The `/Helvetica` resource is an
  unused initializer block; it contributes no glyphs. The renderer asserts zero
  missing glyphs.
- Copyright page prints the user-supplied **Full-book hardcover** ISBN
  `979-8-17350-994-9` (checksum valid); its assignment to this title/format was
  not independently verified.
- The Full-book paperback ISBN is deliberately **not** `9798245483795`: the user
  clarified that number belongs to the separate AGS v0.1 book. No paperback
  number is printed in this interior; assign a distinct Full-book paperback
  ISBN in KDP, which will also generate the barcode. No KDP-assignment claim is
  made by this workspace.
- Optical proofs refreshed and reviewed: title page, copyright page, contents,
  register, part opener, body, code pages, Appendix G opener (G.1/G.2 with the
  module SHA-256), the G.3 listing opening/wrapped-data/closing pages, glossary,
  blank verso, and both covers (`ags_v02/proofs/`).

## Appendix G — complete machine-readable module (rev. 2 change)

Section G.3 of the interior is now **“Complete Machine-Readable Module
(Python)”** and prints the full companion module, replacing the earlier abridged
schema excerpt. The listing runs physical pp. 509–544 (folios 483–518), begins
with the module shebang and ends with `sys.exit(main())`.

- Module: `HARSHAL-SYSTEMS-Book-I-APPENDIX-G-CORE-BOOK-AI-COMPANION-2026-10-07.py`
  — 1,745 lines, 112,276 bytes, SHA-256
  `63f7fecff04f9f01c1967b652d4899914e3046e6427278a94798a656e9fc5829`
  (recorded in Section G.2 of the print text; the module is unchanged).
- Self-test: **PASS** — 11 units, 94 sections, 774 paragraphs, 5,961 words;
  JSON/Markdown round-trip verified.
- Print fidelity: the listing reproduces the module verbatim; lines longer than
  the printed measure wrap at spaces onto the following line, and blank lines
  inside the module are preserved. Code blocks throughout the interior now
  preserve source blank lines, and indented (code) lines bypass heading
  classification so docstring text such as “Appendix G carries…” is never
  promoted to a heading.
- Section G.1/G.2/G.3 titles now typeset as subheadings (Heading 3).

## Paperback cover verification

| Paper | KDP black-ink spine rate | Spine | Full wrap with 0.125 in bleed | PDF page |
|---|---:|---:|---:|---:|
| WHITE | 0.002252 in/page | 1.2341 in | 1294.85 × 810 pt | 1 |
| CREAM | 0.0025 in/page | 1.3700 in | 1304.64 × 810 pt | 1 |

- Both covers use the supplied IMG_0970 artwork on the front; the central 3:2
  image is preserved uncropped at 7.5 × 5 in (300 dpi).
- Three Tinos faces embedded; no printer’s marks or spine-fold guides. No ISBN
  text is printed on the wrap. The 2.0 × 1.2 in white barcode reservation is
  pristine and left for KDP to overprint after ISBN assignment.
- WHITE is recommended for this textbook/code/table-heavy edition; the CREAM
  file is retained as an alternate. Choose the matching paper in KDP because
  the spine widths differ.
- **Paperback wraps only.** A KDP hardcover cover was not generated in this
  package; hardcover has separate cover specifications.

## Separate AGS v0.1 publication — not part of this package

The user defines the shorter *Accountability-Gated Systems* (AGS v0.1) book as
the Core Book plus Appendix G, with paperback `9798245483795` and hardcover
`9798160782782` (both check digits valid). Those ISBNs are not used in this
Full Book v0.2 package. The derived source
`AGS-v0.1-Accountability-Gated-Systems-CORE-BOOK-plus-APPENDIX-G-SOURCE-2026-10-07.txt`
is regenerated reproducibly by `build_ags_v01_source.py` (26,399 words including
front matter) and now includes the same complete Appendix G, so the Full Book
and the short edition carry identical Appendix G content.

The supplied `IMG_7067.BMP.zip` (28,284,277 bytes) was downloaded successfully;
its ZIP CRC test passed and it contains the original 120,976,474-byte BMP at
7,777 × 5,185 px, RGB. A high-quality JPEG derivative is prepared at
`ags_v01/assets/AGS-v0.1-IMG_7067-artwork-300dpi.jpg`, produced by
`prepare_ags_v01_cover_art.py` (2250 × 1500 px, 300 dpi, 684,121 bytes; SHA-256
`1ddf30254506d711af1ac829ef0c9233e2802cd7553fa0473d970e6e22ea7cee`). It uses
an essentially uncropped 3:2 print master (tagged 300 dpi at its native 7.5 × 5 in
size); the original remains in Drive. The 6 × 9 in trim is confirmed by the
author for both bindings.

A provisional 6 × 9 interior proof was prepared and **author-approved**
(`ags_v01/AGS-v0.1-Accountability-Gated-Systems-6x9-INTERIOR-PROOF-2026-10-07.pdf`,
130 physical pages, 11-pt body / 8-pt code / 7.8-pt tables, 0.70-in
inside / 0.55-in outside margins; Part I opens on physical p.5 with body
folio 1, Appendix G opens on p.42, and the G.3 module listing runs pp. 78–130,
ending with `sys.exit(main())` on the last page).

**The final AGS v0.1 KDP package is now produced from the approved proof**
(QA note: `ags_v01/AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-QA-2026-10-07.md`):
separate paperback and hardcover interiors (130 pages each, identical except
that each copyright page prints only its own ISBN — paperback
`979-8-24548-379-5`, hardcover `979-8-16078-278-2`), contents folios
populated (Part I → 1, Appendix G → 38, G.1 → 38, G.2 → 39, G.3 → 74), and
four 6 × 9 wraparound covers (paperback and hardcover case wrap, each in
WHITE and CREAM paper variants, built from the IMG_7067 art). The hardcover
case-wrap geometry uses KDP’s published constants and should be confirmed
against KDP’s Cover Calculator at upload. KDP Print Previewer has not been
run for any file in either package.

## KDP handoff

KDP’s proprietary Print Previewer/upload validator has **not** been run. The
local checks verify PDF geometry, content, typography, and cover construction;
no KDP acceptance is claimed. Complete the following after upload:

1. Create the Full Book paperback as 8.25 × 11 in, black ink, no bleed. Assign a
   **distinct** Full-book paperback ISBN (the AGS v0.1 ISBN must not be reused).
2. Choose white or cream paper, then upload this interior PDF and the matching
   WHITE or CREAM wrap (both are 548 pp now; do not reuse the superseded
   514 pp wraps).
3. Confirm KDP’s generated barcode and final preview in Print Previewer. Note
   the interior is 548 of 550 allowed pages for the trim — any content growth
   requires re-checking the ceiling.
4. Keep the DOCX/source as editable masters. If content changes, rebuild the
   interior with `render_ags_v02_pdf.py`, then rebuild the wrap with
   `build_ags_v02_cover.py`; re-check the page count/spine if it changes.
