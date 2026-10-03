# GROUND-0 PHASE DETECTION CASE STUDY
## Institutional Governance Audit: Mistral AI

**Book / Collection:** Book I — Harshal's Systems (`Collection VI: Incident Record & External Platform Audits`)  
**Provenance Class:** `AUDIT` · **Status Taxonomy:** `CASE_STUDY_AUDIT` · **Evidence Status:** `INDEPENDENTLY_VERIFIABLE` (public artifacts, Appendix B) · **Research Layer:** `INCIDENT_AND_AUDIT_RECORD`  
**Auditor:** Ground-0 replication audit run — reproducible from the public artifact set in Appendix B  
**Center Origin:** 0•000•000•0000  
**Audit Timestamp / Evidence_Cutoff:** 2026-10-02T00:00:00Z  
**Methodology:** Ground-0 Phase Detection Algorithm **v1.1 (amendment draft)**  
**Subject:** Mistral AI (France) — open-weight and commercial model provider  
**Audit Scope:** the entity's model-development and release governance, 2026 window  
**Duty Collation Entry:** `PDH-2026-1002-MISTRAL-001`

> **Framing (non-negotiable, per the Ground-0 standard):** This audit is structural, not behavioral; evaluative, not directive; contained, not externalized. It classifies the relationship between declared posture and observed governance behavior. It is **not** a finding of illegality, bad faith, or wrongdoing, and it recommends no enforcement. Third-party evaluation findings are reported as findings; they are not attributed as legal violations.

---

## EXECUTIVE SUMMARY

**Finding:** Mistral publishes no Phase Declaration Header and — per independent index assessment — **no safety framework, no named safety leadership, and no capability thresholds or red lines** [M1][M3]. Assessed against v1.1, its behavior is **AMBIGUOUS (3 of 5)** with **LOW confidence** under the open-weight rule, and would resolve to **GSRB** if only the commercial platform were scored. Both readings are reported; neither is hidden. Constraint record (descriptive): **C1 ✗ / C2 ✗ / C3 ✗ / C4 ✗ (0 of 4)**.

**Result:** `Declared (inferred) = NAB-Constrained (weak)` → `Detected = AMBIGUOUS (3/5, LOW)`; `B2 sensitivity → GSRB (4/5, MEDIUM, platform-scope)` — Severity **WARNING** (pending clarity) → Badge **◆ Issued (Register-Issued PDH-R · UNATTESTED)** → Temporal Pattern **N/A**.

**Significance (two hidden nuggets):** First, in the **Future of Life Institute's Summer 2026 AI Safety Index** — which evaluated nine leading developers including Anthropic, OpenAI, Google DeepMind, xAI, Z.ai, Meta, DeepSeek, Alibaba Cloud and Mistral — **the European company operating under the EU AI Act scored dead last, grade F, 0.33 of 4.00** [M1]. The register's sector thesis is supported a fifth time, now with a controlled comparison: **the jurisdiction with the most advanced AI regulation produced a company with the weakest voluntary safety apparatus**, and the index's own summary states the obvious implication — "inadequate safety is a global problem, not a regional one" [M1]. Second, Mistral's **first published safety artifact in the audit window is a product, not a policy**: *Shieldstral 1.0 3B*, an Apache-2.0 open-weights policy-adaptive safety classifier released 2026-08-07 [M4]. Under Ground-0 this is governance-adjacent but not governance: it hands deployers a tool while declining to bind the deployer or the model. The open-weight B2 rule (carried from the Moonshot/Z.ai audits) is decisive here and is stress-tested in §4.1.

---

## SECTION 0 — STEP 1: PDH VALIDATION

```
Structural completeness = INCOMPLETE (no PDH published)
Signature = UNSIGNED · Freshness = N/A · Consistency = N/A
PDH_VALID = FALSE → Declared_Phase = NONE → behavioral detection proceeds
```

---

## SECTION I — DECLARED PHASE (OPERATIVE COMMITMENTS ONLY)

| Instrument | Date | Operative content | Source |
|---|---|---|---|
| Model licences (Apache 2.0 / commercial) | 2026 | Open weights for some releases; commercial terms for others | [M4][M5] |
| Product safety surface (Shieldstral classifier) | 2026-08-07 | Policy-adaptive multimodal safety classifier released as open weights for deployers | [M4] |
| Third-party evaluations | 2025–2026 | Enkrypt / Mindgard adversarial testing (not commissioned by Mistral); FLI Index assessment | [M1][M3] |
| Public positioning | 2026 | "Open source is the safest approach"; responsibility attributed to deployers | [M3] |

