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

function dailyBars(count = 100, drift = 0.05) {
  let previous = 100;
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index * drift + Math.sin(index / 9) * 1.4;
    const open = previous;
    previous = close;
    return {
      time: new Date(NOW - (count - index) * 24 * 60 * 60_000).toISOString(),
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
    cadenceMinutes: 15,
    holdMs: 900_000,
    instruments: symbols.map(symbol => ({
      symbol, status: "bars",
      marketContext: {
        schema: "gi-market-context-v1", synthetic: false,
        source: "Tickerbot · split-adjusted OHLCV · as of 2026-10-03T11:00:00Z",
        symbol, timeframe: "1h", bars: bars()
      }
    })),
    spend: {
      requestedSymbols: symbols.length, providerAttempts: symbols.length, cacheHits: 0, unavailable: 0,
      durable: { schema: "tickerbot-call-ledger-v1", month: "2026-10", calls: symbols.length,
        providerBudget: 10000, workerLimit: 10000, remaining: 10000 - symbols.length, exhausted: false, updatedAt: NOW },
      ledgerStatus: "ready"
    }
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
  assert.match(body, /provider dashboard remains the billing authority/i);
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
  assert.match(text(), /0 provider calls/, "the ledger stays at zero provider calls");
  assert.match(text(), /SYNTH/, "the beat log marks the rehearsal entries");
  assert.match(container.querySelector("[data-ch-log]").textContent, /AAPL/);
  assert.match(container.querySelector("[data-ch-ledger]").textContent, /0 Character calls/);
  assert.match(container.querySelector("[data-ch-plan]").textContent, /D1 snapshot/i);
  assert.match(container.querySelector("[data-ch-plan]").textContent, /no current D1 snapshot · Tickerbot calls fail closed/i);
  const firstSymbol = TICKERBOT_WATCHLIST[0].symbol;
  assert.match(container.querySelector("[data-ch-detail]").textContent, new RegExp(firstSymbol));
});

test("a live beat requests only the due berths and records the Worker-attempt count", async t => {
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
  assert.equal(url.searchParams.get("cadence"), "15");
  const due = url.searchParams.get("symbols").split(",");
  assert.equal(due.length, 2, "a 15-minute 10,000-call plan rotates two berths per beat");
  assert.equal(new Set(due).size, due.length, "no symbol is requested twice in one beat");
  assert.ok(due.every(symbol => TICKERBOT_WATCHLIST.some(entry => entry.symbol === symbol)), "only allowlisted symbols are requested");

  const ledger = JSON.parse(window.localStorage.getItem("harshalos.characters.ledger.v1"));
  assert.equal(ledger.calls, 2);
  assert.equal(ledger.beats, 1);
  assert.deepEqual(ledger.history[0].symbols.sort(), [...due].sort());
  assert.equal(ledger.history[0].synthetic, false);
  assert.match(text(), /LIVE 2 calls/);
  assert.match(container.querySelector("[data-ch-durable-ledger]").textContent, /2 \/ 10,000 Worker attempts/);
  assert.doesNotMatch(text(), /SYNTHETIC REHEARSAL — NOT REAL MARKET DATA/, "a live beat is not watermarked synthetic");

  /* The next beat must ask for different berths: the rotation advances through the cast. */
  container.querySelector("[data-ch-beat]").dispatchEvent(new window.Event("click"));
  await flush();
  const second = new URL(requested[1], "https://os.example").searchParams.get("symbols").split(",");
  assert.equal(second.filter(symbol => due.includes(symbol)).length, 0, "a second beat moves to the next-eldest berths");
});

