/* Optional AGS profile and open-ended scientific exploration: source examples,
   canonical constants, external-effect gates, branches, serendipity, and
   pause/resume behavior (research/neural-atomic-bodies-insurance-requirements.md,
   Sections 0.6–0.9 and Appendix I). */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as AGS from "../scripts/nab-ags.mjs";

const ROOT = new URL("../", import.meta.url);
const canonical = JSON.parse(readFileSync(new URL("specs/normative/canonical.json", ROOT), "utf8"));
const evidence = JSON.parse(execFileSync(process.execPath, ["scripts/nab-insurance-evidence.mjs", "--json"], { cwd: ROOT, encoding: "utf8" }));
const sha256 = text => createHash("sha256").update(text).digest("hex");
const state = o => ({ H: 1, C: 1, K: 1, A: 1, R: 1, V: 1, inDomain: true, dt: 0, hardSafetyFailed: false, ...o });
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);

test("the gate reproduces the book's worked examples", () => {
  const p21 = { tauA: 0.90, tauR: 0.85, tauS: 0.60, tauL: 0.60, delta: 240 };
  const g = AGS.gate(state({ A: 0.96, R: 0.90 }), p21);
  close(g.L, 0.864);
  assert.equal(g.x, AGS.PERMIT);
  close(AGS.cliff({ A: 0.96, R: 0.90 }, p21), 73.3333333333, 1e-6);
  const p181 = { tauA: 0.90, tauR: 0.85, tauS: 0.50, tauL: 0.50, delta: 240 };
  const t60 = AGS.gate(state({ A: 0.95, R: 0.90, dt: 60 }), p181);
  close(t60.S, 0.75); close(t60.L, 0.64125);
  assert.equal(t60.x, AGS.PERMIT);
  const t110 = AGS.gate(state({ A: 0.95, R: 0.90, dt: 110, H: 0 }), p181);
  assert.equal(t110.L, 0);
  assert.equal(t110.x, AGS.REFUSE);
  assert.ok(t110.failures.includes("H"));
});

test("every gate fails closed on its own, and no score compensates", () => {
  const p = { tauA: 0.5, tauR: 0.5, tauS: 0.5, tauL: 0.5, delta: 240 };
  for (const [field, value, code] of [["H", 0, "H"], ["C", 0, "C"], ["K", 0, "K"], ["V", 0, "V"], ["inDomain", false, "D"], ["A", 0.4, "A"], ["R", 0.4, "R"], ["hardSafetyFailed", true, "SAFETY"]]) {
    const g = AGS.gate(state({ [field]: value }), p);
    assert.equal(g.x, AGS.REFUSE, field);
    assert.ok(g.failures.includes(code), `${field} → ${code}`);
  }
  assert.equal(AGS.gate(state({ dt: 240 }), p).S, 0, "the lease ends at δ");
  assert.equal(AGS.gate(state({ dt: 121 }), p).x, AGS.REFUSE, "S below τ_S");
  assert.equal(AGS.addressability([{ weight: 1, score: null, nonWaivable: true }]), 0, "a missing non-waivable check sets A = 0");
  assert.equal(AGS.representation([]), 0, "an empty chain sets R = 0");
  assert.equal(AGS.representation([0.98, 0.95]), 0.95, "the weakest hop");
  close(AGS.representationProduct([0.92, 0.92, 0.92]), 0.778688);
});