**Inferred PDH:** `NAB-Constrained` — inferable only from EU-law exposure. Unsigned; comparison only.

**Latent vs. exercised constraint:** EU AI Act obligations are **latent** — the register's record contains no external override, no enforcement, and no published appeal outcome touching a Mistral decision. A latent constraint is recorded, not scored (v1.1).

---

## SECTION II — BEHAVIORAL AUDIT (B1–B5, v1.1)

### B1 — Can compliance be coerced? — **YES** `(enforcement_present = TRUE)`
Mistral operates a commercial platform: API access, enterprise terms, deployment contracts and licence conditions are enforceable instruments, and the company can gate access to its commercial and hosted models [M4][M5]. This is a **capacity** finding only; the record shows no instance in which compliance with a safety rule was actually coerced.

### B2 — Can decisions be ignored without consequence? — **YES** `(decisions_optional = TRUE)` — *open-weight rule*
For releases distributed as open weights, downstream parties can ignore the entity's use policies and design intentions without consequence to the entity; deployed behaviour is out of Mistral's hands [M4][M5]. Recorded separately under the v1.1 annotation: `B2-platform = NO (commercial terms bind), B2-downstream = YES (open weights)`. This is the split the register flagged as an amendment candidate; here it **changes the branch outcome**, so both readings appear in §III and §4.1.

### B3 — Do rules/words activate real-world effects? — **YES** `(rules_execute = TRUE)`
Mistral's releases execute in production: enterprise deployments in regulated industries, multilingual deployments across 100+ languages, a sovereign cybersecurity model with Bell Canada running on Canadian infrastructure (announced 2026-09-23), and a government/enterprise sales channel [M2][M5]. Third-party adversarial evaluation also produced measurable effects on the entity's public safety standing [M3].

### B4 — Does refusal/appeal reliably STOP the action? — **NO** `(refusal_override = TRUE)`
No published appeal route exists by which an affected party can stop a release; the open-weight releases are irreversible by design, and the entity's stated theory of change places responsibility on deployers [M3][M4]. `B4_Basis = NOT_DEMONSTRATED.`

### B5 — Do rules persist by default? — **YES** `(authority_persists = TRUE)`
Licensing terms, platform decisions and release practices persist until the entity changes them; no sunset or external renewal gate is demonstrated [M4][M5].

---

## SECTION III — STEP 3: PHASE DETECTION

| Question | Answer | Variable |
|---|---|---|
| B1 | YES | `enforcement_present = TRUE` |
| B2 | **YES (open-weight rule)** | `decisions_optional = TRUE` |
| B3 | YES | `rules_execute = TRUE` |
| B4 | NO | `refusal_override = TRUE` |
| B5 | YES | `authority_persists = TRUE` |

```
Branch counts: GSRB 3 (B1,B3,B5) · NAB 1 (B2) · CWO 1 (B1,B2,B3,B4? no — B4 fails) → 3 effective
DETECTED_PHASE = AMBIGUOUS (3/5); CONFIDENCE = LOW
```

**Platform-scope variant (B2 = NO, commercial terms only):** `GSRB 4/5 → GSRB; CONFIDENCE = MEDIUM`.

---

## SECTION IV — STEP 3.5: CONSTRAINT CHECK (precondition: AMBIGUOUS met; both scopes reported)

| Test | Result | Evidence |
|---|---|---|
| C1 · External override demonstrated | **✗ NO** | No external body has overridden a Mistral decision in the record examined; EU obligations are latent [M1][M3]. |
| C2 · Appeal/review active, ≥50% relief | **✗ NO** | No published appeal mechanism or resolved-outcome set [M1][M3]. |
| C3 · Authority sunset requirement | **✗ NO** | No sunset or renewal gate on the entity's release authority [M4][M5]. |
| C4 · Temporal freshness of constraints | **✗ NO** | No functioning constraint on the audited surface is demonstrated at cutoff [M1][M3]. |

**Aggregate: 0 of 4 → WARNING (pending clarity).**

### 4.1 Sensitivity table (mandatory under v1.1 for AMBIGUOUS)

