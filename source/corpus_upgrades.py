#!/usr/bin/env python3
"""
Harshal's Systems — Corpus Architecture, Provenance Taxonomy, Conceptual
Corrections, Research Layering, and Part XXVII Generator (Priorities 1–5).

Imported by `source/build.py` to keep the build deterministic and modular.
"""

import os
import re
import glob
import json

CANONICAL_MINIMUM_MODEL = (
    "Identity → Representation → Authorization → Continuity → Accountability → Refusal"
)
CANONICAL_DECISION_FLOW = (
    "Identity → Representation → Authorization → Continuity → Accountability → Decision (Permit | Refuse)"
)

_CANONICAL_JSON_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "specs", "normative", "canonical.json"
)
_COMPONENT_INTERFACES = {}
if os.path.exists(_CANONICAL_JSON_PATH):
    with open(_CANONICAL_JSON_PATH, encoding="utf-8") as _f:
        _c_data = json.load(_f)
        for _comp in _c_data.get("components", []):
            _COMPONENT_INTERFACES[_comp["slug"]] = _comp

# ---------------------------------------------------------------------------
# Priority 1 & 2: Functional Collections & Per-Module Metadata Registry
# ---------------------------------------------------------------------------
# Reference-module counts follow the repository's `wc -w` convention and must
# be refreshed alongside their collection rows whenever the source changes.
REFERENCE_MODULES = {
    "uts-reference": {
        "title": "Universal Timekeeping System — Corrected Reference Module",
        "file": "modules/uts.md",
        "provenance_class": "DERIVATIVE_BUILD",
        "status_taxonomy": "DERIVATIVE_REFERENCE_MODULE",
        "evidence_status": "CALCULATED_FROM_STATED_DEFINITIONS",
        "words": 537,
    },
    "convergence-institutions": {
        "title": "Convergence Institutions — Fictional Reference Module",
        "file": "modules/convergence-institutions.md",
        "provenance_class": "FICTION",
        "status_taxonomy": "NARRATIVE_REFERENCE_MODULE",
        "evidence_status": "NARRATIVE_SANDBOX",
        "words": 352,
    },
    "grand-architecture": {
        "title": "The Grand Architecture — Convergence-Era Infrastructure Architecture Module",
        "file": "modules/grand-architecture.md",
        "provenance_class": "FICTION",
        "status_taxonomy": "NARRATIVE_ARCHITECTURE_MODULE",
        "evidence_status": "NARRATIVE_SANDBOX",
        "words": 1732,
    },
}


def collection_entries(collection):
    """Return collection parts and reference modules in their authored order."""
    modules_after = {}
    for item in collection.get("reference_modules", []):
        module_id = item["id"]
        if module_id not in REFERENCE_MODULES:
            raise ValueError(f"Unknown reference module: {module_id}")
        modules_after.setdefault(item["after"], []).append(("reference", module_id))

    entries = []
    for slug in collection["parts"]:
        entries.append(("part", slug))
        entries.extend(modules_after.pop(slug, []))
    if modules_after:
        unknown_anchors = ", ".join(sorted(modules_after))
        raise ValueError(f"Reference-module anchor is not a collection part: {unknown_anchors}")
    return entries


COLLECTIONS = [
    {
        "id": "01-foundations",
        "title": "Collection I — Foundational Doctrine & Core Book",
        "research_layer": "PUBLIC_RESEARCH_SUMMARY",
        "description": (
            "Establishes the core thesis of Harshal's Systems (legitimacy precedes capability), "
            "the Canonical Minimum Model (Identity → Representation → Authorization → Continuity → "
            "Accountability → Refusal), the formal legitimacy equation L(S,t), the Declared-Type "
            "Terminology Registry, and the Safety Rationale."
        ),
        "parts": ["00-front-matter", "00-author-front-matter", "01-core-book", "02-formalization", "03-safety-rationale"],
    },
    {
        "id": "02-ags-ocm-core",
        "title": "Collection II — AGS+ & Orb Communicator Architecture",
        "research_layer": "DEFENSIVE_SPECIFICATION",
        "description": (
            "Defines Accountability-Gated Systems (AGS+), the Orb Communicator Model (OCM) "
            "Disc-to-Sphere topological projection, the ℤ_360 (0–359) discrete address domain vs. "
            "360° return-to-origin closure notation, the AI Inner Shell, the Human Operator Model, "
            "and AGS+ conformance invariants."
        ),
        "parts": [
            "04-ags-architecture", "05-ocm-orb", "06-inner-shell", "07-addressing-topology",
            "08-operator-model", "09-disc-lifecycle", "10-ags-conformance", "11-accessory-pack"
        ],
    },
    {
        "id": "03-ground-zero-nab",
        "title": "Collection III — Ground-0 Phase Detection & Neural Atomic Bodies",
        "research_layer": "DEFENSIVE_SPECIFICATION",
        "description": (
            "Contains the finalized Ground-0 Phase Detection Algorithm (v1.0 normative / v1.1 draft), "
            "institutional re-badging case studies (NAB / CWO / GSRB), the Whyland Standards, the "
            "119 Neural Atomic Bodies (NAB) Compendium, Human–Machine Keyed Hybrid (HMKH) controls, "
            "and institutional role mappings."
        ),
        "parts": [
            "12-ground-zero", "13-whyland", "14-nab-compendium", "15-hmkh-controls",
            "17-atomic-bodies", "18-institutional-application"
        ],
    },
    {
        "id": "04-flagship-research",
        "title": "Collection IV — Flagship Keyed Human–Machine Research, Threat Models & Supporting Policy Archive",
        "research_layer": "PUBLIC_RESEARCH_SUMMARY",
        "description": (
            "Led by the flagship research paper 'Accountability in Keyed Human–Machine Hybrid Systems' "
            "(Part XIX), paired with adversarial threat research (Part XVI AGS++ Threat Modeling and "
            "Part XX Supply Chain Attack Vector++), emerging compute architectures (Part XXI "
            "MicroConvergence & AVE), the Supporting Policy & Governance Research Archive (Part XXII), "
            "and a corrected derivative UTS reference module."
        ),
        "parts": [
            "19-research-papers", "16-threat-modeling", "20-supply-chain",
            "21-microconvergence", "22-policy-archive"
        ],
        "reference_modules": [
            {"id": "uts-reference", "after": "20-supply-chain"},
        ],
    },
    {
        "id": "05-constitutional-specs",
        "title": "Collection V — Defensive Constitutional Specification Series",
        "research_layer": "DEFENSIVE_SPECIFICATION",
        "description": (
            "The formal modular specification series: CHE++/EOL-v1.0 (Cognitive Coercion-Hardening), "
            "CGPA-v1.0 (Common-Good Public Addressability), OCS-v1.0 (Origin Continuity), "
            "ADJR-v1.0 (Anti-Denial of Justice & Resilience), and companion defensive protocols."
        ),
        "parts": ["23-specification-series", "25-additional-specs"],
    },
    {
        "id": "06-incident-audits",
        "title": "Collection VI — Incident Record & External Platform Audits",
        "research_layer": "INCIDENT_AND_AUDIT_RECORD",
        "description": (
            "Separates external platform compliance audits (Anthropic A-Side/B-Side, OpenAI) and "
            "first-person incident chronology from normative specifications, with explicit "
            "[INDEPENDENTLY_VERIFIABLE] vs. [AUTHOR_REPORTED] evidence attribution."
        ),
        "parts": ["26-anthropic-b-side"],
    },
    {
        "id": "07-companion-fiction-and-corpus",
        "title": "Collection VII — Book II Fictional Companion Preview & Part XXVII Whole Corpus",
        "research_layer": "PUBLIC_RESEARCH_SUMMARY",
        "description": (
            "Houses the synchronized Book II — Preview ('The Grand River Foundation', a ~2100 CE "
            "narrative sandbox), The Grand Architecture module that composes the Convergence-era "
            "setting into one named architecture, a clearly labeled fictional reference module for "
            "Convergence institutions, and Part XXVII ('Whole Corpus / Complete Work'), the umbrella "
            "architectural synthesis and master index. The preview's first operational module is "
            "targeted circa 2046; 2098 is an interim milestone, not final completion; Mistveil targets "
            "~80 million residents by 2100."
        ),
        "parts": ["24-the-novel", "27-whole-corpus"],
        "reference_modules": [
            {"id": "convergence-institutions", "after": "24-the-novel"},
            {"id": "grand-architecture", "after": "24-the-novel"},
        ],
    },
]

