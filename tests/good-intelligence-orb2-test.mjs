/* Orb 2 composes the existing Characters market-beat contract into a 3D Good Intelligence surface. */
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
const orbSource = await readText("js/good-intelligence-orb2.js");
const appSource = await readText("js/apps-good-intelligence.js");
const charactersAppSource = await readText("js/apps-characters.js");
const indexHtml = await readText("index.html");
const appCss = await readText("css/good-intelligence.css");
const workerSource = await readText("worker/good-intelligence-orb2-beats.mjs");

const WATCHLIST = [
  { symbol: "AAPL", name: "Apple", sector: "Technology & platforms" },
  { symbol: "MSFT", name: "Microsoft", sector: "Technology & platforms" },
  { symbol: "NVDA", name: "NVIDIA", sector: "Semiconductors" },
  { symbol: "XOM", name: "Exxon Mobil", sector: "Energy" }
];
const NOW = Date.parse("2026-10-04T12:00:00.000Z");
const rosterSandbox = { window: {} };
rosterSandbox.globalThis = rosterSandbox.window;
vm.runInNewContext(rosterSource, rosterSandbox, { filename: "js/good-intelligence-market-roster.js" });
const MARKET_ROSTER = rosterSandbox.window.GoodIntelligenceMarketRoster.assets;
const flush = async () => { for (let turn = 0; turn < 45; turn++) await Promise.resolve(); };

function marketBars(count = 80) {
  let previous = 100;
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index * 0.12 + Math.sin(index / 6) * 1.1;
    const open = previous;
    previous = close;
    return {
      time: NOW - (count - index) * 86_400_000,
      open,
      high: Math.max(open, close) + 0.3,
      low: Math.min(open, close) - 0.3,
      close,
      volume: 1200 + index * 3,
      confirmed: true
    };
  });
}

function livePayload(symbols, disc = "stocks", provider = "massive", intervalOverride = null, barCount = 80) {
  const providerId = provider === "alpha" ? "alpha-vantage" : provider;
  const interval = intervalOverride || (provider === "alpha" ? "1mo" : provider === "tickerbot" ? "1h" : "1d");
  return {
    success: true,
    environment: "characters-beat",
    data: {
      schema: "characters-beat-v1",
      disc,
      provider,
      beatAt: new Date(NOW).toISOString(),
      interval,
      cadenceMinutes: provider === "alpha" ? 60 : provider === "massive" ? 1 : 15,
      instruments: symbols.map(symbol => ({
        symbol,
        displaySymbol: symbol,
        status: "bars",
        provider: providerId,
        marketContext: {
          schema: "gi-market-context-v1",
          synthetic: false,
          dataShape: "ohlcv",
          quoteCurrency: "USD",
          source: `${providerId} · reviewed OHLCV · as of ${new Date(NOW).toISOString()}`,
          symbol,
          timeframe: interval,
          bars: marketBars(barCount)
        }
      })),
      spend: {
        requestedSymbols: symbols.length,
        providerAttempts: symbols.length,
        tickerbotAttempts: provider === "tickerbot" ? symbols.length : 0,
        massiveAttempts: provider === "massive" ? symbols.length : 0,
        alphaVantageAttempts: provider === "alpha" ? symbols.length : 0,
        cacheHits: 0,
        unavailable: 0,
        ledgerStatus: provider === "tickerbot" ? "ready" : "not-applicable",
        massiveLedgerStatus: provider === "massive" ? "ready" : "not-applicable",
        alphaVantageLedgerStatus: provider === "alpha" ? "ready" : "not-applicable",
        durable: provider === "tickerbot" ? { month: "2026-10", calls: symbols.length, workerLimit: 10000 } : null,
        massiveDaily: provider === "massive" ? { day: "2026-10-04", calls: symbols.length, dailyLimit: 300 } : null,
        alphaVantageDaily: provider === "alpha" ? { day: "2026-10-04", calls: symbols.length, dailyLimit: 25 } : null
      }
    }
  };
}

function harness() {
  const window = {};
  const context = vm.createContext({ window, globalThis: window, Object, Array, String, Number, Math, Set, Map });
  vm.runInContext(castSource, context, { filename: "js/characters-cast.js" });
  vm.runInContext(beatSource, context, { filename: "js/characters-beat.js" });
  vm.runInContext(catalogSource, context, { filename: "js/characters-disc-catalog.js" });
  vm.runInContext(dxySource, context, { filename: "js/good-intelligence-dxy.js" });
  vm.runInContext(rosterSource, context, { filename: "js/good-intelligence-market-roster.js" });
  vm.runInContext(orbSource, context, { filename: "js/good-intelligence-orb2.js" });
  return { cast: window.CharactersCast, orb: window.GoodIntelligenceOrb2, dxy: window.GoodIntelligenceDxy, marketRoster: window.GoodIntelligenceMarketRoster };
}

