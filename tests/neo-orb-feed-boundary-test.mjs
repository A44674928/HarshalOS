/* The NEO ORB feed boundary — and the Orb 2 feed that is not gated.

   NEO ORB is a display of one stored, first-party field. These tests hold both halves of
   that boundary:

     · NEO ORB makes exactly one kind of request: a same-origin GET of its own Worker route,
       from the one module that owns it (js/neo-orb-field.js). No cache, no redirects, no
       third-party cookies, no host named anywhere on the surface. Every other file on the
       NEO ORB surface — app, model, placement, colour math, page boot, stylesheet — holds
       no network primitive at all.
     · The feed switch is fail-closed. `FEED_CUT` in the reader is the one place the feed is
       opened or closed, and unless that module explicitly declares it open the app reads
       nothing, polls nothing, and leaves every orb neutral on its band shell. A stub that
       offers rows without the declaration is refused, so a future edit cannot smuggle a
       feed back in. Closing it again is one edit, and this file proves the closed path still
       refuses.
     · Orb 2's own feed is untouched: the Worker pipeline calls its providers with no
       ORB2_COMPANY_FEEDS switch in the environment, because that gate no longer exists.

   Synthetic and stubbed data only; no test here reaches a network. */
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { Window } from "happy-dom";
import { runOrb2FieldTick } from "../worker/orb2-field.mjs";
import { handleGoodIntelligenceTickerbot, clearTickerbotCache } from "../worker/good-intelligence-tickerbot.mjs";
import { createTickerbotLedgerDb } from "./helpers/tickerbot-ledger-db.mjs";

const ROOT = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, ROOT), "utf8");
const exists = async path => access(new URL(path, ROOT)).then(() => true, () => false);

const modelSource = await readText("js/neo-orb-model.js");
const placementSource = await readText("js/neo-orb-placement.js");
const marketSource = await readText("js/neo-orb-market.js");
const extensionSource = await readText("js/market-extension.js");
const fieldSource = await readText("js/neo-orb-field.js");
const appSource = await readText("js/apps-neo-orb.js");
const pageBootSource = await readText("js/neo-orb-page.js");
const rosterSource = await readText("js/good-intelligence-market-roster.js");
const neoCss = await readText("css/neo-orb.css");
const orb2FieldSource = await readText("worker/orb2-field.mjs");
const tickerbotSource = await readText("worker/good-intelligence-tickerbot.mjs");

const NETWORK_PRIMITIVES = ["fetch(", "XMLHttpRequest", "WebSocket", "EventSource", "sendBeacon", "importScripts", "navigator.send"];
const NOW = Date.parse("2026-10-11T12:00:00.000Z");
const ROUTE = "/api/good-intelligence/v1/orb2/field";

/* The reader on its own, in a context that has a fetch it must never reach unexpectedly. */
function readerContext(source = fieldSource) {
  const window = {};
  const reached = [];
  /* A vm context has the JS intrinsics but none of the Web ones: these are what a browser
     always gives the reader — `window.fetch` and the global `fetch` are one function, as
     they are in a page — and nothing more. */
  window.fetch = async url => { reached.push(String(url)); throw new Error("the reader reached the global fetch in this test"); };
  const context = vm.createContext({ window, globalThis: window, URLSearchParams, Date, fetch: window.fetch });
  vm.runInContext(source, context, { filename: "js/neo-orb-field.js" });
  return { Field: window.NeoOrbField, reached, context };
}

const fieldRow = (symbol, overrides = {}) => ({
  symbol, discId: "stocks", interval: "1d", observedAt: NOW,
  market: {
    status: "ok", source: "tickerbot", timeframe: "1d", dataShape: "confirmed-ohlcv", synthetic: false,
    changePct: 2, latestBar: { time: NOW, close: 110, confirmed: true },
    basis: 100, bands: { lower1000: 90, upper1000: 110 }, waveTrend: { wt1: 26, wt2: 8, zone: "neutral zone" },
    ...overrides
  }
});

