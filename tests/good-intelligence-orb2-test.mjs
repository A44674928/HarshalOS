/* Orb 2 renders the server-side beat field: the Worker's cron schedule beats the
   instruments, this page dials the beat types and ticker focus it wants to see,
   and no browser code calls a provider. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { Window } from "happy-dom";

const ROOT = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, ROOT), "utf8");
const castSource = await readText("js/characters-cast.js");
const beatSource = await readText("js/characters-beat.js");
const catalogSource = await readText("js/characters-disc-catalog.js");
const marketSource = await readText("js/good-intelligence-market-context.js");
const dsSource = await readText("js/good-intelligence-dxy.js");
const rosterSource = await readText("js/good-intelligence-market-roster.js");
const scenariosSource = await readText("js/good-intelligence-orb2-scenarios.js");
const orbSource = await readText("js/good-intelligence-orb2.js");
const appSource = await readText("js/apps-good-intelligence.js");
const charactersAppSource = await readText("js/apps-characters.js");
const indexHtml = await readText("index.html");
const appCss = await readText("css/good-intelligence.css");
const workerSource = await readText("worker/good-intelligence-orb2-beats.mjs");

const NOW = Date.parse("2026-10-05T12:00:00.000Z");
const flush = async () => { for (let turn = 0; turn < 45; turn++) await Promise.resolve(); };

const rosterSandbox = { window: {} };
rosterSandbox.globalThis = rosterSandbox.window;
vm.runInNewContext(rosterSource, rosterSandbox, { filename: "js/good-intelligence-market-roster.js" });
const MARKET_ROSTER = rosterSandbox.window.GoodIntelligenceMarketRoster.assets;


test("the reviewed stock roster explicitly places SPCX in the formation race", () => {
  const spcx = MARKET_ROSTER.find(asset => asset.symbol === "SPCX");
  const tmo = MARKET_ROSTER.find(asset => asset.symbol === "TMO");
  assert.equal(spcx?.marketStage, "formation");
  assert.equal(tmo?.marketStage, "established");
});

function harness() {
  const window = {};
  const context = vm.createContext({ window, globalThis: window, Object, Array, String, Number, Math, Set, Map });
  vm.runInContext(castSource, context, { filename: "js/characters-cast.js" });
  vm.runInContext(beatSource, context, { filename: "js/characters-beat.js" });
  vm.runInContext(catalogSource, context, { filename: "js/characters-disc-catalog.js" });
  vm.runInContext(dsSource, context, { filename: "js/good-intelligence-dxy.js" });
  vm.runInContext(rosterSource, context, { filename: "js/good-intelligence-market-roster.js" });
  vm.runInContext(scenariosSource, context, { filename: "js/good-intelligence-orb2-scenarios.js" });
  vm.runInContext(orbSource, context, { filename: "js/good-intelligence-orb2.js" });
  return { cast: window.CharactersCast, orb: window.GoodIntelligenceOrb2, scenarios: window.GoodIntelligenceOrb2Scenarios };
}

/* ── the stored server field, as the Worker writes it ─────────────────────── */


function raceObservation({ symbol = "TMO", interval = "1d", barCount = 240, compositionPosition = null, marketOverrides = {} } = {}) {
  const market = { ...marketSummary(interval, "tickerbot"), barCount, ...marketOverrides };
  return {
    symbol, discId: "stocks", interval, market,
    ...(compositionPosition === null ? {} : { composition: { composedPosition: compositionPosition } })
  };
}

test("dual market races keep FBB-dependent established tickers separate from formation tickers", () => {
  const { orb } = harness();
  const tmo = orb.marketRacePosition(
    { symbol: "TMO", marketStage: "established" },
    raceObservation({ symbol: "TMO", compositionPosition: 0.94 })
  );
  const spcx = orb.marketRacePosition(
    { symbol: "SPCX", marketStage: "formation" },
    raceObservation({ symbol: "SPCX", barCount: 8, marketOverrides: { changePct: 4 } })
  );
  assert.equal(tmo.eligible, true);
  assert.equal(tmo.progress, 0.94);
  assert.equal(spcx.eligible, true);
  assert.ok(spcx.progress > 0 && spcx.progress < 0.5);
  assert.equal(spcx.trackPosition, 1 - spcx.progress);
  assert.equal(spcx.fbbId, null);
});

test("missing FBB holds an established ticker instead of reclassifying it as an IPO", () => {
  const { orb } = harness();
  const held = orb.marketRacePosition(
    { symbol: "ABC", marketStage: "established" },
    { symbol: "ABC", discId: "stocks", interval: "1d", market: { barCount: 12, latestBar: { close: 101 }, changePct: 2 } }
  );
  assert.equal(held.eligible, false);
  assert.equal(held.status, "held");
  assert.equal(held.reason, "fbb-history-unavailable");
});

test("FBB-L60 availability marks a formation ticker ready for graduation without fabricating FBB-200", () => {
  const { orb } = harness();
  const observation = raceObservation({
    symbol: "SPCX",
    barCount: 60,
    marketOverrides: {
      fbbVariants: {
        "FBB-L60": { id: "FBB-L60", status: "available" },
        "FBB-200": { id: "FBB-200", status: "insufficient-history" }
      }
    }
  });
  const row = orb.marketRacePosition({ symbol: "SPCX", marketStage: "formation" }, observation);
  assert.equal(row.graduationReady, true);
  assert.equal(row.fbbId, "FBB-L60");
  assert.equal(row.status, "graduation-ready");
});

test("the stock Disc renders the dual race board and isolates SPCX in the formation field", async t => {
  let fixtureWindow;
  const { host, fieldCalls } = interactiveHarness(t, {
    tickers: MARKET_ROSTER,
    watchlist: MARKET_ROSTER,
    fieldHandler: () => Response.json({ success: true, data: fieldSnapshot(fixtureWindow, { stockCount: 52 }) })
  });
  fixtureWindow = host.ownerDocument.defaultView;
  await flush();
  const board = host.querySelector("[data-gi-orb2-raceboard]");
  assert.ok(board, "the dual race board is mounted");
  assert.equal(board.hidden, false, "the stock Disc shows both race lanes");
  assert.ok(host.querySelector('[data-gi-orb2-race-formation-markers] [data-race-symbol="SPCX"]'), "SPCX is isolated in the formation lane");
  assert.equal(host.querySelectorAll('[data-gi-orb2-race-established-markers] [data-race-symbol="SPCX"]').length, 0, "SPCX never enters the established lane while classified as formation");
  assert.ok(fieldCalls().length >= 1, "the race board uses the stored field rather than a provider call");
});
test("the established and formation lanes approach each other from opposite ends", () => {
  const { orb } = harness();
  const snapshot = orb.buildMarketRaceSnapshot(
    [
      { symbol: "TMO", marketStage: "established" },
      { symbol: "SPCX", marketStage: "formation" }
    ],
    new Map([
      ["tmo", raceObservation({ symbol: "TMO", compositionPosition: 0.96 })],
      ["spcx", raceObservation({ symbol: "SPCX", barCount: 30 })]
    ])
  );
  assert.equal(snapshot.established[0].entry.symbol, "TMO");
  assert.equal(snapshot.established[0].race.trackPosition, 0.96);
  assert.ok(snapshot.formation[0].race.trackPosition < 1);
  assert.ok(snapshot.formation[0].race.trackPosition > 0);
  assert.equal(snapshot.formation[0].race.trackPosition, 1 - snapshot.formation[0].race.progress);
});

function marketSummary(interval = "1d", provider = "massive") {
  return {
    status: "ready", source: `${provider} · reviewed OHLCV · as of ${new Date(NOW).toISOString()}`,
    timeframe: interval, dataShape: "ohlcv", synthetic: false, barCount: 80, volumeAvailable: true,
    latestBar: { time: NOW, open: 100, high: 102, low: 99.5, close: 101, volume: 1200, confirmed: true },
    previousClose: 100, changePct: 1,
    basis: 99, bands: { lower1000: 92, upper1000: 108 },
    vfi: { value: 12, signal: 4, available: true },
    waveTrend: { wt1: 20, wt2: 8, zone: "neutral" }
  };
}

function fieldRow(window, symbol, options = {}) {
  const { discId = "stocks", interval = "1d", confirmed = true, market = true, name = symbol, sector = "Technology & platforms" } = options;
  const provider = options.provider || (discId === "stocks" ? "tickerbot" : discId === "crypto" ? "kraken" : "massive");
  const marketData = market ? marketSummary(interval, provider) : null;
  if (marketData && options.activityBar) marketData.activityBar = { ...options.activityBar };
  return {
    schema: "gi-orb2-field-observation-v1", symbol, displaySymbol: options.displaySymbol || symbol, name, sector, discId, provider, interval,
    ...(options.krakenPair ? {
      krakenPair: options.krakenPair, providerId: options.providerId || options.krakenPair,
      rankingProvider: "Kraken", baseAsset: options.baseAsset, quoteAsset: options.quoteAsset
    } : {}),
    status: market ? "bars" : "unavailable", reason: "server-sweep", code: options.code || "", message: options.message || "",
    beatId: options.beatId || "3f2504e0-4f89-41d3-9a0c-0305e82c3301", observedAt: options.observedAt || NOW, barTime: NOW, confirmed,
    market: marketData,
    motion: window.CharactersBeat.motion(null, { bearingBase: 0 }),
    ...(options.freshness ? { freshness: options.freshness } : {}),
    beatTypes: market ? ["observation", "message", "trade", "authorization", "permission"] : ["observation", "message"]
  };
}