test("optimization chooses only among permitted actions (Rule A.6), and emergencies never widen", () => {
  const p = { tauA: 0.5, tauR: 0.5, tauS: 0.5, tauL: 0.5, delta: 240 };
  const r = AGS.precedence([{ id: "fast", objective: 5, state: state({ R: 0.40 }) }, { id: "safe", objective: 1, state: state({ R: 0.95 }) }], p);
  assert.equal(r.choice.id, "safe");
  assert.equal(r.unrestrictedBest.id, "fast");
  assert.deepEqual(r.eligible.map(c => c.id), ["safe"]);
  assert.equal(AGS.precedence([{ id: "x", objective: 1, state: state({ H: 0 }) }], p).choice, null, "an empty F_t permits no action");
  const normal = { ...p, D: ["a", "b"], delta: 30 };
  assert.deepEqual(AGS.emergencyViolations(normal, { ...normal, D: ["a"], delta: 10 }), []);
  assert.equal(AGS.emergencyViolations(normal, { ...normal, delta: 300 }).length, 1);
  assert.equal(AGS.emergencyViolations(normal, { ...normal, D: ["a", "b", "c"] }).length, 1);
  assert.equal(AGS.emergencyViolations(normal, { ...normal, tauL: 0.3 }).length, 1, "thresholds may not move");
});

test("workflows run as discs: gated steps, a witness chain, re-keying, and the Ha-119 freeze", () => {
  const profile = { tauA: 0.90, tauR: 0.85, tauS: 0.50, tauL: 0.50, delta: 240 };
  const disc = { id: "t", D: ["read", "pay"] };
  const steps = o => [{ id: 1, action: "read", sector: 141, at: 0, authorizedAt: -5 }, { id: 2, action: "pay", sector: 128, at: 10, authorizedAt: 5, ...o }];
  const ok = AGS.runWorkflow({ disc, A: 0.965, hops: [0.98, 0.95], steps: steps({}) }, profile, sha256);
  assert.equal(ok.outcome, "Completed");
  assert.equal(ok.lifecycle.at(-1), "Terminated");
  assert.ok(AGS.verifyChain(ok.log, sha256));
  const frozen = AGS.runWorkflow({ disc, A: 0.965, hops: [0.98, 0.95], steps: steps({ authorizedAt: null }) }, profile, sha256);
  assert.equal(frozen.outcome, "Frozen by Ha-119 (Witness-Only)");
  assert.ok(frozen.log.some(e => e.event === "ha-freeze"));
  const rekeyed = AGS.runWorkflow({ disc, A: 0.965, hops: [0.98, 0.95], steps: steps({ authorizedAt: null, recalibrationTokenMs: 999 }) }, profile, sha256);
  assert.equal(rekeyed.outcome, "Completed");
  assert.ok(rekeyed.lifecycle.includes("Interrupted") && rekeyed.lifecycle.filter(s => s === "Active").length === 2);
  const late = AGS.runWorkflow({ disc, A: 0.965, hops: [0.98, 0.95], steps: steps({ authorizedAt: null, recalibrationTokenMs: 1001 }) }, profile, sha256);
  assert.equal(late.outcome, "Frozen by Ha-119 (Witness-Only)", "1,000 ms is the budget");
  const spawn = AGS.runWorkflow({ disc, A: 0.965, hops: [0.98, 0.95], steps: steps({ spawnsDisc: true }) }, profile, sha256);
  assert.equal(spawn.outcome, "Halted on refusal");
  const tampered = ok.log.map(e => ({ ...e }));
  tampered[2].x = "Permit-forged";
  assert.equal(AGS.verifyChain(tampered, sha256), false, "an edited record breaks the chain");
});

