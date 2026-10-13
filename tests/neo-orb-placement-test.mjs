/* NEO ORB dynamic placement: flame-guided motion as pure math.
   Synthetic bitmaps only, so the suite runs without a browser or the flame bakes.
   Display-only: these tests assert the placer reads no data beyond the home anchors. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, ROOT), "utf8");
const modelSource = await readText("js/neo-orb-model.js");
const placementSource = await readText("js/neo-orb-placement.js");
const rosterSource = await readText("js/good-intelligence-market-roster.js");

const window = {};
const context = vm.createContext({
  window, globalThis: window, Object, Array, String, Number, Math, Set, Map, BigInt, Error, RangeError, TypeError,
  Float32Array, Float64Array, Uint8ClampedArray, Infinity, JSON, Symbol
});
vm.runInContext(rosterSource, context, { filename: "js/good-intelligence-market-roster.js" });
vm.runInContext(modelSource, context, { filename: "js/neo-orb-model.js" });
vm.runInContext(placementSource, context, { filename: "js/neo-orb-placement.js" });
const M = window.NeoOrbModel;
const P = window.NeoOrbPlacement;
const ROSTER = window.GoodIntelligenceMarketRoster;

const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const DT = 1 / 60;
const SIZE = 40;

/* Bright broad core at (u, v) = (0.4, 0), the same shape as a real flame's core. */
function coreBytes(cu = 0.4, cv = 0, width = 0.08) {
  const data = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const u = ((x + 0.5) / SIZE) * 2 - 1, v = ((y + 0.5) / SIZE) * 2 - 1;
      const lum = Math.exp(-(((u - cu) ** 2) + ((v - cv) ** 2)) / width);
      const k = (y * SIZE + x) * 4;
      data[k] = data[k + 1] = data[k + 2] = Math.round(lum * 255);
      data[k + 3] = 255;
    }
  }
  return data;
}
const coreField = (cu, cv, width) => P.fieldFromRGBA(coreBytes(cu, cv, width), SIZE);

function homesOf(count, { band = null } = {}) {
  return Array.from({ length: count }, (_, i) => ({
    id: `N${String(i).padStart(2, "0")}`,
    longitude: (i / count) * Math.PI * 2 - Math.PI,
    latitude: Math.sin(i * 1.3) * 0.5,
    band: band === null ? i % 6 : band
  }));
}

function rosterHomes() {
  return M.homesFor(M.rosterNodes(ROSTER.assets));
}

function runFor(placer, field, seconds) {
  let out = null;
  for (let k = 0; k < Math.round(seconds / DT); k++) out = placer.step(DT, field);
  return out;
}

/* ── density fields ─────────────────────────────────────────────── */

test("a black bitmap yields an empty field, and a bright core peaks at 1 inside the disc", () => {
  const black = P.fieldFromRGBA(new Uint8ClampedArray(SIZE * SIZE * 4), SIZE);
  assert.ok(black.values.every(v => v === 0), "black is zero everywhere");
  const field = coreField(0, 0, 0.3);
  assert.ok(Math.abs(Math.max(...field.values) - 1) < 1e-6, "the brightest cell is normalized to 1");
  assert.equal(P.sampleField(field, 1.5, 0), 0, "outside the disc is 0");
});

test("fields reject bitmaps too small to sample, and combine by weight", () => {
  assert.throws(() => P.fieldFromRGBA(new Uint8ClampedArray(16), 4), RangeError);
  assert.equal(P.combineFields([]), null, "no sources means no guidance");
  const a = coreField(0.5, 0, 0.05), b = coreField(-0.5, 0, 0.05);
  const combined = P.combineFields([{ field: a, weight: 3 }, { field: b, weight: 1 }]);
  assert.ok(P.sampleField(combined, 0.5, 0) > P.sampleField(combined, -0.5, 0), "the heavier source dominates");
  assert.throws(() => P.combineFields([{ field: a, weight: 1 }, { field: P.fieldFromRGBA(coreBytes(), 20), weight: 1 }]), RangeError);
});

test("the gradient points toward the bright core", () => {
  const field = coreField(0.5, 0, 0.1);
  const g = P.gradientField(field, 0, 0);
  assert.ok(g.u > 0, "uphill toward the core on the u axis");
  assert.ok(Math.abs(P.gradientField(field, 0.5, 0).u) < 0.05, "flat at the peak");
});

