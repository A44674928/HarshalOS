#!/usr/bin/env python3
"""
Builds the unified Book I University Textbook Edition:
1. /home/user/publications/harshal-systems/HARSHAL-SYSTEMS-USER-MANUAL.md
2. /home/user/publications/harshal-systems/HARSHAL-SYSTEMS-USER-MANUAL.docx
"""
import os
import re
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

ORDERED_FILES = [
    "README.md",
    "00-front-matter.md",
    "00-author-front-matter.md",
    "01-core-book.md",
    "02-formalization.md",
    "03-safety-rationale.md",
    "04-ags-architecture.md",
    "05-ocm-orb.md",
    "06-inner-shell.md",
    "07-addressing-topology.md",
    "08-operator-model.md",
    "09-disc-lifecycle.md",
    "10-ags-conformance.md",
    "11-accessory-pack.md",
    "12-ground-zero.md",
    "13-whyland.md",
    "14-nab-compendium.md",
    "15-hmkh-controls.md",
    "16-threat-modeling.md",
    "17-atomic-bodies.md",
    "18-institutional-application.md",
    "19-research-papers.md",
    "20-supply-chain.md",
    "21-microconvergence.md",
    "22-policy-archive.md",
    "23-specification-series.md",
    "24-the-novel.md",
    "25-additional-specs.md",
    "26-anthropic-b-side.md",
    "27-whole-corpus.md",
    "modules/uts.md",
    "modules/grand-architecture.md",
    "modules/convergence-institutions.md",
    "EDITORIAL-REPORT.md",
]

BASE_DIR = "/home/user/docs/harshal-systems"
OUT_DIR = "/home/user/publications/harshal-systems"
os.makedirs(OUT_DIR, exist_ok=True)


def strip_yaml_frontmatter(text: str) -> str:
    if text.startswith("---\n"):
        end = text.find("\n---\n", 4)
        if end != -1:
            return text[end + 5 :].lstrip()
    return text


def build_umbrella_markdown():
    out_md_path = os.path.join(OUT_DIR, "HARSHAL-SYSTEMS-USER-MANUAL.md")
    sections = []
    header = """# Harshal’s Systems — Book I: The Ultimate User Manual (University Textbook Edition)

**Author:** Harshal Priyavadan Patel (`A44674928`) · **Center Origin:** `0•000•000•0000`  
**Edition:** October 2026 University & Graduate AI Engineering Textbook Edition (Phases 1 & 2 Complete)  
**Canonical Minimum Model:** `Identity → Representation → Authorization → Continuity → Accountability → Decision (Permit | Refuse)`  
**Core Invariants:** `INV-STAGE-001` · `INV-SYM-001` · `INV-LEGIT-EQ-001` · `INV-AGENCY-001` · `INV-LEGIT-001` · `INV-CORPSE-001` · `INV-AXIS-001` · `INV-OCM-PRECEDENCE-001` · `INV-EMERG-001` · `INV-G0-CLASS-001`

---
"""
    sections.append(header)
    for rel in ORDERED_FILES:
        p = os.path.join(BASE_DIR, rel)
        with open(p, "r", encoding="utf-8") as fp:
            raw = fp.read()
        body = strip_yaml_frontmatter(raw)
        sections.append(f"<!-- SOURCE: docs/harshal-systems/{rel} -->\n\n{body.strip()}\n\n---\n")

    full_md = "\n".join(sections)
    with open(out_md_path, "w", encoding="utf-8") as fp:
        fp.write(full_md)
    words = len(full_md.split())
    lines = full_md.count("\n") + 1
    print(f"[MD] Wrote {out_md_path}: {words:,} words, {lines:,} lines.")
    return full_md


def clean_inline_markdown(s: str) -> str:
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = re.sub(r"`([^`]+)`", r"\1", s)
    return s


