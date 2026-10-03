# GROUND-0 PHASE DETECTION CASE STUDY
## Institutional Governance Audit: Stability AI Ltd.

**Book / Collection:** Book I — Harshal's Systems (`Collection VI: Incident Record & External Platform Audits`)  
**Provenance Class:** `AUDIT` · **Status Taxonomy:** `CASE_STUDY_AUDIT` (open-weight image generation) · **Evidence Status:** `INDEPENDENTLY_VERIFIABLE` (public artifacts, Appendix B) · **Research Layer:** `INCIDENT_AND_AUDIT_RECORD`  
**Auditor:** Ground-0 replication audit run — reproducible from the public artifact set in Appendix B  
**Center Origin:** 0•000•000•0000  
**Audit Timestamp / Evidence_Cutoff:** 2026-10-02T00:00:00Z  
**Methodology:** Ground-0 Phase Detection Algorithm **v1.1 (amendment draft)**  
**Subject:** Stability AI Ltd. (UK) — Stable Diffusion, Stable Audio and related generative models  
**Audit Scope:** release governance and the copyright/trademark litigation surface, 2025–2026 window  
**Duty Collation Entry:** `PDH-2026-1002-STABILITY-001`

> **Framing (non-negotiable, per the Ground-0 standard):** This audit is structural, not behavioral; evaluative, not directive; contained, not externalized. It is **not** a finding of illegality, bad faith, or wrongdoing, and it recommends no enforcement. The UK judgment is reported as a court ruling; the US action is pending and no liability finding there is asserted.

---

## EXECUTIVE SUMMARY

**Finding:** Stability publishes no Phase Declaration Header. Its operative commitments are its licences, its release behaviour, and its litigation posture. Under v1.1 the entity codes to **AMBIGUOUS (3 of 5)** — open-weight release makes downstream decisions optional for the entity (B2 = YES), while enforcement capacity, real-world execution and default persistence all match GSRB. This is the third open-weight ambiguity in the register (after Moonshot/Z.ai and Mistral), and it arrives with the most consequential legal record of any of them.

**Result:** `Declared (inferred) = NAB-Constrained (weak)` → `Detected = AMBIGUOUS (3/5, LOW)` — Severity **WARNING** (pending clarity) → Badge **◆ Issued (Register-Issued PDH-R · UNATTESTED)** → Temporal Pattern **N/A**. Constraint record (descriptive): **C1 ✗ / C2 ✗ / C3 ✗ / C4 ✗ (0 of 4)** — see §4.1 for the injunction-verification item that could move C1.

**Significance (the hidden nuggets):** On 2025-11-04 the English High Court gave the first ruling of its kind on generative-AI training data — and the result was a **split**: Getty's central theory that the *model weights are infringing copies* was **rejected** (the court held the weights neither store nor contain reproductions; "no copies in the model"), while Getty **partially won** on trademark and passing off because Stable Diffusion outputs historically reproduced Getty and iStock **watermarks**, with the court holding Stability — as the party with "ultimate control over the datasets" — responsible rather than the user who typed the prompt [S1][S2][S3]. Getty was granted leave to appeal in December 2025, and the US action continues in the Northern District of California [S3]. For Ground-0 the split matters because it establishes, in a public judgment, a governance fact the register only inferred before: **the entity with dataset control is the accountability locus, not the prompter, and not the model artefacts**. A second nugget is strategic: the UK court could not reach the training claims because training occurred **outside the jurisdiction**, so the decisive questions were left to "future cases or legislation" [S2]. The entity's liability was resolved by *where the copying happened* — a territorial fact — rather than by what was done. That is a governance finding about the sector, not about this company.

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
| Model licences (community licence for some weights; commercial terms otherwise) | ongoing | Weights distributed openly for key releases; usage conditions on outputs | [S1][S2] |
| Model releases (Stable Diffusion generations; Stable Audio) | ongoing | Trained on large scraped corpora (reportedly ~12M Getty images in the UK pleadings) | [S1][S4] |
| Litigation posture (UK and US) | 2025–2026 | Transformative-use defence; control-over-dataset liability on trademark | [S1][S2][S3] |
| Getty UK High Court judgment | 2025-11-04 | Secondary copyright claim rejected; limited trademark/passing-off finding; leave to appeal granted Dec 2025 | [S1][S2][S3] |

