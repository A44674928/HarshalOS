/* NEO ORB market colour, and the one stored read that feeds it. Display-only.
   Fill = rally/sink (green rallying, red sinking). Ring = basis (blue below, yellow above).
   Definitions follow Orb 2: changePct for rally/sink; the close against the FBB basis.
   The colour rules are pure math and stay tested here. The reader (js/neo-orb-field.js) owns
   the surface's single network call — a same-origin GET of its own Worker route — and it is
   the only file that holds one. tests/neo-orb-feed-boundary-test.mjs covers that boundary end
   to end, including the fail-closed switch that closes the feed again. Synthetic records only. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, ROOT), "utf8");
const marketSource = await readText("js/neo-orb-market.js");
const fieldSource = await readText("js/neo-orb-field.js");
const appSource = await readText("js/apps-neo-orb.js");
const indexHtml = await readText("index.html");
const modelSource = await readText("js/neo-orb-model.js");
const placementSource = await readText("js/neo-orb-placement.js");
const neoCss = await readText("css/neo-orb.css");

const window = {};
const context = vm.createContext({
  window, globalThis: window, Object, Array, String, Number, Math, Set, Map, Promise, Error, RangeError, TypeError,
  JSON, Symbol, URLSearchParams, Date
});
vm.runInContext(marketSource, context, { filename: "js/neo-orb-market.js" });
vm.runInContext(fieldSource, context, { filename: "js/neo-orb-field.js" });
const Market = window.NeoOrbMarket;
const Field = window.NeoOrbField;

/* Drop block and line comments, so a scan reads the code and not the prose that explains it. */
const stripComments = source => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const row = (symbol, market, extra = {}) => ({ symbol, discId: "stocks", observedAt: 1000, market, ...extra });

test("the reserved palette is exactly green, red, blue, and yellow, with a neutral for no data", () => {
  assert.deepEqual({ ...Market.COLORS }, {
    rallying: "#22c55e", sinking: "#ef4444", below: "#3b82f6", above: "#facc15", neutral: "#8fa3c0"
  });
});

test("rally and sink follow changePct: up is green, down is red, flat and missing are neutral", () => {
  const up = Market.colourOf(Market.marketStateOf({ changePct: 1.2 }));
  const down = Market.colourOf(Market.marketStateOf({ changePct: -0.4 }));
  const flat = Market.colourOf(Market.marketStateOf({ changePct: 0 }));
  const none = Market.colourOf(Market.marketStateOf({}));
  assert.equal(up.fill, Market.COLORS.rallying);
  assert.equal(down.fill, Market.COLORS.sinking);
  assert.equal(flat.fill, Market.COLORS.neutral);
  assert.equal(none.fill, Market.COLORS.neutral);
  assert.equal(none.rally, "unknown");
});

test("basis follows the close against the FBB band basis: blue below, yellow above, no ring when equal", () => {
  const above = Market.marketStateOf({ latestBar: { close: 110 }, basis: 100 });
  const below = Market.marketStateOf({ latestBar: { close: 90 }, basis: 100 });
  const equal = Market.marketStateOf({ latestBar: { close: 100 }, basis: 100 });
  assert.equal(above.basis, "above");
  assert.equal(below.basis, "below");
  assert.equal(equal.basis, "equal");
  assert.equal(Market.colourOf(above).ring, Market.COLORS.above);
  assert.equal(Market.colourOf(below).ring, Market.COLORS.below);
  assert.equal(Market.colourOf(equal).ring, null);
  assert.equal(Market.marketStateOf({ basis: 100 }).basis, "unknown", "no close, no basis state");
});

test("the preferred FBB variant supplies the basis, as Orb 2 chooses it, else the market basis", () => {
  const market = {
    latestBar: { close: 95 }, basis: 100,
    fbbVariants: {
      "FBB-L60": { status: "available", basis: 90 },
      "FBB-200": { status: "available", basis: 120 }
    }
  };
  assert.equal(Market.basisOf(market), 90, "FBB-L60 is preferred");
  assert.equal(Market.marketStateOf(market).basis, "above", "95 is above the L60 basis of 90");
  const fallback = { latestBar: { close: 95 }, basis: 100, fbbVariants: { "FBB-L60": { status: "held" }, "FBB-200": { status: "available", basis: 120 } } };
  assert.equal(Market.basisOf(fallback), 120, "a held L60 falls through to FBB-200");
  assert.equal(Market.basisOf({ basis: 100, fbbVariants: { "FBB-L60": { status: "held", basis: 1 } } }), 100, "else the market basis");
});

