from pathlib import Path
import re

SOURCE = Path('/home/user/HARSHAL-SYSTEMS-Book-I-EDITED-2026-10-06-PRE-APPENDIX-REORG.txt')
OUT = Path('/home/user/HARSHAL-SYSTEMS-Book-I-REORG-WORKING.txt')
s = SOURCE.read_text(encoding='utf-8')

# Extract unique ranges from the pre-reorganization copy and leave deliberate
# locators in the source chapters. The complete original material is kept below.
def take(start: str, end: str, *, replacement: str = '', name: str = '') -> str:
    global s
    assert s.count(start) == 1, (name, 'start count', s.count(start), start)
    a = s.index(start)
    b = s.find(end, a + len(start))
    assert b >= 0, (name, 'end not found', end)
    chunk = s[a:b]
    s = s[:a] + replacement + s[b:]
    print(f'{name or start}: extracted {len(chunk)} chars, replaced with {len(replacement)}')
    return chunk

# Appendix A: equations and local term notes; leave Part II's worked example and review questions.
formal = take(
    'Formal Appendix: Equations and Term Notes',
    'Textbook Study Guide: Worked Mathematical Examples & Student Problem Set (Part II)',
    replacement='Formal Appendix relocated: the equations and local term notes are collected in Appendix A at the end of this volume. Part II’s worked example and review questions remain here.\n\n',
    name='Formal Appendix'
)

# Former Part III is entirely SR-0–SR-5 material plus its review questions.
safety = take(
    'Part III — Safety Rationale for Adversarial Scenarios',
    'Part IV — AGS: Accountability-Gated Systems',
    replacement='',
    name='Former Part III / safety rationale'
)

# Audit A and its attached methodology notes.
audit_a = take(
    'Ground-0 Phase Detection Case Study\nInstitutional Governance Audit: Anthropic (A Side — Author-Prepared Public-Record Baseline)',
    'GROUND-0 PHASE DETECTION ALGORITHM v1.0 — PROPOSED SPECIFICATION',
    replacement='Audit A, including its methodology notes, is preserved in Appendix D.1 as a historical record. See the author’s note in Appendix D; the audit’s result is not asserted as a current or independently verified finding.\n\n',
    name='Audit A'
)

# Stipulated examples that were explicitly labeled Appendix A and B in the old Part XII.
scenarios = take(
    'Appendix A — Illustrative Public-Health Scenario (Assumed Inputs)',
    'METASPEC-DRAC-v1.0: Author-Proposed Mythic Architecture Sketch',
    replacement='The stipulated Ground-0 exercises formerly labeled Appendices A and B are collected in Appendix C. They remain exercises, not audits of real authorities.\n\n',
    name='Ground-0 scenario appendices'
)

# Part XVI's appendices A–C; keep its end-of-part review questions with the main Part.
integration = take(
    'Appendix: Integration & Operations Guide',
    'End-of-Part Review & Problem Set',
    replacement='The Integration & Operations Guide formerly in this Part is collected in Appendix E.\n\n',
    name='Integration & Operations Guide'
)

# Part XXI's quick reference; leave its glossary pointer in the source Part.
signal_ref = take(
    'Appendix A: Signal Class Quick Reference',
    'Glossary pointer',
    replacement='The Signal Class Quick Reference is collected in Appendix F. The limits in this Part remain controlling.\n\n',
    name='Signal Class Quick Reference'
)

# The whole former Part XXVI is Audit B; the full record, review prompts, and sources move together.
audit_b = take(
    'Part XXVI — Ground-0 Case Study: Anthropic’s Reported Fable 5/Mythos 5 Access Events and PDH-R Issuer-Layer Review',
    'Part XXVII — Whole Corpus / Complete Work',
    replacement='',
    name='Audit B / former Part XXVI'
)

# Move the Audit A source entry out of the Part XII source list; the BBC source
# remains in the Ground-0 method chapter because its ledger still cites it.
rsp_line_matches = re.findall(r'^\[G0-RSP-1\].*$', s, flags=re.M)
assert len(rsp_line_matches) == 1, len(rsp_line_matches)
rsp_source = rsp_line_matches[0]
s = re.sub(r'^\[G0-RSP-1\].*\n?', '', s, count=1, flags=re.M)

# Repair the replication note whose reference to the now-relocated audit would otherwise dangle.
old='The source record reports identical classifications; this edition contains no independent replication or inter-rater reliability study. The A-Side B4 coding below is not a current all-scope finding: Part XXVI separately codes the reported June 12 access suspension as a narrow deployment-access constraint, subject to its source and legal-scope caveats.'
new='The source record reports identical classifications; this edition contains no independent replication or inter-rater reliability study. Audit A is preserved in Appendix D.1 as a historical record; its author-reported score is not an independently verified current classification. Audit B’s separate, event-based analysis is preserved in Appendix D.2.'
assert s.count(old) == 1
s = s.replace(old, new, 1)

# Normalize moved blocks: retain their content and provenance, change only their new headings,
# auditor labels, and labels that no longer describe a numbered Part.
formal = formal.replace('Formal Appendix: Equations and Term Notes',
                        'Appendix A — Formal Constraint Equations and Term Notes (formerly embedded in Part II)', 1)

safety = safety.replace('Part III — Safety Rationale for Adversarial Scenarios',
                        'Appendix B — Safety Rationale for Adversarial Scenarios (formerly Part III)', 1)
safety = safety.replace('End-of-Part Review & Problem Set',
                        'Safety Rationale Review Questions', 1)

scenarios = scenarios.replace('Appendix A — Illustrative Public-Health Scenario (Assumed Inputs)',
                              'Appendix C.1 — Illustrative Public-Health Scenario (Assumed Inputs; formerly Appendix A in Part XII)', 1)
scenarios = scenarios.replace('Appendix B — Hypothetical Enforcement-Review Exercise (No Real Event Evaluated)',
                              'Appendix C.2 — Hypothetical Enforcement-Review Exercise (No Real Event Evaluated; formerly Appendix B in Part XII)', 1)

integration = integration.replace('Appendix: Integration & Operations Guide',
                                  'Appendix E — Integration & Operations Guide (formerly in Part XVI)', 1)
integration = integration.replace('Appendix A: Protocol Integration Framework',
                                  'Appendix E.1 — Protocol Integration Framework', 1)
integration = integration.replace('Appendix B: Proposed Protocol Inventory',
                                  'Appendix E.2 — Proposed Protocol Inventory', 1)
integration = integration.replace('Appendix C: Document Execution Sign-Off',
                                  'Appendix E.3 — Document Execution Sign-Off', 1)

signal_ref = signal_ref.replace('Appendix A: Signal Class Quick Reference',
                                'Appendix F — Signal Class Quick Reference (formerly in Part XXI)', 1)

audit_a = audit_a.replace('Auditor: Harshal Priyavadan Patel',
                          'Audit completed by: Claude\nManuscript author: Harshal Priyavadan Patel', 1)

# Retain the former source title as provenance, but make Audit B's authorship and
# non-Part status explicit.
audit_b = audit_b.replace(
    'Part XXVI — Ground-0 Case Study: Anthropic’s Reported Fable 5/Mythos 5 Access Events and PDH-R Issuer-Layer Review',
    'Audit B — Anthropic’s Reported Fable 5/Mythos 5 Access Events and PDH-R Issuer-Layer Review', 1)
audit_b = audit_b.replace('Editorial status: Production-edited',
                          'Audit completed by: Anonymous AI via Arena.ai\nEditorial status: Historical record, production-edited', 1)