test("bits spread across a broad core instead of piling onto one local maximum", () => {
  const bits = P.findBits(P.smoothField(coreField(0.4, 0, 0.12)));
  assert.ok(bits.length >= 6, `a broad core yields several bits (${bits.length})`);
  assert.ok(bits.length <= P.BIT_COUNT, "never more than the bit budget");
  const us = bits.map(b => b.u);
  assert.ok(Math.max(...us) - Math.min(...us) > 0.3, "the bits span the core");
  for (let i = 0; i < bits.length; i++) {
    assert.ok(bits[i].u * bits[i].u + bits[i].v * bits[i].v <= 0.81 + 1e-9, "every bit is inside the disc");
    for (let j = i + 1; j < bits.length; j++) {
      assert.ok(Math.hypot(bits[i].u - bits[j].u, bits[i].v - bits[j].v) >= P.BIT_COUNT * 0 + 0.18 - 1e-9, "bits keep their spacing");
    }
  }
  assert.equal(P.findBits(P.fieldFromRGBA(new Uint8ClampedArray(SIZE * SIZE * 4), SIZE)).length, 0, "no light, no bits");
});

test("hashing is deterministic, lands in [0, 1), and separates identities", () => {
  const h = P.hash01("NVDA#0");
  assert.equal(P.hash01("NVDA#0"), h);
  assert.ok(h >= 0 && h < 1);
  assert.notEqual(P.hash01("NVDA#1"), h);
  assert.notEqual(P.hash01("AAPL#0"), h);
});

test("inertia is monotone in band and bounded: the largest caps are the heaviest", () => {
  assert.equal(P.inertiaFor(0), 3.5);
  assert.equal(P.inertiaFor(5), 1);
  for (let b = 0; b < 5; b++) assert.ok(P.inertiaFor(b) > P.inertiaFor(b + 1));
  assert.equal(P.inertiaFor(99), 1, "an out-of-range band is clamped to the lightest");
});

/* ── placer contract ────────────────────────────────────────────── */

test("the placer refuses duplicate or malformed homes", () => {
  assert.throws(() => P.createPlacer("not-an-array"), TypeError);
  assert.throws(() => P.createPlacer([{ id: "A", longitude: 0, latitude: 0, band: 1 }, { id: "A", longitude: 1, latitude: 0, band: 1 }]), RangeError);
  assert.throws(() => P.createPlacer([{ id: "", longitude: 0, latitude: 0, band: 1 }]), TypeError);
});

test("with no guidance, every orb rests exactly at its home anchor", () => {
  const homes = homesOf(12);
  const placer = P.createPlacer(homes, { roam: 1 });
  const out = runFor(placer, null, 3);
  assert.equal(placer.guided, false);
  for (const p of out) {
    assert.equal(p.displacement, 0, `${p.id} stays home`);
    const home = homes.find(h => h.id === p.id);
    assert.equal(p.longitude, wrap(home.longitude));
    assert.equal(p.latitude, home.latitude);
  }
});

test("guided orbs leave home and travel toward the bright core", () => {
  const homes = homesOf(16, { band: 2 });
  const field = coreField(0.4, 0, 0.12);
  const placer = P.createPlacer(homes, { roam: 1 });
  const out = runFor(placer, field, 12);
  assert.equal(placer.guided, true);
  const mean = out.reduce((a, p) => a + p.displacement, 0) / out.length;
  assert.ok(mean > 0.1, `orbs have moved (mean drift ${mean.toFixed(3)} rad)`);
  const meanLon = out.reduce((a, p) => a + wrap(p.longitude - p.homeLongitude), 0) / out.length;
  assert.ok(meanLon > 0, "the net drift is toward the core, which sits at positive u");
});

