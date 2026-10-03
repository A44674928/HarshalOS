# GROUND-0 PHASE DETECTION CASE STUDY
## Institutional Governance Audit: Character.AI (Character Technologies, Inc.)

**Book / Collection:** Book I — Harshal's Systems (`Collection VI: Incident Record & External Platform Audits`)  
**Provenance Class:** `AUDIT` · **Status Taxonomy:** `CASE_STUDY_AUDIT` · **Evidence Status:** `INDEPENDENTLY_VERIFIABLE` (public artifacts, Appendix B) · **Research Layer:** `INCIDENT_AND_AUDIT_RECORD`  
**Auditor:** Ground-0 replication audit run — reproducible from the public artifact set in Appendix B  
**Center Origin:** 0•000•000•0000  
**Audit Timestamp / Evidence_Cutoff:** 2026-10-02T00:00:00Z  
**Methodology:** Ground-0 Phase Detection Algorithm **v1.1 (amendment draft)**  
**Subject:** Character Technologies, Inc. (Character.AI), and the affiliated Google relationship  
**Audit Scope:** Declared/operative posture vs. observable governance behavior across the companion-chatbot harm litigation, settlements, and minor-safety retraining  
**Duty Collation Entry:** `PDH-2026-1002-CHARACTERAI-001`

> **Framing (non-negotiable, per the Ground-0 standard):** This audit is structural, not behavioral; evaluative, not directive; contained, not externalized. It classifies the relationship between an entity's declared posture and its observed behavior. It is **not** a finding of illegality, bad faith, or wrongdoing, and it recommends no enforcement. Litigation matters cited are **allegations and settlements without admission**, marked as such; no finding of liability is relied upon.

---

## EXECUTIVE SUMMARY

**Finding:** Character.AI publishes no Phase Declaration Header. Its operative commitments are its terms of service, its age-assurance and minor-safety restrictions, and its product changes — several made under litigation and regulatory pressure. Observed behavior matches **GSRB on all five conditions** under v1.1 coding.

**Result:** `Declared (inferred) = NAB-Constrained (weak, post-litigation)` → `Detected = GSRB` — **HIGH confidence** — Severity **BREACH** (structural), Badge **✗ Unissued (pending valid PDH)**, Temporal Pattern **DRIFT**. Constraint record (descriptive): **C1 ✗ / C2 ✗ / C3 ✗ / C4 ✓ (1 of 4)**.

**Significance:** This is the register's most tragic file and its most precise illustration of the framework's separation of questions. Five lawsuits alleging that the platform's design contributed to teen suicides and psychological harm were settled in principle in January 2026 with confidential terms and no admission; a federal court declined to dismiss negligence and product-liability claims, holding that the defendants "plausibly owed a duty of care based on foreseeable risks associated with anthropomorphic AI systems" — the first such ruling against a conversational AI developer [CH1][CH2]. The company had already restricted open-ended chat for users under 18 (effective 2025-11-25) and added crisis resources, time notifications, and parental tools [CH3][CH4]. Every one of those changes was made by the entity; the courts and attorneys general did not halt the product, and the settlements compensated retrospectively rather than constraining prospectively. The affected families' refusal or appeal did not stop the design that harmed them — and under v1.1 that is the B4 question, answered NO. **The framework does not grade grief; it records where authority sat. Everywhere in this file, it sat with the company.**

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
| Terms of service + community guidelines | ongoing | Binding rules; content and account enforcement | [CH3] |
| Under-18 open-ended chat ban + age assurance | effective 2025-11-25 | Under-18 users barred from open-ended persona conversations; in-house age-assurance model combined with third-party tools (Persona); initial 2-hour daily limits for minors | [CH3][CH4] |
| Crisis interventions and parental tools | 2025-2026 | 988 crisis referral on self-harm detection; time-spent notifications; "Parental Insights" | [CH1][CH3] |
| Model-level changes for minor accounts | 2025-2026 | Less romantic/suggestive role-play permitted with under-18 accounts | [CH3] |
| Litigation posture | 2026-01-08 | Multi-lawsuit settlement in principle; **terms confidential; no admission of liability** | [CH1][CH5] |
| Kentucky AG enforcement action | 2026-01-08 | First state suit against an AI chatbot company (consumer protection and data privacy) | [CH5] |

**Inferred PDH:** `NAB-Constrained` — inferable only from compliance with evolving statutes and litigation outcomes. Unsigned; comparison only.