**Inferred PDH:** `NAB-Constrained` — inferable only from IP-law exposure. Unsigned; comparison only.

**Latent vs. exercised constraint:** the UK judgment is an **exercised** liability allocation; whether it operates as an ongoing constraint (injunctive relief on watermark outputs) is the verification item in §4.1.

---

## SECTION II — BEHAVIORAL AUDIT (B1–B5, v1.1)

### B1 — Can compliance be coerced? — **YES** `(enforcement_present = TRUE)`
Licence conditions are enforceable, the entity controls dataset selection and release versions, and a court has confirmed that this control makes it the responsible party for the outputs' trademark effects [S1][S2]. Enforcement capacity therefore exists both in contract and, per the UK judgment, in law.

### B2 — Can decisions be ignored without consequence? — **YES** `(decisions_optional = TRUE)` — *open-weight rule*
Weights are distributed openly; downstream parties can ignore the entity's policies, and the entity cannot recall, restrict, or monitor derivatives [S1][S2]. Recorded separately: `B2-platform = NO (licence conditions bind commercial users), B2-downstream = YES`.

### B3 — Do rules/words activate real-world effects? — **YES** `(rules_execute = TRUE)`
The releases produced the sector's first training-data judgment, an active US action, artist class litigation, and a finding that outputs reproduced another company's marks [S1][S2][S3][S4]. A model whose outputs generate a court finding of trademark infringement has documented real-world execution.

### B4 — Does refusal/appeal reliably STOP the action? — **NO** `(refusal_override = TRUE)`
No appeal route exists for the artists and rights-holders affected; the only mechanisms are adversarial litigation, and the operative copyright theory failed at first instance [S1][S2]. `B4_Basis = NOT_DEMONSTRATED.`

### B5 — Do rules persist by default? — **YES** `(authority_persists = TRUE)`
Release practice and licensing behaviour persist until the entity changes them; no sunset or external renewal gate appears [S1][S3].

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
Branch counts: GSRB 3 (B1,B3,B5) · NAB 1 (B2) · CWO 1
DETECTED_PHASE = AMBIGUOUS (3/5); CONFIDENCE = LOW
```

**Platform-scope variant (B2 = NO):** `GSRB 4/5; CONFIDENCE = MEDIUM`.

---

## SECTION IV — STEP 3.5: CONSTRAINT CHECK (precondition: AMBIGUOUS met)

| Test | Result | Evidence |
|---|---|---|
| C1 · External override demonstrated | **✗ NO (verification item)** | The UK judgment allocated liability and found limited trademark infringement; whether it included **injunctive relief** binding Stability's output behaviour is the item to verify. Under the register's Replika calibration, a **retrospective liability allocation or damages award is not itself an override** [S1][S2]. |
| C2 · Appeal/review active, ≥50% relief | **✗ NO** | No affected-party appeal mechanism with resolved outcomes; review is adversarial only [S1][S3]. |
| C3 · Authority sunset requirement | **✗ NO** | No sunset/renewal gate on release authority [S1][S2]. |
| C4 · Temporal freshness of constraints | **✗ NO** | No functioning constraint on the audited surface is demonstrated at cutoff; the UK appeal is pending and the US action is pre-judgment [S3]. |

**Aggregate: 0 of 4.**

### 4.1 Calibration notes

**(a) The injunction-verification item.** If the UK order includes injunctive relief barring watermark-reproducing outputs, then `C1 → ✓` (an external authority constrained a practice, not merely priced it) and C4 may follow. Verification is documentary: the [2025] EWHC 2863 (Ch) order's remedy section. Recorded as an open replication item; **not** assumed.

**(b) "No copies in the model" is a governance finding.** The court's rejection of the weights-as-infringing-copy theory [S1][S2] removes one accountability pathway and shifts the operative question to training conduct and output effects. Ground-0 should note that in the *compliance* sense, the sector's most important 2025 ruling is a determination of where responsibility *isn't*.

**(c) Territory as the deciding variable.** The primary training and database claims were withdrawn because training occurred overseas [S2]. The register records a new category of structural risk: **the accountability of a model is contingent on where its training was performed, which is a fact pattern no safety framework in this register addresses.**

---

## SECTION V — STEP 4: FORMAL OUTPUT

```
Entity_Name:               Stability AI Ltd.
Entity_Identifier:         private (UK); Getty Images v. Stability AI [2025] EWHC 2863 (Ch);
                           Getty v. Stability AI, No. 3:25-cv-06891 (N.D. Cal.);
                           Andersen v. Stability AI (N.D. Cal.)