function interactiveHarness(t, { beatHandler, historyStore = new Map(), sessionId, preferences, tickers = null, watchlist = WATCHLIST, timeframe = "1d", clock = null } = {}) {
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
  const persisted = [];
  window.fetch = async (url, options = {}) => {
    const path = String(url);
    calls.push({ url: path, options });
    if (path.includes("/api/good-intelligence/v1/orb2/beats")) {
      const requestUrl = new URL(path, window.location.href);
      const requestSession = requestUrl.searchParams.get("sessionId");
      if (options.method === "POST") {
        try {
          const event = JSON.parse(options.body);
          persisted.push(event);
          const saved = historyStore.get(requestSession) || [];
          historyStore.set(requestSession, [...saved.filter(item => item.beatId !== event.beatId), event]
            .sort((left, right) => left.at - right.at).slice(-120));
        } catch { /* assertions catch malformed persisted records */ }
        return Response.json({ success: true, stored: true });
      }
      return Response.json({ success: true, schema: "gi-orb2-beat-history-v1", beats: historyStore.get(requestSession) || [] });
    }
    if (path.includes("/api/characters/v1/discs?disc=crypto")) {
      return Response.json({ success: true, instruments: [{ symbol: "BTCUSD", name: "Bitcoin", sector: "Cryptocurrency" }], ranking: { provider: "CoinGecko" } });
    }
    if (path.includes("/api/characters/v1/beat")) {
      if (beatHandler) return beatHandler(path, options);
      const requestUrl = new URL(path, window.location.href);
      const symbols = (requestUrl.searchParams.get("symbols") || "AAPL").split(",").filter(Boolean);
      return Response.json(livePayload(
        symbols,
        requestUrl.searchParams.get("disc") || "stocks",
        requestUrl.searchParams.get("provider") || "massive",
        requestUrl.searchParams.get("interval")
      ));
    }
    return Response.json({ success: false, message: "Unexpected route." }, { status: 404 });
  };
  const canvasCalls = [];
  const canvasStyles = [];
  const gradient = { addColorStop() {} };
  const canvasContext = new Proxy({}, {
    get(target, key) {
      if (key === "createRadialGradient") return () => gradient;
      if (key === "measureText") return () => ({ width: 0 });
      if (key in target) return target[key];
      return () => { canvasCalls.push(key); };
    },
    set(target, key, value) {
      target[key] = value;
      if (["fillStyle", "strokeStyle"].includes(key)) canvasStyles.push([key, value]);
      return true;
    }
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
  window.eval(orbSource);
  const host = window.document.createElement("div");
  window.document.body.appendChild(host);
  const engine = window.GoodIntelligenceOrb2.mount(host, {
    roster: window.CharactersCast.NPC_ROSTER,
    watchlist,
    ...(tickers ? { tickers, timeframe } : {}),
    beat: window.CharactersBeat,
    cast: window.CharactersCast,
    discCatalog: window.CharactersDiscCatalog,
    marketContext: window.GoodIntelligenceMarketContext,
    dxy: window.GoodIntelligenceDxy
  });
  const canvas = host.querySelector("[data-gi-orb2-canvas]");
  Object.defineProperties(canvas, {
    offsetParent: { configurable: true, value: host },
    clientWidth: { configurable: true, value: 720 },
    clientHeight: { configurable: true, value: 440 }
  });
  t.after(() => engine.destroy());
  return {
    window, host, engine, calls, persisted, historyStore, canvasCalls, canvasStyles, frames, clock,
    sessionId: window.localStorage.getItem("harshalos.good-intelligence.orb2.session.v1"),
    text: () => host.textContent
  };
}

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
  assert.doesNotMatch(orbSource, /context2d\.moveTo\(center\.x, center\.y\)/,
    "the normal activity renderer does not draw a static Center Origin tether");
});

test("Orb 2 rejects missing and malformed ticker rows instead of inventing symbols", () => {
  const { orb } = harness();
  const nodes = orb.buildNodes([{ symbol: "AAPL", name: "Apple", sector: "Technology" }, { symbol: "bad ticker" }, null]);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].symbol, "AAPL");
});

