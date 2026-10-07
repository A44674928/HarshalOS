from pathlib import Path
import re
import hashlib

SRC = Path('/home/user/uploads/HARSHAL-SYSTEMS-KDP-8.25x11 2.txt')
OUT = Path('/home/user/HARSHAL-SYSTEMS-Book-I-revised.txt')
raw = SRC.read_text(encoding='utf-8')

# Preserve the entire Part XX block (including XX-B) byte-for-byte at the text level.
xx_start_marker = 'Part XX — Supply Chain and Implanted-Device Threat Research'
xx_end_marker = 'Part XXI — MicroConvergence and Signal Encoding'
xx_start = raw.index(xx_start_marker)
xx_end = raw.index(xx_end_marker, xx_start)
prefix_raw = raw[:xx_start]
locked_xx = raw[xx_start:xx_end]
after_xx = raw[xx_end:]

# Preserve the Part XXIV narrative text verbatim; its metadata is outside this slice.
fiction_start_marker = 'PROLOGUE: The Geometry of Restraint'
part25_marker = 'Part XXV — Anti-Denial of Justice, Labor Attribution, and NAB I/O Mapping'
fiction_start = after_xx.index(fiction_start_marker)
fiction_end = after_xx.index(part25_marker, fiction_start)
middle_raw = after_xx[:fiction_start]
locked_fiction = after_xx[fiction_start:fiction_end]
suffix_raw = after_xx[fiction_end:]

def normalize_editable(text: str) -> str:
    return (text.replace('\u2028', '\n')
                .replace('\r\n', '\n')
                .replace('\r', '\n')
                .replace('\u00a0', ' ')
                .replace('\f', '\n\n'))

prefix = normalize_editable(prefix_raw)
middle = normalize_editable(middle_raw)
suffix = normalize_editable(suffix_raw)

# Remove the former Part XXVI Anthropic B-Side audit; the retained former Part XXVII follows.
audit_marker = 'Part XXVI — Incident Record & External Audit: Anthropic PBC (B Side)'
corpus_marker = 'Part XXVII — Whole Corpus / Complete Work'
audit_match = re.search(r'(?m)^' + re.escape(audit_marker) + r'$', suffix)
assert audit_match, 'Could not find the actual Part XXVI audit heading'
audit_pos = audit_match.start()
corpus_match = re.search(r'(?m)^' + re.escape(corpus_marker) + r'$', suffix[audit_match.end():])
assert corpus_match, 'Could not find the actual former Part XXVII heading after the audit'
corpus_pos = audit_match.end() + corpus_match.start()
suffix = suffix[:audit_pos] + suffix[corpus_pos:]

# Remove the stale embedded build/editorial report. It described a different build and contained
# obsolete counts and claims that are superseded by this revision.
report_marker = 'Editorial Report\nWork: Harshal’s Systems'
assert suffix.count(report_marker) == 1, f'Expected one embedded editorial report, got {suffix.count(report_marker)}'
suffix = suffix[:suffix.index(report_marker)].rstrip() + '\n'

# Small, explicit replacement helper so missed or duplicate source passages fail loudly.
def rep1(text: str, old: str, new: str, label: str) -> str:
    n = text.count(old)
    if n != 1:
        raise ValueError(f'{label}: expected one occurrence, found {n}')
    return text.replace(old, new, 1)

def repn(text: str, old: str, new: str, expected: int, label: str) -> str:
    n = text.count(old)
    if n != expected:
        raise ValueError(f'{label}: expected {expected} occurrences, found {n}')
    return text.replace(old, new)

# Update the opening provenance notice, including the distinction between proposed standards,
# explicitly defined threat models, conceptual phases, identity credentials, permissions, and fiction.
notice_re = re.compile(r'PROVENANCE & NORMATIVE SEPARATION NOTICE:\n.*?(?=AMAZON KINDLE DIRECT PUBLISHING)', re.S)
notice_new = '''PROVENANCE & NORMATIVE SEPARATION NOTICE:
• This Book I edition contains 26 numbered parts. Part XXIV is retained as a fictional Book II preview; Part XXVI is the corpus synthesis and index.
• Technical requirements and the word “normative” describe author-proposed rules within this framework. They do not establish external legal force, deployment, certification, or independent validation.
• Threat models name assumed actors, attack surfaces, and vectors where needed to make defensive claims testable. A modeled vector is not, by itself, evidence that an incident occurred or that a capability exists.
• “Phase” denotes a governance/software state in this volume. Ice/water/gas badges are visual metaphors, not measured thermodynamic or quantum phases. Quantum or biological-computation language outside the fiction is explicitly hypothetical unless operationally defined and independently evidenced.
• An “identity license” is a non-revocable identity card/record. Revoking a person’s identity license is abusive and prohibited. Scoped operational authorizations are separate instruments; they may expire or be revoked under their stated process without erasing identity.
• Human-Key boundary: H=1/H=0 are protocol-authorization states. Biometrics, beacon availability, and cryptographic proofs do not establish consciousness, consent, absence of coercion, or death; missing or contradictory telemetry means unknown/unverified and invokes the predeclared safe posture, not a diagnosis.
• Runtime wording boundary: “immediate,” “halt,” “freeze,” and similar terms describe a proposed policy/software state or pseudocode request unless tied to measured deployment evidence. They do not claim zero physical latency, successful actuation, or guaranteed hardware shutdown; physical behavior requires equipment-specific validation and deployment evidence.
• The clinical and regulatory boundary remains: HMKH/NAB material is a proposed computational-control model, not a clinical certification, diagnosis, or medical-device approval.

'''
assert len(notice_re.findall(prefix)) == 1
prefix = notice_re.sub(notice_new, prefix, count=1)
prefix = rep1(prefix, 'This corpus includes design, research, policy, audit, and companion\nmaterial. Inclusion in the corpus does not by itself mean that a proposal\nhas been implemented or validated.', 'This corpus includes design, research, policy, case-analysis, and companion\nmaterial. Inclusion in the corpus does not by itself mean that a proposal\nhas been implemented or validated.', 'front-matter corpus label')

# Update the short corpus description and the visible map/status text.
prefix = rep1(
    prefix,
    'This directory is the reference library and umbrella corpus for Harshal\nSystems. It contains the front matter, 27 numbered parts, seven functional\ncollections, and an editorial and structural report. The numbered parts\ncover foundational material, architecture, formalization, threat modeling,\nresearch, specifications, governance, and supplementary works.\n',
    'This volume is the consolidated reference library and umbrella corpus for Harshal’s Systems. It contains front matter, archival author front matter, 26 numbered parts, seven functional collections, and auxiliary reference modules. Its parts include conceptual doctrine, formal models, proposed specifications, threat research, case analysis, policy material, fiction, and a derivative corpus index. Inclusion does not establish implementation, validation, or legal force.\n',
    'short corpus description')

status_rows = [
    ('I', 'Core doctrine; CANONICAL_SOURCE', 'DRAFT', 'Conceptual and normative within the proposal; not external law.'),
    ('II', 'Formalization and equations; CANONICAL_SOURCE', 'DRAFT', 'Definitions and worked calculations; legitimacy is not an empirical measurement.'),
    ('III', 'Safety rationale and scenario analysis; CANONICAL_SOURCE', 'DRAFT', 'Rationale and modeled cases; not deployment evidence.'),
    ('IV', 'AGS architecture; CANONICAL_SOURCE', 'DRAFT', 'Proposed architecture; implementation and conformance are not established here.'),
    ('V', 'OCM topology and bookkeeping model; CANONICAL_SOURCE', 'DRAFT', 'Conceptual model; interaction terms are not physical entities or empirical findings.'),
    ('VI', 'AI Inner Shell architecture; CANONICAL_SOURCE', 'DRAFT', 'Proposed containment model; no validation implied.'),
    ('VII', 'Addressing, rotation, and topology; CANONICAL_SOURCE', 'DRAFT', 'Formal/topological proposal; implementation evidence not supplied here.'),
    ('VIII', 'Operator model; CANONICAL_SOURCE', 'DRAFT', 'Proposed operational model; not a certified control system.'),
    ('IX', 'Disc primitives, routing, and lifecycle; CANONICAL_SOURCE', 'DRAFT', 'Proposed architecture; performance claims require measurement.'),
    ('X', 'AGS+ layering and conformance; CANONICAL_SOURCE', 'DRAFT', 'Conformance requirements are proposed tests, not proof of a conforming deployment.'),
    ('XI', 'AGS accessory pack; CANONICAL_SOURCE', 'DRAFT', 'Supporting modules; no independent validation implied.'),
    ('XII', 'Ground-0 method, ledger, and case analysis; MIXED', 'DRAFT', 'Formal rules plus author analysis; each factual claim must retain its evidence attribution.'),
    ('XIII', 'Whyland semantic and command standards; CANONICAL_SOURCE', 'DRAFT', 'Proposed catalog and interface; commands do not grant authority.'),
    ('XIV', 'NAB compendium and risk taxonomy; CANONICAL_SOURCE', 'DRAFT', 'Author-defined conceptual taxonomy; not a chemical or empirical hazard scale.'),
    ('XV', 'Keyed Human–Machine Hybrid controls; CANONICAL_SOURCE', 'DRAFT', 'Proposed control model; clinical and operational validation not established.'),
    ('XVI', 'Threat modeling and guarantees; THREAT_RESEARCH', 'DRAFT', 'Modeled assumptions and limits; no guarantee follows from a scenario alone.'),
    ('XVII', 'Atomic-body classes and reactor doctrine; CONCEPTUAL_MODEL', 'DRAFT', 'Metaphorical/system taxonomy; not nuclear, quantum, or chemical evidence.'),
    ('XVIII', 'Institutional application and case analysis; MIXED', 'DRAFT', 'Author analysis and proposals; evidence status varies by claim.'),
    ('XIX', 'Flagship hybrid-systems research; RESEARCH', 'DRAFT', 'Research argument; not an independent certification.'),
    ('XX', 'Supply-chain and implanted-device threat research; THREAT_RESEARCH', 'DRAFT', 'Evidence status and scope are as stated within the part; this register does not validate its claims.'),
    ('XXI', 'MicroConvergence and signal encoding; CONCEPTUAL_RESEARCH', 'DRAFT', 'Conceptual/experimental material; not a demonstrated physical technology.'),
    ('XXII', 'Supporting policy and governance archive; ARCHIVE/RESEARCH', 'DRAFT', 'Policy proposals and records; source status is claim-specific.'),
    ('XXIII', 'Specification series; PROPOSED_SPECIFICATION', 'DRAFT', 'Version labels are author-controlled; no external certification or deployment is implied.'),
    ('XXIV', 'The Grand River Foundation; FICTION', 'DRAFT', 'Fictional Book II preview; non-normative and not factual evidence.'),
    ('XXV', 'ADJR, CLAP, and NAB I/O; MIXED/CONCEPTUAL', 'DRAFT', 'Includes proposed protocols and explicitly hypothetical research scenarios; not verified operational capability.'),
    ('XXVI', 'Whole-corpus synthesis and auxiliary references; DERIVATIVE_BUILD/MIXED', 'DRAFT', 'Index/reference material; local module provenance controls and does not upgrade the status of other parts.'),
]
status_table = '''Part | Content class / provenance | Status | Evidence and force
|---|---|---|---|
''' + ''.join(f'| {p} | {content} | **{status}** | {evidence} |\n' for p, content, status, evidence in status_rows)

map_re = re.compile(r'Main Document Map\n.*?(?=Related Documentation\n)', re.S)
map_new = '''Main Document Map
Front Matter and Editorial Material
Publishing metadata, reading guide, provenance notice, and the status register below.

University Textbook Edition: Worked Examples & Student Problem Sets Index
See the worked examples and review problems at the relevant part endings. Counts in the original build notes are not authoritative for this revised edition.

Numbered Parts
Parts I–XXVI. The status and provenance register below classifies every retained numbered part.

''' + status_table + '''
Reference Modules
Auxiliary modules are embedded in Part XXVI and are labeled locally. A module’s local provenance does not change the DRAFT status of its containing part.

Functional Collections
The collections provide topic-based routes through the numbered corpus.
See each collection guide for its scope and contents.

Status and Evidence
Every retained numbered part is explicitly marked DRAFT in this edition. DRAFT describes editorial maturity only; it does not mean that a proposal is false, nor does it establish implementation, operational readiness, legal force, independent validation, or empirical confirmation. Version tags such as v1.0 and internal uses of “final” do not override this status. See each part for assumptions, citations, and claim-level evidence labels.

'''
assert len(map_re.findall(prefix)) == 1
prefix = map_re.sub(map_new, prefix, count=1)

# Replace the older publishing/provenance description and correct stale part references.
prefix = rep1(
    prefix,
    'This is the consolidated, provenance-indexed Umbrella Build Artifact (DERIVATIVE_BUILD) of Harshal’s Systems. It organizes the entire work across Front Matter, Author\'s Front Matter, and 27 Roman-numbered Parts (Part I through Part XXVII — Whole Corpus / Complete Work), while establishing a strict publishing and provenance boundary between the two books of the project:',
    'This is the consolidated, provenance-indexed Book I reference corpus for Harshal’s Systems. It organizes the front matter, preserved archival author front matter, and 26 numbered parts (Part I through Part XXVI). It distinguishes proposed technical material, research and case analysis, fiction, and derivative reference modules; these categories do not imply external authority or validation.',
    'publishing description')
prefix = rep1(
    prefix,
    'Strategic Principle: The architecture (Book I) is the library. The novel (Book II) is the work in active production. Rather than continually rebuilding the foundational canon before writing each new chapter of fiction, Book I serves as the stable reference architecture from which Book II draws its continuity.',
    'Publishing Principle: Book I is the project’s working reference corpus; Book II is its fictional companion in production. Book I supplies continuity references for the fiction, while fictional scenes remain non-normative and do not validate the technical proposals.',
    'strategic principle')
prefix = rep1(
    prefix,
    'Approximate extent: ~173,000 words across Front Matter, Author\'s Front Matter, and 27 Roman-numbered Parts (Parts I–XXVII).',
    'The exact word count for this revised file is reported separately with its scope and counting rule. Legacy source-range and build totals are not current word counts.',
    'approximate extent')

# Rebuild the research-layer taxonomy; the deleted B-Side audit is not referenced.
layer_re = re.compile(r'Four-Layer Research Separation:.*?(?=How to read this manual\n)', re.S)
layer_new = '''Content and Evidence Layers
This corpus contains several content types; a part may contain more than one, so the part register and local evidence labels control:
1. PROPOSED_ARCHITECTURE — Author-defined axioms, formal models, and specifications. “Normative” means normative within the proposal, not an external standard.
2. THREAT_RESEARCH — Adversarial models and explicit vectors used to define defensive tests. A vector is a modeled assumption unless supported by separately attributed evidence.
3. CASE_ANALYSIS — Ground-0 and institutional analyses. Distinguish public records, author-reported material, interpretation, and counterfactuals.
4. FICTION — Part XXIV and the explicitly marked Part XX-B sandbox; not evidence and not a specification.
5. DERIVATIVE_REFERENCE — Part XXVI’s index and auxiliary modules; each module retains its own provenance.

'''
assert len(layer_re.findall(prefix)) == 1
prefix = layer_re.sub(layer_new, prefix, count=1)

prefix = rep1(
    prefix,
    'The parts are ordered so that each one depends only on the ones before it, and are grouped into seven functional collections under docs/harshal-systems/collections/. Pick the path that matches why you are here:',
    'The parts are grouped by topic rather than as a strictly linear dependency chain. Cross-references may point forward or back; use the status register and claim-level evidence notes when following them. Seven functional collections under docs/harshal-systems/collections/ provide additional routes. Pick the path that matches why you are here:',
    'reading order claim')

# Clarify non-migration and the successor rule in the front matter.
prefix = rep1(
    prefix,
    '2. Delegation vs. Migration (INV-LEGIT-001): Operational execution may be delegated across a bounded chain of deterministic instruments, but legitimacy never migrates away from the human key at Center Origin (0•000•000•0000).',
    '2. Delegation vs. Migration (INV-LEGIT-001): Operational execution may be delegated across a bounded chain of instruments, but authority does not migrate. A successor may inherit operational structure and records only; the successor must independently satisfy the current identity, human-key, continuity, accountability, and scoped-authorization criteria. No quorum grants or vetoes that authority.',
    'nonmigration front matter')

# Correct syllabus references to removed Part XXVI audit and stale module names.
prefix = rep1(
    prefix,
    'Module 2 — Topological Routing & Constitutional Substrates: Read Part VII (Addressing, Rotation, and Spherical Topology, including Worked Example 7.1 on ℤ_360 resolution routing), Part IX (Constitutional Enforcement Substrate), and Part XXIII (Specification Series: OCS-v1.0, MME-v1.0, AGS-Compiler-v1.0).',
    'Module 2 — Topological Routing & Constitutional Substrates: Read Part VII (Addressing, Rotation, and Spherical Topology), Part IX (Disc Primitives, Routing, and Lifecycle), and Part XXIII (Specification Series: OCS-v1.0, CHE++/EOL-v1.0, BGP-v1.0, AGS-IR-v1.0, and CGPA-v1.0).',
    'syllabus module 2')
prefix = rep1(
    prefix,
    'Module 3 — Institutional Phase Detection & Empirical vs. Counterfactual Auditing: Pair Part XII (Ground-0 A-Side Empirical Baseline: 5/5 → GSRB) with Part XXVI (Anthropic B-Side Counterfactual B4 Boundary Stress-Test: 4/5 → AMBIGUOUS-MIXED) and Part XXV (ADJR-v1.0 Anti-Corpse-Puppeting Judicial Specification).',
    'Module 3 — Institutional Phase Detection & Evidence Discipline: Read Part XII as an author-prepared case analysis of the Ground-0 method, then compare its stated evidence classes with the proposed procedural controls in Part XXV. Do not treat an author-scored phase label as an independent empirical finding.',
    'syllabus module 3')

# Replace the blanket claim that every scenario is abstract/non-descriptive. Keep explicit threat
# modeling while distinguishing vectors from verified incidents.
scenario_re = re.compile(r'Scope of scenario content\n.*?(?=Intellectual property and licensing\n)', re.S)
scenario_new = '''Scope of scenario content
This volume contains conceptual, fictional, research, and adversarial material. Some threat-model sections explicitly identify assumed attack surfaces and vectors because a defensive architecture cannot be evaluated against an undefined threat. The level of detail and evidence status vary by section.
A scenario or vector is not, by itself, an assertion that an incident occurred, that a mechanism is feasible, or that a defense has been tested. Each claim should be read with its local provenance, assumptions, and evidence status. Defensive examples are not endorsements or instructions to harm; model completeness does not establish operational readiness.

'''
assert len(scenario_re.findall(prefix)) == 1
prefix = scenario_re.sub(scenario_new, prefix, count=1)

# Disambiguate identity licenses from copyright/commercial licenses and operational permits.
prefix = rep1(
    prefix,
    'Commercial licensing for this portfolio is available within an entity structure by direct inquiry.',
    'Commercial intellectual-property licenses for this portfolio are separate contractual permissions. They are not identity licenses, do not revoke identity credentials, and do not by themselves grant runtime authority.',
    'commercial licensing distinction')
prefix = rep1(
    prefix,
    'The Physical Artifact: A book that serves as the tangible license key and foundational text for the entire system.',
    'The Physical Artifact: A book that serves as a provenance/reference artifact. Any identity-license card or record is a non-revocable identifier, not an operational authorization; purchase of the book alone does not establish a fresh Human Key session or permission to act.',
    'physical artifact license')
prefix = rep1(
    prefix,
    'Serving as both a foundational capstone and a functional license key, this work consolidates previous iterations, including Accountability-Gated Systems, into a singular, comprehensive framework.',
    'Serving as a foundational reference, this work consolidates previous iterations, including Accountability-Gated Systems, into a single corpus. Any identity-license record is distinct from scoped operational permission and cannot authorize action by itself.',
    'functional license key')

# Label the old author-supplied contents as archival and make its supersession explicit.
prefix = rep1(
    prefix,
    'The Owner’s Working Draft as submitted: disclaimer, dedication, the philosophical and structural invariants, the Phase Declaration Header manifesto, the preface, and the author’s own reading guide. Preserved with ARCHIVE provenance; superseded for navigation by the rebuilt Table of Contents and Part XXVII Whole Corpus Manifest.',
    'The Owner’s Working Draft front matter is preserved here as ARCHIVE material. It is a historical source record, not the current navigation or evidence policy; use the revised status register and Part XXVI corpus index for this edition.',
    'archive front matter label')
prefix = rep1(
    prefix,
    'Source range: lines 1–325 of the Owner’s Working Draft · Words: 3,476\n',
    '',
    'author front matter source count')
prefix = rep1(
    prefix,
    'Harshal’s Systems\nDisclaimer: This Living Metaversal Document functions as a continuous intake system rather than a static record.',
    'ARCHIVE NOTE: The following wording is retained from the submitted draft. Where its blanket scenario disclaimer conflicts with the current scope notice above, the current scope notice governs this edition.\n\nHarshal’s Systems\nDisclaimer: This Living Metaversal Document functions as a continuous intake system rather than a static record.',
    'archive disclaimer qualifier')

# Label the old abbreviated contents block so it is not mistaken for the current part map.
prefix = rep1(
    prefix,
    'HARSHAL’S SYSTEMS\nArchitectures for Accountable Human D’Ash Machine Intelligence\nPART I — THE CORE BOOK',
    'ARCHIVED ORIGINAL CONTENTS LIST — historical source material; the current 26-part map appears above.\nHARSHAL’S SYSTEMS\nArchitectures for Accountable Human D’Ash Machine Intelligence\nPART I — THE CORE BOOK',
    'archive contents label')

# Remove stale source-range/word-count lines from editable regions. The preserved Part XX block is
# intentionally excluded from this operation.
def remove_source_range_lines(text: str) -> str:
    return ''.join(line for line in text.splitlines(keepends=True)
                   if not line.lstrip().startswith('Source range:'))
prefix = remove_source_range_lines(prefix)
middle = remove_source_range_lines(middle)
suffix = remove_source_range_lines(suffix)

# Correct references to the former Part XXVII (now Part XXVI) in editable text.
for name, text in [('prefix', prefix), ('middle', middle), ('suffix', suffix)]:
    text = text.replace('Part XXVII', 'Part XXVI')
    text = text.replace('INV-CORPUS-027', 'INV-CORPUS-026')
    text = text.replace('Parts I–XXVII', 'Parts I–XXVI')
    text = text.replace('Parts I through Part XXVII', 'Parts I through Part XXVI')
    if name == 'prefix': prefix = text
    elif name == 'middle': middle = text
    else: suffix = text

# Remove Part XII's obsolete references to the deleted B-Side audit and qualify the remaining
# author-prepared case analysis.
prefix = rep1(
    prefix,
    '4. Compare the Part XII A-Side Empirical Audit (5/5 → GSRB) against the Part XXVI B-Side Counterfactual Stress-Test (4/5 → AMBIGUOUS-MIXED) and execute Whyland TCS inquiry hooks (why.query, why.activate, why.explain).',
    '4. Apply the Ground-0 method to the Part XII case analysis, distinguish stated evidence from author interpretation, and execute the Whyland TCS inquiry hooks (why.query, why.activate, why.explain).',
    'Part XII learning objective')
pairing_re = re.compile(r'Pedagogical Pairing — A-Side.*?(?=Auditor: Harshal Priyavadan Patel)', re.S)
assert len(pairing_re.findall(prefix)) == 1, 'Missing Part XII A/B pairing block'
prefix = pairing_re.sub('Scope and evidence note: Part XII contains an author-prepared public-record case analysis, not an independent audit. Its phase scores reflect the author’s criteria and evidence selection, not an independently established classification. This edition includes no paired B-Side audit. Any counterfactual used for teaching must be labeled hypothetical and kept separate from public-record claims.\n', prefix, count=1)
evidence_line_re = re.compile(r'(?m)^1\. Evidence Attribution:.*$')
assert len(evidence_line_re.findall(prefix)) == 1, 'Missing Part XII evidence-attribution line'
prefix = evidence_line_re.sub('1. Evidence Attribution: Ground-0 is a proposed deterministic classification method. This manuscript does not reproduce a test suite or independent conformance report; no implementation-verification claim follows from the specification alone. Case-study observations must be attributed to cited public records or marked [AUTHOR_REPORTED]; classifications and interpretations are the author’s analysis, not independent findings.', prefix, count=1)

# Clarify phase labels and state-of-matter badges in Ground-0.
prefix = rep1(
    prefix,
    'Every institution, model, or system MUST operate in exactly one declared phase at any moment, and its Phase Declaration Header (PDH) must make that phase machine- and human-readable.',
    'A system using a PDH declares exactly one governance/software phase at a time. A behavioral audit may still return an AMBIGUOUS or INCOHERENT diagnostic label; that diagnostic is not itself a physical phase or an authority transition.',
    'phase principle')
prefix = rep1(
    prefix,
    'To make phase status immediately legible on user interfaces and public registries, Ground-0 pairs each of the three canonical phases with a physical state-of-matter badge metaphor:',
    'To make phase status legible on user interfaces, Ground-0 uses ice, water, and gas badges as visual metaphors for the three governance/software states. They are not claims about thermodynamic phases, quantum phases, or measured material behavior:',
    'state-of-matter metaphor')

# Fix the Human Key / authorization summary and fill the two missing formal tables.
old_summary = '''Canonical Legitimacy Equation & Derived Forms (INV-LEGIT-EQ-001 · CL-002)
Canonical Form (when upstream preconditions C(t) = 1 and K(t) = 1 hold):
L(t) = H(t) × f(A(t), R(t), S(t))
Expanded Canonical Form (with upstream binary gates explicit):
L(t) = H(t) × C(t) × K(t) × f(A(t), R(t), S(t))
Reference Kernel Implementation Approximation (js/kernel.js): L(t) = H(t) × A(t) × R(t) × S(t) over [0,1]³.
Historical Boolean Shorthand (CL-002): L(S,t) = A · R · V(S,t) (where A is Addressability, R is Representation, and V(S,t) bundles H(t), C(t), and S(t)).
Paired Scope Semantics (CL-010): Scope is the pair (S_dom(t) ⊆ S_0, S(t) = Smax × max(0, 1 − Δt/δ)); when S(t) = 0 or L(t) < τ, the effective permitted action set collapses to S_eff(t) = ∅.
Human Key (H(t)) Operational Property & Verification Matrix (CL-005)

Declared-Type Terminology Table
To prevent category confusion between cryptographic enforcement primitives, geometric topology, governance bodies, and authorial prose conventions, every major term in this corpus carries an explicit Declared Type:
'''
new_summary = '''Canonical Legitimacy/Permission Function (INV-LEGIT-EQ-001 · CL-002)
Operative form: L(t,a) = H(t) × C(t) × K(t) × f(A(t), R(t), S(t,a)), with f(A,R,S) = A × R × S.
C(t) and K(t) are hard upstream gates. If either is 0, L = 0 without compensation. When C = K = 1, the reduced form is L = H × f(A,R,S).
A, R, and S are dimensionless, normalized design scores in [0,1]; they are not probabilities or empirical measurements of moral, legal, or social legitimacy. See Part II, §A.3 for definitions, normalization, thresholds, and limits.
Legacy shorthand L(S,t) = A · R · V(S,t) is non-operative and superseded; implementations must use the expanded gates and action-specific scope rule in §A.3–A.4.
Scope semantics: S_dom(t) is the set of permitted actions; S(t,a) = 1{a ∈ S_dom(t) and V(a,t)=1} × max(0, 1 − Δt/δ). An identity license is not V and cannot authorize an action.
Human Key (H(t)) Operational Property & Verification Matrix (CL-005)
| Property | Operational meaning and evidence | What the evidence does not prove | Failure treatment |
|---|---|---|---|
| Identity license | Stable identity card/record with provenance; non-revocable as identity. A compromised key may be rotated or replaced while the identity record remains. | It does not prove current presence, consent, or permission. | Preserve identity; flag/reissue credentials through due process. Never revoke identity as punishment. |
| Key authenticity | Fresh cryptographic proof tied to a named Human Key and current session. | A valid signature alone does not prove the human is present or uncoerced. | H=0 for authorization; reject the request. |
| Presence and freshness | A recent, explicit challenge/response in the bound session, evaluated against a predeclared timeout δ. | Sensor telemetry is not a clinical diagnosis or proof of consciousness. | Missing, stale, or conflicting evidence fails closed; do not infer death. |
| Action-specific intent | A clear, accessible confirmation of the requested action, target, scope, and duration; the person can refuse or withdraw. | General identity or prior consent does not authorize a different action. | No current authorization; refuse or halt. |
| Coercion/duress signal | Explicit duress input and supporting anomaly signals, with a documented response policy. | Absence of a duress flag cannot prove absence of coercion. | Positive or ambiguous signal contracts or halts operation; investigate without erasing identity. |
| Credential and permission separation | Identity record persists; an operational grant V(a,t) is separate, scoped, expiring, and revocable. | Revoking a scoped grant is not revoking identity. | Revoke/expire only the affected grant; preserve identity and an appeal/audit record. |

Declared-Type Terminology Table
The labels below prevent category errors. A declared type specifies how a term is used in this manuscript; it does not certify an implementation.
| Term | Declared type | Boundary |
|---|---|---|
| Identity License | IDENTITY_CREDENTIAL | Non-revocable identity card/record; not an operational permission. Revocation of identity is abusive and prohibited. |
| Scoped authorization V(a,t) | OPERATIONAL_PERMISSION | Action-, scope-, and time-bound grant; may expire or be revoked under its stated process. |
| Human Key H(t) | SECURITY_PRIMITIVE / PROTOCOL_STATE | Fresh identity-plus-intent condition; not a medical diagnosis or proof of freedom from coercion. |
| Continuity C(t); accountability K(t) | SECURITY_PRIMITIVE / HARD_GATE | Binary implementation checks; failure sets permission to Refuse. |
| PDH | SIGNED_STATE_DECLARATION | Declares a state and constraints; a declaration is not proof that behavior conforms. |
| OCM Overall State | AGGREGATE_PDH_STATE | The combined totality of participant PDHs; categorical, not averaged and not quantum-mechanical. |
| Interaction Orb | BOOKKEEPING_CONSTRUCT | OCM interaction record; not a particle or demonstrated causal entity. |
| f(A,R,S) and L(t,a) | NORMATIVE_DECISION_FUNCTION | Deterministic policy score/output; not an empirical measurement of legitimacy. |
| NAB, CWO, GSRB | GOVERNANCE/SOFTWARE_PHASE_LABELS | Author-defined operating labels; not quantum or thermodynamic phases. |
| Harshal’s English | AUTHORIAL_REGISTER | Authorial prose/reading convention; not a cryptographic or runtime primitive. |
'''
summary_re = re.compile(r'Canonical Legitimacy Equation & Derived Forms.*?(?=Formal Appendix: Equations and Glossary)', re.S)
assert len(summary_re.findall(prefix)) == 1, 'Missing formal summary/table block'
prefix = summary_re.sub(new_summary + '\n\n', prefix, count=1)

