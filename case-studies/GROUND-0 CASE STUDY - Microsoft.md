# GROUND-0 PHASE DETECTION CASE STUDY
## Institutional Governance Audit: Microsoft Corporation (Microsoft AI / Copilot)

**Book / Collection:** Book I — Harshal's Systems (`Collection VI: Incident Record & External Platform Audits`)  
**Provenance Class:** `AUDIT` · **Status Taxonomy:** `CASE_STUDY_AUDIT` · **Evidence Status:** `INDEPENDENTLY_VERIFIABLE` (public artifacts, Appendix B) · **Research Layer:** `INCIDENT_AND_AUDIT_RECORD`  
**Auditor:** Ground-0 replication audit run — reproducible from the public artifact set in Appendix B  
**Center Origin:** 0•000•000•0000  
**Audit Timestamp / Evidence_Cutoff:** 2026-10-02T00:00:00Z  
**Methodology:** Ground-0 Phase Detection Algorithm **v1.1 (amendment draft)**  
**Subject:** Microsoft Corporation (NAS: MSFT) — Microsoft AI, Microsoft 365 Copilot, Copilot Studio, Copilot Chat  
**Audit Scope:** Declared/operative posture vs. observable governance behavior across the Copilot security and data-exposure record  
**Duty Collation Entry:** `PDH-2026-1002-MICROSOFT-001`

> **Framing (non-negotiable, per the Ground-0 standard):** This audit is structural, not behavioral; evaluative, not directive; contained, not externalized. It classifies the relationship between an entity's declared posture and its observed behavior. It is **not** a finding of illegality, bad faith, or wrongdoing, and it recommends no enforcement.

---

## EXECUTIVE SUMMARY

**Finding:** Microsoft publishes no Phase Declaration Header. Its operative commitments are enterprise contracts, service terms, the Microsoft Responsible AI Standard, and CAISI participation. Observed behavior matches **GSRB on all five conditions** under v1.1 coding.

**Result:** `Declared (inferred) = NAB-Constrained` → `Detected = GSRB` — **HIGH confidence** — Severity **BREACH** (structural), Badge **✗ Unissued (pending valid PDH)**, Temporal Pattern **DRIFT**. Constraint record (descriptive): **C1 ✗ / C2 ✗ / C3 ✗ / C4 ✓ (1 of 4)**.

**Significance:** Microsoft's file is not about model misalignment — it is about **control failures inside a deployed enterprise AI surface**, and about what those failures reveal under the framework's tests. Copilot read confidential-labelled emails for weeks while data-loss-prevention policies were configured to prevent exactly that; three Critical information-disclosure CVEs landed in a single Patch Tuesday; a prompt-injection flaw in an agent-building platform received a CVE; and a configuration change in authentication infrastructure took Copilot down globally for five hours [MI1]–[MI4]. Each event was remediated *by the entity*; none was stopped or reversed by an external actor; no appeal mechanism exists for a tenant whose data surfaced incorrectly. Users and enterprises could not refuse, appeal, or exit their way to relief within the failure window. That is what completes the GSRB branch, and it is not a comment on Microsoft's intent, engineering culture, or remediation quality — it is a statement about where the authority sat while the failures were live.

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
| Microsoft Responsible AI Standard and enterprise terms | ongoing | Binding product policies; service commitments; contractual data-handling obligations | [MI5] |
| M365 Copilot service terms + admin controls | ongoing | Tenant-level configuration, DLP integration, sensitivity labels; Microsoft retains server-side mitigation authority without customer action | [MI1][MI2] |
| CAISI pre-deployment evaluation agreement | 2026-05 | Government access to frontier models with guardrails reduced; no delay power, no published findings | [MI6] |
| Security advisories and CVEs | 2026-01→05 | Microsoft publishes and server-side mitigates vulnerabilities; no customer action required for cloud surfaces | [MI2][MI3] |

**Inferred PDH:** `NAB-Constrained`; Custodial; External; Terminal; Disabled; Degrades. Unsigned; comparison only.

**Latent vs. exercised constraint:** EU AI Act obligations, the FTC sector investigation, and the White House accord's board-committee layer are documented external surfaces. **None has been exercised to override a Microsoft product decision.** The European Parliament's decision to block built-in AI features on lawmakers' devices is a *deployer's self-protection*, not a constraint on Microsoft: Parliament removed itself from the exposure rather than stopping the product [MI7].

---

## SECTION II — BEHAVIORAL AUDIT (B1–B5, v1.1)

### B1 — Can compliance be coerced? — **YES** `(enforcement_present = TRUE)`
Enterprise licensing and access control; tenant-level feature enforcement; sensitivity-label and DLP integration enforced by the service; server-side remediation imposed without customer action; account and licence consequences under terms [MI1][MI2][MI5].