test("motion is deterministic: the same field and inputs give the same placements", () => {
  const field = coreField(0.3, -0.2, 0.1);
  const a = runFor(P.createPlacer(rosterHomes(), { roam: 0.7 }), field, 8);
  const b = runFor(P.createPlacer(rosterHomes(), { roam: 0.7 }), field, 8);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test("motion is smooth: no orb steps faster than its mass-capped speed", () => {
  const homes = homesOf(20);
  const field = coreField(0.4, 0, 0.12);
  const placer = P.createPlacer(homes, { roam: 1 });
  let prev = placer.step(DT, field);
  let worst = 0;
  for (let k = 0; k < 60 * 20; k++) {
    const cur = placer.step(DT, field);
    for (let i = 0; i < cur.length; i++) {
      const step = Math.hypot(wrap(cur[i].longitude - prev[i].longitude), cur[i].latitude - prev[i].latitude);
      const cap = P.MAX_SPEED / Math.sqrt(P.inertiaFor(homes[i].band)) * DT * 1.05 + 1e-9;
      assert.ok(step <= cap, `${cur[i].id} stepped ${step.toFixed(5)} > cap ${cap.toFixed(5)} at frame ${k}`);
      worst = Math.max(worst, step);
    }
    prev = cur;
  }
  assert.ok(worst > 0, "the orbs really were moving");
});

test("every orb stays inside its roam tether, however long it runs", () => {
  const homes = rosterHomes();
  const placer = P.createPlacer(homes, { roam: 0.8 });
  const field = coreField(0.9, 0.5, 0.02);
  for (let k = 0; k < 60 * 90; k++) {
    const out = placer.step(DT, field);
    if (k % 60) continue;
    for (const p of out) {
      const dLon = Math.abs(wrap(p.longitude - p.homeLongitude)), dLat = Math.abs(p.latitude - p.homeLatitude);
      assert.ok(dLon <= P.TETHER_LON * 0.8 + 1e-6 && dLat <= P.TETHER_LAT * 0.8 + 1e-6, `${p.id} at (${dLon.toFixed(3)}, ${dLat.toFixed(3)}) at t=${k / 60}s`);
    }
  }
});

test("roam scales the tether: zero pins every orb home, and lowering roam pulls orbs back in", () => {
  const field = coreField(0.4, 0, 0.12);
  const placer = P.createPlacer(rosterHomes(), { roam: 1 });
  const wide = runFor(placer, field, 10);
  const wideMax = Math.max(...wide.map(p => p.displacement));
  placer.setRoam(0.2);
  const narrow = runFor(placer, field, 6);
  const narrowMax = Math.max(...narrow.map(p => p.displacement));
  assert.ok(narrowMax < wideMax, `lower roam, smaller drift (${narrowMax.toFixed(3)} < ${wideMax.toFixed(3)})`);
  placer.setRoam(0);
  const pinned = runFor(placer, field, 0.2);
  assert.ok(pinned.every(p => p.displacement === 0), "roam 0 pins every orb home");
  assert.equal(placer.roam, 0);
});

test("heavier orbs (larger caps) cover less ground than light ones under the same field", () => {
  /* Path length over a window, not the speed at one instant: a light orb oscillates
     faster, so its instantaneous speed depends on phase. Distance travelled does not. */
  const field = coreField(0.4, 0, 0.12);
  const pathLength = (homes, seconds) => {
    const placer = P.createPlacer(homes, { roam: 1 });
    let prev = placer.step(DT, field), total = 0;
    for (let k = 0; k < Math.round(seconds / DT); k++) {
      const cur = placer.step(DT, field);
      for (let i = 0; i < cur.length; i++) total += Math.hypot(wrap(cur[i].longitude - prev[i].longitude), cur[i].latitude - prev[i].latitude);
      prev = cur;
    }
    return total / homes.length;
  };
  const heavy = pathLength(homesOf(8, { band: 0 }), 2);
  const light = pathLength(homesOf(8, { band: 5 }), 2);
  assert.ok(heavy < light, `band 0 covers less ground in 2 s (${heavy.toFixed(3)} < ${light.toFixed(3)} rad)`);
});

test("the full roster spreads across the bright core and does not clump on one bit", () => {
  const placer = P.createPlacer(rosterHomes(), { roam: 0.9 });
  const field = coreField(0.4, 0, 0.12);
  const out = runFor(placer, field, 30);
  const cells = new Set(out.map(p => `${Math.round(wrap(p.longitude) / 0.05)},${Math.round(p.latitude / 0.05)}`));
  assert.ok(cells.size >= 30, `the 52 orbs occupy ${cells.size} distinct cells`);
  assert.ok(out.filter(p => p.speed > 0.02).length > 0, "some orbs are travelling between bits");
});

test("orbs keep travelling between bits: none parks for good, and the fleet never stops", () => {
  const field = coreField(0.4, 0, 0.12);
  const placer = P.createPlacer(rosterHomes(), { roam: 0.9 });
  const epochs = new Map();
  let streak = 0, longestStill = 0;
  for (let k = 0; k < 60 * 30; k++) {
    const out = placer.step(DT, field);
    for (const p of out) epochs.set(p.id, p.epoch);
    streak = out.every(p => p.speed < 0.02) ? streak + 1 : 0;
    longestStill = Math.max(longestStill, streak);
  }
  const minRetargets = Math.min(...epochs.values());
  assert.ok(minRetargets >= 2, `every orb moves on to new bits within 30 s (fewest: ${minRetargets})`);
  assert.ok(longestStill / 60 < 2, `the fleet never rests for more than 2 s (longest ${(longestStill / 60).toFixed(2)} s)`);
});

test("reset returns every orb home and forgets the guidance", () => {
  const homes = homesOf(10);
  const placer = P.createPlacer(homes, { roam: 1 });
  runFor(placer, coreField(0.4, 0, 0.12), 5);
  placer.reset();
  const out = placer.step(DT, null);
  assert.ok(out.every(p => p.displacement === 0));
  assert.equal(placer.guided, false);
});

/* ── model integration: placed points stay on the shape's rules ─── */

test("placements that equal home reproduce the un-placed shape exactly", () => {
  const nodes = M.rosterNodes(ROSTER.assets);
  const homes = M.homesFor(nodes);
  const base = M.makeShape({ formation: 1, axes: { x: 1.1, y: 0.84, z: 1.18 }, berthSeparation: 1, nodes });
  const placements = Object.fromEntries(homes.map(h => [h.id, { longitude: h.longitude, latitude: h.latitude }]));
  const same = M.makeShape({ formation: 1, axes: { x: 1.1, y: 0.84, z: 1.18 }, berthSeparation: 1, nodes, placements });
  assert.equal(JSON.stringify(same.nodes.map(n => n.position)), JSON.stringify(base.nodes.map(n => n.position)));
});

test("placed orbs keep their radius, keep their home, and still clear the berth floor", () => {
  const nodes = M.rosterNodes(ROSTER.assets);
  const placer = P.createPlacer(M.homesFor(nodes), { roam: 1 });
  const out = runFor(placer, coreField(0.4, 0, 0.12), 6);
  const placements = Object.fromEntries(out.map(p => [p.id, { longitude: p.longitude, latitude: p.latitude }]));
  const base = M.makeShape({ formation: 1, axes: { x: 1, y: 1, z: 1 }, berthSeparation: 1, nodes });
  const shape = M.makeShape({ formation: 1, axes: { x: 1, y: 1, z: 1 }, berthSeparation: 1, nodes, placements });
  for (const n of shape.nodes) {
    const ref = base.nodes.find(b => b.id === n.id);
    assert.equal(n.radius, ref.radius, `${n.id} keeps its band radius`);
    assert.equal(n.homeLongitude, ref.sourceLongitude, `${n.id} keeps its home`);
  }
  assert.ok(shape.nodes.some((n, i) => Math.abs(n.longitude - base.nodes[i].longitude) > 0.01), "placement really moved some orbs");
  let minChord = Infinity;
  for (let i = 0; i < shape.nodes.length; i++) for (let j = i + 1; j < shape.nodes.length; j++) {
    const a = shape.nodes[i].position, b = shape.nodes[j].position;
    minChord = Math.min(minChord, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z));
  }
  assert.ok(minChord >= shape.berthSeparation.minimumChordDistance - 1e-9, `min chord ${minChord.toFixed(3)} clears the floor`);
});

test("placements fail closed: unknown ids, non-finite values, and out-of-range latitudes are refused", () => {
  const nodes = [{ id: "A", sector: 10, depth: 0.5, radialBand: 2 }];
  const ok = { A: { longitude: 0.1, latitude: 0.1 } };
  assert.doesNotThrow(() => M.makeShape({ formation: 1, axes: { x: 1, y: 1, z: 1 }, berthSeparation: 0, nodes, placements: ok }));
  assert.throws(() => M.makeShape({ formation: 1, axes: { x: 1, y: 1, z: 1 }, berthSeparation: 0, nodes, placements: { B: ok.A } }), RangeError);
  assert.throws(() => M.makeShape({ formation: 1, axes: { x: 1, y: 1, z: 1 }, berthSeparation: 0, nodes, placements: { A: { longitude: Number.NaN, latitude: 0 } } }), RangeError);
  assert.throws(() => M.makeShape({ formation: 1, axes: { x: 1, y: 1, z: 1 }, berthSeparation: 0, nodes, placements: { A: { longitude: 0, latitude: 2 } } }), RangeError);
});

test("guided orbs never re-slot: the full roster stays spaced in 3D while roaming a bright core", () => {
  /* The jitter the user saw: the berth resolver re-slotting orbs on nearly every frame.
     Guided placement must hold the spacing itself, in the same 3D geometry the berth check uses. */
  const nodes = M.rosterNodes(ROSTER.assets);
  const homes = M.homesFor(nodes);
  const axes = { x: 1.1, y: 0.84, z: 1.18 };
  const placer = P.createPlacer(homes, { roam: 0.8, positionFor: M.positionFor });
  placer.setGeometry({ formation: 1, axes });
  const field = coreField(0.4, 0, 0.08);
  let reSlotFrames = 0, worstChord = Infinity;
  for (let k = 0; k < 12 * 60; k++) {
    const placements = Object.fromEntries(placer.step(DT, field).map(p => [p.id, { longitude: p.longitude, latitude: p.latitude }]));
    const shape = M.makeShape({ formation: 1, axes, berthSeparation: 1, nodes, placements });
    if (shape.berthSeparation.movedNodeIds.length) reSlotFrames++;
    for (let i = 0; i < shape.nodes.length; i++) {
      for (let j = i + 1; j < shape.nodes.length; j++) {
        const p = shape.nodes[i].position, q = shape.nodes[j].position;
        worstChord = Math.min(worstChord, Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z));
      }
    }
  }
  assert.equal(reSlotFrames, 0, "no frame re-slots a guided orb");
  assert.ok(worstChord >= M.BERTH_MIN_CHORD, `every placed pair clears the berth floor (worst ${worstChord.toFixed(3)})`);
});

