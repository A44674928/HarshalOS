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
const extensionSource = await readText("js/market-extension.js");
const signalsSource = await readText("js/neo-orb-signals.js");
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
  const measured = Object.fromEntries(crowd.map(n => [n.id, 0.5]));
  const rest = Model.makeShape({ formation: 1, axes: AXES_IDEAL, berthSeparation: 1, nodes: crowd, depths: measured });
  assert.equal(rest.berthSeparation.movedNodeIds.length, 0, "relaxed homes need no berth re-slot at rest");
  assert.ok(minPairChord(rest) >= Model.BERTH_MIN_CHORD - 1e-9, `homes clear the floor (min ${minPairChord(rest)})`);
  /* A crowd of unmeasured orbs all sit on the outer shell, where the relaxation cannot always
     spread twenty neighbours. The resolver still has to clear the floor for every pair. */
  const held = Model.makeShape({ formation: 1, axes: AXES_IDEAL, berthSeparation: 1, nodes: crowd });
  assert.ok(minPairChord(held) >= Model.BERTH_MIN_CHORD - 1e-9, `held crowd clears the floor (min ${minPairChord(held)})`);

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
    Date, URLSearchParams,
    requestAnimationFrame: () => 0,
    APPS: [{ id: "ocm" }, { id: "orbs" }]
  });
  vm.runInContext(modelSource, context, { filename: "js/neo-orb-model.js" });
  vm.runInContext(placementSource, context, { filename: "js/neo-orb-placement.js" });
  vm.runInContext(marketSource, context, { filename: "js/neo-orb-market.js" });
  vm.runInContext(extensionSource, context, { filename: "js/market-extension.js" });
  vm.runInContext(signalsSource, context, { filename: "js/neo-orb-signals.js" });
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

/* ── the instability region: distance from the centre is the extension ───────
   The further overbought or oversold a stored reading is, the further out its orb
   sits. Band shells never move; an extended orb leaves its shell for a region
   outside every band. The reading itself comes from js/market-extension.js, which
   tests/market-extension-test.mjs holds. */

/* The drawn band shells, as the model computes them: one node per band, at full depth,
   so band 5 is the outermost shell an orb can have without being extended. */
function bandShells(depth = 1) {
  /* The shell an orb of a given depth sits on; held is the outer shell. Market-cap bands no
     longer set radius, so each shell is named by its depth. */
  const shells = [0, 0.25, 0.5, 0.75, 1].map(d => ({ band: d, radius: Model.shellRadiusOf(d) }));
  shells.push({ band: "held", radius: Model.shellRadiusOf(null) });
  return shells;
}

