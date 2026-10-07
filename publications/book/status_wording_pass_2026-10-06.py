#!/usr/bin/env python3
"""Targeted production-status wording pass; Part XX is checksum-protected."""
from pathlib import Path
import hashlib
import re

P = Path('/home/user/HARSHAL-SYSTEMS-Book-I-EDITED-2026-10-06.txt')
s = P.read_text(encoding='utf-8')
lines = s.splitlines(keepends=True)
ix = next(i for i,l in enumerate(lines) if l.startswith('Part XX — Supply Chain and Implanted-Device Threat Research'))
jx = next(i for i in range(ix+1,len(lines)) if lines[i].startswith('Part XXI —'))
protected_before = ''.join(lines[ix:jx])

edits = [
('Status/evidence note: Part XII is DRAFT. Its case classifications are author-applied analyses',
 'Status/evidence note: Part XII presents a proposed Ground-0 method and author-applied case classifications'),
('this edition classifies the material as DRAFT.',
 'this edition presents the method as an author-proposed, unratified specification.'),
('Status/evidence note: Part XV is DRAFT.',
 'Status/evidence note: Part XV presents a proposed control model; its effectiveness is not validated.'),
('Status/evidence note: Part XVI is DRAFT.',
 'Status/evidence note: Part XVI presents proposed threat models.'),
('Source-authored sign-off text; this edition classifies Part XVI as DRAFT. Production readiness, partitioning, and efficacy are not established.',
 'Source-authored sign-off text; it is retained as provenance only. This edition presents the controls as proposals; production readiness, partitioning, and efficacy are not established.'),
('Status/evidence note: Part XVII is a DRAFT conceptual taxonomy and speculative reactor doctrine.',
 'Status/evidence note: Part XVII presents a conceptual taxonomy and speculative reactor doctrine as proposals.'),
('This document is the source-authored synthesis of the draft Neural Atomic Body taxonomy under the AGS framework;',
 'This document is the source-authored synthesis of the proposed Neural Atomic Body taxonomy under the AGS framework;'),
('Status/evidence note: Part XVIII is DRAFT. Its body mappings, checklists, workplace directives, security controls, and patent-style text are proposed or source-authored templates, not evidence of an active organization, adopted policy, deployed control, legal opinion, patent filing, clinical system, or successful prevention.',
 'Status/evidence note: Part XVIII’s body mappings, checklists, workplace directives, security controls, and patent-style text are proposals or source-authored templates, not evidence of an active organization, adopted policy, deployed control, legal opinion, patent filing, clinical system, or successful prevention.'),
('Status/evidence note: This part is a DRAFT conceptual research proposal.',
 'Status/evidence note: This part presents a conceptual research proposal.'),
('Status: MANUAL DRAFT; a working implementation or independent validation is not established',
 'Status: Proposed schema; a working implementation or independent validation is not established'),
('AVE remains a draft; these descriptions are design requirements, not deployed capabilities.',
 'AVE remains a proposal; these descriptions are design requirements, not deployed capabilities.'),
('This document is a conceptual draft; no implementation, clinical validation, neural interface, security certification, or interoperability test is supplied.',
 'This document is a conceptual proposal; no implementation, clinical validation, neural interface, security certification, or interoperability test is supplied.'),
('Classification: Proposed internal specification (DRAFT; no external certification claimed)',
 'Classification: Proposed, unratified internal specification (no external certification claimed)'),
('Classification: Proposed formal systems specification (DRAFT; no independent validation claimed)',
 'Classification: Proposed, unratified formal systems specification (no independent validation claimed)'),
('Within this proposal, the five modules form a draft specification set.',
 'Within this proposal, the five modules form an unratified specification set.'),
('Status and evidence boundary: DRAFT, mixed conceptual proposal and hypothetical scenario material.',
 'Status and evidence boundary: Proposed, mixed conceptual and hypothetical scenario material.'),
('Source-stated status: Final (source metadata only; this edition classifies Part XXV as DRAFT)',
 'Source-stated status: Final (source metadata only; this edition treats the material as a proposal, not as validated implementation)'),
('This edition classifies the material as DRAFT and does not claim implementation or validation.',
 'This edition presents the material as a proposal and does not claim implementation or validation.'),
('Status: Working Draft — Collaborative Refinement Required',
 'Status: Proposed concept; implementation and validation remain open.'),
('Status: DRAFT; conceptual architecture; operational definitions, testing, and validation remain incomplete.',
 'Status: Proposed conceptual architecture; operational definitions, testing, and validation remain incomplete.'),
('Classification: DRAFT CONCEPTUAL THREAT MODEL (NOT AN OPERATIONAL SPECIFICATION)',
 'Classification: CONCEPTUAL THREAT MODEL (NOT AN OPERATIONAL SPECIFICATION; UNVALIDATED)'),
('CLAA-v1.0 is a proposed draft companion to ADJR-v1.0.',
 'CLAA-v1.0 is a proposed companion to ADJR-v1.0.'),
('This is a conceptual, unvalidated design draft.',
 'This is a conceptual, unvalidated design proposal.'),
('MicroConvergence — Specification Draft',
 'MicroConvergence — Proposed Specification'),
('Accessory Kit · Draft v1.1 (Upgraded)',
 'Accessory Kit · Proposal v1.1 (Upgraded)'),
('Accessory Kit · Draft v1.1 (Hard Mode)',
 'Accessory Kit · Proposal v1.1 (Hard Mode)'),
('Structural Model Specification (Spherical Topology Draft)',
 'Structural Model Specification (Spherical Topology Proposal)'),
]
for old,new in edits:
 count=s.count(old)
 if count < 1:
  raise SystemExit(f'Missing required wording to update: {old[:140]!r}')
 s=s.replace(old,new)

# Replace the remaining Part XI artifact status labels, but retain their versioning.
for old,new in [
 ('Status: Draft v0.1 (Working Document)','Status: Proposed v0.1 (working document)'),
 ('Status: Draft v0.2 (Renamed & Clarified)','Status: Proposed v0.2 (renamed and clarified)'),
 ('Status: Draft v0.1 (Non‑Human, Non‑Normative)','Status: Proposed v0.1 (non-human, non-normative)'),
]:
 if s.count(old)!=1: raise SystemExit(f'Unexpected count for {old!r}: {s.count(old)}')
 s=s.replace(old,new)

new_lines=s.splitlines(keepends=True)
ix2=next(i for i,l in enumerate(new_lines) if l.startswith('Part XX — Supply Chain and Implanted-Device Threat Research'))
jx2=next(i for i in range(ix2+1,len(new_lines)) if new_lines[i].startswith('Part XXI —'))
protected_after=''.join(new_lines[ix2:jx2])
if protected_before != protected_after:
 raise SystemExit('Part XX changed during the status-wording pass; refusing to write.')
P.write_text(s,encoding='utf-8')
print(f'updated: {P}')
print(f'Part XX SHA-256 unchanged: {hashlib.sha256(protected_after.encode()).hexdigest()}')
print('remaining blanket status-label scan:', sum(bool(re.search(r'(?i)\b(?:is|as)\s+DRAFT\b|Status:\s*(?:DRAFT|Working Draft|MANUAL DRAFT)',l)) for l in s.splitlines()))