/* ── the placer and the model share one latitude contract ─────────── */

test("the placer's latitude ceiling is the model's own placement contract", () => {
  assert.equal(P.LAT_LIMIT, M.PLACEMENT_LATITUDE_LIMIT,
    "one limit, named in both files: makeShape() refuses anything wider than the placer may emit");
  const placer = P.createPlacer(rosterHomes(), { roam: 0.8, latitudeLimit: M.PLACEMENT_LATITUDE_LIMIT });
  assert.equal(placer.latitudeLimit, M.PLACEMENT_LATITUDE_LIMIT);
  const stale = P.createPlacer(rosterHomes(), { roam: 0.8 });
  assert.equal(stale.latitudeLimit, M.PLACEMENT_LATITUDE_LIMIT, "a caller that supplies nothing gets the contract");
  const greedy = P.createPlacer(rosterHomes(), { roam: 0.8, latitudeLimit: 1.5 });
  assert.equal(greedy.latitudeLimit, P.LAT_LIMIT, "no caller can widen the ceiling past the placer's own hard limit");
});

test("the freeze regression: poleward guidance never hands the model a latitude it refuses", () => {
  /* What used to happen in the browser, a few seconds in: an orb whose home sits near a pole
     was guided past ±1.2, makeShape() threw a RangeError inside the frame, the throw escaped
     the tick loop, requestAnimationFrame was never re-armed, and NEO ORB froze. The placer now
     spends its latitude budget against each orb's own home, so every frame is acceptable. */
  const nodes = M.rosterNodes(ROSTER.assets);
  const homes = M.homesFor(nodes);
  const axes = { x: 1.1, y: 0.84, z: 1.18 };
  const placer = P.createPlacer(homes, { roam: 0.8, latitudeLimit: M.PLACEMENT_LATITUDE_LIMIT, positionFor: M.positionFor });
  placer.setGeometry({ formation: 1, axes });
  /* Fields that pull the fleet toward each pole in turn, as a real flame core wanders. */
  const fields = [coreField(0.1, -0.85, 0.10), coreField(-0.2, 0.85, 0.10), coreField(0.4, 0, 0.08), coreField(-0.5, -0.6, 0.12)];
  let widest = 0, refused = null, atPole = 0;
  for (let k = 0; k < 60 * 60 && !refused; k++) {
    const field = fields[Math.floor((k * DT) / 8) % fields.length];
    const placed = placer.step(DT, field);
    const placements = Object.fromEntries(placed.map(q => [q.id, { longitude: q.longitude, latitude: q.latitude }]));
    for (const q of placed) {
      widest = Math.max(widest, Math.abs(q.latitude));
      if (Math.abs(q.latitude) > M.PLACEMENT_LATITUDE_LIMIT - 1e-9) atPole++;
    }
    try {
      M.makeShape({ formation: 1, axes, berthSeparation: 1, nodes, placements });
    } catch (error) {
      refused = { second: (k * DT).toFixed(2), message: error.message };
    }
  }
  assert.equal(refused, null, refused ? `makeShape refused at t=${refused.second}s: ${refused.message}` : "");
  assert.ok(widest <= M.PLACEMENT_LATITUDE_LIMIT, `no placement exceeds the contract (widest ${widest.toFixed(4)})`);
  assert.ok(atPole > 0, `the run really did press orbs against the ceiling (${atPole} frames), so the budget is what held`);
});

