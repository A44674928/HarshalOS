# AGS v0.2 published corpus map

## Source of record

Harshal Native treats the published **AGS v0.2 full-book KDP interior** as one text-based source corpus while preserving every section’s own provenance, evidence, and deployment limits.

| Field | Value |
| --- | --- |
| Title | *AGS v0.2: Harshal’s Systems — Full Book* |
| Edition | Production Edition · Version 0.2 · October 2026 |
| Author | Harshal Priyavadan Patel |
| Source artifact | [`publications/book/AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-interior-2026-10-07.pdf`](../../../publications/book/AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-interior-2026-10-07.pdf) |
| PDF length | 548 pages |
| SHA-256 | `6c67feae3881c11bab8e2654e1f58d23aabbbb1dfdcd536464218c2bbf839823` |
| Native source-map type | `AGSv02PublishedCorpus` in `HarshalCore` |

The source hash identifies the checked-in publication artifact used for this map. It is **not** a signature, release attestation, proof of authorship, deployment certification, or authority grant.

> **Text-based operating-system boundary:** “one text-based operating system” means one navigable source corpus with section-specific rules. It does not mean that the PDF executes, that prose becomes code, or that a citation confers identity, permission, medical/physical control, or authority over another system.

The native Library bundles the exact PDF as a read-only, checksum/page-count-verified resource; this `HarshalCore` source-map type itself still records source metadata and constrained translations only. It does not parse the book into executable authority.

## Reading-edition boundary

The Library can also render a separately bundled [Night Reading Edition](../../../publications/book/AGS-v0.2-Harshal-s-Systems-Night-Reading-Edition-2026-10-10.pdf). That 548-page file is a black-background/electric-blue-text presentation derivative with a distinct SHA-256 (`cd46c3c47aea1deb2e54dd32ebc324e3f1ce6106c13a6eeb9b3ccec07e348f7c`) and [provenance manifest](../../../publications/book/AGS-v0.2-Harshal-s-Systems-Night-Reading-Edition-2026-10-10.provenance.json). It preserves the source’s page correspondence and extracted-text continuity, but it is **not** the source-of-record PDF, a revised publication, or a new evidence record. `AGSv02LibraryEdition` keeps the two resource identities, hashes, and classifications separate.

## Published numbering is authoritative

The production edition materially differs from the legacy repository chapter numbering. The native application follows the published edition:

| Published source | Printed / PDF start | Native treatment |
| --- | --- | --- |
| **Part XVIII — Flagship Research: Accountability in Keyed Human–Machine Hybrid Systems** | 203 / 229 | Conceptual accountability, continuity, non-agency, restrained scope, and fail-closed principles only. |
| **Part XIX — Supply Chain and Implanted-Device Threat Research** | 213 / 239 | Read-only classified book section; `THREAT_RESEARCH` catalog boundary for app behavior. No source material becomes scenario-derived behavior, procedure, target, activation, device, or response workflow. |
| **Part XIX-B — Illustrative Narrative Sandbox** | 241 / 267 | Fiction/narrative only; never operational, evidentiary, or authority-bearing. |
| **Part XX — MicroConvergence and Signal Encoding** | 281 / 307 | Conceptual reference only; no protocol, human-consensus, or authorization claim. |

The legacy companion at [`docs/harshal-systems/19-research-papers.md`](../../../docs/harshal-systems/19-research-papers.md) remains a historical repository record. Its older Part XIX label does not override the published AGS v0.2 numbering.

## Full source map

The source map makes the whole book reachable in the app without collapsing its classifications into one implied evidence level.

