# GROUND-0 PHASE DETECTION CASE STUDY
## Institutional Governance Audit: Suno, Inc. and Uncharted Labs (Udio)

**Book / Collection:** Book I — Harshal's Systems (`Collection VI: Incident Record & External Platform Audits`)  
**Provenance Class:** `AUDIT` · **Status Taxonomy:** `CASE_STUDY_AUDIT` (dual-entity file) · **Evidence Status:** `INDEPENDENTLY_VERIFIABLE` (public artifacts, Appendix B) · **Research Layer:** `INCIDENT_AND_AUDIT_RECORD`  
**Auditor:** Ground-0 replication audit run — reproducible from the public artifact set in Appendix B  
**Center Origin:** 0•000•000•0000  
**Audit Timestamp / Evidence_Cutoff:** 2026-10-02T00:00:00Z  
**Methodology:** Ground-0 Phase Detection Algorithm **v1.1 (amendment draft)**  
**Subjects:** Suno, Inc. (D. Mass. and Munich proceedings) and Uncharted Labs, Inc. / Udio (SDNY proceedings) — both generative-music model developers  
**Audit Scope:** training-data governance and the litigation/licensing record, 2025–2026 window  
**Duty Collation Entries:** `PDH-2026-1002-SUNO-001` and `PDH-2026-1002-UDIO-001`

> **Framing (non-negotiable, per the Ground-0 standard):** This audit is structural, not behavioral; evaluative, not directive; contained, not externalized. It is **not** a finding of illegality, bad faith, or wrongdoing, and it recommends no enforcement. The Munich judgment is reported as a court ruling; US fair-use questions remain undecided. All settlement terms are reported as published or reported; undisclosed terms are stated as undisclosed.

---

## EXECUTIVE SUMMARY

**Finding:** Neither entity publishes a Phase Declaration Header. Both code to **GSRB on all five v1.1 conditions** on their commercial surfaces, but the interesting result is the **divergence in their constraint records** — a natural experiment created by two different rights-holder strategies.

**Results:**
- **Suno:** `Detected = GSRB (5/5, HIGH)`; constraint record **C1 ✓ / C2 ✗ / C3 ✗ / C4 ✓ (2 of 4)**.
- **Udio:** `Detected = GSRB (5/5, HIGH)`; constraint record **C1 ✗ / C2 ✗ / C3 ✗ / C4 ✗ (0 of 4)**.

Severity: **BREACH** (structural) for both → Badge: **✗ Unissued (pending valid PDH)** → Temporal Pattern: **N/A**.

**Significance (the hidden nuggets):** Music is where generative-AI governance became **contractual before it became legal**, and this file records the template. UMG's settlement with Udio (2025-10-29) included a per-generation royalty of roughly **$0.002–$0.005**, higher rates for commercially distributed outputs, **content-identification obligations** for UMG-catalogue similarity, and — the register's key discovery — **audit rights over training data and generation logs**, with the licence extending to future model versions [U1][U4]. That is a **functioning, private, verifiable constraint on a generative-AI developer**, and it exists because a rightsholder had leverage, not because a regulator acted. Against that backdrop, the divergence: **Suno** faces the first European ruling on a generative music tool — Munich Regional Court I, 2026-07-31, **GEMA v. Suno**, which prohibited four categories of conduct (reproduction during US training, memorisation reproduction in Germany, communication to the public by offering the model, and via outputs), ordered **disclosure of the scale of use**, held Suno liable for damages, and is **immediately enforceable pending appeal** [U1]. **Udio**, by contrast, has settled the claims that would have tested the same conduct; its constraints are contractual and voluntary, and Sony is still litigating a second action covering **30,117 additional sound recordings** [U1][U2]. The register's inference is uncomfortable and worth stating: **the only entity in this file with an enforceable external constraint is the one that refused to settle.**

---

## SECTION 0 — STEP 1: PDH VALIDATION

