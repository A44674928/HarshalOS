#!/usr/bin/env python3
"""Build the v0.2 KDP print source: REORG-FINAL (v2.1) + Appendix G.

Usage:
    python3 build_ags_v02_source.py            # write v0.2 source (placeholder folios)
    python3 build_ags_v02_source.py --patch-folios folios.json

The v2.1 master is never modified. Appendix G print text is generated from the
Appendix G Python module at build time, so the module stays the single source
of truth for appendix content.
"""
from __future__ import annotations

import importlib.util
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
V21 = HERE / "HARSHAL-SYSTEMS-Book-I-REORG-FINAL-2026-10-07.txt"
V02 = HERE / "AGS-v0.2-Harshal-s-Systems-Full-Book-PRINT-SOURCE-2026-10-07.txt"
APPG_MOD = HERE / "HARSHAL-SYSTEMS-Book-I-APPENDIX-G-CORE-BOOK-AI-COMPANION-2026-10-07.py"

APPENDIX_G_CONTENTS_ROW = "| Appendix G \u2014 Core Book AI Companion (Machine-Readable) | GGG |"
APPENDIX_G_REGISTER_ROW = (
    "| G | Core Book AI Companion: machine-readable Part I text with stable IDs "
    "and exports; included in v0.2 | Machine-readable companion; print text included | "
    "Companion module is reference data; asserts and grants no runtime permission. |"
)

# Full-book hardcover ISBN supplied by the user (check digit verified).
# 9798245483795 belongs to the separate AGS v0.1 paperback, not this book.
HARDCOVER_ISBN = "979-8-17350-994-9"   # 9798173509949


def load_appg():
    spec = importlib.util.spec_from_file_location("appg", APPG_MOD)
    module = importlib.util.module_from_spec(spec)
    sys.modules["appg"] = module  # dataclass string annotations need this
    spec.loader.exec_module(module)
    return module


def appendix_g_print_text() -> str:
    appg = load_appg()
    L: list[str] = []
    A = L.append
    A("Appendix G \u2014 Core Book AI Companion (Machine-Readable Companion to Part I)")
    A("")
    A("This appendix presents the complete text of Part I, \u201cThe Core Book\u201d \u2014 Chapters 1 through 10 and the Epilogue \u2014 in a companion prepared for machine reading. The authoritative digital artifact is the Python module distributed alongside this edition (see Section G.2); the print text here is complete and self-contained, transcribed verbatim from the September 2026 source, with section heads split into number and title exactly as in the module.")
    A("")
    A("\u2022 What this appendix contains: the ten Core Book chapters and the epilogue (Sections G.1 and G.2 below explain identifiers, provenance, and machine use; Section G.3 shows the machine-readable schema).")
    A("\u2022 How to cite: every chapter, section, and paragraph carries a stable identifier (see the table in Section G.1). Cite the identifier together with this edition.")
    A("\u2022 Standing: this appendix is reference data. It asserts no runtime permission and grants none. Narrative or mythic expressions remain non-executable under the source manifesto\u2019s Symbolic Firewall; the companion module only reads, searches, and exports its embedded text.")
    A("")
    A("Section G.1 \u2014 Stable Identifiers and Machine Use")
    A("")
    A("Each unit of text carries a permanent identifier built on the appendix stamp HS-B1-APPG-2026-10-07. Identifiers are stable across print and digital forms of this edition.")
    A("")
    A("| Level | Identifier pattern | Example |")
    A("|---|---|---|")
    A("| Chapter | HS-B1-APPG-2026-10-07-CHnn | HS-B1-APPG-2026-10-07-CH03 (Chapter 3) |")
    A("| Section | HS-B1-APPG-2026-10-07-Sn-m | HS-B1-APPG-2026-10-07-S3-5 (Section 3.5) |")
    A("| Paragraph | HS-B1-APPG-2026-10-07-Pnnnn | HS-B1-APPG-2026-10-07-P0001 (global ordinal) |")
    A("")
    A("The companion module exposes the same text as typed Python data with JSON and Markdown export, keyword search, flat paragraph records for retrieval use, and a command-line interface. Verification is built in: the module\u2019s self-test checks the unit, section, paragraph, and word counts (11 units, 94 sections, 774 paragraphs, 5,961 words) and round-trips both exports.")
    A("")
    A("Section G.2 \u2014 Source Provenance and Integrity")
    A("")
    A("Source file: AGS_v0_2__Harshal_s_Systems_September_2026__UPDATED.docx (Drive file 1P0OI6YAxQbdynjNgVKGyAosfTB68Nbu3; 5,024,723 bytes; SHA-256 c2da74ca82c273c16ee1b3fbfa100bf993992d4dd27b2c6e1861914457e22867). Extracted body spans are word/document.xml paragraphs 427\u20131675, excluding the title paragraphs; front matter, the table of contents, Part II Formalization, and supporting material are not part of this appendix.")
    A("")
    A("The source manifesto entry carries Phase Declaration Header PDH-2026-MANIFESTO-A44674928, declaring the Neural Atomic Body (refusal-bound) phase at center origin 0\u2022000\u2022000\u20220000 with terminal refusal semantics, disabled symbolism executability, and degrading time-authority effect (declaration hash 0x98A44674928A44674928A44674928F01). Its conformance sentence reads: \u201cThis system conforms to AGS+ v1.0, incorporating AGS normative constraints, the frozen Structural Model v1.0, and OCM communication geometry, with no internal legitimacy generation or authority persistence.\u201d")
    A("")
    for ch in appg.CHAPTERS:
        if ch.is_epilogue:
            A("Epilogue \u2014 A System That Knows When to Halt")
        else:
            A(f"Chapter {ch.key} \u2014 {ch.toc_title}")
        A("")
        for sec in ch.sections:
            if not ch.is_epilogue:
                A(f"{sec.number} {sec.title}")
                A("")
            for p in sec.paragraphs:
                A(p)
            A("")
    A("Section G.3 \u2014 Machine-Readable Schema (Excerpt)")
    A("")
    A("The companion module models the text above as immutable records. The schema excerpt below shows the record shapes and one exported paragraph record (abridged); the distributed Python file is the complete and authoritative form.")
    A("")
    A("    @dataclass(frozen=True)")
    A("    class Section:")
    A("        number: str        # e.g. \"3.5\" (epilogue: \"E\")")
    A("        title: str")
    A("        paragraphs: tuple[str, ...]")
    A("")
    A("    @dataclass(frozen=True)")
    A("    class Chapter:")
    A("        key: str           # \"1\"..\"10\" or \"E\"")
    A("        toc_title: str")
    A("        sections: tuple[Section, ...]")
    A("")
    A("    {\"id\": \"HS-B1-APPG-2026-10-07-P0001\", \"chapter\": \"1\",")
    A("     \"section\": \"1.1\", \"words\": 6,")
    A("     \"text\": \"Primary Error: Assuming ownership equals possession.\"}")
    A("")
    return "\n".join(L)


