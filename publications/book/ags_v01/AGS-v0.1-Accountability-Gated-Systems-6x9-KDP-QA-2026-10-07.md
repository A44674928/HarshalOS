# AGS v0.1: Accountability-Gated Systems — Final KDP package QA & handoff
**6 × 9 in · paperback + hardcover · 2026-10-07 (final, approved layout)**

**Status:** final print package, produced from the author-approved 130-page
6 × 9 proof. The approved proof (review record) remains at
`AGS-v0.1-Accountability-Gated-Systems-6x9-INTERIOR-PROOF-2026-10-07.pdf`
with its QA note and audit.

## Deliverables

| File | Size | SHA-256 |
|---|---:|---|
| `AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-interior-PAPERBACK-2026-10-07.pdf` | 359,636 B | `0df0e0509296482ac70cde75b7b7f1d4f31679a6bb796094411e656a7fa3edcb` |
| `AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-interior-PAPERBACK-2026-10-07.docx` | 128,814 B | `ab14841df4b06ece3faeabd8e1c1ae6fcd4e03dbcd52e4670995e53f1f9e0cb3` |
| `AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-interior-HARDCOVER-2026-10-07.pdf` | 359,635 B | `db67adc4f04cc7006eaeb623b08fb33f3052bee81a7723ab0f1ea4cff7408a59` |
| `AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-interior-HARDCOVER-2026-10-07.docx` | 128,808 B | `2f66b13f7cf25d1171afdd5264a7ae4942f146056e7a678eb6b62498c1feb2d5` |
| `AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-cover-PAPERBACK-WHITE-130pp-2026-10-07.pdf` | 905,557 B | `6110d5624abfd7121dd729a91bc660084921286be1baf80fb31b0f162b567c48` |
| `AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-cover-PAPERBACK-CREAM-130pp-2026-10-07.pdf` | 905,554 B | `67863abd5912b03875cdbf1efe1ed5673c1f55226bd6bdc7a75a83bd1f3b416c` |
| `AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-cover-HARDCOVER-WHITE-130pp-2026-10-07.pdf` | 905,595 B | `5da2725b7a05192fc8982232f4a1f2e3b7af3c7cad8321682636b280e8f2b5a3` |
| `AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-cover-HARDCOVER-CREAM-130pp-2026-10-07.pdf` | 905,590 B | `906763eb7bf2a53a4c57103e1846303f9c189ad5684123cc220dc98fa50d56e9` |

The two interiors are identical except that each copyright page prints only
its own format’s ISBN: paperback `979-8-24548-379-5`, hardcover
`979-8-16078-278-2` (both check digits valid; verified that the other
format’s ISBN does not appear). Per-format audit JSONs accompany each
interior (`…-interior-PAPERBACK-AUDIT-…json`, `…-interior-HARDCOVER-AUDIT-…json`).

## Interior verification (both formats)

- **130 physical pages**, all exactly 432 × 648 pt (6 × 9 in), no bleed; no
  blank pages; every page carries content.
- Four front-matter pages (title, copyright/ISBN, scope note, contents);
  body folio 1 begins on physical p.5; the body runs through folio 126 on
  physical p.130.
- **Contents folios populated and measured**: Part I — The Core Book → 1;
  Appendix G → 38; G.1 → 38; G.2 → 39; G.3 → 74 (folio fixpoint converged on
  the first pass; the printed folios match the measured anchors exactly).
- Part I opens on physical p.5; Appendix G opens on p.42; the complete
  Appendix G Python module listing runs pp. 78–130 (shebang →
  `sys.exit(main())`).
- 130 pages clears KDP’s 75-page hardcover minimum by 55 pages and is within
  the 550-page ceiling for the trim.
- Mirrored margins: 0.70 in inside, 0.55 in outside, 0.60 in top and bottom.
  Typography: 11 pt body, 8 pt code, 7.8 pt tables; running header
  `AGS v0.1 · ACCOUNTABILITY-GATED SYSTEMS` and folios on every nonblank page.