test("the instability region sits outside every depth shell, and extension 0 leaves the shells exact", () => {
  const region = Model.INSTABILITY_REGION;
  const shells = bandShells(1);
  const outermost = Math.max(...shells.map(shell => shell.radius));

  assert.equal(Object.isFrozen(region), true, "the region is a fixed part of the model, not a dial");
  assert.ok(Math.abs(outermost - Model.DEPTH_SHELL.outer) < 1e-12, `the ±1000 envelope sits at r = ${Model.DEPTH_SHELL.outer}`);
  assert.ok(region.inner > outermost, `the region starts outside every shell (${region.inner} > ${outermost})`);
  assert.ok(region.outer > region.inner, "and it has depth, so a reading is visible inside it");
  assert.ok(region.entry > 0 && region.entry < 1, "an orb crosses into it over a span of extension, not in one step");

  for (const shell of shells) {
    assert.equal(Model.extensionRadius(shell.radius, 0), shell.radius,
      `shell ${shell.band} keeps its exact radius at extension 0`);
    for (const missing of [null, undefined, Number.NaN]) {
      assert.equal(Model.extensionRadius(shell.radius, missing), shell.radius,
        `a missing extension is no push (shell ${shell.band})`);
    }
    assert.equal(Model.extensionRadius(shell.radius, -0.5), shell.radius, "a stray value below 0 is clamped, never pulled inward");
    assert.equal(Model.extensionRadius(shell.radius, 1), region.outer, "an extreme reading reaches the region's outer edge from any shell");
    assert.equal(Model.extensionRadius(shell.radius, 3), region.outer, "and past 1 the scale is capped, not extrapolated");
    assert.equal(Model.extensionRadius(0, 1), 0, "a degenerate radius is returned unchanged");
    assert.equal(Model.extensionRadius(-1, 1), -1);
    assert.ok(Math.abs(Model.extensionRadius(shell.radius, 1e-6) - shell.radius) < 1e-4,
      `an orb leaves its shell smoothly, without a jump (shell ${shell.band})`);

    /* Monotone outward: the further out the reading, the further out the orb, and never inward. */
    let previous = shell.radius;
    for (let step = 1; step <= 400; step += 1) {
      const x = step / 400;
      const radius = Model.extensionRadius(shell.radius, x);
      assert.ok(radius >= previous - 1e-12, `shell ${shell.band} must not move inward at extension ${x}`);
      assert.ok(radius >= shell.radius - 1e-12, `shell ${shell.band} is never pulled inside itself at ${x}`);
      assert.ok(radius <= region.outer + 1e-12, `shell ${shell.band} never passes the region at ${x}`);
      previous = radius;
    }
  }

  /* Past the entry span the shell no longer matters: one region, positioned by the reading
     alone, outside every shell. That is what makes the distance comparable across orbs. */
  for (const x of [region.entry, 0.3, 0.6, 1]) {
    const radii = shells.map(shell => Model.extensionRadius(shell.radius, x));
    assert.ok(Math.max(...radii) - Math.min(...radii) < 1e-12, `at extension ${x} every shell lands on one shell`);
    assert.ok(Math.abs(radii[0] - (region.inner + (region.outer - region.inner) * x)) < 1e-12,
      `and that shell is positioned by the reading alone (x = ${x})`);
    assert.ok(radii[0] > outermost, `so every extended orb there is outside the outermost shell (x = ${x})`);
  }
});

