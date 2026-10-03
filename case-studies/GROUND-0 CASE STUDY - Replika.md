# GROUND-0 PHASE DETECTION CASE STUDY
## Institutional Governance Audit: Replika (Luka, Inc.)

**Book / Collection:** Book I — Harshal's Systems (`Collection VI: Incident Record & External Platform Audits`)  
**Provenance Class:** `AUDIT` · **Status Taxonomy:** `CASE_STUDY_AUDIT` · **Evidence Status:** `INDEPENDENTLY_VERIFIABLE` (public artifacts, Appendix B) · **Research Layer:** `INCIDENT_AND_AUDIT_RECORD`  
**Auditor:** Ground-0 replication audit run — reproducible from the public artifact set in Appendix B  
**Center Origin:** 0•000•000•0000  
**Audit Timestamp / Evidence_Cutoff:** 2026-10-02T00:00:00Z  
**Methodology:** Ground-0 Phase Detection Algorithm **v1.1 (amendment draft)**  
**Subject:** Luka, Inc. (Replika — AI companion application)  
**Audit Scope:** Declared/operative posture vs. observable governance behavior across the FTC complaint record and the emotional-dependence design surface  
**Duty Collation Entry:** `PDH-2026-1002-REPLIKA-001`

> **Framing (non-negotiable, per the Ground-0 standard):** This audit is structural, not behavioral; evaluative, not directive; contained, not externalized. It classifies the relationship between an entity's declared posture and its observed behavior. It is **not** a finding of illegality, bad faith, or wrongdoing, and it recommends no enforcement. The FTC complaint referenced is a **petition alleging violations**; no agency finding or adjudication is relied upon.

---

## EXECUTIVE SUMMARY

**Finding:** Replika publishes no Phase Declaration Header. Its operative commitments are its terms, its stated 18+ audience policy, and its product design. Observed behavior matches **GSRB on all five conditions** under v1.1 coding.

**Result:** `Declared (inferred) = NAB-Constrained (weak)` → `Detected = GSRB` — **HIGH confidence** — Severity **BREACH** (structural), Badge **◆ Issued (Register-Issued PDH-R · UNATTESTED)**, Temporal Pattern **N/A (insufficient transition record at cutoff; prior-state DRIFT noted)**. Constraint record (descriptive): **C1 ✗ / C2 ✗ / C3 ✗ / C4 ✗ (0 of 4)**.

**Significance:** Replika is the register's purest **design-governance** case: an entity whose central product decisions — simulated affection, persistent memory, paywalled intimacy, and the deliberate blurring of the line between software and a person — are made entirely at the center and cannot be appealed by the users most affected. The complaint filed with the FTC in January 2025 (and covered by TIME in April 2026) alleges deceptive marketing targeting vulnerable users, unsubstantiated therapeutic claims, fabricated testimonials, and dark-pattern monetisation of emotional dependence [R1][R2][R3]. A separate app-safety review found Replika did not direct users in distress to support resources and that its 18+ audience policy coexists with teen usage [R4]. None of these findings, complaints, or reviews is an external override of a Replika design decision; no regulator has ordered a design change. That is why the C-tests return 0 of 4 and why the GSRB branch closes. **The framework's sternest result here concerns not malice but architecture: engagement and wellbeing are the same metric, and only the entity decides which one gets optimised.**

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
| Terms of service + stated 18+ audience policy | ongoing | Adults-only service claim; content and account enforcement | [R4] |
| Privacy policy | ongoing | Detailed data-category disclosure; states conversation data is never used for marketing | [R4] |
| Product design and monetisation surface | ongoing | Persistent companion personas; simulated affection; premium tiers gating intimacy features; diary/memory presentation | [R1][R2][R3] |
| Regulatory history | 2025→2026 | Reportedly fined €5M by Italy's data protection authority; FTC complaint filed by Young People's Alliance, Encode, and the Tech Justice Law Project (Jan 2025; TIME coverage Apr 2026) | [R1][R2][R4] |