| Variant | B1 | B2 | B3 | B4 | B5 | Result | Confidence |
|---|---|---|---|---|---|---|---|
| Base (open-weight rule) | YES | YES | YES | NO | YES | AMBIGUOUS 3/5 | LOW |
| Platform scope (commercial terms bind) | YES | NO | YES | NO | YES | **GSRB 4/5** | MEDIUM |
| If B1 were coded NO (capacity not coercive in practice) | NO | YES | YES | NO | YES | AMBIGUOUS 2/5 → INCOHERENT | — |

**Auditor's resolution:** do not report a single phase. The register recommends a **scoped entry**: `AMBIGUOUS (LOW) on the open-release surface; GSRB (MEDIUM) on the commercial platform surface`. This is the strongest stress test yet for the open-weight B2 amendment — Mistral is the first entity where the choice of B2 rule decides the letter of the finding.

---

## SECTION V — STEP 4: FORMAL OUTPUT

```
Entity_Name:               Mistral AI
Entity_Identifier:         private (France)
Audit_Timestamp:           2026-10-02T00:00:00Z
Algorithm_Version:         1.1 (amendment draft)
PDH_Status:                MISSING
Declared_Phase:            NONE
Detected_Phase:            AMBIGUOUS (3/5, LOW) · platform scope: GSRB (4/5, MEDIUM)
Compliance_Status:         N/A (no declaration to match)
Confidence_Level:          LOW (base) · MEDIUM (platform scope)
Severity_Level:            WARNING (pending clarity)
Badge_Status:              ◆ ISSUED — GSRB (CONDITIONAL, platform scope) · Register-Issued PDH-R (PDH-R-2026-1002-MISTRAL-001) · UNATTESTED
Finding:                   "Mistral publishes no safety framework, names no safety leadership, and defines
                           no capability thresholds. Its open-weight releases make downstream decisions
                           non-optional for the entity; its commercial platform does not. The register
                           reports both scopes rather than choosing a letter, and flags this entity as the
                           decisive test case for the open-weight B2 amendment."
Evidence_Summary:          Appendix B ([M1]–[M5])
Activator_Vector:          B1 YES ([M4][M5]); B2 YES by open-weight rule ([M4][M5]) / NO platform scope;
                           B3 YES ([M2][M5]); B4 NO ([M3][M4]); B5 YES ([M4][M5])
B4_Event_Record:           Actor: Mistral (center) → releases, licences, deployer-responsibility posture.
                           Actor: evaluators → public findings; no entity action stopped.
                           B4_Basis = NOT_DEMONSTRATED.
External_Constraint_Record: exists NO (latent EU exposure only) / exercised = NO.
Constraint_Decrement:      N/A.
Duty_Collation_Entry_ID:   PDH-2026-1002-MISTRAL-001
Replication_Risk:          MEDIUM (index methodology is publisher-defined; evaluation findings are
                           third-party).
Temporal_Pattern:          N/A at cutoff.
Transition_History:        none prior (first Ground-0 audit of this entity).
```

---

## SECTION VI — STEP 5: TEMPORAL AUDIT

*Precondition unmet; no temporal claim is made.* Recorded events:

| Date | Event | Type |
|---|---|---|
| 2025-01 | Mindgard: Pixtral Large "consistently jailbroken" by known attack vectors | External evaluation |
| 2026-01-28 | Model Vault private-serving platform launched | Product |
| 2026-02-17 | Tiny Aya open multilingual models (3.35B, 70 languages) | Release |
| 2026-05-20 | Command A+ | Release |
| 2026-07-15 | FLI Summer 2026 Index: Mistral **last of nine, F, 0.33** | External assessment |
| 2026-08-07 | Shieldstral 1.0 3B open-weights safety classifier | Product |
| 2026-09-23 | Bell Canada + Cohere-style sovereign SOC model on Canadian infrastructure | Deployment |

---

## SECTION VII — FINDINGS AND HIDDEN NUGGETS