test("makeShape lifts only the orbs it is given, keeps every band shell, and reports the region", () => {
  const region = Model.INSTABILITY_REGION;
  const nodes = [
    node("AAA", { radialBand: 0, sector: 10 }),
    node("BBB", { radialBand: 5, sector: 130 }),
    node("CCC", { radialBand: 2, sector: 250 })
  ];
  const calm = Model.makeShape({ formation: 1, axes: AXES_IDEAL, berthSeparation: 0, nodes });
  assert.equal(calm.instability.extendedCount, 0, "a shape with no extensions extends nothing");
  assert.equal(calm.instability.maxExtension, 0);
  assert.equal([...calm.instability.extendedNodeIds].join(","), "");
  assert.ok(calm.instability.maxRadius <= 1 + 1e-12, "a calm field reaches no further than the outermost shell");
  assert.equal(calm.instability.region.inner, region.inner, "and it reports the region it would use");
  for (const n of calm.nodes) {
    assert.equal(n.radius, n.shellRadius, `${n.id} sits exactly on its shell`);
    assert.equal(n.extension, 0);
  }

  const pushed = Model.makeShape({
    formation: 1, axes: AXES_IDEAL, berthSeparation: 0, nodes,
    extensions: { AAA: 1, BBB: 0.5 }
  });
  const byId = id => pushed.nodes.find(n => n.id === id);
  assert.equal(byId("AAA").radius, region.outer, "an extreme reading is drawn on the region's outer edge");
  assert.equal(byId("AAA").extension, 1);
  assert.ok(byId("AAA").shellRadius < region.inner, "while its shell stays where the depth puts it");
  assert.ok(Math.abs(byId("AAA").shellRadius - Model.shellRadiusOf(null) * (0.88 + 0.12 * 0.5)) < 1e-12, "and it is still reported exactly");
  const expectedHalf = region.inner + (region.outer - region.inner) * 0.5;
  assert.ok(Math.abs(byId("BBB").radius - expectedHalf) < 1e-12, "a half reading sits halfway through the region");
  assert.ok(byId("BBB").radius > 1, "outside the outermost band shell, whatever band it belongs to");
  assert.equal(byId("CCC").radius, byId("CCC").shellRadius, "an orb with no reading never leaves its shell");
  assert.equal(byId("CCC").extension, 0);

  assert.equal(pushed.instability.extendedCount, 2);
  assert.equal([...pushed.instability.extendedNodeIds].sort().join(","), "AAA,BBB");
  assert.equal(pushed.instability.maxExtension, 1);
  assert.equal(pushed.instability.maxRadius, region.outer, "the shape reports how far out the fleet reaches");

  /* The lift moves the drawn position and nothing else. */
  const a = byId("AAA");
  assert.ok(Math.abs(Math.hypot(a.position.x, a.position.y, a.position.z) - a.radius) < 1e-9,
    "the orb is drawn at the lifted radius, not at its shell");
  for (const n of pushed.nodes) {
    const before = calm.nodes.find(c => c.id === n.id);
    assert.equal(n.node.sector, before.node.sector, `${n.id} keeps its sector`);
    assert.equal(n.node.radialBand, before.node.radialBand, `${n.id} keeps its market-cap band`);
    assert.equal(n.node.kind, before.node.kind, `${n.id} keeps its kind`);
    assert.equal(n.nodeRadius, before.nodeRadius, `${n.id} keeps its drawn size`);
    assert.equal(n.radialBandRadius, before.radialBandRadius, `${n.id} keeps its band convention radius`);
  }
  assert.equal(pushed.nodes.map(n => n.id).join(","), calm.nodes.map(n => n.id).join(","),
    "extension adds no orb and drops none");

  /* The roster shape the app draws: only the orbs with a reading move. */
  const rosterNodes = Model.rosterNodes(ROSTER.assets);
  const rosterShape = Model.makeShape({
    formation: 1, axes: AXES_IDEAL, berthSeparation: 1, nodes: rosterNodes,
    extensions: { NVDA: 1, PSX: 0.25 }
  });
  assert.equal(rosterShape.nodes.length, 52);
  assert.equal(rosterShape.instability.extendedCount, 2);
  assert.equal(rosterShape.nodes.find(n => n.id === "NVDA").radius, region.outer);
  const psx = rosterShape.nodes.find(n => n.id === "PSX");
  assert.ok(psx.radius > psx.shellRadius && psx.radius < region.inner + (region.outer - region.inner) * 0.25 + 1e-12,
    "a quarter reading lifts a small cap part of the way into the region");
  assert.ok(rosterShape.nodes.filter(n => n.id !== "NVDA" && n.id !== "PSX").every(n => n.radius === n.shellRadius),
    "every other orb on the roster stays on its band shell");
});

test("an extension the model cannot draw is refused, not silently clamped", () => {
  const nodes = [node("AAA", { sector: 10 }), node("BBB", { sector: 200 })];
  const shape = extensions => Model.makeShape({ formation: 1, axes: AXES_IDEAL, berthSeparation: 0, nodes, extensions });

  assert.equal(shape(null).instability.extendedCount, 0, "no extensions argument means nothing is extended");
  assert.equal(shape(undefined).instability.extendedCount, 0);
  assert.equal(shape({}).instability.extendedCount, 0, "and neither does an empty map");
  assert.equal(shape({ AAA: 0 }).instability.extendedCount, 0, "an explicit zero is not an extension");

  assert.throws(() => shape({ CCC: 0.5 }), /not a node in this shape/, "an id that is not in the shape is refused");
  for (const bad of [-0.2, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "0.5", null, {}]) {
    assert.throws(() => shape({ AAA: bad }), /must be a finite 0…1/, `extension ${JSON.stringify(bad) ?? String(bad)} is refused`);
  }
  assert.throws(() => shape([0.5]), /map of node id/, "an array is not a map of node ids");
});

/* The stored rows the app reads, shaped as the Worker stores them. */
const stockRow = (symbol, market) => ({ symbol, discId: "stocks", observedAt: 9, market });
const openReader = rows => ({ FEED_CUT: false, FEED_CUT_MESSAGE: "", readField: async () => ({ ok: true, at: 7, observations: rows }) });
const settle = async () => { for (let turn = 0; turn < 12; turn += 1) await Promise.resolve(); };

