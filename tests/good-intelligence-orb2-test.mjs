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
const orbSource = await readText("js/good-intelligence-orb2.js");
const appSource = await readText("js/apps-good-intelligence.js");
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
  vm.runInContext(orbSource, context, { filename: "js/good-intelligence-orb2.js" });
  return { cast: window.CharactersCast, orb: window.GoodIntelligenceOrb2 };
}

function interactiveHarness(t, { beatHandler, historyStore = new Map(), sessionId, preferences } = {}) {
  const window = new Window({ url: "https://os.example/", settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
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
  window.APPS.push({ id: "good-intelligence", tickerbotWatchlist: WATCHLIST });
  window.eval(marketSource);
  window.eval(beatSource);
  window.eval(castSource);
  window.eval(catalogSource);
  window.eval(orbSource);
  const host = window.document.createElement("div");
  window.document.body.appendChild(host);
  const engine = window.GoodIntelligenceOrb2.mount(host, {
    roster: window.CharactersCast.NPC_ROSTER,
    watchlist: WATCHLIST,
    beat: window.CharactersBeat,
    cast: window.CharactersCast,
    discCatalog: window.CharactersDiscCatalog,
    marketContext: window.GoodIntelligenceMarketContext
  });
  const canvas = host.querySelector("[data-gi-orb2-canvas]");
  Object.defineProperties(canvas, {
    offsetParent: { configurable: true, value: host },
    clientWidth: { configurable: true, value: 720 },
    clientHeight: { configurable: true, value: 440 }
  });
  t.after(() => engine.destroy());
  return {
    window, host, engine, calls, persisted, historyStore, canvasCalls, canvasStyles, frames,
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

test("Orb 2 rejects missing and malformed ticker rows instead of inventing symbols", () => {
  const { orb } = harness();
  const nodes = orb.buildNodes([{ symbol: "AAPL", name: "Apple", sector: "Technology" }, { symbol: "bad ticker" }, null]);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].symbol, "AAPL");
});

test("Orb 2 mounts interactive local controls and defaults motion off for reduced-motion visitors", t => {
  const { window, calls, frames } = interactiveHarness();
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
  const firstFrame = frames.shift();
  assert.equal(typeof firstFrame, "function", "mount schedules a render frame when canvas is available");
  firstFrame(100);
  assert.ok(calls.includes("fillRect") && calls.includes("arc"), "the scheduled frame paints the projected sphere and nodes");
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
});

test("the Orb 2 module is browser-local and makes no provider or authority call", () => {
  assert.doesNotMatch(orbSource, /\bfetch\s*\(/, "the renderer does not fetch market or network data");
  assert.doesNotMatch(orbSource, /sessionStorage|XMLHttpRequest|WebSocket/, "the renderer does not open a separate storage or network channel");
  assert.match(orbSource, /SAVED_BEAT_SESSION_KEY/, "only an opaque random browser key is retained locally for the D1 archive");
  assert.match(orbSource, /No message is sent/, "the default route copy states its no-transmission boundary");
  assert.match(orbSource, /cannot authorize, resolve, commit, or transact/, "the visual model states its authority boundary");
  assert.match(orbSource, /Resolution is not an authority source/, "the Resolution Axis invariant is retained in the displayed model");
  assert.match(orbSource, /REVIEWED BEAT CONTEXT/, "the model labels the reviewed Characters beat context instead of fabricating a live quote");
  assert.match(orbSource, /Orb 2 receives none of those packets/, "the context explicitly excludes prices, ranks, and signals from this canvas");
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
      "Massive keeps the reviewed one-instrument-per-minute rotation across all five Discs");
  }
  assert.equal(engine.state.discId, "indices");
});

test("Orb 2 enforces a 60-second no-request warm-up when the active provider changes", async t => {
  const { window, host, engine, calls } = interactiveHarness(t);
  await flush();
  const before = calls.filter(call => call.url.includes("/api/characters/v1/beat")).length;
  host.querySelector("[data-gi-orb2-auto]").click();
  const changedAt = Date.now();
  assert.equal(engine.state.auto, false);
  assert.ok(engine.state.cooldownUntil > changedAt && engine.state.cooldownUntil - changedAt <= 60_000,
    "the warm-up deadline is no more than 60 seconds from the provider change");
  assert.ok(host.textContent.includes("PROVIDER WARM-UP · 01:00"));
  const requested = await engine.beatNow("manual");
  assert.equal(requested, false, "a manual click cannot bypass the warm-up");
  assert.equal(calls.filter(call => call.url.includes("/api/characters/v1/beat")).length, before, "no second provider request is made before cooldown ends");
  assert.match(host.textContent, /no request has been sent/i);
  // Move only this harness's state clock; this avoids sleeping in the test.
  engine.state.cooldownUntil = 0;
  await engine.beatNow("manual");
  await flush();
  const tickerbot = calls.find(call => call.url.includes("/api/characters/v1/beat") && call.url.includes("provider=tickerbot"));
  assert.ok(tickerbot, "after warm-up, the manual stock mode routes to Tickerbot");
  assert.ok(new URL(tickerbot.url, "https://os.example").searchParams.get("interval") === "1d");
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
  assert.match(host.textContent, /Waiting 60 seconds will not repair a missing D1 table/);
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
  assert.match(appSource, /\["news", "markets", "tradingview", "orb2"\]\.includes/, "the view switcher accepts Orb 2");
  assert.match(appSource, /state\.orb2Engine = Orb2\.mount/, "the renderer mounts only through the Orb 2 module");
  assert.match(appSource, /sends no messages, fetches no market data, and confers no authority/i);
});

test("the standalone Massive Markets desktop window remains retired", () => {
  assert.doesNotMatch(indexHtml, /css\/massive\.css/);
  assert.doesNotMatch(indexHtml, /js\/apps-massive\.js/);
  const castAt = indexHtml.indexOf("js/characters-cast.js");
  const beatAt = indexHtml.indexOf("js/characters-beat.js");
  const catalogAt = indexHtml.indexOf("js/characters-disc-catalog.js");
  const orbAt = indexHtml.indexOf("js/good-intelligence-orb2.js");
  const appAt = indexHtml.indexOf("js/apps-good-intelligence.js");
  assert.ok(castAt < beatAt && beatAt < catalogAt && catalogAt < orbAt && orbAt < appAt,
    "the cast, exact beat engine, and Disc catalog load before the Good Intelligence Orb 2 tab");
});