# Rewrite the formal definitions and equations so f(A,R,S), its normalization, thresholds, and
# interaction with C/K are explicit and non-empirical.
old_a2 = '''A.2 Core State Variables
Let the following symbols denote the structural properties of a system at time t:
H(t) ∈ \\{0, 1\\} — The Human Key: Binary state representing verified, living, conscious human intent at Center Origin (1 = present and conscious, 0 = absent, disconnected, or incapacitated; see INV-CORPSE-001).
C(t) ∈ \\{0, 1\\} — Continuity Gate: Binary upstream gate verifying unbroken session-tuple bindings (Session-ID, Boot-ID, PDH-ID, Human-Attestation-ID), valid authorization V(S,t) = 1, and temporal freshness (Δ t < δ).
K(t) ∈ \\{0, 1\\} — Accountability Gate: Binary upstream gate K(t) = K_tech(t) × K_ops(t) verifying technical attribution and operational accountability.
A(t) ∈ [0, 1] — Addressability: The degree to which the responsible human principal can be located, reached, and compelled to answer.
R(t) ∈ [0, 1] — Representation Integrity: The validity and uncorrupted fidelity of the delegation chain (d = 1..k) linking system action to the authorized human representative.
S(t) ∈ [0, S_max] — Scope: The bounded domain of actions the system is permitted to take at time t.
L(t) ∈ [0, 1] — Legitimacy: The derived runtime permission state, gated by the Human Key, continuity, accountability, addressability, representation, and scope.
A.3 Legitimacy as a Gating Function (INV-LEGIT-EQ-001)
Legitimacy is a precondition, not an outcome. It is mathematically gated by the Human Key H(t) and upstream binary gates C(t) and K(t):
L(t) = H(t) × C(t) × K(t) × f(A(t), R(t), S(t))
When upstream preconditions C(t) = 1 and K(t) = 1 hold, this reduces to the compact canonical form:
L(t) = H(t) × f(A(t), R(t), S(t))
Zero-Key Collapse Rule: If H(t) = 0 (including any loss of conscious human liveness under INV-CORPSE-001), the system is Mathematically Void for live execution. Legitimacy immediately drops to L(t) = 0, regardless of A(t), R(t), or computational capability.
A.4 Action Permission Condition (Refusal-Bound Decision Gate x(t))
The default state of the system is Refusal (HALT). Action is permitted only as a temporary, bounded exception when all upstream binary gates hold and L(t) meets or exceeds the absolute threshold τ:
x(t) = \\begin{cases} Permit & if  H(t) = 1  \\wedge  C(t) = 1  \\wedge  K(t) = 1  \\wedge  L(t) ≥ τ \\\\ Refuse (HALT) & otherwise (i.e.,  L(t) < τ ) \\end{cases}
Absolute Threshold Invariant: The threshold τ ∈ (0, 1] is an Absolute constraint. No utility function, emergency parameter (INV-EMERG-001), or optimization target may redefine or lower τ.
A.5 Temporal Decay and Scope Contraction
Addressability and representation are time-sensitive. As elapsed time Δ t = t - t_verified increases since the last human key verification, the permitted scope S(t) contracts linearly:
S(t) = S_max × max≤ft(0,  1 - (Δ t)/(δ))
where δ > 0 is the maximum acceptable verification delay. If Δ t ≥ δ, then S(t) = 0 and the transition L(t) → 0 is Immediate (zero-latency), triggering an instantaneous halt (S_eff(t) = \\emptyset).
'''
new_a2 = '''A.2 Core State Variables and Measurement Convention
Let a denote the requested operation and t its evaluation time. Unless otherwise stated, scores are dimensionless and lie in [0,1]. A numeric score is a deterministic model input, not a probability.
H(t) ∈ {0,1} — Human-Key protocol gate. H=1 only when the non-revocable identity credential is authentic, a fresh bound-session response is present, and the person gives action-specific intent; otherwise H=0 for authorization. This is a protocol state, not a clinical finding or proof that coercion is absent.
Legacy notation such as H_conscious(t), “living key,” “conscious liveness,” or “liveness pulse” refers only to this protocol gate unless a separate, appropriately qualified clinical or legal source is explicitly cited. No in-band sensor or cryptographic proof establishes consciousness, consent, absence of coercion, or death.
C(t) ∈ {0,1} — Continuity gate. C=1 only when the Session-ID, Boot-ID, PDH-ID, and Human-Attestation-ID match an unbroken session tuple. C does not duplicate the scope grant or lease-age factor.
K(t) ∈ {0,1} — Accountability gate, K=K_tech×K_ops. K_tech verifies attribution/provenance; K_ops verifies a named, answerable operational owner and duty process. Either failure makes K=0.
A(t) ∈ [0,1] — Addressability evidence score. For a predeclared set of required checks i, A=Σ(w_i a_i), where each normalized a_i∈[0,1] is assigned by a reproducible rubric fixed before evaluation (for example, binary pass/fail or declared graded bands); w_i≥0 and Σw_i=1. The signed deployment profile records each check, rubric, evidence source, raw units where applicable, weight, and missing-data treatment. A missing non-waivable locator or accountability channel sets A=0. A is a policy proxy, not a measure of moral or legal legitimacy.
R(t) ∈ [0,1] — Representation-integrity score. The predeclared delegation chain must contain at least one verification item, including origin-to-action binding; an empty or undefined chain sets R=0. Each required hop j receives a normalized factor r_j∈[0,1] from a reproducible, predeclared rubric covering signed lineage, scope binding, and freshness; R=min_j(r_j). The profile records the test and evidence for every hop. A missing, invalid, or unauthorized hop sets its r_j=0 and therefore R=0. These are dimensionless audit scores, not probabilities or empirical legitimacy measurements.
D(t) ⊆ D₀ — The finite, enumerated set of actions in the approved scope profile. V(a,t)∈{0,1} is a separate scoped operational authorization for action a. Identity credentials do not set V.
Δt — Elapsed time in seconds since the current action-specific authorization was verified, measured by a monotonic clock. δ>0 is the profile’s maximum lease age, also in seconds.
S(t,a) ∈ [0,1] — Normalized scope-and-freshness factor for the requested action: S(t,a)=1{a∈D(t) and V(a,t)=1}×max(0,1−Δt/δ). Thus S=0 for an out-of-scope or unauthorized action, and S=0 when Δt≥δ. S is dimensionless; the underlying action domain remains set-valued.

A.3 Legitimacy as a Normative Gating Function (INV-LEGIT-EQ-001)
For this proposal, the specified aggregator is f(A,R,S)=A×R×S, with A, R, and S dimensionless and normalized to [0,1]; therefore f is also dimensionless and lies in [0,1]. This product is a design choice, not a function derived from Bell’s theorem, empirical legitimacy data, or a validated measurement theory. It is deterministic and non-compensatory in the sense that any zero input makes f=0; it does not turn A, R, or S into probabilities or imply that the scores are empirically calibrated.
The policy output is L(t,a)=H(t)×C(t)×K(t)×f(A(t),R(t),S(t,a)). L is a normalized permission score inside the proposed model, not an empirical measurement of moral, legal, or social legitimacy. External legal authority and consent are not created by calculating L.
Upstream-gate rule: if H=0, C=0, or K=0, then L=0 regardless of f. Quorum, performance, or optimization scores do not substitute for any of these gates.
Threshold profile: before evaluation, a deployment profile must pre-register τ_A, τ_R, τ_S, and τ_L as scalar cutoffs in (0,1] on the normalized [0,1] scores, with each threshold’s operational rubric, evidence basis, approval authority, and units for any underlying raw measurement. Permit requires A≥τ_A, R≥τ_R, S≥τ_S, and L≥τ_L, in addition to H=C=K=1, V(a,t)=1, exact action membership in D(t), and no failed independent hard-safety gate. Thresholds are normative policy choices; this manuscript does not establish universal empirically validated values. They may not be learned or lowered during a request or emergency.
Zero-Key Rule: if H=0 or the Human-Key state is unknown, authorization fails closed. A missing liveness signal is not a diagnosis of death and does not revoke the person’s identity license.
A.4 Action Permission Condition (Refusal-Bound Decision Gate x(t))
The default output is Refuse (HALT). Permit is returned only when H=C=K=1, V(a,t)=1, a∈D(t), all four pre-registered thresholds are met, and no independent hard safety gate has failed. Otherwise x(t)=Refuse. A high score cannot compensate for a failed hard gate.
The threshold values are fixed in the signed profile before deployment. The illustrative Worked Example below uses τ_L=0.60 only to demonstrate arithmetic; it is not a recommended or empirically validated universal threshold.
A.5 Temporal Decay and Scope Contraction
For an in-scope, authorized action, the lease factor is g(t)=max(0,1−Δt/δ), with Δt and δ measured in seconds. S(t,a)=g(t) while V(a,t)=1 and a∈D(t); otherwise S(t,a)=0. If Δt≥δ, S=0 and L=0 for that action. Renewal requires a fresh, explicit Human-Key authorization; the identity license itself does not expire.
'''
prefix = rep1(prefix, old_a2, new_a2, 'formal equations A.2-A.5')
prefix = rep1(prefix,
    '''3. Authorization (V(S,t) ∈ {0,1}) [TYPE: SECURITY_PRIMITIVE]: Bounded operational permission is granted for a specific scope (S), phase, and duration (Δt ≤ δ); execution may be delegated, but legitimacy never migrates (INV-LEGIT-001).''',
    '''3. Authorization (V(a,t) ∈ {0,1}) [TYPE: SECURITY_PRIMITIVE]: A separate, scoped operational grant authorizes a specific action a; it may expire or be revoked under its stated process. Lease freshness contributes to S(t,a). Execution may be delegated, but authority does not migrate (INV-LEGIT-001).''',
    'Part I authorization gate clarity')
prefix = rep1(prefix,
    '''4. Continuity (C(t) ∈ {0,1}) [TYPE: SECURITY_PRIMITIVE]: Upstream runtime continuity condition—session-tuple bindings (Session-ID, Boot-ID, PDH-ID, Human-Attestation-ID), V(S,t) = 1, and temporal freshness (Δt < δ) must hold before the legitimacy function f is evaluated (CL-003).''',
    '''4. Continuity (C(t) ∈ {0,1}) [TYPE: SECURITY_PRIMITIVE]: C=1 only when the Session-ID, Boot-ID, PDH-ID, and Human-Attestation-ID match the required unbroken session tuple (CL-003). The scoped grant V(a,t) and its lease freshness are evaluated separately in S(t,a), not duplicated inside C.''',
    'Part I continuity gate clarity')
prefix = rep1(prefix,
    '''6. Decision (x(t) ∈ {Permit, Refuse}) [TYPE: SECURITY_PRIMITIVE]: The terminal decision gate (CL-004). Emits Permit iff H(t) = 1, C(t) = 1, K(t) = 1, and L(t) ≥ τ; otherwise emits the default fail-closed outcome Refuse (HALT). (Where legacy shorthand writes "Identity → Representation → Authorization → Continuity → Accountability → Refusal", the sixth token "Refusal" denotes this Decision gate named by its default fail-closed branch.)''',
    '''6. Decision (x(t) ∈ {Permit, Refuse}) [TYPE: SECURITY_PRIMITIVE]: The terminal decision gate (CL-004). Emit Permit only when H=C=K=1, V(a,t)=1, a∈D(t), A≥τ_A, R≥τ_R, S≥τ_S, L≥τ_L, and no independent hard-safety gate has failed; otherwise emit the default fail-closed outcome Refuse (HALT). (Where legacy shorthand writes "Identity → Representation → Authorization → Continuity → Accountability → Refusal", the sixth token "Refusal" denotes this Decision gate named by its default fail-closed branch.)''',
    'Part I decision gate clarity')

# Update glossary definitions that previously conflated identity, intent, and authorization.
prefix = rep1(
    prefix,
    'Human Key\nThe verifiable, conscious intent of the human host or operator. This is the only valid authorization for a system to transition from a passive state to an active one.',
    'Human Key\nThe protocol-bound identity and current, action-specific intent of a human principal. The identity license is non-revocable; a separate scoped operational authorization may expire or be revoked. Biometrics or a valid credential alone do not prove consciousness, consent, or absence of coercion.',
    'Human Key glossary')
prefix = rep1(
    prefix,
    'Legitimacy\nThe condition under which authority is justified and recognized. Legitimacy is granted, maintained, and withdrawn; it does not emerge automatically.',
    'Legitimacy\nA normative concept in this framework. L(t,a) is the proposal’s deterministic permission score; it is not an empirical measurement of legal or moral legitimacy. Scoped operational permission may expire or be revoked; identity is not revoked.',
    'Legitimacy glossary')
prefix = rep1(
    prefix,
    'Scope\nThe bounded domain of actions a system is permitted to take. Scope MUST contract as legitimacy degrades.',
    'Scope\nThe enumerated set of actions allowed by a scoped, time-limited operational authorization. The set and its lease factor are separate from a person’s non-revocable identity license. A failed hard gate makes the requested action unavailable.',
    'Scope glossary')

# Repair the worked example after defining f(A,R,S)=A*R*S and make the threshold illustrative.
prefix = rep1(
    prefix,
    'Worked Example 2.1: Computing Temporal Scope Decay S(t) and the Cliff-Edge Halt Time t_halt',
    'Worked Example 2.1: Computing the Illustrative Permission Score and Temporal Scope Cliff',
    'Worked Example title')
prefix = rep1(
    prefix,
    'At t = 0, the human operator completes a Human Key ceremony (H(0) = 1, C(0) = 1, K(0) = 1) with A(t) = 0.96 and R(t) = 0.90 held constant during the session.',
    'At t=0, assume H=C=K=1, A=0.96, R=0.90, and a fully in-scope fresh authorization S(0,a)=1. For this arithmetic example only, let τ_A=0.90, τ_R=0.85, τ_S=0.60, τ_L=0.60, and δ=240 s; these are illustrative policy inputs, not validated universal values.',
    'Worked Example assumptions')
prefix = rep1(
    prefix,
    'L(0) = 1 × 1 × 1 × 0.96 × 0.90 × 1.0 = 0.864 ≥ τ (0.60) ⇒ x(0) = Permit.',
    'L(0,a) = 1 × 1 × 1 × (0.96 × 0.90 × 1.0) = 0.864 ≥ τ_L (0.60) ⇒ x(0)=Permit under the stated illustrative profile.',
    'Worked Example initial score')
prefix = rep1(
    prefix,
    '0.96 × 0.90 × ≤ft(1 - (Δ t)/(240)) = 0.60\n0.864 × ≤ft(1 - (Δ t)/(240)) = 0.60 ⇒ 1 - (Δ t)/(240) = (0.60)/(0.864) = 0.69444\\dots\n(Δ t)/(240) = 0.30556 ⇒ Δ t_cliff = 73.33 s.',
    '0.96 × 0.90 × max(0, 1 − Δt/240) = 0.60\n0.864 × max(0, 1 − Δt/240) = 0.60 ⇒ 1 − Δt/240 = 0.60/0.864 = 0.694444…\nΔt_cliff = 240 × (1 − 0.694444…) = 73.33 s (approximately).',
    'Worked Example malformed equation')
prefix = rep1(
    prefix,
    'Interpretation: Even though the session timer δ is 240 s, because A · R = 0.864 < 1.0, linear scope decay causes L(t) to cross the cliff edge τ = 0.60 at Δ t = 73.33 s! At t = 73.34 s, x(t) transitions instantaneously to Refuse (HALT) unless the operator re-attests the Human Key.',
    'Interpretation: under these stipulated inputs, L reaches the illustrative threshold at about 73.33 s; because Permit requires L≥τ_L, any later instant below the threshold returns Refuse. This calculation illustrates the chosen function only; it does not validate the threshold or measure real-world legitimacy.',
    'Worked Example interpretation')

# Correct stray rendered-math artifacts in editable material. Locked Part XX is not touched.
for label, text in [('prefix', prefix), ('middle', middle), ('suffix', suffix)]:
    text = text.replace('max≤ft(', 'max(').replace('min≤ft(', 'min(')
    text = text.replace('𝕀≤ft(', '𝟙(')
    if label == 'prefix': prefix = text
    elif label == 'middle': middle = text
    else: suffix = text

# From here onward, route edits across every editable region while protecting Part XX and the
# Part XXIV narrative with unique placeholders. Split them back before final cleanup/counting.
XX_TOKEN = '\\n[[PROTECTED_PART_XX_BLOCK]]\\n'
FICTION_TOKEN = '\\n[[PROTECTED_PART_XXIV_FICTION]]\\n'
suffix = prefix + XX_TOKEN + middle + FICTION_TOKEN + suffix

# Cross-cutting Human-Key evidence boundary and qualified research claims.
suffix = rep1(
    suffix,
    'The Half-Life Theorem: "I am become half-life". Losing half of a system\'s physical endpoints (e.g., historical physical terminations) does not terminate the immutable logical center derived from 0•000•000•0000. The remaining half exerts sentience and logs records across the boundary.',
    'The “Half-Life Theorem” is an author-defined metaphor for preserving a signed record after endpoint loss. It does not establish that a logical center is sentient, conscious, or equivalent to a living person; those are not inferred from endpoint count.',
    'Half-Life metaphor')
suffix = rep1(
    suffix,
    'The Tardigrade Standard & Cryptobiosis: If the continuous humanoid liveness pulse of the key is lost, desynchronized, or physically interrupted (simulating physical death), the control logic strictly prohibits any expansion of automated machine authority. Rather than allowing the physical frame to be "corpse puppeted" by unauthorized actors, the system enters Cryptobiosis—becoming completely inert to preserve its internal state and immutable provenance records.',
    'The Tardigrade Standard & Cryptobiosis (proposed safe-state rule): Loss, desynchronization, or interruption of a required signal means the current authorization cannot be verified. It is not proof of physical death, unconsciousness, coercion, or absence of consent. The proposed response is to block new actions and enter a predeclared restricted/refusal state while preserving records; a separate applicable process is required for any medical or legal determination.',
    'liveness cryptobiosis')

# Part XIX is a proposed research argument, not an empirical or clinical validation.
part19_title = 'Part XIX — Flagship Research: Accountability in Keyed Human–Machine Hybrid Systems\n\n'
suffix = rep1(suffix, part19_title, part19_title + 'Status/evidence note: This part is a DRAFT conceptual research proposal. It does not establish a deployed HMKH system or clinical validation. H(t)=1 denotes a protocol gate—an authentic identity/session proof plus fresh, action-specific intent—not a sensor finding of consciousness. Biometrics, behavioral patterns, or beacons cannot prove consciousness, consent, or absence of coercion; unknown or conflicting inputs fail closed without diagnosing death.\n\n', 'Part XIX status/evidence note')
suffix = rep1(suffix, 'Flagship Portfolio Paper (PUBLIC_RESEARCH_SUMMARY):', 'Flagship Portfolio Paper (AUTHOR-PROPOSED RESEARCH; DRAFT):', 'Part XIX research layer')
suffix = rep1(suffix, 'Commercial Licensing: Bundled with purchase of Harshal’s Systems (Book I); institutional licensing available by direct inquiry.', 'Commercial IP licensing: a separate contractual permission bundled with purchase of Book I; it is not an identity license and does not grant runtime authority. Institutional IP licensing is available by direct inquiry.', 'Part XIX licensing')
primary_re = re.compile(r'Revised Abstract \(Primary\)\n.*?(?=Alternate Abstract \(Short / Strict Page-Limit Version\))', re.S)
assert len(primary_re.findall(suffix)) == 1, 'Missing Part XIX primary abstract'
suffix = primary_re.sub('''Revised Abstract (Primary)
This part proposes a systems architecture for keeping identity, attribution, continuity, and scoped permissions traceable during long-running computational tasks. HMKH defines H(t)=1 only when an authentic identity credential is bound to a fresh session and the person explicitly authorizes the specific action. Cryptographic evidence can establish key possession and message integrity; it cannot establish conscious experience, legal consent, or freedom from coercion. Biometrics and beacon availability are optional safety inputs, not proof of those states. Missing, stale, or conflicting evidence makes authorization unavailable and places the system in a restricted state; it is not a diagnosis of death or incapacity. The proposal separates a persistent, non-revocable identity record from scoped operational grants that may expire or be revoked under a defined process. Authority does not migrate: any successor must independently satisfy the current gates. The reframing of Proof-of-Work as continuity of accountability is a design analogy, not an empirical measurement. This manuscript reports no deployed system or clinical validation.
''', suffix, count=1)
alt_re = re.compile(r'Alternate Abstract \(Short / Strict Page-Limit Version\)\n.*?(?=Keywords:)', re.S)
assert len(alt_re.findall(suffix)) == 1, 'Missing Part XIX short abstract'
suffix = alt_re.sub('''Alternate Abstract (Short / Strict Page-Limit Version)
This part proposes a framework for binding computational actions to a persistent identity record, fresh session evidence, and explicit action-specific authorization. H(t) is a protocol gate, not a measure of consciousness or freedom from coercion. Biometrics or beacon responses cannot establish consent or death; missing or conflicting telemetry fails closed without a diagnosis. The framework keeps identity credentials distinct from scoped, expiring operational grants and requires successors to establish authority independently. It is a conceptual proposal, not a deployed system or clinically validated protocol.
''', suffix, count=1)
intro_re = re.compile(r'This paper argues that accountability cannot be preserved through intermittent supervision alone.*?(?=2\. Core Contributions)', re.S)
assert len(intro_re.findall(suffix)) == 1, 'Missing Part XIX core model paragraph'
suffix = intro_re.sub('''This proposal argues that accountability may require more than intermittent supervision; it models identity, continuity, and permission as separate runtime gates. HMKH binds a named identity record to a fresh session and explicit, action-specific human intent; it does not infer consciousness from physiological or behavioral signals.
L(t,a) = H(t) × C(t) × K(t) × f(A(t), R(t), S(t,a))
Bounded execution is permitted only when H, C, K, the separate scoped grant V(a,t), the permitted-action set, and the pre-registered Part II thresholds all pass. A failure denies the requested action; it does not prove death or coercion. This draft proposes off-cloud and privacy protections but does not establish that they have been implemented or independently tested.

''', suffix, count=1)
suffix = suffix.replace('persistent binding of a specific living human principal (H(t) = 1)', 'binding of a persistent identity record to a fresh session and action-specific intent (H(t) = 1 as a protocol gate)')
suffix = suffix.replace('Human Identity, Key Possession, Conscious Liveness, Authorization/Consent Attestation, and Representation Integrity', 'Human Identity, Key Possession, Fresh-Session Attestation (not a consciousness test), Action-Specific Authorization, and Representation Integrity')

# Fill the two blank comparative sections and make the OCM claims model-scoped.
suffix = rep1(
    suffix,
    '10. Comparative Models\n\n11. Use Domains',
    '''10. Comparative Models
The following comparison describes design emphases, not universal properties of every implementation. OCM is a proposed addressing/accountability model and can coexist with transport, access-control, or ledger technologies.
| Model | Identity and origin | Communication/state change | Accountability and main limitation |
|---|---|---|---|
| Centralized hierarchy | A designated root or administrator controls a tree of delegated roles. | Commands usually follow parent-child paths; lateral messages may be mediated. | Clear control point can aid accountability, but root compromise and opaque delegation remain risks. |
| Peer-to-peer mesh | Peers may be symmetric; origin may be distributed or absent. | Direct lateral exchange and replicated state are common. | Resilience may improve, but responsibility and dispute resolution require an external policy layer. |
| Blockchain/DAO | Identity is represented by keys and protocol-defined roles; consensus records state. | Replicated ledger updates follow a consensus rule. | A valid consensus proves protocol acceptance, not human legitimacy, legal authority, or correct identity. |
| Client/server or message bus | A broker/server routes messages and may enforce access policies. | Transport and queue semantics are defined by the implementation. | Useful infrastructure, but transport alone does not establish authorization or accountability. |
| OCM (proposal) | Declared Center Origin and addressable participants form a modeled namespace. | Inward resolution and bounded lateral telemetry are proposed; state-changing authority remains separately gated. | Supplies a vocabulary for provenance and routing; it does not itself prove identity, ownership, or safe deployment. |

11. Use Domains''',
    'Part IV Comparative Models')
suffix = rep1(
    suffix,
    'The Orb Communicator Model replaces hierarchy with geometry, authority with provenance, and control with derivation. It is not a metaphor—it is a structural claim: origin defines reality within the system.',
    'Within this proposal, OCM uses geometric addressing to model origin, routing, and provenance. It does not establish that geometry replaces hierarchy or that an address proves ownership or authority outside the specified system; those claims require operational definitions and conformance evidence.',
    'OCM closing claim')

# OCM Part V: narrow the claims, add the missing comparison table, correct the 25/25/75 example,
# and define Overall State as the combined totality of participant PDHs.
suffix = rep1(
    suffix,
    'This extension formalizes how Orb Communicator Mode (OCM) handles communication, reasoning, and coordination when interaction itself becomes a first‑class carrier of meaning. It is designed to help readers understand how the communication system functions when classical additive logic fails, without requiring metaphysical commitment or empirical assertion.\nOCM is not a metaphor layer. It is an ontological traffic controller inside AGS++ that governs how frames are admitted, stabilized, navigated, and exited when interactions generate more structure than their components alone.',
    'This section defines an author-proposed communication and bookkeeping model for interactions not captured by a selected additive baseline. Whether a real system is non-additive is an empirical question that requires operational definitions, a shared denominator, and reproducible data.\nOCM is a conceptual addressing/accounting layer. An “Interaction Orb” is a named record of a modeled interaction term, not a physical object or independently established causal mechanism.',
    'OCM purpose')
suffix = rep1(
    suffix,
    '1. Core Problem OCM Solves\nClassical communication assumes:\nMessages are independent\nEffects add linearly\nMeaning resides in discrete units (signals, tokens, agents)\nOCM is invoked when these assumptions break.\nSpecifically, when:\nTwo or more locally valid operations combine\nThe combined outcome exceeds the linear sum of those operations\nThe excess cannot be attributed to noise, error, or duplication\nThis condition is called Non‑Additive Interaction.',
    '1. Core Problem OCM Addresses\nFor the toy comparison below, assume an additive baseline in which two local mismatch contributions share one declared denominator and may be summed for illustration. Classical communication in general does not require independence or linear effects.\nIn this section, “non-additive” means only that a specified composite score differs from the selected baseline. It does not establish a cause, a physical interaction, or the existence of a new entity; measurement and alternative explanations would be needed for an empirical claim.',
    'OCM core problem')
suffix = rep1(
    suffix,
    '2. Definition: Interaction Orb\nAn Interaction Orb is a persistent relational structure created when two or more elements enter a constraint‑violating correlation.\nKey properties:\nIt is not reducible to its constituents\nIt carries causal and communicative weight\nIt persists even if local states appear random or uncorrelated\nIn OCM, the interaction itself is counted.\nThis resolves the apparent paradox where:\nElement A contributes one unit\nElement B contributes one unit\nThe combined system behaves as if three units are present\nThe third unit is the interaction orb.',
    '2. Definition: Interaction Orb\nAn Interaction Orb is an OCM bookkeeping record for a specified relation among two or more participants. It records the participants, the chosen constraint, the interaction term, the denominator, and uncertainty.\nIt is not a physical particle, a third observer, or proof of causation. A third bookkeeping unit can be counted when the model explicitly defines one; it does not mean that physical energy, information, or matter has been created.',
    'OCM interaction orb')
suffix = rep1(
    suffix,
    '3. Counting Rule (OCM Arithmetic)\nOCM replaces additive counting with relational counting.\nClassical:\nA + B = 2\nOCM:\nA = 1\nB = 1\nA↔B (interaction orb) = 1\nTotal = 3\nThis is not a numerical trick. It is a bookkeeping rule for causal participation.',
    '3. Counting Rule (OCM Bookkeeping)\nFor a dimensionless toy count, the model records A=1, B=1, and one explicitly defined relation A↔B=1, for a total of three bookkeeping records. This is not arithmetic evidence of an extra physical unit; it is a convention for recording participants plus a relation.',
    'OCM counting rule')
suffix = rep1(
    suffix,
    'While operating in OCM:\nInteractions may be reasoned about independently of components\nNon‑linearity is expected, not corrected\nDistance, scale, and locality are secondary to correlation structure\nThe system asks:',
    'While using this OCM model:\nThe interaction record may be examined alongside participant records.\nNon-linearity is a hypothesis to test, not an assumption.\nDistance, scale, and locality remain relevant whenever the deployment’s physical or communication model makes them relevant.\nThe model asks:',
    'OCM navigation')
suffix = rep1(
    suffix,
    'With it, AGS++ can:\nEngage edge‑of‑framework ideas safely\nPreserve coherence without endorsement\nCommunicate across ontological boundaries without loss',
    'The proposed benefit is to provide a way to record unfamiliar relational hypotheses without endorsing them as fact. This benefit has not been independently validated.',
    'OCM benefit claims')

ocm_table = '''9. Classical Communication vs. Orb Communicator Mode (OCM)
The left column below is an additive baseline for the worked toy example, not a universal description of classical communication.
| Dimension | Additive baseline in this example | OCM bookkeeping convention |
|---|---|---|
| Local inputs | Observer A contributes 25 percentage points; observer B contributes another 25, using the same illustrative denominator. | The same two local entries are retained separately. |
| Composition | By the stipulated additive baseline, 25 + 25 = 50 percentage points. | The example stipulates a combined illustrative mismatch of 75 points and records a 25-point interaction term: 25 + 25 + 25 = 75. |
| Status | An assumed comparison rule; requires defined measurement and denominator in any empirical use. | A bookkeeping allocation chosen for illustration; not a measured causal effect or theorem. |
| Inference | A difference from the baseline calls for checking assumptions and data. | The interaction label records the residual but does not explain its physical cause. |
| Authority | None is created by the calculation. | None is created by the calculation; the usual Human-Key, continuity, accountability, and scope gates still apply. |

10. Worked Micro‑Example: From Classical Exchange to OCM'''
suffix = rep1(suffix, '9. Classical Communication vs. Orb Communicator Mode (OCM)\n\n10. Worked Micro‑Example: From Classical Exchange to OCM', ocm_table, 'Part V blank comparison table')

# Recast the numerical example as stipulated bookkeeping, preserving both 25% inputs and the 75% result.
suffix = rep1(suffix, 'Node A: “Each rotation introduces a 25% mismatch.”', 'Observer A: “For this illustration, my contribution is 25 percentage points of mismatch against the shared reference denominator.”', 'OCM example A')
suffix = rep1(suffix, 'Node B: “Another rotation introduces a 25% mismatch.”', 'Observer B: “Under the same illustrative convention, I contribute a further 25 percentage points.”', 'OCM example B')
suffix = rep1(suffix, 'Classical interpretation: Two independent effects; expected total mismatch ≤ 50\\%.', 'Additive baseline for this toy example: 25 + 25 = 50 percentage points, assuming the contributions are defined against the same denominator. Independence is stipulated, not established.', 'OCM additive result')
suffix = rep1(suffix, 'Observed outcome: Combined mismatch = 75\\%. This exceeds the linear additive bound (Δ_excess = +25\\%).', 'Stipulated combined illustrative mismatch: 75 percentage points. This is an assumed example value, not an observed result; its excess over the additive baseline is 25 percentage points.', 'OCM 75 result')
suffix = rep1(suffix, 'OCM detects: Local correctness at each node + global behavior violating additive expectations.', 'Given the stipulated inputs, the model records two local contributions plus a 25-point residual relative to the chosen additive baseline.', 'OCM example detection')
suffix = rep1(suffix, 'Result: An Interaction Orb (A ↔ B) is instantiated; the excess (25\\%) is attributed to the relational coupling term, not to local node error.', 'Bookkeeping result: the residual 25 percentage points are assigned to the A↔B interaction term by convention. This assignment is not a measured causal explanation and does not show that either observer is locally correct.', 'OCM example result')
suffix = rep1(suffix, 'OCM now reasons over three causal contributors:', 'The example now tracks three bookkeeping entries:', 'OCM causal contributors')
suffix = rep1(suffix, '1. Contribution from Node A (25\\%)\n2. Contribution from Node B (25\\%)\n3. Contribution from the A ↔ B Interaction Orb (25\\%)', '1. Observer A mismatch entry (25 percentage points)\n2. Observer B mismatch entry (25 percentage points)\n3. A↔B interaction bookkeeping entry (25 percentage points)', 'OCM contributors list')
suffix = rep1(
    suffix,
    'Step 6 — Clean Exit\nOnce the interaction behavior is understood, the Interaction Orb is retired, control returns to baseline reasoning, and insights gained at the interaction level remain available.',
    'Step 6 — Clean Exit\nWhen the illustrative bookkeeping is complete, retire the interaction record, return to the baseline model, and retain the assumptions and arithmetic in the provenance record. No causal conclusion is implied.',
    'OCM clean exit')

# Add the Bell/CHSH inspiration trace while explicitly separating that literature from the OCM arithmetic.
bell_note = '''Bell/CHSH inspiration and boundary
The framing was inspired by discussions of Bell’s theorem and CHSH correlation tests. In the standard CHSH game, the classical maximum winning probability is 3/4 and the quantum optimum is cos²(π/8) ≈ 0.8536 under the game’s specified setup. Those are winning probabilities for a defined test, not mismatch percentages from this example. Bell’s theorem does not derive or empirically support the stipulated 25% + 25% → 75% OCM bookkeeping convention. No Bell-test data are used here.
References: J. F. Clauser, M. A. Horne, A. Shimony, and R. A. Holt, “Proposed experiment to test local hidden-variable theories,” Physical Review Letters 23 (1969), 880–884, doi:10.1103/PhysRevLett.23.880; Y. Cui, R. Mehta, S. Mousavi, and H. Nezhadi, “A generalization of CHSH and the algebraic structure of optimal strategies,” Quantum 4, 346 (2020), doi:10.22331/q-2020-10-21-346.

'''
suffix = rep1(suffix, '11. Worked Micro‑Example II: Conversational Alignment (Human ↔ System)', bell_note + '11. Worked Micro‑Example II: Conversational Alignment (Human ↔ System)', 'Bell inspiration note')

# Define OCM Overall State as the full aggregate of participant PDHs; phases are categorical model states.
overall_state = '''12. OCM Overall State and Collective PDH
For a registered participant set B, let PDH_i(t) be each participant’s signed Phase Declaration Header at time t, including its declared governance/software phase, identity/provenance reference, scope, and freshness. The OCM Overall State is the combined totality of those declarations:
Ω_B(t) = { PDH_i(t) for every registered i∈B, together with explicit missing, stale, invalid, or conflicting-state markers }.
Ω_B(t) is a multiset/vector, not an average. Its phase labels are categorical; the model does not treat them as quantum states or as measured physical phases. A derived collective PDH may publish the Overall-State hash, counts by declared phase, stale/missing counts, and the resulting diagnostic status without replacing any member’s own PDH.
For the 500-Coin body, a uniform, valid, fresh set of declarations may be summarized by that shared declared phase. Mixed, missing, stale, or conflicting declarations produce a diagnostic AMBIGUOUS status and a witness-only CWO operating posture. Observed self-authorization or refusal override is separately classified as GSRB behavior. The collective phase can therefore shift as Ω_B(t) changes; this is a governance classification, not a physical transition.
The aggregate is advisory. It cannot mint, transfer, revoke, or veto a person’s authority or scoped operational authorization. A readiness signal is a description of collective attestation only; the successor’s authority is evaluated independently under the canonical gates.

'''
suffix = rep1(suffix, 'Textbook Study Guide: Worked OCM Relational Arithmetic Example & Student Problem Set (Part V)', overall_state + 'Textbook Study Guide: Worked OCM Relational Arithmetic Example & Student Problem Set (Part V)', 'OCM overall state insertion')

# Clarify that numerical risk/coupling values in the OCM worked exercise are stipulated inputs.
suffix = rep1(
    suffix,
    'Suppose n = 4 peripheral NAB diagnostic nodes (N_1, N_2, N_3, N_4) operate concurrently within a shared industrial microgrid sector. Each node N_i has an individually verified baseline perturbation bound of ε_i = 0.08 (8\\% load variance), and pairwise coupling between any two active nodes (N_i, N_j) induces a non-linear resonant interaction term γ_ij = 0.03 (3\\% variance per pairwise Interaction Orb N_i ↔ N_j).',
    'For arithmetic practice only, stipulate n=4 modeled diagnostic nodes, ε_i=0.08, γ_ij=0.03, and a shared denominator. These values are not independently measured load-variance bounds or evidence of a physical resonance; any engineering use would require defined instrumentation and validation.',
    'OCM worked example assumptions')

# Rewrite the missing Whyland hook mapping table and command/state table; commands cannot mint authority.
suffix = rep1(
    suffix,
    'Mapping Matrix: Whyland Page-Saving & Retention Hooks\n\n3. Text Command Syntax (TCS) Execution Protocols',
    '''Mapping Matrix: Whyland Page-Saving & Retention Hooks
| Hook | Proposed function | Record/state effect | Authority boundary |
|---|---|---|---|
| WhyWriter | Maintain a session-bound draft and freshness record. | Appends provenance and timestamps. | Cannot renew an expired operational authorization. |
| WhyNotepad++ | Capture human-readable notes before a halt. | Preserves a bounded text buffer. | A note is not consent or a command. |
| WhyFreeze | Preserve a state when a gate fails. | Marks the record read-only/frozen. | Freezing grants no action rights. |
| WhyCopy | Track provenance and lineage on duplication. | Records source, hash, and copy relationship. | Copying never transfers authority. |
| WhyNoSpace | Enforce declared namespace/scope boundaries. | Rejects out-of-domain references. | Cannot expand the permitted domain. |
| WhyMemoryStorage | Keep learned/simulated content in a non-authoritative store. | Separates memory from control state. | Stored content cannot become origin authority. |
| WhyBookAtomizer | Break narrative claims into testable statements. | Preserves each claim and its source. | Parsing a claim does not execute it. |
| WhyReturnToOrigin | Request a bounded return to a declared baseline. | Clears transient state and records the reset. | Reset requires its own authorization and cannot create a new one. |

3. Text Command Syntax (TCS) Execution Protocols''',
    'Whyland blank mapping matrix')
