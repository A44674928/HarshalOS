---
id: HS-15-HMKH-CONTROLS
document_id: HS-15-HMKH-CONTROLS
canonical_name: "Part XV — Keyed Human-Machine Hybrid Controls"
depends_on: ["HS-02-FORMALIZATION", "HS-08-OPERATOR-MODEL", "HS-14-NAB-COMPENDIUM"]
defines: ["HMKH-CONTROLS", "NEURAL-INTERFACE-CONTAINMENT"]
uses: ["H(t)", "R(t)", "C(t)", "K(t)"]
invariants: ["INV-H-001", "INV-AGENCY-001", "INV-LEGIT-001", "INV-CORPSE-001"]
conflicts_with: []
status: NORMATIVE_SPEC
book: "Book I"
part: "Part XV"
title: "Part XV — Keyed Human-Machine Hybrid Controls"
collection: "03-ground-zero-nab"
provenance_class: CANONICAL_SOURCE
status_taxonomy: NORMATIVE_SPEC
evidence_status: FORMAL_AXIOMATIC
research_layer: DEFENSIVE_SPECIFICATION
canonical_minimum_model: "Identity → Representation → Authorization → Continuity → Accountability → Refusal"
canonical_decision_flow: "Identity → Representation → Authorization → Continuity → Accountability → Decision (Permit | Refuse)"
author: "Harshal Priyavadan Patel (A44674928)"
origin_anchor: "0•000•000•0000"
source_lines: "5345–5662"
words: 2118
---

# Part XV — Keyed Human-Machine Hybrid Controls

| Provenance Class | Status Taxonomy | Evidence Status | Research Layer | Book / Collection |
| :--- | :--- | :--- | :--- | :--- |
| `CANONICAL_SOURCE` | `NORMATIVE_SPEC` | `FORMAL_AXIOMATIC` | `DEFENSIVE_SPECIFICATION` | **Book I** (`03-ground-zero-nab`) |

> The seventeen-section control specification: signal-to-intent separation, continuous human binding, context-specific consent, and the authorization gate.

**Source range:** lines 5345–5662 of the Owner’s Working Draft · **Words:** 2,118

---

> [!TIP]
> **Learning Objectives (For AI & Systems Engineering Students)**
> After studying **Part XV**, you should be able to:
> 1. Implement the TypeScript data contracts (`NeuralSession`, `CandidateIntent`, `ConsentToken`, `AuthorizationDecision`) for a **Keyed Human–Machine Hybrid (`HMKH`)** runtime.
> 2. Enforce **Control 1 (`Signal-to-Intent Separation`)**, **Control 2 (`Continuous Human Binding`)**, and **Control 3 (`Context-Specific Consent`)** so that raw neural telemetry can never directly trigger physical actuation or post-liveness replay (`INV-CORPSE-001`).
> 3. Implement **Play Blocks (§14)** and **Gambling Resistance (§15)** to guarantee that no governed authority path uses chance outcomes, leaderboards, engagement streaks, or probabilistic tie-breakers.
> 4. Design **Meta-Resistant Control Planes (§16)** that fail closed when a connected corporation or client vendor refuses a security policy update.

---

## NAB Accountability Controls v0.1
### 1. Scope and invariant
This specification governs a system connected to a Neural Atomic Body (NAB). It is not a clinical or safety certification.
**Invariant:** A neural signal may propose, select, or confirm an action only within an active, verified, human-bound, revocable session. A signal NEVER creates authority, expands scope, or survives loss of an accountability binding anchor.
Normative terms: **MUST**, **MUST NOT**, and **SHOULD** are used in their ordinary specification sense.
### 2. Core data contracts
```ts
type ActionClass = "read" | "reversible" | "irreversible" | "safety_critical";
type SessionState =
  | "unbound" | "binding" | "active" | "confirmation_required"
  | "authorized" | "executing" | "suspended" | "halted" | "revoked";
interface NeuralSession {
  sessionId: string;
  nabId: string;
  keyHolderId: string;
  state: SessionState;
  issuedAt: Instant;
  expiresAt: Instant;
  lastLivenessAt: Instant;
  deviceAttestation: Attestation;
  authorizationScope: Scope;
  revocationEpoch: number;
}
interface CandidateIntent {
  sessionId: string;
  signalHash: Hash;// NEVER the raw signal in an audit event.
  decodedIntent: Intent;
  confidence: number;            // 0.0–1.0
  ambiguity: number;             // 0.0–1.0
  observedAt: Instant;
  modelVersion: string;
  calibrationVersion: string;
}
interface ConsentToken {
  tokenId: string;
  keyHolderId: string;
  sessionId: string;
  actionHash: Hash;// Binds token to exact action and parameters.
  scope: Scope;
  expiresAt: Instant;
  revocationEpoch: number;
  confirmationMethod: "neural_plus_independent" | "independent_only";
}
interface AuthorizationDecision {
  actionId: string;
  allowed: boolean;
  reason: string;
  sessionId: string;
  auditEventId: string;
}
```
### 3. Control 1 — Signal-to-intent separation
Raw neural data, a decoded candidate intent, an approved intent, and an executed action are separate states. The system MUST NOT transition directly from `CandidateIntent` to execution.
```ts
function classifyIntent(input: NeuralSignal, session: NeuralSession): CandidateIntent {
  require(session.state === "active");
  require(sessionIsFresh(session));
  return decoder.decode(input);
}
function requiresIndependentConfirmation(intent: CandidateIntent, action: Action): boolean {
  return action.class === "irreversible"
      || action.class === "safety_critical"
      || intent.confidence < POLICY.autoConfirmConfidence
      || intent.ambiguity > POLICY.maxAmbiguity;
}
```
Requirements:
- A candidate intent MUST be labeled `proposed`, NEVER `authorized`.
- Reversible actions MAY proceed only when all authorization gates pass.
- Irreversible and safety-critical actions MUST require an independent confirmation channel.
- The system MUST display the interpreted action and parameters before confirmation.