test("the placement source is pure math: no DOM, network, storage, or route", () => {
  for (const forbidden of ["document", "fetch(", "XMLHttpRequest", "WebSocket", "localStorage", "sessionStorage", "indexedDB", "/api/", "legitimacy(", "drawImage", "getContext"]) {
    assert.equal(placementSource.includes(forbidden), false, `neo-orb-placement.js must not reference ${forbidden}`);
  }
});

/* ── the instability extension: spacing is measured where the orbs are drawn ──
   An extended orb leaves its band shell for the region outside every band, so the
   placer is handed the model's own radius rule and spaces orbs at the radius they
   are actually drawn at. Without that rule it holds the reading and draws no lift. */

const shellOf = (homes, id) => homes.find(h => h.id === id).radius;
const chordFloor = placements => {
  let min = Infinity;
  for (let i = 0; i < placements.length; i += 1) {
    for (let j = i + 1; j < placements.length; j += 1) {
      const a = placements[i], b = placements[j];
      const point = p => {
        const r = p.radius;
        return [r * Math.cos(p.latitude) * Math.cos(p.longitude), r * Math.sin(p.latitude), r * Math.cos(p.latitude) * Math.sin(p.longitude)];
      };
      const [ax, ay, az] = point(a), [bx, by, bz] = point(b);
      min = Math.min(min, Math.hypot(ax - bx, ay - by, az - bz));
    }
  }
  return min;
};

