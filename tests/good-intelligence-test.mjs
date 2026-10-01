import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const assuranceSource = await readFile(new URL("../js/good-intelligence-assurance.js", import.meta.url), "utf8");
const marketContextSource = await readFile(new URL("../js/good-intelligence-market-context.js", import.meta.url), "utf8");
const clientSource = await readFile(new URL("../js/good-intelligence-client.js", import.meta.url), "utf8");

function harness(fetchImplementation = async () => { throw new Error("unexpected fetch"); }, savedApiBase = null) {
  const values = new Map();
  if (savedApiBase) values.set("hos-good-intelligence-api-base-v1", savedApiBase);
  const window = {
    location: { origin: "https://hos.example" },
    localStorage: {
      getItem(key) { return values.has(key) ? values.get(key) : null; },
      setItem(key, value) { values.set(key, String(value)); },
      removeItem(key) { values.delete(key); }
    },
    fetch: fetchImplementation
  };
  const context = vm.createContext({
    window,
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    Date,
    console
  });
  vm.runInContext(assuranceSource, context, { filename: "js/good-intelligence-assurance.js" });
  vm.runInContext(marketContextSource, context, { filename: "js/good-intelligence-market-context.js" });
  vm.runInContext(clientSource, context, { filename: "js/good-intelligence-client.js" });
  return { client: window.GoodIntelligenceClient, values };
}

function jsonResponse(value, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: name => name.toLowerCase() === "content-type" ? "application/json; charset=utf-8" : null },
    json: async () => value
  };
}

test("Good Intelligence client defaults to the empty.domains demo API and validates endpoint origins", () => {
  const { client } = harness();
  assert.equal(client.DEFAULT_API_BASE, "/api/good-intelligence/v1");
  assert.equal(client.normalizeApiBase("https://api.example.test"), "https://api.example.test/v1");
  assert.equal(client.normalizeApiBase("/api/good-intelligence/v1"), "/api/good-intelligence/v1");
  assert.throws(() => client.normalizeApiBase("http://api.example.test/v1"), /HTTPS/);
  assert.throws(() => client.normalizeApiBase("http://localhost:3000/v1"), /same-origin proxy/);
  assert.throws(() => client.normalizeApiBase("https://user:secret@api.example.test/v1"), /without credentials/);
});

test("saved production endpoint migrates to the empty.domains demo default", () => {
  const { client, values } = harness(undefined, "https://api.goodintelligence.ai/v1");
  assert.equal(client.getApiBase(), "/api/good-intelligence/v1");
  assert.equal(values.get("hos-good-intelligence-api-base-v1"), "/api/good-intelligence/v1");
});

test("Good Intelligence client persists only a normalized, non-secret API base", () => {
  const { client, values } = harness();
  assert.equal(client.setApiBase("https://api.example.test"), "https://api.example.test/v1");
  assert.equal(client.getApiBase(), "https://api.example.test/v1");
  assert.equal(values.get("hos-good-intelligence-api-base-v1"), "https://api.example.test/v1");
});

test("intel normalizer turns server HTML into inert plain text", () => {
  const { client } = harness();
  const intel = client.normalizeIntel({
    _id: "story-1",
    title: "<b>Rates &amp; markets</b>",
    body: "<p>Evidence-backed update.</p><script>window.compromised = true</script>",
    category: { name: "Markets" },
    provider: { id: "provider-1", address: "0x1234567890abcdef1234567890abcdef12345678", name: "Market Desk" },
    block: 123
  });
  assert.equal(intel.id, "story-1");
  assert.equal(intel.title, "Rates & markets");
  assert.equal(intel.body, "Evidence-backed update.");
  assert.equal(intel.category, "Markets");
  assert.equal(intel.address, "0x1234567890abcdef1234567890abcdef12345678");
  assert.equal(intel.sourceId, "provider-1");
  assert.equal(intel.providerName, "Market Desk");
  assert.equal(intel.block, "123");
  assert.doesNotMatch(intel.body, /script|compromised/i);
});

test("intel normalizer whitelists optional market-context OHLCV packets", () => {
  const { client } = harness();
  const normalized = client.normalizeIntel({
    id: "market-item",
    marketContext: {
      schema: "gi-market-context-v1", synthetic: true, symbol: "DEMO-SYNTH", timeframe: "1h",
      bars: [{ time: "2026-09-30T12:00:00Z", open: 10, high: 12, low: 9, close: 11, volume: 0, confirmed: true }],
      ignoredScore: 100
    }
  });
  assert.equal(normalized.marketContext.schema, "gi-market-context-v1");
  assert.equal(normalized.marketContext.bars.length, 1);
  assert.equal(normalized.marketContext.bars[0].volume, 0);
  assert.equal(Object.hasOwn(normalized.marketContext, "ignoredScore"), false);
  assert.equal(client.normalizeIntel({ id: "unknown-market", marketContext: { schema: "gi-market-context-v9", bars: [] } }).marketContext, null);
});