- All proof markings removed; PDF metadata stamped for production
  (title/author/subject/keywords).
- Automated checks: page boxes, anchors, per-format ISBN presence/absence,
  contents-folio match, module-listing completeness, mirrored safe area
  (zero violations), no blank pages, no missing glyphs; Tinos/Cousine
  subsets embedded (`/Helvetica` is the pipeline’s unused initializer and
  contributes no glyphs).
- Visually reviewed: title, copyright (both formats), scope note, contents
  table, Part I opener, Appendix G opener, G.3 listing opener, and the
  listing end (`ags_v01/proofs/final-*.png`).

## Cover verification

| Binding / paper | Spine formula | Spine | Full wrap size | File |
|---|---|---:|---|---|
| Paperback / WHITE | 130 × 0.002252 | 0.2928 in | 12.5428 × 9.25 in | `…-cover-PAPERBACK-WHITE-130pp-…` |
| Paperback / CREAM | 130 × 0.0025 | 0.3250 in | 12.5750 × 9.25 in | `…-cover-PAPERBACK-CREAM-130pp-…` |
| Hardcover / WHITE | 130 × 0.002252 + 0.189 | 0.4818 in | 14.0578 × 10.418 in | `…-cover-HARDCOVER-WHITE-130pp-…` |
| Hardcover / CREAM | 130 × 0.0025 + 0.189 | 0.5140 in | 14.0900 × 10.418 in | `…-cover-HARDCOVER-CREAM-130pp-…` |

- Paperback: single-page full wrap (back + spine + front), 0.125 in bleed;
  spine text present (130 pp ≥ 80-page spine-text minimum).
- Hardcover: KDP case-laminate geometry per KDP’s published constants —
  0.591 in turn-in wrap on all four sides, 0.197 in fore-edge board overhang
  per board, 0.118 in top/bottom board overhang, 0.189 in spine binding
  allowance, 0.394 in hinge zones inside each panel beside the spine. **All
  live matter stays clear of trim, folds, and hinge zones; the barcode
  reserve is offset 0.50 in from the spine edge on the hardcover (0.375 in
  on the paperback).** Geometry was built from published third-party
  constants — **confirm against KDP’s Cover Calculator / Print Previewer at
  upload**, which is the authoritative template source.
- All four covers: supplied IMG_7067 artwork on the front, placed uncropped
  at 4.5 × 3.0 in (2250 × 1500 px master, 500 dpi effective); embedded Tinos
  faces only; no ISBN text on the wrap; pristine 2.0 × 1.2 in white barcode
  reservation for KDP to overprint; single page each; visually reviewed
  (`ags_v01/proofs/final-cover-*.png`).
- WHITE is recommended for this text/code-heavy interior; CREAM retained as
  the alternate — choose the matching cover file, since the spine widths
  differ.

## KDP handoff

KDP’s proprietary Print Previewer/upload validator has **not** been run. The
local checks verify PDF geometry, content, typography, and cover
construction; no KDP acceptance is claimed. Complete the following at upload:

1. Create the paperback (6 × 9 in, black ink, no bleed, white or cream
   paper) and the hardcover (6 × 9 in) as separate titles, each with its
   assigned ISBN (`9798245483795` paperback, `9798160782782` hardcover).
2. Upload the matching interior PDF and cover file for each (match the paper
   choice: WHITE or CREAM cover file, since spine widths differ; for the
   hardcover, confirm the case-wrap dimensions against KDP’s Cover
   Calculator template).
3. Confirm KDP’s generated barcode over the reservation box and the final
   preview in Print Previewer.
4. Keep the DOCX/source as editable masters. If content changes, rebuild the
   interiors with `build_ags_v01_final.py`, then the covers with
   `build_ags_v01_cover.py`; re-check the page count/spine if it changes.
