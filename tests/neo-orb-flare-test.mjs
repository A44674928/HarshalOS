/* NEO ORB — Flare (js/neo-orb-flare.js).

   The flare is display motion over numbers the other modules already published,
   so what is under test is not its arithmetic but its boundaries:

     · pure — it loads with no DOM, no window, no network, no storage
     · outward only — it returns numbers and colours and reads nothing back
     · non-prioritised — an orb's flare comes from that orb's own reading, never
       from a share, a mean, its neighbours, or its position in a list
     · radially symmetric at the roster level — the jets are bipolar on a
       drifting axis, so no sector is ever the one they point at
     · frozen is a state, not a blank — a stopped clock (prefers-reduced-motion)
       still yields drawable numbers
     · colour that cannot be misread as market state

   The module is loaded in a bare vm context, so any accidental reach for
   `window` or `document` is a test failure rather than a runtime surprise. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

const readText = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const flareSource = await readText("js/neo-orb-flare.js");

function load(source, name) {
  const context = { module: { exports: {} }, globalThis: {} };
  vm.runInNewContext(source, context, { filename: name });
  return context.module.exports;
}
const F = load(flareSource, "neo-orb-flare.js");

/* The market palette the flare must stay outside, or motion reads as state. */
const MARKET_COLOURS = Object.freeze({
  rallying: "#00c8ff", sinking: "#ff7a00", neutral: "#b0b0b0",
  basisAbove: "#fff200", basisBelow: "#b026ff", basisEqual: "#6b7280",
  band: "#7d93b8"
});

const reading = (depth, pressure) => ({ depth, pressure });
const quasar = (share, measured = 4) => ({
  engaged: true, measured, total: measured,
  meanDepth: 0.5, interval: { lo: 0.4, hi: 0.6 },
  tail: { depth: { threshold: 0.8, count: 1, share }, pressure: { threshold: 0.6, count: 1, share: 0 } }
});
const reinsurance = synchrony => ({ engaged: true, synchrony, buffers: { total: 6, measured: 6, coverage: 1 } });

