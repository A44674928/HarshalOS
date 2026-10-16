/* NAB × OCM route-composition tests.

   Run: node --test tests/nab-ocm-test.mjs */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import * as AGS from "../scripts/nab-ags.mjs";
import * as OCMModel from "../scripts/nab-ocm.mjs";

const require = createRequire(import.meta.url);
globalThis.window = globalThis;
require("../js/ocm-data.js");
require("../js/ocm-directory.js");
const DIR = globalThis.HOSOCMDIR;

const CANONICAL = JSON.parse(readFileSync(new URL("../specs/normative/canonical.json", import.meta.url), "utf8"));
const FROM = "0•042•003•0001";
const TO = "0•198•003•0004";
const PROFILE = { tauA: 0.5, tauR: 0.5, tauS: 0.5, tauL: 0.5, delta: 240 };
const STATE = { H: 1, C: 1, K: 1, A: 1, R: 1, V: 1, inDomain: true, dt: 0, hardSafetyFailed: false };
const request = (kind, overrides = {}) => ({ kind, from: FROM, to: TO, ...overrides });

test("NAB–OCM adapter is a route-only composition over the existing OCM directory API", () => {
  assert.equal(OCMModel.COORDINATION, "COORDINATION");
  assert.equal(OCMModel.AUTHORITATIVE_ACTION, "AUTHORITATIVE-ACTION");
  assert.equal(OCMModel.VIA_CENTER, "VIA-CENTER");
  assert.equal(OCMModel.DIRECT_LATERAL, "DIRECT-LATERAL");
  assert.equal(Object.isFrozen(DIR.ROUTING), true);

  const source = readFileSync(new URL("../scripts/nab-ocm.mjs", import.meta.url), "utf8");
  for (const forbidden of ["fetch(", "XMLHttpRequest", "WebSocket", "localStorage", "window.HOS", "HOS.request"]) {
    assert.equal(source.includes(forbidden), false, `the research adapter must not contain ${forbidden}`);
  }
});

test("route semantics match the canonical OCM invariants rather than a new policy definition", () => {
  assert.equal(DIR.ROUTING.metric, CANONICAL.ocm_routing.option_a_routing_cost.metric);
  assert.deepEqual(Array.from(DIR.ROUTING.precedence), CANONICAL.ocm_routing.option_b_precedence_invariants);
  assert.equal(DIR.ROUTING.axisInvariant, CANONICAL.ocm_routing.resolution_axis_invariant);
  assert.deepEqual(Array.from(DIR.ROUTING.operations), CANONICAL.ocm_routing.distinct_operations);
});

