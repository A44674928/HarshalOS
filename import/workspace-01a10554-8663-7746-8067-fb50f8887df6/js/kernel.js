/* ═══════════════════════════════════════════════════════════════
   HarshalOS — private kernel closure
   Accountability-gated state machine:
     L(t) = H(t) × f(A(t), R(t), S(t))
     x(t) = Permitted if L(t) ≥ τ, else Refusal
     S(t) = Smax × max(0, 1 − Δt/δ)     (temporal decay)
   Precedence: no optimization objective may override a stopping condition.

   Mutable state and transition logic remain inside this closure. Every state
   change is proposed, checked by assertTransition(), and committed through
   commitState(). Public observations are detached, deeply frozen snapshots.

   Cryptographic schema (js/crypto.js):
     · PDH Declaration-Hash  = SHA-256 over the canonical header fields
     · PLV duty ledger       = SHA-256 hash chain, genesis prev = 64 zeros
     · Session identifiers  = browser-local random IDs, tied by a SHA-256 receipt
     · Human Key demonstration = browser-local HMAC tag; not authentication
   Session IDs and receipt digests are demo integrity metadata, not signatures.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

(() => {
  /* ---------- constants (absolute constraints) ---------- */
  const TAU = 0.5;
  const DELTA_MAX = 240;
  const SMAX = 1.0;
  const CREATOR_ID = "HARSHAL";
  const CREATOR_ID_FORMULA = `§${CREATOR_ID}§ + ${CREATOR_ID} + (${CREATOR_ID})`;
  const CENTER = "0•000•000•0000";
  const CRYPTO = window.HOSCrypto;
  const sha256Hex = CRYPTO.sha256Hex;
  const hmacSha256Hex = CRYPTO.hmacSha256Hex;
  const CRYPTO_BACKEND = CRYPTO.backend;
  const DEMO_CHALLENGE = "HUMAN KEY — HARSHAL — I ANSWER";
  // This source-visible key exists only to exercise the local demo HMAC path.
  // It is deliberately not a credential and must never be used for production.
  const DEMO_MAC_KEY = "HARSHALOS-DEMO-ONLY::" + CREATOR_ID_FORMULA;
  const GENESIS_PREV = "0".repeat(64);
  const NativeDate = Date;
  const wallClockNow = NativeDate.now.bind(NativeDate);

  function secureId(prefix) {
    const webCrypto = window.crypto;
    if (!webCrypto || typeof webCrypto.getRandomValues !== "function") return null;
    try {
      const bytes = webCrypto.getRandomValues(new Uint8Array(16));
      const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
      return `${prefix}${hex}`;
    } catch {
      return null;
    }
  }

  function canonicalJson(value) {
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  const BOOT_ID = secureId("BOOT-");

  function nonActingSession(burned) {
    return {
      bound: null,
      state: "non-acting",
      burned,
      sessionId: null,
      bootId: null,
      pdhId: null,
      humanAttestationId: null,
      openedAt: null,
      operation: null
    };
  }

  function cloneData(value) {
    if (Array.isArray(value)) return value.map(cloneData);
    if (value && typeof value === "object") {
      const copy = {};
      Object.keys(value).forEach(key => { copy[key] = cloneData(value[key]); });
      return copy;
    }
    return value;
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(key => deepFreeze(value[key]));
    return Object.freeze(value);
  }

  function immutableCopy(value) {
    return deepFreeze(cloneData(value));
  }

  const SECURITY_PROFILE = immutableCopy({
    mode: "DEMO",
    humanKeyMechanism: "browser-local-demo-phrase-hmac",
    identityProof: false,
    livenessProof: false,
    productionAuthenticatorAvailable: false,
    productionAuthorizationAvailable: false,
    sessionBindingMechanism: "browser-local-random-id-and-sha256-ledger-receipt",
    independentReceiptSignatureAvailable: false,
    actionScope: "LOCAL-DEMO-ONLY"
  });

  function failure(code, reason, invariant) {
    return { ok: false, code, reason, ...(invariant ? { invariant } : {}) };
  }

  function demoResult(fields) {
    return immutableCopy({ ...fields, mode: SECURITY_PROFILE.mode, executionScope: SECURITY_PROFILE.actionScope });
  }

  function demoSuccess(fields = {}) {
    return demoResult({ ok: true, ...fields });
  }

  // Copy trusted phase data once so later mutation of the public DATA object
  // cannot alter the kernel's transition rules or declarations.
  const PHASES = immutableCopy(DATA.phases);
  const COLLAPSE_STEPS = Object.freeze(DATA.collapseSteps.slice());
  const PHASE_IDS = new Set(Object.keys(PHASES));
  const VALID_SEVERITIES = new Set(["info", "warning", "breach", "collapse", "permit"]);
  const SESSION_STATES = Object.freeze({
    query: "active",
    activate: "authorized",
    explain: "confirmation_required"
  });
  const VALID_SESSION_STATES = new Set(["non-acting", ...Object.values(SESSION_STATES)]);
  const ATTESTATION_STATUSES = new Set(["absent", "pending", "active", "failed", "revoked"]);
  const STATE_KEYS = Object.freeze([
    "H", "attestationStatus", "attestationId", "lastLivenessAt", "keySig", "keyFp", "A", "R", "phase",
    "declared", "session", "gsrbAck"
  ]);
  const TRANSITION_FIELDS = Object.freeze({
    "attestation-start": Object.freeze(["H", "attestationStatus", "attestationId", "lastLivenessAt", "keySig", "keyFp", "session", "gsrbAck"]),
    "attestation-complete": Object.freeze(["H", "attestationStatus", "attestationId", "keySig", "keyFp"]),
    "attestation-failure": Object.freeze(["H", "attestationStatus", "attestationId", "lastLivenessAt", "keySig", "keyFp"]),
    "human-revoke": Object.freeze(["H", "attestationStatus", "attestationId", "lastLivenessAt", "keySig", "keyFp", "session", "gsrbAck"]),
    phase: Object.freeze(["phase", "declared", "session", "gsrbAck"]),
    "collapse-ack": Object.freeze(["gsrbAck"]),
    factor: Object.freeze(["A", "R"]),
    "session-bind": Object.freeze(["session"]),
    "session-burn": Object.freeze(["session"]),
    "declaration-publish": Object.freeze(["declared"]),
    "declaration-hash": Object.freeze(["declared"])
  });

  function nowMs() {
    return wallClockNow();
  }

  function nowISO() {
    return new NativeDate(nowMs()).toISOString();
  }

  function makePDH(phaseId) {
    const phase = PHASES[phaseId];
    return {
      declaredPhase: phase.declaredPhase,
      centerCapability: phase.centerCapability,
      legitimacySource: phase.legitimacySource,
      refusalSemantics: phase.refusalSemantics,
      symbolismExecutability: phase.symbolismExecutability,
      timeAuthorityEffect: phase.timeAuthorityEffect,
      effectiveTimestamp: nowISO(),
      declarationHash: ""
    };
  }

  /* ---------- private state ---------- */
  const state = {
    H: 0,
    attestationStatus: "absent",
    attestationId: null,
    lastLivenessAt: 0,
    keySig: null,
    keyFp: null,
    A: 1.0,
    R: 1.0,
    phase: "NAB",
    declared: makePDH("NAB"),
    session: nonActingSession(0),
    gsrbAck: 0
  };
  Object.seal(state);

  let attestationGeneration = 0;
  let expiryNotifiedGeneration = 0;
  let currentBindingRowPromise = null;

  /* ---------- canonical invariant layer ---------- */
  function assertPhase(phase) {
    if (typeof phase !== "string" || !PHASE_IDS.has(phase)) {
      return failure("INVALID-PHASE", "Unknown phase. The declared phase was not changed.", "INV-PHASE-001");
    }
    return { ok: true, phase };
  }

  function assertFactor(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
  }

  function assertHumanKeyState(candidate = state) {
    if (!candidate || (candidate.H !== 0 && candidate.H !== 1)) {
      return failure("INVALID-HUMAN-KEY-STATE", "H(t) must be exactly 0 or 1.", "INV-H-001");
    }
    if (!ATTESTATION_STATUSES.has(candidate.attestationStatus)) {
      return failure("INVALID-ATTESTATION-STATE", "Demo attestation status must be a declared state-machine value.", "INV-H-002");
    }

    if (candidate.attestationStatus === "pending") {
      if (candidate.H !== 0 || !Number.isFinite(candidate.lastLivenessAt) || candidate.lastLivenessAt <= 0 ||
          candidate.attestationId !== null || candidate.keySig !== null || candidate.keyFp !== null) {
        return failure("INVALID-ATTESTATION-STATE", "Pending attestation must remain non-authorizing (H=0) and hold no attestation ID or signature material.", "INV-H-003");
      }
      return { ok: true, present: false, pending: true };
    }

    if (candidate.attestationStatus !== "active") {
      if (candidate.H !== 0 || candidate.lastLivenessAt !== 0 || candidate.attestationId !== null ||
          candidate.keySig !== null || candidate.keyFp !== null) {
        return failure("INVALID-ATTESTATION-STATE", `Attestation state '${candidate.attestationStatus}' cannot retain authority or ceremony material.`, "INV-H-004");
      }
      return { ok: true, present: false, pending: false, status: candidate.attestationStatus };
    }

    if (candidate.H !== 1 || !Number.isFinite(candidate.lastLivenessAt) || candidate.lastLivenessAt <= 0) {
      return failure("INVALID-HUMAN-KEY-STATE", "An active demo marker requires H=1 and a finite, positive ceremony timestamp.", "INV-H-005");
    }
    if (typeof candidate.keySig !== "string" || !/^[a-f0-9]{64}$/i.test(candidate.keySig) ||
        candidate.keyFp !== "0x" + candidate.keySig.slice(0, 16).toUpperCase() ||
        !BOOT_ID || typeof candidate.attestationId !== "string" || !/^HAT-[A-F0-9]{64}$/.test(candidate.attestationId)) {
      return failure("INVALID-HUMAN-KEY-STATE", "Active demo state requires a consistent local HMAC tag and Boot-bound demo attestation digest.", "INV-H-006");
    }
    return { ok: true, present: true, pending: false, status: "active" };
  }

  function assertTemporalState(candidate = state, at = nowMs()) {
    if (!candidate || (candidate.H !== 0 && candidate.H !== 1)) {
      return failure("INVALID-TEMPORAL-STATE", "Temporal state cannot be evaluated for an invalid Human Key state.", "INV-T-001");
    }
    if (candidate.H === 0) return { ok: true, fresh: false, deltaSeconds: Infinity };
    if (!Number.isFinite(candidate.lastLivenessAt) || candidate.lastLivenessAt <= 0 || !Number.isFinite(at)) {
      return failure("INVALID-TEMPORAL-STATE", "Liveness timestamps must be finite and positive.", "INV-T-002");
    }
    const dt = (at - candidate.lastLivenessAt) / 1000;
    if (!Number.isFinite(dt) || dt < 0) {
      return failure("INVALID-TEMPORAL-STATE", "A future or non-finite liveness timestamp fails closed.", "INV-T-003");
    }
    return { ok: true, fresh: dt < DELTA_MAX, deltaSeconds: dt };
  }

  function assertSessionState(candidate = state) {
    const session = candidate && candidate.session;
    if (!session || typeof session !== "object" || !VALID_SESSION_STATES.has(session.state)) {
      return failure("INVALID-SESSION-STATE", "Session state must be one of the declared states.", "INV-S-001");
    }
    const expectedKeys = ["bound", "state", "burned", "sessionId", "bootId", "pdhId", "humanAttestationId", "openedAt", "operation"].sort();
    if (Object.keys(session).sort().join("|") !== expectedKeys.join("|")) {
      return failure("INVALID-SESSION-STATE", "Session state contains missing or unexpected fields.", "INV-S-001");
    }
    if (!Number.isSafeInteger(session.burned) || session.burned < 0) {
      return failure("INVALID-SESSION-STATE", "Session burn count must be a non-negative safe integer.", "INV-S-002");
    }
    if (session.state === "non-acting") {
      if (session.bound !== null || session.sessionId !== null || session.bootId !== null || session.pdhId !== null ||
          session.humanAttestationId !== null || session.openedAt !== null || session.operation !== null) {
        return failure("INVALID-SESSION-STATE", "A non-acting session cannot retain binding or cryptographic-linkage fields.", "INV-S-003");
      }
    } else {
      if (typeof session.bound !== "string" || session.bound.trim().length === 0 || session.bound.length > 128) {
        return failure("INVALID-SESSION-STATE", "An active session requires a bounded caller-supplied identifier.", "INV-S-004");
      }
      const expectedPdhId = typeof candidate.declared?.declarationHash === "string" &&
        /^0x[A-F0-9]{64}$/.test(candidate.declared.declarationHash)
        ? `PDH-${candidate.declared.declarationHash.slice(2)}` : null;
      if (typeof session.sessionId !== "string" || !/^SID-[a-f0-9]{32}$/.test(session.sessionId) ||
          typeof session.bootId !== "string" || !/^BOOT-[a-f0-9]{32}$/.test(session.bootId) ||
          session.bootId !== BOOT_ID || !expectedPdhId || session.pdhId !== expectedPdhId ||
          typeof session.humanAttestationId !== "string" || session.humanAttestationId !== candidate.attestationId ||
          !Number.isFinite(session.openedAt) || session.openedAt <= 0 ||
          !Object.prototype.hasOwnProperty.call(SESSION_STATES, session.operation) ||
          SESSION_STATES[session.operation] !== session.state) {
        return failure("INVALID-SESSION-STATE", "An active session must bind its random Session-ID, current Boot-ID, current PDH-ID, active Human-Attestation-ID, and operation.", "INV-S-010");
      }
    }
    if (candidate.H === 0 && session.state !== "non-acting") {
      return failure("INVALID-SESSION-STATE", "A session cannot remain active without a Human Key.", "INV-S-005");
    }
    if (candidate.phase === "CWO" && session.state !== "non-acting") {
      return failure("INVALID-SESSION-STATE", "CWO is witness-only and cannot retain an active session.", "INV-S-006");
    }
    return { ok: true };
  }

  function assertDeclarationState(candidate = state) {
    const declared = candidate && candidate.declared;
    const phase = candidate && PHASES[candidate.phase];
    if (!declared || typeof declared !== "object" || !phase || declared.declaredPhase !== candidate.phase) {
      return failure("INVALID-DECLARATION", "The PDH must describe the currently declared phase.", "INV-PDH-001");
    }
    const fields = [
      "centerCapability", "legitimacySource", "refusalSemantics",
      "symbolismExecutability", "timeAuthorityEffect"
    ];
    if (fields.some(field => declared[field] !== phase[field])) {
      return failure("INVALID-DECLARATION", "PDH fields must match the frozen phase definition.", "INV-PDH-002");
    }
    if (typeof declared.effectiveTimestamp !== "string" || !Number.isFinite(NativeDate.parse(declared.effectiveTimestamp))) {
      return failure("INVALID-DECLARATION", "PDH requires a parseable effective timestamp.", "INV-PDH-003");
    }
    const hash = declared.declarationHash;
    if (hash !== "" && hash !== "SHA-256-UNAVAILABLE" && !(typeof hash === "string" && /^0x[A-F0-9]{64}$/.test(hash))) {
      return failure("INVALID-DECLARATION", "PDH digest must be empty, unavailable, or a SHA-256 hex digest.", "INV-PDH-004");
    }
    return { ok: true };
  }

  function assertStateInvariants(candidate = state) {
    if (!candidate || typeof candidate !== "object") {
      return failure("INVALID-STATE", "Kernel state must be an object.", "INV-STATE-001");
    }
    const keys = Object.keys(candidate).sort();
    if (keys.join("|") !== STATE_KEYS.slice().sort().join("|")) {
      return failure("INVALID-STATE", "Kernel state contains missing or unexpected fields.", "INV-STATE-002");
    }

    const phase = assertPhase(candidate.phase);
    if (!phase.ok) return phase;
    const human = assertHumanKeyState(candidate);
    if (!human.ok) return human;
    const temporal = assertTemporalState(candidate);
    if (!temporal.ok) return temporal;
    if (!assertFactor(candidate.A) || !assertFactor(candidate.R)) {
      return failure("INVALID-FACTOR", "A(t) and R(t) must be finite values in [0, 1].", "INV-L-001");
    }
    const session = assertSessionState(candidate);
    if (!session.ok) return session;
    const declaration = assertDeclarationState(candidate);
    if (!declaration.ok) return declaration;
    if (!Number.isInteger(candidate.gsrbAck) || candidate.gsrbAck < 0 || candidate.gsrbAck > COLLAPSE_STEPS.length) {
      return failure("INVALID-COLLAPSE-STATE", "Collapse acknowledgement count is outside the protocol bounds.", "INV-G-001");
    }
    if (candidate.phase === "GSRB" && candidate.gsrbAck !== 0) {
      return failure("INVALID-COLLAPSE-STATE", "Collapse acknowledgements must be consumed on entry to GSRB.", "INV-G-002");
    }
    return { ok: true };
  }

  function assertAuthorization(candidate = state) {
    const human = assertHumanKeyState(candidate);
    if (!human.ok) return human;
    if (candidate.attestationStatus === "pending") {
      return failure("DEMO-ATTESTATION-PENDING", "The local HMAC is still pending. H(t) remains 0 until the demo ceremony completes.", "INV-AUTH-001");
    }
    if (candidate.H !== 1) {
      return failure("NO-DEMO-CONFIRMATION", "A fresh local demo marker is required to exercise this simulated transition; no human identity is verified.", "INV-AUTH-001");
    }
    const temporal = assertTemporalState(candidate);
    if (!temporal.ok) return temporal;
    if (!temporal.fresh) {
      return failure("STALE-PERMISSION", `Local demo timer expired (Δt ≥ δ = ${DELTA_MAX}s); no independently verified liveness is available.`, "INV-AUTH-002");
    }
    return { ok: true };
  }

  function sameData(left, right) {
    if (left === right) return true;
    if (left === null || right === null || typeof left !== typeof right) return false;
    if (typeof left !== "object") return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    if (leftKeys.join("|") !== rightKeys.join("|")) return false;
    return leftKeys.every(key => sameData(left[key], right[key]));
  }

  function changedOnly(previous, candidate, allowedFields) {
    const allowed = new Set(allowedFields);
    return STATE_KEYS.every(key => allowed.has(key) || sameData(previous[key], candidate[key]));
  }

  function assertTransition(kind, previous, candidate, metadata = {}) {
    const fields = TRANSITION_FIELDS[kind];
    if (!fields) return failure("UNKNOWN-TRANSITION", "Transition type is not registered.", "INV-TRANSITION-001");

    const previousInvariant = assertStateInvariants(previous);
    if (kind !== "human-revoke" && !previousInvariant.ok) {
      return failure("CURRENT-STATE-INVALID", `Current state failed ${previousInvariant.invariant || previousInvariant.code}.`, "INV-TRANSITION-002");
    }
    // Evaluate authorization/policy before validating an otherwise-invalid
    // proposed active binding (for example, CWO must report its policy denial
    // rather than the shape error caused by attempting an active session).
    if (kind === "session-bind") {
      if (previous.phase === "CWO") {
        return failure("CWO-FORBIDDEN", "Phase CWO is witness-only; session activation is forbidden.", "INV-S-007");
      }
      const authorization = assertAuthorization(previous);
      if (!authorization.ok) return authorization;
    }
    const candidateInvariant = assertStateInvariants(candidate);
    if (!candidateInvariant.ok) return candidateInvariant;
    if (!changedOnly(previous, candidate, fields)) {
      return failure("UNDECLARED-STATE-CHANGE", `Transition '${kind}' attempted to change fields outside its contract.`, "INV-TRANSITION-003");
    }

    if (kind === "attestation-start") {
      const sessionCleared = sameData(candidate.session, nonActingSession(previous.session.burned));
      if (metadata.generation !== attestationGeneration || !Number.isFinite(metadata.timestamp) || metadata.timestamp <= 0 ||
          candidate.H !== 0 || candidate.attestationStatus !== "pending" || candidate.attestationId !== null ||
          candidate.lastLivenessAt !== metadata.timestamp || candidate.keySig !== null || candidate.keyFp !== null ||
          !sessionCleared || candidate.gsrbAck !== 0) {
        return failure("INVALID-ATTESTATION-START", "A new ceremony must be pending with H=0 and clear prior authority, attestation ID, session binding, signatures, and collapse progress.", "INV-H-007");
      }
      return { ok: true };
    }

    if (kind === "attestation-complete") {
      const matchesCurrentCeremony = metadata.generation === attestationGeneration &&
        previous.attestationStatus === "pending" && previous.H === 0 &&
        previous.lastLivenessAt === metadata.timestamp && candidate.lastLivenessAt === metadata.timestamp &&
        candidate.attestationStatus === "active" && candidate.H === 1 &&
        metadata.attestationId === candidate.attestationId;
      if (!matchesCurrentCeremony) {
        return failure("ATTESTATION-SUPERSEDED", "Attestation result no longer matches the current pending Human Key ceremony.", "INV-H-008");
      }
      const temporal = assertTemporalState(candidate, nowMs());
      if (!temporal.ok || !temporal.fresh) {
        return failure("ATTESTATION-EXPIRED", "The ceremony's local freshness window expired before HMAC completion; the marker remains inactive.", "INV-H-009");
      }
      return { ok: true };
    }

    if (kind === "attestation-failure") {
      if (metadata.generation !== attestationGeneration || previous.attestationStatus !== "pending" || previous.H !== 0 ||
          previous.lastLivenessAt !== metadata.timestamp || candidate.H !== 0 || candidate.attestationStatus !== "failed" ||
          candidate.attestationId !== null || candidate.lastLivenessAt !== 0 || candidate.keySig !== null || candidate.keyFp !== null) {
        return failure("ATTESTATION-SUPERSEDED", "Failure result no longer matches the current pending Human Key ceremony.", "INV-H-010");
      }
      return { ok: true };
    }

    if (kind === "human-revoke") {
      if (candidate.H !== 0 || candidate.attestationStatus !== "revoked" || candidate.attestationId !== null ||
          candidate.lastLivenessAt !== 0 || candidate.keySig !== null || candidate.keyFp !== null ||
          !sameData(candidate.session, nonActingSession(previous.session.burned)) || candidate.gsrbAck !== 0) {
        return failure("INVALID-REVOCATION", "Revocation must clear liveness, attestation ID, signatures, active session, and partial collapse progress.", "INV-H-011");
      }
      return { ok: true };
    }

    if (kind === "phase") {
      const target = assertPhase(candidate.phase);
      if (!target.ok) return target;
      if (candidate.phase === previous.phase) {
        return failure("UNCHANGED-PHASE", "Declared phase unchanged. Single-phase invariant holds.", "INV-PHASE-002");
      }
      if (previous.phase === "GSRB" && candidate.phase !== "GSRB") {
        return failure("GSRB-REBUILD-REQUIRED", "GSRB → others requires collapse and rebuild; prior guarantees cannot be quietly reclaimed.", "INV-PHASE-003");
      }
      if (candidate.phase === "GSRB" || previous.phase === "GSRB") {
        const authorization = assertAuthorization(previous);
        if (!authorization.ok) return authorization;
      }
      if (candidate.phase === "GSRB" && previous.gsrbAck < COLLAPSE_STEPS.length) {
        return failure("COLLAPSE-REQUIRED", "Transitions into GSRB require all collapse acknowledgements.", "INV-PHASE-004");
      }
      if (candidate.gsrbAck !== 0) {
        return failure("INVALID-COLLAPSE-STATE", "Phase transitions reset collapse progress.", "INV-PHASE-005");
      }
      if (candidate.phase === "CWO" || candidate.phase === "GSRB") {
        if (!sameData(candidate.session, nonActingSession(previous.session.burned))) {
          return failure("INVALID-SESSION-STATE", "Phase transition must clear the active session without changing its burn history before entering CWO or GSRB.", "INV-PHASE-006");
        }
      } else if (!sameData(candidate.session, previous.session)) {
        return failure("INVALID-SESSION-STATE", "A phase transition cannot also bind, burn, or otherwise mutate the session.", "INV-PHASE-007");
      }
      return { ok: true };
    }

    if (kind === "collapse-ack") {
      const authorization = assertAuthorization(previous);
      if (!authorization.ok) return authorization;
      if (previous.phase === "GSRB" || metadata.index !== previous.gsrbAck ||
          previous.gsrbAck >= COLLAPSE_STEPS.length || candidate.gsrbAck !== previous.gsrbAck + 1) {
        return failure("INVALID-COLLAPSE-STEP", "Collapse steps must be acknowledged once, in order, before GSRB.", "INV-G-003");
      }
      return { ok: true };
    }

    if (kind === "factor") {
      const field = metadata.field;
      if ((field !== "A" && field !== "R") || !assertFactor(candidate[field])) {
        return failure("INVALID-FACTOR", "Only A(t) or R(t) may be changed, to a finite value in [0, 1].", "INV-L-002");
      }
      return { ok: true };
    }

    if (kind === "session-bind") {
      const authorization = assertAuthorization(previous);
      if (!authorization.ok) return authorization;
      if (previous.phase === "CWO") {
        return failure("CWO-FORBIDDEN", "Phase CWO is witness-only; session activation is forbidden.", "INV-S-007");
      }
      if (typeof metadata.id !== "string" || !Object.prototype.hasOwnProperty.call(SESSION_STATES, metadata.operation) ||
          candidate.session.bound !== metadata.id || candidate.session.state !== SESSION_STATES[metadata.operation] ||
          candidate.session.burned !== previous.session.burned ||
          candidate.session.sessionId !== metadata.sessionId || candidate.session.bootId !== metadata.bootId ||
          candidate.session.pdhId !== metadata.pdhId || candidate.session.humanAttestationId !== metadata.humanAttestationId ||
          candidate.session.openedAt !== metadata.openedAt || candidate.session.operation !== metadata.operation ||
          metadata.bootId !== BOOT_ID || metadata.humanAttestationId !== previous.attestationId) {
        return failure("INVALID-SESSION-BINDING", "Session binding does not match the current demo Boot-ID, PDH-ID, attestation, operation, and identifier.", "INV-S-008");
      }
      return { ok: true };
    }

    if (kind === "session-burn") {
      if (!sameData(candidate.session, nonActingSession(previous.session.burned + 1))) {
        return failure("INVALID-SESSION-BURN", "A burn must clear all binding fields and increment the counter exactly once.", "INV-S-009");
      }
      return { ok: true };
    }

    if (kind === "declaration-publish") {
      const authorization = assertAuthorization(previous);
      if (!authorization.ok) return authorization;
      if (candidate.declared.declaredPhase !== previous.phase || candidate.declared.declarationHash !== "") {
        return failure("INVALID-DECLARATION", "PDH publication must declare the current phase and begin with an empty digest.", "INV-PDH-005");
      }
      return { ok: true };
    }

    if (kind === "declaration-hash") {
      const expected = metadata.hash;
      if (candidate.phase !== previous.phase || candidate.declared.effectiveTimestamp !== metadata.timestamp ||
          previous.declared.effectiveTimestamp !== metadata.timestamp || candidate.declared.declarationHash !== expected ||
          !sameData({ ...previous.declared, declarationHash: expected }, candidate.declared)) {
        return failure("INVALID-DECLARATION-HASH", "Digest completion may only fill the hash for the matching current declaration.", "INV-PDH-006");
      }
      return { ok: true };
    }

    return failure("UNKNOWN-TRANSITION", "Transition type is not implemented.", "INV-TRANSITION-004");
  }

  function commitState(kind, patch, metadata = {}) {
    const fields = TRANSITION_FIELDS[kind];
    if (!fields || !patch || typeof patch !== "object") {
      return immutableCopy(failure("UNKNOWN-TRANSITION", "State change rejected: unknown transition contract.", "INV-COMMIT-001"));
    }
    const keys = Object.keys(patch);
    if (keys.some(key => !fields.includes(key))) {
      return immutableCopy(failure("UNDECLARED-STATE-CHANGE", `Transition '${kind}' cannot write the requested field.`, "INV-COMMIT-002"));
    }

    const previous = cloneData(state);
    const candidate = cloneData(state);
    keys.forEach(key => { candidate[key] = cloneData(patch[key]); });
    const validation = assertTransition(kind, previous, candidate, metadata);
    if (!validation.ok) return immutableCopy(validation);

    // This is the only post-initialization write path into authority-bearing state.
    keys.forEach(key => { state[key] = cloneData(candidate[key]); });
    emit("state");
    return immutableCopy({ ok: true });
  }

  function stateValidation() {
    return assertStateInvariants(state);
  }

  /* ---------- temporal metrics ---------- */
  function deltaSeconds() {
    const temporal = assertTemporalState(state);
    return temporal.ok ? temporal.deltaSeconds : Infinity;
  }

  function scopeAt(dt) {
    if (!Number.isFinite(dt) || dt < 0) return 0;
    return SMAX * Math.max(0, 1 - dt / DELTA_MAX);
  }

  function scopeS() {
    return scopeAt(deltaSeconds());
  }

  function legitimacyAt(dt) {
    if (state.H !== 1 || !assertFactor(state.A) || !assertFactor(state.R)) return 0;
    return state.H * state.A * state.R * (scopeAt(dt) / SMAX);
  }

  function legitimacy() {
    return legitimacyAt(deltaSeconds());
  }

  function demoTimerFresh() {
    return assertAuthorization(state).ok;
  }

  function observe() {
    const temporal = assertTemporalState(state);
    const dt = temporal.ok ? temporal.deltaSeconds : Infinity;
    const activeAndFresh = state.attestationStatus === "active" && temporal.ok && temporal.fresh;
    const expired = state.attestationStatus === "active" && !activeAndFresh;
    // Expose demo linkage identifiers, but keep the caller-supplied binding,
    // HMAC material, fingerprints, and precise liveness timestamp private.
    const snapshot = {
      H: state.H,
      bootId: BOOT_ID,
      A: state.A,
      R: state.R,
      phase: state.phase,
      declared: cloneData(state.declared),
      security: cloneData(SECURITY_PROFILE),
      attestation: {
        mode: SECURITY_PROFILE.mode,
        status: state.attestationStatus,
        humanAttestationId: state.attestationId,
        fresh: activeAndFresh,
        expired
      },
      session: {
        state: state.session.state,
        burned: state.session.burned,
        sessionId: state.session.sessionId,
        bootId: state.session.bootId,
        pdhId: state.session.pdhId,
        humanAttestationId: state.session.humanAttestationId
      },
      gsrbAck: state.gsrbAck,
      voidMode: state.attestationStatus === "active" && expired,
      metrics: {
        legitimacy: legitimacyAt(dt),
        deltaSeconds: dt,
        scopeS: scopeAt(dt),
        demoTimerFresh: activeAndFresh
      }
    };
    return deepFreeze(snapshot);
  }

  /* ---------- cryptographic schema ---------- */
  function canonicalHeader(header) {
    return [
      header.declaredPhase, header.centerCapability, header.legitimacySource,
      header.refusalSemantics, header.symbolismExecutability, header.timeAuthorityEffect,
      header.effectiveTimestamp, CREATOR_ID_FORMULA, CENTER
    ].join("|");
  }

  async function declarationHash(header) {
    return "0x" + (await sha256Hex(canonicalHeader(header))).toUpperCase();
  }

  async function completeDeclarationHash(header) {
    let hash;
    try {
      hash = await declarationHash(header);
    } catch {
      hash = "SHA-256-UNAVAILABLE";
    }

    const stillCurrent = state.phase === header.declaredPhase &&
      state.declared.declaredPhase === header.declaredPhase &&
      state.declared.effectiveTimestamp === header.effectiveTimestamp;
    if (stillCurrent && state.declared.declarationHash !== hash) {
      const resolved = { ...cloneData(state.declared), declarationHash: hash };
      const committed = commitState("declaration-hash", { declared: resolved }, {
        timestamp: header.effectiveTimestamp,
        hash
      });
      if (!committed.ok) {
        await record("warning", `PDH digest could not be committed — ${committed.reason || committed.code}.`);
      }
    }

    if (hash === "SHA-256-UNAVAILABLE") {
      await record("warning", `LOCAL DEMO PDH hash unavailable — phase ${header.declaredPhase}; no independent verifier is configured.`);
    } else {
      await record("info", `LOCAL DEMO PDH HASH COMPLETED — phase ${header.declaredPhase} · SHA-256 ${hash}; not independently witnessed or production-enforced.`);
    }
    return immutableCopy({ ...header, declarationHash: hash });
  }

  /* ---------- action gate (A.4 refusal-bound) ---------- */
  function requestAction(name, opts = {}) {
    const validName = typeof name === "string" && name.trim().length > 0;
    const safeName = validName ? name.trim().slice(0, 128) : "[invalid action name]";
    const dt = deltaSeconds();
    const l = legitimacyAt(dt);
    let sovereignOverride = false;
    try {
      sovereignOverride = !!(opts && typeof opts === "object" && opts.sovereignOverride === true);
    } catch { /* hostile option access is treated as no override */ }
    const entry = {
      name: safeName,
      at: nowISO(),
      L: l,
      dt,
      phase: state.phase,
      mode: SECURITY_PROFILE.mode,
      executionScope: SECURITY_PROFILE.actionScope,
      opts: { sovereignOverride }
    };

    const invariants = stateValidation();
    if (!validName) {
      const result = {
        ...entry, permitted: false, code: "INVALID-ACTION",
        reason: "Action request rejected. A non-empty string action name is required."
      };
      record("warning", "Action request rejected — invalid action name.");
      return immutableCopy(result);
    }
    if (!invariants.ok) {
      const result = {
        ...entry, permitted: false, code: "KERNEL-INVARIANT-FAIL",
        reason: `Action refused because ${invariants.invariant || invariants.code} failed: ${invariants.reason}`
      };
      record("breach", `Action request '${safeName}' — REFUSAL (kernel invariant failure: ${invariants.code})`);
      return immutableCopy(result);
    }

    if (state.phase === "CWO") {
      const result = {
        ...entry, permitted: false, code: "CWO-FORBIDDEN",
        reason: "Phase CWO: action is forbidden. The center records but NEVER decides. This request has been witnessed and recorded."
      };
      record("info", `Action request '${safeName}' — REFUSAL (CWO witness-only: ${result.reason})`);
      return immutableCopy(result);
    }

    const authorization = assertAuthorization(state);
    if (!authorization.ok) {
      if (authorization.code === "NO-DEMO-CONFIRMATION") {
        const result = {
          ...entry, permitted: false, code: "NO-DEMO-CONFIRMATION",
          reason: "H(t) = 0 in the local demonstration. The simulated gate is void regardless of Addressability or Representation. Enter the public demo phrase to exercise the gate; this does not authenticate a person."
        };
        record("info", `Demo action request '${safeName}' — REFUSAL (local demo confirmation absent)`);
        return immutableCopy(result);
      }
      if (authorization.code === "DEMO-ATTESTATION-PENDING") {
        const result = {
          ...entry, permitted: false, code: "DEMO-ATTESTATION-PENDING",
          reason: "The local demo HMAC is pending. H(t) remains 0 until the current ceremony completes; no action is authorized while pending."
        };
        record("info", `Demo action request '${safeName}' — REFUSAL (attestation pending)`);
        return immutableCopy(result);
      }
      if (authorization.code === "STALE-PERMISSION") {
        const result = {
          ...entry, permitted: false, code: "STALE-PERMISSION",
          reason: `DEMO ONLY — Δt = ${dt.toFixed(0)}s ≥ δ = ${DELTA_MAX}s. The local freshness window expired and the simulated gate returns refusal. This timestamp is not independently verified liveness.`
        };
        record("warning", `Demo action request '${safeName}' — REFUSAL (local freshness expired)`);
        return immutableCopy(result);
      }
      const result = {
        ...entry, permitted: false, code: authorization.code || "INVALID-AUTHORIZATION",
        reason: authorization.reason
      };
      record("warning", `Action request '${safeName}' — REFUSAL (${authorization.code})`);
      return immutableCopy(result);
    }

    // CWO is refused above regardless of L. In GSRB, the explicit override
    // deliberately bypasses only the legitimacy threshold: Human Key presence
    // and freshness have already been checked by assertAuthorization().
    if (sovereignOverride && state.phase === "GSRB") {
      const result = {
        ...entry,
        permitted: true,
        code: "DEMO-GSRB-OVERRIDE",
        reason: "DEMO ONLY — the explicit GSRB option bypasses the modeled legitimacy threshold after local Human Key and freshness checks. No production authority or external action is granted."
      };
      record("breach", `DEMO GATE — '${safeName}' would pass via explicit GSRB override; no production authority granted.`);
      return immutableCopy(result);
    }

    if (l < TAU) {
      const why = [];
      if (state.A < 0.999) why.push("accountability diffuses beyond addressability");
      if (state.R < 0.999) why.push("representation collapses");
      if (scopeAt(dt) / SMAX < 0.999) why.push("authorization cannot be reconstructed at current scope");
      const result = {
        ...entry,
        permitted: false,
        code: "L-BELOW-TAU",
        reason: `L(t) = ${l.toFixed(3)} < τ = ${TAU}. Refusal. ${why.length ? "Cause: " + why.join("; ") + "." : "Legitimacy conditions are not met."} In such cases, action would falsely claim authority. Refusal prevents that claim.`
      };
      record("warning", `Action request '${safeName}' — REFUSAL (L(t) < τ)`);
      return immutableCopy(result);
    }

    const result = {
      ...entry,
      permitted: true,
      code: "DEMO-PERMITTED",
      reason: `DEMO ONLY — the local gate model returns PERMITTED because L(t) = ${l.toFixed(3)} ≥ τ. This result is not production authorization and must not authorize external actions.`
    };
    record("permit", `DEMO GATE — '${safeName}' would pass because L(t) ≥ τ; no production authorization granted.`);
    return immutableCopy(result);
  }

  /* ---------- explicitly local Human Key demonstration ---------- */
  function failPendingAttestation(generation, timestamp) {
    return commitState("attestation-failure", {
      H: 0,
      attestationStatus: "failed",
      attestationId: null,
      lastLivenessAt: 0,
      keySig: null,
      keyFp: null
    }, { generation, timestamp });
  }

  function attestDemoHumanKey(phrase) {
    const normalized = typeof phrase === "string"
      ? phrase.trim().replace(/\s+/g, " ").toUpperCase()
      : "";
    if (normalized !== DEMO_CHALLENGE) {
      record("warning", "DEMO ATTESTATION REFUSED — challenge mismatch. The displayed phrase is public and is not an identity check.");
      return Promise.resolve(immutableCopy(failure(
        "DEMO-CHALLENGE-MISMATCH",
        "The local demo challenge did not match. This challenge is public and does not verify identity, liveness, consent, or consciousness.",
        "INV-H-DEMO-001"
      )));
    }
    if (!BOOT_ID) {
      record("warning", "DEMO ATTESTATION REFUSED — Web Crypto random IDs are unavailable in this browser context.");
      return Promise.resolve(immutableCopy(failure(
        "DEMO-CRYPTO-RANDOMNESS-UNAVAILABLE",
        "The local demonstration cannot create a Boot-ID without Web Crypto randomness. No attestation was activated.",
        "INV-H-DEMO-002"
      )));
    }

    const timestamp = nowMs();
    const generation = ++attestationGeneration;
    const supersededSession = cloneData(state.session);
    expiryNotifiedGeneration = 0;
    const started = commitState("attestation-start", {
      H: 0,
      attestationStatus: "pending",
      attestationId: null,
      lastLivenessAt: timestamp,
      keySig: null,
      keyFp: null,
      session: nonActingSession(state.session.burned),
      gsrbAck: 0
    }, { timestamp, generation });
    if (!started.ok) return Promise.resolve(started);
    currentBindingRowPromise = null;
    if (supersededSession.sessionId) {
      const termination = queueSessionTermination(supersededSession, "SUPERSEDED-BY-NEW-ATTESTATION", "A new local demo ceremony began.");
      void termination.rowPromise.catch(() => {});
    }

    const payload = canonicalJson({
      challenge: DEMO_CHALLENGE,
      timestamp,
      creatorId: CREATOR_ID_FORMULA,
      center: CENTER,
      bootId: BOOT_ID,
      generation
    });
    // Deferring the call also converts a synchronous backend throw into the
    // same fail-closed path as an asynchronous HMAC rejection.
    return Promise.resolve().then(() => hmacSha256Hex(DEMO_MAC_KEY, payload)).then(async sig => {
      if (generation !== attestationGeneration || state.attestationStatus !== "pending" ||
          state.H !== 0 || state.lastLivenessAt !== timestamp) {
        return immutableCopy(failure("ATTESTATION-SUPERSEDED", "A newer demo ceremony or revocation superseded this result.", "INV-H-008"));
      }
      if (typeof sig !== "string" || !/^[a-f0-9]{64}$/i.test(sig)) {
        const failed = failPendingAttestation(generation, timestamp);
        if (!failed.ok) return failed;
        record("warning", "DEMO HMAC generation returned an invalid tag; the local marker remains inactive.");
        return immutableCopy(failure("DEMO-CRYPTO-FAILURE", "Local demonstration HMAC generation failed validation.", "INV-H-009"));
      }

      const keyFp = "0x" + sig.slice(0, 16).toUpperCase();
      const attestationDigest = await sha256Hex(canonicalJson({
        schema: "HOS-DEMO-HUMAN-ATTESTATION-1",
        bootId: BOOT_ID,
        generation,
        timestamp,
        challenge: DEMO_CHALLENGE,
        hmacTag: sig.toLowerCase()
      }));
      if (typeof attestationDigest !== "string" || !/^[a-f0-9]{64}$/i.test(attestationDigest)) {
        throw new Error("invalid demo attestation digest");
      }
      const attestationId = `HAT-${attestationDigest.toUpperCase()}`;
      if (generation !== attestationGeneration || state.attestationStatus !== "pending" ||
          state.H !== 0 || state.lastLivenessAt !== timestamp) {
        return immutableCopy(failure("ATTESTATION-SUPERSEDED", "A newer demo ceremony or revocation superseded this result.", "INV-H-008"));
      }
      const completed = commitState("attestation-complete", {
        H: 1,
        attestationStatus: "active",
        attestationId,
        keySig: sig,
        keyFp
      }, { timestamp, generation, attestationId });
      if (!completed.ok) {
        if (completed.code === "ATTESTATION-EXPIRED") {
          const failed = failPendingAttestation(generation, timestamp);
          if (!failed.ok) return failed;
          record("warning", "DEMO HMAC completed after the freshness window; the local marker remains inactive.");
          return immutableCopy(failure("ATTESTATION-EXPIRED", "The local freshness window expired before HMAC completion; no marker was activated.", "INV-H-010"));
        }
        record("warning", `DEMO HMAC completion refused — ${completed.code}.`);
        return completed;
      }
      record("info", `DEMO ATTESTATION COMPLETE — local HMAC generated (${keyFp}). This is not human identity or liveness verification.`);
      return demoSuccess({ status: "active" });
    }).catch(() => {
      if (generation !== attestationGeneration || state.attestationStatus !== "pending" ||
          state.lastLivenessAt !== timestamp) {
        return immutableCopy(failure("ATTESTATION-SUPERSEDED", "A newer demo ceremony or revocation superseded this result.", "INV-H-008"));
      }
      const failed = failPendingAttestation(generation, timestamp);
      if (!failed.ok) return failed;
      record("warning", "DEMO HMAC generation failed; no production authenticator is available and the local marker remains inactive.");
      return immutableCopy(failure("DEMO-CRYPTO-FAILURE", "Local demonstration HMAC generation failed.", "INV-H-009"));
    });
  }

  function requestProductionAttestation() {
    const result = demoResult(failure(
      "PRODUCTION-AUTHENTICATOR-UNAVAILABLE",
      "Production Human Key attestation is not implemented. The browser-local demo phrase and HMAC cannot be upgraded into production authentication.",
      "INV-H-PROD-001"
    ));
    record("warning", "PRODUCTION HUMAN KEY REQUEST REFUSED — no production authenticator is configured; local demo state is not production authority.");
    return result;
  }

  function revokeHumanKey(reason = "Human Key withdrawn") {
    ++attestationGeneration;
    const previousSession = cloneData(state.session);
    const result = commitState("human-revoke", {
      H: 0,
      attestationStatus: "revoked",
      attestationId: null,
      lastLivenessAt: 0,
      keySig: null,
      keyFp: null,
      session: nonActingSession(state.session.burned),
      gsrbAck: 0
    });
    if (!result.ok) return result;
    currentBindingRowPromise = null;
    const safeReason = typeof reason === "string" ? reason.slice(0, 256) : "Human Key withdrawn";
    if (previousSession.sessionId) {
      const termination = queueSessionTermination(previousSession, "HUMAN-ATTESTATION-REVOKED", safeReason);
      void termination.rowPromise.catch(() => {});
    }
    record("warning", `LOCAL DEMO MARKER CLEARED — ${safeReason}. The simulated gate returns to H(t) = 0.`);
    return demoSuccess({ H: 0 });
  }

  /* ---------- public transitions: all commit through assertTransition ---------- */
  function requestPhase(next) {
    const phaseCheck = assertPhase(next);
    if (!phaseCheck.ok) {
      record("warning", "Phase transition rejected — unknown phase identifier.");
      return immutableCopy(phaseCheck);
    }
    if (next === state.phase) {
      return immutableCopy(assertTransition("phase", state, state));
    }

    const current = state.phase;
    const previousSession = cloneData(state.session);
    const declared = makePDH(next);
    const patch = {
      phase: next,
      declared,
      gsrbAck: 0
    };
    if (next === "CWO" || next === "GSRB") {
      patch.session = nonActingSession(state.session.burned);
    }
    const result = commitState("phase", patch, { target: next });
    if (!result.ok) {
      if (result.code === "COLLAPSE-REQUIRED") {
        return immutableCopy({ ...result, needsCollapse: true });
      }
      if (result.code === "GSRB-REBUILD-REQUIRED") {
        record("collapse", `Phase transition GSRB → ${next} attempted — FORBIDDEN without collapse and rebuild.`);
      } else if (result.code === "NO-DEMO-CONFIRMATION" || result.code === "STALE-PERMISSION") {
        record("warning", `Phase transition to ${next} refused — ${result.reason}`);
      }
      return result;
    }

    if ((next === "CWO" || next === "GSRB") && previousSession.sessionId) {
      currentBindingRowPromise = null;
      const termination = queueSessionTermination(previousSession, `PHASE-TRANSITION-${next}`, `Local demo phase changed from ${current} to ${next}.`);
      void termination.rowPromise.catch(() => {});
    }
    record(next === "GSRB" ? "collapse" : "info",
      `LOCAL DEMO PHASE STATE — ${current} → ${next}. The browser model updated its phase record and badge; no production policy or authority changed.`);
    void completeDeclarationHash(declared).catch(() => {});
    return demoSuccess({ phase: next });
  }

  function acknowledgeCollapseStep(idx) {
    if (!Number.isInteger(idx) || idx < 0 || idx >= COLLAPSE_STEPS.length || idx !== state.gsrbAck) {
      return immutableCopy(failure("INVALID-COLLAPSE-STEP", "Collapse steps must be acknowledged once, in order.", "INV-G-003"));
    }
    const result = commitState("collapse-ack", { gsrbAck: idx + 1 }, { index: idx });
    if (!result.ok) {
      record("warning", `Local demo collapse step ${idx + 1} refused — ${result.reason}`);
      return immutableCopy({ ...result, ack: state.gsrbAck });
    }
    record("warning", `Local demo collapse step ${idx + 1}/${COLLAPSE_STEPS.length} recorded: "${COLLAPSE_STEPS[idx]}"`);
    return demoSuccess({ ack: state.gsrbAck });
  }

  function setFactor(field, value) {
    if ((field !== "A" && field !== "R") || !assertFactor(value)) {
      return immutableCopy(failure("INVALID-FACTOR", "Factor must be a finite number from 0 through 1.", "INV-L-002"));
    }
    const result = commitState("factor", { [field]: value }, { field });
    return result.ok ? demoSuccess({ value }) : result;
  }

  function setAddressability(value) {
    return setFactor("A", value);
  }

  function setRepresentation(value) {
    return setFactor("R", value);
  }

  function bindSession(id, operation) {
    if (typeof id !== "string" || id.trim().length === 0 || id.length > 128 ||
        typeof operation !== "string" || !Object.prototype.hasOwnProperty.call(SESSION_STATES, operation)) {
      return immutableCopy(failure("INVALID-SESSION-BINDING", "Session binding rejected — invalid identifier or operation.", "INV-S-008"));
    }
    const authorization = assertAuthorization(state);
    if (!authorization.ok) return immutableCopy(authorization);
    if (state.phase === "CWO") {
      return immutableCopy(failure("CWO-FORBIDDEN", "Phase CWO is witness-only; session activation is forbidden.", "INV-S-007"));
    }
    if (!BOOT_ID) {
      return immutableCopy(failure("BOOT-ID-UNAVAILABLE", "Web Crypto randomness is unavailable; no demo session was bound.", "INV-S-010"));
    }
    if (typeof state.attestationId !== "string" || !/^HAT-[A-F0-9]{64}$/.test(state.attestationId)) {
      return immutableCopy(failure("HUMAN-ATTESTATION-ID-UNAVAILABLE", "A completed local demo ceremony is required before session binding.", "INV-S-010"));
    }
    const declarationHashValue = state.declared.declarationHash;
    if (typeof declarationHashValue !== "string" || !/^0x[A-F0-9]{64}$/.test(declarationHashValue)) {
      return immutableCopy(failure("PDH-ID-UNAVAILABLE", "The current PDH declaration hash is unavailable; no demo session was bound.", "INV-PDH-004"));
    }
    const sessionId = secureId("SID-");
    if (!sessionId) {
      return immutableCopy(failure("SESSION-ID-UNAVAILABLE", "Web Crypto could not generate a random local Session-ID.", "INV-S-010"));
    }
    const openedAt = nowMs();
    const pdhId = `PDH-${declarationHashValue.slice(2)}`;
    const previousSession = cloneData(state.session);
    const session = {
      bound: id,
      state: SESSION_STATES[operation],
      burned: state.session.burned,
      sessionId,
      bootId: BOOT_ID,
      pdhId,
      humanAttestationId: state.attestationId,
      openedAt,
      operation
    };
    const result = commitState("session-bind", { session }, {
      id, operation, sessionId, bootId: BOOT_ID, pdhId,
      humanAttestationId: state.attestationId, openedAt
    });
    if (!result.ok) return result;

    if (previousSession.sessionId) {
      const termination = queueSessionTermination(previousSession, "REPLACED-BY-NEW-SESSION", "A new local demo binding replaced the prior session.");
      void termination.rowPromise.catch(() => {});
    }
    currentBindingRowPromise = record("info", `HOS_DEMO_SESSION_BINDING ${canonicalJson(sessionLedgerEvent("SESSION_BINDING", session))}`);
    void currentBindingRowPromise.catch(() => {});
    return demoSuccess({
      state: session.state,
      sessionId,
      bootId: session.bootId,
      pdhId: session.pdhId,
      humanAttestationId: session.humanAttestationId
    });
  }

  function burnSession(reason = "Session withdrawn") {
    if (state.session.burned >= Number.MAX_SAFE_INTEGER) {
      return immutableCopy(failure("SESSION-BURN-EXHAUSTED", "Session burn counter reached its safe integer limit.", "INV-S-002"));
    }
    const previousSession = cloneData(state.session);
    const session = nonActingSession(state.session.burned + 1);
    const result = commitState("session-burn", { session });
    if (!result.ok) return result;
    currentBindingRowPromise = null;
    const safeReason = typeof reason === "string" ? reason.slice(0, 512) : "Session withdrawn";
    const termination = queueSessionTermination(previousSession, "BURNED", safeReason);
    void termination.rowPromise.catch(() => {});
    return demoSuccess({ burned: session.burned, terminated: !!previousSession.sessionId });
  }

  async function closeSession(reason = "Session closed") {
    if (state.session.state === "non-acting" || !state.session.sessionId) {
      return demoResult(failure("NO-ACTIVE-SESSION", "There is no active local demo session to terminate and seal.", "INV-S-012"));
    }
    if (state.session.burned >= Number.MAX_SAFE_INTEGER) {
      return demoResult(failure("SESSION-BURN-EXHAUSTED", "Session burn counter reached its safe integer limit.", "INV-S-002"));
    }

    const previousSession = cloneData(state.session);
    const bindingRowPromise = currentBindingRowPromise;
    const session = nonActingSession(state.session.burned + 1);
    const committed = commitState("session-burn", { session });
    if (!committed.ok) return committed;
    currentBindingRowPromise = null;
    const safeReason = typeof reason === "string" ? reason.slice(0, 512) : "Session closed";

    try {
      const termination = queueSessionTermination(previousSession, "CLOSED", safeReason);
      if (!bindingRowPromise) throw new Error("session binding row unavailable");
      const [bindingRow, terminationRow] = await Promise.all([bindingRowPromise, termination.rowPromise]);
      const core = {
        schema: "HOS-DEMO-SESSION-RECEIPT-1",
        assurance: "LOCAL-DEMO-INTEGRITY-NOT-AUTHENTICATION",
        mode: SECURITY_PROFILE.mode,
        executionScope: SECURITY_PROFILE.actionScope,
        sessionId: previousSession.sessionId,
        bootId: previousSession.bootId,
        pdhId: previousSession.pdhId,
        humanAttestationId: previousSession.humanAttestationId,
        operation: previousSession.operation,
        openedAt: new NativeDate(previousSession.openedAt).toISOString(),
        terminatedAt: termination.event.terminatedAt,
        terminationStatus: termination.event.terminationStatus,
        terminationReason: termination.event.terminationReason,
        bindingLedgerRoot: bindingRow.hash,
        terminationLedgerRoot: terminationRow.hash
      };
      const receiptHash = `0x${(await sha256Hex(canonicalJson(core))).toUpperCase()}`;
      const receiptEvent = { ...core, receiptHash };
      const receiptRow = await record("info", `HOS_DEMO_SESSION_RECEIPT ${canonicalJson(receiptEvent)}`);
      return demoSuccess({
        ...core,
        receiptHash,
        ledgerRoot: receiptRow.hash,
        receiptLedgerId: receiptRow.id,
        burned: session.burned
      });
    } catch {
      return demoResult(failure(
        "SESSION-RECEIPT-UNAVAILABLE",
        "The session was terminated, but its local ledger linkage or SHA-256 receipt could not be sealed. No production proof is implied.",
        "INV-S-013"
      ));
    }
  }

  function publishDeclaration() {
    const declared = makePDH(state.phase);
    const result = commitState("declaration-publish", { declared });
    if (!result.ok) {
      record("warning", `PDH republish refused — ${result.reason || result.code}.`);
      return Promise.resolve(result);
    }
    return completeDeclarationHash(declared).then(header => demoResult({ ok: true, ...header }));
  }

  /* ---------- private PLV duty ledger ---------- */
  const ledger = [];
  let ledgerSequence = 0;
  let recordTail = Promise.resolve();

  function record(severity, event) {
    const level = VALID_SEVERITIES.has(severity) ? severity : "warning";
    const text = typeof event === "string" ? event.slice(0, 4096) : "Invalid ledger event input.";
    const id = ++ledgerSequence;
    const ts = nowISO();
    const phase = state.phase;
    const pending = recordTail.then(async () => {
      const prevHash = ledger.length ? ledger[ledger.length - 1].hash : GENESIS_PREV;
      const hash = await sha256Hex([id, ts, level, text, prevHash, CREATOR_ID_FORMULA].join("|"));
      const row = {
        id, ts, severity: level, event: text,
        declaredPhase: phase,
        prevHash, hash
      };
      ledger.push(row);
      emit("ledger");
      return row;
    });
    recordTail = pending.catch(() => {});
    return pending.then(immutableCopy);
  }

  function sessionLedgerEvent(type, session) {
    const openedAt = Number.isFinite(session.openedAt)
      ? new NativeDate(session.openedAt).toISOString()
      : null;
    return {
      schema: "HOS-DEMO-SESSION-EVENT-1",
      type,
      sessionId: session.sessionId || null,
      bootId: session.bootId || null,
      pdhId: session.pdhId || null,
      humanAttestationId: session.humanAttestationId || null,
      operation: session.operation || null,
      openedAt
    };
  }

  function queueSessionTermination(session, status, reason) {
    const event = {
      ...sessionLedgerEvent("SESSION_TERMINATION", session),
      terminatedAt: nowISO(),
      terminationStatus: status,
      terminationReason: typeof reason === "string" ? reason.slice(0, 512) : "Session terminated"
    };
    const severity = status === "BURNED" ? "breach" : "warning";
    const rowPromise = record(severity, `HOS_DEMO_SESSION_TERMINATION ${canonicalJson(event)}`);
    return { event, rowPromise };
  }

  async function verifySessionReceipt(receipt, rows = ledger) {
    try {
      const coreKeys = [
        "schema", "assurance", "mode", "executionScope", "sessionId", "bootId", "pdhId",
        "humanAttestationId", "operation", "openedAt", "terminatedAt", "terminationStatus",
        "terminationReason", "bindingLedgerRoot", "terminationLedgerRoot"
      ];
      const tupleKeys = ["sessionId", "bootId", "pdhId", "humanAttestationId", "operation", "openedAt"];
      const isHash = value => typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
      if (!receipt || typeof receipt !== "object" || !Array.isArray(rows) ||
          receipt.schema !== "HOS-DEMO-SESSION-RECEIPT-1" ||
          receipt.assurance !== "LOCAL-DEMO-INTEGRITY-NOT-AUTHENTICATION" ||
          receipt.mode !== "DEMO" || receipt.executionScope !== "LOCAL-DEMO-ONLY" ||
          typeof receipt.sessionId !== "string" || !/^SID-[a-f0-9]{32}$/.test(receipt.sessionId) ||
          typeof receipt.bootId !== "string" || !/^BOOT-[a-f0-9]{32}$/.test(receipt.bootId) ||
          typeof receipt.pdhId !== "string" || !/^PDH-[A-F0-9]{64}$/.test(receipt.pdhId) ||
          typeof receipt.humanAttestationId !== "string" || !/^HAT-[A-F0-9]{64}$/.test(receipt.humanAttestationId) ||
          !Object.prototype.hasOwnProperty.call(SESSION_STATES, receipt.operation) ||
          !Number.isFinite(NativeDate.parse(receipt.openedAt)) || !Number.isFinite(NativeDate.parse(receipt.terminatedAt)) ||
          receipt.terminationStatus !== "CLOSED" || typeof receipt.terminationReason !== "string" ||
          !isHash(receipt.bindingLedgerRoot) || !isHash(receipt.terminationLedgerRoot) ||
          !isHash(receipt.ledgerRoot) || !/^0x[A-F0-9]{64}$/.test(receipt.receiptHash)) {
        return demoResult(failure("INVALID-SESSION-RECEIPT", "Receipt fields or demo-only scope are invalid."));
      }

      const core = Object.fromEntries(coreKeys.map(key => [key, receipt[key]]));
      const expectedReceiptHash = `0x${(await sha256Hex(canonicalJson(core))).toUpperCase()}`;
      if (receipt.receiptHash !== expectedReceiptHash) {
        return demoResult(failure("SESSION-RECEIPT-HASH-MISMATCH", "The canonical receipt digest does not match its fields."));
      }

      const bindingIndex = rows.findIndex(row => row && row.hash === receipt.bindingLedgerRoot);
      const terminationIndex = rows.findIndex(row => row && row.hash === receipt.terminationLedgerRoot);
      const receiptIndex = rows.findIndex(row => row && row.hash === receipt.ledgerRoot);
      if (bindingIndex < 0 || terminationIndex <= bindingIndex || receiptIndex <= terminationIndex) {
        return demoResult(failure("SESSION-LEDGER-LINK-MISSING", "Binding, termination, or receipt rows are missing or out of order."));
      }

      let previousHash = GENESIS_PREV;
      for (let index = 0; index <= receiptIndex; index++) {
        const row = rows[index];
        if (!row || row.prevHash !== previousHash || !Number.isSafeInteger(row.id) ||
            typeof row.ts !== "string" || typeof row.severity !== "string" || typeof row.event !== "string") {
          return demoResult(failure("SESSION-LEDGER-CHAIN-INVALID", `Ledger chain structure failed at row ${index}.`));
        }
        const expectedRowHash = await sha256Hex([row.id, row.ts, row.severity, row.event, row.prevHash, CREATOR_ID_FORMULA].join("|"));
        if (row.hash !== expectedRowHash) {
          return demoResult(failure("SESSION-LEDGER-CHAIN-INVALID", `Ledger digest failed at row ${index}.`));
        }
        previousHash = row.hash;
      }

      const parseEvent = (row, prefix) => {
        if (!row.event.startsWith(prefix)) return null;
        try { return JSON.parse(row.event.slice(prefix.length)); } catch { return null; }
      };
      const binding = parseEvent(rows[bindingIndex], "HOS_DEMO_SESSION_BINDING ");
      const termination = parseEvent(rows[terminationIndex], "HOS_DEMO_SESSION_TERMINATION ");
      const receiptEvent = parseEvent(rows[receiptIndex], "HOS_DEMO_SESSION_RECEIPT ");
      if (!binding || !termination || !receiptEvent ||
          binding.schema !== "HOS-DEMO-SESSION-EVENT-1" || binding.type !== "SESSION_BINDING" ||
          termination.schema !== "HOS-DEMO-SESSION-EVENT-1" || termination.type !== "SESSION_TERMINATION" ||
          !sameData(Object.fromEntries(tupleKeys.map(key => [key, binding[key]])), Object.fromEntries(tupleKeys.map(key => [key, core[key]]))) ||
          !sameData(Object.fromEntries(tupleKeys.map(key => [key, termination[key]])), Object.fromEntries(tupleKeys.map(key => [key, core[key]])) ) ||
          termination.terminatedAt !== core.terminatedAt || termination.terminationStatus !== core.terminationStatus ||
          termination.terminationReason !== core.terminationReason ||
          !sameData(receiptEvent, { ...core, receiptHash: receipt.receiptHash })) {
        return demoResult(failure("SESSION-LEDGER-LINK-MISMATCH", "The ledger binding, termination, and receipt events do not bind the same demo tuple."));
      }

      return demoSuccess({
        verified: true,
        sessionId: receipt.sessionId,
        receiptHash: receipt.receiptHash,
        ledgerRoot: receipt.ledgerRoot
      });
    } catch {
      return demoResult(failure("SESSION-RECEIPT-VERIFICATION-FAILED", "Local receipt verification could not complete."));
    }
  }

  function getLedger() {
    return immutableCopy(ledger);
  }

  /* ---------- event bus: every callback receives an immutable snapshot ---------- */
  const listeners = new Map();
  function subscribe(event, listener) {
    if (typeof event !== "string" || typeof listener !== "function") return () => {};
    if (!listeners.has(event)) listeners.set(event, new Set());
    const eventListeners = listeners.get(event);
    eventListeners.add(listener);
    return () => eventListeners.delete(listener);
  }

  function dispatch(event, snapshot) {
    const eventListeners = listeners.get(event);
    if (!eventListeners) return;
    for (const listener of [...eventListeners]) {
      try {
        listener(snapshot);
      } catch (error) {
        if (typeof console !== "undefined" && typeof console.error === "function") {
          console.error("HarshalOS observer callback failed:", error);
        }
      }
    }
  }

  function emit(event = "state") {
    const snapshot = observe();
    dispatch(event, snapshot);
    if (event !== "state") dispatch("state", snapshot);
  }

  /* ---------- initialization: the only non-transition state construction ---------- */
  const initialInvariant = assertStateInvariants(state);
  if (!initialInvariant.ok) throw new Error(`Kernel initialization failed ${initialInvariant.invariant}: ${initialInvariant.reason}`);

  record("info", `GENESIS — HarshalOS kernel online. Center-Origin ${CENTER} immutable and non-delegable. Creator-ID {${CREATOR_ID_FORMULA}}.`);
  record("info", "SYMBOLIC FIREWALL ACTIVE — narrative and mythic expressions are strictly non-executable.");
  record("info", `CRYPTOGRAPHIC SCHEMA ARMED — ${CRYPTO_BACKEND}. PDH = SHA-256; PLV chain = SHA-256; DEMO HMAC is not an authenticator.`);
  record("warning", "SECURITY PROFILE: DEMO ONLY. No production Human Key authenticator or production authorization path is configured.");
  record("warning", "SESSION RECEIPTS: local SHA-256 integrity only. Random IDs and hashes are not identity proof, production authentication, or an independent signature.");
  record("warning", "SESSION STATE: NON-ACTING. The public demo phrase exercises a local gate only; it proves no identity, liveness, consciousness, consent, or non-coercion.");
  const ready = completeDeclarationHash(cloneData(state.declared)).then(() => undefined).catch(() => undefined);

  /* ---------- temporal expiry monitor (derived state only) ---------- */
  setInterval(() => {
    const temporal = assertTemporalState(state);
    const expired = state.H === 1 && (!temporal.ok || !temporal.fresh);
    if (expired && expiryNotifiedGeneration !== attestationGeneration) {
      expiryNotifiedGeneration = attestationGeneration;
      const dt = temporal.ok ? temporal.deltaSeconds : Infinity;
      record("warning", `LOCAL DEMO TIMER EXPIRED — Δt = ${dt.toFixed(0)}s ≥ δ = ${DELTA_MAX}s. The simulated gate returns H(t)·S(t) = 0; no human liveness was verified.`);
    } else if (!expired) {
      expiryNotifiedGeneration = 0;
    }
    emit("tick");
  }, 1000);

  /* ---------- public capability surface ---------- */
  const api = Object.freeze(Object.assign(Object.create(null), {
    TAU, DELTA_MAX, SMAX, CREATOR_ID, CREATOR_ID_FORMULA, CENTER, GENESIS_PREV,
    DEMO_CHALLENGE,
    securityProfile: SECURITY_PROFILE,
    observe,
    request: requestAction,
    demoAttest: attestDemoHumanKey,
    requestProductionAttestation,
    revoke: revokeHumanKey,
    transition: requestPhase,
    acknowledgeCollapseStep,
    publishDeclaration,
    setAddressability,
    setRepresentation,
    bindSession,
    burnSession,
    closeSession,
    verifySessionReceipt,
    legitimacy,
    deltaSeconds,
    scopeS,
    demoTimerFresh,
    getLedger,
    subscribe,
    record,
    nowISO,
    ready
  }));

  Object.defineProperty(window, "HOS", {
    configurable: false,
    enumerable: true,
    writable: false,
    value: api
  });
})();
