/* HarshalOS — Characters app wiring test.

   What this covers that the engine and route suites cannot: the desktop app's own
   decisions — which berths a beat requests, what it records in the browser ledger, what
   the stage says when the Worker refuses, and the honest fallback to synthetic rehearsal.
   It renders the real app script in happy-dom with a stubbed fetch, so no provider is
   ever called and no key is ever involved.

   Run: node --test tests/characters-ui-test.mjs */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Window } from "happy-dom";
import { TICKERBOT_WATCHLIST } from "../worker/good-intelligence-tickerbot.mjs";

const beatSource = readFileSync(new URL("../js/characters-beat.js", import.meta.url), "utf8");
const castSource = readFileSync(new URL("../js/characters-cast.js", import.meta.url), "utf8");
const marketSource = readFileSync(new URL("../js/good-intelligence-market-context.js", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../js/apps-characters.js", import.meta.url), "utf8");

const NOW = Date.parse("2026-10-03T12:00:00.000Z");

function bars(count = 120, drift = 0.05) {
  let previous = 100;
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index * drift + Math.sin(index / 9) * 1.4;
    const open = previous;
    previous = close;
    return {
      time: new Date(NOW - (count - index) * 60 * 60_000).toISOString(),
      open, high: Math.max(open, close) + 0.2, low: Math.min(open, close) - 0.2, close,
      volume: 1000 + 200 * Math.sin(index / 4), confirmed: true
    };
  });
}

const liveBeatPayload = symbols => ({
  success: true,
  environment: "characters-beat",
  data: {
    schema: "characters-beat-v1",
    beatAt: new Date(NOW).toISOString(),
    interval: "1h",
    cadenceMinutes: 60,
    holdMs: 3_600_000,
    instruments: symbols.map(symbol => ({
      symbol, status: "bars",
      marketContext: {
        schema: "gi-market-context-v1", synthetic: false,
        source: "Tickerbot · split-adjusted OHLCV · as of 2026-10-03T11:00:00Z",
        symbol, timeframe: "1h", bars: bars()
      }
    })),
    spend: { requestedSymbols: symbols.length, upstreamCalls: symbols.length, cacheHits: 0, unavailable: 0 }
  }
});

/* The app holds a cadence-length timer for auto-beat, so happy-dom's waitUntilComplete
   would wait out an entire (simulated) hour. The tests drive the beat explicitly instead:
   flush the stub fetch's microtasks, then assert on the rendered result. */
const flush = async () => { for (let turn = 0; turn < 40; turn++) await Promise.resolve(); };

