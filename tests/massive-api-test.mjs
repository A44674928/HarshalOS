/* Massive REST Worker adapter: validated queries only, bearer-key auth,
   best-effort pacing, and Massive response pass-through. Upstream is stubbed. */

import assert from "node:assert/strict";
import test from "node:test";
import {
  MASSIVE_ORIGIN,
  MASSIVE_ASSETS,
  MASSIVE_TIMESPANS,
  MASSIVE_RANGE_LIMIT_DAYS,
  MASSIVE_MAX_BAR_LIMIT,
  MASSIVE_MAX_DIVIDEND_LIMIT,
  MASSIVE_API_ROUTES,
  handleMassive,
  clearMassiveCache,
  parseMassiveDate
} from "../worker/massive.mjs";

const NOW = Date.parse("2026-10-04T16:00:00.000Z");
const KEY = "massive-test-secret";

const okEnvelope = payload => ({ status: 200, payload });
const barsPayload = () => ({
  status: "OK",
  request_id: "req-bars-1",
  resultsCount: 2,
  ticker: "AAPL",
  results: [
    { c: 75.08, h: 75.15, l: 73.79, n: 1, o: 74.06, t: 1577941200000, v: 135647456, vw: 74.6 },
    { c: 74.35, h: 75.14, l: 74.12, n: 1, o: 74.28, t: 1578027600000, v: 146535512, vw: 74.7 }
  ]
});

function harness(payloadOrFn, { status = 200, headers = {} } = {}) {
  const calls = [];
  const fetcher = async (input, options = {}) => {
    calls.push({ url: new URL(input), options });
    const payload = typeof payloadOrFn === "function" ? payloadOrFn(calls.length) : payloadOrFn;
    return Response.json(payload, { status, headers });
  };
  return { calls, fetcher };
}

const call = (path, { env = { MASSIVE_API_KEY: KEY }, headers = {}, method = "GET", now = NOW } = {}) =>
  handleMassive(new Request(`https://os.example.test${path}`, { method, headers }), env, {});

const callWith = (path, fetcher, { env = { MASSIVE_API_KEY: KEY }, now = NOW, headers = {} } = {}) =>
  handleMassive(new Request(`https://os.example.test${path}`, { headers }), env, { fetcher, now });

test("the exported surface names the documented Massive REST shapes", () => {
  assert.equal(MASSIVE_ORIGIN, "https://api.massive.com");
  assert.deepEqual(Object.keys(MASSIVE_ASSETS), ["stocks", "crypto", "forex", "indices"]);
  assert.equal(MASSIVE_ASSETS.stocks.example, "AAPL");
  assert.equal(MASSIVE_ASSETS.crypto.example, "X:BTCUSD");
  assert.equal(MASSIVE_ASSETS.forex.example, "C:EURUSD");
  assert.equal(MASSIVE_ASSETS.indices.example, "I:SPX");
  assert.deepEqual([...MASSIVE_TIMESPANS], ["minute", "hour", "day", "week", "month", "quarter", "year"]);
  assert.equal(MASSIVE_MAX_BAR_LIMIT, 5000);
  assert.equal(MASSIVE_MAX_DIVIDEND_LIMIT, 100);
  assert.ok(Object.values(MASSIVE_API_ROUTES).every(route => route.startsWith("/api/massive/v1/")));
  assert.ok(Object.values(MASSIVE_RANGE_LIMIT_DAYS).every(days => days >= 1));
});

test("parseMassiveDate accepts only real calendar dates", () => {
  assert.equal(parseMassiveDate("2026-10-04"), Date.UTC(2026, 9, 4));
  assert.equal(parseMassiveDate("2026-02-29"), null);
  assert.equal(parseMassiveDate("2026-13-01"), null);
  assert.equal(parseMassiveDate("2026-1-1"), null);
  assert.equal(parseMassiveDate("1989-12-31"), null);
  assert.equal(parseMassiveDate(""), null);
  assert.equal(parseMassiveDate(undefined), null);
});

test("bars requests hit Massive's documented aggregates endpoint with bearer auth only", async t => {
  clearMassiveCache();
  t.after(clearMassiveCache);
  const { calls, fetcher } = harness(barsPayload());
  const path = `${MASSIVE_API_ROUTES.bars}?asset=stocks&ticker=aapl&multiplier=1&timespan=day&from=2026-04-01&to=2026-10-01&sort=desc&limit=500`;
  const response = await callWith(path, fetcher);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.cached, false);
  assert.equal(body.data.request_id, "req-bars-1");
  assert.equal(body.data.results.length, 2);

  assert.equal(calls.length, 1);
  const { url, options } = calls[0];
  assert.equal(url.origin, MASSIVE_ORIGIN);
  assert.equal(url.pathname, "/v2/aggs/ticker/AAPL/range/1/day/2026-04-01/2026-10-01");
  assert.equal(url.searchParams.get("adjusted"), "true");
  assert.equal(url.searchParams.get("sort"), "desc");
  assert.equal(url.searchParams.get("limit"), "500");
  assert.equal(url.searchParams.get("apiKey"), null, "the key never rides in the query string");
  assert.equal(options.headers.Authorization, `Bearer ${KEY}`);
  assert.equal(options.headers.Accept, "application/json");
  assert.equal(options.redirect, "manual");
  assert.equal(options.method, "GET");
});

