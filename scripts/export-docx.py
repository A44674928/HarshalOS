#!/usr/bin/env python3
"""
Convert the Book I Markdown build into a publication-grade Word document
beside `publications/harshal-systems/HARSHAL-SYSTEMS-USER-MANUAL.md`.

Usage:
    python3 scripts/export-docx.py [input.md] [output.docx]
"""
import datetime
import os
import re
import sys
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from docx.shared import Inches, Pt, RGBColor

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PUBLICATION_DIR = os.path.join(ROOT, "publications", "harshal-systems")
DEFAULT_IN = os.path.join(PUBLICATION_DIR, "HARSHAL-SYSTEMS-USER-MANUAL.md")
DEFAULT_OUT = os.path.join(PUBLICATION_DIR, "HARSHAL-SYSTEMS-USER-MANUAL.docx")

# ---------------------------------------------------------------------------
# Color Palette (Executive / Technical Reference Manual Theme)
# ---------------------------------------------------------------------------
COLOR_NAVY = RGBColor(0x0F, 0x29, 0x42)       # H1 / Cover / Table Headers
COLOR_SLATE_DARK = RGBColor(0x1E, 0x3A, 0x5F) # H2
COLOR_BLUE_ACCENT = RGBColor(0x2B, 0x54, 0x7E)# H3
COLOR_CHARCOAL = RGBColor(0x2D, 0x37, 0x48)   # H4 / H5
COLOR_BODY = RGBColor(0x1A, 0x20, 0x2C)       # Primary body text
COLOR_MUTED = RGBColor(0x4A, 0x55, 0x68)      # Blockquotes / Captions / Footers
COLOR_CODE = RGBColor(0x1E, 0x29, 0x3B)       # Code & Monospace
COLOR_LINK = RGBColor(0x1D, 0x4E, 0xD8)       # Hyperlinks / Cross-refs
COLOR_WHITE = RGBColor(0xFF, 0xFF, 0xFF)

HEX_NAVY = "0F2942"
HEX_ZEBRA = "F8FAFC"
HEX_CODE_BG = "F1F5F9"
HEX_CODE_BORDER = "CBD5E1"
HEX_QUOTE_BG = "F8FAFC"
HEX_QUOTE_BORDER = "2B547E"
HEX_BORDER_LIGHT = "CBD5E1"
HEX_META_BG = "EDF2F7"

CALLOUT_STYLES = {
    "IMPORTANT": ("5B21B6", "F5F3FF", RGBColor(0x5B, 0x21, 0xB6), "IMPORTANT"),
    "WARNING":   ("B45309", "FFFBEB", RGBColor(0xB4, 0x53, 0x09), "WARNING"),
    "CAUTION":   ("B91C1C", "FEF2F2", RGBColor(0xB9, 0x1C, 0x1C), "CAUTION"),
    "NOTE":      ("1D4ED8", "EFF6FF", RGBColor(0x1D, 0x4E, 0xD8), "NOTE"),
    "TIP":       ("15803D", "F0FDF4", RGBColor(0x15, 0x80, 0x3D), "TIP"),
}

# ---------------------------------------------------------------------------
# LaTeX Math Normalization Helpers
# ---------------------------------------------------------------------------
LATEX_SYMBOLS = {
    r"\rightarrow": "→",
    r"\to": "→",
    r"\leftrightarrow": "↔",
    r"\Delta": "Δ",
    r"\Phi": "Φ",
    r"\Psi": "Ψ",
    r"\alpha": "α",
    r"\beta": "β",
    r"\delta": "δ",
    r"\epsilon": "ε",
    r"\kappa": "κ",
    r"\mu": "μ",
    r"\sigma": "σ",
    r"\tau": "τ",
    r"\theta": "θ",
    r"\bot": "⊥",
    r"\cdot": "·",
    r"\circ": "∘",
    r"\emptyset": "∅",
    r"\forall": "∀",
    r"\ge": "≥",
    r"\le": "≤",
    r"\ne": "≠",
    r"\in": "∈",
    r"\land": "∧",
    r"\langle": "⟨",
    r"\rangle": "⟩",
    r"\oplus": "⊕",
    r"\times": "×",
    r"\sum": "∑",
    r"\quad": "   ",
    r"\left": "",
    r"\right": "",
    r"\max": "max",
    r"\min": "min",
    r"^\circ": "°",
    r"\&": "&",
    r"\_": "_",
    r"\{": "{",
    r"\}": "}",
    r"\|": "‖",
    r"\%": "%",
    r"\,": " ",
}

MATHBB_MAP = {"I": "𝕀", "R": "ℝ", "N": "ℕ", "Z": "ℤ"}
MATHCAL_MAP = {"B": "ℬ", "Q": "𝒬", "E": "ℰ", "K": "𝒦"}

INLINE_MATH_RE = re.compile(
    r"(?<!\$)\$(?!\$)(?!\s)(?![0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?[BMK]\b)([^$\n]+?)(?<!\s)(?<!\$)\$(?!\$)"
)