test("the browser ledger is not authoritative; the Worker D1 limit refuses an exhausted month", async t => {
  const { container, calls, text } = await boot(t, {
    handler: async url => {
      const symbols = decodeURIComponent(new URL(url, "https://os.example").searchParams.get("symbols") || "").split(",").filter(Boolean);
      return Response.json({
        success: false, environment: "characters-beat", message: "Monthly Tickerbot call allowance exhausted.",
        data: {
          schema: "characters-beat-v1", beatAt: new Date(NOW).toISOString(), interval: "1h", cadenceMinutes: 15, holdMs: 900_000,
          instruments: symbols.map(symbol => ({ symbol, status: "unavailable", code: "budget-exhausted", message: "No provider request was sent." })),
          spend: { requestedSymbols: symbols.length, providerAttempts: 0, cacheHits: 0, unavailable: symbols.length,
            durable: { schema: "tickerbot-call-ledger-v1", month: "2026-10", calls: 10000,
              providerBudget: 10000, workerLimit: 10000, remaining: 0, exhausted: true, updatedAt: NOW },
            ledgerStatus: "ready" }
        }
      }, { status: 429 });
    },
    seed: { month: "2026-10", calls: 10000, beats: 900, featured: [], lastRefreshedAt: {}, history: [] }
  });
  assert.equal(calls.length, 1, "the app asks the shared D1 ledger instead of trusting stale browser storage");
  assert.match(text(), /monthly call limit/i);
  assert.match(container.querySelector("[data-ch-durable-ledger]").textContent, /10,000 \/ 10,000 Worker attempts/);
  assert.match(container.querySelector("[data-ch-ledger]").textContent, /10,000 Character calls/,
    "the local activity count remains separate from the Worker-wide allowance");
});

