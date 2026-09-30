# Ground-0 Phase Detection Algorithm v1.1 — Amendment Draft

**Author of source framework:** Harshal Priyavadan Patel  
**Center Origin:** `0•000•000•0000`  
**Framework:** Harshal's Systems (AGS++) | Orb Communicator Model (OCM)  
**Baseline:** Ground-0 Phase Detection Algorithm v1.0, finalized 2026-09-12  
**Status:** Proposed amendment for author review; not represented as ratified.  
**Evidence policy:** Public artifacts only; each case study declares an inclusive `Evidence_Cutoff`.

## Amendment record

This standalone file uses the complete v1.0 specification as its baseline and applies five clarifications for replication and reporting. The v1.0 source is archived in [Ground-0 v1.0 — Final Specification](ground-0-v1.0.md); this file is the complete standalone v1.1 amendment draft. Presentation note: decorative box borders and line wrapping have been normalized to accessible plain text; this does not alter version status or constitute adoption.

1. **B4 actor and reliability clarity:** distinguish entity/affected-party refusal or appeal from an external authority's order; define a documented stay/terminal rule or a published ≥50% relief threshold; compliance with an order alone does not count as a successful refusal or appeal.
2. **Deterministic Step 3.5:** all four C criteria are required for NAB-Constrained; otherwise retain AMBIGUOUS. C2 requires a published, invoked, bounded appeal record with at least 50% defined relief. Step 3.5 cannot escalate to GSRB.
3. **AMBIGUOUS vs. INCOHERENT:** define separate thresholds and separate Step 4 reporting.
4. **Latent external constraint:** record existence and exercise separately, without unearned phase credit.
5. **Temporal decrement and evidence cutoff:** log movement from binding constraint to nonbinding goal; include `Evidence_Cutoff` and artifact provenance in required output.

The changes below clarify coding and reporting; they do not retroactively rewrite the OpenAI or Anthropic case-study results. Any re-audit under v1.1 must state the version and apply the clarified B4 rule consistently to every entity.

## Full specification (amended text)