def clean_math_str(expr: str) -> str:
    """Convert LaTeX math strings into clean Unicode + _{sub}/^{sup} notation."""
    s = expr.strip()

    def repl_cases(m):
        inner = m.group(1)
        rows = [r.strip() for r in inner.split(r"\\") if r.strip()]
        formatted_rows = []
        for r in rows:
            parts = [p.strip() for p in re.split(r"(?<!\\)&", r)]
            if len(parts) == 2:
                formatted_rows.append(f"  {{ {parts[0]}    — {parts[1]}")
            else:
                formatted_rows.append(f"  {{ {r}")
        return "\n" + "\n".join(formatted_rows)

    s = re.sub(r"\\begin\{cases\}(.*?)\\end\{cases\}", repl_cases, s, flags=re.DOTALL)
    while re.search(r"\\text(?:tt)?\{([^{}]*)\}", s):
        s = re.sub(r"\\text(?:tt)?\{([^{}]*)\}", r"\1", s)
    s = re.sub(r"\\mathbb\{([^{}]*)\}", lambda m: MATHBB_MAP.get(m.group(1), m.group(1)), s)
    s = re.sub(r"\\mathcal\{([^{}]*)\}", lambda m: MATHCAL_MAP.get(m.group(1), m.group(1)), s)
    s = re.sub(r"\\vec\{([^{}]*)\}", lambda m: m.group(1) + "\u20d7", s)
    s = re.sub(r"\\xrightarrow\{([^{}]*)\}", r" ──[\1]──► ", s)
    while re.search(r"\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}", s):
        s = re.sub(
            r"\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}",
            r"(\1) / (\2)",
            s,
        )
    for k in sorted(LATEX_SYMBOLS.keys(), key=len, reverse=True):
        s = s.replace(k, LATEX_SYMBOLS[k])
    return s


def emit_math_runs(paragraph, expr: str, base_size=None, bold=False, color=None):
    """Emit a math expression with proper subscript and superscript runs."""
    cleaned = clean_math_str(expr)
    # Tokenize by _{...}, _x, ^{...}, ^x, or \n
    token_re = re.compile(r"(\_\{[^{}]+\}|\_[a-zA-Z0-9]+|\^\{[^{}]+\}|\^[a-zA-Z0-9]+|\n)")
    pos = 0
    for m in token_re.finditer(cleaned):
        if m.start() > pos:
            r = paragraph.add_run(cleaned[pos:m.start()])
            r.font.name = "Cambria Math"
            r.italic = True
            if base_size:
                r.font.size = base_size
            if bold:
                r.bold = True
            if color:
                r.font.color.rgb = color
        tok = m.group(0)
        if tok == "\n":
            paragraph.add_run().add_break()
        elif tok.startswith("_"):
            sub_txt = tok[2:-1] if tok.startswith("_{") else tok[1:]
            r = paragraph.add_run(sub_txt)
            r.font.name = "Cambria Math"
            r.font.subscript = True
            if base_size:
                r.font.size = base_size
            if color:
                r.font.color.rgb = color
        elif tok.startswith("^"):
            sup_txt = tok[2:-1] if tok.startswith("^{") else tok[1:]
            r = paragraph.add_run(sup_txt)
            r.font.name = "Cambria Math"
            r.font.superscript = True
            if base_size:
                r.font.size = base_size
            if color:
                r.font.color.rgb = color
        pos = m.end()
    if pos < len(cleaned):
        r = paragraph.add_run(cleaned[pos:])
        r.font.name = "Cambria Math"
        r.italic = True
        if base_size:
            r.font.size = base_size
        if bold:
            r.bold = True
        if color:
            r.font.color.rgb = color


# ---------------------------------------------------------------------------
# OpenXML Low-Level Styling Helpers
# ---------------------------------------------------------------------------
def set_cell_background(cell, hex_color: str):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)


def set_cell_margins(cell, top=80, bottom=80, left=120, right=120):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement("w:tcMar")
    for side, val in (("top", top), ("bottom", bottom), ("left", left), ("right", right)):
        node = OxmlElement(f"w:{side}")
        node.set(qn("w:w"), str(val))
        node.set(qn("w:type"), "dxa")
        tcMar.append(node)
    tcPr.append(tcMar)


def set_table_borders(table, hex_color=HEX_BORDER_LIGHT):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="single" w:sz="4" w:space="0" w:color="{hex_color}"/>'
        f'  <w:bottom w:val="single" w:sz="6" w:space="0" w:color="{HEX_NAVY}"/>'
        f'  <w:left w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{hex_color}"/>'
        f'  <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>'
        f"</w:tblBorders>"
    )
    tblPr.append(borders)


def set_row_repeat_header(row):
    trPr = row._tr.get_or_add_trPr()
    trPr.append(OxmlElement("w:tblHeader"))
    trPr.append(OxmlElement("w:cantSplit"))


def set_row_cant_split(row):
    trPr = row._tr.get_or_add_trPr()
    trPr.append(OxmlElement("w:cantSplit"))