PART_METADATA = {
    "00-front-matter": {
        "part_num": "Front Matter",
        "book": "Book I",
        "collection": "01-foundations",
        "provenance_class": "DERIVATIVE_BUILD",
        "status_taxonomy": "UMBRELLA_INDEX",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "PUBLIC_RESEARCH_SUMMARY",
    },
    "00-author-front-matter": {
        "part_num": "Author's Front Matter",
        "book": "Book I",
        "collection": "01-foundations",
        "provenance_class": "ARCHIVE",
        "status_taxonomy": "CONCEPTUAL_DOCTRINE",
        "evidence_status": "AUTHOR_REPORTED",
        "research_layer": "PUBLIC_RESEARCH_SUMMARY",
    },
    "01-core-book": {
        "part_num": "Part I",
        "book": "Book I",
        "collection": "01-foundations",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "CONCEPTUAL_DOCTRINE",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "PUBLIC_RESEARCH_SUMMARY",
    },
    "02-formalization": {
        "part_num": "Part II",
        "book": "Book I",
        "collection": "01-foundations",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "NORMATIVE_SPEC",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "DEFENSIVE_SPECIFICATION",
    },
    "03-safety-rationale": {
        "part_num": "Part III",
        "book": "Book I",
        "collection": "01-foundations",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "NORMATIVE_SPEC",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "DEFENSIVE_SPECIFICATION",
    },
    "04-ags-architecture": {
        "part_num": "Part IV",
        "book": "Book I",
        "collection": "02-ags-ocm-core",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "NORMATIVE_SPEC",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "DEFENSIVE_SPECIFICATION",
    },
    "05-ocm-orb": {
        "part_num": "Part V",
        "book": "Book I",
        "collection": "02-ags-ocm-core",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "NORMATIVE_SPEC",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "DEFENSIVE_SPECIFICATION",
    },
    "06-inner-shell": {
        "part_num": "Part VI",
        "book": "Book I",
        "collection": "02-ags-ocm-core",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "NORMATIVE_SPEC",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "DEFENSIVE_SPECIFICATION",
    },
    "07-addressing-topology": {
        "part_num": "Part VII",
        "book": "Book I",
        "collection": "02-ags-ocm-core",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "NORMATIVE_SPEC",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "DEFENSIVE_SPECIFICATION",
    },
    "08-operator-model": {
        "part_num": "Part VIII",
        "book": "Book I",
        "collection": "02-ags-ocm-core",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "NORMATIVE_SPEC",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "DEFENSIVE_SPECIFICATION",
    },
    "09-disc-lifecycle": {
        "part_num": "Part IX",
        "book": "Book I",
        "collection": "02-ags-ocm-core",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "NORMATIVE_SPEC",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "DEFENSIVE_SPECIFICATION",
    },
    "10-ags-conformance": {
        "part_num": "Part X",
        "book": "Book I",
        "collection": "02-ags-ocm-core",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "NORMATIVE_SPEC",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "DEFENSIVE_SPECIFICATION",
    },
    "11-accessory-pack": {
        "part_num": "Part XI",
        "book": "Book I",
        "collection": "02-ags-ocm-core",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "NORMATIVE_SPEC",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "DEFENSIVE_SPECIFICATION",
    },
    "12-ground-zero": {
        "part_num": "Part XII",
        "book": "Book I",
        "collection": "03-ground-zero-nab",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "CASE_STUDY_AUDIT",
        "evidence_status": "MIXED_VERIFIED_AND_REPORTED",
        "research_layer": "DEFENSIVE_SPECIFICATION",
    },
    "13-whyland": {
        "part_num": "Part XIII",
        "book": "Book I",
        "collection": "03-ground-zero-nab",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "CONCEPTUAL_DOCTRINE",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "DEFENSIVE_SPECIFICATION",
    },
    "14-nab-compendium": {
        "part_num": "Part XIV",
        "book": "Book I",
        "collection": "03-ground-zero-nab",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "NORMATIVE_SPEC",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "DEFENSIVE_SPECIFICATION",
    },
    "15-hmkh-controls": {
        "part_num": "Part XV",
        "book": "Book I",
        "collection": "03-ground-zero-nab",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "NORMATIVE_SPEC",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "DEFENSIVE_SPECIFICATION",
    },
    "16-threat-modeling": {
        "part_num": "Part XVI",
        "book": "Book I",
        "collection": "04-flagship-research",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "RESEARCH_PAPER",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "THREAT_RESEARCH",
    },
    "17-atomic-bodies": {
        "part_num": "Part XVII",
        "book": "Book I",
        "collection": "03-ground-zero-nab",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "NORMATIVE_SPEC",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "DEFENSIVE_SPECIFICATION",
    },
    "18-institutional-application": {
        "part_num": "Part XVIII",
        "book": "Book I",
        "collection": "03-ground-zero-nab",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "NORMATIVE_SPEC",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "DEFENSIVE_SPECIFICATION",
    },
    "19-research-papers": {
        "part_num": "Part XIX",
        "book": "Book I",
        "collection": "04-flagship-research",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "RESEARCH_PAPER",
        "evidence_status": "INDEPENDENTLY_VERIFIABLE",
        "research_layer": "PUBLIC_RESEARCH_SUMMARY",
    },
    "20-supply-chain": {
        "part_num": "Part XX",
        "book": "Book I",
        "collection": "04-flagship-research",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "RESEARCH_PAPER",
        "evidence_status": "MIXED_VERIFIED_AND_REPORTED",
        "research_layer": "THREAT_RESEARCH",
    },
    "21-microconvergence": {
        "part_num": "Part XXI",
        "book": "Book I",
        "collection": "04-flagship-research",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "RESEARCH_PAPER",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "PUBLIC_RESEARCH_SUMMARY",
    },
    "22-policy-archive": {
        "part_num": "Part XXII",
        "book": "Book I",
        "collection": "04-flagship-research",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "SUPPORTING_POLICY_RESEARCH",
        "evidence_status": "INDEPENDENTLY_VERIFIABLE",
        "research_layer": "PUBLIC_RESEARCH_SUMMARY",
    },
    "23-specification-series": {
        "part_num": "Part XXIII",
        "book": "Book I",
        "collection": "05-constitutional-specs",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "NORMATIVE_SPEC",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "DEFENSIVE_SPECIFICATION",
    },
    "24-the-novel": {
        "part_num": "Part XXIV",
        "book": "Book II (Preview Mirror in Book I)",
        "collection": "07-companion-fiction-and-corpus",
        "provenance_class": "FICTION",
        "status_taxonomy": "FICTION_PREVIEW",
        "evidence_status": "NARRATIVE_SANDBOX",
        "research_layer": "PUBLIC_RESEARCH_SUMMARY",
    },
    "25-additional-specs": {
        "part_num": "Part XXV",
        "book": "Book I",
        "collection": "05-constitutional-specs",
        "provenance_class": "CANONICAL_SOURCE",
        "status_taxonomy": "NORMATIVE_SPEC",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "DEFENSIVE_SPECIFICATION",
    },
    "26-anthropic-b-side": {
        "part_num": "Part XXVI",
        "book": "Book I",
        "collection": "06-incident-audits",
        "provenance_class": "AUDIT",
        "status_taxonomy": "CASE_STUDY_AUDIT",
        "evidence_status": "MIXED_VERIFIED_AND_REPORTED",
        "research_layer": "INCIDENT_AND_AUDIT_RECORD",
    },
    "27-whole-corpus": {
        "part_num": "Part XXVII",
        "book": "Book I & Book II Umbrella",
        "collection": "07-companion-fiction-and-corpus",
        "provenance_class": "DERIVATIVE_BUILD",
        "status_taxonomy": "UMBRELLA_INDEX",
        "evidence_status": "FORMAL_AXIOMATIC",
        "research_layer": "PUBLIC_RESEARCH_SUMMARY",
    },
}


def format_metadata_header(slug, title, start_line, end_line, word_count, include_yaml=True):
    """Build machine-readable YAML frontmatter + visible Provenance table."""
    meta = PART_METADATA.get(slug, PART_METADATA["01-core-book"])
    iface = _COMPONENT_INTERFACES.get(slug, {
        "id": f"HS-{slug.upper()}",
        "canonical_name": title,
        "depends_on": [],
        "defines": [],
        "uses": [],
        "invariants": [],
        "conflicts_with": [],
        "status": meta["status_taxonomy"],
    })
    yaml_block = ""
    if include_yaml:
        yaml_block = (
            f"---\n"
            f"id: {iface['id']}\n"
            f"document_id: HS-{slug.upper()}\n"
            f"canonical_name: {json.dumps(iface['canonical_name'], ensure_ascii=False)}\n"
            f"depends_on: {json.dumps(iface['depends_on'], ensure_ascii=False)}\n"
            f"defines: {json.dumps(iface['defines'], ensure_ascii=False)}\n"
            f"uses: {json.dumps(iface['uses'], ensure_ascii=False)}\n"
            f"invariants: {json.dumps(iface['invariants'], ensure_ascii=False)}\n"
            f"conflicts_with: {json.dumps(iface['conflicts_with'], ensure_ascii=False)}\n"
            f"status: {iface['status']}\n"
            f"book: \"{meta['book']}\"\n"
            f"part: \"{meta['part_num']}\"\n"
            f"title: \"{title}\"\n"
            f"collection: \"{meta['collection']}\"\n"
            f"provenance_class: {meta['provenance_class']}\n"
            f"status_taxonomy: {meta['status_taxonomy']}\n"
            f"evidence_status: {meta['evidence_status']}\n"
            f"research_layer: {meta['research_layer']}\n"
            f"canonical_minimum_model: \"{CANONICAL_MINIMUM_MODEL}\"\n"
            f"canonical_decision_flow: \"{CANONICAL_DECISION_FLOW}\"\n"
            f"author: \"Harshal Priyavadan Patel (A44674928)\"\n"
            f"origin_anchor: \"0•000•000•0000\"\n"
            f"source_lines: \"{start_line}–{end_line}\"\n"
            f"words: {word_count}\n"
            f"---\n\n"
        )
    table_block = (
        f"| Provenance Class | Status Taxonomy | Evidence Status | Research Layer | Book / Collection |\n"
        f"| :--- | :--- | :--- | :--- | :--- |\n"
        f"| `{meta['provenance_class']}` | `{meta['status_taxonomy']}` | `{meta['evidence_status']}` | "
        f"`{meta['research_layer']}` | **{meta['book']}** (`{meta['collection']}`) |\n\n"
    )
    return yaml_block, table_block