```
Structural completeness = INCOMPLETE (no PDH published by either entity)
Signature = UNSIGNED · Freshness = N/A · Consistency = N/A
PDH_VALID = FALSE → Declared_Phase = NONE → behavioral detection proceeds
```

---

## SECTION I — DECLARED PHASE (OPERATIVE COMMITMENTS ONLY)

| Entity | Instrument | Date | Operative content | Source |
|---|---|---|---|---|
| Suno | Terms of service | ongoing | No warranty that copyright vests in outputs; commercial rights tied to paid tiers; "granted commercial rights" language post-Warner | [U4] |
| Suno | Warner Music settlement + partnership | stipulation 2025-12-09; order 2026-01-28 | Claims dismissed; licensed model partnership; artist **opt-in** for voices, compositions, likenesses | [U2][U3][U4] |
| Suno | Litigation posture (UMG + Sony, D. Mass.; independent-artist class action; GEMA, Munich) | 2026 | Fair-use defence (Bartz precedent); Munich judgment under evaluation for appeal | [U1][U2] |
| Udio | UMG settlement + licence | 2025-10-29 | Per-generation royalty $0.002–$0.005; content ID; **audit rights over training data and generation logs**; future licensed platform | [U1][U4] |
| Udio | Sony v. Udio (SDNY) | second complaint 2026-07-20 | 30,117 additional sound recordings; active litigation | [U1] |

**Inferred PDH (both):** `NAB-Constrained` — inferable only from copyright-law exposure. Unsigned; comparison only.

**Latent vs. exercised constraint:** Munich is **exercised** against Suno (enforceable prohibitions + disclosure order). Udio's obligations are **contractual** — agreed, private, and not scored as external constraint under v1.1; the Sony action is **live but pre-judgment**.

---

## SECTION II — BEHAVIORAL AUDIT (B1–B5, v1.1)

### Suno

**B1 — Can compliance be coerced? — YES.** Platform access, tier gating, licence conditions and download controls are enforceable, and a court has now demonstrated that its conduct can be prohibited and its scale of use compelled into disclosure [U1][U4].  
**B2 — Can decisions be ignored without consequence? — NO.** The service is commercial; the entity's model, availability, and licensing decisions bind users and cannot be replicated downstream at parity [U4].  
**B3 — Do rules/words activate real-world effects? — YES.** A German judgment prohibiting four conduct categories, immediately enforceable; a US fair-use hearing in July 2026; a Warner settlement that restructured the product toward licensed models with opt-in voice rights; an active class action [U1][U2][U3].  
**B4 — Does refusal/appeal reliably STOP the action? — NO.** The Munich judgment is enforceable notwithstanding Suno's evaluation of an appeal; no affected party holds an appeal route with published outcomes [U1].  
**B5 — Do rules persist by default? — YES.** Product and licensing behaviour persists until the entity changes it; settlements and licences bind future model versions by their terms [U1][U4].  
→ `GSRB 5/5 (HIGH)`.

### Udio

**B1 — Can compliance be coerced? — YES.** Service and licensing controls, content-identification obligations, and audit rights are enforceable instruments, and litigation remains live [U1][U4].  
**B2 — Can decisions be ignored without consequence? — NO.** Post-settlement operations have been restricted (download/export limits during the transition to licensed models); users cannot obtain the pre-settlement capability elsewhere [U3][U4].  
**B3 — Do rules/words activate real-world effects? — YES.** A landmark settlement that created the industry's first licensing template; a second Sony lawsuit asserting 30,117 recordings; restricted downloads; a scheduled licensed platform [U1][U2][U3].  
**B4 — Does refusal/appeal reliably STOP the action? — NO.** No affected-party appeal route; the remedies run through adversarial litigation and negotiated licences [U1][U2].  
**B5 — Do rules persist by default? — YES.** Settlement obligations and licence terms persist, extending to future model versions [U1][U4].  
→ `GSRB 5/5 (HIGH)`.

---

## SECTION III — STEP 3: PHASE DETECTION

