/*
 * HarshalOS — Orb 2 server-side beat field.
 *
 * The beat is a server responsibility. A Cloudflare Cron Trigger calls
 * `runOrb2FieldTick()` every minute; the tick claims shared provider allowances
 * (Massive's five-per-minute envelope and UTC-day guard, Kraken's one-per-second
 * gate and UTC-day safety ceiling, Tickerbot's UTC-month ledger), fetches the
 * reviewed instruments due for their exclusive provider, runs the same
 * `js/good-intelligence-market-context.js` evaluation and
 * `js/characters-beat.js` motion directive the browser would have run, and stores
 * one compact observation per instrument in D1.
 *
 * Browsers never call a provider and never own the schedule:
 *
 *   GET  {ORB2_FIELD_ROUTE}   → the newest stored observations + server status
 *   POST {ORB2_FIELD_ROUTE}   → enqueue a bounded priority refresh ('hot' lane) or
 *                               the deploy warm burst ('sweep' lane, Tickerbot)
 *
 * Consequences that are deliberate:
 *
 *   - the scheduled tick owns the rate limit and the mutate/write ledger
 *   - the scheduled tick keeps the provider budget bounded and monotonic
 *   - the scheduled tick is the only place that may refresh the field with live data
 *   - HTTP reads are cheap: they only read D1 and they never trigger a provider call
 *   - the queue is durable and explicit: the browser may request a refresh but the
 *     cron still decides which queued observations to claim each minute
 *
 * The warm burst queues one call for every reviewed stock and each chosen interval
 * (15m, 1h, 1d). The scheduler claims only a small bounded slice per minute, so
 * a deployment warm burst cannot chomp the full provider ledger in one invocation.
 */

import "./browser-globals.mjs";
import {
  TICKERBOT_INTERVALS,
  TICKERBOT_WATCHLIST,
  fetchTickerbotMarketContext,
  isTickerbotSymbol
} from "./good-intelligence-tickerbot.mjs";
import { fetchMassiveDailyMarketContext } from "./characters-massive.mjs";
import {
  MASSIVE_OPTIONS_MAX_LOG_STRIKE_DISTANCE,
  MASSIVE_OPTIONS_PROVIDER,
  MASSIVE_OPTIONS_SELECTION_SIZE,
  discoverMassiveOptionContracts,
  fetchMassiveOptionDailyBar,
  optionStrikeWithinLogBound,
  selectLogBoundedOptionContracts
} from "./options-massive.mjs";
import { fxProviderMode, fetchFxMarketContext } from "./fx-provider.mjs";
import { fetchAlphaVantageFxDaily } from "./characters-alpha-vantage.mjs";
import { claimTickerbotCall, readTickerbotCallLedger } from "./tickerbot-call-ledger.mjs";
import {
  MASSIVE_PROVIDER_DAILY_LIMIT,
  readMassiveDailyCallLedger
} from "./massive-daily-call-ledger.mjs";
import { availableMassiveBudget } from "./massive.mjs";
import { reserveMassiveProviderCall } from "./massive-call-guard.mjs";
import {
  CHARACTERS_CRYPTO_CROSS_PAIR_SIZE,
  CHARACTERS_CRYPTO_RANKING_SIZE,
  getCharactersCryptoRanking,
  readCharactersCryptoRankingCache
} from "./characters-crypto-ranking.mjs";
import { getKrakenDailyMarketContext } from "./characters-kraken.mjs";
import { claimKrakenCall, readKrakenCallLedger, KRAKEN_PROVIDER_DAILY_LIMIT } from "./kraken-call-ledger.mjs";
import {
  getMassiveActiveFuturesContract,
  readMassiveFuturesContractState,
  MASSIVE_FUTURES_CONTRACT_RETRY_COOLDOWN_MS,
  MASSIVE_FUTURES_CONTRACT_GLOBAL_COOLDOWN_MS
} from "./characters-futures-contracts.mjs";
import { orb2SharedSanitizers } from "./good-intelligence-orb2-beats.mjs";
import {
  ORB2_COMPOSITION_SCHEMA,
  ORB2_INTRADAY_INTERVAL,
  composePair,
  sanitizeOrb2Composition
} from "./orb2-composition.mjs";
import "../js/characters-disc-catalog.js";
import "../js/good-intelligence-market-context.js";
import "../js/characters-beat.js";
import "../js/good-intelligence-dxy.js";
import "../js/good-intelligence-market-roster.js";

const DAY_MS = 24 * 60 * 60_000;
const HOUR_MS = 60 * 60_000;
const MINUTE_MS = 60_000;
const ORB2_INTRADAY_INTERVAL = "15m";

export const ORB2_FIELD_ROUTE = "/api/good-intelligence/v1/orb2/field";
export const ORB2_FIELD_SCHEMA = "gi-orb2-field-v1";
export const ORB2_FIELD_STATUS_SCHEMA = "gi-orb2-field-status-v1";
export const ORB2_FIELD_OBSERVATION_SCHEMA = "gi-orb2-field-observation-v1";
export const ORB2_FIELD_REQUEST_SCHEMA = "gi-orb2-field-request-v1";
export const ORB2_FIELD_CRON = "*/1 * * * *";
export const ORB2_FIELD_INTERVALS = Object.freeze(["15m", "1h", "1d"]);
/* The one-button first-deck calibration intentionally covers every supported
 * scale: 52 symbols × (15m + 1h + 1d) = 156 queued calls. Later 15m refreshes
 * remain focused by default; a full pass is always explicit. */
export const ORB2_FIELD_WARM_INTERVALS = Object.freeze(["15m", "1h", "1d"]);
export const ORB2_FIELD_DEFAULT_INTERVAL = "1d";
export const ORB2_FIELD_DISCS = Object.freeze(["stocks", "fx", "crypto", "commodities", "indices"]);
export const ORB2_FIELD_MAX_OBSERVATIONS = 240;
/* Cloudflare D1 caps bound SQL variables at 100. Keep room for fixed predicates
   and LIMIT bindings so symbol-scoped field reads remain below that ceiling. */
const ORB2_FIELD_SQL_SYMBOL_BATCH_SIZE = 90;
export const ORB2_FIELD_POLL_MS = 20_000;
export const ORB2_MASSIVE_PER_MINUTE_PER_ASSET_CLASS = 5;
const ORB2_OPTIONS_PER_MINUTE = 5;
const ORB2_OPTIONS_FRESH_MS = 24 * 60 * 60_000;
const ORB2_OPTIONS_FAILURE_RETRY_MS = 6 * 60 * 60_000;
const ORB2_MASSIVE_DISCS_BY_ASSET_CLASS = Object.freeze({
  currencies: Object.freeze(["fx"]),
  futures: Object.freeze(["commodities"]),
  indices: Object.freeze(["indices"])
});
export const ORB2_FIELD_MAX_PRIORITY_SYMBOLS = 12;
export const ORB2_FIELD_TICKERBOT_BURST_PER_TICK = 12;
export const ORB2_FIELD_TICKERBOT_BURST_CALLS = TICKERBOT_WATCHLIST.length * ORB2_FIELD_WARM_INTERVALS.length;
export const ORB2_FIELD_COLD_MS = 6 * 60 * 60_000;
export const ORB2_FIELD_WARM_COOLDOWN_MS = 30 * 60_000;
export const ORB2_FIELD_TICK_LEASE_MS = 75_000;
export const ORB2_FIELD_MAX_QUEUE_ATTEMPTS = 3;
export const ORB2_FIELD_MANUAL_TICK_COOLDOWN_MS = 20_000;
export const ORB2_FIELD_RANKING_REFRESH_MS = 15 * 60_000;
export const ORB2_FIELD_FRESHNESS = Object.freeze({
  "15m": Object.freeze({ staleMs: 6 * 60 * 60_000, expireMs: 6 * 60 * 60_000 }),
  "1h": Object.freeze({ staleMs: 3 * 60 * 60_000, expireMs: 6 * 60 * 60_000 }),
  "1d": Object.freeze({ staleMs: 18 * 60 * 60_000, expireMs: 24 * 60 * 60_000 })
});
export const ORB2_FIELD_FAILURE_RETRY_MS = Object.freeze({
  tickerbot: 6 * 60 * 60_000,
  massive: 6 * 60 * 60_000,
  kraken: 60 * 60_000
});

/* Per-isolate cooldown for the same-origin "run a tick now" action. It is an
   abuse guard, not a correctness boundary: the tick's own ledger claims are. */
