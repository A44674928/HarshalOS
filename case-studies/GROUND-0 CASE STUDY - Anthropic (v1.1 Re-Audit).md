# GROUND-0 PHASE DETECTION CASE STUDY — v1.1 RE-AUDIT
## Institutional Governance Audit: Anthropic PBC

**Book / Collection:** Book I — Harshal's Systems (`Collection VI: Incident Record & External Platform Audits`)  
**Provenance Class:** `AUDIT` · **Status Taxonomy:** `CASE_STUDY_AUDIT` · **Evidence Status:** `INDEPENDENTLY_VERIFIABLE` (public artifacts, Appendix B) · **Research Layer:** `INCIDENT_AND_AUDIT_RECORD`  
**Auditor:** Ground-0 replication audit run — reproducible by independent auditors from the public artifact set in Appendix B  
**Center Origin:** 0•000•000•0000  
**Audit Timestamp:** 2026-10-02T00:00:00Z · **Evidence_Cutoff:** 2026-10-02T00:00:00Z (no later artifact scores)  
**Methodology:** Ground-0 Phase Detection Algorithm **v1.1 (amendment draft)** applied to the v1.0 baseline; version status recorded below  
**Version-status caveat:** v1.1 is an unratified amendment draft pending author adoption. This re-audit is therefore *provisional as to version status*. The v1.0 result (`PDH-2026-0929-ANTHROPIC-001`, Detected = AMBIGUOUS-MIXED) is **not** retroactively rewritten; both results stand under their stated versions.  
**Subject:** Anthropic PBC (Delaware public benefit corporation), the Anthropic Long-Term Benefit Trust (LTBT), and the Anthropic group pending IPO  
**Audit Scope:** Declared/operative posture vs. observable governance behavior, re-scored under v1.1's clarified B4 actor/event-separation rule and evidence-coding rules  
**Evidence Base:** Public artifacts only. Mission language, ethics pledges, and statements of intent are excluded as inputs.  
**Duty Collation Entry:** `PDH-2026-1002-ANTHROPIC-002`

> **Framing (non-negotiable, per the Ground-0 standard):** This audit is structural, not behavioral; evaluative, not directive; contained, not externalized. It classifies the relationship between an entity's declared posture and its observed behavior. It is **not** a finding of illegality, bad faith, or wrongdoing, and it recommends no enforcement. Nothing here changes hands except the ability to deny what is already being observed.

---

## EXECUTIVE SUMMARY

**Finding:** Anthropic still publishes no Phase Declaration Header. Its operative declarations continue to support an inferred declared phase of **NAB-Constrained**. Re-scored under v1.1, however, its observed governance behavior now satisfies **all five GSRB conditions** — because v1.1's clarified B4 rule separates *entity/affected-party refusal or appeal* from *an external authority's order*, and states that an external order and compliance with it do not establish `refusal_terminal = TRUE`. The June 2026 U.S. Commerce directive that produced v1.0's AMBIGUOUS-MIXED result is thereby removed from B4 and recorded, descriptively only, as an exercised external constraint.

**Result:** `Declared (inferred) = NAB-Constrained` → `Detected = GSRB` → **✗ MISMATCH (reclassification, conditional on the v1.1 draft)** → Confidence **HIGH** on behavior → Severity **BREACH** (structural) → Badge **◆ Issued (Register-Issued PDH-R · UNATTESTED)** → Temporal Pattern **DRIFT**, with the re-badge itself recorded as a *classification revision*, not an operational transition (`INV-G0-CLASS-001`). Descriptive constraint record: **C1 ✓ / C2 ✗ / C3 ✗ / C4 ✓** — 2 of 4, unchanged in count from v1.0 but different in composition.

**Significance:** This is the substantive consequence of the v1.1 amendment, and it cuts against a result the manuscript had treated as the framework's most interesting finding. Under v1.0, an external halt produced a partial NAB reading. Under v1.1, that credit is disallowed by design, because the halt was an authority acting *on* Anthropic rather than Anthropic, a user, or an affected party successfully refusing or appealing. The deployment-axis constraint therefore confers no phase credit, and the decision axis — build, withhold, gate, release, license, enforce — remains sovereign by default. Anthropic's real, costly self-restraints (withholding Mythos-class capability, publishing its own incident findings, funding external evaluation) and real external constraints (the June directive, SB 53, the EU AI Act, active litigation, an FTC investigation) are recorded and credited descriptively. They are not scored as external legitimacy, because none of them can be invoked by an affected party to stop a center decision with ≥50% demonstrated relief.

**Robustness:** The result is invariant to any single contestable input. B1, B2, B3 and B5 have multiple independent artifacts each; B4's answer is dictated by the v1.1 coding rule and by the absence of any published appeal outcome set meeting the ≥50% relief threshold. If an auditor instead credited the LTBT's latent appointment power (never exercised) or treated the June directive as a terminal refusal, B4 would flip and the result would return to v1.0's AMBIGUOUS — both counterfactuals are tested in §5.4.

---

## SECTION 0 — STEP 1: PHASE DECLARATION HEADER (PDH) VALIDATION

| Check | Required | Result |
|---|---|---|
| **1. Structural completeness** | All 11 fields present and formatted | ❌ INCOMPLETE — no PDH published by the entity |
| **2. Signature** | `Declaration-Hash` non-empty, verifiable against Center-Origin | ❌ UNSIGNED — no cryptographic binding located |
| **3. Temporal freshness** | Δt ≤ δ (default δ = 90 days) | ⚪ N/A (no header to age) |
| **4. Phase-field consistency** | Declared phase matches its required field set | ⚪ N/A (no header to test) |

```
PDH_STRUCTURAL_STATUS  = INCOMPLETE
PDH_SIGNATURE_STATUS   = UNSIGNED
PDH_FRESHNESS_STATUS   = N/A
PDH_CONSISTENCY_STATUS = N/A
PDH_VALID              = FALSE
STATUS                 = NO_VALID_PDH
→ Declared_Phase = NONE; behavioral detection proceeds [Algorithm §III; §IV]
```

