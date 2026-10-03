/* Tests for the Characters beat route (worker/characters-beat.mjs).

   The beat is the only place the app spends provider calls, so these tests are about
   spend discipline: one upstream call per due symbol, zero calls inside a beat window,
   zero calls for a refused request, and no key or upstream body in any response. */

import assert from "node:assert/strict";
import test from "node:test";
import { handleCharactersBeat, clearCharactersBeatCache, MAX_BEAT_SYMBOLS, BEAT_CADENCES } from "../worker/characters-beat.mjs";
import { TICKERBOT_WATCHLIST } from "../worker/good-intelligence-tickerbot.mjs";
import worker from "../worker/index.mjs";

const NOW = Date.parse("2026-10-03T12:00:00.000Z");
const KEY = "test-only-worker-secret";
const ROUTE = "https://os.example.test/api/characters/v1/beat";
const beat = (query, init) => new Request(`${ROUTE}?${query}`, init);

const rows = [
  { t: NOW - 2 * 60 * 60_000, o: 100, h: 102, l: 99, c: 101, v: 1200 },
  { t: NOW - 60 * 60_000, o: 101, h: 103, l: 100, c: 102, v: 1300 }
];
const okResponse = () => Response.json({
  as_of: new Date(NOW).toISOString(), ticker: "ANY", interval: "1h", coverage: "covered", bars: rows
});

/* Workers implements only "follow" and "manual" for `redirect`; the stub refuses what the
   runtime refuses, so a regression in the shared fetch contract fails here too. */
const workersFetch = handler => async (url, options = {}) => {
  if (options.redirect !== undefined && !["follow", "manual"].includes(options.redirect)) {
    throw new TypeError(`Invalid redirect value, must be one of "follow" or "manual" ("${options.redirect}" is not implemented by the Workers runtime).`);
  }
  return handler(url, options);
};

test("a beat without the Worker secret makes no upstream call and says what to configure", async () => {
  clearCharactersBeatCache();
  let calls = 0;
  const response = await handleCharactersBeat(beat("symbols=AAPL,MSFT&interval=1h&cadence=60"), {}, {
    now: () => NOW, fetch: async () => { calls++; return okResponse(); }
  });
  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /TICKERBOT_API_KEY/);
  assert.equal(calls, 0);
});

test("one beat buys exactly one upstream call per due symbol, then holds the window", async () => {
  clearCharactersBeatCache();
  let calls = 0;
  const dependencies = { now: () => NOW, fetch: workersFetch(async () => { calls++; return okResponse(); }) };

  const first = await handleCharactersBeat(beat("symbols=aapl,MSFT,nvda&interval=1h&cadence=60"), { TICKERBOT_API_KEY: KEY }, dependencies);
  const firstPayload = await first.json();
  assert.equal(first.status, 200);
  assert.equal(firstPayload.environment, "characters-beat");
  assert.equal(firstPayload.data.schema, "characters-beat-v1");
  assert.equal(firstPayload.data.cadenceMinutes, 60);
  assert.equal(firstPayload.data.holdMs, 60 * 60_000);
  assert.equal(calls, 3, "one provider call per symbol, no more");
  assert.equal(firstPayload.data.spend.upstreamCalls, 3);
  assert.equal(firstPayload.data.spend.cacheHits, 0);
  assert.deepEqual(firstPayload.data.instruments.map(entry => entry.symbol), ["AAPL", "MSFT", "NVDA"]);
  for (const instrument of firstPayload.data.instruments) {
    assert.equal(instrument.status, "bars");
    assert.equal(instrument.marketContext.schema, "gi-market-context-v1");
    assert.equal(instrument.marketContext.synthetic, false);
    assert.match(instrument.marketContext.source, /Tickerbot/i);
  }

  /* Re-render inside the same beat window: the cache answers, the provider is not called. */
  const second = await handleCharactersBeat(beat("symbols=AAPL,MSFT,NVDA&interval=1h&cadence=60"), { TICKERBOT_API_KEY: KEY }, dependencies);
  const secondPayload = await second.json();
  assert.equal(second.status, 200);
  assert.equal(calls, 3, "a reload inside the beat costs nothing");
  assert.equal(secondPayload.data.spend.upstreamCalls, 0);
  assert.equal(secondPayload.data.spend.cacheHits, 3);
  assert.ok(secondPayload.data.instruments.every(instrument => instrument.status === "cached"));

  /* A shorter cadence holds less, but only a *new* beat window may call again. */
  clearCharactersBeatCache();
  const shortWindow = { now: () => NOW + 16 * 60_000, fetch: workersFetch(async () => { calls++; return okResponse(); }) };
  await handleCharactersBeat(beat("symbols=AAPL&interval=1h&cadence=15"), { TICKERBOT_API_KEY: KEY }, shortWindow);
  assert.equal(calls, 4, "the 15-minute window has expired, so the provider is called again");
});

