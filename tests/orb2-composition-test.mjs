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

test("same-day 15m data remains available before and at 5 PM Arizona time", () => {
  const daily = observation(market({ time: RTH_NOW, close: 106, changePct: 2 }));
  // 1:30 PM Phoenix / 8:30 PM UTC, observed more than two hours later.
  const sameDay = observation(market({
    time: Date.parse("2026-10-05T20:30:00.000Z"),
    close: 120, changePct: 15, flow: 40, wave: 40
  }));

  for (const now of [
    Date.parse("2026-10-05T23:30:00.000Z"), // 4:30 PM MST
    Date.parse("2026-10-06T00:00:00.000Z")  // 5:00 PM MST
  ]) {
    const result = composePair(daily, sameDay, now);
    assert.equal(result.status, "composed");
    assert.equal(result.freshness, 0.35);
    assert.notEqual(result.reason, "15m-stale-or-out-of-session");
  }
});

test("same-day 15m data becomes stale after 5 PM Arizona time", () => {
  const daily = observation(market({ time: RTH_NOW, close: 106, changePct: 2 }));
  const sameDay = observation(market({
    time: Date.parse("2026-10-05T20:30:00.000Z"),
    close: 120, changePct: 15, flow: 40, wave: 40
  }));
  const result = composePair(daily, sameDay, Date.parse("2026-10-06T00:01:00.000Z")); // 5:01 PM MST
  assert.equal(result.status, "baseline-only");
  assert.equal(result.reason, "15m-stale-or-out-of-session");
  assert.equal(result.composedPosition, result.baselinePosition);
  assert.equal(result.forceMultiplier, 1);
});

test("prior-day 15m data remains stale despite the same-day Arizona grace", () => {
  const daily = observation(market({ time: RTH_NOW, close: 106, changePct: 2 }));
  const priorDay = observation(market({
    time: Date.parse("2026-10-02T20:30:00.000Z"),
    close: 120, changePct: 15, flow: 40, wave: 40
  }));
  const result = composePair(daily, priorDay, Date.parse("2026-10-05T23:30:00.000Z")); // 4:30 PM MST
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
