---
document_id: HS-SPEC-CANONICAL-MODEL-V1
title: "Harshal's Systems — Canonical Formal Model & Semantic Contract"
version: "1.0"
status: NORMATIVE
date: "2026-10-02"
author: "Harshal Priyavadan Patel (A44674928)"
origin_anchor: "0•000•000•0000"
provenance_class: CANONICAL_SOURCE
status_taxonomy: NORMATIVE_SPEC
evidence_status: FORMAL_AXIOMATIC
---

# Harshal's Systems — Canonical Formal Model & Semantic Contract (`v1.0`)

| Specification ID | Version | Status | Machine Registry | Contradiction Ledger |
| :--- | :--- | :--- | :--- | :--- |
| `HS-SPEC-CANONICAL-MODEL-V1` | `1.0` | `NORMATIVE` | [`specs/normative/canonical.json`](canonical.json) | [`specs/normative/contradictions.md`](contradictions.md) |

---

## 1. Purpose and Normative Scope (`[NORMATIVE]`)

This document is the **single authoritative formal specification** for the mathematical symbols, gating equations, human-key semantics, accountability taxonomy, routing precedence rules, failure states, Ground-0 phase types, and corpus synthesis rules across **Harshal's Systems (`Book I`)**, **HarshalOS** (`js/kernel.js`, `js/g0-engine.js`), and **Book II (*The Grand River Foundation*)**.

Where historical prose, summary tables, or derived build artifacts across `docs/harshal-systems/00-*.md` through `27-whole-corpus.md` use abbreviated or legacy notation, **this specification and its companion machine-readable registry ([`specs/normative/canonical.json`](canonical.json)) govern**. Every resolved cross-document tension is tracked in [`specs/normative/contradictions.md`](contradictions.md).

---

## 2. The Canonical Six-Stage Model & Decision Gate (`P0` · `[NORMATIVE]` · `[STRUCTURAL]`)

### 2.1 Canonical Pipeline

Every legitimate operation across Harshal's Systems traverses five sequential **upstream prerequisites** followed by a sixth **terminal decision gate**:

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

### 2.2 Prerequisite Stages vs. the Terminal Decision Gate (`INV-STAGE-001`)

1. **Stage 1 — Identity (`I`, `H(t)`)** `[NORMATIVE]`: A persistent, non-anonymous natural-person principal is identified at Center Origin (`0•000•000•0000`) with human-key state `H(t) ∈ {0, 1}`.
2. **Stage 2 — Representation (`R(t)`)** `[NORMATIVE]`: An unbroken delegation chain links the proposed system action to the authorized human principal (`R(t) ∈ [0, 1]`).
3. **Stage 3 — Authorization (`V(S, t)`)** `[NORMATIVE]`: Explicit, bounded operational permission is granted for scope `S`, declared phase, and duration `Δt ≤ δ` (`V(S, t) ∈ {0, 1}`). Task execution may be *delegated*, but legitimacy *never migrates* (`INV-LEGIT-001`).
4. **Stage 4 — Continuity (`C(t)`)** `[NORMATIVE]`: Runtime session-tuple bindings (`Session-ID`, `Boot-ID`, `PDH-ID`, `Human-Attestation-ID`), authorization validity `V(S, t) = 1`, and temporal freshness (`Δt < δ`) remain unbroken at evaluation time `t` (`C(t) ∈ {0, 1}`).
5. **Stage 5 — Accountability (`K(t)`)** `[NORMATIVE]`: Technical attribution (`K_tech`) and operational accountability (`K_ops`) are intact and bound to an addressable human principal (`A(t) > 0`, `K(t) ∈ {0, 1}`).
6. **Stage 6 — Decision (`x(t) ∈ {Permit, Refuse}`)** `[NORMATIVE]` · `[ENFORCEMENT]`: The **terminal decision gate**. It is **not** a sixth upstream prerequisite peer to Identity; it is the evaluation function over Stages 1–5:
   - **`Permit`**: Emitted if and only if all upstream binary gates hold (`H(t) = 1`, `C(t) = 1`, `K(t) = 1`) and `L(t) ≥ τ`.
   - **`Refuse` (`HALT`)**: The default state. Emitted deterministically whenever any upstream prerequisite fails (`H(t) = 0`, `C(t) = 0`, `K(t) = 0`) or `L(t) < τ`.

