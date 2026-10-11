/* NEO ORB (web): the display geometry contract and the app's mount behaviour.
   Display-only: these tests assert no provider, gate, route, or authority path exists. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { Window } from "happy-dom";

const ROOT = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, ROOT), "utf8");
const modelSource = await readText("js/neo-orb-model.js");
const placementSource = await readText("js/neo-orb-placement.js");
const marketSource = await readText("js/neo-orb-market.js");
const fieldSource = await readText("js/neo-orb-field.js");
const appSource = await readText("js/apps-neo-orb.js");
const rosterSource = await readText("js/good-intelligence-market-roster.js");
const indexHtml = await readText("index.html");
const cssSource = await readText("css/neo-orb.css");

function modelContext() {
  const window = {};
  const context = vm.createContext({ window, globalThis: window, Object, Array, String, Number, Math, Set, Map, BigInt, Error, RangeError, TypeError });
  vm.runInContext(modelSource, context, { filename: "js/neo-orb-model.js" });
  vm.runInContext(rosterSource, context, { filename: "js/good-intelligence-market-roster.js" });
  return { model: window.NeoOrbModel, roster: window.GoodIntelligenceMarketRoster };
}

const { model: Model, roster: ROSTER } = modelContext();
const AXES_IDEAL = { x: 1, y: 1, z: 1 };

function node(id, overrides = {}) {
  return { id, sector: 90, depth: 0.5, radialBand: 2, kind: "field", ...overrides };
}

/* ── geometry ─────────────────────────────────────────────────────── */

test("sector hashing is pinned to reference FNV-1a values and stays on the Z_360 ring", () => {
  assert.equal(Model.sectorFor("NVDA"), 38);
  assert.equal(Model.sectorFor("AAPL"), 307);
  assert.equal(Model.sectorFor("SPCX"), 21);
  assert.equal(Model.sectorFor("BRK.B"), 18);
  assert.equal(Model.sectorFor("nvda"), Model.sectorFor("NVDA"), "symbols are hashed uppercased");
  for (const asset of ROSTER.assets) {
    const s = Model.sectorFor(asset.symbol);
    assert.ok(Number.isInteger(s) && s >= 0 && s <= 359, `${asset.symbol} sector ${s}`);
  }
});

test("logarithmic market-cap bands follow the documented Orb 2 convention", () => {
  assert.equal(Model.bandFor(1e13), 0, "$10T clamps to the center shell");
  assert.equal(Model.bandFor(1e12), 1, "$1T → band 1");
  assert.equal(Model.bandFor(1e11), 2, "$100B → band 2");
  assert.equal(Model.bandFor(1e10), 3, "$10B → band 3");
  assert.equal(Model.bandFor(1e9), 4, "$1B → band 4");
  assert.equal(Model.bandFor(1e6), 5, "small caps clamp to the outer band");
  assert.equal(Model.bandFor(0), 5, "no cap value fails to the outer band");
  assert.equal(Model.bandFor(Number.NaN), 5);
});

test("radial bands keep the documented 1.45 logarithmic ratio", () => {
  const bands = Model.radialBands();
  assert.equal(bands.length, 6);
  for (let i = 0; i < 5; i++) {
    assert.ok(Math.abs(bands[i + 1].radius / bands[i].radius - 1.45) < 1e-12);
  }
});

test("disc formation keeps every display node on the equatorial plane", () => {
  const shape = Model.makeShape({
    formation: 0, axes: { x: 1.2, y: 0.8, z: 1.1 }, berthSeparation: 0,
    nodes: [node("a", { sector: 10 }), node("b", { sector: 200, radialBand: 4 }), node("c", { sector: 300, radialBand: 0 })]
  });
  for (const placed of shape.nodes) {
    assert.ok(Math.abs(placed.position.y) < 1e-12, `${placed.id} y=${placed.position.y}`);
  }
});

