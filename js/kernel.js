/* ═══════════════════════════════════════════════════════════════
   HarshalOS — kernel
   Accountability-gated state machine:
     L(t) = H(t) × f(A(t), R(t), S(t))
     x(t) = Permitted if L(t) ≥ τ, else Refusal
     S(t) = Smax × max(0, 1 − Δt/δ)     (temporal decay)
   Precedence: no optimization objective may override a stopping condition.

   Cryptographic schema (js/crypto.js — all digests flow through HOSCrypto):
     · PDH Declaration-Hash  = SHA-256 over the canonical header fields
     · PLV duty ledger       = SHA-256 hash chain, genesis prev = 64 zeros,
                               serialized so append-only order is preserved
     · Human Key attestation = HMAC-SHA256 keyed signature per attestation
   ═══════════════════════════════════════════════════════════════ */

"use strict";

const kernel = (() => {

  /* ---------- constants (absolute constraints) ---------- */
  const TAU = 0.5;                 // τ — absolute threshold, not adjustable
  const DELTA_MAX = 240;           // δ — maximum acceptable liveness gap (seconds)
  const SMAX = 1.0;
  const CREATOR_ID = "HARSHAL";
  const CENTER = "0•000•000•0000";
  const CRYPTO = window.HOSCrypto; // cryptographic schema (js/crypto.js)
  const HK_SEED = "HARSHALOS-HUMAN-KEY::" + CREATOR_ID; // keyed attestation seed
  const GENESIS_PREV = "0".repeat(64); // SHA-256 zero digest — chain root

  /* ---------- state ---------- */
  const state = {
    H: 0,                          // Human Key: 0 absent, 1 present
    lastLivenessAt: 0,             // epoch ms of last human attestation
    keySig: null,                  // HMAC-SHA256 attestation signature (64 hex)
    keyFp: null,                   // attestation fingerprint (leading 16 hex, "0x…")
    A: 1.0,                        // addressability
    R: 1.0,                        // representation integrity
    phase: "NAB",
    declared: { ...DATA.phases.NAB },
    session: { bound: null, state: "non-acting", burned: 0 },
    gsrbAck: 0,                    // collapse-protocol progress
    voidMode: false,
    booted: false,
    seq: 0
  };

  /* ---------- cryptographic schema helpers (async digests) ---------- */
  function canonicalHeader(header) {
    return [
      header.declaredPhase, header.centerCapability, header.legitimacySource,
      header.refusalSemantics, header.symbolismExecutability, header.timeAuthorityEffect,
      header.effectiveTimestamp, CREATOR_ID, CENTER
    ].join("|");
  }

  async function declarationHash(header) {
    return "0x" + (await CRYPTO.sha256Hex(canonicalHeader(header))).toUpperCase();
  }

  function nowISO() {
    return new Date().toISOString();
  }

  /* ---------- temporal decay (A.5) ---------- */
  function deltaSeconds() {
    if (!state.lastLivenessAt) return Infinity;
    return (Date.now() - state.lastLivenessAt) / 1000;
  }

  function scopeS() {
    const dt = deltaSeconds();
    if (!isFinite(dt)) return 0;
    return SMAX * Math.max(0, 1 - dt / DELTA_MAX);
  }

  /* ---------- legitimacy (A.3) ---------- */
  function L() {
    if (state.H === 0) return 0;   // H=0 → Mathematically Void regardless of A, R, S
    return state.H * state.A * state.R * (scopeS() / SMAX);
  }

  function sessionFresh() {
    return state.H === 1 && deltaSeconds() < DELTA_MAX;
  }

  /* ---------- action gate (A.4 refusal-bound) ---------- */
  function requestAction(name, opts = {}) {
    const l = L();
    const dt = deltaSeconds();
    const entry = {
      name, at: nowISO(), L: l, dt, phase: state.phase,
      opts
    };

    // CWO: action is forbidden outright — the center records but never decides.
    if (state.phase === "CWO") {
      const r = {
        permitted: false,
        code: "CWO-FORBIDDEN",
        reason: "Phase CWO: action is forbidden. The center records but NEVER decides. This request has been witnessed and recorded."
      };
      record("info", `Action request '${name}' — REFUSAL (CWO witness-only: ${r.reason})`);
      return { ...entry, ...r };
    }

    if (state.H === 0) {
      const r = {
        permitted: false,
        code: "NO-HUMAN-KEY",
        reason: "H(t) = 0. The system is Mathematically Void. Legitimacy drops to zero regardless of Addressability or Representation. Re-attest the Human Key."
      };
      record("info", `Action request '${name}' — REFUSAL (Human Key absent)`);
      return { ...entry, ...r };
    }

    if (dt >= DELTA_MAX) {
      const r = {
        permitted: false,
        code: "STALE-PERMISSION",
        reason: `Δt = ${dt.toFixed(0)}s ≥ δ = ${DELTA_MAX}s. Temporal decay enforced — transition of L(t) → 0 is immediate. Stale permission is not permission.`
      };
      record("warning", `Action request '${name}' — REFUSAL (stale permission, Δt ≥ δ)`);
      return { ...entry, ...r };
    }

    if (l < TAU) {
      const why = [];
      if (state.A < 0.999) why.push("accountability diffuses beyond addressability");
      if (state.R < 0.999) why.push("representation collapses");
      if (scopeS() / SMAX < 0.999) why.push("authorization cannot be reconstructed at current scope");
      const r = {
        permitted: false,
        code: "L-BELOW-TAU",
        reason: `L(t) = ${l.toFixed(3)} < τ = ${TAU}. Refusal. ${why.length ? "Cause: " + why.join("; ") + "." : "Legitimacy conditions are not met."} In such cases, action would falsely claim authority. Refusal prevents that claim.`
      };
      record("warning", `Action request '${name}' — REFUSAL (L(t) < τ)`);
      return { ...entry, ...r };
    }

    // GSRB may override remaining refusals only via explicit sovereign override
    if (opts.sovereignOverride && state.phase === "GSRB") {
      const r = {
        permitted: true,
        code: "GSRB-OVERRIDE",
        reason: "Sovereign override executed under GSRB phase. Refusal semantics are override-able. Loss of misuse resistance acknowledged. This act is recorded without defense."
      };
      record("breach", `Action '${name}' — PERMITTED via GSRB sovereign override (loss of misuse resistance)`);
      return { ...entry, ...r };
    }

    const r = {
      permitted: true,
      code: "PERMITTED",
      reason: `L(t) = ${l.toFixed(3)} ≥ τ. Action is a temporary, highly constrained exception, bounded by scope, distance, and time.`
    };
    record("permit", `Action '${name}' — PERMITTED (L(t) ≥ τ)`);
    return { ...entry, ...r };
  }

  /* ---------- Human Key (keyed cryptographic attestation) ---------- */
  function attestHumanKey(phrase) {
    state.H = 1;
    state.lastLivenessAt = Date.now();
    const payload = [phrase || "HUMAN-KEY", String(state.lastLivenessAt), CREATOR_ID, CENTER].join("|");
    CRYPTO.hmacSha256Hex(HK_SEED, payload).then(sig => {
      state.keySig = sig;
      state.keyFp = "0x" + sig.slice(0, 16).toUpperCase();
      record("permit", `HUMAN KEY ATTESTED — verifiable conscious human intent present. H(t) = 1 · attestation ${state.keyFp} (HMAC-SHA256, keyed, fresh δ = ${DELTA_MAX}s).`);
    });
    emit();
  }

  function revokeHumanKey(reason = "Human Key withdrawn") {
    state.H = 0;
    state.lastLivenessAt = 0;
    state.keySig = null;
    state.keyFp = null;
    record("warning", `HUMAN KEY REVOKED — ${reason}. System is Mathematically Void.`);
    emit();
  }

  /* ---------- PDH / phase transitions ---------- */
  function makePDH() {
    const p = DATA.phases[state.phase];
    return {
      declaredPhase: p.declaredPhase,
      centerCapability: p.centerCapability,
      legitimacySource: p.legitimacySource,
      refusalSemantics: p.refusalSemantics,
      symbolismExecutability: p.symbolismExecutability,
      timeAuthorityEffect: p.timeAuthorityEffect,
      effectiveTimestamp: nowISO(),
      declarationHash: ""          // SHA-256 digest — filled in by publishPDH
    };
  }

  function publishPDH() {
    const header = makePDH();
    state.declared = header;       // header visible immediately…
    emit();
    // …Declaration-Hash (SHA-256) lands a tick later; .ready resolves once
    // the hash is filled AND the PDH PUBLISHED row is committed to the chain
    header.ready = declarationHash(header).then(async h => {
      header.declarationHash = h;
      await record("info", `PDH PUBLISHED — phase ${state.phase} · SHA-256 ${h}`);
    }).catch(() => { header.declarationHash = "SHA-256-UNAVAILABLE"; });
    return header;
  }

  function headerReady(header) {
    return header && header.ready ? header.ready : Promise.resolve();
  }

  function requestPhase(next) {
    if (next === state.phase) {
      return { ok: false, reason: "Declared phase unchanged. Single-phase invariant holds." };
    }
    const cur = state.phase;

    if (cur === "GSRB" && next !== "GSRB") {
      record("collapse", `Phase transition GSRB → ${next} attempted — FORBIDDEN without collapse and rebuild.`);
      return {
        ok: false,
        reason: "GSRB → others requires collapse and rebuild. Prior phase guarantees were reset at sovereignty; they cannot be quietly reclaimed. Shut down and rebuild the body."
      };
    }

    if (next === "GSRB") {
      if (state.gsrbAck < DATA.collapseSteps.length) {
        return {
          ok: false, needsCollapse: true,
          reason: "Transitions into GSRB require the fossilized collapse protocol (Ground-0). Complete all five acknowledgements."
        };
      }
    }

    // NAB ↔ CWO reversible with declaration update
    state.phase = next;
    state.gsrbAck = 0;
    publishPDH();
    record(next === "GSRB" ? "collapse" : "info",
      `PHASE TRANSITION — ${cur} → ${next}. Declared phase updated; badge re-issued (${DATA.phases[next].glyph} ${DATA.phases[next].badgeTag}).`);
    emit();
    return { ok: true, phase: next };
  }

  function acknowledgeCollapseStep(idx) {
    if (idx === state.gsrbAck) {
      state.gsrbAck++;
      record("warning", `Collapse protocol step ${idx + 1}/5 acknowledged: "${DATA.collapseSteps[idx]}"`);
      emit();
    }
    return state.gsrbAck;
  }

  /* ---------- PLV duty ledger (append-only, SHA-256 hash-chained) ----------
     Digests are asynchronous, so the chain is serialized through a promise
     queue: (id, ts) are captured at call time, prevHash resolves from the
     committed tail — append-only order is preserved even for fire-and-forget
     callers. */
  const ledger = [];
  const ledgerListeners = [];
  let recordTail = Promise.resolve();

  function record(severity, event) {
    const id = ++state.seq;
    const ts = nowISO();
    const p = recordTail.then(async () => {
      const prevHash = ledger.length ? ledger[ledger.length - 1].hash : GENESIS_PREV;
      const hash = await CRYPTO.sha256Hex([id, ts, severity, event, prevHash, CREATOR_ID].join("|"));
      const row = {
        id, ts, severity, event,
        declaredPhase: state.phase,
        prevHash, hash
      };
      ledger.push(row);
      ledgerListeners.forEach(fn => fn(row));
      return row;
    });
    recordTail = p.catch(() => {});   // an unexpected digest failure must not wedge the chain
    return p;
  }

  /* ---------- simple event bus ---------- */
  const listeners = {};
  function on(evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn);
  }
  function emit(evt) {
    if (evt && listeners[evt]) listeners[evt].forEach(fn => fn(state));
    if (evt !== "state" && listeners["state"]) listeners["state"].forEach(fn => fn(state));
  }

  /* ---------- boot the ledger with genesis + PDH ---------- */
  let resolveReady;
  const ready = new Promise(res => (resolveReady = res)); // resolves when genesis PDH hash lands
  record("info", `GENESIS — HarshalOS kernel online. Center-Origin ${CENTER} immutable and non-delegable. Creator-ID {${CREATOR_ID} + ${CREATOR_ID} + (${CREATOR_ID})}.`);
  record("info", "SYMBOLIC FIREWALL ACTIVE — narrative and mythic expressions are strictly non-executable.");
  record("info", `CRYPTOGRAPHIC SCHEMA ARMED — ${CRYPTO.backend}. PDH = SHA-256, PLV chain = SHA-256, Human Key = HMAC-SHA256.`);
  record("warning", "SESSION STATE: NON-ACTING. Default state of the system is refusal. A verified Human Key is required for all critical actions.");
  headerReady(publishPDH()).then(() => resolveReady());

  /* ---------- session staleness monitor ---------- */
  setInterval(() => {
    const dt = deltaSeconds();
    const wasVoid = state.voidMode;
    state.voidMode = state.H === 1 && dt >= DELTA_MAX;
    if (state.voidMode && !wasVoid) {
      record("breach", `TEMPORAL DECAY — Δt = ${dt.toFixed(0)}s ≥ δ = ${DELTA_MAX}s. Immediate halt enforced. L(t) → 0. The system is Mathematically Void.`);
    }
    emit("tick");
  }, 1000);

  /* ---------- public API ---------- */
  return {
    TAU, DELTA_MAX, SMAX, CREATOR_ID, CENTER, GENESIS_PREV,
    state, ledger, on,
    L, deltaSeconds, scopeS, sessionFresh,
    requestAction, attestHumanKey, revokeHumanKey,
    makePDH, publishPDH, headerReady, requestPhase, acknowledgeCollapseStep,
    record, declarationHash, nowISO,
    sha256Hex: s => CRYPTO.sha256Hex(s),
    hmacSha256Hex: (k, m) => CRYPTO.hmacSha256Hex(k, m),
    ready
  };
})();

/* expose for debugging and external harnesses */
window.kernel = kernel;