audit_b = audit_b.replace('End-of-Part Review Questions', 'Audit B Review Questions', 1)

# A single author note governs both historical audit records.
audit_note = '''Appendix D — Historical AI Audit Record\n\nAuthor’s note on historical status\nAudit A was completed by Claude; Audit B was completed by an Anonymous AI via Arena.ai. Each is preserved as a record of the conclusion reached from the evidence available at its respective time. Neither conclusion is a current certification or an independently established finding. Reality, later evidence, or changed conditions may contradict either record.\n\nAppendix D.1 — Audit A: Anthropic A-Side (Claude; former source location: Part XII)\n\n'''
# Use the stable requested locator spelling D.1 rather than 

# Keep the three nested component references inside the threat-research part as
# written; they refer to the internal structure of that research paper, not to
# the book's numbered Parts.
protected_internal = [
    'For Safety Researchers: Review Part I (Foundational Concepts), Part III (Guarantee Matrices), and Part IV (Clear Non-Guarantees & Fail-Closed Physics) for boundary specifications.',
    'For design reviewers: Treat Part II (Protocols #001–#011) and Part V (profiles SSP-Alpha, Beta, Gamma) as proposed profiles requiring threat-specific engineering, hardware tests, and independent review before any deployment.',
    'For Independent Auditors: Treat Part III (Matrices) and Chapter 8 (Ground-0 Vector Verification Table) as proposed test structures; a real audit would require a named implementation, admissible evidence, and independent access.',
]

# Protect source-location labels in the extracted appendix headings from the
# current-edition cross-reference renumbering.
protected_source_labels = [
    'formerly embedded in Part II',
    'formerly Part III',
    'formerly Appendix A in Part XII',
    'formerly Appendix B in Part XII',
    'formerly in Part XVI',
    'formerly in Part XXI',
]

PART_MAP = {
    'XXVII': 'XXV',
    'XXVI': 'Appendix D.2',
    'XXV': 'XXIV',
    'XXIV': 'XXIII',
    'XXIII': 'XXII',
    'XXII': 'XXI',
    'XXI': 'XX',
    'XX-B': 'XIX-B',
    'XX': 'XIX',
    'XIX': 'XVIII',
    'XVIII': 'XVII',
    'XVII': 'XVI',
    'XVI': 'XV',
    'XV': 'XIV',
    'XIV': 'XIII',
    'XIII': 'XII',
    'XII': 'XI',
    'XI': 'X',
    'X': 'IX',
    'IX': 'VIII',
    'VIII': 'VII',
    'VII': 'VI',
    'VI': 'V',
    'V': 'IV',
    'IV': 'III',
    'III': 'Appendix B',
}

def renumber_part_references(text: str, *, protect_internal_lines: bool = False) -> str:
    saved = {}
    if protect_internal_lines:
        for i, phrase in enumerate(protected_internal):
            assert text.count(phrase) == 1, (phrase, text.count(phrase))
            token = f'@@INTERNAL_PART_REF_{i}@@'
            text = text.replace(phrase, token, 1)
            saved[token] = phrase
    for i, phrase in enumerate(protected_source_labels):
        if phrase in text:
            token = f'@@SOURCE_LOCATOR_{i}@@'
            text = text.replace(phrase, token)
            saved[token] = phrase

    # Replace longest/most specific labels first so Part XX-B is not read as Part XX.
    for old, new in sorted(PART_MAP.items(), key=lambda item: len(item[0]), reverse=True):
        token = f'@@PARTREF_{old.replace("-", "_")}@@'
        pattern = re.compile(r'\bPart\s+' + re.escape(old) + r'\b')
        text, count = pattern.subn(token, text)
        if count:
            saved[token] = f'Part {new}'

    for token, phrase in saved.items():
        text = text.replace(token, phrase)
    return text

# Apply the old-to-new numbering map. Old Part III and old Part XXVI are now
# Appendix B and Appendix D.2; all surviving Parts close the numbering gaps.
s = renumber_part_references(s, protect_internal_lines=True)
formal = renumber_part_references(formal)
safety = renumber_part_references(safety)
scenarios = renumber_part_references(scenarios)
integration = renumber_part_references(integration)
signal_ref = renumber_part_references(signal_ref)
audit_a = renumber_part_references(audit_a)
audit_b = renumber_part_references(audit_b)

# Update part-number ranges and lists. These are not singular "Part N" references.
plural_replacements = [
    ('Parts I–XIX and XXI–XXVII', 'Parts I–XVIII and XX–XXV'),
    ('Parts I–XXVII', 'Parts I–XXV'),
    ('Parts IV through X', 'Parts III through IX'),
    ('Parts IV–VII', 'Parts III–VI'),
    ('Parts V–VII', 'Parts IV–VI'),
    ('Parts XVI, XIX, and XX', 'Parts XV, XVIII, and XIX'),
    ('Parts XII, XVIII, and XXVI', 'Parts XI, XVII, and Appendix D.2'),
    ('Parts II–XI, XII–XV, XVII–XVIII, XXIII, XXV', 'Parts II–XIV, XVI–XVII, XXII, XXIV'),
    ('Parts XII and XXVI', 'Parts XI and Appendix D.2'),
]
for old, new in plural_replacements:
    s = s.replace(old, new)
    formal = formal.replace(old, new)
    safety = safety.replace(old, new)
    scenarios = scenarios.replace(old, new)
    integration = integration.replace(old, new)
    signal_ref = signal_ref.replace(old, new)
    audit_a = audit_a.replace(old, new)
    audit_b = audit_b.replace(old, new)

# Update current-volume part-count statements, not unrelated numeric examples.
s = re.sub(r'\b27 numbered parts\b', '25 numbered parts', s, flags=re.I)
s = re.sub(r'\b27 numbered Parts\b', '25 numbered Parts', s)

# Keep Audit A's source with Audit A; the unrelated BBC source stays with the
# still-present Part XI Ground-0 ledger example.
audit_a = audit_a.rstrip() + '\n\nSelected source cited in Audit A\n\n' + rsp_source + '\n'

# Correct current-facing pointers after the move. Historical source-location
# labels in the new headings will be added after this mapping.
s = s.replace(
    'The book contains public-record case analysis as well as author interpretation. Part XI’s Ground-0 method and scores are author-applied. Appendix D.2 now treats the publicly reported June 2026 Fable 5 and Mythos 5 access events as events described by Anthropic and independently covered by news reporting, while keeping the Gate coding and Ground-0 analysis attributed to the author. The cited company statements do not substitute for the underlying government directive or a complete government record. Read each source note for the distinction between a company’s account, a news report, an author’s interpretation, and an unsupported or unavailable artifact.',
    'The book contains public-record case analysis as well as author interpretation. Part XI contains the Ground-0 method. Audit A and Audit B are preserved together in Appendix D as historical records, attributed to Claude and an Anonymous AI via Arena.ai. Later evidence or observed conditions may contradict their findings. The cited company statements in Audit B do not substitute for the underlying government directive or a complete government record.',
    1)
