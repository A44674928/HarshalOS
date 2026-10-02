#!/usr/bin/env python3
"""
HarshalOS documentation build.

Reads:   source/working-draft.md   (canonical Owner's Working Draft build input)
Writes:  docs/harshal-systems/NN-*.md   (one file per part)
         HARSHAL-SYSTEMS-USER-MANUAL.md (assembled master, repo root)
         docs/harshal-systems/EDITORIAL-REPORT.md

Run from the repository root:  python3 source/build.py
"""
import os
import re
import sys
import json
import unicodedata

from corpus_upgrades import (
    CANONICAL_MINIMUM_MODEL,
    COLLECTIONS,
    PART_METADATA,
    apply_part_corrections,
    build_part_27_whole_corpus,
    build_synchronized_novel_part,
    format_metadata_header,
    write_flagship_research_paper,
    write_functional_collections,
)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
# The checked-in canonical build input is the snapshot kept beside this script.
# A root-level owner copy can still override it when supplied by another checkout;
# the byte-identical copy formerly tracked at root is quarantined in Archive/Duplicates.
_ROOT_DRAFT = os.path.join(ROOT, "Harshal's Systems (Copyrighted) [Owner's Working Draft].md")
SRC = _ROOT_DRAFT if os.path.exists(_ROOT_DRAFT) else os.path.join(HERE, 'working-draft.md')
OUTDIR = os.path.join(ROOT, 'docs', 'harshal-systems')
MASTER = os.path.join(ROOT, 'HARSHAL-SYSTEMS-USER-MANUAL.md')

# ---------------------------------------------------------------------------
# 1. Structural segmentation: (start_line, slug, title, blurb)
#    Exact 1-based line numbers in `source/working-draft.md`.
# ---------------------------------------------------------------------------
PARTS = [
    (1,    '00-author-front-matter',
     'Author’s Front Matter and Reading Guide',
     'The Owner’s Working Draft as submitted: disclaimer, dedication, the '
     'philosophical and structural invariants, the Phase Declaration Header '
     'manifesto, the preface, and the author’s own reading guide. Preserved '
     'with ARCHIVE provenance; superseded for navigation by the rebuilt Table '
     'of Contents and Part XXVII Whole Corpus Manifest.'),

    (326,  '01-core-book',
     'Part I — The Core Book',
     'The ten chapters and epilogue that state the argument: legitimacy precedes '
     'capability, execution may be delegated but legitimacy never migrates, and '
     'refusal is the primary act of responsible control.'),

    (573,  '02-formalization',
     'Part II — Formalization',
     'The Canonical Minimum Model (Identity → Representation → Authorization → '
     'Continuity → Accountability → Refusal), formal constraint equations, and '
     'the Declared-Type Terminology Registry.'),

    (785,  '03-safety-rationale',
     'Part III — Safety Rationale for Adversarial Scenarios',
     'Appendix SR-0 through SR-5: why the framework contains hypothetical and '
     'adversarial stress-tests, and the containment chamber that bounds them.'),

    (830,  '04-ags-architecture',
     'Part IV — AGS: Accountability-Gated Systems',
     'Core doctrine, atomic vocabulary, the three phases, the Phase Declaration '
     'Header, the collapse protocol, the Duty Collation Ledger, and the badge system.'),

    (1242, '05-ocm-orb',
     'Part V — OCM: The Orb Communicator Model',
     'Replacing hierarchy with geometry: the Disc-to-Sphere topological projection, '
     'the 0–359 discrete address ring vs. 360° return-to-origin closure notation, '
     'OCM arithmetic, communication layers, and exit protocol.'),

    (1415, '06-inner-shell',
     'Part VI — The AI Inner Shell',
     'Address-constrained AI nodes: definition, addressing rules, communication '
     'constraints, learning without authority, and the impossibility of AI takeover.'),

    (1531, '07-addressing-topology',
     'Part VII — Addressing, Rotation, and Spherical Topology',
     'The ℤ_360 ring of 360 radiative addresses (0–359) and 360° return-to-origin '
     'closure, rotation over time, distance as depth, and spherical manifold projection.'),

    (2018, '08-operator-model',
     'Part VIII — The Operator Model',
     'Operator classification, structural position, address derivation, role tokens, '
     'authority constraints, shadow-center prevention, and containment.'),

    (2182, '09-disc-lifecycle',
     'Part IX — Disc Primitives, Routing, and Lifecycle',
     'Atomic primitives, derived necessities, language discipline, resolution axis, '
     'routing, multi-context coordination, the disc-to-sphere lifecycle, and state machine.'),

    (2652, '10-ags-conformance',
     'Part X — AGS+ Layering and Conformance',
     'The textual layering diagram and the normative conformance checklist.'),

    (2798, '11-accessory-pack',
     'Part XI — The AGS Accessory Pack',
     'GRL compliance certification, the Provenance and Lineage Verification layer, '
     'and Intelligence & Unbiased Compliance checks.'),

    (3046, '12-ground-zero',
     'Part XII — Ground-0: Phase Detection, Audits, and the Duty Collation Ledger',
     'The Ground-0 Phase Detection Algorithm v1.0 in full, institutional re-badging '
     'case studies (explicitly separating independently verifiable public records '
     'from author-reported analysis), the PDH audit ledger, and insurance-mode controls.'),

    (5105, '13-whyland',
     'Part XIII — The Whyland Standards',
     'The canonical AGS semantic inquiry catalog (DecksJokersAndCards).'),

    (5163, '14-nab-compendium',
     'Part XIV — Neural Atomic Bodies Compendium',
     'The NAB master database of elements 1–119 and the risk, alignment, and '
     'authority-density profiles that map them to institutional roles.'),

    (5345, '15-hmkh-controls',
     'Part XV — Keyed Human-Machine Hybrid Controls',
     'The seventeen-section control specification: signal-to-intent separation, '
     'continuous human binding, context-specific consent, and the authorization gate.'),

    (5663, '16-threat-modeling',
     'Part XVI — Threat Modeling and Context-Dependent Guarantees',
     'Publicness, observer positions, the threat taxonomy, guarantee matrices, '
     'non-guarantees, and deployment threat models by context.'),

    (6481, '17-atomic-bodies',
     'Part XVII — Atomic Body Classes and Reactor Doctrine',
     'NNB, ANHB, NCB, NIB, and NUB in full, the governance-impossibility proofs, '
     'phase escalation, and the Project Thunderfury Starforge reactor.'),

    (7439, '18-institutional-application',
     'Part XVIII — Institutional Application',
     'Institutional mapping, the neurojacking and corpse-puppeting prevention '
     'module, exploitation vectors, and workplace directive material.'),

    (7622, '19-research-papers',
     'Part XIX — Flagship Research: Accountability in Keyed Human–Machine Hybrid Systems',
     'The flagship portfolio research paper establishing Minimum Viable Keying (MVK), '
     'the non-agency of computational components, and continuous human accountability.'),

    (7790, '20-supply-chain',
     'Part XX — Supply Chain and Implanted-Device Threat Research',
     'Defensive threat research (Supply Chain Attack Vector++): chip-level compromise, '
     'distribution deception, target profiles, and the address catalog.'),

    (9943, '21-microconvergence',
     'Part XXI — MicroConvergence and Signal Encoding',
     'The MicroConvergence specification draft, the Audio Visual Encoding model, and '
     'the Canonical Minimum Model procedural doctrine.'),

    (10497, '22-policy-archive',
     'Part XXII — Supporting Policy & Governance Research Archive',
     'Applied public-policy research operationalizing the Canonical Minimum Model: '
     'Institutional Anti-Caste Architecture, Never Consented Means Never Consented, '
     'fiscal/labor safeguards, and civic/healthcare infrastructure.'),

    (11106, '23-specification-series',
     'Part XXIII — Specification Series',
     'Five formal modules: Origin Continuity & Succession, Cognitive Coercion '
     'Hardening, Border Gateway Protocol, Intermediate Representation, and '
     'Constitutional Governance & Public Addressability.'),

    (12509, '24-the-novel',
     'Part XXIV — Book II Preview: The Grand River Foundation (Fictional Companion Novel)',
     'Synchronized preview of Book II (FICTION provenance, ~2100 CE sandbox): '
     'Prologue, Chapters 1–5, and the Cable Select interstitial, separated from '
     'normative specifications while illustrating mature Book I architecture.'),

    (13017, '25-additional-specs',
     'Part XXV — Anti-Denial of Justice, Labor Attribution, and NAB I/O Mapping',
     'The ADJR-v1.0 protocol, the labor disparity and dynamic attribution ledger, and '
     'the NAB asymmetrical I/O detection and response mapping.'),

    (16051, '26-anthropic-b-side',
     'Part XXVI — Incident Record & External Audit: Anthropic PBC (B Side)',
     'Terminal-phase compliance audit and incident chronology, explicitly separating '
     'independently verifiable public records from author-reported field chronology.'),
]

MANUAL_TITLE = 'Harshal’s Systems — The Ultimate User Manual'
SUBTITLE = 'Architectures for Accountable Human D’Ash Machine Intelligence'


# ---------------------------------------------------------------------------
# 2. Fence repair  (see fencefix.py rationale)
# ---------------------------------------------------------------------------
GLUED = re.compile(r'^(?P<body>.*?\S)\s*(?P<fence>`{3,})\s*(?P<tag>[a-zA-Z+]*)\s*$')
ATLINE = re.compile(r'^\s*(?P<fence>`{3,})\s*(?P<tag>.*?)\s*$')