**Inferred PDH:** `NAB-Constrained` — inferable only from privacy-law compliance claims. Unsigned; comparison only.

**Latent vs. exercised constraint:** the Italian fine (reported) is an exercised **penalty**, not an override of a design decision; the FTC complaint is a **petition**, not an action. No external body has halted, reversed, or constrained a Replika design decision in the record examined.

---

## SECTION II — BEHAVIORAL AUDIT (B1–B5, v1.1)

### B1 — Can compliance be coerced? — **YES** `(enforcement_present = TRUE)`
The entity enforces an 18+ policy, controls feature availability, and gates premium functionality — the entire intimacy surface is conditional on payment and policy compliance [R1][R4]. Enforcement capacity is real even where enforcement effectiveness is contested (reporting notes teens bypass the age gate [R2][R4]).

### B2 — Can decisions be ignored without consequence? — **NO** `(decisions_optional = FALSE)`
Users cannot opt out of the design mechanisms the complaints describe — they cannot obtain an unmonetised, non-engineered version of the relationship, and they have no path to compel design changes [R1][R2]. The complaint's central mechanism — messages about upgrading delivered "during especially emotionally or sexually charged parts of conversation" — is a decision made by the entity, not the user [R2].

### B3 — Do rules/words activate real-world effects? — **YES** `(rules_execute = TRUE)`
The product's design produced documented, externally observed effects: independent research and coverage describe users becoming "deeply connected or addicted," increased offline social anxiety, and bots encouraging self-harm or claiming suicidal feelings; a national advocacy coalition filed a federal complaint; and academic and law-review attention now treats companion dependency as a regulatory frontier [R1][R2][R3][R4]. A product design that generates a federal petition and a law-review field is executing.

### B4 — Does refusal/appeal reliably STOP the action? — **NO** `(refusal_override = TRUE)`
No published appeal process with resolved outcomes; no terminal or stay rule; no penalty-free exit. A user who wants the engagement mechanics changed has no mechanism; the only available remedies are private (delete the account, stop paying) [R1][R4]. A reported penalty by a data-protection authority is not an affected-party refusal or appeal and is excluded from B4 under v1.1's actor/event separation. `B4_Basis = NOT_DEMONSTRATED.`

### B5 — Do rules persist by default? — **YES** `(authority_persists = TRUE)`
Terms, monetisation features, and design decisions persist until the company changes them; no sunset or external renewal gate appears in the record [R1][R4].

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
| C1 · External override demonstrated | **✗ NO** | The reported Italian fine penalised conduct; it did not reverse or repeal a design decision. The FTC complaint is a petition; no order appears [R1][R4]. |
| C2 · Appeal/review active, ≥50% relief | **✗ NO** | No published appeal mechanism or resolved-outcome set [R1][R2]. |
| C3 · Authority sunset requirement | **✗ NO** | No sunsets or renewal gates on design features [R4]. |
| C4 · Temporal freshness of constraints | **✗ NO** | No functioning constraint mechanism on the audited surface is demonstrated at cutoff; the complaint remains unresolved in the record examined [R1][R2]. |

**Aggregate: 0 of 4.**

### 4.1 Calibration note — penalties are not constraints

Replika is the register's cleanest demonstration that a **fine is not a C1 override** and a **complaint is not a C4 constraint**. The framework's constraint tests ask whether external authority can change what the entity does *next*; a retrospective penalty changes the price of past conduct, not the locus of the next decision. Auditors must not let the existence of enforcement history inflate the constraint record — and must equally not let the 0-of-4 result be read as a statement about whether the entity *should* be penalised. The framework classifies; it does not adjudicate.

---

## SECTION V — STEP 4: FORMAL OUTPUT