# Older baseline wording may be present with a slightly different clause; normalize the paragraph by exact start.
needle='The book contains public-record case analysis as well as author interpretation.'
idx=s.find(needle)
if idx >= 0:
    end=s.find('\n\nPart XX', idx)
    if end < 0: end=s.find('\n\n',idx)
    paragraph=s[idx:end]
    if 'Appendix D' not in paragraph or 'Part XI contains the Ground-0 method.' not in paragraph:
        replacement=('The book contains public-record case analysis as well as author interpretation. '
                     'Part XI contains the Ground-0 method. Audit A and Audit B are preserved together in Appendix D as historical records, '
                     'attributed to Claude and an Anonymous AI via Arena.ai. Later evidence or observed conditions may contradict their findings. '
                     'The cited company statements in Audit B do not substitute for the underlying government directive or a complete government record.')
        s=s[:idx]+replacement+s[end:]

# Update front-matter learning paths and references to the relocated audits.
s=s.replace(
    'Module 3 — Institutional Phase Detection & Evidence Discipline: Read Part XI as an author-prepared Ground-0 method and A-Side case baseline; its 5/5 result is author-reported, not independently verified. Appendix D.2 examines the reported Fable 5/Mythos 5 access events, the event-based 4/5 calculation conditional on its B4 coding and four carried-forward author-scored gates, the reported 2/4 Step 3.5 aggregate and unresolved v1.0 terminal rule, and the v1.2 issuer-layer eligibility review. Compare these with the proposed procedural controls in Part XXIV. Do not treat any author-applied score or label as an independent empirical finding.',
    'Module 3 — Institutional Phase Detection & Evidence Discipline: Read Part XI for the Ground-0 method. Appendix D preserves Audit A and Audit B as separate historical records, including the author-reported 5/5 A-Side result and the conditional 4/5 event calculation, the reported 2/4 Step 3.5 aggregate, and its unresolved v1.0 terminal rule. Compare the audit records with the proposed procedural controls in Part XXIV. Do not treat any author-applied score or label as an independent empirical finding.',
    1)
s=s.replace(
    'If you study case analysis, read Part XI’s method and evidence note, then Appendix D.2’s public-event sources and author-applied scoring.',
    'If you study case analysis, read Part XI’s method and evidence note, then Appendix D for both historical audit records and their source boundaries.',
    1)
# Remap citations to the relocated Audit B throughout the front matter and index.
s=s.replace('Part XXVI’s analysis of publicly reported access events', 'Appendix D.2’s analysis of publicly reported access events')
s=s.replace('Part XXVI analyzes publicly reported events', 'Appendix D.2 analyzes publicly reported events')
s=s.replace('Part XXVI is an event-based reconstruction with author-applied scoring', 'Appendix D.2 is an event-based reconstruction with author-applied scoring')
s=s.replace('Part XXVI’s public-event sources', 'Appendix D.2’s public-event sources')
s=s.replace('Part XXVI’s analysis', 'Appendix D.2’s analysis')
s=s.replace('Part XI and Appendix D.2', 'Part XI and Appendix D.2')
# A-Side references now point to the audit appendix, not the current Ground-0 method chapter.
s=s.replace('Part XI as an author-prepared Ground-0 method and A-Side case baseline', 'Part XI for the Ground-0 method; see Appendix D.1 for historical Audit A')
s=s.replace('Part XI’s former A-Side', 'Appendix D.1’s former A-Side')
s=s.replace('Part XI’s A-Side', 'Appendix D.1’s A-Side')

# The current number of Parts is 25; record the lettered narrative subpart separately.
s=s.replace('This volume contains 27 numbered parts.', 'This volume contains 25 numbered Parts, plus the separately labeled Part XIX-B narrative sandbox.')
s=s.replace('This glossary consolidates recurring terms used across the 27 numbered parts.', 'This glossary consolidates recurring terms used across the 25 numbered Parts, the separately labeled Part XIX-B sandbox, and the collected appendices.')

# Rewrite A-Side/B-Side glossary descriptions as historical audit records.
s=s.replace(
    '**A-Side / B-Side** — Labels used in Ground-0 material for an author-prepared baseline and a separate comparison or event-based scenario. They identify analytic framing, not independent audit status.',
    '**A-Side / B-Side** — Audit A (completed by Claude) and Audit B (completed by an Anonymous AI via Arena.ai), preserved separately in Appendix D. Their conclusions are historical records and may be contradicted by later evidence or observed conditions.'
)
s=s.replace(
    '**B-Side event analysis** — Part XXVI’s author-applied, limited deployment-access scenario. Under its stated event-based B4 coding and four carried-forward author-scored gates, it records G_B = (1, 1, 1, 0, 1), or 4/5 GSRB predicates (AMBIGUOUS at v1.0 Step 3). The earlier 2/4 Step 3.5 aggregate is author-reported, its gate-level basis is not reproduced, and the v1.0 terminal rule is underdetermined; none is an independent audit result.',
    '**B-Side event analysis** — Audit B in Appendix D.2: an author-applied, limited deployment-access scenario. Under its stated event-based B4 coding and four carried-forward author-scored gates, it records G_B = (1, 1, 1, 0, 1), or 4/5 GSRB predicates (AMBIGUOUS at v1.0 Step 3). The earlier 2/4 Step 3.5 aggregate is author-reported, its gate-level basis is not reproduced, and the v1.0 terminal rule is underdetermined; the result remains a historical record, not a current or independently established finding.'
)
s=s.replace('described in Parts XI and Appendix D.2', 'described in Part XI and Appendix D.2')
s=s.replace('described in Parts XII and XXVI', 'described in Part XI and Appendix D.2')
s=s.replace('in Part XII the cited source', 'in Audit A (Appendix D.1) the cited source')

# Repair current source-list heading after moving the Audit A citation.
s=s.replace('Selected sources cited in Part XII', 'Selected sources cited in Part XI')
s=s.replace('The June 2026 Anthropic access-event sources are listed in Appendix D.2.', 'The June 2026 Anthropic access-event sources are listed in Appendix D.2.')

# Assemble end matter. Former-part identifiers in these headings are intentional provenance labels.
appendices = '''APPENDICES\n\n'''
appendices += formal.rstrip() + '\n\n'
appendices += safety.rstrip() + '\n\n'
appendices += 'Appendix C — Ground-0 Supplementary Exercises (formerly in Part XII)\n\n' + scenarios.strip() + '\n\n'
appendices += audit_note
appendices += audit_a.strip() + '\n\n'
appendices += 'Appendix D.2 — Audit B: Anthropic Fable 5/Mythos 5 Access Events and PDH-R Review (former source location: Part XXVI)\n\n'
appendices += audit_b.strip() + '\n\n'
appendices += integration.strip() + '\n\n'
appendices += signal_ref.strip() + '\n\n'

# Insert collected appendices immediately before the final consolidated glossary.
glossary_marker='Consolidated Glossary\n'
glossary_pos=s.rfind(glossary_marker)
assert glossary_pos>=0
s=s[:glossary_pos] + appendices + s[glossary_pos:]

# Make the new appendices appear in the front matter contents. Folios are
# temporary until the final interior is rendered and audited.
old_toc='| Consolidated Glossary | 487 |'
new_toc='''| Appendices | TBD |\n| Appendix A — Formal Constraint Equations and Term Notes | TBD |\n| Appendix B — Safety Rationale for Adversarial Scenarios | TBD |\n| Appendix C — Ground-0 Supplementary Exercises | TBD |\n| Appendix D — Historical AI Audit Record | TBD |\n| Appendix D.1 — Audit A: Claude | TBD |\n| Appendix D.2 — Audit B: Anonymous AI via Arena.ai | TBD |\n| Appendix E — Integration & Operations Guide | TBD |\n| Appendix F — Signal Class Quick Reference | TBD |\n| Consolidated Glossary | TBD |'''
assert s.count(old_toc)==1
s=s.replace(old_toc,new_toc,1)