const fieldResponse = (rows, { ok = true, status = 200, message = null } = {}) => ({
  ok, status,
  json: async () => (message ? { success: false, message } : { success: true, data: { ok: true, observations: rows, storedAt: NOW } })
});

/* ── the reader: one same-origin read of its own route ─────────────── */

test("the reader opens its feed and makes one same-origin GET of its own Worker route", async () => {
  const { Field, reached } = readerContext();
  assert.equal(Field.FEED_CUT, false, "the reader module is the one place the feed is declared open");
  assert.equal(Field.FIELD_ROUTE, ROUTE);
  assert.equal(Field.DEFAULT_INTERVAL, "1d");
  assert.equal(Field.fieldUrl(), `${ROUTE}?interval=1d`);
  assert.equal(Field.fieldUrl("1h"), `${ROUTE}?interval=1h`, "the hourly dial reads the hourly field");
  assert.equal(Field.fieldUrl("5m"), `${ROUTE}?interval=1d`, "an interval the field does not store falls back to the daily row");

  const calls = [];
  const rows = [fieldRow("NVDA"), fieldRow("AAPL", { changePct: -1.4 })];
  const result = await Field.readField({
    fetcher: async (url, options) => { calls.push({ url: String(url), options }); return fieldResponse(rows); },
    now: NOW
  });

  assert.equal(calls.length, 1, "one read, not a retry storm");
  assert.equal(calls[0].url, `${ROUTE}?interval=1d`, "the URL is relative: same origin, no host named");
  assert.equal(/^https?:/.test(calls[0].url), false);
  assert.equal(calls[0].options.method, "GET", "the display never writes");
  assert.equal(calls[0].options.credentials, "same-origin", "no cookies to a third party");
  assert.equal(calls[0].options.cache, "no-store", "a stored field is read fresh, never from a shared cache");
  assert.equal(calls[0].options.redirect, "error", "and a redirect is refused rather than followed");
  assert.equal(calls[0].options.headers.Accept, "application/json");
  assert.equal(calls[0].options.body, undefined, "no body: this is a read");

  assert.equal(result.ok, true);
  assert.equal(result.observations.length, 2, "the rows come back as the Worker stored them");
  assert.equal(result.observations[0].symbol, "NVDA");
  assert.equal(result.at, NOW, "the read is stamped with the caller's clock");
  assert.equal(reached.length, 0, "a supplied fetcher is the only one used");

  /* The global fetch is the browser path, and it is asked for the same relative URL. */
  const global = await Field.readField({ now: NOW });
  assert.equal(global.ok, false, "the context's global fetch throws in this test…");
  assert.deepEqual(reached, [`${ROUTE}?interval=1d`], "…but only after being asked for the one relative route");
});

test("a read that fails is reported as a failure, never as an empty field", async () => {
  const { Field } = readerContext();
  const read = fetcher => Field.readField({ fetcher, now: NOW });

  const missing = await read(async () => fieldResponse([], { ok: false, status: 404 }));
  assert.equal(missing.ok, false);
  assert.match(missing.message, /HTTP 404/, "the status the route answered is named");

  const refused = await read(async () => fieldResponse([], { message: "field disabled" }));
  assert.equal(refused.ok, false);
  assert.equal(refused.message, "field disabled", "the Worker's own message is passed through");

  const malformed = await read(async () => ({ ok: true, status: 200, json: async () => ({ success: true, data: { ok: false } }) }));
  assert.equal(malformed.ok, false, "a payload that does not declare itself ok is not trusted");

  const unparseable = await read(async () => ({ ok: true, status: 200, json: async () => { throw new Error("not json"); } }));
  assert.equal(unparseable.ok, false);

  const thrown = await read(async () => { throw new TypeError("network down"); });
  assert.equal(thrown.ok, false);
  assert.equal(thrown.message, "the Orb 2 field could not be read", "a thrown read is caught, not propagated");
  assert.equal(thrown.observations, undefined, "and it offers no rows");

  /* No fetcher and no global fetch: the read says the browser cannot make it. */
  const window = {};
  const context = vm.createContext({ window, globalThis: window, URLSearchParams, Date });
  vm.runInContext(fieldSource, context, { filename: "js/neo-orb-field.js" });
  const stranded = await window.NeoOrbField.readField({ now: NOW });
  assert.equal(stranded.ok, false);
  assert.match(stranded.message, /unavailable in this browser/);
});