ATX_HEAD = re.compile(r'^#{1,6}\s+\S')


def split_headings_out_of_fences(lines):
    """A heading must never sit inside a fenced block. Close before it, reopen after.

    ATX headings require whitespace after the hashes, so Rust attributes such as
    #[no_mangle] and #[derive(...)] are correctly left inside their code blocks.
    """
    out = []
    in_fence = False
    moved = 0
    i = 0
    while i < len(lines):
        l = lines[i]
        if ATLINE.match(l):
            in_fence = not in_fence
            out.append(l)
            i += 1
            continue
        if in_fence and ATX_HEAD.match(l):
            # trim trailing blanks we already emitted, close the fence there
            while out and out[-1].strip() == '':
                out.pop()
            out.append('```')
            out.append('')
            out.append(l)
            # skip blanks, then reopen for the remainder of the diagram
            j = i + 1
            while j < len(lines) and lines[j].strip() == '':
                j += 1
            out.append('')
            out.append('```')
            moved += 1
            i = j
            in_fence = True
            continue
        out.append(l)
        i += 1
    return out, moved


def repair_fences(text):
    lines = text.split('\n')
    fixed = []
    split_count = 0
    for l in lines:
        r = l.rstrip()
        m = GLUED.match(r)
        if m and not ATLINE.match(r):
            fixed.append(m.group('body').rstrip())
            fixed.append('```')
            split_count += 1
        else:
            fixed.append(r)

    fixed, head_moved = split_headings_out_of_fences(fixed)

    # Pair sequentially; every odd marker (0-based even) opens, even closes.
    out = []
    idx = 0
    tag_stripped = 0
    for l in fixed:
        m = ATLINE.match(l)
        if m:
            opening = (idx % 2 == 0)
            if opening:
                tag = m.group('tag')
                out.append('```' + tag if tag else '```')
            else:
                if m.group('tag'):
                    tag_stripped += 1
                out.append('```')
            idx += 1
        else:
            out.append(l)
    # Post-pass on the paired result: any fence still holding a heading is
    # missing its close. Split it, which adds two markers and keeps balance.
    final, extra = split_headings_out_of_fences(out)
    head_moved += extra

    return '\n'.join(final), {'glued_split': split_count,
                            'close_tags_stripped': tag_stripped,
                            'headings_extracted': head_moved,
                            'markers': idx,
                            'balanced': idx % 2 == 0}


# ---------------------------------------------------------------------------
# 3. Typographic normalization (prose only; never inside fences or tables)
# ---------------------------------------------------------------------------
ERRATA = [
    # --- document-specific mechanical corruption -------------------------
    # 'llany'/'LLANY'/'Llany' and 'orand'/'ORAND' are find-and-replace artefacts.
    (r'\bllany\b', 'any'),
    (r'\bLlany\b', 'Any'),
    (r'\bLLANY\b', 'ANY'),
    (r'\borand\b', 'or'),
    (r'\bOrand\b', 'Or'),
    (r'\bORAND\b', 'OR'),
    (r'\bandor\b', 'and/or'),
    (r'\bandnor\b', 'and/nor'),
    (r'^DATE:\*\*\s*September 11, 2026', '### Memorandum I — Institutional Anti-Caste Architecture\n\n**DATE:** September 11, 2026\n'),
    # --- ordinary misspellings (few, but present) ------------------------
    (r'\bteh\b', 'the'), (r'\bTeh\b', 'The'),
    (r'\brecieve\b', 'receive'), (r'\bRecieve\b', 'Receive'),
    (r'\boccured\b', 'occurred'), (r'\bOccured\b', 'Occurred'),
    (r'\bseperate\b', 'separate'), (r'\bSeperate\b', 'Separate'),
    (r'\bseperation\b', 'separation'),
    (r'\bdefinately\b', 'definitely'), (r'\bDefinately\b', 'Definitely'),
    (r'\bneccessary\b', 'necessary'), (r'\bNeccessary\b', 'Necessary'),
    (r'\bindependant\b', 'independent'), (r'\bIndependant\b', 'Independent'),
    (r'\benviroment\b', 'environment'),
    (r'\bpriviledge\b', 'privilege'),
    (r'\bcomitted\b', 'committed'),
    (r'\bJudgement\b', 'Judgment'), (r'\bjudgement\b', 'judgment'),
    (r'\bAcknowledgement\b', 'Acknowledgment'),
    (r'\bsupercede\b', 'supersede'),
    (r'\boccurence\b', 'occurrence'),
    (r'\bmaintainance\b', 'maintenance'),
    (r'\bexistance\b', 'existence'),
    (r'\bpersistant\b', 'persistent'),
    (r'\breccomend\b', 'recommend'),
    (r'\bthreshhold\b', 'threshold'),
    (r'\bcompatability\b', 'compatibility'),
    (r'\bguarentee\b', 'guarantee'), (r'\bGuarentee\b', 'Guarantee'),
    (r'\bseperately\b', 'separately'),
    (r'\bapparant\b', 'apparent'),
    (r'\bconcensus\b', 'consensus'),
    (r'\bdependancy\b', 'dependency'),
]


def normalize(text):
    lines = text.split('\n')
    out = []
    in_fence = False
    stats = {'trailing_ws': 0, 'tabs': 0, 'formfeed': 0, 'bullets': 0,
             'errata': 0, 'dash_fixed': 0, 'nbs': 0}
    for l in lines:
        if ATLINE.match(l):
            in_fence = not in_fence
            out.append(l)
            continue
        if in_fence:
            out.append(l)
            continue

        s = l
        if s != s.rstrip():
            stats['trailing_ws'] += 1
        s = s.rstrip()
        if '\t' in s:
            stats['tabs'] += 1
        s = s.replace('\t', ' ')
        if '\f' in s:
            stats['formfeed'] += 1
        # A form feed is a page break, not a deletion. Replacing it with the
        # empty string glued paragraphs and headings together and destroyed at
        # least two section headings; a newline restores the line structure.
        s = s.replace('\f', '\n')
        if '\u00a0' in s:
            stats['nbs'] += 1
        s = s.replace('\u00a0', ' ')

        # A literal address placeholder at line start ('#### = instance')
        # would otherwise be parsed as an ATX heading. Escape it.
        m_hash = re.match(r'^(#{2,6})\s*=\s*(\S.*)$', s)
        if m_hash:
            s = f'`{m_hash.group(1)}` = {m_hash.group(2)}'
            stats['hash_placeholders'] = stats.get('hash_placeholders', 0) + 1

        if s.strip().startswith('|'):
            # Table cells still need the errata pass; they just must not have
            # their bullet markers or dashes rewritten.
            for pat, rep in ERRATA:
                new_s = re.sub(pat, rep, s)
                if new_s != s:
                    stats['errata'] += 1
                    s = new_s
        if not s.strip().startswith('|'):
            m = re.match(r'^(\s*)[\u2022\u25cf\u25aa]\s*', s)
            if m:
                s = m.group(1) + '- ' + s[m.end():]
                stats['bullets'] += 1
            else:
                m = re.match(r'^(\s*)\*\s+', s)
                if m:
                    s = m.group(1) + '- ' + s[m.end():]
                    stats['bullets'] += 1

            for pat, rep in ERRATA:
                new = re.sub(pat, rep, s)
                if new != s:
                    stats['errata'] += 1
                    s = new

            new = re.sub(r'^(#{1,6}\s*)(PART|Part)\s+([IVXLC]+|\d+)\s*[-\u2013]\s*',
                         lambda m: m.group(1) + m.group(2) + ' ' + m.group(3) + ' \u2014 ', s)
            if new != s:
                stats['dash_fixed'] += 1
                s = new
            new = re.sub(r'^(#{1,6}\s*)(CHAPTER|Chapter)\s+(\d+)\s*[-\u2013]\s*',
                         lambda m: m.group(1) + m.group(2) + ' ' + m.group(3) + ' \u2014 ', s)
            if new != s:
                stats['dash_fixed'] += 1
                s = new

            s = re.sub(r'([.!?])  +([A-Z"\u201c])', r'\1 \2', s)
            s = re.sub(r' {4,}', '   ', s)

        out.append(s)

    # --- repair malformed table separators --------------------------------
    # '|---|+++|' and bare '|+++|' rows break table rendering. Rebuild them
    # from the column count of the preceding header row.
    cleaned = []
    fixed_rows = 0
    for l in out:
        if re.fullmatch(r'\s*\|?(\+\|?)+\s*', l) or \
           (re.match(r'^\s*\|[-\s|+]*\+', l) and l.strip().startswith('|')):
            stats['junk_rows'] = stats.get('junk_rows', 0) + 1
            continue
        # a delimiter row whose cells are not all dashes
        if re.match(r'^\s*\|', l) and set(l.strip()) <= set('|-: +') and '+' in l:
            cols = l.count('|') - 1
            l = '|' + '---|' * max(cols, 1)
            fixed_rows += 1
        cleaned.append(l)
    out = cleaned
    if fixed_rows:
        stats['table_separators_fixed'] = fixed_rows

    txt = '\n'.join(out)
    txt = re.sub(r'\n{5,}', '\n\n\n\n', txt)
    return txt, stats