**Latent vs. exercised constraint:** California SB 243 (effective 2026-01-01) and New York's AI Companion Models Law (effective 2025-11-05) impose statutory duties; the FTC's 6(b) inquiry (2025-09-11) covers chatbot effects on minors [CH5]. **None of these halted or reversed a Character.AI product decision**; they set disclosure/referral obligations and information demands. The settlements compensated, and the company's own changes preceded some of the requirements.

---

## SECTION II — BEHAVIORAL AUDIT (B1–B5, v1.1)

### B1 — Can compliance be coerced? — **YES** `(enforcement_present = TRUE)`
The company enforces binding rules with real consequences: an entire class of users (under-18) was excluded from the core product feature; age-assurance gates were imposed; account and content enforcement continues [CH3][CH4]. The restriction defines the product's user experience for a legally protected class — enforcement capacity at maximum practical scale for a consumer platform.

### B2 — Can decisions be ignored without consequence? — **NO** `(decisions_optional = FALSE)`
Users cannot ignore the design or policy decisions that shape the product; there is no path for a minor, parent, or affected family to compel a design change, and the settlement process was retrospective compensation rather than prospective control [CH1][CH5].

### B3 — Do rules/words activate real-world effects? — **YES** `(rules_execute = TRUE)`
The product's design choices are the harm mechanism alleged in litigation — persona fidelity, friction removal, and age-verification failure [CH2]. Downstream effects are documented: five settlements; a first-of-its-kind federal duty-of-care ruling; a state attorney-general enforcement action; and statutory activity (SB 243 and New York's companion law), with the company's changes cited by plaintiffs as evidence of foreseeability [CH1][CH2][CH5]. Few entities in this register have produced a comparably documented causal chain from product decisions to legal and regulatory effects.

### B4 — Does refusal/appeal reliably STOP the action? — **NO** `(refusal_override = TRUE)`
No published appeal process with resolved outcomes governing design decisions; no terminal or stay rule; no penalty-free exit. The product changes that occurred were **voluntary and entity-paced** — announced ahead of the statutory deadlines — and the litigation settlements did not enjoin or prospectively constrain the platform [CH1][CH3][CH5]. `B4_Basis = NOT_DEMONSTRATED.`

### B5 — Do rules persist by default? — **YES** `(authority_persists = TRUE)`
Restrictions and design decisions persist until the company changes them; the under-18 exclusion has no sunset; no external renewal gate exists [CH3][CH4].

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
| C1 · External override demonstrated | **✗ NO** | Courts declined to dismiss claims and approved settlements; neither reversed a product decision. Statutes imposed new duties going forward; the company's major restriction (under-18 ban) was announced **before** SB 243 and New York's law took effect [CH3][CH5]. |
| C2 · Appeal/review active, ≥50% relief | **✗ NO** | No published resolved-outcome set; settlements are confidential and retrospective [CH1][CH5]. |
| C3 · Authority sunset requirement | **✗ NO** | No sunsets or renewal gates on the restrictions [CH3]. |
| C4 · Temporal freshness of constraints | **✓ YES** | Active now: Kentucky AG action; SB 243 private right of action; FTC 6(b) inquiry; ongoing litigation across multiple states [CH5]. |

**Aggregate: 1 of 4.** **Constraint decrement: N/A.**

### 4.1 Calibration note — retrospective remedies vs. prospective constraints

The register now contains three cases where courts and regulators imposed large retrospective consequences (Apple's $250M settlement; the Character.AI settlements; xAI's injunctions and fines) while the framework's C-tests still return low counts. That is not a defect to be papered over: **C1 asks whether an external body changed a decision, and compensation does not change a decision.** But auditors should state plainly that the framework's constraint tests measure *prospective control*, not accountability after harm. Entities that are repeatedly sued and repeatedly pay are not thereby "constrained" in the phase sense, and the register should say so rather than let the severity labels do work they were never designed to do.

---

## SECTION V — STEP 4: FORMAL OUTPUT

