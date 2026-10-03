/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Characters: the market beat engine.

   Why this exists: the palace already shows the cast going about a
   deterministic average day (docs/architecture/HARSHALS-PALACE.html). This
   module lets the same cast move to *live* market data instead: every
   refresh is a BEAT, and the last closed OHLCV bar — evaluated through the
   existing js/good-intelligence-market-context.js port of the user-supplied
   Pine v6 VFI + Fibonacci Bands and WaveTrend scripts — decides how the
   NPCs walk, how the Objects sway, and how the Items flow.

   Boundaries (matching docs/architecture/PINE-OCM-INTEGRATION.md):
     · Motion is Stage 2 *Representation* only. It never authorizes, never
       commits state, never becomes a trade instruction, and is not
       investment advice.
     · No bars means no motion. A sector without data freezes; the engine
       never invents a direction, a value, or a "probably up".
     · Synthetic rehearsal bars are labeled synthetic wherever they move a
       character, and are never mixed into a live beat.
     · Every function here is pure and deterministic: same packet, same
       motion. No Date.now() inside the engine — callers pass `now`.

   Budget math (why a beat is not a per-minute poll): the reviewed Tickerbot
   plan is 10,000 provider calls per month. One symbol costs one call, so the
   plan is calls-per-month ÷ beats-per-month = symbols-per-beat. At a 15-minute
   cadence that is ~3 symbols per beat; at an hour it is ~11. The full table
   lives in docs/architecture/CHARACTERS-MARKET-BEAT.md.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