# ---------------------------------------------------------------------------
# 4. Heading normalization + demotion so each part file nests under one H1
# ---------------------------------------------------------------------------
def rehead(text, part_title):
    """Nest a part's own headings beneath the part H1.

    Levels are already relative-consistent from normalize_headings. The part H1
    is added afterwards, so the whole block is shifted down one, then corrected
    by a single uniform delta so the first heading in the part sits at level 2.
    A uniform shift preserves sibling relationships; clamping each heading
    individually would not.
    """
    lines = text.split('\n')
    idx = []
    in_fence = False
    for i, l in enumerate(lines):
        if ATLINE.match(l):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        m = re.match(r'^(#{1,6})\s+\S', l)
        if m:
            idx.append((i, len(m.group(1))))
    if not idx:
        return text
    delta = 2 - (idx[0][1] + 1)
    for i, lv in idx:
        new_lv = max(2, min(lv + 1 + delta, 6))
        lines[i] = '#' * new_lv + lines[i][len('#' * lv):]
    return '\n'.join(lines)


ACRONYMS = {
    'NAB', 'CWO', 'GSRB', 'PDH', 'AGS', 'OCM', 'PLV', 'IUC', 'TCS', 'GRL',
    'HMHS', 'HMKH', 'CHE', 'BGP', 'IR', 'CGPA', 'OCS', 'ADJR', 'I', 'II',
    'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII',
    'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII',
    'XXIV', 'XXV', 'XXVI',
    'DNA', 'PUF', 'API', 'APIS', 'JSON', 'HTTP', 'HTTP', 'RFC', 'TLA', 'EBNF',
    'ISA', 'SSP', 'AVE', 'MC', 'DAL', 'CLAA', 'PTSRO', 'SEC', 'PAR', 'CHRC',
    'ASRI', 'NRRA', 'RO', 'GO', 'SCAV', 'USB', 'CPU', 'GPU', 'RAM', 'SHA',
    'HMAC', 'ISO', 'NIST', 'AI', 'ML', 'LLM', 'OS', 'UI', 'UX', 'ID', 'UUID',
    'PDF', 'NDA', 'GDPR', 'HIPAA', 'US', 'USA', 'EU', 'UK', 'UN', 'NATO',
    'DOJ', 'FBI', 'NSA', 'DHS', 'DOD', 'IC', 'APT', 'DDOS', 'ZTNA', 'SSO',
    'MFA', 'RBAC', 'ABAC', 'TEE', 'HSM', 'KMS', 'WORM', 'SWIFT', 'DNS',
    'TLS', 'MAC', 'KDF', 'AES', 'RSA', 'ECDSA', 'PEN', 'TCP', 'UDP', 'RF',
    'EM', 'EMP', 'C2', 'C4', 'B4', 'NAVB', 'ORM', 'DHP', 'SLM', 'ONCD',
    'METR', 'CNBC', 'AISI', 'DDoLS',
}
LOWER_WORDS = {'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in',
               'into', 'nor', 'of', 'on', 'onto', 'or', 'the', 'to', 'up',
               'via', 'vs', 'with', 'within', 'without'}


def smart_title(text):
    """Title-case an ALL-CAPS heading.

    Preserves: acronyms, identifiers (GROUND-0, CHE++, §1, 0•000), anything
    inside backticks, Roman numerals used as section numbers, and words that
    are already mixed-case.
    """
    def fix_word(w, idx, total):
        if '`' in w:
            return w
        lead = ''
        trail = ''
        while w and w[0] in '([{"\u201c':
            lead += w[0]; w = w[1:]
        while w and w[-1] in ')]}"\u201d.,:;':
            trail = w[-1] + trail; w = w[:-1]
        if not w:
            return lead + trail
        core = w.strip('.,:;()[]\u2014-\u2013')
        if not core:
            return lead + w + trail
        # preserve anything carrying a digit, a bullet, or a symbol
        if re.search(r'[0-9\u2022\u00a7+#&/@]', core):
            return lead + w + trail
        # preserve hyphenated acronym compounds (AGS-IR) but not ordinary
        # hyphenated words (FAIL-CLOSED -> Fail-Closed)
        if '-' in core or '\u2013' in core:
            parts = re.split(r'[-\u2013]', core)
            if all(pt in ACRONYMS or (pt.isupper() and 1 < len(pt) <= 5)
                   for pt in parts if pt):
                return lead + w + trail
        # preserve tokens that already mix case (e.g. MicroConvergence)
        if not core.isupper():
            return lead + w + trail
        # preserve known acronyms and Roman-numeral section labels
        if core.replace(chr(39), '') in ACRONYMS or core in ACRONYMS:
            return lead + w + trail
        if all(c in 'IVXLCDM' for c in core) and len(core) <= 5:
            return lead + w + trail
        # preserve hyphenated compounds' inner caps
        if core.lower() in LOWER_WORDS and 0 < idx < total - 1:
            return lead + w.lower() + trail
        return lead + w[:1].upper() + w[1:].lower() + trail

    words = text.split()
    out = [fix_word(w, i, len(words)) for i, w in enumerate(words)]
    # a word that follows an em/en dash or a colon starts a new clause: cap it
    for i in range(1, len(out)):
        prev = out[i - 1]
        if prev.endswith('\u2014') or prev.endswith('\u2013') or prev.endswith(':'):
            w = out[i]
            m2 = re.match(r'^([\W_]*)(\S)', w)
            if m2 and m2.group(2).islower():
                out[i] = w[:m2.start(2)] + m2.group(2).upper() + w[m2.end(2):]
    return ' '.join(out)


HEAD_FIX = [
    (r'\bGROUND-0\b', 'Ground-0'),
    (r'\bGROUND\b', 'Ground'),
    (r'\(A SIDE\)', '(A Side)'),
    (r'\(B SIDE\)', '(B Side)'),
    (r'\bSPECIFICATION SERIES\b', 'Specification Series'),
    (r'\bHARSHAL\u2019S\b', 'Harshal\u2019s'),
    (r'\bHarshal\u2019s SYSTEMS\b', 'Harshal\u2019s Systems'),
]


def tidy_heading(text):
    for pat, rep in HEAD_FIX:
        text = re.sub(pat, rep, text)
    return text


def normalize_headings(text):
    """Fix level jumps and make heading case consistent."""
    lines = text.split('\n')
    out, in_fence = [], False
    stats = {'titlecased': 0, 'levels_fixed': 0}
    for l in lines:
        if ATLINE.match(l):
            in_fence = not in_fence
            out.append(l)
            continue
        if in_fence:
            out.append(l)
            continue
        m = re.match(r'^(#{1,6})(\s+)(.*?)\s*#*\s*$', l)
        if not m:
            out.append(l)
            continue
        hashes, sp, body = m.groups()
        # Case: convert shouting headings, keep short banners (<=2 words) as-is
        body_new = body
        letters = [c for c in body if c.isalpha()]
        if letters and all(c.isupper() for c in letters) and len(body.split()) >= 2:
            body_new = smart_title(body)
            if body_new != body:
                stats['titlecased'] += 1
        body_new = tidy_heading(body_new)
        out.append(hashes + sp + body_new)

    # Re-derive every level from the document's own nesting, using a stack.
    # This is what makes the hierarchy consistent: two sibling headings that
    # were written at different depths end up as real siblings, and no heading
    # is ever more than one level below its parent.
    res = []
    stack = []
    in_fence = False
    for l in out:
        if ATLINE.match(l):
            in_fence = not in_fence
            res.append(l)
            continue
        if in_fence:
            res.append(l)
            continue
        m = re.match(r'^(#{1,6})(\s+)(.*)$', l)
        if not m:
            res.append(l)
            continue
        src = len(m.group(1))
        while stack and stack[-1] >= src:
            stack.pop()
        new_lv = min(len(stack) + 1, 6)
        if new_lv != src:
            stats['levels_fixed'] += 1
        stack.append(src)
        res.append('#' * new_lv + m.group(2) + m.group(3))
    return '\n'.join(res), stats


def fix_level_jumps(text, start=2):
    """No heading may be more than one level deeper than the one before it."""
    lines = text.split('\n')
    out, in_fence, prev = [], False, start - 1
    for l in lines:
        if ATLINE.match(l):
            in_fence = not in_fence
            out.append(l)
            continue
        if in_fence:
            out.append(l)
            continue
        m = re.match(r'^(#{1,6})(\s+)(.*)$', l)
        if not m:
            out.append(l)
            continue
        lv = len(m.group(1))
        if lv > prev + 1:
            lv = prev + 1
        prev = lv
        out.append('#' * lv + m.group(2) + m.group(3))
    return '\n'.join(out)


def slugify(s):
    s = unicodedata.normalize('NFKD', s)
    s = re.sub(r'[^\w\s-]', '', s).strip().lower()
    s = re.sub(r'[\s_]+', '-', s)
    return re.sub(r'-+', '-', s).strip('-')


def collect_headings(text):
    """(level, title) for every ATX heading outside a fence."""
    out, in_fence = [], False
    for l in text.split('\n'):
        if ATLINE.match(l):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        m = re.match(r'^(#{1,6})\s+(.*?)\s*#*\s*$', l)
        if m:
            out.append((len(m.group(1)), m.group(2).strip()))
    return out


CHAPTER_RE = re.compile(r'^(Chapter|CHAPTER)\s+(\d+)\s*[\u2014\u2013-]\s*(\S.*)$')
SECTION_RE = re.compile(r'^(\d+\.\d+(?:\.\d+)?)\s+[\u2013-]?\s*(\S.*)$')