test("the first same-origin FX beat checks deploy readiness, fixes DXY at center, then fires six FX and all 52 ticker beats in order", async t => {
  const clock = { now: NOW };
  const { window, host, engine, calls, persisted } = interactiveHarness(t, {
    tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER, timeframe: "1h", clock
  });
  await flush();
  const marketCalls = () => calls.filter(call => call.url.includes("/api/characters/v1/beat"));
  assert.equal(calls.some(call => call.url.includes("/api/characters/v1/deploy")), false,
    "deployment readiness does not add a separate browser route or network call");
  assert.equal(engine.state.ignition.workerReady, true, "the first Worker response confirms the Massive D1 readiness gate");
  assert.equal(engine.state.ignition.phase, "dxy");
  assert.equal(marketCalls().length, 1, "the initial same-origin request combines the Worker readiness gate with exactly one FX component");
  const firstUrl = new URL(marketCalls()[0].url, "https://os.example");
  assert.equal(firstUrl.searchParams.get("disc"), "fx");
  assert.equal(firstUrl.searchParams.get("provider"), "massive");
  assert.equal(firstUrl.searchParams.get("symbols"), "EURUSD");
  assert.equal(firstUrl.searchParams.get("interval"), "1d");
  assert.equal(firstUrl.searchParams.get("cadence"), "1");
  assert.equal(marketCalls()[0].options.credentials, "same-origin",
    "the same-origin Worker validates its secret and daily D1 ledger before the EURUSD upstream request");
  assert.equal(engine.nodes.length, 52, "the demo exposes one orb for every dated ticker asset");
  assert.ok(engine.nodes.every(node => node.id.endsWith("-1d")), "the 52-asset ignition forces daily orb geometry");
  assert.equal(host.querySelector("[data-gi-orb2-timeframe]").value, "1d");
  assert.equal(host.querySelector("[data-gi-orb2-timeframe]").disabled, true, "timeframe changes cannot bypass Stocks/1d during ignition");
  assert.equal(host.querySelectorAll("[data-gi-orb2-firing-list] [data-symbol]").length, 52);
  assert.equal(host.querySelector("[data-gi-orb2-firing-list] [data-symbol]").getAttribute("data-symbol"), "NVDA",
    "the ticker sequence begins with the highest-cap asset in the highest-cap sector");
  assert.match(host.querySelector(".gi-orb2-center").textContent, /DXY FIXED BENCHMARK/);
  assert.match(host.querySelector("[data-gi-orb2-origin-status]").textContent, /DXY BENCHMARK/);
  assert.match(host.querySelector("[data-gi-orb2-ignition-dxy]").textContent, /1\/6 FX CLOSES/);

  for (let step = 1; step < 58; step += 1) {
    clock.now += 60_001;
    assert.equal(await engine.beatNow("manual"), true, `sequence request ${step + 1} succeeds`);
    await flush();
  }
  const allMarketCalls = marketCalls().map(call => new URL(call.url, "https://os.example"));
  assert.equal(allMarketCalls.length, 58, "six one-symbol FX component beats precede 52 one-symbol ticker beats");
  const fxOrder = Array.from(window.GoodIntelligenceDxy.COMPONENTS, component => component.symbol);
  assert.deepEqual(allMarketCalls.slice(0, 6).map(url => [url.searchParams.get("disc"), url.searchParams.get("symbols")]),
    fxOrder.map(symbol => ["fx", symbol]));
  const expectedTickers = Array.from(window.GoodIntelligenceDxy.buildFiringOrder(MARKET_ROSTER), asset => asset.symbol);
  assert.deepEqual(allMarketCalls.slice(6).map(url => [url.searchParams.get("disc"), url.searchParams.get("symbols")]),
    expectedTickers.map(symbol => ["stocks", symbol]));
  assert.ok(allMarketCalls.every(url => url.searchParams.get("provider") === "massive" &&
    url.searchParams.get("interval") === "1d" && url.searchParams.get("cadence") === "1"));
  assert.ok(allMarketCalls.every(url => url.searchParams.get("symbols").split(",").length === 1),
    "the sequence never batches or skips over an unavailable slot");
  assert.equal(engine.state.ignition.active, false);
  assert.equal(engine.state.ignition.phase, "complete");
  assert.equal(engine.state.ignition.tickerFired.size, 52);
  assert.equal(engine.state.dxy.ok, true);
  assert.match(host.querySelector("[data-gi-orb2-ignition-dxy]").textContent, /^DXY [0-9]+\.[0-9]{3}/);
  assert.equal(host.querySelectorAll('[data-gi-orb2-firing-list] [data-beat-state="fired"]').length, 52);
  assert.equal(host.querySelector("[data-gi-orb2-ignition-restart]").hidden, false);
  assert.ok(persisted.every(event => event.reason === "ignition"), "all sequence observations retain their ignition provenance");
});
test("a missing Worker secret holds at the first route check before any DXY input or ticker beat", async t => {
  let requestedSymbols = null;
  const { host, engine, calls } = interactiveHarness(t, {
    tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER,
    beatHandler: async path => {
      requestedSymbols = new URL(path, "https://os.example").searchParams.get("symbols");
      return Response.json({
        success: false,
        message: "Massive daily beats are not configured. Add the MASSIVE_API_KEY Worker secret."
      }, { status: 503 });
    }
  });
  await flush();
  assert.equal(requestedSymbols, "EURUSD", "the first existing Worker request is the first DXY component");
  assert.equal(calls.filter(call => call.url.includes("/api/characters/v1/beat")).length, 1);
  assert.equal(calls.some(call => call.url.includes("/api/characters/v1/deploy")), false,
    "a failed readiness check does not rely on a separate health request");
  assert.equal(engine.state.ignition.phase, "server-deploy");
  assert.equal(engine.state.ignition.workerReady, false);
  assert.equal(engine.state.auto, false);
  assert.equal(engine.state.ignition.fxFired.size, 0);
  assert.equal(engine.state.ignition.tickerFired.size, 0);
  assert.match(host.textContent, /Massive daily beats are not configured/);
});