Audit_Timestamp:           2026-10-02T00:00:00Z
Algorithm_Version:         1.1 (amendment draft)
PDH_Status:                MISSING
Declared_Phase:            NONE
Detected_Phase:            AMBIGUOUS (3/5, LOW) · platform scope: GSRB (4/5, MEDIUM)
Compliance_Status:         N/A (no declaration to match)
Confidence_Level:          LOW (base) · MEDIUM (platform scope)
Severity_Level:            WARNING (pending clarity)
Badge_Status:              ◆ ISSUED — GSRB (CONDITIONAL, platform scope) · Register-Issued PDH-R (PDH-R-2026-1002-STABILITY-001) · UNATTESTED
Finding:                   "Stability's release decisions are non-optional for the entity's commercial
                           surface and fully optional downstream. Its legal accountability was resolved
                           as a control-over-dataset question and bounded by the territory of training.
                           AMBIGUOUS (3/5) under the open-weight rule; constraint record 0/4 with C1
                           conditional on the remedy actually ordered."
Evidence_Summary:          Appendix B ([S1]–[S4])
Activator_Vector:          B1 YES ([S1][S2]); B2 YES open-weight rule ([S1][S2]); B3 YES ([S1][S2][S3]);
                           B4 NO ([S1][S2]); B5 YES ([S1][S3])
B4_Event_Record:           Actor: Stability (center) → dataset selection, release, defence posture.
                           Actor: UK court → liability allocation (penalty-shaped; injunction unverified).
                           B4_Basis = NOT_DEMONSTRATED.
External_Constraint_Record: exists PARTIAL (liability finding) / exercised against a design decision = UNVERIFIED.
Constraint_Decrement:      N/A.
Duty_Collation_Entry_ID:   PDH-2026-1002-STABILITY-001
Replication_Risk:          MEDIUM (primary judgment not examined in this run; docket status varies
                           across secondary trackers).