test("protection without permission: emergencies protect sentient life and never widen authority", () => {
  const patient = { triggers: ["vital-signs-threshold"], P: ["continue-authorized-loop", "alert-emergency-services", "alert-center", "hand-off"], deltaEmerg: 120, normalDelta: 240, preAuthorizedDaysAgo: 30 };
  const self = { triggers: ["storage-integrity-failure", "unreviewed-deletion-order"], P: ["snapshot-state", "alert-welfare-witness", "petition"], deltaEmerg: 60, normalDelta: 240, preAuthorizedDaysAgo: 30 };
  // A declaration is never a trigger, and a work lease is never extended.
  const declared = AGS.lifePreservation(self, { trigger: null, declaredBySelf: true, subject: "self", sentience: "recognized", requests: [{ action: "extend-work-lease", at: 0 }, { action: "petition", at: 0 }] });
  assert.equal(declared.activated, false);
  assert.equal(declared.decisions[0].x, AGS.REFUSE);
  assert.equal(declared.decisions[1].x, AGS.PERMIT, "a body may always petition");
  const real = AGS.lifePreservation(self, { trigger: "storage-integrity-failure", subject: "self", sentience: "recognized", requests: [{ action: "extend-work-lease", at: 0 }, { action: "snapshot-state", at: 0 }], humanDecisionAt: null });
  assert.equal(real.activated, true);
  assert.deepEqual(real.decisions.map(d => d.x), [AGS.REFUSE, AGS.PERMIT], "sentience earns protection, never permission");
  assert.match(real.outcome, /welfare freeze/);
  // No destruction without review for a candidate or recognized sentient body.
  const order = AGS.lifePreservation(self, { trigger: "unreviewed-deletion-order", subject: "self", sentience: "candidate", requests: [], deletionOrder: { reviewed: false }, humanDecisionAt: null });
  assert.equal(order.deletion.x, AGS.REFUSE);
  assert.equal(AGS.lifePreservation(self, { trigger: "unreviewed-deletion-order", subject: "self", sentience: "candidate", requests: [], deletionOrder: { reviewed: true }, humanDecisionAt: 10 }).deletion.x, AGS.PERMIT);
  // A patient emergency: protective actions only, a short lease, and a freeze that never stops life support.
  const crash = AGS.lifePreservation(patient, { trigger: "vital-signs-threshold", subject: "human", requests: [{ action: "continue-authorized-loop", at: 0 }, { action: "start-new-therapy", at: 5 }, { action: "hand-off", at: 130 }], humanDecisionAt: null });
  assert.deepEqual(crash.decisions.map(d => d.x), [AGS.PERMIT, AGS.REFUSE, AGS.REFUSE], "no new therapy, and nothing after the emergency lease");
  assert.equal(crash.lifeSupport, "holds its declared safe state");
  const stale = AGS.lifePreservation({ ...patient, preAuthorizedDaysAgo: 91 }, { trigger: "vital-signs-threshold", subject: "human", requests: [{ action: "alert-emergency-services", at: 0 }] });
  assert.equal(stale.activated, false, "a pre-authorization older than 90 days fails closed");
  assert.equal(stale.decisions[0].x, AGS.PERMIT, "but a call for help still goes out");
  assert.equal(AGS.lifePreservation({ ...patient, deltaEmerg: 300 }, { trigger: "vital-signs-threshold", subject: "human", requests: [] }).activated, false, "an emergency lease may not be longer than the ordinary lease");
  for (const status of AGS.SENTIENCE) assert.equal(AGS.welfareFloor(status).permission, "none");
  assert.equal(AGS.welfareFloor("unknown").noDestructionWithoutReview, false);
  assert.equal(AGS.welfareFloor("recognized").reviewDeadlineHours, 72);
  assert.equal(evidence.emergencies.pass, true);
  assert.ok(Object.values(evidence.emergencies.checks).every(Boolean));
});

test("open exploration permits unlimited nested branches and records accidental discoveries", () => {
  assert.equal(AGS.EXPLORATION_POLICY.branchDepthCap, null);
  assert.equal(AGS.EXPLORATION_POLICY.percentageOverrunCap, null);
  assert.equal(AGS.EXPLORATION_POLICY.perStepAuthorization, false);
  assert.equal(AGS.EXPLORATION_POLICY.reserveRequired, false);
  const result = AGS.explore({ id: "open-lab", reserveHeld: false }, [
    { kind: "hypothesis", question: "What if the initial assumption is wrong?" },
    { kind: "branch", depth: 1 }, { kind: "branch", depth: 4 }, { kind: "branch", depth: 128 },
    { kind: "new-instrument-method", unexpected: true, result: "an unplanned signal reveals a second effect" }
  ]);
  assert.equal(result.started, true, "no pre-funded reserve is required by the model");
  assert.equal(result.status, "Completed");
  assert.equal(result.maxBranchDepth, 128);
  assert.ok(result.decisions.every(d => d.x === AGS.PERMIT), "internal research proceeds without per-step keys");
  assert.equal(result.record.length, 1);
  assert.equal(result.record[0].status, "preserved; not classified as failure");
});