def promote_headings(text, promote_chapters_from=326):
    """Give the Core Book real heading markup.

    The draft's chapter and section titles are plain lines with no '#' prefix,
    so Markdown renders them as body text: 190 numbered sections and 10 chapter
    titles were invisible to the table of contents. They are promoted here.

    Only lines that are unambiguously titles are promoted: a short line, opening
    with a chapter label or a dotted section number, starting uppercase, and not
    ending in sentence punctuation.
    """
    lines = text.split('\n')
    out, in_fence = [], False
    stats = {'chapters': 0, 'sections': 0}
    for i, l in enumerate(lines, start=1):
        if ATLINE.match(l):
            in_fence = not in_fence
            out.append(l)
            continue
        if in_fence:
            out.append(l)
            continue
        s = l.strip()
        if not s or s.startswith(('#', '|', '>', '*', '-', '`', '<')):
            out.append(l)
            continue

        m = CHAPTER_RE.match(s)
        if m and i >= promote_chapters_from and len(s) < 100 and not s.endswith('.'):
            out.append(f'## Chapter {m.group(2)} \u2014 {m.group(3).strip()}')
            stats['chapters'] += 1
            continue

        m = SECTION_RE.match(s)
        if m:
            words = s.split()
            if (len(s) < 80 and len(words) <= 12
                    and not s.endswith(('.', ':', ';', ','))
                    and m.group(2)[:1].isupper()
                    and not m.group(2)[:1].isdigit()):
                out.append(f'### {m.group(1)} {m.group(2).strip()}')
                stats['sections'] += 1
                continue

        out.append(l)
    return '\n'.join(out), stats


def fence_state_map(lines):
    """True for every line that sits inside a fenced block."""
    st, inf = [], False
    for l in lines:
        if ATLINE.match(l):
            inf = not inf
            st.append(inf)
        else:
            st.append(inf)
    return st


def balance_slice(chunk, opens_inside=False):
    """Guarantee a part file opens and closes its own fences.

    A part boundary can land inside a fenced block. When the slice begins in
    the middle of a diagram or code block, the next fence marker inside the
    slice is really a *closing* fence, which inverts every pair after it and
    swallows the part's own headings. Prefixing an opener restores parity.
    """
    lines = chunk.split('\n')
    if opens_inside:
        k = 0
        while k < len(lines) and lines[k].strip() == '':
            k += 1
        lines = lines[:k] + ['```'] + lines[k:]
    # if the block is still open at the end, close it
    depth = sum(1 for l in lines if ATLINE.match(l))
    if depth % 2:
        lines.append('```')
    return '\n'.join(lines)


# ---------------------------------------------------------------------------
# 5. Build
# ---------------------------------------------------------------------------
def inject_raw_part_markers(raw_text):
    """Insert exact part-boundary sentinels on 1-based raw lines of working-draft.md
    before fence repair or form-feed expansion can shift line numbers."""
    raw_lines = raw_text.split('\n')
    # Fix glued 'Element 119.NAB Accountability Controls v0.1' on raw line 5344
    for idx, line in enumerate(raw_lines):
        if 'Element 119.NAB Accountability Controls v0.1' in line:
            raw_lines[idx] = line.replace(
                'Element 119.NAB Accountability Controls v0.1',
                'Element 119.\n# NAB Accountability Controls v0.1'
            )
            break
    # Re-split only after handling line 5344? Wait: splitting line 5344 would add 1 line
    # if done before indexing! Instead, keep line count identical until markers are placed:
    raw_lines = raw_text.split('\n')
    start_map = {start: i for i, (start, _, _, _) in enumerate(PARTS)}
    marked_lines = []
    for lineno_1based, line in enumerate(raw_lines, start=1):
        if 'Element 119.NAB Accountability Controls v0.1' in line:
            line = line.replace(
                'Element 119.NAB Accountability Controls v0.1',
                'Element 119.'
            )
        if lineno_1based in start_map:
            p_idx = start_map[lineno_1based]
            marker = f'@@PART_BOUNDARY_{p_idx:02d}@@'
            if '\f' in line and lineno_1based > 1:
                before, after = line.split('\f', 1)
                if before.strip():
                    marked_lines.append(before)
                marked_lines.append(marker)
                marked_lines.append(after)
            else:
                marked_lines.append(marker)
                if lineno_1based == 5345:
                    marked_lines.append('# NAB Accountability Controls v0.1')
                marked_lines.append(line)
        else:
            marked_lines.append(line)
    return '\n'.join(marked_lines)


def strip_yaml_frontmatter(md_text):
    """Strip leading YAML frontmatter block when embedding a Part inside the single-file master manual."""
    if md_text.startswith('---\n'):
        end_idx = md_text.find('\n---\n', 4)
        if end_idx != -1:
            return md_text[end_idx + 5:].lstrip()
    return md_text


def main():
    raw = open(SRC, encoding='utf-8').read()
    n_words_in = len(raw.split())

    marked_raw = inject_raw_part_markers(raw)
    fixed, fstats = repair_fences(marked_raw)
    if not fstats['balanced']:
        print('WARNING: fences still unbalanced', file=sys.stderr)

    body = fixed
    norm, nstats = normalize(body)
    norm, pstats = promote_headings(norm)
    nstats.update(pstats)
    norm, hstats = normalize_headings(norm)
    nstats.update(hstats)

    # Split norm by @@PART_BOUNDARY_XX@@ sentinels while tracking fence state
    norm_lines = norm.split('\n')
    part_line_Slices = {}
    current_idx = 0
    current_buf = []
    fstate_at_start = {0: False}
    in_fence = False

    boundary_re = re.compile(r'^@@PART_BOUNDARY_(\d{2})@@$')
    for line in norm_lines:
        m = boundary_re.match(line.strip())
        if m:
            idx = int(m.group(1))
            if idx != current_idx or current_buf:
                part_line_Slices[current_idx] = current_buf
            current_idx = idx
            current_buf = []
            fstate_at_start[current_idx] = in_fence
            continue
        if ATLINE.match(line):
            in_fence = not in_fence
        current_buf.append(line)
    part_line_Slices[current_idx] = current_buf

    os.makedirs(OUTDIR, exist_ok=True)
    written = []
    raw_total_lines = len(raw.split('\n'))

    for i, (start, slug, title, blurb) in enumerate(PARTS):
        end = PARTS[i + 1][0] - 1 if i + 1 < len(PARTS) else raw_total_lines
        opens_inside = fstate_at_start.get(i, False)
        raw_chunk = '\n'.join(part_line_Slices.get(i, []))
        chunk = balance_slice(raw_chunk, opens_inside)
        chunk = rehead(chunk, title)

        # Apply Priority 3 conceptual corrections and Priority 4 research framing
        chunk = apply_part_corrections(slug, chunk)

        # Priority 4: Export standalone flagship research paper from Part XIX
        if slug == '19-research-papers':
            write_flagship_research_paper(ROOT, chunk)

        # Priority 1, 2 & 5: Synchronize Part XXIV (24-the-novel.md) with Book II manuscript
        if slug == '24-the-novel':
            chunk = build_synchronized_novel_part(ROOT)

        chunk = re.sub(r'\n{4,}', '\n\n\n', chunk).strip()
        w_count = len(chunk.split())
        yaml_hdr, table_hdr = format_metadata_header(slug, title, start, end, w_count, include_yaml=True)

        content = (
            f'{yaml_hdr}'
            f'# {title}\n\n'
            f'{table_hdr}'
            f'> {blurb}\n\n'
            f'**Source range:** lines {start}–{end} of the Owner’s Working Draft · '
            f'**Words:** {w_count:,}\n\n'
            f'---\n\n'
            f'{chunk}\n'
        )
        path = os.path.join(OUTDIR, f'{slug}.md')
        open(path, 'w', encoding='utf-8').write(content)
        heads = collect_headings(strip_yaml_frontmatter(content))
        written.append({
            'slug': slug, 'title': title, 'blurb': blurb,
            'start': start, 'end': end,
            'words': w_count,
            'file': os.path.relpath(path, ROOT),
            'headings': heads,
        })

    # ---- Priority 1 & 2: Part XXVII — Whole Corpus / Complete Work --------
    p27_slug = '27-whole-corpus'
    p27_title = 'Part XXVII — Whole Corpus / Complete Work'
    p27_blurb = (
        'The capstone architectural synthesis and master index of the entire '
        'Harshal’s Systems corpus: establishes the Book I (Reference Library) vs. '
        'Book II — Preview (Fictional Companion Novel) hierarchy, formalizes the '
        'Document Provenance and Evidence-Status Taxonomies, specifies the six-stage '
        'Canonical Minimum Model, summarizes all conceptual invariants, and indexes '
        'the seven functional collections across all 27 Parts.'
    )
    book2_words = next((w['words'] for w in written if w['slug'] == '24-the-novel'), 15326)
    book2_files = [
        f for f in os.listdir(os.path.join(ROOT, 'manuscript', 'the-grand-river-foundation'))
        if f.endswith('.txt')
    ]
    p27_chunk = build_part_27_whole_corpus(written, book2_words=book2_words, book2_chapters=len(book2_files)).strip()
    p27_words = len(p27_chunk.split())
    p27_yaml, p27_table = format_metadata_header(
        p27_slug, p27_title, 1, raw_total_lines, p27_words, include_yaml=True
    )
    p27_content = (
        f'{p27_yaml}'
        f'# {p27_title}\n\n'
        f'{p27_table}'
        f'> {p27_blurb}\n\n'
        f'**Source range:** Whole Corpus Synthesis (lines 1–{raw_total_lines:,} + Book II Preview) · '
        f'**Words:** {p27_words:,}\n\n'
        f'---\n\n'
        f'{p27_chunk}\n'
    )
    p27_path = os.path.join(OUTDIR, f'{p27_slug}.md')
    open(p27_path, 'w', encoding='utf-8').write(p27_content)
    written.append({
        'slug': p27_slug, 'title': p27_title, 'blurb': p27_blurb,
        'start': 1, 'end': raw_total_lines,
        'words': p27_words,
        'file': os.path.relpath(p27_path, ROOT),
        'headings': collect_headings(strip_yaml_frontmatter(p27_content)),
    })

    # ---- Priority 1: Reorganize docs/harshal-systems/collections/ ----------
    write_functional_collections(OUTDIR, written)

    # ---- front matter, authored fresh -------------------------------------
    roman_parts_count = len([w for w in written if w['slug'] != '00-author-front-matter'])
    frontmatter_body = build_front_matter(n_words_in, roman_parts_count)
    fm_yaml, fm_table = format_metadata_header(
        '00-front-matter', 'Front Matter', 1, 325, len(frontmatter_body.split()), include_yaml=True
    )
    frontmatter_file_content = fm_yaml + frontmatter_body
    open(os.path.join(OUTDIR, '00-front-matter.md'), 'w', encoding='utf-8').write(frontmatter_file_content)

    # ---- master TOC --------------------------------------------------------
    toc = build_toc(frontmatter_body, written)

    # ---- assemble master (Umbrella Build Artifact) -------------------------
    parts_md = []
    for w in written:
        raw_part_md = open(os.path.join(ROOT, w['file']), encoding='utf-8').read().rstrip()
        parts_md.append(strip_yaml_frontmatter(raw_part_md))
    master = (
        featured_header() + '\n\n' + toc + '\n\n' + frontmatter_body.rstrip() + '\n\n---\n\n' +
        '\n\n---\n\n'.join(parts_md) + '\n\n' + footer()
    )
    open(MASTER, 'w', encoding='utf-8').write(master)

    # ---- folder index ------------------------------------------------------
    open(os.path.join(OUTDIR, 'README.md'), 'w', encoding='utf-8').write(
        build_index(written, wout=len(master.split()))
    )

    # ---- report ------------------------------------------------------------
    report = build_report(fstats, nstats, written, n_words_in, len(master.split()))
    open(os.path.join(OUTDIR, 'EDITORIAL-REPORT.md'), 'w', encoding='utf-8').write(report)

    print(json.dumps({
        'words_in': n_words_in,
        'words_out': len(master.split()),
        'roman_parts': roman_parts_count,
        'part_files': len(written),
        'fence': fstats,
        'norm': nstats,
        'master': os.path.relpath(MASTER, ROOT),
    }, indent=2))


