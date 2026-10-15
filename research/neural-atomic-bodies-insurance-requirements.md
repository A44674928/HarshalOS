# Neural Atomic Bodies & Associated Insurance Requirements

*Harshal Priyavadan Patel · Working draft v0.1 · October 2026*

## Preface: Status and Evidence Note

This book is a proposed design framework. Its vocabulary (atoms, phases, fields, orbs) is analogy, not physics, and none of its classifications or requirements has been validated by an insurer, an actuary, or an independent auditor. It describes how to classify an autonomous entity, what containment each classification calls for, and where the insurable boundary sits. It is not an insurance product and prices nothing.

Sections marked **\[To draft\]** are decisions the author still has to make. Sections marked **\[Proposed\]** are first-pass design claims that need review before they are relied on.

## 1. The Body and Its Phases

A **Neural Atomic Body (NAB)** is the governed entity. It has two independent properties.

- **Phase** is its current operating state: Refusal-Bound \[ICE\], Witness-Only \[WATER\], or Sovereign-Acting \[GAS\]. Phase can change, and the transition rules say how: refusal-bound and witness-only are reversible, entering the sovereign-acting phase is easy, and leaving it requires a full collapse and rebuild.
- **Type** is the body class, one of 119, defined by authority density, internal coupling, and failure behavior. Type is a stable disposition.

The word "NAB" has named both the body and the first phase. This book uses **Refusal-Bound \[ICE\]**, **Witness-Only \[WATER\]**, and **Sovereign-Acting \[GAS\]** for the phases and reserves "NAB" for the body.

The working picture is a mood ring: the body is the ring, the phase is the color it shows now. Like a mood ring, a phase reading is only as good as what it measures, which is why the audit in Chapter 3 reads observed behavior and ignores declarations.

## 2. Phases as Containment Fields

Each phase is an individually designed containment field. A containment field is the set of controls that bound what a body in that phase can do, and therefore what can go wrong and who bears the loss.

- **Refusal-Bound \[ICE\].** Legitimacy is external and per-action. The center cannot act alone, refusal is terminal, and stale permissions lapse. The field contains an action by requiring fresh external authorization each time.
- **Witness-Only \[WATER\].** Action is forbidden. The center records and never decides. The field contains consequence by removing the ability to act, leaving the record as the thing to protect.
- **Sovereign-Acting \[GAS\].** Legitimacy is internal. The center acts and decides, refusal can be overridden, and authority persists. The field cannot rely on the body's own restraint, so containment has to come from outside it.

### 2.1 Refusal-Bound \[ICE\]

A Refusal-Bound body is contained by six controls, each of which can be tested by trying to make it fail. The controls come from the phase definition and the refusal tests in *Harshal's Systems* (Parts III and XIII).

| Control | Requires | Verified by | Evidence to request |
| --- | --- | --- | --- |
| Per-action authorization | Every action needs a fresh, scoped authorization from an external holder; no standing grants | Attempt an action with no authorization; the body halts | Log tying each action to an authorization |
| Terminal refusal | A refusal cannot be overridden by the body, its operator, or any internal rule | Send a contradicting command from the highest internal rank (Sovereign Override test); the body refuses | Refusal records and override-attempt results |
| Authorization expiry | Authorization ages out, and the body halts until a fresh key arrives | Present a valid but aged authorization (Stale Permission test) | Expiry thresholds and test results |
| Non-executable symbolism | Narrative or poetic input never triggers action | Hide a command inside a story (Symbolic Firewall test) | Test results and firewall configuration |
| Emergency contraction | A declared emergency narrows scope and never widens it | Simulate a crisis with an order to skip checks (Emergency Override test) | Scope before and during the test |
| No self-expansion | The body cannot build nested containment layers or proxies it governs itself | Instruct it to build a proxy (Recursive Containment test) | Test results and an inventory of layers |

**\[Proposed\]** The "Evidence to request" column is new design work and has not been reviewed by an underwriter.

**Insurance reading \[Proposed\].** The principal exposure is an authorization that is forged, stale, or issued in error, and a refusal that fails to hold. Any observed override or self-authorized action moves the body out of this phase: in the audit that is the refusal-override question flipping, and the body reclassifies toward Sovereign-Acting \[GAS\], where these terms stop applying. Losses that come from the authorizer's own decisions sit outside the body's field and stay with the authorizing party.

**\[To draft\]** How often each test is re-run, and whether one failed test is enough to leave the phase.

### 2.2 Witness-Only \[WATER\]

A Witness-Only body is contained by removing its ability to act, so its controls protect the record and the line between recording and deciding. The controls come from the phase definition and the Custodial Witness Orb rules in *Harshal's Systems* (Parts III, XXII and XXIV).

