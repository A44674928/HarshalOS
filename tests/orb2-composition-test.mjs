import assert from "node:assert/strict";
import test from "node:test";
import {
  ORB2_BARS_PER_RTH_DAY,
  ORB2_COMPOSITION_SCHEMA,
  ORB2_MAX_FORCE_MULTIPLIER,
  composePair,
  normalizedBandPosition,
  sanitizeOrb2Composition
} from "../worker/orb2-composition.mjs";

const RTH_NOW = Date.parse("2026-10-05T14:00:00.000Z");
function market({ time, close = 100, changePct = 0, flow = 0, wave = 0 } = {}) {
  return {
    latestBar: { time, close, volume: 1000, confirmed: true },
    basis: 100,
    bands: { lower1000: 90, upper1000: 110 },
    changePct,
    vfi: { value: flow, signal: 0, available: true },
    waveTrend: { wt1: wave, wt2: 0, zone: "neutral" }
  };
}
function observation(marketValue) { return { market: marketValue }; }

test("daily and 15m positions use scale-invariant log-band placement, not raw prices", () => {
  const daily = normalizedBandPosition(market({ time: RTH_NOW, close: 110 }));
  const intraday = normalizedBandPosition(market({ time: RTH_NOW, close: 110 }));
  assert.ok(daily && intraday);
  assert.equal(daily.p, intraday.p);
});

test("the daily baseline remains usable when the 15m residual is absent", () => {
  const result = composePair(observation(market({ time: RTH_NOW, close: 106, changePct: 2 })), null, RTH_NOW);
  assert.equal(result.schema, ORB2_COMPOSITION_SCHEMA);
  assert.equal(result.status, "baseline-only");
  assert.equal(result.reason, "15m-missing-or-unavailable");
  assert.equal(result.composedPosition, result.baselinePosition);
  assert.equal(result.intradayPosition, null);
});

test("a fresh aligned 15m residual receives a bounded force multiplier", () => {
  const daily = observation(market({ time: RTH_NOW, close: 106, changePct: 2, flow: 8, wave: 8 }));
  const intraday = observation(market({ time: RTH_NOW - 15 * 60_000, close: 108, changePct: 3, flow: 12, wave: 12 }));
  const result = composePair(daily, intraday, RTH_NOW);
  assert.equal(result.status, "composed");
  assert.ok(result.freshness > 0);
  assert.ok(result.forceMultiplier > 1);
  assert.ok(result.forceMultiplier <= ORB2_MAX_FORCE_MULTIPLIER);
  assert.equal(result.scaleFactorBarsPerDay, ORB2_BARS_PER_RTH_DAY);
  assert.equal(result.scaleFactorSqrt, Math.sqrt(26));
});

test("stale or out-of-session 15m data decays to the daily baseline", () => {
  const daily = observation(market({ time: RTH_NOW, close: 106, changePct: 2 }));
  const stale = observation(market({ time: RTH_NOW - 3 * 60 * 60_000, close: 120, changePct: 15, flow: 40, wave: 40 }));
  const result = composePair(daily, stale, RTH_NOW);
  assert.equal(result.status, "baseline-only");
  assert.equal(result.reason, "15m-stale-or-out-of-session");
  assert.equal(result.composedPosition, result.baselinePosition);
  assert.equal(result.forceMultiplier, 1);
});

test("composition sanitization preserves the display-only boundary and rejects another schema", () => {
  const result = composePair(observation(market({ time: RTH_NOW, close: 106 })), null, RTH_NOW);
  const clean = sanitizeOrb2Composition(result);
  assert.equal(clean.schema, ORB2_COMPOSITION_SCHEMA);
  assert.equal(clean.status, "baseline-only");
  assert.equal(sanitizeOrb2Composition({ ...result, schema: "not-orb2" }), null);
  assert.match(clean.note, /not a forecast/i);
});
