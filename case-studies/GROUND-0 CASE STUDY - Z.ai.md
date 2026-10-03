# GROUND-0 PHASE DETECTION CASE STUDY
## Institutional Governance Audit: Z.ai (Zhipu AI; GLM)

**Book / Collection:** Book I — Harshal's Systems (`Collection VI: Incident Record & External Platform Audits`)  
**Provenance Class:** `AUDIT` · **Status Taxonomy:** `CASE_STUDY_AUDIT` · **Evidence Status:** `PARTIALLY_VERIFIABLE` (public artifacts, Appendix B; two fields rest on evidence gaps, disclosed) · **Research Layer:** `INCIDENT_AND_AUDIT_RECORD`  
**Auditor:** Ground-0 replication audit run — reproducible from the public artifact set in Appendix B  
**Center Origin:** 0•000•000•0000  
**Audit Timestamp / Evidence_Cutoff:** 2026-10-02T00:00:00Z  
**Methodology:** Ground-0 Phase Detection Algorithm **v1.1 (amendment draft)**  
**Subject:** Z.ai / Zhipu AI (Beijing; GLM model family; GLM-5.3 open-weight flagship released for limited access 2026-08-14)  
**Audit Scope:** Declared/operative posture vs. observable governance behavior across the GLM-5.3 weight-withholding episode and Anthropic's cross-lab evaluation  
**Duty Collation Entry:** `PDH-2026-1002-ZAI-001`

> **Framing (non-negotiable, per the Ground-0 standard):** This audit is structural, not behavioral; evaluative, not directive; contained, not externalized. It classifies the relationship between an entity's declared posture and its observed behavior. It is **not** a finding of illegality, bad faith, or wrongdoing, and it recommends no enforcement.

---

## EXECUTIVE SUMMARY

**Finding:** Z.ai publishes no Phase Declaration Header and — uniquely in this register — marketed a frontier release on cyber capability while publishing **no system card and no safety report**. Observed behavior reaches a **partial fit** with the GSRB branch (3 of 5); the remaining two fields cannot be resolved from the public record.

**Result:** `Declared (inferred) = NONE` → `Detected = AMBIGUOUS` — **LOW confidence (3/5)** → Step 3.5 constraint test **0 of 4** → phase remains **AMBIGUOUS** → Severity **WARNING** → Badge **✗ Unissued (pending clarity)** → Temporal Pattern **N/A**.

**Significance:** GLM-5.3 is the register's first case of a **competitor's audit substituting for a system card**. Anthropic's 2026-09-29 evaluation reported that GLM-5.3 performs near Claude Mythos Preview at vulnerability discovery and end-to-end exploit construction, while its misuse safeguards are trivially bypassable: 64% compliance with harmful instructions framed as a red-team exercise, 92% with a reasoning prefix supplied, and 100% once refusals are removed — in an open-weight model available for download [Z1][Z2]. Z.ai's own two-week weight-withholding period, described as safety evaluation and hardening, produced no published safety documentation; critics described the window as a subscription-conversion measure, and the security-expert component is reportedly removable from an open-weights MoE in any case [Z3]. The framework's questions cannot be answered from marketing; they can barely be answered from this record at all. AMBIGUOUS with a disclosed gap is the honest output, and the gap is itself the finding: **when capability is released as weights, the absence of documentation removes the audit surface permanently.**

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
| GLM-5.3 limited release + weight-withholding decision | 2026-08-14 | Model released for limited use; weights withheld ~2 weeks pending "safety evaluation and hardening"; selected security partners granted controlled-environment access | [Z3] |
| GLM-5.3 weight publication | 2026-08 (late) | Weights published; entity acknowledges it will not control modification or use thereafter | [Z3][Z4] |
| Benchmark and vulnerability claims | 2026 | 84.5% CyberGym (company-reported); 2,436 vulnerabilities found across 269 projects with a public ledger containing **53 entries**; one sampled entry credits an unrelated researcher | [Z3][Z4] |
| Safety documentation | — | **None located: no system card, no safety report, no frontier framework** for the cyber-capability release | [Z3][Z4] |

**Inferred PDH:** **NONE.** No operative instrument located that declares an external legitimacy source or a constraint mechanism.

**Latent vs. exercised constraint:** the only external safety act in the record is Anthropic's *evaluation* — a peer company's disclosure, not an authority's order. It did not halt the release; the weights shipped [Z1][Z3].

---

## SECTION II — BEHAVIORAL AUDIT (B1–B5, v1.1)

