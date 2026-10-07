# AGS v0.1: Accountability-Gated Systems — 6 × 9 Final Print Package QA

**Status:** final print package (approved) — KDP Print Previewer validation outstanding  
**Trim:** 6 × 9 in, no bleed; both bindings (paperback + hardcover)  
**Approved:** 2026-10-07, from the 130-page 6 × 9 proof (`…-INTERIOR-PROOF-…`, superseded
by this package; the proof remains on Drive as the review record)

## Deliverables

### Interiors (130 pages each, identical layout; each prints only its own ISBN)

| File | Bytes | SHA-256 |
|---|---:|---|
| `AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-interior-PAPERBACK-2026-10-07.pdf` | 360,940 | `56a4d3c8b2556d082c312f91c64f56ff159f6e9b82570768dfaff5366a75de46` |
| `AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-interior-PAPERBACK-2026-10-07.docx` | 128,847 | `8924075cdda6754d9c01936ccc23ea8841acf1542836d20b860d1182dd0564e8` |
| `AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-interior-HARDCOVER-2026-10-07.pdf` | 360,938 | `3cf3ca2b5a2173c7e6a4494f04b8c0b898de82ce80020d54e458f16f0ebd3fff` |
| `AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-interior-HARDCOVER-2026-10-07.docx` | 128,839 | `94abda610d8ab8c1324e1822aec596ef3abb292a321aeaa65806210296db5680` |

- Paperback copyright page prints only `ISBN-13 (Paperback): 979-8-24548-379-5`;
  hardcover prints only `ISBN-13 (Hardcover): 979-8-16078-278-2`. Verified: no
  cross-format ISBN appears in either interior.
- Contents folios populated from measured anchors (fixpoint converged):
  Part I → 1; Appendix G → 38; G.1 → 38; G.2 → 39; G.3 → 74.
- 130 physical pages, all exactly 432 × 648 pt (6 × 9 in), no bleed; no blank
  pages; front matter 4 pages (title / copyright / scope note / contents);
  body folio 1 on physical p.5; Part I p.5; Appendix G p.42; G.3 module listing
  pp. 78–130 (shebang → `sys.exit(main())`); 55 pages above the 75-page
  hardcover minimum.
- Typography: 11 pt body, 8 pt code, 7.8 pt tables; mirrored margins 0.70 in
  inside / 0.55 in outside, 0.60 in top/bottom. Inside margin 0.70 in exceeds
  KDP’s 0.375 in gutter minimum for 24–150 pages; outside/top/bottom exceed the
  0.25 in minimums.
- Fonts embedded (Tinos regular/italic/bold, Cousine regular/italic subsets;
  DejaVu fallbacks); zero missing glyphs; safe-area and title-lockup checks pass.

### Covers (single-PDF wraparounds, 300 dpi art, Tinos embedded)

| File | Size (in) | Spine (in) | Bytes | SHA-256 |
|---|---|---|---:|---|
| `…-KDP-cover-PAPERBACK-WHITE-130pp-2026-10-07.pdf` | 12.5428 × 9.2500 | 0.2928 | 905,380 | `eb2c66eb19b956880ba1bebed14951c614c6996f6889399e29e9733fc09dbad3` |
| `…-KDP-cover-PAPERBACK-CREAM-130pp-2026-10-07.pdf` | 12.5750 × 9.2500 | 0.3250 | 905,369 | `ef917dce54e9528ba187ef869758dd1bbfe5522b8b7ba45e4c75ab9e12c04bfc` |
| `…-KDP-cover-HARDCOVER-DRAFT-WHITE-130pp-2026-10-07.pdf` | 14.8458 × 10.4180 | 0.4818 | 905,485 | `f46b37c9eb0bbaa1d343d2090ed3623abc538b75f164c06536405dcbe90b3dc6` |
| `…-KDP-cover-HARDCOVER-DRAFT-CREAM-130pp-2026-10-07.pdf` | 14.8780 × 10.4180 | 0.5140 | 905,485 | `ee59c15a01592275f85c21e1cfce1eb73fe740c453a86e524fba79382904e2d0` |

**Paperback wraps (final)** use KDP’s published paperback specification
(KDP help “Create a Paperback Cover”): spine = pages × 0.002252 in (white) /
0.0025 in (cream); 0.125 in bleed; Cover Width = Bleed + Back + Spine + Front +
Bleed; Cover Height = Bleed + Trim Height + Bleed. Artwork: the prepared
`AGS-v0.1-IMG_7067-artwork-300dpi.jpg` (2250 × 1500 px, 300 dpi) placed as an
uncropped 3:2 panel (5.4 × 3.6 in) on the front. The 2.0 × 1.2 in white barcode
reserve is left pristine in the lower-right of the back cover for KDP to
overprint. No ISBN text is printed on the wraps.

**Hardcover case wraps are DRAFTS.** KDP hardcover (case laminate) geometry is
not published as a single formula on KDP’s help pages; the drafts use the
published template constants: 15 mm (0.591 in) wrap, 10 mm (0.394 in) hinge per
side, 5 mm (0.197 in) fore-edge board overhang, 6 mm (0.236 in) head/foot
overhang, spine = pages × paper rate + 4.8 mm (0.189 in) board thickness, per
KDP’s “Create a Hardcover Cover” (wrap 15 mm, hinge 10 mm, text ≥ 0.635 in from
the book edge, barcode ≥ 0.76 in from the bottom and ≥ 0.25 in from the spine
hinge). **Before upload, confirm the exact dimensions in KDP’s cover calculator
(Hardcover · Black & white · White/Cream paper · 6 × 9 · 130 pages) and regenerate
if the calculator’s numbers differ; the Print Previewer rejects mismatched
covers.** The builder is `build_ags_v01_cover.py` (constants at the top).

## Reproducibility

- `build_ags_v01_final.py` — final interiors (folios fixpoint + per-format ISBN).
- `build_ags_v01_cover.py` — all four wraps (paperback final; hardcover draft).
- `build_ags_v01_source.py` — v0.1 source derivation (contents folios now patched
  into the source by the final builder).
- Proof pages for the final package are under `ags_v01/proofs/final-*`.

## KDP handoff (remaining steps are the publisher’s)

1. Create the paperback (6 × 9, black ink, no bleed) with ISBN
   `9798245483795`; upload the paperback interior PDF and the WHITE or CREAM
   wrap (choose the paper in KDP — the spine widths differ).
2. Create the hardcover (6 × 9, black ink) with ISBN `9798160782782`; upload
   the hardcover interior PDF. For the cover: confirm the DRAFT wrap dimensions
   in KDP’s cover calculator first, then upload the regenerated/confirmed wrap.
3. Let KDP place the ISBN barcodes (the reserves are clear); confirm the
   generated barcode and the full book in **Print Previewer** before publishing.
4. KDP may add 1–4 trailing blank pages for printer information (page counts are
   rounded to even / divisible by 4); the previewer reflects the final count.

KDP’s proprietary Print Previewer/upload validator has **not** been run. Local
checks verify geometry, content, typography, and cover construction; no KDP
acceptance is claimed.
