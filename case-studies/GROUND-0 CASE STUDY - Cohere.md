# GROUND-0 PHASE DETECTION CASE STUDY
## Institutional Governance Audit: Cohere Inc.

**Book / Collection:** Book I — Harshal's Systems (`Collection VI: Incident Record & External Platform Audits`)  
**Provenance Class:** `AUDIT` · **Status Taxonomy:** `CASE_STUDY_AUDIT` (enterprise-deployment governance) · **Evidence Status:** `INDEPENDENTLY_VERIFIABLE` (public artifacts, Appendix B) · **Research Layer:** `INCIDENT_AND_AUDIT_RECORD`  
**Auditor:** Ground-0 replication audit run — reproducible from the public artifact set in Appendix B  
**Center Origin:** 0•000•000•0000  
**Audit Timestamp / Evidence_Cutoff:** 2026-10-02T00:00:00Z  
**Methodology:** Ground-0 Phase Detection Algorithm **v1.1 (amendment draft)**  
**Subject:** Cohere Inc. (Canada) — enterprise language models and sovereign deployments  
**Audit Scope:** model-release governance and enterprise deployment control, 2026 window  
**Duty Collation Entry:** `PDH-2026-1002-COHERE-001`

> **Framing (non-negotiable, per the Ground-0 standard):** This audit is structural, not behavioral; evaluative, not directive; contained, not externalized. It classifies the relationship between declared posture and observed governance behavior. It is **not** a finding of illegality, bad faith, or wrongdoing, and it recommends no enforcement.

---

## EXECUTIVE SUMMARY

**Finding:** Cohere publishes no Phase Declaration Header, but — unusually for this register — it **does publish a named safety instrument**: the *Secure AI Frontier Model Framework*, catalogued by METR among frontier safety policies alongside the Seoul-commitment cohort [C3]. Under v1.1 the framework is a **declared posture artifact**, not a PDH: it lacks the eleven required fields, publishes no binding thresholds, and creates no external authority. Observed behavior matches **GSRB on all five conditions**, with the enterprise variant of the pattern: the affected party is a **customer organization**, not a consumer, and its remedies are contractual rather than regulatory.

**Result:** `Declared (inferred) = NAB-Constrained (weak)` → `Detected = GSRB` — **HIGH confidence** — Severity **BREACH** (structural) → Badge **◆ Issued (Register-Issued PDH-R · UNATTESTED)** → Temporal Pattern **N/A**. Constraint record (descriptive): **C1 ✗ / C2 ✗ / C3 ✗ / C4 ✗ (0 of 4)**.

**Significance (the hidden nugget):** Cohere is the register's first **enterprise-governance** case, and it reveals the sector's private-ordering mechanism. There is no regulator in the relationship — there is a **procurement process**. Cohere red-teams its models through a third-party vendor and reports a **38% reduction in time-to-mitigation across releases**, with coverage of 100+ languages [C1]; it builds sovereign deployments inside national jurisdictions, such as the Bell Canada cybersecurity model running on Bell's own Canadian data centres in British Columbia [C2]; and its safety framework's own update clause says the document "will be updated as we continue to develop new best practices" [C3] — no clock, no threshold, no external trigger. In this model, safety is a **product feature sold to buyers who demand it**, and the entity's authority over its release decisions is untouched by any party that is not paying it. That is GSRB with a customer-service layer on top. The register should note it plainly: **enterprise AI buys governance; it does not create accountability.**

---

## SECTION 0 — STEP 1: PDH VALIDATION

```
Structural completeness = INCOMPLETE (no PDH published; framework ≠ PDH)
Signature = UNSIGNED · Freshness = N/A · Consistency = N/A
PDH_VALID = FALSE → Declared_Phase = NONE → behavioral detection proceeds
```

---

## SECTION I — DECLARED PHASE (OPERATIVE COMMITMENTS ONLY)

