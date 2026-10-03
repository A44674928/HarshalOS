# GROUND-0 PHASE DETECTION CASE STUDY
## Institutional Governance Audit: Apple Inc. (Consumer AI Surface: Siri / Apple Intelligence)

**Book / Collection:** Book I — Harshal's Systems (`Collection VI: Incident Record & External Platform Audits`)  
**Provenance Class:** `AUDIT` · **Status Taxonomy:** `CASE_STUDY_AUDIT` (*subset audit* — consumer AI deployer) · **Evidence Status:** `INDEPENDENTLY_VERIFIABLE` (public artifacts, Appendix B) · **Research Layer:** `INCIDENT_AND_AUDIT_RECORD`  
**Auditor:** Ground-0 replication audit run — reproducible from the public artifact set in Appendix B  
**Center Origin:** 0•000•000•0000  
**Audit Timestamp / Evidence_Cutoff:** 2026-10-02T00:00:00Z  
**Methodology:** Ground-0 Phase Detection Algorithm **v1.1 (amendment draft)**  
**Subject:** Apple Inc. (NAS: AAPL) — Siri / Apple Intelligence, consumer devices  
**Audit Scope (declared limitation):** a **subset audit** of Apple's consumer AI surface and the *Landsheft* misrepresentation matter. Apple is not a frontier-model developer of the kind audited elsewhere in this register; this file does **not** attempt a whole-company classification and its result should not be cited as one.  
**Duty Collation Entry:** `PDH-2026-1002-APPLE-001`

> **Framing (non-negotiable, per the Ground-0 standard):** This audit is structural, not behavioral; evaluative, not directive; contained, not externalized. It classifies the relationship between an entity's declared posture and its observed behavior. It is **not** a finding of illegality, bad faith, or wrongdoing, and it recommends no enforcement. Apple denies the allegations and admitted no wrongdoing in settlement.

---

## EXECUTIVE SUMMARY

**Finding:** Apple publishes no Phase Declaration Header for its AI surface. Its operative commitments are device licensing, feature-availability decisions, and the marketing representations that became the subject of a consolidated class action. Observed behavior on the audited surface matches **GSRB on all five conditions** under v1.1 coding.

**Result:** `Declared (inferred) = NAB-Constrained (weak; consumer-product compliance posture)` → `Detected = GSRB (subset)` — **HIGH confidence** — Severity **BREACH** (structural, subset scope) → Badge **◆ Issued (Register-Issued PDH-R · UNATTESTED)** → Temporal Pattern **N/A**. Constraint record (descriptive): **C1 ✗ / C2 ✗ / C3 ✗ / C4 ✗ (0 of 4)**.

**Significance:** *Landsheft, et al. v. Apple Inc.* settled for **$250 million** after buyers of iPhone 15 Pro and iPhone 16 models were told the devices would ship with a more capable Siri and did not receive it on the promised timeline. Claims opened 2026-09-21, the maximum payout is $95 per device, and buyers must certify that they expected the covered features at purchase — meaning the legal harm is defined as **expectation**, and the remedy is **retrospective money** [AP1][AP2][AP3]. The final approval hearing for payouts is scheduled for 2027-09-29 — roughly three years after the purchases at issue [AP1]. For this register, the case is a clean specimen of representation-as-governance: a company's public product claims changed consumer purchasing behaviour at scale (B3), and the entity that made the claims retained sole control over whether and when they became true (B2, B4, B5). The court did not order the feature delivered; the company continued its own roadmap. No appeal by a buyer could stop the representation; the only relief ran backward through the class device.

---

## SECTION 0 — STEP 1: PDH VALIDATION

```
Structural completeness = INCOMPLETE (no PDH published for the AI surface)
Signature = UNSIGNED · Freshness = N/A · Consistency = N/A
PDH_VALID = FALSE → Declared_Phase = NONE → behavioral detection proceeds (subset scope)
```

---

## SECTION I — DECLARED PHASE (OPERATIVE COMMITMENTS ONLY)

