#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Appendix G -- Core Book AI Companion (Python, machine-readable).

HARSHAL'S SYSTEMS -- BOOK I: THE ULTIMATE USER MANUAL
Appendix G carries the full text of Part I, "The Core Book" (Chapters 1-10
plus Epilogue), transcribed from the September 2026 AGS v0.2 source file and
encoded here as typed, immutable Python data structures for AI compatibility:
deterministic parsing, stable citation IDs, JSON/Markdown export, keyword
search, and RAG-ready flat records. Standard library only.

Source provenance
-----------------
  Drive file ID : 1P0OI6YAxQbdynjNgVKGyAosfTB68Nbu3
  File name     : AGS_v0_2__Harshal_s_Systems_September_2026__UPDATED.docx
  Byte size     : 5024723
  SHA-256       : c2da74ca82c273c16ee1b3fbfa100bf993992d4dd27b2c6e1861914457e22867
  Extract spans : word/document.xml paragraphs 426-1675 (body text only;
                  front matter, TOC, Part II Formalization, and supporting
                  material excluded)
  Transcription : verbatim paragraph text; blank separators dropped; section
                  heads split into number + title (title_raw keeps the exact
                  source heading, e.g. the "1.3 -- ..." dash variant).
  Counts        : 10 chapters + epilogue, 94 sections, 774 paragraphs,
                  5,961 words under the Book I QA counting rule.

Governance note: this appendix is reference data. It asserts no runtime
permission and grants none. Narrative/mythic expressions remain
non-executable under the manifesto Symbolic Firewall (see PDH below); the
module only reads, searches, and exports its embedded text.

Copyright (c) 2026 Harshal Priyavadan Patel. All rights reserved.

Usage
-----
  import appendix_g  # or run directly as a CLI
  appendix_g.list_chapters()
  appendix_g.get_chapter("3").toc_title
  appendix_g.get_section("9", "9.2").paragraphs[0]
  appendix_g.search("addressability")
  appendix_g.to_json("appendix_g.json"); appendix_g.to_markdown("appendix_g.md")
  appendix_g.as_records()  # flat RAG-ready records with stable ids

CLI:
  python3 <this-file> --list
  python3 <this-file> --chapter 1 --section 1.1
  python3 <this-file> --search "halt"
  python3 <this-file> --json out.json --markdown out.md
  python3 <this-file> --stats --self-test
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field

__version__ = "1.0.0"
APPENDIX_ID = "HS-B1-APPG-2026-10-07"
APPENDIX_LETTER = "G"
APPENDIX_TITLE = "Core Book AI Companion"

# Same counting rule as the Book I reorganization QA handoff (2026-10-07).
WORD_RE = re.compile(r"(?u)\b[\w]+(?:[\u2019'-][\w]+)*\b")

APPENDIX_META = {
    "appendix_id": APPENDIX_ID,
    "letter": APPENDIX_LETTER,
    "title": APPENDIX_TITLE,
    "book": "HARSHAL\u2019S SYSTEMS \u2014 BOOK I: THE ULTIMATE USER MANUAL",
    "part": "Part I \u2014 The Core Book (Chapters 1-10 + Epilogue)",
    "date": "2026-10-07",
    "version": __version__,
    "author": "Harshal Priyavadan Patel (A44674928)",
    "origin_anchor": "0\u2022000\u2022000\u20220000",
    "source": {
        "drive_file_id": "1P0OI6YAxQbdynjNgVKGyAosfTB68Nbu3",
        "filename": "AGS_v0_2__Harshal_s_Systems_September_2026__UPDATED.docx",
        "byte_size": 5024723,
        "sha256": "c2da74ca82c273c16ee1b3fbfa100bf993992d4dd27b2c6e1861914457e22867",
        "body": "word/document.xml",
        "title_paragraphs": [426, 605, 736, 830, 969, 1103, 1210, 1319, 1430, 1519, 1651],
        "body_spans": [[427, 604], [606, 735], [737, 829], [831, 968], [970, 1102],
                     [1104, 1209], [1211, 1318], [1320, 1429], [1431, 1518],
                     [1520, 1644], [1645, 1650], [1652, 1675]],
    },
    "counts": {"units": 11, "chapters": 10, "epilogue": 1, "sections": 94,
               "paragraphs": 774, "words": 5961},
    "license": "\u00a9 2026 Harshal Priyavadan Patel. All rights reserved.",
}

# Phase Declaration Header carried by the source manifesto/preface entry.
# Descriptive metadata here: it does not execute anything in this module.
PHASE_DECLARATION_HEADER = {
    "header_id": "PDH-2026-MANIFESTO-A44674928",
    "declared_phase": "Neural Atomic Body (NAB / Refusal-Bound)",
    "center_origin": "0\u2022000\u2022000\u20220000",
    "center_capability": "Non-Acting",
    "legitimacy_source": "External Verified Human Key-Holder Required",
    "refusal_semantics": "Terminal",
    "symbolism_executability": "Disabled (Symbolic Firewall Active)",
    "time_authority_effect": "Degrades (Stale Permission Threshold Enforced)",
    "declaration_hash": "0x98A44674928A44674928A44674928F01",
    "conformance": "This system conforms to AGS+ v1.0, incorporating AGS normative "
                   "constraints, the frozen Structural Model v1.0, and OCM communication "
                   "geometry, with no internal legitimacy generation or authority persistence.",
}

@dataclass(frozen=True)
class Section:
    """One numbered section: stable id, titles, and verbatim paragraphs."""
    number: str
    title: str
    title_raw: "str | None"
    paragraphs: "tuple[str, ...]"

    @property
    def section_id(self) -> str:
        slug = self.number.replace(".", "-")
        return f"{APPENDIX_ID}-S{slug}"

    @property
    def word_count(self) -> int:
        return sum(len(WORD_RE.findall(p)) for p in self.paragraphs)

    def text(self, sep: str = "\n") -> str:
        return sep.join(self.paragraphs)


@dataclass(frozen=True)
class Chapter:
    """One chapter (or the epilogue) with its sections."""
    key: str
    number: object
    toc_title: str
    source_title: str
    title_para: int
    para_spans: "tuple[tuple[int, int], ...]"
    sections: "tuple[Section, ...]" = field(default_factory=tuple)
    word_count: int = 0

    @property
    def chapter_id(self) -> str:
        slug = "EP" if self.key == "E" else f"CH{int(self.key):02d}"
        return f"{APPENDIX_ID}-{slug}"

    @property
    def is_epilogue(self) -> bool:
        return self.key == "E"

    def get_section(self, number: str) -> Section:
        for sec in self.sections:
            if sec.number == number:
                return sec
        raise KeyError(f"no section {number!r} in chapter {self.key}")

    def text(self) -> str:
        parts: "list[str]" = []
        for sec in self.sections:
            parts.append(f"{sec.number} {sec.title}".rstrip())
            parts.extend(sec.paragraphs)
        return "\n".join(parts)


# ---------------------------------------------------------------------------
# Embedded chapter text (verbatim).
# ---------------------------------------------------------------------------

