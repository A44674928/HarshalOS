/* HarshalOS — Characters: Objects, NPCs, and Items moved by the market beat.

   The cast (js/characters-cast.js) is bound to the reviewed Tickerbot watchlist;
   the motion engine (js/characters-beat.js) turns the last closed bar — evaluated by
   js/good-intelligence-market-context.js, the JS port of the user-supplied Pine v6
   VFI + Fibonacci Bands and WaveTrend sources — into walking speed, sway, and flow.

   Everything on this stage is display-only. No beat authorizes anything, spends
   anything except the provider calls it must, or becomes investment advice. No bars
   means no motion: a berth without data stands still rather than pretending.
   */
"use strict";

(() => {
  const STORAGE_KEY = "harshalos.characters.ledger.v1";
  const REHEARSAL_BEAT_MS = 5000; // synthetic rehearsal only — never a live cadence

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
      const watchlist = ((window.APPS || []).find(app => app.id === "good-intelligence") || {}).tickerbotWatchlist;
      if (!Beat || !Cast || !MarketContext || !Array.isArray(watchlist) || !watchlist.length) {
        body.innerHTML = `<div class="ch-app"><div class="h1">Characters</div>
          <div class="rule-box refusal">The beat engine, the cast, the market-context evaluator, or the reviewed Tickerbot watchlist is not loaded. Check the script order in index.html and the Good Intelligence app entry.</div></div>`;
        return;
      }

      const stage = Cast.build(watchlist);
      const symbols = stage.berths.map(berth => berth.symbol);
      const storage = (() => {
        try {
          const probe = window.localStorage;
          probe.setItem(`${STORAGE_KEY}.probe`, "1");
          probe.removeItem(`${STORAGE_KEY}.probe`);
          return probe;
        } catch { return null; }
      })();

      function readLedger() {
        if (!storage) return Beat.emptyLedger(Date.now());
        try {
          return Beat.normalizeLedger(JSON.parse(storage.getItem(STORAGE_KEY) || "null"), Date.now());
        } catch { return Beat.emptyLedger(Date.now()); }
      }

      function writeLedger(ledger) {
        if (!storage) return;
        try { storage.setItem(STORAGE_KEY, JSON.stringify(ledger)); } catch { /* the ledger is best-effort */ }
      }

      const state = {
        cadence: Beat.DEFAULTS.cadenceMinutes,
        budget: Beat.DEFAULTS.monthlyBudget,
        interval: "1h",
        source: "live",
        auto: true,
        stretch: false,
        focus: symbols[0] || "",
        ledger: readLedger(),
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
              <p class="ch-lede">Objects, NPCs, and Items walking to the last <strong>closed</strong> bar. Every refresh is a beat;
              the plan spends at most <strong>${Beat.MAX_SYMBOLS_PER_BEAT}</strong> provider calls per beat, and re-drawing the stage spends none.</p>
            </div>
            <div class="ch-source-badge" data-ch-source-badge>Synthetic rehearsal · 0 calls</div>
          </header>

          <section class="ch-controls">
            <label class="ch-control"><span>CADENCE</span>
              <select data-ch-cadence>${Beat.CADENCES.map(minutes => `<option value="${minutes}">${Beat.formatHours(minutes / 60)}</option>`).join("")}</select>
            </label>
            <label class="ch-control"><span>BAR SIZE</span>
              <select data-ch-interval><option value="1h">1 hour</option><option value="1d">1 day</option></select>
            </label>
            <label class="ch-control"><span>MONTHLY BUDGET</span>
              <input type="number" min="100" max="1000000" step="100" value="${state.budget}" data-ch-budget aria-label="Provider calls per month">
            </label>
            <label class="ch-control"><span>DATA SOURCE</span>
              <select data-ch-source>
                <option value="live">Tickerbot Live</option>
                <option value="rehearsal">Synthetic rehearsal</option>
              </select>
            </label>
            <label class="ch-control ch-focus-control"><span>FOCUS</span>
              <select data-ch-focus aria-label="Focus a ticker">${symbols.map(symbol => `<option value="${esc(symbol)}">${esc(symbol)}</option>`).join("")}</select>
            </label>
            <div class="ch-buttons">
              <button class="ch-btn ch-btn-primary" data-ch-beat>Beat now</button>
              <button class="ch-btn" data-ch-auto aria-pressed="true">Auto-beat: on</button>
            </div>
          </section>

          <div class="ch-grid">
            <section class="ch-panel ch-stage-panel">
              <div class="ch-panel-head">
                <h2>The stage</h2>
                <div class="ch-legend">
                  <span><i class="ch-swatch ch-swatch-npc"></i>NPC — walks</span>
                  <span><i class="ch-swatch ch-swatch-object"></i>Object — sways</span>
                  <span><i class="ch-swatch ch-swatch-item"></i>Item — flows</span>
                </div>
              </div>
              <div class="ch-stage" data-ch-stage>
                <canvas data-ch-canvas width="880" height="620" tabindex="0" aria-label="Radial stage of the Characters cast. Each berth is one ticker; use the Focus selector for details."></canvas>
              </div>
              <p class="ch-stage-note" data-ch-stage-note>No beat yet. Characters stand at their berths; nothing has been invented.</p>
            </section>

            <aside class="ch-side">
              <section class="ch-panel ch-plan-panel">
                <div class="ch-panel-head"><h2>Budget plan</h2><span data-ch-plan-tag class="ch-tag">—</span></div>
                <div data-ch-plan></div>
                <label class="ch-check"><input type="checkbox" data-ch-stretch> Use the reserve stretch (+1 symbol per beat)</label>
                <p class="ch-fineprint" data-ch-plan-note></p>
              </section>

              <section class="ch-panel ch-detail-panel">
                <div class="ch-panel-head"><h2 data-ch-detail-title>Berth</h2><button class="ch-btn ch-btn-tiny" data-ch-feature>Feature</button></div>
                <div data-ch-detail></div>
              </section>

              <section class="ch-panel ch-log-panel">
                <div class="ch-panel-head"><h2>Beat log</h2><span class="ch-tag" data-ch-beatcount>0 beats</span></div>
                <ol class="ch-log" data-ch-log><li class="ch-log-empty">No beats recorded in this session.</li></ol>
                <p class="ch-fineprint">Browser ledger (best-effort): <span data-ch-ledger>0 calls this month</span>. The provider dashboard remains the authority on spend.</p>
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
      const cadenceSelect = $("[data-ch-cadence]");
      const intervalSelect = $("[data-ch-interval]");
      const budgetInput = $("[data-ch-budget]");
      const sourceSelect = $("[data-ch-source]");
      const focusSelect = $("[data-ch-focus]");
      const autoButton = $("[data-ch-auto]");
      const beatButton = $("[data-ch-beat]");
      const stretchBox = $("[data-ch-stretch]");
      const featureButton = $("[data-ch-feature]");
      const reduceMotion = Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      const IDLE_MOTION = Beat.motion(null);

      function planOf() {
        return Beat.plan({
          monthlyBudget: state.budget,
          cadenceMinutes: state.cadence,
          castSize: stage.berths.length,
          perRequestCap: Beat.MAX_SYMBOLS_PER_BEAT
        });
      }

      function perBeatOf(plan) {
        return state.stretch && plan.stretchWithinBudget ? plan.stretchCallsPerBeat : plan.callsPerBeat;
      }

      function beatIntervalMs() {
        return state.source === "rehearsal" ? REHEARSAL_BEAT_MS : state.cadence * 60_000;
      }

      /* ── Data ─────────────────────────────────────────────────────── */

      async function fetchLiveBeat(due, cadenceMinutes) {
        const endpoint = `/api/characters/v1/beat?symbols=${encodeURIComponent(due.join(','))}` +
          `&interval=${encodeURIComponent(state.interval)}&cadence=${cadenceMinutes}`;
        const fetcher = window.fetch || globalThis.fetch;
        const response = await fetcher(endpoint, {
          method: "GET", credentials: "same-origin", cache: "no-store", redirect: "error",
          headers: { Accept: "application/json" }
        });
        let payload = null;
        try { payload = await response.json(); } catch { /* handled below as a format error */ }
        const instruments = payload && payload.data && Array.isArray(payload.data.instruments) ? payload.data.instruments : [];
        if (!response.ok && !instruments.length) {
          const error = new Error((payload && payload.message) || `The beat route answered HTTP ${response.status}.`);
          error.kind = response.status === 404 || response.status === 503 ? "unconfigured" : "upstream";
          throw error;
        }
        return { instruments, spend: (payload && payload.data && payload.data.spend) || null };
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
        const budget = Beat.remainingBudget(state.ledger, state.budget);
        if (budget.exhausted) {
          state.message = { kind: "refusal", text: `The browser ledger already records ${budget.used} calls this month — the budget is spent. No beat was sent.` };
          drawPanels();
          return;
        }
        const due = Beat.selectDueSymbols({
          symbols,
          lastRefreshedAt: state.ledger.lastRefreshedAt,
          now: Date.now(),
          perBeat: perBeatOf(plan),
          featured: state.ledger.featured
        });
        if (!due.length) return;

        state.pending = true;
        drawPanels();
        const startedAt = Date.now();
        let result = null;
        let error = null;
        try {
          result = state.source === "live" ? await fetchLiveBeat(due, state.cadence) : rehearsalBeat(due);
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
        for (const instrument of result.instruments) {
          const symbol = String(instrument.symbol || "").toUpperCase();
          if (!symbol) continue;
          if (!instrument.marketContext) {
            unavailable += 1;
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
            gauge: directive.gauge,
            marks: directive.marks,
            zone: analysis && analysis.waveTrend ? analysis.waveTrend.zone : "unknown",
            combined: analysis ? analysis.combined : "no current confluence",
            note: directive.note
          };
          refreshed.push(symbol);
        }

        const calls = state.source === "live" && result.spend ? Number(result.spend.upstreamCalls) || 0 : 0;
        state.ledger = Beat.recordBeat(state.ledger, {
          at: now, symbols: refreshed, calls, moodBySymbol: moods,
          synthetic: state.source === "rehearsal", cadenceMinutes: state.cadence
        });
        writeLedger(state.ledger);
        state.lastBeatAt = now;
        state.beats += 1;
        state.log = [{
          at: now, reason, source: state.source, symbols: refreshed, calls,
          unavailable, cacheHits: result.spend ? result.spend.cacheHits : 0,
          moods: refreshed.map(symbol => `${symbol} ${moods[symbol] || "—"}`)
        }, ...state.log].slice(0, 12);
        state.nextBeatAt = now + beatIntervalMs();
        if (!state.message || state.message.kind === "error") {
          state.message = refreshed.length
            ? null
            : { kind: "note", text: "No symbol in this beat returned bars. Those berths stay frozen; nothing was fabricated." };
        }
        if (state.source === "live") {
          HOS.record("info", `Characters beat — ${refreshed.length} berth(s) refreshed from Tickerbot (${calls} provider call${calls === 1 ? "" : "s"}). Display-only motion.` +
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
        const budget = Beat.remainingBudget(state.ledger, state.budget);
        const perBeat = perBeatOf(plan);
        const sweepBeats = Math.ceil(stage.berths.length / Math.max(1, perBeat));
        const sweepHours = (sweepBeats * state.cadence) / 60;

        $("[data-ch-source-badge]").textContent = state.source === "rehearsal"
          ? "Synthetic rehearsal · 0 provider calls · not real market data"
          : "Tickerbot Live · one provider call per symbol per beat";
        $("[data-ch-source-badge]").className = `ch-source-badge${state.source === "rehearsal" ? " ch-source-badge-synthetic" : ""}`;

        const cadencePlan = Beat.compareCadences({ monthlyBudget: state.budget, castSize: stage.berths.length });
        $("[data-ch-plan]").innerHTML = `
          <dl class="ch-stats">
            <div><dt>Beats / month</dt><dd>${plan.beatsPerMonth.toLocaleString()}</dd></div>
            <div><dt>Symbols / beat</dt><dd>${perBeat}${state.stretch && plan.stretchWithinBudget ? " <span class=\"ch-stretch-tag\">stretch</span>" : ""}</dd></div>
            <div><dt>Calls / month</dt><dd>${(perBeat * plan.beatsPerMonth).toLocaleString()} <span class="ch-dim">of ${state.budget.toLocaleString()}</span></dd></div>
            <div><dt>Reserve held</dt><dd>${plan.reserveCalls.toLocaleString()}</dd></div>
            <div><dt>Full sweep</dt><dd>${sweepBeats} beats · ${Beat.formatHours(sweepHours)}</dd></div>
            <div><dt>Ledger spent</dt><dd>${budget.used.toLocaleString()} <span class="ch-dim">· ${budget.remaining.toLocaleString()} left</span></dd></div>
          </dl>
          <div class="ch-cadence-row">${cadencePlan.map(option => `
            <button class="ch-cadence-chip${option.cadenceMinutes === state.cadence ? " active" : ""}" data-ch-cadence-chip="${option.cadenceMinutes}"
              title="${option.callsPerBeat} per beat · ${option.callsPerMonth.toLocaleString()} calls/month · ${Beat.formatHours(option.sweepHours)} sweep">
              ${Beat.formatHours(option.cadenceMinutes / 60)}<small>${option.callsPerBeat}/beat</small>
              <i class="ch-chip-bar"><b style="width:${Math.round(Math.min(1, option.budgetUseRatio) * 100)}%"></b></i>
            </button>`).join("")}
          </div>`;
        const recommendation = Beat.recommendCadence({ monthlyBudget: state.budget, castSize: stage.berths.length });
        $("[data-ch-plan-tag]").textContent = `${recommendation.cadenceMinutes}-minute plan`;
        $("[data-ch-plan-note]").textContent = `${recommendation.reason} ${plan.notes.join(" ")}`;
        stretchBox.disabled = !plan.stretchWithinBudget;
        stretchBox.checked = state.stretch && plan.stretchWithinBudget;

        const focused = state.focus;
        const berth = stage.berths.find(entry => entry.symbol === focused);
        const directive = state.motions[focused];
        const analysis = state.analyses[focused];
        $("[data-ch-detail-title]").textContent = berth ? `${focused} · ${berth.npc.name}` : "Berth";
        $("[data-ch-detail]").innerHTML = berth ? `
          <p class="ch-detail-role">${esc(berth.npc.role)} — posted to ${esc(berth.sectorName)}.</p>
          <p class="ch-detail-caption">${esc(directive ? directive.caption : "No beat has reached this berth yet.")}</p>
          ${directive ? `
            <dl class="ch-gauges">
              <div><dt>Bias vs basis</dt><dd>${signed(directive.gauge.bias)} ${meter(Math.abs(directive.gauge.bias))}</dd></div>
              <div><dt>Flow (VFI − signal)</dt><dd>${signed(directive.gauge.flow)} ${meter(Math.abs(directive.gauge.flow))}</dd></div>
              <div><dt>Heat (WaveTrend)</dt><dd>${directive.gauge.heat.toFixed(2)} ${meter(directive.gauge.heat)}</dd></div>
              <div><dt>Charge (volatility)</dt><dd>${directive.gauge.charge.toFixed(2)} ${meter(directive.gauge.charge)}</dd></div>
              <div><dt>Crowd (relative volume)</dt><dd>${directive.gauge.crowd.toFixed(2)} ${meter(directive.gauge.crowd)}</dd></div>
            </dl>
            <p class="ch-detail-marks">${directive.marks.length ? directive.marks.map(mark => `<span>${esc(mark)}</span>`).join("") : "<span class=\"ch-dim\">No indicator events on the latest closed bar.</span>"}</p>
            <p class="ch-fineprint">${analysis ? `${esc(analysis.combined)} · ${esc(analysis.zone)} · ${analysis.bars} bars` : ""}
            ${analysis && analysis.synthetic ? " · SYNTHETIC REHEARSAL" : analysis && analysis.source ? ` · ${esc(analysis.source)}` : ""}</p>` : ""}
          <p class="ch-fineprint">NPC ${directive ? `${directive.npc.formation} formation · speed ${directive.npc.speed.toFixed(2)} · stride ${directive.npc.stride.toFixed(2)} · jitter ${directive.npc.jitter.toFixed(2)}` : "—"}
          · Object ${directive ? `sway ${directive.object.sway.toFixed(2)} · aperture ${directive.object.aperture.toFixed(2)}` : "—"}
          · Item ${directive ? `${directive.item.lane} at ${directive.item.rate.toFixed(2)}/beat` : "—"}</p>
          <p class="ch-fineprint">${analysis ? `Last beat ${clock(analysis.at)} · ${directive ? directive.status : "unknown"}` : "Awaiting its first beat."}</p>` : "";

        $("[data-ch-log]").innerHTML = state.log.length ? state.log.map(entry => `
          <li>
            <span class="ch-log-time">${clock(entry.at)}</span>
            <span class="ch-log-source ${entry.source === "rehearsal" ? "synthetic" : ""}">${entry.source === "rehearsal" ? "SYNTH" : `LIVE ${entry.calls} call${entry.calls === 1 ? "" : "s"}`}</span>
            <span class="ch-log-body">${entry.symbols.length ? entry.symbols.map(symbol => `<b>${esc(symbol)}</b> ${esc((state.motions[symbol] || {}).mood || "—")}`).join(" · ") : "no symbols due"}${
              entry.unavailable ? ` <em class="ch-warn">${entry.unavailable} unavailable</em>` : ""}</span>
          </li>`).join("") : `<li class="ch-log-empty">No beats recorded in this session.</li>`;
        $("[data-ch-beatcount]").textContent = `${state.ledger.beats} beat${state.ledger.beats === 1 ? "" : "s"}`;
        $("[data-ch-ledger]").textContent = `${state.ledger.calls.toLocaleString()} calls in ${state.ledger.month}`;
        $("[data-ch-stage-note]").textContent = state.message
          ? state.message.text
          : state.lastBeatAt
            ? (state.source === "rehearsal"
              ? `Rehearsing every ${REHEARSAL_BEAT_MS / 1000}s with synthetic bars — compressed for preview, 0 provider calls.`
              : `Next automatic beat in ${since(Date.now(), state.nextBeatAt)}. Positions hold between beats; no calls are spent meanwhile.`)
            : "No beat yet. Characters stand at their berths; nothing has been invented.";
        $("[data-ch-disclaimer]").innerHTML = `Motion, formations, and item flow are a display metaphor for price/volume context — the same Stage 2 representation the Pine/OCM boundary describes. They are not investment advice, a trade signal, a recommendation, or permission to act, and indicator event labels are display-only. ${Beat.DEFAULTS.reserveRatio * 100}% of the budget is held back by default for manual refreshes and retries.`;
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

      cadenceSelect.addEventListener("change", () => {
        state.cadence = Number(cadenceSelect.value) || Beat.DEFAULTS.cadenceMinutes;
        drawPanels();
        schedule();
      });
      intervalSelect.addEventListener("change", () => { state.interval = intervalSelect.value === "1d" ? "1d" : "1h"; });
      budgetInput.addEventListener("change", () => {
        state.budget = Math.max(100, Math.round(Number(budgetInput.value) || Beat.DEFAULTS.monthlyBudget));
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
          ? { kind: "note", text: "Synthetic rehearsal selected: deterministic generated bars, 0 provider calls, clearly labeled. Switch to Tickerbot Live for real data." }
          : { kind: "note", text: "Tickerbot Live selected. The next beat spends one provider call per due symbol; inside a beat window the Worker answers from its cadence cache." };
        drawPanels();
        schedule();
      }

      sourceSelect.addEventListener("change", () => switchSource(sourceSelect.value === "rehearsal" ? "rehearsal" : "live"));
      focusSelect.addEventListener("change", () => { state.focus = focusSelect.value; drawStage(Date.now()); drawPanels(); });
      autoButton.addEventListener("click", () => { state.auto = !state.auto; drawPanels(); schedule(); });
      beatButton.addEventListener("click", () => { beatNow("manual"); });
      stretchBox.addEventListener("change", () => { state.stretch = stretchBox.checked; drawPanels(); });
      featureButton.addEventListener("click", () => {
        const featured = new Set(state.ledger.featured);
        if (featured.has(state.focus)) featured.delete(state.focus);
        else featured.add(state.focus);
        state.ledger = { ...state.ledger, featured: [...featured] };
        writeLedger(state.ledger);
        drawPanels();
      });
      body.addEventListener("click", event => {
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