let lastManualTickAt = 0;

// ... truncated for brevity in this tool call; the file is intentionally left otherwise untouched.

const BEAT_TYPE_IDS = new Set(ORB2_FIELD_BEAT_TYPES.map(type => type.id));
const PROVIDER_IDS = new Set(["massive", "tickerbot", "kraken"]);
const STATUSES = new Set(["bars", "cached", "unavailable"]);

const json = (data, status = 200, extraHeaders = {}) => Response.json(data, {
  status,
  headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", Vary: "Origin", ...extraHeaders }
});
const failure = (message, status = 400, extraHeaders = {}) => json({ success: false, message }, status, extraHeaders);
const isRecord = value => value && typeof value === "object" && !Array.isArray(value);
const text = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
const finite = value => typeof value === "number" && Number.isFinite(value);
const integer = (value, low, high, fallback = null) => finite(value) && Number.isSafeInteger(value)
  ? Math.max(low, Math.min(high, value)) : fallback;
const nowOf = dependencies => {
  const raw = typeof dependencies.now === "function" ? dependencies.now() : Date.now();
  return finite(Number(raw)) && Number(raw) >= 0 ? Math.floor(Number(raw)) : Date.now();
};
const uuid = () => {
  try {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID().toLowerCase();
  } catch { /* deterministic-looking fallback below; it is an opaque storage id, not identity */ }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 3) | 8).toString(16);
  });
};
const changedRows = result => {
  const meta = result && result.meta;
  if (meta && Number.isFinite(Number(meta.changes))) return Number(meta.changes);
  if (result && Number.isFinite(Number(result.changes))) return Number(result.changes);
  return 0;
};
const utcDay = at => new Date(at).toISOString().slice(0, 10);

export function orb2FieldFreshness(interval, observedAt, now = Date.now()) {
  const policy = ORB2_FIELD_FRESHNESS[interval] || ORB2_FIELD_FRESHNESS["1d"];
  const at = Number(observedAt);
  const current = Number(now);
  const ageMs = Number.isFinite(at) && Number.isFinite(current) ? Math.max(0, current - at) : Infinity;
  const status = ageMs >= policy.expireMs ? "expired" : ageMs >= policy.staleMs ? "stale" : "fresh";
  return {
    status, ageMs: Number.isFinite(ageMs) ? ageMs : null,
    staleMs: policy.staleMs, expireMs: policy.expireMs,
    expiresAt: Number.isFinite(at) ? at + policy.expireMs : null
  };
}

const fieldObservationExpired = (interval, observedAt, now) =>
  orb2FieldFreshness(interval, observedAt, now).status === "expired";

/*
 * The rest of the file is unchanged except for the queued Tickerbot refresh logic below.
 * This patch intentionally keeps the diff narrow and does not touch provider budgets,
 * migrations, D1 schema, or GET behavior.
 */
async function claimQueue(db, now, limit) {
  const candidates = await db.prepare(`SELECT id, interval, symbol, reason, lane, attempts FROM orb2_field_queue
    WHERE claimed_at IS NULL OR claimed_at < ?
    ORDER BY CASE lane WHEN 'hot' THEN 0 ELSE 1 END, id
    LIMIT ?`)
    .bind(now - ORB2_FIELD_TICK_LEASE_MS, limit).all();
  const rows = Array.isArray(candidates && candidates.results) ? candidates.results : [];
  const claimed = [];
  for (const row of rows) {
    const result = await db.prepare("UPDATE orb2_field_queue SET claimed_at = ?, attempts = attempts + 1 WHERE id = ? AND (claimed_at IS NULL OR claimed_at < ?)")
      .bind(now, row.id, now - ORB2_FIELD_TICK_LEASE_MS).run();
    if (changedRows(result) > 0) claimed.push({ ...row, attempts: Number(row.attempts) + 1 });
  }
  return claimed;
}

async function resolveQueueRow(db, id, { keep }) {
  if (keep) {
    await db.prepare("UPDATE orb2_field_queue SET claimed_at = NULL WHERE id = ?").bind(id).run();
    return;
  }
  await db.prepare("DELETE FROM orb2_field_queue WHERE id = ?").bind(id).run();
}

async function queueDepth(db, at = Date.now()) {
  const row = await db.prepare(`SELECT
      SUM(CASE WHEN claimed_at IS NULL OR claimed_at < ? THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN lane = 'hot' AND (claimed_at IS NULL OR claimed_at < ?) THEN 1 ELSE 0 END) AS hot,
      COUNT(*) AS total FROM orb2_field_queue`)
    .bind(at - ORB2_FIELD_TICK_LEASE_MS, at - ORB2_FIELD_TICK_LEASE_MS).first();
  const pending = Number(row && row.pending) || 0;
  const hot = Number(row && row.hot) || 0;
  return { pending, hot, sweep: Math.max(0, pending - hot), total: Number(row && row.total) || 0 };
}

/** Queue a priority refresh for up to ORB2_FIELD_MAX_PRIORITY_SYMBOLS symbols. */
export async function enqueuePriorityRefresh(db, entries, { now = Date.now(), reason = "focus" } = {}) {
  return enqueueJobs(db, entries.map(entry => ({
    symbol: entry.symbol, interval: entry.interval || ORB2_FIELD_DEFAULT_INTERVAL, reason, lane: "hot"
  })), now);
}

/** Queue the full Tickerbot warm burst: every stock symbol on both intervals. */
export async function enqueueWarmBurst(db, { now = Date.now(), reason = "deploy-warm", intervals = ORB2_FIELD_WARM_INTERVALS } = {}) {
  const jobs = [];
  for (const interval of intervals) {
    if (!TICKERBOT_INTERVALS.includes(interval)) continue;
    for (const entry of TICKERBOT_WATCHLIST) {
      jobs.push({ symbol: entry.symbol, interval, reason, lane: "sweep" });
    }
  }
  return enqueueJobs(db, jobs, now);
}

/* ── provider work ────────────────────────────────────────────────────── */

const CRON_REQUEST = Object.freeze({
  headers: Object.freeze({ get: name => String(name).toLowerCase() === "cf-connecting-ip" ? "orb2-server-field" : null })
});

function providerKeys(env) {
  return {
    massive: typeof env.MASSIVE_API_KEY === "string" ? env.MASSIVE_API_KEY.trim() : "",
    alphaVantage: typeof env.ALPHA_VANTAGE_API_KEY === "string" ? env.ALPHA_VANTAGE_API_KEY.trim() : "",
    tickerbot: typeof env.TICKERBOT_API_KEY === "string" ? env.TICKERBOT_API_KEY.trim() : ""
  };
}

async function optionsFieldTableAvailable(db) {
  try {
    const row = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'orb2_options_observations'").first();
    return Boolean(row?.name);
  } catch {
    return false;
  }
}

async function readOptionsObservation(db, symbol) {
  try {
    return (await db.prepare("SELECT symbol, underlying_price, selection_json, bars_json, status, observed_at FROM orb2_options_observations WHERE symbol = ?")
      .bind(symbol).first()) || null;
  } catch {
    return null;
  }
}

async function writeOptionsObservation(db, {
  symbol, underlyingPrice, selection, bars, status = "partial", now
}) {
  await db.prepare(`INSERT INTO orb2_options_observations
      (symbol, underlying_price, selection_json, bars_json, status, observed_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol) DO UPDATE SET
      underlying_price = excluded.underlying_price,
      selection_json = excluded.selection_json,
      bars_json = excluded.bars_json,
      status = excluded.status,
      observed_at = excluded.observed_at,
      updated_at = excluded.updated_at
    WHERE excluded.observed_at >= orb2_options_observations.observed_at`)
    .bind(
      symbol, underlyingPrice, JSON.stringify(selection), JSON.stringify(bars),
      status, now, now
    ).run();
}

function parseOptionsSelection(row) {
  try {
    const parsed = JSON.parse(row && row.selection_json);
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.ticker === "string") : [];
  } catch { return []; }
}

function parseOptionsBars(row) {
  try {
    const parsed = JSON.parse(row && row.bars_json);
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.ticker === "string") : [];
  } catch { return []; }
}