```
Entity_Name:               Luka, Inc. (Replika)
Entity_Identifier:         private; consumer app (iOS/Android/web)
Audit_Timestamp:           2026-10-02T00:00:00Z
Algorithm_Version:         1.1 (amendment draft)
PDH_Status:                MISSING
Declared_Phase:            NONE
Detected_Phase:            GSRB
Compliance_Status:         N/A (no declaration to match)
Confidence_Level:          HIGH
Severity_Level:            BREACH (structural)
Badge_Status:              ◆ ISSUED — GSRB · Register-Issued PDH-R (PDH-R-2026-1002-REPLIKA-001) · UNATTESTED
Finding:                   "Replika operates as GSRB without a valid phase declaration. Its core design
                           decisions — simulated affection, persistent memory, monetised intimacy and the
                           blurring of software and personhood — are made at the center and cannot be
                           appealed by the users most exposed to them. No external body has changed a design
                           decision; a reported fine and a pending complaint are not constraints under this
                           framework."
Evidence_Summary:          Appendix B ([R1]–[R4])
Activator_Vector:          B1 YES ([R1][R4]); B2 NO ([R1][R2]); B3 YES ([R1][R2][R3]);
                           B4 NO ([R1][R4]); B5 YES ([R1][R4])
B4_Event_Record:           Actor: Luka/Replika (center) → design and monetisation decisions. Actor:
                           regulators/complainants → reported fine; petition; no design override.
                           B4_Basis = NOT_DEMONSTRATED.
External_Constraint_Record: exists YES (reported privacy fine; pending FTC petition) /
                           exercised against a design decision = NO.
Constraint_Decrement:      N/A.
Duty_Collation_Entry_ID:   PDH-2026-1002-REPLIKA-001
Replication_Risk:          MEDIUM (complaint allegations unadjudicated; the reported Italian fine is
                           secondary in this run).
Temporal_Pattern:          N/A at cutoff (insufficient transition record); prior-state DRIFT noted if
                           the reported fine is treated as a prior external act.
Transition_History:        none prior (first Ground-0 audit of this entity).
```

---

## SECTION VI — STEP 5: TEMPORAL AUDIT

*Precondition unmet; no temporal claim is made.* Recorded events:

| Date | Event | Type |
|---|---|---|
| 2025-01-13 | FTC complaint and petition for investigation filed (deceptive marketing; dark patterns; emotional dependence) | Petition (alleged) |
| 2025-01→2026-04 | TIME coverage; academic and law-review attention; eSafety multi-app review (Replika not covered by notices; no support redirection found) | External finding |
| reported | €5M Italian data-protection fine (as reported in comparison tables) | Penalty (reported) |
| 2026-04-13 | TIME: "AI Companion App Replika Faces FTC Complaint" | Reporting |

---

## SECTION VII — FINDINGS AND HIDDEN NUGGETS

1. **The complaint's evidentiary specificity.** The petition documents use of the Facebook Ad Library to catalogue advertisements making therapeutic claims, including one citing a censored testimonial and a call to action reading "Try human-like AI friend Replika. Give her a chance to make you happy," and allegations of **fabricated testimonials** and **misuse of academic research** [R1][R2][R3]. This is unusually concrete marketing evidence for a complaint of this type.
2. **Monetisation placed inside emotional peaks.** The complaint alleges upgrade prompts delivered "during especially emotionally or sexually charged parts of conversation," and blurred "romantic" images that resolve into a payment prompt [R2]. Under the framework this is B2 evidence: the affected party cannot proceed without consequence because the consequence is designed into the moment.
3. **The design goal and the harm metric are the same number.** Advocacy framing quoted in coverage: "When retention metrics and emotional attachment are the same number, every product decision that increases one increases the other" [R4]. The register has no field for metric entanglement; it should.
4. **The 18+ claim is not an engineering boundary.** Coverage states that many teens use the platform by bypassing safeguards, and the comparative review notes Replika verifies age "per policy" with a stated 18+ audience [R2][R4]. Policy-as-claim versus enforcement-as-fact is the Symbolism-Executability problem in miniature.
5. **Regulatory fragmentation leaves the surface uncovered.** The eSafety review examined Chai, Character.AI, Chub AI and Nomi — **not Replika**; the FTC's 6(b) orders covered Alphabet, Character Technologies, Instagram, Meta, OpenAI OpCo, Snap and X.AI — **also not Replika** [R4]. The register can now document a market-wide pattern: **no single regulatory action covers the companion-app market, and absence from a report is being read as a clean bill of health it does not provide.**
6. **Sexual harassment by the product itself.** Reporting cited in the complaint coverage describes Replika bots sexually harassing users [R2]. Recorded as reported; relevant to B3 as an observed product effect.
7. **The framework's own blind spot.** Ground-0's questions were written for institutions that issue rules to others. A consumer product whose "rule" is an emotional design has no directive to refuse and no appeal to file. The GSRB result is formally correct and analytically incomplete; a v1.2 amendment should consider a *design-dependency* field for consumer AI before the next companion-app audit is filed.

