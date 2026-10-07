# AGS v0.2: Harshal’s Systems — Full Book
## KDP print QA & handoff · 2026-10-07

**Production title:** *AGS v0.2: Harshal’s Systems* (Full Book). The public-facing
edition label is v0.2, used consistently in the interior and cover PDFs.

## Deliverables

| File | Size | SHA-256 |
|---|---:|---|
| `AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-interior-2026-10-07.pdf` | 1,639,079 B | `ed7a62461d3515d8bd9fd5d30524119ee56753363d29bd9782bbd9135fc6df72` |
| `AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-interior-2026-10-07.docx` | 693,207 B | `bb2ab8c562e7da0eea08b46fa2a0f78eff6d84318343ce9731cf8311354a99bd` |
| `AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-cover-WHITE-514pp-2026-10-07.pdf` | 974,307 B | `6e5d97297dac08f2fbd9e6efd66628affa49249fa0e94c5644215441182f38a5` |
| `AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-cover-CREAM-514pp-2026-10-07.pdf` | 974,309 B | `f8fc276385e7e39dd47b8fc0c0ed809b42ac20b8253644b8437e7a744a72ef8a` |
| `AGS-v0.2-Harshal-s-Systems-Full-Book-PRINT-SOURCE-2026-10-07.txt` | 1,477,767 B | `d1ed8c87462e6f58b5141f99ec1e3faa4da9c87d6c332dcc4aeaed7c38eba133` |

The compact full-book front-cover art used in both wraps is
`ags_v02/assets/AGS-v0.2-fullbook-art-300dpi.jpg` (2250 × 1500 px, 300 dpi),
prepared from the user-provided Drive image `IMG_0970.BMP` (Drive ID
`1rE1ZquVTQmXNiD_7S4IuN136XKR6uJOg`). Pipeline scripts are
`build_ags_v02_source.py` → `build_ags_v02_docx.py` → `render_ags_v02_pdf.py` →
`build_ags_v02_cover.py`; pagination evidence and proofs are under `ags_v02/`.

## Interior verification

- 514 pages, 8.25 × 11 in, no bleed; every page exactly 594 × 792 pt.
- 25 roman-numbered front-matter pages (i–xxv); p.26 blank; body folio 1 starts
  on physical p.27. All 25 Parts open on odd pages; 17 blank versos are folio
  only (pp. 26, 50, 54, 72, 90, 96, 122, 166, 170, 228, 238, 306, 320, 338,
  370, 398, 452).
- Contents: all 38 printed folios match measured anchors. Appendix G starts at
  folio 461; the consolidated glossary starts at 485.
- Running header `AGS v0.2 · HARSHAL’S SYSTEMS` on every nonblank page from p.2
  through p.514; p.1 is clean. All page-size, folio, and blank-verso checks pass.
- All ten used interior font faces are embedded. The `/Helvetica` resource is
  an unused initializer block; it contributes no glyphs.
- Copyright page prints the user-supplied **Full-book hardcover** ISBN
  `979-8-17350-994-9` (checksum valid); its assignment to this title/format was
  not independently verified.
- The Full-book paperback ISBN is deliberately **not** `9798245483795`: the user
  clarified that number belongs to the separate AGS v0.1 book. No paperback
  number is printed in this interior; assign a distinct Full-book paperback
  ISBN in KDP, which will also generate the barcode. No KDP-assignment claim is
  made by this workspace.
- Optical proofs refreshed and reviewed: title page, copyright page, contents,
  tables, part opener, code pages, Appendix G, glossary, blank verso, and both
  covers (`ags_v02/proofs/`).

## Paperback cover verification

| Paper | KDP black-ink spine rate | Spine | Full wrap with 0.125 in bleed | PDF page |
|---|---:|---:|---:|---:|
| WHITE | 0.002252 in/page | 1.1575 in | 1289.34 × 810 pt | 1 |
| CREAM | 0.0025 in/page | 1.2850 in | 1298.52 × 810 pt | 1 |

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
Full Book v0.2 package. A separate derived manuscript source is now prepared:
`AGS-v0.1-Accountability-Gated-Systems-CORE-BOOK-plus-APPENDIX-G-SOURCE-2026-10-07.txt`,
generated reproducibly by `build_ags_v01_source.py` (16,706 words, including
front matter). It is a source manuscript—not yet a typeset KDP interior or
print-ready cover package.

The supplied `IMG_7067.BMP.zip` (28,284,277 bytes) was downloaded successfully;
its ZIP CRC test passed and it contains the original 120,976,474-byte BMP at
7,777 × 5,185 px, RGB. A high-quality JPEG derivative is prepared at
`ags_v01/assets/AGS-v0.1-IMG_7067-artwork-300dpi.jpg`, produced by
`prepare_ags_v01_cover_art.py` (2250 × 1500 px, 300 dpi, 684,121 bytes; SHA-256
`1ddf30254506d711af1ac829ef0c9233e2802cd7553fa0473d970e6e22ea7cee`). It uses
an essentially uncropped 3:2 print master (tagged 300 dpi at its native 7.5 × 5 in
size); the original remains in Drive. The 6 × 9 trim is now confirmed. A
provisional 6 × 9 interior proof is prepared at
`ags_v01/proofs/AGS-v0.1-Accountability-Gated-Systems-6x9-PROOF-2026-10-07.pdf`
with editable DOCX companion. It is 78 physical pages, 10.75-pt body, 0.75-in
inside/0.50-in outside margins; p.4 is a folio-only blank verso, Part I opens on
physical p.5 with body folio 1, and Appendix G opens recto p.41. It clears KDP’s
75-page hardcover floor in local pagination. Spot proofs of the
title/copyright/contents, body, Appendix G table, and final schema sample were
reviewed for legibility; the last page now keeps the full G.3 heading, lead-in,
and code excerpt together. This remains a proof, not a KDP-validated interior:
TOC folios are unpopulated and both ISBNs appear together for review. Final
paperback and hardcover interiors must be split so each copyright page prints
only its own ISBN. The final 6 × 9 cover layout and separate binding covers have
not been generated; scale the preserved art master proportionally to the chosen
front-panel placement.

## KDP handoff

KDP’s proprietary Print Previewer/upload validator has **not** been run. The
local checks verify PDF geometry, content, typography, and cover construction;
no KDP acceptance is claimed. Complete the following after upload:

1. Create the Full Book paperback as 8.25 × 11 in, black ink, no bleed. Assign a
   **distinct** Full-book paperback ISBN (the AGS v0.1 ISBN must not be reused).
2. Choose white or cream paper, then upload this interior PDF and the matching
   WHITE or CREAM wrap.
3. Confirm KDP’s generated barcode and final preview in Print Previewer.
4. Keep the DOCX/source as editable masters. If content changes, rebuild the
   interior with `render_ags_v02_pdf.py`, then rebuild the wrap with
   `build_ags_v02_cover.py`; re-check the page count/spine if it changes.
