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
const catalogSource = readFileSync(new URL("../js/characters-disc-catalog.js", import.meta.url), "utf8");
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

const monthlyBeatPayload = (symbols, { shape = "ohlc", quoteCurrency = "USD" } = {}) => ({
  success: true,
  environment: "characters-beat",
  data: {
    schema: "characters-beat-v1", disc: "monthly", beatAt: new Date(NOW).toISOString(), interval: "1mo", cadenceMinutes: 60, holdMs: 3_600_000,
    instruments: symbols.map(symbol => ({
      symbol, status: "bars", provider: "alpha-vantage",
      marketContext: {
        schema: "gi-market-context-v1", synthetic: false, dataShape: shape, quoteCurrency,
        source: `Alpha Vantage · monthly ${shape.toUpperCase()}`,
        symbol, timeframe: "1mo",
        bars: Array.from({ length: 30 }, (_, index) => {
          const close = 100 + index * 0.3;
          return {
            time: new Date(Date.UTC(2023, index, 1)).toISOString(), open: close - 0.5, high: close + 1, low: close - 1, close,
            ...(shape === "ohlcv" ? { volume: 1000 + index } : {}), confirmed: true
          };
        })
      }
    })),
    spend: {
      requestedSymbols: symbols.length, providerAttempts: symbols.length, tickerbotAttempts: 0,
      alphaVantageAttempts: symbols.length, cacheHits: 0, unavailable: 0, durable: null,
      ledgerStatus: "not-applicable",
      alphaVantageDaily: { schema: "alpha-vantage-daily-call-ledger-v1", day: "2026-10-03", calls: symbols.length,
        dailyLimit: 25, remaining: 25 - symbols.length, exhausted: false, updatedAt: NOW },
      alphaVantageLedgerStatus: "ready"
    }
  }
});

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