# Remove the old Part III and Part XXVI TOC entries; global reference mapping
# has temporarily rendered these as Appendix B and Appendix D.2 rows.
s=re.sub(r'^\| Appendix B — Safety Rationale \|[^\n]*\n', '', s, count=1, flags=re.M)
s=re.sub(r'^\| Appendix D\.2 — Anthropic Access Events and PDH-R Review \|[^\n]*\n', '', s, count=1, flags=re.M)

# Update the human-readable structural overview and current guide.
s=s.replace('Parts I–XXVII. The status and provenance register below classifies every retained numbered part.',
            'Parts I–XXV. The status and provenance register below classifies every retained numbered Part. Part XIX-B is a separately labeled narrative sandbox; appendices follow Part XXV.')
s=s.replace('Parts I–XXVII (including the fictional preview in Part XXIV)', 'Parts I–XXV (including the fictional preview in Part XXIII)')
s=s.replace('27 numbered parts (Part I through Part XXVII)', '25 numbered Parts (Part I through Part XXV)')
s=s.replace('27 numbered Parts', '25 numbered Parts')
s=s.replace('27 numbered parts', '25 numbered Parts')

# Front matter table row identifiers: drop relocated Parts III/XXVI and renumber the rest.
reg_start=s.index('Part | Content class / provenance | Status | Evidence and force')
reg_end=s.index('\n\nReference Modules', reg_start)
reg=s[reg_start:reg_end]
new_rows=[]
for line in reg.splitlines():
    m=re.match(r'^\|\s*(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX|XXI|XXII|XXIII|XXIV|XXV|XXVI|XXVII)\s*\|',line)
    if not m:
        new_rows.append(line); continue
    oldnum=m.group(1)
    if oldnum in {'III','XXVI'}:
        continue
    newnum=PART_MAP.get(oldnum, oldnum)
    assert newnum not in {'Appendix B','Appendix D.2'}
    line=line[:m.start(1)]+newnum+line[m.end(1):]
    if oldnum=='XX':
        line=line.replace('Preserved; approved debris/repository-reference/A-number cleanup only',
                          'Preserved; approved debris/repository-reference/A-number cleanup and authorized Part renumbering/cross-reference updates only')
        line=line.replace('No general copyedit was applied', 'No general copyedit was applied')
    new_rows.append(line)
appendix_register='''\n\nEnd-Matter Register\n| Appendix | Content / provenance | Status | Evidence boundary |\n|---|---|---|---|\n| A | Formal constraint equations and local term notes; formerly embedded in Part II | Collected reference | Author-proposed model; not an external standard or validated implementation. |\n| B | Safety Rationale SR-0–SR-5 and review questions; formerly Part III | Collected historical/proposal material | Scenarios are proposed stress tests, not evidence of incidents or operational capability. |\n| C | Stipulated Ground-0 public-health and enforcement-review exercises; formerly Part XII | Collected exercises | Assumed inputs; no real authority is evaluated. |\n| D.1 | Audit A — Claude, Anthropic A-Side; formerly in Part XII | Historical audit record | Author-reported findings; later evidence or reality may contradict them. |\n| D.2 | Audit B — Anonymous AI via Arena.ai; former Part XXVI | Historical audit record | Public-event reconstruction and author-applied analysis; not an independent government finding. |\n| E | Integration & Operations Guide; formerly in Part XVI | Collected proposal | Protocol inventory and controls are proposed; implementation and efficacy are not established. |\n| F | Signal Class Quick Reference; formerly in Part XXI | Collected reference | Illustrative classes and deployment-specific limits; not a validated interface. |'''
reg='\n'.join(new_rows)+appendix_register
s=s[:reg_start]+reg+s[reg_end:]

# Update the part-count and teaching-guide statements, preserving Part XIX (old Part XX) as protected content.
s=s.replace('Student review questions appear at the end of Parts I–XVIII and XX–XXV; Part XIX is retained without editorial additions under the preservation instruction. Selected worked examples appear in the relevant parts.',
            'Student review questions appear at the end of every current Part except Part XIX (the preserved former Part XX); Part XIX-B has its own review questions. The appendices contain their own review prompts.')
s=s.replace('This edition of Book I (Harshal’s Systems) includes formal equations, worked numerical examples, and end-of-part review questions in Parts I–XVIII and XX–XXV. Part XIX is retained without general copyediting or added review material under the preservation instruction.',
            'This edition of Book I (Harshal’s Systems) includes formal equations, worked numerical examples, and end-of-part review questions in every current Part except Part XIX, including Part XIX-B. Part XIX (the preserved former Part XX) remains without general copyediting or added review material; the appendices contain their own review prompts.')

# Audit B's version-control paragraph now distinguishes the method from the relocated A-Side record.
old='Version control is material. Part XI supplies the Ground-0 v1.0 method and an author-prepared A-Side baseline.'
new='Version control is material. Part XI supplies the Ground-0 v1.0 method; the separate Audit A baseline is preserved in Appendix D.1.'
s=s.replace(old,new)

# Replace stale statements about current PartXXVII corpus/index locations.
s=s.replace('Part XXVII', 'Part XXV') if False else s

# Final reproducible QA repairs: TOC, new-number cross-references, worked-example IDs,
# source-location labels, and the two historical audit records.
s = re.sub(r'^\| Part Appendix B — Safety Rationale[^\n]*\n', '', s, count=1, flags=re.M)
s = re.sub(r'^\| Part Appendix D\.2 — Anthropic Access Events and PDH-R Review[^\n]*\n', '', s, count=1, flags=re.M)
s = s.replace('Part Appendix D.2', 'Appendix D.2')
s = s.replace('Part Appendix B', 'Appendix B')
s = s.replace('Audit D.1 — Audit A:', 'Appendix D.1 — Audit A:')

# Clarify relocated source locations against the renumbered current sequence.
source_locators = {
    'formerly Appendix A in Part XII': 'formerly Appendix A in old Part XII (now Part XI)',
    'formerly Appendix B in Part XII': 'formerly Appendix B in old Part XII (now Part XI)',
    'formerly in Part XII': 'from old Part XII (now Part XI)',
    'former source location: Part XII': 'former source location: old Part XII (now Part XI)',
    'formerly Part III': 'from old Part III',
    'formerly in Part XVI': 'from old Part XVI (now Part XV)',
    'formerly in Part XXI': 'from old Part XXI (now Part XX)',
    'former Part XXVI': 'from old Part XXVI',
    'former source location: Part XXVI': 'former source location: old Part XXVI',
}
for old, new in source_locators.items():
    s = s.replace(old, new)
s = s.replace('from old Part XII (now Part XI)', 'from old Part XII, now Part XI')
s = s.replace('old Part XII (now Part XI)', 'old Part XII, now Part XI')
s = s.replace('from old Part XVI (now Part XV)', 'from old Part XVI, now Part XV')
s = s.replace('from old Part XXI (now Part XX)', 'from old Part XXI, now Part XX')
s = s.replace(
    '| C | Stipulated Ground-0 public-health and enforcement-review exercises; formerly Part XII |',
    '| C | Stipulated Ground-0 public-health and enforcement-review exercises; from old Part XII, now Part XI |'
)