function fieldSnapshot(window, { fxCount = 6, stockCount = 52, interval = "1d", types = ["observation"], additionalRows = [], discStatus = null } = {}) {
  const fxSymbols = Array.from(window.GoodIntelligenceDollarStrength.COMPONENTS, component => component.symbol);
  const stocks = Array.from(window.GoodIntelligenceDollarStrength.buildFiringOrder(MARKET_ROSTER), asset => asset.symbol);
  const observations = [
    ...fxSymbols.slice(0, fxCount).map(symbol => fieldRow(window, symbol, { discId: "fx", provider: "massive" })),
    ...stocks.slice(0, stockCount).map(symbol => fieldRow(window, symbol, { discId: "stocks", provider: "tickerbot" })),
    ...additionalRows
  ];
  const counts = { observation: observations.length, message: observations.length, trade: observations.length, authorization: observations.length, permission: observations.length };
  return {
    ok: true, schema: "gi-orb2-field-v1", generatedAt: new Date(NOW).toISOString(), interval, disc: "all",
    requestedTypes: types,
    beatTypes: ["observation", "message", "trade", "authorization", "permission"].map(id => ({
      id, label: id, live: id === "observation", available: counts[id] > 0, count: counts[id],
      source: id === "observation" ? "server-provider-beat" : "deterministic-local-scenario"
    })),
    status: {
      schema: "gi-orb2-field-status-v1", source: "server-field", continuous: true, cron: "*/1 * * * *", pollAfterMs: 20_000,
      interval, lastTickAt: NOW, lastObservationAt: NOW, sweepsCompleted: 1, lastError: "",
      massive: { callsToday: 12, perMinute: 5, dailyLimit: 300, remainingToday: 288, exhausted: false, ledger: "ready", note: "" },
      tickerbot: { callsToday: 40, callsThisMonth: 40, monthlyLimit: 10_000, reserveCalls: 1500, exhausted: false, ledger: "ready", note: "" },
      queue: { pending: 0, claiming: 0, exhausted: 0 },
      warmBurst: { callsPerBurst: 156, perTick: 24, bursts: 1, deployWarmAt: NOW, manualWarmAt: null, coldAfterMs: 21_600_000 },
      counts: { stored: observations.length, observed: observations.length, confirmed: observations.length, held: 0, reviewedInstruments: 90 },
      ...(Array.isArray(discStatus) ? { discs: discStatus } : {})
    },
    ds: { ok: true, status: "ready", value: 99.123, asOf: NOW, missing: [], refreshSymbol: null },
    observations
  };
}