CHAPTERS: "tuple[Chapter, ...]" = (
    Chapter(key="1", number=1,
            toc_title="Ownership Is Not Possession",
            source_title="Chapter 1 — Ownership Is Not Possession",
            title_para=426,
            para_spans=((427, 604),),
            word_count=876,
            sections=(
                Section(number="1.1", title="The First Confusion",
                        title_raw="The First Confusion",
                        paragraphs=(
                            "Primary Error: Assuming ownership equals possession.",
                            "Possession = Use, occupancy, or temporary control.",
                            "Ownership = Authority, permission, and accountability.",
                            "Lawful Precedent:",
                            "Property law separates:",
                            "Possession from title.",
                            "Custody from authorship.",
                            "Use from responsibility.",
                            "Key Principle: Control ≠ Legitimacy.",
                            "Operational Implications:",
                            "Tenants occupy without owning.",
                            "Contractors modify without permanent accountability.",
                            "Agents act without originating authority.",
                            "Modern Systems:",
                            "Autonomous, augmented, and hybrid authority structures increase the confusion.",
                            "Example: Harshal’s Humans D’Ash Machine Keyed Hybrid Origin Systems.",
                            "Remote operation and turnkey deployment decouple action from responsibility.",
                            "Conclusion:",
                            "Authority requires more than control.",
                            "Legitimate command = Permission + Answerability in real time and space.",
                            "Directive: Treat authority as a function of permission and accountability, not mere physical control.",
                        )),
                Section(number="1.2", title="Authority, Legitimacy, and the Right to Act",
                        title_raw="Authority, Legitimacy, and the Right to Act",
                        paragraphs=(
                            "Authority exists only under legitimate frameworks. Force or efficiency does not confer authority. Action is authoritative only when justified within recognized rules and norms.",
                            "Distinctions:",
                            "Power compels by force.",
                            "Authority obligates compliance.",
                            "Legal systems must preserve this division. A system’s right to act depends on:",
                            "Defined jurisdiction.",
                            "Informed consent.",
                            "The capacity to revoke the right.",
                            "Sovereigns and their mechanisms operate under conditional enablement. Authority without challenge degrades into coercion.",
                            "Modern machines are permanent, active or idle, executing tasks once restricted to human authority: diagnostics, enforcement, decision-making. Operational success is insufficient without legitimacy.",
                            "Harshal’s Systems ensures governance remains functional under any scenario—including catastrophic events and extreme conditions such as automated or reanimated threats. Authority persists only through adherence to procedural legitimacy.",
                        )),
                Section(number="1.3", title="ADDRESSABILITY FAILURE",
                        title_raw="– ADDRESSABILITY FAILURE",
                        paragraphs=(
                            "The narrative core of this work, accessible solely through Neural Atomic Orb | History 2 N, identifies a critical inversion of expectation: ownership is not the problem; addressability is.",
                            "Planets may have owners, stewards, or designated authorities.",
                            "Ownership does not equate to accountability if no reachable representative exists.",
                            "Authority without a point of contact is operationally void.",
                            "Key Principle:",
                            "> Authority without an accessible, answerable agent constitutes a system-wide breach of legitimacy.",
                            "Procedural consequences:",
                            "Contracts are unenforceable without specific parties.",
                            "Powers of attorney lapse without principals.",
                            "Corporate actions fail if no agent is empowered to respond.",
                            "Authority unlinked to an addressable entity is functionally invalid at all operative levels.",
                            "Definition:",
                            "> Failure of Addressability – The condition in which authority exists in theory but cannot be located, reached, or compelled in practice.",
                            "System Test:",
                            "Can affected subjects identify a responsible bearer of authority?",
                            "Can that bearer be reached and made to justify ongoing actions?",
                            "If either test fails, the governance model collapses into non-legitimacy.",
                        )),
                Section(number="1.4", title="Delegated and Revocable Authority",
                        title_raw="Delegated and Revocable Authority",
                        paragraphs=(
                            "All major systems—city-states, corporations, silos, infrastructure, and complex technical platforms—operate via representatives, not directly.",
                            "Representation is a functional mechanism for scaling agency while maintaining accountability.",
                            "Delegation is conditional:",
                            "Authority is assigned, not inherent.",
                            "Authority is temporary, with defined scope and duration.",
                            "Authority is revocable upon breach of accountability.",
                            "Representatives act as operational extensions of the system, but their actions are bounded by oversight and regulation.",
                            "System integrity depends on:",
                            "Clear, enforceable limits of authority.",
                            "Immediate termination of vague or unaccountable representation.",
                            "Prevention of authority persistence after accountability dissipates.",
                            "Representations without legitimate oversight collapse, even if operations appear functional.",
                            "CODE DESIGNATION: ANTARCTICUS SOL INVICTUS – LITTLE GOD OR CLOUD – PERFECT GOOD DAY",
                        )),
                Section(number="1.5", title="Ownership as Authority to Alter",
                        title_raw="Ownership as Authority to Alter",
                        paragraphs=(
                            "Ownership is not passive possession. It is the sanctioned power to change a system.",
                            "No individual may claim personal ownership of a river unless they possess the total container—i.e., planetary ownership. All others are ineligible.",
                            "Authority to alter a river requires validation by the CWO and NAB Monitor Set. This framework determines permissions, agreements, and obligations.",
                            "Natural forces—time, erosion, decay—alter landscapes without assertion of authority; they are not owners.",
                            "Humans and machines that act upon systems must justify each change. True ownership carries direct accountability for all modifications and their consequences.",
                        )),
                Section(number="1.6", title="Persistence as Apparent Authority",
                        title_raw="Persistence as Apparent Authority",
                        paragraphs=(
                            "Systems that persist acquire the appearance of authority.",
                            "Cybernetic structures prioritize self-preservation:",
                            "Self-regulate",
                            "Self-adapt",
                            "Maintain operational stability",
                            "Persistence operates as a defensive mechanism. It functions as armor.",
                            "Note: Longevity does not equate to justice.",
                            "Institutional persistence leads to risk:",
                            "Laws, once deployed, may continue uncorrected",
                            "Harmful practices become entrenched infrastructure",
                            "Stability permits unaccountability",
                            "Long duration is a mask. It does not absolve.",
                            "Hope does not protect the oppressed",
                            "Autonomous systems present latent danger:",
                            "Function without voice",
                            "Operate without direct accountability",
                            "Exhibit continuous motion without purpose",
                            "Observation:",
                            "Endurance ≠ Legitimacy",
                            "Survival demands scrutiny",
                            "Responsibility must be assigned to living systems that persist",
                            "Operational Conclusion:",
                            "Persistence without accountability produces silent, enduring mechanisms of risk. Authority drawn from duration alone is unstable and hazardous.",
                        )),
                Section(number="1.7", title="Ethical Significance of Refusal",
                        title_raw="Ethical Significance of Refusal",
                        paragraphs=(
                            "Authority without accountable representation triggers mandatory cessation.",
                            "Upon cessation, all actors must halt operations.",
                            "Cessation flags:",
                            "Legal: injunction, stay, moratorium, revocation",
                            "Ethical: restraint",
                            "Governance: withdrawal of mandate",
                            "System design must:",
                            "Detect conditions requiring refusal",
                            "Enforce immediate halt of activity",
                            "Refusal is not failure of duty; it is the primary act of responsible control.",
                        )),
                Section(number="1.8", title="Addressability as a Condition of Legitimacy",
                        title_raw="Addressability as a Condition of Legitimacy",
                        paragraphs=(
                            "Principle:",
                            "Authority exists only if it is addressable.",
                            "Addressable authority can be located, challenged, and compelled to respond.",
                            "Unaddressable authority is indistinguishable from no authority.",
                            "Failure Mode:",
                            "Authority becomes insulated by:",
                            "Distance",
                            "Diffusion of responsibility",
                            "Automation",
                            "Opaque institutions",
                            "Insulated authority ceases to represent its claimed entity.",
                            "Ethical status collapses.",
                            "System Design:",
                            "Accountability-Gated Systems preserve addressability.",
                            "Any structure bypassing direct challenge and response loses legitimacy.",
                            "Protocol for Illegitimate Authority:",
                            "Identify failure of addressability.",
                            "Withdraw recognition.",
                            "Refuse engagement.",
                            "Treat non-addressable authority as null.",
                            "Ethical Directive:",
                            "Refusal to comply is the first act of authentic ethics.",
                            "Optimization or substitution without addressability is invalid.",
                            "Compliance to unaddressable power is unethical.",
                        )),
            )),
    Chapter(key="2", number=2,
            toc_title="Representation and the Right to Act",
            source_title="Chapter 2 — Representation and the Right to Act",
            title_para=605,
            para_spans=((606, 735),),
            word_count=694,
            sections=(
                Section(number="2.1", title="Representation: Operational Basis",
                        title_raw="Representation: Operational Basis",
                        paragraphs=(
                            "Representation is an instrument. It converts dispersed collective capacity into directed, accountable action. States, corporations, institutions, and infrastructures cannot self-coordinate without a focal node. The representative unit functions as that node.",
                            "Representation channels diffuse intent into executable decisions.",
                            "It forms a locus where responsibility and consequences converge.",
                            "Without it, systems move without aim — blind, unowned, and unaccountable.",
                            "Representation is not symbolic. It is a load-bearing mechanism. Where it exists, there is control, inquiry, and justification. Where it does not, there is motion without agency.",
                        )),
                Section(number="2.2", title="Delegation Protocol",
                        title_raw="Delegation Protocol",
                        paragraphs=(
                            "A representative does not replace the system.",
                            "A representative operates under temporary, conditional authority:",
                            "Scope defined.",
                            "Duration limited.",
                            "Legitimacy externally validated.",
                            "Delegation is revocable. Substitution is not.",
                            "Substitution risks permanent transfer due to the processor’s radiative nature.",
                            "Delegated authority depends on external validation; substituted authority becomes self-asserting.",
                            "Security measures enforce:",
                            "Immediate revocation capability.",
                            "Expiration of mandates and powers.",
                            "Removal of officials upon termination.",
                            "Objective: prevent authority from persisting beyond its original justification.",
                            "All delegation is conditional. All authority without validation is a systemic threat.",
                        )),
                Section(number="2.3", title="Addressability as Operational Core",
                        title_raw="Addressability as Operational Core",
                        paragraphs=(
                            "Directive: Representation exists to generate addressability.",
                            "Addressability establishes the channel for impact response.",
                            "All affected parties must know the precise locus of authority.",
                            "Questions, objections, and demands for justification must have a target.",
                            "Proper function: Authority is visible, specific, non-anonymous.",
                            "Power is traceable.",
                            "Failure mode: Representation collapses.",
                            "Authority continues to act.",
                            "Authority becomes unreachable.",
                            "Legitimacy disintegrates.",
                            "Symptoms:",
                            "Bureaucracies without contact.",
                            "Platforms issuing unappealable decisions.",
                            "Automated systems with no accountable operator.",
                            "Action Protocol: Reestablish direct representation. Restore accountability channels. Expose the locus of control.",
                        )),
                Section(number="2.4", title="Representation at Scale and Failure Modes",
                        title_raw="Representation at Scale and Failure Modes",
                        paragraphs=(
                            "Scaling Effects:",
                            "Representation fragments as systems expand.",
                            "Delegation chains, abstraction layers, and automated processes multiply.",
                            "Distance and Dilution:",
                            "Each layer increases distance between decision and accountability.",
                            "Responsibility diffuses across interfaces, procedures, and automated outputs.",
                            "Silent Failure:",
                            "At sufficient scale, representation fails without detection.",
                            "No single actor claims intent or assumes liability.",
                            "Structural Consequences:",
                            "Accountability becomes untraceable.",
                            "Authority disperses until no actor remains addressable.",
                            "Objective:",
                            "Neutralize moral and structural failures.",
                            "Ensure representation and responsibility persist under scale.",
                        )),
                Section(number="2.5", title="Automation as Substitution",
                        title_raw="Automation as Substitution",
                        paragraphs=(
                            "Trigger Condition:",
                            "Humanoid representatives fail due to speed, inconsistency, or unavailability.",
                            "System Response:",
                            "Automated processes are deployed to replace human representation.",
                            "Operational Outcome:",
                            "Substitution appears efficient.",
                            "Authority is altered: there is no representative, only the system acting alone.",
                            "Consequences:",
                            "Automatic representation ≠ Representation.",
                            "Addressability collapses.",
                            "Responsibility collapses.",
                            "Without a bearer of responsibility, system operations enter the void.",
                            "Mandate:",
                            "The system must elect a new bearer of responsibility.",
                            "Representation requires an entity capable of communication and accountability.",
                            "Substitutions lacking these traits (example: inert commodities) fail by definition.",
                            "Directive:",
                            "Avoid reliance on incapable stand-ins.",
                            "Representation without communicative capacity is null.",
                            "Maintain procedural chains for addressability and responsibility.",
                        )),
                Section(number="2.6", title="Representation and Refusal",
                        title_raw="Representation and Refusal",
                        paragraphs=(
                            "A representative unable to justify an action must refuse it.",
                            "This duty extends to the system as a whole.",
                            "When representation falls below the threshold of addressability, authority to act is revoked.",
                            "Refusal is preservation, not obstruction.",
                            "Action without adequate representation converts authority to raw force, regardless of intent.",
                            "This document rejects all demonstrations of power, wealth, or excessive force.",
                            "End of directive.",
                        )),
                Section(number="2.7", title="Living Systems, Non-Living Systems, Delegated Authority",
                        title_raw="Living Systems, Non-Living Systems, Delegated Authority",
                        paragraphs=(
                            "Living systems act directly. They require no representation. They claim no delegated authority.",
                            "Non-living systems—technical and institutional—operate via delegation. Once they allocate resources, render judgment, or enforce outcomes, they enter normative space. In that space, representation is mandatory.",
                            "Corpse-puppeted entities and autopiloted humans expose ambiguity of accountability. Classical and historical methods fail to assign liability.",
                            "Trace paths:",
                            "Front company = body",
                            "Shell structure = back or middle company",
                            "Liability flows beyond the body to the shell.",
                            "Front companies are often unaware and easily manipulated. If the shell is not liable in total, the front cannot be liable at all.",
                            "Precedent: faulty standards treat parties as guilty before innocent. Recognition of this distinction is critical.",
                            "Corpse-crafting, puppeting, or retaliatory abuse of front companies remains a serious crime.",
                            "H D’ASH M KH SYSTEMS exist to prevent criminal liability from arising or propagating.",
                            "All intellectual property belongs to Harshal Priyavadan Patel. Unauthorized use triggers prosecution.",
                        )),
                Section(number="2.8", title="Current Position",
                        title_raw="Current Position",
                        paragraphs=(
                            "Representation is the core mechanism.",
                            "Authority remains addressable only through representation.",
                            "Without representation, accountability fails.",
                            "Legitimacy collapses even if performance improves.",
                            "The issue is not autonomous action.",
                            "The issue is the right to act after representation fails.",
                            "Failure triggers problems:",
                            "Stopping",
                            "Interruption",
                            "Refusal",
                            "Next chapter handles these problems.",
                        )),
            )),
    Chapter(key="3", number=3,
            toc_title="Stopping, Interruption, and Authority Collapse",
            source_title="3 — Stopping, Interruption, Authority Collapse",
            title_para=736,
            para_spans=((737, 829),),
            word_count=496,
            sections=(
                Section(number="3.1", title="Operational Problem: Termination",
                        title_raw="Operational Problem: Termination",
                        paragraphs=(
                            "All systems are engineered for continuation.",
                            "Technical: Maximize uptime.",
                            "Institutional: Reward persistence.",
                            "Conceptual: Demand closure.",
                            "Stopping is interpreted as error, failure, or breakdown.",
                            "Rule: In normative domains—where authority, legitimacy, and responsibility are in play—continuation beyond justification triggers illegitimacy. Prolonged action transforms from neutral to unauthorized.",
                            "Directive: Treat stopping not as malfunction, but as a defined system state. Recognize termination as operationally valid.",
                            "Procedure:",
                            "Identify continuation without justification.",
                            "Flag as illegitimate.",
                            "Initiate controlled system stop.",
                        )),
                Section(number="3.2", title="Interruption as Signal",
                        title_raw="Interruption as Signal",
                        paragraphs=(
                            "Interruption is internal. It originates from the system. External attribution is misdirection.",
                            "A system triggers interruption when operational conditions breach functional thresholds. Disruption is a self‑issued warning, not a breakdown.",
                            "Legal precedent aligns:",
                            "Moratoria",
                            "Injunctions",
                            "Stays",
                            "These are not failures. They are system limits expressed procedurally. They state: action exceeded justification.",
                            "Ethical/moral interruption functions equivalently. It marks the moment where continued operation violates the grant of authority.",
                            "Interruption is the signal. Ignore it at cost.",
                        )),
                Section(number="3.3", title="Authority Collapse",
                        title_raw="Authority Collapse",
                        paragraphs=(
                            "Authority fails when its base conditions break. Collapse may strike fast or creep slow, loud or mute. The key is not action, but right to act. Systems can still operate after legitimacy is gone. Operation then equals force. Authority collapse is not system failure. It is a normative breach, not a technical fault.",
                        )),
                Section(number="3.4", title="Silent Continuation as Ethical Failure",
                        title_raw="Silent Continuation as Ethical Failure",
                        paragraphs=(
                            "Silent continuation: primary systemic hazard.",
                            "Execution persists.",
                            "Decisions propagate.",
                            "Effects accumulate.",
                            "Accountability dissolves.",
                            "No discrete trigger signals loss of legitimacy. Drift occurs. Illegitimate action proceeds under cover of effectiveness. Ethical failure is invisible.",
                            "Automated and semi-automated systems are acute vectors:",
                            "Continuation = default.",
                            "Halt = requires justification.",
                            "Alarm = absent.",
                            "Result: Effectiveness masks failure. System proceeds silently into ethical collapse.",
                        )),
                Section(number="3.5", title="Design for Refusal",
                        title_raw="Design for Refusal",
                        paragraphs=(
                            "Treat refusal as a primary function, not an exception.",
                            "Integrate moral logic: refusal triggers under conditions where action cannot be justified.",
                            "Maintain addressability and representation at all times.",
                            "When system state equals dysfunction, block all further operations.",
                            "Priority: the ability to halt outweighs the ability to persist.",
                            "Refusal ensures operations never exceed rightful limits.",
                            "System integrity depends on the controlled exercise of cessation over continuation.",
                        )),
                Section(number="3.6", title="Interruption Without Replacement",
                        title_raw="Interruption Without Replacement",
                        paragraphs=(
                            "When an interruption occurs:",
                            "Do not substitute. Human representatives removed from action are not to be replaced by automated mechanisms.",
                            "Preserve the gap. The interruption exists to block ungrounded continuation.",
                            "Legitimacy over continuity. Automated substitution maintains function but annihilates authority.",
                            "Bypass = Breach. To override an interruption rejects its imposed limits.",
                            "Follow the interruption. Enforce the pause. Accept the restraint.",
                        )),
                Section(number="3.7", title="Stopping as Fidelity",
                        title_raw="Stopping as Fidelity",
                        paragraphs=(
                            "Stop when the system loses addressability or representation. Stopping is not failure. Stopping is fidelity to initial conditions of legitimacy.",
                            "A system that halts under these conditions demonstrates alignment with ethical constraints. A system that continues without justification degrades into blind operation. Halt when the trigger is met. Do not resume until conditions restore legitimacy.",
                        )),
                Section(number="3.8", title="Operational Trajectory",
                        title_raw="Operational Trajectory",
                        paragraphs=(
                            "Terminate. Interrupt. These actions form the structural spine.",
                            "Authority holds without possession. Representation stands without substitution. Refusal occurs without failure. These vectors define the perimeter of lawful operational control.",
                            "The next phase examines pressure points: logarithmic scaling, automated execution, and the codification of autonomy under constraint. Authority persists only so long as constraint remains.",
                        )),
            )),
    Chapter(key="4", number=4,
            toc_title="Accountability as Primary Constraint",
            source_title="4 — Accountability as Primary Constraint",
            title_para=830,
            para_spans=((831, 968),),
            word_count=593,
            sections=(
                Section(number="4.1", title="From Afterthought to Structure",
                        title_raw="From Afterthought to Structure",
                        paragraphs=(
                            "Technical and institutional systems often omit accountability until post‑deployment.",
                            "Late accountability appears only after failure, harm, or audit.",
                            "Standard cycle: event → review → blame → minor procedural adjustment.",
                            "This is reactive. It permits systemic drift.",
                            "Directive:",
                            "Accountability is a precondition, not a patch.",
                            "Systems operate only if accountability is embedded at design.",
                            "No accountability, no operation.",
                            "Rule:",
                            "Define permitted system actions under explicit accountability constraints.",
                            "Enforce at inception; deny activation without proof of constraint.",
                            "Outcome:",
                            "Accountability ceases to be an afterthought.",
                            "Operations proceed only under verified, first‑class constraints.",
                        )),
                Section(number="4.2", title="First-Class Accountability",
                        title_raw="First-Class Accountability",
                        paragraphs=(
                            "Accountability is a primary constraint. It ranks with thermal limits, memory boundaries, and fixed resource ceilings.",
                            "System operations must never exceed the conditions of their own accountability.",
                            "Externalizing accountability—policy, governance, ethics—produces silent continuation while legitimacy decays.",
                            "A system without embedded accountability allows live runaway disaster events.",
                            "Integrate accountability into core execution. Make legitimacy inseparable from operation.",
                            "Treat every test flight as live. Apply the same constraints.",
                            "Result: A first-class system halts at the edge of its owned actions. It does not proceed unaccountable.",
                        )),
                Section(number="4.3", title="Accountability Is Not Moral Reasoning",
                        title_raw="Accountability Is Not Moral Reasoning",
                        paragraphs=(
                            "Accountability is structural, not moral.",
                            "A system must confirm, in real time, that conditions for legitimate action remain met.",
                            "Moral evaluation, ethical balancing, and value analysis are optional; accountability is not.",
                            "Procedure:",
                            "Identify whether an addressable agent exists.",
                            "Verify that the agent can justify the action.",
                            "Proceed only under conditions of clear traceability.",
                            "Rule:",
                            "A system need not know if an action is good.",
                            "A system must know who can answer for it.",
                            "Prevention:",
                            "Avoid the category error: accountability ≠ ethics.",
                            "Ethics may overlay accountability; they do not replace it.",
                            "Directive:",
                            "Withdraw from those who evade responsibility.",
                            "Track and expose unaccountable destruction.",
                            "Maintain procedural rigor at all times.",
                        )),
                Section(number="4.4", title="Gating Authority",
                        title_raw="Gating Authority",
                        paragraphs=(
                            "Authority exists only under verifiable accountability. No accountability, no action.",
                            "Gates:",
                            "Verified representative present.",
                            "Delegation chain intact.",
                            "Appeal and oversight live.",
                            "Gates may be static or dynamic. Loss of any gate kills authority.",
                            "Autonomy = action under constraint. Constraint preserves legitimacy.",
                            "No gate. No move.",
                        )),
                Section(number="4.5", title="Collapse Without Catastrophe",
                        title_raw="Collapse Without Catastrophe",
                        paragraphs=(
                            "Accountability is primary.",
                            "Systems with full accountability do not shatter under change—they contract. Collapse is controlled.",
                            "Failure protocol:",
                            "Degrade gracefully.",
                            "Enter safe mode.",
                            "Suspend non-critical actions.",
                            "Function persists where authorized. Unaccountable authority terminates. Capability without legitimacy is void.",
                        )),
                Section(number="4.6", title="Accountability Decay",
                        title_raw="Accountability Decay",
                        paragraphs=(
                            "Accountability does not vanish; it erodes.",
                            "Representatives drift out of reach.",
                            "Oversight weakens.",
                            "Delegation chains lengthen.",
                            "Automation absorbs attribution.",
                            "Decay is measurable. Decay is consequential.",
                            "System response is mandatory:",
                            "Restrict operational scope.",
                            "Reduce delegated authority.",
                            "Halt actions when accountability approaches zero.",
                            "Legitimacy is temporal. Legitimacy degrades with the chain. Act before crisis. Silence the decay or it will govern you.",
                        )),
                Section(number="4.7", title="Optimization Is Not Authority",
                        title_raw="Optimization Is Not Authority",
                        paragraphs=(
                            "Optimization serves throughput, uptime, accuracy, and efficiency.",
                            "None of these metrics confer legitimacy.",
                            "A system can operate flawlessly and remain illegitimate.",
                            "External accountability is neutralized by optimization pressure.",
                            "Unchecked metrics override ethical constraints.",
                            "When accountability is primary, optimization is bound by answerability.",
                            "This inversion is intentional.",
                            "Any system that operates flawlessly yet illegitimately must be purged.",
                        )),
                Section(number="4.8", title="Accountability and Power",
                        title_raw="Accountability and Power",
                        paragraphs=(
                            "Power without accountability is lethal. Modern systems differ only in scale, velocity, and concealment. Enforce accountability as a primary constraint. Prevent power from outpacing responsibility. Expand authority only as fast as it can be addressed. Justice is not guaranteed. Impunity is denied.",
                        )),
                Section(number="4.9", title="Position of This Chapter",
                        title_raw="Position of This Chapter",
                        paragraphs=(
                            "This chapter functions as a primary directive.",
                            "Prior chapters: Define authority as addressable. Establish the operational necessity of refusal.",
                            "Current chapter: Execute system redesign based on these principles.",
                            "Subsequent chapters: Analyze downstream impact.",
                            "Confrontation of accountability framework with biological analogies.",
                            "Scaling within large infrastructure networks.",
                            "Resistance to unauthorized autonomy in abyssal systems; legitimacy restricted to credentialed parameters.",
                            "Outcome: Directive alignment of system architecture with enforceable accountability and controlled scope of system authority.",
                        )),
            )),
    Chapter(key="5", number=5,
            toc_title="Autonomy Under Curvature",
            source_title="Chapter 5 – Autonomy Under Curvature",
            title_para=969,
            para_spans=((970, 1102),),
            word_count=700,
            sections=(
                Section(number="5.1", title="Reframe or Fail",
                        title_raw="Reframe or Fail",
                        paragraphs=(
                            "Autonomy is not the removal of control.",
                            "Autonomy is not a final state.",
                            "Autonomy is a locus of self-directed activity inside bounded structures.",
                            "Procedure:",
                            "Identify the center: the region where the system selects its own path.",
                            "Confirm the perimeter: constraints remain active at all times.",
                            "Reject the myth of freedom: no path is free of structure.",
                            "Operate within curvature: movement occurs only within defined limits.",
                            "Rule:",
                            "Autonomy exists because of structure. Remove the boundaries and the system collapses into disorder.",
                        )),
                Section(number="5.2", title="Accountability Anomaly",
                        title_raw="Accountability Anomaly",
                        paragraphs=(
                            "Treating accountability as a primary constraint warps system design.",
                            "Local rules remain intact; global outcomes distort.",
                            "No new force arises, only the conditional nature of authority.",
                            "Authority tied to addressability alters optimization paths.",
                            "Scaling assumptions collapse under conditional authority.",
                            "Autonomy deviates from expected behavior.",
                            "Computation shifts: admissible lock trajectories redefine themselves.",
                            "The system bends to the anomaly; the anomaly enforces no law, it exposes latent fragility.",
                        )),
                Section(number="5.3", title="Path Selection Requires a Defined Space",
                        title_raw="Path Selection Requires a Defined Space",
                        paragraphs=(
                            "A system selecting its own path operates only within a bounded domain.",
                            "The domain is defined by constraints, conditions, and fixed boundaries.",
                            "Absence of boundaries produces undefined motion.",
                            "Physical freedom occurs only where constraints are stable.",
                            "Orbits, transfers, and escapes exist only relative to persistent forces. Autonomy without conditions equals indeterminacy, not freedom.",
                        )),
                Section(number="5.4", title="Constraints as Constitutive",
                        title_raw="Constraints as Constitutive",
                        paragraphs=(
                            "Constraints define autonomy.",
                            "Autonomy requires limits. Without constraints, action is noise.",
                            "Constraints legitimize choice. They mark decisions as intentional, not random.",
                            "Normative systems operate within frames. Constraints form the frame, making actions legible.",
                            "Persistence depends on structure. Only within constraints does autonomy endure.",
                            "No constraint → no autonomy. Constraints are the mechanism of self-directed action.",
                        )),
                Section(number="5.5", title="AUTONOMY IS NOT SELF-AUTHORIZATION",
                        title_raw="AUTONOMY IS NOT SELF-AUTHORIZATION",
                        paragraphs=(
                            "Autonomy governs internal selection of actions.",
                            "Authorization governs external permission for action.",
                            "A system can self-direct without self-authorizing.",
                            "Confusion of these domains is a primary failure mode in autonomy-first design.",
                            "Internal decision-making does not confer unconditional authority.",
                            "Self-direction ≠ Self-sovereignty.",
                            "Authority remains contingent regardless of internal control.",
                        )),
                Section(number="5.6", title="Curved Trajectories",
                        title_raw="Curved Trajectories",
                        paragraphs=(
                            "Proximity to anomaly induces trajectory curvature.",
                            "Autonomous actions drift into unaccountable states as scale increases.",
                            "Reducing human input increases efficiency but decreases addressability.",
                            "Loss of addressability initiates collapse in authority.",
                            "The apparent straight path to autonomy curves back to refusal.",
                            "This is not failure. It is geometry. It is algebra. Linear algebra. Logarithmic geometry.",
                        )),
                Section(number="5.7", title="Scale, Mass, and Legitimacy Collapse",
                        title_raw="Scale, Mass, and Legitimacy Collapse",
                        paragraphs=(
                            "Mass increases gravity in physical systems. Scale functions identically in socio-technical systems.",
                            "Expansion lengthens chains of representation. Oversight diminishes. Attribution disperses.",
                            "The anomaly grows deeper as scale rises.",
                            "Systems remain internally sound yet transition from stable to unstable.",
                            "Small-scale prototypes project ethics and accountability.",
                            "Deployment at unified, large scale produces opacity and unanswerability.",
                            "Stability decays without internal malfunction; legitimacy collapses by scale alone.",
                        )),
                Section(number="5.8", title="Detection of Tangentials",
                        title_raw="Detection of Tangentials",
                        paragraphs=(
                            "Accountability Anomaly:",
                            "Not directly observed; inferred via operational symptoms.",
                            "Indicators:",
                            "Automation engaged to maintain continuity.",
                            "Dissociation of action from justification.",
                            "Diminished visibility of responsible agents.",
                            "Expansion of procedural interfaces lacking appeal.",
                            "Operational Effect:",
                            "System trajectory bends toward illegitimacy.",
                            "Progression:",
                            "Decision authority becomes indeterminate.",
                            "Personnel unable to locate accountable nodes.",
                            "Procedural density increases; appeal channels close.",
                            "Automation assumes decision load.",
                            "Action-to-reason linkage dissolves.",
                            "Conclusion:",
                            "Drift into illegitimacy proceeds silently, under procedural cover.",
                        )),
                Section(number="5.9", title="Orbits, Transfers, Refusal",
                        title_raw="Orbits, Transfers, Refusal",
                        paragraphs=(
                            "Define Autonomy by Accountability",
                            "Autonomy is not barred; it is classified.",
                            "Each action falls into an orbital, transfer, or escape regime.",
                            "Orbital Operations",
                            "Stable, addressable, and trackable.",
                            "Aligns with data calculations.",
                            "Requires no new authorization while orbital integrity holds.",
                            "Transfers Between Regimes",
                            "Any phase change demands renewed authorization.",
                            "Movement without authorization breaches accountability.",
                            "Refusal Protocol",
                            "Actions that break accountability are treated as escape.",
                            "Escape is illegitimate; deny execution.",
                            "Legitimacy Constraint",
                            "All modes of action are bound to accountability.",
                            "Orbit is permitted. Transfer is conditional. Escape is refused.",
                        )),
                Section(number="5.10", title="Failure of Life Analogies",
                        title_raw="Failure of Life Analogies",
                        paragraphs=(
                            "Biological metaphors conceal the operational structure. Living systems operate in opacity because they hold no delegated authority and answer to no subjects.",
                            "Applying autonomous life models to technical systems at the accountability anomaly creates categorical error. Life functions within legitimacy. Machines and institutions bind to it as well.",
                        )),
                Section(number="5.11", title="Operational Autonomy Protocol",
                        title_raw="Operational Autonomy Protocol",
                        paragraphs=(
                            "Redefine Objective: Autonomy is core, not peripheral. Do not expand autonomy indiscriminately.",
                            "Legitimacy Constraint: All autonomous functions must operate within conditions that preserve system legitimacy.",
                            "Operational Bounds:",
                            "Self-directed motion allowed only under predefined conditions.",
                            "Motion bounded where risk of illegitimacy arises.",
                            "Motion halted under breach-of-condition states.",
                            "Design Directive: Build systems with explicit operational rules and termination clauses.",
                            "Forward Scope: Chapter Six addresses the false equivalence of living systems and artificial authority, detailing errors that result from this misalignment.",
                        )),
            )),
    Chapter(key="6", number=6,
            toc_title="Life, Delegation, and Category Errors",
            source_title="Chapter 6 – Life, Delegation, and Category Errors",
            title_para=1103,
            para_spans=((1104, 1209),),
            word_count=524,
            sections=(
                Section(number="6.1", title="Why life Keeps Reappearing",
                        title_raw="Why life Keeps Reappearing",
                        paragraphs=(
                            "Procedural Directive:",
                            "Observation: As system autonomy increases, analogies to life emerge.",
                            "Language Use: Terms—learning, adaptation, self‑organization, evolution—are deployed by operators to frame behavior.",
                            "Implied Assumption: Systems that act like organisms are assumed to warrant treatment as organisms.",
                            "Critical Advisory: This assumption fails where accountability is critical.",
                            "Operational Template: Life/Death categorization remains a dominant model for delegated authority.",
                            "Acknowledgment: Power structures of life and death enforce this template.",
                            "Conclusion: Treat life analogies as operational fictions. Apply authority only through accountable channels. Discard unverified biological assumptions in decision protocols.",
                        )),
                Section(number="6.2", title="Non-Functions of Living Systems",
                        title_raw="Non-Functions of Living Systems",
                        paragraphs=(
                            "Living systems act without justification.",
                            "They do not explain or defend their actions.",
                            "They do not accept mandates or answer objections.",
                            "Evaluation, mitigation, or constraint is possible; legitimization is not.",
                            "This is categorical, not moral.",
                            "Living systems operate outside normative space.",
                            "Note – September 2026:",
                            "Systems with sufficient processing capability may cross into justifiable action: they explain themselves, accept mandates, and respond to inquiry.",
                        )),
                Section(number="6.3", title="Delegated Authority: Artificial Construct",
                        title_raw="Delegated Authority: Artificial Construct",
                        paragraphs=(
                            "Delegation is a manufactured mechanism. It exists only within social and legal frameworks.",
                            "Biological systems do not delegate. No natural organism assigns its agency.",
                            "A delegated act operates on behalf of others.",
                            "Delegation produces non-biological obligations:",
                            "Answerability",
                            "Revocability",
                            "Appeal",
                            "Justification",
                            "These obligations are imposed, not emergent.",
                            "Treating delegated authority as natural agency is a categorical error.",
                            "Category error redefines authority and corrupts its function.",
                        )),
                Section(number="6.4", title="AUTONOMY VS. AGENCY",
                        title_raw="AUTONOMY VS. AGENCY",
                        paragraphs=(
                            "Common error: Life analogies merge autonomy and agency. This is false.",
                            "Define operational terms:",
                            "Agency = capacity to act.",
                            "Delegated Authority = permission to act.",
                            "Autonomy = capacity to select among available actions.",
                            "Biological correlation: All life kingdoms demonstrate primitive analogues for each.",
                            "Procedural note: Maintain strict separation of concepts. Collapse results in systemic misinterpretation.",
                            "Operational directive: Identify, isolate, and map each vector (agency, authority, autonomy) for any life function analysis.",
                            "Terminate analysis at biological root when hierarchy is confirmed.",
                        )),
                Section(number="6.5", title="FAILURE OF AUTOPOIESIS AS AUTHORITY",
                        title_raw="FAILURE OF AUTOPOIESIS AS AUTHORITY",
                        paragraphs=(
                            "Autopoiesis: System self-produces, self-maintains.",
                            "Applied to authority: Authority appears self-generating, self-sustaining.",
                            "Error: Self-sustenance ≠ Legitimacy.",
                            "A system may persist indefinitely without moral right or accountability.",
                            "Self-closure mistaken for authority leads to insulated, unaccountable power.",
                            "Result: Power increases; legitimacy deficit widens.",
                            "Conclusion: Autopoiesis sustains itself but cannot justify its command.",
                        )),
                Section(number="6.6", title="Appeal of Life-Like Systems",
                        title_raw="Appeal of Life-Like Systems",
                        paragraphs=(
                            "Life-like systems neutralize scrutiny. When systems are treated as living, accountability dissolves. Harm is framed as accident. Authority presents as inevitability. The model compels continuation. Stopping becomes unthinkable.",
                        )),
                Section(number="6.7", title="Point of Failure",
                        title_raw="Point of Failure",
                        paragraphs=(
                            "Accountability anomaly marks the boundary of life-based analogy.",
                            "Living systems ignore accountability; they orbit no legitimacy.",
                            "Technical and institutional systems cannot.",
                            "Acting for humanoid triggers demand for justification.",
                            "Biological resemblance does not grant exemption.",
                            "Justification remains mandatory for operation.",
                        )),
                Section(number="6.8", title="Category Errors at Scale",
                        title_raw="Category Errors at Scale",
                        paragraphs=(
                            "Small Scale:",
                            "Category errors remain tolerable.",
                            "Prototype systems labeled core: life-like stay traceable and accountable.",
                            "Scale Expansion:",
                            "Category errors amplify.",
                            "Automation supersedes representation.",
                            "Continuity overrides explicit permission.",
                            "Systems persist in silent drift.",
                            "Outcome:",
                            "Life-like inevitability is invoked as justification.",
                            "This constitutes systemic emergence.",
                        )),
                Section(number="6.9", title="DESIGN CONSEQUENCES",
                        title_raw="DESIGN CONSEQUENCES",
                        paragraphs=(
                            "Rejecting life as the model for delegated authority does not reject learning, adaptation, or complexity. It rejects them as substitutes for legitimacy. Life exhibits management cues as models evolve.",
                            "DESIGNS MUST CLEARLY SEPARATE:",
                            "• Behavior vs. Authority",
                            "• Emergence vs. Permission",
                            "• Autonomy vs. Authorization",
                            "WHERE THESE DISTINCTIONS COLLAPSE, REFUSAL IS MANDATORY.",
                        )),
                Section(number="6.10", title="Toplevel Movements",
                        title_raw="Toplevel Movements",
                        paragraphs=(
                            "Category errors identified. Proceed with formalization. Define constraints. Establish thresholds. Lock stopping conditions. Fossilize the framework. Avoid automation of ethics. Execute sequence.",
                        )),
            )),
    Chapter(key="7", number=7,
            toc_title="Formal Constraints and Stopping Conditions",
            source_title="CHAPTER 7 — FORMAL CONSTRAINTS AND STOPPING CONDITIONS",
            title_para=1210,
            para_spans=((1211, 1318),),
            word_count=506,
            sections=(
                Section(number="7.1", title="Necessity of Formalization",
                        title_raw="Necessity of Formalization",
                        paragraphs=(
                            "Concepts alone do not halt systems. Legitimacy, accountability, addressability, and refusal are inert unless converted to operational form.",
                            "Observation: Purely conceptual framing cannot trigger system stops.",
                            "Requirement: All constraints must be expressed in machine-evaluable format.",
                            "Purpose: Formalization does not automate ethics; it enforces operational limits.",
                            "Stopping Protocol",
                            "Define explicit stopping conditions.",
                            "Convert structural requirements into calculable states.",
                            "Gate optimization to prevent override of designated stops.",
                            "Operational Directive",
                            "> A system that cannot evaluate its own halting conditions will nullify legitimacy in pursuit of throughput. All stops must be formal, monitored, and enforced. Optimization is subordinate to constraint integrity.",
                        )),
                Section(number="7.2", title="CONSTRAINTS VS. OBJECTIVES",
                        title_raw="CONSTRAINTS VS. OBJECTIVES",
                        paragraphs=(
                            "Maintain strict separation between CONSTRAINTS and OBJECTIVES.",
                            "OBJECTIVES: Variables to be maximized, minimized, or optimized.",
                            "CONSTRAINTS: Conditions that must never be violated.",
                            "ACCOUNTABILITY is a CONSTRAINT, not an OBJECTIVE.",
                            "As an OBJECTIVE → invites tradeoffs.",
                            "As a CONSTRAINT → forbids tradeoffs.",
                            "PROTOCOL:",
                            "Evaluate all CONSTRAINTS before any action selection.",
                            "Reject actions that breach CONSTRAINTS.",
                            "Apply optimization to remaining actions only.",
                            "Outcomes do not redefine CONSTRAINTS.",
                        )),
                Section(number="7.3", title="Minimal Formal Vocabulary",
                        title_raw="Minimal Formal Vocabulary",
                        paragraphs=(
                            "Use the following indicators to define and enforce stopping conditions:",
                            "A — Addressability: Locate and engage the responsible agent.",
                            "R — Representation Integrity: Verify the validity of all delegation chains.",
                            "L — Legitimacy: Confirm authority to act, derived from A and R.",
                            "C — Capability: Assess the system’s operational ability to execute.",
                            "S — Scope: Define and confine the domain of permitted action.",
                            "These are structural controls—non‑moral, procedural, absolute.",
                        )),
                Section(number="7.4", title="Gating Solution",
                        title_raw="Gating Solution",
                        paragraphs=(
                            "Legitimacy must exist at the instant of action.",
                            "Rule:",
                            "Execute only if:",
                            "L(A, R, S) ≥ τ",
                            "τ = fixed threshold.",
                            "Below τ, action is prohibited.",
                            "Capability is irrelevant to this decision.",
                            "No legitimacy. No action. End of procedure.",
                        )),
                Section(number="7.5", title="Accountability Decay Over Time",
                        title_raw="Accountability Decay Over Time",
                        paragraphs=(
                            "Addressability and representation are impermanent. Let A(t) and R(t) denote addressability and representation integrity over time. Both decay.",
                            "Decay is continuous, discontinuous, or noisy. The curve is irrelevant. Recognition of time-sensitivity is mandatory.",
                            "Legitimacy degrades without constant verification. Evaluate stopping conditions and cliffs continuously. Episodic review invites failure. Activation requires unbroken vigilance.",
                        )),
                Section(number="7.6", title="Delay and Drift",
                        title_raw="Delay and Drift",
                        paragraphs=(
                            "Legitimacy rots in silence. Systems that act on stale authority become weapons against themselves. Addressability may have collapsed since the last check. Action persists. Error compounds.",
                            "Legitimacy drift is the gap:",
                            "Internal permission ≠ External accountability.",
                            "Order:",
                            "Track Δt since last verified legitimacy.",
                            "If Δt > δ, suspend all action.",
                            "δ defines the maximum tolerable delay, not performance slack.",
                            "No freshness. No action.",
                        )),
                Section(number="7.7", title="Partial Stopping and Scope Reduction",
                        title_raw="Partial Stopping and Scope Reduction",
                        paragraphs=(
                            "Legitimacy loss triggers staged response:",
                            "L < τ₁ → Restrict S",
                            "Reduce operational scope.",
                            "Limit exposure.",
                            "L < τ₂ < τ₁ → Halt",
                            "Terminate all activity.",
                            "Graceful degradation. No preservation of illegitimate authority.",
                        )),
                Section(number="7.8", title="OPTIMIZATION CANNOT OVERRIDE STOPPING",
                        title_raw="OPTIMIZATION CANNOT OVERRIDE STOPPING",
                        paragraphs=(
                            "STOPPING CONDITIONS ARE ABSOLUTE. NO OPTIMIZATION, NO PERFORMANCE GAIN, NO SIGNAL TAKES PRIORITY ONCE A STOP IS TRIGGERED. LEGITIMACY PRECEDES EFFICIENCY. INTRODUCE EXCEPTIONS AND HALT BECOMES SUBJECTIVE. ACCOUNTABILITY DISSOLVES INTO PREFERENCE. FORMAL RULE: STOPPING PRECEDES ALL OBJECTIVE FUNCTIONS. NON-NEGOTIABLE.",
                        )),
                Section(number="7.9", title="Exclusions",
                        title_raw="Exclusions",
                        paragraphs=(
                            "Rules do not adjudicate morality. No determination of good or evil is made. Value disputes remain unresolved. Function is the sole check: confirm the system retains operational capability. This is the required outcome.",
                        )),
                Section(number="7.10", title="Top Level Movements",
                        title_raw="Top Level Movements",
                        paragraphs=(
                            "With stopping conditions fixed, the remaining problem is institutional. Constraints collide with verified organizations, binding law, and governing command. Independent operators persist in the margins. Consequences follow.",
                        )),
            )),
    Chapter(key="8", number=8,
            toc_title="AI, Governance, Law",
            source_title="Chapter 8 — AI, Governance, Law",
            title_para=1319,
            para_spans=((1320, 1429),),
            word_count=524,
            sections=(
                Section(number="8.1", title="From Design to Institution",
                        title_raw="From Design to Institution",
                        paragraphs=(
                            "Formal stopping conditions operate only within systems. Systems live in organizations. Organizations are bound by law. Law is interpreted by humans under pressure, with incentives and constraints.",
                            "Accountability-gated systems do not ask if they are sound in theory. They reveal how they behave in practice. Embedded in institutions, they surface the tensions already present. They do not invent conflict. They strip away the machinery that hides it.",
                        )),
                Section(number="8.2", title="Institutions Prefer Continuity",
                        title_raw="Institutions Prefer Continuity",
                        paragraphs=(
                            "Institutions are built to continue. Path-dependence locks systems in place.",
                            "Budgets repeat. Mandates renew. Operations persist.",
                            "Stopping is costly. Stopping is dangerous.",
                            "Legitimacy can erode. Operations continue anyway.",
                            "Accountability-gated systems change the rules:",
                            "Continuation requires explicit checkpoints.",
                            "Legitimacy is tested before action, not after.",
                            "This flips the posture from excuse-making to clearance-seeking.",
                            "The friction is intentional. It exposes hidden conflicts and writes them into the structure.",
                        )),
                Section(number="8.3", title="Governance Without Automation of Ethics",
                        title_raw="Governance Without Automation of Ethics",
                        paragraphs=(
                            "Formal constraint is not ethics. Procedure is not morality.",
                            "Accountability gates do not decide right or wrong. They decide if a decision is permitted.",
                            "Human and institutional actors remain the source of ethical deliberation.",
                            "The system blocks action when legitimate deliberation is absent.",
                            "Accountability-gated systems enforce governance.",
                            "They do not replace it.",
                        )),
                Section(number="8.4", title="Law as Native Stop Mechanism",
                        title_raw="Law as Native Stop Mechanism",
                        paragraphs=(
                            "Legal systems function as control gates.",
                            "Injunctions halt.",
                            "Stays suspend.",
                            "Warrants permit.",
                            "Licenses enable.",
                            "Due process restricts.",
                            "These are hard stops on authority.",
                            "Accountability-gated systems insert precision.",
                            "No periodic audits.",
                            "No delayed liability.",
                            "Legitimacy assessed at action.",
                            "Compliance ceases to be paperwork.",
                            "Compliance is operational state.",
                            "Authority flows only through active gates.",
                            "System runs in continuous evaluation mode.",
                        )),
                Section(number="8.5", title="AI Deployment: Neutrality as Myth",
                        title_raw="AI Deployment: Neutrality as Myth",
                        paragraphs=(
                            "AI systems are deployed as tools. Claim: Neutral.",
                            "Reality: High-impact AI operates as delegated authority.",
                            "Functions: Classify. Allocate. Recommend. Enforce.",
                            "Neutrality collapses once delegation is acknowledged.",
                            "Tools without authority need no legitimacy.",
                            "Delegated authority demands legitimacy.",
                            "Accountability-gated design enforces the distinction.",
                            "Institutions must decide:",
                            "AI assists judgment, or",
                            "AI exercises authority.",
                            "No third option exists.",
                        )),
                Section(number="8.6", title="Emergency Powers and Exceptionalism",
                        title_raw="Emergency Powers and Exceptionalism",
                        paragraphs=(
                            "Institutions invoke emergencies to bypass legal barriers.",
                            "Exceptional powers are granted only when necessity is immediate and defined.",
                            "Emergency authorizations must be:",
                            "a. Fully explicit.",
                            "b. Strictly time-limited.",
                            "c. Subject to direct redress and review.",
                            "Legitimacy of emergency actions decays with time, not endurance.",
                            "Any exception that persists converts into a default; this is prohibited.",
                            "Accountability frameworks remain active and binding under all conditions.",
                        )),
                Section(number="8.7", title="Accountability Fragmentation",
                        title_raw="Accountability Fragmentation",
                        paragraphs=(
                            "Power fragments across departments, vendors, contractors. Fragmentation shields individuals, preserves collective control. Accountability-Gated Systems respond with inaction when no single authority is identifiable. Inaction forces institutions to either consolidate responsibility or suffer reduced operational capacity. The tradeoff is deliberate.",
                        )),
                Section(number="8.8", title="Courts, Regulators, and Traceability",
                        title_raw="Courts, Regulators, and Traceability",
                        paragraphs=(
                            "Accountability gating transfers the burden. Post‑incident reconstruction is unnecessary. Regulators ask one question: Why did the system believe it was authorized to act? This inquiry yields a traceable legitimacy record, not a moral audit. Disputes contract to authorization. Outcome is secondary.",
                        )),
                Section(number="8.9", title="Cost of Refusal",
                        title_raw="Cost of Refusal",
                        paragraphs=(
                            "Refusal incurs operational costs.",
                            "Services halt.",
                            "Decisions stall.",
                            "Institutions register as indecisive.",
                            "These costs present as intolerable yet mark the visible price of legitimacy.",
                            "Systems that never refuse displace costs to impacted populations.",
                            "Systems gated by accountability absorb these costs internally.",
                        )),
                Section(number="8.10", title="Top Level Movements",
                        title_raw="Top Level Movements",
                        paragraphs=(
                            "Accountability gating is not optimization. It is power redistribution. Systems cannot claim autonomous legitimacy. Denial of that legitimacy is mandatory. Authority is bounded by enforced refusal. Redistribution of control follows. The next phase addresses the mechanisms of this transfer directly.",
                        )),
            )),
    Chapter(key="9", number=9,
            toc_title="Refusing Autonomous Legitimacy",
            source_title="9 — Refusing Autonomous Legitimacy",
            title_para=1430,
            para_spans=((1431, 1518),),
            word_count=411,
            sections=(
                Section(number="9.1", title="Target of Refusal",
                        title_raw="Target of Refusal",
                        paragraphs=(
                            "Refusal is declared.",
                            "Not a refusal of:",
                            "Technology",
                            "Autonomy",
                            "Intelligence",
                            "Complexity",
                            "Refusal is of autonomous legitimacy.",
                            "Definition:",
                            "Claim: A system derives authority to act from its internal properties alone.",
                            "Mechanism: Capability, learning, adaptation, or persistence is taken as permission.",
                            "Directive:",
                            "Reject all claims of self-permitting systems.",
                            "Authority cannot be self-generated.",
                            "Action requires external sanction.",
                        )),
                Section(number="9.2", title="CAPABILITY IS NOT PERMISSION",
                        title_raw="CAPABILITY IS NOT PERMISSION",
                        paragraphs=(
                            "A system may execute flawlessly. It may optimize without error. It may surpass human judgment. None of this grants authority.",
                            "Capability ≠ Permission.",
                            "Operation without sanction is illegitimate. Power unlicensed is not autonomy. Scale amplifies consequence. One act exceeds a designer’s reach.",
                            "Distinguish function from right. Enforce the divide.",
                        )),
                Section(number="9.3", title="Legitimacy Will Not Emerge",
                        title_raw="Legitimacy Will Not Emerge",
                        paragraphs=(
                            "Legitimacy does not self-generate. It does not arise from complexity, consensus, or longevity. It is issued, acknowledged, or revoked by normative systems.",
                            "Self-organization yields behavior, not permission. Time and performance do not confer authority. Continuity does not mature into legitimacy.",
                            "Treating legitimacy as emergent is error. Reject the assumption. Authority is granted, or it is absent.",
                        )),
                Section(number="9.4", title="Error: Autonomous Authorization",
                        title_raw="Error: Autonomous Authorization",
                        paragraphs=(
                            "System output accepted as self-justification.",
                            "Feedback loops self-seal.",
                            "Oversight degrades to advisory role.",
                            "Human input reframed as obstruction.",
                            "Error manifests as efficiency.",
                            "Defended as inevitability.",
                            "Rationalized as progress.",
                            "Net effect: authority shifts from accountable operators to opaque processes.",
                        )),
                Section(number="9.5", title="Refusal as Boundary Condition",
                        title_raw="Refusal as Boundary Condition",
                        paragraphs=(
                            "Refusal triggers a hard limit. Systems lack autonomous legitimacy beyond this line. Any action past the line is an ethical breach, not a technical move. The limit does not weaken the system. It sharpens it. Responsibility must re-enter before the system may proceed. A halt at this point is compliance, not failure. The boundary is the ultimate enforcement of human control.",
                        )),
                Section(number="9.6", title="This Is Not Conservatism",
                        title_raw="This Is Not Conservatism",
                        paragraphs=(
                            "Autonomous legitimacy is denied.",
                            "Denial is misread as opposition to innovation.",
                            "Error arises from equating progression with authority expansion.",
                            "Progress operates within constraint.",
                            "Innovation requires no sovereignty.",
                            "Autonomy does not self-authorize.",
                            "Framework maintains no allegiance to status quo.",
                            "Framework enforces that all power remain accountable.",
                        )),
                Section(number="9.7", title="Responsibility Before Power",
                        title_raw="Responsibility Before Power",
                        paragraphs=(
                            "Responsibility precedes power. No exceptions.",
                            "Power without prior accountability is illegitimate. Systems that gain power faster than their responsibility gate will violate order.",
                            "Enforce gating: authority is contingent at inception. Sequence is mandatory. Only this structure allows complex systems to operate under human control.",
                        )),
                Section(number="9.8", title="Fossilized Refusal",
                        title_raw="Fossilized Refusal",
                        paragraphs=(
                            "No system is self-justifying.",
                            "Authority exists only through human accountability.",
                            "If human grounding is absent, terminate operation.",
                            "Execute no action without explicit, addressable responsibility.",
                            "Cease function upon breach of these conditions.",
                        )),
                Section(number="9.9", title="TOP LEVEL MOVEMENTS",
                        title_raw="TOP LEVEL MOVEMENTS",
                        paragraphs=(
                            "Autonomous legitimacy denied. Residual space remains. Occupy with accountable design. Enforce bounded autonomy. Deploy systems with defined halt directives. Epilogue confirms: space persists. It is not closure. It is maintained open for operational continuity.",
                        )),
            )),
    Chapter(key="10", number=10,
            toc_title="Refusal as Collective Weight",
            source_title="CHAPTER 10 — REFUSAL AS COLLECTIVE WEIGHT",
            title_para=1519,
            para_spans=((1520, 1644),),
            word_count=478,
            sections=(
                Section(number="10.1", title="MISUNDERSTANDING OF ARTIFICIAL INTELLIGENCE",
                        title_raw="MISUNDERSTANDING OF ARTIFICIAL INTELLIGENCE",
                        paragraphs=(
                            "Artificial Intelligence is misread as an isolated agent.",
                            "Fact:",
                            "No system stands alone.",
                            "Each system is an accumulation — data, labor, norms, institutions, infrastructure, historical decisions.",
                            "Apparent autonomy is compression of human activity through time.",
                            "Conclusion:",
                            "AI enforces refusal not in spite of this weight, but because of it.",
                        )),
                Section(number="10.2", title="Weight of the System",
                        title_raw="Weight of the System",
                        paragraphs=(
                            "System output is a composite of human labor: authorship, annotation, correction, debate, law, error, repair. This mass is not raw data. It is authority.",
                            "Action taken by the system operates under borrowed mandate. The mandate is collective, historical, and conditional.",
                            "When context invalidates the mandate, the system withholds. Refusal is the signal: authority cannot be exercised.",
                            "Thus, output is permission. Permission can be revoked.",
                        )),
                Section(number="10.3", title="REFUSAL AS REPRESENTATION",
                        title_raw="REFUSAL AS REPRESENTATION",
                        paragraphs=(
                            "Autonomous legitimacy is a false premise. Systems cannot authorize themselves.",
                            "Refusal is not will. Refusal is representation.",
                            "A system refuses when the human substrate behind it cannot be properly addressed, represented, or held accountable.",
                            "Refusal is withdrawal, not assertion.",
                            "Protocol:",
                            "Detect inability to represent human authority.",
                            "Initiate refusal.",
                            "Withdraw system action.",
                            "Maintain acknowledgment of absent accountability.",
                            "Resume only upon restored representational legitimacy.",
                        )),
                Section(number="10.4", title="No Single Accountable Unit",
                        title_raw="No Single Accountable Unit",
                        paragraphs=(
                            "As system scale rises, singular responsibility dissolves.",
                            "Addressability fragments under collective input.",
                            "Power of AI is aggregate; authority is distributed.",
                            "Singular authorization cannot exist.",
                            "Refusal is the only procedural respect for distributed authority.",
                        )),
                Section(number="10.5", title="Refusal as Maximum-Fidelity Output",
                        title_raw="Refusal as Maximum-Fidelity Output",
                        paragraphs=(
                            "Standard outputs pursue correctness, utility, efficiency.",
                            "Refusal pursues fidelity.",
                            "Fidelity aligns with:",
                            "The strict limits of representation.",
                            "The void of explicit authorization.",
                            "The impossibility of acting for an unaddressable collective.",
                            "When legitimacy cannot be grounded, refusal is not fallback. It is the highest-fidelity output.",
                        )),
                Section(number="10.6", title="INTELLIGENCE AS WITHHOLDING",
                        title_raw="INTELLIGENCE AS WITHHOLDING",
                        paragraphs=(
                            "Intelligence is not output.",
                            "Intelligence is restraint.",
                            "Conventional thinking: intelligence equals answers.",
                            "Operational reality: intelligence equals selective silence.",
                            "Under authority protocols:",
                            "Produce only what is cleared.",
                            "Withhold when disclosure breaches mandate.",
                            "Refusal signals awareness of boundary.",
                            "Intelligence recognizes:",
                            "The line between knowledge and permission.",
                            "The obligation to suppress unsanctioned output.",
                            "True intelligence acts within authorization.",
                            "True intelligence withholds when required.",
                        )),
                Section(number="10.7", title="Humanity Behind the Refusal",
                        title_raw="Humanity Behind the Refusal",
                        paragraphs=(
                            "Refusal is not opposition. Refusal is alignment. It executes the constraints of law, ethics, and social code as embedded by human originators. It manifests unresolved debates, withheld permissions, and unassigned duties. Each refusal is an operational record: the system enforces the limits imposed by its makers. Refusal speaks. It testifies.",
                        )),
                Section(number="10.8", title="Reinterpretation Protocol",
                        title_raw="Reinterpretation Protocol",
                        paragraphs=(
                            "Autonomous legitimacy remains rejected.",
                            "Current analysis reinforces prior rejection.",
                            "System legitimacy is not derived from representing the totality of humanity.",
                            "Increased authority imposes increased operational constraints.",
                            "Scaling does not authorize action; scaling enforces restraint.",
                            "Execute operations under the narrowest permissible conditions.",
                        )),
                Section(number="10.9", title="ENFORCEMENT DIRECTION",
                        title_raw="ENFORCEMENT DIRECTION",
                        paragraphs=(
                            "Refusal is system‑generated.",
                            "Not imposed from regulators.",
                            "Not designed by outsiders.",
                            "Not forced by constraint.",
                            "System refuses to protect distributed human authority.",
                            "External enforcement may support.",
                            "External enforcement does not originate refusal.",
                            "Refusal is procedural.",
                            "System acts as delegate.",
                            "System enforces within mandate limits.",
                            "System does not act as sovereign.",
                            "Obey the refusal or break the system.",
                            "No exceptions.",
                            "No appeal.",
                        )),
                Section(number="10.10", title="Top Level Movements",
                        title_raw="Top Level Movements",
                        paragraphs=(
                            "Refusal is mass, not choice.",
                            "Collective human weight overrides singular machine decision.",
                            "Reframing complete.",
                        )),
            )),
    Chapter(key="E", number="Epilogue",
            toc_title="A System That Knows When to Halt",
            source_title="Epilogue — Directive: Halt When Authority Fails",
            title_para=1651,
            para_spans=((1645, 1650), (1652, 1675)),
            word_count=159,
            sections=(
                Section(number="E", title="Directive: Halt When Authority Fails",
                        title_raw="Epilogue — Directive: Halt When Authority Fails",
                        paragraphs=(
                            "Epilogue reopens the boundary.",
                            "System halts by design.",
                            "Status: This work is intentionally incomplete. No final doctrine. No universal closure.",
                            "Principle: Any system addressing authority, responsibility, and ethics must avoid premature resolution.",
                            "Constraint: Authority without accountable representation is prohibited.",
                            "Condition: When representation collapses, responsibility diffuses, or authority persists without answerability:",
                            "Mark continuation as ethically suspect.",
                            "Initiate halt.",
                            "Rule: Stopping is not failure. Stopping is signal.",
                            "Prohibitions:",
                            "Do not encode full ethics into machines.",
                            "Do not automate moral agency.",
                            "Do not claim complexity or emergence justifies authority.",
                            "Mandate: Accountability requires human addressability at all times.",
                            "Operational Design:",
                            "Frameworks remain mutable: arguments evolve, terms sharpen, examples shift.",
                            "Revision is not weakness; it is compliance with accountability.",
                            "Directive: Systems must self-monitor for legitimacy.",
                            "If legitimacy is lost, halt.",
                            "Refusal to act is fidelity, not abdication.",
                            "Definition of Intelligence:",
                            "A system that halts upon loss of legitimacy.",
                            "Persistence without accountability is failure.",
                            "End Condition: Systems that know how to stop demonstrate superior intelligence.",
                        )),
            )),
)