> **Compatibility Rule for Legacy Shorthand (`CL-004`):** Where existing prose or headers write `"Identity → Representation → Authorization → Continuity → Accountability → Refusal"`, the sixth token `"Refusal"` is formally defined as shorthand for the **Stage 6 `Decision (Permit | Refuse)` gate** named by its default fail-closed branch (`Refuse`).

---

## 3. Canonical Symbol Namespace (`P0` · `[NORMATIVE]`)

To preserve formal traceability and eliminate symbol overloading (`INV-SYM-001`), each mathematical symbol in the corpus has **exactly one canonical meaning**:

| Symbol | Canonical Name | Domain / Type | Normative Definition & Disambiguation |
| :--- | :--- | :--- | :--- |
| `I` | **Identity** | Principal identifier | Persistent natural-person principal anchored at Center Origin (`0•000•000•0000`). |
| `H(t)` | **Human Key** | `{0, 1}` | Binary human-key state at time `t` (`1` = active within freshness window; `0` = absent, pending, expired, or revoked). |
| `A(t)` | **Addressability** | `[0, 1]` | Degree to which the responsible human principal can be located, confronted, and compelled to answer at time `t`. **`A` denotes Addressability exclusively; it must never be used for Accountability (`CL-001`).** |
| `R(t)` | **Representation** | `[0, 1]` | Representation integrity of the delegation chain linking system action to the authorized human principal at time `t`. |
| `V(S, t)` | **Authorization** | `{0, 1}` | Bounded authorization indicator for scope `S` at time `t` (`1` = valid grant in force; `0` = ungranted or revoked). |
| `C(t)` | **Continuity** | `{0, 1}` | Upstream runtime continuity gate (`1` iff `V(S, t) = 1`, session tuple `(Session-ID, Boot-ID, PDH-ID, Human-Attestation-ID)` is bound, and `Δt < δ`; `0` otherwise). |
| `K(t)` | **Accountability** | `{0, 1}` | Upstream accountability gate (`K(t) = K_tech(t) × K_ops(t)`), disambiguated from `A(t)` Addressability. |
| `K_tech(t)` | **Technical Attribution** | `{0, 1}` | Cryptographic/ledger attribution of who authorized or emitted the event. |
| `K_ops(t)` | **Operational Accountability** | `{0, 1}` | Designated human/institutional custodian bound to answer and halt operations. |
| `K_legal` | **Legal Responsibility** | External legal status | Jurisdictional civil, regulatory, or criminal liability attached by external law (never self-certified by code). |
| `U_solv` | **Institutional Solvency** | External underwriting status | Financial/bonded underwriting capacity (e.g., 500-Coin underwriting reserve), tracked separately from `K(t)`. |
| `S_0` | **Initial Scope Domain** | Discrete action set | Baseline set of permitted operations granted at session or disc initialization. |
| `S_dom(t)` | **Active Scope Domain** | `S_dom(t) ⊆ S_0` | Subset of permitted operations active at time `t`. |
| `S(t)` | **Scope Capacity** | `[0, S_max]` | Scalar authorization capacity (temporal attenuation factor) at time `t`, where `S_max = 1.0`. |
| `S_eff(t)` | **Effective Scope** | `S_dom(t)` or `∅` | Effective permitted action set (`S_dom(t)` when `S(t) > 0` and `L(t) ≥ τ`; `∅` otherwise). |
| `L(t)` | **Legitimacy** | `[0, 1]` | Canonical derived permission state at time `t`. |
| `τ` | **Legitimacy Threshold** | `(0, 1]` | Absolute minimum legitimacy required for `Permit` (`τ = 0.5` in the reference kernel). |
| `Δt` | **Elapsed Verification Time** | `[0, ∞)` seconds | Time elapsed since the most recent valid Human Key attestation. |
| `δ` | **Maximum Verification Delay** | `(0, ∞)` seconds | Maximum permissible delay before `S(t)` decays to `0` (`δ = 240s` in the reference kernel). |
| `x(t)` | **Decision Outcome** | `{Permit, Refuse}` | Output of the Stage 6 `Decision` gate at time `t`. |

