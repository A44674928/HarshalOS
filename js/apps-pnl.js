/* P/L display: tabulates every line in the read-only paper-trading logs under /trades/.
   Reads trades/index.txt and each trades/<ticker>.txt from this origin; never writes data.

   Ledger rules (one share per post unless a line says otherwise):
   - LONG and REBUY lines open a long lot.
   - SHORT and DUMP lines open a short lot (a dump is expected to rise, so the position loses when price rises).
   - TAKE PROFIT closes every open long lot for that ticker that was opened before it. "TAKE PROFIT 10%" closes 10% of each lot.
   - Open P/L marks each open lot to the ticker's last logged price (the last entry or exit price in its file), not a live quote. */
(() => {
  "use strict";

  const SAFE_TICKER = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
  const GITHUB_ROOT = "https://github.com/A44674928/HarshalOS";
  const INDEX_FILE_URL = `${GITHUB_ROOT}/blob/main/trades/index.txt`;
  const LINE_RE = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}) (\S+) \| SIMULATED PAPER \[([^\]]+)\] \| (entry|price): \[(?:Market )?@ ~\$([\d,]+(?:\.\d+)?)\] \| size: \[(\d+) shares?\] \| note: \[(.*)\]\s*$/;

  function parseIndex(text) {
    const entries = [];
    let invalidCount = 0;
    for (const sourceLine of String(text ?? "").replace(/^\uFEFF/, "").split(/\r?\n/)) {
      const line = sourceLine.trim();
      if (!line || line.startsWith("#")) continue;
      const divider = line.indexOf("|");
      const ticker = (divider === -1 ? line : line.slice(0, divider)).trim();
      if (!SAFE_TICKER.test(ticker)) { invalidCount++; continue; }
      entries.push({ ticker, description: divider === -1 ? "" : line.slice(divider + 1).trim() });
    }
    return { entries, invalidCount };
  }

  // Maps a bracketed tag from a log line to what the ledger does with it.
  function classifyTag(tag) {
    const base = tag.replace(/\s+\d+%$/, "").trim();
    const pct = /(\d+)%/.exec(tag);
    switch (base) {
      case "LONG": return { action: "open", side: "long" };
      case "REBUY": return { action: "open", side: "long", rebuy: true };
      case "SHORT":
      case "DUMP": return { action: "open", side: "short" };
      case "TAKE PROFIT": return { action: "close", fraction: pct ? Number(pct[1]) / 100 : 1 };
      default: return { action: "unknown" };
    }
  }

  // Parses one log file. Lines that don't match the format are kept as raw rows so nothing is dropped.
  function parseLog(text, ticker) {
    const lines = [];
    String(text ?? "").replace(/^\uFEFF/, "").split(/\r?\n/).forEach((sourceLine, index) => {
      const raw = sourceLine.trimEnd();
      if (!raw.trim()) return;
      const match = LINE_RE.exec(raw);
      if (!match) {
        lines.push({ kind: "raw", ticker, lineNumber: index + 1, raw });
        return;
      }
      const [, date, time, , tag, field, priceText, size, note] = match;
      lines.push({
        kind: "trade",
        ticker,
        lineNumber: index + 1,
        raw,
        date,
        time,
        stamp: `${date} ${time}`,
        tag,
        field,
        price: Number(priceText.replace(/,/g, "")),
        size: Number(size),
        note,
        ...classifyTag(tag)
      });
    });
    return lines;
  }

  const round = value => Math.round(value * 1e6) / 1e6;

  // Asset classes for subtotals. trades/index.txt labels crypto with "CRYPTO" in its description;
  // everything else (stocks, ETFs, commodity ETCs such as XRH0) is grouped as "Stocks & other".
  const ASSET_CLASS_CRYPTO = "Crypto";
  const ASSET_CLASS_OTHER = "Stocks & other";
  const ASSET_CLASSES = [ASSET_CLASS_OTHER, ASSET_CLASS_CRYPTO];
  const assetClassOf = description => (/\bCRYPTO\b/.test(description || "") ? ASSET_CLASS_CRYPTO : ASSET_CLASS_OTHER);

  // Builds the ledger for one ticker. Events are processed in timestamp order (stable for ties).
  function ledgerForTicker(ticker, parsedLines) {
    const events = parsedLines.filter(line => line.kind === "trade").slice().sort((a, b) => (a.stamp < b.stamp ? -1 : a.stamp > b.stamp ? 1 : 0));
    const rows = parsedLines.filter(line => line.kind === "raw").map(line => ({
      ticker, date: "", time: "", tag: "", event: "Unparsed line", price: null, qty: null,
      realized: null, open: null, status: "Unparsed", note: line.raw, raw: line.raw, stamp: ""
    }));

    const lots = [];
    let realized = 0;
    const pricedEvents = events.filter(event => Number.isFinite(event.price));
    const lastLogged = pricedEvents.length ? pricedEvents[pricedEvents.length - 1].price : null;

    for (const event of events) {
      const base = {
        ticker, date: event.date, time: event.time, stamp: event.stamp, tag: event.tag,
        price: event.price, qty: event.size, realized: null, open: null, status: "", note: event.note, raw: event.raw
      };

      if (event.action === "open") {
        // One lane, one direction: an opposite-side trade first closes open lots of the other side (first in, first out).
        // Only the size left over after netting opens a new lot.
        const oppositeSide = event.side === "long" ? "short" : "long";
        let remaining = event.size;
        let closedQty = 0;
        let closedPnl = 0;
        for (const lot of lots) {
          if (remaining <= 0) break;
          if (lot.side !== oppositeSide || lot.remaining <= 0) continue;
          const qty = Math.min(lot.remaining, remaining);
          closedPnl += (lot.side === "long" ? event.price - lot.entry : lot.entry - event.price) * qty;
          lot.remaining = round(lot.remaining - qty);
          remaining = round(remaining - qty);
          closedQty += qty;
          lot.row.status = lot.remaining > 0 ? "Partly closed" : "Closed";
        }
        realized += closedPnl;
        base.realized = closedQty > 0 ? round(closedPnl) : null;
        if (remaining > 0) {
          const lot = { side: event.side, entry: event.price, qty: remaining, remaining, row: null };
          lots.push(lot);
          base.event = closedQty > 0
            ? (event.side === "long" ? "Closes short, opens long" : "Closes long, opens short")
            : (event.rebuy ? "Rebuy (open long)" : event.side === "long" ? "Open long" : "Open short");
          base.status = closedQty > 0 ? "Netted, rest open" : "Open";
          lot.row = base;
        } else {
          base.event = event.side === "long" ? "Closes short" : "Closes long";
          base.status = "Netted";
        }
        rows.push(base);
      } else if (event.action === "close") {
        let closedQty = 0;
        let closedPnl = 0;
        for (const lot of lots) {
          if (lot.side !== "long" || lot.remaining <= 0) continue;
          const sellQty = Math.min(lot.remaining, round(event.fraction * lot.qty));
          if (sellQty <= 0) continue;
          lot.remaining = round(lot.remaining - sellQty);
          closedQty += sellQty;
          closedPnl += (event.price - lot.entry) * sellQty;
          lot.row.status = lot.remaining > 0 ? "Partly closed" : "Closed";
        }
        realized += closedPnl;
        base.event = event.fraction >= 1 ? "Take profit: close all open longs" : `Take profit: close ${round(event.fraction * 100)}% of open longs`;
        base.qty = round(closedQty);
        base.realized = round(closedPnl);
        base.status = closedQty > 0 ? "Executed" : "No open long to close";
        rows.push(base);
      } else {
        base.event = "Unrecognized tag";
        base.status = "Not applied";
        rows.push(base);
      }
    }

    let unrealized = 0;
    let openLots = 0;
    for (const lot of lots) {
      if (lot.remaining <= 0 || lastLogged === null) continue;
      const pnl = lot.side === "long" ? (lastLogged - lot.entry) * lot.remaining : (lot.entry - lastLogged) * lot.remaining;
      lot.row.open = round(pnl);
      unrealized += pnl;
      openLots++;
    }
    const summary = {
      ticker,
      lines: events.length,
      openLots,
      realized: round(realized),
      unrealized: round(unrealized),
      total: round(realized + unrealized),
      lastLogged
    };
    return { rows, summary };
  }

  // logs: [{ ticker, text }] — text of each trades/<ticker>.txt that loaded.
  function buildLedger(logs) {
    const rows = [];
    const summaries = [];
    for (const log of logs) {
      const parsed = parseLog(log.text, log.ticker);
      const ledger = ledgerForTicker(log.ticker, parsed);
      rows.push(...ledger.rows);
      if (ledger.summary.lines > 0 || ledger.rows.length > 0) {
        summaries.push({ ...ledger.summary, assetClass: log.assetClass || ASSET_CLASS_OTHER });
      }
    }
    rows.sort((a, b) => {
      if (a.stamp !== b.stamp) return a.stamp < b.stamp ? -1 : 1;
      return a.ticker < b.ticker ? -1 : a.ticker > b.ticker ? 1 : 0;
    });
    summaries.sort((a, b) => (a.ticker < b.ticker ? -1 : a.ticker > b.ticker ? 1 : 0));
    const sumOf = list => list.reduce((acc, summary) => ({
      realized: round(acc.realized + summary.realized),
      unrealized: round(acc.unrealized + summary.unrealized),
      total: round(acc.total + summary.total),
      openLots: acc.openLots + summary.openLots,
      lines: acc.lines + summary.lines
    }), { realized: 0, unrealized: 0, total: 0, openLots: 0, lines: 0 });
    const totals = sumOf(summaries);
    const byClass = Object.fromEntries(ASSET_CLASSES.map(assetClass => [
      assetClass,
      sumOf(summaries.filter(summary => summary.assetClass === assetClass))
    ]));
    return { rows, summaries, totals, byClass };
  }

  const money = (value, { signed = false } = {}) => {
    if (value === null || value === undefined || !Number.isFinite(value)) return "—";
    const abs = Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const sign = value < 0 ? "−" : signed && value > 0 ? "+" : "";
    return `${sign}$${abs}`;
  };
  const price = value => (Number.isFinite(value) ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—");
  const qtyText = value => (Number.isFinite(value) ? String(round(value)) : "—");

  function getText(path) {
    return window.fetch(new URL(path, window.location.href).href, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "text/plain" }
    });
  }

  // Loads the index, then every listed log. A missing log (404) means no trades yet; other failures are reported.
  async function loadAllLogs() {
    const indexResponse = await getText("trades/index.txt");
    if (!indexResponse.ok) throw new Error(`HTTP ${indexResponse.status}`);
    const parsed = parseIndex(await indexResponse.text());
    const logs = [];
    const failed = [];
    await Promise.all(parsed.entries.map(async entry => {
      try {
        const response = await getText(`trades/${encodeURIComponent(entry.ticker)}.txt`);
        if (response.status === 404) return;
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = String(await response.text()).replace(/^\uFEFF/, "");
        if (text.trim()) logs.push({ ticker: entry.ticker, text, assetClass: assetClassOf(entry.description) });
      } catch {
        failed.push(entry.ticker);
      }
    }));
    logs.sort((a, b) => (a.ticker < b.ticker ? -1 : a.ticker > b.ticker ? 1 : 0));
    return { ledger: buildLedger(logs), failed, invalidCount: parsed.invalidCount, indexCount: parsed.entries.length };
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function table(headers, rows, className) {
    const wrap = el("div", `pnl-table-wrap ${className}`);
    const table = el("table", "pnl-table");
    const thead = el("thead");
    const headRow = el("tr");
    for (const header of headers) headRow.appendChild(el("th", "", header.label));
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = el("tbody");
    for (const cells of rows) {
      const row = el("tr");
      for (const cell of cells) {
        const td = el("td", cell.className || "", cell.text);
        row.appendChild(td);
      }
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  const signClass = value => (value === null || value === undefined ? "" : value > 0 ? "pnl-up" : value < 0 ? "pnl-down" : "");

  function renderLedger(body, data) {
    body.replaceChildren();
    const { ledger, failed, invalidCount, indexCount } = data;

    const cards = el("div", "pnl-cards");
    const cardDefs = [
      { label: "Realized", value: money(ledger.totals.realized, { signed: true }), cls: signClass(ledger.totals.realized) },
      { label: "Open (marked)", value: money(ledger.totals.unrealized, { signed: true }), cls: signClass(ledger.totals.unrealized) },
      { label: "Total", value: money(ledger.totals.total, { signed: true }), cls: signClass(ledger.totals.total) },
      { label: "Open lots", value: String(ledger.totals.openLots), cls: "" },
      { label: "Log lines", value: String(ledger.totals.lines), cls: "" }
    ];
    for (const card of cardDefs) {
      const node = el("div", "pnl-card");
      node.appendChild(el("span", "pnl-card-label", card.label));
      node.appendChild(el("strong", `pnl-card-value ${card.cls}`, card.value));
      cards.appendChild(node);
    }
    body.appendChild(cards);

    const status = el("p", "pnl-status");
    status.setAttribute("role", "status");
    status.textContent = `Loaded ${indexCount} listed tickers; ${ledger.summaries.length} with trades.${invalidCount ? ` ${invalidCount} invalid index line(s) skipped.` : ""}${failed.length ? ` Could not load: ${failed.join(", ")}.` : ""}`;
    body.appendChild(status);

    body.appendChild(el("h3", "pnl-heading", "By asset class"));
    body.appendChild(table(
      [
        { label: "Asset class" }, { label: "Open lots" }, { label: "Realized" }, { label: "Open" }, { label: "Total" }
      ],
      [...ASSET_CLASSES.map(assetClass => ({ name: assetClass, t: ledger.byClass[assetClass] })), { name: "All", t: ledger.totals }]
        .map(({ name, t }) => [
          { text: name, className: "pnl-ticker" },
          { text: String(t.openLots) },
          { text: money(t.realized, { signed: true }), className: signClass(t.realized) },
          { text: money(t.unrealized, { signed: true }), className: signClass(t.unrealized) },
          { text: money(t.total, { signed: true }), className: signClass(t.total) }
        ]),
      "pnl-by-class"
    ));

    body.appendChild(el("h3", "pnl-heading", "By ticker"));
    if (!ledger.summaries.length) {
      body.appendChild(el("p", "pnl-empty", "No trades logged yet."));
    } else {
      body.appendChild(table(
        [
          { label: "Ticker" }, { label: "Asset class" }, { label: "Lines" }, { label: "Open lots" },
          { label: "Realized" }, { label: "Open" }, { label: "Total" }, { label: "Last logged" }
        ],
        ledger.summaries.map(s => [
          { text: s.ticker, className: "pnl-ticker" },
          { text: s.assetClass },
          { text: String(s.lines) },
          { text: String(s.openLots) },
          { text: money(s.realized, { signed: true }), className: signClass(s.realized) },
          { text: money(s.unrealized, { signed: true }), className: signClass(s.unrealized) },
          { text: money(s.total, { signed: true }), className: signClass(s.total) },
          { text: price(s.lastLogged) }
        ]),
        "pnl-by-ticker"
      ));
    }

    body.appendChild(el("h3", "pnl-heading", "Every logged line"));
    if (!ledger.rows.length) {
      body.appendChild(el("p", "pnl-empty", "No trade lines to show."));
    } else {
      body.appendChild(table(
        [
          { label: "Date" }, { label: "Time" }, { label: "Ticker" }, { label: "Tag" }, { label: "Event" },
          { label: "Price" }, { label: "Qty" }, { label: "Realized" }, { label: "Open" }, { label: "Status" }, { label: "Note" }
        ],
        ledger.rows.map(r => [
          { text: r.date || "—" },
          { text: r.time || "—" },
          { text: r.ticker, className: "pnl-ticker" },
          { text: r.tag || "—" },
          { text: r.event },
          { text: price(r.price) },
          { text: qtyText(r.qty) },
          { text: money(r.realized, { signed: true }), className: signClass(r.realized) },
          { text: money(r.open, { signed: true }), className: signClass(r.open) },
          { text: r.status },
          { text: r.note, className: "pnl-note" }
        ]),
        "pnl-all-lines"
      ));
    }

    body.appendChild(el("p", "pnl-disclaimer", "Simulated trades, not financial advice. Open P/L is marked to each ticker's last logged price, not a live quote. Entry prices are the chart price tags as logged."));
  }

  const api = { parseIndex, parseLog, classifyTag, buildLedger, ledgerForTicker, money, price };
  window.TradesPnl = api;

  window.APPS.push({
      id: "pnl",
      title: "P/L",
      short: "P/L",
      glyph: "📈",
      desc: "Profit and loss tabulated from every paper-trading log in Trades",
      w: 880,
      h: 620,
      render(body) {
        body.innerHTML = `
          <section class="pnl-app" aria-label="Profit and loss from paper trades">
            <header class="pnl-head">
              <div>
                <div class="pnl-title">P/L</div>
                <p class="pnl-intro">Realized and open profit and loss from every simulated trade in the Trades logs.</p>
              </div>
              <button class="pnl-refresh" type="button">Refresh</button>
            </header>
            <p class="pnl-loading" role="status" aria-live="polite">Loading trade logs…</p>
            <div class="pnl-results"></div>
            <div class="pnl-footer">
              <span>Read-only · computed from trades/index.txt and each ticker log.</span>
              <a class="pnl-index-source" target="_blank" rel="noopener noreferrer">View index.txt on GitHub ↗</a>
            </div>
          </section>`;
        const refresh = body.querySelector(".pnl-refresh");
        const loading = body.querySelector(".pnl-loading");
        const results = body.querySelector(".pnl-results");
        body.querySelector(".pnl-index-source").href = INDEX_FILE_URL;
        let requestNumber = 0;

        async function load() {
          const current = ++requestNumber;
          refresh.disabled = true;
          loading.hidden = false;
          loading.textContent = "Loading trade logs…";
          try {
            const data = await loadAllLogs();
            if (current !== requestNumber) return;
            renderLedger(results, data);
            loading.hidden = true;
          } catch {
            if (current !== requestNumber) return;
            results.replaceChildren(el("p", "pnl-error", "Could not load the trade logs. Try Refresh."));
            loading.hidden = true;
          } finally {
            if (current === requestNumber) refresh.disabled = false;
          }
        }

        refresh.addEventListener("click", () => { void load(); });
        void load();
      }
    });
})();