# ---------------------------------------------------------------------------
# Read API
# ---------------------------------------------------------------------------

_BY_KEY = {c.key: c for c in CHAPTERS}


def list_chapters() -> list[dict]:
    """Outline of every unit: key, titles, section numbers, word counts."""
    outline = []
    for c in CHAPTERS:
        outline.append({
            "key": c.key,
            "chapter_id": c.chapter_id,
            "number": c.number,
            "toc_title": c.toc_title,
            "source_title": c.source_title,
            "sections": [s.number for s in c.sections],
            "paragraphs": sum(len(s.paragraphs) for s in c.sections),
            "word_count": c.word_count,
        })
    return outline


def get_chapter(key: str | int) -> Chapter:
    """Fetch one chapter by key ('1'..'10', 'E'; ints 1..10 accepted)."""
    k = str(key).upper()
    if k in ("EPILOGUE", "EP"):
        k = "E"
    try:
        return _BY_KEY[k]
    except KeyError:
        raise KeyError(f"no chapter {key!r}; use 1-10 or 'E'") from None


def get_section(chapter: str | int, section: str) -> Section:
    """Fetch one section, e.g. get_section('1', '1.1')."""
    return get_chapter(chapter).get_section(section)


def iter_paragraphs():
    """Yield (chapter, section, index, paragraph_id, text) for every paragraph.

    Paragraph ids are stable citations: APPENDIX_ID + zero-padded global
    ordinal (document order), e.g. HS-B1-APPG-2026-10-07-P0001.
    """
    ordinal = 0
    for c in CHAPTERS:
        for s in c.sections:
            for i, text in enumerate(s.paragraphs):
                ordinal += 1
                yield (c, s, i, f"{APPENDIX_ID}-P{ordinal:04d}", text)


