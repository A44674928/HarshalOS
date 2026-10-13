/*
 * Read/write a small, anonymous Orb 2 market-beat history.
 *
 * This route stores only provider observations and the deterministic, display-only
 * CharactersBeat directive already returned to the browser. It does not trigger an
 * upstream request, authorize an action, or accept arbitrary bar histories. A random
 * per-browser session id is an opaque storage key; the payload contains no credentials
 * or personal profile data. Writes are same-origin and bounded to at most 120 records
 * per session.
 */

export const ORB2_BEATS_ROUTE = "/api/good-intelligence/v1/orb2/beats";
export const ORB2_BEAT_SCHEMA = "gi-orb2-beat-v1";
export const ORB2_BEAT_HISTORY_SCHEMA = "gi-orb2-beat-history-v1";
export const ORB2_BEAT_HISTORY_LIMIT = 120;
/* Expired rows one save may retire. See orb2-saved-beats.mjs: D1 charges a row
   written per b-tree, and this table has four of them. */
export const ORB2_BEAT_EXPIRED_ROWS_PER_WRITE = 200;
const MAX_BODY_BYTES = 48 * 1024;
const MAX_BEAT_BYTES = 40 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/* The six reviewed Fibonacci envelopes kept on each stored market record. */
const ORB2_BAND_LEVELS = Object.freeze([236, 382, 500, 618, 764, 1000]);
const DISC_IDS = new Set(["stocks", "fx", "crypto", "commodities", "futures", "indices"]);
const PROVIDERS = new Set(["massive", "tickerbot", "kraken", "rehearsal"]);
const INTERVALS = new Set(["15m", "1h", "1d"]);
const STATUSES = new Set(["bars", "cached", "rehearsal", "unavailable"]);
const ANALYSIS_STATUSES = new Set(["ready", "partial", "warming-up", "no-data", "unavailable", "missing", "unknown"]);
const DATA_SHAPES = new Set(["ohlcv", "ohlc", "value", "unknown"]);
const MOODS = new Set(["frozen", "warming-up", "drift", "lean-up", "lean-down", "rally", "selloff", "churn", "coil", "surge", "flinch", "unknown"]);
const FORMATIONS = new Set(["ring", "tight", "rim", "column", "scatter"]);
const ITEM_LANES = new Set(["stationary", "inbound", "outbound"]);
const REASONS = new Set(["manual", "auto", "open", "disc-change", "interval-change", "rehearsal", "ignition", "field"]);

const json = (data, status = 200) => Response.json(data, {
  status,
  headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
});
const failure = (message, status = 400) => json({ success: false, message }, status);
const isRecord = value => value && typeof value === "object" && !Array.isArray(value);
const text = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
const finite = value => typeof value === "number" && Number.isFinite(value);
const bounded = (value, low, high, fallback = null) => finite(value) ? Math.max(low, Math.min(high, value)) : fallback;
const integer = (value, low, high, fallback = null) => finite(value) && Number.isSafeInteger(value)
  ? Math.max(low, Math.min(high, value)) : fallback;

function safeBar(value) {
  if (!isRecord(value)) return null;
  const time = integer(value.time, 0, 8_640_000_000_000, null);
  const close = bounded(value.close, 0.000000001, 1e15, null);
  if (time === null || close === null) return null;
  const open = bounded(value.open, 0.000000001, 1e15, null);
  const high = bounded(value.high, 0.000000001, 1e15, null);
  const low = bounded(value.low, 0.000000001, 1e15, null);
  const volume = bounded(value.volume, 0, 1e18, null);
  const hasAnyOhlc = [open, high, low].some(item => item !== null);
  const hasAllOhlc = [open, high, low].every(item => item !== null);
  if (hasAnyOhlc !== hasAllOhlc) return null;
  if (hasAllOhlc && (high < Math.max(open, close) || low > Math.min(open, close) || high < low)) return null;
  return {
    time,
    ...(hasAllOhlc ? { open, high, low } : {}),
    close,
    ...(volume !== null ? { volume } : {}),
    confirmed: value.confirmed === true
  };
}