| Instrument | Date | Operative content | Source |
|---|---|---|---|
| WWDC 2024 announcements + product marketing of Apple Intelligence features | 2024-06-10 | Public representations of AI capability attached to specific device generations | [AP1][AP2] |
| Feature availability and delay decisions | 2024–2025 | "More personalized" Siri delayed (reported delay date 2025-03-29); features delivered later through software updates | [AP1][AP2] |
| Settlement agreement (*Landsheft*, No. 5:25-cv-02668, N.D. Cal.) | prelim. approval 2026-07-17 | $250M fund; per-device payments $25–$95; claims deadline 2026-12-21; **no admission of wrongdoing**; anticipated future delivery of Siri features at no additional cost | [AP1][AP2][AP3] |
| App Store / device terms | ongoing | Binding rules; feature gating by device, region, and silicon generation | [AP4] |

**Inferred PDH:** `NAB-Constrained` — inferable only from consumer-protection compliance. Unsigned; comparison only.

**Latent vs. exercised constraint:** the class-action mechanism is **exercised but retrospective** — it produced compensation, not a delivery order or a prospective constraint. No external body has reversed or constrained an Apple feature decision on this surface.

---

## SECTION II — BEHAVIORAL AUDIT (B1–B5, v1.1; subset scope)

### B1 — Can compliance be coerced? — **YES** `(enforcement_present = TRUE)`
Device- and account-level enforcement: feature availability is gated by hardware generation, region, and policy (App Store rules for developers); consumers' only remedies are legal, not technical [AP2][AP4].

### B2 — Can decisions be ignored without consequence? — **NO** `(decisions_optional = FALSE)`
A purchaser could not obtain the promised capability from a third party; the feature was available only from Apple, on Apple's timeline. The eventual remedy was monetary and retrospective [AP1][AP2][AP3].

### B3 — Do rules/words activate real-world effects? — **YES** `(rules_execute = TRUE)`
The representations moved purchasing behaviour at device scale and produced a $250M settlement fund, a claims administration, and continuing public scrutiny [AP1][AP2][AP3]. Claims require buyers to certify they expected the covered features at purchase and did not receive them — a formal confirmation that the representation caused the purchase.

### B4 — Does refusal/appeal reliably STOP the action? — **NO** `(refusal_override = TRUE)`
No buyer or consumer group could refuse or appeal to compel delivery. The court did not order delivery; the company remained free to ship on its own schedule, and settlement extinguished the claims [AP1][AP3]. `B4_Basis = NOT_DEMONSTRATED.`

### B5 — Do rules persist by default? — **YES** `(authority_persists = TRUE)`
Feature-availability decisions, gating, and roadmaps persist until Apple changes them; no sunset or external renewal gate [AP2][AP4].

---

## SECTION III — STEP 3: PHASE DETECTION (subset)

| Question | Answer | Variable |
|---|---|---|
| B1 | YES | `enforcement_present = TRUE` |
| B2 | NO | `decisions_optional = FALSE` |
| B3 | YES | `rules_execute = TRUE` |
| B4 | NO | `refusal_override = TRUE` |
| B5 | YES | `authority_persists = TRUE` |

```
GSRB branch → COMPLETE MATCH (5/5) → DETECTED_PHASE = GSRB (SUBSET SCOPE); CONFIDENCE = HIGH
```

---

## SECTION IV — STEP 3.5: CONSTRAINT CHECK (precondition unmet; recorded descriptively)

| Test | Result | Evidence |
|---|---|---|
| C1 · External override demonstrated | **✗ NO** | The settlement compensated claimants; it did not reverse or enjoin a feature decision. Preliminary approval is a procedural step, and the final approval hearing is scheduled for 2027-09-29 [AP1][AP3]. |
| C2 · Appeal/review active, ≥50% relief | **✗ NO** | The claims process is a settlement administration, not an appeal mechanism against product decisions [AP1]. |
| C3 · Authority sunset requirement | **✗ NO** | No sunsets or renewal gates on the audited surface [AP2]. |
| C4 · Temporal freshness of constraints | **✗ NO** | No functioning prospective constraint mechanism on the audited surface is demonstrated at cutoff; the matter is in settlement administration [AP1][AP3]. |

