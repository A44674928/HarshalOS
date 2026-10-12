/* Trades desktop app: static index parsing, read-only notepads, refresh, and failures. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Window } from "happy-dom";
import "../js/characters-disc-catalog.js";
import { TICKERBOT_WATCHLIST } from "../worker/good-intelligence-tickerbot.mjs";

const appSource = await readFile(new URL("../js/apps-trades.js", import.meta.url), "utf8");
const indexHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
const tradesIndex = await readFile(new URL("../trades/index.txt", import.meta.url), "utf8");
const futuresRoster = globalThis.CharactersDiscCatalog.futures;
const flush = async () => { for (let turn = 0; turn < 20; turn++) await Promise.resolve(); };

function textResponse(status, body = "") {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => body
  };
}

function mount(t, handler) {
  const window = new Window({
    url: "https://main.empty.domains/",
    settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true }
  });
  t.after(() => window.happyDOM.abort());
  const requests = [];
  const openedNotepads = [];
  window.fetch = async (input, options = {}) => {
    const url = new URL(String(input), window.location.href);
    requests.push({ url, options });
    return handler(url, options);
  };
  window.document.write("<!doctype html><html><body><div id=\"folder\"></div></body></html>");
  window.eval("var APPS = window.APPS = [];");
  window.eval(appSource);

  const app = window.APPS.find(candidate => candidate.id === "trades");
  assert.ok(app, "Trades registers in the desktop app registry");
  const container = window.document.getElementById("folder");
  const api = {
    openApp(notepad) {
      const host = window.document.createElement("div");
      host.className = "test-notepad-window";
      window.document.body.appendChild(host);
      notepad.render(host, api);
      const record = { app: notepad, body: host };
      openedNotepads.push(record);
      return record;
    }
  };
  app.render(container, api);
  return { window, app, container, api, requests, openedNotepads };
}

test("the static index covers all reviewed stock cards and futures products in source order", async () => {
  const stockHeading = "# Disc1 · The 52 Cards — reviewed stock watchlist";
  const futuresHeading = "# Disc4 · Futures — reviewed product series; codes in parentheses are product codes, not dated contracts";
  const lines = tradesIndex.replace(/^\uFEFF/, "").split(/\r?\n/);
  const stockStart = lines.indexOf(stockHeading);
  const futuresStart = lines.indexOf(futuresHeading);
  const addedHeading = "# Disc5 · Added from 2026 TradingView posts — symbols outside the 52 Cards and futures series";
  const addedStart = lines.indexOf(addedHeading);
  assert.equal(stockStart, 0, "the index labels the stock section first");
  assert.ok(futuresStart > stockStart, "the futures product-series section is clearly separated");
  assert.ok(addedStart > futuresStart, "the added-from-posts section follows the futures series");

  const parseRows = sourceLines => sourceLines
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#"))
    .map(line => {
      const divider = line.indexOf("|");
      assert.ok(divider > 0, `index row has a symbol and description: ${line}`);
      return { symbol: line.slice(0, divider).trim(), description: line.slice(divider + 1).trim() };
    });
  const stocks = parseRows(lines.slice(stockStart + 1, futuresStart));
  const futures = parseRows(lines.slice(futuresStart + 1, addedStart));
  const added = parseRows(lines.slice(addedStart + 1));

  assert.equal(stocks.length, 52);
  assert.deepEqual(stocks.map(entry => entry.symbol), TICKERBOT_WATCHLIST.map(entry => entry.symbol));
  for (const [index, asset] of TICKERBOT_WATCHLIST.entries()) {
    assert.equal(stocks[index].description, `STOCK · ${asset.name} — ${asset.sector}`);
  }
  assert.equal(futures.length, 11);
  assert.deepEqual(futures.map(entry => entry.symbol), futuresRoster.map(entry => entry.symbol));
  for (const [index, product] of futuresRoster.entries()) {
    assert.equal(futures[index].description,
      `FUTURES · ${product.name} (${product.massive.productCode})`);
  }
  assert.deepEqual(added.map(entry => entry.symbol),
    ["BTC", "ETH", "XRH0", "PLTR", "RIVN", "LULU", "NET", "UPS", "LMT", "XLE"]);
  assert.equal(new Set([...stocks, ...futures, ...added].map(entry => entry.symbol)).size, 73);
});

test("Trades is a desktop folder; its index preserves line order and opens isolated read-only notepads", async t => {
  const fileContents = new Map([
    ["/trades/XMRUSD.txt", "2026-10-11 | LONG | entry 150.20 | size 10 | note\n"],
    ["/trades/ETHUSD.txt", "2026-10-12 | SHORT | entry 3,900 | size 2 | note\n"]
  ]);
  let xmrLoads = 0;
  const view = mount(t, async url => {
    if (url.pathname === "/trades/index.txt") {
      return textResponse(200, [
        "# Ticker list",
        "",
        " XMRUSD | Monero / US Dollar ",
        "ETHUSD",
        "SOLUSD | <img src=x onerror=alert(1)>"
      ].join("\r\n"));
    }
    if (url.pathname === "/trades/XMRUSD.txt") {
      xmrLoads++;
      return textResponse(200, xmrLoads === 1 ? fileContents.get(url.pathname) : "Refreshed XMRUSD log.\n");
    }
    if (url.pathname === "/trades/ETHUSD.txt") return textResponse(200, fileContents.get(url.pathname));
    return textResponse(404);
  });
  await flush();

  assert.equal(view.app.title, "Trades");
  assert.equal(view.app.glyph, "📁");
  const rows = [...view.container.querySelectorAll(".trades-ticker-open")];
  assert.deepEqual(rows.map(row => row.querySelector("strong").textContent), ["XMRUSD", "ETHUSD", "SOLUSD"]);
  assert.equal(rows[0].querySelector(".trades-ticker-description").textContent, "Monero / US Dollar");
  assert.equal(rows[1].querySelector(".trades-ticker-description"), null, "missing descriptions leave the ticker by itself");
  assert.equal(rows[2].querySelector(".trades-ticker-description").textContent, "<img src=x onerror=alert(1)>");
  assert.equal(view.container.querySelector(".trades-list img"), null, "ticker descriptions are rendered as text, not HTML");
  assert.equal(view.container.querySelector(".trades-folder-status").textContent, "Ticker list loaded.");

  rows[0].click();
  rows[1].click();
  await flush();
  assert.equal(view.openedNotepads.length, 2, "separate ticker clicks open separate notepads");
  const [xmr, eth] = view.openedNotepads;
  assert.notEqual(xmr.app.id, eth.app.id);
  assert.equal(xmr.app.title, "XMRUSD.txt");
  assert.equal(eth.app.title, "ETHUSD.txt");
  assert.match(xmr.body.querySelector(".trades-disclaimer").textContent, /^Simulated trades, not financial advice\.$/);
  assert.match(xmr.body.querySelector(".trades-log").textContent, /2026-10-11 \| LONG \| entry 150\.20/);
  assert.equal(xmr.body.querySelector(".trades-log").getAttribute("aria-readonly"), "true");
  assert.equal(xmr.body.querySelector("textarea, input, [contenteditable=true]"), null, "the notepad exposes no editing or save field");
  assert.notEqual(xmr.body.querySelector(".trades-loaded time").textContent, "Not yet");
  assert.equal(xmr.body.querySelector(".trades-history").href,
    "https://github.com/A44674928/HarshalOS/commits/main/trades/XMRUSD.txt");
  assert.equal(xmr.body.querySelector(".trades-source").href,
    "https://github.com/A44674928/HarshalOS/blob/main/trades/XMRUSD.txt");
  assert.match(eth.body.querySelector(".trades-log").textContent, /2026-10-12 \| SHORT/);

  const firstTickerFetch = view.requests.find(request => request.url.pathname === "/trades/XMRUSD.txt");
  assert.ok(firstTickerFetch, "the app fetches the ticker text from this site");
  assert.equal(firstTickerFetch.url.origin, "https://main.empty.domains");
  assert.equal(firstTickerFetch.url.search, "", "initial load does not need a cache-busting query");
  assert.equal(firstTickerFetch.options.method, "GET");
  assert.equal(firstTickerFetch.options.credentials, "same-origin");
  assert.equal(firstTickerFetch.options.cache, "no-store");

  xmr.body.querySelector(".trades-refresh").click();
  await flush();
  assert.match(xmr.body.querySelector(".trades-log").textContent, /Refreshed XMRUSD log/);
  const refreshRequest = view.requests.filter(request => request.url.pathname === "/trades/XMRUSD.txt").at(-1);
  assert.ok(refreshRequest.url.searchParams.has("refresh"), "Refresh adds a cache-busting query parameter");
  assert.equal(refreshRequest.options.method, "GET", "refresh remains read-only");
});

test("missing and empty ticker files both show the required empty-log message", async t => {
  const view = mount(t, async url => {
    if (url.pathname === "/trades/index.txt") return textResponse(200, "MISSING\nEMPTY\n");
    if (url.pathname === "/trades/MISSING.txt") return textResponse(404);
    if (url.pathname === "/trades/EMPTY.txt") return textResponse(200, "  \n\t");
    return textResponse(404);
  });
  await flush();
  view.container.querySelectorAll(".trades-ticker-open")[0].click();
  view.container.querySelectorAll(".trades-ticker-open")[1].click();
  await flush();
  assert.equal(view.openedNotepads.length, 2);
  for (const record of view.openedNotepads) {
    assert.equal(record.body.querySelector(".trades-log").textContent, "No trades logged yet.");
    assert.equal(record.body.querySelector(".trades-status").textContent, "No trades logged yet.");
    assert.ok(record.body.querySelector(".trades-source").href.includes("/blob/main/trades/"));
  }
});

test("a failed ticker fetch explains the problem and retains a direct GitHub file link", async t => {
  const view = mount(t, async url => {
    if (url.pathname === "/trades/index.txt") return textResponse(200, "FAILUSD | Fetch failure case\n");
    throw new Error("offline");
  });
  await flush();
  view.container.querySelector(".trades-ticker-open").click();
  await flush();
  const record = view.openedNotepads[0];
  assert.equal(record.body.querySelector(".trades-status").textContent, "Trade log unavailable.");
  assert.equal(record.body.querySelector(".trades-log").textContent, "Could not load this trade log.");
  assert.match(record.body.querySelector(".trades-error").textContent, /open it directly on GitHub/i);
  assert.equal(record.body.querySelector(".trades-source").href,
    "https://github.com/A44674928/HarshalOS/blob/main/trades/FAILUSD.txt");
  assert.equal(record.body.querySelector(".trades-history").href,
    "https://github.com/A44674928/HarshalOS/commits/main/trades/FAILUSD.txt");
});

test("index.html loads the Trades app and provides a JavaScript-free GitHub folder link", () => {
  assert.match(indexHtml, /css\/trades\.css\?v=/);
  assert.match(indexHtml, /js\/apps-trades\.js\?v=/);
  const noScript = /<noscript>([\s\S]*?)<\/noscript>/.exec(indexHtml)?.[1] || "";
  assert.match(noScript, /https:\/\/github\.com\/A44674928\/HarshalOS\/tree\/main\/trades/);
});
