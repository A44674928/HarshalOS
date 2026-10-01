import assert from "node:assert/strict";
import test from "node:test";
import { handleGoodIntelligenceTickerbot, clearTickerbotCache } from "../worker/good-intelligence-tickerbot.mjs";
import worker from "../worker/index.mjs";

const NOW = Date.parse("2026-10-01T12:00:00.000Z");
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
  const response = await handleGoodIntelligenceTickerbot(route("AAPL"), {}, { now: () => NOW, fetch: async () => { calls++; return okResponse(); } });
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
  const response = await handleGoodIntelligenceTickerbot(route("AAPL"), { TICKERBOT_API_KEY: "test-only-worker-secret" }, {
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
  const response = await handleGoodIntelligenceTickerbot(route("AAPL"), { TICKERBOT_API_KEY: "test-only-worker-secret" }, {
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

test("Tickerbot proxy accepts only allowlisted symbols, intervals, and GET", async () => {
  clearTickerbotCache();
  let calls = 0;
  const dependencies = { now: () => NOW, fetch: async () => { calls++; return okResponse(); } };
  const env = { TICKERBOT_API_KEY: "test" };
  assert.equal((await handleGoodIntelligenceTickerbot(route("AAPL,MSFT"), env, dependencies)).status, 400);
  assert.equal((await handleGoodIntelligenceTickerbot(new Request("https://os.example.test/api/good-intelligence/v1/market/tickerbot/bars?symbol=AAPL&interval=5m"), env, dependencies)).status, 400);
  assert.equal((await handleGoodIntelligenceTickerbot(new Request("https://os.example.test/api/good-intelligence/v1/market/tickerbot/bars?symbol=AAPL", { method: "POST" }), env, dependencies)).status, 405);
  assert.equal(calls, 0);
});

test("Tickerbot adapter caches identical reads briefly and sanitizes rate-limit responses", async () => {
  clearTickerbotCache();
  let calls = 0;
  const env = { TICKERBOT_API_KEY: "test" };
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
    const response = await worker.fetch(route("AAPL"), { TICKERBOT_API_KEY: "worker-test-key" });
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
