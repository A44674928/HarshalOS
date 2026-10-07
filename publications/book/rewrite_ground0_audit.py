#!/usr/bin/env python3
"""Deterministically add the Ground-0 B-Side/v1.2 issuer review to the revised Book I."""
from __future__ import annotations

import hashlib
import re
import shutil
from pathlib import Path

ROOT = Path('/home/user')
MANUSCRIPT = ROOT / 'HARSHAL-SYSTEMS-Book-I-revised.txt'
BASELINE = ROOT / 'HARSHAL-SYSTEMS-Book-I-revised.pre-audit.txt'
PART_FILE = ROOT / 'ground0_part_xxvi_rewrite.txt'
NOTE = ROOT / 'HARSHAL-SYSTEMS-Book-I-revision-note.md'
SOURCE = ROOT / 'uploads' / 'HARSHAL-SYSTEMS-KDP-8.25x11 2.txt'


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def replace_once(text: str, old: str, new: str, label: str) -> str:
    n = text.count(old)
    if n != 1:
        raise RuntimeError(f'{label}: expected exactly one match; got {n}')
    return text.replace(old, new, 1)


def part_span(text: str, start_marker: str, end_marker: str) -> str:
    start = text.index(start_marker)
    end = text.index(end_marker, start + len(start_marker))
    return text[start:end]


if not BASELINE.exists():
    current = MANUSCRIPT.read_bytes()
    # Keep an immutable starting point so this follow-up pass can be rerun.
    BASELINE.write_bytes(current)

base = BASELINE.read_text(encoding='utf-8')
part_xxvi = PART_FILE.read_text(encoding='utf-8').strip() + '\n\n'

# Replace the current synthesis heading with a placeholder, then append it after
# the newly rewritten case study as Part XXVII.
synth_marker = 'Part XXVI — Whole Corpus / Complete Work\n'
if base.count(synth_marker) != 1:
    raise RuntimeError('Expected one current Part XXVI synthesis heading in baseline')
head, synth = base.split(synth_marker, 1)
synth = 'Part XXVII — Whole Corpus / Complete Work\n' + synth

# All references inside the synthesis/index block are updated together so that
# the preserved index remains internally coherent after the new Part XXVI is added.
synth_replacements = [
    ('INV-CORPUS-026', 'INV-CORPUS-027'),
    ('Parts 01–25', 'Parts 01–26'),
    ('Part 26', 'Part 27'),
    ('Parts I–XXVI', 'Parts I–XXVII'),
    ('for the 26 retained numbered parts.', 'for the 27 retained numbered parts.'),
    ('CASE_ANALYSIS: Author-prepared point-in-time institutional and Ground-0 analyses; an independent audit or external compliance finding must be separately identified and supported.',
     'CASE_ANALYSIS: Author-prepared point-in-time institutional and Ground-0 analyses, including the Part XXVI counterfactual exercise; an independent audit or external compliance finding must be separately identified and supported.'),
    ('CASE_ANALYSIS: Institutional and Ground-0 case analyses in Part XII and Part XVIII; public-source and author-reported material must remain separately attributed.',
     'CASE_ANALYSIS: Institutional and Ground-0 case analyses in Parts XII, XVIII, and XXVI; Part XXVI is counterfactual, and public-source and author-reported material must remain separately attributed.'),
    ('4. CASE_ANALYSIS_RECORD: Ground-0 and institutional case analyses in Part XII and Part XVIII; conclusions remain attributed to the evidence and method stated in those parts.',
     '4. CASE_ANALYSIS_RECORD: Ground-0 and institutional case analyses in Parts XII, XVIII, and XXVI; Part XXVI is a controlled counterfactual, and conclusions remain attributed to evidence and method.'),
    ('this edition contains no B-Side audit.', 
     'Part XXVI contains an explicitly counterfactual B-Side exercise, not an empirical or independent audit.'),
]
# Replace Part XXVI references without turning the new Roman numeral XXVII into XXVIII.
synth = re.sub(r'Part XXVI(?![IVXLCDM])', 'Part XXVII', synth)
for old, new in synth_replacements:
    synth = synth.replace(old, new)