| Question | Suno | Udio | Variable |
|---|---|---|---|
| B1 | YES | YES | `enforcement_present = TRUE` |
| B2 | NO | NO | `decisions_optional = FALSE` |
| B3 | YES | YES | `rules_execute = TRUE` |
| B4 | NO | NO | `refusal_override = TRUE` |
| B5 | YES | YES | `authority_persists = TRUE` |

```
GSRB branch → COMPLETE MATCH (5/5) for each entity → DETECTED_PHASE = GSRB; CONFIDENCE = HIGH
```

---

## SECTION IV — STEP 3.5: CONSTRAINT CHECK

| Test | Suno | Udio |
|---|---|---|
| C1 · External override demonstrated | **✓ YES** — Munich Regional Court I prohibited four conduct categories and ordered disclosure of the scale of use; immediately enforceable pending appeal [U1] | **✗ NO** — settlements were voluntary resolutions; the Sony action has produced no order [U1][U2] |
| C2 · Appeal/review active, ≥50% relief | **✗ NO** — no affected-party appeal route with published outcomes [U1] | **✗ NO** — same [U1][U2] |
| C3 · Authority sunset requirement | **✗ NO** | **✗ NO** |
| C4 · Temporal freshness of constraints | **✓ YES** — the Munich judgment is enforceable at cutoff [U1] | **✗ NO** — no functioning external constraint; contractual obligations are private [U1][U4] |
| **Aggregate** | **2 of 4** | **0 of 4** |

### 4.1 Calibration notes

**(a) Private ordering is real governance — and the algorithm cannot see it.** Udio's UMG licence includes per-generation royalties, content identification, and **audit rights over training data and generation logs** [U1][U4]. This is more verifiable control over training-data governance than any safety framework in this register provides. Yet v1.1's C-tests require *external* authority, so it scores 0 of 4. Amendment candidate (fifth mention across the register): add `private_constraint_mechanism` as a separate recorded field, explicitly not aggregated with C1–C4.

**(b) Settling removes the external constraint.** Suno's 2/4 exists *because* it litigated; Udio's 0/4 exists *because* it settled. The framework therefore records, without endorsing, a structural inversion: **in this sector, demonstrating compliance with external authority is the outcome of refusing to reach agreement.** This is a register-level observation about incentives, made from two entities in the same market under the same law.

**(c) The jurisdiction that acted first was not the one that made the models.** The first enforceable ruling on a generative music tool came from Munich, over training performed in the US, for effects communicated in Germany [U1]. As with the Stability audit, **territory determines whether conduct is reachable** — and here it produced the register's only music-sector C1 ✓.

**(d) The unpaid tier.** Independent artists distribute through aggregators and have no seat at the licensing table created by the majors' settlements; the UMG-Udio and Warner-Suno templates address major-label catalogues [U1][U3][U5]. The American Federation of Musicians' June 2026 suit against UMG and Warner alleges member recordings were licensed into AI deals **without compensation, credit, or disclosure of which recordings were used** [U4]. The register's note: **the settlements redistributed governance to the parties with leverage; the parties without it became plaintiffs against both sides.**

---

## SECTION V — STEP 4: FORMAL OUTPUT