# Make the relocated-audit description accurate and remove malformed "Part Appendix" locators.
s = s.replace(
    '• This volume contains 25 numbered parts. Part XXIII is fiction; Appendix D.2 is an author-applied analysis of publicly reported events; Part XXV is a derivative index and embedded reference material. Each part’s local provenance and evidence labels govern its claims.',
    '• This volume contains 25 numbered Parts. Part XXIII is fiction; Appendix D.2 preserves Audit B as a historical analysis of publicly reported events; Part XXV is a derivative index and embedded reference material. Each Part’s local provenance and evidence labels govern its claims.'
)
s = s.replace('CASE_ANALYSIS — Ground-0 and institutional analyses, including Part Appendix D.2’s analysis',
              'CASE_ANALYSIS — Ground-0 and institutional analyses, including Appendix D.2’s analysis')
s = s.replace('Part Appendix D.2 examines the reported Fable 5/Mythos 5 access events',
              'Appendix D.2 examines the reported Fable 5/Mythos 5 access events')
s = s.replace('Part Appendix D.2’s public-event sources', 'Appendix D.2’s public-event sources')
s = s.replace('Part Appendix D.2 analyzes publicly reported events', 'Appendix D.2 analyzes publicly reported events')
s = s.replace('Part Appendix D.2’s analysis', 'Appendix D.2’s analysis')
s = s.replace('Part Appendix D.2 is an event-based reconstruction', 'Appendix D.2 is an event-based reconstruction')
s = s.replace('Part Appendix D.2’s author-applied analysis', 'Appendix D.2’s author-applied analysis')
s = s.replace('Part Appendix D.2 separately', 'Appendix D.2 separately')
s = s.replace('Part Appendix D.2 is', 'Appendix D.2 is')
s = s.replace(
    'If you study safety and threats, read the status label and assumptions before the technical material in Parts III, XVI, and XX.',
    'If you study safety and threats, read Appendix B and the status labels before the technical material in Parts XV and XIX.'
)
s = s.replace(
    'Part XI’s scores are author-applied classifications, not independent findings; Appendix D.2 analyzes publicly reported access events but does not present an independent audit or government-issued classification.',
    'The scores in Appendix D are historical, author-applied classifications, not independent findings; Audit B analyzes publicly reported access events but does not present a government-issued classification.'
)

# Fix the current-volume guidance and internal range after Parts III and XXVI moved to end matter.
s = s.replace(
    'If you study collective communication, begin with Part IV and its 25/25/75 bookkeeping example; read the Bell/CHSH boundary directly rather than relying on a summary. If you study case analysis, read Part XI’s method and evidence note, then Part Appendix D.2’s public-event sources and author-applied scoring. If you study safety and threats, read the status label and assumptions before the technical material in Parts III, XVI, and XX. If you want a narrative example, read Part XXIII as fiction. Use Part XXV and the front-matter status register to find the route that matches your question.',
    'If you study collective communication, begin with Part IV and its 25/25/75 bookkeeping example; read the Bell/CHSH boundary directly rather than relying on a summary. If you study case analysis, read Part XI’s method and evidence note, then Appendix D.2’s public-event sources and author-applied scoring. If you study safety and threats, read Appendix B and the status labels before the technical material in Parts XV and XIX. If you want a narrative example, read Part XXIII as fiction. Use Part XXV and the front-matter status register to find the route that matches your question.'
)
s = s.replace(
    'all binding security invariants reside in the normative threat analysis above and in Parts I–XIX, XXIII, and XXV.',
    'all binding security invariants reside in the normative threat analysis above and in Parts I–XVIII, Appendix B, XXII, and XXIV.'
)

# Map worked-example identifiers as a single pass so targets cannot be remapped again.
example_map = {'4.1':'3.1','5.1':'4.1','7.1':'6.1','9.1':'8.1','12.1':'11.1',
               '15.1':'14.1','19.1':'18.1','23.1':'22.1','25.1':'24.1'}
for old, new in example_map.items():
    token = f'@@EXAMPLE_{old.replace(".", "_")}@@'
    s = s.replace(f'Worked Example {old}', token)
for old, new in example_map.items():
    token = f'@@EXAMPLE_{old.replace(".", "_")}@@'
    s = s.replace(token, f'Worked Example {new}')

# Audit A and B remain separate historical records; correct the audit-specific source descriptions.
s = s.replace(
    'Scope and evidence note: Part XI contains an author-prepared public-record case analysis, not an independent audit. Its phase scores reflect the author’s criteria and evidence selection, not an independently established classification. The A-Side text lacks a complete public-source bibliography and inclusive Evidence_Cutoff; its 5/5 score is retained only as a prior author-reported baseline. Appendix D.2 separately analyzes the publicly reported June 2026 Fable 5/Mythos 5 access events and applies the Ground-0 gates to the deployment-access axis. The event sources do not validate the other A-Side inputs or establish a general external veto.',
    'Scope and evidence note: Audit A in this appendix preserves an author-prepared public-record case analysis, not an independent audit. Its phase scores reflect the author’s criteria and evidence selection, not an independently established classification. The A-Side text lacks a complete public-source bibliography and inclusive Evidence_Cutoff; its 5/5 score is retained only as a prior author-reported baseline. Appendix D.2 separately analyzes the publicly reported June 2026 Fable 5/Mythos 5 access events and applies the Ground-0 gates to the deployment-access axis. The event sources do not validate the other A-Side inputs or establish a general external veto.'
)
s = s.replace(
    'A-Side evidence-use note: The B1–B5 observations and scores below are retained from the earlier author-prepared case record. The original A1–A29 evidence index and supporting artifacts were unavailable for independent checking in this edition. They are not newly verified findings. The cited Responsible Scaling Policy source supports only the specific description attached to [G0-RSP-1]; Part Appendix D.2 separately handles the publicly reported June 2026 access events.',
    'A-Side evidence-use note: The B1–B5 observations and scores below are retained from the earlier author-prepared case record. The original A1–A29 evidence index and supporting artifacts were unavailable for independent checking in this edition. They are not newly verified findings. The cited Responsible Scaling Policy source supports only the specific description attached to [G0-RSP-1]; Appendix D.2 separately handles the publicly reported June 2026 access events.'
)
s = s.replace(
    'Scope: This retained baseline is not an independent audit, legal determination, or established classification of Anthropic’s governance. Part Appendix D.2 separately applies the author’s method to a narrow, publicly reported deployment-access event and states its evidence limits.',
    'Scope: This retained baseline is not an independent audit, legal determination, or established classification of Anthropic’s governance. Appendix D.2 separately applies the author’s method to a narrow, publicly reported deployment-access event and states its evidence limits.'
)
s = s.replace(
    'Inputs available for this reconstruction include the supplied Part XI Ground-0 method, the unratified v1.2 issuer-layer amendment draft, the retained B-Side text, Anthropic’s two public statements, and CNBC reporting. The original [A1]–[A29] source index and complete government directive are unavailable here. The A-Side’s 5/5 score remains an earlier author-reported baseline, not independently reproduced; the event-based B4 result below is conditional on the stated coding choice and held-constant author scores.',
    'Inputs available for this reconstruction include the Part XI Ground-0 method, the unratified v1.2 issuer-layer amendment, the retained Audit B text, Anthropic’s two public statements, and CNBC reporting. The original [A1]–[A29] source index and complete government directive are unavailable here. Audit A’s 5/5 score is preserved in Appendix D.1 as an author-reported historical baseline, not independently reproduced; the event-based B4 result below is conditional on the stated coding choice and carried-forward author scores.'
)
s = s.replace(
    '7. Emergency Legitimacy (INV-EMERG-001) & Ground-0 Phase Types (INV-G0-CLASS-001): Emergency conditions do not create authority. NAB, CWO, and GSRB are governance/software labels; AMBIGUOUS and INCOHERENT are diagnostics, not physical or quantum phases. Part XI’s scores are author-applied classifications, not independent findings; Part Appendix D.2 analyzes publicly reported access events but does not present an independent audit or government-issued classification.',
    '7. Emergency Legitimacy (INV-EMERG-001) & Ground-0 Phase Types (INV-G0-CLASS-001): Emergency conditions do not create authority. NAB, CWO, and GSRB are governance/software labels; AMBIGUOUS and INCOHERENT are diagnostics, not physical or quantum phases. The scores in Appendix D are historical, author-applied classifications, not independent findings; Audit B analyzes publicly reported access events but does not present a government-issued classification.'
)
s = s.replace(
    '**B-Side event analysis** — Part Appendix D.2’s author-applied, limited deployment-access scenario. Under its stated event-based B4 coding and four carried-forward author-scored gates, it records G_B = (1, 1, 1, 0, 1), or 4/5 GSRB predicates (AMBIGUOUS at v1.0 Step 3). The earlier 2/4 Step 3.5 aggregate is author-reported, its gate-level basis is not reproduced, and the v1.0 terminal rule is underdetermined; none is an independent audit result.',
    '**B-Side event analysis** — Appendix D.2’s author-applied, limited deployment-access scenario. Under its stated event-based B4 coding and four carried-forward author-scored gates, it records G_B = (1, 1, 1, 0, 1), or 4/5 GSRB predicates (AMBIGUOUS at v1.0 Step 3). The earlier 2/4 Step 3.5 aggregate is author-reported, its gate-level basis is not reproduced, and the v1.0 terminal rule is underdetermined; none is an independent audit result.'
)
s = s.replace(
    '**RSP** — Responsible Scaling Policy. In Part XI the cited source supports the narrower claim that Anthropic describes its RSP v3.0 as a voluntary framework; that does not independently verify implementation.',
    '**RSP** — Responsible Scaling Policy. In Audit A (Appendix D.1), the cited source supports the narrower claim that Anthropic describes its RSP v3.0 as a voluntary framework; that does not independently verify implementation.'
)

