/* The shared extension measure — js/market-extension.js.

   One definition of "how far out an instrument is", read by both NEO ORB
   (js/apps-neo-orb.js) and Orb 2 (js/good-intelligence-orb2.js) so the same stored
   packet means the same distance from the centre in both apps. Two independent
   measures, each normalized to 0…1 where 1 is this repository's own extreme:

     · WaveTrend  continuous |wt1| against the reviewed ±53…±70 thresholds that
                  js/good-intelligence-market-context.js already ships.
     · FBB basis  the close's logarithmic distance from the preferred FBB basis, in
                  half-band widths, against the ±1000 envelope the analysis computes.

   These tests hold the numbers, the preference order, the fail-closed behaviour
   (no data is null, never a zero dressed up as a reading), and the module's purity:
   it is math, so it touches no network, no DOM, and no storage.

   Synthetic packets only. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, ROOT), "utf8");
const extensionSource = await readText("js/market-extension.js");
const marketContextSource = await readText("js/good-intelligence-market-context.js");

function load(source, filename) {
  const window = {};
  const context = vm.createContext({ window, globalThis: window });
  vm.runInContext(source, context, { filename });
  return window;
}

const extension = load(extensionSource, "js/market-extension.js").MarketExtension;
const marketContext = load(marketContextSource, "js/good-intelligence-market-context.js").GoodIntelligenceMarketContext;

const LN = Math.log;

/* A packet shaped exactly as worker/orb2-field.mjs stores one field row. */
function fieldPacket({ wt1 = null, zone = "unknown", close = null, basis = null, lower = null, upper = null, variants = null, changePct = null } = {}) {
  const market = { status: "ok", source: "tickerbot", timeframe: "1d", dataShape: "confirmed-ohlcv", synthetic: false };
  if (wt1 !== null) market.waveTrend = { wt1, wt2: wt1 / 3, zone };
  if (close !== null) market.latestBar = { time: Date.parse("2026-10-11T00:00:00.000Z"), close, confirmed: true };
  if (basis !== null) market.basis = basis;
  if (lower !== null && upper !== null) market.bands = { lower1000: lower, upper1000: upper };
  if (variants) market.fbbComparison = { variants };
  if (changePct !== null) market.changePct = changePct;
  return market;
}

const variant = (id, basis, lower1000, upper1000, status = "available") => ({ id, basis, lower1000, upper1000, status, domain: "log-space" });

test("the WaveTrend half is the reviewed ±53…±70 thresholds, mirrored not reinvented", () => {
  const defaults = marketContext.DEFAULTS;
  assert.equal(extension.WT_NEUTRAL, defaults.obLevel2, "the neutral edge is obLevel2");
  assert.equal(extension.WT_NEUTRAL, -defaults.osLevel2, "and osLevel2 is its exact mirror");
  assert.equal(extension.WT_EXTREME, defaults.extremeOB, "the extreme edge is extremeOB");
  assert.equal(extension.WT_EXTREME, -defaults.extremeOS, "and extremeOS is its exact mirror");
  assert.ok(defaults.obLevel1 > defaults.obLevel2 && defaults.obLevel1 < defaults.extremeOB,
    "level 1 sits between the two thresholds the measure spans");

  assert.equal(extension.SCHEMA, "market-extension-v1");
  assert.equal(extension.waveExtension(null), null, "a missing wt1 is null, never zero");
  assert.equal(extension.waveExtension(undefined), null);
  assert.equal(extension.waveExtension(Number.NaN), null);
  assert.equal(extension.waveExtension(Number.POSITIVE_INFINITY), null);
  assert.equal(extension.waveExtension("70"), 1, "a numeric string is read as the number it spells, as everywhere else in this repo");
  assert.equal(extension.waveExtension("  "), null, "a blank is not a reading");
  assert.equal(extension.waveExtension("overbought"), null, "and neither is a word");
  assert.equal(extension.waveExtension({}), null);
  assert.equal(extension.waveExtension([70]), null);

  assert.equal(extension.waveExtension(0), 0);
  assert.equal(extension.waveExtension(52.9), 0, "inside the neutral zone nothing is extended");
  assert.equal(extension.waveExtension(53), 0, "the threshold itself is the zero of the scale");
  assert.equal(extension.waveExtension(-53), 0, "and it is symmetric: oversold reads the same distance");
  assert.equal(extension.waveExtension(61.5), 0.5, "halfway to the extreme is half the scale");
  assert.equal(extension.waveExtension(-61.5), 0.5);
  assert.equal(extension.waveExtension(60), (60 - 53) / (70 - 53), "level 1 is a point on the same line");
  assert.equal(extension.waveExtension(70), 1, "the extreme threshold is the full scale");
  assert.equal(extension.waveExtension(-70), 1);
  assert.equal(extension.waveExtension(96), 1, "past the extreme the scale is capped, not extrapolated");
  assert.equal(extension.waveExtension(-140), 1);

  let previous = -1;
  for (let magnitude = 0; magnitude <= 200; magnitude += 1) {
    for (const sign of [1, -1]) {
      const value = extension.waveExtension(sign * magnitude);
      assert.ok(value >= previous - 1e-12, `|wt1| ${magnitude} must not read closer in than ${previous}`);
      assert.ok(value >= 0 && value <= 1, "the measure stays inside 0…1");
      previous = value;
    }
  }
});

