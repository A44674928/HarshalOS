/* Guards for the Good Intelligence TradingView tab: the vendored Apache-2.0
   Lightweight Charts™ build, the tab's place in index.html, the Tickerbot Live
   default, and the pure data/option translation that feeds the library. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, ROOT), "utf8");
const readBuffer = path => readFile(new URL(path, ROOT));

const VENDOR_FILE = "js/vendor/lightweight-charts/lightweight-charts.standalone.production.js";
const VENDOR_LICENSE = "js/vendor/lightweight-charts/LICENSE";
const VENDOR_PROVENANCE = "js/vendor/lightweight-charts/PROVENANCE.md";
const VENDOR_SHA256 = "e21cc5caa0226ef30bd8549c50b9ef926615f2a4ee6b4e486353477a55f598cf";

const moduleSource = await readText("js/good-intelligence-tradingview.js");
const appSource = await readText("js/apps-good-intelligence.js");
const indexHtml = await readText("index.html");
const vendorSource = await readText(VENDOR_FILE);
const provenance = await readText(VENDOR_PROVENANCE);
const license = await readText(VENDOR_LICENSE);

const FAKE_API = {
  CandlestickSeries: { type: "candlestick" },
  BarSeries: { type: "bar" },
  LineSeries: { type: "line" },
  AreaSeries: { type: "area" },
  BaselineSeries: { type: "baseline" },
  HistogramSeries: { type: "histogram" },
  createChart() { return { removed: false, remove() { this.removed = true; } }; },
  createSeriesMarkers(series, markers) { return { series, markers }; },
  version: () => "5.2.1"
};

function harness(api) {
  const window = {};
  if (api !== undefined) window.LightweightCharts = api;
  const context = vm.createContext({ window, Date, Math, Number, JSON, Map, Set, Array, Object, String });
  vm.runInContext(moduleSource, context, { filename: "js/good-intelligence-tradingview.js" });
  return window.GoodIntelligenceTradingView;
}

const START = Date.parse("2026-09-30T00:00:00.000Z");
function bars(count = 12, { interval = 60 * 60_000 } = {}) {
  return Array.from({ length: count }, (_, index) => {
    const open = 100 + index;
    const close = open + (index % 2 ? -0.6 : 0.9);
    return {
      time: START + index * interval,
      open, close,
      high: Math.max(open, close) + 0.4,
      low: Math.min(open, close) - 0.4,
      volume: 1000 + index * 10,
      confirmed: index < count - 1
    };
  });
}

test("the vendored TradingView library is the reviewed, unmodified Apache-2.0 build", async () => {
  const bytes = await readBuffer(VENDOR_FILE);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), VENDOR_SHA256, "the vendored build matches the recorded SHA-256");
  assert.match(vendorSource.slice(0, 400), /TradingView Lightweight Charts™ v5\.2\.1/, "the upstream version banner is retained");
  assert.match(vendorSource.slice(0, 400), /Apache License 2\.0/, "the upstream license banner is retained");
  assert.match(license, /Apache License/, "the Apache-2.0 license text ships with the vendored file");
  assert.match(provenance, new RegExp(VENDOR_SHA256), "PROVENANCE.md records the same SHA-256 the test checks");
  assert.match(provenance, /https:\/\/www\.tradingview\.com\/free-charting-libraries\//, "PROVENANCE.md cites the free charting libraries page");
  assert.match(provenance, /Modifications \| None/, "the copy is recorded as unmodified");
  assert.ok(vendorSource.length > 100_000, "the standalone production build is the real library, not a stub");
  assert.doesNotMatch(vendorSource, /unpkg\.com|cdn\.jsdelivr\.net/, "the vendored file does not pull a second copy from a CDN");
});

test("index.html loads the vendored library and adapter locally, before the app", () => {
  const vendorAt = indexHtml.indexOf(`src="${VENDOR_FILE}?v=5.2.1"`);
  const adapterAt = indexHtml.indexOf("js/good-intelligence-tradingview.js");
  const appAt = indexHtml.indexOf("js/apps-good-intelligence.js");
  assert.ok(vendorAt !== -1, "index.html references the vendored Lightweight Charts™ build");
  assert.ok(adapterAt !== -1, "index.html references the TradingView adapter module");
  assert.ok(vendorAt < adapterAt && adapterAt < appAt, "the library and adapter load before the Good Intelligence app");
  assert.doesNotMatch(indexHtml, /<script[^>]+src="https?:\/\//, "every script the page loads is same-origin — no third-party CDN at runtime");
});

test("TradingView stays immediately after Market Charts while Orb 2 follows as a fifth tab", () => {
  const marketsTab = appSource.indexOf('data-gi-view="markets"');
  const tvTab = appSource.indexOf('data-gi-view="tradingview"');
  const orbTab = appSource.indexOf('data-gi-view="orb2"');
  assert.ok(marketsTab !== -1 && tvTab !== -1 && orbTab !== -1, "all three tab buttons exist");
  assert.ok(marketsTab < tvTab && tvTab < orbTab, "TradingView follows Market Charts and Orb 2 follows TradingView");
  assert.equal(appSource.match(/data-gi-view="markets"/g).length, 1, "Market Charts keeps one tab button");
  assert.equal(appSource.match(/data-gi-view="tradingview"/g).length, 1, "TradingView has exactly one tab button");
  assert.equal(appSource.match(/data-gi-view="orb2"/g).length, 1, "Orb 2 has exactly one tab button");
  assert.match(appSource, /<button type="button" class="gi-tab" data-gi-view="markets"[^>]*>Market Charts<\/button>/, "the Market Charts tab keeps its title");
  assert.match(appSource, /<button type="button" class="gi-tab" data-gi-view="tradingview"[^>]*>TradingView<\/button>/, "the TradingView tab is titled TradingView");
  assert.match(appSource, /<button type="button" class="gi-tab" data-gi-view="orb2"[^>]*>Orb 2<\/button>/, "the local OCM tab is titled Orb 2");
  assert.match(appSource, /data-gi-tv-panel[^>]*hidden/, "the TradingView panel starts hidden until its tab is opened");
  assert.match(appSource, /data-gi-orb2-panel[^>]*hidden/, "the Orb 2 panel starts hidden until selected");
  assert.match(appSource, /\["news", "markets", "tradingview", "orb2"\]\.includes/, "the view switcher accepts both newer tabs");
});

test("Tickerbot Live is the first and default data source on both chart panels", () => {
  assert.match(appSource, /marketProvider: "tickerbot"/, "the app state defaults to Tickerbot Live");
  for (const attribute of ["data-gi-market-provider", "data-gi-tv-provider"]) {
    const select = appSource.match(new RegExp(`<select ${attribute}[^>]*>(.*?)</select>`))[1];
    const tickerbotAt = select.indexOf('<option value="tickerbot" selected>Tickerbot Live</option>');
    const demoAt = select.indexOf('<option value="demo">Synthetic demo</option>');
    assert.ok(tickerbotAt !== -1, `${attribute} offers Tickerbot Live as the selected first option`);
    assert.equal(tickerbotAt, 0, `${attribute} lists Tickerbot Live before any other option`);
    assert.ok(demoAt > tickerbotAt, `${attribute} keeps Synthetic demo available as an explicit choice`);
  }
});

test("the tab only draws supplied OHLCV and never calls a TradingView data service", () => {
  assert.match(appSource, /TradingView\.chartData\(record\.packet && record\.packet\.bars/, "chart data comes from the fetched/normalized packet");
  assert.match(appSource, /messageBlock\("No candles to draw"/, "a packet without valid bars renders an empty state");
  assert.match(appSource, /messageBlock\("TradingView library not loaded"/, "a missing library renders a refusal instead of a blank chart");
  assert.match(appSource, /ensureMarketData/, "both panels share the same keyed OHLCV cache");
  assert.doesNotMatch(appSource, /fetch\([^)]*tradingview/i, "the app never fetches from a TradingView service");
  assert.doesNotMatch(appSource, /api\.tradingview|widget\.tradingview|advanced-charts|charting_library/i, "no proprietary TradingView widget or data feed is embedded");
  assert.match(appSource, /TradingView\.LIBRARY\.homepage/, "the panel credits the free charting libraries page");
});

test("the adapter reports availability from the bundled global and degrades honestly", () => {
  const missing = harness();
  assert.equal(missing.availability().available, false);
  assert.match(missing.availability().reason, /did not load/);
  assert.equal(missing.resolveSeries(undefined, "candles"), null);

  const model = harness(FAKE_API);
  assert.equal(model.availability().available, true);
  assert.equal(model.availability().version, "5.2.1");
  assert.match(model.describe(), /TradingView Lightweight Charts™ v5\.2\.1 · Apache-2\.0/);
  assert.equal(model.LIBRARY.vendored, VENDOR_FILE);
});

test("series resolution supports the v5 API and the pre-v5 method names", () => {
  const model = harness(FAKE_API);
  const modern = model.resolveSeries(FAKE_API, "candles");
  assert.equal(modern.mode, "addSeries");
  assert.equal(modern.definition, FAKE_API.CandlestickSeries);
  assert.equal(model.resolveSeries(FAKE_API, "unknown-type").type.id, "candles", "an unknown type falls back to candlesticks");

  const legacyApi = { addLineSeries() {}, version: () => "4.2.0" };
  const legacy = model.resolveSeries(legacyApi, "line");
  assert.equal(legacy.mode, "legacy");
  assert.equal(legacy.method, "addLineSeries");
  assert.equal(model.resolveSeries({ version: () => "3.0.0" }, "line"), null, "an unsupported build is reported, not guessed at");
});

test("chart data is validated, deduplicated, ordered, and never repaired", () => {
  const model = harness(FAKE_API);
  const unsafe = [
    ...bars(3),
    { time: START + 60 * 60_000, open: 999, high: 1000, low: 998, close: 999.5, volume: 5 }, // duplicate time: last wins
    { time: START + 4 * 60 * 60_000, open: 10, high: 9, low: 8, close: 9.5, volume: 5 },      // high < low
    { time: START + 5 * 60 * 60_000, open: 10, high: 11, low: 9, close: 10, volume: null },   // missing volume is not a bar
    { time: "2026-09-30T06:00:00Z", open: 10, high: 11, low: 9, close: 10, volume: 5 }        // string time is not a bar
  ];
  const data = model.chartData(unsafe);
  assert.equal(data.count, 3, "invalid rows are dropped rather than repaired");
  assert.deepEqual(
    data.candles.map(row => row.time),
    [0, 1, 2].map(index => Math.floor((START + index * 60 * 60_000) / 1000)),
    "times are UTC seconds, ascending and unique"
  );
  assert.equal(data.candles[1].open, 999, "a duplicate timestamp keeps the last row supplied for that bar");
  assert.equal(data.bars.at(-1).confirmed, false, "the still-forming bar keeps its confirmed flag");
  assert.equal(data.volumes.length, 3);
  assert.match(data.volumes[0].color, /rgba/, "volume bars are colored from the bar direction");
  assert.equal(model.chartData(null).count, 0);
  assert.equal(model.chartData(bars(50), { limit: 1 }).count, 2, "the library needs at least two points, so the floor is two");
  assert.equal(model.chartData(bars(50), { limit: 99999 }).count, 50);
  assert.ok(model.chartData(bars(600)).count <= model.MAX_CHART_BARS, "the drawn series stays bounded");
});

test("line, area, and baseline series receive close-only data", () => {
  const model = harness(FAKE_API);
  const data = model.chartData(bars(5));
  const candles = model.seriesData("candles", data.candles);
  assert.deepEqual(Object.keys(candles[0]).sort(), ["close", "high", "low", "open", "time"]);
  for (const type of ["line", "area", "baseline"]) {
    const rows = model.seriesData(type, data.candles);
    assert.deepEqual(Object.keys(rows[0]).sort(), ["time", "value"], `${type} series gets ${type}-appropriate rows`);
    assert.equal(rows.at(-1).value, data.candles.at(-1).close);
  }
});

test("markers stay attached to real bars and respect the confirmed-bar boundary", () => {
  const model = harness(FAKE_API);
  const data = model.chartData(bars(6));
  const forming = {
    signals: { barClosePending: true, bullishConfluence: true },
    waveTrend: { signals: { bullishCross: true } },
    recentDivergences: []
  };
  assert.deepEqual(model.markers(forming, data.bars), [], "a still-forming bar gets no signal marker");

  const closed = {
    signals: { barClosePending: false, bullishConfluence: true, bearishConfluence: false },
    waveTrend: { signals: { bullishCross: true, bearishCross: false } },
    recentDivergences: [
      { type: "Regular bearish", time: data.bars[1].time * 1000 },
      { type: "Regular bullish", time: START + 99 * 60 * 60_000 }
    ]
  };
  const markers = model.markers(closed, data.bars);
  const times = new Set(data.bars.map(row => row.time));
  assert.ok(markers.length > 0, "confirmed signal bars are marked");
  assert.ok(markers.every(marker => times.has(marker.time)), "no marker points at a bar that is not drawn");
  assert.deepEqual(markers.map(marker => marker.time), markers.map(marker => marker.time).slice().sort((a, b) => a - b));
  assert.ok(markers.some(marker => marker.text === "Regular bearish WaveTrend divergence" && marker.position === "aboveBar"),
    "a bearish divergence is drawn above its own bar");
  assert.equal(markers.at(-1).position, "belowBar", "the latest confluence marker sits below the bar");
  assert.ok(model.markers(closed, data.bars, 1).length <= 1, "markers stay bounded");
  assert.equal(model.attachMarkers(FAKE_API, {}, []), null, "no markers means no plugin");
});

test("chart options keep the desk theme and disable the TradingView logo", () => {
  const model = harness(FAKE_API);
  const options = model.chartOptions();
  assert.equal(options.autoSize, true, "the chart follows its container");
  assert.equal(options.layout.attributionLogo, false, "no TradingView logo is drawn by a non-TradingView data feed");
  assert.equal(options.layout.background.color, "#0b1424");
  assert.ok(options.crosshair && options.timeScale && options.grid, "interaction options are explicit");
  const candles = model.seriesOptions("candles", {});
  assert.equal(candles.upColor, "#54d6b4");
  assert.equal(candles.downColor, "#e87487");
  const baseline = model.seriesOptions("baseline", { basePrice: 101.5 });
  assert.equal(baseline.baseValue.type, "price");
  assert.equal(baseline.baseValue.price, 101.5);
  const volume = model.volumeOptions();
  assert.equal(volume.priceFormat.type, "volume");
  assert.equal(volume.priceScaleId, "", "volume shares the price scale margins instead of splitting the pane");
});