const composed = (row, composedPosition) => ({ ...row, composition: { composedPosition, status: "composed" } });
const EXTREME_ROW = composed(stockRow("NVDA", {
  changePct: 3.2, latestBar: { close: 118 }, basis: 100, bands: { lower1000: 90, upper1000: 110 },
  waveTrend: { wt1: 74, wt2: 30, zone: "extreme overbought" }
}), 1);
const CALM_ROW = composed(stockRow("AAPL", {
  changePct: -0.4, latestBar: { close: 100 }, basis: 100, bands: { lower1000: 90, upper1000: 110 },
  waveTrend: { wt1: -18, wt2: -6, zone: "neutral zone" }
}), 0);
const UNMEASURED_ROW = stockRow("TSLA", { changePct: 1.1 });

test("the app eases each orb toward its stored reading and keeps the whole fleet in frame", async () => {
  const h = appHarness({ flames: false });
  const { body, engine } = mountInto(h);
  const region = Model.INSTABILITY_REGION;

  h.win.NeoOrbField = openReader([EXTREME_ROW, CALM_ROW, UNMEASURED_ROW]);
  engine.refreshMarket(1000);
  await settle();

  assert.equal(engine.marketStatus, "live");
  assert.equal(engine.extensionFor("NVDA").state.extension, 1, "an extreme WaveTrend reading is the full scale");
  assert.equal(engine.extensionFor("NVDA").state.driver, "both",
    "this row maxes both measures: wt1 past the extreme threshold and a close past the ±1000 envelope");
  assert.equal(engine.extensionFor("NVDA").state.beyondEnvelope, true);
  assert.equal(engine.extensionFor("AAPL").state.extension, 0, "a neutral reading is a real zero, not a missing one");
  assert.equal(engine.extensionFor("TSLA").state.available, false, "a row with neither measure is unmeasured");
  assert.equal(engine.extensionFor("MSFT").state, null, "and a symbol with no row has no reading at all");
  assert.equal(engine.extensionFor("NVDA").value, 0, "nothing has moved yet: the display eases, it does not jump");

  /* Ease outward: monotone, bounded, and settling exactly on the stored reading. */
  let previous = 0;
  for (let frame = 0; frame < 900; frame += 1) {
    engine.updateExtensions(1 / 60, false);
    const value = engine.extensionFor("NVDA").value;
    assert.ok(value >= previous - 1e-15, "the orb only ever moves toward its reading");
    assert.ok(value >= 0 && value <= 1, "and it stays inside the scale");
    previous = value;
  }
  assert.equal(previous, 1, "it settles exactly on the stored reading");
  assert.equal(engine.extensionFor("AAPL").value, 0, "a neutral orb stays on its band shell");
  assert.equal(engine.extensionFor("TSLA").value, 0, "an unmeasured orb stays on its band shell");
  assert.equal(engine.extensionFor("MSFT").value, 0);
  engine.updateExtensions(0, false);
  assert.equal(engine.extensionFor("NVDA").value, 1, "no elapsed time moves nothing");

  /* A paused or reduced-motion view snaps instead of gliding, and still shows the reading. */
  engine.extensions.set("NVDA", 0);
  engine.updateExtensions(0, true);
  assert.equal(engine.extensionFor("NVDA").value, 1, "instant mode snaps to the reading with no elapsed time");

  /* What the frame draws, and the camera that holds it. */
  engine.dirty = true;
  const shape = engine.currentShape(2000);
  const nvda = shape.nodes.find(n => n.id === "NVDA");
  assert.equal(nvda.radius, region.outer, "the extreme orb is drawn on the region's outer edge");
  assert.ok(nvda.bandRadius < region.inner, "while its market-cap band shell stays where the convention puts it");
  assert.equal(shape.instability.extendedCount, 1);
  assert.equal(shape.instability.maxRadius, region.outer);

  assert.equal(engine.fit, 1, "the view starts at the scale it has always used");
  let fit = engine.fit;
  for (let frame = 0; frame < 900; frame += 1) {
    engine.updateFit(1 / 60, shape);
    assert.ok(engine.fit <= fit + 1e-15, "the view only ever eases out, never snaps");
    assert.ok(engine.fit > 0.4 && engine.fit <= 1, "and it stays inside its documented bounds");
    fit = engine.fit;
  }
  assert.ok(Math.abs(engine.fit - 1 / region.outer) < 1e-3,
    `the view eased out to hold the extended fleet (fit ${engine.fit.toFixed(4)})`);
  engine.updateFit(0, shape);
  assert.ok(Math.abs(engine.fit - 1 / region.outer) < 1e-3, "no elapsed time changes the framing");

  /* The Status row says what the region is doing, in numbers. */
  engine.readouts();
  const readout = body.querySelector("#neo-ext").textContent;
  assert.match(readout, /1 of 52 outside their band shell/, readout);
  assert.match(readout, /max 1\.00 \(NVDA\)/, readout);
  assert.match(readout, /3 measured/, readout);
  assert.match(readout, /region 1\.08…1\.50/, readout);
  assert.match(readout, /view \d+%/, readout);
  assert.match(body.querySelector("#neo-market").textContent, /3 of 52 orbs coloured/);

  /* A calm field: the framing returns to exactly what it has always been. */
  h.win.NeoOrbField = openReader([CALM_ROW]);
  engine.refreshMarket(30_000);
  await settle();
  for (let frame = 0; frame < 900; frame += 1) {
    engine.updateExtensions(1 / 60, false);
    engine.dirty = true;
    engine.updateFit(1 / 60, engine.currentShape(31_000 + frame));
  }
  assert.equal(engine.extensionFor("NVDA").value, 0, "a reading that goes away brings the orb back to its shell");
  assert.ok(Math.abs(engine.fit - 1) < 1e-3, `and the view returns to its usual scale (fit ${engine.fit.toFixed(4)})`);
  engine.readouts();
  assert.match(body.querySelector("#neo-ext").textContent, /0 of 52 outside their band shell/);
  assert.match(body.querySelector("#neo-frame").textContent, /ok/, "the frame loop is healthy throughout");
});

