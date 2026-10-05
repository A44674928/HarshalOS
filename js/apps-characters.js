/* HarshalOS — Characters: Objects, NPCs, and Items moved by a display-only market beat.

   Three-provider boundary:
   • Tickerbot exclusively serves the reviewed Disc1 stock sphere.
   • Kraken public Spot serves Disc3 ranking and exact-pair daily OHLC.
   • Massive serves reviewed FX, active futures, and index daily bars.

   Alpha Vantage/1mo is disabled for new beats; historical records may be
   displayed only as archived legacy history.

   Price-only series do not acquire invented OHLC or volume. Everything on this
   stage is display-only: no beat authorizes an action or becomes investment
   advice. No bars means no motion; a berth without data stands still.
   */
"use strict";

(() => {
  const STORAGE_KEY = "harshalos.characters.ledger.v1";
      const savedBeatSessionId = window.GoodIntelligenceOrb2?.getSavedBeatSessionId?.() || "";
      const savedBeatsEndpoint = "/api/orb2/v1/beats";
  const REHEARSAL_BEAT_MS = 5000; // synthetic rehearsal only — never a live cadence
  const MASSIVE_DAILY_REQUEST_CAP = 300;
  const MASSIVE_REQUESTS_PER_MINUTE = 5;
  const MASSIVE_BEAT_MS = Math.ceil(60_000 / MASSIVE_REQUESTS_PER_MINUTE);
  const KRAKEN_BEAT_MS = 60_000;
  /* cadence=1 is the daily-bar contract, not a provider cooldown. The Worker
     enforces separate shared pacing envelopes for Massive and Kraken. */

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
  const normalizeDailyLedger = value => {
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
  const normalizeMassiveDailyLedger = normalizeDailyLedger;
  const normalizeKrakenDailyLedger = normalizeDailyLedger;

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
        /* Disc1 defaults to Tickerbot daily; changing Disc selects its
           provider-specific daily route (Kraken for crypto, Massive otherwise). */
        interval: "1d",
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
        massiveDailyLedger: null,
        massiveLedgerStatus: "waiting",
        krakenDailyLedger: null,
        krakenLedgerStatus: "waiting",
        /* Featured tickers double as the hot lane; the browser ledger is where that choice lives. */
        motions: {},          // symbol -> latest directive from the engine
        displayed: {},        // symbol -> directive blended for rendering
        analyses: {},         // symbol -> small readout for the detail card
        items: new Map(),     // symbol -> live item sprites
        log: [],
        archivedBeatLog: [],
        savedBeatsAvailable: false,
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
              <p class="ch-lede">Select a Disc to cast the reviewed stock deck, BIS FX instruments, Kraken Spot-ranked crypto, commodities, or indices. Tickerbot exclusively serves Disc1 stocks at 1h/1d; Kraken public Spot serves Disc3 at 1d; Massive serves FX, futures, and indices at 1d. Alpha Vantage/1mo is not selectable or savable; archived records remain history only. Missing fields stay missing; re-drawing the stage spends no provider calls.</p>
            </div>
            <div class="ch-source-badge" data-ch-source-badge>Synthetic rehearsal · 0 calls</div>
          </header>

          <section class="ch-controls">
            <label class="ch-control"><span>DISC</span>
              <select data-ch-disc>${DiscCatalog.discs.map(disc => `<option value="${esc(disc.id)}">${esc(disc.label)}</option>`).join("")}</select>
            </label>
            <label class="ch-control"><span>CADENCE</span>
              <select data-ch-cadence>${Beat.CADENCES.filter(minutes => minutes > 1).map(minutes => `<option value="${minutes}">${Beat.formatHours(minutes / 60)}</option>`).join("")}</select>
            </label>
            <label class="ch-control"><span>BAR SIZE</span>
              <select data-ch-interval><option value="1h">1 hour · Tickerbot on demand</option><option value="1d">1 day · Tickerbot daily</option></select>
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
                <p class="ch-fineprint" data-ch-archive-status role="status">Checking the anonymous Orb 2 beat archive…</p>
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

      /* Provider identity is tied to the selected reviewed Disc. Auto-beat
         controls scheduling only; it never changes or silently substitutes the
         data source. */
      function liveProvider() {
        if (state.discId === "crypto") return "kraken";
        if (state.discId === "stocks") return "tickerbot";
        return "massive";
      }

      function massiveMode() { return liveProvider() === "massive"; }
      function tickerbotMode() { return liveProvider() === "tickerbot"; }
      function krakenMode() { return liveProvider() === "kraken"; }

      function configureIntervalOptions(discId, preferred = state.interval) {
        const disc = DiscCatalog.disc(discId);
        const modes = disc ? disc.intervalModes : ["1h"];
        state.interval = modes.includes(preferred) ? preferred : modes[0];
        intervalSelect.innerHTML = modes.map(interval => {
          let label;
          if (interval === "1d") label = state.discId === "stocks"
            ? "1 day · Tickerbot stock rotation"
            : state.discId === "crypto" ? "1 day · Kraken Spot"
              : "1 day · Massive automatic";
          else label = "1 hour · Tickerbot on demand";
          return `<option value="${interval}">${label}</option>`;
        }).join("");
        intervalSelect.value = state.interval;
        intervalSelect.disabled = modes.length <= 1 || state.pending;
        const fixedProviderCadence = massiveMode() || krakenMode() || (tickerbotMode() && state.interval === "1d");
        cadenceSelect.disabled = fixedProviderCadence || state.pending;
        budgetInput.disabled = fixedProviderCadence || state.pending;
        stretchBox.disabled = fixedProviderCadence || state.pending;
        tierBox.disabled = fixedProviderCadence || state.pending;
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
        const provider = liveProvider();
        /* Beat.plan models Tickerbot's monthly budget cadences only. Fixed
           provider loops retain a harmless reviewed planner cadence; their
           displayed and scheduled cadence comes from cadenceMinutesForBeat(). */
        const fixedCadence = state.cadence;
        return Beat.plan({
          monthlyBudget: state.budget,
          cadenceMinutes: fixedCadence,
          castSize: stage.berths.length,
          perRequestCap: provider === "tickerbot" ? Beat.MAX_SYMBOLS_PER_BEAT : 1
        });
      }

      function perBeatOf(plan) {
        if (massiveMode() || krakenMode() || state.interval === "1d") return 1;
        return state.stretch && plan.stretchWithinBudget ? plan.stretchCallsPerBeat : plan.callsPerBeat;
      }

      function tierPlan() {
        if (!tickerbotMode() || state.interval === "1d") return { options: [], recommended: null, notes: ["Two-lane rotation is available only for on-demand Tickerbot stock beats."] };
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
        if (massiveMode() || krakenMode() || state.interval === "1d") {
          return { symbols: Beat.selectDueSymbols({ ...base, perBeat: 1 }), lanes: {}, tier: null, perBeat: 1 };
        }
        if (!state.tierMode) return { symbols: Beat.selectDueSymbols({ ...base, perBeat }), lanes: {}, tier: null, perBeat };
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
        /* The Worker keeps cadence=1 as the reviewed daily-bar contract. It
           is deliberately separate from beatIntervalMs(), which follows the
           five-request-per-minute Massive envelope. */
        if (massiveMode() || krakenMode()) return 1;
        if (state.interval === "1d") return 1440;
        return state.cadence;
      }

      function beatIntervalMs() {
        if (state.source === "rehearsal") return REHEARSAL_BEAT_MS;
        if (massiveMode()) return MASSIVE_BEAT_MS;
        if (krakenMode() || (tickerbotMode() && state.interval === "1d")) return KRAKEN_BEAT_MS;
        return state.cadence * 60_000;
      }

      function pacingMinutesForBeat() {
        return beatIntervalMs() / 60_000;
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

        const massiveDaily = normalizeMassiveDailyLedger(spend.massiveDaily);
        if (massiveDaily && (!state.massiveDailyLedger || massiveDaily.day > state.massiveDailyLedger.day ||
          (massiveDaily.day === state.massiveDailyLedger.day && massiveDaily.calls >= state.massiveDailyLedger.calls))) {
          state.massiveDailyLedger = massiveDaily;
        }
        if (spend.massiveLedgerStatus === "unavailable") state.massiveLedgerStatus = "unavailable";
        else if (massiveDaily) state.massiveLedgerStatus = "ready";
        else if (spend.massiveLedgerStatus === "not-configured") state.massiveLedgerStatus = "not-configured";

        const krakenDaily = normalizeKrakenDailyLedger(spend.krakenDaily);
        if (krakenDaily && (!state.krakenDailyLedger || krakenDaily.day > state.krakenDailyLedger.day ||
          (krakenDaily.day === state.krakenDailyLedger.day && krakenDaily.calls >= state.krakenDailyLedger.calls))) {
          state.krakenDailyLedger = krakenDaily;
        }
        if (spend.krakenLedgerStatus === "unavailable") state.krakenLedgerStatus = "unavailable";
        else if (krakenDaily) state.krakenLedgerStatus = "ready";
        else if (spend.krakenLedgerStatus === "not-configured") state.krakenLedgerStatus = "not-configured";

      }

      async function fetchLiveBeat(due, cadenceMinutes, lanes = {}) {
        const laneParam = Object.entries(lanes).length
          ? `&lanes=${encodeURIComponent(Object.entries(lanes).map(([symbol, lane]) => `${symbol}:${lane}`).join(','))}`
          : "";
        const provider = liveProvider();
        const endpoint = `/api/characters/v1/beat?disc=${encodeURIComponent(state.discId)}` +
          `&provider=${encodeURIComponent(provider)}` +
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
        const expectedProvider = liveProvider();
        if (data && (data.schema !== "characters-beat-v1" || data.disc !== state.discId ||
            data.provider !== expectedProvider || data.interval !== state.interval)) {
          throw new Error("The Worker response did not match the selected Disc, provider, and interval. No alternate source was accepted.");
        }
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
        if (state.source === "live" && tickerbotMode() && durable && durable.exhausted) {
          state.message = { kind: "refusal", text: `The shared D1 ledger records ${durable.calls.toLocaleString()} of ${durable.workerLimit.toLocaleString()} Worker-routed Tickerbot attempts for ${durable.month}. The monthly Tickerbot limit is reached; no stock request was sent. Tickerbot remains the exclusive stock provider; no substitute is used.` };
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
        let massiveBudgetBlocked = 0;
        let massiveLedgerBlocked = 0;
        let massiveRateLimited = 0;
        let krakenBudgetBlocked = 0;
        let krakenLedgerBlocked = 0;
        let krakenRateLimited = 0;
        let tickerbotNotCovered = 0;
        for (const instrument of result.instruments) {
          const symbol = String(instrument.symbol || "").toUpperCase();
          if (!symbol) continue;
          if (!instrument.marketContext) {
            unavailable += 1;
            if (instrument.code === "budget-exhausted") budgetBlocked += 1;
            if (instrument.code === "ledger-unavailable") ledgerBlocked += 1;
            if (instrument.code === "massive-budget-exhausted") massiveBudgetBlocked += 1;
            if (instrument.code === "massive-ledger-unavailable") massiveLedgerBlocked += 1;
            if (instrument.code === "massive-rate-limit") massiveRateLimited += 1;
            if (instrument.code === "kraken-budget-exhausted") krakenBudgetBlocked += 1;
            if (instrument.code === "kraken-ledger-unavailable" || instrument.code === "kraken-bar-cache-unavailable") krakenLedgerBlocked += 1;
            if (["kraken-rate-limit", "kraken-bar-cooldown", "crypto-ranking-cooldown"].includes(instrument.code)) krakenRateLimited += 1;
            if (instrument.code === "tickerbot-symbol-not-covered") tickerbotNotCovered += 1;
            state.motions[symbol] = Beat.motion(null, { bearingBase: bearingOf(symbol) });
            state.analyses[symbol] = { status: "unavailable", message: instrument.message || "No bars were supplied for this beat.", at: now };
            continue;
          }
          const packet = MarketContext.normalizePacket(instrument.marketContext);
          const analysis = packet ? MarketContext.evaluate(packet) : null;
          const directive = Beat.motion(analysis, { bearingBase: bearingOf(symbol) });
          state.motions[symbol] = directive;
          moods[symbol] = directive.mood;
          const bars = packet && Array.isArray(packet.bars) ? packet.bars : [];
          const closedBars = bars.filter(bar => bar && bar.confirmed === true && Number.isFinite(Number(bar.close)));
          const latestClosed = closedBars.at(-1) || null;
          const priorClosed = closedBars.length > 1 ? closedBars.at(-2) : null;
          const close = latestClosed ? Number(latestClosed.close) : null;
          const prevClose = priorClosed ? Number(priorClosed.close) : null;
          state.analyses[symbol] = {
            at: now,
            status: directive.status,
            synthetic: directive.synthetic,
            source: directive.source,
            bars: directive.barCount,
            close,
            prevClose,
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
        const savedBeatEntry = {
          at: now, reason, disc: state.discId, interval: state.interval, source: state.source, provider: state.source === "live" ? liveProvider() : "synthetic", symbols: refreshed, calls,
          massiveAttempts: result.spend ? Math.max(0, Number(result.spend.massiveAttempts) || 0) : 0,
          alphaVantageAttempts: result.spend ? Math.max(0, Number(result.spend.alphaVantageAttempts) || 0) : 0,
          unavailable, cacheHits: result.spend ? result.spend.cacheHits : 0,
          lanes: { ...state.laneBySymbol }, moodBySymbol: { ...moods },
          moods: refreshed.map(symbol => `${symbol} ${moods[symbol] || "—"}`)
        };
        state.log = [savedBeatEntry, ...state.log].slice(0, 12);
        void persistSavedBeat(savedBeatEntry);
        state.nextBeatAt = now + beatIntervalMs();
        if (budgetBlocked) {
          const ledger = state.serverLedger;
          state.message = { kind: "refusal", text: `${budgetBlocked} due berth${budgetBlocked === 1 ? " was" : "s were"} refused by the shared D1 monthly call limit for Tickerbot${ledger ? ` (${ledger.calls.toLocaleString()} / ${ledger.workerLimit.toLocaleString()} in ${ledger.month} UTC)` : ""}. No Tickerbot request was sent for those berths.` };
        } else if (massiveBudgetBlocked) {
          const ledger = state.massiveDailyLedger;
          state.message = { kind: "refusal", text: `${massiveBudgetBlocked} due berth${massiveBudgetBlocked === 1 ? " was" : "s were"} refused by Massive's daily Characters allowance${ledger ? ` (${ledger.calls.toLocaleString()} / ${ledger.dailyLimit.toLocaleString()} in ${ledger.day} UTC)` : ""}. No Massive request was sent for those berths.` };
        } else if (massiveLedgerBlocked) {
          state.message = { kind: "refusal", text: `${massiveLedgerBlocked} due berth${massiveLedgerBlocked === 1 ? " was" : "s were"} not sent because the Massive daily D1 ledger is unavailable. No request was sent.` };
        } else if (massiveRateLimited) {
          state.message = { kind: "refusal", text: `${massiveRateLimited} due berth${massiveRateLimited === 1 ? " was" : "s were"} held by Massive's shared per-minute envelope. Wait briefly; no substitute provider was used.` };
        } else if (krakenBudgetBlocked) {
          const ledger = state.krakenDailyLedger;
          state.message = { kind: "refusal", text: `${krakenBudgetBlocked} due Disc3 pair${krakenBudgetBlocked === 1 ? " was" : "s were"} held by the shared Kraken application ceiling${ledger ? ` (${ledger.calls} / ${ledger.dailyLimit} in ${ledger.day} UTC)` : ""}. No request or alternate venue was used.` };
        } else if (krakenLedgerBlocked) {
          state.message = { kind: "refusal", text: `${krakenLedgerBlocked} Disc3 request${krakenLedgerBlocked === 1 ? " was" : "s were"} held because the shared Kraken D1 pacing/cache ledger is unavailable. No provider request or alternate venue was used.` };
        } else if (krakenRateLimited) {
          state.message = { kind: "refusal", text: `${krakenRateLimited} Disc3 request${krakenRateLimited === 1 ? " was" : "s were"} held by Kraken's one-request-per-second gate or bounded pair retry window. No alternate provider was substituted.` };
        } else if (ledgerBlocked) {
          state.message = { kind: "refusal", text: `${ledgerBlocked} due berth${ledgerBlocked === 1 ? " was" : "s were"} not sent to Tickerbot because the D1 monthly call ledger is unavailable. No request was sent.` };
        } else if (tickerbotNotCovered) {
          const disc = DiscCatalog.disc(state.discId);
          state.message = { kind: "note", text: `${tickerbotNotCovered} instrument${tickerbotNotCovered === 1 ? "" : "s"} on ${disc ? disc.label : state.discId} are not on Tickerbot's reviewed stock list. No other provider is substituted; use Synthetic rehearsal only for a clearly labeled preview.` };
        } else if (!refreshed.length) {
          /* A completed empty beat supersedes stale mode-selection copy. The
             stage must say plainly that no observation arrived rather than
             leaving an earlier provider note that implies a successful read. */
          state.message = { kind: "note", text: "No symbol in this beat returned bars. Those berths stay frozen; nothing was fabricated." };
        } else if (state.source === "live") {
          state.message = null;
        }
        if (state.source === "live") {
          HOS.record("info", `Characters beat — ${refreshed.length} berth(s) refreshed from live market data (${calls} provider request${calls === 1 ? "" : "s"}, including ${result.spend ? Number(result.spend.massiveAttempts) || 0 : 0} Massive, ${result.spend ? Number(result.spend.tickerbotAttempts) || 0 : 0} Tickerbot, and ${result.spend ? Number(result.spend.krakenAttempts) || 0 : 0} Kraken attempts). Display-only motion.` +
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
        const provider = liveProvider();
        const isMassive = provider === "massive";
        const isKraken = provider === "kraken";
        const isTickerbot = provider === "tickerbot";
        const currentMonth = Beat.monthKey(Date.now());
        const durable = state.serverLedgerStatus === "ready" && state.serverLedger && state.serverLedger.month === currentMonth
          ? state.serverLedger : null;
        const currentUtcDay = new Date(Date.now()).toISOString().slice(0, 10);
        const massiveDaily = state.massiveLedgerStatus === "ready" && state.massiveDailyLedger && state.massiveDailyLedger.day === currentUtcDay
          ? state.massiveDailyLedger : null;
        const massiveDailyText = massiveDaily
          ? `${massiveDaily.calls.toLocaleString()} / ${massiveDaily.dailyLimit.toLocaleString()} used · ${massiveDaily.remaining.toLocaleString()} left (${massiveDaily.day} UTC)`
          : state.massiveLedgerStatus === "unavailable"
            ? "D1 UTC-day ledger unavailable · Massive requests fail closed"
            : state.massiveLedgerStatus === "not-configured"
              ? "Not configured · add MASSIVE_API_KEY for automatic daily beats"
              : `${MASSIVE_DAILY_REQUEST_CAP.toLocaleString()} Worker attempts per UTC day`;
        const krakenDaily = state.krakenLedgerStatus === "ready" && state.krakenDailyLedger && state.krakenDailyLedger.day === currentUtcDay
          ? state.krakenDailyLedger : null;
        const krakenDailyText = krakenDaily
          ? `${krakenDaily.calls.toLocaleString()} / ${krakenDaily.dailyLimit.toLocaleString()} used · ${krakenDaily.remaining.toLocaleString()} left (${krakenDaily.day} UTC)`
          : state.krakenLedgerStatus === "unavailable"
            ? "Shared D1 pacing ledger unavailable · Kraken requests fail closed"
            : "160 Worker attempts per UTC day · one request per second";
        const disc = DiscCatalog.disc(state.discId);
        const perBeat = perBeatOf(plan);
        const sweepBeats = Math.ceil(stage.berths.length / Math.max(1, perBeat));
        const sweepHours = (sweepBeats * pacingMinutesForBeat()) / 60;
        const cryptoRankNote = state.discId === "crypto" && state.ranking
          ? `${state.ranking.provider || "Kraken"} Spot venue ranking · ${state.ranking.metric || "rolling 24-hour USD notional (base volume × VWAP)"}${state.ranking.rankedAt ? ` · snapshot ${stamp(state.ranking.rankedAt)}` : ""}${state.ranking.cached ? " · cached ranking" : ""}. Audit flags: ${state.ranking.audit ? `${state.ranking.audit.stablecoinCandidateCount || 0} stablecoin candidate(s), ${state.ranking.audit.missingMarketCapCount || 0} missing market cap(s), ${(state.ranking.audit.extremeNominalPriceCandidates || []).length} extreme nominal price flag(s)` : "eligibility audit unavailable"}. This is Kraken-only rolling-24-hour volume ranking, not a global crypto ranking or investment-quality screen.`
          : (disc && disc.ranking) || "";
        $("[data-ch-disc-note]").textContent = cryptoRankNote;

        $("[data-ch-source-badge]").textContent = state.source === "rehearsal"
          ? "Synthetic rehearsal · 0 provider calls · not real market data"
          : isMassive
            ? `Massive · FX / futures / indices · up to ${MASSIVE_REQUESTS_PER_MINUTE} requests/minute`
            : krakenMode()
              ? "Kraken Spot · Disc3 rolling-24h rank + daily OHLC · paced"
              : "Tickerbot · exclusive Disc1 stock source · monthly ledger";
        $("[data-ch-source-badge]").className = `ch-source-badge${state.source === "rehearsal" ? " ch-source-badge-synthetic" : ""}`;

        const tiers = tierPlan();
        const tierOption = tierOptionOf(tiers);
        const cadencePlan = isTickerbot && state.interval !== "1d" ? Beat.compareCadences({ monthlyBudget: state.budget, castSize: stage.berths.length }).filter(option => option.cadenceMinutes > 1) : [];
        $("[data-ch-plan-title]").textContent = isMassive ? "Massive daily loop" : isKraken ? "Kraken Spot daily lane" : "Tickerbot stock plan";
        const tickerbotStats = state.interval === "1d" ? `
          <div><dt>Bar interval</dt><dd>1d · Tickerbot · exclusive Disc1 stock source</dd></div>
          <div><dt>Rotation pace</dt><dd>One reviewed symbol per minute · up to 52 daily stock packets</dd></div>
          <div><dt>Daily packet hold</dt><dd>Through the next UTC midnight</dd></div>
          <div><dt>Tickerbot Worker cap</dt><dd>10,000 attempts per UTC month · shared ledger</dd></div>` : `
          <div><dt>Beats / month</dt><dd>${plan.beatsPerMonth.toLocaleString()}</dd></div>
          <div><dt>Symbols / beat</dt><dd>${perBeat}${state.stretch && plan.stretchWithinBudget ? " <span class=\"ch-stretch-tag\">stretch</span>" : ""}</dd></div>
          <div><dt>Tickerbot calls / month</dt><dd>${(perBeat * plan.beatsPerMonth).toLocaleString()} <span class="ch-dim">of ${state.budget.toLocaleString()}</span></dd></div>
          <div><dt>Reserve held</dt><dd>${plan.reserveCalls.toLocaleString()}</dd></div>
          <div><dt>Full sweep</dt><dd>${state.tierMode && tierOption ? `${tierOption.sweepBeats} beats · ${Beat.formatHours(tierOption.sweepHours)}` : `${sweepBeats} beats · ${Beat.formatHours(sweepHours)}`}</dd></div>
          ${state.tierMode && tierOption ? `<div><dt>Hot lane</dt><dd>${tierOption.hotSize} berth${tierOption.hotSize === 1 ? "" : "s"} <span class="ch-dim">every beat</span></dd></div>` : ""}`;
        const massiveStats = `
          <div><dt>Bar interval</dt><dd>1d · Massive · ${esc((disc && disc.label) || state.discId)}</dd></div>
          <div><dt>Request pacing</dt><dd>Up to ${MASSIVE_REQUESTS_PER_MINUTE} requests / minute · one reviewed instrument / request</dd></div>
          <div><dt>Daily packet hold</dt><dd>Through the next UTC midnight</dd></div>
          <div><dt>Full Disc sweep</dt><dd>${sweepBeats} beats · about ${Beat.formatHours(sweepHours)}</dd></div>
          <div><dt>Massive UTC-day guard</dt><dd>${massiveDailyText}</dd></div>`;
        const krakenStats = `
          <div><dt>Roster</dt><dd>Kraken Spot public Ticker · rolling 24-hour USD notional</dd></div>
          <div><dt>Pair bars</dt><dd>Public OHLC · interval=1440 · exact ranked USD pair</dd></div>
          <div><dt>Venue scope</dt><dd>Kraken only · not a global/cross-exchange ranking</dd></div>
          <div><dt>Request pacing</dt><dd>One Worker request / second · 160-attempt app ceiling / UTC day</dd></div>
          <div><dt>Cache hold</dt><dd>Ranking up to 24h; daily bars through UTC midnight</dd></div>
          <div><dt>Kraken UTC-day ledger</dt><dd>${krakenDailyText}</dd></div>`;
        const ledgerRow = isMassive
          ? `<div><dt>D1 snapshot · Massive / day</dt><dd><span class="ch-dim">${massiveDailyText}</span></dd></div>`
          : isKraken
            ? `<div><dt>D1 snapshot · Kraken / day</dt><dd><span class="ch-dim">${krakenDailyText}</span></dd></div>`
            : `<div><dt>D1 snapshot · Tickerbot / month</dt><dd>${durable
              ? `${durable.calls.toLocaleString()} <span class="ch-dim">· last confirmed; ${durable.remaining.toLocaleString()} of ${durable.workerLimit.toLocaleString()} left</span>`
              : `<span class="ch-dim">${state.serverLedgerStatus === "unavailable" ? "no current D1 snapshot · Tickerbot calls fail closed" : state.serverLedgerStatus === "not-configured" ? "Tickerbot secret not configured" : "awaiting Worker ledger"}</span>`}</dd></div>`;
        const cadenceControls = cadencePlan.length ? `<div class="ch-cadence-row">${cadencePlan.map(option => `
          <button class="ch-cadence-chip${option.cadenceMinutes === state.cadence ? " active" : ""}" data-ch-cadence-chip="${option.cadenceMinutes}"
            title="${option.callsPerBeat} Tickerbot calls/beat · ${option.callsPerMonth.toLocaleString()} Tickerbot calls/month · ${Beat.formatHours(option.sweepHours)} sweep">
            ${Beat.formatHours(option.cadenceMinutes / 60)}<small>${option.callsPerBeat}/beat</small>
            <i class="ch-chip-bar"><b style="width:${Math.round(Math.min(1, option.budgetUseRatio) * 100)}%"></b></i>
          </button>`).join("")}</div>` : "";
        $("[data-ch-plan]").innerHTML = `
          <dl class="ch-stats">
            ${isMassive ? massiveStats : isKraken ? krakenStats : tickerbotStats}
            ${ledgerRow}
            ${!isMassive ? `<div><dt>Massive scope</dt><dd><span class="ch-dim">FX / active futures / indices only · ${MASSIVE_DAILY_REQUEST_CAP.toLocaleString()} UTC-day guard</span></dd></div>` : ""}
          </dl>${cadenceControls}`;
        const tierFeasible = tiers.options.some(option => option.feasible);
        $("[data-ch-tier-panel]").innerHTML = !isTickerbot
          ? `<p class="ch-fineprint">Two-lane Tickerbot rotation is disabled for this provider mode.</p>`
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

        $("[data-ch-plan-tag]").textContent = isMassive
          ? "Massive · UTC-day guard"
          : isKraken
            ? "Kraken Spot · venue data"
            : state.interval === "1d" ? "Tickerbot · daily stock rotation"
                : state.tierMode && tierOption
                  ? `two-lane · ${tierOption.hotSize} hot / ${tierOption.sweepPerBeat} sweep`
                  : `${state.cadence}-minute plan`;
        $("[data-ch-plan-note]").textContent = isMassive
          ? `Massive serves only reviewed FX, active commodity futures, and indices at 1d. Up to ${MASSIVE_REQUESTS_PER_MINUTE} one-symbol requests per minute use the shared Massive envelope; the ${MASSIVE_DAILY_REQUEST_CAP.toLocaleString()}-attempt D1 UTC-day guard fails closed. Stocks and crypto do not fall back to Massive.`
          : isKraken
            ? `Kraken Spot public Ticker ranks at most 52 USD-quoted pairs by rolling-24-hour base volume × VWAP. This is Kraken venue data, not a global ranking or the previous-UTC-day Massive metric. Exact ranked pairs use Kraken public OHLC interval=1440; the shared one-request-per-second gate and D1 caches fail closed. Terms for non-personal commercial use must be confirmed before deployment.`
            : state.interval === "1d"
                ? `Tickerbot is the exclusive Disc1 stock source. The automatic loop rotates one reviewed symbol per minute and holds successful daily packets through UTC midnight; the shared ${state.serverLedger?.workerLimit?.toLocaleString?.() || "10,000"}-per-month Worker ledger is checked before every upstream request. No Massive stock substitute is used.`
                : `${perBeat} Disc1 stock symbol${perBeat === 1 ? "" : "s"} per on-demand beat through Tickerbot at ${state.cadence} minutes projects ${(perBeat * plan.beatsPerMonth).toLocaleString()} Tickerbot calls/month (${Math.round((perBeat * plan.beatsPerMonth / state.budget) * 100)}% of the planning budget). The shared monthly Worker ledger is enforced; no stock-provider substitute is used.`;
        stretchBox.disabled = !isTickerbot || !plan.stretchWithinBudget || state.pending;
        stretchBox.checked = state.stretch && plan.stretchWithinBudget && isTickerbot;
        tierBox.checked = state.tierMode && isTickerbot;
        tierBox.disabled = !isTickerbot || state.pending || !tiers.options.some(option => option.feasible);

        const focused = state.focus;
        const berth = stage.berths.find(entry => entry.symbol === focused);
        const directive = state.motions[focused];
        const analysis = state.analyses[focused];
        $("[data-ch-detail-title]").textContent = berth ? `${berth.displaySymbol} · ${berth.npc.name}` : "Berth";
        $("[data-ch-detail]").innerHTML = berth ? `
          <p class="ch-detail-role"><strong>${esc(berth.displaySymbol)}</strong> · ${esc(berth.name)} · ${esc(berth.assetClass)} · ${esc(berth.quoteCurrency)} — ${esc(berth.npc.role)}; posted to ${esc(berth.sectorName)}.${berth.tags.length ? ` Tags: ${berth.tags.map(esc).join(", ")}.` : ""}</p>
          ${berth.rank || berth.volumeUsd || berth.currentPriceUsd || berth.marketCapUsd ? `<p class="ch-fineprint">${berth.assetClass === "fx" ? "BIS FX turnover rank" : "Disc rank"} ${berth.rank || "—"}${berth.rankingProvider ? ` · ${esc(berth.rankingProvider)}` : ""}${berth.volumeUsd ? ` · ${berth.assetClass === "crypto" ? "rolling-24h USD notional" : "trailing 24h volume"} ${compactUsd(berth.volumeUsd)}` : ""}${berth.currentPriceUsd ? ` · price ${compactUsd(berth.currentPriceUsd)}` : ""}${berth.marketCapUsd ? ` · market cap ${compactUsd(berth.marketCapUsd)}` : ""}</p>` : ""}
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
            <span class="ch-log-source ${entry.source === "rehearsal" ? "synthetic" : ""}">${entry.source === "rehearsal" ? "SYNTH" : `${esc(entry.disc)} ${esc(entry.interval)} · ${["alpha", "alpha-vantage"].includes(String(entry.provider || "").toLowerCase()) ? "ALPHA LEGACY" : esc(String(entry.provider || "live").toUpperCase())} ${entry.calls} request${entry.calls === 1 ? "" : "s"}${entry.massiveAttempts ? ` · Massive 1d ${entry.massiveAttempts}` : ""}${entry.alphaVantageAttempts ? ` · Alpha legacy 1mo ${entry.alphaVantageAttempts}` : ""}`}</span>
            <span class="ch-log-body">${entry.symbols.length ? entry.symbols.map(symbol => {
              const lane = entry.lanes && entry.lanes[symbol];
              const laneMark = lane === "hot" || lane === "sweep"
                ? `<i class="ch-lane ch-lane-${lane}">${lane === "hot" ? "H" : "S"}</i>`
                : "";
              return `${laneMark}<b>${esc(symbol)}</b> ${esc(entry.moodBySymbol?.[symbol] || (state.motions[symbol] || {}).mood || "—")}`;
            }).join(" · ") : "no symbols due"}${
              entry.unavailable ? ` <em class="ch-warn">${entry.unavailable} unavailable</em>` : ""}</span>
          </li>`).join("") : `<li class="ch-log-empty">No beats recorded in this session.</li>`;
        $("[data-ch-beatcount]").textContent = `${state.log.length} visible beat${state.log.length === 1 ? "" : "s"}`;
        $("[data-ch-ledger]").textContent = `${state.ledger.calls.toLocaleString()} Character call${state.ledger.calls === 1 ? "" : "s"} in ${state.ledger.month} (browser only)`;
        $("[data-ch-durable-ledger]").textContent = isMassive
          ? massiveDaily
            ? `${massiveDaily.calls.toLocaleString()} / ${massiveDaily.dailyLimit.toLocaleString()} Worker attempts in ${massiveDaily.day} UTC · ${massiveDaily.remaining.toLocaleString()} left`
            : state.massiveLedgerStatus === "unavailable"
              ? "No Massive D1 snapshot reported — automatic daily beats fail closed."
              : state.massiveLedgerStatus === "not-configured"
                ? "Massive is not configured. Add MASSIVE_API_KEY as a Worker secret."
                : "Waiting for the first Massive daily beat."
          : durable
                ? `${durable.calls.toLocaleString()} / ${durable.workerLimit.toLocaleString()} Worker attempts in ${durable.month} UTC · ${durable.remaining.toLocaleString()} left${state.serverLedgerStatus === "unavailable" ? " · last known; D1 currently unavailable" : ""}`
                : state.serverLedgerStatus === "unavailable"
                  ? "No D1 snapshot reported — the live route refused or the Tickerbot ledger is unavailable; Tickerbot fetches fail closed."
                  : state.serverLedgerStatus === "not-configured"
                    ? "Tickerbot is not configured. It is the exclusive Stocks provider; no substitute is enabled."
                    : "Waiting for the first live beat.";
        $("[data-ch-stage-note]").textContent = state.message
          ? state.message.text
          : state.lastBeatAt
            ? (state.source === "rehearsal"
              ? `Rehearsing every ${REHEARSAL_BEAT_MS / 1000}s with synthetic bars — compressed for preview, 0 provider calls.`
              : isTickerbot
                ? "Tickerbot is on demand. Use Beat now to request reviewed Disc1 stock bars; no background provider loop is scheduled."
                : `Next ${isMassive ? "Massive" : "Kraken Spot"} beat in ${since(Date.now(), state.nextBeatAt)}. Positions hold between beats; no calls are spent meanwhile.`)
            : "No beat yet. Characters stand at their berths; nothing has been invented.";
        $("[data-ch-disclaimer]").innerHTML = `Motion, formations, and item flow are a display metaphor for available market observations. They are not investment advice, a trade signal, a recommendation, or permission to act; indicator event labels are display-only. Missing OHLC or volume fields are not fabricated, and volume-based measures are unavailable when volume is absent. Massive serves reviewed FX, commodity futures, and indices through a shared per-minute envelope and a conservative UTC-day Characters guard. Tickerbot is the exclusive Disc1 Stocks provider under its 10,000-per-UTC-month Worker cap. Kraken public Spot serves Disc3 crypto with venue-specific rolling-24-hour ranking and exact-pair daily bars. Alpha Vantage/1mo is disabled for new beats; any existing Alpha records are archived history only. Providers never silently substitute for one another; direct provider calls are outside those ledgers.`;
        featureButton.textContent = state.ledger.featured.includes(focused) ? "Featured ★" : "Feature";
        autoButton.textContent = `Auto-beat: ${state.auto ? "on" : "off"}`;
        autoButton.setAttribute("aria-pressed", String(state.auto));
      }

      const eventDocument = body.ownerDocument;
      const emitBeatHistoryStatus = () => {
        eventDocument.__harshalosStoredCharacterBeats = state.archivedBeatLog.length > 0 || state.savedBeatsAvailable;
        eventDocument.dispatchEvent(new eventDocument.defaultView.CustomEvent(
          "harshalos:characters-beats:status", { detail: { hasStored: eventDocument.__harshalosStoredCharacterBeats } }
        ));
      };
      const compactSavedEntry = raw => {
        const entry = raw && typeof raw === "object" ? raw.payload?.entry : null;
        if (!entry || !Array.isArray(entry.symbols)) return null;
        return {
          at: Number(raw.beatAt) || Number(entry.at) || Date.now(), reason: "restored", disc: String(entry.disc || raw.discId || "stocks"),
          interval: String(entry.interval || "1d"), source: String(entry.source || "live"), provider: String(raw.provider || entry.provider || "unknown"),
          symbols: entry.symbols.filter(symbol => typeof symbol === "string").slice(0, 200), calls: Math.max(0, Number(entry.calls) || 0),
          massiveAttempts: Math.max(0, Number(entry.massiveAttempts) || 0), alphaVantageAttempts: Math.max(0, Number(entry.alphaVantageAttempts) || 0),
          unavailable: Math.max(0, Number(entry.unavailable) || 0), cacheHits: Math.max(0, Number(entry.cacheHits) || 0),
          lanes: entry.lanes && typeof entry.lanes === "object" ? entry.lanes : {},
          moods: Array.isArray(entry.moods) ? entry.moods : [],
          moodBySymbol: entry.moodBySymbol && typeof entry.moodBySymbol === "object" ? entry.moodBySymbol : {}
        };
      };
      const clearSessionBeatLog = () => {
        if (state.log.length) {
          state.archivedBeatLog = [...state.log, ...state.archivedBeatLog]
            .sort((a, b) => b.at - a.at).slice(0, 48);
          state.log = [];
          drawPanels();
        }
        emitBeatHistoryStatus();
      };
      const restoreSessionBeatLog = event => {
        if (Array.isArray(event?.detail?.beats)) delete eventDocument.__harshalosPendingSavedBeats;
        const fromD1 = Array.isArray(event?.detail?.beats)
          ? event.detail.beats.map(compactSavedEntry).filter(Boolean) : [];
        if (fromD1.length) {
          state.savedBeatsAvailable = true;
          state.archivedBeatLog = [...fromD1, ...state.archivedBeatLog].sort((a, b) => b.at - a.at).slice(0, 120);
        }
        if (state.archivedBeatLog.length) {
          const merged = [...state.log, ...state.archivedBeatLog];
          const unique = new Map(merged.map(entry => [`${entry.at}:${entry.disc}:${entry.interval}`, entry]));
          state.log = [...unique.values()].sort((a, b) => b.at - a.at).slice(0, 12);
          state.archivedBeatLog = [];
          drawPanels();
        }
        emitBeatHistoryStatus();
      };
      eventDocument.addEventListener("harshalos:characters-beats:clear", clearSessionBeatLog);
      eventDocument.addEventListener("harshalos:characters-beats:restore", restoreSessionBeatLog);
      const setArchiveStatus = text => {
        const host = $("[data-ch-archive-status]");
        if (host) host.textContent = text;
      };
      let savedBeatWriteRevision = 0;
      async function loadSavedBeatArchive() {
        const readRevision = savedBeatWriteRevision;
        if (!savedBeatSessionId) { setArchiveStatus("D1 archive unavailable in this browser; beats remain session-local."); emitBeatHistoryStatus(); return; }
        try {
          const response = await window.fetch(`${savedBeatsEndpoint}?sessionId=${encodeURIComponent(savedBeatSessionId)}`, { headers: { Accept: "application/json" }, credentials: "same-origin" });
          const data = await response.json();
          if (!response.ok || !data.success || !Array.isArray(data.beats)) throw new Error("unavailable");
          if (readRevision === savedBeatWriteRevision) {
            state.archivedBeatLog = data.beats.map(compactSavedEntry).filter(Boolean).slice(0, 120);
            state.savedBeatsAvailable = state.archivedBeatLog.length > 0;
          }
          setArchiveStatus(state.archivedBeatLog.length ? `${state.archivedBeatLog.length} saved beat${state.archivedBeatLog.length === 1 ? "" : "s"} available in D1 · expires after 30 days.` : "D1 archive ready · no saved beats yet.");
        } catch { setArchiveStatus("D1 archive unavailable. New beats remain local until the Worker and migration are ready."); }
        emitBeatHistoryStatus();
      }
      async function persistSavedBeat(entry) {
        if (!savedBeatSessionId) return;
        const providerText = String(entry.provider || "").trim().toLowerCase();
        const provider = entry.source === "rehearsal" ? "rehearsal"
          : ["tickerbot", "kraken", "massive"].includes(providerText) ? providerText : null;
        const discId = String(entry.disc || "").trim().toLowerCase();
        const interval = String(entry.interval || "").trim();
        const validDisc = ["stocks", "fx", "crypto", "commodities", "indices"].includes(discId);
        const validPath = provider === "tickerbot" && discId === "stocks" && ["1h", "1d"].includes(interval)
          || provider === "kraken" && discId === "crypto" && interval === "1d"
          || provider === "massive" && ["fx", "commodities", "indices"].includes(discId) && interval === "1d"
          || provider === "rehearsal" && validDisc && ["1h", "1d"].includes(interval);
        if (!provider || !validPath) {
          setArchiveStatus("Beat kept locally only: provider, Disc, or interval is not an active save route. Legacy Alpha/1mo history is read-only.");
          return;
        }
        savedBeatWriteRevision += 1;
        const observations = entry.symbols.map(symbol => {
          const analysis = state.analyses[symbol] || {};
          const gauge = analysis.gauge || {};
          const finite = value => Number.isFinite(Number(value)) ? Number(value) : null;
          return {
            ticker: symbol, mood: String(entry.moodBySymbol[symbol] || "—").slice(0, 40),
            status: String(analysis.status || "unavailable").slice(0, 40), close: finite(analysis.close), previousClose: finite(analysis.prevClose),
            zone: String(analysis.zone || "unknown").slice(0, 48), combined: String(analysis.combined || "").slice(0, 100),
            gauges: { flow: finite(gauge.flow), heat: finite(gauge.heat), charge: finite(gauge.charge), crowd: finite(gauge.crowd) },
            marks: Array.isArray(analysis.marks) ? analysis.marks.filter(mark => typeof mark === "string").slice(0, 8).map(mark => mark.slice(0, 80)) : []
          };
        });
        const beatId = window.crypto?.randomUUID?.();
        if (!beatId) return;
        const record = {
          sessionId: savedBeatSessionId, beatId, beatAt: entry.at, provider, discId,
          payload: { schema: "orb2-beat-v1", observations, entry: {
            at: entry.at, disc: discId, interval, source: entry.source, provider: entry.provider,
            symbols: entry.symbols, calls: entry.calls, massiveAttempts: entry.massiveAttempts,
            alphaVantageAttempts: entry.alphaVantageAttempts, unavailable: entry.unavailable, cacheHits: entry.cacheHits,
            lanes: entry.lanes, moods: entry.moods, moodBySymbol: entry.moodBySymbol
          } }
        };
        try {
          const response = await window.fetch(savedBeatsEndpoint, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(record) });
          const data = await response.json();
          if (!response.ok || !data.success) throw new Error("unavailable");
          setArchiveStatus("Beat saved to the anonymous D1 archive · retained up to 30 days.");
          state.savedBeatsAvailable = true;
          if (!state.archivedBeatLog.some(saved => saved.at === entry.at)) state.archivedBeatLog.unshift(entry);
          emitBeatHistoryStatus();
        } catch { setArchiveStatus("D1 save unavailable; this beat remains in the current browser session."); }
      }
      if (eventDocument.__harshalosPendingSavedBeats) {
        restoreSessionBeatLog({ detail: { beats: eventDocument.__harshalosPendingSavedBeats } });
        delete eventDocument.__harshalosPendingSavedBeats;
      }
      emitBeatHistoryStatus();
      void loadSavedBeatArchive();

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
        /* Tickerbot 1h remains on-demand; the exclusive Disc1 daily source is
           paced as a one-symbol-per-minute rotation. Synthetic rehearsal may
           also loop for preview purposes. */
        if (!state.auto || (state.source === "live" && tickerbotMode() && state.interval !== "1d")) return;
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
          /* Discs2–5 expose only Massive's automatic daily path. Entering one
             returns the live loop to its automatic setting; Disc1 can still be
             deliberately paused into an on-demand Tickerbot 1d request. */
          if (discId !== "stocks") state.auto = true;
          activeDisc.current = discId;
          state.ranking = ranking;
          activeDisc.ranking = ranking;
          stage = Cast.build(entries, { discId });
          symbols = stage.berths.map(berth => berth.symbol);
          resetStageForSelection();
          state.message = { kind: "note", text: disc.ranking };
          discSelect.value = discId;
          drawPanels();
          /* Tickerbot daily stock mode participates in the scheduled rotation;
             its 1h stock mode remains explicit on-demand. */
          if (!tickerbotMode() || (state.auto && state.interval === "1d")) await beatNow("disc-change");
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
        state.auto = nextInterval === "1d";
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
        state.message = nextInterval === "1d"
          ? { kind: "note", text: state.discId === "stocks"
            ? "Tickerbot is the exclusive Disc1 stock source. Daily stock bars rotate one reviewed symbol per minute and are held through UTC midnight; no Massive stock path is used."
            : state.discId === "crypto"
              ? "Kraken public Spot is the Disc3 source. The rolling-24-hour USD ranking and exact-pair daily OHLC are venue-specific; Worker-side pacing and D1 caches apply."
              : `Massive supplies reviewed ${DiscCatalog.disc(state.discId)?.label || state.discId} daily bars under its shared envelope and UTC-day guard.` }
          : { kind: "note", text: `On-demand Tickerbot ${nextInterval} mode selected for Disc1 stocks. Tickerbot is the exclusive stock provider; no stock-provider substitute is used.` };
        drawPanels();
        /* Daily stock rotation starts immediately; Tickerbot 1h stays on demand. */
        if (state.source === "live" && (!tickerbotMode() || (state.auto && state.interval === "1d"))) beatNow("interval-change");
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
        /* A rehearsal loop can be switched back to live, but never turns a
           selected 1h Tickerbot view into a background polling loop. */
        if (next === "live" && state.interval === "1h") state.auto = false;
        state.motions = {};
        state.displayed = {};
        /* Live and synthetic analyses remain separate. */
        state.analyses = {};
        state.blends = {};
        state.items = new Map();
        state.message = next === "rehearsal"
          ? { kind: "note", text: "Synthetic rehearsal selected: deterministic generated bars, 0 provider calls, clearly labeled. Switch to live provider data for real observations." }
          : massiveMode()
            ? { kind: "note", text: `Live daily FX, futures, and index mode uses Massive at up to ${MASSIVE_REQUESTS_PER_MINUTE} one-symbol requests per minute. Successful packets cache through UTC midnight; no fallback provider is used.` }
              : krakenMode()
                ? { kind: "note", text: "Live Disc3 mode uses Kraken Spot's rolling-24-hour USD ranking and exact-pair 1440-minute OHLC. Venue identity, one-request-per-second pacing, and D1 cache boundaries are preserved." }
                : { kind: "note", text: state.interval === "1d"
                  ? "Tickerbot is the exclusive Disc1 stock provider. Daily bars rotate one reviewed symbol per minute and cache through UTC midnight."
                  : "Live Tickerbot stock 1h mode is on demand; Tickerbot remains the exclusive Stocks provider." };
        drawPanels();
        schedule();
      }

      sourceSelect.addEventListener("change", () => switchSource(sourceSelect.value === "rehearsal" ? "rehearsal" : "live"));
      focusSelect.addEventListener("change", () => { state.focus = focusSelect.value; drawStage(Date.now()); drawPanels(); });
      autoButton.addEventListener("click", () => {
        if (state.source === "live" && state.interval === "1h") {
          state.auto = false;
          state.message = { kind: "note", text: "Tickerbot 1h is on demand only. Choose Beat now to request the reviewed Disc1 stock data; no background loop is scheduled." };
        } else {
          state.auto = !state.auto;
        }
        /* Auto-beat controls only scheduling. Provider identity remains fixed
           by Disc: Tickerbot for stocks, Kraken for crypto, Massive for FX,
           commodities, and indices. */
        configureIntervalOptions(state.discId, state.interval);
        drawPanels();
        schedule();
      });
      beatButton.addEventListener("click", () => { beatNow("manual"); });
      stretchBox.addEventListener("change", () => { state.stretch = stretchBox.checked; drawPanels(); });
      tierBox.addEventListener("change", () => {
        state.tierMode = tierBox.checked;
        state.message = state.tierMode
          ? { kind: "note", text: "Two-lane Tickerbot rotation enabled: featured Disc1 stock berths refresh every on-demand beat and remaining calls walk the sweep." }
          : { kind: "note", text: "Two-lane Tickerbot rotation disabled: the plain least-recently-refreshed on-demand rotation returns." };
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

  /* NAB Discs — the 119-sector composite field built after the Orb 2 carry-over.
     It gets its own desktop id so the Characters app and Orb 2 stay themselves:
     the composite registry, the reviewed source channels, the provider budget
     boundaries, and the saved-observation import path are exactly as NAB Discs
     shipped. Alignment is editorial context, never a rating or a recommendation. */
  APPS.push({
    id: "nab-discs",
    title: "NAB Discs",
    short: "NAB Discs",
    glyph: "⧉",
    desc: "119 NAB-aligned composites joining institutions, market observations, and physical designs",
    w: 1200,
    h: 800,
    render(body) {
      if (!window.NabDiscsView) {
        body.innerHTML = `
          <div class="h1">NAB Discs</div>
          <div class="rule-box">The NAB composite modules are not loaded in this context, so the
          composite field cannot mount. Nothing was requested and nothing was substituted;
          Characters and Orb 2 remain available on their own surfaces.</div>`;
        return;
      }
      return window.NabDiscsView.mount(body);
    }
  });
})();