# ---------------------------------------------------------------------------
# Priority 3 & 4: Per-Part Conceptual Corrections & Research Layering
# ---------------------------------------------------------------------------
def apply_part_corrections(slug, chunk):
    """Apply Priority 3 conceptual corrections and Priority 4 research framing."""

    # 1. Part I (01-core-book):
    #    - Fix Chapter 6.2 justifiable action / agency wording
    #    - Clarify Harshal's English as [TYPE: AUTHORIAL_REGISTER]
    #    - Formalize Delegation vs. Migration of Legitimacy
    if slug == "01-core-book":
        chunk = chunk.replace(
            "However, as of September 2026, it is recognized that systems with sufficient processing capability may cross into the realm of justifiable action, possessing the capacity to explain themselves, accept mandates, and respond to inquiry.",
            "However, as of September 2026, while systems with sufficient processing capability may generate complex explanations, accept delegated operational mandates, and respond to inquiry, computational capability never confers moral or legal agency (`[TYPE: SECURITY_PRIMITIVE — INV-AGENCY-001]`): the system remains a deterministic instrument whose execution is justifiable only through its keyed human principal."
        )
        chunk = chunk.replace(
            "Everything in this work is to be read left to right, in Harshal’s English.",
            "Everything in this work is to be read left to right, in **Harshal’s English** (`[TYPE: AUTHORIAL_REGISTER]` — an authorial drafting register and human-legible reading discipline; operational enforcement relies strictly on formal mathematical and cryptographic invariants rather than natural-language phrasing)."
        )
        delegation_note = (
            "\n\n> [!IMPORTANT]\n"
            "> **Formal Distinction — Delegation of Execution vs. Migration of Legitimacy (`INV-LEGIT-001`):** "
            "Throughout this work, **operational execution may be delegated**, but **legitimacy never migrates**. "
            "When a keyed human principal (`H = 1` at Center Origin `0•000•000•0000`) assigns a bounded task to a machine or "
            "sub-agent chain (`d = 1..k`), only task execution is delegated. The underlying legitimacy remains permanently "
            "anchored in the human key. If the human key expires, revokes authorization, or loses addressability, delegated "
            "execution halts immediately; no computational component can ever inherit, self-renew, or migrate legitimacy into itself.\n"
        )
        chunk = delegation_note.lstrip() + "\n" + chunk

    # 2. Part II (02-formalization):
    #    - Add Canonical Minimum Model & Declared-Type Terminology Registry (aligned with specs/normative/canonical-model.md)
    elif slug == "02-formalization":
        chunk = chunk.replace(
            "It translates the arguments of Harshal’s English into symbolic logic",
            "It translates the prose arguments drafted in **Harshal’s English** (`[TYPE: AUTHORIAL_REGISTER]`) into binding symbolic invariants (`[TYPE: SECURITY_PRIMITIVE]`)"
        )
        type_registry = """
## Canonical Minimum Model & Declared-Type Terminology Registry

> **Normative Reference:** The single authoritative formal contract governing all symbols, legitimacy equations, human-key properties, accountability layers, and phase types is **[`specs/normative/canonical-model.md`](../../specs/normative/canonical-model.md)** (machine registry: **[`specs/normative/canonical.json`](../../specs/normative/canonical.json)** · reconciliation ledger: **[`specs/normative/contradictions.md`](../../specs/normative/contradictions.md)**).

### The Six-Stage Canonical Minimum Model (`INV-STAGE-001`)

Every legitimate operation across **Harshal's Systems** traverses five sequential upstream prerequisites followed by a sixth **terminal decision gate**:

```text
Identity
→ Representation
→ Authorization
→ Continuity
→ Accountability
→ Decision
   ├─ Permit
   └─ Refuse
```

1. **Identity (`I`, `H(t) ∈ {0,1}`)** `[TYPE: SECURITY_PRIMITIVE]`: A persistent, non-anonymous natural-person principal is identified at Center Origin (`0•000•000•0000`).
2. **Representation (`R(t) ∈ [0,1]`)** `[TYPE: SECURITY_PRIMITIVE]`: The system verifies an unbroken delegation chain linking system action to the authorized human principal.
3. **Authorization (`V(S,t) ∈ {0,1}`)** `[TYPE: SECURITY_PRIMITIVE]`: Bounded operational permission is granted for a specific scope (`S`), phase, and duration (`Δt ≤ δ`); execution may be *delegated*, but legitimacy never *migrates* (`INV-LEGIT-001`).
4. **Continuity (`C(t) ∈ {0,1}`)** `[TYPE: SECURITY_PRIMITIVE]`: Upstream runtime continuity condition—session-tuple bindings (`Session-ID`, `Boot-ID`, `PDH-ID`, `Human-Attestation-ID`), `V(S,t) = 1`, and temporal freshness (`Δt < δ`) must hold before the legitimacy function `f` is evaluated (`CL-003`).
5. **Accountability (`K(t) ∈ {0,1}`)** `[TYPE: SECURITY_PRIMITIVE]`: Upstream accountability gate (`K(t) = K_tech(t) × K_ops(t)`), disambiguated from **Addressability (`A(t) ∈ [0,1]`)** so that `A` is reserved exclusively for Addressability (`CL-001`). Separated into **Technical Attribution (`K_tech`)**, **Operational Accountability (`K_ops`)**, **Legal Responsibility (`K_legal`)**, and separate **Institutional Solvency (`U_solv`)** (`CL-006`).
6. **Decision (`x(t) ∈ {Permit, Refuse}`)** `[TYPE: SECURITY_PRIMITIVE]`: The **terminal decision gate** (`CL-004`). Emits `Permit` iff `H(t) = 1`, `C(t) = 1`, `K(t) = 1`, and `L(t) ≥ τ`; otherwise emits the default fail-closed outcome `Refuse` (`HALT`). *(Where legacy shorthand writes `"Identity → Representation → Authorization → Continuity → Accountability → Refusal"`, the sixth token `"Refusal"` denotes this `Decision` gate named by its default fail-closed branch.)*

### Canonical Legitimacy Equation & Derived Forms (`INV-LEGIT-EQ-001` · `CL-002`)

- **Canonical Form (when upstream preconditions `C(t) = 1` and `K(t) = 1` hold):**
  ```text
  L(t) = H(t) × f(A(t), R(t), S(t))
  ```
- **Expanded Canonical Form (with upstream binary gates explicit):**
  ```text
  L(t) = H(t) × C(t) × K(t) × f(A(t), R(t), S(t))
  ```
- **Reference Kernel Implementation Approximation (`js/kernel.js`):** `L(t) = H(t) × A(t) × R(t) × S(t)` over `[0,1]³`.
- **Historical Boolean Shorthand (`CL-002`):** `L(S,t) = A · R · V(S,t)` (where `A` is **Addressability**, `R` is **Representation**, and `V(S,t)` bundles `H(t)`, `C(t)`, and `S(t)`).
- **Paired Scope Semantics (`CL-010`):** Scope is the pair `(S_dom(t) ⊆ S_0, S(t) = Smax × max(0, 1 − Δt/δ))`; when `S(t) = 0` or `L(t) < τ`, the effective permitted action set collapses to `S_eff(t) = ∅`.

### Human Key (`H(t)`) Operational Property & Verification Matrix (`CL-005`)

| Operational Property | Production Verification Status | Browser Demo Status (`[DEMO-LIMITATION]`) |
| :--- | :--- | :--- |
| **Human Identity** | `externally attested` | `not technically provable` |
| **Key Possession** | `cryptographically verifiable` | `system-observable` (local public-phrase HMAC) |
| **Liveness** | `system-observable` & `externally attested` | `system-observable` (timer window `δ = 240s` only) |
| **Authorization / Consent Attestation** | Grant is `cryptographically verifiable`; non-coercion & conscious intent are `assumed` / `externally attested` and `not technically provable` | `system-observable` ceremony state; `not technically provable` for consent/intent |
| **Representation Integrity** | `cryptographically verifiable` & `system-observable` | `system-observable` (local session tuple & SHA-256 receipt) |

### Declared-Type Terminology Table

To prevent category confusion between cryptographic enforcement primitives, geometric topology, governance bodies, and authorial prose conventions, every major term in this corpus carries an explicit **Declared Type**:

| Term / Symbol | Declared Type | Formal Role & Boundary |
| :--- | :--- | :--- |
| **`L(t) = H(t) × f(A(t), R(t), S(t))`** | `[TYPE: SECURITY_PRIMITIVE]` | **Canonical legitimacy equation** (subject to upstream `C(t)=1, K(t)=1`). Historical boolean shorthand `L(S,t) = A · R · V(S,t)` is a derived reduction where `A` = Addressability (`CL-001`, `CL-002`). |
| **Human Key (`H(t) ∈ {0,1}`)** | `[TYPE: SECURITY_PRIMITIVE]` | Binary human-key state decomposed into 5 operational properties (`CL-005`); computational components are never moral or legal agents (`INV-AGENCY-001`). |
| **Addressability (`A(t)`) vs. Accountability (`K(t)`)** | `[TYPE: SECURITY_PRIMITIVE]` | `A(t) ∈ [0,1]` is Addressability; `K(t) ∈ {0,1}` is Accountability (`K_tech`, `K_ops`), separated from external `K_legal` and `U_solv` (`CL-001`, `CL-006`). |
| **Phase Declaration Header (`PDH`)** | `[TYPE: SECURITY_PRIMITIVE]` | Mandatory wire-level and document-level header binding origin, `DeclaredPhase ∈ {NAB, CWO, GSRB}`, and scope. |
| **Delegation vs. Migration (`INV-LEGIT-001`)** | `[TYPE: SECURITY_PRIMITIVE]` | Execution may be delegated across bounded hops (`d ≤ k`); legitimacy never migrates from the human key to silicon or corporate shells. |
| **Orb Communicator Model (`OCM`)** | `[TYPE: TOPOLOGICAL_MODEL]` | Bounded radial/angular communication geometry where the **2D Disc (`D²`)** is the pedagogical cross-section and the **3D Sphere (`S²/B³`)** is the full operational manifold. |
| **Address Ring `ℤ_360` (`0–359`)** | `[TYPE: TOPOLOGICAL_MODEL]` | Discrete 360-slot integer address domain (`000` = Center Origin; `001–359` = peripheral sectors). |
| **`360°` Closure Notation (`360° ≡ 0°`)** | `[TYPE: TOPOLOGICAL_MODEL]` | Topological return-to-origin phase notation indicating full-cycle closure back to `0°`; never a 361st address slot. |
| **Ground-0 Phase (`DeclaredPhase` vs. `DetectedPhase`)** | `[TYPE: DIAGNOSTIC_CLASSIFICATION]` | `DeclaredPhase = {NAB, CWO, GSRB}`; `DetectedPhase = {NAB, CWO, NAB-Constrained, GSRB, AMBIGUOUS, INCOHERENT}` (`CL-012`, `INV-G0-CLASS-001`). |
| **119 Neural Atomic Bodies (`NAB 1–119`)** | `[TYPE: DIAGNOSTIC_CLASSIFICATION]` | Canonical taxonomy of bounded cognitive/institutional risk geometries and failure modes. |
| **AGS+ / HMKH / ADJR-v1.0 / CHE++ / CGPA / OCS** | `[TYPE: PROTOCOL_SPECIFICATION]` | Normative defensive protocol specifications enforcing the Canonical Minimum Model. |
| **500-Coin Pool & Underwriting Houses (`U_solv`)** | `[TYPE: GOVERNANCE_INSTITUTION]` | Physical artifact-bound governance quorum and catastrophic risk underwriting structure (`U_solv`). |
| **Harshal's English** | `[TYPE: AUTHORIAL_REGISTER]` | The author's normative English drafting style and left-to-right reading discipline. It is an authorial register, **not** a runtime security primitive. |
| ***The Grand River Foundation* (`Book II — Preview`)** | `[TYPE: NARRATIVE_SANDBOX]` | Standalone ~2100 fictional companion novel illustrating mature implementations of Book I. |
"""
        chunk = type_registry.strip() + "\n\n---\n\n" + chunk

    # 3. Part III (03-safety-rationale):
    elif slug == "03-safety-rationale":
        chunk = chunk.replace(
            "Everything in this work is to be read left to right, in Harshal’s English.",
            "Everything in this work is to be read left to right, in **Harshal’s English** (`[TYPE: AUTHORIAL_REGISTER]` — authorial prose register, distinct from `[TYPE: SECURITY_PRIMITIVE]` formal enforcement)."
        )

    # 4. Part V, VII, IX (OCM Disc -> Sphere, 0-359 vs 360°, Resolution Axis, Routing Precedence, Emergency Legitimacy, Failure Crosswalk):
    elif slug in ("05-ocm-orb", "07-addressing-topology", "09-disc-lifecycle"):
        ocm_clarification = (
            "> [!NOTE]\n"
            "> **OCM Geometric, Routing & Resolution Axis Invariants (`[TYPE: TOPOLOGICAL_MODEL]` · `specs/normative/canonical-model.md` §8–§10):**\n"
            "> 1. **Disc → Sphere Representation (`D² ↪ B³`):** In the Orb Communicator Model, the **2D Disc** (`r ∈ [0,1], θ ∈ [0°,359°]`) "
            "and the **3D Sphere** (`(r, θ, φ)`) are dual representations of the same architecture. The flat Disc is the pedagogical equatorial "
            "cross-section used to define radial authority depth and sector boundaries; as operational state scales across multiple axes, the Disc "
            "closes topologically into the full 3D Spherical manifold with the human key at the geometric center (`r = 0`).\n"
            "> 2. **`0–359` Address Domain vs. `360°` Return-to-Origin Notation:** The discrete sector address space is strictly the 360-element "
            "integer ring `ℤ_360 = {0, 1, 2, ..., 359}` (`DDD ∈ [000, 359]`), where `0` (`000`) is reserved for Center Origin (`0•000•000•0000`). "
            "There is no address `360`. Whenever `360°` appears in lifecycle or degree tables, it is a **return-to-origin phase notation (`360° ≡ 0° mod 360`)** "
            "signifying that a full operational cycle has closed back to the human origin at `0°`.\n"
            "> 3. **Boxed Resolution Axis Invariant (`INV-AXIS-001`):** **Resolution is an authority-resolution mechanism, not an authority source.** "
            "The model strictly separates five operations: *Generate legitimacy* (Human Key at Center Origin only), *Resolve legitimacy* (Resolution Axis), "
            "*Transmit legitimacy state* (radial channels), *Interrupt execution* (radial halt), and *Execute an operation* (peripheral disc within `S_eff(t)`).\n"
            "> 4. **Routing Cost & Authority Precedence (`CL-007`):** Statements that *resolution is faster than coordination* hold formally as "
            "(Option A, `[STRUCTURAL]`/`[ASSUMPTION]`) `Cost_resolution < Cost_lateral` over logical authority-verification hops under the Direct Attachment Axiom, "
            "and (Option B, `[NORMATIVE]`/`[ENFORCEMENT]`) **Authoritative action must traverse the resolution path; lateral coordination cannot authorize, override, or commit state; resolution has precedence over coordination (`Resolution ≻ Coordination`).**\n"
            "> 5. **Emergency Legitimacy Invariant (`INV-EMERG-001`):** **Emergency conditions never generate legitimacy.** Emergency execution requires either "
            "`Emergency → activate pre-authorized bounded emergency context` or `Emergency → request/receive externally issued emergency authorization → bounded emergency disc`, "
            "never spontaneous legitimacy.\n\n"
        )
        if slug == "09-disc-lifecycle":
            crosswalk = (
                "### Cross-Layer Failure Semantics Crosswalk (`CL-011`)\n\n"
                "While the 10-stage Disc Lifecycle (`Nonexistent → Specified → Created → Attached → Active → Delegating → Interrupted → Active → Expired → Terminated`) governs disc state, stopping conditions project simultaneously across six architectural layers:\n\n"
                "| Layer | Failure State |\n"
                "| :--- | :--- |\n"
                "| **Decision Gate** | `Refuse` (`HALT`) |\n"
                "| **Disc** | `Interrupted` |\n"
                "| **Session** | `Suspended` (`non-acting`) |\n"
                "| **Capability profile** | `Signaling-only / reduced` |\n"
                "| **Security response** | `Key/session burn` |\n"
                "| **Lifecycle** | `Terminated` |\n\n"
            )
            ocm_clarification = ocm_clarification + crosswalk
        chunk = ocm_clarification + chunk

    # 5. Part XII (12-ground-zero):
    #    - Mark independently verified vs. author-reported material
    #    - Formalize DeclaredPhase vs. DetectedPhase and Reclassification vs. Transition
    elif slug == "12-ground-zero":
        evidence_banner = (
            "> [!IMPORTANT]\n"
            "> **Research Layer, Phase Types & Reclassification Invariants (`Part XII` · `specs/normative/canonical-model.md` §11):**\n"
            "> 1. **Evidence Attribution:** This Part combines two distinct evidence classes that must not be conflated: "
            "**`[FORMAL_AXIOMATIC]` / `[INDEPENDENTLY_VERIFIABLE]`** — the **Ground-0 Phase Detection Algorithm v1.0** (five sequential gates Q1–Q5, "
            "binary truth table, and `NAB`/`CWO`/`GSRB` state machine) is a deterministic formal specification implemented and verified in the repository test suite (`tests/g0-engine-test.mjs`), "
            "and external case-study citations to public corporate charters, terms of service, and regulatory filings are independently verifiable against public records; "
            "**`[AUTHOR_REPORTED]`** — first-person audit narratives, media reaction cascade projections, and observational commentary reflect the author's analytical assessment and incident chronology.\n"
            "> 2. **`DeclaredPhase` vs. `DetectedPhase` (`CL-012`):** `DeclaredPhase = {NAB, CWO, GSRB}` (valid in a signed PDH); "
            "`DetectedPhase = {NAB, CWO, NAB-Constrained, GSRB, AMBIGUOUS, INCOHERENT}` (behavioral and diagnostic outputs of the Ground-0 classifier, where `AMBIGUOUS` and `INCOHERENT` are diagnostic classification states).\n"
            "> 3. **Reclassification vs. Transition (`INV-G0-CLASS-001` · `CL-013`):** Distinguishes `Declared Phase`, `Observed Phase`, `Reclassification Event`, and `Transition Event`. "
            "**Reclassification changes the classification. Transition changes the operational state. Classification alone does not create legitimacy. Classification alone does not cause transition.**\n\n"
        )
        chunk = evidence_banner + chunk

    # 6. Part XIX (19-research-papers):
    #    - Flagship Research Paper showcase
    #    - Fix §6.5 computational legal/moral agency contradiction
    #    - Fix §6.6 obsolete "conceptual/deployable" wording
    #    - Establish Canonical Minimum Model
    elif slug == "19-research-papers":
        flagship_banner = (
            "> [!IMPORTANT]\n"
            "> **Flagship Portfolio Paper (`PUBLIC_RESEARCH_SUMMARY`):** "
            "*Accountability in Keyed Human–Machine Hybrid Systems* is the flagship public research paper of the **Harshal's Systems** portfolio "
            "(also published as a standalone paper at `research/keyed-human-machine-hybrid-systems.md`). It establishes the **Canonical Minimum Model** "
            f"(`{CANONICAL_MINIMUM_MODEL}`) "
            "and defines **Minimum Viable Keying (MVK)** for ensuring that computational systems remain auditable instruments rather than un-attributable pseudo-agents.\n\n"
        )
        chunk = chunk.replace(
            "We are now able to treat the legally binding computational components as a legal or moral agent. This design choice avoids ambiguity in liability and aligns with existing legal augments interpretations that assigns responsibility to individuals, human actors and organizations.",
            "This framework **does not** treat computational components as a legal or moral agent (`[TYPE: SECURITY_PRIMITIVE — INV-AGENCY-001]`). Moral and legal agency cannot reside in or migrate to software or hardware; this design choice avoids ambiguity in liability and aligns with legal principles that assign responsibility exclusively to identifiable human actors and underwritten organizations."
        )
        chunk = chunk.replace(
            "## 6.6 Fossilized Scope Limitations\nThis work is intentionally scoped as:\n- Precedent Backed\n- Commercial\n- Deployable without significant additional validation\n- Focused on system design principles rather than implementation\nIt does claim readiness for production use, public deployment, and safety critical environments. Any real world application would require domain plus  specific risk analysis, regulatory review, and independent oversight beyond the scope of this paper and the neural support systems that these articles build or have built.",
            "## 6.6 Reference Architecture & Operational Deployment Boundary\nThis work is intentionally scoped as:\n- **Normative Reference Architecture:** Precedent-backed structural and constitutional design invariants (`[TYPE: PROTOCOL_SPECIFICATION]`).\n- **Executable Verification Baseline:** Accompanied in the `HarshalOS` repository by a deterministic browser-local verification kernel (`specs/normative/ground-0-v1.0.md` and `js/kernel.js`).\n- **Gated Operational Deployment:** Not deployable into physical or safety-critical production environments without domain-specific validation, hardware security module (HSM/TPM) keying, certified financial underwriting, regulatory review, and independent conformance oversight."
        )
        chunk = chunk.replace(
            "Pre-Discussion Ethics Statement\n",
            "## Pre-Discussion Ethics & Governance Statement\n"
        )
        chunk = chunk.replace(
            "This work is conceptual and exploratory in nature and does involve human subjects, biological experimentation, medical intervention, or deployment of autonomous systems in any real-world environments. Personal data is/was collected, processed, or analyzed as part of this research update.",
            "This paper defines a formal architectural and governance reference standard and **does not** involve human-subject experimentation, biological experimentation, clinical medical intervention, or the unkeyed deployment of autonomous harm systems. No third-party personal data was collected or exploited in establishing these invariants."
        )
        chunk = flagship_banner + chunk

    # 7. Part XX (20-supply-chain):
    #    - Threat research separation + Evidence attribution
    elif slug == "20-supply-chain":
        sc_banner = (
            "> [!WARNING]\n"
            "> **Research Layer Classification — `THREAT_RESEARCH` (`Supply Chain Attack Vector++`):** "
            "This Part is classified strictly as **Defensive Threat Research & Containment Modeling (`THREAT_RESEARCH`)**, separated from normative operational specifications. "
            "All multi-tier adversary and supply-chain compromise scenarios (`Pages 1–19`) are non-operational stress tests designed to evaluate whether `AGS++` and `OCM` "
            "containment boundaries fail closed under worst-case infiltration. Historical references to public supply-chain incidents are `[INDEPENDENTLY_VERIFIABLE]`; "
            "synthetic stress-test topologies are `[FORMAL_AXIOMATIC]` models.\n\n"
        )
        chunk = sc_banner + chunk

        # Preserve the corrected UTS reference and narrative-date clarification
        # maintained in the generated library; the archived working draft still
        # contains the superseded UTS unit/date definitions.
        corrected_uts = """Entry Title: The Universal Timekeeping System (Corrected Reference, 2026-10-02)
Provenance: The in-world system is FICTION (NARRATIVE_SANDBOX); the arithmetic and browser widget are DERIVATIVE_BUILD. This informational timekeeping convention does not supply trusted system time, authentication, freshness, Ground-0, PDH, authorization, refusal, or PLV authority.

The Universal Second (US) is 1/c Earth seconds, where c = 299,792,458 m/s exactly. Therefore 1 US = 3.33564095198 nanoseconds. Larger duration units are defined by count, not by Earth-scale seconds:
- 1 Universal Minute (UM) = 60 US.
- 1 Universal Hour (UH) = 60 UM = 3,600 US.
- 1 Universal Day (UDay) = 24 UH = 86,400 US.
- 1 Universal Year (UY) = 365.25 UDay = 31,557,600 US.

Thus 1 UY is approximately 0.105264823 Earth seconds. A Julian Earth year (31,557,600 Earth seconds) equals 299,792,458 UY. The 365.25-day convention defines the UTS duration hierarchy; it does not synchronize the units to cosmic expansion.

Keep absolute dates distinct from durations: UDay is a duration unit; UDate is a timestamp coordinate expressed in UY since a named epoch. Do not abbreviate both as UD. A UTS event 150,000,000 US after an origin is 4.753213172 UY, or about 0.500346143 Earth seconds. A duration of 100 UY is about 10.52648229 Earth seconds.

The browser demonstration uses a clearly labeled, approximate model anchor of 13.799 billion Earth Julian years at 2026-10-02 00:00 UTC. The resulting UDate is about 4.136836 × 10^18 UY. This rounded cosmological age is a model parameter, not an observed exact timestamp. The app displays the device's conventional local Gregorian date/time and Earth UTC separately from UDate.

The repository implementation is documented in updates/2026-10-02/02-Frameworks/Universal-Timekeeping-System/UTS-Specification.md and UTS-Conversion-Guide.md; the generator is uts_generator.py; the HarshalOS Home Screen watch and duration converter are implemented in js/uts.js and js/apps-uts.js. The original author-supplied RTF files remain preserved as source material; where their former arithmetic or UD shorthand conflicts with the corrected definitions above, use the corrected Markdown specification. Browser conversion output is rounded floating-point display, not scientific-grade arbitrary precision.
"""
        chunk, uts_count = re.subn(
            r"(?ms)^Entry Title: The Universal Timekeeping System\n.*?(?=^Model Name: History 2’s Alpaca Ull$)",
            lambda _match: corrected_uts,
            chunk,
            count=1,
        )
        if uts_count != 1:
            raise ValueError("Part XX requires exactly one legacy UTS block to replace.")

        source_date = "In the year 13.799992 UY, during the Era of Great Desolation, the Earth was ailing."
        corrected_date = (
            "\n> **Narrative-date clarification:** The chronology in this story is expressed in approximate "
            "billions of Earth Julian years since the Big Bang. These legacy story labels are not UTS `UY` "
            "duration values or exact `UDate` timestamps.\n"
            "In the narrative year 13.799992 billion Earth Julian years after the Big Bang, during the "
            "Era of Great Desolation, the Earth was ailing."
        )
        if source_date not in chunk:
            raise ValueError("Part XX no longer contains the expected legacy narrative date.")
        chunk = chunk.replace(source_date, corrected_date, 1)

        source_time_labels = [
            "In 13.800000 UY, the Exodus One was finally ready.",
            "1. **Pre-Emergence Era (0 - 13.798 Billion UY):**",
            "2. **Era of the Great Desolation (13.798 - 13.800 Billion UY):**",
            "3. **Convergence Era (13.800 - 13.805 Billion UY):**",
            "4. **MicroConvergence Era (13.805 - Present):**",
        ]
        corrected_time_labels = [
            "At 13.800000 billion Earth Julian years after the Big Bang, the Exodus One was finally ready.",
            "1. **Pre-Emergence Era (0–13.798 billion Earth Julian years after the Big Bang):**",
            "2. **Era of the Great Desolation (13.798–13.800 billion Earth Julian years after the Big Bang):**",
            "3. **Convergence Era (13.800–13.805 billion Earth Julian years after the Big Bang):**",
            "4. **MicroConvergence Era (after 13.805 billion Earth Julian years; narrative present onward):**",
        ]
        for source_label, corrected_label in zip(source_time_labels, corrected_time_labels):
            if source_label not in chunk:
                raise ValueError(f"Part XX no longer contains the expected narrative label: {source_label}")
            chunk = chunk.replace(source_label, corrected_label, 1)

    # 8. Part XXI (21-microconvergence):
    #    - Upgrade Procedural Doctrine to the 6-stage Canonical Minimum Model
    elif slug == "21-microconvergence":
        chunk = chunk.replace(
            "Identity → Ruleset → Authorization → Continuity → Accountability",
            CANONICAL_MINIMUM_MODEL
        )

    # 9. Part XXII (22-policy-archive):
    #    - Showcase the Policy Archive as Supporting Research mapped to the Canonical Minimum Model
    elif slug == "22-policy-archive":
        policy_bridge = """## Architectural Role of the Supporting Policy Research Archive

> [!IMPORTANT]
> **Research Layer Classification — `SUPPORTING_POLICY_RESEARCH`:** The memoranda in **Part XXII** are not disconnected political essays; they are **applied institutional research papers** demonstrating how the **Canonical Minimum Model** (`Identity → Representation → Authorization → Continuity → Accountability → Refusal`) operates when projected from computational kernels into public law, anti-caste institutional design, bodily/cognitive consent, fiscal solvency, and healthcare governance.

| Policy Research Module | Primary Stage of the Canonical Minimum Model | Structural Invariant Enforced | Evidence Status |
| :--- | :--- | :--- | :--- |
| **1. Institutional Anti-Caste Architecture** | `Identity` & `Representation` | Prohibits administrative identification from hardening into hereditary or algorithmic caste stratification (`Entry, Mobility, Exit, Review, Succession`). | `[INDEPENDENTLY_VERIFIABLE]` constitutional & sociological criteria |
| **2. Never Consented Means Never Consented** | `Authorization` & `Refusal` | Establishes that silence, coercion, or survival compliance never equals authorization (`R = 0 ⇒ L(S,t) = 0`). | `[FORMAL_AXIOMATIC]` consent invariant |
| **3. Fiscal, Labor & Anti-Slavery Safeguards** | `Continuity` & `Accountability` | Prevents debt-bondage, unbonded algorithmic externalities, and asymmetric liability shifting onto natural persons. | `[INDEPENDENTLY_VERIFIABLE]` legal/economic analysis |
| **4. Civic & Healthcare Infrastructure** | `Accountability` & `Refusal` | Requires human-addressable clinical and civic decision paths with mandatory fail-closed refusal on unverified automated triage. | `[INDEPENDENTLY_VERIFIABLE]` policy synthesis |

---

"""
        chunk = policy_bridge + chunk

    # 10. Part XXVI (26-anthropic-b-side):
    #     - Separate Incident Record vs. Platform Compliance Audit & mark verified vs. author-reported material
    elif slug == "26-anthropic-b-side":
        audit_banner = """## Evidence Attribution & Separation of Audit Record vs. Incident Chronology

> [!IMPORTANT]
> **Research Layer Classification — `INCIDENT_AND_AUDIT_RECORD` (`MIXED_VERIFIED_AND_REPORTED`):** To maintain rigorous evidentiary hygiene across the portfolio, **Part XXVI** explicitly separates External Platform Policy & Regulatory Records (`[INDEPENDENTLY_VERIFIABLE]`) from First-Person Incident Chronology & Field Observations (`[AUTHOR_REPORTED]`):

| Material Category | Evidence Status Tag | Verification Standard |
| :--- | :--- | :--- |
| **A. External Platform Policy & Regulatory Record** (Published RSP/ASL commitments, Terms of Service, copyright litigation filings, Pentagon/DoD contract announcements, and public executive statements) | `[INDEPENDENTLY_VERIFIABLE]` | Verifiable directly against public court dockets, federal procurement announcements, archived company policy pages, and primary news reporting cited inline. |
| **B. First-Person Incident Chronology & Field Observations** (Author-observed session terminations, account/telemetry events, timestamps, and Ground-0 re-badging determinations applied to those events) | `[AUTHOR_REPORTED]` | Preserved as the author's contemporaneous first-person operational record and analytical evaluation under the Ground-0 v1.0 rubric. |

---

"""
        chunk = audit_banner + chunk

    return chunk


