#!/usr/bin/env python3
"""KDP wraparound cover generator — AGS v0.1: Accountability-Gated Systems.

Builds the single-PDF wraparound covers for the 6 x 9 in no-bleed interior,
in both bindings and both interior paper stocks:

  paperback (full wrap, 0.125 in bleed):
      spine = pages x paper rate
      width = 0.125 + 6 + spine + 6 + 0.125 ; height = 0.125 + 9 + 0.125

  hardcover (case laminate, KDP published constants):
      spine = pages x paper rate + 0.189 in (case binding allowance)
      wrap  = 0.591 in turn-in on all four sides
      board overhang = 0.197 in (fore-edge, per board) and 0.118 in (top and
      bottom, each); a 0.394 in hinge zone sits inside each panel beside the
      spine and carries no type
      width = 0.591 + (6 + 0.197) + spine + (6 + 0.197) + 0.591
      height = 0.591 + 0.118 + 9 + 0.118 + 0.591

  white : spine rate 0.002252 in/page   (130 pp -> 0.2928 in)
  cream : spine rate 0.0025   in/page   (130 pp -> 0.3250 in)

KDP applies its own barcode over the white reservation box at upload; the box
printed here reserves that space. All live matter stays clear of trim, folds,
and hinge zones. Fonts are the vendored print faces. The front-panel art is
the prepared IMG_7067 derivative (2250 x 1500 px, 300 dpi, 3:2) placed
uncropped at 4.5 x 3 in (500 dpi effective).

Usage:
    python3 publications/book/build_ags_v01_cover.py            # all four
    python3 publications/book/build_ags_v01_cover.py --binding paperback
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

SPINE_RATE = {"white": 0.002252, "cream": 0.0025}
BLEED_IN = 0.125            # paperback bleed, each outer side
HC_WRAP_IN = 0.591          # hardcover case turn-in, each side
HC_OVER_W_IN = 0.197        # hardcover board overhang, fore-edge, per board
HC_OVER_H_IN = 0.118        # hardcover board overhang, top and bottom each
HC_SPINE_ADD_IN = 0.189     # hardcover spine binding allowance
HC_HINGE_IN = 0.394         # hinge zone inside each panel beside the spine

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
     "Systems. It carries Part I, The Core Book — ten chapters and an epilogue "
     "stating the core argument: execution may be delegated, but legitimacy "
     "never migrates, and refusal is the primary act of responsible control."),
    ("body",
     "Inside: the complete Core Book text, plus Appendix G — the machine-readable "
     "companion with stable identifiers, source provenance, and the complete "
     "companion module printed in Python, with a built-in self-test and "
     "JSON/Markdown export."),
    ("body",
     "Short edition v0.1 of AGS v0.2: Harshal’s Systems (Full Book). A proposed "
     "framework: normative claims are the author’s own. See the status register "
     "inside for the evidence boundary of the text."),
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


def geometry(binding: str, paper: str):
    """Return (full_w_in, full_h_in, zones) with zones in inches, x from left."""
    spine_in = PAGES * SPINE_RATE[paper]
    if binding == "paperback":
        spine_in = spine_in
        full_w = 2 * BLEED_IN + 2 * TRIM_W_IN + spine_in
        full_h = 2 * BLEED_IN + TRIM_H_IN
        back_trim = (BLEED_IN, BLEED_IN + TRIM_W_IN)
        spine = (back_trim[1], back_trim[1] + spine_in)
        front_trim = (spine[1], spine[1] + TRIM_W_IN)
        trim_top = BLEED_IN + TRIM_H_IN
        trim_bottom = BLEED_IN
        barcode_clear = 0.375   # inches left of the spine edge
    else:
        spine_in = spine_in + HC_SPINE_ADD_IN
        board_w = TRIM_W_IN + HC_OVER_W_IN
        full_w = 2 * HC_WRAP_IN + 2 * board_w + spine_in
        full_h = 2 * HC_WRAP_IN + 2 * HC_OVER_H_IN + TRIM_H_IN
        back_x0 = HC_WRAP_IN
        back_trim = (back_x0 + HC_OVER_W_IN, back_x0 + board_w)
        spine = (back_trim[1], back_trim[1] + spine_in)
        front_x0 = spine[1]
        front_trim = (front_x0, front_x0 + TRIM_W_IN)
        trim_top = HC_WRAP_IN + HC_OVER_H_IN + TRIM_H_IN
        trim_bottom = HC_WRAP_IN + HC_OVER_H_IN
        barcode_clear = 0.50    # keep the reserve clear of the hinge zone
    return {
        "spine_in": spine_in,
        "full_w": full_w,
        "full_h": full_h,
        "back_trim": back_trim,
        "spine": spine,
        "front_trim": front_trim,
        "trim_top": trim_top,
        "trim_bottom": trim_bottom,
        "barcode_clear": barcode_clear,
    }


def build(binding: str, paper: str) -> Path:
    g = geometry(binding, paper)
    spine_in, full_w, full_h = g["spine_in"], g["full_w"], g["full_h"]
    back_x0, back_x1 = g["back_trim"]
    spine_x0, spine_x1 = g["spine"]
    front_x0, front_x1 = g["front_trim"]
    trim_top, trim_bottom = g["trim_top"], g["trim_bottom"]

    assert ARTWORK.exists(), f"missing cover art: {ARTWORK}"
    out = (HERE / "ags_v01" /
           f"AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-cover-{binding.upper()}-{paper.upper()}"
           f"-{PAGES}pp-2026-10-07.pdf")
    c = canvas.Canvas(str(out), pagesize=(full_w * IN, full_h * IN))
    c.setTitle(f"AGS v0.1: Accountability-Gated Systems — 6 × 9 {binding} cover ({paper}, {PAGES} pp)")
    c.setAuthor("Harshal Priyavadan Patel")
    c.setSubject(f"KDP 6 x 9 in {binding} wraparound cover")

    # Ground.
    c.setFillColor(INK)
    c.rect(0, 0, full_w * IN, full_h * IN, stroke=0, fill=1)
    c.setFillColor(INK_SOFT)
    c.rect(front_x0 * IN, 0, TRIM_W_IN * IN, full_h * IN, stroke=0, fill=1)

    front_cx = (front_x0 + front_x1) / 2 * IN
    trim_h = trim_top - trim_bottom

    # ------------------------------- FRONT -------------------------------
    spaced_caps(c, front_cx, (trim_top - 0.82) * IN, "AGS v0.1", 11, GOLD)
    c.setFillColor(IVORY)
    c.setFont("T-B", 27)
    c.drawCentredString(front_cx, (trim_top - 1.32) * IN, "ACCOUNTABILITY-GATED")
    c.drawCentredString(front_cx, (trim_top - 1.82) * IN, "SYSTEMS")
    c.setFillColor(MUTED)
    c.setFont("T-I", 11.5)
    c.drawCentredString(front_cx, (trim_top - 2.22) * IN, "The Core Book + Appendix G")

    art_w, art_h = 4.5 * IN, 3.0 * IN
    art_x = front_cx - art_w / 2
    art_y = (trim_bottom + 2.35) * IN
    c.drawImage(ImageReader(str(ARTWORK)), art_x, art_y, width=art_w, height=art_h,
                preserveAspectRatio=True, mask="auto")
    c.setFillColor(GOLD)
    c.setFont("T-B", 14)
    c.drawCentredString(front_cx, (trim_bottom + 1.45) * IN, "Harshal Priyavadan Patel")
    spaced_caps(c, front_cx, (trim_bottom + 0.85) * IN, "HARSHAL’S SYSTEMS", 8, MUTED)

    # ------------------------------- SPINE -------------------------------
    c.saveState()
    c.translate(((spine_x0 + spine_x1) / 2) * IN, (trim_bottom + trim_h / 2) * IN)
    c.rotate(270)  # read top-to-bottom
    c.setFillColor(IVORY)
    c.setFont("T-B", 11)
    c.drawCentredString(0, -4, "AGS v0.1  ·  ACCOUNTABILITY-GATED SYSTEMS  ·  H. P. Patel")
    c.setFillColor(GOLD)
    c.setFont("T-B", 9)
    c.drawCentredString(0, -4 - 0.28 * IN, "THE CORE BOOK + APPENDIX G")
    c.restoreState()

    # -------------------------------- BACK -------------------------------
    y = (trim_top - 1.00) * IN
    bx0 = back_x0 * IN + 0.65 * IN
    bw = (back_x1 - back_x0) * IN - 1.30 * IN
    for kind, text in BACK_COPY:
        if kind == "headline":
            c.setFillColor(GOLD)
            c.setFont("T-B", 18)
            c.drawString(bx0, y, text)
            y -= 0.48 * IN
        else:
            c.setFillColor(IVORY)
            c.setFont("T-R", 10.5)
            for line in wrap(text, "T-R", 10.5, bw):
                c.drawString(bx0, y, line)
                y -= 0.21 * IN
            y -= 0.14 * IN
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.line(bx0, y, bx0 + 2.0 * IN, y)
    y -= 0.30 * IN
    c.setFillColor(MUTED)
    c.setFont("T-R", 9.5)
    c.drawString(bx0, y, "Print volume  ·  6 × 9 in  ·  Black ink interior")

    # Barcode reservation: white 2.0 x 1.2 in box on the back cover,
    # lower-right, clear of trim, folds, and (hardcover) the hinge zone.
    bw_in, bh_in = 2.0 * IN, 1.2 * IN
    bx1 = spine_x0 * IN - g["barcode_clear"] * IN - bw_in
    by1 = trim_bottom * IN + 0.375 * IN
    c.setFillColor(HexColor("#FFFFFF"))
    c.rect(bx1, by1, bw_in, bh_in, stroke=0, fill=1)

    c.showPage()
    c.save()
    print(f"{binding}/{paper}: pages={PAGES} spine={spine_in:.4f} in "
          f"size={full_w:.4f}x{full_h:.4f} in -> {out.name}")
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--binding", choices=["paperback", "hardcover", "both"], default="both")
    ap.add_argument("--paper", choices=["white", "cream", "both"], default="both")
    args = ap.parse_args()
    register_fonts()
    bindings = ["paperback", "hardcover"] if args.binding == "both" else [args.binding]
    papers = ["white", "cream"] if args.paper == "both" else [args.paper]
    for binding in bindings:
        for paper in papers:
            build(binding, paper)


if __name__ == "__main__":
    main()
