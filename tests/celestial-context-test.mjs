/* Tests the local, display-only Moon and Sun calculations. These are astronomy
   approximations, not authority time, an ephemeris service, or local visibility. */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(path.join(ROOT, "js", "celestial-context.js"), "utf8");
const sandbox = { window: {}, Date, Math, Object, Array, Number, String };
vm.runInContext(source, vm.createContext(sandbox), { filename: "js/celestial-context.js" });
const Celestial = sandbox.window.HOSCelestialContext;
const MINUTE = 60_000;

function closeTo(actual, expected, toleranceMs, message) {
  assert.ok(Math.abs(actual - expected) <= toleranceMs,
    `${message}: ${new Date(actual).toISOString()} differs from ${new Date(expected).toISOString()}`);
}

test("celestial context: publishes a frozen, versioned, range-bounded API", () => {
  assert.ok(Celestial);
  assert.equal(Celestial.VERSION, "celestial-context-v1");
  assert.equal(Object.isFrozen(Celestial), true);
  assert.equal(Celestial.MIN_YEAR, 1900);
  assert.equal(Celestial.MAX_YEAR, 2100);
  assert.equal(typeof Celestial.moonAt, "function");
  assert.equal(typeof Celestial.sunAt, "function");
});

test("Moon adaptation: new and full Moon event estimates track known 2024 syzygies", () => {
  const expectedNew = Date.parse("2024-04-08T18:21:00Z");
  const beforeNew = Celestial.moonAt(new Date("2024-04-08T18:22:00Z"));
  closeTo(beforeNew.nextNewMoon.time, expectedNew, 3 * MINUTE, "new Moon estimate");
  assert.equal(beforeNew.nextPrincipalEvent.kind, "new");

  const afterNew = Celestial.moonAt(new Date("2024-04-08T18:25:00Z"));
  closeTo(afterNew.lastNewMoon.time, expectedNew, 3 * MINUTE, "last-new-Moon estimate");
  assert.equal(afterNew.lastPrincipalEvent.kind, "new");
  assert.equal(afterNew.trend, "waxing");

  const expectedFull = Date.parse("2024-04-23T23:49:00Z");
  const beforeFull = Celestial.moonAt(new Date("2024-04-23T23:48:00Z"));
  closeTo(beforeFull.nextFullMoon.time, expectedFull, 3 * MINUTE, "full Moon estimate");
  const afterFull = Celestial.moonAt(new Date("2024-04-24T00:00:00Z"));
  closeTo(afterFull.lastFullMoon.time, expectedFull, 3 * MINUTE, "last-full-Moon estimate");
  assert.equal(afterFull.lastPrincipalEvent.kind, "full");
  assert.equal(afterFull.trend, "waning");
});

test("Moon adaptation: eight named phases and illumination are derived from the lunation", () => {
  const seed = Celestial.moonAt(new Date("2024-04-09T00:00:00Z"));
  const cycleMs = seed.nextNewMoon.time - seed.lastNewMoon.time;
  const atFraction = fraction => Celestial.moonAt(new Date(seed.lastNewMoon.time + cycleMs * fraction));
  const checks = [
    [0.00, "New Moon"],
    [0.125, "Waxing Crescent"],
    [0.25, "First Quarter"],
    [0.375, "Waxing Gibbous"],
    [0.50, "Full Moon"],
    [0.625, "Waning Gibbous"],
    [0.75, "Last Quarter"],
    [0.875, "Waning Crescent"]
  ];
  for (const [fraction, expectedName] of checks) {
    assert.equal(atFraction(fraction).name, expectedName, `phase near fraction ${fraction}`);
  }
  assert.ok(Math.abs(atFraction(0.25).illuminationPercent - 50) < 1,
    "first-quarter illumination is about one half");
  assert.ok(atFraction(0.5).illuminationPercent > 99.9,
    "full-Moon illumination is close to 100 percent");
  assert.ok(atFraction(0).illuminationPercent < 0.1,
    "new-Moon illumination is close to zero");
});

test("Moon adaptation: current state is frozen, UTC-based, and location-independent", () => {
  const instant = new Date("2026-10-02T00:00:00Z");
  const state = Celestial.moonAt(instant);
  assert.equal(state.at, instant.getTime());
  assert.ok(state.ageDays >= 0 && state.ageDays < Celestial.SYNODIC_MONTH_DAYS);
  assert.ok(state.lunationDays > 29 && state.lunationDays < 30);
  assert.ok(state.illuminationFraction >= 0 && state.illuminationFraction <= 1);
  assert.ok(state.illuminationPercent >= 0 && state.illuminationPercent <= 100);
  assert.ok(state.lastPrincipalEvent.time <= instant.getTime());
  assert.ok(state.nextPrincipalEvent.time > instant.getTime());
  assert.equal(Object.isFrozen(state), true);
  assert.match(state.method, /no observer location required/);
});

test("Sun cycle: equinoxes and solstices land on the expected annual solar arcs", () => {
  const equinox = Celestial.sunAt(new Date("2024-03-20T03:06:00Z"));
  assert.ok(equinox.apparentLongitudeDegrees < 1 || equinox.apparentLongitudeDegrees > 359);
  assert.ok(Math.abs(equinox.declinationDegrees) < 0.1);
  assert.equal(equinox.annualArc, "March equinox → June solstice");

  const june = Celestial.sunAt(new Date("2024-06-20T20:50:00Z"));
  assert.ok(Math.abs(june.apparentLongitudeDegrees - 90) < 0.1);
  assert.ok(june.declinationDegrees > 23.3 && june.declinationDegrees < 23.6);
  assert.equal(june.annualArc, "June solstice → September equinox");

  const september = Celestial.sunAt(new Date("2024-09-22T12:44:00Z"));
  assert.ok(Math.abs(september.apparentLongitudeDegrees - 180) < 0.1);
  assert.ok(Math.abs(september.declinationDegrees) < 0.1);
  assert.equal(september.annualArc, "September equinox → December solstice");

  const december = Celestial.sunAt(new Date("2024-12-21T09:21:00Z"));
  assert.ok(Math.abs(december.apparentLongitudeDegrees - 270) < 0.1);
  assert.ok(december.declinationDegrees < -23.3 && december.declinationDegrees > -23.6);
  assert.equal(december.annualArc, "December solstice → March equinox");
  assert.equal("moonPhase" in december, false, "solar data must not be mislabeled as lunar-style phases");
  assert.match(december.method, /no observer location required/);
});

test("celestial context: invalid dates and unsupported years fail explicitly", () => {
  assert.throws(() => Celestial.moonAt("not a date"), /invalid/);
  assert.throws(() => Celestial.sunAt(new Date("1899-12-31T00:00:00Z")), /supported from 1900 through 2100/);
  assert.throws(() => Celestial.moonAt(new Date("2101-01-01T00:00:00Z")), /supported from 1900 through 2100/);
});