/* Shared with the server-side Orb 2 field (worker/orb2-field.mjs). One validator
   covers the compact market summary and the Characters motion directive, so a
   server-written observation and a browser-written one cannot diverge. */
export function safeMotion(value) {
  if (!isRecord(value)) return null;
  const mood = MOODS.has(value.mood) ? value.mood : "unknown";
  const gaugeValue = isRecord(value.gauge) ? value.gauge : {};
  const npcValue = isRecord(value.npc) ? value.npc : {};
  const objectValue = isRecord(value.object) ? value.object : {};
  const itemValue = isRecord(value.item) ? value.item : {};
  const formation = FORMATIONS.has(npcValue.formation) ? npcValue.formation : "ring";
  const lane = ITEM_LANES.has(itemValue.lane) ? itemValue.lane : "stationary";
  const numberOr = (input, low, high) => bounded(input, low, high, 0);
  const marks = Array.isArray(value.marks)
    ? value.marks.filter(item => typeof item === "string").slice(0, 6).map(item => text(item, 96))
    : [];
  return {
    schema: "characters-market-motion-v1",
    symbol: text(value.symbol, 32),
    status: ANALYSIS_STATUSES.has(value.status) ? value.status : "unknown",
    synthetic: value.synthetic === true,
    source: text(value.source, 160),
    volumeAvailable: value.volumeAvailable === true,
    barCount: integer(value.barCount, 0, 5000, 0),
    mood,
    frozen: value.frozen === true,
    marks,
    gauge: {
      bias: numberOr(gaugeValue.bias, -1, 1),
      flow: numberOr(gaugeValue.flow, -1, 1),
      heat: numberOr(gaugeValue.heat, 0, 1),
      charge: numberOr(gaugeValue.charge, 0, 1),
      crowd: numberOr(gaugeValue.crowd, 0, 1),
      volumeAvailable: gaugeValue.volumeAvailable === true,
      crowdAvailable: gaugeValue.crowdAvailable === true,
      flowAvailable: gaugeValue.flowAvailable === true,
      known: gaugeValue.known === true
    },
    npc: {
      speed: numberOr(npcValue.speed, 0, 1),
      stride: numberOr(npcValue.stride, 0, 1),
      jitter: numberOr(npcValue.jitter, 0, 1),
      bearing: numberOr(npcValue.bearing, -100, 100),
      formation,
      destBias: numberOr(npcValue.destBias, -1, 1)
    },
    object: {
      sway: numberOr(objectValue.sway, 0, 1),
      pulse: numberOr(objectValue.pulse, 0, 1),
      aperture: numberOr(objectValue.aperture, 0, 1),
      tilt: numberOr(objectValue.tilt, -1, 1)
    },
    item: {
      rate: numberOr(itemValue.rate, 0, 2),
      bob: numberOr(itemValue.bob, 0, 1),
      spin: numberOr(itemValue.spin, 0, 1),
      lane
    },
    caption: text(value.caption, 320)
  };
}

function safeMassiveContract(value) {
  if (!isRecord(value) || value.provider !== "Massive") return null;
  const productCode = text(value.productCode, 8).toUpperCase();
  const ticker = text(value.ticker, 16).toUpperCase();
  const asOfDate = text(value.asOfDate, 10);
  const lastTradeDate = text(value.lastTradeDate, 10);
  const dateValid = date => /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(`${date}T00:00:00.000Z`)) && new Date(Date.parse(`${date}T00:00:00.000Z`)).toISOString().slice(0, 10) === date;
  if (!/^[A-Z0-9]{1,8}$/.test(productCode) ||
      !/^[A-Z0-9]{1,8}[FGHJKMNQUVXZ]\d{1,2}$/.test(ticker) || !ticker.startsWith(productCode) ||
      !dateValid(asOfDate) || !dateValid(lastTradeDate) || lastTradeDate < asOfDate) return null;
  const daysToMaturity = value.daysToMaturity;
  if (daysToMaturity !== undefined && (!Number.isInteger(daysToMaturity) || daysToMaturity < 0 || daysToMaturity > 1000)) return null;
  return {
    provider: "Massive", productCode, ticker, asOfDate, lastTradeDate,
    ...(daysToMaturity !== undefined ? { daysToMaturity } : {}),
    ...(typeof value.name === "string" && value.name.trim() ? { name: text(value.name, 120) } : {})
  };
}