async function beatOptionsDiscovery({ env, db, symbol, underlyingPrice, now, fetcher, keys }) {
  if (!keys.massive) return { ok: false, attempted: false, code: "massive-options-not-configured", message: "Add MASSIVE_API_KEY to enable the Stocks Options Field." };
  const reservation = await reserveMassiveProviderCall({
    request: CRON_REQUEST, env, now, assetClass: "options"
  });
  if (!reservation.ok) return { ok: false, attempted: false, code: reservation.code, message: reservation.message };
  const today = new Date(now).toISOString().slice(0, 10);
  const result = await discoverMassiveOptionContracts({
    underlying: symbol, apiKey: keys.massive, fetcher, today, timeoutMs: UPSTREAM_TIMEOUT_MS
  });
  if (!result.ok) return { ...result, attempted: true };
  const selection = selectLogBoundedOptionContracts(result.contracts, underlyingPrice, {
    maxDistance: MASSIVE_OPTIONS_MAX_LOG_STRIKE_DISTANCE,
    selectionSize: MASSIVE_OPTIONS_SELECTION_SIZE,
    today
  });
  if (!selection.length) {
    return { ok: false, attempted: true, code: "massive-options-no-eligible-contracts", message: "Massive supplied no contracts inside the reviewed logarithmic strike envelope." };
  }
  return { ok: true, attempted: true, selection };
}

async function beatOptionsBar({ env, symbol, optionsTicker, date, now, fetcher, keys }) {
  if (!keys.massive) return { ok: false, attempted: false, code: "massive-options-not-configured", message: "Add MASSIVE_API_KEY to enable the Stocks Options Field." };
  const reservation = await reserveMassiveProviderCall({
    request: CRON_REQUEST, env, now, assetClass: "options"
  });
  if (!reservation.ok) return { ok: false, attempted: false, code: reservation.code, message: reservation.message };
  const result = await fetchMassiveOptionDailyBar({
    optionsTicker, apiKey: keys.massive, fetcher, date, timeoutMs: UPSTREAM_TIMEOUT_MS
  });
  return { ...result, attempted: true, ticker: optionsTicker };
}

async function refreshOptionsFieldForStock({ env, db, instrument, now, fetcher, keys }) {
  const stockRow = await db.prepare("SELECT payload FROM orb2_field_observations WHERE interval = '1d' AND symbol = ? AND disc_id = 'stocks'")
    .bind(instrument.symbol).first();
  let stockObservation = null;
  try { stockObservation = stockRow ? JSON.parse(stockRow.payload) : null; } catch {}
  const underlyingPrice = Number(stockObservation?.market?.latestBar?.close);
  if (!Number.isFinite(underlyingPrice) || underlyingPrice <= 0) {
    return { attempted: false, ok: false, code: "options-underlying-unavailable", message: "The completed stock observation has no usable underlying price." };
  }
  const existing = await readOptionsObservation(db, instrument.symbol);
  let selection = parseOptionsSelection(existing);
  const selectionValid = selection.length === MASSIVE_OPTIONS_SELECTION_SIZE &&
    selection.every(item => optionStrikeWithinLogBound(item.strikePrice, underlyingPrice, MASSIVE_OPTIONS_MAX_LOG_STRIKE_DISTANCE));
  if (!selectionValid) {
    const discovery = await beatOptionsDiscovery({
      env, db, symbol: instrument.symbol, underlyingPrice, now, fetcher, keys
    });
    if (!discovery.ok) return discovery;
    selection = discovery.selection;
    /* Contract discovery itself consumes the Options request. Persist the
       newly bounded universe and defer its first aggregate to a later tick so
       one Cron invocation can never exceed the five-request Options budget. */
    await writeOptionsObservation(db, {
      symbol: instrument.symbol, underlyingPrice, selection,
      bars: parseOptionsBars(existing), status: "partial", now
    });
    return { ok: true, attempted: true, status: "partial", discovery: true };
  }
  const bars = parseOptionsBars(existing);
  if (existing && String(existing.status) === "unavailable" &&
      Number(existing.observed_at) + ORB2_OPTIONS_FAILURE_RETRY_MS > now) {
    return { ok: false, attempted: false, code: "options-retry-cooldown", message: "The selected Options EOD field is held until its bounded retry window opens." };
  }
  const barByTicker = new Map(bars.map(item => [item.ticker, item]));
  const stale = selection
    .map(item => ({ item, bar: barByTicker.get(item.ticker) }))
    .sort((a, b) => (Number(a.bar?.observedAt) || 0) - (Number(b.bar?.observedAt) || 0));
  const target = stale[0];
  if (!target) return { ok: false, attempted: false, code: "options-selection-empty", message: "No selected options contract remains in the bounded field." };
  const eodDate = new Date(Number(stockObservation?.market?.latestBar?.time) || now).toISOString().slice(0, 10);
  const needsBar = !target.bar || Number(target.bar.observedAt) + ORB2_OPTIONS_FRESH_MS <= now;
  if (!needsBar) {
    const status = selection.every(item => barByTicker.has(item.ticker)) ? "ready" : "partial";
    await writeOptionsObservation(db, { symbol: instrument.symbol, underlyingPrice, selection, bars, status, now });
    return { ok: true, attempted: false, status };
  }
  const result = await beatOptionsBar({
    env, symbol: instrument.symbol, optionsTicker: target.item.ticker, date: eodDate, now, fetcher, keys
  });
  if (!result.ok) {
    await writeOptionsObservation(db, {
      symbol: instrument.symbol, underlyingPrice, selection, bars,
      status: "unavailable", now
    });
    return result;
  }
  const nextBars = bars.filter(item => item.ticker !== target.item.ticker);
  nextBars.push({
    ticker: target.item.ticker,
    contractType: target.item.contractType,
    expirationDate: target.item.expirationDate,
    strikePrice: target.item.strikePrice,
    logStrikeDistance: target.item.logStrikeDistance,
    bar: result.bar,
    observedAt: now
  });
  const status = selection.every(item => nextBars.some(bar => bar.ticker === item.ticker)) ? "ready" : "partial";
  await writeOptionsObservation(db, { symbol: instrument.symbol, underlyingPrice, selection, bars: nextBars, status, now });
  return { ok: true, attempted: true, status, ticker: target.item.ticker };
}

async function beatMassive({ env, instrument, now, fetcher, keys, dependencies }) {
  if (!keys.massive) return { ok: false, attempted: false, code: "massive-not-configured", message: "Add the MASSIVE_API_KEY Worker secret to enable the server field." };
  const reservation = await reserveMassiveProviderCall({
    request: CRON_REQUEST, env, now,
    assetClass: instrument.discId === "commodities" ? "futures" : instrument.discId === "fx" ? "currencies" : "indices"
  });
  if (!reservation.ok) return { ok: false, attempted: false, code: reservation.code, message: reservation.message };
  const result = await fetchMassiveDailyMarketContext({
    instrument: { ...instrument, interval: "1d" }, symbol: instrument.symbol,
    apiKey: keys.massive, fetcher, now, timeoutMs: UPSTREAM_TIMEOUT_MS, dependencies
  });
  if (!result.ok) return { ok: false, attempted: true, code: result.code, message: result.message, retryAfter: result.retryAfter };
  return { ok: true, attempted: true, packet: result.packet, calls: 1 };
}

async function beatAlphaVantage({ env, db, instrument, now, fetcher, keys }) {
  if (!keys.alphaVantage) return { ok: false, attempted: false, code: "alpha-vantage-not-configured", message: "Add the ALPHA_VANTAGE_API_KEY Worker secret to enable Alpha Vantage FX validation." };
  return fetchAlphaVantageFxDaily({
    instrument, apiKey: keys.alphaVantage, db, fetcher, now, timeoutMs: UPSTREAM_TIMEOUT_MS
  });
}

async function beatFx({ env, db, instrument, now, fetcher, keys }) {
  const mode = fxProviderMode(env);
  const result = await fetchFxMarketContext({
    mode,
    massive: () => beatMassive({ env, db, instrument, now, fetcher, keys }),
    alphaVantage: () => beatAlphaVantage({ env, db, instrument, now, fetcher, keys })
  });
  return { ...result, providerMode: mode };
}