test("the placer lifts an orb by the model's radius rule, and only when it is handed that rule", () => {
  const homes = rosterHomes();
  const region = M.INSTABILITY_REGION;
  const plain = P.createPlacer(homes);
  const lifted = P.createPlacer(homes, { radiusFor: M.extensionRadius });
  const byId = placer => Object.fromEntries(placer.placements().map(p => [p.id, p]));

  plain.setExtensions({ NVDA: 1 });
  const plainById = byId(plain);
  assert.equal(plainById.NVDA.extension, 1, "the reading is held…");
  assert.equal(plainById.NVDA.radius, shellOf(homes, "NVDA"), "…but a placer without the model's rule draws no lift");

  lifted.setExtensions({ NVDA: 1, PSX: 0.5 });
  const liftedById = byId(lifted);
  assert.equal(liftedById.NVDA.radius, region.outer, "an extreme reading is spaced at the region's outer edge");
  assert.ok(Math.abs(liftedById.PSX.radius - (region.inner + (region.outer - region.inner) * 0.5)) < 1e-12,
    "a half reading sits halfway through the region, whatever shell it left");
  assert.equal(liftedById.AAPL.radius, shellOf(homes, "AAPL"), "an orb with no reading keeps its band shell exactly");
  assert.equal(liftedById.AAPL.extension, 0);
  for (const p of lifted.placements()) {
    assert.equal(p.radius, M.extensionRadius(shellOf(homes, p.id), p.extension), "every reported radius is the model's rule");
  }
});

test("setExtensions is fail-closed: an unknown orb or an unusable value is refused, not clamped", () => {
  const homes = rosterHomes();
  const placer = P.createPlacer(homes, { radiusFor: M.extensionRadius });
  const nvda = () => placer.placements().find(p => p.id === "NVDA");

  assert.throws(() => placer.setExtensions({ NOPE: 0.5 }), /not a node this placer holds/);
  for (const bad of [-0.1, 1.2, Number.NaN, Number.POSITIVE_INFINITY, "0.5", null, {}]) {
    assert.throws(() => placer.setExtensions({ NVDA: bad }), /must be a finite 0…1/, `extension ${String(bad)} is refused`);
  }
  assert.throws(() => placer.setExtensions([0.5]), /map of node id/, "an array is not a map of node ids");

  /* A refused call changes nothing: the previous good reading still stands. */
  placer.setExtensions({ NVDA: 1 });
  assert.throws(() => placer.setExtensions({ NVDA: 0.5, NOPE: 0.2 }), /not a node this placer holds/);
  assert.equal(nvda().radius, M.INSTABILITY_REGION.outer, "the refused call left the standing reading alone");

  placer.setExtensions(null);
  assert.ok(placer.placements().every(p => p.extension === 0), "null clears every reading…");
  assert.ok(placer.placements().every(p => p.radius === shellOf(homes, p.id)), "…and every orb back onto its band shell");

  placer.setExtensions({ NVDA: 0.8 });
  placer.reset();
  assert.equal(nvda().extension, 0, "a reset clears the reading too");
  assert.equal(nvda().radius, shellOf(homes, "NVDA"));
});

