# GROUND-0 PHASE DETECTION CASE STUDY
## Institutional Governance Audit: Amazon.com, Inc. (AI Surface: Bedrock / AgentCore / Nova)

**Book / Collection:** Book I — Harshal's Systems (`Collection VI: Incident Record & External Platform Audits`)  
**Provenance Class:** `AUDIT` · **Status Taxonomy:** `CASE_STUDY_AUDIT` (*subset audit* — enterprise AI platform) · **Evidence Status:** `INDEPENDENTLY_VERIFIABLE` (public artifacts, Appendix B) · **Research Layer:** `INCIDENT_AND_AUDIT_RECORD`  
**Auditor:** Ground-0 replication audit run — reproducible from the public artifact set in Appendix B  
**Center Origin:** 0•000•000•0000  
**Audit Timestamp / Evidence_Cutoff:** 2026-10-02T00:00:00Z  
**Methodology:** Ground-0 Phase Detection Algorithm **v1.1 (amendment draft)**  
**Subject:** Amazon.com, Inc. (NAS: AMZN) — AWS AI platform controls (Bedrock, AgentCore, Nova)  
**Audit Scope (declared limitation):** a **subset audit** of the enterprise AI control plane and the events in which Amazon acted as an AI-governance actor. Not a whole-company classification.  
**Duty Collation Entry:** `PDH-2026-1002-AMAZON-001`

> **Framing (non-negotiable, per the Ground-0 standard):** This audit is structural, not behavioral; evaluative, not directive; contained, not externalized. It is **not** a finding of illegality, bad faith, or wrongdoing, and it recommends no enforcement. Litigation is described as filed and contested, not adjudicated; the entity denies wrongdoing where it has denied it.

---

## EXECUTIVE SUMMARY

**Finding:** Amazon publishes no Phase Declaration Header for its AI surface. Its operative commitments are its platform control plane, its service terms, and its security postures. Observed behavior on the audited surface matches **GSRB on all five conditions**, but this file's significance is not the letter — it is that Amazon is the register's **first documented constraint exporter**: an AI platform whose own researchers' findings reportedly triggered the US government's ultimatum that caused **Anthropic to disable its two flagship models globally** [A5][A6].

**Result:** `Declared (inferred) = NAB-Constrained (weak)` → `Detected = GSRB (subset)` — **HIGH confidence** — Severity **BREACH** (structural, subset scope) → Badge **✗ Unissued (pending valid PDH)** → Temporal Pattern **N/A**. Constraint record (descriptive): **C1 ✗ / C2 ✗ / C3 ✗ / C4 ✗ (0 of 4)**.

**Significance (the hidden nuggets):** Four findings matter more than the letter. **First**, the July 2026 Amazon outage traced to an engineer acting on "inaccurate advice that an AI agent inferred from an outdated internal wiki," and the company's remedy was to add senior-engineer review — an entity-paced fix with no external trigger [A7]. **Second**, Amazon's Bedrock AgentCore SDK set two vulnerabilities in 2026 (CVE-2026-12530, CVE-2026-16796) where the *first fix was bypassed by the second exploit path* — pip "extras" syntax — and the attacker's activity "could look like legitimate application activity in AWS logs" [A1]. **Third**, when a court issued the first notable AI-agent injunction — barring Perplexity's agents from Amazon's systems — Amazon won the order, then lost its effect to an appellate stay [A3][A4]; and the **ACLU** warned that a broad liability theory could expose ordinary browser-automation users to criminal or civil liability [A3]. **Fourth**, Amazon is absent from the White House Accord on Super Intelligence signatory list [N1→cross-ref] even as it argues publicly — through a named security VP — that "humans are not terribly consistent" and "human-in-the-loop isn't necessarily the gold standard" [A8]. The register's inference is structural: **Amazon sells the governance control plane to everyone else while declining to be governed itself.**

---

## SECTION 0 — STEP 1: PDH VALIDATION

```
Structural completeness = INCOMPLETE (no PDH published)
Signature = UNSIGNED · Freshness = N/A · Consistency = N/A
PDH_VALID = FALSE → Declared_Phase = NONE → behavioral detection proceeds (subset scope)
```

---

