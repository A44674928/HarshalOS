/* NEO ORB price signals — js/neo-orb-signals.js.

   Holds the Orb 2 mechanisms NEO ORB now reads: the six-envelope depth, the composed
   position, the VFI flow state, and the pressure formula. Each assertion uses a
   synthetic packet with hand-computed numbers. Missing data stays null, never neutral. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

const source = await readFile(new URL("../js/neo-orb-signals.js", import.meta.url), "utf8");
const context = { module: { exports: {} }, globalThis: {} };
vm.runInNewContext(source, context, { filename: "neo-orb-signals.js" });
const S = context.module.exports;

/* A symmetric ladder: every envelope at the same ratio, so the close's depth is exact. */
function ladder(basis, ratio) {
  const out = {};
  for (const level of [236, 382, 500, 618, 764, 1000]) {
    out["upper" + level] = basis * Math.exp(Math.log(ratio) * (level / 1000));
    out["lower" + level] = basis / Math.exp(Math.log(ratio) * (level / 1000));
  }
  return out;
}

test("depth is 0 at the basis and rises with the close's log distance", () => {
  const basis = 100;
  const bands = ladder(basis, 2);
  const at = close => S.depthOf({ basis, bands, latestBar: { close } });
  assert.equal(at(100).depth, 0);
  /* Hand-computed at close = 100·√2 (log distance ln√2 ≈ 0.3466): each level contributes
     min(|c|, 1) with c = distance / level half-width. Only 618, 764, 1000 sit below 1. */
  const d = Math.log(Math.SQRT2);
  const half = level => Math.log(bands["upper" + level] / basis);
  const expected = [236, 382, 500, 618, 764, 1000]
    .reduce((sum, level) => sum + Math.min(d / half(level), 1), 0) / 6;
  assert.ok(Math.abs(at(100 * Math.SQRT2).depth - expected) < 1e-9);
  let previous = -1;
  for (const close of [101, 110, 120, 140, 160, 190]) {
    const value = at(close).depth;
    assert.ok(value > previous, "depth rises with distance");
    previous = value;
  }
  assert.equal(at(200).depth, 1, "at the ±1000 envelope the mean reaches 1");
  assert.equal(at(1000).depth, 1, "beyond the envelope clamps to 1, the region takes over");
});

test("depth is symmetric about the basis and fails closed without a full ladder", () => {
  const basis = 100;
  const bands = ladder(basis, 2);
  const up = S.depthOf({ basis, bands, latestBar: { close: 130 } }).depth;
  const down = S.depthOf({ basis, bands, latestBar: { close: 100 / 1.3 } }).depth;
  assert.ok(Math.abs(up - down) < 1e-9);
  const partial = { ...bands };
  delete partial["upper618"];
  const missing = S.depthOf({ basis, bands: partial, latestBar: { close: 130 } });
  assert.equal(missing.available, false);
  assert.equal(missing.depth, null, "a partial ladder is not a depth");
  assert.equal(S.depthOf(null).depth, null);
  assert.equal(S.depthOf({ basis: 0, bands, latestBar: { close: 1 } }).depth, null);
});

test("composed position is null, never neutral, when missing or on hold", () => {
  assert.equal(S.compositionOf(null).available, false);
  assert.equal(S.compositionOf({ status: "hold" }).position, null);
  const c = S.compositionOf({ composedPosition: 0.8, forceMultiplier: 1.2, freshness: 0.5, status: "composed" });
  assert.equal(c.available, true);
  assert.ok(Math.abs(c.axis - 0.6) < 1e-9, "axis is (position − 0.5) × 2");
  assert.equal(S.compositionOf({ composedPosition: 1.4 }).available, false, "out of range is refused");
  assert.equal(S.compositionOf({ composedPosition: 0.5, forceMultiplier: 9 }).forceMultiplier, 1.35, "multiplier is bounded");
});

test("VFI flow reports above, below, equal, and unavailable", () => {
  assert.equal(S.flowOf({ vfi: { value: 5, signal: 3, available: true } }).state, "above");
  assert.equal(S.flowOf({ vfi: { value: 3, signal: 5, available: true } }).state, "below");
  assert.equal(S.flowOf({ vfi: { value: 4, signal: 4, available: true } }).state, "equal");
  assert.equal(S.flowOf({ vfi: { value: 4, signal: 3, available: false } }).state, "unavailable");
  assert.equal(S.flowOf({}).state, "unavailable");
});

test("pressure follows Orb 2's weights and reports which terms were measured", () => {
  const market = { changePct: 4, vfi: { value: 18, signal: 0, available: true }, waveTrend: { wt1: 45, wt2: 0 } };
  const p = S.pressureOf(market, null);
  const expected = Math.tanh(1) * 0.42 + Math.tanh(1) * 0.28 + Math.tanh(1) * 0.15;
  assert.ok(Math.abs(p.value - expected) < 1e-9, "no volatility term without bands, no multiplier without composition");
  assert.equal(p.measured.volatility, false);
  assert.equal(S.pressureOf({}, null).value, 0, "nothing measured is zero pressure, with every term flagged missing");
  assert.equal(S.pressureOf({}, null).measured.price, false);
  const boosted = S.pressureOf(market, { composedPosition: 0.9, forceMultiplier: 1.35, freshness: 1, status: "composed" });
  assert.ok(boosted.value > p.value, "a fresh aligned multiplier raises pressure, up to the clamp");
  assert.ok(boosted.value <= 1);
});

test("the module is pure math with frozen exports", () => {
  assert.ok(Object.isFrozen(S));
  assert.equal(JSON.stringify(Array.from(S.LEVELS)), "[236,382,500,618,764,1000]");
  assert.ok(!/fetch|XMLHttpRequest|WebSocket|localStorage|document\./.test(source), "no network, storage, or DOM");
});
