#!/usr/bin/env python3
"""One-time, scoped production pass on the versioned manuscript copy.

The source master is never opened for writing. This script deliberately does not
run the earlier apply_edits_v2.py or patch_part_xxi.py scripts.
"""
from __future__ import annotations

from pathlib import Path
import re

ROOT = Path('/home/user')
SOURCE = ROOT / 'HARSHAL-SYSTEMS-Book-I-EDITED-2026-10-06.txt'
BACKUP = ROOT / 'HARSHAL-SYSTEMS-Book-I-EDITED-2026-10-06-PREPRODUCTION.txt'

if not BACKUP.exists():
    raise RuntimeError('Pre-production snapshot is missing; refusing to modify the edited copy.')
text = SOURCE.read_text(encoding='utf-8')
if 'PRODUCTION EDITION — VERSION 2.1' in text or 'Consolidated Glossary' in text:
    raise RuntimeError('Production pass appears to have already been applied; refusing to repeat it.')


def replace_exact(old: str, new: str, expected: int = 1) -> None:
    global text
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f'Expected {expected} exact match(es), found {count}: {old[:140]!r}')
    text = text.replace(old, new)


# ---- Production identity, title page, and authoritative scope notice ----
text = text.replace('(REVISED WORKING EDITION — TECHNICAL DRAFT, VERSION 2.0)',
                    '(PRODUCTION EDITION — VERSION 2.1)')
text = text.replace('Accountability-Gated Systems (AGS+), Orb Communicator Topology (OCM), Ground-0 Phase Detection, and Keyed Human–Machine Hybrid (HMKH) Governance',
                    'Accountability-Gated Systems (AGS), Orb Communicator Topology (OCM), Ground-0 Phase Detection, and Keyed Human–Machine Hybrid (HMKH) Governance')
replace_exact('Edition: Revised working manuscript v2.0, October 2026 — not externally endorsed or certified',
              'Edition: Production Edition v2.1, October 2026')
replace_exact('Includes a new plain-language reader orientation, updated public-source citations, worked mathematical/state-machine examples, and end-of-part student review problems.',
              'Includes a plain-language reader orientation, updated public-source citations, worked examples, student review questions in all 27 numbered parts, and a consolidated glossary.')

notice = '''AUTHORITATIVE SCOPE, EVIDENCE, AND STATUS NOTICE:
• This is the Production Edition of Book I, prepared for print. “Production” describes editorial and print preparation; it does not certify any system, validate a technical proposal, or claim that a described control is deployed.
• This volume contains 27 numbered parts. Part XXIV is fiction; Part XXVI is an author-applied analysis of publicly reported events; Part XXVII is a derivative index and embedded reference material. Each part’s local provenance and evidence labels govern its claims.
• “Normative” means a rule proposed within this author’s framework, not external law, a regulator’s approval, or a binding industry standard. Modeled scenarios, author-reported observations, and source-reported events are distinct evidence classes.
• A threat scenario, equation, pseudocode block, checklist, or named capability is not, by itself, evidence of an incident, a feasible mechanism, a successful defense, or a working deployment. Performance and timing claims require identified, equipment-specific testing and deployment evidence.
• “Phase” denotes a governance/software classification in this volume. Ice, water, gas, and risk-class labels are text metaphors; they are not measured thermodynamic or quantum phases. Biological, neural, or quantum language is hypothetical unless operationally defined and independently evidenced.
• An identity license is a non-revocable identity card or record; revoking identity credentials as punishment is abusive and prohibited. Scoped operational grants are separate instruments and may expire or be revoked under their stated process without erasing identity.
• H(t)=1 and H(t)=0 are protocol-authorization states, not diagnoses of consciousness, consent, coercion, or death. Biometrics, beacons, and cryptographic proofs do not establish those human states. Missing, stale, or conflicting telemetry means unknown/unverified and invokes the declared safe posture.
• “Immediate,” “halt,” “freeze,” “island,” and “sever” describe proposed policy/software states or pseudocode unless a measured deployment result is cited. They do not promise zero physical latency, successful actuation, automatic reserve activation, successful islanding, instantaneous severance, or uninterrupted service.
• HMKH/NAB material is a proposed computational-control model, not a clinical certification, diagnosis, or medical-device approval. No section grants legal authority, a commercial license, or runtime permission through book purchase.

'''
start = text.index('PROVENANCE & NORMATIVE SEPARATION NOTICE:')
end = text.index('AMAZON KINDLE DIRECT PUBLISHING (KDP) PRINT SPECIFICATION BLOCK:', start)
text = text[:start] + notice + text[end:]

# Title-page copy and edition labels.
text = text.replace('REVISED WORKING EDITION — TECHNICAL DRAFT (v2.0)', 'PRODUCTION EDITION — VERSION 2.1')
text = text.replace('With a plain-language reader orientation, worked mathematical and state-machine examples, and student review problems',
                    'With a plain-language orientation, worked examples, review questions in all 27 numbered parts, and a consolidated glossary')
text = text.replace('Revised Working Edition: Worked Examples & Student Problem Sets Index',
                    'Student Reviews and Worked Examples — Guide')
text = text.replace('See the worked examples and review problems at the relevant part endings. Counts in the original build notes are not authoritative for this revised edition.',
                    'Each numbered part ends with student review questions; selected worked examples appear in the relevant parts.')
text = text.replace('This edition of Book I (Harshal\'s Systems) is structured as a rigorous university- and graduate-level textbook for AI safety, distributed systems, and institutional governance courses, complete with formal LaTeX equations, worked numerical examples, and end-of-part student problem sets:',
                    'This edition of Book I (Harshal’s Systems) includes formal equations, worked numerical examples, and an end-of-part review section in each numbered part:')
text = text.replace('This volume is the consolidated reference library and umbrella corpus for Harshal’s Systems. It contains front matter, archival author front matter, a new plain-language reader orientation, 27 numbered parts, seven functional collections, and auxiliary reference modules. Its parts include conceptual doctrine, formal models, proposed specifications, threat research, case analysis, policy material, fiction, an event-based Ground-0 case analysis, and a derivative corpus index. Inclusion does not establish implementation, validation, or legal force.',
                    'This volume is the consolidated reference library and umbrella corpus for Harshal’s Systems. It contains front matter, an archived author reading guide, a plain-language reader orientation, 27 numbered parts, and auxiliary reference modules embedded in Part XXVII. Its parts include conceptual doctrine, formal models, proposed specifications, threat research, case analysis, policy material, fiction, and a derivative corpus index. Inclusion does not establish implementation, validation, or legal force.')

# A contents table will receive final page numbers after the odd-page interior is rendered.
toc = '''Main Document Map
Contents
| Section | Page |
|---|---:|
| A Reader’s Orientation | TBD |
| Part I — The Core Book | TBD |
| Part II — Formalization | TBD |
| Part III — Safety Rationale | TBD |
| Part IV — AGS: Accountability-Gated Systems | TBD |
| Part V — OCM: Orb Communicator Model | TBD |
| Part VI — AI Inner Shell | TBD |
| Part VII — Addressing and Spherical Topology | TBD |
| Part VIII — Operator Model | TBD |
| Part IX — Disc Primitives, Routing, and Lifecycle | TBD |
| Part X — AGS Layering and Conformance | TBD |
| Part XI — AGS Accessory Pack | TBD |
| Part XII — Ground-0 and Duty Collation | TBD |
| Part XIII — Whyland Standards | TBD |
| Part XIV — Neural Atomic Bodies Compendium | TBD |
| Part XV — Keyed Human–Machine Hybrid Controls | TBD |
| Part XVI — Threat Modeling and Context-Dependent Guarantees | TBD |
| Part XVII — Atomic-Body Classes and Reactor Doctrine | TBD |
| Part XVIII — Institutional Application | TBD |
| Part XIX — Accountability in Keyed Hybrid Systems | TBD |
| Part XX — Supply-Chain and Implanted-Device Threat Research | TBD |
| Part XX-B — Illustrative Narrative Sandbox | TBD |
| Part XXI — MicroConvergence and Signal Encoding | TBD |
| Part XXII — Policy and Governance Archive | TBD |
| Part XXIII — Specification Series | TBD |
| Part XXIV — The Grand River Foundation (Fiction) | TBD |
| Part XXV — Anti-Denial of Justice and NAB I/O | TBD |
| Part XXVI — Anthropic Access Events and PDH-R Review | TBD |
| Part XXVII — Whole Corpus / Complete Work | TBD |
| Consolidated Glossary | TBD |

Front Matter and Editorial Material
'''
replace_exact('Main Document Map\nFront Matter and Editorial Material\n', toc)