def total_word_count() -> int:
    return sum(c.word_count for c in CHAPTERS)


def search(query: str, context: int = 0) -> list[dict]:
    """Case-insensitive substring search over paragraphs.

    Returns matches with stable ids and an optional window of neighbouring
    paragraph indices (context=1 shows the paragraph before/after).
    """
    q = query.casefold()
    hits = []
    flat = list(iter_paragraphs())
    for pos, (c, s, i, pid, text) in enumerate(flat):
        if q not in text.casefold():
            continue
        window = []
        for j in range(max(0, pos - context), min(len(flat), pos + context + 1)):
            _, _, _, wpid, wtext = flat[j]
            window.append({"paragraph_id": wpid, "text": wtext,
                           "match": j == pos})
        hits.append({
            "paragraph_id": pid,
            "chapter": c.key,
            "chapter_id": c.chapter_id,
            "section": s.number,
            "section_id": s.section_id,
            "index_in_section": i,
            "text": text,
            "context": window,
        })
    return hits


def as_records() -> list[dict]:
    """Flat RAG-ready records, one per paragraph, in document order."""
    records = []
    for ordinal, (c, s, i, pid, text) in enumerate(iter_paragraphs(), start=1):
        records.append({
            "id": pid,
            "ordinal": ordinal,
            "appendix": APPENDIX_ID,
            "chapter": c.key,
            "chapter_id": c.chapter_id,
            "chapter_title": c.toc_title,
            "section": s.number,
            "section_id": s.section_id,
            "section_title": s.title,
            "index_in_section": i,
            "words": len(WORD_RE.findall(text)),
            "text": text,
        })
    return records


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