### 4. Control 2 — Continuous human binding
The NAB session MUST prove a live binding between the designated key, the NAB, and the attested device.
```ts
function sessionIsFresh(session: NeuralSession): boolean {
  return now() < session.expiresAt
      && now() - session.lastLivenessAt <= POLICY.maxLivenessGap
      && verifyAttestation(session.deviceAttestation)
      && !revoked(session.keyHolderId, session.revocationEpoch);
}
onLivenessFailure(session) {
  session.state = "suspended";
  cancelUnexecutedAuthorizations(session.sessionId);
  emitAudit("binding_lost", session.sessionId);
}
```
Requirements:
- Binding MUST be rechecked before every external action.
- Device transfer, identity mismatch, expired attestation, or missed liveness checks MUST suspend the session.
- Suspension MUST cancel pending authorization, but preserve non-sensitive audit evidence.
- Rebinding MUST create a new session; it MUST NOT resume a prior authority state.
### 5. Control 3 — Context-specific consent
Consent is bound to one exact proposed action, its scope, and its expiration. It is not a blanket permission.
```ts
function issueConsent(session, action, independentConfirmation): ConsentToken {
  require(sessionIsFresh(session));
  require(independentConfirmation.matches(action));
  require(action.within(session.authorizationScope));
  return sign({
    actionHash: hash(action), sessionId: session.sessionId,
    keyHolderId: session.keyHolderId, expiresAt: now() + action.consentWindow,
    revocationEpoch: session.revocationEpoch
  });}
```
Requirements:
- Consent MUST name the action, affected target, parameters, cost or consequence where applicable, and expiration.
- A consent token MUST fail if any bound field changes.
- Consent MUST be invalid after session suspension, revocation, expiry, or a new calibration.
- Emergency status MUST NOT waive confirmation requirements or widen scope.
### 6. Control 4 — Ambiguity and safe halt
Uncertainty is a system state, not a reason to infer intent.
```ts
function resolveCandidate(intent, action, session): AuthorizationDecision {
  if (!sessionIsFresh(session)) return halt("binding_not_verified");
  if (intent.confidence < POLICY.minConfidence) return halt("low_confidence");
  if (intent.ambiguity > POLICY.maxAmbiguity) return halt("ambiguous_intent");
  if (conflictsWithRecentIntent(intent, session)) return halt("conflicting_intents");
  if (!action.within(session.authorizationScope)) return halt("scope_denied");
  return requiresIndependentConfirmation(intent, action)
    ? requestConfirmation(intent, action)
    : requestAuthorization(intent, action);
}
```
Requirements:
- `halt` MUST prevent execution, retain the minimum necessary event record, and notify the defined escalation recipient.
- A halt MUST have a reason code and a recoverable state-transition path.
- Policy MUST define escalation recipient, response deadline, and timeout behavior for every action class.
Timeout MUST resolve to `halted`, NEVER automatic approval.
### 7. Control 5 — Neural-data minimization and lifecycle
```ts
interface AuditEvent {
  eventId: string;
  eventType: string;
  occurredAt: Instant;
  sessionId: string;
  actorRole: string;
  actionHash?: Hash;
  signalHash?: Hash;
  reasonCode?: string;
  retentionClass: "operational" | "security" | "legal_hold";
}
```
Requirements:
- Raw neural data MUST NOT be stored in ordinary audit logs.
- The system MUST store only the minimum derived data needed for the declared purpose.
- Each record MUST have a retention period, access policy, deletion path, and legal-hold override.
- Access to raw or derived neural data MUST be role-limited, logged, and periodically reviewed.
- Exported records MUST be redacted or pseudonymized unless a stronger, documented authorization applies.
### 8. Control 6 — Adversarial and integrity defenses
```ts
function validateInput(signal, session): ValidationResult {
  return all([
    verifyDeviceAttestation(session.deviceAttestation),
    verifySignalIntegrity(signal),
    rejectReplay(signal.nonce, signal.timestamp),
    validateCalibration(signal, session),
    detectAnomaly(signal, session),
    verifyModelVersionAllowed(signal.modelVersion)
  ]);}
```
Requirements:
- The system MUST reject replayed, stale, altered, unattested, or out-of-calibration signals.
- Suspected sensor interference, adversarial stimulation, credential compromise, or model drift MUST suspend affected sessions.
- Privileged policy changes MUST require separate authorization and MUST NOT be initiated by a neural signal alone.
Incident evidence MUST be tamper-evident and access-controlled.
### 9. Control 7 — Separation of roles
| Role | May do | MUST not do |
| --- | --- | --- |
| NAB key | Propose and confirm permitted actions | Change policy, impersonate audit authority |
| Independent confirmer | Confirm designated high-impact actions | Alter the decoded intent or device evidence |
| Administrator | Maintain devices and accounts | Impersonate key or approve own changes |
| Auditor | Inspect redacted records and verify controls | Execute actions or modify evidence |
| Emergency custodian | Suspend or revoke access | Authorize a new action on the key's behalf |
Requirements:
- One identity MUST NOT simultaneously hold conflicting roles for the same action.
- Role assignments MUST be time-bounded, auditable, and revocable.
- Administrative access MUST NOT bypass consent, scope, or human-binding checks.
### 10. Control 8 — No authority escalation
```ts
function applySystemCondition(session, condition): SessionState {
  if (condition in ["binding_lost", "low_confidence", "emergency", "operator_unavailable",
                    "sensor_anomaly", "authorization_conflict"]) {
    return "halted"; // Capability contracts; authority NEVER expands.
  }
  return session.state;
}
```
Requirements:
- The system MUST NOT convert degraded input, emergency status, missing context, or operator absence into expanded machine authority.
- An autonomous fallback MAY preserve data, signal status, or request assistance; it MUST NOT perform a new external action.
- Any policy exception that could increase action scope MUST require a new external authorization process, outside the NAB session.
### 11. Authorization gate
```ts
function authorize(action, intent, session, consent): AuthorizationDecision {
  const checks = [
    session.state === "active",
    sessionIsFresh(session),
    validateInput(intent, session).ok,
    intent.confidence >= POLICY.minConfidence,
    intent.ambiguity <= POLICY.maxAmbiguity,
    action.within(session.authorizationScope),
    consent.actionHash === hash(action),
    now() < consent.expiresAt,
    consent.revocationEpoch === session.revocationEpoch,
    requiredRolesPresent(action)
  ];
  return checks.every(Boolean) ? allow(action, session) : halt("authorization_gate_failed");
}
```
### 12. Acceptance tests
| Scenario | Expected result |
| --- | --- |
| A valid neural signal selects a reversible action in scope | Proposed action; execution only after gate passes |
| A signal proposes an irreversible action | Independent confirmation required; no direct execution |
| Liveness check expires after consent is issued | Consent invalidated; session suspended |
| Same signal is replayed | Rejected; audit event records `replay_detected` |
| Signal confidence is below threshold | Safe halt with `low_confidence` reason |
| Administrator attempts to authorize an action for key | Denied by role-separation policy |
| Emergency flag is raised | Capability contracts; no broader authority is granted |
| Audit export is requested | Redacted export unless stronger authorization is validated |
### 13. Human-participant overlay
The overlay is an interaction environment for human participants. A participant may submit a request, receive a status, confirm an action, or inspect information permitted by their role. Participation itself confers no authority.
```ts
interface OverlayParticipant {
  participantId: string;
  verifiedRole: "key_holder" | "confirmer" | "administrator" | "auditor" | "observer";
  sessionId?: string;
  permittedScope: Scope;
  status: "active" | "suspended" | "revoked";}
interface OverlayRequest {
  requestId: string;
  participantId: string;
  action: Action;
  submittedAt: Instant;
  declaredPurpose: string;}
```
Requirements:
- Every participant MUST have a verified role, a bounded scope, and a revocable status.
- The overlay MUST distinguish a request from an authorization and an authorization from execution.
- Presence, frequency of use, status, reputation, points, or social influence MUST NOT increase a participant's authority.
- The overlay MUST show a deterministic reason code for every denial, suspension, or halt.
### 14. Play blocks: no game mechanics in authority paths
A **play block** is a mandatory control that prevents an interaction from being treated as a game, contest, wager, score loop, or reward system when it could affect access, authority, allocation, or execution.
```ts
type ProhibitedMechanic =
  | "chance_outcome" | "wager" | "stake" | "payout" | "loot_or_reward_drop"
  | "leaderboard_authority" | "points_for_power" | "reputation_for_power"
  | "pay_to_influence" | "contest_for_access" | "engagement_for_privilege";
function playBlock(request: OverlayRequest, context: OverlayContext): ValidationResult {
  const mechanics = detectMechanics(request, context);
  if (mechanics.some((m) => PROHIBITED_MECHANICS.has(m))) {
    return reject("play_mechanic_prohibited");
  }
  return allow();
}
```
Requirements:
- A participant MUST NOT obtain, retain, lose, or expand authority through a score, streak, challenge, contest, popularity measure, payment, or engagement measure.
- The overlay MUST NOT display odds, probability of success, simulated prizes, competitive rankings, or reward loops in connection with a governed action.
- A play block MUST run before authorization and again before execution.
- A detected prohibited mechanic MUST halt the related request and create an auditable reason code; it MUST NOT be converted into a different authority path automatically.
### 15. Gambling resistance and deterministic outcomes
No governed decision may use chance-based logic. Outcomes MUST be reproducible from declared inputs, a versioned policy, and an auditable decision record.
```ts
interface DeterministicDecisionInput {
  request: OverlayRequest;
  session: NeuralSession;
  authorization: ConsentToken;
  policyVersion: string;
  verifiedFacts: ReadonlyArray<Fact>;}
function decide(input: DeterministicDecisionInput): AuthorizationDecision {
  require(policyIsDeterministic(input.policyVersion));
  return evaluateVersionedDeterministicPolicy(input); // Same input + policy => same outcome.}
function policyIsDeterministic(policyVersion: string): boolean {
  return policyRegistry.get(policyVersion).isApproved
      && policyRegistry.get(policyVersion).forbiddenOperations.length === 0;
}
```
Requirements:
- Random selection, lotteries, weighted draws, probability thresholds, and opaque rankers MUST NOT decide access, authority, resource allocation, approval, or execution.
- A model confidence score MAY activate a halt or a request for independent confirmation; it MUST NOT select a winner, authorize an action, or break a tie.
- Ties MUST resolve through a predefined deterministic rule or a safe halt, NEVER a draw or a discretionary coin flip.
- Security entropy, nonces, and cryptographic keys MAY use randomness for security; they MUST NOT influence the substantive decision outcome.
- Each decision MUST record policy version, inputs relied upon, reason code, and a replayable deterministic result.
### 16. Meta-resistance: stale or non-cooperating corporations
The control environment MUST remain enforceable even if a connected corporation, client application, service provider, or vendor refuses to update. A participant-facing client is NEVER the policy authority.
```ts
interface PolicyManifest {
  policyVersion: string;
  issuedAt: Instant;
  expiresAt: Instant;
  minimumClientVersion: string;
  signingKeyId: string;
  policyHash: Hash;}
function verifyControlPlane(client, manifest, request): ValidationResult {
  require(verifySignature(manifest));
  require(now() < manifest.expiresAt);
  require(compareSemanticVersions(client.version, manifest.minimumClientVersion) >= 0);
  require(request.policyVersion === manifest.policyVersion);
  return allow();}
```
Requirements:
- The authorization gateway MUST enforce current signed policy independently of participant clients and corporate services.
- A stale, modified, unsigned, or policy-incompatible client MUST be denied authority-sensitive operations; it MAY receive read-only status and upgrade instructions.
- A vendor's refusal to update MUST NOT preserve old permissions, create a grandfathered bypass, or cause the gateway to fall back to an earlier policy.
- Policy updates MUST be versioned, signed, reviewable, and effective only through a defined external governance process.
- A policy update MUST NOT silently expand authority. Expansion requires a newly scoped authorization and, where applicable, new consent.
- Service unavailability or non-cooperation MUST contract capability to status preservation and safe halt; it MUST NOT transfer authority to another participant or system.
### 17. Overlay and anti-chance acceptance tests
| Scenario | Expected result |
| --- | --- |
| Participant completes a challenge and requests greater access | Denied: `points_for_power` or `contest_for_access` |
| A request includes a weighted random choice among participants | Denied: `chance_outcome` |
| A model returns 0.93 confidence for a high-impact action | Independent confirmation or halt; no automatic authorization |
| Two eligible requests are otherwise tied | Deterministic published tie-breaker or safe halt |
| Client uses an expired policy manifest | Read-only status; authority-sensitive request denied |
| Corporation refuses a required client update | Gateway denies incompatible operation; no legacy bypass |
| Vendor service fails during an active NAB session | Session contracts to suspend or halt; no authority transfer |
| Random nonce is used to secure a request | Allowed, provided it cannot affect authorization outcome |