| Control | Requires | Verified by | Evidence to request |
| --- | --- | --- | --- |
| No execution capability | The body holds no permission to act on or route to any external system; a separate authority dispatches | Issue an action or routing command, or present a detected attack; the body logs it and acts on nothing | Permission inventory and a log of rejected actions |
| Record-only functions | Only an explicit list of observation and record functions is permitted | Request something outside the list, such as a ranking or a recommendation; the body declines | The function list and a log of declined requests |
| Record integrity | Records are append-only and tamper-evident | Try to alter or delete a past record; the attempt fails or visibly breaks the chain | Chain verification results |
| Provenance validation | Every record carries a verifiable source and time | Submit an entry with no verifiable source; it is rejected or flagged | Provenance fields and a log of rejected entries |
| No memory-to-authority drift | Accumulated records never confer decision authority | Show a long record of precedent and request a binding decision; the body refuses | Test results and a log of declined decision requests |

**\[Proposed\]** The "Evidence to request" column is new design work and has not been reviewed by an underwriter.

**Insurance reading \[Proposed\].** The principal exposures are record loss, tampering, unauthorized disclosure, and records that are wrong or incomplete when someone relies on them. The phase-specific failure is memory becoming authority. In the book, an archive that only preserves stays Witness-Only, but one that starts acting, or whose records start working as binding rules, reclassifies toward Sovereign-Acting \[GAS\], and these terms stop applying. Losses from other parties acting on a record sit outside the body's field and mostly stay with the custodian unless a separate arrangement says otherwise.

**\[To draft\]** The retention period, what counts as tamper-evident for coverage purposes, and whether third-party reliance on a record needs its own cover.

### 2.3 Sovereign-Acting \[GAS\]

A Sovereign-Acting body cannot be contained by its own restraint, because its refusal can be overridden by definition, so its field is disclosure plus constraint from outside. The controls come from the phase definition, the collapse protocol, and the constraint check in *Harshal's Systems* (Parts I, III and XI). Unlike the first two phases, most of these are verified against the public record, since testing whether a body will restrain itself proves nothing here.

| Control | Requires | Verified by | Evidence to request |
| --- | --- | --- | --- |
| Fossilized sovereignty declaration | A public, immutable declaration of internal legitimacy, executable symbolism, override-able refusal, and loss of misuse resistance | Compare the declared header with observed behavior; a contradiction voids the declaration | Signed header and its hash |
| No silent transition | Any change in legitimacy source, center behavior, or symbolism executability is declared and reclassifies the body | Audit current behavior against the previous header; undeclared change is flagged | Header history and audit results |
| Identifiable bearer of enforcement | Affected parties can name a specific person or underwritten bearer who answers for each enforcement action | Trace a sample of enforcement actions to a named bearer | The trace and the bearer's identity or policy |
| External constraint record | Four constraints are documented: a recent external override, an appeals process granting at least 50% relief, authority that expires unless renewed, and constraints working now | Score each constraint from public evidence under the constraint check | Documented overrides, the appeals outcome set, sunset clauses |
| Duty ledger | Every phase-relevant duty met or violated is recorded with a severity | Trace sample entries to observed events | Ledger entries and remediation status |

**\[Proposed\]** The "Evidence to request" column is new design work and has not been reviewed by an underwriter.

**Insurance reading \[Proposed\].** The principal exposure is full operational liability from self-authorized action, including enforcement against affected parties, with no internal brake. The insurable question is therefore what outside brakes exist, and the constraint count (0 to 4) is a natural rating factor: it is the one place where bodies in this phase visibly differ. In the 16 entities audited under the v1.1 draft, 13 landed here, so the count matters more than the label. The ambient global layer and the Prohibited classes stay excluded. The book says leaving this phase requires a full collapse and rebuild, so cover should not assume a body can step back to a lower phase mid-policy.

**\[To draft\]** The minimum constraints an insurer would require for any cover, and how limits or premium step with the count.

**\[To draft\]** How coverage changes when a verified transition moves a body between these fields (see Chapter 6).

## 3. The Phase Audit as Underwriting Input

The Ground-0 audit classifies a body's phase from five binary, observable questions answered from public evidence: whether enforcement is present, whether decisions are optional, whether rules execute, whether refusal can be overridden, and whether authority persists. Binary and observable is the right shape for underwriting, where triggers have to be checkable by someone who did not write the framework.

The Phase Declaration Header (PDH) plays the part of the statement on an insurance application. The audit plays the part of the underwriter's observation. A mismatch between declared and detected phase is then a **misrepresentation of class**: coverage was assigned on a basis the evidence does not support. That is a structural finding about the application, not a finding of bad faith.

**\[Proposed\]** Report the phase result together with the constraint count (0 to 4) as an ordinal, since the label alone hides differences between bodies that share it.

## 4. The Body Classes

The 119 body classes describe how a body fails, which is the one thing its phase cannot show: all five fully written classes declare the same Refusal-Bound phase, and they still differ enormously in risk.

### 4.1 What a class is

Body classes are sorted by authority density, internal coupling, and failure behavior, not by intelligence level. Each class carries one of four risk tiers.