def replace_once(lines: list[str], old: str, new: str, *, line_no: int | None = None) -> None:
    if line_no is not None:
        idx = line_no - 1
        assert lines[idx] == old, f"line {line_no} mismatch:\n{lines[idx]!r}\n!=\n{old!r}"
        lines[idx] = new
        return
    hits = [i for i, ln in enumerate(lines) if ln == old]
    assert len(hits) == 1, f"expected 1 hit, got {len(hits)} for {old[:70]!r}"
    lines[hits[0]] = new


def build() -> dict:
    lines = V21.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 15142, f"unexpected v2.1 line count: {len(lines)}"

    # 1-3. Edition strings.
    replace_once(lines, "(PRODUCTION EDITION \u2014 VERSION 2.1)",
                 "(PRODUCTION EDITION \u2014 VERSION 0.2)", line_no=3)
    replace_once(lines, "Edition: Production Edition v2.1, October 2026",
                 "Edition: AGS v0.2, October 2026", line_no=11)
    lines[0] = "AGS v0.2: Harshal’s Systems"
    lines[1] = "FULL BOOK"
    lines[3] = "AGS v0.2: Harshal’s Systems"
    lines[35] = "AGS v0.2: Harshal’s Systems"
    lines[36] = "FULL BOOK"
    old_includes = ("Includes a plain-language reader orientation, updated public-source citations, "
                    "worked examples, end-of-part student review questions in every current Part except "
                    "protected Part XIX, including Part XIX-B, and a consolidated glossary.")
    assert lines[11].startswith(old_includes), lines[11][:120]
    lines[11] = lines[11].replace(
        "including Part XIX-B, and a consolidated glossary.",
        "including Part XIX-B, a machine-readable Appendix G companion to Part I, "
        "and a consolidated glossary.", 1)
    # 4. KDP production block page count -> placeholder (patched after render).
    assert "the 519-page interior is within" in lines[25], lines[25][:100]
    lines[25] = lines[25].replace("the 519-page interior is within",
                                  "the NNN-page interior is within", 1)
    # Duplicate title block edition label.
    replace_once(lines, "PRODUCTION EDITION \u2014 VERSION 2.1",
                 "PRODUCTION EDITION \u2014 VERSION 0.2", line_no=41)
    old_tag = ("With a plain-language orientation, worked examples, end-of-part review questions "
               "in every current Part except Part XIX, including Part XIX-B, and a consolidated glossary")
    replace_once(lines, old_tag,
                 old_tag.replace("including Part XIX-B, and a consolidated glossary",
                                 "including Part XIX-B, a machine-readable Appendix G, "
                                 "and a consolidated glossary", 1), line_no=42)
    # 7. Contents: Appendix G row after Appendix F row.
    f_row = "| Appendix F \u2014 Signal Class Quick Reference | 486 |"
    idx = lines.index(f_row)
    assert lines[idx + 1].startswith("| Consolidated Glossary |"), lines[idx + 1]
    lines.insert(idx + 1, APPENDIX_G_CONTENTS_ROW)
    # 8. End-Matter Register: G row after F row.
    f_reg = next(i for i, ln in enumerate(lines)
                 if ln.startswith("| F | Signal Class Quick Reference;"))
    lines.insert(f_reg + 1, APPENDIX_G_REGISTER_ROW)
    # 9b. Full-book ISBNs into the KDP specification block.
    replace_once(lines,
                 "\u2022 ISBN-13 (Paperback): 979-8-________-_-_ "
                 "(Assign only if the selected format/trim is available in KDP)",
                 "\u2022 Paperback ISBN-13: Assign a distinct Full-book ISBN in KDP; "
                 "KDP will generate the barcode", line_no=34)
    replace_once(lines,
                 "\u2022 ISBN-13 (Hardcover): 979-8-________-_-_ (Assign in KDP Dashboard)",
                 f"\u2022 ISBN-13 (Hardcover): {HARDCOVER_ISBN}", line_no=35)
    replace_once(lines,
                 "\u2022 This is the Production Edition of Book I, prepared for print. "
                 "“Production” describes editorial and print preparation; it does not "
                 "certify any system, validate a technical proposal, or claim that a "
                 "described control is deployed.",
                 "\u2022 This is the AGS v0.2 full-book edition of Harshal’s Systems, "
                 "prepared for print. The edition label describes editorial and print "
                 "preparation; it does not certify any system, validate a technical "
                 "proposal, or claim that a described control is deployed.")
    # 9. Appendix G body before the glossary.
    g_idx = next(i for i, ln in enumerate(lines) if ln == "Consolidated Glossary")
    assert lines[g_idx - 1] == "", repr(lines[g_idx - 1])
    appg_text = appendix_g_print_text()
    lines[g_idx:g_idx] = appg_text.splitlines() + [""]

    V02.write_text("\n".join(lines) + "\n", encoding="utf-8")
    # Word count under the Book I QA rule.
    words = len(re.findall(r"(?u)\b[\w]+(?:[\u2019'-][\w]+)*\b", "\n".join(lines)))
    return {"output": str(V02), "lines": len(lines),
            "bytes": V02.stat().st_size, "words": words}


