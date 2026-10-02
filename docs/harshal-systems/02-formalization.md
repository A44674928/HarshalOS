---
id: HS-02-FORMALIZATION
document_id: HS-02-FORMALIZATION
canonical_name: "Part II — Formalization"
depends_on: ["HS-01-CORE-BOOK"]
defines: ["H(t)", "A(t)", "R(t)", "V(S,t)", "C(t)", "K(t)", "S(t)", "L(t)", "tau", "delta", "x(t)", "GLOSSARY"]
uses: ["CANONICAL-MINIMUM-MODEL"]
invariants: ["INV-SYM-001", "INV-STAGE-001", "INV-LEGIT-EQ-001", "INV-PRECEDENCE-A6"]
conflicts_with: []
status: NORMATIVE_SPEC
book: "Book I"
part: "Part II"
title: "Part II — Formalization"
collection: "01-foundations"
provenance_class: CANONICAL_SOURCE
status_taxonomy: NORMATIVE_SPEC
evidence_status: FORMAL_AXIOMATIC
research_layer: DEFENSIVE_SPECIFICATION
canonical_minimum_model: "Identity → Representation → Authorization → Continuity → Accountability → Refusal"
canonical_decision_flow: "Identity → Representation → Authorization → Continuity → Accountability → Decision (Permit | Refuse)"
author: "Harshal Priyavadan Patel (A44674928)"
origin_anchor: "0•000•000•0000"
source_lines: "573–784"
words: 3457
---

# Part II — Formalization

| Provenance Class | Status Taxonomy | Evidence Status | Research Layer | Book / Collection |
| :--- | :--- | :--- | :--- | :--- |
| `CANONICAL_SOURCE` | `NORMATIVE_SPEC` | `FORMAL_AXIOMATIC` | `DEFENSIVE_SPECIFICATION` | **Book I** (`01-foundations`) |

> The Canonical Minimum Model (Identity → Representation → Authorization → Continuity → Accountability → Refusal), formal constraint equations, and the Declared-Type Terminology Registry.

**Source range:** lines 573–784 of the Owner’s Working Draft · **Words:** 3,457

---

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

---