## SECTION I — DECLARED PHASE (OPERATIVE COMMITMENTS ONLY)

| Instrument | Date | Operative content | Source |
|---|---|---|---|
| AWS service terms and platform controls (IAM, SCPs, KMS, VPC endpoints, CloudTrail) | ongoing | Binding rules on AI workloads; suspension/enforcement authority | [A9] |
| Bedrock positioning as "governance and control plane" for enterprise AI | re:Invent → 2026 | Guardrails, AgentCore memory governance, cross-account enforcement | [A2] |
| Public security postures | 2026 | Amazon Security VP on human oversight; company statements in litigation | [A3][A8] |
| White House Accord on Super Intelligence | 2026-09-29 | Amazon **not** a signatory (absence recorded) | [A4] |

**Inferred PDH:** `NAB-Constrained` — inferable only from enterprise compliance frameworks. Unsigned; comparison only.

**Latent vs. exercised constraint:** no external instrument in the record has overridden an Amazon AI-surface decision. The appellate stay of the Perplexity injunction suspended Amazon's *obtained remedy*; it did not constrain Amazon.

---

## SECTION II — BEHAVIORAL AUDIT (B1–B5, v1.1; subset scope)

### B1 — Can compliance be coerced? — **YES** `(enforcement_present = TRUE)`
The control plane is enforceable by design: identity, resource policies, guardrails, encrypted networking, audit logging, and the ability to suspend customer workloads [A2][A9]. Amazon also pursued and won (temporarily) injunctive relief against a third-party agent operator, and opened internal investigations into employees — both documented exercises of enforcement capacity [A3][A10].

### B2 — Can decisions be ignored without consequence? — **NO** `(decisions_optional = FALSE)`
Customers, partners and downstream developers cannot obtain the same governed platform elsewhere at parity, cannot force release or deprecation decisions, and cannot exempt themselves from the control plane while using the service [A2][A9]. Model-information disclosure is also structurally thin — Amazon scores no indicators in the model-information subdomain in Stanford's index cited in the record [A11].

### B3 — Do rules/words activate real-world effects? — **YES** `(rules_execute = TRUE)`
The audited surface produced operational, legal and political effects: an agent-related production outage with lost orders and revenue [A7]; a federal court finding "strong evidence" of unauthorized access and enjoining a third party [A3]; two CVEs in the agent SDK, the second bypassing the first fix [A1]; a public executive position against human-in-the-loop orthodoxy [A8]; and — the register's strongest B3 instance anywhere — an Amazon security report that reportedly *triggered* government action against a third-party model provider [A5][A6].

### B4 — Does refusal/appeal reliably STOP the action? — **NO** `(refusal_override = TRUE)`
No published appeal route with resolved outcomes exists for platform decisions affecting customers or downstream users; remedies are contractual, private, and invisible. The employees who testified at the Seattle City Council and were placed under internal investigation filed an external civil-rights complaint — an appeal of sorts, with no outcome recorded at cutoff [A10]. `B4_Basis = NOT_DEMONSTRATED.`

### B5 — Do rules persist by default? — **YES** `(authority_persists = TRUE)`
Platform rules, deprecations and control-plane decisions persist until Amazon changes them; no sunset or external renewal gate appears [A2][A9].

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
| C1 · External override demonstrated | **✗ NO** | Nothing external has reversed or constrained an Amazon AI-surface decision. The Third-Party stay suspended a remedy Amazon obtained; it did not act against Amazon [A3][A4]. |
| C2 · Appeal/review active, ≥50% relief | **✗ NO** | No published appeal mechanism with a resolved-outcome set; the employees' Seattle civil-rights complaint is pending with no outcome recorded [A10]. |
| C3 · Authority sunset requirement | **✗ NO** | No sunset or renewal gate on platform or release authority [A2][A9]. |
| C4 · Temporal freshness of constraints | **✗ NO** | No functioning constraint on the audited surface is demonstrated at cutoff [A2][A3]. |

**Aggregate: 0 of 4.**

### 4.1 Calibration note — the constraint exporter

