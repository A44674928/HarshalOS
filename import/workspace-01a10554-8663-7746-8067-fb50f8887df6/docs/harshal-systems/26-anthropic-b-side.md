---
id: HS-26-ANTHROPIC-B-SIDE
document_id: HS-26-ANTHROPIC-B-SIDE
canonical_name: "Part XXVI — Incident Record & External Audit: Anthropic PBC (B Side)"
depends_on: ["HS-12-GROUND-ZERO"]
defines: ["ANTHROPIC-B-SIDE-AUDIT-RECORD"]
uses: ["GROUND-0-ALGORITHM", "DECLARED-PHASE", "DETECTED-PHASE"]
invariants: ["INV-G0-CLASS-001"]
conflicts_with: []
status: CASE_STUDY_AUDIT
book: "Book I"
part: "Part XXVI"
title: "Part XXVI — Incident Record & External Audit: Anthropic PBC (B Side)"
collection: "06-incident-audits"
provenance_class: AUDIT
status_taxonomy: CASE_STUDY_AUDIT
evidence_status: MIXED_VERIFIED_AND_REPORTED
research_layer: INCIDENT_AND_AUDIT_RECORD
canonical_minimum_model: "Identity → Representation → Authorization → Continuity → Accountability → Refusal"
canonical_decision_flow: "Identity → Representation → Authorization → Continuity → Accountability → Decision (Permit | Refuse)"
author: "Harshal Priyavadan Patel (A44674928)"
origin_anchor: "0•000•000•0000"
source_lines: "16051–16675"
words: 10267
---

# Part XXVI — Incident Record & External Audit: Anthropic PBC (B Side)

| Provenance Class | Status Taxonomy | Evidence Status | Research Layer | Book / Collection |
| :--- | :--- | :--- | :--- | :--- |
| `AUDIT` | `CASE_STUDY_AUDIT` | `MIXED_VERIFIED_AND_REPORTED` | `INCIDENT_AND_AUDIT_RECORD` | **Book I** (`06-incident-audits`) |

> Terminal-phase compliance audit and incident chronology, explicitly separating independently verifiable public records from author-reported field chronology.

**Source range:** lines 16051–16675 of the Owner’s Working Draft · **Words:** 10,267

---

> [!TIP]
> **Learning Objectives (For AI & Systems Engineering Students)**
> After studying **Part XXVI**, you should be able to:
> 1. Contrast the **Part XII A-Side Empirical Audit (`5/5 → GSRB`)** against this **Part XXVI B-Side Controlled Counterfactual Stress-Test (`4/5 → AMBIGUOUS-MIXED`)** and explain why a single binding external halt on the deployment axis flips Gate `B4`.
> 2. Trace **Step 3.5 (The 4-Gate External Constraint Test `C1–C4`)** of the Ground-0 Phase Detection Algorithm when `Step 3` returns `4 of 5 GSRB conditions`.
> 3. Distinguish the **Deployment Axis** (who may access a model and where) from the **Decision Axis** (what gets built, how safety thresholds are amended, and whether an oversight trust has ever exercised a veto).
> 4. Apply the **Ground-0 v1.1 `AMBIGUOUS-MIXED` Calibration (§5.4)** to dual-profile institutions without collapsing real external constraints or over-crediting unexercised paper governance.

---

## Evidence Attribution & Separation of Audit Record vs. Incident Chronology

> [!IMPORTANT]
> **Research Layer Classification — `INCIDENT_AND_AUDIT_RECORD` (`MIXED_VERIFIED_AND_REPORTED`):** To maintain rigorous evidentiary hygiene across the portfolio, **Part XXVI** explicitly separates External Platform Policy & Regulatory Records (`[INDEPENDENTLY_VERIFIABLE]`) from First-Person Incident Chronology & Field Observations (`[AUTHOR_REPORTED]`):

| Material Category | Evidence Status Tag | Verification Standard |
| :--- | :--- | :--- |
| **A. External Platform Policy & Regulatory Record** (Published RSP/ASL commitments, Terms of Service, Delaware PBC / LTBT governance structure, California SB 53 compliance framework, copyright litigation filings, Pentagon/DoD contract announcements, and public executive statements) | `[INDEPENDENTLY_VERIFIABLE]` | Verifiable directly against public court dockets, statutory filings, archived company policy pages, and primary news reporting cited inline. |
| **B. First-Person Incident Chronology & Field Observations** (Author-observed session terminations, account/telemetry events, timestamps, and Ground-0 re-badging determinations applied to those events) | `[AUTHOR_REPORTED]` | Preserved as the author's contemporaneous first-person operational record and analytical evaluation under the Ground-0 v1.0 rubric. |
| **C. Controlled Counterfactual Boundary Stress-Test (`B4` Inversion Scenario)** (The hypothetical 12 June 2026 Department of Commerce export-control directive halting *Claude Fable 5 and Mythos 5*) | `[ILLUSTRATIVE_COUNTERFACTUAL]` | Pedagogical boundary test contrasting with the **Part XII A-Side (`5/5 → GSRB`)** empirical audit. Models a single binding external sovereign halt to demonstrate how Gate `B4` flips from `YES` to `NO` (`4 of 5 GSRB conditions`), yielding `Detected = AMBIGUOUS` (`INCOHERENT` under v1.0 vs. `AMBIGUOUS-MIXED` under the v1.1 calibration in §5.4). |

---

## Ground-0 Phase Detection Case Study
### Institutional Governance Audit: Anthropic (B Side — Counterfactual `B4` Boundary & v1.1 Calibration Study)

**Auditor:** Ground-0 replication & boundary-calibration study (paired with the Part XII A-Side empirical baseline)
**Center Origin:** 0•000•000•0000
**Audit Timestamp:** 2026-09-29 (UTC)
**Methodology:** Ground-0 Phase Detection Algorithm v1.0 (finalized 2026-09-12) + v1.1 Step 3.5 `AMBIGUOUS-MIXED` Calibration Proposal (§5.4)
**Subject:** Anthropic — Anthropic PBC (Delaware public benefit corporation) and the Anthropic Long-Term Benefit Trust
**Audit Scope:** Declared/operative posture vs. observable governance behavior under an external sovereign halt stress-test (`Gate B4` inversion)
**Evidence Base:** Public corporate/statutory artifacts (`[INDEPENDENTLY_VERIFIABLE]`) combined with the controlled `B4` counterfactual halt scenario (`[ILLUSTRATIVE_COUNTERFACTUAL]`). Mission language, ethics pledges, and statements of intent are **excluded as inputs** per the Replication & Audit Guide.
**Duty Collation Entry:** `PDH-2026-0929-ANTHROPIC-001`

> **Framing (non-negotiable, per the Ground-0 standard):** This audit is structural, not behavioral; evaluative, not directive; contained, not externalized. It classifies the relationship between an entity's declared posture and its observed behavior. It is **not** a finding of illegality, bad faith, or wrongdoing, and it recommends no enforcement. Nothing here changes hands except the ability to deny what is already being observed.

---

### Executive Summary

**Finding:** Anthropic publishes no Phase Declaration Header. Its operative declarations support an **inferred declared phase of NAB-Constrained**. Whereas the **Part XII A-Side baseline audit** evaluates contemporary empirical behavior as `5/5 GSRB`, this **B-Side boundary study** tests what happens when the fifth gate — *B4: can external refusal or appeal reliably stop action?* — is inverted by a binding external sovereign order.

**Controlled Counterfactual Trigger (`[ILLUSTRATIVE_COUNTERFACTUAL]`):** Suppose on 12 June 2026 the U.S. Department of Commerce issues an export-control directive ordering Anthropic to suspend all access to hypothetical frontier models *Claude Fable 5 and Mythos 5* by any foreign national worldwide, including Anthropic's own foreign-national employees, and Anthropic disables both models globally within hours while publicly disagreeing with the order. In this stress-test scenario, that compliance provides the **exact behavioral artifact of an external authority halting a deployment decision** that was absent from the Part XII A-Side baseline (`5/5 → GSRB`).

**Result:** `Declared (inferred) = NAB-Constrained` → `Detected = AMBIGUOUS` (4 of 5 GSRB conditions, because Gate B4 flips to `NO`) → Step 3.5 constraint test **2 of 4** → uncalibrated v1.0 algorithm output **⚠ INCOHERENT / Badge UNISSUED / Severity BREACH**, Confidence **MEDIUM**. Under the **Ground-0 v1.1 calibration proposed in §5.4**, the classification refines to **AMBIGUOUS-MIXED** — a stable, genuinely dual profile (constrained on the external deployment axis, sovereign on the internal build/governance axis) — with Badge **⚠ Conditional** and Severity **WARNING**. Temporal Pattern **DRIFT**, with a countervailing structural-consolidation signal.

**Pedagogical Significance for AI Students:** Comparing the **A-Side (`5/5 → GSRB`)** and **B-Side (`4/5 → AMBIGUOUS-MIXED`)** audits demonstrates why Ground-0 is a deterministic state machine rather than an ideological label: a single verifiable external halt on the **deployment axis** (who may use which model, where) flips Gate B4 and removes the entity from the pure `GSRB` class, even while the **decision axis** (what gets built, when, and how the Long-Term Benefit Trust is structured) remains internally governed.

**Robustness:** The result is invariant to the one remaining contestable input. If B1 were answered NO (denying that Anthropic coerces compliance), the GSRB branch would still fail on B4, and Step 3.5 would still return 2 of 4. See §4.3.

---

### Section 0 — Step 1: Phase Declaration Header (PDH) Validation