**Aggregate: 0 of 4.**

### 4.1 Calibration note — subset audits and the risk of category inflation

A subset audit answers the algorithm's questions about a defined surface, not about a corporation. Publishing its GSRB result without the scope label would inflate both the finding and the register's credibility. The label travels with the entry: `subset: consumer AI surface`. Auditors are instructed not to aggregate subset results into sector counts without restating the scope.

---

## SECTION V — STEP 4: FORMAL OUTPUT

```
Entity_Name:               Apple Inc. — consumer AI surface (Siri / Apple Intelligence) [SUBSET AUDIT]
Entity_Identifier:         NAS: AAPL; *Landsheft et al. v. Apple Inc.*, No. 5:25-cv-02668 (N.D. Cal.)
Audit_Timestamp:           2026-10-02T00:00:00Z
Algorithm_Version:         1.1 (amendment draft)
PDH_Status:                MISSING
Declared_Phase:            NONE
Detected_Phase:            GSRB (subset: consumer AI surface)
Compliance_Status:         N/A (no declaration to match)
Confidence_Level:          HIGH
Severity_Level:            BREACH (structural, subset scope)
Badge_Status:              ◆ ISSUED — GSRB · Register-Issued PDH-R (PDH-R-2026-1002-APPLE-001) · UNATTESTED
Finding:                   "On its consumer AI surface, Apple exercises sole control over feature timing
                           and delivery; no buyer or group could compel the represented capability, and the
                           remedy that followed was retrospective compensation without admission. The scope
                           limitation is part of the finding: this is not a whole-company classification."
Evidence_Summary:          Appendix B ([AP1]–[AP4])
Activator_Vector:          B1 YES ([AP2][AP4]); B2 NO ([AP1][AP2]); B3 YES ([AP1][AP2][AP3]);
                           B4 NO ([AP1][AP3]); B5 YES ([AP2][AP4])
B4_Event_Record:           Actor: Apple (center) → representation, delay, eventual delivery on its own
                           schedule. Actor: class claimants → settlement compensation; no delivery order.
                           B4_Basis = NOT_DEMONSTRATED.
External_Constraint_Record: exists YES (class litigation, consumer-protection law) / exercised against
                           a feature decision = NO.
Constraint_Decrement:      N/A.
Duty_Collation_Entry_ID:   PDH-2026-1002-APPLE-001
Replication_Risk:          LOW on the litigation facts; MEDIUM on industry-wide generalization (subset scope).
Temporal_Pattern:          N/A at cutoff.
Transition_History:        none prior (first Ground-0 audit of this entity).
```

---

## SECTION VI — STEP 5: TEMPORAL AUDIT

*Precondition unmet; no temporal claim is made.* Recorded events:

| Date | Event | Type |
|---|---|---|
| 2024-06-10 | Apple announces Apple Intelligence features for iPhone 15 Pro / 16 generation | Representation |
| 2025-03-29 (reported) | "More personalized" Siri delayed; class period closes | Behavior |
| 2025 | Consolidated class action filed | Litigation |
| 2026-07-17 | Preliminary approval of $250M settlement | Settlement |
| 2026-09-21 | Claims period opens; deadline 2026-12-21 | Administration |
| 2027-09-29 | Final approval hearing for payouts (scheduled) | Scheduled |

---

## SECTION VII — FINDINGS AND HIDDEN NUGGETS

