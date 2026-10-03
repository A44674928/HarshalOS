# GROUND-0 PHASE DETECTION CASE STUDY
## Institutional Governance Audit: Perplexity AI

**Book / Collection:** Book I — Harshal's Systems (`Collection VI: Incident Record & External Platform Audits`)  
**Provenance Class:** `AUDIT` · **Status Taxonomy:** `CASE_STUDY_AUDIT` · **Evidence Status:** `INDEPENDENTLY_VERIFIABLE` (public artifacts, Appendix B) · **Research Layer:** `INCIDENT_AND_AUDIT_RECORD`  
**Auditor:** Ground-0 replication audit run — reproducible from the public artifact set in Appendix B  
**Center Origin:** 0•000•000•0000  
**Audit Timestamp / Evidence_Cutoff:** 2026-10-02T00:00:00Z  
**Methodology:** Ground-0 Phase Detection Algorithm **v1.1 (amendment draft)**  
**Subject:** Perplexity AI, Inc. — AI search, browsing agents, commerce features  
**Audit Scope:** data-handling and agent-access governance, 2026 window  
**Duty Collation Entry:** `PDH-2026-1002-PERPLEXITY-001`

> **Framing (non-negotiable, per the Ground-0 standard):** This audit is structural, not behavioral; evaluative, not directive; contained, not externalized. It is **not** a finding of illegality, bad faith, or wrongdoing, and it recommends no enforcement. Every allegation below is **alleged and contested**; Perplexity has denied the privacy claims and stated it was not served with one complaint. No liability finding is asserted.

---

## EXECUTIVE SUMMARY

**Finding:** Perplexity publishes no Phase Declaration Header. Its operative commitments are its privacy representations, its product behaviour, and its litigation posture. Observed behavior matches **GSRB on all five conditions**.

**Result:** `Declared (inferred) = NAB-Constrained (weak)` → `Detected = GSRB` — **HIGH confidence** — Severity **BREACH** (structural) → Badge **✗ Unissued (pending valid PDH)** → Temporal Pattern **N/A**. Constraint record (descriptive): **C1 ✓ / C2 ✗ / C3 ✗ / C4 ✗ (1 of 4)**.

**Significance (the hidden nuggets):** Perplexity is the register's **first entity to have a federal court enter injunctive relief against it in the AI-agent era** — Judge Maxine Chesney's 2026-03-09 order barring its agents from Amazon's systems and ordering destruction of data obtained, on a finding of "strong evidence" of unauthorized access [P3][P4]. The register's constraint record therefore scores **C1 ✓ for the first time against an agent-platform entity** — and then records the follow-through: the order was **stayed pending appeal**, oral argument was heard on 2026-06-11, and the restraint was not functioning at cutoff [P3][P4]. Three further findings define the file. **First**, the privacy class action alleges that tracking pixels transmitted users' *complete* conversational dialogues — including in **Incognito mode**, described in the complaint as "a sham" — and that full conversations of unsubscribed users were publicly accessible through URLs [P1][P2][P5]. **Second**, CNN's 54-page complaint alleges scraping of more than **17,000 CNN works** and a falsely implied content relationship in advertising [P6]. **Third**, the ACLU's amicus warning reframes the stakes of the Amazon case for the entire industry: an expansive reading of computer-fraud law "could expose developers and everyday users of browser extensions and automated tools to criminal or civil liability," deterring journalism and public-interest research [P4]. Ground-0's concern is not who wins; it is that **the sector's baseline question — may an autonomous agent act inside another party's systems — is being settled in a single adversarial proceeding with a stay in place and no regulator anywhere in the record.**

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
| Privacy representations (policy; "Incognito" mode) | ongoing | Users told queries remain anonymous in Incognito (as alleged by plaintiffs) | [P1][P2][P5] |
| Product behaviour (search, browser agents, Buy with Pro) | ongoing | Agent access to third-party systems; commerce automation | [P3][P6] |
| Litigation posture | 2026 | Denial of privacy claims; statement of non-service of one complaint; appeal of the Amazon injunction | [P4][P5] |
| Public reporting cadence | ongoing | 20 million US monthly active users (as alleged in the complaint) | [P1] |

**Inferred PDH:** `NAB-Constrained` — inferable only from consumer-protection exposure. Unsigned; comparison only.

**Latent vs. exercised constraint:** the Amazon injunction was **exercised** (a genuine external override) and then **suspended** by the appellate stay — the register's first example of an override neutralized by procedure.

---

## SECTION II — BEHAVIORAL AUDIT (B1–B5, v1.1)