def build_docx(full_md: str):
    out_docx_path = os.path.join(OUT_DIR, "HARSHAL-SYSTEMS-USER-MANUAL.docx")
    doc = Document()

    # Configure default Normal style
    normal_style = doc.styles["Normal"]
    normal_style.font.name = "Calibri"
    normal_style.font.size = Pt(10.5)

    # Title Block
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = title_p.add_run("HARSHAL’S SYSTEMS\n")
    r.bold = True
    r.font.size = Pt(24)
    r.font.color.rgb = RGBColor(15, 36, 62)

    r2 = title_p.add_run("Book I: Accountability-Gated Systems, Orb Communicator Topology, and Keyed Human–Machine Hybrid Governance\n")
    r2.bold = True
    r2.font.size = Pt(13)
    r2.font.color.rgb = RGBColor(45, 75, 115)

    r3 = title_p.add_run(
        "\nUniversity & Graduate AI Engineering Textbook Edition (October 2026)\n"
        "Author: Harshal Priyavadan Patel (A44674928) · Origin Anchor: 0•000•000•0000\n"
        "Includes 12 Worked Numerical/State-Machine Examples & 42 Student Review Problems"
    )
    r3.font.size = Pt(10.5)

    doc.add_page_break()

    in_code_block = False
    code_lines = []
    table_rows = []

    def flush_code():
        nonlocal code_lines
        if not code_lines:
            return
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.25)
        run = p.add_run("\n".join(code_lines))
        run.font.name = "Courier New"
        run.font.size = Pt(8.5)
        code_lines = []

    def flush_table():
        nonlocal table_rows
        if not table_rows:
            return
        # Filter separator rows
        data_rows = []
        for row in table_rows:
            cells = [c.strip() for c in row.strip("|").split("|")]
            if all(re.match(r"^:?-{2,}:?$", c) or c == "" for c in cells):
                continue
            data_rows.append(cells)
        table_rows = []
        if not data_rows:
            return
        max_cols = max(len(r) for r in data_rows)
        if max_cols == 0 or max_cols > 10:
            return
        t = doc.add_table(rows=len(data_rows), cols=max_cols)
        t.style = "Table Grid"
        for r_idx, r_cells in enumerate(data_rows):
            for c_idx in range(min(len(r_cells), max_cols)):
                cell = t.cell(r_idx, c_idx)
                cell.text = clean_inline_markdown(r_cells[c_idx])
                for p in cell.paragraphs:
                    for run in p.runs:
                        run.font.size = Pt(8.5)
                        if r_idx == 0:
                            run.bold = True

    for line in full_md.splitlines():
        if line.startswith("<!-- SOURCE:"):
            flush_code()
            flush_table()
            continue

        if line.strip().startswith("```"):
            flush_table()
            if in_code_block:
                flush_code()
                in_code_block = False
            else:
                in_code_block = True
            continue

        if in_code_block:
            code_lines.append(line)
            continue

        if line.strip().startswith("|") and line.strip().endswith("|"):
            table_rows.append(line.strip())
            continue
        else:
            flush_table()

        stripped = line.strip()
        if not stripped or stripped == "---" or stripped == "⸻":
            continue

        if stripped.startswith("# "):
            doc.add_heading(clean_inline_markdown(stripped[2:].strip()), level=1)
        elif stripped.startswith("## "):
            doc.add_heading(clean_inline_markdown(stripped[3:].strip()), level=2)
        elif stripped.startswith("### "):
            doc.add_heading(clean_inline_markdown(stripped[4:].strip()), level=3)
        elif stripped.startswith("#### "):
            doc.add_heading(clean_inline_markdown(stripped[5:].strip()), level=4)
        elif stripped.startswith("> "):
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.3)
            run = p.add_run(clean_inline_markdown(stripped[2:].strip()))
            run.italic = True
            run.font.color.rgb = RGBColor(35, 65, 105)
        elif stripped.startswith("- ") or stripped.startswith("* "):
            doc.add_paragraph(
                clean_inline_markdown(stripped[2:].strip()), style="List Bullet"
            )
        else:
            doc.add_paragraph(clean_inline_markdown(stripped))

    flush_code()
    flush_table()
    doc.save(out_docx_path)
    size_mb = os.path.getsize(out_docx_path) / (1024 * 1024)
    print(f"[DOCX] Wrote {out_docx_path}: {size_mb:.2f} MB")


if __name__ == "__main__":
    md_text = build_umbrella_markdown()
    build_docx(md_text)
