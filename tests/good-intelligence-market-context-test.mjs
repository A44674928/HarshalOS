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

test("market context accepts only the versioned packet and bounds normalized OHLCV", () => {
  assert.equal(Model.normalizePacket({ schema: "unknown", bars: bars(2) }), null);
  const unsafe = packet({ bars: [
    ...bars(3),
    { time: "2026-09-30T12:00:00Z", open: 3, high: 2, low: 1, close: 2, volume: 5 },
    { time: "2026-09-30T13:00:00Z", open: 1, high: 2, low: 0, close: 2, volume: 5 },
    { time: "2026-09-30T14:00:00Z", open: 1, high: 2, low: 0.5, close: 1.5, volume: null }
  ] });
  const normalized = Model.normalizePacket(unsafe);
  assert.equal(normalized.bars.length, 3);
  assert.ok(normalized.bars.every(bar => bar.high >= Math.max(bar.open, bar.close) && bar.low <= Math.min(bar.open, bar.close)));
  assert.equal(Model.normalizeParameters({ vfiLen: 99999 }).vfiLen, 1000);
  assert.equal(Model.normalizeParameters({ bandMa: "INVALID" }).bandMa, "VWMA");
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

test("empty.domains API supplies three clearly synthetic ticker series for line-chart rendering", async () => {
  const response = await handleGoodIntelligenceDemo(
    new Request("https://empty.domains/api/good-intelligence/v1/content/me"), NOW
  );
  const payload = await response.json();
  const fixtures = payload.data.filter(item => item.marketContext);
  assert.equal(fixtures.length, 3);
  assert.deepEqual(fixtures.map(item => item.marketContext.symbol), ["AAPL-DEMO", "MSFT-DEMO", "NVDA-DEMO"]);
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