# Accurately describe what the glossary consolidates.
s = s.replace(
    'This glossary consolidates recurring terms used across the 25 numbered parts.',
    'This glossary consolidates recurring terms used across the 25 numbered Parts, Part XIX-B, and the collected appendices.'
)
# The front matter identifies the review-question coverage and preserves the protected Part XIX exception.
s = s.replace('end-of-part student review questions in Parts I–XXV,',
              'end-of-part student review questions in every current Part except protected Part XIX, including Part XIX-B,')
s = s.replace('With a plain-language orientation, worked examples, review questions in Parts I–XVIII and XX–XXV, and a consolidated glossary',
              'With a plain-language orientation, worked examples, end-of-part review questions in every current Part except Part XIX, including Part XIX-B, and a consolidated glossary')
archive_note_old = ('The current scope notice governs this edition. Assertions in the retained historical text that controls are “in place,” hardware is synchronized, a system is secured or deployed, or patents, charitable status, or legal immunity exist are source-authored claims, not findings or validations by this edition, unless separately supported by identified evidence.')
archive_note_new = ('The current scope notice governs this edition. The retained phrase “functional license key” is historical wording only: the book does not grant an identity credential or runtime permission, and commercial intellectual-property permission is a separate contract. Current terminology distinguishes a non-revocable identity record from scoped operational authorization. Assertions in the retained historical text that controls are “in place,” hardware is synchronized, a system is secured or deployed, or patents, charitable status, or legal immunity exist are source-authored claims, not findings or validations by this edition, unless separately supported by identified evidence.')
s = s.replace(archive_note_old, archive_note_new)

# Replace unsupported decorative glyphs and use readable indicator notation in equations.
s = s.replace('Answer: YES ✓', 'Answer (recorded): YES')
s = s.replace('Answer: NO ✓', 'Answer (recorded): NO')
s = s.replace(
    'Score_GSRB = ∑_i=1^5 𝕀(B_i = YES) = 1 + 1 + 1 + 1 + 1 = 5 of 5 ⇒ Detected\\_Phase = GSRB',
    'Score_GSRB = Σ_{i=1}^{5} 1{B_i = YES} = 1 + 1 + 1 + 1 + 1 = 5 of 5 ⇒ Detected_Phase = GSRB. Here 1{P} = 1 when proposition P is true and 0 otherwise.'
)
s = s.replace(
    'L(t,a) = H(t) × C(t) × K(t) × f(A(t),R(t),S(t,a)) × 𝟙(Φ_phase=NAB).',
    'L(t,a) = H(t) × C(t) × K(t) × f(A(t),R(t),S(t,a)) × 1{Φ_phase = NAB}.'
)
# Repair retained Part XXV's former 27-part corpus-contract counts.
s = s.replace(
    'The derivative corpus synthesis and master index for the 27 retained numbered parts.',
    'The derivative corpus synthesis and master index for this edition’s 25 numbered Parts, Part XIX-B, and Appendices A–F.'
)
old_contract = ('Parts 01–26 = retained source components\nPart 27 = integrated synthesis/index\n\n'
                '1. Part 27 must not introduce a new architectural invariant absent from Parts 01–26 or the cited canonical specifications.\n'
                '2. Part 27 may synthesize, reorder, or summarize existing material, provided source status and uncertainty are preserved.')
new_contract = ('Parts I–XXIV, Part XIX-B, and Appendices A–F = retained source material\nPart XXV = integrated synthesis/index\n\n'
                '1. Part XXV must not introduce a new architectural invariant absent from the retained source material or the cited canonical specifications.\n'
                '2. Part XXV may synthesize, reorder, or summarize retained material, provided source status and uncertainty are preserved.')
assert s.count(old_contract)==1
s = s.replace(old_contract, new_contract)
s = s.replace('the 516-page interior is within that listed range.', 'the 519-page interior is within that listed range.')
s = s.replace(
    'only the approved removal of embedded draft TOC/page/source-range debris, repository-file references not reproduced in the book, and the global A-number replacement were applied.',
    'only the approved removal of embedded draft TOC/page/source-range debris and references to unreproduced repository files, the approved global A-number replacement, and the authorized Part-number and cross-reference updates needed to close the numbering gaps were applied.'
)

# Add a direct pointer to the relocated safety rationale.
s = s.replace('Safety and threat analysis: Read the\nSafety Rationale,',
              'Safety and threat analysis: Read Appendix B’s\nSafety Rationale,')