---

## 4. Canonical Legitimacy Equation & Derived Forms (`P0` · `[NORMATIVE]` · `[STRUCTURAL]`)

### 4.1 Role of Continuity `C(t)` and Accountability `K(t)` as Upstream Preconditions (`CL-003`)

`C(t)` (Continuity, which incorporates `V(S, t) = 1`, active session-tuple binding, and `Δt < δ`) and `K(t)` (Accountability) are **upstream binary gate conditions** that must evaluate to `1` before the continuous legitimacy function `f(A(t), R(t), S(t))` is evaluated:

```text
Upstream Gate Condition:
If H(t) = 0  or  C(t) = 0  or  K(t) = 0   ⇒   L(t) = 0   (Immediate Halt)
```

### 4.2 The Single Canonical Definition of Legitimacy (`INV-LEGIT-EQ-001`)

Subject to the upstream precondition gate (`C(t) = 1` and `K(t) = 1`), the **single canonical definition of legitimacy** is:

```text
L(t) = H(t) × f(A(t), R(t), S(t))
```

When written in expanded form with the upstream binary gates inline:

```text
L(t) = H(t) × C(t) × K(t) × f(A(t), R(t), S(t))
```

where:
- `H(t) ∈ {0, 1}` is the Human Key state;
- `C(t) ∈ {0, 1}` is the upstream Continuity gate;
- `K(t) ∈ {0, 1}` is the upstream Accountability gate;
- `A(t) ∈ [0, 1]` is Addressability;
- `R(t) ∈ [0, 1]` is Representation integrity;
- `S(t) = Smax × max(0, 1 − Δt/δ) ∈ [0, Smax]` is the temporal Scope capacity; and
- `f : [0, 1] × [0, 1] × [0, Smax] → [0, 1]` is a monotonically non-decreasing function satisfying `f(0, R, S) = f(A, 0, S) = f(A, R, 0) = 0` and `f(1, 1, 1) = 1`.

### 4.3 Canonical Decision Gate, Temporal Decay, and Precedence Equations

```text
Decision Gate:
x(t) = { Permit   if L(t) ≥ τ
       { Refuse   if L(t) < τ

Temporal Scope Decay:
S(t) = Smax × max(0, 1 − Δt/δ)

Optimization Precedence Rule (A.6):
For all objectives O(i): if L(t) < τ, then argmax(O(i)) is undefined
```

### 4.4 Explicit Classification of Equation Variants Across the Corpus (`CL-002`)

Every legitimacy equation appearing in the repository belongs to exactly one of the following four formal classes:

| Equation | Formal Class | Relationship to Canonical Model | Location in Repository |
| :--- | :--- | :--- | :--- |
| `L(t) = H(t) × f(A(t), R(t), S(t))` | **`CANONICAL_FORM`** | The authoritative definition of legitimacy when upstream preconditions `C(t) = 1` and `K(t) = 1` hold. | `specs/normative/canonical-model.md`, `02-formalization.md` (§A.3), `README.md`, `js/kernel.js` |
| `L(t) = H(t) × C(t) × K(t) × f(A(t), R(t), S(t))` | **`EXPANDED_CANONICAL_FORM`** | Exact algebraic expansion making upstream binary preconditions `C(t)` and `K(t)` explicit. | `specs/normative/canonical-model.md` (§4.2) |
| `L(t) = H(t) × A(t) × R(t) × S(t)` | **`IMPLEMENTATION_APPROXIMATION`** | Reference-kernel instantiation setting `f(A, R, S) = A × R × S` with `C(t)` enforced by pre-check guards in `requestAction()`. | `js/kernel.js` (`legitimacy()`) |
| `L(S,t) = A · R · V(S,t)` | **`HISTORICAL_BOOLEAN_FORM`** | Legacy boolean indicator reduction where `A ∈ {0, 1}` is **Addressability**, `R ∈ {0, 1}` is **Representation**, and `V(S,t) ∈ {0, 1}` bundles `H(t)`, `C(t)`, and `S(t)`. Retained only as a documented historical shorthand; never supersedes the canonical form. | `02-formalization.md`, `27-whole-corpus.md`, `specs/normative/contradictions.md` (`CL-001`, `CL-002`) |

