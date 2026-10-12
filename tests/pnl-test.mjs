/* P/L desktop app: log parsing, ledger rules (LONG/REBUY/SHORT/DUMP/TAKE PROFIT), marking, and rendering. */
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { Window } from "happy-dom";

const appSource = await readFile(new URL("../js/apps-pnl.js", import.meta.url), "utf8");
const indexHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
const tradesIndex = await readFile(new URL("../trades/index.txt", import.meta.url), "utf8");
const tradesDir = new URL("../trades/", import.meta.url);

const line = (date, time, tag, price, size, note = "fixture") =>
  `${date} ${time} MST | SIMULATED PAPER [${tag}] | entry: [Market @ ~$${price}] | size: [${size} share${size === 1 ? "" : "s"}] | note: [${note}]`;
const exitLine = (date, time, tag, price, note = "fixture exit") =>
  `${date} ${time} MST | SIMULATED PAPER [${tag}] | price: [@ ~$${price}] | size: [1 share] | note: [${note}]`;

const ledgerFor = (logs) => loadApi().buildLedger(logs);

let cachedApi = null;
function loadApi() {
  if (cachedApi) return cachedApi;
  const window = new Window({ url: "https://main.empty.domains/", settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  window.eval("var APPS = window.APPS = [];");
  window.eval(appSource);
  cachedApi = window.TradesPnl;
  window.happyDOM.abort();
  return cachedApi;
}

// Values created inside the happy-dom realm carry a different Object prototype; compare plain copies.
const plain = value => JSON.parse(JSON.stringify(value));

const flushUntil = async (predicate, attempts = 200) => {
  for (let i = 0; i < attempts && !predicate(); i++) await new Promise(resolve => setTimeout(resolve, 0));
};

function mount(t, files, { indexBody = tradesIndex, failFor = new Set() } = {}) {
  const window = new Window({ url: "https://main.empty.domains/", settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  t.after(() => window.happyDOM.abort());
  const requests = [];
  const requestUrls = [];
  window.fetch = async (input) => {
    const url = new URL(String(input), window.location.href);
    requests.push(url.pathname);
    requestUrls.push(url);
    const name = decodeURIComponent(url.pathname.split("/").pop());
    if (url.pathname.endsWith("/trades/index.txt")) return { status: 200, ok: true, text: async () => indexBody };
    if (failFor.has(name)) return { status: 500, ok: false, text: async () => "boom" };
    if (!(name in files)) return { status: 404, ok: false, text: async () => "" };
    return { status: 200, ok: true, text: async () => files[name] };
  };
  window.document.write("<!doctype html><html><body><div id=\"folder\"></div></body></html>");
  window.eval("var APPS = window.APPS = [];");
  window.eval(appSource);
  const app = window.APPS.find(candidate => candidate.id === "pnl");
  assert.ok(app, "P/L registers in the desktop app registry");
  const body = window.document.createElement("div");
  window.document.body.appendChild(body);
  app.render(body, {});
  return { window, app, body, requests, requestUrls };
}

test("P/L registers as its own desktop app and is wired into index.html", (t) => {
  const window = new Window({ url: "https://main.empty.domains/", settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  t.after(() => window.happyDOM.abort());
  window.eval("var APPS = window.APPS = [];");
  window.eval(appSource);
  const app = window.APPS.find(candidate => candidate.id === "pnl");
  assert.equal(app.title, "P/L");
  assert.equal(app.glyph, "📈");
  assert.equal(app.w, 880);
  assert.equal(app.h, 620);
  assert.equal(window.APPS.filter(candidate => candidate.id === "pnl").length, 1);
  assert.match(indexHtml, /<script defer src="js\/apps-pnl\.js\?v=[^"]+"><\/script>/);
  assert.match(indexHtml, /<link rel="stylesheet" href="css\/pnl\.css\?v=[^"]+">/);
});

test("index parsing keeps valid tickers and counts invalid lines", () => {
  const api = loadApi();
  const parsed = api.parseIndex("# heading\nAAPL | Apple\n\nBAD TICKER | nope\nBTC | CRYPTO · Bitcoin\n");
  assert.deepEqual(plain(parsed.entries.map(entry => entry.ticker)), ["AAPL", "BTC"]);
  assert.equal(parsed.invalidCount, 1);
});

test("classifyTag maps LONG and REBUY to long lots, SHORT and DUMP to short lots, and TAKE PROFIT to closes", () => {
  const api = loadApi();
  assert.deepEqual(plain(api.classifyTag("LONG")), { action: "open", side: "long" });
  assert.deepEqual(plain(api.classifyTag("REBUY")), { action: "open", side: "long", rebuy: true });
  assert.deepEqual(plain(api.classifyTag("SHORT")), { action: "open", side: "short" });
  assert.deepEqual(plain(api.classifyTag("DUMP")), { action: "open", side: "short" });
  assert.deepEqual(plain(api.classifyTag("TAKE PROFIT")), { action: "close", fraction: 1 });
  assert.deepEqual(plain(api.classifyTag("TAKE PROFIT 10%")), { action: "close", fraction: 0.1 });
  assert.equal(api.classifyTag("WHATEVER").action, "unknown");
});

test("parseLog keeps unmatched lines as raw rows instead of dropping them", () => {
  const api = loadApi();
  const parsed = api.parseLog(`${line("2026-09-03", "06:30", "LONG", "100.00", 1)}\nnot a trade line\n`, "TEST");
  assert.equal(parsed.filter(row => row.kind === "trade").length, 1);
  const raw = parsed.find(row => row.kind === "raw");
  assert.equal(raw.raw, "not a trade line");
  const ledger = ledgerFor([{ ticker: "TEST", text: `${line("2026-09-03", "06:30", "LONG", "100.00", 1)}\nnot a trade line\n` }]);
  assert.equal(ledger.rows.filter(row => row.status === "Unparsed").length, 1);
});

test("edited trade lines accept exact prices, exit labels, and plain notes without losing bracketed notes", () => {
  const api = loadApi();
  const text = [
    "2024-08-19 06:30 MST | SIMULATED PAPER [LONG] | entry: [Market @ $24] | size: [1 share] | note: post car crash.",
    "2026-10-09 06:30 MST | SIMULATED PAPER [TAKE PROFIT] | exit: [Market @ ~$209.05] | size: [1 share] | note: [sale at resistance]",
    "2026-10-10 06:30 MST | SIMULATED PAPER [LONG] | entry: [Market @ ~$200.00] | size: [1 share] | note: [bracketed [detail] kept]"
  ].join("\n");
  const parsed = api.parseLog(text, "PLTR");
  assert.deepEqual(plain(parsed.map(row => row.kind)), ["trade", "trade", "trade"]);
  assert.deepEqual(plain(parsed.map(row => row.note)), ["post car crash.", "sale at resistance", "bracketed [detail] kept"]);
  assert.deepEqual(plain(parsed.map(row => row.price)), [24, 209.05, 200]);
  assert.equal(parsed[1].field, "exit");
  assert.equal(parsed[1].action, "close");
  // Incomplete price/size and malformed notes must still remain visible, not affect P/L.
  const invalid = api.parseLog("2026-10-09 06:30 MST | SIMULATED PAPER [LONG] | entry: [Market @ $oops] | size: [1 share] | note: [bad]", "PLTR");
  assert.equal(invalid[0].kind, "raw");
});

test("a LONG open is marked to the last logged price of its ticker", () => {
  const ledger = ledgerFor([{
    ticker: "AAA",
    text: [line("2026-09-03", "06:30", "LONG", "100.00", 1), line("2026-09-10", "06:30", "LONG", "110.00", 1)].join("\n")
  }]);
  const summary = ledger.summaries.find(entry => entry.ticker === "AAA");
  assert.equal(summary.lastLogged, 110);
  assert.equal(summary.realized, 0);
  // First lot is marked +10 at 110; second lot is flat.
  assert.equal(summary.unrealized, 10);
  assert.equal(summary.total, 10);
  assert.equal(summary.openLots, 2);
});

test("a TAKE PROFIT 10% line sells a tenth of each open long opened before it", () => {
  const ledger = ledgerFor([{
    ticker: "CAT",
    text: [
      line("2026-09-03", "06:30", "LONG", "200.00", 1),
      line("2026-09-17", "06:30", "LONG", "210.00", 1),
      exitLine("2026-10-06", "13:00", "TAKE PROFIT 10%", "240.00")
    ].join("\n")
  }]);
  const summary = ledger.summaries[0];
  // 0.1 × (240−200) + 0.1 × (240−210) = 4 + 3 = 7
  assert.equal(summary.realized, 7);
  // 0.9 × (240−200) + 0.9 × (240−210) = 36 + 27 = 63
  assert.equal(summary.unrealized, 63);
  assert.equal(summary.openLots, 2);
  const exit = ledger.rows.find(row => row.tag === "TAKE PROFIT 10%");
  assert.equal(exit.qty, 0.2);
  assert.equal(exit.realized, 7);
  assert.equal(exit.status, "Executed");
});

test("a full TAKE PROFIT closes only the longs opened before it, not later ones", () => {
  const ledger = ledgerFor([{
    ticker: "META",
    text: [
      line("2026-09-03", "06:30", "LONG", "100.00", 1),
      exitLine("2026-09-10", "13:00", "TAKE PROFIT", "150.00"),
      line("2026-09-20", "06:30", "REBUY", "120.00", 1),
      line("2026-09-30", "06:30", "LONG", "130.00", 1)
    ].join("\n")
  }]);
  const summary = ledger.summaries[0];
  assert.equal(summary.realized, 50);
  // Rebuy and later long are marked to the last logged price 130.
  assert.equal(summary.unrealized, 10 + 0);
  assert.equal(summary.openLots, 2);
  assert.equal(ledger.rows.find(row => row.event === "Open long" && row.date === "2026-09-03").status, "Closed");
  assert.equal(ledger.rows.find(row => row.event === "Rebuy (open long)").status, "Open");
});

test("DUMP and SHORT open short positions that lose when the price rises", () => {
  const ledger = ledgerFor([{
    ticker: "XXX",
    text: [
      line("2026-09-03", "06:30", "DUMP", "180.00", 1),
      line("2026-10-09", "06:30", "SHORT", "200.00", 1)
    ].join("\n")
  }]);
  const summary = ledger.summaries[0];
  // Last logged price is 200. Two short lots: (180 − 200) + (200 − 200) = −20.
  assert.equal(summary.unrealized, -20);
  assert.equal(summary.realized, 0);
  assert.equal(summary.openLots, 2);
  assert.equal(ledger.rows.find(row => row.tag === "DUMP").event, "Open short");
  assert.equal(ledger.rows.find(row => row.tag === "SHORT").event, "Open short");
});

test("one lane: a LONG closes an open short first, first in first out, and only the rest opens a long", () => {
  const ledger = ledgerFor([{
    ticker: "PLTR",
    text: [
      line("2026-09-03", "06:30", "DUMP", "180.00", 1),
      line("2026-09-13", "06:30", "LONG", "160.00", 2)
    ].join("\n")
  }]);
  const summary = ledger.summaries[0];
  // The 2-share long covers the 1-share short at 160 (+20) and opens a 1-share long at 160, marked at last price 160 (0).
  assert.equal(summary.realized, 20);
  assert.equal(summary.unrealized, 0);
  assert.equal(summary.openLots, 1);
  const long = ledger.rows.find(row => row.tag === "LONG");
  assert.equal(long.event, "Closes short, opens long");
  assert.equal(long.realized, 20);
  assert.equal(long.status, "Netted, rest open");
  assert.equal(ledger.rows.find(row => row.tag === "DUMP").status, "Closed");
});

test("one lane: a DUMP sells an open long first, realizing entry-to-exit, and opens nothing when fully netted", () => {
  const ledger = ledgerFor([{
    ticker: "DIS",
    text: [
      line("2026-09-03", "06:30", "LONG", "107.57", 1),
      line("2026-09-21", "06:30", "DUMP", "104.23", 1)
    ].join("\n")
  }]);
  const summary = ledger.summaries[0];
  assert.equal(summary.realized, -3.34);
  assert.equal(summary.unrealized, 0);
  assert.equal(summary.openLots, 0);
  const dump = ledger.rows.find(row => row.tag === "DUMP");
  assert.equal(dump.event, "Closes long");
  assert.equal(dump.status, "Netted");
});

test("a TAKE PROFIT with no open long realizes nothing and says so", () => {
  const ledger = ledgerFor([{
    ticker: "ZZZ",
    text: [exitLine("2026-09-03", "13:00", "TAKE PROFIT", "50.00")].join("\n")
  }]);
  const exit = ledger.rows.find(row => row.tag === "TAKE PROFIT");
  assert.equal(exit.status, "No open long to close");
  assert.equal(exit.realized, 0);
});

test("the current repository logs yield the expected per-ticker results and no unparsed lines", async () => {
  const names = (await readdir(tradesDir)).filter(name => name.endsWith(".txt") && name !== "index.txt");
  const logs = await Promise.all(names.map(async name => ({
    ticker: name.replace(/\.txt$/, ""),
    text: await readFile(new URL(name, tradesDir), "utf8")
  })));
  const ledger = ledgerFor(logs);
  assert.equal(ledger.rows.filter(row => row.status === "Unparsed").length, 0, "every logged line parses");
  assert.equal(ledger.rows.filter(row => row.status === "Not applied").length, 0, "every tag is recognized");

  const byTicker = Object.fromEntries(ledger.summaries.map(summary => [summary.ticker, summary]));
  // META: five open longs (Sep 3–21) closed at 769.46 → +519.34 realized; two rebuys marked to 719.00.
  assert.equal(byTicker.META.realized, 519.34);
  assert.equal(byTicker.META.unrealized, -1.37);
  // INTC: five longs closed at 127.11 → +110.12; three open lots marked to 119.33.
  assert.equal(byTicker.INTC.realized, 110.12);
  assert.equal(byTicker.INTC.openLots, 3);
  // CAT: full exit of both open lots at 864.70 → (864.70 − 787.86) + (864.70 − 785.41) = 76.84 + 79.29 = 156.13.
  assert.equal(byTicker.CAT.realized, 156.13);
  assert.equal(byTicker.CAT.openLots, 0);
  assert.equal(byTicker.CAT.unrealized, 0);
  // PLTR: the 2024 long at $24 is sold by the Sep 3 short at $184.91 (+160.91).
  // The Sep 13 long at $167.23 is closed by the Oct 9 exit at $209.05 (+41.82).
  // The Oct 9 short at $209.05 is the only open lot, marked at the same price.
  assert.equal(byTicker.PLTR.realized, 202.73);
  assert.equal(byTicker.PLTR.unrealized, 0);
  assert.equal(byTicker.PLTR.openLots, 1);
  assert.equal(byTicker.PLTR.lines, 5);
  assert.equal(ledger.rows.find(row => row.ticker === "PLTR" && row.tag === "TAKE PROFIT").status, "Executed");
  // DIS: the Sep 3 long is sold by the Sep 21 DUMP at 104.23 → −3.34; flat afterwards.
  assert.equal(byTicker.DIS.realized, -3.34);
  assert.equal(byTicker.DIS.openLots, 0);
  // SPCX and UPS are short-only; their marks depend on the last logged price.
  assert.ok(Number.isFinite(byTicker.SPCX.unrealized));
  assert.ok(Number.isFinite(byTicker.UPS.unrealized));
  assert.ok(ledger.totals.lines > 0);
  assert.equal(ledger.summaries.length, names.length, "every log with lines has a summary");
});

test("the app renders cards, a by-ticker table, and every logged line from the index and logs", async (t) => {
  const files = {
    "AAA.txt": [line("2026-09-03", "06:30", "LONG", "100.00", 1), exitLine("2026-09-10", "13:00", "TAKE PROFIT", "150.00")].join("\n"),
    "BBB.txt": line("2026-09-03", "06:30", "SHORT", "50.00", 1)
  };
  const indexBody = "AAA | one\nBBB | two\nCCC | three (no log yet)\n";
  const { body, requests } = mount(t, files, { indexBody });
  await flushUntil(() => /Loaded \d+ listed/.test(body.querySelector(".pnl-status")?.textContent ?? ""));

  assert.ok(requests.some(path => path.endsWith("/trades/CCC.txt")), "a listed ticker without a log is requested");
  const cards = [...body.querySelectorAll(".pnl-card-label")].map(node => node.textContent);
  assert.deepEqual(cards, ["Realized", "Open (marked)", "Total", "Open lots", "Log lines"]);

  const summaryRows = body.querySelectorAll(".pnl-by-ticker tbody tr");
  assert.equal(summaryRows.length, 2);
  const allRows = body.querySelectorAll(".pnl-all-lines tbody tr");
  assert.equal(allRows.length, 3, "every trade line (LONG, TAKE PROFIT, SHORT) is listed");
  assert.match(body.querySelector(".pnl-status").textContent, /Loaded 3 listed tickers; 2 with trades/);
  assert.match(body.querySelector(".pnl-disclaimer").textContent, /not a live quote/);
});

test("Refresh fetches the latest index and logs and rebuilds the table", async (t) => {
  const files = { "AAA.txt": line("2026-09-03", "06:30", "LONG", "100.00", 1) };
  const { body, requestUrls } = mount(t, files, { indexBody: "AAA | one\n" });
  await flushUntil(() => body.querySelector(".pnl-by-ticker tbody tr"));
  assert.equal(body.querySelector(".pnl-by-ticker tbody tr td:last-child").textContent, "$100.00");
  files["AAA.txt"] += `\n${line("2026-09-10", "06:30", "LONG", "110.00", 1)}`;
  body.querySelector(".pnl-refresh").click();
  await flushUntil(() => body.querySelector(".pnl-by-ticker tbody tr td:last-child")?.textContent === "$110.00");
  assert.equal(body.querySelectorAll(".pnl-all-lines tbody tr").length, 2);
  assert.ok(requestUrls.filter(url => url.searchParams.has("refresh")).some(url => url.pathname.endsWith("/trades/index.txt")));
  assert.ok(requestUrls.filter(url => url.searchParams.has("refresh")).some(url => url.pathname.endsWith("/trades/AAA.txt")));
});

test("unparsed source lines are called out and remain visible without changing totals", async (t) => {
  const files = { "AAA.txt": `${line("2026-09-03", "06:30", "LONG", "100.00", 1)}\nnot a trade line\n` };
  const { body } = mount(t, files, { indexBody: "AAA | one\n" });
  await flushUntil(() => body.querySelector(".pnl-status")?.textContent.includes("unparsed"));
  assert.match(body.querySelector(".pnl-status").textContent, /1 unparsed line excluded from P\/L/);
  const rows = [...body.querySelectorAll(".pnl-all-lines tbody tr")];
  assert.equal(rows.length, 2);
  assert.ok(rows.some(row => row.textContent.includes("Unparsed line 2") && row.textContent.includes("not a trade line")));
  assert.equal(body.querySelector(".pnl-by-ticker tbody tr td:nth-child(3)").textContent, "1");
});

test("a failing log is reported by name without hiding the others", async (t) => {
  const files = { "AAA.txt": line("2026-09-03", "06:30", "LONG", "100.00", 1) };
  const { body } = mount(t, files, { indexBody: "AAA | one\nBBB | two\n", failFor: new Set(["BBB.txt"]) });
  await flushUntil(() => /Loaded \d+ listed/.test(body.querySelector(".pnl-status")?.textContent ?? ""));
  assert.match(body.querySelector(".pnl-status").textContent, /Could not load: BBB/);
  assert.equal(body.querySelectorAll(".pnl-by-ticker tbody tr").length, 1);
});

test("a failed index shows an error and a retry control", async (t) => {
  const window = new Window({ url: "https://main.empty.domains/", settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  t.after(() => window.happyDOM.abort());
  window.fetch = async () => ({ status: 503, ok: false, text: async () => "" });
  window.document.write("<!doctype html><html><body></body></html>");
  window.eval("var APPS = window.APPS = [];");
  window.eval(appSource);
  const body = window.document.createElement("div");
  window.document.body.appendChild(body);
  window.APPS.find(candidate => candidate.id === "pnl").render(body, {});
  await flushUntil(() => body.querySelector(".pnl-error"));
  assert.match(body.querySelector(".pnl-error").textContent, /Could not load the trade logs/);
  assert.ok(body.querySelector(".pnl-refresh"));
});

test("subtotals split crypto from stocks and other assets, and the combined total still adds both", () => {
  const ledger = ledgerFor([
    { ticker: "AAA", assetClass: "Stocks & other", text: [line("2026-09-03", "06:30", "LONG", "100.00", 1), exitLine("2026-09-10", "13:00", "TAKE PROFIT", "150.00")].join("\n") },
    { ticker: "BTC", assetClass: "Crypto", text: [line("2026-09-03", "06:30", "LONG", "1000.00", 1), line("2026-09-10", "06:30", "LONG", "1200.00", 1)].join("\n") }
  ]);
  assert.equal(plain(ledger.byClass["Stocks & other"]).realized, 50);
  assert.equal(plain(ledger.byClass["Stocks & other"]).unrealized, 0);
  assert.equal(plain(ledger.byClass.Crypto).realized, 0);
  assert.equal(plain(ledger.byClass.Crypto).unrealized, 200);
  assert.equal(plain(ledger.byClass.Crypto).openLots, 2);
  assert.equal(plain(ledger.totals).total, 250);
});

test("the P/L table groups crypto separately from stocks using the index labels", async (t) => {
  const files = {
    "AAA.txt": [line("2026-09-03", "06:30", "LONG", "100.00", 1), exitLine("2026-09-10", "13:00", "TAKE PROFIT", "150.00")].join("\n"),
    "BTC.txt": [line("2026-09-03", "06:30", "LONG", "1000.00", 1), line("2026-09-10", "06:30", "LONG", "1200.00", 1)].join("\n")
  };
  const indexBody = "AAA | ETF · one\nBTC | CRYPTO · Bitcoin / U.S. Dollar, Bitstamp\n";
  const { body } = mount(t, files, { indexBody });
  await flushUntil(() => body.querySelector(".pnl-by-class") && body.querySelector(".pnl-by-class tbody tr"));

  const classRows = [...body.querySelectorAll(".pnl-by-class tbody tr")].map(row => [...row.querySelectorAll("td")].map(cell => cell.textContent));
  assert.deepEqual(classRows, [
    ["Stocks & other", "0", "+$50.00", "$0.00", "+$50.00"],
    ["Crypto", "2", "$0.00", "+$200.00", "+$200.00"],
    ["All", "2", "+$50.00", "+$200.00", "+$250.00"]
  ]);
  const tickerRows = [...body.querySelectorAll(".pnl-by-ticker tbody tr")].map(row => row.querySelectorAll("td")[1].textContent);
  assert.deepEqual(tickerRows, ["Stocks & other", "Crypto"]);
});