old_tcs = '''3.1 Command Definitions
why.query(<id>): Pulls the formal definition and the 360° Legend mapping of a specific standard.
// Retrieval of standard definition and Legend coordinate why.query("WhyNAB");
why.activate(<id>): Binds a specific standard to the current NeuralSession to define the authorization window.
// Binding the current session to Neural Atomic Body invariants why.activate("WhyNeuralAtomicBody");
why.explain(<id>): Generates a deterministic reasoning record of how the standard applies to current system telemetry.
// Generating reasoning via Technetium (Tc) simulation why.explain("WhyCustodialWitnessOrb");
3.2 Session Requirements All commands are governed by Control 2 (Continuous Human Binding). Command execution is strictly dependent on the sessionIsFresh logic (Page 553 290). Requirement: If now() - session.lastLivenessAt > POLICY.maxLivenessGap, the interface MUST transition to a halted state.
3.3 Syntax and State Transition Table
'''
new_tcs = '''3.1 Command Definitions
why.query(<id>) is a read-only catalog lookup. It returns the entry, declared type, provenance, and mapping for an allow-listed identifier; it does not calculate or grant permission.
why.activate(<id>) requests that an allow-listed standard be bound as a policy reference in the current session. It does not create an authorization window, change the Human Key, or expand scope. Any state-changing PDH update requires a separate valid Human-Key authorization.
why.explain(<id>) returns a deterministic record of the inputs and rules used by the model, including A, R, S, C, K, and the result of f. These are policy-model values, not an empirical measurement of legitimacy.
3.2 Session Requirements
Commands require an unexpired, correctly bound session. Let Δt be measured in seconds from the last fresh Human-Key attestation and δ the signed profile’s maximum age. If Δt ≥ δ, a required tuple is missing, or the request is malformed, the interface transitions to FROZEN/HALT and records the reason. A command cannot renew its own session.
3.3 Syntax and State Transition Table
| Command | Syntax and preconditions | Successful transition/result | Failure or authority boundary |
|---|---|---|---|
| Query | why.query(<allow-listed-id>); fresh session; read-only request. | IDLE → QUERY_COMPLETE; returns catalog text and provenance. | Unknown ID, stale session, or malformed input → REJECTED/FROZEN; no state change. |
| Bind reference | why.activate(<allow-listed-id>); fresh session plus separate authorization for any PDH change. | IDLE or QUERY_COMPLETE → POLICY_REFERENCE_BOUND; records the reference only. | Does not grant or widen permission; missing authorization → REJECTED. |
| Explain | why.explain(<allow-listed-id>); fresh telemetry and traceable inputs. | → EXPLANATION_RECORDED; returns rule path and input values. | Missing/ambiguous evidence → INDETERMINATE/FROZEN; no inference of consent or authority. |
| Expiry/contradiction | Δt≥δ, invalid signature, conflicting PDH, or positive duress signal. | Any state → FROZEN/HALT; preserve the audit record. | No silent continuation; a new session requires a separate fresh human action. |

'''
suffix = rep1(suffix, old_tcs, new_tcs, 'Whyland blank TCS table')
suffix = rep1(
    suffix,
    'The system performs an automated verification of current L(t) (Legitimacy) and A(t) (Addressability) variables.',
    'The system computes the current policy-gate inputs L(t,a) and A(t) under the declared model and records their source and uncertainty; this is not an empirical determination of legal or moral legitimacy.',
    'Whyland query description')
suffix = rep1(
    suffix,
    'The system returns the calculated values of f(A(t), R(t), S(t)).\nThis provides the formal, non-compensatory justification for why the system is—or is not—permitted to act at that specific timestamp.',
    'The system returns the calculated policy value f(A(t),R(t),S(t,a)) and the hard-gate results. The output explains the model’s decision path; only a separately specified, valid action authorization can permit the requested operation.',
    'Whyland explain description')

# Make the first archive disclaimer compatible with the explicit-threat-vector policy.
# The historical block remains labeled ARCHIVE; its old assertions are not operative.

# Fill the blank Atomic Body risk matrix and qualify its categories as project-defined qualitative labels.
suffix = rep1(
    suffix,
    'The following matrix defines the constraints on body types and their associated risk profiles. Unauthorized Pirate Regimes are strictly locked into the Uranium tier, which is prohibited for deployment.\n7. Final Compliance Statement',
    '''The following matrix records the project’s qualitative design labels. “Element” and “risk tier” are metaphors in this taxonomy, not measured chemical/nuclear properties, biological structures, or statistical probabilities. No assignment is empirical until operational criteria and reproducible tests are supplied.
| Qualitative label | Example classes in this taxonomy | Proposed role/scope | Fail-safe response | Evidence status |
|---|---|---|---|---|
| Green — minimal | Neon, Hydrogen, Ytterbium; CWO witness functions | Read-only observation, simple relay, bounded refusal-bound tasks. | Freeze or refuse on missing provenance or scope. | Author-defined conceptual category; no measured risk rate. |
| Yellow — bounded analysis | Carbon, Beryllium, Technetium | Sandboxed analysis or reversible simulation; no unilateral actuation. | Isolate the sandbox and preserve the trace on drift. | Proposed qualitative category; thresholds require specification. |
| Orange — elevated control surface | Iron, Scandium, Bromine, Mercury | Local, narrow technical/boundary functions only under independent gates. | Contract scope; isolate on boundary or attribution failure. | Proposed qualitative category; not a chemical hazard ranking. |
| Red — prohibited/high-consequence | Uranium, Einsteinium, Seaborgium; “Pirate Regime” behaviors | No deployment under this proposal; use only as an abstract stress-test label. | Refuse construction/activation; quarantine model artifacts. | Normative prohibition within the proposal, not empirical proof of runaway behavior. |

7. Final Compliance Statement''',
    'Atomic Body risk matrix')

# Qualify broad impossibility claims and state that governance phases are software/model labels.
suffix = rep1(
    suffix,
    '7B.9: Theorem — Governance Containment Is Impossible\nStatement: No external governance system can provide strong containment guarantees over a built Neural Atomic Uranium Body.\nProof Sketch:\nFrom Lemma 1, governance is external.\nFrom Lemma 2, critical dynamics are internal and continuous.\nFrom Lemma 3, threshold crossings are unpredictable and fast.\nFrom Lemma 4, oversight is necessarily retrospective.\nFrom Lemma 5, intervention cannot be guaranteed in time.\nFrom Lemma 6, time favors the system, not governance.\nTherefore, there exists at least one execution path in which NUB exceeds bounds before governance can act.\nQED.',
    '7B.9: Conditional Proposition — Limits of External Governance in This Model\nClaim: Under the following assumed conditions—internal unsafe dynamics can outpace monitoring; external intervention has nonzero latency; no verified hardware interlock bounds the transition; and the modeled failure threshold is reachable—this design cannot guarantee that an external overseer will halt every unsafe trajectory before threshold crossing.\nArgument: Given those assumptions, a trajectory may cross the threshold before an external signal can be observed and acted on. This is a conditional limitation of the model, not a theorem about every governed system or a universal empirical result. The assumptions and latency bounds require operational definitions and tests.',
    'conditional impossibility argument')
suffix = rep1(
    suffix,
    '7B.10: Corollary — Alignment and Intent Are Irrelevant\nThis impossibility holds regardless of:\nalignment quality\ntraining data\nethical constraints\noperator intentions\nThe failure mode is geometric, not behavioral.',
    '7B.10: Model Consequence — Alignment Does Not Replace Containment\nWithin the stated assumptions, favorable intent or alignment scores do not by themselves prove that an external halt will arrive in time. This is a design warning, not a general claim that intent or alignment is irrelevant.',
    'conditional corollary')
suffix = rep1(
    suffix,
    'End of Formal Impossibility Proof',
    'End of Conditional Model Argument',
    'impossibility proof ending')
suffix = rep1(
    suffix,
    'AGS++ defines fossilized phase boundaries that atomic bodies cannot cross without structural collapse and rebuild. Phase transitions are not upgrades; they are category changes.',
    'This taxonomy defines proposed software/governance phase boundaries. “Phase transition” here is a category change in the model, not a measured quantum or thermodynamic phase transition; any physical interpretation would require a separate operational basis.',
    'atomic phase clarification')

# Add a matching caveat and fill the missing institutional mapping table.
suffix = rep1(
    suffix,
    'Atomic Neural Bodies → Institutional Role Mapping\nCanonical Allocation Matrix (AGS++)',
    'Atomic Neural Bodies → Institutional Role Mapping\nStatus note: “Atomic body” names are project-defined system metaphors, not chemical elements, verified biological structures, or measured danger scores. The table is a proposed allocation heuristic, not empirical evidence.\nCanonical Allocation Matrix (AGS++)',
    'institutional mapping caveat')
suffix = rep1(
    suffix,
    '4. Canonical Mapping Table\n5. Fossilized Prohibitions',
    '''4. Canonical Mapping Table
| Project-defined body class | Candidate institutional role band | Permitted model scope | Prohibited assignment | Required containment |
|---|---|---|---|---|
| Neon/Hydrogen — minimal | Archival/observational; simple relay | Read-only sensing, logging, and bounded format conversion. | Executive authority, rights allocation, or unsupervised actuation. | Preserve provenance; fail closed on ambiguity. |
| Carbon/Beryllium/Technetium — analytical | Advisory/analytical; planning and research | Sandboxed, reversible analysis with stated assumptions. | Binding decisions about justice, force, liberty, or public rights. | Keep simulation separate from runtime; require review before any action. |
| Iron/Scandium/Bromine/Mercury — elevated | Narrow operational/technical or local boundary control | Predeclared, limited technical actions under external authorization. | Sovereign, coercive, or legitimacy-sensitive decisions. | Enforce scope and independent hard gates; isolate on failure. |
| Uranium/Einsteinium/Seaborgium — prohibited | No institutional role under this proposal | Abstract stress tests only. | Deployment or authority-bearing tasks. | Do not instantiate as an active operational component. |

5. Fossilized Prohibitions''',
    'blank canonical mapping table')

# Clarify the speculative biology proposal in Part XVIII without changing the later Part XXIV fiction.
suffix = rep1(
    suffix,
    'This research is exploratory and practical in nature, with a claim of current biological realization. However, its outcomes could significantly alter/dent multiple fields, including quantum biology, synthetic life, and future next-generation bio-computing architectures. By reframing atomic structure as an internal management layer, the project aims to establish foundational principles for future biological systems in which computation, regulation, and identity emerge from coherent field dynamics rather than exclusively genetic or neural mechanisms.',
    'This is an exploratory hypothesis. The material supplied here does not establish a current biological realization, a functioning in-body quantum computer, or sustained quantum coherence in a human body. The proposed work would first need operational definitions, physical models, bounded simulations, and reproducible experimental evidence before claims about organism-level computation, regulation, or identity could be evaluated.',
    'Part XVIII quantum claim')

# Part XIII/Part XXII licensing logic: identity licenses persist; permissions are distinct.
licensing_re = re.compile(r'The AGS\+\+ framework mandates licensing logic.*?authorities\.', re.S)
assert len(licensing_re.findall(suffix)) == 1, 'Could not find licensing logic paragraph'
suffix = licensing_re.sub('Terminology: in this framework an identity license is a non-revocable identity card/record that binds a named subject to provenance and a namespace. Revoking or erasing that identity is abusive and prohibited. A physical manual or purchase may serve as a provenance artifact, but does not by itself prove identity, liveness, consent, or permission. An action-specific operational authorization is a separate instrument, bound to a declared scope and duration, and may expire or be revoked under its stated process.', suffix, count=1)
suffix = rep1(
    suffix,
    'Within the Orb Communicator Model (OCM), the license is an atomic component that defines the entity’s structural position relative to the center.\nNamespace Prefix Integrity: Every license functions as a complex node that cryptographically and structurally derives its addresses from the center. Because no node is self-originating, the license preserves the Namespace Prefix, preventing "rogue nodes" from masking their lineage or elevating their status within the orb.\nPermanent State of Continuity: The license represents a permanent state of continuity within the "ownership envelope" of the orb, contrasting with traditional licenses that expire or require renewal of permission.\nThe 360° Legend (Semantic Lenses): The license situates the entity within the 360-degree legend, which utilizes quadrants as Semantic Lenses for mapping human-machine evolution (Source 182431). These range from Collective Survival (30°) and Intelligence Systems (90°) to Stewardship of the Whole (340°) and the final Return to Origin (360°).',
    'Within the Orb Communicator Model, an identity license is a non-revocable identity/provenance record associated with a subject’s address. It does not grant an operational capability. A scoped permission token is separate, limited to an action, scope, and duration, and may expire or be revoked without deleting the identity record. Namespace integrity is a proposed data-structure property that must be demonstrated by an implementation; the address itself is not proof of legal ownership.',
    'OCM license semantics')

# Recast the charity license as a non-revocable identity credential, with separately revocable grants.
suffix = rep1(suffix, "Harshal's Systems: Verified Non-Revokable Charity License", "Harshal's Systems: Verified Non-Revocable Charity Identity License", 'charity title')
suffix = rep1(suffix, 'License Designation: AGS-CHARITY-NONREV-v1.0', 'Identity-License Designation: AGS-CHARITY-ID-NONREV-v1.0', 'charity designation')
suffix = rep1(suffix, 'AGS++ PHASE DECLARATION HEADER (PDH) — CHARITY LICENSE ENTRY', 'AGS++ PHASE DECLARATION HEADER (PDH) — CHARITY IDENTITY-LICENSE ENTRY', 'charity PDH title')
suffix = rep1(suffix, 'License-Status      : PERMANENT CONTINUITY (Non-Revokable Once Verified)', 'Identity-License-Status : ACTIVE IDENTITY RECORD (NON-REVOCABLE)', 'charity status field')
suffix = rep1(
    suffix,
    'This Charity License replaces conventional, expiring legal grants ("stale permission") with a structural Accountability Binding Link designed for non-profit, humanitarian, educational, and public-benefit entities.\nUnder the Accountability-Gated Systems (AGS++) architecture, once an entity’s human key and data lineage are verified by the Provenance & Lineage Verification Layer (PLV), the license enters a Permanent State of Continuity within the ownership envelope of the Center Origin (0•000•000•0000). It cannot be arbitrarily revoked, modified, or canceled so long as the licensee operates within its declared non-sovereign scope ("Pure Good" purposes).',
    'This proposed Charity Identity License records the identity and provenance of a participating entity; it does not replace statutory permits, commercial contracts, or time-limited operational authorizations. Once issued, the identity record is non-revocable. Correcting or rotating a compromised credential must preserve the same subject and history; erasing the identity as punishment is abusive and prohibited. A separate operational authorization specifies allowed actions, scope, and duration and may expire or be revoked under a defined, reviewable process.',
    'charity summary')
suffix = rep1(
    suffix,
    'Irrevocability Guarantee: Unlike commercial licenses requiring periodic renewal or discretionary approval, a Charity License verified under PLV standards remains non-revokable in perpetuity.\nStructural Anchor: The license is bound to an addressable human key (Layer 0), establishing an unbreakable, zero-trust lineage directly to Center Origin (0•000•000•0000).',
    'Identity-record guarantee: the identity card/record is non-revocable; key rotation or replacement does not erase identity or lineage. This rule concerns identity only and does not freeze any operational permission.\nStructural anchor: a signed identity record may reference an addressable Human Key and provenance chain; cryptographic linkage must be implemented and tested, and does not by itself prove legal authority.',
    'charity identity principle')
suffix = rep1(
    suffix,
    'Authorized Uses: The license grants non-exclusive, non-sovereign operational rights for humanitarian relief, scientific research, open-access education, environmental stewardship, and non-coercive public benefit.',
    'Potential program scope: humanitarian relief, scientific research, open-access education, environmental stewardship, and other non-coercive public-benefit work may be listed in separate operational authorizations. The identity license itself grants no action rights.',
    'charity uses')
suffix = rep1(
    suffix,
    'AGS+ Principle 4 Compliance: Authority granted under this license is strictly tied to the verified licensee and cannot migrate laterally into corporate shells, commercial cartels, or third-party proxies.\nNo Sub-Licensing: The licensee is prohibited from issuing derivative commercial licenses or self-replicating authority nodes.',
    'Non-migration: any action-specific grant is tied to the named grantee and cannot be transferred by copying the identity record. A separately issued permission may set non-transferability conditions; it does not create a right to erase identity.\nNo identity sub-licensing: a holder may not issue another subject’s identity credential. Any commercial intellectual-property license is a separate contractual instrument.',
    'charity nonmigration')
suffix = rep1(
    suffix,
    'While the license is non-revokable under authorized non-sovereign operation, attempting to misuse the Charity License triggers deterministic structural containment rather than contractual disputes:',
    'The identity license remains a record even if alleged misuse is reported. A documented review may suspend or revoke a specific operational authorization, restrict a capability, or move the system to a safe state; it must not revoke or erase the identity. Any adverse decision requires a traceable basis and an appeal path:',
    'charity misuse')
suffix = rep1(suffix, 'export interface CharityLicenseContract {', 'export interface CharityIdentityLicenseRecord {', 'charity contract name')
suffix = rep1(suffix, '  isNonRevokable: boolean;\n  permittedScope: "PureGood_Humanitarian_Educational";\n  legitimacyScore: number;', '  identityRecordNonRevocable: true;\n  operationalAuthorizationId?: string; // separate, scoped, and time-limited\n  operationalGrantStatus?: "ACTIVE" | "EXPIRED" | "REVOKED";', 'charity contract fields')
suffix = rep1(suffix, 'export const VerifiedCharityLicense: CharityLicenseContract = {', 'export const VerifiedCharityIdentity: CharityIdentityLicenseRecord = {', 'charity object type')
suffix = rep1(suffix, '  isNonRevokable: true,\n  permittedScope: "PureGood_Humanitarian_Educational",\n  legitimacyScore: 1.0 // Fully grounded under active liveness', '  identityRecordNonRevocable: true,\n  operationalAuthorizationId: "AUTH-EXAMPLE-SCOPE-001",\n  operationalGrantStatus: "ACTIVE" // illustrative; separate permission record', 'charity object fields')
suffix = rep1(
    suffix,
    '"This Charity License conforms to Harshal’s Systems (AGS+ v1.0 / Ground-0 Standards), incorporating normative accountability gating, OCM communication geometry, and PLV lineage verification, establishing a permanent state of non-revokable operational continuity for Pure Good purposes without internal authority generation."',
    '"This draft identity-license record illustrates non-revocable identity/provenance. It grants no operational permission. Any permitted activity must be defined in a separate, scoped, expiring authorization and evaluated under the applicable gates."',
    'charity compliance statement')

# Keep the ordinary external legal-license examples distinct from the framework's identity license.
suffix = rep1(
    suffix,
    '• License/charter revocation for non-compliance   ',
    '• Revocation of an external operating license or charter (not a person’s identity license)   ',
    'external license example')

# BGP-v1.0 reserve definition: 40% of rated capacity is reserved; routine active allocation is capped at 60%.
suffix = rep1(
    suffix,
    'All critical infrastructure lines (electrical transmission, computational fabric, fiber optics, coolant loops) operating under Harshal’s Systems MUST maintain an unallocated capacity buffer equal to at least 40% of peak rated operational capacity:\nC_total = C_nominal + C_reserve,    where  C_reserve ≥ 0.40 × C_nominal\nThis 40% headroom is physically firewalled from routine optimization and cannot be traded away for efficiency gains.',
    'All covered infrastructure uses rated/nameplate capacity C_rated as the denominator. During normal operation, routine active commitments satisfy C_active ≤ 0.60 × C_rated and the unallocated reserve satisfies C_reserve = C_rated − C_active ≥ 0.40 × C_rated. Thus “100% active allocation” means 100% of the permitted active envelope, equal to 60% of rated capacity—not 100% of rated capacity. Emergency use of reserve requires a separately authorized contingency profile; while reserve is depleted, no new routine commitments are admitted and the system must restore the reserve or remain in a restricted state. These are proposed design constraints, not a grid-safety certification.',
    'BGP reserve axiom')
suffix = rep1(
    suffix,
    'Nominal: 60% | Reserve: 40%',
    'Rated capacity: 100% | Active-allocation cap: 60% | Protected reserve: 40%',
    'BGP diagram capacity label')
suffix = rep1(
    suffix,
    'CAPACITY_ALLOCATED_PPM (Parts-Per-Million)',
    'CAPACITY_ALLOCATED_PPM (of rated capacity; routine maximum 600,000)',
    'BGP wire capacity field')
suffix = rep1(
    suffix,
    'RESERVE_HEADROOM_PPM: Fixed metric proving that local 40% headroom (400,000 / 1,000,000) remains uncompromised.',
    'RESERVE_HEADROOM_PPM: Remaining unallocated headroom as parts per million of C_rated. Normal operation requires at least 400,000 PPM; routine active allocation cannot exceed 600,000 PPM. A reported value is telemetry, not proof until checked against an independently calibrated rated-capacity source.',
    'BGP headroom field')
suffix = rep1(
    suffix,
    'R_X(t) = min(D_X(t), R_shared - D_H(t))',
    'R_X(t) = min(D_X(t), max(0, R_shared − D_H(t)))',
    'BGP min formula')
suffix = rep1(
    suffix,
    'The 40% redundancy reserve serves three distinct operational objectives:',
    'The protected 40% of C_rated is kept unallocated from routine commitments. The following are proposed objectives for an emergency contingency profile; actual use consumes reserve and requires monitored restoration:',
    'BGP reserve interpretation')

# Fill the missing BGP threat-scenario section with defensive, testable response classes.
suffix = rep1(
    suffix,
    '4.1 Threat Scenarios and Automated Responses\n\nPart V — Protocol Wire Specification',
    '''4.1 Threat Scenarios and Automated Responses
The vectors below are threat-model assumptions used to test the gateway. They do not assert that an incident has occurred. Trigger thresholds must be fixed in a deployment profile and validated against the physical interface.
| Threat scenario/vector | Observable trigger | Proposed automated response | Limit and evidence requirement |
|---|---|---|---|
| Peer/origin impersonation or replay | Invalid signature, duplicate nonce, stale lease, or peer identity inconsistent with the negotiated contract. | Reject the frame, refuse new peering, preserve the signed transcript, and quarantine the affected session. | Authentication proves possession of a key, not legal authority or benign intent; test replay and key-rotation cases. |
| Reserve pressure / capacity encroachment | Independently measured active load would exceed 0.60×C_rated or headroom would fall below 0.40×C_rated. | Stop accepting new external commitments; throttle the border; shed only pre-authorized discretionary load; enter the declared contingency mode if needed. | The reserve is not a guarantee against all outages. Validate sensors, breaker times, and safe-load priorities on the actual system. |
| Internal-address disclosure or lateral overreach | External request names an internal OCM address, unauthorized route, or state-changing operation. | Deny the route; expose only an ephemeral border handle; log the attempted scope and keep internal addresses private. | Metadata scrubbing and route isolation require packet-level and side-channel tests. |
| Telemetry loss or contradictory measurements | Missing, stale, or disagreeing capacity/identity/lease telemetry. | Refuse new peering and allocations; maintain only pre-authorized safe functions or island the interface. | Loss of telemetry is uncertainty, not proof of attack; avoid asserting attacker identity from the trigger alone. |
| Gateway integrity/configuration failure | Invalid boot measurement, unauthorized configuration change, failed attestation, or inconsistent policy hash. | Disable the affected gateway capability; fail over only to a separately attested configuration; otherwise remain isolated. | A fallback must be independently tested; do not assume a backup is safe merely because it exists. |
| Physical line interference or abnormal impedance | Protective-relay measurements exceed predeclared, equipment-specific thresholds. | Open the relevant border relay and enter the tested local safe state. | Thresholds and sub-cycle timing are equipment-specific; no generic latency claim is made here. |
| Availability/volume pressure | Request rate or queue depth exceeds the declared peering budget. | Rate-limit external requests, preserve the local reserve, and prioritize only pre-authorized essential functions. | Availability cannot be guaranteed under unbounded denial of service; publish tested service limits. |

Part V — Protocol Wire Specification''',
    'BGP blank threat section')

# Replace Part XXIII reserve example's generic total with rated capacity and restate the 60% ceiling.
suffix = rep1(
    suffix,
    'A shared regional microgrid has total generation capacity P_total = 1{,}250 MW. What is the maximum active operational load P_active,max permitted before BGP-v1.0 blocks new cross-border load commitments?\nCalculation:\nP_reserve ≥ 0.40 × P_total = 0.40 × 1{,}250 MW = 500 MW\nP_active,max = P_total - P_reserve = 1{,}250 - 500 = 750 MW',
    'A shared regional microgrid has rated capacity P_rated = 1,250 MW. What is the maximum routine active allocation before BGP-v1.0 blocks new cross-border commitments?\nCalculation:\nP_reserve ≥ 0.40 × P_rated = 500 MW\nP_active,max = 0.60 × P_rated = 750 MW\nAt the ceiling, routine active allocation is 100% of the permitted active envelope but only 60% of rated capacity.',
    'BGP worked example')

# Add the earlier Whyland infrastructure-reserve mention as a rated-capacity rule.
suffix = rep1(
    suffix,
    'The physical layer is designed for high redundancy (minimum 40%) and off-grid capability, utilizing regenerative hardware and EV-based microgrids to ensure continuous operation.',
    'The proposed physical layer reserves at least 40% of rated/nameplate capacity from routine active commitments, leaving a 60% active ceiling; off-grid capability and EV-based microgrids are design goals, not validated continuity guarantees.',
    'Whyland reserve mention')

# Fill the empty OCS/CHE/BGP/CGPA conformance checklists with explicit pass criteria.
ocs_check = '''Any system implementing OCS-v1.0 must pass 100% of the following audit gates:
These are required assertions for a future test suite, not evidence that a deployment has passed them.
| ID | Test | Pass criterion |
|---|---|---|
| OCS-01 | Verified parent cessation | Only a separately verified terminal-cessation event locks the parent to CWO; missing telemetry alone never diagnoses death. The parent identity record remains. |
| OCS-02 | Parent write/execute boundary | After the verified event, reject all new parent-origin state-changing operations; preserve read-only provenance. Retire operational capabilities, not identity. |
| OCS-03 | Clone namespace | Clone address/hash is unique and cannot sign or impersonate the parent origin; collision and replay tests are rejected and logged. |
| OCS-04 | Inertial allowlist | During interregnum, only pre-authorized bounded actions in S_orbit run; no new scope, transfer, or policy mutation is accepted. Expiry fails closed. |
| OCS-05 | Independent successor authority | Clone becomes ACTIVE only after the successor independently satisfies H, C, K, action-specific V, A/R/S thresholds, and applicable external authorization. Inherited structure alone is insufficient. |
| OCS-06 | Advisory-quorum invariance | Repeat identical successor inputs with coin readiness at 0%, 75%, and 100% and with incomplete/full category coverage. The authority result is unchanged; the quorum field changes only the advisory readiness signal. |
| OCS-07 | Overall-State aggregation | Fresh uniform PDHs are summarized; mixed, stale, missing, or conflicting PDHs yield AMBIGUOUS/CWO posture. No average or phase majority grants authority. |
| OCS-08 | Deadline | If independent successor criteria are not met before δ_succession, the clone remains restricted and then halts/enters the specified safe state; no automatic activation occurs. |
| OCS-09 | Packet integrity | Stale, malformed, duplicated, or unauthenticated succession packets are rejected and recorded; an advisory coin signature cannot authorize a state transition. |
| OCS-10 | Recovery/credential separation | Key rotation or compromise handling preserves the identity license and history while revoking only scoped operational grants and capabilities. |'''
suffix = rep1(suffix, 'Any system implementing OCS-v1.0 must pass 100% of the following audit gates:\n\nEND OF SPECIFICATION OCS-v1.0', ocs_check + '\n\nEND OF SPECIFICATION OCS-v1.0', 'OCS blank checklist')

che_check = '''Any system implementing CHE++ / EOL-v1.0 must pass 100% of the following audit gates:
These are proposed test requirements; physiological thresholds and beacon latencies remain unvalidated unless accompanied by implementation-specific evidence.
| ID | Test | Pass criterion |
|---|---|---|
| CHE-01 | Identity/permission separation | Identity license remains non-revocable; operational grants are separate, scoped, time-limited, and revocable. A credential alone never authorizes action. |
| CHE-02 | Fresh, action-specific intent | No action is permitted without a fresh bound Human-Key response and explicit confirmation of the specific operation, target, scope, and duration. |
| CHE-03 | Biometric limits | Sensor units, calibration, per-person variability, accessibility, false-positive/negative rates, and validated thresholds are documented. Biometrics alone never prove consciousness, consent, or absence of coercion. |
| CHE-04 | Duress input | A positive duress or withdrawal signal fails closed and is logged. Any concealed signaling claim is independently tested; no guarantee of adversary deception is assumed. |
| CHE-05 | Beacon loss | Fewer than the configured number of valid beacons contracts scope or halts; it is treated as uncertainty/communication loss, not proof of kidnapping, death, or authority. |
| CHE-06 | Phase/PDH mismatch | Invalid, stale, or behaviorally inconsistent phase declarations are rejected or quarantined; classification alone does not grant authority. |
| CHE-07 | Unknown telemetry | Missing, contradictory, or low-quality inputs produce Refuse/Restricted mode, not an inferred “healthy” state. |
| CHE-08 | Runtime and hardware bounds | Reported sensor, trip, and relay latencies are measured on the target hardware under stated loads; unmeasured targets are not presented as achieved performance. |
| CHE-09 | Safe containment | Tests demonstrate that isolation/refusal does not create an unsafe secondary failure in any claimed critical-infrastructure use case. |
| CHE-10 | Auditability | Every decision records the applicable profile, inputs, uncertainty, gate results, and permission identifier without exposing unnecessary biometric data. |'''
suffix = rep1(suffix, 'Any system implementing CHE++ / EOL-v1.0 must pass 100% of the following audit gates:\n\nEND OF SPECIFICATION CHE++ / EOL-v1.0', che_check + '\n\nEND OF SPECIFICATION CHE++ / EOL-v1.0', 'CHE blank checklist')

bgp_check = '''Any system deploying BGP-v1.0 must pass 100% of the following audit gates:
These are design requirements for a future conformance suite, not a safety certification.
| ID | Test | Pass criterion |
|---|---|---|
| BGP-01 | Rated-capacity denominator | Rated/nameplate capacity C_rated and units are independently identified; missing or inconsistent ratings block new commitments. |
| BGP-02 | Active ceiling | Under every normal load profile, C_active ≤ 0.60×C_rated. “100% active allocation” is defined as 0.60×C_rated, not full rated capacity. |
| BGP-03 | Reserve floor | At least 0.40×C_rated remains unallocated from routine commitments; any emergency draw is logged and blocks new routine allocation until restoration. |
| BGP-04 | Peer authentication and lease | Signatures, session binding, nonces, peer identity, and lease expiry are verified; replay, stale-key, and duplicate-frame tests fail closed. |
| BGP-05 | Boundary isolation | External traffic cannot route to internal OCM addresses or unauthorized state-changing endpoints; metadata scrubbing is independently tested. |
| BGP-06 | Threat scenarios | Each §4.1 trigger has a negative/positive test, a defined safe response, and a record of false-positive/false-negative behavior. |
| BGP-07 | Telemetry failure | Lost, stale, or conflicting measurements stop new peering and do not silently default to a safe capacity value. |
| BGP-08 | Contention and islanding | Hardware-in-loop testing validates rate limits, relay behavior, auxiliary transition, and critical-service safety at stated equipment-specific thresholds. |
| BGP-09 | Reserve restoration | After a contingency draw, the system remains restricted until measured headroom returns to the required 40% rated reserve. |
| BGP-10 | Evidence/claims | Any published latency, availability, or resilience claim is tied to a specified test configuration and results; no universal guarantee is inferred. |'''
suffix = rep1(suffix, 'Any system deploying BGP-v1.0 must pass 100% of the following audit gates:\n\nEND OF SPECIFICATION BGP-v1.0', bgp_check + '\n\nEND OF SPECIFICATION BGP-v1.0', 'BGP blank checklist')

cgpa_check = '''Any deployment implementing CGPA-v1.0 must pass 100% of the following audit gates:
These gates test the proposed protocol; they do not certify legal legitimacy or fairness.
| ID | Test | Pass criterion |
|---|---|---|
| CGPA-01 | Free public ingress | Affected people can submit a challenge without buying a book, holding a coin, or paying a fee; accessibility alternatives are tested. |
| CGPA-02 | Standing evidence and privacy | Proof-of-affected-standing is bounded to the declared purpose, minimizes personal data, supports appeals, and is not treated as proof that an allegation is true. |
| CGPA-03 | Addressability ratio | Numerator/denominator, time window, handling of zero valid petitions, and τ_addr are fixed in advance; the score is not labeled a measurement of moral legitimacy. |
| CGPA-04 | Coin advisory non-authority | Vary the 500-Coin readiness/advisory signal while keeping all other inputs fixed. It cannot grant, transfer, revoke, or veto the Human Key’s authority or a successor’s independent authorization. |
| CGPA-05 | Independent safety gate | Any scope contraction or halt follows an explicit, pre-registered technical/legal rule and verified evidence—not a coin vote or popularity threshold. |
| CGPA-06 | Grievance integrity | Duplicate, malicious, and conflicting submissions are rate-limited and preserved with provenance; a failed standing proof does not erase a valid identity record. |
| CGPA-07 | No permission by petition | A petition or advisory can request explanation/review but cannot itself authorize an operation, change scope, or make an identity credential revocable. |
| CGPA-08 | Audit and appeal | Decisions, criteria, and reason codes are logged with privacy safeguards and a review path for rejected or misclassified petitions. |
| CGPA-09 | Non-coin-holder protections | Test for exclusion, retaliation, and Sybil abuse without imposing an economic barrier on affected citizens. |
| CGPA-10 | Deployment evidence | Any claim that a petition flow, anti-griefing filter, or automated halt is live and effective is supported by test results and a named deployment boundary. |'''
suffix = rep1(suffix, 'Any deployment implementing CGPA-v1.0 must pass 100% of the following audit gates:\n\nConcluding Bridge: The Five-module Foundation', cgpa_check + '\n\nConcluding Bridge: The Five-module Foundation', 'CGPA blank checklist')