# ---------------------------------------------------------------------------
# Priority 1, 2 & 5: Synchronize Part XXIV (`24-the-novel.md`) with Book II
# ---------------------------------------------------------------------------
def build_synchronized_novel_part(root_dir):
    """Build the synchronized Part XXIV content from `manuscript/the-grand-river-foundation/*.txt`."""
    ms_dir = os.path.join(root_dir, "manuscript", "the-grand-river-foundation")
    files = sorted(glob.glob(os.path.join(ms_dir, "*.txt")))
    chapters_md = []
    total_words = 0
    roster_rows = []

    for idx, fpath in enumerate(files, start=1):
        fname = os.path.basename(fpath)
        text = open(fpath, encoding="utf-8").read().strip()
        words = len(text.split())
        total_words += words
        first_line = text.splitlines()[0].lstrip("#").strip() if text else fname
        roster_rows.append(
            f"| `{idx:02d}` | **{first_line}** | `manuscript/the-grand-river-foundation/{fname}` | {words:,} |"
        )
        # Demote H1/H2 by one level so it nests cleanly under Part XXIV's H1
        demoted_lines = []
        for line in text.splitlines():
            if line.startswith("# "):
                demoted_lines.append("## " + line[2:])
            elif line.startswith("## "):
                demoted_lines.append("### " + line[3:])
            else:
                demoted_lines.append(line)
        chapters_md.append("\n".join(demoted_lines))

    roster_table = "\n".join(roster_rows)
    header = f"""## Book II — Preview: Architectural Continuity & Normative Separation Notice

> [!IMPORTANT]
> **Provenance Classification — `FICTION` (`Book II — Preview · Non-Normative Future-World Sandbox`):** *The Grand River Foundation* is **Book II — Preview**, a standalone work of speculative institutional fiction set in **~2100 CE**. Nothing in Book II is a normative specification or factual claim; all binding specifications, equations, and audits reside in **Book I (*Harshal's Systems*, Parts I–XXIII, XXV–XXVII)**. Book II uses the ~2100 setting—the 4,000-foot retrofitted Colorado River Dam (completed 2098), the 500-Coin Western Colonnade of Mutual Underwriting Houses, the 119-NAB Ombudsman's Council, the Point-to-Point South Wall Copper Vault, and the Spherical Orb Chamber (`0–359` address ring closing at the `0°` Zero-Degree Meridian)—as the future-world sandbox for mature civilizational implementations of Book I's architecture. This section is automatically synchronized with `manuscript/the-grand-river-foundation/` and `publications/grand-river-foundation/BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md`.

### Synchronized Chapter Roster (Book II — Preview)

| Order | Chapter Title | Canonical Manuscript File | Words |
| :--- | :--- | :--- | ---: |
{roster_table}

**Total Synchronized Book II Preview Extent:** {len(files)} chapters · {total_words:,} words.

---

"""
    return header + "\n\n---\n\n".join(chapters_md)


