#!/usr/bin/env python3
"""KDP wraparound cover generator — Book I Production Edition v2.2.

Builds the single-PDF wraparound cover (back + spine + front) for the
8.25 x 11 in no-bleed interior, in BOTH paper variants KDP offers for
black-ink interiors:

  white : spine = pages x 0.002252 in   (514 pp -> 1.1575 in)
  cream : spine = pages x 0.0025   in   (514 pp -> 1.2850 in)

KDP applies its own barcode over the white box at upload; the box printed
here reserves that space. All live matter stays >= 0.25 in from trim, and
spine text stays clear of the folds. Fonts are the vendored print faces.

Usage:
    python3 publications/book/build_kdp_v22_cover.py            # both variants
    python3 publications/book/build_kdp_v22_cover.py --paper white
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
FONTS = HERE / "kdp_v22" / "fonts"
sys.path.insert(0, str(HERE))

from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

PAGES = 514
TRIM_W_IN = 8.25
TRIM_H_IN = 11.0
BLEED_IN = 0.125
SPINE_RATE = {"white": 0.002252, "cream": 0.0025}
IN = 72.0

INK = HexColor("#141C2B")
INK_SOFT = HexColor("#1E2A3F")
IVORY = HexColor("#F2EDDF")
GOLD = HexColor("#C9A227")
MUTED = HexColor("#A7B0BF")
PAPER_LINE = HexColor("#2C3A52")

BACK_COPY = [
    ("headline", "Legitimacy precedes capability."),
    ("body",
     "Harshal\u2019s Systems \u2014 Book I is the foundational volume of a proposed "
     "framework for accountable intelligent systems. Part I states the core argument "
     "in ten chapters and an epilogue: execution may be delegated, but legitimacy "
     "never migrates \u2014 and refusal is the primary act of responsible control."),
    ("body",
     "Inside: formalization and constraint equations \u00b7 Accountability-Gated "
     "Systems (AGS) \u00b7 the Orb Communicator Model \u00b7 Ground-0 phase detection "
     "\u00b7 twenty-five parts and seven appendices \u2014 including the machine-readable "
     "Appendix G companion to Part I \u2014 plus a consolidated glossary, worked "
     "examples, and end-of-part review questions for AI and systems engineering courses."),
    ("body",
     "Production Edition v2.2. A proposed framework: normative claims are the "
     "author\u2019s own. See the status register inside for the evidence boundary "
     "of every part."),
]


def register_fonts() -> None:
    import render_kdp_v22_pdf as R
    for face in ("T-R", "T-B", "T-I"):
        pdfmetrics.registerFont(TTFont(face, str(FONTS / R.FACES[face])))


def spaced_caps(c: canvas.Canvas, cx: float, y: float, text: str,
                size: float, color, tracking: float = 0.12) -> None:
    # Manual letterspacing (tracking in em): draw glyph-by-glyph so no Tc
    # graphics state can leak into later text.
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


def build(paper: str) -> Path:
    assert paper in SPINE_RATE
    spine_in = PAGES * SPINE_RATE[paper]
    full_w = (BLEED_IN + TRIM_W_IN + spine_in + TRIM_W_IN + BLEED_IN) * IN
    full_h = (BLEED_IN + TRIM_H_IN + BLEED_IN) * IN

    out = (HERE / f"HARSHAL-SYSTEMS-Book-I-KDP-cover-wrap-v2.2-2026-10-07"
                  f"-{paper.upper()}-{PAGES}pp.pdf")
    c = canvas.Canvas(str(out), pagesize=(full_w, full_h))
    c.setTitle(f"Harshal\u2019s Systems \u2014 Book I v2.2 wraparound cover ({paper}, {PAGES} pp)")
    c.setAuthor("Harshal Priyavadan Patel")
    c.setSubject("KDP 8.25 x 11 in wraparound cover, 0.125 in bleed")

    bleed = BLEED_IN * IN
    back_x0 = bleed
    spine_x0 = bleed + TRIM_W_IN * IN
    spine_w = spine_in * IN
    front_x0 = spine_x0 + spine_w
    front_cx = front_x0 + TRIM_W_IN * IN / 2
    spine_cx = spine_x0 + spine_w / 2
    back_cx = back_x0 + TRIM_W_IN * IN / 2

    # Ground.
    c.setFillColor(INK)
    c.rect(0, 0, full_w, full_h, stroke=0, fill=1)
    c.setFillColor(INK_SOFT)
    c.rect(front_x0, 0, TRIM_W_IN * IN, full_h, stroke=0, fill=1)

    # ------------------------------- FRONT -------------------------------
    y = full_h - bleed - 2.05 * IN
    spaced_caps(c, front_cx, y, "PRODUCTION EDITION  \u00b7  VERSION 2.2", 11, GOLD)
    y -= 0.62 * IN
    c.setFillColor(IVORY)
    c.setFont("T-B", 44)
    c.drawCentredString(front_cx, y, "HARSHAL\u2019S SYSTEMS")
    y -= 0.42 * IN
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.5)
    rule_w = 3.4 * IN
    c.line(front_cx - rule_w / 2, y, front_cx + rule_w / 2, y)
    y -= 0.62 * IN
    c.setFillColor(IVORY)
    c.setFont("T-B", 30)
    c.drawCentredString(front_cx, y, "BOOK I")
    y -= 0.52 * IN
    c.setFont("T-I", 21)
    c.setFillColor(MUTED)
    c.drawCentredString(front_cx, y, "The Ultimate User Manual")
    y -= 0.75 * IN
    c.setFont("T-R", 11.5)
    c.setFillColor(IVORY)
    for line in ("Ten chapters and an epilogue on legitimacy, delegation,",
                 "accountability, and refusal \u2014 with formalization,",
                 "worked examples, and review questions."):
        c.drawCentredString(front_cx, y, line)
        y -= 0.245 * IN
    c.setFont("T-B", 15)
    c.setFillColor(GOLD)
    c.drawCentredString(front_cx, bleed + 1.55 * IN, "Harshal Priyavadan Patel")
    spaced_caps(c, front_cx, bleed + 1.12 * IN, "BOOK I  OF  HARSHAL\u2019S  SYSTEMS", 9, MUTED)

    # ------------------------------- SPINE -------------------------------
    c.saveState()
    c.translate(spine_cx, full_h / 2)
    c.rotate(270)  # read top-to-bottom
    c.setFillColor(IVORY)
    c.setFont("T-B", 12)
    c.drawCentredString(0, -4, "HARSHAL\u2019S SYSTEMS  \u00b7  BOOK I  \u00b7  H. Priyavadan Patel")
    c.setFillColor(GOLD)
    c.setFont("T-B", 10)
    c.drawCentredString(0, -4 - 0.30 * IN, "PRODUCTION EDITION v2.2")
    c.restoreState()

    # -------------------------------- BACK -------------------------------
    y = full_h - bleed - 1.15 * IN
    bx0 = back_x0 + 0.65 * IN
    bw = TRIM_W_IN * IN - 1.30 * IN
    for kind, text in BACK_COPY:
        if kind == "headline":
            c.setFillColor(GOLD)
            c.setFont("T-B", 20)
            c.drawString(bx0, y, text)
            y -= 0.52 * IN
        else:
            c.setFillColor(IVORY)
            c.setFont("T-R", 11.5)
            for line in wrap(text, "T-R", 11.5, bw):
                c.drawString(bx0, y, line)
                y -= 0.235 * IN
            y -= 0.16 * IN
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.line(bx0, y, bx0 + 2.2 * IN, y)
    y -= 0.32 * IN
    c.setFillColor(MUTED)
    c.setFont("T-R", 10)
    c.drawString(bx0, y, "Print volume  \u00b7  8.25 \u00d7 11 in  \u00b7  Black ink interior")

    # Barcode reservation: white 2.0 x 1.2 in box, lower-right of the back
    # (spine side), clear of trim and fold. KDP overprints its barcode here.
    bw_in, bh_in = 2.0 * IN, 1.2 * IN
    bx1 = spine_x0 - 0.375 * IN - bw_in
    by1 = bleed + 0.375 * IN
    c.setFillColor(HexColor("#FFFFFF"))
    c.rect(bx1, by1, bw_in, bh_in, stroke=0, fill=1)
    c.setFillColor(HexColor("#333333"))
    c.setFont("T-R", 8)
    c.drawCentredString(bx1 + bw_in / 2, by1 + 0.62 * IN, "ISBN 979-8-\u2011\u2011\u2011\u2011\u2011\u2011\u2011\u2011")
    c.drawCentredString(bx1 + bw_in / 2, by1 + 0.42 * IN, "(assign in KDP)")
    c.drawCentredString(bx1 + bw_in / 2, by1 + 0.22 * IN, "barcode prints here")

    c.showPage()
    c.save()
    print(f"{paper}: spine={spine_in:.4f} in size={full_w:.2f}x{full_h:.2f} pt -> {out.name}")
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--paper", choices=["white", "cream", "both"], default="both")
    args = ap.parse_args()
    register_fonts()
    papers = ["white", "cream"] if args.paper == "both" else [args.paper]
    for paper in papers:
        build(paper)


if __name__ == "__main__":
    main()
