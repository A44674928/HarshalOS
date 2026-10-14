/* Node harness: direction of authority, and the inbound profile.
   Run: node --test tests/g0-direction-test.mjs

   Two fixes, both about which way the power points.

   First, C1 to C4 are not a tie-breaker for difficult cases. They are the
   inbound axis — authority exercised OVER the entity — and they are the only
   place the instrument asks about it. Step 3.5 consulted them only when the
   vector came out AMBIGUOUS, so an entity that landed cleanly on NAB or GSRB
   was never told what holds over it. They now run and report every time.

   Second, the B-layer was answering outbound questions with inbound
   evidence, because B1 says "entity" for the institution and B4 says it for
   the party subject to it. Each question now names the directions of
   evidence it will accept. The case that motivated it: "the user can walk
   away" is the subject party ending its own participation, which halts
   nothing the institution does, so it no longer satisfies B4. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

globalThis.window = globalThis;
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };
globalThis.URL.createObjectURL = () => "";
globalThis.URL.revokeObjectURL = () => {};

await import("../js/g0-engine.js");
const G0 = globalThis.G0;

const audit = async (basis, answers = [true, false, true, true, true]) => {
  const input = G0.normalizeAuditInput({
    version: "1.1", name: "Example", identifier: "ENTITY-001", cutoff: "2026-10-02",
    answers: answers.map(value => ({ value, source: "https://example.com/policy", date: "2026-09-01", notes: "A cited policy claim.", gap: "" })),
    constraints: Array.from({ length: 4 }, () => ({ value: false, source: "", date: "", notes: "", gap: "Not demonstrated by the submitted evidence." })),
    b4: { actor: "Example", action: "A decision", procedure: "An appeal", basis }
  }, "1.1");
  return G0.createAudit(input, []);
};

test("every behavioural question declares which direction of evidence it accepts", () => {
  for (const code of ["B1", "B2", "B3", "B4", "B5"]) {
    const entry = G0.QUESTION_DIRECTION[code];
    assert.ok(entry, `${code} declares a direction`);
    assert.ok(entry.accepts.length > 0, `${code} accepts something`);
  }
  /* B4 is the inbound one: it asks whether an outside mechanism stops the
     institution, which is a question about power over it, not by it. */
  assert.deepEqual(G0.QUESTION_DIRECTION.B4.accepts, ["inboundOnAppeal"]);
  assert.equal(G0.QUESTION_DIRECTION.B4.axis, "inbound");
  for (const code of ["B1", "B3", "B5"]) {
    assert.deepEqual(G0.QUESTION_DIRECTION[code].accepts, ["outbound"], `${code} is outbound only`);
  }
  assert.deepEqual(G0.QUESTION_DIRECTION.B2.accepts, ["outbound", "inboundOnAppeal", "inboundIndependent"], "B2 is genuinely mixed, and admits either kind of external action");
});

test("self-directed evidence is refused: walking away halts nothing the institution does", () => {
  assert.equal(G0.evidenceAllowedFor("B4", { direction: "inboundOnAppeal" }), true, "a court seized by an appeal, staying the action, is B4's business");
  assert.equal(G0.evidenceAllowedFor("B4", { direction: "selfDirected" }), false, "the subject party leaving is not");
  assert.equal(G0.evidenceAllowedFor("B4", { direction: "outbound" }), false, "and neither is the institution's own power");
  assert.equal(G0.evidenceAllowedFor("B1", { direction: "inboundIndependent" }), false, "an outbound question refuses inbound evidence");
  assert.equal(G0.evidenceAllowedFor("B2", { direction: "inboundIndependent" }), true, "except B2, which admits it");
  assert.equal(G0.evidenceAllowedFor("Z9", { direction: "inbound" }), false, "an unasked question accepts nothing");
  assert.equal(G0.evidenceAllowedFor("B4", {}), false, "and untagged evidence is not admitted by default");
});

test("the exit route no longer satisfies B4, and the other routes still do", async () => {
  const exit = await audit("NO_PENALTY_EXIT");
  assert.equal(exit.report.B4_Event_Record.B4_Basis, "NO_PENALTY_EXIT");
  assert.equal(exit.report.B4_Event_Record.Scored_Answer, "NO",
    "a penalty-free exit ends one party's participation, not the institution's action");

  const rule = await audit("TERMINAL_RULE");
  assert.equal(rule.report.B4_Event_Record.Scored_Answer, "YES", "a binding terminal rule still qualifies");

  const none = await audit("NOT_DEMONSTRATED");
  assert.equal(none.report.B4_Event_Record.Scored_Answer, "NO", "no route, no YES");
});