export function safeMarket(value) {
  if (!isRecord(value)) return null;
  const massiveContract = value.massiveContract === null || value.massiveContract === undefined
    ? null : safeMassiveContract(value.massiveContract);
  if (value.massiveContract !== null && value.massiveContract !== undefined && !massiveContract) return null;
  const dataShape = DATA_SHAPES.has(value.dataShape) ? value.dataShape : "unknown";
  const status = ANALYSIS_STATUSES.has(value.status) ? value.status : "unknown";
  const latestBar = value.latestBar === null || value.latestBar === undefined ? null : safeBar(value.latestBar);
  const activityBar = value.activityBar === null || value.activityBar === undefined ? null : safeBar(value.activityBar);
  if (value.activityBar !== null && value.activityBar !== undefined && (!activityBar || activityBar.confirmed !== true)) return null;
  const fbbComparison = value.fbbComparison === null || value.fbbComparison === undefined ? null : safeFbbComparison(value.fbbComparison);
  if (value.fbbComparison !== null && value.fbbComparison !== undefined && !fbbComparison) return null;
  return {
    status,
    source: text(value.source, 160),
    ...(massiveContract ? { massiveContract } : {}),
    timeframe: text(value.timeframe, 24),
    dataShape,
    synthetic: value.synthetic === true,
    barCount: integer(value.barCount, 0, 5000, 0),
    volumeAvailable: value.volumeAvailable === true,
    latestBar,
    ...(activityBar ? { activityBar } : {}),
    previousClose: bounded(value.previousClose, 0.000000001, 1e15, null),
    changePct: bounded(value.changePct, -1_000_000, 1_000_000, null),
    basis: bounded(value.basis, -1e15, 1e15, null),
    bands: isRecord(value.bands) ? Object.fromEntries(ORB2_BAND_LEVELS.flatMap(level => [
      [`lower${level}`, bounded(value.bands[`lower${level}`], -1e15, 1e15, null)],
      [`upper${level}`, bounded(value.bands[`upper${level}`], -1e15, 1e15, null)]
    ])) : null,
    vfi: isRecord(value.vfi) ? {
      value: bounded(value.vfi.value, -1e12, 1e12, null),
      signal: bounded(value.vfi.signal, -1e12, 1e12, null),
      available: value.vfi.available === true
    } : null,
    ...(fbbComparison ? { fbbComparison } : {}),
    waveTrend: isRecord(value.waveTrend) ? {
      wt1: bounded(value.waveTrend.wt1, -1e12, 1e12, null),
      wt2: bounded(value.waveTrend.wt2, -1e12, 1e12, null),
      zone: text(value.waveTrend.zone, 48)
    } : null
  };
}