# Remove the per-part blanket DRAFT marker while keeping claim/evidence summaries.
start = text.index('Numbered Parts\n')
end = text.index('Reference Modules\n', start)
status_block = text[start:end]
status_block = status_block.replace('| Part | Content class / provenance | Status | Evidence and force |',
                                    '| Part | Content class / provenance | Editorial status | Evidence and force |')
status_block = status_block.replace('| **DRAFT** |', '| Production-edited |')
text = text[:start] + status_block + text[end:]
replace_exact('Auxiliary modules are embedded in Part XXVII and are labeled locally. A module’s local provenance does not change the DRAFT status of its containing part.',
              'Auxiliary modules are embedded in Part XXVII and are labeled locally. A module’s provenance does not upgrade the evidence or validation status of its containing part.')
replace_exact('Every retained numbered part is explicitly marked DRAFT in this edition. DRAFT describes editorial maturity only; it does not mean that a proposal is false, nor does it establish implementation, operational readiness, legal force, independent validation, or empirical confirmation. Version tags such as v1.0, internal uses of “final,” and source-authored “ready for integration/institutional use” labels do not override this edition’s DRAFT status or establish external validation. See each part for assumptions, citations, and claim-level evidence labels.',
              'All 27 numbered parts have been edited for this Production Edition. Publication readiness is an editorial and print status only; it does not ratify a proposal, establish implementation, confer external legal force, or imply independent validation or empirical confirmation. Version tags, internal uses of “final,” and source-authored “ready for integration/institutional use” labels do not change those limits. See each part for its content status, assumptions, citations, and claim-level evidence labels.')

# Replace repeated blanket disclaimers with short pointers to the authoritative notice.
old_scope = '''Notices
Disclaimer
This living document functions as a continuous intake system rather than a static record.
It absorbs new data, structural updates, and manual calibrations over time. Because it treats
uncertainty as a reason to pause and recalculate, the parameters defined herein are subject to
ongoing, traceable refinement.
Scope of scenario content
This volume contains conceptual, fictional, research, and adversarial material. Some threat-model sections explicitly identify assumed attack surfaces and vectors because a defensive architecture cannot be evaluated against an undefined threat. The level of detail and evidence status vary by section.
A scenario or vector is not, by itself, an assertion that an incident occurred, that a mechanism is feasible, or that a defense has been tested. Each claim should be read with its local provenance, assumptions, and evidence status. Defensive examples are not endorsements or instructions to harm; model completeness does not establish operational readiness.

'''
new_scope = '''Scope and evidence pointer
For the authoritative scope, safety, and evidence boundaries, see the notice above. Read each part’s local provenance and evidence labels; threat scenarios remain modeled inputs unless separately supported by attributed evidence.

'''
replace_exact(old_scope, new_scope)
old_archive_disclaimer = '''Harshal’s Systems
Disclaimer: This Living Metaversal Document functions as a continuous intake system rather than a static record. Native to both Physical and Digital Arizona, it absorbs new data, structural updates, and manual calibrations over time. Because it treats uncertainty as a reason to pause and recalculate, the parameters defined herein are subject to ongoing, traceable refinement.
The submitted draft described hypothetical and adversarial scenarios as conceptual stress tests and stated that they were not intended as operational instructions. That statement records authorial intent only; it does not prove that every scenario is non-operational, harmless, contained, validated, or suitable for real-world use. Read the current scope notice and each part’s local evidence and status boundaries.
'''
new_archive_disclaimer = '''Harshal’s Systems
Archived status pointer: Earlier authorial wording is retained only where it provides historical context. The current scope, evidence, and publication status are governed by the authoritative notice above and each part’s local labels.
'''
replace_exact(old_archive_disclaimer, new_archive_disclaimer)

# Remove an obsolete archived contents list and old navigation dump; the new contents is authoritative.
arch_start = text.index('ARCHIVED ORIGINAL CONTENTS LIST — historical source material; the current 27-part map appears above.')
arch_end_marker = 'Harshal\'s Systems: Neural Black Box Model Documentation & Master Specification\n'
arch_end = text.index(arch_end_marker, arch_start) + len(arch_end_marker)
text = text[:arch_start] + 'The archival contents list and earlier working-edition navigation dump are omitted from this Production Edition; use the Contents and status register above.\n' + text[arch_end:]

# Remove a stale editorial-status paragraph from the archived author preface.
text = re.sub(r'Preface\nThis booklet is a work in progress\.[\s\S]*?Readers should perceive this textbook as an ongoing exploration rather than a definitive solution\.\n',
              'Preface\n', text, count=1)

# Internal references to absent repository files are removed or replaced by in-book references.
text = text.replace('Flagship Portfolio Paper (AUTHOR-PROPOSED RESEARCH; DRAFT): Accountability in Keyed Human–Machine Hybrid Systems is the portfolio’s proposed research paper (also identified as a standalone draft at research/keyed-human-machine-hybrid-systems.md).', 'Flagship Portfolio Paper (AUTHOR-PROPOSED RESEARCH): Accountability in Keyed Human–Machine Hybrid Systems is the portfolio’s proposed research paper (see Part XIX).')
text = text.replace('No `pdh-registry.json`, human ledger entry, issuance hash, or generated badge is included in the supplied packet.', 'No registry export, human ledger entry, issuance hash, or generated badge is included in the supplied packet.')
replacements = {
    'Flagship Paper: Accountability in Keyed Human–Machine Hybrid Systems (Part XIX · standalone publication at research/keyed-human-machine-hybrid-systems.md).':
        'Flagship Paper: Accountability in Keyed Human–Machine Hybrid Systems (see Part XIX).',
    'The parts are grouped by topic rather than as a strictly linear dependency chain. Cross-references may point forward or back; use the status register and claim-level evidence notes when following them. Seven functional collections under docs/harshal-systems/collections/ provide additional routes. Pick the path that matches why you are here:':
        'The parts are grouped by topic rather than as a strictly linear dependency chain. Cross-references may point forward or back; use the Contents, status register, and claim-level evidence notes when following them. Pick the reading path that matches why you are here:',
    'Related Documentation\nHarshalOS documentation directory\nHarshalOS repository README\n':
        'External code and repository documentation are not reproduced in this print volume.\n',
    'Normative Reference: The single authoritative formal contract governing all symbols, legitimacy equations, human-key properties, accountability layers, and phase types is specs/normative/canonical-model.md (machine registry: specs/normative/canonical.json · reconciliation ledger: specs/normative/contradictions.md).':
        'Normative Reference: Within this volume, Part II defines the formal symbols and permission model; Parts IV–VII develop the related architecture and topology. No separate external canonical-model file is part of this print edition.',
    'specs/normative/canonical-model.md §8–§10': 'Parts V–VII',
    'specs/normative/canonical-model.md §11': 'Part XII',
    'specs/normative/canonical-model.md': 'Part II and Parts IV–VII',
    'specs/normative/canonical.json': '',
    'specs/normative/contradictions.md': '',
    'docs/harshal-systems/collections/': '',
    'docs/harshal-systems/modules/grand-architecture.md — this module.': 'The Grand Architecture reference module is reproduced in this section.',
    'modules/convergence-institutions.md': 'the Convergence institutions module in Part XXVII',
    'modules/grand-architecture.md': 'the Grand Architecture module in Part XXVII',
    'modules/uts.md': 'the Universal Timekeeping System module in Part XXVII',
    'ground-0-v1.2.md': 'v1.2 issuer-layer amendment',
    'specs/normative/': '',
    'The Grand Architecture — Convergence-era infrastructure architecture module\ndocument_id: GRAND-ARCHITECTURE-REF-20261002\nprovenance_class: FICTION\nstatus_taxonomy: NARRATIVE_ARCHITECTURE_MODULE\nevidence_status: NARRATIVE_SANDBOX\nresearch_layer: NARRATIVE_REFERENCE\nsource: updates/2026-10-02/ (UpdateOct2) — Grand River Flow Model, Universal Timekeeping System, Convergence Institutions, and the Storm-0558 public-source review; reconciled by CONTINUITY-AUDIT.md and CANONICAL-NUMBERS.md.':
        'The Grand Architecture — Convergence-era infrastructure architecture module\ndocument_id: GRAND-ARCHITECTURE-REF-20261002\nprovenance_class: FICTION\nstatus_taxonomy: NARRATIVE_ARCHITECTURE_MODULE\nevidence_status: NARRATIVE_SANDBOX\nresearch_layer: NARRATIVE_REFERENCE\nsource: Author-supplied Convergence-setting material; the module is fictional and is not an independently verified engineering, hydrology, or institutional study.',
}
for old, new in replacements.items():
    if old not in text:
        # Empty replacements are allowed to have been consumed by an earlier broader replacement.
        if new == '':
            continue
        raise RuntimeError(f'Missing expected repository-reference text: {old[:120]!r}')
    text = text.replace(old, new)