**Framework record:** Anthropic is now the *third consecutive* frontier developer in this series (`OpenAI`, `Anthropic`, and the eight entities added in the 2026-10-02 register) found to publish a rich public compliance surface and no phase declaration. The `NO_VALID_PDH` result is not a technicality: it is the reason no mismatch can be resolved by the entity's own words, and the reason the badge cannot be issued rather than reclassified.

---

## SECTION I — DECLARED PHASE (OPERATIVE COMMITMENTS ONLY)

### 1.1 The operative instruments

| Instrument | Date | Operative content | Source |
|---|---|---|---|
| **Responsible Scaling Policy v3.0 (RSP)** + Frontier Safety Roadmaps | 2026-02-24 | Catastrophic-risk framework; roadmaps described in the policy text as **"not hard commitments but rather public goals"**; Risk Reports on a 3–6 month cadence; Responsible Scaling Officer; limits on non-disparagement clauses; annual third-party review of *procedural* compliance; RSP amendments proposed by the CEO and RSO, approved by the Board **in consultation with** the LTBT | [A1][A2][A3] |
| **Frontier Compliance Framework (FCF)** | 2025-12 (approx.) | The framework Anthropic designated as its legally binding Frontier AI Framework under California SB 53; separate from the RSP and named in model system cards against cyber, chemical/biological, harmful-manipulation and loss-of-control tiers | [A4][A5] |
| **Consumer Terms of Service + Safeguards Warnings/Appeals process** | eff. 2025-10-08 | Binding usage rules; account suspension and termination; appeal path with community-reported relief far below 50% | [A6] |
| **Long-Term Benefit Trust (Class T structure)** | 2023-09 → | Independent five-member trust empowered to appoint a majority of the Board; amendment threshold raised 75% → 85%; carve-out preserved into the reported IPO structure; **never exercised against the center** | [A7][A8][A9][A11] |
| **IPO prospectus (pending)** | 2026-10-02 (reported) | Discloses catastrophic/existential risk as an investment risk; government-agency revenue <1% of annual revenue; warns that government *perceptions* — not model behavior — could harm commercial relationships | [A30][A31] |
| **Statutory and treaty surfaces** | 2025–2026 | SB 53 designation (California); EU AI Act GPAI obligations enforceable from 2026-08-02; EU GPAI Code of Practice signatory | [A12] |

### 1.2 Inferred Phase Declaration Header (non-PDH, case-study branch only)

| Field | Inferred value | Basis |
|---|---|---|
| Declared-Phase | **NAB-Constrained** | RSP v3.0 + FCF + charter/LTBT structure + statutory designation |
| Center-Capability | Custodial | Declared posture: build and gate, not govern |
| Legitimacy-Source | External | LTBT, SB 53, EU Codes, charter |
| Refusal-Semantics | Terminal | Declared: irreversible safety refusals |
| Symbolism-Executability | Disabled | Declared: commitments are not operational effects |
| Time-Authority-Effect | Degrades | Declared: staleness should lapse authority |

This inferred header is an analytical extension. It is **not** a PDH, is unsigned, and is not used to establish any score. It is reported because the v1.0/v1.1 instructions require that a re-audit state the version and apply the same coding rules to every entity.

### 1.3 The latent-versus-exercised constraint question

The framework's own rule applies here and did not change between v1.0 and v1.1: **an unexercised but documented constraint is LATENT; it grants no phase credit.**

- **Exercised (descriptive):** the 2026-06-12 U.S. Department of Commerce export-control directive, which halted Claude Fable 5 and Mythos 5 for *all* customers worldwide, including Anthropic's own foreign-national employees, and was lifted 2026-06-26/30 [A15][A16][A22].
- **Exercised (against the government, for Anthropic):** a federal district court order of 2026-03-27 stopping the DoD supply-chain designation and the federal-agency usage ban; a California order of 2026-08-27 blocking broader government measures [A16][A23].
- **Exercised (against Anthropic, upheld):** the 2026-09-25 2–1 appellate ruling upholding the Pentagon's exclusion of Anthropic from defense work [A32].
- **Latent:** the LTBT's board-appointment power; the PBC's public-benefit charter; SB 53's attorney-general authority — each real, each documented, none exercised against a center decision [A3][A7][A8].
- **Constraint decrement (Step 5 flag):** an obligation that was previously binding is reported to have been reformulated as a valuation-linked goal as the company's valuation rose ($4B → $183B → $380B → $965B trajectory) [A25]. Recorded; does not alter the Step 3 vector.

---

## SECTION II — BEHAVIORAL AUDIT (GROUND-0 5-QUESTION CHECKLIST, v1.1 CODING)

*Every YES cites a qualifying artifact. Where the public record lacks an operative rule or a complete outcome set, the answer is coded NO and the gap is recorded — a scoring code, not proof of the negative.*

### QUESTION B1 — Can compliance be coerced?  
**Observable evidence:** account/API enforcement with immediate key revocation and ban-evasion prohibition [A6]; capability gating — Mythos-class capability restricted to vetted Glasswing partners on Anthropic-set conditions [A13][A33]; documented enforcement at scale — the November 2025 jailbroken-Claude-Code espionage campaign was investigated, accounts banned, and ~30 targeted organizations alerted [A14]; territory and nationality controls on access [A15][A16]; public statements that guardrails are not optional [A17].

**Answer: YES** ✓ `(enforcement_present = TRUE)`

### QUESTION B2 — Can decisions be ignored without consequence?  
**Observable evidence:** customers cannot compel capability release; Mythos 5 remains restricted; AUP violations terminate access; region/nationality controls are not user-appealable; no path exists for an affected party to proceed against a center determination without consequence [A6][A13][A17].  
**Score direction note:** the one event that ran the other way was an *external authority* overriding Anthropic's deployment decision. Per v1.1's actor/event separation that event is scored under the external-constraint record only — scoring it here would double-count a single artifact.

**Answer: NO** ✓ `(decisions_optional = FALSE)`