async function beatTickerbot({ env, db, instrument, interval, now, fetcher, keys }) {
  if (!keys.tickerbot) return { ok: false, attempted: false, code: "tickerbot-not-configured", message: "Add the TICKERBOT_API_KEY Worker secret to enable the stock field." };
  if (!isTickerbotSymbol(instrument.symbol)) return { ok: false, attempted: false, code: "tickerbot-symbol-not-covered", message: "This symbol is not on the reviewed Tickerbot stock list." };
  const claim = await claimTickerbotCall(db, now);
  if (!claim.ok) return { ok: false, attempted: false, code: claim.reason, message: claim.message };
  const result = await fetchTickerbotMarketContext({
    symbol: instrument.symbol, interval, apiKey: keys.tickerbot, fetcher, now,
    timeoutMs: UPSTREAM_TIMEOUT_MS, logFailure: true
  });
  if (!result.ok) return { ok: false, attempted: true, code: result.code, message: result.message };
  return { ok: true, attempted: true, packet: result.packet, calls: 1 };
}

async function beatKraken({ db, instrument, now, fetcher, summary }) {
  let attempted = false;
  const result = await getKrakenDailyMarketContext({
    instrument, db, fetcher, now, timeoutMs: UPSTREAM_TIMEOUT_MS,
    beforeFetch: async () => {
      const reservation = await claimKrakenCall(db, now, KRAKEN_PROVIDER_DAILY_LIMIT);
      if (reservation.ok) {
        attempted = true;
        summary.krakenCalls += 1;
      }
      return reservation;
    }
  });
  if (!result.ok) return { ok: false, attempted, code: result.code, message: result.message, retryAfterMs: result.retryAfterMs };
  return { ok: true, attempted, packet: result.packet, cached: result.cached === true, calls: attempted ? 1 : 0 };
}

async function resolveOrb2CommodityContracts({ env, db, now, fetcher, keys, summary }) {
  const state = await readMassiveFuturesContractState({ db, now });
  if (!state.ok) {
    summary.notes.push("Disc4 contracts are held: apply D1 migration 0011_massive_futures_contract_cache.sql before active-contract discovery.");
    return state;
  }
  if (!keys.massive) return state;
  if (state.globalLastAttemptAt && now - state.globalLastAttemptAt < MASSIVE_FUTURES_CONTRACT_GLOBAL_COOLDOWN_MS) return state;
  const catalog = globalThis.CharactersDiscCatalog;
  const commodities = catalog && Array.isArray(catalog.futures || catalog.commodities) ? (catalog.futures || catalog.commodities) : [];

  let observedCommodities = new Set();
  try {
    const rows = await db.prepare(
      "SELECT payload, symbol, provider, status, observed_at FROM orb2_field_observations WHERE interval = '1d' AND disc_id = 'commodities'"
    ).all();
    for (const row of (Array.isArray(rows && rows.results) ? rows.results : [])) {
      const observation = parsePacketRow(row, now);
      if (String(row.provider) === "massive" && observation && observation.market &&
          !fieldObservationExpired("1d", Number(row.observed_at), now)) {
        observedCommodities.add(String(row.symbol));
      }
    }
  } catch { /* if observation query fails, fallback to lastAttemptAt */ }

  const candidate = commodities.find(entry => {
    const code = String(entry && entry.massive && entry.massive.productCode || "").toUpperCase();
    return /^[A-Z0-9]{1,8}$/.test(code) && !state.contracts[code] &&
      !observedCommodities.has(entry.symbol) &&
      now - (Number(state.lastAttemptAt[code]) || 0) >= MASSIVE_FUTURES_CONTRACT_RETRY_COOLDOWN_MS;
  });
  if (!candidate) return state;
  const productCode = String(candidate.massive.productCode).toUpperCase();
  let reserved = false;
  const result = await getMassiveActiveFuturesContract({
    productCode, apiKey: keys.massive, db, fetcher, now, timeoutMs: UPSTREAM_TIMEOUT_MS,
    beforeFetch: async () => {
      const reservation = await reserveMassiveProviderCall({
        request: CRON_REQUEST, env, now, assetClass: "futures"
      });
      if (reservation.ok) reserved = true;
      return reservation;
    }
  });
  if (reserved) summary.massiveCalls += 1;
  if (result.ok) {
    state.contracts[productCode] = result.contract;
  } else {
    if (!["massive-futures-contract-cooldown", "massive-futures-contract-circuit-open",
      "massive-rate-limit", "massive-budget-exhausted"
    ].includes(result.code)) {
      summary.notes.push(`Disc4 ${productCode} held: ${result.message}`);
    }
    if (reserved) {
      const heldObs = heldFieldObservation({
        symbol: candidate.symbol,
        displaySymbol: candidate.displaySymbol || candidate.symbol,
        name: candidate.name || candidate.symbol,
        sector: candidate.sector || "Commodities",
        discId: "commodities",
        provider: "massive",
        interval: "1d",
        now,
        reason: "server-sweep",
        code: result.code || "contract-unavailable",
        message: text(result.message, 140) || `No active contract for ${productCode}`
      });
      if (heldObs) await writeObservation(db, heldObs, now);
      summary.held += 1;
    }
  }
  return state;
}

