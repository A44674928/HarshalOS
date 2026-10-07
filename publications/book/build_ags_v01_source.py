#!/usr/bin/env python3
"""Derive the short AGS v0.1 manuscript from the Full Book source.

The short edition consists only of Part I (The Core Book) plus Appendix G
(the machine-readable companion to Part I). The source spans are copied
verbatim; a concise title/scope page is added above them.
"""
from __future__ import annotations

import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
FULL_SOURCE = HERE / "AGS-v0.2-Harshal-s-Systems-Full-Book-PRINT-SOURCE-2026-10-07.txt"
OUTPUT = HERE / "AGS-v0.1-Accountability-Gated-Systems-CORE-BOOK-plus-APPENDIX-G-SOURCE-2026-10-07.txt"
CORE_TITLE = "Part I — The Core Book"
FORMALIZATION_TITLE = "Part II — Formalization"
APPENDIX_G_TITLE = "Appendix G — Core Book AI Companion (Machine-Readable Companion to Part I)"
GLOSSARY_TITLE = "Consolidated Glossary"

FRONT_MATTER = """ACCOUNTABILITY-GATED SYSTEMS
AGS v0.1
The Core Book + Appendix G

Harshal Priyavadan Patel
October 2026

Copyright © 2026 by Harshal Priyavadan Patel
All rights reserved.

ISBN-13 (Paperback): 979-8-24548-379-5
ISBN-13 (Hardcover): 979-8-16078-278-2

SHORT-EDITION SCOPE NOTE
This concise edition is derived from AGS v0.2: Harshal’s Systems. It contains
Part I — The Core Book and Appendix G — Core Book AI Companion. Appendix G is
a machine-readable companion to Part I; it repeats the core argument in a
machine-oriented representation and supplies stable identifiers, provenance,
and a schema excerpt. Parts II–XXV, the other appendices, and the consolidated
glossary are not included. Cross-references in the reproduced text to those
omitted sections refer to the Full Book edition.

CONTENTS
Part I — The Core Book
  Chapters 1–10 and the Epilogue
Appendix G — Core Book AI Companion (Machine-Readable Companion to Part I)
  G.1 Stable Identifiers and Machine Use
  G.2 Source Provenance and Integrity
  G.3 Machine-Readable Schema (Excerpt)

"""


def extract() -> dict:
    lines = FULL_SOURCE.read_text(encoding="utf-8").splitlines()
    core_start = lines.index(CORE_TITLE)
    core_end = lines.index(FORMALIZATION_TITLE, core_start)
    appg_start = lines.index(APPENDIX_G_TITLE)
    appg_end = lines.index(GLOSSARY_TITLE, appg_start)
    core = lines[core_start:core_end]
    appg = lines[appg_start:appg_end]
    assert core and appg
    assert core[0] == CORE_TITLE and appg[0] == APPENDIX_G_TITLE
    body = "\n".join(core).rstrip() + "\n\n\n" + "\n".join(appg).rstrip() + "\n"
    out = FRONT_MATTER + body
    OUTPUT.write_text(out, encoding="utf-8")
    words = len(re.findall(r"(?u)\b[\w]+(?:[’'-][\w]+)*\b", out))
    return {
        "output": str(OUTPUT),
        "bytes": OUTPUT.stat().st_size,
        "words": words,
        "core_source_lines": len(core),
        "appendix_g_source_lines": len(appg),
    }


if __name__ == "__main__":
    import json
    print(json.dumps(extract(), ensure_ascii=False, indent=2))