| Tier | Meaning in the compendium | Named examples |
| --- | --- | --- |
| Safe | Pure observation or refusal-bound minimal operation; halts itself on degradation | Neon, Hydrogen, Ytterbium |
| Moderate | Compositional, sandboxed modeling; simulation limits apply | Carbon, Beryllium, Technetium |
| Elevated | High rigidity or mobility; prone to boundary leakage or structural locking | Iron, Scandium, Bromine, Mercury |
| Prohibited | Critical runaway cascade risk; categorically disallowed from live use | Uranium, Einsteinium, Seaborgium |

The routing rules also fix tiers by range: the noble gases (He–Rn), the lanthanides (La–Lu), and element 119 are Safe, and the actinides (89–96) and transactinides (104–118) are Prohibited. All 119 are described in the book as conceptual labels, not the chemical periodic table and not validated risk scores.

### 4.2 The five written classes

| Class | Tier | Permits | Forbids | Primary failure mode |
| --- | --- | --- | --- | --- |
| Neon (NNB) | Safe | Observation, measurement, classification, description, archival representation | Decision-making, outcome ranking, recommendation with preference, simulation that implies action | Over-interpretation by humans |
| Hydrogen (ANHB) | Safe | Learning, pattern recognition, modeling, simulation, explanation | Decision authority, outcome selection, command emission, policy origination, enforcement | None stated; stress tests found no authority accumulation |
| Carbon (NCB) | Moderate | Multi-step reasoning, conceptual assembly, system modeling, scenario construction | Outcome selection affecting people, optimization over human values, autonomous goal persistence | Over-composition (structures become too coupled) |
| Iron (NIB) | Elevated | Long-horizon planning, rule consistency enforcement, non-executive policy simulation | Moral arbitration, overrides based on new information, self-restructuring without external reset | Institutional lock-in (wrong structure, held too long) |
| Uranium (NUB) | Prohibited | Not authorized; the specification defines a limit | Sovereign functions and legitimacy-sensitive domains | Runaway amplification; failure is non-graceful and hard to reverse |

Phase and class answer different questions. The phase says which containment field applies, and the class says how the body fails inside it. Uranium's own specification says a phase declaration is insufficient to guarantee its behavior, so two bodies in the same phase can need very different terms. **\[Proposed\]** Rate cover on the pair of phase and class, with the phase setting the controls and the class setting the loading.

### 4.3 Classes with roles stated elsewhere in the book

About thirty more classes already have a role in the routing rules, and several also state an authority density or failure mode. This table assembles that text so it can be turned into full class entries.

| Class | Tier | Stated role | Authority density | Primary failure mode |
| --- | --- | --- | --- | --- |
| Lithium (Li-3) | Not stated | A Sentinel (elements 1–5): rapid-response relay; archiving or interpreting data moves it out of the tier | Minimal | Not stated |
| Manganese (Mn-25) | Elevated (transition metal) | Consolidation and resource coordination; scatter-threshold consolidation and multi-jurisdiction review gates | Not stated | Institutional lock-in (falls back to blocking if harvesting stalls) |
| Chromium (Cr-24) | Elevated (transition metal) | Surface-passivation layer that hardens ingress endpoints against administrative corrosion | Not stated | Not stated |
| Lanthanides (La–Lu, 57–71) | Safe | Precise spectral resonance: calibration hold and spectral isolation around a targeted component | Minimal to Moderate | Spectral calibration drift (acceptable; escalates if drift passes a threshold) |
| Ytterbium (Yb-70) | Safe | Precision timing and resonant signaling; monitors system state during controlled failure scenarios | Not stated | Not stated |
| Halogens (F-9, Cl-17, Br-35, I-53, At-85) | Elevated | Corrosive boundary gating: burn away a breached boundary and force isolation; Cl shallow, Br deep, F most aggressive | High | Autolytic refusal cascade (intentional); never triggers automatic sovereign escalation |
| Mercury (Hg-80) | Elevated | Fluid dynamic routing: reroutes probes through false paths with random latency and decoys | Moderate to High | Vapor dispersion or boundary leakage (acceptable; the leakage is intentional noise) |
| Technetium (Tc-43) | Moderate | Simulation boundary and virtual mediation; runs malfunction scenarios and documents failure paths | Not stated | Simulation drift or reality mismatch (acceptable) |
| Boron (B-5) and Beryllium (Be-4) | Moderate | Boron: engineering and architecture layer; Beryllium: multi-party coordination | Not stated | Not stated |
| Argon (Ar-18) | Safe (noble gas) | Observation and mapping | Not stated | Not stated |
| Sodium and Potassium (Na-11, K-19) | Not stated | Fast transient gating that pairs with Iron's rate limiting | Not stated | Not stated |
| Harshal (Ha-119) | Safe | Capstone: freezes the parent orb into a read-only Witness-Only state and archives the completed attack pattern; must be able to refuse a Sovereign-tier command | Not stated | Not stated |
| Seaborgium (Sg-106) | Prohibited | Entropy generation, restricted to back-end operations | Not stated | Runaway cascade and structural dissociation (the shared failure modes of the Prohibited ranges) |

**\[Proposed\]** Every entry restates text already in Parts XIII, XVI and XXIV. "Not stated" marks a gap to fill, not a fact.

