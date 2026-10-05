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
  assert.match(orbSource, /fractal frame processing/i, "The Orb's fractal frame processing is carried over as display-only");
  assert.doesNotMatch(orbSource, /data-gi-orb2-source/, "the retired synthetic/demo data source control is not shipped to the browser");
  assert.doesNotMatch(orbSource, /rehearsalBeat|Beat\.rehearse/, "no synthetic rehearsal generator runs in this view");
  assert.doesNotMatch(orbSource, /switched to explicitly labeled synthetic rehearsal/, "a failed live beat never switches itself to synthetic data");
  assert.match(orbSource, /synthetic or demo data is not substituted/i, "an unavailable beat leaves its berth held and says so plainly");
  assert.match(orbSource, /source: "live"/, "the model boots live-only and stays live-only");
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

test("Orb 2 can process The Orb's fractal frames through its own camera and degrades without them", async t => {
  const { window, host, engine, frames, canvasCalls } = interactiveHarness(t);
  await flush();
  assert.ok(host.querySelector("[data-gi-orb2-fractal]"), "the fractal core toggle is offered with the display controls");
  assert.equal(host.querySelector("[data-gi-orb2-fractal-status]"), null, "the removed fractal status box is not mounted over the model");
  assert.equal(host.querySelector("[data-gi-orb2-flow-readout]"), null, "the removed flow status box is not mounted over the model");
  assert.doesNotMatch(appCss, /gi-orb2-flow-readout|gi-orb2-flow-rate-note/, "the old horizontal HUD boxes have no residual styling");
  const idleFrame = frames.shift();
  assert.equal(typeof idleFrame, "function", "the model schedules its wire-core render frame");
  idleFrame(150);
  assert.ok(canvasCalls.includes("stroke"), "without the film or flame modules the model still draws its wire core");

  /* The Orb's frame processors, stubbed exactly as the real globals appear:
     one shared 200-frame film and one shared 120-frame Demo.flame player. */
  const wrapped = [];
  const coreDraws = [];
  const playheads = [];
  const frameImage = { naturalWidth: 1500, naturalHeight: 1000 };
  const film = {
    ready: true, dead: false, loaded: 200, total: 200,
    frameAt: () => 42,
    sampleAt: time => { playheads.push(time); return { i0: 42, i1: 43, frac: 0.5, img0: frameImage, img1: null }; }
  };
  window.OrbFilm = {
    shared: () => film,
    drawWrapped: (ctx, options) => { wrapped.push(options); return true; },
    CFG: { alphaMax: 0.9 }
  };
  const flame = {
    ready: true, baking: false, current: 17.25, frames: new Array(120),
    flameModulation: () => ({ energy: 0.75, pulse: 0.5, phase: 1, speedMult: 1, active: true }),
    drawOn: (ctx, cx, cy, size, alpha) => { coreDraws.push({ cx, cy, size, alpha }); return true; }
  };
  window.FractalFlame = { shared: () => flame };

  /* The reduced-motion harness does not auto-reschedule frames, so a display
     change is used to schedule the render that processes the fractal frames. */
  const pathsToggle = host.querySelector("[data-gi-orb2-paths]");
  pathsToggle.dispatchEvent(new window.Event("change", { bubbles: true }));
  const nextFrame = frames.shift();
  assert.equal(typeof nextFrame, "function", "a render frame is pending after the beat settles");
  nextFrame(200);
  assert.equal(wrapped.length, 1, "the shared OrbFilm frame is wrapped onto the model's node shell");
  assert.equal(typeof wrapped[0].project, "function", "the wrap uses this model's own 3D camera");
  assert.equal(typeof wrapped[0].toScreen, "function", "the wrap uses this model's own screen projection");
  assert.equal(wrapped[0].R, 2.06, "the film wraps on the same node shell the model draws");
  assert.ok(Number.isFinite(wrapped[0].cs.x) && Number.isFinite(wrapped[0].cs.y), "the wrap is anchored at this model's projected center");
  assert.ok(wrapped[0].alpha > 0 && wrapped[0].alpha <= 0.5, "the film stays translucent so market paths remain legible");
  assert.equal(coreDraws.length, 1, "without exposed bounce frames the Demo.flame core uses the shared billboard draw");
  assert.ok(coreDraws[0].size >= 44 && coreDraws[0].size <= 62, "the core breathes with the flame's harmonic energy");
  assert.ok(coreDraws[0].alpha > 0 && coreDraws[0].alpha <= 1, "the core obeys the same legitimacy gate as The Orb");

  /* The film clock must advance with wall time — the frozen film-strip regression. */
  pathsToggle.dispatchEvent(new window.Event("change", { bubbles: true }));
  const advanceFrame = frames.shift();
  assert.equal(typeof advanceFrame, "function", "another render frame is pending");
  advanceFrame(216);
  assert.equal(wrapped.length, 2, "the film is processed again on the next frame");
  assert.ok(playheads.length >= 2, "the film playhead is sampled on every processed frame");
  assert.equal(playheads[1] - playheads[0], 16, "the film clock advances with frame time instead of freezing");

  /* With bounce frames exposed, the ApophysisAV render is drawn through the 3D
     reference triangle — the O-X-Y basis rotated in space and projected through
     this model's own camera — instead of a camera-facing billboard. */
  const billboardDraws = coreDraws.length;
  const coreFrames = [window.document.createElement("canvas"), window.document.createElement("canvas")];
  coreFrames.forEach((canvasFrame, index) => { canvasFrame.width = 40 + index; canvasFrame.height = 40 + index; });
  flame.playhead = () => ({ cur: 17.25, i0: 0, i1: 1, frac: 0.5, dir: 1 });
  flame.frames = coreFrames;
  const drawImageBefore = canvasCalls.filter(call => call === "drawImage").length;
  pathsToggle.dispatchEvent(new window.Event("change", { bubbles: true }));
  const quadFrame = frames.shift();
  assert.equal(typeof quadFrame, "function", "a render frame follows the core change");
  quadFrame(232);
  assert.ok(canvasCalls.filter(call => call === "drawImage").length > drawImageBefore,
    "the .flame frame is drawn as an oriented image through the rotated reference triangle");
  assert.equal(coreDraws.length, billboardDraws, "the billboard fallback is retired once bounce frames are exposed");
  assert.equal(host.querySelector("[data-gi-orb2-fractal-status]"), null,
    "fractal frame rendering stays active without restoring the removed status box");

  /* Hiding the fractal core restores the plain wire model without breaking the beat view. */
  const toggle = host.querySelector("[data-gi-orb2-fractal]");
  toggle.checked = false;
  toggle.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.equal(engine.state.showFractal, false);
  assert.equal(JSON.parse(window.localStorage.getItem("harshalos.good-intelligence.orb2.preferences.v1")).showFractal, false,
    "the fractal display choice persists with the existing anonymous local preferences");
  const wrappedBefore = wrapped.length;
  const drawnBefore = canvasCalls.filter(call => call === "drawImage").length;
  pathsToggle.dispatchEvent(new window.Event("change", { bubbles: true }));
  const offFrame = frames.shift();
  assert.equal(typeof offFrame, "function", "a render frame follows the display change");
  offFrame(240);
  assert.equal(wrapped.length, wrappedBefore, "no film frame is processed once the fractal core is hidden");
  assert.equal(canvasCalls.filter(call => call === "drawImage").length, drawnBefore, "no core frame is drawn once the fractal core is hidden");
  assert.equal(host.querySelector("[data-gi-orb2-fractal-status]"), null, "hiding the frames does not restore a canvas status box");
});