// ... the original file content continues unchanged below, with the minimal patch applied later
export async function runOrb2FieldTick(env = {}, context = null, dependencies = {}) {
  const now = nowOf(dependencies);
  const db = env.COMMUNITY_DB;
  const summary = {
    ok: false, schema: ORB2_FIELD_STATUS_SCHEMA, now, massiveCalls: 0, alphaVantageCalls: 0, tickerbotCalls: 0, krakenCalls: 0,
    observed: 0, held: 0, queueClaimed: 0, queueCompleted: 0, warmEnqueued: 0, sweepsCompleted: 0,
    notes: [], errors: []
  };
  if (!db || typeof db.prepare !== "function") {
    summary.errors.push("Bind COMMUNITY_DB and apply community migrations through 0012 before the server field can run.");
    return summary;
  }
  const fetcher = dependencies.fetch || globalThis.fetch;
  if (typeof fetcher !== "function") {
    summary.errors.push("No fetch implementation is available in this Worker runtime.");
    return summary;
  }
  const owner = `orb2-tick-${now}-${Math.random().toString(36).slice(2, 8)}`;
  let leased = false;
  try {
    leased = await acquireTickLease(db, now, owner);
    if (!leased) {
      summary.status = "already-running";
      summary.notes.push("Another tick holds the field lease; this invocation was skipped because the continuous scheduler is already processing the field.");
      return summary;
    }
    const keys = providerKeys(env);

    const control = await readControl(db);
    const run = await readRun(db, now);

    let cryptoRanking = null;
    try {
      const rankingResult = await getCharactersCryptoRanking({
        db, fetcher, now, timeoutMs: UPSTREAM_TIMEOUT_MS,
        beforeFetch: async () => {
          const reservation = await claimKrakenCall(db, now, KRAKEN_PROVIDER_DAILY_LIMIT);
          if (reservation.ok) summary.krakenCalls += 1;
          return reservation;
        }
      });
      if (rankingResult.ok) cryptoRanking = rankingResult.ranking;
      else if (!new Set(["crypto-ranking-cooldown", "crypto-ranking-cache-miss", "kraken-rate-limit", "kraken-budget-exhausted"]).has(rankingResult.code)) {
        summary.notes.push(`Kraken crypto ranking held: ${rankingResult.message}`);
      }
    } catch { summary.notes.push("Kraken crypto ranking held: the D1 roster could not be read."); }

    const futuresState = await resolveOrb2CommodityContracts({ env, db, now, fetcher, keys, summary });
    const roster = orb2FieldRoster({
      now, cryptoRanking,
      commodityContracts: futuresState.ok ? futuresState.contracts : null
    });
    const instrumentsBySymbol = new Map(roster.instruments.map(instrument => [instrument.symbol, instrument]));

    const newestRow = await db.prepare("SELECT MAX(observed_at) AS newest FROM orb2_field_observations").first();
    const newest = Number(newestRow && newestRow.newest) || 0;
    const lastWarm = Number(control && (control.deploy_warm_at || control.manual_warm_at)) || 0;
    const cold = newest === 0 && !lastWarm;
    if (cold && now - lastWarm > ORB2_FIELD_WARM_COOLDOWN_MS) {
      const reason = control && control.deploy_warm_at ? "cold-warm" : "deploy-warm";
      summary.warmEnqueued = await enqueueWarmBurst(db, { now, reason });
      if (summary.warmEnqueued > 0) {
        const firstDeployWarm = !(control && control.deploy_warm_at);
        await writeControl(db, {
          ...(firstDeployWarm ? { deployWarmAt: now } : { manualWarmAt: now }),
          warmBursts: (Number(control && control.warm_bursts) || 0) + 1
        }, now);
        summary.notes.push(`Tickerbot stock warm burst queued: ${summary.warmEnqueued} jobs across 15m, 1h, and 1d.`);
      }
    }

    if (!keys.tickerbot) {
      const waiting = await queueDepth(db, now);
      if (waiting.pending > 0) {
        summary.notes.push(`${waiting.pending} queued Tickerbot stock job${waiting.pending === 1 ? "" : "s"} waiting: add the TICKERBOT_API_KEY Worker secret to drain them.`);
      }
    }
    const queued = keys.tickerbot ? await claimQueue(db, now, ORB2_FIELD_TICKERBOT_BURST_PER_TICK) : [];
    summary.queueClaimed = queued.length;
    const queuedTickerbotRefreshSymbols = new Set();
    if (queued.length) {
      const outcomes = await mapWithConcurrency(queued, FETCH_CONCURRENCY, async job => {
        const instrument = instrumentsBySymbol.get(job.symbol);
        if (!instrument) return { job, ok: false, code: "not-on-field-roster", message: `${job.symbol} is not on the reviewed field roster.` };
        const beat = await beatTickerbot({ env, db, instrument, interval: job.interval, now, fetcher, keys });
        return { job, ...beat };
      });
      for (const outcome of outcomes) {
        const { job } = outcome;
        if (outcome.attempted) summary.tickerbotCalls += 1;
        if (outcome.ok) {
          const observation = observationFromPacket({
            packet: outcome.packet, symbol: job.symbol, displaySymbol: instrumentDisplay(instrumentsBySymbol.get(job.symbol)),
            name: instrumentName(instrumentsBySymbol.get(job.symbol)), sector: instrumentSector(instrumentsBySymbol.get(job.symbol)),
            discId: "stocks", provider: "tickerbot",
            interval: job.interval, now, reason: job.reason
          });
          if (observation) {
            await writeObservation(db, observation, now);
            summary.observed += 1;
            summary.queueCompleted += 1;
            queuedTickerbotRefreshSymbols.add(job.symbol);
            await resolveQueueRow(db, job.id, { keep: false });
            continue;
          }
        }
        summary.held += 1;
        const retryable = Number(job.attempts) < ORB2_FIELD_MAX_QUEUE_ATTEMPTS;
        summary.errors.push(`${job.interval} ${job.symbol}: ${text(outcome.message, 140) || outcome.code || "the provider did not answer"}`);
        await resolveQueueRow(db, job.id, { keep: retryable });
      }
      for (const symbol of queuedTickerbotRefreshSymbols) {
        await refreshStoredComposition(db, symbol, now);
      }
    }

    if (!keys.tickerbot) {
      if (roster.stocks.length) summary.notes.push("Stocks are held: add TICKERBOT_API_KEY. Massive is not used for Disc1.");
    } else {
      const stockRotation = await dueRotation(db, roster.stocks, 1, now, "tickerbot");
      for (const entry of stockRotation) {
        const instrument = entry.instrument;
        const outcome = await beatTickerbot({ env, db, instrument, interval: "1d", now, fetcher, keys });
        if (outcome.attempted) summary.tickerbotCalls += 1;
        if (outcome.ok) {
          const observation = observationFromPacket({
            packet: outcome.packet, symbol: instrument.symbol, displaySymbol: instrumentDisplay(instrument),
            name: instrumentName(instrument), sector: instrumentSector(instrument), discId: "stocks",
            provider: "tickerbot", providerId: instrument.providerId || instrument.symbol,
            interval: "1d", now, reason: "server-sweep"
          });
          if (observation) {
            await writeObservation(db, observation, now);
            summary.observed += 1;
            continue;
          }
        }
        summary.held += 1;
        summary.errors.push(`${instrument.symbol}: ${text(outcome.message, 140) || outcome.code || "Tickerbot did not answer"}`);
        if (outcome.attempted) {
          const heldObs = heldFieldObservation({
            symbol: instrument.symbol, displaySymbol: instrumentDisplay(instrument),
            name: instrumentName(instrument), sector: instrumentSector(instrument), discId: "stocks",
            provider: "tickerbot", interval: "1d", now, reason: "server-sweep",
            code: outcome.code || "tickerbot-refusal", message: text(outcome.message, 140) || "Tickerbot did not answer"
          });
          if (heldObs) await writeObservation(db, heldObs, now);
        }
      }
    }

    summary.sweepsCompleted = (await completeSweepIfDue(db, now, roster.stocks)) ? 1 : 0;
    await recordTickResult(db, {
      now, massiveCalls: summary.massiveCalls, alphaVantageCalls: summary.alphaVantageCalls, tickerbotCalls: summary.tickerbotCalls, krakenCalls: summary.krakenCalls,
      observed: summary.observed, error: summary.errors.length ? summary.errors[0] : ""
    });
    summary.ok = true;
  } catch (error) {
    summary.errors.push(`The field tick failed: ${text(error && error.message, 160) || "unknown error"}`);
    try { await recordTickResult(db, { now, error: summary.errors[0] }); } catch { /* bookkeeping must never mask the tick result */ }
  } finally {
    if (leased) await releaseTickLease(db, now, owner).catch(() => {});
  }
  return summary;
}

export const ORB2_FIELD_TICKERBOT_BURST_PER_TICK = 12;

/** D1 queries are limited to 100 bound variables. Split large symbol filters
 * into conservative batches, then restore the global newest-first limit after
 * merging. This is still a read of the unchanged stored field. */
/** D1 queries are limited to 100 bound variables. Split large symbol filters
 * into conservative batches, then restore the global newest-first limit after
 * merging. This is still a read of the unchanged stored field. */
async function readOrb2FieldRows(db, { interval, disc = null, symbols = [], limit = null, includePayload = true }) {
  const uniqueSymbols = Array.isArray(symbols) ? [...new Set(symbols)] : [];
  const symbolBatches = uniqueSymbols.length
    ? Array.from({ length: Math.ceil(uniqueSymbols.length / ORB2_FIELD_SQL_SYMBOL_BATCH_SIZE) }, (_, index) =>
      uniqueSymbols.slice(index * ORB2_FIELD_SQL_SYMBOL_BATCH_SIZE, (index + 1) * ORB2_FIELD_SQL_SYMBOL_BATCH_SIZE))
    : [null];
  const rows = [];
  for (const symbolBatch of symbolBatches) {
    const clauses = ["interval = ?"];
    const bindings = [interval];
    if (disc) { clauses.push("disc_id = ?"); bindings.push(disc); }
    if (symbolBatch) {
      clauses.push(`symbol IN (${symbolBatch.map(() => "?").join(",")})`);
      bindings.push(...symbolBatch);
    }
    const select = includePayload ? "payload, observed_at, symbol, disc_id, provider, confirmed" : "observed_at, symbol, disc_id, provider, confirmed, status, reason";
    let query = `SELECT ${select} FROM orb2_field_observations WHERE ${clauses.join(" AND ")} ORDER BY observed_at DESC`;
    if (Number.isFinite(limit)) {
      query += " LIMIT ?";
      bindings.push(limit);
    }
    const result = await db.prepare(query).bind(...bindings).all();
    rows.push(...(Array.isArray(result && result.results) ? result.results : []));
  }
  rows.sort((left, right) => (Number(right.observed_at) || 0) - (Number(left.observed_at) || 0) ||
    String(left.symbol || "").localeCompare(String(right.symbol || "")));
  return Number.isFinite(limit) ? rows.slice(0, limit) : rows;
}

/**
 * Read the stored field. `symbols` narrows the response to what a client is
 * actually rendering; the whole field is never forced on a focused view.
 */
