import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { handleGoodIntelligenceDemo } from "../worker/good-intelligence-demo.mjs";

const source = await readFile(new URL("../js/good-intelligence-market-context.js", import.meta.url), "utf8");
const NOW = Date.parse("2026-09-30T12:00:00.000Z");
const context = vm.createContext({ window: {}, Date, Math, Number, JSON, Map, Array, Object, String });
vm.runInContext(source, context, { filename: "js/good-intelligence-market-context.js" });
const Model = context.window.GoodIntelligenceMarketContext;

function bars(count, { unconfirmedLast = false, interval = 60 * 60_000, start = NOW - (count - 1) * 60 * 60_000 } = {}) {
  let previous = 100;
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index * 0.018 + Math.sin(index / 9) * 2.4 + Math.sin(index / 3.5) * 0.8 + Math.sin(index / 26) * 2;
    const open = previous;
    const row = {
      time: new Date(start + index * interval).toISOString(),
      open, high: Math.max(open, close) + 0.2, low: Math.min(open, close) - 0.2,
      close, volume: 1000 + 100 * (1 + Math.sin(index / 5)),
      confirmed: !(unconfirmedLast && index === count - 1)
    };
    previous = close;
    return row;
  });
}

function packet(overrides = {}) {
  return {
    schema: "gi-market-context-v1", synthetic: true, source: "test fixture",
    symbol: "TEST-SYNTH", timeframe: "1h", bars: bars(360),
    parameters: { vfiLen: 30, vfiVolLen: 10, vfiSignalLen: 4, bandLen: 40, channelLength: 6, averageLength: 12, signalLength: 3, divLookback: 3 },
    ...overrides
  };
}

function barsFromCloses(closes) {
  return closes.map((close, index) => {
    const open = index ? closes[index - 1] : close * 0.99;
    return {
      time: new Date(NOW + index * 60_000).toISOString(),
      open, high: Math.max(open, close) * 1.01, low: Math.min(open, close) * 0.99,
      close, volume: 1000 + index * 73, confirmed: true
    };
  });
}

function closeTo(actual, expected, message, tolerance = 1e-10) {
  assert.ok(Number.isFinite(actual), `${message}: expected a finite result, got ${actual}`);
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `${message}: expected ${expected}, got ${actual}`);
}

test("market context accepts only the versioned packet and bounds normalized OHLCV", () => {
  assert.equal(Model.normalizePacket({ schema: "unknown", bars: bars(2) }), null);
  const unsafe = packet({ bars: [
    ...bars(3),
    { time: "2026-09-30T12:00:00Z", open: 3, high: 2, low: 1, close: 2, volume: 5 },
    { time: "2026-09-30T13:00:00Z", open: 1, high: 2, low: 0, close: 2, volume: 5 },
    { time: "2026-09-30T14:00:00Z", open: 1, high: 2, low: 0.5, close: 1.5, volume: null }
  ] });
  const normalized = Model.normalizePacket(unsafe);
  assert.equal(normalized.bars.length, 4, "a complete OHLC row without volume remains a valid observation");
  assert.equal(Object.hasOwn(normalized.bars.at(-1), "volume"), false);
  assert.ok(normalized.bars.every(bar => bar.high >= Math.max(bar.open, bar.close) && bar.low <= Math.min(bar.open, bar.close)));
  assert.equal(Model.normalizeParameters({ vfiLen: 99999 }).vfiLen, 1000);
  assert.equal(Model.normalizeParameters({ bandMa: "INVALID" }).bandMa, "VWMA");
});

test("OHLC, close-only, and scalar monthly observations preserve shape and disable unavailable measures", () => {
  const sourceBars = bars(360);
  const ohlc = sourceBars.map(({ volume, ...bar }) => bar);
  const ohlcPacket = packet({
    dataShape: "ohlcv", bars: ohlc,
    parameters: { ...packet().parameters, bandMa: "VWMA" }
  });
  const normalizedOhlc = Model.normalizePacket(ohlcPacket);
  assert.equal(Object.hasOwn(normalizedOhlc.bars[0], "volume"), false, "missing volume remains absent");
  const ohlcResult = Model.evaluate(ohlcPacket);
  assert.equal(ohlcResult.dataShape, "ohlc", "observed fields outrank a stale declared shape");
  assert.equal(ohlcResult.volumeAvailable, false);
  assert.equal(ohlcResult.vfi.available, false);
  assert.equal(ohlcResult.vfi.value, null);
  assert.equal(ohlcResult.vfi.signal, null);
  assert.equal(ohlcResult.signals.priceOnly, true);
  assert.equal(ohlcResult.chartSeries.at(-1).volume, null, "no zero-volume series is fabricated for charts");
  assert.equal(ohlcResult.status, "partial");
  const smaResult = Model.evaluate(packet({
    bars: ohlc,
    parameters: { ...packet().parameters, bandMa: "SMA" }
  }));
  assert.equal(ohlcResult.bands.basis, smaResult.bands.basis, "VWMA falls back to SMA when volume is absent");

  const closeOnly = sourceBars.map(({ time, close, confirmed }) => ({ time, close, confirmed }));
  const scalar = Model.evaluate(packet({
    dataShape: "ohlcv", quoteCurrency: "USD/barrel", bars: closeOnly
  }));
  assert.equal(scalar.dataShape, "value");
  assert.equal(scalar.quoteCurrency, "USD/barrel");
  assert.equal(scalar.volumeAvailable, false);
  assert.equal(scalar.vfi.available, false);
  assert.equal(scalar.chartSeries.at(-1).volume, null);
  assert.equal(Object.hasOwn(Model.normalizePacket(packet({ bars: closeOnly })).bars[0], "open"), false);

  const partialOhlc = Model.normalizePacket(packet({ bars: [{
    time: "2026-09-30T12:00:00.000Z", open: 10, close: 11, confirmed: true
  }] }));
  assert.equal(partialOhlc.bars.length, 0, "a partial OHLC tuple is rejected rather than completed with made-up prices");
});

