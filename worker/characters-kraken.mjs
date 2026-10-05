/* Fixed-path Kraken Spot daily OHLC adapter for Characters Disc3.
 *
 * The provider identity comes only from a validated Kraken ranking entry. A
 * requested pair is never interpolated from an arbitrary browser symbol. Daily
 * bars are cached in D1 through the next UTC midnight, and failed attempts get
 * a bounded retry hold without serving an expired packet.
 */

import { claimKrakenCall } from "./kraken-call-ledger.mjs";
import { KRAKEN_PUBLIC_ORIGIN } from "./characters-crypto-ranking.mjs";

export const KRAKEN_OHLC_PATH = "/0/public/OHLC";
export const KRAKEN_DAILY_MAX_BARS = 60;
export const KRAKEN_BAR_RETRY_COOLDOWN_MS = 15 * 60_000;
export const KRAKEN_BAR_CACHE_SCHEMA = "characters-kraken-daily-bars-v1";
const FETCH_TIMEOUT_MS = 8_000;
const SELECT = `SELECT packet_json, fetched_at, expires_at, last_attempt_at, retry_after_at
  FROM characters_kraken_daily_bar_cache WHERE pair = ?`;
const CLAIM = `INSERT INTO characters_kraken_daily_bar_cache
    (pair, packet_json, fetched_at, expires_at, last_attempt_at, retry_after_at, updated_at)
  VALUES (?, NULL, NULL, 0, ?, ?, ?)
  ON CONFLICT(pair) DO UPDATE SET
    last_attempt_at = excluded.last_attempt_at,
    retry_after_at = excluded.retry_after_at,
    updated_at = excluded.updated_at
  WHERE characters_kraken_daily_bar_cache.retry_after_at <= ?
  RETURNING pair, last_attempt_at`;
const WRITE = `UPDATE characters_kraken_daily_bar_cache
  SET packet_json = ?, fetched_at = ?, expires_at = ?, retry_after_at = 0, updated_at = ?
  WHERE pair = ? AND last_attempt_at = ?`;
const RETRY_AFTER_LEDGER_REFUSAL = `UPDATE characters_kraken_daily_bar_cache
  SET retry_after_at = 0, updated_at = ?
  WHERE pair = ? AND last_attempt_at = ?`;

let inFlight = new Map();
const cache = new Map();
const failure = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });
const isRecord = value => value && typeof value === "object" && !Array.isArray(value);
const finitePositive = value => typeof value === "number" && Number.isFinite(value) && value > 0;
const utcDay = at => new Date(Number(at)).toISOString().slice(0, 10);
const nextUtcMidnight = at => {
  const date = new Date(Number(at));
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
};

function readNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

/* Strictly match the ranked instrument; XBT/XDG aliases remain Kraken's own
   provider identity while the public Characters symbol is canonicalized. */
function normalizeKrakenInstrument(value) {
  if (!isRecord(value) || value.rankingProvider !== "Kraken" || value.assetClass !== "crypto" || value.discId !== "crypto") return null;
  const symbol = typeof value.symbol === "string" ? value.symbol.trim().toUpperCase() : "";
  const pair = typeof value.krakenPair === "string" ? value.krakenPair.trim().toUpperCase() : "";
  const providerId = typeof value.providerId === "string" ? value.providerId.trim().toUpperCase() : "";
  const match = /^([A-Z0-9]{2,12})\/USD$/.exec(pair);
  if (!/^[A-Z0-9]{2,12}$/.test(symbol) || !match || providerId !== pair) return null;
  const providerBase = match[1];
  const expectedSymbol = providerBase === "XBT" ? "BTC" : providerBase === "XDG" ? "DOGE" : providerBase;
  if (symbol !== expectedSymbol) return null;
  return Object.freeze({ symbol, providerBase, pair, queryPair: `${providerBase}USD` });
}

function validOhlc({ time, open, high, low, close }) {
  return Number.isSafeInteger(time) && time >= 0 && [open, high, low, close].every(finitePositive) &&
    high >= Math.max(open, close) && low <= Math.min(open, close) && high >= low;
}

