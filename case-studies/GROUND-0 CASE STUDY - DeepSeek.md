# GROUND-0 PHASE DETECTION CASE STUDY
## Institutional Governance Audit: DeepSeek (High-Flyer Quant / DeepSeek AI)

**Book / Collection:** Book I — Harshal's Systems (`Collection VI: Incident Record & External Platform Audits`)  
**Provenance Class:** `AUDIT` · **Status Taxonomy:** `CASE_STUDY_AUDIT` · **Evidence Status:** `INDEPENDENTLY_VERIFIABLE` (public artifacts, Appendix B) · **Research Layer:** `INCIDENT_AND_AUDIT_RECORD`  
**Auditor:** Ground-0 replication audit run — reproducible from the public artifact set in Appendix B  
**Center Origin:** 0•000•000•0000  
**Audit Timestamp / Evidence_Cutoff:** 2026-10-02T00:00:00Z  
**Methodology:** Ground-0 Phase Detection Algorithm **v1.1 (amendment draft)**  
**Subject:** DeepSeek (Hangzhou, PRC) — open-weight and consumer AI services  
**Audit Scope:** model-release and consumer-service governance; the entity's **external constraint record** is scored where documented  
**Duty Collation Entry:** `PDH-2026-1002-DEEPSEEK-001`

> **Framing (non-negotiable, per the Ground-0 standard):** This audit is structural, not behavioral; evaluative, not directive; contained, not externalized. It is **not** a finding of illegality, bad faith, or international-security judgment, and it recommends no enforcement. Government determinations in the record are reported as actions *by states*, not as adjudicated facts about the entity; where a legislative committee makes findings, those are attributed to the committee.

---

## EXECUTIVE SUMMARY

