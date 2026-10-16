/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Accountability-Gated Systems in the world model
   (research/neural-atomic-bodies-insurance-requirements.md, Sections 0.6
   and 0.7, Appendix I).

   Pure functions, no dependencies, no I/O. The gate follows the print
   source's formal appendix (Appendix A, §A.2–A.6, "Formal Constraint
   Equations"):

     S(t,a) = 1{a ∈ D(t) and V(a,t) = 1} × max(0, 1 − Δt/δ)
     L(t,a) = H(t) × C(t) × K(t) × A(t) × R(t) × S(t,a)
     Permit only when H = C = K = 1, V(a,t) = 1, a ∈ D(t), A ≥ τ_A,
     R ≥ τ_R, S ≥ τ_S, L ≥ τ_L, and no independent hard-safety gate
     has failed; otherwise Refuse (HALT), the default.

   The repository's normative canonical model (specs/normative/canonical-
   model.md, canonical.json) states the same function with one threshold τ;
   with τ_A, τ_R, and τ_S met, the two decisions coincide.

   Nothing here authorizes anything. A Permit from this model is a model
   output; real authorization stays outside the model, as AGS requires.
   ═══════════════════════════════════════════════════════════════ */

export const PERMIT = "Permit";
export const REFUSE = "Refuse";

/* Codes for every gate a request can fail, in the order of the six-stage model. */
export const FAILURES = Object.freeze({
  H: "Human Key absent, stale, or unknown (H = 0; Zero-Key Rule)",
  C: "Continuity broken: session tuple does not match (C = 0)",
  K: "Accountability gate failed: no attribution or no answerable owner (K = 0)",
  V: "No scoped operational grant for this action (V = 0)",
  D: "Action outside the disc's approved action set D(t)",
  A: "Addressability below its threshold (A < τ_A)",
  R: "Representation integrity below its threshold (R < τ_R)",
  S: "Scope-and-freshness factor below its threshold (S < τ_S)",
  L: "Permission score below its threshold (L < τ_L)",
  SAFETY: "An independent hard-safety gate failed"
});

/* A = Σ w_i a_i over predeclared checks; a missing non-waivable check sets A = 0 (§A.2). */
export function addressability(checks) {
  if (!checks?.length) return 0;
  if (checks.some(c => c.nonWaivable && (c.score === null || c.score === undefined))) return 0;
  const total = checks.reduce((s, c) => s + c.weight, 0);
  if (Math.abs(total - 1) > 1e-9) throw new Error("addressability weights must sum to 1");
  return checks.reduce((s, c) => s + c.weight * (c.score ?? 0), 0);
}
/* R = min_j r_j over the delegation chain; an empty chain sets R = 0 (§A.2). The
   book's Part II review problem instead multiplies the hop factors (0.92³); that
   variant is kept for comparison only. */
export const representation = hops => (hops?.length ? Math.min(...hops) : 0);
export const representationProduct = hops => (hops?.length ? hops.reduce((p, r) => p * r, 1) : 0);
/* g(t) = max(0, 1 − Δt/δ); S(t,a) = g(t) for an authorized, in-scope action (§A.5). */
export const lease = (dt, delta) => Math.max(0, 1 - dt / delta);
export const scopeFactor = ({ inDomain, authorized, dt, delta }) => (inDomain && authorized ? lease(dt, delta) : 0);

/* The decision gate (§A.3–A.4). state: { H, C, K, A, R, V, inDomain, dt, hardSafetyFailed }.
   profile: { tauA, tauR, tauS, tauL, delta } — pre-registered, never lowered mid-request. */
export function gate(state, profile) {
  const S = scopeFactor({ inDomain: state.inDomain, authorized: state.V === 1, dt: state.dt, delta: profile.delta });
  const L = state.H * state.C * state.K * state.A * state.R * S;
  const failures = [];
  if (state.H !== 1) failures.push("H");
  if (state.C !== 1) failures.push("C");
  if (state.K !== 1) failures.push("K");
  if (state.V !== 1) failures.push("V");
  if (!state.inDomain) failures.push("D");
  if (!(state.A >= profile.tauA)) failures.push("A");
  if (!(state.R >= profile.tauR)) failures.push("R");
  if (!(S >= profile.tauS)) failures.push("S");
  if (!(L >= profile.tauL)) failures.push("L");
  if (state.hardSafetyFailed) failures.push("SAFETY");
  return { S, L, x: failures.length ? REFUSE : PERMIT, failures };
}

/* The canonical single-threshold decision (specs/normative/canonical-model.md §4.3). */
export const canonicalDecision = (state, tau, delta) => {
  const S = scopeFactor({ inDomain: state.inDomain, authorized: state.V === 1, dt: state.dt, delta });
  const L = state.H * state.C * state.K * state.A * state.R * S;
  return { S, L, x: state.H === 1 && state.C === 1 && state.K === 1 && L >= tau ? PERMIT : REFUSE };
};

/* The elapsed time at which a fresh authorization stops passing: the first of
   L falling to τ_L and S falling to τ_S (Worked Example 2.1). */
export function cliff({ A, R }, profile) {
  const byL = A * R > 0 ? profile.delta * (1 - profile.tauL / (A * R)) : 0;
  const byS = profile.delta * (1 - profile.tauS);
  return Math.max(0, Math.min(byL, byS));
}

/* §A.6: optimization runs only over the eligible set F_t. Each candidate carries
   its own gate state and an objective value; returns the eligible set and the choice. */