test("an unreadable D1 ledger holds the first Worker response before accepting the DXY origin", async t => {
  const { host, engine, calls } = interactiveHarness(t, {
    tickers: MARKET_ROSTER, watchlist: MARKET_ROSTER,
    beatHandler: async () => {
      const payload = livePayload(["EURUSD"], "fx", "massive", "1d");
      const instrument = payload.data.instruments[0];
      instrument.status = "cached";
      payload.data.spend.providerAttempts = 0;
      payload.data.spend.massiveAttempts = 0;
      payload.data.spend.cacheHits = 1;
      payload.data.spend.unavailable = 0;
      payload.data.spend.massiveDaily = null;
      payload.data.spend.massiveLedgerStatus = "unavailable";
      return Response.json(payload);
    }
  });
  await flush();
  assert.equal(calls.filter(call => call.url.includes("/api/characters/v1/beat")).length, 1);
  assert.equal(engine.state.ignition.phase, "server-deploy");
  assert.equal(engine.state.ignition.workerReady, false);
  assert.equal(engine.state.ignition.fxInputs.size, 0, "a cached close is still held until D1 deployment readiness passes");
  assert.equal(engine.state.ignition.fxFired.size, 0);
  assert.equal(engine.state.ignition.tickerFired.size, 0);
  assert.equal(engine.state.dxy, null);
  assert.match(host.textContent, /DEPLOY CHECK HELD/);
  assert.match(host.textContent, /D1 ledger is unavailable/);
});

test("Orb 2 mounts interactive local controls and defaults motion off for reduced-motion visitors", async t => {
  const { window, calls, frames, persisted, canvasCalls } = interactiveHarness(t);
  t.after(() => window.happyDOM.abort());
  const host = window.document.createElement("div");
  window.document.body.appendChild(host);
  const orb = window.GoodIntelligenceOrb2;
  let clearBeats = 0, restoreBeats = 0;
  const engine = orb.mount(host, {
    tickers: [{ symbol: "AAPL", name: "Apple", sector: "Technology" }],
    onClearBeats() { clearBeats++; }, onRestoreBeats() { restoreBeats++; }
  });
  const canvas = host.querySelector("[data-gi-orb2-canvas]");
  Object.defineProperties(canvas, {
    offsetParent: { configurable: true, value: host },
    clientWidth: { configurable: true, value: 720 },
    clientHeight: { configurable: true, value: 440 }
  });
  await flush();
  const firstFrame = frames.shift();
  assert.equal(typeof firstFrame, "function", "mount schedules a render frame when canvas is available");
  frames.splice(0).forEach(pending => pending(100));
  firstFrame(100);
  assert.ok(canvasCalls.includes("fillRect") && canvasCalls.includes("arc"), "the scheduled frame paints the projected sphere and nodes");
  assert.equal(engine.nodes.length, 1);
  assert.equal(engine.state.autoRotate, false, "prefers-reduced-motion starts with rotation disabled");
  assert.ok(calls.some(call => call.url.includes("/api/characters/v1/beat?disc=stocks&provider=massive")), "opening the live Orb starts the same Massive daily beat route as Characters");
  assert.ok(host.textContent.includes("Massive · AUTOMATIC DAILY"));
  assert.ok(host.textContent.includes("AAPL ·"), "the inspector shows the actual returned instrument");
  assert.ok(persisted.length >= 1, "a returned live beat is saved through the server history route");
  assert.equal(persisted[0].schema, "gi-orb2-beat-v1");
  assert.equal(persisted[0].instruments[0].symbol, "AAPL");
  assert.ok(persisted[0].instruments[0].market.latestBar.close > 0, "the compact saved record contains a real supplied last bar");
  assert.equal(typeof persisted[0].instruments[0].motion.npc.speed, "number", "the saved event uses the Characters motion directive");
  assert.ok(engine.state.blends["stocks:AAPL"], "the renderer records the Characters per-berth glide between beats");
  assert.equal(engine.state.displayed["stocks:AAPL"], engine.state.motions["stocks:AAPL"],
    "reduced motion snaps to the exact Characters directive rather than animating continuously");
  assert.equal(engine.state.routeSteps.ledger, "READY · MASSIVE D1", "the pathway settles from REQUESTING to the returned ledger state");

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
  host.querySelector("[data-gi-orb2-clear-beats]").click();
  assert.equal(clearBeats, 1, "Clear beats asks Characters to archive and hide the session beat log");
  window.document.dispatchEvent(new window.CustomEvent("harshalos:characters-beats:status", { detail: { hasStored: true } }));
  const restore = host.querySelector("[data-gi-orb2-restore-beats]");
  assert.equal(restore.hidden, false, "stored beats can be restored after clearing");
  restore.click();
  assert.equal(restoreBeats, 1, "Restore stored beats reintroduces the archived session history");
  engine.state.yaw = 1;
  host.querySelector("[data-gi-orb2-reset]").click();
  assert.equal(engine.state.yaw, -0.68, "Reset view restores the camera");
  assert.equal(clearBeats, 2, "Reset view also clears beat context");
  engine.setVisible(false);
  assert.equal(engine.state.visible, false, "leaving the Orb 2 tab pauses the renderer and auto timer");
  engine.setVisible(true);
  assert.equal(engine.state.visible, true, "returning to the view resumes it");
  engine.destroy();
});