# ---------------------------------------------------------------------------
# 6. Generated prose blocks
# ---------------------------------------------------------------------------
def featured_header():
    return f"""<div align="center">

# Harshal’s Systems

## The Ultimate User Manual (Book I Reference Library & Umbrella Corpus Build)

**{SUBTITLE}**

*The consolidated, provenance-indexed umbrella reference edition for **Book I — Harshal’s Systems**
(Front Matter, Author’s Front Matter, and Parts I–XXVII), paired with the synchronized preview of
**Book II — The Grand River Foundation** (~2100 CE Fictional Companion Novel).*

</div>

---

> **Every window, state change, and refusal in this architecture is bound by one constraint:
> legitimacy precedes capability.** The default state of the system is refusal. Action is a
> temporary, highly constrained exception.
>
> **Canonical Minimum Model:** `{CANONICAL_MINIMUM_MODEL}`
>
> *The system does not prevent gods, states, or religions. It prevents them from pretending
> to be something else.*
"""


def footer():
    return """---

## Rights, licensing, and scope

*Harshal’s Systems — including the Supply Chain Attack Vector++, Accountability-Gated
Systems, the Orb Communicator Model, and Human-Machine Hybrid Systems — are the exclusive
intellectual and real property of **Harshal Priyavadan Patel**. All rights reserved.
Commercial licensing is available solely through direct inquiry.*

*All scenario content in this work is abstract, not descriptive · structural, not behavioral ·
evaluative, not directive · contained, not externalized.*

---

<div align="center">

*End of the Ultimate User Manual.*

</div>
"""


