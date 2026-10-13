/* NEO ORB — Black Hole Computing (js/neo-orb-black-hole.js) and Quasar Mode (js/neo-orb-quasar.js),
   deployed from docs/harshal-systems/12-ground-zero.md.

   Each spec invariant is asserted here: capability only, bound by the host PDH, no stored text
   passed through, outward only, non-prioritised, stateless, and fixed labels. The numbers are
   hand-computed from small synthetic readings. Colour, placement, and motion never read either
   module. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

const readText = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const signalsSource = await readText("js/neo-orb-signals.js");
const bhcSource = await readText("js/neo-orb-black-hole.js");
const quasarSource = await readText("js/neo-orb-quasar.js");
const reinsuranceSource = await readText("js/neo-orb-reinsurance.js");

function load(source, name) {
  const context = { module: { exports: {} }, globalThis: {} };
  vm.runInNewContext(source, context, { filename: name });
  return context.module.exports;
}
const S = load(signalsSource, "neo-orb-signals.js");
const BHC = load(bhcSource, "neo-orb-black-hole.js");
const Q = load(quasarSource, "neo-orb-quasar.js");
const R = load(reinsuranceSource, "neo-orb-reinsurance.js");

/* A symmetric ladder: every envelope at the same ratio, so the close's depth is exact. */
function ladder(basis, ratio) {
  const out = {};
  for (const level of [236, 382, 500, 618, 764, 1000]) {
    out["upper" + level] = basis * Math.exp(Math.log(ratio) * (level / 1000));
    out["lower" + level] = basis / Math.exp(Math.log(ratio) * (level / 1000));
  }
  return out;
}
/* A stored market row at a given close on a ratio-2 ladder: depth = mean of min(|c|,1). */
const row = (close, extra = {}) => ({ basis: 100, bands: ladder(100, 2), latestBar: { close }, changePct: 1, vfi: { value: 5, signal: 3, available: true }, ...extra });
const comp = (composedPosition, extra = {}) => ({ schema: "gi-orb2-scale-composition-v1", composedPosition, forceMultiplier: 1, freshness: 1, status: "composed", ...extra });

/* Readings with exact depths and pressures, for the Quasar arithmetic. */
function readingsOf(list) {
  const readings = new Map();
  list.forEach(([id, depth, pressure]) => readings.set(id, { depth, pressure, components: null, position: null, flow: "unavailable", pressureTerms: {}, forceMultiplier: 1, authority: "none" }));
  return { engaged: true, reason: null, total: list.length, measured: list.filter(([, d]) => d !== null).length, readings };
}

test("Black Hole Computing engages only where the host declares no authority (spec §8)", () => {
  assert.equal(BHC.engage(BHC.NEO_ORB_HOST).engaged, true, "the NEO ORB display host carries no authority");
  assert.equal(BHC.engage(null).engaged, false, "no host declaration, no engagement");
  assert.equal(BHC.engage({ authority: "decision" }).engaged, false, "a host that declares authority refuses BHC");
  assert.match(BHC.engage({ authority: "decision" }).reason, /bound by the host PDH/);
  assert.equal(BHC.SPEC.authority, "none");
  assert.equal(BHC.SPEC.phase, "unchanged", "BHC does not change a declared phase");
});