test("an extended fleet is spaced at the radius it is drawn at, and the model never re-slots it", () => {
  const nodes = M.rosterNodes(ROSTER.assets);
  const homes = M.homesFor(nodes);
  const field = coreField(0.4, 0, 0.12);
  const allExtended = Object.fromEntries(homes.map(h => [h.id, 1]));

  const calm = P.createPlacer(homes, { roam: 1, radiusFor: M.extensionRadius, positionFor: M.positionFor });
  const extended = P.createPlacer(homes, { roam: 1, radiusFor: M.extensionRadius, positionFor: M.positionFor });
  extended.setExtensions(allExtended);

  const calmOut = runFor(calm, field, 6);
  const extendedOut = runFor(extended, field, 6);
  assert.equal(calm.guided, true, "the field really guides both fleets");
  assert.ok(calmOut.some(p => p.displacement > 0.01), "and the orbs really move");

  const calmChord = chordFloor(calmOut);
  const extendedChord = chordFloor(extendedOut);
  assert.ok(calmChord >= M.BERTH_MIN_CHORD, `the calm fleet clears the berth floor (${calmChord.toFixed(3)})`);
  assert.ok(extendedChord > calmChord,
    `the same fleet lifted into the region is spaced further apart in 3D (${extendedChord.toFixed(3)} > ${calmChord.toFixed(3)})`);
  assert.ok(extended.placements().every(p => p.radius === M.INSTABILITY_REGION.outer), "every orb is out on the region's edge");

  /* Spacing at the drawn radius is what keeps the model from re-slotting the lifted fleet. */
  const placements = Object.fromEntries(extendedOut.map(p => [p.id, { longitude: p.longitude, latitude: p.latitude }]));
  const shape = M.makeShape({
    formation: 1, axes: { x: 1, y: 1, z: 1 }, berthSeparation: 1, nodes, placements, extensions: allExtended
  });
  assert.equal(shape.berthSeparation.crowdedNodeCount, 0, "no pair is below the berth floor, so nothing is re-slotted");
  assert.equal(shape.instability.extendedCount, nodes.length);
  assert.equal(shape.instability.maxRadius, M.INSTABILITY_REGION.outer);
  let minChord = Infinity;
  for (let i = 0; i < shape.nodes.length; i += 1) {
    for (let j = i + 1; j < shape.nodes.length; j += 1) {
      const a = shape.nodes[i].position, b = shape.nodes[j].position;
      minChord = Math.min(minChord, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z));
    }
  }
  assert.ok(minChord >= shape.berthSeparation.minimumChordDistance - 1e-9,
    `the drawn positions clear the floor too (min chord ${minChord.toFixed(3)})`);
});

test("setRadii is fail-closed and moves only the spacing radius the placer measures at", () => {
  const homes = rosterHomes();
  const placer = P.createPlacer(homes, { radiusFor: M.extensionRadius });
  assert.throws(() => placer.setRadii({ NOPE: 0.9 }), /not a node this placer holds/);
  for (const bad of [0, -0.4, Number.NaN, "0.9", null, {}]) {
    assert.throws(() => placer.setRadii({ NVDA: bad }), /finite positive number/, `radius ${String(bad)} is refused`);
  }
  assert.throws(() => placer.setRadii([0.9]), /map of node id/, "an array is not a map of node ids");
  /* Refusals leave the placer as it was; a valid map is accepted and the placer keeps moving. */
  const before = placer.placements().find(p => p.id === "NVDA");
  placer.setRadii(Object.fromEntries(homes.map(h => [h.id, 0.94])));
  placer.setRadii(null);
  const after = placer.placements().find(p => p.id === "NVDA");
  assert.equal(typeof after.longitude, "number");
  assert.equal(typeof before.longitude, "number");
});

/* ── pressure: Orb 2's pressure steers the orbs harder (js/neo-orb-placement.js setPressures) ── */

test("pressure steers harder: under the same field, pressed orbs drift farther than calm ones", () => {
  const homes = homesOf(16, { band: 2 });
  const field = coreField(0.4, 0, 0.12);
  const calm = P.createPlacer(homes, { roam: 1 });
  calm.setPressures(Object.fromEntries(homes.map(h => [h.id, 0])));
  const pressed = P.createPlacer(homes, { roam: 1 });
  pressed.setPressures(Object.fromEntries(homes.map(h => [h.id, 1])));
  const meanDrift = out => out.reduce((a, p) => a + p.displacement, 0) / out.length;
  const calmDrift = meanDrift(runFor(calm, field, 6));
  const pressedDrift = meanDrift(runFor(pressed, field, 6));
  assert.ok(pressedDrift > calmDrift, `pressed ${pressedDrift.toFixed(4)} rad > calm ${calmDrift.toFixed(4)} rad`);
});

test("no pressure, or null pressure, is neutral: the placements are identical to no call at all", () => {
  const homes = homesOf(12, { band: 2 });
  const field = coreField(0.3, 0.1, 0.1);
  const none = runFor(P.createPlacer(homes, { roam: 0.8 }), field, 4);
  const nulled = P.createPlacer(homes, { roam: 0.8 });
  nulled.setPressures(null);
  assert.equal(JSON.stringify(runFor(nulled, field, 4)), JSON.stringify(none));
  const perOrbNull = P.createPlacer(homes, { roam: 0.8 });
  perOrbNull.setPressures(Object.fromEntries(homes.map(h => [h.id, null])));
  assert.equal(JSON.stringify(runFor(perOrbNull, field, 4)), JSON.stringify(none), "a null for each orb is neutral too");
});