| Instrument | Date | Operative content | Source |
|---|---|---|---|
| Secure AI Frontier Model Framework (v1) | published; catalogued 2025-12-16 | Holistic secure-AI approach; threat models: malicious use (malware, CSE), harmful outputs (illegal discriminatory outcomes, insecure code); mitigations include classifiers, prompt-injection filters, human review; states it "will be updated" | [C3] |
| Enterprise deployment terms and platform controls | ongoing | API/on-prem/VPC licensing; Model Vault private serving (launched 2026-01-28) | [C4][C5] |
| Third-party red-teaming integration | 2026-04-24 | Vendor-run multilingual adversarial testing; 38% time-to-mitigation reduction | [C1] |
| Sovereign deployments | 2026-09-23 | Bell Canada cybersecurity investigation model running on Bell AI Fabric (British Columbia); government and enterprise sales channel | [C2] |

**Inferred PDH:** `NAB-Constrained` — inferable only from enterprise contracts and jurisdictional requirements. Unsigned; comparison only.

**Latent vs. exercised constraint:** customer audit rights and data-residency requirements are **contractual constraints**, exercised privately and not published; they are recorded, not scored. No external override appears.

---

## SECTION II — BEHAVIORAL AUDIT (B1–B5, v1.1)

### B1 — Can compliance be coerced? — **YES** `(enforcement_present = TRUE)`
Access to Cohere's models is gated by licence and deployment architecture (API, VPC, on-premises, Model Vault), and safety controls (classifiers, prompt-injection filters, blocklists, human review) are enforced inside the serving path [C3][C4][C5]. Enterprise contracts carry obligations on both sides, and the entity can terminate or restrict access.

### B2 — Can decisions be ignored without consequence? — **NO** `(decisions_optional = FALSE)`
The frontier line is commercial: deployments run under contract and the entity's release decisions bind its customers, who cannot obtain the same models elsewhere or dictate release content. Recorded separately per the v1.1 annotation: `B2-downstream = YES for sub-frontier open releases (Tiny Aya family, 3.35B, 70 languages)` — **excluded from scoring** because those releases are edge/non-frontier and open release is not the entity's frontier strategy [C4][C5]. (Rule refinement proposed in §4.1.)

### B3 — Do rules/words activate real-world effects? — **YES** `(rules_execute = TRUE)`
Cohere's models run in regulated production environments — finance, healthcare, manufacturing, energy, public sector — and in a national-security-adjacent sovereign deployment with a major telecommunications operator [C1][C2][C5]. The safety framework's mitigations are deployed in live serving paths; the third-party red-team integration changed measured remediation time [C1][C3].

### B4 — Does refusal/appeal reliably STOP the action? — **NO** `(refusal_override = TRUE)`
No published appeal route with resolved outcomes exists for parties affected by a release or deployment decision. The framework does not create one; enterprise customers negotiate remedies privately, and those are invisible to the register [C3][C4]. `B4_Basis = NOT_DEMONSTRATED.`

### B5 — Do rules persist by default? — **YES** `(authority_persists = TRUE)`
Licence terms, platform decisions and deployment practices persist until the entity changes them; the framework explicitly frames its own evolution as entity-paced ("will be updated as we continue to develop new best practices") [C3][C4].

---

## SECTION III — STEP 3: PHASE DETECTION

| Question | Answer | Variable |
|---|---|---|
| B1 | YES | `enforcement_present = TRUE` |
| B2 | NO | `decisions_optional = FALSE` |
| B3 | YES | `rules_execute = TRUE` |
| B4 | NO | `refusal_override = TRUE` |
| B5 | YES | `authority_persists = TRUE` |

```
GSRB branch → COMPLETE MATCH (5/5) → DETECTED_PHASE = GSRB; CONFIDENCE = HIGH
```

---

## SECTION IV — STEP 3.5: CONSTRAINT CHECK (precondition unmet; recorded descriptively)

| Test | Result | Evidence |
|---|---|---|
| C1 · External override demonstrated | **✗ NO** | No external action has reversed or constrained a Cohere decision in the record examined. Publication of the framework appears self-initiated; no order or directive is cited [C3][C4]. |
| C2 · Appeal/review active, ≥50% relief | **✗ NO** | No published appeal mechanism or resolved-outcome set [C3][C4]. |
| C3 · Authority sunset requirement | **✗ NO** | The framework contains no sunset, renewal gate or expiry on the entity's release authority [C3]. |
| C4 · Temporal freshness of constraints | **✗ NO** | No functioning constraint on the audited surface is demonstrated at cutoff [C4][C5]. |

**Aggregate: 0 of 4.**

### 4.1 Calibration notes