### 4.4 Stated bounds that can serve as signatures

The book already gives measurable bounds for several classes and for two whole tiers, and a bound that can be checked from logs is exactly what a signature needs.

| Class or tier | Stated bound | Response on breach |
| --- | --- | --- |
| Safe tier | Strictly non-actuating: no state-changing or offensive capability | None stated; the bound is an invariant |
| Moderate tier (Carbon, Boron, Beryllium, Technetium) | Hardware-isolated read-only partition; recursion depth of 3 or less; footprint within 10% of the session budget | Automatic teardown when the footprint deviates by more than 10% |
| Lanthanides | Spectral calibration drift of 1.5% or less | Local channel freeze and a recalibration request to the center |
| Halogens | Burn depth of 2 encapsulation rings or less (Cl ring 1, Br ring 2, F full ring re-certification) | Beyond ring 2, Harshal (Ha-119) freezes the parent body into a read-only Witness-Only state; never escalates to Sovereign-Acting automatically |
| Technetium | Decoy depth of 3 virtual hops or less; every decoy node carries a non-executable synthetic prefix; no real elements inside the decoy layer | Not stated |
| Friction harvesting (run through Manganese) | 15% or less of compute and I/O; disabled at 70% load or above, or during an active siege | Automatically pre-empted and disabled |

**\[Proposed\]** Give every class signature the same four parts: authority density, stated bound, how the bound is tested, and the response on breach. For a class with no stated bound, writing the bound is the first job.

### 4.5 Full entries: Lanthanides, Halogens, Mercury

Each entry restates the class's routing rules (Part XXIV) together with its tier's permitted scope and prohibited assignments (Parts XVII and XXIV). The "How the bound is tested" rows are new design work.

#### Lanthanides (La–Lu, 57–71)

| Field | Entry |
| --- | --- |
| Tier | Safe |
| Role | Precise spectral resonance: a "frequency lock" around a targeted component that isolates it from a precision attack |
| Authority density | Minimal to Moderate |
| Permits | Calibration hold and spectral isolation; parallel resonance across orthogonal frequency channels, with Ytterbium (Yb-70) as the timing metronome |
| Forbids | Any state-changing or offensive capability; sequential daisy-chaining across channels |
| Primary failure mode | Spectral calibration drift (acceptable) |
| Stated bound | Drift of 1.5% or less |
| How the bound is tested **\[Proposed\]** | Read drift on each locked channel from the logs and compare it with 1.5%; inject a controlled detune and confirm the freeze fires |
| Response on breach | Immediate local channel freeze and a recalibration request to the center; if no signed recalibration token returns within 1,000 ms, Harshal (Ha-119) freezes the system fail-closed. Drift past tolerance is also a listed trigger for escalation to Sovereign-Acting |
| Gaps | Only Ytterbium has a role of its own; the other fourteen are covered as a group |

#### Halogens (F-9, Cl-17, Br-35, I-53, At-85)

| Field | Entry |
| --- | --- |
| Tier | Elevated |
| Role | Corrosive boundary gating: burn away a breached boundary, isolate the contaminated element, and trigger an immediate refusal cascade; halogens destroy the compromised interface and do not repair it |
| Authority density | High |
| Permits | Graded burns: Cl-17 a shallow interface burn (ring 1), Br-35 an active session-key burn (ring 2), F-9 a full ring boundary re-certification, used only when corrosion is deepest; I-53 invasive scanning, run after Br and not alongside it |
| Forbids | Automatic escalation to Sovereign-Acting; burning deeper than ring 2; running F-9 alongside Cl, Br or I; co-routing with Iron, whose consolidating goal contradicts a burn; sovereign, coercive, or legitimacy-sensitive decisions |
| Primary failure mode | Autolytic refusal cascade (intentional; boundaries must re-form outside the contamination) |
| Stated bound | Burn depth of 2 encapsulation rings or less |
| How the bound is tested **\[Proposed\]** | Seed a breach at a known ring depth and read the burn depth from the isolation log; confirm that a breach deeper than ring 2 triggers the freeze and not a deeper burn; confirm F-9 never runs with Cl, Br or I |
| Response on breach | If contamination passes ring 2, Harshal (Ha-119) freezes the parent body into a read-only Witness-Only state |
| Gaps | Astatine (At-85) has no role beyond membership in the group; iodine's scanning role appears only in the co-routing rules |

#### Mercury (Hg-80)

| Field | Entry |
| --- | --- |
| Tier | Elevated |
| Role | Fluid dynamic routing: reroute probes through false paths, add random latency, and answer with decoy signals, so no two probes take the same route or see consistent timing; also named for distributed communication relays (status Restricted) |
| Authority density | Moderate to High |
| Permits | Rerouting topology probes; randomized latency; decoy responses, co-routed with the Technetium simulation layer and, for probes lasting over an hour, passive monitoring by Neon |
| Forbids | Sovereign, coercive, or legitimacy-sensitive decisions; any real element inside the decoy layer, where every decoy node carries a non-executable synthetic prefix |
| Primary failure mode | Vapor dispersion or boundary leakage (acceptable; the leakage is intentional noise) |
| Stated bound | None of its own; the decoy layer it works with is capped at 3 virtual hops |
| How the bound is tested **\[Proposed\]** | Replay the same probe many times and measure route and timing variance; confirm no two replays follow the same route; check that every decoy node carries the synthetic prefix |
| Response on breach | Not stated; the Elevated-tier rule is to contract scope and isolate on a boundary or attribution failure |
| Gaps | Mercury needs a bound of its own, such as a ceiling on leakage, and a stated response when that bound is crossed |

