#!/usr/bin/env python3
"""Build a provisional 6 x 9 in AGS v0.1 interior proof.

This proof is for readability and page-count review only. It is not a final
paperback/hardcover interior: the two assigned ISBNs are both shown together,
contents folios are provisional, and KDP Print Previewer validation is pending.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt
from pypdf import PdfReader, PdfWriter
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import inch

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import build_ags_v02_docx as typeset  # noqa: E402
import render_ags_v02_pdf as renderer  # noqa: E402

BOOK = HERE / "AGS-v0.1-Accountability-Gated-Systems-CORE-BOOK-plus-APPENDIX-G-SOURCE-2026-10-07.txt"
PROOF_DIR = HERE / "ags_v01/proofs"
WORK_DIR = HERE / "ags_v01/proof_work"
DOCX_PATH = PROOF_DIR / "AGS-v0.1-Accountability-Gated-Systems-6x9-PROOF.docx"
PDF_PATH = PROOF_DIR / "AGS-v0.1-Accountability-Gated-Systems-6x9-PROOF-2026-10-07.pdf"

TRIM_W, TRIM_H = 6.0, 9.0
INSIDE, OUTSIDE = 0.75, 0.50
TOP, BOTTOM = 0.625, 0.625
HEADER_FOOTER = 0.32
CORE_TITLE = "Part I — The Core Book"
APP_G_TITLE = "Appendix G — Core Book AI Companion (Machine-Readable Companion to Part I)"
CONTENTS_LABELS = [
    "Part I — The Core Book",
    "Appendix G — Core Book AI Companion (Machine-Readable)",
]


def configure_geometry() -> None:
    typeset.TRIM_WIDTH = TRIM_W
    typeset.TRIM_HEIGHT = TRIM_H
    typeset.INSIDE = INSIDE
    typeset.OUTSIDE = OUTSIDE
    typeset.TOP = TOP
    typeset.BOTTOM = BOTTOM
    typeset.HEADER_DIST = HEADER_FOOTER
    typeset.FOOTER_DIST = HEADER_FOOTER
    typeset.TEXT_WIDTH_IN = TRIM_W - INSIDE - OUTSIDE

    renderer.PAGE_W = TRIM_W * inch
    renderer.PAGE_H = TRIM_H * inch
    renderer.INSIDE = INSIDE * inch
    renderer.OUTSIDE = OUTSIDE * inch
    renderer.TOP = TOP * inch
    renderer.BOTTOM = BOTTOM * inch
    renderer.HEAD_DIST = HEADER_FOOTER * inch
    renderer.FOOT_DIST = HEADER_FOOTER * inch
    renderer.TEXT_W = renderer.PAGE_W - renderer.INSIDE - renderer.OUTSIDE
    renderer.TEXT_H = renderer.PAGE_H - renderer.TOP - renderer.BOTTOM
    renderer.HEADER_TEXT = "AGS v0.1  ·  ACCOUNTABILITY-GATED SYSTEMS"
    renderer.WORK = WORK_DIR
    renderer.FONTS = HERE / "ags_v02/fonts"
    renderer.CELL_STYLE = ParagraphStyle(
        "v01-proof-cell", fontName="T-R", fontSize=7.6, leading=8.8,
        alignment=TA_LEFT, splitLongWords=1,
    )
    # A generous but conventional 10.75-pt body measure tests readability and
    # whether the short title clears the hardcover minimum without padding.
    renderer.BASE_STYLE["Normal"] = (
        "T", 10.75, 13.4, renderer.TA_JUSTIFY, 0.0, 4.0,
        0.0, 0.16 * inch, 0.0, None,
    )
    renderer._STYLE_CACHE.clear()
    renderer._MISS_LOG.clear()

    original_classify = typeset.classify_heading

    def classify_v01(text, next_part, *, in_appendix_g=False):
        # Treat Appendix G as the second section opener so it starts on a recto.
        if text == APP_G_TITLE:
            return "Heading 1", False, next_part + 1
        if text.startswith("Section G.") or text.startswith("G."):
            return "Heading 3", False, next_part
        return original_classify(text, next_part, in_appendix_g=in_appendix_g)

    typeset.classify_heading = classify_v01


def add_centered(doc, text: str, size: float, *, bold: bool = False,
                 italic: bool = False, before: float = 0, after: float = 4) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.first_line_indent = Inches(0)
    r = p.add_run(text)
    typeset.set_run_font(r, typeset.HEAD_FONT if bold else typeset.BODY_FONT,
                         size, bold=bold, italic=italic)


def add_left(doc, text: str, size: float = 10, *, bold: bool = False,
             italic: bool = False, after: float = 4) -> None:
    p = doc.add_paragraph(style="Normal")
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.first_line_indent = Inches(0)
    p.paragraph_format.space_after = Pt(after)
    typeset.add_inline_runs(p, text, size=size)
    if bold or italic:
        for run in p.runs:
            if bold:
                run.bold = True
            if italic:
                run.italic = True


def make_docx() -> tuple[Document, int]:
    lines = BOOK.read_text(encoding="utf-8").splitlines()
    core_indexes = [i for i, line in enumerate(lines) if line == CORE_TITLE]
    if len(core_indexes) != 2:
        raise RuntimeError(f"Expected one contents entry and one body start; found {core_indexes}")
    body_start = core_indexes[-1]

    doc = Document()
    doc.core_properties.title = "AGS v0.1: Accountability-Gated Systems — 6 x 9 Proof"
    doc.core_properties.subject = "Provisional 6 x 9 interior proof; not KDP-final"
    doc.core_properties.author = "Harshal Priyavadan Patel"
    doc.core_properties.keywords = "AGS v0.1, Accountability-Gated Systems, 6 x 9, proof"
    typeset.set_document_styles(doc)
    normal = doc.styles["Normal"]
    normal.font.size = Pt(10.75)
    normal.paragraph_format.line_spacing = 1.08
    normal.paragraph_format.space_after = Pt(4)
    typeset.enable_mirror_margins(doc)

    # 6 x 9 mirrored-margin proof geometry. The same interior can serve either
    # binding; final format-specific ISBN interiors will be split later.
    front = doc.sections[0]
    typeset.set_section_layout(front, first_page_different=True)
    typeset.set_header_footer(front, front_matter=True)
    typeset.set_page_number_format(front, "lowerRoman", 1)

    # Title page. Separate title lines prevent a narrow-trim wrap collision.
    add_centered(doc, "Accountability-Gated", 20, bold=True, before=122, after=10)
    add_centered(doc, "Systems", 20, bold=True, after=18)
    add_centered(doc, "AGS v0.1", 12, bold=True, after=9)
    add_centered(doc, "The Core Book + Appendix G", 12, italic=True, after=42)
    add_centered(doc, "Harshal Priyavadan Patel", 13, bold=True, after=9)
    add_centered(doc, "October 2026", 10, after=2)
    doc.add_page_break()

    # Copyright/ISBN/scope page. Both IDs appear in this review proof only;
    # production interiors will print only the applicable format's ISBN.
    add_centered(doc, "Copyright © 2026 by Harshal Priyavadan Patel", 10, bold=True, before=68, after=5)
    add_centered(doc, "All rights reserved.", 9.5, after=22)
    add_centered(doc, "Paperback ISBN-13: 979-8-24548-379-5", 9, after=4)
    add_centered(doc, "Hardcover ISBN-13: 979-8-16078-278-2", 9, after=20)
    add_left(doc, "SHORT-EDITION SCOPE NOTE", 10, bold=True, after=4)
    add_left(
        doc,
        "This concise edition contains Part I — The Core Book and Appendix G — Core Book AI Companion. "
        "Appendix G is a machine-readable companion to Part I; it repeats the core argument in a "
        "machine-oriented representation and supplies stable identifiers, provenance, and a schema excerpt. "
        "Parts II–XXV, the other appendices, and the consolidated glossary are not included. Cross-references "
        "to omitted sections refer to the Full Book edition.",
        9.3,
        after=3,
    )
    doc.add_page_break()

    # Compact contents page. Folios are deliberately omitted in this first
    # pagination proof and will be filled after approval of the layout.
    add_centered(doc, "CONTENTS", 16, bold=True, before=6, after=18)
    add_left(doc, "Part I — The Core Book", 10.5, bold=True, after=3)
    add_left(doc, "Chapters 1–10 and the Epilogue", 9.5, after=11)
    add_left(doc, "Appendix G — Core Book AI Companion (Machine-Readable)", 10.5, bold=True, after=3)
    add_left(doc, "G.1 Stable Identifiers and Machine Use", 9.5, after=2)
    add_left(doc, "G.2 Source Provenance and Integrity", 9.5, after=2)
    add_left(doc, "G.3 Machine-Readable Schema (Excerpt)", 9.5, after=2)
    doc.add_page_break()

    typeset.add_document_body(doc, lines, body_start)
    if not typeset.body_section_created_check(doc):
        raise RuntimeError("Body section was not created")

    # Keep the final G.3 section heading, its lead-in, and schema snippet
    # together instead of stranding the snippet on a mostly blank final page.
    for idx, paragraph in enumerate(doc.paragraphs):
        if paragraph.text.strip().startswith("Section G.3 — Machine-Readable Schema"):
            paragraph.paragraph_format.keep_with_next = True
            if idx + 1 < len(doc.paragraphs):
                doc.paragraphs[idx + 1].paragraph_format.keep_with_next = True
            break
    trailing_code = []
    for paragraph in reversed(doc.paragraphs):
        if paragraph.style.name == "KDP Code":
            trailing_code.append(paragraph)
        elif paragraph.text.strip():
            break
    for paragraph in trailing_code[1:]:
        paragraph.paragraph_format.keep_with_next = True

    # Use the v0.1 running head on all sections after the title-page section.
    for section in doc.sections:
        section.header.is_linked_to_previous = False
        section.footer.is_linked_to_previous = False
        hp = section.header.paragraphs[0]
        hp.clear()
        hp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        hr = hp.add_run("AGS v0.1  ·  ACCOUNTABILITY-GATED SYSTEMS")
        typeset.set_run_font(hr, typeset.BODY_FONT, 8, bold=True, color="555555")
        if section.different_first_page_header_footer:
            section.first_page_header.paragraphs[0].clear()
            section.first_page_footer.paragraphs[0].clear()

    for paragraph in doc.paragraphs:
        ppr = paragraph._p.pPr
        if ppr is None:
            continue
        sect = ppr.find(typeset.qn("w:sectPr"))
        if sect is None:
            continue
        type_el = sect.find(typeset.qn("w:type"))
        if type_el is None:
            type_el = typeset.OxmlElement("w:type")
            sect.append(type_el)
        type_el.set(typeset.qn("w:val"), "oddPage")

    DOCX_PATH.parent.mkdir(parents=True, exist_ok=True)
    doc.save(DOCX_PATH)
    return doc, body_start


def main() -> dict:
    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    configure_geometry()
    renderer.register_fonts()
    make_docx()

    model = renderer.DocModel(DOCX_PATH)
    if model.n_sections < 2:
        raise RuntimeError(f"Expected front matter and body sections; got {model.n_sections}")
    front_pages = renderer.front_page_count(model, CONTENTS_LABELS)
    pad_blank = front_pages % 2 == 1
    body_start = front_pages + (2 if pad_blank else 1)
    result = renderer.build_pdf(
        model,
        CONTENTS_LABELS,
        PDF_PATH,
        body_start=body_start,
        pad_blank=pad_blank,
        part_blanks=set(),
    )
    # If the measured Appendix G opener is a verso, add one intentional blank
    # so the appendix begins on a recto; one blank is the only possible flip.
    appg_page = result["anchors"].get(CONTENTS_LABELS[1])
    if appg_page is None:
        raise RuntimeError("Appendix G opener anchor was not measured")
    if appg_page % 2 == 0:
        result = renderer.build_pdf(
            model,
            CONTENTS_LABELS,
            PDF_PATH,
            body_start=body_start,
            pad_blank=pad_blank,
            part_blanks={2},
        )
    if renderer._MISS_LOG:
        raise RuntimeError(f"Missing glyphs: {sorted(set(renderer._MISS_LOG))[:20]}")

    # Mark metadata as a review proof, not a print-ready submission.
    reader = PdfReader(str(PDF_PATH))
    writer = PdfWriter()
    writer.append(reader)
    writer.add_metadata({
        "/Title": "AGS v0.1: Accountability-Gated Systems — 6 x 9 Proof",
        "/Author": "Harshal Priyavadan Patel",
        "/Subject": "Provisional 6 x 9 interior proof for readability/page-count review; not KDP-final",
        "/Keywords": "AGS v0.1, Accountability-Gated Systems, 6 x 9 proof",
        "/Creator": "HarshalOS AGS v0.1 proof pipeline (ReportLab)",
    })
    tmp = PDF_PATH.with_suffix(".tmp.pdf")
    with tmp.open("wb") as fh:
        writer.write(fh)
    tmp.replace(PDF_PATH)

    return {
        "docx": str(DOCX_PATH),
        "pdf": str(PDF_PATH),
        "trim_inches": [TRIM_W, TRIM_H],
        "inside_outside_margins_inches": [INSIDE, OUTSIDE],
        "front_matter_pages": front_pages,
        "body_starts_physical_page": body_start,
        "physical_pages": len(PdfReader(str(PDF_PATH)).pages),
        "part_i_physical_page": result["anchors"].get(CONTENTS_LABELS[0]),
        "appendix_g_physical_page": result["anchors"].get(CONTENTS_LABELS[1]),
        "appendix_g_starts_recto": bool(result["anchors"][CONTENTS_LABELS[1]] % 2),
        "intentional_blank_pages": result["blanks"],
        "body_font_pt": 10.75,
        "content_start_folio": 1,
        "contents_folios": "not populated in this proof",
        "hardcover_75_page_minimum_met": len(PdfReader(str(PDF_PATH)).pages) >= 75,
    }


if __name__ == "__main__":
    print(json.dumps(main(), ensure_ascii=False, indent=2))