test("Orb 2 places reviewed ticker cores above and below the horizontal FBB baseline", async t => {
  /* Massive rotates one reviewed instrument per minute, so the Worker answer
     is widened here the way a settled multi-beat session would look: every
     strand symbol observed once, each with a different drift so band ranks
     and the paired inner-spheroid layout have real separation to show. */
  const driftPayload = symbols => {
    /* 260 bars: the reviewed Fibonacci band length is 200, so a shorter
       series honestly stays band-less ("warming-up") and every orb would
       rest held at the basis ring. */
    const payload = livePayload(symbols, "stocks", "massive", null, 260);
    payload.data.instruments.forEach((instrument, index) => {
      const bars = instrument.marketContext.bars;
      for (let bar = bars.length - 12; bar < bars.length; bar += 1) {
        const shift = 1 + (index - symbols.length / 2) * 0.02;
        bars[bar].close *= shift;
        bars[bar].high = Math.max(bars[bar].high, bars[bar].close) + 0.2 * shift;
        bars[bar].low = Math.min(bars[bar].low, bars[bar].close) - 0.2 * shift;
      }
    });
    return payload;
  };
  const { window, frames, canvasCalls, canvasStyles } = interactiveHarness(t, {
    beatHandler: () => Response.json(driftPayload(["AAPL", "MSFT", "NVDA", "AMD", "CVX", "XOM"]))
  });
  const tickers = [
    { symbol: "AAPL", name: "Apple", sector: "Technology & platforms" },
    { symbol: "MSFT", name: "Microsoft", sector: "Technology & platforms" },
    { symbol: "NVDA", name: "NVIDIA", sector: "Semiconductors" },
    { symbol: "AMD", name: "Advanced Micro Devices", sector: "Semiconductors" },
    { symbol: "CVX", name: "Chevron", sector: "Energy" },
    { symbol: "XOM", name: "Exxon Mobil", sector: "Energy" }
  ];
  const host = window.document.createElement("div");
  window.document.body.appendChild(host);
  const engine = window.GoodIntelligenceOrb2.mount(host, {
    tickers, watchlist: tickers, timeframe: "1h",
    beat: window.CharactersBeat, cast: window.CharactersCast,
    discCatalog: window.CharactersDiscCatalog, marketContext: window.GoodIntelligenceMarketContext
  });
  const canvas = host.querySelector("[data-gi-orb2-canvas]");
  Object.defineProperties(canvas, {
    offsetParent: { configurable: true, value: host },
    clientWidth: { configurable: true, value: 720 },
    clientHeight: { configurable: true, value: 440 }
  });
  t.after(() => engine.destroy());

  /* Beats settle before any assertion: a failure with fetches still in flight
     would deadlock the happy-dom teardown. */
  await flush();
  frames.splice(0).forEach(callback => callback(300));

  assert.ok(host.querySelector("[data-gi-orb2-series-mode]"), "the series mode control is offered with the ticker view");
  assert.ok(host.querySelector("[data-gi-orb2-series-a]"), "Series A has an editable reviewed-symbol input");
  assert.ok(host.querySelector("[data-gi-orb2-series-b]"), "Series B has an editable reviewed-symbol input");
  assert.equal(engine.helixState.mode, "dual", "the ticker view defaults to the double helix");
  assert.equal(engine.helixState.strands.a, 3, "Series A carries its half of the reviewed watchlist");
  assert.equal(engine.helixState.strands.b, 3, "Series B carries the other half");
  assert.equal(engine.nodes.length, 6, "both strands draw only their reviewed sets");

  /* The reduced-motion harness does not auto-reschedule, so each inspection
     pump drains the shared frame queue after nudging the display controls. */
  const drawOnce = () => {
    host.querySelector("[data-gi-orb2-paths]").dispatchEvent(new window.Event("change", { bubbles: true }));
    frames.splice(0).forEach(callback => callback(300));
  };
  drawOnce();
  const helix = engine.helixState;
  assert.equal(helix.positions.length, 6, "every dual-series orb receives a helix berth");
  assert.ok(helix.positions.every(entry => entry.p === null || Number.isFinite(entry.p)),
    "Fibonacci-band positions remain finite without clipping outer-band excursions");
  const strandA = helix.positions.filter(entry => entry.series === "A").sort((x, y) => x.rank - y.rank);
  assert.equal(strandA.length, 3);
  assert.ok(strandA.every(entry => entry.p !== null), "the live beat supplies bands for every Series A orb");
  assert.ok(strandA.every((entry, index) => index === 0 || strandA[index - 1].p <= entry.p),
    "strand order re-ranks by Fibonacci-band position, not by list order");
  assert.ok(helix.rungs >= 1, "rank-matched rungs connect the two strands");

  const pairCount = Math.max(helix.strands.a, helix.strands.b);
  const innerFieldRadius = 2.06 * 0.62;
  const uniqueTickerSites = new Set(helix.positions.map(entry => [entry.x, entry.y, entry.z].map(value => value.toFixed(6)).join(":")));
  assert.equal(uniqueTickerSites.size, helix.positions.length, "every ticker occupies its own position inside the nested field");
  assert.ok(helix.positions.every(entry => entry.orbRadius >= 0.19 && entry.orbRadius <= 0.235),
    "each ticker berth carries an individual spheroid radius, widened only by supplied volatility");
  assert.ok(helix.positions.every(entry => Math.abs(entry.y - (entry.p - 0.5) * 2 * innerFieldRadius) < 1e-9),
    "ticker height uses its own normalized FBB displacement, never rank or shell latitude");
  assert.ok(helix.positions.every(entry => Math.sign(entry.y) === Math.sign(entry.p - 0.5)),
    "above/below classification agrees with world height");
  for (let rank = 0; rank < pairCount; rank += 1) {
    const pairA = helix.positions.find(entry => entry.series === "A" && entry.rank === rank);
    const pairB = helix.positions.find(entry => entry.series === "B" && entry.rank === rank);
    assert.ok(pairA && pairB, `rank ${rank + 1} has independent A/B ticker cores`);
    assert.ok(Math.abs(Math.hypot(pairA.x-pairB.x,pairA.z-pairB.z)-0.4)<1e-9,
      "horizontal layout keeps same-rank cores distinct without constraining their heights");
  }
  assert.ok(engine.state.projected.every(point => point.model && point.orbRadius > 0 && point.visualRadius > 0),
    "the live canvas projection retains an individual 3D center and clickable visual radius for each ticker orb");
  assert.ok(engine.state.projected.every(point => {
    const berth = helix.positions.find(entry => entry.symbol === point.node.symbol && entry.series === point.node.series);
    return berth && Math.abs(point.model.y - berth.y) < 1e-6;
  }), "live projection preserves independent FBB heights");
  assert.match(canvas.getAttribute("aria-label"), /nested ticker spheroids/i,
    "the ticker-specific nested-orb structure is described to assistive technology");
  assert.ok(canvasCalls.includes("ellipse"), "the canvas draws nested, lit spheroids and not only flat rings");
  assert.ok(canvasStyles.some(([property, value]) => property === "strokeStyle" && value === "#6fd3ff"),
    "the open field retains a visible neutral-plane reference");

  /* The inspector explains the helix placement for the selected orb. */
  const detail = host.querySelector("[data-gi-orb2-detail]");
  assert.ok(detail.textContent.includes("Helix strand"), "the inspector names the orb's strand and rank");
  assert.ok(detail.textContent.includes("Fibonacci band position"), "the inspector reports the band position");
  assert.ok(detail.textContent.includes("Cross-series rung"), "the inspector names the rank-matched partner");
  assert.ok(detail.textContent.includes("Potential energy"), "the inspector reports the midline stretch");

  /* Unknown symbols are refused, never invented; valid ones are kept. */
  const seriesBInput = host.querySelector("[data-gi-orb2-series-b]");
  seriesBInput.value = "ZZZZ, TSLA, AAPL";
  seriesBInput.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.ok(host.textContent.includes("unreviewed symbol"), "an honest note explains the refused symbols");
  const afterRefusal = engine.helixState;
  assert.equal(afterRefusal.seriesB.length, 1, "only reviewed watchlist symbols are kept on Series B");
  assert.equal(afterRefusal.seriesB[0], "AAPL");
  assert.equal(afterRefusal.strands.b, 1, "the B strand shrinks to its reviewed members");
  const savedPrefs = JSON.parse(window.localStorage.getItem("harshalos.good-intelligence.orb2.preferences.v1"));
  assert.deepEqual(savedPrefs.seriesB, ["AAPL"], "the reshaped series persists in the anonymous local preferences");

  /* Single-set mode restores the whole-watchlist sector sphere. */
  const seriesModeSelect = host.querySelector("[data-gi-orb2-series-mode]");
  seriesModeSelect.value = "single";
  seriesModeSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.equal(engine.helixState.mode, "single");
  assert.equal(engine.nodes.length, 6, "single-set mode draws the full reviewed watchlist");
  assert.equal(engine.helixState.rungs, 0, "no rungs are drawn outside the double helix");
  drawOnce();
  assert.equal(engine.helixState.positions.length, 6, "single-set mode retains baseline mapping for every reviewed ticker");
});

test("Good Intelligence lazily mounts Orb 2 with Characters beat modules and keeps the authority boundary", () => {
  const tvTab = appSource.indexOf('data-gi-view="tradingview"');
  const orbTab = appSource.indexOf('data-gi-view="orb2"');
  assert.ok(tvTab !== -1 && orbTab > tvTab, "Orb 2 follows the chart tabs");
  assert.match(appSource, /data-gi-orb2-panel[^>]*hidden/, "the heavy canvas panel is hidden until selected");
  assert.match(appSource, /\["news", "markets", "tradingview", "orb2"\]\.includes/, "the view switcher accepts Orb 2");
  assert.match(appSource, /state\.orb2Engine = Orb2\.mount/, "the renderer mounts only through the Orb 2 module");
  assert.match(appSource, /sends no OCM message, no trade or order, and confers no authority/i);
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