Formal Appendix: Equations and Glossary
This appendix accompanies Accountability-Gated Systems and is intended as a reference document rather than a narrative chapter. It formalizes constraints introduced in the main text and stabilizes terminology without claiming completeness. All definitions and relations remain provisional and subject to revision.
Part I - Formal Constraint Sketches
A.1 PURPOSE AND SCOPE
The equations presented here do not encode ethics, values, or moral reasoning. They encode conditions of permission. Their sole purpose is to express when a system is allowed to act at all, independent of how well it could perform the action. These relations are intentionally minimal. They are not optimization targets, loss functions, or utility models.
A.2 CORE VARIABLES
Let the following symbols denote structural properties of a system at time t:
- H(t) - The Human Key: A binary state representing verifiable, conscious human intent (1 = present, 0 = absent).
- A(t) - Addressability: The degree to which a responsible human agent can be located and compelled to answer.
- R(t) - Representation Integrity: The validity of delegation chains linking system action to an authorized representative.
- S(t) - Scope: The domain of actions the system is permitted to take.
- L(t) - Legitimacy: A derived permission state, dependent on the Human Key, addressability, representation, and scope.
A.3 LEGITIMACY AS A GATING FUNCTION
Legitimacy is treated as a precondition, not an outcome. It is mathematically gated by the Human Key.
L(t) = H(t) × f(A(t), R(t), S(t))
Note: If H(t) = 0, the system is Mathematically Void. Legitimacy immediately drops to zero, regardless of Addressability or Representation.
A.4 ACTION PERMISSION CONDITION (REFUSAL-BOUND) The default state of the system is refusal. Action is only permitted as a temporary, highly constrained exception.
{ Permitted   if L(t) >= tau
x(t) = {
   { Refusal   if L(t) < tau
Note: The threshold tau is an Absolute constraint. No utility function, emergency parameter, or optimization target may redefine or lower it.
A.5 TEMPORAL DECAY AND SCOPE REDUCTION
Addressability and representation are time-sensitive. As time passes since the last verification (Δt), the permitted scope S(t) automatically contracts.
S(t) = Smax × max(0,1 - Δt/δ)
Where δ is the maximum acceptable delay. If Δt >= δ, the transition of L(t) ￫ 0 is Immediate (zero-latency), triggering an instantaneous halt.
A.6 PRECEDENCE RULE
No optimization objective may override a violated stopping condition. Formally:
For all objectives O(i): if L(t) < tau, then argmax(O(i)) is undefined
This rule ensures legitimacy cannot be traded for performance.

Part II — Glossary (Stabilized Terms)

100% Hardened & Production-Ready
A state of complete operational readiness where the system is fully isolated (partitioned) from unauthorized inputs, resilient (hardened) against external attacks or internal drift, and stable enough for real-world, high-stakes deployment.

Absolute
A constraint that cannot be overridden by utility, emergency, or optimization. If a rule is absolute, no calculation of "the greater good" can justify breaking it.

Accountability
The obligation of an agent or institution to justify actions and accept consequences. Accountability presupposes addressability and cannot exist in its absence.

Accountability-Gated Systems (AGS)
The overarching framework itself, which ensures that all system actions are bound by strict accountability and human authorization.

Addressability
The condition under which authority can be located, confronted, and made to answer by those subject to its effects. Authority without addressability is illegitimate in practice. Or in other words, the ability to locate, challenge, and compel a responsible human agent to answer for a system's actions. If a system cannot identify a specific human to answer for its operation, it is "unaddressable" and must halt.

Advanced Threat Detection
A cybersecurity approach that leverages artificial intelligence (AI) and machine learning to identify and respond to threats in real time, enabling proactive defense against complex and decentralized attack chains.

AI Inner Shell
A high-security, address-constrained zone where AI processes occur, designed to prevent AI from ever acquiring origin authority or sovereignty.

Antivirus and Anti-Malware Software
Programs designed to detect, prevent, and remove malicious software, including viruses, worms, trojans, and spyware. These tools provide real-time protection and system scans to safeguard computers and networks from security threats.

Authority
The legitimate right to act within a normative domain. Authority is distinct from power or capability and collapses when it cannot be answered for.

Autonomous Legitimacy
The rejected notion that a system may generate the right to act solely from its own internal properties such as learning, performance, persistence, or emergence.

Behavioral Analysis
A cybersecurity technique that monitors and evaluates device activities to identify unusual patterns or deviations from normal behavior. These deviations may indicate that a device has been compromised. Even a single misplaced bit or byte can lead to severe vulnerabilities.

Capability
The technical ability of a system to perform an action. Capability does not imply permission.

Center Point (Origin)
The immutable address from which all identities, permissions, and ownership are derived within the Orb Communicator Model.


Cloud
External, distributed computational infrastructure. In a post-alignment framework, reliance on the cloud introduces "Addressability" risks, as the physical location of the processing may be separated from the human "Center Origin."

Cognitive Sovereignty
The inherent authority of an individual over their own mental faculties and internal processes.

Company-Issued Devices
Hardware such as laptops or desktops provided by the company for employee use. These devices are pre-configured with the organization’s security settings, software, and policies to ensure compliance and protect company data.

Criminal Liability
The legal accountability that arises when a system causes harm. The framework insists that liability must always rest with a human or institution, explicitly rejecting the idea that an AI can be held legally or morally responsible for its actions.

Custodial Witness Orb (CWO)
One of the three operational phases, representing a system that observes and records without the ability to act or command.

Decentralized Attack Coordination
A method used in cyberattacks where compromised devices or systems operate without a central command server, making the attack harder to detect and disrupt. In this model, each compromised device can communicate and coordinate with others, often forming a peer-to-peer network. This approach increases the attack’s resilience and reduces the risk of a single point of failure. For example, if a network like the Bitcoin blockchain were hijacked in such a manner, the combined processing power could be misused for malicious purposes once a critical mass is reached.

Delegation
A revocable grant of authority allowing an agent or system to act on behalf of others. Delegation is bounded by scope, time, and answerability.

Discs
Bounded operational contexts used within the structural model, defined by time limits, scope, and external legitimacy.

Encryption
The process of converting data into a coded format to prevent unauthorized access. Devices should employ full-disk encryption to safeguard data stored on the device (data at rest).

Generative Predictive Text
The core mechanism of large language models that simulates human reasoning by predicting the most likely next word or action. The AGS framework warns against mistaking this predictive capability for true consciousness or legitimate authority.

God-Sovereign Religious Body (GSRB)
One of the three operational phases (Phase III). A system in this phase treats its legitimacy as internal, acts and decides from its own center, allows refusal to be overridden, lets symbolism execute, and treats time as confirming its authority. It must declare its sovereignty, accept responsibility for enforcement, and acknowledge the loss of misuse resistance.

Governance & Resilience Layer (GRL)
An accessory system that enforces external constraints on AI behavior, ensuring symbolic language is non-executable and actions are human-attributable.

Ground-0
The baseline reconstruction standard and audit methodology of Harshal's Systems. Claims are reduced to atomic, testable statements with narrative dependency removed, and a system's phase is determined by its observed behavior rather than its declared intent.

Hardware Synchronization
The alignment of physical infrastructure with logical system commands to ensure operational boundaries are physically enforced.

Harshal's English
The specific linguistic syntax required for interpreting the system's logic and preventing "neurojacking."

Human Key
The verifiable, conscious intent of the human host or operator. This is the only valid authorization for a system to transition from a passive state to an active one.

Immediate
The requirement for zero-latency response when a stopping condition is met. There is no "grace period," no finishing of current tasks, and no waiting for a better moment to pause. The halt is instantaneous.

Intellectual Property
The legal and moral right to the creations of one’s own mind.

Interaction Orb
A persistent relational structure created when elements enter a constraint-violating correlation, used in non-additive communication.

Internet of Things (IoT) Devices
IoT devices are network-connected objects, such as smart TVs, thermostats, lightbulbs, streaming devices (e.g., Roku, Google Chromecast, Apple TV), and other smart electronics. These devices often have lower built-in security and can serve as potential entry points for attackers. Vulnerabilities may exist in the devices themselves, their HDMI ports, or in the data streams they interact with. Compromised servers can inject decentralized attack vectors into normal content, turning everyday devices into critical points of exposure within a network.

Legitimacy
The condition under which authority is justified and recognized. Legitimacy is granted, maintained, and withdrawn; it does not emerge automatically.

Legitimacy Drift
The gradual erosion of a system's authorization over time. This occurs when a system continues to operate on "stale permission" without recent verification from its human anchor.

Mathematically Void
A condition where the operational logic of a system becomes entirely invalid. In the AGS framework, if the human "Center Origin" is removed, the system does not just become less effective; its foundational equation for legitimacy drops to zero, making any further action logically impossible.

Neural Atomic Body (NAB)
One of the three operational phases (Phase I). A system in this phase takes its legitimacy from outside itself and per action, cannot act from its own center, treats refusal as terminal, keeps symbolic content non-executable, and lets authority degrade over time.
Neurojacking
The theoretical unauthorized manipulation of a human-AI interface by an external actor, often through the use of narrative or symbolic inputs designed to bypass standard security protocols.

Orb Communicator Model (OCM)
The communication and governance framework that defines how nodes interact and derive identity from a central origin.

Phase Declaration Header (PDH)
The mandatory structural lock used to declare a system's current operational phase and constraints.

Phase Field
Bounded environment where authorized intelligence operates under constraints.

Physical Coupling
A threat mitigation mechanism that tethers digital authority to physical reality, preventing anonymous leverage over the system.

Physical Security Measures
Policies, procedures, and controls implemented to protect physical environments and assets from unauthorized access, tampering, or the introduction of compromised devices. These measures include securing entry points, restricting device access, and maintaining an approved and thoroughly tested list of hardware to ensure only trusted equipment enters secure areas. By mitigating risks associated with sourcing components from regions with less stringent security protocols, physical security measures help prevent potential attack vectors, such as compromised devices being introduced into sensitive environments.

Provenance & Lineage Verification Layer (PLV)
The accessory system designed to prevent the reuse or mimicry of names and documentation by verifying their origin.

Refusal (Systemic)
A designed response in which a system withholds action because legitimacy conditions are not met. Refusal preserves authority by preventing its misuse. See Refusal-Bound, the system state.
Refusal-Bound
A system state where the default action is always to halt. The system only moves forward when explicitly authorized; in the face of ambiguity, it "refuses" to act. See Refusal (Systemic), the enacted response.

Regular Updates
The practice of promptly updating all software and firmware to the latest versions to maintain security and reduce the risk of vulnerabilities.

Representation
A mechanism for scaling action while preserving accountability, achieved by acting through identifiable, answerable agents.

Scope
The bounded domain of actions a system is permitted to take. Scope MUST contract as legitimacy degrades.

Segmentation
Segmentation is the practice of dividing a network into isolated sections or layers to limit the spread of attacks and contain compromised devices. By creating multiple layers of segmented networks, attackers are forced to navigate through many barriers, each acting as a separate checkpoint. This layered approach, similar to stacking multiple chessboards or nodes, makes it increasingly difficult for an intruder to find and access valuable assets. Effective segmentation ensures that even if one section is compromised, the attack is confined and sensitive data remains protected.

Server-Side Security Measures
Server-side security measures are protective actions and protocols implemented on the server to safeguard data, applications, and services from unauthorized access, attacks, and breaches. These measures include activities such as input validation, encrypted communication, authentication and authorization systems, intrusion detection, and regular patching or updates. By controlling access and monitoring activity at the server level, these measures help prevent malicious exploits and ensure the integrity and availability of back-end systems.

Service Provider
The corporate or institutional entity that maintains the infrastructure. Under the principle of "Accountability," the provider must remain legally addressable and cannot hide behind the complexity of the technology to evade responsibility.

Silent Continuation
A failure mode in which systems continue acting despite legitimacy collapse, often masked by effectiveness or automation.

Stopping Condition
A formally defined threshold at which action MUST cease or be restricted due to loss of legitimacy.

Supply Chain Attack Vector++ (SCAV++)
A comprehensive model designed for identifying and mitigating vulnerabilities within complex operational supply chains.

Supply Chain Vulnerabilities
Weaknesses or security gaps within the process of sourcing, manufacturing, and delivering components, where compromised parts can be introduced at any stage. These vulnerabilities can lead to cascading and potentially catastrophic impacts, especially in critical applications such as nuclear reactors or power grids, if not properly mitigated with stringent security protocols.

Symbolic Firewall
The mechanism that isolates narrative and mythic expressions, rendering them strictly non-executable to prevent unauthorized system changes.

Systemic Protections
The necessary safeguards established to prevent the exploitation and subjugation of human labor.

Zero Trust Architecture (ZTA)
Zero Trust Architecture is a security framework that operates on the principle of continuously verifying the trustworthiness of all users, devices, and systems—never assuming implicit trust. This approach extends beyond simply authenticating devices and users, encompassing organizational infrastructure and operations to ensure comprehensive protection. In the context of critical infrastructure, such as energy grids, ZTA mitigates risks where malicious actors or compromised management could exploit systems over time. By enforcing continuous verification and strict access controls, ZTA reduces the likelihood of successful attacks, even if insiders or sophisticated external threats attempt to manipulate or weaponize resources. Systems like the Harshal Neural OS Project apply Zero Trust principles to safeguard essential services and national assets while supporting large-scale domestic energy operations.


______________________________________________________________________
Closing Note

This appendix is intentionally incomplete. Its purpose is not to finalize a formal system, but to demonstrate that ethical restraint can be expressed structurally without being reduced to optimization.
Revisions, extensions, and counterexamples are expected.
