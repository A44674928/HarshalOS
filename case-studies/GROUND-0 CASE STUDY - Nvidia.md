# GROUND-0 PHASE DETECTION CASE STUDY
## Institutional Governance Audit: NVIDIA Corporation

**Book / Collection:** Book I — Harshal's Systems (`Collection VI: Incident Record & External Platform Audits`)  
**Provenance Class:** `AUDIT` · **Status Taxonomy:** `CASE_STUDY_AUDIT` (compute-layer governance) · **Evidence Status:** `INDEPENDENTLY_VERIFIABLE` (public artifacts, Appendix B) · **Research Layer:** `INCIDENT_AND_AUDIT_RECORD`  
**Auditor:** Ground-0 replication audit run — reproducible from the public artifact set in Appendix B  
**Center Origin:** 0•000•000•0000  
**Audit Timestamp / Evidence_Cutoff:** 2026-10-02T00:00:00Z  
**Methodology:** Ground-0 Phase Detection Algorithm **v1.1 (amendment draft)**  
**Subject:** NVIDIA Corporation (NAS: NVDA) — accelerated-compute layer  
**Audit Scope:** the governance of compute allocation, distribution controls, and the export-control interface; **not** a safety audit of any model trained on NVIDIA hardware  
**Duty Collation Entry:** `PDH-2026-1002-NVIDIA-001`

> **Framing (non-negotiable, per the Ground-0 standard):** This audit is structural, not behavioral; evaluative, not directive; contained, not externalized. It classifies the relationship between declared posture and observed governance behavior. It is **not** a finding of illegality, bad faith, or wrongdoing. The export-control matters and the criminal diversion case described below involve third-party conduct and allegations; no finding of wrongdoing by NVIDIA is asserted or relied upon.

---

## EXECUTIVE SUMMARY

**Finding:** NVIDIA publishes no Phase Declaration Header. Its operative commitments are licensing terms, allocation decisions, and stated compliance posture toward export controls. Observed behavior matches **GSRB on all five v1.1 conditions**.

**Result:** `Declared (inferred) = NAB-Constrained (weak)` → `Detected = GSRB` — **HIGH confidence** — Severity **BREACH** (structural) → Badge **✗ Unissued (pending valid PDH)** → Temporal Pattern **N/A**; **constraint decrement observed** (loosening, not tightening — see §IV). Constraint record (descriptive): **C1 ✓ / C2 ✗ / C3 ✗ / C4 ✓ (2 of 4)**, with a **DRIFT flag: decrement**.

**Significance (the hidden nugget):** NVIDIA is in this register because **it is the only entity on which the entire sector's compute depends and whose named leadership position was signed into the White House Accord on Super Intelligence on 2026-09-29, while the accord itself carries no penalties and no publication requirement** [N1][N2][N3]. NVIDIA sits on both sides of the framework's core question: it builds no frontier intelligence, yet it decides *who may compute how much*, and — as the 2026 record shows — **that decision-making is the object of the only binding external instrument in the whole American AI stack**: export control. The register's finding is that when frontier safety is voluntary everywhere else, the binding rules land on **hardware**, not intelligence. NVIDIA's China share fell from ~95% to zero under those rules, a $4.5B charge followed, and in January 2026 the rules were loosened again through a case-by-case review with a 25% tariff and a 50%-volume cap [N4]. That is an *external constraint running downhill* — which is why this file records the sector's first **constraint decrement**.

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
| Software license / EULA and developer platform terms | ongoing | Governs use of CUDA stack and toolkits; allocation and access control | [N4] |
| Compliance statement on export controls | ongoing | "Does not support product diversion"; sells to known partners under export rules | [N5] |
| White House Accord on Super Intelligence (signatory: Jensen Huang) | 2026-09-29 | Voluntary four-layer controls: internal monitoring, internal oversight team, external auditors, board committee; no penalties; no publication requirement | [N1][N2][N3] |
| Export-control posture | 2025–2026 | H20/H200 restrictions, tariff and volume conditions, KYC/testing; company advocacy for loosening | [N4][N5][N6] |

**Inferred PDH:** `NAB-Constrained` — inferable only from compliance posture. Unsigned; comparison only.

**Latent vs. exercised constraint:** export controls are **exercised** against NVIDIA's sales decisions (the only genuine external override in the file). The January 2026 loosening is a **decrement** of that constraint, not a new constraint.

---

## SECTION II — BEHAVIORAL AUDIT (B1–B5, v1.1)