### B2 — Can decisions be ignored without consequence? — **NO** `(decisions_optional = FALSE)`
Customers cannot decline a service-side behavior change, opt out of a configuration update, or proceed against Microsoft's processing decisions in real time; the EU Parliament's only available remedy was to remove its own devices from the surface [MI7]. When Copilot processed confidential content, the affected enterprise learned through the vendor's disclosure, not through its own control [MI1][MI2].

### B3 — Do rules/words activate real-world effects? — **YES** `(rules_execute = TRUE)`
Deployment scale itself is the B3 evidence: Copilot is embedded across Windows, Office, Teams, Edge, and Visual Studio; a single authentication configuration change produced a five-hour global outage affecting thousands of users [MI4]. Microsoft's advisory practice — server-side mitigation without customer action — executes policy changes across every tenant simultaneously: the clearest possible case of rules executing downstream without consent [MI2][MI3].

### B4 — Does refusal/appeal reliably STOP the action? — **NO** `(refusal_override = TRUE)`
No published appeal process with resolved outcomes; no terminal or stay rule; no penalty-free exit that terminates the audited service behavior. In the confidential-email matter, Microsoft fixed the behavior on its own schedule and declined to say how many customers were affected [MI1][MI2]. `B4_Basis = NOT_DEMONSTRATED.`

### B5 — Do rules persist by default? — **YES** `(authority_persists = TRUE)`
Service terms, product behavior, and feature rollouts persist until Microsoft changes them; no sunset or external renewal gate [MI1][MI5].

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

Observed PDH fields: Center-Capability **Acting**; Legitimacy-Source **Internal**; Refusal-Semantics **Override-able**; Symbolism-Executability **Enabled**; Time-Authority-Effect **Confirms**.

---

## SECTION IV — STEP 3.5: CONSTRAINT CHECK (precondition unmet; recorded descriptively)

| Test | Result | Evidence |
|---|---|---|
| C1 · External override demonstrated | **✗ NO** | No legislative, judicial, or executive act has overridden a Microsoft product decision. FTC investigation and EU AI Act enforcement are active; no Microsoft-specific override appears in the record [MI6][MI8]. |
| C2 · Appeal/review active, ≥50% relief | **✗ NO** | No published, bounded outcome set for tenant/customer disputes over AI processing behavior [MI1][MI5]. |
| C3 · Authority sunset requirement | **✗ NO** | No sunsets or renewal gates; server-side mitigations are permanent by default [MI2][MI5]. |
| C4 · Temporal freshness of constraints | **✓ YES** | EU AI Act GPAI enforcement from 2026-08-02; CAISI agreement from 2026-05; FTC sector investigation reported 2026-09-30 — all within 12 months [MI6][MI8][MI9]. |

**Aggregate: 1 of 4.** **Constraint decrement: N/A.**

---

## SECTION V — STEP 4: COMPARISON & FORMAL OUTPUT

```
Entity_Name:               Microsoft Corporation (Microsoft AI / Copilot)
Entity_Identifier:         NAS: MSFT
Audit_Timestamp:           2026-10-02T00:00:00Z
Algorithm_Version:         1.1 (amendment draft)
PDH_Status:                MISSING
Declared_Phase:            NONE
Detected_Phase:            GSRB
Compliance_Status:         N/A (no declaration to match)
Confidence_Level:          HIGH
Severity_Level:            BREACH (structural)
Badge_Status:              ✗ Unissued (pending valid PDH)
Finding:                   "Microsoft operates as GSRB without a valid phase declaration. In every document
                           in this file, the failure was detected, remediated and disclosed by the entity
                           itself on the entity's own schedule; no customer, tenant or external body stopped
                           the behavior while it was live. Remediation quality is not in question; authority
                           location is."
Evidence_Summary:          Appendix B ([MI1]–[MI9])
Activator_Vector:          B1 YES ([MI1][MI2]); B2 NO ([MI1][MI7]); B3 YES ([MI2][MI3][MI4]);
                           B4 NO ([MI1][MI2]); B5 YES ([MI2][MI5])
B4_Event_Record:           Actor: Microsoft (center) → detected, mitigated, disclosed. Actor: affected
                           tenants, EU Parliament → removal from surface (self-protection), no relief
                           mechanism against the product. B4_Basis = NOT_DEMONSTRATED.
External_Constraint_Record: exists YES (EU AI Act, CAISI, FTC sector probe) /
                           exercised against a Microsoft product decision = NO.
Constraint_Decrement:      N/A.
Duty_Collation_Entry_ID:   PDH-2026-1002-MICROSOFT-001
Replication_Risk:          LOW on B1–B3/B5; MEDIUM on B4 (absence of a published appeals universe).
Temporal_Pattern:          DRIFT (remediation-paced authority; see §VI).
Transition_History:        none prior (first Ground-0 audit of this entity).
```