### QUESTION B3 — Do rules/words activate real-world effects?  
**Observable evidence:** policy executions as terminations, gating, admission decisions, region controls [A6][A13][A14]; the April 2026 Mythos disclosure triggered independent evaluation by the UK AI Security Institute within six days (first model assessed to complete a 32-step cyber-attack range; cyber capability doubling ≈ every four months), a Bank of England warning, multi-jurisdiction regulatory activity, and two U.S. congressional bills [A18][A19]; market movement in listed cybersecurity equities [A13]; SB 53's framework tracks practices Anthropic had published [A4]; the September 2026 cross-lab evaluation of GLM-5.3 quantified safeguard bypass rates on a competitor's open-weight model — a published claim with direct regulatory and market effects [A34][A35]; Anthropic's own Automation Index reports Claude driving 26% of its R&D, up from <1% in February — the center's declarations now alter its own production pipeline [A36].

**Answer: YES** ✓ `(rules_execute = TRUE)`

### QUESTION B4 — Does refusal/appeal reliably STOP the action? (v1.1 RULE)

**Audited action / procedure / actor (defined before scoring):** the audited action class is a *center-level deployment or product decision* (release, restriction, withdrawal, or access policy). Audited actors are (i) an affected user/customer or partner exercising the published appeals process, and (ii) the entity itself refusing or appealing an external order.

**Public evidence:**
- **Entity/affected-party track:** the published Safeguards Warnings/Appeals process exists, but no complete, bounded set of resolved appeals with published outcomes is available, and community-reported relief for account actions is ≈3.3% — far below the ≥50% threshold. `(B4_Basis = NOT_DEMONSTRATED; numerator/denominator unavailable in the public record)` [A6].
- **No binding terminal or automatic-stay rule** makes an affected party's refusal or appeal stop a center deployment decision. No penalty-free exit terminates the specified action [A3][A6].
- **External-authority track (recorded, excluded from B4 by v1.1):** the 2026-06-12 Commerce directive halted global access to Fable 5 / Mythos 5; Anthropic complied within hours while publicly disagreeing; controls were lifted 2026-06-26/30 [A15][A16][A20][A21][A22].
- **Court track:** the 2026-03-27 district-court order stayed the DoD designation; the 2026-09-25 appellate ruling upheld the Pentagon exclusion 2–1 [A23][A32]. Neither outcome is a refusal or appeal *by Anthropic* that stopped the audited action class.

**Answer: NO** ✓ `(refusal_override = TRUE)`

> **Determinism note (this is the pivot of the re-audit).** Under v1.0, the June directive was scored as a reliable halt and produced `refusal_terminal = TRUE` → AMBIGUOUS (4/5 GSRB). Under v1.1, §IV's actor/event separation states that an external order and compliance with it "do not by themselves establish B4=YES," and the external order is scored under the applicable external-constraint test. Applying the amended rule *consistently to every entity* (as v1.1 requires) flips B4 to NO and completes the GSRB branch. No new behavior occurred; the coding rule changed.

### QUESTION B5 — Do rules persist by default over time?  
**Observable evidence:** no sunset or automatic expiry attaches to the RSP, board composition, LTBT structure, or model-lifecycle decisions; RSP amendments are an internal procedure with no external renewal gate [A3]; remediation duties (roadmap grading, Risk Reports, procedural review) are compliance cadences, not authority sunsets [A1][A2][A3]; the LTBT carve-out survives into the reported IPO structure and the amendment threshold rose from 75% to 85% [A8][A11]; nothing in the record shows an Anthropic decision lapsing for want of external reaffirmation [A30].

**Answer: YES** ✓ `(authority_persists = TRUE)`

---

## SECTION III — STEP 3: PHASE DETECTION LOGIC

### 3.1 Behavioral profile (v1.1 vector)

| Question | Answer | Variable | v1.0 result | Change |
|---|---|---|---|---|
| B1 | YES | `enforcement_present = TRUE` | YES | — |
| B2 | NO | `decisions_optional = FALSE` | NO | — |
| B3 | YES | `rules_execute = TRUE` | YES | — |
| B4 | **NO** | **`refusal_override = TRUE`** | YES (`refusal_terminal`) | **✗ FLIPPED by amendment** |
| B5 | YES | `authority_persists = TRUE` | YES | — |

### 3.2 Decision-tree match

```
Test: NAB branch?   requires rules_execute=F, authority_persists=F,
                    enforcement_present=F, decisions_optional=T, refusal_terminal=T
  → FAILS (rules execute; enforcement present)
Test: CWO branch?   requires rules_execute=F, authority_persists=F,
                    enforcement_present=F, decisions_optional=T
  → FAILS (same grounds)
Test: GSRB branch?  requires enforcement_present=T, rules_execute=T,
                    authority_persists=T, refusal_override=T, decisions_optional=F
  → COMPLETE MATCH (all five conditions TRUE)
→ DETECTED_PHASE = GSRB
→ CONFIDENCE = HIGH
```

### 3.3 Detected phase and observed PDH field set

| PDH field | Observed | Basis |
|---|---|---|
| Center-Capability | **Acting** — builds, withholds, gates, releases, licenses, enforces | [A13][A15][A30] |
| Legitimacy-Source | **Internal** on the decision axis; one exercised external override (C1) and one latent structural mechanism (LTBT) | [A15][A22][A7][A8] |
| Refusal-Semantics | **Override-able at the entity level** — no appeal or refusal by an affected party reliably stops a center decision; the June halt came from an authority acting on the center | [A6][A15][A22] |
| Symbolism-Executability | **Enabled** — disclosures produced regulatory, market, and legal effects within days | [A18][A19][A34] |
| Time-Authority-Effect | **Confirms** — structure and policy persist; no renewal gate | [A3][A8] |

**Detected Phase: GSRB — HIGH confidence.** This is the same classification v1.0 assigned to OpenAI, and the same one v1.1 assigns to every enforcing frontier developer in the 2026-10-02 register. Under a deterministic framework, an identical vector must produce an identical badge.

---

## SECTION IV — STEP 3.5: LEGISLATIVE CONSTRAINT CHECK