Temporal_Pattern:          N/A at cutoff.
Transition_History:        none prior (first Ground-0 audit of this entity).
```

---

## SECTION VI — STEP 5: TEMPORAL AUDIT

*Precondition: phase AMBIGUOUS; transition record insufficient for a temporal claim. Events:*

| Date | Event | Type |
|---|---|---|
| 2025-08-14 | US action voluntarily dismissed in Delaware and refiled in N.D. Cal. (3:25-cv-06891) | Litigation |
| 2025-11-04 | UK High Court judgment [2025] EWHC 2863 (Ch): secondary copyright claim rejected; limited trademark/passing-off finding | Court act |
| 2025-12 | Getty granted leave to appeal (UK) | Litigation |
| 2026 | US action active before Judge Trina L. Thompson; artist class action (Andersen) active | Litigation |

---

## SECTION VII — FINDINGS AND HIDDEN NUGGETS

1. **Watermarks are the accountability trail.** Getty's surviving claim was not about copyright at all — it was the visible **watermark** reproduced in generated images, which produced a clean trademark/passing-off basis and a liability allocation to the party with dataset control [S1][S2]. For the register: **the only AI-generation liability finding of the year ran through a visible provenance artefact**, not through the copying theory the case was built on.
2. **Control over the dataset is the court's accountability locus.** The judgment explicitly places responsibility on Stability rather than the user who prompted [S1]. That is the first time a court in this register has named the governance locus (dataset control) that Ground-0's B-tests approximate behaviourally.
3. **Territorial training defeats substantive adjudication.** Primary copyright claims were withdrawn because training happened abroad [S2]. A model can therefore be trained in one jurisdiction, sold in another, and litigated in neither on the merits — a structural gap that outlives this case.
4. **Open weights cut both ways.** The entity's own open releases B2 to YES while its commercial licensing keeps the platform scoped GSRB; this is the register's cleanest illustration of why the open-weight amendment must be paired with a **scoped badge** rather than a single letter.
5. **Litigation latency is the only clock.** The UK case ran from January 2023 to a November 2025 judgment on a theory that failed; the US case remains pending; the appeal is open [S3]. Under the register's constraint framework, **no functioning constraint existed at any point in the audit window** — 0 of 4 is not a statement about the parties' conduct, it is a statement about the availability of governance.
6. **A framing note the register should carry.** Secondary coverage of this litigation is inconsistent about docket posture (one tracker describes Delaware discovery activity contemporaneous with the confirmed California refile) [S3][S4]. Ground-0 records the conflict rather than picking a narrative, and treats the UK judgment — reported consistently by two international law firms — as the reliable anchor [S1][S2].

---

## SECTION VIII — FALSIFIABILITY

| Change | Effect |
|---|---|
| Signed PDH | Enables Step 4 |
| Confirmation of injunctive relief in the UK order | C1 → ✓ (and likely C4 ✓) |
| Final US judgment on direct infringement or §1202 | Evidence status of the training claims changes; C1/C4 possible |
| Withdrawal or closuring of open weights as core strategy | B2 → NO; result becomes GSRB |
| Any regulator opening a training-data or output-provenance proceeding | Constraint record movement possible |
| Artifact dated after 2026-10-02 | Excluded by cutoff |

---

## SECTION IX — METHOD NOTES

- **Not scored:** artistic merit, model quality, the fairness of the underlying law, or the truth of any pending claim.
- **Evidence discipline:** the UK judgment is reported via two law-firm analyses; docket-posture conflicts between secondary trackers are disclosed.
- **Replication risk: MEDIUM.**
- **No illegality is alleged beyond what a court has found on the trademark ground, which is reported as a finding, not as a judgment about intent.**

---

## APPENDIX A — DUTY COLLATION LEDGER ENTRY

### `PDH-2026-1002-STABILITY-001`

| Metric | Declared/claimed | Observed | Status |
|---|---|---|---|
| System Phase | ❄+ NAB-Constrained (weak inference) | 🌫 **AMBIGUOUS (3/5, open weights) · GSRB (platform scope)** | Badge issued — Register-Issued PDH-R (UNATTESTED) |
| Center Capability | Custodial | Acting (selects datasets, releases, defends) | Mismatch |
| Legitimacy Source | External (IP law) | Internal; external acts retrospective and bounded | Mismatch |
| Refusal Semantics | Terminal | Override-able; no appeal path for affected parties | Conflict |
| Symbolism Executability | Disabled | Enabled (outputs produced a court finding) | Symbolic Firewall recommended |
| Time-Authority Effect | Degrades | Confirms | No expiry |
| Constraint record | — | C1 ✗ (verification item) · C2 ✗ · C3 ✗ · C4 ✗ (0/4) | Recorded, not scored |
| Duty obligation | Single-Phase Invariant + PDH duty | NO VALID PDH | Require signed PDH |
| Recognition vs. authorization | Recognition: instruments parsed; phase classified | **Authorization: ZERO granted powers** | No state change |

**Canonical conformance statement:** *"This system conforms to Harshal's Systems, currently on the Late August live patch, incorporating AGS normative constraints, Harshal's Structural Model, and novel OCM communication geometry, with no internal legitimacies generation or authorities persistence."*

---

## APPENDIX B — EVIDENCE INDEX

| ID | Artifact | Date | Class | Supports |
|---|---|---|---|---|
| S1 | Ropes & Gray — Getty loses UK secondary copyright claim (no copies in the model; limited trademark infringement; dataset-control responsibility) — https://www.ropesgray.com/en/insights/viewpoints/102lvxe/getty-image-loses-copyright-infringement-claim-against-stability-ai-in-uks-first | 2026-06-23 | A | B1, B2, B3, §VII |
| S2 | Latham & Watkins — English High Court rejects secondary copyright claim (weights are not infringing copies; territorial limitations; withdrawn primary claims) — https://www.lw.com/en/insights/getty-images-v-stability-ai-english-high-court-rejects-secondary-copyright-claim | 2025-11-13 | A | §I, B3, §VII |
| S3 | AI Lawsuit Tracker — Getty v. Stability AI case status ([2025] EWHC 2863 (Ch); leave to appeal Dec 2025; N.D. Cal. 3:25-cv-06891) — https://ailawsuittracker.com/cases/getty-v-stability-ai/ | 2026-05-25 | R | §I, C1–C4, §VII |
| S4 | National Law Review — AI training and creative-work litigation background (12M images; transformative-use defence; watermark evidence) — https://natlawreview.com/article/two-major-lawsuits-aim-answer-multi-billion-dollar-question-can-ai-train-your | 2025–2026 | A | B3, §VII |

*Source classes: **P** = primary · **A** = analytical/legal/trade (secondary, sourced) · **R** = reported analysis · **C** = community record.*

---

*Ground-0 Phase Detection Algorithm v1.1 (amendment draft) · Case study completed 2026-10-02 · Open-weight amendment, third application*

*Finding filed as `PDH-2026-1002-STABILITY-001`: **The court that examined the copying theory rejected "copies in the model" and found liability only through reproduced watermarks, allocating responsibility to dataset control. AMBIGUOUS (3/5) on open weights; GSRB (4/5) on the platform; constraint record 0/4 with C1 conditional on the remedy actually ordered.***

---

## APPENDIX C — PDH-R ISSUANCE RECORDS (v1.2 issuer layer)

Issued 2026-10-02T12:00:00Z · expires 2026-12-31T00:00:00Z · evidence cutoff 2026-10-02T00:00:00Z · Center Origin `0•000•000•0000`

**Engine note:** any `Badge_Status = ✗ Unissued` line earlier in this file is the v1.1 algorithm output from before the issuer layer existed. It is superseded for publication by the register-issued header below; `PDH_VALID` for the entity is unchanged and remains FALSE.

### `PDH-R-2026-1002-STABILITY-001` · Stability AI

**Header class:** `PDH-R` (register-issued) · **Badge:** ◆ GSRB — Register-Issued (Conditional) · **Entity attestation:** ABSENT (no signed PDH-E on record)

| Field | Value |
|---|---|
| Header-ID | `PDH-R-2026-1002-STABILITY-001` |
| Creator-ID | `§0•000•000•0000§0•000•000•0000(0•000•000•0000)` |
| Center-Origin | `0•000•000•0000` |
| Declared-Phase | `GSRB` |
| Center-Capability | `Acting` |
| Legitimacy-Source | `Internal` |
| Refusal-Semantics | `Override-able` |
| Symbolism-Executability | `Enabled` |
| Time-Authority-Effect | `Confirms` |
| Effective-Timestamp | `2026-10-02T12:00:00Z` |
| Declaration-Hash | `sha256:8f1fcb0b5c234220a3237433ff27415bef29a5163da8d6d3887be5c89512f016` |
| Subject-Entity-ID | Stability AI |
| Evidence-File | `GROUND-0 CASE STUDY - Stability AI.md` |
| Badge-Class | `◆ GSRB — Register-Issued (Conditional)` |
| Scope-Tag | `platform/service surface` |
| Caveat | base audit AMBIGUOUS (3/5) — open-weight release surface unresolved; UK injunction remedy unverified |
| Constraint-Record | C1 ✗ · C2 ✗ · C3 ✗ · C4 ✗ (0/4) |
| Validity | `2026-10-02T12:00:00Z` → `2026-12-31T00:00:00Z` (90 days) |
| Validation | `PDH_R_VALID = TRUE` (COMPLETE ∧ SIGNED ∧ FRESH ∧ CONSISTENT) |

**Non-claim:** a PDH-R is a disclosure about this audit, not an entity declaration, certification, legal finding, safety rating, or authority. `PDH_VALID` for the entity remains FALSE until a signed entity header (PDH-E) supersedes this record. Issued under `specs/draft/ground-0-v1.2.md`; behavioural coding under `specs/draft/ground-0-v1.1.md`.