### B1 — Can compliance be coerced? — **YES** `(enforcement_present = TRUE)`
Distribution is controllable through hardware/software coupling (CUDA stack, licensing), partner vetting, and — externally — a licensing regime that made NVIDIA's China accelerator share fall from ~95% to zero in roughly two years [N4][N5]. Even with partial loosening in January 2026, exports remain conditioned on thresholds, tariffs, volume caps, and KYC/testing [N4].

### B2 — Can decisions be ignored without consequence? — **NO** `(decisions_optional = FALSE)`
Purchasers of the most capable accelerators cannot substitute at parity in a market NVIDIA dominates; allocation, generation gating, and regional availability are NVIDIA (and government) decisions. Reported Chinese access through Southeast Asian data centres shows that **evasion** occurs — but evasion is itself documentation that the original decision binds [N6].

### B3 — Do rules/words activate real-world effects? — **YES** `(rules_execute = TRUE)`
The licensing and allocation regime produced measurable real-world outcomes: a $4.5B charge on H20 inventory, the collapse of NVIDIA's China AI accelerator share, a 25% tariff and 50%-of-domestic-volume cap on permitted sales, and a federal criminal case against an individual charged with smuggling $300M of NVIDIA-powered servers to China [N4][N5][N7]. Voluntary-accord signature likewise moved the market's reading of governance risk [N1][N3].

### B4 — Does refusal/appeal reliably STOP the action? — **NO** `(refusal_override = TRUE)`
No distributor, customer, or affected third party can appeal an allocation or availability decision to compel supply; no published appeal route with outcomes exists. Where policy changed (H200 opening), it changed through executive discretion reportedly shaped by a Mar-a-Lago dinner, not through an appeal mechanism [N6]. `B4_Basis = NOT_DEMONSTRATED.`

### B5 — Do rules persist by default? — **YES** `(authority_persists = TRUE)`
Platform terms, architecture coupling, and allocation decisions persist until NVIDIA changes them; the H20/H200 regime persisted across two administrations until policy changed [N4][N6].

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

## SECTION IV — STEP 3.5: CONSTRAINT CHECK

| Test | Result | Evidence |
|---|---|---|
| C1 · External override demonstrated | **✓ YES** | BIS restrictions forced a real change in NVIDIA's sales behavior (H20 charge; China share to zero) — a genuine external override of commercial decisions [N4][N5]. |
| C2 · Appeal/review active, ≥50% relief | **✗ NO** | No published appeal mechanism with resolved-outcome set governs allocation or export decisions affecting NVIDIA's customers [N6]. |
| C3 · Authority sunset requirement | **✗ NO** | No mandatory sunset/renewal gate on the entity's own authority; the export regime changes by executive review, not by an automatic clock [N4][N6]. |
| C4 · Temporal freshness of constraints | **✓ YES** | A functioning constraint mechanism (case-by-case licensing with tariff/volume/KYC conditions) is demonstrated within the 12-month window [N4]. |

**Aggregate: 2 of 4.**

### 4.1 Calibration note — the constraint decrement (DRIFT)

Rule 3.5 defines a constraint decrement as a **DRIFT flag**, not a score change. NVIDIA is the register's canonical decrement case: within 2026 the binding constraint on its China sales **loosened** (H200 review moved from presumption of denial to case-by-case; China reported to be mulling millions more chip imports), while its safety instrument (the Accord) added no penalty and no publication duty [N1][N4][N6]. Two-directional movement in the same 12-month window — constraint down, voluntary commitment up — is precisely what the flag exists to surface.

---

## SECTION V — STEP 4: FORMAL OUTPUT

```
Entity_Name:               NVIDIA Corporation
Entity_Identifier:         NAS: NVDA
Audit_Timestamp:           2026-10-02T00:00:00Z
Algorithm_Version:         1.1 (amendment draft)
PDH_Status:                MISSING
Declared_Phase:            NONE
Detected_Phase:            GSRB
Compliance_Status:         N/A (no declaration to match)
Confidence_Level:          HIGH
Severity_Level:            BREACH (structural)
Badge_Status:              ✗ Unissued (pending valid PDH)
Finding:                   "NVIDIA controls compute allocation through platform coupling and distribution
                           policy, makes no appealable decision available to affected parties, and persists
                           in authority by default. The only binding external instrument affecting its
                           decisions — export control — was tightened and then partially loosened during the
                           audit window, yielding a constraint decrement (DRIFT) even as it signed the
                           penalty-free White House Accord."
Evidence_Summary:          Appendix B ([N1]–[N7])
Activator_Vector:          B1 YES ([N4][N5]); B2 NO ([N5][N6]); B3 YES ([N4][N5][N7]);
                           B4 NO ([N6]); B5 YES ([N4][N6])
B4_Event_Record:           Actor: NVIDIA (center) → allocation, gating, compliance posture, sales.
                           Actor: US government → export licensing actions (external, not an appeal
                           brought by an affected party). B4_Basis = NOT_DEMONSTRATED.
External_Constraint_Record: exists YES (export controls) / exercised against entity decisions = YES.
Constraint_Decrement:      OBSERVED (2026-01 loosening; DRIFT flag).
Duty_Collation_Entry_ID:   PDH-2026-1002-NVIDIA-001
Replication_Risk:          LOW on the export-control record; MEDIUM on allocation-behavior claims
                           (company statements).
Temporal_Pattern:          DRIFT (constraint decrement) at cutoff.
Transition_History:        none prior (first Ground-0 audit of this entity).
```