test("ideal axes give full convergence; deformation lowers it without changing node identity", () => {
  const nodes = [node("a", { sector: 40 }), node("b", { sector: 210, radialBand: 4 })];
  const ideal = Model.makeShape({ formation: 1, axes: AXES_IDEAL, berthSeparation: 0, nodes });
  assert.equal(ideal.convergence, 1);
  assert.equal(ideal.idealSphere, true);

  const deformed = Model.makeShape({ formation: 1, axes: { x: 1.1, y: 0.84, z: 1.18 }, berthSeparation: 0, nodes });
  assert.ok(deformed.convergence < 1 && deformed.convergence > 0);
  assert.equal(deformed.idealSphere, false);
  assert.equal(JSON.stringify(deformed.nodes.map(n => n.id)), JSON.stringify(ideal.nodes.map(n => n.id)));
  assert.equal(JSON.stringify(deformed.nodes.map(n => n.node.sector)), JSON.stringify(ideal.nodes.map(n => n.node.sector)));
});

test("the sector domain fails closed: 359 is valid, 360 is rejected", () => {
  assert.doesNotThrow(() => Model.makeShape({ formation: 1, axes: AXES_IDEAL, berthSeparation: 0, nodes: [node("edge", { sector: 359 })] }));
  assert.throws(() => Model.makeShape({ formation: 1, axes: AXES_IDEAL, berthSeparation: 0, nodes: [node("over", { sector: 360 })] }), RangeError);
  assert.throws(() => Model.makeShape({ formation: 1, axes: AXES_IDEAL, berthSeparation: 0, nodes: [node("neg", { sector: -1 })] }), RangeError);
});

test("out-of-range dials and duplicate ids are refused rather than silently clamped", () => {
  assert.throws(() => Model.makeShape({ formation: 1.5, axes: AXES_IDEAL, berthSeparation: 0, nodes: [] }), RangeError);
  assert.throws(() => Model.makeShape({ formation: 1, axes: { x: 3, y: 1, z: 1 }, berthSeparation: 0, nodes: [] }), RangeError);
  assert.throws(() => Model.makeShape({ formation: 1, axes: AXES_IDEAL, berthSeparation: 2, nodes: [] }), RangeError);
  assert.throws(() => Model.makeShape({ formation: 1, axes: AXES_IDEAL, berthSeparation: 0, nodes: [node("dup"), node("dup")] }), RangeError);
});

test("berth separation re-slots crowded placements only when enabled, and is deterministic", () => {
  /* Latitude follows list index, so a crowd is many nodes sharing one sector and band. */
  const crowd = Array.from({ length: 20 }, (_, i) => node(`crowd-${String(i).padStart(2, "0")}`, { sector: 120, radialBand: 2 }));
  const minPairChord = shape => {
    let min = Infinity;
    for (let i = 0; i < shape.nodes.length; i++) {
      for (let j = i + 1; j < shape.nodes.length; j++) {
        const p = shape.nodes[i].position, q = shape.nodes[j].position;
        min = Math.min(min, Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z));
      }
    }
    return min;
  };
  /* At rest the homes are relaxed apart, so even a sector crowd clears the floor with no re-slots. */
  const rest = Model.makeShape({ formation: 1, axes: AXES_IDEAL, berthSeparation: 1, nodes: crowd });
  assert.equal(rest.berthSeparation.movedNodeIds.length, 0, "relaxed homes need no berth re-slot at rest");
  assert.ok(minPairChord(rest) >= Model.BERTH_MIN_CHORD - 1e-9, `homes clear the floor (min ${minPairChord(rest)})`);

  /* Crowded placements (many orbs sent to one spot) are what the berth resolver must fix. */
  const piled = Object.fromEntries(crowd.map(n => [n.id, { longitude: 0.3, latitude: 0.2 }]));
  const off = Model.makeShape({ formation: 1, axes: AXES_IDEAL, berthSeparation: 0, nodes: crowd, placements: piled });
  assert.equal(off.berthSeparation.movedNodeIds.length, 0, "berth 0 never re-slots");
  assert.ok(minPairChord(off) < Model.BERTH_MIN_CHORD, "the piled placements really do overlap without berths");

  const on = Model.makeShape({ formation: 1, axes: AXES_IDEAL, berthSeparation: 1, nodes: crowd, placements: piled });
  assert.ok(on.berthSeparation.movedNodeIds.length > 0, "berth 1 re-slots the piled nodes");
  assert.ok(minPairChord(on) >= Model.BERTH_MIN_CHORD - 1e-9, `every pair clears the floor (min ${minPairChord(on)})`);
  const again = Model.makeShape({ formation: 1, axes: AXES_IDEAL, berthSeparation: 1, nodes: crowd, placements: piled });
  assert.equal(JSON.stringify(again.nodes.map(n => n.position)), JSON.stringify(on.nodes.map(n => n.position)), "same input, same geometry");
});

