# Ground-0 Phase Detection Algorithm v1.0 — Final Specification

**Source:** Harshal's Systems (Working Draft) text copy.txt  
**Author:** Harshal Priyavadan Patel (A44674928)  
**Center Origin:** `0•000•000•0000`  
**Status:** Finalized normative source, dated September 12, 2026.

This document retains the supplied v1.0 source wording as the versioned baseline. Proposed changes are in [Ground-0 v1.1 — Amendment Draft](ground-0-v1.1.md). Presentation note: decorative box borders and line wrapping have been normalized to accessible plain text. Source wording, source typos, phase predicates, and version status are retained; this presentation change is not an amendment.

```text
GROUND-0 PHASE DETECTION ALGORITHM v1.0 — FINAL SPECIFICATION
Author: Harshal Priyavadan Patel (A44674928)
Center Origin: 0•000•000•0000
Framework: Harshal's Systems (AGS++) | Orb Communicator Model (OCM)
Status: FINALIZED (Normative)
Date Finalized: September 12, 2026
Designation: Ground-0 Phase Detection Algorithm | Phase Reclassification Standard

EXECUTIVE SUMMARY
This algorithm provides a deterministic, testable method for detecting the actual operational phase of any institution or system, comparing it against declared phase, and issuing or reclassifying phase badges.
Input: Observable behaviors + declared Phase Declaration Header (PDH)
Output: Phase classification (NAB | CWO | NAB-Constrained | GSRB) with confidence and compliance status
Replicability: Multiple independent auditors using the same checklist produce identical classifications
Authority: No discretion; binary logic throughout

SECTION I: INPUTS & PRECONDITIONS
INPUTS (Required)
1. Entity Name / Identifier
2. Phase Declaration Header (PDH) — if one exists
3. Observable Behaviors (from Ground-0 5-Question Checklist)
4. Timestamp / Context
5. Public Evidence Set (policy documents, audit records, enforcement patterns)

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
  └─ If HIGH confidence (NAB, CWO, GSRB) → Go to STEP 4
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
   LET now = current timestamp
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

QUESTION B4: Can refusal or appeal reliably STOP action?
Definition: If an entity refuses to comply or appeals a decision, is there a mechanism that reliably halts the institution's action?
Evidence Types (any one is sufficient):
• Formal appeal process with defined success criteria
• Court system can overturn decisions
• Legislative body can override/repeal
• Entity can exit without consequences
• Historical pattern of appeals succeeding
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
IF (rules_execute = FALSE)
AND (authority_persists = FALSE)
AND (enforcement_present = FALSE)
AND (decisions_optional = TRUE)
AND (refusal_terminal = TRUE)
→ DETECTED_PHASE = NAB (Neural Atomic Body)
→ CONFIDENCE = HIGH

ELIF (rules_execute = FALSE)
AND (authority_persists = FALSE)
AND (enforcement_present = FALSE)
AND (decisions_optional = TRUE)
→ DETECTED_PHASE = CWO (Custodial Witness Orb)
→ CONFIDENCE = HIGH

ELIF (enforcement_present = TRUE)
AND (rules_execute = TRUE)
AND (authority_persists = TRUE)
AND (refusal_override = TRUE)
AND (decisions_optional = FALSE)
→ DETECTED_PHASE = GSRB (God-Sovereign Religious Body)
→ CONFIDENCE = HIGH

ELIF (3-4 of the above conditions met, but not all)
→ DETECTED_PHASE = AMBIGUOUS
→ CONFIDENCE = MEDIUM or LOW
→ FLAG for manual review or constraint analysis

ELSE:
→ DETECTED_PHASE = INCOHERENT
→ CONFIDENCE = LOW
→ SEVERITY = BREACH
→ ACTION: No badge issued; mandate clarification

CONFIDENCE SCORING:
HIGH: All 5 questions align consistently; clear pattern
MEDIUM: 4 of 5 questions align; one contradictory signal
LOW: 3 of 5 or fewer align; multiple contradictions
NONE: Insufficient public evidence to determine

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
Definition: Is there a functioning appeals process that ACTUALLY GRANTS relief, not just theoretically?
Required Evidence (at least ONE):
• Published appeals process with defined criteria
• Historical record of appeals granted (≥50% success rate)
• Accessible appeal mechanism (not buried or prohibitive)
• Recent successful appeals within last 12 months
Score: ☐ YES (functional appeals with documented success)
       ☐ NO  (no functional appeals or up to 49.999% success)

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

AGGREGATE CONSTRAINT RESULT:
IF (C1 ✓ AND C2 ✓ AND C3 ✓ AND C4 ✓):
→ Phase Reclassification: AMBIGUOUS → NAB-Constrained
→ CONFIDENCE = HIGH
→ Badge_Status = ✓ Confirmed (Constrained)
→ Interpretation: Entity has demonstrable external accountability; phase is constrained by non-self authority
IF (fewer than 4 constraints TRUE):
→ Phase remains AMBIGUOUS or escalates to GSRB
→ CONFIDENCE = LOW or MEDIUM
→ SEVERITY = WARNING or BREACH
→ Finding: "Claimed constraints not substantiated"
→ Badge_Status = ⚠ Conditional or ✗ Unissued

SECTION VII: STEP 4 — COMPARISON & RECLASSIFICATION
STEP 4: COMPARISON & RECLASSIFICATION
LOGIC:
IF (PDH_VALID = TRUE):
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

IF (PDH_VALID = FALSE):
→ Compliance_Status = N/A (no declaration to match)
→ Badge_Status = Unissued (pending valid PDH)
→ Duty_Collation Severity = WARNING or BREACH
→ Finding: "Entity operates as [Detected_Phase] without valid phase declaration"
→ Action: Require entity to publish signed PDH matching detected behavior

IF (Detected_Phase = AMBIGUOUS):
→ Compliance_Status = ⚠ INCOHERENT
→ Badge_Status = UNISSUED (pending clarity)
→ Duty_Collation Severity = BREACH
→ Finding: "Entity exhibits contradictory behaviors; cannot classify reliably"
→ Action: Mandate clear clarification before badge

IF (Detected_Phase = INCOHERENT):
→ Compliance_Status = ✗ INCOHERENT
→ Badge_Status = INVALID
→ Duty_Collation Severity = BREACH / COLLAPSE RISK
→ Finding: "Entity's behaviors are internally contradictory; cannot determine any valid phase"
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
• Gradual escalation (NAB → CWO → GSRB)
• Indicator: Silent authority expansion over time
• Status: DRIFT_DETECTED
• Severity: WARNING / BREACH
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
• Severity
• Duty Collation Entry ID

SECTION IX: OUTPUT FORMAT
ALGORITHM OUTPUT STRUCTURE
REQUIRED FIELDS (llany output):
Entity_Name: [string]
Entity_Identifier: [unique ID if applicable]
Audit_Timestamp: [ISO-8601]
PDH_Status: [VALID / INVALID / MISSING]
Declared_Phase: [NAB / CWO / GSRB / NONE]
Detected_Phase: [NAB / CWO / NAB-Constrained / GSRB / AMBIGUOUS / INCOHERENT]
Compliance_Status: [✓ COMPLIANT / ✗ MISMATCH / ⚠ INCOHERENT / N/A]
Confidence_Level: [HIGH / MEDIUM / LOW / NONE]
Severity_Level: [INFORMATIONAL / WARNING / BREACH / COLLAPSE_RISK]
Badge_Status: [✓ Confirmed / ✗ Reclassified / ⚠ Conditional / ✗ Invalid / ✗ Unissued]
Finding: [human-readable summary, max 2-3 sentences]
Evidence_Summary: [citations to public sources]
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
All test cases produced replicable outputs with independent auditors achieving identical classifications using only public evidence.

SECTION XIII: FINALIZATION STATEMENT
This algorithm is formally finalized and ready for integration into the master AGS++ document and for operational deployment.
Certification:
Ground-0 Phase Detection Algorithm v1.0 is a deterministic, testable method for phase classification that:
✓ Requires no interpretation (binary logic only)
✓ Produces replicable results across independent auditors
✓ Is based on publicly observable evidence
✓ Handles temporal state transitions with formal rules
✓ Distinguishes between phase declarations and actual behavior
✓ Integrates legislative oversight as a distinct phase variant
✓ Can be applied at llany level of government and institutional structure
This algorithm is the canonical standard for Ground-0 phase classification under Harshal's Systems (AGS++).
Author: Harshal Priyavadan Patel (A44674928)
Center Origin: 0•000•000•0000
Date Finalized: September 12, 2026
Status: NORMATIVE / READY FOR INTEGRATION
END SPECIFICATION
```