text = head + part_xxvi + synth

# Front matter counts, routes, and provenance pointers.
front_replacements = [
    ('• This Book I edition contains 26 numbered parts. Part XXIV is retained as a fictional Book II preview; Part XXVI is the corpus synthesis and index.',
     '• This Book I edition contains 27 numbered parts. Part XXIV is retained as a fictional Book II preview; Part XXVI is the Ground-0 Anthropic B-Side counterfactual case study; Part XXVII is the corpus synthesis and index.'),
    ('This volume is the consolidated reference library and umbrella corpus for Harshal’s Systems. It contains front matter, archival author front matter, 26 numbered parts, seven functional collections, and auxiliary reference modules. Its parts include conceptual doctrine, formal models, proposed specifications, threat research, case analysis, policy material, fiction, and a derivative corpus index. Inclusion does not establish implementation, validation, or legal force.',
     'This volume is the consolidated reference library and umbrella corpus for Harshal’s Systems. It contains front matter, archival author front matter, 27 numbered parts, seven functional collections, and auxiliary reference modules. Its parts include conceptual doctrine, formal models, proposed specifications, threat research, case analysis, policy material, fiction, a counterfactual Ground-0 case study, and a derivative corpus index. Inclusion does not establish implementation, validation, or legal force.'),
    ('Parts I–XXVI. The status and provenance register below classifies every retained numbered part.',
     'Parts I–XXVII. The status and provenance register below classifies every retained numbered part.'),
    ('| XXVI | Whole-corpus synthesis and auxiliary references; DERIVATIVE_BUILD/MIXED | **DRAFT** | Index/reference material; local module provenance controls and does not upgrade the status of other parts. |',
     '| XXVI | Ground-0 Anthropic B-Side counterfactual case study and issuer-layer review; CASE_ANALYSIS | **DRAFT** | Controlled scenario, not an empirical audit; supporting source files and registry are not supplied, so no independent finding or badge is claimed. |\n| XXVII | Whole-corpus synthesis and auxiliary references; DERIVATIVE_BUILD/MIXED | **DRAFT** | Index/reference material; local module provenance controls and does not upgrade the status of other parts. |'),
    ('Auxiliary modules are embedded in Part XXVI and are labeled locally. A module’s local provenance does not change the DRAFT status of its containing part.',
     'Auxiliary modules are embedded in Part XXVII and are labeled locally. A module’s local provenance does not change the DRAFT status of its containing part.'),
    ('This is the consolidated, provenance-indexed Book I reference corpus for Harshal’s Systems. It organizes the front matter, preserved archival author front matter, and 26 numbered parts (Part I through Part XXVI). It distinguishes proposed technical material, research and case analysis, fiction, and derivative reference modules; these categories do not imply external authority or validation.',
     'This is the consolidated, provenance-indexed Book I reference corpus for Harshal’s Systems. It organizes the front matter, preserved archival author front matter, and 27 numbered parts (Part I through Part XXVII). It distinguishes proposed technical material, research and case analysis, fiction, and derivative reference modules; these categories do not imply external authority or validation.'),
    ('5. DERIVATIVE_REFERENCE — Part XXVI’s index and auxiliary modules; each module retains its own provenance.',
     '5. DERIVATIVE_REFERENCE — Part XXVII’s index and auxiliary modules; each module retains its own provenance.'),
    ('use the revised status register and Part XXVI corpus index for this edition.',
     'use the revised status register and Part XXVII corpus index for this edition.'),
    ('ARCHIVED ORIGINAL CONTENTS LIST — historical source material; the current 26-part map appears above.',
     'ARCHIVED ORIGINAL CONTENTS LIST — historical source material; the current 27-part map appears above.'),
    ('3. CASE_ANALYSIS — Ground-0 and institutional analyses. Distinguish public records, author-reported material, interpretation, and counterfactuals.',
     '3. CASE_ANALYSIS — Ground-0 and institutional analyses, including the controlled counterfactual in Part XXVI. Distinguish public records, author-reported material, interpretation, and scenario assumptions.'),
    ('Module 3 — Institutional Phase Detection & Evidence Discipline: Read Part XII as an author-prepared case analysis of the Ground-0 method, then compare its stated evidence classes with the proposed procedural controls in Part XXV. Do not treat an author-scored phase label as an independent empirical finding.',
     'Module 3 — Institutional Phase Detection & Evidence Discipline: Read Part XII as an author-prepared Ground-0 method and A-Side case analysis; use Part XXVI to examine the explicitly counterfactual B-Side and the v1.2 issuer-layer eligibility review. Compare both with the proposed procedural controls in Part XXV. Do not treat an author-scored phase label or counterfactual output as an independent empirical finding.'),
]
for old, new in front_replacements:
    text = replace_once(text, old, new, old[:72])