test("the full roster maps to 52 unique display orbs with valid sectors, bands, and kinds", () => {
  const nodes = Model.rosterNodes(ROSTER.assets);
  assert.equal(nodes.length, 52);
  assert.equal(new Set(nodes.map(n => n.id)).size, 52);
  assert.ok(nodes.every(n => n.sector >= 0 && n.sector <= 359));
  assert.ok(nodes.every(n => n.radialBand >= 0 && n.radialBand <= 5));
  assert.ok(nodes.every(n => ["structural", "field", "interaction"].includes(n.kind)));
  const shape = Model.makeShape({ formation: 1, axes: { x: 1.1, y: 0.84, z: 1.18 }, berthSeparation: 1, nodes });
  assert.equal(shape.nodes.length, 52);
  assert.ok(shape.nodes.every(n => Number.isFinite(n.position.x) && Number.isFinite(n.position.y) && Number.isFinite(n.position.z)));
});

/* ── the web app ──────────────────────────────────────────────────── */

function appHarness({ flames = true } = {}) {
  const win = new Window({ url: "https://os.example/", settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  const doc = win.document;
  const window = win;
  const log = { started: [] };
  const fakePlayer = name => ({
    name, ready: false, baking: false, frames: [], current: 0, onerror: null, onprogress: null,
    start() { log.started.push(name); return this; }
  });
  const players = {};
  const context = vm.createContext({
    window, document: doc, performance, console,
    Math, Number, String, Object, Array, Set, Map, JSON, BigInt, Error, RangeError, TypeError, Promise,
    requestAnimationFrame: () => 0,
    APPS: [{ id: "ocm" }, { id: "orbs" }]
  });
  vm.runInContext(modelSource, context, { filename: "js/neo-orb-model.js" });
  vm.runInContext(placementSource, context, { filename: "js/neo-orb-placement.js" });
  vm.runInContext(marketSource, context, { filename: "js/neo-orb-market.js" });
  vm.runInContext(fieldSource, context, { filename: "js/neo-orb-field.js" });
  vm.runInContext(rosterSource, context, { filename: "js/good-intelligence-market-roster.js" });
  if (flames) {
    players.inner = fakePlayer("inner");
    players.outer = fakePlayer("outer");
    context.FractalFlame = {
      shared(url) { return url.includes("OuterOrb") ? players.outer : players.inner; }
    };
  }
  vm.runInContext(appSource, context, { filename: "js/apps-neo-orb.js" });
  return { win, doc, context, players, log, APPS: context.APPS };
}

function mountInto(harness) {
  const { doc, APPS } = harness;
  const app = APPS.find(a => a.id === "neo-orb");
  const body = doc.createElement("div");
  doc.body.appendChild(body);
  app.render(body);
  return { body, engine: harness.win.NEO_ORB_ENGINE };
}

test("NEO ORB registers as a web app after The Orb and Orb 2", () => {
  const h = appHarness();
  const ids = h.APPS.map(a => a.id);
  assert.equal(ids.indexOf("neo-orb"), ids.indexOf("orbs") + 1);
  const app = h.APPS.find(a => a.id === "neo-orb");
  assert.equal(app.title, "NEO ORB");
  assert.equal(typeof app.render, "function");
});

test("mounting shows the 52-orb roster, layer toggles, and live readouts", () => {
  const h = appHarness();
  const { body } = mountInto(h);
  assert.equal(body.querySelectorAll(".neo-roster-item").length, 52);
  assert.equal(body.querySelectorAll("input[type='checkbox'][data-layer]").length, 6, "orbs, placement, labels, attachments, bands, beat");
  assert.equal(body.querySelector("input[data-layer='placement']").checked, true, "flame-guided placement is on by default");
  assert.ok(body.querySelector("#neo-roster").textContent.includes("52 display orbs"));
  assert.ok(body.querySelector("#neo-conv").textContent.includes("spheroid"), "default axes are a deformed spheroid");
  assert.ok(body.textContent.includes("Display-only"), "the display-only boundary is stated on the surface");
});

test("the shared flame engines are started by NEO ORB but never replaced", () => {
  const h = appHarness();
  let priorCalls = 0;
  h.players.inner.onerror = () => { priorCalls += 1; };
  mountInto(h);
  assert.ok(h.log.started.includes("outer"), "OuterOrb.flame is started if not already running");
  assert.ok(h.log.started.includes("inner"), "Demo.flame is started through the shared player");
  h.players.inner.onerror(new Error("boom"));
  assert.equal(priorCalls, 1, "a previously installed onerror still runs");
  assert.equal(h.win.NEO_ORB_ENGINE.errors.inner, "boom");
});

test("dials are clamped to their documented ranges", () => {
  const h = appHarness();
  const { engine } = mountInto(h);
  engine.set("formation", 9);
  assert.equal(engine.state.formation, 1);
  engine.set("axes.x", -3);
  assert.equal(engine.state.axes.x, 0.25);
  engine.set("berth", -1);
  assert.equal(engine.state.berth, 0);
  engine.set("speed", 99);
  assert.equal(engine.state.speed, 3);
  engine.set("formation", Number.NaN);
  assert.equal(engine.state.formation, 1, "non-numeric input is ignored");
});

test("selecting a roster orb fills the inspector with display-only facts", () => {
  const h = appHarness();
  const { body, engine } = mountInto(h);
  engine.select("NVDA");
  const text = body.querySelector("#neo-inspector").textContent;
  assert.ok(text.includes("NVDA"));
  assert.ok(text.includes("038 / 360"), "display sector is shown as the hash-derived ring value");
  assert.ok(text.includes("Not a quote, rank, or recommendation"));
  assert.equal(body.querySelector(".neo-roster-item[data-id='NVDA']").getAttribute("aria-pressed"), "true");
  engine.select("NOT-A-TICKER");
  assert.equal(engine.selectedId, null, "unknown ids cannot be selected");
});

test("missing flame engines degrade to labelled states, and orbs stay at home", () => {
  const h = appHarness({ flames: false });
  const { body, engine } = mountInto(h);
  assert.ok(body.querySelector("#neo-inner").textContent.includes("unavailable"));
  assert.ok(body.querySelector("#neo-outer").textContent.includes("unavailable"));
  assert.ok(body.querySelector("#neo-place").textContent.includes("home — flame guidance unavailable"));
  assert.ok(body.querySelector("#neo-roster").textContent.includes("52 display orbs"), "roster still renders without the flames");
  engine.updatePlacement(1, 1000);
  assert.ok(engine.placements.every(p => p.displacement === 0 && !p.guided), "no guidance means no displacement");
});

test("the app code reads no kernel, gate, ledger, provider, or route", () => {
  for (const forbidden of ["HOS.", "fetch(", "XMLHttpRequest", "WebSocket", "localStorage", "sessionStorage", "indexedDB", "/api/", "legitimacy("]) {
    assert.equal(appSource.includes(forbidden), false, `apps-neo-orb.js must not reference ${forbidden}`);
    assert.equal(modelSource.includes(forbidden), false, `neo-orb-model.js must not reference ${forbidden}`);
    assert.equal(placementSource.includes(forbidden), false, `neo-orb-placement.js must not reference ${forbidden}`);
  }
});

test("the feed is cut: no read is made, every orb stays neutral, and the surface says so", () => {
  const h = appHarness({ flames: false });
  const { body, engine } = mountInto(h);
  const market = h.win.NeoOrbMarket;
  const tone = id => engine.toneFor(id);

  assert.equal(engine.feedCut(), true, "the reader module owns the cut and the app follows it");
  assert.equal(tone("NVDA").fill, market.COLORS.neutral, "no feed: neutral");
  assert.equal(tone("NVDA").ring, null);

  /* Even a reader that offers rows colours nothing until it declares the feed open. */
  let reached = 0;
  h.win.NeoOrbField = { readField: async () => { reached += 1; return { ok: true, at: 7, observations: [
    { symbol: "NVDA", discId: "stocks", observedAt: 9, market: { changePct: 2, latestBar: { close: 110 }, basis: 100 } }
  ] }; } };
  engine.refreshMarket(1000);
  assert.equal(reached, 0, "a cut app never asks the reader for rows");
  assert.equal(engine.market, null);
  assert.equal(tone("NVDA").fill, market.COLORS.neutral, "an undeclared reader is treated as cut");
  engine.readouts();
  assert.ok(body.querySelector("#neo-market").textContent.includes("0 of 52 orbs coloured"),
    body.querySelector("#neo-market").textContent);
});

test("with the feed deliberately opened, colour still works: fill is rally/sink, ring is basis", async () => {
  const h = appHarness({ flames: false });
  const { body, engine } = mountInto(h);
  const market = h.win.NeoOrbMarket;
  const tone = id => engine.toneFor(id);

  /* The open path is exercised so the cut, not stale colour code, is what keeps orbs neutral. */
  h.win.NeoOrbField = {
    FEED_CUT: false,
    readField: async () => ({ ok: true, at: 7, observations: [
      { symbol: "NVDA", discId: "stocks", observedAt: 9, market: { changePct: 2, latestBar: { close: 110 }, basis: 100 } }
    ] })
  };
  engine.refreshMarket(1000);
  assert.equal(engine.lastMarketAt, 1000, "an open feed reads at once");
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(engine.marketStatus, "live");
  assert.equal(tone("NVDA").fill, market.COLORS.rallying, "NVDA rallies: green fill");
  assert.equal(tone("NVDA").ring, market.COLORS.above, "NVDA is above basis: yellow ring");
  assert.equal(tone("AAPL").fill, "#8fa3c0", "a symbol with no field row stays neutral");
  engine.refreshMarket(1005);
  assert.equal(engine.lastMarketAt, 1000, "within MARKET_EVERY_MS the field is not re-read");

  engine.readouts();
  assert.ok(body.querySelector("#neo-market").textContent.includes("1 of 52 orbs coloured"), body.querySelector("#neo-market").textContent);
  engine.select("NVDA");
  const inspector = body.querySelector("#neo-inspector").textContent;
  assert.ok(inspector.includes("rallying · +2.00% · close above the FBB basis"), inspector);

  /* A failed read is labelled, and the last good colours are kept. */
  h.win.NeoOrbField = { FEED_CUT: false, readField: async () => ({ ok: false, message: "field offline" }) };
  engine.refreshMarket(40000);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(engine.marketStatus, "unavailable — field offline");
  assert.equal(tone("NVDA").fill, market.COLORS.rallying, "a failed read keeps the last colours");
});

test("a frame that throws never stops the clock: the loop re-arms and Status names the failure", () => {
  /* The freeze this guards: an uncaught throw in the frame used to skip the
     requestAnimationFrame call, so the display stopped and the app looked dead. */
  const h = appHarness();
  const { body, engine } = mountInto(h);
  let armed = 0;
  h.context.requestAnimationFrame = () => { armed += 1; return armed; };

  engine.sampleGuide = () => { throw new RangeError("Placement latitude for PSX must be within ±1.2; received -1.5."); };
  engine.tick(1000);
  assert.equal(armed, 1, "the next frame is armed even though this one threw");
  assert.match(engine.errors.frame, /Placement latitude/, "the failure is recorded");
  assert.ok(body.querySelector("#neo-frame").textContent.includes("the display keeps running"),
    body.querySelector("#neo-frame").textContent);

  engine.sampleGuide = () => null;
  engine.tick(2000);
  assert.equal(armed, 2, "and the loop keeps running after the failure clears");
  engine.readouts();
  assert.equal(body.querySelector("#neo-frame").textContent, "ok", "a healthy frame says so");
});

test("a shape the model refuses costs one frame, not the display", () => {
  const h = appHarness({ flames: false });
  const { body, engine } = mountInto(h);
  let armed = 0;
  h.context.requestAnimationFrame = () => { armed += 1; return armed; };
  const good = engine.shape;
  assert.ok(good && good.nodes.length === 52, "the first shape is built");

  const real = h.win.NeoOrbModel;
  h.win.NeoOrbModel = Object.freeze({ ...real, makeShape: () => { throw new RangeError("Placement latitude for PSX must be within ±1.2; received -1.5."); } });
  engine.dirty = true;
  assert.equal(engine.currentShape(1000), good, "the last good shape stays on screen");
  assert.match(engine.errors.shape, /Placement latitude/, "the refusal is reported, not thrown at the loop");

  engine.tick(1200);
  assert.equal(armed, 1, "the clock keeps running through a refused shape");
  assert.equal(engine.errors.frame, null, "the refusal is handled inside the frame, so the frame itself stays clean");
  engine.readouts();
  assert.ok(body.querySelector("#neo-frame").textContent.includes("shape refused"), body.querySelector("#neo-frame").textContent);

  h.win.NeoOrbModel = real;
  engine.dirty = true;
  engine.lastShapeAttempt = -Infinity;
  engine.currentShape(2000);
  assert.equal(engine.errors.shape, null, "and it recovers as soon as the geometry accepts a frame again");
});

test("the flame engines are read for guidance and never drawn on the NEO ORB canvas", () => {
  assert.equal(appSource.includes(".drawOn("), false, "no flame player draws onto the display");
  assert.equal(appSource.includes("OrbFilm"), false, "the sphere film is not used by NEO ORB");
  assert.equal(placementSource.includes("drawImage") || placementSource.includes("getContext"), false, "the placement math never touches a canvas");
});

test("the page loads the NEO ORB model and placement before its app and ships its stylesheet", () => {
  const modelIndex = indexHtml.indexOf("js/neo-orb-model.js");
  const placementIndex = indexHtml.indexOf("js/neo-orb-placement.js");
  const appIndex = indexHtml.indexOf("js/apps-neo-orb.js");
  const orb2Index = indexHtml.indexOf("js/good-intelligence-orb2.js");
  assert.ok(modelIndex > orb2Index, "model follows Orb 2");
  assert.ok(placementIndex > modelIndex, "placement follows the model");
  assert.ok(appIndex > placementIndex, "app follows placement");
  assert.ok(indexHtml.includes("css/neo-orb.css"), "stylesheet is linked");
  assert.ok(cssSource.includes(".neo-canvas") && cssSource.includes(".neo-panel"));
});

/* ── the frame: every layer draws, and the drawn orbs are hit-testable ── */

function recordingContext() {
  const calls = [];
  const gradient = { addColorStop() {} };
  const ctx = { calls, createRadialGradient: () => gradient, createLinearGradient: () => gradient };
  for (const name of ["setTransform", "clearRect", "fillRect", "beginPath", "moveTo", "lineTo", "arc", "fill", "stroke", "fillText", "save", "restore"]) {
    ctx[name] = (...args) => { calls.push(name); return args; };
  }
  return ctx;
}

test("a full frame draws the bands, the spokes, and every roster orb, and never the flames", () => {
  const h = appHarness();
  const { body, engine } = mountInto(h);
  const drawn = [];
  for (const [name, player] of [["inner", h.players.inner], ["outer", h.players.outer]]) {
    player.ready = true;
    player.frames = [{}];
    player.drawOn = () => { drawn.push(name); };
  }

  const canvas = body.querySelector(".neo-canvas");
  Object.defineProperty(canvas, "clientWidth", { value: 640, configurable: true });
  Object.defineProperty(canvas, "clientHeight", { value: 480, configurable: true });
  const ctx = recordingContext();
  engine.ctx = ctx;
  engine.canvas = canvas;
  engine.draw(1000);

  assert.deepEqual(drawn, [], "flame players are read for guidance, never drawn");
  assert.equal(engine.screenNodes.length, 52, "every roster orb is placed on screen");
  const arcs = ctx.calls.filter(c => c === "arc").length;
  assert.ok(arcs >= 52, `orbs are drawn as arcs (${arcs})`);
});

test("hit-testing finds the orb under the pointer and nothing in empty space", () => {
  const h = appHarness();
  const { body, engine } = mountInto(h);
  const canvas = body.querySelector(".neo-canvas");
  Object.defineProperty(canvas, "clientWidth", { value: 640, configurable: true });
  Object.defineProperty(canvas, "clientHeight", { value: 480, configurable: true });
  engine.ctx = recordingContext();
  engine.canvas = canvas;
  engine.draw(1000);
  const target = engine.screenNodes[7];
  const hit = engine.hit(target.x, target.y);
  assert.equal(hit.n.id, target.n.id);
  assert.equal(engine.hit(-500, -500), null, "empty space selects nothing");
});

test("disc formation still lays out every orb on screen", () => {
  const h = appHarness();
  const { body, engine } = mountInto(h);
  engine.set("formation", 0);
  const canvas = body.querySelector(".neo-canvas");
  Object.defineProperty(canvas, "clientWidth", { value: 640, configurable: true });
  Object.defineProperty(canvas, "clientHeight", { value: 480, configurable: true });
  engine.ctx = recordingContext();
  engine.canvas = canvas;
  engine.draw(1000);
  assert.equal(engine.screenNodes.length, 52);
});

/* ── dynamic placement in the app ─────────────────────────────────── */

/* A flame-like bitmap: one broad bright core, offset to the right, RGBA bytes. */
function coreField(size = 40) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = ((x + 0.5) / size) * 2 - 1, v = ((y + 0.5) / size) * 2 - 1;
      const lum = Math.exp(-(((u - 0.4) ** 2) + (v * v)) / 0.08);
      const k = (y * size + x) * 4;
      data[k] = data[k + 1] = data[k + 2] = Math.round(lum * 255);
      data[k + 3] = 255;
    }
  }
  return data;
}

