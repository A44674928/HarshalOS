import assert from "node:assert/strict";
import test from "node:test";
import { handleGoodIntelligenceDemo } from "../worker/good-intelligence-demo.mjs";
import { TICKERBOT_WATCHLIST } from "../worker/good-intelligence-tickerbot.mjs";
import worker from "../worker/index.mjs";

const NOW = Date.parse("2026-09-30T12:00:00.000Z");
const url = path => `https://empty.domains/api/good-intelligence/v1${path}`;

async function get(path) {
  return handleGoodIntelligenceDemo(new Request(url(path), { method: "GET" }), NOW);
}

test("empty.domains demo feed is synthetic, explicitly labeled, and exercises assurance states", async () => {
  const response = await get("/content/me");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-hos-demo-api"), "true");
  assert.equal(response.headers.get("cache-control"), "no-store");
  const payload = await response.json();
  assert.equal(payload.environment, "empty.domains-demo");
  assert.equal(payload.data.length, 13);
  assert.ok(payload.data.every(item => item.demo === true && item.title.startsWith("[DEMO]")));
  assert.ok(payload.data[0].body.includes("Synthetic exercise"));
  assert.equal(payload.data[0].assurance.schema, "gi-assurance-v1");
  assert.equal(payload.data[0].assurance.source.legitimacy.status, "verified");
  assert.equal(payload.data[1].assurance.source.legitimacy.status, "expired");
  assert.equal(payload.data[2].assurance.signal.conflicts[0].status, "unresolved");
  assert.equal(payload.data[3].assurance, undefined);
  assert.ok(payload.data.slice(4).every(item => item.assurance === undefined));
  const marketFixtures = payload.data.filter(item => item.marketContext);
  assert.deepEqual(marketFixtures.map(item => item.marketContext.symbol), [
    "AAPL-DEMO", "MSFT-DEMO", "NVDA-DEMO", "INTC-DEMO", "AMD-DEMO", "NET-DEMO", "CVX-DEMO", "XOM-DEMO"
  ]);
  assert.equal(new Set(marketFixtures.map(item => item._id)).size, marketFixtures.length);
  for (const item of marketFixtures) {
    assert.equal(item.marketContext.schema, "gi-market-context-v1");
    assert.equal(item.marketContext.synthetic, true);
    assert.equal(item.marketContext.bars.length, 360);
    assert.match(item.marketContext.source, /not real prices/i);
    assert.ok(item.marketContext.bars.every(bar => bar.confirmed === true && bar.volume > 0));
  }
});

test("synthetic demo histories only use names enabled on the Tickerbot watchlist", async () => {
  /* The demo fixtures are educational stand-ins, not live data, but they share the
     watchlist so a reviewer can compare the same names on either data source. If a
     symbol leaves the allowlist, this test asks for the fixture to be updated too. */
  const enabled = new Set(TICKERBOT_WATCHLIST.map(entry => entry.symbol));
  const payload = await (await get("/content/me")).json();
  const demoBaseSymbols = payload.data.filter(item => item.marketContext).map(item => item.marketContext.symbol.replace(/-DEMO$/, ""));
  assert.ok(demoBaseSymbols.length > 0);
  for (const symbol of demoBaseSymbols) assert.ok(enabled.has(symbol), `${symbol} is still enabled for Tickerbot Live`);
});

test("demo categories and rankings use labeled fixture data", async () => {
  const categories = await get("/categories");
  const rankings = await get("/rank?limit=20&page=0");
  assert.equal((await categories.json()).data.length, 4);
  assert.equal((await rankings.json()).data.length, 3);
  assert.ok(rankings.headers.get("x-hos-demo-api"));
  assert.ok((await get("/rank")).ok);
});

test("demo timestamps are fresh or expired on purpose for the supplied clock", async () => {
  const payload = await (await get("/content/me")).json();
  const fresh = payload.data[0].assurance;
  const stale = payload.data[1].assurance;
  assert.ok(Date.parse(fresh.source.legitimacy.validUntil) > NOW);
  assert.ok(Date.parse(fresh.signal.validUntil) > NOW);
  assert.ok(Date.parse(stale.source.pdh.effectiveAt) < NOW - 90 * 24 * 60 * 60_000);
  assert.ok(Date.parse(stale.source.legitimacy.validUntil) < NOW);
  assert.ok(Date.parse(stale.signal.validUntil) < NOW);
});

test("Worker dispatches the empty.domains demo before the private-storage API auth path", async () => {
  const response = await worker.fetch(new Request(url("/content/me"), { method: "GET" }), {
    ASSETS: { fetch: async () => new Response("asset fallback", { status: 200 }) }
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-hos-demo-api"), "true");
  assert.equal((await response.json()).environment, "empty.domains-demo");
});

test("demo API refuses writes and non-allowlisted routes", async () => {
  const post = await handleGoodIntelligenceDemo(new Request(url("/content/me"), { method: "POST" }), NOW);
  const unknown = await get("/private/me");
  const otherPrefix = await handleGoodIntelligenceDemo(new Request("https://empty.domains/api/good-intelligence/v9/content/me"), NOW);
  assert.equal(post.status, 405);
  assert.match((await post.json()).message, /read-only/i);
  assert.equal(unknown.status, 404);
  assert.equal(otherPrefix.status, 404);
});