test("the basis reads the field row's real shape (fbbComparison.variants), as the Worker sends it", () => {
  const serverRow = {
    latestBar: { close: 95 }, basis: 100,
    fbbComparison: {
      schema: "gi-fbb-comparison-v1",
      variants: {
        "FBB-L60": { id: "FBB-L60", status: "insufficient-history", basis: null },
        "FBB-200": { id: "FBB-200", status: "available", basis: 120 }
      }
    }
  };
  assert.equal(Market.basisOf(serverRow), 120, "a short L60 history falls through to FBB-200 in the server row");
  assert.equal(Market.marketStateOf(serverRow).basis, "below", "95 is below the 120 basis");
  assert.equal(Market.colourOf(Market.marketStateOf(serverRow)).ring, Market.COLORS.below, "the blue ring follows the real basis");
  const l60 = { latestBar: { close: 95 }, basis: 100, fbbComparison: { variants: { "FBB-L60": { status: "available", basis: 90 }, "FBB-200": { status: "available", basis: 120 } } } };
  assert.equal(Market.basisOf(l60), 90, "FBB-L60 is preferred in the server row too");
});

test("the field rows index by symbol, keep the newest stock row, and ignore other discs", () => {
  const index = Market.indexField([
    row("NVDA", { changePct: -1 }, { observedAt: 1000 }),
    row("NVDA", { changePct: 2 }, { observedAt: 2000 }),
    row("NVDA", { changePct: 9 }, { observedAt: 500, discId: "crypto" }),
    row("AAPL", null),
    { symbol: "MSFT", discId: "stocks", observedAt: 3 }
  ]);
  assert.equal(index.size, 1, "rows without a market record, and rows with no market object, are not coloured");
  assert.equal(index.get("NVDA").changePct, 2, "the newest stock row wins; the crypto row is ignored");
  assert.equal(Market.indexField(null).size, 0);
});

test("the reader names its one route and reads it as a same-origin GET", async () => {
  const calls = [];
  const rows = [row("NVDA", { changePct: 2, latestBar: { close: 110 }, basis: 100 })];
  const fetcher = async (url, options) => {
    calls.push({ url: String(url), options });
    return { ok: true, status: 200, json: async () => ({ success: true, data: { ok: true, observations: rows } }) };
  };
  const result = await Field.readField({ fetcher, now: 42 });

  assert.equal(Field.FEED_CUT, false, "the reader module is the one place the feed is declared open");
  assert.equal(Field.FIELD_ROUTE, "/api/good-intelligence/v1/orb2/field");
  assert.equal(Field.fieldUrl("1h"), "/api/good-intelligence/v1/orb2/field?interval=1h");
  assert.equal(Field.fieldUrl("bogus"), "/api/good-intelligence/v1/orb2/field?interval=1d", "unknown intervals fall back to daily");

  assert.equal(calls.length, 1, "one read of one relative route");
  assert.equal(calls[0].url, Field.fieldUrl(), "and it is the daily field");
  assert.equal(calls[0].options.method, "GET", "the display writes nothing");
  assert.equal(calls[0].options.credentials, "same-origin");
  assert.equal(calls[0].options.cache, "no-store");
  assert.equal(calls[0].options.redirect, "error");

  assert.equal(result.ok, true);
  assert.equal(result.observations.length, 1, "the stored rows come back as they were written");
  assert.equal(result.at, 42, "and the read is stamped with the caller's clock");
  assert.equal(Market.indexField(result.observations).get("NVDA").changePct, 2,
    "the colour module indexes exactly what the reader returned");
});