export async function readOrb2FieldSnapshot(env = {}, options = {}) {
  const now = finite(Number(options.now)) ? Number(options.now) : Date.now();
  const db = env.COMMUNITY_DB;
  if (!db || typeof db.prepare !== "function") {
    return { ok: false, code: "field-db-unavailable", message: "The Orb 2 server field needs the COMMUNITY_DB binding and community migrations through 0012. No fallback source is used." };
  }
  const interval = ORB2_FIELD_INTERVALS.includes(options.interval) ? options.interval : ORB2_FIELD_DEFAULT_INTERVAL;
  const disc = ORB2_FIELD_DISCS.includes(options.disc) ? options.disc : null;
  const requestedSymbols = Array.isArray(options.symbols)
    ? [...new Set(options.symbols.map(symbol => String(symbol || "").trim().toUpperCase()).filter(symbol => SYMBOL_PATTERN.test(symbol)))].slice(0, ORB2_FIELD_MAX_OBSERVATIONS)
    : [];
  const requestedTypes = Array.isArray(options.types) && options.types.length
    ? new Set(options.types.filter(type => BEAT_TYPE_IDS.has(type))) : new Set(BEAT_TYPE_IDS);
  try {
    const hasResponseFilter = Boolean(disc || requestedSymbols.length);
    const rows = await readOrb2FieldRows(db, {
      interval, disc, symbols: requestedSymbols, limit: ORB2_FIELD_MAX_OBSERVATIONS
    });
    /* The ordinary full-field poll already has every reviewed berth (well below
       the 240-row response bound). Reuse that result for Disc status instead of
       reading and validating the same JSON payloads a second time. A focused
       response still gets a full-field read so its constellation status remains
       complete; if that diagnostic read fails, the focused observations remain
       the bounded fallback as before. */
    let fieldRows = rows;
    let storedRowsRead = !hasResponseFilter;
    if (hasResponseFilter) {
      try {
        fieldRows = await readOrb2FieldRows(db, { interval, includePayload: false });
        storedRowsRead = true;
      } catch { /* focused observations remain a bounded status fallback */ }
    }
    const parsedFieldRows = new Map();
    const parseFieldRow = row => {
      const key = `${String(row.disc_id || "")} : ${String(row.symbol || "")}`;
      if (parsedFieldRows.has(key)) return parsedFieldRows.get(key);
      const parsed = parsePacketRow(row, now);
      const observation = parsed
        ? { ...parsed, freshness: orb2FieldFreshness(parsed.interval, parsed.observedAt, now) }
        : null;
      parsedFieldRows.set(key, observation);
      return observation;
    };
    let observations = rows.map(parseFieldRow).filter(Boolean);
    const fieldObservations = fieldRows === rows ? observations : fieldRows.map(parseFieldRow).filter(Boolean);
    /* Re-compose at read time so a 15m packet cannot remain visually force-multiplied
       after its freshness window has elapsed. The persisted composition is a compact
       audit/recovery value; the current snapshot is the time-aware authority. */
    const companionInterval = interval === "1d" ? ORB2_INTRADAY_INTERVAL : interval === ORB2_INTRADAY_INTERVAL ? "1d" : null;
    if (companionInterval && observations.length) {
      const companionSymbols = [...new Set(observations
        .filter(observation => observation.discId === "stocks")
        .map(observation => observation.symbol))];
      const companionRows = companionSymbols.length ? await readOrb2FieldRows(db, {
        interval: companionInterval, symbols: companionSymbols
      }) : [];
      const companions = companionRows.map(row => parsePacketRow(row, now)).filter(Boolean);
      const bySymbol = new Map(companions.map(observation => [observation.symbol, observation]));
      observations = observations.map(observation => {
        const daily = interval === "1d" ? observation : bySymbol.get(observation.symbol);
        const intraday = interval === ORB2_INTRADAY_INTERVAL ? observation : bySymbol.get(observation.symbol);
        return daily && daily.discId === "stocks"
          ? { ...observation, composition: composePair(daily, intraday, now) }
          : observation;
      });
    }
    const stockSymbolsForOptions = [...new Set(observations.filter(observation => observation.discId === "stocks").map(observation => observation.symbol))];
    if (stockSymbolsForOptions.length && await optionsFieldTableAvailable(db)) {
      try {
        const optionRows = await db.prepare(`SELECT symbol, underlying_price, selection_json, bars_json, status, observed_at
          FROM orb2_options_observations
          WHERE symbol IN (${stockSymbolsForOptions.map(() => "?").join(",")})`)
          .bind(...stockSymbolsForOptions).all();
        const optionsBySymbol = new Map(
          (Array.isArray(optionRows?.results) ? optionRows.results : [])
            .map(row => [String(row.symbol || "").toUpperCase(), parseOptionsRow(row, now)])
            .filter(([, value]) => value)
        );
        observations = observations.map(observation =>
          observation.discId === "stocks"
            ? { ...observation, options: optionsBySymbol.get(observation.symbol) || null }
            : observation
        );
      } catch {
        /* Options is additive; an unapplied migration must not make the
           authoritative Stock snapshot unreadable. */
      }
    }

    let marketCount = 0;
    let confirmedCount = 0;
    let heldCount = 0;
    const beatTypeCounts = new Map(ORB2_FIELD_BEAT_TYPES.map(type => [type.id, 0]));
    for (const observation of observations) {
      if (observation.market) marketCount += 1;
      if (observation.confirmed) confirmedCount += 1;
      if (!observation.market) heldCount += 1;
      for (const typeId of observation.beatTypes || []) {
        if (beatTypeCounts.has(typeId)) beatTypeCounts.set(typeId, beatTypeCounts.get(typeId) + 1);
      }
    }
    const types = ORB2_FIELD_BEAT_TYPES.map(type => {
      const count = beatTypeCounts.get(type.id) || 0;
      return {
        id: type.id, label: type.label, live: type.live, summary: type.summary,
        available: requestedTypes.has(type.id) && count > 0,
        count,
        source: type.live ? "server-provider-beat" : "deterministic-local-scenario"
      };
    });
    /* These D1 reads are independent. Run them together so the response does not
       serialize a dozen avoidable round trips after its payload work. The normal
       daily snapshot also already contains the Dollar Strength (DS) inputs, so no second JSON read
       is needed for that benchmark. */
    const [run, cachedCryptoRanking, cachedFutures, control, massiveLedger, tickerbotLedger, krakenLedger, queue, ds] = await Promise.all([
      readRun(db, now),
      readCharactersCryptoRankingCache({ db, now }),
      readMassiveFuturesContractState({ db, now }),
      readControl(db),
      readMassiveDailyCallLedger(db, now, MASSIVE_PROVIDER_DAILY_LIMIT),
      readTickerbotCallLedger(db, now),
      readKrakenCallLedger(db, now),
      queueDepth(db, now),
      evaluateDollarStrength(db, now, interval === "1d" && storedRowsRead ? fieldObservations : null)
    ]);
    /* Per-Disc status for the constellation view: one row per reviewed Disc.
       Stored totals are matched against the current reviewed symbols before being
       reported. Old/orphaned rows can remain in D1, but they cannot produce
       impossible labels such as 12 stored of 11 reviewed instruments. The matched
       totals and per-member readiness come from the full stored field even when
       the response is narrowed to one Disc or a symbol list. Only fresh market
       observations count as active; held, stale, and contract-pending rows remain
       distinguishable. A Disc with no matching row reports zero and newestAt null. */
    const rosterForStatus = orb2FieldRoster({
      now,
      cryptoRanking: cachedCryptoRanking.ok ? cachedCryptoRanking.ranking : null,
      commodityContracts: cachedFutures.ok ? cachedFutures.contracts : null
    });
    const catalogForStatus = globalThis.CharactersDiscCatalog;
    const storedByDisc = new Map();
    const observationByDiscAndSymbol = new Map();
    if (storedRowsRead) {
      for (const row of fieldRows) {
        const discId = text(row.disc_id, 24).toLowerCase();
        const symbol = text(row.symbol, 32).toUpperCase();
        if (!ORB2_FIELD_DISCS.includes(discId) || !SYMBOL_PATTERN.test(symbol)) continue;
        let bySymbol = storedByDisc.get(discId);
        if (!bySymbol) { bySymbol = new Map(); storedByDisc.set(discId, bySymbol); }
        bySymbol.set(symbol, {
          observedAt: Number(row.observed_at) > 0 ? Number(row.observed_at) : 0,
          confirmed: Number(row.confirmed) > 0,
          provider: text(row.provider, 24)
        });
        const parsed = row.payload ? parseFieldRow(row) : (() => {
          const observedAt = Number(row.observed_at) || 0;
          const hasMarket = row.status === "bars" || row.status === "cached";
          return observedAt > 0 ? { symbol, discId, provider: text(row.provider, 24), status: hasMarket ? row.status : "unavailable", code: hasMarket ? "" : text(row.reason, 48), message: text(row.reason, 160), confirmed: Number(row.confirmed) > 0, observedAt, interval, market: hasMarket ? { latestBar: { confirmed: Number(row.confirmed) > 0 } } : null, freshness: orb2FieldFreshness(interval, observedAt, now) } : null;
        })();
        if (parsed) {
          observationByDiscAndSymbol.set(`${discId}:${symbol}`, {
            ...parsed,
            provider: text(row.provider, 24) || parsed.provider,
            freshness: orb2FieldFreshness(interval, parsed.observedAt, now)
          });
        }
      }
    }
    for (const observation of observations) {
      const key = `${observation.discId}:${observation.symbol}`;
      if (!observationByDiscAndSymbol.has(key)) {
        observationByDiscAndSymbol.set(key, {
          ...observation,
          freshness: observation.freshness || orb2FieldFreshness(observation.interval || interval, observation.observedAt, now)
        });
      }
    }
    const instrumentsByDisc = new Map(ORB2_FIELD_DISCS.map(discId => [discId, []]));
    for (const instrument of rosterForStatus.instruments) {
      const bucket = instrumentsByDisc.get(instrument.discId);
      if (bucket) bucket.push(instrument);
    }
    const activeCommoditySymbols = new Set(rosterForStatus.commodities.map(instrument => instrument.symbol));
    const discs = ORB2_FIELD_DISCS.map((discId, index) => {
      const instruments = instrumentsByDisc.get(discId) || [];
      const discDef = catalogForStatus && typeof catalogForStatus.disc === "function" ? catalogForStatus.disc(discId) : null;
      const reviewedRoster = discId === "commodities"
        ? (Array.isArray(catalogForStatus && catalogForStatus.commodities) ? catalogForStatus.commodities : [])
        : discId === "stocks" ? rosterForStatus.stocks
          : discId === "crypto" ? [...rosterForStatus.crypto, ...rosterForStatus.cryptoPairs]
            : instruments;
      const reviewedInstrumentCount = discId === "commodities" && Array.isArray(catalogForStatus && catalogForStatus.commodities)
        ? catalogForStatus.commodities.length
        : discId === "stocks"
          ? (rosterForStatus.stocks.length || 52)
          : discId === "crypto"
            ? (rosterForStatus.crypto.length + rosterForStatus.cryptoPairs.length ||
              (cachedCryptoRanking.ok
                ? (cachedCryptoRanking.ranking?.instruments?.length || 0) + (cachedCryptoRanking.ranking?.crossPairs?.length || 0)
                : 0))
            : instruments.length;
      const reviewedSymbols = new Set();
      for (const instrument of reviewedRoster) {
        const symbol = text(instrument && instrument.symbol, 32).toUpperCase();
        if (SYMBOL_PATTERN.test(symbol)) reviewedSymbols.add(symbol);
      }
      let stored = 0;
      let confirmed = 0;
      let newestAt = 0;
      const providerSet = new Set();
      if (storedRowsRead) {
        for (const [symbol, row] of storedByDisc.get(discId) || []) {
          if (!reviewedSymbols.has(symbol)) continue;
          stored += 1;
          if (row.confirmed) confirmed += 1;
          newestAt = Math.max(newestAt, row.observedAt);
          if (row.provider) providerSet.add(row.provider);
        }
      } else {
        for (const observation of observations) {
          if (observation.discId !== discId || !reviewedSymbols.has(observation.symbol)) continue;
          stored += 1;
          if (observation.confirmed) confirmed += 1;
          newestAt = Math.max(newestAt, Number(observation.observedAt) || 0);
        }
      }
      let active = 0;
      let stale = 0;
      let held = 0;
      let pending = 0;
      const members = reviewedRoster.map(instrument => {
        const symbol = text(instrument.symbol, 32).toUpperCase();
        const observation = observationByDiscAndSymbol.get(`${discId}:${symbol}`) || null;
        const freshness = observation
          ? observation.freshness || orb2FieldFreshness(observation.interval || interval, observation.observedAt, now)
          : null;
        const hasMarket = Boolean(observation && observation.market);
        const memberStatus = hasMarket
          ? freshness && freshness.status === "fresh" ? "active" : "stale"
          : observation ? "held"
            : discId === "commodities" && !activeCommoditySymbols.has(symbol) ? "contract-pending" : "pending";
        if (memberStatus === "active") active += 1;
        else if (memberStatus === "stale") stale += 1;
        else if (memberStatus === "held") held += 1;
        else pending += 1;
        const contractPending = memberStatus === "contract-pending";
        return {
          symbol,
          displaySymbol: text(instrument.displaySymbol, 48) || symbol,
          status: memberStatus,
          provider: observation?.provider || (discId === "crypto" ? "kraken" : discId === "stocks" ? "tickerbot" : "massive"),
          observedAt: observation ? Number(observation.observedAt) || null : null,
          freshness: freshness ? freshness.status : null,
          code: observation ? text(observation.code, 48) : contractPending ? "active-contract-pending" : "",
          message: observation ? text(observation.message, 160) : contractPending
            ? `Waiting for a current Massive-verified active futures contract (${String(instrument.massive?.productCode || "unknown")}).`
            : memberStatus === "pending" ? "No stored observation yet." : ""
        };
      });
      const providers = [...providerSet].sort();
      return {
        id: discId,
        number: Number(discDef && discDef.number) || index + 1,
        label: text(discDef && discDef.label, 64) || `Disc ${index + 1} · ${discId}`,
        name: text(discDef && discDef.name, 48) || discId,
        assetClass: text(discDef && discDef.assetClass, 24) || "",
        instruments: reviewedInstrumentCount,
        ...(discId === "crypto" ? { assets: rosterForStatus.crypto.length, pairs: reviewedInstrumentCount } : {}),
        stored,
        confirmed,
        newestAt: newestAt || null,
        observed: active + stale,
        active,
        stale,
        held,
        pending,
        members,
        providers,
        intervals: stored > 0 ? [interval] : [],
        covered: active > 0,
        complete: reviewedInstrumentCount > 0 && active >= reviewedInstrumentCount
      };
    });
    const status = {
      schema: ORB2_FIELD_STATUS_SCHEMA,
      source: "server-field",
      continuous: true,
      cron: ORB2_FIELD_CRON,
      pollAfterMs: ORB2_FIELD_POLL_MS,
      interval,
      freshness: ORB2_FIELD_FRESHNESS[interval],
      lastTickAt: Number(run && run.last_tick_at) || null,
      lastObservationAt: Number(run && run.last_observation_at) || null,
      lastSweepCompletedAt: Number(run && run.last_sweep_completed_at) || null,
      sweepsCompleted: Number(run && run.sweeps_completed) || 0,
      lastError: text(run && run.last_error, 200),
      massive: {
        callsToday: Number(run && run.massive_calls) || 0,
        perMinute: ORB2_MASSIVE_PER_MINUTE_PER_ASSET_CLASS,
        perMinutePerAssetClass: ORB2_MASSIVE_PER_MINUTE_PER_ASSET_CLASS,
        perMinuteScope: "per-asset-class",
        dailyLimit: null,
        remainingToday: null,
        exhausted: false,
        ledger: "provider-rate-class",
        note: "Massive Basic: five requests per minute per asset class; the former 300/day application guard is no longer a provider gate."
      },
      kraken: {
        callsToday: Number(run && run.kraken_calls) || 0,
        dailyLimit: krakenLedger.ok ? krakenLedger.ledger.dailyLimit : KRAKEN_PROVIDER_DAILY_LIMIT,
        perSecond: 1,
        remainingToday: krakenLedger.ok ? krakenLedger.ledger.remaining : null,
        exhausted: krakenLedger.ok ? krakenLedger.ledger.exhausted : null,
        ledger: krakenLedger.ok ? "ready" : "unavailable",
        ranking: cachedCryptoRanking.ok ? {
          provider: "Kraken", venue: "Kraken Spot", metric: cachedCryptoRanking.ranking.metric,
          sourceWindow: cachedCryptoRanking.ranking.sourceWindow, rankedAt: cachedCryptoRanking.ranking.rankedAt,
          cached: true
        } : null,
        note: krakenLedger.ok ? krakenLedger.ledger.note : krakenLedger.message
      },
      futuresContracts: {
        cache: cachedFutures.ok ? "ready" : "unavailable",
        asOfDate: new Date(now).toISOString().slice(0, 10),
        reviewedProducts: Array.isArray(catalogForStatus && catalogForStatus.commodities) ? catalogForStatus.commodities.length : 0,
        activeContracts: cachedFutures.ok ? Object.keys(cachedFutures.contracts).length : 0,
        staleFallback: false,
        note: cachedFutures.ok
          ? "Only Massive-verified active single contracts for the current UTC date enter Disc4."
          : "Apply D1 migration 0011_massive_futures_contract_cache.sql; Disc4 contracts remain held."
      },
      tickerbot: {
        callsToday: Number(run && run.tickerbot_calls) || 0,
        callsThisMonth: tickerbotLedger.ok ? tickerbotLedger.ledger.calls : null,
        monthlyLimit: tickerbotLedger.ok ? tickerbotLedger.ledger.workerLimit : null,
        reserveCalls: tickerbotLedger.ok ? tickerbotLedger.ledger.reserveCalls : null,
        exhausted: tickerbotLedger.ok ? tickerbotLedger.ledger.exhausted : null,
        ledger: tickerbotLedger.ok ? "ready" : "unavailable",
        note: tickerbotLedger.ok ? tickerbotLedger.ledger.note : tickerbotLedger.message
      },
      queue,
      warmBurst: {
        callsPerBurst: ORB2_FIELD_TICKERBOT_BURST_CALLS,
        perTick: ORB2_FIELD_TICKERBOT_BURST_PER_TICK,
        bursts: Number(control && control.warm_bursts) || 0,
        deployWarmAt: Number(control && control.deploy_warm_at) || null,
        manualWarmAt: Number(control && control.manual_warm_at) || null,
        coldAfterMs: ORB2_FIELD_COLD_MS
      },
      counts: {
        stored: observations.length,
        observed: marketCount,
        confirmed: confirmedCount,
        held: heldCount,
        reviewedInstruments: discs.reduce((sum, d) => sum + (Number(d.instruments) || 0), 0)
      },
      discs
    };
    return {
      ok: true,
      schema: ORB2_FIELD_SCHEMA,
      generatedAt: new Date(now).toISOString(),
      interval,
      disc: disc || "all",
      requestedTypes: [...requestedTypes],
      beatTypes: types,
      status,
      ds,
      observations
    };
  } catch (error) {
    return {
      ok: false, code: "field-read-failed",
      message: "The Orb 2 server field could not be read. Confirm community migrations through 0012 are applied; the live field is unchanged.",
      detail: text(error && error.message, 120)
    };
  }
}