test("a refused request spends nothing and never leaks the key or an upstream body", async () => {
  clearCharactersBeatCache();
  let calls = 0;
  const dependencies = { now: () => NOW, fetch: async () => { calls++; return okResponse(); } };
  const env = { TICKERBOT_API_KEY: KEY };

  assert.equal((await handleCharactersBeat(beat("symbols="), env, dependencies)).status, 400, "no symbols");
  const overCap = TICKERBOT_WATCHLIST.slice(0, MAX_BEAT_SYMBOLS + 1).map(entry => entry.symbol).join(",");
  assert.equal((await handleCharactersBeat(beat(`symbols=${overCap}`), env, dependencies)).status, 400, "more than the cap");
  assert.equal((await handleCharactersBeat(beat(`symbols=${overCap}`), env, dependencies).then(async response => (await response.json()).message)).includes(`${MAX_BEAT_SYMBOLS}`), true, "the cap is stated");
  assert.equal((await handleCharactersBeat(beat("symbols=AAPL,NOTATICKER"), env, dependencies)).status, 400, "off-allowlist symbol");
  assert.equal((await handleCharactersBeat(beat("symbols=AAPL&interval=5m"), env, dependencies)).status, 400, "unsupported interval");
  assert.equal((await handleCharactersBeat(beat("symbols=AAPL", { method: "POST" }), env, dependencies)).status, 405, "read-only");
  assert.equal((await handleCharactersBeat(new Request("https://os.example.test/api/characters/v1/other"), env, dependencies)).status, 404);
  assert.equal(calls, 0, "not one refused request reached the provider");

  const rejected = await handleCharactersBeat(beat("symbols=AAPL,NOTATICKER"), env, dependencies);
  const body = JSON.stringify(await rejected.json());
  assert.equal(body.includes(KEY), false);
  assert.equal(body.includes("api.tickerbot.io"), false);
  assert.equal(body.includes("Bearer"), false);
});

test("a cadence outside the reviewed list falls back to the default instead of failing the beat", async () => {
  clearCharactersBeatCache();
  const response = await handleCharactersBeat(beat("symbols=AAPL&cadence=7"), { TICKERBOT_API_KEY: KEY }, {
    now: () => NOW, fetch: workersFetch(async () => okResponse())
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.data.cadenceMinutes, 60);
  assert.ok(BEAT_CADENCES.includes(payload.data.cadenceMinutes));
});

test("partial failure is honest per symbol, total failure keeps the provider's status", async () => {
  clearCharactersBeatCache();
  const partial = await handleCharactersBeat(beat("symbols=AAPL,MSFT&interval=1h&cadence=60"), { TICKERBOT_API_KEY: KEY }, {
    now: () => NOW,
    fetch: workersFetch(async url => url.includes("/AAPL/") ? okResponse() : new Response("nope", { status: 500 }))
  });
  const partialPayload = await partial.json();
  assert.equal(partial.status, 200, "a partial beat is still a usable beat");
  assert.equal(partialPayload.data.spend.upstreamCalls, 1);
  assert.equal(partialPayload.data.spend.unavailable, 1);
  const msft = partialPayload.data.instruments.find(entry => entry.symbol === "MSFT");
  assert.equal(msft.status, "unavailable");
  assert.equal(msft.marketContext, undefined);
  assert.doesNotMatch(JSON.stringify(msft), /nope/, "the upstream body is never echoed");

  /* A failed read is not cached as if it were data: the next beat tries again. */
  let retries = 0;
  clearCharactersBeatCache();
  const retryDependencies = {
    now: () => NOW,
    fetch: workersFetch(async () => { retries++; return new Response("nope", { status: 500 }); })
  };
  await handleCharactersBeat(beat("symbols=AAPL&interval=1h&cadence=60"), { TICKERBOT_API_KEY: KEY }, retryDependencies);
  await handleCharactersBeat(beat("symbols=AAPL&interval=1h&cadence=60"), { TICKERBOT_API_KEY: KEY }, retryDependencies);
  assert.equal(retries, 2, "an unavailable symbol is retried on the next beat");

  clearCharactersBeatCache();
  const limited = await handleCharactersBeat(beat("symbols=AAPL,MSFT&interval=1h&cadence=60"), { TICKERBOT_API_KEY: KEY }, {
    now: () => NOW,
    fetch: workersFetch(async () => new Response("secret upstream body", {
      status: 429, headers: { "Retry-After": "17" }
    }))
  });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "17");
  const limitedBody = JSON.stringify(await limited.json());
  assert.doesNotMatch(limitedBody, /secret upstream body|test-only-worker-secret/);
  assert.equal(limitedBody.includes("Bearer"), false);
});