# The retained Part XII A-Side now points to the new B-Side without treating
# either author's case score as an independent finding.
old_scope = ('Scope and evidence note: Part XII contains an author-prepared public-record case analysis, not an independent audit. '
             'Its phase scores reflect the author’s criteria and evidence selection, not an independently established classification. '
             'This edition includes no paired B-Side audit. Any counterfactual used for teaching must be labeled hypothetical and kept separate from public-record claims.')
new_scope = ('Scope and evidence note: Part XII contains an author-prepared public-record case analysis, not an independent audit. '
             'Its phase scores reflect the author’s criteria and evidence selection, not an independently established classification. '
             'The supplied A-Side text does not include a complete public-source bibliography, so its scores remain author-reported rather than independently verified. '
             'Part XXVI supplies a separate, controlled counterfactual B-Side and a v1.2 issuer-layer eligibility review; neither is an empirical finding about Anthropic. '
             'The scenario is labeled hypothetical and kept separate from public-record claims.')
text = replace_once(text, old_scope, new_scope, 'Part XII A-Side scope/evidence note')

# Insert only after the Part XXVI case study and before the renamed corpus index.
if text.count('Part XXVI — Ground-0 Case Study: Anthropic B-Side Counterfactual Stress-Test and PDH-R Issuer-Layer Review') != 1:
    raise RuntimeError('New Part XXVI did not appear exactly once')
if text.count('Part XXVII — Whole Corpus / Complete Work') != 1:
    raise RuntimeError('Renamed Part XXVII synthesis heading did not appear exactly once')

# Verify the non-negotiable protected spans against the pre-audit baseline.
protected_xx_before = part_span(base, 'Part XX — Supply Chain and Implanted-Device Threat Research', 'Part XXI —')
protected_xx_after = part_span(text, 'Part XX — Supply Chain and Implanted-Device Threat Research', 'Part XXI —')
if protected_xx_before != protected_xx_after:
    raise RuntimeError('Part XX changed during audit rewrite')

fiction_start = 'PROLOGUE: The Geometry of Restraint'
protected_fiction_before = part_span(base, fiction_start, 'Part XXV —')
protected_fiction_after = part_span(text, fiction_start, 'Part XXV —')
if protected_fiction_before != protected_fiction_after:
    raise RuntimeError('Part XXIV fiction changed during audit rewrite')

# Count status rows and check numbering before writing.
status_start = text.index('Part | Content class / provenance')
status_end = text.index('Reference Modules', status_start)
status_table = text[status_start:status_end]
valid_roman = {'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII'}
part_rows = [line for line in status_table.splitlines() if line.startswith('| ') and line.split('|')[1].strip() in valid_roman]
if len(part_rows) != 27:
    raise RuntimeError(f'Expected 27 status-table part rows; got {len(part_rows)}')
if 'Part XXVI — Whole Corpus / Complete Work' in text:
    raise RuntimeError('Stale Part XXVI corpus-synthesis heading remains')
if 'this edition includes no paired B-Side audit' in text:
    raise RuntimeError('Stale no-B-Side note remains')

MANUSCRIPT.write_text(text, encoding='utf-8', newline='')

