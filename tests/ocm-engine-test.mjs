/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Orb Communicator Model (OCM) Engine Test Suite
   Verifies automatic communication routing in the animation loop,
   full transmission sequence execution (Inward -> Center -> Outward),
   HUD telemetry updates, and backwards compatibility.
   ═══════════════════════════════════════════════════════════════ */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const ocmDataSrc = readFileSync(path.join(ROOT, "js/ocm-data.js"), "utf8");
const appsOcmSrc = readFileSync(path.join(ROOT, "js/apps-ocm.js"), "utf8");

function createMockEnvironment(options = {}) {
  let nowTime = options.initialTime || 1000;
  const timers = [];
  let rafCallback = null;

  const ctx = {
    beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {},
    arc() {}, clearRect() {}, setTransform() {}, setLineDash() {},
    createRadialGradient: () => ({ addColorStop() {} }),
    fillText() {}
  };

  const canvas = {
    getContext: type => (type === "2d" ? ctx : null),
    clientWidth: 800,
    clientHeight: 500,
    classList: { add() {}, remove() {} },
    addEventListener() {},
    removeEventListener() {},
    style: {}
  };

  const listeners = {};
  const mockElement = (tag = "div") => ({
    tagName: tag.toUpperCase(),
    textContent: "",
    innerHTML: "",
    classList: {
      _set: new Set(["chip-toggle", "on"]),
      add(...cls) { cls.forEach(c => this._set.add(c)); },
      remove(...cls) { cls.forEach(c => this._set.delete(c)); },
      toggle(c, force) {
        const on = force === undefined ? !this._set.has(c) : force;
        on ? this._set.add(c) : this._set.delete(c);
        return on;
      },
      contains(c) { return this._set.has(c); }
    },
    dataset: {},
    addEventListener(evt, fn) { (listeners[evt] ||= []).push(fn); },
    querySelector() { return mockElement(); },
    querySelectorAll() { return [mockElement(), mockElement(), mockElement(), mockElement()]; }
  });

  const sandbox = {
    window: {},
    document: {
      body: { contains: () => true },
      getElementById: () => null
    },
    performance: { now: () => nowTime },
    requestAnimationFrame: fn => { rafCallback = fn; return 1; },
    cancelAnimationFrame: () => {},
    Float32Array,
    Math,
    setTimeout: (fn, ms) => {
      timers.push({ fn, triggerAt: nowTime + (ms || 0) });
      return timers.length;
    },
    clearTimeout: () => {},
    APPS: [],
    HOS: { record: () => {}, legitimacy: () => 1 }
  };
  sandbox.window = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(ocmDataSrc, sandbox);
  vm.runInContext(appsOcmSrc, sandbox);

  const ocmApp = sandbox.APPS.find(a => a.id === "ocm");
  const body = {
    innerHTML: "",
    querySelector(sel) {
      if (sel === "#ocm-canvas") return canvas;
      return mockElement();
    },
    querySelectorAll() {
      return [mockElement(), mockElement(), mockElement(), mockElement()];
    }
  };

  ocmApp.render(body, { toast() {} });
  const engine = sandbox.OCM_ENGINE;

  const advanceFrames = (count = 1, dtMs = 30) => {
    for (let i = 0; i < count; i++) {
      nowTime += dtMs;
      for (let j = 0; j < timers.length; j++) {
        if (timers[j] && nowTime >= timers[j].triggerAt) {
          const fn = timers[j].fn;
          timers[j] = null;
          fn();
        }
      }
      if (rafCallback) rafCallback();
    }
  };

  return { sandbox, engine, canvas, advanceFrames, getNow: () => nowTime };
}

test("OCM engine: registers 'ocm' and 'orbs' in APPS and exposes OCM_ENGINE", () => {
  const { sandbox, engine } = createMockEnvironment();
  assert.ok(sandbox.APPS.some(a => a.id === "ocm"), "The Orb app registered in APPS");
  assert.ok(sandbox.APPS.some(a => a.id === "orbs"), "Interaction Orbs app registered in APPS");
  assert.ok(engine, "OCM_ENGINE is instantiated");
  assert.equal(typeof engine.triggerTransmissionSequence, "function", "triggerTransmissionSequence exposed");
  assert.equal(typeof engine.triggerLateralSequence, "function", "triggerLateralSequence exposed");
  assert.equal(typeof engine.setAutoRoute, "function", "setAutoRoute exposed");
  assert.equal(typeof engine.isAutoRoute, "function", "isAutoRoute exposed");
  assert.equal(typeof engine.getActiveRoute, "function", "getActiveRoute exposed");
  assert.equal(typeof engine.onRouteUpdate, "function", "onRouteUpdate exposed");
});

test("OCM engine: auto-routing is enabled by default with initial countdown", () => {
  const { engine } = createMockEnvironment();
  assert.equal(engine.isAutoRoute(), true, "auto-routing is active by default");
  assert.equal(engine.state.autoRoute, true, "state.autoRoute is true");
  assert.ok(engine.state.autoRouteTimer > 0, "autoRouteTimer starts primed for prompt execution");
});