---

## 5. Formalization of the Scope Variable (`P1` · `[NORMATIVE]` · `[STRUCTURAL]`)

To reconcile prose that treats Scope as a discrete set of permitted actions with equations that treat `S(t)` as a decaying scalar (`CL-010`), the canonical model defines Scope as a **paired structure `(S_dom(t), S(t))`**:

1. **Action-Set Domain (`S_dom(t) ⊆ S_0`):** The discrete set of permitted operation identifiers bound to the active PDH, session, or disc. Any sub-delegation at radial depth `d` must satisfy strict monotonic containment:
   ```text
   S_dom,d(t) ⊆ S_dom,d-1(t) ⊆ ... ⊆ S_0
   ```
2. **Scalar Authorization Capacity (`S(t) ∈ [0, S_max]`):** The time-attenuated scalar budget over elapsed verification time `Δt`:
   ```text
   S(t) = Smax × max(0, 1 − Δt/δ)
   ```
3. **Effective Permitted Scope (`S_eff(t)`):** The operational action set available at time `t` is gated by `S(t)` and `L(t)`:
   ```text
   S_eff(t) = { S_dom(t)   if S(t) > 0 and L(t) ≥ τ
              { ∅          if S(t) = 0 or L(t) < τ
   ```
   When `Δt ≥ δ`, `S(t) = 0`, which drives `L(t) = 0` and collapses `S_eff(t)` immediately to the empty set `∅`.

---

## 6. Human Key (`H(t)`) Semantics & Verification Matrix (`P0` · `[NORMATIVE]` · `[DEMO-LIMITATION]`)

Prose descriptions of `H(t)` as "verifiable conscious human intent" must not be conflated with what software or cryptography can actually prove (`CL-005`). The canonical model decomposes `H(t)` into **five distinct operational properties** and classifies each using five explicit verification statuses:

- `cryptographically verifiable`
- `system-observable`
- `externally attested`
- `assumed`
- `not technically provable`

| Operational Property | Definition | Verification Status | Normative Production Requirement | Browser Demo Status (`[DEMO-LIMITATION]`) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Human Identity** | Unique natural-person principal bound to `0•000•000•0000` | `externally attested` | Institutional identity proofing, hardware root of trust, and legal registration | `not technically provable` in browser; uses symbolic `CREATOR_ID_FORMULA` |
| **2. Key Possession** | Control over the private signing key or hardware token for the ceremony | `cryptographically verifiable` | Hardware-bound asymmetric signature (`ECDSA P-256` / HSM / YubiKey / TPM) | Simulated via local `HMAC-SHA256` over public phrase (`DEMO_CHALLENGE`); not a secret key |
| **3. Liveness** | Temporal recency (`Δt < δ`) of the principal's active ceremony | `system-observable` (clock window) / `externally attested` (physical presence) | Monotonic hardware clock + physical presence challenge within window `δ` | `system-observable` browser timer (`δ = 240s`); does not sense biological presence |
| **4. Authorization / Consent Attestation** | Formal act of granting permission for scope `S_0` free of coercion | Signed grant is `cryptographically verifiable`; non-coercion & conscious intent are `assumed` / `externally attested` and `not technically provable` by code | Signed scope manifest + procedural `CHE++` duress/coercion safeguards | Local ceremony state (`absent → pending → active`); proves no consent, consciousness, or non-coercion |
| **5. Representation Integrity** | Unbroken binding between principal, PDH, session, and delegated action | `cryptographically verifiable` & `system-observable` | Bound tuple `(Session-ID, Boot-ID, PDH-ID, Human-Attestation-ID)` + hash-chained receipt | `system-observable` local tuple binding and `SHA-256` receipt verification |

---

## 7. Attribution, Operational Accountability, Legal Responsibility, and Solvency (`P0` · `[NORMATIVE]`)