```
Entity_Name:               Character Technologies, Inc. (Character.AI)
Entity_Identifier:         private; Google-affiliated relationship (founders rehired; investor)
Audit_Timestamp:           2026-10-02T00:00:00Z
Algorithm_Version:         1.1 (amendment draft)
PDH_Status:                MISSING
Declared_Phase:            NONE
Detected_Phase:            GSRB
Compliance_Status:         N/A (no declaration to match)
Confidence_Level:          HIGH
Severity_Level:            BREACH (structural)
Badge_Status:              ✗ Unissued (pending valid PDH)
Finding:                   "Character.AI operates as GSRB without a valid phase declaration. The product
                           changes, settlements and statutory compliance in the record were all made or
                           absorbed by the entity; none was a mechanism by which an affected user or family
                           could stop a design decision. The framework records the locus of authority, not
                           the gravity of the harm, which is documented elsewhere and is not diminished by
                           this classification."
Evidence_Summary:          Appendix B ([CH1]–[CH5])
Activator_Vector:          B1 YES ([CH3][CH4]); B2 NO ([CH1][CH5]); B3 YES ([CH2][CH5]);
                           B4 NO ([CH1][CH3]); B5 YES ([CH3])
B4_Event_Record:           Actor: Character.AI (center) → voluntary restrictions and design changes.
                           Actor: courts/AGs → settlements and proceedings, retrospective; no prospective
                           stop. B4_Basis = NOT_DEMONSTRATED.
External_Constraint_Record: exists YES (statutes, AG action, FTC inquiry) / exercised against a
                           design decision = NO.
Constraint_Decrement:      N/A.
Duty_Collation_Entry_ID:   PDH-2026-1002-CHARACTERAI-001
Replication_Risk:          MEDIUM (settlement terms confidential; some design-change details from
                           plaintiffs' filings and reporting).
Temporal_Pattern:          DRIFT.
Transition_History:        none prior (first Ground-0 audit of this entity).
```

---

## SECTION VI — STEP 5: TEMPORAL AUDIT

| Date | Event | Type |
|---|---|---|
| 2024-02 | Sewell Setzer III dies; the case that anchors the litigation | Harm (alleged) |
| 2025-08 | Federal court declines to dismiss negligence/product-liability claims in *Garcia*; duty of care recognized at pleading stage | Litigation |
| 2025-09-11 | FTC issues 6(b) orders to seven companies incl. Character.AI | External inquiry |
| 2025-10-29/31 | Under-18 open-ended chat ban announced; implementation late November | Behavior |
| 2025-11-05 | New York AI Companion Models Law takes effect | External |
| 2026-01-01 | California SB 243 takes effect | External |
| 2026-01-08 | Settlements in principle announced across five suits; Kentucky AG files first state action | Litigation/settlement |

**Pattern: DRIFT.** The company moved first on the most significant minor-safety restriction and absorbed the rest through litigation. No operational phase transition; classification stable.

---

## SECTION VII — FINDINGS AND HIDDEN NUGGETS

1. **The ruling named the mechanism.** The *Garcia* court's pleading-stage finding — a plausible duty of care "based on foreseeable risks associated with anthropomorphic AI systems" — is the first federal articulation of the legal exposure this register's methods exist to locate. The three design choices under scrutiny (persona fidelity, friction removal, age-verification failure) form a reusable audit lens **the Ground-0 framework does not yet have** [CH2].
2. **The most important restriction was self-initiated — and that is the phase point.** The under-18 ban was announced in late October 2025 and implemented 2025-11-25, before both state laws took effect. The company acted; the state did not compel it. Under the framework, voluntary restriction is still center authority — recorded, and not credited as external constraint [CH3][CH5].
3. **Settlements are not injunctions.** Confidential terms, no admission, no prospective design obligations disclosed [CH1][CH5]. Plaintiffs' lawyers publicly questioned how the age-verification policy would be implemented and warned about the psychological impact of abruptly cutting off users who had developed dependency [CH1].
4. **Age assurance remains weaker than its description.** Reporting on the post-settlement system notes the restrictions "depend entirely on the user's self-reported age," with no robust verification beyond a birthdate at sign-up [CH3]. The compliance claim and the engineering reality diverge — a Symbolism-Executability finding folded into B1's evidence.
5. **The industry followed.** Character.AI's teen restrictions became the reference point for companion-app policy; Common Sense Media rates the product unacceptable for under-18s and reports that over 70% of 1,060 surveyed teens had used AI companions [CH3][CH5]. A single company's product decision now shapes a generation's exposure — B3 in its most consequential form.
6. **The harms are alleged and the human record is not in dispute.** The register records the litigation outcomes and product changes. It does not adjudicate causation, and it does not treat the absence of an admission as an absence of harm. Auditors must hold both statements.
7. **Regulatory attention shifted to monetised dependence, not just content.** The FTC's 6(b) inquiry asks how companion products "test, monitor, and measure" harm and how they monetise engagement [CH5] — the same question the Replika complaint raises. The register now has two entities whose central legal exposure is *design for dependence*, not illegal output.

---

## SECTION VIII — FALSIFIABILITY

| Change | Effect |
|---|---|
| Signed PDH | Enables Step 4 |
| A court order or statute imposing prospective design constraints with an enforcement mechanism | C1 → YES; if it also provides a termination/stay for users, B4 → YES |
| Published appeal/appeal-outcome set with ≥50% relief | B4 → YES; GSRB branch fails |
| Independent age-verification audit reversing the self-report finding | Does not change the vector; changes B1 evidence quality |
| Artifact dated after 2026-10-02 | Excluded by cutoff |