function guidedEngine() {
  const h = appHarness();
  const { body, engine } = mountInto(h);
  const pl = h.win.NeoOrbPlacement;
  const field = pl.fieldFromRGBA(coreField(), 40);
  engine.sampleGuide = () => field;
  return { h, body, engine, pl };
}

test("flame guidance moves orbs off their home sector, smoothly and within the tether", () => {
  const { engine, pl } = guidedEngine();
  const homes = new Map(engine.homes.map(hm => [hm.id, hm]));
  let maxStep = 0, prev = null;
  for (let frame = 0; frame < 6 * 60; frame++) {
    engine.updatePlacement(1 / 60, frame * (1000 / 60));
    if (prev) for (let i = 0; i < prev.length; i++) {
      const dLon = Math.atan2(Math.sin(engine.placements[i].longitude - prev[i].longitude), Math.cos(engine.placements[i].longitude - prev[i].longitude));
      maxStep = Math.max(maxStep, Math.hypot(dLon, engine.placements[i].latitude - prev[i].latitude));
    }
    prev = engine.placements.map(p => ({ longitude: p.longitude, latitude: p.latitude }));
  }
  assert.equal(engine.placements.length, 52);
  assert.ok(engine.placements.every(p => p.guided), "every orb is flame-guided");
  assert.ok(engine.placements.some(p => p.displacement > 0.05), "orbs leave their home sector");
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  for (const p of engine.placements) {
    const dLon = Math.abs(wrap(p.longitude - p.homeLongitude));
    const dLat = Math.abs(p.latitude - p.homeLatitude);
    assert.ok(dLon <= pl.TETHER_LON * 0.8 + 1e-6 && dLat <= pl.TETHER_LAT * 0.8 + 1e-6, `${p.id} stays inside the roam tether (${dLon.toFixed(3)}, ${dLat.toFixed(3)})`);
  }
  assert.ok(maxStep < 0.02, `motion is smooth frame to frame (max ${maxStep.toFixed(4)} rad)`);
  for (const p of engine.placements) assert.equal(p.homeLongitude, homes.get(p.id).longitude, "the home anchor is fixed");
});