export function precedence(candidates, profile) {
  const judged = candidates.map(c => ({ ...c, decision: gate(c.state, profile) }));
  const eligible = judged.filter(c => c.decision.x === PERMIT);
  const choice = eligible.reduce((best, c) => (!best || c.objective > best.objective ? c : best), null);
  return { judged, eligible, choice, unrestrictedBest: judged.reduce((b, c) => (!b || c.objective > b.objective ? c : b), null) };
}

/* INV-EMERG-001 for a proposed emergency profile: scope may only contract, the lease
   may only shorten, and no threshold may move (§A.3; canonical model §9). */
export function emergencyViolations(normal, emergency) {
  const v = [];
  if (!emergency.D.every(a => normal.D.includes(a))) v.push("emergency scope adds actions");
  if (!(emergency.delta <= normal.delta)) v.push("emergency lease is longer than the normal lease");
  for (const k of ["tauA", "tauR", "tauS", "tauL"]) if (emergency[k] !== normal[k]) v.push(`threshold ${k} changed`);
  return v;
}

/* ── AI-assisted workflows as AGS discs (Section 0.7) ─────────────────
   A workflow runs inside one disc: an approved action set D, a lease δ, an
   external legitimacy reference (the Human Key at the Center Origin), and a
   witness. Each step is gated. A refusal for a missing or stale key escalates
   to the center: a fresh signed authorization within the freeze budget (1,000 ms
   in the book) returns the disc to Active and the request is evaluated again;
   otherwise Harshal (Ha-119) freezes the workflow into a read-only Witness-Only
   state. Any other refusal halts the workflow. A disc cannot create a disc.
   hashHex(text) is supplied by the caller (SHA-256 in the evidence script). */
export const FREEZE_BUDGET_MS = 1000;
export function runWorkflow(spec, profile, hashHex) {
  const log = [];
  let prev = "0".repeat(64);
  const witness = record => {
    const entry = { seq: log.length + 1, ...record, prev };
    entry.hash = hashHex(JSON.stringify(entry));
    prev = entry.hash;
    log.push(entry);
  };
  const lifecycle = ["Specified", "Created", "Attached", "Active"];
  witness({ event: "disc-active", disc: spec.disc.id, actions: spec.disc.D, delta: profile.delta });
  const stateFor = (step, authorizedAt) => ({
    H: authorizedAt === null ? 0 : 1,
    C: step.continuity ?? 1,
    K: step.accountability ?? 1,
    A: step.A ?? spec.A,
    R: representation(step.hops ?? spec.hops),
    V: authorizedAt === null ? 0 : 1,
    inDomain: spec.disc.D.includes(step.action),
    dt: authorizedAt === null ? Infinity : Math.round((step.at - authorizedAt) * 1e9) / 1e9,
    hardSafetyFailed: Boolean(step.spawnsDisc) || Boolean(step.symbolicCommand)
  });
  const steps = [];
  let outcome = "Completed";
  let delegating = false;
  for (const step of spec.steps) {
    if (!delegating) { lifecycle.push("Delegating"); delegating = true; }
    let state = stateFor(step, step.authorizedAt);
    let decision = gate(state, profile);
    let rekeyed = null;
    const first = { x: decision.x, L: decision.L, failures: decision.failures };
    witness({ event: "decision", step: step.id, action: step.action, sector: step.sector, x: decision.x, L: Number(decision.L.toFixed(6)), failures: decision.failures });
    if (decision.x === REFUSE) {
      lifecycle.push("Interrupted");
      const keyOnly = decision.failures.every(f => ["H", "V", "S", "L"].includes(f)) && (decision.failures.includes("H") || decision.failures.includes("S"));
      const tokenMs = step.recalibrationTokenMs ?? null;
      if (keyOnly && tokenMs !== null && tokenMs <= FREEZE_BUDGET_MS) {
        /* Resolution first: a fresh, signed authorization from the center within the
           budget returns the disc to Active, and the request is evaluated again. */
        rekeyed = tokenMs;
        state = stateFor(step, step.at - tokenMs / 1000);
        decision = gate(state, profile);
        lifecycle.push("Active");
        witness({ event: "re-keyed", step: step.id, tokenMs, x: decision.x, L: Number(decision.L.toFixed(6)), failures: decision.failures });
      } else if (keyOnly) {
        witness({ event: "ha-freeze", step: step.id, waitedMs: FREEZE_BUDGET_MS, state: "Witness-Only (read-only)" });
        outcome = "Frozen by Ha-119 (Witness-Only)";
      }
    }
    steps.push({ id: step.id, action: step.action, sector: step.sector, at: step.at, dt: state.dt, R: state.R, rekeyedMs: rekeyed, first, ...decision,
      note: step.spawnsDisc ? "a disc cannot create a disc" : step.symbolicCommand ? "symbolic input does not execute" : step.note ?? null });
    if (decision.x === REFUSE) {
      if (outcome === "Completed") outcome = "Halted on refusal";
      break;
    }
  }
  lifecycle.push("Expired", "Terminated");
  witness({ event: "disc-terminated", disc: spec.disc.id, outcome, residue: "none" });
  return { outcome, steps, lifecycle, log, head: prev };
}
/* Recompute a witness chain and confirm every link. */
export function verifyChain(log, hashHex) {
  let prev = "0".repeat(64);
  for (const entry of log) {
    const { hash, ...rest } = entry;
    if (rest.prev !== prev || hashHex(JSON.stringify(rest)) !== hash) return false;
    prev = hash;
  }
  return true;
}