test("deepen gives one reading per orb with depth, position, flow, and pressure; missing depth is null, never neutral", () => {
  const records = new Map([
    ["AAA", row(100)],                                   // at the basis: depth 0
    ["BBB", row(400)],                                   // beyond every envelope: depth 1
    ["CCC", { basis: 100, latestBar: { close: 100 } }]   // no ladder: unmeasured
  ]);
  const compositions = new Map([["AAA", comp(0.5)], ["BBB", comp(1)]]);
  const result = BHC.deepen(records, compositions, S);
  assert.equal(result.engaged, true);
  assert.equal(result.total, 3);
  assert.equal(result.measured, 2, "the orb with no ladder is not counted as measured");
  assert.equal(result.readings.get("AAA").depth, 0);
  assert.equal(result.readings.get("BBB").depth, 1);
  assert.equal(result.readings.get("BBB").position, 1);
  assert.equal(result.readings.get("CCC").depth, null, "unmeasured stays null");
  assert.equal(result.readings.get("CCC").position, null, "no composition stays null");
  assert.equal(result.readings.get("AAA").flow, "above", "VFI 5 against signal 3 is above");
  for (const reading of result.readings.values()) {
    assert.equal(reading.authority, "none", "every reading carries authority none");
    assert.ok(Number.isFinite(reading.pressure) && reading.pressure >= 0 && reading.pressure <= 1, "pressure is 0…1");
  }
});

test("a reading holds numbers and state names only: stored text and any recommendation field are never passed through", () => {
  const records = new Map([["AAA", row(150, { latestBar: { close: 150, note: "buy now, recommend" } })]]);
  const compositions = new Map([["AAA", comp(0.9, { reason: "should sell", status: "composed" })]]);
  const result = BHC.deepen(records, compositions, S);
  const text = JSON.stringify([...result.readings.values()]);
  for (const word of ["buy", "recommend", "should", "sell"]) assert.equal(text.includes(word), false, `no reading carries "${word}"`);
  assert.deepEqual(Object.keys(result.readings.get("AAA")).sort(), ["authority", "components", "depth", "flow", "forceMultiplier", "position", "pressure", "pressureTerms"].sort());
});

test("deepen does not change the stored rows it reads", () => {
  const records = new Map([["AAA", row(150)]]);
  const before = JSON.stringify([...records]);
  BHC.deepen(records, new Map([["AAA", comp(0.7)]]), S);
  assert.equal(JSON.stringify([...records]), before);
});

test("a host that declares authority, a missing signals module, or a non-map gives no readings", () => {
  const records = new Map([["AAA", row(150)]]);
  const refused = BHC.deepen(records, null, S, { authority: "decision" });
  assert.equal(refused.engaged, false);
  assert.equal(refused.readings.size, 0);
  assert.equal(BHC.deepen(records, null, null).engaged, false);
  assert.equal(BHC.deepen({ AAA: row(150) }, null, S).engaged, false, "a plain object is not a roster");
});

test("Quasar Mode aggregates hand-computed roster numbers: distribution, interval, tail, dispersion, coverage", () => {
  // depths 0.2, 0.4, 0.6, 1.0 and one unmeasured orb; pressures 0.1, 0.7, 0.6, 0.2 and 0.3.
  const result = Q.spheroid(readingsOf([["A", 0.2, 0.1], ["B", 0.4, 0.7], ["C", 0.6, 0.6], ["D", 1.0, 0.2], ["E", null, 0.3]]));
  assert.equal(result.engaged, true);
  assert.equal(result.measured, 4);
  assert.equal(result.total, 5);
  assert.deepEqual(Array.from(result.distribution, b => b.count), [0, 1, 1, 1, 1], "each depth lands in one fixed band; 1.0 is in the top band");
  assert.ok(Math.abs(result.meanDepth - 0.55) < 1e-9, "mean depth 0.55");
  assert.ok(Math.abs(result.interval.lo - 0.215265) < 0.0005, "95% interval low bound");
  assert.ok(Math.abs(result.interval.hi - 0.884735) < 0.0005, "95% interval high bound");
  assert.equal(result.tail.depth.count, 1, "one orb at or beyond depth 0.8");
  assert.equal(result.tail.depth.share, 0.25);
  assert.equal(result.tail.pressure.count, 2, "two orbs at or above pressure 0.6 (0.7 and 0.6)");
  assert.equal(result.tail.pressure.share, 0.4, "the pressure share is over the five orbs with a pressure");
  assert.equal(result.fragility.unmeasured, 1);
  assert.equal(result.fragility.coverage, 0.8);
  assert.ok(result.fragility.dispersion > 0.34 && result.fragility.dispersion < 0.35, "sample standard deviation");
});