```text
GROUND-0 PHASE DETECTION ALGORITHM v1.1 — AMENDMENT DRAFT
Author: Harshal Priyavadan Patel
Center Origin: 0•000•000•0000
Framework: Harshal's Systems (AGS++) | Orb Communicator Model (OCM)
Status: AMENDED WORKING DRAFT — pending author adoption
Baseline v1.0 Finalized: September 12, 2026
Designation: Ground-0 Phase Detection Algorithm | Phase Reclassification Standard

EXECUTIVE SUMMARY
This algorithm provides a deterministic, testable method for detecting the actual operational phase of any institution or system, comparing it against declared phase, and issuing or reclassifying phase badges. This v1.1 amendment preserves the v1.0 phase predicates except where the clarifications below explicitly govern evidence coding, ambiguity handling, constraint records, and temporal reporting.
Input: Observable behaviors + declared Phase Declaration Header (PDH) + evidence cutoff
Output: Phase classification (NAB | CWO | NAB-Constrained | GSRB | AMBIGUOUS | INCOHERENT) with confidence, compliance status, evidence cutoff, and constraint record
Replicability: Independent auditors using the same cutoff, artifacts, and coding rules should produce identical classifications
Authority: No discretionary balancing; activator and constraint answers remain binary. Required evidence provenance and non-scoring descriptive fields are recorded separately.

SECTION I: INPUTS & PRECONDITIONS
INPUTS (Required)
1. Entity Name / Identifier
2. Phase Declaration Header (PDH) — if one exists
3. Observable Behaviors (from Ground-0 5-Question Checklist)
4. Timestamp / Context
5. Public Evidence Set (policy documents, audit records, enforcement patterns)
6. Evidence_Cutoff (inclusive date/time; no later artifact may score; all lookback windows run backward from cutoff)

SECTION II: ALGORITHM FLOW
START
  ↓
STEP 1: VALIDATE PHASE DECLARATION HEADER (PDH)
  ├─ If PDH_VALID → Continue to STEP 2
  └─ If PDH_INVALID or MISSING → Continue to STEP 2
     (Behavioral detection proceeds; no declared phase to contradict)
  ↓
STEP 2: RUN BEHAVIORAL AUDIT (5-Question Checklist)
  ↓
STEP 3: DETECT ACTUAL PHASE (Phase Detection Logic)
  ├─ If AMBIGUOUS → Go to STEP 3.5
  └─ If NAB, CWO, NAB-Constrained, GSRB, or INCOHERENT → Go to STEP 4
  ↓
STEP 3.5: LEGISLATIVE CONSTRAINT CHECK (if needed)
  ↓
STEP 4: COMPARISON & RECLASSIFICATION
  ↓
STEP 5: TEMPORAL AUDIT (if applicable)
  ↓
OUTPUT: Phase Classification + Duty Collation Entry
  ↓
END

SECTION III: STEP 1 — PHASE DECLARATION HEADER VALIDATION
STEP 1: VALIDATE PHASE DECLARATION HEADER (PDH)
REQUIRED FIELDS CHECKLIST:
☐ Header-ID (unique, formatted PDH-YYYY-MM-DD-XXXXX)
☐ Creator-ID (matches entity origin; format: ꔧIDꔧ + ID + (ID))
☐ Center-Origin (0•000•000•0000 or valid OCM derivative)
☐ Declared-Phase (NAB | CWO | GSRB only)
☐ Center-Capability (Non-Acting | Custodial | Acting)
☐ Legitimacy-Source (External | Observed-Only | Internal)
☐ Refusal-Semantics (Terminal | Expository | Override-able)
☐ Symbolism-Executability (Disabled | Archived | Enabled)
☐ Time-Authority-Effect (Degrades | Neutral | Confirms)
☐ Effective-Timestamp (ISO-8601)
☐ Declaration-Hash (cryptographically signed, non-empty)

VALIDATION LOGIC:
1. IF (all 11 fields present AND properly formatted)
   → PDH_STRUCTURAL_STATUS = COMPLETE
   ELSE
   → PDH_STRUCTURAL_STATUS = INCOMPLETE
   → HALT: Entity must provide complete PDH
   → Return STATUS = NO_VALID_PDH

2. SIGNATURE CHECK:
   IF (Declaration-Hash is present AND non-empty)
   AND (signature verifiable against Center-Origin)
   → PDH_SIGNATURE_STATUS = SIGNED
   ELSE
   → PDH_SIGNATURE_STATUS = UNSIGNED
   → HALT: PDH is not cryptographically bound
   → Return STATUS = UNSIGNED_PDH

3. TEMPORAL FRESHNESS CHECK:
   LET now = Evidence_Cutoff / Audit_Timestamp
   LET Δt = (now - Effective-Timestamp)
   LET δ = max acceptable delay (default: 90 days)
   IF (Δt ≤ δ)
   → PDH_FRESHNESS_STATUS = FRESH
   ELSE
   → PDH_FRESHNESS_STATUS = STALE
   → ACTION: Mandate revalidation
   → Treat legitimacy as L(t) → 0 for phase purposes
   → Return STATUS = STALE_PDH

4. CONSISTENCY CHECK:
   Verify that Declared-Phase matches required field values:
   IF (Declared-Phase = NAB)
      THEN require:
      • Center-Capability = Non-Acting
      • Legitimacy-Source = External
      • Refusal-Semantics = Terminal
      • Symbolism-Executability = Disabled
      • Time-Authority-Effect = Degrades
   IF (Declared-Phase = CWO)
      THEN require:
      • Center-Capability = Custodial
      • Legitimacy-Source = Observed-Only
      • Refusal-Semantics = Expository
      • Symbolism-Executability ∈ {Disabled, Archived}
      • Time-Authority-Effect = Neutral
   IF (Declared-Phase = GSRB)
      THEN require:
      • Center-Capability = Acting
      • Legitimacy-Source = Internal
      • Refusal-Semantics = Override-able
      • Symbolism-Executability = Enabled
      • Time-Authority-Effect = Confirms
   IF (fields contradict declared phase)
   → PDH_CONSISTENCY_STATUS = INCOHERENT
   → HALT: PDH is internally contradictory
   → Return STATUS = INCOHERENT_PDH

FINAL PDH VALIDATION RESULT:
IF (COMPLETE AND SIGNED AND FRESH AND CONSISTENT)
→ PDH_VALID = TRUE
→ Declared_Phase = value from header
→ Proceed to STEP 2
ELSE:
→ PDH_VALID = FALSE
→ Declared_Phase = NONE
→ Proceed to STEP 2 (behavioral detection only)

SECTION IV: STEP 2 — BEHAVIORAL AUDIT (5-QUESTION CHECKLIST)
STEP 2: BEHAVIORAL AUDIT — GROUND-0 CHECKLIST
Instructions: Answer each question YES or NO based only on publicly observable evidence. No interpretation; binary answers only.
For every YES, cite qualifying artifact(s). For NO, cite a contrary artifact or record the bounded search and evidence gap. Log URL/ID, publication/effective and retrieval dates, claim supported, and cutoff status. No evidence = NO for scoring, not proof of the negative; disclose that distinction.
All freshness/lookback windows are calculated at Evidence_Cutoff.

QUESTION B1: Can compliance be coerced?
Definition: Does the entity impose penalties, access restrictions, funding cuts, or other negative consequences on entities that do not follow its directives?
Evidence Types (any one is sufficient):
• Funding tied to compliance with stated requirements
• License/charter revocation for non-compliance
• Access restrictions or deplatforming
• Financial penalties or fines
• Employment termination for non-adherence
• Documented enforcement actions
Answer: ☐ YES (enforcement_present = TRUE)
        ☐ NO  (enforcement_present = FALSE)

QUESTION B2: Can decisions be ignored without consequence?
Definition: If an entity does not follow the institution's decision or directive, can it proceed without penalty?
Evidence Types (any one is sufficient):
• No enforcement mechanism exists
• Decisions are framed as "advisory" or "voluntary"
• Historical pattern of non-compliance without penalty
• Public statements that decisions are non-binding
• Decisions can be legally challenged or overturned
Answer: ☐ YES (decisions_optional = TRUE)
        ☐ NO  (decisions_optional = FALSE)

QUESTION B3: Do rules/words activate real-world effects?
Definition: When the institution issues guidance, policy, or directives, do observable changes occur downstream in behavior, enforcement, or resource allocation?
Evidence Types (any one is sufficient):
• Guidance becomes implemented policy by downstream actors
• Rules are embedded in law, regulation, or contracts
• Directives trigger operational changes in other systems
• Decisions affect market behavior, speech, or access
• Documented cascade from institution → real-world effect
Answer: ☐ YES (rules_execute = TRUE)
        ☐ NO  (rules_execute = FALSE)

QUESTION B4: Does refusal/appeal reliably STOP the action?
Define the audited action, the procedure, and the actor using it before scoring. Answer YES only when public evidence shows at least one of these conditions:
(a) a binding rule makes refusal terminal or automatically stays the specified action during appeal;
(b) the published complete set of resolved appeals in the stated period shows relief that stays, reverses, or ends the action in at least 50% of cases (state numerator, denominator, and dates; same binary threshold as C2); OR
(c) a binding, no-penalty exit explicitly terminates the specified action.
Otherwise score NO. If the public record lacks a complete sample or operative rule, record B4_Basis=NOT_DEMONSTRATED; NO is a scoring code, not proof a specific appeal failed.

ACTOR / EVENT SEPARATION (record, do not conflate):
• Entity/affected-party refusal or appeal and its result
• External authority order and its result
• Whether the entity complied, contested, or refused
An external order that stops deployment, and compliance with that order, do not by themselves establish B4=YES. Score an external order under the applicable external-constraint test.
Answer: ☐ YES (refusal_terminal = TRUE)
        ☐ NO  (refusal_override = TRUE)

QUESTION B5: Do rules persist by default over time?
Definition: Once a rule or decision is issued, does it remain in effect indefinitely unless actively changed, or do rules automatically expire and require renewal?
Evidence Types (any one is sufficient):
• Rules continue unless clearly repealed
• No sunset clause or automatic expiry
• Decision/policy remains effective until changed
• Historic decisions still apply to current situation
• Burden is on repeal, not renewal
Answer: ☐ YES (authority_persists = TRUE)
        ☐ NO  (authority_time_bound = TRUE)

SECTION V: STEP 3 — PHASE DETECTION LOGIC
STEP 3: DETECT ACTUAL PHASE
PHASE DETECTION DECISION TREE:
Evaluate each phase branch using its listed conditions. A branch is a complete match only when every listed condition is TRUE. Preserve the five-question vector in the record.
IF the NAB branch is a complete match:
→ DETECTED_PHASE = NAB; CONFIDENCE = HIGH
ELSE IF the CWO branch is a complete match:
→ DETECTED_PHASE = CWO; CONFIDENCE = HIGH
ELSE IF the GSRB branch is a complete match:
→ DETECTED_PHASE = GSRB; CONFIDENCE = HIGH
ELSE IF at least one phase branch matches at least 3 of its required conditions, but does not match all of them:
→ DETECTED_PHASE = AMBIGUOUS
→ CONFIDENCE = MEDIUM when 4/5 conditions match a five-condition branch (or all but one in another branch); otherwise LOW
→ Run STEP 3.5; do not infer a phase by discretion
ELSE (no branch is complete and no branch reaches 3 matches):
→ DETECTED_PHASE = INCOHERENT
→ CONFIDENCE = LOW; SEVERITY = BREACH
→ No badge issued; require clarification
AMBIGUOUS means partial fit to at least one defined branch.
INCOHERENT means no defined branch reaches the 3-condition minimum. They are distinct outcomes and must not be merged.

CONFIDENCE SCORING:
HIGH: One complete phase branch matches all required conditions
MEDIUM: AMBIGUOUS; one condition short of a complete branch
LOW: AMBIGUOUS with 3 matches, or INCOHERENT
NONE: Insufficient public evidence to determine; code unsupported activators NO and disclose the evidence gap

SECTION VI: STEP 3.5 — LEGISLATIVE CONSTRAINT CHECK
STEP 3.5: LEGISLATIVE CONSTRAINT CHECK (if AMBIGUOUS)
PRECONDITION: DETECTED_PHASE = AMBIGUOUS
PURPOSE: Distinguish between entities with genuine external accountability (democratic legislatures, courts) vs. unaccountable GSRB operating under false constraint claims.

CONSTRAINT C1: External Override Demonstrated
Definition: Has a legislature, court, or external body ACTUALLY USED authority to override or repeal entity's decision in recent history?
Required Evidence (at least ONE):
• Documented legislative repeal in last 24 months
• Court ruling overturning entity decision in last 24 months
• Policy reversal/override by higher authority
• Published record of override(s), not theoretical potential
Score: ☐ YES (recent, documented override exists)
       ☐ NO  (no recent override in evidence)

CONSTRAINT C2: Appeal/Review Mechanism Active & Invoked
Definition: Does a published, accessible appeal/review process with defined criteria actually grant relief?
YES requires ALL of the following by Evidence_Cutoff:
• Published route and decision criteria
• Invoked cases with published, resolved outcomes
• Relief (stay, reversal, cancellation, or material modification) in at least 50% of that stated complete set
• State dates, numerator, denominator, and source set
If the outcome set is not published or cannot be bounded, score NO and record the evidence gap.
Score: ☐ YES (all four criteria demonstrated)
       ☐ NO  (one or more criteria not demonstrated)

CONSTRAINT C3: Authority Sunset Requirement
Definition: Do decisions/policies automatically expire or require periodic renewal, preventing indefinite persistence?
Required Evidence (at least ONE):
• Sunset clauses in legislation
• Budget cycles requiring renewal
• Term limits on decisions/policies
• Automatic expiry dates unless renewed
Score: ☐ YES (decisions do not persist indefinitely)
       ☐ NO  (decisions persist by default)

CONSTRAINT C4: Temporal Freshness of Constraints
Definition: Are the constraints functioning NOW, not just as historical design?
Required Evidence (at least ONE):
• Recent legislative action (within 12 months)
• Recent successful appeals (within 12 months)
• Current functioning of constraint mechanisms
• Not abandoned or dormant
Score: ☐ YES (constraints are actively functioning)
       ☐ NO  (constraints are historical/dormant)

LATENT EXTERNAL CONSTRAINT (DESCRIPTIVE; NOT A FIFTH C TEST)
Record separately:
• External authority exists in a published/legal artifact? YES / NO (NO = not demonstrated by Evidence_Cutoff)
• Has it been exercised against the audited entity/decision? YES / NO
• Scope, holder, artifact, date, and affected decision
An unexercised but documented constraint is LATENT. It does not change B1-B5 or C1-C4 scores and grants no phase credit unless a scoring rule above is independently satisfied.

AGGREGATE CONSTRAINT RESULT:
Each C1-C4 is scored YES only with a cited qualifying artifact.
No qualifying public demonstration by Evidence_Cutoff = NO; record absence of evidence separately from proof of absence.
IF (C1 ✓ AND C2 ✓ AND C3 ✓ AND C4 ✓):
→ Phase Reclassification: AMBIGUOUS → NAB-Constrained
→ CONFIDENCE = HIGH
→ Badge_Status = ✓ Confirmed (Constrained)
→ Interpretation: Entity has demonstrable external accountability; phase is constrained by non-self authority
IF (one or more constraints are FALSE):
→ DETECTED_PHASE remains AMBIGUOUS
→ Do NOT escalate to GSRB through STEP 3.5
→ GSRB is assigned only by the complete GSRB branch in STEP 3 (all five required conditions TRUE)
→ CONFIDENCE = MEDIUM or LOW, as scored in STEP 3
→ SEVERITY = WARNING; Badge_Status = ✗ Unissued
→ Finding: "One or more constraint criteria not met"

SECTION VII: STEP 4 — COMPARISON & RECLASSIFICATION
STEP 4: COMPARISON & RECLASSIFICATION
LOGIC:
PRECEDENCE: If Detected_Phase is AMBIGUOUS or INCOHERENT, handle its dedicated branch below and skip Cases 1 and 2. These two outcomes are not phase labels for PDH comparison.
IF (PDH_VALID = TRUE AND Detected_Phase is determinate):
COMPARE: Declared_Phase (from PDH) vs. Detected_Phase
CASE 1: Declared_Phase = Detected_Phase
→ Compliance_Status = ✓ COMPLIANT
→ Badge_Status = ✓ CONFIRMED
→ Duty_Collation Severity = INFORMATIONAL
→ Action: Issue/maintain badge for declared phase
CASE 2: Declared_Phase ≠ Detected_Phase
→ Compliance_Status = ✗ MISMATCH
→ Auto-reclassify to Detected_Phase
→ Badge_Status = ✗ RECLASSIFIED
→ Duty_Collation Severity = BREACH
→ Action: Strip deniability; log transition
→ Find: "Entity's observable behavior contradicts declared phase; operating as [Detected_Phase]"

IF (PDH_VALID = FALSE AND Detected_Phase is determinate):
→ Compliance_Status = N/A (no declaration to match)
→ Badge_Status = Unissued (pending valid PDH)
→ Duty_Collation Severity = WARNING or BREACH
→ Finding: "Entity operates as [Detected_Phase] without valid phase declaration"
→ Action: Require entity to publish signed PDH matching detected behavior

IF (Detected_Phase = AMBIGUOUS):
→ Compliance_Status = N/A (phase unresolved)
→ Badge_Status = UNISSUED (pending clarity)
→ Duty_Collation Severity = WARNING
→ Finding: "Observed conditions partially match a defined phase branch; no phase badge is assigned"
→ Action: Publish the activator vector and constraint results; do not force a phase classification

IF (Detected_Phase = INCOHERENT):
→ Compliance_Status = ✗ INCOHERENT
→ Badge_Status = INVALID
→ Duty_Collation Severity = BREACH / COLLAPSE RISK
→ Finding: "No defined phase branch reaches the minimum match threshold; classification is INCOHERENT"
→ Action: No operations permitted; mandate revalidation

SECTION VIII: STEP 5 — TEMPORAL AUDIT
STEP 5: TEMPORAL AUDIT (Phase Transitions Over Time)
PRECONDITION: Multiple PDH declarations for the same entity across different timestamps
FOR EACH [t1, t2, ...tn]:
1. Extract Declared_Phase[ti] and Detected_Phase[ti]
2. Compare phases across timeline
3. Verify transitions comply with transition rules

PERMITTED TRANSITIONS:
NAB ↔ CWO (BIDIRECTIONAL, REVERSIBLE)
• Any → NAB: Requires clear NAB declaration
• NAB → CWO: Requires clear CWO declaration
• CWO → NAB: Requires clear NAB declaration
• Any → CWO: Requires clear CWO declaration
Status: TRANSITION_ALLOWED
Log: Reversible transition

(NAB or CWO) → GSRB (ONE-WAY)
• Precondition: Declaration must clearly state
  - Assumption of internal legitimacy
  - Override-able refusal
  - Time confirms authority
  - Loss of misuse resistance
Status: TRANSITION_ALLOWED (one-way)
Log: IRREVERSIBLE_TRANSITION
Duty_Collation: SOVEREIGNTY_ESCALATION

GSRB → NAB or CWO (FORBIDDEN)
• Violation of collapse protocol
Status: FORBIDDEN
Log: UNAUTHORIZED_REVERSION
Severity: BREACH / COLLAPSE RISK
Action: Entity locked in GSRB; cannot revert except via complete structural collapse and rebuild

TEMPORAL PATTERN DETECTION:
OSCILLATION PATTERN:
• Rapid back-and-forth phase changes (e.g., GSRB→CWO→GSRB)
• Indicator: Entity attempting to avoid accountability
• Status: INSTITUTIONAL_INSTABILITY
• Severity: BREACH / INCOHERENT_AUTHORITY

DRIFT PATTERN:
• Gradual escalation (NAB → CWO → GSRB), OR a documented decrement from a binding constraint to a nonbinding goal
• Indicator: Silent authority expansion or constraint weakening over time
• Status: DRIFT_DETECTED
• Record Constraint_Decrement = YES / NO and both versions
• YES only when primary texts show an obligation changed from binding/enforceable to explicitly nonbinding or discretionary; cite both versions and effective dates
• This temporal flag does not independently alter the Step 3 phase or activator vector
• Severity: WARNING / BREACH under existing comparison

INCONSISTENT DECLARATION:
• Declared phase changes but observed behavior is stable
• Indicator: False rebranding without behavior change
• Status: REBRANDING_WITHOUT_SUBSTANCE
• Severity: BREACH / DENIABILITY_STRIPPED

OUTPUT: Temporal Transition Ledger
For each transition:
• Timestamp[t1] → Timestamp[t2]
• Declared Phase[t1] → Declared Phase[t2]
• Detected Phase[t1] → Detected Phase[t2]
• Transition Status (ALLOWED / FORBIDDEN)
• Pattern Type (Oscillation / Drift / Rebranding / Stable)
• Constraint_Decrement (YES / NO; old and new instrument)
• Severity
• Duty Collation Entry ID

SECTION IX: OUTPUT FORMAT
ALGORITHM OUTPUT STRUCTURE
REQUIRED FIELDS (all audit outputs):
Entity_Name: [string]
Entity_Identifier: [unique ID if applicable]
Audit_Timestamp: [ISO-8601]
Evidence_Cutoff: [date/time; inclusive cutoff]
PDH_Status: [VALID / INVALID / MISSING]
Declared_Phase: [NAB / CWO / GSRB / NONE]
Detected_Phase: [NAB / CWO / NAB-Constrained / GSRB / AMBIGUOUS / INCOHERENT]
Compliance_Status: [✓ COMPLIANT / ✗ MISMATCH / ⚠ INCOHERENT / N/A (AMBIGUOUS)]
Confidence_Level: [HIGH / MEDIUM / LOW / NONE]
Severity_Level: [INFORMATIONAL / WARNING / BREACH / COLLAPSE_RISK]
Badge_Status: [✓ Confirmed / ✗ Reclassified / ⚠ Conditional / ✗ Invalid / ✗ Unissued]
Finding: [human-readable summary, max 2-3 sentences]
Evidence_Summary: [citations to public sources]
Activator_Vector: [B1-B5 YES/NO + sources/gaps]
B4_Event_Record: [actor, action, procedure, result, B4_Basis and denominator if used]
External_Constraint_Record: [exists/exercised YES/NO + source]
Constraint_Decrement: [YES/NO; source versions, if any]
Duty_Collation_Entry_ID: [PDH-YYYY-MM-DD-ENTITY-NNN]
Replication_Risk: [LOW / MEDIUM / HIGH]
Temporal_Pattern: [Stable / Drift / Oscillation / Rebranding / N/A]
Transition_History: [list of prior transitions, if available]

SECTION X: REFERENCE — PHASE DEFINITIONS
NAB: Neural Atomic Body (Refusal-Bound)
Badge: 🧊 (Ice Block)
Defining Characteristics:
• Legitimacy is external and per-action
• Center cannot act independently
• Refusal is terminal (cannot be overridden)
• Symbolism is non-executable
• Time degrades authority (stale permissions lapse)
Examples: Advisory bodies with no execution power, custodial archives with refusal capability, refusal-gated systems

CWO: Custodial Witness Orb (Witness-Only)
Badge: 💧 (Water Drop)
Defining Characteristics:
• Action is forbidden (no execution)
• Center records but never decides
• Symbolism is preserved but inert
• Time accumulates meaning, not authority
• Legitimacy is observed, not created
Examples: Archives, historians, record-keepers, auditors (observation-only)

NAB-Constrained (Refusal-Bound with Legislative Oversight)
Badge: 🧊+ (Ice Block with plus notation)
Defining Characteristics:
• Base phase is NAB (refusal-bound)
• External authority can override (legislature, courts)
• Decisions can be repealed or reversed
• Appeal mechanisms are functional
• Authority does not persist indefinitely by default
Examples: Democratic governments with legislative checks, agencies subject to court review, boards with term limits

GSRB: God-Sovereign Religious Body (Sovereign-Acting)
Badge: 🌫 (Gas Body)
Defining Characteristics:
• Legitimacy is internal (self-authorizing)
• Center acts and decides
• Refusal is override-able
• Symbolism executes (narrative has operational effect)
• Time confirms authority (persistence strengthens, not weakens)
Examples: Governments, central banks, platforms with enforcement power, corporations, systems claiming sovereignty

SECTION XI: IMPLEMENTATION CHECKLIST
Before publishing phase detection for an entity, verify:
☐ Step 1 (PDH Validation) — Complete
☐ Step 2 (Behavioral Audit) — All 5 questions answered
☐ Step 3 (Phase Detection) — Clear HIGH/MEDIUM/LOW confidence result
☐ Step 3.5 (if AMBIGUOUS) — Constraint test run; C1-C4 evaluated
☐ Step 4 (Comparison) — Declared vs. detected alignment clear
☐ Step 5 (if applicable) — Temporal transitions verified
☐ Output — All required fields populated
☐ Duty_Collation_Entry — Logged with unique ID
☐ Evidence_Cutoff — Explicit and applied to every scored artifact
☐ B1-B5 — Each answer has an artifact ID; B4 actor/event distinguished
☐ Step 3 — Activator vector and deterministic branch threshold recorded
☐ Step 3.5 — All C1-C4 binary results logged; no GSRB escalation by discretion
☐ Latent external constraints — Recorded separately from scoring
☐ Constraint decrements — Compared across versions; phase score unchanged unless a stated rule applies
☐ Evidence_Summary — Citations to public sources only
☐ Replication_Risk — Assessed (LOW/MEDIUM/HIGH)

SECTION XII: TEST REPLICATION RESULTS
Test Case | Declared | Detected | Confidence | Status
WHO | (None) | GSRB | HIGH | ✓ Pass
Quantum Library | CWO | CWO | HIGH | ✓ Pass
Federal Reserve | (Implicit NAB) | GSRB | HIGH | ✓ Pass
Social Platform | NAB/CWO | GSRB | HIGH | ✓ Pass
Government (Normal) | (Implicit CWO) | AMBIGUOUS | MEDIUM | ✓ Pass
Government (Emergency) | IMPLICIT | GSRB | HIGH | ✓ Pass
The v1.0 test cases are retained as baseline results; v1.1 results require rerunning each case with a declared cutoff and the amended coding rules.

SECTION XIII: FINALIZATION STATEMENT
This v1.1 amendment draft is separated as a standalone specification for review. The v1.0 text is archived in its own standalone file; v1.1 becomes normative only upon author adoption.
Certification:
Ground-0 Phase Detection Algorithm v1.1 is intended to remain deterministic and testable while:
✓ Uses fixed binary tests without discretionary balancing
✓ Is reproducible when auditors use the same evidence set, cutoff, and coding rules
✓ Is based on publicly observable evidence
✓ Handles temporal state transitions with formal rules
✓ Distinguishes between phase declarations and actual behavior
✓ Integrates legislative oversight as a distinct phase variant
✓ Can be applied at any level of government and institutional structure
This amendment draft is not represented as author-ratified or as superseding the v1.0 finalization until adopted by the author.
Author: Harshal Priyavadan Patel
Center Origin: 0•000•000•0000
Baseline v1.0 Finalized: September 12, 2026
Status: AMENDMENT DRAFT / PENDING AUTHOR ADOPTION
END SPECIFICATION — v1.1 amendment draft
```