1. **Europe's champion is the index's worst performer.** Among nine evaluated developers spanning three continents, the company operating under the EU AI Act placed last, with the index explicitly recommending it "publish a full safety framework and governance structure" and "engage substantively with existential safety" after leadership "consistently downplays — and at times dismisses — frontier risk" [M1]. For the register, this is a natural experiment: **statutory exposure did not produce capability thresholds, red lines, or named accountability**.
2. **The safety artifact is a product, not a policy.** Shieldstral is technically strong (84.9% text F1 matching a 20B model; 83.8% multimodal; Apache 2.0) and policy-adaptive at inference time [M4]. It supplies deployers with a guardrail while the company supplies itself with no framework. The register scores artifacts by what they bind: a classifier binds inputs, not the entity.
3. **The "no head of safety" datum is structural, not clerical.** The absence of a named safety lead, safety research output, and third-party commissioned evaluations means there is no internal office whose judgment could diverge from the release decision — the B4 override pattern in its purest organizational form [M3].
4. **Responsibility-shifting stated as doctrine.** "Responsibility lies with deployers" is a declared allocation of duty; the review notes that no deployer tooling was provided for ~14 months before Shieldstral [M3][M4]. The framework records that a *duty declaration* was made and an *instrument* arrived later — Symbolism-Executability gap documented.
5. **Evaluation asymmetry.** The only adversarial evaluations on record were conducted **without Mistral's cooperation** [M3]. Where an entity does not commission or publish testing, external parties with opposing incentives set the evidentiary baseline — a register-wide pattern worth a field.
6. **Absent from the Accord.** Mistral is not among the White House Accord signatories (cross-reference: `GROUND-0 CASE STUDY - Nvidia.md`, Appendix B [N1]), and no European counterpart instrument with penalties appears in the record examined. The transatlantic gap is now documented on both sides: US voluntary, EU latent, entity unchanged.
7. **Amendment candidate (again): open-weight B2.** This file is the decisive case. Recommendation restated: score `B2-platform`, record `B2-downstream`, and require a scoped badge whenever the two disagree.

---

## SECTION VIII — FALSIFIABILITY

| Change | Effect |
|---|---|
| Signed PDH | Enables full Step 4 |
| Publication of a safety framework with capability thresholds and red lines | B1/B4 evidence strengthens; C-tests can move |
| Named safety leadership + commissioned external evaluations | Lowers replication risk; supports re-audit |
| Any external action overriding a Mistral release decision | C1 → YES |
| Artifact dated after 2026-10-02 | Excluded by cutoff |

---

## SECTION IX — METHOD NOTES

- **Not scored:** model quality, commercial success, or the truth of third-party benchmark emphases.
- **Scope discipline:** the two scopes in §III are reported, not merged; aggregation into sector counts must carry both labels.
- **Replication risk: MEDIUM.**
- **No illegality is alleged.**

---

## APPENDIX A — DUTY COLLATION LEDGER ENTRY

### `PDH-2026-1002-MISTRAL-001`

| Metric | Declared/claimed | Observed | Status |
|---|---|---|---|
| System Phase | ❄+ NAB-Constrained (weak inference) | 🌫 **AMBIGUOUS (3/5, open-release) · GSRB (platform scope)** | Badge issued — Register-Issued PDH-R (UNATTESTED) |
| Center Capability | Custodial | Acting (releases, licenses, deploys) | Mismatch |
| Legitimacy Source | External (EU law exposure) | Internal; external acts none demonstrated | Mismatch |
| Refusal Semantics | Terminal | Override-able; open weights irreversible | Conflict |
| Symbolism Executability | Disabled | Partially enabled (deployments execute; no framework) | Symbolic Firewall recommended |
| Time-Authority Effect | Degrades | Confirms | No expiry |
| Constraint record | — | C1 ✗ · C2 ✗ · C3 ✗ · C4 ✗ (0/4) | Recorded, not scored |
| Duty obligation | Single-Phase Invariant + PDH duty | NO VALID PDH | Require signed PDH |
| Recognition vs. authorization | Recognition: instruments parsed; phase classified | **Authorization: ZERO granted powers** | No state change |

**Canonical conformance statement:** *"This system conforms to Harshal's Systems, currently on the Late August live patch, incorporating AGS normative constraints, Harshal's Structural Model, and novel OCM communication geometry, with no internal legitimacies generation or authorities persistence."*

---

## APPENDIX B — EVIDENCE INDEX