test("the exhausted Tickerbot month still permits a separately capped Alpha Vantage daily beat", async t => {
  const requested = [];
  const { container, text } = await boot(t, {
    handler: async url => {
      requested.push(url);
      const params = new URL(url, "https://os.example").searchParams;
      const symbols = (params.get("symbols") || "").split(",").filter(Boolean);
      if (params.get("interval") === "1d") {
        const day = new Date().toISOString().slice(0, 10);
        return Response.json({
          success: true, environment: "characters-beat",
          data: {
            schema: "characters-beat-v1", beatAt: new Date().toISOString(), interval: "1d", cadenceMinutes: 15, holdMs: 900_000,
            instruments: symbols.map(symbol => ({
              symbol, status: "bars", provider: "alpha-vantage",
              marketContext: {
                schema: "gi-market-context-v1", synthetic: false,
                source: "Alpha Vantage · unadjusted compact daily OHLCV · last closed session 2026-10-02",
                symbol, timeframe: "1d", bars: dailyBars()
              }
            })),
            spend: {
              requestedSymbols: symbols.length, providerAttempts: symbols.length,
              tickerbotAttempts: 0, alphaVantageAttempts: symbols.length, cacheHits: 0, unavailable: 0,
              durable: { schema: "tickerbot-call-ledger-v1", month: day.slice(0, 7), calls: 10000,
                providerBudget: 10000, workerLimit: 10000, remaining: 0, exhausted: true, updatedAt: Date.now() },
              ledgerStatus: "ready",
              alphaVantageDaily: { schema: "alpha-vantage-daily-call-ledger-v1", day,
                calls: symbols.length, dailyLimit: 25, remaining: 25 - symbols.length, exhausted: false, updatedAt: Date.now() },
              alphaVantageLedgerStatus: "ready"
            }
          }
        });
      }
      return Response.json({
        success: false, environment: "characters-beat", message: "Tickerbot monthly allowance is exhausted.",
        data: {
          schema: "characters-beat-v1", beatAt: new Date().toISOString(), interval: "1h", cadenceMinutes: 15, holdMs: 900_000,
          instruments: symbols.map(symbol => ({ symbol, status: "unavailable", provider: "tickerbot", code: "budget-exhausted", message: "No Tickerbot request was sent." })),
          spend: {
            requestedSymbols: symbols.length, providerAttempts: 0, tickerbotAttempts: 0, alphaVantageAttempts: 0,
            cacheHits: 0, unavailable: symbols.length,
            durable: { schema: "tickerbot-call-ledger-v1", month: "2026-10", calls: 10000,
              providerBudget: 10000, workerLimit: 10000, remaining: 0, exhausted: true, updatedAt: Date.now() },
            ledgerStatus: "ready", alphaVantageDaily: null, alphaVantageLedgerStatus: "not-applicable"
          }
        }
      }, { status: 429 });
    }
  });

  assert.equal(requested.length, 1, "the first hourly beat is refused by the Tickerbot monthly cap");
  assert.match(text(), /monthly call limit/i);
  const interval = container.querySelector("[data-ch-interval]");
  interval.value = "1d";
  interval.dispatchEvent(new container.ownerDocument.defaultView.Event("change"));
  container.querySelector("[data-ch-beat]").dispatchEvent(new container.ownerDocument.defaultView.Event("click"));
  await flush();

  assert.equal(requested.length, 2, "daily mode is allowed to reach the Worker despite the exhausted Tickerbot month");
  assert.equal(new URL(requested[1], "https://os.example").searchParams.get("interval"), "1d");
  assert.match(container.querySelector("[data-ch-detail]").textContent, /Alpha Vantage.*unadjusted compact daily OHLCV/);
  assert.match(container.querySelector("[data-ch-plan]").textContent, /2 \/ 25 used/);
  assert.match(container.querySelector("[data-ch-log]").textContent, /Alpha daily 2/);
  assert.doesNotMatch(container.querySelector("[data-ch-stage-note]").textContent, /monthly call limit/i,
    "a successful daily fallback clears the stale Tickerbot-cap refusal");
  assert.match(text(), /10,000 \/ 10,000 Worker attempts/,
    "Alpha Vantage's success does not change or conceal Tickerbot's separate monthly ledger");
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

test("two-lane mode nominates the featured berth as hot and labels the request", async t => {
  const requested = [];
  const { window, container, text } = await boot(t, {
    handler: async url => {
      requested.push(url);
      const params = new URL(url, "https://os.example").searchParams;
      const symbols = decodeURIComponent(params.get("symbols") || "").split(",").filter(Boolean);
      return Response.json(liveBeatPayload(symbols));
    }
  });
  /* Nominate the focused berth, then switch the two-lane beat on. */
  container.querySelector("[data-ch-feature]").dispatchEvent(new window.Event("click"));
  await flush();
  const tiers = container.querySelector("[data-ch-tier]");
  tiers.checked = true;
  tiers.dispatchEvent(new window.Event("change"));
  await flush();
  assert.match(container.querySelector("[data-ch-plan-tag]").textContent, /two-lane/);
  assert.ok(container.querySelectorAll("[data-ch-tier-target]").length === 4, "every sweep window is offered");
  assert.match(container.querySelector("[data-ch-tier-panel]").textContent, /every beat/);

  container.querySelector("[data-ch-beat]").dispatchEvent(new window.Event("click"));
  await flush();
  const url = new URL(requested[requested.length - 1], "https://os.example");
  const lanes = Object.fromEntries((url.searchParams.get("lanes") || "").split(",").filter(Boolean).map(entry => {
    const [symbol, lane] = entry.split(":");
    return [symbol, lane];
  }));
  const featured = JSON.parse(window.localStorage.getItem("harshalos.characters.ledger.v1")).featured;
  assert.equal(featured.length, 1);
  assert.equal(lanes[featured[0]], "hot", "the featured berth is paid for first");
  assert.equal(Object.values(lanes).filter(lane => lane === "hot").length, 1, "a 15-minute plan affords 1 hot berth and 1 sweep berth");
  assert.ok(Object.values(lanes).includes("sweep"), "the remaining calls walk the sweep");
  assert.match(container.querySelector("[data-ch-log]").textContent, /H/, "the beat log marks the hot lane");
  assert.match(container.querySelector("[data-ch-detail]").textContent, /hot lane/);
  assert.match(text(), /No extra provider calls|Two-lane beat/);
});

test("a cadence with no tier split leaves two-lane mode off and says why", async t => {
  const { window, container } = await boot(t, {
    handler: async url => {
      const symbols = decodeURIComponent(new URL(url, "https://os.example").searchParams.get("symbols") || "").split(",").filter(Boolean);
      return Response.json(liveBeatPayload(symbols));
    }
  });
  const cadence = container.querySelector("[data-ch-cadence]");
  cadence.value = "1440";
  cadence.dispatchEvent(new window.Event("change"));
  await flush();
  const tiers = container.querySelector("[data-ch-tier]");
  assert.equal(tiers.disabled, true, "a daily beat cannot split hot from sweep inside a day");
  const tierPanel = container.querySelector("[data-ch-tier-panel]").textContent;
  assert.match(tierPanel, /sweep alone is the whole plan/, "the app explains the refused split rather than greying out silently");
  assert.match(tierPanel, /same .* calls per month/, "and states that tiering would not have cost extra calls");
});