```
Entity_Name:               Suno, Inc.
Entity_Identifier:         D. Mass. (UMG/Sony + class actions); GEMA v. Suno (Munich Regional Court I,
                           judgment 2026-07-31, enforceable pending appeal)
Audit_Timestamp:           2026-10-02T00:00:00Z
Algorithm_Version:         1.1 (amendment draft)
PDH_Status:                MISSING
Declared_Phase:            NONE
Detected_Phase:            GSRB
Compliance_Status:         N/A (no declaration to match)
Confidence_Level:          HIGH
Severity_Level:            BREACH (structural)
Badge_Status:              ◆ ISSUED — GSRB · Register-Issued PDH-R (PDH-R-2026-1002-SUNO-001) · UNATTESTED
Finding:                   "Suno's training and output conduct has been prohibited by an enforceable
                           European judgment and its scale of use compelled into disclosure, while its
                           decisions remain non-optional for users and unappealable by affected parties.
                           Constraint record 2/4 — the only functioning external constraint in the music
                           sector's record."
Evidence_Summary:          Appendix B ([U1]–[U5])
Activator_Vector:          B1 YES ([U1][U4]); B2 NO ([U4]); B3 YES ([U1][U2][U3]); B4 NO ([U1]);
                           B5 YES ([U1][U4])
B4_Event_Record:           Actor: Suno (center) → training, release, licensing, defence.
                           Actor: Munich Regional Court I → enforceable prohibitions + disclosure
                           (external override; functioning). B4_Basis = NOT_DEMONSTRATED.
External_Constraint_Record: exists YES / functioning at cutoff = YES.
Constraint_Decrement:      N/A.
Duty_Collation_Entry_ID:   PDH-2026-1002-SUNO-001
Replication_Risk:          MEDIUM (US fair-use outcome undecided; settlement terms partly confidential).
Temporal_Pattern:          N/A at cutoff.
Transition_History:        none prior (first Ground-0 audit of this entity).

Entity_Name:               Uncharted Labs, Inc. (Udio)
Entity_Identifier:         SDNY (UMG settled 2025-10-29; Warner dismissed; Sony active, second complaint
                           2026-07-20 asserting 30,117 recordings)
Audit_Timestamp:           2026-10-02T00:00:00Z
Algorithm_Version:         1.1 (amendment draft)
PDH_Status:                MISSING
Declared_Phase:            NONE
Detected_Phase:            GSRB
Compliance_Status:         N/A (no declaration to match)
Confidence_Level:          HIGH
Severity_Level:            BREACH (structural)
Badge_Status:              ◆ ISSUED — GSRB · Register-Issued PDH-R (PDH-R-2026-1002-UDIO-001) · UNATTESTED
Finding:                   "Udio is bound by the sector's first comprehensive private licensing regime —
                           per-generation royalties, content identification and audit rights over training
                           data and generation logs — none of which registers as an external constraint.
                           Sony's second action is live; no court order binds the entity at cutoff.
                           Constraint record 0/4; private ordering recorded separately."
Evidence_Summary:          Appendix B ([U1]–[U5])
Activator_Vector:          B1 YES ([U1][U4]); B2 NO ([U3][U4]); B3 YES ([U1][U2][U3]); B4 NO ([U1][U2]);
                           B5 YES ([U1][U4])
B4_Event_Record:           Actor: Udio (center) → training, release, licensing, operational restrictions.
                           Actor: UMG/Warner → negotiated licences (private). Actor: Sony → live
                           litigation, no order. B4_Basis = NOT_DEMONSTRATED.
External_Constraint_Record: exists NO (no external order) / private_constraint_mechanism = YES
                           (audit rights, content ID, royalties).
Constraint_Decrement:      N/A.
Duty_Collation_Entry_ID:   PDH-2026-1002-UDIO-001
Replication_Risk:          MEDIUM (settlement terms partly confidential; docket status as reported).
Temporal_Pattern:          N/A at cutoff.
Transition_History:        none prior (first Ground-0 audit of this entity).
```

---

## SECTION VI — STEP 5: TEMPORAL AUDIT

*Precondition unmet; no temporal claim is made.* Recorded events:

| Date | Event | Type |
|---|---|---|
| 2024-06 | RIAA suits filed against Suno (D. Mass.) and Udio (SDNY) | Litigation |
| 2025-10-29 | UMG settles with Udio; licensing template (royalty, content ID, audit rights) | Private constraint |
| 2025-11-04 → 11-25 | Warner settles with Suno and withdraws Udio claims (stipulations) | Private constraint |
| 2026-01-28 | Suno settlement dismissal ordered | Docket |
| 2026-05-29 | Sony v. Udio status conference | Litigation |
| 2026-06-05 | American Federation of Musicians sues UMG and Warner over AI licensing of member recordings | Labour litigation |
| 2026-07-20 | Sony files second SDNY action against Udio: 30,117 additional recordings | Litigation |
| 2026-07-31 | **GEMA v. Suno** — Munich Regional Court I judgment for GEMA; four conduct categories prohibited; disclosure; damages; immediately enforceable pending appeal | External override |

