---
id: HS-00-FRONT-MATTER
document_id: HS-00-FRONT-MATTER
canonical_name: "Front Matter"
depends_on: []
defines: ["PUBLISHING-HIERARCHY", "PROVENANCE-TAXONOMY"]
uses: ["CANONICAL-MINIMUM-MODEL", "INV-AGENCY-001", "INV-LEGIT-001"]
invariants: ["INV-AGENCY-001", "INV-LEGIT-001"]
conflicts_with: []
status: UMBRELLA_INDEX
book: "Book I"
part: "Front Matter"
title: "Front Matter"
collection: "01-foundations"
provenance_class: DERIVATIVE_BUILD
status_taxonomy: UMBRELLA_INDEX
evidence_status: FORMAL_AXIOMATIC
research_layer: PUBLIC_RESEARCH_SUMMARY
canonical_minimum_model: "Identity → Representation → Authorization → Continuity → Accountability → Refusal"
canonical_decision_flow: "Identity → Representation → Authorization → Continuity → Accountability → Decision (Permit | Refuse)"
author: "Harshal Priyavadan Patel (A44674928)"
origin_anchor: "0•000•000•0000"
source_lines: "1–325"
words: 1425
---

# Front Matter

## About this manual & publishing hierarchy

This is the consolidated, provenance-indexed **Umbrella Build Artifact (`DERIVATIVE_BUILD`)** of **Harshal’s Systems**. It organizes the entire work across **Front Matter**, **Author's Front Matter**, and **27 Roman-numbered Parts (`Part I` through `Part XXVII — Whole Corpus / Complete Work`)**, while establishing a strict publishing and provenance boundary between the two books of the project:

| Publishing Tier | Work | Provenance Class | Role in the Corpus |
|---|---|---|---|
| **Book I (Reference Library)** | ***Harshal’s Systems*** (`Parts I–XXVII`) | `CANONICAL_SOURCE` / `DERIVATIVE_BUILD` | The settled technical, constitutional, topological, and safety reference library (`docs/harshal-systems/` and this Umbrella Manual). |
| **Book II — Preview (Companion Novel)** | ***The Grand River Foundation*** | `FICTION` (`NARRATIVE_SANDBOX`) | A standalone fictional companion novel set in **~2100 CE** (`manuscript/the-grand-river-foundation/` and `publications/grand-river-foundation/BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md`). Its first modular dam-and-city operation is targeted circa 2046; 2098 is an interim commissioning/expansion milestone, not final completion; construction continues in 20-year supply-chain planning windows (not a physical limit); Mistveil targets ~80 million residents by 2100. The earlier ~40-million count is regional service population, not a competing city resident total. The first 40–60 years aspire to 1,200–2,500 feet of cumulative head across distinct stages; 4,000 feet remains the long-range fictional aggregate target, not one wall or a real-world engineering claim. See `updates/2026-10-02/02-Frameworks/Grand-River-Flow-Model/CANONICAL-NUMBERS.md` for numeric scope and caveats. |

> **Strategic Principle:** *The architecture (Book I) is the library. The novel (Book II) is the work in active production.* Rather than continually rebuilding the foundational canon before writing each new chapter of fiction, Book I serves as the stable reference architecture from which Book II draws its continuity.

**Approximate extent:** ~173,000 words across Front Matter, Author's Front Matter, and 27 Roman-numbered Parts (`Parts I–XXVII`).

## Flagship research entry point & canonical minimum model

For researchers, auditors, and engineers entering this portfolio for the first time, the flagship public research paper is brought to the front of the collection:

