#!/usr/bin/env python3
"""Render the v2.2 DOCX to a press-ready KDP print-interior PDF.

Pipeline: v2.2 TXT -> build_kdp_v22_docx.py -> this renderer -> press PDF.
The DOCX is walked in document order (paragraphs + tables + section breaks)
and laid out with reportlab using the same style decisions, so content parity
holds by construction. Pagination is measured, blank versos are inserted by a
fixpoint loop, and Contents folios are patched back into the source until the
whole pipeline converges.

Outputs (final): interior PDF, folios.json, pagination-audit.txt.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from docx import Document  # noqa: E402
from docx.enum.text import WD_ALIGN_PARAGRAPH  # noqa: E402
from docx.oxml.ns import qn  # noqa: E402

from reportlab.lib.colors import HexColor  # noqa: E402
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT  # noqa: E402
from reportlab.lib.pagesizes import inch  # noqa: E402
from reportlab.lib.styles import ParagraphStyle  # noqa: E402
from reportlab.pdfbase import pdfmetrics  # noqa: E402
from reportlab.pdfbase.ttfonts import TTFont  # noqa: E402
from reportlab.platypus import (  # noqa: E402
    BaseDocTemplate, Flowable, HRFlowable, KeepTogether, PageBreak,
    PageTemplate, Paragraph, Spacer, Table, TableStyle,
)
from reportlab.platypus.frames import Frame  # noqa: E402

import build_kdp_v22_docx as docx_builder  # noqa: E402
import build_kdp_v22_source as source_builder  # noqa: E402

# ---------------------------------------------------------------------------
# Paths and page geometry (KDP 8.25 x 11 in, no bleed, mirrored margins).
# ---------------------------------------------------------------------------

DOCX_PATH = HERE / "HARSHAL-SYSTEMS-Book-I-KDP-print-interior-v2.2-2026-10-07.docx"
PDF_PATH = HERE / "HARSHAL-SYSTEMS-Book-I-KDP-print-interior-v2.2-2026-10-07.pdf"
WORK = HERE / "kdp_v22"
FONTS = WORK / "fonts"
FOLIOS_JSON = WORK / "folios.json"
AUDIT_TXT = WORK / "pagination-audit.txt"

PAGE_W = 8.25 * inch
PAGE_H = 11.0 * inch
INSIDE = 0.90 * inch
OUTSIDE = 0.65 * inch
TOP = 0.75 * inch
BOTTOM = 0.75 * inch
HEAD_DIST = 0.40 * inch
FOOT_DIST = 0.40 * inch
TEXT_W = PAGE_W - INSIDE - OUTSIDE
TEXT_H = PAGE_H - TOP - BOTTOM
HEADER_TEXT = "HARSHAL\u2019S SYSTEMS  \u00b7  BOOK I"
HF_COLOR = HexColor("#555555")

MAX_PAGES = 550  # KDP ceiling for the 8.25 x 11 trim.

# ---------------------------------------------------------------------------
# Fonts: Tinos (Times-metric), Cousine (Courier-metric), DejaVu fallbacks.
# ---------------------------------------------------------------------------

FACES = {
    "T-R": "Tinos_400Regular.ttf",
    "T-I": "Tinos_400Regular_Italic.ttf",
    "T-B": "Tinos_700Bold.ttf",
    "T-BI": "Tinos_700Bold_Italic.ttf",
    "C-R": "Cousine_400Regular.ttf",
    "C-I": "Cousine_400Regular_Italic.ttf",
    "C-B": "Cousine_700Bold.ttf",
    "C-BI": "Cousine_700Bold_Italic.ttf",
    "DS-R": "DejaVuSerif.ttf",
    "DS-B": "DejaVuSerif-Bold.ttf",
    "DU-R": "DejaVuSans.ttf",
    "DU-B": "DejaVuSans-Bold.ttf",
    "DM-R": "DejaVuSansMono.ttf",
    "DM-B": "DejaVuSansMono-Bold.ttf",
}
SERIF_FALLBACKS = ("DS-R", "DS-B", "DU-R", "DU-B")
MONO_FALLBACKS = ("DM-R", "DM-B", "DU-R", "DU-B")

_CMAP: dict[str, set[int]] = {}
_MISS_LOG: list[str] = []


def register_fonts() -> None:
    from fontTools.ttLib import TTFont as FTFont
    for face, filename in FACES.items():
        path = FONTS / filename
        assert path.exists(), f"missing font file {path}"
        pdfmetrics.registerFont(TTFont(face, str(path)))
        _CMAP[face] = set(FTFont(str(path)).getBestCmap().keys())


def pick_face(ch: str, primary: str, fallbacks: tuple[str, ...]) -> str:
    code = ord(ch)
    if code in _CMAP[primary]:
        return primary
    for fb in fallbacks:
        if code in _CMAP[fb]:
            return fb
    _MISS_LOG.append(f"U+{code:04X} {ch!r} (primary {primary})")
    return primary


def shape_run(text: str, primary: str, fallbacks: tuple[str, ...]) -> list[tuple[str, str]]:
    """Split a run into (face, chunk) spans by glyph coverage."""
    spans: list[tuple[str, str]] = []
    cur_face: str | None = None
    buf: list[str] = []
    for ch in text:
        face = pick_face(ch, primary, fallbacks)
        if face != cur_face:
            if buf:
                assert cur_face is not None
                spans.append((cur_face, "".join(buf)))
                buf = []
            cur_face = face
        buf.append(ch)
    if buf:
        assert cur_face is not None
        spans.append((cur_face, "".join(buf)))
    return spans


def substitute(text: str) -> str:
    # U+2E3B three-em dash: no vendored face carries it; three em dashes.
    text = text.replace("\u2e3b", "\u2014\u2014\u2014")
    # U+A527 delimiter (2 occurrences, code context): guillemets.
    text = text.replace("\ua527", "\u00ab", 1).replace("\ua527", "\u00bb", 1)
    return text.replace("\ua527", "\u00ab")


XML_ESC = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "\u00a0": "&nbsp;"}


def esc(text: str) -> str:
    return "".join(XML_ESC.get(c, c) for c in text)


# ---------------------------------------------------------------------------
# DOCX walk and style resolution.
# ---------------------------------------------------------------------------

ALIGN = {
    WD_ALIGN_PARAGRAPH.CENTER: TA_CENTER,
    WD_ALIGN_PARAGRAPH.LEFT: TA_LEFT,
    WD_ALIGN_PARAGRAPH.JUSTIFY: TA_JUSTIFY,
    WD_ALIGN_PARAGRAPH.RIGHT: TA_RIGHT,
}

BASE_STYLE = {
    # name: (family, size, leading, align, spaceBefore, spaceAfter,
    #        leftIndent, firstLineIndent, rightIndent, textColor)
    "Normal": ("T", 10.0, 12.2, TA_JUSTIFY, 0.0, 3.2, 0.0, 0.16 * inch, 0.0, None),
    "Heading 1": ("T", 17.0, 19.0, TA_CENTER, 0.0, 12.0, 0.0, 0.0, 0.0, HexColor("#111111")),
    "Heading 2": ("T", 13.5, 15.5, TA_LEFT, 12.0, 5.0, 0.0, 0.0, 0.0, HexColor("#111111")),
    "Heading 3": ("T", 11.25, 13.2, TA_LEFT, 8.0, 3.0, 0.0, 0.0, 0.0, HexColor("#111111")),
    "Heading 4": ("T", 10.5, 12.6, TA_LEFT, 6.0, 2.0, 0.0, 0.0, 0.0, HexColor("#111111")),
    "KDP Code": ("C", 8.0, 9.2, TA_LEFT, 0.0, 2.5, 0.12 * inch, 0.0, 0.0, None),
    "KDP Bullet": ("T", 9.8, 10.6, TA_LEFT, 0.0, 2.5, 0.28 * inch, -0.18 * inch, 0.0, None),
    "KDP Numbered": ("T", 9.8, 10.6, TA_LEFT, 0.0, 2.5, 0.28 * inch, -0.18 * inch, 0.0, None),
    "KDP Checkbox": ("T", 9.5, 10.2, TA_LEFT, 0.0, 2.5, 0.28 * inch, -0.18 * inch, 0.0, None),
    "KDP Quote": ("T", 9.8, 10.6, TA_LEFT, 0.0, 2.5, 0.32 * inch, 0.0, 0.25 * inch, None),
    "KDP Table Text": ("T", 8.2, 9.4, TA_LEFT, 0.0, 0.0, 0.0, 0.0, 0.0, None),
}
HEADING_BOLD = {"Heading 1", "Heading 2", "Heading 3"}
HEADING_BOLDITALIC = {"Heading 4"}


def _pt(length) -> float | None:
    return None if length is None else float(length.pt)


def para_has_page_break(p) -> bool:
    for br in p._p.iter(qn("w:br")):
        if br.get(qn("w:type"), "textWrapping") == "page":
            return True
    return False


def para_has_rule(p) -> bool:
    pPr = p._p.pPr
    if pPr is None:
        return False
    return pPr.find(qn("w:pBdr")) is not None


def section_break_after(p) -> str | None:
    pPr = p._p.pPr
    if pPr is None:
        return None
    sect = pPr.find(qn("w:sectPr"))
    if sect is None:
        return None
    type_el = sect.find(qn("w:type"))
    return type_el.get(qn("w:val")) if type_el is not None else "nextPage"


def run_face(run, family: str, *, style_bold: bool = False,
               style_italic: bool = False) -> tuple[str, tuple[str, ...]]:
    fam = "C" if (run.font.name == "Courier New" or family == "C") else "T"
    bold = bool(run.bold) or style_bold
    italic = bool(run.italic) or style_italic
    suffix = ("-B" if bold else "-R") if not italic else ("-BI" if bold else "-I")
    primary = f"{fam}{suffix}"
    if fam == "C" and primary == "C-R":
        fallbacks = MONO_FALLBACKS
    elif fam == "C":
        fallbacks = ("DM-B", "DM-R", "DU-B", "DU-R")
    elif bold:
        fallbacks = ("DS-B", "DS-R", "DU-B", "DU-R")
    else:
        fallbacks = SERIF_FALLBACKS
    return primary, fallbacks


def runs_markup(paragraph, family: str, default_size: float, *, nbsp: bool = False,
                style_bold: bool = False, style_italic: bool = False) -> str:
    parts: list[str] = []
    for run in paragraph.runs:
        text = run.text or ""
        if not text:
            continue
        # Line breaks inside runs collapse (page breaks are handled at
        # paragraph level); tabs become spaces (4 in code).
        if "\n" in text or "\r" in text or "\u2028" in text or "\t" in text:
            text = re.sub(r"[\n\r\u2028\u2029]+", " ", text)
            text = text.replace("\t", "    " if nbsp else " ")
        text = substitute(text)
        primary, fallbacks = run_face(run, family, style_bold=style_bold,
                                      style_italic=style_italic)
        size = run.font.size.pt if run.font.size is not None else default_size
        color = ""
        if run.font.color is not None and run.font.color.rgb is not None:
            color = f' color="#{run.font.color.rgb}"'
        for face, chunk in shape_run(text, primary, fallbacks):
            chunk = esc(chunk)
            if nbsp:
                chunk = chunk.replace(" ", "&nbsp;")
            parts.append(f'<font name="{face}" size="{size:g}"{color}>{chunk}</font>')
    return "".join(parts)


class ParaSpec:
    __slots__ = ("text", "style_name", "align", "size", "leading", "space_before",
                 "space_after", "left", "first_line", "right", "color",
                 "break_before", "keep_next", "is_empty", "is_pagebreak",
                 "is_rule", "is_code", "is_break_marker", "markup")

    def __init__(self, p) -> None:
        self.text = p.text or ""
        self.style_name = p.style.name if p.style is not None else "Normal"
        base = BASE_STYLE.get(self.style_name, BASE_STYLE["Normal"])
        (family, size, leading, align, sb, sa, li, fli, ri, color) = base
        pf = p.paragraph_format
        if pf.alignment is not None and pf.alignment in ALIGN:
            align = ALIGN[pf.alignment]
        if _pt(pf.space_before) is not None:
            sb = _pt(pf.space_before)
        if _pt(pf.space_after) is not None:
            sa = _pt(pf.space_after)
        if _pt(pf.left_indent) is not None:
            li = _pt(pf.left_indent)
        if _pt(pf.first_line_indent) is not None:
            fli = _pt(pf.first_line_indent)
        if _pt(pf.right_indent) is not None:
            ri = _pt(pf.right_indent)
        if pf.line_spacing is not None:
            base_size = size
            for run in p.runs:
                if run.font.size is not None:
                    base_size = run.font.size.pt
                    break
            leading = round(base_size * 1.15 * float(pf.line_spacing), 2)
        self.align, self.size, self.leading = align, size, leading
        self.space_before, self.space_after = sb, sa
        self.left, self.first_line, self.right = li, fli, ri
        self.color = color
        style_bold = self.style_name in HEADING_BOLD or self.style_name in HEADING_BOLDITALIC
        style_italic = self.style_name in HEADING_BOLDITALIC or self.style_name == "KDP Quote"
        self.break_before = bool(pf.page_break_before)
        self.keep_next = bool(pf.keep_with_next)
        self.is_empty = not self.text.strip()
        self.is_break_marker = section_break_after(p) is not None and not self.text.strip()
        self.is_pagebreak = para_has_page_break(p)
        self.is_rule = para_has_rule(p)
        self.is_code = self.style_name == "KDP Code"
        markup = runs_markup(p, family, size, nbsp=self.is_code,
                             style_bold=style_bold, style_italic=style_italic)
        self.markup = markup or (" " if not self.is_empty else "")


_STYLE_CACHE: dict[tuple, ParagraphStyle] = {}


def para_style(spec: ParaSpec, name: str) -> ParagraphStyle:
    key = (spec.style_name, spec.align, spec.size, spec.leading, spec.space_before,
           spec.space_after, spec.left, spec.first_line, spec.right,
           str(spec.color) if spec.color else "")
    cached = _STYLE_CACHE.get(key)
    if cached is not None:
        return cached
    style = ParagraphStyle(
        name, fontName="T-R", fontSize=spec.size, leading=spec.leading,
        alignment=spec.align, spaceBefore=spec.space_before,
        spaceAfter=spec.space_after, leftIndent=spec.left,
        firstLineIndent=spec.first_line, rightIndent=spec.right,
        splitLongWords=1,
    )
    if spec.color is not None:
        style.textColor = spec.color
    for attr in ("allowWidows", "allowOrphans"):
        try:
            setattr(style, attr, 0)
        except AttributeError:
            pass
    _STYLE_CACHE[key] = style
    return style


class AnchorParagraph(Paragraph):
    """A heading recording its physical page for table-of-contents anchors."""

    def __init__(self, text, style, toc_keys: list[str], registry: dict, **kw) -> None:
        super().__init__(text, style, **kw)
        self.toc_keys = toc_keys
        self._registry = registry

    def draw(self) -> None:
        pg = self.canv.getPageNumber()
        for key in self.toc_keys:
            self._registry.setdefault(key, pg)
        super().draw()


class BlankMarker(Flowable):
    """Zero-size marker recording its page as a blank verso (folio only)."""

    no_content = True

    def __init__(self, registry: set[int]) -> None:
        super().__init__()
        self._registry = registry

    def wrap(self, _aW, _aH):  # noqa: ANN001, ANN202
        return (0, 0)

    def draw(self) -> None:
        self._registry.add(self.canv.getPageNumber())


# ---------------------------------------------------------------------------
# Contents anchors: body heading text -> contents label.
# ---------------------------------------------------------------------------

EXPLICIT_ANCHORS = {
    "A Reader\u2019s Orientation: What Happens When an Agent Can Act?": ["A Reader\u2019s Orientation"],
    "APPENDICES": ["Appendices"],
    "Appendix D.1 \u2014 Audit A: Anthropic A-Side (Claude; former source location: old Part XII, now Part XI)":
        ["Appendix D.1 \u2014 Audit A: Claude"],
    "Appendix D.2 \u2014 Audit B: Anthropic Fable 5/Mythos 5 Access Events and PDH-R Review (former source location: old Part XXVI)":
        ["Appendix D.2 \u2014 Audit B: Anonymous AI via Arena.ai"],
    "Appendix G \u2014 Core Book AI Companion (Machine-Readable Companion to Part I)":
        ["Appendix G \u2014 Core Book AI Companion (Machine-Readable)"],
}


def anchor_keys(heading_text: str, contents_labels: list[str]) -> list[str]:
    if heading_text in EXPLICIT_ANCHORS:
        return EXPLICIT_ANCHORS[heading_text]
    # Body Part titles are longer than their contents rows; match by numeral.
    m = re.match(r"^Part\s+(XIX-B|[IVXLCDM]+)\s+\u2014", heading_text)
    if m:
        numeral = m.group(1)
        for label in contents_labels:
            lm = re.match(r"^Part\s+(XIX-B|[IVXLCDM]+)\s+\u2014", label)
            if lm and lm.group(1) == numeral:
                return [label]
        return []
    keys = []
    if heading_text in contents_labels:
        keys.append(heading_text)
    for label in contents_labels:
        if label != heading_text and heading_text.startswith(label) and heading_text[len(label):len(label) + 1] in (" ", "("):
            keys.append(label)
    return keys


def read_contents_labels() -> list[str]:
    lines = source_builder.V22.read_text(encoding="utf-8").splitlines()
    start = next(i for i, ln in enumerate(lines) if ln == "Contents")
    labels = []
    i = start + 3
    while i < len(lines) and lines[i].startswith("| "):
        cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
        labels.append(cells[0])
        i += 1
    return labels


def read_source_folios() -> dict[str, str]:
    lines = source_builder.V22.read_text(encoding="utf-8").splitlines()
    start = next(i for i, ln in enumerate(lines) if ln == "Contents")
    folios = {}
    i = start + 3
    while i < len(lines) and lines[i].startswith("| "):
        cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
        folios[cells[0]] = cells[1]
        i += 1
    return folios


# ---------------------------------------------------------------------------
# DOCX body walk.
# ---------------------------------------------------------------------------

class DocModel:
    def __init__(self, path: Path) -> None:
        doc = Document(str(path))
        self.core_title = doc.core_properties.title or ""
        self.items: list[tuple[str, object]] = []  # ("p", ParaSpec+text) | ("t", table model)
        self.boundaries: dict[int, int] = {}  # item index -> section number ending here
        para_by_el = {p._p: p for p in doc.paragraphs}
        table_by_el = {t._tbl: t for t in doc.tables}
        section_no = 0
        body = doc.element.body
        for child in body.iterchildren():
            if child.tag == qn("w:p"):
                spec = ParaSpec(para_by_el[child])
                self.items.append(("p", spec))
                brk = section_break_after(para_by_el[child])
                if brk is not None:
                    assert brk == "oddPage", f"unexpected section break {brk}"
                    self.boundaries[len(self.items) - 1] = section_no
                    section_no += 1
            elif child.tag == qn("w:tbl"):
                self.items.append(("t", self.read_table(table_by_el[child])))
            elif child.tag == qn("w:sectPr"):
                pass
            else:  # bookmarks etc.
                pass
        self.n_sections = section_no + 1

    @staticmethod
    def read_table(table) -> dict:
        grid = table._tbl.tblGrid
        widths = [float(gc.get(qn("w:w"))) / 20.0 for gc in grid.findall(qn("w:gridCol"))]
        rows = []
        for row in table.rows:
            cells = []
            for cell in row.cells:
                parts = []
                for par in cell.paragraphs:
                    if not (par.text or "").strip():
                        continue
                    base = BASE_STYLE["KDP Table Text"]
                    parts.append(runs_markup(par, "T", base[1]))
                cells.append("<br/>".join(parts) if parts else " ")
            rows.append(cells)
        header = False
        if rows:
            first_row = table.rows[0]
            shaded = 0
            for cell in first_row.cells:
                tcPr = cell._tc.tcPr
                shd = tcPr.find(qn("w:shd")) if tcPr is not None else None
                if shd is not None and (shd.get(qn("w:fill")) or "").upper() == "E7EBF0":
                    shaded += 1
            header = shaded > 0 and shaded >= len(first_row.cells) - 1
        return {"widths": widths, "rows": rows, "header": header}


# ---------------------------------------------------------------------------
# Platypus document with mirrored margins and page-end folio drawing.
# ---------------------------------------------------------------------------

def int_to_roman(n: int) -> str:
    table = ((1000, "m"), (900, "cm"), (500, "d"), (400, "cd"), (100, "c"),
             (90, "xc"), (50, "l"), (40, "xl"), (10, "x"), (9, "ix"),
             (5, "v"), (4, "iv"), (1, "i"))
    out = []
    for value, numeral in table:
        while n >= value:
            out.append(numeral)
            n -= value
    return "".join(out)


class KDPDoc(BaseDocTemplate):
    def __init__(self, filename, *, body_start: int, **kw) -> None:  # noqa: ANN001, ANN003
        super().__init__(filename, pagesize=(PAGE_W, PAGE_H), leftMargin=0,
                         rightMargin=0, topMargin=0, bottomMargin=0, **kw)
        self._body_start = body_start
        self.blank_pages: set[int] = set()
        odd = Frame(INSIDE, BOTTOM, TEXT_W, TEXT_H, id="odd")
        even = Frame(OUTSIDE, BOTTOM, TEXT_W, TEXT_H, id="even")
        noop = lambda *a: None  # noqa: E731
        self.addPageTemplates([
            PageTemplate(id="odd", frames=[odd], pagesize=(PAGE_W, PAGE_H),
                         onPage=noop, onPageEnd=self._draw_headfoot),
            PageTemplate(id="even", frames=[even], pagesize=(PAGE_W, PAGE_H),
                         onPage=noop, onPageEnd=self._draw_headfoot),
        ])
        self.title = "Harshal\u2019s Systems \u2014 Book I: The Ultimate User Manual (Production Edition v2.2)"
        self.author = "Harshal Priyavadan Patel"

    def handle_pageBegin(self) -> None:
        upcoming = self.page + 1
        self.pageTemplate = self.pageTemplates[0 if upcoming % 2 == 1 else 1]
        super().handle_pageBegin()

    def _draw_headfoot(self, canv, _doc) -> None:  # noqa: ANN001, ANN003
        pg = self.page
        if pg == 1:
            return
        odd = pg % 2 == 1
        center = PAGE_W / 2 + (9.0 if odd else -9.0)
        canv.saveState()
        canv.setFillColor(HF_COLOR)
        if pg not in self.blank_pages:
            canv.setFont("T-B", 8)
            canv.drawCentredString(center, PAGE_H - HEAD_DIST, HEADER_TEXT)
        folio = int_to_roman(pg) if pg < self._body_start else str(pg - self._body_start + 1)
        canv.setFont("T-R", 8)
        canv.drawCentredString(center, FOOT_DIST, folio)
        canv.restoreState()



CELL_STYLE = ParagraphStyle("cell", fontName="T-R", fontSize=8.2, leading=9.4,
                            alignment=TA_LEFT, splitLongWords=1)


def build_table(model: dict) -> Table:
    data = [[Paragraph(cell, CELL_STYLE) for cell in row] for row in model["rows"]]
    table = Table(data, colWidths=model["widths"], repeatRows=1 if model["header"] else 0)
    style = TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#000000")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3.5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3.5),
        ("TOPPADDING", (0, 0), (-1, -1), 2.25),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.25),
    ])
    if model["header"]:
        style.add("BACKGROUND", (0, 0), (-1, 0), HexColor("#E7EBF0"))
    table.setStyle(style)
    return table


def assemble(model: DocModel, labels: list[str], *, pad_blank: bool,
             part_blanks: set[int], blank_registry: set[int],
             anchor_registry: dict, only_front: bool = False) -> list:
    story: list = []
    at_top = True

    def push_break() -> None:
        nonlocal at_top
        if not at_top:
            brk = PageBreak()
            brk.no_content = True
            story.append(brk)
            at_top = True

    def push_blank_pair() -> None:
        story.append(BlankMarker(blank_registry))
        brk = PageBreak()
        brk.no_content = True
        story.append(brk)

    items = model.items
    if only_front:
        first_boundary = min(model.boundaries)
        items = items[:first_boundary + 1]
    for idx, (kind, payload) in enumerate(items):
        if idx in model.boundaries and not only_front:
            sec = model.boundaries[idx]
            if sec == 0:
                push_break()
                if pad_blank:
                    push_blank_pair()
            else:
                push_break()
                # Boundary value = section number ENDING here (0=front, 1=PI,
                # ...); the part starting after it is sec + 1.
                if sec + 1 in part_blanks:
                    push_blank_pair()
            at_top = True
        if kind == "t":
            story.append(build_table(payload))
            at_top = False
            continue
        spec: ParaSpec = payload
        if spec.is_break_marker:
            continue  # pure section-break carrier; boundary handled above
        if spec.is_pagebreak:
            push_break()
            continue
        if spec.is_empty and not spec.is_rule:
            # Glue spacer: drop at page top or directly before a break.
            if at_top:
                continue
            nxt = items[idx + 1] if idx + 1 < len(items) else None
            if nxt is not None and nxt[0] == "p":
                ns = nxt[1]
                if ns.is_pagebreak or ns.break_before or (idx + 1) in model.boundaries:
                    continue
            sp = Spacer(1, spec.space_after or 1.0)
            sp.no_content = True
            story.append(sp)
            continue
        if spec.is_rule:
            story.append(HRFlowable(width="100%", thickness=0.5,
                                    color=HexColor("#B7B7B7"), spaceBefore=2,
                                    spaceAfter=4, hAlign="CENTER",
                                    vAlign="BOTTOM", dash=None))
            at_top = False
            continue
        if spec.break_before:
            push_break()
        if spec.style_name in ("Heading 1", "Heading 2"):
            keys = anchor_keys(spec.text.strip(), labels)
            para: Flowable = AnchorParagraph(spec.markup, para_style(spec, f"p{idx}"),
                                             keys, anchor_registry)
        else:
            para = Paragraph(spec.markup, para_style(spec, f"p{idx}"))
        if spec.keep_next:
            para.keep_next = True  # consumed by the grouping pass below
        story.append(para)
        at_top = False

    # Group keep-with-next runs so headings are never stranded.
    grouped: list = []
    i = 0
    while i < len(story):
        item = story[i]
        if getattr(item, "keep_next", False):
            run = [item]
            j = i + 1
            while j < len(story) and isinstance(story[j], (Paragraph, Table, HRFlowable)) \
                    and not getattr(story[j], "no_content", False):
                run.append(story[j])
                if not getattr(story[j], "keep_next", False):
                    j += 1
                    break
                j += 1
            grouped.append(KeepTogether(run) if len(run) > 1 else item)
            i = j
        else:
            grouped.append(item)
            i += 1
    return grouped


# ---------------------------------------------------------------------------
# Build driver with fixpoint loops.
# ---------------------------------------------------------------------------

PART_LABELS = [
    "Part I \u2014 The Core Book", "Part II \u2014 Formalization",
    "Part III \u2014 AGS: Accountability-Gated Systems",
    "Part IV \u2014 OCM: Orb Communicator Model", "Part V \u2014 AI Inner Shell",
    "Part VI \u2014 Addressing and Spherical Topology", "Part VII \u2014 Operator Model",
    "Part VIII \u2014 Disc Primitives, Routing, and Lifecycle",
    "Part IX \u2014 AGS Layering and Conformance", "Part X \u2014 AGS Accessory Pack",
    "Part XI \u2014 Ground-0 and Duty Collation", "Part XII \u2014 Whyland Standards",
    "Part XIII \u2014 Neural Atomic Bodies Compendium",
    "Part XIV \u2014 Keyed Human\u2013Machine Hybrid Controls",
    "Part XV \u2014 Threat Modeling and Context-Dependent Guarantees",
    "Part XVI \u2014 Atomic-Body Classes and Reactor Doctrine",
    "Part XVII \u2014 Institutional Application",
    "Part XVIII \u2014 Accountability in Keyed Hybrid Systems",
    "Part XIX \u2014 Supply-Chain and Implanted-Device Threat Research",
    "Part XX \u2014 MicroConvergence and Signal Encoding",
    "Part XXI \u2014 Policy and Governance Archive", "Part XXII \u2014 Specification Series",
    "Part XXIII \u2014 The Grand River Foundation (Fiction)",
    "Part XXIV \u2014 Anti-Denial of Justice and NAB I/O",
    "Part XXV \u2014 Whole Corpus / Complete Work",
]


def build_pdf(model: DocModel, labels: list[str], out: Path, *, body_start: int,
              pad_blank: bool, part_blanks: set[int]) -> dict:
    doc = KDPDoc(str(out), body_start=body_start)
    anchors: dict[str, int] = {}
    story = assemble(model, labels, pad_blank=pad_blank, part_blanks=part_blanks,
                     blank_registry=doc.blank_pages, anchor_registry=anchors)
    doc.build(story)
    return {
        "pages": doc.page,
        "anchors": anchors,
        "blanks": sorted(doc.blank_pages),
    }


def front_page_count(model: DocModel, labels: list[str]) -> int:
    registry: set[int] = set()
    story = assemble(model, labels, pad_blank=False, part_blanks=set(),
                     blank_registry=registry, anchor_registry={}, only_front=True)
    doc = KDPDoc(str(WORK / "_front_prepass.pdf"), body_start=10 ** 9)
    doc.build(story)
    return doc.page


def folio_for(physical: int, body_start: int) -> str:
    if physical < body_start:
        return int_to_roman(physical)
    return str(physical - body_start + 1)


def run(max_outer: int = 3, max_inner: int = 5) -> dict:
    register_fonts()
    (WORK).mkdir(parents=True, exist_ok=True)
    final: dict = {}
    for outer in range(1, max_outer + 1):
        print(f"[outer {outer}] building DOCX ...", flush=True)
        docx_builder.build_docx()
        model = DocModel(DOCX_PATH)
        assert model.n_sections == 26, f"sections: {model.n_sections}"
        labels = read_contents_labels()
        assert len(labels) == 38, f"contents rows: {len(labels)}"
        front_pages = front_page_count(model, labels)
        pad = front_pages % 2 == 1
        body_start = front_pages + (2 if pad else 1)
        print(f"[outer {outer}] front={front_pages} pad={pad} body_start={body_start}",
              flush=True)
        blanks: set[int] = set()
        measurement: dict = {}
        seen: set[frozenset] = set()
        for inner in range(1, max_inner + 1):
            measurement = build_pdf(model, labels, WORK / "_pass.pdf",
                                    body_start=body_start, pad_blank=pad,
                                    part_blanks=blanks)
            missing = [lab for lab in PART_LABELS if lab not in measurement["anchors"]]
            assert not missing, f"missing part anchors: {missing}"
            starts = {i: measurement["anchors"][lab]
                      for i, lab in enumerate(PART_LABELS, 1)}
            print(f"[outer {outer} inner {inner}] pages={measurement['pages']} "
                  f"blanks={measurement['blanks']}", flush=True)
            if all(pg % 2 == 1 for pg in starts.values()):
                break
            # Derive blank-free base starts, then choose blanks greedily in
            # part order (each blank flips the parity of everything after it).
            base = {i: starts[i] - sum(1 for b in blanks if b < i)
                    for i in range(1, 26)}
            shift = 0
            greedy: set[int] = set()
            for i in range(1, 26):
                if (base[i] + shift) % 2 == 0:
                    greedy.add(i)
                    shift += 1
            key = frozenset(greedy)
            if key in seen:
                raise RuntimeError(f"blank selection cycling: {sorted(greedy)}")
            seen.add(key)
            blanks = greedy
        else:
            raise RuntimeError("blank fixpoint did not converge")
        folios = {lab: folio_for(measurement["anchors"][lab], body_start) for lab in labels}
        unlabeled = [lab for lab in labels if lab not in measurement["anchors"]]
        assert not unlabeled, f"missing anchors: {unlabeled}"
        current = read_source_folios()
        final = {"folios": folios, "pages": measurement["pages"],
                 "front_pages": front_pages, "body_start": body_start,
                 "blanks": measurement["blanks"], "anchors": measurement["anchors"]}
        if folios == current:
            print(f"[outer {outer}] folios match source; converged.", flush=True)
            break
        diff = sum(1 for lab in labels if folios.get(lab) != current.get(lab))
        print(f"[outer {outer}] patching {diff} folio(s) ...", flush=True)
        FOLIOS_JSON.write_text(json.dumps(folios, ensure_ascii=False, indent=1), encoding="utf-8")
        source_builder.patch_folios(FOLIOS_JSON, measurement["pages"])
    else:
        raise RuntimeError("folio rounds did not converge")
    assert not _MISS_LOG, f"missing glyphs: {sorted(set(_MISS_LOG))[:20]}"
    # Final render to the deliverable path.
    WORK.joinpath("_pass.pdf").replace(PDF_PATH)
    stamp_metadata(PDF_PATH)
    FOLIOS_JSON.write_text(json.dumps(final["folios"], ensure_ascii=False, indent=1), encoding="utf-8")
    audit = [
        f"v2.2 pagination audit ({PDF_PATH.name})",
        f"physical pages: {final['pages']} (limit {MAX_PAGES})",
        f"front matter: {final['front_pages']} pages; body folio 1 on physical {final['body_start']}",
        f"blank versos (folio only): {final['blanks']}",
        "",
        "part starts (label -> physical page / folio):",
    ]
    for lab in PART_LABELS:
        pg = final["anchors"][lab]
        audit.append(f"  {lab} -> {pg} / {folio_for(pg, final['body_start'])}")
    audit += ["", "end matter:"]
    for lab in labels[labels.index("Appendices"):]:
        pg = final["anchors"][lab]
        audit.append(f"  {lab} -> {pg} / {folio_for(pg, final['body_start'])}")
    AUDIT_TXT.write_text("\n".join(audit) + "\n", encoding="utf-8")
    return final


def stamp_metadata(path: Path) -> None:
    from pypdf import PdfReader, PdfWriter
    reader = PdfReader(str(path))
    writer = PdfWriter()
    writer.append(reader)
    writer.add_metadata({
        "/Title": "Harshal\u2019s Systems \u2014 Book I: The Ultimate User Manual (Production Edition v2.2)",
        "/Author": "Harshal Priyavadan Patel",
        "/Subject": "KDP 8.25 x 11 inch, no-bleed print interior",
        "/Keywords": "Harshal Systems, Book I, KDP print interior v2.2, proposed framework",
        "/Creator": "HarshalOS kdp_v22 pipeline (reportlab)",
    })
    with open(path, "wb") as fh:
        writer.write(fh)


if __name__ == "__main__":
    result = run()
    print(json.dumps({k: v for k, v in result.items() if k != "anchors"}, indent=1))