test("OCM engine: full 4-step transmission sequence executes in order (Inward -> Center Resolve -> Outward -> Confirmed)", () => {
  const { engine, advanceFrames } = createMockEnvironment();
  const phasesSeen = [];

  engine.onRouteUpdate(route => {
    phasesSeen.push({ phase: route.phase, step: route.step, status: route.statusText });
  });

  // Advance frames so the automatic loop triggers the initial sequence
  advanceFrames(120, 25);

  const phaseNames = phasesSeen.map(p => p.phase);
  assert.ok(phaseNames.includes("HOP1_INWARD"), "Sequence includes HOP1_INWARD (Hop 1)");
  assert.ok(phaseNames.includes("CENTER_RESOLVE"), "Sequence includes CENTER_RESOLVE (Center Verification)");
  assert.ok(phaseNames.includes("HOP2_OUTWARD"), "Sequence includes HOP2_OUTWARD (Hop 2 Outward)");
  assert.ok(phaseNames.includes("CONFIRMED"), "Sequence completes with CONFIRMED");

  const lastPhase = phasesSeen[phasesSeen.length - 1];
  assert.equal(lastPhase.phase, "CONFIRMED");
  assert.equal(lastPhase.step, 4);
});

test("OCM engine: lateral coordination sequence executes and confirms", () => {
  const { engine, advanceFrames } = createMockEnvironment();
  const phasesSeen = [];

  engine.onRouteUpdate(route => {
    phasesSeen.push(route.phase);
  });

  const [a, b] = engine.triggerLateralSequence(1, 4);
  assert.equal(a, 1);
  assert.equal(b, 4);

  const route = engine.getActiveRoute();
  assert.equal(route.type, "LATERAL-COORDINATION");
  assert.equal(route.phase, "LATERAL_TRANSIT");

  advanceFrames(150, 30);

  assert.ok(phasesSeen.includes("CONFIRMED"), "Lateral transit reaches CONFIRMED");
  assert.equal(route.metric.includes("Lateral Coordination"), true);
});

test("OCM engine: automatic routing loop advances and triggers continuously in render loop", () => {
  const { engine, advanceFrames } = createMockEnvironment();
  const initialCount = engine.state.autoRouteCount;

  // Run frames to let multiple automatic cycles fire
  advanceFrames(350, 30);

  assert.ok(engine.state.autoRouteCount > initialCount, "autoRouteCount incremented automatically without button clicks");
  assert.ok(engine.state.autoRouteCount >= 2, "multiple transmission cycles executed in the loop");
});

test("OCM engine: setAutoRoute(false) pauses auto-routing and setAutoRoute(true) resumes it", () => {
  const { engine, advanceFrames } = createMockEnvironment();

  engine.setAutoRoute(false);
  assert.equal(engine.isAutoRoute(), false, "autoRoute is paused");

  const pausedCount = engine.state.autoRouteCount;
  advanceFrames(150, 30);
  assert.equal(engine.state.autoRouteCount, pausedCount, "no new routes trigger while paused");

  engine.setAutoRoute(true);
  assert.equal(engine.isAutoRoute(), true, "autoRoute resumed");
  advanceFrames(180, 30);
  assert.ok(engine.state.autoRouteCount > pausedCount, "routes resume executing after unpausing");
});

test("OCM engine: selecting a node queues it as the next transmission source", () => {
  const { engine, advanceFrames } = createMockEnvironment();

  // Select node 3 ("Legitimacy Engine")
  engine.selectNode(3);
  assert.equal(engine.state.selected, 3);
  assert.equal(engine.state.lastSourceIdx, 2); // next sequential pick is (2+1)%n = 3

  advanceFrames(80, 30);

  const active = engine.getActiveRoute();
  assert.ok(active, "Active route exists");
  assert.equal(active.from, 3, "Transmission originated from the user-selected node");
  assert.equal(active.fromName, "Legitimacy Engine");
});

test("OCM engine: backwards-compatible pulseResolution and pulseLateral APIs trigger sequences", () => {
  const { engine, advanceFrames } = createMockEnvironment();

  const from = engine.pulseResolution(2);
  assert.equal(from, 2);
  const route = engine.getActiveRoute();
  assert.equal(route.type, "RESOLUTION-FIRST");
  assert.equal(route.from, 2);

  const [a, b] = engine.pulseLateral(5, 7);
  assert.equal(a, 5);
  assert.equal(b, 7);
  const latRoute = engine.getActiveRoute();
  assert.equal(latRoute.type, "LATERAL-COORDINATION");
});

test("OCM engine: telemetry preserves canonical cost invariant Cost_resolution < Cost_lateral", () => {
  const { engine } = createMockEnvironment();
  engine.triggerTransmissionSequence(1, 6);
  const route = engine.getActiveRoute();

  assert.equal(route.type, "RESOLUTION-FIRST");
  assert.ok(route.metric.includes("Cost_resolution < Cost_lateral"), "Metric asserts canonical cost invariant");
  assert.ok(route.savedHops >= 1, "Saved hops is positive (resolution-first costs 1 hop vs m lateral)");
  assert.equal(route.center, "0•000•000•0000", "Traverses immutable Center Origin");
});

test("OCM engine: onRouteUpdate callback receives live step updates with accurate status text", () => {
  const { engine, advanceFrames } = createMockEnvironment();
  const updates = [];

  engine.onRouteUpdate(route => {
    updates.push({
      step: route.step,
      phase: route.phase,
      status: route.statusText,
      detail: route.detailText
    });
  });

  engine.triggerTransmissionSequence(1, 4);
  advanceFrames(150, 30);

  assert.ok(updates.length >= 4, "Received updates for all transmission sequence phases");
  assert.ok(updates.some(u => u.status.includes("INWARD RESOLUTION")), "Recorded inward resolution hop");
  assert.ok(updates.some(u => u.status.includes("CENTER RESOLUTION")), "Recorded center resolution");
  assert.ok(updates.some(u => u.status.includes("OUTWARD TRANSMISSION")), "Recorded outward transmission hop");
  assert.ok(updates.some(u => u.status.includes("TRANSMISSION CONFIRMED")), "Recorded transmission confirmed");
});