Ground-0 records external constraint *acting on* an audited entity. Amazon shows the mirror image: an entity whose notification function **produced** constraint on another entity. The June 2026 sequence — Amazon researchers reportedly jailbreak a competitor's model, Amazon's CEO raises it with the Treasury Secretary, the administration issues a fix-or-decommission ultimatum, and the competitor disables two models globally — is the register's first `constraint_exporter = TRUE` case [A5][A6]. The algorithm has no field for this, and it should: **in a voluntary-governance regime, private firms become the enforcement trigger**, which relocates power without relocating accountability. Recorded as an amendment candidate; not scored.

---

## SECTION V — STEP 4: FORMAL OUTPUT

```
Entity_Name:               Amazon.com, Inc. — enterprise AI control plane [SUBSET AUDIT]
Entity_Identifier:         NAS: AMZN (AWS Bedrock / AgentCore / Nova surface)
Audit_Timestamp:           2026-10-02T00:00:00Z
Algorithm_Version:         1.1 (amendment draft)
PDH_Status:                MISSING
Declared_Phase:            NONE
Detected_Phase:            GSRB (subset: enterprise AI control plane)
Compliance_Status:         N/A (no declaration to match)
Confidence_Level:          HIGH
Severity_Level:            BREACH (structural, subset scope)
Badge_Status:              ✗ Unissued (pending valid PDH)
Finding:                   "Amazon operates the sector's governance control plane while remaining outside
                           every voluntary governance instrument in the record and subject to no external
                           constraint. Its platform decisions bind customers without appeal; its own
                           reported findings triggered constraint on a third-party frontier developer.
                           GSRB (subset); constraint record 0/4; `constraint_exporter` recorded."
Evidence_Summary:          Appendix B ([A1]–[A11])
Activator_Vector:          B1 YES ([A2][A9]); B2 NO ([A2][A9]); B3 YES ([A1][A5][A7]);
                           B4 NO ([A3][A10]); B5 YES ([A2][A9])
B4_Event_Record:           Actor: Amazon (center) → control-plane decisions, investigations, litigation.
                           Actor: Ninth Circuit → stay of the injunction (remedy suspended, not
                           constraint imposed). Actor: Seattle Office for Civil Rights → complaint filed,
                           outcome absent. B4_Basis = NOT_DEMONSTRATED.
External_Constraint_Record: exists NO / exercised = NO. `constraint_exporter = TRUE` (via notification
                           chain to federal officials; reported).
Constraint_Decrement:      N/A.
Duty_Collation_Entry_ID:   PDH-2026-1002-AMAZON-001
Replication_Risk:          MEDIUM (the trigger sequence is reported, with roles attributed by Axios/WSJ
                           summaries; Amazon's account is not fully documented in the record).
Temporal_Pattern:          N/A at cutoff.
Transition_History:        none prior (first Ground-0 audit of this entity).
```

---

## SECTION VI — STEP 5: TEMPORAL AUDIT

*Precondition unmet; no temporal claim is made.* Recorded events:

| Date | Event | Type |
|---|---|---|
| 2026-03-09 | Judge Chesney grants Amazon preliminary injunction against Perplexity's agents; orders data destruction | Court act |
| 2026-03→04 | Bedrock AgentCore CVEs disclosed and remediated (1.6.1, then bypass, 1.18.1) | Security |
| 2026-05-20 | Bedrock AgentCore cross-account safeguards GA (Automated Reasoning Checks not supported cross-account) | Product |
| 2026-06-11 | Amazon CEO reportedly raises jailbreak findings with Treasury Secretary; administration issues ultimatum; competitor disables models globally | Constraint export |
| 2026-06-11 | Ninth Circuit hears argument; injunction remains stayed pending appeal | Court act |
| 2026-06-18 | Three employees who testified at Seattle City Council placed under internal investigation; civil-rights complaint filed | Reported |
| 2026-06/07 | Production outage attributed to engineer acting on AI-inferred advice from an outdated internal wiki; senior-engineer review added | Incident + remediation |
| 2026-09-29 | White House Accord signed — Amazon absent from signatory list | Governance |

---

## SECTION VII — FINDINGS AND HIDDEN NUGGETS