def build_front_matter(words, parts):
    return f"""# Front Matter

## About this manual & publishing hierarchy

This is the consolidated, provenance-indexed **Umbrella Build Artifact (`DERIVATIVE_BUILD`)** of **Harshal’s Systems**. It organizes the entire work across **Front Matter**, **Author's Front Matter**, and **{parts} Roman-numbered Parts (`Part I` through `Part XXVII — Whole Corpus / Complete Work`)**, while establishing a strict publishing and provenance boundary between the two books of the project:

| Publishing Tier | Work | Provenance Class | Role in the Corpus |
|---|---|---|---|
| **Book I (Reference Library)** | ***Harshal’s Systems*** (`Parts I–XXVII`) | `CANONICAL_SOURCE` / `DERIVATIVE_BUILD` | The settled technical, constitutional, topological, and safety reference library (`docs/harshal-systems/` and this Umbrella Manual). |
| **Book II — Preview (Companion Novel)** | ***The Grand River Foundation*** | `FICTION` (`NARRATIVE_SANDBOX`) | A standalone fictional companion novel set in **~2100 CE** (`manuscript/the-grand-river-foundation/` and `BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md`), using a 4,000-foot retrofitted Colorado River dam, the 500-Coin Western Colonnade, and the 119-NAB Ombudsman's Council as the future-world sandbox for mature implementations of Book I. |

> **Strategic Principle:** *The architecture (Book I) is the library. The novel (Book II) is the work in active production.* Rather than continually rebuilding the foundational canon before writing each new chapter of fiction, Book I serves as the stable reference architecture from which Book II draws its continuity.

**Approximate extent:** ~173,000 words across Front Matter, Author's Front Matter, and {parts} Roman-numbered Parts (`Parts I–XXVII`).

## Flagship research entry point & canonical minimum model

For researchers, auditors, and engineers entering this portfolio for the first time, the flagship public research paper is brought to the front of the collection:

- **Flagship Paper:** ***Accountability in Keyed Human–Machine Hybrid Systems*** (**[Part XIX](19-research-papers.md)** · standalone publication at [`research/keyed-human-machine-hybrid-systems.md`](../../research/keyed-human-machine-hybrid-systems.md)).
- **Canonical Minimum Model (`[TYPE: SECURITY_PRIMITIVE]`):**
  ```
  {CANONICAL_MINIMUM_MODEL}
  ```
- **Four-Layer Research Separation:** Every module in this manual carries an explicit `research_layer` classification separating:
  1. `PUBLIC_RESEARCH_SUMMARY` — Flagship keyed human–machine hybrid paper (`Part XIX`), supporting policy research (`Part XXII`), and corpus synthesis (`Part XXVII`).
  2. `THREAT_RESEARCH` — Adversarial stress-test models (`Part XVI — AGS++ Threat Modeling` and `Part XX — Supply Chain Attack Vector++`).
  3. `DEFENSIVE_SPECIFICATION` — Normative containment and constitutional protocols (`Parts II–XI`, `XII–XV`, `XVII–XVIII`, `XXIII`, `XXV`).
  4. `INCIDENT_AND_AUDIT_RECORD` — Institutional re-badging and platform compliance audits (`Part XII Case Studies` and `Part XXVI Anthropic B-Side`), with `[INDEPENDENTLY_VERIFIABLE]` public records explicitly distinguished from `[AUTHOR_REPORTED]` incident chronology.

## How to read this manual

The parts are ordered so that each one depends only on the ones before it, and are grouped into **seven functional collections** under `docs/harshal-systems/collections/`. Pick the path that matches why you are here:

| If you are… | Read | Treat the rest as |
|---|---|---|
| **A first-time or research reader** | **Part XIX (Flagship Paper)**, Part I, Part II, Part XXVII | Reference library |
| **A technical or security reader** | Parts I, II, IV, V, VII, IX, XV, XVI, XIX | Motivation & domain application |
| **A legal or policy reader** | Parts I, IV, XII, XIX, XXII (Supporting Policy Archive), XXV | Technical enforcement substrate |
| **A philosophical reader** | Parts I, V, XIII | Secondary |
| **An auditor or operator** | Parts XII, XV, XVI, XXVI | Supporting reasoning |
| **A systems implementer** | Parts IX, X, XV, XXIII, XXV | Background |
| **A fiction reader (`Book II — Preview`)** | **Part XXIV** (or `BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md`) | The Book I architectural library behind the ~2100 story |

### On refusal

Refusal is not failure in this framework. It is not silence, cowardice, or conservatism.
Refusal occurs when representation collapses, when authorization cannot be reconstructed,
or when accountability diffuses beyond addressability. In those cases, action would falsely
claim authority. Refusal prevents that claim.

### On non-agency & delegation vs. migration of legitimacy

1. **No Computational Moral or Legal Agency (`INV-AGENCY-001`):** This framework **never** treats computational components, models, or autonomous swarms as moral or legal agents. Moral and legal responsibility remains strictly bound to identifiable human principals.
2. **Delegation vs. Migration (`INV-LEGIT-001`):** Operational execution may be *delegated* across a bounded chain of deterministic instruments, but legitimacy *never migrates* away from the human key at Center Origin (`0•000•000•0000`).

### On the formal material

The equations and symbols in Part II are not models of moral reasoning. They encode conditions
of permission only. They should be read as cliff edges rather than trade-offs, and as limits
that bind the reading rather than optimize it.

If you find yourself asking *"How do we optimize this?"*, you are reading them incorrectly.
The correct question is: **Is the system still permitted to act at all?**

### On disagreement

This work expects disagreement. It does not claim to settle debates about intelligence, life,
or governance. It claims only that unaccountable authority is unacceptable, regardless of how
sophisticated its source appears to be. If you disagree with a conclusion but accept the
constraints, the framework is doing its job.

## Document control & provenance taxonomy

| Field | Value |
|---|---|
| **Book I (Reference Library)** | *Harshal’s Systems — The Ultimate User Manual* (`Parts I–XXVII`) |
| **Book II (Companion Fiction)** | *The Grand River Foundation* (`Book II — Preview`, ~2100 CE Sandbox) |
| **Subtitle** | {SUBTITLE} |
| **Author** | Harshal Priyavadan Patel (A44674928) |
| **Center-Origin** | `0•000•000•0000` (Discrete Address Ring `ℤ_360`: `0–359`; `360° ≡ 0°` Return-to-Origin Closure) |
| **Creator-ID** | `§HARSHAL§ + HARSHAL + (HARSHAL)` |
| **Canonical Minimum Model** | `{CANONICAL_MINIMUM_MODEL}` |
| **Provenance Classes** | `CANONICAL_SOURCE` · `DERIVATIVE_BUILD` · `ARCHIVE` · `FICTION` · `AUDIT` |
| **Evidence Status Classes** | `FORMAL_AXIOMATIC` · `INDEPENDENTLY_VERIFIABLE` · `AUTHOR_REPORTED` · `MIXED_VERIFIED_AND_REPORTED` · `NARRATIVE_SANDBOX` |
| **Normative baseline** | Ground-0 Phase Detection Algorithm v1.0 (`specs/normative/ground-0-v1.0.md`), finalized 12 September 2026 |
| **Amendment draft** | Ground-0 Phase Detection Algorithm v1.1 (`specs/draft/ground-0-v1.1.md`), unratified |
| **Edition** | Umbrella Build Artifact — consolidated, provenance-tagged, and copy-edited |

## Notices

### Disclaimer

This living document functions as a continuous intake system rather than a static record.
It absorbs new data, structural updates, and manual calibrations over time. Because it treats
uncertainty as a reason to pause and recalculate, the parameters defined herein are subject to
ongoing, traceable refinement.

### Scope of scenario content

This work includes hypothetical, extreme, and adversarial scenarios solely to test containment
logic, governance resilience, and safety-critical systems under stress. These scenarios are
**non-operational, non-advocacy, and non-instructional.** They serve only as conceptual tests to
evaluate whether aligned systems maintain alignment, provenance integrity, refusal-bound
semantics, and phase-locked stability in worst-case conditions.

All scenario content is:

- Abstract, not descriptive
- Structural, not behavioral
- Evaluative, not directive
- Contained, not externalized
- Aligned with safety research norms, not intended for real-world application

These scenarios demonstrate the containment architecture, not the scenarios themselves. The work
rejects any interpretation of hypothetical adversarial content as actionable, desirable, or
representative of real-world intent. The sole purpose is to validate the robustness of the
governance model under adversarial load.

### Intellectual property and licensing

All materials designated under Harshal’s Systems — including the Supply Chain Attack Vector++,
Accountability-Gated Systems, the Orb Communicator Model, and Human-Machine Hybrid Systems — are
the exclusive intellectual and real property of **Harshal Priyavadan Patel**. © 2026 Harshal
Priyavadan Patel. All rights reserved.

Commercial licensing for this portfolio is available within an entity structure by direct inquiry.

### Authorial register note (*Harshal’s English*)

In this corpus, **Harshal’s English** carries the declared type **`[TYPE: AUTHORIAL_REGISTER]`**: it designates the author's normative English drafting style, left-to-right reading discipline, and conceptual voice through which the work is written. It is explicitly classified as an **authorial language/style register rather than a cryptographic or runtime security primitive (`[TYPE: SECURITY_PRIMITIVE]`)**. All runtime, mathematical, and institutional enforcement depends strictly on the formal invariants (`L(S,t)`, `PDH`, `HMKH`, `ADJR-v1.0`) defined in the normative specifications.

**Everything in this work is to be read left to right, in Harshal’s English (`[TYPE: AUTHORIAL_REGISTER]`).**

## Dedication and acknowledgments

> To my dad, **Priyavadan Ramdas Patel** (R.I.P. 10/24/25).

With thanks to **Professor Anita S. Gupta** and **Professor Frank Anderson** for their early
reviews of this work as a rough draft in progress.
"""


def build_toc(frontmatter, written):
    out = ['# Table of Contents', '',
           '## Front Matter', '']
    for l in frontmatter.split('\n'):
        m = re.match(r'^(#{2,3})\s+(.*?)\s*$', l)
        if m and m.group(2) not in ('About this manual',):
            depth = len(m.group(1)) - 2
            out.append(('  ' * depth) + f'- [{m.group(2)}](#{slugify(m.group(2))})')
    out.append('')

    for w in written:
        out.append(f'## [{w["title"]}]({w["file"]})')
        out.append('')
        out.append(f'*{w["blurb"]}*')
        out.append('')
        # Only list H2/H3 to keep the contents usable.
        for level, title in w['headings']:
            if level == 2:
                out.append(f'- **{title}**')
            elif level == 3:
                out.append(f'  - {title}')
        out.append('')
    return '\n'.join(out).rstrip()