function barFromKraken(row, dayStart) {
  if (!Array.isArray(row) || row.length < 5) return null;
  const timestampSeconds = readNumber(row[0]);
  const time = Number.isFinite(timestampSeconds) && timestampSeconds >= 0
    ? Math.floor(timestampSeconds * 1000) : null;
  const open = readNumber(row[1]);
  const high = readNumber(row[2]);
  const low = readNumber(row[3]);
  const close = readNumber(row[4]);
  if (!validOhlc({ time, open, high, low, close })) return null;
  const bar = { time, open, high, low, close, confirmed: time < dayStart };
  const volume = readNumber(row[6]);
  if (Number.isFinite(volume) && volume >= 0) bar.volume = volume;
  return bar;
}

function normalizedPairKey(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function responseRows(result, instrument) {
  if (!isRecord(result)) return null;
  const expected = new Set([
    normalizedPairKey(instrument.pair),
    normalizedPairKey(instrument.queryPair),
    normalizedPairKey(`X${instrument.providerBase}ZUSD`)
  ]);
  const matched = Object.entries(result).filter(([key, value]) =>
    key !== "last" && Array.isArray(value) && expected.has(normalizedPairKey(key)));
  return matched.length === 1 ? matched[0][1] : null;
}

function normalizeKrakenOhlc(payload, instrument, { at = Date.now() } = {}) {
  if (!isRecord(payload) || !Array.isArray(payload.error) || payload.error.length > 0 || !isRecord(payload.result)) return null;
  const rows = responseRows(payload.result, instrument);
  if (!rows) return null;
  const current = Number(at);
  const date = new Date(current);
  const dayStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const unique = new Map();
  for (const row of rows) {
    const bar = barFromKraken(row, dayStart);
    if (bar) unique.set(bar.time, bar);
  }
  const bars = [...unique.values()].sort((a, b) => a.time - b.time).slice(-KRAKEN_DAILY_MAX_BARS);
  if (!bars.length) return null;
  return Object.freeze({
    schema: "gi-market-context-v1",
    symbol: instrument.symbol,
    capturedAt: current,
    timeframe: "1d",
    dataShape: bars.some(bar => Number.isFinite(bar.volume)) ? "ohlcv" : "ohlc",
    quoteCurrency: "USD",
    synthetic: false,
    source: `Kraken Spot public OHLC · ${instrument.pair} · 1d bars`,
    providerId: instrument.pair,
    bars: Object.freeze(bars.map(bar => Object.freeze(bar)))
  });
}

function sanitizeCachedPacket(value, instrument) {
  if (!isRecord(value) || value.schema !== "gi-market-context-v1" || value.symbol !== instrument.symbol ||
      value.timeframe !== "1d" || value.synthetic !== false || value.providerId !== instrument.pair ||
      !Number.isSafeInteger(value.capturedAt) || value.capturedAt < 0 ||
      typeof value.source !== "string" || !value.source.startsWith(`Kraken Spot public OHLC · ${instrument.pair} ·`) ||
      !Array.isArray(value.bars) || !value.bars.length || value.bars.length > KRAKEN_DAILY_MAX_BARS) return null;
  const captured = new Date(value.capturedAt);
  const captureDayStart = Date.UTC(captured.getUTCFullYear(), captured.getUTCMonth(), captured.getUTCDate());
  const bars = [];
  let previousTime = -1;
  for (const raw of value.bars) {
    if (!isRecord(raw) || !validOhlc(raw) || raw.time <= previousTime || typeof raw.confirmed !== "boolean") return null;
    if (raw.confirmed !== (raw.time < captureDayStart)) return null;
    const bar = {
      time: raw.time, open: raw.open, high: raw.high, low: raw.low, close: raw.close, confirmed: raw.confirmed,
      ...(typeof raw.volume === "number" && Number.isFinite(raw.volume) && raw.volume >= 0 ? { volume: raw.volume } : {})
    };
    bars.push(Object.freeze(bar));
    previousTime = raw.time;
  }
  return Object.freeze({
    schema: "gi-market-context-v1", symbol: instrument.symbol, capturedAt: value.capturedAt, timeframe: "1d",
    dataShape: bars.some(bar => Number.isFinite(bar.volume)) ? "ohlcv" : "ohlc",
    quoteCurrency: "USD", synthetic: false,
    source: `Kraken Spot public OHLC · ${instrument.pair} · 1d bars`,
    providerId: instrument.pair,
    bars: Object.freeze(bars)
  });
}

async function readRow(db, pair) {
  try { return { ok: true, row: await db.prepare(SELECT).bind(pair).first() }; }
  catch { return { ok: false, row: null }; }
}

async function claimCacheRefresh(db, instrument, now) {
  try {
    const retryAfter = now + KRAKEN_BAR_RETRY_COOLDOWN_MS;
    const row = await db.prepare(CLAIM)
      .bind(instrument.pair, now, retryAfter, now, now)
      .first();
    if (row) return { ok: true };
    const state = await readRow(db, instrument.pair);
    if (state.ok && Number(state.row && state.row.retry_after_at) > now) {
      return failure("kraken-bar-cooldown", "The Kraken daily-pair request was just checked. This pair stays held until its bounded retry window ends.", {
        retryAfterMs: Number(state.row.retry_after_at) - now
      });
    }
    return failure("kraken-bar-cache-unavailable", "The Kraken daily-pair refresh could not be claimed in D1. No provider request was sent.");
  } catch {
    return failure("kraken-bar-cache-unavailable", "The Kraken daily-pair cache is unavailable. Apply migration 0012 before retrying.");
  }
}

async function writeCache(db, instrument, packet, now, expiresAt) {
  try {
    const result = await db.prepare(WRITE)
      .bind(JSON.stringify(packet), now, expiresAt, now, instrument.pair, now)
      .run();
    const changes = Number(result && (result.meta?.changes ?? result.changes));
    return !Number.isFinite(changes) || changes > 0;
  } catch { return false; }
}

async function releaseCacheClaim(db, instrument, now) {
  try { await db.prepare(RETRY_AFTER_LEDGER_REFUSAL).bind(now, instrument.pair, now).run(); }
  catch { /* retaining the retry hold is safer than opening a duplicate-call window */ }
}

function makeUrl(instrument) {
  const url = new URL(KRAKEN_OHLC_PATH, KRAKEN_PUBLIC_ORIGIN);
  url.searchParams.set("pair", instrument.queryPair);
  url.searchParams.set("interval", "1440");
  url.searchParams.set("assetVersion", "1");
  return url;
}

/** Fetch (or read) one validated Kraken USD pair's daily OHLC packet. */
export async function getKrakenDailyMarketContext({
  instrument: rawInstrument,
  db,
  fetcher = globalThis.fetch,
  now = Date.now(),
  timeoutMs = FETCH_TIMEOUT_MS,
  beforeFetch
} = {}) {
  const current = Number.isFinite(Number(now)) && Number(now) >= 0 ? Math.floor(Number(now)) : Date.now();
  const instrument = normalizeKrakenInstrument(rawInstrument);
  if (!instrument) return failure("kraken-instrument-refused", "This pair does not match an exact Kraken-ranked USD Spot identity.");
  if (!db || typeof db.prepare !== "function") {
    return failure("kraken-bar-cache-unavailable", "Bind COMMUNITY_DB and apply migration 0012 before loading Kraken daily bars.");
  }
  const local = cache.get(instrument.pair);
  if (local && local.expiresAt > current) return { ok: true, packet: local.packet, cached: true, source: "isolate" };
  if (local) cache.delete(instrument.pair);
  const rowResult = await readRow(db, instrument.pair);
  if (!rowResult.ok) return failure("kraken-bar-cache-unavailable", "The Kraken daily-bar D1 cache could not be read. No provider request was sent.");
  const row = rowResult.row;
  if (row && Number(row.expires_at) > current && typeof row.packet_json === "string") {
    let parsed;
    try { parsed = JSON.parse(row.packet_json); } catch { parsed = null; }
    const packet = sanitizeCachedPacket(parsed, instrument);
    if (!packet) return failure("kraken-bar-cache-unreadable", "The cached Kraken daily bars failed pair-identity validation. No stale packet was served.");
    cache.set(instrument.pair, { packet, expiresAt: Number(row.expires_at) });
    return { ok: true, packet, cached: true, source: "d1" };
  }
  if (row && Number(row.retry_after_at) > current) {
    return failure("kraken-bar-cooldown", "The Kraken daily-pair request was just checked. This pair stays held until its bounded retry window ends.", {
      retryAfterMs: Number(row.retry_after_at) - current
    });
  }
  if (typeof fetcher !== "function") return failure("kraken-unavailable", "Kraken public Spot data is unavailable in this Worker runtime.");
  if (typeof beforeFetch !== "function") {
    return failure("kraken-ledger-unavailable", "Reserve the shared Kraken pacing and daily safety limits before requesting pair bars.");
  }
  if (inFlight.has(instrument.pair)) return inFlight.get(instrument.pair);

  const run = (async () => {
    const gate = await beforeFetch();
    if (!gate || gate.ok !== true) {
      return failure(gate && gate.code || "kraken-ledger-unavailable",
        gate && gate.message || "The Kraken daily-pair request was held before provider work.",
        gate && gate.retryAfterMs ? { retryAfterMs: gate.retryAfterMs } : {});
    }
    const cacheClaim = await claimCacheRefresh(db, instrument, current);
    if (!cacheClaim.ok) return cacheClaim;

    const timeout = Number.isFinite(Number(timeoutMs)) ? Math.max(1, Number(timeoutMs)) : FETCH_TIMEOUT_MS;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;
    try {
      const response = await fetcher(makeUrl(instrument).toString(), {
        method: "GET", headers: { Accept: "application/json" }, redirect: "manual",
        ...(controller ? { signal: controller.signal } : {})
      });
      if (!response || !response.ok) {
        const status = Number(response && response.status) || 0;
        if (status === 429) return failure("kraken-rate-limit", "Kraken refused the public OHLC request. The shared pacing guard remains in force.");
        return failure("kraken-upstream", "Kraken could not provide this public daily pair series right now.");
      }
      let payload;
      try { payload = await response.json(); }
      catch { return failure("kraken-unreadable", "Kraken returned unreadable public OHLC data."); }
      if (Array.isArray(payload && payload.error) && payload.error.length) {
        const rateLimited = payload.error.some(error => /rate|limit|throttl/i.test(String(error)));
        return failure(rateLimited ? "kraken-rate-limit" : "kraken-upstream",
          rateLimited ? "Kraken refused the public OHLC request under its endpoint limits." : "Kraken reported an error for the public daily OHLC request.");
      }
      const packet = normalizeKrakenOhlc(payload, instrument, { at: current });
      if (!packet) return failure("kraken-bars-unreadable", "Kraken did not return usable daily OHLC bars for the exact ranked pair. No other pair or provider was substituted.");
      const expiresAt = nextUtcMidnight(current);
      if (!await writeCache(db, instrument, packet, current, expiresAt)) {
        return failure("kraken-bar-cache-write", "The Kraken daily bars were not stored in the shared D1 cache. This pair remains held rather than returning an isolate-only packet.");
      }
      cache.set(instrument.pair, { packet, expiresAt });
      return { ok: true, packet, cached: false, source: "kraken" };
    } catch (error) {
      return failure(error && error.name === "AbortError" ? "kraken-timeout" : "kraken-unreachable",
        error && error.name === "AbortError"
          ? "Kraken's public daily OHLC request timed out. Try again after the bounded retry window."
          : "Kraken's public daily OHLC endpoint could not be reached from this Worker.");
    } finally {
      if (timer !== null) clearTimeout(timer);
    }
  })();
  inFlight.set(instrument.pair, run);
  try { return await run; }
  finally { if (inFlight.get(instrument.pair) === run) inFlight.delete(instrument.pair); }
}

export function clearKrakenDailyBarCache() {
  cache.clear();
  inFlight.clear();
}

export const charactersKrakenInternals = Object.freeze({
  normalizeKrakenInstrument,
  normalizeKrakenOhlc,
  sanitizeCachedPacket,
  makeUrl,
  responseRows,
  barFromKraken,
  nextUtcMidnight,
  SELECT,
  CLAIM,
  WRITE,
  RETRY_AFTER_LEDGER_REFUSAL
});