# Remove file/repository implementation lists while retaining accurate, in-book limits.
text = text.replace(
    'The repository implementation is documented in updates/2026-10-02/02-Frameworks/Universal-Timekeeping-System/UTS-Specification.md and UTS-Conversion-Guide.md; the generator is uts_generator.py; the HarshalOS Home Screen watch and duration converter are implemented in js/uts.js and js/apps-uts.js. The original author-supplied RTF files remain preserved as source material; where their former Earth-scale arithmetic or UD overloading conflicts with this corrected reference, use the Markdown specification.\n',
    'No executable calculator, code package, or external source file is reproduced in this print volume. The arithmetic examples are derived from the definitions stated here; the browser implementation is not independently tested or claimed as deployed.\n')
text = text.replace(
    'Repository implementation\nupdates/2026-10-02/02-Frameworks/Universal-Timekeeping-System/UTS-Specification.md — detailed specification.\nupdates/2026-10-02/02-Frameworks/Universal-Timekeeping-System/UTS-Conversion-Guide.md — worked examples.\nupdates/2026-10-02/02-Frameworks/Universal-Timekeeping-System/uts_generator.py — Python UTC-to-UTS projection and duration helpers.\njs/uts.js and js/apps-uts.js — browser converter and UTS watch app.\nindex.html, css/uts.css, and js/wm.js — Home Screen local clock, Earth-UTC line, Gregorian month calendar, modeled UDate, and app link.\n',
    'Implementation and limits\nThis printed reference contains no executable calculator or browser code. Its equations and worked examples are the complete in-book record; no deployment, test result, or external code artifact is claimed.\n')
text = text.replace(
    'Extent: 358 distinct instance values are named in\nbusiness plan/Grand Canyon Hydropower Render Spec.md,\npartitioned in the update\'s node mapping as roughly 180 / 120 / 60 across Tiers 1–3.\n',
    'Extent: The fictional setting describes 358 distinct instance values, partitioned in its narrative mapping as roughly 180 / 120 / 60 across Tiers 1–3. This count is an author-supplied story parameter, not an independently checked engineering registry.\n')
text = text.replace(
    '5. Canonical quantity anchors\nCANONICAL-NUMBERS.md\nis the controlling numeric reference, reproducible through\nrecalculate.py.\nGA restates the load-bearing figures and inherits every caveat:\n',
    '5. Narrative quantity anchors\nThe quantities in this fictional module are author-supplied setting parameters, not engineering specifications. No external calculation file or independent reproduction is included in this print volume.\n')
text = text.replace(
    'The source material presents it as a shipbuilding and high-technology manufacturer, with automated production, human design teams, and in-world simulation/computing capabilities.',
    'The fictional setting presents it as a shipbuilding and high-technology manufacturer, with automated production, human design teams, and in-world simulation/computing capabilities.')
text = text.replace(
    'The original author-supplied RTF files remain preserved at updates/2026-10-02/04-Institutional-Frameworks/Convergence-Institutions/. Their narrative claims should not be imported into the canonical threat, policy, or engineering record without independent evidence and explicit provenance. This summary is a separate Book I library module only to make the fictional canon discoverable; its provenance remains FICTION (NARRATIVE_SANDBOX).',
    'The underlying fictional material is author-supplied and is not independently fact-checked. Its narrative claims should not be imported into a real threat, policy, or engineering record without independent evidence and explicit provenance. This summary is an embedded Book I reference module; its provenance remains FICTION (NARRATIVE_SANDBOX).')
text = text.replace(
    '10. Implementation in this repository\ndocs/harshal-systems/modules/grand-architecture.md — this module.\njs/grand-architecture-data.js — the source package describes layer/invariant data and a cross-check against its canonical numbers card. The cited test path is an author-supplied pointer; this manuscript does not independently run or verify it.\njs/apps-grand.js and css/grand-architecture.css — the read-only Grand Architecture\ndesktop app. It writes no ledger row, changes no state, and calls no HOS authority capability.\nupdates/2026-10-02/ — the source package, its\ncontinuity audit, and the canonical numbers card.\n',
    '10. Implementation boundary\nThis print volume reproduces the narrative architecture as reference text only. It includes no executable application, test suite, permit, feasibility analysis, or independent audit, and it makes no deployment claim.\n')
text = text.replace(
    'The conceptual crosswalk to catalogue entries #003 (SCAV++ Output Verification Engine) and #008 (Stingray Counter Protocol) is a review lens; #008 is not a Storm-0558 finding.',
    'The conceptual crosswalk to other author-described threat-model concepts is a review lens only; it is not a Storm-0558 finding.')
text = text.replace(
    'The original author-supplied RTF files remain preserved at updates/2026-10-02/04-Institutional-Frameworks/Convergence-Institutions/.',
    'The original author-supplied fictional materials are not reproduced here.')
text = text.replace(
    'This section is automatically synchronized with manuscript/the-grand-river-foundation/ and publications/grand-river-foundation/BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md.',
    'This print preview is a fixed excerpt and is not automatically synchronized with any separate manuscript.')
text = text.replace(
    'The Grand River Foundation is Book II — Preview, a standalone work of speculative institutional fiction set in ~2100 CE. Nothing in Book II is a normative specification or factual claim; all binding specifications, equations, and audits reside in Book I (Harshal\'s Systems, Parts I–XXIII, XXV–XXVII). Book II uses the ~2100 setting—the modular Grand River / Colorado River hyperstructure series (first modular dam-and-city operation targeted circa 2046; 2098 as an interim commissioning/expansion milestone across 20-year supply-chain planning windows; 1,200–2,500 feet of cumulative multi-stage head in the first 40–60 years and 4,000 feet as the long-range fictional aggregate target across the series, not a single dam wall; Mistveil City targeting ~80 million residents by 2100 alongside the separate ~40 million regional service count; see the Grand Architecture module in Part XXVII), the 500-Coin Western Colonnade of Mutual Underwriting Houses, the 119-NAB Ombudsman\'s Council, the Point-to-Point South Wall Copper Vault, and the Spherical Orb Chamber (0–359 address ring closing at the 0° Zero-Degree Meridian)—as the future-world sandbox for mature civilizational implementations of Book I\'s architecture.',
    'The Grand River Foundation is Book II — Preview, a work of speculative institutional fiction set in ~2100 CE. Nothing in Book II is a normative specification or factual claim; the design proposals remain in Book I. Book II uses the ~2100 setting—the modular Grand River / Colorado River hyperstructure series (first modular dam-and-city operation targeted circa 2046; 2098 as an interim commissioning/expansion milestone across 20-year supply-chain planning windows; 1,200–2,500 feet of cumulative multi-stage head in the first 40–60 years and 4,000 feet as the long-range fictional aggregate target across the series, not a single dam wall; Mistveil City targeting ~80 million residents by 2100 alongside the separate ~40 million regional service count; see the embedded Grand Architecture module in Part XXVII), the 500-Coin Western Colonnade of Mutual Underwriting Houses, the 119-NAB Ombudsman\'s Council, the Point-to-Point South Wall Copper Vault, and the Spherical Orb Chamber (0–359 address ring closing at the 0° Zero-Degree Meridian)—as a future-world sandbox for the fiction.',
)
text = text.replace(
    'Status/evidence note: Part XXVII is DRAFT and derivative. Module metadata and repository paths are author-supplied provenance pointers; this manuscript does not independently verify their implementation, tests, or external-source reconciliation.',
    'Status/evidence note: Part XXVII is a production-edited derivative index and embedded reference section. Its author-supplied module descriptions do not establish implementation, test results, or external-source reconciliation.')