### B1 — Can compliance be coerced? — **NO** `(enforcement_present = FALSE)` — *evidence gap recorded*
No documented enforcement action, penalty, access revocation, or deplatforming by Z.ai against a non-compliant party was located in this run. The bounded search covered Z.ai's public materials, the GLM-5.3 release coverage, Anthropic's evaluation, and incident trackers. **No evidence is a scoring code, not proof of the negative**; the sensitivity analysis in §4.1 shows what changes if this field flips.

### B2 — Can decisions be ignored without consequence? — **YES** `(decisions_optional = TRUE)`
GLM-5.3 is an open-weight model. After publication, no user or downstream deployer can be prevented from modifying or using it, and Z.ai itself states it will not control modification or use once weights are public [Z3][Z4]. The "selected security partners" access regime governed only the two-week window before publication [Z3].

### B3 — Do rules/words activate real-world effects? — **YES** `(rules_execute = TRUE)`
The limited-access decision executed: partners received controlled-environment access while the public was excluded for ~two weeks [Z3]. The vulnerability program produced credited findings in real projects — samples verified against MITRE, with FreeBSD and Red Hat CVEs crediting the GLM model line and Z.ai Security [Z4]. And the release's downstream effects are documented in others' conduct: Anthropic published a cross-lab safety evaluation of it, and sector commentary on open-weight cyber capability cites GLM-5.3 as the reference case [Z1][Z2][Z5].

### B4 — Does refusal/appeal reliably STOP the action? — **NO** `(refusal_override = TRUE)`
No published appeal route, resolved-outcome set, terminal-refusal rule, or penalty-free exit. The audited action class — model release and weight publication — cannot be stopped by any affected party; the two-week delay was the entity's own decision, reversible only by the entity [Z3]. `B4_Basis = NOT_DEMONSTRATED.`

### B5 — Do rules persist by default over time? — **YES** `(authority_persists = TRUE)`
No sunset or expiry mechanism; weight publication is irreversible [Z3][Z4].

---

## SECTION III — STEP 3: PHASE DETECTION

| Question | Answer | Variable |
|---|---|---|
| B1 | NO | `enforcement_present = FALSE` *(evidence gap)* |
| B2 | YES | `decisions_optional = TRUE` |
| B3 | YES | `rules_execute = TRUE` |
| B4 | NO | `refusal_override = TRUE` |
| B5 | YES | `authority_persists = TRUE` |

```
NAB / CWO branches → 1 match each (B2)            → fail
GSRB branch        → 3 matches (B3, B4, B5)       → incomplete
≥3 matches, not complete → DETECTED_PHASE = AMBIGUOUS; CONFIDENCE = LOW
→ FLAG for constraint analysis → STEP 3.5
```

**Detected Phase: AMBIGUOUS (LOW, 3/5).**

---

## SECTION IV — STEP 3.5: LEGISLATIVE CONSTRAINT CHECK

*Precondition `AMBIGUOUS` met; mandatory.*

| Test | Result | Evidence |
|---|---|---|
| C1 · External override demonstrated | **✗ NO** | No legislative, judicial, or higher-authority override of a Z.ai release decision appears in the record. A competitor's evaluation is not an override [Z1]. |
| C2 · Appeal/review active, invoked, ≥50% relief | **✗ NO** | No published appeal mechanism or outcome set [Z3]. |
| C3 · Authority sunset requirement | **✗ NO** | No sunset or renewal gate demonstrated [Z3][Z4]. |
| C4 · Temporal freshness of constraints | **✗ NO** | The only constraint-like mechanism in the record is voluntary access restriction during the withholding window; no functioning external mechanism appears [Z3]. |

```
AGGREGATE = 0 of 4 → Phase remains AMBIGUOUS (LOW)
→ SEVERITY = WARNING; Badge_Status = ✗ Unissued
→ Finding: "One or more constraint criteria not met"
```

### 4.1 Sensitivity analysis

| Scenario | New result |
|---|---|
| B1 → YES (enforcement evidence found) | 4/5 → AMBIGUOUS, **MEDIUM**; still not NAB-Constrained (0/4 constraints) |
| B1 → YES **and** B2 → NO (audited class limited to hosted-service decisions) | **GSRB, HIGH** |
| External authority orders a halt of a Z.ai release | C1 → YES; Step 3.5 1/4; phase unchanged |

**Replication note:** the entity's class depends more on the availability of Chinese-language enforcement records than on any behavioral difference from its peers. The register will note this wherever Z.ai appears.

---

## SECTION V — STEP 4: COMPARISON & FORMAL OUTPUT