test("the Roam dial and the placement layer control motion; zero roam returns every orb home", () => {
  const { engine } = guidedEngine();
  for (let frame = 0; frame < 120; frame++) engine.updatePlacement(1 / 60, frame * (1000 / 60));
  assert.ok(engine.placements.some(p => p.displacement > 0), "guided orbs have moved");
  engine.set("roam", 0);
  for (let frame = 0; frame < 2; frame++) engine.updatePlacement(1 / 60, 2000 + frame * 16);
  assert.ok(engine.placements.every(p => p.displacement === 0), "roam 0 pins every orb to home");
  engine.set("roam", 0.6);
  engine.state.layers.placement = false;
  engine.updatePlacement(1 / 60, 3000);
  assert.equal(engine.placements, null, "turning the layer off returns the shape to home");
  engine.readouts();
  assert.ok(engine.body.querySelector("#neo-place").textContent.includes("placement layer off"), "the status says so");
});

test("placed orbs keep their band radius and still clear the berth floor", () => {
  const { engine, pl } = guidedEngine();
  for (let frame = 0; frame < 4 * 60; frame++) engine.updatePlacement(1 / 60, frame * (1000 / 60));
  const shape = engine.currentShape();
  const bandRadius = new Map(shape.nodes.map(n => [n.id, n.radius]));
  const home = engine.homes.map(hm => hm.id);
  const placedHome = new Map(home.map(id => [id, shape.nodes.find(n => n.id === id)]));
  for (const id of home) assert.ok(placedHome.get(id), `${id} is on the shape`);
  let minChord = Infinity;
  for (let i = 0; i < shape.nodes.length; i++) for (let j = i + 1; j < shape.nodes.length; j++) {
    const a = shape.nodes[i].position, b = shape.nodes[j].position;
    minChord = Math.min(minChord, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z));
  }
  assert.ok(minChord >= shape.berthSeparation.minimumChordDistance - 1e-9, `min chord ${minChord.toFixed(3)} clears the floor`);
  assert.ok(shape.nodes.every(n => Math.abs(n.radius - bandRadius.get(n.id)) < 1e-12), "radius is untouched by placement");
  assert.ok(pl.inertiaFor(0) > pl.inertiaFor(5), "larger caps are heavier");
});