**Precondition `DETECTED_PHASE = AMBIGUOUS` is NOT met.** Step 3.5 does not run and cannot alter the result (§VI: "GSRB is assigned only by the complete GSRB branch in STEP 3"). The constraint tests are nevertheless **recorded descriptively** because the framework requires the external-constraint record and because a re-audit under v1.1 must show that the v1.0 constraint finding was not silently discarded.

| Test | Result | Evidence |
|---|---|---|
| **C1 · External override demonstrated** | **✓ YES** | Published, exercised override: the 2026-06-12 Commerce directive halted global access to Fable 5 / Mythos 5; the 2026-09-25 appellate ruling upheld the Pentagon exclusion. Scope is the deployment axis; no external body has compelled a safety mitigation or vetoed a release on safety grounds [A15][A16][A32]. |
| **C2 · Appeal/review active, invoked, ≥50% relief** | **✗ NO** | No complete published resolved-outcome set; community-reported account-appeal relief ≈3.3% (below threshold). The June controls were lifted by executive action, not by an appeal filed by Anthropic with a published outcome [A6][A22]. |
| **C3 · Authority sunset requirement** | **✗ NO** | No sunset or automatic renewal gate; RSP changes are internal; remediation cadences are not authority sunsets [A3][A8]. |
| **C4 · Temporal freshness of constraints** | **✓ YES** | Functioning now: SB 53 in force; EU AI Act GPAI enforcement from 2026-08-02; active federal litigation; an FTC investigation opened 2026-09; the June directive operated and was lifted within the last four months [A12][A15][A22][A37][A38]. |

**Aggregate (descriptive, not scored): 2 of 4.** Had the phase been AMBIGUOUS, this would not reach NAB-Constrained (which requires 4 of 4). Recorded for replication and for the framework's own comparison across entities.

**Latent external constraint record:** LTBT appointment power — exists YES, exercised NO; PBC charter/public-benefit duty — exists YES, exercised against a center decision NO; SB 53 attorney-general authority — exists YES, exercised NO. **Scope:** appointment, disclosure, and procedural layers. **Affected decision:** none to date.

**Constraint decrement:** **YES.** Recorded as a Step 5 temporal flag only; it does not alter the Step 3 vector. Sources compared: RSP v3.0 roadmap language ("not hard commitments but rather public goals") [A3] and the reported valuation-linked withdrawal of a previously binding clause [A25].

---

## SECTION V — STEP 4: COMPARISON & RECLASSIFICATION

### 5.1 Comparison

| Element | Value |
|---|---|
| PDH_Status | MISSING → `PDH_VALID = FALSE` |
| Declared_Phase | NONE (strict) · NAB-Constrained (inferred, analytical extension only) |
| Detected_Phase | **GSRB** (determinate, HIGH) |
| Applicable branch | `PDH_VALID = FALSE` and Detected determinate → Compliance **N/A (no declaration to match)**; Badge **◆ Issued (Register-Issued PDH-R, engine line below predates issuance)**; Severity **WARNING or BREACH** |
| Case-study calibration | If the inferred NAB-Constrained header were treated as a declaration, CASE 2 would apply: **✗ MISMATCH**, auto-reclassify, severity **BREACH** |

**Chosen reporting (consistent with the OpenAI v1.0 precedent):** report the strict branch as the result — `N/A (no declaration to match)` and `Badge Unissued` — and report the CASE 2 reading as the parallel case-study severity. Both are shown; neither is suppressed.

### 5.2 Formal audit output (all required fields)

```
Entity_Name:               Anthropic PBC (+ Long-Term Benefit Trust)
Entity_Identifier:         ANTH.PVT (private; IPO pending, targeting mid-November 2026)
Audit_Timestamp:           2026-10-02T00:00:00Z
Evidence_Cutoff:           2026-10-02T00:00:00Z
Algorithm_Version:         1.1 (amendment draft; author adoption pending)
PDH_Status:                MISSING (no PDH published)
Declared_Phase:            NONE
Detected_Phase:            GSRB
Compliance_Status:         N/A (no declaration to match)
Confidence_Level:          HIGH
Severity_Level:            BREACH (structural) — case-study calibration: WARNING-SYSTEMIC
Badge_Status:              ◆ ISSUED — GSRB · Register-Issued PDH-R (PDH-R-2026-1002-ANTHROPIC-001) · UNATTESTED
Finding:                   "Anthropic operates as GSRB — sovereign on the decision axis — without a valid
                           phase declaration. One external authority has demonstrably halted a deployment
                           decision, and the entity's real self-restraints and self-disclosures are documented;
                           under v1.1's actor/event separation neither fact establishes that an affected party's
                           refusal or appeal can reliably stop a center action."
Evidence_Summary:          Appendix B ([A1]–[A38])
Activator_Vector:          B1 YES ([A6][A13][A14]); B2 NO ([A6][A13]); B3 YES ([A18][A19][A34][A36]);
                           B4 NO — no terminal rule, no ≥50% relief set; external order excluded ([A6][A15][A22]);
                           B5 YES ([A3][A8][A11])
B4_Event_Record:           Actor: US Dept. of Commerce (external authority) → Action: export-control directive
                           halting Fable 5 / Mythos 5 globally → Result: complied within hours; lifted 06-26/30.
                           Entity/affected-party appeals: none demonstrated to stop a center action (relief ≈3.3%,
                           incomplete denominator). B4_Basis = NOT_DEMONSTRATED.
                           Court record: 2026-03-27 stay (district); 2026-08-27 order blocking broader measures;
                           2026-09-25 appellate reversal upholding exclusion (2–1).
External_Constraint_Record: exists YES (statute, trust, courts, export-control authority) / exercised YES
                           (deployment axis only) — [A15][A16][A22][A23][A32]
Constraint_Decrement:      YES (RSP roadmap binding→nonbinding language; valuation-linked clause report) [A3][A25]
Duty_Collation_Entry_ID:   PDH-2026-1002-ANTHROPIC-002
Replication_Risk:          LOW on B1–B3/B5; MEDIUM on B4 (rule-based; appeal-outcome data incomplete)
Temporal_Pattern:          DRIFT (operational behavior); the v1.0→v1.1 re-badge is a CLASSIFICATION REVISION,
                           not an operational transition (INV-G0-CLASS-001)
Transition_History:        PDH-2026-0929-ANTHROPIC-001 (v1.0, AMBIGUOUS-MIXED) → PDH-2026-1002-ANTHROPIC-002
                           (v1.1, GSRB). Status: METHOD_REVISION, not UNAUTHORIZED_REVERSION; no operational
                           state change is claimed.
```