text = text.replace(
    'Book I is the working reference corpus. Book II is the fictional companion in production. Part XXIV’s fiction remains non-normative; the full Book II manuscript, if maintained separately, is outside this file.',
    'Book I is the production reference volume. Book II is its fictional companion; Part XXIV is a preview, not a claim that a complete separate novel is included. The fiction remains non-normative.')
text = text.replace(
    'DETERMINISTIC umbrella compilations, indices, and formatted build artifacts',
    'Derivative summaries, indices, and reference text')

# Focused replacements for remaining Part XXVII provenance taxonomy and index references.
text = text.replace('DERIVATIVE_BUILD: Deterministic umbrella compilations, indices, and formatted build artifacts (publications/harshal-systems/HARSHAL-SYSTEMS-USER-MANUAL.md, .docx, manuscript/manifest.json) generated by source/build.py, scripts/export-docx.py, and scripts/write-chapter.mjs.',
                    'DERIVATIVE_BUILD: Edited summaries, indices, and reference modules prepared from author-supplied material; no build scripts or executable artifacts are included in this print volume.')
text = text.replace('ARCHIVE: Preserved historical drafts, original submission front matter (00-author-front-matter.md), ZIP snapshots (archives/ground-0/), and raw RTF chapter drafts (archives/manuscript-rtf/).',
                    'ARCHIVE: Historical author material retained or summarized as such; archival labels do not make an old assertion current or verified.')
text = text.replace('AUTHOR_PROPOSED_SPEC: Internal architectural, topological, or constitutional rules proposed in this manuscript (including Ground-0, AGS+, OCM, HMKH, ADJR-v1.0, CHE++, CGPA, and OCS); DRAFT status applies and no external legal force or certification is implied.',
                    'AUTHOR_PROPOSED_SPEC: Internal architectural, topological, or constitutional rules proposed in this manuscript (including Ground-0, AGS, OCM, HMKH, ADJR-v1.0, CHE++, CGPA, and OCS); no external legal force or certification is implied.')
text = text.replace('RESEARCH_PAPER: Formal analytical, hybrid-systems, or adversarial threat-modeling research (Part XIX — Keyed Human–Machine Hybrid Systems, Part XVI — AGS++ Threat Modeling, Part XX — Supply Chain Attack Vector++).',
                    'RESEARCH_PAPER: Formal analytical, hybrid-systems, or adversarial threat-modeling research (Parts XVI, XIX, and XX).')
text = text.replace('1. PUBLIC_RESEARCH_SUMMARY: Flagship portfolio entry point (research/keyed-human-machine-hybrid-systems.md & Part XIX) and executive synthesis.',
                    '1. PUBLIC_RESEARCH_SUMMARY: Flagship portfolio entry point in Part XIX and its executive synthesis.')
text = text.replace('6. DERIVATIVE_REFERENCE: Auxiliary summaries and calculations; local metadata identifies provenance and does not upgrade the parent part’s DRAFT status.',
                    '6. DERIVATIVE_REFERENCE: Auxiliary summaries and calculations; local metadata identifies provenance but does not upgrade the evidence status of the parent part.')
text = text.replace('4. Summary of Canonical Conceptual Resolutions (specs/normative/canonical-model.md)',
                    '4. Summary of Conceptual Resolutions (as defined in Parts I–XXVI)')
text = text.replace('5. Functional Collections Index (docs/harshal-systems/collections/)\n\n',
                    '')
text = text.replace('7. Functional Collections Index (docs/harshal-systems/collections/)\n\n',
                    '')
text = text.replace('6. Complete Corpus Manifest (Front Matter + Parts I–XXVII)',
                    '5. Complete Corpus Manifest (Front Matter + Parts I–XXVII + Glossary)')
text = text.replace('Corpus scope: this file contains the front matter, archived author front matter, and Parts I–XXVII, including the fiction preview in Part XXIV. The separate full Book II manuscript is not part of this file. The final count of this revised file is stated in the accompanying revision note.',
                    'Corpus scope: this print volume contains front matter, an archived author reading guide, the plain-language orientation, Parts I–XXVII (including the fictional preview in Part XXIV), embedded reference modules, and the consolidated glossary. It does not include a separate full Book II novel. Final counts and layout scope are stated in the accompanying production notes.')
text = text.replace('Every module in the repository is governed by four orthogonal metadata dimensions plus the stable 8-field component interface (id, canonical_name, depends_on, defines, uses, invariants, conflicts_with, status) embedded in machine-readable YAML frontmatter and visible provenance banners:',
                    'The embedded reference modules use four orthogonal metadata dimensions and may describe an eight-field component interface (id, canonical_name, depends_on, defines, uses, invariants, conflicts_with, status). These labels organize this author’s material; they are not an external registry or certification:')
text = text.replace('4. Implementation in this repository\n', '4. In-book implementation boundary\n')
text = text.replace('source: Part XX — Supply Chain and Implanted-Device Threat Research; corrected implementation notes dated 2026-10-02.',
                    'source: Author-supplied reference material; no external file path is part of this print edition.')
text = text.replace('source: Convergence Institutions RTF package and corresponding Convergence-universe entries in the Harshal Systems User Manual.',
                    'source: Author-supplied Convergence-setting material; the claims remain fictional.')
text = text.replace('The supplied ground-0-v1.2.md is expressly an unratified issuer-layer draft.',
                    'The supplied Ground-0 v1.2 issuer-layer amendment is expressly unratified.')
text = text.replace('The old label `PDH-2026-0929-ANTHROPIC-001` appears as a case-record identifier; it is not a v1.2 PDH-R header.',
                    'The old label `PDH-2026-0929-ANTHROPIC-001` appears as a case-record identifier; it is not a v1.2 PDH-R header.')
text = text.replace('No `pdh-registry.json`, human ledger entry, issuance hash, or generated badge is included in the supplied packet.',
                    'No registry export, human ledger entry, issuance hash, or generated badge is included in the supplied packet.')
text = text.replace('the exact case-study file;', 'the exact case-study record;')
text = text.replace('Part XXVI is DRAFT and derivative.', 'Part XXVI is production-edited case analysis.')

# Replace the old functional-collections front-matter subsection with a print-safe note.
text = text.replace('Functional Collections\nThe collections provide topic-based routes through the numbered corpus.\nSee each collection guide for its scope and contents.',
                    'Thematic Navigation\nUse the Contents and the part-by-part reading paths above to navigate this printed volume. External repository collections are not included.')

# Correct the user-approved Part XXIII internal numbering: §1–§7 within each spec.
xxiii_match = re.search(r'(?m)^Part XXIII — Specification Series$', text)
xxiv_match = re.search(r'(?m)^Part XXIV — Book II Preview:', text)
if not xxiii_match or not xxiv_match or xxiv_match.start() <= xxiii_match.start():
    raise RuntimeError('Could not locate the exact Part XXIII–XXIV boundaries.')
xxiii_start = xxiii_match.start()
xxiv_start = xxiv_match.start()
xxiii = text[xxiii_start:xxiv_start]
roman_to_section = {'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5', 'VI': '6', 'VII': '7'}
for roman, num in roman_to_section.items():
    xxiii = re.sub(rf'(?m)^Part {roman} — ', f'§{num} — ', xxiii)