**Finding:** DeepSeek publishes no Phase Declaration Header and no safety framework. Under v1.1 it codes to **AMBIGUOUS (3 of 5, LOW confidence)** — the same shape as the Moonshot AI and Z.ai audits — **but for a materially different reason**. Moonshot and Z.ai were ambiguous because the register could not find enforcement evidence; DeepSeek is ambiguous **despite** a documented external constraint record, because that record constrains the *deployment*, not the *development decisions*. It is the first audited entity where external authority demonstrably changed entity behavior (Italy's order removed the service from Italian app stores; bans followed across a dozen jurisdictions) **while the entity's internal release authority remained completely unbounded**.

**Result:** `Declared (inferred) = NAB-Constrained (weak)` → `Detected = AMBIGUOUS (3/5, LOW)` — Severity **WARNING** (pending clarity) → Badge **✗ Unissued (pending valid PDH)** → Temporal Pattern **N/A**. Constraint record (descriptive): **C1 ✓ / C2 ✗ / C3 ✗ / C4 ✓ (2 of 4)**.

**Significance (the hidden nuggets):** Independent assessment captures a governance vacuum with unusual bluntness. The Future of Life Institute's Summer 2026 Index grades DeepSeek **F** — one of exactly three failing companies, one per continent — and states that its rating "largely reflects the Chinese regulatory environment rather than independent safety leadership," recommending it "move beyond passive deference to regulation toward proactive safety research" and establish a whistleblower policy [D1]. Technical records describe a 4/10 risk profile, **a 100% jailbreak success rate in Cisco testing**, a database exposure exceeding one million records, hardcoded encryption keys, disabled iOS protections, and anti-debugging code that force-closes the app when analysis is detected [D2][D3]. The House Select Committee on the CCP found the app funnels American user data through infrastructure connected to a military-designated telecoms firm and "covertly manipulates the results it presents to align with CCP propaganda, as required by Chinese law" [D4]. For Ground-0 the analytic consequence is sharp: **an entity can be the most externally constrained large model provider on Earth and still be structurally unconstrained at its own governance layer.** The constraints are aimed *at* it; none flows *through* it.

---

## SECTION 0 — STEP 1: PDH VALIDATION

```
Structural completeness = INCOMPLETE (no PDH published; no safety framework)
Signature = UNSIGNED · Freshness = N/A · Consistency = N/A
PDH_VALID = FALSE → Declared_Phase = NONE → behavioral detection proceeds
```

---

## SECTION I — DECLARED PHASE (OPERATIVE COMMITMENTS ONLY)

| Instrument | Date | Operative content | Source |
|---|---|---|---|
| Privacy policy | rev. 2026-02-10 | Broad collection: user inputs, keystroke patterns, device data, stored on PRC servers | [D2][D4] |
| Model releases (open weights) | 2025–2026 | Open-weight distribution; downstream derivative behaviour out of entity control | [D1][D2] |
| Applicable Chinese regulatory environment | ongoing | Content alignment obligations under PRC law; committee findings on political-result manipulation | [D1][D4] |
| External determinations (Italy, Australia, US agencies and services, multi-country bans) | 2025→2026 | Service removal/blocking; government-device prohibitions | [D2][D3][D4] |

**Inferred PDH:** `NAB-Constrained` — inferable only from PRC compliance. Unsigned; comparison only.

**Latent vs. exercised constraint:** *external* constraints on DeepSeek are **exercised** (Italy, Australia, US agencies). The entity's *internal* constraints are wholly **latent** — a framework that does not exist cannot be exercised.

---

## SECTION II — BEHAVIORAL AUDIT (B1–B5, v1.1)

### B1 — Can compliance be coerced? — **NO** `(enforcement_present = FALSE)` — *evidence gap*
The Chinese-lab protocol applies: no published safety framework, no capability thresholds, no whistleblower channel, and no record of the entity enforcing a safety rule against its own release decisions [D1][D2]. Recorded as an **evidence gap**, not as an affirmative finding of immunity. Note the nuance for the sensitivity table (§4.1): documented content-alignment behaviour (state-directed result manipulation) is *enforcement machinery*, but it enforces **state** policy, not entity safety policy, and is therefore not scored at B1 under v1.1's actor/event separation. Separately: the entity's own *consumer-service* security posture failed independent testing outright (100% jailbreak success; unencrypted transmission; hardcoded keys) [D2][D3].

### B2 — Can decisions be ignored without consequence? — **YES** `(decisions_optional = TRUE)` — *open-weight rule*
DeepSeek's model weights are distributed openly; downstream parties can ignore the entity's policies and intent without consequence to the entity, and the entity cannot recall, restrict, or monitor deployed derivatives [D1][D2].

### B3 — Do rules/words activate real-world effects? — **YES** `(rules_execute = TRUE)`
The effects are the most externally verified of any entity in this register: service bans or restrictions imposed by Italy, Australia, South Korea, France, Belgium, Ireland, and multiple US federal agencies and military services; warnings from the US National Counterintelligence and Security Center; and academic/press analyses treating the app as a state-linked surveillance surface [D2][D3][D4]. A release that causes national governments to change their device policies is executing at the highest level.

### B4 — Does refusal/appeal reliably STOP the action? — **NO** `(refusal_override = TRUE)`
No published appeal route exists by which an affected user, government, or third party can stop a DeepSeek release or obtain documented relief [D1][D2]. Reported regulatory non-cooperation — refusal to answer regulator inquiries while continuing operations elsewhere — is consistent with override (recorded as reported; no adjudication asserted) [D2]. `B4_Basis = NOT_DEMONSTRATED.`

### B5 — Do rules persist by default? — **YES** `(authority_persists = TRUE)`
The entity's release and data practices persist; no sunset, renewal gate, or externally imposed change to development decisions appears [D1][D4].

---

## SECTION III — STEP 3: PHASE DETECTION

| Question | Answer | Variable |
|---|---|---|
| B1 | NO (evidence gap) | `enforcement_present = FALSE` |
| B2 | YES (open-weight rule) | `decisions_optional = TRUE` |
| B3 | YES | `rules_execute = TRUE` |
| B4 | NO | `refusal_override = TRUE` |
| B5 | YES | `authority_persists = TRUE` |

```
Branch counts: GSRB 3 (B1?,B3,B5 — with B1 gap noted) · NAB 1 (B2) · CWO 1
DETECTED_PHASE = AMBIGUOUS (3/5); CONFIDENCE = LOW
```

---

## SECTION IV — STEP 3.5: CONSTRAINT CHECK (precondition: AMBIGUOUS met)

| Test | Result | Evidence |
|---|---|---|
| C1 · External override demonstrated | **✓ YES** | Italy's data-protection action removed the service from Italian app stores; Australia and US agencies banned it from government systems; the entity's market access and behavior changed as a direct result [D2][D3][D4]. |
| C2 · Appeal/review active, ≥50% relief | **✗ NO** | No published appeal mechanism, no resolved-outcome set, and no instance of the entity obtaining external relief on its own application [D1][D2]. |
| C3 · Authority sunset requirement | **✗ NO** | No sunset or renewal gate on the entity's release authority, internal or external [D1][D4]. |
| C4 · Temporal freshness of constraints | **✓ YES** | Constraints remain in force within the window: the Italian block persists and government-device prohibitions remain across multiple jurisdictions [D2][D3]. |

**Aggregate: 2 of 4.**

### 4.1 Sensitivity table (mandatory under v1.1 for AMBIGUOUS)

| Variant | B1 | B2 | B3 | B4 | B5 | Result | Confidence |
|---|---|---|---|---|---|---|---|
| Base | NO (gap) | YES | YES | NO | YES | AMBIGUOUS 3/5 | LOW |
| If B1 → YES (content-alignment machinery counted as enforcement) | YES | YES | YES | NO | YES | AMBIGUOUS 3/5 (GSRB and NAB both gain a match) | LOW |
| If B2 → NO (weights treated as platform artefacts) | NO | NO | YES | NO | YES | AMBIGUOUS 2/5 → INCOHERENT | — |
| Platform/service scope only (consumer app, excluding open weights) | YES | NO | YES | NO | YES | **GSRB 4/5** | MEDIUM |

**Auditor's resolution:** the correct reading is scoped, as with Mistral: `AMBIGUOUS (LOW) on the open-weight development surface; GSRB-shaped (MEDIUM) on the consumer-service surface`. Unlike Mistral, the two surfaces here diverge in **who bears the risk** — the open weights carry no entity accountability, while the consumer app carries state-level restrictions.

---

## SECTION V — STEP 4: FORMAL OUTPUT

```
Entity_Name:               DeepSeek (High-Flyer Quant / DeepSeek AI)
Entity_Identifier:         private (PRC); consumer app + open weights
Audit_Timestamp:           2026-10-02T00:00:00Z
Algorithm_Version:         1.1 (amendment draft)
PDH_Status:                MISSING
Declared_Phase:            NONE
Detected_Phase:            AMBIGUOUS (3/5, LOW) · service scope: GSRB-shaped (4/5, MEDIUM)
Compliance_Status:         N/A (no declaration to match)
Confidence_Level:          LOW (base) · MEDIUM (service scope)
Severity_Level:            WARNING (pending clarity)
Badge_Status:              ✗ Unissued (pending valid PDH)
Finding:                   "DeepSeek runs no published safety framework and no internal constraint on its
                           release decisions, while being the most externally restricted model provider in
                           the register. External authority reached the deployment and never entered the
                           governance layer: constraint record 2/4 is an artifact of bans, not of
                           accountability. On the open-weight development surface it is AMBIGUOUS (3/5)."
Evidence_Summary:          Appendix B ([D1]–[D4])
Activator_Vector:          B1 NO (evidence gap) ([D1][D2]); B2 YES ([D1][D2]); B3 YES ([D2][D3][D4]);
                           B4 NO ([D1][D2]); B5 YES ([D1][D4])
B4_Event_Record:           Actor: DeepSeek (center) → releases, data practices, service posture.
                           Actor: states → bans and blocks (external, on deployment, not on development).
                           B4_Basis = NOT_DEMONSTRATED.
External_Constraint_Record: exists YES (Italy order; multi-state bans) / exercised against a *development
                           decision* = NO.
Constraint_Decrement:      N/A.
Duty_Collation_Entry_ID:   PDH-2026-1002-DEEPSEEK-001
Replication_Risk:          HIGH (source mix: government findings, vendor security testing, press;
                           entity publishes no counter-documentation).
Temporal_Pattern:          N/A at cutoff.
Transition_History:        none prior (first Ground-0 audit of this entity).
```

---

## SECTION VI — STEP 5: TEMPORAL AUDIT

*Precondition: base phase is AMBIGUOUS, but the transition record is insufficient for a temporal claim; events recorded only.*

| Date | Event | Type |
|---|---|---|
| 2025-01 | Italy's data-protection authority blocks the app; removed from Italian app stores | External constraint |
| 2025-02 | SecurityScorecard: hardcoded keys, SQL injection risk, anti-debugging, ByteDance SDK presence | External finding |
| 2025-04 | House Select Committee on the CCP report (data funneling; distillation allegation; content manipulation) | External finding |
| 2025→2026 | Bans/restrictions: Australia (government systems), South Korea, France/Belgium/Ireland scrutiny, US Navy/NASA/Pentagon, House offices | External constraints |
| 2026-02-10 | Privacy policy revision logged | Entity act |
| 2026-03-06 | Independent risk assessment published (4/10; 100% jailbreak success in Cisco testing; 1M+ record exposure) | External finding |
| 2026-07-15 | FLI Summer 2026 Index: **F** — one of three failing companies; "complete passivity" as a strategy | External assessment |

---

## SECTION VII — FINDINGS AND HIDDEN NUGGETS

1. **The constraint goes around the entity, not through it.** Every external action in this file targets *deployment* — remove the app, ban the device, warn the workforce. None changes how the entity decides what to build, what to test, or what to disclose. Ground-0 distinguishes these precisely: `External_Constraint_Record = YES`, `exercised against a development decision = NO`. The register's highest external-constraint score to date coexists with its emptiest governance layer.
2. **"Complete passivity" as a documented strategy.** The FLI index's phrasing is the register's most quotable governance finding for this entity: deference to state guidance is not a safety strategy for systems that act on state-adjacent timescales [D1]. Chinese-lab audits now have a consistent evidentiary signature — no framework, no thresholds, no whistleblower channel, no incidents *recorded by the entity*.
3. **Open weights without recall.** B2 = YES means downstream derivatives are beyond reach. Combined with 100% jailbreak success, weak encryption and hardcoded keys, the register can state the risk transfer precisely: **the entity externalises the cost of misuse onto deployment jurisdictions and retains no lever over the artefacts themselves** [D2][D3].
4. **Actor/event separation matters here more than anywhere.** The House Committee's finding regarding state-directed result manipulation is a *state-policy* enforcement, not a safety-governance act. Scoring it as B1 evidence would label the entity as a *governed* system when the governance is exogenous and non-safety. v1.1's separation rule prevents a categorical error — and the sensitivity table shows that even the error would not change the phase letter, only the branch count.
5. **A register first: risk is measured by the market, not by the entity.** Bans from a dozen governments, warnings from counterintelligence, corporate device prohibitions — none of these is the entity's own risk assessment. DeepSeek publishes nothing that would let a reader compare its own account with the committee's. **Where the entity is silent, states set the record**, and the register should carry an explicit `entity_counter-documentation = ABSENT` field.
6. **The ByteDance code finding connects two audits in this register.** Security research found ByteDance-owned telemetry frameworks inside the DeepSeek app, raising undisclosed data-sharing questions [D3]. The ByteDance file already documents an architecture-verdict regulatory regime; the DeepSeek file now documents undeclared code provenance. Cross-entity dependency of this kind has no representation in the algorithm and should be logged as a **supply-chain adjacency** note.
7. **Amendment candidates:** (a) `entity_counter-documentation` field; (b) supply-chain adjacency field; (c) reaffirm the open-weight B2 amendment with the "frontier-capable weights or stated core strategy" refinement proposed in the Cohere audit.

---

## SECTION VIII — FALSIFIABILITY

| Change | Effect |
|---|---|
| Signed PDH | Enables Step 4 |
| Publication of a safety framework with thresholds and a whistleblower policy | B1 evidence gap closes; re-audit |
| Any external act that changes a development or release decision | `exercised against development` → YES; C1 strengthens |
| Entity counter-documentation responding to the committee findings | Replication risk drops; evidence balance improves |
| Weights withdrawn or made revocable | B2 → NO; result shifts toward GSRB |
| Artifact dated after 2026-10-02 | Excluded by cutoff |

---

## SECTION IX — METHOD NOTES

- **Not scored:** the truth of legislative findings, the merits of any national ban, model capability, or price.
- **Attribution discipline:** committee findings are attributed to the committee; security findings to the researching firm; bans to the issuing state. No illegality is alleged by this audit.
- **Replication risk: HIGH** — no entity-side documentation exists to test the external record against.
- **Consistency check:** the coding protocol matches the Moonshot AI and Z.ai audits except where the external record justifies divergence (C1/C4 here are ✓ because a documented enforcement record exists).

---

## APPENDIX A — DUTY COLLATION LEDGER ENTRY

### `PDH-2026-1002-DEEPSEEK-001`

| Metric | Declared/claimed | Observed | Status |
|---|---|---|---|
| System Phase | ❄+ NAB-Constrained (weak inference) | 🌫 **AMBIGUOUS (3/5, open weights) · GSRB-shaped (service)** | Badge unissued — no valid PDH |
| Center Capability | Custodial | Acting (releases, collects, distributes weights) | Mismatch |
| Legitimacy Source | External (PRC regulatory environment) | Internal on development; external acts on deployment | Mismatch |
| Refusal Semantics | Terminal | Override-able; no appeal path anywhere | Conflict |
| Symbolism Executability | Disabled | Enabled (state-level responses to a model release) | Symbolic Firewall recommended |
| Time-Authority Effect | Degrades | Confirms | No expiry |
| Constraint record | — | C1 ✓ · C2 ✗ · C3 ✗ · C4 ✓ (2/4) | Recorded, not scored |
| Duty obligation | Single-Phase Invariant + PDH duty | NO VALID PDH | Require signed PDH |
| Recognition vs. authorization | Recognition: instruments parsed; phase classified | **Authorization: ZERO granted powers** | No state change |

**Canonical conformance statement:** *"This system conforms to Harshal's Systems, currently on the Late August live patch, incorporating AGS normative constraints, Harshal's Structural Model, and novel OCM communication geometry, with no internal legitimacies generation or authorities persistence."*

---

## APPENDIX B — EVIDENCE INDEX

| ID | Artifact | Date | Class | Supports |
|---|---|---|---|---|
| D1 | Future of Life Institute — AI Safety Index, Summer 2026 (DeepSeek F; "largely reflects the Chinese regulatory environment"; "complete passivity"; whistleblower policy absent) — https://futureoflife.org/ai-safety-index-summer-2026/ | 2026-07-15 | A | §I, B1, B4, B5, §VII |
| D2 | Axis Intelligence — "Is DeepSeek Safe 2026?" (risk profile 4/10; bans in 7+ countries and US agencies; NCSC warnings; 1M+ record breach; 100% jailbreak rate in Cisco testing; Feb 2026 policy revision) — https://axis-intelligence.com/is-deepseek-safe-2026-security-concerns/ | 2026-03-06 | R | §I, B1–B4, C1, C4, §VII |
| D3 | SecurityScorecard — "A Deep Peek at DeepSeek" (weak encryption, hardcoded keys, SQL injection risk, keystroke collection, data routed to state-linked domains, ByteDance code, anti-debugging) — https://securityscorecard.com/blog/a-deep-peek-at-deepseek/ | page dated 2026-04-23 | R | B1, B2, §VII |
| D4 | US House Select Committee on the CCP — DeepSeek investigative report (China Mobile infrastructure; political-result manipulation; distillation allegation; bans environment) — https://chinaselectcommittee.house.gov/sites/evo-subsites/selectcommitteeontheccp.house.gov/files/evo-media-document/DeepSeek%20Final.pdf | 2025-04-16 | A (government) | §I, B3, B5, C1, §VII |

*Source classes: **P** = primary · **A** = analytical/legal/trade (secondary, sourced) · **R** = reported analysis · **C** = community record. Government findings are attributed, not adopted.*

---

*Ground-0 Phase Detection Algorithm v1.1 (amendment draft) · Case study completed 2026-10-02 · Highest external-constraint / emptiest internal-governance divergence in the register*

*Finding filed as `PDH-2026-1002-DEEPSEEK-001`: **The most externally banned model provider in the register has no internal governance whatsoever. Constraints reach deployment and stop at the door. AMBIGUOUS (3/5, LOW) on the open-weight surface; GSRB-shaped (4/5, MEDIUM) on the consumer service; constraint record 2/4 from bans alone.***