test("dashboard loads feed, categories, and public rankings with GET only and preserves partial auth failures", async () => {
  const calls = [];
  const { client } = harness(async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith("/content/me")) return jsonResponse({ success: false, message: "Token missing, failed to authenticate token." });
    if (String(url).endsWith("/categories")) return jsonResponse({ success: true, data: [{ _id: "cat-1", name: "Markets" }] });
    if (String(url).includes("/rank?")) return jsonResponse({
      success: true,
      data: [
        { address: "0xsecond", rank: 2, score: 40, tokens: "12" },
        { address: "0xfirst", rank: 1, score: 80, tokens: "24" }
      ]
    });
    return jsonResponse({ success: false, message: "Unexpected route" }, 404);
  });

  const result = await client.loadDashboard({ apiBase: "https://api.example.test/v1" });
  assert.equal(result.errors.feed.kind, "auth");
  assert.equal(result.feed.length, 0);
  assert.equal(result.errors.categories, null);
  assert.equal(result.categories[0].name, "Markets");
  assert.equal(result.errors.rankings, null);
  assert.deepEqual(result.rankings.map(row => row.address), ["0xfirst", "0xsecond"]);
  assert.equal(calls.length, 3);
  assert.ok(calls.every(call => call.options.method === "GET"));
  assert.equal(calls.find(call => call.url.endsWith("/content/me")).options.credentials, "include");
  assert.ok(calls.filter(call => !call.url.endsWith("/content/me")).every(call => call.options.credentials === "same-origin"));
  assert.ok(calls.every(call => call.options.headers.Accept === "application/json"));
});

test("member feed falls back to the legacy route only when the documented route is missing", async () => {
  const calls = [];
  const { client } = harness(async (url, options) => {
    const path = new URL(String(url)).pathname;
    calls.push({ path, method: options.method });
    if (path.endsWith("/content/me")) return jsonResponse({ message: "Not found" }, 404);
    if (path.endsWith("/intel/me")) return jsonResponse({ success: true, data: [{ id: "legacy-1", title: "Legacy feed item" }] });
    if (path.endsWith("/categories")) return jsonResponse({ success: true, data: [] });
    if (path.endsWith("/rank")) return jsonResponse({ success: true, data: [] });
    return jsonResponse({ message: "Unexpected route" }, 404);
  });

  const result = await client.loadDashboard({ apiBase: "https://api.example.test/v1" });
  assert.equal(result.errors.feed, null);
  assert.equal(result.feed[0].id, "legacy-1");
  assert.deepEqual(calls.filter(call => call.path.endsWith("/content/me") || call.path.endsWith("/intel/me")).map(call => call.path), ["/v1/content/me", "/v1/intel/me"]);
  assert.ok(calls.every(call => call.method === "GET"));
});

test("intel normalization accepts only the versioned assurance packet and ignores supplied scores", () => {
  const { client } = harness();
  const accepted = client.normalizeIntel({
    id: "assured-1",
    assurance: { schema: "gi-assurance-v1", assessmentId: "server-assessment", score: 100, source: { identity: { status: "verified", method: "registry", verifiedAt: "2026-09-30T00:00:00Z" } }, signal: {} }
  });
  assert.equal(accepted.assurance.schema, "gi-assurance-v1");
  assert.equal(accepted.assurance.assessmentId, "server-assessment");
  assert.equal(Object.hasOwn(accepted.assurance, "score"), false);
  const rejected = client.normalizeIntel({ id: "unknown-schema", assurance: { schema: "gi-assurance-v9", score: 100 } });
  assert.equal(rejected.assurance, null);
});

test("dashboard reports API route mismatch without inventing feed or ranking data", async () => {
  const { client } = harness(async () => jsonResponse({ message: "Not found" }, 404));
  const result = await client.loadDashboard({ apiBase: "https://api.example.test/v1" });
  assert.equal(result.errors.feed.kind, "route");
  assert.equal(result.errors.rankings.kind, "route");
  assert.equal(result.feed.length, 0);
  assert.equal(result.rankings.length, 0);
});