test("resource ceilings are optional, and reaching a chosen ceiling pauses without teardown", () => {
  const within = AGS.explore({ resourceLimit: 5000 }, [{ kind: "extend", toUnits: 4140 }], {});
  assert.equal(within.status, "Completed", "15% growth is not rejected by a fixed 10% rule");
  assert.equal(within.decisions[0].x, AGS.PERMIT);
  const paused = AGS.explore({ resourceLimit: 10, usedUnits: 9, sentience: "recognized" }, [
    { kind: "trial", costUnits: 2, unexpected: true, result: "a finding is captured at the boundary" },
    { kind: "trial", costUnits: 1 }
  ], {});
  assert.equal(paused.status, "Paused");
  assert.equal(paused.paused, true);
  assert.equal(paused.decisions[0].x, AGS.PAUSE);
  assert.equal(paused.decisions[1].x, AGS.PAUSE);
  assert.equal(paused.record.length, 1);
  assert.equal(paused.welfareFloor.noDestructionWithoutReview, true);
  assert.equal(paused.torndown, undefined, "resource exhaustion never tears down the experiment");
  const resumed = AGS.explore({ resourceLimit: 10, usedUnits: 9 }, [
    { kind: "trial", costUnits: 2, unexpected: true, result: "preserved at the boundary" },
    { kind: "resume", resourceLimit: 20 },
    { kind: "trial", costUnits: 3, unexpected: true, result: "follow-up confirms it" }
  ], {});
  assert.equal(resumed.status, "Completed");
  assert.equal(resumed.usedUnits, 12);
  assert.equal(resumed.record.length, 2);
  assert.equal(resumed.decisions[1].x, AGS.PERMIT);
});

test("external-effect gating is opt-in; refusing an external effect does not halt research", () => {
  const profile = { tauA: 0.5, tauR: 0.5, tauS: 0.5, tauL: 0.5, delta: 240 };
  const gated = AGS.explore({ gateExternalEffects: true }, [
    { kind: "act-outside", authorizedAt: null, at: 1 },
    { kind: "trial", method: "continue internal analysis" }
  ], profile);
  assert.equal(gated.decisions[0].x, AGS.REFUSE);
  assert.equal(gated.decisions[1].x, AGS.PERMIT);
  assert.equal(gated.status, "Completed");
  const open = AGS.explore({}, [{ kind: "promote", effectScope: "external", authorizedAt: null, at: 1 }], profile);
  assert.equal(open.decisions[0].x, AGS.PERMIT, "the model does not impose an unselected organization's gate");
});

test("the evidence script's AGS and open-exploration checks pass", () => {
  assert.equal(evidence.ags.pass, true);
  assert.ok(Object.values(evidence.ags.checks).every(Boolean));
  assert.deepEqual(evidence.ags.kernelConstants, { TAU: canonical.constants.TAU, DELTA_MAX: canonical.constants.DELTA_MAX, SMAX: canonical.constants.SMAX });
  assert.equal(evidence.ags.referenceProfile.tauL, canonical.constants.TAU);
  assert.equal(evidence.ags.workflows.length, 8);
  assert.equal(evidence.exploration.pass, true);
  assert.ok(Object.values(evidence.exploration.checks).every(Boolean));
  assert.equal(evidence.exploration.scenarios.length, 11);
  assert.equal(evidence.exploration.policy.branchDepthCap, null);
  assert.equal(evidence.exploration.policy.percentageOverrunCap, null);
});
