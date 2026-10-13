/* The six Fibonacci envelopes survive the stored Orb 2 record.

   The NEO ORB depth reading (js/neo-orb-signals.js) needs every level, not only the
   outermost. Before this change the writer and the sanitizer kept only lower1000 and
   upper1000, so a stored row could never produce a depth. These tests hold the sanitizer
   to all six levels and check the depth reading end to end on a stored-shaped record. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";
import { safeMarket } from "../worker/good-intelligence-orb2-beats.mjs";

const LEVELS = [236, 382, 500, 618, 764, 1000];

function bandsAround(basis, ratio) {
  const out = {};
  for (const level of LEVELS) {
    out[`upper${level}`] = basis * Math.pow(ratio, level / 1000);
    out[`lower${level}`] = basis / Math.pow(ratio, level / 1000);
  }
  return out;
}

test("the stored market record keeps all six envelope levels, upper and lower", () => {
  const bands = bandsAround(100, 2);
  const market = safeMarket({
    barCount: 60, latestBar: { time: 1, open: 100, high: 131, low: 99, close: 130, confirmed: true },
    basis: 100, bands, changePct: 1.5
  });
  assert.ok(market, "a valid record is accepted");
  assert.ok(market.bands, "the bands are kept");
  for (const level of LEVELS) {
    assert.ok(Math.abs(market.bands[`upper${level}`] - bands[`upper${level}`]) < 1e-9, `upper${level} is kept`);
    assert.ok(Math.abs(market.bands[`lower${level}`] - bands[`lower${level}`]) < 1e-9, `lower${level} is kept`);
  }
});

test("a stored record without the level bands is still accepted, and reads as unmeasured", async () => {
  const market = safeMarket({
    barCount: 60, latestBar: { time: 1, open: 100, high: 131, low: 99, close: 130, confirmed: true },
    basis: 100, bands: { upper1000: 200, lower1000: 50 }, changePct: 1
  });
  assert.ok(market, "an older record is still accepted");
  const source = await readFile(new URL("../js/neo-orb-signals.js", import.meta.url), "utf8");
  const context = { module: { exports: {} }, globalThis: {} };
  vm.runInNewContext(source, context, { filename: "neo-orb-signals.js" });
  const depth = context.module.exports.depthOf({ ...market, latestBar: market.latestBar });
  assert.equal(depth.depth, null, "a record with a missing level is unmeasured, not a partial depth");
});

test("a stored record with all six levels gives a depth in NEO ORB", async () => {
  const market = safeMarket({
    barCount: 60, latestBar: { time: 1, open: 100, high: 131, low: 99, close: 130, confirmed: true },
    basis: 100, bands: bandsAround(100, 2), changePct: 1
  });
  const source = await readFile(new URL("../js/neo-orb-signals.js", import.meta.url), "utf8");
  const context = { module: { exports: {} }, globalThis: {} };
  vm.runInNewContext(source, context, { filename: "neo-orb-signals.js" });
  const depth = context.module.exports.depthOf(market);
  assert.equal(depth.available, true, "the stored record is measured");
  assert.ok(depth.depth > 0 && depth.depth < 1, `a close between the basis and the envelope reads as partial depth (${depth.depth})`);
});

test("the writer keeps all six levels too", async () => {
  const source = await readFile(new URL("../worker/orb2-field.mjs", import.meta.url), "utf8");
  assert.ok(source.includes("const ORB2_BAND_LEVELS = Object.freeze([236, 382, 500, 618, 764, 1000]);"), "the six levels are declared");
  assert.ok(/ORB2_BAND_LEVELS\.flatMap\(level => \[\s*\[`lower\$\{level\}`/.test(source), "the writer maps every level");
});
