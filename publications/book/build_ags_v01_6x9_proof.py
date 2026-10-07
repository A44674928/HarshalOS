#!/usr/bin/env python3
"""Build a provisional 6 x 9 in AGS v0.1 interior proof for both bindings.

This is a readability/page-count proof, not a KDP upload file: its contents
folio references are intentionally marked provisional, and there is no cover.
The Core Book and Appendix G source spans are reused verbatim.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "AGS-v0.1-Accountability-Gated-Systems-CORE-BOOK-plus-APPENDIX-G-SOURCE-2026-10-07.txt"
OUTDIR = HERE / "ags_v01"
DOCX_OUT = OUTDIR / "AGS-v0.1-Accountability-Gated-Systems-6x9-INTERIOR-PROOF-2026-10-07.docx"
PDF_OUT = OUTDIR / "AGS-v0.1-Accountability-Gated-Systems-6x9-INTERIOR-PROOF-2026-10-07.pdf"
AUDIT_OUT = OUTDIR / "AGS-v0.1-Accountability-Gated-Systems-6x9-PROOF-AUDIT-2026-10-07.json"
WORK = HERE / "build" / "ags_v01_6x9_proof"

CORE_TITLE = "Part I — The Core Book"
APPENDIX_TITLE = "Appendix G — Core Book AI Companion (Machine-Readable Companion to Part I)"


def configure_renderers():
    sys.path.insert(0, str(HERE))
    import build_ags_v02_docx as fmt
    import render_ags_v02_pdf as render

    # Shared style/parser logic, with geometry and folios scoped to this proof.
    fmt.TRIM_WIDTH, fmt.TRIM_HEIGHT = 6.0, 9.0
    fmt.INSIDE, fmt.OUTSIDE = 0.70, 0.55
    fmt.TOP, fmt.BOTTOM = 0.60, 0.60
    fmt.HEADER_DIST, fmt.FOOTER_DIST = 0.31, 0.32
    fmt.TEXT_WIDTH_IN = 4.75

    def add_code_paragraph_6x9(doc, line):
        p = doc.add_paragraph(style="KDP Code")
        p.paragraph_format.left_indent = Inches(0.04)
        p.paragraph_format.first_line_indent = Inches(0)
        p.paragraph_format.keep_together = True
        fmt.add_inline_runs(p, line.rstrip(), force_code=True, size=8.0)
        return p
    fmt.add_code_paragraph = add_code_paragraph_6x9

    original_inline_runs = fmt.add_inline_runs
    def add_inline_runs_6x9(paragraph, text, *, force_code=False, size=None):
        # The shared table formatter requests 8.2 pt; use 7.8 pt in the
        # narrower 6 x 9 proof to preserve cell padding and avoid clipping.
        if size == 8.2:
            size = 7.8
        return original_inline_runs(paragraph, text, force_code=force_code, size=size)
    fmt.add_inline_runs = add_inline_runs_6x9

    original_classify = fmt.classify_heading
    def classify_heading_6x9(text, next_part, *, in_appendix_g=False):
        if text == "Epilogue — Directive: Halt When Authority Fails":
            return "Heading 2", True, next_part
        return original_classify(text, next_part, in_appendix_g=in_appendix_g)
    fmt.classify_heading = classify_heading_6x9

    def header_footer_6x9(section, *, front_matter=False):
        section.header.is_linked_to_previous = False
        section.footer.is_linked_to_previous = False
        hp = section.header.paragraphs[0]
        hp.clear()
        hp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        hp.paragraph_format.space_after = Pt(0)
        hr = hp.add_run("AGS v0.1  ·  ACCOUNTABILITY-GATED SYSTEMS")
        fmt.set_run_font(hr, fmt.BODY_FONT, 7.5, bold=True, color="555555")
        fp = section.footer.paragraphs[0]
        fp.clear()
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        fp.paragraph_format.space_before = Pt(0)
        fp.paragraph_format.space_after = Pt(0)
        fmt.add_page_field(fp)
        for run in fp.runs:
            fmt.set_run_font(run, fmt.BODY_FONT, 8, color="555555")
        if section.different_first_page_header_footer:
            section.first_page_header.paragraphs[0].clear()
            section.first_page_footer.paragraphs[0].clear()
    fmt.set_header_footer = header_footer_6x9

    # Update the ReportLab renderer to the same 6 x 9 mirrored-margin geometry.
    from reportlab.lib.pagesizes import inch as rl_inch
    render.PAGE_W, render.PAGE_H = 6.0 * rl_inch, 9.0 * rl_inch
    render.INSIDE, render.OUTSIDE = 0.70 * rl_inch, 0.55 * rl_inch
    render.TOP, render.BOTTOM = 0.60 * rl_inch, 0.60 * rl_inch
    render.HEAD_DIST, render.FOOT_DIST = 0.31 * rl_inch, 0.32 * rl_inch
    render.TEXT_W = render.PAGE_W - render.INSIDE - render.OUTSIDE
    render.TEXT_H = render.PAGE_H - render.TOP - render.BOTTOM
    render.HEADER_TEXT = "AGS v0.1  ·  ACCOUNTABILITY-GATED SYSTEMS"
    render.WORK = WORK
    render.WORK.mkdir(parents=True, exist_ok=True)
    render.FONTS = HERE / "ags_v02" / "fonts"
    render._STYLE_CACHE.clear()
    render.BASE_STYLE = {
        "Normal": ("T", 11.0, 13.65, render.TA_JUSTIFY, 0.0, 4.0, 0.0, 0.15 * rl_inch, 0.0, None),
        "Heading 1": ("T", 15.5, 18.0, render.TA_CENTER, 0.0, 10.0, 0.0, 0.0, 0.0, render.HexColor("#111111")),
        "Heading 2": ("T", 12.25, 14.2, render.TA_LEFT, 9.0, 4.0, 0.0, 0.0, 0.0, render.HexColor("#111111")),
        "Heading 3": ("T", 10.4, 12.1, render.TA_LEFT, 6.0, 2.5, 0.0, 0.0, 0.0, render.HexColor("#111111")),
        "Heading 4": ("T", 9.8, 11.4, render.TA_LEFT, 5.0, 2.0, 0.0, 0.0, 0.0, render.HexColor("#111111")),
        "KDP Code": ("C", 8.0, 9.35, render.TA_LEFT, 0.0, 2.0, 0.04 * rl_inch, 0.0, 0.0, None),
        "KDP Bullet": ("T", 9.7, 11.1, render.TA_LEFT, 0.0, 2.5, 0.25 * rl_inch, -0.16 * rl_inch, 0.0, None),
        "KDP Numbered": ("T", 9.7, 11.1, render.TA_LEFT, 0.0, 2.5, 0.25 * rl_inch, -0.16 * rl_inch, 0.0, None),
        "KDP Checkbox": ("T", 9.4, 10.8, render.TA_LEFT, 0.0, 2.5, 0.25 * rl_inch, -0.16 * rl_inch, 0.0, None),
        "KDP Quote": ("T", 9.6, 11.0, render.TA_LEFT, 0.0, 2.5, 0.30 * rl_inch, 0.0, 0.22 * rl_inch, None),
        "KDP Table Text": ("T", 7.8, 9.1, render.TA_LEFT, 0.0, 0.0, 0.0, 0.0, 0.0, None),
    }
    render.CELL_STYLE = render.ParagraphStyle(
        "cell-6x9", fontName="T-R", fontSize=7.8, leading=9.1,
        alignment=render.TA_LEFT, splitLongWords=1,
    )
    render.HEADER_TEXT = "AGS v0.1  ·  ACCOUNTABILITY-GATED SYSTEMS"

    # The shared reportlab KDPDoc class contains v0.2 metadata; override it for
    # this clearly labelled proof.
    base_doc_class = render.KDPDoc
    class V01ProofDoc(base_doc_class):
        def __init__(self, filename, *, body_start: int, **kw):
            super().__init__(filename, body_start=body_start, **kw)
            self.title = "AGS v0.1: Accountability-Gated Systems — 6 x 9 Proof"
            self.author = "Harshal Priyavadan Patel"
    render.KDPDoc = V01ProofDoc

    labels = [CORE_TITLE, APPENDIX_TITLE]
    def anchor_keys_6x9(heading_text, _labels):
        if heading_text.startswith(CORE_TITLE):
            return [CORE_TITLE]
        if heading_text.startswith("Appendix G — Core Book AI Companion"):
            return [APPENDIX_TITLE]
        return []
    render.anchor_keys = anchor_keys_6x9
    render.register_fonts()
    return fmt, render, labels


def add_centered(doc, text: str, size: float, *, bold=False, italic=False,
                 before=0, after=5, font="Times New Roman"):
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Pt
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.first_line_indent = Inches(0)
    run = p.add_run(text)
    run.font.name = font
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    return p


def make_docx(fmt) -> tuple[int, int]:
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Inches, Pt

    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    part_indices = [i for i, line in enumerate(lines) if line.strip() == CORE_TITLE]
    if len(part_indices) < 2:
        raise RuntimeError(f"Expected TOC and body Part I headings, found {part_indices}")
    body_start = part_indices[-1]
    contents_start = lines.index("CONTENTS")
    scope_start = lines.index("SHORT-EDITION SCOPE NOTE")
    scope_lines = lines[scope_start + 1:contents_start]
    scope_note = " ".join(line.strip() for line in scope_lines if line.strip())

    doc = Document()
    doc.core_properties.title = "AGS v0.1: Accountability-Gated Systems — 6 x 9 Proof"
    doc.core_properties.subject = "6 x 9 in readability and page-count proof for paperback and hardcover"
    doc.core_properties.author = "Harshal Priyavadan Patel"
    doc.core_properties.keywords = "AGS v0.1, Accountability-Gated Systems, 6 x 9, proof"

    fmt.set_document_styles(doc)
    # Enlarged proof typography gives the short volume a comfortable measure
    # while testing whether the hardcover minimum can be met without padding.
    styles = doc.styles
    styles["Normal"].font.size = Pt(11.0)
    styles["Normal"].paragraph_format.line_spacing = 1.08
    styles["Normal"].paragraph_format.space_after = Pt(4.0)
    styles["Heading 1"].font.size = Pt(15.5)
    styles["Heading 2"].font.size = Pt(12.25)
    styles["Heading 3"].font.size = Pt(10.4)
    styles["KDP Code"].font.size = Pt(8.0)
    styles["KDP Code"].paragraph_format.line_spacing = 1.0
    styles["KDP Table Text"].font.size = Pt(7.8)
    fmt.enable_mirror_margins(doc)

    front = doc.sections[0]
    fmt.set_section_layout(front, first_page_different=True)
    fmt.set_header_footer(front, front_matter=True)
    fmt.set_page_number_format(front, "lowerRoman", 1)

    # Title page.
    add_centered(doc, "ACCOUNTABILITY-GATED", 22, bold=True, before=104, after=0, font=fmt.HEAD_FONT)
    add_centered(doc, "SYSTEMS", 22, bold=True, before=11, after=18, font=fmt.HEAD_FONT)
    add_centered(doc, "AGS v0.1", 14, bold=True, after=8)
    add_centered(doc, "The Core Book + Appendix G", 11, italic=True, after=35)
    add_centered(doc, "Harshal Priyavadan Patel", 12, bold=True, after=6)
    add_centered(doc, "October 2026", 10, after=35)
    add_centered(doc, "6 × 9 in · PROOF COPY", 9, bold=True, after=4)
    add_centered(doc, "For readability and page-count review; not for KDP upload", 8.5, italic=True, after=0)
    doc.add_page_break()

    # Copyright / ISBN page. These identifiers are reproduced as supplied.
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(94)
    p.paragraph_format.space_after = Pt(12)
    p.paragraph_format.first_line_indent = Inches(0)
    r = p.add_run("Copyright © 2026 by Harshal Priyavadan Patel")
    fmt.set_run_font(r, fmt.BODY_FONT, 9.5, bold=True)
    add_centered(doc, "All rights reserved.", 9, after=20)
    add_centered(doc, "ISBN-13 (Paperback): 979-8-24548-379-5", 9, after=3)
    add_centered(doc, "ISBN-13 (Hardcover): 979-8-16078-278-2", 9, after=15)
    add_centered(doc, "Trim/layout in this proof is provisional pending author review.", 8.5, italic=True, after=0)
    doc.add_page_break()

    # Scope note page.
    h = doc.add_paragraph(style="Heading 1")
    h.paragraph_format.space_before = Pt(26)
    h.paragraph_format.space_after = Pt(12)
    fmt.add_inline_runs(h, "SHORT-EDITION SCOPE NOTE")
    p = doc.add_paragraph(style="Normal")
    p.paragraph_format.first_line_indent = Inches(0)
    fmt.add_inline_runs(p, scope_note)
    doc.add_page_break()

    # Proof contents page; folios deliberately wait for trim approval.
    h = doc.add_paragraph(style="Heading 1")
    h.paragraph_format.space_before = Pt(22)
    h.paragraph_format.space_after = Pt(13)
    fmt.add_inline_runs(h, "CONTENTS")
    contents_end = body_start
    content_lines = lines[contents_start + 1:contents_end]
    for line in content_lines:
        text = line.strip()
        if not text:
            continue
        p = doc.add_paragraph(style="Normal")
        p.paragraph_format.first_line_indent = Inches(0)
        p.paragraph_format.left_indent = Inches(0.16 if text.startswith("G.") or text.startswith("Chapters") else 0)
        p.paragraph_format.space_after = Pt(5 if not text.startswith("  ") else 3)
        fmt.add_inline_runs(p, text)
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.first_line_indent = Inches(0)
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r = p.add_run("Proof note: contents folios will be inserted after this trim and layout are approved.")
    fmt.set_run_font(r, fmt.BODY_FONT, 8.5, italic=True, color="555555")

    # Render the source spans themselves, beginning at the true body Part I.
    fmt.add_document_body(doc, lines, body_start)

    # Normalize section breaks to odd-page starts for the Core Book.
    for paragraph in doc.paragraphs:
        pPr = paragraph._p.pPr
        if pPr is None:
            continue
        sect = pPr.find(fmt.qn("w:sectPr"))
        if sect is None:
            continue
        type_el = sect.find(fmt.qn("w:type"))
        if type_el is None:
            type_el = fmt.OxmlElement("w:type")
            sect.append(type_el)
        type_el.set(fmt.qn("w:val"), "oddPage")

    DOCX_OUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(DOCX_OUT)
    return body_start, len(lines)


def main() -> None:
    fmt, render, labels = configure_renderers()
    body_start_line, source_lines = make_docx(fmt)
    model = render.DocModel(DOCX_OUT)
    if model.n_sections < 2:
        raise RuntimeError(f"Expected a front/body section boundary; got {model.n_sections}")
    front_pages = render.front_page_count(model, labels)
    pad_blank = (front_pages % 2 == 1)
    physical_body_start = front_pages + (2 if pad_blank else 1)
    result = render.build_pdf(
        model, labels, PDF_OUT, body_start=physical_body_start,
        pad_blank=pad_blank, part_blanks=set(),
    )
    if render._MISS_LOG:
        raise RuntimeError(f"Missing font glyphs: {sorted(set(render._MISS_LOG))[:20]}")
    pages = result["pages"]
    if pages > 300:
        raise RuntimeError(f"Unexpected proof length: {pages} pages")
    audit = {
        "title": "AGS v0.1: Accountability-Gated Systems",
        "status": "proof only; not for upload",
        "trim_inches": [6.0, 9.0],
        "bindings_under_review": ["paperback", "hardcover"],
        "pages_physical": pages,
        "hardcover_75_page_planning_threshold": 75,
        "pages_above_hardcover_threshold": pages - 75,
        "hardcover_page_count_status": "provisional pass" if pages >= 75 else "below planning threshold",
        "kdp_print_previewer_run": False,
        "front_matter_pages": front_pages,
        "body_starts_physical_page": physical_body_start,
        "body_folio_pages": pages - physical_body_start + 1,
        "body_anchors_physical": result["anchors"],
        "provisional_blank_pages": result["blanks"],
        "source_bytes": SOURCE.stat().st_size,
        "source_lines": source_lines,
        "source_body_starts_line": body_start_line + 1,
        "docx": str(DOCX_OUT),
        "docx_bytes": DOCX_OUT.stat().st_size,
        "pdf": str(PDF_OUT),
        "pdf_bytes": PDF_OUT.stat().st_size,
        "margins_inches": {"inside": 0.70, "outside": 0.55, "top": 0.60, "bottom": 0.60},
        "typography": {"body_pt": 11.0, "code_pt": 8.0, "table_pt": 7.8},
        "notes": [
            "Page count is a proof estimate; final KDP output may reflow.",
            "Contents folio references are intentionally omitted until approval.",
            "Hardcover and paperback require separate covers; no cover is included in this proof.",
        ],
    }
    AUDIT_OUT.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(audit, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