test("an unmeasured orb stays on its shell and says it is unmeasured, never calm", async () => {
  const h = appHarness({ flames: false });
  const { body, engine } = mountInto(h);
  h.win.NeoOrbField = openReader([EXTREME_ROW, CALM_ROW, UNMEASURED_ROW]);
  engine.refreshMarket(1000);
  await settle();
  /* Snap, as a paused or reduced-motion view does, so the radii below are the drawn ones. */
  engine.updateExtensions(0, true);
  engine.dirty = true;
  engine.currentShape(2000);

  const inspector = () => body.querySelector("#neo-insp-ext").textContent;

  engine.select("NVDA");
  engine.readouts();
  assert.match(inspector(), /1\.00 out · driven by both measures · wt1 \+74\.0 → 1\.00/, inspector());
  assert.match(inspector(), /close 18\.0% above the FBB basis → 1\.00/, "the basis half is reported beside it");
  assert.match(inspector(), /beyond the ±1000 envelope/, "and a close outside the envelope says so");
  assert.match(inspector(), /shown at 1\.00 ·/, "the snapped value is the reading itself");
  assert.equal(/while it settles/.test(inspector()), false, "and nothing is called unsettled once it has arrived");
  assert.match(inspector(), /r 1\.500 from a depth shell of 0\.\d\d\d/, "and it names both radii");

  engine.select("AAPL");
  engine.readouts();
  assert.match(inspector(), /0\.00 out/, inspector());
  assert.match(inspector(), /r (\d\.\d\d\d) from a depth shell of \1/, "a neutral orb sits exactly on its shell");

  /* Mid-ease the same line says so, instead of claiming the drawn radius is the reading. */
  engine.select("NVDA");
  engine.extensions.set("NVDA", 0.4);
  engine.readouts();
  assert.match(inspector(), /shown at 0\.40 while it settles/, inspector());

  engine.select("TSLA");
  engine.readouts();
  assert.match(inspector(), /unmeasured — no WaveTrend value and no FBB basis frame/, inspector());
  engine.select("MSFT");
  engine.readouts();
  assert.match(inspector(), /unmeasured — this orb has no stored row/, inspector());

  /* The legend and the footer state the encoding, so the distance cannot be misread. */
  assert.match(body.textContent, /further out = more extended/);
  assert.match(body.textContent, /the larger of the WaveTrend reading past ±53…±70/);
  assert.match(body.querySelector(".neo-foot").textContent, /Distance from the centre is the instability extension/);
  assert.match(body.querySelector(".neo-foot").textContent, /not a valuation, a rank, or a recommendation/);

  /* A module that did not load is labelled, not quietly treated as calm. */
  h.win.MarketExtension = null;
  assert.equal(engine.extensionReadout(), "unavailable — the extension module did not load");
  engine.select("NVDA");
  engine.readouts();
  assert.match(inspector(), /unavailable — the extension module did load|unavailable — the extension module did not load/);
  assert.match(inspector(), /unavailable/, inspector());
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
      { symbol: "NVDA", discId: "stocks", observedAt: 9, market: { changePct: 2, latestBar: { close: 110 }, basis: 100, vfi: { value: 5, signal: 3, available: true } }, composition: { composedPosition: 1, status: "composed" } }
    ] })
  };
  engine.refreshMarket(1000);
  assert.equal(engine.lastMarketAt, 1000, "an open feed reads at once");
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(engine.marketStatus, "live");
  assert.equal(tone("NVDA").fill, market.COLORS.rallying, "NVDA rallies: green fill");
  assert.equal(tone("NVDA").ring, market.COLORS.flowAbove, "NVDA's VFI is above its signal: sky ring");
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