text = text[:xxiii_start] + xxiii + text[xxiv_start:]

# Make publication/readiness status distinct from individual author-proposed specifications.
text = text.replace('Version labels identify draft revisions only; this volume does not claim deployment, external certification, or completed conformance testing.',
                    'Version labels identify author-designated specification revisions; this volume does not claim deployment, external certification, or completed conformance testing.')
text = text.replace('Part status: DRAFT\nProvenance class: CASE_ANALYSIS',
                    'Editorial status: Production-edited\nProvenance class: CASE_ANALYSIS')
text = text.replace('Status/evidence note: Part XXVII is DRAFT and derivative.',
                    'Status/evidence note: Part XXVII is a production-edited derivative index.')
text = text.replace('Classifies the method as DRAFT and does not claim external certification.',
                    'classifies the method as author-proposed and does not claim external certification.')
text = text.replace('Source-stated status: FINALIZED (Normative), September 12, 2026. This edition classifies the method as DRAFT and does not claim external certification.',
                    'Source-stated status: FINALIZED (Normative), September 12, 2026. This edition presents the method as author-proposed and does not claim external certification.')

# Consolidate the two local glossary cross-reference appendices into pointers to the single glossary.
replace_exact('''Appendix A: Glossary Cross-Reference
MicroConvergence — proposed state-comparison concept; not a validated protocol.
MC Instance — software component, not an observer with consciousness.
Consensus Event — compatibility record under a specified rule; not human consent or authority.
Perceptual relay — user-interface output; not proof of perception or agreement.
''',
'''Glossary pointer
For the consolidated definitions of MicroConvergence, MC Instance, Consensus Event, perceptual relay, and related terms, see the Consolidated Glossary at the end of this volume. The local limits in this part remain controlling.
''')
replace_exact('''Appendix B: Glossary Cross-Reference
Consumer — component requesting a display.
Operator — intended user; interface delivery does not prove perception or consent.
AVE Signal — typed, bounded payload with provenance metadata.
Signal Class — draft category for presentation complexity, not a measured safety level.
Security Gate — proposed validation stage; not a physical interlock unless independently implemented and tested.
''',
'''Glossary pointer
For the consolidated definitions of Consumer, Operator, AVE Signal, Signal Class, Security Gate, and related terms, see the Consolidated Glossary at the end of this volume. The local limits in this part remain controlling.
''')

# Replace repository paths in the two remaining narrative/reference lines.
text = text.replace('See the Grand Architecture module in Part XXVII', 'see the embedded Grand Architecture module in Part XXVII')
text = text.replace('The browser calculator uses finite JavaScript Number inputs and rounded display. Use arbitrary-precision arithmetic for scientific-grade precision. Original RTF source files are preserved; where their earlier Earth-scale arithmetic or UD overloading conflicts with this corrected reference, use the Markdown specification.',
                    'Any hypothetical browser implementation using finite-precision arithmetic would require appropriate precision analysis. This printed module includes no executable calculator; its approximate epoch and unit conversions are not an external time service or cosmological measurement.')
text = text.replace('The Grand Architecture is the single named architecture that binds the four lineages\ndelivered in the 2026-10-02 update into one structure, and binds that structure back to HarshalOS\'s\naccountability invariants. The update arrived as four unrelated families of material — a\nmegastructure flow model, a timekeeping system, three institutions, and a threat-intelligence\nreview — with no architecture stating how they compose. The Grand Architecture is that missing\ncomposition rule.',
                    'The Grand Architecture (GA) is a fictional architecture that binds several author-supplied Convergence-setting elements into one narrative structure and relates that structure to the accountability vocabulary used in this book. It is a worldbuilding composition rule, not a report about existing infrastructure or institutions.')
text = text.replace('nothing here enters\nspecs/normative/, and GA confers no authority,', 'nothing here creates an external standard, and GA confers no authority,')
text = text.replace('No GA\nstatement is promoted to specs/normative/, to the kernel, or to a production control.', 'No GA statement is promoted to an external standard, to a software kernel, or to a production control.')
text = text.replace('See the Convergence institutions module in Part XXVII. GA', 'See the embedded Convergence institutions module below. GA')
text = text.replace('modules/uts.md', 'the Universal Timekeeping System module above')
text = text.replace('CANONICAL-NUMBERS.md', 'the narrative quantity anchors stated in this module')
text = text.replace('recalculate.py', 'an external calculation script')
text = text.replace('business plan/Grand Canyon Hydropower Render Spec.md', 'the setting’s fictional infrastructure plan')
text = text.replace('continuity audit, and the canonical numbers card.', 'continuity notes, and the fictional quantity anchors.')
text = text.replace('This module and the UI are DERIVATIVE_BUILD artifacts.', 'This module is derivative reference text; no executable UI is reproduced here.')
text = text.replace('source: updates/2026-10-02/ (UpdateOct2) — Grand River Flow Model, Universal Timekeeping System, Convergence Institutions, and the Storm-0558 public-source review; reconciled by CONTINUITY-AUDIT.md and CANONICAL-NUMBERS.md.',
                    'source: Author-supplied Convergence-setting material; figures and institutional details remain fictional unless separately supported by cited public evidence.')
text = text.replace('original RTF files', 'original source files')

# Apply the approved framework-name normalization. Preserve the real lineage once, deliberately.
text = text.replace('AGS++', 'AGS')
text = text.replace('AGS+', 'AGS')
lineage_note = ('Framework naming: The historical lineage is AGS → AGS+ → AGS++. '
                'This Production Edition uses AGS as the current umbrella name throughout; '
                'the earlier labels are retained here only to identify that historical sequence.\n')
anchor = 'What are Harshal\'s Systems?\n'
if text.count(anchor) != 1:
    raise RuntimeError('Could not locate unique framework-introduction anchor.')
text = text.replace(anchor, lineage_note + '\n' + anchor, 1)

# Convert emoji/pictograph badges into monochrome print labels; preserve meaning in plain text.
emoji_map = {
    '🧊+': '[ICE]+', '🧊': '[ICE]', '💧': '[WATER]', '🌫': '[GAS]',
    '🟢': '[SAFE]', '🟡': '[MODERATE]', '🟠': '[ELEVATED]', '🔴': '[PROHIBITED]',
    '☐': '[ ]', '✓': '[PASS]', '✗': '[FAIL]', '⚠': '[CAUTION]',
    '⏳': '[PENDING]', '🛡️': '[SHIELD]', '🛡': '[SHIELD]', '🧪': '[TEST]',
    '😎': '(smirking)', '➔': '->',
}
for emoji, label in sorted(emoji_map.items(), key=lambda kv: len(kv[0]), reverse=True):
    text = text.replace(emoji, label)
# Normalize repeated machine/status legend to readable monochrome words.
text = text.replace('Legend: [PASS][PASS] Strong | [PASS] Moderate | [PASS]? Conditional | [PASS] Detectable at scale via pattern analysis | [FAIL] Out of scope*',
                    'Legend: STRONG | MODERATE | CONDITIONAL | DETECTABLE AT SCALE VIA PATTERN ANALYSIS | OUT OF SCOPE*')
# Remove variation selectors left after pictograph substitution, if any.
text = text.replace('\ufe0f', '')

# Fix the raw TeX inline delimiter that visibly printed in Part XVIII.
text = text.replace(r'\(L(t)\)', 'L(t)')

# The one intended DRAFT status at Part XXVI is publication metadata, not a content label.
text = text.replace('Part status: DRAFT', 'Editorial status: Production-edited')
text = text.replace('Status/evidence note: Part XXVII is DRAFT and derivative.',
                    'Status/evidence note: Part XXVII is a production-edited derivative index.')