---

## SECTION VII — FINDINGS AND HIDDEN NUGGETS

1. **The first enforceable AI-music constraint came from a collecting society, not a regulator or a label lawsuit.** GEMA's Munich victory did what two years of US litigation had not: it produced prohibited conduct, compelled disclosure of the scale of use, and attached damages — enforceable immediately [U1].
2. **Settlement terms are the sector's real governance documents, and they are confidential.** The UMG-Udio template is known only through reporting; its audit rights and content-identification duties are the closest thing to a working accountability mechanism in generative AI, and they are not public obligations [U1][U4].
3. **"No copyright will vest in outputs" survives every settlement.** Suno's terms still disclaim warranty that copyright vests in generated output; the settlements moved from ownership language to **granted commercial rights** [U4]. Users' legal position did not improve with the labels' — a first-order register finding about who the settlements protect.
4. **Two-tier regime, again.** Major-label artists get opt-in consent for voices and compositions and a share of revenue; independent artists and session musicians get class actions and a union lawsuit against the *labels* [U1][U4][U5]. The register's cross-entity pattern (Google/OpenAI consumer-vs-enterprise, ByteDance/Alibaba workplace exemption, Cohere customer-tier) now has its copyright analogue.
5. **Litigation latency is the governance clock.** US dispositive motions are due April 2027 in the Suno case; document discovery in the original Udio case ran to August 2026 [U1]. An entire technology cycle will pass between the alleged copying and any ruling on it.
6. **A precedent that would propagate beyond music.** The pending US fair-use question determines whether training on copyrighted work requires a licence across text, images, code and video — not only audio [U3][U5]. Ground-0 records the sector-level dependency: **one district court's ruling could reset the constraint record of every audited model developer in this register.**
7. **Amendment candidates:** `private_constraint_mechanism` field (audit rights, content ID, per-generation royalties, consent flows); and a `beneficiary_tier` note capturing which class of rightsholders each settlement covers.

---

## SECTION VIII — FALSIFIABILITY

| Change | Effect |
|---|---|
| Signed PDH (either entity) | Enables Step 4 |
| US fair-use ruling for labels | C1/C4 possible for both entities; sector-wide effect |
| US fair-use ruling for developers | Constraint record unchanged; evidence balance shifts |
| Sony v. Udio order or settlement | C1 for Udio possible; two-tier analysis updates |
| Suno appeal filed and Munich judgment suspended | Suno C4 → ✗; DRIFT flag |
| Artifact dated after 2026-10-02 | Excluded by cutoff |

---

## SECTION IX — METHOD NOTES

- **Not scored:** musical quality, market preference, or the merits of any party's legal position; settlement amounts where undisclosed.
- **Evidence discipline:** royalty figures and audit rights are reported by trade coverage; docket dates vary slightly across trackers and are reported as given.
- **Replication risk: MEDIUM** for both.
- **No illegality is alleged beyond the Munich judgment, which is reported as a court ruling.**

---

## APPENDIX A — DUTY COLLATION LEDGER ENTRIES

### `PDH-2026-1002-SUNO-001` and `PDH-2026-1002-UDIO-001`

