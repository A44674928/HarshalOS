/* HarshalOS — Characters: Objects, NPCs, and Items moved by the market beat.

   The cast (js/characters-cast.js) is built from the selected Disc: the reviewed
   Tickerbot stock deck, BIS-listed FX, CoinGecko volume-ranked crypto, or commodities.
   Tickerbot supplies stock 1h/1d; Alpha Vantage supplies only explicit 1mo observations.
   Price-only series do not acquire invented OHLC or volume.

   Everything on this stage is display-only. No beat authorizes anything, spends
   anything except the provider calls it must, or becomes investment advice. No bars
   means no motion: a berth without data stands still rather than pretending.
   */
"use strict";

(() => {
  const STORAGE_KEY = "harshalos.characters.ledger.v1";
  const REHEARSAL_BEAT_MS = 5000; // synthetic rehearsal only — never a live cadence
  const ALPHA_VANTAGE_DAILY_REQUEST_CAP = 25;
  const MONTHLY_BEAT_MS = 24 * 60 * 60_000;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
  const clock = value => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toISOString().slice(11, 16) + "Z";
  };
  const stamp = value => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toISOString().slice(0, 16).replace("T", " ") + "Z";
  };
  const since = (from, to) => {
    const seconds = Math.max(0, Math.round((to - from) / 1000));
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${String(minutes % 60).padStart(2, "0")}m`;
  };
  const meter = value => {
    const width = Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100);
    return `<span class="ch-meter" role="img" aria-label="${width}%"><i style="width:${width}%"></i></span>`;
  };
  const signed = value => `${Number(value) > 0 ? "+" : ""}${Number(value || 0).toFixed(2)}`;
  const compactUsd = value => Number.isFinite(Number(value)) && Number(value) > 0
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 }).format(Number(value))
    : "—";
  const normalizeServerLedger = value => {
    if (!value || typeof value !== "object" || !/^[0-9]{4}-[0-9]{2}$/.test(String(value.month || ""))) return null;
    const integer = input => Math.max(0, Math.floor(Number(input) || 0));
    const providerBudget = integer(value.providerBudget);
    const workerLimit = Math.min(providerBudget, integer(value.workerLimit));
    const calls = integer(value.calls);
    if (!providerBudget || !workerLimit) return null;
    return {
      month: String(value.month), calls, providerBudget, workerLimit,
      remaining: Math.max(0, workerLimit - calls),
      exhausted: calls >= workerLimit,
      updatedAt: integer(value.updatedAt)
    };
  };
  const normalizeAlphaVantageDailyLedger = value => {
    if (!value || typeof value !== "object" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(value.day || ""))) return null;
    const integer = input => Math.max(0, Math.floor(Number(input) || 0));
    const dailyLimit = integer(value.dailyLimit);
    const calls = integer(value.calls);
    if (!dailyLimit) return null;
    return {
      day: String(value.day), calls, dailyLimit,
      remaining: Math.max(0, dailyLimit - calls),
      exhausted: calls >= dailyLimit,
      updatedAt: integer(value.updatedAt)
    };
  };

  APPS.push({
    id: "characters",
    title: "Characters",
    short: "Characters",
    glyph: "⧉",
    desc: "Objects, NPCs, and Items moved by the last closed bar — a display-only market beat",
    w: 1200,
    h: 800,
    render(body, api) {
      const Beat = window.CharactersBeat;
      const Cast = window.CharactersCast;
      const MarketContext = window.GoodIntelligenceMarketContext;
      const DiscCatalog = window.CharactersDiscCatalog;
      const watchlist = ((window.APPS || []).find(app => app.id === "good-intelligence") || {}).tickerbotWatchlist;
      if (!Beat || !Cast || !MarketContext || !DiscCatalog || !Array.isArray(watchlist) || !watchlist.length) {
        body.innerHTML = `<div class="ch-app"><div class="h1">Characters</div>
          <div class="rule-box refusal">The beat engine, cast, Disc catalog, market-context evaluator, or reviewed Tickerbot watchlist is not loaded. Check the script order in index.html and the Good Intelligence app entry.</div></div>`;
        return;
      }

      const activeDisc = { current: "stocks", ranking: null };
      let stage = Cast.build(watchlist, { discId: "stocks" });
      let symbols = stage.berths.map(berth => berth.symbol);
      const discStorageKey = (discId, interval) => discId === "stocks" && interval === "1h"
        ? STORAGE_KEY : `${STORAGE_KEY}.${discId}.${interval}`;
      const storage = (() => {
        try {
          const probe = window.localStorage;
          probe.setItem(`${STORAGE_KEY}.probe`, "1");
          probe.removeItem(`${STORAGE_KEY}.probe`);
          return probe;
        } catch { return null; }
      })();

      function readLedger(discId = activeDisc.current, interval = "1h") {
        if (!storage) return Beat.emptyLedger(Date.now());
        try {
          return Beat.normalizeLedger(JSON.parse(storage.getItem(discStorageKey(discId, interval)) || "null"), Date.now());
        } catch { return Beat.emptyLedger(Date.now()); }
      }

      function writeLedger(ledger, discId = activeDisc.current, interval = state.interval) {
        if (!storage) return;
        try { storage.setItem(discStorageKey(discId, interval), JSON.stringify(ledger)); } catch { /* the ledger is best-effort */ }
      }

      const state = {
        discId: "stocks",
        ranking: null,
        cadence: Beat.DEFAULTS.cadenceMinutes,
        budget: Beat.DEFAULTS.monthlyBudget,
        interval: "1h",
        source: "live",
        auto: true,
        stretch: false,
        tierMode: false,
        tierSweepHours: 24,
        laneBySymbol: {},     // symbol -> "hot" | "sweep" from the last beat
        hotSet: [],           // the operator's hot lane (featured tickers)
        focus: symbols[0] || "",
        ledger: readLedger(),
        serverLedger: null,
        serverLedgerStatus: "waiting",
        alphaVantageDailyLedger: null,
        alphaVantageLedgerStatus: "waiting",
        /* Featured tickers double as the hot lane; the browser ledger is where that choice lives. */
        motions: {},          // symbol -> latest directive from the engine
        displayed: {},        // symbol -> directive blended for rendering
        analyses: {},         // symbol -> small readout for the detail card
        items: new Map(),     // symbol -> live item sprites
        log: [],
        blends: {},           // symbol -> { from, to, startedAt } for the glide between beats
        beats: 0,
        pending: false,
        lastBeatAt: 0,
        nextBeatAt: 0,
        message: null,
        sourceNote: ""
      };

      body.innerHTML = `
        <div class="ch-app">
          <header class="ch-header">
            <div>
              <p class="ch-eyebrow">HARSHAALOS · MARKET BEAT</p>
              <h1>Characters</h1>
              <p class="ch-lede">Select a Disc to cast the reviewed stock deck, BIS FX instruments, volume-ranked crypto, or commodities. Tickerbot keeps stock <strong>1h/1d</strong> behavior; Alpha Vantage answers only explicit <strong>1mo</strong> requests. Missing fields stay missing; re-drawing the stage spends no provider calls.</p>
            </div>
            <div class="ch-source-badge" data-ch-source-badge>Synthetic rehearsal · 0 calls</div>
          </header>

          <section class="ch-controls">
            <label class="ch-control"><span>DISC</span>
              <select data-ch-disc>${DiscCatalog.discs.map(disc => `<option value="${esc(disc.id)}">${esc(disc.label)}</option>`).join("")}</select>
            </label>
            <label class="ch-control"><span>CADENCE</span>
              <select data-ch-cadence>${Beat.CADENCES.map(minutes => `<option value="${minutes}">${Beat.formatHours(minutes / 60)}</option>`).join("")}</select>
            </label>
            <label class="ch-control"><span>BAR SIZE</span>
              <select data-ch-interval><option value="1h">1 hour · Tickerbot</option><option value="1d">1 day · Tickerbot</option><option value="1mo">1 month · Alpha Vantage</option></select>
            </label>
            <label class="ch-control"><span>TICKERBOT PLAN</span>
              <input type="number" min="100" max="10000" step="100" value="${state.budget}" data-ch-budget aria-label="Tickerbot calls per month; planning only">
            </label>
            <label class="ch-control"><span>DATA SOURCE</span>
              <select data-ch-source>
                <option value="live">Live provider data</option>
                <option value="rehearsal">Synthetic rehearsal</option>
              </select>
            </label>
            <label class="ch-control ch-focus-control"><span>FOCUS</span>
              <select data-ch-focus aria-label="Focus an instrument">${stage.berths.map(berth => `<option value="${esc(berth.symbol)}">${esc(berth.displaySymbol)} · ${esc(berth.name)}</option>`).join("")}</select>
            </label>
            <div class="ch-buttons">
              <button class="ch-btn ch-btn-primary" data-ch-beat>Beat now</button>
              <button class="ch-btn" data-ch-auto aria-pressed="true">Auto-beat: on</button>
            </div>
          </section>
          <p class="ch-disc-note" data-ch-disc-note></p>

          <div class="ch-grid">
            <section class="ch-panel ch-stage-panel">
              <div class="ch-panel-head">
                <h2>The stage</h2>
                <div class="ch-legend">
                  <span><i class="ch-swatch ch-swatch-npc"></i>NPC — walks</span>
                  <span><i class="ch-swatch ch-swatch-object"></i>Object — sways</span>
                  <span><i class="ch-swatch ch-swatch-item"></i>Item — flows</span>
                  <span class="ch-legend-lanes"><i class="ch-swatch ch-swatch-hot"></i>hot lane<i class="ch-swatch ch-swatch-sweep"></i>sweep</span>
                </div>
              </div>
              <div class="ch-stage" data-ch-stage>
                <canvas data-ch-canvas width="880" height="620" tabindex="0" aria-label="Radial stage of the selected Characters Disc. Each berth is one instrument; use the Focus selector for details."></canvas>
              </div>
              <p class="ch-stage-note" data-ch-stage-note>No beat yet. Characters stand at their berths; nothing has been invented.</p>
            </section>

            <aside class="ch-side">
              <section class="ch-panel ch-plan-panel">
                <div class="ch-panel-head"><h2 data-ch-plan-title>Budget plan</h2><span data-ch-plan-tag class="ch-tag">—</span></div>
                <div data-ch-plan></div>
                <label class="ch-check"><input type="checkbox" data-ch-stretch> Use the reserve stretch (+1 symbol per beat)</label>
                <label class="ch-check"><input type="checkbox" data-ch-tier> Two-lane beat — feature the ones that must move every beat</label>
                <div data-ch-tier-panel></div>
                <p class="ch-fineprint" data-ch-plan-note></p>
              </section>

              <section class="ch-panel ch-detail-panel">
                <div class="ch-panel-head"><h2 data-ch-detail-title>Berth</h2><button class="ch-btn ch-btn-tiny" data-ch-feature>Feature</button></div>
                <div data-ch-detail></div>
              </section>

              <section class="ch-panel ch-log-panel">
                <div class="ch-panel-head"><h2>Beat log</h2><span class="ch-tag" data-ch-beatcount>0 beats</span></div>
                <ol class="ch-log" data-ch-log><li class="ch-log-empty">No beats recorded in this session.</li></ol>
                <p class="ch-fineprint">Worker D1 ledger: <span data-ch-durable-ledger>Waiting for the first live beat.</span> Shared across Characters and Market Charts; calls outside this Worker are not included.</p>
                <p class="ch-fineprint">Browser activity (best-effort): <span data-ch-ledger>0 calls this month</span>. Failed fetches may be counted conservatively by D1; the provider dashboard remains the billing authority.</p>
              </section>
            </aside>
          </div>

          <p class="ch-disclaimer" data-ch-disclaimer></p>
        </div>`;

      const $ = selector => body.querySelector(selector);
      const canvas = $("[data-ch-canvas]");
      /* Canvas is the stage, not the data: a host without a 2D context (or a reader that
         blocks it) still gets the plan, the ledger, the detail card, and the beat log. */
      const context2d = (() => {
        try { return canvas.getContext("2d"); } catch { return null; }
      })();
      const stageHost = $("[data-ch-stage]");
      const discSelect = $("[data-ch-disc]");
      const cadenceSelect = $("[data-ch-cadence]");
      const intervalSelect = $("[data-ch-interval]");
      const budgetInput = $("[data-ch-budget]");
      const sourceSelect = $("[data-ch-source]");
      const focusSelect = $("[data-ch-focus]");
      const autoButton = $("[data-ch-auto]");
      const beatButton = $("[data-ch-beat]");
      const stretchBox = $("[data-ch-stretch]");
      const tierBox = $("[data-ch-tier]");
      const featureButton = $("[data-ch-feature]");
      const reduceMotion = Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      const IDLE_MOTION = Beat.motion(null);

      function updateFocusOptions() {
        focusSelect.innerHTML = stage.berths.map(berth =>
          `<option value="${esc(berth.symbol)}">${esc(berth.displaySymbol)} · ${esc(berth.name)}</option>`
        ).join("");
        focusSelect.value = state.focus;
        focusSelect.disabled = stage.berths.length === 0;
      }

      function configureIntervalOptions(discId, preferred = state.interval) {
        const disc = DiscCatalog.disc(discId);
        const modes = disc ? disc.intervalModes : ["1h"];
        state.interval = modes.includes(preferred) ? preferred : modes[0];
        intervalSelect.innerHTML = modes.map(interval => {
          const label = interval === "1mo" ? "1 month · Alpha Vantage" : interval === "1d" ? "1 day · Tickerbot" : "1 hour · Tickerbot";
          return `<option value="${interval}">${label}</option>`;
        }).join("");
        intervalSelect.value = state.interval;
        intervalSelect.disabled = modes.length <= 1 || state.pending;
        cadenceSelect.disabled = state.interval === "1mo" || state.pending;
        budgetInput.disabled = state.interval === "1mo" || state.pending;
        stretchBox.disabled = state.interval === "1mo" || state.pending;
        tierBox.disabled = state.interval === "1mo" || state.pending;
      }

      function resetStageForSelection() {
        state.motions = {};
        state.displayed = {};
        state.analyses = {};
        state.blends = {};
        state.items = new Map();
        state.laneBySymbol = {};
        state.lastBeatAt = 0;
        state.nextBeatAt = Date.now();
        state.log = [];
        state.focus = symbols[0] || "";
        state.tierMode = false;
        state.stretch = false;
        stretchBox.checked = false;
        tierBox.checked = false;
        updateFocusOptions();
        configureIntervalOptions(state.discId, state.interval);
        state.ledger = readLedger(state.discId, state.interval);
      }

      function planOf() {
        return Beat.plan({
          monthlyBudget: state.budget,
          cadenceMinutes: state.interval === "1mo" ? 1440 : state.cadence,
          castSize: stage.berths.length,
          perRequestCap: Beat.MAX_SYMBOLS_PER_BEAT
        });
      }

      function perBeatOf(plan) {
        if (state.interval === "1mo") return Math.min(Beat.MAX_SYMBOLS_PER_BEAT, ALPHA_VANTAGE_DAILY_REQUEST_CAP);
        return state.stretch && plan.stretchWithinBudget ? plan.stretchCallsPerBeat : plan.callsPerBeat;
      }

      function tierPlan() {
        if (state.interval === "1mo") return { options: [], recommended: null, notes: ["Two-lane Tickerbot rotation is not used in explicit 1mo mode."] };
        return Beat.planTiers({
          monthlyBudget: state.budget,
          cadenceMinutes: state.cadence,
          castSize: stage.berths.length,
          perRequestCap: Beat.MAX_SYMBOLS_PER_BEAT
        });
      }

      function tierOptionOf(tiers) {
        return tiers.options.find(option => option.feasible && option.targetSweepHours === state.tierSweepHours)
          || tiers.recommended
          || null;
      }

      /* The berths a beat should refresh. Single-cadence mode is the plain
         least-recently-refreshed rotation; tier mode pays the hot lane first and gives
         what is left to the sweep queue — still inside the same callsPerBeat. */
      function dueForBeat() {
        const plan = planOf();
        const perBeat = perBeatOf(plan);
        const base = { symbols, lastRefreshedAt: state.ledger.lastRefreshedAt, now: Date.now(), featured: state.ledger.featured };
        if (state.interval === "1mo" || !state.tierMode) return { symbols: Beat.selectDueSymbols({ ...base, perBeat }), lanes: {}, tier: null, perBeat };
        const tiers = tierPlan();
        const option = tierOptionOf(tiers);
        if (!option) return { symbols: Beat.selectDueSymbols({ ...base, perBeat }), lanes: {}, tier: null, perBeat };
        const selection = Beat.selectTieredDue({
          ...base,
          hotSet: state.ledger.featured,
          hotSize: option.hotSize,
          sweepPerBeat: option.sweepPerBeat
        });
        return { symbols: selection.all, lanes: selection.lanes, tier: option, perBeat };
      }

      function cadenceMinutesForBeat() {
        return state.interval === "1mo" ? 1440 : state.cadence;
      }

      function beatIntervalMs() {
        if (state.source === "rehearsal") return REHEARSAL_BEAT_MS;
        return state.interval === "1mo" ? MONTHLY_BEAT_MS : state.cadence * 60_000;
      }

      /* ── Data ─────────────────────────────────────────────────────── */

      function acceptSpend(spend) {
        if (!spend || typeof spend !== "object") return;
        const ledger = normalizeServerLedger(spend.durable);
        if (ledger && (!state.serverLedger || ledger.month > state.serverLedger.month ||
          (ledger.month === state.serverLedger.month && ledger.calls >= state.serverLedger.calls))) {
          state.serverLedger = ledger;
        }
        if (spend.ledgerStatus === "unavailable") state.serverLedgerStatus = "unavailable";
        else if (spend.ledgerStatus === "not-configured") state.serverLedgerStatus = "not-configured";
        else if (ledger) state.serverLedgerStatus = "ready";

        const alphaDaily = normalizeAlphaVantageDailyLedger(spend.alphaVantageDaily);
        if (alphaDaily && (!state.alphaVantageDailyLedger || alphaDaily.day > state.alphaVantageDailyLedger.day ||
          (alphaDaily.day === state.alphaVantageDailyLedger.day && alphaDaily.calls >= state.alphaVantageDailyLedger.calls))) {
          state.alphaVantageDailyLedger = alphaDaily;
        }
        if (spend.alphaVantageLedgerStatus === "unavailable") state.alphaVantageLedgerStatus = "unavailable";
        else if (alphaDaily) state.alphaVantageLedgerStatus = "ready";
        else if (spend.alphaVantageLedgerStatus === "not-configured") state.alphaVantageLedgerStatus = "not-configured";
      }

      async function fetchLiveBeat(due, cadenceMinutes, lanes = {}) {
        const laneParam = Object.entries(lanes).length
          ? `&lanes=${encodeURIComponent(Object.entries(lanes).map(([symbol, lane]) => `${symbol}:${lane}`).join(','))}`
          : "";
        const endpoint = `/api/characters/v1/beat?disc=${encodeURIComponent(state.discId)}` +
          `&symbols=${encodeURIComponent(due.join(','))}` +
          `&interval=${encodeURIComponent(state.interval)}&cadence=${cadenceMinutes}${laneParam}`;
        const fetcher = window.fetch || globalThis.fetch;
        const response = await fetcher(endpoint, {
          method: "GET", credentials: "same-origin", cache: "no-store", redirect: "error",
          headers: { Accept: "application/json" }
        });
        let payload = null;
        try { payload = await response.json(); } catch { /* handled below as a format error */ }
        const data = payload && payload.data && typeof payload.data === "object" ? payload.data : null;
        const spend = data && data.spend || null;
        acceptSpend(spend);
        const currentMonth = Beat.monthKey(Date.now());
        const hasCurrentLedger = state.serverLedger && state.serverLedger.month === currentMonth;
        if (!response.ok && !spend && !hasCurrentLedger) state.serverLedgerStatus = "unavailable";
        const instruments = data && Array.isArray(data.instruments) ? data.instruments : [];
        if (!response.ok && !instruments.length) {
          const error = new Error((payload && payload.message) || `The beat route answered HTTP ${response.status}.`);
          error.kind = response.status === 404 || response.status === 503 ? "unconfigured" : "upstream";
          throw error;
        }
        return { instruments, spend };
      }

      function rehearsalBeat(due) {
        state.beats += 1;
        return {
          instruments: due.map(symbol => ({ symbol, status: "rehearsal", marketContext: Beat.rehearse({ symbol, at: Date.now(), beat: state.beats }) })),
          spend: null
        };
      }

      async function beatNow(reason = "manual") {
        if (state.pending) return;
        const plan = planOf();
        const currentMonth = Beat.monthKey(Date.now());
        const durable = state.serverLedger && state.serverLedger.month === currentMonth ? state.serverLedger : null;
        if (state.source === "live" && durable && durable.exhausted && state.interval !== "1mo") {
          state.message = { kind: "refusal", text: `The shared D1 ledger records ${durable.calls.toLocaleString()} of ${durable.workerLimit.toLocaleString()} Worker-routed Tickerbot attempts for ${durable.month}. The Tickerbot monthly limit is reached; no ${state.interval} request was sent. Explicit 1mo mode is separate and is not a daily substitute.` };
          drawPanels();
          return;
        }
        const selection = dueForBeat();
        const due = selection.symbols;
        if (!due.length) return;
        /* Lanes are recomputed for the beat that is about to run, so stale labels never
           survive a rotation (or a stretch) that moved a berth between lanes. */
        state.laneBySymbol = selection.lanes;

        state.pending = true;
        drawPanels();
        const startedAt = Date.now();
        let result = null;
        let error = null;
        try {
          result = state.source === "live"
            ? await fetchLiveBeat(due, cadenceMinutesForBeat(), selection.lanes)
            : rehearsalBeat(due);
        } catch (caught) {
          error = caught;
        }
        state.pending = false;

        if (error) {
          state.message = { kind: "error", text: `${error.message}` };
          if (error.kind === "unconfigured" && state.source === "live") {
            /* Honest fallback: keep the stage alive, but say plainly that it is no longer live. */
            state.source = "rehearsal";
            sourceSelect.value = "rehearsal";
            state.sourceNote = `Live beat unavailable (${error.message}) — switched to synthetic rehearsal. No provider call was made.`;
            state.message = { kind: "note", text: state.sourceNote };
            state.pending = true;
            result = rehearsalBeat(due);
            state.pending = false;
          } else {
            drawPanels();
            return;
          }
        }

        const now = Date.now();
        const refreshed = [];
        const moods = {};
        let unavailable = 0;
        let budgetBlocked = 0;
        let ledgerBlocked = 0;
        let alphaVantageBudgetBlocked = 0;
        let alphaVantageLedgerBlocked = 0;
        for (const instrument of result.instruments) {
          const symbol = String(instrument.symbol || "").toUpperCase();
          if (!symbol) continue;
          if (!instrument.marketContext) {
            unavailable += 1;
            if (instrument.code === "budget-exhausted") budgetBlocked += 1;
            if (instrument.code === "ledger-unavailable") ledgerBlocked += 1;
            if (instrument.code === "alpha-vantage-budget-exhausted") alphaVantageBudgetBlocked += 1;
            if (instrument.code === "alpha-vantage-ledger-unavailable") alphaVantageLedgerBlocked += 1;
            state.motions[symbol] = Beat.motion(null, { bearingBase: bearingOf(symbol) });
            state.analyses[symbol] = { status: "unavailable", message: instrument.message || "No bars were supplied for this beat.", at: now };
            continue;
          }
          const packet = MarketContext.normalizePacket(instrument.marketContext);
          const analysis = packet ? MarketContext.evaluate(packet) : null;
          const directive = Beat.motion(analysis, { bearingBase: bearingOf(symbol) });
          state.motions[symbol] = directive;
          moods[symbol] = directive.mood;
          state.analyses[symbol] = {
            at: now,
            status: directive.status,
            synthetic: directive.synthetic,
            source: directive.source,
            bars: directive.barCount,
            close: analysis && analysis.close,
            dataShape: analysis && analysis.dataShape,
            quoteCurrency: analysis && analysis.quoteCurrency,
            volumeAvailable: analysis && analysis.volumeAvailable === true,
            gauge: directive.gauge,
            marks: directive.marks,
            zone: analysis && analysis.waveTrend ? analysis.waveTrend.zone : "unknown",
            combined: analysis ? analysis.combined : "no current confluence",
            note: directive.note
          };
          refreshed.push(symbol);
        }

        const calls = state.source === "live" && result.spend
          ? Math.max(0, Number(result.spend.providerAttempts ?? result.spend.upstreamCalls) || 0)
          : 0;
        state.ledger = Beat.recordBeat(state.ledger, {
          at: now, symbols: refreshed, calls, moodBySymbol: moods,
          synthetic: state.source === "rehearsal", cadenceMinutes: cadenceMinutesForBeat()
        });
        writeLedger(state.ledger);
        state.lastBeatAt = now;
        state.beats += 1;
          state.log = [{
          at: now, reason, disc: state.discId, interval: state.interval, source: state.source, symbols: refreshed, calls,
          alphaVantageAttempts: result.spend ? Math.max(0, Number(result.spend.alphaVantageAttempts) || 0) : 0,
          unavailable, cacheHits: result.spend ? result.spend.cacheHits : 0,
          lanes: { ...state.laneBySymbol },
          moods: refreshed.map(symbol => `${symbol} ${moods[symbol] || "—"}`)
        }, ...state.log].slice(0, 12);
        state.nextBeatAt = now + beatIntervalMs();
        if (budgetBlocked) {
          const ledger = state.serverLedger;
          state.message = { kind: "refusal", text: `${budgetBlocked} due berth${budgetBlocked === 1 ? " was" : "s were"} refused by the shared D1 monthly call limit for Tickerbot${ledger ? ` (${ledger.calls.toLocaleString()} / ${ledger.workerLimit.toLocaleString()} in ${ledger.month} UTC)` : ""}. No Tickerbot request was sent for those berths.` };
        } else if (alphaVantageBudgetBlocked) {
          const ledger = state.alphaVantageDailyLedger;
          state.message = { kind: "refusal", text: `${alphaVantageBudgetBlocked} due berth${alphaVantageBudgetBlocked === 1 ? " was" : "s were"} refused by Alpha Vantage's separate daily cap${ledger ? ` (${ledger.calls.toLocaleString()} / ${ledger.dailyLimit.toLocaleString()} in ${ledger.day} UTC)` : ""}. No additional Alpha Vantage request was sent.` };
        } else if (alphaVantageLedgerBlocked) {
          state.message = { kind: "refusal", text: `${alphaVantageLedgerBlocked} due berth${alphaVantageLedgerBlocked === 1 ? " was" : "s were"} not sent to Alpha Vantage because its separate D1 daily ledger is unavailable. No request was sent.` };
        } else if (ledgerBlocked) {
          state.message = { kind: "refusal", text: `${ledgerBlocked} due berth${ledgerBlocked === 1 ? " was" : "s were"} not sent to Tickerbot because the D1 monthly call ledger is unavailable. No request was sent.` };
        } else if (state.source === "live" && state.message && ["error", "refusal"].includes(state.message.kind)) {
          state.message = refreshed.length
            ? null
            : { kind: "note", text: "No symbol in this beat returned bars. Those berths stay frozen; nothing was fabricated." };
        } else if (!state.message || state.message.kind === "error") {
          state.message = refreshed.length
            ? null
            : { kind: "note", text: "No symbol in this beat returned bars. Those berths stay frozen; nothing was fabricated." };
        }
        if (state.source === "live") {
          HOS.record("info", `Characters beat — ${refreshed.length} berth(s) refreshed from live market data (${calls} provider request${calls === 1 ? "" : "s"}, including ${result.spend ? Number(result.spend.tickerbotAttempts) || 0 : 0} Tickerbot and ${result.spend ? Number(result.spend.alphaVantageAttempts) || 0 : 0} Alpha Vantage 1mo attempts). Display-only motion.` +
            (unavailable ? ` ${unavailable} symbol(s) returned no bars and stayed frozen.` : ""));
        }
        state.displayed = { ...state.displayed };
        drawPanels();
      }

      function bearingOf(symbol) {
        const berth = stage.berths.find(entry => entry.symbol === symbol);
        return berth ? berth.angle + Math.PI / 2 : 0;
      }

      /* ── Rendering: panels ───────────────────────────────────────── */

      function drawPanels() {
        const plan = planOf();
        const currentMonth = Beat.monthKey(Date.now());
        const durable = state.serverLedgerStatus === "ready" && state.serverLedger && state.serverLedger.month === currentMonth
          ? state.serverLedger : null;
        const currentUtcDay = new Date(Date.now()).toISOString().slice(0, 10);
        const alphaVantageDaily = state.alphaVantageLedgerStatus === "ready" && state.alphaVantageDailyLedger &&
          state.alphaVantageDailyLedger.day === currentUtcDay ? state.alphaVantageDailyLedger : null;
        const alphaVantageDailyText = alphaVantageDaily
          ? `${alphaVantageDaily.calls.toLocaleString()} / ${alphaVantageDaily.dailyLimit.toLocaleString()} used · ${alphaVantageDaily.remaining.toLocaleString()} left (${alphaVantageDaily.day} UTC)`
          : state.alphaVantageLedgerStatus === "unavailable"
            ? "D1 UTC-day ledger unavailable · Alpha Vantage requests fail closed"
            : state.alphaVantageLedgerStatus === "not-configured"
              ? "Not configured · add ALPHA_VANTAGE_API_KEY for explicit 1mo mode"
              : `${ALPHA_VANTAGE_DAILY_REQUEST_CAP} Worker attempts per UTC day · all Alpha Vantage intervals`;
        const disc = DiscCatalog.disc(state.discId);
        const monthlyMode = state.interval === "1mo";
        const perBeat = perBeatOf(plan);
        const sweepBeats = Math.ceil(stage.berths.length / Math.max(1, perBeat));
        const sweepHours = monthlyMode ? sweepBeats * 24 : (sweepBeats * state.cadence) / 60;
        const cryptoRankNote = state.discId === "crypto" && state.ranking
          ? `Live ${state.ranking.provider || "CoinGecko"} ranking · ${state.ranking.metric || "trailing 24-hour total_volume, USD"}${state.ranking.rankedAt ? ` · snapshot ${stamp(state.ranking.rankedAt)}` : ""}${state.ranking.cached ? " · cached ranking" : ""}. Audit flags: ${state.ranking.audit ? `${state.ranking.audit.stablecoinCandidateCount || 0} stablecoin candidate(s), ${state.ranking.audit.missingMarketCapCount || 0} missing market cap(s), ${(state.ranking.audit.extremeNominalPriceCandidates || []).length} extreme nominal price flag(s)` : "eligibility audit unavailable"}. Constituents can include stablecoins and other eligible market-listed assets; this is a provisional volume ranking, not an investment-quality screen.`
          : (disc && disc.ranking) || "";
        $("[data-ch-disc-note]").textContent = cryptoRankNote;

        $("[data-ch-source-badge]").textContent = state.source === "rehearsal"
          ? "Synthetic rehearsal · 0 provider calls · not real market data"
          : monthlyMode
            ? "Alpha Vantage · explicit 1mo only · 25 requests/UTC day"
            : "Tickerbot Live · stock 1h/1d only · monthly Tickerbot ledger";
        $("[data-ch-source-badge]").className = `ch-source-badge${state.source === "rehearsal" ? " ch-source-badge-synthetic" : ""}`;

        const tiers = tierPlan();
        const tierOption = tierOptionOf(tiers);
        const cadencePlan = monthlyMode ? [] : Beat.compareCadences({ monthlyBudget: state.budget, castSize: stage.berths.length });
        $("[data-ch-plan-title]").textContent = monthlyMode ? "1mo mode" : "Tickerbot plan";
        const tickerbotStats = `
          <div><dt>Beats / month</dt><dd>${plan.beatsPerMonth.toLocaleString()}</dd></div>
          <div><dt>Symbols / beat</dt><dd>${perBeat}${state.stretch && plan.stretchWithinBudget ? " <span class=\"ch-stretch-tag\">stretch</span>" : ""}</dd></div>
          <div><dt>Tickerbot calls / month</dt><dd>${(perBeat * plan.beatsPerMonth).toLocaleString()} <span class="ch-dim">of ${state.budget.toLocaleString()}</span></dd></div>
          <div><dt>Reserve held</dt><dd>${plan.reserveCalls.toLocaleString()}</dd></div>
          <div><dt>Full sweep</dt><dd>${state.tierMode && tierOption
            ? `${tierOption.sweepBeats} beats · ${Beat.formatHours(tierOption.sweepHours)}`
            : `${sweepBeats} beats · ${Beat.formatHours(sweepHours)}`}</dd></div>
          ${state.tierMode && tierOption ? `<div><dt>Hot lane</dt><dd>${tierOption.hotSize} berth${tierOption.hotSize === 1 ? "" : "s"} <span class="ch-dim">every beat</span></dd></div>` : ""}`;
        const monthlyStats = `
          <div><dt>Bar interval</dt><dd>1mo · Alpha Vantage only</dd></div>
          <div><dt>Requests / beat</dt><dd>up to ${perBeat} instruments</dd></div>
          <div><dt>UTC-day request cap</dt><dd>${ALPHA_VANTAGE_DAILY_REQUEST_CAP} Alpha Vantage requests</dd></div>
          <div><dt>Approx. full Disc rotation</dt><dd>${sweepBeats} daily beat${sweepBeats === 1 ? "" : "s"} · about ${sweepBeats} day${sweepBeats === 1 ? "" : "s"}</dd></div>`;
        const tickerbotLedgerRow = monthlyMode
          ? `<div><dt>Tickerbot UTC-month ledger</dt><dd><span class="ch-dim">Not used in 1mo mode</span></dd></div>`
          : `<div><dt>D1 snapshot · Tickerbot / month</dt><dd>${durable
            ? `${durable.calls.toLocaleString()} <span class="ch-dim">· last confirmed; ${durable.remaining.toLocaleString()} of ${durable.workerLimit.toLocaleString()} left</span>`
            : `<span class="ch-dim">${state.serverLedgerStatus === "unavailable" ? "no current D1 snapshot · Tickerbot calls fail closed" : state.serverLedgerStatus === "not-configured" ? "Tickerbot secret not configured" : "awaiting Worker ledger"}</span>`}</dd></div>`;
        const monthlyCadenceControls = cadencePlan.length ? `<div class="ch-cadence-row">${cadencePlan.map(option => `
          <button class="ch-cadence-chip${option.cadenceMinutes === state.cadence ? " active" : ""}" data-ch-cadence-chip="${option.cadenceMinutes}"
            title="${option.callsPerBeat} Tickerbot calls/beat · ${option.callsPerMonth.toLocaleString()} Tickerbot calls/month · ${Beat.formatHours(option.sweepHours)} sweep">
            ${Beat.formatHours(option.cadenceMinutes / 60)}<small>${option.callsPerBeat}/beat</small>
            <i class="ch-chip-bar"><b style="width:${Math.round(Math.min(1, option.budgetUseRatio) * 100)}%"></b></i>
          </button>`).join("")}</div>` : "";
        $("[data-ch-plan]").innerHTML = `
          <dl class="ch-stats">
            ${monthlyMode ? monthlyStats : tickerbotStats}
            ${tickerbotLedgerRow}
            <div><dt>Alpha Vantage UTC-day cap</dt><dd><span class="ch-dim">${monthlyMode ? alphaVantageDailyText : "Not used for stock 1h/1d; explicit 1mo mode only"}</span></dd></div>
          </dl>${monthlyCadenceControls}`;
        const tierFeasible = tiers.options.some(option => option.feasible);
        $("[data-ch-tier-panel]").innerHTML = monthlyMode
          ? `<p class="ch-fineprint">Two-lane Tickerbot rotation is disabled in explicit 1mo mode.</p>`
          : !tierFeasible ? `<p class="ch-fineprint">${tiers.notes.join(" ")}</p>` : state.tierMode ? `
          <div class="ch-tier-wheel">
            ${tiers.options.map(option => `
              <button class="ch-tier-chip${option.feasible ? "" : " infeasible"}${tierOption && option.targetSweepHours === tierOption.targetSweepHours ? " active" : ""}"
                data-ch-tier-target="${option.targetSweepHours}"
                title="${option.feasible
                  ? `${option.hotSize} hot every beat · sweep of ${option.sweepSize} in ${option.sweepHours}h · same ${option.callsPerMonth.toLocaleString()} Tickerbot calls/month`
                  : (option.notes[0] || "No tier split fits this window")}">
                <b>${option.feasible ? `${option.hotSize} hot` : "—"}</b>
                <small>all in ${option.targetSweepHours}h</small>
              </button>`).join("")}
          </div>
          <p class="ch-fineprint">${tierOption
            ? `${tierOption.hotSize} berth${tierOption.hotSize === 1 ? "" : "s"} (your featured tickers) refreshed every beat, ${tierOption.sweepPerBeat} sweep berth${tierOption.sweepPerBeat === 1 ? "" : "s"} per beat. ${tiers.notes.join(" ")}`
            : tiers.notes.join(" ")}</p>
          ${state.ledger.featured.length === 0 ? `<p class="ch-fineprint ch-warn-text">No featured ticker yet: pick a berth on the stage and press Feature to nominate the hot lane.</p>` : ""}
          ${tierOption && !tierOption.withinWindow ? `<p class="ch-fineprint">This window is not reached at this plan; the sweep finishes in ${Beat.formatHours(tierOption.sweepHours)}.</p>` : ""}`
          : "";

        $("[data-ch-plan-tag]").textContent = monthlyMode
          ? "Alpha Vantage · UTC-day cap"
          : state.tierMode && tierOption
            ? `two-lane · ${tierOption.hotSize} hot / ${tierOption.sweepPerBeat} sweep`
            : `${state.cadence}-minute plan`;
        $("[data-ch-plan-note]").textContent = monthlyMode
          ? `The Worker requests only explicit 1mo Alpha Vantage data, capped at ${ALPHA_VANTAGE_DAILY_REQUEST_CAP} requests per UTC day, independent of requested bar interval. A beat selects at most ${perBeat} instruments; the full ${stage.berths.length}-instrument Disc takes about ${sweepBeats} daily beats at the live cadence. Tickerbot and its monthly ledger are not used. ${alphaVantageDailyText}.`
          : `${perBeat} symbols per beat at ${state.cadence} minutes projects ${(perBeat * plan.beatsPerMonth).toLocaleString()} Tickerbot calls/month (${Math.round((perBeat * plan.beatsPerMonth / state.budget) * 100)}% of the planning budget). ${plan.notes.join(" ")} The monthly field changes the Tickerbot plan only; the Worker separately caps Tickerbot at 10,000 attempts/month and Alpha Vantage at 25 requests per UTC day in explicit 1mo mode. Alpha Vantage is not a daily-bar fallback.`;
        stretchBox.disabled = monthlyMode || !plan.stretchWithinBudget || state.pending;
        stretchBox.checked = state.stretch && plan.stretchWithinBudget && !monthlyMode;
        tierBox.checked = state.tierMode && !monthlyMode;
        tierBox.disabled = monthlyMode || state.pending || !tiers.options.some(option => option.feasible);

        const focused = state.focus;
        const berth = stage.berths.find(entry => entry.symbol === focused);
        const directive = state.motions[focused];
        const analysis = state.analyses[focused];
        $("[data-ch-detail-title]").textContent = berth ? `${berth.displaySymbol} · ${berth.npc.name}` : "Berth";
        $("[data-ch-detail]").innerHTML = berth ? `
          <p class="ch-detail-role">${esc(berth.name)} · ${esc(berth.assetClass)} · ${esc(berth.quoteCurrency)} — ${esc(berth.npc.role)}; posted to ${esc(berth.sectorName)}.${berth.tags.length ? ` Tags: ${berth.tags.map(esc).join(", ")}.` : ""}</p>
          ${berth.rank || berth.volumeUsd || berth.currentPriceUsd || berth.marketCapUsd ? `<p class="ch-fineprint">${berth.assetClass === "fx" ? "BIS FX turnover rank" : "Disc rank"} ${berth.rank || "—"}${berth.rankingProvider ? ` · ${esc(berth.rankingProvider)}` : ""}${berth.volumeUsd ? ` · trailing 24h volume ${compactUsd(berth.volumeUsd)}` : ""}${berth.currentPriceUsd ? ` · price ${compactUsd(berth.currentPriceUsd)}` : ""}${berth.marketCapUsd ? ` · market cap ${compactUsd(berth.marketCapUsd)}` : ""}</p>` : ""}
          ${Array.isArray(berth.audit) && berth.audit.length ? `<p class="ch-fineprint">Ranking audit flags: ${berth.audit.map(flag => esc(String(flag).replace(/-/g, " "))).join(" · ")}</p>` : ""}
          <p class="ch-detail-caption">${esc(directive ? directive.caption : "No beat has reached this berth yet.")}</p>
          ${directive ? `
            <dl class="ch-gauges">
              <div><dt>Bias vs basis</dt><dd>${signed(directive.gauge.bias)} ${meter(Math.abs(directive.gauge.bias))}</dd></div>
              <div><dt>Flow (VFI − signal)</dt><dd>${directive.gauge.flowAvailable ? `${signed(directive.gauge.flow)} ${meter(Math.abs(directive.gauge.flow))}` : "n/a · VFI unavailable"}</dd></div>
              <div><dt>Heat (WaveTrend)</dt><dd>${directive.gauge.heat.toFixed(2)} ${meter(directive.gauge.heat)}</dd></div>
              <div><dt>Charge (volatility)</dt><dd>${directive.gauge.charge.toFixed(2)} ${meter(directive.gauge.charge)}</dd></div>
              <div><dt>Crowd (relative volume)</dt><dd>${directive.gauge.crowdAvailable ? `${directive.gauge.crowd.toFixed(2)} ${meter(directive.gauge.crowd)}` : "n/a · volume unavailable"}</dd></div>
            </dl>
            <p class="ch-detail-marks">${directive.marks.length ? directive.marks.map(mark => `<span>${esc(mark)}</span>`).join("") : "<span class=\"ch-dim\">No indicator events on the latest closed bar.</span>"}</p>
            <p class="ch-fineprint">${analysis && Number.isFinite(Number(analysis.bars))
              ? `${esc(analysis.combined || "Market context ready")} · ${esc(analysis.zone || "unknown")} · ${analysis.bars} bars · ${esc(analysis.dataShape || berth.dataShape)} · quote ${esc(analysis.quoteCurrency || berth.quoteCurrency)} · volume ${analysis.volumeAvailable ? "available" : "unavailable"}`
              : analysis && analysis.status === "unavailable" ? `No market observations · ${esc(analysis.message || "the provider returned no usable observations")}` : ""}
            ${analysis && analysis.synthetic ? " · SYNTHETIC REHEARSAL" : analysis && analysis.source ? ` · ${esc(analysis.source)}` : ""}</p>` : ""}
          <p class="ch-fineprint">NPC ${directive ? `${directive.npc.formation} formation · speed ${directive.npc.speed.toFixed(2)} · stride ${directive.npc.stride.toFixed(2)} · jitter ${directive.npc.jitter.toFixed(2)}` : "—"}
          · Object ${directive ? `sway ${directive.object.sway.toFixed(2)} · aperture ${directive.object.aperture.toFixed(2)}` : "—"}
          · Item ${directive ? `${directive.item.lane} at ${directive.item.rate.toFixed(2)}/beat` : "—"}</p>
          <p class="ch-fineprint">${analysis ? `Last beat ${clock(analysis.at)} · ${directive ? directive.status : "unknown"}` : "Awaiting its first beat."}${
            state.laneBySymbol[focused] ? ` · ${state.laneBySymbol[focused] === "hot" ? "hot lane" : "sweep lane"}` : ""}${
            state.ledger.featured.includes(focused) ? " · nominated for the hot lane" : ""}</p>` : "";

        $("[data-ch-log]").innerHTML = state.log.length ? state.log.map(entry => `
          <li>
            <span class="ch-log-time">${clock(entry.at)}</span>
            <span class="ch-log-source ${entry.source === "rehearsal" ? "synthetic" : ""}">${entry.source === "rehearsal" ? "SYNTH" : `${esc(entry.disc)} ${esc(entry.interval)} · LIVE ${entry.calls} request${entry.calls === 1 ? "" : "s"}${entry.alphaVantageAttempts ? ` · Alpha 1mo ${entry.alphaVantageAttempts}` : ""}`}</span>
            <span class="ch-log-body">${entry.symbols.length ? entry.symbols.map(symbol => {
              const lane = entry.lanes && entry.lanes[symbol];
              const laneMark = lane === "hot" || lane === "sweep"
                ? `<i class="ch-lane ch-lane-${lane}">${lane === "hot" ? "H" : "S"}</i>`
                : "";
              return `${laneMark}<b>${esc(symbol)}</b> ${esc((state.motions[symbol] || {}).mood || "—")}`;
            }).join(" · ") : "no symbols due"}${
              entry.unavailable ? ` <em class="ch-warn">${entry.unavailable} unavailable</em>` : ""}</span>
          </li>`).join("") : `<li class="ch-log-empty">No beats recorded in this session.</li>`;
        $("[data-ch-beatcount]").textContent = `${state.ledger.beats} beat${state.ledger.beats === 1 ? "" : "s"}`;
        $("[data-ch-ledger]").textContent = `${state.ledger.calls.toLocaleString()} Character call${state.ledger.calls === 1 ? "" : "s"} in ${state.ledger.month} (browser only)`;
        $("[data-ch-durable-ledger]").textContent = monthlyMode
          ? "Not used for explicit Alpha Vantage 1mo requests."
          : durable
            ? `${durable.calls.toLocaleString()} / ${durable.workerLimit.toLocaleString()} Worker attempts in ${durable.month} UTC · ${durable.remaining.toLocaleString()} left${state.serverLedgerStatus === "unavailable" ? " · last known; D1 currently unavailable" : ""}`
            : state.serverLedgerStatus === "unavailable"
              ? "No D1 snapshot reported — the live route refused or the Tickerbot ledger is unavailable; Tickerbot fetches fail closed."
              : state.serverLedgerStatus === "not-configured"
                ? "Tickerbot is not configured; explicit 1mo mode uses a separate Alpha Vantage path."
                : "Waiting for the first live beat.";
        $("[data-ch-stage-note]").textContent = state.message
          ? state.message.text
          : state.lastBeatAt
            ? (state.source === "rehearsal"
              ? `Rehearsing every ${REHEARSAL_BEAT_MS / 1000}s with synthetic bars — compressed for preview, 0 provider calls.`
              : `Next automatic beat in ${since(Date.now(), state.nextBeatAt)}. Positions hold between beats; no calls are spent meanwhile.${state.tierMode ? " Two-lane beat: featured berths every beat, the rest walking the sweep." : ""}`)
            : "No beat yet. Characters stand at their berths; nothing has been invented.";
        $("[data-ch-disclaimer]").innerHTML = `Motion, formations, and item flow are a display metaphor for available market observations. They are not investment advice, a trade signal, a recommendation, or permission to act; indicator event labels are display-only. Missing OHLC or volume fields are not fabricated, and volume-based measures are unavailable when volume is absent. Stock 1h/1d requests use Tickerbot under its 10,000-per-UTC-month Worker cap. Explicit 1mo requests use Alpha Vantage only under a separate 25-requests-per-UTC-day Worker cap; monthly data never substitutes for daily bars. Direct provider calls are outside those ledgers.`;
        featureButton.textContent = state.ledger.featured.includes(focused) ? "Featured ★" : "Feature";
        autoButton.textContent = `Auto-beat: ${state.auto ? "on" : "off"}`;
        autoButton.setAttribute("aria-pressed", String(state.auto));
      }

      /* ── Rendering: the stage ────────────────────────────────────── */

      let stageSize = { width: 880, height: 620, ratio: 1 };

      function resizeCanvas() {
        const rect = stageHost.getBoundingClientRect();
        const width = Math.max(320, Math.round(rect.width));
        const height = Math.max(280, Math.round(Math.min(rect.height || width * 0.7, width * 0.78)));
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        if (width === stageSize.width && height === stageSize.height && ratio === stageSize.ratio) return;
        stageSize = { width, height, ratio };
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      const polar = (cx, cy, radius, angle) => [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];

      function itemSprites(now) {
        for (const berth of stage.berths) {
          const directive = state.displayed[berth.symbol];
          const list = state.items.get(berth.symbol) || [];
          const rate = directive && !directive.frozen ? directive.item.rate : 0;
          const last = list.length ? list[list.length - 1].born : 0;
          const spacing = rate > 0 ? 2600 / rate : Infinity;
          if (rate > 0 && now - last >= spacing && list.length < 6) {
            list.push({
              born: now,
              life: 5200,
              lane: directive.item.lane,
              glyph: berth.item.glyph,
              color: berth.item.color.hex,
              seed: (Beat.hash32(`${berth.symbol}:${list.length}`) % 1000) / 1000
            });
          }
          state.items.set(berth.symbol, list.filter(item => now - item.born < item.life && Number.isFinite(item.born)));
        }
      }

      function wiggle(seed, now, amount) {
        const bucket = Math.floor(now / 160) + seed;
        const random = ((Beat.hash32(`w${bucket}`) >>> 8) % 1000) / 1000;
        return (random - 0.5) * 2 * amount;
      }

      function drawStage(now) {
        if (!context2d) return;
        const { width, height, ratio } = stageSize;
        context2d.setTransform(ratio, 0, 0, ratio, 0, 0);
        context2d.clearRect(0, 0, width, height);
        const cx = width / 2;
        const cy = height / 2;
        const radius = Math.min(width, height) / 2 - 26;

        const background = context2d.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius * 1.05);
        background.addColorStop(0, "rgba(24, 36, 60, 0.95)");
        background.addColorStop(1, "rgba(6, 10, 18, 0.98)");
        context2d.fillStyle = background;
        context2d.fillRect(0, 0, width, height);

        /* Ring guides */
        context2d.strokeStyle = "rgba(140, 170, 220, 0.10)";
        context2d.lineWidth = 1;
        [0.28, 0.5, 0.68, 0.88].forEach(fraction => {
          context2d.beginPath();
          context2d.arc(cx, cy, radius * fraction, 0, Math.PI * 2);
          context2d.stroke();
        });

        /* Hub */
        const hubPulse = state.lastBeatAt ? Math.max(0, 1 - (now - state.lastBeatAt) / 1400) : 0;
        context2d.fillStyle = `rgba(255, 212, 121, ${0.10 + hubPulse * 0.25})`;
        context2d.beginPath();
        context2d.arc(cx, cy, radius * (0.10 + hubPulse * 0.03), 0, Math.PI * 2);
        context2d.fill();
        context2d.fillStyle = "rgba(255, 212, 121, 0.85)";
        context2d.font = "9px ui-monospace, monospace";
        context2d.textAlign = "center";
        context2d.fillText("CENTER", cx, cy - 2);
        context2d.fillText("ORIGIN", cx, cy + 8);

        /* Sector arcs + sector objects */
        for (const sector of stage.sectors) {
          context2d.strokeStyle = `${sector.tint.hex}44`;
          context2d.lineWidth = 8;
          context2d.beginPath();
          context2d.arc(cx, cy, radius * 0.965, sector.arcStart, sector.arcEnd);
          context2d.stroke();

          const members = sector.symbols.map(entry => state.displayed[entry.symbol]).filter(Boolean);
          const objectState = members.length ? {
            sway: members.reduce((sum, directive) => sum + directive.object.sway, 0) / members.length,
            pulse: members.reduce((sum, directive) => sum + directive.object.pulse, 0) / members.length,
            aperture: members.reduce((sum, directive) => sum + directive.object.aperture, 0) / members.length
          } : { sway: 0, pulse: 0, aperture: 0 };
          const [objectX, objectY] = polar(cx, cy, radius * 1.0, sector.midAngle);
          const tilt = Math.sin(now / 520 + sector.midAngle * 3) * objectState.sway * 0.09;
          context2d.save();
          context2d.translate(objectX, objectY);
          context2d.rotate(tilt);
          const glow = 0.35 + objectState.pulse * 0.65;
          context2d.fillStyle = `${sector.tint.hex}${Math.round(glow * 255).toString(16).padStart(2, "0")}`;
          context2d.font = "15px ui-monospace, monospace";
          context2d.textAlign = "center";
          context2d.fillText(sector.object.glyph, 0, 5);
          if (objectState.aperture > 0.85) {
            context2d.strokeStyle = `${sector.tint.hex}cc`;
            context2d.lineWidth = 2;
            context2d.beginPath();
            context2d.arc(0, 0, 11 + Math.sin(now / 220) * 2, 0, Math.PI * 2);
            context2d.stroke();
          }
          context2d.restore();

          const [labelX, labelY] = polar(cx, cy, radius * 0.90, sector.midAngle);
          context2d.save();
          context2d.translate(labelX, labelY);
          context2d.rotate(sector.midAngle + Math.PI / 2);
          context2d.fillStyle = `${sector.tint.hex}bb`;
          context2d.font = "8px ui-monospace, monospace";
          context2d.fillText(sector.name.toUpperCase().slice(0, 26), 0, 0);
          context2d.restore();
        }

        itemSprites(now);

        /* Berths */
        for (const berth of stage.berths) {
          const directive = state.displayed[berth.symbol] || IDLE_MOTION;
          const target = state.motions[berth.symbol];
          const age = target && state.lastBeatAt ? now - state.lastBeatAt : 0;
          const lit = directive.frozen ? 0.12 : 0.42 + 0.5 * Math.max(0, 1 - age / (beatIntervalMs() * 1.2));
          const [berthX, berthY] = polar(cx, cy, radius * berth.radius, berth.angle);

          /* Items flow along the lane between the hub and this berth. */
          for (const item of state.items.get(berth.symbol) || []) {
            const progress = Math.max(0, Math.min(1, (now - item.born) / item.life));
            const from = item.lane === "inbound" ? berth.radius : 0.16;
            const to = item.lane === "inbound" ? 0.16 : berth.radius;
            const laneRadius = radius * (from + (to - from) * progress);
            const [itemX, itemY] = polar(cx, cy, laneRadius, berth.angle + wiggle(item.seed * 97, now, 0.05));
            context2d.globalAlpha = (1 - progress) * 0.85;
            context2d.fillStyle = item.color;
            context2d.font = "9px ui-monospace, monospace";
            context2d.textAlign = "center";
            context2d.fillText(item.glyph, itemX, itemY + Math.sin(now / 240 + item.seed * 6) * 2);
            context2d.globalAlpha = 1;
          }

          /* Berth marker + ticker label */
          context2d.fillStyle = `rgba(120, 150, 200, ${0.25 + lit * 0.6})`;
          context2d.beginPath();
          context2d.arc(berthX, berthY, 2.2, 0, Math.PI * 2);
          context2d.fill();
          if (directive && !directive.frozen) {
            context2d.strokeStyle = `${berth.sectorTint.hex}${Math.round(lit * 200).toString(16).padStart(2, "0")}`;
            context2d.lineWidth = 1;
            context2d.beginPath();
            context2d.arc(berthX, berthY, 4.5 + directive.gauge.heat * 3, 0, Math.PI * 2);
            context2d.stroke();
          }

          /* The NPC walker: a patrolling dot with a badge. */
          const formationRadius = directive.npc.formation === "rim" ? 1.06
            : directive.npc.formation === "tight" ? 0.94
              : directive.npc.formation === "column" ? 1.0 : 1.0;
          const span = Math.min(0.16, (Math.PI * 2) / Math.max(6, stage.berths.length) * 0.7);
          const speed = directive.frozen ? 0 : directive.npc.speed;
          const period = 9000 / (0.18 + speed);
          const phase = (now / period) * Math.PI * 2 * (directive.gauge.bias >= 0 ? 1 : -1) + (Beat.hash32(berth.symbol) % 628) / 100;
          const walkAngle = berth.angle + Math.sin(phase) * span * (directive.npc.formation === "scatter" ? 1.4 : 0.9);
          const walkRadius = berth.radius * formationRadius + Math.sin(phase * 2) * 0.012 + wiggle(Beat.hash32(berth.symbol), now, directive.npc.jitter * 0.012);
          const [npcX, npcY] = polar(cx, cy, radius * walkRadius, walkAngle);
          const npcSize = 3.4 + directive.npc.stride * 1.6;
          context2d.fillStyle = directive.frozen ? "rgba(150, 165, 190, 0.45)" : berth.sectorTint.hex;
          context2d.globalAlpha = directive.frozen ? 0.5 : 0.95;
          context2d.beginPath();
          context2d.arc(npcX, npcY, npcSize, 0, Math.PI * 2);
          context2d.fill();
          context2d.globalAlpha = 1;
          context2d.fillStyle = "rgba(10, 16, 26, 0.9)";
          context2d.font = "6px ui-monospace, monospace";
          context2d.textAlign = "center";
          context2d.fillText(berth.npc.glyph, npcX, npcY + 2);

          /* Focus ring + label */
          const focused = state.focus === berth.symbol;
          if (focused) {
            context2d.strokeStyle = "rgba(255, 212, 121, 0.9)";
            context2d.lineWidth = 1.4;
            context2d.beginPath();
            context2d.arc(npcX, npcY, npcSize + 5, 0, Math.PI * 2);
            context2d.stroke();
          }
          if (focused || lit > 0.6) {
            const [labelX, labelY] = polar(cx, cy, radius * (berth.radius - 0.075), walkAngle);
            context2d.fillStyle = focused ? "rgba(255, 233, 163, 0.95)" : `rgba(200, 216, 240, ${0.35 + lit * 0.5})`;
            context2d.font = `${focused ? "bold " : ""}8px ui-monospace, monospace`;
            context2d.textAlign = "center";
            context2d.fillText(berth.symbol, labelX, labelY);
          }
        }

        if (state.source === "rehearsal") {
          context2d.fillStyle = "rgba(255, 149, 64, 0.16)";
          context2d.font = "bold 11px ui-monospace, monospace";
          context2d.textAlign = "center";
          context2d.fillText("SYNTHETIC REHEARSAL — NOT REAL MARKET DATA", cx, height - 12);
        }
      }

      function animate() {
        const now = Date.now();
        const interval = beatIntervalMs();
        for (const symbol of symbols) {
          const target = state.motions[symbol];
          if (!target) continue;
          const record = state.blends[symbol];
          if (!record || record.to !== target) {
            /* A new beat arrived: glide from whatever is on screen now. Blending is
               skipped entirely once the glide completes, so a held beat costs nothing. */
            state.blends[symbol] = { from: state.displayed[symbol] || target, to: target, startedAt: now };
          }
          const glide = state.blends[symbol];
          const ratio = Math.max(0, Math.min(1, (now - glide.startedAt) / Math.min(interval, 6000)));
          state.displayed[symbol] = ratio >= 1 ? target : (glide.from === target ? target : Beat.blend(glide.from, target, ratio));
        }
        resizeCanvas();
        drawStage(now);
        if (!reduceMotion) requestAnimationFrame(animate);
      }

      /* ── Wiring ──────────────────────────────────────────────────── */

      let beatTimer = null;
      function schedule() {
        if (beatTimer) clearTimeout(beatTimer);
        beatTimer = null;
        if (!state.auto) return;
        beatTimer = setTimeout(async () => {
          if (document.hidden) {
            /* A hidden tab does not spend calls; the ledger says so. */
            state.message = { kind: "note", text: "Auto-beat paused while this tab was hidden — no calls were spent. It resumes on the next visible beat." };
            drawPanels();
            schedule();
            return;
          }
          await beatNow("auto");
          schedule();
        }, beatIntervalMs());
      }

      async function switchDisc(discId) {
        const disc = DiscCatalog.disc(discId);
        if (!disc || state.pending) {
          discSelect.value = state.discId;
          return;
        }
        const previousDisc = state.discId;
        discSelect.disabled = true;
        state.message = { kind: "note", text: `Loading ${disc.label} catalog…` };
        drawPanels();
        try {
          let entries;
          let ranking = null;
          if (discId === "stocks") {
            entries = watchlist;
          } else if (discId === "crypto") {
            const fetcher = window.fetch || globalThis.fetch;
            const response = await fetcher("/api/characters/v1/discs?disc=crypto", {
              method: "GET", credentials: "same-origin", cache: "no-store", redirect: "error",
              headers: { Accept: "application/json" }
            });
            let payload = null;
            try { payload = await response.json(); } catch { /* reported below */ }
            if (!response.ok || !payload || payload.success !== true || !Array.isArray(payload.instruments) || payload.instruments.length !== 52) {
              throw new Error(payload && payload.message || `The crypto ranking route answered HTTP ${response.status}.`);
            }
            entries = payload.instruments;
            ranking = payload.ranking || null;
          } else {
            entries = DiscCatalog.staticInstruments(discId);
          }
          if (!Array.isArray(entries) || !entries.length) throw new Error(`No reviewed instruments are available for ${disc.label}.`);

          state.discId = discId;
          activeDisc.current = discId;
          state.ranking = ranking;
          activeDisc.ranking = ranking;
          stage = Cast.build(entries, { discId });
          symbols = stage.berths.map(berth => berth.symbol);
          resetStageForSelection();
          state.message = { kind: "note", text: disc.ranking };
          discSelect.value = discId;
          drawPanels();
          await beatNow("disc-change");
          schedule();
        } catch (error) {
          discSelect.value = previousDisc;
          state.message = { kind: "error", text: error && error.message || `Unable to load ${disc.label}.` };
          drawPanels();
        } finally {
          discSelect.disabled = state.pending;
        }
      }

      function switchInterval(nextInterval) {
        const disc = DiscCatalog.disc(state.discId);
        if (!disc || !disc.intervalModes.includes(nextInterval) || state.pending) {
          intervalSelect.value = state.interval;
          return;
        }
        if (nextInterval === state.interval) return;
        state.interval = nextInterval;
        state.tierMode = false;
        state.stretch = false;
        state.motions = {};
        state.displayed = {};
        state.analyses = {};
        state.blends = {};
        state.items = new Map();
        state.lastBeatAt = 0;
        state.nextBeatAt = Date.now();
        state.log = [];
        state.ledger = readLedger(state.discId, state.interval);
        configureIntervalOptions(state.discId, state.interval);
        state.message = nextInterval === "1mo"
          ? { kind: "note", text: "Explicit 1mo mode: Alpha Vantage monthly observations only. Tickerbot is not called, and these bars never answer 1h or 1d requests." }
          : { kind: "note", text: `Tickerbot ${nextInterval} mode selected. Alpha Vantage is not a daily/hourly fallback; this is a separate provider path.` };
        drawPanels();
        if (state.source === "live") beatNow("interval-change");
        schedule();
      }

      discSelect.addEventListener("change", () => { switchDisc(discSelect.value); });
      cadenceSelect.addEventListener("change", () => {
        state.cadence = Number(cadenceSelect.value) || Beat.DEFAULTS.cadenceMinutes;
        drawPanels();
        schedule();
      });
      intervalSelect.addEventListener("change", () => { switchInterval(intervalSelect.value); });
      budgetInput.addEventListener("change", () => {
        state.budget = Math.min(Beat.DEFAULTS.monthlyBudget,
          Math.max(100, Math.round(Number(budgetInput.value) || Beat.DEFAULTS.monthlyBudget)));
        budgetInput.value = String(state.budget);
        drawPanels();
      });
      /* Switching source clears what is on the stage: a synthetic glide must never sit on
         top of live motion (or the reverse). The berths hold their last beat until the next
         one arrives from the newly selected source. */
      function switchSource(next) {
        if (next === state.source) return;
        state.source = next;
        state.motions = {};
        state.displayed = {};
        state.blends = {};
        state.items = new Map();
        state.message = next === "rehearsal"
          ? { kind: "note", text: "Synthetic rehearsal selected: deterministic generated bars, 0 provider calls, clearly labeled. Switch to live provider data for real observations." }
          : state.interval === "1mo"
            ? { kind: "note", text: "Live 1mo mode uses Alpha Vantage monthly observations only. The Worker caps Alpha Vantage at 25 requests per UTC day, independent of interval." }
            : { kind: "note", text: "Live 1h/1d mode uses Tickerbot. Alpha Vantage is not used as a daily-bar fallback; choose explicit 1mo for monthly observations." };
        drawPanels();
        schedule();
      }

      sourceSelect.addEventListener("change", () => switchSource(sourceSelect.value === "rehearsal" ? "rehearsal" : "live"));
      focusSelect.addEventListener("change", () => { state.focus = focusSelect.value; drawStage(Date.now()); drawPanels(); });
      autoButton.addEventListener("click", () => { state.auto = !state.auto; drawPanels(); schedule(); });
      beatButton.addEventListener("click", () => { beatNow("manual"); });
      stretchBox.addEventListener("change", () => { state.stretch = stretchBox.checked; drawPanels(); });
      tierBox.addEventListener("change", () => {
        state.tierMode = tierBox.checked;
        state.message = state.tierMode
          ? { kind: "note", text: "Two-lane Tickerbot rotation enabled: featured berths refresh every beat and remaining calls walk the sweep. Monthly 1mo mode does not use the Tickerbot lanes." }
          : { kind: "note", text: "Two-lane Tickerbot rotation disabled: the plain least-recently-refreshed rotation returns. Monthly 1mo mode does not use the Tickerbot lanes." };
        drawPanels();
      });
      featureButton.addEventListener("click", () => {
        const featured = new Set(state.ledger.featured);
        if (featured.has(state.focus)) featured.delete(state.focus);
        else featured.add(state.focus);
        state.ledger = { ...state.ledger, featured: [...featured] };
        writeLedger(state.ledger);
        if (state.tierMode) {
          const tiers = tierPlan();
          const option = tierOptionOf(tiers);
          state.message = featured.has(state.focus)
            ? { kind: "note", text: `${state.focus} joins the hot lane — it refreshes every beat${option ? ` alongside ${Math.max(0, option.hotSize - 1)} other berth${option.hotSize - 1 === 1 ? "" : "s"}` : ""}. No extra provider calls.` }
            : { kind: "note", text: `${state.focus} leaves the hot lane and returns to the sweep. No extra provider calls.` };
        }
        drawPanels();
      });
      body.addEventListener("click", event => {
        const tierChip = event.target.closest("[data-ch-tier-target]");
        if (tierChip) {
          const target = Number(tierChip.getAttribute("data-ch-tier-target"));
          if (Beat.TIER_SWEEP_HOURS.includes(target)) {
            state.tierSweepHours = target;
            drawPanels();
          }
          return;
        }
        const chip = event.target.closest("[data-ch-cadence-chip]");
        if (!chip) return;
        state.cadence = Number(chip.getAttribute("data-ch-cadence-chip")) || state.cadence;
        cadenceSelect.value = String(state.cadence);
        drawPanels();
        schedule();
      });
      canvas.addEventListener("click", event => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const radius = Math.min(rect.width, rect.height) / 2 - 26;
        let best = null;
        for (const berth of stage.berths) {
          const [bx, by] = polar(cx, cy, radius * berth.radius, berth.angle);
          const distance = Math.hypot(bx - x, by - y);
          if (!best || distance < best.distance) best = { symbol: berth.symbol, distance };
        }
        if (best && best.distance < 22) {
          state.focus = best.symbol;
          focusSelect.value = best.symbol;
          drawPanels();
        }
      });

      if (window.ResizeObserver) new ResizeObserver(() => { resizeCanvas(); if (reduceMotion) drawStage(Date.now()); }).observe(stageHost);
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden && state.auto) schedule();
      });

      configureIntervalOptions(state.discId, state.interval);
      updateFocusOptions();
      resizeCanvas();
      drawPanels();
      state.nextBeatAt = Date.now();
      if (reduceMotion) drawStage(Date.now());
      else requestAnimationFrame(animate);
      /* First beat on open, so the stage answers immediately instead of waiting a full cadence. */
      beatNow("open");
      schedule();
    }
  });
})();