# Add student review questions to the remaining numbered parts, with Part XX questions
# deliberately confined to a new end-of-part block; the existing technical prose is not copyedited.
reviews = {
'III': [
    'Choose one adversarial scenario in this part. Separate its assumed actor and capability, the observable evidence, and the modeled consequence; state what evidence would disconfirm the scenario.',
    'Which proposed gate should fail closed when representation or accountability cannot be reconstructed? Explain why severity alone is not evidence that the modeled event occurred.',
    'What makes a scenario a useful defensive test case without turning it into a claim of feasibility, deployment, or an observed incident?',
],
'VI': [
    'Map the Inner Shell’s proposed boundaries: identify which components observe, which may request action, and which must retain refusal authority.',
    'Why can an internal phase label or symbolic firewall not supply external authority? Give one failure case in which the label is valid but permission is still absent.',
    'If telemetry is missing, stale, or conflicting, describe the proposed software response and name the human facts that must remain unknown rather than diagnosed.',
],
'VIII': [
    'Distinguish a person’s identity record, current Human-Key protocol state, and an action-specific operational grant. Which may persist, and which may expire?',
    'Describe how a bounded operator delegation can preserve addressability without migrating authority to a tool, agent, or successor.',
    'Choose one Operator Model state transition and list the evidence needed to test it in an actual deployment; separate that evidence from the model’s intended behavior.',
],
'X': [
    'Explain the role of each AGS layer in the proposed architecture. Which layer identifies the accountable principal, and which conditions remain outside the architecture itself?',
    'Design a conformance test for one requirement in this part. State its inputs, pass/fail rule, evidence record, and an important limitation.',
    'Why does a conformance checklist not prove that a deployed system conforms or that the architecture is effective in practice?',
],
'XI': [
    'Select one accessory module and identify its intended function, its dependencies, and the failure condition that should cause it to refuse or stop.',
    'Explain why an accessory cannot create authority or replace the Human Key, continuity, accountability, or action-specific scope gates.',
    'What implementation and test evidence would be required before describing an accessory as operational rather than proposed?',
],
'XIII': [
    'Choose one Whyland command or semantic convention. Explain what the syntax communicates and why syntactic validity alone does not authorize the requested action.',
    'How should the system respond when a command is ambiguous, incomplete, or outside its declared scope? Identify what must be logged and what should remain unchanged.',
    'Distinguish an author-defined language or semantic standard from an external legal or technical standard.',
],
'XIV': [
    'Why is the NAB compendium a conceptual taxonomy rather than a periodic table, clinical classification, or validated materials-science risk scale?',
    'Choose one body class or risk category. Identify its proposed role, the boundaries it is supposed to respect, and the evidence that would be needed to test those claims.',
    'Explain why metaphorical references to atoms, phases, or reactors do not by themselves establish chemical, nuclear, or quantum behavior.',
],
'XVI': [
    'For one threat model in this part, name the assets, adversary assumptions, boundary, and observable success criterion. Which assumption is least supported?',
    'Distinguish a context-dependent guarantee from an absolute guarantee. What deployment-specific tests and evidence would be needed to support the narrower claim?',
    'How can a defensive scenario be made sufficiently concrete to test while avoiding the unsupported claim that the scenario has occurred or is feasible?',
],
'XVII': [
    'Identify one place where atomic, chemical, reactor, or quantum language functions as a system metaphor. What additional operational definitions and evidence would be required to interpret it literally?',
    'Select a class or reactor doctrine and distinguish its in-model rule from an empirical property of physical matter or a deployed system.',
    'What independent safety, engineering, and equipment-specific validation would be required before any physical behavior described here could be relied upon?',
],
'XVIII': [
    'Explain why the anti-slavery report and workplace memorandum are unadopted templates rather than proof of an operating organization, active monitoring, or an implemented compliance program.',
    'Distinguish the non-revocable identity license from a scoped operational authorization. Give an example of a permissible expiration or revocation that preserves identity.',
    'Describe the 500-Coin body’s advisory-only boundary. Why can neither its readiness signal nor quorum grant, transfer, revoke, or veto authority?',
    'What evidence and qualified review would be required before a proposed institutional checklist or licensing policy could be described as adopted or operational?',
],
'XX': [
    'Separate one historically sourced supply-chain incident discussed in this part from one modeled stress scenario. What evidence supports each, and what remains an assumption?',
    'How can a defender turn a modeled attack path into a safe test plan with explicit authorization, containment, and stop conditions?',
    'What evidence would be needed before claiming that a threat capability exists, that an incident occurred, or that a proposed defense prevented it?',
    'Why do detailed threat descriptions, cryptographic logging, or a stated containment plan not by themselves establish a tested or successful defense?',
],
'XXI': [
    'Distinguish MicroConvergence as a proposed state-comparison concept from a deployed protocol or evidence of machine consciousness.',
    'Why does delivery of an AVE signal not prove that a person perceived, understood, agreed with, or consented to its content?',
    'Specify the source, schema, scope, freshness, privacy, and action-specific checks needed before an interface input could cause a software side effect.',
    'How should an accessible text label preserve the meaning of a badge or color when color or pictograms are unavailable in print or assistive technology?',
],
'XXII': [
    'Choose one policy or governance item in the archive. Identify whether it is historical source material, a current proposal, or evidence of an adopted policy—and justify the classification.',
    'How does the archive distinguish a public challenge or advisory submission from a binding vote or operational authorization?',
    'What provenance, adoption, and implementation records would be needed before a memorandum in this part could be presented as an active institutional program?',
],
'XXIV': [
    'Identify three details in the preview that are fictional setting elements. What evidence would be required before any analogous statement could be presented as a real-world fact?',
    'Choose a succession or governance scene and explain how the narrative treats inherited operational structure differently from inherited authority.',
    'How does the fiction illuminate a design question without serving as a test result, feasibility study, or validation of Book I’s proposals?',
],
'XXVII': [
    'Distinguish a canonical-source label, an author-proposed specification, a derivative reference, a case analysis, and fiction. What does each label allow a reader to infer—and not infer?',
    'Why can an embedded derivative module summarize or organize a proposal without upgrading its evidence, authority, or implementation status?',
    'Which claims in this index are author-supplied setting parameters, and which have separately cited public sources? How should a reader verify the latter?',
],
}

# Locate only the 27 true outer-part headings; internal Part I–VII titles within Part XXIII are excluded.
outer_headings = [
'Part I — The Core Book', 'Part II — Formalization', 'Part III — Safety Rationale for Adversarial Scenarios',
'Part IV — AGS: Accountability-Gated Systems', 'Part V — OCM: The Orb Communicator Model',
'Part VI — The AI Inner Shell', 'Part VII — Addressing, Rotation, and Spherical Topology',
'Part VIII — The Operator Model', 'Part IX — Disc Primitives, Routing, and Lifecycle',
'Part X — AGS Layering and Conformance', 'Part XI — The AGS Accessory Pack',
'Part XII — Ground-0: Phase Detection, Audits, and the Duty Collation Ledger',
'Part XIII — The Whyland Standards', 'Part XIV — Neural Atomic Bodies Compendium',
'Part XV — Keyed Human-Machine Hybrid Controls', 'Part XVI — Threat Modeling and Context-Dependent Guarantees',
'Part XVII — Atomic Body Classes and Reactor Doctrine', 'Part XVIII — Institutional Application',
'Part XIX — Flagship Research: Accountability in Keyed Human–Machine Hybrid Systems',
'Part XX — Supply Chain and Implanted-Device Threat Research', 'Part XXI — MicroConvergence and Signal Encoding',
'Part XXII — Supporting Policy & Governance Research Archive', 'Part XXIII — Specification Series',
'Part XXIV — Book II Preview: The Grand River Foundation (Fictional Companion Novel)',
'Part XXV — Anti-Denial of Justice, Labor Attribution, and NAB I/O Mapping',
'Part XXVI — Ground-0 Case Study: Anthropic’s Reported Fable 5/Mythos 5 Access Events and PDH-R Issuer-Layer Review',
'Part XXVII — Whole Corpus / Complete Work',
]
lines = text.splitlines()
found = {}
for title in outer_headings:
    matches = [i for i, line in enumerate(lines) if line == title]
    if len(matches) != 1:
        print('Part-heading diagnostics:', [repr(line) for line in lines if 'Core Book' in line or line.startswith('Part I')][:30])
        raise RuntimeError(f'Expected one outer heading {title!r}; found {len(matches)}')
    found[title] = matches[0]