test("VFI, Fibonacci bands, and WaveTrend calculate separate price-volume context without a score", () => {
  const result = Model.evaluate(packet());
  assert.equal(result.status, "ready");
  assert.equal(result.symbol, "TEST-SYNTH");
  assert.equal(result.synthetic, true);
  assert.equal(result.vfi.ready, true);
  assert.ok(Number.isFinite(result.vfi.value));
  assert.ok(Number.isFinite(result.vfi.signal));
  assert.ok(result.bands.upper1000 > result.bands.basis);
  assert.ok(result.bands.basis > result.bands.lower1000);
  assert.ok(Number.isFinite(result.waveTrend.wt1));
  assert.ok(Number.isFinite(result.waveTrend.wt2));
  assert.equal(typeof result.signals.bullishConfluence, "boolean");
  assert.ok(Array.isArray(result.alerts));
  assert.equal(result.chartSeries.length, 240);
  assert.equal(result.chartSeries.at(-1).close, result.close);
  assert.ok(Number.isFinite(result.chartSeries.at(-1).upper1000));
  assert.ok(Number.isFinite(result.chartSeries.at(-1).vfi));
  assert.ok(Number.isFinite(result.chartSeries.at(-1).wt1));
  assert.equal(Object.hasOwn(result, "score"), false);
  assert.match(result.note, /not source credibility, claim truth/);
});

test("Fibonacci Bollinger bands use only natural-log inputs, offsets, and exponentiated price levels", () => {
  const closes = [100, 200, 400];
  const result = Model.evaluate(packet({
    bars: barsFromCloses(closes),
    parameters: { ...packet().parameters, bandLen: 3, bandMult: 1, bandSrc: "close", bandMa: "SMA" }
  }));
  const logValues = closes.map(Math.log);
  const logBasis = logValues.reduce((sum, value) => sum + value, 0) / logValues.length;
  const logDeviation = Math.sqrt(logValues.reduce((sum, value) => sum + (value - logBasis) ** 2, 0) / logValues.length);
  assert.equal(result.bands.method, "log-space");
  assert.equal(result.bands.basis, Number(Math.exp(logBasis).toFixed(4)), "basis is the exponentiated logarithmic SMA, rounded for the public packet");
  assert.equal(result.bands.logDeviation, Number(logDeviation.toFixed(4)), "public log deviation is the population stdev of ln(close), rounded to four decimals");
  for (const [suffix, ratio] of [["236", .236], ["382", .382], ["500", .500], ["618", .618], ["764", .764], ["1000", 1]]) {
    const upper = Math.exp(logBasis + ratio * logDeviation);
    const lower = Math.exp(logBasis - ratio * logDeviation);
    assert.equal(result.bands[`upper${suffix}`], Number(upper.toFixed(4)), `upper ${suffix} exp(log basis + Fib × log deviation)`);
    assert.equal(result.bands[`lower${suffix}`], Number(lower.toFixed(4)), `lower ${suffix} exp(log basis − Fib × log deviation)`);
    closeTo(Math.log(result.bands[`upper${suffix}`]) - Math.log(result.bands.basis), ratio * logDeviation,
      `upper/lower ${suffix} symmetry in log space`, 1e-5);
    closeTo(Math.log(result.bands.basis) - Math.log(result.bands[`lower${suffix}`]), ratio * logDeviation,
      `lower ${suffix} symmetry in log space`, 1e-5);
  }
  assert.equal(result.chartSeries.at(-1).basis, result.bands.basis, "charts receive the exponentiated log basis");
  assert.match(result.note, /population standard deviation.*ln\(source\).*exponentiate/i);
});