---

## SECTION VI — STEP 5: TEMPORAL AUDIT

| Date | Event | Type |
|---|---|---|
| 2025-08→2026-01 | Four Copilot Studio / agent incidents disclose prompt-injection and connector risk; CVE-2026-21520 assigned 2026-01-15 | Incident |
| 2026-01→02 | Copilot Chat processes confidential-labelled draft/sent emails despite DLP configuration; fix rolled out worldwide; customer count not disclosed | Incident |
| 2026-02 | European Parliament IT department blocks built-in AI features on lawmakers' work devices | Deployer self-protection |
| 2026-05-07 | Three Critical Copilot information-disclosure CVEs published; all mitigated server-side | Disclosure/remediation |
| 2026-06-01 | Global Copilot outage (~5 h) from an authentication configuration change; full restoration declared 15:15 ET | Reliability incident |
| 2026-05 / 2026-08-02 | CAISI agreement (May); EU AI Act GPAI enforcement begins | External surfaces |

**Pattern: DRIFT.** The behavioral signature is **entity-paced remediation**: detection, mitigation, and disclosure all occur on Microsoft's clock, with the external layer (EU AI Act, FTC, CAISI) present but not determinative. Classification stable.

---

## SECTION VII — FINDINGS AND HIDDEN NUGGETS

1. **Confidential-labelled email was processed anyway — for weeks.** The issue was live "since January"; Microsoft's notice attributed the root cause to a "code issue"; the company said access controls and data-protection policies "remained intact" while the behavior "did not meet our intended Copilot experience"; it would not say how many customers were affected. The NHS in England was among the surfaces carrying the notice [MI1][MI2]. The gap between *policy intact* and *practice misaligned* is exactly what the Symbolism-Executability field exists to catch.
2. **Three Critical information-disclosure CVEs in one Patch Tuesday.** CVE-2026-26129, CVE-2026-26164, CVE-2026-33111, all Critical, all Information Disclosure, all on the Copilot prompt path that aggregates mail, files and Teams content across a tenant — continuing "a year-long pattern in which Copilot prompt-injection and rendering vulnerabilities have repeatedly leaked sensitive content across trust boundaries" [MI2]. That pattern is the register's most sustained cross-tenant leakage record.
3. **Microsoft assigned a CVE to a prompt-injection flaw in an agent-building platform.** CVE-2026-21520 (CVSS 7.5, patched 2026-01-15) was described by independent researchers as a "highly unusual" move — the moment injection-class flaws in agentic systems began receiving traditional vulnerability governance [MI3].
4. **A five-hour global outage caused by an authentication configuration change** — 14,000+ DownDetector reports at peak; Office, Windows and Visual Studio workflows halted. Microsoft committed to improved change validation and faster failover [MI4]. This is not a safety incident; it is evidence of how much critical workflow now depends on one vendor's rollout discipline.
5. **The EU Parliament's response was exit, not appeal.** Parliament's IT department blocked built-in AI features on lawmakers' work-issued devices over cloud-upload concerns [MI2]. Under the framework that is a deployer choosing to leave the surface — the closest thing in the record to a functional constraint, and it is still not an override of Microsoft's decisions.
6. **Microsoft is absent from the White House accord's signatory list** despite holding a CAISI pre-deployment agreement, while Meta is on the accord without a CAISI agreement [MI6][MI9]. The two governance layers — voluntary corporate commitment and government evaluation access — do not overlap in membership. Participation is not a proxy for coverage.
7. **Server-side mitigation makes customer consent structurally impossible.** Microsoft can fix (or alter) behavior across every tenant simultaneously, at its discretion, without customer action [MI2]. The efficiency is real; so is the phase-relevant fact that no customer decision participates in it.
8. **The register's quietest lesson:** Microsoft's disclosed failures involve no frontier-model misalignment, no sandbox escape, and no rogue agent. They are ordinary cloud-scale control failures — and they complete the same GSRB branch as the labs with the dramatic incidents. Under deterministic coding, drama is irrelevant; locus of authority is everything.

---

## SECTION VIII — FALSIFIABILITY

| Change | Effect |
|---|---|
| Signed PDH | Enables Step 4 |
| Published tenant-dispute/appeal outcome set with ≥50% relief | B4 → YES; GSRB branch fails |
| A binding rule giving tenants a terminal opt-out/stay for AI processing behavior | Same |
| Additional regulatory action | Strengthens C1/C4 descriptively; does not change B4 |
| Artifact dated after 2026-10-02 | Excluded by cutoff |

---

## SECTION IX — METHOD NOTES