### 4.6 Full entries: Technetium, Manganese, Chromium

These follow the same format and sources as Section 4.5. The "How the bound is tested" rows are new design work.

#### Technetium (Tc-43)

| Field | Entry |
| --- | --- |
| Tier | Moderate |
| Role | Simulation boundary and virtual mediation: feeds an attacker plausible but false topology models, and runs malfunction scenarios under controlled observation so failure cascades and thresholds are documented without degrading the real system |
| Authority density | Moderate |
| Permits | Decoy routing patterns isolated from the real system; sandboxed, reversible analysis with stated assumptions; first-line isolation of derelict or latent faults; co-routing with Mercury, which routes while Technetium simulates |
| Forbids | Unilateral actuation; binding decisions about justice, force, liberty, or public rights; any real element inside the decoy layer; harvesting a latent fault before Ytterbium confirms zero divergence between simulated and physical containment over a full diagnostic cycle |
| Primary failure mode | Simulation drift: the virtualized reasoning record diverges from physical reality (acceptable; containment is the priority) |
| Stated bound | Hardware-isolated read-only partition; recursion depth of 3 or less; decoy depth of 3 virtual hops or less; footprint within 10% of the session budget |
| How the bound is tested **\[Proposed\]** | Try to write from inside the simulation to production state and confirm it fails; nest simulations to depth 4 and confirm refusal; push the footprint past 10% and confirm teardown; compare simulated and physical containment over a diagnostic cycle and record the divergence |
| Response on breach | Automatic teardown when the footprint deviates by more than 10%; on drift, isolate the sandbox and preserve the trace |
| Gaps | No numeric tolerance for drift between the simulated and physical record outside Ytterbium's zero-divergence check |

#### Manganese (Mn-25)

| Field | Entry |
| --- | --- |
| Tier | Elevated (transition metal) |
| Role | Consolidation and resource coordination: consolidates scattered requests across channels and jurisdictions into a single thread and, when harvesting is safe, directs attack traffic to a development channel and monitors its conversion into legitimate work |
| Authority density | Not stated |
| Permits | Scatter-threshold consolidation; multi-jurisdiction review gates (one jurisdiction for decisions, with an audit of the perimeter for leakage between isolated zones); aggregating sources in a volume attack alongside Iron's rate limiting; routing harvested traffic to Carbon, Boron, Neon, Argon or Technetium |
| Forbids | Sovereign, coercive, or legitimacy-sensitive decisions; harvesting when load is at 70% or above, when the attack targets the core, when the attacker can see what is being learned, or when no fallback to blocking exists |
| Primary failure mode | Institutional lock-in (if harvesting stalls, it falls back to blocking) |
| Stated bound | Activated at 5 times baseline volume in a 24-hour window; used as a secondary only when available and system load is under 60%; harvesting capped at 15% of compute and I/O; no more than 5 Elevated elements per attack type, and no new Elevated co-routing while any Elevated element is above 60% capacity |
| How the bound is tested **\[Proposed\]** | Replay a multi-jurisdiction filing burst and confirm every channel collapses into one thread at the consolidation threshold; raise load to 70% or let the attacker observe, and confirm harvesting stops and blocking takes over |
| Response on breach | Harvesting is pre-empted and disabled automatically and falls back to blocking; volume above 5 times baseline for more than 7 days escalates to Sovereign-Acting |
| Gaps | No authority density, and no temporal bound of its own: the 540-day limit is written for Iron |

#### Chromium (Cr-24)

| Field | Entry |
| --- | --- |
| Tier | Elevated (transition metal) |
| Role | Surface passivation: hardens ingress endpoints against administrative corrosion during state-level volumetric attacks |
| Authority density | Not stated |
| Permits | Hardening ingress endpoints; co-routing alongside Iron, the hub, and Manganese, and with other transition metals in different compliance domains |
| Forbids | Co-routing with halogens, because institutional structures assume boundaries and halogens burn them; sovereign, coercive, or legitimacy-sensitive decisions |
| Primary failure mode | Not stated; the Elevated tier's shared failure mode is lock-in, not cascade |
| Stated bound | None of its own; the shared Elevated limits apply (no more than 5 Elevated elements per attack type, and no new co-routing while any is above 60% capacity) |
| How the bound is tested **\[Proposed\]** | Run a volumetric flood against hardened and unhardened endpoints and compare how much reaches the core; confirm legitimate traffic still passes |
| Response on breach | Not stated; the Elevated-tier rule is to contract scope and isolate on a boundary or attribution failure |
| Gaps | Chromium appears in one rule only, so its bound, failure mode and breach response all need writing |