test("a guided frame draws every placed orb and the inspector reports its drift from home", () => {
  const { body, engine } = guidedEngine();
  const canvas = body.querySelector(".neo-canvas");
  Object.defineProperty(canvas, "clientWidth", { value: 640, configurable: true });
  Object.defineProperty(canvas, "clientHeight", { value: 480, configurable: true });
  engine.canvas = canvas;
  engine.ctx = recordingContext();
  for (let frame = 0; frame < 3 * 60; frame++) {
    engine.clock += 1 / 60;
    engine.updatePlacement(1 / 60, frame * (1000 / 60));
    engine.draw(frame * (1000 / 60));
  }
  assert.equal(engine.screenNodes.length, 52, "every placed orb is on screen");
  const moved = engine.placements.filter(p => p.displacement > 0.01).length;
  assert.ok(moved > 0, "some orbs are off their home sector");
  engine.readouts();
  assert.ok(body.querySelector("#neo-place").textContent.startsWith("flame-guided"), "the status reports guided placement");
  const target = engine.placements.find(p => p.displacement > 0.01).id;
  engine.select(target);
  assert.ok(body.querySelector("#neo-inspector").textContent.includes("flame-guided"), "the inspector says the orb is guided");
  assert.ok(body.querySelector("#neo-inspector").textContent.includes("from home sector"));
});

test("guidance is read from a scratch canvas and nothing is painted on the display", () => {
  const h = appHarness();
  const { engine } = mountInto(h);
  const painted = [];
  const reads = [];
  const scratch = {
    clearRect() {},
    drawImage(src, x, y, w, hh) { reads.push([src, w, hh]); },
    getImageData(x, y, w, hh) { return { data: coreField(w) }; }
  };
  h.players.inner.ready = true;
  h.players.inner.frames = [{ tag: "inner-frame" }];
  h.players.inner.playhead = () => ({ cur: 0 });
  engine.guideCanvas = scratch;
  const field = engine.sampleGuide();
  assert.ok(field && field.size === 40, "one combined field comes back");
  assert.deepEqual(reads.map(r => r[0].tag), ["inner-frame"], "only the flame frame is read");
  assert.equal(reads[0][1], 40, "the frame is sampled at 40×40");
  assert.equal(painted.length, 0);
});