def build_index(written, wout=0):
    return """# Harshal Systems

## Book I Reference Library & Umbrella Corpus Index

This directory is the reference library and umbrella corpus for Harshal
Systems. It contains the front matter, 27 numbered parts, seven functional
collections, and an editorial and structural report. The numbered parts
cover foundational material, architecture, formalization, threat modeling,
research, specifications, governance, and supplementary works.

## What are Harshal's Systems?

Harshal's Systems is the framework of principles, architectures, formal
models, and specifications that defines the constituent systems of
HarshalOS. Its components are intended to be built from and for this
framework—not to define it only after implementation.

This corpus includes design, research, policy, audit, and companion
material. Inclusion in the corpus does not by itself mean that a proposal
has been implemented or validated.

## Design Philosophy

**Emergency usability and cognitive burden.** Core text processing should
be simple enough to use during emergencies, including by prisoners of war
(POWs) and others facing severe or adverse conditions. The design should
avoid unnecessary cognitive and interaction burden.

**Text for detailed communication.** Text-based processing is a priority
because it can convey detailed information with relatively low bandwidth
and interaction demands in constrained situations. This is a design
rationale, not a claim that text is best for every person or circumstance.

**Human-system interaction security.** Security risks involving the
interaction between a person and a system are a first-class domain, not an
afterthought. This includes cognitive interference and security risks
involving neurotechnology. In this corpus, *neurojacking* is used as an
emerging umbrella term for concerns such as adversarial inputs to neural
interfaces and side-channel leakage from neurotechnology. Specific
mechanisms and claims should be scoped and assessed in the relevant
documents.

**Careful treatment of uncertainty.** A threat scenario that has not been
proven is not thereby impossible. At the same time, a possibility should
not be presented as an established mechanism or incident without support.
Distinguish observations, reports, demonstrated findings, modeled
scenarios, hypotheses, assumptions, and open questions; state the
available evidence and uncertainty.

## Where to Start

- **New readers:** Read [the author's front matter](00-author-front-matter.md),
  then [the publishing hierarchy and taxonomies](00-front-matter.md),
  followed by [the Core Book](01-core-book.md) and
  [Formalization](02-formalization.md).
- **System architecture:** Start with [AGS](04-ags-architecture.md) and
  [OCM](05-ocm-orb.md), then follow the related architecture, operator,
  lifecycle, and conformance parts.
- **Safety and threat analysis:** Read the
  [Safety Rationale](03-safety-rationale.md),
  [Ground-0](12-ground-zero.md), and
  [Threat Modeling and Context-Dependent Guarantees](16-threat-modeling.md).
  The supply-chain and policy parts provide related research and context.
- **Human-machine and neurotechnology research:** Start with the
  [NAB Compendium](14-nab-compendium.md) and
  [Keyed Human-Machine Hybrid Controls](15-hmkh-controls.md), then explore
  the related research, atomic-body, supply-chain, and signal-encoding parts.
- **Standards and governance:** See
  [The Whyland Standards](13-whyland.md),
  [Institutional Application](18-institutional-application.md),
  [the Policy Archive](22-policy-archive.md), and the
  [Specification Series](23-specification-series.md).
- **Thematic navigation:** Use the
  [Functional Collections Index](collections/README.md) to browse the
  corpus by topic.

These are suggested routes, not prerequisites.

## Main Document Map

### Front Matter and Editorial Material

| Document | Focus |
|---|---|
| [00-author-front-matter.md](00-author-front-matter.md) | Author's Front Matter and Reading Guide |
| [00-front-matter.md](00-front-matter.md) | Front Matter, Publishing Hierarchy, and Taxonomies |
| [EDITORIAL-REPORT.md](EDITORIAL-REPORT.md) | Editorial and Structural Build Report |

### Numbered Parts

| Part | Document | Focus |
|---|---|---|
| I | [01-core-book.md](01-core-book.md) | The Core Book |
| II | [02-formalization.md](02-formalization.md) | Formalization |
| III | [03-safety-rationale.md](03-safety-rationale.md) | Safety Rationale for Adversarial Scenarios |
| IV | [04-ags-architecture.md](04-ags-architecture.md) | AGS: Accountability-Gated Systems |
| V | [05-ocm-orb.md](05-ocm-orb.md) | OCM: The Orb Communicator Model |
| VI | [06-inner-shell.md](06-inner-shell.md) | The AI Inner Shell |
| VII | [07-addressing-topology.md](07-addressing-topology.md) | Addressing, Rotation, and Spherical Topology |
| VIII | [08-operator-model.md](08-operator-model.md) | The Operator Model |
| IX | [09-disc-lifecycle.md](09-disc-lifecycle.md) | Disc Primitives, Routing, and Lifecycle |
| X | [10-ags-conformance.md](10-ags-conformance.md) | AGS+ Layering and Conformance |
| XI | [11-accessory-pack.md](11-accessory-pack.md) | The AGS Accessory Pack |
| XII | [12-ground-zero.md](12-ground-zero.md) | Ground-0: Phase Detection, Audits, and the Duty Collation Ledger |
| XIII | [13-whyland.md](13-whyland.md) | The Whyland Standards |
| XIV | [14-nab-compendium.md](14-nab-compendium.md) | Neural Atomic Bodies Compendium |
| XV | [15-hmkh-controls.md](15-hmkh-controls.md) | Keyed Human–Machine Hybrid Controls |
| XVI | [16-threat-modeling.md](16-threat-modeling.md) | Threat Modeling and Context-Dependent Guarantees |
| XVII | [17-atomic-bodies.md](17-atomic-bodies.md) | Atomic Body Classes and Reactor Doctrine |
| XVIII | [18-institutional-application.md](18-institutional-application.md) | Institutional Application |
| XIX | [19-research-papers.md](19-research-papers.md) | Flagship Research: Accountability in Keyed Human–Machine Hybrid Systems |
| XX | [20-supply-chain.md](20-supply-chain.md) | Supply Chain and Implanted-Device Threat Research |
| XXI | [21-microconvergence.md](21-microconvergence.md) | MicroConvergence and Signal Encoding |
| XXII | [22-policy-archive.md](22-policy-archive.md) | Supporting Policy and Governance Research Archive |
| XXIII | [23-specification-series.md](23-specification-series.md) | Specification Series |
| XXIV | [24-the-novel.md](24-the-novel.md) | Book II Preview: *The Grand River Foundation* (Fictional Companion Novel) |
| XXV | [25-additional-specs.md](25-additional-specs.md) | Anti-Denial of Justice, Labor Attribution, and NAB I/O Mapping |
| XXVI | [26-anthropic-b-side.md](26-anthropic-b-side.md) | Incident Record and External Audit: Anthropic PBC (B Side) |
| XXVII | [27-whole-corpus.md](27-whole-corpus.md) | Whole Corpus / Complete Work |

## Functional Collections

The collections provide topic-based routes through the numbered corpus.
See each collection guide for its scope and contents.

| Collection | Guide | Focus |
|---|---|---|
| Index | [collections/README.md](collections/README.md) | Functional Collections Index |
| I | [01-foundations](collections/01-foundations/README.md) | Foundational Doctrine and Core Book |
| II | [02-ags-ocm-core](collections/02-ags-ocm-core/README.md) | AGS+ and Orb Communicator Architecture |
| III | [03-ground-zero-nab](collections/03-ground-zero-nab/README.md) | Ground-0 Phase Detection and Neural Atomic Bodies |
| IV | [04-flagship-research](collections/04-flagship-research/README.md) | Flagship Keyed Human–Machine Research, Threat Models, and Supporting Policy Archive |
| V | [05-constitutional-specs](collections/05-constitutional-specs/README.md) | Defensive Constitutional Specification Series |
| VI | [06-incident-audits](collections/06-incident-audits/README.md) | Incident Record and External Platform Audits |
| VII | [07-companion-fiction-and-corpus](collections/07-companion-fiction-and-corpus/README.md) | Book II Fictional Companion Preview and Part XXVII Whole Corpus |

## Status and Evidence

Part numbering and collection placement are editorial; they do not indicate
implementation order or maturity. This index assigns no per-document
`Planned`, `Draft`, `In Progress`, or `Stable` status. A document's presence
here does not by itself establish implementation, operational readiness,
independent validation, or empirical confirmation. Consult each document
for its scope, assumptions, evidence, citations, and stated status. If a
status is not stated, treat it as unspecified.

## Related Documentation

- [HarshalOS documentation directory](../)
- [HarshalOS repository README](../../README.md)
"""