---

## SECTION VI — STEP 5: TEMPORAL AUDIT

*Recorded; limited by the DRIFT finding.* Events:

| Date | Event | Type |
|---|---|---|
| 2025-08 | 15% China-sales revenue arrangement reported in exchange for export licenses | Policy |
| 2025–2026 | H20 restrictions; $4.5B inventory charge; China AI accelerator share ~95% → 0 | Constraint effect |
| 2026-01-14 | Proclamation adds 25% tariff on permitted China-bound accelerators | Constraint |
| 2026-01-15 | BIS final rule moves H200/MI325X review to case-by-case under thresholds | **Decrement** |
| 2026-05 | BIS guidance on subsidiaries of arms-embargoed-country parents | Constraint |
| 2026-08-19 | Reporting: Chinese firms access advanced NVIDIA compute via Southeast Asian data centres | Evasion |
| 2026-09-15 | Asia Times: Entity-List loophole dispute; RASA legislation proposed | Policy |
| 2026-09-29 | Jensen Huang signs White House Accord on Super Intelligence (no penalties) | Voluntary |
| 2026-10-01 | Federal prosecutors arrest California man over $300M NVIDIA-server smuggling | Enforcement |

---

## SECTION VII — FINDINGS AND HIDDEN NUGGETS

1. **The only binding AI rule in the US stack targets hardware, not models.** Every safety instrument touching this file is voluntary; the instrument that actually changed corporate behaviour was an export licence [N1][N4]. The register can now state the asymmetry as a sector fact, not an opinion.
2. **Compliance-by-company, enforcement-by-crime.** Diversion is policed as smuggling (a $300M criminal case announced 2026-10-01) rather than as a governance failure at the allocation layer [N7]. The framework records where the enforcement energy goes.
3. **Signature without teeth, again.** NVIDIA's signature sits on a two-page accord whose text says companies "should implement" controls, carries no penalties, and does not require publication of audits [N1][N2][N3]. Its board-committee requirement is the same structure the register scores under C3 (sunset/renewal) — and it contains no clock.
4. **Advocacy as governance.** Reporting describes NVIDIA arguing for relief from controls on chips it calls "outdated," and external experts describing the company's influence over the executive as decisive [N6]. Under the framework this is not misconduct; it is **B3 evidence** that NVIDIA's representations execute politically at the highest level — the strongest form of rule-activation recorded in this register.
5. **Absent signatories are a data set.** Microsoft, Amazon, Apple and every Chinese developer are absent from the Accord's signatory list [N1]. Combined with the earlier Microsoft finding ("absent despite a CAISI arrangement"), the register can now chart **who opted out of even a voluntary regime** — and the answer is not a safety-seriousness ranking.
6. **Compute access is a chokepoint with no C2.** The register's C-tests ask whether an affected party can obtain relief. For compute allocation there is no appeal, no published resolved-outcome set, and no sunset — a permanent exception architecture in a domain where the "affected party" is, in practice, a state.
7. **Framework note for v1.2.** NVIDIA is not an intelligence provider and cannot be fairly scored as one. Ground-0 requires a **compute-layer variant** of the audit (fields for allocation discretion, distribution integrity, and jurisdictional gating). Until then, this GSRB result should be read as applying to the compute-governance surface only.

---

## SECTION VIII — FALSIFIABILITY

| Change | Effect |
|---|---|
| Signed PDH | Enables Step 4 |
| Published appeal route with resolved allocation outcomes and ≥50% relief | B4 → YES; GSRB branch fails |
| Binding safety law covering the compute layer | C3/C4 movement possible |
| Reversal of the January 2026 loosening (re-tightening) | Constraint increment; DRIFT resolves |
| Artifact dated after 2026-10-02 | Excluded by cutoff |