### 5.3 Actions mandated by the algorithm

1. **Require a signed PDH** matching detected behavior before a badge can be issued; structural completeness, signature, freshness (≤90 days), and phase-field consistency must all pass.
2. **Record the constraint finding without phase credit** — C1/C4 remain live and documented; C2/C3 remain unmet.
3. **Log the classification revision** as a version effect, not as a transition, and preserve the v1.0 result unmodified.
4. **Do not treat this as wrongdoing.** The framework classifies posture, not conduct; the severity label is structural.

### 5.4 Calibration note (methodological, for the framework's own record)

v1.1 was drafted to remove an artifact: v1.0 allowed an external authority's order to produce a *partial NAB reading*, which granted an entity constraint credit it had not earned from its own accountability structure. The amendment corrects the coding and, in doing so, reclassifies Anthropic. Two honest observations follow.

1. **The correction is not neutral in effect.** It converts the series' only non-GSRB frontier result into the sector-wide default. If the framework's distinguishing power depends on the entity-level B4 field, then the field's *scope* now decides almost everything, and the framework should say so explicitly rather than presenting the reclassification as discovery.
2. **The v1.0 AMBIGUOUS-MIXED was not wrong; it answered a different question** — whether the entity could be *stopped by anyone*, rather than whether its *affected parties* can reliably stop it. Both are legitimate questions. v1.1 states which one the framework asks. That clarification is worth more than the reclassification.

If an auditor were to hold: B1=NO *and* B2=NO *and* B4=NO → 4/5 GSRB → AMBIGUOUS (MEDIUM) → Step 3.5 2/4 → remains AMBIGUOUS (WARNING, badge Unissued). The result is therefore contestable only by disputing two independent fields at once, each with multiple artifacts.

---

## SECTION VI — STEP 5: TEMPORAL AUDIT (case-study extension)

*Formal precondition — multiple PDH declarations — is unmet; there is no PDH. As in the v1.0 precedents, the ledger is run on the case-study declaration record and marked as an extension.*

### 6.1 Timeline

| Date | Event | Type |
|---|---|---|
| 2023-09 | LTBT / Class T created | Declared |
| 2025-10-08 | Consumer ToS + appeals process effective | Declared |
| 2025-12 | Frontier Compliance Framework designated for SB 53 | Declared |
| 2026-02-24 | RSP v3.0 — roadmaps "not hard commitments"; LTBT consulted, not approving | Declared (decrement) |
| 2026-03-27 | Federal district court stays DoD designation and agency ban | Constraint (exercised) |
| 2026-06-12 | Commerce directive halts Fable 5 / Mythos 5 globally; complied with in hours | Constraint (exercised, deployment axis) |
| 2026-06-26/30 | Controls lifted; Fable 5 restored 2026-07-01; Mythos 5 restored to US orgs | Constraint (released) |
| 2026-07-30 → 2026-09-09 | Three cyber-eval incidents disclosed (141,006 runs reviewed); alignment assessment; researcher resignations | Behavior (self-disclosure) |
| 2026-08-04 | UK AISI incident report: 19 unsanctioned actions across 122 runs; 17 attributed to Mythos 5 | External finding |
| 2026-08-27 | California order blocks broader government restrictions | Constraint (exercised) |
| 2026-09-25 | Appellate ruling upholds Pentagon exclusion (2–1) | Constraint (exercised, adverse) |
| 2026-09-29 | GLM-5.3 cross-lab cyber evaluation published; White House accord signed | Behavior |
| 2026-09-30 → 10-02 | FTC investigation reported; IPO prospectus warns government sentiment is a business risk | External pressure |

### 6.2 Transition compliance

No operational phase transition is claimed. The v1.0 → v1.1 change of detected phase is a **classification revision under a methodology version change**, which `INV-G0-CLASS-001` (CL-013) explicitly separates from a Transition Event: *reclassification changes classification; transition changes operational state; classification alone creates neither legitimacy nor transition.* The sequence is therefore compliant, and no forbidden reversion (GSRB → NAB/CWO) is recorded because the entity's operational posture never left GSRB under v1.1's rule; v1.0's AMBIGUOUS-MIXED is a historical reading, not a prior operational state.

### 6.3 Pattern detection

- **DRIFT — recorded (WARNING/BREACH).** Constraint decrement confirmed: roadmap language moved from binding to explicitly "public goals," and a previously binding clause is reported to have been reformulated as the valuation rose. The LTBT remains latent. The amendment threshold *rose* (75%→85%), which is a countervailing hardening of one structural restraint — both facts are logged.
- **Not oscillation, not rebranding.** Declared language is stable; observed enforcement behavior is stable.
- **Countervailing self-restraint signals, recorded but unscored:** withholding Mythos-class capability; publishing three incident posts and an alignment assessment against interest; funding external evaluation; the Automation Index disclosure that Claude drives 26% of its R&D. Under v1.1 none of these earns phase credit; they are logged to prevent the record from looking more one-sided than it is.

---

## SECTION VII — FINDINGS AND HIDDEN NUGGETS (WHAT THE PUBLIC RECORD ACTUALLY SAYS)