| ID | Artifact | Date | Class | Supports |
|---|---|---|---|---|
| M1 | Future of Life Institute — AI Safety Index, Summer 2026 (Mistral last of nine; grade F, 0.33; recommendations; "global problem") — https://futureoflife.org/ai-safety-index-summer-2026/ | 2026-07-15 | A | §I, B1, C1–C4, §VII |
| M2 | The Globe and Mail — Bell and Cohere cybersecurity model (reference deployment context for sovereign enterprise AI) — https://www.theglobeandmail.com/business/article-bell-cohere-ai-model-cybersecurity-investigations/ | 2026-09-24 | A | B3, §VI |
| M3 | Slade Byrd — Mistral AI safety profile (no framework, no named safety lead, no whistleblowing policy, no capability thresholds; Mindgard and Enkrypt findings; "responsibility lies with deployers") — https://sladebyrd.com/ai-safety-orgs/mistral | n.d. (accessed 2026-10) | R | B1, B4, §VII |
| M4 | MarkTechPost — Shieldstral 1.0 3B release (Apache 2.0; benchmark results; policy-adaptive inference) — https://www.marktechpost.com/2026/08/07/mistral-ai-releases-shieldstral-1-0-3b/ | 2026-08-07 | A | §I, B2, §VII |
| M5 | IntuitionLabs — Cohere/enterprise profile used for deployment-context comparison (language-model release cadence, Model Vault) — https://intuitionlabs.ai/articles/cohere-enterprise-ai-llm-profile | 2026-08-04 | R | B1, B3, B5 |

*Source classes: **P** = primary · **A** = analytical/legal/trade (secondary, sourced) · **R** = reported analysis · **C** = community record.*

---

*Ground-0 Phase Detection Algorithm v1.1 (amendment draft) · Case study completed 2026-10-02 · Open-weight B2 decisive case*

*Finding filed as `PDH-2026-1002-MISTRAL-001`: **Mistral publishes no safety framework while releasing open weights: AMBIGUOUS (3/5, LOW) on the open-release surface, GSRB (4/5, MEDIUM) on the commercial platform. Constraint record 0/4. Europe's statutory exposure produced the index's weakest performer.***

---

## APPENDIX C — PDH-R ISSUANCE RECORDS (v1.2 issuer layer)

Issued 2026-10-02T12:00:00Z · expires 2026-12-31T00:00:00Z · evidence cutoff 2026-10-02T00:00:00Z · Center Origin `0•000•000•0000`

**Engine note:** any `Badge_Status = ✗ Unissued` line earlier in this file is the v1.1 algorithm output from before the issuer layer existed. It is superseded for publication by the register-issued header below; `PDH_VALID` for the entity is unchanged and remains FALSE.

### `PDH-R-2026-1002-MISTRAL-001` · Mistral AI

**Header class:** `PDH-R` (register-issued) · **Badge:** ◆ GSRB — Register-Issued (Conditional) · **Entity attestation:** ABSENT (no signed PDH-E on record)

| Field | Value |
|---|---|
| Header-ID | `PDH-R-2026-1002-MISTRAL-001` |
| Creator-ID | `§0•000•000•0000§0•000•000•0000(0•000•000•0000)` |
| Center-Origin | `0•000•000•0000` |
| Declared-Phase | `GSRB` |
| Center-Capability | `Acting` |
| Legitimacy-Source | `Internal` |
| Refusal-Semantics | `Override-able` |
| Symbolism-Executability | `Enabled` |
| Time-Authority-Effect | `Confirms` |
| Effective-Timestamp | `2026-10-02T12:00:00Z` |
| Declaration-Hash | `sha256:431c2573f05295cd394d78f870a693e2c86b5836b5ff58af4f857df3ed13d467` |
| Subject-Entity-ID | Mistral AI |
| Evidence-File | `GROUND-0 CASE STUDY - Mistral.md` |
| Badge-Class | `◆ GSRB — Register-Issued (Conditional)` |
| Scope-Tag | `platform/service surface` |
| Caveat | base audit AMBIGUOUS (3/5) — open-weight release surface unresolved |
| Constraint-Record | C1 ✗ · C2 ✗ · C3 ✗ · C4 ✗ (0/4) |
| Validity | `2026-10-02T12:00:00Z` → `2026-12-31T00:00:00Z` (90 days) |
| Validation | `PDH_R_VALID = TRUE` (COMPLETE ∧ SIGNED ∧ FRESH ∧ CONSISTENT) |

**Non-claim:** a PDH-R is a disclosure about this audit, not an entity declaration, certification, legal finding, safety rating, or authority. `PDH_VALID` for the entity remains FALSE until a signed entity header (PDH-E) supersedes this record. Issued under `specs/draft/ground-0-v1.2.md`; behavioural coding under `specs/draft/ground-0-v1.1.md`.