window.CharactersBeat = (() => {
  const SCHEMA = Object.freeze({
    beat: "characters-beat-v1",
    motion: "characters-market-motion-v1"
  });

  /* Cadences the Worker will hold a beat open for. Each value is also the
     upstream cache TTL, so re-rendering inside a beat spends zero calls. */
  const CADENCES = Object.freeze([15, 30, 60, 240, 1440]);
  const MAX_SYMBOLS_PER_BEAT = 12;
  const DAYS_PER_MONTH = 30.44; // 365.25 / 12
  const MINUTES_PER_DAY = 1440;

  const DEFAULTS = Object.freeze({
    monthlyBudget: 10000,
    // Held back for manual "Beat now" refreshes, retries and mistakes. The
    // plan spends the usable part; the reserve is never assumed.
    reserveRatio: 0.15,
    cadenceMinutes: 60,
    castSize: 52,
    perRequestCap: MAX_SYMBOLS_PER_BEAT,
    featuredWeight: 2
  });

  const MOODS = Object.freeze([
    "frozen", "warming-up", "drift", "lean-up", "lean-down", "rally",
    "selloff", "churn", "coil", "surge", "flinch"
  ]);
  const FORMATIONS = Object.freeze(["ring", "tight", "rim", "column", "scatter"]);

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const finite = value => typeof value === "number" && Number.isFinite(value);
  const squash = (value, gain) => clamp(Math.tanh((finite(value) ? value : 0) * gain), -1, 1);

  /* ── Budget planning ─────────────────────────────────────────────
     beatsPerMonth = minutes in a month ÷ cadence. callsPerBeat = the floor
     of (budget − reserve) ÷ beats, capped by the per-request cap. `stretch`
     is the same figure rounded up, which spends into the reserve; the app
     offers it only when the hard monthly budget still covers it. */

  function normalizePlanInput(value) {
    const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const monthlyBudget = Math.round(clamp(Number(input.monthlyBudget) || DEFAULTS.monthlyBudget, 100, 10_000_000));
    const reserveRatio = clamp(finite(Number(input.reserveRatio)) ? Number(input.reserveRatio) : DEFAULTS.reserveRatio, 0, 0.8);
    const requestedCadence = Math.round(Number(input.cadenceMinutes) || DEFAULTS.cadenceMinutes);
    const cadenceMinutes = CADENCES.includes(requestedCadence) ? requestedCadence : DEFAULTS.cadenceMinutes;
    const castSize = Math.round(clamp(Number(input.castSize) || DEFAULTS.castSize, 1, 500));
    const perRequestCap = Math.round(clamp(Number(input.perRequestCap) || DEFAULTS.perRequestCap, 1, MAX_SYMBOLS_PER_BEAT));
    return { monthlyBudget, reserveRatio, cadenceMinutes, castSize, perRequestCap };
  }

  function plan(value) {
    const input = normalizePlanInput(value);
    const reserveCalls = Math.round(input.monthlyBudget * input.reserveRatio);
    const usableCalls = input.monthlyBudget - reserveCalls;
    const beatsPerMonth = Math.floor((DAYS_PER_MONTH * MINUTES_PER_DAY) / input.cadenceMinutes);
    const rawPerBeat = usableCalls / beatsPerMonth;
    const callsPerBeat = clamp(Math.floor(rawPerBeat), 1, input.perRequestCap);
    const callsPerMonth = callsPerBeat * beatsPerMonth;
    const stretchCallsPerBeat = clamp(Math.ceil(rawPerBeat), 1, input.perRequestCap);
    const stretchCallsPerMonth = stretchCallsPerBeat * beatsPerMonth;
    const sweepBeats = Math.ceil(input.castSize / callsPerBeat);
    const sweepHours = (sweepBeats * input.cadenceMinutes) / 60;
    const notes = [];

    if (callsPerBeat >= input.perRequestCap && rawPerBeat > input.perRequestCap) {
      notes.push(`The budget supports about ${Math.floor(rawPerBeat)} symbols per beat, more than the ${input.perRequestCap}-symbol request cap. A shorter cadence would use the budget.`);
    }
    if (rawPerBeat < 1) {
      notes.push("Even one symbol per beat exceeds the reserve at this cadence. Lengthen the cadence or raise the budget.");
    }
    if (callsPerMonth / input.monthlyBudget < 0.5) {
      notes.push(`This plan spends ${Math.round((callsPerMonth / input.monthlyBudget) * 100)}% of the budget: the cadence is slower than the budget can afford.`);
    }
    notes.push(sweepHours <= input.cadenceMinutes / 60
      ? "Every character is refreshed on every beat at this plan."
      : `A full sweep of ${input.castSize} characters takes ${sweepBeats} beats (${formatHours(sweepHours)} at this cadence).`);

    return Object.freeze({
      schema: SCHEMA.beat,
      ...input,
      reserveCalls,
      usableCalls,
      beatsPerMonth,
      callsPerBeat,
      callsPerMonth,
      callsPerDay: Math.round((callsPerMonth / DAYS_PER_MONTH) * 10) / 10,
      stretchCallsPerBeat,
      stretchCallsPerMonth,
      stretchWithinBudget: stretchCallsPerMonth <= input.monthlyBudget,
      stretchSpendsReserve: stretchCallsPerMonth > usableCalls,
      sweepBeats,
      sweepHours: Math.round(sweepHours * 100) / 100,
      sweepsPerDay: Math.round((24 / Math.max(sweepHours, 0.01)) * 10) / 10,
      budgetUseRatio: Math.round((callsPerMonth / input.monthlyBudget) * 1000) / 1000,
      notes: Object.freeze(notes)
    });
  }

  function formatHours(hours) {
    if (!finite(hours)) return "unknown";
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 48) return `${Math.round(hours * 10) / 10} h`;
    return `${Math.round((hours / 24) * 10) / 10} days`;
  }

  /* Whole-plan comparison for the app's cadence selector. The recommendation
     is the fastest cadence whose reserve-protected plan does not exceed the
     budget — i.e. the one that spends the most of what was budgeted without
     assuming the reserve. */
  function compareCadences(value) {
    const base = normalizePlanInput(value);
    return CADENCES.map(cadenceMinutes => plan({ ...base, cadenceMinutes }));
  }

  function recommendCadence(value) {
    const base = normalizePlanInput(value);
    const options = compareCadences(base);
    const feasible = options.filter(option => option.callsPerMonth <= base.monthlyBudget);
    const ranked = (feasible.length ? feasible : options).slice().sort((a, b) =>
      (b.budgetUseRatio - a.budgetUseRatio) || (a.cadenceMinutes - b.cadenceMinutes));
    const chosen = ranked[0];
    const faster = options.find(option => option.cadenceMinutes < chosen.cadenceMinutes && option.callsPerMonth > base.monthlyBudget);
    return Object.freeze({
      cadenceMinutes: chosen.cadenceMinutes,
      plan: chosen,
      reason: faster
        ? `${chosen.callsPerBeat} symbols per beat spends ${Math.round(chosen.budgetUseRatio * 100)}% of the budget; a ${faster.cadenceMinutes}-minute cadence would overspend it.`
        : `${chosen.callsPerBeat} symbols per beat spends ${Math.round(chosen.budgetUseRatio * 100)}% of the budget at this cast size.`
    });
  }

  /* ── Rotation ────────────────────────────────────────────────────
     Least-recently-refreshed first. A featured ticker's age counts double, so it
     reaches the front of the queue at half the age of an unfeatured one — roughly
     twice the refresh rate inside the same budget. Ties break on symbol A→Z, so the
     same ledger + clock always produce the same beat. */

  function selectDueSymbols({ symbols = [], lastRefreshedAt = {}, now = 0, perBeat = 1, featured = [], featuredWeight = DEFAULTS.featuredWeight } = {}) {
    const requested = Math.max(0, Math.round(perBeat));
    if (!requested) return [];
    const star = new Set((Array.isArray(featured) ? featured : []).map(symbol => String(symbol).trim().toUpperCase()));
    return [...new Set(symbols.map(symbol => String(symbol).trim().toUpperCase()).filter(Boolean))]
      .map(symbol => {
        const at = Number(lastRefreshedAt[symbol]);
        const age = finite(at) ? Math.max(0, now - at) : Number.MAX_SAFE_INTEGER;
        const weight = star.has(symbol) ? clamp(Number(featuredWeight) || DEFAULTS.featuredWeight, 1, 8) : 1;
        return { symbol, age, weight, rank: age === Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : age * weight };
      })
      .sort((a, b) => (b.rank - a.rank) || (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0))
      .slice(0, requested)
      .map(entry => entry.symbol);
  }

  /* ── Reading a bar series ────────────────────────────────────────
     Everything the motion layer needs, derived from the same
     gi-market-analysis-v1 packet the Market Charts tab evaluates. */

  function seriesNumbers(series) {
    if (!Array.isArray(series)) return [];
    return series.map(point => point && Number(point.close)).filter(finite);
  }

  function stdev(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
  }

  function relativeVolume(series) {
    if (!Array.isArray(series) || series.length < 3) return null;
    const volumes = series.slice(-21).map(point => Number(point && point.volume)).filter(finite);
    if (volumes.length < 3) return null;
    const latest = volumes[volumes.length - 1];
    const average = volumes.slice(0, -1).reduce((sum, value) => sum + value, 0) / (volumes.length - 1);
    return average > 0 ? latest / average : null;
  }

  function gaugeOf(analysis) {
    if (!analysis || typeof analysis !== "object") {
      return Object.freeze({ bias: 0, flow: 0, heat: 0, charge: 0, crowd: 0, known: false });
    }
    const series = Array.isArray(analysis.chartSeries) ? analysis.chartSeries : [];
    const closes = seriesNumbers(series);
    const close = finite(Number(analysis.close)) ? Number(analysis.close) : closes[closes.length - 1];
    const basis = analysis.bands && finite(Number(analysis.bands.basis)) ? Number(analysis.bands.basis) : null;
    const ready = analysis.status === "ready" || analysis.status === "partial";

    /* Bias: how far the last close sits from the Fibonacci-band basis,
       squashed to ±1. Falls back to the 20-bar slope when the basis is not
       warmed up yet, so a young series still moves — gently. */
    let bias = 0;
    if (finite(close) && finite(basis) && basis > 0) bias = squash((close - basis) / basis, 40);
    else if (closes.length >= 6) {
      const window = closes.slice(-20);
      const slope = (window[window.length - 1] - window[0]) / Math.max(1, window.length - 1);
      bias = squash(slope / Math.max(1e-9, window[0]), 40);
    }

    const vfi = analysis.vfi || {};
    const flow = finite(Number(vfi.value)) && finite(Number(vfi.signal))
      ? squash(Number(vfi.value) - Number(vfi.signal), 0.35)
      : 0;

    const wave = analysis.waveTrend || {};
    const heat = finite(Number(wave.wt1)) ? clamp(Math.abs(Number(wave.wt1)) / 60, 0, 1) : 0;

    /* Charge: realized per-bar volatility against a 2% reference move. */
    const returns = [];
    for (let index = 1; index < closes.length; index++) {
      if (closes[index - 1] > 0) returns.push((closes[index] - closes[index - 1]) / closes[index - 1]);
    }
    const charge = clamp(stdev(returns.slice(-20)) / 0.02, 0, 1);

    const volume = relativeVolume(series);
    const crowd = volume === null ? 0.25 : clamp((volume - 0.75) / 1.25, 0, 1);

    return Object.freeze({
      bias: Math.round(bias * 1000) / 1000,
      flow: Math.round(flow * 1000) / 1000,
      heat: Math.round(heat * 1000) / 1000,
      charge: Math.round(charge * 1000) / 1000,
      crowd: Math.round(crowd * 1000) / 1000,
      known: Boolean(close) && (ready || closes.length >= 6)
    });
  }

  /* Event marks, in a fixed order, so two runs of the same beat read the
     same. These are display-only indicator events — the same language the
     Market Charts tab uses. */
  function marksOf(analysis) {
    if (!analysis || typeof analysis !== "object") return [];
    const signals = analysis.signals || {};
    const wave = (analysis.waveTrend && analysis.waveTrend.signals) || {};
    const divergence = Array.isArray(wave.divergence) ? wave.divergence : [];
    const marks = [];
    if (signals.bullishConfluence) marks.push("bullish VFI + band confluence");
    if (signals.bearishConfluence) marks.push("bearish VFI + band confluence");
    if (signals.upperBreak) marks.push("upper band break");
    if (signals.lowerBreak) marks.push("lower band break");
    if (signals.vfiBull) marks.push("VFI bullish crossover");
    if (signals.vfiBear) marks.push("VFI bearish crossover");
    if (wave.bullishCross) marks.push("WaveTrend bullish cross");
    if (wave.bearishCross) marks.push("WaveTrend bearish cross");
    if (wave.zeroCrossUp) marks.push("WaveTrend zero cross up");
    if (wave.zeroCrossDown) marks.push("WaveTrend zero cross down");
    if (wave.extremeBullish) marks.push("extreme oversold reversal");
    if (wave.extremeBearish) marks.push("extreme overbought reversal");
    divergence.slice(0, 2).forEach(type => marks.push(`${String(type).toLowerCase()} divergence`));
    if (signals.barClosePending) marks.push("latest bar unconfirmed — held");
    return marks.slice(0, 6);
  }

  function moodOf(analysis, gauge) {
    if (!analysis || analysis.status === "no-data") return "frozen";
    if (analysis.status === "warming-up" && !gauge.known) return "warming-up";
    const signals = analysis.signals || {};
    const wave = (analysis.waveTrend && analysis.waveTrend.signals) || {};
    if (signals.bearishConfluence || wave.extremeBearish) return "flinch";
    if (signals.bullishConfluence || wave.extremeBullish) return "surge";
    if (gauge.bias >= 0.35 && gauge.flow >= 0) return "rally";
    if (gauge.bias <= -0.35 && gauge.flow <= 0) return "selloff";
    if (gauge.heat >= 0.85) return "coil";
    if (gauge.charge >= 0.55 && Math.abs(gauge.bias) < 0.3) return "churn";
    if (Math.abs(gauge.bias) < 0.15) return "drift";
    return gauge.bias > 0 ? "lean-up" : "lean-down";
  }

  /* ── Motion ──────────────────────────────────────────────────────
     One packet in, one directive out — per character class, because the
     classes do not move the same way:
       · NPCs walk.   Direction, stride, jitter and formation change.
       · Objects sway. Anchored props tilt, pulse and open an aperture.
       · Items flow.  Crates move along the berth lane at a volume rate. */

  function motion(value, options = {}) {
    const analysis = value && typeof value === "object" ? value : null;
    const gauge = gaugeOf(analysis);
    const mood = moodOf(analysis, gauge);
    const frozen = mood === "frozen" || mood === "warming-up";
    const bearingBase = finite(Number(options.bearingBase)) ? Number(options.bearingBase) : 0;
    const marks = frozen ? [] : marksOf(analysis);
    const evented = marks.length > 0;

    const speed = frozen ? 0 : clamp(0.2 + 0.55 * Math.abs(gauge.bias) + 0.35 * gauge.charge + (evented ? 0.15 : 0), 0.12, 1);
    const stride = frozen ? 0 : clamp(0.3 + 0.5 * gauge.charge + 0.2 * gauge.heat, 0.2, 1);
    const jitter = frozen ? 0 : clamp(gauge.charge * 0.8 + (mood === "churn" ? 0.2 : 0) + (mood === "flinch" ? 0.15 : 0), 0, 1);
    const energy = frozen ? 0 : clamp(0.15 + 0.45 * speed + 0.4 * gauge.heat, 0, 1);
    const bearing = frozen ? bearingBase : bearingBase + gauge.bias * (Math.PI * 0.5) + gauge.flow * (Math.PI * 0.12);
    const formation = frozen ? "ring"
      : gauge.heat >= 0.7 ? "rim"
        : gauge.crowd >= 0.55 ? "tight"
          : Math.abs(gauge.bias) < 0.15 ? "ring"
            : gauge.flow > 0 ? "column" : "scatter";
    const bandBreak = Boolean(analysis && analysis.signals && (analysis.signals.upperBreak || analysis.signals.lowerBreak));

    const npc = Object.freeze({
      speed: round(speed), stride: round(stride), jitter: round(jitter),
      bearing: round(bearing, 4), formation, destBias: round(gauge.bias)
    });
    const object = Object.freeze({
      sway: round(frozen ? 0 : clamp(0.1 + 0.7 * gauge.charge + 0.2 * gauge.heat, 0, 1)),
      pulse: round(frozen ? 0 : clamp(0.15 + 0.85 * energy, 0, 1)),
      aperture: round(frozen ? 0 : bandBreak ? 1 : clamp(0.1 + gauge.crowd * 0.6, 0, 1)),
      tilt: round(frozen ? 0 : gauge.bias * 0.5, 4)
    });
    const item = Object.freeze({
      rate: round(frozen ? 0 : clamp(0.25 + 1.5 * gauge.crowd + (mood === "rally" || mood === "surge" ? 0.4 : 0), 0.1, 2)),
      bob: round(frozen ? 0 : clamp(0.3 + 0.7 * speed, 0, 1)),
      spin: round(frozen ? 0 : clamp(0.2 + 0.8 * jitter, 0, 1)),
      lane: gauge.flow >= 0 ? "inbound" : "outbound"
    });

    const source = analysis ? String(analysis.source || "") : "";
    return Object.freeze({
      schema: SCHEMA.motion,
      symbol: analysis ? String(analysis.symbol || "") : "",
      status: !analysis ? "missing" : String(analysis.status || "unknown"),
      synthetic: Boolean(analysis && analysis.synthetic),
      source,
      barCount: analysis && finite(Number(analysis.barCount)) ? Number(analysis.barCount) : 0,
      mood,
      frozen,
      marks: Object.freeze(marks),
      gauge,
      npc,
      object,
      item,
      caption: captionFor({ mood, gauge, frozen, marks, symbol: analysis ? analysis.symbol : "" }),
      note: "Display-only motion derived from the last closed bar. Not investment advice, a trade signal, or permission to act; indicator event labels are not trade instructions."
    });
  }

  function captionFor({ mood, gauge, frozen, marks, symbol }) {
    const label = symbol ? `${symbol}: ` : "";
    if (frozen) return `${label}${mood === "frozen" ? "no bars — the berth stands still" : "warming up — not enough closed bars to move"}`;
    const direction = gauge.bias > 0.08 ? "above basis" : gauge.bias < -0.08 ? "below basis" : "at basis";
    const flowText = gauge.flow > 0.08 ? "flow up" : gauge.flow < -0.08 ? "flow down" : "flow flat";
    const heatText = gauge.heat >= 0.7 ? "wound tight" : gauge.heat <= 0.2 ? "settled" : "mid-band";
    const event = marks.length ? ` · ${marks[0]}` : "";
    return `${label}${mood} · ${direction} · ${flowText} · ${heatText}${event}`;
  }

  function round(value, digits = 3) {
    const factor = 10 ** digits;
    return Math.round((finite(value) ? value : 0) * factor) / factor;
  }

  /* Blend between two directives so the stage glides between beats instead
     of snapping. Categorical fields switch at the halfway point, so a mood
     change is visible exactly once per beat and stays deterministic. */
  function blend(from, to, t) {
    const ratio = clamp(finite(t) ? t : 0, 0, 1);
    if (!from || !to) return ratio < 0.5 ? (from || to) : (to || from);
    const switched = ratio >= 0.5;
    const mix = (a, b, digits = 3) => round(a + (b - a) * ratio, digits);
    return Object.freeze({
      ...to,
      status: switched ? to.status : from.status,
      mood: switched ? to.mood : from.mood,
      frozen: switched ? to.frozen : from.frozen,
      marks: switched ? to.marks : from.marks,
      caption: switched ? to.caption : from.caption,
      gauge: Object.freeze({
        bias: mix(from.gauge.bias, to.gauge.bias),
        flow: mix(from.gauge.flow, to.gauge.flow),
        heat: mix(from.gauge.heat, to.gauge.heat),
        charge: mix(from.gauge.charge, to.gauge.charge),
        crowd: mix(from.gauge.crowd, to.gauge.crowd),
        known: from.gauge.known || to.gauge.known
      }),
      npc: Object.freeze({
        ...to.npc,
        speed: mix(from.npc.speed, to.npc.speed),
        stride: mix(from.npc.stride, to.npc.stride),
        jitter: mix(from.npc.jitter, to.npc.jitter),
        bearing: mix(from.npc.bearing, to.npc.bearing, 4),
        formation: switched ? to.npc.formation : from.npc.formation
      }),
      object: Object.freeze({
        sway: mix(from.object.sway, to.object.sway),
        pulse: mix(from.object.pulse, to.object.pulse),
        aperture: mix(from.object.aperture, to.object.aperture),
        tilt: mix(from.object.tilt, to.object.tilt, 4)
      }),
      item: Object.freeze({
        rate: mix(from.item.rate, to.item.rate),
        bob: mix(from.item.bob, to.item.bob),
        spin: mix(from.item.spin, to.item.spin),
        lane: switched ? to.item.lane : from.item.lane
      })
    });
  }

  /* ── Ledger ──────────────────────────────────────────────────────
     The durable call count lives in the browser (localStorage): it is the
     only place that survives a redeploy. It is best-effort accounting for a
     human's own budget, not a billing record — the provider's dashboard is
     the authority on what was actually spent. */

  function monthKey(at) {
    const date = new Date(finite(at) ? at : Date.now());
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  function emptyLedger(at) {
    return {
      schema: "characters-beat-ledger-v1",
      month: monthKey(at),
      calls: 0,
      beats: 0,
      featured: [],
      lastRefreshedAt: {},
      history: []
    };
  }

  function normalizeLedger(value, at) {
    const month = monthKey(at);
    const ledger = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    if (ledger.month !== month) return emptyLedger(at);
    const lastRefreshedAt = {};
    const source = ledger.lastRefreshedAt && typeof ledger.lastRefreshedAt === "object" ? ledger.lastRefreshedAt : {};
    Object.keys(source).forEach(symbol => {
      const at = Number(source[symbol]);
      if (finite(at)) lastRefreshedAt[symbol] = at;
    });
    return {
      schema: "characters-beat-ledger-v1",
      month,
      calls: Math.max(0, Math.round(Number(ledger.calls) || 0)),
      beats: Math.max(0, Math.round(Number(ledger.beats) || 0)),
      featured: [...new Set((Array.isArray(ledger.featured) ? ledger.featured : []).map(item => String(item).toUpperCase()).filter(Boolean))],
      lastRefreshedAt,
      history: (Array.isArray(ledger.history) ? ledger.history : []).slice(-24)
    };
  }

  function recordBeat(ledger, { at, symbols = [], calls = 0, moodBySymbol = {}, synthetic = false, cadenceMinutes = 60 }) {
    const next = normalizeLedger(ledger, at);
    const stamp = finite(at) ? at : Date.now();
    const refreshed = symbols.map(symbol => String(symbol).toUpperCase());
    refreshed.forEach(symbol => { next.lastRefreshedAt[symbol] = stamp; });
    next.calls += Math.max(0, Math.round(calls));
    next.beats += 1;
    next.history = [...next.history, {
      at: stamp, symbols: refreshed, calls: Math.max(0, Math.round(calls)),
      moods: refreshed.map(symbol => moodBySymbol[symbol] || "unknown"),
      synthetic: Boolean(synthetic), cadenceMinutes
    }].slice(-24);
    return next;
  }

  function remainingBudget(ledger, monthlyBudget) {
    const used = Math.max(0, Number(ledger && ledger.calls) || 0);
    const budget = Math.max(0, Number(monthlyBudget) || 0);
    return { used, budget, remaining: Math.max(0, budget - used), exhausted: used >= budget };
  }

  /* ── Rehearsal bars ──────────────────────────────────────────────
     A local, deterministic generator so the stage can be exercised with no
     provider key and zero calls. Every packet it produces is marked
     synthetic and the app watermarks it. It is never substituted for a live
     beat: the app only reaches for it when the operator picks it. */

  function hash32(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function prng(seed) {
    let state = hash32(seed);
    return () => {
      state = (state + 0x6d2b79f5) | 0;
      let value = Math.imul(state ^ (state >>> 15), 1 | state);
      value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rehearse({ symbol = "REHEARSAL", at = Date.now(), bars = 240, beat = 1 } = {}) {
    const name = String(symbol).toUpperCase();
    const random = prng(`${name}:${beat}:characters-beat`);
    const base = 40 + random() * 320;
    const drift = (random() - 0.45) * base * 0.004;
    const amplitude = base * (0.01 + random() * 0.03);
    const longWave = base * (0.005 + random() * 0.02);
    const phase = random() * Math.PI * 2;
    const volume = 500 + random() * 3000;
    const hour = 60 * 60_000;
    const latestClose = Math.floor(at / hour) * hour;
    const rows = [];
    let previousClose = null;
    for (let index = 0; index < bars; index++) {
      const close = base + index * drift + Math.sin(index / 9 + phase) * amplitude
        + Math.sin(index / 3.5 + phase) * amplitude * 0.33 + Math.sin(index / 26 + phase) * longWave;
      const open = previousClose === null ? close - amplitude * 0.05 : previousClose;
      rows.push({
        time: new Date(latestClose - (bars - index - 1) * hour).toISOString(),
        open, high: Math.max(open, close) + amplitude * 0.08,
        low: Math.min(open, close) - amplitude * 0.08, close,
        volume: Math.max(1, volume + volume * 0.3 * (1 + Math.sin(index / 4.4 + phase))),
        confirmed: true
      });
      previousClose = close;
    }
    return Object.freeze({
      schema: "gi-market-context-v1",
      synthetic: true,
      source: "Synthetic rehearsal generator (no provider call, not real market data)",
      symbol: name,
      timeframe: "1h",
      bars: Object.freeze(rows)
    });
  }

  return Object.freeze({
    SCHEMA, CADENCES, MAX_SYMBOLS_PER_BEAT, DEFAULTS, MOODS, FORMATIONS,
    plan, compareCadences, recommendCadence, formatHours,
    selectDueSymbols, gaugeOf, marksOf, moodOf, motion, captionFor, blend,
    monthKey, emptyLedger, normalizeLedger, recordBeat, remainingBudget,
    rehearse, hash32
  });
})();
