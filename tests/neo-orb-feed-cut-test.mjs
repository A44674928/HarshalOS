/* The NEO ORB feed cut — and the Orb 2 feed that is NOT cut.

   NEO ORB is a display: it reads no market feed. js/neo-orb-field.js is the module that used
   to hold the app's one network call, and it now refuses instead. These tests hold both halves
   of the boundary:

     · NEO ORB makes no request at all — not from the reader, not from the app, not from any
       file on the surface — and every orb stays neutral with the cut named on the display.
     · The cut is fail-closed: only an explicit open declaration from the reader module would
       let the app colour an orb, so a stray stub or a future edit cannot sneak a feed back in.
     · Orb 2's own feed is untouched. Its Worker pipeline calls its providers with no
       ORB2_COMPANY_FEEDS switch in the environment, because that gate no longer exists.

   Synthetic and stubbed data only. */
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
const fieldSource = await readText("js/neo-orb-field.js");
const appSource = await readText("js/apps-neo-orb.js");
const pageBootSource = await readText("js/neo-orb-page.js");
const rosterSource = await readText("js/good-intelligence-market-roster.js");
const neoCss = await readText("css/neo-orb.css");
const orb2FieldSource = await readText("worker/orb2-field.mjs");
const tickerbotSource = await readText("worker/good-intelligence-tickerbot.mjs");

const NETWORK_PRIMITIVES = ["fetch(", "XMLHttpRequest", "WebSocket", "EventSource", "sendBeacon", "importScripts", "navigator.send"];
const NOW = Date.parse("2026-10-11T12:00:00.000Z");

/* ── the reader: the cut lives here, and nowhere else ─────────────── */

test("the reader declares the cut and refuses without touching a network", async () => {
  const window = {};
  const reached = [];
  const context = vm.createContext({
    window, globalThis: window, Object, Array, String, Number, Math, Set, Map, Promise, Error, RangeError, TypeError,
    JSON, Symbol, URLSearchParams, Date,
    fetch: async url => { reached.push(String(url)); throw new Error("NEO ORB reached the network while its feed is cut"); }
  });
  vm.runInContext(fieldSource, context, { filename: "js/neo-orb-field.js" });
  const Field = window.NeoOrbField;

  assert.equal(Field.FEED_CUT, true, "the reader module is the one place the cut is declared");
  assert.ok(Field.FEED_CUT_MESSAGE.includes("feed is cut"), "the refusal says what happened");
  const result = await Field.readField();
  assert.equal(result.ok, false);
  assert.equal(result.cut, true);
  assert.equal(result.message, Field.FEED_CUT_MESSAGE);
  assert.deepEqual([...result.observations], [], "a cut feed returns no rows");
  assert.equal(result.at, null, "and claims no observation time");
  assert.equal(reached.length, 0, "no fetch was available to call, and none was called");

  /* A caller cannot smuggle a fetcher in: the refusal ignores every argument. */
  const smuggled = await Field.readField({ fetcher: async url => { reached.push(String(url)); return { ok: true, json: async () => ({}) }; } });
  assert.equal(smuggled.ok, false);
  assert.equal(reached.length, 0, "a supplied fetcher is never used");
});