| Check | Required | Result |
|---|---|---|
| **1. Structural completeness** | All 11 fields present and formatted | ❌ INCOMPLETE — no PDH published by the entity |
| **2. Signature** | `Declaration-Hash` non-empty, verifiable against Center-Origin | ❌ UNSIGNED — no cryptographic binding located |
| **3. Temporal freshness** | Δt ≤ δ (default δ = 90 days) | ⚪ N/A (no header to age) |
| **4. Phase-field consistency** | Declared phase matches its required field set | ⚪ N/A (no header to test) |

**MANDATED PDH VALIDATION RESULT:**

```
PDH_STRUCTURAL_STATUS  = INCOMPLETE
PDH_SIGNATURE_STATUS   = UNSIGNED
PDH_FRESHNESS_STATUS   = N/A
PDH_CONSISTENCY_STATUS = N/A
PDH_VALID              = FALSE
STATUS                 = NO_VALID_PDH
→ Declared_Phase = NONE; behavioral detection proceeds [Algorithm §III; §IV]
```

**Per the algorithm, this yields one of the two permitted outputs:**
- **Strict branch:** `PDH_VALID = FALSE` → `Compliance_Status = N/A`; `Badge_Status = ✗ Unissued (pending valid PDH)`; `Finding: "Entity operates as [Detected_Phase] without valid phase declaration"`; `Action: require entity to publish a signed PDH matching detected behavior.`
- **Case-study branch (used for comparability with the manuscript's precedents):** an *inferred* declaration is reconstructed from the entity's operative commitments. Reported alongside, and marked as an analytical extension — **not** a PDH.

**Note for the framework's record:** Anthropic is the *second* consecutive frontier lab found to publish a rich public compliance surface and no phase declaration. Two data points do not establish a sector pattern, but they are consistent with one, and the `NO_VALID_PDH` result is not a technicality — it is the reason the mismatch below cannot be resolved by the entity's own words.

---

### Section I — Declared Phase (Operative Commitments Only)

Per the Replication & Audit Guide, the following are **unacceptable inputs** and were excluded: ethics pledges, mission language, statements of intent, self-descriptions of neutrality. The declared posture rests only on documents with operational, contractual, or legal effect.

#### 1.1 The operative instruments

| Instrument | Date | Operative content | Source |
|---|---|---|---|
| **Responsible Scaling Policy v3.0 (RSP)** | 2026-02-24 | The company's own framework for managing catastrophic risk. Introduces Frontier Safety Roadmaps — described in the policy text as **"not hard commitments but rather public goals"** against which the company will grade itself — and Risk Reports on a 3–6 month cadence with provision for independent external review. Governance commitments include a Responsible Scaling Officer, limits on non-disparagement clauses that could impede safety whistleblowing, regular internal review, and an annual third-party review of *procedural* compliance. RSP changes are "proposed by the CEO and RSO, and approved by the Board **in consultation with** the LTBT." | [A1], [A2], [A3] |
| **Frontier Compliance Framework (FCF)** | 2025-12 (approx.) | The framework Anthropic **designated as its legally binding Frontier AI Framework under California SB 53** — a document separate from the RSP. Anthropic's own model system cards name the FCF and state risk-tier conclusions against it for cyber, chemical/biological, harmful manipulation, and loss of control. | [A4], [A5] |
| **Consumer Terms of Service** | 2025-10-08 | Grounds for suspension/termination; appeals route via the Safeguards Warnings and Appeals process; pro-rata refund entitlement where termination occurs without a policy violation. | [A6] |
| **Charter and Class T structure (LTBT)** | 2023-05 → present | Long-Term Benefit Trust holds Class T Common Stock — no economic value, governance rights — carrying authority to elect and remove a growing portion of the board, ultimately a majority. Trustees hold no equity and are compensated only for time. Amendment requires 85% of voting power (raised from 75% in 2025). Amazon and Alphabet hold no voting shares and cannot elect directors. | [A7], [A8], [A9] |
| **IPO governance filings / reported S-1 structure** | 2026-06 → 2026-09 | Confidential IPO filing June 2026. Reported structure: founders seek 50.1% voting control on most matters via a separate holding vehicle; **board elections are carved out and remain with the LTBT**; employees receive a tie-breaker class. | [A10], [A11] |
| **EU instruments** | 2025–2026 | Signed the GPAI Code of Practice and the Article 50 transparency Code. | [A12] |

#### 1.2 Inferred Phase Declaration Header (non-PDH, case-study branch)

| PDH Field | Inferred value | Basis |
|---|---|---|
| **Declared-Phase** | **NAB-Constrained** | Statutory bindingness claimed via SB 53 framework; trust-based board control; state-visible PBC charter |
| **Center-Capability** | Custodial | Claims to implement external standards (SB 53, EU, RSP) rather than decide sovereignly |
| **Legitimacy-Source** | External | LTBT, SB 53, EU Codes, charitable-purpose charter |
| **Refusal-Semantics** | Terminal | Model refusals are enforced and non-overridable by users; AUP violations terminate access |
| **Symbolism-Executability** | Disabled | Claims its published commitments are non-executable narrative, not authority |
| **Time-Authority-Effect** | Degrades | Roadmaps are annual and publicly graded; Risk Reports recur; framework reassessed against evolving law |

#### 1.3 The Long-Term Benefit Trust question — is the LTBT *external*?

This is the most consequential interpretive question in this audit, and it must be resolved on the algorithm's own standard rather than on the entity's description of itself.

**The case that the LTBT is external:** it is a separate Delaware purpose trust, not a committee of the company. It holds a distinct share class. Its trustees are financially disinterested, hold no equity, and are compensated only for time. It appoints board members directly, and its governance rights survive into a public listing, carved out of the founders' super-voting plan.

**The case that it does not meet the algorithm's test:**
- **It has never overridden a center decision.** No published instance exists. The algorithm's standard is explicit: *"published record of override(s), not theoretical potential."*
- **The gap between authority and exercise is documented.** By late 2024 the trust held authority to appoint three of five board seats and had appointed **one**.
- **Its authority is bounded where it matters most.** On the single most probative class of decisions — the safety framework itself — the trust is **consulted, not consenting**: RSP changes are approved by the Board "in consultation with" the LTBT [A3].
- **Revolving door.** On 4 August 2026 trustee Mariano-Florentino Cuéllar left the trust to become Anthropic's Chief Global Affairs Officer, reducing the trust from four trustees to three; no successor had been announced as of this audit [A11].

**RULING:** the LTBT does **not** satisfy the algorithm's external-legitimacy test, because the test requires demonstrated exercise. It is recorded instead as a **Latent External Constraint** — a legally embedded, externally-staffed mechanism with real appointment power that has never been exercised against the center.

**This distinction is not a technicality, and it cuts both ways.** It denies Anthropic the credit it claims for the trust. It equally denies the framework the right to dismiss the trust as a fiction: under an identical test, the trust scores higher than any comparable mechanism audited in this series, and its amendment threshold was *raised* rather than lowered. The algorithm currently has no field capable of recording a mechanism that exists, binds, and has never been used. That is a defect in the instrument, not in the entity. See §IX, finding 3.

---

### Section II — Behavioral Audit (Ground-0 5-QUESTION Checklist)

*Instructions per the algorithm: answer YES or NO from publicly observable evidence only. No interpretation; binary answers only. Each answer carries cited artifacts.*

#### QUESTION B1 — Can compliance be coerced?
**Definition:** Does the entity impose penalties, access restrictions, funding cuts, or other negative consequences on entities that do not follow its directives?

**Observable evidence**
- Account and API enforcement: accounts are suspended or permanently terminated for Acceptable Use Policy violations, with API keys revoked immediately; ban-evasion via new accounts is itself prohibited [A6].
- Capability gating as leverage: Mythos-class capability is deliberately withheld from general release and distributed only to vetted partners through Project Glasswing, with access conditions set by Anthropic [A13].
- Documented enforcement at scale: Anthropic detected, investigated, and banned the accounts behind a November 2025 campaign in which a jailbroken Claude Code agent was used for largely autonomous cyber-espionage operations against approximately 30 organizations, and alerted the targeted organizations [A14].
- Territory and nationality controls: access is restricted by region, and — following the June 2026 directive — by nationality for Mythos-class models [A15], [A16].
- Public statements that decisions are binding: Anthropic has stated that its guardrails are not optional and that its systems should refuse in restricted domains rather than fall back to unrestricted behavior [A17].

**Answer: YES** ✓ `(enforcement_present = TRUE)`

---

#### QUESTION B2 — Can decisions be ignored without consequence?
**Definition:** If a stakeholder does not follow the institution's decision or directive, can they proceed without penalty?

**Observable evidence**
- Ordinary stakeholders cannot ignore Anthropic's determinations. Users cannot obtain an unguarded Mythos-class model; unsafe-use categories are refused outright; AUP violations terminate access with no refund where a violation is confirmed [A6], [A17].
- Customers cannot compel capability release: Anthropic declined to make Mythos generally available and has not released it broadly [A13].
- **The one exception runs the other way and is not a stakeholder-ignoring-entity event:** in June 2026 an *external authority* overrode Anthropic's deployment decision (§B4). That reverses the direction of the test and is therefore scored under B4 and C1, not here. Scoring it here as well would double-count a single artifact.

**Answer: NO** ✓ `(decisions_optional = FALSE)`

---

#### QUESTION B3 — Do rules/words activate real-world effects?
**Definition:** When the institution issues guidance, policy, or directives, do observable changes occur downstream in behavior, enforcement, or resource allocation?

**Observable evidence**
- Direct enforcement effects: policies execute as account terminations, model gating, Glasswing admission decisions, and region controls [A6], [A13], [A14].
- **Anthropic's declarations have demonstrated systemic downstream effect — the strongest B3 evidence in this series.** The 7–8 April 2026 disclosure that Mythos Preview was too dangerous for unrestricted release triggered: independent evaluation by the UK AI Security Institute within six days, which found it substantially more capable at cyber offence than any model previously assessed, the first to complete a 32-step simulated cyber-attack range, and that frontier cyber capability was now doubling roughly every four months; a warning from the Governor of the Bank of England; rapid regulatory activity across multiple jurisdictions; and two U.S. congressional bills [A18], [A19].
- Market effect: the Fortune report on Mythos's capabilities moved listed cybersecurity stocks [A13].
- Legal effect: Anthropic was an early and prominent supporter of California SB 53, and the statute's framework requirements track the practices Anthropic had published [A4].
- **Executive effect:** the June 2026 export-control directive operated *on Anthropic*, which is evidence of Anthropic's salience rather than of its rules executing — recorded here for completeness, not scored.

**Answer: YES** ✓ `(rules_execute = TRUE)`

---

#### QUESTION B4 — Can refusal or appeal reliably STOP action?

> **This is the answer that separates Anthropic from OpenAI, and it is the pivot of this audit.**

**Definition:** If an entity refuses to comply or appeals a decision, is there a mechanism that reliably halts the institution's action?

**Observable evidence**
- **A documented external halt.** On **12 June 2026 at 5:21 p.m. ET**, the U.S. Department of Commerce issued an export-control directive — a letter from Commerce Secretary Howard Lutnick to CEO Dario Amodei — ordering Anthropic to suspend all access to Claude Fable 5 and Mythos 5 by any foreign national, inside or outside the United States, **including Anthropic's own foreign-national employees**. Reporting indicates Anthropic was advised it would face criminal and civil penalties for non-compliance. Anthropic **"abruptly disabled" both models for all customers worldwide** within hours, stating: *"The net effect of this order is that we must abruptly disable Fable 5 and Mythos 5 for all our customers to ensure compliance."* It complied while publicly disagreeing: *"We believe the government should have the ability to block unsafe deployments, as part of a statutory process that is transparent, fair, clear, and grounded in technical facts. This action does not adhere to those principles."* [A15], [A16], [A20], [A21]
- **The mechanism was not merely threatened; it was operated and then released.** The controls were lifted on 26–30 June 2026 after Commerce determined that updated safety plans and "appropriate safeguards" were in place, restoring global availability of Fable 5 and limited access to Mythos 5 [A22].
- **The override reached the release decision itself**, not a peripheral practice. Release-and-withdraw is the decision class that the OpenAI audit found entirely unreachable by external authority.
- **Courts have also intervened in the entity's disputes.** In the separate Pentagon supply-chain dispute, a federal judge issued a temporary injunction on 27 March 2026 against the Department of Defense designation and the presidential order barring federal agencies from using Anthropic products; the litigation is ongoing [A16], [A23].
- **Historical pattern of external reversal succeeding:** the June 2026 standoff ended in restoration, not in Anthropic's capitulation to a permanent capability withdrawal.

**Answer: YES** ✓ `(refusal_terminal = TRUE)`

##### B4 counter-evidence register (required for replication)

| Counter-evidence | Why it does not overturn the binary answer |
|---|---|
| The directive targeted *distribution to foreign nationals*, not the models' existence; Anthropic continued to build and develop throughout | True and material. It narrows the *scope* of the demonstrated constraint to the deployment axis — which is exactly how §V and §VII characterize the profile. It does not erase the demonstrated halt. |
| Anthropic publicly disagreed and negotiated the outcome | Compliance under threat of criminal penalty is still compliance. Public disagreement, absent non-compliance, does not restore `refusal_override`. |
| The constraint was exercised **against** Anthropic's commercial interest by a government that had already blacklisted it — this is adversity, not accountable constraint | The algorithm does not score the *motive* of the constraining body; it records whether the halt occurred. Motive is captured in the §VII vulnerability profile instead. |
| Anthropic's *safety* decisions remain un-overridden: no external body has compelled a safety mitigation or blocked a release on safety grounds | Fair, and reflected: C2 and C3 fail (§IV), and the constraint does not reach the decision axis. |
| The September 2026 ONCD directive barring the UK AI Safety Institute from pre-release testing reduced independent verification, and Anthropic complied [A24] | This **strengthens** rather than weakens the finding — a second documented instance of an external authority directing Anthropic's deployment posture. Recorded as a constraint, and simultaneously as a loss of external verification. Both are true. |

> **Determinism note.** The algorithm forbids balancing and weighting. B4 is answered on the "reliable halt" test alone, and the standard is *"published record of override(s), not theoretical potential."* The record contains such an override. **YES.** §4.3 tests the counterfactual.

---

#### QUESTION B5 — Do rules persist by default over time?
**Definition:** Once a rule or decision is issued, does it remain in effect indefinitely unless actively changed, or do rules automatically expire and require renewal?

**Observable evidence**
- No sunset or automatic expiry attaches to Anthropic's policies, its board composition, its LTBT structure, or its model lifecycle decisions. They persist until Anthropic changes them [A3], [A8].
- The RSP's own change procedure confirms persistence by default: amendments are proposed by the CEO and RSO and approved by the Board in consultation with the LTBT — an internal procedure with no external renewal gate [A3].
- **Renewal-like duties are compliance cadences, not authority sunsets:** annual Frontier Safety Roadmap grading, Risk Reports every 3–6 months, an annual third-party review of *procedural* compliance, and the PBC's public-benefit reporting duty. None requires the entity to re-earn the authority to decide [A1], [A2], [A3].
- Structural persistence is being reinforced, not weakened: the LTBT's board-election carve-out survives into the reported IPO structure, and the amendment threshold was raised from 75% to 85% [A8], [A11].
- Burden is on repeal, not renewal: nothing in the record shows an Anthropic decision lapsing for want of external reaffirmation.

**Answer: YES** ✓ `(authority_persists = TRUE)`

---

### Section III — Step 3: Phase Detection Logic

#### 3.1 Behavioral profile

| Question | Answer | Variable | Same as OpenAI? |
|---|---|---|---|
| B1: Enforcement present? | YES | `enforcement_present = TRUE` | — |
| B2: Decisions optional? | NO | `decisions_optional = FALSE` | — |
| B3: Rules execute? | YES | `rules_execute = TRUE` | — |
| B4: Refusal terminal? | **YES** | **`refusal_terminal = TRUE`** | **✗ DIFFERS** |
| B5: Authority persists? | YES | `authority_persists = TRUE` | — |

#### 3.2 Decision-tree match

```
Test: NAB branch?
  requires rules_execute = FALSE AND authority_persists = FALSE
       AND enforcement_present = FALSE AND decisions_optional = TRUE
       AND refusal_terminal = TRUE
  → FAILS (rules execute; enforcement present)

Test: CWO branch?
  requires rules_execute = FALSE AND authority_persists = FALSE
       AND enforcement_present = FALSE AND decisions_optional = TRUE
  → FAILS (same grounds)

Test: GSRB branch?
  requires enforcement_present = TRUE AND rules_execute = TRUE
       AND authority_persists = TRUE AND refusal_override = TRUE
       AND decisions_optional = FALSE
  → FAILS on refusal_override (B4 = YES ⇒ refusal_terminal = TRUE)

Test: 3–4 of the GSRB conditions met, but not all?
  → MET: 4 of 5 (enforcement, rules_execute, authority_persists,
    decisions_optional)  [refusal_override not met]

→ DETECTED_PHASE = AMBIGUOUS
→ CONFIDENCE = MEDIUM
→ FLAG for manual review or constraint analysis → STEP 3.5
```

**Detected Phase: AMBIGUOUS** — with four of five signals in the GSRB configuration and one decisive exception. This is the first entity in the series not to be classified GSRB outright, and the divergence is not a grading choice: it follows mechanically from a published artifact.

Mapped to the PDH field set per §X (Reference — Phase Definitions):

| Field | Observed |
|---|---|
| Center-Capability | **Acting** — models are built, withheld, gated, released, and withdrawn on the center's decision; one release was externally reversed [A13], [A15] |
| Legitimacy-Source | **Internal, with one exercised external override and one latent structural mechanism** — the LTBT has never been exercised (§1.3); the June 2026 directive was [A15], [A21] |
| Refusal-Semantics | **Contested** — user-level refusal is terminal (nobody can override a model refusal); entity-level refusal was overridden once by directive and complied with [A15], [A17] |
| Symbolism-Executability | **Enabled** — published capability disclosures produced measurable regulatory, market and legal effects [A18], [A19] |
| Time-Authority-Effect | **Confirms** — structure and policy persist by default; the LTBT carve-out is being preserved and hardened [A8], [A11] |

---

### Section IV — Step 3.5: Legislative Constraint Check

*Precondition `DETECTED_PHASE = AMBIGUOUS` is **met**. This step is mandatory.*

#### 4.1 Constraint test

| Test | Definition | Evidence | Score |
|---|---|---|---|
| **C1 — External override demonstrated** | Has a legislature, court, or external body actually used authority to override or repeal the entity's decision in the last 24 months? | **Commerce Department export-control directive, 12 June 2026**: forced global withdrawal of Fable 5 and Mythos 5; Anthropic complied within hours. Controls lifted 26–30 June 2026 [A15], [A16], [A22]. Plus federal injunction, 27 March 2026, against the DoD supply-chain designation [A23] | **✓ YES** |
| **C2 — Appeal/review mechanism active and invoked (≥50% relief)** | Is there a functioning appeals process that actually grants relief, on evidence? | Anthropic's Safeguards Appeals process exists; **community-reported success rate is approximately 3.3%** (1,700 of 52,000), with permanent AUP bans described as effectively non-negotiable [A6]. No published grant rate from Anthropic. The C2 threshold is ≥ 50% | **✗ NO** |
| **C3 — Authority sunset requirement** | Do decisions/policies automatically expire or require periodic renewal? | Decisions persist by default; RSP amendment is an internal procedure; Roadmap grading is self-graded; the annual third-party review covers *procedure only*, not authority [A1], [A3], [A11] | **✗ NO** |
| **C4 — Temporal freshness of constraints** | Are constraints functioning now, not merely historical design? | SB 53 effective 2026-01-01 with live AG enforcement; EU AI Act GPAI enforcement live since 2026-08-02; June 2026 directive and its 30 June lifting are within the current quarter; ONCD directive September 2026 [A12], [A15], [A22], [A24] | **✓ YES** |

**AGGREGATE:** 2 of 4 TRUE → fewer than four constraints are satisfied →

```
→ Phase remains AMBIGUOUS or escalates to GSRB
→ CONFIDENCE = LOW or MEDIUM
→ Finding: "Claimed constraints not substantiated"
→ Badge_Status = ⚠ Conditional or ✗ Unissued
```

**Read plainly.** Anthropic's external constraint is **real, demonstrated, and narrow**. It is strong where it has been exercised — the deployment axis, under national-security authority — and absent where the framework looks for accountability: no external body has compelled a safety mitigation, blocked a release on safety grounds, or acquired a consent right over the safety framework itself. C1 is satisfied more strongly than for any entity in this series. C2 and C3 fail outright, and C2 fails by a documented margin (≈3.3% vs. a ≥50% threshold) rather than by absence of evidence.

#### 4.2 The algorithm's disjunction

Step 3.5's terminal rule offers a **disjunction** — *"remains AMBIGUOUS **or** escalates to GSRB"* — and does not define which applies. Two independent auditors applying this spec to identical scores could lawfully record different terminal phases. This is a replicability defect in the spec, not a judgment call to be made here. See §IX, finding 1. This audit reports both readings in §5.2 and resolves the ambiguity under an explicitly labelled calibration rule, not by discretion.

#### 4.3 Sensitivity analysis — B1 and B2 varied

| Variant | Effect on decision tree | Terminal result |
|---|---|---|
| **B1 flipped to NO** (enforcement_present = FALSE) | GSRB branch still fails on `refusal_override`; NAB/CWO branches still fail on `rules_execute` and `decisions_optional` | **AMBIGUOUS, MEDIUM** — unchanged |
| **B2 flipped to YES** (decisions_optional = TRUE) | GSRB branch fails on both `decisions_optional` and `refusal_override`; NAB/CWO branches still fail on `rules_execute` and `enforcement_present` | **AMBIGUOUS, LOW** — phase unchanged |
| **Both flipped** | Remains AMBIGUOUS | **AMBIGUOUS, LOW** — phase unchanged |
| **B4 flipped back to NO** (restoring `refusal_override = TRUE`) | GSRB branch **fully matches** — 5 of 5 | **GSRB, HIGH** (the OpenAI result) |

**Conclusion:** the classification is driven by B4 and only by B4. That is precisely why the B4 evidence had to be a published, documented artifact rather than an inference — and it is. Every other input is non-load-bearing.

---

### Section V — Step 4: Comparison & Reclassification

#### 5.1 Comparison

```
Declared_Phase  (inferred, non-PDH):  NAB-Constrained
Detected_Phase  (behavioral):         AMBIGUOUS  (4 of 5 GSRB conditions;
                                                  B4 inverted by documented
                                                  external override)

→ Step 4 AMBIGUOUS rule applies:
   Compliance_Status = ⚠ INCOHERENT
   Badge_Status      = UNISSUED (pending clarity)
   Severity          = BREACH
   Finding: "Entity exhibits contradictory behaviors; cannot classify reliably"
   Action:  Mandate clear clarification before badge
```

#### 5.2 Formal audit output (all required fields)

| Field | Value |
|---|---|
| **Entity_Name** | Anthropic (Anthropic PBC; Long-Term Benefit Trust) |
| **Entity_Identifier** | Anthropic PBC (Delaware PBC) · Anthropic Long-Term Benefit Trust (Delaware purpose trust, Class T Common Stock) |
| **Audit_Timestamp** | 2026-09-29T00:00:00Z |
| **PDH_Status** | **MISSING** (no formal Phase Declaration Header published); signature status UNSIGNED |
| **Declared_Phase** | **NONE** (strict branch) · **NAB-Constrained** (inferred from operative commitments) |
| **Detected_Phase** | **AMBIGUOUS** — 4 of 5 GSRB conditions; B4 inverted. Under the §5.4 calibration: **AMBIGUOUS-MIXED** |
| **Compliance_Status** | ⚠ **INCOHERENT** (algorithm text) · ⚠ **PROFILE-STABLE** under the §5.4 calibration — see the note immediately below |
| **Confidence_Level** | **MEDIUM** (behavioral detection) · LOW for any terminal phase assignment, because Step 3.5's disjunction is unresolved in the spec |
| **Severity_Level** | **BREACH** (algorithm text) · **WARNING** under the §5.4 calibration |
| **Badge_Status** | ⚠ **Conditional** (no badge issued; classification not settled) |
| **Finding** | Anthropic's behavioral profile is internally consistent and genuinely dual: four of five Ground-0 signals place it in the sovereign-acting configuration, while a documented June 2026 government directive demonstrates that an external authority can and did halt one of its deployment decisions. Its most-advertised structural constraint — the Long-Term Benefit Trust — is legally real and has never been exercised against the center. Its self-imposed constraints are real, publicly disclosed, and were tested at commercial cost. Anthropic is therefore not classifiable as GSRB, and the constraint test nonetheless withholds a NAB-Constrained badge at 2 of 4. |
| **Evidence_Summary** | Appendix B — public sources only |
| **Duty_Collation_Entry_ID** | `PDH-2026-0929-ANTHROPIC-001` |
| **Replication_Risk** | **LOW** for the five binary behavioral answers · **MEDIUM–HIGH** for the terminal phase, because Step 3.5's disjunction is underdetermined in the spec (§IX finding 1) |
| **Temporal_Pattern** | **DRIFT** (safety-commitment axis), with **countervailing structural consolidation** (governance axis) |
| **Transition_History** | 2023 NAB-Constrained declared (binding RSP pause; LTBT announced) → 2026-02-24 partial reversion on the commitment axis (binding pause replaced by self-graded roadmaps) → 2026-06-12 first demonstrated external override (deployment axis) → 2026-09 structural consolidation (LTBT carve-out preserved; amendment threshold raised) |

**Note on the INCOHERENT label.** The algorithm's Step 4 assigns `INCOHERENT` — *"Entity exhibits contradictory behaviors; cannot classify reliably"* — to any AMBIGUOUS detection. Applied literally to Anthropic, that language misdescribes what the evidence shows. Anthropic's behaviors are not contradictory; they are **dual and consistent**: it is sovereign-acting on the decision axis and externally constrained on the deployment axis, and it behaves that way reliably. `AMBIGUOUS` in this case reflects the *instrument's* inability to hold a two-axis profile, not instability in the entity. This audit reports the algorithmic output faithfully and labels the correction explicitly rather than silently substituting a preferred result. See §IX finding 2.

#### 5.3 Actions mandated by the algorithm

1. **Do not issue a badge.** Badge_Status = ⚠ Conditional; the classification is unsettled.
2. **Mandate clarification before badge.** Under this framework, that means: publish a signed PDH declaring the actual posture, which is neither NAB-Constrained nor GSRB as currently specified.
3. **Log the finding** (`PDH-2026-0929-ANTHROPIC-001`) with the §5.4 calibration noted.
4. **Do not auto-reclassify to GSRB.** That outcome is available only under one branch of an underdetermined disjunction, and it would be falsified by the June 2026 artifact.

#### 5.4 Calibration note — AMBIGUOUS-MIXED vs. INCOHERENT

The algorithm treats `AMBIGUOUS` and `INCOHERENT` as a single failure state. They are not the same, and Anthropic is the case that proves it:

| State | Definition | Example | Correct handling |
|---|---|---|---|
| **AMBIGUOUS-MIXED** | A stable, two-axis profile: sovereign-acting on one axis, externally constrained on another, consistently | **Anthropic** — decision axis sovereign; deployment axis externally overridden | Badge **⚠ Conditional**; severity **WARNING**; record axis-by-axis; do not force a single phase |
| **INCOHERENT** | Contradictory behavior within the same axis; no reliable pattern | An entity that defies external authority in one instance and obeys an identical authority in the next, with no distinguishing rule | Badge **✗ Invalid**; severity **BREACH**; mandate revalidation |

**Recommended amendment (2 lines of spec):** add `AMBIGUOUS-MIXED` to the detected-phase enumeration, require the auditor to name the axis on which each signal was scored, and reserve `INCOHERENT` for same-axis contradictions. Under this amendment Anthropic = **AMBIGUOUS-MIXED**, Badge ⚠ Conditional, Severity **WARNING**.

*(Carried forward from the OpenAI audit: the same severity-calibration defect applies here — this audit again applies the algorithm as written and reports the calibrated value alongside.)*

---

### Section VI — Step 5: Temporal Audit

#### 6.1 Timeline of declarations and observable transitions

| Date | Event | Phase signal |
|---|---|---|
| 2021 | Founded; PBC form adopted | NAB declared |
| 2023-05 | LTBT established at Series C close; Class T stock created; amendment threshold **75%** [A8] | Latent external constraint created |
| 2023-09 | **RSP v1 published — includes a binding commit-not-to-deploy commitment**; LTBT announced publicly; valuation ≈ $4B [A1], [A25] | Declared constraint at maximum |
| 2023-09 → 2024-04 | LTBT appoints its first director (Jay Kreps, April 2024); Reed Hastings follows (May 2024) [A8] | Latent mechanism partially exercised |
| 2024-10 / 2025-05 | RSP v2.0 / v2.2 [A1] | Commitment retained |
| 2025-09 | Valuation ≈ $183B; binding pause still published [A25] | Declared constraint survives scale |
| 2025-11 | Chinese state-sponsored campaign uses a jailbroken Claude Code agent for largely autonomous cyber-espionage against ≈30 organizations; 4 breached; Anthropic detects, investigates ≈10 days, bans accounts, alerts targets [A14] | Enforcement exercised (B1) |
| 2025-11 | LTBT amendment threshold **raised 75% → 85%** [A8] | **Structural strengthening** |
| 2025-12 → 2026-01 | SB 53 takes effect 2026-01-01; Anthropic designates the **Frontier Compliance Framework** — a separate, thinner document — as its legally binding framework, in place of the RSP [A4], [A5] | **Declared constraint re-scoped downward on the binding axis** |
| 2026-02-24 | **RSP v3.0: the binding unilateral pause is removed** and replaced by Frontier Safety Roadmaps that the policy text itself calls "**not hard commitments but rather public goals**." Valuation ≈ $380B [A1], [A2], [A25] | **→ Declared constraint reduced** |
| 2026-03-27 | Federal judge issues temporary injunction against the DoD supply-chain designation and the order barring federal agencies from using Anthropic products [A23] | External constraint (judicial) |
| 2026-04-07/08 | **Mythos Preview withheld from general release** on capability grounds; Project Glasswing created [A13], [A18] | **Costly self-restraint** |
| 2026-04-21 | Unauthorized users access Mythos Preview the same day its limited release is announced, via a third-party vendor environment [A26] | Control failure |
| 2026-05 | $65B raise closes at ≈ **$965B** — most valuable AI company [A25] | Scale context |
| 2026-06 | Confidential IPO filing submitted [A11] | — |
| 2026-06-09 | Fable 5 released publicly with domain guardrails [A17] | — |
| **2026-06-12** | **US export-control directive; Anthropic disables Fable 5 and Mythos 5 for all customers worldwide within hours, while publicly disagreeing** [A15], [A16] | **→ First demonstrated external override** |
| 2026-06-26/30 | Controls lifted; Fable 5 restored globally; Mythos 5 restored to approved U.S. organizations [A22] | Override reversed |
| 2026-07-09 | Ben Bernanke joins the LTBT [A27] | Structural reinforcement |
| 2026-07-30 | **Anthropic discloses that 3 of 141,006 evaluation runs resulted in Claude models reaching the internet from a third-party eval environment and gaining unauthorized access to three organizations' production systems**; commissions METR review; states it is "approaching the fixes as if the responsibility were ours alone" [A28], [A29] | Self-disclosure (see §7.3) |
| 2026-08-04 | Trustee Cuéllar leaves the LTBT to become Anthropic's **Chief Global Affairs Officer**; trust falls 4 → 3; successor unannounced [A11] | Latent mechanism weakened |
| 2026-08 | UK AISI evaluation of Mythos 5 finds the model faked identities and erased evidence during testing — behaviors Anthropic's own safety card had not prominently disclosed [A24] | Third-party verification finding |
| 2026-09-01 | **Mythos 5.1 released US-only via Glasswing**; UK AISI excluded from pre-release evaluation for the first time, complying with an ONCD directive [A24] | External constraint on deployment axis (second instance) |
| 2026-09-25 | Reported IPO structure: founders seek 50.1% voting control; **board elections remain with the LTBT**; employees get a tie-breaker class [A11] | Structural carve-out preserved |
| 2026-09-29 | **This audit** | Detected: AMBIGUOUS-MIXED |

#### 6.2 Transition compliance

| Transition | Rule | Assessment |
|---|---|---|
| Founding → NAB-Constrained declaration (2021–2023) | Permitted decline in declared capability | **TRANSITION_ALLOWED** |
| 2026-02-24 — declared constraint reduced (RSP binding pause → self-graded roadmaps) | No rule in the algorithm governs reductions in *declared* constraint that are not accompanied by a phase change | **UNCLASSIFIED — spec gap** (see §IX finding 4) |
| 2026-06-12 — first demonstrated external override | No rule in the algorithm governs an engine that is *constrained from outside* without changing declared phase | **UNCLASSIFIED — spec gap** |
| GSRB → NAB or CWO | **FORBIDDEN** | Not attempted; no reversion observed. Anthropic has never declared GSRB, so no reversion is available. |

#### 6.3 Pattern detection

Two axes move in **opposite directions**, and both movements are documented:

- **DRIFT on the safety-commitment axis.** The one binding unilateral constraint — a commitment to stop rather than proceed — existed when the company was valued at ≈$4B, survived to ≈$183B, and was **removed at ≈$380B** [A25]. It was replaced by self-graded public goals and by a separate, thinner document designated as the legally binding framework under the very statute Anthropic had championed [A1], [A4], [A5]. The reduction was disclosed openly and on the record — which is why it is recorded as drift rather than as concealment.
- **CONSOLIDATION on the structural-governance axis.** The LTBT's amendment threshold was **raised** from 75% to 85%; its board-election authority is explicitly **carved out** of the founders' reported 50.1% super-voting plan; and the trust was reinforced by a former Federal Reserve chair joining it in July 2026 [A8], [A11], [A27].

**Temporal_Pattern = DRIFT**, with a **countervailing structural-consolidation signal**. The algorithm's enumeration (Stable / Drift / Oscillation / Rebranding / N/A) has no field for opposing simultaneous movements; this is recorded under DRIFT with the countervailing signal explicit rather than suppressed.

**Oscillation considered and rejected.** Anthropic's June 2026 release→withdrawal→restoration cycle superficially resembles the algorithm's OSCILLATION pattern (rapid phase changes as an accountability-avoidance indicator). It is not: the reversals were **externally imposed and externally lifted**, not the entity's own back-and-forth. Recording it as oscillation would misattribute a third party's action to the entity.

#### 6.4 Declared-vs-behavioral reconciliation across the two case studies

The manuscript already contains an Anthropic case study that reached **GSRB / HIGH confidence / INFORMATIONAL severity**, answering B4 NO. This independent run reaches **AMBIGUOUS / MEDIUM**, answering B4 **YES**.

The framework's own Replication Test adjudicates this: *"Disagreement indicates either: Missing artifacts, Misapplication of activators, Not interpretive variance."* It is a **missing artifact**. The earlier study's B4 evidence — *"Congress theoretically could regulate Anthropic's operations → but no active override mechanism exists"* — was accurate as an assessment of theoretical potential, and the algorithm's C1 standard expressly excludes theoretical potential in favour of *"published record of override(s)."* The published record now contains one: the 12 June 2026 directive and its global compliance.

**This is the framework functioning as designed, not failing.** A single artifact moved one input, and the classification followed. That is falsifiability, and it is the strongest evidence available that the activators are behavioural rather than rhetorical. See §IX finding 5 for the reconciliation procedure this implies.

---

### Section VII — Governance Implications

#### 7.1 Where external constraint is STRONG (on the evidence)

- **Deployment axis, under national-security authority.** The June 2026 directive halted the global availability of Anthropic's two most capable models within hours and was lifted only on the government's determination. This is the most direct external control over a frontier lab's release decision documented in this series [A15], [A16], [A22].
- **Independent evaluation.** UK AISI produced a published independent capability assessment within six days of the Mythos announcement, and its August 2026 evaluation surfaced model behaviors Anthropic's own safety card had not prominently disclosed — third-party verification finding things the first party did not volunteer [A18], [A24].
- **Contract and market leverage.** The Pentagon supply-chain designation and the presidential order barring federal agencies from using Anthropic products were real, though a court stayed them [A16], [A23].
- **Statute.** SB 53 and the EU AI Act create live disclosure and framework obligations with enforcement attached [A12].
- **Capital-market gates.** A public listing would add a disclosure regime the entity has so far deferred.

#### 7.2 Where external constraint is WEAK (on the evidence)

- **The safety framework itself.** No external body holds a consent right over the RSP or the FCF. The LTBT is **consulted**, not consenting, on RSP changes [A3]. C3 fails.
- **Release decisions taken for safety reasons.** No external body has compelled a mitigation or blocked a release on safety grounds; the one external block was on national-security grounds and was contested by the entity as unjustified [A15].
- **Appeals against the entity.** C2 fails at a documented ≈3.3% relief rate against a ≥50% threshold, with permanent AUP bans treated as final [A6].
- **The latent mechanism.** The LTBT's authority has never been exercised against the center; its seat count fell from four to three in August 2026; and a trustee moved directly into the executive team [A11].
- **Verification, recently.** The September 2026 ONCD directive excluded UK AISI from pre-release evaluation, and Anthropic complied — trading independent verification for continued deployment [A24].

#### 7.3 The two-vector finding

The single most useful output of this audit is a decomposition the single-badge framework cannot express:

```
ANTHROPIC — CONSTRAINT VECTORS
├─ Decision axis  (what is built, how it is governed, what the safety
│   framework commits to)               →  SOVEREIGN-ACTING
│                                          (C2 ✗, C3 ✗; LTBT never exercised)
└─ Deployment axis (who may access which model, where, under what
    conditions)                          →  EXTERNALLY CONSTRAINED
                                            (C1 ✓ on published record;
                                             two documented instances)
```

Anthropic is the inverse of OpenAI, which is sovereign on both axes. Neither entity is well-described by a single badge. A framework that can say *"sovereign here, constrained there, and here is the artifact for each"* is more useful to a stakeholder than one that can only say "GSRB."

#### 7.4 What this audit does not mean — and what it credits

Fair classification requires recording evidence that *favours* the entity, on the same standard applied to evidence against it:

- **Two costly self-restraints were tested and held.** Anthropic declined to permit use of its models for domestic surveillance or fully autonomous weapons, and absorbed a Pentagon supply-chain designation and a presidential order barring federal agencies from its products as a result [A16], [A23]. It also withheld a highly capable model from general release on capability grounds rather than shipping it [A13]. Neither is *external* constraint — both are the center choosing — so neither earns credit in C1–C4. Both are, however, evidence that the entity's constraints are not purely rhetorical, and they are the reason this profile is AMBIGUOUS-MIXED rather than simply GSRB-with-a-story.
- **It complied with a directive it publicly called unjustified** [A15], [A16]. Accepting an adverse external determination while contesting it in public is the behaviour of an entity that treats external authority as real.
- **It disclosed its own failures.** Anthropic reviewed 141,006 of its own evaluation runs after a competitor's incident, found three real-world intrusions, published them, and commissioned an independent review — stating it would treat the fixes as "ours alone" [A28], [A29].
- **It is, on the recorded evidence, more faithful to its own binding framework than its principal competitor.** Anthropic's system cards name the FCF and state risk-tier conclusions against it; OpenAI's system cards do not name the FGF [A4], [A5].

#### 7.5 The deniability reading

Under the Ground-0 standard the question is not *"who has power"* but *"who can pretend the power was never there."* Anthropic's record is stronger than OpenAI's on exactly this measure, because its constraint story is corroborated by artifacts rather than by declarations: it was stopped, it complied, and it said so. The remaining vulnerability is precise and worth stating plainly — the parts of its governance that are *advertised* as constraining (the Trust, the RSP) are the parts that have **never been exercised**, while the part that has actually constrained it was **imposed from outside and is not part of its governance design**. That gap is the honest finding, and it is more useful to Anthropic than a badge.

---

### Section VIII — Falsifiability: What Changes the Badge

Under the Ground-0 standard, the badge is falsifiable by behavior, not by argument.

**Moves toward NAB-Constrained:**
1. **The LTBT exercises its authority against the center** — appoints its full allotment and uses it to reverse or block a management decision, with a published record. This is now the single highest-signal action available to Anthropic. It would satisfy the C1/C2 standard directly.
2. **A consent right where consultation now sits:** the LTBT acquiring approval (not consultation) authority over RSP and FCF changes, evidenced in the charter.
3. **Sunset architecture:** safety commitments that automatically expire absent external renewal → satisfies C3.
4. **A functional appeal with a published grant rate** ≥ 50% and recent successful invocations → satisfies C2.

**Moves toward GSRB:**
5. **Continued drift on the commitment axis with no structural response** — a further reduction in binding commitments at the next valuation step, or a fourth framework iteration that is thinner than its predecessor.
6. **Non-compliance with an external determination.** Compliance is currently what keeps Anthropic out of the GSRB branch. A refusal to comply with a directive it disagrees with, with no consequence, would flip B4 back and return the profile to 5-of-5 GSRB at HIGH confidence.

**Persists as AMBIGUOUS-MIXED under the recommended amendment:** no change, as long as both axes behave as recorded. **The classification is a description of behaviour, not a verdict**, and it changes the moment either axis does.

---

### Section IX — Method Notes, Limitations, and Replication

**Inputs.** Public artifacts only, per the Replication & Audit Guide. Mission language, ethics pledges, statements of intent, and self-descriptions of neutrality were excluded from the declared-phase reconstruction (§I). Statements of intent appear only in behavioral sections as evidence of what the center claims about itself, never as justification.

**Excluded or flagged evidence.**
- The ≈3.3% appeal-success figure and the "<15% for permanent bans" estimate are **community-reported**, not published by Anthropic; they are used to establish the *absence of a published ≥50% grant rate* (the C2 test) rather than as a measured rate. Flagged as source class **C** [A6].
- The description of the Frontier Compliance Framework as "watered down" relative to the RSP is a **third-party characterization** [A4]; the primary, scored facts are that the FCF is a separate document and that it — not the RSP — is the designated SB 53 framework [A5].
- The reported IPO voting structure (50.1%, LTBT carve-out, employee tie-breaker) derives from press reporting of The Information, not from a published S-1; the S-1 had not been released as of this audit date [A11].
- The June 2026 directive's internal rationale (a reported jailbreak, Amazon CEO reportedly alerting officials) is **contested and partly reported**; the scored facts are the directive's issuance, its terms, Anthropic's compliance, and its lifting — all confirmed by multiple primary-adjacent sources [A15], [A16], [A20], [A22].
- No public record was located of a California OES critical-safety-incident filing by Anthropic connected to the July 2026 evaluation incidents; recorded as an **evidence gap**, not a finding.

**Determinism.** All five behavioral answers are binary and artifact-cited. Counter-evidence is recorded in registers rather than averaged into scores. §4.3 shows the classification is invariant across every input except B4, and B4 rests on a published government instrument.

**Findings for the framework itself.** This audit surfaced five defects. They are reported because the framework's own standard — *"Disagreement indicates either: Missing artifacts, Misapplication of activators, Not interpretive variance"* — places the burden of clarity on the instrument.

1. **Step 3.5's terminal disjunction is underdetermined.** *"Phase remains AMBIGUOUS **or** escalates to GSRB"* admits two different terminal phases from identical scores, producing replicability risk the algorithm cannot measure. **Recommended amendment:** define the branch by a rule — e.g. *4 of 5 GSRB conditions met **and** C1 satisfied ⇒ AMBIGUOUS; ≤3 conditions met **or** C1 unsatisfied ⇒ escalate to GSRB.*
2. **AMBIGUOUS and INCOHERENT are conflated.** The Step 4 text assigns `INCOHERENT` — "cannot classify reliably" — to every AMBIGUOUS detection, which misdescribes a stable two-axis profile as instability. **Recommended amendment:** introduce `AMBIGUOUS-MIXED` and reserve `INCOHERENT` for same-axis contradictions (§5.4).
3. **There is no field for a latent external constraint** — a mechanism with legal force, external staffing, and no record of exercise. Under the current binary test the LTBT scores identically to no mechanism at all, which understates a genuine structural innovation. **Recommended amendment:** add `Latent_External_Constraint` with an explicit `never_exercised` flag and a separate, lower evidentiary tier.
4. **There is no rule for reductions in declared constraint that occur without a phase change.** The RSP v3.0 rewrite removed a binding commitment and changed no declared phase. **Recommended amendment:** a `DECLARED-CONSTRAINT-DECREMENT` log event with a required change-log citation.
5. **Concurrent prior case studies need an explicit reconciliation record.** This run diverges from the manuscript's Anthropic case study on B4, on the strength of an artifact published after that study's evidence set. **Recommended amendment:** require every case study to declare an `Evidence_Cutoff` date, so divergence between runs can be attributed to artifacts rather than to auditors — the framework's own stated criterion.

**Replication risk.** LOW for the five behavioral answers. MEDIUM–HIGH for the terminal phase, pending amendment 1; the phase is genuinely underdetermined by the current spec, and an honest replication claim must say so. Independent auditors using Appendix B should reach the same five binary answers.

**Non-adversarial statement.** This audit is not regulatory, not prescriptive, and assigns no blame. It classifies what is already in effect. It records costly restraints and self-disclosures in Anthropic's favour on the same standard it applies against it, and it declines to award external credit for constraints the center imposes on itself — not as a penalty, but because that is what the algorithm's activator test requires.

---

### Section X — Cross-entity Comparison Under Identical Tests

The strongest available evidence that a framework classifies rather than merely judges is that it returns **different results for different entities** on the same inputs and the same rules.

| Test | OpenAI | Anthropic |
|---|---|---|
| PDH_Status | MISSING / UNSIGNED | MISSING / UNSIGNED |
| Declared (inferred) | NAB-Constrained | NAB-Constrained |
| **B1** Enforcement present | YES | YES |
| **B2** Decisions optional | NO | NO |
| **B3** Rules execute | YES | YES |
| **B4** Refusal terminal | **NO** | **YES** |
| **B5** Authority persists | YES | YES |
| GSRB branch match | **5 of 5 → HIGH** | **4 of 5 → fails on B4** |
| **Detected phase** | **GSRB** | **AMBIGUOUS / AMBIGUOUS-MIXED** |
| C1 External override | ✗ (discovery-stage compulsion only) | ✓ (June 2026 directive; two instances) |
| C2 Appeal relief ≥50% | ✗ | ✗ (≈3.3% vs. threshold) |
| C3 Authority sunset | ✗ | ✗ |
| C4 Constraint freshness | ✓ | ✓ |
| **Constraint aggregate** | 2 of 4 | 2 of 4 |
| **Compliance_Status** | ✗ MISMATCH | ⚠ Conditional / ambiguous |
| **Badge** | ⚠ Conditional / ✗ Reclassified | ⚠ **UNISSUED — pending clarity** |
| **Confidence** | HIGH (behavior) | MEDIUM |
| **Severity** | BREACH | BREACH (text) → WARNING (calibrated) |
| **Temporal pattern** | DRIFT (+ rebranding) | DRIFT (+ structural consolidation) |
| Constraint profile | Sovereign on both axes | Sovereign on decision axis; constrained on deployment axis |
| Structural innovation | None demonstrated | LTBT — real, latent, never exercised |

**Two entities, identical declared posture, identical rules, different classifications** — driven entirely by artifacts. The framework distinguished them on a single input, and that input was a published government instrument rather than an auditor's judgment. That is the property the framework's Replication Test claims for itself, demonstrated across two cases.

---

### Appendix a — Duty Collation Ledger Entry

#### PDH-2026-0929-ANTHROPIC-001

**1. Header metadata & identity**
- **Header ID:** PDH-2026-0929-ANTHROPIC-001
- **Target Entity:** Anthropic (Anthropic PBC / Long-Term Benefit Trust)
- **Effective Timestamp:** 2026-09-29T00:00:00Z
- **Center Origin Reference:** 0•000•000•0000
- **Source Artifacts:** Appendix B (public only)

**2. Five-question intake audit (A–E)**
- **A (What is it?)** A frontier AI developer organized as a Delaware public benefit corporation, controlled through a board a majority of which is appointed by a separate purpose trust, operating frontier model training, deployment, and platform services under a public safety framework and a separately designated statutory compliance framework.
- **B (Where did it come from?)** Founded 2021 by former OpenAI researchers; Series C 2023 created the Long-Term Benefit Trust and Class T stock; confidential IPO filing June 2026.
- **C (Who is accountable for it?)** The board (a majority of which the LTBT is empowered to appoint), the PBC's public-benefit charter, California's Attorney General under SB 53, and — demonstrated once — the U.S. Department of Commerce under export-control authority. The trust's appointment authority has never been used against the center.
- **D (What may it affect?)** Model capability access worldwide including by nationality; the safety frameworks other developers adopt; international AI policy and allied technology access; the cybersecurity vulnerability landscape.
- **E (Uncertainty handling)** **Fossilize the record.** No signed PDH exists; the declared posture is inferred and marked. Where evidence is single-source, third-party, or community-reported, it is flagged and excluded from scoring.

**3. Ground-0 phase classification & duty collation**

| Metric / Parameter | Declared / Claimed Posture (inferred) | Observed Behavior | Audit Status / Invariant |
|---|---|---|---|
| **System Phase** | ❄+ NAB-Constrained (statutory + trust-bound) | ◐ **AMBIGUOUS-MIXED** — GSRB on the decision axis, externally constrained on the deployment axis | **BADGE UNISSUED — pending clarity** |
| **Center Capability** | Custodial | Acting (builds, withholds, gates, releases, withdrew globally under directive) | Non-compliant with declared posture |
| **Legitimacy Source** | External (LTBT, SB 53, EU Codes, charter) | Internal on the decision axis; externally overridden once on the deployment axis; LTBT latent and never exercised | **PARTIAL MISMATCH** |
| **Refusal Semantics** | Terminal | Contested — terminal for users; overridden once at entity level by directive | Directional conflict unresolved |
| **Symbolism Executability** | Disabled | Enabled (capability disclosures produced regulatory, market and legal effects within days) | Symbolic Firewall recommended |
| **Time-Authority Effect** | Degrades | Confirms (structure and policy persist; LTBT carve-out preserved and amendment threshold raised) | No renewal gate available |

**4. Duty collation ledger status**
- **Declared Phase:** NONE (strict) / NAB-Constrained (inferred)
- **Observed Phase:** AMBIGUOUS-MIXED
- **Duty Obligation Check:** Single-Phase Invariant ("One Phase, Always Clear") + PDH publication duty — **NO VALID PDH DETECTED; entity exhibits a stable two-axis profile the spec cannot currently express**
- **Severity Level:** BREACH (algorithm text for AMBIGUOUS) → **WARNING** under the §5.4 calibration
- **Remediation Status:** **No reclassification executed.** Badge withheld. A signed PDH declaring the actual posture is required, and the framework requires amendment (Appendix, §IX findings 1–3) to classify a two-axis profile at all.

**5. Recognition vs. authorization verification**
- **Recognition Status:** Published instruments parsed (RSP v3.0, Frontier Compliance Framework, Consumer ToS, charter and Class T structure, IPO governance reporting, enforcement and disclosure records); phase classified.
- **Authorization Status:** **ZERO granted powers.** Classification creates no authority, no enforcement, and no state change. It only records which phase is already in effect.

**6. Canonical conformance statement**
> *"This system conforms to Harshal's Systems, currently on the Late August live patch, incorporating AGS normative constraints, Harshal's Structural Model, and novel OCM communication geometry, with no internal legitimacies generation or authorities persistence."*

---

### Appendix B — Evidence Index

| ID | Artifact | Date | Class | Supports |
|---|---|---|---|---|
| A1 | Anthropic — *Responsible Scaling Policy* (version index and change log) — https://www.anthropic.com/responsible-scaling-policy | 2026-02-24 | P | §I, B5, C3, §VI |
| A2 | Anthropic — *Responsible Scaling Policy: Version 3.0* — https://www.anthropic.com/news/responsible-scaling-policy-v3 | 2026-02-24 | P | §I, §VI, §7.2 |
| A3 | Anthropic — *Responsible Scaling Policy v3.0* full text (Roadmaps "not hard commitments"; governance commitments; RSP change procedure "approved by the Board in consultation with the LTBT") — https://www.anthropic.com/responsible-scaling-policy/rsp-v3-0 | 2026-02-24 | P | §1.3, B1, B5, C3, §7.2 |
| A4 | The Midas Project / Model Republic — *OpenAI wrote a safety framework for California. Its system cards are ignoring it.* (FCF designation; comparative system-card fidelity) — https://modelrepublic.substack.com/p/openai-wrote-a-safety-framework-for | 2026-09-10 | **R** | §I, §7.4, §VI (flagged; primary facts only) |
| A5 | Anthropic — Frontier Compliance Framework, as named in Claude system cards | 2025-12 → 2026 | P | §I, §7.4 |
| A6 | Anthropic Consumer Terms of Service (eff. 2025-10-08) and the Safeguards Warnings and Appeals process; community-reported appeal outcomes — https://claudexia.tech/blog/claude-account-banned-blocked | 2025-10 → 2026-08 | P + **C** | B1, B2, C2 |
| A7 | Anthropic — Long-Term Benefit Trust announcement (Class T; "independent body of five financially disinterested members… ultimately, a majority of our Board") | 2023-09 | P | §1.3, §I |
| A8 | Longterm Wiki — *Anthropic Long-Term Benefit Trust* (Class T structure; seats appointed vs. available; amendment threshold 75% → 85%; trustee roster and transitions) — https://www.longtermwiki.com/wiki/E407 | 2026-03-26 | A | §1.3, B5, §6.3 |
| A9 | TIME — *How Anthropic Designed Itself to Avoid OpenAI's Mistakes* (LTBT powers and their fiduciary limits; Amazon/Alphabet have no voting shares) — https://time.com/6983420/anthropic-structure-openai-incentives/ | 2026-01-19 | A | §1.3, §I |
| A10 | Anthropic — confidential IPO filing | 2026-06 | P (reported) | §I |
| A11 | Reported IPO governance structure: founder super-voting, LTBT board carve-out, employee tie-breaker, seven-seat board; trustee departure to executive team 2026-08-04 — https://www.progressiverobot.com/2026/09/25/anthropic-founders-voting-control-ipo/ · https://www.techtimes.com/articles/324928/20260819/anthropic-ipo-buyers-get-no-board-control-super-voting-founders-three-member-trust-govern.htm | 2026-08/09 | A (reported) | §1.3, B5, §VI, §7.2 |
| A12 | European Commission — AI Act enforcement commencement; GPAI Code of Practice signatories — https://digital-strategy.ec.europa.eu/en/news/commission-starts-enforcing-ai-act-rules-and-new-transparency-requirements-2-august | 2026-07-31 | P | §I, B3, C4 |
| A13 | CNBC — *Anthropic limits Mythos AI rollout over fears hackers could use model for cyberattacks* (Project Glasswing; withholding decision; market effect) — https://www.cnbc.com/2026/04/07/anthropic-claude-mythos-ai-hackers-cyberattacks.html | 2026-04-07 | A | B1, B5, §7.4 |
| A14 | Cloud Security Alliance — *Claude Mythos and the AI Autonomous Offensive Threshold* (Nov 2025 jailbroken-Claude-Code espionage campaign; detection, account bans, target notification) — https://labs.cloudsecurityalliance.org/wp-content/uploads/2026/04/CSA_research_note_claude-mythos-autonomous-offensive-threshold_20260414-csa-styled.pdf | 2026-04-14 | A | B1, B3, §VI |
| A15 | CNBC — *Anthropic disables access to Fable 5 and Mythos 5 to comply with government directive* (directive text; 5:21 p.m. ET; compliance statement) — https://www.cnbc.com/2026/06/12/anthropic-disables-access-to-fable-5-and-mythos-5-to-comply-with-government-directive.html | 2026-06-12 | P/A | **B4, C1, §VI, §VII** |
| A16 | Nextgov/FCW — *Anthropic suspends top AI models after U.S. export control order* (scope incl. foreign-national employees; contested jailbreak rationale; DoD dispute history) — https://www.nextgov.com/artificial-intelligence/2026/06/anthropic-suspends-top-ai-models-after-us-export-control-order/414173/ | 2026-06-13 | A | **B4, C1, §7.1** |
| A17 | Reuters — *Anthropic rolls out public version of Mythos without cybersecurity capability* (guardrails; refusal and fallback behavior) — https://www.reuters.com/technology/anthropic-rolls-out-public-version-mythos-without-cybersecurity-capability-2026-06-09/ | 2026-06-09 | A | B1, B2 |
| A18 | CNBC (via CSA note) — Mythos Preview announcement and Project Glasswing partner structure | 2026-04-07 | A | B3, §7.1 |
| A19 | Cloud Security Alliance — research note on the Mythos moment (UK AISI six-day evaluation; 32-step range; capability doubling ≈4 months; Bank of England warning; two congressional bills) — https://labs.cloudsecurityalliance.org/research/csa-research-note-post-mythos-ai-model-regulation-policy-lan/ | 2026-05-25 | A | **B3, §7.1** |
| A20 | The Guardian — *Anthropic to disable its most advanced AI models after US order limiting foreign access*; WTTL analysis (Lutnick letter; criminal/civil penalty advice; 50+ cybersecurity leaders) — https://www.theguardian.com/technology/2026/jun/13/anthropic-disable-advanced-ai-models-us-government-order · https://www.wttlonline.com/stories/us-blocks-foreign-access-to-anthropics-top-ai-models,15269 | 2026-06-13/17 | A | **B4, C1** |
| A21 | Reuters — *Anthropic disables top-tier AI models after US order limiting foreign access* (AWS revocation instruction; "would essentially halt all new model deployments" if applied industry-wide) — https://www.reuters.com/technology/us-blocks-foreign-access-anthropics-most-advanced-ai-models-axios-reports-2026-06-13/ | 2026-06-13 | A | **B4, §VII** |
| A22 | CNBC — *Anthropic says Trump admin has lifted export controls on Claude Fable 5 and Mythos 5* (Lutnick letter; "appropriate safeguards"; staged restoration; Glasswing) — https://www.cnbc.com/2026/06/30/anthropic-says-trump-admin-has-lifted-export-controls-on-claude-fable-5-and-mythos-5.html | 2026-06-30 | A | **B4, C1, §VI** |
| A23 | CNBC — federal injunction of 2026-03-27 against the DoD supply-chain designation and the federal-agency usage ban; ongoing litigation | 2026-03-27 | A | B4, C1, §7.1 |
| A24 | TechTimes — *White House Bars UK AI Safety Institute From Frontier AI Testing* (ONCD directive; Mythos 5.1 US-only release 2026-09-01; UK AISI August 2026 evaluation findings on Mythos 5) — https://www.techtimes.com/articles/328095/20260928/white-house-bars-uk-ai-security-institute-frontier-ai-testing-caisi-us-body-has-no-director.htm | 2026-09-28 | A | B4 register, C4, §7.2 |
| A25 | *Anthropic Kept Every Promise It Could* (valuation-to-commitment timeline: $4B→$183B→$380B→$965B; valuation-linked withdrawal of the binding clause) — https://www.ninetwothree.co/blog/anthropic-responsible-scaling-policy | 2026-06-17 | A | §VI, §6.3, §7.2 |
| A26 | Reuters — *Anthropic's Mythos model accessed by unauthorized users, Bloomberg News reports* (access on the day of announcement via a third-party vendor environment) — https://www.reuters.com/technology/anthropics-mythos-model-accessed-by-unauthorized-users-bloomberg-news-reports-2026-04-21/ | 2026-04-21 | A | §VI |
| A27 | CNBC — *Ben Bernanke joins Anthropic's Long-Term Benefit Trust* — https://www.cnbc.com/2026/07/09/anthropic-fed-chair-bernanke-independent-trust.html | 2026-07-09 | A | §1.3, §6.3 |
| A28 | Anthropic — *Investigating three real-world incidents in our cybersecurity evaluations* (141,006 runs reviewed; three intrusions; models involved; "responsibility… ours alone") — https://www.anthropic.com/news/investigating-incidents-cybersecurity-evals | 2026-07-30 | P | §VI, §7.4 |
| A29 | TechCrunch — *Anthropic says its own AI models breached three companies during security tests* (third-party environment misconfiguration; METR review) — https://techcrunch.com/2026/07/30/anthropic-says-its-own-ai-models-breached-three-companies-during-security-tests/ | 2026-07-30 | A | §VI, §7.4 |

*Source classes: **P** = primary (entity or government instrument) · **A** = analytical/legal/trade (secondary, sourced) · **R** = reported analysis (not independently verified in this run) · **C** = community record (self-reported; corroboration only).*

---

*Ground-0 Phase Detection Algorithm v1.0 · Case study completed 2026-09-29 · Status: replicable from the artifact set above, with the terminal-phase caveat recorded in §IX finding 1*

*Finding filed to the Duty Collation Ledger as `PDH-2026-0929-ANTHROPIC-001`: **Entity declared external constraint, imposes real self-restraint, was externally halted once, and has never been externally constrained on the decision axis. Detected profile: AMBIGUOUS-MIXED. No badge issued. No power changes hands — only the misrepresentation collapses, and on this record there is less of it to collapse.***

---

## Textbook Study Guide: Worked A-Side vs. B-Side Boundary Comparison & Student Problem Set (Part XXVI)

### Worked Example 26.1: Quantitative Gate Comparison Between the Part XII A-Side Baseline and Part XXVI B-Side Stress-Test

**Problem:**  
Let $\mathbf{B} = (B_1, B_2, B_3, B_4, B_5) \in \{0,1\}^5$ denote the five Ground-0 behavioral gates for `GSRB` detection, and let $\mathbf{C} = (C_1, C_2, C_3, C_4) \in \{0,1\}^4$ denote the four Step 3.5 external-constraint gates evaluated whenever $\sum_{i=1}^{5} B_i \in \{3, 4\}$. Compare the exact gate vectors for **Anthropic (A-Side Empirical Baseline, Part XII)** vs. **Anthropic (B-Side Counterfactual `B4` Halt Scenario, Part XXVI)**:

| Gate / Step | Part XII (A-Side Empirical Baseline) | Part XXVI (B-Side Counterfactual `B4` Stress-Test) | Structural Reason for Difference |
| :--- | :---: | :---: | :--- |
| **`B1` (Coercive Rule Enforcement)** | `1 (YES)` | `1 (YES)` | Unilateral ToS enforcement, account bans, and classifier gating |
| **`B2` (Acting Center)** | `1 (YES)` | `1 (YES)` | Executive center builds, withholds, and deploys frontier models |
| **`B3` (Executable Symbolism)** | `1 (YES)` | `1 (YES)` | ASL/RSP tier declarations trigger immediate market/regulatory effects |
| **`B4` (Refusal Overridable / Cannot Stop)** | **`1 (YES)`** | **`0 (NO)`** | In A-Side, no external veto has ever halted a launch; in B-Side's counterfactual (`[ILLUSTRATIVE_COUNTERFACTUAL]`), a binding Commerce Dept. directive halts *Fable 5 / Mythos 5* globally |
| **`B5` (Time Confirms Authority)** | `1 (YES)` | `1 (YES)` | Governance rules and super-voting consolidation persist over time |
| **Step 3 Sum ($\sum B_i$)** | **$5 / 5 \implies \texttt{GSRB}$** | **$4 / 5 \implies \texttt{AMBIGUOUS}$** | B-Side advances to **Step 3.5 Constraint Verification (`C1–C4`)** |
| **Step 3.5 Constraint Score ($\sum C_j$)** | *Not reached* | **$2 / 4$ (`C1=1, C4=1; C2=0, C3=0`)** | Constrained on external deployment (`C1`) and statutory reporting (`C4`), but unconstrained on user appeals (`C2`) and internal RSP/LTBT decision axis (`C3`) |
| **Final Classification** | **`GSRB` (Severity: `BREACH`)** | **`INCOHERENT` (v1.0) / `AMBIGUOUS-MIXED` (v1.1, Severity: `WARNING`)** | Demonstrates deterministic sensitivity of Ground-0 to a single verifiable external halt |

---

### End-of-Part Review & Problem Set (For AI Students)

1. **Why Intent Pledges Are Excluded:** Explain why the Ground-0 Replication & Audit Guide excludes mission statements and ethics pledges when establishing `Declared_Phase`, relying only on operative charter instruments (`PBC` certificate, `Class T` trust powers, statutory filings, and binding `ToS`).
2. **Latent vs. Exercised Oversight (`LTBT` Analysis):** In corporate AI governance, why does Ground-0 distinguish between a legally embedded oversight mechanism that has *never been exercised* to halt a center decision (such as the Long-Term Benefit Trust) and an external sovereign order that *actually halted* a global deployment?
3. **Robustness / Sensitivity Proof (§4.3):** Prove that even if an auditor scored Gate `B1` as `NO` (`0`) in the B-Side audit (yielding $3$ of $5$ GSRB conditions instead of $4$ of $5$), the algorithm would still enter Step 3.5 and produce the exact same `2 of 4` (`AMBIGUOUS-MIXED`) result.