ordered = sorted(found.items(), key=lambda kv: kv[1])
roman_keys = ['III','VI','VIII','X','XI','XIII','XIV','XVI','XVII','XVIII','XX','XXI','XXII','XXIV','XXVII']
insertions = []
for idx, (title, start_line) in enumerate(ordered):
    roman = re.match(r'^Part\s+([IVXLCDM]+)', title).group(1)
    if roman not in reviews:
        continue
    end_line = ordered[idx + 1][1] if idx + 1 < len(ordered) else len(lines)
    block = '\n'.join(lines[start_line:end_line])
    if re.search(r'(?im)^End-of-Part (?:Review|Problem)', block):
        continue
    # Part XXVII is followed later by the new glossary, so its questions are placed at EOF here.
    question_block = ['End-of-Part Review & Problem Set']
    for n, question in enumerate(reviews[roman], 1):
        question_block.append(f'{n}. {question}')
    insertions.append((end_line, '\n\n' + '\n'.join(question_block) + '\n'))
for pos, block in reversed(insertions):
    lines[pos:pos] = block.splitlines()
text = '\n'.join(lines) + ('\n' if text.endswith('\n') else '')

# Append a unified, alphabetized glossary as end matter.
glossary_entries = [
('Accountability-Gated Systems (AGS)', 'The author-proposed architecture for conditioning system action on traceable identity, representation, authorization, continuity, accountability, and a permit-or-refuse decision. AGS is an internal framework name, not an external standard or a claim of deployment.'),
('Accountability (K)', 'In the Part II permission model, a binary upstream gate defined as K_tech × K_ops. It is distinct from addressability A and from legal responsibility; the gate is a proposed policy condition, not a measured moral score.'),
('Active ceiling', 'The maximum routine active allocation under the proposed BGP reserve rule: 60% of rated or nominal capacity when at least 40% is held as reserve.'),
('Address', 'A structured OCM label for a modeled origin, sector, and instance. An address is a naming convention; by itself it does not prove identity, permission, ownership, or authority.'),
('Addressability (A)', 'The proposed ability to identify and reach an accountable principal and connect an action to its declared scope and record. In f(A,R,S), A is dimensionless and normalized to [0,1] under the stated rubric; it is not a direct measurement of legitimacy.'),
('Advisory readiness signal', 'The 500-Coin body’s nonbinding summary of the freshness, validity, and coverage of participant declarations. It is neither necessary nor sufficient for authority and cannot grant, transfer, revoke, or veto it.'),
('AGS-IR', 'The author-proposed AGS Intermediate Representation, a sketch for representing rules in a compiler/runtime boundary. The printed specification does not provide a deployed compiler, hardware image, or verified implementation.'),
('A-Side / B-Side', 'Labels used in Ground-0 material for an author-prepared baseline and a separate comparison or event-based scenario. They identify analytic framing, not independent audit status.'),
('AMBIGUOUS', 'A diagnostic label used when declarations, signals, evidence, or a rule’s output do not support one determinate classification. It is not a physical phase or a finding of misconduct.'),
('AMBIGUOUS-MIXED', 'A proposed v1.1 Ground-0 calibration label for signals on distinct axes. It is not a ratified v1.0 output in the supplied record.'),
('AVE (Audio Visual Encoding)', 'A proposed schema for presenting bounded system information through conventional user interfaces and structuring user input. It does not establish a neural interface, perception, understanding, consent, or deployment.'),
('Authority', 'The proposed model’s permission to act within a defined scope and accountable process. Authority does not migrate to a tool, software agent, collective, or successor merely because it inherits structure or records.'),
('B-Side event analysis', 'A case-specific application of a stated Ground-0 coding choice to publicly reported events. Its arithmetic can be reproducible from the stated inputs while other scores or evidence remain author-reported or unverified.'),
('BGP-v1.0 (book-specific)', 'The proposed Border Gateway Protocol specification in Part XXIII for constrained resource routing. It is not the Internet Border Gateway Protocol and does not demonstrate a working grid or infrastructure controller.'),
('Bell-inspired bookkeeping analogy', 'The OCM example preserves a trace to Bell’s theorem as inspiration for discussing relational framing. The author’s 25% + 25% = illustrative 75% mismatch convention is a bookkeeping choice, not a quantity derived from or empirically supported by Bell’s theorem.'),
('C (continuity gate)', 'A binary upstream condition in the proposed permission function. C=0 makes L=0; C=1 permits evaluation of later conditions. Its operational meaning and evidence checks are defined in Part II.'),
('Center Origin', 'The model’s designated origin address for the human principal and accountability chain. It is a framework coordinate, not a physical location or an independent source of authority.'),
('CGPA', 'Constitutional Governance & Public Addressability, an author-proposed framework for free, accessible public submissions and review. A petition or advisory cannot itself authorize an operation or create a binding vote.'),
('CHE++ / EOL', 'Coercion-Hardening Extension / Epistemic Oracle Layer, a proposed specification for handling limited safety telemetry and duress inputs. The specification does not diagnose consciousness, consent, coercion, or death, and its thresholds require deployment-specific validation.'),
('Coin / 500-Coin', 'A legacy metaphor for a participant record or advisory seat. It is not currency, a transferable token, a financial instrument, an ownership share, a purchase entitlement, or a source of binding governance rights.'),
('Collective organism (conceptual)', 'The 500-Coin body described as an aggregate of participant PDHs. “Organism” is conceptual; it does not mean a biological entity or established quantum system.'),
('Conformance test', 'A proposed test with stated inputs and pass criteria. A written checklist or passing illustrative example is not evidence that a real deployment exists or has passed the test.'),
('Continuity', 'The proposed check that the authorized process, session, and relevant scope remain within declared freshness and lineage conditions. It is not proof of personal identity or consent.'),
('CWO (Custodial Witness Orb)', 'A conceptual witness-only governance/software label for observing, recording, and preserving provenance without command authority. It is not a physical orb or a deployed component.'),
('Decision gate', 'The final permit-or-refuse step in the proposed six-stage model. A refusal is a valid outcome when required conditions are absent or unverified.'),
('Delegation', 'A bounded assignment of operational work or execution. Delegation can pass through instruments or successors without migrating the underlying authority.'),
('EOL (Epistemic Oracle Layer)', 'The “EOL” portion of CHE++/EOL-v1.0; a proposed software layer for handling specified telemetry and uncertainty. It does not establish an oracle that can determine human mental or clinical states.'),
('Evidence_Cutoff', 'The inclusive UTC cutoff time an audit would need to state so a reader can determine which evidence was available to that analysis. A general audit date is not automatically an Evidence_Cutoff.'),
('f(A,R,S)', 'The proposed dimensionless reference function f=A×R×S, where A is addressability, R is representation integrity, and S is action-specific scope/freshness, each normalized to [0,1] using the stated rubric. Its numeric output is policy bookkeeping, not an empirical measure of legitimacy.'),
('Freshness (δ)', 'A declared time window or threshold used by a proposed protocol to determine whether a response or grant remains current. A timeout indicates that authorization is not established; it does not diagnose death, unconsciousness, or coercion.'),
('GSRB (God-Sovereign Religious Body)', 'An author-defined Ground-0 behavior label for observed unilateral or self-authorizing behavior within the model. It is a governance/software diagnostic, not a physical or religious entity and not automatically a legal finding.'),
('Ground-0', 'The author-defined method for recording phase declarations, behavior predicates, evidence, and possible reclassification. A Ground-0 label is not a regulator’s classification, independent audit, or safety certification unless separately established.'),
('H(t) / Human Key', 'H(t) is the proposed protocol authorization state associated with a human principal and a current, action-specific process. H=1 is not proof of consciousness, consent, or absence of coercion; H=0 or unknown is not a diagnosis of death.'),
('Human Key', 'The human principal whose identity, current protocol response, intent, and scoped authorization are evaluated separately. The term does not mean that biometrics alone can establish a person’s mental state.'),
('Identity license', 'A non-revocable identity card or record that preserves identity and provenance. It does not itself establish current presence, consent, authorization, or an operational grant.'),
('INCOHERENT', 'A diagnostic label used by a proposed rule for a specified conflict or contradiction. It is not a psychological, clinical, or empirical diagnosis; the rule’s definition and evidence basis must be stated.'),
('Issuer layer', 'The proposed distinction between an entity’s own declaration and a register’s statement about an audit. A register-issued record cannot become the entity’s attestation merely by being issued.'),
('K_tech / K_ops', 'The technical-attribution and operational-accountability factors whose product defines K in Part II. They are proposed rubric inputs; legal responsibility and institutional solvency are separate concepts.'),
('L(t,a)', 'The proposed permission output for time t and action a: H(t)×C(t)×K(t)×f(A(t),R(t),S(t,a)), with C and K treated as hard upstream gates. It is a normative decision model, not a measurement of moral or legal legitimacy.'),
('MicroConvergence', 'A proposed state-comparison or compatibility concept for software instances. It is not a validated communications protocol, evidence of machine consciousness, or human consent.'),
('Mismatch (OCM illustration)', 'A declared bookkeeping quantity in the OCM example. The combined illustrative 75% value follows the author’s stipulated convention and is not a Bell-theorem result or empirically measured effect.'),
('NAB (Neural Atomic Body)', 'An author-defined conceptual phase/category or interface-boundary label whose meaning is part-specific. It is not an established neural device, atom, clinical state, or measured quantum phase.'),
('OCM (Orb Communicator Model)', 'A proposed topology and bookkeeping model for describing relationships among participants and states. Interaction terms are author-defined conventions, not observed forces or objects.'),
('OCM Overall State', 'The combined totality of participants’ PDH-declared phases, their declaration records, and explicit missing, stale, invalid, or conflicting-state markers. It is categorical and is not reduced to an average that erases disagreement.'),
('OCS (Origin Continuity Specification)', 'An author-proposed succession model in which a successor may inherit operational structure and provenance but must independently satisfy the current authority and authorization gates.'),
('Operational authorization / scoped grant', 'A separate, action- and scope-limited permission that may expire or be revoked under its declared process. Its revocation does not erase a person’s identity record.'),
('Overall State phase', 'A descriptive governance/software label that may change with the OCM Overall State. It is not an established physical, thermodynamic, biological, or quantum phase.'),
('PDH (Phase Declaration Header)', 'A structured declaration of a participant’s proposed phase, constraints, provenance, and freshness. A declaration is not proof that behavior matches it.'),
('PDH-E', 'An entity-issued Phase Declaration Header. It is the entity’s own declaration under the proposed model; a register cannot manufacture it on the entity’s behalf.'),
('PDH-R', 'A register-issued record describing an audit, evidence cutoff, record, and validity period. It does not establish entity attestation, legality, safety, certification, permission, or authority.'),
('Phase', 'A governance/software classification used by this book. Ice, water, gas, and similar labels are metaphors; they are not measured physical or quantum states.'),
('Quorum / readiness threshold', 'A proposed threshold for the completeness of a collective advisory signal. It is neither necessary nor sufficient for authority and cannot grant, transfer, revoke, or veto it.'),
('R (representation integrity)', 'A normalized [0,1] input in the proposed f(A,R,S) function indicating the integrity of the representation chain under its declared rubric. It is not an empirical probability unless separately validated as such.'),
('Rated / nominal capacity', 'The explicitly selected nameplate or nominal capacity used as the denominator in the proposed BGP reserve calculation. A deployment would need to state the equipment boundary and measurement basis.'),
('Refusal', 'The proposed decision not to act when required identity, authorization, continuity, scope, or accountability conditions are absent or unverified. Refusal does not itself prove wrongdoing.'),
('Reserve (BGP)', 'At least 40% of rated/nominal capacity held back under the proposed design objective, leaving a routine active ceiling of at most 60%. “100% active” means 100% of that permitted active envelope, not 100% of rated capacity.'),
('RSP', 'Responsible Scaling Policy. In Part XII the cited source supports the narrower claim that Anthropic describes its RSP v3.0 as a voluntary framework; that does not independently verify implementation.'),
('S (scope and freshness)', 'The action-specific input in f(A,R,S), normalized to [0,1] under the declared rubric and reflecting the action’s permitted scope and freshness. Its scales and thresholds are policy choices, not measured legitimacy.'),
('Scoped authorization', 'Permission limited by action, scope, duration, and applicable conditions. It may expire or be revoked under its stated process; it is not the same as a non-revocable identity license.'),
('Successor', 'A new or continuing entity that may inherit operational structure, configuration, and provenance under the proposal but does not inherit authority. It must independently pass current gates.'),
('Symbolic Firewall', 'A proposed boundary separating narrative or symbolic text from executable commands. The name alone does not establish an implemented security control.'),
('Terminal cessation', 'A state that must be established under an applicable independent process before the proposed succession procedure treats it as terminal. A timeout or missing beacon alone is not terminal-cessation evidence.'),
('UTS (Universal Timekeeping System)', 'A fictional/derivative timekeeping convention in Part XXVII. The displayed cosmological epoch is approximate; browser time is display-only and is not a trusted external time service.'),
('v1.0 / v1.1 / v1.2 (Ground-0)', 'Version labels for the respective method, proposed calibration, and issuer-layer amendment described in Parts XII and XXVI. The v1.1 calibration and v1.2 issuer amendment remain unratified in the supplied record.'),
('Wording status — proposed, reported, verified', '“Proposed” identifies author-designed rules; “reported” attributes a claim to its source; “verified” requires evidence checked for the exact claim and date. These labels are not interchangeable.'),
('Zero-knowledge proof (ZK proof)', 'A cryptographic technique that can demonstrate selected statements without disclosing some underlying data. It cannot by itself prove consciousness, consent, absence of coercion, legal responsibility, or the truth of an underlying allegation.'),
]