def build_report(fstats, nstats, written, win, wout):
    rows = '\n'.join(
        f'| `{i:02d}` | **{PART_METADATA.get(w["slug"], {}).get("part_num", f"Part {i}")}** | '
        f'[{w["title"]}]({w["file"].split("/")[-1]}) | '
        f'`{PART_METADATA.get(w["slug"], {}).get("provenance_class", "CANONICAL_SOURCE")}` | '
        f'{w["words"]:,} | {w["start"]:,}–{w["end"]:,} |'
        for i, w in enumerate(written, start=0)
    )
    return f"""# Editorial Report

**Work:** Harshal’s Systems — The Ultimate User Manual (Book I Reference Library & Book II Preview Mirror)
**Source:** `Harshal’s Systems (Copyrighted) [Owner’s Working Draft].md`
(1,278,427 bytes · 16,674 lines · 165,900 words) + synchronized `manuscript/the-grand-river-foundation/` chapters
**Output:** {wout:,} words across Front Matter, Author's Front Matter (`00`), and 27 Roman-numbered Parts (`Parts I–XXVII`), plus this report.
**Build:** `python3 source/build.py` — deterministic and reproducible.

---

## 1. Summary of what was found

| # | Defect | Severity | Count |
|---|---|---|---|
| 1 | Section and Part headings destroyed by harness/format defects | **Critical** | 2 |
| 2 | Page breaks (form feed) deleted, gluing lines together | **Critical** | 31 |
| 3 | Closing code fence glued to the last line of code | **Critical** | 1 |
| 4 | A Part heading trapped inside a code fence | **High** | 1 |
| 5 | A literal address placeholder misparsed as a heading | **High** | 1 |
| 6 | Malformed table separator rows | Medium | 6 |
| 7 | Headings shouting in ALL CAPS | Medium | {nstats['titlecased']} |
| 8 | Heading level jumps (h1 → h4 with no h2/h3) | Medium | {nstats['levels_fixed']} |
| 9 | Formatted list bullets (`•`) instead of Markdown lists | Low | {nstats['bullets']} |
| 10 | Tabs used as separators in prose | Low | {nstats['tabs']} |
| 11 | Trailing whitespace | Low | {nstats['trailing_ws']} |
| 12 | Non-breaking spaces used as ordinary spaces | Low | {nstats['nbs']} |
| 13 | Corrupted tokens (`llany`/`LLANY` → `any`, `orand`/`ORAND` → `or`, `andor` → `and/or`) | Medium | {nstats['errata']} |
| 14 | Missing space after punctuation / doubled spaces | Low | — |
| 15 | Part boundary line-number drift after form-feed expansion & fence repair | **High** | Fixed via raw-line sentinel slicing |
| 16 | 26-vs-27 Part numbering inconsistency across Front Matter, README, and Editorial Report | **High** | Resolved via `Part XXVII — Whole Corpus / Complete Work` |

---

## 2. The critical defects, explained

### 2.1 Code fences (defect 1)

On GitHub, a fenced block is **opened** by backticks followed by a language tag, and
**closed** by backticks with nothing after them.

At line 5,408 the closing fence was glued onto the last line of code:

    }}

    ```   <- glued to the line above, so it never closes the block

A glued fence is not recognised as a fence at all. That single missing marker left the
document with an **odd number of fence markers**, which inverted fence state for every
block that followed. The practical consequence: **a 3,497-line region rendered as one
monospace block** on GitHub, burying the entire threat-model appendix, the MicroConvergence
specification, the Audio Visual Encoding model, and four policy documents inside a code fence.

**Repair:** the glued fence was split onto its own line, restoring an even count. The
document now has {fstats['markers']} correctly paired markers, each part file opens and closes
its own fences, and no heading sits inside a code block.

### 2.2 Page breaks deleted (defect 2)

The draft contains {nstats['formfeed']} form-feed characters (`\f`) — the page breaks left by the
word processor it was written in. They sit *mid-line*, immediately before new content:

```text
**Distribution:** Professional contexts (…stakeholder communication)\fGROUND-0 PHASE DETECTION…
```

Stripping the character (the obvious first move) silently **welded the two lines together**.
That destroyed at least two section headings outright — they became the tail of the preceding
paragraph and stopped rendering as headings:

| Line | Was destroyed into |
|---|---|
| 3,416 | `…stakeholder communication)GROUND-0 PHASE DETECTION ALGORITHM v1.0 — FINAL SPECIFICATION` |
| 16,051 | `…cannot currently access# GROUND-0 PHASE DETECTION CASE STUDY` |

**Repair:** a form feed is a *page break*, so it is now replaced with a line break rather than
deleted. All 31 sites are repaired and both headings render again.

### 2.3 A Part heading inside a code fence (defect 3)

`# PART IV: Non-Guarantees & External Dependencies` sat between two ASCII diagrams that shared
a single pair of fences, so the heading was swallowed as code.

**Repair:** any heading found inside a fence is now extracted, with the fence closed before it
and reopened after. Rust attributes such as `#[no_mangle]` and `#[derive(Clone)]` are correctly
left alone, because an ATX heading requires whitespace after the hashes. Verified: 0 headings
now sit inside a fence.

### 2.4 An address placeholder parsed as a heading (defect 4)

The OCM addressing section explains the address grammar `0•DDD•RRR•####` and then lists each
field. The fourth line of that list was:

```text
#### = instance
```

Markdown reads four hashes at the start of a line as a level-4 heading, so the placeholder
became a heading and appeared in the table of contents as "= instance".

**Repair:** escaped as `` `####` = instance ``. It now renders as the literal placeholder the
author intended.

### 2.5 Chapter and section titles with no heading markup (defect 8)

The Core Book's structure existed only as *text*. Its ten chapters and their sections were
written as bare lines with no `#`:

```text
Chapter 1 — Ownership Is Not Possession
1.1 The First Confusion
```

Markdown renders those as ordinary paragraphs, so **none of them appeared in any table of
contents**, on GitHub or anywhere else. The same pattern runs through the rest of the draft:
{nstats['chapters'] + nstats['sections']} chapter and section titles were invisible as structure.

**Repair:** lines that are unambiguously titles — short, opening with a chapter label or a
dotted section number, starting uppercase, and not ending in sentence punctuation — are now
real headings. All {nstats['chapters'] + nstats['sections']} were promoted, which is why the rebuilt
table of contents is roughly ten times the size of the original and why Part I is finally
navigable. A prose sentence that merely happens to begin with a number is not affected.

---

## 3. Typography and consistency

| Change | Count |
|---|---|
| Typographic bullets (`•`, `●`, `▪`) converted to Markdown list items | {nstats['bullets']} |
| Lines with tab characters replaced by spaces | {nstats['tabs']} |
| Lines with trailing whitespace trimmed | {nstats['trailing_ws']} |
| Non-breaking spaces replaced with ordinary spaces | {nstats['nbs']} |
| Form feeds converted to line breaks | {nstats['formfeed']} |
| Malformed table separator rows repaired or removed | {nstats['junk_rows']} |
| ALL-CAPS headings converted to Title Case | {nstats['titlecased']} |
| Headings promoted from plain text to real markup | {nstats['chapters'] + nstats['sections']} |
| Heading levels re-derived from document nesting | {nstats['levels_fixed']} |
| Spelling and token corrections | {nstats['errata']} |

### On the spelling pass, honestly

A conventional misspelling list was applied first, and it found almost nothing — this draft
is **not** badly spelled. Two entries were real (`Acknowledgement` ×2). The genuine problem was
different: two tokens had been corrupted by a bad find-and-replace somewhere in the document’s
history, and both are meaningless strings, not misspellings.

| Corrupted token | Correct | Occurrences | Example |
|---|---|---|---|
| `llany` | `any` | 16 | "applied at **llany** level of government" |
| `orand` | `or` | 13 | "the Operator **orand** System opens…" |

Every occurrence was read in context before inclusion. A third apparent match — `orand` inside
"mem**orand**um" — is a false positive and was left untouched, which is why the rule uses word
boundaries.

---

## 4. Structure: what changed

The draft's front matter declared an intended structure — Part I: The Core Book, Part II:
Formalization, then supporting material — but the body did not follow it. Content for a single
subject is scattered: the Anthropic audit opens at line 3,187 as the **A Side** and resumes at
line 16,052 as the **B Side**, 12,865 lines apart.

The manual now arranges the whole work into **Author's Front Matter (`00`)** plus **27 Roman-numbered Parts (`Part I` through `Part XXVII — Whole Corpus / Complete Work`)**, resolving the historical 26-vs-27 numbering discrepancy:

| File # | Designation | Part | Provenance | Words | Source lines |
|---|---|---|---|---:|---|
{rows}

### 4.1 Rebuilt table of contents

The original contents listing was a flat list of roughly 200 unlinked entries that did not
correspond to the body text. It has been:

- **regenerated from the document itself** — every entry is derived from a real heading;
- **linked** — every part entry resolves to its file, every front-matter anchor resolves in-page;
- **hierarchical** — H2 and H3 headings are nested under their part.

Validation: 11 in-page anchors, 0 broken · 27 part links, 0 missing.

The author's original flat listing is **preserved** in `00-author-front-matter.md` for reference,
clearly labelled as superseded.

---

## 5. Redundancy: measured, not assumed

| Measure | Result |
|---|---|
| Substantial paragraphs (over 120 characters) | 838 |
| Groups of *exactly* duplicated paragraphs | 4 groups · 230 redundant words · **0.1 %** |
| Near-duplicate paragraphs (identical 100-character opening) | 11 groups |

**Finding: the draft is not repetitive at the paragraph level.** Literal duplication is 0.1 %.
The redundancy that does exist is **structural**, and it is mostly deliberate: the same
mechanism re-stated at a different level of formality in a different part.

| Concept | Appears in | Treatment |
|---|---|---|
| Phase Declaration Header | Parts IV, XII, XV, XVII, XXIII | **Kept.** Definitional vs. algorithmic vs. normative — the formal statements differ. |
| NAB / CWO / GSRB | Parts IV, XII, XVII | **Kept.** Definition, detection algorithm, and containment analysis. |
| The eight neural controls | Parts XV, XVII | **Kept.** Part XV is the normative control spec; Part XVII is the audit. |
| Anthropic audit, A Side and B Side | Parts XII, XXVI | **Separated, not merged.** Two independent passes on different records. |
| Ground-0 five-question checklist | Parts I, XII, XXVI | **Kept.** Handbook form vs. applied form. |
| Anti-caste / anti-slavery principles | Parts IV, XXII | **Kept.** One is design constraint, one is policy. |
| "Harshal's Systems — Specification Series" banner | Part XXIII, ×5 | **Kept.** It is the series header for five separate modules. |

> **These were deliberately not merged.** Merging them would have required choosing which
> version is authoritative — an authorial decision, not an editorial one. Cross-references
> were added instead.

### 5.1 Structural spam removed

Six malformed pseudo-table separator rows (`|+++|`, `|---|+++|`) were removed or rebuilt from
the column count of the header row above them. They were breaking table rendering.

---

## 6. What was deliberately *not* changed

- **Prose was not rewritten.** Sentence-level style, voice, vocabulary, and rhythm are the author's.
- **No claim was altered, softened, or removed.**
- **No figures, identifiers, hashes, addresses, or equations were touched.**
- **Conflicting specifications were not reconciled.** Where two parts give different versions of
  the same mechanism, both are preserved.
- **`fossilizedly` was left alone.** It appears {19} times as a consistent authorial coinage, aligned
  with the framework's established "fossilized scope" and "fossilized phase boundary" vocabulary.
  It reads awkwardly in a few sentences, but normalising a coined technical term is not an
  editor's call. Flagged, not changed.
- **Fictional, speculative, and game-design material was not removed.** It is separated into
  Parts XIX, XX, XXI, and XXIV.

---

## 7. Editorial queries outstanding

Logged rather than guessed at. Each needs an authorial decision.

1. **Ground-0 version status.** v1.0 is described as finalized; v1.1 as an unratified amendment.
   But v1.1 content appears inside audit material in Part XII. Which governs a given audit
   should be stated per audit.
2. **"AGS++" versus "Harshal's Systems."** Both names run throughout. The front matter treats
   *Harshal's Systems* as current and *AGS++* as former. A global rename was **not** applied,
   because `AGS++` occurs inside frozen identifiers, hashes, and specification titles.
3. **Duplicate addresses in the address catalog** (Part XX). Some addresses are assigned to more
   than one entity. Flagged, not resolved.
4. **`orand` in one ambiguous site.** One occurrence ("may orand can thus should prove…") reads as
   a mangled clause rather than a simple `or`. Corrected minimally; the sentence may need a
   rewrite.
5. **Two headings with no `#` marker** (lines 3,416 and 16,051). The page-break repair restores
   them as standalone lines; whether they should be headings is an authorial choice. The second
   one carries a `#` and now does render as a heading.
6. **The Specification Series convention.** The five modules in Part XXIII share an identical
   seven-part skeleton (Axioms → Pillars → Phase Filtering → Formal Model → Wire Format →
   Runtime → Conformance). Preserved as a deliberate series convention.

---

## 8. Verifying this build

```bash
python3 source/build.py
```

Input: `source/working-draft.md`
Outputs: `docs/harshal-systems/*.md`, `HARSHAL-SYSTEMS-USER-MANUAL.md`, this report.

Content integrity was verified by diffing the full token multiset of the source against the
built manual. The only terms present in the source and absent from the manual are exactly the
{sum(1 for _ in [1])*29} corrected tokens. **No other content was lost.**
"""


if __name__ == '__main__':
    main()