Cryptographic attribution and legal responsibility are distinct domains (`CL-006`). The canonical model separates them into four explicit concepts:

1. **Technical Attribution (`K_tech ∈ {0, 1}`)** `[DETECTION]` · `[ENFORCEMENT]`:
   *Question:* **Who cryptographically authorized or emitted the event?**
   *Mechanism:* Verified via ceremony digests, session-tuple linkage (`Session-ID`, `Boot-ID`, `PDH-ID`, `Human-Attestation-ID`), and hash-chained PLV ledger records (`cryptographically verifiable` / `system-observable`).
2. **Operational Accountability (`K_ops ∈ {0, 1}`)** `[NORMATIVE]` · `[ENFORCEMENT]`:
   *Question:* **Who is designated within the system's governance structure to answer for, interrupt, or halt the system?**
   *Mechanism:* Enforced via `Center-Origin` (`0•000•000•0000`), `Creator-ID`, and `Addressability A(t) ≥ τ` (`system-observable` / `externally attested`).
3. **Legal Responsibility (`K_legal`)** `[NORMATIVE]` · `[ASSUMPTION]`:
   *Question:* **What civil, regulatory, contractual, or criminal consequences attach under the applicable jurisdiction or institution?**
   *Mechanism:* Determined by external courts, statutes, and charters (`externally attested`). Technical attribution (`K_tech`) and operational accountability (`K_ops`) preserve tamper-evident records for legal adjudication, but software never self-adjudicates legal liability.
4. **Institutional Solvency (`U_solv`)** `[ASSUMPTION]`:
   *Question:* **What financial reserve or underwriting bond backs externalized risk?**
   *Mechanism:* An institutional governance property (e.g., the 500-Coin underwriting structure), tracked as a separate property `U_solv` rather than implicitly assumed inside the runtime gate `K(t) = K_tech(t) × K_ops(t)` unless an explicit solvency attestation gate is configured.

---

## 8. OCM Routing Claims & Resolution Axis Formalization (`P1` · `[NORMATIVE]` · `[STRUCTURAL]`)

### 8.1 Boxed Invariant: Role of the Resolution Axis (`INV-AXIS-001`)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ INV-AXIS-001: Resolution is an authority-resolution mechanism, not an authority source. │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Formal Separation of Five Operations (`CL-008`)

Prose across the OCM modules must never conflate the following five distinct operations:

| Operation | Locus | Generates Legitimacy? | Formal Semantics |
| :--- | :--- | :--- | :--- |
| **1. Generate legitimacy** | Human Key at Center Origin (`0•000•000•0000`) | **Yes** (sole source) | Attests `H(t) = 1` and issues bounded authorization `V(S_0, t)`. |
| **2. Resolve legitimacy** | Resolution Axis (`r → 0`) | **No** | Evaluates `L(t)` against `τ` and upstream gates `C(t), K(t)`. |
| **3. Transmit legitimacy state** | Radial OCM channels | **No** | Propagates read-only permission/refusal state from Origin to peripheral discs. |
| **4. Interrupt execution** | Resolution Axis / Radial Halt | **No** | Preempts and halts peripheral execution when `L(t) < τ`, `C(t) = 0`, or `Δt ≥ δ`. |
| **5. Execute an operation** | Peripheral Disc / Node (`r > 0`) | **No** | Performs bounded delegated work within `S_eff(t)` while `x(t) = Permit`. |

### 8.3 Formalization of OCM Routing Claims (`CL-007`)

Statements in the corpus such as *"resolution is always faster than coordination"* and *"oversight propagates faster than execution"* are formalized simultaneously through **Option A (Routing-Cost Metric)** and **Option B (Authority Precedence Invariants)**:

#### Option A — Logical Routing-Cost Theorem (`[STRUCTURAL]` under `[ASSUMPTION]`)

Let the logical authority-verification cost of a path be:

```text
Cost(path) = Hops_logical(path) × c_hop + Verify_origin(path)
```

