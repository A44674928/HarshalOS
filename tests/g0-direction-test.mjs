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
   the party subject to it. Each question names the directions of evidence it
   accepts. Under v1.1, a self-directed exit qualifies only when it is binding,
   penalty-free, and explicitly terminates the specified action; mere ability
   to walk away remains insufficient. */

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

const cutoff = G0.makeUtsCutoff("2026-10-02T23:59:59.999Z");
const completeC2 = () => ({
  publishedRoute: { sourceId: "route", criteria: "Appeals must be filed within thirty days and identify the challenged action." },
  invocation: { sourceId: "invocation", criteria: "The listed cases invoked that published route under its stated filing criteria." },
  outcomeSet: {
    sourceIds: ["set"], complete: true, periodStart: "2025-01-01", periodEnd: "2026-09-01", numerator: "1", denominator: "2",
    outcomes: [
      { caseId: "CASE-1", outcome: "RELIEF", date: "2025-06-01", sourceIds: ["out-1"] },
      { caseId: "CASE-2", outcome: "NO_RELIEF", date: "2026-01-01", sourceIds: ["out-2"] }
    ]
  },
  sources: [
    { id: "route", role: "ROUTE", url: "https://example.com/route", date: "2026-07-01", locator: "Appeals section, paragraph 2", claim: "Published route and filing criteria." },
    { id: "invocation", role: "INVOCATION", url: "https://example.com/invocations", date: "2026-07-02", locator: "Annual report, page 14", claim: "These cases invoked the published route." },
    { id: "set", role: "OUTCOME_SET", url: "https://example.com/outcomes", date: "2026-07-03", locator: "Resolved matters, table 3", claim: "Complete bounded set of resolved outcomes." },
    { id: "out-1", role: "OUTCOME", url: "https://example.com/case-one", date: "2026-07-04", locator: "Disposition, paragraph 1", claim: "The appeal granted relief in case one." },
    { id: "out-2", role: "OUTCOME", url: "https://example.com/case-two", date: "2026-07-05", locator: "Disposition, paragraph 1", claim: "The appeal denied relief in case two." }
  ]
});
const audit = async (basis, answers = [true, false, true, true, true], flags = {}) => {
  const input = G0.newInput("1.1");
  input.name = "Example"; input.identifier = "ENTITY-001"; input.cutoff = cutoff;
  input.answers = answers.map(value => ({ value, source: "https://example.com/policy", date: "2026-09-01", notes: "A cited policy claim.", gap: "" }));
  input.constraints = Array.from({ length: 4 }, () => ({ value: false, source: "", date: "", notes: "", gap: "Not demonstrated by the submitted evidence." }));
  input.b4 = { ...input.b4, actor: "Example", action: "A specified decision", procedure: "The operative exit clause", basis, ...flags };
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

test("a self-directed exit qualifies only when it binds, carries no penalty, and terminates the specified action", () => {
  assert.equal(G0.evidenceAllowedFor("B4", { direction: "inboundOnAppeal" }), true, "a court seized by an appeal, staying the action, is B4's business");
  assert.equal(G0.evidenceAllowedFor("B4", { direction: "selfDirected" }), false, "an unspecified walk-away is not enough");
  assert.equal(G0.evidenceAllowedFor("B4", { direction: "selfDirected", basis: "NO_PENALTY_EXIT", binding: true, noPenalty: true, terminatesAction: false }), false, "the exit must expressly terminate the named action");
  assert.equal(G0.evidenceAllowedFor("B4", { direction: "selfDirected", basis: "NO_PENALTY_EXIT", binding: true, noPenalty: true, terminatesAction: true }), true, "the narrow, fully specified v1.1 exit is admitted");
  assert.equal(G0.evidenceAllowedFor("B4", { direction: "outbound" }), false, "neither is the institution's own power");
  assert.equal(G0.evidenceAllowedFor("B1", { direction: "inboundIndependent" }), false, "an outbound question refuses inbound evidence");
  assert.equal(G0.evidenceAllowedFor("B2", { direction: "inboundIndependent" }), true, "except B2, which admits it");
  assert.equal(G0.evidenceAllowedFor("Z9", { direction: "inbound" }), false, "an unasked question accepts nothing");
  assert.equal(G0.evidenceAllowedFor("B4", {}), false, "and untagged evidence is not admitted by default");
});

test("the v1.1 exit route qualifies only with all three binding/no-penalty/termination facts", async () => {
  for (const flags of [
    {},
    { binding: false, noPenalty: true, terminatesAction: true },
    { binding: true, noPenalty: false, terminatesAction: true },
    { binding: true, noPenalty: true, terminatesAction: false }
  ]) {
    const rejected = await audit("NO_PENALTY_EXIT", undefined, flags);
    assert.equal(rejected.report.B4_Event_Record.Scored_Answer, "NO", `incomplete exit flags ${JSON.stringify(flags)} do not qualify`);
  }
  const exit = await audit("NO_PENALTY_EXIT", undefined, { binding: true, noPenalty: true, terminatesAction: true });
  assert.equal(exit.report.B4_Event_Record.B4_Basis, "NO_PENALTY_EXIT");
  assert.equal(exit.report.B4_Event_Record.Scored_Answer, "YES",
    "a binding, penalty-free exit that expressly terminates this action qualifies");

  const rule = await audit("TERMINAL_RULE");
  assert.equal(rule.report.B4_Event_Record.Scored_Answer, "YES", "a terminal rule still qualifies");

  const none = await audit("NOT_DEMONSTRATED");
  assert.equal(none.report.B4_Event_Record.Scored_Answer, "NO", "no route, no YES");
});

test("B4's routes say what each of them is actually about", () => {
  assert.equal(G0.B4_BASIS.TERMINAL_RULE.direction, "inboundOnAppeal");
  assert.equal(G0.B4_BASIS.RESOLVED_APPEALS.direction, "inboundOnAppeal");
  assert.equal(G0.B4_BASIS.NO_PENALTY_EXIT.direction, "selfDirected");
  assert.match(G0.B4_BASIS.NO_PENALTY_EXIT.note, /binding, penalty-free exit/);
  assert.match(G0.B4_BASIS.NO_PENALTY_EXIT.note, /explicitly terminates the specified action/);
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

test("the inbound profile still decides an ambiguous phase when C2 has complete, sourced provenance", async () => {
  /* Four unanswered and one yes: the vector cannot complete a branch, so the
     constraints settle it. C2 is affirmative only with an explicit route,
     invocation criteria, complete bounded outcome set and source set. */
  const input = G0.newInput("1.1");
  input.name = "Example"; input.identifier = "ENTITY-002"; input.cutoff = cutoff;
  input.answers = [true, null, null, null, null].map(value => ({ value, source: value === true ? "https://example.com/policy" : "", date: value === true ? "2026-09-01" : "", notes: value === true ? "A cited policy claim." : "", gap: "" }));
  input.constraints = [
    { value: true, source: "https://example.com/order", date: "2026-08-01", notes: "A cited external order.", gap: "" },
    { value: true, source: "https://example.com/route", date: "2026-07-01", notes: "Published appeal route with filing criteria.", gap: "" },
    { value: true, source: "https://example.com/order", date: "2026-08-01", notes: "A cited sunset requirement.", gap: "" },
    { value: true, source: "https://example.com/order", date: "2026-08-01", notes: "A cited active constraint.", gap: "" }
  ];
  input.c2 = completeC2();
  const result = await G0.createAudit(input, []);
  assert.equal(result.inbound.demonstrated, 4, "all four, now that C2 has its outcome record");
  assert.equal(result.inbound.consultedForPhase, true, "step 3.5 did look at these");
  assert.equal(result.phase, "NAB-Constrained", "and they settle the phase, as they always did when consulted");
});