test("all FBB moving-average choices are scale-equivariant because their input is ln(price)", () => {
  const closes = Array.from({ length: 24 }, (_, index) => 120 * Math.exp(index * .015 + Math.sin(index / 2) * .08));
  const originalBars = barsFromCloses(closes);
  const scale = 1e6;
  const scaledBars = originalBars.map(bar => ({
    ...bar, open: bar.open * scale, high: bar.high * scale, low: bar.low * scale, close: bar.close * scale
  }));
  const fields = ["basis", "upper236", "upper382", "upper500", "upper618", "upper764", "upper1000", "lower236", "lower382", "lower500", "lower618", "lower764", "lower1000"];
  for (const bandMa of ["VWMA", "SMA", "EMA", "WMA", "RMA"]) {
    const parameters = { ...packet().parameters, bandLen: 8, bandMult: 2.25, bandSrc: "hlc3", bandMa };
    const original = Model.evaluate(packet({ bars: originalBars, parameters }));
    const scaled = Model.evaluate(packet({ bars: scaledBars, parameters }));
    assert.equal(original.bands.method, "log-space");
    for (let index = 0; index < original.chartSeries.length; index += 1) {
      for (const field of fields) {
        const value = original.chartSeries[index][field];
        const scaledValue = scaled.chartSeries[index][field];
        if (value === null) assert.equal(scaledValue, null, `${bandMa} ${field} preserves warm-up at ${index}`);
        else closeTo(scaledValue, value * scale, `${bandMa} ${field} scales with price at ${index}`, 1e-6);
      }
    }
  }
});

test("nonpositive or unrepresentable log-price windows never publish fabricated FBB levels", () => {
  const parameters = { ...packet().parameters, bandLen: 3, bandMult: 50, bandSrc: "close", bandMa: "SMA" };
  const nonpositiveBars = [-2, 0, -1].map((close, index) => ({
    time: new Date(NOW + index * 60_000).toISOString(), close, confirmed: true
  }));
  const nonpositive = Model.evaluate(packet({ bars: nonpositiveBars, parameters }));
  assert.equal(nonpositive.bands, null, "ln is never applied to zero or negative prices");
  assert.equal(nonpositive.chartSeries.at(-1).upper1000, null);
  assert.equal(nonpositive.chartSeries.at(-1).lower1000, null);

  const extreme = Model.evaluate(packet({ bars: barsFromCloses([1e-250, 1, 1e250]), parameters }));
  assert.equal(extreme.bands, null, "overflowing exp(log-band) results are held, not emitted as Infinity or zero");
  assert.equal(extreme.chartSeries.at(-1).upper1000, null);
});

test("confirmed-close setting suppresses current-bar events until the bar is confirmed", () => {
  const result = Model.evaluate(packet({ bars: bars(360, { unconfirmedLast: true }) }));
  assert.equal(result.signals.barClosePending, true);
  assert.equal(result.signals.bullishConfluence, false);
  assert.equal(result.signals.bearishConfluence, false);
  assert.equal(result.waveTrend.signals.bullishCross, false);
  assert.equal(result.waveTrend.signals.bearishCross, false);
  assert.equal(result.alerts.length, 0);
});

test("higher-timeframe mode refuses to substitute chart-timeframe values when HTF bars are absent", () => {
  const result = Model.evaluate(packet({ parameters: { ...packet().parameters, useCustomTF: true, customTF: "240" } }));
  assert.equal(result.waveTrend.ready, false);
  assert.equal(result.waveTrend.timeframeStatus, "higher-timeframe candles unavailable");
  assert.equal(result.waveTrend.wt1, null);
});

test("higher-timeframe mode maps only confirmed supplied candles onto the base series", () => {
  const baseBars = bars(360, { interval: 15 * 60_000, start: NOW - 359 * 15 * 60_000 });
  const higherTimeframeBars = bars(120, { interval: 60 * 60_000, start: NOW - 119 * 60 * 60_000 });
  const result = Model.evaluate(packet({
    bars: baseBars,
    higherTimeframeBars,
    parameters: { ...packet().parameters, useCustomTF: true, customTF: "60" }
  }));
  assert.equal(result.waveTrend.ready, true);
  assert.equal(result.waveTrend.timeframeStatus, "confirmed higher timeframe · 60");
  assert.ok(Number.isFinite(result.waveTrend.wt1));
});

test("empty.domains API supplies eight clearly synthetic ticker series for line-chart rendering", async () => {
  const response = await handleGoodIntelligenceDemo(
    new Request("https://empty.domains/api/good-intelligence/v1/content/me"), NOW
  );
  const payload = await response.json();
  const fixtures = payload.data.filter(item => item.marketContext);
  assert.equal(fixtures.length, 8);
  assert.deepEqual(fixtures.map(item => item.marketContext.symbol), [
    "AAPL-DEMO", "MSFT-DEMO", "NVDA-DEMO", "INTC-DEMO", "AMD-DEMO", "MU-DEMO", "CVX-DEMO", "XOM-DEMO"
  ]);
  for (const fixture of fixtures) {
    assert.match(fixture.title, /^\[DEMO\]/);
    assert.equal(fixture.demo, true);
    assert.equal(fixture.marketContext.synthetic, true);
    const result = Model.evaluate(fixture.marketContext);
    assert.equal(result.status, "ready");
    assert.equal(result.symbol, fixture.marketContext.symbol);
    assert.equal(result.barCount, 360);
    assert.equal(result.synthetic, true);
    assert.equal(result.chartSeries.length, 240);
    assert.equal(result.chartSeries.at(-1).close, result.close);
  }
});