test("Quasar Mode does not depend on the order of the roster (radial symmetry, spec §3.1)", () => {
  const list = [["A", 0.1, 0.9], ["B", 0.5, 0.2], ["C", 0.8, 0.4], ["D", null, 0.1]];
  const forward = Q.spheroid(readingsOf(list));
  const reversed = Q.spheroid(readingsOf([...list].reverse()));
  /* Summing in another order can change the last binary digit, so the numbers are compared to 9 places. */
  const settle = value => JSON.parse(JSON.stringify(value), (key, v) => (typeof v === "number" ? Math.round(v * 1e9) / 1e9 : v));
  assert.deepEqual(settle(reversed), settle(forward));
});

test("Quasar Mode returns no symbol, rank, order, priority, or action (spec §6 and §7)", () => {
  const result = Q.spheroid(readingsOf([["NVDA", 0.9, 0.8], ["AAPL", 0.1, 0.1]]));
  const text = JSON.stringify(result);
  assert.equal(text.includes("NVDA"), false, "no symbol is returned");
  assert.equal(text.includes("AAPL"), false, "no symbol is returned");
  for (const key of ["rank", "order", "priority", "action", "recommend", "remedy", "reserve"]) {
    assert.equal(text.toLowerCase().includes(`"${key}`), false, `no ${key} field`);
  }
  assert.equal(result.prioritised, false);
  assert.equal(result.persists, false, "nothing is persisted: no learned preference (spec §5)");
  assert.equal(result.orientation, "outward");
  assert.equal(result.authority, "none");
});

test("with fewer than two measured orbs the interval and the dispersion are null, not invented", () => {
  const one = Q.spheroid(readingsOf([["A", 0.5, 0.2]]));
  assert.equal(one.interval, null);
  assert.equal(one.fragility.dispersion, null);
  assert.equal(one.meanDepth, 0.5);
  const none = Q.spheroid(readingsOf([["A", null, 0.2]]));
  assert.equal(none.measured, 0);
  assert.equal(none.meanDepth, null);
  assert.equal(none.tail.depth.share, null);
  assert.equal(none.fragility.coverage, 0);
});

test("Quasar Mode refuses to aggregate what was not engaged", () => {
  const refused = Q.spheroid(BHC.deepen(new Map(), null, S, { authority: "decision" }));
  assert.equal(refused.engaged, false);
  assert.equal(refused.meanDepth, undefined, "no aggregate is returned when BHC was not engaged");
  assert.equal(Q.spheroid(null).engaged, false);
});

test("the readable text uses fixed labels and numbers, with no prescription", () => {
  const quasar = Q.describe(Q.spheroid(readingsOf([["A", 0.2, 0.1], ["B", 0.6, 0.7]])));
  const bhc = BHC.describe(BHC.deepen(new Map([["A", row(150)]]), null, S));
  const reading = BHC.readingText(BHC.deepen(new Map([["A", row(150)]]), new Map([["A", comp(0.8)]]), S).readings.get("A"));
  for (const text of [quasar, bhc, reading]) {
    for (const word of ["should", "recommend", "buy", "sell", "reduce", "increase", "must"]) {
      assert.equal(text.toLowerCase().includes(word), false, `"${text}" must not contain "${word}"`);
    }
  }
  assert.match(quasar, /^spheroid · outward · 2 of 2 measured/);
  assert.match(bhc, /phase unchanged/);
});

test("the two modules reference no forbidden channel (the NEO ORB boundary)", () => {
  for (const [name, source] of [["neo-orb-black-hole.js", bhcSource], ["neo-orb-quasar.js", quasarSource], ["neo-orb-reinsurance.js", reinsuranceSource]]) {
    for (const forbidden of ["http://", "https://", "fetch(", "XMLHttpRequest", "WebSocket", "localStorage", "sessionStorage", "indexedDB", "HOS.", "legitimacy(", "/api/", "getContext", "drawImage"]) {
      assert.equal(source.includes(forbidden), false, `${name} must not reference ${forbidden}`);
    }
  }
});