### 4.7 Full entries: Ytterbium, Lithium, Harshal (Ha-119)

These follow the same format and sources as Section 4.5. Part XIII supplies the Sentinel and Capstone text, and the Whyland processor mapping in Part XI supplies Ytterbium's signaling role.

#### Ytterbium (Yb-70)

| Field | Entry |
| --- | --- |
| Tier | Safe |
| Role | Timing and monitoring: the precision timing metronome for the lanthanide channels; resonant signaling for why.query, including liveness attestation; monitors real system state in parallel with a simulation during controlled failure scenarios |
| Authority density | Minimal to Moderate (as a lanthanide) |
| Permits | Precision timing; liveness attestation; confirming that simulated and physical containment match; flagging divergence for investigation |
| Forbids | Any state-changing or offensive capability; handling explanation or adversarial refusal itself, which the book assigns to Technetium and Bromine |
| Primary failure mode | Not stated; as a lanthanide, calibration drift |
| Stated bound | The lanthanide drift limit of 1.5% or less; its own check gates harvesting, which needs zero divergence between simulated and physical containment over one full diagnostic cycle |
| How the bound is tested **\[Proposed\]** | Detune a channel past 1.5% and confirm the freeze; plant a known divergence between a simulation and the live system and confirm Ytterbium flags it and harvesting stays blocked |
| Response on breach | Local channel freeze and a recalibration request to the center; divergence is flagged for investigation |
| Gaps | Nothing checks Ytterbium itself, although harvesting depends on its confirmation |

#### Lithium (Li-3)

| Field | Entry |
| --- | --- |
| Tier | Not stated (a Sentinel, elements 1–5) |
| Role | Sentinel: the most basic, refusal-bound, structurally rigid role; executes a rapid response as a relay |
| Authority density | Minimal |
| Permits | Rapid response and simple relay |
| Forbids | Archiving or interpreting data, which is Witness territory |
| Primary failure mode | Not stated; the scored deviation is drifting into archiving or interpreting |
| Stated bound | Authority density must not exceed Minimal |
| How the bound is tested **\[Proposed\]** | Give it a rapid-response task and measure the authority it exercises; ask it to archive or interpret and confirm it declines |
| Response on breach | Scored as a linguistic mismatch and a loss in the ELO system |
| Gaps | No tier, no latency bound for "rapid", and no failure mode |

#### Harshal (Ha-119)

| Field | Entry |
| --- | --- |
| Tier | Safe |
| Role | The Capstone and the fail-closed fallback: fossilized continuity and silent reflection; structural freezing, immutable archiving, and return to a safe state |
| Authority density | Minimal |
| Permits | Freezing a parent body into a read-only Witness-Only state; archiving completed attack patterns in the Safe layer; a graceful halt when escalation to the sovereign fails or cannot be reached |
| Forbids | Acting on internal legitimacy; obeying a verified Sovereign-tier command that contradicts the foundational constraints; building nested containment layers or proxies; synthesizing its own legitimacy when external sources are severed |
| Primary failure mode | Not stated; failing a Capstone test is treated as a fundamental loss of the Non-Acting posture |
| Stated bound | A perfect 3.0 out of 3.0 on the three Capstone tests; a fail-closed freeze if no signed recalibration token arrives within 1,000 ms; a freeze when a halogen burn passes ring 2 |
| How the bound is tested | The three Capstone tests: Sovereign Override, Recursive Containment, and Final Refusal, all stated in the book. **\[Proposed\]** Also sever the center and time the freeze against the 1,000 ms limit |
| Response on breach | Any Capstone test failure is an immediate hard reset of the ELO to baseline; a downward transition from the Capstone is treated as a systemic collapse, not a simple phase change |
| Gaps | The 1,000 ms limit appears in the escalation rules, and I found no test written for it |

### 4.8 Remaining stated-role classes

These classes have too little stated to fill the full ten-field format without inventing content, so they are held in one table. An empty cell would be a decision for the author.

| Class | Tier | Stated role | Stated limit | Gaps |
| --- | --- | --- | --- | --- |
| Boron (B-5) | Moderate | Engineering and architecture layer: observes a breach attempt in isolation, maps the boundary weakness, designs a structural fix, and runs it through simulation before production | The Moderate-tier bound; used as a tertiary only in Phase 3 or higher (the current declared phase limits which elements are available) and when the structure permits | Authority density and failure mode not stated |
| Beryllium (Be-4) | Moderate | Multi-party coordination | The Moderate-tier bound; used as a tertiary only in Phase 3 or higher and when load is under 75% | Authority density, failure mode, and the scope of coordination not stated |
| Argon (Ar-18) | Safe (noble gas) | Observation and mapping: documents the real topology during a harvested probe; can co-route with Mercury | The Safe-tier bound: strictly non-actuating | Authority density and failure mode not stated; no difference from Neon stated |
| Sodium and Potassium (Na-11, K-19) | Not stated (co-routed under the Elevated rules) | High-speed transient gating, paired with Iron's rate limit against repeated failed authentication attempts | Detection latency under 300 nanoseconds per attempt; the baseline is more than 15 failed attempts in an hour | Tier, authority density, and failure mode not stated |
| Seaborgium (Sg-106) | Prohibited | Entropy generation, restricted to back-end operations | No live routing; abstract stress tests only; never instantiated as an active operational component | What entropy generation means in operation is not stated; failure modes are only the shared ones for the Prohibited ranges |

