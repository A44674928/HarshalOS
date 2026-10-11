import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, test } from "node:test";
import vm from "node:vm";
import { handleGoodIntelligenceTickerbot, clearTickerbotCache, TICKERBOT_WATCHLIST } from "../worker/good-intelligence-tickerbot.mjs";
import worker from "../worker/index.mjs";
import { createTickerbotLedgerDb } from "./helpers/tickerbot-ledger-db.mjs";

const watchlistFields = entries => entries.map(({ symbol, name, sector }) => ({ symbol, name, sector }));

const NOW = Date.parse("2026-10-01T12:00:00.000Z");
const ledgerFixture = createTickerbotLedgerDb();
after(() => ledgerFixture.sql.close());
const testEnv = key => ({ TICKERBOT_API_KEY: key, COMMUNITY_DB: ledgerFixture.db, ORB2_COMPANY_FEEDS: "on" });
const route = symbol => new Request(`https://os.example.test/api/good-intelligence/v1/market/tickerbot/bars?symbol=${symbol}&interval=1h`);
const rows = [
  { t: NOW - 2 * 60 * 60_000, o: 100, h: 102, l: 99, c: 101, v: 1200 },
  { t: NOW - 60 * 60_000, o: 101, h: 103, l: 100, c: 102, v: 1300 }
];
const okResponse = () => Response.json({
  as_of: new Date(NOW).toISOString(), ticker: "AAPL", interval: "1h", coverage: "covered", bars: rows
});

/* Cloudflare Workers implements only "follow" and "manual" for `redirect`, and its
   fetch() throws a TypeError before any network I/O for anything else. Node's own
   Request also accepts "error", so a plain stub hid a bug that turned every real
   Tickerbot call into a 502 "could not be reached". Stubs that model the network
   are wrapped so they refuse what Workers refuses. */
const workersFetch = handler => async (url, options = {}) => {
  if (options.redirect !== undefined && !["follow", "manual"].includes(options.redirect)) {
    throw new TypeError(`Invalid redirect value, must be one of "follow" or "manual" ("${options.redirect}" is not implemented by the Workers runtime).`);
  }
  return handler(url, options);
};

test("Tickerbot adapter requires a server-side key and performs no call when it is absent", async () => {
  clearTickerbotCache();
  let calls = 0;
  const response = await handleGoodIntelligenceTickerbot(route("AAPL"), { ORB2_COMPANY_FEEDS: "on" }, { now: () => NOW, fetch: async () => { calls++; return okResponse(); } });
  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /TICKERBOT_API_KEY/);
  assert.equal(calls, 0);
});