test("identical bar requests inside the TTL are served from the Worker cache", async t => {
  clearMassiveCache();
  t.after(clearMassiveCache);
  const { calls, fetcher } = harness(barsPayload());
  const path = `${MASSIVE_API_ROUTES.bars}?asset=stocks&ticker=MSFT&multiplier=1&timespan=day&from=2026-04-01&to=2026-10-01`;
  const first = await callWith(path, fetcher);
  const second = await callWith(path, fetcher);
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal((await second.json()).cached, true);
  assert.equal(calls.length, 1);
});

test("previous-day, ticker-details and last-trade map to the documented Massive paths", async t => {
  clearMassiveCache();
  t.after(clearMassiveCache);
  const { calls, fetcher } = harness({ status: "OK", request_id: "req-1", results: [] });
  await callWith(`${MASSIVE_API_ROUTES.previousDay}?asset=crypto&ticker=x:btcusd`, fetcher);
  await callWith(`${MASSIVE_API_ROUTES.tickerDetails}?asset=stocks&ticker=BRK.A`, fetcher);
  await callWith(`${MASSIVE_API_ROUTES.lastTrade}?asset=stocks&ticker=AAPL`, fetcher);
  await callWith(`${MASSIVE_API_ROUTES.previousDay}?asset=indices&ticker=I:SPX`, fetcher);
  assert.deepEqual(calls.map(entry => entry.url.pathname), [
    "/v2/aggs/ticker/X%3ABTCUSD/prev",
    "/v3/reference/tickers/BRK.A",
    "/v2/last/trade/AAPL",
    "/v2/aggs/ticker/I%3ASPX/prev"
  ]);
  assert.equal(calls[0].url.origin, MASSIVE_ORIGIN);
});

test("dividends use Massive's current /stocks/v1/dividends endpoint with a fixed newest-first sort", async t => {
  clearMassiveCache();
  t.after(clearMassiveCache);
  const { calls, fetcher } = harness({ status: "OK", request_id: "req-div", results: [] });
  const response = await callWith(`${MASSIVE_API_ROUTES.dividends}?ticker=AAPL&limit=40`, fetcher);
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.pathname, "/stocks/v1/dividends");
  assert.equal(calls[0].url.searchParams.get("ticker"), "AAPL");
  assert.equal(calls[0].url.searchParams.get("limit"), "40");
  assert.equal(calls[0].url.searchParams.get("sort"), "ex_dividend_date.desc");

  const capped = await harness({ results: [] });
  const tooMany = await callWith(`${MASSIVE_API_ROUTES.dividends}?ticker=AAPL&limit=${MASSIVE_MAX_DIVIDEND_LIMIT + 1}`, capped.fetcher);
  assert.equal(tooMany.status, 400);
  assert.equal(capped.calls.length, 0);

  const cryptoDividends = await callWith(`${MASSIVE_API_ROUTES.dividends}?asset=crypto&ticker=X:BTCUSD`, capped.fetcher);
  assert.equal(cryptoDividends.status, 400);
  assert.equal(capped.calls.length, 0);
});

test("currency conversion maps to Massive's /v1/conversion route with bounded inputs", async t => {
  clearMassiveCache();
  t.after(clearMassiveCache);
  const { calls, fetcher } = harness({ status: "success", converted: 92.1, from: "USD", to: "EUR", last: { bid: 0.921, ask: 0.9211 } });
  const response = await callWith(`${MASSIVE_API_ROUTES.conversion}?from=usd&to=eur&amount=100.50&precision=4`, fetcher);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.converted, 92.1);
  assert.equal(calls[0].url.pathname, "/v1/conversion/USD/EUR");
  assert.equal(calls[0].url.searchParams.get("amount"), "100.50");
  assert.equal(calls[0].url.searchParams.get("precision"), "4");

  const { calls: none, fetcher: rejecting } = harness({});
  for (const query of ["from=USD&to=US", "from=USD&to=USD", "from=USD&to=EUR&amount=-4", "from=USD&to=EUR&precision=9"]) {
    const bad = await callWith(`${MASSIVE_API_ROUTES.conversion}?${query}`, rejecting);
    assert.equal(bad.status, 400, query);
  }
  assert.equal(none.length, 0);
});