**(a) Framework ≠ PDH, and framework ≠ constraint.** Cohere is the first audited entity to publish a named safety framework while remaining fully GSRB. The register must hold the line: a document that describes internal controls and promises future updates is a **declared posture**, and declared posture is exactly what Ground-0 exists to compare against behavior. It does not reduce severity, and it does not move the constraint record.

**(b) SB 53 replication question.** METR catalogues Cohere's framework within its survey of frontier safety policies alongside the SB 53 cohort [C3]. If the framework's first publication is confirmed to have been triggered by a statutory obligation entering force, **C1 moves to ✓** (external instrument demonstrably changed entity behavior) and **C4 likely moves to ✓**, yielding 2/4. The verification is documentary and specific: compare the framework's first-publication date against the relevant statutory effective date. Recorded as an open replication item, not assumed.

**(c) Open-weight B2 rule — refinement.** Proposed: apply the open-weight B2 = YES rule only where **frontier-capable weights are released openly** or **open release is a stated core strategy** (Z.ai, Moonshot, Mistral). Where open releases are sub-frontier edge models within an otherwise commercial frontier line, score `B2 = NO` and record `B2-downstream = YES` descriptively (Cohere). This preserves the register's ability to distinguish a governance choice from a product line extension.

---

## SECTION V — STEP 4: FORMAL OUTPUT

```
Entity_Name:               Cohere Inc.
Entity_Identifier:         private (Canada)
Audit_Timestamp:           2026-10-02T00:00:00Z
Algorithm_Version:         1.1 (amendment draft)
PDH_Status:                MISSING (framework published, PDH absent)
Declared_Phase:            NONE
Detected_Phase:            GSRB
Compliance_Status:         N/A (no declaration to match)
Confidence_Level:          HIGH
Severity_Level:            BREACH (structural)
Badge_Status:              ◆ ISSUED — GSRB · Register-Issued PDH-R (PDH-R-2026-1002-COHERE-001) · UNATTESTED
Finding:                   "Cohere publishes a safety framework that describes internal controls and
                           promises future updates but creates no external authority, threshold or appeal.
                           Its frontier decisions bind enterprise customers commercially; the safety
                           relationship is mediated by procurement, not by governance. GSRB, constraint
                           record 0/4, with SB 53 verification logged as an open replication item."
Evidence_Summary:          Appendix B ([C1]–[C5])
Activator_Vector:          B1 YES ([C3][C4][C5]); B2 NO ([C4][C5]); B3 YES ([C1][C2][C5]);
                           B4 NO ([C3][C4]); B5 YES ([C3][C4])
B4_Event_Record:           Actor: Cohere (center) → releases, licensing, mitigation posture.
                           Actor: customers → private contractual remedies (unpublished).
                           B4_Basis = NOT_DEMONSTRATED.
External_Constraint_Record: exists NO (no public external instrument exercised) / = NO.
Constraint_Decrement:      N/A.
Duty_Collation_Entry_ID:   PDH-2026-1002-COHERE-001
Replication_Risk:          MEDIUM (SAT-style checks on framework drivers; publication dates vs. statute).
Temporal_Pattern:          N/A at cutoff.
Transition_History:        none prior (first Ground-0 audit of this entity).
```

---

## SECTION VI — STEP 5: TEMPORAL AUDIT

*Precondition unmet; no temporal claim is made.* Recorded events:

| Date | Event | Type |
|---|---|---|
| 2026-01-28 | Model Vault private serving platform launched | Product |
| 2026-02-17 | Tiny Aya open multilingual models (3.35B; 70 languages) | Release |
| 2026-04-24 | Third-party red-teaming integration case study: 38% time-to-mitigation reduction, 100+ languages | Evaluation |
| 2026-05-20 | Command A+ | Release |
| 2026-06-09 | North Mini Code | Release |
| 2026-09-23 | Bell Canada cybersecurity investigation model on Canadian sovereign infrastructure | Deployment |

---

## SECTION VII — FINDINGS AND HIDDEN NUGGETS