test("flare loads with no DOM, no window, and no network", () => {
  /* The vm context above has none of them: getting here at all is the assertion. */
  assert.equal(typeof F.quasarJets, "function");
  assert.equal(typeof F.reinsuranceFlare, "function");
  assert.equal(typeof F.orbFlare, "function");
  assert.equal(F.SPEC.authority, "none");
  assert.equal(F.SPEC.prioritised, false);
  assert.equal(F.SPEC.persists, false);
  /* `typeof window` in the UMD wrapper is every module's house pattern; what
     must not appear is a DOM read, a clock of its own, or a network call. */
  const forbidden = /document\.|window\.|localStorage|sessionStorage|\bnavigator\.|fetch\s*\(|Date\.now|Math\.random|requestAnimationFrame/;
  assert.ok(!forbidden.test(flareSource),
    "the flare touches no DOM, clock, or network of its own — the clock is the caller's");
});

test("the same inputs give the same flare, every time", () => {
  const a = F.orbFlare(reading(0.9, 0.7), 12.5, 0.25);
  const b = F.orbFlare(reading(0.9, 0.7), 12.5, 0.25);
  assert.deepEqual(a, b);
  const jetsA = F.quasarJets(quasar(0.5), 8);
  const jetsB = F.quasarJets(quasar(0.5), 8);
  assert.deepEqual(jetsA, jetsB);
});

test("an orb's flare comes from its own reading, not from its company or its place in a list", () => {
  const mine = reading(0.92, 0.71);
  const others = [reading(0.1, 0.1), reading(1, 0.95), reading(0.5, 0.5), reading(0.86, 0.62)];
  const alone = F.orbFlare(mine, 3.3, 0.4);
  /* Surrounded by calm orbs, surrounded by deep ones, first or last: identical.
     The function never sees the others, so there is nothing to compare against. */
  for (const list of [others, others.slice().reverse(), others.slice(2)]) {
    for (const probe of list) {
      const neighbour = F.orbFlare(probe, 3.3, F.CADENCE.orb ? 0.4 : 0.4);
      assert.equal(typeof neighbour.intensity, "number");
    }
    const again = F.orbFlare(mine, 3.3, 0.4);
    assert.deepEqual(again, alone, "the roster around an orb cannot change its flare");
  }
  /* Two orbs with the same reading flare the same way. */
  assert.deepEqual(F.orbFlare(reading(0.95, 0.8), 7, 0.1).intensity,
    F.orbFlare(reading(0.95, 0.8), 7, 0.9).intensity);
});

test("the per-orb thresholds are the tail thresholds, applied to one orb", () => {
  assert.equal(F.orbFlare(reading(0.79, 0.2), 0, 0).active, false, "just under the depth tail is not flaring");
  assert.equal(F.orbFlare(reading(0.8, 0.2), 0, 0).active, true, "at the depth tail it is");
  assert.equal(F.orbFlare(reading(1, 0.2), 0, 0).intensity, 1, "the deepest orb is at full intensity");
  assert.equal(F.orbFlare(reading(0.1, 0.59), 0, 0).active, false, "just under the pressure tail is not");
  assert.equal(F.orbFlare(reading(0.1, 0.6), 0, 0).active, true, "at the pressure tail it is");
  /* Unmeasured is never neutral: no depth and no pressure is no flare at all. */
  const unmeasured = F.orbFlare(reading(null, null), 0, 0);
  assert.equal(unmeasured.active, false);
  assert.equal(unmeasured.intensity, 0);
  assert.equal(unmeasured.spikes, 0);
});

test("the jets are roster-level, bipolar, and never point at a fixed sector", () => {
  const jets = F.quasarJets(quasar(0.5), 0);
  assert.equal(jets.engaged, true);
  assert.equal(jets.streaks.length, F.JET_STREAKS);
  /* The axis drifts, so no longitude is privileged for longer than a moment. */
  const later = F.quasarJets(quasar(0.5), F.CADENCE.axis / 3);
  assert.notEqual(jets.axis, later.axis, "the axis moves with the clock");
  assert.ok(later.axis >= 0 && later.axis < Math.PI * 2, "and wraps within one turn");
  /* Intensity is the roster's own tail share, floored so a measured shell shows. */
  assert.ok(F.quasarJets(quasar(0), 0).intensity > 0, "a measured shell always shows a little");
  assert.ok(F.quasarJets(quasar(1), 0).intensity > F.quasarJets(quasar(0), 0).intensity);
  /* Unmeasured Quasar, or fewer than two orbs, draws nothing. */
  assert.equal(F.quasarJets(null, 0).engaged, false);
  assert.equal(F.quasarJets({ engaged: true, measured: 1, tail: { depth: { share: 1 } } }, 0).engaged, false);
});

test("the halo bursts in one direction and reaches each ring in turn", () => {
  const halo = F.reinsuranceFlare(reinsurance(0.6), 0);
  assert.equal(halo.engaged, true);
  assert.equal(halo.rings.length, F.HALO_RINGS);
  /* At the instant the burst fires, the inner ring is already decaying and the
     outer ring has yet to be reached: one structure flaring, not three blinking. */
  const atPeak = F.reinsuranceFlare(reinsurance(1), 0);
  assert.ok(atPeak.rings[0].burst > atPeak.rings[2].burst);
  for (const ring of atPeak.rings) {
    assert.ok(ring.burst >= 0 && ring.burst <= 1, "a burst is a bounded number");
  }
  assert.equal(F.reinsuranceFlare(null, 0).engaged, false);
  assert.equal(F.reinsuranceFlare({ engaged: false }, 0).engaged, false);
});

test("a frozen clock is a state, not a blank", () => {
  /* prefers-reduced-motion stops the clock. Everything still has to be
     drawable, or the shells would vanish rather than go still. */
  const jets = F.quasarJets(quasar(0.4), 0);
  const halo = F.reinsuranceFlare(reinsurance(0.5), 0);
  const orb = F.orbFlare(reading(0.95, 0.8), 0, 0.3);
  for (const value of [jets.intensity, jets.length, jets.width, halo.intensity, orb.intensity, orb.pulse, orb.reach]) {
    assert.ok(Number.isFinite(value), "no NaN reaches the canvas when the clock is stopped");
  }
  assert.ok(jets.streaks.every(streak => Number.isFinite(streak.t)));
  assert.ok(orb.spikes >= 3, "a deep orb keeps its spikes, they simply stop moving");
  /* And a clock that never runs is the same as a clock at zero. */
  assert.deepEqual(F.orbFlare(reading(0.95, 0.8), 0, 0.3), F.orbFlare(reading(0.95, 0.8), 0, 0.3));
});

test("every value stays in range", () => {
  for (const share of [0, 0.25, 0.5, 1]) {
    for (const clock of [0, 1.7, 40, 1e6]) {
      const jets = F.quasarJets(quasar(share), clock);
      assert.ok(jets.intensity >= 0 && jets.intensity <= 1);
      assert.ok(jets.length > 0 && jets.width > 0);
      const halo = F.reinsuranceFlare(reinsurance(share), clock);
      assert.ok(halo.intensity >= 0 && halo.intensity <= 1);
      const orb = F.orbFlare(reading(share, share), clock, 0.5);
      assert.ok(orb.intensity >= 0 && orb.intensity <= 1);
      assert.ok(orb.pulse >= 0 && orb.pulse <= 1);
    }
  }
  /* A bad clock is treated as no time, never as NaN. */
  assert.equal(F.orbFlare(reading(0.9, 0.9), -5, 0).pulse, F.orbFlare(reading(0.9, 0.9), 0, 0).pulse);
  assert.equal(F.orbFlare(reading(0.9, 0.9), Number.NaN, 0).pulse, F.orbFlare(reading(0.9, 0.9), 0, 0).pulse);
});

test("the flare palette never borrows a market colour", () => {
  const seen = new Set();
  for (let step = 0; step <= 20; step += 1) {
    const intensity = step / 20;
    const colour = F.mixHex(F.PALETTE.cool, F.PALETTE.hot, intensity);
    seen.add(colour);
    assert.match(colour, /^#[0-9a-f]{6}$/);
    assert.ok(!Object.values(MARKET_COLOURS).includes(colour),
      `${colour} is a market colour — motion must not be readable as state`);
  }
  assert.equal(F.mixHex(F.PALETTE.cool, F.PALETTE.hot, 0), F.PALETTE.cool);
  assert.equal(F.mixHex(F.PALETTE.cool, F.PALETTE.hot, 1), F.PALETTE.hot);
  assert.ok(seen.size > 10, "the ramp is continuous, not a pair of endpoints");
});

test("the status lines are fixed labels and numbers, with no ranking language", () => {
  const jets = F.quasarJets(quasar(0.5), 2);
  const halo = F.reinsuranceFlare(reinsurance(0.5), 2);
  const orb = F.orbFlare(reading(0.9, 0.7), 2, 0.2);
  for (const text of [F.jetsText(jets), F.haloText(halo), F.orbText(orb)]) {
    assert.ok(!/NaN|undefined|null/.test(text), `no raw value leaks into the panel: ${text}`);
    assert.ok(!/\b(top|best|worst|rank|first|leader|should|must|buy|sell)\b/i.test(text),
      `the flare prescribes nothing: ${text}`);
  }
  assert.match(F.orbText(orb), /own depth and pressure/, "the per-orb line says where its number came from");
  assert.match(F.jetsText(F.quasarJets(null, 0)), /not measured enough/);
  assert.match(F.haloText(F.reinsuranceFlare(null, 0)), /not engaged/);
  assert.match(F.orbText(F.orbFlare(reading(0.2, 0.2), 0, 0)), /outside the tail/);
});

test("index.html loads the flare before the app that calls it", async () => {
  const html = await readText("index.html");
  const flareAt = html.indexOf("js/neo-orb-flare.js");
  const appAt = html.indexOf("js/apps-neo-orb.js");
  const reinsuranceAt = html.indexOf("js/neo-orb-reinsurance.js");
  assert.ok(flareAt > -1, "the flare module is served");
  assert.ok(reinsuranceAt < flareAt, "after the module whose numbers it reads");
  assert.ok(flareAt < appAt, "and before the app that draws it");
});