def patch_folios(map_path: Path, page_count: int | None = None) -> dict:
    """Rewrite Contents folios + KDP-block page count from measured values."""
    folios = json.loads(map_path.read_text(encoding="utf-8"))
    lines = V02.read_text(encoding="utf-8").splitlines()
    try:
        start = next(i for i, ln in enumerate(lines) if ln == "Contents")
    except StopIteration:
        raise RuntimeError("Contents heading not found")
    assert lines[start + 1] == "| Section | Page |", lines[start + 1]
    patched = 0
    i = start + 3  # skip header + delimiter
    while i < len(lines) and lines[i].startswith("| "):
        cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
        assert len(cells) == 2, lines[i]
        label = cells[0]
        if label not in folios:
            raise RuntimeError(f"no measured folio for contents row {label!r}")
        lines[i] = f"| {label} | {folios[label]} |"
        patched += 1
        i += 1
    if page_count is not None:
        hits = [i for i, ln in enumerate(lines) if "the NNN-page interior is within" in ln
                or re.search(r"the \d+-page interior is within", ln)]
        assert len(hits) == 1, hits
        lines[hits[0]] = re.sub(r"the (?:NNN|\d+)-page interior is within",
                                f"the {page_count}-page interior is within", lines[hits[0]])
    V02.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return {"patched_rows": patched, "page_count": page_count}


if __name__ == "__main__":
    if len(sys.argv) == 1:
        for k, v in build().items():
            print(f"{k}: {v}")
    elif len(sys.argv) in (3, 4) and sys.argv[1] == "--patch-folios":
        pages = int(sys.argv[3]) if len(sys.argv) == 4 else None
        for k, v in patch_folios(Path(sys.argv[2]), pages).items():
            print(f"{k}: {v}")
    else:
        raise SystemExit("usage: build_ags_v02_source.py [--patch-folios folios.json [pages]]")