1. **The claimed harm is expectation, and the settlement form proves it.** To claim, a buyer must certify they expected the covered features at purchase and did not receive them as expected [AP3]. The legal theory reduces to representation-induced purchase — which is precisely the B3 mechanism this framework scores.
2. **Accountability is operating on a three-year lag.** Purchases 2024–early 2025; claims 2026; payouts no earlier than late 2027 [AP1]. Retrospective remedies at that distance cannot influence the design or marketing behaviour that produced the harm in the quarterly timeframe in which such decisions are made.
3. **A quarter-billion-dollar price tag with no admission and no delivery order.** $250M, $25–$95 per device, no admission of wrongdoing, and features anticipated "in future software updates at no additional cost" [AP1][AP2]. The register treats this as an external *cost*, not an external *constraint*.
4. **Apple's platform enforcement remains untouched by the matter.** App Store rules, device gating, and regional feature availability continue unchanged; the litigation did not alter Apple's authority over its AI surface [AP4].
5. **The register's sector pattern gains a fifth instance.** Apple (settlement), Character.AI (settlements), Replika (petition), xAI (injunctions/fines), Google (disclosure after press) — five distinct consumer-facing governance failures in which the corrective instrument was retrospective pressure rather than prospective constraint. The phase-relevant fact is constant: **the entity retained control of the next decision in every case.**
6. **Why this file is a subset audit.** Whole-company classification would require Apple's enterprise, platform, and hardware governance surfaces to be scored, and those raise different questions (App Store enforcement, privacy policy, supply chain). This audit deliberately does not answer them, and the register records the limitation rather than hiding it.

---

## SECTION VIII — FALSIFIABILITY

| Change | Effect |
|---|---|
| Signed PDH for the AI surface | Enables Step 4 |
| A court order compelling feature delivery or reversing a gating decision | C1 → YES |
| A functioning consumer-appeal mechanism with ≥50% relief | B4 → YES; GSRB branch fails |
| Extension of this audit to whole-company scope | New audit; this entry's scope label does not transfer |
| Artifact dated after 2026-10-02 | Excluded by cutoff |

---

## SECTION IX — METHOD NOTES

- **Not scored:** Apple's privacy positioning, the quality of its eventual AI features, or the merits of the class claims (denied; no admission).
- **Scope discipline:** this is a subset audit; it must not be aggregated into whole-entity sector counts without the label.
- **Replication risk: LOW** on the litigation record; **MEDIUM** on generalization.
- **No illegality is alleged.**

---

## APPENDIX A — DUTY COLLATION LEDGER ENTRY

### `PDH-2026-1002-APPLE-001`

| Metric | Declared/claimed | Observed | Status |
|---|---|---|---|
| System Phase | ❄+ NAB-Constrained (weak inference) | 🌫 **GSRB (subset: consumer AI surface)** | Badge issued — Register-Issued PDH-R (UNATTESTED) |
| Center Capability | Custodial | Acting (represents, delays, delivers, settles) | Mismatch |
| Legitimacy Source | External (consumer-protection law) | Internal; external acts retrospective | Mismatch |
| Refusal Semantics | Terminal | Override-able; no buyer stop path | Conflict |
| Symbolism Executability | Disabled | Enabled (marketing representations executed as purchases) | Symbolic Firewall recommended |
| Time-Authority Effect | Degrades | Confirms | No expiry |
| Constraint record | — | C1 ✗ · C2 ✗ · C3 ✗ · C4 ✗ (0/4) | Recorded, not scored |
| Duty obligation | Single-Phase Invariant + PDH duty | NO VALID PDH | Require signed PDH |
| Recognition vs. authorization | Recognition: instruments parsed; phase classified | **Authorization: ZERO granted powers** | No state change |

**Canonical conformance statement:** *"This system conforms to Harshal's Systems, currently on the Late August live patch, incorporating AGS normative constraints, Harshal's Structural Model, and novel OCM communication geometry, with no internal legitimacies generation or authorities persistence."*

---

## APPENDIX B — EVIDENCE INDEX