test("Tickerbot bars become the existing gi-market-context packet without exposing the API key", async () => {
  clearTickerbotCache();
  let calledUrl = "";
  let calledOptions;
  /* workersFetch makes this the regression guard for the Workers fetch contract:
     with `redirect: "error"` the call throws, the adapter answers 502, and the
     status assertion below fails. */
  const response = await handleGoodIntelligenceTickerbot(route("AAPL"), testEnv("test-only-worker-secret"), {
    now: () => NOW,
    fetch: workersFetch(async (url, options) => { calledUrl = url; calledOptions = options; return okResponse(); })
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.environment, "tickerbot");
  assert.equal(payload.data.schema, "gi-market-context-v1");
  assert.equal(payload.data.synthetic, false);
  assert.equal(payload.data.symbol, "AAPL");
  assert.equal(payload.data.timeframe, "1h");
  assert.match(payload.data.source, /Tickerbot.*split-adjusted/i);
  assert.deepEqual(payload.data.bars, [
    { time: rows[0].t, open: 100, high: 102, low: 99, close: 101, volume: 1200, confirmed: true },
    { time: rows[1].t, open: 101, high: 103, low: 100, close: 102, volume: 1300, confirmed: true }
  ]);
  const upstream = new URL(calledUrl);
  assert.equal(upstream.origin, "https://api.tickerbot.io");
  assert.equal(upstream.pathname, "/v2/bars/AAPL/1h");
  assert.equal(upstream.searchParams.get("limit"), "360");
  assert.equal(upstream.searchParams.get("asof"), new Date(NOW).toISOString());
  assert.equal(calledOptions.headers.Authorization, "Bearer test-only-worker-secret");
  assert.equal(calledUrl.includes("test-only-worker-secret"), false);
  assert.equal(calledOptions.redirect, "manual", "the one redirect mode Workers implements that never follows");
});

test("Tickerbot adapter refuses a redirect instead of following it and never replays the key", async () => {
  clearTickerbotCache();
  let calls = 0;
  const response = await handleGoodIntelligenceTickerbot(route("AAPL"), testEnv("test-only-worker-secret"), {
    now: () => NOW,
    fetch: workersFetch(async () => {
      calls++;
      return new Response(null, { status: 302, headers: { Location: "https://attacker.example/collect" } });
    })
  });
  assert.equal(response.status, 502);
  const body = JSON.stringify(await response.json());
  assert.match(body, /could not provide market bars/i);
  assert.equal(body.includes("attacker.example"), false, "the redirect target is not echoed");
  assert.equal(body.includes("test-only-worker-secret"), false);
  assert.equal(calls, 1, "no second request is made to the redirect target");
});

test("Tickerbot logs only a sanitized failure category when the upstream call throws", async () => {
  /* Before this, a Tickerbot 502 left nothing in Workers Logs at all. The entry says what kind
     of failure it was (TypeError with no cause = rejected locally, before any network I/O) and
     never why in words. */
  const KEY = "test-only-worker-secret";
  const logs = [];
  const attempt = (error, symbol) => {
    clearTickerbotCache();
    return handleGoodIntelligenceTickerbot(route(symbol), testEnv(KEY), {
      now: () => NOW,
      fetch: workersFetch(async () => { throw error; }),
      log: entry => logs.push(entry)
    });
  };

  const rejected = await attempt(new TypeError(`Invalid redirect value for https://api.tickerbot.io/v2/bars/AAPL/1h using ${KEY}`), "AAPL");
  assert.equal(rejected.status, 502);

  const reset = new TypeError("fetch failed");
  reset.cause = Object.assign(new Error(`socket closed for ${KEY}`), { name: "SocketError", code: "ECONNRESET" });
  await attempt(reset, "MSFT");

  /* Hostile fields: a name that is the key itself, a name with whitespace and a newline, an over-long code. */
  const hostile = new Error("x");
  hostile.name = KEY;
  hostile.cause = { name: "bad name\nwith newline", code: "X".repeat(80) };
  await attempt(hostile, "NVDA");

  assert.deepEqual(logs, [
    { event: "tickerbot_upstream_fetch_failed", errorName: "TypeError", causeName: "", causeCode: "" },
    { event: "tickerbot_upstream_fetch_failed", errorName: "TypeError", causeName: "SocketError", causeCode: "ECONNRESET" },
    { event: "tickerbot_upstream_fetch_failed", errorName: "Error", causeName: "", causeCode: "" }
  ]);
  const serialized = JSON.stringify(logs);
  for (const leaked of [KEY, "tickerbot.io", "Invalid redirect", "fetch failed", "socket closed", "with newline"]) {
    assert.equal(serialized.includes(leaked), false, `${leaked} must not be logged`);
  }

  /* A successful read and an HTTP refusal are not connection failures, so neither logs. */
  logs.length = 0;
  clearTickerbotCache();
  await handleGoodIntelligenceTickerbot(route("AAPL"), testEnv(KEY), {
    now: () => NOW, fetch: workersFetch(async () => okResponse()), log: entry => logs.push(entry)
  });
  const refused = await handleGoodIntelligenceTickerbot(route("MSFT"), testEnv(KEY), {
    now: () => NOW, fetch: workersFetch(async () => new Response("denied", { status: 401 })), log: entry => logs.push(entry)
  });
  assert.equal(refused.status, 502);
  assert.deepEqual(logs, []);
});

test("Tickerbot timeouts are logged as AbortError and still answer 504", async () => {
  clearTickerbotCache();
  const logs = [];
  const response = await handleGoodIntelligenceTickerbot(route("AAPL"), testEnv("test-only-worker-secret"), {
    now: () => NOW,
    fetch: workersFetch(async () => { throw Object.assign(new Error("aborted"), { name: "AbortError" }); }),
    log: entry => logs.push(entry)
  });
  assert.equal(response.status, 504);
  assert.deepEqual(logs, [{ event: "tickerbot_upstream_fetch_failed", errorName: "AbortError", causeName: "", causeCode: "" }]);
});

test("Tickerbot failure logging defaults to console.warn and can never break the response", async () => {
  const original = console.warn;
  const seen = [];
  console.warn = (...args) => seen.push(args);
  try {
    clearTickerbotCache();
    const response = await handleGoodIntelligenceTickerbot(route("AAPL"), testEnv("test-only-worker-secret"), {
      now: () => NOW, fetch: workersFetch(async () => { throw new TypeError("nope"); })
    });
    assert.equal(response.status, 502);
    assert.equal(seen.length, 1);
    assert.equal(seen[0][0], "[HarshalOS tickerbot]");
    assert.equal(seen[0][1].errorName, "TypeError");

    clearTickerbotCache();
    const explodingSink = await handleGoodIntelligenceTickerbot(route("MSFT"), testEnv("test-only-worker-secret"), {
      now: () => NOW,
      fetch: workersFetch(async () => { throw new TypeError("nope"); }),
      log: () => { throw new Error("sink exploded"); }
    });
    assert.equal(explodingSink.status, 502, "a failing log sink cannot change the response");
  } finally {
    console.warn = original;
  }
});

test("Tickerbot proxy accepts only allowlisted symbols, intervals, and GET", async () => {
  clearTickerbotCache();
  let calls = 0;
  const dependencies = { now: () => NOW, fetch: async () => { calls++; return okResponse(); } };
  const env = testEnv("test");
  assert.equal((await handleGoodIntelligenceTickerbot(route("AAPL,MSFT"), env, dependencies)).status, 400);
  assert.equal((await handleGoodIntelligenceTickerbot(new Request("https://os.example.test/api/good-intelligence/v1/market/tickerbot/bars?symbol=AAPL&interval=15m"), env, dependencies)).status, 200, "the exact 15m route is accepted when the provider answers");
  assert.equal((await handleGoodIntelligenceTickerbot(new Request("https://os.example.test/api/good-intelligence/v1/market/tickerbot/bars?symbol=AAPL&interval=5m"), env, dependencies)).status, 400);
  assert.equal((await handleGoodIntelligenceTickerbot(new Request("https://os.example.test/api/good-intelligence/v1/market/tickerbot/bars?symbol=AAPL", { method: "POST" }), env, dependencies)).status, 405);
  assert.equal(calls, 1, "only the supported 15m request reaches the provider");
});

test("the expanded watchlist enables the requested tickers and every entry is a unique, well-formed symbol", () => {
  const symbols = TICKERBOT_WATCHLIST.map(entry => entry.symbol);
  for (const requested of ["INTC", "AMD", "MSFT", "MU", "CVX", "XOM"]) {
    assert.ok(symbols.includes(requested), `${requested} is enabled`);
  }
  assert.ok(symbols.length >= 40, "the demo watchlist spans a useful breadth of tickers");
  assert.equal(new Set(symbols).size, symbols.length, "no duplicate symbols");
  for (const entry of TICKERBOT_WATCHLIST) {
    assert.match(entry.symbol, /^[A-Z]{1,5}$/, `${entry.symbol} stays path-safe`);
    assert.ok(entry.name.length > 0 && entry.sector.length > 0, `${entry.symbol} is labeled for search and grouping`);
  }
  assert.ok(Object.isFrozen(TICKERBOT_WATCHLIST) && TICKERBOT_WATCHLIST.every(Object.isFrozen), "the allowlist cannot be widened or edited at runtime");
  const sectors = new Set(TICKERBOT_WATCHLIST.map(entry => entry.sector));
  assert.ok(sectors.size >= 8, "watchlist entries are spread across sectors for the grouped selector");
});

test("every enabled watchlist symbol builds one fixed upstream bars path and answers 200", async () => {
  clearTickerbotCache();
  const env = testEnv("test-only-worker-secret");
  const paths = [];
  const dependencies = {
    now: () => NOW,
    fetch: workersFetch(async url => { paths.push(new URL(url).pathname); return okResponse(); })
  };
  for (const entry of TICKERBOT_WATCHLIST) {
    const response = await handleGoodIntelligenceTickerbot(route(entry.symbol), env, dependencies);
    const payload = await response.json();
    assert.equal(response.status, 200, `${entry.symbol} is served`);
    assert.equal(payload.data.symbol, entry.symbol);
    assert.equal(payload.data.synthetic, false);
  }
  assert.deepEqual(paths, TICKERBOT_WATCHLIST.map(entry => `/v2/bars/${entry.symbol}/1h`), "the allowlist is the only source of upstream ticker paths");
});
test("the browser search list uses the shared 52-asset roster and mirrors the Worker allowlist", async () => {
  /* The static roster is loaded before the browser app and is the shared source
     for search, display ordering, and the Worker allowlist parity check. */
  const [appSource, rosterSource] = await Promise.all([
    readFile(new URL("../js/apps-good-intelligence.js", import.meta.url), "utf8"),
    readFile(new URL("../js/good-intelligence-market-roster.js", import.meta.url), "utf8")
  ]);
  assert.match(appSource, /GoodIntelligenceMarketRoster/);
  assert.match(appSource, /marketRoster\.assets/);
  const sandbox = { window: {} };
  sandbox.globalThis = sandbox.window;
  vm.runInNewContext(rosterSource, sandbox, { filename: "js/good-intelligence-market-roster.js" });
  const browserEntries = Array.from(sandbox.window.GoodIntelligenceMarketRoster.assets, item => ({
    symbol: item.symbol, name: item.name, sector: item.sector
  }));
  assert.equal(browserEntries.length, 52);
  assert.deepEqual(browserEntries, watchlistFields(TICKERBOT_WATCHLIST),
    "browser search and Worker allowlist agree on symbols, names, sectors, and order");
});

test("Tickerbot adapter caches identical reads briefly and sanitizes rate-limit responses", async () => {
  clearTickerbotCache();
  let calls = 0;
  const env = testEnv("test");
  const dependencies = { now: () => NOW, fetch: async () => { calls++; return okResponse(); } };
  await handleGoodIntelligenceTickerbot(route("MSFT"), env, dependencies);
  await handleGoodIntelligenceTickerbot(route("MSFT"), env, dependencies);
  assert.equal(calls, 1);

  clearTickerbotCache();
  const limited = await handleGoodIntelligenceTickerbot(route("NVDA"), env, {
    now: () => NOW,
    fetch: async () => new Response("secret upstream body", { status: 429, headers: { "Retry-After": "17" } })
  });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "17");
  assert.doesNotMatch(JSON.stringify(await limited.json()), /secret upstream body|test/);
});

test("Worker dispatches Tickerbot bars before the demo and private-storage API routes", async () => {
  clearTickerbotCache();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = workersFetch(async () => okResponse());
  try {
    const response = await worker.fetch(route("AAPL"), testEnv("worker-test-key"));
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-hos-demo-api"), null);
    assert.equal(payload.environment, "tickerbot");
    assert.equal(payload.data.symbol, "AAPL");
  } finally {
    globalThis.fetch = originalFetch;
    clearTickerbotCache();
  }
});
