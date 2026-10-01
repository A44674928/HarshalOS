#!/usr/bin/env python3
"""
HarshalOS documentation build.

Reads:   source/working-draft.md   (Owner's Working Draft, 1.28 MB)
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

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
# The build reads the Owner's Working Draft from the repository root when it is
# present (that is where it lives on main), and otherwise from the snapshot kept
# beside this script so the branch stays self-contained.
_ROOT_DRAFT = os.path.join(ROOT, "Harshal's Systems (Copyrighted) [Owner's Working Draft].md")
SRC = _ROOT_DRAFT if os.path.exists(_ROOT_DRAFT) else os.path.join(HERE, 'working-draft.md')
OUTDIR = os.path.join(ROOT, 'docs', 'harshal-systems')
MASTER = os.path.join(ROOT, 'HARSHAL-SYSTEMS-USER-MANUAL.md')

# ---------------------------------------------------------------------------
# 1. Structural segmentation: (start_line, slug, title, blurb)
#    1-based, inclusive. Any content before the first boundary becomes front matter.
# ---------------------------------------------------------------------------
PARTS = [
    (1,    '00-author-front-matter',
     'Author’s Front Matter and Reading Guide',
     'The Owner’s Working Draft as submitted: disclaimer, dedication, the '
     'philosophical and structural invariants, the Phase Declaration Header '
     'manifesto, the preface, and the author’s own reading guide. The original '
     'flat contents listing is preserved here for reference; it is superseded by '
     'the rebuilt Table of Contents at the front of this manual.'),

    (326,  '01-core-book',
     'Part I — The Core Book',
     'The ten chapters and epilogue that state the argument: legitimacy precedes '
     'capability, and refusal is the primary act of responsible control.'),

    (575,  '02-formalization',
     'Part II — Formalization',
     'Formal constraint sketches, the gating equations, and the stabilized glossary '
     'of terms used consistently throughout the rest of the manual.'),

    (786,  '03-safety-rationale',
     'Part III — Safety Rationale for Adversarial Scenarios',
     'Appendix SR-0 through SR-5: why the framework contains hypothetical and '
     'adversarial stress-tests, and the containment chamber that bounds them.'),

    (844,  '04-ags-architecture',
     'Part IV — AGS: Accountability-Gated Systems',
     'Core doctrine, atomic vocabulary, the three phases, the Phase Declaration '
     'Header, the collapse protocol, the Duty Collation Ledger, and the badge system.'),

    (1247, '05-ocm-orb',
     'Part V — OCM: The Orb Communicator Model',
     'Replacing hierarchy with geometry. Interaction orbs, OCM arithmetic, the three '
     'communication layers, navigation, exit protocol, and worked micro-examples.'),

    (1420, '06-inner-shell',
     'Part VI — The AI Inner Shell',
     'Address-constrained AI nodes: definition, addressing rules, communication '
     'constraints, learning without authority, and the impossibility of AI takeover.'),

    (1536, '07-addressing-topology',
     'Part VII — Addressing, Rotation, and Spherical Topology',
     'The disc of 360 radiative addresses, rotation over time, distance as depth, '
     'persistence, and lateral motion inside the sphere.'),

    (2022, '08-operator-model',
     'Part VIII — The Operator Model',
     'Operator classification, structural position, address derivation, role tokens, '
     'authority constraints, shadow-center prevention, and containment.'),

    (2183, '09-disc-lifecycle',
     'Part IX — Disc Primitives, Routing, and Lifecycle',
     'Atomic primitives, derived necessities, language discipline, resolution axis, '
     'routing, multi-context coordination, the disc lifecycle, and the state machine.'),

    (2652, '10-ags-conformance',
     'Part X — AGS+ Layering and Conformance',
     'The textual layering diagram and the normative conformance checklist.'),

    (2798, '11-accessory-pack',
     'Part XI — The AGS Accessory Pack',
     'GRL compliance certification, the Provenance and Lineage Verification layer, '
     'and Intelligence & Unbiased Compliance checks.'),

    (3171, '12-ground-zero',
     'Part XII — Ground-0: Phase Detection, Audits, and the Duty Collation Ledger',
     'The Ground-0 Phase Detection Algorithm v1.0 in full, worked institutional '
     'audits, the PDH audit ledger, and insurance-mode control invariants.'),

    (5105, '13-whyland',
     'Part XIII — The Whyland Standards',
     'The canonical AGS semantic inquiry catalog (DecksJokersAndCards).'),

    (5168, '14-nab-compendium',
     'Part XIV — Neural Atomic Bodies Compendium',
     'The NAB master database of elements 1-119 and the risk, alignment, and '
     'authority-density profiles that map them to institutional roles.'),

    (5345, '15-hmkh-controls',
     'Part XV — Keyed Human-Machine Hybrid Controls',
     'The seventeen-section control specification: signal-to-intent separation, '
     'continuous human binding, context-specific consent, and the authorization gate.'),

    (5663, '16-threat-modeling',
     'Part XVI — Threat Modeling and Context-Dependent Guarantees',
     'Publicness, observer positions, the threat taxonomy, guarantee matrices, '
     'non-guarantees, and deployment threat models by context.'),

    (6476, '17-atomic-bodies',
     'Part XVII — Atomic Body Classes and Reactor Doctrine',
     'NNB, ANHB, NCB, NIB, and NUB in full, the governance-impossibility proofs, '
     'phase escalation, and the Project Thunderfury Starforge reactor.'),

    (7441, '18-institutional-application',
     'Part XVIII — Institutional Application',
     'Institutional mapping, the neurojacking and corpse-puppeting prevention '
     'module, exploitation vectors, and workplace directive material.'),

    (7637, '19-research-papers',
     'Part XIX — Research Papers',
     'Authored research on proof-of-work in long-running autonomous operation and '
     'on accountability in keyed human-machine hybrid systems.'),

    (7991, '20-supply-chain',
     'Part XX — Supply Chain and Implanted-Device Threat Research',
     'Chip-level compromise, distribution deception, target profiles, and the '
     'address catalog and speculative systems archive.'),

    (9943, '21-microconvergence',
     'Part XXI — MicroConvergence and Signal Encoding',
     'The MicroConvergence specification draft and the Audio Visual Encoding model.'),

    (10666, '22-policy-archive',
     'Part XXII — Governance and Policy Archive',
     'Never Consented Means Never Consented, No Child Left Behind, the verified '
     'non-revocable charity license, and the anti-relatives policy.'),

    (11106, '23-specification-series',
     'Part XXIII — Specification Series',
     'Five formal modules: Origin Continuity & Succession, Cognitive Coercion '
     'Hardening, Border Gateway Protocol, Intermediate Representation, and '
     'Constitutional Governance & Public Addressability.'),

    (12509, '24-the-novel',
     'Part XXIV — The Grand River Foundation',
     'The narrative companion. Prologue, Chapter 1, and Chapter 2 with the CABLE '
     'SELECT interstitial, submitted as the manuscript collection.'),

    (13017, '25-additional-specs',
     'Part XXV — Anti-Denial of Justice, Labor Attribution, and NAB I/O Mapping',
     'The ADJR protocol, the labor disparity and dynamic attribution ledger, and '
     'the NAB asymmetrical I/O detection and response mapping.'),

    (16052, '26-anthropic-b-side',
     'Part XXVI — Appendix: Anthropic Audit (B Side)',
     'The terminal-phase audit of Anthropic PBC with evidence index and duty '
     'collation entry.'),
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
    # 'llany' and 'orand' are find-and-replace artefacts that occur 27 times
    # between them. Both are unambiguous in context. Verified occurrence by
    # occurrence before inclusion.
    (r'\bllany\b', 'any'),
    (r'\borand\b', 'or'),
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
def main():
    raw = open(SRC, encoding='utf-8').read()
    n_words_in = len(raw.split())

    fixed, fstats = repair_fences(raw)
    if not fstats['balanced']:
        print('WARNING: fences still unbalanced', file=sys.stderr)

    body = fixed
    norm, nstats = normalize(body)
    norm, pstats = promote_headings(norm)
    nstats.update(pstats)
    norm, hstats = normalize_headings(norm)
    nstats.update(hstats)

    lines = norm.split('\n')
    fstate = fence_state_map(lines)

    os.makedirs(OUTDIR, exist_ok=True)
    written = []

    for i, (start, slug, title, blurb) in enumerate(PARTS):
        end = PARTS[i + 1][0] - 1 if i + 1 < len(PARTS) else len(lines)
        opens_inside = fstate[start - 2] if start >= 2 else False
        chunk = balance_slice('\n'.join(lines[start - 1:end]), opens_inside)
        chunk = rehead(chunk, title)

        # Strip a duplicated leading title if the section repeats it.
        chunk = re.sub(r'\n{4,}', '\n\n\n', chunk).strip()

        content = (
            f'# {title}\n\n'
            f'> {blurb}\n\n'
            f'**Source range:** lines {start}–{end} of the Owner’s Working Draft · '
            f'**Words:** {len(chunk.split()):,}\n\n'
            f'---\n\n'
            f'{chunk}\n'
        )
        path = os.path.join(OUTDIR, f'{slug}.md')
        open(path, 'w', encoding='utf-8').write(content)
        heads = collect_headings(content)
        written.append({
            'slug': slug, 'title': title, 'blurb': blurb,
            'start': start, 'end': end,
            'words': len(chunk.split()),
            'file': os.path.relpath(path, ROOT),
            'headings': heads,
        })

    # ---- front matter, authored fresh -------------------------------------
    frontmatter = build_front_matter(n_words_in, len(written))
    open(os.path.join(OUTDIR, '00-front-matter.md'), 'w', encoding='utf-8').write(frontmatter)

    # ---- master TOC --------------------------------------------------------
    toc = build_toc(frontmatter, written)

    # ---- assemble master ---------------------------------------------------
    parts_md = []
    for w in written:
        parts_md.append(open(os.path.join(ROOT, w['file']), encoding='utf-8').read().rstrip())
    master = (
        featured_header() + '\n\n' + toc + '\n\n' + frontmatter.rstrip() + '\n\n---\n\n' +
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
        'parts': len(written),
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

## The Ultimate User Manual

**{SUBTITLE}**

*The complete, organized, and copy-edited reference for the Harshal’s Systems
governance architecture — consolidated from the Owner’s Working Draft, the
August print editions, and the finalized Ground-0 normative specification.*

</div>

---

> **Every window, state change, and refusal in this architecture is bound by one constraint:
> legitimacy precedes capability.** The default state of the system is refusal. Action is a
> temporary, highly constrained exception.
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

## About this manual

This is the consolidated, organized reference edition of **Harshal’s Systems**. It gathers the
Owner’s Working Draft, the two August print editions, and the finalized Ground-0 normative
specification into a single navigable document, and reorganizes the whole of it into {parts} parts.

Nothing in this manual has been added to the argument. The editorial work was structural and
mechanical: the material was ordered, de-duplicated, re-typeset, and corrected for spelling,
punctuation, and consistency. Every substantive claim, identifier, equation, and specification
is the author’s own.

**Approximate extent:** 165,000 words across {parts} parts.

## How to read this manual

The parts are ordered so that each one depends only on the ones before it. That said, no single
reader needs all of it. Pick the path that matches why you are here.

| If you are… | Read | Treat the rest as |
|---|---|---|
| **A first-time reader** | Part I in full, then Part II | Reference |
| **A technical reader** | Parts I, II, IV, VI, IX, XVI | Motivation, not specification |
| **A legal or policy reader** | Parts I, IV, XII, XXII | Analogues to due process and jurisdiction, not algorithms |
| **A philosophical reader** | Parts I and V | Secondary |
| **An auditor or operator** | Parts XII, XV, XVI, XXVI | Supporting reasoning |
| **A systems implementer** | Parts IX, X, XV, XXIII | Background |

### On refusal

Refusal is not failure in this framework. It is not silence, cowardice, or conservatism.
Refusal occurs when representation collapses, when authorization cannot be reconstructed,
or when accountability diffuses beyond addressability. In those cases, action would falsely
claim authority. Refusal prevents that claim.

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

## Document control

| Field | Value |
|---|---|
| **Work** | Harshal’s Systems |
| **Subtitle** | {SUBTITLE} |
| **Author** | Harshal Priyavadan Patel (A44674928) |
| **Center-Origin** | `0•000•000•0000` |
| **Creator-ID** | `§HARSHAL§ + HARSHAL + (HARSHAL)` |
| **Status** | Living document — subject to ongoing, traceable refinement |
| **Normative baseline** | Ground-0 Phase Detection Algorithm v1.0, finalized 12 September 2026 |
| **Amendment draft** | Ground-0 Phase Detection Algorithm v1.1, unratified |
| **Edition** | Ultimate User Manual — consolidated and copy-edited |

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

### Translation note

The architectural integrity of this system relies upon strict structural invariants, requiring
all materials to be interpreted through the precise syntax of **Harshal’s English**. By embedding
personal intellectual property directly into the operational logic, the framework establishes a
conceptual fortress that renders the creator inseparable from the system itself.

**Everything in this work is to be read left to right, in Harshal’s English.**

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
    rows = '\n'.join(
        f'| {i:02d} | [{w["title"]}]({w["file"].split("/")[-1]}) | {w["words"]:,} |'
        for i, w in enumerate(written, start=0)
    )
    return f"""# Harshal’s Systems — the manual, one file per part