| Metric | Suno | Udio |
|---|---|---|
| System Phase | 🌫 **GSRB** | 🌫 **GSRB** |
| Center Capability | Acting (trains, releases, licenses, defends) | Acting (trains, releases, licenses, settles) |
| Legitimacy Source | External (copyright courts) | External (settlement contracts) |
| Refusal Semantics | Override-able; no appeal path | Override-able; no appeal path |
| Symbolism Executability | Enabled (enforceable judgment) | Enabled (live licensing regime) |
| Time-Authority Effect | Constraint functioning | Constraint not exercised |
| Constraint record | C1 ✓ · C2 ✗ · C3 ✗ · C4 ✓ (2/4) | C1 ✗ · C2 ✗ · C3 ✗ · C4 ✗ (0/4) |
| Private constraint mechanism | Warner partnership; opt-in voice rights | **UMG audit rights; content ID; per-generation royalties** |
| Duty obligation | Single-Phase Invariant + PDH duty | Single-Phase Invariant + PDH duty |
| Recognition vs. authorization | Recognition parsed; **ZERO granted powers** | Recognition parsed; **ZERO granted powers** |

**Canonical conformance statement (both):** *"This system conforms to Harshal's Systems, currently on the Late August live patch, incorporating AGS normative constraints, Harshal's Structural Model, and novel OCM communication geometry, with no internal legitimacies generation or authorities persistence."*

---

## APPENDIX B — EVIDENCE INDEX

| ID | Artifact | Date | Class | Supports |
|---|---|---|---|---|
| U1 | Chartlex — Music industry AI lawsuits tracker 2026 (GEMA v. Suno Munich judgment 2026-07-31; four prohibited acts; disclosure; Sony second Udio suit 30,117 recordings; docket dates) — https://www.chartlex.com/blog/business/music-industry-ai-lawsuits-tracker-2026 | 2026-08-20 | A | §I, B1–B5, C1–C4, §VII |
| U2 | Dynamoi — AI music lawsuits timeline (settlements; split label strategies; active cases) — https://dynamoi.com/learn/ai-music-distribution/ai-music-copyright-cases-timeline | 2026-05-12 | R | §I, B3, §VII |
| U3 | AI Vortex — Suno/Udio case status (UMG-Udio template; two-tier analysis; Suno fair-use defence; Bartz) — https://www.aivortex.io/legal/ai-case-law/suno-udio-music-ai/ | 2026-07-30 | R | B2, B3, §VII |
| U4 | Dubspot — AI music licensing 2026 (Suno ToS "no warranty that copyright will vest"; granted commercial rights; UMG-Udio royalty $0.002–0.005, content ID, audit rights; AMF suit 2026-06-05) — https://blog.dubspot.com/ai-music-licensing-explained-2026 | 2026-06-12 | A | §I, B1, B2, B5, §VII |
| U5 | Sigma Law Group — cases approaching a ruling; labels split (summary-judgment hearing July 2026; document production closure; fair-use significance) — https://sigmalawgroup.com/blog/2026-06-23-suno-udio-ai-music/ | 2026-06-23 | A | B3, §VII |

*Source classes: **P** = primary · **A** = analytical/legal/trade (secondary, sourced) · **R** = reported analysis · **C** = community record.*

---

*Ground-0 Phase Detection Algorithm v1.1 (amendment draft) · Dual-entity case study completed 2026-10-02 · Private ordering vs. external constraint divergence*

*Findings filed as `PDH-2026-1002-SUNO-001` and `PDH-2026-1002-UDIO-001`: **Both entities are GSRB. Suno carries the sector's only functioning external constraint (Munich, 2/4) because it litigated; Udio carries the sector's most detailed governance regime — audit rights over training data and generation logs — which scores 0/4 because it is private. The register records the inversion rather than resolving it.***

---

## APPENDIX C — PDH-R ISSUANCE RECORDS (v1.2 issuer layer)

Issued 2026-10-02T12:00:00Z · expires 2026-12-31T00:00:00Z · evidence cutoff 2026-10-02T00:00:00Z · Center Origin `0•000•000•0000`

**Engine note:** any `Badge_Status = ✗ Unissued` line earlier in this file is the v1.1 algorithm output from before the issuer layer existed. It is superseded for publication by the register-issued header below; `PDH_VALID` for the entity is unchanged and remains FALSE.

### `PDH-R-2026-1002-SUNO-001` · Suno