test("typed input is validated before anything reaches Massive", async t => {
  clearMassiveCache();
  t.after(clearMassiveCache);
  const { calls, fetcher } = harness(barsPayload());
  const base = `${MASSIVE_API_ROUTES.bars}?from=2026-04-01&to=2026-04-30`;
  const rejected = [
    `${base}&asset=options&ticker=AAPL`,
    `${base}&asset=stocks&ticker=AAPL%2F..%2Fv3%2Freference%2Ftickers`,
    `${base}&asset=stocks&ticker=aapl!!`,
    `${base}&asset=crypto&ticker=BTCUSD`,
    `${base}&asset=stocks&ticker=AAPL&timespan=decade`,
    `${base}&asset=stocks&ticker=AAPL&multiplier=0`,
    `${base}&asset=stocks&ticker=AAPL&multiplier=101`,
    `${MASSIVE_API_ROUTES.bars}?asset=stocks&ticker=AAPL&timespan=minute&from=2026-01-01&to=2026-04-30`,
    `${MASSIVE_API_ROUTES.bars}?asset=stocks&ticker=AAPL&timespan=day&from=2026-04-30&to=2026-04-01`,
    `${MASSIVE_API_ROUTES.bars}?asset=stocks&ticker=AAPL&timespan=day&from=2026-02-30&to=2026-04-30`,
    `${base}&asset=stocks&ticker=AAPL&limit=5001`,
    `${base}&asset=stocks&ticker=AAPL&sort=sideways`,
    `${MASSIVE_API_ROUTES.lastTrade}?asset=indices&ticker=I:SPX`
  ];
  for (const path of rejected) {
    const response = await callWith(path, fetcher);
    assert.equal(response.status, 400, path);
    assert.equal((await response.json()).success, false);
  }
  assert.equal(calls.length, 0, "no invalid request may reach the provider");

  assert.equal((await call("/api/massive/v1/", {})).status, 404);
  assert.equal((await call("/api/massive/v1/holdings", {})).status, 404);
  assert.equal((await call(`${MASSIVE_API_ROUTES.bars}?asset=stocks&ticker=AAPL`, { method: "POST" })).status, 405);
});

test("a missing MASSIVE_API_KEY secret fails closed without a provider request", async () => {
  clearMassiveCache();
  const { calls, fetcher } = harness(barsPayload());
  const response = await callWith(`${MASSIVE_API_ROUTES.tickerDetails}?asset=stocks&ticker=AAPL`, fetcher, { env: {} });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.code, "not-configured");
  assert.match(body.message, /MASSIVE_API_KEY/);
  assert.equal(calls.length, 0);
});

test("the per-asset-class budget spends the owner's shared key slowly", async t => {
  clearMassiveCache();
  t.after(clearMassiveCache);
  const { calls, fetcher } = harness(barsPayload());
  const allowed = [];
  for (let index = 0; index < 5; index += 1) {
    const response = await callWith(
      `${MASSIVE_API_ROUTES.tickerDetails}?asset=stocks&ticker=T${index}`,
      fetcher,
      { headers: { "CF-Connecting-IP": `10.0.0.${index}` }, env: { MASSIVE_API_KEY: KEY } }
    );
    allowed.push(response.status);
  }
  assert.deepEqual(allowed, [200, 200, 200, 200, 200]);
  const refusal = await callWith(`${MASSIVE_API_ROUTES.tickerDetails}?asset=stocks&ticker=T9`, fetcher, {
    headers: { "CF-Connecting-IP": "10.0.0.9" },
    env: { MASSIVE_API_KEY: KEY }
  });
  const refusalBody = await refusal.json();
  assert.equal(refusal.status, 429);
  assert.equal(refusalBody.code, "rate-limited");
  assert.match(refusalBody.message, /stocks/i);
  assert.ok(refusalBody.retryAfterSeconds >= 1);

  const otherClass = await callWith(`${MASSIVE_API_ROUTES.tickerDetails}?asset=indices&ticker=I0`, fetcher, {
    headers: { "CF-Connecting-IP": "10.0.0.9" },
    env: { MASSIVE_API_KEY: KEY }
  });
  assert.equal(otherClass.status, 200, "spending the Stocks allowance does not spend the Indices allowance");

  const later = await callWith(`${MASSIVE_API_ROUTES.tickerDetails}?asset=stocks&ticker=T9`, fetcher, {
    now: NOW + 61_000,
    headers: { "CF-Connecting-IP": "10.0.0.9" },
    env: { MASSIVE_API_KEY: KEY }
  });
  assert.equal(later.status, 200);
});