const massiveBeatPayload = (symbols, disc = "stocks") => ({
  success: true,
  environment: "characters-beat",
  data: {
    schema: "characters-beat-v1", disc, beatAt: new Date(NOW).toISOString(),
    interval: "1d", cadenceMinutes: 1, holdMs: 60_000,
    instruments: symbols.map(symbol => ({
      symbol, status: "bars", provider: "massive",
      marketContext: {
        schema: "gi-market-context-v1", synthetic: false, dataShape: "ohlcv", quoteCurrency: "USD",
        source: "Massive · reviewed daily OHLCV · as of 2026-10-03T00:00:00Z",
        symbol, timeframe: "1d", bars: dailyBars()
      }
    })),
    spend: {
      requestedSymbols: symbols.length, providerAttempts: symbols.length, tickerbotAttempts: 0,
      massiveAttempts: symbols.length, alphaVantageAttempts: 0, cacheHits: 0, unavailable: 0,
      durable: null, ledgerStatus: "not-applicable",
      massiveDaily: { schema: "massive-daily-call-ledger-v1", day: "2026-10-03", calls: symbols.length,
        dailyLimit: 300, remaining: 300 - symbols.length, exhausted: false, updatedAt: NOW },
      massiveLedgerStatus: "ready"
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
  window.eval(catalogSource);
  window.eval(appSource);
  const APPS = window.APPS;
  assert.ok(APPS.some(app => app.id === "characters"), "the app registered itself");
  if (seed) window.localStorage.setItem("harshalos.characters.ledger.v1", JSON.stringify(seed));
  window.APPS.unshift({ id: "good-intelligence", tickerbotWatchlist: TICKERBOT_WATCHLIST });
  const container = window.document.getElementById("host");
  const toasts = [];
  APPS.find(app => app.id === "characters").render(container, { toast: (...args) => toasts.push(args) });
  /* Let the opening automatic beat settle before pausing its timer. This
     prevents a later manual test action from racing its in-flight request. */
  await flush();
  container.querySelector("[data-ch-auto]").dispatchEvent(new window.Event("click"));
  await flush();
  return { window, container, calls, toasts, text: () => container.textContent };
}

const ledgerKey = (disc = "stocks", interval = "1h") =>
  disc === "stocks" && interval === "1h" ? "harshalos.characters.ledger.v1" : `harshalos.characters.ledger.v1.${disc}.${interval}`;

/* boot pauses the automatic opening loop so happy-dom does not retain timers.
   Make the explicit manual Tickerbot mode equally explicit in tests. */
async function chooseManualTickerbot(window, container, interval = "1h") {
  const select = container.querySelector("[data-ch-interval]");
  select.value = interval;
  select.dispatchEvent(new window.Event("change"));
  await flush();
}

test("the app opens on Massive, then exposes the manual Tickerbot plan when its loop is paused", async t => {
  const { text, calls, container } = await boot(t, { handler: async () => { throw new Error("no network in this test"); } });
  const body = text();
  assert.match(body, /Tickerbot plan/);
  assert.match(body, /Reserve held/);
  assert.match(body, /1,500/);
  assert.match(body, /Full sweep/);
  assert.match(body, /not investment advice/i);
  assert.match(body, /direct provider calls are outside those ledgers/i);
  assert.ok(container.querySelectorAll("[data-ch-cadence-chip]").length === 5, "every reviewed cadence is offered");
  assert.match(container.querySelector("[data-ch-plan-note]").textContent, /symbols per beat/);
  assert.match(container.querySelector("[data-ch-plan-note]").textContent, /sweep/i, "the plan states what a full sweep costs in wall-clock time");
  assert.ok(calls.length >= 1, "the app tried exactly one live beat on open");
  const opening = new URL(calls[0].url, "https://os.example");
  assert.equal(opening.searchParams.get("provider"), "massive", "the opening automatic loop uses Massive");
  assert.equal(opening.searchParams.get("interval"), "1d");
  assert.equal(opening.searchParams.get("cadence"), "1");
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

test("clearing beat context archives it reversibly without touching the provider-use ledger", async t => {
  const { window, container } = await boot(t, {
    handler: async () => Response.json({ success: false, message: "No live data available." }, { status: 503 })
  });
  const log = container.querySelector("[data-ch-log]");
  const ledger = container.querySelector("[data-ch-ledger]").textContent;
  assert.match(log.textContent, /SYNTH/, "the session has a beat to archive");
  window.document.dispatchEvent(new window.CustomEvent("harshalos:characters-beats:clear"));
  assert.match(log.textContent, /No beats recorded/, "clearing removes beats from the visible session context");
  assert.match(container.querySelector("[data-ch-beatcount]").textContent, /^0 visible beats$/);
  assert.equal(container.querySelector("[data-ch-ledger]").textContent, ledger, "clearing does not erase provider-call accounting");
  window.document.dispatchEvent(new window.CustomEvent("harshalos:characters-beats:restore"));
  assert.match(log.textContent, /SYNTH/, "archived beats can be gracefully restored");
  assert.match(container.querySelector("[data-ch-beatcount]").textContent, /visible beat/);
});

test("a live beat requests only the due berths and records the Worker-attempt count", async t => {
  const requested = [];
  const { window, container, text } = await boot(t, {
    handler: async url => {
      const params = new URL(url, "https://os.example").searchParams;
      const symbols = decodeURIComponent(params.get("symbols") || "").split(",");
      if (params.get("provider") === "massive") return Response.json(massiveBeatPayload(symbols));
      requested.push(url);
      return Response.json(liveBeatPayload(symbols));
    }
  });
  await chooseManualTickerbot(window, container);
  assert.equal(container.querySelector("[data-ch-auto]").getAttribute("aria-pressed"), "false", "Tickerbot 1h is not an automatic loop");
  container.querySelector("[data-ch-beat]").dispatchEvent(new window.Event("click"));
  await flush();
  assert.equal(requested.length, 1, "Tickerbot is not called until the manual Beat now action");
  const url = new URL(requested[0], "https://os.example");
  assert.equal(url.pathname, "/api/characters/v1/beat");
  assert.equal(url.searchParams.get("provider"), "tickerbot", "manual Disc1 beat explicitly routes to Tickerbot");
  assert.equal(url.searchParams.get("interval"), "1h");
  assert.equal(url.searchParams.get("cadence"), "15");
  const due = url.searchParams.get("symbols").split(",");
  assert.equal(due.length, 2, "a 15-minute 10,000-call plan rotates two berths per beat");
  assert.equal(new Set(due).size, due.length, "no symbol is requested twice in one beat");
  assert.ok(due.every(symbol => TICKERBOT_WATCHLIST.some(entry => entry.symbol === symbol)), "only allowlisted symbols are requested");

  const ledger = JSON.parse(window.localStorage.getItem(ledgerKey("stocks", "1h")));
  assert.equal(ledger.calls, 2, "only the manual Tickerbot beat is recorded in its 1h activity ledger");
  assert.equal(ledger.beats, 1);
  assert.deepEqual(ledger.history[0].symbols.sort(), [...due].sort());
  assert.equal(ledger.history[0].synthetic, false);
  assert.match(text(), /TICKERBOT 2 requests/);
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

test("monthly mode is an explicit Alpha Vantage 1mo path, never a daily substitute", async t => {
  const requested = [];
  const { container, text, window } = await boot(t, {
    handler: async url => {
      requested.push(url);
      const params = new URL(url, "https://os.example").searchParams;
      const symbols = (params.get("symbols") || "").split(",").filter(Boolean);
      const interval = params.get("interval");
      if (interval === "1mo") {
        const day = new Date().toISOString().slice(0, 10);
        const monthly = Array.from({ length: 30 }, (_, index) => {
          const close = 100 + index * 0.25;
          return { time: new Date(Date.UTC(2024, 4 + index, 0)).toISOString(), open: close - 0.5, high: close + 1, low: close - 1, close, confirmed: true };
        });
        return Response.json({
          success: true, environment: "characters-beat",
          data: {
            schema: "characters-beat-v1", disc: "stocks", beatAt: new Date().toISOString(), interval: "1mo", cadenceMinutes: 60, holdMs: 3_600_000,
            instruments: symbols.map(symbol => ({
              symbol, status: "bars", provider: "alpha-vantage",
              marketContext: {
                schema: "gi-market-context-v1", synthetic: false, dataShape: "ohlc", quoteCurrency: "USD",
                source: "Alpha Vantage · monthly stock OHLC without volume · last completed month 2026-09-30",
                symbol, timeframe: "1mo", bars: monthly
              }
            })),
            spend: {
              requestedSymbols: symbols.length, providerAttempts: symbols.length,
              tickerbotAttempts: 0, alphaVantageAttempts: symbols.length, cacheHits: 0, unavailable: 0,
              durable: null, ledgerStatus: "not-applicable",
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

  assert.equal(requested.length, 1, "the initial 1h beat is refused by Tickerbot's monthly cap");
  assert.match(text(), /monthly call limit/i);
  const interval = container.querySelector("[data-ch-interval]");
  interval.value = "1mo";
  interval.dispatchEvent(new window.Event("change"));
  await flush();

  assert.equal(requested.length, 2, "one explicit monthly beat reaches the Worker");
  const monthlyUrl = new URL(requested[1], "https://os.example");
  assert.equal(monthlyUrl.searchParams.get("disc"), "stocks");
  assert.equal(monthlyUrl.searchParams.get("interval"), "1mo");
  assert.equal(monthlyUrl.searchParams.get("cadence"), "60");
  assert.equal(monthlyUrl.searchParams.get("provider"), "alpha", "1mo mode sends provider=alpha");
  assert.equal(container.querySelector("[data-ch-auto]").getAttribute("aria-pressed"), "true", "selecting 1mo resumes Alpha's automatic hourly loop");
  assert.equal(monthlyUrl.searchParams.get("symbols").split(",").length, 1, "monthly mode selects 1 best-performing ticker per hour");
  const monthlyFocus = container.querySelector("[data-ch-focus]");
  monthlyFocus.value = monthlyUrl.searchParams.get("symbols");
  monthlyFocus.dispatchEvent(new window.Event("change"));
  await flush();
  assert.match(container.querySelector("[data-ch-plan-title]").textContent, /1mo mode/);
  assert.match(container.querySelector("[data-ch-plan]").textContent, /25 Alpha Vantage requests/);
  assert.match(container.querySelector("[data-ch-plan]").textContent, /Not used in 1mo mode/);
  assert.match(container.querySelector("[data-ch-plan-note]").textContent, /24 at hourly cadence/i);
  assert.match(container.querySelector("[data-ch-detail]").textContent, /Alpha Vantage.*monthly stock OHLC without volume/);
  assert.match(container.querySelector("[data-ch-detail]").textContent, /volume unavailable/);
  assert.match(container.querySelector("[data-ch-log]").textContent, /Alpha 1mo 1/);
  assert.match(container.querySelector("[data-ch-durable-ledger]").textContent, /Not used for explicit.*1mo/);
  assert.doesNotMatch(text(), /daily-bar fallback/i);
});

test("the Alpha spotlight selects the single highest local closed-bar performer, not a forming daily value", async t => {
  const alphaRequests = [];
  const tickerbotRequests = [];
  const closeBar = (time, close, confirmed) => ({
    time, open: close - 1, high: close + 1, low: close - 2, close, volume: 1_000, confirmed
  });
  const tickerbotPayload = symbols => ({
    success: true,
    environment: "characters-beat",
    data: {
      schema: "characters-beat-v1", interval: "1h", cadenceMinutes: 15, holdMs: 900_000,
      instruments: symbols.map(symbol => ({
        symbol, status: "bars", provider: "tickerbot",
        marketContext: {
          schema: "gi-market-context-v1", synthetic: false, source: "Tickerbot test bars", symbol,
          timeframe: "1h", dataShape: "ohlcv", quoteCurrency: "USD",
          /* AAPL's forming final bar would make it look strongest if selection
             read a live bar. The other due stock's closed gain is higher. */
          bars: symbol === "AAPL"
            ? [
                closeBar("2026-10-03T09:00:00.000Z", 100, true),
                closeBar("2026-10-03T10:00:00.000Z", 110, true),
                closeBar("2026-10-03T11:00:00.000Z", 220, false)
              ]
            : [
                closeBar("2026-10-03T09:00:00.000Z", 100, true),
                closeBar("2026-10-03T10:00:00.000Z", 130, true)
              ]
        }
      })),
      spend: {
        requestedSymbols: symbols.length, providerAttempts: symbols.length, tickerbotAttempts: symbols.length,
        massiveAttempts: 0, alphaVantageAttempts: 0, cacheHits: 0, unavailable: 0,
        durable: { schema: "tickerbot-call-ledger-v1", month: "2026-10", calls: symbols.length,
          providerBudget: 10_000, workerLimit: 10_000, remaining: 10_000 - symbols.length, exhausted: false, updatedAt: NOW },
        ledgerStatus: "ready"
      }
    }
  });
  const { window, container } = await boot(t, {
    handler: async url => {
      const params = new URL(url, "https://os.example").searchParams;
      const symbols = (params.get("symbols") || "").split(",").filter(Boolean);
      if (params.get("provider") === "alpha") {
        alphaRequests.push([...symbols]);
        return Response.json(monthlyBeatPayload(symbols));
      }
      if (params.get("provider") === "tickerbot") {
        tickerbotRequests.push([...symbols]);
        return Response.json(tickerbotPayload(symbols));
      }
      return Response.json(massiveBeatPayload(symbols));
    }
  });

  await chooseManualTickerbot(window, container);
  container.querySelector("[data-ch-beat]").dispatchEvent(new window.Event("click"));
  await flush();
  const interval = container.querySelector("[data-ch-interval]");
  interval.value = "1mo";
  interval.dispatchEvent(new window.Event("change"));
  await flush();

  const higherClosedGain = tickerbotRequests[0].find(symbol => symbol !== "AAPL");
  assert.ok(higherClosedGain, "the manual beat established a second locally ranked ticker");
  assert.deepEqual(alphaRequests, [[higherClosedGain]], "only the locally best closed-bar ticker enters the hourly Alpha beat");
});

test("the Disc selector rebuilds the cast from BIS FX and the live CoinGecko top-volume snapshot", async t => {
  const requestedBeats = [];
  const rankingInstruments = Array.from({ length: 52 }, (_, index) => {
    const ticker = `C${String(index).padStart(2, "0")}`;
    return {
      symbol: ticker, displaySymbol: `${ticker}/USD`, name: `Coin ${String(index).padStart(2, "0")}`,
      sector: "Cryptocurrency", assetClass: "crypto", discId: "crypto", dataShape: "ohlcv", quoteCurrency: "USD",
      rankingProvider: "CoinGecko", providerId: `coin-${index}`, rank: index + 1, volumeUsd: 52_000 - index,
      audit: index === 0 ? ["stablecoin-candidate"] : []
    };
  });
  /* The automatic non-stock path is a one-symbol-per-minute Massive 1d loop.
   * The test fixture returns real-shaped daily bars so the stage can render it,
   * rather than masking a wrong provider route with an unavailable response. */
  const { window, container } = await boot(t, {
    handler: async url => {
      const parsed = new URL(url, "https://os.example");
      if (parsed.pathname === "/api/characters/v1/discs") {
        assert.equal(parsed.searchParams.get("disc"), "crypto");
        return Response.json({
          success: true, disc: "crypto",
          ranking: { provider: "CoinGecko", metric: "trailing 24-hour total_volume, USD", rankedAt: new Date(NOW).toISOString(), cached: false },
          instruments: rankingInstruments
        });
      }
      requestedBeats.push(parsed);
      const symbols = (parsed.searchParams.get("symbols") || "").split(",").filter(Boolean);
      return Response.json(massiveBeatPayload(symbols, parsed.searchParams.get("disc") || "stocks"));
    }
  });

  /* boot deliberately turns automation off so tests do not retain timers. Turn
     it back on here: changing a Disc in automatic daily mode must route to
     Massive, not manually selected Tickerbot. */
  container.querySelector("[data-ch-auto]").dispatchEvent(new window.Event("click"));
  await flush();
  const disc = container.querySelector("[data-ch-disc]");
  disc.value = "fx";
  disc.dispatchEvent(new window.Event("change"));
  await flush();
  assert.equal(requestedBeats.at(-1).searchParams.get("disc"), "fx");
  assert.equal(requestedBeats.at(-1).searchParams.get("provider"), "massive");
  assert.equal(requestedBeats.at(-1).searchParams.get("interval"), "1d", "automatic FX uses Massive daily bars");
  assert.equal(requestedBeats.at(-1).searchParams.get("cadence"), "1", "the Massive loop advances one Disc per minute");
  assert.equal(requestedBeats.at(-1).searchParams.get("symbols").split(",").length, 1, "one reviewed instrument is due per automatic beat");
  assert.equal(container.querySelectorAll("[data-ch-focus] option").length, 23,
    "the published BIS detailed tables support 23 individually listed non-USD codes, not a fabricated 52");
  assert.match(container.querySelector("[data-ch-disc-note]").textContent, /23 non-USD currencies individually/);
  assert.match(container.querySelector("[data-ch-focus]").selectedOptions[0].textContent, /EUR\/USD · Euro/);
  assert.match(container.querySelector("[data-ch-detail]").textContent, /BIS FX turnover rank 2.*BIS 2025/);
  assert.equal(container.querySelector("[data-ch-interval]").disabled, true, "automatic non-stock Discs lock to Massive 1d");
  assert.equal(container.querySelector("[data-ch-interval] option[value=\"1mo\"]"), null, "1mo Alpha Vantage is not offered on Discs 2–5");

  disc.value = "crypto";
  disc.dispatchEvent(new window.Event("change"));
  await flush();
  assert.equal(requestedBeats.at(-1).searchParams.get("disc"), "crypto");
  assert.equal(requestedBeats.at(-1).searchParams.get("provider"), "massive");
  assert.equal(requestedBeats.at(-1).searchParams.get("interval"), "1d", "automatic crypto uses Massive daily bars");
  const cryptoSymbolsRequested = requestedBeats.at(-1).searchParams.get("symbols").split(",").length;
  assert.equal(cryptoSymbolsRequested, 1, "the automatic Massive loop makes exactly one request per Disc-minute");
  assert.equal(container.querySelectorAll("[data-ch-focus] option").length, 52);
  assert.match(container.querySelector("[data-ch-focus]").selectedOptions[0].textContent, /C00\/USD · Coin 00/);
  assert.match(container.querySelector("[data-ch-detail]").textContent, /Ranking audit flags: stablecoin candidate/);
  assert.match(container.querySelector("[data-ch-disc-note]").textContent, /CoinGecko.*total_volume/);
  assert.match(container.querySelector("[data-ch-disc-note]").textContent, /not an investment-quality screen/);
  assert.doesNotMatch(container.querySelector("[data-ch-plan-title]").textContent, /1mo mode/, "Non-stock Discs do not show the 1mo Alpha Vantage plan");
});

test("a beat whose instruments carry no bars freezes those berths and says so", async t => {
  let lastRequestedSymbols = [];
  const { window, container, text } = await boot(t, {
    handler: async url => {
      const symbols = decodeURIComponent(new URL(url, "https://os.example").searchParams.get("symbols") || "").split(",").filter(Boolean);
      lastRequestedSymbols = symbols;
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
  await chooseManualTickerbot(container.ownerDocument.defaultView, container);
  container.querySelector("[data-ch-beat]").dispatchEvent(new window.Event("click"));
  await flush();
  const focus = container.querySelector("[data-ch-focus]");
  focus.value = lastRequestedSymbols[0];
  focus.dispatchEvent(new window.Event("change"));
  await flush();
  assert.match(text(), /No symbol in this beat returned bars/i);
  assert.match(text(), /nothing was fabricated/i);
  assert.match(container.querySelector("[data-ch-detail]").textContent, /No market observations/i);
  assert.doesNotMatch(container.querySelector("[data-ch-detail]").textContent, /undefined bars|undefined ·/);
  const ledger = JSON.parse(container.ownerDocument.defaultView.localStorage.getItem(ledgerKey("stocks", "1h")));
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
  await chooseManualTickerbot(window, container);
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
  const featured = JSON.parse(window.localStorage.getItem(ledgerKey("stocks", "1h"))).featured;
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
  await chooseManualTickerbot(window, container);
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