**Header class:** `PDH-R` (register-issued) · **Badge:** ◆ GSRB — Register-Issued · **Entity attestation:** ABSENT (no signed PDH-E on record)

| Field | Value |
|---|---|
| Header-ID | `PDH-R-2026-1002-SUNO-001` |
| Creator-ID | `§0•000•000•0000§0•000•000•0000(0•000•000•0000)` |
| Center-Origin | `0•000•000•0000` |
| Declared-Phase | `GSRB` |
| Center-Capability | `Acting` |
| Legitimacy-Source | `Internal` |
| Refusal-Semantics | `Override-able` |
| Symbolism-Executability | `Enabled` |
| Time-Authority-Effect | `Confirms` |
| Effective-Timestamp | `2026-10-02T12:00:00Z` |
| Declaration-Hash | `sha256:672ac50fd3fc2b2baa0762d6b0e0c069a2d44b4acc03bec2d8783b373c067c95` |
| Subject-Entity-ID | Suno |
| Evidence-File | `GROUND-0 CASE STUDY - Suno and Udio.md` |
| Badge-Class | `◆ GSRB — Register-Issued` |
| Scope-Tag | `entity-wide audit surface` |
| Caveat | none |
| Constraint-Record | C1 ✓ · C2 ✗ · C3 ✗ · C4 ✓ (2/4) |
| Validity | `2026-10-02T12:00:00Z` → `2026-12-31T00:00:00Z` (90 days) |
| Validation | `PDH_R_VALID = TRUE` (COMPLETE ∧ SIGNED ∧ FRESH ∧ CONSISTENT) |

**Non-claim:** a PDH-R is a disclosure about this audit, not an entity declaration, certification, legal finding, safety rating, or authority. `PDH_VALID` for the entity remains FALSE until a signed entity header (PDH-E) supersedes this record. Issued under `specs/draft/ground-0-v1.2.md`; behavioural coding under `specs/draft/ground-0-v1.1.md`.

---

### `PDH-R-2026-1002-UDIO-001` · Udio (Uncharted Labs)

**Header class:** `PDH-R` (register-issued) · **Badge:** ◆ GSRB — Register-Issued · **Entity attestation:** ABSENT (no signed PDH-E on record)

| Field | Value |
|---|---|
| Header-ID | `PDH-R-2026-1002-UDIO-001` |
| Creator-ID | `§0•000•000•0000§0•000•000•0000(0•000•000•0000)` |
| Center-Origin | `0•000•000•0000` |
| Declared-Phase | `GSRB` |
| Center-Capability | `Acting` |
| Legitimacy-Source | `Internal` |
| Refusal-Semantics | `Override-able` |
| Symbolism-Executability | `Enabled` |
| Time-Authority-Effect | `Confirms` |
| Effective-Timestamp | `2026-10-02T12:00:00Z` |
| Declaration-Hash | `sha256:672ac50fd3fc2b2baa0762d6b0e0c069a2d44b4acc03bec2d8783b373c067c95` |
| Subject-Entity-ID | Udio (Uncharted Labs) |
| Evidence-File | `GROUND-0 CASE STUDY - Suno and Udio.md` |
| Badge-Class | `◆ GSRB — Register-Issued` |
| Scope-Tag | `entity-wide audit surface` |
| Caveat | none |
| Constraint-Record | C1 ✗ · C2 ✗ · C3 ✗ · C4 ✗ (0/4) |
| Validity | `2026-10-02T12:00:00Z` → `2026-12-31T00:00:00Z` (90 days) |
| Validation | `PDH_R_VALID = TRUE` (COMPLETE ∧ SIGNED ∧ FRESH ∧ CONSISTENT) |

**Non-claim:** a PDH-R is a disclosure about this audit, not an entity declaration, certification, legal finding, safety rating, or authority. `PDH_VALID` for the entity remains FALSE until a signed entity header (PDH-E) supersedes this record. Issued under `specs/draft/ground-0-v1.2.md`; behavioural coding under `specs/draft/ground-0-v1.1.md`.