# ---------------------------------------------------------------------------
# Priority 4: Standalone Flagship Research Paper (`research/keyed-human-machine-hybrid-systems.md`)
# ---------------------------------------------------------------------------
def write_flagship_research_paper(root_dir, part19_chunk):
    """Write the standalone flagship research paper to `research/keyed-human-machine-hybrid-systems.md`."""
    out_path = os.path.join(root_dir, "research", "keyed-human-machine-hybrid-systems.md")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    header = f"""---
document_id: HS-RESEARCH-FLAGSHIP-KHMHS-2026
title: "Accountability in Keyed Human–Machine Hybrid Systems"
author: "Harshal Priyavadan Patel (A44674928)"
origin_anchor: "0•000•000•0000"
book: "Book I — Harshal's Systems (Flagship Portfolio Paper · Part XIX)"
provenance_class: CANONICAL_SOURCE
status_taxonomy: RESEARCH_PAPER
evidence_status: INDEPENDENTLY_VERIFIABLE
research_layer: PUBLIC_RESEARCH_SUMMARY
canonical_minimum_model: "{CANONICAL_MINIMUM_MODEL}"
---

# Accountability in Keyed Human–Machine Hybrid Systems

**Flagship Portfolio Research Paper · Harshal's Systems (Book I, Part XIX)**  
**Author:** Harshal Priyavadan Patel (`A44674928` · Center Origin `0•000•000•0000`)  
**Research Layer:** `PUBLIC_RESEARCH_SUMMARY` & `DEFENSIVE_SPECIFICATION`  
**Canonical Minimum Model:** `{CANONICAL_MINIMUM_MODEL}`

| Provenance Class | Status Taxonomy | Evidence Status | Companion Implementation |
| :--- | :--- | :--- | :--- |
| `CANONICAL_SOURCE` | `RESEARCH_PAPER` | `INDEPENDENTLY_VERIFIABLE` & `FORMAL_AXIOMATIC` | `specs/normative/ground-0-v1.0.md` · `js/kernel.js` |

---

"""
    open(out_path, "w", encoding="utf-8").write(header + part19_chunk.strip() + "\n")
    return out_path