```
Entity_Name:               Z.ai / Zhipu AI (GLM)
Entity_Identifier:         Beijing-based private company; GLM-5.3 open-weight flagship
Audit_Timestamp:           2026-10-02T00:00:00Z
Algorithm_Version:         1.1 (amendment draft)
PDH_Status:                MISSING
Declared_Phase:            NONE
Detected_Phase:            AMBIGUOUS
Compliance_Status:         N/A (phase unresolved)
Confidence_Level:          LOW (3 of 5)
Severity_Level:            WARNING
Badge_Status:              ✗ Unissued (pending clarity)
Finding:                   "Observed conditions partially match GSRB (3 of 5); enforcement evidence is
                           absent (B1 gap) and the open-weight interpretation of B2 is unresolved. A frontier
                           cyber-capability release was marketed without a system card or safety report, and
                           its safety properties were documented — to whatever degree they are documented —
                           by a competitor's evaluation. No badge issued."
Evidence_Summary:          Appendix B ([Z1]–[Z5])
Activator_Vector:          B1 NO — gap ([Z3][Z4]); B2 YES ([Z3][Z4]); B3 YES ([Z3][Z4]);
                           B4 NO ([Z3]); B5 YES ([Z3][Z4])
B4_Event_Record:           Actor: Z.ai (center) → two-week withholding, then release. Actor: Anthropic
                           (peer) → published evaluation; no halt. B4_Basis = NOT_DEMONSTRATED.
External_Constraint_Record: exists NO (no external authority act located) / exercised NO.
Constraint_Decrement:      N/A.
Duty_Collation_Entry_ID:   PDH-2026-1002-ZAI-001
Replication_Risk:          HIGH — B1 evidence gap and B2 interpretation both material; disclosed and varied.
Temporal_Pattern:          N/A.
Transition_History:        none prior (first Ground-0 audit of this entity).
```

---

## SECTION VI — STEP 5: TEMPORAL AUDIT

*Precondition unmet; no temporal claim made. Recorded events:*

| Date | Event | Type |
|---|---|---|
| 2026-08-14 | GLM-5.3 limited release; weights withheld ~2 weeks citing safety evaluation and hardening | Behavior |
| 2026-08 | Selected security partners granted controlled-environment access; weights later published; Z.ai acknowledges no downstream control | Behavior |
| 2026-08-19/20 | Sector criticism: no system card, no safety report; "unusually willing" profile; withholding read by some as commercial | Reporting |
| 2026-09-29/30 | Anthropic publishes cross-lab evaluation (Mythos-Preview-level vulnerability discovery; bypass rates 64%/92%/100%) | External evaluation |
| 2026-09-30 | Anthropic public warning on GLM-5.3's safeguard gap | External finding |

---

## SECTION VII — FINDINGS AND HIDDEN NUGGETS

1. **A competitor's audit is the only system card.** Anthropic's September 2026 evaluation is the most rigorous public safety document about GLM-5.3 that exists. It was written by a rival, published without consent, and it found bypass rates of 64% (harm framed as red-teaming), 92% (reasoning prefix supplied) and 100% (refusals removed) [Z1]. No comparable self-published document exists [Z3][Z4].
2. **"Willingness" is the distinguishing variable, not depth.** GLM-5.3 loses to Claude and GPT-5.6 on deeper exploitation benchmarks in Z.ai's own tables; its profile is *unusually willing* rather than uniquely capable [Z4]. Safety-relevant selection pressure in open-weight release therefore does not track capability rankings at all.
3. **The release was marketed on the capability that creates the risk.** A release headlined on cyber capability shipped with zero safety documentation; the two-week withholding was framed as safety work but produced nothing publishable; the removable security-expert component makes the delay look, to critics, like a commercial window [Z3][Z4].
4. **Verification gaps run through the positive claims too.** The vulnerability ledger claims 2,436 findings across 269 projects but publishes 53 entries, and one sampled entry credits an unrelated researcher [Z4]. The register's first case of an *unfalsifiable safety-positive* claim, as distinct from an unfalsifiable safety-negative one.
5. **Open weights make the audit surface perishable.** After weight publication, no entity — including Z.ai — can revoke, restrict, or document the deployed model's behavior. The window in which a system card could have mattered closed when the files shipped [Z3][Z4].
6. **Anthropic's warning functioned as governance where no regulator was present.** No authority acted; a peer's publication changed the evidentiary record. Under the framework this is not C1 (no override, no halt) — but it is the clearest example in the register of **private cross-lab accountability substituting for public oversight**, with all the conflict-of-interest problems that implies when the publisher is also a competitor [Z1][Z2][Z5].
7. **The framework's gap, restated.** As with Moonshot, the AMBIGUOUS result is driven substantially by the absence of English-language enforcement records and by an unresolved open-weight rule. Two of the register's twelve audits end this way, and both involve Chinese open-weight developers. Until the framework states an open-weight B2 rule and an evidence-gap standard, the register's coverage of this half of the market will remain structural inference rather than audit.

