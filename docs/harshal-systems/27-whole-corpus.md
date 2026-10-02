---
id: HS-27-WHOLE-CORPUS
document_id: HS-27-WHOLE-CORPUS
canonical_name: "Part XXVII — Whole Corpus / Complete Work"
depends_on: ["HS-01-CORE-BOOK", "HS-02-FORMALIZATION", "HS-03-SAFETY-RATIONALE", "HS-04-AGS-ARCHITECTURE", "HS-05-OCM-ORB", "HS-06-INNER-SHELL", "HS-07-ADDRESSING-TOPOLOGY", "HS-08-OPERATOR-MODEL", "HS-09-DISC-LIFECYCLE", "HS-10-AGS-CONFORMANCE", "HS-11-ACCESSORY-PACK", "HS-12-GROUND-ZERO", "HS-13-WHYLAND", "HS-14-NAB-COMPENDIUM", "HS-15-HMKH-CONTROLS", "HS-16-THREAT-MODELING", "HS-17-ATOMIC-BODIES", "HS-18-INSTITUTIONAL-APPLICATION", "HS-19-RESEARCH-PAPERS", "HS-20-SUPPLY-CHAIN", "HS-21-MICROCONVERGENCE", "HS-22-POLICY-ARCHIVE", "HS-23-SPECIFICATION-SERIES", "HS-24-THE-NOVEL", "HS-25-ADDITIONAL-SPECS", "HS-26-ANTHROPIC-B-SIDE"]
defines: ["WHOLE-CORPUS-SYNTHESIS"]
uses: ["CANONICAL-MINIMUM-MODEL", "H(t)", "A(t)", "R(t)", "V(S,t)", "C(t)", "K(t)", "S(t)", "L(t)", "DECLARED-PHASE", "DETECTED-PHASE"]
invariants: ["INV-CORPUS-027", "INV-SYM-001", "INV-STAGE-001", "INV-LEGIT-EQ-001", "INV-AGENCY-001", "INV-LEGIT-001", "INV-AXIS-001", "INV-OCM-PRECEDENCE-001", "INV-EMERG-001", "INV-G0-CLASS-001"]
conflicts_with: []
status: UMBRELLA_INDEX
book: "Book I & Book II Umbrella"
part: "Part XXVII"
title: "Part XXVII — Whole Corpus / Complete Work"
collection: "07-companion-fiction-and-corpus"
provenance_class: DERIVATIVE_BUILD
status_taxonomy: UMBRELLA_INDEX
evidence_status: FORMAL_AXIOMATIC
research_layer: PUBLIC_RESEARCH_SUMMARY
canonical_minimum_model: "Identity → Representation → Authorization → Continuity → Accountability → Refusal"
canonical_decision_flow: "Identity → Representation → Authorization → Continuity → Accountability → Decision (Permit | Refuse)"
author: "Harshal Priyavadan Patel (A44674928)"
origin_anchor: "0•000•000•0000"
source_lines: "1–16675"
words: 2038
---

# Part XXVII — Whole Corpus / Complete Work

| Provenance Class | Status Taxonomy | Evidence Status | Research Layer | Book / Collection |
| :--- | :--- | :--- | :--- | :--- |
| `DERIVATIVE_BUILD` | `UMBRELLA_INDEX` | `FORMAL_AXIOMATIC` | `PUBLIC_RESEARCH_SUMMARY` | **Book I & Book II Umbrella** (`07-companion-fiction-and-corpus`) |

> The capstone architectural synthesis and master index of the entire Harshal’s Systems corpus: establishes the Book I (Reference Library) vs. Book II — Preview (Fictional Companion Novel) hierarchy, formalizes the Document Provenance and Evidence-Status Taxonomies, specifies the six-stage Canonical Minimum Model, summarizes all conceptual invariants, and indexes the seven functional collections across all 27 Parts.

**Source range:** Whole Corpus Synthesis (lines 1–16,675 + Book II Preview) · **Words:** 2,038

---

