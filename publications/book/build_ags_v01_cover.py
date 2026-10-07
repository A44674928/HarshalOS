#!/usr/bin/env python3
"""KDP cover generator — AGS v0.1: Accountability-Gated Systems (6 x 9 in).

Builds single-PDF wraparound covers for the 130-page 6 x 9 interior:

  paperback (final): WHITE and CREAM wraps, 0.125 in bleed, KDP spine rates
    white  = pages x 0.002252 in, cream = pages x 0.0025 in
    (KDP "Create a Paperback Cover": Cover Width = Bleed + Back + Spine + Front
    + Bleed; Cover Height = Bleed + Trim Height + Bleed).

  hardcover (DRAFT): case-laminate wrap per KDP "Create a Hardcover Cover" and
    the published template constants: 15 mm (0.591 in) wrap, 10 mm (0.394 in)
    hinge per side, 5 mm (0.197 in) fore-edge board overhang, 6 mm (0.236 in)
    head/foot overhang, spine = pages x paper rate + 4.8 mm (0.189 in) board.
    Dimensions must be confirmed against KDP's cover calculator before upload.

KDP applies its own barcode over the reserved white box at upload. Fonts are
the vendored print faces. Artwork is the prepared IMG_7067 derivative.

Usage:
    python3 build_ags_v01_cover.py            # all four covers
    python3 build_ags_v01_cover.py --paper white
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
FONTS = HERE / "ags_v02" / "fonts"
sys.path.insert(0, str(HERE))

from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from pypdf import PdfReader

INTERIOR_PDF = HERE / "ags_v01" / "AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-interior-PAPERBACK-2026-10-07.pdf"
ARTWORK = HERE / "ags_v01" / "assets" / "AGS-v0.1-IMG_7067-artwork-300dpi.jpg"
PAGES = len(PdfReader(str(INTERIOR_PDF)).pages)
TRIM_W_IN = 6.0
TRIM_H_IN = 9.0
BLEED_IN = 0.125          # paperback bleed
WRAP_IN = 0.591           # hardcover case wrap (15 mm)
HINGE_IN = 0.394          # hardcover hinge (10 mm) per side
OVERHANG_W_IN = 0.197     # hardcover board overhang, fore-edge (5 mm)
OVERHANG_H_IN = 0.236     # hardcover board overhang, head+foot total (6 mm)
BOARD_IN = 0.189          # hardcover board thickness added to spine (4.8 mm)
SPINE_RATE = {"white": 0.002252, "cream": 0.0025}
IN = 72.0

INK = HexColor("#141C2B")
INK_SOFT = HexColor("#1E2A3F")
IVORY = HexColor("#F2EDDF")
GOLD = HexColor("#C9A227")
MUTED = HexColor("#A7B0BF")

BACK_COPY = [
    ("headline", "Legitimacy precedes capability."),
    ("body",
     "AGS v0.1: Accountability-Gated Systems is the concise edition of Harshal’s "
     "Systems. Part I states the core argument in ten chapters and an epilogue: "
     "execution may be delegated, but legitimacy never migrates — and refusal is "
     "the primary act of responsible control."),
    ("body",
     "Inside: the Core Book, plus Appendix G — the machine-readable AI companion "
     "with stable citation IDs, source provenance, and the complete companion "
     "module printed in Python."),
    ("body",
     "Short edition v0.1, derived from AGS v0.2: Harshal’s Systems. A proposed "
     "framework: normative claims are the author’s own. See the scope note inside "
     "for the evidence boundary."),
]


def register_fonts() -> None:
    import render_ags_v02_pdf as R
    for face in ("T-R", "T-B", "T-I"):
        pdfmetrics.registerFont(TTFont(face, str(FONTS / R.FACES[face])))


def spaced_caps(c: canvas.Canvas, cx: float, y: float, text: str,
                size: float, color, tracking: float = 0.12) -> None:
    c.setFillColor(color)
    c.setFont("T-B", size)
    widths = [pdfmetrics.stringWidth(ch, "T-B", size) for ch in text]
    total = sum(widths) + tracking * size * max(len(text) - 1, 0)
    x = cx - total / 2
    for ch, w in zip(text, widths):
        c.drawString(x, y, ch)
        x += w + tracking * size


def wrap(text: str, font: str, size: float, width: float) -> list[str]:
    words, lines, cur = text.split(" "), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if pdfmetrics.stringWidth(trial, font, size) <= width or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_front(c, fx0, fw, fh, y_base):
    """Front cover design inside the front face (fx0, fw, fh in points)."""
    fcx = fx0 + fw / 2
    y = y_base + fh - 0.92 * IN
    spaced_caps(c, fcx, y, "AGS v0.1:", 11, GOLD)
    y -= 0.46 * IN
    c.setFillColor(IVORY)
    c.setFont("T-B", 21)
    c.drawCentredString(fcx, y, "ACCOUNTABILITY-GATED")
    y -= 0.34 * IN
    c.drawCentredString(fcx, y, "SYSTEMS")
    y -= 0.30 * IN
    c.setFillColor(MUTED)
    c.setFont("T-I", 11)
    c.drawCentredString(fcx, y, "The Core Book + Appendix G")

    art_w, art_h = 5.4 * IN, 3.6 * IN
    art_x, art_y = fcx - art_w / 2, y_base + 1.55 * IN
    c.drawImage(ImageReader(str(ARTWORK)), art_x, art_y, width=art_w, height=art_h,
                preserveAspectRatio=True, mask="auto")
    c.setFillColor(GOLD)
    c.setFont("T-B", 13)
    c.drawCentredString(fcx, y_base + 0.92 * IN, "Harshal Priyavadan Patel")
    spaced_caps(c, fcx, y_base + 0.52 * IN, "SHORT EDITION", 7.5, MUTED)


def draw_back(c, bx0, bw, bh, y_base, spine_edge_x, barcode_clear_from_hinge=0.25 * IN):
    """Back cover design inside the back face; barcode reserve lower-right."""
    y = y_base + bh - 1.05 * IN
    tx0 = bx0 + 0.55 * IN
    tw = bw - 1.10 * IN
    for kind, text in BACK_COPY:
        if kind == "headline":
            c.setFillColor(GOLD)
            c.setFont("T-B", 18)
            c.drawString(tx0, y, text)
            y -= 0.46 * IN
        else:
            c.setFillColor(IVORY)
            c.setFont("T-R", 10.5)
            for line in wrap(text, "T-R", 10.5, tw):
                c.drawString(tx0, y, line)
                y -= 0.215 * IN
            y -= 0.14 * IN
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.line(tx0, y, tx0 + 2.0 * IN, y)
    y -= 0.30 * IN
    c.setFillColor(MUTED)
    c.setFont("T-R", 9)
    c.drawString(tx0, y, "Print volume  ·  6 × 9 in  ·  Black ink interior")

    # Barcode reservation: white 2.0 x 1.2 in box, lower-right of the back face.
    # KDP overprints its ISBN barcode here at upload.
    bw_in, bh_in = 2.0 * IN, 1.2 * IN
    bx1 = bx0 + bw - 0.40 * IN - bw_in
    by1 = y_base + 0.80 * IN
    c.setFillColor(HexColor("#FFFFFF"))
    c.rect(bx1, by1, bw_in, bh_in, stroke=0, fill=1)


def draw_spine(c, sx0, sw, full_h, y_base, fh, label2):
    scx = sx0 + sw / 2
    c.saveState()
    c.translate(scx, y_base + fh / 2)
    c.rotate(270)  # read top-to-bottom
    c.setFillColor(IVORY)
    c.setFont("T-B", 10)
    c.drawCentredString(0, -3.5, "AGS v0.1  ·  ACCOUNTABILITY-GATED SYSTEMS  ·  H. P. Patel")
    c.setFillColor(GOLD)
    c.setFont("T-B", 8.5)
    c.drawCentredString(0, -3.5 - 0.26 * IN, label2)
    c.restoreState()


def build_paperback(paper: str) -> Path:
    spine_in = PAGES * SPINE_RATE[paper]
    full_w = (BLEED_IN + TRIM_W_IN + spine_in + TRIM_W_IN + BLEED_IN) * IN
    full_h = (BLEED_IN + TRIM_H_IN + BLEED_IN) * IN
    out = (HERE / f"AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-cover-PAPERBACK-"
                  f"{paper.upper()}-{PAGES}pp-2026-10-07.pdf")
    c = canvas.Canvas(str(out), pagesize=(full_w, full_h))
    c.setTitle(f"AGS v0.1: Accountability-Gated Systems — 6 x 9 paperback cover ({paper}, {PAGES} pp)")
    c.setAuthor("Harshal Priyavadan Patel")
    c.setSubject("KDP 6 x 9 in paperback wraparound cover, 0.125 in bleed")

    bleed = BLEED_IN * IN
    back_x0 = bleed
    spine_x0 = bleed + TRIM_W_IN * IN
    spine_w = spine_in * IN
    front_x0 = spine_x0 + spine_w
    back_w = TRIM_W_IN * IN
    front_w = TRIM_W_IN * IN
    face_h = TRIM_H_IN * IN

    c.setFillColor(INK)
    c.rect(0, 0, full_w, full_h, stroke=0, fill=1)
    c.setFillColor(INK_SOFT)
    c.rect(front_x0, 0, front_w, full_h, stroke=0, fill=1)

    draw_front(c, front_x0, front_w, face_h, bleed)
    draw_spine(c, spine_x0, spine_w, full_h, bleed, face_h, "SHORT EDITION v0.1")
    draw_back(c, back_x0, back_w, face_h, bleed, spine_x0)

    c.showPage()
    c.save()
    print(f"paperback/{paper}: pages={PAGES} spine={spine_in:.4f} in "
          f"size={full_w:.2f}x{full_h:.2f} pt -> {out.name}")
    return out


def build_hardcover(paper: str) -> Path:
    """DRAFT case-laminate wrap — confirm dimensions in KDP's cover calculator."""
    spine_in = PAGES * SPINE_RATE[paper] + BOARD_IN
    face_w = (TRIM_W_IN + OVERHANG_W_IN) * IN   # board face incl. fore-edge overhang
    face_h = (TRIM_H_IN + OVERHANG_H_IN) * IN   # board face incl. head/foot overhang
    full_w = (2 * WRAP_IN + 2 * (TRIM_W_IN + OVERHANG_W_IN)
              + 2 * HINGE_IN + spine_in) * IN
    full_h = (WRAP_IN + TRIM_H_IN + OVERHANG_H_IN + WRAP_IN) * IN
    out = (HERE / f"AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-cover-HARDCOVER-DRAFT-"
                  f"{paper.upper()}-{PAGES}pp-2026-10-07.pdf")
    c = canvas.Canvas(str(out), pagesize=(full_w, full_h))
    c.setTitle(f"AGS v0.1: Accountability-Gated Systems — 6 x 9 hardcover case wrap DRAFT "
               f"({paper}, {PAGES} pp; confirm dimensions in KDP cover calculator)")
    c.setAuthor("Harshal Priyavadan Patel")
    c.setSubject("KDP 6 x 9 in hardcover case-laminate wrap (DRAFT — verify in KDP cover calculator)")

    wrap = WRAP_IN * IN
    back_x0 = wrap
    back_hinge_x0 = back_x0 + face_w
    spine_x0 = back_hinge_x0 + HINGE_IN * IN
    spine_w = spine_in * IN
    front_hinge_x0 = spine_x0 + spine_w
    front_x0 = front_hinge_x0 + HINGE_IN * IN
    y_base = wrap

    c.setFillColor(INK)
    c.rect(0, 0, full_w, full_h, stroke=0, fill=1)
    c.setFillColor(INK_SOFT)
    c.rect(front_x0, 0, face_w, full_h, stroke=0, fill=1)

    # Design within the trim area of each board face (overhang kept as ground).
    trim_w = TRIM_W_IN * IN
    trim_h = TRIM_H_IN * IN
    draw_front(c, front_x0, trim_w, trim_h, y_base)
    draw_spine(c, spine_x0, spine_w, full_h, y_base, face_h, "SHORT EDITION v0.1")
    draw_back(c, back_x0, trim_w, trim_h, y_base, back_hinge_x0)

    c.showPage()
    c.save()
    print(f"hardcover-DRAFT/{paper}: pages={PAGES} spine={spine_in:.4f} in "
          f"size={full_w:.2f}x{full_h:.2f} pt -> {out.name}")
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--paper", choices=["white", "cream", "both"], default="both")
    ap.add_argument("--binding", choices=["paperback", "hardcover", "both"], default="both")
    args = ap.parse_args()
    register_fonts()
    assert ARTWORK.exists(), f"missing cover art: {ARTWORK}"
    papers = ["white", "cream"] if args.paper == "both" else [args.paper]
    if args.binding in ("paperback", "both"):
        for paper in papers:
            build_paperback(paper)
    if args.binding in ("hardcover", "both"):
        for paper in papers:
            build_hardcover(paper)


if __name__ == "__main__":
    main()