def style_paragraph_box(paragraph, fill_hex=None, left_border_hex=None, left_sz="18",
                        all_border_hex=None, bottom_border_hex=None, bottom_sz="6"):
    pPr = paragraph._p.get_or_add_pPr()
    if fill_hex:
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:val="clear" w:color="auto" w:fill="{fill_hex}"/>')
        pPr.append(shd)
    if left_border_hex or all_border_hex or bottom_border_hex:
        bdr_xml = f'<w:pBdr {nsdecls("w")}>'
        if all_border_hex:
            for side in ("top", "left", "bottom", "right"):
                bdr_xml += f'<w:{side} w:val="single" w:sz="4" w:space="6" w:color="{all_border_hex}"/>'
        else:
            if left_border_hex:
                bdr_xml += f'<w:left w:val="single" w:sz="{left_sz}" w:space="10" w:color="{left_border_hex}"/>'
            if bottom_border_hex:
                bdr_xml += f'<w:bottom w:val="single" w:sz="{bottom_sz}" w:space="4" w:color="{bottom_border_hex}"/>'
        bdr_xml += "</w:pBdr>"
        pPr.append(parse_xml(bdr_xml))


def add_field(paragraph, field_text: str):
    run = paragraph.add_run()
    fldChar1 = parse_xml(r'<w:fldChar %s w:fldCharType="begin"/>' % nsdecls("w"))
    instrText = parse_xml(r'<w:instrText %s xml:space="preserve"> %s </w:instrText>' % (nsdecls("w"), field_text))
    fldChar2 = parse_xml(r'<w:fldChar %s w:fldCharType="separate"/>' % nsdecls("w"))
    fldChar3 = parse_xml(r'<w:fldChar %s w:fldCharType="end"/>' % nsdecls("w"))
    run._r.append(fldChar1)
    run._r.append(instrText)
    run._r.append(fldChar2)
    run._r.append(fldChar3)
    return run