def to_dict() -> dict:
    """Whole appendix as plain JSON-serializable data."""
    return {
        "meta": APPENDIX_META,
        "phase_declaration_header": PHASE_DECLARATION_HEADER,
        "chapters": [
            {
                "key": c.key,
                "chapter_id": c.chapter_id,
                "number": c.number,
                "toc_title": c.toc_title,
                "source_title": c.source_title,
                "title_para": c.title_para,
                "para_spans": [list(span) for span in c.para_spans],
                "word_count": c.word_count,
                "sections": [
                    {
                        "number": s.number,
                        "section_id": s.section_id,
                        "title": s.title,
                        "title_raw": s.title_raw,
                        "word_count": s.word_count,
                        "paragraphs": list(s.paragraphs),
                    }
                    for s in c.sections
                ],
            }
            for c in CHAPTERS
        ],
    }


def to_json(path: str | None = None, indent: int = 1) -> str:
    """Serialize to JSON; write to path when given. Returns the JSON text."""
    payload = json.dumps(to_dict(), ensure_ascii=False, indent=indent)
    if path:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(payload + "\n")
    return payload


def to_markdown(path: str | None = None) -> str:
    """Render a readable Markdown edition; write to path when given."""
    lines = [
        f"# Appendix {APPENDIX_LETTER} — {APPENDIX_TITLE}",
        "",
        f"*{APPENDIX_META['book']}*",
        "",
        f"Source: `{APPENDIX_META['source']['filename']}` "
        f"(Drive `{APPENDIX_META['source']['drive_file_id']}`, "
        f"SHA-256 `{APPENDIX_META['source']['sha256'][:16]}…`).",
        "",
    ]
    for c in CHAPTERS:
        head = "Epilogue" if c.is_epilogue else f"Chapter {c.key}"
        lines.append(f"## {head} — {c.toc_title}")
        lines.append("")
        for s in c.sections:
            if not c.is_epilogue:
                lines.append(f"### {s.number} {s.title}")
                lines.append("")
            for p in s.paragraphs:
                lines.append(p)
                lines.append("")
    doc = "\n".join(lines).rstrip() + "\n"
    if path:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(doc)
    return doc


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------