Under the **Direct Attachment Axiom** (`[ASSUMPTION]`: every active disc has a direct `1`-hop logical resolution binding to Center Origin `0•000•000•0000` with cost `c_hop > 0`, whereas lateral coordination across `m ≥ 2` peripheral discs requires `m − 1 ≥ 1` lateral hops *plus* mandatory radial resolution before any state commit):

```text
Cost_resolution = 1 × c_hop + Verify_origin
Cost_lateral    = (m − 1) × c_hop + Cost_resolution

⇒  Cost_resolution < Cost_lateral   (for all m ≥ 2, c_hop > 0)
```

*Boundary note:* `Cost_resolution < Cost_lateral` is a theorem over **logical authority-verification hop count**, not an empirical claim that radial packets traverse physical copper or fiber at higher speed than local peer-to-peer packets.

#### Option B — Normative Authority Precedence Invariants (`[NORMATIVE]` · `[ENFORCEMENT]`)

Independent of physical transport latency, the architecture enforces three strict precedence invariants:

```text
INV-OCM-PRECEDENCE-001: Authoritative action must traverse the resolution path.
INV-OCM-LATERAL-002:    Lateral coordination cannot authorize, override, or commit state.
INV-OCM-PRECEDENCE-003: Resolution has precedence over coordination (Resolution ≻ Coordination).
```

---

## 9. Emergency Legitimacy Invariant (`P1` · `[NORMATIVE]` · `[ENFORCEMENT]`)

> **`INV-EMERG-001`:** **Emergency conditions never generate legitimacy.**

An adverse, urgent, or high-threat condition (including POW, duress, or infrastructure degradation scenarios) lowers neither the threshold `τ` nor the requirement for an external legitimacy anchor (`CL-009`). Emergency operation enters the system exclusively through two formal paths:

```text
Permitted Path A (Pre-Authorized Context):
Emergency
→ activate pre-authorized bounded emergency context (attested prior to emergency with explicit S_emerg, δ_emerg)

Permitted Path B (Externally Issued Authorization):
Emergency
→ request/receive externally issued emergency authorization
→ bounded emergency disc

Forbidden Path (Spontaneous Legitimacy):
Emergency
→ legitimacy spontaneously exists   [FORBIDDEN: L(t) = 0 ⇒ Refuse]
```

---

## 10. Cross-Layer Failure Semantics (`P1` · `[NORMATIVE]`)

### 10.1 Canonical Disc Lifecycle (`09-disc-lifecycle.md`)

The ten-stage disc lifecycle remains unchanged:

```text
Nonexistent
→ Specified
→ Created
→ Attached
→ Active
→ Delegating
→ Interrupted
→ Active
→ Expired
→ Terminated
```

### 10.2 Cross-Layer Failure Crosswalk (`CL-011`)

When a stopping condition (`L(t) < τ`, `Δt ≥ δ`, or security trip) occurs, different documents describe the resulting state at their respective architectural layer. Those descriptions are simultaneous projections of the same event:

| Layer | Failure State | Trigger Condition | Reversibility & Terminal Semantics |
| :--- | :--- | :--- | :--- |
| **Decision Gate (`L(t)`)** | `Refuse` (`HALT`) | `L(t) < τ`, `H(t) = 0`, `C(t) = 0`, or `K(t) = 0` | Immediate fail-closed refusal of the requested action |
| **Disc** | `Interrupted` | Radial halt pulse, scope contraction, or `L(t) < τ` | Execution suspended; may return to `Active` only via fresh valid resolution before expiry |
| **Session** | `Suspended` / `non-acting` | Attestation `pending`, stale (`Δt ≥ δ`), or `revoked` | Blocks action and session rebind until re-attested or closed |
| **Capability Profile** | `Signaling-only / reduced` | Partial scope decay (`0 < S(t) < S_max`) or degraded addressability | External actuation disabled; read-only status/why-signaling only |
| **Security Response** | `Key/session burn` | Bromine gateway trip, adversarial input, or explicit `burn` | Immediate cryptographic session-tuple termination and receipt emission |
| **Lifecycle** | `Terminated` | Post-expiry closure (`Expired → Terminated`) or session burn | Final irreversible state; zero authority or state residue |

---