test("the basis half is the close's log distance from the FBB basis, in half-band widths", () => {
  /* Preference: the experimental FBB-L60 variant first, then the reference FBB-200,
     then the packet's own bands. The same preference the analysis and NEO ORB use. */
  assert.deepEqual([...extension.FBB_PREFERENCE], ["FBB-L60", "FBB-200"]);
  for (const id of extension.FBB_PREFERENCE) {
    assert.ok(marketContext.FBB_VARIANTS[id], `${id} is a variant the market context actually defines`);
  }

  const both = fieldPacket({
    close: 105,
    variants: {
      "FBB-L60": variant("FBB-L60", 100, 90, 110),
      "FBB-200": variant("FBB-200", 98, 80, 120)
    }
  });
  assert.equal(extension.basisFrame(both).id, "FBB-L60", "the preferred available variant wins");
  assert.equal(extension.basisFrame(both).source, "variant");

  const l60Short = fieldPacket({
    close: 105,
    variants: {
      "FBB-L60": { ...variant("FBB-L60", 100, 90, 110), status: "insufficient-history" },
      "FBB-200": variant("FBB-200", 98, 80, 120)
    }
  });
  assert.equal(extension.basisFrame(l60Short).id, "FBB-200", "an unavailable variant is skipped, not trusted");

  const packetBands = fieldPacket({ close: 105, basis: 100, lower: 90, upper: 110 });
  assert.equal(extension.basisFrame(packetBands).id, "FBB", "with no variant frame the packet's own bands are used");
  assert.equal(extension.basisFrame(packetBands).source, "packet");

  assert.equal(extension.basisFrame(fieldPacket({ close: 105 })), null, "no basis and no bands is no frame");
  assert.equal(extension.basisFrame(fieldPacket({ close: 105, basis: 100, lower: 90 })), null, "a half envelope is no frame");
  assert.equal(extension.basisFrame(null), null);
  assert.equal(extension.basisFrame({ waveTrend: { wt1: 70 } }), null, "a WaveTrend reading alone is not a basis frame");

  /* The measure itself, in the log domain the bands are computed in. */
  const at = extension.basisExtension(fieldPacket({ close: 100, basis: 100, lower: 90, upper: 110 }));
  assert.equal(at.extension, 0, "the close on the basis is not extended");
  assert.equal(at.side, "at");
  assert.ok(at.distancePct < 1e-12, "zero distance in price terms too");

  const above = extension.basisExtension(fieldPacket({ close: 105, basis: 100, lower: 90, upper: 110 }));
  assert.ok(Math.abs(above.extension - LN(105 / 100) / LN(110 / 100)) < 1e-12,
    `log distance over the upper half-width (got ${above.extension})`);
  assert.equal(above.side, "above");
  assert.ok(Math.abs(above.distancePct - 5) < 1e-9, "the readable companion is the price distance in percent");
  assert.ok(Math.abs(above.halfWidthPct - 10) < 1e-9, "and the half-band width in percent");
  assert.equal(above.beyondEnvelope, false);
  assert.equal(above.basisId, "FBB");

  const below = extension.basisExtension(fieldPacket({ close: 95, basis: 100, lower: 90, upper: 110 }));
  assert.ok(Math.abs(below.extension - LN(100 / 95) / LN(100 / 90)) < 1e-12,
    "below the basis the lower half-width is the ruler");
  assert.equal(below.side, "below");

  const envelope = extension.basisExtension(fieldPacket({ close: 110, basis: 100, lower: 90, upper: 110 }));
  assert.equal(envelope.extension, 1, "the ±1000 envelope is the full scale");
  assert.equal(envelope.beyondEnvelope, false, "on the envelope, not beyond it");

  const past = extension.basisExtension(fieldPacket({ close: 132, basis: 100, lower: 90, upper: 110 }));
  assert.equal(past.extension, 1, "beyond the envelope the scale is capped…");
  assert.equal(past.beyondEnvelope, true, "…and the packet says so instead of pretending 132 is 110");

  /* An asymmetric envelope measures each side with its own half-width. */
  const skewed = extension.basisExtension(fieldPacket({ close: 110, basis: 100, lower: 95, upper: 120 }));
  assert.ok(Math.abs(skewed.extension - LN(1.1) / LN(1.2)) < 1e-12);
  const skewedLow = extension.basisExtension(fieldPacket({ close: 95, basis: 100, lower: 95, upper: 120 }));
  assert.equal(skewedLow.extension, 1, "the lower envelope of the same frame is also the full scale");

  /* Fail closed: a frame that cannot be trusted measures nothing. */
  for (const packet of [
    fieldPacket({ basis: 100, lower: 90, upper: 110 }),
    fieldPacket({ close: 0, basis: 100, lower: 90, upper: 110 }),
    fieldPacket({ close: -105, basis: 100, lower: 90, upper: 110 }),
    fieldPacket({ close: 105, basis: 0, lower: 90, upper: 110 }),
    fieldPacket({ close: 105, basis: 100, lower: 100, upper: 110 }),
    fieldPacket({ close: 105, basis: 100, lower: 105, upper: 110 }),
    fieldPacket({ close: 105, basis: 100, lower: 90, upper: 100 }),
    fieldPacket({ close: 105, basis: 100, lower: Number.NaN, upper: 110 })
  ]) {
    assert.equal(extension.basisExtension(packet), null, `an unusable frame measures nothing: ${JSON.stringify(packet.bands)}`);
  }

  /* The close is read where the field puts it, and only there. */
  assert.equal(extension.basisExtension({ basis: 100, bands: { lower1000: 90, upper1000: 110 }, close: 110 }).extension, 1,
    "a flat `close` field is read when there is no bar");
  assert.equal(extension.basisExtension({ basis: 100, bands: { lower1000: 90, upper1000: 110 }, latestBar: { close: 110 }, close: 100 }).extension, 1,
    "and the latest bar wins over a stale flat field");
});