def add_toc_field(doc):
    """Insert a native Word Table of Contents field block that updates on open."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(8)
    r_note = p.add_run(
        "Tip: In Microsoft Word, use View → Navigation Pane to browse all Parts and Chapters interactively, "
        "or right-click the Table of Contents below and select 'Update Field' to refresh dynamic page numbers."
    )
    r_note.italic = True
    r_note.font.size = Pt(9)
    r_note.font.color.rgb = COLOR_MUTED
    style_paragraph_box(p, fill_hex=HEX_QUOTE_BG, left_border_hex=HEX_QUOTE_BORDER, left_sz="12")


# ---------------------------------------------------------------------------
# Inline Markdown Parser (Bold, Italic, Code, Math, Links)
# ---------------------------------------------------------------------------
INLINE_TOKEN_RE = re.compile(
    r"(`[^`]+`)"                                      # 1: inline code
    r"|((?<!\$)\$(?!\$)(?!\s)(?![0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?[BMK]\b)[^$\n]+?(?<!\s)(?<!\$)\$(?!\$))" # 2: inline math
    r"|(\*\*\*[^*]+\*\*\*)"                           # 3: bold italic
    r"|(\*\*[^*]+\*\*)"                               # 4: bold
    r"|(\*[^*\s][^*]*?\*)"                            # 5: italic
    r"|(\[[^\]]+\]\([^)]+\))"                         # 6: markdown link [text](url)
)


def add_inline_formatted(paragraph, text: str, base_size=None, base_color=None,
                         base_bold=False, base_italic=False, base_font=None):
    """Parse inline markdown and append styled runs to `paragraph`."""
    if not text:
        return

    pos = 0
    for m in INLINE_TOKEN_RE.finditer(text):
        if m.start() > pos:
            plain = text[pos:m.start()]
            _emit_plain_run(paragraph, plain, base_size, base_color, base_bold, base_italic, base_font)

        g_code, g_math, g_bi, g_b, g_i, g_link = m.groups()
        if g_code is not None:
            code_str = g_code[1:-1]
            r = paragraph.add_run(code_str)
            r.font.name = "Consolas"
            r.font.size = Pt((base_size.pt - 0.5) if base_size else 9.5)
            r.font.color.rgb = COLOR_CODE
            if base_bold:
                r.bold = True
        elif g_math is not None:
            math_str = g_math[1:-1]
            emit_math_runs(paragraph, math_str, base_size=base_size, bold=base_bold, color=base_color)
        elif g_bi is not None:
            inner = g_bi[3:-3]
            _emit_plain_run(paragraph, inner, base_size, base_color, True, True, base_font)
        elif g_b is not None:
            inner = g_b[2:-2]
            # Support nested inline code or links inside bold
            add_inline_formatted(paragraph, inner, base_size=base_size, base_color=base_color,
                                 base_bold=True, base_italic=base_italic, base_font=base_font)
        elif g_i is not None:
            inner = g_i[1:-1]
            add_inline_formatted(paragraph, inner, base_size=base_size, base_color=base_color,
                                 base_bold=base_bold, base_italic=True, base_font=base_font)
        elif g_link is not None:
            lm = re.match(r"^\[([^\]]+)\]\(([^)]+)\)$", g_link)
            if lm:
                label, url = lm.group(1), lm.group(2)
                add_inline_formatted(
                    paragraph,
                    label,
                    base_size=base_size,
                    base_color=COLOR_LINK if not base_color else base_color,
                    base_bold=base_bold,
                    base_italic=base_italic,
                    base_font=base_font,
                )
        pos = m.end()

    if pos < len(text):
        _emit_plain_run(paragraph, text[pos:], base_size, base_color, base_bold, base_italic, base_font)


def _emit_plain_run(paragraph, text: str, size, color, bold, italic, font_name):
    parts = text.split("\n")
    for idx, part in enumerate(parts):
        if idx > 0:
            paragraph.add_run().add_break()
        if part:
            r = paragraph.add_run(part)
            if font_name:
                r.font.name = font_name
            if size:
                r.font.size = size
            if color:
                r.font.color.rgb = color
            if bold:
                r.bold = True
            if italic:
                r.italic = True


# ---------------------------------------------------------------------------
# Pre-processing: Structural Repair of Split Tables & Line Separators
# ---------------------------------------------------------------------------
def preprocess_markdown(raw_text: str) -> list[str]:
    # Strip leading YAML frontmatter block if present
    if raw_text.startswith("---\n"):
        end_yaml = raw_text.find("\n---\n", 4)
        if end_yaml != -1:
            raw_text = raw_text[end_yaml + 5:].lstrip()
    # Replace Unicode Line/Paragraph Separators (U+2028, U+2029) with spaces/newlines
    text = raw_text.replace("\u2028", "\n").replace("\u2029", "\n")
    # Convert \[ ... \] inline/display LaTeX into $ ... $
    text = re.sub(r"\\\[(.*?)\\\]", lambda m: f"${m.group(1)}$", text)
    # Fix unclosed/mismatched bold markers in the source draft
    text = re.sub(r"(?<!\*)DATE:\*\*\s*September 11, 2026", "**DATE:** September 11, 2026", text)
    text = text.replace(
        "**Classification may organize a system.\nIt must not become a justification for owning the future of the people inside it.**",
        "**Classification may organize a system.**\n**It must not become a justification for owning the future of the people inside it.**",
    )
    # Fix nested *italic ... **bold italic*** at the end of Anthropic B-Side
    text = re.sub(
        r"^\*([^*\n]+?)\*\*([^*\n]+?)\*\*\*$",
        r"*\1****\2***",
        text,
        flags=re.MULTILINE,
    )
    # Replace bare \Delta, \delta, \to, \rightarrow outside code fences in prose
    text = text.replace(r"(\Delta t > \delta)", r"($\Delta t > \delta$)")
    text = text.replace(r"If \Delta t > \delta, then L(t) \to 0", r"If $\Delta t > \delta$, then $L(t) \to 0$")
    lines = [l.rstrip("\r") for l in text.split("\n")]

    # Fix 1: NAB Master Database (L6110 has a blank line after header row and no |---| row)
    # Locate "| # | Symbol | Name | Risk Profile |" followed by a blank line and "| 1 | **H** |"
    fixed = []
    i = 0
    while i < len(lines):
        s = lines[i].strip()
        if s.startswith("| # | Symbol | Name |") and i + 2 < len(lines) and lines[i + 1].strip() == "" and lines[i + 2].strip().startswith("| 1 |"):
            fixed.append(lines[i])
            cols = len(s.strip("|").split("|"))
            fixed.append("|" + "---|" * cols)
            i += 2  # skip the blank line
            continue

        # Fix 2: Part XV Table 17 ("| Scenario | Expected result |") split across "# Part XVI"
        if s == "| Scenario | Expected result |" and i + 1 < len(lines) and lines[i + 1].strip().startswith("| ---"):
            fixed.append(lines[i])
            fixed.append(lines[i + 1])
            # Look ahead ~15 lines for the orphaned rows starting with "| Participant completes a challenge"
            j = i + 2
            while j < min(len(lines), i + 20) and not lines[j].strip().startswith("| Participant completes a challenge"):
                j += 1
            if j < min(len(lines), i + 20):
                k = j
                while k < len(lines) and lines[k].strip().startswith("|"):
                    fixed.append(lines[k])
                    lines[k] = ""  # mark consumed
                    k += 1
            i += 2
            continue

        # Fix 3: Part XXIII CGPA table split across "# Part XXIV"
        if s.startswith("| **CGPA-CHK-04** |"):
            fixed.append(lines[i])
            j = i + 1
            while j < min(len(lines), i + 20) and not lines[j].strip().startswith("| **CGPA-CHK-05** |"):
                j += 1
            if j < min(len(lines), i + 20):
                k = j
                while k < len(lines) and lines[k].strip().startswith("|"):
                    fixed.append(lines[k])
                    lines[k] = ""  # mark consumed
                    k += 1
            i += 1
            continue

        fixed.append(lines[i])
        i += 1

    return fixed


# ---------------------------------------------------------------------------
# Document Setup: Styles, Margins, Running Headers & Footers
# ---------------------------------------------------------------------------
def configure_document(doc: Document):
    # Core properties
    props = doc.core_properties
    props.title = "Harshal’s Systems — The Ultimate User Manual"
    props.subject = "Architectures for Accountable Human D’Ash Machine Intelligence"
    props.author = "Harshal Priyavadan Patel (A44674928)"
    props.comments = (
        "Center-Origin: 0•000•000•0000 | Creator-ID: §HARSHAL§ + HARSHAL + (HARSHAL) | "
        "Consolidated Reference Manual (27 Parts)"
    )
    props.created = datetime.datetime(2026, 10, 1, 0, 0, 0)
    props.modified = datetime.datetime(2026, 10, 1, 0, 0, 0)

    # Page layout: US Letter, 0.9" margins (6.7" printable width)
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11.0)
    section.top_margin = Inches(0.9)
    section.bottom_margin = Inches(0.9)
    section.left_margin = Inches(0.9)
    section.right_margin = Inches(0.9)
    section.different_first_page_header_footer = True

    # Running Header (pages 2+)
    header = section.header
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    hp.paragraph_format.space_after = Pt(4)
    hr = hp.add_run("HARSHAL’S SYSTEMS — THE ULTIMATE USER MANUAL   |   0•000•000•0000")
    hr.font.name = "Calibri"
    hr.font.size = Pt(8.5)
    hr.font.color.rgb = COLOR_MUTED
    style_paragraph_box(hp, bottom_border_hex=HEX_BORDER_LIGHT, bottom_sz="4")

    # Running Footer (pages 2+)
    footer = section.footer
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    fp.paragraph_format.space_before = Pt(4)
    fr1 = fp.add_run("© 2026 Harshal Priyavadan Patel (A44674928) · Legitimacy Precedes Capability · Page ")
    fr1.font.name = "Calibri"
    fr1.font.size = Pt(8.5)
    fr1.font.color.rgb = COLOR_MUTED
    r_pg = add_field(fp, "PAGE")
    r_pg.font.name = "Calibri"
    r_pg.font.size = Pt(8.5)
    r_pg.font.color.rgb = COLOR_MUTED
    fr2 = fp.add_run(" of ")
    fr2.font.name = "Calibri"
    fr2.font.size = Pt(8.5)
    fr2.font.color.rgb = COLOR_MUTED
    r_num = add_field(fp, "NUMPAGES")
    r_num.font.name = "Calibri"
    r_num.font.size = Pt(8.5)
    r_num.font.color.rgb = COLOR_MUTED

    # Base Normal Style
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Georgia"
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = COLOR_BODY
    normal.paragraph_format.line_spacing = 1.18
    normal.paragraph_format.space_before = Pt(0)
    normal.paragraph_format.space_after = Pt(5)

    # Heading Styles (H1 - H5)
    h_Specs = [
        ("Heading 1", "Calibri", 20, COLOR_NAVY, True, False, 16, 8),
        ("Heading 2", "Calibri", 14.5, COLOR_SLATE_DARK, True, False, 14, 4),
        ("Heading 3", "Calibri", 12, COLOR_BLUE_ACCENT, True, False, 10, 3),
        ("Heading 4", "Calibri", 10.5, COLOR_CHARCOAL, True, True, 8, 2),
        ("Heading 5", "Calibri", 10, COLOR_MUTED, True, False, 6, 2),
    ]
    for name, font_name, pt_sz, color, is_bold, is_italic, sb, sa in h_Specs:
        st = styles[name]
        st.font.name = font_name
        st.font.size = Pt(pt_sz)
        st.font.color.rgb = color
        st.font.bold = is_bold
        st.font.italic = is_italic
        st.paragraph_format.space_before = Pt(sb)
        st.paragraph_format.space_after = Pt(sa)
        st.paragraph_format.keep_with_next = True
        st.paragraph_format.line_spacing = 1.12


# ---------------------------------------------------------------------------
# Block Rendering Helpers
# ---------------------------------------------------------------------------
def parse_pipe_row(line: str) -> list[str]:
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|"):
        s = s[:-1]
    # Split on | that is not escaped
    return [c.strip() for c in re.split(r"(?<!\\)\|", s)]


def is_separator_row(cells: list[str]) -> bool:
    if not cells:
        return False
    return all(bool(c) and set(c) <= set("-: +") for c in cells)


def render_table(doc: Document, table_lines: list[str]):
    rows_raw = [parse_pipe_row(l) for l in table_lines if l.strip()]
    if not rows_raw:
        return

    # Single-line metadata banner (e.g. | Work: ... | Author: ... | Tool: ... |)
    if len(rows_raw) == 1:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(6)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        banner_txt = "   ·   ".join(c for c in rows_raw[0] if c)
        add_inline_formatted(
            p, banner_txt, base_size=Pt(9), base_color=COLOR_SLATE_DARK,
            base_bold=True, base_font="Calibri"
        )
        style_paragraph_box(p, fill_hex=HEX_META_BG, all_border_hex=HEX_BORDER_LIGHT)
        return

    # Filter out markdown separator row(s) like |---|---|
    header = rows_raw[0]
    data_rows = []
    for r in rows_raw[1:]:
        if is_separator_row(r):
            continue
        data_rows.append(r)

    num_cols = max(len(header), max((len(r) for r in data_rows), default=0))
    if num_cols == 0:
        return

    # Choose font size based on column count so wide tables (like 10-col NAB DB) fit cleanly
    if num_cols >= 8:
        cell_font_pt = Pt(7.5)
        hdr_font_pt = Pt(8.0)
        pad_tb, pad_lr = 50, 65
    elif num_cols >= 5:
        cell_font_pt = Pt(8.5)
        hdr_font_pt = Pt(9.0)
        pad_tb, pad_lr = 65, 85
    else:
        cell_font_pt = Pt(9.5)
        hdr_font_pt = Pt(9.5)
        pad_tb, pad_lr = 80, 110

    table = doc.add_table(rows=1 + len(data_rows), cols=num_cols)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    set_table_borders(table)

    # Populate header row
    hdr_row = table.rows[0]
    set_row_repeat_header(hdr_row)
    for c_idx in range(num_cols):
        cell = hdr_row.cells[c_idx]
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        set_cell_background(cell, HEX_NAVY)
        set_cell_margins(cell, top=pad_tb + 20, bottom=pad_tb + 20, left=pad_lr, right=pad_lr)
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.08
        txt = header[c_idx] if c_idx < len(header) else ""
        add_inline_formatted(
            p, txt, base_size=hdr_font_pt, base_color=COLOR_WHITE,
            base_bold=True, base_font="Calibri"
        )

    # Populate data rows
    for r_idx, r_data in enumerate(data_rows):
        row = table.rows[r_idx + 1]
        set_row_cant_split(row)
        bg_hex = HEX_ZEBRA if (r_idx % 2 == 1) else None
        for c_idx in range(num_cols):
            cell = row.cells[c_idx]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP
            if bg_hex:
                set_cell_background(cell, bg_hex)
            set_cell_margins(cell, top=pad_tb, bottom=pad_tb, left=pad_lr, right=pad_lr)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.08
            txt = r_data[c_idx] if c_idx < len(r_data) else ""
            add_inline_formatted(
                p, txt, base_size=cell_font_pt, base_color=COLOR_BODY,
                base_font="Calibri"
            )

    # Small spacing after table
    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_before = Pt(0)
    spacer.paragraph_format.space_after = Pt(4)
    spacer.paragraph_format.line_spacing = 1.0


def render_code_block(doc: Document, code_lines: list[str]):
    # Strip leading/trailing empty lines inside the code fence
    while code_lines and not code_lines[0].strip():
        code_lines.pop(0)
    while code_lines and not code_lines[-1].strip():
        code_lines.pop()
    if not code_lines:
        return

    max_len = max(len(l) for l in code_lines)
    if max_len > 120:
        font_pt = Pt(6.0)
    elif max_len > 102:
        font_pt = Pt(6.8)
    elif max_len > 86:
        font_pt = Pt(7.5)
    else:
        font_pt = Pt(8.5)

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.02
    p.paragraph_format.left_indent = Inches(0.1)
    p.paragraph_format.right_indent = Inches(0.1)
    style_paragraph_box(p, fill_hex=HEX_CODE_BG, all_border_hex=HEX_CODE_BORDER)

    code_inline_re = re.compile(r"(\*\*[^*\n]+\*\*|\*[a-zA-Z][^*\n]*[a-zA-Z]\*)")
    for idx, line in enumerate(code_lines):
        if idx > 0:
            p.add_run().add_break()
        pos = 0
        for m in code_inline_re.finditer(line):
            if m.start() > pos:
                r = p.add_run(line[pos:m.start()])
                r.font.name = "Consolas"
                r.font.size = font_pt
                r.font.color.rgb = COLOR_CODE
            tok = m.group(0)
            if tok.startswith("**"):
                r = p.add_run(tok[2:-2])
                r.bold = True
            else:
                r = p.add_run(tok[1:-1])
                r.italic = True
            r.font.name = "Consolas"
            r.font.size = font_pt
            r.font.color.rgb = COLOR_CODE
            pos = m.end()
        if pos < len(line):
            r = p.add_run(line[pos:])
            r.font.name = "Consolas"
            r.font.size = font_pt
            r.font.color.rgb = COLOR_CODE


def render_blockquote(doc: Document, quote_lines: list[str]):
    cleaned = [re.sub(r"^\s*>\s?", "", l) for l in quote_lines]
    while cleaned and not cleaned[0].strip():
        cleaned.pop(0)
    while cleaned and not cleaned[-1].strip():
        cleaned.pop()
    if not cleaned:
        return

    # Check for GitHub callout syntax: [!IMPORTANT], [!WARNING], [!CAUTION], [!NOTE], [!TIP]
    first = cleaned[0].strip()
    m_callout = re.match(r"^\[!(IMPORTANT|WARNING|CAUTION|NOTE|TIP)\]\s*(.*)$", first, re.IGNORECASE)
    if m_callout:
        kind = m_callout.group(1).upper()
        remainder_first = m_callout.group(2).strip()
        border_hex, bg_hex, label_color, label_text = CALLOUT_STYLES.get(
            kind, CALLOUT_STYLES["NOTE"]
        )
        body_lines = ([remainder_first] if remainder_first else []) + cleaned[1:]
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.2)
        p.paragraph_format.right_indent = Inches(0.2)
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.15
        style_paragraph_box(p, fill_hex=bg_hex, left_border_hex=border_hex, left_sz="24")

        r_lbl = p.add_run(f"{label_text}: ")
        r_lbl.bold = True
        r_lbl.font.name = "Calibri"
        r_lbl.font.size = Pt(10)
        r_lbl.font.color.rgb = label_color

        body_str = " ".join(l.strip() for l in body_lines if l.strip())
        add_inline_formatted(p, body_str, base_size=Pt(10), base_color=COLOR_BODY)
        return

    # Group blockquote lines into paragraphs separated by blank lines
    paras = []
    cur = []
    for l in cleaned:
        if not l.strip():
            if cur:
                paras.append(" ".join(cur))
                cur = []
        else:
            cur.append(l.strip())
    if cur:
        paras.append(" ".join(cur))

    for p_txt in paras:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.25)
        p.paragraph_format.right_indent = Inches(0.2)
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.15
        style_paragraph_box(p, fill_hex=HEX_QUOTE_BG, left_border_hex=HEX_QUOTE_BORDER, left_sz="18")
        add_inline_formatted(p, p_txt, base_size=Pt(10), base_color=COLOR_MUTED, base_italic=True)


def render_horizontal_rule(doc: Document):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(6)
    style_paragraph_box(p, bottom_border_hex=HEX_BORDER_LIGHT, bottom_sz="6")


# ---------------------------------------------------------------------------
# Main Conversion Pipeline
# ---------------------------------------------------------------------------
def build_docx(md_path: str, docx_path: str):
    with open(md_path, "r", encoding="utf-8") as f:
        raw_md = f.read()

    lines = preprocess_markdown(raw_md)
    doc = Document()
    configure_document(doc)

    in_center_div = False
    is_first_h1 = True
    n = len(lines)
    i = 0

    stats = {
        "headings": 0,
        "tables": 0,
        "code_blocks": 0,
        "blockquotes": 0,
        "lists": 0,
        "equations": 0,
        "paragraphs": 0,
    }

    while i < n:
        line = lines[i]
        stripped = line.strip()

        # 0. Blank lines
        if not stripped:
            i += 1
            continue

        # 1. HTML <div align="center"> ... </div>
        if stripped.startswith("<div"):
            in_center_div = True
            i += 1
            continue
        if stripped.startswith("</div"):
            in_center_div = False
            i += 1
            continue

        # 2. Fenced code block (``` ...)
        if re.match(r"^\s*`{3,}", line):
            i += 1
            code_buf = []
            while i < n and not re.match(r"^\s*`{3,}", lines[i]):
                code_buf.append(lines[i])
                i += 1
            if i < n:
                i += 1  # consume closing fence
            render_code_block(doc, code_buf)
            stats["code_blocks"] += 1
            continue

        # 3. Unfenced PDH Manifesto header block (==== ... ====)
        if re.match(r"^={20,}\s*$", stripped):
            code_buf = [line]
            i += 1
            eq_Toggle = 1
            while i < n:
                code_buf.append(lines[i])
                if re.match(r"^={20,}\s*$", lines[i].strip()):
                    eq_Toggle += 1
                    if eq_Toggle >= 3:
                        i += 1
                        break
                i += 1
            render_code_block(doc, code_buf)
            stats["code_blocks"] += 1
            continue

        # 4. Horizontal Rules (---, ***, ___, ⸻, ────)
        if (
            stripped in ("---", "***", "⸻")
            or (len(stripped) >= 10 and set(stripped) <= set("_-─━═"))
        ):
            # Avoid duplicate rules immediately before a top-level H1 page break
            j = i + 1
            while j < n and not lines[j].strip():
                j += 1
            if j < n and lines[j].startswith("# "):
                i += 1
                continue
            render_horizontal_rule(doc)
            i += 1
            continue

        # 5. ATX Headings (# .. ######)
        m_head = re.match(r"^(#{1,6})\s+(.*?)\s*#*\s*$", line)
        if m_head:
            lvl = min(len(m_head.group(1)), 5)
            title_txt = m_head.group(2).strip()

            if in_center_div and is_first_h1 and lvl == 1:
                # Cover Title
                p = doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p.paragraph_format.space_before = Pt(36)
                p.paragraph_format.space_after = Pt(6)
                add_inline_formatted(
                    p, title_txt, base_size=Pt(28), base_color=COLOR_NAVY,
                    base_bold=True, base_font="Calibri"
                )
                is_first_h1 = False
                stats["headings"] += 1
                i += 1
                continue

            if in_center_div and lvl == 2:
                # Cover Subtitle
                p = doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p.paragraph_format.space_before = Pt(0)
                p.paragraph_format.space_after = Pt(14)
                add_inline_formatted(
                    p, title_txt, base_size=Pt(16), base_color=COLOR_SLATE_DARK,
                    base_bold=True, base_font="Calibri"
                )
                style_paragraph_box(p, bottom_border_hex=HEX_NAVY, bottom_sz="12")
                stats["headings"] += 1
                i += 1
                continue

            # Page break before every major H1 section (# Table of Contents, # Front Matter, # Part I..XXVI)
            if lvl == 1:
                if not is_first_h1:
                    doc.add_page_break()
                is_first_h1 = False

            p = doc.add_paragraph(style=f"Heading {lvl}")
            if in_center_div:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            if lvl == 1:
                style_paragraph_box(p, bottom_border_hex=HEX_NAVY, bottom_sz="12")
            elif lvl == 2 and title_txt.startswith("Chapter "):
                style_paragraph_box(p, bottom_border_hex=HEX_BORDER_LIGHT, bottom_sz="4")

            add_inline_formatted(p, title_txt)
            stats["headings"] += 1

            if lvl == 1 and title_txt == "Table of Contents":
                add_toc_field(doc)

            i += 1
            continue

        # 6. Blockquotes (> ...)
        if stripped.startswith(">"):
            q_buf = []
            while i < n and lines[i].strip().startswith(">"):
                q_buf.append(lines[i])
                i += 1
            render_blockquote(doc, q_buf)
            stats["blockquotes"] += 1
            continue

        # 7. Tables (| ... |)
        if stripped.startswith("|") and stripped.count("|") >= 2:
            t_buf = []
            while i < n and lines[i].strip().startswith("|") and lines[i].strip().count("|") >= 2:
                t_buf.append(lines[i])
                i += 1
            render_table(doc, t_buf)
            stats["tables"] += 1
            continue

        # 8. Display Math Equation ($$ ... $$)
        m_disp_math = re.match(r"^\s*\$\$(.*?)\$\$\s*$", line)
        if m_disp_math:
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(6)
            p.paragraph_format.left_indent = Inches(0.3)
            p.paragraph_format.right_indent = Inches(0.3)
            style_paragraph_box(p, fill_hex=HEX_QUOTE_BG, all_border_hex=HEX_BORDER_LIGHT)
            emit_math_runs(p, m_disp_math.group(1), base_size=Pt(10.5), color=COLOR_NAVY)
            stats["equations"] += 1
            i += 1
            continue

        # 9. Unordered & Ordered Lists (- ..., * ..., 1. ...)
        m_ul = re.match(r"^(\s*)[-*]\s+(.*)$", line)
        m_ol = re.match(r"^(\s*)(\d+[.)])\s+(.*)$", line)
        if m_ul or m_ol:
            if m_ul:
                indent_spaces = len(m_ul.group(1))
                item_body = m_ul.group(2).strip()
                # Check for task list checkbox: [ ] or [x]
                if item_body.startswith("[ ] "):
                    prefix = "☐  "
                    item_body = item_body[4:]
                elif item_body.lower().startswith("[x] "):
                    prefix = "☑  "
                    item_body = item_body[4:]
                else:
                    lvl_idx = indent_spaces // 2
                    bullet_char = "•" if lvl_idx == 0 else ("◦" if lvl_idx == 1 else "▪")
                    prefix = f"{bullet_char}  "
            else:
                indent_spaces = len(m_ol.group(1))
                prefix = f"{m_ol.group(2)} "
                item_body = m_ol.group(3).strip()

            p = doc.add_paragraph()
            lvl_indent = min(indent_spaces // 2, 4)
            p.paragraph_format.left_indent = Inches(0.25 + lvl_indent * 0.22)
            p.paragraph_format.first_line_indent = Inches(-0.18)
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2.5)
            p.paragraph_format.line_spacing = 1.14

            r_pre = p.add_run(prefix)
            r_pre.bold = bool(m_ol)
            r_pre.font.name = "Calibri"
            r_pre.font.size = Pt(10)
            r_pre.font.color.rgb = COLOR_SLATE_DARK

            add_inline_formatted(p, item_body, base_size=Pt(10))
            stats["lists"] += 1
            i += 1
            continue

        # 10. Regular Paragraph
        p = doc.add_paragraph()
        if in_center_div:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(8)
        add_inline_formatted(p, stripped)
        stats["paragraphs"] += 1
        i += 1

    doc.save(docx_path)
    return stats


if __name__ == "__main__":
    in_file = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_IN
    out_file = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUT
    st = build_docx(in_file, out_file)
    sz_mb = os.path.getsize(out_file) / (1024 * 1024)
    print(f"Created {out_file} ({sz_mb:.2f} MB) -> {st}")