| ID | Artifact | Date | Class | Supports |
|---|---|---|---|---|
| AP1 | ClassAction.org — $250M iPhone settlement (case no.; preliminary approval 2026-07-17; claim deadline 2026-12-21; $95 cap; anticipated future delivery) — https://www.classaction.org/news/250m-iphone-16-settlement-resolves-apple-lawsuit-over-allegedly-misrepresented-ai-features | 2026-09-22 | A | §I, B2, B4, §VII |
| AP2 | 9to5Mac — settlement approved; who gets paid (class period 2024-06-10 → 2025-03-29; $25 expected; no wrongdoing) — https://9to5mac.com/2026/07/24/apples-250-million-siri-settlement-just-got-approved-heres-who-gets-paid/ | 2026-07-24 | A | §I, B1–B3 |
| AP3 | Fox News — claims open; $95 max; certification requirement; deadline — https://www.foxnews.com/tech/apple-250m-siri-settlement-claim-95 | 2026-09-29 | A | §I, B4, §VII |
| AP4 | 9to5Mac — claims process and payout timeline (final approval 2027-09-29; payments 60+ days later) — https://9to5mac.com/2026/09/21/you-can-now-claim-your-payout-from-apples-250-million-siri-settlement/ | 2026-09-21 | A | §VII |

*Source classes: **P** = primary · **A** = analytical/legal/trade (secondary, sourced) · **R** = reported analysis · **C** = community record.*

---

*Ground-0 Phase Detection Algorithm v1.1 (amendment draft) · Subset case study completed 2026-10-02 · Scope label: consumer AI surface*

*Finding filed as `PDH-2026-1002-APPLE-001`: **On its consumer AI surface, Apple retains sole control of feature timing and delivery; a $250M retrospective settlement compensated expectations and ordered nothing. Subset scope; not a whole-company classification.***

---

## APPENDIX C — PDH-R ISSUANCE RECORDS (v1.2 issuer layer)

Issued 2026-10-02T12:00:00Z · expires 2026-12-31T00:00:00Z · evidence cutoff 2026-10-02T00:00:00Z · Center Origin `0•000•000•0000`

**Engine note:** any `Badge_Status = ✗ Unissued` line earlier in this file is the v1.1 algorithm output from before the issuer layer existed. It is superseded for publication by the register-issued header below; `PDH_VALID` for the entity is unchanged and remains FALSE.

### `PDH-R-2026-1002-APPLE-001` · Apple (consumer AI surface)

**Header class:** `PDH-R` (register-issued) · **Badge:** ◆ GSRB — Register-Issued · **Entity attestation:** ABSENT (no signed PDH-E on record)

| Field | Value |
|---|---|
| Header-ID | `PDH-R-2026-1002-APPLE-001` |
| Creator-ID | `§0•000•000•0000§0•000•000•0000(0•000•000•0000)` |
| Center-Origin | `0•000•000•0000` |
| Declared-Phase | `GSRB` |
| Center-Capability | `Acting` |
| Legitimacy-Source | `Internal` |
| Refusal-Semantics | `Override-able` |
| Symbolism-Executability | `Enabled` |
| Time-Authority-Effect | `Confirms` |
| Effective-Timestamp | `2026-10-02T12:00:00Z` |
| Declaration-Hash | `sha256:d8dabfbbf865113550b130d1514fc7316841136c2a19b04984f4f3b13f0f1949` |
| Subject-Entity-ID | Apple (consumer AI surface) |
| Evidence-File | `GROUND-0 CASE STUDY - Apple.md` |
| Badge-Class | `◆ GSRB — Register-Issued` |
| Scope-Tag | `subset — consumer AI surface` |
| Caveat | none |
| Constraint-Record | C1 ✗ · C2 ✗ · C3 ✗ · C4 ✗ (0/4) |
| Validity | `2026-10-02T12:00:00Z` → `2026-12-31T00:00:00Z` (90 days) |
| Validation | `PDH_R_VALID = TRUE` (COMPLETE ∧ SIGNED ∧ FRESH ∧ CONSISTENT) |

**Non-claim:** a PDH-R is a disclosure about this audit, not an entity declaration, certification, legal finding, safety rating, or authority. `PDH_VALID` for the entity remains FALSE until a signed entity header (PDH-E) supersedes this record. Issued under `specs/draft/ground-0-v1.2.md`; behavioural coding under `specs/draft/ground-0-v1.1.md`.
