/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Good Intelligence / Orb 2

   Orb 2 combines the Orb Communicator Model's 3D disc-to-sphere view with
   the same reviewed market-beat contract and motion engine used by Characters.
   Live data still travels only through the same-origin Characters Worker route and its
   characters-beat-v1 response contract;
   this module never receives provider secrets and cannot send OCM traffic. No OCM message is sent.

   CharactersBeat owns planning, rotation, analysis-to-motion mapping, blending,
   and the live provider routes. Synthetic/demo mode is disabled in this view —
   unavailable beats stay held, never substituted. CharactersCast and CharactersDiscCatalog
   own the reviewed cast and Discs. This module composes those existing pieces in
   a 3D view rather than forking their market rules.

   Good Intelligence mounts this model over its reviewed ticker watchlist: each
   ticker becomes a display-only orb with distinct hourly and daily geometry, and
   Clear beats / Restore stored beats bridge the anonymous D1 saved-beat archive
   (SAVED_BEAT_SESSION_KEY) shared with the Characters app. The fixed DXY benchmark
   is separately derived only after six aligned, confirmed daily FX inputs; its
   ignition sequence then visits each of the 52 market-cap-ranked ticker orbs once.

   Center Origin carries the parts the author specified on the whiteboard: an inner
   shell inside the model, the declared PDH phase as a rotation shift of that
   assembly, the origin drawn as the CPU node, and the Human Key gate as the thing
   that secures it. Phase and gate are read from the local kernel snapshot
   (HOS.observe()) and the local UTS math only — never from a provider, never from
   a claim, and never used to authorize. An unread kernel is a dimmer ring and an
   "UNREAD" readout, not a defaulted phase.
   ═══════════════════════════════════════════════════════════════ */
"use strict";