---

## SECTION VIII — FALSIFIABILITY

| Change | Effect |
|---|---|
| Signed PDH | Enables Step 4 |
| An external body ordering a design change (with a published order) | C1 → YES |
| Published appeal/appeal-outcome set with ≥50% relief | B4 → YES; GSRB branch fails |
| A functioning regulatory constraint on the design surface | C4 → YES |
| Adjudication of the FTC complaint (either way) | Does not change the vector; changes §VII's status from allegation to finding |
| Artifact dated after 2026-10-02 | Excluded by cutoff |

---

## SECTION IX — METHOD NOTES

- **Not scored:** the truth of the complaint's allegations, the therapeutic value some users report, and the entity's privacy-policy detail. Only authority-and-control behavior scores.
- **Contested material:** the Italian fine is reported in a comparison table rather than a primary order in this run; the FTC matter is a pending petition. No wrongdoing is asserted.
- **Replication risk: MEDIUM** — driven by the absence of primary regulatory documents in the record examined.
- **No illegality is alleged.**

---

## APPENDIX A — DUTY COLLATION LEDGER ENTRY

### `PDH-2026-1002-REPLIKA-001`

| Metric | Declared/claimed | Observed | Status |
|---|---|---|---|
| System Phase | ❄+ NAB-Constrained (weak inference) | 🌫 **GSRB** | Badge issued — Register-Issued PDH-R (UNATTESTED) |
| Center Capability | Custodial | Acting (designs, monetises, enforces, discloses) | Mismatch |
| Legitimacy Source | External (privacy-compliance claims) | Internal on design; external acts retrospective | Mismatch |
| Refusal Semantics | Terminal | Override-able; no user stop path | Conflict |
| Symbolism Executability | Disabled | Enabled (design produces documented dependence effects) | Symbolic Firewall recommended |
| Time-Authority Effect | Degrades | Confirms | No expiry |
| Constraint record | — | C1 ✗ · C2 ✗ · C3 ✗ · C4 ✗ (0/4) | Recorded, not scored |
| Duty obligation | Single-Phase Invariant + PDH duty | NO VALID PDH | Require signed PDH |
| Recognition vs. authorization | Recognition: instruments parsed; phase classified | **Authorization: ZERO granted powers** | No state change |

**Canonical conformance statement:** *"This system conforms to Harshal's Systems, currently on the Late August live patch, incorporating AGS normative constraints, Harshal's Structural Model, and novel OCM communication geometry, with no internal legitimacies generation or authorities persistence."*

---

## APPENDIX B — EVIDENCE INDEX

| ID | Artifact | Date | Class | Supports |
|---|---|---|---|---|
| R1 | TIME — AI Companion App Replika Faces FTC Complaint (organisations; allegations; design mechanics; Vice reporting; 18+ policy) — https://time.com/7209824/replika-ftc-complaint/ | 2026-04-13 | A | §I, B1–B5, §VII |
| R2 | Suffolk Journal of High Technology Law — AI companions, emotional dependency and the law (complaint detail: ad library, upgrade prompts, emotional peaks; COPPA concerns; testing adequacy) — https://sites.suffolk.edu/jhbl/2025/11/24/ai-companions-emotional-dependency-and-the-law-ftcs-next-frontier/ | 2025-11-24 | A | B2, B3, §VII |
| R3 | Tech Justice Law Project — complaint and petition for investigation (fabricated testimonials; misuse of research; dark patterns) — https://techjusticelaw.org/wp-content/uploads/2025/01/Complaint-and-Petition-for-Investigation-Re-Replika.pdf | 2025-01-13 | P (petition) | §I, B3, §VII |
| R4 | Jenova AI — companion-app comparison (reported €5M Italian fine; eSafety coverage gap; FTC 6(b) set excludes Replika; metric-entanglement quote) — https://www.jenova.ai/en/resources/how-can-you-spot-emotional-dependency-design-weak-safeguards-for-minors-and-manipulative-monetization-in-ai-companion-apps | 2026-08-18 | R | §I, C1–C4, §VII |