test("the beat cap matches the engine and the Worker never widens its allowlist", async () => {
  clearCharactersBeatCache();
  const symbols = TICKERBOT_WATCHLIST.slice(0, MAX_BEAT_SYMBOLS).map(entry => entry.symbol);
  const paths = [];
  const response = await handleCharactersBeat(beat(`symbols=${symbols.join(",")}&interval=1d&cadence=240`), { TICKERBOT_API_KEY: KEY }, {
    now: () => NOW,
    fetch: workersFetch(async url => { paths.push(new URL(url).pathname); return okResponse(); })
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.data.instruments.length, MAX_BEAT_SYMBOLS);
  assert.deepEqual(paths, symbols.map(symbol => `/v2/bars/${symbol}/1d`), "the watchlist is the only source of upstream paths");
  assert.equal(paths.every(path => path.startsWith("/v2/bars/")), true);
});

test("lane labels are display hints: they never change the call count or widen the allowlist", async () => {
  clearCharactersBeatCache();
  let calls = 0;
  const response = await handleCharactersBeat(
    beat("symbols=AAPL,MSFT,NVDA&interval=1h&cadence=60&lanes=AAPL:hot,MSFT:sweep,NVDA:sideways"),
    { TICKERBOT_API_KEY: KEY },
    { now: () => NOW, fetch: workersFetch(async () => { calls++; return okResponse(); }) }
  );
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(calls, 3, "a lane label never adds or removes a provider call");
  assert.equal(payload.data.spend.upstreamCalls, 3);
  assert.deepEqual(payload.data.instruments.map(instrument => [instrument.symbol, instrument.lane]), [
    ["AAPL", "hot"], ["MSFT", "sweep"], ["NVDA", null]
  ], "an unrecognized lane is dropped, not refused and not invented");
  assert.deepEqual(payload.data.spend.lanes.hot, ["AAPL"]);
  assert.deepEqual(payload.data.spend.lanes.sweep, ["MSFT"]);
  assert.match(payload.data.spend.lanes.note, /never changes how many calls/i);

  /* A lane for a symbol that is not in the request is ignored too. */
  const stray = await handleCharactersBeat(
    beat("symbols=AAPL&interval=1h&cadence=60&lanes=XOM:hot"),
    { TICKERBOT_API_KEY: KEY },
    { now: () => NOW, fetch: workersFetch(async () => okResponse()) }
  );
  const strayPayload = await stray.json();
  assert.equal(stray.status, 200);
  assert.equal(strayPayload.data.instruments[0].lane, null);
  assert.deepEqual(strayPayload.data.spend.lanes.hot, []);
});

test("the Worker dispatches the beat route read-only", async () => {
  clearCharactersBeatCache();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = workersFetch(async () => okResponse());
  try {
    const response = await worker.fetch(beat("symbols=AAPL&interval=1h&cadence=60"), { TICKERBOT_API_KEY: KEY });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.environment, "characters-beat");
    assert.equal(payload.data.instruments[0].symbol, "AAPL");
    const refused = await worker.fetch(beat("symbols=AAPL", { method: "POST" }), { TICKERBOT_API_KEY: KEY });
    assert.equal(refused.status, 405);
  } finally {
    globalThis.fetch = originalFetch;
    clearCharactersBeatCache();
  }
});