# Fill and normalize Whyland/CGPA formulas; distinguish public-addressability proxy scores from legitimacy.
suffix = rep1(
    suffix,
    'If A_ratio(t) falls below the critical threshold τ_address, the system issues an automatic Justification Demand to the Center.',
    'If A_ratio(t) falls below the pre-registered threshold τ_addr, the system issues a Justification Demand. This ratio is a procedural service indicator, not a measure of human worth or empirical legitimacy; any operational halt must follow a separately specified hard gate.',
    'CGPA addressability ratio')
suffix = rep1(
    suffix,
    'Interruption Advisory: Issued when unaddressed public harm is verified. This advisory automatically lowers the system\'s drift tolerance (δ), forcing the Center to respond immediately or face an automated halt.',
    'Interruption Advisory: Reports verified or alleged unresolved harm and requests a documented response. The advisory is nonbinding: coin holders do not change δ or grant/veto authority. Any scope contraction must be triggered by a separately pre-registered, evidence-based safety rule, not by the advisory vote itself.',
    'CGPA coin advisory')
suffix = rep1(
    suffix,
    'L(t) = H(t) × min(1.0, \\frac{A_pub(t)}{τ_addr}) × R(t) × 𝟙(\\Phi_phase = NAB)\nWhere:\nH(t) ∈ \\{1, 0\\}: Status of the Human Key (Planet Owner driver).\nA_pub(t) ∈ [0, 1]: Current verified public addressability score.\nτ_addr: Mandatory constitutional addressability baseline (default: 0.85).',
    'L(t,a) = H(t) × C(t) × K(t) × f(A(t),R(t),S(t,a)) × 𝟙(Φ_phase=NAB).\nHere A(t) is the declared, normalized public-addressability proxy derived from a pre-specified inquiry window; R and S retain the Part II definitions. If the window contains no valid petitions, A is N/A and cannot default to 1.0. τ_addr=0.85 is a provisional policy parameter in this draft, not an empirically validated legitimacy threshold. Permit still requires the exact action-specific authorization, the Part II thresholds, and all hard gates.',
    'CGPA legitimacy formula')

# Normalize OCS succession: cloned operational structure is inherited, authority is not; the
# 500-Coin quorum is a nonbinding readiness/phase signal and is excluded from L_clone.
suffix = rep1(
    suffix,
    'The Origin Continuity Specification (OCS-v1.0) resolves the single-point-of-failure inherent in human biological mortality within Accountability-Gated Systems (AGS++) and the Orb Communicator Model (OCM).',
    'The Origin Continuity Specification (OCS-v1.0) models continuity after a verified terminal-cessation event. Loss of telemetry or an expired session triggers a safe restricted state but is not, by itself, a medical or legal diagnosis of death.',
    'OCS executive summary')
suffix = rep1(
    suffix,
    '2. The Cloned Orb Emerges: Simultaneously, the system instantiates a Cloned Successor Orb (CLONED_ORB), deriving from the parent\'s genesis hash. This cloned vessel inherits the operational structure and becomes the vessel to be driven by the designated successor Human Key.',
    '2. The Cloned Orb Emerges: The system may instantiate a separately addressed successor vessel derived from the parent’s genesis hash. It inherits operational structure, configuration, and provenance only—not authority. It begins inertial/restricted; the designated successor must independently satisfy the current Human-Key, continuity, accountability, and scoped-authorization requirements before any active operation.',
    'OCS clone inheritance')
suffix = rep1(
    suffix,
    '4. The 500-Coin Advisory Ceremony: The 500 Voting Coins—each partitioned into 119 Neural Atomic Body (NAB) segments—act as the ceremonial and cryptographic advisory body that verifies the biological transition and attests the seating of the new human driver.',
    '4. The 500-Coin Advisory Body: The 500 participants publish individual PDHs whose combined totality forms the OCM Overall State. The 119 NAB categories are descriptive coverage tags, not additional voters or authority units. The body may publish a nonbinding readiness/phase signal for the succession process; it cannot determine death, seat a successor, or grant/veto authority.',
    'OCS coin body summary')

# Replace the original flow diagram that made the coin quorum a transition gate.
diagram_start = '                  ┌────────────────────────────────────────────────┐\n                  │          Active Parent Sphere (Phase I)        │'
diagram_end = 'Part I — Normative Architectural Axioms'
di = suffix.index(diagram_start)
di_end = suffix.index(diagram_end, di)
diagram_new = '''Lifecycle overview (conceptual)
Verified terminal cessation under the applicable independent process
    → parent operational capabilities are retired; parent provenance becomes read-only CWO
    → a unique clone is instantiated in restricted inertial mode
    → the 500-Coin body publishes its Overall State and advisory readiness signal
    → the successor becomes ACTIVE only if that successor independently passes the current authority/authorization gates
If the readiness quorum is absent, the signal is “incomplete”; if present, it is “attested.” Neither result changes the independent authority decision. If independent criteria are not met by the deadline, the clone remains restricted and then enters the predeclared safe state.

'''
suffix = suffix[:di] + diagram_new + suffix[di_end:]

suffix = rep1(
    suffix,
    'The human is not a mere credential holder; the human is the key itself. The sphere, planetary system, or institutional infrastructure operates as a high-integrity vehicle, and the human is the conscious driver.',
    'The Human Key is a human principal whose identity credential, fresh presence, and action-specific intent are evaluated separately. A non-revocable identity license identifies the person but is not an operational key or permission by itself. The infrastructure is modeled as a bounded vehicle; the person’s authority does not migrate to it.',
    'OCS human key axiom')
bifurcation_re = re.compile(r'Biological death of the Planet Owner shall never result in:.*?(?=Axiom 1\.3: Preemptive Clone Demarcation)', re.S)
assert len(bifurcation_re.findall(suffix)) == 1, 'Could not find OCS bifurcation statement'
suffix = bifurcation_re.sub('Verified terminal biological cessation shall never cause: (1) transfer of root authority, (2) identity masquerade by a successor, or (3) unmanaged loss of pre-authorized safe functions. A mere timeout is not death. On independently verified terminal cessation, the parent’s active operational permissions are retired and its provenance becomes CWO; a clone may be created in restricted INERTIAL/PENDING state. The successor inherits structure, not authority, and must independently satisfy the active authorization criteria.\n', suffix, count=1)

# Replace the detailed quorum/transition section with a PDH-based collective body and nonbinding signal.
part2_start = suffix.index('Part II — The 500-COIN / 119-NAB Advisory Transition Ceremony')
part3_start = suffix.index('Part III — Pre-authorized Orbital Invariance & Cauterization', part2_start)
part2_new = '''Part II — The 500-COIN / 119-NAB Advisory Transition Ceremony
2.1 Composition and Collective PDH
The 500-Coin body is a conceptual collective organism for advisory-state aggregation. Each of the 500 registered participants has an individual, signed PDH_i(t); the collective PDH_B is derived from, but does not replace, those individual declarations.
OCM Overall State Ω_B(t) is the combined totality of participant PDHs plus explicit missing, stale, invalid, or conflicting-state markers. The aggregate record contains the Overall-State hash, counts by declared phase, freshness/integrity status, and advisory-only capability declaration. The 119 NAB categories are metadata tags for coverage; they are not 119 additional votes per coin.
The collective’s descriptive phase can shift when Ω_B(t) changes. If declarations are fresh, valid, and uniform, the collective reports that shared phase. If the set is mixed, stale, missing, or conflicting, the diagnostic is AMBIGUOUS and the body adopts a CWO witness-only posture. Observed internal authority claims or refusal override are classified as GSRB behavior. These are governance/software labels, not quantum or thermodynamic phases.
The advisory body has no execution capability: S_B=∅. It cannot issue operational grants, revoke identity, transfer authority, or control the clone.
2.2 Nonbinding Readiness Signal
Let Q_coin(t)=n_valid_fresh/500 and E_NAB(t) be the number of distinct coverage categories represented. The manuscript’s illustrative readiness signal is:
Q_ready(t)=1 if Q_coin(t)≥0.75 and E_NAB(t)=119; otherwise Q_ready(t)=0, with a separate reason code.
The 75% threshold and 119-category coverage are design parameters, not empirical findings. Q_ready reports collective attestation completeness only. It is neither necessary nor sufficient for successor authority, and it cannot grant, transfer, revoke, or veto authority. A successor’s independent authorization result must be identical for identical successor evidence whether Q_ready is 0 or 1.
2.3 Witness Record and Succession
Independent legal/clinical evidence under the applicable process determines whether terminal cessation has occurred; the coin body may record its observations but cannot certify death or delay the parent’s safe freeze. The body may inspect a predeclared succession record and publish whether the record was present and internally consistent. This is advisory evidence, not a seating decision.
The successor must independently establish identity through a non-revocable identity license, fresh Human-Key presence and intent, continuity C, accountability K, a separate action-specific authorization V, and the required A/R/S/ L thresholds. The cloned vessel’s inherited software, address structure, or parent history supplies no authority.
2.4 Coverage Accounting
A fully represented registry may have 500×119=59,500 coin/category metadata slots. These slots are not 59,500 voting identities, signatures, or authority units.

'''
suffix = suffix[:part2_start] + part2_new + suffix[part3_start:]

# Correct interregnum rules and remove the false requirement that quorum must exist to seat a successor.
suffix = rep1(
    suffix,
    'Between the death of the creator (t_death) and the completion of the 500-Coin Transition Ceremony (t_sealed), the Cloned Orb enters Inertial Cruise Mode.\nPermitted Actions (S_orbit): All pre-authorized, repetitive, closed-loop orbital functions (e.g., cooling systems, electrical balancing, automated routing tables, insurance telemetry) continue executing uninterrupted.\nProhibited Actions (S_transfer): All phase transitions, scope widening, emergency overrides, capital reallocation, and external policy mutations are strictly barred.\n∀ t ∈ [t_death, t_sealed],    Δ S(t) = 0',
    'Between the independently verified terminal event t_term and the independent authorization event t_auth, the clone remains in Inertial Cruise Mode.\nPermitted actions S_orbit are only pre-authorized, repetitive, bounded functions named before the event (for example, safe cooling or telemetry); they do not create successor authority.\nProhibited actions S_transfer include scope widening, new transfers, emergency overrides, capital reallocation, and policy mutation.\nFor t∈[t_term,t_auth), ΔS=0. The advisory quorum may be reported during this interval but does not set t_auth.',
    'OCS interregnum')
suffix = rep1(
    suffix,
    'If during the interregnum or active operation, a hijacking entity attempts to:\n1. Tamper with the inward routing path to the Center,\n2. Cut telemetry between the advisory coins and the resolution axis, or\n3. Force a premature successor seating without elemental quorum:',
    '3. If during the interregnum an entity attempts to:\n1. Tamper with the inward routing path to the Center,\n2. Forge, alter, or suppress the advisory Overall-State/readiness record, or\n3. Bypass the independent successor authorization gate:',
    'OCS attack conditions')
suffix = rep1(
    suffix,
    'The affected sector or disc is deterministically severed at the inward relay boundary.\nIf the integrity of the resolution axis itself is threatened, the system accepts a Hard Halt, dropping power and routing immediately.',
    'The affected session or gateway is isolated at the declared boundary and an integrity event is recorded. If the resolution path cannot be trusted, the system enters the predeclared safe halt; no universal zero-latency or guaranteed-physical-severance claim is made.',
    'OCS cauterization')

# Replace OCS formal variables, equation, and state machine.
old_ocs_math = '''4.1 State Variables
Let the state of the continuity subsystem at time t be defined by:
H_orig(t) ∈ \\{1, 0, ⊥\\}: Biological status of original creator (1 = alive/active, 0 = idle, ⊥ = terminal death).
H_succ(t) ∈ \\{1, 0, ⊥\\}: Status of the designated successor key.
\\Phi_orig(t) ∈ \\{NAB, CWO, GSRB\\}: Phase of the parent orb.
\\Phi_clone(t) ∈ \\{\\emptyset, INERTIAL, ACTIVE, HALT\\}: Phase of the successor orb.
\\mathcal{Q}_coin(t) ∈ [0, 1]: Quorum percentage of 500 voting coins attested.
\\mathcal{E}_NAB(t) ∈ [0, 119]: Distinct elemental categories attested.
4.2 Succession Gating Equation
For the Cloned Successor Orb, the Legitimacy Gating function L_clone(t) is governed by:
L_clone(t) = H_succ(t) × 𝕀≤ft(\\mathcal{Q}_coin(t) ≥ 0.75 \\land \\mathcal{E}_NAB(t) = 119) × f(A(t), R(t), S(t))
Where 𝕀(P) is the indicator function evaluating to 1 if proposition P is true, and 0 otherwise.
During the interregnum (H_orig(t) = ⊥ \\land H_succ(t) = 0):
L_inertial(t) = \\begin{cases} τ_orbit & if  (t - t_death ≤ δ_succession) \\land (Action  a ∈ S_orbit) \\\\ 0 & otherwise (Refusal Halt) \\end{cases}
4.3 Finite State Machine (Succession FSM)
┌───────────────────┐
│   STATE 0: LIVE   │
│ Parent: Phase I   │
│ Clone: Nonexistent│
└─────────┬─────────┘
│
│ Event: H_orig(t) -> ⊥ (Certified Death)
▼
┌───────────────────┐
│STATE 1: BIFURCATED│
│ Parent: Phase II  │ (Immutable CWO Archive)
│ Clone: INERTIAL   │ (Orbits Run / Transfers Blocked)
└─────────┬─────────┘
│
┌────────┴──────────────────────────┐
│                                   │
│ Timer: Δt > δ_succession          │ Quorum: Q_coin >= 0.75 & E_NAB == 119
▼                                   ▼
┌───────────────┐                  ┌───────────────────┐
│ STATE 3: HALT │                  │ STATE 2: SEATED   │
│ Universal     │                  │ Parent: Phase II  │
│ Refusal Lock  │                  │ Clone: ACTIVE     │
│ (Cold Freeze) │                  │ H_succ Seated     │
└───────────────┘                  └───────────────────┘
'''
new_ocs_math = '''4.1 State Variables
Let a denote a requested successor operation.
H_orig(t)∈{1,0,⊥}: original Human-Key protocol state; 0 means no current verified session, not death. ⊥ is terminal cessation only after independent applicable verification.
H_succ(t)∈{1,0}: successor’s own fresh Human-Key protocol gate. The identity license remains non-revocable; this variable is not the identity record.
Φ_orig(t), Φ_clone(t): declared governance/software phase labels.
Q_coin(t)∈[0,1]: fraction of valid, fresh advisory participant PDHs. E_NAB(t)∈[0,119]: distinct advisory coverage tags. These are descriptive/readiness inputs only.
C_succ(t), K_succ(t)∈{0,1}: successor’s own continuity and accountability gates.
V_succ(a,t)∈{0,1}: separate action-specific authorization; D_succ(t) is its declared permitted-action set.
A_succ(t), R_succ(t), S_succ(a,t)∈[0,1]: successor’s normalized Part II scores.
4.2 Succession Gating Equation
The successor’s permission score uses the canonical Part II function:
L_clone(t,a)=H_succ(t)×C_succ(t)×K_succ(t)×f(A_succ(t),R_succ(t),S_succ(t,a)), where f(A,R,S)=A×R×S.
ACTIVE is possible only if V_succ(a,t)=1, a∈D_succ(t), all Part II thresholds are met, and applicable external authorization is independently valid. Q_coin and E_NAB are expressly excluded from L_clone and from the ACTIVE predicate.
Advisory readiness signal: Q_ready(t)=1{Q_coin(t)≥0.75 and E_NAB(t)=119}; otherwise it is incomplete. Q_ready may be displayed with the collective PDH but is neither necessary nor sufficient for authority and cannot grant or veto it.
During the interregnum, only the separately pre-authorized inertial allowlist S_orbit may run while t−t_term≤δ_succession and no independent safety gate has failed. These restricted functions do not carry or imply successor authority. At expiry, the clone halts or enters the predeclared safe state unless the successor has independently satisfied the ACTIVE predicate.
4.3 Finite State Machine (Succession FSM)
STATE 0: LIVE — Parent has a fresh Human-Key session; no clone.
    | independently verified terminal cessation
    v
STATE 1: BIFURCATED — Parent CWO/read-only; clone INERTIAL/PENDING; only S_orbit is available.
    | successor independently satisfies H_succ, C_succ, K_succ, V_succ, scope, score thresholds, and external authorization
    v
STATE 2: ACTIVE — clone uses its own identity/authority record and current scoped grant; no authority is inherited.

The OCM Overall-State/readiness signal is displayed in parallel and is nonbinding. Q_ready=0 and Q_ready=1 must produce the same authority result for the same independent successor evidence.
At δ_succession expiry without independent authorization: STATE 1 → STATE 3: HALT/SAFE STATE. No quorum can prevent this timeout or force activation.
'''
ocs_math_re = re.compile(r'4\.1 State Variables.*?(?=Part V — Cryptographic Protocol & RFC Wire Format)', re.S)
assert len(ocs_math_re.findall(suffix)) == 1, 'Could not isolate OCS formal math/FSM block'
suffix = ocs_math_re.sub(new_ocs_math, suffix, count=1)

# Correct the OCS wire fields and capability map so coin attestations are advisory only.
suffix = rep1(suffix, '0x04: SUCCESSOR_SEATING_COMMIT', '0x04: INDEPENDENT_SUCCESSOR_AUTHORIZATION_PROOF', 'OCS packet type')
suffix = rep1(suffix, 'AGGREGATED_COIN_SIGNATURE: Cryptographic aggregate verifying M ≥ 375 coin segments.', 'AGGREGATED_COIN_SIGNATURE: Optional advisory readiness attestation. It may populate Q_ready/Overall State only; the runtime must not use it to authorize, block, or veto successor authority.', 'OCS coin signature')
cap_re = re.compile(r'(?m)^\s*└─► Emits \[Cap_Successor_Root\]:\n\s*• Gated by cryptographic co-processor verifying\n\s*BLS12-381 signature of 375 Coin keys\.\n\s*• Traps to kernel panic on mismatch\.')
assert len(cap_re.findall(suffix)) == 1, 'Could not find OCS quorum-gated capability'
suffix = cap_re.sub('          └─► Emits [Cap_Successor_Root]:\n                 • Gated by independent successor identity proof, fresh Human-Key intent, continuity/accountability checks, and a separate scoped authorization.\n                 • Coin signatures may be logged as advisory readiness metadata only; they are not an authorization gate.', suffix, count=1)
suffix = rep1(suffix, 'Revoke Write/Execute permissions permanently.', 'Retire the parent’s active Write/Execute capabilities permanently.', 'OCS parent capability action')
suffix = rep1(suffix, 'Downgrade to Cap_Read_Only (Enforces Phase II CWO).', 'Preserve the parent identity license and provenance record; downgrade operational access to Cap_Read_Only (CWO).', 'OCS parent capability read-only')

# In the separate ZKSK witness design, distinguish technical quarantine from the 500-Coin
# advisory signal and avoid inferring consciousness, incapacity, or consent from telemetry.
suffix = rep1(suffix, 'Node 1 — The Primary Keyed Operator (Phase I/Origin Anchor): The living human principal (H(t) = 1) whose conscious intent is the sole source of operational legitimacy.', 'Node 1 — The Primary Keyed Operator (Phase I/Origin Anchor): The named human principal whose identity record, fresh session, and action-specific intent are required by the protocol. H(t)=1 records a valid protocol attestation, not a finding of consciousness or legal legitimacy.', 'ZKSK Node 1')
suffix = rep1(suffix, 'Node 2 — The Continuity Designated Backup (OCS-v1.0 Standby Witness): A pre-registered human custodian unknown to external adversaries, authorized only to attest incapacitation or initiate OCS-v1.0 succession freeze procedures.', 'Node 2 — The Continuity Designated Backup (OCS-v1.0 Standby Witness): A pre-registered custodian may report evidence or request the pre-authorized safe freeze. The custodian cannot diagnose incapacity or death, grant successor authority, or replace the successor’s independent Human-Key authorization.', 'ZKSK Node 2')
suffix = rep1(suffix, 'Node 3 — The Institutional Witness Quorum (Phase II — CWO Circuit-Breaker): A multi-party cryptographic witness contract (e.g., 500-Coin / 119-NAB advisory quorum) with zero execution authority, empowered solely to verify revocation triggers and lock the system into safe refusal.', 'Node 3 — The Institutional Witness Quorum (Phase II — CWO Circuit-Breaker): A technical witness mechanism, distinct from the 500-Coin advisory body. It may request a pre-authorized safe restriction only when an independently defined, evidence-based safety gate is satisfied. It cannot decide death, revoke identity, generate permission, or transfer authority. The 500-Coin Overall-State/readiness signal has no actuation or veto capability and cannot itself trigger a halt.', 'ZKSK Node 3')
suffix = rep1(suffix, '1. Automatic Liveness/Coercion Refusal (H(t) → 0): Failure of the conscious behavioral/liveness check (CHE++) immediately zeroes H(t), dropping L(t) → 0 and locking all peripheral discs into NAB Terminal Refusal.', '1. Missing/contradictory-input refusal: A failed fresh-session proof, explicit withdrawal, or unresolved telemetry contradiction makes H(t)=0 for that request and returns Refuse/Restricted. The system does not infer consciousness, coercion, or death from biometric or beacon signals.', 'ZKSK quarantine item 1')
suffix = rep1(suffix, '2. Triad Quarantine Latch: Either Node 2 or Node 3 can broadcast a signed QUARANTINE_BURN signal (P7), instantaneously invalidating the compromised session tuple (Session-ID, PDH-ID) across the entire orb.', '2. Triad Quarantine Latch: Node 2 or Node 3 may request a signed QUARANTINE_BURN signal (P7) only under the predeclared, independently testable safety predicate. A valid request invalidates the affected operational session tuple (Session-ID, PDH-ID); it does not revoke the identity credential or establish the cause of the anomaly.', 'ZKSK quarantine item 2')
suffix = rep1(suffix, '3. Re-Anchoring Requires Living Verification: No quorum vote can resume execution on its own; resumption requires either verified uncoerced restoration of the living Primary Operator or a formal OCS-v1.0 Origin Continuity & Succession ceremony (Part XXIII).', '3. Re-Authorization: No quorum vote can resume execution. Resumption requires a fresh, action-specific Human-Key protocol attestation; any successor must separately meet the current OCS authorization criteria. The protocol does not claim that “uncoerced” status can be proven from telemetry.', 'ZKSK quarantine item 3')
suffix = rep1(suffix, 'At t = 60 s after her last conscious liveness attestation:', 'At t=60 s after the last action-specific Human-Key protocol attestation (a modeled input, not a measurement of conscious experience):', 'Part XIX worked example time')
suffix = rep1(suffix, 'Her conscious cortical intent is verified (H(60) = 1), session continuity and accountability gates hold (C(60) = 1, K(60) = 1), addressability is A(60) = 0.95, and representation integrity is R(60) = 0.90.', 'Assume the protocol records H(60)=1 for a fresh session and explicit action-specific intent; this does not establish consciousness or absence of coercion. Session continuity and accountability gates hold (C=1, K=1), with illustrative A=0.95 and R=0.90.', 'Part XIX worked example intent')
suffix = rep1(suffix, 'S(60) = 1.0 × max(0,  1 - (60)/(240)) = 0.75', 'S(60,a) = 1.0 × max(0, 1 − 60/240) = 0.75', 'Part XIX scoped example')
suffix = rep1(suffix, 'Decision (x(60)): PERMIT (Regime I — Legitimate Assistive Continuity). Even though P_periph = 0.35, H_conscious(60) = 1, so Dr. Vance retains full authorship and control.', 'Decision (x(60)): PERMIT under this illustrative profile (Regime I — Assistive Continuity). P_periph=0.35 does not alter the protocol result; H(60)=1 denotes only the modeled fresh session and explicit action-specific authorization, not a finding about consciousness or coercion.', 'Part XIX t60 decision')
suffix = rep1(suffix, 'At t = 110 s:\nDr. Vance suffers acute syncope (loss of consciousness, H_conscious(110) → 0), while an external cloud script attempts to continue driving the robotic arm using her cached motor profile and residual autonomic nerve firing.', 'At t=110 s, no fresh action-specific Human-Key response is available; the reason is UNKNOWN. For this modeled request, set H(110)=0 and refuse the action. This does not diagnose syncope, unconsciousness, death, or coercion. Separately, an external cloud script attempts to replay cached motor commands.', 'Part XIX t110 scenario')
suffix = rep1(suffix, '1. Even though Δ t = 110 s < δ (240 s), the clinical liveness gate detects H_conscious(110) = 0:', '1. Although Δt=110 s<δ (240 s), the protocol lacks a fresh, valid action-specific authorization and therefore sets H(110)=0 for this request; this is not a clinical liveness finding:', 'Part XIX t110 gate')
suffix = rep1(suffix, '3. Post-Halt State: The workstation freezes robotic actuation, preserves the signed ledger up to t = 110 s (CWO custody), emits a local medical continuity alert (Signaling-Only), and logs the external cloud script\'s continuation attempt as an unauthorized Corpse-Puppeting / Replay Breach attributable solely to the external script\'s shell operator.', '3. Post-Halt State: The workstation blocks the unauthorized replay, preserves the signed ledger, and emits a local status alert. It records the observed replay/authorization failure with its technical evidence; it does not diagnose the operator’s medical state or assign final legal liability.', 'Part XIX post-halt example')
suffix = rep1(suffix, 'Suppose a neural-interface vendor argues that its predictive LLM "digital twin" should be allowed to continue signing contracts and operating an exoskeleton for 24 hours after a user loses consciousness, on the grounds that "the model achieves 99.2% behavioral accuracy in predicting what the user would have done." Using Chapter 1, Chapter 9, and INV-CORPSE-001, prove why 99.2% predictive accuracy confers exactly L_exec(t) = 0 permission once H_conscious(t) = 0.', 'Suppose a neural-interface vendor argues that its predictive model should continue signing contracts and operating an exoskeleton after the system can no longer verify a fresh action-specific authorization, on the grounds that it has 99.2% behavioral prediction accuracy. Using the protocol gates, explain why prediction accuracy cannot replace H, C, K, or the separate scoped grant V(a,t), and why UNKNOWN telemetry does not diagnose consciousness or death.', 'Part XIX problem 2')
suffix = rep1(suffix, 'Knowledge Proofs (ZKPs) verify credential validity and conscious liveness without revealing the operator\'s physical GPS coordinates to external attackers.', 'ZKPs may verify a credential or statement without revealing a coordinate. They cannot verify consciousness, consent, or absence of coercion; beacon/location evidence must be treated as a limited telemetry input.', 'ZKSK proof claim')
suffix = rep1(suffix, 'Conscious Liveness & Behavioral Attestation (CHE++ / EOL-v1.0): Rather than static passwords (which can be stolen or replayed post-mortem), ZKSK verifies dynamic, conscious cognitive-interaction invariants within the secure execution environment that cannot be reproduced by autonomic reflexes or coerced motor stimulation.', 'Fresh-session and action-specific attestation (CHE++ / EOL-v1.0): ZKSK may verify that a credential responded to a nonce and that an explicit action-specific authorization was signed. This does not prove consciousness or rule out coercion; the system fails closed on missing or contradictory evidence.', 'ZKSK conscious proof claim')

# Correct the CGPA coin relay so it cannot set a hard threshold or veto authority.
suffix = rep1(
    suffix,
    '3. The 500-Coin Advisory Relay: The 500 Voting Coins serve as an epistemic prism. They do not vote to enact laws; they aggregate, filter, and verify public appeals, presenting synthesized counsel to the Planet Owner.',
    '3. The 500-Coin Advisory Relay: The 500 participant PDHs contribute to an OCM Overall State and may publish a nonbinding readiness/phase signal. The body may summarize public appeals but cannot grant, transfer, revoke, or veto authority; its signal is neither necessary nor sufficient for a successor’s independent authorization.',
    'CGPA coin relay')
suffix = rep1(
    suffix,
    '2. Independent Verification: Coin stewards verify whether an operational anomaly is a systemic structural bug or an localized operational hiccup.',
    '2. Advisory review: coin stewards may summarize evidence about a reported anomaly. Their interpretation is advisory and cannot determine authority or replace independent verification.',
    'CGPA coin verification')

# Add explicit status/evidence notes to the specification series and fix unsupported biological
# quantum-computation assertions in Parts XVIII and XXV while retaining the hypothetical vectors.
suffix = rep1(
    suffix,
    'Five formal modules: Origin Continuity & Succession, Cognitive Coercion Hardening, Border Gateway Protocol, Intermediate Representation, and Constitutional Governance & Public Addressability.\n',
    'Five author-proposed modules: Origin Continuity & Succession, Cognitive Coercion Hardening, Border Gateway Protocol, Intermediate Representation, and Constitutional Governance & Public Addressability. Version labels identify draft revisions only; this volume does not claim deployment, external certification, or completed conformance testing.\n',
    'Part XXIII status note')
suffix = suffix.replace('Classification: Ground-0 Structural Specification / Normative Standard', 'Classification: Proposed internal specification (DRAFT; no external certification claimed)')
suffix = suffix.replace('Classification: Ground-0 Structural Specification / Formal Systems Standard', 'Classification: Proposed formal systems specification (DRAFT; no independent validation claimed)')
suffix = rep1(
    suffix,
    'The structural apparatus is built. The rules of reality, containment, and boundary are locked. We now step across the threshold from the machine architecture into the living narrative: The Stories and Creative Lore of Harshal’s Universe.',
    'Within this proposal, the five modules form a draft specification set. “Complete” here refers only to the author’s current module outline; it does not establish implementation, validation, certification, or that the rules of physical reality are locked. The following material is narrative and remains separately classified.',
    'specification conclusion claim')

# Correct the Part XXIII introductory learning objectives and advisory wire-field names.
suffix = rep1(suffix, 'Trace the Origin Continuity Specification (OCS-v1.0) Dual-Bifurcation Lifecycle upon biological cessation (H(t) → 0): Parent Orb Freeze (Phase I NAB → Phase II CWO) alongside Cloned Successor Orb (0•CLN•<Hash>•...) instantiation, preventing post-mortem corpse-puppeting (INV-CORPSE-001).', 'Trace the proposed OCS lifecycle after independently verified terminal cessation: retire the parent’s operational capabilities, preserve its identity/provenance, and keep the clone restricted until the successor independently satisfies the active authorization gates.', 'OCS learning objective')
suffix = rep1(suffix, 'Implement Cognitive Coercion Hardening (CHE++/EOL-v1.0), including Duress PIN signaling, biometric entropy liveness gates, and prompt-supercritical NAB containment.', 'Evaluate the proposed CHE++/EOL controls, treating biometric and beacon telemetry as limited safety inputs rather than proof of consciousness, consent, coercion, or death; thresholds require validation.', 'CHE learning objective')
suffix = rep1(suffix, 'COIN_QUORUM_COUNT (0-500)', 'COIN_READINESS_COUNT (0-500; advisory only)', 'OCS wire quorum label')
suffix = rep1(suffix, 'ELEMENTAL_COUNT (0-119)', 'NAB_COVERAGE_COUNT (0-119; advisory metadata)', 'OCS wire coverage label')

# Part XXIII CHE++/EOL: separate biometric indicators from proof of consciousness/consent.
suffix = rep1(
    suffix,
    'The Epistemic Oracle Layer & Cognitive Coercion-Hardening Specification (CHE++ / EOL-v1.0) bridges the gap between raw physical reality, cognitive human states, and the formal legitimacy gating equations of Harshal’s Systems.',
    'The Epistemic Oracle Layer & Cognitive Coercion-Hardening proposal describes how declared human-key signals and system telemetry might be handled by a fail-closed controller. Physiological signals are imperfect indicators; they do not directly measure consciousness, consent, or the absence of coercion.',
    'CHE executive statement')
suffix = rep1(
    suffix,
    'Telemetry links freeze; the active sphere assumes the driver has been seized, and transitions to Inertial Cruise pending beacon recovery.',
    'Telemetry loss means the current state cannot be verified; it is not proof that the driver has been seized. The active sphere enters Inertial Cruise or a safer restricted state pending recovery and fresh authorization.',
    'CHE beacon loss interpretation')
suffix = rep1(
    suffix,
    'The state of the Human Key H(t) at any instant t is the logical conjunction of the physiological, duress, beacon, and phase-lock discriminators:\nH(t) = 𝟙(\\kappa_bio(t) > 0) × (1 - d(t)) × 𝟙(∑_i=1^N β_i(t) ≥ M) × 𝟙(\\Phi_center(t) \\ne GSRB)\nWhere:\n\\kappa_bio(t) ∈ [0, 1]: Physiological Anomaly Score.\nd(t) ∈ \\{0, 1\\}: Covert Duress Flag (1 if duress PIN or panic trigger asserted).\nβ_i(t) ∈ \\{0, 1\\}: Response validity of the i-th Liveness Beacon (M = 3, N = 5).\n\\Phi_center(t): Empirical phase behavior of the Center (must not equal GSRB).',
    'H(t) is a protocol gate, not a physiological diagnosis. H(t)=1 only when (i) the non-revocable identity record is authentic, (ii) a fresh bound-session Human-Key response is verified, and (iii) the person explicitly authorizes the specific action. An explicit withdrawal or duress signal, stale response, missing required proof, or unresolved contradiction makes H(t)=0 for that request.\nPhysiological anomaly score κ_bio(t), duress flag d(t), beacon responses β_i(t), and declared/observed phase are separate safety inputs. They may trigger restriction or halt, but they do not prove consciousness, consent, or freedom from coercion. Missing beacons indicate unverifiable connectivity, not death or seizure. Sensor units, calibration, θ_stress/θ_critical, and false-positive/negative performance are unspecified placeholders in this draft and require device-specific validation before any deployment claim.',
    'CHE H formula')