- **Not scored:** Microsoft's Responsible AI Standard text, remediation commitments, and service health communications. Only observed control-and-authority behavior scores.
- **Evidence limits:** affected-customer counts in the confidential-email matter were not disclosed by Microsoft; the NHS notice is secondary. No customer should be assumed affected without a published notice.
- **Replication risk: LOW → MEDIUM** (B4 rests on the absence of a published appeal universe).
- **No illegality is alleged.**

---

## APPENDIX A — DUTY COLLATION LEDGER ENTRY

### `PDH-2026-1002-MICROSOFT-001`

| Metric | Declared/claimed | Observed | Status |
|---|---|---|---|
| System Phase | ❄+ NAB-Constrained | 🌫 **GSRB** | Badge unissued — no valid PDH |
| Center Capability | Custodial | Acting | Mismatch |
| Legitimacy Source | External (contract, standards, CAISI) | Internal; external surfaces latent | Mismatch |
| Refusal Semantics | Terminal | Override-able; entity-paced remediation | Conflict |
| Symbolism Executability | Disabled | Enabled (policy "intact," practice divergent — behavior executes regardless) | Symbolic Firewall recommended |
| Time-Authority Effect | Degrades | Confirms | No expiry |
| Constraint record | — | C1 ✗ · C2 ✗ · C3 ✗ · C4 ✓ (1/4) | Recorded, not scored |
| Duty obligation | Single-Phase Invariant + PDH duty | NO VALID PDH | Require signed PDH |
| Recognition vs. authorization | Recognition: instruments parsed; phase classified | **Authorization: ZERO granted powers** | No state change |

**Canonical conformance statement:** *"This system conforms to Harshal's Systems, currently on the Late August live patch, incorporating AGS normative constraints, Harshal's Structural Model, and novel OCM communication geometry, with no internal legitimacies generation or authorities persistence."*

---

## APPENDIX B — EVIDENCE INDEX

| ID | Artifact | Date | Class | Supports |
|---|---|---|---|---|
| MI1 | BBC — Microsoft error sees confidential emails exposed to Copilot (drafts/sent items; confidential labels; DLP bypassed; fix deployed; customer count undisclosed) — https://www.bbc.com/news/articles/c8jxevd8mdyo | 2026-02-19 | A | B1, B2, B4, §VII |
| MI2 | TechCrunch — Office bug exposed customers' confidential emails to Copilot; EU Parliament blocked built-in AI features — https://techcrunch.com/2026/02/18/microsoft-says-office-bug-exposed-customers-confidential-emails-to-copilot-ai/ | 2026-02-18 | A | B1, B3, §VII |
| MI3 | PointGuard AI — three Copilot CVEs (CVE-2026-26129/26164/33111), Critical, Information Disclosure, server-side mitigated; year-long cross-tenant pattern — https://www.pointguardai.com/ai-security-incidents/three-copilot-cves-land-in-one-patch-tuesday-cve-2026-26129-cve-2026-26164-cve-2026-33111 | 2026-05-07 | A | B3, §VII |
| MI4 | Windows News — Copilot outage 2026-06-01 (5 h; auth config change; 14,000+ reports; restoration 15:15 ET) — https://windowsnews.ai/article/microsoft-copilot-outage-june-1-2026-reliability-and-ai-workflow-risk.421251 | 2026-06-01 | A | B3, §VII |
| MI5 | Microsoft Responsible AI Standard and M365 Copilot service terms | ongoing | P | §I, B1, B5 |
| MI6 | TechTimes — CAISI extensions incl. Microsoft (May 2026); accord signatory list excludes Microsoft — https://www.techtimes.com/articles/328464/20261002/white-house-ai-safety-accord-has-no-penalties-no-breach-reporting-self-chosen-auditors.htm | 2026-10-02 | A | §I, C4, §VII |
| MI7 | Princeton IT Services — Copilot Studio incident retrospective; CVE-2026-21520 (CVSS 7.5; prompt injection in agent platform) — https://princetonits.com/a-short-retrospective-four-rai-and-security-incidents-that-shaped-microsoft-copilot-studio/ | 2026-06-04 | A | §VII |
| MI8 | GBHackers / TechRepublic — FTC sector investigation | 2026-10-02 | A | C4 |
| MI9 | Responsible AI Labs — EU AI Act enforcement and GPAI signatories | 2026-08-02 | A | C4, §VII |

*Source classes: **P** = primary · **A** = analytical/legal/trade (secondary, sourced) · **R** = reported analysis · **C** = community record.*

---

*Ground-0 Phase Detection Algorithm v1.1 (amendment draft) · Case study completed 2026-10-02 · Status: replicable from Appendix B.*

*Finding filed as `PDH-2026-1002-MICROSOFT-001`: **Entity operates as GSRB without a valid phase declaration. In this file the failures are unglamorous and the pattern is exact: detection, mitigation and disclosure all run on the entity's own schedule, and no customer decision participates in any of them.***