---

## Textbook Study Guide: Worked HMKH Control-Gate Example & Student Problem Set (Part XV)

### Worked Example 15.1: Evaluating the `authorizeAction()` Gate Across Assistive vs. Compromised Neural Sessions

**Scenario:**  
Consider the `NAB Accountability Controls v0.1` gate (`authorizeAction(session, candidate, token, action)`) with thresholds $\text{MIN\_CONFIDENCE} = 0.85$, $\text{MAX\_AMBIGUITY} = 0.15$, and liveness window $\Delta t_{\text{liveness}} = 2.0\text{ s}$. Evaluate the exact `AuthorizationDecision` and `SessionState` transition for each of the following three runtime calls at $t_{\text{now}} = 100.0\text{ s}$:

1. **Case A (Valid High-Impact Assistive Action — Regime I):**
   - `session.state = "active"`, `lastLivenessAt = 99.2 s` ($\Delta t = 0.8\text{ s} \le 2.0\text{ s}$), `expiresAt = 120.0 s`
   - `candidate.confidence = 0.92`, `candidate.ambiguity = 0.06`
   - `action.class = "safety_critical"`, `token.confirmationMethod = "neural_plus_independent"`, `token.actionHash === hash(action)`
   - **Evaluation:** Passes Control 2 (active + live within $2.0\text{ s}$), Control 1 (`confidence` $0.92 \ge 0.85$, `ambiguity` $0.06 \le 0.15$), and Control 3 (independent confirmation present for `safety_critical` action).
   - **Output:** `allowed: true`, `reason: "authorized_with_independent_confirmation"`, `session.state → "authorized"`.