- **Flagship Paper:** ***Accountability in Keyed Human–Machine Hybrid Systems*** (**[Part XIX](19-research-papers.md)** · standalone publication at [`research/keyed-human-machine-hybrid-systems.md`](../../research/keyed-human-machine-hybrid-systems.md)).
- **Canonical Minimum Model (`[TYPE: SECURITY_PRIMITIVE]`):**
  ```
  Identity → Representation → Authorization → Continuity → Accountability → Refusal
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
| **A fiction reader (`Book II — Preview`)** | **Part XXIV** (or `publications/grand-river-foundation/BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md`) | The Book I architectural library behind the ~2100 story |

### On refusal

Refusal is not failure in this framework. It is not silence, cowardice, or conservatism.
Refusal occurs when representation collapses, when authorization cannot be reconstructed,
or when accountability diffuses beyond addressability. In those cases, action would falsely
claim authority. Refusal prevents that claim.

### On non-agency & delegation vs. migration of legitimacy

1. **No Computational Moral or Legal Agency (`INV-AGENCY-001`):** This framework **never** treats computational components, models, or autonomous swarms as moral or legal agents. Moral and legal responsibility remains strictly bound to identifiable human principals.
2. **Delegation vs. Migration (`INV-LEGIT-001`):** Operational execution may be *delegated* across a bounded chain of deterministic instruments, but legitimacy *never migrates* away from the human key at Center Origin (`0•000•000•0000`).
3. **Assistive Continuity vs. Prohibited Corpse-Puppeting (`INV-CORPSE-001`):** Where a living, conscious human origin ($H_{\text{conscious}}(t) = 1$) experiences degraded peripheral motor or speech signaling, an attested **Keyed Assistive Interface (`NAB`)** may translate verified intent into bounded action (**Regime I: Assistive Continuity**). Conversely, any post-liveness ($H_{\text{conscious}}(t) = 0$) or coerced autonomous continuation that drives a physical body, neural implant, or digital identity as a synthetic proxy (**Regime II: Corpse-Puppeting / Post-Liveness Continuation Breach**) is an immediate security fault that triggers `Parent Orb Freeze` (`OCS-v1.0`) and pierces the physical/corporate "front body" to hold the external **Shell Structure (`HMKH` / `ADJR-v1.0`)** strictly liable.

### Textbook Syllabus Guide for AI & Systems Engineering Courses

This edition of **Book I (*Harshal's Systems*)** is structured as a rigorous university- and graduate-level textbook for AI safety, distributed systems, and institutional governance courses, complete with formal LaTeX equations, worked numerical examples, and end-of-part student problem sets:
- **Module 1 — Foundational Architecture & Formal Equations:** Read **Part XIX** (*Flagship Research Paper*, including Worked Example 19.1 on `INV-CORPSE-001` and `ZKSK` Shielded Keying), **Part I** (*The Core Book*, including Worked Example 1.1 on Two-Part Addressability), and **Part II** (*Formalization*, including Worked Example 2.1 on cliff-edge refusal $\Delta t_{\text{cliff}}$).
- **Module 2 — Topological Routing & Constitutional Substrates:** Read **Part VII** (*Addressing, Rotation, and Spherical Topology*, including Worked Example 7.1 on $\mathbb{Z}_{360}$ resolution routing), **Part IX** (*Constitutional Enforcement Substrate*), and **Part XXIII** (*Specification Series*: `OCS-v1.0`, `MME-v1.0`, `AGS-Compiler-v1.0`).
- **Module 3 — Institutional Phase Detection & Empirical vs. Counterfactual Auditing:** Pair **Part XII** (*Ground-0 A-Side Empirical Baseline*: `5/5 → GSRB`) with **Part XXVI** (*Anthropic B-Side Counterfactual `B4` Boundary Stress-Test*: `4/5 → AMBIGUOUS-MIXED`) and **Part XXV** (*`ADJR-v1.0` Anti-Corpse-Puppeting Judicial Specification*).
- **Module 4 — Illustrative Case Studies & Future-World Sandboxes (`[FICTION / NARRATIVE_SANDBOX]`):** Throughout the textbook, illustrative fictional case studies (*Neural Atomic Orb: History2* in Part I §1.3, *The Convergence* / *History 2's Alpaca Ull* in Part XX-B, and *Book II — Preview: The Grand River Foundation* in Part XXIV) are explicitly badged as non-normative sandboxes so students can practice applying the formal equations to complex multi-agent scenarios without confusing narrative illustration with normative law.

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
| **Subtitle** | Architectures for Accountable Human D’Ash Machine Intelligence |
| **Author** | Harshal Priyavadan Patel (A44674928) |
| **Center-Origin** | `0•000•000•0000` (Discrete Address Ring `ℤ_360`: `0–359`; `360° ≡ 0°` Return-to-Origin Closure) |
| **Creator-ID** | `§HARSHAL§ + HARSHAL + (HARSHAL)` |
| **Canonical Minimum Model** | `Identity → Representation → Authorization → Continuity → Accountability → Refusal` |
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