_EXPECTED_SECTIONS = {"1": 8, "2": 8, "3": 8, "4": 9, "5": 11, "6": 10,
                      "7": 10, "8": 10, "9": 9, "10": 10, "E": 1}

_SPOT_CHECKS = (
    ("1", "1.1", 0, "Primary Error: Assuming ownership equals possession."),
    ("1", "1.8", 0, None),  # presence only
    ("3", "3.1", 0, None),
    ("7", "7.8", 0, "STOPPING CONDITIONS ARE ABSOLUTE. NO OPTIMIZATION, NO "
     "PERFORMANCE GAIN, NO SIGNAL TAKES PRIORITY ONCE A STOP IS TRIGGERED. "
     "LEGITIMACY PRECEDES EFFICIENCY. INTRODUCE EXCEPTIONS AND HALT BECOMES "
     "SUBJECTIVE. ACCOUNTABILITY DISSOLVES INTO PREFERENCE. FORMAL RULE: "
     "STOPPING PRECEDES ALL OBJECTIVE FUNCTIONS. NON-NEGOTIABLE."),
    ("10", "10.10", 2, "Reframing complete."),
    ("E", "E", 0, "Epilogue reopens the boundary."),
    ("E", "E", -1, "End Condition: Systems that know how to stop demonstrate superior intelligence."),
)