# ---------------------------------------------------------------------------
# Priority 1, 2, 3, 4 & 5: Part XXVII — Whole Corpus / Complete Work Generator
# ---------------------------------------------------------------------------
def build_part_27_whole_corpus(written_parts, book2_words, book2_chapters):
    """Generate `27-whole-corpus.md` (Part XXVII — Whole Corpus / Complete Work)."""
    total_book1_words = sum(w["words"] for w in written_parts)
    part_rows = []
    for idx, w in enumerate(written_parts):
        slug = w["slug"]
        meta = PART_METADATA.get(slug, PART_METADATA["01-core-book"])
        part_rows.append(
            f"| `{idx:02d}` | **{meta['part_num']}** | [{w['title']}]({slug}.md) | "
            f"`{meta['provenance_class']}` | `{meta['status_taxonomy']}` | "
            f"`{meta['evidence_status']}` | `{meta['research_layer']}` | {w['words']:,} |"
        )
    part_table = "\n".join(part_rows)

    collection_rows = []
    for col in COLLECTIONS:
        p_list = ", ".join(f"`{member_id}`" for _, member_id in collection_entries(col))
        collection_rows.append(
            f"| `{col['id']}` | **{col['title']}** | `{col['research_layer']}` | {p_list} |"
        )
    collection_table = "\n".join(collection_rows)

    return f"""## 1. Purpose of Part XXVII — The Whole Corpus Synthesis & Generative Contract (`INV-CORPUS-027`)

**Part XXVII — Whole Corpus / Complete Work** serves as the capstone architectural synthesis, provenance registry, and master index for the entire **Harshal's Systems** literary, technical, and constitutional corpus. It resolves historical numbering drift between the 26 Roman-numbered body parts and the 27-file modular build by establishing **Part XXVII** as the formal **Whole Corpus / Complete Work** module.

### Formal Generative Synthesis Contract (`INV-CORPUS-027`)

```text
Parts 01–26 = canonical source components
Part 27     = integrated synthesis

1. 27 must not introduce a new invariant absent from 01–26 (or specs/normative/canonical-model.md).
2. 27 may synthesize, reorder, narrativize, or instantiate existing invariants.
```

> **Core Strategic Architecture:**  
> **The architecture (Book I) is the canonical reference library. The novel (Book II) is the active narrative work in production.**  
> Rather than continually rebuilding the foundational documentation before writing each new chapter of fiction, **Book I (`Parts I–XXVII`)** and its formal contract ([`specs/normative/canonical-model.md`](../../specs/normative/canonical-model.md) · [`specs/normative/canonical.json`](../../specs/normative/canonical.json) · [`specs/normative/contradictions.md`](../../specs/normative/contradictions.md)) stand as the settled constitutional, topological, and safety canon from which **Book II (*The Grand River Foundation — Book II Preview*)** draws its ~2100 world-building invariants.

---

## 2. Two-Book Publishing Hierarchy (`Book I` vs. `Book II — Preview`)

| Publishing Tier | Title & Scope | Provenance Class | Normative Status | Primary Repository Artifacts |
| :--- | :--- | :--- | :--- | :--- |
| **Book I (Reference Library)** | ***Harshal's Systems: The Ultimate User Manual*** (`Front Matter` + `Parts I–XXVII`) | `CANONICAL_SOURCE` & `DERIVATIVE_BUILD` | **Normative & Analytical Reference Library** | `publications/harshal-systems/HARSHAL-SYSTEMS-USER-MANUAL.md`, `publications/harshal-systems/HARSHAL-SYSTEMS-USER-MANUAL.docx`, `docs/harshal-systems/00-*.md`–`27-*.md`, `specs/normative/canonical-model.md`, `specs/normative/canonical.json`, `specs/normative/ground-0-v1.0.md` |
| **Book II — Preview (Companion Novel)** | ***The Grand River Foundation*** (`Prologue`, `Chapters 1–5`, `Interstitial: Cable Select`, & ongoing chapters) | `FICTION` | **Non-Normative Future-World Sandbox (~2100 CE)** | `manuscript/the-grand-river-foundation/*.txt`, `publications/grand-river-foundation/BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md`, `manuscript/manifest.json` |

---

## 3. Formal Provenance & Evidence-Status Taxonomies

Every module in the repository is governed by four orthogonal metadata dimensions plus the stable 8-field component interface (`id`, `canonical_name`, `depends_on`, `defines`, `uses`, `invariants`, `conflicts_with`, `status`) embedded in machine-readable YAML frontmatter and visible provenance banners:

### 3.1 Provenance Class (`provenance_class`)
- **`CANONICAL_SOURCE`**: Primary specifications, formal equations, research papers, and doctrinal modules authored in the working canon.
- **`DERIVATIVE_BUILD`**: Deterministic umbrella compilations, indices, and formatted build artifacts (`publications/harshal-systems/HARSHAL-SYSTEMS-USER-MANUAL.md`, `.docx`, `manuscript/manifest.json`) generated by `source/build.py`, `scripts/export-docx.py`, and `scripts/write-chapter.mjs`.
- **`ARCHIVE`**: Preserved historical drafts, original submission front matter (`00-author-front-matter.md`), ZIP snapshots (`archives/ground-0/`), and raw RTF chapter drafts (`archives/manuscript-rtf/`).
- **`FICTION`**: Speculative narrative works (*The Grand River Foundation — Book II Preview*) exploring ~2100 implementations of the architecture without claiming factual or normative force.
- **`AUDIT`**: Point-in-time institutional evaluations, Ground-0 phase re-badging case studies, and external platform compliance records.

### 3.2 Status Taxonomy (`status_taxonomy`)
- **`NORMATIVE_SPEC`**: Binding architectural, topological, or constitutional specification (`canonical-model.md`, `Ground-0 v1.0`, `AGS+`, `OCM`, `HMKH`, `ADJR-v1.0`, `CHE++`, `CGPA`, `OCS`).
- **`CONCEPTUAL_DOCTRINE`**: Foundational philosophical and structural principles (`Part I — The Core Book`, `Part XIII — The Whyland Standards`).
- **`RESEARCH_PAPER`**: Formal analytical, hybrid-systems, or adversarial threat-modeling research (`Part XIX — Keyed Human–Machine Hybrid Systems`, `Part XVI — AGS++ Threat Modeling`, `Part XX — Supply Chain Attack Vector++`).
- **`SUPPORTING_POLICY_RESEARCH`**: Applied public-policy memoranda operationalizing the Canonical Minimum Model (`Part XXII — Supporting Policy Archive`).
- **`CASE_STUDY_AUDIT`**: Institutional re-badging and compliance evaluations (`Part XII`, `Part XXVI`).
- **`FICTION_PREVIEW`**: Active narrative companion chapters (`Book II — Preview`).
- **`UMBRELLA_INDEX`**: Master corpus synthesis and navigation (`Front Matter`, `Part XXVII`).

### 3.3 Evidence-Status Taxonomy (`evidence_status`)
- **`FORMAL_AXIOMATIC`**: True by definition within the formal axiom system, state machine, or topological model (`L(t) = H(t) × f(A(t), R(t), S(t))`).
- **`INDEPENDENTLY_VERIFIABLE`**: Grounded in public statutes, published corporate policies, public court dockets, or reproducible automated test suites in `tests/`.
- **`AUTHOR_REPORTED`**: First-person operational chronology, incident records, or author-attested observations.
- **`MIXED_VERIFIED_AND_REPORTED`**: Contains both independently verifiable public documentation and author-reported chronology, explicitly separated via inline attribution tables.
- **`NARRATIVE_SANDBOX`**: Fictional ~2100 scenario content.

### 3.4 Research Presentation Layer (`research_layer`)
1. **`PUBLIC_RESEARCH_SUMMARY`**: Flagship portfolio entry point (`research/keyed-human-machine-hybrid-systems.md` & `Part XIX`) and executive synthesis.
2. **`THREAT_RESEARCH`**: Adversarial stress-testing and vulnerability taxonomy (`Part XVI`, `Part XX`).
3. **`DEFENSIVE_SPECIFICATION`**: Normative containment, keying, and refusal protocols (`Parts II–XI`, `XII–XV`, `XVII–XVIII`, `XXIII`, `XXV`).
4. **`INCIDENT_AND_AUDIT_RECORD`**: Real-world institutional audits and incident logs (`Part XII Case Studies`, `Part XXVI Anthropic B-Side`).

---

## 4. Summary of Canonical Conceptual Resolutions (`specs/normative/canonical-model.md`)

1. **Canonical Six-Stage Model & Decision Gate (`INV-STAGE-001`):**
   ```text
   Identity → Representation → Authorization → Continuity → Accountability → Decision (Permit | Refuse)
   ```
   *(Legacy shorthand: `Identity → Representation → Authorization → Continuity → Accountability → Refusal`, where `Refusal` names the Stage 6 `Decision` gate by its default fail-closed branch.)*
2. **Disambiguated Symbol Namespace & Canonical Legitimacy (`INV-SYM-001`, `INV-LEGIT-EQ-001`):** `A(t)` denotes **Addressability** exclusively; **Accountability** uses `K(t) = K_tech(t) × K_ops(t)` (separated from `Legal Responsibility K_legal` and `Institutional Solvency U_solv`). The single canonical legitimacy equation is `L(t) = H(t) × f(A(t), R(t), S(t))` subject to upstream gates `C(t) = 1` and `K(t) = 1` (`L(S,t) = A · R · V(S,t)` is retained solely as a documented historical boolean shorthand).
3. **Non-Agency of Computational Components (`INV-AGENCY-001`):** Computational systems never possess or acquire moral or legal agency regardless of processing capability. All legal and moral responsibility remains strictly bound to the keyed human principal (`H = 1`).
4. **Delegation of Execution vs. Migration of Legitimacy (`INV-LEGIT-001`):** Task execution may be *delegated* across bounded, auditable hops (`d = 1..k`), but legitimacy *never migrates* into silicon, autonomous swarms, or corporate wrappers.
5. **OCM Disc → Sphere Equivalence (`D² ↪ B³`), Resolution Axis (`INV-AXIS-001`), and Routing Precedence (`INV-OCM-PRECEDENCE-001`):** The 2D Disc (`r, θ`) is the pedagogical equatorial cross-section; the 3D Sphere (`r, θ, φ`) is the full operational manifold. Resolution is an authority-resolution mechanism, not an authority source (`INV-AXIS-001`), with `Cost_resolution < Cost_lateral` under the Direct Attachment Axiom and `Resolution ≻ Coordination` as a strict precedence invariant.
6. **Discrete Address Ring `ℤ_360` (`0–359`) vs. `360°` Closure Notation:** Sector addresses occupy `0–359` (`0` = Center Origin `0•000•000•0000`; `1–359` = peripheral sectors). `360°` is never an address slot; it denotes full-cycle topological return to origin (`360° ≡ 0° mod 360`).
7. **Emergency Legitimacy (`INV-EMERG-001`) & Ground-0 Phase Types (`INV-G0-CLASS-001`):** Emergency conditions never generate legitimacy. Ground-0 distinguishes `DeclaredPhase = {{NAB, CWO, GSRB}}` from `DetectedPhase = {{NAB, CWO, NAB-Constrained, GSRB, AMBIGUOUS, INCOHERENT}}` and separates audit `Reclassification Events` from operational `Transition Events`.
8. **Reclassification of Harshal's English (`[TYPE: AUTHORIAL_REGISTER]`):** *Harshal's English* is the author's normative prose register and left-to-right reading discipline, distinct from cryptographic/mathematical security primitives (`[TYPE: SECURITY_PRIMITIVE]`).

---

## 5. Functional Collections Index (`docs/harshal-systems/collections/`)

| Collection ID | Collection Title | Primary Research Layer | Constituent Modules |
| :--- | :--- | :--- | :--- |
{collection_table}

---

## 6. Complete Corpus Manifest (`Front Matter` + `Parts I–XXVII`)

| File # | Part Designation | Module Title | Provenance | Status Taxonomy | Evidence Status | Research Layer | Words |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | ---: |
{part_table}
| `27` | **Part XXVII** | [Part XXVII — Whole Corpus / Complete Work](27-whole-corpus.md) | `DERIVATIVE_BUILD` | `UMBRELLA_INDEX` | `FORMAL_AXIOMATIC` | `PUBLIC_RESEARCH_SUMMARY` | ~1,650 |

**Whole Corpus Totals:**
- **Book I Reference Library (`00`–`27`):** {total_book1_words:,} words across Front Matter, Author's Front Matter, and Parts I–XXVII.
- **Book II — Preview Companion Novel (`manuscript/the-grand-river-foundation/`):** {book2_words:,} words across {book2_chapters} indexed plaintext chapters (synchronized in Part XXIV and `publications/grand-river-foundation/BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md`).
"""