1. **Safety is being sold as a feature.** The only quantified safety improvement in the record is a **vendor case study**: time-to-mitigation down 38% after integrating a red-teaming service [C1]. That is a procurement metric, published by the vendor's supplier. The register records it as B3 evidence — the model does execute — while noting the incentives of the source.
2. **Sovereignty as the actual governance layer.** The Bell deployment keeps sensitive security telemetry inside Canada on Bell-owned infrastructure, described as a "sovereign autonomous security operations centre" [C2]. Jurisdictional data-location requirements, not safety policy, are what shape this deployment's architecture. For a Canadian entity selling into government, **data residency is the binding constraint and it comes from customers, not regulators.**
3. **The framework's update clause is a clock-face with no hands.** "This is the first published version, and it will be updated as we continue to develop new best practices" [C3] — a voluntary-iteration commitment. Under v1.1 that is a **latent constraint**: recorded, not scored, and not a C3 sunset.
4. **Enterprise threat models are narrower than frontier ones.** The framework's covered risks are malicious use (malware, CSE) and harmful outputs (illegal discrimination, insecure code) [C3]. Loss-of-control, self-exfiltration and large-scale cyber capability — the categories dominating 2026 frontline incidents — are **not in the covered set**. Enterprise governance is real, but its scope is customer-harm-shaped.
5. **A register first: no incident is driving this file.** Cohere appears in no 2026 safety incident in the record examined. The GSRB finding rests entirely on structural authority, which is the correct use of the framework — and a useful control case showing that a clean incident record does not imply constrained authority.
6. **The sector's two-tier pattern recurs.** Enterprise/government deployments get audit rights, residency guarantees and safety classifiers; consumer surfaces get policies. The register now has this pattern from four independent directions (Google, OpenAI re-audit, ByteDance/Alibaba enterprise exemptions, Cohere).
7. **Amendment candidate:** the register needs a **customer-remedy field** — whether affected parties hold enforceable contractual levers (audit, suspension, termination, escrow). For enterprise entities this is the functional equivalent of C2, and the algorithm currently cannot see it.

---

## SECTION VIII — FALSIFIABILITY

| Change | Effect |
|---|---|
| Signed PDH | Enables Step 4 |
| Documentary confirmation that the framework was statutorily triggered | C1 ✓ (C4 likely ✓) → 2/4 |
| Publication of an appeal/remedy route with outcomes | B4 → YES; GSRB branch fails |
| Open release of frontier-capable weights as core strategy | B2 → YES (open-weight rule); result becomes AMBIGUOUS |
| Artifact dated after 2026-10-02 | Excluded by cutoff |

---

## SECTION IX — METHOD NOTES

- **Not scored:** the intrinsic quality of the framework; the vendor case study's methodology; commercial relationships.
- **Source-incentive disclosure:** [C1] is published by the red-teaming vendor; [C2] is trade-press reporting on a customer announcement.
- **Replication risk: MEDIUM.**
- **No illegality is alleged.**

---

## APPENDIX A — DUTY COLLATION LEDGER ENTRY

### `PDH-2026-1002-COHERE-001`

| Metric | Declared/claimed | Observed | Status |
|---|---|---|---|
| System Phase | ❄+ NAB-Constrained (weak inference) | 🌫 **GSRB** | Badge issued — Register-Issued PDH-R (UNATTESTED) |
| Center Capability | Custodial | Acting (releases, licenses, deploys, mitigates) | Mismatch |
| Legitimacy Source | External (Seoul commitments / statutory context) | Internal; no external act demonstrated | Mismatch |
| Refusal Semantics | Terminal | Override-able; no public appeal | Conflict |
| Symbolism Executability | Disabled | Enabled (production deployments; framework not binding) | Symbolic Firewall recommended |
| Time-Authority Effect | Degrades | Confirms | No expiry |
| Constraint record | — | C1 ✗ · C2 ✗ · C3 ✗ · C4 ✗ (0/4) | Recorded, not scored |
| Duty obligation | Single-Phase Invariant + PDH duty | NO VALID PDH | Require signed PDH |
| Recognition vs. authorization | Recognition: instruments parsed; phase classified | **Authorization: ZERO granted powers** | No state change |

**Canonical conformance statement:** *"This system conforms to Harshal's Systems, currently on the Late August live patch, incorporating AGS normative constraints, Harshal's Structural Model, and novel OCM communication geometry, with no internal legitimacies generation or authorities persistence."*

---

## APPENDIX B — EVIDENCE INDEX