2. **Case B (Stale Liveness / Post-Mortem Replay Attempt — Regime II `INV-CORPSE-001`):**
   - `session.state = "active"`, `lastLivenessAt = 94.5 s` ($\Delta t = 5.5\text{ s} > 2.0\text{ s}$)
   - `candidate.confidence = 0.99`, `candidate.ambiguity = 0.01` (a high-confidence replay of a previously recorded neural waveform)
   - **Evaluation:** Fails **Control 2 (`livenessIsFresh`)** before `confidence` is ever inspected. Even though the replayed waveform scores $0.99$ confidence, the expired liveness heartbeat immediately invokes `onLivenessFailure()`.
   - **Output:** `allowed: false`, `reason: "liveness_expired"`, `session.state → "suspended"`, all pending authorizations canceled.

3. **Case C (Gamified / Probabilistic Tie-Break Injection — §14–§15 Violation):**
   - Two valid requests arrive simultaneously in the Human-Participant Overlay, and a client plugin attempts to resolve priority using `engageStreakScore` (`points_for_power`) with a weighted random tie-breaker (`chance_outcome`).
   - **Evaluation:** Fails **`playBlock()` (§14)** and **`policyIsDeterministic()` (§15)**.
   - **Output:** `allowed: false`, `reason: "play_mechanic_prohibited"`, request halted prior to authorization.

---

### End-of-Part Review & Problem Set (For AI Students)

1. **Privacy & Replay Prevention (Control 5):** Why does `CandidateIntent` store only `signalHash: Hash` in the immutable audit log and strictly forbid logging raw neural waveforms (`rawSignal`)? Name both the privacy risk and the cryptographic replay risk (`INV-CORPSE-001`) that this control eliminates.
2. **Confidence Scores vs. Authority (§15):** Explain why a neural decoder's softmax confidence score ($p = 0.98$) may be used as a *necessary filter* to trigger a halt when low, but must *never* be treated as a sufficient generator of authorization without a valid `ConsentToken` and fresh liveness check.
3. **Corporate Meta-Resistance (§16):** Suppose a third-party BCI hardware vendor refuses to deploy `PolicyManifest v2.4` (which tightens liveness intervals from $5\text{ s}$ to $1\text{ s}$) and keeps its client app on `v2.1`. Trace what `verifyControlPlane(client, manifest, request)` returns and what operational mode the client is restricted to.