async function boot(t, { handler, seed } = {}) {
  const window = new Window({ url: "https://os.example/", settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  t.after(() => window.happyDOM.abort());
  /* Reduced motion keeps the app to one static frame — happy-dom has no 2D context, and
     the app must stay useful (plan, ledger, detail card, log) without a canvas. */
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  window.HOS = { record() {} };
  const calls = [];
  window.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return handler(String(url), options);
  };
  window.document.write("<!doctype html><html><body><div id=\"host\"></div></body></html>");
  window.eval("var APPS = window.APPS = [];");
  window.eval(marketSource);
  window.eval(beatSource);
  window.eval(castSource);
  window.eval(appSource);
  const APPS = window.APPS;
  assert.ok(APPS.some(app => app.id === "characters"), "the app registered itself");
  if (seed) window.localStorage.setItem("harshalos.characters.ledger.v1", JSON.stringify(seed));
  window.APPS.unshift({ id: "good-intelligence", tickerbotWatchlist: TICKERBOT_WATCHLIST });
  const container = window.document.getElementById("host");
  const toasts = [];
  APPS.find(app => app.id === "characters").render(container, { toast: (...args) => toasts.push(args) });
  /* Turn auto-beat off before awaiting: the beat on open still runs, but no hour-long
     timer survives to hold the test process open. */
  container.querySelector("[data-ch-auto]").dispatchEvent(new window.Event("click"));
  await flush();
  return { window, container, calls, toasts, text: () => container.textContent };
}

test("the app renders the plan, the cast, and the honesty footer without any provider call", async t => {
  const { text, calls, container } = await boot(t, { handler: async () => { throw new Error("no network in this test"); } });
  const body = text();
  assert.match(body, /Budget plan/);
  assert.match(body, /Reserve held/);
  assert.match(body, /1,500/);
  assert.match(body, /Full sweep/);
  assert.match(body, /not investment advice/i);
  assert.match(body, /provider dashboard remains the authority/i);
  assert.ok(container.querySelectorAll("[data-ch-cadence-chip]").length === 5, "every reviewed cadence is offered");
  assert.match(container.querySelector("[data-ch-plan-note]").textContent, /symbols per beat/);
  assert.match(container.querySelector("[data-ch-plan-note]").textContent, /sweep/i, "the plan states what a full sweep costs in wall-clock time");
  assert.ok(calls.length >= 1, "the app tried exactly one live beat on open");
  assert.match(container.querySelector("[data-ch-source-badge]").textContent, /Synthetic rehearsal|Tickerbot Live/);
});

test("an unconfigured Worker falls back to labeled rehearsal and spends nothing", async t => {
  const { container, calls, text } = await boot(t, {
    handler: async () => Response.json({ success: false, message: "Tickerbot is not configured on this Worker. Add the TICKERBOT_API_KEY Worker secret." }, { status: 503 })
  });
  assert.equal(calls.length, 1, "one refused attempt, then no more live calls");
  assert.match(container.querySelector("[data-ch-source-badge]").textContent, /Synthetic rehearsal/);
  assert.match(container.querySelector("[data-ch-source-badge]").textContent, /not real market data/i);
  assert.match(text(), /Live beat unavailable/);
  assert.match(text(), /0 calls/, "the ledger stays at zero provider calls");
  assert.match(text(), /SYNTH/, "the beat log marks the rehearsal entries");
  assert.match(container.querySelector("[data-ch-log]").textContent, /AAPL/);
  assert.equal(container.querySelector("[data-ch-ledger]").textContent.includes("0 calls"), true);
  const firstSymbol = TICKERBOT_WATCHLIST[0].symbol;
  assert.match(container.querySelector("[data-ch-detail]").textContent, new RegExp(firstSymbol));
});

test("a live beat requests only the due berths and records the provider's own call count", async t => {
  const requested = [];
  const { window, container, text } = await boot(t, {
    handler: async url => {
      requested.push(url);
      const symbols = decodeURIComponent(new URL(url, "https://os.example").searchParams.get("symbols") || "").split(",");
      return Response.json(liveBeatPayload(symbols));
    }
  });
  assert.equal(requested.length, 1);
  const url = new URL(requested[0], "https://os.example");
  assert.equal(url.pathname, "/api/characters/v1/beat");
  assert.equal(url.searchParams.get("interval"), "1h");
  assert.equal(url.searchParams.get("cadence"), "60");
  const due = url.searchParams.get("symbols").split(",");
  assert.equal(due.length, 11, "an hourly 10,000-call plan refreshes 11 berths per beat");
  assert.equal(new Set(due).size, due.length, "no symbol is requested twice in one beat");
  assert.ok(due.every(symbol => TICKERBOT_WATCHLIST.some(entry => entry.symbol === symbol)), "only allowlisted symbols are requested");

  const ledger = JSON.parse(window.localStorage.getItem("harshalos.characters.ledger.v1"));
  assert.equal(ledger.calls, 11);
  assert.equal(ledger.beats, 1);
  assert.deepEqual(ledger.history[0].symbols.sort(), [...due].sort());
  assert.equal(ledger.history[0].synthetic, false);
  assert.match(text(), /LIVE 11 calls/);
  assert.doesNotMatch(text(), /SYNTHETIC REHEARSAL — NOT REAL MARKET DATA/, "a live beat is not watermarked synthetic");

  /* The next beat must ask for different berths: the rotation advances through the cast. */
  container.querySelector("[data-ch-beat]").dispatchEvent(new window.Event("click"));
  await flush();
  const second = new URL(requested[1], "https://os.example").searchParams.get("symbols").split(",");
  assert.equal(second.filter(symbol => due.includes(symbol)).length, 0, "a second beat moves to the next-eldest berths");
});

test("an exhausted browser ledger refuses to beat instead of spending past the budget", async t => {
  const { container, calls, text } = await boot(t, {
    handler: async url => {
      const symbols = decodeURIComponent(new URL(url, "https://os.example").searchParams.get("symbols") || "").split(",").filter(Boolean);
      return Response.json(liveBeatPayload(symbols));
    },
    seed: { month: "2026-10", calls: 10000, beats: 900, featured: [], lastRefreshedAt: {}, history: [] }
  });
  assert.equal(calls.length, 0, "an exhausted ledger makes no provider request at all");
  assert.match(text(), /budget is spent/i);
  assert.equal(container.querySelector("[data-ch-ledger]").textContent.includes("10,000 calls"), true);
});

test("a beat whose instruments carry no bars freezes those berths and says so", async t => {
  const { container, text } = await boot(t, {
    handler: async url => {
      const symbols = decodeURIComponent(new URL(url, "https://os.example").searchParams.get("symbols") || "").split(",").filter(Boolean);
      return Response.json({
        success: true, environment: "characters-beat",
        data: {
          schema: "characters-beat-v1", beatAt: new Date(NOW).toISOString(), interval: "1h", cadenceMinutes: 60, holdMs: 3_600_000,
          instruments: symbols.map(symbol => ({ symbol, status: "unavailable", code: "empty", message: "Tickerbot returned no bars for this ticker and interval." })),
          spend: { requestedSymbols: symbols.length, upstreamCalls: 0, cacheHits: 0, unavailable: symbols.length }
        }
      });
    }
  });
  assert.match(text(), /No symbol in this beat returned bars/i);
  assert.match(text(), /nothing was fabricated/i);
  assert.match(container.querySelector("[data-ch-detail]").textContent, /No beat has reached this berth yet|no bars/i);
  const ledger = JSON.parse(container.ownerDocument.defaultView.localStorage.getItem("harshalos.characters.ledger.v1"));
  assert.equal(ledger.calls, 0, "a refused read is not billed to the ledger");
});
