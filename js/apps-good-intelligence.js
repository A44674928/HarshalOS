/* HarshalOS — Good Intelligence read-only signal desk.
   Uses the Sentinel REST contract through the GET-only client. */
"use strict";

(() => {
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
  const shortenAddress = value => {
    const address = String(value || "");
    return address.length > 18 ? `${address.slice(0, 8)}…${address.slice(-6)}` : address || "Unknown provider";
  };
  const formatDate = value => {
    if (!value) return "Date not supplied";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };
  const formatCount = value => Number.isFinite(Number(value)) ? Number(value).toLocaleString() : "—";
  const errorMessage = error => {
    if (!error) return "";
    if (error.kind === "auth") return "This feed requires a Good Intelligence session. Wallet sign-in is not part of this read-only first release.";
    if (error.kind === "route") return "The configured API does not expose this route. Check the selected Good Intelligence API version.";
    if (error.kind === "network") return "The browser could not reach the API. This can be a network or CORS configuration issue; a same-origin proxy may be needed.";
    if (error.kind === "cancelled") return "The request was cancelled or timed out. Try refreshing.";
    return error.message || "The API request failed.";
  };

  // Search is local to the configured read-only watchlist. Typed text is
  // never interpolated into an upstream ticker path or used as a URL.
  const TICKERBOT_WATCHLIST = Object.freeze([
    { symbol: "AAPL", name: "Apple" },
    { symbol: "MSFT", name: "Microsoft" },
    { symbol: "NVDA", name: "NVIDIA" }
  ]);
  const marketMatches = (query, ...fields) => fields.join(" ").toLowerCase().includes(String(query || "").trim().toLowerCase());
  const companyFor = symbol => TICKERBOT_WATCHLIST.find(item => item.symbol === String(symbol || "").replace(/-DEMO$/, ""))?.name || "";

  APPS.push({
    id: "good-intelligence",
    title: "Good Intelligence",
    short: "Good Intelligence",
    glyph: "∅",
    desc: "Read-only intel feed, network rankings, and synthetic-safe Market Charts from the Good Intelligence API",
    w: 1160,
    h: 760,
    render(body, api) {
      const Client = window.GoodIntelligenceClient;
      const Assurance = window.GoodIntelligenceAssurance;
      const MarketContext = window.GoodIntelligenceMarketContext;
      const Verifier = window.GoodIntelligenceVerifier;
      if (!Client || !Assurance || !MarketContext || !Verifier) {
        body.innerHTML = `<div class="h1">Good Intelligence</div><div class="rule-box refusal">The read-only API, assurance, market-context, and signature-verification modules are not loaded. Check their script order in index.html.</div>`;
        return;
      }

      const state = {
        view: "feed",
        apiBase: Client.getApiBase(),
        ground0Audits: Assurance.readLocalGround0Audits(),
        query: "",
        category: "All categories",
        loading: false,
        feed: [],
        sourceVerifications: {},
        categories: [],
        rankings: [],
        errors: { feed: null, categories: null, rankings: null },
        selectedId: "",
        selectedMarketId: "",
        marketProvider: "demo",
        marketQuery: "",
        marketInterval: "1h",
        marketRequestId: 0,
        marketRequestKey: "",
        marketResultKey: "",
        marketResult: null,
        marketErrorKey: "",
        marketError: "",
        updatedAt: "",
        settingsError: "",
        controller: null,
        requestId: 0
      };

      body.innerHTML = `
        <div class="gi-app">
          <header class="gi-header">
            <div class="gi-brand">
              <div class="gi-mark" aria-hidden="true">∅</div>
              <div>
                <div class="gi-kicker">EMPTY.DOMAINS <span>/</span> GOOD INTELLIGENCE</div>
                <h1>Signal desk</h1>
              </div>
            </div>
            <div class="gi-demo-badge" data-gi-demo-mode role="note" hidden>EMPTY.DOMAINS DEMO API · SYNTHETIC FIXTURES · NOT LIVE INTELLIGENCE</div>
            <div class="gi-header-tools">
              <div class="gi-connection" data-gi-connection role="status"><span class="gi-connection-dot"></span><span data-gi-connection-label>CONNECTING</span></div>
              <button class="gi-button gi-button-primary" type="button" data-gi-refresh><span aria-hidden="true">↻</span> Refresh</button>
            </div>
          </header>

          <div class="gi-boundary" role="note">
            <span class="gi-boundary-mark" aria-hidden="true">◌</span>
            <span><strong>READ-ONLY VIEW</strong> · No posts, payments, token approvals, or transactions are sent from this app.</span>
            <span class="gi-boundary-session" data-gi-session-note>Member feed may require a GI session.</span>
          </div>

          <div class="gi-workspace">
            <main class="gi-main">
              <div class="gi-main-heading">
                <div>
                  <p class="gi-eyebrow">NETWORK INTELLIGENCE</p>
                  <h2 data-gi-view-title>Member intel feed</h2>
                  <p class="gi-muted" data-gi-view-description>Signals returned by the configured Good Intelligence API; assurance is assessed separately.</p>
                </div>
                <nav class="gi-tabs" aria-label="Good Intelligence views">
                  <button type="button" class="gi-tab active" data-gi-view="feed" aria-pressed="true">Intel feed</button>
                  <button type="button" class="gi-tab" data-gi-view="rankings" aria-pressed="false">Rankings</button>
                  <button type="button" class="gi-tab" data-gi-view="markets" aria-pressed="false">Market Charts</button>
                </nav>
              </div>

              <section class="gi-feed-panel" data-gi-feed-panel aria-label="Intel feed">
                <div class="gi-feed-tools">
                  <label class="gi-search">
                    <span class="gi-sr-only">Search intel</span>
                    <span class="gi-search-icon" aria-hidden="true">⌕</span>
                    <input type="search" autocomplete="off" placeholder="Search intel, category, or provider" data-gi-search>
                  </label>
                  <label class="gi-category-select">
                    <span class="gi-sr-only">Filter by category</span>
                    <select data-gi-category><option>All categories</option></select>
                  </label>
                  <span class="gi-result-count" data-gi-feed-count>— items</span>
                </div>
                <div class="gi-feed-list" data-gi-feed-list aria-live="polite"></div>
                <div class="gi-detail" data-gi-detail hidden></div>
              </section>

              <section class="gi-rankings-panel" data-gi-rankings-panel aria-label="Network rankings" hidden>
                <div class="gi-ranking-heading">
                  <div><p class="gi-eyebrow">PUBLIC NETWORK VIEW</p><h3>Member rankings</h3></div>
                  <span class="gi-ranking-note">Rank data supplied by the API</span>
                </div>
                <div class="gi-table-scroll" role="region" aria-label="Member rankings table" tabindex="0">
                  <table class="gi-table">
                    <thead><tr><th scope="col">Rank</th><th scope="col">Address</th><th scope="col">Score</th><th scope="col">Tokens</th></tr></thead>
                    <tbody data-gi-ranking-rows></tbody>
                  </table>
                </div>
                <div class="gi-empty gi-panel-message" data-gi-ranking-message></div>
              </section>

              <section class="gi-market-charts-panel" data-gi-markets-panel aria-label="Market ticker charts" hidden>
                <div class="gi-chart-toolbar">
                  <div><p class="gi-eyebrow">PRICE / VOLUME VISUALIZATION</p><h3>Market Charts</h3><p>VFI + Fibonacci Bands with WaveTrend context</p></div>
                  <div class="gi-chart-controls">
                    <label class="gi-chart-control"><span>DATA SOURCE</span><select data-gi-market-provider aria-label="Select market data source"><option value="demo">Synthetic demo</option><option value="tickerbot">Tickerbot Live</option></select></label>
                    <label class="gi-chart-control"><span>SELECT TICKER</span><select data-gi-market-select aria-label="Select market ticker"></select></label>
                    <label class="gi-chart-control"><span>BAR INTERVAL</span><select data-gi-market-interval aria-label="Select bar interval"><option value="1h">1 hour</option><option value="1d">1 day</option></select></label>
                  </div>
                </div>
                <div class="gi-market-search-tools">
                  <label class="gi-search">
                    <span class="gi-sr-only">Search tracked tickers by symbol or company</span>
                    <span class="gi-search-icon" aria-hidden="true">⌕</span>
                    <input type="search" autocomplete="off" spellcheck="false" maxlength="80" placeholder="Search ticker or company…" data-gi-market-search>
                  </label>
                  <button class="gi-button" type="button" data-gi-market-clear aria-label="Clear ticker search">Clear</button>
                  <span class="gi-result-count" data-gi-market-count role="status" aria-live="polite"></span>
                </div>
                <p class="gi-market-search-help" data-gi-market-search-help></p>
                <div data-gi-market-chart-host aria-live="polite"></div>
              </section>

              <footer class="gi-footer">
                <span>API data is shown as received; missing fields are not inferred.</span>
                <span>Information only · independently verify time-sensitive claims.</span>
              </footer>
            </main>

            <aside class="gi-rail" aria-label="Network overview and connection">
              <section class="gi-rail-card gi-network-card">
                <div class="gi-rail-heading"><div><p class="gi-eyebrow">NETWORK SNAPSHOT</p><h3>Top members</h3></div><button class="gi-text-button" type="button" data-gi-open-rankings>View all <span aria-hidden="true">↗</span></button></div>
                <div class="gi-mini-rankings" data-gi-mini-rankings></div>
                <div class="gi-mini-foot"><span>Public ranking endpoint</span><span class="gi-live-label" data-gi-rank-state>WAITING</span></div>
              </section>

              <section class="gi-rail-card gi-service-card">
                <p class="gi-eyebrow">SERVICE CONNECTION</p>
                <div class="gi-service-origin" data-gi-api-host></div>
                <div class="gi-service-grid">
                  <div><span>FEED</span><strong data-gi-feed-state>—</strong></div>
                  <div><span>CATEGORIES</span><strong data-gi-categories-state>—</strong></div>
                  <div><span>RANKINGS</span><strong data-gi-rank-status>—</strong></div>
                </div>
                <p class="gi-service-time" data-gi-updated>Waiting for the first refresh.</p>
              </section>

              <section class="gi-rail-card gi-assurance-summary" data-gi-assurance-summary aria-label="Assurance coverage">
                <p class="gi-eyebrow">ASSURANCE COVERAGE</p>
                <div class="gi-assurance-summary-value" data-gi-assessed-count>0 scored</div>
                <p data-gi-assurance-summary-note>Scores require phase, legitimacy, provenance, freshness, corroboration, conflict review, and decision scope evidence.</p>
              </section>

              <section class="gi-rail-card gi-principle-card">
                <span class="gi-principle-icon" aria-hidden="true">◎</span>
                <p class="gi-eyebrow">SIGNAL, NOT AUTHORITY</p>
                <p>Good Intelligence data is presented for review. This HarshalOS view does not certify claims or authorize financial action.</p>
              </section>
            </aside>
          </div>

          <details class="gi-settings">
            <summary><span class="gi-settings-icon" aria-hidden="true">⚙</span><span><strong>Connection settings</strong><small>Use the empty.domains demo API or configure another same-origin/HTTPS API.</small></span><span class="gi-settings-chevron" aria-hidden="true">＋</span></summary>
            <div class="gi-settings-content">
              <label for="gi-api-base">Good Intelligence API base URL</label>
              <div class="gi-settings-row"><input id="gi-api-base" type="url" spellcheck="false" autocomplete="url" data-gi-api-input><button class="gi-button" type="button" data-gi-save-api>Save endpoint</button></div>
              <p class="gi-settings-help">Default: the same-origin empty.domains demo API with synthetic fixtures. To try the referenced live API, manually enter https://api.goodintelligence.ai/v1; it is never selected automatically, and availability depends on API CORS and session policy. This app does not proxy or hide credentials.</p>
              <p class="gi-settings-error" data-gi-settings-error role="alert"></p>
            </div>
          </details>
        </div>`;

      const $ = selector => body.querySelector(selector);
      const connection = $("[data-gi-connection]");
      const connectionLabel = $("[data-gi-connection-label]");
      const feedList = $("[data-gi-feed-list]");
      const detailHost = $("[data-gi-detail]");
      const feedCount = $("[data-gi-feed-count]");
      const marketSelect = $("[data-gi-market-select]");
      const marketSearch = $("[data-gi-market-search]");
      const marketClear = $("[data-gi-market-clear]");
      const marketCount = $("[data-gi-market-count]");
      const marketSearchHelp = $("[data-gi-market-search-help]");
      const marketProviderSelect = $("[data-gi-market-provider]");
      const marketIntervalSelect = $("[data-gi-market-interval]");
      const marketChartHost = $("[data-gi-market-chart-host]");
      const categorySelect = $("[data-gi-category]");
      const searchInput = $("[data-gi-search]");
      const apiInput = $("[data-gi-api-input]");
      const settingsError = $("[data-gi-settings-error]");

      function assessmentFor(item) {
        const match = Assurance.matchLocalGround0Audit(item, state.ground0Audits);
        const sourceVerification = state.sourceVerifications[item.id] || null;
        return {
          match,
          sourceVerification,
          result: Assurance.evaluate(item.assurance, match.audit, item, Date.now(), sourceVerification)
        };
      }

      function factorRows(group) {
        return group.factors.map(item => `
          <div class="gi-assurance-factor ${item.score === null ? "unknown" : item.score === 0 ? "blocked" : ""}">
            <span>${escapeHtml(item.label)}</span>
            <strong>${item.score === null ? "UNKNOWN" : `${item.score}/100`}</strong>
            <small>${item.weight}% weight · ${escapeHtml(item.detail)}</small>
          </div>`).join("");
      }

      function assurancePanel(item) {
        const { match, result, sourceVerification } = assessmentFor(item);
        const scoreLabel = result.score === null ? "NOT SCORED" : `${result.score}<small>/100</small>`;
        const phase = item.assurance && item.assurance.source.ground0;
        const phaseLabel = phase && phase.phase
          ? `${phase.phase} · ${phase.badgeStatus || phase.status}`
          : match.audit ? `${match.audit.phase} · ${match.audit.badge} · local ${match.audit.version}`
            : match.match === "ambiguous" ? "Ambiguous local audit match" : "No matching phase assessment";
        const phaseOrigin = phase && phase.phase ? "Assurance packet · API-reported" : match.audit ? "Local Ground-0 record · not independently anchored" : "No source-level Ground-0 assessment";
        const blockers = result.blockers.length
          ? `<ul class="gi-assurance-blockers">${result.blockers.map(note => `<li>${escapeHtml(note)}</li>`).join("")}</ul>`
          : "";
        const verificationLabel = !sourceVerification ? "VERIFICATION PENDING"
          : sourceVerification.verified ? "DEMO SIGNATURE VERIFIED · TEST ROOT ONLY"
            : sourceVerification.status === "missing" ? "NO SIGNED ATTESTATION · API-REPORTED"
              : sourceVerification.status === "untrusted" ? "UNRECOGNIZED KEY · NO TRUST ROOT CONFIGURED" : "SIGNATURE NOT VERIFIED";
        const verificationNote = sourceVerification && sourceVerification.verified
          ? "Cryptographic integrity only. This local demo key is not a production authorization registry."
          : sourceVerification ? sourceVerification.reason : "The signature check has not completed.";
        return `
          <section class="gi-assurance-panel" aria-label="Good Intelligence assurance assessment">
            <div class="gi-assurance-head">
              <div><p class="gi-eyebrow">CAPSTONE · ${escapeHtml(result.modelVersion)}</p><h4>Assurance index</h4></div>
              <div class="gi-assurance-score ${result.score === null ? "unscored" : ""}"><strong>${scoreLabel}</strong><small>${escapeHtml(result.grade)}</small></div>
            </div>
            <p class="gi-assurance-coverage">${result.score === null ? `${result.coverage}% weighted input coverage · score withheld until all dimensions are supplied.` : `Source ${result.source.score}/100 · claim evidence ${result.signal.score}/100 · ${result.coverage}% coverage.`}</p>
            <div class="gi-assurance-dimensions">
              <div><span>SOURCE PHASE</span><strong>${escapeHtml(phaseLabel)}</strong><small>${escapeHtml(phaseOrigin)}</small></div>
              <div><span>ACTIONABILITY</span><strong>${escapeHtml(result.actionability)}</strong><small>Never an automatic permission to act.</small></div>
            </div>
            <div class="gi-source-verification" role="note"><span>LOCAL SIGNATURE CHECK</span><strong>${escapeHtml(verificationLabel)}</strong><small>${escapeHtml(verificationNote)}</small></div>
            ${blockers}
            <details class="gi-assurance-breakdown">
              <summary>Inspect weighted inputs</summary>
              <h5>Source assurance · 40% of composite</h5><div class="gi-assurance-factor-list">${factorRows(result.source)}</div>
              <h5>Claim evidence · 60% of composite</h5><div class="gi-assurance-factor-list">${factorRows(result.signal)}</div>
            </details>
            <p class="gi-assurance-caveat">${escapeHtml(result.caveat)}</p>
          </section>`;
      }

      function formatMetric(value) {
        return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—";
      }

      function marketContextPanel(item) {
        if (!item.marketContext) return "";
        const result = MarketContext.evaluate(item.marketContext);
        if (!result) return "";
        if (result.status === "no-data") return `
          <section class="gi-market-context" aria-label="Technical market context">
            <div class="gi-market-head"><div><p class="gi-eyebrow">PRICE/VOLUME CONTEXT · NOT ASSURANCE</p><h4>VFI + Fibonacci Bands + WaveTrend</h4></div><span class="gi-market-state">NO OHLCV DATA</span></div>
            <p class="gi-market-disclaimer">${escapeHtml(result.note)}</p>
          </section>`;
        const badge = result.synthetic
          ? "SYNTHETIC MARKET DATA · NOT LIVE"
          : "API-SUPPLIED OHLCV · NOT INDEPENDENTLY VERIFIED";
        const readiness = result.signals && result.signals.barClosePending ? "WAITING FOR BAR CLOSE"
          : result.status === "ready" ? "INDICATORS READY" : result.status === "no-data" ? "NO OHLCV DATA" : "INDICATORS WARMING UP";
        const bands = result.bands ? `
          <div class="gi-market-band-table" role="table" aria-label="Fibonacci band levels">
            <div role="row"><span role="columnheader">LEVEL</span><span role="columnheader">UPPER</span><span role="columnheader">LOWER</span></div>
            <div role="row"><span>0.382</span><span>${formatMetric(result.bands.upper382)}</span><span>${formatMetric(result.bands.lower382)}</span></div>
            <div role="row"><span>0.618</span><span>${formatMetric(result.bands.upper618)}</span><span>${formatMetric(result.bands.lower618)}</span></div>
            <div role="row"><span>0.764</span><span>${formatMetric(result.bands.upper764)}</span><span>${formatMetric(result.bands.lower764)}</span></div>
            <div role="row"><span>1.000</span><span>${formatMetric(result.bands.upper1000)}</span><span>${formatMetric(result.bands.lower1000)}</span></div>
          </div>` : "";
        const alerts = result.alerts.length
          ? `<ul class="gi-market-alerts">${result.alerts.map(alert => `<li>${escapeHtml(alert)}</li>`).join("")}</ul>`
          : `<p class="gi-market-no-signal">No confirmed indicator conditions on the latest bar.</p>`;
        const divergences = result.recentDivergences.length
          ? `<p class="gi-market-divergence">Recent WaveTrend pivots: ${result.recentDivergences.slice(-3).map(event => `${escapeHtml(event.type)} · ${escapeHtml(formatDate(event.time))}`).join("; ")}</p>`
          : "";
        return `
          <section class="gi-market-context" aria-label="Technical market context">
            <div class="gi-market-head"><div><p class="gi-eyebrow">PRICE/VOLUME CONTEXT · NOT ASSURANCE</p><h4>VFI + Fibonacci Bands + WaveTrend</h4></div><span class="gi-market-state">${escapeHtml(readiness)}</span></div>
            <div class="gi-market-source"><strong>${escapeHtml(badge)}</strong><span>${escapeHtml(result.symbol || "Unlabeled symbol")} · ${escapeHtml(result.timeframe || "Unlabeled interval")} · ${formatMetric(result.barCount)} bars</span><small>${escapeHtml(result.source || "Data source not supplied")}</small></div>
            <div class="gi-market-metrics">
              <div><span>VFI / SIGNAL</span><strong>${formatMetric(result.vfi.value)} / ${formatMetric(result.vfi.signal)}</strong><small>${result.vfi.ready ? result.vfi.value >= result.vfi.signal ? "Flow above signal" : "Flow below signal" : "VFI history is warming up"}</small></div>
              <div><span>FBB BASIS / OUTER BANDS</span><strong>${formatMetric(result.bands && result.bands.basis)}</strong><small>Close ${formatMetric(result.close)} · Upper ${formatMetric(result.bands && result.bands.upper1000)} · Lower ${formatMetric(result.bands && result.bands.lower1000)}</small></div>
              <div><span>WAVETREND WT1 / WT2</span><strong>${formatMetric(result.waveTrend.wt1)} / ${formatMetric(result.waveTrend.wt2)}</strong><small>${escapeHtml(result.waveTrend.zone)} · ${escapeHtml(result.waveTrend.timeframeStatus)}</small></div>
            </div>
            ${bands}
            <div class="gi-market-confluence"><span>COMBINED CONTEXT</span><strong>${escapeHtml(result.combined)}</strong></div>
            ${alerts}${divergences}
            <p class="gi-market-disclaimer">${escapeHtml(result.note)}</p>
          </section>`;
      }

      function chartLine(series, field, xAt, yAt, color, width = 1.8, dash = "") {
        let path = "", active = false;
        series.forEach((row, index) => {
          const value = row[field];
          if (!Number.isFinite(value)) { active = false; return; }
          path += `${active ? " L" : " M"}${xAt(index).toFixed(2)} ${yAt(value).toFixed(2)}`;
          active = true;
        });
        return path ? `<path d="${path}" fill="none" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""} vector-effect="non-scaling-stroke"/>` : "";
      }

      function chartArea(series, topField, bottomField, xAt, yAt, color) {
        const segments = [];
        let segment = [];
        const flush = () => {
          if (segment.length > 1) {
            const upper = segment.map(point => `${point.x.toFixed(2)} ${yAt(point.top).toFixed(2)}`).join(" L");
            const lower = segment.slice().reverse().map(point => `${point.x.toFixed(2)} ${yAt(point.bottom).toFixed(2)}`).join(" L");
            segments.push(`<path d="M${upper} L${lower} Z" fill="${color}"/>`);
          }
          segment = [];
        };
        series.forEach((row, index) => {
          if (!Number.isFinite(row[topField]) || !Number.isFinite(row[bottomField])) { flush(); return; }
          segment.push({ x: xAt(index), top: row[topField], bottom: row[bottomField] });
        });
        flush();
        return segments.join("");
      }

      function lineChartSvg(title, series, options = {}) {
        if (!series || series.length < 2) return `<div class="gi-chart-empty">Not enough bars to draw this chart.</div>`;
        const width = 960, height = options.height || 280;
        const margin = { left: 68, right: 16, top: 14, bottom: 30 };
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;
        const fields = [...(options.lines || []).map(line => line.field), ...(options.areas || []).flatMap(area => [area.topField, area.bottomField])];
        const seriesValues = series.flatMap(row => fields.map(field => row[field])).filter(Number.isFinite);
        if (!seriesValues.length) return `<div class="gi-chart-empty">Indicator history is warming up; no plottable values are available yet.</div>`;
        const values = seriesValues.concat((options.levels || []).map(level => level.value).filter(Number.isFinite));
        let min = Math.min(...values), max = Math.max(...values);
        const padding = (max - min) * 0.08 || Math.max(Math.abs(max) * 0.02, 1);
        min -= padding; max += padding;
        const xAt = index => margin.left + (index / (series.length - 1)) * plotWidth;
        const yAt = value => margin.top + ((max - value) / (max - min)) * plotHeight;
        const horizontalBands = (options.bands || []).map(band => {
          const y1 = yAt(band.topValue), y2 = yAt(band.bottomValue);
          return `<rect x="${margin.left}" y="${Math.min(y1, y2)}" width="${plotWidth}" height="${Math.max(1, Math.abs(y2 - y1))}" fill="${band.color}"/>`;
        }).join("");
        const grid = Array.from({ length: 5 }, (_, index) => {
          const value = max - ((max - min) * index / 4);
          const y = yAt(value);
          return `<g><line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="rgba(148,166,192,.14)" stroke-width="1"/><text x="${margin.left - 8}" y="${y + 3}" text-anchor="end" fill="#8293aa" font-size="10">${escapeHtml(formatMetric(value))}</text></g>`;
        }).join("");
        const levels = (options.levels || []).map(level => {
          const y = yAt(level.value);
          return `<g><line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="${level.color || "rgba(148,166,192,.35)"}" stroke-width="1"${level.dash ? ` stroke-dasharray="${level.dash}"` : ""}/>${level.label ? `<text x="${width - margin.right - 3}" y="${y - 3}" text-anchor="end" fill="${level.color || "#8293aa"}" font-size="9">${escapeHtml(level.label)}</text>` : ""}</g>`;
        }).join("");
        const areas = (options.areas || []).map(area => chartArea(series, area.topField, area.bottomField, xAt, yAt, area.color)).join("");
        const lines = (options.lines || []).map(line => chartLine(series, line.field, xAt, yAt, line.color, line.width, line.dash)).join("");
        const marker = options.marker && Number.isFinite(series[series.length - 1][options.marker.field])
          ? `<path d="M${xAt(series.length - 1)} ${yAt(series[series.length - 1][options.marker.field]) - 7} l7 7 -7 7 -7 -7 z" fill="${options.marker.color}" stroke="#08101b" stroke-width="1.5"><title>${escapeHtml(options.marker.label)}</title></path>` : "";
        const startLabel = formatDate(series[0].time), endLabel = formatDate(series[series.length - 1].time);
        return `<svg class="gi-market-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)} line chart" preserveAspectRatio="none"><title>${escapeHtml(title)}</title>${horizontalBands}${grid}${areas}${levels}${lines}${marker}<text x="${margin.left}" y="${height - 7}" fill="#8293aa" font-size="9">${escapeHtml(startLabel)}</text><text x="${width - margin.right}" y="${height - 7}" text-anchor="end" fill="#8293aa" font-size="9">${escapeHtml(endLabel)}</text></svg>`;
      }

      function chartLegend(lines) {
        return `<div class="gi-chart-legend">${lines.map(line => `<span><i style="--legend-color:${line.color}"></i>${escapeHtml(line.label)}</span>`).join("")}</div>`;
      }

      function marketChartsMarkup(item, result) {
        const series = result.chartSeries || [];
        const bullish = result.signals.bullishConfluence;
        const bearish = result.signals.bearishConfluence;
        const priceMarker = bullish ? { field: "close", color: "#54d6b4", label: "Bullish VFI and Fibonacci confluence" }
          : bearish ? { field: "close", color: "#e87487", label: "Bearish VFI and Fibonacci confluence" } : null;
        const priceSvg = lineChartSvg("Price with Fibonacci bands", series, {
          height: 330,
          areas: [
            { topField: "upper618", bottomField: "upper382", color: "rgba(239,83,80,.13)" },
            { topField: "upper1000", bottomField: "upper764", color: "rgba(239,83,80,.19)" },
            { topField: "lower382", bottomField: "lower618", color: "rgba(102,187,106,.13)" },
            { topField: "lower764", bottomField: "lower1000", color: "rgba(102,187,106,.19)" }
          ],
          lines: [
            { field: "upper382", color: "rgba(239,154,154,.48)", width: 1 },
            { field: "upper618", color: "rgba(239,83,80,.72)", width: 1 },
            { field: "upper764", color: "rgba(244,67,54,.82)", width: 1 },
            { field: "upper1000", color: "#b71c1c", width: 1.7 },
            { field: "lower382", color: "rgba(165,214,167,.48)", width: 1 },
            { field: "lower618", color: "rgba(102,187,106,.72)", width: 1 },
            { field: "lower764", color: "rgba(76,175,80,.82)", width: 1 },
            { field: "lower1000", color: "#1b5e20", width: 1.7 },
            { field: "basis", color: result.vfi.value >= result.vfi.signal ? "#54d6b4" : "#e87487", width: 1.8 },
            { field: "close", color: "#6fd3ff", width: 2.2 }
          ],
          marker: priceMarker
        });
        const vfiSvg = lineChartSvg("VFI and its EMA signal", series, {
          height: 220,
          levels: [{ value: 0, label: "ZERO", color: "rgba(192,203,220,.45)", dash: "4 4" }],
          lines: [
            { field: "vfi", color: "#6fd3ff", width: 1.9 },
            { field: "vfiSignal", color: "#ffd479", width: 1.5 }
          ]
        });
        const wtLevels = [
          { value: result.parameters.extremeOB, label: "EXTREME OB", color: "rgba(242,54,69,.52)", dash: "4 4" },
          { value: result.parameters.obLevel1, label: "OB 1", color: "rgba(242,54,69,.3)" },
          { value: result.parameters.obLevel2, label: "OB 2", color: "rgba(242,54,69,.22)" },
          { value: 0, label: "ZERO", color: "rgba(192,203,220,.45)", dash: "4 4" },
          { value: result.parameters.osLevel2, label: "OS 2", color: "rgba(8,153,129,.22)" },
          { value: result.parameters.osLevel1, label: "OS 1", color: "rgba(8,153,129,.3)" },
          { value: result.parameters.extremeOS, label: "EXTREME OS", color: "rgba(8,153,129,.52)", dash: "4 4" }
        ];
        const wtMarker = result.waveTrend.signals.bullishCross ? { field: "wt2", color: "#00e676", label: "WaveTrend bullish cross" }
          : result.waveTrend.signals.bearishCross ? { field: "wt2", color: "#ff1744", label: "WaveTrend bearish cross" } : null;
        const wtSvg = lineChartSvg("WaveTrend oscillator", series, {
          height: 260,
          levels: wtLevels,
          bands: [
            { topValue: result.parameters.extremeOB, bottomValue: result.parameters.obLevel2, color: "rgba(242,54,69,.08)" },
            { topValue: result.parameters.osLevel2, bottomValue: result.parameters.extremeOS, color: "rgba(8,153,129,.08)" }
          ],
          lines: [
            { field: "wt1", color: "#26a69a", width: 2 },
            { field: "wt2", color: "#ef5350", width: 1.5 }
          ],
          marker: wtMarker
        });
        const realOrSynthetic = result.synthetic
          ? "SYNTHETIC OHLCV · NOT REAL MARKET PRICES"
          : String(result.source || "").toLowerCase().includes("tickerbot")
            ? "TICKERBOT-SUPPLIED OHLCV · NOT INDEPENDENTLY VERIFIED"
            : "API-SUPPLIED OHLCV · VERIFY PROVIDER";
        const alerts = result.alerts.length
          ? `<div class="gi-chart-signals">${result.alerts.map(alert => `<span>${escapeHtml(alert)}</span>`).join("")}</div>`
          : `<p class="gi-chart-no-signals">No indicator conditions on the latest confirmed bar.</p>`;
        const divergences = result.recentDivergences.length
          ? `<p class="gi-chart-divergences">Recent WaveTrend divergences: ${result.recentDivergences.slice(-3).map(event => `${escapeHtml(event.type)} · ${escapeHtml(formatDate(event.time))}`).join(" · ")}</p>` : "";
        return `
          <div class="gi-market-chart-summary">
            <span class="gi-market-ticker">${escapeHtml(result.symbol || "Unlabeled ticker")} · ${escapeHtml(result.timeframe || "interval unknown")}</span>
            <span class="gi-market-synthetic-tag">${escapeHtml(realOrSynthetic)}</span>
            <span class="gi-market-source-line">${escapeHtml(result.source || "Source not supplied")} · ${result.barCount} bars · latest close ${formatMetric(result.close)}</span>
          </div>
          <section class="gi-chart-card gi-price-chart"><div class="gi-chart-title"><div><p class="gi-eyebrow">PRICE OVERLAY</p><h4>${escapeHtml(result.symbol || "Ticker")} · Fibonacci bands</h4></div><span>${escapeHtml(result.combined)}</span></div>${priceSvg}${chartLegend([
            { label: "Close", color: "#6fd3ff" }, { label: "Basis", color: result.vfi.value >= result.vfi.signal ? "#54d6b4" : "#e87487" },
            { label: "0.382 / 0.618", color: "#ef5350" }, { label: "0.764 / 1.000", color: "#1b5e20" }
          ])}</section>
          <div class="gi-oscillator-grid">
            <section class="gi-chart-card"><div class="gi-chart-title"><div><p class="gi-eyebrow">VOLUME FLOW FILTER</p><h4>VFI oscillator</h4></div><span>VFI ${formatMetric(result.vfi.value)} · EMA ${formatMetric(result.vfi.signal)}</span></div>${vfiSvg}${chartLegend([{ label: "VFI", color: "#6fd3ff" }, { label: "EMA signal", color: "#ffd479" }])}</section>
            <section class="gi-chart-card"><div class="gi-chart-title"><div><p class="gi-eyebrow">MOMENTUM / DIVERGENCE</p><h4>WaveTrend</h4></div><span>${escapeHtml(result.waveTrend.zone)}</span></div>${wtSvg}${chartLegend([{ label: "WT1", color: "#26a69a" }, { label: "WT2", color: "#ef5350" }])}</section>
          </div>
          ${alerts}${divergences}
          <p class="gi-chart-disclaimer">${escapeHtml(result.note)}</p>`;
      }

      function drawMarketCharts() {
        marketProviderSelect.value = state.marketProvider;
        marketIntervalSelect.value = state.marketInterval;
        marketIntervalSelect.disabled = state.marketProvider !== "tickerbot";
        if (state.marketProvider === "tickerbot") {
          drawTickerbotMarketCharts();
          return;
        }
        const allMarkets = state.feed.filter(item => item.marketContext);
        const markets = allMarkets.filter(item => marketMatches(state.marketQuery, item.marketContext.symbol, item.title, companyFor(item.marketContext.symbol)));
        updateMarketSearch(markets.length, allMarkets.length);
        if (!allMarkets.length) {
          marketSelect.innerHTML = "";
          marketSelect.disabled = true;
          marketChartHost.innerHTML = messageBlock("No ticker bars supplied", "The selected Good Intelligence API has no marketContext OHLCV packets. No prices or line charts are fabricated here.");
          state.selectedMarketId = "";
          return;
        }
        if (!markets.length) { showNoMatchingTickers(); return; }
        marketSelect.disabled = false;
        if (!markets.some(item => item.id === state.selectedMarketId)) state.selectedMarketId = markets[0].id;
        marketSelect.innerHTML = markets.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.marketContext.symbol || item.title)}${item.marketContext.synthetic ? " · DEMO" : ""}</option>`).join("");
        marketSelect.value = state.selectedMarketId;
        const item = markets.find(row => row.id === state.selectedMarketId) || markets[0];
        const result = MarketContext.evaluate(item.marketContext);
        if (!result || result.status === "no-data") {
          marketChartHost.innerHTML = messageBlock("Ticker history unavailable", result && result.note || "The packet has no valid OHLCV bars.");
          return;
        }
        marketChartHost.innerHTML = marketChartsMarkup(item, result);
      }

      function updateMarketSearch(count, total) {
        marketSearch.value = state.marketQuery;
        marketClear.disabled = !state.marketQuery;
        marketCount.textContent = `${count} of ${total} tracked ticker${total === 1 ? "" : "s"}`;
        marketSearchHelp.textContent = state.marketProvider === "tickerbot"
          ? "Search the configured Tickerbot watchlist: AAPL (Apple), MSFT (Microsoft), NVDA (NVIDIA). Other symbols are not enabled on this Worker."
          : "Filter the tickers supplied by the selected API. Demo symbols and prices remain synthetic.";
      }

      function showNoMatchingTickers() {
        // Invalidate a live request so its late result cannot overwrite the
        // empty state. Searching an unsupported ticker sends no new request.
        state.marketRequestId++;
        state.marketRequestKey = "";
        marketSelect.innerHTML = '<option value="">No matching tickers</option>';
        marketSelect.disabled = true;
        marketChartHost.innerHTML = messageBlock("No tracked tickers match", `No match for “${state.marketQuery}”. Clear the search to see the configured watchlist.`);
      }

      function drawTickerbotMarketCharts() {
        const matches = TICKERBOT_WATCHLIST.filter(item => marketMatches(state.marketQuery, item.symbol, item.name));
        updateMarketSearch(matches.length, TICKERBOT_WATCHLIST.length);
        if (!matches.length) { showNoMatchingTickers(); return; }
        marketSelect.disabled = false;
        const symbols = matches.map(item => item.symbol);
        if (!symbols.includes(state.selectedMarketId)) state.selectedMarketId = symbols[0];
        marketSelect.innerHTML = matches.map(item => `<option value="${item.symbol}">${item.symbol} · TICKERBOT · ${item.name}</option>`).join("");
        marketSelect.value = state.selectedMarketId;
        const symbol = state.selectedMarketId;
        const interval = state.marketInterval;
        const requestKey = `${symbol}:${interval}`;
        if (state.marketResultKey === requestKey && state.marketResult) {
          marketChartHost.innerHTML = marketChartsMarkup(null, state.marketResult);
          return;
        }
        if (state.marketErrorKey === requestKey) {
          marketChartHost.innerHTML = messageBlock("Tickerbot bars unavailable", state.marketError || "The Worker could not load this ticker.", "error");
          return;
        }
        if (state.marketRequestKey === requestKey) return;

        const requestId = ++state.marketRequestId;
        state.marketRequestKey = requestKey;
        state.marketResultKey = "";
        state.marketResult = null;
        state.marketErrorKey = "";
        state.marketError = "";
        marketChartHost.innerHTML = messageBlock("Loading Tickerbot bars", `Requesting ${symbol} ${interval} bars through the same-origin Worker.`);
        const endpoint = `${Client.DEFAULT_API_BASE}/market/tickerbot/bars?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}`;
        const fetcher = window.fetch || globalThis.fetch;
        Promise.resolve().then(() => fetcher(endpoint, {
          method: "GET", credentials: "same-origin", cache: "no-store", redirect: "error",
          headers: { Accept: "application/json" }
        })).then(async response => {
          let payload = null;
          try { payload = await response.json(); } catch { /* handled as a safe format error below */ }
          if (!response.ok || !payload || payload.success !== true) {
            throw new Error(payload && payload.message || `Tickerbot request failed (HTTP ${response.status || "unknown"}).`);
          }
          const packet = MarketContext.normalizePacket(payload.data);
          const result = packet && MarketContext.evaluate(packet);
          if (!result || result.status === "no-data") throw new Error(result && result.note || "Tickerbot returned no valid OHLCV bars.");
          if (state.marketProvider !== "tickerbot" || state.marketRequestId !== requestId || state.marketRequestKey !== requestKey) return;
          state.marketResult = result;
          state.marketResultKey = requestKey;
          marketChartHost.innerHTML = marketChartsMarkup(null, result);
        }).catch(error => {
          if (state.marketProvider !== "tickerbot" || state.marketRequestId !== requestId || state.marketRequestKey !== requestKey) return;
          state.marketError = error && error.message || "The Tickerbot request failed.";
          state.marketErrorKey = requestKey;
          marketChartHost.innerHTML = messageBlock("Tickerbot bars unavailable", state.marketError, "error");
        }).finally(() => {
          if (state.marketRequestId === requestId) state.marketRequestKey = "";
        });
      }

      function drawAssuranceSummary() {
        const scored = state.feed.filter(item => assessmentFor(item).result.score !== null).length;
        const total = state.feed.length;
        $("[data-gi-assessed-count]").textContent = `${scored} / ${total} signal${total === 1 ? "" : "s"} scored`;
        $("[data-gi-assurance-summary-note]").textContent = total
          ? scored ? "Scores are evidence-coverage indicators, not truth or action authorization. Open an item to inspect the model inputs."
            : "No signal has all required evidence dimensions. Missing assurance data stays unknown; no sample score is invented."
          : "Scores require phase, legitimacy, provenance, freshness, corroboration, conflict review, and decision-scope evidence.";
      }

      function stateForError(error, successCount, demoMode) {
        if (state.loading) return { label: "SYNCING", className: "syncing" };
        if (!error) return demoMode ? { label: "DEMO FIXTURES CONNECTED", className: "demo" } : { label: "API CONNECTED", className: "online" };
        if (successCount) return { label: "PARTIAL · REVIEW STATUS", className: "partial" };
        if (error.kind === "auth") return { label: "MEMBER SESSION NEEDED", className: "partial" };
        return { label: "API UNAVAILABLE", className: "offline" };
      }

      function messageBlock(title, description, kind = "") {
        return `<div class="gi-empty ${kind ? ` ${kind}` : ""}"><span class="gi-empty-mark" aria-hidden="true">${kind === "error" ? "!" : "∅"}</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(description)}</p></div>`;
      }

      function updateConnection() {
        const failures = Object.values(state.errors).filter(Boolean);
        const successes = 3 - failures.length;
        const summaryError = failures.find(error => error.kind !== "auth") || failures[0] || null;
        const demoMode = state.apiBase === Client.DEFAULT_API_BASE;
        const status = stateForError(summaryError, successes, demoMode);
        connection.className = `gi-connection ${status.className}`;
        connectionLabel.textContent = status.label;
        $("[data-gi-demo-mode]").hidden = !demoMode;
        $("[data-gi-api-host]").textContent = state.apiBase;
        const sectionStatus = section => state.loading ? "SYNCING"
          : state.errors[section] ? state.errors[section].kind === "auth" ? "SESSION" : "UNAVAILABLE"
            : demoMode ? "DEMO" : "READY";
        $("[data-gi-feed-state]").textContent = sectionStatus("feed");
        $("[data-gi-categories-state]").textContent = sectionStatus("categories");
        $("[data-gi-rank-status]").textContent = sectionStatus("rankings");
        const rankState = $("[data-gi-rank-state]");
        rankState.textContent = state.loading ? "SYNCING" : state.errors.rankings ? "OFFLINE" : demoMode ? "DEMO DATA" : "AVAILABLE";
        rankState.className = `gi-live-label${demoMode && !state.loading && !state.errors.rankings ? " demo" : ""}`;
        $("[data-gi-updated]").textContent = state.updatedAt ? `Last checked ${formatDate(state.updatedAt)}` : state.loading ? "Checking the API…" : "Waiting for the first refresh.";
        const sessionNote = $("[data-gi-session-note]");
        if (state.errors.feed && state.errors.feed.kind === "auth") sessionNote.textContent = "Feed locked · existing GI session required";
        else if (state.errors.feed && state.errors.feed.kind === "network") sessionNote.textContent = "Connection blocked · check CORS or gateway";
        else sessionNote.textContent = "Member feed may require a GI session.";
      }

      function drawCategories() {
        const current = state.category;
        const names = new Set(["All categories"]);
        state.categories.forEach(category => { if (category && category.name) names.add(category.name); });
        state.feed.forEach(item => { if (item.category) names.add(item.category); });
        categorySelect.innerHTML = Array.from(names).map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
        categorySelect.value = names.has(current) ? current : "All categories";
        state.category = categorySelect.value;
      }

      function visibleFeed() {
        const query = state.query.trim().toLocaleLowerCase();
        return state.feed.filter(item => {
          if (state.category !== "All categories" && item.category !== state.category) return false;
          if (!query) return true;
          return [item.title, item.body, item.category, item.providerName, item.address].join(" ").toLocaleLowerCase().includes(query);
        });
      }

      function drawFeed() {
        const rows = visibleFeed();
        feedCount.textContent = `${rows.length.toLocaleString()} ${rows.length === 1 ? "item" : "items"}`;
        if (state.loading && !state.feed.length) {
          feedList.innerHTML = `<div class="gi-loading"><span></span><span></span><span></span>Loading the configured feed…</div>`;
          detailHost.hidden = true;
          return;
        }
        if (state.errors.feed && !state.feed.length) {
          feedList.innerHTML = messageBlock(state.errors.feed.kind === "auth" ? "Member feed is protected" : "Feed could not be loaded", errorMessage(state.errors.feed), "error");
          detailHost.hidden = true;
          return;
        }
        if (!rows.length) {
          const hasFilters = !!state.query.trim() || state.category !== "All categories";
          feedList.innerHTML = messageBlock(hasFilters ? "No matching intel" : "No intel returned", hasFilters ? "Try another search or category." : "The API returned no feed items. No sample or placeholder intelligence is shown.");
          detailHost.hidden = true;
          return;
        }

        feedList.innerHTML = rows.map(item => {
          const assurance = assessmentFor(item).result;
          const assuranceLabel = assurance.score === null ? "ASSURANCE · NOT SCORED" : `ASSURANCE · ${assurance.score}/100`;
          return `
            <button type="button" class="gi-story ${state.selectedId === item.id ? "selected" : ""}" data-gi-item="${escapeHtml(item.id)}" aria-expanded="${state.selectedId === item.id}">
              <span class="gi-story-top"><span class="gi-category-pill">${escapeHtml(item.category)}</span><span class="gi-story-date">${escapeHtml(formatDate(item.date))}</span></span>
              <strong class="gi-story-title">${escapeHtml(item.title)}</strong>
              <span class="gi-story-excerpt">${escapeHtml(item.body || "No summary was supplied by the API.")}</span>
              <span class="gi-story-foot"><span>${escapeHtml(shortenAddress(item.providerName || item.address))}</span>${item.block ? `<span>BLOCK ${escapeHtml(item.block)}</span>` : ""}<span class="gi-story-assurance ${assurance.score === null ? "unknown" : ""}">${escapeHtml(assuranceLabel)}</span><span class="gi-story-open">OPEN INTEL <b aria-hidden="true">↗</b></span></span>
            </button>`;
        }).join("");
        drawDetail();
      }

      function drawDetail() {
        const item = state.feed.find(row => row.id === state.selectedId);
        if (!item) { detailHost.hidden = true; detailHost.innerHTML = ""; return; }
        detailHost.hidden = false;
        detailHost.innerHTML = `
          <article class="gi-detail-card">
            <div class="gi-detail-top"><span class="gi-category-pill">${escapeHtml(item.category)}</span><button type="button" class="gi-text-button" data-gi-close-detail>Close <span aria-hidden="true">×</span></button></div>
            <h3>${escapeHtml(item.title)}</h3>
            <div class="gi-detail-meta"><span>${escapeHtml(formatDate(item.date))}</span><span>Provider ${escapeHtml(shortenAddress(item.providerName || item.address))}</span>${item.block ? `<span>Block ${escapeHtml(item.block)}</span>` : ""}</div>
            <p class="gi-detail-body">${escapeHtml(item.body || "The API did not supply a text body for this item.")}</p>
            <div class="gi-detail-disclaimer">Presented as returned by the Good Intelligence API. Verify the source and context before relying on it.</div>
            ${assurancePanel(item)}
            ${marketContextPanel(item)}
          </article>`;
      }

      function drawMiniRankings() {
        const host = $("[data-gi-mini-rankings]");
        if (state.loading && !state.rankings.length) {
          host.innerHTML = `<div class="gi-mini-empty">Loading public ranking…</div>`;
          return;
        }
        if (state.errors.rankings && !state.rankings.length) {
          host.innerHTML = `<div class="gi-mini-empty">${escapeHtml(errorMessage(state.errors.rankings))}</div>`;
          return;
        }
        if (!state.rankings.length) {
          host.innerHTML = `<div class="gi-mini-empty">The API returned no ranking records.</div>`;
          return;
        }
        host.innerHTML = state.rankings.slice(0, 5).map((row, index) => `
          <div class="gi-mini-row"><span class="gi-mini-position">${String(row.rank || index + 1).padStart(2, "0")}</span><span class="gi-mini-address">${escapeHtml(shortenAddress(row.address))}</span><span class="gi-mini-score">${row.score === null ? "—" : escapeHtml(formatCount(row.score))}</span></div>`).join("");
      }

      function drawRankings() {
        const rowsHost = $("[data-gi-ranking-rows]");
        const messageHost = $("[data-gi-ranking-message]");
        if (state.loading && !state.rankings.length) {
          rowsHost.innerHTML = "";
          messageHost.innerHTML = messageBlock("Loading rankings", "Fetching the public ranking endpoint.");
          return;
        }
        if (state.errors.rankings && !state.rankings.length) {
          rowsHost.innerHTML = "";
          messageHost.innerHTML = messageBlock("Rankings unavailable", errorMessage(state.errors.rankings), "error");
          return;
        }
        if (!state.rankings.length) {
          rowsHost.innerHTML = "";
          messageHost.innerHTML = messageBlock("No ranking records", "The API returned an empty ranking list.");
          return;
        }
        messageHost.innerHTML = "";
        rowsHost.innerHTML = state.rankings.map((row, index) => `
          <tr><td class="gi-rank-number">${escapeHtml(formatCount(row.rank || index + 1))}</td><td class="gi-address">${escapeHtml(row.address || "Address not supplied")}</td><td>${row.score === null ? "—" : escapeHtml(formatCount(row.score))}</td><td>${escapeHtml(row.tokens || "—")}</td></tr>`).join("");
      }

      function updateView() {
        const feedView = state.view === "feed";
        const rankingsView = state.view === "rankings";
        const marketsView = state.view === "markets";
        $("[data-gi-feed-panel]").hidden = !feedView;
        $("[data-gi-rankings-panel]").hidden = !rankingsView;
        $("[data-gi-markets-panel]").hidden = !marketsView;
        $("[data-gi-view-title]").textContent = feedView ? "Member intel feed" : rankingsView ? "Network rankings" : "Market Charts";
        $("[data-gi-view-description]").textContent = feedView
          ? "Signals returned by the configured Good Intelligence API; assurance is assessed separately."
          : rankingsView ? "Public network ranking data returned by the Good Intelligence API."
            : "Stock-price line charts with VFI, Fibonacci bands, and WaveTrend overlays from API-supplied OHLCV.";
        body.querySelectorAll("[data-gi-view]").forEach(button => {
          const active = button.dataset.giView === state.view;
          button.classList.toggle("active", active);
          button.setAttribute("aria-pressed", String(active));
        });
      }

      function draw() {
        updateConnection();
        updateView();
        drawCategories();
        drawFeed();
        drawMiniRankings();
        drawRankings();
        drawMarketCharts();
        drawAssuranceSummary();
        apiInput.value = state.apiBase;
        settingsError.textContent = state.settingsError;
      }

      async function refresh() {
        if (state.controller) state.controller.abort();
        if (state.marketProvider === "tickerbot") {
          state.marketRequestId++;
          state.marketRequestKey = "";
          state.marketResultKey = "";
          state.marketResult = null;
          state.marketErrorKey = "";
          state.marketError = "";
        }
        state.ground0Audits = Assurance.readLocalGround0Audits();
        const controller = typeof AbortController === "function" ? new AbortController() : null;
        state.controller = controller;
        const requestId = ++state.requestId;
        state.loading = true;
        state.errors = { feed: null, categories: null, rankings: null };
        draw();
        try {
          const snapshot = await Client.loadDashboard({ apiBase: state.apiBase, signal: controller && controller.signal });
          const sourceVerifications = await Promise.all(snapshot.feed.map(async item => {
            try { return [item.id, await Verifier.verifySourceLegitimacy(item, { allowDemoRoot: state.apiBase === Client.DEFAULT_API_BASE })]; }
            catch { return [item.id, { verified: false, status: "unavailable", keyId: "", trust: "none", reason: "Local cryptographic verification could not be completed." }]; }
          }));
          if (requestId !== state.requestId) return;
          state.feed = snapshot.feed;
          state.sourceVerifications = Object.fromEntries(sourceVerifications);
          state.categories = snapshot.categories;
          state.rankings = snapshot.rankings;
          state.errors = snapshot.errors;
          state.updatedAt = snapshot.completedAt;
          if (!state.feed.some(item => item.id === state.selectedId)) state.selectedId = "";
        } catch (error) {
          if (requestId !== state.requestId) return;
          const safe = { kind: error.kind || "service", message: error.message || "The dashboard could not be loaded." };
          state.errors = { feed: safe, categories: safe, rankings: safe };
          state.updatedAt = new Date().toISOString();
        } finally {
          if (requestId === state.requestId) {
            state.loading = false;
            state.controller = null;
            draw();
          }
        }
      }

      body.querySelectorAll("[data-gi-view]").forEach(button => button.addEventListener("click", () => {
        state.view = ["feed", "rankings", "markets"].includes(button.dataset.giView) ? button.dataset.giView : "feed";
        updateView();
      }));
      $("[data-gi-open-rankings]").addEventListener("click", () => {
        state.view = "rankings";
        updateView();
      });
      const searchMarkets = () => {
        state.marketQuery = String(marketSearch.value || "").slice(0, 80);
        drawMarketCharts();
      };
      marketSearch.addEventListener("input", searchMarkets);
      marketSearch.addEventListener("search", searchMarkets);
      const clearMarketSearch = () => {
        state.marketQuery = "";
        drawMarketCharts();
        marketSearch.focus();
      };
      marketClear.addEventListener("click", clearMarketSearch);
      marketSearch.addEventListener("keydown", event => {
        if (event.key === "Escape") { event.preventDefault(); clearMarketSearch(); }
      });
      marketSelect.addEventListener("change", () => {
        state.selectedMarketId = marketSelect.value;
        drawMarketCharts();
      });
      marketProviderSelect.addEventListener("change", () => {
        state.marketProvider = marketProviderSelect.value === "tickerbot" ? "tickerbot" : "demo";
        state.marketQuery = "";
        state.selectedMarketId = "";
        state.marketRequestId++;
        state.marketRequestKey = "";
        state.marketResultKey = "";
        state.marketResult = null;
        state.marketErrorKey = "";
        state.marketError = "";
        drawMarketCharts();
      });
      marketIntervalSelect.addEventListener("change", () => {
        state.marketInterval = marketIntervalSelect.value === "1d" ? "1d" : "1h";
        state.marketResultKey = "";
        state.marketResult = null;
        state.marketErrorKey = "";
        state.marketError = "";
        drawMarketCharts();
      });
      $("[data-gi-refresh]").addEventListener("click", () => refresh());
      searchInput.addEventListener("input", () => {
        state.query = searchInput.value;
        drawFeed();
      });
      categorySelect.addEventListener("change", () => {
        state.category = categorySelect.value;
        drawFeed();
      });
      feedList.addEventListener("click", event => {
        const button = event.target.closest("[data-gi-item]");
        if (!button) return;
        state.selectedId = button.dataset.giItem;
        drawFeed();
      });
      detailHost.addEventListener("click", event => {
        if (!event.target.closest("[data-gi-close-detail]")) return;
        state.selectedId = "";
        drawDetail();
        drawFeed();
      });
      $("[data-gi-save-api]").addEventListener("click", () => {
        try {
          state.apiBase = Client.setApiBase(apiInput.value);
          state.settingsError = "";
          api.toast("info", "API ENDPOINT SAVED", "The read-only Good Intelligence connection will refresh from the selected endpoint.");
          refresh();
        } catch (error) {
          state.settingsError = error.message || "The endpoint is not valid.";
          settingsError.textContent = state.settingsError;
        }
      });

      draw();
      refresh();
    }
  });
})();