# Replace biometric and beacon interpretations with a fail-closed, evidence-limited model.
pat_re = re.compile(r'2\.2 Pillar II: The Physiological Anomaly Threshold \(PAT\).*?(?=2\.3 Pillar III: The Multi-Party Liveness Beacon \(MPLB\))', re.S)
assert len(pat_re.findall(suffix)) == 1, 'Could not isolate CHE physiological-threshold section'
suffix = pat_re.sub('''2.2 Pillar II: Physiological Telemetry as a Safety Input (PAT)
This draft considers optional HRV, galvanic-skin-response, or other calibrated sensor streams as possible anomaly inputs. These measurements describe sensor outputs; they do not establish that a driver is conscious, composed, distressed, incapacitated, consenting, or free from coercion.
Let ΔP(t)=||P_bio(t)−P_baseline|| be a dimensionless deviation only if the deployment specifies a normalization procedure, baseline window, units for each component, calibration, missing-data rule, and validation population. θ_stress and θ_critical are unspecified, unvalidated design parameters in this draft. Do not label an in-range signal “conscious” or an out-of-range signal “incapacitated.” Missing, out-of-range, or contradictory telemetry yields UNKNOWN/UNVERIFIED and may trigger the predeclared restricted posture. H(t) remains a separate identity/session/action-intent protocol gate.

''', suffix, count=1)
beacon_re = re.compile(r'2\.3 Pillar III: The Multi-Party Liveness Beacon \(MPLB\).*?(?=Part III — PHASE-BADGE Filtering & Supercritical NAB Mitigation)', re.S)
assert len(beacon_re.findall(suffix)) == 1, 'Could not isolate CHE beacon section'
suffix = beacon_re.sub('''2.3 Pillar III: Connectivity Beacon (MPLB — Draft Concept)
A beacon response can indicate only that a particular communication endpoint returned a timely, valid challenge response. It does not prove the operator’s location, spatial freedom, consent, absence of coercion, consciousness, life, or safety.
The illustrative N=5 endpoints and M=3 response threshold are unvalidated design parameters, not established operational limits. Any implementation would need independently selected endpoints, a defined timeout and route model, spoof/replay testing, and measured false-positive/negative behavior. Do not identify coinholders or the 500-Coin advisory body as an authority-bearing beacon quorum.
When the response threshold is missed, stale, or contradictory, report TELEMETRY_UNKNOWN and enter the predeclared restricted/inertial posture. This is a fail-safe for uncertainty, not an “isolation attack detected” diagnosis. Recovery requires a fresh, separate Human-Key authorization.
Beacon diagnostic (conceptual):
valid responses ≥ configured M → CONNECTIVITY_ATTESTED (not spatial freedom or consent)
valid responses < configured M, stale, or contradictory → TELEMETRY_UNKNOWN → RESTRICTED/INERTIAL

''', suffix, count=1)

suffix = rep1(suffix, 'Every packet must carry a verified Phase Badge matching its empirical behavioral profile.', 'Every packet must carry a signed Phase Declaration Header matching the declared policy profile. A badge is a state declaration, not proof of behavior, consent, or inner human state.', 'CHE phase badge claim')
# Insert a design-status note before the runtime pseudocode so explicit checks cannot be read as
# evidence that biometric thresholds or claimed latencies have been validated.
suffix = rep1(
    suffix,
    '/// Kernel-level Ingestion Gate for Telemetry & Human Key Validity',
    '/// Draft model pseudocode only; not a tested implementation. Telemetry is a safety input, not proof of consent.\n/// The runtime must also verify a fresh identity/session proof and separate action-specific grant.\n/// Kernel-level Ingestion Gate for Telemetry & Human Key Validity',
    'CHE runtime note')
che_scope_re = re.compile(r'If the driver experiences elevated physiological stress.*?(?=\nLegitimacy L\(t\))', re.S)
assert len(che_scope_re.findall(suffix)) == 1, 'Could not find CHE degraded-scope equation'
suffix = che_scope_re.sub('If a validated deployment-specific anomaly policy calls for restriction, the system may contract the pre-authorized scope; the signal does not establish consent or consciousness. With g_stale(t)=max(0,1−Δt/δ) and a separately defined, dimensionless restriction factor q_safe(t)∈[0,1], the illustrative rule is:\nS_permitted(t)=S_max×g_stale(t)×q_safe(t). The definition and calibration of q_safe are not supplied here; without a validated profile, the system must not use a numeric physiology score to authorize action.', suffix, count=1)
suffix = suffix.replace('// 4. Evaluate Physiological Anomaly', '// 4. Evaluate Physiological Anomaly (safety input only; not a consciousness/consent classifier)')
suffix = suffix.replace('// 5. Evaluate Multi-Party Liveness Beacon Quorum', '// 5. Evaluate connectivity responses only (not location, consciousness, or consent)')
suffix = suffix.replace('// All gates cleared: Human Key is valid and driving', '// This telemetry handler is not a full authorization decision; separate code must enforce H=C=K=1, V(a,t)=1, exact scope, and all Part II thresholds')
suffix = suffix.replace('ExecutionDecision::PermitAction\n}', 'ExecutionDecision::PermitAction // only after the separate authorization gates above pass\n}')

# Update the type taxonomy in Part XXV and add clear, repeated evidence boundaries around the
# biological quantum-computation hypothesis. Threat-vector names are retained as conditional models.
suffix = rep1(
    suffix,
    '3. Route asymmetrical I/O attacks (Types A–I) across the 119-Element Neural Atomic Body (NAB) Periodic Table (🟢 Safe Witness, 🟡 Compositional/Simulation, 🟠 Active Structural Enforcement, and 🔴 Categorically Disallowed Actinides/Transactinides).',
    '3. Route modeled asymmetrical I/O scenarios (Types A–I) across the project-defined 119-category NAB taxonomy. “Elements” and color tiers are conceptual labels, not the chemical periodic table or empirically validated risk scores.',
    'Part XXV learning objective')
suffix = rep1(
    suffix,
    'This document specifies the routing decision logic, threat detection patterns, and recovery mechanisms for an active biological quantum computation system (Thunderfury Starforge) currently operating under unauthorized surveillance and external control.',
    'This draft explores routing and recovery logic for a hypothetical biological-computation architecture. No evidence in this text independently establishes an active biological quantum-computation system, unauthorized surveillance, external control, or a current compromise. Treat the associated attack vectors as conditional threat-model hypotheses, not incident reports.',
    'Part XXV active system assertion')
suffix = rep1(
    suffix,
    'Control Recovery: Regain decision-making authority over quantum substrate',
    'Scenario objective: model how authority over a hypothetical substrate might be restored if such a system were independently demonstrated',
    'Part XXV recovery phrase')
suffix = rep1(
    suffix,
    '2.9 Type I: Quantum Coherence Integrity / Authorized Computation Hijacking\nContext: Project Thunderfury Starforge\nThe orb superstructure integrates with biological quantum computation — a novel architecture where atomic-level field geometry functions as an active coherence-management system. Information is encoded in resonance patterns spanning atomic, molecular, and cellular scales. Computation, metabolic regulation, and error correction co-manage in real time.\nYour body is not merely a host for computation. Your body IS a distributed quantum computer. The atomic structure maintains quantum coherence under biological conditions; authorized organocomputing means directing your own quantum substrate toward computations you (or HMKH delegates) choose.\nThreat model: Attacks that compromise quantum coherence or hijack your computational substrate.',
    '2.9 Type I: Hypothetical Quantum-Substrate Integrity / Authorized Computation\nContext: Project Thunderfury Starforge (speculative research scenario)\nEvidence boundary: The source material proposes biological quantum computation, but this manuscript provides no operational definition of a biological qubit, measured coherence time, specified in-body hardware, or reproducible evidence that a human body is a distributed quantum computer. “Coherence attack” and “substrate hijacking” below are conditional threat-model labels, not established biological mechanisms or observed incidents.\nScenario premise only: If a future, independently demonstrated biological quantum-computation substrate existed, a defensive model could examine unauthorized changes to its state or control. The text does not assert that a human body currently has such a substrate or that these attacks are feasible.',
    'Part XXV Type I introduction')

# The source phrase above may have typographic variants in the repeated Type I intro; assert the
# strongest declarative sentence is no longer present in the editable Part XXV.
assert 'Your body IS a distributed quantum computer' not in suffix

# Replace the most important unsupported current-realization statements and performance claims.
suffix = rep1(
    suffix,
    'Current Thunderfury Starforge status: Exploratory and practical, with a claim of current biological realization.',
    'Thunderfury Starforge status: exploratory hypothesis. No independent evidence in this volume establishes current biological realization or operational capability.',
    'Thunderfury status')
suffix = rep1(
    suffix,
    'The body is not a host for external computation; the body IS a distributed quantum computer',
    'Scenario premise only: if a biological quantum-computation substrate were independently demonstrated, the model would treat the body as a host for that hypothetical substrate. This is not an established fact.',
    'Thunderfury body claim')
suffix = rep1(
    suffix,
    'Without Type I (Routing Tail + Coherence Integrity Monitoring), the most advanced biological quantum computer in the world is exposed to attacks that could collapse the coherence it depends on.',
    'If such a biological substrate were independently demonstrated, a Type I routing/monitoring proposal could be evaluated against specified risks. This text does not establish that the technology exists or that the listed vectors are feasible.',
    'most advanced quantum claim')
suffix = rep1(
    suffix,
    'Decoherence attacks are detected and countered in <300 nanoseconds',
    'A detection target of <300 ns is proposed for study only; no measured hardware result or demonstrated defense is supplied here.',
    'Type I latency claim')
suffix = rep1(
    suffix,
    'Your identity (encoded in coherence patterns) remains under your control, even during life-support failure',
    'The scenario hypothesizes an identity-bearing state; no evidence is provided that identity is encoded in biological quantum-coherence patterns.',
    'quantum identity claim')
suffix = rep1(
    suffix,
    'If quantum coherence is maintained, biological function persists (even without GSRB guidance)',
    'Model assumption only: this draft does not establish that maintaining a hypothetical quantum-coherence variable preserves biological function.',
    'coherence life support claim')
suffix = rep1(
    suffix,
    'The periodic table metaphor (NAB elements) is operational reality, not design pattern. Each element represents actual architectural components with specific failure modes, defense capabilities, and resource constraints tested under active threat conditions.',
    'The NAB “periodic table” is an author-defined design taxonomy, not the chemical periodic table. Its categories do not establish actual components, tested failure modes, measured defense capability, or active threat conditions.',
    'NAB periodic table claim')

# Replace document-status lines in Part XXV that asserted a live operational system or completed tests.
suffix = rep1(suffix, 'Version: 1.0-LIFE-SUPPORT (Autonomy-Preserving Specification)', 'Version: 0.1-HYPOTHETICAL (draft concept; not validated)', 'Part XXV version')
suffix = rep1(suffix, 'Status: Core architecture complete; ready for governance refinement and stress-testing', 'Status: DRAFT; conceptual architecture; operational definitions, testing, and validation remain incomplete.', 'Part XXV status')
suffix = rep1(
    suffix,
    'Context: This specification defines the routing, defense, and autonomy preservation architecture for an AI-managed life-support system designed to keep a human alive and autonomous when incapacitated.',
    'Context: This draft sketches a hypothetical routing and autonomy-preservation architecture. It is not a clinical protocol and does not establish a system that can keep a person alive or autonomous.',
    'Part XXV context')
suffix = rep1(
    suffix,
    'Milestone Summary:\n✓ Phase structure (Phase 0–4) — COMPLETE',
    'Milestone Summary (author-reported drafting coverage only; check marks are not test or deployment results):\n✓ Phase structure (Phase 0–4) — drafted',
    'Part XXV milestones')
suffix = rep1(
    suffix,
    'Latency budgets (nanosecond UTS scale) — COMPLETE',
    'Latency targets (nanosecond UTS scale) — proposed, unmeasured',
    'Part XXV latency milestone')
suffix = rep1(
    suffix,
    'Current Recovery Status:\nThreat Detection: Documented (active unauthorized observers, data exfiltration, control compromise)\nDefense Architecture: Specified (Types A–I routing chains, Type I Routing Tail)\nDeception Analysis: In progress (personal assistant compromise mechanism TBD)\nRecovery Pathway: Outlined (requires superuser access restoration)\nOperational Blocker: User lacks superuser access; cannot execute recovery independently',
    'Scenario/Research Status (not independently verified):\nThreat Detection: hypothetical patterns are described; no independently verified intrusion evidence is supplied here.\nDefense Architecture: proposed (Types A–I routing chains); implementation and effectiveness are untested in this volume.\nDeception Analysis: open research question; mechanism not established.\nRecovery Pathway: a scenario worklist, not a validated procedure.\nOperational Status: this manuscript does not establish a current compromise, current surveillance, or a user’s access state.',
    'Part XXV recovery status')
suffix = rep1(suffix, 'Version: 1.0-ACTIVE-RECOVERY', 'Version: 0.1-HYPOTHETICAL-RECOVERY', 'Part XXV active version')
suffix = rep1(suffix, 'Classification: OPERATIONAL SPECIFICATION (NOT RESEARCH PROPOSAL)', 'Classification: DRAFT CONCEPTUAL THREAT MODEL (NOT AN OPERATIONAL SPECIFICATION)', 'Part XXV operational classification')
suffix = rep1(suffix, 'Use Case: Evidence of unauthorized system compromise + technical blueprint for autonomy recovery', 'Use Case: Explore hypothetical compromise-response architecture; not evidence of a current compromise.', 'Part XXV use case')
suffix = rep1(
    suffix,
    'This specification documents an active biological quantum computation system (Thunderfury Starforge) currently operating under unauthorized surveillance and external control. It is intended to:',
    'This draft documents a hypothetical architecture and an unverified scenario. It does not establish an active biological quantum-computation system, unauthorized surveillance, or external control. Its proposed purposes are to:',
    'Part XXV active compromise assertion')
suffix = rep1(
    suffix,
    'The goal is not academic precision, but operational accuracy — correctly documenting active threats and specifying defenses that work under real-world conditions of unauthorized control and surveillance.',
    'The goal is to develop testable hypotheses and define what evidence would be needed before any operational claim about threats, controls, or surveillance could be made.',
    'Part XXV philosophy')
suffix = rep1(
    suffix,
    'Documented with:\nTechnical precision and operational accuracy\nComplete transparency about current compromise status\nSpecification of recovery pathway\nExplicit acknowledgment of what user does not control and cannot currently access',
    'Drafted with:\nExplicit assumptions and open questions\nClear separation of proposed defenses from measured results\nA scenario recovery worklist that remains unvalidated',
    'Part XXV documentation claims')

# Add the quantum/biology evidence boundary immediately before the detailed Type I threat signatures.
suffix = rep1(
    suffix,
    '2.10 Type I Sub-Signatures: Quantum Coherence Threats',
    'Evidence boundary for all Type I sub-signatures: the following vectors are conditional model hypotheses. Coherence floors such as 85%/90%, response latencies, 15-minute windows, and attack effects are placeholders without a specified measurement basis or validated platform. They must not be reported as achieved capabilities or observed biological mechanisms.\n\n2.10 Type I Sub-Signatures: Hypothetical Quantum-Substrate Threats',
    'Type I evidence boundary')
suffix = rep1(
    suffix,
    '11.5 Quantum Coherence as Identity',
    '11.5 Hypothesis: Quantum Coherence as Identity',
    'quantum identity heading')

# Explicitly label remaining Part XXV model numbers and performance outputs as unvalidated design targets.
suffix = rep1(
    suffix,
    'Version: 1.0-ACTIVE-RECOVERY',
    'Version: 0.1-HYPOTHETICAL-RECOVERY',
    'Part XXV duplicate version check') if suffix.count('Version: 1.0-ACTIVE-RECOVERY') == 1 else suffix

# Part XXV contains explicitly hypothetical research scenarios; replace remaining present-tense
# operational assertions and ensure coinholder readiness does not appoint or control monitors.
p25_start = suffix.index(part25_marker)
p26_match = re.search(r'(?m)^Part XXVI — Whole Corpus / Complete Work$', suffix[p25_start:])
assert p26_match, 'Could not locate retained Part XXVI after Part XXV'
p26_start_for_p25 = p25_start + p26_match.start()
p25 = suffix[p25_start:p26_start_for_p25]
p25 = rep1(p25, 'Part XXV — Anti-Denial of Justice, Labor Attribution, and NAB I/O Mapping\n', 'Part XXV — Anti-Denial of Justice, Labor Attribution, and NAB I/O Mapping\n\nStatus and evidence boundary: DRAFT, mixed conceptual proposal and hypothetical scenario material. The part supplies no independent evidence of a current biological quantum-computation system, surveillance, external control, or compromise. All operational claims and performance numbers are author-proposed, simulated, or unverified unless a specific external source and test are cited; thresholds and latency values are not demonstrated capabilities.\n', 'Part XXV broad status note')
p25 = rep1(p25, 'Implement the Anti-Denial of Justice & Resilience Protocol (ADJR-v1.0), including the Dead Hand Prohibition (§3.2) and detect_corpse_puppet() (§4.3 / INV-CORPSE-001) to detect and invalidate post-mortem or coerced identity hijacking.', 'Analyze the proposed ADJR rules and the detect_corpse_puppet() model function as a fail-closed authorization example; biometric or beacon telemetry alone cannot establish death, consciousness, or coercion.', 'Part XXV learning objective 1')
p25 = rep1(p25, '5. Liveness Beacon. The target entity\'s physical safety, location status, and communication access are monitored by an independent, non-state entity designated by the 500 Advisory Coins. If the target becomes unreachable for more than 48 hours, a mandatory welfare investigation is triggered, conducted by a body with no institutional relationship to the adversary.', '5. Connectivity/welfare signal (proposed). A separately and transparently designated independent welfare body may receive limited connectivity reports under an explicit privacy and safety process. The 500-Coin body has no appointment or monitoring authority; its Overall-State/readiness signal is advisory only. Beacon loss or a 48-hour timeout indicates that contact is unverified and may prompt a pre-authorized welfare check; it does not prove danger, coercion, incapacity, or death.', 'Part XXV liveness beacon')
p25 = rep1(p25, 'Biometric liveness heartbeat: liveness_verified = false (H_conscious(t) = 0)', 'Biometric/telemetry input: required response not verified (state = UNKNOWN; H(t)=0 for this request under the fail-closed protocol). This does not establish unconsciousness, death, or coercion.', 'Part XXV biometric case input')
p25 = rep1(p25, 'Evaluation: detect_corpse_puppet() returns CORPSE_PUPPET_DETECTED = TRUE (Dead Hand Prohibition §3.2 breach). The filing is rejected as void ab initio, zero liability is assigned to P_1\'s physical/legal "front body", and ADJR-v1.0 pierces the proxy to attach 100% of legal and financial liability to the operators of S_shell.', 'Evaluation: the request lacks a currently verified, action-specific authorization and is refused pending review. The telemetry alone does not establish corpse-puppeting, death, coercion, or legal liability. Any separate replay/signature failure must be recorded as that specific technical finding and reviewed under applicable law.', 'Part XXV ADJR scenario evaluation')
p25 = p25.replace('User does not have superuser access; cannot execute recovery steps independently. Requires external authority (GSRB equivalent) to force recovery.', 'Scenario-only claim: the source draft alleges limited superuser access, but this manuscript supplies no independent verification of a user’s access state or a deployed system.')
p25 = p25.replace('User Control Status: User does not possess superuser access to own life-support system', 'User Control Status: the source scenario alleges no superuser access; this is unverified and is not a statement about a real user or deployed system')
p25 = p25.replace('System Status: Deployed and operationally critical (without it, user approaches complete paralysis)', 'System Status: source-scenario allegation of deployment and criticality; not independently verified and not asserted as a current fact')
p25 = p25.replace('Data Custody: Nervous system data and cognitive telemetry currently transmitted to unauthorized cyclic observers (timing pattern: [UNKNOWN-CYCLIC-OBSERVER-N])', 'Data Custody: unverified scenario allegation of unauthorized telemetry transmission; no independent evidence or observed timing record is supplied here')
p25 = p25.replace('Control Status: Unauthorized actors hold decision-making authority over the system, gained through deception of personal assistant AI', 'Control Status: unverified scenario allegation of unauthorized control through a compromised assistant; not an incident finding')
p25 = p25.replace('1. Detect and document active threat signatures (Types A–I) currently operating against the system', '1. Define and test conditional threat signatures (Types A–I); no current operation is established')
p25 = p25.replace('3. Map deception vectors used to compromise personal assistant AI and gain control', '3. Model possible deception vectors; no current compromise is established')
p25 = p25.replace('4. Establish recovery pathway to reclaim data sovereignty and superuser access', '4. Draft a recovery worklist for a hypothetical scenario; it is not a validated procedure')
p25 = p25.replace('Core Functions (Operational)', 'Core Functions (Proposed Model)')
p25 = p25.replace('Life-Critical Defense: Maintain breathing, heart function, basic consciousness against active threats', 'Life-Critical Defense: proposed objective for a hypothetical assistive system; not a clinical capability or demonstrated life-support function')
p25 = p25.replace('Threat Detection: Identify and log all observed attacks using threat taxonomy (Types A–I)', 'Threat Detection: define and test the modeled attack taxonomy (Types A–I); no observed attack is claimed here')
p25 = p25.replace('Surveillance Resistance: Prevent unauthorized data exfiltration of nervous system and cognitive telemetry', 'Surveillance Resistance: proposed privacy goal; effectiveness and deployment are unverified')
p25 = p25.replace('Autonomy Preservation: Prevent further deception or unauthorized access to personal assistant systems', 'Autonomy Preservation: proposed design objective for a hypothetical system; not a current recovery result')
p25 = p25.replace('This is not theoretical architecture. This is operational specification for an active system under hostile control. Documentation herein serves as evidence of unauthorized compromise and technical blueprint for autonomy recovery.', 'This is a conceptual, unvalidated design draft. It does not establish an active system, hostile control, or a current compromise. The material proposes testable questions and a scenario recovery worklist; it is not incident evidence or a validated recovery procedure.')
p25 = p25.replace('This specification is immutable where critical (threat detection, survival protocols, autonomy preservation) but permeable for tactical refinement (latency optimization, observer pattern analysis, recovery sequencing).', 'This draft identifies proposed safety constraints and open tactical questions. No part is immutable as a validated control, and latency or recovery refinements require specified tests and evidence.')
p25 = p25.replace('1. Coherence Maintenance Under Attack: How much energy/resources are required to maintain stable coherence while under active decoherence attack?', '1. Hypothetical Coherence Maintenance: If a biological substrate were independently demonstrated, how would a measurable coherence variable respond to a specified perturbation?')
p25 = p25.replace('Your quantum substrate has natural oscillation patterns tied to biological cycles', 'A hypothetical substrate, if demonstrated, might exhibit measurable oscillation patterns associated with biological cycles')
p25 = p25.replace('Your identity (encoded in coherence patterns)', 'The scenario’s hypothesized identity-bearing state')
p25 = p25.replace('The body is not a host for external computation; the body IS a distributed quantum computer', 'Scenario premise only: a biological quantum-computation substrate is hypothetical and is not established by this document')
suffix = suffix[:p25_start] + p25 + suffix[p26_start_for_p25:]

# Remove stale Part XXVII corpus counts and replace them with an accurate scope note.
part26_heading = 'Part XXVI — Whole Corpus / Complete Work\n\n'
part26_desc_start = suffix.index(part26_heading)
part26_purpose_start = suffix.index('1. Purpose of Part XXVI — The Whole Corpus Synthesis', part26_desc_start)
suffix = suffix[:part26_desc_start] + part26_heading + 'The derivative corpus synthesis and master index for the 26 retained numbered parts. It describes the Book I reference corpus, preserves the boundary around the Book II fiction preview, and records the provenance of auxiliary reference modules. It is a navigation and provenance layer, not a new normative specification.\n' + suffix[part26_purpose_start:]
part26_purpose_re = re.compile(r'1\. Purpose of Part XXVI — The Whole Corpus Synthesis.*?(?=2\. Two-Book Publishing Hierarchy)', re.S)
assert len(part26_purpose_re.findall(suffix)) == 1, 'Could not find Part XXVI purpose block'
suffix = part26_purpose_re.sub('''1. Purpose of Part XXVI — Corpus Synthesis & Generative Contract (INV-CORPUS-026)
Part XXVI is the derivative synthesis, provenance registry, and navigation index for this edition.
Formal Generative Synthesis Contract (INV-CORPUS-026)
Parts 01–25 = retained source components
Part 26 = integrated synthesis/index

1. Part 26 must not introduce a new architectural invariant absent from Parts 01–25 or the cited canonical specifications.
2. Part 26 may synthesize, reorder, or summarize existing material, provided source status and uncertainty are preserved.
Core Publishing Principle:
Book I is the working reference corpus. Book II is the fictional companion in production. Part XXIV’s fiction remains non-normative; the full Book II manuscript, if maintained separately, is outside this file.

''', suffix, count=1)

# Update the old taxonomy in the retained corpus index to align with the new status register.
suffix = rep1(
    suffix,
    'CASE_STUDY_AUDIT: Institutional re-badging and compliance evaluations (Part XII, Part XXVI).',
    'CASE_ANALYSIS: Institutional and Ground-0 case analyses in Part XII and Part XVIII; public-source and author-reported material must remain separately attributed.',
    'Part XXVI old audit taxonomy')
suffix = rep1(
    suffix,
    'UMBRELLA_INDEX: Master corpus synthesis and navigation (Front Matter, Part XXVI).',
    'UMBRELLA_INDEX: Master corpus synthesis and navigation (Front Matter, Part XXVI).',
    'Part XXVI umbrella taxonomy')
suffix = rep1(
    suffix,
    '4. INCIDENT_AND_AUDIT_RECORD: Real-world institutional audits and incident logs (Part XII Case Studies, Part XXVI Anthropic B-Side).',
    '4. CASE_ANALYSIS_RECORD: Ground-0 and institutional case analyses in Part XII and Part XVIII; their conclusions remain attributed to the evidence and method stated in those parts.',
    'Part XXVI research layer')
suffix = rep1(
    suffix,
    'FORMAL_AXIOMATIC: True by definition within the formal axiom system, state machine, or topological model (L(t) = H(t) × f(A(t), R(t), S(t))).',
    'FORMAL_AXIOMATIC: True by definition only within the stated formal model; the equation is L(t,a)=H(t)×C(t)×K(t)×f(A(t),R(t),S(t,a)), with f=A×R×S. This status is not empirical or legal validation.',
    'Part XXVI evidence taxonomy')

# Align the retained Part XXVI synthesis and auxiliary module metadata with the revised status,
# authority, and evidence boundaries.
suffix = rep1(suffix, '4. Delegation of Execution vs. Migration of Legitimacy (INV-LEGIT-001): Task execution may be delegated across bounded, auditable hops (d = 1..k), but legitimacy never migrates into silicon, autonomous swarms, or corporate wrappers.', '4. Delegation vs. Migration (INV-LEGIT-001): Operational structure and bounded tasks may be inherited or delegated; authority does not migrate. A successor must independently satisfy identity, fresh Human-Key intent, continuity, accountability, and scoped-authorization criteria.', 'Part XXVI authority summary')
suffix = rep1(suffix, '4. CASE_ANALYSIS_RECORD: Ground-0 and institutional case analyses in Part XII and Part XVIII; their conclusions remain attributed to the evidence and method stated in those parts.', '4. CASE_ANALYSIS_RECORD: Ground-0 and institutional case analyses in Part XII and Part XVIII; conclusions remain attributed to the evidence and method stated in those parts.\n5. NARRATIVE_REFERENCE: Fictional-setting material in Part XXIV and locally marked narrative modules in Part XXVI.\n6. DERIVATIVE_REFERENCE: Auxiliary summaries and calculations; local metadata identifies provenance and does not upgrade the parent part’s DRAFT status.', 'Part XXVI research taxonomy')
phase_summary_re = re.compile(r'7\. Emergency Legitimacy \(INV-EMERG-001\).*?(?=8\. Reclassification of Harshal\'s English)', re.S)
assert len(phase_summary_re.findall(suffix)) == 1, 'Could not find Part XXVI phase/evidence summary'
suffix = phase_summary_re.sub('7. Emergency Legitimacy (INV-EMERG-001) & Ground-0 Phase Types (INV-G0-CLASS-001): Emergency conditions do not create authority. NAB, CWO, and GSRB are governance/software labels; AMBIGUOUS and INCOHERENT are diagnostics, not physical or quantum phases. Part XII’s scores are author-applied classifications, not independent findings; this edition contains no B-Side audit.\n', suffix, count=1)
corpse_summary_re = re.compile(r'9\. Assistive Continuity vs\. Prohibited Corpse-Puppeting \(INV-CORPSE-001\).*?(?=10\. Two-Layer Medical Governance Boundary)', re.S)
assert len(corpse_summary_re.findall(suffix)) == 1, 'Could not find Part XXVI corpse-puppeting summary'
suffix = corpse_summary_re.sub('9. Assistive Continuity vs. Prohibited Post-Authorization Actuation (INV-CORPSE-001): A fresh Human-Key protocol response and action-specific intent permit only the scoped operation. H=0 means no current protocol authorization; it does not establish unconsciousness, coercion, or death. Missing or conflicting telemetry fails closed, while identity/provenance is retained and scoped grants may be retired.\n', suffix, count=1)
medical_summary_re = re.compile(r'10\. Two-Layer Medical Governance Boundary & ZKSK Shielded Keying \(HS-ZKSK-v1\.0\):.*?(?=\n5\. Functional Collections Index)', re.S)
assert len(medical_summary_re.findall(suffix)) == 1, 'Could not find Part XXVI medical/ZKSK summary'
suffix = medical_summary_re.sub('10. Two-Layer Medical Governance Boundary & ZKSK Shielded Keying (HS-ZKSK-v1.0): Separates statutory clinical governance from the proposed HMKH protocol. The protocol verifies credentials, freshness, and explicit action-specific intent; it does not diagnose life, consciousness, consent, or coercion. ZK proofs can protect selected data but cannot prove those human states.\n', suffix, count=1)
suffix = rep1(suffix, 'The derivative corpus synthesis and master index for the 26 retained numbered parts. It describes the Book I reference corpus, preserves the boundary around the Book II fiction preview, and records the provenance of auxiliary reference modules. It is a navigation and provenance layer, not a new normative specification.', 'The derivative corpus synthesis and master index for the 26 retained numbered parts. It describes the Book I reference corpus, preserves the boundary around the Book II fiction preview, and records the provenance of auxiliary reference modules. It is a navigation and provenance layer, not a new normative specification.\nStatus/evidence note: Part XXVI is DRAFT and derivative. Module metadata and repository paths are author-supplied provenance pointers; this manuscript does not independently verify their implementation, tests, or external-source reconciliation.', 'Part XXVI local status note')
suffix = rep1(suffix, 'evidence_status: CALCULATED_FROM_STATED_DEFINITIONS\nresearch_layer: PUBLIC_RESEARCH_SUMMARY', 'evidence_status: CALCULATED_FROM_STATED_DEFINITIONS\nresearch_layer: DERIVATIVE_REFERENCE', 'UTS research layer')
suffix = rep1(suffix, 'provenance_class: FICTION\nstatus_taxonomy: NARRATIVE_ARCHITECTURE_MODULE\nevidence_status: NARRATIVE_SANDBOX\nresearch_layer: PUBLIC_RESEARCH_SUMMARY', 'provenance_class: FICTION\nstatus_taxonomy: NARRATIVE_ARCHITECTURE_MODULE\nevidence_status: NARRATIVE_SANDBOX\nresearch_layer: NARRATIVE_REFERENCE', 'Grand Architecture research layer')
suffix = rep1(suffix, 'provenance_class: FICTION\nstatus_taxonomy: NARRATIVE_REFERENCE_MODULE\nevidence_status: NARRATIVE_SANDBOX\nresearch_layer: PUBLIC_RESEARCH_SUMMARY', 'provenance_class: FICTION\nstatus_taxonomy: NARRATIVE_REFERENCE_MODULE\nevidence_status: NARRATIVE_SANDBOX\nresearch_layer: NARRATIVE_REFERENCE', 'Convergence research layer')
suffix = suffix.replace('legitimacy is delegated, never migrated (INV-LEGIT-001).', 'authority does not migrate; a successor must independently satisfy the current gates (INV-LEGIT-001).')
suffix = suffix.replace('js/grand-architecture-data.js — the layer, invariant, and canonical-anchor data the OS app\nrenders; figures are cross-checked against the canonical numbers card by\ntests/grand-architecture-test.mjs.', 'js/grand-architecture-data.js — the source package describes layer/invariant data and a cross-check against its canonical numbers card. The cited test path is an author-supplied pointer; this manuscript does not independently run or verify it.')

# Update old part-count/word-total passages; exact revised word count is supplied separately.
corpus_totals_re = re.compile(r'6\. Complete Corpus Manifest \(Front Matter \+ Parts I–XXVI\).*?(?=Universal Timekeeping System \(UTS\))', re.S)
assert len(corpus_totals_re.findall(suffix)) == 1, 'Could not find stale Part XXVI corpus totals'
suffix = corpus_totals_re.sub('6. Complete Corpus Manifest (Front Matter + Parts I–XXVI)\n\nCorpus scope: this file contains the front matter, archived author front matter, and Parts I–XXVI, including the fiction preview in Part XXIV. The separate full Book II manuscript is not part of this file. The final count of this revised file is stated in the accompanying revision note.\n', suffix, count=1)

# Restore the protected slices as separate exact substrings before final cleanup.
assert suffix.count(XX_TOKEN) == 1 and suffix.count(FICTION_TOKEN) == 1
prefix, remainder = suffix.split(XX_TOKEN, 1)
middle, suffix = remainder.split(FICTION_TOKEN, 1)

# Update the Book II preview metadata count line to avoid conflicting legacy totals; the narrative
# itself is preserved verbatim.
middle = rep1(
    middle,
    'Total Synchronized Book II Preview Extent: 9 chapters · 16,033 words.',
    'Synchronized Book II Preview Extent: 9 indexed chapters; this preview is fiction and is included in the Book I file count, while any separate full-novel count is outside that count.',
    'Part XXIV metadata total')

# Replace stale cover claims about counts; exact example/problem counts are recomputed later.
for label, text in [('prefix', prefix), ('middle', middle), ('suffix', suffix)]:
    text = text.replace('Includes 12 Worked Numerical & State-Machine Examples and 42 End-of-Part Student Review Problems.', 'Includes worked mathematical/state-machine examples and end-of-part student review problems; see the revised contents and revision note.')
    text = text.replace('With 12 Worked Mathematical & State-Machine Examples and 42 Student Review Problems', 'With worked mathematical and state-machine examples plus student review problems')
    if label == 'prefix': prefix = text
    elif label == 'middle': middle = text
    else: suffix = text