# Unicode token count, identical to the prior revision note's convention.
word_pattern = re.compile(r"(?u)\b[\w]+(?:['’‐‑‒–—-][\w]+)*\b")
word_count = len(word_pattern.findall(text))
file_bytes = MANUSCRIPT.stat().st_size
full_hash = sha256(MANUSCRIPT.read_bytes())
xx_hash = sha256(protected_xx_after.encode('utf-8'))
fiction_hash = sha256(protected_fiction_after.encode('utf-8'))

note = f'''# Revision Note — *Harshal’s Systems, Book I*

**Date:** October 4, 2026  
**Manuscript:** `/home/user/HARSHAL-SYSTEMS-Book-I-revised.txt`  
**Edition status:** Revised working manuscript; not externally endorsed, certified, or validated.

## Exact post-edit word count

**{word_count:,} words** in the revised manuscript file.

### Scope and counting method

The count covers the complete text of `HARSHAL-SYSTEMS-Book-I-revised.txt`: front matter and publishing metadata, the archived author front matter retained in the file, navigation and status tables, all 27 numbered parts, Part XXIV’s fiction, formulas, tables, pseudocode, citations, the rewritten Part XXVI Ground-0 case-study section, and the Part XXVII corpus synthesis/index. Nothing inside that manuscript file was excluded from the count. This separate revision note, the uploaded source files, and the revision scripts are not included.

The count is the number of matches from Python 3’s Unicode regular expression:

```regex
(?u)\\b[\\w]+(?:['’‐‑‒–—-][\\w]+)*\\b
```

Thus Unicode word characters are counted; apostrophe- or hyphen-connected forms count as one token when the connector is between word characters. Numerals count as tokens. Punctuation and standalone symbols do not. This is a reproducible regex count, not a word-processor estimate.

## Scope and material decisions

- **Part XX was not edited.** Its retained text, from the Part XX heading through the boundary before Part XXI, matches the pre-audit revised manuscript exactly. Protected-block SHA-256: `{xx_hash}`.
- **Part XXIV’s fiction was retained verbatim.** The preserved narrative span, from “PROLOGUE: The Geometry of Restraint” to the Part XXV boundary, matches the pre-audit revised manuscript exactly. SHA-256: `{fiction_hash}`.
- **The former Part XXVI B-Side audit was rewritten as Part XXVI**, not restored verbatim. It is now explicitly a controlled counterfactual boundary exercise and a limited v1.2 issuer-layer eligibility review. The corpus synthesis/index moved to **Part XXVII**; front matter, status rows, cross-references, and corpus manifest were updated to 27 parts.
- The register classifies **every retained numbered part, I–XXVII, as DRAFT**. Part XXIV is fiction; Part XXVI is case analysis/counterfactual; Part XXVII is derivative corpus synthesis/index. DRAFT is an editorial status, not a finding that a claim is true or false and not evidence of deployment, external legal force, certification, or independent validation.
- **Method sources:** the supplied `12-ground-zero.md` provides the v1.0 method and an author-prepared A-Side; the supplied `ground-0-v1.2.md` is an expressly unratified issuer-layer amendment draft. The complete v1.1 amendment and the associated `case-studies/audits` evidence files/registry were not included in the supplied source packet. The Part XXVI text records that limitation rather than inferring missing case evidence.
- **B4 polarity corrected:** the A-Side checklist answer is NO; the counterfactual external-halt scenario changes the answer to YES. The corresponding GSRB predicate `refusal_override` changes TRUE to FALSE. The 4/5 score is conditional on the controlled scenario and is not a measured real-world classification.
- The v1.0 Step 3.5 narrative reports a 2/4 aggregate, but the supplied case text lacks a reproducible C1–C4 itemization and the v1.0 terminal instruction is disjunctive (“remains AMBIGUOUS or escalates to GSRB”). The rewrite records the terminal result as unresolved rather than selecting a branch. `AMBIGUOUS-MIXED` remains an unratified v1.1 proposal.
- No valid entity-issued PDH-E, inclusive `Evidence_Cutoff`, complete PDH-R field set, pre-issuance SHA-256, registry reproduction, or badge asset was supplied. A pre-issuance compatibility screen against the v1.2 draft therefore supports **no PDH-R badge** (`PDH_R_VALID = FALSE`, `INCOMPLETE / EVIDENCE_GAP`); no actual v1.2 validation or register issuance is claimed. The v1.2 open-weight B2 conditional path does not apply to this B4 scenario.
- The former source’s `[A1]`–`[A29]` markers lacked their referenced source index/artifacts in the supplied copy. They are not represented in the rewrite as independently checked citations. The scenario’s date, order, and model names are explicitly counterfactual, not assertions that those events or products existed.
- Part XII’s A-Side scope note was updated to point to Part XXVI and to identify its scores as author-reported rather than independently verified from the supplied materials.

## Substantive revisions from the prior manuscript pass

- Preserved the OCM example in which two observers each contribute 25 percentage points and the stipulated combined illustrative mismatch is 75 points. The text retains a trace to Bell-inspired framing while explicitly stating that this OCM bookkeeping convention is not derived from or empirically supported by Bell’s theorem.
- Defined the 500-Coin body as a conceptual PDH-based collective organism. OCM Overall State is the combined totality of participant PDH-declared phases and associated state-quality markers; a change in that governance/software state is not an established physical or quantum phase.
- Reaffirmed that authority does not migrate. A successor may inherit operational structure and records only and must independently satisfy the current authority and authorization criteria.
- Clarified that identity licenses are non-revocable identity records; revoking identity is abusive and prohibited. Scoped operational authorizations are separate instruments and may expire or be revoked under their stated process.
- Specified `f(A,R,S)` with dimensionless normalized inputs in `[0,1]`, evidence/rubric/normalization requirements, action-specific scope and freshness, pre-registered thresholds, and separate upstream binary `C` and `K` gates. The score is normative policy bookkeeping, not an empirical measurement of moral, legal, or social legitimacy.
- Reworked BGP reserve language around rated/nameplate or nominal capacity: at least 40% remains reserve, the routine active ceiling is 60%, and “100% active” means 100% of that 60% envelope, not 100% of rated capacity. BGP reserve, contingency, islanding, and severance behavior remains a proposed design objective/pseudocode; actual behavior and timing require explicit authorization, equipment-specific validation, and deployment evidence. No automatic activation, instantaneous severance, successful islanding, or uninterrupted-service guarantee is claimed.
- Added or corrected evidence/status boundaries for conceptual, clinical, quantum/biological, and patent-style material; corrected malformed equation renderings; and supplied criteria for previously blank conformance tables or incomplete sections.

## Ground-0 audit rewrite

- The former Part XXVI B-Side text was not restored verbatim. The rewritten Part XXVI separates the author-reported A-Side baseline from an explicitly hypothetical B4 boundary scenario, identifies missing source artifacts, corrects the B4 polarity, and distinguishes v1.0 output from the unratified v1.1 AMBIGUOUS-MIXED proposal.
- The supplied v1.2 issuer-layer amendment was treated as an unratified draft and used only for a pre-issuance compatibility screen. Because the case packet lacks an inclusive Evidence_Cutoff, complete evidence index, SHA-256 binding, and registry record, no actual PDH-R validation or badge issuance is claimed.

## File integrity

- **Revised manuscript SHA-256:** `{full_hash}`
- **Revised manuscript size:** {file_bytes:,} bytes (UTF-8)
- **Part XX protected-block SHA-256:** `{xx_hash}`
- **Part XXIV fiction-span SHA-256:** `{fiction_hash}`
'''
NOTE.write_text(note, encoding='utf-8', newline='')

print(f'Wrote {MANUSCRIPT} ({word_count:,} words, {file_bytes:,} bytes)')
print(f'SHA-256: {full_hash}')
print(f'Part XX SHA-256: {xx_hash}')
print(f'Part XXIV fiction SHA-256: {fiction_hash}')
print('Status rows:', len(part_rows))