test("the reader holds exactly one call site, and no other file on the surface holds any", () => {
  /* Prose may explain the call; code is what runs. Scan the code only. */
  const code = stripComments(fieldSource);
  assert.equal((code.match(/doFetch\(/g) || []).length, 1, "the reader's code holds exactly one call");
  assert.equal(/XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts/.test(code), false,
    "and no other network primitive beside it");
  assert.equal(/method:\s*"GET"/.test(code), true, "the one call is a GET");
  assert.equal(/credentials:\s*"same-origin"/.test(code), true);
  assert.equal(/https?:\/\//.test(code), false, "it names no host: the route is relative");

  for (const [name, source] of [["neo-orb-market.js", marketSource], ["apps-neo-orb.js", appSource],
    ["neo-orb-model.js", modelSource], ["neo-orb-placement.js", placementSource]]) {
    const stripped = stripComments(source);
    assert.equal(/\bfetch\s*\(|doFetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon/.test(stripped), false,
      `${name} holds no network call: the reader is the only one`);
  }
});

test("the market and reader sources touch no other channel: no third-party host, storage, socket, or write", () => {
  for (const [name, source] of [["neo-orb-market.js", marketSource], ["neo-orb-field.js", fieldSource]]) {
    for (const forbidden of ["http://", "https://", "XMLHttpRequest", "WebSocket", "localStorage", "sessionStorage", "indexedDB", "HOS.", "legitimacy(", "method: \"POST\"", "method: \"PUT\""]) {
      assert.equal(source.includes(forbidden), false, `${name} must not reference ${forbidden}`);
    }
  }
  assert.equal(marketSource.includes("fetch("), false, "the colour module never fetches");
  assert.equal(marketSource.includes("/api/"), false, "the colour module names no route");
  assert.equal(stripComments(fieldSource).includes("XMLHttpRequest"), false, "the reader holds one GET and no other channel");
});

test("the orb app takes its colour from the market module, and blue and yellow are never kind colours", () => {
  assert.equal(appSource.includes("fetch("), false, "the app never calls fetch; it uses the reader module");
  assert.equal(appSource.includes("/api/"), false, "the app names no route");
  const drawOrb = appSource.slice(appSource.indexOf("drawOrb(ctx, node, L)"), appSource.indexOf("if ((L.labels || selected || hovered)"));
  assert.ok(drawOrb.includes("this.toneFor(node.n.id)"), "the orb fill comes from the market tone");
  assert.equal(drawOrb.includes("KIND_COLOR"), false, "kind colours no longer tint the orb");
  assert.ok(drawOrb.includes("tone.ring"), "the basis ring is drawn");
  assert.equal(appSource.includes("#4a9eff"), false, "the old blue band colour is retired");
  assert.equal(appSource.includes("#ffd479"), false, "the old amber centre colour is retired");
  assert.ok(appSource.includes("MARKET_EVERY_MS = 20000"));
});

test("the page loads the market colour and field reader before the app", () => {
  const market = indexHtml.indexOf("js/neo-orb-market.js");
  const field = indexHtml.indexOf("js/neo-orb-field.js");
  const app = indexHtml.indexOf("js/apps-neo-orb.js");
  assert.ok(market > 0 && field > 0 && app > 0, "all three scripts are referenced");
  assert.ok(market < app && field < app, "the colour module and reader load before the app");
});

test("the whole NEO ORB surface reaches no company: no absolute or protocol-relative URL, and one route only", () => {
  const files = {
    "apps-neo-orb.js": appSource, "neo-orb-model.js": modelSource, "neo-orb-placement.js": placementSource,
    "neo-orb-market.js": marketSource, "neo-orb-field.js": fieldSource, "neo-orb.css": neoCss
  };
  const absolute = /https?:\/\/|(^|[^:])\/\/[a-z0-9-]+\.[a-z]{2,}/i;
  for (const [name, source] of Object.entries(files)) {
    assert.equal(absolute.test(source), false, `${name} must name no absolute or protocol-relative URL`);
    assert.equal(/url\(\s*['"]?(https?:|\/\/)/i.test(source), false, `${name} must load no external resource through url()`);
  }
  const routes = [...new Set([appSource, modelSource, placementSource, marketSource, fieldSource]
    .flatMap(src => src.match(/\/api\/[A-Za-z0-9/_-]+/g) || []))];
  assert.deepEqual(routes, ["/api/good-intelligence/v1/orb2/field"], "the only route NEO ORB names is the Orb 2 field");
});

test("storedAsOf: the newest stock observation time, so stale colours say how old they are; null when none", () => {
  assert.equal(Market.storedAsOf([]), null);
  assert.equal(Market.storedAsOf([row("AAPL", { changePct: 1 }, { observedAt: 5000 }), row("NVDA", { changePct: 2 }, { observedAt: 9000 })]), 9000);
  assert.equal(Market.storedAsOf([row("BTC", { changePct: 1 }, { observedAt: 99999, discId: "crypto" })]), null, "only stock rows set the stored time");
  assert.equal(Market.storedAsOf([{ symbol: "AAPL", discId: "stocks", observedAt: 7000 }]), null, "a row without a market is not a colour");
});