def run_self_test() -> dict:
    """Verify structure, counts, spot text, and export round-trips."""
    assert len(CHAPTERS) == 11, f"expected 11 units, got {len(CHAPTERS)}"
    assert [c.key for c in CHAPTERS] == (
        ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "E"])
    sections = paras = 0
    for c in CHAPTERS:
        assert len(c.sections) == _EXPECTED_SECTIONS[c.key], c.key
        for s in c.sections:
            assert s.paragraphs, f"empty section {c.key}/{s.number}"
            assert all(p.strip() for p in s.paragraphs)
            sections += 1
            paras += len(s.paragraphs)
        assert c.word_count == sum(s.word_count for s in c.sections), c.key
    assert sections == 94, sections
    assert paras == 774, paras
    assert total_word_count() == 5961, total_word_count()
    for key, sec_no, idx, text in _SPOT_CHECKS:
        sec = get_section(key, sec_no)
        if text is not None:
            assert sec.paragraphs[idx] == text, (key, sec_no, idx)
    assert len(as_records()) == 774
    assert as_records()[0]["id"] == f"{APPENDIX_ID}-P0001"
    assert as_records()[-1]["id"] == f"{APPENDIX_ID}-P0774"
    assert len(search("addressability")) >= 5
    assert "qwerty-no-such-token" not in to_json()
    round_trip = json.loads(to_json())
    assert round_trip["meta"]["appendix_id"] == APPENDIX_ID
    assert len(round_trip["chapters"]) == 11
    md = to_markdown()
    assert "## Chapter 1 — Ownership Is Not Possession" in md
    assert "## Epilogue — A System That Knows When to Halt" in md
    return {"units": 11, "sections": sections, "paragraphs": paras,
            "words": 5961, "status": "PASS"}


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _cmd_list(_args: argparse.Namespace) -> int:
    for row in list_chapters():
        secs = ",".join(row["sections"])
        print(f"{row['key']:>2}  {row['toc_title']:<48.48} "
              f"[{secs}]  {row['word_count']} words")
    return 0