test("the extension is the larger of the two measures, and it names which one drove it", () => {
  const waveOnly = extension.extensionOf(fieldPacket({ wt1: 70, zone: "extreme overbought" }));
  assert.equal(waveOnly.available, true);
  assert.equal(waveOnly.extension, 1);
  assert.equal(waveOnly.driver, "waveTrend");
  assert.equal(waveOnly.basis, null, "no basis frame is reported as none, not as zero");
  assert.equal(waveOnly.zone, "extreme overbought", "the reviewed zone label is carried through");
  assert.equal(Object.isFrozen(waveOnly), true, "the result cannot be edited by a caller");

  const basisOnly = extension.extensionOf(fieldPacket({ close: 112, basis: 100, lower: 90, upper: 112 }));
  assert.equal(basisOnly.driver, "basis");
  assert.equal(basisOnly.extension, 1);
  assert.equal(basisOnly.wave, null);
  assert.equal(basisOnly.basisValue, 100);
  assert.equal(basisOnly.close, 112);
  assert.equal(basisOnly.side, "above");
  assert.ok(Math.abs(basisOnly.distancePct - 12) < 1e-9);

  const waveWins = extension.extensionOf(fieldPacket({ wt1: -70, close: 101, basis: 100, lower: 90, upper: 110 }));
  assert.equal(waveWins.driver, "waveTrend", "the larger measure wins…");
  assert.equal(waveWins.extension, 1);
  assert.ok(waveWins.basis.extension < 0.2, "…and the smaller one is still reported beside it");

  const basisWins = extension.extensionOf(fieldPacket({ wt1: 20, close: 110, basis: 100, lower: 90, upper: 110 }));
  assert.equal(basisWins.driver, "basis");
  assert.equal(basisWins.extension, 1);
  assert.equal(basisWins.wave, 0, "a neutral WaveTrend reading is a real zero, not a missing one");

  const halfWidthClose = 100 * Math.exp(0.5 * LN(110 / 100));
  const tied = extension.extensionOf(fieldPacket({ wt1: 61.5, close: halfWidthClose, basis: 100, lower: 90, upper: 110 }));
  assert.ok(Math.abs(tied.wave - tied.basis.extension) < 1e-12, "both measures read the same distance here");
  assert.equal(tied.driver, "both", "and a tie is reported as both rather than picked arbitrarily");

  const neither = extension.extensionOf(fieldPacket({ changePct: 1.4 }));
  assert.equal(neither.available, false, "with neither measure there is no extension…");
  assert.equal(neither.extension, 0);
  assert.equal(neither.wave, null);
  assert.equal(neither.basis, null);
  assert.equal(neither.driver, null);
  assert.equal(neither.zone, "unknown");
  assert.match(neither.reason, /no WaveTrend value and no FBB basis frame/, "…and the reason is stated, not implied");

  for (const packet of [null, undefined, {}, { waveTrend: {} }, { waveTrend: { wt1: null } }, fieldPacket({ wt1: 61.5, close: 132, basis: 100, lower: 90, upper: 110 })]) {
    const state = extension.extensionOf(packet);
    assert.ok(state.extension >= 0 && state.extension <= 1, "the measure never leaves 0…1");
    assert.equal(state.available, state.wave !== null || state.basis !== null, "`available` means a measure exists");
  }

  const beyond = extension.extensionOf(fieldPacket({ close: 132, basis: 100, lower: 90, upper: 110 }));
  assert.equal(beyond.beyondEnvelope, true, "the combined state carries the envelope flag");
  assert.equal(beyond.basisId, "FBB");
});