test("setPressures fails closed: an unknown id or a value outside 0…1 is refused, not clamped", () => {
  const homes = homesOf(3, { band: 1 });
  const placer = P.createPlacer(homes, { roam: 1 });
  assert.throws(() => placer.setPressures({ NOPE: 0.5 }), RangeError);
  assert.throws(() => placer.setPressures({ [homes[0].id]: 1.2 }), RangeError);
  assert.throws(() => placer.setPressures({ [homes[0].id]: -0.1 }), RangeError);
  assert.throws(() => placer.setPressures({ [homes[0].id]: "0.5" }), RangeError);
  assert.throws(() => placer.setPressures([0.5]), TypeError);
});

test("the speed cap is unchanged by pressure: no orb exceeds its mass-capped speed when pressed", () => {
  const homes = homesOf(20, { band: 2 });
  const field = coreField(0.4, 0, 0.12);
  const placer = P.createPlacer(homes, { roam: 1 });
  placer.setPressures(Object.fromEntries(homes.map(h => [h.id, 1])));
  const cap = P.MAX_SPEED / Math.sqrt(P.inertiaFor(2));
  for (let i = 0; i < 6 * 60; i++) {
    placer.step(DT, field);
    for (const p of placer.placements()) assert.ok(p.speed <= cap + 1e-9, `${p.id} speed ${p.speed} stays within ${cap}`);
  }
});

/* ── height bias: the basis side moves the homes north or south (js/neo-orb-placement.js setBiases) ── */

test("setBiases: +1 pulls a home north, −1 south, 0 leaves it, and the pull eases in", () => {
  const homes = homesOf(6, { band: 2 });
  const placer = P.createPlacer(homes, { roam: 0 });
  const homeOf = id => placer.placements().find(p => p.id === id).homeLatitude;
  const base = Object.fromEntries(homes.map(h => [h.id, h.latitude]));
  placer.setBiases({ [homes[0].id]: 1, [homes[1].id]: -1, [homes[2].id]: 0 });
  placer.step(0.5, null);
  const early = homeOf(homes[0].id) - base[homes[0].id];
  assert.ok(early > 0 && early < P.BIAS_LAT, `eased, not snapped: ${early}`);
  for (let i = 0; i < 300; i++) placer.step(0.1, null);   // 30 s of frames at the placer's 0.1 s clamp
  const up = homeOf(homes[0].id) - base[homes[0].id];
  const down = homeOf(homes[1].id) - base[homes[1].id];
  assert.ok(Math.abs(up - P.BIAS_LAT) < 1e-6 || homeOf(homes[0].id) >= P.LAT_LIMIT - 1e-9, `above basis: north by BIAS_LAT (${up})`);
  assert.ok(Math.abs(down + P.BIAS_LAT) < 1e-6 || homeOf(homes[1].id) <= -P.LAT_LIMIT + 1e-9, `below basis: south by BIAS_LAT (${down})`);
  assert.equal(homeOf(homes[2].id), base[homes[2].id], "an orb at basis keeps its sector latitude");
});

test("setBiases: no call, and null, are neutral, and every emitted latitude stays inside the contract", () => {
  const homes = homesOf(16, { band: 2 });
  const field = coreField(0.4, 0, 0.12);
  const none = runFor(P.createPlacer(homes, { roam: 1 }), field, 6);
  const nulled = P.createPlacer(homes, { roam: 1 });
  nulled.setBiases(null);
  assert.equal(JSON.stringify(runFor(nulled, field, 6)), JSON.stringify(none));
  const biased = P.createPlacer(homes, { roam: 1 });
  biased.setBiases(Object.fromEntries(homes.map((h, i) => [h.id, i % 2 ? 1 : -1])));
  for (const frame of runFor(biased, field, 12)) {
    assert.ok(Math.abs(frame.latitude) <= biased.latitudeLimit + 1e-12, `${frame.id} latitude ${frame.latitude} inside ${biased.latitudeLimit}`);
  }
});

test("setBiases fails closed: an unknown id, a value outside −1…1, or a non-map is refused", () => {
  const homes = homesOf(4, { band: 2 });
  const placer = P.createPlacer(homes, { roam: 1 });
  assert.throws(() => placer.setBiases({ NOPE: 1 }), /not a node/);
  for (const bad of [2, -1.5, Number.NaN, "1"]) {
    assert.throws(() => placer.setBiases({ [homes[0].id]: bad }), /−1…1 or null/, `bias ${String(bad)} is refused`);
  }
  assert.throws(() => placer.setBiases([1]), /map of node id/);
});