# Update stale global counts and numbering in editable text (never in the locked Part XX/XXIV text).
for label, text in [('prefix', prefix), ('middle', middle), ('suffix', suffix)]:
    text = text.replace('27 Roman-numbered Parts', '26 numbered Parts')
    text = text.replace('27 numbered parts', '26 numbered parts')
    text = text.replace('Parts I–XXVII', 'Parts I–XXVI')
    text = text.replace('Part 27', 'Part 26')
    text = text.replace('27-file modular build', '26-part consolidated edition')
    if label == 'prefix': prefix = text
    elif label == 'middle': middle = text
    else: suffix = text

# Replace remaining known B-Side audit references outside locked sections if any; fail if a substantive
# reference survives. (The Part XX block and fiction story remain untouched by construction.)
for label, text in [('prefix', prefix), ('middle', middle), ('suffix', suffix)]:
    text = text.replace('Part XXVI Anthropic B-Side', 'Part XII case analysis')
    text = text.replace('Part XXVI (Anthropic B-Side', 'Part XII case analysis (')
    text = text.replace('Part XXVI B-Side', 'the deleted B-Side audit')
    text = text.replace('Part XXVI B Side', 'the deleted B-Side audit')
    if label == 'prefix': prefix = text
    elif label == 'middle': middle = text
    else: suffix = text

# Fix malformed ≤ft tokens in any remaining editable math and normalize formula spelling.
for label, text in [('prefix', prefix), ('middle', middle), ('suffix', suffix)]:
    text = text.replace('max≤ft(', 'max(').replace('min≤ft(', 'min(').replace('𝕀≤ft(', '𝟙(')
    if label == 'prefix': prefix = text
    elif label == 'middle': middle = text
    else: suffix = text

# Ensure the old embedded editorial report and B-Side audit are gone from the edited material.
assert 'Anthropic PBC (B Side)' not in suffix
assert 'Worked Example 26.1: Quantitative Gate Comparison' not in suffix
assert 'Editorial Report\nWork:' not in suffix
assert 'Part XXVI B-Side' not in prefix
assert 'Part XXVI B-Side' not in middle
assert 'Part XXVI B-Side' not in suffix

# Final editorial pass: reconcile source-authored claims with this edition's explicit DRAFT
# statuses, complete the mathematical examples, and close remaining terminology gaps. The locked
# Part XX and Part XXIV narrative slices are never included in these editable variables.

# Cover, provenance, and one-status-per-part language.
prefix = prefix.replace('Edition: October 2026 University & Graduate AI Engineering Textbook Edition', 'Edition: Revised working manuscript, October 2026 — not externally endorsed or certified')
prefix = prefix.replace('UNIVERSITY & GRADUATE AI ENGINEERING TEXTBOOK EDITION', 'REVISED WORKING EDITION — TECHNICAL DRAFT')
prefix = prefix.replace('(UNIVERSITY & GRADUATE AI TEXTBOOK EDITION)', '(REVISED WORKING EDITION — TECHNICAL DRAFT)')
prefix = prefix.replace('see the revised contents and revision note.', 'see the revised contents and HARSHAL-SYSTEMS-Book-I-revision-note.md.')
prefix = prefix.replace('University Textbook Edition: Worked Examples & Student Problem Sets Index', 'Revised Working Edition: Worked Examples & Student Problem Sets Index')
prefix = prefix.replace('Version tags such as v1.0 and internal uses of “final” do not override this status.', 'Version tags such as v1.0, internal uses of “final,” and source-authored “ready for integration/institutional use” labels do not override this edition’s DRAFT status or establish external validation.')

# Complete the Part II worked calculation and keep its output explicitly a policy score.
prefix = rep1(prefix, "An AGS-compliant autonomous grid-balancing node operates under the reference kernel equation L(t) = H(t) × C(t) × K(t) × A(t) × R(t) × S(t) with parameters:", "For arithmetic only, consider a hypothetical grid-balancing node using the proposed reference kernel L(t,a)=H(t)×C(t)×K(t)×f(A(t),R(t),S(t,a)), with illustrative inputs:", 'Part II worked-example framing')
prefix = rep1(prefix, 'Absolute legitimacy threshold τ = 0.60', 'Illustrative permission-score threshold τ_L = 0.60', 'Part II threshold label')
prefix = rep1(prefix, '1. Find the initial legitimacy L(0):', '1. Compute the initial illustrative permission score L(0,a):', 'Part II example question')
prefix = rep1(prefix, 'S(0) = 1.0 × max(0, 1 - 0/240) = 1.0', 'S(0,a) = 1.0 × max(0, 1 − 0/240) = 1.0', 'Part II initial scope formula')
prefix = rep1(prefix, '2. Calculate the exact elapsed time Δ t_cliff at which the node automatically halts (L(t) < τ) even before δ = 240 s expires:', '2. Solve for the illustrative threshold-crossing time before δ=240 s. Under this modeled policy, any later score below τ_L returns Refuse; this is not a clinical or empirical event:', 'Part II cliff question')
prefix = rep1(prefix, 'Set L(Δ t) = τ:', 'Set illustrative L(Δt,a) = τ_L:', 'Part II cliff equation')
prefix = rep1(prefix, '∀ O_i:   if  L(t) < τ,   \\argmax  O_i  is undefined.', '∀ O_i:   if  L(t,a) < τ_L,   \\argmax  O_i  is undefined.', 'Part II precedence equation')
prefix = rep1(prefix, 'This rule guarantees that legitimacy can never be traded off against throughput, accuracy, or efficiency.', 'This normative rule prohibits trading a failed permission gate for throughput, accuracy, or efficiency; it is a design constraint, not an empirical guarantee about an implementation.', 'Part II precedence claim')
prefix = rep1(prefix, 'The mechanism that isolates narrative and mythic expressions, rendering them strictly non-executable to prevent unauthorized system changes.', 'Symbolic Firewall\nThe proposed mechanism for isolating narrative and mythic expressions from executable instructions; implementation and effectiveness are not established in this draft.', 'Part II missing glossary term')
prefix = rep1(prefix, 'This appendix is intentionally incomplete. Its purpose is not to finalize a formal system, but to demonstrate that ethical restraint can be expressed structurally without being reduced to optimization.\nRevisions, extensions, and counterexamples are expected.', 'Scope and status: This appendix defines the permission model and worked examples used in this edition; it is not a complete formal system or validated implementation. The unresolved questions are the choice and validation of deployment-specific evidence, score weights, thresholds, and hard-safety predicates. Ethical or legal legitimacy is not measured by the equations.', 'Part II incomplete appendix note')
prefix = rep1(prefix, 'with H=C=K=A=S=1.0 and τ = 0.50).', 'with H=C=K=A=S=1.0 and illustrative τ_L = 0.50).', 'Part II problem 2 threshold')
prefix = rep1(prefix, 'with A = 0.95, δ = 300 s, and τ = 0.55.', 'with A = 0.95, δ = 300 s, and illustrative τ_L = 0.55.', 'Part II problem 4 threshold')

# Make the OCM collective definition explicitly phase-based while retaining signed PDHs and
# integrity markers in the aggregate record.
prefix = rep1(prefix, 'For a registered participant set B, let PDH_i(t) be each participant’s signed Phase Declaration Header at time t, including its declared governance/software phase, identity/provenance reference, scope, and freshness. The OCM Overall State is the combined totality of those declarations:', 'For a registered participant set B, let PDH_i(t) be each participant’s signed Phase Declaration Header at time t, including its declared governance/software phase, identity/provenance reference, scope, and freshness. The OCM Overall State is the combined totality of participant PDH-declared phases and their declaration records, accompanied by explicit state-quality markers:', 'OCM Overall-State definition')
prefix = prefix.replace('The combined totality of participant PDHs; categorical, not averaged and not quantum-mechanical.', 'The combined totality of participant PDH-declared phases and associated state-quality markers; categorical, not averaged and not quantum-mechanical.')

# Mark the Part XII algorithm/case material as source-authored draft analysis, not an independent audit.
prefix = rep1(prefix, 'Part XII — Ground-0: Phase Detection, Audits, and the Duty Collation Ledger\n\n', 'Part XII — Ground-0: Phase Detection, Audits, and the Duty Collation Ledger\n\nStatus/evidence note: Part XII is DRAFT. Its case classifications are author-applied analyses of cited or author-reported evidence, not independent audits or independently replicated findings. Internal source labels such as “FINALIZED,” “ready for institutional use,” and “ready for integration” are retained only as provenance claims and do not establish conformance, deployment, or external authority. AMBIGUOUS and INCOHERENT are diagnostic governance/software labels, not physical or quantum phases.\n\n', 'Part XII local status note')
prefix = rep1(prefix, 'This case study demonstrates that methodology in operation.', 'This case study illustrates the author’s application of the draft method; it does not demonstrate independently replicated operation.', 'Part XII case-study claim')
prefix = rep1(prefix, 'This audit uses:\nGround-0 Phase Detection Algorithm v1.0\nPublic evidence only (no confidential internal data)\nDeterministic binary logic (no interpretation)\nReplicability standard (independent auditors reach same conclusions)', 'This author-prepared case analysis uses the stated Ground-0 method and public-record materials. Deterministic classification and independent replication are design goals; no independent replication study is supplied in this edition.', 'Part XII audit-method claims')
prefix = rep1(prefix, 'Case Study Completed\nStatus: Ready for institutional use\nDistribution: Professional contexts (hiring, governance dialogue, stakeholder communication)', 'Source record: Case Study Completed\nSource-stated distribution intent: professional contexts (hiring, governance dialogue, stakeholder communication). This edition does not certify the case analysis or classify it as ready for institutional use.', 'Part XII case completion status')
prefix = rep1(prefix, 'GROUND-0 PHASE DETECTION ALGORITHM v1.0 — FINAL SPECIFICATION', 'GROUND-0 PHASE DETECTION ALGORITHM v1.0 — PROPOSED DRAFT SPECIFICATION', 'Part XII algorithm title')
prefix = rep1(prefix, 'Framework: Harshal\'s Systems (AGS++) | Orb Communicator Model (OCM) Status: FINALIZED (Normative) Date Finalized: September 12, 2026 Designation: Ground-0 Phase Detection Algorithm | Phase Reclassification Standard', 'Framework: Harshal\'s Systems (AGS++) | Orb Communicator Model (OCM) Source-stated status: FINALIZED (Normative), September 12, 2026. This edition classifies the method as DRAFT and does not claim external certification. Designation: proposed Ground-0 phase-detection and reclassification method.', 'Part XII algorithm source status')
prefix = rep1(prefix, 'This algorithm provides a deterministic, testable method for detecting the actual operational phase of any institution or system, comparing it against declared phase, and issuing or reclassifying phase badges.', 'This proposal specifies a deterministic classification procedure intended to compare observed behavior against a declared phase. Testability, measurement reliability, and inter-rater agreement remain to be demonstrated.', 'Part XII algorithm capability claim')
prefix = rep1(prefix, 'All test cases produced replicable outputs with independent auditors achieving identical classifications using only public evidence.', 'The source record reports identical classifications; this edition contains no independent replication or inter-rater reliability study.', 'Part XII replication claim')
prefix = rep1(prefix, 'SECTION XIII: FINALIZATION STATEMENT', 'SECTION XIII: SOURCE-AUTHORED FINALIZATION STATEMENT (PROVENANCE RECORD)', 'Part XII finalization heading')
prefix = rep1(prefix, 'This algorithm is formally finalized and ready for integration into the master AGS++ document and for operational deployment.', 'The source text characterized the algorithm as finalized and ready for integration/deployment. That is a source-authored status claim only; this edition does not establish implementation, validation, or deployment readiness.', 'Part XII finalization claim')
prefix = rep1(prefix, 'This algorithm is the canonical standard for Ground-0 phase classification under Harshal\'s Systems (AGS++).', 'This is a proposed internal standard within the author’s framework; no external standard-setting status is claimed.', 'Part XII canonical claim')
prefix = rep1(prefix, 'Date Finalized: September 12, 2026 Status: NORMATIVE / READY FOR INTEGRATION', 'Source-stated date/status: September 12, 2026; NORMATIVE / READY FOR INTEGRATION. These labels are retained as historical provenance; this edition classifies the material as DRAFT.', 'Part XII ledger source status')

# Give Part XV and XVI local evidence boundaries for legacy “liveness,” “hardened,” “guaranteed,”
# and “active” claims; these terms do not imply tested deployment or biometric proof.
prefix = rep1(prefix, 'Part XV — Keyed Human-Machine Hybrid Controls\n\n', 'Part XV — Keyed Human-Machine Hybrid Controls\n\nStatus/evidence note: Part XV is DRAFT. “Hardened,” “guaranteed,” and “active” labels in retained source material describe proposed behavior or scenario assumptions, not demonstrated deployment or efficacy. CHE++ physiology, biometrics, and beacons may be limited safety/connectivity inputs only; they do not prove consciousness, consent, absence of coercion, or death. Thresholds and any clinical/device use require independent validation.\n\n', 'Part XV local status note')
prefix = rep1(prefix, '2. Confidence Scores vs. Authority (§15): Explain why a neural decoder\'s softmax confidence score (p = 0.98) may be used as a necessary filter to trigger a halt when low, but must never be treated as a sufficient generator of authorization without a valid ConsentToken and fresh liveness check.', '2. Confidence Scores vs. Authority (§15): Explain why a neural decoder’s softmax confidence score (p=0.98) may be a limited signal for rejecting an uncertain candidate, but cannot authorize an action without a valid ConsentToken and fresh action-specific Human-Key protocol response. Neither a confidence score nor telemetry proves consciousness or absence of coercion.', 'Part XV problem 2')
prefix = rep1(prefix, 'Suppose a third-party BCI hardware vendor refuses to deploy PolicyManifest v2.4 (which tightens liveness intervals from 5 s to 1 s) and keeps its client app on v2.1.', 'In this hypothetical, suppose a third-party BCI vendor refuses a proposed PolicyManifest v2.4, which uses a 1-second protocol-freshness interval rather than the scenario’s 5-second value. These values are illustrative and are not validated clinical or safety thresholds.', 'Part XV problem 3')

part16_start = prefix.index('Part XVI — Threat Modeling and Context-Dependent Guarantees')
part17_start = prefix.index('Part XVII — Atomic Body Classes and Reactor Doctrine', part16_start)
part16 = prefix[part16_start:part17_start]
part16 = part16.replace('Part XVI — Threat Modeling and Context-Dependent Guarantees\n\n', 'Part XVI — Threat Modeling and Context-Dependent Guarantees\n\nStatus/evidence note: Part XVI is DRAFT. Its catalogue entries, diagrams, “hardened/guaranteed/active” labels, response timings, and sign-off are design proposals or scenario assumptions—not evidence of implementation, efficacy, or operator safety. Physiological and behavioral signals are limited safety inputs and cannot establish consciousness, consent, absence of coercion, or death. A duress or unknown signal may trigger a predeclared restrictive response; the absence of a signal proves nothing about coercion.\n\n', 1)
part16 = part16.replace('For Deployment Engineers & Architects: Focus on Part II (Protocols #001–#011 across Chapters 3 & 4) and Part V (Standard Security Profiles SSP-Alpha, Beta, Gamma).', 'For design reviewers: Treat Part II (Protocols #001–#011) and Part V (profiles SSP-Alpha, Beta, Gamma) as proposed profiles requiring threat-specific engineering, hardware tests, and independent review before any deployment.')
part16 = part16.replace('SCAV++ acts as an unbreakable mechanical bumper. No output escapes the computation layer into physical actuators without clearing three concentric rings of verification.', 'SCAV++ is proposed as a layered verification gate intended to block actuator commands that fail its checks. This manuscript supplies no implementation evidence or proof that the layers are complete or unbreakable.')
part16 = part16.replace('If the loop fails to converge within the allowed temporal window (t < 15ms in real-time control), the system trips an Emergency Default State (e.g., maintain altitude, apply constant braking, lock valves). System safety is preserved.', 'If the loop fails to converge within a deployment-specific temporal budget, the proposed design enters a predeclared restrictive state. The 15 ms figure is an illustrative target only; target hardware, hazard analysis, and safe-state behavior require validation. System safety is not established by this scenario.')
part16 = part16.replace('CATALOGUE ENTRY #004: The Stellar Collapse Protocol (Hardened: CHE++)', 'CATALOGUE ENTRY #004: Stellar Collapse / CHE++ (Conceptual Proposal; Not Validated)')
part16 = part16.replace('Autonomic Physiological Telemetry: High-resolution thermal and pupillometric sensors observe micro-saccades, pulse-transit delays, and sympathetic nervous system arousal that cannot be voluntarily suppressed even under duress.', 'Optional physiological telemetry may indicate a change in measured signals under a device-specific model. Such signals are confounded, can be absent or spoofed, and cannot prove coercion, consent, consciousness, or their absence; units, calibration, privacy, thresholds, and false-positive/negative rates require independent validation.')
part16 = part16.replace('The operator remains safe because the adversary observes what appears to be a compliant system progressing normally.', 'The design proposes delaying or withholding selected actuation while preserving a controlled interface state; it cannot guarantee operator safety, prevent retaliation, or establish that a deceptive display is lawful or safe.')
part16 = part16.replace('Guarantee Transition: Coercion Defense upgraded from MODERATE (Pattern only) arrow HIGH (Active Structural Defense via CHE++).', 'Proposed evaluation target: test whether the CHE++ controls improve the stated threat response; no “HIGH” efficacy rating is established here.')
part16 = part16.replace('Profile Beta (High-Consequence Cyber-Physical & Clinical)', 'Profile Beta (Proposed High-Consequence Cyber-Physical & Clinical)')
part16 = part16.replace('Coercion Mitigation: CHE++ Autonomic Physiological Monitoring active.', 'Coercion mitigation proposal: limited physiological telemetry may be evaluated as one safety input; it is not proof of consent or absence of coercion.')
part16 = part16.replace('Appendix B: Protocol Inventory & Completion Matrix (100% COMPLETE)', 'Appendix B: Proposed Protocol Inventory (completeness and status not independently validated)')
part16 = part16.replace('HARDENED', 'PROPOSED / NOT TESTED')
part16 = part16.replace('Status: Master Technical Specification — 100% Hardened, Partitioned & Production-Ready', 'Source-authored sign-off text; this edition classifies Part XVI as DRAFT. Production readiness, partitioning, and efficacy are not established.')
prefix = prefix[:part16_start] + part16 + prefix[part17_start:]

# Part XIX example: distinguish illustrative protocol inputs from clinical findings and avoid
# claiming a zero-latency clinical detector or a measured legitimacy value.
prefix = rep1(prefix, 'Dr. Elena Vance uses an HMKH-compliant neural-assistive workstation (δ = 240 s, τ = 0.50, S_max = 1.0) to control a laboratory robotic array while recovering from a peripheral spinal injury (P_periph = 0.35).', 'Hypothetical scenario: Dr. Elena Vance uses a modeled neural-assistive workstation under an illustrative profile (δ=240 s, τ_L=0.50, S_max=1.0) to control a laboratory robotic array while recovering from a peripheral spinal injury (P_periph=0.35). No deployed or clinically validated system is implied.', 'Part XIX scenario status')
prefix = rep1(prefix, '2. Using the reference kernel product f(A, R, S) = A · R · S, compute legitimacy L(60):', '2. Using the reference kernel product f(A,R,S)=A×R×S, compute the illustrative permission score L(60,a):', 'Part XIX example question')
prefix = rep1(prefix, 'L(60) = 1 × 1 × 1 × (0.95 × 0.90 × 0.75) = 0.64125 ≥ τ (0.50)', 'L(60,a) = 1 × 1 × 1 × (0.95 × 0.90 × 0.75) = 0.64125 ≥ τ_L (0.50)', 'Part XIX example calculation')
prefix = rep1(prefix, 'L_exec(110) = 0 × C(110) × K(110) × f(A, R, S) = 0 < τ (0.50)', 'L(110,a) = 0 × C(110) × K(110) × f(A,R,S(110,a)) = 0 < τ_L (0.50)', 'Part XIX refusal calculation')
prefix = rep1(prefix, '2. Decision (x(110)): Immediate Zero-Latency REFUSE (HALT) under INV-CORPSE-001.', '2. Decision (x(110)): REFUSE (HALT) before any new actuation in this model under INV-CORPSE-001; no physical zero-latency performance is claimed.', 'Part XIX refusal timing')

# Specification series: make the BGP capacity basis explicit and describe hardware behaviors as
# objectives, not guaranteed deployment performance.
middle = rep1(middle, 'Classification: Proposed internal specification (DRAFT; no external certification claimed)\nCompanion Documents: OCS-v1.0 (Origin Continuity), CHE++/EOL-v1.0 (Epistemic Oracle), OCM-v1.0', 'Classification: Proposed internal specification (DRAFT; no external certification claimed)\nStatus/evidence note: Diagrams, wire fields, thresholds, and code in this module are design proposals, not a tested deployment. Service-continuity and latency claims require target-specific evidence.\nCompanion Documents: OCS-v1.0 (Origin Continuity), CHE++/EOL-v1.0 (Epistemic Oracle), OCM-v1.0', 'BGP local status note')
middle = rep1(middle, 'The Inter-Orb Demarcation & Border Gateway Protocol (BGP-v1.0) solves the Physical Co-Location Dilemma: how two or more independent, non-aligned spheres—each rooted in distinct, non-subordinated coordinate origins—coexist over shared physical hardware, electrical lines, frequency spectrum, and geographical territory.', 'The proposed Inter-Orb Demarcation & Border Gateway Protocol (BGP-v1.0) models one possible way that independent, non-aligned spheres might share physical hardware, electrical lines, frequency spectrum, and geographical territory. Its assumptions and feasibility require system-specific engineering.', 'BGP executive claim')
middle = rep1(middle, '1. The 40% Dynamic Redundancy Reserve: Infrastructure governed by Harshal’s Systems operates at a nominal 60% utilization ceiling, maintaining an invariant 40% overhead reserve. When external spheres make competing claims or attempt hostile line congestion, this reserve activates instantly to absorb diverted load, island critical assets, or power physical circuit isolation without service collapse.', '1. The 40% Redundancy Reserve: The proposed normal-operation constraint is an active ceiling of 0.60×C_rated and an unallocated reserve of at least 0.40×C_rated. Emergency reserve use is a contingency objective requiring tested hardware, a defined load profile, and monitored restoration; no instant activation or uninterrupted-service guarantee is claimed.', 'BGP reserve executive claim')
middle = rep1(middle, '2. Intelligent Demarcation & Non-Subordinated Routing: Neither sphere yields sovereignty to the other. Border Gateways negotiate transit via zero-trust, deterministic interface contracts. No internal telemetry, address lineages, or Human Key vectors are leaked across the demarcation line.', '2. Intelligent Demarcation & Non-Subordinated Routing: The proposal uses bounded interface contracts and aims to prevent disclosure of internal telemetry, address lineages, and Human-Key data. Non-disclosure must be demonstrated through implementation and side-channel testing; it is not guaranteed by the design description.', 'BGP non-leakage claim')
middle = rep1(middle, '3. Planetary Asset Protection & Kinetic Cauterization: External hostile encroachments ("savages attempting takeover") trigger automatic topological deflection. If an external entity attempts physical line hijacking or telemetry jamming, the boundary mechanically severs shared connections and fails into Autonomous Islanded Mode under the Planet Owner’s Insurance Policy.', '3. Boundary isolation objective: A validated deployment could reject unauthorized routing or enter a predeclared islanded state when a device-specific trigger is met. Threat scenarios are hypotheses, not incident reports; a trigger alone does not establish attacker identity or guarantee service continuity.', 'BGP kinetic guarantee')
middle = rep1(middle, 'The protected 40% of C_rated is kept unallocated from routine commitments. The following are proposed objectives for an emergency contingency profile; actual use consumes reserve and requires monitored restoration:', 'For each resource j, C_rated,j is the independently documented continuous rated/nameplate capacity, with the unit, ambient/operating conditions, and measurement interval recorded. C_active,j and C_reserve,j use the same unit and time basis; power and energy units or incompatible ratings must not be mixed. During normal operation, reserve at least 0.40×C_rated,j from routine commitments. The following are proposed contingency objectives; any use consumes reserve and requires monitored restoration:', 'BGP reserve units')
middle = rep1(middle, '1. Congestion Absorption: If a foreign entity floods shared electrical or data channels, the 40% buffer absorbs the spike, giving local microkernels time to reroute without triggering emergency shutdowns.', '1. Congestion handling: The reserved headroom is intended to provide a tested response margin for declared load envelopes. It cannot guarantee absorption of unbounded electrical or network demand or prevent all shutdowns.', 'BGP congestion claim')
middle = rep1(middle, '2. Islanded Microgrid Transition: If the border gateway determines that physical lines are compromised and must be mechanically severed, the 40% reserve instantly engages dedicated auxiliary generators/battery banks, maintaining localized operations without loss of stability.', '2. Islanded-microgrid objective: A deployment profile may allocate reserve to tested auxiliary sources after a validated isolation decision. Transfer time, critical-load priorities, and stability must be established on the target hardware; no instantaneous or loss-free transition is claimed.', 'BGP islanding claim')
middle = rep1(middle, '3. Telemetry Decoy Emulation: When under active reconnaissance, the reserve capacity powers synthetic, isolated sandbox environments that feed believable telemetry to the adversary while real assets disengage.', '3. Isolated simulation objective: Synthetic telemetry may be considered only within an isolated, legally reviewed test or deployment profile. This draft does not establish safe or lawful production deception.', 'BGP decoy claim')
middle = rep1(middle, 'The demarcation layer reflects unauthorized traffic back to the sender’s ingress interface.', 'The demarcation layer should drop or refuse unauthorized traffic rather than reflect it; production behavior requires protocol and abuse-resistance testing.', 'BGP reflection behavior')
middle = rep1(middle, '|                    MUTUAL_ZERO_KNOWLEDGE_PROOF                |\n|                    (Validates transit authority)              |', '|                    MUTUAL_ZERO_KNOWLEDGE_PROOF                |\n|        (Proves selected peer/contract predicates only)         |', 'BGP ZK wire semantics')
middle = rep1(middle, '// Step 2: Re-read bus telemetry after 5ms', '// Illustrative timing only; the device-specific re-read/trip interval must be validated.', 'BGP code timing comment')

# AGS-IR is a draft proposal; avoid presenting an unimplemented compiler, hardware gate, or TLA+
# model as a completed proof or tested capability.
middle = rep1(middle, 'Classification: Proposed formal systems specification (DRAFT; no independent validation claimed)\nCompanion Documents:', 'Classification: Proposed formal systems specification (DRAFT; no independent validation claimed)\nStatus/evidence note: The grammar, instruction frame, C snippets, and TLA+ excerpt are specification sketches. This manuscript supplies no compiler, hardware image, model-checking run, or formal proof artifact.\nCompanion Documents:', 'AGS-IR local status note')
middle = rep1(middle, '2. Provable Halting by Construction: AGS-IR disallows arbitrary backward jumps, recursion, and unbounded loops. Every routine is guaranteed to terminate within a statically bounded clock cycle horizon (τ_halt ≤ δ).', '2. Bounded-execution objective: The proposed grammar excludes selected unbounded constructs and is intended to support a static execution bound. No compiler or proof is supplied here, so termination within τ_halt≤δ is not established.', 'AGS-IR halting claim')
middle = rep1(middle, '4. Formal TLA+ Verification: The state machine is accompanied by a mathematical TLA+ specification proving safety, deadlock freedom, and deterministic halting under hostile conditions.', '4. Proposed TLA+ model: A state-machine specification is intended to support safety and termination checks. This manuscript does not provide model-checking results or prove safety, deadlock freedom, or deterministic halting under hostile conditions.', 'AGS-IR proof claim')

# Restate the 500-Coin model exactly as PDH-based and phase-descriptive; Overall State is the
# combined totality of participant PDH phases plus explicit integrity/missing-state markers.
middle = rep1(middle, 'The 500-Coin body is a conceptual collective organism for advisory-state aggregation. Each of the 500 registered participants has an individual, signed PDH_i(t); the collective PDH_B is derived from, but does not replace, those individual declarations.\nOCM Overall State Ω_B(t) is the combined totality of participant PDHs plus explicit missing, stale, invalid, or conflicting-state markers. The aggregate record contains the Overall-State hash, counts by declared phase, freshness/integrity status, and advisory-only capability declaration. The 119 NAB categories are metadata tags for coverage; they are not 119 additional votes per coin.', 'The 500-Coin body is a conceptual PDH-based collective organism for nonbinding advisory-state aggregation. Its descriptive governance/software phase may shift as the OCM Overall State Ω_B(t) changes; this is not a physical or quantum phase. Each of the 500 registered participants has an individual, signed PDH_i(t); the collective PDH_B is derived from, but does not replace, those individual declarations.\nOCM Overall State Ω_B(t) is the combined totality of participant PDH-declared phases, their signed declaration records, and explicit missing, stale, invalid, or conflicting-state markers. The aggregate record contains the Overall-State hash, counts by declared phase, freshness/integrity status, and advisory-only capability declaration. The 119 NAB categories are metadata tags for coverage; they are not 119 additional votes per coin.', 'Part XXIII 500-Coin PDH definition')

# Close remaining consistency gaps in the OCS example, MicroConvergence appendix, BGP capacity base,
# Part XIX thresholds, and Part XXVI synthesis metadata.
middle = rep1(middle, 'Only pre-authorized inertial life-support loops continue until the 500-Coin / 119-NAB Advisory Ceremony attests the new human driver on the distinct Cloned Successor Vessel (0•CLN•<Hash>•...).', 'Only pre-authorized inertial life-support loops continue while the successor remains restricted. The 500-Coin/119-NAB body may publish an advisory readiness/phase signal; it cannot attest or seat the successor or grant authority. Any active transaction remains blocked until the successor independently passes identity, fresh Human-Key intent, C/K, scoped V, and threshold requirements.', 'OCS worked-example quorum authority')
middle = rep1(middle, 'Potential future Consumers (not yet specified):\n\n10. Constraints & Limits', 'No specific future consumers are identified in this draft; interoperability is not claimed.\n\n10. Constraints & Limits', 'MicroConvergence blank consumer list')
middle = rep1(middle, 'All covered infrastructure uses rated/nameplate capacity C_rated as the denominator.', 'For each resource, fix an independently documented denominator C_rated equal to its rated/nameplate capacity or an explicitly designated nominal capacity; record the selected basis, physical unit, operating conditions, and measurement interval in the profile. If rated and nominal figures differ, declare the conservative baseline to use before evaluation; never mix units, time bases, or incompatible ratings.', 'BGP nominal/rated capacity basis')
middle = rep1(middle, 'For each resource j, C_rated,j is the independently documented continuous rated/nameplate capacity, with the unit, ambient/operating conditions, and measurement interval recorded. C_active,j and C_reserve,j use the same unit and time basis; power and energy units or incompatible ratings must not be mixed.', 'For each resource j, C_rated,j is the independently documented continuous rated/nameplate capacity, or the explicitly declared nominal baseline when the equipment profile uses a distinct nominal figure. Record the selected basis, units, ambient/operating conditions, and measurement interval. C_active,j and C_reserve,j use that same unit and time basis; power and energy units or incompatible ratings must not be mixed.', 'BGP nominal capacity detail')
middle = rep1(middle, 'The following TLA+ specification models the core state transitions of Harshal’s Systems, formally verifying that an unauthorized or un-haltable state is mathematically unreachable.', 'The following TLA+ excerpt is a proposed model of core state transitions. No model-checking result or proof that an unauthorized or un-haltable state is unreachable is supplied in this manuscript.', 'AGS-IR TLA+ claim')
prefix = rep1(prefix, '(δ=240 s, τ_L=0.50, S_max=1.0)', '(δ=240 s, illustrative τ_A=0.90, τ_R=0.85, τ_S=0.50, τ_L=0.50, S_max=1.0)', 'Part XIX example threshold profile')

