/* Massive Markets desktop app: display-only rendering, honest refusals, and
   drift control against the Worker adapter's validation surface. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Window } from "happy-dom";
import { MASSIVE_ASSETS, MASSIVE_TIMESPANS, MASSIVE_API_ROUTES } from "../worker/massive.mjs";

const appSource = readFileSync(new URL("../js/apps-massive.js", import.meta.url), "utf8");
const flush = async (turns = 40) => { for (let turn = 0; turn < turns; turn++) await Promise.resolve(); };

const detailsPayload = (overrides = {}) => ({
  status: "OK",
  request_id: "req-details-1",
  results: {
    ticker: "AAPL",
    name: "<img src=x onerror=alert(1)>Apple Inc.",
    market: "stocks",
    type: "CS",
    primary_exchange: "XNAS",
    list_date: "1980-12-12",
    market_cap: 2771126040150,
    currency_name: "usd",
    total_employees: 154000,
    sic_description: "ELECTRONIC COMPUTERS",
    cik: "0000320193",
    homepage_url: "https://www.apple.com",
    description: "Apple designs consumer electronic devices.",
    ...overrides
  }
});
const prevPayload = () => ({
  status: "OK",
  request_id: "req-prev-1",
  resultsCount: 1,
  ticker: "AAPL",
  results: [{ T: "AAPL", o: 100, h: 105, l: 99, c: 104, v: 55000000, vw: 102.4, t: 1759795200000 }]
});
const lastTradePayload = () => ({
  status: "OK",
  request_id: "req-trade-1",
  results: { T: "AAPL", p: 104.22, s: 25, t: 1759872000000000000, x: 4 }
});
const barsPayload = () => ({
  status: "OK",
  request_id: "req-bars-1",
  ticker: "AAPL",
  resultsCount: 3,
  results: [
    { c: 100, h: 101, l: 99, o: 99.5, v: 1000, vw: 100.1, t: 1759536000000, n: 10 },
    { c: 103, h: 104, l: 100, o: 100, v: 1200, vw: 102.2, t: 1759622400000, n: 12 },
    { c: 102, h: 103, l: 101, o: 103, v: 900, vw: 102.0, t: 1759708800000, n: 9 }
  ]
});
const dividendsPayload = () => ({
  status: "OK",
  request_id: "req-div-1",
  results: [{
    cash_amount: 0.26, currency: "USD", declaration_date: "2025-07-31", distribution_type: "recurring",
    ex_dividend_date: "2025-08-11", frequency: 4, pay_date: "2025-08-14", record_date: "2025-08-11", ticker: "AAPL"
  }]
});

function mount(t, handler) {
  const window = new Window({ url: "https://os.example/", settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  t.after(() => window.happyDOM.abort());
  const requests = [];
  window.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    return handler(String(url), options);
  };
  window.document.write("<!doctype html><html><body><div id=\"host\"></div></body></html>");
  window.eval("var APPS = window.APPS = [];");
  window.eval(appSource);
  const app = window.APPS.find(item => item.id === "massive");
  assert.ok(app, "the Massive Markets app registers itself");
  const host = window.document.getElementById("host");
  app.render(host, {});
  return { window, document: window.document, host, app, requests };
}

const envelope = (data, { cached = false } = {}) => ({
  ok: true,
  status: 200,
  json: async () => ({ success: true, cached, data })
});
const refusal = (status, body) => ({ ok: false, status, json: async () => body });

test("the app mirrors the Worker's validation surface (no drift)", () => {
  for (const [asset, spec] of Object.entries(MASSIVE_ASSETS)) {
    // The app file stores the same regex as a JS string literal, so its source
    // text carries doubled backslashes; compare against that literal form.
    const literal = spec.tickerPattern.replace(/\\/g, "\\\\");
    assert.ok(appSource.includes(literal), `ticker pattern for ${asset} must mirror the Worker`);
    assert.ok(appSource.includes(spec.example), `example ticker for ${asset} must mirror the Worker`);
  }
  const collapsed = appSource.replace(/\s+/g, "");
  assert.ok(collapsed.includes(JSON.stringify([...MASSIVE_TIMESPANS])), "bar timespans must mirror the Worker");
  assert.ok(appSource.includes('"/api/massive/v1"'), "the app must call the same-origin Worker route");
  assert.ok(appSource.includes("ticker-details") && appSource.includes("previous-day") &&
    appSource.includes("last-trade") && appSource.includes("dividends") && appSource.includes("conversion"),
    "the app must address the Worker's documented sub-routes");
  assert.ok(Object.values(MASSIVE_API_ROUTES).every(route => route.startsWith("/api/massive/v1/")));
});

test("the window renders the read-only framing, controls, and tabs", t => {
  const { host } = mount(t, async () => envelope(detailsPayload()));
  assert.match(host.textContent, /READ-ONLY/);
  assert.match(host.textContent, /NOT ADVICE/);
  assert.match(host.textContent, /No order, trade, or transaction/);
  assert.ok(host.querySelector("#mvm-asset"));
  assert.ok(host.querySelector("#mvm-ticker"));
  const tabs = [...host.querySelectorAll(".mvm-tab")].map(button => button.dataset.tab);
  assert.deepEqual(tabs, ["snapshot", "bars", "dividends", "convert"]);
  assert.equal(host.querySelector("#mvm-ticker").value, "AAPL");
  const chips = [...host.querySelectorAll(".mvm-chip")].map(chip => chip.textContent);
  assert.ok(chips.includes("AAPL") && chips.includes("NVDA"));
});

test("the snapshot tab renders Massive data and escapes provider strings", async t => {
  const routes = [];
  const { host, document, requests } = mount(t, async url => {
    routes.push(url);
    if (url.includes("/ticker-details")) return envelope(detailsPayload());
    if (url.includes("/previous-day")) return envelope(prevPayload());
    if (url.includes("/last-trade")) return envelope(lastTradePayload());
    return refusal(404, { success: false, code: "not-found", message: "Unknown route." });
  });

  document.getElementById("mvm-ticker").value = "aapl";
  document.getElementById("mvm-load").click();
  await flush();

  const html = host.innerHTML;
  assert.ok(!html.includes("<img src=x"), "provider strings are escaped before rendering");
  assert.ok(html.includes("Apple Inc."));
  assert.ok(html.includes("XNAS"));
  assert.ok(html.includes("$2.77T"));
  assert.ok(html.includes("104"));
  assert.ok(html.includes("▲ 4.00%"));
  assert.ok(html.includes("req-details-1"), "the Massive request_id is surfaced");
  assert.ok(host.querySelector("#mvm-status").textContent.includes("OK"));
  assert.equal(requests.length, 3);
  assert.ok(requests.every(request => request.url.startsWith("https://os.example/api/massive/v1/")));
  assert.ok(host.innerHTML.includes('href="https://www.apple.com"'));
});

test("an unconfigured Worker secret is explained without inventing data", async t => {
  const { host, document, requests } = mount(t, async () =>
    refusal(503, { success: false, code: "not-configured", message: "Add MASSIVE_API_KEY as a Worker secret to enable Massive market data." }));
  document.getElementById("mvm-load").click();
  await flush();
  const status = host.querySelector("#mvm-status").textContent;
  assert.match(status, /MASSIVE_API_KEY/);
  assert.match(status, /wrangler secret put/);
  assert.match(host.querySelector("#mvm-panel-snapshot").textContent, /not configured/i);
  assert.ok(!host.innerHTML.includes("Apple"), "no fabricated market data appears");
  assert.ok(requests.length >= 1);
});

test("pacing refusals stay honest about the shared key budget", async t => {
  const { host, document } = mount(t, async () =>
    refusal(429, { success: false, code: "rate-limited", message: "budget", retryAfterSeconds: 42 }));
  document.getElementById("mvm-load").click();
  await flush();
  const status = host.querySelector("#mvm-status").textContent;
  assert.match(status, /42s/);
  assert.match(status, /shared/i);
});

test("a malformed ticker is refused locally and never sent", async t => {
  const { host, document, requests } = mount(t, async () => envelope(detailsPayload()));
  document.getElementById("mvm-ticker").value = "AAPL/../v3/reference/tickers";
  document.getElementById("mvm-load").click();
  await flush();
  assert.equal(requests.length, 0);
  assert.match(host.querySelector("#mvm-status").textContent, /AAPL/);
});

test("bars are drawn from Massive aggregates with the documented field names", async t => {
  const { host, document } = mount(t, async url => {
    if (url.includes("/bars")) return envelope(barsPayload());
    return envelope(detailsPayload());
  });
  document.getElementById("mvm-load").click();
  await flush();
  document.querySelector(".mvm-tab[data-tab=\"bars\"]").click();
  document.getElementById("mvm-bar-draw").click();
  await flush();
  const chart = host.querySelector("#mvm-bar-chart");
  assert.ok(chart.querySelector("svg polyline"), "a close-price polyline is drawn");
  assert.match(chart.textContent, /1×day closes · 3 bars/);
  const stats = host.querySelector("#mvm-bar-stats").textContent;
  assert.match(stats, /Bars\s*3/);
  assert.match(stats, /\+2\.00%/);
  assert.ok(host.querySelector("#mvm-bar-table table"));
  assert.match(host.querySelector("#mvm-bar-table").textContent, /Massive field names \(o, h, l, c, v, vw, t\)/);
});

test("dividends stay stocks-only and render Massive's records verbatim", async t => {
  const { window, host, document } = mount(t, async url => {
    if (url.includes("/dividends")) return envelope(dividendsPayload());
    if (url.includes("/ticker-details")) return envelope(detailsPayload());
    if (url.includes("/previous-day")) return envelope(prevPayload());
    if (url.includes("/last-trade")) return envelope(lastTradePayload());
    return refusal(404, { success: false, code: "not-found", message: "Unknown route." });
  });
  document.querySelector(".mvm-tab[data-tab=\"dividends\"]").click();
  document.getElementById("mvm-div-draw").click();
  await flush();
  const table = host.querySelector("#mvm-div-table");
  assert.match(table.textContent, /2025-08-11/);
  assert.match(table.textContent, /0\.26/);
  assert.match(table.textContent, /recurring/);

  document.getElementById("mvm-asset").value = "crypto";
  document.getElementById("mvm-asset").dispatchEvent(new window.Event("change", { bubbles: true }));
  document.getElementById("mvm-div-draw").click();
  await flush();
  assert.match(host.querySelector("#mvm-div-table").textContent, /U\.S\. stocks only/);
});

test("currency conversion displays Massive's indicative rate only", async t => {
  const { host, document } = mount(t, async url => {
    if (url.includes("/conversion")) return envelope({
      status: "success",
      request_id: "req-fx-1",
      converted: 92.14,
      from: "USD",
      initialAmount: 100,
      to: "EUR",
      symbol: "USD/EUR",
      last: { ask: 0.92144, bid: 0.92136, exchange: 48, timestamp: 1759872000000 }
    });
    return envelope(detailsPayload());
  });
  document.querySelector(".mvm-tab[data-tab=\"convert\"]").click();
  document.getElementById("mvm-fx-draw").click();
  await flush();
  const result = host.querySelector("#mvm-fx-result");
  assert.match(result.textContent, /92\.14/);
  assert.match(result.textContent, /USD\/EUR/);
  assert.match(result.textContent, /not an executable quote/i);
});
