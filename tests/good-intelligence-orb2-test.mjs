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
const dxySource = await readText("js/good-intelligence-dxy.js");
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

function harness() {
  const window = {};
  const context = vm.createContext({ window, globalThis: window, Object, Array, String, Number, Math, Set, Map });
  vm.runInContext(castSource, context, { filename: "js/characters-cast.js" });
  vm.runInContext(beatSource, context, { filename: "js/characters-beat.js" });
  vm.runInContext(catalogSource, context, { filename: "js/characters-disc-catalog.js" });
  vm.runInContext(dxySource, context, { filename: "js/good-intelligence-dxy.js" });
  vm.runInContext(rosterSource, context, { filename: "js/good-intelligence-market-roster.js" });
  vm.runInContext(scenariosSource, context, { filename: "js/good-intelligence-orb2-scenarios.js" });
  vm.runInContext(orbSource, context, { filename: "js/good-intelligence-orb2.js" });
  return { cast: window.CharactersCast, orb: window.GoodIntelligenceOrb2, scenarios: window.GoodIntelligenceOrb2Scenarios };
}

/* ── the stored server field, as the Worker writes it ─────────────────────── */

function marketSummary(interval = "1d") {
  return {
    status: "ready", source: `massive · reviewed OHLCV · as of ${new Date(NOW).toISOString()}`,
    timeframe: interval, dataShape: "ohlcv", synthetic: false, barCount: 80, volumeAvailable: true,
    latestBar: { time: NOW, open: 100, high: 102, low: 99.5, close: 101, volume: 1200, confirmed: true },
    previousClose: 100, changePct: 1,
    basis: 99, bands: { lower1000: 92, upper1000: 108 },
    vfi: { value: 12, signal: 4, available: true },
    waveTrend: { wt1: 20, wt2: 8, zone: "neutral" }
  };
}

function fieldRow(window, symbol, { discId = "stocks", provider = "massive", interval = "1d", confirmed = true, market = true, name = symbol, sector = "Technology & platforms" } = {}) {
  return {
    schema: "gi-orb2-field-observation-v1", symbol, displaySymbol: symbol, name, sector, discId, provider, interval,
    status: market ? "bars" : "unavailable", reason: "server-sweep", code: "", message: "",
    beatId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301", observedAt: NOW, barTime: NOW, confirmed,
    market: market ? marketSummary(interval) : null,
    motion: window.CharactersBeat.motion(null, { bearingBase: 0 }),
    beatTypes: market ? ["observation", "message", "trade", "authorization", "permission"] : ["observation", "message"]
  };
}

function fieldSnapshot(window, { fxCount = 6, stockCount = 52, interval = "1d", types = ["observation"] } = {}) {
  const fxSymbols = Array.from(window.GoodIntelligenceDxy.COMPONENTS, component => component.symbol);
  const stocks = Array.from(window.GoodIntelligenceDxy.buildFiringOrder(MARKET_ROSTER), asset => asset.symbol);
  const observations = [
    ...fxSymbols.slice(0, fxCount).map(symbol => fieldRow(window, symbol, { discId: "fx" })),
    ...stocks.slice(0, stockCount).map(symbol => fieldRow(window, symbol, { discId: "stocks" }))
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
      counts: { stored: observations.length, observed: observations.length, confirmed: observations.length, held: 0, reviewedInstruments: 90 }
    },
    dxy: { ok: true, status: "ready", value: 99.123, asOf: NOW, missing: [], refreshSymbol: null },
    observations
  };
}