## 1. Purpose of Part XXVII — The Whole Corpus Synthesis & Generative Contract (`INV-CORPUS-027`)

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
| **Book I (Reference Library)** | ***Harshal's Systems: The Ultimate User Manual*** (`Front Matter` + `Parts I–XXVII`) | `CANONICAL_SOURCE` & `DERIVATIVE_BUILD` | **Normative & Analytical Reference Library** | `HARSHAL-SYSTEMS-USER-MANUAL.md`, `HARSHAL-SYSTEMS-USER-MANUAL.docx`, `docs/harshal-systems/00-*.md`–`27-*.md`, `specs/normative/canonical-model.md`, `specs/normative/canonical.json`, `specs/normative/ground-0-v1.0.md` |
| **Book II — Preview (Companion Novel)** | ***The Grand River Foundation*** (`Prologue`, `Chapters 1–5`, `Interstitial: Cable Select`, & ongoing chapters) | `FICTION` | **Non-Normative Future-World Sandbox (~2100 CE)** | `manuscript/the-grand-river-foundation/*.txt`, `BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md`, `manuscript/manifest.json` |

---

## 3. Formal Provenance & Evidence-Status Taxonomies

Every module in the repository is governed by four orthogonal metadata dimensions plus the stable 8-field component interface (`id`, `canonical_name`, `depends_on`, `defines`, `uses`, `invariants`, `conflicts_with`, `status`) embedded in machine-readable YAML frontmatter and visible provenance banners:

### 3.1 Provenance Class (`provenance_class`)
- **`CANONICAL_SOURCE`**: Primary specifications, formal equations, research papers, and doctrinal modules authored in the working canon.
- **`DERIVATIVE_BUILD`**: Deterministic umbrella compilations, indices, and formatted build artifacts (`HARSHAL-SYSTEMS-USER-MANUAL.md`, `.docx`, `manuscript/manifest.json`) generated by `source/build.py`, `scripts/export-docx.py`, and `scripts/write-chapter.mjs`.
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
7. **Emergency Legitimacy (`INV-EMERG-001`) & Ground-0 Phase Types (`INV-G0-CLASS-001`):** Emergency conditions never generate legitimacy. Ground-0 distinguishes `DeclaredPhase = {NAB, CWO, GSRB}` from `DetectedPhase = {NAB, CWO, NAB-Constrained, GSRB, AMBIGUOUS, INCOHERENT}` and separates audit `Reclassification Events` from operational `Transition Events`.
8. **Reclassification of Harshal's English (`[TYPE: AUTHORIAL_REGISTER]`):** *Harshal's English* is the author's normative prose register and left-to-right reading discipline, distinct from cryptographic/mathematical security primitives (`[TYPE: SECURITY_PRIMITIVE]`).

---

## 5. Functional Collections Index (`docs/harshal-systems/collections/`)

| Collection ID | Collection Title | Primary Research Layer | Constituent Modules |
| :--- | :--- | :--- | :--- |
| `01-foundations` | **Collection I — Foundational Doctrine & Core Book** | `PUBLIC_RESEARCH_SUMMARY` | `00-front-matter`, `00-author-front-matter`, `01-core-book`, `02-formalization`, `03-safety-rationale` |
| `02-ags-ocm-core` | **Collection II — AGS+ & Orb Communicator Architecture** | `DEFENSIVE_SPECIFICATION` | `04-ags-architecture`, `05-ocm-orb`, `06-inner-shell`, `07-addressing-topology`, `08-operator-model`, `09-disc-lifecycle`, `10-ags-conformance`, `11-accessory-pack` |
| `03-ground-zero-nab` | **Collection III — Ground-0 Phase Detection & Neural Atomic Bodies** | `DEFENSIVE_SPECIFICATION` | `12-ground-zero`, `13-whyland`, `14-nab-compendium`, `15-hmkh-controls`, `17-atomic-bodies`, `18-institutional-application` |
| `04-flagship-research` | **Collection IV — Flagship Keyed Human–Machine Research, Threat Models & Supporting Policy Archive** | `PUBLIC_RESEARCH_SUMMARY` | `19-research-papers`, `16-threat-modeling`, `20-supply-chain`, `21-microconvergence`, `22-policy-archive` |
| `05-constitutional-specs` | **Collection V — Defensive Constitutional Specification Series** | `DEFENSIVE_SPECIFICATION` | `23-specification-series`, `25-additional-specs` |
| `06-incident-audits` | **Collection VI — Incident Record & External Platform Audits** | `INCIDENT_AND_AUDIT_RECORD` | `26-anthropic-b-side` |
| `07-companion-fiction-and-corpus` | **Collection VII — Book II Fictional Companion Preview & Part XXVII Whole Corpus** | `PUBLIC_RESEARCH_SUMMARY` | `24-the-novel`, `27-whole-corpus` |

---

## 6. Complete Corpus Manifest (`Front Matter` + `Parts I–XXVII`)