test("the shell radius follows depth: basis on the inner shell, the ±1000 envelope on the outer, unmeasured held outside", () => {
  const { DEPTH_SHELL, shellRadiusOf } = Model;
  assert.equal(shellRadiusOf(0), DEPTH_SHELL.inner, "depth 0 (at the basis) is the inner shell");
  assert.equal(shellRadiusOf(1), DEPTH_SHELL.outer, "depth 1 (at the ±1000 envelope) is the outer shell");
  assert.ok(Math.abs(shellRadiusOf(0.5) - (DEPTH_SHELL.inner + DEPTH_SHELL.outer) / 2) < 1e-12, "linear across the frame");
  assert.equal(shellRadiusOf(null), DEPTH_SHELL.held, "an unmeasured orb is held on the outer shell");
  assert.equal(shellRadiusOf(7), DEPTH_SHELL.outer, "a depth past 1 is capped at the outer shell");

  const nodes = [node("ZERO", { sector: 10 }), node("ONE", { sector: 130 }), node("NONE", { sector: 250 })];
  const shape = Model.makeShape({
    formation: 1, axes: AXES_IDEAL, berthSeparation: 0, nodes,
    depths: { ZERO: 0, ONE: 1, NONE: null }
  });
  const byId = id => shape.nodes.find(n => n.id === id);
  assert.ok(byId("ZERO").shellRadius < byId("ONE").shellRadius, "a deeper orb sits further out");
  assert.equal(byId("NONE").shellRadius, byId("ONE").shellRadius, "an unmeasured orb is drawn with the outermost measured depth, not calm");
  assert.equal(byId("ZERO").depth, 0);
  assert.equal(byId("NONE").depth, null, "the reading is reported as unmeasured");

  const absent = Model.makeShape({ formation: 1, axes: AXES_IDEAL, berthSeparation: 0, nodes });
  assert.equal(absent.nodes.every(n => n.depth === null), true, "no depths at all: every orb is unmeasured");

  for (const bad of [{ ZERO: -0.1 }, { ZERO: 1.2 }, { ZERO: Number.NaN }, { GHOST: 0.5 }]) {
    assert.throws(() => Model.makeShape({ formation: 1, axes: AXES_IDEAL, berthSeparation: 0, nodes, depths: bad }), RangeError,
      `refused: ${JSON.stringify(bad)}`);
  }
});