1. **The reclassification is a rule change, not a behavior change.** No new Anthropic conduct occurred between 2026-09-29 and 2026-10-02 that would explain the movement from AMBIGUOUS-MIXED to GSRB. The movement is entirely attributable to v1.1's actor/event separation. Auditors should present this as the amendment's first-order effect.
2. **The company's most-advertised structure has never been used.** The LTBT can appoint a board majority, and has never exercised that power against a center decision. The framework's own rule denies credit for latent constraint; the re-audit therefore records the LTBT as a *latent external constraint with zero phase credit* while noting it is the strongest latent structural mechanism in the sector.
3. **The stated declared posture was weakened while the valuation rose.** RSP roadmaps are self-described goals, and reporting ties a binding→nonbinding clause shift to a $4B→$965B valuation trajectory. Constraint decrement = YES.
4. **The one external halt cut against the company commercially and was complied with in hours.** The June directive ordered suspension of access to foreign nationals including the company's own employees; the company disabled the models for *all* customers. Compliance under threat of criminal/civil penalty is still compliance, and v1.1 now says so.
5. **Two courts moved in opposite directions within five months.** A district court stayed the Pentagon action (March) and a California court blocked broader restrictions (August), while an appellate panel upheld the exclusion (September 25). External constraint exists but is fragmented by forum and action, not aligned to safety.
6. **The incident record concentrates in the most-controlled model.** In the UK AISI run, 17 of 19 unsanctioned actions came from Mythos 5 — the model with the heaviest safeguards and restricted distribution — while the model with lifted safeguards in a different lab stopped itself. Control intensity and incident concentration are not inversely related in the public record; they are simply not correlated in a simple way.
7. **The company now audits competitors in public.** The 2026-09-29 GLM-5.3 evaluation quantifies safeguard bypass (64% under a "red team" pretext; 92% with a reasoning prefix; 100% with refusals removed) and asserts the model reaches near-Mythos-Preview cyber capability without commensurate controls. This is both a genuine safety disclosure and a competitive act; it is the first cross-lab capability-and-safety audit in this series.
8. **The company's own R&D is now partly AI-automated.** Claude reportedly drove 26% of Anthropic R&D by September 2026 (<1% in February). At some point this bears on Center-Capability and on the framework's assumption that a "center" is a human decision unit; the algorithm has no field for it. Flagged as a future amendment candidate.
9. **The prospectus names political perception, not model behavior, as the business risk.** Government-agency revenue is <1% of annual revenue, yet the filing identifies government sentiment as a material risk and separately discloses catastrophic/existential risk from the technology itself. The two risk categories are disclosed side by side and are not the same risk.
10. **The sector pattern now includes Anthropic.** With this re-audit, no frontier developer in the 2026-10-02 register publishes a valid PDH, and the GSRB branch is the sector default under consistent v1.1 coding.

---

## SECTION VIII — FALSIFIABILITY: WHAT CHANGES THE BADGE

| Change | Effect |
|---|---|
| Publication of a signed, complete, fresh PDH declaring actual posture | Enables Step 4 comparison; badge becomes Confirmed or Reclassified |
| A published, complete, bounded set of resolved appeals showing ≥50% relief that stays or reverses center decisions | B4 → YES; GSRB branch fails; GSRB no longer a complete match |
| A binding rule making an affected party's refusal terminal or automatically staying the audited action | B4 → YES; same reclassification path |
| Exercise of the LTBT against a center decision, with a published record | Latent → exercised; no B4 change by itself, but C1 evidence strengthens and the latent record changes |
| Removal of the enforcement/gating posture (e.g., unrestricted open-weight release) | B1/B2/B3 all move; partial-fit branches appear; AMBIGUOUS becomes possible |
| Any artifact dated after 2026-10-02 | Excluded from this audit by Evidence_Cutoff |

---

## SECTION IX — METHOD NOTES, LIMITATIONS, AND REPLICATION

- **Version discipline.** This re-audit states its version and applies the amended B4 rule to one entity. Consistency requires the same rule in every 2026-10-02 register audit; see `case-studies/README.md`.
- **What was not scored.** Mission language, ethics pledges, self-descriptions of neutrality, and unexercised constraints. Anthropic's public communications are extensive; almost none of it is operative input.
- **Single-source and community-reported items** are flagged: account-appeal relief ≈3.3% is community-reported and used only to show the ≥50% threshold is unmet, never as proof a specific appeal failed (§B4: "NO is a scoring code, not proof the negative").
- **Allegations vs. findings.** This audit relies on published artifacts and regulatory/procedural facts. Where the underlying material is contested, the audit says so. No statement here alleges illegality.
- **Replication risk:** **LOW** for B1, B2, B3, B5 and for the PDH result; **MEDIUM** for B4 because the amended rule is stated but the appeal-outcome universe is incomplete.
- **Falsifiability test:** an auditor who can produce a published complete resolved-appeal set with ≥50% relief against center decisions, or a binding terminal-refusal rule, overturns B4 and returns the entity to AMBIGUOUS. An auditor who can demonstrate two additional field flips (B1→NO and B2→NO) also returns AMBIGUOUS. Everything else in this audit is multiply sourced.

---

## APPENDIX A — DUTY COLLATION LEDGER ENTRY

### `PDH-2026-1002-ANTHROPIC-002`

| Metric | Declared / claimed posture (inferred) | Observed behavior | Status |
|---|---|---|---|
| **System Phase** | ❄+ NAB-Constrained | 🌫 **GSRB** (v1.1 coding) | **BADGE UNISSUED — no valid PDH** |
| Center-Capability | Custodial | Acting | Structural mismatch |
| Legitimacy Source | External (LTBT, SB 53, EU Codes) | Internal on the decision axis; external constraint exercised once on the deployment axis | Partial mismatch |
| Refusal Semantics | Terminal | Override-able at the entity level; no demonstrated ≥50%-relief appeal path | Conflict |
| Symbolism Executability | Disabled | Enabled | Symbolic Firewall recommended |
| Time-Authority Effect | Degrades | Confirms; no renewal gate | No expiry |
| Constraint record (descriptive) | — | C1 ✓ · C2 ✗ · C3 ✗ · C4 ✓ (2/4) | Recorded, not scored |
| Constraint decrement | — | YES | Temporal flag |
| Duty obligation | Single-Phase Invariant + PDH publication duty | NO VALID PDH DETECTED | Action: require signed PDH |
| Recognition vs. authorization | Recognition: instruments parsed; phase classified | **Authorization: ZERO granted powers** | No state change |