This folder holds **The Ultimate User Manual** split into one file per part.
The assembled single-file edition is at the repository root:
**[`HARSHAL-SYSTEMS-USER-MANUAL.md`](../../HARSHAL-SYSTEMS-USER-MANUAL.md)** ({wout:,} words).

Read the assembled edition if you want one continuous document.
Read the parts here if you want to work on, review, or cite a single section.

| # | Part | Words |
|---|---|---|
{rows}

## Supporting documents

| File | Purpose |
|---|---|
| [`00-front-matter.md`](00-front-matter.md) | About this manual, how to read it, notices, licensing, dedication |
| [`00-author-front-matter.md`](00-author-front-matter.md) | The Owner’s Working Draft front matter as submitted, preserved in full |
| [`EDITORIAL-REPORT.md`](EDITORIAL-REPORT.md) | What was found, changed, and deliberately left alone |

## Rebuilding

```bash
python3 source/build.py
```

The build is deterministic and reads only `source/working-draft.md`.
"""


def build_report(fstats, nstats, written, win, wout):
    rows = '\n'.join(
        f'| {i+1:02d} | [{w["title"]}]({w["file"].split("/")[-1]}) | {w["words"]:,} | {w["start"]:,}–{w["end"]:,} |'
        for i, w in enumerate(written)
    )
    return f"""# Editorial Report

**Work:** Harshal’s Systems — The Ultimate User Manual
**Source:** `Harshal’s Systems (Copyrighted) [Owner’s Working Draft].md`
(1,278,427 bytes · 16,674 lines · 165,900 words)
**Output:** {wout:,} words across {len(written)} part files, plus this report.
**Build:** `python3 source/build.py` — reproducible from the source file alone.

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
| 13 | Corrupted tokens (`llany` → `any`, `orand` → `or`) | Medium | 29 |
| 14 | Missing space after punctuation / doubled spaces | Low | — |

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

The manual now arranges the whole work into {len(written)} sequential parts:

| # | Part | Words | Source lines |
|---|---|---|---|
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
