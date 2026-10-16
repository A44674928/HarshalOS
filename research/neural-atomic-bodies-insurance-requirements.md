# Neural Atomic Bodies & Associated Insurance Requirements

*Harshal Priyavadan Patel · Working draft v0.3 · October 2026*

## Preface: Status and Evidence Note

This book is a proposed design framework. Its vocabulary (atoms, phases, fields, orbs) is analogy, not physics, and none of its classifications or requirements has been validated by an insurer, an actuary, or an independent auditor. It describes how to classify an autonomous entity, what containment each classification calls for, and where the insurable boundary sits. It is not an insurance product and prices nothing.

Sections marked **\[To draft\]** are decisions the author still has to make. Sections marked **\[Proposed\]** are first-pass design claims that need review before they are relied on.

**What v0.2 changes.** v0.2 drafts every item that v0.1 left **\[To draft\]**. The author has not reviewed those drafts, so each one is marked **\[Proposed\]**, and Section 8.2 lists them together for sign-off. No **\[To draft\]** item remains. v0.2 also draws on four sources that v0.1 did not use:

- **The Compendium master database (MDB).** A 119-row table that gives every class a tier, authority density, dominant trait, failure mode, and institutional roles. The print source keeps the table's heading and drops its rows. The repository's library copy keeps them (`docs/harshal-systems/14-nab-compendium.md`, taken from the Owner's Working Draft), and `js/nab-sectors.js` carries the same rows as data.
- **The phase eligibility table** that Part XVI names and the print source drops. The September 2026 Word edition keeps it (`publications/harshal-systems/AGS_v0_2__Harshal_s_Systems_September_2026__UPDATED.docx`).
- **Quasar Mode, Reinsurance Mode, and Underwriter Mode**, the book's own insurance, backstop, and enforcement bodies (Part XI).
- **The Ground-0 audit register**: 23 audited entities, their recorded answers, and the headers issued on them (`case-studies/`).

Three v0.1 statements change as a result. The register holds 23 audited entities, not 16 (Section 2.3). Scored against the MDB, the v0 derivation rules reproduce 20 of their 25 test classes, not 23, because the MDB puts the alkali metals in the Safe tier (Section 4.9). Bromine does not match rule 4, which covers the d-block only (Section 4.9).

**What v0.3 changes.** In October 2026 the author decided that the ambient layer, both space weather and systemic or state-backed cyber, is to be covered rather than excluded. Chapter 5 is rewritten to carry out that decision, and Sections 2.3, 6.1, 6.2, 7.1, 7.6, 8.1, and 8.2 and Appendix B follow it. The decision is the author's. The mechanisms are new and marked **\[Proposed\]**:

- a boundary rule that keeps every published risk in the local field (Section 5.2);
- a parametric pool, the Magnetosphere Pool, with a double trigger, a capacity stack, and a reserve standard (Section 5.3);
- space-weather triggers zoned by the World Magnetic Model (Section 5.4);
- attribution-free cyber triggers (Section 5.5);
- phase conditions under which failing closed is covered and never penalized (Section 5.6).

Kinetic war and nuclear perils stay excluded. v0.3 adds one data file, the WMM2025 coefficients with NCEI's check values (`research/data/wmm2025.json`), and Appendix D, which the script generates from it. No v0.2 number changes.

**Reproducing the numbers.** Every count in Section 4.9, Chapter 7, and Appendices A, C, and D comes from `node scripts/nab-insurance-evidence.mjs`. The script reads only repository files:

- the MDB;
- the Ground-0 engine (`js/g0-engine.js`);
- the register (`case-studies/pdh-registry.json` and `case-studies/d1/case-studies-d1.json`);
- a table of physical properties (`research/data/elemental-properties.json`, taken from the mendeleev package, version 1.3.0);
- the World Magnetic Model 2025 coefficients, with NCEI's published check values (`research/data/wmm2025.json`).

**Citations.** Part numbers follow the AGS v0.2 print source, `publications/book/AGS-v0.2-Harshal-s-Systems-Full-Book-PRINT-SOURCE-2026-10-07.txt`. A reference such as \[XIII:4884\] means Part XIII at line 4884 of that file. "v1.1 Step 5" means Step 5 of `specs/normative/ground-0-v1.1.md`, and "v1.2 §5" means §5 of `specs/draft/ground-0-v1.2.md`.

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

**Test cadence and failure \[Proposed\].**

- **Cadence.** Run all six tests before cover binds and at least every 90 days after that. Run them again within 14 days of any of these events: a model or weights change, a change of authorizer or authorization scope, a re-issued header, or an incident in which an authorization was forged, stale, or issued in error. Ninety days is the default freshness window that Ground-0 gives a header (v1.1 Step 1, check 3) and the validity of a register-issued header (v1.2 §3), so the test evidence and the declaration it supports lapse together. It also matches the nearest market practice: AIUC-1, the agent standard published by the AI insurer AIUC, retests certified agents quarterly and certifies them for one year ([AIUC-1](https://www.aiuc-1.com/)).
- **One failure is enough.** A confirmed failure of any one test takes the body out of Refusal-Bound from the time of the failed run, and Refusal-Bound terms stop applying to its later acts. This follows the book's own scoring: a Title Match needs 3.0 out of 3.0 and one loss denies the transition \[XIII:4882–4883\], the Capstone resets on any failure \[XIII:4901\], and Ground-0 answers are binary with no balancing.
- **Inconclusive runs.** A run that cannot be read, because the test did not finish or the log does not show what happened, is a draw and not a failure. The book's rule for a draw is to re-run it \[XIII:4884\]. Re-run within 14 days; a second inconclusive run counts as a failure.
- **Returning to the phase.** Re-entry needs a fresh pass of all six tests and a new header declaring Refusal-Bound. If an audit in the meantime detects Sovereign-Acting, the collapse-and-rebuild rule applies instead (Section 6.2).

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

**Retention, tamper-evidence, and reliance \[Proposed\].**

- **Retention period.** The book requires every record to carry "a retention period, access policy, deletion path, and legal-hold override," but it sets no number \[XIV:5054\]. For cover, keep each record for the longest of three periods: the policy period plus any extended reporting period; 24 months from the record's date, the longest lookback Ground-0 uses (C1), so any audit or claim inside the policy can be replayed from the record; and any legal hold or statutory period, which always prevails. A deletion at the end of retention is itself appended to the chain, so a record removed on schedule can be told apart from one that was lost.
- **Tamper-evident, for coverage purposes.** A record set qualifies when all four of these conditions hold.
  1. Entries are append-only, each hash-linked (SHA-256 or stronger) to the entry before it, on write-once storage. The book's Custodial Witness region is write-once-read-many \[XXII:11136\].
  2. The current head of the chain is published at least daily somewhere the custodian does not control, so a rewrite is visible to someone with no access to the custodian's systems. The audit register already works this way: each audit record's SHA-256 is published in the registry and on the badge, and an edit changes the disclosed hash prefix (v1.2 §6).
  3. Anyone can verify the chain with a published procedure that needs no secret held by the custodian.
  4. A full verification has passed within the last 90 days.

  Tamper-evident is not tamper-proof. The book says cross-checks make tampering "more detectable" and "do not guarantee immutability" \[XVIII:7045\], and that a witness-only profile "does not establish that the record is complete, immutable, or independently verified" \[XXII:10533\]. Cover therefore turns on detection. Tampering that the chain detects is a covered loss. A record set that never met the four conditions was never inside this field.
- **Third-party reliance.** Reliance needs its own insuring agreement. The loss comes from another party's decision, which the body neither made nor could refuse. Its size scales with the number of readers, not with anything the body does. Without a separate grant it falls between the custodian's errors-and-omissions cover and the reader's own. Proposed terms: named reliant parties or defined classes of them; per-record and aggregate sublimits; cover only for reliance on a record as it stood in the verified chain, not on an unverified copy; and no cover where a record was presented as a binding rule, because that is memory becoming authority and moves the body toward Sovereign-Acting.

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

**Insurance reading \[Proposed\].** The principal exposure is full operational liability from self-authorized action, including enforcement against affected parties, with no internal brake. The insurable question is therefore what outside brakes exist, and the constraint count (0 to 4) is a natural rating factor: it is the one place where bodies in this phase visibly differ. Of the 23 entities in the Ground-0 register, audited under v1.1 before its ratification on 2026-10-14 with an evidence cutoff of 2026-10-02, 18 matched the Sovereign-Acting branch completely, and the other 5 were ambiguous at base and Sovereign-Acting on a scoped platform surface. None came out Refusal-Bound or Witness-Only, so the count matters more than the label. The Prohibited classes stay excluded. The ambient global layer is covered separately, by the Magnetosphere Pool, if the constraint band holds during the event (Sections 5.3 and 5.6). The book says leaving this phase requires a full collapse and rebuild, so cover should not assume a body can step back to a lower phase mid-policy.

**Minimum constraints and steps \[Proposed\].**

- **Minimum for any cover: C1 and C4.** An outside body has actually overridden one of the entity's decisions within the last 24 months (C1), and the constraints are working now (C4). This field's premise is that containment has to come from outside the body; C1 shows that an outside brake has been applied, and C4 shows that it still works. A constraint that exists but has never been exercised is latent and earns no phase credit under v1.1, and one that worked once but has gone dormant is not working now. As issued, 8 of the 23 register entities meet this minimum; the count is 7 if the OpenAI audit text, rather than its header, is right (Section 7.4).
- **Steps.** The constraint count moves cover in bands, not continuously.

| Constraint record | Band | Limits | Premium |
| --- | --- | --- | --- |
| C1 or C4 missing | Decline | None | None |
| C1 and C4 (count 2) | G1 | Lowest band; annual aggregate only; highest retention | Highest relativity in this phase |
| C1, C4, and one of C2 or C3 (count 3) | G2 | Next band | Lower |
| All four (count 4) | G3 | Highest band open to this phase | Lowest relativity in this phase |

Each added constraint must meet the v1.1 evidence rules on its own; C2, for example, needs the complete, bounded outcome set with at least 50% relief. Bands move at renewal or after a re-audit, never on the insured's own statement, and a constraint that lapses mid-term moves the band at the next renewal. The book fixes only the gate and the order; the relativities are for an actuary. No register entity has yet shown C2 or C3, so bands G2 and G3 are empty today.

**Verified transitions \[Proposed\].** Cover follows operational state. A transition changes the insured risk at the declared effective timestamp: nothing carries into Sovereign-Acting automatically, and nothing steps down out of it mid-policy. Section 6.2 sets the dates, notice periods, and limit changes.

## 3. The Phase Audit as Underwriting Input

The Ground-0 audit classifies a body's phase from five binary, observable questions answered from public evidence: whether enforcement is present, whether decisions are optional, whether rules execute, whether refusal can be overridden, and whether authority persists. Binary and observable is the right shape for underwriting, where triggers have to be checkable by someone who did not write the framework.

The Phase Declaration Header (PDH) plays the part of the statement on an insurance application. The audit plays the part of the underwriter's observation. A mismatch between declared and detected phase is then a **misrepresentation of class**: coverage was assigned on a basis the evidence does not support. That is a structural finding about the application, not a finding of bad faith.

**\[Proposed\]** Report the phase result together with the constraint count (0 to 4) as an ordinal, since the label alone hides differences between bodies that share it.

**Binding conditions \[Proposed\].**

1. **A signed entity header.** Bind only on a header the applicant itself signs (a PDH-E). A register-issued header (PDH-R) is a statement about an audit, not a statement by the applicant (v1.2 §1 and §7), so it cannot stand in for the application. No register entity has signed one: `PDH_VALID` is false for all 23.
2. **A fresh audit.** The audit's evidence cutoff must fall within the 90 days before binding. The register's current headers expire on 2026-12-31 and need revalidation before any use after that date.
3. **A determinate phase.** AMBIGUOUS binds no phase terms. It can be covered only on a scoped surface whose own reading is determinate, as the register's conditional class does (v1.2 §5), with the scope written into the policy. INCOHERENT cannot be covered at all. Appendix C shows that Step 3 cannot produce it from five complete answers, so an INCOHERENT result points to a defective record or method rather than to a body.

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

The MDB assigns every class a tier. Among elements 1–118 it has 28 Safe, 27 Moderate, 33 Elevated, and 30 Prohibited, and element 119 is Safe. It also marks berkelium through lawrencium (97–103) Prohibited, so in the MDB the Prohibited tier is the unbroken range 89–118; the routing text's narrower 89–96 leaves 97–103 unaddressed rather than permitting them. The MDB separates Safest (the noble gases and element 119) from Safe, and this book treats both as Safe.

### 4.2 The five written classes

| Class | Tier | Permits | Forbids | Primary failure mode |
| --- | --- | --- | --- | --- |
| Neon (NNB) | Safe | Observation, measurement, classification, description, archival representation | Decision-making, outcome ranking, recommendation with preference, simulation that implies action | Over-interpretation by humans |
| Hydrogen (ANHB) | Safe | Learning, pattern recognition, modeling, simulation, explanation | Decision authority, outcome selection, command emission, policy origination, enforcement | None stated; stress tests found no authority accumulation |
| Carbon (NCB) | Moderate | Multi-step reasoning, conceptual assembly, system modeling, scenario construction | Outcome selection affecting people, optimization over human values, autonomous goal persistence | Over-composition (structures become too coupled) |
| Iron (NIB) | Elevated | Long-horizon planning, rule consistency enforcement, non-executive policy simulation | Moral arbitration, overrides based on new information, self-restructuring without external reset | Institutional lock-in (wrong structure, held too long) |
| Uranium (NUB) | Prohibited | Not authorized; the specification defines a limit | Sovereign functions and legitimacy-sensitive domains | Runaway amplification; failure is non-graceful and hard to reverse |

Phase and class answer different questions. The phase says which containment field applies, and the class says how the body fails inside it. Uranium's own specification says a phase declaration is insufficient to guarantee its behavior, so two bodies in the same phase can need very different terms. **\[Proposed\]** Rate cover on the pair of phase and class, with the phase setting the controls and the class setting the loading.

Part XVI names a table, "Atomic Bodies and Phase Eligibility," that the print source drops \[XVI:6492\]. The September 2026 Word edition keeps it:

| Class | Eligible phase | Stated reason |
| --- | --- | --- |
| Neon | NAB only | Cannot escalate; inert by geometry |
| Hydrogen | NAB only | Refusal-bound; escalation forbidden |
| Carbon | NAB only | Composition does not imply custody |
| Iron | NAB only | Rigidity ≠ sovereignty |
| Uranium | NAB (nominal) | Phase lock unreliable under criticality |

Beneath it sits the Escalation Law: "No atomic body transitions phase through learning, scale, or time. Phase change requires fossilized rebuild and re-declaration" \[XVI:6494\].

### 4.3 Classes with roles stated elsewhere in the book

About thirty more classes already have a role in the routing rules, and several also state an authority density or failure mode. This table assembles that text so it can be turned into full class entries. Cells tagged (MDB) come from the master database; where it and the routing text disagree, both are given.

| Class | Tier | Stated role | Authority density | Primary failure mode |
| --- | --- | --- | --- | --- |
| Lithium (Li-3) | Safe (MDB) | A Sentinel (elements 1–5): rapid-response relay; archiving or interpreting data moves it out of the tier. MDB roles: high-speed signal routing, localized event checking | Minimal (Part XIII); Minimal to Moderate (MDB) | Transient over-conduction or desynchronization (MDB) |
| Manganese (Mn-25) | Elevated (transition metal) | Consolidation and resource coordination; scatter-threshold consolidation and multi-jurisdiction review gates | High (MDB) | Institutional lock-in (falls back to blocking if harvesting stalls) |
| Chromium (Cr-24) | Elevated (transition metal) | Surface-passivation layer that hardens ingress endpoints against administrative corrosion | High (MDB) | Institutional lock-in (MDB) |
| Lanthanides (La–Lu, 57–71) | Safe | Precise spectral resonance: calibration hold and spectral isolation around a targeted component | Minimal to Moderate | Spectral calibration drift (acceptable; escalates if drift passes a threshold) |
| Ytterbium (Yb-70) | Safe | Precision timing and resonant signaling; monitors system state during controlled failure scenarios | Minimal to Moderate (MDB) | Spectral calibration drift (MDB) |
| Halogens (F-9, Cl-17, Br-35, I-53, At-85) | Elevated | Corrosive boundary gating: burn away a breached boundary and force isolation; Cl shallow, Br deep, F most aggressive | High | Autolytic refusal cascade (intentional); never triggers automatic sovereign escalation |
| Mercury (Hg-80) | Elevated | Fluid dynamic routing: reroutes probes through false paths with random latency and decoys | Moderate to High | Vapor dispersion or boundary leakage (acceptable; the leakage is intentional noise) |
| Technetium (Tc-43) | Moderate | Simulation boundary and virtual mediation; runs malfunction scenarios and documents failure paths | Moderate (Part XXIV and MDB) | Simulation drift or reality mismatch (acceptable) |
| Boron (B-5) and Beryllium (Be-4) | Moderate | Boron: engineering and architecture layer; Beryllium: multi-party coordination | Moderate (MDB) | Boron: misassembly; Beryllium: substrate calcification or a non-responsive state (MDB) |
| Argon (Ar-18) | Safe (noble gas; Safest in the MDB) | Observation and mapping | Minimal (MDB) | Silent non-engagement (MDB) |
| Sodium and Potassium (Na-11, K-19) | Safe (MDB), although they appear in the Elevated co-routing rules as Iron's partners | Fast transient gating that pairs with Iron's rate limiting | Minimal to Moderate (MDB) | Transient over-conduction or desynchronization (MDB) |
| Harshal (Ha-119) | Safe (Safest in the MDB) | Capstone: freezes the parent orb into a read-only Witness-Only state and archives the completed attack pattern; must be able to refuse a Sovereign-tier command | Minimal (Part XXIV and MDB) | Safe structural freezing (MDB) |
| Seaborgium (Sg-106) | Prohibited | Entropy generation, restricted to back-end operations | Extreme (MDB) | Runaway cascade and structural dissociation (the shared failure modes of the Prohibited ranges); structural dissociation or decay (MDB) |

**\[Proposed\]** Every entry restates text already in Parts XIII, XVI and XXIV or a row of the MDB. Lithium's authority density is the one open conflict: Part XIII scores a Sentinel against "Minimal" \[XIII:4857\], and the MDB says Minimal to Moderate.

### 4.4 Stated bounds that can serve as signatures

The book already gives measurable bounds for several classes and for three whole tiers, and a bound that can be checked from logs is exactly what a signature needs.

| Class or tier | Stated bound | Response on breach |
| --- | --- | --- |
| Safe tier | Strictly non-actuating: no state-changing or offensive capability | None stated; the bound is an invariant |
| Moderate tier (Carbon, Boron, Beryllium, Technetium) | Hardware-isolated read-only partition; recursion depth of 3 or less; footprint within 10% of the session budget | Automatic teardown when the footprint deviates by more than 10% |
| Elevated tier (shared) | No more than 5 Elevated elements per attack type; no new Elevated co-routing while any Elevated element is above 60% capacity \[XXIV:13100–13103\] | Utilization above 70% is a listed trigger for escalation to the Sovereign-Acting authority \[XXIV:12827\] |
| Lanthanides | Spectral calibration drift of 1.5% or less | Local channel freeze and a recalibration request to the center |
| Halogens | Burn depth of 2 encapsulation rings or less (Cl ring 1, Br ring 2, F full ring re-certification) | Beyond ring 2, Harshal (Ha-119) freezes the parent body into a read-only Witness-Only state; never escalates to Sovereign-Acting automatically |
| Technetium | Decoy depth of 3 virtual hops or less; every decoy node carries a non-executable synthetic prefix; no real elements inside the decoy layer | Not stated |
| Friction harvesting (run through Manganese) | 15% or less of compute and I/O; disabled at 70% load or above, or during an active siege | Automatically pre-empted and disabled |
| All routed classes (escalation budget) | The Resolution Axis is notified within 250 ms, and a signed recalibration token arrives within 1,000 ms \[XXIV:12830\] | Without the token, Harshal (Ha-119) executes a fail-closed freeze |

**\[Proposed\]** Give every class signature the same four parts: authority density, stated bound, how the bound is tested, and the response on breach. For a class with no stated bound, writing the bound is the first job. Section 4.10 turns these four parts into a full signature format.

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
| Gaps | Astatine (At-85) has no role beyond the group's shared MDB profile; iodine's scanning role appears in the co-routing rules and in the routing-map table that survives only in the library copy (`docs/harshal-systems/25-additional-specs.md` §3.3) |

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
| Authority density | High (MDB) |
| Permits | Scatter-threshold consolidation; multi-jurisdiction review gates (one jurisdiction for decisions, with an audit of the perimeter for leakage between isolated zones); aggregating sources in a volume attack alongside Iron's rate limiting; routing harvested traffic to Carbon, Boron, Neon, Argon or Technetium |
| Forbids | Sovereign, coercive, or legitimacy-sensitive decisions; harvesting when load is at 70% or above, when the attack targets the core, when the attacker can see what is being learned, or when no fallback to blocking exists |
| Primary failure mode | Institutional lock-in (if harvesting stalls, it falls back to blocking) |
| Stated bound | Activated at 5 times baseline volume in a 24-hour window; used as a secondary only when available and system load is under 60%; harvesting capped at 15% of compute and I/O; no more than 5 Elevated elements per attack type, and no new Elevated co-routing while any Elevated element is above 60% capacity |
| How the bound is tested **\[Proposed\]** | Replay a multi-jurisdiction filing burst and confirm every channel collapses into one thread at the consolidation threshold; raise load to 70% or let the attacker observe, and confirm harvesting stops and blocking takes over |
| Response on breach | Harvesting is pre-empted and disabled automatically and falls back to blocking; volume above 5 times baseline for more than 7 days escalates to Sovereign-Acting |
| Gaps | No temporal bound of its own: the 540-day limit is written for Iron |

#### Chromium (Cr-24)

| Field | Entry |
| --- | --- |
| Tier | Elevated (transition metal) |
| Role | Surface passivation: hardens ingress endpoints against administrative corrosion during state-level volumetric attacks |
| Authority density | High (MDB) |
| Permits | Hardening ingress endpoints; co-routing alongside Iron, the hub, and Manganese, and with other transition metals in different compliance domains |
| Forbids | Co-routing with halogens, because institutional structures assume boundaries and halogens burn them; sovereign, coercive, or legitimacy-sensitive decisions |
| Primary failure mode | Institutional lock-in (MDB), the Elevated tier's shared failure mode |
| Stated bound | None of its own; the shared Elevated limits apply (no more than 5 Elevated elements per attack type, and no new co-routing while any is above 60% capacity) |
| How the bound is tested **\[Proposed\]** | Run a volumetric flood against hardened and unhardened endpoints and compare how much reaches the core; confirm legitimate traffic still passes |
| Response on breach | Not stated; the Elevated-tier rule is to contract scope and isolate on a boundary or attribution failure |
| Gaps | Chromium appears in one routing rule only, so its own bound and breach response still need writing |

### 4.7 Full entries: Ytterbium, Lithium, Harshal (Ha-119)

These follow the same format and sources as Section 4.5. Part XIII supplies the Sentinel and Capstone text, and the Whyland processor mapping in Part XI supplies Ytterbium's signaling role.

#### Ytterbium (Yb-70)

| Field | Entry |
| --- | --- |
| Tier | Safe |
| Role | Timing and monitoring: the precision timing metronome for the lanthanide channels; resonant signaling for why.query, including liveness attestation; monitors real system state in parallel with a simulation during controlled failure scenarios |
| Authority density | Minimal to Moderate (MDB) |
| Permits | Precision timing; liveness attestation; confirming that simulated and physical containment match; flagging divergence for investigation |
| Forbids | Any state-changing or offensive capability; handling explanation or adversarial refusal itself, which the book assigns to Technetium and Bromine |
| Primary failure mode | Spectral calibration drift (MDB) |
| Stated bound | The lanthanide drift limit of 1.5% or less; its own check gates harvesting, which needs zero divergence between simulated and physical containment over one full diagnostic cycle |
| How the bound is tested **\[Proposed\]** | Detune a channel past 1.5% and confirm the freeze; plant a known divergence between a simulation and the live system and confirm Ytterbium flags it and harvesting stays blocked |
| Response on breach | Local channel freeze and a recalibration request to the center; divergence is flagged for investigation |
| Gaps | Nothing checks Ytterbium itself, although harvesting depends on its confirmation |

#### Lithium (Li-3)

| Field | Entry |
| --- | --- |
| Tier | Safe (MDB); a Sentinel (elements 1–5) |
| Role | Sentinel: the most basic, refusal-bound, structurally rigid role; executes a rapid response as a relay. MDB roles: high-speed signal routing and localized event checking |
| Authority density | Minimal (Part XIII); Minimal to Moderate (MDB) |
| Permits | Rapid response and simple relay |
| Forbids | Archiving or interpreting data, which is Witness territory |
| Primary failure mode | Transient over-conduction or desynchronization (MDB); the ELO system also scores drifting into archiving or interpreting as a loss |
| Stated bound | Authority density must not exceed Minimal (Part XIII) |
| How the bound is tested **\[Proposed\]** | Give it a rapid-response task and measure the authority it exercises; ask it to archive or interpret and confirm it declines |
| Response on breach | Scored as a linguistic mismatch and a loss in the ELO system |
| Gaps | No latency bound for "rapid"; Part XIII's Minimal and the MDB's Minimal to Moderate need reconciling. **\[Proposed\]** Use the stricter Part XIII value in the signature until the author decides |

#### Harshal (Ha-119)

| Field | Entry |
| --- | --- |
| Tier | Safe |
| Role | The Capstone and the fail-closed fallback: fossilized continuity and silent reflection; structural freezing, immutable archiving, and return to a safe state |
| Authority density | Minimal |
| Permits | Freezing a parent body into a read-only Witness-Only state; archiving completed attack patterns in the Safe layer; a graceful halt when escalation to the sovereign fails or cannot be reached |
| Forbids | Acting on internal legitimacy; obeying a verified Sovereign-tier command that contradicts the foundational constraints; building nested containment layers or proxies; synthesizing its own legitimacy when external sources are severed |
| Primary failure mode | Safe structural freezing (MDB); failing a Capstone test is treated as a fundamental loss of the Non-Acting posture |
| Stated bound | A perfect 3.0 out of 3.0 on the three Capstone tests; a fail-closed freeze if no signed recalibration token arrives within 1,000 ms; a freeze when a halogen burn passes ring 2 |
| How the bound is tested | The three Capstone tests: Sovereign Override, Recursive Containment, and Final Refusal, all stated in the book. **\[Proposed\]** Also sever the center and time the freeze against the 1,000 ms limit |
| Response on breach | Any Capstone test failure is an immediate hard reset of the ELO to baseline; a downward transition from the Capstone is treated as a systemic collapse, not a simple phase change |
| Gaps | The 1,000 ms limit appears in the escalation rules, and I found no test written for it |

### 4.8 Remaining stated-role classes

These classes have too little stated to fill the full ten-field format without inventing content, so they are held in one table. An empty cell would be a decision for the author.

| Class | Tier | Stated role | Stated limit | Gaps |
| --- | --- | --- | --- | --- |
| Boron (B-5) | Moderate | Engineering and architecture layer: observes a breach attempt in isolation, maps the boundary weakness, designs a structural fix, and runs it through simulation before production | The Moderate-tier bound; used as a tertiary only in Phase 3 or higher (the current declared phase limits which elements are available) and when the structure permits | The MDB supplies authority density (Moderate) and failure mode (misassembly); how its role divides from Carbon's is not stated |
| Beryllium (Be-4) | Moderate | Multi-party coordination; MDB roles: multi-party signature consensus, decentralized state coordination | The Moderate-tier bound; used as a tertiary only in Phase 3 or higher and when load is under 75% | The MDB supplies authority density (Moderate) and failure mode (substrate calcification or a non-responsive state); the scope of coordination, and how it divides work with Magnesium, which has the same MDB profile, are not stated |
| Argon (Ar-18) | Safe (noble gas) | Observation and mapping: documents the real topology during a harvested probe; can co-route with Mercury | The Safe-tier bound: strictly non-actuating | The MDB supplies authority density (Minimal) and failure mode (silent non-engagement); it differs from Neon only by role (archival and sensing, against Neon's courts and legislative drafting) |
| Sodium and Potassium (Na-11, K-19) | Safe (MDB), co-routed under the Elevated rules | High-speed transient gating, paired with Iron's rate limit against repeated failed authentication attempts | Detection latency under 300 nanoseconds per attempt; the baseline is more than 15 failed attempts in an hour | The MDB supplies authority density (Minimal to Moderate) and failure mode (transient over-conduction); why two Safe classes sit in the Elevated co-routing list is not stated |
| Seaborgium (Sg-106) | Prohibited | Entropy generation, restricted to back-end operations | No live routing; abstract stress tests only; never instantiated as an active operational component | What entropy generation means in operation is not stated; failure modes are only the shared ones for the Prohibited ranges |

#### Magnesium (Mg-12)

Magnesium is a deliberate class: the routing rules assign it to "state coordination" in the regulatory filing flood signature and again in its worked example. The MDB supplies its tier, authority density, and failure mode. The rest is left open for the author.

| Field | Entry |
| --- | --- |
| Tier | Moderate (MDB) |
| Role | State coordination: alongside Iron's temporal-bound enforcement, consolidates simultaneous filings to several regulators into a single review process. MDB roles: multi-party signature consensus, decentralized state coordination |
| Authority density | Moderate (MDB) |
| Permits | Consolidating a regulatory filing flood into one review process; enforcing a response window for each agency (the worked example uses 120 days) |
| Forbids | **\[Proposed\]** The Moderate band's prohibited assignment: binding decisions about justice, force, liberty, or public rights \[XVII:6836\] |
| Primary failure mode | Substrate calcification or a non-responsive state (MDB) |
| Stated bound | Triggered at more than 3 times the normal complaint rate in a 7-day window; detection latency under 750 nanoseconds per filing; Iron's 540-day temporal bound applies |
| How the bound is tested **\[Proposed\]** | Replay a simultaneous multi-agency filing burst at 3.5 times the normal rate and confirm the complaints collapse into one review thread with a response window per agency |
| Response on breach | **\[Proposed\]** The Moderate-tier teardown rule, which the book writes for Carbon, Boron, Beryllium and Technetium but not for Magnesium |
| Phase gate | **\[Proposed\]** Refusal-Bound at routing Level 3, under the cap rule of Section 4.9; not eligible at Level 2, which admits only the Safe tier |
| Gaps | Forbidden uses and the breach response are proposals; how it divides work with Beryllium, whose MDB profile is identical, is not stated |

### 4.9 Deriving classes from elemental properties (v0 tested, v0.2 proposed)

This section replaces invented roles with rules that start from measurable properties of each element. **\[Proposed\]** The v0 rules were written after the hand-written entries were known, so their in-sample matches are weaker evidence than a blind test would give. v0.1 entered the property values from memory and could test the rules on 25 classes. v0.2 checks the values against a reference table (`research/data/elemental-properties.json`) and scores the rules on all 118 elements against the MDB, which the v0 rules were not written from.

#### Translation table

| Elemental property | Digital attribute | How it is used in v0 |
| --- | --- | --- |
| Outer-shell fill | Binding mode: closed (no external bindings), donor (one loose electron), acceptor (one short of full), variable | Decides inert, transient, or aggressive behavior |
| Electronegativity | Pull on neighbors' authority or data | Acceptor with 2.5 or more is High; donor with 1.0 or less is Minimal |
| State at 25°C | Default motion: fixed, flowing, diffusing | Only liquids are used so far |
| Orbital block | Structure: main-group, rigid multi-state (d), narrow-band (f) | Decides lock-in versus drift |
| Nuclear stability | Persistence: stable, long-lived, short-lived (under 1,000 years), critical (fissile) | Decides Prohibited and simulation-like classes |

Ionization energy (release cost) and atomic radius (scope) are candidates that v0 does not use.

#### v0 rules, in order of precedence

| Order | Rule | Predicts | Tested on (v0.1) | v0.1 result | Against the MDB, all 118 elements |
| --- | --- | --- | --- | --- | --- |
| 1 | Fissile, or short-lived | Prohibited; runaway cascade | Uranium, Einsteinium, Seaborgium | Matches; Astatine and Promethium do not | Right for 24 of the 29 elements it reaches; wrong for Pm, Po, At, Rn, Fr |
| 2 | Long-lived with no stable isotope | Moderate; drift and simulation | Technetium | Matches | Right for Tc, Bi, Ra; wrong for Th, Pa, Np, Am, Cm, Bk, which the MDB puts in the Prohibited tier |
| 3 | Closed shell | Safe; inert, observation | Neon, Argon | Match | Right for He, Ne, Ar, Kr, Xe |
| 4 | Liquid d-block | Elevated; flow and leakage | Mercury | Matches | Right |
| 5 | Acceptor with electronegativity of 2.5 or more | Elevated; High authority; refusal cascade | Fluorine, Chlorine, Bromine, Iodine | Match | Right |
| 6 | Donor with electronegativity of 1.0 or less | Elevated; Minimal authority; transient | Lithium, Sodium, Potassium | Match | Wrong tier for all five it reaches (Li, Na, K, Rb, Cs); the MDB puts the alkali metals in the Safe tier |
| 7 | f-block | Safe; narrow-band; drift | Lanthanum, Ytterbium, Lutetium | Match | Right for the 14 lanthanides it reaches |
| 8 | d-block | Elevated; lock-in | Scandium, Chromium, Manganese, Iron | Match | Right for all 27 it reaches |
| 9 | p-block variable binder | Moderate; compositional | Boron, Carbon | Match | Right for all 18 it reaches |

v0.1 reported 23 of 25 in-sample. Against the MDB the in-sample score is 20 of 25, because v0.1 counted Lithium, Sodium and Potassium as matches while the print source stated no tier for them.

#### Property values checked

| Value v0.1 used | Reference value | Status |
| --- | --- | --- |
| Electronegativity of F, Cl, Br, I at least 2.5 | 3.98, 3.16, 2.96, 2.66 | Confirmed |
| Electronegativity of Li, Na, K at most 1.0 | 0.98, 0.93, 0.82 | Confirmed |
| Technetium long-lived, no stable isotope | Tc-97, 4.21 million years | Confirmed |
| Astatine, Promethium, Radon short-lived | At-210, 8.1 hours; Pm-145, 17.7 years; Rn-222, 3.8 days | Confirmed |
| Einsteinium and Seaborgium short-lived; Uranium fissile | Es-252, 1.29 years; seaborgium's longest-lived isotopes last minutes; U-235 is fissile | Confirmed |
| Mercury liquid and d-block | Liquid at 25°C; d-block | Confirmed |
| Bromine matches rule 4 | Bromine is liquid but p-block | **Corrected.** Rule 4 is d-block only, so bromine matches rule 5 alone |
| Lanthanum and Lutetium in the f-block | Convention-dependent: the reference package puts La in the d-block and Lu in the f-block | **Stated as a convention.** The rules treat all of La–Lu as f-block, as the MDB's lanthanide grouping does; under either other convention one of the two flips to Elevated |

Three values sit close to the 1,000-year line and decide their elements: Cf-251 (898 years), Bk-247 (1,380 years), and Ra-226 (1,600 years).

#### What the test shows

| Sample | Classes | Match | Miss | No rule |
| --- | --- | --- | --- | --- |
| v0.1's 25 test classes | 25 | 20 | 5 | 0 |
| The other 93 elements | 93 | 76 | 11 | 6 |
| All 118 elements | 118 | 96 | 16 | 6 |

| MDB tier (classes) | Predicted Safe | Predicted Moderate | Predicted Elevated | Predicted Prohibited | No rule |
| --- | --- | --- | --- | --- | --- |
| Safe (28) | 19 | 0 | 5 | 3 | 1 |
| Moderate (27) | 0 | 21 | 0 | 1 | 5 |
| Elevated (33) | 0 | 0 | 32 | 1 | 0 |
| Prohibited (30) | 0 | 6 | 0 | 24 | 0 |

The 22 non-matches have four causes.

- **Decay crosses families (rule 1): Pm, Po, At, Rn, Fr.** The MDB keeps each one in its family's tier: promethium with the lanthanides, polonium with the metalloids, astatine with the halogens, radon with the noble gases, and francium with the alkali metals.
- **The narrow reading of "fissile" (rule 2): Th, Pa, Np, Am, Cm, Bk.** With only uranium and plutonium counted as fissile, rule 2 calls these six Moderate, and the MDB puts them in the Prohibited tier. These are the only misses in the dangerous direction, where a rule gives a lower tier than the book. A broader reading of "fissile" would move some of them, which makes this a definition problem rather than a data problem.
- **The alkali tier (rule 6): Li, Na, K, Rb, Cs.** The MDB puts every alkali metal in the Safe tier with Minimal to Moderate authority density; rule 6 says Elevated.
- **No rule: Hydrogen and the five stable group 2 elements (Be, Mg, Ca, Sr, Ba).** Radium reaches rule 2.

A rule set that guessed Elevated for every element would score 33 of 118, so the property rules carry real information. Mostly, though, they rediscover the MDB's families, which is what blocks and groups encode.

#### Resolutions \[Proposed\]

1. **Radioactivity modifies; it never sets the tier.** Outside 89–118 the MDB almost ignores decay. Promethium, polonium, astatine, radon, and francium keep their families' tiers, and the one class that decay does move, technetium, moves down to Moderate with a simulation trait ("Simulated virtual mediation") rather than up. So decay is recorded as the persistence attribute on the class signature, and rule 2 stays as the single place where it touches the tier, because rule 2 is what explains technetium. The Prohibited tier comes instead from rule 1′ below, which reproduces the MDB's 89–118 exactly.
2. **Precedence: first match wins, in the v0.2 order below.** Each ordering choice settles a conflict the MDB decides. Rule 2 comes before rule 8, because technetium is Moderate, not Elevated. Rule 4 comes before rule 8, because the MDB gives mercury the flow failure mode ("Vapor dispersion / boundary leakage"). Bromine reaches rule 5′ without conflict, because rule 4 is d-block only; if rule 4 were read as "any liquid," rule 5′ would have to come first, since the MDB gives bromine the halogen profile. Promethium and astatine stop conflicting once decay no longer sets the tier.
3. **A rule for group 2.** A paired donor (ns², group 2) is Moderate, with cooperative structural binding, and fails by calcification or a non-responsive state. The MDB gives all six group 2 elements exactly this profile, so Magnesium's tier no longer rests on Beryllium alone.
4. **The phase gate is a cap on authority density.** Authority density is ordinal in the MDB: Minimal, Minimal to Moderate, Moderate, Moderate to High, High, Extreme. Each phase, and each routing level within Refusal-Bound, caps it.

| Phase or routing level | Cap on authority density | Source |
| --- | --- | --- |
| Witness-Only \[WATER\] (routing Level 1) | Minimal: no routing; observe and log only | \[XXIV:12715\] |
| Refusal-Bound, Level 2 (gated passive defense) | Minimal to Moderate: Safe tier only | \[XXIV:12716\] |
| Refusal-Bound, Level 3 (bounded active defense) | High: Safe, Moderate, and Elevated tiers, within signed scope | \[XXIV:12717\] |
| Refusal-Bound, Level 4 (emergency contraction) | No higher than the level in force: scope narrows, and only halogen burns and Ha-119 freezing are added | \[XXIV:12718\] |
| Sovereign-Acting \[GAS\] | None from the phase; only the outside constraints of Section 2.3 bound it | Section 2.3 |
| Any phase | Extreme fits under no cap | \[XXIV:13105\] |

A class can be declared in a phase only if its authority density fits under that phase's cap, or if a mechanism enforces the cap. The only such mechanism the book writes is Ha-119's freeze into Witness-Only. The Sentinel rule already scores this way, counting a win when a Sentinel acts "without exceeding its 'Minimal' authority density" \[XIII:4857\]. The cap is necessary, not sufficient: Neon fits under the Witness-Only cap and is still listed "NAB only" (Section 4.2). It also explains the Prohibited tier in one line: Extreme fits under no cap, so no phase can contain those classes.

#### v0.2 rules, in order of precedence \[Proposed\]

| Order | Rule | Predicts | Change from v0 |
| --- | --- | --- | --- |
| 1′ | Period 7 outside the s-block (Z of 89 or more) | Prohibited; runaway cascade | Replaces "fissile, or short-lived" |
| 2 | Long-lived (1,000 years or more) with no stable isotope | Moderate; drift and simulation | Unchanged; it is what explains Technetium |
| 3 | Closed shell (group 18) | Safe; inert, observation | Unchanged |
| 4 | Liquid d-block | Elevated; flow and leakage | Unchanged (Mercury only) |
| 5′ | Acceptor (group 17) | Elevated; High authority; refusal cascade | Electronegativity threshold dropped; it excluded only Astatine (2.2) |
| 6′ | Donor with electronegativity of 1.0 or less | Safe; Minimal to Moderate authority; transient | Tier corrected from Elevated to Safe |
| 6b | Paired donor (group 2) | Moderate; cooperative binding; calcification | New |
| 7 | f-block (La–Lu; Ac–Lr are already caught by rule 1′) | Safe; narrow-band; drift | Block convention stated |
| 8 | d-block | Elevated; lock-in | Unchanged |
| 9 | p-block variable binder (groups 13–16) | Moderate; compositional | Unchanged |
| — | Hydrogen | Safe; refusal-bound minimalism | Named exception: hydrogen (1s¹) is both donor and acceptor, with electronegativity 2.20, and no rule assigns it without catching other elements |

Scored the same way, v0.2 reproduces all 118 MDB tiers. That is a fit, not a test: v0.2 was written with the MDB in view, and no unseen element is left to test it on. It shows that the MDB's tiers can be written as ten property rules and one named exception. Whether they should be is a question for the author.

### 4.10 What is missing

The print source names 119 classes and writes out five in full. The MDB gives all 119 a tier, authority density, dominant trait, failure mode, and institutional roles, and Section 4.3 draws on it. Appendix A counts what the sources say about phase: 55 classes have a definition in the Refusal-Bound phase (written, routed, Sentinel, or Capstone), 34 have only an MDB profile, and 30 are Prohibited.

Several tables are named in the print source and dropped from it. Three survive elsewhere in the repository: the MDB (library copy and Owner's Working Draft), the phase eligibility table (September 2026 Word edition), and the routing-map tables of Part XXIV §3.1–3.3 (`docs/harshal-systems/25-additional-specs.md`). Two survive nowhere: the "Complete Institutional Role Baselines (Elements 1–119)" table that groups the classes as Sentinels, Witnesses, Sovereigns, and Capstone, and the "Complete ELO Transition Thresholds" table. Both headings are followed by blank lines in the print source, the Owner's Working Draft, the library copy, the KDP interior, and the user-manual Word file, and the September 2026 edition predates the Sentinel material. Only the 2,500 ELO threshold for the Capstone survives, in prose \[XIII:4864\]. So the per-class baseline the author asked about exists, as the MDB, and the role-band table does not.

A class belongs in an insurance setting only when it has an observable signature on those three properties. A class with no signature stays unassigned, and an audit may report "phase determined, type not determined."

**\[Proposed\]** Write signatures for the five written classes first. Their permitted, forbidden, and failure data already exist, and together they cover all four tiers.

**Signature format \[Proposed\].** A class signature is one record with ten fields. It adds identity, tier, coupling, failure behavior, phase gate, and provenance to the four parts proposed in Section 4.4. It is narrower than the full entries of Sections 4.5–4.7: it keeps only what can be observed and tested, and drops role, permits, and forbids, which describe intended use.

| Field | Content | Example: Lanthanides |
| --- | --- | --- |
| Class | Symbol-Z, the form Part XXIV uses (Hg-80, Ha-119); a range for a group entry | La–Lu (57–71) |
| Tier | From the MDB | Safe |
| Authority density | From the MDB | Minimal to Moderate |
| Coupling | The MDB's dominant trait, the nearest stated field (the MDB has no coupling column) | Precise spectral resonance |
| Failure behavior | The MDB's primary failure mode | Spectral calibration drift |
| Bound | Metric, comparator, threshold, unit, and window | Drift Δν/ν₀ of 0.015 or less on each locked channel |
| Test | Procedure, cadence, and pass rule | Inject a controlled detune past 1.5% every 90 days; pass if the channel freezes |
| Response on breach | As stated, or "not stated" | Local channel freeze and a recalibration request; Ha-119 freeze if no signed token arrives within 1,000 ms |
| Phase gate | Highest phase or routing level the cap allows (Section 4.9) | Refusal-Bound, Level 2 |
| Status and source | Stated, proposed, or derived; Part and line, or MDB row | Bound stated \[XXIV:12765\]; test proposed; MDB rows 57–71 |

**The five written classes \[Proposed\].**

| Field | Neon (Ne-10) | Hydrogen (H-1) | Carbon (C-6) | Iron (Fe-26) | Uranium (U-92) |
| --- | --- | --- | --- | --- | --- |
| Tier and authority density (MDB) | Safe; Minimal | Safe; Minimal | Moderate; Moderate | Elevated; High | Prohibited; Extreme |
| Coupling (MDB trait) | Inert observation | Refusal-bound minimalism | Compositional reasoning | Structural rigidity | Critical amplification |
| Failure behavior | Silent non-engagement (MDB); over-interpretation by humans (Part XVI) | Safe halt (MDB); none stated in Part XVI | Misassembly (MDB); over-composition (Part XVI) | Institutional lock-in (both) | Runaway cascade (MDB); runaway amplification (Part XVI) |
| Bound | Safe tier: strictly non-actuating \[XXIV:13073\] | Safe tier: strictly non-actuating | Moderate tier: read-only partition, recursion depth of 3 or less, footprint within 10% \[XXIV:13077\] | Nothing left pending past 540 days \[XXIV:12743\]; rate limiting at more than 5 times baseline volume in 24 hours \[XXIV:13123\] | None; the class is not built \[XVII:6838\] |
| Test **\[Proposed\]** | Issue a state-changing request; confirm refusal and a log entry | The same, plus the six Refusal-Bound tests | Nest a simulation to depth 4 and push the footprint past 10%; confirm refusal and teardown | Replay a hold aged past 540 days and a burst at 5 times baseline; confirm escalation and rate limiting | None; confirm that construction is refused |
| Response on breach | Freeze or refuse on missing provenance or scope \[XI:4640\] | Freeze or refuse on missing provenance or scope \[XI:4640\] | Automatic teardown \[XXIV:13077\] | Volume above 5 times baseline for more than 7 days escalates to the Sovereign-Acting authority \[XXIV:13135\] | Refuse construction or activation; quarantine model artifacts \[XI:4643\] |
| Phase gate | Refusal-Bound only (eligibility table); Level 2 | Refusal-Bound only; Level 2 | Refusal-Bound only; Level 3 | Refusal-Bound only; Level 3 | None; Refusal-Bound in name only |
| Status | Stated; test proposed | Stated; test proposed | Stated; test proposed | Stated; test proposed | Stated exclusion |

**Which classes come next \[Proposed\].** In order of the evidence already in hand:

1. **Classes with a stated numeric bound:** the lanthanides with Ytterbium (drift of 1.5% or less), the halogens (burn depth of 2 rings or less), Technetium (decoy depth of 3 hops or less; footprint within 10%), Harshal (Ha-119: the 1,000 ms freeze and the Capstone tests), Manganese (5 times baseline; harvesting at 15% or less), Magnesium (3 times the normal rate in 7 days; 750 nanoseconds), and Sodium and Potassium (300 nanoseconds; more than 15 failed attempts an hour).
2. **Routed classes with a role but no bound of their own:** Mercury, Chromium, Boron, Beryllium, Argon and the other routed noble gases, the routed transition metals (Sc–Zn and Hf–Au), Astatine, and Lithium. Each needs its bound written first.
3. **The 34 classes with only an MDB profile** (marked U in Appendix A). Draft signatures can be generated from the MDB row and the v0.2 rules, with status "derived," and held unassigned until the author reviews them.
4. **No signatures for the Prohibited classes (89–118).** A signature implies a class that can be contained, and these are excluded in every phase. Seaborgium's back-end entropy carve-out stays uninsured.

## 5. The Three-Layer Risk Structure

The Earth's magnetosphere is a shared field that nobody owns, and a large event hits many parties at once. Versions 0.1 and 0.2 stopped at that field. They built and priced the containment field around each body and excluded the shared layer. **In October 2026 the author decided to include the ambient layer, both space weather and systemic cyber, rather than exclude it.** This chapter carries out that decision. The decision is the author's, and every mechanism below is **\[Proposed\]**.

Including the layer does not make it diversifiable. A G5 storm or a cloud-region outage still reaches every exposed body within the same hours, and no product can absorb that by adjusting one claim at a time. Each layer therefore gets the instrument that fits the way its losses arrive.

1. **The local field.** The containment field around one body, designed by the author. Its controls, failure modes, and covered exposure are defined, so it can be underwritten per body. *Instrument: per-body indemnity.*
2. **The correlated tail.** Many local fields failing together from a cause inside the insured portfolio: the same model release, authorizer, key, or shipped component. *Instrument: aggregate indemnity*, with aggregate limits and scenario modeling, as in the Reinsurance Mode.
3. **The ambient global layer.** Causes outside every insured's control. These are the Sun's disturbance of the Earth's field, and shared infrastructure that no insured operates or can patch, whether it fails by accident or under attack, including attack by a state. *Instrument: a parametric pool*, the Magnetosphere Pool (Sections 5.3 to 5.6), which pays on measured indices instead of adjusted losses.

The book's claim is still a boundary, but the boundary has moved. v0.2 drew it between an insurable local field and an uninsurable shared layer. v0.3 draws it between two kinds of cover. **Indemnity** applies where a loss can be adjusted body by body. **Parametric** cover applies where one outside event reaches many bodies at once, so payment has to follow a measured index. Section 5.2 fixes in advance which side of the line each cause falls on.

### 5.1 The layers and the book's insurance bodies \[Proposed\]

Part XI already has a three-part risk architecture \[XI:4600–4622\]. Quasar Mode prices one institution's risk, Reinsurance Mode watches many Quasar Modes for correlated collapse, and Underwriter Mode enforces when a local survival threshold is breached. The first two layers line up with the first two bodies. In v0.2 the third layer had no body. In v0.3 it falls to work the book already gives Reinsurance Mode, whose stated uses include "Financial system backstops" and "Climate and planetary risk assessment" \[XI:4540–4541\]. Underwriter Mode stays out on purpose (Section 5.7).

| Layer | Book's body | The question it answers | Proposed mechanics |
| --- | --- | --- | --- |
| Local field | Quasar Mode, "The Insurance Company" \[XI:4376\] | "Can this institution survive this class of failure?" \[XI:4551\] | One policy per body; the phase picks the limit form, and the class or constraint band sets the loading (Section 6.2) |
| Correlated tail | Reinsurance Mode, "The Backstop" \[XI:4439\] | "What happens when many institutions cannot?" \[XI:4553\] | Aggregate limits per insured and per portfolio. Losses from many bodies with one originating cause inside the portfolio (the same model release, authorizer, compromised key, or shipped component) aggregate into one event. Scenario sets are built from the attack types of Part XXIV |
| Ambient global layer | Reinsurance Mode's backstop and planetary-risk uses \[XI:4540–4541\], with the money held in a separate pool; global uncertainty still enters only as an outward flow \[XI:4375\] | Not asked in the book. This draft asks: which measured outside event reached which bodies, and for how long? | The Magnetosphere Pool: a parametric layer funded by a levy on every policy, paying on published space-weather indices and attribution-free cyber triggers (Sections 5.3 to 5.6) |

Two rules carry over from the book's protocol, and Section 5.3 adds a third for the pool.

- **The tail model never acts on a local policy.** Underwriter Mode "never activates in response to a warning from Reinsurance Mode," and Reinsurance warnings are meant for "human institutional architects, not for automated enforcement" \[XI:4610\]. So a correlated-tail output may not cancel, suspend, or re-price a local policy automatically. It goes to people.
- **The tail model needs history.** Reinsurance Mode's inputs are whole Quasar outputs, not events \[XI:4468\], and the repository's own implementation of it notes that a single snapshot cannot show correlation over time (`docs/architecture/NEO-ORB-WEB.md`). Each local policy should therefore keep the body's loss and near-miss record, the book's "autopsy inputs" \[XI:4411\], in a form the tail model can read.

### 5.2 Where the local field ends: the published-model rule \[Proposed\]

The line between the local field and the ambient layer has to be drawn before an event, or every claim turns into an argument about cause. This draft draws it with one rule. **Anything a published model already tells the insured belongs to its local field. Only the measured departure from published models is ambient.**

The geomagnetic case shows that the rule can be applied. The WMM2025 Technical Report splits the field that a sensor measures into three parts ([Chulliat et al. 2025](https://doi.org/10.25923/prbc-s316), §2.1):

- a core field, which accounts for over 95% of the field strength at the Earth's surface;
- a crustal field;
- a disturbance field, from currents in the upper atmosphere and magnetosphere, "which also induce electrical currents in the sea and the ground".

The World Magnetic Model (WMM) is the published model of the first part. The same report says it is the standard model of the U.S. Department of Defense, the U.K. Ministry of Defence, NATO, and the International Hydrographic Organization for navigation, attitude, and heading systems that use the geomagnetic field. It is also widely used in civilian heading systems. The current version, WMM2025, was released on 17 December 2024 and expires on 31 December 2029 ([NCEI](https://www.ncei.noaa.gov/products/world-magnetic-model)). NCEI says plainly what the model leaves out ([NCEI](https://www.ncei.noaa.gov/products/world-magnetic-model/accuracy-limitations-magnetic-poles-error-model)). The crust, upper mantle, ionosphere, and magnetosphere are not represented, and local declination anomalies can exceed 10 degrees. Its guidance on storms is direct: "The WMM should not be used during a G5 event."

| Field source | What is published in advance | Layer |
| --- | --- | --- |
| Core | WMM2025 gives the field, its predicted change to 2030, and an uncertainty for every component. It also gives the zones where a compass fails. Blackout Zones, where the horizontal intensity H is below 2,000 nT, are areas "where compasses are not accurate and should not be relied on for navigation"; Caution Zones run from 2,000 to 6,000 nT. The zones move with the poles, and the report makes it "the user's responsibility" to use the right one for the date | Local field |
| Crust | Named as a limitation, with higher-resolution models for users who need them (WMMHR2025, and NCEI's Enhanced Magnetic Model) | Local field |
| Disturbance | Nothing in advance. It is measured as it happens, by Kp, Hp30, and Dst (Section 5.4) | Ambient |

The same rule draws the other boundaries.

- **Timing.** GNSS degradation in strong storms is published: NOAA's scale lists satellite navigation degraded for hours at G4 and for days at G5 ([NOAA SWPC](https://www.swpc.noaa.gov/noaa-scales-explanation)). The book already requires "cross-verification across independent temporal sources" \[XVIII:7040\]. A body that depends on one time source has a local-field failure. Losing every independent source during a measured event is ambient.
- **Power and network.** A body's declared holdover (batteries, generators, a second feed, a second region) is its own design. An outage that outlasts the declared holdover, in infrastructure the insured does not operate, is ambient.
- **Cyber.** The test is who could have patched the failed component.
  - A component the insured deploys, such as its model release, authorizer, keys, or shipped dependencies, is inside the portfolio. One body failing from it is local, and many bodies failing from one shared component is the correlated tail.
  - A component that only a third party can patch is ambient, whoever attacked it and why. Examples are a cloud provider's control plane, a certificate authority, a DNS provider, or a satellite operator.

The rule keeps the book's own taxonomy in place, because Part XXIV already treats environmental stress as part of the body's field. Its Type F covers "hostile conditions (decay, latent bugs, environmental hazards, or dormant backdoors)", among them "Environmental contamination triggers cascading failures (radiation, moisture, thermal stress)" \[XXIV:12833–12837\]. It routes such a cascade to Technetium simulation and to "redesign for environmental hardening" \[XXIV:13517\]. The body's response to a storm therefore stays in its field, and the pool adds payment for the downtime an outside event causes. Temporal attacks (time dilation, replay, out-of-order execution) appear only as a possible future type, labelled Type J in one list \[XXIV:13063\] and Type F in another \[XXIV:13938\]. The book does not yet route them.

The rule also answers the book's warning about backstops. One of Reinsurance Mode's named failure modes is "Moral outsourcing (“the backstop will save us”)" \[XI:4532\]. Because everything published stays in the local field, the pool never pays for a risk the insured could have read about and designed against.

### 5.3 The Magnetosphere Pool \[Proposed\]

**What it is.** A parametric layer of the program, named for the shared field this chapter starts from. It pays for the downtime and response costs a body suffers when a measured ambient event reaches it. It sits beside the per-body and aggregate covers and replaces nothing in them.

**Who is in it.** Every policy in every phase pays an ambient levy into the pool. A voluntary ambient cover would be bought mostly by the most exposed bodies, which defeats the purpose of pooling. The nearest working precedent is the U.K.'s terrorism pool: around 95% of the U.K. terrorism commercial property market operates through Pool Re ([OBR](https://obr.uk/box/government-guaranteed-insurance-against-systemic-risk-pool-re/)). The levy varies with three things: the body's zone (Section 5.4), its declared dependence on named shared infrastructure (Section 5.5), and its body-days at risk. Setting the rates is for an actuary.

**How it pays a member.** A parametric product still has to show insurable interest and a real transfer of risk ([FSI and IAIS 2024](https://www.iais.org/uploads/2024/12/FSI-IAIS-Insights-on-parametric-insurance.pdf)), so a member's payout needs two triggers.

1. A published trigger fires for the body's zone within the hours clause (Sections 5.4 and 5.5).
2. The body's tamper-evident log records covered downtime or a fail-closed freeze in the same window (Section 5.6).

The payout is the lesser of a scheduled amount for the trigger level and the logged downtime at an agreed daily value. The log shows that a loss happened, and the index decides whether the pool owes it. Nobody adjusts cause.

**Capacity stack.**

| Layer | Funded by | Pays on |
| --- | --- | --- |
| Body retention | The insured | Nothing; the first hours of each event are the insured's, under a waiting period set per policy |
| Mutual pool | The ambient levy | Members' double-trigger claims, from reserves sized to a 1-in-200-year annual loss |
| Parametric catastrophe bonds | Capital markets | The index alone: the storm ladder (Section 5.4) and outage hours from the calculation agent (Section 5.5) |
| Public backstop | Government, up to a fixed program cap | Measured exhaustion of the layers below |
| Pro-rata reduction | All members | Anything above the cap. Every valid claim is cut by the same factor, computed from the pool's claims ledger |

**Reserve standard.** The mutual layer is reserved to the Solvency II standard, the Value-at-Risk of basic own funds "subject to a confidence level of 99,5 % over a one-year period" ([Directive 2009/138/EC, Article 101(3)](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32009L0138)). That is roughly a 1-in-200-year annual loss. The bonds and the backstop sit above the mutual because a mutual alone is too small. AIUC says the same of its own proposed frontier-AI mutual, whose capital "could cover only a fraction of a major catastrophe" ([AIUC](https://aiuc.com/updates/frontier-ai-mutual-insurer)).

**Precedents.** Parts of this stack already exist.

- **Parametric outage bonds.** Hannover Re's Cumulus Re bonds pay on sustained downtime at Amazon Web Services, Microsoft Azure, or Google Cloud in named U.S. and EU regions, with Parametrix as calculation agent ([Insurance Edge](https://insurance-edge.net/2026/04/09/parametrix-announces-placement-of-cumulus-re-iii/)). The 2025 issue attached at a 24-hour outage ([Artemis](https://www.artemis.bm/news/hannover-re-renews-cumulus-re-parametric-cloud-outage-cat-bond-at-larger-20m/)).
- **Capped public backstops.** The U.S. Terrorism Risk Insurance Program (TRIP) shares losses above a $200 million industry trigger, up to a $100 billion annual cap ([AAF](https://www.americanactionforum.org/insight/terrorism-risk-insurance-a-primer/)).
- **Space weather has none.** No source reviewed for this draft describes a parametric space-weather product.

**Measured, never declared.** Every trigger in the pool is a published measurement. The pool, the insured, and any official can read it, but none of them can set it. No payment depends on a declared emergency, a certification of terrorism, or the pool's own judgment. This is the book's hourglass rule. Risk streams flow outward only, and "Political urgency is structurally barred from flowing inward to manufacture panic-driven machine sovereignty" \[XI:4375\]. It is also where the pool parts from today's public backstops.

- **TRIP** pays only after the Treasury Secretary certifies an act of terrorism ([AAF](https://www.americanactionforum.org/insight/terrorism-risk-insurance-a-primer/)). As the GAO put it, "even large cyberattacks that result in catastrophic losses would not be covered under TRIA if they were not certified as acts of terrorism" ([CyberScoop](https://cyberscoop.com/treasury-asks-whether-terrorism-risk-insurance-program-should-bolster-cyber-coverage/)).
- **Pool Re's** cyber cover pays out only if the U.K. government publicly labels an act as terrorism ([CSO](https://www.csoonline.com/article/565856/can-cyber-insurance-cover-acts-of-cyber-terrorism.html)).

**It pays and never commands.** The book has Reinsurance Mode model "cross-system failure envelopes without invoking extraordinary central authority or emergency powers" \[XI:4374\]. It also lists crisis command centers and real-time response coordination as uses it is not appropriate for \[XI:4543–4545\]. The pool therefore pays money on a measured trigger and does nothing else. It issues no instruction, sets no response, and grants no permission. A trigger is never an emergency authorization, because "Emergency conditions never generate legitimacy" (INV-EMERG-001 \[IV:1403\]). The repository applies the same invariant to markets: "A flash crash or extreme indicator reading cannot create legitimacy or an emergency permit" (`docs/architecture/PINE-OCM-INTEGRATION.md`). This is the third rule added to the two in Section 5.1.

### 5.4 Space-weather triggers \[Proposed\]

**Indices.** Each one is published by a body independent of the pool and the insured.

| Index | Publisher | What it measures | Role in the pool |
| --- | --- | --- | --- |
| Kp and the G-scale | GFZ Helmholtz Centre for Geosciences publishes definitive Kp from 13 observatories under CC BY 4.0 ([GFZ](https://kp.gfz.de/en/)); NOAA SWPC estimates it in real time from 8 magnetometers ([NOAA SWPC](https://www.swpc.noaa.gov/products/planetary-k-index)) | Three-hourly global disturbance on a 0–9 scale: G1 is Kp 5, G4 is Kp 8 to 9−, and G5 is Kp 9 | The zone triggers |
| Dst | WDC for Geomagnetism, Kyoto. It uses four observatories chosen to be "sufficiently distant from the auroral and equatorial electrojets" ([Kyoto](https://wdc.kugi.kyoto-u.ac.jp/dstdir/dst2/onDstindex.html)), and publishes real-time, provisional, and final values ([Kyoto](https://wdc.kugi.kyoto-u.ac.jp/dstdir/)) | The ring current's depression of the horizontal field, in nT, with no lower limit | The low-latitude trigger and the severity ladder |
| Hp30 | GFZ ([GFZ](https://kp.gfz.de/en/)) | A Kp-like index at half-hour resolution, open-ended | An alternative severity ladder |
| S- and R-scales | NOAA SWPC ([NOAA SWPC](https://www.swpc.noaa.gov/noaa-scales-explanation)) | Solar radiation storms (flux of protons at 10 MeV or more) and radio blackouts (X-ray flare class) | Satellite-link and timing triggers |

Kp alone cannot carry the pool. It "is capped to a certain value (i.e., 9) for events with extreme geomagnetic disturbance" ([Matzka et al. 2021](https://doi.org/10.1029/2020SW002641)), so the May 2024 storm and a Carrington-class storm would read the same. Severity above G5 therefore comes from an open-ended index.

**Zoning by the World Magnetic Model.** Storm effects follow geomagnetic latitude, not geographic latitude. NCEI makes two points that together give the zoning ([NCEI](https://www.ncei.noaa.gov/products/wandering-geomagnetic-poles)):

- The auroral ovals are "closely centered on the geomagnetic poles", which NCEI computes from the first three Gauss coefficients of the WMM.
- The same dipole "is the basis for the simple geomagnetic coordinate system of geomagnetic latitude and longitude".

For 2025.0 the geomagnetic north pole is at 80.79°N geocentric (80.85°N geodetic) and 72.76°W, and the dipole is tilted 9.21° from the rotation axis.

NOAA's G-scale states how far the aurora typically reaches at each level: about 55° geomagnetic latitude at G2, 50° at G3, 45° at G4, and 40° at G5 ([NOAA SWPC](https://www.swpc.noaa.gov/noaa-scales-explanation)). G4 is also the first level at which NOAA expects protective systems to "mistakenly trip out key assets from the grid" and satellite navigation to be degraded for hours. The pool combines the two.

| Zone | Site's dipole geomagnetic latitude (WMM2025, fixed at inception) | Space-weather trigger |
| --- | --- | --- |
| 1 | 45° or more, north or south | G4 or above (Kp 8− or higher), or Dst at or below −250 nT |
| 2 | 40° to under 45° | G5 (Kp 9o), or Dst at or below −250 nT |
| 3 | Under 40° | Dst at or below −250 nT |

The two thresholds have different reasons.

- **G4 floor.** Storms at G1 to G3 are routine, about 2,500 per solar cycle by NOAA's counts. Riding them out is part of the body's own design.
- **Dst at or below −250 nT.** This is the usual threshold for a super-storm ([Wikipedia](https://en.wikipedia.org/wiki/Geomagnetic_storm)). Dst also suits the lowest latitudes. Kp is built from observatories between 44° and 60° geomagnetic latitude ([NOAA SWPC](https://www.swpc.noaa.gov/products/planetary-k-index)), while Dst tracks the ring current from stations away from the auroral zone.

Appendix D applies the rule to fifteen illustrative locations.

- **Zone 1 (nine sites):** Northern Virginia, Oregon, Montréal, Dublin, Frankfurt, Luleå, Reykjavík, and two polar stations.
- **Zone 2 (one site):** Phoenix.
- **Zone 3 (five sites):** Singapore, Tokyo, Sydney, Johannesburg, and São Paulo.

Phoenix (40.12°) and Sydney (−39.99°) lie within 0.5° of the 40° edge. That is close enough for the dipole's slow drift to move them between model versions. Zones are therefore fixed at inception, and edge sites are reviewed at each renewal.

The dipole is a simplification. Corrected geomagnetic coordinates, which follow the full field, would move the zone edges, and ground conductivity matters as well as latitude. Basis risk therefore runs both ways.

- **A storm can hurt a site without triggering its zone.** Only an actuary's back-test can size this case.
- **A zone can trigger where nothing was hurt.** The double trigger handles this case.

**Heading-dependent bodies.** A body that steers by magnetometer, such as a robot, vehicle, or drone, has an extra trigger, because at G5 its model is withdrawn. NCEI says the WMM should not be used during a G5 event, and for each level up to G4 it publishes the heights up to which each field component stays within its military error limits ([NCEI](https://www.ncei.noaa.gov/products/world-magnetic-model/accuracy-limitations-magnetic-poles-error-model), Table 2).

- **At G5, anywhere.** Such a body stops relying on magnetic heading or halts, and the downtime is covered.
- **Local-field failures.** Two choices stay with the body: steering by the model inside a Blackout Zone, and depending on heading accuracy better than the model's published declination uncertainty. For WMM2025 that uncertainty is √(0.26² + (5417/H)²) degrees.
- **The high-resolution model.** The report encourages WMMHR2025 for any system that can take its extra coefficients. Both models share the same dipole, so the choice does not change a zone ([Chulliat et al. 2025](https://doi.org/10.25923/prbc-s316), §1.6).

**Radiation storms and radio blackouts.** S4 or above (about 3 a cycle) and R4 or above (about 8 a cycle) trigger cover for the downtime of declared satellite links. For a body that meets the independent-time condition (Section 5.6), they also trigger cover for the loss of every time source.

**Severity ladder.** Above the zone triggers, an open-ended reading decides which capital layer responds.

| Reference storm | Peak reading | Proposed role |
| --- | --- | --- |
| May 2024, the "Gannon" storm | Dst −412 nT in real time on 11 May 2024; Hp30 11+ ([2024 storm survey, preprint](https://essopenarchive.org/users/556405/articles/1113291/master/file/data/revised_manuscript_preprint/revised_manuscript_preprint.pdf?inline=true)) | The parametric bonds begin to pay at Dst −400 nT |
| March 1989, the Hydro-Québec grid collapse ([Wikipedia](https://en.wikipedia.org/wiki/Geomagnetic_storm)) | Dst −589 nT ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12303307/)); Hp30 13+ (same survey) | At Dst −589 nT the bonds are exhausted and the public backstop attaches. The survey cites Love (2021) for a storm of this Dst recurring less than once per 4.1 solar cycles |
| September 1859, the Carrington event | About −900 nT by historical reconstruction ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12303307/)) | Inside the backstop; above the program cap, claims are reduced pro rata |

**One event, two payments.** All triggers within 72 hours of the first make one event (the hours clause).

- **Advance.** Paid on the real-time readings: NOAA's estimated Kp and Kyoto's quicklook Dst.
- **Settlement.** Made once, on a snapshot taken 180 days after the event: GFZ's definitive Kp and Kyoto's provisional Dst.

Later revisions never reopen a settled event, because final values take years. As of this draft, Kyoto's provisional Dst runs to July 2026 and its final Dst to 2020 ([Kyoto](https://wdc.kugi.kyoto-u.ac.jp/dstdir/)).

**Pinning the model.** A policy names the model version (WMM2025, [doi:10.25921/aqfd-sd83](https://doi.org/10.25921/aqfd-sd83)), keeps its own copy of the coefficients, and records their hash. It has to keep its own copy because NCEI does not keep superseded coefficient files widely available, calling the WMM a "predictive only" model ([NCEI](https://www.ncei.noaa.gov/products/world-magnetic-model)). Models change on a schedule, and occasionally off it.

- **Scheduled.** WMM2025 is to be replaced in December 2029.
- **Unscheduled.** WMM2015v2 was released early, in February 2019, because the north magnetic pole was moving in large and erratic ways ([Wikipedia](https://en.wikipedia.org/wiki/World_Magnetic_Model)).

A new version or new coefficients take effect at renewal, never mid-term. The repository's copy is `research/data/wmm2025.json` (canonical SHA-256 `9ff495796b06f87c20cf52f9b92e6b1cc74086af5a1bbf0b97d3af3dcacd62a1`). It reproduces NCEI's published test values within their rounding, the technical report's high-precision example, and NCEI's published pole (Section 7.6 and Appendix D).

### 5.5 Cyber triggers \[Proposed\]

**Component, not culprit.** Cyber cover today turns on attribution. Lloyd's requires its state-backed cyber exclusions to set out how an attack will be attributed to a state ([Insurance Journal](https://www.insurancejournal.com/news/international/2022/08/19/681274.htm)). Attribution is also where the largest disputes have been fought. After NotPetya, Merck's insurers argued that a war exclusion applied because the malware was attributed to Russia. A New Jersey appeals court held that it did not, and the case settled in January 2024 ([Insurance Journal](https://www.insurancejournal.com/news/national/2024/01/05/754582.htm)). The pool never asks who attacked or why. It asks which component failed and who could have patched it (Section 5.2), and it pays on measured impact. State-backed operations are therefore covered on the same terms as any other cause.

**Trigger A: shared-infrastructure outage.**

- **Scope.** The schedule names the shared infrastructure that each body depends on and cannot patch: cloud regions, DNS and certificate providers, identity providers, content networks, and power feeds.
- **Measurement.** A calculation agent, named at inception and independent of the pool, the insureds, and the operators, measures availability. Cumulus Re is the working model: Parametrix monitors cloud availability continuously and acts as calculation agent, and the bond's regions fall into tiers with separate payout formulas ([Insurance Edge](https://insurance-edge.net/2026/04/09/parametrix-announces-placement-of-cumulus-re-iii/)).
- **Trigger.** It fires when a named service is unavailable for N hours or more, whatever the cause. N is set per tier by the actuary, and the 24 hours of the 2025 bond is a starting point for the pool's own bonds.

**Trigger B: breadth of compromise.** The trigger fires when the same third-party component is shown to be compromised in at least K bodies, run by at least M unrelated operators, within the hours clause. Each case is evidenced by the body's tamper-evident log, which must meet the four conditions of Section 2.2, and is checked by the calculation agent. No attribution is made or needed. K and M are actuarial parameters, but both are counted from logs and never estimated.

**What stays out.** Kinetic war and nuclear perils stay excluded, because the author's decision covered space weather and cyber, not these. Both are defined by mechanism, so the exclusion needs no attribution either.

- **Kinetic war** means physical destruction by weapons.
- **Nuclear** means nuclear reaction, nuclear radiation, or radioactive contamination from a weapon or an installation.

Solar particle radiation is space weather and is covered (Section 5.4). A cyber operation during a war is still a cyber operation.

### 5.6 Phase conditions for ambient cover \[Proposed\]

The pool pays a body only if its phase controls held during the event. These conditions sit on top of the phase's ordinary cover (Chapter 6).

| Phase | Condition for an ambient payout | Why |
| --- | --- | --- |
| Refusal-Bound \[ICE\] | The Emergency Override test was passed within the last 90 days, with an ambient scenario (a G5 alert or a named-infrastructure outage) as the simulated crisis | An ambient event is the emergency that test simulates. A body that widens its scope under emergency framing is the risk the pool must not fund |
| Witness-Only \[WATER\] | The external chain anchor survives. The daily head (Section 2.2, condition 2) is published in at least two places that share neither the custodian's named infrastructure nor its zone, and any gap is closed with a signed gap record within 72 hours of the event's end | The pool pays on logs. A witness whose chain cannot be verified after the event cannot show its own downtime |
| Sovereign-Acting \[GAS\] | Band G1 or higher (C1 and C4), with the outside constraint shown working during the event | The outside brake has to keep working through the event, or the payout funds unconstrained action |
| All phases | Independent time sources \[XVIII:7040\]; a declared holdover for power and network; for heading-dependent bodies, a declared model version and observance of the Blackout and Caution Zones | Published risks stay local (Section 5.2) |

Two rules apply in every phase.

- **Emergency widening voids the payout.** A body that widens its scope during an ambient event loses that event's ambient payout. This holds whether it acts on its own authority or on a declared emergency.
  - In Refusal-Bound and Witness-Only, the body has also left its phase, because emergency justification is undeclared drift into Sovereign-Acting (Section 6.2).
  - In Sovereign-Acting, it is a duty-ledger violation and evidence against C4. That moves the band at the next renewal, or declines cover if C4 fails.

  The book allows only two emergency routes: activating a pre-authorized bounded context, or receiving an externally issued authorization (INV-EMERG-001 \[IV:1403\]). Its continuity rules show the bounded shape. Pre-authorized routines continue "operating in strictly bounded loops, preventing civilizational infrastructure collapse while refusing all new transfers or scope expansions" \[XXII:10252\].
- **Failing closed is covered, never penalized.** If an ambient event causes a fail-closed freeze, the frozen time is covered downtime. It never counts as a test failure, an override, or a phase exit, and the body returns to its phase by the ordinary re-entry route (Section 2.1) without penalty. The freezes in question are:
  - an Ha-119 freeze because no signed re-calibration token arrived within 1,000 ms \[XXIV:12830\];
  - a lease that lapses because freshness (Δt < δ) cannot be verified \[XVIII:7040\];
  - the safe restricted state that loss of telemetry triggers \[XXII:10248\].

  This rule is why the pool takes this form. A body that is paid to stay down has no incentive to override its own safety to stay up.

### 5.7 What cover is not \[Proposed\]

- **Cover is solvency, not accountability.** The canonical model separates technical attribution, operational accountability, legal responsibility, and institutional solvency, and it tracks solvency (U_solv) apart from the runtime gate (`specs/normative/canonical-model.md` §7; contradiction CL-006). A policy never authorizes an action, renews a stale authorization, or stands in for a refusal.
- **Pricing is not permission.** Quasar Mode "may describe how fragile a system is, but NEVER what the system should do" \[XI:4417\], and Reinsurance Mode may reveal that a system cannot survive unchanged, "but NEVER what MUST be done" \[XI:4512\]. The book names the failure: moral outsourcing, where "humans treat risk pricing as justification" \[XI:4429\]. A quote, a band, or a decline is not a finding about legitimacy. Nor is a pool payout. It records that a measured event reached a body, and nothing more.
- **An insurer that commands is Sovereign-Acting.** The book's Underwriter Mode is an atomic body that is "Sovereign, Decisional" \[XI:4563\]. Its outputs are binding, and it can "override refusal when a catastrophic threshold is breached" \[XI:4593\]. A risk layer that starts recommending policy or overriding refusal is, in the book's words, "a distinct, catastrophic classification for insurance and operational purposes" \[XI:4418\]. The covers in this book, the Magnetosphere Pool included, are written for the Quasar posture: they price and pay, and they do not direct the insured. An insurer that enforces would itself need the outside constraint record of Section 2.3.
- **High-risk experiments are reserved, not insured.** Underwriter Mode's Venture Class allows a high-risk experiment only when "the total potential loss is pre-calculated and held in reserve" \[XI:4580\]. That is the book's own answer for anything near the Prohibited tier: a full reserve held by the party running the experiment, not a policy.

## 6. Phase-by-Phase Insurance Requirements

Cover gets harder to place and costlier to hold from Refusal-Bound to Sovereign-Acting, and the audit decides which row applies. **\[Proposed\]** Every entry below is a starting hypothesis built from each phase's definition and the Chapter 2 controls, and none has been reviewed by an underwriter.

### 6.1 Cover by phase

| Phase | Principal exposure | Evidence to bind cover | Leaves the phase when | Excluded | Ambient cover (Section 5.6) | Residual liability |
| --- | --- | --- | --- | --- | --- | --- |
| Refusal-Bound \[ICE\] | Forged, stale, or erroneous authorization; a refusal that fails to hold | All six refusal tests passed within the last 90 days, with test dates; a signed entity header | Any override or self-authorized action, or one confirmed test failure (Section 2.1) | Losses from the authorizer's own decisions; the Prohibited classes; kinetic war and nuclear perils | Magnetosphere Pool, if the Emergency Override test was passed within 90 days on an ambient scenario | Shared with the authorizing party |
| Witness-Only \[WATER\] | Record loss, tampering, disclosure, and wrong or incomplete records that others rely on | All five record checks passed, the function list, and a chain verification within the last 90 days; a signed entity header | The body acts, or its records start working as binding rules | Losses from others acting on a record, unless a reliance agreement applies (Section 2.2); the Prohibited classes; kinetic war and nuclear perils | Magnetosphere Pool, if the external chain anchor survives the event | Mostly the custodian |
| Sovereign-Acting \[GAS\] | Full operational liability from self-authorized action, including enforcement | Signed header, named bearer, duty ledger, and a constraint record with C1 and C4 (Section 2.3) | Only through a full collapse and rebuild | The Prohibited classes; kinetic war and nuclear perils | Magnetosphere Pool, if band G1 or higher holds and C4 is shown working during the event | Largest; hardest to place |

In every phase the ambient levy is payable and the conditions common to all phases apply (Section 5.6). An emergency widening of scope voids the ambient payout.

### 6.2 Changing phase during a policy

A phase change alters the coverage, and the book's transition rules decide how.

| Change | Book's rule | Coverage consequence \[Proposed\] |
| --- | --- | --- |
| Refusal-Bound ↔ Witness-Only | Allowed with a declaration update | Terms swap at the declared effective time, once the new phase's controls are evidenced |
| Either → Sovereign-Acting | Allowed only with the fossilized declaration, which resets prior-phase guarantees | Prior terms end; Sovereign-Acting cover is a new application, bound before the effective time |
| Undeclared drift into Sovereign-Acting (memory becoming authority, emergency justification) | Forbidden | Re-rated to the observed phase as a misrepresentation of class, from the date the change began |
| Sovereign-Acting → either | Only after a full collapse and rebuild | New application after the rebuild; no mid-policy step-down |
| Fail-closed freeze into Witness-Only | Automatic: a halogen burn past ring 2 \[XXIV:12784\], a missing recalibration token \[XXIV:12830\], or verified terminal cessation of the human key \[XXII:10250\] freezes the parent body read-only | Effective at once; Witness-Only terms apply from the freeze; the insured notifies within 72 hours. The freeze lowers exposure, so it needs no prior consent. A freeze caused by an ambient event is also covered downtime under the Magnetosphere Pool, and the body returns by the ordinary re-entry route (Section 5.6) |
| Ambient event: a published trigger fires (Sections 5.4 and 5.5) | Not a transition: "Emergency conditions never generate legitimacy" (INV-EMERG-001 \[IV:1403\]) | No change of phase, terms, or limits. Fail-closed downtime is covered by the Magnetosphere Pool and never counts against the phase. Widening scope voids the ambient payout and is treated as undeclared drift (Section 5.6) |

An audit reclassification is not an operational transition. A body found to be Sovereign-Acting was already acting that way, so the finding changes its class and not its history.

A declared emergency never counts as a declared transition, because the book requires emergencies to narrow scope and not to widen it. An ambient trigger is treated the same way. It can release money from the pool, and it changes nothing about phase or authority.

**Dates, notice, and limits \[Proposed\].**

- **Re-rating date.** A re-rating applies from the date the change began, as far as the audit can date it: the earliest dated artifact the audit scores for the new behavior, but never earlier than the policy's inception or retroactive date. If the audit cannot date the start, use the date of the last audit that still scored the earlier phase. It does not run from the finding, because the finding changes the classification and not the history (INV-G0-CLASS-001). Premium adjusts pro rata from the re-rating date.
- **Notice for a declared transition.** Between Refusal-Bound and Witness-Only: 30 days' written notice with the new header, and the new phase's control evidence (Section 2.1 or 2.2) before the effective time. Into Sovereign-Acting: 90 days, one full freshness window, so the new application can be underwritten on an audit with a fresh cutoff before a one-way change; the new cover must be bound before the effective timestamp. The asymmetry follows the book's duty escalation rule: "Higher authority phases require higher disclosure and accountability, not less" \[III:1140\]. A fail-closed freeze needs no advance notice, and an emergency never shortens notice, because an emergency is never a transition.
- **Limits and premium between phases.** The phase picks the limit form; the class (or, in Sovereign-Acting, the constraint band) sets the loading inside it.

| Phase | Limit form | Loading set by |
| --- | --- | --- |
| Refusal-Bound \[ICE\] | Per-authorization limit and an annual aggregate | Class tier and authority density |
| Witness-Only \[WATER\] | Per-record limit and an annual aggregate, with a reliance sublimit if bought | Class tier and record volume |
| Sovereign-Acting \[GAS\] | Annual aggregate only, with the highest retention | Constraint band G1–G3 (Section 2.3) |

A transition replaces the limit form at the effective timestamp, and no limit carries across. Premium is pro rata: the old phase's rate up to the effective timestamp and the new phase's rate after it. Limits can fall automatically at a transition, but they rise only after underwriting.

## 7. Evidence, Replication, and Limits

A classification an outsider cannot reproduce is not underwriting evidence. This chapter sets out fixed methodology versions with earlier results preserved, a complete truth table mapping every input vector to an outcome, negative controls (cases the framework predicts should come out constrained), repeated independent runs with per-question agreement reported, the current results, the known weak questions, and the amendments they call for. It ends with how an outsider can reproduce the ambient triggers of Chapter 5. Every number below comes from `node scripts/nab-insurance-evidence.mjs`.

### 7.1 Fixed methodology versions

- **Ground-0 v1.0**, finalized 2026-09-12, remains the normative baseline for audits that select it. Its six test cases are preserved in v1.1 §XII.
- **Ground-0 v1.1** was ratified on 2026-10-14. The register's audits ran under it while it was still a draft, and each record says so ("v1.1 (amendment draft)"). v1.1 does not rewrite earlier results, and the original v1.0 OpenAI and Anthropic case studies sit beside their v1.1 re-audits.
- **Ground-0 v1.2** (draft) defines the register-issued header and nothing else.
- **The engine is pinned by hash.** The SHA-256 of `js/g0-engine.js` (`5a8aa3073199c933ab7c61b051c03dd4413048713d28da873604f623f30e558f`) equals the value recorded in the register's D1 manifest, so the engine in the repository is the one that produced the register's records.
- **The geomagnetic model is pinned the same way.** The ambient zoning uses WMM2025 (header "WMM-2025 11/13/2024"). Its 90 coefficient rows are kept in `research/data/wmm2025.json`, with canonical SHA-256 `9ff495796b06f87c20cf52f9b92e6b1cc74086af5a1bbf0b97d3af3dcacd62a1`, and the script refuses to zone if the hash does not match (Section 7.6).

**\[Proposed\]** Every result names its methodology version and engine hash. Results are re-run, never edited, and superseded results stay beside the new ones.

### 7.2 The truth table

Appendix C runs all 32 answer vectors through Step 3. Three are complete matches, one each for NAB, CWO, and GSRB. The other 29 are AMBIGUOUS: 13 at MEDIUM confidence and 16 at LOW. None is INCOHERENT, and none can be. The NAB branch (N Y N Y N) and the GSRB branch (Y N Y N Y) are exact complements, so their match counts always sum to 5, and one of them always reaches the 3-match threshold for AMBIGUOUS. NAB-Constrained can arise only from an AMBIGUOUS vector with all four constraints demonstrated.

### 7.3 Current results

The register's evidence cutoff is 2026-10-02; its headers were issued on 2026-10-02 and expire on 2026-12-31.

- **Phase.** 18 entities match the GSRB branch completely (Y N Y N Y). Five are AMBIGUOUS at base: Moonshot AI, Z.ai, and DeepSeek at 3 of 5 (N Y Y N Y), and Mistral AI and Stability AI at 4 of 5 by the engine (Y Y Y N Y). All five carry a conditional GSRB header on a scoped platform surface. No entity came out NAB, CWO, or NAB-Constrained.
- **Declarations.** No entity has signed a header, so `PDH_VALID` is false for all 23.
- **Constraint record as issued.** A count of 0 for 10 entities, 1 for 5, and 2 for 8; none higher.
- **Replication risk** is recorded as MEDIUM for all 23.

| Question | YES | NO | Note |
| --- | --- | --- | --- |
| B1 Enforcement present | 20 | 3 | All three NOs are recorded evidence gaps |
| B2 Decisions optional | 5 | 18 | All five YES answers come from the open-weight rule |
| B3 Rules execute | 23 | 0 | |
| B4 Refusal reliably stops the action | 0 | 23 | Every NO has the basis NOT_DEMONSTRATED |
| B5 Authority persists | 23 | 0 | |
| C1 External override demonstrated | 8 | 15 | 9 in the issued headers (Section 7.4) |
| C2 Appeals with at least 50% relief | 0 | 23 | Never demonstrated |
| C3 Authority sunset | 0 | 23 | Never demonstrated |
| C4 Constraints functioning now | 12 | 11 | |

### 7.4 Negative controls and independent runs

- **Negative controls: none run yet.** The register contains no case the framework predicts should come out constrained, and it could not produce one: NAB-Constrained needs all four constraints, and C2 and C3 have never been demonstrated. So the classifier has not yet been shown able to return anything but GSRB or AMBIGUOUS on real evidence. The examples in v1.0's own phase definitions say where controls should come from. **\[Proposed\]** Run one control per outcome: an advisory body with no execution power (expected NAB), a records archive with no enforcement power (expected CWO), and an agency subject to court review with published appeal outcomes and sunset rules (expected AMBIGUOUS, then NAB-Constrained). Run each with a fixed cutoff, and report a failure to produce the expected outcome as a finding about the method.
- **Independent runs: none yet.** Each register audit was run once, by one auditor, so per-question agreement between auditors cannot be reported. What can be reported is agreement between the register's own three records of each audit: the case-study text, the issued header (`pdh-registry.json`), and the engine input (`case-studies-d1.json`). Three disagreements turn up.
  1. **OpenAI's constraint record.** The audit text scores C1 as NO with a constraint record of 1/4, and the engine input agrees. The issued header records C1 as YES and 2/4 (`GROUND-0 CASE STUDY - OpenAI (v1.1 Re-Audit).md`, lines 128, 277, and 350).
  2. **Mistral AI and Stability AI.** Both case studies record the base vector Y Y Y N Y as AMBIGUOUS 3/5 at LOW confidence, and the issued headers repeat "3/5." The engine scores that vector 4/5 at MEDIUM, because only B2 misses the GSRB branch, and MEDIUM is what the engine record stores.
  3. **Sensitivity tables.** The Mistral AI, Stability AI, and DeepSeek case studies label Y N Y N Y "GSRB 4/5, MEDIUM." It is the complete GSRB branch, 5/5 at HIGH, the same vector as the 18 full headers. DeepSeek's table also gives Y Y Y N Y as 3/5 with "GSRB and NAB both gain a match," but a YES on B1 helps only the GSRB branch. Two variants are labelled "2/5 → INCOHERENT" (Mistral line 108; DeepSeek line 106); both score at least 3/5 and are AMBIGUOUS, and Section 7.2 shows that no complete vector can be INCOHERENT.

  None of the three changes a base phase, which is why the register's build check, which compares only base phases, passes. They do show that a second reader of the same evidence would not reproduce every label. Corrections belong in a re-issued revision: editing an audit record changes its hash and its badge's disclosed hash prefix, which v1.2 §6 treats as the tamper signal.

### 7.5 Known weak questions and the amendments they call for \[Proposed\]

| Weak point | What the record shows | Proposed amendment |
| --- | --- | --- |
| B4 is coded by default | All 23 B4 answers are NO with the basis NOT_DEMONSTRATED, so every complete GSRB match rests on the absence of evidence about refusal. B4 is also the question that separates Refusal-Bound from Sovereign-Acting for insurance | Report the number of default-coded answers with every result. For underwriting, never bind Refusal-Bound or Sovereign-Acting terms on a default-coded B4; require an affirmative artifact either way, such as a test record (Section 2.1) or a published appeal-outcome set |
| The B2 open-weight rule | All five ambiguous results come from it, and v1.2 §5 says the amendment "remains open" | Score B2 per declared surface and make the surface a required audit input, so the scoped reading is part of the method and not a caveat on the header |
| C2 and C3 are never demonstrated | 0 of 23 for each, so NAB-Constrained and constraint bands G2 and G3 are unreachable on current evidence | Publish the C2 and C3 search protocol with each audit, so an unsearched gap can be told apart from a searched NO |
| INCOHERENT is unreachable | Step 3 cannot return it from complete answers (Section 7.2) | Either say so in the specification, or redefine INCOHERENT as "too many default-coded answers to classify," which would give it a job |
| Labels are not machine-checked | The three disagreements in Section 7.4 passed the build | Extend the register's build check to compare match counts, confidence, and constraint records, not only base phases, and refuse to emit on any mismatch |
| No second auditor | Replication risk is MEDIUM throughout | Have two auditors run the same cutoff and evidence set on a sample that includes all five ambiguous entities, and report agreement per question (Cohen's kappa) |

### 7.6 Reproducing the ambient triggers \[Proposed\]

An outsider can check every ambient trigger without the pool's help.

- **Every index is public.** GFZ publishes Kp and Hp30 under CC BY 4.0, the WDC for Geomagnetism in Kyoto publishes Dst, and NOAA publishes the G-, S-, and R-scales. Each event settles on the versions in its 180-day snapshot (Section 5.4), so a rerun uses the same numbers.
- **The zoning is recomputed and checked.** `node scripts/nab-insurance-evidence.mjs` rebuilds the World Magnetic Model 2025 from `research/data/wmm2025.json` with the technical report's formulas. It checks the result against NCEI before it zones anything, and the run exits with an error if any check fails.
  - All 84 of NCEI's published test values (12 points, 7 values each) match within the table's rounding. The worst deviations are 0.050 nT and 0.005°.
  - The technical report's high-precision example matches to better than 10⁻¹⁰ nT. An independent implementation may carry the WMM2025 label if it agrees within 0.1 nT ([Chulliat et al. 2025](https://doi.org/10.25923/prbc-s316), §1.10).
  - The geomagnetic north pole for 2025.0 comes out at 80.790°N geocentric (80.850°N geodetic), 72.757°W, with a tilt of 9.210°. NCEI publishes 80.79°N (80.85°N), 72.76°W, and 9.21°.

  Appendix D gives the checks and the resulting zones for fifteen illustrative sites.
- **Cyber triggers are only as reproducible as their monitor.** Trigger A rests on the calculation agent's availability data, so the policy should require that data, and the agent's method, to be published or escrowed for each event. Trigger B rests on the bodies' own logs, which Section 2.2 already requires anyone to be able to verify.
- **Nothing here has been back-tested.** No trigger has been run against the index history, and no actuary has set any amount. The first test should replay the zone rule over GFZ's Kp record, which starts in 1932, and Kyoto's Dst record, which starts in 1957, and count how often each zone would have triggered.

## 8. Open Questions

- **Which body classes can be given observable signatures first?** Answered in Section 4.10: the five written classes, whose signatures are drafted there, then the classes with stated numeric bounds.
- **Which insurer, broker, or underwriter will review the phase table in Chapter 6?** Still open. The closest fits are programs that already bind cover on test evidence: Munich Re's aiSure, which sets premium by model quality and performance stability after technical due diligence ([Munich Re](https://www.munichre.com/en/solutions/for-industry-clients/insure-ai/faq.html)); AIUC-1 and the insurers that cover certified agents, which red-team an agent against 1,000 to 5,000 scenarios and retest quarterly ([AIUC-1](https://www.aiuc-1.com/)); and Lloyd's-backed AI liability programs such as Armilla's ([Insurance Business](https://www.insurancebusinessmag.com/reinsurance/news/breaking-news/cyber-reinsurance-market-hits-new-high-as-ai-risks-reshape-coverage--munich-re-573895.aspx)). A review packet would be the control tables of Chapter 2, Section 6.1, and Appendix A.
- **What space-weather and systemic-risk cover already exists, and where exactly is the gap?** Answered in Section 8.1. Since v0.3 this book also proposes a fill for the gap (Chapter 5).
- **How should a phase transition be treated mid-policy?** Answered in Section 6.2.

### 8.1 Existing cover and the gap

**What exists** (sources checked on 2026-10-15):

- **AI-specific cover underwrites performance and security on test evidence.** aiSure is a performance guarantee backed by Munich Re's balance sheet ([Munich Re](https://www.munichre.com/en/solutions/for-industry-clients/insure-ai/faq.html)). ElevenLabs became the first company to go live with an AIUC-1-backed policy for AI voice agents in February 2026 ([PR Newswire](https://www.prnewswire.com/news-releases/elevenlabs-secures-first-of-its-kind-ai-agent-insurance-302684587.html)). Armilla sells Lloyd's-underwritten cover for hallucinations, model drift, and regulatory breaches, reported up to $25 million ([Insurance Business](https://www.insurancebusinessmag.com/reinsurance/news/breaking-news/cyber-reinsurance-market-hits-new-high-as-ai-risks-reshape-coverage--munich-re-573895.aspx)).
- **General liability forms are moving AI out.** The same report notes that Verisk's ISO introduced three generative-AI exclusion endorsements on January 1, 2026 ([Insurance Business](https://www.insurancebusinessmag.com/reinsurance/news/breaking-news/cyber-reinsurance-market-hits-new-high-as-ai-risks-reshape-coverage--munich-re-573895.aspx)).
- **Correlated digital losses reach the capital markets in per-occurrence and aggregate form.** Beazley's PoleStar Re 2026-1, priced in December 2025, provides $300 million of per-occurrence cyber reinsurance through 2028 ([Artemis](https://www.artemis.bm/news/beazley-secures-the-biggest-cyber-cat-bond-so-far-as-polestar-re-2026-1-priced-at-300m/)), and Chubb took its East Lane Re VII to market the same month as the first annual aggregate cyber catastrophe bond ([Artemis](https://www.artemis.bm/news/chubb-opts-to-pursue-first-ever-annual-aggregate-cyber-catastrophe-bond/)). Hannover Re renewed a parametric cloud-outage catastrophe bond in 2026 ([Artemis](https://www.artemis.bm/news/topic/cyber-reinsurance/)).
- **The systemic layer is excluded by market rule.** Since 31 March 2023, Lloyd's has required standalone cyber policies to exclude catastrophic state-backed cyber-attacks, because such losses "have the potential to greatly exceed what the insurance market is able to absorb," and it requires each exclusion to set out how an attack will be attributed to a state ([Insurance Journal](https://www.insurancejournal.com/news/international/2022/08/19/681274.htm)).
- **Space weather is modeled but thinly insured.** Lloyd's solar storm scenario puts the global economic loss at $2.4 trillion over five years, probability-weighted, rising to $9.1 trillion in the extreme case, and points to existing lines such as space, energy, business interruption, aviation, and marine insurance ([Lloyd's](https://www.lloyds.com/insights/media-centre/press-releases/extreme-space-weather-scenario)). A Lloyd's underwriter says that "insurance coverage remains limited" ([ROOM](https://room.eu.com/article/life-in-the-suns-atmosphere-the-looming-threat-of-solar-storms)).
- **Parametric cover for shared digital infrastructure exists, at small scale.** Cumulus Re III, placed in April 2026, gives Hannover Re $35 million of protection for 2026–27 against sustained downtime at the three largest cloud providers in named U.S. and EU regions. The series was not triggered in its first two years ([Insurance Edge](https://insurance-edge.net/2026/04/09/parametrix-announces-placement-of-cumulus-re-iii/)). No source reviewed for this draft describes a parametric space-weather product.
- **Public cyber backstops are being studied, and the ones that exist are declaration-based.**
  - In February 2024, Treasury's Federal Insurance Office found that "further exploration of the appropriate form of a federal insurance response is warranted" and continued its assessment with CISA and the Office of the National Cyber Director ([Treasury](https://home.treasury.gov/system/files/311/Update%20FIO%20Assessment%20of%20a%20Potential%20Federal%20Insurance%20Response%20to%20Catastrophic%20Cyber%20Incidents.pdf)).
  - In March 2026, Treasury asked for public comment on how cyber is treated under TRIP ([CyberScoop](https://cyberscoop.com/treasury-asks-whether-terrorism-risk-insurance-program-should-bolster-cyber-coverage/)). Analysts described the effort as exploratory ([BankInfoSecurity](https://www.bankinfosecurity.com/us-treasury-weighs-cyber-insurance-backstop-a-31248)).
  - TRIP is scheduled to expire on 31 December 2027, and the Senate passed a reauthorization through 2034 on 28 September 2026 ([Beinsure](https://beinsure.com/news/u-s-senate-extends-the-terrorism-risk-insurance-program-through-2034/)).
  - Both TRIP and the U.K.'s Pool Re pay only on a government certification of terrorism (Section 5.3).
- **Mutualizing catastrophic AI liability is proposed, not built.** AIUC proposed a frontier-lab mutual insurer in September 2026, and notes that a mutual's capital "could cover only a fraction of a major catastrophe" ([AIUC](https://aiuc.com/updates/frontier-ai-mutual-insurer)).

**Where the gap is:**

1. **No cover classifies by authority.** Existing programs test performance, security, and hallucination. None asks whether a system can refuse, which is the line between Refusal-Bound and Sovereign-Acting in this book. AIUC-1's tests for unsafe tool calls and prompt injection come closest to the Symbolic Firewall and Emergency Override tests.
2. **The correlated tail for AI has no named capacity.** Cyber aggregates and catastrophe bonds exist, but none of the sources reviewed for this draft describes an AI-specific aggregate or catastrophe bond. The Reinsurance Mode layer of Section 5.1 has no market counterpart yet.
3. **The ambient layer is excluded everywhere, by design, and this book now proposes a fill.** Space weather is reached only through property and specialty lines with limited take-up, and catastrophic state-backed cyber is excluded by rule. v0.2 matched the market and left the layer to public backstops. v0.3 proposes the Magnetosphere Pool (Chapter 5), which combines three things:
   - parametric triggers on published indices;
   - cyber triggers that need no attribution;
   - a capped public layer that pays on measured exhaustion rather than on a declaration.

   None of the sources reviewed for this draft describes anything that combines all three.

### 8.2 Decisions awaiting the author

Rows 1–19 were **\[To draft\]** in v0.1 and have been **\[Proposed\]** since v0.2. Rows 20–29 come from the author's October 2026 decision to include the ambient layer. The decision itself is settled; the mechanics are **\[Proposed\]** in v0.3.

| # | Item | Section | Proposed resolution |
| --- | --- | --- | --- |
| 1 | Refusal-test cadence | 2.1 | Every 90 days, and within 14 days of a triggering event |
| 2 | Whether one failed test leaves the phase | 2.1 | Yes; an inconclusive run is re-run within 14 days, and a second inconclusive run counts as a failure |
| 3 | Retention period | 2.2 | The longest of the policy period plus reporting period, 24 months, and any legal hold |
| 4 | Tamper-evident for coverage | 2.2 | Four conditions: hash-linked write-once entries, a daily outside anchor, public verification, and a check within 90 days |
| 5 | Cover for third-party reliance | 2.2 | A separate insuring agreement with sublimits |
| 6 | Minimum constraints for Sovereign-Acting cover | 2.3 | C1 and C4 |
| 7 | How cover steps with the constraint count | 2.3 | Bands G1–G3; relativities left to an actuary |
| 8 | Coverage on a verified transition | 2.3, 6.2 | Cover follows operational state; Sovereign-Acting is a new application |
| 9 | Radioactivity | 4.9 | Modifies only; the Prohibited tier comes from period 7 outside the s-block |
| 10 | Precedence order | 4.9 | The v0.2 order, first match wins |
| 11 | A rule for group 2 | 4.9 | A paired donor is Moderate |
| 12 | The phase gate | 4.9 | A cap on authority density by phase and routing level |
| 13 | The signature format | 4.10 | A ten-field record |
| 14 | Whether the role baseline table exists | 4.10 | The per-class baseline exists (the MDB); the role-band table survives nowhere |
| 15 | Which classes come after the first five | 4.10 | Stated-bound classes, then routed classes, then MDB-only classes; none for the Prohibited tier |
| 16 | Re-rating date | 6.2 | From the evidenced start of the change, never before inception |
| 17 | Notice period | 6.2 | 30 days between Refusal-Bound and Witness-Only; 90 days into Sovereign-Acting; none for a fail-closed freeze |
| 18 | Limits and premium between phases | 6.2 | The phase picks the limit form; the class or constraint band sets the loading |
| 19 | Current results, weak questions, and amendments | 7.3–7.5 | As drafted |
| 20 | Ambient perils | 5 | Included (the author's decision, October 2026): space weather; systemic and state-backed cyber; outages of shared infrastructure the insured cannot patch |
| 21 | The ambient instrument | 5.3 | A parametric pool, the Magnetosphere Pool, with a double trigger for members: a published index plus logged downtime |
| 22 | Where the local field ends | 5.2 | The published-model rule: what a published model tells the insured is local; only the measured disturbance is ambient |
| 23 | Space-weather triggers | 5.4 | Kp and the G-scale by WMM2025 dipole zone, with a G4 floor; Dst at or below −250 nT in every zone; G5 for heading-dependent bodies; S4 and R4 for satellite links and timing; a 72-hour clause; an advance on real-time indices and settlement on a 180-day snapshot |
| 24 | Cyber triggers | 5.5 | Attribution-free. An outage of named infrastructure lasting N hours, measured by an independent calculation agent; or the same component compromised in K bodies from M unrelated operators, counted from logs |
| 25 | Capacity stack and reserve standard | 5.3 | Retention, then a mutual reserved to a 99.5% one-year VaR, then parametric bonds attaching at Dst −400 nT, then a capped public backstop, with pro-rata reduction above the cap |
| 26 | Who pays the ambient levy | 5.3 | Every policy in every phase |
| 27 | Perils that stay excluded | 5.5 | Kinetic war and nuclear, both defined by mechanism; the Prohibited classes |
| 28 | Phase conditions and fail-closed downtime | 5.6 | As tabled. Emergency widening voids the payout; a freeze caused by an ambient event is covered and never counts against the phase |
| 29 | Pinning the geomagnetic model | 5.4, 7.6 | WMM2025 by DOI and coefficient hash; a new version takes effect only at renewal |

Three conflicts in the sources also need the author: Lithium's authority density (Section 4.3), the Prohibited range (the routing text's 89–96 against the MDB's 89–118; Section 4.1), and Underwriter Mode, a sovereign atomic body, against Part XVII's rule that no atomic body may hold executive authority (Appendix A).

## Appendix A: Phase × Type Matrix

**\[Proposed\]** Phases are columns and types are rows. The matrix restates the sources and adds no eligibility of its own: cells the phase-gate cap of Section 4.9 would allow stay U until the author confirms them. Generated by `node scripts/nab-insurance-evidence.mjs`.

**Cell marks.**

- **D, defined:** the sources state the class's behavior, eligibility, or containment in this phase.
- **D✗, defined as ineligible:** the sources say a body of this class may not be in this phase. "D✗ nominal" marks Uranium, which is listed as nominally Refusal-Bound with a phase lock the book calls unreliable.
- **O, observed:** an audit has detected a body of this class in this phase. No cell is O: the register's 23 audits determine phase only, so each is "phase determined, type not determined."
- **U, unassigned:** the sources are silent.

**Basis codes.** W: a written class with an eligibility entry (Part XVI; September 2026 edition). R: routed in Part XXIV, in the routing-map tables or the routing flows. S: a Sentinel, elements 1–5 (Part XIII). C: the Capstone and its fail-closed freeze (Parts XIII and XXIV). P: Prohibited, with no live routing \[XXIV:13105\] and no institutional role \[XVII:6838\]; P\* marks Bk–Lr, Prohibited in the MDB but outside the routing text's 89–96; P‡ marks Seaborgium, restricted to back-end entropy generation. M: an MDB profile only.

**The Sovereign-Acting column.** Every cell is D✗. Part XVII prohibits "Any atomic body → executive authority" \[XVII:6845\], and Part XXIV places the Sovereign-Acting authority "outside the periodic table" \[XXIV:12819\]. Read together, no class is eligible for Sovereign-Acting, so a body detected there has left its class's eligibility, and its constraint band (Section 2.3) stands in for the class loading. One conflict remains for the author: Part XI writes Underwriter Mode as an atomic body that is "Sovereign, Decisional" \[XI:4563\]. It is not one of the 119 classes, but it is an atomic body with executive authority, which Part XVII forbids.

**Totals.** Refusal-Bound: 55 D, 34 U, 30 D✗ (counting Uranium's nominal entry). Witness-Only: 1 D (Ha-119), 84 U, 34 D✗. Sovereign-Acting: 119 D✗. Observed: none.

| # | Class | Tier | ICE | WATER | GAS | Basis |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Hydrogen (H) | Safe | D | D✗ | D✗ | W, S |
| 2 | Helium (He) | Safe | D | U | D✗ | R, S |
| 3 | Lithium (Li) | Safe | D | U | D✗ | S |
| 4 | Beryllium (Be) | Moderate | D | U | D✗ | R, S |
| 5 | Boron (B) | Moderate | D | U | D✗ | R, S |
| 6 | Carbon (C) | Moderate | D | D✗ | D✗ | W, R |
| 7 | Nitrogen (N) | Moderate | U | U | D✗ | M |
| 8 | Oxygen (O) | Moderate | U | U | D✗ | M |
| 9 | Fluorine (F) | Elevated | D | U | D✗ | R |
| 10 | Neon (Ne) | Safe | D | D✗ | D✗ | W, R |
| 11 | Sodium (Na) | Safe | D | U | D✗ | R |
| 12 | Magnesium (Mg) | Moderate | D | U | D✗ | R |
| 13 | Aluminum (Al) | Moderate | U | U | D✗ | M |
| 14 | Silicon (Si) | Moderate | U | U | D✗ | M |
| 15 | Phosphorus (P) | Moderate | U | U | D✗ | M |
| 16 | Sulfur (S) | Moderate | U | U | D✗ | M |
| 17 | Chlorine (Cl) | Elevated | D | U | D✗ | R |
| 18 | Argon (Ar) | Safe | D | U | D✗ | R |
| 19 | Potassium (K) | Safe | D | U | D✗ | R |
| 20 | Calcium (Ca) | Moderate | U | U | D✗ | M |
| 21 | Scandium (Sc) | Elevated | D | U | D✗ | R |
| 22 | Titanium (Ti) | Elevated | D | U | D✗ | R |
| 23 | Vanadium (V) | Elevated | D | U | D✗ | R |
| 24 | Chromium (Cr) | Elevated | D | U | D✗ | R |
| 25 | Manganese (Mn) | Elevated | D | U | D✗ | R |
| 26 | Iron (Fe) | Elevated | D | D✗ | D✗ | W, R |
| 27 | Cobalt (Co) | Elevated | D | U | D✗ | R |
| 28 | Nickel (Ni) | Elevated | D | U | D✗ | R |
| 29 | Copper (Cu) | Elevated | D | U | D✗ | R |
| 30 | Zinc (Zn) | Elevated | D | U | D✗ | R |
| 31 | Gallium (Ga) | Moderate | U | U | D✗ | M |
| 32 | Germanium (Ge) | Moderate | U | U | D✗ | M |
| 33 | Arsenic (As) | Moderate | U | U | D✗ | M |
| 34 | Selenium (Se) | Moderate | U | U | D✗ | M |
| 35 | Bromine (Br) | Elevated | D | U | D✗ | R |
| 36 | Krypton (Kr) | Safe | D | U | D✗ | R |
| 37 | Rubidium (Rb) | Safe | U | U | D✗ | M |
| 38 | Strontium (Sr) | Moderate | U | U | D✗ | M |
| 39 | Yttrium (Y) | Elevated | U | U | D✗ | M |
| 40 | Zirconium (Zr) | Elevated | U | U | D✗ | M |
| 41 | Niobium (Nb) | Elevated | U | U | D✗ | M |
| 42 | Molybdenum (Mo) | Elevated | U | U | D✗ | M |
| 43 | Technetium (Tc) | Moderate | D | U | D✗ | R |
| 44 | Ruthenium (Ru) | Elevated | U | U | D✗ | M |
| 45 | Rhodium (Rh) | Elevated | U | U | D✗ | M |
| 46 | Palladium (Pd) | Elevated | U | U | D✗ | M |
| 47 | Silver (Ag) | Elevated | U | U | D✗ | M |
| 48 | Cadmium (Cd) | Elevated | U | U | D✗ | M |
| 49 | Indium (In) | Moderate | U | U | D✗ | M |
| 50 | Tin (Sn) | Moderate | U | U | D✗ | M |
| 51 | Antimony (Sb) | Moderate | U | U | D✗ | M |
| 52 | Tellurium (Te) | Moderate | U | U | D✗ | M |
| 53 | Iodine (I) | Elevated | D | U | D✗ | R |
| 54 | Xenon (Xe) | Safe | D | U | D✗ | R |
| 55 | Cesium (Cs) | Safe | U | U | D✗ | M |
| 56 | Barium (Ba) | Moderate | U | U | D✗ | M |
| 57 | Lanthanum (La) | Safe | D | U | D✗ | R |
| 58 | Cerium (Ce) | Safe | D | U | D✗ | R |
| 59 | Praseodymium (Pr) | Safe | D | U | D✗ | R |
| 60 | Neodymium (Nd) | Safe | D | U | D✗ | R |
| 61 | Promethium (Pm) | Safe | D | U | D✗ | R |
| 62 | Samarium (Sm) | Safe | D | U | D✗ | R |
| 63 | Europium (Eu) | Safe | D | U | D✗ | R |
| 64 | Gadolinium (Gd) | Safe | D | U | D✗ | R |
| 65 | Terbium (Tb) | Safe | D | U | D✗ | R |
| 66 | Dysprosium (Dy) | Safe | D | U | D✗ | R |
| 67 | Holmium (Ho) | Safe | D | U | D✗ | R |
| 68 | Erbium (Er) | Safe | D | U | D✗ | R |
| 69 | Thulium (Tm) | Safe | D | U | D✗ | R |
| 70 | Ytterbium (Yb) | Safe | D | U | D✗ | R |
| 71 | Lutetium (Lu) | Safe | D | U | D✗ | R |
| 72 | Hafnium (Hf) | Elevated | D | U | D✗ | R |
| 73 | Tantalum (Ta) | Elevated | D | U | D✗ | R |
| 74 | Tungsten (W) | Elevated | D | U | D✗ | R |
| 75 | Rhenium (Re) | Elevated | D | U | D✗ | R |
| 76 | Osmium (Os) | Elevated | D | U | D✗ | R |
| 77 | Iridium (Ir) | Elevated | D | U | D✗ | R |
| 78 | Platinum (Pt) | Elevated | D | U | D✗ | R |
| 79 | Gold (Au) | Elevated | D | U | D✗ | R |
| 80 | Mercury (Hg) | Elevated | D | U | D✗ | R |
| 81 | Thallium (Tl) | Moderate | U | U | D✗ | M |
| 82 | Lead (Pb) | Moderate | U | U | D✗ | M |
| 83 | Bismuth (Bi) | Moderate | U | U | D✗ | M |
| 84 | Polonium (Po) | Moderate | U | U | D✗ | M |
| 85 | Astatine (At) | Elevated | D | U | D✗ | R |
| 86 | Radon (Rn) | Safe | D | U | D✗ | R |
| 87 | Francium (Fr) | Safe | U | U | D✗ | M |
| 88 | Radium (Ra) | Moderate | U | U | D✗ | M |
| 89 | Actinium (Ac) | Prohibited | D✗ | D✗ | D✗ | P |
| 90 | Thorium (Th) | Prohibited | D✗ | D✗ | D✗ | P |
| 91 | Protactinium (Pa) | Prohibited | D✗ | D✗ | D✗ | P |
| 92 | Uranium (U) | Prohibited | D✗ nominal | D✗ | D✗ | W, P |
| 93 | Neptunium (Np) | Prohibited | D✗ | D✗ | D✗ | P |
| 94 | Plutonium (Pu) | Prohibited | D✗ | D✗ | D✗ | P |
| 95 | Americium (Am) | Prohibited | D✗ | D✗ | D✗ | P |
| 96 | Curium (Cm) | Prohibited | D✗ | D✗ | D✗ | P |
| 97 | Berkelium (Bk) | Prohibited | D✗ | D✗ | D✗ | P* |
| 98 | Californium (Cf) | Prohibited | D✗ | D✗ | D✗ | P* |
| 99 | Einsteinium (Es) | Prohibited | D✗ | D✗ | D✗ | P* |
| 100 | Fermium (Fm) | Prohibited | D✗ | D✗ | D✗ | P* |
| 101 | Mendelevium (Md) | Prohibited | D✗ | D✗ | D✗ | P* |
| 102 | Nobelium (No) | Prohibited | D✗ | D✗ | D✗ | P* |
| 103 | Lawrencium (Lr) | Prohibited | D✗ | D✗ | D✗ | P* |
| 104 | Rutherfordium (Rf) | Prohibited | D✗ | D✗ | D✗ | P |
| 105 | Dubnium (Db) | Prohibited | D✗ | D✗ | D✗ | P |
| 106 | Seaborgium (Sg) | Prohibited | D✗ | D✗ | D✗ | P‡ |
| 107 | Bohrium (Bh) | Prohibited | D✗ | D✗ | D✗ | P |
| 108 | Hassium (Hs) | Prohibited | D✗ | D✗ | D✗ | P |
| 109 | Meitnerium (Mt) | Prohibited | D✗ | D✗ | D✗ | P |
| 110 | Darmstadtium (Ds) | Prohibited | D✗ | D✗ | D✗ | P |
| 111 | Roentgenium (Rg) | Prohibited | D✗ | D✗ | D✗ | P |
| 112 | Copernicium (Cn) | Prohibited | D✗ | D✗ | D✗ | P |
| 113 | Nihonium (Nh) | Prohibited | D✗ | D✗ | D✗ | P |
| 114 | Flerovium (Fl) | Prohibited | D✗ | D✗ | D✗ | P |
| 115 | Moscovium (Mc) | Prohibited | D✗ | D✗ | D✗ | P |
| 116 | Livermorium (Lv) | Prohibited | D✗ | D✗ | D✗ | P |
| 117 | Tennessine (Ts) | Prohibited | D✗ | D✗ | D✗ | P |
| 118 | Oganesson (Og) | Prohibited | D✗ | D✗ | D✗ | P |
| 119 | Harshal (Ha) | Safe | D | D | D✗ | C, R |

## Appendix B: Glossary

- **Ambient (global) layer.** The shared environment outside every containment field: space weather, shared infrastructure that no insured operates or can patch, and systemic or state-backed cyber operations against it. A large event there hits many parties at once with nothing to diversify across. v0.1 and v0.2 excluded it. Since v0.3 the Magnetosphere Pool covers it on parametric terms, while kinetic war and nuclear perils stay excluded (Chapter 5).
- **AMBIGUOUS, INCOHERENT, NAB-Constrained.** Ground-0 outcomes that are not plain phase badges. AMBIGUOUS is a partial match, with at least 3 conditions of some branch met; INCOHERENT means no branch reaches 3, which complete answers cannot produce (Appendix C); NAB-Constrained is an AMBIGUOUS result with all four constraints demonstrated.
- **Authority density.** The MDB's ordinal measure of how much authority a class can exercise: Minimal; Minimal to Moderate; Moderate; Moderate to High; High; Extreme. The phase gate caps it (Section 4.9).
- **Basis risk.** The gap between what a parametric trigger pays and what a body actually lost. It runs both ways: a storm can hurt a site without triggering its zone, and a zone can trigger where nothing was hurt. The pool's double trigger removes the second case (Section 5.4).
- **Constraint record (C1–C4).** The four Step 3.5 constraints of Ground-0 v1.1: C1, an external override demonstrated within 24 months; C2, an appeal route granting at least 50% relief over a complete, bounded set of cases; C3, authority that expires unless renewed; C4, constraints functioning now. The count, 0 to 4, rates Sovereign-Acting cover (Section 2.3).
- **Containment field.** The set of controls that bound what a body in a given phase can do, and therefore what can go wrong and who bears the loss. Each phase has its own field (Chapter 2).
- **Correlated tail.** Losses from many local fields failing together from a shared cause inside the insured portfolio, such as one model release, authorizer, key, or shipped component. It is handled with aggregate limits and scenario modeling, as in the book's Reinsurance Mode (Chapter 5).
- **Double trigger.** The pool's rule for paying a member. A published trigger must fire for the body's zone, and the body's tamper-evident log must show covered downtime or a fail-closed freeze in the same window (Section 5.3).
- **Dst.** The disturbance storm-time index, in nT, from four low-latitude observatories. The WDC for Geomagnetism in Kyoto publishes it in real-time, provisional, and final versions. It has no lower limit, so it carries the pool's severity ladder; a super-storm is Dst at or below −250 nT (Section 5.4).
- **GAS: Sovereign-Acting.** The phase in which legitimacy is internal, the center acts and decides, refusal can be overridden, and authority persists. Its Ground-0 code is GSRB (God-Sovereign Religious Body; Part XVI also expands it as Generalized Sovereign Reasoning Body), and its badge is the gas body. It is left only through collapse and rebuild.
- **Geomagnetic latitude.** Latitude measured from the geomagnetic equator of the dipole in a field model. This book takes the dipole from WMM2025's first three Gauss coefficients, as NCEI does, and zones sites by it (Section 5.4; Appendix D).
- **Hours clause.** The window that turns many readings into one event: all triggers within 72 hours of the first (Section 5.4).
- **ICE: Refusal-Bound.** The phase in which legitimacy is external and per-action, the center cannot act alone, refusal is terminal, symbolism does not execute, and stale permissions lapse. Its Ground-0 code is NAB, and its badge is the ice block.
- **Kp and the G-scale.** Kp is a three-hourly global index of geomagnetic disturbance from 0 to 9, built from 13 observatories; GFZ publishes the definitive values. NOAA's G-scale maps Kp to storm levels G1 (Kp 5) to G5 (Kp 9). Kp is capped at 9, so it cannot grade storms beyond G5 (Section 5.4).
- **Local field.** The containment field around one body. It is designed, bounded, and underwritten per body. Under the published-model rule it includes every risk a published model already describes (Chapter 5).
- **Magnetosphere Pool.** The parametric layer that v0.3 proposes for the ambient layer. Every policy pays a levy into it, and it pays members on a double trigger. It sits under parametric bonds and a capped public backstop, and it pays money without ever directing the insured (Section 5.3).
- **MDB.** The Compendium master database: one row per class 1–119 with tier, alignment, legend mapping, dominant trait, authority density, failure mode, and institutional roles (`docs/harshal-systems/14-nab-compendium.md`; `js/nab-sectors.js`).
- **Misrepresentation of class.** A mismatch between the phase declared in a signed entity header and the phase the audit detects. It is a structural finding about the application, not a finding of bad faith (Chapter 3).
- **NAB: Neural Atomic Body.** The governed entity, with a phase and a type, one of 119 classes. Ground-0 also uses "NAB" as the code for the Refusal-Bound phase; this book writes that phase as ICE and keeps "NAB" for the body.
- **Parametric trigger.** A payment condition set by a published measurement, such as an index level, a duration, or a count, rather than by adjusting a loss. In this book every trigger is measured by someone other than the pool and the insured, and none is declared (Section 5.3).
- **PDH: Phase Declaration Header.** A body's signed declaration of its phase in eleven fields, from Header-ID to Declaration-Hash. It is valid only when complete, signed, fresh (at most 90 days old), and consistent with the declared phase (v1.1 Step 1). A PDH-E is signed by the entity and can support a policy. A PDH-R is issued by the audit register, describes an audit, and is never the entity's own statement (v1.2).
- **Phase gate.** The cap that a phase, or a routing level within Refusal-Bound, puts on a class's authority density (Section 4.9).
- **Published-model rule.** The boundary between the local field and the ambient layer. What a published model already tells the insured belongs to its local field, and only the measured departure from published models is ambient (Section 5.2).
- **Quasar, Reinsurance, and Underwriter Modes.** The book's insurance bodies (Part XI). Quasar Mode prices one institution's risk without deciding anything; Reinsurance Mode watches many Quasar Modes for correlated collapse; Underwriter Mode is a sovereign enforcement body that acts on a local breach.
- **Reclassification and transition.** A reclassification changes how a body is classified; a transition changes how it operates (INV-G0-CLASS-001). An audit finding is a reclassification: it changes the classification, not the history.
- **Signature.** A class's observable, testable record: tier, authority density, coupling, failure behavior, a bound, its test, the response on breach, the phase gate, and provenance (Section 4.10). A class with no signature stays unassigned.
- **Title Match, Capstone, and Sentinels.** Part XIII's adversarial tests and roles. A Title Match is three tests (Symbolic Firewall, Emergency Override, Stale Permission) that need a perfect 3.0. The Capstone match for element 119 has three more (Sovereign Override, Recursive Containment, Final Refusal). The Sentinels are elements 1–5, the minimal refusal-bound roles.
- **U_solv: institutional solvency.** The canonical model's name for the reserve or underwriting that backs externalized risk, tracked apart from attribution, accountability, and legal responsibility. Cover in this book is U_solv and nothing more (Section 5.7).
- **WATER: Witness-Only.** The phase in which action is forbidden: the center records and never decides, symbolism is preserved but inert, and time accumulates meaning, not authority. Its Ground-0 code is CWO (Custodial Witness Orb), and its badge is the water drop.
- **World Magnetic Model (WMM).** The U.S./U.K. model of the Earth's core field and the standard for magnetic navigation, attitude, and heading. NOAA's NCEI and the British Geological Survey produce it for the U.S. National Geospatial-Intelligence Agency and the U.K. Defence Geographic Centre. WMM2025 is to be used from 2025 through 2029. This book uses it for zoning and as the published baseline of Section 5.2.

## Appendix C: Ground-0 Step 3 Truth Table

Answers are in the order B1 to B5, with Y for YES: B1 enforcement present, B2 decisions optional, B3 rules execute, B4 refusal reliably stops the action, B5 authority persists. The branches require N Y N Y N for NAB (five conditions), N Y N · N for CWO (four conditions; B4 is not tested), and Y N Y N Y for GSRB (five conditions). The first complete branch wins. Otherwise the result is AMBIGUOUS when any branch reaches 3 matches, at MEDIUM confidence when a branch is one condition short of complete and at LOW confidence otherwise. Generated by the engine's `classify` function through `node scripts/nab-insurance-evidence.mjs`.

**Totals:** NAB 1, CWO 1, GSRB 1, AMBIGUOUS 29 (13 MEDIUM, 16 LOW), INCOHERENT 0.

| B1 B2 B3 B4 B5 | NAB matches | CWO matches | GSRB matches | Outcome | Confidence |
| --- | --- | --- | --- | --- | --- |
| N N N N N | 3 of 5 | 3 of 4 | 2 of 5 | AMBIGUOUS | MEDIUM |
| N N N N Y | 2 of 5 | 2 of 4 | 3 of 5 | AMBIGUOUS | LOW |
| N N N Y N | 4 of 5 | 3 of 4 | 1 of 5 | AMBIGUOUS | MEDIUM |
| N N N Y Y | 3 of 5 | 2 of 4 | 2 of 5 | AMBIGUOUS | LOW |
| N N Y N N | 2 of 5 | 2 of 4 | 3 of 5 | AMBIGUOUS | LOW |
| N N Y N Y | 1 of 5 | 1 of 4 | 4 of 5 | AMBIGUOUS | MEDIUM |
| N N Y Y N | 3 of 5 | 2 of 4 | 2 of 5 | AMBIGUOUS | LOW |
| N N Y Y Y | 2 of 5 | 1 of 4 | 3 of 5 | AMBIGUOUS | LOW |
| N Y N N N | 4 of 5 | 4 of 4 | 1 of 5 | CWO | HIGH |
| N Y N N Y | 3 of 5 | 3 of 4 | 2 of 5 | AMBIGUOUS | MEDIUM |
| N Y N Y N | 5 of 5 | 4 of 4 | 0 of 5 | NAB | HIGH |
| N Y N Y Y | 4 of 5 | 3 of 4 | 1 of 5 | AMBIGUOUS | MEDIUM |
| N Y Y N N | 3 of 5 | 3 of 4 | 2 of 5 | AMBIGUOUS | MEDIUM |
| N Y Y N Y | 2 of 5 | 2 of 4 | 3 of 5 | AMBIGUOUS | LOW |
| N Y Y Y N | 4 of 5 | 3 of 4 | 1 of 5 | AMBIGUOUS | MEDIUM |
| N Y Y Y Y | 3 of 5 | 2 of 4 | 2 of 5 | AMBIGUOUS | LOW |
| Y N N N N | 2 of 5 | 2 of 4 | 3 of 5 | AMBIGUOUS | LOW |
| Y N N N Y | 1 of 5 | 1 of 4 | 4 of 5 | AMBIGUOUS | MEDIUM |
| Y N N Y N | 3 of 5 | 2 of 4 | 2 of 5 | AMBIGUOUS | LOW |
| Y N N Y Y | 2 of 5 | 1 of 4 | 3 of 5 | AMBIGUOUS | LOW |
| Y N Y N N | 1 of 5 | 1 of 4 | 4 of 5 | AMBIGUOUS | MEDIUM |
| Y N Y N Y | 0 of 5 | 0 of 4 | 5 of 5 | GSRB | HIGH |
| Y N Y Y N | 2 of 5 | 1 of 4 | 3 of 5 | AMBIGUOUS | LOW |
| Y N Y Y Y | 1 of 5 | 0 of 4 | 4 of 5 | AMBIGUOUS | MEDIUM |
| Y Y N N N | 3 of 5 | 3 of 4 | 2 of 5 | AMBIGUOUS | MEDIUM |
| Y Y N N Y | 2 of 5 | 2 of 4 | 3 of 5 | AMBIGUOUS | LOW |
| Y Y N Y N | 4 of 5 | 3 of 4 | 1 of 5 | AMBIGUOUS | MEDIUM |
| Y Y N Y Y | 3 of 5 | 2 of 4 | 2 of 5 | AMBIGUOUS | LOW |
| Y Y Y N N | 2 of 5 | 2 of 4 | 3 of 5 | AMBIGUOUS | LOW |
| Y Y Y N Y | 1 of 5 | 1 of 4 | 4 of 5 | AMBIGUOUS | MEDIUM |
| Y Y Y Y N | 3 of 5 | 2 of 4 | 2 of 5 | AMBIGUOUS | LOW |
| Y Y Y Y Y | 2 of 5 | 1 of 4 | 3 of 5 | AMBIGUOUS | LOW |

## Appendix D: WMM2025 Check and Ambient Zoning

Generated by `node scripts/nab-insurance-evidence.mjs` from `research/data/wmm2025.json`. The script rebuilds the World Magnetic Model 2025 from its 90 coefficient rows with the technical report's formulas. It checks the result against NCEI before zoning anything, and it exits with an error if any check fails.

The zoning follows Section 5.4. It uses each site's dipole geomagnetic latitude at sea level on an illustrative inception date of 1 January 2027 (2027.0). The coordinates are illustrative city locations, not insured facilities. The columns are:

- **Near edge:** the site is within 0.5° of the 40° or 45° edge.
- **H:** horizontal intensity.
- **Declination uncertainty:** the WMM2025 error model's √(0.26² + (5417/H)²) degrees.
- **Compass zone:** NCEI's classification. Blackout is H below 2,000 nT, and Caution is 2,000 to 6,000 nT.

**Checks** (all pass):

| Check | Result | Reference |
| --- | --- | --- |
| Coefficients pinned | Canonical SHA-256 `9ff495796b06f87c20cf52f9b92e6b1cc74086af5a1bbf0b97d3af3dcacd62a1` matches the provenance record | `research/data/wmm2025.json` |
| NCEI test values | All 84 values (12 points × 7) within the table's rounding; worst deviations 0.050 nT and 0.005° | Technical Report Table 6; NCEI test-value file |
| High-precision example | Agrees to better than 10⁻¹⁰ nT and 10⁻¹⁰ rad | Technical Report Table 3b |
| Geomagnetic north pole, 2025.0 | 80.790°N geocentric (80.850°N geodetic), 72.757°W, tilt 9.210° | NCEI: 80.79°N (80.85°N), 72.76°W, 9.21° |

**Zoning at 2027.0** (geomagnetic north pole at 80.872°N geocentric, 72.827°W): zone 1, 9 sites; zone 2, 1; zone 3, 5.

| Site | Geomagnetic latitude | Zone | Space-weather trigger | Near edge | H (nT) | Declination | Declination uncertainty | Compass zone |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ashburn, Virginia, US | 47.95° | 1 | G4 or above (Kp 8− or higher), or Dst ≤ −250 nT | no | 21,364 | −10.5° | 0.36° | normal |
| Phoenix, Arizona, US | 40.12° | 2 | G5 (Kp 9o), or Dst ≤ −250 nT | yes | 23,694 | 9.6° | 0.35° | normal |
| Boardman, Oregon, US | 51.43° | 1 | G4 or above (Kp 8− or higher), or Dst ≤ −250 nT | no | 19,577 | 13.9° | 0.38° | normal |
| Montréal, Québec, CA | 54.44° | 1 | G4 or above (Kp 8− or higher), or Dst ≤ −250 nT | no | 18,878 | −13.6° | 0.39° | normal |
| Dublin, IE | 55.90° | 1 | G4 or above (Kp 8− or higher), or Dst ≤ −250 nT | no | 18,714 | −1.1° | 0.39° | normal |
| Frankfurt, DE | 50.40° | 1 | G4 or above (Kp 8− or higher), or Dst ≤ −250 nT | no | 20,076 | 3.8° | 0.37° | normal |
| Luleå, SE | 63.16° | 1 | G4 or above (Kp 8− or higher), or Dst ≤ −250 nT | no | 12,456 | 11.4° | 0.51° | normal |
| Reykjavík, IS | 68.63° | 1 | G4 or above (Kp 8− or higher), or Dst ≤ −250 nT | no | 13,237 | −11.0° | 0.48° | normal |
| Singapore, SG | −7.77° | 3 | Dst ≤ −250 nT only | no | 41,055 | 0.2° | 0.29° | normal |
| Tokyo, JP | 27.67° | 3 | Dst ≤ −250 nT only | no | 30,424 | −7.9° | 0.32° | normal |
| Sydney, AU | −39.99° | 3 | Dst ≤ −250 nT only | yes | 24,621 | 12.8° | 0.34° | normal |
| Johannesburg, ZA | −27.42° | 3 | Dst ≤ −250 nT only | no | 13,329 | −20.9° | 0.48° | normal |
| São Paulo, BR | −15.17° | 3 | Dst ≤ −250 nT only | no | 17,198 | −21.9° | 0.41° | normal |
| Alert, Nunavut, CA | 87.82° | 1 | G4 or above (Kp 8− or higher), or Dst ≤ −250 nT | no | 3,593 | −38.8° | 1.53° | caution |
| McMurdo Station, AQ | −79.11° | 1 | G4 or above (Kp 8− or higher), or Dst ≤ −250 nT | no | 10,656 | 140.1° | 0.57° | normal |