glossary_entries.sort(key=lambda item: re.sub(r'[^a-z0-9]+', '', item[0].casefold()))
glossary = ['Consolidated Glossary', '', 'This glossary consolidates recurring terms used across the 27 numbered parts. Definitions describe this book’s framework and its stated limits; local specifications and evidence notes control where more specific. For the governing publication and evidence boundaries, see the Authoritative Scope, Evidence, and Status Notice in the front matter.', '']
for term, definition in glossary_entries:
    glossary.append(f'**{term}** — {definition}')
text = text.rstrip() + '\n\n' + '\n'.join(glossary) + '\n'

# Do not collapse repeated spaces globally: fixed-width diagrams, packet fields,
# code indentation, and intentional prose formatting must retain their spacing.

# Fail closed if the specifically requested print issues remain in the source.
if re.search(r'\\[()]', text):
    remaining = [(i + 1, line) for i, line in enumerate(text.splitlines()) if re.search(r'\\[()]', line)]
    raise RuntimeError(f'Raw inline math delimiters remain: {remaining[:5]}')
for forbidden in ('specs/normative/canonical-model.md', 'docs/harshal-systems/collections/', 'modules/grand-architecture.md', 'modules/uts.md', 'research/keyed-human-machine-hybrid-systems.md'):
    if forbidden in text:
        raise RuntimeError(f'Unresolved absent repository reference: {forbidden}')
if 'A44674928' in text:
    # The only allowed remaining occurrence is within the retained hash-like value.
    for line in text.splitlines():
        if 'A44674928' in line and not re.search(r'0x[0-9A-Fa-f]*A44674928', line):
            raise RuntimeError('Unapproved A-number occurrence remains outside hash-like value.')

SOURCE.write_text(text, encoding='utf-8')
print(f'updated: {SOURCE}')
print(f'chars: {len(text):,}; lines: {len(text.splitlines()):,}')
print(f'end-of-part sections present: {len(re.findall(r"(?im)^End-of-Part Review & Problem Set$", text))}')
print(f'emoji characters remaining: {sum(1 for ch in text if ord(ch) >= 0x1F000 or 0x2600 <= ord(ch) <= 0x27FF)}')