(() => {
  const SCHEMA = "gi-orb2-v2";
  const BEAT_SCHEMA = "gi-orb2-beat-v1";
  const STORE_ROUTE = "/api/good-intelligence/v1/orb2/beats";
  const PREFS_KEY = "harshalos.good-intelligence.orb2.preferences.v1";
  const SESSION_KEY = "harshalos.good-intelligence.orb2.session.v1";
  const EVENTS_KEY = "harshalos.good-intelligence.orb2.history.v1";
  /* Anonymous browser key for the separate shared saved-beat archive
     (/api/orb2/v1/beats). It carries no identity, roster, or market claim. */
  const SAVED_BEAT_SESSION_KEY = "harshalos.orb2.saved-beats.session.v1";
  function getSavedBeatSessionId() {
    try {
      const storage = globalThis.localStorage;
      const current = storage.getItem(SAVED_BEAT_SESSION_KEY);
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(current || "")) return current;
      const id = globalThis.crypto?.randomUUID?.();
      if (!id) return "";
      storage.setItem(SAVED_BEAT_SESSION_KEY, id);
      return id;
    } catch { return ""; }
  }
  /* The declared PDH phase shifts the Center Origin assembly's rotation. These are
     display offsets for the three operational phases only — a phase never changes a
     price, a cadence, or an entitlement, and an undeclared phase shifts nothing. */
  const PHASE_SHIFT_RADIANS = Object.freeze({ NAB: 0, CWO: Math.PI / 3, GSRB: (2 * Math.PI) / 3 });
  const kernelSnapshot = () => {
    try {
      const hos = globalThis.HOS;
      if (hos && typeof hos.observe === "function") {
        const snapshot = hos.observe();
        return snapshot && typeof snapshot === "object" ? snapshot : null;
      }
    } catch { /* display-only: an unread kernel is an unavailable readout, not a default */ }
    return null;
  };
  const legitimacyGate = () => {
    try {
      const hos = globalThis.HOS;
      if (hos && typeof hos.legitimacy === "function") return clamp(hos.legitimacy(), 0, 1);
    } catch { /* display-only fallback below */ }
    return 0.5;
  };
  const TAU = Math.PI * 2;
  const CENTER_ADDRESS = "0•000•000•0000";
  /* The beat belongs to the Worker. A Cron Trigger wakes the server-side field
     every minute; this page reads the stored observations and renders them, so
     hiding the tab, closing it, or switching providers costs no provider call
     and never replays the firing order from the top. `PROVIDER_COOLDOWN_MS` and
     the client-side pacing interval are gone with the browser beat engine. */
  const FIELD_ROUTE = "/api/good-intelligence/v1/orb2/field";
  const FIELD_REQUEST_SCHEMA = "gi-orb2-field-request-v1";
  const FIELD_POLL_MS = 20_000;
  const FIELD_BEAT_TYPES = Object.freeze(["observation", "message", "trade", "authorization", "permission"]);
  /* The server tick's own allowance; the page never paces a request itself. */
  const MASSIVE_REQUESTS_PER_MINUTE = 5;
  const MAX_HISTORY = 120;
  const MAX_LOCAL_HISTORY = 24;
  const PALETTE = Object.freeze([
    "#6fd3ff", "#a86bff", "#5ce6a8", "#ffd479", "#ff7184", "#ffb45c",
    "#35d9e8", "#d5a8ff", "#4f8dff", "#3ddc84", "#f2ede2"
  ]);
  const MOOD_COLORS = Object.freeze({
    frozen: "#74839a", "warming-up": "#ffb45c", drift: "#8fa1bb",
    "lean-up": "#65cce8", "lean-down": "#f0a16b", rally: "#5ce6a8",
    selloff: "#ff7184", churn: "#ffd479", coil: "#b68cff",
    surge: "#f2ede2", flinch: "#ff7184", unknown: "#74839a"
  });
  const PROVIDER_COLORS = Object.freeze({
    massive: "#6fd3ff", tickerbot: "#5ce6a8", alpha: "#ffd479",
    rehearsal: "#ff9d6c", unknown: "#718096"
  });
  /* Tritium green — the color of tritium radioluminescent signs. Reserved for
     the beat-synced Center Point beams: a brief highlight that connects the
     Center Point to the selected node and to the instruments confirmed by the
     latest beat, then fades. It is never a constant flash and it carries no
     data: a beam is a local visual trace, not an OCM message. */
  const TRITIUM_COLOR = "#5df08c";
  const TRITIUM_BEAT_WINDOW_MS = 1900;
  const DATA_COLORS = Object.freeze({
    unknown: "#718096",
    priceUp: "#35d0c1", priceDown: "#fb7185", priceFlat: "#cbd5e1",
    flowAbove: "#42dd78", flowBelow: "#ff4d6d", flowEqual: "#c4b5fd",
    basisAbove: "#fbbf24", basisBelow: "#818cf8", basisEqual: "#94a3b8",
    waveOversold: "#38bdf8", waveNeutral: "#c084fc", waveOverbought: "#fb923c",
    packetConfirmed: "#34d399", packetUnconfirmed: "#facc15",
    packetPriceOnly: "#a78bfa", packetValueOnly: "#fb923c"
  });
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const finite = value => typeof value === "number" && Number.isFinite(value);
  const numeric = value => {
    if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const ease = value => {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  };
  const slug = value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const isRecord = value => value && typeof value === "object" && !Array.isArray(value);
  const shortTime = value => {
    const date = new Date(Number(value));
    return Number.isNaN(date.getTime()) ? "time unavailable" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };
  const formatPrice = value => {
    const number = numeric(value);
    if (number === null) return "—";
    const digits = Math.abs(number) >= 1000 ? 2 : Math.abs(number) >= 1 ? 3 : 6;
    return number.toLocaleString(undefined, { maximumFractionDigits: digits });
  };
  const formatPercent = value => {
    const number = numeric(value);
    return number === null ? "—" : `${number > 0 ? "+" : ""}${number.toFixed(2)}%`;
  };
  const formatCountdown = milliseconds => {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  };
  const providerTitle = provider => provider === "massive" ? "Massive"
    : provider === "tickerbot" ? "Tickerbot"
      : provider === "alpha" ? "Alpha Vantage"
        : "Synthetic rehearsal";
  const instrumentProvider = provider => provider === "alpha" ? "alpha-vantage"
    : provider === "rehearsal" ? "synthetic" : provider;
  const providerColor = observation => {
    const provider = String(observation && (observation.providerMode || observation.provider) || "").toLowerCase();
    const key = provider.includes("tickerbot") ? "tickerbot"
      : provider.includes("alpha") ? "alpha"
        : provider.includes("massive") ? "massive"
          : provider.includes("synthetic") || provider.includes("rehearsal") ? "rehearsal" : "unknown";
    return PROVIDER_COLORS[key];
  };

  function flowStateForMarket(market) {
    const vfi = isRecord(market) && isRecord(market.vfi) ? market.vfi : null;
    const value = numeric(vfi && vfi.value);
    const signal = numeric(vfi && vfi.signal);
    if (!vfi || vfi.available !== true || value === null || signal === null) {
      return { state: "unavailable", color: DATA_COLORS.unknown, value: null, signal: null };
    }
    const state = value > signal ? "above" : value < signal ? "below" : "equal";
    const color = state === "above" ? DATA_COLORS.flowAbove : state === "below" ? DATA_COLORS.flowBelow : DATA_COLORS.flowEqual;
    return { state, color, value, signal };
  }

  function flowPathForObservation(observation, motionOverride = null) {
    const market = isRecord(observation && observation.market) ? observation.market : null;
    const motion = isRecord(motionOverride) ? motionOverride : isRecord(observation && observation.motion) ? observation.motion : null;
    const item = motion && isRecord(motion.item) ? motion.item : null;
    const flow = flowStateForMarket(market);
    const latestConfirmed = Boolean(market && market.latestBar && market.latestBar.confirmed === true);
    const volumeAvailable = Boolean(market && market.volumeAvailable === true && motion && motion.volumeAvailable === true);
    const rate = numeric(item && item.rate);
    const lane = item && item.lane;
    let reason = "";
    if (!market) reason = "Market observation unavailable";
    else if (!latestConfirmed) reason = "Paused · latest bar not confirmed";
    else if (!volumeAvailable) reason = "Paused · OHLCV volume unavailable";
    else if (flow.state === "unavailable") reason = "Paused · VFI or signal unavailable";
    else if (flow.state === "equal") reason = "Paused · VFI equals its signal";
    else if (!motion || motion.frozen) reason = "Paused · Characters motion held";
    else if (rate === null || rate <= 0) reason = "Paused · relative-volume cadence unavailable";
    else if (lane !== "inbound" && lane !== "outbound") reason = "Paused · flow direction unavailable";
    else if (lane !== (flow.state === "above" ? "inbound" : "outbound")) reason = "Paused · Characters direction transitioning";
    const moving = reason === "";
    return {
      state: flow.state,
      color: moving || flow.state === "equal" ? flow.color : DATA_COLORS.unknown,
      label: flow.state === "above" ? "VFI above signal" : flow.state === "below" ? "VFI below signal"
        : flow.state === "equal" ? "VFI at signal" : "VFI unavailable",
      moving,
      reason,
      rate: moving ? rate : null,
      lane: moving ? lane : "stationary",
      direction: moving ? lane === "inbound" ? "free orbit · inbound" : "free orbit · outbound" : "stationary"
    };
  }

  /* Fibonacci-band placement metrics — computed only from supplied packet fields.
     Bands arrive in price units after the shared log-space FBB calculation, so position
     is measured in their natural-log coordinates:
     p = 0.5 + ((ln(close) - ln(basis)) / (ln(upper) - ln(basis) if above basis,
          else ln(basis) - ln(lower))) / 2.
     p = 1 is the upper band, p = 0 the lower band, p = 0.5 neutral; excursions beyond
     an outer band stay beyond it and are never clamped back. Log band width is the
     volatility measure. Incomplete or invalid observations stay unknown (`held`), never
     neutral. This pure metric contributes to Orb 2's free-floating placement; NAB
     composite markers use the equivalent log-distance rule in NabComposites. It draws
     nothing by itself and is not a signal. */
  function fibonacciBandMetrics(market) {
    const held = { held: true, p: null, volatility: null, volatilityPct: null, potential: null, breakSide: null };
    if (!isRecord(market)) return held;
    const close = numeric(market.latestBar && market.latestBar.close);
    const bands = isRecord(market.bands) ? market.bands : null;
    const lower = bands ? numeric(bands.lower1000) : null;
    const upper = bands ? numeric(bands.upper1000) : null;
    const basis = numeric(market.basis);
    if (close === null || basis === null || lower === null || upper === null ||
        close <= 0 || basis <= 0 || lower <= 0 || upper <= 0 || lower >= basis || upper <= basis) return held;
    const logClose = Math.log(close), logBasis = Math.log(basis);
    const logLower = Math.log(lower), logUpper = Math.log(upper);
    const halfWidth = logClose >= logBasis ? logUpper - logBasis : logBasis - logLower;
    const logWidth = logUpper - logLower;
    if (![logClose, logBasis, logLower, logUpper, halfWidth, logWidth].every(finite) || halfWidth <= 0 || logWidth <= 0) return held;
    const breakSide = market.bandSignals && market.bandSignals.upperBreak ? "upper"
      : market.bandSignals && market.bandSignals.lowerBreak ? "lower" : null;
    const displacement = (logClose - logBasis) / halfWidth;
    const p = 0.5 + displacement / 2;
    const volatilityPct = logWidth * 100;
    const volatility = clamp(volatilityPct / 12, 0, 1);
    const potential = clamp(Math.abs(p - 0.5) * 2, 0, 1);
    return { held: false, p, volatility, volatilityPct, potential, breakSide };
  }

  /* Market data is the only source of a live orb's placement. The symbol hash
     is used only as a deterministic tie-breaker when two packets contain the
     same values; it never supplies a price, rank, sector, or motion value.
     Missing packets receive an explicitly held placeholder so the view does not
     invent a market location. */
  function marketDataPlacement(market, identity = "", composition = null) {
    const tiePhase = stableIdentityPhase(identity);
    const held = {
      available: false, source: "held", longitude: tiePhase, latitude: 0, radius: 2.12,
      phase: tiePhase, speed: 0.025, amplitude: 0.018, pressure: 0
    };
    if (!isRecord(market)) return held;

    const changePct = numeric(market.changePct);
    const vfi = isRecord(market.vfi) ? numeric(market.vfi.value) : null;
    const vfiSignal = isRecord(market.vfi) ? numeric(market.vfi.signal) : null;
    const waveOne = isRecord(market.waveTrend) ? numeric(market.waveTrend.wt1) : null;
    const waveTwo = isRecord(market.waveTrend) ? numeric(market.waveTrend.wt2) : null;
    const band = fibonacciBandMetrics(market);
    const close = numeric(market.latestBar && market.latestBar.close);
    const priceAxis = changePct === null ? 0 : clamp(Math.tanh(changePct / 4), -1, 1);
    const flowAxis = vfi !== null && vfiSignal !== null ? clamp(Math.tanh((vfi - vfiSignal) / 18), -1, 1) : 0;
    const waveAxis = waveOne !== null && waveTwo !== null ? clamp(Math.tanh((waveOne - waveTwo) / 45), -1, 1) : 0;
    const composedPosition = composition && Number.isFinite(Number(composition.composedPosition))
      ? Number(composition.composedPosition) : null;
    const compositionAxis = composedPosition === null ? null : clamp((composedPosition - 0.5) * 2, -1, 1);
    const bandAxis = compositionAxis === null
      ? (band.held ? priceAxis : clamp((band.p - 0.5) * 2, -1, 1)) : compositionAxis;
    const volatility = band.volatility === null ? 0 : clamp(band.volatility, 0, 1);
    const forceMultiplier = composition && Number.isFinite(Number(composition.forceMultiplier))
      ? clamp(Number(composition.forceMultiplier), 0.65, 1.35) : 1;
    const observed = close !== null || changePct !== null || vfi !== null || waveOne !== null || !band.held;
    if (!observed) return held;

    /* Price change, VFI pressure, WaveTrend separation, and band displacement
       establish longitude/latitude. Volatility and pressure establish distance
       from the origin. No sector/index slot is used for an observed packet. */
    const longitude = tiePhase * 0.035 + priceAxis * 1.8 + flowAxis * 1.15 + bandAxis * 0.8 + waveAxis * 0.45;
    const latitude = clamp(bandAxis * 0.82 + waveAxis * 0.46 + flowAxis * 0.18, -1.25, 1.25);
    const pressure = clamp((Math.abs(priceAxis) * 0.42 + Math.abs(flowAxis) * 0.28 + Math.abs(waveAxis) * 0.15 + volatility * 0.15) * forceMultiplier, 0, 1);
    const radius = 1.36 + pressure * 0.72;
    const barTime = numeric(market.latestBar && market.latestBar.time);
    const timePhase = barTime === null ? 0 : ((barTime / 86_400_000) % 1) * TAU;
    return {
      available: true, source: "market-data", longitude, latitude, radius, pressure,
      phase: tiePhase + timePhase * 0.08,
      speed: 0.055 + pressure * 0.28,
      amplitude: 0.026 + pressure * 0.075
    };
  }

  function stableIdentityPhase(value) {
    let hash = 2166136261;
    for (const character of String(value || "market")) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return ((hash >>> 0) / 4294967296) * TAU - Math.PI;
  }

  function dataBitsForMarket(market) {
    if (!isRecord(market)) return [];
    const close = numeric(market.latestBar && market.latestBar.close);
    const changePct = numeric(market.changePct);
    const flow = flowStateForMarket(market);
    const basis = numeric(market.basis);
    const zone = String(market.waveTrend && market.waveTrend.zone || "").toLowerCase();
    const waveValue = numeric(market.waveTrend && market.waveTrend.wt1);
    const shape = String(market.dataShape || "unknown").toLowerCase();
    const confirmed = Boolean(market.latestBar && market.latestBar.confirmed === true);
    const compare = (left, right) => left === right ? 0 : left > right ? 1 : -1;
    const signState = changePct === null ? "unavailable" : changePct > 0 ? "up" : changePct < 0 ? "down" : "flat";
    const vfiAvailable = flow.state !== "unavailable";
    const vfiState = flow.state;
    const basisAvailable = close !== null && basis !== null;
    const basisState = basisAvailable ? compare(close, basis) > 0 ? "above" : compare(close, basis) < 0 ? "below" : "equal" : "unavailable";
    const waveState = zone.includes("overbought") ? "overbought"
      : zone.includes("oversold") ? "oversold"
        : zone && zone !== "unknown" || waveValue !== null ? "neutral" : "unavailable";
    const packetState = shape === "ohlcv" && market.volumeAvailable !== true ? "shape-mismatch"
      : shape === "ohlcv" ? market.latestBar && market.latestBar.confirmed === true ? "confirmed" : market.latestBar ? "unconfirmed" : "unavailable"
        : shape === "ohlc" ? "price-only"
          : shape === "value" ? "value-only" : "unavailable";
    const bit = (id, label, state, value, detail, color) => ({ id, label, state, value, detail, color });
    return [
      bit("price", "PRICE Δ", signState, changePct === null ? "not supplied" : formatPercent(changePct),
        changePct === null ? "Price change is not supplied." : "Change from the previous confirmed bar; descriptive context only.",
        signState === "up" ? DATA_COLORS.priceUp : signState === "down" ? DATA_COLORS.priceDown : signState === "flat" ? DATA_COLORS.priceFlat : DATA_COLORS.unknown),
      bit("flow", "VFI", vfiState, vfiAvailable ? vfiState === "equal" ? "at signal" : `${vfiState} signal` : "not supplied",
        vfiAvailable ? "Observed Volume Flow Indicator compared with its supplied signal; not claim assurance." : "VFI or its signal is unavailable for this observation.", flow.color),
      bit("basis", "FIB BASIS", basisState, basisAvailable ? `${basisState} basis` : "not supplied",
        basisAvailable ? `Latest close is ${basisState} the supplied Fibonacci-band basis.` : "A close or Fibonacci-band basis is unavailable.",
        basisState === "above" ? DATA_COLORS.basisAbove : basisState === "below" ? DATA_COLORS.basisBelow : basisState === "equal" ? DATA_COLORS.basisEqual : DATA_COLORS.unknown),
      bit("wave", "WAVETREND", waveState, waveState === "unavailable" ? "not supplied" : zone || waveState,
        waveState === "unavailable" ? "WaveTrend zone and value are unavailable." : "Supplied WaveTrend zone; descriptive context only.",
        waveState === "oversold" ? DATA_COLORS.waveOversold : waveState === "overbought" ? DATA_COLORS.waveOverbought : waveState === "neutral" ? DATA_COLORS.waveNeutral : DATA_COLORS.unknown),
      bit("packet", "BAR SHAPE", packetState,
        packetState === "confirmed" ? "OHLCV · confirmed" : packetState === "unconfirmed" ? "OHLCV · unconfirmed"
          : packetState === "shape-mismatch" ? "OHLCV · volume unavailable"
            : packetState === "price-only" ? "OHLC · no volume" : packetState === "value-only" ? "value only" : "not supplied",
        packetState === "confirmed" ? "OHLCV data with a confirmed latest bar." : packetState === "unconfirmed" ? "OHLCV shape is present but the latest bar is not confirmed."
          : packetState === "shape-mismatch" ? "The declared OHLCV shape conflicts with the unavailable volume flag; completeness is not inferred."
            : packetState === "price-only" ? "OHLC price bars are present without volume." : packetState === "value-only" ? "Value-only data; no OHLC bar is inferred." : "Bar shape or volume availability is not supplied.",
        packetState === "confirmed" ? DATA_COLORS.packetConfirmed : packetState === "unconfirmed" ? DATA_COLORS.packetUnconfirmed
          : packetState === "price-only" ? DATA_COLORS.packetPriceOnly : packetState === "value-only" ? DATA_COLORS.packetValueOnly : DATA_COLORS.unknown)
    ];
  }

  function normalizedRoster(input) {
    const roster = Array.isArray(input)
      ? input
      : globalThis.CharactersCast && Array.isArray(globalThis.CharactersCast.NPC_ROSTER)
        ? globalThis.CharactersCast.NPC_ROSTER
        : [];
    const seen = new Set();
    return roster.flatMap(entry => {
      const name = typeof entry?.name === "string" ? entry.name.trim().slice(0, 96) : "";
      if (!name || seen.has(name)) return [];
      seen.add(name);
      const affinity = Array.isArray(entry.affinity)
        ? entry.affinity.filter(value => typeof value === "string" && value.trim()).map(value => value.trim().slice(0, 64)).slice(0, 5)
        : [];
      return [{
        name,
        role: typeof entry.role === "string" ? entry.role.trim().slice(0, 240) : "No roster role supplied.",
        glyph: typeof entry.glyph === "string" && entry.glyph.trim() ? entry.glyph.trim().slice(0, 8) : "◌",
        affinity: affinity.length ? affinity : ["Unassigned"]
      }];
    });
  }

  /** Ticker rows (the reviewed Good Intelligence watchlist) build display-only
      ticker orbs with distinct hourly and daily geometry. */
  function normalizedTickers(tickers, timeframe = "1h") {
    const time = timeframe === "1d" ? "1d" : "1h";
    const rawEntries = Array.isArray(tickers) ? tickers : [];
    const ranked = rawEntries.length > 0 && rawEntries.every(item => item && Number.isFinite(Number(item.marketCapUsd)) && Number(item.marketCapUsd) > 0);
    const ordered = ranked && globalThis.GoodIntelligenceDxy && typeof globalThis.GoodIntelligenceDxy.buildFiringOrder === "function"
      ? globalThis.GoodIntelligenceDxy.buildFiringOrder(rawEntries) : rawEntries;
    const entries = ordered
      .filter(item => item && /^[A-Z0-9.-]{1,16}$/.test(String(item.symbol || "").toUpperCase()))
      .map(item => ({
        symbol: String(item.symbol).toUpperCase(),
        name: String(item.name || item.symbol).slice(0, 96),
        sector: String(item.sector || "Market").slice(0, 64),
        country: String(item.country || "").slice(0, 48),
        sectorRank: Number.isSafeInteger(Number(item.sectorRank)) && Number(item.sectorRank) > 0 ? Number(item.sectorRank) : null,
        marketCapUsd: Number.isFinite(Number(item.marketCapUsd)) && Number(item.marketCapUsd) > 0 ? Number(item.marketCapUsd) : null,
        marketCapLabel: String(item.marketCapLabel || "").slice(0, 24),
        marketCapAsOf: String(item.marketCapAsOf || "").slice(0, 16),
        marketCapSource: String(item.marketCapSource || "").slice(0, 96),
        marketCapSourceUrl: String(item.marketCapSourceUrl || "").slice(0, 240),
        firingOrder: Number.isSafeInteger(Number(item.firingOrder)) && Number(item.firingOrder) > 0 ? Number(item.firingOrder) : null
      }));
    const sectors = [...new Set(entries.map(entry => entry.sector))];
    const counts = new Map(sectors.map(sector => [sector, 0]));
    return Object.freeze(entries.map((entry, index) => {
      const sector = entry.sector;
      const sectorIndex = sectors.indexOf(sector);
      const withinSector = counts.get(sector) || 0;
      counts.set(sector, withinSector + 1);
      /* The first angle is sector-stable; the fibonacci fraction distributes
         members over latitude in sphere mode without creating a hidden rank. */
      const longitude = -Math.PI / 2 + (sectorIndex / Math.max(1, sectors.length)) * TAU +
        ((withinSector + 0.5) / Math.max(1, entries.filter(item => item.sector === sector).length) - 0.5) * (TAU / Math.max(1, sectors.length)) * 0.82;
      const latitude = Math.asin(clamp(1 - 2 * ((index + 0.5) / Math.max(1, entries.length)), -1, 1)) * 0.82;
      return Object.freeze({
        id: `${slug(entry.symbol) || "ticker"}-${time}`,
        visualId: entry.symbol,
        symbol: entry.symbol,
        name: entry.name,
        role: `${entry.name} · ${entry.symbol} ticker orb for ${time} bars. Market data is display-only context.`,
        glyph: "◉",
        affinity: Object.freeze([entry.sector]),
        sector,
        sectorIndex,
        color: PALETTE[(sectorIndex + (time === "1d" ? 3 : 0)) % PALETTE.length],
        longitude: longitude + (time === "1d" ? 0.21 : 0),
        latitude: latitude + (time === "1d" ? 0.13 : 0),
        order: index
      });
    }));
  }

  /** The full reviewed Characters roster remains the model's character-node source;
      a reviewed ticker watchlist builds the Good Intelligence ticker-orb view instead. */
  function buildNodes(input, timeframe = null) {
    const tickerRows = Array.isArray(input) && input.some(entry => entry && typeof entry.symbol === "string" && entry.symbol.trim());
    if (tickerRows || timeframe === "1h" || timeframe === "1d") return normalizedTickers(input, timeframe);
    const entries = normalizedRoster(input);
    const sectors = [...new Set(entries.map(entry => entry.affinity[0]))];
    const counts = new Map(sectors.map(sector => [sector, 0]));
    const totals = new Map(sectors.map(sector => [sector, entries.filter(item => item.affinity[0] === sector).length]));
    return Object.freeze(entries.map((entry, index) => {
      const sector = entry.affinity[0];
      const sectorIndex = sectors.indexOf(sector);
      const withinSector = counts.get(sector) || 0;
      counts.set(sector, withinSector + 1);
      const longitude = -Math.PI / 2 + (sectorIndex / Math.max(1, sectors.length)) * TAU +
        ((withinSector + 0.5) / Math.max(1, totals.get(sector) || 1) - 0.5) * (TAU / Math.max(1, sectors.length)) * 0.82;
      const latitude = Math.asin(clamp(1 - 2 * ((index + 0.5) / Math.max(1, entries.length)), -1, 1)) * 0.82;
      return Object.freeze({
        id: `${slug(entry.name) || "npc"}-${String(index + 1).padStart(2, "0")}`,
        visualId: `NPC-${String(index + 1).padStart(2, "0")}`,
        name: entry.name,
        role: entry.role,
        glyph: entry.glyph,
        affinity: Object.freeze([...entry.affinity]),
        sector,
        sectorIndex,
        color: PALETTE[sectorIndex % PALETTE.length],
        longitude,
        latitude,
        order: index
      });
    }));
  }

  function friendlyRoute(route) {
    if (!route) return "Choose a character node to inspect its assigned Disc berth. All drawn paths are local teaching traces; no OCM message is sent.";
    if (route.type === "lateral") return "Lateral observation is a local display trace only; it neither resolves legitimacy nor transfers authority.";
    if (route.phase === "inward") return `Visual trace: ${route.from.name} → Center Origin.`;
    if (route.phase === "resolve") return "Visual trace at Center Origin. Resolution is not an authority source.";
    if (route.phase === "outward") return `Visual trace: Center Origin → ${route.to.name}.`;
    return `Visual trace complete: ${route.from.name} → Center Origin → ${route.to.name}.`;
  }

  function mount(host, options = {}) {
    if (!host || typeof host.innerHTML !== "string") return null;
    const Beat = options.beat || globalThis.CharactersBeat;
    const Cast = options.cast || globalThis.CharactersCast;
    const DiscCatalog = options.discCatalog || globalThis.CharactersDiscCatalog;
    const MarketContext = options.marketContext || globalThis.GoodIntelligenceMarketContext;
    const Dxy = options.dxy || globalThis.GoodIntelligenceDxy;
    /* Good Intelligence mounts this model over its reviewed ticker watchlist:
       ticker rows become display-only orbs with hourly/daily geometry. */
    const tickerMode = Array.isArray(options.tickers) && options.tickers.length > 0;
    let timeframe = tickerMode ? (options.timeframe === "1d" ? "1d" : "1h") : null;
    const onTimeframeChange = typeof options.onTimeframeChange === "function" ? options.onTimeframeChange : null;
    const onClearBeats = typeof options.onClearBeats === "function" ? options.onClearBeats : null;
    const onRestoreBeats = typeof options.onRestoreBeats === "function" ? options.onRestoreBeats : null;
    let nodes = buildNodes(tickerMode ? options.tickers : options.roster, timeframe);
    if (!nodes.length) {
      host.innerHTML = `<div class="gi-empty error"><span class="gi-empty-mark">!</span><strong>Orb 2 roster unavailable</strong><p>${tickerMode
        ? "The reviewed ticker watchlist did not provide a valid symbol."
        : "The Characters cast did not provide a reviewed roster."} No nodes or routes were invented.</p></div>`;
      return Object.freeze({ schema: SCHEMA, nodes, destroy() {}, setVisible() {} });
    }
    if (!Beat || !Cast || !DiscCatalog || !MarketContext || !Dxy) {
      host.innerHTML = `<div class="gi-empty error"><span class="gi-empty-mark">!</span><strong>Orb 2 beat modules unavailable</strong><p>CharactersBeat, CharactersCast, CharactersDiscCatalog, GoodIntelligenceMarketContext, and GoodIntelligenceDxy must load before Orb 2.</p></div>`;
      return Object.freeze({ schema: SCHEMA, nodes, destroy() {}, setVisible() {} });
    }

    const appEntry = (globalThis.APPS || []).find(app => app && app.id === "good-intelligence");
    const watchlist = Array.isArray(options.watchlist) ? options.watchlist
      : tickerMode ? options.tickers
        : appEntry && Array.isArray(appEntry.tickerbotWatchlist) ? appEntry.tickerbotWatchlist : [];
    const marketFiringOrder = tickerMode && Dxy && typeof Dxy.buildFiringOrder === "function"
      ? Dxy.buildFiringOrder(options.tickers) : [];
    const rosterValidation = tickerMode && Dxy && typeof Dxy.validateFiringRoster === "function"
      ? Dxy.validateFiringRoster(options.tickers) : { ok: false, errors: ["The sourced 52-asset roster is unavailable."] };
    const ignitionEnabled = rosterValidation.ok && marketFiringOrder.length === Dxy.REQUIRED_ASSETS;
    if (ignitionEnabled && timeframe !== "1d") {
      timeframe = "1d";
      nodes = buildNodes(options.tickers, "1d");
    }
    const storage = (() => {
      try {
        const candidate = globalThis.localStorage;
        candidate.setItem(`${PREFS_KEY}.probe`, "1");
        candidate.removeItem(`${PREFS_KEY}.probe`);
        return candidate;
      } catch { return null; }
    })();
    const readJson = key => {
      if (!storage) return null;
      try { return JSON.parse(storage.getItem(key) || "null"); } catch { return null; }
    };
    const preferences = readJson(PREFS_KEY);
    const discIds = new Set(DiscCatalog.discs.map(disc => disc.id));
    /* The 52-orb ignition always begins on the reviewed stock roster at 1d;
       saved navigation choices resume normally in non-ignition Characters views. */
    const initialDisc = ignitionEnabled ? "stocks"
      : isRecord(preferences) && discIds.has(preferences.discId) ? preferences.discId : "stocks";
    const initialModes = DiscCatalog.disc(initialDisc)?.intervalModes || ["1d"];
    const initialInterval = ignitionEnabled ? "1d"
      : isRecord(preferences) && initialModes.includes(preferences.interval) ? preferences.interval : "1d";
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const uuid = () => {
      try {
        if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID().toLowerCase();
      } catch { /* fall through to a non-identity opaque id */ }
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
        const random = Math.floor(Math.random() * 16);
        return (character === "x" ? random : (random & 3) | 8).toString(16);
      });
    };
    let sessionId = storage ? String(storage.getItem(SESSION_KEY) || "").toLowerCase() : "";
    if (!uuidPattern.test(sessionId)) {
      sessionId = uuid();
      if (storage) {
        try { storage.setItem(SESSION_KEY, sessionId); } catch { /* remote history will be session-local only */ }
      }
    }
    const intervalAllowed = (discId, interval) => (DiscCatalog.disc(discId)?.intervalModes || []).includes(interval);

    const state = {
      discId: initialDisc,
      interval: initialInterval,
      /* Synthetic/demo mode is disabled: this view is live-only. A stale local
         preference cannot resurrect the retired rehearsal source. */
      source: "live",
      auto: preferences && typeof preferences.auto === "boolean" ? preferences.auto : true,
      selected: 0,
      focus: "",
      visible: true,
      pending: false,
      destroyed: false,
      loadingCatalog: false,
      /* Server-field view state. `beatType` is the dial (null = every stored
         observation); `focusSymbols` narrows the field to reviewed tickers. */
      beatType: FIELD_BEAT_TYPES.includes(preferences && preferences.beatType) ? preferences.beatType : null,
      focusSymbols: Array.isArray(preferences && preferences.focusSymbols)
        ? [...new Set(preferences.focusSymbols.map(symbol => String(symbol || "").toUpperCase())
          .filter(symbol => /^[A-Z0-9][A-Z0-9._:-]{0,31}$/.test(symbol)))].slice(0, 12)
        : [],
      field: null,
      fieldAt: 0,
      fieldPending: false,
      fieldFailed: false,
      yaw: -0.68,
      pitch: 0.32,
      zoom: 1,
      formation: 1,
      autoRotate: !Boolean(globalThis.matchMedia && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches),
      labels: false,
      showDataBits: preferences && typeof preferences.showDataBits === "boolean" ? preferences.showDataBits : true,
      /* Center Origin assembly: the counter-rotating inner shell's angle and the
         last wall-clock second the origin/UTS strip was refreshed. Both are local
         animation state only; neither encodes a market value. */
      innerAngle: 0,
      originStatusAt: -1,
      hover: -1,
      dragging: false,
      downX: 0,
      downY: 0,
      lastX: 0,
      lastY: 0,
      lastFrame: 0,
      animation: 0,
      route: null,
      lastRoutePhase: "",
      projected: [],
      error: null,
      message: null,
      spend: null,
      ignition: {
        enabled: ignitionEnabled,
        active: ignitionEnabled,
        phase: ignitionEnabled ? "server-deploy" : "idle",
        workerReady: false,
        fxInputs: new Map(),
        fxFired: new Set(),
        tickerFired: new Set(),
        blocked: "",
        renderKey: ""
      },
      dxy: null,
      massiveHoldUntil: 0,
      entries: [],
      stage: null,
      observations: new Map(),
      motions: {},
      displayed: {},
      blends: {},
      events: [],
      ledger: Beat.emptyLedger(Date.now()),
      persistence: storage ? "loading" : "local-storage-unavailable",
      persistenceNote: storage ? "Loading saved Orb 2 beats…" : "Browser storage is blocked; this visit cannot retain its anonymous session key.",
      serverSessionId: sessionId,
      routeSteps: { provider: "READY", worker: ignitionEnabled ? "DEPLOY CHECK PENDING" : "READY", ledger: "WAITING", model: "READY" },
      ranking: null,
      lastBeatAt: 0,
      nextBeatAt: 0,
      beatAnimation: null,
      lastEvent: null
    };
    if (state.discId !== "stocks") {
      state.auto = true;
      state.interval = "1d";
    }
    if (state.interval === "1h") state.auto = false;

    const swatch = (color, label) => `<span class="gi-orb2-color-swatch"><i style="--gi-orb2-swatch:${escapeHtml(color)}" aria-hidden="true"></i>${escapeHtml(label)}</span>`;
    const moodLegend = Object.entries(MOOD_COLORS).filter(([mood]) => mood !== "unknown")
      .map(([mood, color]) => swatch(color, mood)).join("");
    const providerLegend = [
      ["massive", "Massive"], ["tickerbot", "Tickerbot"], ["alpha", "Alpha Vantage"], ["unknown", "Unspecified"]
    ].map(([key, label]) => swatch(PROVIDER_COLORS[key], label)).join("");
    const flowLegend = [
      [DATA_COLORS.flowAbove, "VFI above · inbound"], [DATA_COLORS.flowBelow, "VFI below · outbound"],
      [DATA_COLORS.flowEqual, "equal · held"], [DATA_COLORS.unknown, "unavailable · held"]
    ].map(([color, label]) => swatch(color, label)).join("");
    const routeLegend = [
      ["#6fd3ff", "inward"], ["#ffd479", "center resolve"], ["#5ce6a8", "outward"], ["#ffb45c", "lateral"],
      [TRITIUM_COLOR, "center beat beam"]
    ].map(([color, label]) => swatch(color, label)).join("");
    const dataLegend = [
      `<div><strong>PRICE Δ</strong>${swatch(DATA_COLORS.priceUp, "positive")}${swatch(DATA_COLORS.priceDown, "negative")}${swatch(DATA_COLORS.priceFlat, "flat")}${swatch(DATA_COLORS.unknown, "not supplied")}</div>`,
      `<div><strong>VFI vs signal</strong>${swatch(DATA_COLORS.flowAbove, "above")}${swatch(DATA_COLORS.flowBelow, "below")}${swatch(DATA_COLORS.flowEqual, "equal")}${swatch(DATA_COLORS.unknown, "unavailable")}</div>`,
      `<div><strong>Close vs band basis</strong>${swatch(DATA_COLORS.basisAbove, "above")}${swatch(DATA_COLORS.basisBelow, "below")}${swatch(DATA_COLORS.basisEqual, "equal")}${swatch(DATA_COLORS.unknown, "unavailable")}</div>`,
      `<div><strong>WaveTrend zone</strong>${swatch(DATA_COLORS.waveOversold, "oversold")}${swatch(DATA_COLORS.waveNeutral, "neutral")}${swatch(DATA_COLORS.waveOverbought, "overbought")}${swatch(DATA_COLORS.unknown, "unavailable")}</div>`,
      `<div><strong>Bar / data shape</strong>${swatch(DATA_COLORS.packetConfirmed, "confirmed OHLCV")}${swatch(DATA_COLORS.packetUnconfirmed, "unconfirmed")}${swatch(DATA_COLORS.packetPriceOnly, "OHLC only")}${swatch(DATA_COLORS.packetValueOnly, "value only")}${swatch(DATA_COLORS.unknown, "not supplied")}</div>`
    ].join("");
    const colorKey = `
      <p class="gi-orb2-sr-only" id="gi-orb2-color-description">Color encoding: orb cores use Characters beat moods; node halos use provider identity; free-floating volume-flow runners are green when supplied VFI is above its signal and red when below. They move only with confirmed OHLCV, supplied volume and VFI, and an available Characters cadence. Their cycles per second are a visual rate, not measured volume. Five satellite data bits encode price change, VFI compared with its signal, close versus Fibonacci band basis, WaveTrend zone, and bar/data shape with confirmation. Grey means unavailable, not zero. A subtle tritium-green beam, synced to each beat, connects the Center Point to the selected node and to the instruments confirmed by the latest beat; it is a highlight only. Market context is not claim assurance or authorization.</p>
      <details class="gi-orb2-color-key" data-gi-orb2-color-key>
        <summary><strong>COLOR KEY</strong><span>Characters mood · provider halo · VFI flow cue · five market data bits</span></summary>
        <div class="gi-orb2-color-key-body">
          <section><h4>CORE ORB · CHARACTERS BEAT MOOD</h4><div class="gi-orb2-color-swatches">${moodLegend}</div></section>
          <section><h4>HALO · PROVIDER</h4><div class="gi-orb2-color-swatches">${providerLegend}</div><h4>VOLUME-FLOW RUNNER · VFI VS SIGNAL</h4><div class="gi-orb2-color-swatches">${flowLegend}</div><p class="gi-orb2-color-key-note">Green marks inbound VFI flow around a free-floating orb; red marks outbound flow. The runner overlays—but does not recolor—the provider halo. Its visual cadence is in cycles per second, not volume per second. It pauses if required confirmed data is unavailable.</p><h4>LOCAL OCM TRACE · ROUTE PHASE</h4><div class="gi-orb2-color-swatches">${routeLegend}</div><p class="gi-orb2-color-key-note">These route colors are local animation only; no OCM message is sent. The tritium-green beam is beat-synced: each fresh beat connects the Center Point to the selected node and to the instruments that beat confirmed, then fades — a subtle cross-ticker highlight through the Center Point, not a constant flash.</p></section>
          <section><h4>SATELLITE BITS · OBSERVED MARKET CONTEXT</h4><div class="gi-orb2-data-key">${dataLegend}</div></section>
          <p class="gi-orb2-color-key-note">A halo fades with time since the saved beat snapshot. Solid halos mean a complete confirmed observation; dashed halos mark cached, synthetic, partial, or unconfirmed data; dotted halos mark a held / unavailable result. Grey bits mean that field was not supplied—not zero.</p>
          <p class="gi-orb2-color-key-boundary">Price, volume, band, and WaveTrend colors are descriptive market context only. They do not establish claim assurance, indicate permission to act, or provide a trading instruction.</p>
        </div>
      </details>`;

    const readLedger = (discId = state.discId, interval = state.interval) => {
      const key = `harshalos.good-intelligence.orb2.ledger.v1.${discId}.${interval}`;
      const stored = readJson(key);
      return Beat.normalizeLedger(stored, Date.now());
    };
    const writeLedger = (ledger, discId = state.discId, interval = state.interval) => {
      if (!storage) return;
      try { storage.setItem(`harshalos.good-intelligence.orb2.ledger.v1.${discId}.${interval}`, JSON.stringify(ledger)); } catch { /* best effort; server history remains separate */ }
    };
    state.ledger = readLedger();
    const cleanRestoredEvent = value => {
      if (!isRecord(value) || value.schema !== BEAT_SCHEMA || !uuidPattern.test(String(value.beatId || "")) ||
          !discIds.has(value.discId) || !["massive", "tickerbot", "alpha", "rehearsal"].includes(value.provider) ||
          !["1h", "1d", "1mo"].includes(value.interval) || !finite(Number(value.at)) || !Array.isArray(value.instruments)) return null;
      const at = Math.max(0, Number(value.at));
      const instruments = value.instruments.slice(0, 12).filter(isRecord).flatMap(item => {
        const symbol = String(item.symbol || "").toUpperCase().slice(0, 32);
        if (!/^[A-Z0-9][A-Z0-9._:-]{0,31}$/.test(symbol)) return [];
        const market = isRecord(item.market) ? item.market : null;
        const motion = isRecord(item.motion) ? item.motion : null;
        return [{
          symbol,
          displaySymbol: String(item.displaySymbol || symbol).slice(0, 48),
          status: ["bars", "cached", "rehearsal", "unavailable"].includes(item.status) ? item.status : "unavailable",
          provider: String(item.provider || instrumentProvider(value.provider)).slice(0, 24),
          code: String(item.code || "").slice(0, 48),
          message: String(item.message || "").slice(0, 240),
          lane: item.lane === "hot" || item.lane === "sweep" ? item.lane : null,
          market: market ? {
            status: String(market.status || "unknown").slice(0, 24),
            source: String(market.source || "").slice(0, 160),
            timeframe: String(market.timeframe || "").slice(0, 24),
            dataShape: String(market.dataShape || "unknown").slice(0, 16),
            synthetic: market.synthetic === true,
            barCount: Math.max(0, Number(market.barCount) || 0),
            volumeAvailable: market.volumeAvailable === true,
            latestBar: isRecord(market.latestBar) ? market.latestBar : null,
            previousClose: numeric(market.previousClose),
            changePct: numeric(market.changePct),
            basis: numeric(market.basis),
            bands: isRecord(market.bands) ? {
              lower1000: numeric(market.bands.lower1000), upper1000: numeric(market.bands.upper1000)
            } : null,
            vfi: isRecord(market.vfi) ? market.vfi : null,
            waveTrend: isRecord(market.waveTrend) ? market.waveTrend : null
          } : null,
          motion: motion ? {
            ...motion,
            mood: String(motion.mood || "unknown").slice(0, 24),
            frozen: motion.frozen === true,
            marks: Array.isArray(motion.marks) ? motion.marks.slice(0, 6).map(mark => String(mark).slice(0, 96)) : [],
            gauge: isRecord(motion.gauge) ? motion.gauge : {},
            npc: isRecord(motion.npc) ? motion.npc : {},
            object: isRecord(motion.object) ? motion.object : {},
            item: isRecord(motion.item) ? motion.item : {},
            caption: String(motion.caption || "").slice(0, 320)
          } : null
        }];
      });
      return {
        schema: BEAT_SCHEMA,
        beatId: String(value.beatId).toLowerCase(),
        at,
        reason: String(value.reason || "manual").slice(0, 24),
        discId: value.discId,
        provider: value.provider,
        interval: value.interval,
        cadenceMinutes: Math.max(1, Number(value.cadenceMinutes) || 1),
        calls: Math.max(0, Math.min(12, Number(value.calls) || 0)),
        cacheHits: Math.max(0, Math.min(12, Number(value.cacheHits) || 0)),
        instruments
      };
    };
    const localHistory = (Array.isArray(readJson(EVENTS_KEY)) ? readJson(EVENTS_KEY) : [])
      .map(cleanRestoredEvent).filter(Boolean).slice(-MAX_LOCAL_HISTORY);
    state.events = localHistory;

    host.innerHTML = `
      <section class="gi-orb2" data-gi-orb2-root aria-label="Orb 2 live 3D OCM market-beat model">
        <div class="gi-orb2-toolbar">
          <div class="gi-orb2-title">
            <p class="gi-eyebrow">ORB 2 · GOOD INTELLIGENCE</p>
            <h3>Orb Communicator Model</h3>
            <p>Live, interactive 3D field. Drag to orbit, scroll to zoom, or select a node for details.</p>
          </div>
          <div class="gi-orb2-actions">
            <button class="gi-button gi-button-primary" type="button" data-gi-orb2-beat>Beat now</button>
            <button class="gi-button" type="button" data-gi-orb2-settings-toggle aria-expanded="false" aria-controls="gi-orb2-settings"><span aria-hidden="true">⚙</span> Settings</button>
            <button class="gi-button" type="button" data-gi-orb2-fullscreen aria-pressed="false">⛶ Model full screen</button>
          </div>
        </div>

        <section class="gi-orb2-settings" id="gi-orb2-settings" data-gi-orb2-settings aria-label="Orb 2 settings" hidden>
          <div class="gi-orb2-settings-head">
            <div><p class="gi-eyebrow">ORBITAL CONFIGURATION</p><h4>Model settings</h4><p>Live-beat, model, and display controls live here so the 3D field stays clear.</p></div>
            <button class="gi-button" type="button" data-gi-orb2-settings-close>Done</button>
          </div>
          <div class="gi-orb2-settings-body">
            <section class="gi-orb2-settings-section gi-orb2-settings-section-wide" aria-label="Live beat settings">
              <div class="gi-orb2-settings-section-head"><div><p class="gi-eyebrow">01 · LIVE BEAT</p><h5>Data and cadence</h5></div><span>Live provider data only</span></div>
              <div class="gi-orb2-beat-controls" aria-label="Orb 2 live beat controls">
                <label class="gi-orb2-control"><span>DISC</span><select data-gi-orb2-disc aria-label="Choose a Characters Disc"></select></label>
                <label class="gi-orb2-control"><span>BAR SIZE</span><select data-gi-orb2-interval aria-label="Choose the market interval"></select></label>
                <label class="gi-orb2-control gi-orb2-focus-control"><span>FOCUS INSTRUMENT</span><select data-gi-orb2-focus aria-label="Choose an instrument to inspect"></select></label>
              </div>
              <div class="gi-orb2-field-controls" aria-label="Server field beat-type dial and ticker focus">
                <div class="gi-orb2-field-dial" data-gi-orb2-field-dial role="group" aria-label="Beat-type dial"></div>
                <div class="gi-orb2-field-focus" data-gi-orb2-field-focus role="group" aria-label="Ticker focus"></div>
                <p class="gi-orb2-field-note" data-gi-orb2-field-note role="status">The server field is read every 20 seconds. Dial a beat type or focus tickers; nothing here calls a provider from this page.</p>
              </div>
              <div class="gi-orb2-settings-actions" aria-label="Beat and model actions">
                <button class="gi-button" type="button" data-gi-orb2-auto aria-pressed="true">Auto view: on</button>
                <button class="gi-button" type="button" data-gi-orb2-warm>Calibrate first deck (~156 calls)</button>
                <button class="gi-button" type="button" data-gi-orb2-random-ticker>Add random US ticker</button>
                <button class="gi-button" type="button" data-gi-orb2-refresh-focus>Refresh focused · baseline</button>
                <button class="gi-button" type="button" data-gi-orb2-refresh-intraday>Recalculate focused · 15m</button>
                <label class="gi-chart-control" data-gi-orb2-timeframe-row ${tickerMode ? "" : "hidden"}><span>TIMEFRAME</span><select data-gi-orb2-timeframe aria-label="Select Orb timeframe"><option value="1h" ${timeframe === "1d" ? "" : "selected"}>1 hour</option><option value="1d" ${timeframe === "1d" ? "selected" : ""}>1 day</option></select></label>
                <button class="gi-button" type="button" data-gi-orb2-route>Trace resolution</button>
                <button class="gi-button" type="button" data-gi-orb2-lateral>Observe laterally</button>
                <button class="gi-button" type="button" data-gi-orb2-clear-beats>Clear beats</button>
                <button class="gi-button" type="button" data-gi-orb2-restore-beats hidden>Restore stored beats</button>
                <button class="gi-button" type="button" data-gi-orb2-reset>Reset view</button>
              </div>
              <p class="gi-orb2-beat-status" data-gi-orb2-beat-status role="status" aria-live="polite">Beat archive is available on demand. Saved snapshots remain separate from the live model.</p>
              <div class="gi-orb2-plan-row"><div data-gi-orb2-plan></div></div>
            </section>

            <section class="gi-orb2-settings-section" aria-label="Display settings">
              <div class="gi-orb2-settings-section-head"><div><p class="gi-eyebrow">02 · DISPLAY</p><h5>Presentation</h5></div></div>
              <div class="gi-orb2-display-controls" aria-label="Orb 2 display controls">
                <label><span>FORM</span><input data-gi-orb2-formation type="range" min="0" max="100" step="1" value="100"><strong data-gi-orb2-formation-label>SPHERE</strong></label>
                <label class="gi-orb2-toggle"><input data-gi-orb2-rotate type="checkbox"><span>Auto-rotate</span></label>
                <label class="gi-orb2-toggle"><input data-gi-orb2-labels type="checkbox"><span>All labels</span></label>
                <label class="gi-orb2-toggle"><input data-gi-orb2-paths type="checkbox" checked><span>Data pathways</span></label>
                <label class="gi-orb2-toggle"><input data-gi-orb2-data-bits type="checkbox" checked><span>Market data bits</span></label>
                <span class="gi-orb2-center">CENTER ORIGIN · DXY FIXED BENCHMARK · LOCAL CPU ${CENTER_ADDRESS}</span>
              </div>
            </section>

            <section class="gi-orb2-settings-section" aria-label="Color key">
              <div class="gi-orb2-settings-section-head"><div><p class="gi-eyebrow">03 · VISUAL LEGEND</p><h5>Color and data marks</h5></div></div>
              ${colorKey}
            </section>

            <section class="gi-orb2-settings-section gi-orb2-settings-section-wide" aria-label="Data pathway and model status">
              <div class="gi-orb2-settings-section-head"><div><p class="gi-eyebrow">04 · DATA PATHWAY</p><h5>Live-beat contract</h5></div><span>Same-origin Worker · no provider secrets in the browser</span></div>
              <p class="gi-orb2-context"><strong>SERVER-FIELD CONTRACT</strong> · The Worker's Cron Trigger beats the reviewed field 24/7/365: up to five Massive <code>1d</code> requests per minute establish the daily baseline, while Tickerbot supplies bounded <code>1h</code>/<code>1d</code> stock refreshes and an on-demand closed-bar <code>15m</code> residual. The first-deck calibration burst is an explicit ~156 calls across 15m + 1h + 1d; later 15m recalculation is focused by default and never silently repeats the full deck. The server combines normalized daily regime metrics with fresh 15m residuals using a bounded force multiplier; this is a display-only position, not a signal or permission. This page polls stored observations every 20 seconds, holds no provider secret, paces nothing, and never pauses the server when hidden. Use Random US ticker to choose from the reviewed U.S. deck, then focus and recalculate when desired.</p>
              <div class="gi-orb2-pathways" aria-label="Live data pathway status">
                <div class="gi-orb2-path-step"><span>01 · PROVIDER</span><strong data-gi-orb2-path-provider>READY</strong></div><i aria-hidden="true">→</i>
                <div class="gi-orb2-path-step"><span>02 · WORKER</span><strong data-gi-orb2-path-worker>READY</strong></div><i aria-hidden="true">→</i>
                <div class="gi-orb2-path-step"><span>03 · D1 ALLOWANCE</span><strong data-gi-orb2-path-ledger>WAITING</strong></div><i aria-hidden="true">→</i>
                <div class="gi-orb2-path-step"><span>04 · 3D BEAT</span><strong data-gi-orb2-path-model>READY</strong></div>
              </div>
            </section>

            <section class="gi-orb2-settings-section gi-orb2-settings-section-wide gi-orb2-settings-ignition" aria-label="Live heartbeat firing sequence">
              <div class="gi-orb2-ignition" data-gi-orb2-ignition>
                <div class="gi-orb2-ignition-head">
                  <div><p class="gi-eyebrow">SERVER SWEEP · FIXED DXY BENCHMARK</p><h3>Field → DXY → 52 ticker orbs</h3><p>The Worker's cron beat fills the sweep; six FX closes fix the DXY reference; then one stored daily beat per asset, grouped by sourced sector and descending market cap. This page renders stored progress and never replays the order.</p></div>
                  <button class="gi-button" type="button" data-gi-orb2-ignition-restart hidden>Restart sequence</button>
                </div>
                <div class="gi-orb2-ignition-steps">
                  <div><span>00 · SERVER DEPLOY</span><strong data-gi-orb2-ignition-server>ROUTE CHECK PENDING</strong><small>Readiness is confirmed only by a same-origin Worker response.</small></div>
                  <div><span>01 · DXY ORIGIN BEAT</span><strong data-gi-orb2-ignition-dxy>AWAITING SIX FX CLOSES</strong><small data-gi-orb2-ignition-fx>EURUSD · JPYUSD · GBPUSD · CADUSD · SEKUSD · CHFUSD</small></div>
                  <div><span>02–53 · TICKER BEATS</span><strong data-gi-orb2-ignition-progress>0 / 52</strong><small>One orb per ticker · sector members descend by the dated cap snapshot.</small></div>
                </div>
                <p class="gi-orb2-ignition-note" data-gi-orb2-ignition-note>Stored Massive daily bars only · the Worker's cron tick spends the whole five-per-minute allowance and the deploy warm burst fills the rest. Any unavailable or unaligned input holds its berth; no alternate or synthetic data is substituted and this page never replays the sweep.</p>
                <details class="gi-orb2-firing-order" data-gi-orb2-firing-order><summary><strong>52-ASSET SWEEP ORDER</strong><span data-gi-orb2-firing-summary>Open for the ordered ticker-by-ticker detail; the sweep line above is the summary</span></summary><ol data-gi-orb2-firing-list></ol></details>
              </div>
            </section>

            <details class="gi-orb2-model-boundary">
              <summary>Model boundary and data provenance</summary>
              <p class="gi-orb2-boundary"><strong>MODEL BOUNDARY</strong> · Live price/volume observations drive the same display-only NPC, object, and item motion as Characters. A line or particle is a local visualization, not an OCM message, market signal, recommendation, authorization, transaction, or permission to act. Missing fields remain missing: synthetic or demo data is not substituted for a live beat, and an unavailable beat leaves its berth held rather than re-rendered. No fractal, flame, or film engine is attached to this view: every mark on the canvas is market geometry or the Center Origin assembly. The DXY readout is a fixed central benchmark, not a moving coordinate origin; this demo derives a daily reference from six confirmed, time-aligned Massive FX closes and does not reproduce ICE's licensed real-time value. The local CPU gate/PDH readout remains separate and only affects rotation and brightness; it grants nothing, authorizes nothing, and sends nothing.</p>
            </details>
          </div>
        </section>

        <div class="gi-orb2-live-strip" role="status" aria-live="polite">
          <span class="gi-orb2-canvas-status" data-gi-orb2-canvas-status>LOCAL / VISUAL PATHS ONLY</span>
          <span class="gi-orb2-provider-pill" data-gi-orb2-provider>Massive · AUTOMATIC DAILY</span>
          <span class="gi-orb2-live-state" data-gi-orb2-countdown>Awaiting first beat</span>
          <span class="gi-orb2-persist-state" data-gi-orb2-persistence>Loading saved beat history…</span>
          <span class="gi-orb2-counts" data-gi-orb2-counts>0 calls · 0 beats</span>
        </div>
        <div class="gi-orb2-message" data-gi-orb2-message role="status" hidden></div>

        <div class="gi-orb2-layout">
          <div class="gi-orb2-stage">
            <div class="gi-orb2-canvas-shell">
              <canvas data-gi-orb2-canvas tabindex="0" aria-describedby="gi-orb2-color-description" aria-label="Interactive three-dimensional Orb 2 model. Drag to orbit, scroll to zoom, and select a character node to inspect live beat data."></canvas>
            </div>
            <div class="gi-orb2-model-status" aria-label="Selected node and model status">
              <div class="gi-orb2-status-item"><span>SELECTED NODE · VOLUME FLOW</span><p class="gi-orb2-flow-readout" data-gi-orb2-flow-readout aria-live="off">VOLUME FLOW · WAITING FOR CONFIRMED OHLCV</p><small class="gi-orb2-flow-rate-note">Visual rate is cycles per second, not volume per second.</small></div>
              <div class="gi-orb2-status-item gi-orb2-origin-status-item"><span>ORIGIN · FIXED DXY BENCHMARK</span><p class="gi-orb2-origin-readout" data-gi-orb2-origin-status aria-live="off">DXY BENCHMARK · AWAITING SIX ALIGNED FX CLOSES · FIXED CENTER · ORIGIN · CPU ${CENTER_ADDRESS} · LOCAL CPU GATE UNREAD · PDH UNDECLARED · UTS UNAVAILABLE</p></div>
              <div class="gi-orb2-status-pills"><span class="gi-orb2-gate" data-gi-orb2-gate>GATE · UNREAD</span><span class="gi-orb2-uts" data-gi-orb2-uts title="Unified Time Scale, from the local UTS Watch">UTS · UNAVAILABLE</span></div>
              <span class="gi-orb2-gesture">Drag to orbit · scroll to zoom · click a node to inspect</span>
            </div>
          </div>
          <details class="gi-orb2-inspector" id="gi-orb2-inspector" aria-live="polite" data-gi-orb2-inspector>
            <summary class="gi-orb2-inspector-summary"><span>SELECTED NODE</span><strong data-gi-orb2-inspector-summary>—</strong><span class="gi-orb2-inspector-hint">View details <i aria-hidden="true">＋</i></span></summary>
            <div class="gi-orb2-inspector-content">
              <p class="gi-orb2-inspector-eyebrow gi-eyebrow">NODE / MARKET INSPECTOR</p>
              <label class="gi-orb2-node-select"><span data-gi-orb2-node-label>CHARACTER NODE</span><select data-gi-orb2-node data-gi-orb2-select aria-label="Choose a character node"></select></label>

              <div id="gi-orb2-inspector-detail" data-gi-orb2-detail></div>
              <div class="gi-orb2-route-note" data-gi-orb2-route-note role="status"></div>
            </div>
          </details>
        </div>

        <details class="gi-orb2-history" aria-label="Orb 2 beat history">
          <summary class="gi-orb2-history-head"><div><p class="gi-eyebrow">PERSISTENT BEAT LOG</p><h4>Recent live observations</h4></div><span data-gi-orb2-history-count>0 saved</span><span class="gi-orb2-inspector-hint">Open history <i aria-hidden="true">＋</i></span></summary>
          <ol data-gi-orb2-history-list><li class="gi-orb2-history-empty">No live beat has been recorded yet. Start with Beat now or turn Auto view on.</li></ol>
        </details>
        <p class="gi-orb2-safety-note"><strong>VISUAL MODEL</strong> · Local display traces only. No OCM message, trade, authorization, or permission to act.</p>
      </section>`;

    const $ = selector => host.querySelector(selector);
    const root = $("[data-gi-orb2-root]");
    const canvas = $("[data-gi-orb2-canvas]");
    const flowReadout = $("[data-gi-orb2-flow-readout]");
    const discSelect = $("[data-gi-orb2-disc]");
    const intervalSelect = $("[data-gi-orb2-interval]");
    const focusSelect = $("[data-gi-orb2-focus]");
    const nodeSelect = $("[data-gi-orb2-node]");
    const beatButton = $("[data-gi-orb2-beat]");
    const autoButton = $("[data-gi-orb2-auto]");
    const fullscreenButton = $("[data-gi-orb2-fullscreen]");
    const settingsPanel = $("[data-gi-orb2-settings]");
    const settingsToggle = $("[data-gi-orb2-settings-toggle]");
    const settingsClose = $("[data-gi-orb2-settings-close]");
    const inspectorSummary = $("[data-gi-orb2-inspector-summary]");
    const routeButton = $("[data-gi-orb2-route]");
    const lateralButton = $("[data-gi-orb2-lateral]");
    const resetButton = $("[data-gi-orb2-reset]");
    const formation = $("[data-gi-orb2-formation]");
    const formationLabel = $("[data-gi-orb2-formation-label]");
    const rotateToggle = $("[data-gi-orb2-rotate]");
    const labelsToggle = $("[data-gi-orb2-labels]");
    const pathsToggle = $("[data-gi-orb2-paths]");
    const dataBitsToggle = $("[data-gi-orb2-data-bits]");
    const detail = $("[data-gi-orb2-detail]");
    const routeNote = $("[data-gi-orb2-route-note]");
    const planHost = $("[data-gi-orb2-plan]");
    const messageHost = $("[data-gi-orb2-message]");
    const providerHost = $("[data-gi-orb2-provider]");
    const countdownHost = $("[data-gi-orb2-countdown]");
    const persistenceHost = $("[data-gi-orb2-persistence]");
    const countsHost = $("[data-gi-orb2-counts]");
    const historyHost = $("[data-gi-orb2-history-list]");
    const historyCount = $("[data-gi-orb2-history-count]");
    const canvasStatus = $("[data-gi-orb2-canvas-status]");
    const routeStepProvider = $("[data-gi-orb2-path-provider]");
    const routeStepWorker = $("[data-gi-orb2-path-worker]");
    const routeStepLedger = $("[data-gi-orb2-path-ledger]");
    const routeStepModel = $("[data-gi-orb2-path-model]");
    const fieldDial = $("[data-gi-orb2-field-dial]");
    const fieldFocus = $("[data-gi-orb2-field-focus]");
    const fieldNote = $("[data-gi-orb2-field-note]");
    const warmButton = $("[data-gi-orb2-warm]");
    const randomTickerButton = $("[data-gi-orb2-random-ticker]");
    const refreshFocusButton = $("[data-gi-orb2-refresh-focus]");
    const refreshIntradayButton = $("[data-gi-orb2-refresh-intraday]");
    const timeframeSelect = $("[data-gi-orb2-timeframe]");
    const clearBeatsButton = $("[data-gi-orb2-clear-beats]");
    const restoreBeatsButton = $("[data-gi-orb2-restore-beats]");
    const nodeSelectLabel = $("[data-gi-orb2-node-label]");
    const originStatus = $("[data-gi-orb2-origin-status]");
    const ignitionHost = $("[data-gi-orb2-ignition]");
    const ignitionServer = $("[data-gi-orb2-ignition-server]");
    const ignitionDxy = $("[data-gi-orb2-ignition-dxy]");
    const ignitionFx = $("[data-gi-orb2-ignition-fx]");
    const ignitionProgress = $("[data-gi-orb2-ignition-progress]");
    const ignitionNote = $("[data-gi-orb2-ignition-note]");
    const firingList = $("[data-gi-orb2-firing-list]");
    const ignitionRestartButton = $("[data-gi-orb2-ignition-restart]");
    const firingSummary = $("[data-gi-orb2-firing-summary]");
    const gatePill = $("[data-gi-orb2-gate]");
    const utsPill = $("[data-gi-orb2-uts]");
    const ownerDocument = host.ownerDocument || globalThis.document || null;
    if (tickerMode && nodeSelectLabel) nodeSelectLabel.textContent = "SELECT TICKER";
    /* The Characters app reports whether an anonymous saved-beat archive exists
       for this browser; Restore stored beats reloads it on demand. */
    const beatStatusHandler = event => { if (restoreBeatsButton) restoreBeatsButton.hidden = !event.detail?.hasStored; };
    ownerDocument?.addEventListener("harshalos:characters-beats:status", beatStatusHandler);
    /* Settings stay in normal document flow; opening them never floats over
       or obscures the live 3D field. */
    function setSettingsOpen(open) {
      if (!settingsPanel) return;
      settingsPanel.hidden = !open;
      settingsToggle?.setAttribute("aria-expanded", String(open));
      if (open) scheduleRender();
    }
    settingsToggle?.addEventListener("click", () => setSettingsOpen(settingsPanel.hidden));
    settingsClose?.addEventListener("click", () => {
      setSettingsOpen(false);
      settingsToggle?.focus();
    });
    clearBeatsButton?.addEventListener("click", () => {
      state.route = null; state.lastRoutePhase = "";
      drawInspector(); scheduleRender();
      if (onClearBeats) onClearBeats();
    });
    restoreBeatsButton?.addEventListener("click", () => {
      state.route = null; state.lastRoutePhase = "";
      drawInspector(); scheduleRender();
      if (onRestoreBeats) onRestoreBeats();
    });
    timeframeSelect?.addEventListener("change", () => {
      if (state.ignition.active) { timeframeSelect.value = "1d"; return; }
      const next = timeframeSelect.value === "1d" ? "1d" : "1h";
      if (onTimeframeChange) { onTimeframeChange(next); return; }
      rebuildTickerNodes(next);
    });
    const reduceMotion = Boolean(globalThis.matchMedia && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let nodeIndexByName = new Map(nodes.map((node, index) => [node.name, index]));
    let stage = null;
    let symbols = [];
    let context2d = null;
    let beatTimer = null;
    let countdownTimer = null;
    let resizeObserver = null;
    let fallbackFullscreen = false;
    let disposed = false;

    try { context2d = canvas.getContext("2d"); } catch { context2d = null; }
    if (context2d) {
      try { canvas.style.touchAction = "none"; } catch { /* optional */ }
    }

    const savedLocalEvents = state.events;
    function mergeEvents(events) {
      const byId = new Map(state.events.map(event => [event.beatId, event]));
      for (const value of events || []) {
        const event = cleanRestoredEvent(value);
        if (event) byId.set(event.beatId, event);
      }
      state.events = [...byId.values()].sort((left, right) => left.at - right.at).slice(-MAX_HISTORY);
      rebuildObservations();
      syncLastBeat();
      rebuildLedgers();
      persistLocal();
    }

    function persistLocal() {
      if (!storage) return;
      const savedPrefs = {
        discId: state.discId, interval: state.interval,
        auto: state.auto,
        showDataBits: state.showDataBits,
        beatType: state.beatType,
        focusSymbols: state.focusSymbols
      };
      try {
        storage.setItem(PREFS_KEY, JSON.stringify(savedPrefs));
        storage.setItem(EVENTS_KEY, JSON.stringify(state.events.slice(-MAX_LOCAL_HISTORY)));
        writeLedger(state.ledger);
      } catch { /* local storage is a best-effort recovery copy */ }
    }

    function observationKey(event, instrument) {
      return `${event.discId}:${event.provider}:${event.interval}:${instrument.symbol}`;
    }

    function rebuildObservations() {
      const observations = new Map();
      for (const event of state.events) {
        for (const instrument of event.instruments) {
          const key = observationKey(event, instrument);
          const previous = observations.get(key);
          if (!previous || event.at >= previous.at) {
            observations.set(key, {
              ...instrument,
              at: event.at,
              discId: event.discId,
              interval: event.interval,
              providerMode: event.provider,
              reason: event.reason,
              beatId: event.beatId
            });
          }
        }
      }
      state.observations = observations;
    }

    function syncLastBeat() {
      const latest = state.events.filter(event => event.discId === state.discId)
        .reduce((selected, event) => !selected || event.at > selected.at ? event : selected, null);
      state.lastEvent = latest;
      state.lastBeatAt = latest ? latest.at : 0;
    }

    function displayMotion(observation, now) {
      if (!observation || !observation.motion) return null;
      const key = `${observation.discId}:${observation.symbol}`;
      const target = observation.motion;
      let record = state.blends[key];
      if (!record || record.to !== target) {
        record = { from: state.displayed[key] || target, to: target, startedAt: now };
        state.blends[key] = record;
      }
      state.motions[key] = target;
      if (reduceMotion) {
        state.displayed[key] = target;
        return target;
      }
      const duration = Math.max(1, Math.min(currentDelay(), 6000));
      const ratio = clamp((now - record.startedAt) / duration, 0, 1);
      state.displayed[key] = ratio >= 1 ? target
        : record.from === target ? target : Beat.blend(record.from, target, ratio);
      return state.displayed[key];
    }

    function rebuiltLedger(events, discId, interval) {
      const month = Beat.monthKey(Date.now());
      let ledger = Beat.emptyLedger(Date.now());
      for (const event of events) {
        if (event.discId !== discId || event.interval !== interval || Beat.monthKey(event.at) !== month) continue;
        const refreshed = event.instruments.filter(item => item.market && item.status !== "unavailable").map(item => item.symbol);
        const moods = Object.fromEntries(event.instruments.map(item => [item.symbol, item.motion && item.motion.mood || "unknown"]));
        ledger = Beat.recordBeat(ledger, {
          at: event.at,
          symbols: refreshed,
          calls: event.calls,
          moodBySymbol: moods,
          synthetic: event.provider === "rehearsal",
          cadenceMinutes: event.cadenceMinutes
        });
      }
      return ledger;
    }

    function rebuildLedgers() {
      const keys = new Set(state.events.filter(event => Beat.monthKey(event.at) === Beat.monthKey(Date.now()))
        .map(event => `${event.discId}\u0000${event.interval}`));
      keys.add(`${state.discId}\u0000${state.interval}`);
      for (const key of keys) {
        const [discId, interval] = key.split("\u0000");
        const local = readLedger(discId, interval);
        const remote = rebuiltLedger(state.events, discId, interval);
        const chosen = local.beats >= remote.beats ? local : remote;
        writeLedger(chosen, discId, interval);
        if (discId === state.discId && interval === state.interval) state.ledger = chosen;
      }
    }

    function latestObservation(discId, symbol, provider = null, interval = null) {
      let latest = null;
      for (const observation of state.observations.values()) {
        if (observation.discId !== discId || observation.symbol !== symbol) continue;
        if (provider && observation.providerMode !== provider) continue;
        if (interval && observation.interval !== interval) continue;
        if (!latest || observation.at > latest.at) latest = observation;
      }
      return latest;
    }

    function currentProvider() {
      if (state.ignition && state.ignition.active) return "massive";
      if (state.interval === "1mo") return "alpha";
      if (state.interval === "1d" && (state.auto || state.discId !== "stocks")) return "massive";
      return "tickerbot";
    }

    function providerDescription(provider = currentProvider()) {
      if (provider === "massive") return "Massive · AUTOMATIC DAILY";
      if (provider === "tickerbot") return "Tickerbot · ON DEMAND";
      if (provider === "alpha") return "Alpha Vantage · HOURLY SPOTLIGHT";
      return "Unspecified provider";
    }

    function nodeBearing(symbol) {
      const berth = stage && stage.berths.find(entry => entry.symbol === symbol);
      return berth ? berth.angle + Math.PI / 2 : 0;
    }

    function latestConfirmedBars(packet) {
      const confirmed = packet && Array.isArray(packet.bars)
        ? packet.bars.filter(bar => bar && bar.confirmed === true && finite(Number(bar.close))) : [];
      return { latest: confirmed.at(-1) || null, previous: confirmed.length > 1 ? confirmed.at(-2) : null };
    }

    async function loadServerHistory() {
      if (!storage) {
        state.persistence = "local-only";
        state.persistenceNote = "Server history needs this browser's random session key; browser storage is blocked.";
        drawStatus();
        return;
      }
      try {
        const fetcher = globalThis.fetch;
        if (typeof fetcher !== "function") throw new Error("Same-origin fetch is unavailable.");
        const response = await fetcher(`${STORE_ROUTE}?sessionId=${encodeURIComponent(state.serverSessionId)}`, {
          method: "GET", credentials: "same-origin", cache: "no-store", redirect: "error",
          headers: { Accept: "application/json" }
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload || payload.success !== true || !Array.isArray(payload.beats)) {
          throw new Error(payload && payload.message || `Beat history load answered HTTP ${response.status}.`);
        }
        mergeEvents(payload.beats);
        /* History is a recovery copy, not the live source: re-apply the newest
           server-field snapshot so a slow history response cannot replace the
           stored field with older observations. */
        if (state.field) applyFieldSnapshot(state.field);
        state.persistence = "saved";
        state.persistenceNote = payload.beats.length
          ? `Restored ${payload.beats.length} server beat${payload.beats.length === 1 ? "" : "s"} · up to 120 retained for 90 days.`
          : "Server history ready · the next live beat will be saved here.";
      } catch (error) {
        state.persistence = "local-only";
        const detail = (error && error.message) || "Server history is unavailable.";
        state.persistenceNote = `${detail} Local recovery copy is kept when browser storage allows.`;
      }
      draw();
    }

    function syncFormControls() {
      const disc = DiscCatalog.disc(state.discId);
      const modes = disc ? disc.intervalModes : ["1d"];
      if (!modes.includes(state.interval)) state.interval = modes[0] || "1d";
      discSelect.innerHTML = DiscCatalog.discs.map(entry => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.label)}</option>`).join("");
      discSelect.value = state.discId;
      intervalSelect.innerHTML = modes.map(interval => {
        const label = interval === "1mo" ? "1 month · Alpha Vantage spotlight"
          : interval === "1d" ? `1 day · ${state.auto || state.discId !== "stocks" ? "Massive automatic" : "Tickerbot on demand"}`
            : "1 hour · Tickerbot on demand";
        return `<option value="${escapeHtml(interval)}">${escapeHtml(label)}</option>`;
      }).join("");
      intervalSelect.value = state.interval;
      const ignitionLocked = state.ignition.active;
      intervalSelect.disabled = ignitionLocked || modes.length <= 1 || state.pending || state.loadingCatalog;
      discSelect.disabled = ignitionLocked || state.pending || state.loadingCatalog;
      if (timeframeSelect) {
        timeframeSelect.value = timeframe || "1d";
        timeframeSelect.disabled = ignitionLocked || state.pending;
      }
      syncFocusOptions();
      syncNodeOptions();
      autoButton.textContent = `Auto view: ${state.auto ? "on" : "off"}`;
      autoButton.setAttribute("aria-pressed", String(state.auto));
      beatButton.textContent = "Beat now · server tick";
      beatButton.disabled = state.pending || state.loadingCatalog;
      if (randomTickerButton) randomTickerButton.disabled = state.pending || state.loadingCatalog || state.discId !== "stocks";
      if (refreshFocusButton) refreshFocusButton.disabled = state.pending || state.loadingCatalog;
      if (refreshIntradayButton) refreshIntradayButton.disabled = state.pending || state.loadingCatalog;
      rotateToggle.checked = state.autoRotate;
      dataBitsToggle.checked = state.showDataBits;
    }

    function syncFocusOptions() {
      if (!stage) {
        focusSelect.innerHTML = '<option value="">Loading reviewed Disc…</option>';
        focusSelect.disabled = true;
        return;
      }
      const previous = state.focus;
      focusSelect.innerHTML = stage.berths.map(berth =>
        `<option value="${escapeHtml(berth.symbol)}">${escapeHtml(berth.displaySymbol)} · ${escapeHtml(berth.name)}</option>`
      ).join("");
      if (!symbols.includes(previous)) state.focus = symbols[0] || "";
      focusSelect.value = state.focus;
      focusSelect.disabled = !symbols.length || state.pending;
    }

    function syncNodeOptions() {
      const previous = nodes[state.selected] && nodes[state.selected].id;
      nodeSelect.innerHTML = nodes.map(node => `<option value="${escapeHtml(node.id)}">${escapeHtml(node.visualId)} · ${escapeHtml(node.name)}</option>`).join("");
      nodeSelect.value = previous || nodes[0].id;
    }

    function buildStage(entries, discId) {
      /* The ticker dial narrows the visible field; an empty dial shows the
         whole reviewed deck. A focused symbol that is not on this Disc simply
         contributes nothing rather than being substituted. */
      const focused = state.focusSymbols.filter(Boolean);
      const visible = focused.length
        ? entries.filter(entry => focused.includes(String(entry.symbol || entry.ticker || "").toUpperCase()))
        : entries;
      stage = Cast.build(visible.length ? visible : entries, { discId });
      state.stage = stage;
      symbols = stage.berths.map(berth => berth.symbol);
      state.entries = entries;
      if (!symbols.includes(state.focus)) state.focus = symbols[0] || "";
      state.ledger = readLedger(discId, state.interval);
      syncFormControls();
      draw();
    }

    async function entriesForDisc(discId) {
      if (discId === "stocks") {
        if (!watchlist.length) throw new Error("The reviewed Good Intelligence Tickerbot stock list was not available.");
        return { entries: watchlist, ranking: null };
      }
      if (discId === "crypto") {
        const response = await globalThis.fetch("/api/characters/v1/discs?disc=crypto", {
          method: "GET", credentials: "same-origin", cache: "no-store", redirect: "error",
          headers: { Accept: "application/json" }
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload || payload.success !== true || !Array.isArray(payload.instruments) || !payload.instruments.length) {
          throw new Error(payload && payload.message || `The live crypto ranking route answered HTTP ${response.status}. No stale constituent list was substituted.`);
        }
        return { entries: payload.instruments, ranking: payload.ranking || null };
      }
      const entries = DiscCatalog.staticInstruments(discId);
      if (!Array.isArray(entries) || !entries.length) throw new Error(`No reviewed instruments are available for ${DiscCatalog.disc(discId)?.label || discId}.`);
      return { entries, ranking: null };
    }

    /* The plan is the Worker's, so this panel reports the server field's actual
       allowance, queue, and warm-burst state instead of a local planner. */
    function drawPlan() {
      const status = state.field && state.field.status ? state.field.status : null;
      const massive = status && status.massive ? status.massive : null;
      const tickerbot = status && status.tickerbot ? status.tickerbot : null;
      const queue = status && status.queue ? status.queue : null;
      const warm = status && status.warmBurst ? status.warmBurst : null;
      const estimate = massive
        ? `${MASSIVE_REQUESTS_PER_MINUTE} Massive 1d requests/minute · ${Number(massive.remainingToday).toLocaleString()} left today`
        : `${symbols.length} reviewed berths · waiting for the server field`;
      const detail = tickerbot
        ? `Tickerbot ${Number(tickerbot.callsThisMonth || 0).toLocaleString()}/${Number(tickerbot.monthlyLimit || 0).toLocaleString()} this month${tickerbot.reserveCalls ? ` · ${Number(tickerbot.reserveCalls).toLocaleString()} reserved` : ""}`
        : "The Tickerbot queue is read from the server field.";
      const queueLine = queue
        ? `Queue ${Number(queue.pending) || 0} pending · ${Number(queue.claimed) || 0} in flight`
        : "No queue reading yet.";
      const burst = warm && warm.callsPerBurst
        ? `Warm burst ${Number(warm.callsPerBurst)} calls${warm.deployWarmAt ? ` · first deploy ${shortTime(Number(warm.deployWarmAt))}` : ""}`
        : "The deploy warm burst is described by the server field.";
      planHost.innerHTML = `
        <span class="gi-orb2-plan-chip"><strong>${escapeHtml(estimate)}</strong><small>${escapeHtml(burst)}</small></span>
        <span class="gi-orb2-plan-chip"><strong>${escapeHtml(detail)}</strong><small>${escapeHtml(queueLine)}${status && status.lastTickAt ? ` · last tick ${escapeHtml(shortTime(Number(status.lastTickAt)))}` : ""}</small></span>`;
    }

    function latestObservationForFocus() {
      if (!state.focus) return null;
      const mode = currentProvider();
      const exact = latestObservation(state.discId, state.focus, mode, state.interval);
      if (exact) return exact;
      return latestObservation(state.discId, state.focus);
    }

    function latestForNode(node) {
      if (!stage) return null;
      if (node.symbol) {
        /* Ticker orbs map straight to their reviewed berth symbol. */
        const observation = latestObservation(state.discId, node.symbol);
        const berth = stage.berths.find(entry => entry.symbol === node.symbol);
        return observation ? { ...observation, berth } : null;
      }
      const berths = stage.berths.filter(berth => berth.npc && berth.npc.name === node.name);
      let latest = null;
      for (const berth of berths) {
        const observation = latestObservation(state.discId, berth.symbol);
        if (observation && (!latest || observation.at > latest.at)) latest = { ...observation, berth };
      }
      return latest;
    }

    function priceRows(market) {
      if (!market || !market.latestBar) return `<div><dt>Latest observed bar</dt><dd>No price tuple supplied; this berth remains frozen.</dd></div>`;
      const bar = market.latestBar;
      const hasOhlc = [bar.open, bar.high, bar.low].every(value => numeric(value) !== null);
      const volumeText = numeric(bar.volume) === null ? "not supplied" : formatPrice(bar.volume);
      const priceText = hasOhlc
        ? `O ${formatPrice(bar.open)} · H ${formatPrice(bar.high)} · L ${formatPrice(bar.low)} · C ${formatPrice(bar.close)}`
        : `Close ${formatPrice(bar.close)} · OHLC not supplied`;
      return `
        <div><dt>${hasOhlc ? "Observed OHLC" : "Observed value"}</dt><dd>${escapeHtml(priceText)}</dd></div>
        <div><dt>Volume</dt><dd>${escapeHtml(volumeText)}${market.volumeAvailable ? " · supplied" : " · unavailable"}</dd></div>
        <div><dt>Change vs prior confirmed bar</dt><dd>${escapeHtml(formatPercent(market.changePct))}</dd></div>`;
    }

    function compositionMarkup(composition) {
      if (!composition || typeof composition !== "object") return "";
      const position = Number(composition.composedPosition);
      const baseline = Number(composition.baselinePosition);
      const intraday = Number(composition.intradayPosition);
      const freshness = Number(composition.freshness);
      const multiplier = Number(composition.forceMultiplier);
      const has = value => Number.isFinite(value);
      const status = String(composition.status || "hold").toUpperCase();
      const reason = String(composition.reason || "scale composition held").replace(/-/g, " ");
      return `<section class="gi-orb2-scale-composition" aria-label="Daily and fifteen minute composition">
        <h5>DAILY BASELINE × 15M RESIDUAL <span>${escapeHtml(status)}</span></h5>
        <dl class="gi-orb2-node-meta">
          <div><dt>Composed display position</dt><dd>${has(position) ? `${(position * 100).toFixed(1)}%` : "HELD · daily baseline unavailable"}</dd></div>
          <div><dt>Daily baseline / 15m</dt><dd>${has(baseline) ? `${(baseline * 100).toFixed(1)}%` : "—"} / ${has(intraday) ? `${(intraday * 100).toFixed(1)}%` : "—"}</dd></div>
          <div><dt>15m freshness / force multiplier</dt><dd>${has(freshness) ? `${(freshness * 100).toFixed(0)}%` : "0%"} / ${has(multiplier) ? `${multiplier.toFixed(2)}×` : "1.00×"}</dd></div>
          <div><dt>Scientific treatment</dt><dd>Log-band position; 15m volatility scaled by √26 RTH bars</dd></div>
        </dl>
        <p class="gi-orb2-observation-time">${escapeHtml(reason)} · ${escapeHtml(composition.note || "display only; not a signal")}</p>
      </section>`;
    }

    function observationMarkup(observation) {
      if (!observation) return `<div class="gi-orb2-observation-empty">No stored observation for this focus yet. Beat now asks the server for one tick, or turn Auto view on to re-read the field.</div>`;
      const market = observation.market;
      const mood = observation.motion && observation.motion.mood || "frozen";
      const color = MOOD_COLORS[mood] || MOOD_COLORS.unknown;
      const provider = providerTitle(observation.providerMode || (observation.provider === "alpha-vantage" ? "alpha" : observation.provider === "synthetic" ? "rehearsal" : observation.provider));
      const freshness = observation.freshness && observation.freshness.status ? String(observation.freshness.status).toUpperCase() : "FRESHNESS UNKNOWN";
      if (!market) {
        return `
          <div class="gi-orb2-observation-head"><strong>${escapeHtml(observation.symbol)} · UNAVAILABLE</strong><span>${escapeHtml(provider)} · ${escapeHtml(freshness)}</span></div>
          <p class="gi-orb2-observation-error">${escapeHtml(observation.message || observation.code || "No provider observation was returned.")}</p>
          <p class="gi-orb2-observation-time">${escapeHtml(shortTime(observation.at))} · no upstream values were inferred.</p>`;
      }
      const fields = priceRows(market);
      const vfi = market.vfi && market.vfi.available ? `VFI ${formatPrice(market.vfi.value)} · signal ${formatPrice(market.vfi.signal)}` : "VFI unavailable without complete OHLCV";
      const flow = flowPathForObservation(observation, observation.motion);
      const flowText = flow.moving ? `${flow.label} · ${flow.direction} · ${flow.rate.toFixed(2)} visual cycles/s`
        : `${flow.reason || "Paused"} · ${flow.label}`;
      const wave = market.waveTrend ? `WaveTrend ${formatPrice(market.waveTrend.wt1)} / ${formatPrice(market.waveTrend.wt2)} · ${market.waveTrend.zone || "unknown"}` : "WaveTrend unavailable";
      const bits = dataBitsForMarket(market).map(bit => `
        <span class="gi-orb2-data-bit" style="--gi-orb2-bit:${escapeHtml(bit.color)}" title="${escapeHtml(bit.detail)}" aria-label="${escapeHtml(`${bit.label}: ${bit.value}. ${bit.detail}`)}">
          <i aria-hidden="true"></i><span>${escapeHtml(bit.label)}</span><strong>${escapeHtml(bit.value)}</strong>
        </span>`).join("");
      return `
        <div class="gi-orb2-observation-head"><strong>${escapeHtml(observation.symbol)} · ${escapeHtml(mood.toUpperCase())}</strong><span>${escapeHtml(provider)} · ${escapeHtml(freshness)}</span></div>
        <p class="gi-orb2-observation-source">${escapeHtml(market.source || "Provider source not supplied")} · ${escapeHtml(market.timeframe || observation.interval)} · ${market.barCount} bars · field ${escapeHtml(freshness.toLowerCase())}</p>
        <dl class="gi-orb2-node-meta">${fields}<div><dt>Characters motion</dt><dd style="color:${escapeHtml(color)}">${escapeHtml(observation.motion && observation.motion.caption || mood)}</dd></div>
          <div><dt>Observed VFI</dt><dd>${escapeHtml(vfi)}</dd></div><div class="gi-orb2-flow-detail"><dt>Volume-flow path · Characters</dt><dd style="color:${escapeHtml(flow.color)}">${escapeHtml(flowText)}</dd><small>Visual cadence only—not volume per second.</small></div><div><dt>WaveTrend context</dt><dd>${escapeHtml(wave)}</dd></div></dl>
        <section class="gi-orb2-market-bits" aria-label="Observed market data channels">
          <h5>FIVE MARKET DATA BITS <span>NOT ASSURANCE</span></h5><div>${bits}</div>
        </section>
        ${compositionMarkup(observation.composition)}
        <p class="gi-orb2-observation-time">Observed ${escapeHtml(shortTime(observation.at))} · ${market.synthetic ? "synthetic rehearsal · not live" : "API-supplied · verify provider"}${market.latestBar && market.latestBar.confirmed ? " · confirmed bar" : " · latest bar not confirmed"}</p>`;
    }

    function drawInspector() {
      const node = nodes[state.selected] || nodes[0];
      const focusBerth = stage && stage.berths.find(berth => berth.symbol === state.focus);
      const focusObservation = latestObservationForFocus();
      const nodeObservation = latestForNode(node);
      const activeObservation = focusObservation || nodeObservation;
      const provider = currentProvider();
      const nodeSource = nodeObservation ? `${nodeObservation.observation || nodeObservation.symbol} · ${providerTitle(nodeObservation.providerMode)}` : "No assigned instrument has reported yet";
      const nodeActivity = nodeObservation && nodeObservation.motion ? nodeObservation.motion.caption : "No market observation — the character stands still.";
      const assignments = stage ? stage.berths.filter(berth => berth.npc && berth.npc.name === node.name).length : 0;
      detail.innerHTML = `
        <div class="gi-orb2-node-head"><span style="--gi-orb2-node:${escapeHtml(node.color)}">${escapeHtml(node.glyph)}</span><div><h4>${escapeHtml(node.name)}</h4><p>${node.symbol ? `${escapeHtml(node.symbol)} · ${timeframe || "1h"} ticker orb` : `${escapeHtml(node.visualId)} · local visual node`}</p></div></div>
        <dl class="gi-orb2-node-meta">
          <div><dt>Affinity / sector</dt><dd>${escapeHtml(node.affinity.join(" · "))}</dd></div>
          <div><dt>${node.symbol ? "Reviewed berth" : "Characters-cast assignment"}</dt><dd>${node.symbol ? `${escapeHtml(node.symbol)} on ${escapeHtml(DiscCatalog.disc(state.discId)?.label || state.discId)}` : `${assignments} reviewed berth${assignments === 1 ? "" : "s"} · ${escapeHtml(DiscCatalog.disc(state.discId)?.label || state.discId)}`}</dd></div>
          ${node.marketCapUsd ? `<div><dt>Market-cap snapshot</dt><dd>${escapeHtml(node.marketCapLabel || formatPrice(node.marketCapUsd))} · ${escapeHtml(node.sector)} source rank #${escapeHtml(node.sectorRank || "—")} · ${escapeHtml(node.marketCapAsOf || "date unavailable")}</dd></div>` : ""}
          <div><dt>Latest node pathway</dt><dd>${escapeHtml(nodeSource)}</dd></div>
          <div><dt>${node.symbol ? "Orb motion" : "NPC motion"} · ${escapeHtml(providerTitle(provider))}</dt><dd>${escapeHtml(nodeActivity)}</dd></div>
        </dl>
        <div class="gi-orb2-focus-readout"><p class="gi-eyebrow">FOCUS · ${escapeHtml(state.focus || "—")}</p>${observationMarkup(activeObservation)}</div>
        <p class="gi-orb2-node-role">${escapeHtml(node.role)}</p>
        <p class="gi-orb2-node-caveat">${node.symbol ? "Ticker labels identify reviewed watchlist symbols only; the orb is not price data, a signal, or an OCM identity." : "This character label is from the reviewed local cast. It is not a registered OCM address or identity claim."}</p>`;
      nodeSelect.value = node.id;
      routeNote.textContent = friendlyRoute(state.route);
      if (inspectorSummary) {
        const summary = node.symbol ? `${node.symbol} · ${node.name}` : node.name || "—";
        if (inspectorSummary.textContent !== summary) inspectorSummary.textContent = summary;
      }
    }

    function drawHistory() {
      const visibleEvents = state.events.filter(event => event.discId === state.discId).slice(-8).reverse();
      historyCount.textContent = `${state.events.length} saved beat${state.events.length === 1 ? "" : "s"} · ${visibleEvents.length} on this Disc`;
      if (!visibleEvents.length) {
        historyHost.innerHTML = `<li class="gi-orb2-history-empty">No saved beat on this Disc. When a live market observation arrives, Orb 2 writes a compact snapshot to server-side D1 history and keeps a local recovery copy.</li>`;
        return;
      }
      historyHost.innerHTML = visibleEvents.map(event => {
        const instruments = event.instruments.map(item => item.symbol).join(", ") || "No instrument returned";
        const status = event.instruments.some(item => item.market) ? "OBSERVED"
          : event.instruments.some(item => item.status === "unavailable") ? "HELD / UNAVAILABLE" : "NO DATA";
        const label = event.provider === "rehearsal" ? "SYNTHETIC · NOT LIVE" : providerTitle(event.provider);
        return `<li class="gi-orb2-history-item"><time datetime="${escapeHtml(new Date(event.at).toISOString())}">${escapeHtml(shortTime(event.at))}</time>
          <strong>${escapeHtml(label)} · ${escapeHtml(status)}</strong><span>${escapeHtml(instruments)}</span>
          <small>${event.calls} provider request${event.calls === 1 ? "" : "s"} · ${escapeHtml(event.interval)} · ${event.cacheHits} cached · ${escapeHtml(event.reason)}</small></li>`;
      }).join("");
    }

    /* One cadence only: how often this page re-reads the server field. The
       provider cadences themselves live in the Worker's cron schedule. */
    function currentDelay() {
      return FIELD_POLL_MS;
    }

    function ignitionTarget() {
      if (!state.ignition.active) return null;
      if (state.ignition.phase === "server-deploy" || state.ignition.phase === "dxy") {
        const component = Dxy.COMPONENTS.find(input => !state.ignition.fxFired.has(input.symbol));
        return component ? { kind: "dxy-component", symbol: component.symbol, component } : null;
      }
      if (state.ignition.phase === "tickers") {
        const asset = marketFiringOrder.find(entry => !state.ignition.tickerFired.has(entry.symbol));
        return asset ? { kind: "ticker", symbol: asset.symbol, asset } : null;
      }
      return null;
    }

    function drawIgnition() {
      if (!ignitionHost) return;
      ignitionHost.hidden = !state.ignition.enabled;
      if (!state.ignition.enabled) return;
      const target = ignitionTarget();
      const renderKey = [state.ignition.active, state.ignition.phase, state.ignition.workerReady, state.pending,
        state.routeSteps.worker, state.ignition.fxFired.size, state.ignition.tickerFired.size,
        state.ignition.blocked, target && target.symbol, state.dxy && state.dxy.status,
        state.dxy && state.dxy.value, state.dxy && state.dxy.asOf].join("|");
      if (renderKey === state.ignition.renderKey) return;
      state.ignition.renderKey = renderKey;
      const ready = state.ignition.workerReady;
      const workerFailed = /ROUTE ERROR|UNAVAILABLE|NOT CONFIGURED|CHECK FAILED|MISSING/i.test(String(state.routeSteps.worker || ""));
      ignitionServer.textContent = ready ? "SERVER FIELD REACHED · CRON BEAT"
        : workerFailed ? "SERVER FIELD UNREACHABLE · RENDER HELD"
          : state.fieldPending ? "READING THE SERVER FIELD"
            : "WAITING · SERVER FIELD";
      if (state.dxy && state.dxy.ok) {
        const date = new Date(state.dxy.asOf).toISOString().slice(0, 10);
        ignitionDxy.textContent = `DXY ${state.dxy.value.toFixed(3)} · AS OF ${date} · FIXED BENCHMARK`;
      } else {
        const status = state.dxy && state.dxy.status ? state.dxy.status.toUpperCase() : "WAITING";
        const next = target && target.kind === "dxy-component" ? ` · NEXT ${target.symbol}` : "";
        ignitionDxy.textContent = `${state.ignition.fxFired.size}/6 FX CLOSES · ${status}${next}`;
      }
      ignitionFx.textContent = Dxy.COMPONENTS.map(input =>
        `${input.symbol} ${state.ignition.fxFired.has(input.symbol) ? "✓" : "·"}`
      ).join(" · ");
      ignitionProgress.textContent = `${state.ignition.tickerFired.size} / ${Dxy.REQUIRED_ASSETS}`;
      if (state.ignition.blocked) ignitionNote.textContent = `SWEEP HELD · ${state.ignition.blocked} No alternate provider or synthetic value is substituted.`;
      else if (!state.ignition.active) ignitionNote.textContent = "Sequence complete · 52 of 52 ticker beats confirmed in the stored field; the DXY value remains a dated, fixed-center reference.";
      else if (state.ignition.phase === "tickers") ignitionNote.textContent = `DXY inputs aligned · ${target ? `next ${target.asset.firingOrder}/52 ${target.symbol}` : "all ticker beats complete"}. The Worker's cron beat spends up to ${MASSIVE_REQUESTS_PER_MINUTE} Massive requests per minute inside its UTC-day allowance; this page renders stored observations only.`;
      else ignitionNote.textContent = `The Worker's cron beat runs server-side 24/7/365 → six FX closes → fixed DXY benchmark → 52 stock beats, all inside the shared ${MASSIVE_REQUESTS_PER_MINUTE}/minute and UTC-day allowances, with the Tickerbot warm burst filling the field on deploy. ${target ? `Next stored input: ${target.symbol}.` : "Waiting for the server field."} Hiding or reloading this page never restarts the order; DXY is held until all six closes share one timestamp.`;
      if (ignitionRestartButton) ignitionRestartButton.hidden = state.ignition.active;

      const rows = [];
      let currentSector = "";
      for (const asset of marketFiringOrder) {
        if (asset.sector !== currentSector) {
          currentSector = asset.sector;
          const sectorSize = marketFiringOrder.filter(entry => entry.sector === currentSector).length;
          rows.push(`<li class="gi-orb2-fire-sector"><span>${escapeHtml(currentSector)}</span><small>${sectorSize} ticker${sectorSize === 1 ? "" : "s"} · descending cap</small></li>`);
        }
        const fired = state.ignition.tickerFired.has(asset.symbol);
        const isNext = target && target.kind === "ticker" && target.symbol === asset.symbol;
        const status = fired ? "FIRED" : isNext ? "NEXT" : "WAITING";
        rows.push(`<li class="gi-orb2-fire-row" data-beat-state="${status.toLowerCase()}" data-symbol="${escapeHtml(asset.symbol)}">
          <span class="gi-orb2-fire-number">${String(asset.firingOrder).padStart(2, "0")}</span>
          <strong>${escapeHtml(asset.symbol)}</strong><span class="gi-orb2-fire-name">${escapeHtml(asset.name)}</span>
          <small>${escapeHtml(asset.marketCapLabel)} · sector rank #${escapeHtml(asset.sectorRank)} · ${escapeHtml(asset.marketCapAsOf)}</small>
          <em>${status}</em>
        </li>`);
      }
      firingList.innerHTML = rows.join("");
      if (firingSummary) {
        const next = marketFiringOrder.find(asset => !state.ignition.tickerFired.has(asset.symbol));
        firingSummary.textContent = state.ignition.tickerFired.size >= Dxy.REQUIRED_ASSETS
          ? "All 52 stored · open for the ordered detail"
          : `${state.ignition.tickerFired.size}/52 stored · next ${next ? `${next.firingOrder}/52 ${next.symbol}` : "waiting for the field"}`;
      }
    }

    /**
     * The beat-type dial. The server publishes which types each stored
     * observation can support; the dial reads those descriptors, falls back to
     * the shared client catalog, and never offers a type the server did not
     * report as available for the current field.
     */
    function beatTypeEntries() {
      const Scenarios = globalThis.GoodIntelligenceOrb2Scenarios;
      const published = state.field && Array.isArray(state.field.beatTypes) ? state.field.beatTypes : [];
      if (published.length) return published;
      const catalog = Scenarios && Array.isArray(Scenarios.TYPES) ? Scenarios.TYPES : [];
      if (catalog.length) return catalog.map(type => ({ id: type.id, label: type.label, live: type.live, summary: type.summary, available: true, count: null }));
      return FIELD_BEAT_TYPES.map(id => ({ id, label: id, live: id === "observation", available: true, count: null }));
    }

    function activeScenarioObservation() {
      const symbol = state.focus || (nodes[state.selected] && nodes[state.selected].symbol) || null;
      if (!symbol) return null;
      return latestObservation(state.discId, symbol);
    }

    function activeScenario() {
      if (!state.beatType || state.beatType === "observation") return null;
      const Scenarios = globalThis.GoodIntelligenceOrb2Scenarios;
      if (!Scenarios || typeof Scenarios.scenarioFor !== "function") return null;
      const observation = activeScenarioObservation();
      return { observation, scenario: Scenarios.scenarioFor(state.beatType, observation, { now: Date.now() }) };
    }

    /* A scenario is a local choreography over a stored beat. Its active phase
       drives the existing trace renderer: inward/resolve/outward legs pass
       through Center Origin, lateral legs hop between berths. No phase sends,
       grants, or settles anything. */
    function advanceScenario(now) {
      const active = activeScenario();
      if (!active) return null;
      const { observation, scenario } = active;
      if (!scenario.available) {
        routeNote.textContent = scenario.reason || "This beat type is not available for the selected berth.";
        return scenario;
      }
      const phase = scenario.phases.find(entry => entry.id === scenario.activePhase) || scenario.phases[0];
      if (fieldNote) {
        const berth = stage && stage.berths.find(entry => entry.symbol === scenario.symbol);
        const character = berth && berth.npc && berth.npc.name ? berth.npc.name : null;
        fieldNote.textContent = `${scenario.label}${character ? ` · ${character}` : ""} · ${phase ? phase.label : "phase unavailable"} · ${scenario.boundary || ""}`;
      }
      if (phase && !state.route) {
        const lateral = phase.channel === "lateral";
        setRoute(lateral ? "lateral" : "resolution");
        state.lastRoutePhase = "";
      }
      /* setRoute() refreshes the inspector and rewrites the route note, so the
         scenario description is applied after the trace is installed. */
      routeNote.textContent = globalThis.GoodIntelligenceOrb2Scenarios.describe(scenario);
      return scenario;
    }

    function drawFieldDial() {
      if (!fieldDial) return;
      const entries = beatTypeEntries();
      const buttons = entries.map(entry => {
        const selected = state.beatType === entry.id;
        const count = Number.isFinite(Number(entry.count)) ? ` · ${Number(entry.count)}` : "";
        const unavailable = entry.available === false;
        return `<button class="gi-button gi-orb2-dial-pill${selected ? " selected" : ""}" type="button" role="radio"
          aria-checked="${selected}" data-field-type="${escapeHtml(entry.id)}"${unavailable ? " disabled" : ""}
          title="${escapeHtml(entry.summary || "")}">${escapeHtml(entry.label || entry.id)}${count}${entry.live ? " · live" : ""}</button>`;
      }).join("");
      const all = `<button class="gi-button gi-orb2-dial-pill${state.beatType ? "" : " selected"}" type="button" role="radio"
        aria-checked="${!state.beatType}" data-field-type="">All stored beats</button>`;
      const key = `${state.beatType || ""}|${entries.map(entry => `${entry.id}:${entry.available}:${entry.count}`).join(",")}`;
      if (fieldDial.dataset.renderKey !== key) {
        fieldDial.dataset.renderKey = key;
        fieldDial.innerHTML = all + buttons;
      }
      if (fieldFocus) {
        const symbolsHere = (stage && stage.berths ? stage.berths.map(berth => berth.symbol) : []).slice(0, 24);
        const focused = new Set(state.focusSymbols);
        const chips = symbolsHere.map(symbol => `<button class="gi-button gi-orb2-focus-chip${focused.has(symbol) ? " selected" : ""}"
          type="button" aria-pressed="${focused.has(symbol)}" data-focus-symbol="${escapeHtml(symbol)}">${escapeHtml(symbol)}</button>`).join("");
        const clear = state.focusSymbols.length ? `<button class="gi-button gi-orb2-focus-chip" type="button" data-focus-clear>Clear focus (${state.focusSymbols.length})</button>` : "";
        const focusKey = `${state.discId}|${symbolsHere.length}|${state.focusSymbols.join(",")}`;
        if (fieldFocus.dataset.renderKey !== focusKey) {
          fieldFocus.dataset.renderKey = focusKey;
          fieldFocus.innerHTML = clear + chips;
        }
      }
    }

    function drawStatus() {
      const provider = currentProvider();
      providerHost.textContent = providerDescription(provider);
      providerHost.className = `gi-orb2-provider-pill ${provider}`;
      if (state.pending) countdownHost.textContent = "SERVER TICK REQUESTED · WAITING";
      else if (!state.auto) countdownHost.textContent = "AUTO VIEW PAUSED · SERVER KEEPS BEATING 24/7";
      else if (state.fieldFailed) countdownHost.textContent = "SERVER FIELD UNREACHABLE · NO PAGE REQUESTS";
      else if (state.fieldPending) countdownHost.textContent = "READING SERVER FIELD…";
      else if (state.lastBeatAt) {
        const remaining = state.nextBeatAt > Date.now() ? state.nextBeatAt - Date.now() : currentDelay();
        countdownHost.textContent = `NEWEST STORED BEAT ${shortTime(state.lastBeatAt)} · NEXT READ IN ${formatCountdown(remaining)}`;
      }
      else countdownHost.textContent = "WAITING FOR THE SERVER FIELD'S FIRST STORED BEAT";
      persistenceHost.textContent = state.persistence === "saved" ? "SERVER HISTORY · SAVED"
        : state.persistence === "saving" ? "SERVER HISTORY · SAVING"
          : state.persistence === "loading" ? "SERVER HISTORY · LOADING"
            : state.persistence === "local-only" ? "LOCAL RECOVERY · SERVER UNAVAILABLE"
              : state.persistence === "local-storage-unavailable" ? "SESSION STORAGE BLOCKED" : state.persistence;
      persistenceHost.title = state.persistenceNote;
      countsHost.textContent = `${state.ledger.calls.toLocaleString()} local calls · ${state.ledger.beats.toLocaleString()} beats · ${symbols.length} berths`;
      routeStepProvider.textContent = state.routeSteps.provider;
      routeStepWorker.textContent = state.routeSteps.worker;
      routeStepLedger.textContent = state.routeSteps.ledger;
      routeStepModel.textContent = state.routeSteps.model;
      drawIgnition();
      drawFieldDial();
      advanceScenario(Date.now());
      [routeStepProvider, routeStepWorker, routeStepLedger, routeStepModel].forEach(element => {
        element.classList.toggle("blocked", /UNAVAILABLE|BLOCKED|REFUSED/i.test(element.textContent));
        element.classList.toggle("active", /REQUESTING|FETCHING/i.test(element.textContent));
      });
      if (state.message) {
        messageHost.hidden = false;
        messageHost.className = `gi-orb2-message ${state.message.kind || "note"}`;
        messageHost.textContent = state.message.text;
      } else {
        messageHost.hidden = true;
        messageHost.textContent = "";
      }
      autoButton.textContent = `Auto view: ${state.auto ? "on" : "off"}`;
      autoButton.setAttribute("aria-pressed", String(state.auto));
      beatButton.disabled = state.pending || state.loadingCatalog;
      canvasStatus.textContent = !context2d ? "CANVAS UNAVAILABLE · BEAT LOG / INSPECTOR STILL ACTIVE"
        : "LIVE API-DERIVED MOTION · VISUAL PATHS ONLY";
      const documentRef = host.ownerDocument || globalThis.document;
      const modelFullscreenActive = fallbackFullscreen || Boolean(documentRef && documentRef.fullscreenElement === root);
      fullscreenButton.textContent = modelFullscreenActive ? "⛶ Exit model full screen" : "⛶ Model full screen";
      fullscreenButton.setAttribute("aria-label", modelFullscreenActive ? "Exit Orb 2 model fullscreen" : "Fullscreen Orb 2 model only");
      fullscreenButton.setAttribute("aria-pressed", String(modelFullscreenActive));
      drawPlan();
    }

    function draw() {
      syncFormControls();
      drawInspector();
      drawHistory();
      /* drawStatus() runs last so the beat-type scenario narration and the
         server-field readouts win over the default trace text that
         drawInspector() writes. */
      drawStatus();
      scheduleRender();
    }

    function fieldInterval() {
      return state.ignition.enabled && state.discId === "stocks" ? "1d"
        : state.interval === "1h" ? "1h" : "1d";
    }

    function fieldUrl() {
      const params = new URLSearchParams();
      params.set("interval", fieldInterval());
      if (state.beatType) params.set("types", state.beatType);
      const focused = state.focusSymbols.filter(Boolean);
      if (focused.length) params.set("symbols", focused.join(","));
      return `${FIELD_ROUTE}?${params.toString()}`;
    }

    async function postField(action, body = {}) {
      const fetcher = globalThis.fetch;
      if (typeof fetcher !== "function") throw new Error("The same-origin Worker route cannot be reached because fetch is unavailable.");
      const response = await fetcher(FIELD_ROUTE, {
        method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ schema: FIELD_REQUEST_SCHEMA, action, interval: fieldInterval(), ...body })
      });
      const payload = await response.json().catch(() => null);
      const data = payload && isRecord(payload.data) ? payload.data : null;
      if (!response.ok || !payload || payload.success !== true) {
        const error = new Error(payload && payload.message || `The server field answered HTTP ${response.status}.`);
        error.code = response.status === 429 ? "field-hold" : response.status === 503 ? "field-unconfigured" : "field-error";
        throw error;
      }
      return data;
    }

    function fieldObservation(row) {
      return {
        symbol: String(row.symbol || "").toUpperCase(),
        displaySymbol: String(row.displaySymbol || row.symbol || ""),
        name: String(row.name || ""), sector: String(row.sector || ""),
        status: row.status, provider: row.provider, code: String(row.code || ""),
        message: String(row.message || ""), lane: null,
        market: row.market || null, motion: row.motion || null, composition: row.composition || null,
        confirmed: row.confirmed === true, barTime: row.barTime === undefined ? null : row.barTime,
        at: Number(row.observedAt) || 0,
        freshness: row.freshness || null,
        discId: row.discId, interval: row.interval, providerMode: row.provider,
        reason: row.reason || "server-sweep", beatId: row.beatId,
        beatTypes: Array.isArray(row.beatTypes) ? row.beatTypes : ["observation"]
      };
    }

    function applyFieldSnapshot(snapshot) {
      const observations = new Map();
      let newest = 0;
      for (const row of Array.isArray(snapshot.observations) ? snapshot.observations : []) {
        const observation = fieldObservation(row);
        if (!observation.symbol || !observation.at) continue;
        observations.set(`${observation.discId}:${observation.provider}:${observation.interval}:${observation.symbol}`, observation);
        if (observation.at > newest) newest = observation.at;
      }
      state.observations = observations;
      state.field = snapshot;
      state.fieldAt = Date.now();
      state.fieldFailed = false;
      if (newest) state.lastBeatAt = newest;
      if (snapshot.dxy) state.dxy = snapshot.dxy;
      const status = snapshot.status || {};
      const massive = status.massive || {};
      const tickerbot = status.tickerbot || {};
      state.routeSteps = {
        provider: massive.ledger === "ready" ? `SERVER · MASSIVE ${Number(massive.callsToday) || 0}/${Number(massive.dailyLimit) || 300} TODAY`
          : tickerbot.ledger === "ready" ? "SERVER · TICKERBOT QUEUE" : "SERVER FIELD",
        worker: `CRON ${String(status.cron || "*/1 * * * *")} · TICK ${status.lastTickAt ? shortTime(Number(status.lastTickAt)) : "PENDING"}`,
        ledger: massive.exhausted ? `MASSIVE DAY SPENT · QUEUE CONTINUES`
          : Number.isFinite(Number(massive.remainingToday)) ? `MASSIVE ${Number(massive.remainingToday)} LEFT TODAY` : "LEDGER UNREAD",
        model: snapshot.observations.length ? "RENDER-ONLY · NO PAGE REQUEST" : "WAITING FOR THE FIRST SERVER BEAT"
      };
      syncIgnitionFromField(snapshot);
    }

    function syncIgnitionFromField(snapshot) {
      if (!state.ignition.enabled) return;
      if (snapshot && snapshot.dxy) state.dxy = snapshot.dxy;
      const rows = Array.isArray(snapshot && snapshot.observations) ? snapshot.observations : [];
      for (const row of rows) {
        if (row.provider !== "massive" || row.interval !== "1d" || row.confirmed !== true || !row.market) continue;
        if (row.discId === "fx" && Dxy.COMPONENTS.some(component => component.symbol === row.symbol)) {
          state.ignition.fxInputs.set(row.symbol, fieldObservation(row));
          state.ignition.fxFired.add(row.symbol);
        }
        if (row.discId === "stocks") state.ignition.tickerFired.add(row.symbol);
      }
      state.ignition.workerReady = Boolean(snapshot && snapshot.ok);
      if (state.ignition.fxFired.size >= Dxy.COMPONENTS.length && !(state.dxy && state.dxy.ok)) {
        state.dxy = Dxy.evaluate([...state.ignition.fxInputs.values()], Date.now());
      }
      if (state.ignition.tickerFired.size >= Dxy.REQUIRED_ASSETS) {
        state.ignition.phase = "complete";
        if (state.ignition.active) {
          state.ignition.active = false;
          state.message = { kind: "note", text: `Server field complete · all ${Dxy.REQUIRED_ASSETS} ticker beats and the six DXY closes are stored. The cron schedule keeps running; this view never replays the order.` };
        }
        return;
      }
      if (!state.ignition.active) return;
      if (state.ignition.fxFired.size >= Dxy.COMPONENTS.length) state.ignition.phase = "tickers";
      else if (state.ignition.workerReady) state.ignition.phase = "dxy";
    }

    async function loadFieldSnapshot({ reason = "poll" } = {}) {
      if (state.destroyed) return false;
      const fetcher = globalThis.fetch;
      if (typeof fetcher !== "function") {
        state.fieldFailed = true;
        state.message = { kind: "refusal", text: "The same-origin Worker route cannot be reached because fetch is unavailable. No provider request was made by this page." };
        draw();
        return false;
      }
      state.fieldPending = true;
      drawStatus();
      try {
        const response = await fetcher(fieldUrl(), {
          method: "GET", credentials: "same-origin", cache: "no-store", redirect: "error",
          headers: { Accept: "application/json" }
        });
        const payload = await response.json().catch(() => null);
        const data = payload && isRecord(payload.data) ? payload.data : null;
        state.fieldPending = false;
        if (!response.ok || !data || data.ok !== true) {
          state.fieldFailed = true;
          state.message = { kind: "refusal", text: `${payload && payload.message || `The server field answered HTTP ${response.status}.`} This page made no provider request; the 24/7 schedule is unaffected.` };
          draw();
          return false;
        }
        applyFieldSnapshot(data);
        if (reason !== "poll") {
          state.message = { kind: "note", text: `Server field read · ${data.observations.length} stored observation${data.observations.length === 1 ? "" : "s"} · newest ${data.observations.length ? shortTime(Number(data.observations[0].observedAt)) : "—"}. The page renders what the Worker stored; it requests nothing itself.` };
        }
        draw();
        return true;
      } catch (error) {
        state.fieldPending = false;
        state.fieldFailed = true;
        state.message = { kind: "refusal", text: `${error && error.message || "The server field could not be read."} The schedule runs server-side; nothing was substituted.` };
        draw();
        return false;
      }
    }

    /**
     * Manual is a deliberate choice: ask the server to run one scheduled tick,
     * or to prioritize the focused tickers through the Tickerbot queue. Either
     * way the provider call belongs to the Worker, never to this page.
     */
    async function beatNow(reason = "manual") {
      if (state.pending || state.loadingCatalog || state.destroyed) return false;
      state.pending = true;
      state.error = null;
      state.message = { kind: "note", text: "Asking the server field for one scheduled tick now. The cron schedule keeps its own cadence; this page sends no provider request." };
      drawStatus();
      let ok = false;
      try {
        const data = await postField("tick");
        const summary = data && data.summary || {};
        const notes = Array.isArray(data && data.notes) ? data.notes.filter(Boolean) : [];
        const stored = (Number(summary.massiveCalls) || 0) + (Number(summary.tickerbotCalls) || 0);
        state.message = { kind: "note", text: `Server tick complete · ${stored} new observation${stored === 1 ? "" : "s"} stored (Massive ${Number(summary.massiveCalls) || 0} · Tickerbot ${Number(summary.tickerbotCalls) || 0}), ${Number(summary.held) || 0} held.${notes.length ? ` ${notes[0]}` : ""}` };
        ok = true;
      } catch (error) {
        const hold = error && error.code === "field-hold";
        state.message = { kind: hold ? "note" : "refusal", text: `${error && error.message || "The server tick was refused."} ${hold ? "The continuous schedule is unchanged." : "No provider call was made from this page."}` };
      }
      state.pending = false;
      const outcome = state.message;
      await loadFieldSnapshot({ reason });
      if (ok) state.message = outcome;
      draw();
      schedule();
      return ok;
    }

    async function refreshFocused(interval = fieldInterval(), kind = "baseline") {
      const symbols = state.focusSymbols.filter(Boolean);
      if (!symbols.length) {
        state.message = { kind: "note", text: "Focus at least one reviewed stock first. The priority lane runs through Tickerbot, which covers the reviewed Disc1 deck." };
        draw();
        return false;
      }
      state.pending = true;
      drawStatus();
      try {
        const data = await postField("priority", { symbols, interval });
        state.message = { kind: "note", text: data && data.message || `${symbols.length} ${kind} priority job${symbols.length === 1 ? "" : "s"} queued for the next scheduled tick.` };
      } catch (error) {
        state.message = { kind: "refusal", text: error && error.message || `The focused ${kind} refresh was refused.` };
      }
      state.pending = false;
      const outcome = state.message;
      await loadFieldSnapshot({ reason: kind === "intraday" ? "intraday-priority" : "priority" });
      state.message = outcome;
      draw();
      schedule();
      return true;
    }

    function randomIndex(length) {
      if (!length) return -1;
      try {
        const cryptoApi = globalThis.crypto;
        if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
          const values = new Uint32Array(1);
          cryptoApi.getRandomValues(values);
          return values[0] % length;
        }
      } catch { /* display-only selection can use the local fallback */ }
      return Math.floor(Math.random() * length);
    }

    function addRandomUsTicker() {
      const candidates = state.discId === "stocks" ? (Array.isArray(state.entries) ? state.entries : [])
        .filter(entry => entry && entry.assetClass !== "crypto") : []
        .map(entry => String(entry.symbol || entry.ticker || "").toUpperCase())
        .filter(symbol => /^[A-Z][A-Z0-9._:-]{0,11}$/.test(symbol));
      const available = candidates.filter(symbol => !state.focusSymbols.includes(symbol));
      if (!available.length) {
        state.message = { kind: "note", text: "All reviewed U.S. tickers are already focused, or the current Disc has no additional U.S. ticker to add. No data was requested." };
        draw();
        return false;
      }
      const symbol = available[randomIndex(available.length)];
      state.focusSymbols = [...state.focusSymbols, symbol].slice(-12);
      state.focus = symbol;
      persistLocal();
      if (state.entries.length) buildStage(state.entries, state.discId);
      state.message = { kind: "note", text: `${symbol} added from the reviewed U.S. ticker deck. It is focused locally; use Recalculate focused · 15m when you want a bounded intraday refresh.` };
      draw();
      loadFieldSnapshot({ reason: "random-ticker" });
      return true;
    }

    async function warmField() {
      if (state.pending) return false;
      state.pending = true;
      drawStatus();
      try {
        const data = await postField("warm", { intervals: ["15m", "1h", "1d"], reason: "deploy" });
        state.message = { kind: "note", text: data && data.message || `First-deck calibration queued: ${data && data.enqueued || 0} Tickerbot jobs (~${data && data.callsPerBurst || 156} calls) drain across the next scheduled ticks.` };
      } catch (error) {
        state.message = { kind: "refusal", text: error && error.message || "The warm burst was refused; nothing was queued." };
      }
      state.pending = false;
      const outcome = state.message;
      await loadFieldSnapshot({ reason: "warm" });
      state.message = outcome;
      draw();
      schedule();
      return true;
    }

    function clearBeatTimer() {
      if (beatTimer) clearTimeout(beatTimer);
      beatTimer = null;
      state.nextBeatAt = 0;
    }

    function schedule() {
      clearBeatTimer();
      if (state.destroyed || !state.visible) { drawStatus(); return; }
      if (!state.auto) { drawStatus(); return; }
      state.nextBeatAt = Date.now() + FIELD_POLL_MS;
      drawStatus();
      beatTimer = setTimeout(async () => {
        beatTimer = null;
        state.nextBeatAt = 0;
        if (state.destroyed || !state.visible) return;
        await loadFieldSnapshot({ reason: "poll" });
        schedule();
      }, FIELD_POLL_MS);
    }

    async function switchDisc(discId) {
      const disc = DiscCatalog.disc(discId);
      if (state.ignition.active || !disc || state.pending || state.loadingCatalog) {
        discSelect.value = state.discId;
        return;
      }
      const previousDisc = state.discId;
      state.loadingCatalog = true;
      state.message = { kind: "note", text: `Loading ${disc.label} reviewed catalog…` };
      syncFormControls();
      drawStatus();
      try {
        const result = await entriesForDisc(discId);
        state.discId = discId;
        syncLastBeat();
        if (discId !== "stocks") state.auto = true;
        state.ranking = result.ranking;
        state.interval = intervalAllowed(discId, state.interval) ? state.interval : (disc.intervalModes[0] || "1d");
        if (discId !== "stocks") state.interval = "1d";
        state.focus = "";
        state.selected = 0;
        buildStage(result.entries, discId);
        state.loadingCatalog = false;
        state.message = { kind: "note", text: disc.ranking };
        persistLocal();
        draw();
        await loadFieldSnapshot({ reason: "disc-change" });
        schedule();
      } catch (error) {
        state.discId = previousDisc;
        discSelect.value = previousDisc;
        state.message = { kind: "refusal", text: (error && error.message) || `Unable to load ${disc.label}. No stale roster was substituted.` };
        draw();
      } finally {
        state.loadingCatalog = false;
        syncFormControls();
      }
    }

    async function switchInterval(nextInterval) {
      if (state.ignition.active || !intervalAllowed(state.discId, nextInterval) || state.pending) {
        intervalSelect.value = state.interval;
        return;
      }
      if (nextInterval === state.interval) return;
      state.interval = nextInterval;
      if (nextInterval === "1h") state.auto = false;
      else if (nextInterval === "1mo") state.auto = true;
            state.ledger = readLedger(state.discId, state.interval);
      state.message = nextInterval === "1mo"
        ? { kind: "note", text: "Alpha Vantage 1mo remains a separate Characters spotlight; the Orb 2 server field stores reviewed 1h and 1d observations, and reads 1d while this Disc shows 1mo." }
        : nextInterval === "1d" && state.auto
          ? { kind: "note", text: `Server field view · the Worker's cron beat spends up to ${MASSIVE_REQUESTS_PER_MINUTE} Massive requests per minute inside its UTC-day allowance; this page only re-reads the stored field every ${FIELD_POLL_MS / 1000} seconds.` }
          : { kind: "note", text: `Server field view at ${nextInterval}. The page renders the stored Tickerbot queue results; Beat now asks the server for one more scheduled tick.` };
      persistLocal();
      draw();
      await loadFieldSnapshot({ reason: "interval-change" });
      schedule();
    }



    function toggleAuto() {
      state.auto = !state.auto;
      state.message = state.auto
        ? { kind: "note", text: `Auto view on. This page re-reads the server field every ${FIELD_POLL_MS / 1000} seconds; the Worker's cron beat ran while the tab was hidden, closed, or on another Disc.` }
        : { kind: "note", text: "Auto view paused in this tab only. The server keeps beating 24/7/365; Beat now asks it for one tick on request." };
      persistLocal();
      draw();
      schedule();
      if (state.auto) loadFieldSnapshot({ reason: "auto-on" });
    }

    function restartIgnition() {
      if (!state.ignition.enabled || state.pending || state.loadingCatalog) return;
      state.discId = "stocks";
      state.interval = "1d";
      state.ledger = readLedger("stocks", "1d");
      state.ignition.active = true;
      state.ignition.phase = "server-deploy";
      state.ignition.workerReady = false;
      state.ignition.fxInputs.clear();
      state.ignition.fxFired.clear();
      state.ignition.tickerFired.clear();
      state.ignition.blocked = "";
      state.ignition.renderKey = "";
      state.dxy = null;
      state.auto = true;
      state.routeSteps = { provider: "READY", worker: "SERVER FIELD", ledger: "READING", model: "RENDER-ONLY" };
      state.message = { kind: "note", text: "Re-reading the server field from the top of the firing order. Nothing is re-requested: progress is whatever the Worker already stored, so a hidden or reloaded page never restarts the order." };
      persistLocal();
      draw();
      return loadFieldSnapshot({ reason: "ignition" }).then(schedule);
    }

    function modelPoint(node, now, directive, observation = null) {
      const placement = marketDataPlacement(observation && observation.market, observation && observation.symbol || node.symbol || node.name, observation && observation.composition);
      const floatPhase = placement.phase + now / 1000 * placement.speed;
      const float = placement.amplitude * (0.72 + 0.28 * Math.sin(floatPhase * 0.61) ** 2);
      let longitude = placement.longitude + Math.cos(floatPhase) * float;
      let latitude = placement.latitude + Math.sin(floatPhase * 1.13) * float * 0.72;
      let radius = placement.radius + Math.sin(floatPhase * 0.73) * float * 0.34;
      if (directive && !directive.frozen && directive.npc) {
        const npc = directive.npc;
        const phase = floatPhase + (0.6 + clamp(Number(npc.speed) || 0, 0, 1) * 2.2) * now / 1000;
        const stride = clamp(Number(npc.stride) || 0, 0, 1) * (0.025 + Math.sin(phase) ** 2 * 0.06);
        const bearing = Number(npc.bearing) || 0;
        const jitter = clamp(Number(npc.jitter) || 0, 0, 1) * Math.sin(phase * 3.7) * 0.025;
        longitude += Math.cos(bearing + jitter) * stride;
        latitude += Math.sin(bearing + jitter) * stride * 0.65;
        radius += Math.sin(phase * 0.7) * stride * 0.18;
        if (npc.formation === "tight") latitude *= 0.96;
        if (npc.formation === "rim") latitude = clamp(latitude * 1.04, -1.45, 1.45);
        if (npc.formation === "column") longitude += Math.sin(phase) * stride * 0.3;
        if (npc.formation === "scatter") latitude += jitter;
      }
      const sphere = {
        x: radius * Math.cos(latitude) * Math.cos(longitude),
        y: radius * Math.sin(latitude),
        z: radius * Math.cos(latitude) * Math.sin(longitude)
      };
      /* The flat form is still a free orbital field: its radius comes from the
         packet's pressure/volatility, not from a sector slot or center tether. */
      const disc = { x: radius * Math.cos(longitude), y: 0, z: radius * Math.sin(longitude) };
      const t = ease(state.formation);
      return {
        x: disc.x + (sphere.x - disc.x) * t,
        y: disc.y + (sphere.y - disc.y) * t,
        z: disc.z + (sphere.z - disc.z) * t
      };
    }

    /* The camera rotation is its own step so every element — lattice, nodes, paths,
       and the Center Origin assembly — shares one rotation, pitch, and zoom. */
    function rotate3(point) {
      const cy = Math.cos(state.yaw), sy = Math.sin(state.yaw);
      const cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
      const x = point.x * cy - point.z * sy;
      const z0 = point.x * sy + point.z * cy;
      return { x, y: point.y * cp - z0 * sp, z: point.y * sp + z0 * cp };
    }

    function toScreen(point, width, height) {
      const fov = 7.5 / state.zoom;
      const scale = fov / (fov + point.z);
      /* Scale from the shorter dimension so the sphere stays round and fully
         visible on 2622 × 1206 widescreens as well as narrow mobile stages. */
      const modelUnit = Math.min(width, height) * (height > width ? 0.15 : 0.155);
      return { x: width / 2 + point.x * scale * modelUnit, y: height / 2 - point.y * scale * modelUnit, z: point.z, scale };
    }

    function project(point, width, height) {
      return toScreen(rotate3(point), width, height);
    }

    function canvasBounds() {
      const rect = typeof canvas.getBoundingClientRect === "function" ? canvas.getBoundingClientRect() : null;
      const width = Math.max(1, Math.round(canvas.clientWidth || rect?.width || 740));
      const height = Math.max(1, Math.round(canvas.clientHeight || rect?.height || 470));
      const dpr = Math.max(1, Math.min(2, Number(globalThis.devicePixelRatio) || 1));
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      return { width, height, dpr };
    }

    function line(a, b, color, alpha = 1, width = 1, dash = []) {
      context2d.save();
      context2d.globalAlpha = alpha;
      context2d.strokeStyle = color;
      context2d.lineWidth = width;
      context2d.setLineDash(dash);
      context2d.beginPath();
      context2d.moveTo(a.x, a.y);
      context2d.lineTo(b.x, b.y);
      context2d.stroke();
      context2d.restore();
    }

    function strokeDepthPath(points, color, alpha, lineWidth, dash = []) {
      if (!context2d || points.length < 2) return;
      /* Back-facing geometry is dimmed and dotted, giving the wireframe real
         depth without a WebGL dependency. */
      for (const frontFace of [false, true]) {
        context2d.save();
        context2d.strokeStyle = color;
        context2d.globalAlpha = clamp(alpha * (frontFace ? 0.92 : 0.2), 0, 1);
        context2d.lineWidth = frontFace ? lineWidth : Math.max(0.55, lineWidth * 0.8);
        context2d.setLineDash(frontFace ? dash : (dash.length ? dash : [3, 5]));
        context2d.beginPath();
        for (let index = 1; index < points.length; index += 1) {
          const previous = points[index - 1];
          const current = points[index];
          const segmentFront = ((previous.z + current.z) / 2) <= 0;
          if (segmentFront !== frontFace) continue;
          context2d.moveTo(previous.x, previous.y);
          context2d.lineTo(current.x, current.y);
        }
        context2d.stroke();
        context2d.restore();
      }
    }

    function ring(latitude, width, height, color, alpha) {
      const points = [];
      for (let step = 0; step <= 96; step += 1) {
        const longitude = (step / 96) * TAU;
        const radius = 2.06;
        points.push(project({ x: radius * Math.cos(latitude) * Math.cos(longitude), y: radius * Math.sin(latitude), z: radius * Math.cos(latitude) * Math.sin(longitude) }, width, height));
      }
      strokeDepthPath(points, color, alpha * state.formation, latitude === 0 ? 1.05 : 0.78);
    }

    function meridian(longitude, width, height, color, alpha) {
      const points = [];
      for (let step = 0; step <= 64; step += 1) {
        const latitude = -Math.PI / 2 + (step / 64) * Math.PI;
        const radius = 2.06;
        points.push(project({
          x: radius * Math.cos(latitude) * Math.cos(longitude),
          y: radius * Math.sin(latitude),
          z: radius * Math.cos(latitude) * Math.sin(longitude)
        }, width, height));
      }
      strokeDepthPath(points, color, alpha * state.formation, 0.78);
    }

    function orbitalRing(radius, tilt, phase, width, height, color, alpha) {
      const points = [];
      for (let step = 0; step <= 112; step += 1) {
        const angle = (step / 112) * TAU + phase;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        points.push(project({ x, y: z * Math.sin(tilt), z: z * Math.cos(tilt) }, width, height));
      }
      strokeDepthPath(points, color, alpha, 0.8, [4, 8]);
    }

    function drawStarfield(width, height, now) {
      if (!context2d) return;
      for (let index = 0; index < 76; index += 1) {
        let seed = Math.imul(index + 1, 0x45d9f3b);
        seed ^= seed >>> 16;
        seed = Math.imul(seed, 0x45d9f3b);
        seed ^= seed >>> 16;
        const first = (seed >>> 0) / 4294967296;
        const second = (Math.imul(index + 7, 0x27d4eb2d) >>> 0) / 4294967296;
        const twinkle = reduceMotion ? 0.72 : 0.48 + (Math.sin(now * 0.0007 + index * 1.73) + 1) * 0.18;
        const radius = index % 13 === 0 ? 1.35 : index % 4 === 0 ? 0.95 : 0.62;
        context2d.save();
        context2d.fillStyle = index % 9 === 0 ? "#9bdcff" : "#d7eaff";
        context2d.globalAlpha = twinkle * (index % 13 === 0 ? 0.62 : 0.32);
        context2d.beginPath(); context2d.arc(first * width, second * height, radius, 0, TAU); context2d.fill();
        context2d.restore();
      }
    }

    function drawOrbAtmosphere(width, height) {
      if (!context2d) return;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.42;
      const gradient = context2d.createRadialGradient(centerX - radius * 0.24, centerY - radius * 0.28, radius * 0.05, centerX, centerY, radius);
      gradient.addColorStop(0, "rgba(60, 142, 206, .18)");
      gradient.addColorStop(0.46, "rgba(20, 75, 123, .15)");
      gradient.addColorStop(0.82, "rgba(12, 39, 69, .12)");
      gradient.addColorStop(1, "rgba(7, 18, 34, .015)");
      context2d.save();
      context2d.fillStyle = gradient;
      context2d.shadowBlur = 34;
      context2d.shadowColor = "rgba(60, 164, 255, .18)";
      context2d.beginPath(); context2d.arc(centerX, centerY, radius, 0, TAU); context2d.fill();
      context2d.shadowBlur = 0;
      context2d.strokeStyle = "rgba(109, 195, 255, .13)";
      context2d.lineWidth = 1;
      context2d.beginPath(); context2d.arc(centerX, centerY, radius * 0.99, 0, TAU); context2d.stroke();
      context2d.restore();
    }

    /* Inner shell: a circle of radius `radius` in the model's own space, spun about
       the vertical axis by `spin` and tipped by `tilt`, then put through the shared
       camera. Kept separate from ring() because ring() is the model's latitude
       lattice and this is a structural element at Center Origin. */
    function shellRing(radius, spin, tilt, color, alpha, width, height) {
      const points = [];
      for (let step = 0; step <= 64; step += 1) {
        const angle = (step / 64) * TAU + spin;
        const x = radius * Math.cos(angle);
        const z0 = radius * Math.sin(angle);
        points.push(project({ x, y: -z0 * Math.sin(tilt), z: z0 * Math.cos(tilt) }, width, height));
      }
      strokePath(points, color, alpha, 0.9);
    }

    /* The phase loop: a figure eight wound through Center Origin, precessing with
       the same angle as the inner shell so one declared phase visibly shifts the
      whole origin assembly together. It carries no data. */
    function phaseLoop(spin, color, alpha, width, height) {
      const points = [];
      for (let step = 0; step <= 96; step += 1) {
        const t = (step / 96) * TAU;
        const reach = 0.78 * Math.cos(t);
        points.push(project({
          x: reach * Math.cos(t + spin),
          y: 0.34 * Math.sin(2 * t),
          z: reach * Math.sin(t + spin)
        }, width, height));
      }
      strokePath(points, color, alpha, 0.7, [3, 3]);
    }

    function strokePath(points, color, alpha, lineWidth, dash = []) {
      strokeDepthPath(points, color, alpha, lineWidth, dash);
    }

    function drawRoute(now, center) {
      const route = state.route;
      if (!route) return;
      const from = state.projected[route.from.order];
      const to = state.projected[route.to.order];
      if (!from || !to) return;
      const elapsed = now - route.startedAt;
      const progress = reduceMotion ? 1 : clamp(elapsed / (route.type === "resolution" ? 2200 : 1450), 0, 1);
      if (route.type === "lateral") {
        route.phase = progress < 1 ? "lateral" : "confirmed";
        const point = { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress };
        line(from, to, "#ffb45c", 0.72, 1.5, [5, 5]);
        context2d.save(); context2d.fillStyle = "#ffcf85"; context2d.shadowBlur = 17; context2d.shadowColor = "#ffb45c";
        context2d.beginPath(); context2d.arc(point.x, point.y, 4.4, 0, TAU); context2d.fill(); context2d.restore();
      } else {
        const inward = 0.43, resolve = 0.58;
        if (progress < inward) {
          route.phase = "inward";
          const p = progress / inward;
          const point = { x: from.x + (center.x - from.x) * p, y: from.y + (center.y - from.y) * p };
          line(from, center, "#6fd3ff", 0.85, 1.8);
          context2d.save(); context2d.fillStyle = "#e7fbff"; context2d.shadowBlur = 18; context2d.shadowColor = "#6fd3ff";
          context2d.beginPath(); context2d.arc(point.x, point.y, 4.6, 0, TAU); context2d.fill(); context2d.restore();
        } else if (progress < resolve) {
          route.phase = "resolve";
          line(from, center, "#6fd3ff", 0.85, 1.8);
          context2d.save(); context2d.fillStyle = "#ffd479"; context2d.shadowBlur = 28; context2d.shadowColor = "#ffd479";
          context2d.beginPath(); context2d.arc(center.x, center.y, 8 + Math.sin(now / 70) * 2, 0, TAU); context2d.fill(); context2d.restore();
        } else {
          route.phase = progress < 1 ? "outward" : "confirmed";
          const p = (progress - resolve) / (1 - resolve);
          const point = { x: center.x + (to.x - center.x) * p, y: center.y + (to.y - center.y) * p };
          line(from, center, "#6fd3ff", 0.55, 1.2);
          line(center, to, "#5ce6a8", 0.88, 1.8);
          context2d.save(); context2d.fillStyle = "#effff8"; context2d.shadowBlur = 18; context2d.shadowColor = "#5ce6a8";
          context2d.beginPath(); context2d.arc(point.x, point.y, 4.6, 0, TAU); context2d.fill(); context2d.restore();
        }
      }
      if (route.phase !== state.lastRoutePhase) {
        state.lastRoutePhase = route.phase;
        routeNote.textContent = friendlyRoute(route);
      }
      if (progress >= 1 && elapsed > 3500) {
        state.route = null;
        state.lastRoutePhase = "";
        routeNote.textContent = friendlyRoute(null);
      }
    }

    function snapshotFreshness(observation, wallNow) {
      const observedAt = numeric(observation && observation.at);
      if (observedAt === null) return 0;
      return Math.exp(-Math.max(0, wallNow - observedAt) / (30 * 60_000));
    }

    function pathDash(observation) {
      if (!observation || !observation.market || observation.status === "unavailable") return [1, 3];
      if (observation.status === "cached" || observation.status === "rehearsal" || observation.market.synthetic) return [4, 3];
      if (observation.status !== "bars" || observation.market.status !== "ready"
        || !observation.market.latestBar || observation.market.latestBar.confirmed !== true) return [2, 2];
      return [];
    }

    function updateFlowReadout(point) {
      if (!flowReadout) return;
      const observation = point && point.observation;
      const cue = flowPathForObservation(observation, point && point.directive);
      const subject = observation && observation.symbol || point && point.node && point.node.name || "No selected node";
      const activity = cue.moving
        ? `${cue.direction} · ${cue.rate.toFixed(2)} cycles/s${pathsToggle.checked ? "" : " · path hidden"}${reduceMotion && !state.autoRotate ? " · reduced-motion preview" : ""}`
        : cue.reason || "Paused · no confirmed flow data";
      const text = `${subject} · ${cue.label} · ${activity}`;
      if (flowReadout.textContent !== text) flowReadout.textContent = text;
      flowReadout.style.color = cue.color;
      flowReadout.dataset.flowState = cue.moving ? cue.state : "paused";
      flowReadout.title = cue.moving
        ? `Characters item cadence: ${cue.rate.toFixed(2)} visual cycles per second. This is not a volume-per-second measurement.`
        : `${cue.reason || "Flow is paused."} No unsupported or unconfirmed volume is animated.`;
    }

    function drawFlowRunner(point, now, wallNow, cue) {
      if (!cue.moving || !pathsToggle.checked) return;
      const travel = cue.lane === "inbound" ? 1 : -1;
      const identityPhase = stableIdentityPhase(point.node && (point.node.symbol || point.node.name));
      const phase = identityPhase + now / 1000 * (0.7 + cue.rate * 0.45) * travel;
      const orbit = 7 + point.scale * 2.4 + Math.min(8, cue.rate * 1.8);
      const tailPhase = phase - travel * 0.48;
      const x = point.x + Math.cos(phase) * orbit;
      const y = point.y + Math.sin(phase) * orbit * 0.56;
      const tailX = point.x + Math.cos(tailPhase) * orbit;
      const tailY = point.y + Math.sin(tailPhase) * orbit * 0.56;
      const freshness = snapshotFreshness(point.observation, wallNow);
      context2d.save();
      context2d.strokeStyle = cue.color;
      context2d.globalAlpha = clamp(0.46 + freshness * 0.46, 0.46, 0.92);
      context2d.lineWidth = 2.2;
      context2d.lineCap = "round";
      context2d.shadowBlur = 8;
      context2d.shadowColor = cue.color;
      context2d.beginPath(); context2d.moveTo(tailX, tailY); context2d.lineTo(x, y); context2d.stroke();
      context2d.globalAlpha = clamp(0.72 + freshness * 0.28, 0.72, 1);
      context2d.fillStyle = cue.color;
      context2d.shadowBlur = 11;
      context2d.beginPath(); context2d.arc(x, y, 3.1, 0, TAU); context2d.fill();
      context2d.translate(x, y);
      context2d.rotate(Math.atan2((y - tailY) * travel, (x - tailX) * travel));
      context2d.beginPath(); context2d.moveTo(5.2, 0); context2d.lineTo(-3.8, -3); context2d.lineTo(-3.8, 3); context2d.closePath(); context2d.fill();
      context2d.restore();
    }

    function drawActivity(point, now, wallNow, index) {
      const observation = point.observation;
      const directive = point.directive;
      if (!observation || !directive) return;
      const moodColor = MOOD_COLORS[directive.mood] || point.node.color;
      const freshness = snapshotFreshness(observation, wallNow);
      if (observation.market && directive.object && !directive.frozen) {
        const object = directive.object;
        const pulse = 1 + Math.sin(now / (1000 / Math.max(0.25, object.pulse || 0.25)) + index) * 0.12 * object.pulse;
        const radius = 6 + object.aperture * 7;
        context2d.save();
        context2d.strokeStyle = moodColor;
        context2d.globalAlpha = clamp((0.18 + object.pulse * 0.42) * freshness, 0.08, 0.72);
        context2d.lineWidth = 0.7 + object.sway * 1.1;
        context2d.beginPath();
        context2d.ellipse(point.x, point.y, radius * pulse, radius * (0.42 + object.aperture * 0.22), object.tilt + now * 0.00005 * object.sway, 0, TAU);
        context2d.stroke();
        context2d.restore();
      }
      const flow = flowPathForObservation(observation, directive);
      drawFlowRunner(point, now, wallNow, flow);
      const beat = state.beatAnimation;
      const beatAge = beat ? wallNow - beat.at : Infinity;
      if (pathsToggle.checked && observation.market && state.showDataBits && beat
        && beat.instruments.includes(observation.symbol) && beatAge >= 0 && beatAge < 1900) {
        const availableBits = dataBitsForMarket(observation.market).filter(bit => bit.state !== "unavailable" && bit.color !== DATA_COLORS.unknown);
        const identityPhase = stableIdentityPhase(point.node && (point.node.symbol || point.node.name));
        availableBits.forEach((bit, bitIndex) => {
          const delayedAge = beatAge - bitIndex * 130;
          if (delayedAge < 0) return;
          const fraction = clamp(delayedAge / 1900, 0, 1);
          const angle = identityPhase + bitIndex * TAU / Math.max(1, availableBits.length) + fraction * 0.9;
          const orbit = 8 + point.scale * 2 + fraction * 9;
          const x = point.x + Math.cos(angle) * orbit;
          const y = point.y + Math.sin(angle) * orbit * 0.58;
          context2d.save(); context2d.fillStyle = bit.color; context2d.shadowBlur = 9; context2d.shadowColor = bit.color;
          context2d.beginPath(); context2d.arc(x, y, 1.8, 0, TAU); context2d.fill(); context2d.restore();
        });
      }
    }

    function drawProviderHalo(point, radius, observation, wallNow) {
      if (!observation) return;
      const freshness = snapshotFreshness(observation, wallNow);
      const color = providerColor(observation);
      context2d.save();
      context2d.strokeStyle = color;
      context2d.globalAlpha = observation.market ? clamp(0.28 + freshness * 0.58, 0.28, 0.86) : 0.64;
      context2d.lineWidth = clamp(radius * 0.16, 1.15, 2.2);
      context2d.setLineDash(pathDash(observation));
      context2d.shadowBlur = 7;
      context2d.shadowColor = color;
      context2d.beginPath(); context2d.arc(point.x, point.y, radius + 4.2, 0, TAU); context2d.stroke();
      context2d.shadowBlur = 0;
      context2d.setLineDash([]);
      context2d.globalAlpha *= 0.28;
      context2d.lineWidth = 0.75;
      context2d.beginPath(); context2d.arc(point.x, point.y, radius + 7, 0, TAU); context2d.stroke();
      context2d.restore();
    }

    function drawOrbNode(point, radius, color, alpha, selected = false) {
      if (!context2d) return;
      const lightX = point.x - radius * 0.34;
      const lightY = point.y - radius * 0.38;
      const surface = context2d.createRadialGradient(lightX, lightY, Math.max(0.5, radius * 0.04), point.x, point.y, radius * 1.12);
      surface.addColorStop(0, "#ffffff");
      surface.addColorStop(0.12, color);
      surface.addColorStop(0.56, color);
      surface.addColorStop(1, "#07101c");
      context2d.save();
      context2d.globalAlpha = alpha;
      context2d.fillStyle = surface;
      context2d.shadowBlur = selected ? radius * 1.8 : radius * 0.78;
      context2d.shadowColor = color;
      context2d.beginPath(); context2d.arc(point.x, point.y, radius, 0, TAU); context2d.fill();
      context2d.shadowBlur = 0;
      context2d.strokeStyle = selected ? "rgba(255,255,255,.94)" : "rgba(210,239,255,.52)";
      context2d.globalAlpha = alpha * (selected ? 0.86 : 0.46);
      context2d.lineWidth = selected ? 1.15 : 0.7;
      context2d.beginPath(); context2d.arc(point.x, point.y, radius, 0, TAU); context2d.stroke();
      context2d.fillStyle = "#ffffff";
      context2d.globalAlpha = alpha * (selected ? 0.78 : 0.42);
      context2d.beginPath(); context2d.ellipse(lightX, lightY, radius * 0.18, radius * 0.12, -0.55, 0, TAU); context2d.fill();
      if (selected) {
        context2d.strokeStyle = color;
        context2d.globalAlpha = alpha * 0.65;
        context2d.lineWidth = 1;
        context2d.beginPath(); context2d.arc(point.x, point.y, radius + 4.5, 0, TAU); context2d.stroke();
      }
      context2d.restore();
    }

    function drawDataBits(point, radius, observation) {
      if (!state.showDataBits || !observation || !observation.market) return;
      const bits = dataBitsForMarket(observation.market);
      const orbit = radius + 8.5;
      bits.forEach((bit, bitIndex) => {
        const angle = -Math.PI / 2 + bitIndex * TAU / bits.length;
        const x = point.x + Math.cos(angle) * orbit;
        const y = point.y + Math.sin(angle) * orbit;
        context2d.save();
        context2d.fillStyle = bit.color;
        context2d.globalAlpha = bit.state === "unavailable" ? 0.5 : 0.98;
        context2d.strokeStyle = "#07101c";
        context2d.lineWidth = 1;
        context2d.shadowBlur = bit.state === "unavailable" ? 0 : 5;
        context2d.shadowColor = bit.color;
        context2d.beginPath(); context2d.arc(x, y, 2.45, 0, TAU); context2d.fill(); context2d.stroke();
        context2d.restore();
      });
    }

    /* ── Center Origin assembly ──────────────────────────────────────────
       The parts from the author's whiteboard, with no fractal layer: an inner
       shell inside the model, the declared PDH phase as a rotation shift of that
       assembly, and Center Origin drawn as the CPU the Human Key secures. Phase,
       gate, and UTS come from the local kernel snapshot (HOS.observe()) and the
       local UTS math only — never from a provider, never from a claim, and never
       used to authorize anything. An unread kernel is a dimmer ring and an
       "UNREAD" readout, not a defaulted phase. */
    function drawOriginAssembly(now, center, width, height) {
      const kernel = kernelSnapshot();
      const phase = kernel && kernel.phase ? String(kernel.phase) : null;
      const phaseShift = PHASE_SHIFT_RADIANS[phase] ?? null;
      const gate = legitimacyGate();
      const dt = state.lastFrame ? Math.min(80, now - state.lastFrame) : 16;
      if (!reduceMotion) state.innerAngle += dt * 0.00021;
      const spin = state.innerAngle + (phaseShift === null ? 0 : phaseShift);
      /* Two counter-rotating shells and the phase loop, brightened by the same
         α = 0.22 + 0.78·L(t) gate the rest of the system uses, so an unattested
         browser still sees the structure without the glow. */
      const shellFade = 0.4 + 0.6 * state.formation;
      shellRing(0.62, spin, 0, "#4a9eff", (0.2 + 0.5 * gate) * shellFade, width, height);
      shellRing(0.5, -spin * 0.8, Math.PI / 2, "#4a9eff", (0.14 + 0.42 * gate) * shellFade, width, height);
      phaseLoop(spin, "#ffd479", (0.12 + 0.4 * gate) * shellFade, width, height);
      return { phase, gate };
    }

    /* One refresh per wall-clock second keeps the origin strip off the hot path. */
    function updateOriginStatus(wallNow, assembly) {
      const second = Math.floor(wallNow / 1000);
      if (state.originStatusAt === second) return;
      state.originStatusAt = second;
      const kernel = kernelSnapshot();
      const attestation = kernel && kernel.attestation;
      const gateState = !attestation ? "unread"
        : attestation.status === "active" && attestation.fresh ? "attested"
        : attestation.status === "active" ? "expired" : "unattested";
      const gateText = { unread: "GATE UNREAD", attested: "GATE ATTESTED · FRESH",
        expired: "GATE ATTESTED · EXPIRED", unattested: "GATE UNATTESTED" }[gateState];
      const phaseText = assembly && assembly.phase ? `PDH ${assembly.phase}` : "PDH UNDECLARED";
      const uts = globalThis.HOSUTS;
      let utsText = "UTS UNAVAILABLE";
      try { if (uts && typeof uts.formatUDate === "function") utsText = `UTS ${uts.formatUDate(new Date(wallNow))}`; } catch { utsText = "UTS UNAVAILABLE"; }
      if (originStatus) {
        const dxyText = state.dxy && state.dxy.ok
          ? `${state.dxy.value.toFixed(3)} · AS OF ${new Date(state.dxy.asOf).toISOString().slice(0, 10)}`
          : `${String(state.dxy && state.dxy.status || "awaiting six aligned FX closes").toUpperCase()}`;
        const text = `ORIGIN · CPU — ${CENTER_ADDRESS} · DXY BENCHMARK ${dxyText} · FIXED CENTER · ${gateText} · ${phaseText} · ${utsText}`;
        if (originStatus.textContent !== text) originStatus.textContent = text;
      }
      if (gatePill) {
        const pillText = `GATE · ${gateState === "unread" ? "UNREAD" : gateState === "attested" ? "ATTESTED"
          : gateState === "expired" ? "EXPIRED" : "UNATTESTED"}`;
        if (gatePill.textContent !== pillText) gatePill.textContent = pillText;
        gatePill.dataset.gateState = gateState;
      }
      if (utsPill) {
        const pillText = utsText.startsWith("UTS ") ? utsText.slice(4) : "UNAVAILABLE";
        if (utsPill.textContent !== pillText) utsPill.textContent = pillText;
      }
    }

    /* ── Center Point beat beams ───────────────────────────────────────
       The cross-ticker story of Orb 2, drawn in tritium green: every fresh
       beat briefly connects the Center Point to the selected node and to
       each instrument that beat confirmed, then fades. Between beats only a
       faint baseline trace to the selected node remains — the beam is a
       beat-synced highlight, never a constant flash. It obeys the Data
       pathways toggle and carries no data: a beam is a local visual trace,
       not an OCM message, and it never authorizes anything. */
    function drawCenterBeams(wallNow, center) {
      if (!context2d || !pathsToggle.checked || !state.projected.length) return;
      const beat = state.beatAnimation;
      const beatAge = beat ? wallNow - beat.at : Infinity;
      const envelope = beatAge >= 0 && beatAge < TRITIUM_BEAT_WINDOW_MS
        ? ease(1 - beatAge / TRITIUM_BEAT_WINDOW_MS) : 0;
      const beatSymbols = new Set();
      if (beat && envelope > 0) beat.instruments.forEach(symbol => beatSymbols.add(symbol));
      state.projected.forEach(point => {
        const node = point.node;
        const chosen = node.order === state.selected;
        const inBeat = beatSymbols.has(node.symbol || node.name);
        if (!chosen && !inBeat) return;
        /* Selected node: always a faint baseline, brightening with the beat.
           Beat-confirmed tickers: visible only while the beat is fresh. */
        const strength = chosen ? 0.11 + envelope * 0.34 : envelope * 0.15;
        if (strength <= 0.02) return;
        line(center, point, TRITIUM_COLOR, clamp(strength, 0, 0.5), chosen ? 1.3 : 0.8);
      });
      /* One quiet pulse rides the selected beam outward from the Center
         Point while a beat is fresh; reduced motion keeps the static beam
         without the traveler. */
      if (envelope > 0 && !reduceMotion) {
        const selectedPoint = state.projected.find(point => point.node.order === state.selected);
        if (selectedPoint) {
          const travel = 1 - envelope;
          const x = center.x + (selectedPoint.x - center.x) * travel;
          const y = center.y + (selectedPoint.y - center.y) * travel;
          context2d.save();
          context2d.fillStyle = "#d9ffe6";
          context2d.globalAlpha = clamp(0.22 + envelope * 0.48, 0, 0.7);
          context2d.shadowBlur = 9;
          context2d.shadowColor = TRITIUM_COLOR;
          context2d.beginPath(); context2d.arc(x, y, 2.4, 0, TAU); context2d.fill();
          context2d.restore();
        }
      }
    }

  function drawCanvas(now) {
      if (!context2d || state.destroyed || !state.visible) return;
      const wallNow = Date.now();
      const { width, height, dpr } = canvasBounds();
      context2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      context2d.clearRect(0, 0, width, height);
      const background = context2d.createRadialGradient(width * 0.48, height * 0.42, 2, width * 0.5, height * 0.5, Math.max(width, height) * 0.74);
      background.addColorStop(0, "#10213a");
      background.addColorStop(0.5, "#0a1424");
      background.addColorStop(1, "#050a12");
      context2d.fillStyle = background;
      context2d.fillRect(0, 0, width, height);
      drawStarfield(width, height, now);
      drawOrbAtmosphere(width, height);
      if (state.autoRotate && !state.dragging) {
        const dt = state.lastFrame ? Math.min(80, now - state.lastFrame) : 16;
        state.yaw += dt * 0.00013;
      }
      state.lastFrame = now;
      const center = project({ x: 0, y: 0, z: 0 }, width, height);
      /* Center Origin assembly — the inner shell and the declared phase's rotation,
         drawn under the lattice, plus the origin strip (gate · phase · UTS). */
      const originAssembly = drawOriginAssembly(now, center, width, height);
      updateOriginStatus(wallNow, originAssembly);
      orbitalRing(2.32, 0.34, now * 0.000025, width, height, "#3678a8", 0.22);
      orbitalRing(2.4, 1.04, -now * 0.000018, width, height, "#6554a4", 0.14);
      orbitalRing(2.5, 0.78, now * 0.000012, width, height, "#2c8d91", 0.12);
      [-0.72, -0.48, -0.24, 0, 0.24, 0.48, 0.72].forEach(latitude =>
        ring(latitude, width, height, latitude === 0 ? "#70d8ff" : "#6d8eae", latitude === 0 ? 0.44 : 0.24));
      for (let index = 0; index < 12; index += 1) {
        meridian((index / 12) * TAU, width, height, index % 3 === 0 ? "#75d5fa" : "#5d7999", index % 3 === 0 ? 0.24 : 0.16);
      }
      state.projected = nodes.map(node => {
        const observation = latestForNode(node);
        const directive = displayMotion(observation, now);
        return { ...project(modelPoint(node, now, directive, observation), width, height), node, observation, directive };
      });
      updateFlowReadout(state.projected[state.selected] || null);
      state.projected.forEach((point, index) => drawActivity(point, now, wallNow, index));
      drawCenterBeams(wallNow, center);
      drawRoute(now, center);
      const ordered = [...state.projected].sort((a, b) => b.z - a.z);
      ordered.forEach(point => {
        const node = point.node;
        const observation = point.observation;
        const directive = point.directive;
        const chosen = node.order === state.selected;
        const hovered = node.order === state.hover;
        const fresh = observation ? snapshotFreshness(observation, wallNow) : 0;
        const color = observation && observation.market && directive
          ? MOOD_COLORS[directive.mood] || node.color : node.color;
        const pulse = directive && directive.object ? directive.object.pulse : 0;
        const density = clamp(Math.min(width, height) / 620, 0.82, 1.52);
        const radius = clamp((4.15 + point.scale * 2.35 + (chosen ? 2.1 : 0) + pulse * 1.5) * density, 4, 14);
        const alpha = observation && observation.market ? clamp(0.48 + fresh * 0.46, 0.48, 0.96) : clamp(0.4 + (1 - point.z / 5) * 0.38, 0.36, 1);
        drawProviderHalo(point, radius, observation, wallNow);
        drawOrbNode(point, radius, color, alpha, chosen || hovered);
        drawDataBits(point, radius, observation);
        if (state.labels || chosen || hovered) {
          context2d.save();
          context2d.globalAlpha = chosen || hovered ? 1 : 0.72;
          context2d.fillStyle = "#edf6ff";
          context2d.font = `${chosen ? 11 : 9}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          context2d.textAlign = point.x > width * 0.52 ? "left" : "right";
          const offset = point.x > width * 0.52 ? radius + 5 : -radius - 5;
          context2d.fillText(node.symbol || node.name, point.x + offset, point.y - radius - 4);
          context2d.restore();
        }
      });
      context2d.save();
      /* Center Origin is the CPU: the gate decides whether it burns gold or waits in
         cyan, and the declared phase is named under it. A pending beat pulses the
         same dot — there is no rendered frame to swap in, by design. */
      const originColor = state.pending ? "#6fd3ff" : "#ffd479";
      drawOrbNode(center, state.pending ? 10 : 8, originColor, 1, true);
      context2d.shadowBlur = 0;
      context2d.strokeStyle = "rgba(255,212,121,.78)";
      context2d.lineWidth = 1;
      context2d.beginPath(); context2d.arc(center.x, center.y, 16, 0, TAU); context2d.stroke();
      context2d.fillStyle = "#fff2c6";
      context2d.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
      context2d.textAlign = "center";
      const dxyLabel = state.dxy && state.dxy.ok ? `DXY · ${state.dxy.value.toFixed(3)}` : "DXY · AWAITING ALIGNED CLOSES";
      context2d.fillText(dxyLabel, center.x, center.y + 29);
      context2d.fillStyle = "#a9c3df";
      context2d.font = "8px ui-monospace, SFMono-Regular, Menlo, monospace";
      context2d.fillText(originAssembly.phase ? `LOCAL CPU · ${originAssembly.phase}` : "LOCAL CPU · CENTER ORIGIN", center.x, center.y + 41);
      context2d.restore();
    }

    function scheduleRender() {
      if (state.destroyed || !state.visible || state.animation || !context2d || typeof globalThis.requestAnimationFrame !== "function") return;
      state.animation = globalThis.requestAnimationFrame(frame);
    }

    function frame(now) {
      state.animation = 0;
      if (state.destroyed || !state.visible) return;
      if (canvas && (canvas.offsetParent !== null || canvas.clientWidth > 0)) {
        drawCanvas(now || (globalThis.performance && typeof globalThis.performance.now === "function" ? globalThis.performance.now() : Date.now()));
      }
      if (!reduceMotion || state.autoRotate) scheduleRender();
    }

    function pick(event) {
      const rect = typeof canvas.getBoundingClientRect === "function" ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
      const x = Number(event.clientX) - (rect.left || 0);
      const y = Number(event.clientY) - (rect.top || 0);
      let winner = -1;
      let distance = Infinity;
      for (const point of state.projected) {
        const d = Math.hypot(point.x - x, point.y - y);
        if (d < distance && d < 18) { winner = point.node.order; distance = d; }
      }
      return winner;
    }

    function selectNode(index) {
      state.selected = clamp(Math.floor(Number(index) || 0), 0, nodes.length - 1);
      drawInspector();
      scheduleRender();
    }

    function setRoute(type) {
      const from = nodes[state.selected] || nodes[0];
      const offset = type === "resolution" ? 7 : 11;
      const to = nodes[(state.selected + offset) % nodes.length];
      const now = globalThis.performance && typeof globalThis.performance.now === "function" ? globalThis.performance.now() : Date.now();
      state.route = { type, from, to, startedAt: now, phase: type === "resolution" ? "inward" : "lateral" };
      state.lastRoutePhase = "";
      drawInspector();
      scheduleRender();
    }

    const onPointerDown = event => {
      state.dragging = true;
      state.downX = state.lastX = Number(event.clientX) || 0;
      state.downY = state.lastY = Number(event.clientY) || 0;
      try { canvas.setPointerCapture(event.pointerId); } catch { /* optional */ }
    };
    const onPointerMove = event => {
      if (state.dragging) {
        state.yaw += ((Number(event.clientX) || 0) - state.lastX) * 0.007;
        state.pitch = clamp(state.pitch + ((Number(event.clientY) || 0) - state.lastY) * 0.006, -1.1, 1.1);
        state.lastX = Number(event.clientX) || 0;
        state.lastY = Number(event.clientY) || 0;
      } else {
        state.hover = pick(event);
        canvas.style.cursor = state.hover >= 0 ? "pointer" : "grab";
      }
    };
    const onPointerUp = event => {
      const moved = Math.hypot((Number(event.clientX) || 0) - state.downX, (Number(event.clientY) || 0) - state.downY);
      if (moved < 6) {
        const index = pick(event);
        if (index >= 0) selectNode(index);
      }
      state.dragging = false;
    };
    const onWheel = event => {
      event.preventDefault();
      state.zoom = clamp(state.zoom * (event.deltaY > 0 ? 0.92 : 1.08), 0.65, 1.75);
    };
    const onKeyDown = event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setRoute("resolution"); }
      if (event.key === "ArrowRight") { event.preventDefault(); selectNode((state.selected + 1) % nodes.length); }
      if (event.key === "ArrowLeft") { event.preventDefault(); selectNode((state.selected - 1 + nodes.length) % nodes.length); }
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", () => { if (!state.dragging) state.hover = -1; });
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("keydown", onKeyDown);
    nodeSelect.addEventListener("change", () => selectNode(nodes.findIndex(node => node.id === nodeSelect.value)));
    formation.addEventListener("input", () => {
      state.formation = clamp(Number(formation.value) / 100, 0, 1);
      formationLabel.textContent = state.formation < 0.04 ? "DISC" : state.formation > 0.96 ? "SPHERE" : `${Math.round(state.formation * 100)}%`;
      scheduleRender();
    });
    rotateToggle.addEventListener("change", () => { state.autoRotate = !!rotateToggle.checked; scheduleRender(); });
    labelsToggle.addEventListener("change", () => { state.labels = !!labelsToggle.checked; scheduleRender(); });
    pathsToggle.addEventListener("change", () => scheduleRender());
    dataBitsToggle.addEventListener("change", () => {
      state.showDataBits = !!dataBitsToggle.checked;
      persistLocal();
      scheduleRender();
    });
    routeButton.addEventListener("click", () => setRoute("resolution"));
    lateralButton.addEventListener("click", () => setRoute("lateral"));
    resetButton.addEventListener("click", () => {
      state.yaw = -0.68; state.pitch = 0.32; state.zoom = 1; state.formation = 1;
      formation.value = "100"; formationLabel.textContent = "SPHERE";
      state.route = null; state.lastRoutePhase = "";
      drawInspector(); scheduleRender();
      if (onClearBeats) onClearBeats();
    });

    /* Rebuild ticker-orb geometry in place when no app-level remount is requested. */
    function rebuildTickerNodes(nextTimeframe) {
      if (!tickerMode) return;
      const rebuilt = buildNodes(options.tickers, nextTimeframe === "1d" ? "1d" : "1h");
      if (!rebuilt.length) return;
      timeframe = nextTimeframe === "1d" ? "1d" : "1h";
      nodes = rebuilt;
      nodeIndexByName = new Map(nodes.map((node, index) => [node.name, index]));
      state.selected = 0;
      state.route = null;
      state.lastRoutePhase = "";
      if (timeframeSelect) timeframeSelect.value = timeframe;
      syncNodeOptions();
      drawInspector();
      scheduleRender();
    }

    if (globalThis.ResizeObserver) {
      resizeObserver = new globalThis.ResizeObserver(() => scheduleRender());
      resizeObserver.observe(root);
    }

    function activeObservationForNode(node) { return latestForNode(node); }

    function drawCanvasWhenReady() {
      if (!context2d) {
        canvasStatus.textContent = "CANVAS UNAVAILABLE · BEAT LOG / INSPECTOR STILL ACTIVE";
        routeButton.disabled = true;
        lateralButton.disabled = true;
      }
      drawInspector();
      scheduleRender();
    }

    function restoreHistory() {
      rebuildObservations();
      syncLastBeat();
      rebuildLedgers();
      draw();
    }

    function formatServerHistoryNote() {
      if (state.persistence === "saved") return state.persistenceNote;
      return state.persistenceNote;
    }

    async function initialize() {
      try {
        state.loadingCatalog = true;
        syncFormControls();
        const result = await entriesForDisc(state.discId);
        state.ranking = result.ranking;
        buildStage(result.entries, state.discId);
        state.loadingCatalog = false;
        state.routeSteps = { provider: "READY", worker: "READY", ledger: "WAITING", model: "READY" };
        drawCanvasWhenReady();
        loadServerHistory();
        await loadFieldSnapshot({ reason: "open" });
        schedule();
      } catch (error) {
        state.loadingCatalog = false;
        state.message = { kind: "refusal", text: error && error.message || "Orb 2 could not load the reviewed Disc catalog." };
        state.routeSteps = { provider: "WAITING", worker: "WAITING", ledger: "NOT QUERIED", model: "CATALOG ERROR" };
        draw();
      }
    }

    discSelect.addEventListener("change", () => switchDisc(discSelect.value));
    intervalSelect.addEventListener("change", () => switchInterval(intervalSelect.value));
    focusSelect.addEventListener("change", () => {
      state.focus = focusSelect.value;
      const berth = stage && stage.berths.find(entry => entry.symbol === state.focus);
      if (berth && berth.npc) state.selected = nodeIndexByName.get(berth.npc.name) ?? state.selected;
      draw();
    });
    autoButton.addEventListener("click", toggleAuto);
    beatButton.addEventListener("click", () => beatNow("manual"));
    fieldDial?.addEventListener("click", event => {
      const button = event.target && event.target.closest ? event.target.closest("[data-field-type]") : null;
      if (!button) return;
      const next = button.getAttribute("data-field-type") || null;
      state.beatType = next && FIELD_BEAT_TYPES.includes(next) ? next : null;
      state.route = null; state.lastRoutePhase = "";
      persistLocal();
      draw();
      loadFieldSnapshot({ reason: "dial" });
    });
    fieldFocus?.addEventListener("click", event => {
      const clear = event.target && event.target.closest ? event.target.closest("[data-focus-clear]") : null;
      const chip = event.target && event.target.closest ? event.target.closest("[data-focus-symbol]") : null;
      if (!clear && !chip) return;
      if (clear) state.focusSymbols = [];
      else {
        const symbol = chip.getAttribute("data-focus-symbol").toUpperCase();
        const set = new Set(state.focusSymbols);
        if (set.has(symbol)) set.delete(symbol); else set.add(symbol);
        state.focusSymbols = [...set].slice(0, 12);
      }
      persistLocal();
      if (state.entries.length) buildStage(state.entries, state.discId);
      draw();
      loadFieldSnapshot({ reason: "focus" });
    });
    warmButton?.addEventListener("click", () => warmField());
    randomTickerButton?.addEventListener("click", () => addRandomUsTicker());
    refreshFocusButton?.addEventListener("click", () => refreshFocused(fieldInterval(), "baseline"));
    refreshIntradayButton?.addEventListener("click", () => refreshFocused("15m", "intraday"));
    ignitionRestartButton?.addEventListener("click", restartIgnition);

    const documentRef = host.ownerDocument || globalThis.document;
    const onFullscreenChange = () => {
      fallbackFullscreen = false;
      drawStatus();
      scheduleRender();
    };
    /* The page never pauses a beat: it has none to pause. Hiding the tab only
       stops this view from re-reading; the Worker's cron schedule continues. */
    const onVisibilityChange = () => {
      if (!documentRef) return;
      if (!documentRef.hidden && state.visible) {
        schedule();
        scheduleRender();
        loadFieldSnapshot({ reason: "visibility" });
      }
    };
    async function toggleFullscreen() {
      try {
        if (documentRef && documentRef.fullscreenElement === root && documentRef.exitFullscreen) {
          await documentRef.exitFullscreen();
          return;
        }
        if (root.requestFullscreen) {
          await root.requestFullscreen();
          return;
        }
      } catch { /* browsers can reject fullscreen when embedded; use the local fallback */ }
      fallbackFullscreen = !fallbackFullscreen;
      root.classList.toggle("gi-orb2-fullscreen", fallbackFullscreen);
      drawStatus();
      scheduleRender();
    }
    fullscreenButton.addEventListener("click", toggleFullscreen);
    if (documentRef) {
      documentRef.addEventListener("fullscreenchange", onFullscreenChange);
      documentRef.addEventListener("visibilitychange", onVisibilityChange);
    }

    // A one-second text-only clock keeps the read cadence and the newest stored beat visible.
    countdownTimer = setInterval(() => {
      if (!state.destroyed && state.visible) drawStatus();
    }, 1000);

    function clearBeatTimerForDestroy() { clearBeatTimer(); }
    function setVisible(visible) {
      state.visible = !!visible;
      if (state.visible) {
        state.lastFrame = 0;
        scheduleRender();
        schedule();
      } else {
        clearBeatTimer();
        if (state.animation && typeof globalThis.cancelAnimationFrame === "function") {
          globalThis.cancelAnimationFrame(state.animation);
          state.animation = 0;
        }
      }
    }
    function destroy() {
      state.destroyed = true;
      if (countdownTimer) clearInterval(countdownTimer);
      clearBeatTimerForDestroy();
      if (state.animation && typeof globalThis.cancelAnimationFrame === "function") globalThis.cancelAnimationFrame(state.animation);
      state.animation = 0;
      if (resizeObserver) resizeObserver.disconnect();
      ownerDocument?.removeEventListener("harshalos:characters-beats:status", beatStatusHandler);
      if (documentRef) {
        documentRef.removeEventListener("fullscreenchange", onFullscreenChange);
        documentRef.removeEventListener("visibilitychange", onVisibilityChange);
      }
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("keydown", onKeyDown);
      if (fallbackFullscreen) root.classList.remove("gi-orb2-fullscreen");
    }

    // Initial recovered data is visible before any network request begins.
    state.events = savedLocalEvents.map(cleanRestoredEvent).filter(Boolean);
    restoreHistory();
    syncFormControls();
    draw();
    initialize();

    return Object.freeze({
      schema: SCHEMA,
      get nodes() { return nodes; },
      state,
      selectNode,
      beatNow,
      refreshHistory: loadServerHistory,
      setVisible,
      destroy
    });
  }

  window.GoodIntelligenceOrb2 = Object.freeze({
    SCHEMA, BEAT_SCHEMA, CENTER_ADDRESS, PALETTE, MOOD_COLORS, PROVIDER_COLORS, DATA_COLORS, TRITIUM_COLOR,
    FIELD_ROUTE, FIELD_POLL_MS, FIELD_BEAT_TYPES, MASSIVE_REQUESTS_PER_MINUTE,
    PHASE_SHIFT_RADIANS,
    fibonacciBandMetrics, marketDataPlacement, dataBitsForMarket, flowPathForObservation, buildNodes, mount, getSavedBeatSessionId
  });
})();
