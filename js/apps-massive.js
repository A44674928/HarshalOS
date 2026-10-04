/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Massive Markets
   Read-only market data through the Massive REST API
   (https://massive.com/docs/rest/quickstart). Requests go to the
   same-origin Worker route /api/massive/v1/*, which holds the
   MASSIVE_API_KEY secret, validates every parameter, and paces
   calls. The browser never sees the key. Display-only data:
   recency depends on the owner's Massive plan (data may be
   end-of-day or delayed). Nothing here is investment advice and
   no order, trade, or transaction is possible from this window.

   The asset classes, ticker shapes, and bar timespans below mirror
   worker/massive.mjs; tests/massive-ui-test.mjs fails if they drift.
   ═══════════════════════════════════════════════════════════════ */
"use strict";

(() => {
  const ROUTE = "/api/massive/v1";

  const ASSETS = Object.freeze({
    stocks: Object.freeze({ label: "U.S. stocks", tickerPattern: "^[A-Z][A-Z0-9.\\-]{0,11}$", example: "AAPL" }),
    crypto: Object.freeze({ label: "Crypto pairs", tickerPattern: "^X:[A-Z0-9]{3,24}$", example: "X:BTCUSD" }),
    forex: Object.freeze({ label: "Forex pairs", tickerPattern: "^C:[A-Z]{6}$", example: "C:EURUSD" }),
    indices: Object.freeze({ label: "Indices", tickerPattern: "^I:[A-Z0-9.]{1,12}$", example: "I:SPX" })
  });
  const BAR_TIMESPANS = Object.freeze(["minute", "hour", "day", "week", "month", "quarter", "year"]);
  const DEFAULT_TICKER = Object.freeze({ stocks: "AAPL", crypto: "X:BTCUSD", forex: "C:EURUSD", indices: "I:SPX" });
  const QUICK_PICKS = Object.freeze({
    stocks: ["AAPL", "MSFT", "NVDA", "AMZN", "JPM", "XOM"],
    crypto: ["X:BTCUSD", "X:ETHUSD", "X:SOLUSD", "X:DOGEUSD"],
    forex: ["C:EURUSD", "C:GBPUSD", "C:USDJPY", "C:USDCHF"],
    indices: ["I:SPX", "I:NDX", "I:DJI", "I:VIX", "I:COMP"]
  });
  const BAR_RANGES = Object.freeze({
    minute: [["1D", 1], ["3D", 3], ["5D", 5]],
    hour: [["5D", 5], ["1M", 30], ["3M", 90]],
    day: [["1M", 30], ["3M", 91], ["6M", 182], ["1Y", 365], ["2Y", 730]],
    week: [["1Y", 365], ["2Y", 730], ["5Y", 1825]],
    month: [["2Y", 730], ["5Y", 1825], ["10Y", 3650]],
    quarter: [["5Y", 1825], ["10Y", 3650]],
    year: [["10Y", 3650], ["20Y", 7300]]
  });

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
  ));
  const compact = (value, digits = 2) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    const abs = Math.abs(n);
    if (abs >= 1e12) return `${(n / 1e12).toFixed(digits)}T`;
    if (abs >= 1e9) return `${(n / 1e9).toFixed(digits)}B`;
    if (abs >= 1e6) return `${(n / 1e6).toFixed(digits)}M`;
    if (abs >= 1e3) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
    return n.toLocaleString("en-US", { maximumFractionDigits: digits });
  };
  const money = (value, currency = "USD") => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("en-US", { style: "currency", currency, maximumFractionDigits: Math.abs(n) >= 1000 ? 2 : 4 });
  };
  const dateLabel = ms => {
    const n = Number(ms);
    if (!Number.isFinite(n)) return "—";
    return new Date(n).toISOString().slice(0, 10);
  };
  const timeLabel = ms => {
    const n = Number(ms);
    if (!Number.isFinite(n)) return "—";
    return new Date(n).toISOString().replace("T", " ").slice(0, 19) + " UTC";
  };
  const isoDaysAgo = days => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const todayIso = () => new Date().toISOString().slice(0, 10);

  async function fetchMassive(sub, params) {
    const url = new URL(`${ROUTE}/${sub}`, window.location.origin);
    for (const [name, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(name, String(value));
    }
    let response;
    try {
      response = await fetch(url.toString(), { method: "GET", headers: { Accept: "application/json" } });
    } catch {
      return { ok: false, code: "network", message: "The Massive route could not be reached from this browser." };
    }
    let body = null;
    try { body = await response.json(); } catch { /* non-JSON refusal */ }
    if (response.ok && body && body.success === true) {
      return { ok: true, data: body.data || null, cached: body.cached === true };
    }
    return {
      ok: false,
      status: response.status,
      code: body && body.code ? String(body.code) : "unexpected",
      message: body && body.message ? String(body.message) : `The Massive route answered ${response.status}.`,
      upstreamMessage: body && body.upstreamMessage ? String(body.upstreamMessage) : null,
      retryAfterSeconds: body && Number.isFinite(Number(body.retryAfterSeconds)) ? Number(body.retryAfterSeconds) : null
    };
  }

  function refusalText(result) {
    switch (result.code) {
      case "not-configured":
        return "Massive is not configured on this deployment. The owner can add the MASSIVE_API_KEY Worker secret (npx wrangler secret put MASSIVE_API_KEY). No request reached the provider.";
      case "rate-limited":
        return `Paced by the Worker budget${result.retryAfterSeconds ? ` — try again in about ${result.retryAfterSeconds}s` : ""}. The Massive key is shared by every visitor, so requests stay deliberately slow.`;
      case "upstream-rate-limited":
        return `Massive rate limit reached${result.retryAfterSeconds ? ` — try again in about ${result.retryAfterSeconds}s` : ""}.`;
      case "credentials-rejected":
        return "Massive rejected the Worker's API key. The owner should check the MASSIVE_API_KEY Worker secret in Cloudflare. No key is ever shown or stored here.";
      case "upstream-error":
        return `Massive could not serve this request.${result.upstreamMessage ? ` Massive said: ${result.upstreamMessage}` : ""}`;
      case "timeout":
        return "The Massive request timed out. Try again shortly.";
      case "unreachable":
      case "network":
        return "Massive could not be reached through the Worker route. Try again shortly.";
      case "invalid-request":
        return result.message;
      default:
        return result.message || "The Massive route returned an unexpected answer.";
    }
  }

  function renderApp(body) {
    const state = {
      asset: "stocks",
      ticker: DEFAULT_TICKER.stocks,
      tab: "snapshot",
      busy: false,
      barsTimespan: "day",
      barsRange: "1Y",
      lastRequestId: null
    };

    body.innerHTML = `
      <section class="mvm" aria-label="Massive Markets read-only market data">
        <header class="mvm-masthead">
          <div class="mvm-heading">
            <div class="mvm-wordmark"><span class="mvm-mark" aria-hidden="true"></span>HARSHALOS <span>/</span> MASSIVE REST</div>
            <h1>Markets</h1>
            <p>Read-only market data through the Massive REST API, proxied by the Worker. The API key never reaches this browser.</p>
          </div>
          <div class="mvm-edition" aria-hidden="true"><span>READ-ONLY</span><strong>REST</strong><span>DISPLAY</span></div>
        </header>

        <div class="mvm-boundary">
          <span class="mvm-boundary-label">NOT ADVICE</span>
          <span>Display-only data. Recency follows the owner's Massive plan (may be end-of-day or delayed). No order, trade, or transaction is possible from this window.</span>
        </div>

        <div class="mvm-controls">
          <label class="mvm-field">
            <span>Asset class</span>
            <select id="mvm-asset">
              <option value="stocks">U.S. stocks</option>
              <option value="crypto">Crypto pairs</option>
              <option value="forex">Forex pairs</option>
              <option value="indices">Indices</option>
            </select>
          </label>
          <label class="mvm-field mvm-field-grow">
            <span>Ticker (Massive format)</span>
            <input id="mvm-ticker" type="text" spellcheck="false" autocomplete="off" value="AAPL" placeholder="AAPL · X:BTCUSD · C:EURUSD · I:SPX">
          </label>
          <button class="btn btn-ice" id="mvm-load" type="button">◆ LOAD</button>
        </div>
        <div class="mvm-chips" id="mvm-chips" aria-label="Quick ticker picks"></div>

        <nav class="mvm-tabs" aria-label="Massive data views">
          <button class="mvm-tab active" data-tab="snapshot" type="button">Snapshot</button>
          <button class="mvm-tab" data-tab="bars" type="button">Bars</button>
          <button class="mvm-tab" data-tab="dividends" type="button">Dividends</button>
          <button class="mvm-tab" data-tab="convert" type="button">Convert</button>
        </nav>

        <p class="mvm-status" id="mvm-status" role="status" aria-live="polite">Choose an asset class and ticker, then load a snapshot.</p>

        <div class="mvm-panel" id="mvm-panel-snapshot"></div>

        <div class="mvm-panel" id="mvm-panel-bars" hidden>
          <div class="mvm-bar-controls">
            <label class="mvm-field">
              <span>Timespan</span>
              <select id="mvm-bar-timespan">
                ${BAR_TIMESPANS.map(span => `<option value="${span}"${span === "day" ? " selected" : ""}>${span}</option>`).join("")}
              </select>
            </label>
            <label class="mvm-field">
              <span>Multiplier</span>
              <input id="mvm-bar-multiplier" type="number" min="1" max="100" step="1" value="1">
            </label>
            <label class="mvm-field">
              <span>Range</span>
              <select id="mvm-bar-range"></select>
            </label>
            <button class="btn btn-ice" id="mvm-bar-draw" type="button">◆ DRAW BARS</button>
          </div>
          <div class="mvm-bar-stats" id="mvm-bar-stats"></div>
          <div class="mvm-bar-chart" id="mvm-bar-chart"></div>
          <div class="mvm-bar-table" id="mvm-bar-table"></div>
        </div>

        <div class="mvm-panel" id="mvm-panel-dividends" hidden>
          <div class="mvm-bar-controls">
            <label class="mvm-field">
              <span>Rows</span>
              <select id="mvm-div-limit">
                <option value="10">10</option>
                <option value="25" selected>25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </label>
            <button class="btn btn-ice" id="mvm-div-draw" type="button">◆ FETCH DIVIDENDS</button>
          </div>
          <div class="mvm-div-table" id="mvm-div-table"></div>
        </div>

        <div class="mvm-panel" id="mvm-panel-convert" hidden>
          <div class="mvm-bar-controls">
            <label class="mvm-field">
              <span>From</span>
              <input id="mvm-fx-from" type="text" value="USD" maxlength="3" spellcheck="false" autocomplete="off">
            </label>
            <label class="mvm-field">
              <span>To</span>
              <input id="mvm-fx-to" type="text" value="EUR" maxlength="3" spellcheck="false" autocomplete="off">
            </label>
            <label class="mvm-field">
              <span>Amount</span>
              <input id="mvm-fx-amount" type="text" value="100" inputmode="decimal" spellcheck="false" autocomplete="off">
            </label>
            <label class="mvm-field">
              <span>Precision</span>
              <select id="mvm-fx-precision">
                <option value="0">0</option><option value="1">1</option><option value="2" selected>2</option>
                <option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option>
              </select>
            </label>
            <button class="btn btn-ice" id="mvm-fx-draw" type="button">◆ CONVERT</button>
          </div>
          <div class="mvm-fx-result" id="mvm-fx-result"></div>
        </div>

        <footer class="mvm-footer">
          PROVIDER · MASSIVE REST API · SAME-ORIGIN WORKER PROXY · KEY STAYS IN THE WORKER ·
          DATA SHAPES FOLLOW MASSIVE'S DOCUMENTED RESPONSES (status, results, request_id).
        </footer>
      </section>`;

    const $ = selector => body.querySelector(selector);
    const assetSelect = $("#mvm-asset");
    const tickerInput = $("#mvm-ticker");
    const statusEl = $("#mvm-status");
    const chipsEl = $("#mvm-chips");

    function setStatus(kind, text, requestId = null, cached = false) {
      state.lastRequestId = requestId || state.lastRequestId;
      const chip = requestId
        ? ` · request_id ${esc(String(requestId).slice(0, 24))}${cached ? " · cached" : ""}`
        : "";
      statusEl.innerHTML = `<span class="mvm-status-kind mvm-status-${kind}">${kind === "ok" ? "OK" : kind.toUpperCase()}</span> ${esc(text)}${chip}`;
    }

    function renderChips() {
      chipsEl.innerHTML = "";
      (QUICK_PICKS[state.asset] || []).forEach(ticker => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "mvm-chip" + (ticker === tickerInput.value.trim().toUpperCase() ? " active" : "");
        chip.textContent = ticker;
        chip.addEventListener("click", () => {
          tickerInput.value = ticker;
          renderChips();
        });
        chipsEl.appendChild(chip);
      });
    }

    function currentTicker() {
      return tickerInput.value.trim().toUpperCase();
    }

    function validTicker(asset, ticker) {
      return new RegExp(ASSETS[asset].tickerPattern).test(ticker);
    }

    /* ── tabs ── */
    function switchTab(tab) {
      state.tab = tab;
      body.querySelectorAll(".mvm-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
      ["snapshot", "bars", "dividends", "convert"].forEach(name => {
        $(`#mvm-panel-${name}`).hidden = name !== tab;
      });
    }
    body.querySelectorAll(".mvm-tab").forEach(btn => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    assetSelect.addEventListener("change", () => {
      state.asset = assetSelect.value;
      if (!validTicker(state.asset, currentTicker())) tickerInput.value = DEFAULT_TICKER[state.asset];
      renderChips();
    });
    tickerInput.addEventListener("change", () => {
      tickerInput.value = currentTicker();
      renderChips();
    });

    /* ── snapshot ── */
    async function loadSnapshot() {
      const asset = assetSelect.value;
      const ticker = currentTicker();
      state.asset = asset;
      state.ticker = ticker;
      if (!validTicker(asset, ticker)) {
        setStatus("refusal", `Enter a ${ASSETS[asset].label} ticker in Massive format, for example ${ASSETS[asset].example}.`);
        return;
      }
      const panel = $("#mvm-panel-snapshot");
      panel.innerHTML = `<p class="mvm-empty">Asking Massive for ${esc(ticker)}…</p>`;
      setStatus("busy", "Requesting snapshot…");

      const common = { asset, ticker };
      const wanted = [
        fetchMassive("ticker-details", common),
        fetchMassive("previous-day", common)
      ];
      if (asset === "stocks") wanted.push(fetchMassive("last-trade", common));
      const [details, prev, lastTrade] = await Promise.all(wanted);
      if (!details.ok && !prev.ok && (!wanted[2] || !wanted[2].ok)) {
        setStatus("refusal", refusalText(details.ok ? prev : details));
        panel.innerHTML = `<div class="mvm-rule refusal">${esc(refusalText(details.ok ? prev : details))}</div>`;
        return;
      }

      const requestId = (details.ok && details.data && details.data.request_id) ||
        (prev.ok && prev.data && prev.data.request_id) || null;
      const cached = details.cached && prev.cached;

      const detail = details.ok && details.data && details.data.results && !Array.isArray(details.data.results) ? details.data.results : null;
      const prevBar = prev.ok && prev.data && Array.isArray(prev.data.results) && prev.data.results.length ? prev.data.results[0] : null;
      const trade = lastTrade && lastTrade.ok && lastTrade.data && lastTrade.data.results && !Array.isArray(lastTrade.data.results) ? lastTrade.data.results : null;

      const rows = [];
      const row = (k, v) => { if (v !== null && v !== undefined && v !== "") rows.push(`<div class="k">${esc(k)}</div><div class="v">${v}</div>`); };
      if (detail) {
        row("Name", esc(detail.name || "—"));
        row("Ticker", esc(detail.ticker || ticker));
        row("Market", esc(detail.market || "—"));
        row("Type", esc(detail.type || "—"));
        row("Primary exchange", esc(detail.primary_exchange || "—"));
        row("Listed", esc(detail.list_date || "—"));
        row("Market cap", detail.market_cap != null ? `$${esc(compact(detail.market_cap))}` : null);
        row("Currency", esc((detail.currency_name || "").toUpperCase() || null));
        row("Employees", detail.total_employees != null ? esc(compact(detail.total_employees, 0)) : null);
        row("SIC", detail.sic_description ? esc(detail.sic_description) : null);
        row("CIK", detail.cik ? esc(detail.cik) : null);
      }
      if (prevBar) {
        const open = Number(prevBar.o), close = Number(prevBar.c);
        const change = Number.isFinite(open) && Number.isFinite(close) && open > 0 ? ((close - open) / open) * 100 : null;
        row("Previous open", esc(String(prevBar.o ?? "—")));
        row("Previous high", esc(String(prevBar.h ?? "—")));
        row("Previous low", esc(String(prevBar.l ?? "—")));
        row("Previous close", esc(String(prevBar.c ?? "—")));
        row("Bar date", prevBar.t != null ? esc(dateLabel(asset === "indices" || asset === "crypto" || asset === "forex" ? prevBar.t : prevBar.t)) : null);
        row("Session change", change === null ? null : `<span class="${change >= 0 ? "mvm-up" : "mvm-down"}">${change >= 0 ? "▲" : "▼"} ${Math.abs(change).toFixed(2)}%</span>`);
        if (prevBar.v != null) row("Volume", esc(compact(prevBar.v)));
      }
      if (trade) {
        row("Last trade price", trade.p != null ? esc(money(trade.p)) : null);
        row("Last trade size", trade.s != null ? esc(compact(trade.s, 0)) : null);
        row("Last trade time (SIP)", trade.t != null ? esc(timeLabel(Math.round(Number(trade.t) / 1e6))) : null);
      }

      const failures = [details, prev, lastTrade].filter(Boolean).filter(r => !r.ok);
      const failureNote = failures.length
        ? `<div class="mvm-rule refusal">${failures.map(r => esc(refusalText(r))).join("<br>")}</div>`
        : "";
      const homepage = detail && typeof detail.homepage_url === "string" && /^https:\/\/[A-Za-z0-9.-]+/.test(detail.homepage_url)
        ? `<p class="mvm-home"><a href="${esc(detail.homepage_url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(detail.homepage_url)}</a></p>`
        : "";
      const description = detail && typeof detail.description === "string" && detail.description.trim()
        ? `<p class="mvm-desc">${esc(detail.description.slice(0, 600))}${detail.description.length > 600 ? "…" : ""}</p>`
        : "";

      panel.innerHTML = `
        ${failureNote}
        <div class="kv mvm-kv">${rows.join("") || '<div class="k">Result</div><div class="v">Massive returned no data for this ticker.</div>'}</div>
        ${homepage}
        ${description}`;
      setStatus("ok", `Snapshot for ${ticker}.`, requestId, cached);
    }

    /* ── bars ── */
    const barTimespanSelect = $("#mvm-bar-timespan");
    const barRangeSelect = $("#mvm-bar-range");
    const barMultiplierInput = $("#mvm-bar-multiplier");

    function renderBarRanges() {
      const ranges = BAR_RANGES[state.barsTimespan] || BAR_RANGES.day;
      barRangeSelect.innerHTML = ranges.map(([label]) => `<option value="${label}">${label}</option>`).join("");
      // Set the value explicitly: some DOMs ignore the selected attribute on
      // freshly parsed options, and this keeps the default deterministic.
      barRangeSelect.value = ranges[Math.min(1, ranges.length - 1)][0];
      state.barsRange = barRangeSelect.value;
    }
    barTimespanSelect.addEventListener("change", () => {
      state.barsTimespan = barTimespanSelect.value;
      renderBarRanges();
    });
    barRangeSelect.addEventListener("change", () => { state.barsRange = barRangeSelect.value; });

    function drawBarChart(bars, ticker, timespan, multiplier) {
      const host = $("#mvm-bar-chart");
      const closes = bars.map(bar => Number(bar.c)).filter(Number.isFinite);
      if (closes.length < 2) {
        host.innerHTML = `<p class="mvm-empty">Massive returned fewer than two bars for this window.</p>`;
        return;
      }
      const W = 800, H = 240, PAD = 26;
      const min = Math.min(...closes), max = Math.max(...closes);
      const span = max - min || 1;
      const x = index => PAD + (index / (closes.length - 1)) * (W - PAD * 2);
      const y = value => H - PAD - ((value - min) / span) * (H - PAD * 2);
      const points = closes.map((value, index) => `${x(index).toFixed(2)},${y(value).toFixed(2)}`).join(" ");
      const area = `${PAD},${H - PAD} ${points} ${x(closes.length - 1).toFixed(2)},${H - PAD}`;
      const up = closes[closes.length - 1] >= closes[0];
      const stroke = up ? "var(--permit)" : "var(--refusal)";
      host.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Close prices for ${esc(ticker)}">
          <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="var(--line-hi)" stroke-width="1"/>
          <polygon points="${area}" fill="${up ? "rgba(92,230,168,0.10)" : "rgba(255,92,122,0.10)"}"/>
          <polyline points="${points}" fill="none" stroke="${stroke}" stroke-width="2"/>
          <text x="${PAD}" y="16" fill="var(--text-dim)" font-size="11">${esc(String(max))}</text>
          <text x="${PAD}" y="${H - PAD + 16}" fill="var(--text-dim)" font-size="11">${esc(String(min))}</text>
          <text x="${PAD}" y="${H - 6}" fill="var(--text-faint)" font-size="11">${esc(dateLabel(bars[0].t))}</text>
          <text x="${W - PAD}" y="${H - 6}" fill="var(--text-faint)" font-size="11" text-anchor="end">${esc(dateLabel(bars[bars.length - 1].t))}</text>
        </svg>
        <p class="mvm-chart-note">${esc(ticker)} · ${multiplier}×${timespan} closes · ${bars.length} bars · source: Massive aggregates</p>`;
    }

    async function loadBars() {
      const asset = assetSelect.value;
      const ticker = currentTicker();
      if (!validTicker(asset, ticker)) {
        setStatus("refusal", `Enter a ${ASSETS[asset].label} ticker in Massive format, for example ${ASSETS[asset].example}.`);
        return;
      }
      const timespan = barTimespanSelect.value;
      const multiplier = Math.max(1, Math.min(100, Math.round(Number(barMultiplierInput.value) || 1)));
      barMultiplierInput.value = String(multiplier);
      const ranges = BAR_RANGES[timespan] || BAR_RANGES.day;
      const found = ranges.find(([label]) => label === barRangeSelect.value) || ranges[ranges.length - 1];
      const days = found[1];
      const from = isoDaysAgo(days);
      const to = todayIso();
      const statsEl = $("#mvm-bar-stats");
      const tableEl = $("#mvm-bar-table");
      $("#mvm-bar-chart").innerHTML = `<p class="mvm-empty">Asking Massive for ${esc(ticker)} bars…</p>`;
      statsEl.innerHTML = "";
      tableEl.innerHTML = "";
      setStatus("busy", "Requesting bars…");

      const result = await fetchMassive("bars", { asset, ticker, multiplier, timespan, from, to, sort: "asc", limit: 5000 });
      if (!result.ok) {
        setStatus("refusal", refusalText(result));
        $("#mvm-bar-chart").innerHTML = `<div class="mvm-rule refusal">${esc(refusalText(result))}</div>`;
        return;
      }
      const bars = Array.isArray(result.data.results) ? result.data.results : [];
      if (!bars.length) {
        setStatus("ok", "Massive returned no bars for this window.", result.data.request_id || null, result.cached);
        $("#mvm-bar-chart").innerHTML = `<p class="mvm-empty">No bars in this window (empty intervals mean no qualifying trades).</p>`;
        return;
      }
      const closes = bars.map(bar => Number(bar.c)).filter(Number.isFinite);
      const volumes = bars.map(bar => Number(bar.v)).filter(Number.isFinite);
      const first = Number(closes[0]), last = Number(closes[closes.length - 1]);
      const change = first > 0 ? ((last - first) / first) * 100 : null;
      statsEl.innerHTML = `
        <div class="mvm-stat"><span>Bars</span><strong>${bars.length}</strong></div>
        <div class="mvm-stat"><span>First close</span><strong>${esc(String(closes[0]))}</strong></div>
        <div class="mvm-stat"><span>Last close</span><strong>${esc(String(closes[closes.length - 1]))}</strong></div>
        <div class="mvm-stat"><span>Window</span><strong class="${change === null ? "" : change >= 0 ? "mvm-up" : "mvm-down"}">${change === null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}</strong></div>
        <div class="mvm-stat"><span>Low / high</span><strong>${esc(String(Math.min(...closes)))} / ${esc(String(Math.max(...closes)))}</strong></div>
        ${volumes.length ? `<div class="mvm-stat"><span>Total volume</span><strong>${esc(compact(volumes.reduce((a, b) => a + b, 0)))}</strong></div>` : ""}`;
      drawBarChart(bars, ticker, timespan, multiplier);
      const recent = bars.slice(-10).reverse();
      tableEl.innerHTML = `
        <table>
          <thead><tr><th>Window start (UTC)</th><th>Open</th><th>High</th><th>Low</th><th>Close</th><th>Volume</th><th>VWAP</th></tr></thead>
          <tbody>
            ${recent.map(bar => `<tr>
              <td>${esc(timeLabel(bar.t))}</td>
              <td>${esc(String(bar.o ?? "—"))}</td><td>${esc(String(bar.h ?? "—"))}</td>
              <td>${esc(String(bar.l ?? "—"))}</td><td>${esc(String(bar.c ?? "—"))}</td>
              <td>${bar.v != null ? esc(compact(bar.v)) : "—"}</td><td>${bar.vw != null ? esc(String(bar.vw)) : "—"}</td>
            </tr>`).join("")}
          </tbody>
        </table>
        <p class="mvm-chart-note">Last ${recent.length} of ${bars.length} bars · Massive field names (o, h, l, c, v, vw, t).</p>`;
      setStatus("ok", `${bars.length} bars for ${ticker} (${multiplier}×${timespan}, ${from} → ${to}).`, result.data.request_id || null, result.cached);
    }

    /* ── dividends ── */
    async function loadDividends() {
      const asset = assetSelect.value;
      const ticker = currentTicker();
      const host = $("#mvm-div-table");
      if (asset !== "stocks") {
        host.innerHTML = `<div class="mvm-rule refusal">Dividends are available for U.S. stocks only. Switch the asset class to U.S. stocks.</div>`;
        setStatus("refusal", "Dividends are wired for U.S. stocks only.");
        return;
      }
      if (!validTicker("stocks", ticker)) {
        setStatus("refusal", `Enter a U.S. stock ticker, for example ${ASSETS.stocks.example}.`);
        return;
      }
      const limit = Number($("#mvm-div-limit").value) || 25;
      host.innerHTML = `<p class="mvm-empty">Asking Massive for ${esc(ticker)} dividends…</p>`;
      setStatus("busy", "Requesting dividends…");
      const result = await fetchMassive("dividends", { ticker, limit });
      if (!result.ok) {
        setStatus("refusal", refusalText(result));
        host.innerHTML = `<div class="mvm-rule refusal">${esc(refusalText(result))}</div>`;
        return;
      }
      const rows = Array.isArray(result.data.results) ? result.data.results : [];
      if (!rows.length) {
        host.innerHTML = `<p class="mvm-empty">Massive has no dividend records for ${esc(ticker)}.</p>`;
        setStatus("ok", `No dividend records for ${ticker}.`, result.data.request_id || null, result.cached);
        return;
      }
      host.innerHTML = `
        <table>
          <thead><tr><th>Ex-dividend</th><th>Declaration</th><th>Record</th><th>Pay date</th><th>Amount</th><th>Currency</th><th>Frequency / yr</th><th>Type</th></tr></thead>
          <tbody>
            ${rows.map(div => `<tr>
              <td>${esc(div.ex_dividend_date || "—")}</td>
              <td>${esc(div.declaration_date || "—")}</td>
              <td>${esc(div.record_date || "—")}</td>
              <td>${esc(div.pay_date || "—")}</td>
              <td>${div.cash_amount != null ? esc(String(div.cash_amount)) : "—"}</td>
              <td>${esc(div.currency || "—")}</td>
              <td>${div.frequency != null ? esc(String(div.frequency)) : "—"}</td>
              <td>${esc(div.distribution_type || "—")}</td>
            </tr>`).join("")}
          </tbody>
        </table>
        <p class="mvm-chart-note">${rows.length} record${rows.length === 1 ? "" : "s"} · newest ex-dividend date first · Massive /stocks/v1/dividends</p>`;
      setStatus("ok", `${rows.length} dividend record${rows.length === 1 ? "" : "s"} for ${ticker}.`, result.data.request_id || null, result.cached);
    }

    /* ── conversion ── */
    async function loadConversion() {
      const from = $("#mvm-fx-from").value.trim().toUpperCase();
      const to = $("#mvm-fx-to").value.trim().toUpperCase();
      const amount = $("#mvm-fx-amount").value.trim();
      const precision = $("#mvm-fx-precision").value;
      $("#mvm-fx-from").value = from;
      $("#mvm-fx-to").value = to;
      const host = $("#mvm-fx-result");
      if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
        setStatus("refusal", "Enter both currencies as three-letter codes, for example USD and EUR.");
        return;
      }
      if (from === to) {
        setStatus("refusal", "Choose two different currencies to convert between.");
        return;
      }
      host.innerHTML = `<p class="mvm-empty">Asking Massive for the ${esc(from)}/${esc(to)} rate…</p>`;
      setStatus("busy", "Requesting conversion…");
      const result = await fetchMassive("conversion", { from, to, amount: amount || "1", precision });
      if (!result.ok) {
        setStatus("refusal", refusalText(result));
        host.innerHTML = `<div class="mvm-rule refusal">${esc(refusalText(result))}</div>`;
        return;
      }
      const data = result.data || {};
      const last = data.last && typeof data.last === "object" ? data.last : {};
      host.innerHTML = `
        <div class="kv mvm-kv">
          <div class="k">Converted</div><div class="v mvm-fx-converted">${data.converted != null ? esc(String(data.converted)) : "—"} <span class="mvm-fx-unit">${esc(to)}</span></div>
          <div class="k">Input</div><div class="v">${data.initialAmount != null ? esc(String(data.initialAmount)) : esc(amount || "1")} ${esc(from)}</div>
          <div class="k">Bid</div><div class="v">${last.bid != null ? esc(String(last.bid)) : "—"}</div>
          <div class="k">Ask</div><div class="v">${last.ask != null ? esc(String(last.ask)) : "—"}</div>
          <div class="k">Quote time</div><div class="v">${last.timestamp != null ? esc(timeLabel(last.timestamp)) : "—"}</div>
          <div class="k">Symbol</div><div class="v mono">${esc(data.symbol || `${from}/${to}`)}</div>
        </div>
        <p class="mvm-chart-note">Real-time indicative rate via Massive /v1/conversion. Display only — not an executable quote.</p>`;
      setStatus("ok", `${from} → ${to} conversion.`, data.request_id || null, result.cached);
    }

    $("#mvm-load").addEventListener("click", () => { switchTab("snapshot"); loadSnapshot(); });
    $("#mvm-bar-draw").addEventListener("click", loadBars);
    $("#mvm-div-draw").addEventListener("click", loadDividends);
    $("#mvm-fx-draw").addEventListener("click", loadConversion);
    tickerInput.addEventListener("keydown", event => {
      if (event.key === "Enter") { switchTab("snapshot"); loadSnapshot(); }
    });

    renderBarRanges();
    renderChips();
    switchTab("snapshot");
    // Explicit defaults: freshly parsed option lists must not depend on the
    // selected attribute alone.
    assetSelect.value = state.asset;
    barTimespanSelect.value = state.barsTimespan;
    $("#mvm-fx-precision").value = "2";
  }

  window.HOSMassive = Object.freeze({ renderApp, ASSETS, BAR_TIMESPANS });

  APPS.push({
    id: "massive",
    title: "Massive Markets",
    short: "Markets",
    glyph: "📈",
    desc: "Read-only market data via the Massive REST API (Worker-proxied key, display-only)",
    w: 1080,
    h: 780,
    render(body) {
      if (window.HOSMassive) {
        window.HOSMassive.renderApp(body);
        return;
      }
      body.innerHTML = '<div class="rule-box refusal">The Massive Markets module did not load. No market request was sent and no state has changed.</div>';
    }
  });
})();
