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
   (SAVED_BEAT_SESSION_KEY) shared with the Characters app.

   The Orb's fractal frame processing — the shared OrbFilm surface film and the
   Demo.flame IFS core — is available here through this model's own camera. It is
   display-only: it adds no request, sends no message, and encodes no market meaning.
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
  /* The Orb's fractal frame sources, resolved lazily so load order or their
     absence can never break this model — absent ⇒ wire core only. */
  const orbFilmApi = () => globalThis.OrbFilm || null;
  let sharedFlamePlayer = null;
  const flameCore = () => {
    try {
      const api = globalThis.FractalFlame;
      if (!api || typeof api.shared !== "function") return null;
      if (!sharedFlamePlayer) sharedFlamePlayer = api.shared("assets/Demo.flame", { w: 160, h: 160 });
      return sharedFlamePlayer;
    } catch { return null; }
  };
  /* The Orb's outer macro-flame (OuterOrb.flame, 600 frames). It never draws
     pixels: its harmonics govern the counter-rotating depth shells and the
     helix rungs' breath, exactly as The Orb's outer system does. Resolving it
     lazily starts the shared bake once, so The Orb, the Fractal Flame app,
     and Orb 2 all reuse one player. */
  let sharedOuterFlamePlayer = null;
  const outerFlamePlayer = () => {
    try {
      const api = globalThis.FractalFlame;
      if (!api || typeof api.shared !== "function") return null;
      if (!sharedOuterFlamePlayer) {
        sharedOuterFlamePlayer = api.shared("assets/OuterOrb.flame", { w: 160, h: 160 });
        if (sharedOuterFlamePlayer && !sharedOuterFlamePlayer.ready && !sharedOuterFlamePlayer.baking
          && typeof sharedOuterFlamePlayer.start === "function") sharedOuterFlamePlayer.start();
      }
      return sharedOuterFlamePlayer;
    } catch { return null; }
  };
  const legitimacyGate = () => {
    try {
      const hos = globalThis.HOS;
      if (hos && typeof hos.legitimacy === "function") return clamp(hos.legitimacy(), 0, 1);
    } catch { /* display-only fallback below */ }
    return 0.5;
  };
  const TAU = Math.PI * 2;
  const SPHERE_RADIUS = 2.06;
  const TICKER_ORB_FIELD_RADIUS = SPHERE_RADIUS * 0.62;
  const TICKER_ORB_PAIR_OFFSET = 0.2;
  const TICKER_ORB_GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
  const MODEL_VIEW_SCALE = 0.215;
  const CAMERA_DISTANCE = 18;
  const HELIX_TURNS = 2.5;
  const HELIX_LAT_MAX = Math.PI / 2 - 0.08;
  const HELIX_BASE_LON = -Math.PI / 2;
  const CENTER_ADDRESS = "0•000•000•0000";
  const PROVIDER_COOLDOWN_MS = 60_000;
  const MASSIVE_BEAT_MS = 60_000;
  const ALPHA_BEAT_MS = 60 * 60_000;
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

  /* Each ticker receives an individual spheroid; supplied volatility widens
     the local orb only within a small, bounded visual range. */
  function tickerOrbWorldRadius(berth) {
    const volatility = berth && berth.metrics ? berth.metrics.volatility : null;
    return 0.19 + (volatility === null ? 0 : clamp(volatility, 0, 1) * 0.045);
  }

  /** Double-helix placement metrics — computed only from supplied packet fields.
      p is the close's position inside the supplied Fibonacci band range
      [lower1000, upper1000] (0 at the lower band, 1 at the upper band, 0.5 at
      the basis); volatility is the supplied band width over the basis; potential
      energy is the normalized stretch from the band midline. Missing fields stay
      missing — a held node rests at the basis ring and is labeled held. */
  function helixMetricsForMarket(market) {
    if (!isRecord(market)) return { held: true, p: null, volatility: null, volatilityPct: null, potential: null, breakSide: null };
    const close = numeric(market.latestBar && market.latestBar.close);
    const bands = isRecord(market.bands) ? market.bands : null;
    const lower = bands ? numeric(bands.lower1000) : null;
    const upper = bands ? numeric(bands.upper1000) : null;
    const basis = numeric(market.basis);
    if (close === null || lower === null || upper === null || !finite(lower) || !finite(upper) || upper <= lower) {
      return { held: true, p: null, volatility: null, volatilityPct: null, potential: null, breakSide: null };
    }
    const breakSide = market.bandSignals && market.bandSignals.upperBreak ? "upper"
      : market.bandSignals && market.bandSignals.lowerBreak ? "lower" : null;
    const p = clamp((close - lower) / (upper - lower), -0.06, 1.06);
    const width = upper - lower;
    const volatilityPct = basis !== null && basis > 0 ? (width / basis) * 100 : null;
    const volatility = volatilityPct !== null ? clamp(volatilityPct / 12, 0, 1) : null;
    const potential = clamp(Math.abs(p - 0.5) * 2, 0, 1);
    return { held: false, p, volatility, volatilityPct, potential, breakSide };
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
      direction: moving ? lane === "inbound" ? "Center → node" : "node → Center" : "stationary"
    };
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
    const entries = (Array.isArray(tickers) ? tickers : [])
      .filter(item => item && /^[A-Z0-9.-]{1,16}$/.test(String(item.symbol || "").toUpperCase()))
      .map(item => ({
        symbol: String(item.symbol).toUpperCase(),
        name: String(item.name || item.symbol).slice(0, 96),
        sector: String(item.sector || "Market").slice(0, 64)
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
    if (!Beat || !Cast || !DiscCatalog || !MarketContext) {
      host.innerHTML = `<div class="gi-empty error"><span class="gi-empty-mark">!</span><strong>Orb 2 beat modules unavailable</strong><p>CharactersBeat, CharactersCast, CharactersDiscCatalog, and GoodIntelligenceMarketContext must load before Orb 2.</p></div>`;
      return Object.freeze({ schema: SCHEMA, nodes, destroy() {}, setVisible() {} });
    }

    const appEntry = (globalThis.APPS || []).find(app => app && app.id === "good-intelligence");
    const watchlist = Array.isArray(options.watchlist) ? options.watchlist
      : tickerMode ? options.tickers
        : appEntry && Array.isArray(appEntry.tickerbotWatchlist) ? appEntry.tickerbotWatchlist : [];
    /* Double-helix series: two reviewed ticker sets compared strand against
       strand. Defaults split the reviewed watchlist in watchlist order; the
       toolbar inputs let a reviewer reshape both sets, and unknown symbols are
       refused rather than invented. */
    const reviewedSymbolSet = new Set(nodes.map(node => node.symbol).filter(Boolean));
    const defaultSeriesA = nodes.filter((_, index) => index % 2 === 0).map(node => node.symbol);
    const defaultSeriesB = nodes.filter((_, index) => index % 2 === 1).map(node => node.symbol);
    const parseSeriesInput = value => String(value || "")
      .split(/[\s,;]+/).map(part => part.trim().toUpperCase())
      .filter(part => part.length > 0);
    const seriesFromValue = (value, fallback) => {
      const raw = Array.isArray(value) ? value.map(symbol => String(symbol).toUpperCase()) : parseSeriesInput(value);
      const valid = [...new Set(raw.filter(symbol => reviewedSymbolSet.has(symbol)))];
      return valid.length ? valid : fallback;
    };
    const helixBerths = new Map();
    const helixState = { ranked: null, counts: { a: 0, b: 0 }, rungs: 0, held: 0 };

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
    const initialDisc = isRecord(preferences) && discIds.has(preferences.discId) ? preferences.discId : "stocks";
    const initialModes = DiscCatalog.disc(initialDisc)?.intervalModes || ["1d"];
    const initialInterval = isRecord(preferences) && initialModes.includes(preferences.interval) ? preferences.interval : "1d";
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
    const validCadence = value => Beat.CADENCES.includes(Number(value)) ? Number(value) : Beat.DEFAULTS.cadenceMinutes;
    const validBudget = value => Math.max(100, Math.min(Beat.DEFAULTS.monthlyBudget, Math.round(Number(value) || Beat.DEFAULTS.monthlyBudget)));

    const state = {
      discId: initialDisc,
      interval: initialInterval,
      /* Synthetic/demo mode is disabled: this view is live-only. A stale local
         preference cannot resurrect the retired rehearsal source. */
      source: "live",
      auto: preferences && typeof preferences.auto === "boolean" ? preferences.auto : true,
      cadence: validCadence(preferences && preferences.cadence),
      budget: validBudget(preferences && preferences.budget),
      stretch: Boolean(preferences && preferences.stretch),
      tierMode: Boolean(preferences && preferences.tierMode),
      tierSweepHours: Beat.TIER_SWEEP_HOURS.includes(Number(preferences && preferences.tierSweepHours))
        ? Number(preferences.tierSweepHours) : 24,
      selected: 0,
      focus: "",
      visible: true,
      pending: false,
      destroyed: false,
      loadingCatalog: false,
      cooldownUntil: 0,
      yaw: -0.68,
      pitch: 0.32,
      zoom: 1,
      formation: 1,
      autoRotate: !Boolean(globalThis.matchMedia && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches),
      labels: false,
      showDataBits: preferences && typeof preferences.showDataBits === "boolean" ? preferences.showDataBits : true,
      showFractal: preferences && typeof preferences.showFractal === "boolean" ? preferences.showFractal : true,
      seriesMode: tickerMode && preferences && preferences.seriesMode === "single" ? "single" : "dual",
      seriesA: tickerMode ? seriesFromValue(preferences && preferences.seriesA, defaultSeriesA) : [],
      seriesB: tickerMode ? seriesFromValue(preferences && preferences.seriesB, defaultSeriesB) : [],
      helix: { glide: new Map(), lastT: 0 },
      innerAngle: 0,
      outerAngle1: 0,
      outerAngle2: 0,
      coreTime: 0,
      filmTime: 0,
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
      routeSteps: { provider: "READY", worker: "READY", ledger: "WAITING", model: "READY" },
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
      ["#6fd3ff", "inward"], ["#ffd479", "center resolve"], ["#5ce6a8", "outward"], ["#ffb45c", "lateral"]
    ].map(([color, label]) => swatch(color, label)).join("");
    const dataLegend = [
      `<div><strong>PRICE Δ</strong>${swatch(DATA_COLORS.priceUp, "positive")}${swatch(DATA_COLORS.priceDown, "negative")}${swatch(DATA_COLORS.priceFlat, "flat")}${swatch(DATA_COLORS.unknown, "not supplied")}</div>`,
      `<div><strong>VFI vs signal</strong>${swatch(DATA_COLORS.flowAbove, "above")}${swatch(DATA_COLORS.flowBelow, "below")}${swatch(DATA_COLORS.flowEqual, "equal")}${swatch(DATA_COLORS.unknown, "unavailable")}</div>`,
      `<div><strong>Close vs band basis</strong>${swatch(DATA_COLORS.basisAbove, "above")}${swatch(DATA_COLORS.basisBelow, "below")}${swatch(DATA_COLORS.basisEqual, "equal")}${swatch(DATA_COLORS.unknown, "unavailable")}</div>`,
      `<div><strong>WaveTrend zone</strong>${swatch(DATA_COLORS.waveOversold, "oversold")}${swatch(DATA_COLORS.waveNeutral, "neutral")}${swatch(DATA_COLORS.waveOverbought, "overbought")}${swatch(DATA_COLORS.unknown, "unavailable")}</div>`,
      `<div><strong>Bar / data shape</strong>${swatch(DATA_COLORS.packetConfirmed, "confirmed OHLCV")}${swatch(DATA_COLORS.packetUnconfirmed, "unconfirmed")}${swatch(DATA_COLORS.packetPriceOnly, "OHLC only")}${swatch(DATA_COLORS.packetValueOnly, "value only")}${swatch(DATA_COLORS.unknown, "not supplied")}</div>`
    ].join("");
    const colorKey = `
      <p class="gi-orb2-sr-only" id="gi-orb2-color-description">Color encoding: orb cores use Characters beat moods; node halos and communication paths use provider identity; volume-flow runners are green when supplied VFI is above its signal and travel from center to node, red when below and travel node to center. They move only with confirmed OHLCV, supplied volume and VFI, and an available Characters cadence. Their cycles per second are a visual rate, not measured volume. Five satellite data bits encode price change, VFI compared with its signal, close versus Fibonacci band basis, WaveTrend zone, and bar/data shape with confirmation. Grey means unavailable, not zero. Market context is not claim assurance or authorization.</p>
      <details class="gi-orb2-color-key" data-gi-orb2-color-key>
        <summary><strong>COLOR KEY</strong><span>Characters mood · provider path · VFI flow cue · five market data bits</span></summary>
        <div class="gi-orb2-color-key-body">
          <section><h4>CORE ORB · CHARACTERS BEAT MOOD</h4><div class="gi-orb2-color-swatches">${moodLegend}</div></section>
          <section><h4>HALO + COMMUNICATION PATH · PROVIDER</h4><div class="gi-orb2-color-swatches">${providerLegend}</div><h4>VOLUME-FLOW RUNNER · VFI VS SIGNAL</h4><div class="gi-orb2-color-swatches">${flowLegend}</div><p class="gi-orb2-color-key-note">Green flows inward for VFI above its signal; red flows outward for VFI below. The runner overlays—but does not recolor—the provider path. Its visual cadence is in cycles per second, not volume per second. It pauses if required confirmed data is unavailable.</p><h4>LOCAL OCM TRACE · ROUTE PHASE</h4><div class="gi-orb2-color-swatches">${routeLegend}</div><p class="gi-orb2-color-key-note">These route colors are local animation only; no OCM message is sent.</p></section>
          <section><h4>SATELLITE BITS · OBSERVED MARKET CONTEXT</h4><div class="gi-orb2-data-key">${dataLegend}</div></section>
          <p class="gi-orb2-color-key-note">A halo fades with time since the saved beat snapshot. Solid paths mean a complete confirmed observation; dashed paths mark cached, synthetic, partial, or unconfirmed data; dotted paths mark a held / unavailable result. Grey bits mean that field was not supplied—not zero.</p>
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
          <div>
            <p class="gi-eyebrow">ORB 2 · GOOD INTELLIGENCE / CHARACTERS BEAT</p>
            <h3>Orb Communicator Model</h3>
            <p>A live, full-screen-capable 3D view of Characters' reviewed Discs and beat motion. Provider observations route through the same-origin Worker; all paths on this canvas are local visual traces. For tickers, the shaded sphere carries two 2.5-turn guide strands; each ticker maps its own Fibonacci Bollinger Band position across the full vertical shell—lower at the south pole, basis at the equator, upper at the north pole.</p>
          </div>
          <div class="gi-orb2-actions">
            <button class="gi-button gi-button-primary" type="button" data-gi-orb2-beat>Beat now</button>
            <button class="gi-button" type="button" data-gi-orb2-auto aria-pressed="true">Auto-beat: on</button>
            <button class="gi-button" type="button" data-gi-orb2-fullscreen aria-pressed="false">⛶ Model full screen</button>
            <label class="gi-chart-control" data-gi-orb2-timeframe-row ${tickerMode ? "" : "hidden"}><span>TIMEFRAME</span><select data-gi-orb2-timeframe aria-label="Select Orb timeframe"><option value="1h" ${timeframe === "1d" ? "" : "selected"}>1 hour</option><option value="1d" ${timeframe === "1d" ? "selected" : ""}>1 day</option></select></label>
            <label class="gi-chart-control gi-orb2-series-control" data-gi-orb2-series-row ${tickerMode ? "" : "hidden"}><span>SERIES</span><select data-gi-orb2-series-mode aria-label="Choose single-set or double-helix series mode"><option value="dual" ${preferences && preferences.seriesMode === "single" ? "" : "selected"}>Double helix · A × B</option><option value="single" ${preferences && preferences.seriesMode === "single" ? "selected" : ""}>Single set</option></select></label>
            <label class="gi-chart-control gi-orb2-series-control" data-gi-orb2-series-a-row ${tickerMode ? "" : "hidden"}><span>SERIES A</span><input data-gi-orb2-series-a type="text" spellcheck="false" autocomplete="off" aria-label="Series A reviewed ticker symbols"></label>
            <label class="gi-chart-control gi-orb2-series-control" data-gi-orb2-series-b-row ${tickerMode ? "" : "hidden"}><span>SERIES B</span><input data-gi-orb2-series-b type="text" spellcheck="false" autocomplete="off" aria-label="Series B reviewed ticker symbols"></label>
            <button class="gi-button" type="button" data-gi-orb2-route>Trace resolution</button>
            <button class="gi-button" type="button" data-gi-orb2-lateral>Observe laterally</button>
            <button class="gi-button" type="button" data-gi-orb2-clear-beats>Clear beats</button>
            <button class="gi-button" type="button" data-gi-orb2-restore-beats hidden>Restore stored beats</button>
            <button class="gi-button" type="button" data-gi-orb2-reset>Reset view</button>
          </div>
        </div>
        <p class="gi-orb2-beat-status" data-gi-orb2-beat-status role="status" aria-live="polite">Compact beat snapshots save to D1 when available; Clear hides active context and Restore reloads the archive.</p>
        <div class="gi-orb2-beat-controls" aria-label="Orb 2 live beat controls">
          <label class="gi-orb2-control"><span>DISC</span><select data-gi-orb2-disc aria-label="Choose a Characters Disc"></select></label>
          <label class="gi-orb2-control"><span>BAR SIZE</span><select data-gi-orb2-interval aria-label="Choose the market interval"></select></label>
          <label class="gi-orb2-control"><span>CADENCE</span><select data-gi-orb2-cadence aria-label="Tickerbot beat cadence"></select></label>
          <label class="gi-orb2-control gi-orb2-budget-control"><span>TICKERBOT MONTHLY PLAN</span><input data-gi-orb2-budget type="number" min="100" max="10000" step="100" aria-label="Tickerbot monthly planning budget"></label>
          <label class="gi-orb2-control gi-orb2-focus-control"><span>FOCUS INSTRUMENT</span><select data-gi-orb2-focus aria-label="Choose an instrument to inspect"></select></label>
          <div class="gi-orb2-beat-flags">
            <label class="gi-orb2-toggle"><input data-gi-orb2-stretch type="checkbox"><span>Use reserve stretch</span></label>
            <label class="gi-orb2-toggle"><input data-gi-orb2-tier type="checkbox"><span>Two-lane hot/sweep rotation</span></label>
          </div>
        </div>
        <div class="gi-orb2-live-strip" role="status" aria-live="polite">
          <span class="gi-orb2-provider-pill" data-gi-orb2-provider>Massive · AUTOMATIC DAILY</span>
          <span class="gi-orb2-live-state" data-gi-orb2-countdown>Awaiting first beat</span>
          <span class="gi-orb2-persist-state" data-gi-orb2-persistence>Loading saved beat history…</span>
          <span class="gi-orb2-counts" data-gi-orb2-counts>0 calls · 0 beats</span>
        </div>
        <div class="gi-orb2-plan-row">
          <div data-gi-orb2-plan></div>
          <button class="gi-button gi-orb2-feature" type="button" data-gi-orb2-feature>Feature focus</button>
        </div>
        <div class="gi-orb2-message" data-gi-orb2-message role="status" hidden></div>
        <p class="gi-orb2-context"><strong>BEAT CONTRACT</strong> · Massive automatically rotates one reviewed <code>1d</code> instrument per minute across Discs 1–5. Disc1 Tickerbot <code>1h</code>/<code>1d</code> stays on-demand with Characters' budget-aware rotation; Alpha Vantage's separate Disc1 <code>1mo</code> spotlight stays hourly. A provider change gets a visible 60-second warm-up before any new request. A missing D1 ledger is a Worker configuration/migration issue—not a timer problem—and is refused before any upstream request.</p>
        <div class="gi-orb2-pathways" aria-label="Live data pathway status">
          <div class="gi-orb2-path-step"><span>01 · PROVIDER</span><strong data-gi-orb2-path-provider>READY</strong></div>
          <i aria-hidden="true">→</i>
          <div class="gi-orb2-path-step"><span>02 · WORKER</span><strong data-gi-orb2-path-worker>READY</strong></div>
          <i aria-hidden="true">→</i>
          <div class="gi-orb2-path-step"><span>03 · D1 ALLOWANCE</span><strong data-gi-orb2-path-ledger>WAITING</strong></div>
          <i aria-hidden="true">→</i>
          <div class="gi-orb2-path-step"><span>04 · 3D BEAT</span><strong data-gi-orb2-path-model>READY</strong></div>
        </div>
        <div class="gi-orb2-display-controls" aria-label="Orb 2 display controls">
          <label><span>FORM</span><input data-gi-orb2-formation type="range" min="0" max="100" step="1" value="100"><strong data-gi-orb2-formation-label>SPHERE</strong></label>
          <label class="gi-orb2-toggle"><input data-gi-orb2-rotate type="checkbox"><span>Auto-rotate</span></label>
          <label class="gi-orb2-toggle"><input data-gi-orb2-labels type="checkbox"><span>All labels</span></label>
          <label class="gi-orb2-toggle"><input data-gi-orb2-paths type="checkbox" checked><span>Data pathways</span></label>
          <label class="gi-orb2-toggle"><input data-gi-orb2-data-bits type="checkbox" checked><span>Market data bits</span></label>
          <label class="gi-orb2-toggle"><input data-gi-orb2-fractal type="checkbox" checked><span>Fractal core</span></label>
          <span class="gi-orb2-center">CENTER ORIGIN · ${CENTER_ADDRESS}</span>
        </div>
        ${colorKey}
        <div class="gi-orb2-layout">
          <div class="gi-orb2-canvas-shell">
            <canvas data-gi-orb2-canvas tabindex="0" aria-describedby="gi-orb2-color-description" aria-label="${tickerMode
              ? "Interactive three-dimensional Orb 2 model with nested ticker spheroids and linked Series A and B orbs. Drag to orbit, scroll to zoom, and select a ticker orb to inspect live beat data."
              : "Interactive three-dimensional Orb 2 model. Drag to orbit, scroll to zoom, and select a character node to inspect live beat data."}"></canvas>
            <div class="gi-orb2-canvas-hud"><span>${tickerMode ? "OUTER SHELL · NESTED TICKER ORBS" : "SPHERICAL SHELL · CHARACTER NODES"}</span><span data-gi-orb2-canvas-status>LOCAL / VISUAL PATHS ONLY</span></div>
            <p class="gi-orb2-gesture">Drag to orbit · scroll to zoom · click a node to inspect</p>
          </div>
          <aside class="gi-orb2-inspector" aria-live="polite">
            <p class="gi-eyebrow">NODE / MARKET INSPECTOR</p>
            <label class="gi-orb2-node-select"><span data-gi-orb2-node-label>CHARACTER NODE</span><select data-gi-orb2-node data-gi-orb2-select aria-label="Choose a character node"></select></label>
            <button class="gi-button gi-orb2-feature-inline" type="button" data-gi-orb2-feature-inline>Feature focus</button>
            <div data-gi-orb2-detail></div>
            <div class="gi-orb2-route-note" data-gi-orb2-route-note role="status"></div>
          </aside>
        </div>
        <section class="gi-orb2-history" aria-label="Orb 2 beat history">
          <div class="gi-orb2-history-head"><div><p class="gi-eyebrow">PERSISTENT BEAT LOG</p><h4>Recent live observations</h4></div><span data-gi-orb2-history-count>0 saved</span></div>
          <ol data-gi-orb2-history-list><li class="gi-orb2-history-empty">No live beat has been recorded yet. Start with Beat now or enable Auto-beat.</li></ol>
        </section>
        <p class="gi-orb2-boundary"><strong>MODEL BOUNDARY</strong> · Live price/volume observations drive the same display-only NPC, object, and item motion as Characters. A line or particle is a local visualization, not an OCM message, market signal, recommendation, authorization, transaction, or permission to act. Missing fields remain missing: synthetic/demo mode is disabled in this view, and an unavailable beat leaves its berth held rather than substituted. The Orb's fractal frame processing — the shared OrbFilm film and the Demo.flame/OuterOrb.flame dual flame system drawn through this camera — is display-only, adds no request, and encodes no market meaning. The outer sphere and helix guides are visual scaffolding around an inner ticker spheroid: every ticker has its own nested orb, and each rank-matched A/B pair is individually linked. Pair order reflects supplied Fibonacci-band position; local band rings, spheroid width, glow, and link color reflect only supplied fields. This is not a rating, ranking service, signal, or recommendation.</p>
      </section>`;

    const $ = selector => host.querySelector(selector);
    const root = $("[data-gi-orb2-root]");
    const canvas = $("[data-gi-orb2-canvas]");
    const discSelect = $("[data-gi-orb2-disc]");
    const intervalSelect = $("[data-gi-orb2-interval]");
    const cadenceSelect = $("[data-gi-orb2-cadence]");
    const budgetInput = $("[data-gi-orb2-budget]");
    const focusSelect = $("[data-gi-orb2-focus]");
    const nodeSelect = $("[data-gi-orb2-node]");
    const beatButton = $("[data-gi-orb2-beat]");
    const autoButton = $("[data-gi-orb2-auto]");
    const fullscreenButton = $("[data-gi-orb2-fullscreen]");
    const routeButton = $("[data-gi-orb2-route]");
    const lateralButton = $("[data-gi-orb2-lateral]");
    const resetButton = $("[data-gi-orb2-reset]");
    const featureButtons = [$("[data-gi-orb2-feature]"), $("[data-gi-orb2-feature-inline]")];
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
    const stretchBox = $("[data-gi-orb2-stretch]");
    const tierBox = $("[data-gi-orb2-tier]");
    const timeframeSelect = $("[data-gi-orb2-timeframe]");
    const clearBeatsButton = $("[data-gi-orb2-clear-beats]");
    const restoreBeatsButton = $("[data-gi-orb2-restore-beats]");
    const nodeSelectLabel = $("[data-gi-orb2-node-label]");
    const fractalToggle = $("[data-gi-orb2-fractal]");
    const seriesModeSelect = $("[data-gi-orb2-series-mode]");
    const seriesAInput = $("[data-gi-orb2-series-a]");
    const seriesBInput = $("[data-gi-orb2-series-b]");
    const ownerDocument = host.ownerDocument || globalThis.document || null;
    if (tickerMode && nodeSelectLabel) nodeSelectLabel.textContent = "SELECT TICKER";
    /* The Characters app reports whether an anonymous saved-beat archive exists
       for this browser; Restore stored beats reloads it on demand. */
    const beatStatusHandler = event => { if (restoreBeatsButton) restoreBeatsButton.hidden = !event.detail?.hasStored; };
    ownerDocument?.addEventListener("harshalos:characters-beats:status", beatStatusHandler);
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
        auto: state.auto, cadence: state.cadence, budget: state.budget,
        stretch: state.stretch, tierMode: state.tierMode, tierSweepHours: state.tierSweepHours,
        showDataBits: state.showDataBits, showFractal: state.showFractal,
        seriesMode: state.seriesMode, seriesA: state.seriesA, seriesB: state.seriesB
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

    function cadenceMinutesForBeat(provider = currentProvider()) {
      if (provider === "massive") return 1;
      if (provider === "alpha") return 60;
      return state.cadence;
    }

    function intervalForBeat() { return state.interval; }

    function makePlan(provider = currentProvider()) {
      return Beat.plan({
        monthlyBudget: state.budget,
        cadenceMinutes: provider === "alpha" ? 60 : state.cadence,
        castSize: symbols.length,
        perRequestCap: provider === "tickerbot" ? Beat.MAX_SYMBOLS_PER_BEAT : 1
      });
    }

    function perBeat(plan, provider = currentProvider()) {
      if (provider === "massive" || provider === "alpha") return 1;
      return state.stretch && plan.stretchWithinBudget ? plan.stretchCallsPerBeat : plan.callsPerBeat;
    }

    function tierPlan() {
      if (currentProvider() !== "tickerbot") return { options: [], recommended: null, notes: ["Two-lane rotation applies only to on-demand Tickerbot beats."] };
      return Beat.planTiers({
        monthlyBudget: state.budget,
        cadenceMinutes: state.cadence,
        castSize: symbols.length,
        perRequestCap: Beat.MAX_SYMBOLS_PER_BEAT
      });
    }

    function tierOption(tiers = tierPlan()) {
      return tiers.options.find(option => option.feasible && option.targetSweepHours === state.tierSweepHours)
        || tiers.recommended || null;
    }

    function dueForBeat() {
      const provider = currentProvider();
      const plan = makePlan(provider);
      const count = perBeat(plan, provider);
      const base = {
        symbols,
        lastRefreshedAt: state.ledger.lastRefreshedAt,
        now: Date.now(),
        featured: state.ledger.featured
      };
      if (provider === "alpha") {
        let bestSymbol = null;
        let bestGain = -Infinity;
        for (const symbol of symbols) {
          const record = latestObservation(state.discId, symbol, "alpha", "1mo");
          const close = record && record.market && record.market.latestBar && numeric(record.market.latestBar.close);
          const previousClose = record && record.market && numeric(record.market.previousClose);
          const confirmed = record && record.market && record.market.latestBar && record.market.latestBar.confirmed === true;
          if (!confirmed || close === null || previousClose === null || previousClose <= 0) continue;
          const gain = (close - previousClose) / previousClose;
          if (gain > bestGain || (gain === bestGain && symbol < bestSymbol)) {
            bestGain = gain;
            bestSymbol = symbol;
          }
        }
        return { symbols: bestSymbol ? [bestSymbol] : Beat.selectDueSymbols({ ...base, perBeat: 1 }), lanes: {}, tier: null, perBeat: 1 };
      }
      if (provider === "massive") {
        return { symbols: Beat.selectDueSymbols({ ...base, perBeat: 1 }), lanes: {}, tier: null, perBeat: 1 };
      }
      if (!state.tierMode) return { symbols: Beat.selectDueSymbols({ ...base, perBeat: count }), lanes: {}, tier: null, perBeat: count };
      const tiers = tierPlan();
      const selectedTier = tierOption(tiers);
      if (!selectedTier) return { symbols: Beat.selectDueSymbols({ ...base, perBeat: count }), lanes: {}, tier: null, perBeat: count };
      const selection = Beat.selectTieredDue({
        ...base,
        hotSet: state.ledger.featured,
        hotSize: selectedTier.hotSize,
        sweepPerBeat: selectedTier.sweepPerBeat
      });
      return { symbols: selection.all, lanes: selection.lanes, tier: selectedTier, perBeat: count };
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

    function observationFromInstrument(instrument, provider, at) {
      const symbol = String(instrument.symbol || "").toUpperCase();
      const displaySymbol = String(instrument.displaySymbol || symbol).slice(0, 48);
      const mode = provider || currentProvider();
      const providerId = String(instrument.provider || instrumentProvider(mode)).slice(0, 24);
      const bearingBase = nodeBearing(symbol);
      if (!instrument.marketContext) {
        return {
          symbol, displaySymbol, status: instrument.status || "unavailable", provider: providerId,
          code: String(instrument.code || "").slice(0, 48), message: String(instrument.message || "No market observation was supplied.").slice(0, 240),
          lane: instrument.lane === "hot" || instrument.lane === "sweep" ? instrument.lane : null,
          market: null,
          motion: Beat.motion(null, { bearingBase })
        };
      }
      const packet = MarketContext.normalizePacket(instrument.marketContext);
      const analysis = packet && MarketContext.evaluate(packet);
      const motion = Beat.motion(analysis, { bearingBase });
      const confirmed = latestConfirmedBars(packet);
      const latestBar = packet && packet.bars.at(-1) || null;
      const latestClose = latestBar ? numeric(latestBar.close) : null;
      const previousClose = confirmed.previous ? numeric(confirmed.latest.close) : null;
      const compareClose = confirmed.previous ? numeric(confirmed.previous.close) : null;
      const changePct = previousClose !== null && compareClose !== null && compareClose > 0
        ? ((previousClose - compareClose) / compareClose) * 100 : null;
      const market = analysis ? {
        status: analysis.status,
        source: String(analysis.source || packet.source || "").slice(0, 160),
        timeframe: String(analysis.timeframe || packet.timeframe || state.interval).slice(0, 24),
        dataShape: String(analysis.dataShape || packet.dataShape || "unknown").slice(0, 16),
        synthetic: Boolean(analysis.synthetic || packet.synthetic),
        barCount: Math.max(0, Number(analysis.barCount) || 0),
        volumeAvailable: analysis.volumeAvailable === true,
        latestBar: latestBar ? {
          time: Number(latestBar.time),
          ...(finite(Number(latestBar.open)) ? { open: Number(latestBar.open) } : {}),
          ...(finite(Number(latestBar.high)) ? { high: Number(latestBar.high) } : {}),
          ...(finite(Number(latestBar.low)) ? { low: Number(latestBar.low) } : {}),
          ...(latestClose !== null ? { close: latestClose } : {}),
          ...(finite(Number(latestBar.volume)) ? { volume: Number(latestBar.volume) } : {}),
          confirmed: latestBar.confirmed === true
        } : null,
        previousClose: compareClose,
        changePct,
        basis: analysis.bands && numeric(analysis.bands.basis),
        bands: analysis.bands ? {
          deviation: numeric(analysis.bands.deviation),
          upper382: numeric(analysis.bands.upper382), upper618: numeric(analysis.bands.upper618),
          upper764: numeric(analysis.bands.upper764), upper1000: numeric(analysis.bands.upper1000),
          lower382: numeric(analysis.bands.lower382), lower618: numeric(analysis.bands.lower618),
          lower764: numeric(analysis.bands.lower764), lower1000: numeric(analysis.bands.lower1000)
        } : null,
        bandSignals: analysis.signals ? {
          upperBreak: analysis.signals.upperBreak === true,
          lowerBreak: analysis.signals.lowerBreak === true
        } : null,
        vfi: analysis.vfi ? { value: numeric(analysis.vfi.value), signal: numeric(analysis.vfi.signal), available: analysis.vfi.available === true } : null,
        waveTrend: analysis.waveTrend ? { wt1: numeric(analysis.waveTrend.wt1), wt2: numeric(analysis.waveTrend.wt2), zone: String(analysis.waveTrend.zone || "unknown").slice(0, 48) } : null
      } : null;
      return {
        symbol, displaySymbol,
        status: instrument.status || "bars",
        provider: providerId,
        code: String(instrument.code || "").slice(0, 48),
        message: String(instrument.message || "").slice(0, 240),
        lane: instrument.lane === "hot" || instrument.lane === "sweep" ? instrument.lane : null,
        market,
        motion
      };
    }

    function makeEvent(result, selection, reason, provider) {
      const at = Date.now();
      const instruments = (result.instruments || []).map(instrument => observationFromInstrument(instrument, provider, at));
      const calls = result.spend
        ? Math.max(0, Number(result.spend.providerAttempts ?? result.spend.upstreamCalls) || 0) : 0;
      const event = {
        schema: BEAT_SCHEMA,
        beatId: uuid(),
        at,
        reason: ["manual", "auto", "open", "disc-change", "interval-change", "rehearsal"].includes(reason) ? reason : "manual",
        discId: state.discId,
        provider,
        interval: intervalForBeat(),
        cadenceMinutes: cadenceMinutesForBeat(provider),
        calls,
        cacheHits: result.spend ? Math.max(0, Number(result.spend.cacheHits) || 0) : 0,
        instruments
      };
      return { event, calls, instruments };
    }

    function addEvent(event) {
      state.events = [...state.events.filter(item => item.beatId !== event.beatId), event]
        .sort((left, right) => left.at - right.at).slice(-MAX_HISTORY);
      state.lastEvent = event;
      state.lastBeatAt = event.at;
      state.beatAnimation = { beatId: event.beatId, at: event.at, instruments: event.instruments.map(item => item.symbol) };
      rebuildObservations();
      syncLastBeat();
      rebuildLedgers();
      persistLocal();
      if (event.provider !== "rehearsal" && event.instruments.some(item => item.market || item.status === "unavailable")) {
        saveServerEvent(event);
      }
    }

    async function saveServerEvent(event) {
      if (!storage) {
        state.persistence = "local-only";
        state.persistenceNote = "This browser cannot keep the session id; live beats remain visible until this view closes.";
        draw();
        return;
      }
      state.persistence = "saving";
      state.persistenceNote = "Saving beat snapshot to the server…";
      drawStatus();
      try {
        const fetcher = globalThis.fetch;
        if (typeof fetcher !== "function") throw new Error("Same-origin fetch is unavailable.");
        const response = await fetcher(`${STORE_ROUTE}?sessionId=${encodeURIComponent(state.serverSessionId)}`, {
          method: "POST", credentials: "same-origin", cache: "no-store", keepalive: true, redirect: "error",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(event)
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload || payload.success !== true) {
          throw new Error(payload && payload.message || `Beat history save answered HTTP ${response.status}.`);
        }
        state.persistence = "saved";
        state.persistenceNote = "Saved on the server · last 120 beats · 90-day expiry.";
      } catch (error) {
        state.persistence = "local-only";
        state.persistenceNote = `${(error && error.message) || "Server history is unavailable."} Local recovery copy kept when browser storage allows.`;
      }
      drawStatus();
      drawHistory();
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
      cadenceSelect.innerHTML = Beat.CADENCES.filter(minutes => minutes > 1)
        .map(minutes => `<option value="${minutes}">${escapeHtml(Beat.formatHours(minutes / 60))}</option>`).join("");
      cadenceSelect.value = String(state.cadence);
      budgetInput.value = String(state.budget);
      stretchBox.checked = state.stretch;
      tierBox.checked = state.tierMode;
      if (seriesModeSelect) seriesModeSelect.value = state.seriesMode;
      if (seriesAInput) seriesAInput.value = state.seriesA.join(", ");
      if (seriesBInput) seriesBInput.value = state.seriesB.join(", ");
      cadenceSelect.disabled = ["massive", "alpha"].includes(currentProvider()) || state.pending;
      budgetInput.disabled = currentProvider() !== "tickerbot" || state.pending;
      stretchBox.disabled = currentProvider() !== "tickerbot" || state.pending;
      tierBox.disabled = currentProvider() !== "tickerbot" || state.pending;
      intervalSelect.disabled = modes.length <= 1 || state.pending || state.loadingCatalog;
      discSelect.disabled = state.pending || state.loadingCatalog;
      budgetInput.value = String(state.budget);
      syncFocusOptions();
      syncNodeOptions();
      autoButton.textContent = `Auto-beat: ${state.auto ? "on" : "off"}`;
      autoButton.setAttribute("aria-pressed", String(state.auto));
      beatButton.disabled = state.pending || state.loadingCatalog;
      rotateToggle.checked = state.autoRotate;
      dataBitsToggle.checked = state.showDataBits;
      if (fractalToggle) fractalToggle.checked = state.showFractal;
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
      nodeSelect.innerHTML = nodes.map(node => `<option value="${escapeHtml(node.id)}">${escapeHtml(node.visualId)}${node.series ? " · " + node.series : ""} · ${escapeHtml(node.name)}</option>`).join("");
      nodeSelect.value = previous || nodes[0].id;
    }

    function buildStage(entries, discId) {
      stage = Cast.build(entries, { discId });
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

    function drawPlan() {
      const provider = currentProvider();
      const plan = makePlan(provider);
      const perBeatCount = perBeat(plan, provider);
      const estimate = provider === "massive" ? "1 reviewed instrument per minute · across this Disc"
        : provider === "alpha" ? "1 best-performing Disc1 ticker per hour"
          : `${perBeatCount} instrument${perBeatCount === 1 ? "" : "s"} per manual beat · ${Beat.formatHours(plan.sweepHours)} full sweep`;
      const status = provider === "massive" ? "Massive's separate UTC-day D1 guard and shared per-minute envelope are required."
        : provider === "alpha" ? "Alpha Vantage uses a separate 25-attempt UTC-day D1 guard; 1mo never answers a 1h/1d request."
          : "Tickerbot's shared monthly D1 limit is enforced by the Worker separately from the local plan.";
      const isTickerbot = provider === "tickerbot";
      const tiers = tierPlan();
      const chosenTier = tierOption(tiers);
      const tierOptions = isTickerbot && chosenTier
        ? `<span class="gi-orb2-tier-summary">HOT ${chosenTier.hotSize} · SWEEP ${chosenTier.sweepPerBeat}/beat · ${chosenTier.targetSweepHours}h target</span>` : "";
      planHost.innerHTML = `
        <span class="gi-orb2-plan-chip"><strong>${escapeHtml(estimate)}</strong><small>${escapeHtml(status)}</small></span>
        <span class="gi-orb2-plan-chip"><strong>${plan.reserveCalls.toLocaleString()} reserved</strong><small>${Math.round(plan.budgetUseRatio * 100)}% planned Tickerbot use · ${symbols.length} reviewed berths</small></span>
        ${tierOptions}`;
      featureButtons.forEach(button => {
        if (!button) return;
        const featured = Boolean(state.ledger.featured.includes(state.focus));
        button.textContent = featured ? "Featured ★" : "Feature focus";
        button.setAttribute("aria-pressed", String(featured));
        button.disabled = !state.focus || currentProvider() !== "tickerbot" || state.pending;
      });
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

    function observationMarkup(observation) {
      if (!observation) return `<div class="gi-orb2-observation-empty">No live observation for this focus yet. Use Beat now, or enable Auto-beat in a Massive/Alpha mode.</div>`;
      const market = observation.market;
      const mood = observation.motion && observation.motion.mood || "frozen";
      const color = MOOD_COLORS[mood] || MOOD_COLORS.unknown;
      const provider = providerTitle(observation.providerMode || (observation.provider === "alpha-vantage" ? "alpha" : observation.provider === "synthetic" ? "rehearsal" : observation.provider));
      if (!market) {
        return `
          <div class="gi-orb2-observation-head"><strong>${escapeHtml(observation.symbol)} · UNAVAILABLE</strong><span>${escapeHtml(provider)}</span></div>
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
        <div class="gi-orb2-observation-head"><strong>${escapeHtml(observation.symbol)} · ${escapeHtml(mood.toUpperCase())}</strong><span>${escapeHtml(provider)}</span></div>
        <p class="gi-orb2-observation-source">${escapeHtml(market.source || "Provider source not supplied")} · ${escapeHtml(market.timeframe || observation.interval)} · ${market.barCount} bars</p>
        <dl class="gi-orb2-node-meta">${fields}<div><dt>Characters motion</dt><dd style="color:${escapeHtml(color)}">${escapeHtml(observation.motion && observation.motion.caption || mood)}</dd></div>
          <div><dt>Observed VFI</dt><dd>${escapeHtml(vfi)}</dd></div><div class="gi-orb2-flow-detail"><dt>Volume-flow path · Characters</dt><dd style="color:${escapeHtml(flow.color)}">${escapeHtml(flowText)}</dd><small>Visual cadence only—not volume per second.</small></div><div><dt>WaveTrend context</dt><dd>${escapeHtml(wave)}</dd></div></dl>
        <section class="gi-orb2-market-bits" aria-label="Observed market data channels">
          <h5>FIVE MARKET DATA BITS <span>NOT ASSURANCE</span></h5><div>${bits}</div>
        </section>
        <p class="gi-orb2-observation-time">Observed ${escapeHtml(shortTime(observation.at))} · ${market.synthetic ? "synthetic rehearsal · not live" : "API-supplied · verify provider"}${market.latestBar && market.latestBar.confirmed ? " · confirmed bar" : " · latest bar not confirmed"}</p>`;
    }

    /* Double-helix readouts for the inspected orb: strand, rank, Fibonacci-band
       position, supplied band width, potential energy, and the rank-matched
       cross-series rung. Every value comes from the supplied packet; held
       states say so. */
    function helixInspectorRows(node) {
      if (!tickerMode || state.seriesMode !== "dual" || !node || !node.symbol) return "";
      const berth = helixBerths.get(node.id);
      if (!berth) return `\n          <div><dt>Double helix</dt><dd>Settling — waiting for the first rendered frame.</dd></div>`;
      const strandSize = helixState.counts[berth.series === "B" ? "b" : "a"];
      const partnerList = helixState.ranked ? helixState.ranked[berth.series === "A" ? "B" : "A"] : [];
      const partner = partnerList[berth.rank];
      let rung = "No rank-matched partner on the other strand.";
      if (partner) {
        const partnerBerth = helixBerths.get(partner.id);
        const other = partnerBerth ? partnerBerth.direction : null;
        const agreement = berth.direction === null || other === null ? "not comparable — an observation is held"
          : berth.direction > 0 && other > 0 ? "both rising"
          : berth.direction < 0 && other < 0 ? "both falling"
          : berth.direction === other ? "both flat"
          : "diverging";
        rung = `Pairs with ${partner.symbol} (Series ${berth.series === "A" ? "B" : "A"}) · ${agreement}`;
      }
      const metrics = berth.metrics;
      return `
          <div><dt>Helix strand</dt><dd>Series ${berth.series} · rank ${berth.rank + 1} of ${strandSize}</dd></div>
          <div><dt>Fibonacci band position</dt><dd>${berth.held ? "Held — band values were not supplied; the orb rests at the basis ring." : `${Math.round(berth.p * 100)}% of the band range${metrics.breakSide ? ` · ${metrics.breakSide} band break signaled` : ""}`}</dd></div>
          <div><dt>Volatility · band width</dt><dd>${metrics.volatilityPct === null ? "Band width was not supplied." : `${metrics.volatilityPct.toFixed(2)}% of basis`}</dd></div>
          <div><dt>Potential energy</dt><dd>${berth.held ? "Not measurable without supplied bands." : `${Math.round(metrics.potential * 100)}% stretched from the band midline`}</dd></div>
          <div><dt>Cross-series rung</dt><dd>${escapeHtml(rung)}</dd></div>`;
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
          <div><dt>Latest node pathway</dt><dd>${escapeHtml(nodeSource)}</dd></div>
          <div><dt>${node.symbol ? "Orb motion" : "NPC motion"} · ${escapeHtml(providerTitle(provider))}</dt><dd>${escapeHtml(nodeActivity)}</dd></div>
          ${helixInspectorRows(node)}
        </dl>
        <div class="gi-orb2-focus-readout"><p class="gi-eyebrow">FOCUS · ${escapeHtml(state.focus || "—")}</p>${observationMarkup(activeObservation)}</div>
        <p class="gi-orb2-node-role">${escapeHtml(node.role)}</p>
        <p class="gi-orb2-node-caveat">${node.symbol ? "Ticker labels identify reviewed watchlist symbols only; the orb is not price data, a signal, or an OCM identity." : "This character label is from the reviewed local cast. It is not a registered OCM address or identity claim."}</p>`;
      nodeSelect.value = node.id;
      routeNote.textContent = friendlyRoute(state.route);
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

    function currentDelay() {
      const provider = currentProvider();
      if (provider === "massive") return MASSIVE_BEAT_MS;
      if (provider === "alpha") return ALPHA_BEAT_MS;
      return state.cadence * 60_000;
    }

    function drawStatus() {
      const provider = currentProvider();
      providerHost.textContent = providerDescription(provider);
      providerHost.className = `gi-orb2-provider-pill ${provider}`;
      if (state.pending) countdownHost.textContent = "BEAT IN FLIGHT · WORKER REQUEST";
      else if (state.cooldownUntil > Date.now()) countdownHost.textContent = `PROVIDER WARM-UP · ${formatCountdown(state.cooldownUntil - Date.now())}`;
      else if (!state.auto) countdownHost.textContent = "AUTO-BEAT PAUSED · use Beat now";
      else if (provider === "tickerbot") countdownHost.textContent = "TICKERBOT IS ON-DEMAND · use Beat now";
      else if (state.lastBeatAt) {
        const remaining = state.nextBeatAt > Date.now() ? state.nextBeatAt - Date.now() : currentDelay();
        countdownHost.textContent = `LAST BEAT ${shortTime(state.lastBeatAt)} · NEXT IN ${formatCountdown(remaining)}`;
      }
      else countdownHost.textContent = "READY · first live beat is starting";
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
      autoButton.textContent = `Auto-beat: ${state.auto ? "on" : "off"}`;
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
      drawStatus();
      drawInspector();
      drawHistory();
      scheduleRender();
    }

    function updateProviderSteps(provider, spend = state.spend, error = null) {
      const ledgerStatus = provider === "massive" ? spend && spend.massiveLedgerStatus
        : provider === "alpha" ? spend && spend.alphaVantageLedgerStatus
          : spend && spend.ledgerStatus;
      state.routeSteps = {
        provider: error ? "UNAVAILABLE" : state.pending ? "FETCHING" : "READY",
        worker: error ? "ROUTE ERROR" : state.pending ? "REQUESTING" : "READY",
        ledger: ledgerStatus === "ready" || ledgerStatus === "not-applicable" ? "READY"
          : ledgerStatus === "unavailable" ? "UNAVAILABLE"
            : ledgerStatus === "not-configured" ? "NOT CONFIGURED" : state.pending ? "CHECKING" : "WAITING",
        model: error ? "HELD" : "READY"
      };
    }

    function safeRefusalMessage(instrument) {
      const code = String(instrument.code || "");
      if (code === "massive-ledger-unavailable") {
        return `${instrument.message || "No Massive request was sent."} Check the COMMUNITY_DB Worker binding and apply migration 0007_massive_daily_call_ledger.sql. Waiting 60 seconds will not repair a missing D1 table.`;
      }
      if (code === "alpha-vantage-ledger-unavailable") {
        return `${instrument.message || "No Alpha Vantage request was sent."} Check the COMMUNITY_DB Worker binding and apply migration 0006_alpha_vantage_daily_call_ledger.sql. Waiting 60 seconds will not repair a missing D1 table.`;
      }
      if (code === "ledger-unavailable") {
        return `${instrument.message || "No Tickerbot request was sent."} Check the COMMUNITY_DB Worker binding and apply migration 0005_tickerbot_call_ledger.sql.`;
      }
      if (code === "massive-rate-limit") return `${instrument.message || "Massive is pacing this request."} No other provider was substituted.`;
      if (code === "massive-budget-exhausted") return `${instrument.message || "The Massive daily cap is reached."} No request was sent.`;
      if (code === "alpha-vantage-budget-exhausted") return `${instrument.message || "Alpha Vantage's daily cap is reached."} No request was sent.`;
      if (code === "budget-exhausted") return `${instrument.message || "Tickerbot's monthly cap is reached."} No request was sent.`;
      return instrument.message || "No provider observation was returned; the berth remains still.";
    }

    function updateUnavailableMessage(instruments) {
      const refused = (instruments || []).filter(instrument => !instrument.marketContext);
      if (!refused.length) {
        state.message = null;
        return;
      }
      const first = refused[0];
      const text = safeRefusalMessage(first);
      const kind = /ledger-unavailable|not configured|rate-limit|budget-exhausted/i.test(String(first.code || "")) ? "refusal" : "note";
      state.message = { kind, text: refused.length > 1 ? `${refused.length} due berth${refused.length === 1 ? "" : "s"} held. ${text}` : text };
    }

    async function fetchLiveBeat(due, cadenceMinutes, lanes = {}, provider = currentProvider()) {
      const laneParam = Object.entries(lanes).length
        ? `&lanes=${encodeURIComponent(Object.entries(lanes).map(([symbol, lane]) => `${symbol}:${lane}`).join(","))}` : "";
      const endpoint = `/api/characters/v1/beat?disc=${encodeURIComponent(state.discId)}` +
        `&provider=${encodeURIComponent(provider)}` +
        `&symbols=${encodeURIComponent(due.join(","))}` +
        `&interval=${encodeURIComponent(state.interval)}&cadence=${cadenceMinutes}${laneParam}`;
      const fetcher = globalThis.fetch;
      if (typeof fetcher !== "function") throw new Error("The same-origin Worker route cannot be reached because fetch is unavailable.");
      const response = await fetcher(endpoint, {
        method: "GET", credentials: "same-origin", cache: "no-store", redirect: "error",
        headers: { Accept: "application/json" }
      });
      const payload = await response.json().catch(() => null);
      const data = payload && isRecord(payload.data) ? payload.data : null;
      const spend = data && data.spend || null;
      state.spend = spend;
      const instruments = data && Array.isArray(data.instruments) ? data.instruments : [];
      if (!response.ok && !instruments.length) {
        const error = new Error(payload && payload.message || `The Characters beat route answered HTTP ${response.status}.`);
        error.kind = response.status === 404 || response.status === 503 ? "unconfigured" : "upstream";
        throw error;
      }
      updateProviderSteps(provider, spend);
      return { instruments, spend };
    }

    async function beatNow(reason = "manual") {
      if (state.pending || state.loadingCatalog || state.destroyed) return false;
      if (state.cooldownUntil > Date.now()) {
        state.message = { kind: "note", text: `${providerTitle(currentProvider())} warm-up is active. The next request is held for ${formatCountdown(state.cooldownUntil - Date.now())}; no request has been sent.` };
        draw();
        return false;
      }
      let provider = currentProvider();
      const durable = state.spend && state.spend.durable;
      const currentMonth = Beat.monthKey(Date.now());
      if (provider === "tickerbot" && durable && durable.month === currentMonth && durable.exhausted) {
        state.message = { kind: "refusal", text: `The shared D1 ledger records ${Number(durable.calls).toLocaleString()} of ${Number(durable.workerLimit).toLocaleString()} Tickerbot attempts for ${durable.month}. No on-demand request was sent. Massive automatic 1d and Alpha Vantage 1mo are separate provider paths.` };
        draw();
        return false;
      }
      if (!symbols.length) {
        state.message = { kind: "note", text: "No reviewed instruments are available on this Disc. No market request was sent." };
        draw();
        return false;
      }
      const selection = dueForBeat();
      const due = selection.symbols;
      if (!due.length) return false;
      state.pending = true;
      state.error = null;
      state.message = { kind: "note", text: `Sending ${due.join(", ")} through ${providerTitle(provider)} → the same-origin Characters Worker. No substitute provider is permitted.` };
      state.routeSteps = { provider: "REQUESTING", worker: "REQUESTING", ledger: "CHECKING", model: "WAITING" };
      syncFormControls();
      drawStatus();
      let result = null;
      let error = null;
      try {
        result = await fetchLiveBeat(due, cadenceMinutesForBeat(provider), selection.lanes, provider);
      } catch (caught) {
        error = caught;
      }
      state.pending = false;
      if (error) {
        /* Synthetic/demo mode is disabled: a failed live beat stays failed.
           The berths keep their last reviewed observation, the refusal is
           stated plainly, and nothing synthetic is substituted. */
        state.error = error;
        state.message = { kind: "refusal", text: `${error.message || "The beat request failed. No alternate provider was used."} The model stays on its last reviewed observation — synthetic or demo data is not substituted.` };
        updateProviderSteps(provider, state.spend, error);
        draw();
        schedule();
        return false;
      }
      updateProviderSteps(provider, result && result.spend || state.spend);
      const at = Date.now();
      const { event, calls, instruments } = makeEvent(result, selection, reason, provider);
      const refreshed = instruments.filter(item => item.market).map(item => item.symbol);
      const moodBySymbol = Object.fromEntries(instruments.map(item => [item.symbol, item.motion && item.motion.mood || "unknown"]));
      state.ledger = Beat.recordBeat(state.ledger, {
        at,
        symbols: refreshed,
        calls,
        moodBySymbol,
        synthetic: false,
        cadenceMinutes: cadenceMinutesForBeat(provider)
      });
      writeLedger(state.ledger);
      if (instruments.some(item => item.market)) {
        const preferred = instruments.find(item => item.market);
        const mappedBerth = stage && stage.berths.find(berth => berth.symbol === preferred.symbol);
        if (mappedBerth && mappedBerth.npc) state.selected = nodeIndexByName.get(mappedBerth.npc.name) ?? state.selected;
      }
      addEvent(event);
      updateUnavailableMessage(result.instruments);
      if (refreshed.length) {
        const spend = result.spend || {};
        const attempts = calls;
        const unavailableCount = instruments.filter(item => !item.market).length;
        state.message = unavailableCount
          ? { kind: "note", text: `${refreshed.length} reviewed berth${refreshed.length === 1 ? "" : "s"} updated from ${providerTitle(provider)} (${attempts} Worker-routed provider attempt${attempts === 1 ? "" : "s"}); ${unavailableCount} berth${unavailableCount === 1 ? " remains" : "s remain"} held without invented data.` }
          : null;
        if (provider === "massive" && spend.massiveLedgerStatus === "ready") state.routeSteps.ledger = "READY · MASSIVE D1";
        else if (provider === "alpha" && spend.alphaVantageLedgerStatus === "ready") state.routeSteps.ledger = "READY · ALPHA D1";
        else if (provider === "tickerbot" && spend.ledgerStatus === "ready") state.routeSteps.ledger = "READY · TICKERBOT D1";
      } else if (!refreshed.length) {
        updateUnavailableMessage(result.instruments);
        state.routeSteps.model = "HELD · NO DATA";
      }
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
      if (state.destroyed || !state.visible || !state.auto) {
        drawStatus();
        return;
      }
      const provider = currentProvider();
      if (provider === "tickerbot") {
        drawStatus();
        return;
      }
      const wait = state.cooldownUntil > Date.now() ? state.cooldownUntil - Date.now() : currentDelay();
      state.nextBeatAt = Date.now() + Math.max(0, wait);
      drawStatus();
      beatTimer = setTimeout(async () => {
        beatTimer = null;
        state.nextBeatAt = 0;
        if (state.destroyed || !state.visible) return;
        drawStatus();
        const doc = host.ownerDocument || globalThis.document;
        if (doc && doc.hidden) {
          state.message = { kind: "note", text: "Auto-beat paused while this page is hidden — no provider calls are spent. It resumes when visible." };
          drawStatus();
          schedule();
          return;
        }
        if (state.cooldownUntil > Date.now()) {
          drawStatus();
          schedule();
          return;
        }
        await beatNow("auto");
        schedule();
      }, Math.max(0, wait));
    }

    function setProviderCooldown(previousProvider, nextProvider) {
      if (previousProvider === nextProvider) return false;
      state.cooldownUntil = Date.now() + PROVIDER_COOLDOWN_MS;
      state.message = { kind: "note", text: `${providerTitle(previousProvider)} → ${providerTitle(nextProvider)} selected. A 60-second provider warm-up is running; Beat now and Auto-beat requests are held until the countdown ends.` };
      state.routeSteps = { provider: "WARM-UP", worker: "IDLE", ledger: "NOT QUERIED", model: "HOLD" };
      draw();
      schedule();
      return true;
    }

    async function switchDisc(discId) {
      const disc = DiscCatalog.disc(discId);
      if (!disc || state.pending || state.loadingCatalog) {
        discSelect.value = state.discId;
        return;
      }
      const previousDisc = state.discId;
      const previousProvider = currentProvider();
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
        state.tierMode = false;
        state.stretch = false;
        stretchBox.checked = false;
        tierBox.checked = false;
        buildStage(result.entries, discId);
        state.loadingCatalog = false;
        const nextProvider = currentProvider();
        const changedProvider = setProviderCooldown(previousProvider, nextProvider);
        state.message = changedProvider ? state.message : { kind: "note", text: disc.ranking };
        persistLocal();
        draw();
        if (!changedProvider && nextProvider !== "tickerbot") await beatNow("disc-change");
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

    function switchInterval(nextInterval) {
      if (!intervalAllowed(state.discId, nextInterval) || state.pending) {
        intervalSelect.value = state.interval;
        return;
      }
      if (nextInterval === state.interval) return;
      const previousProvider = currentProvider();
      state.interval = nextInterval;
      if (nextInterval === "1h") state.auto = false;
      else if (nextInterval === "1mo") state.auto = true;
      state.tierMode = false;
      state.stretch = false;
      state.ledger = readLedger(state.discId, state.interval);
      const nextProvider = currentProvider();
      const changedProvider = setProviderCooldown(previousProvider, nextProvider);
      state.message = changedProvider ? state.message : nextInterval === "1mo"
        ? { kind: "note", text: "Explicit Disc1 1mo mode: Alpha Vantage's best-performing ticker is evaluated from locally observed confirmed bars; one monthly-series request per hour." }
        : nextInterval === "1d" && state.auto
          ? { kind: "note", text: "Automatic 1d mode: Massive refreshes one reviewed instrument per minute; successful daily packets remain provider-isolated and are not replaced by Tickerbot or Alpha Vantage." }
          : { kind: "note", text: `On-demand Tickerbot ${nextInterval} mode selected. Use Beat now; no background Tickerbot poll is scheduled.` };
      persistLocal();
      draw();
      if (!changedProvider && nextProvider !== "tickerbot") beatNow("interval-change");
      schedule();
    }



    function toggleAuto() {
      const previousProvider = currentProvider();
      if (state.interval === "1h") {
        state.auto = false;
        state.message = { kind: "note", text: "Tickerbot 1h is on demand only. Use Beat now for reviewed Disc1 stock data; no background polling is scheduled." };
      } else {
        state.auto = !state.auto;
      }
      const nextProvider = currentProvider();
      const changedProvider = setProviderCooldown(previousProvider, nextProvider);
      if (!changedProvider && !state.auto) {
        state.message = nextProvider === "tickerbot"
          ? { kind: "note", text: `Auto-beat paused; Disc1 ${state.interval} now uses on-demand Tickerbot. Beat now is available after the provider warm-up.` }
          : { kind: "note", text: "Auto-beat paused. Beat now remains available; no background provider calls will run." };
      } else if (!changedProvider && state.auto) {
        state.message = { kind: "note", text: "Auto-beat enabled. The next beat follows the selected provider's Characters cadence." };
      }
      persistLocal();
      draw();
      schedule();
    }

    function toggleFeatured() {
      if (!state.focus || currentProvider() !== "tickerbot") return;
      const featured = new Set(state.ledger.featured);
      if (featured.has(state.focus)) featured.delete(state.focus);
      else featured.add(state.focus);
      state.ledger = { ...state.ledger, featured: [...featured] };
      writeLedger(state.ledger);
      const selected = featured.has(state.focus);
      state.message = { kind: "note", text: selected
        ? `${state.focus} joins the Tickerbot hot lane. It changes rotation priority only; no extra provider calls.`
        : `${state.focus} leaves the hot lane and returns to the least-recently-refreshed sweep. No extra provider calls.` };
      draw();
    }

    function modelPoint(node, now, directive) {
      const discRadius = 1.04 + ((node.order * 17) % 5) * 0.12;
      /* Dual-series ticker nodes occupy separate, paired sites on an inner
         spheroid. Their supplied Fibonacci-band position still sets their
         local band ring and comparison rank; it no longer piles tickers into
         one A cluster and one B cluster on the outside of the model. */
      const helixBerth = helixBerths.get(node.id);
      const modelRadius = tickerMode ? TICKER_ORB_FIELD_RADIUS : SPHERE_RADIUS;
      let longitude = helixBerth ? helixBerth.longitude : node.longitude;
      let latitude = helixBerth ? helixBerth.latitude : node.latitude;
      /* Preserve each dual ticker's pair offset; its live motion still drives
         local rings and pathways without collapsing A/B anchor centers. */
      const hasNpcMotion = Boolean(!helixBerth && directive && !directive.frozen && directive.npc);
      if (hasNpcMotion) {
        const npc = directive.npc;
        const phase = (now / 1000) * (0.6 + clamp(Number(npc.speed) || 0, 0, 1) * 2.2) + node.order * 1.71;
        const stride = clamp(Number(npc.stride) || 0, 0, 1) * (0.025 + Math.sin(phase) ** 2 * 0.06);
        const bearing = Number(npc.bearing) || 0;
        const jitter = clamp(Number(npc.jitter) || 0, 0, 1) * Math.sin(phase * 3.7) * 0.025;
        longitude += Math.cos(bearing + jitter) * stride;
        latitude += Math.sin(bearing + jitter) * stride * 0.65;
        if (npc.formation === "tight") latitude *= 0.96;
        if (npc.formation === "rim") latitude = clamp(latitude * 1.04, -HELIX_LAT_MAX, HELIX_LAT_MAX);
        if (npc.formation === "column") longitude += Math.sin(phase) * stride * 0.3;
        if (npc.formation === "scatter") latitude += jitter;
      }
      latitude = clamp(latitude, -HELIX_LAT_MAX, HELIX_LAT_MAX);
      const sphere = helixBerth && helixBerth.position && !hasNpcMotion
        ? helixBerth.position
        : spherePoint(latitude, longitude, modelRadius);
      const disc = { x: discRadius * Math.cos(longitude), y: 0, z: discRadius * Math.sin(longitude) };
      const t = ease(state.formation);
      return {
        x: disc.x + (sphere.x - disc.x) * t,
        y: disc.y + (sphere.y - disc.y) * t,
        z: disc.z + (sphere.z - disc.z) * t
      };
    }

    /* The camera is split so The Orb's fractal frame processing (OrbFilm.drawWrapped)
       can wrap frames through this model's exact rotation, pitch, and zoom. */
    function rotate3(point) {
      const cy = Math.cos(state.yaw), sy = Math.sin(state.yaw);
      const cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
      const x = point.x * cy - point.z * sy;
      const z0 = point.x * sy + point.z * cy;
      return { x, y: point.y * cp - z0 * sp, z: point.y * sp + z0 * cp };
    }

    function toScreen(point, width, height) {
      /* Keep the perspective gentle so the shell reads as a sphere instead of
         a depth-stretched disc. Zoom scales the model itself as well as the
         camera distance, which makes the wheel control behave intuitively. */
      const cameraDistance = CAMERA_DISTANCE / state.zoom;
      const scale = state.zoom * cameraDistance / (cameraDistance + point.z);
      const radius = Math.min(width, height) * MODEL_VIEW_SCALE;
      return { x: width / 2 + point.x * scale * radius, y: height / 2 - point.y * scale * radius, z: point.z, scale };
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

    function traceProjectedPoints(points) {
      if (points.length < 2) return;
      context2d.beginPath();
      points.forEach((point, index) => index ? context2d.lineTo(point.x, point.y) : context2d.moveTo(point.x, point.y));
      context2d.stroke();
    }

    function traceNearSegments(points) {
      if (points.length < 2) return;
      context2d.beginPath();
      let drawing = false;
      for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1];
        const point = points[index];
        if ((previous.z + point.z) <= 0) {
          if (!drawing) context2d.moveTo(previous.x, previous.y);
          context2d.lineTo(point.x, point.y);
          drawing = true;
        } else drawing = false;
      }
      context2d.stroke();
    }

    function strokeDepthPath(points, color, backAlpha, frontAlpha, width = 1, dash = []) {
      const formation = clamp(state.formation, 0, 1);
      if (formation <= 0.001 || points.length < 2) return;
      context2d.save();
      context2d.strokeStyle = color;
      context2d.lineWidth = width;
      context2d.lineCap = "round";
      context2d.lineJoin = "round";
      context2d.setLineDash(dash);
      context2d.globalAlpha = clamp(backAlpha * formation, 0, 1);
      traceProjectedPoints(points);
      if (frontAlpha > backAlpha) {
        context2d.globalAlpha = clamp(frontAlpha * formation, 0, 1);
        context2d.setLineDash(dash);
        traceNearSegments(points);
      }
      context2d.restore();
    }

    function spherePoint(latitude, longitude, radius = SPHERE_RADIUS) {
      const ringRadius = radius * Math.cos(latitude);
      return {
        x: ringRadius * Math.cos(longitude),
        y: radius * Math.sin(latitude),
        z: ringRadius * Math.sin(longitude)
      };
    }

    /* Each rank-matched A/B pair gets a nearby site on the inner ticker
       spheroid. Successive pairs follow a Fibonacci spiral, so symbols occupy
       distinct parts of the inner field instead of collapsing into two hubs. */
    function tickerPairAnchor(rank, pairCount, series) {
      const count = Math.max(1, pairCount);
      const y = clamp(1 - 2 * ((rank + 0.5) / count), -Math.sin(HELIX_LAT_MAX), Math.sin(HELIX_LAT_MAX));
      const latitude = Math.asin(y);
      const longitude = HELIX_BASE_LON + rank * TICKER_ORB_GOLDEN_ANGLE;
      const center = spherePoint(latitude, longitude, TICKER_ORB_FIELD_RADIUS);
      const tangent = { x: -Math.sin(longitude), y: 0, z: Math.cos(longitude) };
      const side = series === "B" ? TICKER_ORB_PAIR_OFFSET : -TICKER_ORB_PAIR_OFFSET;
      return {
        latitude,
        longitude,
        position: {
          x: center.x + tangent.x * side,
          y: center.y,
          z: center.z + tangent.z * side
        }
      };
    }

    function ring(latitude, width, height, color, alpha) {
      const points = [];
      for (let step = 0; step <= 96; step += 1) {
        points.push(project(spherePoint(latitude, (step / 96) * TAU), width, height));
      }
      strokeDepthPath(points, color, alpha * 0.55, alpha * 1.75, 0.8);
    }

    function drawSphericalShell(width, height, center) {
      if (state.formation <= 0.001) return;
      const radius = Math.min(width, height) * MODEL_VIEW_SCALE * SPHERE_RADIUS * state.zoom;
      context2d.save();
      context2d.beginPath();
      context2d.ellipse(center.x, center.y, radius, radius, 0, 0, TAU);
      context2d.clip();
      const sheen = context2d.createRadialGradient(
        center.x - radius * 0.34, center.y - radius * 0.38, radius * 0.025,
        center.x, center.y, radius * 1.08
      );
      sheen.addColorStop(0, "rgba(48, 88, 143, .31)");
      sheen.addColorStop(0.42, "rgba(24, 45, 78, .24)");
      sheen.addColorStop(0.82, "rgba(8, 17, 33, .3)");
      sheen.addColorStop(1, "rgba(3, 8, 17, .46)");
      context2d.globalAlpha = 0.9 * state.formation;
      context2d.fillStyle = sheen;
      context2d.fillRect(center.x - radius, center.y - radius, radius * 2, radius * 2);
      context2d.restore();

      context2d.save();
      context2d.beginPath();
      context2d.ellipse(center.x, center.y, radius, radius, 0, 0, TAU);
      context2d.strokeStyle = "#6c9fda";
      context2d.lineWidth = 1.1;
      context2d.globalAlpha = 0.42 * state.formation;
      context2d.shadowColor = "#4c8dd2";
      context2d.shadowBlur = 18;
      context2d.stroke();
      context2d.restore();
    }

    function drawSphereGrid(width, height) {
      const latitudes = [-1.24, -0.96, -0.68, -0.4, -0.2, 0, 0.2, 0.4, 0.68, 0.96, 1.24];
      latitudes.forEach(latitude => ring(latitude, width, height, "#56759d", 0.105));
      const meridianCount = 12;
      for (let index = 0; index < meridianCount; index += 1) {
        const longitude = (index / meridianCount) * TAU;
        const points = [];
        for (let step = 0; step <= 88; step += 1) {
          const latitude = -Math.PI / 2 + (step / 88) * Math.PI;
          points.push(project(spherePoint(latitude, longitude), width, height));
        }
        strokeDepthPath(points, "#5a789f", 0.055, 0.145, 0.72);
      }
      const south = project({ x: 0, y: -SPHERE_RADIUS * 0.985, z: 0 }, width, height);
      const north = project({ x: 0, y: SPHERE_RADIUS * 0.985, z: 0 }, width, height);
      line(south, north, "#d3b46c", 0.22 * state.formation, 0.85, [4, 7]);
    }

    /* The ticker constellation sits on a second, nested spheroid inside Orb 2's
       outer shell. Its faint wire surface keeps the individual ticker orbs
       visibly inside a larger model rather than floating as two outer clusters. */
    function drawTickerOrbField(width, height) {
      if (!tickerMode || state.formation <= 0.001) return;
      const radius = TICKER_ORB_FIELD_RADIUS;
      [-0.78, 0, 0.78].forEach(latitude => {
        const points = [];
        for (let step = 0; step <= 64; step += 1) {
          points.push(project(spherePoint(latitude, step / 64 * TAU, radius), width, height));
        }
        strokeDepthPath(points, "#4e7199", 0.025, 0.09, 0.58, [2, 5]);
      });
      for (let meridian = 0; meridian < 8; meridian += 1) {
        const longitude = meridian / 8 * TAU;
        const points = [];
        for (let step = 0; step <= 48; step += 1) {
          const latitude = -Math.PI / 2 + step / 48 * Math.PI;
          points.push(project(spherePoint(latitude, longitude, radius), width, height));
        }
        strokeDepthPath(points, "#45658c", 0.018, 0.065, 0.5, [2, 6]);
      }
    }

    function drawTickerSpheroid(point, width, height, color, berth, selected, hovered) {
      if (!point.model || !point.orbRadius || state.formation <= 0.001) return;
      const center = point.model;
      const radius = point.orbRadius;
      const squash = 0.78;
      const yaw = (point.node.order * TICKER_ORB_GOLDEN_ANGLE) % TAU;
      const cosYaw = Math.cos(yaw), sinYaw = Math.sin(yaw);
      const seriesColor = berth ? berth.series === "B" ? "#ffc857" : "#6fd3ff" : color;
      const shellColor = selected || hovered ? "#f2f7ff" : seriesColor;
      const shellAlpha = selected || hovered ? 0.78 : 0.48;
      const modelPoint = (latitude, longitude) => {
        const localX = radius * Math.cos(latitude) * Math.cos(longitude);
        const localY = radius * squash * Math.sin(latitude);
        const localZ = radius * Math.cos(latitude) * Math.sin(longitude);
        return {
          x: center.x + localX * cosYaw - localZ * sinYaw,
          y: center.y + localY,
          z: center.z + localX * sinYaw + localZ * cosYaw
        };
      };
      const drawLatitude = (latitude, stroke, alpha, widthPx, dash = []) => {
        const points = [];
        for (let step = 0; step <= 40; step += 1) {
          points.push(project(modelPoint(latitude, step / 40 * TAU), width, height));
        }
        strokeDepthPath(points, stroke, alpha * 0.18, alpha, widthPx, dash);
      };
      const screenRadius = point.visualRadius;
      context2d.save();
      context2d.fillStyle = seriesColor;
      context2d.globalAlpha = selected || hovered ? 0.075 : 0.045;
      context2d.beginPath(); context2d.arc(point.x, point.y, screenRadius * 0.88, 0, TAU); context2d.fill();
      context2d.restore();
      [-0.68, 0, 0.68].forEach(latitude =>
        drawLatitude(latitude, shellColor, shellAlpha, selected || hovered ? 1.05 : 0.78, latitude === 0 ? [] : [2, 4]));
      [0, Math.PI / 2].forEach(longitude => {
        const points = [];
        for (let step = 0; step <= 36; step += 1) {
          const latitude = -Math.PI / 2 + step / 36 * Math.PI;
          points.push(project(modelPoint(latitude, longitude), width, height));
        }
        strokeDepthPath(points, shellColor, shellAlpha * 0.12, shellAlpha * 0.72, 0.68, [2, 4]);
      });
      const bandP = berth && berth.p !== null ? clamp(berth.p, 0, 1) : 0.5;
      const bandLatitude = (bandP - 0.5) * 1.36;
      drawLatitude(bandLatitude, berth && berth.held ? "#91a0b8" : seriesColor,
        berth ? 0.68 : 0.36, 0.9, berth && berth.held ? [2, 3] : []);

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


    function drawFlowRunner(point, center, now, wallNow, index, cue) {
      if (!cue.moving || !pathsToggle.checked) return;
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      const travel = cue.lane === "inbound" ? 1 : -1;
      const cycle = ((now / 1000 * cue.rate) + index * 0.371) % 1;
      const fraction = travel > 0 ? cycle : 1 - cycle;
      const trailFraction = clamp(fraction - travel * 0.12, 0, 1);
      const x = center.x + dx * fraction;
      const y = center.y + dy * fraction;
      const tailX = center.x + dx * trailFraction;
      const tailY = center.y + dy * trailFraction;
      const freshness = snapshotFreshness(point.observation, wallNow);
      context2d.save();
      context2d.strokeStyle = cue.color;
      context2d.globalAlpha = clamp(0.46 + freshness * 0.46, 0.46, 0.92);
      context2d.lineWidth = 2.2;
      context2d.lineCap = "round";
      context2d.shadowBlur = 8;
      context2d.shadowColor = cue.color;
      context2d.beginPath(); context2d.moveTo(tailX, tailY); context2d.lineTo(x, y); context2d.stroke();
      for (let trail = 1; trail <= 2; trail += 1) {
        const beadFraction = clamp(fraction - travel * trail * 0.055, 0, 1);
        const beadX = center.x + dx * beadFraction;
        const beadY = center.y + dy * beadFraction;
        context2d.globalAlpha = clamp((0.52 - trail * 0.15) * (0.65 + freshness * 0.35), 0.16, 0.5);
        context2d.beginPath(); context2d.arc(beadX, beadY, trail === 1 ? 2.2 : 1.5, 0, TAU); context2d.fillStyle = cue.color; context2d.fill();
      }
      context2d.globalAlpha = clamp(0.72 + freshness * 0.28, 0.72, 1);
      context2d.fillStyle = cue.color;
      context2d.shadowBlur = 11;
      context2d.beginPath(); context2d.arc(x, y, 3.1, 0, TAU); context2d.fill();
      context2d.translate(x, y);
      context2d.rotate(Math.atan2(dy * travel, dx * travel));
      context2d.beginPath(); context2d.moveTo(5.2, 0); context2d.lineTo(-3.8, -3); context2d.lineTo(-3.8, 3); context2d.closePath(); context2d.fill();
      context2d.restore();
    }

    function drawActivity(point, center, now, wallNow, index) {
      const observation = point.observation;
      const directive = point.directive;
      if (!observation || !directive) return;
      const moodColor = MOOD_COLORS[directive.mood] || point.node.color;
      const sourceColor = providerColor(observation);
      const freshness = snapshotFreshness(observation, wallNow);
      const incomplete = pathDash(observation);
      if (pathsToggle.checked) {
        const helixView = tickerMode && state.seriesMode === "dual";
        context2d.save();
        context2d.strokeStyle = sourceColor;
        context2d.globalAlpha = observation.market
          ? clamp((helixView ? 0.07 : 0.12) + freshness * (helixView ? 0.2 : 0.48), helixView ? 0.06 : 0.12, helixView ? 0.28 : 0.6)
          : (helixView ? 0.12 : 0.24);
        context2d.lineWidth = observation.market
          ? (helixView ? 0.55 : 0.8) + (directive.object?.aperture || 0) * (helixView ? 0.65 : 1.1)
          : (helixView ? 0.6 : 0.8);
        context2d.setLineDash(incomplete);
        context2d.beginPath(); context2d.moveTo(center.x, center.y); context2d.lineTo(point.x, point.y); context2d.stroke();
        context2d.restore();
      }
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
      drawFlowRunner(point, center, now, wallNow, index, flow);
      const beat = state.beatAnimation;
      const beatAge = beat ? wallNow - beat.at : Infinity;
      if (pathsToggle.checked && observation.market && state.showDataBits && beat
        && beat.instruments.includes(observation.symbol) && beatAge >= 0 && beatAge < 1900) {
        const availableBits = dataBitsForMarket(observation.market).filter(bit => bit.state !== "unavailable" && bit.color !== DATA_COLORS.unknown);
        availableBits.forEach((bit, bitIndex) => {
          const delayedAge = beatAge - bitIndex * 130;
          if (delayedAge < 0) return;
          const fraction = clamp(delayedAge / 1900, 0, 1);
          const x = center.x + (point.x - center.x) * fraction;
          const y = center.y + (point.y - center.y) * fraction;
          context2d.save(); context2d.fillStyle = bit.color; context2d.shadowBlur = 9; context2d.shadowColor = bit.color;
          context2d.beginPath(); context2d.arc(x, y, 1.8, 0, TAU); context2d.fill(); context2d.restore();
        });
      }
    }

    function drawProviderHalo(point, radius, observation, wallNow) {
      if (!observation) return;
      const freshness = snapshotFreshness(observation, wallNow);
      context2d.save();
      context2d.strokeStyle = providerColor(observation);
      context2d.globalAlpha = observation.market ? clamp(0.3 + freshness * 0.58, 0.3, 0.88) : 0.68;
      context2d.lineWidth = 1.3;
      context2d.setLineDash(pathDash(observation));
      context2d.beginPath(); context2d.arc(point.x, point.y, radius + 3.1, 0, TAU); context2d.stroke();
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

    /* ── Double-helix engine ───────────────────────────────────────────
       The large double helix remains a visual guide. Supplied Fibonacci-band
       values rank each strand and place a local band ring on that ticker's own
       nested spheroid. Rank-matched A/B pairs get separate Fibonacci-spaced
       sites inside the inner ticker field; missing bands remain held at basis. */
    function bandLatitude(position) {
      const p = clamp(Number(position), 0, 1);
      /* Linearize vertical displacement across the complete spherical shell:
         p=0, .5, 1 become south, equator, north, while longitude still coils. */
      return Math.asin((2 * p - 1) * Math.sin(HELIX_LAT_MAX));
    }

    function helixLongitude(position, series) {
      return HELIX_BASE_LON + clamp(Number(position), 0, 1) * TAU * HELIX_TURNS + (series === "B" ? Math.PI : 0);
    }

    function helixPoint(position, series, radius = SPHERE_RADIUS) {
      return spherePoint(bandLatitude(position), helixLongitude(position, series), radius);
    }

    function drawHelixScaffold(width, height, outerMod) {
      const breath = outerMod && outerMod.active ? 0.86 + clamp(outerMod.energy, 0, 1) * 0.24 : 0.92;
      const strands = [
        { series: "A", color: "#6fd3ff" },
        { series: "B", color: "#ffc857" }
      ];
      strands.forEach(({ series, color }) => {
        const points = [];
        for (let step = 0; step <= 180; step += 1) {
          const p = 0.006 + (step / 180) * 0.988;
          points.push(project(helixPoint(p, series), width, height));
        }
        strokeDepthPath(points, color, 0.075 * breath, 0.24 * breath, 5.2);
        strokeDepthPath(points, color, 0.22 * breath, 0.78 * breath, 1.45);
      });

      /* Delicate equal-band crossbars make the two continuous guides read as a
         ladder around a globe. The brighter, data-derived ticker pairings are
         drawn separately by drawHelixRungs(). */
      for (let rung = 1; rung <= 9; rung += 1) {
        const p = rung / 10;
        const latitude = bandLatitude(p);
        const start = helixLongitude(p, "A");
        const points = [];
        for (let step = 0; step <= 24; step += 1) {
          const longitude = start + (step / 24) * Math.PI;
          points.push(project(spherePoint(latitude, longitude, SPHERE_RADIUS * 0.992), width, height));
        }
        strokeDepthPath(points, "#8aa4c8", 0.035, 0.13, 0.7, [2, 4]);
      }
    }

    function circle3D(radius, latitude, rotation, color, alpha, width, canvasW, canvasH) {
      const cosLat = Math.cos(latitude), sinLat = Math.sin(latitude);
      context2d.save();
      context2d.strokeStyle = color;
      context2d.globalAlpha = clamp(alpha, 0, 1);
      context2d.lineWidth = width;
      context2d.beginPath();
      for (let step = 0; step <= 64; step += 1) {
        const longitude = rotation + (step / 64) * TAU;
        const point = project({ x: radius * cosLat * Math.cos(longitude), y: radius * sinLat, z: radius * cosLat * Math.sin(longitude) }, canvasW, canvasH);
        if (step) context2d.lineTo(point.x, point.y); else context2d.moveTo(point.x, point.y);
      }
      context2d.stroke();
      context2d.restore();
    }

    function meridian3D(radius, longitude, rotation, color, alpha, width, canvasW, canvasH) {
      context2d.save();
      context2d.strokeStyle = color;
      context2d.globalAlpha = clamp(alpha, 0, 1);
      context2d.lineWidth = width;
      context2d.beginPath();
      for (let step = 0; step <= 40; step += 1) {
        const latitude = -Math.PI / 2 + (step / 40) * Math.PI;
        const point = project({
          x: radius * Math.cos(latitude) * Math.cos(longitude + rotation),
          y: radius * Math.sin(latitude),
          z: radius * Math.cos(latitude) * Math.sin(longitude + rotation)
        }, canvasW, canvasH);
        if (step) context2d.lineTo(point.x, point.y); else context2d.moveTo(point.x, point.y);
      }
      context2d.stroke();
      context2d.restore();
    }

    function updateHelixBerths(now) {
      const hadBerths = helixBerths.size > 0;
      helixBerths.clear();
      const groups = { A: [], B: [] };
      nodes.forEach(node => { (node.series === "B" ? groups.B : groups.A).push(node); });
      const perNode = new Map();
      nodes.forEach(node => {
        const observation = latestForNode(node);
        perNode.set(node.id, { observation, metrics: helixMetricsForMarket(observation && observation.market) });
      });
      const targetP = id => {
        const entry = perNode.get(id);
        return entry && entry.metrics.held ? 0.5 : entry.metrics.p;
      };
      const byPosition = (x, y) => (targetP(x.id) - targetP(y.id)) || (x.symbol < y.symbol ? -1 : x.symbol > y.symbol ? 1 : 0);
      const ranked = { A: [...groups.A].sort(byPosition), B: [...groups.B].sort(byPosition) };
      const pairCount = Math.max(ranked.A.length, ranked.B.length);
      const dt = state.helix.lastT ? Math.max(0, Math.min(120, now - state.helix.lastT)) : 16;
      const glide = 1 - Math.exp(-dt / 650);
      let held = 0;
      ["A", "B"].forEach(series => {
        const strand = ranked[series];
        strand.forEach((node, rank) => {
          const entry = perNode.get(node.id) || { observation: null, metrics: helixMetricsForMarket(null) };
          const metrics = entry.metrics;
          if (metrics.held) held += 1;
          const target = tickerPairAnchor(rank, pairCount, series);
          const previous = state.helix.glide.get(node.id) || target.position;
          const position = {
            x: previous.x + (target.position.x - previous.x) * glide,
            y: previous.y + (target.position.y - previous.y) * glide,
            z: previous.z + (target.position.z - previous.z) * glide
          };
          state.helix.glide.set(node.id, position);
          const market = entry.observation && entry.observation.market;
          const changePct = market ? numeric(market.changePct) : null;
          helixBerths.set(node.id, {
            latitude: target.latitude,
            longitude: target.longitude,
            position,
            pairIndex: rank,
            series,
            rank,
            p: metrics.held ? null : metrics.p,
            held: metrics.held,
            metrics,
            observation: entry.observation,
            direction: changePct === null ? null : changePct > 0 ? 1 : changePct < 0 ? -1 : 0
          });
        });
      });
      state.helix.lastT = now;
      helixState.ranked = ranked;
      helixState.counts = { a: ranked.A.length, b: ranked.B.length };
      helixState.rungs = Math.min(ranked.A.length, ranked.B.length);
      helixState.held = held;
      /* The first frame that settles the inner ticker spheroids also refreshes
         the inspector, so its strand/band/rung readouts never stay on the
         pre-render "settling" row after the geometry is live. */
      if (!hadBerths && helixBerths.size > 0) drawInspector();
      return helixState;
    }

    /* The latitude rings become the Fibonacci band scale: the lower band at the
       bottom ring, the basis at the equator, the upper band at the top ring,
       with the 0.618 levels between. */
    function drawFibRings(width, height) {
      const levels = [
        { p: 0, label: "LOWER 1.000", color: "#516983", alpha: 0.22 },
        { p: 0.191, label: "L 0.618", color: "#516983", alpha: 0.16 },
        { p: 0.5, label: "BASIS", color: "#6fd3ff", alpha: 0.38 },
        { p: 0.809, label: "U 0.618", color: "#516983", alpha: 0.16 },
        { p: 1, label: "UPPER 1.000", color: "#516983", alpha: 0.22 }
      ];
      context2d.save();
      context2d.font = "8px ui-monospace, SFMono-Regular, Menlo, monospace";
      levels.forEach(level => {
        const latitude = bandLatitude(level.p);
        ring(latitude, width, height, level.color, level.alpha);
        const anchor = project({ x: 0, y: SPHERE_RADIUS * Math.sin(latitude), z: 0 }, width, height);
        context2d.globalAlpha = 0.82 * state.formation;
        context2d.fillStyle = level.color;
        context2d.textAlign = "right";
        context2d.fillText(level.label, width - 10, anchor.y - 3);
      });
      const caption = project({ x: 0, y: SPHERE_RADIUS * Math.sin(HELIX_LAT_MAX), z: 0 }, width, height);
      context2d.globalAlpha = 0.6 * state.formation;
      context2d.fillStyle = "#8fa7c4";
      context2d.fillText("FIBONACCI BANDS", width - 10, caption.y - 14);
      context2d.restore();
    }

    /* Fine intra-series links stitch neighboring ticker spheroids into two
       readable chains across the nested field; unlike the old end-to-end
       clusters, every chain segment terminates at an individual ticker orb. */
    function drawHelixStrandLinks(outerMod) {
      if (!helixState.ranked) return;
      const pointById = new Map(state.projected.map(point => [point.node.id, point]));
      const breath = outerMod && outerMod.active ? 0.85 + clamp(outerMod.energy, 0, 1) * 0.3 : 1;
      [
        { series: "A", color: "#6fd3ff" },
        { series: "B", color: "#ffc857" }
      ].forEach(({ series, color }) => {
        const strand = helixState.ranked[series];
        for (let index = 1; index < strand.length; index += 1) {
          const previous = pointById.get(strand[index - 1].id);
          const current = pointById.get(strand[index].id);
          if (!previous || !current) continue;
          const depth = clamp(0.35 + (1 - ((previous.z + current.z) / 2) / 5) * 0.32, 0.3, 1);
          line(previous, current, color, 0.16 * breath * depth, 0.72, [2, 4]);
        }
      });
    }

    /* Cross-series rungs: each rank-matched pair of ticker spheroids receives
       its own connector, colored by directional agreement, brightened by
       combined potential energy and the outer flame's breath. */
    function drawHelixRungs(outerMod) {
      if (!helixState.ranked) return;
      const pointById = new Map(state.projected.map(point => [point.node.id, point]));
      const count = Math.min(helixState.ranked.A.length, helixState.ranked.B.length);
      for (let index = 0; index < count; index += 1) {
        const nodeA = helixState.ranked.A[index];
        const nodeB = helixState.ranked.B[index];
        const pointA = pointById.get(nodeA.id);
        const pointB = pointById.get(nodeB.id);
        if (!pointA || !pointB) continue;
        const berthA = helixBerths.get(nodeA.id);
        const berthB = helixBerths.get(nodeB.id);
        const directionA = berthA ? berthA.direction : null;
        const directionB = berthB ? berthB.direction : null;
        const dash = directionA === null || directionB === null ? [4, 4] : [];
        const color = directionA === null || directionB === null ? DATA_COLORS.unknown
          : directionA > 0 && directionB > 0 ? DATA_COLORS.priceUp
          : directionA < 0 && directionB < 0 ? DATA_COLORS.priceDown
          : directionA === directionB ? DATA_COLORS.priceFlat
          : "#ffc857";
        const potentialA = berthA && !berthA.held ? berthA.metrics.potential : 0;
        const potentialB = berthB && !berthB.held ? berthB.metrics.potential : 0;
        const potential = (potentialA + potentialB) / 2;
        const depth = clamp(0.32 + (1 - ((pointA.z + pointB.z) / 2) / 5) * 0.34, 0.3, 1);
        const alpha = (0.16 + 0.4 * potential) * (outerMod && outerMod.active ? 0.8 + 0.4 * clamp(outerMod.energy, 0, 1) : 1) * depth;
        line(pointA, pointB, color, alpha, 0.9 + 0.5 * potential, dash);
      }
    }

    /* ── The Orb's fractal frame processing, carried into Orb 2 ──────────
       Surface: the shared OrbFilm film (200 author frames, bounce clock)
       wrapped onto this model's node shell through rotate3()/toScreen().
       Core: the shared Demo.flame IFS player — the same core that burns in
       The Orb — drawn additively at Center Origin. Brightness follows the
       same legitimacy gate as The Orb (α = 0.22 + 0.78·L(t)); the render is
       display-only and encodes no market meaning. Both sources resolve
       lazily and degrade to the plain wire core when unavailable. */
    /* The .flame frames are authored 3D animations (ApophysisAV). Rather than
       pasting each frame on as a camera-facing billboard, the flame's reference
       triangle — the O-X-Y basis every IFS point is expressed against — is
       rotated in 3D (a slow precession with a breathing tilt) and the frame is
       projected through this model's own camera as an oriented quad. The
       ApophysisAV render is untouched; only its placement in the orb gains
       depth. Falls back to the shared billboard drawOn when the player does
       not expose its bounce frames. */
    function drawFlameCore3D(flame, center, size, alpha, width, height, energy, dpr = 1) {
      if (!flame || typeof flame.playhead !== "function" || !Array.isArray(flame.frames)) return false;
      const playhead = flame.playhead();
      const frame0 = flame.frames[playhead && playhead.i0];
      const frame1 = flame.frames[playhead && playhead.i1];
      if (!frame0 || typeof frame0.width !== "number" || frame0.width < 1) return false;
      /* The requested core size is in screen pixels; the reference triangle
         lives in model units. Convert through the center's projected scale so
         the quad occupies the same on-screen footprint the billboard would. */
      const unitPixels = Math.max(1, (center.scale || 1) * Math.min(width, height) * MODEL_VIEW_SCALE);
      const half = (size / 2) / unitPixels;
      const t = state.coreTime;
      /* Reference-triangle rotation: in-plane spin, a tilt that never sits the
         plane flat (and never turns it edge-on), and a gentle yaw swing — all
         breathing with the flame's own harmonic energy. */
      const spin = t * 0.00012;
      const tilt = 0.95 + Math.sin(t * 0.00021) * 0.24 + (energy - 0.5) * 0.08;
      const yaw = Math.sin(t * 0.00017) * 0.3;
      const cSpin = Math.cos(spin), sSpin = Math.sin(spin);
      const cTilt = Math.cos(tilt), sTilt = Math.sin(tilt);
      const cYaw = Math.cos(yaw), sYaw = Math.sin(yaw);
      const referenceCorner = (u, v) => {
        /* Rz(spin) · Rx(tilt) · Ry(yaw) applied to the basis point (u, v, 0). */
        const x1 = u * cSpin - v * sSpin;
        const y1 = u * sSpin + v * cSpin;
        const y2 = y1 * cTilt;
        const z2 = y1 * sTilt;
        const x3 = x1 * cYaw + z2 * sYaw;
        const z3 = -x1 * sYaw + z2 * cYaw;
        return project({ x: x3 * half, y: y2 * half, z: z3 * half }, width, height);
      };
      const p00 = referenceCorner(-1, -1);
      const p10 = referenceCorner(1, -1);
      const p01 = referenceCorner(-1, 1);
      const edgeX = Math.hypot(p10.x - p00.x, p10.y - p00.y);
      const edgeY = Math.hypot(p01.x - p00.x, p01.y - p00.y);
      if (edgeX < 8 || edgeY < 8) return true; /* nearly edge-on to the camera */
      const frac = playhead.frac || 0;
      const alpha0 = alpha * Math.cos(frac * (Math.PI / 2));
      const alpha1 = alpha * Math.sin(frac * (Math.PI / 2));
      context2d.save();
      context2d.globalCompositeOperation = "lighter";
      context2d.imageSmoothingEnabled = true;
      const pixelRatio = Math.max(1, Number(dpr) || 1);
      const quadTransform = frame => {
        context2d.setTransform(
          (p10.x - p00.x) / frame.width * pixelRatio, (p10.y - p00.y) / frame.width * pixelRatio,
          (p01.x - p00.x) / frame.height * pixelRatio, (p01.y - p00.y) / frame.height * pixelRatio,
          p00.x * pixelRatio, p00.y * pixelRatio
        );
        context2d.drawImage(frame, 0, 0);
      };
      if (alpha0 > 0.01) { context2d.globalAlpha = alpha0; quadTransform(frame0); }
      if (frame1 && frac > 0.002 && alpha1 > 0.01) { context2d.globalAlpha = alpha1; quadTransform(frame1); }
      context2d.restore();
      return true;
    }

    function drawFractalFrames(now, frameDelta, center, width, height, dpr) {
      const filmApi = orbFilmApi();
      const film = filmApi && typeof filmApi.shared === "function" ? filmApi.shared() : null;
      const flame = flameCore();
      const outer = outerFlamePlayer();
      const fMod = flame && typeof flame.flameModulation === "function" ? flame.flameModulation() : null;
      const outerMod = outer && typeof outer.flameModulation === "function" ? outer.flameModulation() : null;

      /* 0 · the shared OrbFilm surface — the author's 200-frame film wrapped
         through this model's own camera. The clock advances with frame time
         coupled to the inner flame's harmonic speed, exactly as The Orb drives
         it, and adjacent sub-frames cross-fade at equal energy. */
      if (filmApi && film) {
        if (film.ready && typeof filmApi.drawWrapped === "function") {
          state.filmTime += (frameDelta || 16) * ((fMod && fMod.speedMult) || 1);
          const sample = film.sampleAt ? film.sampleAt(state.filmTime) : null;
          const alpha = (0.22 + 0.78 * legitimacyGate()) * 0.34;
          if (sample && (sample.img0 || sample.img1) && alpha > 0.01) {
            const frac = sample.frac || 0;
            const alpha0 = alpha * Math.cos(frac * (Math.PI / 2));
            const alpha1 = alpha * Math.sin(frac * (Math.PI / 2));
            if (sample.img0 && alpha0 > 0.01) {
              filmApi.drawWrapped(context2d, {
                img: sample.img0, project: rotate3, toScreen: point => toScreen(point, width, height),
                cs: center, R: SPHERE_RADIUS, fov: CAMERA_DISTANCE / state.zoom, alpha: alpha0, dpr
              });
            }
            if (sample.img1 && alpha1 > 0.01 && frac > 0.002) {
              filmApi.drawWrapped(context2d, {
                img: sample.img1, project: rotate3, toScreen: point => toScreen(point, width, height),
                cs: center, R: SPHERE_RADIUS, fov: CAMERA_DISTANCE / state.zoom, alpha: alpha1, dpr
              });
            }
          }
        }
      }

      /* 1 · the AI inner shell — Demo.flame's 120-frame harmonics govern the
         burning core at Center Origin and a small counter-rotating wireframe
         shell around it, as in The Orb. */
      const dt = (frameDelta || 16) / 1000;
      state.coreTime = (state.coreTime || 0) + (frameDelta || 16) * ((fMod && fMod.speedMult) || 1);
      const innerSpeed = (fMod && fMod.speedMult) || 1;
      state.innerAngle += dt * 0.4 * innerSpeed;
      let coreLive = false;
      if (flame && flame.ready && Array.isArray(flame.frames) && flame.frames.length) {
        const energy = fMod && fMod.active ? clamp(fMod.energy, 0, 1) : 0.5;
        const coreAlpha = (0.22 + 0.78 * legitimacyGate()) * 0.9;
        const coreSize = 44 + energy * 18;
        /* Prefer the 3D reference-triangle placement; the shared billboard
           drawOn remains the honest fallback for any player that does not
           expose its bounce frames. */
        if (!drawFlameCore3D(flame, center, coreSize, coreAlpha, width, height, energy, dpr)
          && typeof flame.drawOn === "function") {
          flame.drawOn(context2d, center.x, center.y, coreSize, coreAlpha);
        }
        const shellRadius = 0.62 + (fMod && fMod.active ? fMod.pulse * 0.03 : 0);
        const shellAlpha = fMod && fMod.active ? 0.28 + 0.14 * energy : 0.35;
        circle3D(shellRadius, 0, state.innerAngle, "#4a9eff", shellAlpha * state.formation, 1, width, height);
        circle3D(shellRadius, 0.45, -state.innerAngle * 0.8, "#4a9eff", (shellAlpha - 0.1) * state.formation, 1, width, height);
        meridian3D(shellRadius, 0, state.innerAngle, "#4a9eff", (shellAlpha - 0.08) * state.formation, 1, width, height);
        meridian3D(shellRadius, Math.PI / 2, -state.innerAngle, "#4a9eff", (shellAlpha - 0.08) * state.formation, 1, width, height);
        const anchor = project({ x: 0, y: shellRadius, z: 0 }, width, height);
        context2d.save();
        context2d.fillStyle = "#ffd479";
        context2d.globalAlpha = 0.85 * state.formation;
        context2d.beginPath(); context2d.arc(anchor.x, anchor.y, 2.6, 0, TAU); context2d.fill();
        context2d.restore();
        coreLive = true;
      }

      /* 2 · the outer macro-flame — OuterOrb.flame (600 frames) never draws
         pixels here; its harmonics govern the counter-rotating depth shells
         and (via drawHelixRungs) the rungs' breath, exactly as The Orb's
         outer system governs its depth shells and nodes. */
      const outerSpeed = ((outerMod && outerMod.active ? outerMod.speedMult : 1) || 1) * innerSpeed;
      state.outerAngle1 += dt * 0.25 * outerSpeed;
      state.outerAngle2 -= dt * 0.18 * outerSpeed;
      if (outer && outer.ready && Array.isArray(outer.frames) && outer.frames.length) {
        const energy = outerMod && outerMod.active ? clamp(outerMod.energy, 0, 1) : 0.5;
        const pulse = outerMod && outerMod.active ? outerMod.pulse * 0.06 : 0;
        const outerAlpha = outerMod && outerMod.active ? 0.22 + 0.14 * energy : 0.22;
        [[1.15, -0.42 * 0.9, state.outerAngle1, 1], [1.8, 0.5 * 0.9, state.outerAngle2, -0.8]].forEach(([radius, tilt, rotation, pulseSign]) => {
          circle3D(radius + pulse * pulseSign, tilt, rotation, "#243a63", outerAlpha * state.formation, 1 + (outerMod && outerMod.active ? energy * 0.6 : 0), width, height);
        });
      }
      return { coreLive, fMod, outerMod };
    }

    function drawCanvas(now) {
      if (!context2d || state.destroyed || !state.visible) return;
      const wallNow = Date.now();
      const { width, height, dpr } = canvasBounds();
      context2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      context2d.clearRect(0, 0, width, height);
      const background = context2d.createRadialGradient(width * 0.48, height * 0.42, 2, width * 0.5, height * 0.5, Math.max(width, height) * 0.7);
      background.addColorStop(0, "#101d35");
      background.addColorStop(0.54, "#0a1222");
      background.addColorStop(1, "#060b14");
      context2d.fillStyle = background;
      context2d.fillRect(0, 0, width, height);
      const frameDelta = state.lastFrame ? Math.max(0, Math.min(80, now - state.lastFrame)) : 16;
      if (state.autoRotate && !state.dragging) {
        state.yaw += frameDelta * 0.00013;
      }
      state.lastFrame = now;
      /* Band rank places each dual-series pair at its own site on the inner
         ticker spheroid; all nodes share the same eased camera geometry. */
      const helix = tickerMode && state.seriesMode === "dual" ? updateHelixBerths(now) : null;
      const center = project({ x: 0, y: 0, z: 0 }, width, height);
      drawSphericalShell(width, height, center);
      /* The Orb's fractal frame processing — film surface under the model,
         dual flame system (Demo.flame core + OuterOrb.flame shells) at Center
         Origin; both degrade to wire when unavailable. */
      let fractal = { coreLive: false, fMod: null, outerMod: null };
      if (state.showFractal) fractal = drawFractalFrames(now, frameDelta, center, width, height, dpr);
      drawSphereGrid(width, height);
      drawTickerOrbField(width, height);
      if (helix) {
        drawFibRings(width, height);
        drawHelixScaffold(width, height, fractal.outerMod);
      } else {
        ring(0, width, height, "#6fd3ff", 0.25);
      }
      state.projected = nodes.map(node => {
        const observation = latestForNode(node);
        const directive = displayMotion(observation, now);
        const model = modelPoint(node, now, directive);
        const screen = project(model, width, height);
        const berth = helixBerths.get(node.id);
        const orbRadius = tickerMode ? tickerOrbWorldRadius(berth) : 0;
        const visualRadius = tickerMode ? orbRadius * Math.min(width, height) * MODEL_VIEW_SCALE * screen.scale : 0;
        return { ...screen, model, orbRadius, visualRadius, node, observation, directive };
      });
      state.projected.forEach((point, index) => drawActivity(point, center, now, wallNow, index));
      drawRoute(now, center);
      if (helix) {
        drawHelixStrandLinks(fractal.outerMod);
        drawHelixRungs(fractal.outerMod);
      }
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
        const radius = clamp(3.2 + point.scale * 2.5 + (chosen ? 1.9 : 0) + pulse * 1.6, 3, 9);
        const berth = helixBerths.get(node.id);
        const visualRadius = tickerMode ? Math.max(radius, point.visualRadius) : radius;
        if (tickerMode) drawTickerSpheroid(point, width, height, color, berth, chosen, hovered);
        if (berth) {
          /* Supplied band width widens the spheroid's volatility ring; potential
             energy feeds its core glow; a signaled band break flashes gold; a
             held orb gets a dashed neutral ring. No missing field is inferred. */
          const volatility = berth.metrics.volatility;
          if (volatility !== null) {
            context2d.save();
            context2d.strokeStyle = "#9fb6d4";
            context2d.globalAlpha = 0.1 + 0.28 * volatility;
            context2d.lineWidth = 0.8;
            const ringRadius = tickerMode ? visualRadius * (1.12 + volatility * 0.3) : radius * (1.3 + volatility * 0.6);
            context2d.beginPath(); context2d.arc(point.x, point.y, ringRadius, 0, TAU); context2d.stroke();
            context2d.restore();
          }
          if (berth.metrics.breakSide) {
            context2d.save();
            context2d.strokeStyle = "#ffd479";
            context2d.globalAlpha = 0.5 + 0.25 * Math.sin(now / 140);
            context2d.lineWidth = 1.2;
            const breakRadius = tickerMode ? visualRadius + 5 + Math.sin(now / 140) : radius * (2 + 0.22 * Math.sin(now / 140));
            context2d.beginPath(); context2d.arc(point.x, point.y, breakRadius, 0, TAU); context2d.stroke();
            context2d.restore();
          }
          if (berth.held) {
            context2d.save();
            context2d.strokeStyle = "#516983";
            context2d.globalAlpha = 0.45;
            context2d.lineWidth = 0.9;
            context2d.setLineDash([3, 4]);
            context2d.beginPath(); context2d.arc(point.x, point.y, tickerMode ? visualRadius + 4 : radius + 4, 0, TAU); context2d.stroke();
            context2d.restore();
          }
        }
        drawProviderHalo(point, visualRadius, observation, wallNow);
        context2d.save();
        context2d.globalAlpha = observation && observation.market ? clamp(0.42 + fresh * 0.5, 0.42, 0.96) : clamp(0.32 + (1 - point.z / 5) * 0.34, 0.3, 1);
        context2d.fillStyle = color;
        context2d.shadowBlur = (chosen || hovered || (directive && !directive.frozen) ? 22 : 9) + (berth && !berth.held ? berth.metrics.potential * 14 : 0);
        context2d.shadowColor = color;
        context2d.beginPath(); context2d.arc(point.x, point.y, radius, 0, TAU); context2d.fill();
        if (chosen || hovered) {
          context2d.strokeStyle = "#ffffff"; context2d.globalAlpha = 0.9; context2d.lineWidth = 1;
          context2d.beginPath(); context2d.arc(point.x, point.y, visualRadius + 3, 0, TAU); context2d.stroke();
        }
        context2d.restore();
        drawDataBits(point, visualRadius, observation);
        if (state.labels || chosen || hovered) {
          context2d.save();
          context2d.globalAlpha = chosen || hovered ? 1 : 0.72;
          context2d.fillStyle = "#edf6ff";
          context2d.font = `${chosen ? 11 : 9}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          context2d.textAlign = point.x > width * 0.52 ? "left" : "right";
          const offset = point.x > width * 0.52 ? visualRadius + 5 : -visualRadius - 5;
          const tag = `${node.series && (chosen || hovered) ? " · " + node.series : ""}${berth && berth.held && (chosen || hovered) ? " · HELD" : ""}`;
          context2d.fillText(`${node.symbol || node.name}${tag}`, point.x + offset, point.y - visualRadius - 4);
          context2d.restore();
        }
      });
      context2d.save();
      /* When the shared fractal core is burning, it replaces the plain center dot;
         the resolution ring and CENTER label remain so the origin stays legible. */
      if (!fractal.coreLive) {
        context2d.fillStyle = state.pending ? "#6fd3ff" : "#ffd479";
        context2d.shadowBlur = state.pending ? 30 + Math.sin(now / 65) * 9 : 24;
        context2d.shadowColor = state.pending ? "#6fd3ff" : "#ffd479";
        context2d.beginPath(); context2d.arc(center.x, center.y, state.pending ? 9 : 7, 0, TAU); context2d.fill();
      }
      context2d.shadowBlur = 0;
      context2d.strokeStyle = "rgba(255,212,121,.8)";
      context2d.lineWidth = 1;
      context2d.beginPath(); context2d.arc(center.x, center.y, 13, 0, TAU); context2d.stroke();
      context2d.fillStyle = "#fff2c6";
      context2d.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
      context2d.textAlign = "center";
      context2d.fillText("CENTER", center.x, center.y + 29);
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
        const hitRadius = Math.max(18, (point.visualRadius || 0) + 5);
        if (d < distance && d < hitRadius) { winner = point.node.order; distance = d; }
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
    if (fractalToggle) fractalToggle.addEventListener("change", () => {
      state.showFractal = !!fractalToggle.checked;
      persistLocal();
      scheduleRender();
    });

    /* ── Double-helix series controls ──────────────────────────────
       Two reviewed ticker sets, strand against strand. Series changes
       rearrange nodes locally; they never force a provider request. */
    function applySeriesNodes() {
      if (!tickerMode) return;
      const base = buildNodes(options.tickers, timeframe === "1d" ? "1d" : "1h");
      let strandCounts = { a: 0, b: 0 };
      if (state.seriesMode === "dual") {
        const bySymbol = new Map(base.map(node => [node.symbol, node]));
        const strand = (symbols, series) => symbols.map(symbol => bySymbol.get(symbol)).filter(Boolean)
          .map(node => Object.freeze({ ...node, id: `${node.id}-${series.toLowerCase()}`, series }));
        const a = strand(state.seriesA, "A");
        const b = strand(state.seriesB, "B");
        strandCounts = { a: a.length, b: b.length };
        nodes = Object.freeze([...a, ...b].map((node, index) => Object.freeze({ ...node, order: index })));
      } else {
        nodes = base;
      }
      nodeIndexByName = new Map(nodes.map((node, index) => [state.seriesMode === "dual" ? node.id : node.name, index]));
      state.selected = 0;
      state.route = null;
      state.lastRoutePhase = "";
      state.helix.glide.clear();
      state.helix.lastT = 0;
      helixBerths.clear();
      helixState.ranked = null;
      helixState.counts = { ...strandCounts };
      helixState.rungs = Math.min(strandCounts.a, strandCounts.b);
      helixState.held = 0;
    }
    applySeriesNodes();

    function applySeriesInput(input, seriesKey, label) {
      const parsed = parseSeriesInput(input.value);
      const unknown = [...new Set(parsed.filter(symbol => !reviewedSymbolSet.has(symbol)))];
      const valid = [...new Set(parsed.filter(symbol => reviewedSymbolSet.has(symbol)))];
      if (!valid.length) {
        state.message = {
          kind: "note",
          text: `Series ${label} was left unchanged: no reviewed watchlist symbol was recognized${unknown.length ? ` (${unknown.join(", ")} not reviewed)` : ""}. No node was invented.`
        };
        input.value = state[seriesKey].join(", ");
        draw();
        return;
      }
      state[seriesKey] = valid;
      state.message = {
        kind: "note",
        text: unknown.length
          ? `Series ${label} drawn without ${unknown.length} unreviewed symbol${unknown.length === 1 ? "" : "s"} (${unknown.join(", ")}); only reviewed watchlist symbols are drawn.`
          : `Series ${label} set to ${valid.length} reviewed ticker${valid.length === 1 ? "" : "s"}. The double helix rearranges locally; no new provider request is forced.`
      };
      persistLocal();
      applySeriesNodes();
      syncNodeOptions();
      syncFormControls();
      drawInspector();
      draw();
    }
    if (seriesModeSelect) seriesModeSelect.addEventListener("change", () => {
      state.seriesMode = seriesModeSelect.value === "single" ? "single" : "dual";
      state.message = {
        kind: "note",
        text: state.seriesMode === "dual"
          ? "Double helix: each reviewed ticker gets its own orb on an inner spheroid; rank-matched Series A/B pairs link individually by supplied band position."
          : "Single set: every reviewed watchlist orb returns to the sector sphere."
      };
      persistLocal();
      applySeriesNodes();
      syncNodeOptions();
      drawInspector();
      draw();
    });
    if (seriesAInput) seriesAInput.addEventListener("change", () => applySeriesInput(seriesAInput, "seriesA", "A"));
    if (seriesBInput) seriesBInput.addEventListener("change", () => applySeriesInput(seriesBInput, "seriesB", "B"));
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
      state.selected = 0;
      state.route = null;
      state.lastRoutePhase = "";
      if (timeframeSelect) timeframeSelect.value = timeframe;
      applySeriesNodes();
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
        if (currentProvider() === "tickerbot") {
          state.message = { kind: "note", text: "Tickerbot is on-demand in Characters. Choose Beat now; no automatic Tickerbot request is scheduled." };
          draw();
        } else {
          await beatNow("open");
        }
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
    cadenceSelect.addEventListener("change", () => {
      state.cadence = validCadence(cadenceSelect.value);
      persistLocal(); draw(); schedule();
    });
    budgetInput.addEventListener("change", () => {
      state.budget = validBudget(budgetInput.value);
      budgetInput.value = String(state.budget);
      persistLocal(); draw();
    });
    focusSelect.addEventListener("change", () => {
      state.focus = focusSelect.value;
      const berth = stage && stage.berths.find(entry => entry.symbol === state.focus);
      if (berth && berth.npc) state.selected = nodeIndexByName.get(berth.npc.name) ?? state.selected;
      draw();
    });
    autoButton.addEventListener("click", toggleAuto);
    beatButton.addEventListener("click", () => beatNow("manual"));
    featureButtons.forEach(button => button && button.addEventListener("click", toggleFeatured));
    stretchBox.addEventListener("change", () => { state.stretch = stretchBox.checked; draw(); });
    tierBox.addEventListener("change", () => {
      state.tierMode = tierBox.checked;
      state.message = { kind: "note", text: state.tierMode
        ? "Characters two-lane mode enabled: featured Tickerbot berths take the hot lane; the rest rotate through the sweep within the same call budget."
        : "Characters two-lane mode disabled: the least-recently-refreshed rotation is active." };
      persistLocal(); draw();
    });

    const documentRef = host.ownerDocument || globalThis.document;
    const onFullscreenChange = () => {
      fallbackFullscreen = false;
      drawStatus();
      scheduleRender();
    };
    const onVisibilityChange = () => {
      if (documentRef && documentRef.hidden) {
        clearBeatTimer();
        state.message = { kind: "note", text: "Auto-beat paused while this page is hidden — no provider calls are spent." };
        drawStatus();
      } else if (state.visible) {
        schedule();
        scheduleRender();
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

    // A one-second text-only clock makes provider warm-up and the next due beat visible.
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
      get helixState() {
        return {
          mode: tickerMode ? state.seriesMode : "roster",
          seriesA: [...state.seriesA],
          seriesB: [...state.seriesB],
          strands: { ...helixState.counts },
          rungs: helixState.rungs,
          held: helixState.held,
          positions: helixState.ranked ? ["A", "B"].flatMap(series =>
            helixState.ranked[series].map((node, rank) => {
              const berth = helixBerths.get(node.id);
              return berth ? {
                symbol: node.symbol, series, rank, pairIndex: berth.pairIndex,
                p: berth.p, held: berth.held,
                latitude: berth.latitude, longitude: berth.longitude,
                x: berth.position.x, y: berth.position.y, z: berth.position.z,
                orbRadius: tickerOrbWorldRadius(berth)
              } : null;
            }).filter(Boolean)) : []
        };
      },
      state,
      selectNode,
      beatNow,
      refreshHistory: loadServerHistory,
      setVisible,
      destroy
    });
  }

  window.GoodIntelligenceOrb2 = Object.freeze({
    SCHEMA, BEAT_SCHEMA, CENTER_ADDRESS, PALETTE, MOOD_COLORS, PROVIDER_COLORS, DATA_COLORS, PROVIDER_COOLDOWN_MS,
    dataBitsForMarket, flowPathForObservation, buildNodes, mount, getSavedBeatSessionId
  });
})();