function safeFbbComparison(value) {
  if (!isRecord(value)) return null;
  const safeVariant = variant => {
    if (!isRecord(variant)) return null;
    const id = text(variant.id, 16);
    if (id !== "FBB-200" && id !== "FBB-L60") return null;
    const status = variant.status === "available" || variant.status === "insufficient-history" || variant.status === "unavailable"
      ? variant.status : null;
    if (!status) return null;
    const bandLen = integer(variant.bandLen, 1, 5000, null);
    const requiredBars = integer(variant.requiredBars, 0, 5000, null);
    const availableBars = integer(variant.availableBars, 0, 5000, null);
    if (bandLen === null || requiredBars === null || availableBars === null) return null;
    const numberOr = input => bounded(input, -1e15, 1e15, null);
    const deltas = isRecord(variant.deltas) ? {
      closeFromBasis: numberOr(variant.deltas.closeFromBasis),
      upper618FromBasis: numberOr(variant.deltas.upper618FromBasis),
      lower618FromBasis: numberOr(variant.deltas.lower618FromBasis),
      upper1000FromBasis: numberOr(variant.deltas.upper1000FromBasis),
      lower1000FromBasis: numberOr(variant.deltas.lower1000FromBasis),
      logUpper618FromBasis: numberOr(variant.deltas.logUpper618FromBasis),
      logLower618FromBasis: numberOr(variant.deltas.logLower618FromBasis),
      logUpper1000FromBasis: numberOr(variant.deltas.logUpper1000FromBasis),
      logLower1000FromBasis: numberOr(variant.deltas.logLower1000FromBasis)
    } : null;
    return {
      id, bandLen, requiredBars, availableBars, status,
      domain: text(variant.domain, 24),
      experimental: variant.experimental === true,
      basis: numberOr(variant.basis),
      upper618: numberOr(variant.upper618), lower618: numberOr(variant.lower618),
      upper1000: numberOr(variant.upper1000), lower1000: numberOr(variant.lower1000),
      deltas
    };
  };
  const variants = isRecord(value.variants) ? {
    "FBB-200": safeVariant(value.variants["FBB-200"]),
    "FBB-L60": safeVariant(value.variants["FBB-L60"])
  } : null;
  if (!variants || !variants["FBB-200"] || !variants["FBB-L60"]) return null;
  const comparison = isRecord(value.comparison) ? {
    basisDelta: bounded(value.comparison.basisDelta, -1e15, 1e15, null),
    upper618Delta: bounded(value.comparison.upper618Delta, -1e15, 1e15, null),
    lower618Delta: bounded(value.comparison.lower618Delta, -1e15, 1e15, null),
    upper1000Delta: bounded(value.comparison.upper1000Delta, -1e15, 1e15, null),
    lower1000Delta: bounded(value.comparison.lower1000Delta, -1e15, 1e15, null),
    authority: text(value.comparison.authority, 240)
  } : null;
  if (!comparison) return null;
  return {
    schema: "gi-fbb-comparison-v1",
    instrument: text(value.instrument, 120),
    symbol: text(value.symbol, 32).toUpperCase(),
    timeframe: text(value.timeframe, 24),
    provider: text(value.provider, 48).toLowerCase(),
    providerId: text(value.providerId, 120),
    assetClass: text(value.assetClass, 32).toLowerCase(),
    source: text(value.source, 160),
    availableBars: integer(value.availableBars, 0, 5000, 0),
    variants,
    comparison,
    note: text(value.note, 240)
  };
}

function safeInstrument(value, provider) {
  if (!isRecord(value)) return null;
  const symbol = text(value.symbol, 32).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._:-]{0,31}$/.test(symbol)) return null;
  const status = STATUSES.has(value.status) ? value.status : "unavailable";
  const allowedProvider = provider === "rehearsal" ? "synthetic" : provider;
  const instrumentProvider = text(value.provider, 24) || allowedProvider;
  if (instrumentProvider !== allowedProvider) return null;
  const providerId = text(value.providerId, 48).toUpperCase();
  const krakenPair = text(value.krakenPair, 32).toUpperCase();
  const rankingProvider = text(value.rankingProvider, 24);
  if (provider === "kraken") {
    const pairMatch = /^([A-Z0-9]{2,12})\/USD$/.exec(krakenPair);
    const canonicalSymbol = pairMatch?.[1] === "XBT" ? "BTC" : pairMatch?.[1] === "XDG" ? "DOGE" : pairMatch?.[1];
    if (!pairMatch || providerId !== krakenPair || rankingProvider !== "Kraken" || canonicalSymbol !== symbol) return null;
  } else if (krakenPair || rankingProvider) return null;
  const lane = value.lane === "hot" || value.lane === "sweep" ? value.lane : null;
  return {
    symbol,
    displaySymbol: text(value.displaySymbol, 48) || symbol,
    ...(providerId ? { providerId } : {}),
    ...(provider === "kraken" ? { krakenPair, rankingProvider } : {}),
    status,
    provider: allowedProvider,
    code: /^[a-z0-9-]{1,48}$/i.test(String(value.code || "")) ? String(value.code) : "",
    message: text(value.message, 240),
    lane,
    market: safeMarket(value.market),
    motion: safeMotion(value.motion)
  };
}

