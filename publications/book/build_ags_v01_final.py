#!/usr/bin/env python3
"""Build the FINAL AGS v0.1 print interiors (6 x 9 in, paperback + hardcover).

Approved finalization of the 130-page proof: contents folios are populated from
measured anchors, each interior prints only its own format ISBN on the
copyright page, and all proof markings are removed. The body is the approved
source (Part I + Appendix G with the complete Python module listing).

Usage:
    python3 build_ags_v01_final.py            # both interiors (PDF + DOCX)
    python3 build_ags_v01_final.py --format paperback
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from build_ags_v01_6x9_proof import configure_renderers  # noqa: E402

SOURCE = HERE / "AGS-v0.1-Accountability-Gated-Systems-CORE-BOOK-plus-APPENDIX-G-SOURCE-2026-10-07.txt"
OUTDIR = HERE / "ags_v01"

FORMATS = {
    "paperback": {
        "isbn": "979-8-24548-379-5",
        "isbn_label": "ISBN-13 (Paperback): 979-8-24548-379-5",
        "edition_line": "6 × 9 in · Paperback edition",
        "key": "PAPERBACK",
    },
    "hardcover": {
        "isbn": "979-8-16078-278-2",
        "isbn_label": "ISBN-13 (Hardcover): 979-8-16078-278-2",
        "edition_line": "6 × 9 in · Hardcover edition",
        "key": "HARDCOVER",
    },
}

CORE_TITLE = "Part I — The Core Book"
APPENDIX_TITLE = "Appendix G — Core Book AI Companion (Machine-Readable Companion to Part I)"

# Contents entries in print order: (label as printed, anchor search text)
CONTENTS_ENTRIES = [
    ("Part I — The Core Book", "Part I — The Core Book"),
    ("Appendix G — Core Book AI Companion (Machine-Readable Companion to Part I)",
     "Appendix G — Core Book AI Companion"),
    ("  G.1 Stable Identifiers and Machine Use", "Section G.1 — Stable Identifiers and Machine Use"),
    ("  G.2 Source Provenance and Integrity", "Section G.2 — Source Provenance and Integrity"),
    ("  G.3 Complete Machine-Readable Module (Python)",
     "Section G.3 — Complete Machine-Readable Module (Python)"),
]


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


def parse_contents(lines: list[str], body_start: int) -> tuple[list[str], list[str]]:
    """Return (entry labels, note lines) of the CONTENTS block, folios stripped.

    Top-level entries are flush-left; Appendix G sub-entries (G.1/G.2/G.3) are
    indented two spaces and kept as sub-entries; anything else indented is a note.
    """
    start = lines.index("CONTENTS")
    entries, notes = [], []
    for ln in lines[start + 1:body_start]:
        if not ln.strip():
            continue
        stripped = re.sub(r"\s{2,}\d+\s*$", "", ln).strip()
        if ln.startswith("  G."):
            entries.append("  " + stripped)
        elif ln.startswith("  "):
            notes.append(stripped)
        else:
            entries.append(stripped)
    return entries, notes


def patch_source_folios(folios: dict[str, int]) -> None:
    """Write measured folios into the source CONTENTS block (idempotent)."""
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    start = lines.index("CONTENTS")
    body_start = [i for i, ln in enumerate(lines) if ln.strip() == CORE_TITLE][-1]
    for i in range(start + 1, body_start):
        ln = lines[i]
        if not ln.strip():
            continue
        indent = "  " if ln.startswith("  G.") else ""
        stripped = re.sub(r"\s{2,}\d+\s*$", "", ln).strip()
        entry = indent + stripped
        if entry in folios:
            lines[i] = f"{entry}  {folios[entry]}"
    SOURCE.write_text("\n".join(lines) + "\n", encoding="utf-8")


def make_docx(fmt, fmt_key: str, entries: list[str], notes: list[str],
              folios: dict[str, int]) -> tuple[Path, int]:
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    part_indices = [i for i, ln in enumerate(lines) if ln.strip() == CORE_TITLE]
    body_start = part_indices[-1]
    scope_start = lines.index("SHORT-EDITION SCOPE NOTE")
    contents_start = lines.index("CONTENTS")
    scope_lines = lines[scope_start + 1:contents_start]
    scope_note = " ".join(ln.strip() for ln in scope_lines if ln.strip())
    meta = FORMATS[fmt_key]

    doc = Document()
    doc.core_properties.title = f"AGS v0.1: Accountability-Gated Systems — 6 × 9 {fmt_key} interior"
    doc.core_properties.subject = "KDP 6 x 9 inch, no-bleed print interior (final)"
    doc.core_properties.author = "Harshal Priyavadan Patel"
    doc.core_properties.keywords = ("AGS v0.1, Accountability-Gated Systems, 6 x 9, "
                                    f"{fmt_key}, KDP print interior, final")

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

    # ---- Title page (approved lockup, no proof markings) ----
    add_centered(doc, "ACCOUNTABILITY-GATED", 22, bold=True, before=104, after=0, font=fmt.HEAD_FONT)
    add_centered(doc, "SYSTEMS", 22, bold=True, before=11, after=18, font=fmt.HEAD_FONT)
    add_centered(doc, "AGS v0.1", 14, bold=True, after=8)
    add_centered(doc, "The Core Book + Appendix G", 11, italic=True, after=35)
    add_centered(doc, "Harshal Priyavadan Patel", 12, bold=True, after=6)
    add_centered(doc, "October 2026", 10, after=0)
    doc.add_page_break()

    # ---- Copyright page: ONE format ISBN only ----
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(94)
    p.paragraph_format.space_after = Pt(12)
    p.paragraph_format.first_line_indent = Inches(0)
    r = p.add_run("Copyright © 2026 by Harshal Priyavadan Patel")
    fmt.set_run_font(r, fmt.BODY_FONT, 9.5, bold=True)
    add_centered(doc, "All rights reserved.", 9, after=20)
    add_centered(doc, meta["isbn_label"], 9, after=3)
    add_centered(doc, meta["edition_line"], 8.5, italic=True, after=0)
    doc.add_page_break()

    # ---- Scope note page ----
    h = doc.add_paragraph(style="Heading 1")
    h.paragraph_format.space_before = Pt(26)
    h.paragraph_format.space_after = Pt(12)
    fmt.add_inline_runs(h, "SHORT-EDITION SCOPE NOTE")
    p = doc.add_paragraph(style="Normal")
    p.paragraph_format.first_line_indent = Inches(0)
    fmt.add_inline_runs(p, scope_note)
    doc.add_page_break()

    # ---- Contents page with measured folios ----
    h = doc.add_paragraph(style="Heading 1")
    h.paragraph_format.space_before = Pt(22)
    h.paragraph_format.space_after = Pt(13)
    fmt.add_inline_runs(h, "CONTENTS")
    table_lines = ["| Entry | Page |", "|---|---|"]
    for entry in entries:
        table_lines.append(f"| {entry} | {folios[entry]} |")
    fmt.add_table_block(doc, table_lines)
    for note in notes:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.16)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.first_line_indent = Inches(0)
        fmt.add_inline_runs(p, note)

    # ---- Body (approved source) ----
    fmt.add_document_body(doc, lines, body_start)

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

    out = OUTDIR / f"AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-interior-{meta['key']}-2026-10-07.docx"
    doc.save(out)
    return out, body_start


def measure(pdf: Path, body_start: int) -> tuple[int, dict[str, int]]:
    import pymupdf
    d = pymupdf.open(pdf)
    pages = len(d)
    folios: dict[str, int] = {}
    for entry, needle in CONTENTS_ENTRIES:
        hits = [i + 1 for i, pg in enumerate(d)
                if needle in pg.get_text() and i + 1 >= body_start]
        assert hits, f"anchor not found for {entry!r}"
        folios[entry] = hits[0] - body_start + 1
    return pages, folios


def build_format(fmt, render, labels, fmt_key: str) -> dict:
    meta = FORMATS[fmt_key]
    entries, notes = parse_contents(SOURCE.read_text(encoding="utf-8").splitlines(),
                                     [i for i, ln in enumerate(SOURCE.read_text(encoding="utf-8").splitlines())
                                      if ln.strip() == CORE_TITLE][-1])
    assert len(entries) == len(CONTENTS_ENTRIES), entries

    docx_path, body_start = make_docx(fmt, fmt_key, entries, notes,
                                     {e: 1 for e in entries})  # placeholder folios
    model = render.DocModel(docx_path)
    front_pages = render.front_page_count(model, labels)
    assert front_pages % 2 == 0, f"front matter must be even, got {front_pages}"
    physical_body_start = front_pages + 1

    result = None
    folios = None
    for _ in range(3):
        pdf_path = OUTDIR / f"AGS-v0.1-Accountability-Gated-Systems-6x9-KDP-interior-{meta['key']}-2026-10-07.pdf"
        result = render.build_pdf(model, labels, pdf_path,
                                  body_start=physical_body_start,
                                  pad_blank=False, part_blanks=set())
        pages, folios = measure(pdf_path, physical_body_start)
        # rebuild the DOCX with the measured folios in the contents table
        docx_path, _ = make_docx(fmt, fmt_key, entries, notes, folios)
        model = render.DocModel(docx_path)
        new_result = render.build_pdf(model, labels, pdf_path,
                                      body_start=physical_body_start,
                                      pad_blank=False, part_blanks=set())
        new_pages, new_folios = measure(pdf_path, physical_body_start)
        if new_folios == folios and new_pages == pages:
            break
        folios = new_folios
    else:
        raise RuntimeError("folio fixpoint did not converge")

    patch_source_folios(folios)
    return {
        "format": fmt_key,
        "pages": pages,
        "body_starts_physical_page": physical_body_start,
        "contents_folios": folios,
        "docx": str(docx_path),
        "pdf": str(pdf_path),
        "docx_bytes": docx_path.stat().st_size,
        "pdf_bytes": pdf_path.stat().st_size,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--format", choices=["paperback", "hardcover", "both"], default="both")
    args = ap.parse_args()
    fmt, render, labels = configure_renderers()
    keys = ["paperback", "hardcover"] if args.format == "both" else [args.format]
    out = [build_format(fmt, render, labels, k) for k in keys]
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