function interactiveHarness(t, { historyStore = new Map(), sessionId, preferences, tickers = null, watchlist = MARKET_ROSTER, timeframe = "1d", clock = null, fieldHandler = null } = {}) {
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
      return Response.json({ success: true, instruments: [{ symbol: "BTCUSD", name: "Bitcoin", sector: "Cryptocurrency" }], ranking: { provider: "CoinGecko" } });
    }
    if (path.includes("/api/characters/v1/beat")) {
      providerCalls.push({ url: path, options });
      return Response.json({ success: false, message: "Orb 2 renders the server field; it does not call a provider beat route." }, { status: 404 });
    }
    return Response.json({ success: false, message: "Unexpected route." }, { status: 404 });
  };
  const canvasCalls = [];
  const gradient = { addColorStop() {} };
  const canvasContext = new Proxy({}, {
    get(target, key) {
      if (key === "createRadialGradient") return () => gradient;
      if (key === "measureText") return () => ({ width: 0 });
      if (key in target) return target[key];
      return () => { canvasCalls.push(key); };
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
  window.eval(dxySource);
  window.eval(rosterSource);
  window.eval(scenariosSource);
  window.eval(orbSource);
  const host = window.document.createElement("div");
  window.document.body.appendChild(host);
  const engine = window.GoodIntelligenceOrb2.mount(host, {
    roster: window.CharactersCast.NPC_ROSTER, watchlist,
    ...(tickers ? { tickers, timeframe } : {}),
    beat: window.CharactersBeat, cast: window.CharactersCast, discCatalog: window.CharactersDiscCatalog,
    marketContext: window.GoodIntelligenceMarketContext, dxy: window.GoodIntelligenceDxy
  });
  const canvas = host.querySelector("[data-gi-orb2-canvas]");
  Object.defineProperties(canvas, {
    offsetParent: { configurable: true, value: host },
    clientWidth: { configurable: true, value: 720 },
    clientHeight: { configurable: true, value: 440 }
  });
  t.after(() => engine.destroy());
  return {
    window, host, engine, calls, providerCalls, historyStore, frames, clock, canvasCalls,
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
});

test("Orb 2 rejects missing and malformed ticker rows instead of inventing symbols", () => {
  const { orb } = harness();
  const nodes = orb.buildNodes([{ symbol: "AAPL", name: "Apple", sector: "Technology" }, { symbol: "bad ticker" }, null]);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].symbol, "AAPL");
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
  assert.equal(engine.state.dxy.value, 99.123, "the snapshot's fixed DXY benchmark is rendered at center");
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
  assert.equal(engine.state.ignition.phase, "dxy");
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
  assert.match(engine.state.routeSteps.ledger, /MASSIVE \d+ LEFT TODAY/);
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
  assert.ok(host.textContent.includes("Massive · AUTOMATIC DAILY"), "the provider pill names the stored provider");
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
    schema: "gi-orb2-beat-v1", beatId: sessionId, at: NOW, reason: "ignition", discId: "stocks", provider: "massive",
    interval: "1d", cadenceMinutes: 1, calls: 1, cacheHits: 0,
    instruments: [{
      symbol: "AAPL", displaySymbol: "AAPL", status: "bars", provider: "massive", code: "", message: "", lane: null,
      market: marketSummary("1d"), motion: fieldRow({ CharactersBeat: { motion: () => ({ mood: "coil" }) } }, "AAPL").motion
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
  assert.match(host.querySelector(".gi-orb2-center").textContent, /DXY FIXED BENCHMARK/);
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
  const dxyAt = indexHtml.indexOf("js/good-intelligence-dxy.js");
  const scenarioAt = indexHtml.indexOf("js/good-intelligence-orb2-scenarios.js");
  const orbAt = indexHtml.indexOf("js/good-intelligence-orb2.js");
  const appAt = indexHtml.indexOf("js/apps-good-intelligence.js");
  assert.ok(castAt < beatAt && beatAt < catalogAt && catalogAt < rosterAt && rosterAt < dxyAt && dxyAt < scenarioAt && scenarioAt < orbAt && orbAt < appAt,
    "the cast, beat engine, Disc catalog, roster, DXY helper, and scenarios load before Orb 2 and its tab");
});

test("the Worker field route is the documented contract the page renders", () => {
  assert.match(workerSource, /orb2-saved-beats|ORB2_BEATS|beats/i);
  assert.match(orbSource, /fieldStatus|routeSteps/);
});