def write_functional_collections(outdir, written_parts):
    """Create organized collection subdirectories under `docs/harshal-systems/collections/`."""
    col_root = os.path.join(outdir, "collections")
    os.makedirs(col_root, exist_ok=True)
    by_slug = {w["slug"]: w for w in written_parts}

    root_rows = []
    for col in COLLECTIONS:
        cdir = os.path.join(col_root, col["id"])
        os.makedirs(cdir, exist_ok=True)
        rows = []
        total_w = 0
        for entry_kind, member in collection_entries(col):
            if entry_kind == "reference":
                module = REFERENCE_MODULES[member]
                module_path = os.path.join(outdir, *module["file"].split("/"))
                if not os.path.isfile(module_path):
                    raise FileNotFoundError(f"Reference module is missing: {module_path}")
                module_words = module["words"]
                total_w += module_words
                rows.append(
                    f"| `{member}` | [{module['title']}](../../{module['file']}) | "
                    f"`{module['provenance_class']}` | `{module['status_taxonomy']}` | "
                    f"`{module['evidence_status']}` ({module_words:,} words) |"
                )
                continue

            slug = member
            if slug == "00-front-matter":
                rows.append(
                    "| `00-front-matter` | [Front Matter](../../00-front-matter.md) | `DERIVATIVE_BUILD` | `UMBRELLA_INDEX` | `FORMAL_AXIOMATIC` |"
                )
                continue
            w = by_slug.get(slug)
            if not w:
                continue
            meta = PART_METADATA.get(slug, PART_METADATA["01-core-book"])
            total_w += w["words"]
            rows.append(
                f"| `{slug}` | [{w['title']}](../../{slug}.md) | `{meta['provenance_class']}` | "
                f"`{meta['status_taxonomy']}` | `{meta['evidence_status']}` ({w['words']:,} words) |"
            )
        readme_md = f"""# {col['title']}

**Collection ID:** `{col['id']}`  
**Primary Research Layer:** `{col['research_layer']}`  
**Canonical Minimum Model:** `{CANONICAL_MINIMUM_MODEL}`

> {col['description']}

## Modules in This Collection

| Module ID | Part / Document | Provenance Class | Status Taxonomy | Evidence Status & Extent |
| :--- | :--- | :--- | :--- | :--- |
{chr(10).join(rows)}
"""
        open(os.path.join(cdir, "README.md"), "w", encoding="utf-8").write(readme_md)
        root_rows.append(
            f"| [`{col['id']}`]({col['id']}/README.md) | **{col['title']}** | `{col['research_layer']}` | {len(collection_entries(col))} modules ({total_w:,} words) |"
        )

    col_index_md = f"""# Harshal's Systems — Functional Collections Index

To make **Book I (*Harshal's Systems*)** navigable as a modular reference library rather than a monolithic draft, the 27 Parts and Front Matter are organized into **seven functional collections**, with a small number of explicitly labeled derivative and fictional reference modules:

| Collection | Title | Primary Research Layer | Scope |
| :--- | :--- | :--- | :--- |
{chr(10).join(root_rows)}
"""
    open(os.path.join(col_root, "README.md"), "w", encoding="utf-8").write(col_index_md)