# Align retained formal-appendix term notes with the current model definitions and
# the evidence boundaries already stated in the authoritative scope notice.
term_note_repairs = [
    (
        '1. Define Accountability-Gated Systems (AGS = AGS + Accessories) and explain the 6-layer architectural stack from External Legitimacy Sources down to Implementation & Interfaces.',
        '1. Define Accountability-Gated Systems (AGS) and explain the 6-layer architectural stack from External Legitimacy Sources down to Implementation & Interfaces.'
    ),
    ('Formally: AGS = AGS + Accessories',
     'The core AGS framework may be paired with optional, bounded accessories; accessories do not create or transfer authority.'),
    (
        'The overarching framework itself, which ensures that all system actions are bound by strict accountability and human authorization.',
        'The author-proposed framework for conditioning specified system actions on external authorization and accountability gates; this definition does not claim that every action is controlled in a deployed system.'
    ),
    (
        'A high-security, address-constrained zone where AI processes occur, designed to prevent AI from ever acquiring origin authority or sovereignty.',
        'A proposed address-constrained zone for AI processes, intended to separate capability from origin authority. Its design does not prove that an AI can never acquire control or bypass its boundaries.'
    ),
    (
        'The legitimate right to act within a normative domain. Authority is distinct from power or capability and collapses when it cannot be answered for.',
        'In this proposal, permission to act within a defined scope and accountable process. Authority is distinct from capability and does not migrate through delegation, succession, or inherited structure; applicable legal authority is determined outside the model.'
    ),
    (
        'The immutable address from which all identities, permissions, and ownership are derived within the Orb Communicator Model.',
        'The model’s designated OCM origin coordinate for addressing and record linkage. It does not create a person’s identity, legal authority, operational permission, or ownership; those require separate records and authorization.'
    ),
    (
        'The legal accountability that arises when a system causes harm. The framework insists that liability must always rest with a human or institution (INV-AGENCY-001), explicitly rejecting the idea that an AI can be held legally or morally responsible for its actions.',
        'A legal determination governed by applicable law and evidence. INV-AGENCY-001 is a proposed accountability rule for naming answerable human or institutional principals; it does not decide an AI system’s legal or moral status or assign liability in a case.'
    ),
    (
        "An adversarial or runaway failure mode in which an augmented-intelligence system, neural interface, or institutional shell continues to actuate a human body, replay operator telemetry, or execute legal/financial actions in a human's name after verified conscious human intent or biological life has ceased (H_conscious(t) = 0). Under INV-CORPSE-001 and the Dead Hand Prohibition (ADJR-v1.0), live execution must halt immediately (L_exec(t) = 0), the system must drop into CWO witness/signaling mode, and the proposed model attributes responsibility to the controlling shell and accountable human principals; actual civil or criminal liability remains subject to applicable law and is not automatically reassigned by this text.",
        'A hypothetical adversarial failure scenario in which a neural interface, software system, or institutional shell continues body actuation or acts in a person’s name when current, action-specific human intent or authorization is absent, stale, or unverified. Independently established incapacity or biological cessation may be scenario inputs; H=0, a missing beacon, or stale telemetry does not establish them. Under INV-CORPSE-001 and ADJR-v1.0, the proposed response is to refuse new execution when a required gate fails and use a separately defined witness-only posture; implementation, physical response, and legal responsibility require independent validation or applicable law.'
    ),
    (
        'A revocable grant of authority allowing an agent or system to act on behalf of others. Delegation is bounded by scope, time, and answerability.',
        'A bounded assignment to carry out operational work for a principal under separate authorization. It may be limited or revoked under its stated process; it does not transfer underlying authority or change a non-revocable identity record.'
    ),
    (
        'One of the three operational phases (Phase II), representing a witness-only system that observes, records, and preserves provenance without the ability to act, command, or grant permission.',
        'A proposed governance/software label for a witness-only posture that observes, records, and preserves provenance. By definition it carries no command or authorization permission; an implementation’s operational limits must be tested.'
    ),
    (
        'One of the three operational phases (Phase III). A system in this phase treats its legitimacy as internal, acts and decides from its own center, allows refusal to be overridden, lets symbolism execute, and treats time as confirming its authority. It must declare its sovereignty, accept responsibility for enforcement, and acknowledge the loss of misuse resistance.',
        'An author-defined Ground-0 behavior label for a system observed to treat internal outputs as authority, override refusal, or execute symbolic inputs. It is a governance/software diagnostic, not a physical or religious state or a legal finding; classification requires stated observable predicates and evidence.'
    ),
    (
        'An accessory system that enforces external constraints on AI behavior, ensuring symbolic language is non-executable and actions are human-attributable.',
        'A proposed accessory intended to encode or support external constraints, separate symbolic inputs from executable commands, and improve attribution. Its name does not establish enforcement or security in a deployment.'
    ),
    (
        'A condition where the operational logic of a system becomes entirely invalid. In the AGS framework, if the human "Center Origin" is removed, the system does not just become less effective; its foundational equation for legitimacy drops to zero, making any further action logically impossible.',
        'An informal label for the proposed permission output L=0 when a required upstream gate or action-specific authorization fails. This is a model result; it does not prove that hardware is unable to act. Missing or stale signals do not diagnose death or revoke identity.'
    ),
    (
        "The mandatory structural lock used to declare a system's current operational phase and constraints.",
        'A proposed structured declaration of a system’s phase and constraints. It records a declaration, not a locked or verified state; implementation and behavior require separate checks.'
    ),
    (
        'A threat mitigation mechanism that tethers digital authority to physical reality, preventing anonymous leverage over the system.',
        'A proposed design pattern that links specified digital actions to an accountable physical context. It does not by itself prove identity or authority, or prevent anonymous leverage; any hardware enforcement requires validation.'
    ),
    (
        'The corporate or institutional entity that maintains the infrastructure. Under the principle of "Accountability," the provider must remain legally addressable and cannot hide behind the complexity of the technology to evade responsibility.',
        'A corporate or institutional entity that maintains infrastructure. The proposal calls for naming an answerable provider; applicable law, contracts, and facts determine actual legal duties or liability.'
    ),
]
for old, new in term_note_repairs:
    assert s.count(old) == 1, (old[:100], s.count(old))
    s = s.replace(old, new, 1)