test("describe() says the reading in words, or says there is none", () => {
  assert.equal(
    extension.describe(extension.extensionOf(fieldPacket({ wt1: 70, zone: "extreme overbought" }))),
    "1.00 out · driven by WaveTrend · wt1 +70.0 → 1.00"
  );
  const basis = extension.describe(extension.extensionOf(fieldPacket({ close: 112, basis: 100, lower: 90, upper: 112 })));
  assert.match(basis, /^1\.00 out · driven by basis distance · close 12\.0% above the FBB basis → 1\.00$/);
  const tieClose = 100 * Math.exp(0.5 * LN(110 / 100));
  const both = extension.describe(extension.extensionOf(fieldPacket({
    wt1: -61.5, close: tieClose, basis: 100, lower: 90, upper: 110,
    variants: { "FBB-L60": variant("FBB-L60", 100, 90, 110) }
  })));
  assert.match(both, /^0\.50 out · driven by both measures · /, "a tie names both measures");
  assert.match(both, /wt1 -61\.5 → 0\.50/, "the WaveTrend number is shown");
  assert.match(both, /above the FBB-L60 basis → 0\.50/, "and so is the variant the basis came from");
  assert.equal(/beyond the ±1000 envelope/.test(both), false, "a close inside the envelope does not claim to be outside it");
  const outside = extension.describe(extension.extensionOf(fieldPacket({
    wt1: -64, close: 121, basis: 100, lower: 90, upper: 110,
    variants: { "FBB-L60": variant("FBB-L60", 100, 90, 110) }
  })));
  assert.match(outside, /driven by basis distance/, "the larger measure drives the sentence");
  assert.match(outside, /beyond the ±1000 envelope/, "and a close outside the envelope says so");
  assert.equal(extension.describe(extension.extensionOf(fieldPacket({ changePct: 2 }))),
    "unmeasured — no WaveTrend value and no FBB basis frame");
  assert.equal(extension.describe(null), "unmeasured — no WaveTrend value and no FBB basis frame",
    "nothing is described as calm when nothing was measured");
});

test("the measure is pure math: no network, no DOM, no storage, no route", () => {
  for (const forbidden of ["fetch(", "XMLHttpRequest", "WebSocket", "EventSource", "sendBeacon", "importScripts",
    "http://", "https://", "//api", "/api/", "localStorage", "sessionStorage", "indexedDB", "document.", "HOS.", "legitimacy("]) {
    assert.equal(extensionSource.includes(forbidden), false, `market-extension.js must not reference ${forbidden}`);
  }
  assert.equal(Object.isFrozen(extension), true, "the module surface is frozen");
  assert.deepEqual(Object.keys(extension).sort(),
    ["FBB_PREFERENCE", "SCHEMA", "WT_EXTREME", "WT_NEUTRAL", "basisExtension", "basisFrame", "describe", "extensionOf", "waveExtension"],
    "the module exports exactly the measure and nothing that can act");
});