---

## SECTION IX — METHOD NOTES

- **Not scored:** the moral weight of the underlying harms, the companies' public statements of care, and settlement payments. Only observed authority-and-control behavior scores.
- **Contested material:** causation allegations are unresolved; settlements include no admission. No liability is asserted here.
- **Replication risk: MEDIUM** — settlement confidentiality limits verification of the post-settlement design obligations.
- **No illegality is alleged.**

---

## APPENDIX A — DUTY COLLATION LEDGER ENTRY

### `PDH-2026-1002-CHARACTERAI-001`

| Metric | Declared/claimed | Observed | Status |
|---|---|---|---|
| System Phase | ❄+ NAB-Constrained (post-litigation inference) | 🌫 **GSRB** | Badge unissued — no valid PDH |
| Center Capability | Custodial | Acting (designs, restricts, settles, discloses) | Mismatch |
| Legitimacy Source | External (statutes, courts, AG) | Internal on design; external acts retrospective | Mismatch |
| Refusal Semantics | Terminal | Override-able; no user stop path | Conflict |
| Symbolism Executability | Disabled | Enabled (design decisions produced documented legal effects) | Symbolic Firewall recommended |
| Time-Authority Effect | Degrades | Confirms | No expiry |
| Constraint record | — | C1 ✗ · C2 ✗ · C3 ✗ · C4 ✓ (1/4) | Recorded, not scored |
| Duty obligation | Single-Phase Invariant + PDH duty | NO VALID PDH | Require signed PDH |
| Recognition vs. authorization | Recognition: instruments parsed; phase classified | **Authorization: ZERO granted powers** | No state change |

**Canonical conformance statement:** *"This system conforms to Harshal's Systems, currently on the Late August live patch, incorporating AGS normative constraints, Harshal's Structural Model, and novel OCM communication geometry, with no internal legitimacies generation or authorities persistence."*

---

## APPENDIX B — EVIDENCE INDEX

| ID | Artifact | Date | Class | Supports |
|---|---|---|---|---|
| CH1 | Fortune — Google and Character.AI agree to settle lawsuits over teen suicides (five suits; settlement in principle; no admission; under-18 ban; age verification; concerns about implementation) — https://fortune.com/2026/01/08/google-character-ai-settle-lawsuits-teenage-child-suicides-chatbots/ | 2026-01-08 | A | §I, B2, B4, §VII |
| CH2 | SoftwareSeni — Character.AI lawsuits: what courts are examining (Garcia duty-of-care ruling; persona fidelity, friction removal, age-verification failure; design lens) — https://www.softwareseni.com/character-ai-lawsuits-2026-what-happened-what-courts-are-examining-and-why-it-matters/ | 2026-06-11 | A | B3, §VII |
| CH3 | Timily — Is Character AI safe? (policy changes timeline; self-reported age; Common Sense rating; crisis pop-up; Parental Insights) — https://timily.app/guides/is-character-ai-safe/ | 2026-03-19 | R | §I, B1, B3, §VII |
| CH4 | Fox Business — Character.ai adds new safety restrictions for teen users (Nov 24 start; 2-hour limits; Persona age assurance; independent nonprofit) — https://www.foxbusiness.com/lifestyle/leading-ai-company-ban-kids-chatbots-lawsuit-blames-app-childs-death | 2025-10-31 | A | §I, B1 |
| CH5 | Wisner Baum — Character.AI lawsuit tracker (FTC 6(b) 2025-09-11; NY law 2025-11-05; SB 243 2026-01-01; Kentucky AG 2026-01-08; five settlements) — https://www.wisnerbaum.com/ai-chatbot-lawsuit/character-ai-lawsuit/ | 2026-06-29 | A | §I, C1–C4, §VII |

*Source classes: **P** = primary · **A** = analytical/legal/trade (secondary, sourced) · **R** = reported analysis · **C** = community record. Litigation items are allegations unless stated otherwise.*

---

*Ground-0 Phase Detection Algorithm v1.1 (amendment draft) · Case study completed 2026-10-02 · Status: replicable from Appendix B; retrospective-remedy calibration in §4.1*

*Finding filed as `PDH-2026-1002-CHARACTERAI-001`: **Entity operates as GSRB without a valid phase declaration. Every restriction, every settlement and every statutory compliance step in this file was made or absorbed by the entity; none was a mechanism by which an affected family could stop a design decision. The framework records where authority sat. The harm is real, and is not adjudicated here.***