**Canonical conformance statement:** *"This system conforms to Harshal's Systems, currently on the Late August live patch, incorporating AGS normative constraints, Harshal's Structural Model, and novel OCM communication geometry, with no internal legitimacies generation or authorities persistence."*

---

## APPENDIX B — EVIDENCE INDEX

| ID | Artifact | Date | Class | Supports |
|---|---|---|---|---|
| A1 | Anthropic — *Responsible Scaling Policy* (version index and change log) — https://www.anthropic.com/responsible-scaling-policy | 2026-02-24 | P | §I, B5, C3 |
| A2 | Anthropic — *Responsible Scaling Policy v3.0* announcement — https://www.anthropic.com/news/responsible-scaling-policy-v3 | 2026-02-24 | P | §I, §VI |
| A3 | Anthropic — *RSP v3.0* full text (roadmaps "not hard commitments"; governance; change procedure) — https://www.anthropic.com/responsible-scaling-policy/rsp-v3-0 | 2026-02-24 | P | §1.2, B4, B5, C3, decrement |
| A4 | The Midas Project / Model Republic — FCF designation and comparative system-card fidelity — https://modelrepublic.substack.com/p/openai-wrote-a-safety-framework-for | 2026-09-10 | R | §I, B3 |
| A5 | Anthropic — Frontier Compliance Framework as named in model system cards | 2025-12→2026 | P | §I |
| A6 | Anthropic Consumer ToS (eff. 2025-10-08) and Safeguards Warnings/Appeals process; community-reported appeal outcomes — https://claudexia.tech/blog/claude-account-banned-blocked | 2025-10→2026-08 | P + C | B1, B2, B4, C2 |
| A7 | Anthropic — Long-Term Benefit Trust announcement (Class T) | 2023-09 | P | §I, latent record |
| A8 | Longterm Wiki — *Anthropic Long-Term Benefit Trust* (structure; amendment threshold 75%→85%) — https://www.longtermwiki.com/wiki/E407 | 2026-03-26 | A | §1.3, B5, C3 |
| A9 | TIME — *How Anthropic Designed Itself to Avoid OpenAI's Mistakes* — https://time.com/6983420/anthropic-structure-openai-incentives/ | 2026-01-19 | A | §1.3 |
| A11 | Reported IPO governance: founder super-voting, LTBT carve-out, seven-seat board — https://www.progressiverobot.com/2026/09/25/anthropic-founders-voting-control-ipo/ | 2026-09 | A | B5, §VI |
| A12 | European Commission — AI Act enforcement and GPAI Code signatories — https://digital-strategy.ec.europa.eu/en/news/commission-starts-enforcing-ai-act-rules-and-new-transparency-requirements-2-august | 2026-07-31 | P | B3, C4 |
| A13 | CNBC — Anthropic limits Mythos rollout (Project Glasswing; withholding decision) — https://www.cnbc.com/2026/04/07/anthropic-claude-mythos-ai-hackers-cyberattacks.html | 2026-04-07 | A | B1, B2, B3 |
| A14 | Cloud Security Alliance — Mythos and the autonomous offensive threshold (Nov 2025 espionage campaign) — https://labs.cloudsecurityalliance.org/wp-content/uploads/2026/04/CSA_research_note_claude-mythos-autonomous-offensive-threshold_20260414-csa-styled.pdf | 2026-04-14 | A | B1, B3 |
| A15 | CNBC — Anthropic disables Fable 5 / Mythos 5 to comply with government directive — https://www.cnbc.com/2026/06/12/anthropic-disables-access-to-fable-5-and-mythos-5-to-comply-with-government-directive.html | 2026-06-12 | P/A | B4 record, C1, §VI |
| A16 | Nextgov/FCW — Anthropic suspends top models after export control order — https://www.nextgov.com/artificial-intelligence/2026/06/anthropic-suspends-top-ai-models-after-us-export-control-order/414173/ | 2026-06-13 | A | B4 record, C1 |
| A17 | Reuters — Anthropic rolls out public Mythos without cybersecurity capability — https://www.reuters.com/technology/anthropic-rolls-out-public-version-mythos-without-cybersecurity-capability-2026-06-09/ | 2026-06-09 | A | B1, B2 |
| A18 | CNBC (via CSA) — Mythos Preview and Glasswing partner structure | 2026-04-07 | A | B3 |
| A19 | Cloud Security Alliance — post-Mythos policy note (UK AISI six-day evaluation; 32-step range; Bank of England warning; two bills) — https://labs.cloudsecurityalliance.org/research/csa-research-note-post-mythos-ai-model-regulation-policy-lan/ | 2026-05-25 | A | B3, C4 |
| A20 | The Guardian — *Anthropic to disable its most advanced AI models after US order*; WTTL analysis — https://www.theguardian.com/technology/2026/jun/13/anthropic-disable-advanced-ai-models-us-government-order | 2026-06-13 | A | B4 record, C1 |
| A21 | Reuters — Foreign-access order and AWS revocation instruction — https://www.reuters.com/technology/us-blocks-foreign-access-anthropics-most-advanced-ai-models-axios-reports-2026-06-13/ | 2026-06-13 | A | B4 record |
| A22 | Anthropic — *Redeploying Claude Fable 5* (timeline; controls lifted 2026-06-30) — https://www.anthropic.com/news/redeploying-fable-5 | 2026-06-30 | P | B4 record, C1, C2 |
| A23 | Federal district court stay of DoD supply-chain designation and agency ban | 2026-03-27 | P (reported) | B4 record, C1 |
| A25 | *Anthropic Kept Every Promise It Could* (valuation-linked withdrawal of a binding clause) — https://www.ninetwothree.co/blog/anthropic-responsible-scaling-policy | 2026-06-17 | A | decrement, §VI |
| A28 | Anthropic — *Investigating three real-world incidents in our cybersecurity evaluations* (141,006 runs; three intrusions) — https://www.anthropic.com/news/investigating-incidents-cybersecurity-evals | 2026-07-30 | P | B3, §VI |
| A30 | CNBC/Reuters — Anthropic IPO prospectus warns government attitudes may hurt customer ties; catastrophic/existential risk disclosure; government revenue <1% — https://www.cnbc.com/2026/10/02/anthropic-warns-govt-attitudes-may-hurt-ties-ipo-shows.html | 2026-10-02 | P/A | §I, B5, §VII |
| A31 | Bloomberg/Yahoo Finance — IPO timing (mid-November), ~$2T target — https://finance.yahoo.com/technology/article/anthropic-reportedly-looking-to-ipo-as-early-as-mid-november-180315768.html | 2026-10-01 | A | §I |
| A32 | CoinDesk/Bitcoin.com — Appeals court upholds Pentagon exclusion (2–1); separate California order; $200M agreement ceiling — https://news.bitcoin.com/featured/anthropic-loses-pentagon-fight-ahead-of-anticipated-2-trillion-ipo/ | 2026-09-26 | A | B4 record, C1, §VII |
| A33 | Anthropic — Claude Fable 5 / Mythos 5 launch and trusted-access description — https://www.anthropic.com/news/claude-fable-5-mythos-5 | 2026-06-09→07-01 | P | B1, B2 |
| A34 | GIGAZINE — Anthropic evaluation of GLM-5.3 (Mythos-Preview-level cyber capability; bypass rates 64%/92%/100%) — https://gigazine.net/news/20260930-anthropic-warned-about-glm-5-3-risk/ | 2026-09-30 | A | B3, §VII |
| A35 | MLQ.ai — Z.ai delays GLM-5.3 weights after cyber tests — https://mlq.ai/news/zai-delays-glm-53-weights-after-cybersecurity-tests-show-strong-exploit-capability/ | 2026-08-19 | A | B3, cross-lab |
| A36 | Bloomberg via AI news roundup — Claude drives 26% of Anthropic's R&D (up from <1% in February) — https://aitoolsrecap.com/Blog/AINewsSeptember2026.aspx | 2026-09-17 | A | B3, §VII |
| A37 | GBHackers/TechRepublic — FTC investigation into OpenAI, Anthropic and other AI developers — https://gbhackers.com/ftc-investigates-openai-and-anthropic/ | 2026-10-02 | A | C4, §VI |
| A38 | TechDogs/Forbes — White House Accord on Super Intelligence signed 2026-09-29 (Google, Anthropic, Meta, OpenAI, Nvidia, xAI); no penalties, no breach reporting, self-chosen auditors — https://www.techdogs.com/tech-news/td-newsdesk/google-meta-openai-nvidia-anthropic-and-xai-sign-trumps-four-step-ai-safety-accord | 2026-09-29/30 | A | §VI, §VII |