/* Exposed so the server-side field can validate the same compact shapes. */
export const orb2SharedSanitizers = Object.freeze({ bar: safeBar, market: safeMarket, motion: safeMotion });

export function sanitizeOrb2Beat(value, now = Date.now()) {
  if (!isRecord(value) || value.schema !== ORB2_BEAT_SCHEMA) return { ok: false, message: "Send one gi-orb2-beat-v1 record." };
  if (!UUID.test(String(value.beatId || ""))) return { ok: false, message: "A UUID beat id is required." };
  const discId = String(value.discId || "").toLowerCase();
  const provider = String(value.provider || "").toLowerCase();
  const interval = String(value.interval || "");
  if (!DISC_IDS.has(discId) || !PROVIDERS.has(provider) || !INTERVALS.has(interval)) {
    return { ok: false, message: "Choose a reviewed Disc, provider, and interval." };
  }
  if ((provider === "massive" && (interval !== "1d" || !["fx", "commodities", "futures", "indices"].includes(discId))) ||
      (provider === "tickerbot" && (discId !== "stocks" || !["15m", "1h", "1d"].includes(interval))) ||
      (provider === "kraken" && (discId !== "crypto" || interval !== "1d"))) {
    return { ok: false, message: "The provider, Disc, and interval combination is not supported." };
  }
  const minTimestamp = Date.parse("2000-01-01T00:00:00.000Z");
  const maxTimestamp = Math.floor(now + 300_000);
  const at = Number.isSafeInteger(value.at) && value.at >= minTimestamp && value.at <= maxTimestamp ? value.at : null;
  if (at === null) return { ok: false, message: "The beat timestamp is invalid." };
  const cadenceMinutes = integer(value.cadenceMinutes, 1, 1440, null);
  if (cadenceMinutes === null) return { ok: false, message: "The beat cadence is invalid." };
  const calls = integer(value.calls, 0, 12, 0);
  const cacheHits = integer(value.cacheHits, 0, 12, 0);
  const reason = REASONS.has(value.reason) ? value.reason : "manual";
  if (!Array.isArray(value.instruments) || value.instruments.length > 12) {
    return { ok: false, message: "A saved beat may contain at most 12 instruments." };
  }
  const instruments = value.instruments.map(instrument => safeInstrument(instrument, provider));
  if (instruments.some(instrument => !instrument)) return { ok: false, message: "A beat instrument is malformed or does not match its provider." };
  if (new Set(instruments.map(instrument => instrument.symbol)).size !== instruments.length) {
    return { ok: false, message: "A beat may contain each instrument only once." };
  }
  return {
    ok: true,
    beat: {
      schema: ORB2_BEAT_SCHEMA,
      beatId: String(value.beatId).toLowerCase(),
      at,
      reason,
      discId,
      provider,
      interval,
      cadenceMinutes,
      calls,
      cacheHits,
      instruments
    }
  };
}

async function readBody(request) {
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    return { ok: false, status: 415, message: "Send application/json." };
  }
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400, message: "Missing JSON request body." };
  let size = 0;
  const parts = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return { ok: false, status: 413, message: "Orb 2 beat record exceeds the 48 KiB request limit." };
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  try { return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) }; }
  catch { return { ok: false, status: 400, message: "The request body is not valid JSON." }; }
}