test("the server-side beat has no obsolete client-IP Massive quota", async t => {
  clearMassiveCache();
  t.after(clearMassiveCache);
  const { calls, fetcher } = harness(barsPayload());
  const env = { MASSIVE_API_KEY: KEY };
  for (let index = 0; index < 5; index += 1) {
    const response = await callWith(`${MASSIVE_API_ROUTES.tickerDetails}?asset=stocks&ticker=S${index}`, fetcher, {
      env, headers: { "CF-Connecting-IP": "20.0.0.1" }
    });
    assert.equal(response.status, 200);
  }
  const sixth = await callWith(`${MASSIVE_API_ROUTES.tickerDetails}?asset=stocks&ticker=S5`, fetcher, {
    env, headers: { "CF-Connecting-IP": "20.0.0.2" }
  });
  assert.equal(sixth.status, 429, "the provider-class budget still protects the shared key");
  assert.match((await sixth.json()).message, /stocks/i);
  const otherClass = await callWith(`${MASSIVE_API_ROUTES.tickerDetails}?asset=indices&ticker=I6`, fetcher, {
    env, headers: { "CF-Connecting-IP": "20.0.0.2" }
  });
  assert.equal(otherClass.status, 200, "a different asset class has an independent budget");
  assert.equal(calls.length, 6, "only admitted requests reached the provider");
});

test("Massive's own refusals are mapped without leaking the key", async t => {
  clearMassiveCache();
  t.after(clearMassiveCache);

  const unauthorized = harness(barsPayload(), { status: 401 });
  const unauthorizedResponse = await callWith(`${MASSIVE_API_ROUTES.tickerDetails}?asset=stocks&ticker=AAPL`, unauthorized.fetcher, {
    env: { MASSIVE_API_KEY: KEY }
  });
  assert.equal(unauthorizedResponse.status, 502);
  const unauthorizedBody = await unauthorizedResponse.json();
  assert.equal(unauthorizedBody.code, "credentials-rejected");
  assert.ok(!JSON.stringify(unauthorizedBody).includes(KEY));

  const throttled = harness({}, { status: 429, headers: { "retry-after": "17" } });
  const throttledResponse = await callWith(`${MASSIVE_API_ROUTES.tickerDetails}?asset=stocks&ticker=MSFT`, throttled.fetcher);
  assert.equal(throttledResponse.status, 429);
  const throttledBody = await throttledResponse.json();
  assert.equal(throttledBody.code, "upstream-rate-limited");
  assert.equal(throttledBody.retryAfterSeconds, 17);

  const errored = harness({ status: "ERROR", error: "unknown ticker" }, { status: 404 });
  const erroredResponse = await callWith(`${MASSIVE_API_ROUTES.tickerDetails}?asset=stocks&ticker=NVDA`, errored.fetcher);
  assert.equal(erroredResponse.status, 502);
  const erroredBody = await erroredResponse.json();
  assert.equal(erroredBody.code, "upstream-error");
  assert.equal("upstreamMessage" in erroredBody, false, "provider error text is never reflected to the caller");
});

test("unreadable, aborted, and unreachable upstream answers fail closed", async t => {
  clearMassiveCache();
  t.after(clearMassiveCache);

  const unreadable = await handleMassive(
    new Request(`https://os.example.test${MASSIVE_API_ROUTES.tickerDetails}?asset=stocks&ticker=AAPL`),
    { MASSIVE_API_KEY: KEY },
    { fetcher: async () => new Response("not json", { status: 200 }), now: NOW }
  );
  assert.equal(unreadable.status, 502);
  assert.equal((await unreadable.json()).code, "unreadable-response");

  const aborted = await handleMassive(
    new Request(`https://os.example.test${MASSIVE_API_ROUTES.tickerDetails}?asset=stocks&ticker=MSFT`),
    { MASSIVE_API_KEY: KEY },
    { fetcher: async () => { throw Object.assign(new Error("aborted"), { name: "AbortError" }); }, now: NOW }
  );
  assert.equal(aborted.status, 504);
  assert.equal((await aborted.json()).code, "timeout");

  const logs = [];
  const unreachable = await handleMassive(
    new Request(`https://os.example.test${MASSIVE_API_ROUTES.tickerDetails}?asset=stocks&ticker=JPM`),
    { MASSIVE_API_KEY: KEY },
    { fetcher: async () => { throw new TypeError("fetch failed"); }, now: NOW, log: entry => logs.push(entry) }
  );
  assert.equal(unreachable.status, 502);
  assert.equal((await unreachable.json()).code, "unreachable");
  assert.equal(logs.length, 1);
  assert.equal(logs[0].event, "massive_upstream_fetch_failed");
  assert.equal(logs[0].errorName, "TypeError");
  assert.ok(!JSON.stringify(logs[0]).includes(KEY), "the breadcrumb never carries the key");
});