test("closing the switch again refuses every read, including a smuggled fetcher", async () => {
  const closedSource = fieldSource.replace("const FEED_CUT = false;", "const FEED_CUT = true;");
  assert.equal(closedSource === fieldSource, false, "the switch is one literal in one module");
  const { Field, reached } = readerContext(closedSource);

  assert.equal(Field.FEED_CUT, true);
  assert.match(Field.FEED_CUT_MESSAGE, /feed is cut/);
  const result = await Field.readField();
  assert.equal(result.ok, false);
  assert.equal(result.cut, true, "a closed feed says it was closed, not that it failed");
  assert.equal(result.message, Field.FEED_CUT_MESSAGE);
  assert.equal(result.observations.length, 0, "and it offers no rows");
  assert.equal(result.at, null, "and claims no observation time");
  assert.equal(reached.length, 0, "no request was made");

  const smuggled = await Field.readField({ fetcher: async url => { reached.push(String(url)); return fieldResponse([fieldRow("NVDA")]); } });
  assert.equal(smuggled.ok, false);
  assert.equal(reached.length, 0, "a caller cannot hand the closed reader a fetcher and get a feed back");
});

test("only the reader holds a network primitive, and the surface names exactly one route", () => {
  const surface = {
    "neo-orb-market.js": marketSource, "apps-neo-orb.js": appSource, "neo-orb-model.js": modelSource,
    "neo-orb-placement.js": placementSource, "neo-orb-page.js": pageBootSource, "neo-orb.css": neoCss,
    "market-extension.js": extensionSource
  };
  for (const [name, source] of Object.entries(surface)) {
    for (const primitive of NETWORK_PRIMITIVES) {
      assert.equal(source.includes(primitive), false, `${name} must not reference ${primitive}`);
    }
    assert.equal(/https?:\/\//.test(source), false, `${name} names no host`);
  }
  assert.equal(/\bfetch\b/.test(appSource), false, "the app never fetches for itself: it asks the reader");
  assert.equal(/https?:\/\//.test(fieldSource), false, "the reader names no host either");

  const all = { ...surface, "neo-orb-field.js": fieldSource };
  const routes = [...new Set(Object.values(all).flatMap(src => src.match(/\/api\/[A-Za-z0-9/_-]+/g) || []))];
  assert.deepEqual(routes, [ROUTE], "the one route the NEO ORB surface names is the reader's own field route");

  /* The reader's code holds exactly one call, and it is the documented one. */
  const readerCode = fieldSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const calls = readerCode.match(/doFetch\(/g) || [];
  assert.equal(calls.length, 1, "one call site in the reader's code");
  assert.equal(/XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts/.test(readerCode), false);
});

/* ── the app: it follows the reader's declaration, fail-closed ─────── */

function appHarness({ fieldRows = null, fieldStatus = 200 } = {}) {
  const win = new Window({ url: "https://os.example/", settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  const doc = win.document;
  const requests = [];
  win.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return fieldResponse(fieldRows === null ? [] : fieldRows, { ok: fieldStatus === 200, status: fieldStatus });
  };
  const context = vm.createContext({
    window: win, document: doc, performance, console,
    URLSearchParams, Date,
    fetch: win.fetch,
    requestAnimationFrame: () => 0
  });
  context.APPS = [{ id: "ocm" }, { id: "orbs" }];
  for (const [source, name] of [[modelSource, "js/neo-orb-model.js"], [placementSource, "js/neo-orb-placement.js"],
    [marketSource, "js/neo-orb-market.js"], [extensionSource, "js/market-extension.js"], [fieldSource, "js/neo-orb-field.js"],
    [rosterSource, "js/good-intelligence-market-roster.js"], [appSource, "js/apps-neo-orb.js"]]) {
    vm.runInContext(source, context, { filename: name });
  }
  const body = doc.createElement("div");
  doc.body.appendChild(body);
  context.APPS.find(app => app.id === "neo-orb").render(body);
  return { win, doc, body, engine: win.NEO_ORB_ENGINE, requests, context };
}

const settle = async () => { for (let turn = 0; turn < 12; turn++) await Promise.resolve(); };

test("the mounted app reads the stored field through the reader, and colours what it is given", async () => {
  const h = appHarness({ fieldRows: [fieldRow("NVDA"), fieldRow("AAPL", { changePct: -1.4, latestBar: { time: NOW, close: 92, confirmed: true } })] });
  const { body, engine } = h;
  const market = h.win.NeoOrbMarket;

  assert.equal(engine.feedCut(), false, "the reader declares the feed open and the app follows it");
  engine.refreshMarket(0);
  await settle();

  assert.equal(h.requests.length, 1, "the app made exactly one request");
  assert.equal(h.requests[0].url, `${ROUTE}?interval=1d`, "and it is the reader's relative route, not a host");
  assert.equal(h.requests[0].options.method, "GET");
  assert.equal(engine.marketStatus, "live");
  assert.equal(engine.toneFor("NVDA").fill, market.COLORS.rallying, "a rising close fills green");
  assert.equal(engine.toneFor("NVDA").ring, market.COLORS.above, "above basis rings yellow");
  assert.equal(engine.toneFor("AAPL").fill, market.COLORS.sinking, "a falling close fills red");
  assert.equal(engine.toneFor("MSFT").fill, market.COLORS.neutral, "a symbol with no stored row stays neutral");

  engine.refreshMarket(1000);
  await settle();
  assert.equal(h.requests.length, 1, "within MARKET_EVERY_MS the field is not re-read");

  engine.readouts();
  assert.match(body.querySelector("#neo-market").textContent, /2 of 52 orbs coloured/, body.querySelector("#neo-market").textContent);
});

test("a failed read is labelled on the surface and keeps the last good colours", async () => {
  const h = appHarness({ fieldRows: [fieldRow("NVDA")] });
  const { body, engine } = h;
  engine.refreshMarket(0);
  await settle();
  assert.equal(engine.marketStatus, "live");

  h.win.fetch = async () => fieldResponse([], { ok: false, status: 404 });
  h.context.fetch = h.win.fetch;
  engine.refreshMarket(60_000);
  await settle();
  assert.equal(engine.marketStatus, "unavailable — The Orb 2 field answered HTTP 404.", engine.marketStatus);
  assert.equal(engine.toneFor("NVDA").fill, h.win.NeoOrbMarket.COLORS.rallying, "the last stored colours are kept, not blanked");
  engine.readouts();
  assert.match(body.querySelector("#neo-market").textContent, /404/, "and the surface names the failure");
  assert.match(body.querySelector("#neo-frame").textContent, /ok/, "the frame loop is untouched by a failed read");
});

test("the app is fail-closed: a reader that has not declared the feed open colours nothing", async () => {
  const h = appHarness({ fieldRows: [fieldRow("NVDA")] });
  const { engine } = h;

  /* A stub that offers rows but no explicit declaration is treated as cut. */
  h.win.NeoOrbField = { readField: async () => ({ ok: true, at: NOW, observations: [fieldRow("NVDA")] }) };
  engine.refreshMarket(0);
  await settle();
  assert.equal(engine.feedCut(), true, "an undeclared reader is cut");
  assert.equal(h.requests.length, 0, "and its rows are never fetched");
  assert.equal(engine.market, null, "nothing is indexed from it");
  assert.equal(engine.toneFor("NVDA").fill, h.win.NeoOrbMarket.COLORS.neutral, "no orb is coloured from it");
  assert.equal(engine.extensionFor("NVDA").state, null, "and no orb is lifted off its band shell");
  assert.equal(engine.extensionFor("NVDA").value, 0);
  assert.ok(engine.marketStatus.startsWith("cut — "), engine.marketStatus);
  assert.equal(engine.extensionReadout().startsWith("none — "), true, engine.extensionReadout());

  /* No reader at all is also cut. */
  h.win.NeoOrbField = null;
  engine.refreshMarket(1000);
  assert.equal(engine.feedCut(), true);
  assert.equal(engine.market, null);

  /* The declared open path still works, so it is the declaration — not stale colour
     code — that holds the gate. */
  h.win.NeoOrbField = { FEED_CUT: false, readField: async () => ({ ok: true, at: NOW, observations: [fieldRow("NVDA")] }) };
  engine.refreshMarket(2000);
  await settle();
  assert.equal(engine.feedCut(), false);
  assert.equal(engine.marketStatus, "live");
  assert.equal(engine.toneFor("NVDA").fill, h.win.NeoOrbMarket.COLORS.rallying);
  assert.equal(h.requests.length, 0, "the stub answers in-process: the app still never fetches for itself");
});

/* ── Orb 2: its feed is not cut ───────────────────────────────────── */

test("the Orb 2 company-feed gate is gone from the Worker", async () => {
  assert.equal(await exists("worker/orb2-company-feed-gate.mjs"), false, "the gate module no longer exists");
  assert.equal(await exists("tests/orb2-company-feed-cut-test.mjs"), false, "and neither does its test");
  for (const [name, source] of [["orb2-field.mjs", orb2FieldSource], ["good-intelligence-tickerbot.mjs", tickerbotSource]]) {
    assert.equal(/ORB2_COMPANY_FEEDS|orb2CompanyFeedsEnabled|companyFeedsCut|Company feeds are cut/.test(source), false,
      `${name} carries no company-feed switch`);
  }
});

test("the Orb 2 tick runs past where the gate used to sit, with no switch in the environment", async () => {
  const reached = [];
  const summary = await runOrb2FieldTick({}, null, {
    now: () => NOW,
    fetch: async url => { reached.push(String(url)); throw new Error("not reached in this test"); }
  });
  assert.equal(summary.companyFeedsCut, undefined, "no cut is reported");
  assert.ok(!summary.errors.some(error => /Company feeds are cut/.test(error)), "and no cut message is raised");
  assert.match([...summary.notes, ...summary.errors].join(" "), /COMMUNITY_DB/,
    "the tick fails on its database binding, which sits after the removed gate — the gate no longer short-circuits it");
});

test("the Orb 2 Tickerbot route reaches its provider again, with no switch set", async t => {
  const ledger = createTickerbotLedgerDb();
  t.after(() => ledger.sql.close());
  clearTickerbotCache();
  const calls = [];
  const request = new Request(`https://os.example/api/good-intelligence/v1/market/tickerbot/bars?symbol=AAPL&interval=1h`);
  const response = await handleGoodIntelligenceTickerbot(request, { TICKERBOT_API_KEY: "test-only-key", COMMUNITY_DB: ledger.db }, {
    now: () => NOW,
    fetch: async (url, options = {}) => {
      if (options.redirect !== undefined && !["follow", "manual"].includes(options.redirect)) {
        throw new TypeError(`Invalid redirect value (${options.redirect}) — the Workers runtime refuses it before any I/O.`);
      }
      calls.push(String(url));
      return Response.json({
        as_of: new Date(NOW).toISOString(), ticker: "AAPL", interval: "1h", coverage: "covered",
        bars: [{ t: NOW - 60 * 60_000, o: 101, h: 103, l: 100, c: 102, v: 1300 }]
      });
    }
  });
  const payload = await response.json().catch(() => ({}));
  assert.equal(JSON.stringify(payload).includes("Company feeds are cut"), false, "the route does not refuse on a cut");
  assert.equal(calls.length, 1, `api.tickerbot.io is called once (got ${JSON.stringify(calls)})`);
  assert.match(calls[0], /^https:\/\/api\.tickerbot\.io\//, "and it is the provider host");
  assert.equal(response.status, 200, `the bars come back: ${JSON.stringify(payload).slice(0, 200)}`);
});