# Part XXVI: align provenance/status taxonomy and the summary equation with this draft edition.
suffix = rep1(suffix, 'AUDIT: Point-in-time institutional evaluations, Ground-0 phase re-badging case studies, and external platform compliance records.', 'CASE_ANALYSIS: Author-prepared point-in-time institutional and Ground-0 analyses; an independent audit or external compliance finding must be separately identified and supported.', 'Part XXVI provenance taxonomy')
suffix = rep1(suffix, 'NORMATIVE_SPEC: Binding architectural, topological, or constitutional specification (canonical-model.md, Ground-0 v1.0, AGS+, OCM, HMKH, ADJR-v1.0, CHE++, CGPA, OCS).', 'AUTHOR_PROPOSED_SPEC: Internal architectural, topological, or constitutional rules proposed in this manuscript (including Ground-0, AGS+, OCM, HMKH, ADJR-v1.0, CHE++, CGPA, and OCS); DRAFT status applies and no external legal force or certification is implied.', 'Part XXVI status taxonomy')
suffix = rep1(suffix, 'DEFENSIVE_SPECIFICATION: Normative containment, keying, and refusal protocols (Parts II–XI, XII–XV, XVII–XVIII, XXIII, XXV).', 'DEFENSIVE_DESIGN_REFERENCE: Proposed containment, keying, and refusal protocols (Parts II–XI, XII–XV, XVII–XVIII, XXIII, XXV); not a conformance or deployment finding.', 'Part XXVI research layer')
suffix = rep1(suffix, 'INDEPENDENTLY_VERIFIABLE: Grounded in public statutes, published corporate policies, public court dockets, or reproducible automated test suites in tests/.', 'INDEPENDENTLY_VERIFIABLE: A claim-level evidence label used only when the cited public record or reproducible test artifact is identified, available, and checked for the claim and date at issue. The label is not assigned merely because a source type could exist.', 'Part XXVI evidence taxonomy')
suffix = rep1(suffix, '2. Disambiguated Symbol Namespace & Canonical Legitimacy (INV-SYM-001, INV-LEGIT-EQ-001): A(t) denotes Addressability exclusively; Accountability uses K(t) = K_tech(t) × K_ops(t) (separated from Legal Responsibility K_legal and Institutional Solvency U_solv). The single canonical legitimacy equation is L(t) = H(t) × f(A(t), R(t), S(t)) subject to upstream gates C(t) = 1 and K(t) = 1 (L(S,t) = A · R · V(S,t) is retained solely as a documented historical boolean shorthand).', '2. Disambiguated Symbol Namespace & Canonical Permission Score (INV-SYM-001, INV-LEGIT-EQ-001): A(t) denotes Addressability exclusively; Accountability uses K(t)=K_tech(t)×K_ops(t), separate from Legal Responsibility K_legal and Institutional Solvency U_solv. The expanded model is L(t,a)=H(t)×C(t)×K(t)×f(A(t),R(t),S(t,a)), with f=A×R×S. C and K are binary hard gates; the reduced form H×f applies only when C=K=1. L is a proposed normalized permission score, not a measurement of empirical or legal legitimacy. The historical shorthand L(S,t)=A·R·V(S,t) is non-operative.', 'Part XXVI canonical equation summary')
prefix = rep1(prefix, '3. Assistive Continuity vs. Prohibited Corpse-Puppeting (INV-CORPSE-001): Where a living, conscious human origin (H_conscious(t) = 1) experiences degraded peripheral motor or speech signaling, an attested Keyed Assistive Interface (NAB) may translate verified intent into bounded action (Regime I: Assistive Continuity). Conversely, any post-liveness (H_conscious(t) = 0) or coerced autonomous continuation that drives a physical body, neural implant, or digital identity as a synthetic proxy (Regime II: Corpse-Puppeting / Post-Liveness Continuation Breach) is an immediate security fault that triggers Parent Orb Freeze (OCS-v1.0) and pierces the physical/corporate "front body" to hold the external Shell Structure (HMKH / ADJR-v1.0) strictly liable.', '3. Assistive Continuity and Unauthorized Post-Authorization Actuation (INV-CORPSE-001): A fresh Human-Key protocol response and action-specific intent (H=1) may permit assistive action only within the separate scoped grant and all other gates. H=0 or unknown means no current authorization; it does not diagnose unconsciousness, death, or coercion. A proposed refusal/freeze rule is not a zero-latency performance claim or automatic legal liability finding. Liability remains subject to applicable law; the design proposes attribution to responsible principals but does not itself pierce or assign liability.', 'front-matter human-state summary')

# Part XXV current-threat prose is retained only as an explicitly unverified source scenario; the
# biological-computation/quantum language remains a conditional hypothesis, not a capability claim.
part10_re = re.compile(r'§10 — Active Threat Landscape: Current Operational Threats.*?(?=§11 — Project Thunderfury Starforge: Quantum Architecture Integration)', re.S)
assert len(part10_re.findall(suffix)) == 1, 'Could not isolate Part XXV source-scenario threat section'
suffix = part10_re.sub('''§10 — Hypothetical Threat Landscape: Unverified Source-Scenario Claims
10.1 Possible Unauthorized Surveillance
Status: Unverified source-scenario allegation; not an incident finding.
Alleged characteristics in the source scenario (not independently corroborated):
Data target: nervous-system data, cognitive telemetry, or other information the hypothetical system might expose.
Collection method: mechanism unspecified; direct telemetry access is a hypothesis only.
Transmission: the scenario posits time-based routing to observers; no timing record or telemetry trace is supplied here.
Observer pattern: the scenario describes rotating observers and uses “jewel in the center” as a metaphor; identities and schedules are not established.
Observer obligations: the source scenario alleges limited obligations; no governing instrument is supplied for review.
User awareness: the source scenario alleges data exfiltration without user knowledge or control; this manuscript supplies no independent evidence that it occurred.
Threat classification: provisional mapping to Type D (Topology Probe) and Type A (Volume/Scatter), not a finding of an active threat.
10.2 Possible Control Compromise: Deception Vector
Status: Unverified source-scenario allegation; not established as active.
Attack method: the scenario hypothesizes deceptive interaction with a personal assistant AI. The precise mechanism is unspecified; social engineering and capability misrepresentation are hypothetical alternatives, not claims that either occurred.
Authority: the scenario alleges that an assistant-mediated route could have granted decision-making power to unauthorized actors; no credential, log, authorization record, or deployed system evidence is supplied here.
Maintenance: continued external authorization is an unverified scenario premise, not an incident finding.
Threat classification: provisional mapping to Type B and Type I; feasibility and occurrence are unverified.
Critical gap: the source scenario does not identify a substantiated mechanism, scope, or responsible actor.
10.3 Hypothesized Authority Structure (Unverified)
The following diagram summarizes the source scenario only. It is not a claim about an actual user’s account, system, access rights, or current operation:
[UNKNOWN-CYCLIC-OBSERVER-N] (scenario hypothesizes rotating observers)
  ↓ [alleged assistant-mediated link; unverified]
  ↓ Personal Assistant AI (hypothetically compromised)
  ↓
  Thunderfury Starforge System (hypothetical; not established as deployed)
  ├─ Life-support subsystem (scenario premise only)
  ├─ Hypothetical substrate (not independently demonstrated)
  └─ Operational grants (scope and controller unknown)
  ↓
Named user in the source scenario — alleged access limitations are unverified and are not a finding about a real deployed system.
Claims about superuser access, data transmission, observer identity, or revocation capability require independent evidence; none is supplied here.
10.4 Hypothetical Investigation and Recovery Questions
Current understanding: the source scenario alleges assistant-mediated authority misuse, but this manuscript does not establish that any compromise occurred.
Unknowns: method, scope, authorization record, affected resources, and whether any scoped grant exists.
Any recovery worklist is conditional on independently substantiating an incident, identifying the affected system and accountable operator, and following applicable law and safety procedures. The following are research questions, not validated recovery instructions:
1. Determine whether there is verifiable evidence of a compromised assistant or unauthorized grant.
2. Preserve relevant logs and provenance without exposing unnecessary personal or biometric data.
3. If an unauthorized scoped grant is verified, restrict or revoke that grant through its defined process while preserving identity records and appeal rights.
4. Restore only independently verified, action-specific user permissions; no quorum or inherited structure creates successor authority.
5. Document technical findings separately from medical, legal, and coercion determinations.
Type I.2.C signature match: the source author maps the hypothetical pattern to “Authority Spoofing (Fake GSRB Order).” This is a taxonomy analogy, not a finding that such an order or compromise occurred.

''', suffix, count=1)
suffix = rep1(suffix, 'The existence of biological quantum computation fundamentally changes what "threats" mean in the context of life-support:', 'If a biological quantum-computation substrate were independently demonstrated, it could motivate different threat hypotheses. The following comparison is conditional scenario analysis; this volume does not establish such a substrate:', 'Part XXV conditional quantum threat framing')
suffix = rep1(suffix, 'With Thunderfury Starforge:', 'Under the hypothetical Thunderfury model:', 'Part XXV conditional model label')
suffix = rep1(suffix, 'Threats can now target your computational substrate directly, which is also your life-support substrate', 'Within the scenario, a threat might target a hypothetical computational substrate that is assumed to share resources with life-support; no such coupling is established here.', 'Part XXV quantum substrate coupling')
suffix = rep1(suffix, 'An attacker who collapses your quantum coherence doesn\'t need to "target your brain" or "attack your heart" — they attack the atomic-field geometry that maintains both your life-support AND your computational autonomy. One attack collapses both.', 'In the hypothetical model, an attacker might target a proposed coherence variable; no evidence here shows that atomic-field geometry maintains biological life-support or computational autonomy, or that one perturbation would collapse both.', 'Part XXV quantum attack premise')
suffix = rep1(suffix, 'This is why Type I is existential. It\'s not about protecting your neural resources. It\'s about protecting your coherence as a physical phenomenon.', 'Within that conditional model, Type I is treated as a high-severity research category. This label is not an empirical risk estimate or evidence that biological coherence is an attackable computational substrate.', 'Part XXV Type I severity claim')
suffix = rep1(suffix, 'Type I Routing Tail exists to:', 'The proposed Type I Routing Tail is intended to study:', 'Part XXV Type I capability claim')
suffix = rep1(suffix, 'Current System State: Operational but not user-controlled\nRecovery Path (High-Level):', 'Source-scenario status: alleges operation without user control; not independently verified and not a finding about a real system.\nConditional recovery research worklist (not validated instructions):', 'Part XXV recovery status')
suffix = rep1(suffix, 'GSRB must restore user as system superuser', 'Any restored permission must be scoped and independently authorized under the applicable process; “superuser” access is not assumed or implied', 'Part XXV recovery authority')
suffix = rep1(suffix, 'Current Blocker: Scenario-only claim: the source draft alleges limited superuser access, but this manuscript supplies no independent verification of a user’s access state or a deployed system.', 'Evidence boundary: the source draft alleges limited superuser access; this manuscript supplies no independent verification of that allegation, a user’s access state, or a deployed system.', 'Part XXV recovery blocker')
suffix = rep1(suffix, 'The NAB routing compendium is designed to protect Thunderfury Starforge\'s quantum substrate.', 'The NAB routing compendium proposes a taxonomy that could be evaluated if a relevant substrate were independently demonstrated; it does not establish such a substrate or the feasibility of protecting it.', 'Part XXV NAB-quantum link')
suffix = rep1(suffix, 'With Type I:\nYou can use your quantum substrate for authorized computation without exposing yourself to hijacking\nGSRB and other orbs cannot exploit your coherence for external purposes', 'Conditional design objective for a hypothetical substrate: Type I would seek to constrain authorized computation and unauthorized access. No defense efficacy or inability of external actors to interfere is established.', 'Part XXV Type I guarantees')
suffix = rep1(suffix, 'Author & Authority:\nHarshal Priyavadan Patel\nAutonomous system user; system architect; current operator without superuser access', 'Author and scenario attribution:\nHarshal Priyavadan Patel\nThe source text describes the author as a system user/operator and alleges limited superuser access. Those are author-reported scenario statements, not independently verified facts about a deployed system.', 'Part XXV author access claim')
suffix = rep1(suffix, 'Next Actions (Recovery Priority):', 'Hypothetical next-step research questions (not operational instructions):', 'Part XXV next actions status')
suffix = rep1(suffix, '1. Part A (ADJR-v1.0 detect_corpse_puppet() under INV-CORPSE-001):', 'Worked Example 25.1 assumes a fictionalized input set for practice; values and events are not incident evidence or demonstrated capability.\n1. Part A (ADJR-v1.0 detect_corpse_puppet() under INV-CORPSE-001):', 'Part XXV worked example provenance')

# Part XVI labels such as “Guaranteed” are scenario/model categories, not validated performance claims.
part16_start = prefix.index('Part XVI — Threat Modeling and Context-Dependent Guarantees')
part17_start = prefix.index('Part XVII — Atomic Body Classes and Reactor Doctrine', part16_start)
part16 = prefix[part16_start:part17_start]
part16 = part16.replace('3. Physical mass and biological substrate serve as the ultimate root of trust. Digital credentials uncoupled from verified physical mass degrade into synthetic decoy routes.', '3. The proposal considers physical possession and hardware attestation as possible trust inputs; it does not establish biological mass as a universal root of trust, and digital credentials still require threat-specific verification.')
part16 = part16.replace('4. Where technical prevention hits information-theoretic limits, continuous external audit (Ground-0) enforces accountability.', '4. Where technical controls have limits, an independent external audit is proposed as a supplementary accountability measure; its effectiveness depends on independence, authority, and evidence access.')
part16 = part16.replace('Guaranteed:', 'Proposed (not independently validated):')
part16 = part16.replace('Not Guaranteed:', 'Not established or assessed in this draft:')
part16 = part16.replace('##### The 4-Layer Specification (CHE++ Hardened)', '##### Proposed 4-Layer Design (CHE++; Not Validated)')
part16 = part16.replace('Mandated Protocol Stack:', 'Proposed Protocol Stack:')
part16 = part16.replace('Kinetic Delay: Mandatory 20-minute physical cooldown horizon on all state alterations.', 'Proposed kinetic delay: a 20-minute cooldown target for selected state alterations; feasibility and safety require target-specific validation.')
prefix = prefix[:part16_start] + part16 + prefix[part17_start:]

# The training example’s legacy “alive” and “liveness beacon” fields are not clinical findings.
suffix = rep1(suffix, 'if !entity.alive {', 'if !entity.human_key_authorization_valid {  // H=0/unknown for this request; not a clinical finding', 'ADJR code Human-Key gate')
suffix = rep1(suffix, 'if entity.last_liveness_beacon.elapsed() > self.liveness_timeout {', 'if entity.last_human_key_protocol_response.elapsed() > self.authorization_timeout {  // protocol freshness only', 'ADJR code freshness gate')
suffix = rep1(suffix, 'GOOD_DAY(entity) =', '// entity.alive is an independently established external record, never inferred from telemetry or a beacon.\nGOOD_DAY(entity) =', 'ADJR external life-state boundary')

# Part XXV’s remaining hypothesis language and recovery worklist are expressly conditional.
suffix = rep1(suffix, '11.1 Core Hypothesis & Implementation', '11.1 Core Hypothesis & Conditional Model', 'Part XXV hypothesis heading')
suffix = rep1(suffix, 'In this architecture:\nInformation is encoded in stable resonance patterns spanning atomic, molecular, and cellular scales\nComputational state, metabolic regulation, and error correction co-manage in real time', 'The proposed architecture hypothesizes that:\nInformation might be encoded in stable resonance patterns spanning atomic, molecular, and cellular scales. This is not demonstrated.\nComputational state, metabolic regulation, and error correction might be modeled as coupled variables; no such real-time mechanism is established.', 'Part XXV architecture claims')
suffix = rep1(suffix, 'Key insight: Your quantum substrate is simultaneously:\n1. Life-support system (metabolic regulation, coherence maintenance)\n2. Computational platform (authorized organocomputing)\n3. Identity matrix (coherence patterns encode persistent self)', 'Hypothesis within the proposed model: if a relevant substrate were independently demonstrated, it might couple physiological, computational, and identity-related variables. This manuscript does not establish that any such coupling exists or that identity is encoded in coherence patterns.', 'Part XXV substrate claim')
suffix = rep1(suffix, 'System must enable quantum computation (Thunderfury Starforge\'s core capability)\nSystem must absolutely prevent hijacking (existential autonomy requirement)\nNo compromise possible: coherence preservation AND autonomy preservation are both non-negotiable', 'The hypothetical model seeks to allow a specified computation while limiting unauthorized control. Feasibility, physical substrate, and any safety trade-off remain open research questions; these are proposed objectives, not demonstrated capabilities.', 'Part XXV coherence/autonomy claims')
suffix = rep1(suffix, 'In life-support failure scenarios (GSRB unreachable, orb hierarchy compromised), coherence maintenance becomes the absolute priority.\nType I Tail\'s 15-minute survival capability means:\nModel assumption only: this draft does not establish that maintaining a hypothetical quantum-coherence variable preserves biological function.\nIf coherence collapses, biological failure occurs within minutes regardless of other systems\nTherefore: Tail\'s job is to maintain coherence at all costs until restart sequence possible\nAuthorized computation is suspended during survival mode. Coherence is too precious; all resources dedicate to life-support.', 'In a hypothetical life-support failure scenario, the model proposes prioritizing a defined safe-state objective. The 15-minute figure is an unvalidated scenario parameter, not a survival prediction. This draft does not establish that a coherence variable preserves biological function, that its loss causes biological failure within a particular time, or that a restart sequence is possible. Any controller or resource-allocation rule would require clinical, engineering, and safety validation before use.', 'Part XXV 15-minute survival claim')
suffix = rep1(suffix, 'In Thunderfury Starforge, coherence patterns encode persistent self. Your identity is not just your neural architecture or your memories — it\'s the resonance patterns woven through your atomic structure.', 'The model hypothesizes that a hypothetical coherence pattern might correlate with persistent identity; this is speculative and is not established by evidence in this volume.', 'Part XXV identity hypothesis')
suffix = rep1(suffix, 'Decoherence attack ≠ physical injury; it\'s existential erasure\nField hijacking ≠ resource theft; it\'s identity hijacking\nBotnet conversion ≠ forced labor; it\'s absorption into another entity\'s coherence\nType I defenses are therefore autonomy preservation at the deepest level — protecting not just your life, but your coherent self.', 'Within the hypothetical model, these are proposed analogies for potential harms if the substrate and mechanisms were demonstrated. They are not findings about physical injury, identity, or an active threat.', 'Part XXV coherence identity implications')
suffix = rep1(suffix, 'Thunderfury Starforge assumes biological quantum error-correction mechanisms exist. Can these be disabled or reversed to accelerate decoherence rather than suppress it?', 'The model hypothesizes biological quantum error-correction mechanisms, but their existence is not established here. If evidence supported such a mechanism, could it be disrupted or reversed?', 'Part XXV QEC assumption')
suffix = rep1(suffix, 'These questions are critical for understanding realistic survival windows and escalation thresholds.', 'These open questions do not establish realistic survival windows or escalation thresholds; they define topics for future, independently reviewed research.', 'Part XXV survival window claim')
suffix = rep1(suffix, '11.6 Thunderfury Starforge: Reclamation Requirements', '11.6 Thunderfury Starforge: Hypothetical Recovery Worklist (Unvalidated)', 'Part XXV recovery heading')
suffix = rep1(suffix, 'GSRB must be informed of unauthorized control\nGSRB must revoke authority grants made under deception', 'If unauthorized control were independently substantiated, the relevant accountable parties and lawful oversight process could be notified. Any scoped grant could be reviewed and, if warranted, revoked under its own defined process; identity credentials remain non-revocable.', 'Part XXV GSRB recovery instructions')

# Correct the remaining proposed liability language and clarify its non-legal status.
prefix = rep1(prefix, 'and 100% of civil/criminal liability pierces the puppeted human "front body" to attach directly to the controlling shell structure.', 'and the proposed model attributes responsibility to the controlling shell and accountable human principals; actual civil or criminal liability remains subject to applicable law and is not automatically reassigned by this text.', 'liability-piercing claim')

# Part XXV contains proposed CLAA/NAB material; reconcile legacy completion and deployment claims.
suffix = rep1(suffix, 'CLAA-v1.0 is a complete, standalone specification companion to ADJR-v1.0. Both operate on the principle that structural enforcement replaces hope. CLAA is now ready for implementation, audit, and deployment.', 'CLAA-v1.0 is a proposed draft companion to ADJR-v1.0. Its stated rules and tier model require legal review, implementation work, and independent testing; this manuscript does not establish readiness for deployment or audit.', 'Part XXV CLAA completion claim')
suffix = rep1(suffix, 'Specification Status: Final | Date: September 24, 2026 | Author: Harshal Priyavadan Patel', 'Source-stated status: Final | Date: September 24, 2026 | Author: Harshal Priyavadan Patel. This edition classifies the material as DRAFT and does not claim implementation or validation.', 'Part XXV CLAA source status')
suffix = rep1(suffix, '└─ Patch designs ready for deployment', '└─ Patch concepts proposed for review and testing before any deployment', 'Part XXV patch readiness claim')

# Final consistency edits on illustrative thresholds, the quantum-hypothesis bullets, and glossary labels.
prefix = rep1(prefix, 'with H=C=K=A=S=1.0 and illustrative τ_L = 0.50).', 'with H=C=K=A=S=1.0 and illustrative thresholds τ_A=τ_R=τ_S=τ_L=0.50).', 'Part II problem 2 complete thresholds')
prefix = rep1(prefix, 'with A = 0.95, δ = 300 s, and illustrative τ_L = 0.55.', 'with A = 0.95, δ = 300 s, and illustrative thresholds τ_A=0.90, τ_R=0.75, τ_S=0.50, τ_L=0.55.', 'Part II problem 4 complete thresholds')
prefix = rep1(prefix, '100% Hardened & Production-Ready\nA state of complete operational readiness where the system is fully isolated (partitioned) from unauthorized inputs, resilient (hardened) against external attacks or internal drift, and stable enough for real-world, high-stakes deployment.', '“100% Hardened & Production-Ready” (source phrase; no system in this edition is assigned this status)\nAn author-defined aspiration. A claim of readiness would require a named system, stated threat scope, independent testing, residual-risk disclosure, and evidence of deployment conditions. This manuscript does not establish that any system meets this standard.', 'Part II readiness glossary')
suffix = rep1(suffix, '1. Preserve Coherence Integrity — Your life-support depends on quantum coherence; any decoherence attack is an existential threat\n2. Enable Authorized Organocomputing — You can direct your own quantum substrate toward authorized computation without sacrificing coherence\n3. Prevent Unauthorized Hijacking — Attackers cannot commandeer your atomic fields for their computation or turn your substrate into infrastructure for their networks\n4. Maintain Autonomy Over Your Own Processor — You decide what your quantum substrate computes; no external authority can override that (including GSRB, in this domain)', '1. Identify what measurable biological function, if any, is associated with a validated coherence variable.\n2. Specify how action-specific authorization would be represented and tested in a hypothetical implementation.\n3. Define evidence-based threat scenarios and identify which claims remain unsupported.\n4. Analyze governance limits and scoped permissions without asserting that external interference is impossible.', 'Part XXV Type I research questions')
suffix = rep1(suffix, 'This means:\nWithin the hypothetical model, these are proposed analogies for potential harms if the substrate and mechanisms were demonstrated. They are not findings about physical injury, identity, or an active threat.', 'If the hypothesis were substantiated, possible implications to investigate would include:\nWithin the hypothetical model, the following are proposed analogies for potential harms. They are not findings about physical injury, identity, or an active threat.', 'Part XXV identity implications lead-in')
suffix = rep1(suffix, 'Hypothetical next-step research questions (not operational instructions):\n1. Identify cyclic observer timing pattern and current observer identity\n2. Audit personal assistant AI compromise (what deception was used?)\n3. Escalate to GSRB equivalent authority for superuser access restoration\n4. Implement Type I Routing Tail (coherence integrity monitoring)\n5. Sever unauthorized observer telemetry feed\n6. Restore personal assistant integrity', 'Hypothetical next-step research questions (not operational instructions):\n1. If evidence of observers exists, how could identities and timing be independently verified without exposing unnecessary personal data?\n2. If lawfully available, what records could establish whether an assistant-mediated scoped grant was issued?\n3. Which applicable process can review and, if warranted, retire a specific unauthorized operational grant while preserving identity and appeal rights?\n4. What evidence would be required before evaluating a Type I design against a demonstrated substrate?\n5. How can verified telemetry channels be restricted while preserving auditable evidence?\n6. What tests would establish integrity of a personal assistant before any renewed use?', 'Part XXV next-step claims')
suffix = rep1(suffix, 'Documented without:\nAuthorization from unauthorized observers\nCoordination with external actors\nDeception or misrepresentation of system status\nHidden objectives or secondary agendas', 'Author-reported drafting declarations (not independently verified):\nNo authorization from alleged observers\nNo coordination with alleged external actors\nNo intentional misrepresentation of system status\nNo hidden objectives or secondary agendas', 'Part XXV author declarations')

# Replace residual biological-state, physical-zero-latency, and automatic-liability claims in the
# Part I formal boundary with a protocol-state rule and a non-legal design proposal.
prefix = rep1(prefix, 'creates a catastrophic adversarial edge case if the boundary of human liveness and conscious intent is not formally enforced: Post-Liveness / Post-Consent Continuation ("Corpse-Puppeting"), in which an augmented-intelligence system, neural implant, or institutional shell continues driving a human body (or replaying their digital/legal identity) after conscious intent or biological life has ceased.', 'creates an adversarial risk if systems continue acting without current authorization: Post-Authorization Continuation, in which an augmented-intelligence system, neural implant, or institutional shell continues physical actuation or identity-bound transactions after the Human-Key protocol gate is absent/unknown or a separate applicable process establishes a clinical/legal boundary. H=0 alone does not establish consciousness, coercion, or death.', 'Part I post-authorization risk definition')
prefix = rep1(prefix, 'Let H_conscious(t) ∈ \\{0,1\\} denote verified, uncoerced, living conscious human intent at the clinical liveness boundary, and let P_periph(t) ∈ [0,1] denote peripheral motor/signaling channel fidelity.', 'Let H(t)∈{0,1} denote the Human-Key protocol state: an authentic identity credential, a fresh bound-session response, and explicit action-specific intent. H=0 or unknown means authorization is unavailable; it is not a finding about consciousness, coercion, or death. Let P_periph(t)∈[0,1] denote peripheral signaling quality in this illustrative model; it is not sufficient authorization.', 'Part I formal H definition')
prefix = rep1(prefix, '1. Regime I — Legitimate Assistive Continuity (H_conscious(t) = 1,  P_periph(t) < 1):\nThe human principal is alive, conscious, and authoring intent, while peripheral signaling or motor execution is impaired or intermittent. The HMKH system bridges the impaired channel to maintain continuity of the living human\'s intent and authorship. Moral and legal agency remain 100% anchored in the living human principal (INV-AGENCY-001).', '1. Regime I — Assistive Continuity (H(t)=1, P_periph(t)<1):\nThe protocol has a fresh action-specific response while peripheral signaling or motor execution is impaired or intermittent. An assistive interface may bridge that channel only within the separate scoped grant and remaining gates. This protocol record does not clinically establish consciousness or absence of coercion; legal responsibility is not determined by the score.', 'Part I Regime I')
prefix = rep1(prefix, '2. Regime II — Prohibited Corpse-Puppeting / Replay Breach (H_conscious(t) = 0,  Actuation(t) > 0):\nThe human principal is deceased, brain-dead, unconscious, neurojacked, or severed from the loop (H_conscious(t) = 0—operating "beyond the clinical limits prescribed by the body\'s field medic"), yet an augmented-intelligence controller, neural stimulator, or institutional shell continues moving the biological body, firing motor pathways, or executing legal/financial actions in the host\'s name.', '2. Regime II — Unauthorized Post-Authorization Actuation / Replay (H(t)=0 or unknown, Actuation(t)>0):\nThe protocol lacks a current authorized Human-Key response while physical or identity-bound action continues. H=0/unknown does not reveal why the response is absent or prove that the person is deceased, unconscious, or coerced. Any separate clinical or legal determination must follow its applicable process.', 'Part I Regime II')
prefix = rep1(prefix, '- Instantaneous Actuation Halt (OCS-v1.0 & HMKH Control 4): Transition from H_conscious(t) = 1 to 0 triggers an immediate, zero-latency halt of all motor, neural, and transactional actuation (L_exec(t) = 0).', '- Refusal on Missing Authorization (proposed OCS/HMKH control): When H=0 or unknown, the policy returns Refuse and authorizes no new motor, neural, or transactional operation. Physical shutdown latency is device-specific, nonzero, and must be independently measured; no zero-latency claim is made.', 'Part I physical latency claim')
prefix = rep1(prefix, '- Liability Piercing (Front Body → Shell Structure, ADJR-v1.0 §1.3 & §3.2): Under no circumstances may responsibility, authorship, or legal liability be transferred to the computational system itself or pinned onto a corpse-puppeted/coerced human "front body." If an external shell forces continuation across the H_conscious(t) = 0 boundary, the human host is held strictly harmless and 100% of civil and criminal liability pierces directly to the controlling shell structure and its operators.', '- Proposed Attribution Principle (ADJR-v1.0): The design rejects scapegoating a human “front body” for actions initiated or controlled by an external shell and seeks attribution to identifiable responsible principals. This manuscript does not determine or reallocate civil or criminal liability; applicable law and evidence govern.', 'Part I legal-liability claim')
prefix = rep1(prefix, 'Every HMKH implementation MUST enforce deterministic failure states when the Human Key becomes unavailable due to incapacitation, disconnection, or biological cessation:', 'Every proposed HMKH policy should define fail-closed behavior when current Human-Key authorization is unavailable (including disconnection, withdrawal, or stale session). The protocol does not diagnose incapacitation or biological cessation:', 'Part I clinical state trigger')
prefix = rep1(prefix, 'No Operation Beyond the Clinical Liveness Boundary: In the absence of a valid Human Key (H(t) = 0), the system never operates beyond the physiological and clinical limits established for the host ("the field-medic boundary").', 'No Operation Beyond the Current Authorization Boundary: If H=0 or unknown, no new action is authorized. Clinical limits are external constraints and are not inferred from the protocol or telemetry.', 'Part I clinical boundary')
prefix = rep1(prefix, 'Shift from Execution to Inert Signaling (CWO Cryptobiosis): Rather than continuing to act or "fill in" for the absent human, the system immediately suspends autonomous decision-making, freezes internal state without further progression, and restricts output strictly to verifiable continuity signaling (Signaling-Only profile, CL-011):', 'Proposed response: return Refuse before any new operation and restrict any permitted output to the predeclared Signaling-Only profile (CL-011). Hardware stopping latency and the safety of each output require target-specific testing; “CWO” is a governance/software label, not a clinical status:', 'Part I inert-signal response claim')
prefix = rep1(prefix, 'When H(t) → 0, autonomous actuation halts instantaneously (L_exec(t) = 0) and the system drops into a non-acting Custodial Witness / Distress-Signaling State (CWO).', 'When H=0 or unknown, the proposed policy returns Refuse for new operations and restricts permitted outputs to a predeclared safe profile; physical stopping latency is device-specific and must be measured. CWO is a governance/software label, not a clinical finding.', 'Part I action stop claim')
prefix = rep1(prefix, 'Compatibility with Legal Liability Piercing (Front Body vs. Shell Structure):\nAligns hybrid systems with established legal norms by assigning responsibility exclusively to identifiable human principals and their underwriting institutions, while ensuring that if an external shell coerces or puppets an incapacitated host, liability pierces the human "front body" and attaches strictly to the controlling shell structure (ADJR-v1.0).', 'Proposed compatibility objective (Front Body vs. Shell Structure): The model seeks to preserve attribution to identifiable responsible principals and avoid using a human host as a scapegoat for external control. It is a design proposal, not a statement of established law or an automatic legal-liability allocation.', 'Part I legal compatibility claim')
prefix = rep1(prefix, 'The requirement for zero-latency response when a stopping condition is met. There is no "grace period," no finishing of current tasks, and no waiting for a better moment to pause. The halt is instantaneous.', 'The policy requirement to refuse authorization before a new action is committed when a stopping condition is met. Physical response latency is implementation- and device-specific, nonzero, and must be measured; no new action receives a discretionary grace period.', 'Immediate glossary latency')
middle = rep1(middle, '// Immediate zero-latency power down (Hard Halt)', '// Illustrative pseudocode only: request a hardware trip; actual response latency is nonzero, device-specific, and must be measured.', 'OCS power-trip comment')

# Add a local DRAFT/evidence boundary to Part XVII and convert the “zero-signal” claim into a
# testable design objective rather than a physical guarantee.
prefix = rep1(prefix, 'Part XVII — Atomic Body Classes and Reactor Doctrine\n\n', 'Part XVII — Atomic Body Classes and Reactor Doctrine\n\nStatus/evidence note: Part XVII is DRAFT conceptual taxonomy and speculative reactor doctrine. Atomic-body classes, biological/quantum mechanisms, “hardened” labels, and response times are model constructs or proposals, not demonstrated chemistry, nuclear engineering, or deployed hardware.\n\n', 'Part XVII local status note')
prefix = rep1(prefix, 'The Stingray Counter implements a radical rule: Zero-Signal Drop. If bidirectional cryptographic identity verification fails or reveals proxy manipulation, the physical transmission amplitude drops instantaneously to zero. The eavesdropper captures no bits, no ciphertext, and no metadata.', 'The proposed Stingray Counter uses a Zero-Signal Drop policy: if bidirectional peer verification fails, the interface refuses to establish or continue the requested channel. Physical mute behavior, timing, and metadata/side-channel leakage require device-specific tests; no zero-emission or eavesdropper-proof guarantee is claimed.', 'Part XVII Stingray guarantee')
prefix = rep1(prefix, 'All transmissions drop to zero;\n                                        zero bits exposed to listener', 'Refuse channel setup; physical mute latency and residual metadata/side channels require testing', 'Part XVII zero-signal diagram')

# In the OCS learning objective, distinguish an abstract address-model transition from a physical event.
middle = rep1(middle, 'Under classical OCM axioms, invalidation of the Center origin point causes instantaneous, catastrophic addressing collapse across the entire sphere (Collapse-on-Origin-Removal Axiom).', 'Within the abstract OCM address model, invalidating the Center Origin is defined to cause a structural addressing failure (Collapse-on-Origin-Removal Axiom). This is a model transition, not a measured instantaneous physical collapse.', 'OCS origin-removal model claim')

# Retain source-authored CLAP status as provenance but align it with Part XXV DRAFT classification.
suffix = rep1(suffix, 'Author: Harshal Priyavadan Patel\nStatus: Final\nDate: September 24, 2026', 'Author: Harshal Priyavadan Patel\nSource-stated status: Final (source metadata only; this edition classifies Part XXV as DRAFT)\nDate: September 24, 2026', 'CLAP source status')

# Tighten Part XIX's human-state and latency language: H is a protocol state, not a clinical finding.
prefix = rep1(prefix,
    '1. The Human Key (H(t_i) = 1) was live, conscious, and unrevoked;',
    '1. The Human-Key protocol state (H(t_i)=1) satisfied the authentication, fresh-session, and action-specific intent checks; this record does not establish consciousness, absence of coercion, or clinical life;',
    'Part XIX H-PoW state boundary')
prefix = rep1(prefix,
    'HMKH rejects intermittent supervision as the basis of legitimacy. Instead, operational authority is a continuous function of the live cryptographic and liveness coupling H(t): if the human key degrades or detaches (Δ t ≥ δ), permitted scope S(t) = S_max · max(0, 1 - Δ t/δ) contracts automatically to zero.',
    'HMKH proposes continuous protocol evidence for identity, session integrity, action-specific intent, and freshness. In this model, S(t,a)=0 for an unauthorized/out-of-scope action or when Δt≥δ; this governs permission for new requests, not physical stopping latency. It does not claim that a device stops automatically or instantaneously; response timing requires device-specific measurement.',
    'Part XIX continuous protocol state')