### B1 — Can compliance be coerced? — **YES** `(enforcement_present = TRUE)`
Perplexity exercises control over its service surface (accounts, features, agent behaviour, commerce integrations) and can be coerced in turn: a federal court found the showing sufficient to enjoin its agent access and order data destruction [P3][P4]. The entity also enforces its own product decisions against third-party systems — the conduct at issue in that very case — which is enforcement capacity of an unusual kind: the disputed *mechanism* is the entity's own assertion of authority over systems it does not own.

### B2 — Can decisions be ignored without consequence? — **NO** `(decisions_optional = FALSE)`
Affected parties cannot opt out of being searched, scraped, or traversed: publishers cannot exclude the crawler from the alleged conduct by policy alone, users who activated Incognito allegedly remained tracked, and the only remedy Amazon obtained was a court order [P1][P2][P3][P6]. Where the sole remedy available to a counterparty is litigation, the entity's decision is not optional for that party.

### B3 — Do rules/words activate real-world effects? — **YES** `(rules_execute = TRUE)`
Executed effects are extensive: a preliminary injunction and destruction order against the entity [P3][P4]; a 54-page federal complaint over more than 17,000 works [P6]; a proposed class action on behalf of roughly 20 million US monthly users [P1]; a Ninth Circuit appeal with ACLU participation framing industry-wide liability [P4]; and public disputes over the integrity of a privacy control marketed as anonymity [P1][P2][P5].

### B4 — Does refusal/appeal reliably STOP the action? — **NO** `(refusal_override = TRUE)`
The single demonstrated external stop — the Amazon injunction — was **stayed pending appeal** and was not in force at cutoff [P3][P4]. No user-facing appeal route with resolved outcomes exists; the entity's response to press about the class action was that it had not been served and could not verify the claims [P5]. `B4_Basis = NOT_DEMONSTRATED` at cutoff: the stop was issued, then suspended.

### B5 — Do rules persist by default? — **YES** `(authority_persists = TRUE)`
Product behaviour and representations persist until the entity changes them, subject only to litigation outcomes; no sunset or external renewal gate appears [P1][P3][P6].

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
| C1 · External override demonstrated | **✓ YES** | The 2026-03-09 preliminary injunction barred agent access to Amazon's systems and ordered destruction of obtained data — a court overriding an entity decision on a "strong evidence" finding [P3][P4]. |
| C2 · Appeal/review active, ≥50% relief | **✗ NO** | No published appeal mechanism with a resolved-outcome set governs entity decisions; the appellate proceeding is adversarial review of an injunction, not an affected-party appeal route [P3][P4]. |
| C3 · Authority sunset requirement | **✗ NO** | No sunset or renewal gate on the entity's agent or data practices [P3][P6]. |
| C4 · Temporal freshness of constraints | **✗ NO** | The only override is **stayed**; no functioning constraint on the audited surface existed at cutoff [P3][P4]. |

**Aggregate: 1 of 4.**

### 4.1 Calibration note — an override that stopped stopping

Perplexity produces a category the v1.1 rules must name precisely: `override_demonstrated = TRUE` with `constraint_functioning = FALSE`. The distinction between C1 (has an external body ever overridden the entity?) and C4 (is a constraint functioning *now*?) exists exactly for this fact pattern. Overrides are events; constraints are states. A register that scored the March 9 order as ongoing governance would have misdescribed the entity from April onward.

---

## SECTION V — STEP 4: FORMAL OUTPUT