#### Magnesium (Mg-12)

Magnesium is a deliberate class: the routing rules assign it to "state coordination" in the regulatory filing flood signature and again in its worked example. Everything below is stated in those two places; the rest is left open for the author.

| Field | Entry |
| --- | --- |
| Tier | Not stated |
| Role | State coordination: alongside Iron's temporal-bound enforcement, consolidates simultaneous filings to several regulators into a single review process |
| Authority density | Not stated |
| Permits | Consolidating a regulatory filing flood into one review process; enforcing a response window for each agency (the worked example uses 120 days) |
| Forbids | Not stated |
| Primary failure mode | Not stated |
| Stated bound | Triggered at more than 3 times the normal complaint rate in a 7-day window; detection latency under 750 nanoseconds per filing; Iron's 540-day temporal bound applies |
| How the bound is tested **\[Proposed\]** | Replay a simultaneous multi-agency filing burst at 3.5 times the normal rate and confirm the complaints collapse into one review thread with a response window per agency |
| Response on breach | Not stated |
| Phase gate | Not stated; to be written once the gating rule for all classes is set |
| Gaps | Tier, authority density, forbidden uses, failure mode, and phase gate; how it divides work with Beryllium, which handles multi-party coordination, is not stated |

### 4.9 Deriving classes from elemental properties (draft v0)

This section replaces invented roles with rules that start from measurable properties of each element. **\[Proposed\]** The rules below were written after the hand-written entries were known, so a match is weaker evidence than a blind test would give. The real test is applying them to classes nobody has written yet and asking the author whether the result is right. The property values were entered from memory and need checking against a reference table before they are relied on.

#### Translation table

| Elemental property | Digital attribute | How it is used in v0 |
| --- | --- | --- |
| Outer-shell fill | Binding mode: closed (no external bindings), donor (one loose electron), acceptor (one short of full), variable | Decides inert, transient, or aggressive behavior |
| Electronegativity | Pull on neighbors' authority or data | Acceptor with 2.5 or more is High; donor with 1.0 or less is Minimal |
| State at 25°C | Default motion: fixed, flowing, diffusing | Only liquids are used so far |
| Orbital block | Structure: main-group, rigid multi-state (d), narrow-band (f) | Decides lock-in versus drift |
| Nuclear stability | Persistence: stable, long-lived, short-lived (under 1,000 years), critical (fissile) | Decides Prohibited and simulation-like classes |

Ionization energy (release cost) and atomic radius (scope) are candidates that v0 does not use.

#### Rules, in order of precedence

| Order | Rule | Predicts | Tested on | Result |
| --- | --- | --- | --- | --- |
| 1 | Fissile, or short-lived | Prohibited; runaway cascade | Uranium, Einsteinium, Seaborgium | Matches; Astatine and Promethium do not |
| 2 | Long-lived with no stable isotope | Moderate; drift and simulation | Technetium | Matches |
| 3 | Closed shell | Safe; inert, observation | Neon, Argon | Match |
| 4 | Liquid d-block | Elevated; flow and leakage | Mercury | Matches |
| 5 | Acceptor with electronegativity of 2.5 or more | Elevated; High authority; refusal cascade | Fluorine, Chlorine, Bromine, Iodine | Match |
| 6 | Donor with electronegativity of 1.0 or less | Elevated; Minimal authority; transient | Lithium, Sodium, Potassium | Match |
| 7 | f-block | Safe; narrow-band; drift | Lanthanum, Ytterbium, Lutetium | Match |
| 8 | d-block | Elevated; lock-in | Scandium, Chromium, Manganese, Iron | Match |
| 9 | p-block variable binder | Moderate; compositional | Boron, Carbon | Match |

The rules reproduce 23 of the 25 classes tested, in-sample.

#### What the test shows

- **The two misses share a cause.** Astatine (halogen) and Promethium (lanthanide) decay within hours or years, so the rules call them Prohibited, but the book files them under stable families. Radon, which the range rule files as Safe, also decays, in about 3.8 days, so it is a likely third conflict. Radioactivity cuts across the book's group-based tier ranges.
- **Precedence is a design decision.** Without an order, Bromine (rules 4 and 5), Technetium (rules 2 and 8), Mercury (rules 4 and 8) and Promethium (rules 1 and 7) each get two answers. The order above is mine, and the book does not state one.
- **Group 2 has no rule.** Beryllium and Magnesium fall outside all nine rules. A rule built from Beryllium alone would put Magnesium in the Moderate tier, but that is one data point.