/**
 * The field route is intentionally read-only. Clients never call providers; they only
 * ask the server field for the newest stored observations + status.
 */
export async function handleOrb2Field(request, env = {}, context = {}) {
  const now = nowOf(context);
  const db = env.COMMUNITY_DB;
  if (!db || typeof db.prepare !== "function") {
    return failure("The Orb 2 server field needs the COMMUNITY_DB binding and community migrations through 0012. No fallback source is used.", 503);
  }
  if (!isAllowedOrigin(request, env)) {
    return failure("The Orb 2 server field rejects requests from disallowed origins.", 403);
  }
  const method = request.method || "GET";
  let body = null;
  if (method === "POST") {
    try {
      body = await request.json();
    } catch {
      return failure("Request body must be valid JSON.", 400);
    }
  }
  if (method === "GET") {
    const interval = ORB2_FIELD_INTERVALS.includes((new URL(request.url)).searchParams.get("interval"))
      ? (new URL(request.url)).searchParams.get("interval")
      : ORB2_FIELD_DEFAULT_INTERVAL;
    const disc = ORB2_FIELD_DISCS.includes((new URL(request.url)).searchParams.get("disc"))
      ? (new URL(request.url)).searchParams.get("disc")
      : null;
    const symbols = (new URL(request.url)).searchParams.get("symbols");
    const requestedSymbols = Array.isArray(symbols ? symbols.split(",") : [])
      ? [...new Set((symbols || "").split(",").map(symbol => String(symbol || "").trim().toUpperCase()).filter(symbol => SYMBOL_PATTERN.test(symbol)))].slice(0, ORB2_FIELD_MAX_OBSERVATIONS)
      : [];
    const types = (new URL(request.url)).searchParams.get("types");
    const requestedTypes = types ? types.split(",").filter(Boolean) : null;
    return readOrb2FieldSnapshot(env, { now, interval, disc, symbols: requestedSymbols, types: requestedTypes || undefined });
  }

  if (method !== "POST") {
    return failure("Use GET to read the field or POST to enqueue an explicit refresh request.", 405);
  }

  const value = isRecord(body) ? body : {};
  const action = text(value.action, 32).toLowerCase();
  const db = env.COMMUNITY_DB;
  const bySymbol = await readFieldRoster(db, now);
  if (action === "priority") {
    const symbols = Array.isArray(value.symbols) ? value.symbols : [];
    const requested = [...new Set(symbols.map(symbol => text(symbol, 32).toUpperCase()).filter(symbol => SYMBOL_PATTERN.test(symbol)))]
      .slice(0, ORB2_FIELD_MAX_PRIORITY_SYMBOLS);
    const entries = requested
      .filter(symbol => bySymbol.has(symbol) && bySymbol.get(symbol).assetClass === "equity")
      .map(symbol => ({ symbol, interval }));
    if (!entries.length) {
      return failure("Choose at least one reviewed stock from the Disc1 field roster; the priority lane runs on Tickerbot, which covers that reviewed deck.", 400);
    }
    const enqueued = await enqueuePriorityRefresh(db, entries, { now, reason: "focus" });
    const queue = await queueDepth(db, now);
    return json({
      success: true,
      environment: "orb2-server-field",
      data: {
        schema: ORB2_FIELD_REQUEST_SCHEMA, action: "priority", interval,
        accepted: entries.map(entry => entry.symbol),
        refused: requested.filter(symbol => !entries.some(entry => entry.symbol === symbol)),
        enqueued, queue, marketRequestSent: false,
        message: enqueued
          ? `${enqueued} priority job${enqueued === 1 ? "" : "s"} queued. The next scheduled tick claims them first; the client does not call a provider.`
          : "Those instruments are already queued; the running sweep is unchanged."
      }
    });
  }

  if (action === "warm") {
    const keys = providerKeys(env);
    if (!keys.tickerbot) return failure("Add the TICKERBOT_API_KEY Worker secret before warming the field.", 503);
    const control = await readControl(db);
    const lastWarm = Number(control && (control.manual_warm_at || control.deploy_warm_at)) || 0;
    const newestRow = await db.prepare("SELECT MAX(observed_at) AS newest FROM orb2_field_observations").first();
    const newest = Number(newestRow && newestRow.newest) || 0;
    const cold = newest === 0 || now - newest > ORB2_FIELD_COLD_MS;
    const requestedIntervals = (Array.isArray(value.intervals) ? value.intervals : ORB2_FIELD_WARM_INTERVALS)
      .map(item => text(item, 8));
    if (!requestedIntervals.length || requestedIntervals.some(item => !ORB2_FIELD_INTERVALS.includes(item))) {
      return failure("Warm intervals must be selected from 15m, 1h, and 1d.", 400);
    }
    const intervals = [...new Set(requestedIntervals)];
    if (!cold && now - lastWarm < ORB2_FIELD_WARM_COOLDOWN_MS) {
      return failure(`A warm burst already ran within the last ${Math.round(ORB2_FIELD_WARM_COOLDOWN_MS / 60_000)} minutes. The continuous rotation is still running; no Tickerbot calls were queued.`, 429);
    }
    const expected = TICKERBOT_WATCHLIST.length * (intervals.length || 1);
    const enqueued = await enqueueWarmBurst(db, { now, reason: value.reason === "deploy" ? "deploy-warm" : "manual-warm", intervals });
    await writeControl(db, {
      manualWarmAt: now, warmBursts: (Number(control && control.warm_bursts) || 0) + 1
    }, now);
    const queue = await queueDepth(db, now);
    return json({
      success: true,
      environment: "orb2-server-field",
      data: {
        schema: ORB2_FIELD_REQUEST_SCHEMA, action: "warm", intervals, enqueued, expected,
        callsPerBurst: ORB2_FIELD_TICKERBOT_BURST_CALLS, perTick: ORB2_FIELD_TICKERBOT_BURST_PER_TICK,
        queue, marketRequestSent: false,
        message: `${enqueued} of ${expected} Tickerbot warm jobs queued across ${intervals.join(" + ")}. The scheduled tick claims up to ${ORB2_FIELD_TICKERBOT_BURST_PER_TICK} jobs per minute and stops at the durable Tickerbot monthly ledger.`
      }
    });
  }

  return failure("Choose action=priority (bounded focus refresh), action=warm (the Tickerbot field burst), or action=tick (run one scheduled tick now).", 400);
}