function interactiveHarness(t, { historyStore = new Map(), sessionId, preferences, tickers = null, watchlist = MARKET_ROSTER, timeframe = "1d", clock = null, fieldHandler = null, cryptoPayload = null } = {}) {
  const window = new Window({ url: "https://os.example/", settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  if (clock) window.Date.now = () => clock.now;
  t.after(() => window.happyDOM.abort());
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  if (sessionId) window.localStorage.setItem("harshalos.good-intelligence.orb2.session.v1", sessionId);
  if (preferences) window.localStorage.setItem("harshalos.good-intelligence.orb2.preferences.v1", JSON.stringify(preferences));
  let frameId = 0;
  const frames = [];
  window.requestAnimationFrame = callback => { frames.push(callback); return ++frameId; };
  window.cancelAnimationFrame = () => {};
  const calls = [];
  const providerCalls = [];
  window.fetch = async (url, options = {}) => {
    const path = String(url);
    calls.push({ url: path, options });
    if (path.includes("/api/good-intelligence/v1/orb2/field")) {
      if (fieldHandler) return fieldHandler(path, options);
      if (options.method === "POST") {
        let action = null;
        try { action = JSON.parse(options.body || "{}").action; } catch { /* assertions catch malformed bodies */ }
        return Response.json({
          success: true, environment: "orb2-server-field",
          data: {
            schema: "gi-orb2-field-request-v1", action, interval: "1d",
            summary: { massiveCalls: action === "tick" ? 5 : 0, tickerbotCalls: 0, observed: action === "tick" ? 5 : 0, held: 0, queueClaimed: 0, queueCompleted: 0, warmEnqueued: 0, sweepsCompleted: 0 },
            notes: action === "warm" ? [] : [], marketRequestSent: action === "tick",
            enqueued: action === "warm" ? 156 : action === "priority" ? 2 : undefined,
            callsPerBurst: 156, message: action === "warm" ? "156 Tickerbot warm-burst jobs queued; 24 drain per scheduled tick." : undefined
          }
        });
      }
      return Response.json({ success: true, environment: "orb2-server-field", data: fieldSnapshot(window) });
    }
    if (path.includes("/api/good-intelligence/v1/orb2/beats")) {
      const requestUrl = new URL(path, window.location.href);
      const requestSession = requestUrl.searchParams.get("sessionId");
      if (options.method === "POST") {
        try {
          const event = JSON.parse(options.body);
          const saved = historyStore.get(requestSession) || [];
          historyStore.set(requestSession, [...saved.filter(item => item.beatId !== event.beatId), event].sort((left, right) => left.at - right.at).slice(-120));
        } catch { /* assertions catch malformed persisted records */ }
        return Response.json({ success: true, stored: true });
      }
      return Response.json({ success: true, schema: "gi-orb2-beat-history-v1", beats: historyStore.get(requestSession) || [] });
    }
    if (path.includes("/api/characters/v1/discs?disc=crypto")) {
      return Response.json(cryptoPayload || {
        success: true,
        instruments: [{
          symbol: "BTC", displaySymbol: "BTC/USD", name: "BTC", sector: "Cryptocurrency",
          assetClass: "crypto", rankingProvider: "Kraken", providerId: "BTC/USD", krakenPair: "BTC/USD",
          baseAsset: "BTC", quoteAsset: "USD", pairType: "usd"
        }],
        crossPairs: [{
          symbol: "BTC-USDT", displaySymbol: "BTC/USDT", name: "BTC/USDT", sector: "Cryptocurrency pairs",
          assetClass: "crypto", rankingProvider: "Kraken", providerId: "BTC/USDT", krakenPair: "BTC/USDT",
          baseAsset: "BTC", quoteAsset: "USDT", pairType: "cross"
        }],
        ranking: { provider: "Kraken", venue: "Kraken Spot" }
      });
    }
    if (path.includes("/api/characters/v1/beat")) {
      providerCalls.push({ url: path, options });
      return Response.json({ success: false, message: "Orb 2 renders the server field; it does not call a provider beat route." }, { status: 404 });
    }
    return Response.json({ success: false, message: "Unexpected route." }, { status: 404 });
  };
  const canvasCalls = [];
  const canvasDraws = [];
  const gradient = { addColorStop() {} };
  const canvasContext = new Proxy({}, {
    get(target, key) {
      if (key === "createRadialGradient") return () => gradient;
      if (key === "measureText") return () => ({ width: 0 });
      if (key in target) return target[key];
      return (...args) => {
        canvasCalls.push(key);
        if (key === "stroke") canvasDraws.push({
          method: key, strokeStyle: target.strokeStyle, lineWidth: target.lineWidth,
          globalAlpha: target.globalAlpha, lineDash: target.lineDash
        });
        if (key === "fillText") canvasDraws.push({
          method: key, text: String(args[0]), fillStyle: target.fillStyle, font: target.font
        });
      };
    },
    set(target, key, value) { target[key] = value; return true; }
  });
  Object.defineProperty(window.HTMLCanvasElement.prototype, "getContext", { configurable: true, value: () => canvasContext });
  window.eval("var APPS = window.APPS = [];");
  window.APPS.push({ id: "good-intelligence", tickerbotWatchlist: watchlist });
  window.eval(marketSource);
  window.eval(beatSource);
  window.eval(castSource);
  window.eval(catalogSource);
  window.eval(dsSource);
  window.eval(rosterSource);
  window.eval(scenariosSource);
  window.eval(orbSource);
  const host = window.document.createElement("div");
  window.document.body.appendChild(host);
  const engine = window.GoodIntelligenceOrb2.mount(host, {
    roster: window.CharactersCast.NPC_ROSTER, watchlist,
    ...(tickers ? { tickers, timeframe } : {}),
    beat: window.CharactersBeat, cast: window.CharactersCast, discCatalog: window.CharactersDiscCatalog,
    marketContext: window.GoodIntelligenceMarketContext, ds: window.GoodIntelligenceDollarStrength
  });
  const canvas = host.querySelector("[data-gi-orb2-canvas]");
  Object.defineProperties(canvas, {
    offsetParent: { configurable: true, value: host },
    clientWidth: { configurable: true, value: 720 },
    clientHeight: { configurable: true, value: 440 }
  });
  t.after(() => engine.destroy());
  return {
    window, host, engine, calls, providerCalls, historyStore, frames, clock, canvasCalls, canvasDraws,
    sessionId: window.localStorage.getItem("harshalos.good-intelligence.orb2.session.v1"),
    fieldCalls: () => calls.filter(call => call.url.includes("/api/good-intelligence/v1/orb2/field")),
    text: () => host.textContent
  };
}

/* ── pure model functions ─────────────────────────────────────────────────── */

test("Orb 2 renders reviewed ticker labels as distinct hourly and daily orb models", () => {
  const { orb } = harness();
  const tickers = [{ symbol: "AAPL", name: "Apple", sector: "Technology" }, { symbol: "MSFT", name: "Microsoft", sector: "Technology" }];
  const hourly = orb.buildNodes(tickers, "1h");
  const daily = orb.buildNodes(tickers, "1d");
  assert.equal(hourly.length, tickers.length);
  assert.deepEqual(hourly.map(node => node.symbol), ["AAPL", "MSFT"]);
  assert.ok(hourly.every(node => node.visualId === node.symbol && node.id.endsWith("-1h")));
  assert.ok(daily.every(node => node.id.endsWith("-1d")));
  assert.notDeepEqual(hourly.map(node => [node.longitude, node.latitude, node.color]), daily.map(node => [node.longitude, node.latitude, node.color]));
  assert.equal(new Set(hourly.map(node => node.id)).size, hourly.length);
});

test("Orb 2 places observed orbs from market metrics and keeps held packets explicit", () => {
  const { orb } = harness();
  const rising = {
    latestBar: { time: NOW, close: 105, confirmed: true },
    changePct: 2.5, basis: 100, bands: { lower1000: 90, upper1000: 110 },
    vfi: { value: 18, signal: 4, available: true }, waveTrend: { wt1: 26, wt2: 8 }
  };
  const falling = {
    ...rising, latestBar: { ...rising.latestBar, close: 95 }, changePct: -2.5,
    vfi: { value: -12, signal: 4, available: true }, waveTrend: { wt1: -26, wt2: -8 }
  };
  const upPlacement = orb.marketDataPlacement(rising, "AAPL");
  const downPlacement = orb.marketDataPlacement(falling, "AAPL");
  assert.equal(upPlacement.available, true);
  assert.equal(upPlacement.source, "market-data");
  assert.notDeepEqual(
    [upPlacement.longitude, upPlacement.latitude, upPlacement.radius],
    [downPlacement.longitude, downPlacement.latitude, downPlacement.radius],
    "market direction and pressure change the free-floating placement"
  );
  assert.equal(orb.marketDataPlacement(null, "AAPL").available, false);

test("Stocks project the logarithmic six-band FBB state inward and vertically through the spheroid", () => {
  const { orb } = harness();
  const makeMarket = close => {
    const basis = 100;
    const dev = Math.log(110 / basis);
    const bands = { basis, logDeviation: dev };
    for (const [suffix, ratio] of [[236, 0.236], [382, 0.382], [500, 0.5], [618, 0.618], [764, 0.764], [1000, 1]]) {
      bands["upper" + suffix] = Math.exp(Math.log(basis) + ratio * dev);
      bands["lower" + suffix] = Math.exp(Math.log(basis) - ratio * dev);
    }
    return {
      latestBar: { time: NOW, close, confirmed: true },
      changePct: close > basis ? 2.5 : -2.5,
      basis, bands,
      vfi: { value: close > basis ? 18 : -12, signal: 4, available: true },
      waveTrend: { wt1: close > basis ? 26 : -26, wt2: close > basis ? 8 : -8 }
    };
  };
  const up = orb.marketDataPlacement(makeMarket(108), "UP");
  const down = orb.marketDataPlacement(makeMarket(92), "DOWN");
  assert.equal(up.fbbState.available, true);
  assert.equal(down.fbbState.available, true);
  assert.equal(up.fbbState.direction, 1);
  assert.equal(down.fbbState.direction, -1);
  assert.ok(up.radius < 2.12 && down.radius < 2.12, "strong FBB states penetrate inward");
  const upDraw = { ...up, longitude: up.longitude, latitude: up.latitude };
  const downDraw = { ...down, longitude: down.longitude, latitude: down.latitude };
  assert.ok(upDraw.fbbState.strength > 0 && downDraw.fbbState.strength > 0);
  assert.match(orb.stockFbbColor(up.fbbState), /rgb\\(/);
  assert.match(orb.stockFbbColor(down.fbbState), /rgb\\(/);
  assert.notEqual(orb.stockFbbColor(up.fbbState), orb.stockFbbColor(down.fbbState), "rally and sink receive distinct colors");
});
});

/* ── shared-berth separation ─────────────────────────────────────────────── */

/* Identical packets: the degenerate correlated field that used to render as one
   blob. Every placement carries its own constant radius, and the shared berth
   has to open without touching a single market value. */
function crowdedPlacements(orb, count = 52, packet = null) {
  const market = packet || {
    latestBar: { time: NOW, close: 101, confirmed: true },
    changePct: 1.24, basis: 99, bands: { lower1000: 92, upper1000: 108 },
    vfi: { value: 12.5, signal: 4, available: true }, waveTrend: { wt1: 22.4, wt2: 8 }
  };
  return Array.from({ length: count }, (unused, index) => {
    const identity = `SYM-${String(index).padStart(2, "0")}`;
    return { identity, ...orb.marketDataPlacement(market, identity) };
  });
}

const separationChords = placements => {
  const points = placements.map(placement => {
    const ring = Math.cos(placement.latitude);
    return {
      x: placement.radius * ring * Math.cos(placement.longitude),
      y: placement.radius * Math.sin(placement.latitude),
      z: placement.radius * ring * Math.sin(placement.longitude)
    };
  });
  let closest = Infinity;
  for (let left = 0; left < points.length; left += 1) {
    for (let right = left + 1; right < points.length; right += 1) {
      closest = Math.min(closest, Math.hypot(points[left].x - points[right].x, points[left].y - points[right].y, points[left].z - points[right].z));
    }
  }
  return closest;
};

test("Orb 2 opens a crowded berth instead of stacking correlated orbs", () => {
  const { orb } = harness();
  const placements = crowdedPlacements(orb);
  const before = placements.map(placement => ({ longitude: placement.longitude, latitude: placement.latitude, radius: placement.radius }));
  assert.ok(separationChords(placements) < 0.01, "identical packets start on one berth");
  const report = orb.resolveBerthSeparation(placements, 1);
  assert.equal(report.crowded, 52, "the readout counts the orbs that shared a berth");
  assert.equal(report.berths, 1, "they were one shared berth");
  assert.equal(report.moved, 51, "the first node keeps its packet placement; every later node takes a free slot");
  assert.ok(separationChords(placements) >= report.minimum, `no pair sits below the berth floor (${separationChords(placements)})`);
  placements.forEach((placement, index) => {
    assert.equal(placement.radius, before[index].radius, "separation never changes the market radius");
    assert.ok(Math.abs(placement.latitude) <= 1.2, "slots stay inside the model's latitude limit");
    assert.ok(Math.abs(placement.longitude - before[index].longitude) < Math.PI * 2, "slots stay on the ring near the node's own berth");
  });
  /* The first visitor in stable order keeps its own packet berth exactly, so the
     crowded field always has one node standing on the exact packet placement. */
  assert.equal(placements.filter((placement, index) =>
    placement.longitude === before[index].longitude && placement.latitude === before[index].latitude).length, 1);
});

test("berth separation is deterministic, idempotent, and leaves clear fields untouched", () => {
  const { orb } = harness();
  const first = crowdedPlacements(orb, 24);
  const second = crowdedPlacements(orb, 24);
  orb.resolveBerthSeparation(first, 1);
  orb.resolveBerthSeparation(second, 1);
  assert.deepEqual(
    first.map(placement => [placement.longitude, placement.latitude]),
    second.map(placement => [placement.longitude, placement.latitude]),
    "the same symbol set resolves to the same arrangement on every client"
  );
  const settled = first.map(placement => [placement.longitude, placement.latitude]);
  const again = orb.resolveBerthSeparation(first, 1);
  assert.equal(again.moved, 0, "re-running the resolver over its own output moves nothing");
  assert.equal(again.crowded, 0, "a settled field has no berth below the floor");
  assert.deepEqual(first.map(placement => [placement.longitude, placement.latitude]), settled);

  /* A field whose berths already have space keeps the placement its metrics drew. */
  const scattered = crowdedPlacements(orb, 12).map((placement, index) => ({
    ...placement,
    longitude: -Math.PI + index * (Math.PI * 2 / 12),
    latitude: (index % 3 - 1) * 0.6
  }));
  const snapshot = scattered.map(placement => [placement.longitude, placement.latitude]);
  const undisturbed = orb.resolveBerthSeparation(scattered, 1);
  assert.equal(undisturbed.crowded, 0, "nothing is reported when every berth has space");
  assert.equal(undisturbed.moved, 0);
  assert.deepEqual(scattered.map(placement => [placement.longitude, placement.latitude]), snapshot);

  /* Spread 0 is the exact packet placement; a partial spread uses a smaller floor. */
  const off = crowdedPlacements(orb, 8);
  const offSnapshot = off.map(placement => [placement.longitude, placement.latitude]);
  assert.equal(orb.resolveBerthSeparation(off, 0).moved, 0);
  assert.deepEqual(off.map(placement => [placement.longitude, placement.latitude]), offSnapshot);
  const partial = crowdedPlacements(orb, 8);
  const partialReport = orb.resolveBerthSeparation(partial, 0.5);
  assert.ok(partialReport.minimum < orb.resolveBerthSeparation(crowdedPlacements(orb, 8), 1).minimum);
  assert.ok(separationChords(partial) >= partialReport.minimum, "a partial spread still clears its own floor");
});

test("held and market packets share the same separation rules without inventing data", () => {
  const { orb } = harness();
  const held = { identity: "HELD-1", ...orb.marketDataPlacement(null, "HELD-1") };
  assert.equal(held.available, false);
  const placements = Array.from({ length: 6 }, (unused, index) => ({ identity: `HELD-${index}`, ...orb.marketDataPlacement(null, `HELD-${index}`) }));
  const report = orb.resolveBerthSeparation(placements, 1);
  assert.equal(report.crowded, 6, "held berths are separated too, so an unavailable beat is still readable");
  assert.ok(placements.every(placement => placement.available === false), "a held packet stays held");
  assert.ok(placements.every(placement => placement.radius === 2.12), "held berths keep their documented placeholder radius");
  assert.ok(placements.every(placement => Number.isFinite(placement.longitude) && Number.isFinite(placement.latitude)));

  /* The separation report never claims market, rank, or authority. */
  const text = orb.berthSeparationText(report);
  assert.match(text, /BERTH SEPARATION/);
  assert.match(text, /display geometry only/i);
  assert.doesNotMatch(text, /rank|recommend|signal|authoriz|permission|trade/i);
  assert.match(orb.berthSeparationText({ spread: 0, minimum: 0, crowded: 0, berths: 0, moved: 0 }), /OFF/);
});

test("the separated field renders distinct orbs and states the berth readout", async t => {
  const { host, engine, frames } = interactiveHarness(t, {
    tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER,
    fieldHandler: () => Response.json({ success: true, data: fieldSnapshot(window, { stockCount: 12 }) })
  });
  await flush();
  while (frames.length) {
    const callback = frames.shift();
    callback(NOW);
    await flush(4);
  }
  const drawn = engine.state.projected;
  assert.ok(drawn.length >= 12, "the field was drawn");
  const positions = drawn.map(point => ({ x: point.x, y: point.y }));
  let closest = Infinity;
  for (let left = 0; left < positions.length; left += 1) {
    for (let right = left + 1; right < positions.length; right += 1) {
      closest = Math.min(closest, Math.hypot(positions[left].x - positions[right].x, positions[left].y - positions[right].y));
    }
  }
  assert.ok(closest > 4, `no two drawn orbs share a screen berth (closest ${closest.toFixed(1)} px)`);
  assert.equal(engine.state.separation, 0.7, "berth spread defaults on");
  const readout = host.querySelector("[data-gi-orb2-berth-readout]");
  assert.match(readout.textContent, /BERTH SEPARATION · (FULL|\d+%)/);
  const slider = host.querySelector("[data-gi-orb2-separation]");
  assert.equal(slider.value, "70");
  slider.value = "100";
  slider.dispatchEvent(new host.ownerDocument.defaultView.Event("input"));
  await flush();
  assert.equal(engine.state.separation, 1);
  const saved = JSON.parse(host.ownerDocument.defaultView.localStorage.getItem("harshalos.good-intelligence.orb2.preferences.v1"));
  assert.equal(saved.separation, 1, "the spread survives a reload through local preferences");
  /* Trusted values restored to 0 keep the original packet placement. */
  slider.value = "0";
  slider.dispatchEvent(new host.ownerDocument.defaultView.Event("input"));
  await flush();
  assert.equal(engine.state.separation, 0);
  assert.match(readout.textContent, /BERTH SEPARATION · OFF/);
});

test("Orb 2 rejects missing and malformed ticker rows instead of inventing symbols", () => {
  const { orb } = harness();
  const nodes = orb.buildNodes([
    { symbol: "AAPL", name: "Apple", sector: "Technology" },
    { symbol: "NATURAL_GAS", name: "Henry Hub natural gas", sector: "Energy" },
    { symbol: "bad ticker" }, null
  ]);
  assert.equal(nodes.length, 2);
  assert.deepEqual(nodes.map(node => node.symbol), ["AAPL", "NATURAL_GAS"], "valid reviewed symbols with underscores stay visible");
});

/* ── the server field is the only beat source ─────────────────────────────── */

test("Orb 2 renders the stored server field and never calls a provider route", async t => {
  const { host, engine, fieldCalls, providerCalls } = interactiveHarness(t, { tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER });
  await flush();
  const reads = fieldCalls().filter(call => call.options.method !== "POST");
  assert.ok(reads.length >= 1, "mounting the Orb reads the server field");
  const first = new URL(reads[0].url, "https://os.example");
  assert.equal(first.searchParams.get("interval"), "1d");
  assert.equal(reads[0].options.credentials, "same-origin");
  assert.equal(providerCalls.length, 0, "no browser code calls /api/characters/v1/beat");
  assert.equal(engine.state.observations.size, 58, "six FX and 52 stock observations came from the stored field");
  assert.equal(engine.state.field.ok, true);
  assert.equal(engine.state.ds.value, 99.123, "the snapshot's fixed Dollar Strength (DS) benchmark is rendered at center");
  assert.equal(engine.state.ignition.phase, "complete");
  assert.equal(engine.state.ignition.tickerFired.size, 52);
  assert.equal(host.querySelectorAll('[data-gi-orb2-firing-list] [data-beat-state="fired"]').length, 52);
  assert.equal(host.querySelector("[data-gi-orb2-firing-list] [data-symbol]").getAttribute("data-symbol"), "NVDA");
  assert.match(host.querySelector("[data-gi-orb2-countdown]").textContent, /NEWEST STORED BEAT|NEXT READ/);
  assert.doesNotMatch(host.textContent, /WARM-UP|PAUSED WHILE|60 seconds/i, "no client warm-up or hidden-pause copy remains");
});

test("the firing order is derived from stored progress, so hiding or reloading never restarts it", async t => {
  const clock = { now: NOW };
  let step = 0;
  const { host, engine, providerCalls, window } = interactiveHarness(t, {
    tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER, clock,
    fieldHandler: () => Response.json({ success: true, data: fieldSnapshot(window, {
      fxCount: step === 0 ? 2 : 6, stockCount: step === 0 ? 0 : step === 1 ? 5 : 52
    }) })
  });
  await flush();
  assert.equal(engine.state.ignition.active, true);
  assert.equal(engine.state.ignition.fxFired.size, 2, "the Worker stores two FX closes; the page reports exactly two");
  assert.equal(engine.state.ignition.phase, "ds");
  engine.setVisible(false);
  engine.setVisible(true);
  await flush();
  assert.equal(engine.state.ignition.fxFired.size, 2, "leaving and returning does not replay or reset the sequence");
  step = 1;
  await engine.beatNow("manual");
  await flush();
  assert.equal(engine.state.ignition.tickerFired.size, 5, "progress follows the stored field, not the request count");
  assert.equal(engine.state.ignition.phase, "tickers");
  step = 2;
  await engine.beatNow("manual");
  await flush();
  assert.equal(engine.state.ignition.tickerFired.size, 52);
  assert.equal(engine.state.ignition.active, false);
  assert.equal(host.querySelector("[data-gi-orb2-ignition-restart]").hidden, false);
  assert.equal(providerCalls.length, 0, "the whole sequence was rendered without a single provider call from the page");
});

test("a missing server field fails closed with a readable reason and makes no provider call", async t => {
  const { host, engine, providerCalls, fieldCalls } = interactiveHarness(t, {
    tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER,
    fieldHandler: () => Response.json({ success: false, message: "The Orb 2 server field needs the COMMUNITY_DB binding and D1 migration 0009. No fallback source is used." }, { status: 503 })
  });
  await flush();
  assert.equal(engine.state.fieldFailed, true);
  assert.match(host.textContent, /COMMUNITY_DB binding and D1 migration 0009/);
  assert.match(host.querySelector("[data-gi-orb2-countdown]").textContent, /UNREACHABLE|NO PAGE REQUESTS/);
  assert.equal(providerCalls.length, 0, "the refusal never falls through to a browser provider call");
  assert.ok(fieldCalls().length >= 1);
});

/* ── the beat-type dial and ticker focus ─────────────────────────────────── */

test("the beat-type dial reads the server's published types and filters the field request", async t => {
  const { host, engine, fieldCalls } = interactiveHarness(t, { tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER });
  await flush();
  const dial = host.querySelector("[data-gi-orb2-field-dial]");
  const pills = dial.querySelectorAll("[data-field-type]");
  assert.equal(pills.length, 6, "an all-beats pill plus the five beat types");
  assert.deepEqual(Array.from(pills, pill => pill.getAttribute("data-field-type")), ["", "observation", "message", "trade", "authorization", "permission"]);
  pills[2].click();
  await flush();
  assert.equal(engine.state.beatType, "message");
  const last = new URL(fieldCalls().at(-1).url, "https://os.example");
  assert.equal(last.searchParams.get("types"), "message", "the dial is carried on the server-field request");
  assert.match(host.textContent, /OCM message/);
  assert.match(host.textContent, /No OCM message is transmitted/i);
  const saved = JSON.parse(host.ownerDocument.defaultView.localStorage.getItem("harshalos.good-intelligence.orb2.preferences.v1"));
  assert.equal(saved.beatType, "message", "the dial survives a reload through local preferences");
  engine.destroy();
});

test("ticker focus narrows the rendered field, the request, and the persisted preferences", async t => {
  const { host, engine, fieldCalls } = interactiveHarness(t, { tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER, timeframe: "1d" });
  await flush();
  const total = engine.state.stage.berths.length;
  const firstChip = host.querySelector("[data-gi-orb2-field-focus] [data-focus-symbol]");
  const symbol = firstChip.getAttribute("data-focus-symbol");
  firstChip.click();
  await flush();
  assert.deepEqual([...engine.state.focusSymbols], [symbol]);
  assert.equal(engine.state.stage.berths.length, 1, "the visible model is narrowed to the focused ticker");
  assert.equal(engine.state.stage.berths[0].symbol, symbol);
  const last = new URL(fieldCalls().at(-1).url, "https://os.example");
  assert.equal(last.searchParams.get("symbols"), symbol);
  const saved = JSON.parse(host.ownerDocument.defaultView.localStorage.getItem("harshalos.good-intelligence.orb2.preferences.v1"));
  assert.deepEqual(saved.focusSymbols, [symbol]);
  host.querySelector("[data-focus-clear]").click();
  await flush();
  assert.deepEqual([...engine.state.focusSymbols], []);
  assert.equal(engine.state.stage.berths.length, total, "clearing the focus restores the reviewed field");
});

test("manual controls stay deliberate: Beat now runs a server tick, Warm queues the ~156-call first-deck calibration, Refresh focused uses the priority lane", async t => {
  const { host, engine, fieldCalls, providerCalls } = interactiveHarness(t, { tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER });
  await flush();
  const posts = () => fieldCalls().filter(call => call.options.method === "POST");
  await engine.beatNow("manual");
  await flush();
  let body = JSON.parse(posts().at(-1).options.body);
  assert.equal(body.schema, "gi-orb2-field-request-v1");
  assert.equal(body.action, "tick", "Beat now asks the server for one scheduled tick");
  assert.match(host.textContent, /Server tick complete/);
  assert.equal(host.querySelector("[data-gi-orb2-warm]").textContent.includes("156"), true, "the warm control states the first-deck calibration size");

  host.querySelector("[data-gi-orb2-warm]").click();
  await flush();
  body = JSON.parse(posts().at(-1).options.body);
  assert.equal(body.action, "warm");
  assert.deepEqual(body.intervals, ["15m", "1h", "1d"]);
  assert.match(host.textContent, /156 Tickerbot warm-burst jobs queued/);

  const chip = host.querySelector("[data-gi-orb2-field-focus] [data-focus-symbol]");
  chip.click();
  await flush();
  host.querySelector("[data-gi-orb2-refresh-focus]").click();
  await flush();
  body = JSON.parse(posts().at(-1).options.body);
  assert.equal(body.action, "priority");
  assert.deepEqual([...body.symbols], [chip.getAttribute("data-focus-symbol")], "only the focused reviewed stock enters the priority lane");
  assert.equal(providerCalls.length, 0, "every manual control talks to the server field, never to a provider");
});

test("the server field status is surfaced honestly: ledger allowance, queue, and cron, never client pacing", async t => {
  const { host, engine } = interactiveHarness(t, { tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER });
  await flush();
  assert.match(engine.state.routeSteps.worker, /CRON/);
  assert.match(engine.state.routeSteps.ledger, /TICKERBOT MONTHLY LEDGER READY/);
  assert.match(engine.state.routeSteps.model, /RENDER-ONLY/);
  assert.equal(host.textContent.includes("Waiting 60 seconds"), false);
  assert.equal(engine.state.cooldownUntil, undefined, "the 60-second provider hold is gone from the client state");
});

test("Orb 2 mounts interactive local controls and defaults motion off for reduced-motion visitors", async t => {
  const { window, host, engine, frames, canvasCalls } = interactiveHarness(t, { tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER });
  await flush();
  const firstFrame = frames.shift();
  assert.equal(typeof firstFrame, "function", "mount schedules a render frame when canvas is available");
  frames.splice(0).forEach(pending => pending(100));
  firstFrame(100);
  assert.ok(canvasCalls.includes("fillRect") && canvasCalls.includes("arc"), "the scheduled frame paints the projected sphere and nodes");
  assert.equal(engine.nodes.length, 52);
  assert.equal(engine.state.autoRotate, false, "prefers-reduced-motion starts with rotation disabled");
  assert.equal(host.querySelector("[data-gi-orb2-provider]").textContent, "Tickerbot · EXCLUSIVE DISC1 STOCK SOURCE",
    "the stock provider pill names Tickerbot without implying that it serves other Discs");
  assert.ok(host.textContent.includes("AAPL ·"), "the inspector shows a stored instrument");

  const formation = host.querySelector("[data-gi-orb2-formation]");
  formation.value = "0";
  formation.dispatchEvent(new window.Event("input", { bubbles: true }));
  assert.equal(engine.state.formation, 0, "the Disc ↔ Sphere range control updates the local model");
  const select = host.querySelector("[data-gi-orb2-select]");
  select.value = engine.nodes[0].id;
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.equal(engine.state.selected, 0, "the accessible selector changes the inspected node");
  host.querySelector("[data-gi-orb2-route]").click();
  assert.equal(engine.state.route.type, "resolution", "the route control creates a local visual path only");
  host.querySelector("[data-gi-orb2-lateral]").click();
  assert.equal(engine.state.route.type, "lateral", "the lateral control remains a distinct display trace");
  engine.setVisible(false);
  assert.equal(engine.state.visible, false, "leaving the Orb 2 tab pauses the renderer");
  engine.setVisible(true);
  assert.equal(engine.state.visible, true, "returning to the view resumes it");
});

test("the Orb 2 module stays browser-local: one same-origin field route and no provider, pacing, or authority call", () => {
  assert.doesNotMatch(orbSource, /https?:\/\//, "no absolute provider or authority URL is shipped to the browser");
  assert.doesNotMatch(orbSource, /XMLHttpRequest|WebSocket|EventSource/, "the renderer opens no separate network channel");
  assert.match(orbSource, /\/api\/good-intelligence\/v1\/orb2\/field/, "the stored server field is the only market route");
  assert.doesNotMatch(orbSource, /\/api\/characters\/v1\/beat/, "the browser beat route is gone from Orb 2");
  assert.doesNotMatch(orbSource, /PROVIDER_COOLDOWN_MS\s*=/, "the 60-second provider hold was a debugging leftover and is removed");
  assert.doesNotMatch(orbSource, /Auto-beat paused while this page is hidden/, "the hidden-tab pause is retired");
  assert.match(orbSource, /FIELD_POLL_MS = 20_000/, "the view polls on one stated cadence");
  assert.match(orbSource, /no OCM message is sent/i, "the route copy states its no-transmission boundary");
  assert.match(orbSource, /Resolution is not an authority source/, "the Resolution Axis invariant is retained in the displayed model");
  assert.match(orbSource, /MODEL BOUNDARY/, "the model boundary paragraph is displayed");
  assert.match(orbSource, /not an OCM message, market signal, recommendation, authorization, transaction, or permission to act/, "the boundary names every refused action");
  assert.doesNotMatch(orbSource, /FractalFlame|OrbFilm|drawFractalFrames|Demo\.flame/, "no fractal, flame, or film engine is wired into the market view");
});

/* ── scenarios, restore, layout, and app integration ─────────────────────── */

test("a scenario beat type renders a choreographed trace, keeps its boundaries, and refuses without data", async t => {
  const { window, host, engine } = interactiveHarness(t, { tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER });
  await flush();
  const dial = host.querySelector("[data-gi-orb2-field-dial]");
  dial.querySelector('[data-field-type="authorization"]').click();
  await flush();
  assert.equal(engine.state.beatType, "authorization");
  const note = host.querySelector("[data-gi-orb2-route-note]").textContent;
  assert.match(note, /Authorization|Human Key/);
  assert.match(host.querySelector("[data-gi-orb2-field-note]").textContent, /Local teaching visualization|grants nothing/i);
  const Scenarios = window.GoodIntelligenceOrb2Scenarios;
  assert.ok(Scenarios, "the scenario module ships before the Orb 2 module");
  const held = Scenarios.scenarioFor("trade", { symbol: "AAPL", confirmed: true, market: { volumeAvailable: false, latestBar: { volume: null } } }, { now: NOW });
  assert.equal(held.available, false);
  assert.match(held.reason, /volume/);
  assert.equal(held.phases.length, 0);
});

test("Orb 2 restores the last saved beat from the server after a page refresh", async t => {
  const sessionId = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
  const historyStore = new Map([[sessionId, [{
    schema: "gi-orb2-beat-v1", beatId: sessionId, at: NOW, reason: "ignition", discId: "stocks", provider: "tickerbot",
    interval: "1d", cadenceMinutes: 15, calls: 1, cacheHits: 0,
    instruments: [{
      symbol: "AAPL", displaySymbol: "AAPL", status: "bars", provider: "tickerbot", code: "", message: "", lane: null,
      market: marketSummary("1d", "tickerbot"), motion: fieldRow({ CharactersBeat: { motion: () => ({ mood: "coil" }) } }, "AAPL").motion
    }]
  }]]]);
  const visit = interactiveHarness(t, {
    historyStore, sessionId,
    preferences: { discId: "stocks", interval: "1d", source: "live", auto: false, cadence: 15, budget: 10000, stretch: false, tierMode: false, tierSweepHours: 24 }
  });
  await flush();
  assert.ok(visit.engine.state.events.some(event => event.beatId === sessionId), "server history repopulates the event log under the anonymous session key");
  assert.equal(visit.engine.state.persistence, "saved");
  assert.ok(visit.host.textContent.includes("AAPL ·"), "the restored observation remains available to the inspector");
  assert.equal(visit.providerCalls.length, 0, "restoring a session never makes a provider request");
});

test("Good Intelligence lazily mounts Orb 2 with the server field and keeps the authority boundary", () => {
  assert.match(appSource, /data-gi-orb2-panel[^>]*hidden/, "the heavy canvas panel is hidden until selected");
  assert.match(appSource, /\["news", "markets", "orb2", "nabdiscs"\]\.includes/, "the view switcher accepts Orb 2 and the NAB Discs sibling");
  assert.match(appSource, /state\.orb2Engine = Orb2\.mount/, "the renderer mounts only through the Orb 2 module");
  assert.match(appSource, /sends no OCM message, no trade or order, and confers no authority/i);
});

test("Orb 2 keeps settings and status outside the clear, full-width model stage", async t => {
  const { host } = interactiveHarness(t, { tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER });
  await flush();
  const canvasShell = host.querySelector(".gi-orb2-canvas-shell");
  const flow = host.querySelector("[data-gi-orb2-flow-readout]");
  const origin = host.querySelector("[data-gi-orb2-origin-status]");
  assert.ok(flow && origin);
  assert.equal(canvasShell.contains(flow), false, "flow text sits below the canvas rather than on top of the model");
  assert.equal(canvasShell.contains(origin), false, "origin text sits below the canvas rather than on top of the model");
  assert.equal(host.querySelector(".gi-orb2-canvas-hud"), null, "the overlay HUD is removed");
  assert.match(host.querySelector(".gi-orb2-center").textContent, /Dollar Strength \(DS\) FIXED BENCHMARK/);
  assert.equal(host.querySelector("[data-gi-orb2-disc]").options.length, 5, "the five reviewed Discs are selectable");
  const settingsPanel = host.querySelector("[data-gi-orb2-settings]");
  const settingsToggle = host.querySelector("[data-gi-orb2-settings-toggle]");
  assert.ok(settingsPanel && settingsPanel.hidden, "settings are closed by default to expose the model");
  assert.ok(settingsPanel.contains(host.querySelector("[data-gi-orb2-field-dial]")), "the beat-type dial lives in the settings panel");
  settingsToggle.click();
  assert.equal(settingsPanel.hidden, false);
  host.querySelector("[data-gi-orb2-settings-close]").click();
  assert.equal(settingsPanel.hidden, true);
});

test("the model full screen scrolls instead of clipping its lower content", () => {
  assert.match(appCss, /\.gi-orb2-fullscreen[^{]*\{[^}]*overflow-y:\s*auto/, "the fullscreen shell is a scroll container");
  assert.match(appCss, /@media \(max-height: 700px\)/, "short viewports get a document-flow fallback");
  assert.match(appCss, /\.gi-orb2-field-dial[,\s]/, "the beat-type dial is styled");
  assert.match(appCss, /\.gi-orb2-field-focus/, "the ticker focus chips are styled");
});

test("the synthetic rehearsal source stays retired in the server-field view", () => {
  assert.doesNotMatch(orbSource, /data-gi-orb2-source/, "no data-source control resurrects the retired synthetic mode");
  assert.doesNotMatch(orbSource, /rehearsalBeat|Beat\.rehearse/, "no synthetic generator ships in this view");
  assert.match(orbSource, /synthetic or demo data is not substituted/, "an unavailable beat is held, never substituted");
});

test("Center Origin carries the inner shell, the PDH phase, and the Human Key gate", async t => {
  const { host, window, frames } = interactiveHarness(t, { tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER });
  await flush();
  const origin = host.querySelector("[data-gi-orb2-origin-status]");
  assert.match(origin.textContent, /ORIGIN · CPU/);
  assert.match(origin.textContent, /GATE UNREAD/);
  assert.match(origin.textContent, /PDH UNDECLARED/);
  assert.ok(host.querySelector("[data-gi-orb2-gate]") && host.querySelector("[data-gi-orb2-uts]"));
  assert.match(orbSource, /shellRing\(/);
  assert.match(orbSource, /phaseLoop\(/);
  assert.match(orbSource, /PHASE_SHIFT_RADIANS/);
  const frame = frames.shift();
  if (typeof frame === "function") frame(140);
  const savedPreferences = JSON.parse(window.localStorage.getItem("harshalos.good-intelligence.orb2.preferences.v1") || "{}");
  assert.equal(savedPreferences.innerShell ?? savedPreferences.gate ?? savedPreferences.originStatus ?? null, null,
    "the origin assembly persists nothing");
});

test("the standalone Massive Markets desktop window remains retired and the load order holds", () => {
  assert.doesNotMatch(indexHtml, /css\/massive\.css/);
  assert.doesNotMatch(indexHtml, /js\/apps-massive\.js/);
  const castAt = indexHtml.indexOf("js/characters-cast.js");
  const beatAt = indexHtml.indexOf("js/characters-beat.js");
  const catalogAt = indexHtml.indexOf("js/characters-disc-catalog.js");
  const rosterAt = indexHtml.indexOf("js/good-intelligence-market-roster.js");
  const dsAt = indexHtml.indexOf("js/good-intelligence-dxy.js");
  const scenarioAt = indexHtml.indexOf("js/good-intelligence-orb2-scenarios.js");
  const orbAt = indexHtml.indexOf("js/good-intelligence-orb2.js");
  const appAt = indexHtml.indexOf("js/apps-good-intelligence.js");
  assert.ok(castAt < beatAt && beatAt < catalogAt && catalogAt < rosterAt && rosterAt < dsAt && dsAt < scenarioAt && scenarioAt < orbAt && orbAt < appAt,
    "the cast, beat engine, Disc catalog, roster, Dollar Strength (DS) helper, and scenarios load before Orb 2 and its tab");
});

test("the Worker field route is the documented contract the page renders", () => {
  assert.match(workerSource, /orb2-saved-beats|ORB2_BEATS|beats/i);
  assert.match(orbSource, /fieldStatus|routeSteps/);
});

/* ── the constellation: one orb per Disc, walked by the carousel ─────────── */

test("the constellation berth is a pure function of catalog order and cannot be moved by market data", () => {
  const { orb } = harness();
  const five = ["stocks", "fx", "crypto", "commodities", "indices"];
  const berths = five.map((id, index) => orb.constellationBerth(index, five.length));
  assert.deepEqual(berths.map(berth => berth.index), [0, 1, 2, 3, 4]);
  assert.equal(new Set(berths.map(berth => `${berth.x.toFixed(4)}:${berth.y.toFixed(4)}:${berth.z.toFixed(4)}`)).size, five.length,
    "no two Disc orbs share a berth");
  for (const berth of berths) {
    const radius = Math.hypot(berth.x, berth.y, berth.z);
    assert.ok(Math.abs(radius - orb.CONSTELLATION_ORBIT_MODEL) < 1e-9, "every orb sits on the shared display ring");
  }
  assert.deepEqual(berths, five.map((id, index) => orb.constellationBerth(index, five.length)),
    "the berth is a pure function of the catalog order: nothing else can move an orb");
  assert.notDeepEqual(orb.constellationBerth(0, five.length), orb.constellationBerth(1, five.length));
  const layout = orb.constellationLayout(five.map((id, index) => ({ id, number: index + 1, name: id })));
  assert.deepEqual(layout.map(entry => entry.id), five, "the layout preserves the reviewed catalog order");
  assert.ok(layout.every(entry => entry.berth && Number.isFinite(entry.berth.x)));
  assert.deepEqual(orb.constellationLayout([]), [], "an empty catalog draws no orbs rather than inventing any");
});

test("the strip carries one chip per Disc with its own stored status, and an empty Disc says so", async t => {
  const { host, engine, canvasCalls, frames } = interactiveHarness(t, { tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER });
  await flush();
  const chips = [...host.querySelectorAll("[data-gi-orb2-orb]")];
  assert.deepEqual(chips.map(chip => chip.getAttribute("data-gi-orb2-orb")), ["stocks", "fx", "crypto", "commodities", "indices"],
    "the strip lists every reviewed Disc in catalog order");
  assert.ok(chips.every(chip => chip.getAttribute("role") === "tab"), "the strip is a tab list of Disc orbs");
  assert.equal(chips.filter(chip => chip.getAttribute("aria-selected") === "true").length, 1, "exactly one Disc orb is current");
  const [stocksChip, fxChip, cryptoChip] = chips;
  assert.match(stocksChip.textContent, /52\/52 active/, "a populated Disc reports fresh active market data");
  assert.equal(stocksChip.classList.contains("is-empty"), false);
  assert.match(fxChip.textContent, /6\/23 active/, "the FX count uses the full reviewed roster denominator");
  assert.match(cryptoChip.textContent, /awaiting first beat/, "a Disc with nothing stored is labeled, not filled with another Disc's rows");
  assert.equal(cryptoChip.classList.contains("is-empty"), true, "an empty Disc orb is drawn as an empty marker");
  const note = host.querySelector("[data-gi-orb2-constellation-note]");
  assert.match(note.textContent, /CONSTELLATION · 5 Disc orbs/);
  assert.match(note.textContent, /awaiting first active beat on 3\. Crypto, 4\. Futures, 5\. Indices/);
  assert.match(note.textContent, /selected Disc1 · The 52 Cards/);
  assert.doesNotMatch(note.textContent, /every Disc orb is reporting/, "the summary never implies an empty Disc has data");
  const frame = frames.shift();
  if (typeof frame === "function") frame(120);
  assert.equal(engine.state.projectedOrbs.length, 5, "five Disc orbs are projected for the pointer");
  assert.ok(canvasCalls.includes("arc"), "the orbs are drawn as circles on the canvas");
});

test("held futures and index rows are not labelled active and carry no simulated OCM traffic", async t => {
  let fixtureWindow;
  const { window, host, engine, frames } = interactiveHarness(t, {
    tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER,
    fieldHandler: () => {
      const commodities = fixtureWindow.CharactersDiscCatalog.commodities.map(entry => fieldRow(fixtureWindow, entry.symbol, {
        discId: "commodities", provider: "massive", market: false, code: "massive-upstream", message: "Provider did not return a daily bar."
      }));
      const indices = fixtureWindow.CharactersDiscCatalog.indices.map(entry => fieldRow(fixtureWindow, entry.symbol, {
        discId: "indices", provider: "massive", market: false, code: "massive-upstream", message: "Provider did not return a daily bar."
      }));
      return Response.json({ success: true, data: fieldSnapshot(fixtureWindow, {
        stockCount: 0, fxCount: 0, additionalRows: [...commodities, ...indices],
        discStatus: [
          { id: "commodities", instruments: commodities.length, stored: commodities.length, observed: 0, active: 0, stale: 0, held: commodities.length, pending: 0, covered: false, members: commodities.map(row => ({ symbol: row.symbol, status: "held", code: row.code, message: row.message })) },
          { id: "indices", instruments: indices.length, stored: indices.length, observed: 0, active: 0, stale: 0, held: indices.length, pending: 0, covered: false, members: indices.map(row => ({ symbol: row.symbol, status: "held", code: row.code, message: row.message })) }
        ]
      }) });
    }
  });
  fixtureWindow = window;
  await flush();
  const commodityChip = host.querySelector('[data-gi-orb2-orb="commodities"]');
  const indexChip = host.querySelector('[data-gi-orb2-orb="indices"]');
  assert.match(commodityChip.textContent, /0\/11 active · 11 held/);
  assert.match(indexChip.textContent, /0\/52 active · 52 held/);
  assert.equal(commodityChip.classList.contains("is-empty"), true);
  assert.equal(indexChip.classList.contains("is-empty"), true);
  let guard = 0;
  while (frames.length && guard < 40) { frames.shift()(NOW); guard += 1; }
  await flush();
  assert.equal(engine.state.trafficPackets.length, 0, "stored unavailable rows do not create simulated packets");
  assert.equal(engine.state.ocmLanes, 0);
  assert.match(host.querySelector("[data-gi-orb2-ocm]").textContent, /no fresh market observations to carry/);
});

test("the carousel walks to the next Disc orb with a step, a click, a slide, or an arrow key — without a provider call", async t => {
  const harnessed = interactiveHarness(t, { tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER });
  const { host, engine, window, fieldCalls, providerCalls, frames } = harnessed;
  const canvas = host.querySelector("[data-gi-orb2-canvas]");
  await flush();
  const reads = () => fieldCalls().filter(call => call.options.method !== "POST");
  const before = reads().length;
  const frame = frames.shift();
  if (typeof frame === "function") frame(120);

  host.querySelector('[data-gi-orb2-carousel="next"]').click();
  await flush();
  assert.equal(engine.state.discId, "fx", "the step button walks to the next Disc orb");
  assert.equal(engine.state.focusOrb, true, "the camera follows the orb");
  assert.ok(engine.state.camZoom > 1, "the focused orb is magnified");
  assert.deepEqual([...host.querySelectorAll("[data-gi-orb2-orb].is-current")].map(chip => chip.getAttribute("data-gi-orb2-orb")), ["fx"]);
  assert.equal(reads().length, before, "a carousel move re-uses the constellation already in the view instead of re-reading it");
  assert.equal(providerCalls.length, 0, "the carousel never calls a provider");

  host.querySelector('[data-gi-orb2-carousel="prev"]').click();
  await flush();
  assert.equal(engine.state.discId, "stocks", "the step button walks back");
  host.querySelector('[data-gi-orb2-carousel="prev"]').click();
  await flush();
  assert.equal(engine.state.discId, "indices", "the carousel wraps at the end of the reviewed order");

  /* A click on a drawn Disc orb is the same move: the orb's own projected
     position is hit-tested, and the packet hit-test is not consulted. */
  const orbPoint = engine.state.projectedOrbs.find(orb => orb.disc.id === "commodities");
  assert.ok(orbPoint, "the futures orb is projected");
  const PointerEventCtor = window.PointerEvent || window.MouseEvent;
  if (typeof PointerEventCtor === "function") {
    for (const type of ["pointerdown", "pointerup"]) {
      canvas.dispatchEvent(new PointerEventCtor(type, { clientX: orbPoint.point.x, clientY: orbPoint.point.y, bubbles: true, cancelable: true }));
    }
    await flush();
    assert.equal(engine.state.discId, "commodities", "clicking an orb walks the carousel to that Disc");
  }

  const KeyboardEventCtor = window.KeyboardEvent;
  if (typeof KeyboardEventCtor === "function") {
    canvas.dispatchEvent(new KeyboardEventCtor("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    await flush();
    assert.equal(engine.state.discId, "indices", "the right arrow key walks to the next orb");
    canvas.dispatchEvent(new KeyboardEventCtor("keydown", { key: "Home", bubbles: true, cancelable: true }));
    await flush();
    assert.equal(engine.state.discId, "stocks", "Home returns to the first orb");
  }

  host.querySelector("[data-gi-orb2-resetcam]").click();
  await flush();
  assert.equal(engine.state.focusOrb, false, "recentre steps the camera back to the whole constellation");
  assert.ok(engine.state.camZoom <= 1, "the wide view is not magnified");
  assert.equal(providerCalls.length, 0, "the whole carousel walk made no provider call");
  assert.ok(reads().length <= before + 1, "the walk costs at most one stored-field re-read, never a fan-out");
});

test("the drawn field follows the Disc orb instead of re-drawing the 52-card deck on every Disc", async t => {
  const { host, engine } = interactiveHarness(t, { tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER });
  await flush();
  const stockSymbols = new Set(MARKET_ROSTER.map(asset => asset.symbol));
  assert.ok(engine.nodes.length >= 40, "the Disc1 orb draws the full reviewed stock deck");
  assert.ok(engine.nodes.every(node => node.symbol), "and every drawn orb is a reviewed ticker");

  host.querySelector('[data-gi-orb2-carousel="next"]').click();
  await flush();
  assert.equal(engine.state.discId, "fx");
  assert.ok(engine.nodes.length >= 5 && engine.nodes.length <= 30, "the fx orb draws the reviewed FX roster");
  assert.ok(engine.nodes.every(node => !stockSymbols.has(node.symbol)), "no stock-deck symbol is drawn on the fx orb");

  host.querySelector('[data-gi-orb2-orb="commodities"]').click();
  await flush();
  assert.equal(engine.state.discId, "commodities");
  assert.equal(engine.nodes.length, 11, "Disc4 draws all eleven reviewed futures");
  assert.ok(engine.nodes.some(node => node.symbol === "ALUMINUM"), "the Aluminum ticker orb is part of Disc4's own field");
  assert.ok(engine.nodes.some(node => node.symbol === "NATURAL_GAS"), "the underscore in Henry Hub's reviewed symbol does not hide that orb");
  assert.ok(engine.nodes.every(node => !stockSymbols.has(node.symbol)), "no stock-deck symbol is drawn on Disc4");

  host.querySelector('[data-gi-orb2-orb="crypto"]').click();
  await flush();
  assert.equal(engine.state.discId, "crypto");
  assert.deepEqual(engine.nodes.map(node => node.symbol), ["BTC", "USDT"],
    "the crypto orb draws the ranked asset plus the exact pair's quote counterparty");
  assert.equal(engine.state.focusOrb, true, "walking to an orb focuses its camera");
});

test("Disc3 cross-pair tethers select the exact Kraken pair and encode confirmed candle volume and color", async t => {
  let fixtureWindow;
  const instrument = {
    symbol: "ADA", displaySymbol: "ADA/USD", name: "ADA", sector: "Cryptocurrency",
    assetClass: "crypto", rankingProvider: "Kraken", providerId: "ADA/USD", krakenPair: "ADA/USD",
    baseAsset: "ADA", quoteAsset: "USD", pairType: "usd"
  };
  const adaPair = {
    symbol: "ADA-USDT", displaySymbol: "ADA/USDT", name: "ADA/USDT", sector: "Cryptocurrency pairs",
    assetClass: "crypto", rankingProvider: "Kraken", providerId: "ADA/USDT", krakenPair: "ADA/USDT",
    baseAsset: "ADA", quoteAsset: "USDT", pairType: "cross"
  };
  const xmrPair = {
    symbol: "XMR-BTC", displaySymbol: "XMR/BTC", name: "XMR/BTC", sector: "Cryptocurrency pairs",
    assetClass: "crypto", rankingProvider: "Kraken", providerId: "XMR/XBT", krakenPair: "XMR/XBT",
    baseAsset: "XMR", quoteAsset: "BTC", pairType: "cross"
  };
  const cryptoPayload = { success: true, instruments: [instrument], crossPairs: [adaPair, xmrPair], ranking: { provider: "Kraken", venue: "Kraken Spot" } };
  const { window, host, engine, frames, providerCalls, canvasDraws } = interactiveHarness(t, {
    tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER, cryptoPayload,
    fieldHandler: () => {
      const adaObservation = fieldRow(fixtureWindow, "ADA-USDT", {
        discId: "crypto", provider: "kraken", displaySymbol: "ADA/USDT", market: true, confirmed: true,
        krakenPair: "ADA/USDT", providerId: "ADA/USDT", baseAsset: "ADA", quoteAsset: "USDT",
        activityBar: { time: NOW - 86_400_000, open: 0.24, high: 0.27, low: 0.23, close: 0.25, volume: 88_000, confirmed: true },
        freshness: { status: "fresh" }
      });
      const xmrObservation = fieldRow(fixtureWindow, "XMR-BTC", {
        discId: "crypto", provider: "kraken", displaySymbol: "XMR/BTC", market: true, confirmed: true,
        krakenPair: "XMR/XBT", providerId: "XMR/XBT", baseAsset: "XMR", quoteAsset: "BTC",
        activityBar: { time: NOW - 86_400_000, open: 0.0042, high: 0.0043, low: 0.0040, close: 0.0041, volume: 12.345, confirmed: true },
        freshness: { status: "fresh" }
      });
      return Response.json({ success: true, data: fieldSnapshot(fixtureWindow, {
        stockCount: 0, fxCount: 0, additionalRows: [adaObservation, xmrObservation],
        discStatus: [{
          id: "crypto", instruments: 3, assets: 1, pairs: 2, stored: 2, observed: 2, active: 2,
          stale: 0, held: 0, pending: 1, covered: true, complete: false,
          members: [
            { symbol: "ADA-USDT", status: "active", provider: "kraken", freshness: "fresh" },
            { symbol: "XMR-BTC", status: "active", provider: "kraken", freshness: "fresh" }
          ]
        }]
      }) });
    }
  });
  fixtureWindow = window;
  await flush();
  const pairBar = host.querySelector("[data-gi-orb2-crypto-pair-bar]");
  assert.equal(pairBar.hidden, true, "the Kraken pair selector stays scoped to Disc3");
  host.querySelector('[data-gi-orb2-orb="crypto"]').click();
  await flush();
  assert.equal(engine.state.discId, "crypto");
  assert.equal(pairBar.hidden, false, "the pair selector appears when Disc3 is selected");
  assert.ok(engine.nodes.some(node => node.symbol === "XMR") && engine.nodes.some(node => node.symbol === "BTC"),
    "the exact pair's two assets are drawn as the tether endpoints without synthesizing a reverse market");
  const pairSelect = host.querySelector("[data-gi-orb2-crypto-pair]");
  assert.equal(pairSelect.options.length, 2, "the toolbar exposes both directly listed cross-crypto pairs");
  assert.equal(pairSelect.value, "XMR-BTC", "the example XMR/BTC pair is preferred when the Kraken ranking contains it");

  let guard = 0;
  while (frames.length && guard < 40) { frames.shift()(NOW); guard += 1; }
  await flush();
  assert.deepEqual(Array.from(engine.state.cryptoTrafficEdges, edge => [edge.pair, edge.baseAsset, edge.quoteAsset, edge.active]), [
    ["ADA-USDT", "ADA", "USDT", true], ["XMR-BTC", "XMR", "BTC", true]
  ]);
  const selectedEdge = Array.from(engine.state.cryptoTrafficEdges).find(edge => edge.pair === "XMR-BTC");
  assert.equal(selectedEdge.selected, true);
  assert.equal(selectedEdge.krakenPair, "XMR/XBT", "the canonical BTC label retains Kraken's exact XBT pair identity");
  assert.equal(selectedEdge.volume, 12.345);
  assert.equal(selectedEdge.volumeUnit, "XMR", "daily OHLCV volume stays denominated in the pair's base asset");
  assert.equal(selectedEdge.candleDirection, "down");
  assert.equal(selectedEdge.candleColor, "#ff718b");
  const packets = Array.from(engine.state.cryptoTrafficPackets);
  assert.equal(packets.length, 8, "each confirmed pair bar creates mirrored display markers on both visual layers");
  assert.ok(packets.every(packet => Number.isFinite(packet.x) && Number.isFinite(packet.y)));
  const readout = host.querySelector("[data-gi-orb2-crypto-pair-readout]");
  assert.match(readout.textContent, /KRAKEN XMR\/BTC/);
  assert.match(readout.textContent, /DOWN candle \(close below open\)/);
  assert.match(readout.textContent, /12\.345 XMR base-asset volume/);
  assert.match(readout.textContent, /not trade-side flow, transfers, or OCM messages/);
  assert.ok(canvasDraws.some(draw => draw.method === "stroke" && draw.strokeStyle === selectedEdge.candleColor && draw.lineWidth >= 3),
    "the selected tether is drawn brightly in the confirmed candle's color");
  assert.ok(canvasDraws.some(draw => draw.method === "fillText" && draw.text.startsWith("XMR/BTC · ") && draw.text.includes("XMR")),
    "the selected tether label names the exact pair and its base-asset volume");

  pairSelect.value = "ADA-USDT";
  pairSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  await flush();
  guard = 0;
  while (frames.length && guard < 40) { frames.shift()(NOW + 100); guard += 1; }
  await flush();
  assert.equal(engine.state.cryptoPairFocus, "ADA-USDT", "the focused tether can be changed from the visible pair selector");
  const adaEdge = Array.from(engine.state.cryptoTrafficEdges).find(edge => edge.pair === "ADA-USDT");
  assert.equal(adaEdge.selected, true);
  assert.equal(adaEdge.candleDirection, "up");
  assert.equal(adaEdge.candleColor, "#37e3a1");
  assert.match(readout.textContent, /UP candle \(close above open\)/);
  assert.ok(canvasDraws.some(draw => draw.method === "stroke" && draw.strokeStyle === adaEdge.candleColor && draw.lineWidth >= 3),
    "changing the pair updates the bright tether color to the selected pair's candle direction");

  const note = host.querySelector("[data-gi-orb2-ocm]");
  assert.match(note.textContent, /fresh \/ 2 confirmed-volume cross-quote pairs/);
  assert.match(note.textContent, /selected tether color = confirmed candle close versus open/);
  assert.match(note.textContent, /inner OCM orb and outer Disc orb/);
  assert.match(note.textContent, /aggregate OHLCV has no trade-side direction/);
  assert.match(note.textContent, /not observed flow, trades, or transfers/);
  assert.equal(providerCalls.length, 0, "the pair visualization reads only stored Worker observations");
});

/* ── OCM traffic simulation ──────────────────────────────────────────────── */

test("the orbs visibly exchange simulated OCM beats and the page still reads only its own field", async t => {
  const { window, host, engine, frames, providerCalls, fieldCalls } = interactiveHarness(t, {
    tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER,
    fieldHandler: () => Response.json({ success: true, data: fieldSnapshot(window, { stockCount: 12, fxCount: 6 }) })
  });
  await flush();
  const drive = now => {
    let guard = 0;
    while (frames.length && guard < 40) { const callback = frames.shift(); callback(now); guard += 1; }
  };
  drive(NOW);
  await flush();
  const first = engine.state.trafficPackets.slice();
  assert.ok(first.length > 0, "the ring carries simulated beats once rows are stored");
  assert.ok(first.some(packet => packet.from === "stocks" && packet.to === "fx"), "a beat crosses the ring one way");
  assert.ok(first.some(packet => packet.from === "fx" && packet.to === "stocks"), "and the neighbour answers on the same link");
  assert.ok(first.some(packet => packet.to === "origin"), "the Center Origin is part of the exchange");
  assert.ok(first.every(packet => ["stocks", "fx", "origin"].includes(packet.from)), "a Disc with nothing stored sends no beat");
  assert.ok(first.every(packet => ["stocks", "fx", "origin"].includes(packet.to)), "and receives none either");
  assert.ok(first.every(packet => Number.isFinite(packet.x) && Number.isFinite(packet.y)), "every beat is drawn at a real canvas point");
  const before = new Map(first.map(packet => [`${packet.from}->${packet.to}`, packet]));
  /* The harness runs reduced-motion, so the loop is on demand: a fresh state
     change requests one frame, which is drawn at the later clock. */
  engine.selectNode(engine.state.selected);
  await flush();
  drive(NOW + 900);
  await flush();
  const moved = engine.state.trafficPackets.filter(packet => {
    const previous = before.get(`${packet.from}->${packet.to}`);
    return previous && Math.hypot(packet.x - previous.x, packet.y - previous.y) > 0.04;
  });
  assert.ok(moved.length > 0, "the beats move between frames, so the exchange is animated");
  const note = host.querySelector("[data-gi-orb2-ocm]");
  assert.match(note.textContent, /OCM TRAFFIC SIMULATION/);
  assert.match(note.textContent, /sends nothing/);
  assert.match(note.textContent, /2 orbs transmitting/);
  assert.equal(providerCalls.length, 0, "the simulated exchange never calls a provider");
  assert.ok(fieldCalls().length >= 1 && fieldCalls().length <= 2, "and the page still opens only its own stored-field reads");
});

test("an orb awaiting its first beat carries no simulated OCM traffic", async t => {
  const { window, host, engine, frames } = interactiveHarness(t, {
    tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER,
    fieldHandler: () => Response.json({ success: true, data: fieldSnapshot(window, { stockCount: 0, fxCount: 0 }) })
  });
  await flush();
  let guard = 0;
  while (frames.length && guard < 40) { const callback = frames.shift(); callback(NOW); guard += 1; }
  await flush();
  assert.equal(engine.state.trafficPackets.length, 0, "no stored rows across the constellation means every lane is idle");
  assert.equal(engine.state.ocmLanes, 0);
  const note = host.querySelector("[data-gi-orb2-ocm]");
  assert.match(note.textContent, /every lane idle.*no fresh market observations to carry/);
  assert.doesNotMatch(note.textContent, /orb transmitting/);
});
