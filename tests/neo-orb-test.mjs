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

test("berth separation re-slots crowded nodes only when enabled, and is deterministic", () => {
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
  const off = Model.makeShape({ formation: 1, axes: AXES_IDEAL, berthSeparation: 0, nodes: crowd });
  assert.equal(off.berthSeparation.movedNodeIds.length, 0, "berth 0 never re-slots");
  assert.ok(minPairChord(off) < Model.BERTH_MIN_CHORD, "the crowd really does overlap without berths");

  const on = Model.makeShape({ formation: 1, axes: AXES_IDEAL, berthSeparation: 1, nodes: crowd });
  assert.ok(on.berthSeparation.movedNodeIds.length > 0, "berth 1 re-slots the crowded nodes");
  assert.ok(minPairChord(on) >= Model.BERTH_MIN_CHORD - 1e-9, `every pair clears the floor (min ${minPairChord(on)})`);
  const again = Model.makeShape({ formation: 1, axes: AXES_IDEAL, berthSeparation: 1, nodes: crowd });
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

function appHarness({ flames = true, film = true } = {}) {
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
  vm.runInContext(rosterSource, context, { filename: "js/good-intelligence-market-roster.js" });
  if (flames) {
    players.inner = fakePlayer("inner");
    players.outer = fakePlayer("outer");
    context.FractalFlame = {
      shared(url) { return url.includes("OuterOrb") ? players.outer : players.inner; }
    };
  }
  if (film) {
    players.film = { ...fakePlayer("film"), dead: false, loaded: 0, total: 200, frameAt: () => 0 };
    context.OrbFilm = { shared: () => players.film, drawWrapped() { return false; } };
    players.film.start = function () { log.started.push("film"); return this; };
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
  assert.equal(body.querySelectorAll("input[type='checkbox'][data-layer]").length, 8);
  assert.ok(body.querySelector("#neo-roster").textContent.includes("52 display orbs"));
  assert.ok(body.querySelector("#neo-conv").textContent.includes("spheroid"), "default axes are a deformed spheroid");
  assert.ok(body.textContent.includes("Display-only"), "the display-only boundary is stated on the surface");
});

test("the shared flame and film engines are started by NEO ORB but never replaced", () => {
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

test("missing flame and film engines degrade to labelled unavailable states, not errors", () => {
  const h = appHarness({ flames: false, film: false });
  const { body } = mountInto(h);
  assert.ok(body.querySelector("#neo-inner").textContent.includes("unavailable"));
  assert.ok(body.querySelector("#neo-outer").textContent.includes("unavailable"));
  assert.ok(body.querySelector("#neo-film").textContent.includes("unavailable"));
  assert.ok(body.querySelector("#neo-roster").textContent.includes("52 display orbs"), "roster still renders without the flames");
});

test("the app code reads no kernel, gate, ledger, provider, or route", () => {
  for (const forbidden of ["HOS.", "fetch(", "XMLHttpRequest", "WebSocket", "localStorage", "sessionStorage", "indexedDB", "/api/", "legitimacy("]) {
    assert.equal(appSource.includes(forbidden), false, `apps-neo-orb.js must not reference ${forbidden}`);
    assert.equal(modelSource.includes(forbidden), false, `neo-orb-model.js must not reference ${forbidden}`);
  }
});

test("the page loads the NEO ORB model before its app and ships its stylesheet", () => {
  const modelIndex = indexHtml.indexOf("js/neo-orb-model.js");
  const appIndex = indexHtml.indexOf("js/apps-neo-orb.js");
  const orb2Index = indexHtml.indexOf("js/good-intelligence-orb2.js");
  assert.ok(modelIndex > orb2Index, "model follows Orb 2");
  assert.ok(appIndex > modelIndex, "app follows the model");
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

test("a full frame draws the flames, the film, the bands, the spokes, and every roster orb", () => {
  const h = appHarness();
  const { body, engine } = mountInto(h);
  const drawn = [];
  for (const [name, player] of [["inner", h.players.inner], ["outer", h.players.outer]]) {
    player.ready = true;
    player.frames = [{}];
    player.drawOn = (ctx, cx, cy, size, alpha) => { drawn.push([name, size > 0, alpha >= 0]); };
  }
  h.players.film.ready = true;
  h.players.film.sampleAt = () => ({ img0: {}, img1: {}, frac: 0.5 });
  const wrapped = [];
  h.context.OrbFilm.drawWrapped = (ctx, o) => { wrapped.push(o.alpha); return true; };

  const canvas = body.querySelector(".neo-canvas");
  Object.defineProperty(canvas, "clientWidth", { value: 640, configurable: true });
  Object.defineProperty(canvas, "clientHeight", { value: 480, configurable: true });
  const ctx = recordingContext();
  engine.ctx = ctx;
  engine.canvas = canvas;
  engine.draw(1000);

  assert.deepEqual(drawn.map(d => d[0]), ["outer", "inner"], "both flame engines draw, outer first");
  assert.equal(wrapped.length, 2, "the film draws a cross-faded pair of frames");
  assert.ok(wrapped.every(a => a >= 0 && a <= 1), "film alpha stays in range");
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

test("disc formation draws no film, and the frame still lays out every orb", () => {
  const h = appHarness();
  const { body, engine } = mountInto(h);
  h.players.film.ready = true;
  h.players.film.sampleAt = () => ({ img0: {}, img1: null, frac: 0 });
  let wrapped = 0;
  h.context.OrbFilm.drawWrapped = () => { wrapped += 1; return true; };
  engine.set("formation", 0);
  const canvas = body.querySelector(".neo-canvas");
  Object.defineProperty(canvas, "clientWidth", { value: 640, configurable: true });
  Object.defineProperty(canvas, "clientHeight", { value: 480, configurable: true });
  engine.ctx = recordingContext();
  engine.canvas = canvas;
  engine.draw(1000);
  assert.equal(wrapped, 0, "the sphere film fades in with formation");
  assert.equal(engine.screenNodes.length, 52);
});