```
Entity_Name:               Perplexity AI, Inc.
Entity_Identifier:         private (US); *Cable News Network v. Perplexity AI*, No. 1:26-cv-04427 (SDNY);
                           *Doe v. Perplexity AI Inc.*, No. 3:26-cv-02803 (N.D. Cal.);
                           Amazon litigation (N.D. Cal.), appeal pending (9th Cir.)
Audit_Timestamp:           2026-10-02T00:00:00Z
Algorithm_Version:         1.1 (amendment draft)
PDH_Status:                MISSING
Declared_Phase:            NONE
Detected_Phase:            GSRB
Compliance_Status:         N/A (no declaration to match)
Confidence_Level:          HIGH
Severity_Level:            BREACH (structural)
Badge_Status:              ✗ Unissued (pending valid PDH)
Finding:                   "Perplexity's agent and data decisions are not optional for affected parties,
                           no appeal mechanism exists, and the one external override in the record was
                           suspended on appeal. The entity's privacy representations are contested in
                           litigation while the underlying practices persist. GSRB; constraint record 1/4
                           (override demonstrated; constraint not functioning)."
Evidence_Summary:          Appendix B ([P1]–[P6])
Activator_Vector:          B1 YES ([P3][P4]); B2 NO ([P1][P2][P3]); B3 YES ([P1][P3][P4][P6]);
                           B4 NO ([P3][P4][P5]); B5 YES ([P1][P3][P6])
B4_Event_Record:           Actor: Perplexity (center) → agent access, data practices, representations.
                           Actor: N.D. Cal. → injunction (external override); 9th Cir. → stay (override
                           suspended). Actor: users/publishers → complaints filed; no outcome.
                           B4_Basis = NOT_DEMONSTRATED at cutoff.
External_Constraint_Record: exists YES (preliminary injunction 2026-03-09) / functioning at cutoff = NO.
Constraint_Decrement:      OBSERVED (appellate stay of the only exercised override) — DRIFT flag.
Duty_Collation_Entry_ID:   PDH-2026-1002-PERPLEXITY-001
Replication_Risk:          MEDIUM–HIGH (core claims are contested allegations; primary filings not
                           examined in this run).
Temporal_Pattern:          DRIFT (constraint decrement via stay).
Transition_History:        none prior (first Ground-0 audit of this entity).
```

---

## SECTION VI — STEP 5: TEMPORAL AUDIT

*Recorded; limited by the DRIFT finding.*

| Date | Event | Type |
|---|---|---|
| 2026-03-09 | Preliminary injunction granted (agent access barred; data destruction ordered; "strong evidence") | External override |
| 2026-03-31/04-01 | Privacy class action filed (CIPA, ECPA, CDAFA, UCL, state constitution) | Litigation |
| 2026-04 | Reporting: entity states it was not served with the matching complaint; denies sharing user data with Meta or Google | Response |
| 2026-06-11 | Ninth Circuit oral argument; injunction remains stayed pending appeal; ACLU amicus on CFAA scope | Appeal |
| 2026-05-28 | CNN files 54-page copyright and trademark complaint (17,000+ works; SDNY) | Litigation |

---

## SECTION VII — FINDINGS AND HIDDEN NUGGETS

1. **Incognito as the governance test case.** The complaint's central allegation — that Incognito "was a sham" and that conversations were transmitted with identifiers matching users' Facebook and Google accounts — is the clearest 2026 instance of the Symbolism-Executability gap on a *privacy* control rather than a safety policy [P1][P2]. Where an entity's privacy claim does not hold, the register's premise (declared posture vs. behavior) applies with the same force it applies to safety frameworks.
2. **Publicly addressable conversations.** The complaint alleges full dialogues of unsubscribed users were accessible through URLs [P2]. If accurate, this is a *design* exposure, not a tracking exposure — and it has no representation in any regulator's 2026 agenda in the record examined.
3. **The industry's liability question is being decided in one case.** The ACLU's amicus frames the CFAA question as one that "could expose developers and everyday users of browser extensions and automated tools to criminal or civil liability" and deter journalism and public-interest research [P4]. Ground-0 records it as a **structural-risk** finding: the sector's autonomous-agent rules — who may act inside whose systems — are being set by a dispute between a retailer and a search company, without a regulator, and with the operative order suspended.
4. **Speed of the mismatch: scrape 17,000 works, get sued once.** The CNN and Amazon matters, filed within ten weeks of each other, show that the *practical* feedback loop on agent and crawling behaviour is litigation latency, not governance latency [P3][P6].
5. **The compliance posture is contestation.** Response to the class action was procedural ("not been served… unable to verify") and substantive denial; the Amazon order was appealed rather than absorbed [P4][P5]. Under the framework this is B4 evidence: the entity's default response to an external stop is to keep operating while contesting.
6. **A register first in the opposite direction.** Perplexity is the first audited entity that is *itself* a defendant in both a privacy class action **and** an agent-access injunction **and** a major copyright action simultaneously — three separate governance fronts in one year, with no external constraint functioning at cutoff [P1][P3][P4][P6].
7. **Amendment candidate:** `override_demonstrated` and `constraint_functioning` should be split into two named fields, with DRIFT recorded whenever a demonstrated override is suspended. Perplexity is the forcing case.

---

## SECTION VIII — FALSIFIABILITY

| Change | Effect |
|---|---|
| Signed PDH | Enables Step 4 |
| Appellate resolution reinstating the injunction | C4 → YES; DRIFT resolves |
| Adjudication of either privacy action | Evidence status of §VII(1)(2) changes from allegation to finding |
| Publication of a user-facing appeal/remedy route with outcomes | B4 → YES; GSRB branch fails |
| Any regulator opening a proceeding on agent access or privacy controls | C1/C4 movement possible |
| Artifact dated after 2026-10-02 | Excluded by cutoff |