test("no file on the NEO ORB surface holds a network primitive", () => {
  const surface = {
    "neo-orb-field.js": fieldSource, "neo-orb-market.js": marketSource, "apps-neo-orb.js": appSource,
    "neo-orb-model.js": modelSource, "neo-orb-placement.js": placementSource,
    "neo-orb-page.js": pageBootSource, "neo-orb.css": neoCss
  };
  for (const [name, source] of Object.entries(surface)) {
    for (const primitive of NETWORK_PRIMITIVES) {
      assert.equal(source.includes(primitive), false, `${name} must not reference ${primitive}`);
    }
  }
  assert.equal(/https?:\/\//.test(fieldSource), false, "the reader names no host");
  /* The reader's comments name the call the cut refuses; its code must not hold one. */
  const readerCode = fieldSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.equal(/\bfetch\b|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts/.test(readerCode), false,
    "the reader's code holds no network primitive");
  const routes = [...new Set(Object.values(surface).flatMap(src => src.match(/\/api\/[A-Za-z0-9/_-]+/g) || []))];
  assert.deepEqual(routes, ["/api/good-intelligence/v1/orb2/field"], "the one route NEO ORB names is the route it refuses");
});

/* ── the app: nothing is read, nothing is polled, nothing is coloured ── */

function appHarness() {
  const win = new Window({ url: "https://os.example/", settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  const doc = win.document;
  const requests = [];
  win.fetch = async url => { requests.push(String(url)); throw new Error("NEO ORB fetched while its feed is cut"); };
  const frames = [];
  const context = vm.createContext({
    window: win, document: doc, performance, console,
    Math, Number, String, Object, Array, Set, Map, JSON, BigInt, Error, RangeError, TypeError, Promise, Date,
    URLSearchParams,
    fetch: win.fetch,
    requestAnimationFrame: callback => { frames.push(callback); return frames.length; }
  });
  context.APPS = [{ id: "ocm" }, { id: "orbs" }];
  for (const [source, name] of [[modelSource, "js/neo-orb-model.js"], [placementSource, "js/neo-orb-placement.js"],
    [marketSource, "js/neo-orb-market.js"], [fieldSource, "js/neo-orb-field.js"],
    [rosterSource, "js/good-intelligence-market-roster.js"], [appSource, "js/apps-neo-orb.js"]]) {
    vm.runInContext(source, context, { filename: name });
  }
  const body = doc.createElement("div");
  doc.body.appendChild(body);
  context.APPS.find(app => app.id === "neo-orb").render(body);
  return { win, doc, body, engine: win.NEO_ORB_ENGINE, requests, frames, context };
}

test("the mounted app reads no feed, colours no orb, and says so on the surface", () => {
  const h = appHarness();
  const { body, engine } = h;
  const market = h.win.NeoOrbMarket;

  /* Run 3 s of frames, well past the old 20 s poll and through several guide reads. */
  for (let frame = 0; frame < 180; frame++) engine.tick(frame * (1000 / 60));

  assert.deepEqual(h.requests, [], "no request of any kind left the app");
  assert.equal(engine.market, null, "no field is indexed");
  assert.equal(engine.storedAt, null, "and no stored time is claimed");
  assert.ok(engine.marketStatus.startsWith("cut — "), engine.marketStatus);
  assert.ok(engine.marketStatus.includes("every orb stays neutral"), engine.marketStatus);

  for (const node of engine.nodes) {
    const tone = engine.toneFor(node.id);
    assert.equal(tone.fill, market.COLORS.neutral, `${node.id} stays neutral`);
    assert.equal(tone.ring, null, `${node.id} has no basis ring`);
  }

  engine.readouts();
  const status = body.querySelector("#neo-market").textContent;
  assert.ok(status.includes("cut"), status);
  assert.ok(status.includes("0 of 52 orbs coloured"), status);
  assert.ok(body.querySelector("#neo-frame").textContent.includes("ok"), "the frame loop is healthy");

  engine.select("NVDA");
  const inspector = body.querySelector("#neo-inspector").textContent;
  assert.ok(inspector.includes("feed is cut"), inspector);
  assert.ok(body.querySelector(".neo-foot").textContent.includes("market feed is cut"), "the footer states the cut");
  assert.ok(body.textContent.includes("the feed is cut, so no orb is coloured"), "the colour legend says the palette is idle");
});

test("the cut is fail-closed: a reader that offers rows colours nothing unless it opens the feed", async () => {
  const h = appHarness();
  const { engine } = h;
  const rows = [{ symbol: "NVDA", discId: "stocks", observedAt: NOW, market: { changePct: 2, latestBar: { close: 110 }, basis: 100 } }];

  /* A stub with data but no explicit open declaration is treated as cut. */
  h.win.NeoOrbField = { readField: async () => ({ ok: true, at: NOW, observations: rows }) };
  for (let frame = 0; frame < 5; frame++) engine.tick(frame * (1000 / 60));
  assert.equal(engine.feedCut(), true, "an undeclared reader is cut");
  assert.equal(engine.market, null);
  assert.equal(engine.toneFor("NVDA").fill, h.win.NeoOrbMarket.COLORS.neutral, "no orb is coloured from it");
  assert.deepEqual(h.requests, [], "and its rows are never fetched");

  /* The deliberate open path still works, so the cut — not broken colour code — is what holds. */
  h.win.NeoOrbField = { FEED_CUT: false, FEED_CUT_MESSAGE: "", readField: async () => ({ ok: true, at: NOW, observations: rows }) };
  engine.tick(60_000);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(engine.feedCut(), false);
  assert.equal(engine.marketStatus, "live");
  assert.equal(engine.toneFor("NVDA").fill, h.win.NeoOrbMarket.COLORS.rallying, "an opened feed colours the orb again");
  assert.equal(engine.toneFor("NVDA").ring, h.win.NeoOrbMarket.COLORS.above);
  assert.deepEqual(h.requests, [], "the stub answers in-process: the app still never fetches for itself");
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