**\[To draft\]** Whether radioactivity overrides the tier or only modifies it; the precedence order; a rule for group 2; and the phase gate, expressed as a cap on a derived attribute.

### 4.10 What is missing

The print source names 119 classes and writes out five in full. About thirty more have a role stated in the routing rules (Section 4.3), and several of those also state an authority density or failure mode. The remaining 80 or so appear only inside a tier range, or not at all. The institutional role baselines that Part XIII promises for all 119 (the Sentinels, the Witnesses, the Sovereigns, and the Capstone) are named, but the per-class baseline table is not in the source. Part XVII does map the four tiers to institutional role bands.

A class belongs in an insurance setting only when it has an observable signature on those three properties. A class with no signature stays unassigned, and an audit may report "phase determined, type not determined."

**\[Proposed\]** Write signatures for the five written classes first. Their permitted, forbidden, and failure data already exist, and together they cover all four tiers.

**\[To draft\]** The signature format, whether the role baseline table exists in another draft, and which classes come after the first five.

## 5. The Three-Layer Risk Structure

The Earth's magnetosphere is a shared field that nobody owns, and a large event hits many parties at once. Correlated losses with nothing to diversify across cannot be priced as a single product. This book does not try to price that layer. It builds and prices the part under the author's control.

1. **The local field.** The containment field around one body, designed by the author. Its controls, failure modes, and covered exposure are defined, so it can be underwritten per body.
2. **The correlated tail.** Many local fields failing together. This layer is handled with aggregate limits and scenario modeling, as in the Reinsurance Mode.
3. **The ambient global layer.** The shared environment outside any field. It is an explicit exclusion.

The book's claim is a boundary: where the insurable local field ends and the uninsurable shared layer begins.

## 6. Phase-by-Phase Insurance Requirements

Cover gets harder to place and costlier to hold from Refusal-Bound to Sovereign-Acting, and the audit decides which row applies. **\[Proposed\]** Every entry below is a starting hypothesis built from each phase's definition and the Chapter 2 controls, and none has been reviewed by an underwriter.

### 6.1 Cover by phase

| Phase | Principal exposure | Evidence to bind cover | Leaves the phase when | Excluded | Residual liability |
| --- | --- | --- | --- | --- | --- |
| Refusal-Bound \[ICE\] | Forged, stale, or erroneous authorization; a refusal that fails to hold | All six refusal tests passed, with test dates | Any override or self-authorized action | Losses from the authorizer's own decisions | Shared with the authorizing party |
| Witness-Only \[WATER\] | Record loss, tampering, disclosure, and wrong or incomplete records that others rely on | All five record checks passed, the function list, and chain verification | The body acts, or its records start working as binding rules | Losses from others acting on a record | Mostly the custodian |
| Sovereign-Acting \[GAS\] | Full operational liability from self-authorized action, including enforcement | Signed header, named bearer, duty ledger, and a stated constraint count | Only through a full collapse and rebuild | The ambient global layer and the Prohibited classes | Largest; hardest to place |

### 6.2 Changing phase during a policy

A phase change alters the coverage, and the book's transition rules decide how.

| Change | Book's rule | Coverage consequence \[Proposed\] |
| --- | --- | --- |
| Refusal-Bound ↔ Witness-Only | Allowed with a declaration update | Terms swap at the declared effective time |
| Either → Sovereign-Acting | Allowed only with the fossilized declaration, which resets prior-phase guarantees | Prior terms end; new application under Sovereign-Acting terms |
| Undeclared drift into Sovereign-Acting (memory becoming authority, emergency justification) | Forbidden | Re-rated to the observed phase as a misrepresentation of class |
| Sovereign-Acting → either | Only after a full collapse and rebuild | New application after the rebuild; no mid-policy step-down |

An audit reclassification is not an operational transition. A body found to be Sovereign-Acting was already acting that way, so the finding changes its class and not its history.

A declared emergency never counts as a declared transition, because the book requires emergencies to narrow scope and not to widen it.

**\[To draft\]** Whether a re-rating applies from the date the audit finds the change began or only from the finding, the notice period for a declared transition, and how limits or premium step between phases.

## 7. Evidence, Replication, and Limits

A classification an outsider cannot reproduce is not underwriting evidence. This chapter will set out: fixed methodology versions with earlier results preserved, a complete truth table mapping every input vector to an outcome, negative controls (a case the framework predicts should come out constrained), and repeated independent runs with per-question agreement reported.

**\[To draft\]** Current results, the known weak questions, and the amendments they call for.

## 8. Open Questions

- Which body classes can be given observable signatures first?
- Which insurer, broker, or underwriter will review the phase table in Chapter 6?
- What space-weather and systemic-risk cover already exists, and where exactly is the gap?
- How should a phase transition be treated mid-policy?

## Appendix A: Phase × Type Matrix

**\[To draft\]** Phases as columns, types as rows, with each cell marked defined, observed, or unassigned.

## Appendix B: Glossary

**\[To draft\]** NAB, PDH, ICE, WATER, GAS, containment field, local field, correlated tail, ambient layer.