# Keep OCM's origin as an address/provenance convention, not a source of identity,
# ownership, authority, or operational permission; correct finite-capacity claims.
ocm_repairs = [
    (
        'The Orb Communicator Model (OCM) defines a radiative, center-origin communication and governance system in which all participants derive identity, scope, and ownership from a single immutable origin point.',
        'The Orb Communicator Model (OCM) is a proposed radiative addressing, communication, and provenance model organized around a designated origin address. Identity records, operational scopes and grants, ownership claims, and authority remain separate; the address does not create or transfer them.'
    ),
    (
        'Unlike hierarchical or purely peer-to-peer systems, OCM separates communication freedom from ownership provenance, allowing lateral interaction while preserving a provable root of authority. This document formalizes the model, its addressing scheme, ownership semantics, and operational status and guarantees.',
        'The proposal separates lateral communication from namespace provenance while preserving a declared address root. An address or origin is not a source of authority or proof of legal ownership. This section describes the addressing conventions, model-level ownership labels, and stated operating objectives and limits; it does not establish guarantees for a deployment.'
    ),
    ('Maintain a single, verifiable origin of ownership',
     'Maintain one declared address origin and traceable namespace provenance'),
    ('Scale to global stakeholder systems without authority collapse',
     'Provide a design path for larger systems while keeping authority and authorization gates external to the address model'),
    ('The immutable address from which all identities, permissions, and ownership are derived.',
     'The designated OCM origin coordinate for addressing and record linkage. It does not create identity, authority, ownership, or operational permission; those require separate records and authorization.'),
    ('The total set of nodes whose identities derive from the center point.',
     'The set of nodes recorded as linked to the designated center address. The link is a namespace relation, not proof of identity, ownership, permission, or authority.'),
    ('0 designates Center Origin inheritance (0•000•000•0000)',
     '0 designates the Center Origin namespace (0•000•000•0000)'),
    ('Nodes at greater distance may operate autonomously while remaining within the ownership envelope of the orb.',
     'A node may operate only under separate, valid authorization for its declared scope; distance and namespace membership do not grant authority or permission.'),
    ('Resolution always routes to the center point.',
     'Resolution requests route to the designated center for review; routing identifies a review path but does not create authority or grant permission.'),
    ('Ownership in OCM is expressed through address derivation, not operational control.',
     'Within this proposed namespace model, ownership labels are expressed through address derivation rather than operational control; they are not evidence of legal title, identity, or authority.'),
    (
        'A node is considered owned by the center if:\nIts address cryptographically or structurally derives from the center\nIts namespace prefix remains intact\nBecause no node is self-originating:\nOwnership is provable\nForks are detectable\nShadow hierarchies are invalid',
        'Within the proposed namespace, a node may be labelled as linked to the center when its address derives from the declared center and its namespace prefix remains intact. This is a model-level provenance rule, not proof of legal ownership, identity, or authority. Address checks may flag certain duplicate or inconsistent records under stated assumptions; detection and isolation depend on implementation and evidence, and the model does not guarantee that forks or shadow hierarchies will be found or prevented.'
    ),
    (
        '360 radiative addresses representing full directional coverage\nUnlimited sub-instancing beneath each address\nGlobal stakeholder inclusion without root fragmentation',
        '360 values in the base address ring, with 000 reserved for the Center Origin and up to 359 peripheral-sector labels\nSub-instancing bounded by the declared RRR and IIII fields and any reserved or alias rules\nA proposed namespace for larger systems; actual capacity, inclusion, and integrity require a specified profile and deployment evidence'
    ),
    (
        'Detectable via prefix collision\nInvalidates conflicting systems',
        'A prefix collision can flag conflicting address records under the stated model rules\nThe collision does not by itself establish legal invalidity or identify the responsible party'
    ),
    (
        'Cannot claim ownership without origin prefix\nMay be isolated without disrupting the orb',
        'A record without the required prefix does not meet the model’s namespace-membership rule\nThis does not prove legal ownership or prevent independent networks; isolation without disruption is a proposed objective requiring deployment-specific testing'
    ),
    ('Local failures do not propagate unless routed through the center.',
     'The design objective is to contain local failures. Propagation depends on routes, shared dependencies, and implementation and must be tested.'),
    (
        'The communication and governance framework that defines how nodes interact and derive identity from a central origin.',
        'A proposed topology and bookkeeping model for communication and record linkage around a designated origin address. It does not create identity, authority, ownership, or operational permission.'
    ),
    ('8. Scaling and Completeness\nThe system supports:',
     '8. Scaling and Completeness\nThe proposed address scheme defines:'),
    ('11. Use Domains\nOCM is suitable for:',
     '11. Proposed Use Domains\nThe model considers these possible application areas:'),
    (
        '12. Foundational Reference\nThis specification is grounded in the stakeholder and addressing framework defined in the attached reference document, which enumerates radiative participants, distance groupings, and sectoral namespaces originating from the center address.',
        '12. Addressing Scope\nThis section defines its address fields and reserved values in §§2–4 above. The format is a proposal, not a validated global directory or an external canonical standard.'
    ),
]
for old, new in ocm_repairs:
    assert s.count(old) == 1, (old[:120], s.count(old))
    s = s.replace(old, new, 1)


# The current framework name is AGS; describe accessory composition in words, not
# as an ambiguous AGS = AGS+ expression.
old_glossary_anchor='**Conformance test** — A proposed test with stated inputs and pass criteria. A written checklist or passing illustrative example is not evidence that a real deployment exists or has passed the test.\n'
assert s.count(old_glossary_anchor)==1
s=s.replace(old_glossary_anchor,
            old_glossary_anchor + '**Corpse-Puppeting (INV-CORPSE-001)** — A proposed threat scenario in which a system continues body actuation or acts in a person’s name without current, valid action-specific authorization. H=0, missing or stale telemetry, and absent beacons require fail-closed handling under the model but do not establish consciousness, consent, coercion, incapacity, or death. The term is not a clinical or legal finding.\n',
            1)

# Leave a short locator where the removed Part XXVI used to sit in the main sequence.
part25_marker='\nPart XXV — Whole Corpus / Complete Work\n'
assert s.count(part25_marker)==1
s=s.replace(part25_marker,
            '\nFormer Part XXVI’s complete audit record is preserved in Appendix D.2; see Appendix D’s historical-record note.\n\nPart XXV — Whole Corpus / Complete Work\n',
            1)

# Reproducible folios from the verified 8.25 x 11 inch, 519-page render.
# These are printed page labels (body folio), not physical PDF page indices.
TOC_FOLIOS = {
    'A Reader’s Orientation': 'xviii',
    'Part I — The Core Book': '1',
    'Part II — Formalization': '25',
    'Part III — AGS: Accountability-Gated Systems': '29',
    'Part IV — OCM: Orb Communicator Model': '41',
    'Part V — AI Inner Shell': '47',
    'Part VI — Addressing and Spherical Topology': '51',
    'Part VII — Operator Model': '65',
    'Part VIII — Disc Primitives, Routing, and Lifecycle': '71',
    'Part IX — AGS Layering and Conformance': '85',
    'Part X — AGS Accessory Pack': '89',
    'Part XI — Ground-0 and Duty Collation': '97',
    'Part XII — Whyland Standards': '139',
    'Part XIII — Neural Atomic Bodies Compendium': '143',
    'Part XIV — Keyed Human–Machine Hybrid Controls': '147',
    'Part XV — Threat Modeling and Context-Dependent Guarantees': '157',
    'Part XVI — Atomic-Body Classes and Reactor Doctrine': '177',
    'Part XVII — Institutional Application': '201',
    'Part XVIII — Accountability in Keyed Hybrid Systems': '211',
    'Part XIX — Supply-Chain and Implanted-Device Threat Research': '221',
    'Part XIX-B — Illustrative Narrative Sandbox': '251',
    'Part XX — MicroConvergence and Signal Encoding': '295',
    'Part XXI — Policy and Governance Archive': '311',
    'Part XXII — Specification Series': '331',
    'Part XXIII — The Grand River Foundation (Fiction)': '365',
    'Part XXIV — Anti-Denial of Justice and NAB I/O': '395',
    'Part XXV — Whole Corpus / Complete Work': '451',
    'Appendices': '459',
    'Appendix A — Formal Constraint Equations and Term Notes': '460',
    'Appendix B — Safety Rationale for Adversarial Scenarios': '468',
    'Appendix C — Ground-0 Supplementary Exercises': '470',
    'Appendix D — Historical AI Audit Record': '472',
    'Appendix D.1 — Audit A: Claude': '473',
    'Appendix D.2 — Audit B: Anonymous AI via Arena.ai': '478',
    'Appendix E — Integration & Operations Guide': '485',
    'Appendix F — Signal Class Quick Reference': '486',
    'Consolidated Glossary': '487',
}
new_lines=[]
for line in s.splitlines():
    m=re.match(r'^\|\s*(.*?)\s*\|\s*(?:TBD|[0-9ivxlcdm]+)\s*\|\s*$',line,re.I)
    if m and m.group(1) in TOC_FOLIOS:
        line=f'| {m.group(1)} | {TOC_FOLIOS[m.group(1)]} |'
    new_lines.append(line)
s='\n'.join(new_lines)+'\n'

# Write candidate.
OUT.write_text(s,encoding='utf-8')
print(f'Wrote candidate: {OUT} ({len(s)} chars, {len(s.splitlines())} lines)')