test("outward only: colour, placement, motion, and the model never read Black Hole Computing or Quasar Mode", async () => {
  for (const file of ["js/neo-orb-market.js", "js/neo-orb-placement.js", "js/neo-orb-model.js", "js/neo-orb-signals.js", "js/neo-orb-field.js", "js/market-extension.js"]) {
    const source = await readText(file);
    for (const token of ["NeoOrbBlackHole", "NeoOrbQuasar", "indexGravity", "bhc", "quasar", "spheroid("]) {
      assert.equal(source.includes(token), false, `${file} must not reference ${token}`);
    }
  }
  const app = await readText("js/apps-neo-orb.js");
  const toneFor = app.slice(app.indexOf("    toneFor(id) {"), app.indexOf("    /* One readable line"));
  assert.ok(toneFor.length > 0, "toneFor is found");
  for (const token of ["bhc", "quasar", "gravity"]) assert.equal(toneFor.toLowerCase().includes(token), false, `toneFor must not read ${token}`);
  const placement = app.slice(app.indexOf("    /* Rebuild the model's homes"), app.indexOf("    /* Rebuild the model's homes") + 1200);
  assert.equal(/this\.(bhc|quasar)/.test(placement), false, "the radius sync does not read the gravity readings");
});

test("the spec's constants are carried as declared", () => {
  assert.equal(Q.SPEC.orientation, "outward");
  assert.equal(Q.SPEC.authority, "none");
  assert.equal(Q.SPEC.prioritised, false);
  assert.equal(Q.SPEC.persists, false);
  assert.equal(Q.SPEC.deployability, "conditional (structural role only)");
  assert.equal(BHC.SPEC.deployability, "context-dependent, bound by the host PDH");
  assert.equal(BHC.SPEC.normative, "non-normative, capability-only");
});

/* ── Reinsurance Mode: a spheroid of spheroids (js/neo-orb-reinsurance.js) ──────────── */

const buffer = (measured, meanDepth, lo, hi, tailShare) => ({
  engaged: true, measured, total: measured + 1, meanDepth, interval: { lo, hi }, tail: { depth: { share: tailShare } }
});

test("Reinsurance takes Quasar buffers, counts only buffers with two measured orbs, and says what is unmeasured", () => {
  const buffers = [
    buffer(4, 0.9, 0.85, 0.92, 0.75),   // deep, tail deep
    buffer(3, 0.2, 0.1, 0.3, 0),        // calm
    buffer(1, 0.5, 0.4, 0.6, 0.5),      // one measured orb: not a buffer
    { engaged: false, reason: "no stored rows read" }
  ];
  const r = R.systemic(buffers);
  assert.equal(r.engaged, true);
  assert.equal(r.buffers.total, 4);
  assert.equal(r.buffers.measured, 2);
  assert.equal(r.buffers.coverage, 0.5);
  assert.equal(r.envelope.lo, 0.1, "the envelope low over the buffers, to tenths");
  assert.equal(r.envelope.hi, 0.9, "the envelope high over the buffers, to tenths");
  assert.equal(r.deepBuffers.count, 1, "one buffer at or beyond depth 0.8");
  assert.equal(r.deepBuffers.share, 0.5);
  assert.equal(r.synchrony, 0.5, "one of two buffers has a deep tail: synchrony of one half");
  assert.equal(r.meanDepth, 0.6, "the mean of buffer means (0.55) to tenths");
  assert.equal(r.spread, 0.5, "the spread of buffer means (0.495) to tenths");
});