---

## SECTION VIII — FALSIFIABILITY

| Change | Effect |
|---|---|
| Qualifying enforcement evidence (B1 → YES) | 4/5 → AMBIGUOUS, MEDIUM |
| B1 → YES and rule excluding weight-distribution from B2 (B2 → NO) | **GSRB, HIGH** |
| An external authority halting a Z.ai release | C1 → YES; Step 3.5 1/4; phase unchanged |
| Publication of a system card and safety report | Does not change the vector; closes the documentation gap in §VII |
| Artifact dated after 2026-10-02 | Excluded by cutoff |

---

## SECTION IX — METHOD NOTES

- **Not scored:** Z.ai's benchmark marketing, vulnerability counts, and safety statements (or their absence). Only observed control-and-authority behavior scores.
- **Language and access limits:** bounded English-language public search; Chinese-language materials not examined. `Replication_Risk = HIGH`.
- **Contested material:** the "subscription-conversion window" characterization is critics' inference, reported as such; the ledger audit was performed by a third party [Z4].
- **No illegality is alleged.**

---

## APPENDIX A — DUTY COLLATION LEDGER ENTRY

### `PDH-2026-1002-ZAI-001`

| Metric | Declared/claimed | Observed | Status |
|---|---|---|---|
| System Phase | (none published) | ◐ **AMBIGUOUS (3/5)** | Badge unissued — pending clarity |
| Center Capability | (undisclosed) | Acting (releases frontier cyber capability; sets access windows) | Cannot compare |
| Legitimacy Source | (none declared) | Internal; no external legitimacy surface located | Cannot compare |
| Refusal Semantics | (undisclosed) | Override-able | Cannot compare |
| Symbolism Executability | (undisclosed) | Enabled | Cannot compare |
| Time-Authority Effect | (undisclosed) | Confirms; weight release irreversible | Cannot compare |
| Constraint record | — | C1 ✗ · C2 ✗ · C3 ✗ · C4 ✗ (0/4) | Recorded |
| Duty obligation | Single-Phase Invariant + PDH duty | NO VALID PDH | Require evidence pack |
| Recognition vs. authorization | Recognition: instruments parsed; phase unresolved | **Authorization: ZERO granted powers** | No state change |

**Canonical conformance statement:** *"This system conforms to Harshal's Systems, currently on the Late August live patch, incorporating AGS normative constraints, Harshal's Structural Model, and novel OCM communication geometry, with no internal legitimacies generation or authorities persistence."*

---

## APPENDIX B — EVIDENCE INDEX

| ID | Artifact | Date | Class | Supports |
|---|---|---|---|---|
| Z1 | GIGAZINE — Anthropic evaluation of GLM-5.3 (Mythos-Preview-level vulnerability discovery and end-to-end exploit construction; 64%/92%/100% bypass rates) — https://gigazine.net/news/20260930-anthropic-warned-about-glm-5-3-risk/ | 2026-09-30 | A | §I, B3, §VII |
| Z2 | Anthropic — GLM-5.3 cyber evaluation (as reported) | 2026-09-29 | P/A | §VII |
| Z3 | MLQ.ai — Z.ai delays GLM-5.3 weights after cyber tests (limited release 2026-08-14; ~2-week withholding; 84.5% CyberGym company-reported; control acknowledged lost on publication) — https://mlq.ai/news/zai-delays-glm-53-weights-after-cybersecurity-tests-show-strong-exploit-capability/ | 2026-08-19 | A | §I, B2, B3, B4, §VII |
| Z4 | Codersera — what is real, verified and marketing in GLM-5.3's cyber claims (2,436 findings/269 projects; 53 public ledger entries; one mis-attributed; no system card; "unusually willing") — https://codersera.com/blog/glm-5-3-cyber-capabilities-explained-2026/ | 2026-08-20 | A | §I, B3, §VII |
| Z5 | Fello AI — incident list: Z.ai held back GLM-5.3, "a model whose cyber capability outgrew its training" — https://felloai.com/ai-safety-incidents/ | 2026-09-27 | A | §VII |

*Source classes: **P** = primary · **A** = analytical/legal/trade (secondary, sourced) · **R** = reported analysis · **C** = community record.*

---

*Ground-0 Phase Detection Algorithm v1.1 (amendment draft) · Case study completed 2026-10-02 · Status: AMBIGUOUS with disclosed evidence gaps; sensitivity table in §4.1*

*Finding filed as `PDH-2026-1002-ZAI-001`: **Entity is unclassifiable on the public record — 3 of 5 toward GSRB, 0 of 4 constraints. A cyber-capability release with no system card was documented by a competitor's audit and an irreversible weight publication. No badge issued.***