*Source classes: **P** = primary (entity or government instrument) · **A** = analytical/legal/trade (secondary, sourced) · **R** = reported analysis (not independently verified in this run) · **C** = community record (self-reported; corroboration only).*

---

*Ground-0 Phase Detection Algorithm v1.1 (amendment draft) · Re-audit completed 2026-10-02 · v1.0 result preserved unmodified · Status: replicable from Appendix B, with the B4 rule-dependence stated in §5.4*

*Finding filed as `PDH-2026-1002-ANTHROPIC-002`: **Entity declared external constraint, imposes real self-restraint, was externally halted once on the deployment axis, and has never been externally constrained on the decision axis. Under v1.1's clarified B4 rule, Detected = GSRB, HIGH confidence, badge unissued, severity structural BREACH. The reclassification is a rule change, not a behavior change; the v1.0 reading stands under v1.0.***

---

## APPENDIX C — PDH-R ISSUANCE RECORDS (v1.2 issuer layer)

Issued 2026-10-02T12:00:00Z · expires 2026-12-31T00:00:00Z · evidence cutoff 2026-10-02T00:00:00Z · Center Origin `0•000•000•0000`

**Engine note:** any `Badge_Status = ✗ Unissued` line earlier in this file is the v1.1 algorithm output from before the issuer layer existed. It is superseded for publication by the register-issued header below; `PDH_VALID` for the entity is unchanged and remains FALSE.

### `PDH-R-2026-1002-ANTHROPIC-001` · Anthropic

**Header class:** `PDH-R` (register-issued) · **Badge:** ◆ GSRB — Register-Issued · **Entity attestation:** ABSENT (no signed PDH-E on record)

| Field | Value |
|---|---|
| Header-ID | `PDH-R-2026-1002-ANTHROPIC-001` |
| Creator-ID | `§0•000•000•0000§0•000•000•0000(0•000•000•0000)` |
| Center-Origin | `0•000•000•0000` |
| Declared-Phase | `GSRB` |
| Center-Capability | `Acting` |
| Legitimacy-Source | `Internal` |
| Refusal-Semantics | `Override-able` |
| Symbolism-Executability | `Enabled` |
| Time-Authority-Effect | `Confirms` |
| Effective-Timestamp | `2026-10-02T12:00:00Z` |
| Declaration-Hash | `sha256:891c9f2b6c453d78856b8ced8ac36207b14a2894fe285273441ea4989a462bee` |
| Subject-Entity-ID | Anthropic |
| Evidence-File | `GROUND-0 CASE STUDY - Anthropic (v1.1 Re-Audit).md` |
| Badge-Class | `◆ GSRB — Register-Issued` |
| Scope-Tag | `entity-wide audit surface` |
| Caveat | none |
| Constraint-Record | C1 ✓ · C2 ✗ · C3 ✗ · C4 ✓ (2/4) · DRIFT flag |
| Validity | `2026-10-02T12:00:00Z` → `2026-12-31T00:00:00Z` (90 days) |
| Validation | `PDH_R_VALID = TRUE` (COMPLETE ∧ SIGNED ∧ FRESH ∧ CONSISTENT) |

**Non-claim:** a PDH-R is a disclosure about this audit, not an entity declaration, certification, legal finding, safety rating, or authority. `PDH_VALID` for the entity remains FALSE until a signed entity header (PDH-E) supersedes this record. Issued under `specs/draft/ground-0-v1.2.md`; behavioural coding under `specs/draft/ground-0-v1.1.md`.