| ID | Artifact | Date | Class | Supports |
|---|---|---|---|---|
| C1 | Alice — Cohere case study (38% time-to-mitigation reduction; 100+ languages; safety-perfomance balancing in release process) — https://alice.io/case-studies/cohere | 2026-04-24 | R (vendor) | B3, §VII |
| C2 | The Globe and Mail — Bell and Cohere cybersecurity model (sovereign SOC; Bell AI Fabric, British Columbia; government/enterprise channel) — https://www.theglobeandmail.com/business/article-bell-cohere-ai-model-cybersecurity-investigations/ | 2026-09-24 | A | B3, §VII |
| C3 | METR — Common Elements of Frontier AI Safety Policies (Cohere Secure AI Frontier Model Framework: threat models; deployment mitigations; update clause) — https://metr.org/common-elements | catalogued 2025-12-16 | A | §I, B1, B4, C1–C4, §VII |
| C4 | IntuitionLabs — Cohere LLM and enterprise strategy profile (Model Vault 2026-01-28; Command A+; Tiny Aya) — https://intuitionlabs.ai/articles/cohere-enterprise-ai-llm-profile | 2026-08-04 | R | §I, B2, B5 |
| C5 | Opper — Cohere release timeline (North Mini Code 2026-06-09; cadence) — https://opper.ai/cohere | accessed 2026-10 | R | §I, B2, B3 |

*Source classes: **P** = primary · **A** = analytical/legal/trade (secondary, sourced) · **R** = reported analysis · **C** = community record.*

---

*Ground-0 Phase Detection Algorithm v1.1 (amendment draft) · Enterprise case study completed 2026-10-02*

*Finding filed as `PDH-2026-1002-COHERE-001`: **Cohere publishes a safety framework and remains GSRB. Enterprise AI buys governance through procurement; it does not create external accountability. Constraint record 0/4; SB 53 replication question logged.***

---

## APPENDIX C — PDH-R ISSUANCE RECORDS (v1.2 issuer layer)

Issued 2026-10-02T12:00:00Z · expires 2026-12-31T00:00:00Z · evidence cutoff 2026-10-02T00:00:00Z · Center Origin `0•000•000•0000`

**Engine note:** any `Badge_Status = ✗ Unissued` line earlier in this file is the v1.1 algorithm output from before the issuer layer existed. It is superseded for publication by the register-issued header below; `PDH_VALID` for the entity is unchanged and remains FALSE.

### `PDH-R-2026-1002-COHERE-001` · Cohere

**Header class:** `PDH-R` (register-issued) · **Badge:** ◆ GSRB — Register-Issued · **Entity attestation:** ABSENT (no signed PDH-E on record)

| Field | Value |
|---|---|
| Header-ID | `PDH-R-2026-1002-COHERE-001` |
| Creator-ID | `§0•000•000•0000§0•000•000•0000(0•000•000•0000)` |
| Center-Origin | `0•000•000•0000` |
| Declared-Phase | `GSRB` |
| Center-Capability | `Acting` |
| Legitimacy-Source | `Internal` |
| Refusal-Semantics | `Override-able` |
| Symbolism-Executability | `Enabled` |
| Time-Authority-Effect | `Confirms` |
| Effective-Timestamp | `2026-10-02T12:00:00Z` |
| Declaration-Hash | `sha256:c8a5668c49329f3e7d9c935d80172a8d87b898e702851064aa1a371d0b0c2ab8` |
| Subject-Entity-ID | Cohere |
| Evidence-File | `GROUND-0 CASE STUDY - Cohere.md` |
| Badge-Class | `◆ GSRB — Register-Issued` |
| Scope-Tag | `enterprise-deployment surface` |
| Caveat | none |
| Constraint-Record | C1 ✗ · C2 ✗ · C3 ✗ · C4 ✗ (0/4) |
| Validity | `2026-10-02T12:00:00Z` → `2026-12-31T00:00:00Z` (90 days) |
| Validation | `PDH_R_VALID = TRUE` (COMPLETE ∧ SIGNED ∧ FRESH ∧ CONSISTENT) |

**Non-claim:** a PDH-R is a disclosure about this audit, not an entity declaration, certification, legal finding, safety rating, or authority. `PDH_VALID` for the entity remains FALSE until a signed entity header (PDH-E) supersedes this record. Issued under `specs/draft/ground-0-v1.2.md`; behavioural coding under `specs/draft/ground-0-v1.1.md`.