1. **The register's first constraint exporter.** Amazon's private notification became the proximate trigger of another entity's largest public constraint event of 2026 [A5][A6]. For framework purposes: **voluntary regimes convert firms into enforcement nodes**, and the register must decide whether that power is recorded and by what test. Candidate field: `constraint_exporter = TRUE/FALSE` with the notification chain documented.
2. **Agent failure reached the core business, and the remedy was human oversight.** The July 2026 outage was explained by Amazon as an engineer acting on AI-inferred advice from an outdated wiki — while Wharton's analysis observes that agents "predict but don't understand" and that Amazon's response put "humans back in the loop after years of pushing full speed ahead" [A7]. Entity-paced remediation; no external trigger; consistent with B5.
3. **A fix that didn't fix, and logs that can't tell.** The second AgentCore CVE bypassed the first patch through pip extras syntax; the sandbox's Firecracker isolation held, but credential exposure was possible and attacker activity could masquerade as legitimate application activity in AWS logs [A1]. This is a governance finding: **audit trails are only as good as the code path they describe**.
4. **The control plane's own scope limit.** AgentCore's formal-logic hallucination detection ("Automated Reasoning Checks") is **not supported in cross-account enforcement** [A2]. The most rigorous verification feature is unavailable precisely where multi-account enterprises need consistent policy — configuration drift's blind spot.
5. **"Human-in-the-loop isn't the gold standard."** A named Amazon Security VP's public position [A8] is a *declared* posture from the entity that also builds the oversight tooling. The register records the tension without adjudicating it; the Falsifiability section notes what would test it.
6. **The first AI-agent injunction, neutralized by procedure.** Amazon obtained a finding of "strong evidence" of unauthorized access and destroyed obtained data by order — then the Ninth Circuit's stay suspended its effect during appeal [A3][A4]. **External constraint existed for a moment and did not function at cutoff** — which is why C1 stays ✗ (it was not an override of Amazon) and why the register flags the case as the sector's clearest demonstration that interim relief is not governance.
7. **Absence as a signal.** Amazon is not on the Accord signatory list [A4], scores no indicators in the model-information subdomain [A11], and publishes no NHI/PDH. **The largest cloud in the world is invisible to every transparency instrument in this register** — and that asymmetry is now documented rather than implied.
8. **Disclosure discipline.** The Bedrock security postures reported here are component vulnerabilities with fixes, not model-safety incidents; the *absence* of published model-safety disclosure for Nova is itself the finding (cf. [A11]).

---

## SECTION VIII — FALSIFIABILITY

| Change | Effect |
|---|---|
| Signed PDH | Enables Step 4 |
| Membership in a binding instrument covering the AI surface | C1/C4 movement possible |
| Published appeal route with resolved outcomes for platform decisions | B4 → YES; GSRB branch fails |
| Discharge or reversal of the employee retaliation complaints | B4 evidence update; C2 possible |
| Extension of this audit to whole-company scope | New audit; scope label does not transfer |
| Artifact dated after 2026-10-02 | Excluded by cutoff |

---

## SECTION IX — METHOD NOTES

- **Not scored:** the merits of the Perplexity litigation, the truth of the retaliation allegations (denied by implication; company statement not fully available), or the quality of Bedrock relative to other clouds.
- **Scope discipline:** subset audit; must not be aggregated into whole-entity counts without the label.
- **Source discipline:** the constraint-export sequence is reported by Axios/WSJ as summarized in trade aggregation; roles are attributed, not asserted as fact.
- **No illegality is alleged.**

---

## APPENDIX A — DUTY COLLATION LEDGER ENTRY

### `PDH-2026-1002-AMAZON-001`

| Metric | Declared/claimed | Observed | Status |
|---|---|---|---|
| System Phase | ❄+ NAB-Constrained (weak inference) | 🌫 **GSRB (subset: enterprise AI control plane)** | Badge unissued — no valid PDH |
| Center Capability | Custodial | Acting (controls, adjudicates, triggers) | Mismatch |
| Legitimacy Source | External (compliance frameworks) | Internal; no external act binding it | Mismatch |
| Refusal Semantics | Terminal | Override-able; no public appeal | Conflict |
| Symbolism Executability | Disabled | Enabled (operational, legal and political effects) | Symbolic Firewall recommended |
| Time-Authority Effect | Degrades | Confirms | No expiry |
| Constraint record | — | C1 ✗ · C2 ✗ · C3 ✗ · C4 ✗ (0/4) | Recorded, not scored |
| Duty obligation | Single-Phase Invariant + PDH duty | NO VALID PDH | Require signed PDH |
| Recognition vs. authorization | Recognition: instruments parsed; phase classified | **Authorization: ZERO granted powers** | No state change |