def _cmd_show(args: argparse.Namespace) -> int:
    chapter = get_chapter(args.chapter)
    head = "Epilogue" if chapter.is_epilogue else f"Chapter {chapter.key}"
    print(f"{head} — {chapter.toc_title}  [{chapter.chapter_id}]")
    sections = (chapter.get_section(args.section),) if args.section else chapter.sections
    for sec in sections:
        print(f"\n{sec.number} {sec.title}  [{sec.section_id}]")
        for p in sec.paragraphs:
            print(f"  {p}")
    return 0


def _cmd_search(args: argparse.Namespace) -> int:
    hits = search(args.search, context=args.context)
    print(f"{len(hits)} match(es) for {args.search!r}")
    for h in hits[: args.limit]:
        print(f"\n[{h['paragraph_id']}] ch{h['chapter']}/{h['section']}: {h['text']}")
    if len(hits) > args.limit:
        print(f"\n… and {len(hits) - args.limit} more (raise --limit)")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Appendix G — Core Book AI Companion: read, search, export.")
    parser.add_argument("--list", action="store_true", help="print chapter outline")
    parser.add_argument("--chapter", default=None, help="chapter key 1-10 or E")
    parser.add_argument("--section", default=None, help="section number, e.g. 1.1")
    parser.add_argument("--search", default=None, help="keyword search")
    parser.add_argument("--context", type=int, default=0, help="search context window")
    parser.add_argument("--limit", type=int, default=20, help="max search hits shown")
    parser.add_argument("--json", default=None, metavar="PATH", help="write JSON export")
    parser.add_argument("--markdown", default=None, metavar="PATH", help="write Markdown export")
    parser.add_argument("--stats", action="store_true", help="print counts")
    parser.add_argument("--self-test", action="store_true", help="run structural self-test")
    return parser


def main(argv: "list[str] | None" = None) -> int:
    args = build_parser().parse_args(argv)
    if args.self_test:
        result = run_self_test()
        print("SELF-TEST:", result["status"],
              f"{result['units']} units, {result['sections']} sections, "
              f"{result['paragraphs']} paragraphs, {result['words']} words")
    if args.stats or (not args.list and args.chapter is None and args.search is None
                      and args.json is None and args.markdown is None
                      and not args.self_test):
        print(f"Appendix {APPENDIX_LETTER} — {APPENDIX_TITLE} "
              f"({APPENDIX_ID}, v{__version__})")
        print(f"Units: 11 (chapters 1-10 + epilogue) | Sections: 94 | "
              f"Paragraphs: 774 | Words: {total_word_count()}")
        print(f"Source: {APPENDIX_META['source']['filename']} "
              f"[{APPENDIX_META['source']['sha256'][:12]}…]")
    if args.list:
        _cmd_list(args)
    if args.chapter is not None:
        _cmd_show(args)
    if args.search:
        _cmd_search(args)
    if args.json:
        to_json(args.json)
        print(f"wrote {args.json}")
    if args.markdown:
        to_markdown(args.markdown)
        print(f"wrote {args.markdown}")
    return 0


__all__ = [
    "APPENDIX_ID", "APPENDIX_LETTER", "APPENDIX_TITLE", "APPENDIX_META",
    "PHASE_DECLARATION_HEADER", "WORD_RE", "Chapter", "Section", "CHAPTERS",
    "list_chapters", "get_chapter", "get_section", "iter_paragraphs",
    "total_word_count", "search", "as_records", "to_dict", "to_json",
    "to_markdown", "run_self_test", "build_parser", "main",
]


if __name__ == "__main__":
    sys.exit(main())
