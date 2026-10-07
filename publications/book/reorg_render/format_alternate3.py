#!/usr/bin/env python3
"""Typeset the revised Book I manuscript as an 8.25 x 11 in KDP print interior.

The source TXT remains untouched. The print copy excludes the production-only
KDP specification/blank ISBN block, consolidates the duplicate title metadata
into a conventional title page, and removes the internal revision-note path.
All other manuscript text is carried into the DOCX with layout-oriented styling.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Iterable

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path('/home/user')
SOURCE = ROOT / 'HARSHAL-SYSTEMS-Book-I-REORG-WORKING.txt'
OUTPUT = ROOT / 'reorg_render/ALTERNATE-FIRST-BLANK3.docx'

TRIM_WIDTH = 8.25
TRIM_HEIGHT = 11.00
INSIDE = 0.90
OUTSIDE = 0.65
TOP = 0.75
BOTTOM = 0.75
HEADER_DIST = 0.40
FOOTER_DIST = 0.40
TEXT_WIDTH_IN = TRIM_WIDTH - INSIDE - OUTSIDE
# Filled from the rendered PDF pagination audit: additional page break before
# a Part only when its otherwise-next-page start would land on a physical even page.
FORCE_EXTRA_PAGE_BREAK_BEFORE_PARTS: set[int] = {7, 8, 11, 13, 14, 15, 18, 20, 21, 22}

BODY_FONT = 'Times New Roman'
HEAD_FONT = 'Times New Roman'
CODE_FONT = 'Courier New'

ROMAN_VALUES = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000}

GRAND_ARCHITECTURE_TITLE = 'The Grand Architecture — Convergence-era infrastructure architecture module'
CONVERGENCE_INSTITUTIONS_TITLE = 'Convergence institutions — fictional reference module'
READER_ORIENTATION_TITLE = 'A Reader’s Orientation: What Happens When an Agent Can Act?'
READER_ORIENTATION_SUBHEADINGS = {
    'Start with one ordinary request',
    'Who this orientation is for',
    'A worked example using a documented agent framework',
    'Identity is not permission',
    'Representation asks who stands behind the action',
    'Continuity asks whether this is still the same authorized process',
    'Accountability and addressability ask who can answer',
    'Guardrails are useful, but they are not the whole permission system',
    'The formal symbols in plain language',
    'Meaningful human review is not the same as adding a button',
    'OCM, PDHs, and collective signals',
    'What the book claims—and what it does not',
    'A practical reading path',
    'Sources for the documented framework features',
}
GRAND_ARCHITECTURE_SECTION_HEADINGS = {
    '1. What The Grand Architecture is',
    '2. Why a new architecture, and where it sits',
    '3. The six layers',
    '4. Address discipline',
    '5. Narrative quantity anchors',
    '6. Architecture invariants',
    '7. Temporal layer binding (GA-4)',
    '8. Assurance layer binding (GA-5)',
    '9. Institutional layer (GA-3)',
    '10. Implementation boundary',
    '11. What The Grand Architecture is not',
}
GA_METADATA_PREFIXES = (
    'document_id:', 'provenance_class:', 'status_taxonomy:',
    'evidence_status:', 'research_layer:', 'source:',
)


def roman_to_int(s: str) -> int:
    s = s.upper()
    total = 0
    previous = 0
    for ch in reversed(s):
        value = ROMAN_VALUES[ch]
        if value < previous:
            total -= value
        else:
            total += value
            previous = value
    return total


def set_font_for_style(style, name: str, size: float, *, bold: bool = False,
                       italic: bool = False, color: str = '000000') -> None:
    style.font.name = name
    style.font.size = Pt(size)
    style.font.bold = bold
    style.font.italic = italic
    style.font.color.rgb = RGBColor.from_string(color)
    rpr = style._element.get_or_add_rPr()
    rfonts = rpr.rFonts
    if rfonts is None:
        rfonts = OxmlElement('w:rFonts')
        rpr.insert(0, rfonts)
    for key in ('ascii', 'hAnsi', 'eastAsia', 'cs'):
        rfonts.set(qn(f'w:{key}'), name)


def set_run_font(run, name: str, size: float | None = None, *, bold=None,
                 italic=None, color: str | None = None) -> None:
    run.font.name = name
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.rFonts
    if rfonts is None:
        rfonts = OxmlElement('w:rFonts')
        rpr.insert(0, rfonts)
    for key in ('ascii', 'hAnsi', 'eastAsia', 'cs'):
        rfonts.set(qn(f'w:{key}'), name)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic
    if color:
        run.font.color.rgb = RGBColor.from_string(color)


def add_page_field(paragraph) -> None:
    # Word field sequence: begin, instruction, separate, cached result, end.
    # Keeping each control in a run lets both Word and LibreOffice update it.
    def add_field_run(child):
        run = OxmlElement('w:r')
        run.append(child)
        paragraph._p.append(run)

    begin = OxmlElement('w:fldChar')
    begin.set(qn('w:fldCharType'), 'begin')
    add_field_run(begin)

    instr_run = OxmlElement('w:r')
    instr = OxmlElement('w:instrText')
    instr.set(qn('xml:space'), 'preserve')
    instr.text = ' PAGE '
    instr_run.append(instr)
    paragraph._p.append(instr_run)

    separate = OxmlElement('w:fldChar')
    separate.set(qn('w:fldCharType'), 'separate')
    add_field_run(separate)

    display_run = OxmlElement('w:r')
    display_text = OxmlElement('w:t')
    display_text.text = '1'
    display_run.append(display_text)
    paragraph._p.append(display_run)

    end = OxmlElement('w:fldChar')
    end.set(qn('w:fldCharType'), 'end')
    add_field_run(end)


def set_page_number_format(section, fmt: str, start: int = 1) -> None:
    sect_pr = section._sectPr
    existing = sect_pr.find(qn('w:pgNumType'))
    if existing is None:
        existing = OxmlElement('w:pgNumType')
        sect_pr.append(existing)
    existing.set(qn('w:fmt'), fmt)
    existing.set(qn('w:start'), str(start))


def continue_section_page_numbering(section) -> None:
    """Keep body folios continuous across odd-page section starts."""
    pg_type = section._sectPr.find(qn('w:pgNumType'))
    if pg_type is not None:
        pg_type.attrib.pop(qn('w:start'), None)
        if pg_type.get(qn('w:fmt')) is None:
            pg_type.set(qn('w:fmt'), 'decimal')


def enable_mirror_margins(doc: Document) -> None:
    settings = doc.settings.element
    if settings.find(qn('w:mirrorMargins')) is None:
        settings.append(OxmlElement('w:mirrorMargins'))


def set_section_layout(section, *, first_page_different: bool = False) -> None:
    section.page_width = Inches(TRIM_WIDTH)
    section.page_height = Inches(TRIM_HEIGHT)
    # With mirrorMargins set, left/right represent inside/outside, respectively.
    section.left_margin = Inches(INSIDE)
    section.right_margin = Inches(OUTSIDE)
    section.top_margin = Inches(TOP)
    section.bottom_margin = Inches(BOTTOM)
    section.gutter = Inches(0)
    section.header_distance = Inches(HEADER_DIST)
    section.footer_distance = Inches(FOOTER_DIST)
    section.different_first_page_header_footer = first_page_different


def set_header_footer(section, *, front_matter: bool = False) -> None:
    section.header.is_linked_to_previous = False
    section.footer.is_linked_to_previous = False
    hp = section.header.paragraphs[0]
    hp.clear()
    hp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    hp.paragraph_format.space_after = Pt(0)
    hr = hp.add_run('HARSHAL’S SYSTEMS  ·  BOOK I')
    set_run_font(hr, BODY_FONT, 8, bold=True, color='555555')

    fp = section.footer.paragraphs[0]
    fp.clear()
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    fp.paragraph_format.space_before = Pt(0)
    fp.paragraph_format.space_after = Pt(0)
    add_page_field(fp)
    for run in fp.runs:
        set_run_font(run, BODY_FONT, 8, color='555555')

    if section.different_first_page_header_footer:
        section.first_page_header.paragraphs[0].clear()
        section.first_page_footer.paragraphs[0].clear()


def set_cell_margins(cell, top=45, start=70, bottom=45, end=70) -> None:
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in('w:tcMar')
    if tc_mar is None:
        tc_mar = OxmlElement('w:tcMar')
        tc_pr.append(tc_mar)
    for m, v in (('top', top), ('start', start), ('bottom', bottom), ('end', end)):
        node = tc_mar.find(qn(f'w:{m}'))
        if node is None:
            node = OxmlElement(f'w:{m}')
            tc_mar.append(node)
        node.set(qn('w:w'), str(v))
        node.set(qn('w:type'), 'dxa')


def set_repeat_table_header(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement('w:tblHeader')
    tbl_header.set(qn('w:val'), 'true')
    tr_pr.append(tbl_header)


def is_separator_row(line: str) -> bool:
    cells = line.strip().strip('|').split('|')
    return bool(cells) and all(re.fullmatch(r'\s*:?-{2,}:?\s*', cell or '') for cell in cells)


def split_pipe_row(line: str) -> list[str]:
    s = line.strip()
    if s.startswith('|'):
        s = s[1:]
    if s.endswith('|'):
        s = s[:-1]
    return [cell.strip() for cell in s.split('|')]


def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn('w:shd'))
    if shd is None:
        shd = OxmlElement('w:shd')
        tc_pr.append(shd)
    shd.set(qn('w:fill'), fill)
    shd.set(qn('w:val'), 'clear')


def set_table_width(table, widths: list[float]) -> None:
    table.autofit = False
    tbl_pr = table._tbl.tblPr
    tbl_w = tbl_pr.find(qn('w:tblW'))
    if tbl_w is None:
        tbl_w = OxmlElement('w:tblW')
        tbl_pr.append(tbl_w)
    tbl_w.set(qn('w:w'), str(int(TEXT_WIDTH_IN * 1440)))
    tbl_w.set(qn('w:type'), 'dxa')
    layout = tbl_pr.find(qn('w:tblLayout'))
    if layout is None:
        layout = OxmlElement('w:tblLayout')
        tbl_pr.append(layout)
    layout.set(qn('w:type'), 'fixed')
    for idx, width in enumerate(widths):
        table.columns[idx].width = Inches(width)
        for row in table.rows:
            row.cells[idx].width = Inches(width)


def estimate_col_widths(rows: list[list[str]], ncols: int) -> list[float]:
    widths = []
    for c in range(ncols):
        candidates = [len(row[c]) for row in rows if c < len(row)]
        mx = max(candidates or [8])
        # A square-root weighting prevents a single long cell from consuming
        # nearly the entire row; it still gives text-heavy columns more space.
        widths.append(max(0.95, min(2.7, mx ** 0.55 * 0.36)))
    total = sum(widths)
    available = TEXT_WIDTH_IN
    if total < available:
        extra = available - total
        weights = [max(1.0, w) for w in widths]
        denom = sum(weights)
        widths = [w + extra * wt / denom for w, wt in zip(widths, weights)]
    elif total > available:
        # Preserve sensible minimums, then shrink proportionally.
        excess = total - available
        shrinkable = [max(0.0, w - 0.75) for w in widths]
        denom = sum(shrinkable) or 1.0
        widths = [w - excess * sh / denom for w, sh in zip(widths, shrinkable)]
    # Correct floating-point drift.
    widths[-1] += available - sum(widths)
    return widths


INLINE_MARKUP = re.compile(r'(`[^`]+`|\*\*.+?\*\*|(?<!\*)\*[^*]+\*(?!\*))')


def add_inline_runs(paragraph, text: str, *, force_code: bool = False, size: float | None = None) -> None:
    if force_code:
        # Treat paired Markdown emphasis in diagrams as typographic emphasis,
        # but leave unmatched asterisks intact (for example, literal wildcard
        # patterns such as destination:** in Part XX).
        code_emphasis = re.compile(r'(\*\*.+?\*\*|(?<!\*)\*[^*]+\*(?!\*))')
        pos = 0
        for match in code_emphasis.finditer(text):
            if match.start() > pos:
                run = paragraph.add_run(text[pos:match.start()])
                set_run_font(run, CODE_FONT, size or 8)
            token = match.group(0)
            if token.startswith('**'):
                run = paragraph.add_run(token[2:-2])
                set_run_font(run, CODE_FONT, size or 8, bold=True)
            else:
                run = paragraph.add_run(token[1:-1])
                set_run_font(run, CODE_FONT, size or 8, italic=True)
            pos = match.end()
        if pos < len(text):
            run = paragraph.add_run(text[pos:])
            set_run_font(run, CODE_FONT, size or 8)
        return
    pos = 0
    for match in INLINE_MARKUP.finditer(text):
        if match.start() > pos:
            run = paragraph.add_run(text[pos:match.start()])
            set_run_font(run, BODY_FONT, size)
        token = match.group(0)
        if token.startswith('**'):
            run = paragraph.add_run(token[2:-2])
            set_run_font(run, BODY_FONT, size, bold=True)
        elif token.startswith('`'):
            run = paragraph.add_run(token[1:-1])
            set_run_font(run, CODE_FONT, size or 9)
        else:
            run = paragraph.add_run(token[1:-1])
            set_run_font(run, BODY_FONT, size, italic=True)
        pos = match.end()
    if pos < len(text):
        run = paragraph.add_run(text[pos:])
        set_run_font(run, BODY_FONT, size)


def is_all_caps_heading(text: str) -> bool:
    letters = [c for c in text if c.isalpha()]
    if not letters or len(text) > 96:
        return False
    if any(ch in text for ch in '_={}[]<>;|\\'):
        return False
    return all(c.isupper() for c in letters)


def looks_like_code(line: str) -> bool:
    s = line.rstrip()
    stripped = s.strip()
    if not stripped:
        return False
    if s.startswith(('    ', '\t')) and not re.match(r'^(?:•|- |\* |☐|☑|[0-9]+[.)]\s)', stripped):
        return True
    if any(ch in stripped for ch in ('┌', '┐', '└', '┘', '├', '┤', '│', '▼', '▲', '┬', '┴', '┼')):
        return True
    if len(stripped) >= 6 and re.fullmatch(r'[+|\-_=\s─━╋╭╮╯╰┌┐└┘├┤┬┴┼]+', stripped):
        return True
    if re.match(r'^(?:import\s+\{|export\s+(?:const|type|function)|interface\s+\w+|type\s+\w+\s*=|enum\s+\w+|function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|return\b|if\s*\(|for\s*\(|while\s*\(|public\s+(?:enum|class|static)|private\s+|use\s+[\w:]+|pub\s+(?:enum|struct|fn|type)|struct\s+\w+|fn\s+\w+|impl\b|#\[|///|//|IF\b|THEN\b|ELSE\b|REQUIRE\b|FOR EACH\b)', stripped):
        return True
    if stripped.startswith(('→', '├─', '└─', '│', 'G = (', 'PDH_', 'STATE ', 'INPUTS', 'OUTPUT:', 'START')):
        return True
    # Compact operator- or grammar-heavy standalone lines.
    punctuation = sum(1 for c in stripped if c in '{}[]=<>;|\\')
    return len(stripped) >= 18 and punctuation / len(stripped) > 0.24


def clean_visible_line(line: str) -> str:
    return line.replace('\u2028', ' ').replace('\u2029', ' ').rstrip()


def is_ga_metadata_line(text: str) -> bool:
    return text.startswith(GA_METADATA_PREFIXES)


def is_ga_invariant_item(text: str) -> bool:
    return bool(re.match(r'^\d+\.\s+GA-INV-\d{3}\b', text))


def is_ga_label_line(text: str) -> bool:
    return text.startswith((
        'Form:', 'Extent:', 'Precision note (GA-INV-002).',
        '0•100•000•0000 is held by',
    ))


def ends_sentence(text: str) -> bool:
    return bool(re.search(r'[.!?][”\"’)]?$', text.strip()))


def join_ga_wrapped_lines(lines: list[str], start: int) -> tuple[str, int]:
    """Reflow evident hard-wrapped prose in the Grand Architecture module.

    Returns the joined paragraph and the first unconsumed source-line index.
    Source wording and token order are preserved; explicit headings, metadata,
    list-item boundaries, labels, and blank lines remain separate.
    """
    first = clean_visible_line(lines[start]).strip()
    if is_ga_metadata_line(first):
        return first, start + 1

    list_item = is_ga_invariant_item(first)
    parts = [first]
    i = start + 1
    while i < len(lines):
        candidate = clean_visible_line(lines[i]).strip()
        if not candidate or candidate in (GRAND_ARCHITECTURE_TITLE, CONVERGENCE_INSTITUTIONS_TITLE):
            break
        if candidate in GRAND_ARCHITECTURE_SECTION_HEADINGS or is_ga_metadata_line(candidate):
            break
        if is_ga_invariant_item(candidate) or is_ga_label_line(candidate):
            break
        if not list_item and ends_sentence(parts[-1]):
            break
        parts.append(candidate)
        i += 1
    return ' '.join(parts), i


def add_code_paragraph(doc: Document, line: str) -> None:
    p = doc.add_paragraph(style='KDP Code')
    p.paragraph_format.left_indent = Inches(0.12)
    p.paragraph_format.first_line_indent = Inches(0)
    p.paragraph_format.keep_together = True
    add_inline_runs(p, line.rstrip(), force_code=True, size=8)


def add_heading_paragraph(doc: Document, text: str, style: str, *, page_break_before: bool = False):
    p = doc.add_paragraph(style=style)
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.page_break_before = page_break_before
    add_inline_runs(p, text)
    return p


def add_body_paragraph(doc: Document, line: str) -> None:
    text = line.strip()
    if not text:
        return
    # Horizontal separators are rendered as a restrained rule rather than text.
    if re.fullmatch(r'[-_—=]{3,}', text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
        ppr = p._p.get_or_add_pPr()
        borders = OxmlElement('w:pBdr')
        bottom = OxmlElement('w:bottom')
        bottom.set(qn('w:val'), 'single')
        bottom.set(qn('w:sz'), '4')
        bottom.set(qn('w:space'), '1')
        bottom.set(qn('w:color'), 'B7B7B7')
        borders.append(bottom)
        ppr.append(borders)
        return

    if text == 'You can now safely use this sentence:':
        p = doc.add_paragraph(style='Normal')
        p.paragraph_format.keep_with_next = True
        add_inline_runs(p, text)
        return

    if text.startswith('“This system conforms to AGS v1.0'):
        p = doc.add_paragraph(style='KDP Quote')
        p.paragraph_format.keep_together = True
        add_inline_runs(p, text)
        return

    if text.startswith('The original author-supplied RTF files remain preserved at updates/2026-10-02/04-Institutional-Frameworks/Convergence-Institutions/.'):
        p = doc.add_paragraph(style='Normal')
        p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
        add_inline_runs(p, text)
        return

    if text.startswith('> '):
        p = doc.add_paragraph(style='KDP Quote')
        p.paragraph_format.keep_together = True
        add_inline_runs(p, text[2:])
        return

    if text.startswith('• '):
        p = doc.add_paragraph(style='KDP Bullet')
        add_inline_runs(p, text)
        return
    if text.startswith(('- ', '* ')):
        p = doc.add_paragraph(style='KDP Bullet')
        add_inline_runs(p, text)
        return
    if text.startswith(('☐', '☑', '✓', '✔')):
        p = doc.add_paragraph(style='KDP Checkbox')
        add_inline_runs(p, text)
        return
    if re.match(r'^\d+[.)]\s+', text):
        p = doc.add_paragraph(style='KDP Numbered')
        add_inline_runs(p, text)
        return

    p = doc.add_paragraph(style='Normal')
    add_inline_runs(p, text)


def add_table_block(doc: Document, block: list[str]) -> None:
    parsed = [split_pipe_row(row) for row in block if not is_separator_row(row)]
    if not parsed:
        return
    ncols = max(len(r) for r in parsed)
    for row in parsed:
        row.extend([''] * (ncols - len(row)))
    table = doc.add_table(rows=len(parsed), cols=ncols)
    try:
        table.style = 'Table Grid'
    except KeyError:
        pass
    widths = estimate_col_widths(parsed, ncols)
    set_table_width(table, widths)
    table.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Treat the first source row as a header when a Markdown delimiter row was
    # present or when the first row reads like labels rather than data.
    header = bool(len(block) > 1 and is_separator_row(block[1]))
    if not header and len(parsed) > 1:
        first = ' '.join(parsed[0]).lower()
        header = any(word in first for word in ('field', 'status', 'phase', 'question', 'metric', 'component', 'test', 'criterion', 'requirement', 'parameter', 'layer', 'gate', 'step'))
    for r_idx, rowdata in enumerate(parsed):
        row = table.rows[r_idx]
        for c_idx, value in enumerate(rowdata):
            cell = row.cells[c_idx]
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
            set_cell_margins(cell)
            cell.text = ''
            p = cell.paragraphs[0]
            p.style = 'KDP Table Text'
            p.paragraph_format.keep_together = True
            add_inline_runs(p, value, size=8.2)
            if r_idx == 0 and header:
                set_cell_shading(cell, 'E7EBF0')
                for run in p.runs:
                    run.bold = True
        # Avoid splitting short rows across pages; let long ones split if needed.
        tr_pr = row._tr.get_or_add_trPr()
        cant_split = OxmlElement('w:cantSplit')
        tr_pr.append(cant_split)
    if header:
        set_repeat_table_header(table.rows[0])

    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(2)
    spacer.paragraph_format.space_before = Pt(0)
    spacer.paragraph_format.line_spacing = 1


def set_document_styles(doc: Document) -> None:
    styles = doc.styles
    normal = styles['Normal']
    set_font_for_style(normal, BODY_FONT, 10.0)
    normal.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    normal.paragraph_format.line_spacing = 1.05
    normal.paragraph_format.space_before = Pt(0)
    normal.paragraph_format.space_after = Pt(3.2)
    normal.paragraph_format.first_line_indent = Inches(0.16)
    normal.paragraph_format.widow_control = True

    h1 = styles['Heading 1']
    set_font_for_style(h1, HEAD_FONT, 17, bold=True, color='111111')
    h1.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    h1.paragraph_format.space_before = Pt(0)
    h1.paragraph_format.space_after = Pt(12)
    h1.paragraph_format.keep_with_next = True
    h1.paragraph_format.keep_together = True
    h1.paragraph_format.first_line_indent = Inches(0)

    h2 = styles['Heading 2']
    set_font_for_style(h2, HEAD_FONT, 13.5, bold=True, color='111111')
    h2.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    h2.paragraph_format.space_before = Pt(12)
    h2.paragraph_format.space_after = Pt(5)
    h2.paragraph_format.keep_with_next = True
    h2.paragraph_format.keep_together = True
    h2.paragraph_format.first_line_indent = Inches(0)

    h3 = styles['Heading 3']
    set_font_for_style(h3, HEAD_FONT, 11.25, bold=True, color='111111')
    h3.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    h3.paragraph_format.space_before = Pt(8)
    h3.paragraph_format.space_after = Pt(3)
    h3.paragraph_format.keep_with_next = True
    h3.paragraph_format.keep_together = True
    h3.paragraph_format.first_line_indent = Inches(0)

    h4 = styles['Heading 4']
    set_font_for_style(h4, HEAD_FONT, 10.5, bold=True, italic=True, color='111111')
    h4.paragraph_format.space_before = Pt(6)
    h4.paragraph_format.space_after = Pt(2)
    h4.paragraph_format.keep_with_next = True
    h4.paragraph_format.first_line_indent = Inches(0)

    for name, size, bold in [('KDP Code', 8, False), ('KDP Table Text', 8.2, False),
                             ('KDP Bullet', 9.8, False), ('KDP Numbered', 9.8, False),
                             ('KDP Checkbox', 9.5, False), ('KDP Quote', 9.8, False)]:
        if name not in styles:
            style = styles.add_style(name, 1)
        else:
            style = styles[name]
        font_name = CODE_FONT if name == 'KDP Code' else BODY_FONT
        set_font_for_style(style, font_name, size, bold=bold)
        style.paragraph_format.space_before = Pt(0)
        style.paragraph_format.space_after = Pt(2.5)
        style.paragraph_format.line_spacing = 1.0 if name in ('KDP Code', 'KDP Table Text') else 1.03
        style.paragraph_format.first_line_indent = Inches(0)
        if name in ('KDP Bullet', 'KDP Numbered', 'KDP Checkbox'):
            style.paragraph_format.left_indent = Inches(0.28)
            style.paragraph_format.first_line_indent = Inches(-0.18)
        if name == 'KDP Quote':
            style.paragraph_format.left_indent = Inches(0.32)
            style.paragraph_format.right_indent = Inches(0.25)
            style.font.italic = True


def add_title_page(doc: Document, source_lines: list[str], copyright_index: int,
                   kdp_block_index: int, kdp_block_end: int) -> int:
    """Build a clean title page from duplicated source title metadata.

    Returns the first body line index after the repeated title/prod-spec block.
    """
    # Existing title and author data are reused, consolidated, and not invented.
    title = source_lines[0].strip()
    book_title = source_lines[1].strip()
    edition = next((ln.strip() for ln in source_lines[kdp_block_end:] if ln.startswith('PRODUCTION EDITION — VERSION')), 'PRODUCTION EDITION — VERSION 2.1')
    subtitle = source_lines[4].strip()
    tagline = next((ln.strip() for ln in source_lines[kdp_block_end:] if ln.startswith('With a plain-language orientation')), 'With a plain-language orientation, worked examples, and student review questions')

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(105)
    p.paragraph_format.space_after = Pt(15)
    r = p.add_run(title)
    set_run_font(r, HEAD_FONT, 26, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(16)
    r = p.add_run(book_title)
    set_run_font(r, HEAD_FONT, 18, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.left_indent = Inches(0.32)
    p.paragraph_format.right_indent = Inches(0.32)
    p.paragraph_format.space_after = Pt(22)
    r = p.add_run(subtitle)
    set_run_font(r, BODY_FONT, 10.5, italic=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(5)
    r = p.add_run(edition)
    set_run_font(r, BODY_FONT, 10, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(28)
    r = p.add_run(tagline)
    set_run_font(r, BODY_FONT, 9.5, italic=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run('HARSHAL PRIYAVADAN PATEL')
    set_run_font(r, HEAD_FONT, 14, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(20)
    r = p.add_run('Harshal Priyavadan Patel · Center Origin 0•000•000•0000')
    set_run_font(r, BODY_FONT, 9.5)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(3)
    r = p.add_run('October 2026')
    set_run_font(r, BODY_FONT, 10)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(3)
    r = p.add_run('Harshal Systems')
    set_run_font(r, BODY_FONT, 10, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run('Book I Reference Library & Umbrella Corpus Index')
    set_run_font(r, BODY_FONT, 9, italic=True)

    doc.add_page_break()

    # Copyright / edition information from the original front matter.
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(100)
    p.paragraph_format.space_after = Pt(14)
    r = p.add_run(source_lines[copyright_index].strip())
    set_run_font(r, BODY_FONT, 10, bold=True)

    for index in range(copyright_index + 1, kdp_block_index):
        line = source_lines[index].strip()
        if not line:
            continue
        if line.startswith('PROVENANCE & NORMATIVE SEPARATION NOTICE:'):
            doc.add_page_break()
            p = doc.add_paragraph(style='Heading 2')
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(20)
            add_inline_runs(p, 'PROVENANCE & NORMATIVE SEPARATION NOTICE:')
            continue
        if 'HARSHAL-SYSTEMS-Book-I-revision-note.md' in line:
            line = re.sub(r'; see the revised contents and HARSHAL-SYSTEMS-Book-I-revision-note\.md\.', '.', line)
        if line.startswith('• '):
            p = doc.add_paragraph(style='KDP Bullet')
            add_inline_runs(p, line)
        else:
            p = doc.add_paragraph(style='Normal')
            p.paragraph_format.first_line_indent = Inches(0)
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            add_inline_runs(p, line)

    # Skip the print production spec and the duplicate title-page block after it.
    body_start = None
    for idx in range(kdp_block_end, len(source_lines)):
        if source_lines[idx].startswith('This volume is the consolidated reference library'):
            body_start = idx
            break
    if body_start is None:
        raise RuntimeError('Could not find body start after KDP specification block')

    doc.add_page_break()
    return body_start


def classify_heading(text: str, next_part: int) -> tuple[str | None, bool, int]:
    """Return (style, page_break_before, updated sequential part number)."""
    m = re.match(r'^Part\s+([IVXLCDM]+)\s+—\s+', text)
    if m:
        n = roman_to_int(m.group(1))
        if n == next_part and 1 <= n <= 25:
            # The flag marks Parts requiring a counted blank verso; the body
            # builder inserts that page before the section break.
            return 'Heading 1', n in FORCE_EXTRA_PAGE_BREAK_BEFORE_PARTS, next_part + 1
        return 'Heading 2', False, next_part
    if re.match(r'^Part\s+XIX-B\s+—\s+', text):
        return 'Heading 2', True, next_part
    if re.match(r'^Chapter\s+\d+\s+—\s+', text):
        # Archived contents pages appear before the true Part I boundary.
        # Keep those entries compact; only actual body chapters start a page.
        if next_part == 1:
            return 'Heading 3', False, next_part
        return 'Heading 2', True, next_part
    if re.match(r'^(?:End-of-Part Review|End-of-Part Problem|Textbook Study Guide)', text, re.I):
        return 'Heading 2', False, next_part
    if re.match(r'^(?:Learning Objectives|Section\s+[0-9IVXLC]+\s*[—:–-]|SECTION\s+[0-9IVXLC]+|§\s*\d+\s*[—:–-])', text):
        return 'Heading 3', False, next_part
    if re.match(r'^\d+(?:\.\d+){1,3}\s+[A-Z“"(]', text) and len(text) < 140:
        return 'Heading 3', False, next_part
    if text == 'APPENDICES':
        return 'Heading 1', True, next_part
    if re.match(r'^Appendix\s+[A-F]\.\d+\s+—\s+', text):
        # Appendix subsections: Audit A and B each receive a clean section start.
        return 'Heading 2', text.startswith('Appendix D.'), next_part
    if re.match(r'^Appendix\s+[A-F]\s+—\s+', text):
        return 'Heading 1', True, next_part
    if re.match(r'^(?:Appendix\s+[A-Z0-9]|Worked Example\s+\d)', text):
        return 'Heading 3', False, next_part
    if re.match(r'^Appendix:\s+', text):
        return 'Heading 3', False, next_part

    if text == READER_ORIENTATION_TITLE:
        return 'Heading 1', True, next_part
    if text == 'Sources for the documented framework features':
        return 'Heading 2', True, next_part
    if text == 'Formal Appendix: Equations and Term Notes':
        return 'Heading 2', True, next_part
    if text == 'Consolidated Glossary':
        return 'Heading 1', True, next_part
    if text in READER_ORIENTATION_SUBHEADINGS:
        return 'Heading 2', False, next_part
    if text == CONVERGENCE_INSTITUTIONS_TITLE:
        return 'Heading 2', True, next_part
    if text == GRAND_ARCHITECTURE_TITLE:
        return 'Heading 2', False, next_part
    if text in GRAND_ARCHITECTURE_SECTION_HEADINGS or text == 'Canonical AGS Compliance Statement':
        return 'Heading 3', False, next_part

    front_headings = {
        'What are Harshal\'s Systems?', 'Design Philosophy', 'Where to Start',
        'Main Document Map', 'Contents', 'Student Reviews and Worked Examples — Guide',
        'Numbered Parts', 'Reference Modules', 'Thematic Navigation', 'Status and Evidence',
        'About this manual & publishing hierarchy', 'Flagship research entry point & canonical minimum model',
        'Content and Evidence Layers', 'How to read this manual', 'On refusal',
        'On non-agency & delegation vs. migration of legitimacy', 'Textbook Syllabus Guide for AI & Systems Engineering Courses',
        'On the formal material', 'On disagreement', 'Document control & provenance taxonomy',
        'Notices', 'Disclaimer', 'Scope of scenario content', 'Intellectual property and licensing',
        'Authorial register note (Harshal’s English)', 'Dedication and acknowledgments',
        'Author’s Front Matter and Reading Guide', 'ARCHIVED ORIGINAL CONTENTS LIST — historical source material; the current 27-part map appears above.',
    }
    if text in front_headings:
        return 'Heading 2', False, next_part
    if is_all_caps_heading(text) and len(text) > 3:
        return 'Heading 3', False, next_part
    return None, False, next_part



def apply_reader_orientation_typography(paragraph) -> None:
    """Give the new lay-reader opening a less compressed, book-like measure."""
    style_name = paragraph.style.name if paragraph.style is not None else ''
    if style_name.startswith('Heading'):
        return
    if style_name == 'KDP Code':
        paragraph.paragraph_format.line_spacing = 1.04
        paragraph.paragraph_format.space_after = Pt(4)
        return
    paragraph.paragraph_format.line_spacing = 1.14
    paragraph.paragraph_format.space_after = Pt(5)
    for run in paragraph.runs:
        if run.font.name == CODE_FONT:
            continue
        set_run_font(run, BODY_FONT, 11)


def apply_reader_orientation_table_typography(table) -> None:
    for row in table.rows:
        for cell in row.cells:
            for paragraph in cell.paragraphs:
                paragraph.paragraph_format.line_spacing = 1.08
                paragraph.paragraph_format.space_after = Pt(4)
                for run in paragraph.runs:
                    set_run_font(run, BODY_FONT, 9)


def add_document_body(doc: Document, lines: list[str], body_start: int) -> None:
    next_part = 1
    body_section_created = False
    ga_module_active = False
    reader_orientation_active = False
    i = body_start
    while i < len(lines):
        raw = lines[i]
        line = clean_visible_line(raw)
        if not line.strip():
            i += 1
            continue

        # Capture a header that precedes a Markdown delimiter row without a
        # leading pipe, then render the whole structure as a real Word table.
        text = line.strip()
        if text == READER_ORIENTATION_TITLE:
            reader_orientation_active = True
        elif text == 'Part I — The Core Book' and reader_orientation_active:
            reader_orientation_active = False
        if text == GRAND_ARCHITECTURE_TITLE:
            ga_module_active = True
        elif text == CONVERGENCE_INSTITUTIONS_TITLE:
            ga_module_active = False

        # Preserve the authorial two-line emphasis as one formatted paragraph.
        # This is outside protected Part XX and changes only line-flow/markup.
        if text == '**Classification may organize a system.' and i + 1 < len(lines):
            continuation = clean_visible_line(lines[i + 1]).strip()
            if continuation.startswith('It must not become a justification for owning the future of the people inside it.**'):
                p = doc.add_paragraph(style='Normal')
                p.paragraph_format.keep_together = True
                add_inline_runs(p, text + ' ' + continuation)
                if reader_orientation_active:
                    apply_reader_orientation_typography(p)
                i += 2
                continue

        if (not line.startswith('|') and '|' in text and i + 1 < len(lines)
                and lines[i + 1].startswith('|') and is_separator_row(lines[i + 1])):
            block = ['|' + text.strip('|').strip() + '|']
            i += 1
            while i < len(lines) and lines[i].startswith('|'):
                block.append(lines[i])
                i += 1
            add_table_block(doc, block)
            if reader_orientation_active:
                apply_reader_orientation_table_typography(doc.tables[-1])
            continue

        # Only blocks with a Markdown separator are tabular; unseparated pipe
        # runs are packet layouts/ASCII diagrams and must stay monospaced.
        if line.startswith('|'):
            block = []
            while i < len(lines) and lines[i].startswith('|'):
                block.append(lines[i])
                i += 1
            if any(is_separator_row(row) for row in block):
                add_table_block(doc, block)
                if reader_orientation_active:
                    apply_reader_orientation_table_typography(doc.tables[-1])
            else:
                for diagram_line in block:
                    add_code_paragraph(doc, diagram_line)
            continue

        # Sequential Roman-numbered Part headings are the 25 true top-level parts.
        heading_style, page_break, updated_next = classify_heading(text, next_part)
        is_top_part = heading_style == 'Heading 1' and updated_next != next_part
        if is_top_part:
            if not body_section_created:
                # Two explicit breaks leave one counted blank page before Part I;
                # the new-page section break supplies the Part's start.
                doc.add_page_break()
                doc.add_page_break()
                body_section = doc.add_section(WD_SECTION.NEW_PAGE)
                set_section_layout(body_section, first_page_different=False)
                set_header_footer(body_section)
                set_page_number_format(body_section, 'decimal', 1)
                body_section_created = True
            else:
                # Use a normal new-page section. Where the physical-page audit
                # requires it, a standalone page break creates the counted blank verso.
                if page_break:
                    # One break is consumed by the new-page section break;
                    # the second leaves one counted blank page before it.
                    doc.add_page_break()
                    doc.add_page_break()
                part_section = doc.add_section(WD_SECTION.NEW_PAGE)
                set_section_layout(part_section, first_page_different=False)
                set_header_footer(part_section)
                continue_section_page_numbering(part_section)

        if heading_style:
            # A true Part's extra page was inserted before its section above;
            # do not also set pageBreakBefore on the first paragraph of a section.
            paragraph_break_before = page_break and not is_top_part
            p = add_heading_paragraph(doc, text, heading_style, page_break_before=paragraph_break_before)
            if heading_style == 'Heading 1':
                p.paragraph_format.keep_with_next = True
            next_part = updated_next
            i += 1
            continue

        if looks_like_code(line):
            add_code_paragraph(doc, line)
            if reader_orientation_active:
                apply_reader_orientation_typography(doc.paragraphs[-1])
            i += 1
            continue

        if ga_module_active:
            merged, next_i = join_ga_wrapped_lines(lines, i)
            add_body_paragraph(doc, merged)
            if is_ga_invariant_item(merged) or merged.startswith('Not a construction program.'):
                doc.paragraphs[-1].paragraph_format.keep_together = True
            i = next_i
            continue

        add_body_paragraph(doc, line)
        if reader_orientation_active:
            apply_reader_orientation_typography(doc.paragraphs[-1])
        i += 1


def build_docx() -> dict:
    source_text = SOURCE.read_text(encoding='utf-8')
    lines = source_text.splitlines()
    try:
        copyright_index = next(i for i, line in enumerate(lines) if line.startswith('Copyright © 2026'))
        kdp_block_index = next(i for i, line in enumerate(lines) if line.startswith('AMAZON KINDLE DIRECT PUBLISHING (KDP) PRINT SPECIFICATION BLOCK:'))
        isbn_end = next(i for i, line in enumerate(lines) if line.startswith('• ISBN-13 (Hardcover):'))
    except StopIteration as exc:
        raise RuntimeError('Could not locate title/copyright/KDP production block') from exc
    kdp_block_end = isbn_end + 1

    doc = Document()
    doc.core_properties.title = 'Harshal’s Systems — Book I: The Ultimate User Manual'
    doc.core_properties.subject = 'KDP 8.25 x 11 inch, no-bleed print interior'
    doc.core_properties.author = 'Harshal Priyavadan Patel'
    doc.core_properties.keywords = 'Harshal Systems, Book I, KDP print interior, proposed framework'
    set_document_styles(doc)
    enable_mirror_margins(doc)

    # Front matter section: mirrored margins, roman page numbering, hidden title-page folio.
    front = doc.sections[0]
    set_section_layout(front, first_page_different=True)
    set_header_footer(front, front_matter=True)
    set_page_number_format(front, 'lowerRoman', 1)

    body_start = add_title_page(doc, lines, copyright_index, kdp_block_index, kdp_block_end)
    add_document_body(doc, lines, body_start)

    # A final section should not be missing if the first expected Part heading was malformed.
    if not body_section_created_check(doc):
        raise RuntimeError('Could not create the main-text section at Part I')

    doc.save(OUTPUT)
    return {
        'output': str(OUTPUT),
        'source_bytes': SOURCE.stat().st_size,
        'docx_bytes': OUTPUT.stat().st_size,
        'trim': (TRIM_WIDTH, TRIM_HEIGHT),
        'inside_margin': INSIDE,
        'outside_margin': OUTSIDE,
        'top_margin': TOP,
        'bottom_margin': BOTTOM,
        'body_start_line': body_start + 1,
    }


def body_section_created_check(doc: Document) -> bool:
    # First section is frontmatter; second section is the main text with page 1 restart.
    return len(doc.sections) >= 2


if __name__ == '__main__':
    result = build_docx()
    for key, value in result.items():
        print(f'{key}: {value}')
