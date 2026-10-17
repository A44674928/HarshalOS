#!/usr/bin/env python3
"""
Compile the business plan + all loose documents + figures into one PDF.
Output: single-parcel-APN30055004/docs/FRONTIERSHIP_FULL_PACKAGE.pdf
Uses python-markdown -> HTML -> PyMuPDF Story (pure-wheel layout engine).
"""
import glob
import os

import markdown
import pymupdf
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PKG = os.path.join(ROOT, "single-parcel-APN30055004")
DOCS = os.path.join(PKG, "docs")
OUT = os.path.join(DOCS, "FRONTIERSHIP_FULL_PACKAGE.pdf")

SECTIONS = [
    ("BUSINESS_PLAN_TEMPLATE.md", "Business Plan"),
    ("PREDEV_CHECKLIST.md", "Pre-Development Checklist"),
    ("SAFETY_FIRST_HQ_MEDICAL.md", "Outpost One — HQ & Medical Program"),
    ("FRONTIER_RESIDENCY_MAX_STUDY.md", "Residency Max-Capacity Study (v3)"),
    ("AI_FRONTIER_LAB.md", "AI Frontier Lab"),
    ("ISOLATED-PARCEL-STRATEGY.md", "Isolated-Parcel Strategy"),
    ("ROI_ELEVATION_OPTIMIZED.md", "ROI / Elevation-Optimized Analysis"),
    ("NEXT_STEPS_AND_BUSINESS_PLAN_ROADMAP.md", "Next Steps & Roadmap"),
]

CSS = """
body { font-family: serif; font-size: 9.3pt; line-height: 1.42; color: #14181f; }
h1 { font-family: sans-serif; font-size: 16pt; color: #0A0E14;
     border-bottom: 2.5pt solid #E8C547; padding-bottom: 5pt; margin-bottom: 8pt; }
h2 { font-family: sans-serif; font-size: 12pt; color: #1f3a5f;
     border-bottom: 0.6pt solid #c9d2e0; padding-bottom: 2pt; margin-top: 14pt; }
h3 { font-family: sans-serif; font-size: 10.2pt; color: #2a7a46; margin-top: 10pt; }
h4 { font-family: sans-serif; font-size: 9.5pt; color: #444; margin-top: 8pt; }
p  { margin: 4pt 0; }
table { border-collapse: collapse; width: 100%; font-size: 7.6pt; margin: 6pt 0; }
th { background-color: #0A0E14; color: #E8C547; font-family: sans-serif;
     font-size: 7.6pt; padding: 3pt; border: 0.5pt solid #7a8496; text-align: left; }
td { padding: 3pt; border: 0.5pt solid #aab2c0; vertical-align: top; }
tr:nth-child(even) td { background-color: #f4f6f9; }
ul, ol { margin: 4pt 0 4pt 14pt; padding-left: 6pt; }
li { margin-bottom: 2.5pt; }
code { font-family: monospace; font-size: 8.2pt; background-color: #eef1f6; }
pre { font-family: monospace; font-size: 8pt; background-color: #0A0E14; color: #E8EDF5;
      padding: 8pt; margin: 6pt 0; }
img { width: 100%; margin: 4pt 0; }
strong { color: #0A0E14; }
blockquote { border-left: 2.5pt solid #E8C547; padding-left: 8pt; color: #444;
             font-style: italic; margin: 6pt 0; }
hr { border: none; border-top: 1pt solid #E8C547; margin: 10pt 0; }
"""

COVER_CSS = """
body { font-family: sans-serif; color: #0A0E14; }
.brand { font-size: 34pt; font-weight: bold; letter-spacing: 6pt; margin-top: 120pt;
         text-align: center; color: #0A0E14; }
.rule { text-align: center; font-size: 12pt; color: #E8C547; margin: 6pt 0 18pt 0; }
.sub { font-size: 15pt; text-align: center; color: #1f3a5f; margin-bottom: 4pt; }
.meta { font-size: 9.5pt; text-align: center; color: #555; margin-bottom: 26pt; }
.toc { font-size: 9.5pt; margin: 10pt 30pt; }
.toc li { margin-bottom: 5pt; }
.kv { font-size: 9pt; color: #333; margin: 3pt 30pt; }
.foot { font-size: 8pt; color: #777; text-align: center; margin-top: 40pt; }
"""


def md(text):
    return markdown.markdown(text, extensions=["tables", "fenced_code", "sane_lists"])


