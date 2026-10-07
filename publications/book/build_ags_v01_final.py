#!/usr/bin/env python3
"""Build the final AGS v0.1 6 x 9 KDP interiors (paperback + hardcover).

The layout is the one approved in the reviewed proof (130 physical pages,
4 front-matter pages, body folio 1 on physical p.5, 11 pt body / 8 pt code /
7.8 pt tables, 0.70 in inside / 0.55 in outside margins). Differences from
the proof:

- contents folios are populated (measured fixpoint against the final render);
- each format's copyright page prints only its own ISBN (paperback
  979-8-24548-379-5, hardcover 979-8-16078-278-2);
- all proof markings are removed and PDF metadata is stamped for production.

Usage:
    python3 build_ags_v01_final.py                 # both formats
    python3 build_ags_v01_final.py --format paperback
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "AGS-v0.1-Accountability-Gated-Systems-CORE-BOOK-plus-APPENDIX-G-SOURCE-2026-10-07.txt"
OUTDIR = HERE / "ags_v01"
WORK = HERE / "build" / "ags_v01_final"

CORE_TITLE = "Part I — The Core Book"

FORMATS = {
    "paperback": {"isbn_label": "ISBN-13 (Paperback)", "isbn": "979-8-24548-379-5"},
    "hardcover": {"isbn_label": "ISBN-13 (Hardcover)", "isbn": "979-8-16078-278-2"},
}

# Contents rows in display order; folios are measured in the final render.
CONTENTS_ROWS = [
    "Part I — The Core Book",
    "Appendix G — Core Book AI Companion (Machine-Readable Companion to Part I)",
    "G.1 Stable Identifiers and Machine Use",
    "G.2 Source Provenance and Integrity",
    "G.3 Complete Machine-Readable Module (Python)",
]
# Body anchors used to measure each row's folio (searched from the body start).
ANCHOR_QUERIES = [
    "Part I — The Core Book",
    "Appendix G — Core Book AI Companion",
    "Section G.1 — Stable Identifiers",
    "Section G.2 — Source Provenance",
    "Section G.3 — Complete Machine-Readable Module",
]
# Seed folios from the approved proof's measured anchors (physical pages
# 5, 42, 42, 43, 78 with body folio 1 on physical p.5).
SEED_FOLIOS = [1, 38, 38, 39, 74]


def configure_renderers():
    """Reuse the approved 6 x 9 proof geometry/styles from the proof builder."""
    import build_ags_v01_6x9_proof as proof
    fmt, render, labels = proof.configure_renderers()
    render.WORK = WORK
    render.WORK.mkdir(parents=True, exist_ok=True)
    return fmt, render, labels


def add_centered(doc, text: str, size: float, *, bold=False, italic=False,
                 before=0, after=5, font="Times New Roman"):
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


def make_docx(fmt, format_name: str, folios: list[int]) -> Path:
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    part_indices = [i for i, line in enumerate(lines) if line.strip() == CORE_TITLE]
    if len(part_indices) < 2:
        raise RuntimeError("Expected TOC and body Part I headings")
    body_start = part_indices[-1]
    contents_start = lines.index("CONTENTS")
    scope_start = lines.index("SHORT-EDITION SCOPE NOTE")
    scope_note = " ".join(line.strip() for line in lines[scope_start + 1:contents_start] if line.strip())

    doc = Document()
    doc.core_properties.title = f"AGS v0.1: Accountability-Gated Systems — 6 × 9 {format_name} interior"
    doc.core_properties.subject = f"KDP 6 × 9 in, no-bleed print interior ({format_name})"
    doc.core_properties.author = "Harshal Priyavadan Patel"
    doc.core_properties.keywords = "AGS v0.1, Accountability-Gated Systems, 6 x 9, KDP print interior"

    fmt.set_document_styles(doc)
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

    # Title page (production: no proof badge).
    add_centered(doc, "ACCOUNTABILITY-GATED", 22, bold=True, before=118, after=0, font=fmt.HEAD_FONT)
    add_centered(doc, "SYSTEMS", 22, bold=True, before=11, after=18, font=fmt.HEAD_FONT)
    add_centered(doc, "AGS v0.1", 14, bold=True, after=8)
    add_centered(doc, "The Core Book + Appendix G", 11, italic=True, after=42)
    add_centered(doc, "Harshal Priyavadan Patel", 12, bold=True, after=6)
    add_centered(doc, "October 2026", 10, after=0)
    doc.add_page_break()

    # Copyright page: only this format's ISBN.
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(118)
    p.paragraph_format.space_after = Pt(12)
    p.paragraph_format.first_line_indent = Inches(0)
    r = p.add_run("Copyright © 2026 by Harshal Priyavadan Patel")
    fmt.set_run_font(r, fmt.BODY_FONT, 9.5, bold=True)
    add_centered(doc, "All rights reserved.", 9, after=26)
    info = FORMATS[format_name]
    add_centered(doc, f"{info['isbn_label']}: {info['isbn']}", 9, after=0)
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

    # Contents page: bordered two-column table with measured folios.
    h = doc.add_paragraph(style="Heading 1")
    h.paragraph_format.space_before = Pt(22)
    h.paragraph_format.space_after = Pt(13)
    fmt.add_inline_runs(h, "CONTENTS")
    rows = ["| Section | Page |", "|---|---|"]
    for label, folio in zip(CONTENTS_ROWS, folios):
        rows.append(f"| {label} | {folio} |")
    fmt.add_table_block(doc, rows)
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.first_line_indent = Inches(0)
    r = p.add_run("Part I comprises Chapters 1–10 and the Epilogue.")
    fmt.set_run_font(r, fmt.BODY_FONT, 8.5, italic=True, color="555555")

    # Body: Part I + Appendix G, verbatim from the approved source.
    fmt.add_document_body(doc, lines, body_start)

    # Normalize section breaks to odd-page starts.
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

    out = OUTDIR / f"AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-interior-{format_name.upper()}-2026-10-07.docx"
    doc.save(out)
    return out


def measure_folios(pdf_path: Path, body_start: int) -> list[int]:
    import pymupdf
    doc = pymupdf.open(pdf_path)
    folios = []
    for query in ANCHOR_QUERIES:
        page = None
        for i in range(body_start - 1, len(doc)):
            if query in doc[i].get_text():
                page = i + 1
                break
        if page is None:
            raise RuntimeError(f"anchor not found in body: {query!r}")
        folios.append(page - body_start + 1)
    return folios


def stamp_metadata(path: Path, title: str) -> None:
    from pypdf import PdfReader, PdfWriter
    reader = PdfReader(str(path))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.add_metadata({
        "/Title": title,
        "/Author": "Harshal Priyavadan Patel",
        "/Subject": "KDP 6 x 9 in print interior — AGS v0.1: Accountability-Gated Systems",
        "/Keywords": "AGS v0.1, Accountability-Gated Systems, 6 x 9, KDP print interior",
    })
    with open(path, "wb") as fh:
        writer.write(fh)


def build_format(fmt, render, labels, format_name: str) -> dict:
    folios = list(SEED_FOLIOS)
    pdf_path = OUTDIR / f"AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-interior-{format_name.upper()}-2026-10-07.pdf"
    for attempt in range(1, 5):
        docx_path = make_docx(fmt, format_name, folios)
        model = render.DocModel(docx_path)
        front_pages = render.front_page_count(model, labels)
        pad = front_pages % 2 == 1
        body_start = front_pages + (2 if pad else 1)
        result = render.build_pdf(model, labels, pdf_path, body_start=body_start,
                                  pad_blank=pad, part_blanks=set())
        if render._MISS_LOG:
            raise RuntimeError(f"missing glyphs: {sorted(set(render._MISS_LOG))[:10]}")
        measured = measure_folios(pdf_path, body_start)
        print(f"[{format_name} attempt {attempt}] pages={result['pages']} "
              f"front={front_pages} body_start={body_start} folios={measured} (used {folios})", flush=True)
        if measured == folios:
            break
        folios = measured
    else:
        raise RuntimeError(f"{format_name}: folio fixpoint did not converge")

    stamp_metadata(pdf_path, f"AGS v0.1: Accountability-Gated Systems — 6 × 9 {format_name} interior")
    info = FORMATS[format_name]
    audit = {
        "title": "AGS v0.1: Accountability-Gated Systems",
        "format": format_name,
        "isbn": info["isbn"],
        "trim_inches": [6.0, 9.0],
        "pages_physical": result["pages"],
        "front_matter_pages": front_pages,
        "body_starts_physical_page": body_start,
        "contents_folios": dict(zip(CONTENTS_ROWS, folios)),
        "typography": {"body_pt": 11.0, "code_pt": 8.0, "table_pt": 7.8},
        "margins_inches": {"inside": 0.70, "outside": 0.55, "top": 0.60, "bottom": 0.60},
        "docx": str(docx_path),
        "pdf": str(pdf_path),
    }
    audit_path = OUTDIR / f"AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-interior-{format_name.upper()}-AUDIT-2026-10-07.json"
    audit_path.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return audit


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--format", choices=["paperback", "hardcover", "both"], default="both")
    args = ap.parse_args()
    fmt, render, labels = configure_renderers()
    formats = ["paperback", "hardcover"] if args.format == "both" else [args.format]
    for format_name in formats:
        audit = build_format(fmt, render, labels, format_name)
        print(json.dumps(audit, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