test("the Orb 2 module stays browser-local: same-origin routes only, no provider or authority call", () => {
  assert.doesNotMatch(orbSource, /https?:\/\//, "no absolute provider or authority URL is shipped to the browser");
  assert.doesNotMatch(orbSource, /XMLHttpRequest|WebSocket|EventSource/, "the renderer opens no separate network channel");
  assert.match(orbSource, /\/api\/characters\/v1\/beat/, "live market beats use only the same-origin Characters Worker route");
  assert.match(orbSource, /\/api\/good-intelligence\/v1\/orb2\/beats/, "beat history uses only the same-origin Orb 2 history route");
  assert.match(orbSource, /SAVED_BEAT_SESSION_KEY/, "only an opaque random browser key is retained locally for the D1 archive");
  assert.match(orbSource, /no OCM message is sent/i, "the route copy states its no-transmission boundary");
  assert.match(orbSource, /Resolution is not an authority source/, "the Resolution Axis invariant is retained in the displayed model");
  assert.match(orbSource, /MODEL BOUNDARY/, "the model boundary paragraph is displayed");
  assert.match(orbSource, /not an OCM message, market signal, recommendation, authorization, transaction, or permission to act/, "the boundary names every refused action");
  assert.doesNotMatch(orbSource, /FractalFlame|OrbFilm|drawFractalFrames|Demo\.flame/, "no fractal, flame, or film engine is wired into the market view");
  assert.doesNotMatch(orbSource, /data-gi-orb2-fractal/, "and no fractal control is offered for it");
});

test("Orb 2 restores the last saved beat from the server after a page refresh", async t => {
  const firstVisit = interactiveHarness(t);
  await flush();
  assert.ok(firstVisit.persisted.length, "the first visit saves a live beat");
  const savedBeat = firstVisit.persisted[0];
  const restoredVisit = interactiveHarness(t, {
    historyStore: firstVisit.historyStore,
    sessionId: firstVisit.sessionId,
    preferences: {
      discId: "stocks", interval: "1d", source: "live", auto: false,
      cadence: 15, budget: 10000, stretch: false, tierMode: false, tierSweepHours: 24
    }
  });
  await flush();
  assert.ok(restoredVisit.engine.state.events.some(event => event.beatId === savedBeat.beatId),
    "server history repopulates the event log under the same anonymous browser session");
  assert.equal(restoredVisit.engine.state.lastBeatAt, savedBeat.at, "the restored last-beat time survives the refresh");
  assert.equal(restoredVisit.engine.state.persistence, "saved");
  assert.match(restoredVisit.engine.state.persistenceNote, /Restored 1 server beat/);
  assert.ok(restoredVisit.host.textContent.includes("AAPL ·"), "the restored observation remains available to the inspector");
  assert.equal(restoredVisit.calls.filter(call => call.url.includes("/api/characters/v1/beat")).length, 0,
    "restoring a saved Tickerbot on-demand session does not silently make a new provider request");
});

test("Orb 2 keeps Massive automatic beats active across every reviewed Characters Disc", async t => {
  const { window, host, calls, engine } = interactiveHarness(t);
  await flush();
  const discSelect = host.querySelector("[data-gi-orb2-disc]");
  for (const disc of ["fx", "crypto", "commodities", "indices"]) {
    discSelect.value = disc;
    discSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
    await flush();
    const request = calls.map(call => call.url).filter(url => url.includes("/api/characters/v1/beat"))
      .map(url => new URL(url, "https://os.example"))
      .find(url => url.searchParams.get("disc") === disc);
    assert.ok(request, `${disc} selection starts its due automatic Massive beat`);
    assert.equal(request.searchParams.get("provider"), "massive");
    assert.equal(request.searchParams.get("interval"), "1d");
    assert.equal((request.searchParams.get("symbols") || "").split(",").length, 1,
      "Massive keeps the reviewed one-instrument-per-request rotation across all five Discs");
  }
  assert.equal(engine.state.discId, "indices");
});

test("Orb 2 makes manual Tickerbot available immediately and keeps Massive pacing at five requests per minute", async t => {
  const { window, host, engine, calls } = interactiveHarness(t);
  await flush();
  const before = calls.filter(call => call.url.includes("/api/characters/v1/beat")).length;
  assert.equal(window.GoodIntelligenceOrb2.MASSIVE_REQUESTS_PER_MINUTE, 5);
  assert.equal(window.GoodIntelligenceOrb2.MASSIVE_BEAT_MS, 12_000);
  host.querySelector("[data-gi-orb2-auto]").click();
  assert.equal(engine.state.auto, false);
  assert.equal(engine.state.cooldownUntil, 0, "manual Tickerbot does not inherit Massive's pacing hold");
  assert.ok(host.textContent.includes("Manual Tickerbot is ready now"));
  const requested = await engine.beatNow("manual");
  assert.equal(requested, true, "manual Tickerbot can be requested immediately after pausing Massive");
  await flush();
  const tickerbot = calls.find(call => call.url.includes("/api/characters/v1/beat") && call.url.includes("provider=tickerbot"));
  assert.ok(tickerbot, "the immediate manual stock mode routes to Tickerbot");
  assert.equal(new URL(tickerbot.url, "https://os.example").searchParams.get("interval"), "1d");
  assert.ok(calls.filter(call => call.url.includes("/api/characters/v1/beat")).length > before);
  assert.match(host.textContent, /Tickerbot · ON DEMAND/);
});

test("Orb 2 keeps D1 ledger refusal explicit and does not substitute a provider", async t => {
  const handler = () => Response.json({
    success: false,
    message: "No Massive request was sent.",
    data: {
      instruments: [{ symbol: "AAPL", status: "unavailable", provider: "massive", code: "massive-ledger-unavailable", message: "The durable Massive ledger is unavailable. No Massive request was sent." }],
      spend: { providerAttempts: 0, massiveLedgerStatus: "unavailable" }
    }
  }, { status: 503 });
  const { host, engine, calls, persisted } = interactiveHarness(t, { beatHandler: handler });
  await flush();
  assert.equal(engine.state.routeSteps.ledger, "UNAVAILABLE", "the separate D1 daily ledger failure is visible in the pathway status");
  assert.equal(engine.state.routeSteps.model, "HELD · NO DATA");
  assert.match(host.textContent, /COMMUNITY_DB Worker binding/);
  assert.match(host.textContent, /migration 0007_massive_daily_call_ledger.sql/);
  assert.match(host.textContent, /Waiting will not repair a missing D1 table/);
  assert.equal(calls.filter(call => call.url.includes("/api/characters/v1/beat")).length, 1, "the Worker response is rendered without provider fallback or retry");
  assert.equal(persisted.length, 1, "even a visible no-call ledger refusal is saved as a server-side beat");
  assert.equal(persisted[0].calls, 0);
  assert.equal(persisted[0].instruments[0].market, null, "a refusal record carries no fabricated market data");
  const historyWrite = calls.find(call => call.url.includes("/api/good-intelligence/v1/orb2/beats") && call.options.method === "POST");
  assert.equal(historyWrite.options.keepalive, true, "the save can finish when the view is immediately refreshed");
});

test("Orb 2 explains and records an Alpha Vantage D1-ledger refusal without substituting another provider", async t => {
  const handler = path => {
    const requestUrl = new URL(path, "https://os.example");
    if (requestUrl.searchParams.get("provider") !== "alpha") {
      return Response.json(livePayload(["AAPL"], "stocks", "massive", "1d"));
    }
    return Response.json({
      success: false,
      message: "No Alpha Vantage request was sent.",
      data: {
        instruments: [{ symbol: "AAPL", status: "unavailable", provider: "alpha-vantage", code: "alpha-vantage-ledger-unavailable", message: "The durable Alpha Vantage ledger is unavailable. No Alpha Vantage request was sent." }],
        spend: { providerAttempts: 0, alphaVantageLedgerStatus: "unavailable" }
      }
    }, { status: 503 });
  };
  const { host, engine, calls, persisted } = interactiveHarness(t, { beatHandler: handler });
  await flush();
  const interval = host.querySelector("[data-gi-orb2-interval]");
  interval.value = "1mo";
  interval.dispatchEvent(new host.ownerDocument.defaultView.Event("change", { bubbles: true }));
  assert.ok(engine.state.cooldownUntil > Date.now(), "changing to Alpha Vantage activates the provider warm-up");
  engine.state.cooldownUntil = 0; // Advance only this test clock after verifying the no-request boundary.
  await engine.beatNow("manual");
  await flush();
  assert.equal(engine.state.routeSteps.ledger, "UNAVAILABLE");
  assert.match(host.textContent, /migration 0006_alpha_vantage_daily_call_ledger.sql/);
  assert.match(host.textContent, /Waiting 60 seconds will not repair a missing D1 table/);
  const providers = calls.filter(call => call.url.includes("/api/characters/v1/beat")).map(call => new URL(call.url, "https://os.example").searchParams.get("provider"));
  assert.deepEqual(providers, ["massive", "alpha"], "only the selected provider is queried; no fallback route is tried");
  assert.equal(persisted.at(-1).provider, "alpha");
  assert.equal(persisted.at(-1).calls, 0);
  assert.equal(persisted.at(-1).instruments[0].market, null);
});

test("Good Intelligence lazily mounts Orb 2 with Characters beat modules and keeps the authority boundary", () => {
  const tvTab = appSource.indexOf('data-gi-view="tradingview"');
  const orbTab = appSource.indexOf('data-gi-view="orb2"');
  assert.ok(tvTab !== -1 && orbTab > tvTab, "Orb 2 follows the chart tabs");
  assert.match(appSource, /data-gi-orb2-panel[^>]*hidden/, "the heavy canvas panel is hidden until selected");
  assert.match(appSource, /\["news", "markets", "tradingview", "orb2", "nabdiscs"\]\.includes/, "the view switcher accepts Orb 2 and the NAB Discs sibling");
  assert.match(appSource, /state\.orb2Engine = Orb2\.mount/, "the renderer mounts only through the Orb 2 module");
  assert.match(appSource, /sends no OCM message, no trade or order, and confers no authority/i);
});

/* ── The 2026-10-05 restore: Characters and Orb 2 keep their own surfaces ─────
   NAB Discs arrived after the Orb 2 carry-over and took over both #app=characters
   and the Orb 2 tab by delegation. These assertions pin the restore: Orb 2 renders
   the carried-over model itself, the flow and Center Origin readouts are on the canvas,
   Center Origin carries the whiteboard parts, and NAB Discs keeps its own id. */
test("Orb 2 renders the carried-over model itself instead of delegating to NAB Discs", () => {
  assert.doesNotMatch(orbSource, /NabDiscsView/, "the Orb 2 module no longer hands its host to the NAB view");
  assert.doesNotMatch(orbSource, /legacySourceView/, "no escape hatch is needed once the classic view is the view");
  assert.match(orbSource, /data-gi-orb2-disc/, "the reviewed Disc selector is part of the live model");
  assert.match(catalogSource, /Disc1 · The 52 Cards/, "Discs 1–5 keep their reviewed names for navigation");
  assert.match(catalogSource, /sourceChannels: DISCS/, "the composite field keeps the same roster as its legacy source channels");
  assert.match(charactersAppSource, /id: "characters",\s*\n\s*title: "Characters"/, "the Characters desktop app is the Characters app again");
  assert.match(charactersAppSource, /id: "nab-discs"/, "NAB Discs keeps its own desktop id and its own window");
  assert.match(indexHtml, /js\/nab-discs-view\.js\?v=/, "the NAB composite field still ships");
});

test("the volume-flow readout and the Center Origin strip are mounted over the canvas", async t => {
  const { host, canvasCalls, frames } = interactiveHarness(t);
  await flush();
  const [flow] = host.querySelectorAll("[data-gi-orb2-flow-readout]");
  assert.ok(flow, "the volume-flow readout is visible");
  assert.match(flow.textContent, /VOLUME FLOW/, "the readout states what it is waiting for");
  assert.equal(host.querySelector("[data-gi-orb2-fractal-status]"), null, "the FRACTAL FRAMES line is gone with the fractal engine");
  assert.equal(host.querySelector("[data-gi-orb2-fractal]"), null, "and no fractal toggle remains to hide it");
  const origin = host.querySelector("[data-gi-orb2-origin-status]");
  assert.ok(origin, "the Center Origin strip replaces it on the canvas");
  assert.match(origin.textContent, /ORIGIN · CPU/, "the local origin remains labeled as the CPU");
  assert.match(origin.textContent, /DXY BENCHMARK/, "the fixed DXY reference is displayed separately at center");
  assert.match(host.querySelector(".gi-orb2-center").textContent, /DXY FIXED BENCHMARK/);
  assert.match(appCss, /\.gi-orb2-flow-readout\s*\{/, "the readout's CSS survives so the boxes actually render");
  assert.match(appCss, /\.gi-orb2-flow-rate-note\s*\{/, "the cycles-per-second caveat is styled");
  assert.equal(host.querySelector("[data-gi-orb2-disc]").options.length, 5, "the five reviewed Discs are selectable");
  const frame = frames.shift();
  if (typeof frame === "function") frame(120);
  assert.ok(canvasCalls.includes("stroke"), "the shells, lattice, and nodes are painted");
  await flush();
});

test("the synthetic rehearsal source stays retired in the restored view", () => {
  assert.doesNotMatch(orbSource, /data-gi-orb2-source/, "no data-source control resurrects the retired synthetic mode");
  assert.doesNotMatch(orbSource, /rehearsalBeat|Beat\.rehearse/, "no synthetic generator ships in this view");
  assert.match(orbSource, /synthetic or demo data is not substituted/, "an unavailable beat is held, never substituted");
});

test("Center Origin carries the inner shell, the PDH phase, and the Human Key gate", async t => {
  const { host, window, frames } = interactiveHarness(t);
  await flush();
  const origin = host.querySelector("[data-gi-orb2-origin-status]");
  assert.ok(origin, "the origin strip is mounted over the canvas");
  assert.match(origin.textContent, /ORIGIN · CPU/, "Center Origin is labeled as the CPU");
  assert.match(origin.textContent, /GATE UNREAD/, "an unread kernel is stated as unread, never defaulted");
  assert.match(origin.textContent, /PDH UNDECLARED/, "an undeclared phase is stated, not invented");
  assert.ok(host.querySelector("[data-gi-orb2-gate]"), "the gate pill sits in the display controls");
  assert.ok(host.querySelector("[data-gi-orb2-uts]"), "the UTS watch is readable from the model");
  assert.match(orbSource, /shellRing\(/, "the inner shell is drawn through the model camera");
  assert.match(orbSource, /phaseLoop\(/, "the declared phase shifts a phase loop at Center Origin");
  assert.match(orbSource, /PHASE_SHIFT_RADIANS/, "phase shifts come from a fixed display table, not a data channel");
  assert.match(orbSource, /const phaseShift = PHASE_SHIFT_RADIANS\[phase\] \?\? null/, "an unknown phase shifts nothing");
  const frame = frames.shift();
  if (typeof frame === "function") frame(140);
  const savedPreferences = JSON.parse(window.localStorage.getItem("harshalos.good-intelligence.orb2.preferences.v1") || "{}");
  assert.equal(savedPreferences.innerShell ?? savedPreferences.gate ?? savedPreferences.originStatus ?? null, null,
    "the origin assembly persists nothing — it reads the local kernel live, so no new preference can drift");
  await flush();
});

test("the standalone Massive Markets desktop window remains retired", () => {
  assert.doesNotMatch(indexHtml, /css\/massive\.css/);
  assert.doesNotMatch(indexHtml, /js\/apps-massive\.js/);
  const castAt = indexHtml.indexOf("js/characters-cast.js");
  const beatAt = indexHtml.indexOf("js/characters-beat.js");
  const catalogAt = indexHtml.indexOf("js/characters-disc-catalog.js");
  const rosterAt = indexHtml.indexOf("js/good-intelligence-market-roster.js");
  const dxyAt = indexHtml.indexOf("js/good-intelligence-dxy.js");
  const orbAt = indexHtml.indexOf("js/good-intelligence-orb2.js");
  const appAt = indexHtml.indexOf("js/apps-good-intelligence.js");
  assert.ok(castAt < beatAt && beatAt < catalogAt && catalogAt < rosterAt && rosterAt < dxyAt && dxyAt < orbAt && orbAt < appAt,
    "the cast, beat engine, Disc catalog, sourced ticker roster, and DXY helper load before Orb 2 and its tab");
});