def figure_appendix():
    """Copy figures into .pkg_build as JPEGs — Story embeds PNGs pathologically large."""
    build = os.path.join(ROOT, ".pkg_build")
    os.makedirs(build, exist_ok=True)
    parts = ["<h1>Appendix A — Figures</h1>"]
    figs = sorted(glob.glob(os.path.join(PKG, "clean-sheet", "*.png")))
    figs += sorted(glob.glob(os.path.join(PKG, "terrain_real", "*preview*.png")))
    for f in figs:
        name = os.path.splitext(os.path.basename(f))[0]
        jpg = os.path.join(build, name + ".jpg")
        im = Image.open(f).convert("RGB")
        if im.width > 2400:
            im = im.resize((2400, int(im.height * 2400 / im.width)), Image.LANCZOS)
        im.save(jpg, "JPEG", quality=85, optimize=True)
        rel = os.path.relpath(jpg, ROOT).replace(os.sep, "/")
        parts.append(f"<h2>{name.replace('_', ' ')}</h2><img src='{rel}'/>")
    parts.append("<h1>Appendix B — Workbooks (not embedded)</h1>")
    parts.append("""
<table>
<tr><th>Workbook</th><th>Tabs</th><th>Use</th></tr>
<tr><td>docs/OUTPOST_ONE_ProForma.xlsx</td><td>Assumptions · ProForma_5yr · Sensitivity</td>
<td>HQ operating model — steady NOI $1.43M, 6.7% cap on $21.5M, break-even 44%. Regen:
<code>python scripts/generate_hq_proforma_xlsx.py</code></td></tr>
<tr><td>docs/APN30055004_ProForma.xlsx</td><td>Assumptions · ProForma_5yr · Sensitivity</td>
<td>Lodge/ADU base-case (B / C / B+C) 5-yr monthly. Regen:
<code>python scripts/generate_proforma_xlsx.py</code></td></tr>
</table>
<p><strong>Figure generators:</strong> <code>generate_hq_safety_first.py</code> ·
<code>generate_residency_v3.py</code> · <code>generate_clean_sheet_plan.py</code> —
all under <code>scripts/</code>; re-run to refresh figures.</p>""")
    return "\n".join(parts)


def cover_html(commit):
    toc = "".join(
        f"<li>{label} <span style='color:#888'>({fn})</span></li>"
        for fn, label in SECTIONS
    )
    toc += "<li>Appendix A — Figures</li><li>Appendix B — Workbooks</li>"
    return f"""
<div class="brand">FRONTIERSHIP</div>
<div class="rule">— OUTPOST · OUTPOST ONE —</div>
<div class="sub">APN 30055004 — Kendrick Park Bench, 26 mi N of Flagstaff</div>
<div class="sub">Full Business Plan &amp; Accompanying Documents</div>
<div class="meta">Compiled 2026-10-17 · General Purpose + Life Sciences · 62 beds (57 + 5 owner) · $4,800/mo</div>
<div class="kv"><strong>Repository:</strong> A44674928/HarshalOS &nbsp;·&nbsp;
<strong>Branch:</strong> arena/23e0b069-harshalos &nbsp;·&nbsp;
<strong>PR:</strong> #152 &nbsp;·&nbsp;
<strong>Commit:</strong> {commit}</div>
<div class="kv"><strong>Compiled by:</strong> scripts/compile_package.py — regenerate with
<code>python scripts/compile_package.py</code></div>
<ol class="toc">{toc}</ol>
<div class="foot">Owner economics · gates before capital · no cross-parcel dependencies — see Pre-Development Checklist</div>
"""


def add_story(writer, html, css, archive):
    story = pymupdf.Story(html=html, user_css=css, archive=archive)
    mediabox = pymupdf.paper_rect("a4")
    where = mediabox + (42, 46, -42, -46)
    more = 1
    pages = 0
    while more:
        dev = writer.begin_page(mediabox)
        more, _ = story.place(where)
        story.draw(dev)
        writer.end_page()
        pages += 1
    return pages


def main():
    commit = subprocess_commit()
    archive = pymupdf.Archive(ROOT)
    writer = pymupdf.DocumentWriter(OUT)

    total = add_story(writer, cover_html(commit), COVER_CSS, archive)

    for fn, _label in SECTIONS:
        path = os.path.join(DOCS, fn)
        with open(path, encoding="utf-8") as fh:
            body = fh.read()
        html = f"<p style='font-family:sans-serif;color:#888;font-size:8pt'>Source: single-parcel-APN30055004/docs/{fn}</p>" + md(body)
        total += add_story(writer, html, CSS, archive)

    total += add_story(writer, figure_appendix(), CSS, archive)
    writer.close()

    size_mb = os.path.getsize(OUT) / 1e6
    print(f"Saved {OUT} — {total} pages, {size_mb:.1f} MB")


def subprocess_commit():
    import subprocess
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, text=True
        ).strip()
    except Exception:
        return "unknown"


if __name__ == "__main__":
    main()