## 11. Ground-0 Type System & Phase Reclassification vs. Transition (`P1` · `[NORMATIVE]` · `[DETECTION]`)

### 11.1 Disjoint Phase Types: `DeclaredPhase` vs. `DetectedPhase` (`CL-012`)

To resolve the apparent discrepancy between the three phases allowed in a Phase Declaration Header (`PDH`) and the six outcomes produced by the Ground-0 detection engine, the canonical model defines two distinct enumerated types:

```text
DeclaredPhase
    NAB
    CWO
    GSRB

DetectedPhase
    NAB
    CWO
    NAB-Constrained
    GSRB
    AMBIGUOUS
    INCOHERENT
```

| Value | In `DeclaredPhase`? | In `DetectedPhase`? | Ontological Kind | Meaning |
| :--- | :---: | :---: | :--- | :--- |
| `NAB` | Yes | Yes | Primary operational phase | **Neural Atomic Body** — Refusal-bound; external per-action legitimacy; time degrades authority. |
| `CWO` | Yes | Yes | Primary operational phase | **Custodial Witness Orb** — Witness-only; records without acting, judging, or enforcing. |
| `GSRB` | Yes | Yes | Primary operational phase | **God-Sovereign Religious Body** — Sovereign-acting; internal legitimacy; override-able refusal; time confirms authority. |
| `NAB-Constrained` | No (v1.0 PDH) | Yes (Step 3.5) | Behavioral sub-classification | Externally accountable acting body satisfying all four legislative constraints (`C1–C4`) when Step 3 is `AMBIGUOUS`. |
| `AMBIGUOUS` | No | Yes | Diagnostic classification state | Partial behavioral branch match (`≥ 3` conditions) without a complete primary branch or full `C1–C4` satisfaction. |
| `INCOHERENT` | No | Yes | Diagnostic classification state | Behavioral vector matches fewer than `3` conditions of every primary branch. |

### 11.2 Specification Baseline Status (`v1.0` vs. `v1.1`)

- **[`specs/normative/ground-0-v1.0.md`](ground-0-v1.0.md):** Finalized **normative baseline** (ratified September 12, 2026).
- **[`specs/normative/ground-0-v1.1.md`](ground-0-v1.1.md):** Ratified **normative amendment** (adopted October 14, 2026) introducing stricter qualification criteria for `B4` (terminal/stay rule, complete `≥ 50%` appeal relief dataset, or binding, penalty-free exit that explicitly terminates the specified action) and `C2`. It governs audits that explicitly select v1.1; v1.0 remains normative for audits that explicitly select v1.0.

### 11.3 Phase Reclassification vs. Phase Transition (`INV-G0-CLASS-001` · `CL-013`)

Relabeling an institution based on observed evidence is formally distinct from the institution changing its operational architecture:

- **`Declared Phase` (`φ_decl ∈ DeclaredPhase`):** The phase asserted by the entity in its signed `PDH`.
- **`Observed Phase` (`φ_obs ∈ DetectedPhase`):** The behavioral classification computed by Ground-0 from dated public evidence.
- **`Reclassification Event`:** An audit determination that `φ_obs ≠ φ_decl` (e.g., `Declared: CWO`, `Observed: GSRB` ⇒ `FORCED RE-BADGE → GSRB`).
- **`Transition Event`:** An operational state change across time (`φ_op(t_1) → φ_op(t_2)`) accompanied by an updated `PDH` and governed by Step 5 temporal transition rules (`NAB ↔ CWO` reversible; escalation to `GSRB` requires declaration review; reversion from `GSRB` forbidden without complete structural collapse).

```text
Formal Rules (INV-G0-CLASS-001):
1. Reclassification changes the classification.
2. Transition changes the operational state.
3. Classification alone does not create legitimacy.
4. Classification alone does not cause transition.
```

---

## 12. Claim-Type Annotation System (`P2` · `[NORMATIVE]`)

To distinguish mathematical invariants from environmental assumptions, runtime enforcement, and browser-demo boundaries, claims across the corpus are classified under seven canonical tags:

| Claim Tag | Meaning |
| :--- | :--- |
| `[NORMATIVE]` | Binding constitutional rule or specification requirement. |
| `[STRUCTURAL]` | Property derived mathematically or topologically from the formal model. |
| `[DETECTION]` | Property observable, auditable, or classifiable by Ground-0 or PLV verification. |
| `[ENFORCEMENT]` | Runtime kernel or protocol gate that actively blocks non-conforming transitions. |
| `[ASSUMPTION]` | Stated environmental, physical, cryptographic, or institutional precondition. |
| `[IMPLEMENTATION]` | Concrete behavior of a repository code module (`js/kernel.js`, `js/g0-engine.js`, `worker/`). |
| `[DEMO-LIMITATION]` | Explicit boundary of the browser-local simulation relative to production deployment. |

### Canonical Claim Calibration Table

| Corpus Statement | Canonical Claim Tags | Scoped Normative Interpretation |
| :--- | :--- | :--- |
| *"Legitimacy precedes capability (`L(t) < τ ⇒ Refuse`)."* | `[NORMATIVE]` · `[ENFORCEMENT]` | Constitutional rule enforced by the Stage 6 `Decision` gate in `js/kernel.js`. |
| *"Resolution is always faster than coordination."* | `[STRUCTURAL]` · `[ASSUMPTION]` (Option A) / `[NORMATIVE]` · `[ENFORCEMENT]` (Option B) | Holds as `Cost_resolution < Cost_lateral` over logical verification hops under the Direct Attachment Axiom (`Option A`), and as strict authority precedence `Resolution ≻ Coordination` (`Option B`). Does not claim lower physical wire latency across arbitrary networks. |
| *"No disc cartel can form / federation is structurally impossible."* | `[NORMATIVE]` · `[STRUCTURAL]` | Scoped as: **The architecture prevents lateral disc coordination from acquiring or accumulating sovereign authority (`INV-OCM-LATERAL-002`).** Out-of-band human collusion remains an `[ASSUMPTION]` / `[DETECTION]` domain audited by Ground-0. |
| *"Removing the anchor invalidates all dependent nodes instantly."* | `[STRUCTURAL]` · `[IMPLEMENTATION]` | In the formal model (`H(t) = 0 ⇒ L(t) = 0`) and single-context kernel (`js/kernel.js`), invalidation is zero-step (`Immediate`). In distributed physical deployments, propagation is bounded by heartbeat window `δ` (`[ASSUMPTION]`). |
| *"The Human Key represents verifiable, conscious human intent."* | `[NORMATIVE]` (goal) · `[ASSUMPTION]` · `[DEMO-LIMITATION]` | Decomposed in §6: key possession is `cryptographically verifiable` and liveness freshness is `system-observable`; consciousness and non-coercion are `assumed` / `externally attested` and `not technically provable` by software (`[DEMO-LIMITATION]` in browser). |

---

## 13. Component Interface Schema (`Parts 01–26`) & Part 27 Synthesis Contract (`P2` · `[NORMATIVE]`)

### 13.1 Stable Component Interface Header (`01–26`)

Every component file in `docs/harshal-systems/` exposes a machine-readable YAML frontmatter interface containing:

```yaml
id:
canonical_name:
depends_on:
defines:
uses:
invariants:
conflicts_with:
status:
```

This interface specifies what each component defines, what upstream components it depends on, and which invariants remain locked when downstream tools or models generate from the corpus.

### 13.2 Generative Synthesis Contract for Part XXVII (`INV-CORPUS-027`)

```text
Parts 01–26 = canonical source components
Part 27     = integrated synthesis
```

1. **Non-Invention of Invariants (`INV-CORPUS-027a`):** `Part XXVII` (`docs/harshal-systems/27-whole-corpus.md`) must **not** introduce any new security primitive, symbol, phase, or normative invariant absent from `Parts 01–26` or `specs/normative/canonical-model.md`.
2. **Permitted Generative Operations (`INV-CORPUS-027b`):** `Part XXVII` (and downstream Book II narrative generation built atop it) may synthesize, reorder, cross-index, narrativize, or instantiate existing invariants defined in `Parts 01–26` and `specs/normative/canonical-model.md`.