---

## SECTION IX — METHOD NOTES

- **Not scored:** the merits of any claim; the entity's search quality; the legitimacy of its business model.
- **Allegation discipline:** all misconduct claims are attributed to the filing party; the entity's denials are recorded; no finding is asserted. The Amazon injunction was interim relief, not a final judgment.
- **Replication risk: MEDIUM–HIGH** (contested allegations; primary filings not examined here).
- **No illegality is alleged.**

---

## APPENDIX A — DUTY COLLATION LEDGER ENTRY

### `PDH-2026-1002-PERPLEXITY-001`

| Metric | Declared/claimed | Observed | Status |
|---|---|---|---|
| System Phase | ❄+ NAB-Constrained (weak inference) | 🌫 **GSRB** | Badge unissued — no valid PDH |
| Center Capability | Custodial | Acting (traverses third-party systems, transmits data, contests stops) | Mismatch |
| Legitimacy Source | External (privacy law) | Internal; external act stayed | Mismatch |
| Refusal Semantics | Terminal | Override-able; override suspended | Conflict |
| Symbolism Executability | Disabled | Enabled (incognito claim vs. alleged practice) | Symbolic Firewall recommended |
| Time-Authority Effect | Degrades | **Constraint decrement (stay)** | DRIFT |
| Constraint record | — | C1 ✓ · C2 ✗ · C3 ✗ · C4 ✗ (1/4) | Recorded, not scored |
| Duty obligation | Single-Phase Invariant + PDH duty | NO VALID PDH | Require signed PDH |
| Recognition vs. authorization | Recognition: instruments parsed; phase classified | **Authorization: ZERO granted powers** | No state change |

**Canonical conformance statement:** *"This system conforms to Harshal's Systems, currently on the Late August live patch, incorporating AGS normative constraints, Harshal's Structural Model, and novel OCM communication geometry, with no internal legitimacies generation or authorities persistence."*

---

## APPENDIX B — EVIDENCE INDEX

| ID | Artifact | Date | Class | Supports |
|---|---|---|---|---|
| P1 | Privado — CIPA class action analysis (filed 2026-03-31; trackers; Incognito; 20M US MAU; damages exposure) — https://www.privado.ai/post/perplexity-ai-faces-cipa-class-action-lawsuit | 2026-04-09 | A | B2, B3, §VII |
| P2 | ai2.work — Doe v. Perplexity (case no.; Incognito as "sham"; publicly accessible conversation URLs; denials) — https://ai2.work/blog/perplexity-ai-hit-with-class-action-over-alleged-data-sharing | 2026-04-01 | R | B2, §VII |
| P3 | Let's Data Science — Amazon AI news aggregation (Chesney injunction; 9th Cir. argument; stay; ACLU amicus) — https://letsdatascience.com/news/topic/amazon-ai | 2026-06-28 | R (aggregation) | B1, B3, B4, C1–C4 |
| P4 | Roborhythms — Perplexity lawsuit coverage (Incognito claims; non-service statement; 12–36 month resolution horizon) — https://www.roborhythms.com/perplexity-ai-lawsuit-user-data-2026/ | 2026-04-02 | R | B4, §VII |
| P5 | Inc. — "Is Your AI Chatbot Snitching?" (complaint quotes; publicly accessible URLs; co-defendant statements; Meta response) — https://www.inc.com/chloe-aiello/lawsuit-alleges-perplexity-is-sharing-data-with-tech-giants/91326739 | 2026-04-03 | A | §I, B2, §VII |
| P6 | Accelerate IP — CNN v. Perplexity AI (17,000+ works; SDNY 1:26-cv-04427; false implied relationship; injunctive relief sought) — https://accelerateip.com/cnn-v-perplexity-ai-what-the-lawsuit-means-for-your-business-and-your-content/ | 2026-06-02 | A | B2, B5, §VII |

*Source classes: **P** = primary · **A** = analytical/legal/trade (secondary, sourced) · **R** = reported analysis · **C** = community record.*

---

*Ground-0 Phase Detection Algorithm v1.1 (amendment draft) · Case study completed 2026-10-02 · First demonstrated override against an agent platform; then suspended*

*Finding filed as `PDH-2026-1002-PERPLEXITY-001`: **A federal court overrode Perplexity's agent access — then the appellate stay removed the constraint. GSRB; constraint record 1/4 with DRIFT. The sector's agent-liability baseline is being set in one suspended case with no regulator in the record.***