test("coordination can route laterally without AGS, resolution, or authority", () => {
  let gateCalls = 0;
  const result = OCMModel.evaluateRouteRequest(DIR, request(OCMModel.COORDINATION, { route: OCMModel.DIRECT_LATERAL }), {
    agsSelected: true,
    agsProfile: PROFILE,
    agsState: STATE,
    gate: () => { gateCalls++; return { x: AGS.PERMIT, S: 1, L: 1, failures: [] }; }
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "COORDINATION-ONLY");
  assert.equal(result.route, "DIRECT-LATERAL");
  assert.equal(result.resolution, "NOT-TRAVERSED");
  assert.equal(result.resolutionTraversed, false);
  assert.equal(result.centerRole, "BYPASSED");
  assert.equal(result.comparison.lateralArcDegrees, 156);
  assert.equal(result.ags.decision, "NOT-APPLICABLE");
  assert.equal(result.authorityEffect, "NONE");
  assert.equal(result.transport, "NONE");
  assert.equal(result.delivery, "NOT-ATTEMPTED");
  assert.equal(result.execution, "NOT-ATTEMPTED");
  assert.equal(gateCalls, 0, "communications are never sent to the AGS gate");
});

test("coordination via Center Origin uses the canonical OCM path but remains non-authorizing", () => {
  const result = OCMModel.evaluateRouteRequest(DIR, request(OCMModel.COORDINATION));

  assert.equal(result.ok, true);
  assert.equal(result.route, "VIA-CENTER");
  assert.equal(result.resolution, "TRAVERSED");
  assert.equal(result.centerRole, "RESOLVE-AND-FORWARD");
  assert.deepEqual(Array.from(result.path, step => [step.leg, step.from, step.to, step.verifies]), [
    ["Resolve legitimacy", FROM, DIR.ROUTING.center, true],
    ["Transmit legitimacy state", DIR.ROUTING.center, TO, false]
  ]);
  assert.equal(result.authorityEffect, "NONE");
  assert.equal(result.ags.evaluated, false);
});

test("an action on the resolution path gets only a plan unless the project selects AGS", () => {
  let gateCalls = 0;
  const result = OCMModel.evaluateRouteRequest(DIR, request(OCMModel.AUTHORITATIVE_ACTION, {
    action: " record-decision "
  }), {
    agsProfile: PROFILE,
    agsState: STATE,
    gate: () => { gateCalls++; return { x: AGS.PERMIT }; }
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "RESOLUTION-PLAN-READY");
  assert.equal(result.action, "record-decision");
  assert.equal(result.resolutionTraversed, true);
  assert.equal(result.ags.selected, false);
  assert.equal(result.ags.evaluated, false);
  assert.equal(result.ags.decision, "NOT-SELECTED");
  assert.equal(gateCalls, 0, "a profile and evaluator do not opt themselves in");
  assert.equal(result.execution, "NOT-ATTEMPTED");
  assert.equal(result.authorityEffect, "NONE");
});

test("an explicitly selected AGS profile evaluates a resolved request, but Permit executes nothing", () => {
  const result = OCMModel.evaluateRouteRequest(DIR, request(OCMModel.AUTHORITATIVE_ACTION, {
    action: "record-decision"
  }), {
    agsSelected: true,
    agsProfile: PROFILE,
    agsState: STATE,
    gate: AGS.gate
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "AGS-MODELED-PERMIT");
  assert.equal(result.ags.selected, true);
  assert.equal(result.ags.evaluated, true);
  assert.equal(result.ags.decision, AGS.PERMIT);
  assert.equal(result.ags.S, 1);
  assert.equal(result.ags.L, 1);
  assert.deepEqual(Array.from(result.ags.failures), []);
  assert.equal(result.authorityEffect, "NONE");
  assert.equal(result.execution, "NOT-ATTEMPTED", "a model Permit is not external action authority");
  assert.equal(result.transport, "NONE");
});

test("a Refuse from the selected AGS model remains separate from OCM routing", () => {
  const result = OCMModel.evaluateRouteRequest(DIR, request(OCMModel.AUTHORITATIVE_ACTION, {
    action: "record-decision"
  }), {
    agsSelected: true,
    agsProfile: PROFILE,
    agsState: { ...STATE, H: 0 },
    gate: AGS.gate
  });

  assert.equal(result.ok, true, "the route itself is valid");
  assert.equal(result.status, "AGS-MODELED-REFUSAL");
  assert.equal(result.resolution, "TRAVERSED");
  assert.equal(result.ags.decision, AGS.REFUSE);
  assert.ok(Array.from(result.ags.failures).includes("H"));
  assert.equal(result.authorityEffect, "NONE");
  assert.equal(result.execution, "NOT-ATTEMPTED");
});

test("direct lateral coordination stays available, but a direct-lateral action skips AGS and is unresolved", () => {
  let gateCalls = 0;
  const result = OCMModel.evaluateRouteRequest(DIR, request(OCMModel.AUTHORITATIVE_ACTION, {
    action: "pay",
    route: OCMModel.DIRECT_LATERAL
  }), {
    agsSelected: true,
    agsProfile: PROFILE,
    agsState: STATE,
    gate: () => { gateCalls++; return { x: AGS.PERMIT }; }
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "NAB-OCM-RESOLUTION-REQUIRED");
  assert.equal(result.status, "REFUSED");
  assert.equal(result.resolution, "NOT-TRAVERSED");
  assert.equal(result.ags.decision, "NOT-EVALUATED");
  assert.equal(gateCalls, 0, "an unresolved route is rejected before optional AGS evaluation");
  assert.equal(result.authorityEffect, "NONE");
  assert.equal(result.execution, "NOT-ATTEMPTED");
});

test("coordination never invokes AGS even when a project has selected an AGS profile", () => {
  let gateCalls = 0;
  const result = OCMModel.evaluateRouteRequest(DIR, request(OCMModel.COORDINATION), {
    agsSelected: true,
    agsProfile: PROFILE,
    agsState: STATE,
    gate: () => { gateCalls++; return { x: AGS.PERMIT }; }
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "COORDINATION-ONLY");
  assert.equal(result.ags.decision, "NOT-APPLICABLE");
  assert.equal(gateCalls, 0);
});

test("invalid addresses, actions, request types, and incomplete selected profiles fail without evaluation", () => {
  assert.equal(OCMModel.evaluateRouteRequest(DIR, request(OCMModel.COORDINATION, { to: "0•360•001•0001" })).code,
    "OCM-ADDR-SECTOR-CLOSURE");
  assert.equal(OCMModel.evaluateRouteRequest(DIR, request(OCMModel.COORDINATION, { from: "0•000•000•0000" })).code,
    "OCM-ADDR-ORIGIN-RESERVED");
  assert.equal(OCMModel.evaluateRouteRequest(DIR, request("OTHER")).code, "NAB-OCM-KIND-INVALID");
  assert.equal(OCMModel.evaluateRouteRequest(DIR, request(OCMModel.AUTHORITATIVE_ACTION)).code, "NAB-OCM-ACTION-REQUIRED");
  assert.equal(OCMModel.evaluateRouteRequest(DIR, request(OCMModel.AUTHORITATIVE_ACTION, { action: "x".repeat(129) })).code,
    "NAB-OCM-ACTION-TOO-LONG");

  let gateCalls = 0;
  const incomplete = OCMModel.evaluateRouteRequest(DIR, request(OCMModel.AUTHORITATIVE_ACTION, { action: "pay" }), {
    agsSelected: true,
    gate: () => { gateCalls++; return { x: AGS.PERMIT }; }
  });
  assert.equal(incomplete.code, "NAB-OCM-AGS-PROFILE-INCOMPLETE");
  assert.equal(incomplete.ags.decision, "NOT-EVALUATED");
  assert.equal(gateCalls, 0);
});

test("gate exceptions and malformed gate results never become a modeled Permit", () => {
  const base = request(OCMModel.AUTHORITATIVE_ACTION, { action: "pay" });
  const args = { agsSelected: true, agsProfile: PROFILE, agsState: STATE };

  const threw = OCMModel.evaluateRouteRequest(DIR, base, { ...args, gate: () => { throw new Error("test"); } });
  assert.equal(threw.code, "NAB-OCM-AGS-EVALUATION-FAILED");
  assert.equal(threw.execution, "NOT-ATTEMPTED");

  const invalid = OCMModel.evaluateRouteRequest(DIR, base, { ...args, gate: () => ({ x: "maybe" }) });
  assert.equal(invalid.code, "NAB-OCM-AGS-RESULT-INVALID");
  assert.equal(invalid.ags.decision, "INVALID-RESULT");
  assert.equal(invalid.authorityEffect, "NONE");
});