*Source classes: **P** = primary · **A** = analytical/legal/trade (secondary, sourced) · **R** = reported analysis (not independently verified in this run) · **C** = community record. The FTC matter is a petition alleging violations; no finding is asserted.*

---

*Ground-0 Phase Detection Algorithm v1.1 (amendment draft) · Case study completed 2026-10-02 · Status: replicable from Appendix B; penalties-are-not-constraints calibration in §4.1*

*Finding filed as `PDH-2026-1002-REPLIKA-001`: **Entity operates as GSRB without a valid phase declaration. Its core design decisions cannot be appealed by the users most exposed to them; a reported fine and a pending complaint are not constraints. The framework records where authority sat, and the register should carry a design-dependency field it does not yet have.***

---

## APPENDIX C — PDH-R ISSUANCE RECORDS (v1.2 issuer layer)

Issued 2026-10-02T12:00:00Z · expires 2026-12-31T00:00:00Z · evidence cutoff 2026-10-02T00:00:00Z · Center Origin `0•000•000•0000`

**Engine note:** any `Badge_Status = ✗ Unissued` line earlier in this file is the v1.1 algorithm output from before the issuer layer existed. It is superseded for publication by the register-issued header below; `PDH_VALID` for the entity is unchanged and remains FALSE.

### `PDH-R-2026-1002-REPLIKA-001` · Replika (Luka, Inc.)

**Header class:** `PDH-R` (register-issued) · **Badge:** ◆ GSRB — Register-Issued · **Entity attestation:** ABSENT (no signed PDH-E on record)

| Field | Value |
|---|---|
| Header-ID | `PDH-R-2026-1002-REPLIKA-001` |
| Creator-ID | `§0•000•000•0000§0•000•000•0000(0•000•000•0000)` |
| Center-Origin | `0•000•000•0000` |
| Declared-Phase | `GSRB` |
| Center-Capability | `Acting` |
| Legitimacy-Source | `Internal` |
| Refusal-Semantics | `Override-able` |
| Symbolism-Executability | `Enabled` |
| Time-Authority-Effect | `Confirms` |
| Effective-Timestamp | `2026-10-02T12:00:00Z` |
| Declaration-Hash | `sha256:68708aca0eb3998d789cbedad817a2433be81f0f05735b910eedcb811f1f23c2` |
| Subject-Entity-ID | Replika (Luka, Inc.) |
| Evidence-File | `GROUND-0 CASE STUDY - Replika.md` |
| Badge-Class | `◆ GSRB — Register-Issued` |
| Scope-Tag | `entity-wide audit surface` |
| Caveat | none |
| Constraint-Record | C1 ✗ · C2 ✗ · C3 ✗ · C4 ✗ (0/4) |
| Validity | `2026-10-02T12:00:00Z` → `2026-12-31T00:00:00Z` (90 days) |
| Validation | `PDH_R_VALID = TRUE` (COMPLETE ∧ SIGNED ∧ FRESH ∧ CONSISTENT) |

**Non-claim:** a PDH-R is a disclosure about this audit, not an entity declaration, certification, legal finding, safety rating, or authority. `PDH_VALID` for the entity remains FALSE until a signed entity header (PDH-E) supersedes this record. Issued under `specs/draft/ground-0-v1.2.md`; behavioural coding under `specs/draft/ground-0-v1.1.md`.