test("Reinsurance is coarse and non-binding: every share and envelope is rounded to tenths", () => {
  const r = R.systemic([buffer(2, 0.83, 0.7, 0.9, 0.61), buffer(2, 0.37, 0.2, 0.5, 0.1), buffer(5, 0.61, 0.5, 0.7, 0.55)]);
  for (const value of [r.synchrony, r.meanDepth, r.spread, r.envelope.lo, r.envelope.hi, r.deepBuffers.share, r.buffers.coverage]) {
    assert.ok(value === null || Math.abs(value * 10 - Math.round(value * 10)) < 1e-9, `${value} is a tenth`);
  }
});

test("with no buffer that has enough measured orbs, Reinsurance is not engaged and invents no envelope", () => {
  const none = R.systemic([{ engaged: true, measured: 1, meanDepth: 0.5, tail: { depth: { share: 1 } } }]);
  assert.equal(none.engaged, false);
  assert.equal(none.envelope, null);
  assert.equal(none.synchrony, null, "no synchrony is claimed without a buffer");
  assert.match(R.describe(none), /not engaged .* · held$/);
  assert.equal(R.systemic(null).engaged, false, "a missing list is not a reading");
});

test("Reinsurance does not depend on the order of its buffers", () => {
  const list = [buffer(3, 0.9, 0.8, 0.95, 0.6), buffer(4, 0.3, 0.2, 0.4, 0.1), buffer(2, 0.6, 0.5, 0.7, 0.5)];
  assert.deepEqual(R.systemic([...list].reverse()), R.systemic(list));
});

test("the slow cadence: a read is due before the first one and then only after the spec's long interval", () => {
  const every = R.UPDATE_EVERY_MS;
  assert.equal(every, 15 * 60 * 1000, "the slow update interval is fifteen minutes");
  assert.equal(R.due(null, 1000), true, "the first read is always due");
  assert.equal(R.due(1000, 1000 + every - 1), false, "held between slow updates");
  assert.equal(R.due(1000, 1000 + every), true, "due at the interval");
});

test("Reinsurance returns no symbol, rank, order, priority, or remedy, and its text carries no prescription", () => {
  const r = R.systemic([buffer(2, 0.9, 0.8, 0.95, 0.8), buffer(2, 0.1, 0.05, 0.2, 0)]);
  const text = JSON.stringify(r);
  for (const key of ["rank", "order", "priority", "action", "recommend", "remedy", "reserve", "symbol"]) {
    assert.equal(text.toLowerCase().includes(`"${key}`), false, `no ${key} field`);
  }
  assert.equal(r.prioritised, false);
  assert.equal(R.SPEC.orientation, "outward");
  assert.equal(R.SPEC.authority, "none");
  const line = R.describe(r);
  assert.match(line, /^meta-spheroid · outward · slow, coarse, non-binding/);
  assert.match(line, /snapshot, not a forecast$/);
  for (const word of ["should", "recommend", "buy", "sell", "reduce", "increase", "must", "emergency"]) {
    assert.equal(line.toLowerCase().includes(word), false, `"${line}" must not contain "${word}"`);
  }
});

test("outward only: Reinsurance output is never read by colour, placement, the model, or the market", async () => {
  for (const file of ["js/neo-orb-market.js", "js/neo-orb-placement.js", "js/neo-orb-model.js", "js/neo-orb-signals.js", "js/neo-orb-field.js"]) {
    const source = await readText(file);
    for (const token of ["NeoOrbReinsurance", "reinsurance", "systemic("]) {
      assert.equal(source.includes(token), false, `${file} must not reference ${token}`);
    }
  }
  const app = await readText("js/apps-neo-orb.js");
  const toneFor = app.slice(app.indexOf("    toneFor(id) {"), app.indexOf("    /* One readable line"));
  assert.equal(toneFor.toLowerCase().includes("reinsurance"), false, "toneFor does not read Reinsurance");
  const pressure = app.slice(app.indexOf("    syncPressures() {"), app.indexOf("    /* How lit an orb is"));
  assert.equal(pressure.toLowerCase().includes("reinsurance"), false, "the pressure sync does not read Reinsurance");
});