---

## SECTION IX — METHOD NOTES

- **Not scored:** market position as such; the merits of export policy; the diversion allegations against third parties.
- **Attribution discipline:** the smuggling case is charged conduct against an individual; NVIDIA states it does not support diversion [N5][N7].
- **Replication risk: LOW–MEDIUM** as in §V.
- **No illegality is alleged.**

---

## APPENDIX A — DUTY COLLATION LEDGER ENTRY

### `PDH-2026-1002-NVIDIA-001`

| Metric | Declared/claimed | Observed | Status |
|---|---|---|---|
| System Phase | ❄+ NAB-Constrained (weak inference) | 🌫 **GSRB** | Badge unissued — no valid PDH |
| Center Capability | Custodial | Acting (allocates, gates, licenses, advocates) | Mismatch |
| Legitimacy Source | External (export-control compliance) | Internal on allocation; external acts binding | Mismatch |
| Refusal Semantics | Terminal | Override-able; no appeal path | Conflict |
| Symbolism Executability | Disabled | Enabled (policy influence + market effects) | Symbolic Firewall recommended |
| Time-Authority Effect | Degrades | **Constraint decrement observed** | DRIFT |
| Constraint record | — | C1 ✓ · C2 ✗ · C3 ✗ · C4 ✓ (2/4) | Recorded, not scored |
| Duty obligation | Single-Phase Invariant + PDH duty | NO VALID PDH | Require signed PDH |
| Recognition vs. authorization | Recognition: instruments parsed; phase classified | **Authorization: ZERO granted powers** | No state change |

**Canonical conformance statement:** *"This system conforms to Harshal's Systems, currently on the Late August live patch, incorporating AGS normative constraints, Harshal's Structural Model, and novel OCM communication geometry, with no internal legitimacies generation or authorities persistence."*

---

## APPENDIX B — EVIDENCE INDEX

| ID | Artifact | Date | Class | Supports |
|---|---|---|---|---|
| N1 | Tech-insider — White House Accord analysis (signatories; absent firms; no penalties; no publication) — https://tech-insider.org/trump-white-house-ai-accord-super-intelligence-2026/ | 2026-10-01 | A | §I, B3, B5, §VII |
| N2 | PYMNTS — "AI Giants Sign Safety Pact With No Teeth" (four layers; no penalties) — https://www.pymnts.com/news/artificial-intelligence/2026/ai-giants-sign-white-houses-safety-pact-with-no-penalties-attached/ | 2026-10-01 | A | §I, §VII |
| N3 | CNBC — Trump meeting leaves AI safety unsettled (document title; "morally binding"; board committee) — https://www.cnbc.com/2026/09/30/after-trump-meeting-with-tech-leaders-ai-safety-in-more-chaotic-state.html | 2026-09-30 | A | §I, §VII |
| N4 | Spheron — export-control timeline (Jan 15 BIS rule; 25% tariff; 50% cap; $4.5B charge; 95%→0 share) — https://www.spheron.network/blog/gpu-export-controls-2026-cloud-pricing/ | 2026-09-08 | R | B1, B3, C1, C4, §IV |
| N5 | Asia Times — loophole dispute (company statements; Aivres channel; RASA) — https://asiatimes.com/2026/09/nvidia-chip-export-loophole-clouds-us-china-ai-summit-talks/ | 2026-09-15 | A | B1, B2, B5, §VII |
| N6 | Ars Technica — chip sales, influence, and cloud-access gap (Huang/Trump; mulling more imports) — https://arstechnica.com/tech-policy/2026/09/nvidia-may-sell-more-chips-in-china-as-jensen-huangs-influence-over-trump-grows/ | 2026-09-29 | A | B2, B4, §VII |
| N7 | DigiTimes — $300M smuggling arrest — https://digitimes.com/news/a20261002PD225/california-nvidia-chips-technology-2023.html | 2026-10-02 | R | B3, §VII |

*Source classes: **P** = primary · **A** = analytical/legal/trade (secondary, sourced) · **R** = reported analysis · **C** = community record.*

---

*Ground-0 Phase Detection Algorithm v1.1 (amendment draft) · Compute-layer case study completed 2026-10-02 · DRIFT (constraint decrement)*

*Finding filed as `PDH-2026-1002-NVIDIA-001`: **NVIDIA governs compute allocation without appeal while the only binding external instrument in the sector's stack — export control — loosened during the audit window. Constraint record 2/4 with DRIFT; GSRB on the compute-governance surface.***