test("B4's routes say what each of them is actually about", () => {
  assert.equal(G0.B4_BASIS.TERMINAL_RULE.direction, "inboundOnAppeal");
  assert.equal(G0.B4_BASIS.RESOLVED_APPEALS.direction, "inboundOnAppeal");
  assert.equal(G0.B4_BASIS.NO_PENALTY_EXIT.direction, "selfDirected");
  assert.match(G0.B4_BASIS.NO_PENALTY_EXIT.note, /continues for everyone else/);
});

test("a regulator acting on its own initiative is C1's evidence, not B4's", () => {
  /* The Commerce case: a government orders a halt, on its own initiative, and
     the institution complies. That is power over the entity, which is exactly
     what C1 asks about — and it is not an appeal, which is what B4 asks about. */
  assert.equal(G0.evidenceAllowedFor("B4", { direction: "inboundIndependent" }), false,
    "a regulator's own-initiative halt does not answer B4");
  assert.ok(G0.CONSTRAINT_DIRECTION.C1.accepts.includes("inboundIndependent"),
    "it is C1's direction instead");
  assert.ok(G0.CONSTRAINT_DIRECTION.C2.accepts.includes("inboundOnAppeal"),
    "and an appeal that grants relief is C2's");
  assert.equal(G0.CONSTRAINT_DIRECTION.C3.accepts[0], "structural", "a sunset binds the institution to itself");
});

test("no one event can answer both questions: B4 and C1 look in different directions", () => {
  const b4 = new Set(G0.QUESTION_DIRECTION.B4.accepts);
  const c1 = new Set(G0.CONSTRAINT_DIRECTION.C1.accepts);
  const overlap = [...b4].filter(direction => c1.has(direction));
  assert.deepEqual(overlap, [], "the same halt cannot be counted twice, once as an appeal and once as an override");
  /* Which is the whole reason for splitting inbound: under one undifferentiated
     "inbound", every entity that answers to any regulator would satisfy both. */
  assert.equal(G0.DIRECTION.inboundOnAppeal.seizedBy, "subject-party");
  assert.equal(G0.DIRECTION.inboundIndependent.seizedBy, "external");
});

test("the inbound profile is reported for a determinate phase, not only an ambiguous one", async () => {
  /* 1,0,1,0,1 classifies as GSRB at HIGH confidence — a clean landing on a
     defined branch, which is exactly the case where step 3.5 used to stay
     silent about everything that holds over the entity. */
  const result = await audit("NOT_DEMONSTRATED", [true, false, true, false, true]);
  assert.equal(result.phase, "GSRB", "a determinate phase, not an ambiguous one");
  const profile = result.inbound;
  assert.ok(profile, "the audit carries the inbound profile");
  assert.equal(profile.axis, "authority exercised over the entity");
  assert.equal(profile.total, 4, "all four constraint questions");
  assert.equal(profile.checks.length, 4);
  assert.equal(profile.demonstrated, 0, "and here none of them is demonstrated");
  assert.equal(profile.consultedForPhase, false,
    "the vector was not ambiguous, so step 3.5 would never have looked at these — and they are reported anyway");
  assert.equal(result.report.Inbound_Profile.Demonstrated, "0 of 4");
  assert.match(result.report.Inbound_Profile.Consulted_For_Phase, /regardless of phase/);
});

test("the inbound profile still decides the phase when the vector is ambiguous", async () => {
  /* Four unanswered and one yes: the vector cannot complete a branch, so the
     constraints are what settle it. All four demonstrated → NAB-Constrained. */
  const input = G0.normalizeAuditInput({
    version: "1.1", name: "Example", identifier: "ENTITY-002", cutoff: "2026-10-02",
    answers: [true, null, null, null, null].map(value => ({ value, source: value === true ? "https://example.com/policy" : "", date: value === true ? "2026-09-01" : "", notes: value === true ? "A cited policy claim." : "", gap: "" })),
    constraints: Array.from({ length: 4 }, () => ({ value: true, source: "https://example.com/order", date: "2026-08-01", notes: "A cited external order.", gap: "" })),
    /* C2 only scores on an outcome record: a published route, invoked, with a
       bounded set of resolved appeals showing at least 50% relief. Sixty of
       one hundred, complete, and dated before the cutoff. */
    c2: { route: true, invoked: true, complete: true, numerator: "60", denominator: "100", start: "2025-01-01", end: "2026-09-01" },
    b4: { actor: "", action: "", procedure: "", basis: "NOT_DEMONSTRATED" }
  }, "1.1");
  const result = await G0.createAudit(input, []);
  assert.equal(result.inbound.demonstrated, 4, "all four, now that C2 has its outcome record");
  assert.equal(result.inbound.consultedForPhase, true, "step 3.5 did look at these");
  assert.equal(result.phase, "NAB-Constrained", "and they settle the phase, as they always did when consulted");
});