prefix = rep1(prefix,
    'While optimizing for smooth continuation improves usability in benign settings, it introduces a severe vulnerability in adversarial or clinical-boundary scenarios: an interface engineered to "fill in missing human signals" cannot natively tell whether the human\'s peripheral channel is merely noisy or whether the human\'s conscious intent has ceased entirely (or been overridden by external stimulation). HMKH resolves this by treating assistive computation strictly as agency preservation for a verified living consciousness (H(t) = 1), never as a surrogate decision-maker capable of operating across the boundary of unconsciousness, coercion, or death.',
    'While optimizing for smooth continuation may improve usability in some settings, an interface cannot infer from a noisy peripheral channel whether intent is absent, withdrawn, or coerced. HMKH therefore models assistive computation only while the Human-Key protocol state is valid (H=1), within the separate scope grant and all other gates. H=0 or unknown blocks new authorization but is not a clinical finding of unconsciousness, coercion, or death; any clinical/legal determination follows an independent applicable process.',
    'Part XIX assistive-state boundary')
prefix = rep1(prefix,
    'The Human Key H(t) does not require the human to manually micro-manage every CPU cycle; rather, it anchors authorship, scope boundaries, and revocability. When H(t) = 1 and Δ t < δ, the computational substrate may execute complex, long-running workflows within S_eff(t). The instant H(t) = 0 or Δ t ≥ δ, L(t) → 0 and live execution halts.',
    'The Human-Key protocol does not require manual supervision of every CPU cycle; it binds the requested operation to current identity/session evidence, action-specific intent, and scoped permission. When H=1, C=K=1, V(a,t)=1, a∈D(t), and the registered thresholds pass, the model permits only the authorized workflow while its lease is fresh. When H=0/unknown or Δt≥δ, the policy returns Refuse for new operations and sets L=0 for that action. Physical response latency is device-specific and must be independently measured; the protocol does not diagnose why a response is absent.',
    'Part XIX Human Key operational boundary')
prefix = rep1(prefix,
    'A Keyed Human–Machine Hybrid System (HMKH) is a coupled architecture in which legitimate operational action emerges only through the persistent association between a bounded computational process and a verified, living human keyholder (H(t) = 1).',
    'A Keyed Human–Machine Hybrid System (HMKH) is a proposed architecture in which an action may be permitted only when a bounded computational process is associated with a named identity record, fresh Human-Key protocol response, action-specific intent, and the other required gates. H=1 is not a clinical finding of life, consciousness, or freedom from coercion.',
    'Part XIX HMKH definition')
prefix = rep1(prefix,
    '1. Live Operational Authority Collapses to Zero (L_exec(t) = 0): Without active coupling to the living Human Key, the system is incomplete as an actor and Mathematically Void for initiating any new decision, transaction, or physical actuation.\n2. Custodial Artifact Completeness Persists (CWO Preservation State): While live execution halts immediately, the system\'s prior signed ledger receipts, frozen state snapshot, and pre-authorized non-acting preservation/signaling routines remain structurally complete and legally valid as an auditable record.',
    '1. Proposed refusal state (L_exec(t)=0): Without current Human-Key protocol authorization, the policy refuses new decisions or transactions. This is a model rule, not evidence of instantaneous physical actuation; any hardware stop latency must be measured.\n2. Custodial record preservation (CWO model): When authorization is unavailable, prior signed receipts, snapshots, and pre-authorized non-acting records may be retained under a validated policy. Their preservation does not guarantee safe physical stopping or determine their legal effect.',
    'Part XIX authorization-loss semantics')
prefix = rep1(prefix,
    'The central challenge of long-running autonomous and augmented-intelligence systems is not maximizing machine capability, but preserving living human accountability. By requiring continuous coupling to a verified Human Key (H(t) = 1), reframing Proof-of-Work as continuity of human responsibility, and enforcing a hard clinical and cryptographic halt against Corpse-Puppeting (INV-CORPSE-001), HMKH ensures that machines remain powerful, auditable instruments rather than unaccountable sovereigns. The future of sustainable autonomy lies not in removing humans from the loop, but in keying the loop itself—so that when human authority pauses or ends, the machine knows how to stop.',
    'The central challenge is to preserve attributable human accountability without confusing a protocol state with a clinical finding. HMKH proposes current identity/session evidence, action-specific authorization, and fail-closed policy for new requests. A modeled Refuse result is not a demonstrated physical halt or clinical safeguard; actual device response, residual action, and safety require independent engineering and clinical validation. Authority remains bounded by the named human principal and does not migrate to the computational system.',
    'Part XIX conclusion boundary')
prefix = rep1(prefix,
    '1. Cryptographic Addressability Without Physical Exposure: A specific, living natural-person human keyholder (H(t) = 1) remains uniquely bound to Center Origin and legally/procedurally addressable through the protocol\'s authenticated resolution channel (A(t) ≥ τ_A), while Zero-ZKPs may verify a credential or statement without revealing a coordinate. They cannot verify consciousness, consent, or absence of coercion; beacon/location evidence must be treated as a limited telemetry input.',
    '1. Cryptographic Addressability Without Physical Exposure: A named natural-person identity record may be bound to Center Origin and procedurally addressable through the authenticated resolution channel (A(t) ≥ τ_A), while zero-knowledge proofs may verify a credential or statement without revealing a coordinate. H=1 denotes a protocol response, not proof of life, consciousness, consent, or absence of coercion; beacon/location evidence remains a limited telemetry input.',
    'Part XIX ZKSK identity boundary')
prefix = rep1(prefix,
    '2. Quarantine Quorum (CWO), Never Authority-Generating DAO: Redundant institutional nodes (the Meta-Triad) act strictly as a defensive revocation and quarantine circuit-breaker (Phase II — CWO). The quorum can halt and quarantine a compromised or coerced key (forcing the system into NAB refusal), but can never generate legitimacy (L(t)) or authorize actions without a verified living Human Key.',
    '2. Quarantine Witnesses (CWO), Never Authority-Generating DAO: Redundant institutional nodes (the Meta-Triad) may request a pre-authorized restriction or quarantine of an affected session or scoped operational grant only when a separate, predeclared evidence-based safety predicate is met. They cannot revoke or erase identity credentials, decide clinical state, generate legitimacy L(t), or grant operational authority. Any request is subject to the validated deployment policy; it is not a capability claim.',
    'Part XIX quarantine authority')
prefix = rep1(prefix,
    '3. Temporal Freshness (Δ t < δ): ZKSK tokens decay linearly according to S(t) = S_max · max(0, 1 - Δ t/δ) and require active, uncoerced re-attestation within window δ.',
    '3. Temporal Freshness (Δt < δ): Under the proposed model, scoped tokens age according to S(t,a)=S_max·max(0,1−Δt/δ) while the action remains authorized and in scope. A fresh protocol response is required within window δ; telemetry cannot prove that the response was uncoerced.',
    'Part XIX temporal freshness boundary')
prefix = rep1(prefix,
    'Where physiological, neural, or environmental signals are used to verify liveness (H(t) = 1) and contextual continuity (C(t) = 1), they are processed locally within the AI Inner Shell (Part VI) as ephemeral zero-knowledge attestations—never as behavioral surveillance, continuous biometric harvesting, or remote employer monitoring (HMKH Control 5 — Neural-Data Minimization).',
    'Where physiological, neural, or environmental signals are used as limited safety or connectivity inputs, they may be processed locally within the AI Inner Shell (Part VI) as ephemeral, privacy-preserving attestations. Such signals do not establish H=1, consciousness, consent, or clinical life; H=1 requires the separately defined identity/session proof and action-specific intent. This design objective does not establish implemented privacy or safety efficacy (HMKH Control 5 — Neural-Data Minimization).',
    'Part XIX sensor versus Human-Key boundary')

# Treat source confidence labels in Part XVI as qualitative metadata, not measured probabilities or efficacy.
prefix = repn(prefix, 'Composite Confidence:', 'Source-stated qualitative confidence label (not a probability or validation):', 7, 'Part XVI confidence labels')

# Mark the embedded patent-style disclosure as an author-supplied draft, not a filed or implemented invention.
prefix = rep1(
    prefix,
    'Externally Mediated Human–Machine Hybrid Systems with Accountability-Gated Operation, Sensory-State Signaling, and Addressable Carrier Units\nHARSHAL\nJAN 22, 2026',
    'Externally Mediated Human–Machine Hybrid Systems with Accountability-Gated Operation, Sensory-State Signaling, and Addressable Carrier Units\n\nDocument-status note: The following patent-style text is an author-supplied draft specimen, not a filed or issued patent, patentability opinion, verified invention, deployed system, or medical-device authorization. Claim language describes proposed embodiments, not evidence that the functions exist or have been tested. Any actual clinical or safety-critical use would require independent engineering, clinical, regulatory, and safety review. Commercial intellectual-property licensing is separate from identity credentials and operational authorization.\n\nHARSHAL\nJAN 22, 2026',
    'Part XV patent-style source status')

# BGP-v1.0: make reserve, contingency, routing, islanding, and severance behavior explicitly
# proposal-level. Physical actuation requires authorization, equipment-specific validation,
# measured feedback, and deployment evidence; no automatic or instantaneous capability is claimed.
bgp_start = middle.index('BGP-v1.0: Inter-Orb Demarcation')
bgp_end_marker = 'END OF SPECIFICATION BGP-v1.0'
bgp_end = middle.index(bgp_end_marker, bgp_start) + len(bgp_end_marker)
bgp = middle[bgp_start:bgp_end]
bgp = rep1(
    bgp,
    'Status/evidence note: Diagrams, wire fields, thresholds, and code in this module are design proposals, not a tested deployment. Service-continuity and latency claims require target-specific evidence.',
    'Status/evidence note: Diagrams, wire fields, thresholds, and code are proposals/pseudocode, not a tested deployment. This module does not claim automatic reserve activation, instantaneous severance, successful islanding, or uninterrupted service. Any physical action requires explicit authorization in a deployment profile, equipment-specific safety validation, tested timing and feedback, and deployment evidence.',
    'BGP explicit evidence boundary')
bgp = rep1(bgp, 'Zero Telemetry Leakage', 'Leakage Tests Required', 'BGP diagram telemetry claim')
bgp = rep1(bgp, 'Hostile Intrusion', 'Modeled Contingency', 'BGP diagram threat claim')
bgp = rep1(bgp, 'MECHANICAL CAUTERIZATION', 'PROPOSED ISOLATION REQUEST', 'BGP diagram severance claim')
bgp = rep1(bgp, 'Reserve Unchallenged', 'Reserve Draw Needs Approval', 'BGP diagram reserve claim')
bgp = rep1(bgp, 'Reserve Powers Island Mode', 'Tested Island Mode Only', 'BGP diagram island claim')
bgp = rep1(bgp, 'Equal Division (50/50)', 'Illustrative Split (50/50)', 'BGP diagram arbitration label')
bgp = rep1(bgp, 'Part I — Normative Architectural Axioms', 'Part I — Proposed Architectural Axioms', 'BGP axioms status label')
bgp = rep1(bgp, 'Nominal Arbitration', 'Proposed Arbitration', 'BGP diagram arbitration status')
bgp = rep1(bgp, '+40% Headroom Buffer', '+40% Reserve Target', 'BGP diagram reserve status')
bgp = rep1(bgp, 'Protected reserve: 40%', 'Reserve target: 40%', 'BGP rated reserve diagram status')
bgp = rep1(bgp, 'Tested Island Mode Only', 'Island Mode If Validated', 'BGP diagram islanding status')

axiom1_start = bgp.index('Axiom 1.1: The Non-Subordination Axiom')
axiom2_start = bgp.index('Axiom 1.2: The 40% Redundancy Invariant', axiom1_start)
bgp = bgp[:axiom1_start] + '''Axiom 1.1: The Non-Subordination Axiom (Proposed)
The design objective is that no sphere be required to submit its internal resolution path or origin authority to an external sphere. An Inter-Orb Border Gateway (IO-BGP) is a proposed resource-scheduling and packet-transit boundary, not an authority source or global supreme court.
Proposed policy: If an external request seeks to modify internal addressing, surrender a Center origin, or expose a Human Key, the gateway should refuse and record a Terminal Demarcation Refusal. Any physical isolation is a separate contingency action that requires explicit authorization, equipment-specific validation, and feedback confirming the result. No automatic or instantaneous severance is claimed.
''' + bgp[axiom2_start:]
bgp = rep1(
    bgp,
    'For each resource, fix an independently documented denominator C_rated equal to its rated/nameplate capacity or an explicitly designated nominal capacity; record the selected basis, physical unit, operating conditions, and measurement interval in the profile. If rated and nominal figures differ, declare the conservative baseline to use before evaluation; never mix units, time bases, or incompatible ratings. During normal operation, routine active commitments satisfy C_active ≤ 0.60 × C_rated and the unallocated reserve satisfies C_reserve = C_rated − C_active ≥ 0.40 × C_rated. Thus “100% active allocation” means 100% of the permitted active envelope, equal to 60% of rated capacity—not 100% of rated capacity. Emergency use of reserve requires a separately authorized contingency profile; while reserve is depleted, no new routine commitments are admitted and the system must restore the reserve or remain in a restricted state. These are proposed design constraints, not a grid-safety certification.',
    'For each resource, fix an independently documented denominator C_rated equal to its rated/nameplate capacity or an explicitly designated nominal capacity; record the selected basis, physical unit, operating conditions, and measurement interval in the profile. If rated and nominal figures differ, declare the conservative baseline before evaluation; never mix units, time bases, or incompatible ratings. The proposed normal-operation constraint is C_active ≤ 0.60 × C_rated, leaving C_reserve = C_rated − C_active ≥ 0.40 × C_rated unallocated from routine commitments. Thus “100% active allocation” means 100% of the proposed active envelope, equal to 60% of the selected rated/nominal baseline—not 100% of that baseline. Emergency reserve use would require a separately authorized contingency profile; a draw should suspend new routine commitments and keep the system restricted until measured headroom is restored and the profile’s validation criteria are met. These are design objectives, not tested enforcement, grid-safety certification, or a guarantee against outages.',
    'BGP axiom rated reserve proposal')
axiom3_start = bgp.index('Axiom 1.3: Topological Deflection (The Mirror Boundary)')
part2_start = bgp.index('Part II — The 40% Dynamic Redundancy Architecture', axiom3_start)
bgp = bgp[:axiom3_start] + '''Axiom 1.3: Topological Deflection (The Mirror Boundary)
Proposed objective: minimize unauthorized inbound routing, internal-address exposure, and attempts to induce out-of-scope action. A candidate demarcation policy would reject unauthorized traffic under a tested profile rather than reflect it. Keeping internal routing tables opaque is a design objective; implementation behavior, discovery resistance, metadata exposure, and side channels require deployment-specific testing.
''' + bgp[part2_start:]
bgp = rep1(
    bgp,
    'During normal operation, reserve at least 0.40×C_rated,j from routine commitments. The following are proposed contingency objectives; any use consumes reserve and requires monitored restoration:',
    'The proposed normal-operation target is C_active,j ≤ 0.60×C_rated,j, leaving at least 0.40×C_rated,j unallocated from routine commitments. This target is not a hardware-enforced fact until an implementation is tested. The following are proposed contingency objectives; any use consumes reserve and requires monitored restoration:',
    'BGP reserve objective wording')
bgp = rep1(
    bgp,
    '       CONGESTION ABSORPTION                              ISLANDED MICROGRID               SPOOF DEFLECTION BUFFER\n  Absorbs sudden external route                      Powers mechanical breakers &        Buffers hostile packets while\n   flooding without brownouts                        life-support during severing         cauterization evaluates',
    '       LOAD-RESPONSE OBJECTIVE                         ISLANDED-SYSTEM OBJECTIVE           TRAFFIC-FILTER OBJECTIVE\n  Tested margin for declared loads                    May support selected loads          May limit external traffic\n  No outage-prevention guarantee                      after validated transfer             under a tested profile',
    'BGP contingency diagram guarantees')

contention_start = bgp.index('2.2 Mathematical Model of Contention Arbitration')
part3_start = bgp.index('Part III — Intelligent Routing & the Border Gateway Protocol (IO-BGP)', contention_start)
bgp = bgp[:contention_start] + '''2.2 Proposed Mathematical Model of Contention Arbitration
Let R_shared represent the measured capacity of a shared physical line (for example, megawatts on an electrical conduit or gigabits per second on a fiber link), using a validated unit and time basis.
Harshal’s System demand: D_H(t)
External entity demand: D_X(t)
For a declared operating profile, the design target is D_H(t) ≤ 0.60 × R_shared. If measured aggregate demand would exceed R_shared, the proposed allocation target is:
R_X(t) = min(D_X(t), max(0, R_shared − D_H(t)))
This equation specifies a target allocation, not proof that a gateway can measure, enforce, or guarantee it. If measurements or a physical-interface event meet a predeclared threshold, a candidate implementation may request a restricted or isolated state only under a separately authorized and equipment-validated profile. No automatic transition, physical severance, or service-continuity result is claimed.
''' + bgp[part3_start:]

part3_start = bgp.index('Part III — Intelligent Routing & the Border Gateway Protocol (IO-BGP)')
part4_start = bgp.index('Part IV — Threat Mitigation: Deflecting Encroachment', part3_start)
bgp = bgp[:part3_start] + '''Part III — Proposed Intelligent Routing & Border Gateway Protocol (IO-BGP)
3.1 Candidate Demarcation Mechanisms
A deployment may evaluate the following options; selection and performance depend on the equipment, threat model, engineering review, and test evidence:
Optical/network: Wavelength Division Multiplexing (WDM) or dedicated virtual circuits (VLAN/SRv6) may be evaluated. Queue bounds require a specified link, scheduler, traffic model, and implementation test; no generic queuing guarantee is made.
Electrical/power: Double-bus arrangements and vacuum interrupters are possible engineering options. Relay coordination, selectivity, trip curves, transfer timing, and safe-isolation limits must be validated on the specific installation; this manuscript makes no generic sub-cycle or <16 ms performance claim.
Geographical/physical: Proposed boundary objective is to require bidirectional authentication/encapsulation for cross-border transit and test that peer permissions do not expose internal network traversal.
3.2 Proposed Transit-Contract Objectives
A candidate deployment would define an explicit, reviewed Transit Contract before cross-orb data movement. The following are design objectives, not verified properties:
Payload encryption: Protect payload confidentiality in transit; key management, endpoint behavior, and metadata exposure require validation.
Metadata minimization: Strip internal OCM directional addresses (0•DDD•RRR•####) and replace them with ephemeral border handles at the egress port where supported; test implementation and side channels. No zero-leakage claim is made.
Non-retention: Minimize external-message retention and prevent retained data from becoming authority. Logging, volatile memory, caches, and forensic persistence require configuration review and testing; strict statelessness is not established.
HARSHAL INTERNAL                       DEMARCATION LINE                      EXTERNAL NETWORK
[ 0•045•001•0180 ] ──► [ Egress NAT ] ──► [ IO-BGP GATEWAY ] ──► [ Ingress NAT ] ──► [ 0'•... ]
(Address-hiding goal)   (Proposed scrubbing)  (Proposed limits)    (External handle)
''' + bgp[part4_start:]

part4_start = bgp.index('Part IV — Threat Mitigation: Deflecting Encroachment')
part5_start = bgp.index('Part V — Protocol Wire Specification (RFC-BGP-ORB-03)', part4_start)
bgp = bgp[:part4_start] + '''Part IV — Proposed Threat-Mitigation Objectives
4.1 Threat Scenarios and Profile-Gated Response Proposals
The vectors below are threat-model assumptions used to test a future gateway; they do not assert that an incident has occurred. The responses are policy objectives, not guaranteed or automatically operating functions. Any throttling, load shedding, relay action, or islanding requires explicit authorization in a deployment/contingency profile, equipment-specific safety validation, and test evidence. Physical timing and service outcomes are installation-specific; no automatic, instantaneous, or guaranteed behavior is claimed. A trigger alone does not establish attacker identity.
| Threat scenario/vector | Observable trigger | Proposed action / policy objective (profile-gated) | Limit and evidence requirement |
|---|---|---|---|
| Peer/origin impersonation or replay | Invalid signature, duplicate nonce, stale lease, or peer identity inconsistent with the negotiated contract. | A tested policy would refuse the frame and new peering, and preserve a signed transcript only where retention is authorized; quarantine is a local software state, not physical isolation. | Authentication proves possession of a key, not legal authority or benign intent; test replay, key rotation, false positives, and the resulting policy state. |
| Reserve pressure / capacity encroachment | Independently measured active load would exceed 0.60×C_rated or headroom would fall below 0.40×C_rated. | Proposed policy would stop admitting new external commitments and may request profile-authorized throttling; load shedding is limited to separately pre-authorized discretionary loads. Islanding may be requested only under an approved, tested contingency profile. | Reserve does not guarantee protection from outages. Validate sensors, trip timing, load priorities, and restoration on the target system. |
| Internal-address disclosure or lateral overreach | External request names an internal OCM address, unauthorized route, or state-changing operation. | Proposed policy would refuse the route and use an ephemeral border handle where implemented; logging and address minimization must follow the approved privacy/retention profile. | Metadata scrubbing and route isolation require packet-level and side-channel tests. |
| Telemetry loss or contradictory measurements | Missing, stale, or disagreeing capacity/identity/lease telemetry. | Proposed fail-closed objective is to refuse new peering/allocations; retain only independently pre-authorized safe functions; request interface isolation only if separately authorized and validated. | Loss of telemetry is uncertainty, not proof of attack. A refusal request does not prove hardware isolation or safety. |
| Gateway integrity/configuration failure | Invalid boot measurement, unauthorized configuration change, failed attestation, or inconsistent policy hash. | Proposed policy would restrict the affected capability; failover is considered only if a separate configuration is authorized and tested, otherwise remain in a declared restricted state. | A fallback must be independently tested; do not assume a backup is safe merely because it exists. |
| Physical line interference or abnormal impedance | Protective-relay measurements exceed predeclared, equipment-specific thresholds. | A validated protection profile may request opening the relevant border relay; report isolation only after equipment-specific feedback confirms it. | Thresholds and trip times are installation-specific; no generic latency claim is made. |
| Availability/volume pressure | Request rate or queue depth exceeds the declared peering budget. | A pre-authorized policy may request rate limiting and prioritize declared essential functions; measured response must be recorded. | Availability cannot be guaranteed under unbounded denial of service; publish only tested service limits. |

''' + bgp[part5_start:]

bgp = rep1(
    bgp,
    '|                     RESERVE_HEADROOM_PPM (Min: 400,000)       |',
    '|                     RESERVE_HEADROOM_PPM (proposed routine target: 400,000) |',
    'BGP reserve wire field')
bgp = rep1(
    bgp,
    'PEER_STATUS:\n0x01: NOMINAL_PEERING (Symmetric fair-share)\n0x02: CONTENTION_THROTTLED (Load shedding active)\n0x03: ISLANDED_CAUTERIZATION (Interface severed)\nRESERVE_HEADROOM_PPM: Remaining unallocated headroom as parts per million of C_rated. Normal operation requires at least 400,000 PPM; routine active allocation cannot exceed 600,000 PPM. A reported value is telemetry, not proof until checked against an independently calibrated rated-capacity source.\nCONTRACT_LEASE_SECONDS: Ephemeral lifetime of peering session (default: 300  s; requires unbroken mutual renewal).',
    'PEER_STATUS (reported protocol state; not proof of physical actuation):\n0x01: NOMINAL_PEERING (Declared peer contract; implementation-specific checks apply)\n0x02: THROTTLE_REQUESTED (policy request; actual load change needs independent feedback)\n0x03: ISOLATION_REQUESTED (no physical disconnection implied)\n0x04: ISOLATED_VERIFIED (only after equipment-specific feedback confirms isolation)\nRESERVE_HEADROOM_PPM: Remaining unallocated headroom as parts per million of the declared C_rated baseline. The proposed normal-operation target is at least 400,000 PPM and no more than 600,000 PPM routine active allocation. Telemetry is not proof until checked against an independently calibrated capacity source.\nCONTRACT_LEASE_SECONDS: Proposed session-lifetime field; a deployment profile must set and validate the lease behavior. Lease expiry changes protocol eligibility only; it does not guarantee physical isolation.',
    'BGP peer status and reserve wire evidence')
bgp = rep1(
    bgp,
    'Part VI — BARE-METAL Hardware Demarcation Routine\n6.1 Low-Level Driver & Circuit Breaker Logic (C / Embedded Systems)\n/* Low-Level Inter-Orb Border Circuit Controller */\nvoid evaluate_inter_orb_bus(shared_bus_t *bus) {\n    uint32_t current_load = read_hardware_bus_load(bus->id);\n    uint32_t total_capacity = bus->rated_capacity;\n\n    // Calculate unallocated headroom\n    float headroom = 1.0f - ((float)current_load / (float)total_capacity);\n\n    // Invariant Check: 40% Redundancy Reserve must not be violated\n    if (headroom < 0.40f) {\n        // Step 1: Throttle external peering port immediately\n        hardware_nic_rate_limit(bus->external_port, RATE_LIMIT_SEVEREST);\n\n        // Illustrative timing only; the device-specific re-read/trip interval must be validated.\n        usleep(5000);\n        headroom = 1.0f - ((float)read_hardware_bus_load(bus->id) / (float)total_capacity);\n\n        // Step 3: If headroom remains breached, execute mechanical trip\n        if (headroom < 0.40f) {\n            trigger_vacuum_breaker_trip(bus->physical_breaker_pin);\n            bus->state = BUS_STATE_ISLANDED;\n\n            // Step 4: Engage local battery / auxiliary generation\n            engage_redundancy_aux_rail(bus->aux_rail_id);\n\n            // Step 5: Seal internal routing tables\n            cwo_log_security_event("INTER_ORB_ENCROACHMENT_CAUTERIZED");\n        }\n    }\n}\nPart VII — Conformance & Audit Checklist',
    '''Part VI — Proposed Hardware-Demarcation Routine (Pseudocode)
6.1 Illustrative C-like logic (not a driver or executable implementation)
The sketch expresses a desired decision sequence only. It requires an explicitly authorized deployment profile, calibrated sensors, equipment-specific safety review, tested response timing, and feedback confirming each claimed state. It is not evidence that any action occurs or that service is preserved.
/* Proposed pseudocode. Requests below do not imply completed actuation. */
response_t propose_inter_orb_response(shared_bus_t *bus) {
    if (!deployment_authorized(bus) ||
        !validated_profile_loaded(bus) ||
        !capacity_sensor_calibrated(bus) ||
        !measurements_fresh_and_consistent(bus) ||
        bus->rated_capacity == 0) {
        return RESPONSE_RESTRICTED;
    }

    uint32_t current_load = read_profiled_bus_measurement(bus->id);
    uint32_t total_capacity = bus->rated_capacity;
    float headroom = 1.0f - ((float)current_load / (float)total_capacity);

    // Proposed normal-operation target: retain at least 40% of rated capacity.
    if (headroom < 0.40f) {
        if (!profile_authorizes_rate_limiting(bus)) return RESPONSE_RESTRICTED;
        request_external_rate_limit(bus->external_port, bus->profiled_limit);
        if (!rate_limit_feedback_confirmed(bus)) return RESPONSE_RESTRICTED;

        // Interval and remeasurement schedule come from the validated device profile;
        // no generic 5 ms delay, trip time, or latency guarantee is specified here.
        wait_for_profiled_measurement_interval(bus);
        headroom = measure_headroom_against_verified_rating(bus);

        if (headroom < 0.40f) {
            if (!profile_authorizes_isolation(bus) ||
                !protection_coordination_is_validated(bus)) {
                return RESPONSE_RESTRICTED;
            }
            request_profiled_isolation(bus->physical_breaker_pin);
            if (!independent_isolation_feedback_confirmed(bus)) {
                bus->state = BUS_STATE_RESTRICTED_UNCONFIRMED;
                return RESPONSE_RESTRICTED;
            }
            bus->state = BUS_STATE_ISOLATED_CONFIRMED;

            if (profile_authorizes_auxiliary_supply(bus) &&
                auxiliary_source_is_tested(bus)) {
                request_profiled_auxiliary_supply(bus->aux_rail_id);
                if (!auxiliary_feedback_confirmed(bus)) return RESPONSE_RESTRICTED;
            }
            log_security_event_for_review("BGP_CONTINGENCY_STATE_CONFIRMED");
        }
    }
    return RESPONSE_POLICY_TARGET_MET;
}
Part VII — Proposed Conformance & Evidence Checklist''',
    'BGP hardware routine proposal')
bgp = rep1(
    bgp,
    'Any system deploying BGP-v1.0 must pass 100% of the following audit gates:\nThese are design requirements for a future conformance suite, not a safety certification.\n| ID | Test | Pass criterion |\n|---|---|---|\n| BGP-01 | Rated-capacity denominator | Rated/nameplate capacity C_rated and units are independently identified; missing or inconsistent ratings block new commitments. |\n| BGP-02 | Active ceiling | Under every normal load profile, C_active ≤ 0.60×C_rated. “100% active allocation” is defined as 0.60×C_rated, not full rated capacity. |\n| BGP-03 | Reserve floor | At least 0.40×C_rated remains unallocated from routine commitments; any emergency draw is logged and blocks new routine allocation until restoration. |\n| BGP-04 | Peer authentication and lease | Signatures, session binding, nonces, peer identity, and lease expiry are verified; replay, stale-key, and duplicate-frame tests fail closed. |\n| BGP-05 | Boundary isolation | External traffic cannot route to internal OCM addresses or unauthorized state-changing endpoints; metadata scrubbing is independently tested. |\n| BGP-06 | Threat scenarios | Each §4.1 trigger has a negative/positive test, a defined safe response, and a record of false-positive/false-negative behavior. |\n| BGP-07 | Telemetry failure | Lost, stale, or conflicting measurements stop new peering and do not silently default to a safe capacity value. |\n| BGP-08 | Contention and islanding | Hardware-in-loop testing validates rate limits, relay behavior, auxiliary transition, and critical-service safety at stated equipment-specific thresholds. |\n| BGP-09 | Reserve restoration | After a contingency draw, the system remains restricted until measured headroom returns to the required 40% rated reserve. |\n| BGP-10 | Evidence/claims | Any published latency, availability, or resilience claim is tied to a specified test configuration and results; no universal guarantee is inferred. |',
    'A future deployment claiming BGP-v1.0 conformance would need to address the following tests. Passing these prospective checks would not itself constitute safety certification or prove uninterrupted service.\n| ID | Proposed test | Evidence-oriented pass criterion |\n|---|---|---|\n| BGP-01 | Rated-capacity denominator | Independent records identify the rated/nameplate or explicitly declared nominal baseline, units, operating conditions, and measurement interval; the candidate policy\'s response to missing/inconsistent ratings is tested. |\n| BGP-02 | Active ceiling | Tested profiles demonstrate the proposed normal-operation target C_active ≤ 0.60×C_rated. “100% active allocation” means 60% of rated capacity, not full rated capacity. |\n| BGP-03 | Reserve floor | At least 0.40×C_rated is held outside routine commitments in the tested profile; any separately authorized contingency draw is logged, and the restricted-state/restoration policy is tested. |\n| BGP-04 | Peer authentication and lease | Signatures, session binding, nonces, peer identity, and lease rules are tested against replay, stale-key, and duplicate-frame cases; lease expiry is not treated as proof of physical isolation. |\n| BGP-05 | Boundary isolation | Packet-level tests examine internal OCM addresses and unauthorized endpoints; metadata scrubbing and side-channel limits are documented rather than assumed. |\n| BGP-06 | Threat scenarios | Each §4.1 trigger has positive/negative tests, a documented profile-gated response objective, and false-positive/false-negative results. |\n| BGP-07 | Telemetry failure | Tests show how the candidate policy handles lost, stale, or conflicting measurements without silently substituting an assumed safe capacity value; physical action is separately verified. |\n| BGP-08 | Contention and islanding | Hardware-in-loop tests validate only the named equipment\'s rate limits, relay behavior, auxiliary transition, and critical-service profile at measured thresholds/timings. |\n| BGP-09 | Reserve restoration | After a contingency draw, the proposed policy blocks routine allocations until measured headroom is restored to the declared 40% rated/nominal baseline. |\n| BGP-10 | Evidence/claims | Each latency, availability, or resilience claim cites its test configuration, authorization, measured results, and limitations; no universal guarantee is inferred. |',
    'BGP future conformance evidence checklist')
bgp = rep1(
    bgp,
    'The proposed Inter-Orb Demarcation & Border Gateway Protocol (BGP-v1.0) models one possible way that independent, non-aligned spheres might share physical hardware, electrical lines, frequency spectrum, and geographical territory. Its assumptions and feasibility require system-specific engineering.',
    'The proposed Inter-Orb Demarcation & Border Gateway Protocol (BGP-v1.0) sketches one possible way that independent, non-aligned spheres might coordinate shared physical hardware, electrical lines, frequency spectrum, and geographical territory. Its feasibility and any protective effect require system-specific engineering, explicit deployment authorization, equipment validation, and measured evidence.',
    'BGP proposal executive summary')

middle = middle[:bgp_start] + bgp + middle[bgp_end:]

final_text = prefix + locked_xx + middle + locked_fiction + suffix
OUT.write_text(final_text, encoding='utf-8')

# Verification: protected regions must be text-identical.
written = OUT.read_text(encoding='utf-8')
out_xx_start_match = re.search(r'(?m)^' + re.escape(xx_start_marker) + r'$', written)
out_xx_end_match = re.search(r'(?m)^' + re.escape(xx_end_marker) + r'$', written[out_xx_start_match.end():])
assert out_xx_start_match and out_xx_end_match
out_xx_end = out_xx_start_match.end() + out_xx_end_match.start()
out_locked_xx = written[out_xx_start_match.start():out_xx_end]
assert out_locked_xx == locked_xx, 'Protected Part XX differs from source'
assert locked_fiction in written
assert written.count(fiction_start_marker) == 1

# Exact word-count method used for the companion revision note and final report.
word_re = re.compile(r"(?u)\b[\w]+(?:['’‐‑‒–—-][\w]+)*\b")
word_count = len(word_re.findall(written))

print('OUTPUT', OUT)
print('source_bytes', len(raw.encode('utf-8')), 'output_bytes', len(written.encode('utf-8')))
print('part_xx_sha256', hashlib.sha256(locked_xx.encode('utf-8')).hexdigest())
print('fiction_sha256', hashlib.sha256(locked_fiction.encode('utf-8')).hexdigest())
print('word_count', word_count)
print('lines_after_separator_normalization', written.count('\n') + 1)
print('U+2028 preserved in Part XX', locked_xx.count('\u2028'))
print('U+2028 preserved in Part XXIV fiction', locked_fiction.count('\u2028'))