export async function handleGoodIntelligenceOrb2Beats(request, env = {}, dependencies = {}) {
  const url = new URL(request.url);
  if (url.pathname !== ORB2_BEATS_ROUTE) return failure("Orb 2 beat history route not found.", 404);
  if (!new Set(["GET", "POST"]).has(request.method)) return failure("Orb 2 history supports GET and same-origin POST only.", 405);
  if (request.method === "POST" && request.headers.get("Origin") !== url.origin) {
    return failure("Same-origin request required.", 403);
  }
  const sessionId = String(url.searchParams.get("sessionId") || "").toLowerCase();
  if (!UUID.test(sessionId)) return failure("A random UUID session id is required.", 400);
  const db = env.COMMUNITY_DB;
  if (!db || typeof db.prepare !== "function") {
    return failure("Orb 2 server history is unavailable. Bind COMMUNITY_DB and apply D1 migration 0008; this does not affect live market requests.", 503);
  }
  const now = typeof dependencies.now === "function" ? dependencies.now() : Date.now();
  try {
    if (request.method === "GET") {
      const result = await db.prepare(`SELECT payload FROM orb2_saved_beats
        WHERE session_id = ? AND expires_at > ? ORDER BY beat_at DESC LIMIT ?`).bind(sessionId, now, ORB2_BEAT_HISTORY_LIMIT).all();
      const rows = Array.isArray(result?.results) ? result.results : [];
      const beats = rows.flatMap(row => {
        try {
          const value = JSON.parse(row.payload);
          const parsed = sanitizeOrb2Beat(value, now);
          return parsed.ok ? [parsed.beat] : [];
        } catch { return []; }
      }).sort((left, right) => left.at - right.at);
      return json({ success: true, schema: ORB2_BEAT_HISTORY_SCHEMA, sessionId, beats, count: beats.length });
    }

    const body = await readBody(request);
    if (!body.ok) return failure(body.message, body.status);
    const parsed = sanitizeOrb2Beat(body.value, now);
    if (!parsed.ok) return failure(parsed.message, 400);
    const payload = JSON.stringify(parsed.beat);
    if (new TextEncoder().encode(payload).byteLength > MAX_BEAT_BYTES) {
      return failure("Orb 2 beat record exceeds the 40 KiB storage limit.", 413);
    }
    const beat = parsed.beat;
    const expiresAt = now + 90 * 24 * 60 * 60_000;
    await db.prepare(`INSERT INTO orb2_saved_beats
      (session_id, beat_id, beat_at, provider, disc_id, payload, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id, beat_id) DO UPDATE SET
        beat_at = excluded.beat_at, provider = excluded.provider, disc_id = excluded.disc_id,
        payload = excluded.payload, created_at = excluded.created_at, expires_at = excluded.expires_at`)
      .bind(sessionId, beat.beatId, beat.at, beat.provider, beat.discId, payload, now, expiresAt).run();
    /* Two bounded statements instead of one `OR`. The old form could not use
       the expiry index — the `OR` made it a full scan — and its global
       `expires_at <= ?` half was unbounded: one save retired every session's
       stale rows, at four rows written per row deleted (compound primary key
       plus two secondary indexes). The expiry page is now capped, the session
       cap is unchanged, and a save's cost no longer depends on what other
       browsers left behind. */
    await db.prepare(`DELETE FROM orb2_saved_beats WHERE (session_id, beat_id) IN (
      SELECT session_id, beat_id FROM orb2_saved_beats WHERE expires_at <= ? ORDER BY expires_at LIMIT ?
    )`).bind(now, ORB2_BEAT_EXPIRED_ROWS_PER_WRITE).run();
    await db.prepare(`DELETE FROM orb2_saved_beats WHERE session_id = ? AND beat_id NOT IN (
      SELECT beat_id FROM orb2_saved_beats WHERE session_id = ? ORDER BY beat_at DESC LIMIT ?
    )`).bind(sessionId, sessionId, ORB2_BEAT_HISTORY_LIMIT).run();
    return json({ success: true, schema: ORB2_BEAT_HISTORY_SCHEMA, stored: true, beatId: beat.beatId, retained: ORB2_BEAT_HISTORY_LIMIT });
  } catch {
    return failure("Orb 2 server history could not be read or written. Confirm that D1 migration 0008 is applied; the live beat itself is unchanged.", 503);
  }
}