| Published section | Printed / PDF start | Published classification | Native disposition |
| --- | ---: | --- | --- |
| Front Matter and Editorial Material | i / 1 | Editorial / source-governance | Claim-scoped reference |
| Part I — The Core Book | 1 / 27 | `CANONICAL_SOURCE` | Foundation reference |
| Part II — Formalization | 25 / 51 | `CANONICAL_SOURCE` | Foundation reference |
| Part III — AGS: Accountability-Gated Systems | 29 / 55 | `CANONICAL_SOURCE` | Bounded design reference |
| Part IV — OCM: Orb Communicator Model | 41 / 67 | `CANONICAL_SOURCE` | Bounded design reference |
| Part V — AI Inner Shell | 47 / 73 | `CANONICAL_SOURCE` | Bounded design reference |
| Part VI — Addressing and Spherical Topology | 51 / 77 | `CANONICAL_SOURCE` | Bounded design reference |
| Part VII — Operator Model | 65 / 91 | `CANONICAL_SOURCE` | Bounded design reference |
| Part VIII — Disc Primitives, Routing, and Lifecycle | 71 / 97 | `CANONICAL_SOURCE` | Bounded design reference |
| Part IX — AGS Layering and Conformance | 85 / 111 | `CANONICAL_SOURCE` | Bounded design reference |
| Part X — AGS Accessory Pack | 89 / 115 | `CANONICAL_SOURCE` | Bounded design reference |
| Part XI — Ground-0 and Duty Collation | 97 / 123 | `MIXED` | Claim-scoped reference |
| Part XII — Whyland Standards | 137 / 163 | `CANONICAL_SOURCE` | Bounded design reference |
| Part XIII — Neural Atomic Bodies Compendium | 141 / 167 | `CANONICAL_SOURCE` | Bounded design reference |
| Part XIV — Keyed Human–Machine Hybrid Controls | 145 / 171 | `CANONICAL_SOURCE` | Bounded design reference |
| Part XV — Threat Modeling and Context-Dependent Guarantees | 153 / 179 | `THREAT_RESEARCH` | Threat-research catalog only |
| Part XVI — Atomic-Body Classes and Reactor Doctrine | 171 / 197 | `CONCEPTUAL_MODEL` | Conceptual reference only |
| Part XVII — Institutional Application | 195 / 221 | `MIXED` | Claim-scoped reference |
| Part XVIII — Accountability research | 203 / 229 | `RESEARCH` | Bounded design reference |
| Part XIX — Supply-chain threat research | 213 / 239 | `THREAT_RESEARCH` | Threat-research catalog only |
| Part XIX-B — Illustrative Narrative Sandbox | 241 / 267 | `FICTION / NARRATIVE_SANDBOX` | Narrative/fiction only |
| Part XX — MicroConvergence and Signal Encoding | 281 / 307 | `CONCEPTUAL_RESEARCH` | Conceptual reference only |
| Part XXI — Policy and Governance Archive | 295 / 321 | `ARCHIVE / RESEARCH` | Claim-scoped reference |
| Part XXII — Specification Series | 313 / 339 | `PROPOSED_SPECIFICATION` | Conceptual reference only |
| Part XXIII — The Grand River Foundation | 345 / 371 | `FICTION` | Narrative/fiction only |
| Part XXIV — Anti-Denial of Justice and NAB I/O | 373 / 399 | `MIXED / CONCEPTUAL` | Claim-scoped reference |
| Part XXV — Whole Corpus / Complete Work | 427 / 453 | `DERIVATIVE_BUILD / MIXED` | Archival reference only |
| Appendix A — Formal Constraint Equations and Term Notes | 435 / 461 | Collected reference | Conceptual reference only |
| Appendix B — Safety Rationale for Adversarial Scenarios | 442 / 468 | Collected historical/proposal material | Threat-research catalog only |
| Appendix C — Ground-0 Supplementary Exercises | 444 / 470 | Collected exercises | Claim-scoped reference |
| Appendix D / D.1 / D.2 — Historical AI Audit Record | 446 / 472; 447 / 473; 452 / 478 | Historical audit record | Archival reference only |
| Appendix E — Integration & Operations Guide | 458 / 484 | Collected proposal | Conceptual reference only |
| Appendix F — Signal Class Quick Reference | 459 / 485 | Collected reference | Conceptual reference only |
| Appendix G — Core Book AI Companion | 460 / 486 | Machine-readable companion | Machine-readable reference only |
| Consolidated Glossary | 519 / 545 | Reference index | Machine-readable reference only |

## Native intake rules

The map controls how a source section may influence the app:

1. **No automatic elevation.** A source classification, equation, example, scenario, checklist, or named capability does not prove deployment, feasibility, external fact, legal authority, or user authorization.
2. **Accountability is bounded.** Part XVIII informs accountable-review and refusal-first design. The native app does not determine identity, consciousness, consent, coercion, intent, truth, or a person’s condition.
3. **Threat research is non-operational.** The read-only Library may render Parts XV and XIX and Appendix B as owner-provided classified book sections; app behavior uses only their source metadata and defensive non-adoption boundary. The native app contains no threat-research procedure, target logic, activation logic, device guidance, scanner claim, attack path, or incident-response authority.
4. **Narrative stays narrative.** Part XIX-B and Part XXIII cannot drive a decision, receipt, publication, market record, or external action.
5. **Historical/archive material is not independently upgraded.** Audit and archive records retain their stated limits and do not become current findings or deployment evidence.
6. **Conceptual and proposed specifications remain conceptual.** They can guide local interfaces and tests only after a separate, typed implementation and validation boundary.
7. **CWO remains accepted as archival/custodial.** It never becomes a delegated authority, external-action channel, clinical function, or physical-world control surface.

See [`LIBRARY-READER.md`](LIBRARY-READER.md) for the local eBook implementation, [`SUPPLY-CHAIN-BOUNDARY.md`](SUPPLY-CHAIN-BOUNDARY.md) for the narrowed SCAV++ boundary, and [`ARCHITECTURE.md`](ARCHITECTURE.md) for component-level source mapping.
