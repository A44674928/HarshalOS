#!/usr/bin/env python3
"""One-time, assertion-checked corrections after review of the production pass.
Only the working copy is touched; the source master and the production-pass
baseline remain available for audit.
"""
from pathlib import Path
import hashlib

ROOT = Path('/home/user')
TARGET = ROOT / 'HARSHAL-SYSTEMS-Book-I-EDITED-2026-10-06.txt'
BASELINE = ROOT / 'HARSHAL-SYSTEMS-Book-I-PRODUCTION-PASS-2026-10-06-BASELINE.txt'
EXPECTED_BASELINE_SHA256 = 'e1d32605a87ca46780733d07e9be78db14fe9aca21f0212e7e1873e004c4ed36'
if not TARGET.exists() or not BASELINE.exists():
    raise SystemExit('Required working copy or saved production-pass baseline is missing.')
if hashlib.sha256(BASELINE.read_bytes()).hexdigest() != EXPECTED_BASELINE_SHA256:
    raise SystemExit('Production-pass baseline hash mismatch; refusing to proceed.')
text = TARGET.read_text(encoding='utf-8')

# Correct edition-facing descriptions and retain the explicit Part XX boundary.
replacements = [
    ('Includes a plain-language reader orientation, updated public-source citations, worked examples, student review questions in all 27 numbered parts, and a consolidated glossary.',
     'Includes a plain-language reader orientation, updated public-source citations, worked examples, student review questions in Parts I–XIX and XXI–XXVII, and a consolidated glossary. Part XX is unchanged under the preservation instruction.'),
    ('With a plain-language orientation, worked examples, review questions in all 27 numbered parts, and a consolidated glossary',
     'With a plain-language orientation, worked examples, review questions in Parts I–XIX and XXI–XXVII, and a consolidated glossary'),
    ('Each numbered part ends with student review questions; selected worked examples appear in the relevant parts.',
     'Student review questions appear at the end of Parts I–XIX and XXI–XXVII; Part XX is retained without editorial additions under the preservation instruction. Selected worked examples appear in the relevant parts.'),
    ('This document outlines the proposed governance, security, and intellectual-property rules for Harshal’s Systems (formerly AGS), including human-key checks for critical actions.',
     'This document outlines the proposed governance, security, and intellectual-property rules for Harshal’s Systems, using AGS as the current framework name, including human-key checks for critical actions.'),
    ('Publishing Principle: Book I is the project’s working reference corpus; Book II is its fictional companion in production.',
     'Publishing Principle: Book I is the project’s reference corpus; Book II is its fictional companion in production.'),
    ('This is a working draft of a framework, not a published standard, certified product, legal opinion, clinical protocol, or independent audit.',
     'This Production Edition presents a proposed framework; it is not a published external standard, certified product, legal opinion, clinical protocol, or independent audit.'),
    ('All 27 numbered parts have been edited for this Production Edition.',
     'This Production Edition presents 27 numbered parts.'),
    ('Thematic navigation: Use the\nFunctional Collections Index to browse the\ncorpus by topic.',
     'Thematic navigation: Use the Contents and Part XXVII’s corpus synthesis to browse this volume by topic.'),
    ('5. Functional Collections Index ()\n\n5. Complete Corpus Manifest (Front Matter + Parts I–XXVII + Glossary)',
     '5. Complete Corpus Manifest (Front Matter + Parts I–XXVII + Glossary)'),
    ('The repository implementation is documented in updates/2026-10-02/02-Frameworks/Universal-Timekeeping-System/UTS-Specification.md and UTS-Conversion-Guide.md; the generator is uts_generator.py; the HarshalOS Home Screen watch and duration converter are implemented in js/uts.js and js/apps-uts.js. The original author-supplied RTF files remain preserved as source material; where their former arithmetic or UD shorthand conflicts with the corrected definitions above, use the corrected Markdown specification. Browser conversion output is rounded floating-point display, not scientific-grade arbitrary precision.',
     'Implementation boundary: No repository, generator, browser application, or source RTF files are reproduced in this print volume. The corrected definitions and arithmetic examples above are the complete in-book record; they do not establish a deployed implementation. Any separately implemented browser conversion would require appropriate precision analysis.'),
    ('Boundary. GA is FICTION (NARRATIVE_SANDBOX) with DERIVATIVE_BUILD arithmetic anchors. It\nis not an engineering design, feasibility finding, water-rights analysis, environmental review,\npermit, construction schedule, procurement plan, or claim that any described work exists, is\nauthorized, or can be built. No GA statement is normative: nothing here enters\n, and GA confers no authority,\nidentity, or production capability on anything.',
     'Boundary. GA is FICTION (NARRATIVE_SANDBOX) with DERIVATIVE_BUILD arithmetic anchors. It\nis not an engineering design, feasibility finding, water-rights analysis, environmental review,\npermit, construction schedule, procurement plan, or claim that any described work exists, is\nauthorized, or can be built. No GA statement is normative or part of the formal Book I\nspecifications; GA confers no authority, identity, or production capability on anything.'),
    ('4. GA-INV-004 — Provenance precedence. Every GA claim carries a provenance class. No GA\nstatement is promoted to , to the kernel, or to a production control.',
     '4. GA-INV-004 — Provenance precedence. Every GA claim carries a provenance class. No GA\nstatement is promoted to a normative specification, to the kernel, or to a production control.'),
    ('10. Implementation in this repository\nThe Grand Architecture reference module is reproduced in this section.\njs/grand-architecture-data.js — the source package describes layer/invariant data and a cross-check against its canonical numbers card. The cited test path is an author-supplied pointer; this manuscript does not independently run or verify it.\njs/apps-grand.js and css/grand-architecture.css — the read-only Grand Architecture\ndesktop app. It writes no ledger row, changes no state, and calls no HOS authority capability.\nupdates/2026-10-02/ — the source package, its\ncontinuity notes, and the fictional quantity anchors.',
     '10. Implementation boundary\nThis print volume reproduces the fictional architecture as reference text only. It includes no repository, executable application, test suite, permit, feasibility analysis, or independent audit, and it makes no deployment claim.'),
]
for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'Expected exactly one match ({count}) for: {old[:140]!r}')
    text = text.replace(old, new, 1)

# Remove the review set the production pass appended to protected Part XX.
review_block = '''\n\nEnd-of-Part Review & Problem Set\n1. Separate one historically sourced supply-chain incident discussed in this part from one modeled stress scenario. What evidence supports each, and what remains an assumption?\n2. How can a defender turn a modeled attack path into a safe test plan with explicit authorization, containment, and stop conditions?\n3. What evidence would be needed before claiming that a threat capability exists, that an incident occurred, or that a proposed defense prevented it?\n4. Why do detailed threat descriptions, cryptographic logging, or a stated containment plan not by themselves establish a tested or successful defense?\n'''
if text.count(review_block) != 1:
    raise SystemExit('Expected exactly one production-pass review block at the end of protected Part XX.')
text = text.replace(review_block, '\n', 1)

# Publish only after every scoped match has been checked.
TARGET.write_text(text, encoding='utf-8')
print('updated:', TARGET)
print('chars:', len(text), 'lines:', text.count('\n') + 1)