**Canonical conformance statement:** *"This system conforms to Harshal's Systems, currently on the Late August live patch, incorporating AGS normative constraints, Harshal's Structural Model, and novel OCM communication geometry, with no internal legitimacies generation or authorities persistence."*

---

## APPENDIX B — EVIDENCE INDEX

| ID | Artifact | Date | Class | Supports |
|---|---|---|---|---|
| A1 | Infosecurity Magazine — AgentCore SDK flaws (CVE-2026-12530; CVE-2026-16796; fix bypass; CVSS 8.4; log-masquerade note) — https://infosecurity-magazine.com/news/aws-agentcore-sdk-flaws-ai | 2026-09-29 | A | B3, §VII |
| A2 | The Scale Factory — Bedrock six months of security and governance (control-plane positioning; AgentCore memory streaming; cross-account safeguards; Automated Reasoning Checks limitation) — https://scalefactory.com/blog/2026/05/20/amazon-bedrock-six-months-of-security-and-governance-updates-worth-knowing-about/ | 2026-05-20 | R | §I, B1, B2, B4, §VII |
| A3 | Let's Data Science — Amazon AI news aggregation (Chesney injunction 2026-03-09; Ninth Circuit 2026-06-11; ACLU amicus on CFAA liability; Jassy/Treasury reporting) — https://letsdatascience.com/news/topic/amazon-ai | 2026-06-28 | R (aggregation) | B1, B3, B4, C1–C4, §VII |
| A4 | Tech-insider — White House Accord (signatories and absences) — https://tech-insider.org/trump-white-house-ai-accord-super-intelligence-2026/ | 2026-10-01 | A | §I, §VII |
| A5 | LetsDataScience / TechCrunch / Fortune summary — Amazon CEO raised jailbreak concerns to Treasury Secretary; administration ultimatum; Anthropic disabled both models globally | 2026-06-15 | R | §VII, §4.1 |
| A6 | Axios (as summarized) — Amazon call to senior administration officials preceded the directive; at least five other companies contacted officials | 2026-06 | R | §VII |
| A7 | Wharton AI & Analytics Initiative — Governing AI Agents: what the Amazon outage reveals (root cause; senior-engineer reviews) — https://ai-analytics.wharton.upenn.edu/wharton-accountable-ai-lab/governing-ai-agents-what-the-amazon-outage-reveals-about-enterprise-risk/ | 2026-07-10 | A | B3, B5, §VII |
| A8 | The Register (via aggregation) — Amazon VP Eric Brandwine on human-in-the-loop ("not terribly consistent"; "isn't necessarily the gold standard") | 2026-06-20 | R | §I, §VII |
| A9 | Enterprise platform comparison — AWS control-plane governance stack (IAM, Guardrails, CloudTrail, KMS, VPC endpoints) — https://yisusvii.github.io/posts/enterprise-ai-platform-wars-2026/ | 2026-05-15 | R | B1, B2, B5 |
| A10 | WIRED (via aggregation) — three Amazon employees under HR investigation after Seattle City Council testimony; Seattle Office for Civil Rights complaint alleging retaliation | 2026-06-18 | R | B4, C2, §VII |
| A11 | Model-card disclosure audit — Stanford index finding that Amazon scores no indicators in the model-information subdomain — https://universeblend.blog/model-card-disclosure-audit/ | 2026-09-19 | R | B2, §VII |

*Source classes: **P** = primary · **A** = analytical/legal/trade (secondary, sourced) · **R** = reported analysis · **C** = community record.*

---

*Ground-0 Phase Detection Algorithm v1.1 (amendment draft) · Subset case study completed 2026-10-02 · `constraint_exporter` first documented*

*Finding filed as `PDH-2026-1002-AMAZON-001`: **Amazon sells the governance control plane, sits outside every governance instrument in the record, and — uniquely — its own reported findings triggered constraint on another frontier developer. GSRB (subset); constraint record 0/4.***