| File # | Part Designation | Module Title | Provenance | Status Taxonomy | Evidence Status | Research Layer | Words |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | ---: |
| `00` | **Author's Front Matter** | [Author’s Front Matter and Reading Guide](00-author-front-matter.md) | `ARCHIVE` | `CONCEPTUAL_DOCTRINE` | `AUTHOR_REPORTED` | `PUBLIC_RESEARCH_SUMMARY` | 3,476 |
| `01` | **Part I** | [Part I — The Core Book](01-core-book.md) | `CANONICAL_SOURCE` | `CONCEPTUAL_DOCTRINE` | `FORMAL_AXIOMATIC` | `PUBLIC_RESEARCH_SUMMARY` | 8,511 |
| `02` | **Part II** | [Part II — Formalization](02-formalization.md) | `CANONICAL_SOURCE` | `NORMATIVE_SPEC` | `FORMAL_AXIOMATIC` | `DEFENSIVE_SPECIFICATION` | 3,457 |
| `03` | **Part III** | [Part III — Safety Rationale for Adversarial Scenarios](03-safety-rationale.md) | `CANONICAL_SOURCE` | `NORMATIVE_SPEC` | `FORMAL_AXIOMATIC` | `DEFENSIVE_SPECIFICATION` | 436 |
| `04` | **Part IV** | [Part IV — AGS: Accountability-Gated Systems](04-ags-architecture.md) | `CANONICAL_SOURCE` | `NORMATIVE_SPEC` | `FORMAL_AXIOMATIC` | `DEFENSIVE_SPECIFICATION` | 2,668 |
| `05` | **Part V** | [Part V — OCM: The Orb Communicator Model](05-ocm-orb.md) | `CANONICAL_SOURCE` | `NORMATIVE_SPEC` | `FORMAL_AXIOMATIC` | `DEFENSIVE_SPECIFICATION` | 1,499 |
| `06` | **Part VI** | [Part VI — The AI Inner Shell](06-inner-shell.md) | `CANONICAL_SOURCE` | `NORMATIVE_SPEC` | `FORMAL_AXIOMATIC` | `DEFENSIVE_SPECIFICATION` | 720 |
| `07` | **Part VII** | [Part VII — Addressing, Rotation, and Spherical Topology](07-addressing-topology.md) | `CANONICAL_SOURCE` | `NORMATIVE_SPEC` | `FORMAL_AXIOMATIC` | `DEFENSIVE_SPECIFICATION` | 2,445 |
| `08` | **Part VIII** | [Part VIII — The Operator Model](08-operator-model.md) | `CANONICAL_SOURCE` | `NORMATIVE_SPEC` | `FORMAL_AXIOMATIC` | `DEFENSIVE_SPECIFICATION` | 1,264 |
| `09` | **Part IX** | [Part IX — Disc Primitives, Routing, and Lifecycle](09-disc-lifecycle.md) | `CANONICAL_SOURCE` | `NORMATIVE_SPEC` | `FORMAL_AXIOMATIC` | `DEFENSIVE_SPECIFICATION` | 3,681 |
| `10` | **Part X** | [Part X — AGS+ Layering and Conformance](10-ags-conformance.md) | `CANONICAL_SOURCE` | `NORMATIVE_SPEC` | `FORMAL_AXIOMATIC` | `DEFENSIVE_SPECIFICATION` | 817 |
| `11` | **Part XI** | [Part XI — The AGS Accessory Pack](11-accessory-pack.md) | `CANONICAL_SOURCE` | `NORMATIVE_SPEC` | `FORMAL_AXIOMATIC` | `DEFENSIVE_SPECIFICATION` | 1,739 |
| `12` | **Part XII** | [Part XII — Ground-0: Phase Detection, Audits, and the Duty Collation Ledger](12-ground-zero.md) | `CANONICAL_SOURCE` | `CASE_STUDY_AUDIT` | `MIXED_VERIFIED_AND_REPORTED` | `DEFENSIVE_SPECIFICATION` | 17,086 |
| `13` | **Part XIII** | [Part XIII — The Whyland Standards](13-whyland.md) | `CANONICAL_SOURCE` | `CONCEPTUAL_DOCTRINE` | `FORMAL_AXIOMATIC` | `DEFENSIVE_SPECIFICATION` | 986 |
| `14` | **Part XIV** | [Part XIV — Neural Atomic Bodies Compendium](14-nab-compendium.md) | `CANONICAL_SOURCE` | `NORMATIVE_SPEC` | `FORMAL_AXIOMATIC` | `DEFENSIVE_SPECIFICATION` | 5,040 |
| `15` | **Part XV** | [Part XV — Keyed Human-Machine Hybrid Controls](15-hmkh-controls.md) | `CANONICAL_SOURCE` | `NORMATIVE_SPEC` | `FORMAL_AXIOMATIC` | `DEFENSIVE_SPECIFICATION` | 2,118 |
| `16` | **Part XVI** | [Part XVI — Threat Modeling and Context-Dependent Guarantees](16-threat-modeling.md) | `CANONICAL_SOURCE` | `RESEARCH_PAPER` | `FORMAL_AXIOMATIC` | `THREAT_RESEARCH` | 8,297 |
| `17` | **Part XVII** | [Part XVII — Atomic Body Classes and Reactor Doctrine](17-atomic-bodies.md) | `CANONICAL_SOURCE` | `NORMATIVE_SPEC` | `FORMAL_AXIOMATIC` | `DEFENSIVE_SPECIFICATION` | 5,611 |
| `18` | **Part XVIII** | [Part XVIII — Institutional Application](18-institutional-application.md) | `CANONICAL_SOURCE` | `NORMATIVE_SPEC` | `FORMAL_AXIOMATIC` | `DEFENSIVE_SPECIFICATION` | 4,023 |
| `19` | **Part XIX** | [Part XIX — Flagship Research: Accountability in Keyed Human–Machine Hybrid Systems](19-research-papers.md) | `CANONICAL_SOURCE` | `RESEARCH_PAPER` | `INDEPENDENTLY_VERIFIABLE` | `PUBLIC_RESEARCH_SUMMARY` | 5,501 |
| `20` | **Part XX** | [Part XX — Supply Chain and Implanted-Device Threat Research](20-supply-chain.md) | `CANONICAL_SOURCE` | `RESEARCH_PAPER` | `MIXED_VERIFIED_AND_REPORTED` | `THREAT_RESEARCH` | 28,232 |
| `21` | **Part XXI** | [Part XXI — MicroConvergence and Signal Encoding](21-microconvergence.md) | `CANONICAL_SOURCE` | `RESEARCH_PAPER` | `FORMAL_AXIOMATIC` | `PUBLIC_RESEARCH_SUMMARY` | 7,578 |
| `22` | **Part XXII** | [Part XXII — Supporting Policy & Governance Research Archive](22-policy-archive.md) | `CANONICAL_SOURCE` | `SUPPORTING_POLICY_RESEARCH` | `INDEPENDENTLY_VERIFIABLE` | `PUBLIC_RESEARCH_SUMMARY` | 6,710 |
| `23` | **Part XXIII** | [Part XXIII — Specification Series](23-specification-series.md) | `CANONICAL_SOURCE` | `NORMATIVE_SPEC` | `FORMAL_AXIOMATIC` | `DEFENSIVE_SPECIFICATION` | 9,216 |
| `24` | **Part XXIV** | [Part XXIV — Book II Preview: The Grand River Foundation (Fictional Companion Novel)](24-the-novel.md) | `FICTION` | `FICTION_PREVIEW` | `NARRATIVE_SANDBOX` | `PUBLIC_RESEARCH_SUMMARY` | 16,113 |
| `25` | **Part XXV** | [Part XXV — Anti-Denial of Justice, Labor Attribution, and NAB I/O Mapping](25-additional-specs.md) | `CANONICAL_SOURCE` | `NORMATIVE_SPEC` | `FORMAL_AXIOMATIC` | `DEFENSIVE_SPECIFICATION` | 21,535 |
| `26` | **Part XXVI** | [Part XXVI — Incident Record & External Audit: Anthropic PBC (B Side)](26-anthropic-b-side.md) | `AUDIT` | `CASE_STUDY_AUDIT` | `MIXED_VERIFIED_AND_REPORTED` | `INCIDENT_AND_AUDIT_RECORD` | 10,267 |
| `27` | **Part XXVII** | [Part XXVII — Whole Corpus / Complete Work](27-whole-corpus.md) | `DERIVATIVE_BUILD` | `UMBRELLA_INDEX` | `FORMAL_AXIOMATIC` | `PUBLIC_RESEARCH_SUMMARY` | ~1,650 |

**Whole Corpus Totals:**
- **Book I Reference Library (`00`–`27`):** 179,026 words across Front Matter, Author's Front Matter, and Parts I–XXVII.
- **Book II — Preview Companion Novel (`manuscript/the-grand-river-foundation/`):** 16,113 words across 9 indexed plaintext chapters (synchronized in Part XXIV and `BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md`).
