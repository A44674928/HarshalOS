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
 *   · A hidden tab, a closed laptop, or a sleeping owner changes nothing. The
 *     24/7/365 loop lives in the Worker and is bounded by the provider budget,
 *     not by a page-visibility event.
 *   · There is no client-side pacing timer, no provider warm-up hold, and no
 *     "restart the firing order" state to lose: the sweep cursor is a row in D1.
 *   · Manual refresh is a choice, not a repair: it prioritizes work that is
 *     already queued. Nothing here invents data; an unavailable berth stays held.
 *
 * The stored record is one instrument, not a bar series: symbol, disc, provider,
 * interval, a bounded market summary, and the Characters motion directive.
 */

import "./browser-globals.mjs";
import {
  TICKERBOT_INTERVALS,
  TICKERBOT_WATCHLIST,
  fetchTickerbotMarketContext,
  isTickerbotSymbol
} from "./good-intelligence-tickerbot.mjs";
import { fetchMassiveDailyMarketContext } from "./characters-massive.mjs";
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
export const ORB2_MASSIVE_PER_MINUTE = 5;
export const ORB2_FIELD_MAX_PRIORITY_SYMBOLS = 12;
export const ORB2_FIELD_TICKERBOT_BURST_PER_TICK = 24;
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
/* Per-isolate memory that the 0012 `kraken_calls` column is present. Columns are
   never dropped, so "present" is safe to cache forever; "missing" is never
   cached, so a database migrated out-of-band (wrangler d1 migrations apply) is
   picked up on the very next tick. */
let orb2FieldRunsKrakenColumnPresent = false;
export function clearOrb2FieldSchemaCache() {
  orb2FieldRunsKrakenColumnPresent = false;
}
const MAX_BODY_BYTES = 8 * 1024;
const UPSTREAM_TIMEOUT_MS = 8_000;
const FETCH_CONCURRENCY = 4;
const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9._:/-]{0,31}$/;
const canonicalKrakenAsset = value => value === "XBT" ? "BTC" : value === "XDG" ? "DOGE" : value;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/*
 * The beat-type dial. `observation` is the only provider-data type; the other
 * four are deterministic local scenarios choreographed from a stored beat (see
 * js/good-intelligence-orb2-scenarios.js). Each type declares what a berth must
 * supply before the type is offered at all, so the dial can never label an
 * incomplete observation as a trade, an authorization, or a permission.
 */
export const ORB2_FIELD_BEAT_TYPES = Object.freeze([
  Object.freeze({
    id: "observation", label: "Market observation", live: true, gate: "stored",
    summary: "One reviewed instrument's newest provider observation. The only beat type that carries provider data."
  }),
  Object.freeze({
    id: "message", label: "OCM message", live: false, gate: "market",
    summary: "Local scenario: an envelope travels origin → berth → origin. No OCM message is sent."
  }),
  Object.freeze({
    id: "trade", label: "Trade", live: false, gate: "volume",
    summary: "Local scenario: two berths exchange an item while supplied volume is available. Nothing is bought or settled."
  }),
  Object.freeze({
    id: "authorization", label: "Authorization", live: false, gate: "confirmed",
    summary: "Local scenario: the Human Key is presented at the Center Origin gate. It grants nothing and authorizes nothing."
  }),
  Object.freeze({
    id: "permission", label: "Permission to act", live: false, gate: "motion",
    summary: "Local scenario: a bounded permission envelope is presented, scoped, and withdrawn. Nothing becomes permitted."
  })
]);

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

/** A stored refusal is not coverage. It waits only for the provider-specific
 * bounded retry interval; successful market data follows its freshness window. */
export function orb2FieldNeedsRefresh(observation, now = Date.now(), provider = observation && observation.provider) {
  if (!observation || !Number.isFinite(Number(observation.observedAt)) || Number(observation.observedAt) <= 0) return true;
  if (observation.market) return fieldObservationExpired(observation.interval || "1d", observation.observedAt, now);
  const retryMs = ORB2_FIELD_FAILURE_RETRY_MS[provider] || ORB2_FIELD_FAILURE_RETRY_MS.massive;
  return Number(now) - Number(observation.observedAt) >= retryMs;
}

/* ── reviewed roster ──────────────────────────────────────────────────── */

/**
 * The server field's instrument set, built from the same reviewed catalogs the
 * browser renders: the 52-card Tickerbot stock roster (with attributed
 * metadata), the BIS FX catalog, Kraken Spot-ranked USD pairs, Massive-verified
 * active futures contracts, and the reviewed Massive index roster.
 *
 * A catalog or active contract that is unavailable contributes nothing: the
 * sweep simply does not cover it, and no substitute instrument is invented.
 */
export function orb2FieldRoster({ now = Date.now(), cryptoRanking = null, commodityContracts = null } = {}) {
  const roster = globalThis.GoodIntelligenceMarketRoster;
  const catalog = globalThis.CharactersDiscCatalog;
  const ds = globalThis.GoodIntelligenceDollarStrength;
  const stocks = [];
  if (roster && Array.isArray(roster.assets) && ds && typeof ds.buildFiringOrder === "function") {
    for (const asset of ds.buildFiringOrder(roster.assets)) {
      if (!asset || !SYMBOL_PATTERN.test(String(asset.symbol || ""))) continue;
      stocks.push(Object.freeze({
        symbol: asset.symbol, displaySymbol: asset.symbol, name: text(asset.name, 64),
        sector: text(asset.sector, 64), discId: "stocks", assetClass: "equity",
        firingOrder: asset.firingOrder, marketCapUsd: asset.marketCapUsd
      }));
    }
  }
  const statics = (list, discId, assetClass) => (Array.isArray(list) ? list : [])
    .filter(entry => entry && SYMBOL_PATTERN.test(String(entry.symbol || "")))
    .map(entry => Object.freeze({ ...entry, discId, assetClass: assetClass || entry.assetClass }));
  const fx = statics(catalog && catalog.fxCurrencies, "fx", "fx");
  const today = new Date(Number(now)).toISOString().slice(0, 10);
  const contracts = commodityContracts && typeof commodityContracts === "object" ? commodityContracts : {};
  const commodities = statics(catalog && catalog.commodities, "commodities", "commodity")
    .flatMap(entry => {
      const productCode = String(entry.massive && entry.massive.productCode || "").toUpperCase();
      const contract = contracts[productCode];
      const ticker = String(contract && contract.ticker || "").toUpperCase();
      const lastTradeDate = String(contract && contract.lastTradeDate || "");
      if (!/^[A-Z0-9]{1,8}$/.test(productCode) || !contract || contract.provider !== "Massive" ||
          contract.productCode !== productCode || contract.asOfDate !== today ||
          !/^[A-Z0-9]{1,8}[FGHJKMNQUVXZ]\d{1,2}$/.test(ticker) || !ticker.startsWith(productCode) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(lastTradeDate) || lastTradeDate < today) return [];
      return [Object.freeze({
        ...entry,
        massive: Object.freeze({ ...entry.massive, ticker, family: "futures" }),
        massiveTicker: ticker,
        providerId: ticker,
        massiveContract: Object.freeze({
          ticker, productCode, provider: "Massive", asOfDate: today, lastTradeDate,
          ...(Number.isInteger(contract.daysToMaturity) && contract.daysToMaturity >= 0
            ? { daysToMaturity: contract.daysToMaturity } : {}),
          ...(typeof contract.name === "string" ? { name: contract.name.slice(0, 120) } : {})
        }),
        discId: "commodities", assetClass: "commodity"
      })];
    });
  const indices = statics(catalog && catalog.indices, "indices", "index");
  const crypto = (cryptoRanking && Array.isArray(cryptoRanking.instruments) ? cryptoRanking.instruments : [])
    .filter(entry => entry && entry.rankingProvider === "Kraken" && /^[A-Z0-9]{2,12}$/.test(String(entry.symbol || "")) &&
      /^[A-Z0-9]{2,12}\/USD$/.test(String(entry.krakenPair || "")) && entry.providerId === entry.krakenPair &&
      (entry.baseAsset === undefined || entry.baseAsset === entry.symbol) &&
      (entry.quoteAsset === undefined || entry.quoteAsset === "USD"))
    .map(entry => Object.freeze({ ...entry, baseAsset: entry.baseAsset || entry.symbol, quoteAsset: "USD", pairType: "usd", discId: "crypto", assetClass: "crypto" }));
  const cryptoPairs = (cryptoRanking && Array.isArray(cryptoRanking.crossPairs) ? cryptoRanking.crossPairs : [])
    .slice(0, CHARACTERS_CRYPTO_CROSS_PAIR_SIZE)
    .filter(entry => {
      const pair = String(entry && entry.krakenPair || "").toUpperCase();
      const match = /^([A-Z0-9]{2,12})\/([A-Z0-9]{2,12})$/.exec(pair);
      const baseAsset = String(entry && entry.baseAsset || "").toUpperCase();
      const quoteAsset = String(entry && entry.quoteAsset || "").toUpperCase();
      return entry && entry.rankingProvider === "Kraken" && entry.pairType === "cross" &&
        /^[A-Z0-9]{2,12}-[A-Z0-9]{2,12}$/.test(String(entry.symbol || "")) &&
        entry.symbol === `${baseAsset}-${quoteAsset}` && match && entry.providerId === pair &&
        baseAsset === (match[1] === "XBT" ? "BTC" : match[1] === "XDG" ? "DOGE" : match[1]) &&
        quoteAsset === (match[2] === "XBT" ? "BTC" : match[2] === "XDG" ? "DOGE" : match[2]) &&
        baseAsset !== quoteAsset && (crypto.some(asset => asset.symbol === baseAsset) || crypto.some(asset => asset.symbol === quoteAsset));
    })
    .map(entry => Object.freeze({ ...entry, discId: "crypto", assetClass: "crypto" }));
  const instruments = [...stocks, ...fx, ...crypto, ...cryptoPairs, ...commodities, ...indices];
  const dsSymbols = ds && Array.isArray(ds.COMPONENTS)
    ? ds.COMPONENTS.map(component => component.symbol).filter(symbol => fx.some(entry => entry.symbol === symbol))
    : [];
  return Object.freeze({
    instruments: Object.freeze(instruments),
    stocks: Object.freeze(stocks),
    fx: Object.freeze(fx),
    commodities: Object.freeze(commodities),
    indices: Object.freeze(indices),
    crypto: Object.freeze(crypto),
    cryptoPairs: Object.freeze(cryptoPairs),
    dsSymbols: Object.freeze(dsSymbols),
    discs: Object.freeze([...new Set(instruments.map(instrument => instrument.discId))])
  });
}

/* ── stored observation validation ────────────────────────────────────── */

/**
 * Validate one stored field observation. The payload is validated on the way in
 * (from an upstream packet) and again on the way out (from D1), so a hand-edited
 * row cannot be rendered as provider data.
 */
export function sanitizeOrb2FieldObservation(value, now = Date.now()) {
  if (!isRecord(value) || value.schema !== ORB2_FIELD_OBSERVATION_SCHEMA) {
    return { ok: false, message: "Send one gi-orb2-field-observation-v1 record." };
  }
  const symbol = text(value.symbol, 32).toUpperCase();
  if (!SYMBOL_PATTERN.test(symbol)) return { ok: false, message: "A reviewed uppercase symbol is required." };
  const discId = text(value.discId, 24).toLowerCase();
  if (!ORB2_FIELD_DISCS.includes(discId)) return { ok: false, message: "Choose a reviewed Disc." };
  const provider = text(value.provider, 24).toLowerCase();
  if (!PROVIDER_IDS.has(provider)) return { ok: false, message: "Only the reviewed Massive, Tickerbot, and Kraken providers may write the server field." };
  const interval = text(value.interval, 8);
  if (!TICKERBOT_INTERVALS.includes(interval)) return { ok: false, message: "The field stores 15m, 1h, and 1d observations only." };
  if (provider === "massive" && (interval !== "1d" || !["fx", "commodities", "indices"].includes(discId))) {
    return { ok: false, message: "Massive writes daily FX, commodity-futures, and index observations only." };
  }
  if (provider === "tickerbot" && (discId !== "stocks" || !TICKERBOT_INTERVALS.includes(interval))) {
    return { ok: false, message: "Tickerbot writes Disc1 stock observations only." };
  }
  if (provider === "kraken" && (discId !== "crypto" || interval !== "1d")) {
    return { ok: false, message: "Kraken writes Disc3 Spot pair daily observations only." };
  }
  const krakenPair = text(value.krakenPair, 32).toUpperCase();
  const providerId = text(value.providerId, 48).toUpperCase();
  const rankingProvider = text(value.rankingProvider, 24);
  let baseAsset = "";
  let quoteAsset = "";
  if (provider === "kraken") {
    const pairMatch = /^([A-Z0-9]{2,12})\/([A-Z0-9]{2,12})$/.exec(krakenPair);
    const providerBase = pairMatch?.[1] || "";
    const providerQuote = pairMatch?.[2] || "";
    baseAsset = canonicalKrakenAsset(providerBase);
    quoteAsset = canonicalKrakenAsset(providerQuote);
    const expectedSymbol = quoteAsset === "USD" ? baseAsset : `${baseAsset}-${quoteAsset}`;
    const suppliedBase = value.baseAsset === undefined ? baseAsset : text(value.baseAsset, 12).toUpperCase();
    const suppliedQuote = value.quoteAsset === undefined ? quoteAsset : text(value.quoteAsset, 12).toUpperCase();
    if (!pairMatch || providerId !== krakenPair || rankingProvider !== "Kraken" || symbol !== expectedSymbol ||
        suppliedBase !== baseAsset || suppliedQuote !== quoteAsset) {
      return { ok: false, message: "A Kraken observation must retain its exact ranked base/quote pair identity." };
    }
  } else if (krakenPair || rankingProvider || value.baseAsset !== undefined || value.quoteAsset !== undefined) {
    return { ok: false, message: "A Kraken pair identity cannot be attached to another provider." };
  }
  /* Range-checked, not clamped: a future or pre-2000 timestamp is refused outright
     rather than silently rewritten into the accepted window. */
  const at = Number.isSafeInteger(value.observedAt)
    && value.observedAt >= Date.parse("2000-01-01T00:00:00.000Z")
    && value.observedAt <= Math.floor(now + 300_000) ? value.observedAt : null;
  if (at === null) return { ok: false, message: "The observation timestamp is invalid." };
  if (!UUID.test(String(value.beatId || ""))) return { ok: false, message: "A UUID beat id is required." };
  const market = value.market === null || value.market === undefined ? null : orb2SharedSanitizers.market(value.market);
  if (value.market !== null && value.market !== undefined && market === null) {
    return { ok: false, message: "The stored market summary is malformed." };
  }
  const motion = value.motion === null || value.motion === undefined ? null : orb2SharedSanitizers.motion(value.motion);
  if (value.motion !== null && value.motion !== undefined && motion === null) {
    return { ok: false, message: "The stored motion directive is malformed." };
  }
  const composition = value.composition === null || value.composition === undefined
    ? null : sanitizeOrb2Composition(value.composition);
  if (value.composition !== null && value.composition !== undefined && composition === null) {
    return { ok: false, message: "The stored daily/15m composition is malformed." };
  }
  if (!market && !motion) return { ok: false, message: "A field observation must carry a market summary or a motion directive." };
  const barTime = Number.isSafeInteger(value.barTime) && value.barTime >= 0 && value.barTime <= 8_640_000_000_000
    ? value.barTime : null;
  const confirmed = value.confirmed === true
    || Boolean(market && market.latestBar && market.latestBar.confirmed === true);
  /* Beat-type support is computed once, on the way out, so every client renders
     the same dial state for the same stored row. */
  const beatTypes = orb2FieldBeatTypesFor({ market, motion, confirmed });
  return {
    ok: true,
    observation: Object.freeze({
      schema: ORB2_FIELD_OBSERVATION_SCHEMA,
      beatTypes,
      symbol,
      displaySymbol: text(value.displaySymbol, 48) || symbol,
      name: text(value.name, 64),
      sector: text(value.sector, 64),
      discId,
      provider,
      ...(providerId ? { providerId } : {}),
      ...(provider === "kraken" ? { krakenPair, rankingProvider, baseAsset, quoteAsset } : {}),
      interval,
      status: STATUSES.has(value.status) ? value.status : "unavailable",
      reason: text(value.reason, 48) || "server-sweep",
      code: /^[a-z0-9-]{0,48}$/i.test(String(value.code || "")) ? String(value.code) : "",
      message: text(value.message, 240),
      beatId: String(value.beatId).toLowerCase(),
      observedAt: at,
      barTime,
      confirmed,
      market,
      motion,
      composition
    })
  };
}

/** Which beat types this stored observation can honestly support. */
export function orb2FieldBeatTypesFor(observation) {
  const market = observation && observation.market;
  const hasMarket = Boolean(market);
  const gates = {
    stored: true,
    market: hasMarket,
    volume: Boolean(market && market.volumeAvailable === true && market.latestBar && Number.isFinite(Number(market.latestBar.volume))),
    confirmed: Boolean(observation && observation.confirmed === true && hasMarket),
    motion: Boolean(observation && observation.motion)
  };
  return ORB2_FIELD_BEAT_TYPES.filter(type => gates[type.gate] === true).map(type => type.id);
}

/* ── packet → stored observation (the server beat itself) ─────────────── */

/**
 * Turn one validated provider packet into a stored field observation using the
 * shared Good Intelligence evaluator and Characters motion engine. This is the
 * exact step the browser used to perform; it now runs once per instrument on the
 * server so every client renders the same directive.
 */
export function observationFromPacket({
  packet, symbol, displaySymbol, name, sector, discId, provider, providerId = null, krakenPair = null,
  rankingProvider = null, baseAsset = null, quoteAsset = null,
  interval = "1d", now = Date.now(), reason = "server-sweep", beatId = uuid(), composition = null
}) {
  const marketContext = globalThis.GoodIntelligenceMarketContext;
  const beat = globalThis.CharactersBeat;
  if (!marketContext || !beat || !packet) return null;
  const normalized = marketContext.normalizePacket(packet);
  const analysis = normalized ? marketContext.evaluate(normalized) : null;
  const motion = beat.motion(analysis, { bearingBase: 0 });
  const confirmedBars = normalized && Array.isArray(normalized.bars)
    ? normalized.bars.filter(bar => bar && bar.confirmed === true && Number.isFinite(Number(bar.close)))
    : [];
  const latestBar = normalized && normalized.bars.length ? normalized.bars[normalized.bars.length - 1] : null;
  const activityBar = confirmedBars.at(-1) || null;
  const compactBar = bar => bar ? {
    time: Number(bar.time),
    ...(Number.isFinite(Number(bar.open)) ? { open: Number(bar.open) } : {}),
    ...(Number.isFinite(Number(bar.high)) ? { high: Number(bar.high) } : {}),
    ...(Number.isFinite(Number(bar.low)) ? { low: Number(bar.low) } : {}),
    ...(Number.isFinite(Number(bar.close)) ? { close: Number(bar.close) } : {}),
    ...(Number.isFinite(Number(bar.volume)) ? { volume: Number(bar.volume) } : {}),
    confirmed: true
  } : null;
  const latestClose = latestBar ? Number(latestBar.close) : null;
  const closeOf = bar => bar ? Number(bar.close) : null;
  const previousConfirmed = confirmedBars.length > 1 ? confirmedBars[confirmedBars.length - 1] : null;
  const compareClose = confirmedBars.length > 1 ? closeOf(confirmedBars[confirmedBars.length - 2]) : null;
  const previousClose = previousConfirmed ? closeOf(previousConfirmed) : null;
  const changePct = previousClose !== null && compareClose !== null && compareClose > 0
    ? ((previousClose - compareClose) / compareClose) * 100 : null;
  const numberOrNull = value => Number.isFinite(Number(value)) ? Number(value) : null;
  const market = analysis ? {
    status: String(analysis.status || "unknown").slice(0, 24),
    source: String(analysis.source || (normalized && normalized.source) || "").slice(0, 160),
    ...(packet.massiveContract ? { massiveContract: packet.massiveContract } : {}),
    timeframe: String(analysis.timeframe || (normalized && normalized.timeframe) || interval).slice(0, 24),
    dataShape: String(analysis.dataShape || (normalized && normalized.dataShape) || "unknown").slice(0, 16),
    synthetic: Boolean(analysis.synthetic || (normalized && normalized.synthetic)),
    barCount: Math.max(0, Number(analysis.barCount) || 0),
    volumeAvailable: analysis.volumeAvailable === true,
    activityBar: compactBar(activityBar),
    latestBar: latestBar ? {
      time: Number(latestBar.time),
      ...(Number.isFinite(Number(latestBar.open)) ? { open: Number(latestBar.open) } : {}),
      ...(Number.isFinite(Number(latestBar.high)) ? { high: Number(latestBar.high) } : {}),
      ...(Number.isFinite(Number(latestBar.low)) ? { low: Number(latestBar.low) } : {}),
      ...(latestClose !== null && Number.isFinite(latestClose) ? { close: latestClose } : {}),
      ...(Number.isFinite(Number(latestBar.volume)) ? { volume: Number(latestBar.volume) } : {}),
      confirmed: latestBar.confirmed === true
    } : null,
    previousClose: numberOrNull(previousClose),
    changePct: numberOrNull(changePct),
    basis: analysis.bands ? numberOrNull(analysis.bands.basis) : null,
    bands: analysis.bands ? {
      lower1000: numberOrNull(analysis.bands.lower1000),
      upper1000: numberOrNull(analysis.bands.upper1000)
    } : null,
    vfi: analysis.vfi ? {
      value: numberOrNull(analysis.vfi.value),
      signal: numberOrNull(analysis.vfi.signal),
      available: analysis.vfi.available === true
    } : null,
    waveTrend: analysis.waveTrend ? {
      wt1: numberOrNull(analysis.waveTrend.wt1),
      wt2: numberOrNull(analysis.waveTrend.wt2),
      zone: String(analysis.waveTrend.zone || "unknown").slice(0, 48)
    } : null
  } : null;
  const candidate = {
    schema: ORB2_FIELD_OBSERVATION_SCHEMA,
    symbol, displaySymbol: displaySymbol || symbol, name, sector, discId, provider,
    ...(providerId || packet.providerId ? { providerId: providerId || packet.providerId } : {}),
    ...(krakenPair ? {
      krakenPair, rankingProvider: rankingProvider || "Kraken",
      ...(baseAsset ? { baseAsset } : {}), ...(quoteAsset ? { quoteAsset } : {})
    } : {}),
    interval, status: "bars", reason, code: "", message: "", beatId,
    observedAt: now,
    barTime: latestBar && Number.isFinite(Number(latestBar.time)) ? Number(latestBar.time) : null,
    confirmed: Boolean(latestBar && latestBar.confirmed === true),
    market, motion, composition
  };
  const parsed = sanitizeOrb2FieldObservation(candidate, now);
  return parsed.ok ? parsed.observation : null;
}

/** A held berth: an explicit, validated refusal with the same shape. */
export function heldFieldObservation({
  symbol, displaySymbol, name, sector, discId, provider, providerId = null, krakenPair = null,
  rankingProvider = null, baseAsset = null, quoteAsset = null,
  interval = "1d", now = Date.now(), reason = "server-sweep", code = "", message = ""
}) {
  const beat = globalThis.CharactersBeat;
  const motion = beat ? beat.motion(null, { bearingBase: 0 }) : null;
  const candidate = {
    schema: ORB2_FIELD_OBSERVATION_SCHEMA,
    symbol, displaySymbol: displaySymbol || symbol, name, sector, discId, provider,
    ...(providerId ? { providerId } : {}),
    ...(krakenPair ? {
      krakenPair, rankingProvider: rankingProvider || "Kraken",
      ...(baseAsset ? { baseAsset } : {}), ...(quoteAsset ? { quoteAsset } : {})
    } : {}),
    interval, status: "unavailable", reason, code, message, beatId: uuid(),
    observedAt: now, barTime: null, confirmed: false, market: null, motion
  };
  const parsed = sanitizeOrb2FieldObservation(candidate, now);
  return parsed.ok ? parsed.observation : null;
}

/* ── D1 access ───────────────────────────────────────────────────────── */

async function ensureRunRow(db, now) {
  /* Self-heal for databases that predate migration 0012. The column check reads
     sqlite_schema (a plain SELECT that never fails when the column exists) and
     only issues ALTER TABLE when the column is actually absent — so a migrated
     database never emits the `duplicate column name: kraken_calls` SQLITE_ERROR
     that an unconditional ALTER would log to Workers Observability on every
     one-minute tick. A duplicate-column race between two isolates self-healing
     the same database at once is the one tolerated exception, and it can only
     happen until the column exists. */
  if (!orb2FieldRunsKrakenColumnPresent) {
    try {
      const table = await db.prepare(
        "SELECT sql FROM sqlite_schema WHERE type = 'table' AND name = 'orb2_field_runs'"
      ).first();
      if (!table) {
        /* Migrations have not been applied at all; there is nothing to alter.
           The INSERT below surfaces the genuine "migration required" failure. */
      } else if (/\bkraken_calls\b/.test(String(table.sql || ""))) {
        orb2FieldRunsKrakenColumnPresent = true;
      } else {
        try {
          await db.prepare("ALTER TABLE orb2_field_runs ADD COLUMN kraken_calls INTEGER NOT NULL DEFAULT 0").run();
          orb2FieldRunsKrakenColumnPresent = true;
        } catch (alterError) {
          if (String((alterError && alterError.message) || "").includes("duplicate column")) {
            /* Another isolate won the race to self-heal; the column exists now. */
            orb2FieldRunsKrakenColumnPresent = true;
          }
          /* Any other ALTER failure is left uncached: readRun/recordTickResult
             below transparently fall back to the pre-0012 columns, and the next
             tick retries the cheap schema check. */
        }
      }
    } catch (_) {
      /* The schema probe itself failed; fall through to the INSERT so the tick
         reports the real database state instead of a probe error. */
    }
  }
  await db.prepare("INSERT INTO orb2_field_runs (utc_day, updated_at) VALUES (?, ?) ON CONFLICT(utc_day) DO NOTHING")
    .bind(utcDay(now), now).run();
}

async function readRun(db, now) {
  try {
    return (await db.prepare(`SELECT utc_day, massive_calls, tickerbot_calls, kraken_calls, sweeps_completed, last_tick_at,
        last_observation_at, last_sweep_completed_at, last_error, lock_owner, lock_at, updated_at
      FROM orb2_field_runs WHERE utc_day = ?`).bind(utcDay(now)).first()) ?? null;
  } catch (err) {
    if (String(err && err.message).includes("kraken_calls")) {
      const fallback = (await db.prepare(`SELECT utc_day, massive_calls, tickerbot_calls, sweeps_completed, last_tick_at,
          last_observation_at, last_sweep_completed_at, last_error, lock_owner, lock_at, updated_at
        FROM orb2_field_runs WHERE utc_day = ?`).bind(utcDay(now)).first()) ?? null;
      return fallback ? { ...fallback, kraken_calls: 0 } : null;
    }
    throw err;
  }
}

async function readControl(db) {
  return (await db.prepare("SELECT deploy_warm_at, manual_warm_at, warm_bursts, ranking_attempt_at, updated_at FROM orb2_field_control WHERE id = 1").first()) ?? null;
}

async function writeControl(db, patch, now) {
  /* Read-modify-write of one advisory row (cooldowns and the warm-burst counter).
     It is not an allowance: the durable provider ledgers are the authorities, and
     the scheduled tick already holds the single-writer lease when it writes here. */
  const current = (await readControl(db)) || {};
  const deploy = patch.deployWarmAt !== undefined ? patch.deployWarmAt : (current.deploy_warm_at ?? null);
  const manual = patch.manualWarmAt !== undefined ? patch.manualWarmAt : (current.manual_warm_at ?? null);
  const bursts = patch.warmBursts !== undefined
    ? Math.max(0, Math.floor(Number(patch.warmBursts) || 0)) : Math.max(0, Math.floor(Number(current.warm_bursts) || 0));
  const ranking = patch.rankingAttemptAt !== undefined ? patch.rankingAttemptAt : (current.ranking_attempt_at ?? null);
  await db.prepare(`INSERT INTO orb2_field_control (id, deploy_warm_at, manual_warm_at, warm_bursts, ranking_attempt_at, updated_at)
      VALUES (1, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      deploy_warm_at = excluded.deploy_warm_at, manual_warm_at = excluded.manual_warm_at,
      warm_bursts = excluded.warm_bursts, ranking_attempt_at = excluded.ranking_attempt_at,
      updated_at = excluded.updated_at`)
    .bind(deploy, manual, bursts, ranking, now).run();
}

/** Persist one observation. An older write never overwrites a newer row. */
async function writeObservation(db, observation, now) {
  const payload = JSON.stringify(observation);
  await db.prepare(`INSERT INTO orb2_field_observations
      (interval, symbol, disc_id, provider, status, reason, beat_id, payload, observed_at, bar_time, confirmed, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(interval, symbol) DO UPDATE SET
      disc_id = excluded.disc_id, provider = excluded.provider, status = excluded.status,
      reason = excluded.reason, beat_id = excluded.beat_id, payload = excluded.payload,
      observed_at = excluded.observed_at, bar_time = excluded.bar_time,
      confirmed = excluded.confirmed, updated_at = excluded.updated_at
    WHERE excluded.observed_at >= orb2_field_observations.observed_at`)
    .bind(
      observation.interval, observation.symbol, observation.discId, observation.provider,
      observation.status, observation.reason, observation.beatId, payload,
      observation.observedAt, observation.barTime, observation.confirmed ? 1 : 0, now
    ).run();
  await refreshStoredComposition(db, observation.symbol, now);
}

/* Recalculate the daily row after either scale changes. The full 15-minute series
 * is intentionally not stored; this joins the two compact, validated summaries and
 * persists only the deterministic composition packet. */
async function refreshStoredComposition(db, symbol, now) {
  const rows = await db.prepare(`SELECT interval, payload FROM orb2_field_observations
    WHERE symbol = ? AND interval IN ('1d', '15m')`).bind(symbol).all();
  const parsed = (Array.isArray(rows && rows.results) ? rows.results : []).map(row => ({
    interval: String(row.interval), observation: parsePacketRow(row, now)
  })).filter(row => row.observation);
  const daily = parsed.find(row => row.interval === "1d")?.observation || null;
  const intraday = parsed.find(row => row.interval === ORB2_INTRADAY_INTERVAL)?.observation || null;
  if (!daily) return;
  const composition = composePair(daily, intraday, now);
  for (const row of parsed) {
    const payload = { ...row.observation, composition };
    await db.prepare("UPDATE orb2_field_observations SET payload = ?, updated_at = ? WHERE interval = ? AND symbol = ?")
      .bind(JSON.stringify(payload), now, row.interval, symbol).run();
  }
}

async function acquireTickLease(db, now, owner) {
  await ensureRunRow(db, now);
  const result = await db.prepare(`UPDATE orb2_field_runs SET lock_owner = ?, lock_at = ?, updated_at = ?
    WHERE utc_day = ? AND (lock_at IS NULL OR lock_at < ?)`)
    .bind(owner, now, now, utcDay(now), now - ORB2_FIELD_TICK_LEASE_MS).run();
  return changedRows(result) > 0;
}

async function releaseTickLease(db, now, owner) {
  await db.prepare("UPDATE orb2_field_runs SET lock_owner = NULL, lock_at = NULL, updated_at = ? WHERE utc_day = ? AND lock_owner = ?")
    .bind(now, utcDay(now), owner).run();
}

async function recordTickResult(db, { now, massiveCalls = 0, tickerbotCalls = 0, krakenCalls = 0, observed = 0, error = "" }) {
  try {
    await db.prepare(`UPDATE orb2_field_runs SET
        massive_calls = massive_calls + ?, tickerbot_calls = tickerbot_calls + ?, kraken_calls = kraken_calls + ?,
        last_tick_at = ?, last_observation_at = COALESCE(CASE WHEN ? > 0 THEN ? ELSE NULL END, last_observation_at),
        last_error = ?, updated_at = ?
      WHERE utc_day = ?`)
      .bind(massiveCalls, tickerbotCalls, krakenCalls, now, observed, now, text(error, 200), now, utcDay(now)).run();
  } catch (err) {
    if (String(err && err.message).includes("kraken_calls")) {
      await db.prepare(`UPDATE orb2_field_runs SET
          massive_calls = massive_calls + ?, tickerbot_calls = tickerbot_calls + ?,
          last_tick_at = ?, last_observation_at = COALESCE(CASE WHEN ? > 0 THEN ? ELSE NULL END, last_observation_at),
          last_error = ?, updated_at = ?
        WHERE utc_day = ?`)
        .bind(massiveCalls, tickerbotCalls, now, observed, now, text(error, 200), now, utcDay(now)).run();
      return;
    }
    throw err;
  }
}

/** Evidence that one full stock sweep has finished since the last one. */
async function completeSweepIfDue(db, now, stocks) {
  if (!stocks.length) return false;
  const placeholders = stocks.map(() => "?").join(",");
  const row = await db.prepare(`SELECT MIN(observed_at) AS oldest, COUNT(*) AS count FROM orb2_field_observations
    WHERE interval = '1d' AND symbol IN (${placeholders})`).bind(...stocks.map(stock => stock.symbol)).first();
  const oldest = Number(row && row.oldest);
  const count = Number(row && row.count) || 0;
  if (!Number.isFinite(oldest) || count < stocks.length) return false;
  const run = await readRun(db, now);
  const last = Number(run && run.last_sweep_completed_at) || 0;
  if (oldest <= last) return false;
  await db.prepare("UPDATE orb2_field_runs SET sweeps_completed = sweeps_completed + 1, last_sweep_completed_at = ?, updated_at = ? WHERE utc_day = ?")
    .bind(now, now, utcDay(now)).run();
  return true;
}

/* ── queue ────────────────────────────────────────────────────────────── */

async function enqueueJobs(db, jobs, now) {
  if (!jobs.length) return 0;
  let enqueued = 0;
  const chunkSize = 26;
  const insert = "INSERT INTO orb2_field_queue (created_at, interval, symbol, reason, lane) VALUES (?, ?, ?, ?, ?) ON CONFLICT(interval, symbol, reason) DO NOTHING";
  for (let index = 0; index < jobs.length; index += chunkSize) {
    /* One prepared statement per job: D1 returns a new bound statement per bind,
       and a shared object would silently re-send the last set of values. */
    const batch = jobs.slice(index, index + chunkSize).map(job =>
      db.prepare(insert).bind(now, job.interval, job.symbol, job.reason, job.lane));
    if (typeof db.batch === "function") {
      const results = await db.batch(batch);
      for (const result of results) enqueued += changedRows(result);
    } else {
      for (const item of batch) enqueued += changedRows(await item.run());
    }
  }
  return enqueued;
}

/**
 * Claim queued work for one tick. 'hot' (user priority) is always claimed before
 * 'sweep' (the deploy warm burst). The UPDATE's WHERE clause is the race guard:
 * two isolates that select the same row cannot both claim it.
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
    tickerbot: typeof env.TICKERBOT_API_KEY === "string" ? env.TICKERBOT_API_KEY.trim() : ""
  };
}

async function beatMassive({ env, instrument, now, fetcher, keys, dependencies }) {
  if (!keys.massive) return { ok: false, attempted: false, code: "massive-not-configured", message: "Add the MASSIVE_API_KEY Worker secret to enable the server field." };
  const reservation = await reserveMassiveProviderCall({ request: CRON_REQUEST, env, now });
  if (!reservation.ok) return { ok: false, attempted: false, code: reservation.code, message: reservation.message };
  const result = await fetchMassiveDailyMarketContext({
    instrument: { ...instrument, interval: "1d" }, symbol: instrument.symbol,
    apiKey: keys.massive, fetcher, now, timeoutMs: UPSTREAM_TIMEOUT_MS, dependencies
  });
  if (!result.ok) return { ok: false, attempted: true, code: result.code, message: result.message, retryAfter: result.retryAfter };
  return { ok: true, attempted: true, packet: result.packet, calls: 1 };
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
  const ledger = await readMassiveDailyCallLedger(db, now, MASSIVE_PROVIDER_DAILY_LIMIT);
  if (ledger.ok && ledger.ledger.remaining <= 0) {
    summary.notes.push("Disc4 contracts are held: Massive daily call budget is exhausted.");
    return state;
  }
  if (state.globalLastAttemptAt && now - state.globalLastAttemptAt < MASSIVE_FUTURES_CONTRACT_GLOBAL_COOLDOWN_MS) return state;
  const catalog = globalThis.CharactersDiscCatalog;
  const commodities = catalog && Array.isArray(catalog.commodities) ? catalog.commodities : [];

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
      const reservation = await reserveMassiveProviderCall({ request: CRON_REQUEST, env, now });
      if (reservation.ok) reserved = true;
      return reservation;
    }
  });
  if (reserved) summary.massiveCalls += 1;
  if (result.ok) {
    state.contracts[productCode] = result.contract;
  } else {
    if (![
      "massive-futures-contract-cooldown", "massive-futures-contract-circuit-open",
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

/* ── the tick ─────────────────────────────────────────────────────────── */

/**
 * One scheduled beat. Called by the Worker's `scheduled()` handler every minute.
 * Returns a small summary object; it never throws, so a provider outage cannot
 * take the scheduler down with it.
 */
export async function runOrb2FieldTick(env = {}, context = null, dependencies = {}) {
  const now = nowOf(dependencies);
  const db = env.COMMUNITY_DB;
  const summary = {
    ok: false, schema: ORB2_FIELD_STATUS_SCHEMA, now, massiveCalls: 0, tickerbotCalls: 0, krakenCalls: 0,
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
    if (!leased) { summary.notes.push("Another tick holds the field lease; this invocation skipped."); return summary; }
    const keys = providerKeys(env);

    const control = await readControl(db);
    const run = await readRun(db, now);

    /* Disc3 is Kraken Spot only. The rolling-24-hour venue roster is read from
       the shared D1 cache and refreshed only after expiry; the Ticker call and
       each exact-pair OHLC call share Kraken's one-request-per-second gate and
       conservative UTC-day application ceiling. An unavailable ranking holds
       Disc3 rather than borrowing a Massive roster. */
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

    /* 1 · First-deck calibration. When the field is cold (or empty) and the last
       warm burst is outside the cooldown, queue the full Tickerbot sweep of the
       52-card field on 15m, 1h, and 1d: ORB2_FIELD_TICKERBOT_BURST_CALLS upstream
       calls, visible as queue progress, so the deck is calibrated across scales. */
    const newestRow = await db.prepare("SELECT MAX(observed_at) AS newest FROM orb2_field_observations").first();
    const newest = Number(newestRow && newestRow.newest) || 0;
    const lastWarm = Number(control && (control.deploy_warm_at || control.manual_warm_at)) || 0;
    /* A six-hour-old 15m packet is stale, not a reason to repeat a 156-call
       calibration burst. Automatic warm is one-time for an empty field; later
       refreshes are expiration-driven or explicitly requested. */
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

    /* 2 · Queued work (user priority first, then the warm burst). If Tickerbot is
       not configured the queue is left exactly as it is: claiming it would burn
       each job's attempts against a provider that cannot answer, and the burst
       must survive until the secret exists. */
    if (!keys.tickerbot) {
      const waiting = await queueDepth(db, now);
      if (waiting.pending > 0) {
        summary.notes.push(`${waiting.pending} queued Tickerbot stock job${waiting.pending === 1 ? "" : "s"} waiting: add the TICKERBOT_API_KEY Worker secret to drain them. Kraken and Massive non-stock lanes are unaffected.`);
      }
    }
    const queued = keys.tickerbot ? await claimQueue(db, now, ORB2_FIELD_TICKERBOT_BURST_PER_TICK) : [];
    summary.queueClaimed = queued.length;
    if (queued.length) {
      const outcomes = await mapWithConcurrency(queued, FETCH_CONCURRENCY, async job => {
        const instrument = instrumentsBySymbol.get(job.symbol);
        if (!instrument) return { job, ok: false, code: "not-on-field-roster", message: `${job.symbol} is not on the reviewed field roster.` };
        /* Queued work is the Tickerbot lane: the deploy warm burst and the
           user-requested priority refresh both ask the on-demand provider for the
           reviewed stock deck, so a cold field is covered in minutes instead of
           waiting for the Massive rotation to reach every berth. */
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
            await resolveQueueRow(db, job.id, { keep: false });
            continue;
          }
        }
        summary.held += 1;
        const retryable = Number(job.attempts) < ORB2_FIELD_MAX_QUEUE_ATTEMPTS;
        summary.errors.push(`${job.interval} ${job.symbol}: ${text(outcome.message, 140) || outcome.code || "the provider did not answer"}`);
        await resolveQueueRow(db, job.id, { keep: retryable });
      }
    }

    /* 3 · Tickerbot exclusively owns Stocks. Refresh one expired daily stock
       packet per cron tick after queued 15m/1h work; the 24-hour freshness gate
       means a complete 52-symbol rotation costs about 52 calls per day, rather
       than repeatedly sweeping the deck. The shared monthly ledger is the cap. */
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

    /* 4 · Kraken owns Disc3. One expired pair is refreshed per tick; the
       rolling-24-hour roster refresh and exact-pair daily OHLC are separately
       paced calls, so a roster fetch can postpone pair bars until the next tick. */
    if (!cryptoRanking || !roster.crypto.length) {
      summary.notes.push("Disc3 is held: the Kraken Spot rolling-24-hour roster is not available; no other venue is used.");
    } else {
      const cryptoRotation = await dueRotation(db, [
        ...roster.crypto.slice(0, CHARACTERS_CRYPTO_RANKING_SIZE),
        ...roster.cryptoPairs
      ], 1, now, "kraken");
      for (const entry of cryptoRotation) {
        const instrument = entry.instrument;
        const outcome = await beatKraken({ db, instrument, now, fetcher, summary });
        if (outcome.ok) {
          const observation = observationFromPacket({
            packet: outcome.packet, symbol: instrument.symbol, displaySymbol: instrumentDisplay(instrument),
            name: instrumentName(instrument), sector: instrumentSector(instrument), discId: "crypto",
            provider: "kraken", providerId: instrument.providerId, krakenPair: instrument.krakenPair,
            rankingProvider: instrument.rankingProvider, baseAsset: instrument.baseAsset, quoteAsset: instrument.quoteAsset,
            interval: "1d", now, reason: "server-sweep"
          });
          if (observation) {
            await writeObservation(db, observation, now);
            summary.observed += 1;
            continue;
          }
        }
        summary.held += 1;
        summary.errors.push(`${instrument.krakenPair || instrument.symbol}: ${text(outcome.message, 140) || outcome.code || "Kraken did not answer"}`);
        if (outcome.attempted) {
          const heldObs = heldFieldObservation({
            symbol: instrument.symbol, displaySymbol: instrumentDisplay(instrument),
            name: instrumentName(instrument), sector: instrumentSector(instrument), discId: "crypto",
            provider: "kraken", providerId: instrument.providerId, krakenPair: instrument.krakenPair,
            rankingProvider: instrument.rankingProvider, baseAsset: instrument.baseAsset, quoteAsset: instrument.quoteAsset,
            interval: "1d", now, reason: "server-sweep",
            code: outcome.code || "kraken-refusal", message: text(outcome.message, 140) || "Kraken did not answer"
          });
          if (heldObs) await writeObservation(db, heldObs, now);
        }
      }
    }

    /* 5 · Massive is limited to reviewed FX, active commodity futures, and
       indices. Five requests per minute and the durable UTC-day guard apply. */
    const massiveInstruments = roster.instruments.filter(instrument => ["fx", "commodities", "indices"].includes(instrument.discId));
    const massiveLedger = await readMassiveDailyCallLedger(db, now, MASSIVE_PROVIDER_DAILY_LIMIT);
    const dailyRemaining = massiveLedger.ok ? massiveLedger.ledger.remaining : 0;
    const minuteRemaining = availableMassiveBudget(CRON_REQUEST, env, now).remaining;
    const utcDate = new Date(now);
    const minutesRemaining = Math.max(1, 1440 - (utcDate.getUTCHours() * 60 + utcDate.getUTCMinutes()));
    const pacedLimit = dailyRemaining <= 0
      ? 0
      : dailyRemaining <= 10
        ? 1
        : dailyRemaining <= 30 && minutesRemaining > 120
          ? Math.min(2, ORB2_MASSIVE_PER_MINUTE)
          : ORB2_MASSIVE_PER_MINUTE;
    const maxMassiveThisTick = Math.max(0, pacedLimit - summary.massiveCalls);
    const slots = Math.max(0, Math.min(
      maxMassiveThisTick,
      minuteRemaining,
      dailyRemaining - summary.massiveCalls
    ));
    if (!keys.massive) {
      summary.notes.push("Massive FX/futures/index lanes are held: add MASSIVE_API_KEY. Stocks remain Tickerbot-only; Kraken remains the crypto venue.");
    } else if (!massiveLedger.ok) {
      summary.errors.push(massiveLedger.message);
    } else if (slots > 0) {
      /* The rotation reserves one expired berth per Massive-reviewed Disc
         before filling remaining slots oldest-first. Stocks and crypto never
         enter this provider lane. */
      const rotation = await dueRotation(db, massiveInstruments, slots, now, "massive");
      const outcomes = await mapWithConcurrency(rotation, 2, async entry => ({
        entry, ...(await beatMassive({ env, db, instrument: entry.instrument, now, fetcher, keys, dependencies }))
      }));
      for (const outcome of outcomes) {
        const instrument = outcome.entry.instrument;
        if (outcome.attempted) summary.massiveCalls += 1;
        if (outcome.ok) {
          const observation = observationFromPacket({
            packet: outcome.packet, symbol: instrument.symbol, displaySymbol: instrumentDisplay(instrument),
            name: instrumentName(instrument), sector: instrumentSector(instrument), discId: instrument.discId,
            provider: "massive", interval: "1d", now, reason: "server-sweep"
          });
          if (observation) {
            await writeObservation(db, observation, now);
            summary.observed += 1;
            continue;
          }
        }
        summary.held += 1;
        summary.errors.push(`${instrument.symbol}: ${text(outcome.message, 140) || outcome.code || "Massive did not answer"}`);
        if (outcome.attempted) {
          const heldObs = heldFieldObservation({
            symbol: instrument.symbol,
            displaySymbol: instrumentDisplay(instrument),
            name: instrumentName(instrument),
            sector: instrumentSector(instrument),
            discId: instrument.discId,
            provider: "massive",
            interval: "1d",
            now,
            reason: "server-sweep",
            code: outcome.code || "massive-refusal",
            message: text(outcome.message, 140) || "Massive did not answer"
          });
          if (heldObs) await writeObservation(db, heldObs, now);
        }
      }
    } else if (massiveLedger.ok && massiveLedger.ledger.exhausted) {
      summary.notes.push(`The Massive UTC-day allowance is spent (${massiveLedger.ledger.calls}/${massiveLedger.ledger.dailyLimit}); Tickerbot stock and Kraken crypto lanes are separately accounted.`);
    }

    summary.sweepsCompleted = (await completeSweepIfDue(db, now, roster.stocks)) ? 1 : 0;
    await recordTickResult(db, {
      now, massiveCalls: summary.massiveCalls, tickerbotCalls: summary.tickerbotCalls, krakenCalls: summary.krakenCalls,
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

const instrumentDisplay = instrument => instrument ? (instrument.displaySymbol || instrument.symbol) : "";
const instrumentName = instrument => instrument ? (instrument.name || "") : "";
const instrumentSector = instrument => instrument ? (instrument.sector || "") : "";

/** Least-recently-observed rotation over the interval '1d' field. */
/**
 * Fair rotation order across the five reviewed Discs. Every Disc that has
 * expired work keeps one reserved slot in the tick, so a cold field warms all
 * five Discs at once and a Disc with few instruments is never starved by a
 * Disc with many; the remaining slots go to the globally oldest berths, so a
 * large Disc still cycles evenly inside the Massive allowance. Pure and
 * deterministic: the same entries and limit always yield the same order.
 */
export function orb2FieldRotationSelection(entries, limit) {
  const list = Array.isArray(entries) ? entries.filter(entry => entry && entry.instrument) : [];
  const slots = Math.max(0, Math.floor(Number(limit) || 0));
  if (!list.length || slots <= 0) return [];
  const byDisc = new Map(ORB2_FIELD_DISCS.map(discId => [discId, []]));
  const others = [];
  for (const entry of list) {
    const bucket = byDisc.get(entry.instrument.discId);
    if (bucket) bucket.push(entry);
    else others.push(entry);
  }
  const oldestFirst = (left, right) =>
    (Number(left.observedAt) || 0) - (Number(right.observedAt) || 0) ||
    String(left.instrument.symbol).localeCompare(String(right.instrument.symbol));
  for (const bucket of byDisc.values()) bucket.sort(oldestFirst);
  others.sort(oldestFirst);
  const picked = [];
  const cursors = new Map();
  /* One reserved berth per Disc that has expired work. */
  for (const discId of ORB2_FIELD_DISCS) {
    if (picked.length >= slots) break;
    const bucket = byDisc.get(discId);
    if (!bucket || !bucket.length) continue;
    picked.push(bucket[0]);
    cursors.set(discId, 1);
  }
  /* Then the globally oldest berths, so coverage stays even inside each Disc. */
  const remaining = [];
  for (const discId of ORB2_FIELD_DISCS) {
    const bucket = byDisc.get(discId);
    const cursor = cursors.get(discId) || 0;
    for (let index = cursor; index < bucket.length; index += 1) remaining.push(bucket[index]);
  }
  remaining.push(...others);
  remaining.sort(oldestFirst);
  for (const entry of remaining) {
    if (picked.length >= slots) break;
    picked.push(entry);
  }
  return picked;
}

async function dueRotation(db, instruments, limit, now = Date.now(), provider = null) {
  if (!instruments.length || limit <= 0) return [];
  const instrumentsBySymbol = new Map(instruments.map(instrument => [instrument.symbol, instrument]));
  const batches = Array.from({ length: Math.ceil(instruments.length / ORB2_FIELD_SQL_SYMBOL_BATCH_SIZE) }, (_, index) =>
    instruments.slice(index * ORB2_FIELD_SQL_SYMBOL_BATCH_SIZE, (index + 1) * ORB2_FIELD_SQL_SYMBOL_BATCH_SIZE));
  const rows = [];
  for (const batch of batches) {
    const placeholders = batch.map(() => "?").join(",");
    const result = await db.prepare(`SELECT payload, symbol, disc_id, provider, status, observed_at FROM orb2_field_observations
      WHERE interval = '1d' AND symbol IN (${placeholders})`).bind(...batch.map(instrument => instrument.symbol)).all();
    rows.push(...(Array.isArray(result && result.results) ? result.results : []));
  }
  const observed = new Map();
  for (const row of rows) {
    const instrument = instrumentsBySymbol.get(String(row.symbol));
    if (!instrument || String(row.disc_id) !== instrument.discId || (provider && String(row.provider) !== provider)) continue;
    const observation = parsePacketRow(row, now);
    if (!observation) continue;
    observed.set(String(row.symbol), {
      ...observation,
      provider: String(row.provider),
      observedAt: Number(row.observed_at) || observation.observedAt
    });
  }
  const expired = [...instruments]
    .map(instrument => ({ instrument, observedAt: Number(observed.get(instrument.symbol)?.observedAt) || 0 }))
    .filter(entry => orb2FieldNeedsRefresh(observed.get(entry.instrument.symbol), now, provider || entry.instrument.provider));
  return orb2FieldRotationSelection(expired, limit);
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

/* ── the snapshot clients render ──────────────────────────────────────── */

function parsePacketRow(row, now) {
  try {
    const parsed = sanitizeOrb2FieldObservation(JSON.parse(row.payload), now);
    return parsed.ok ? parsed.observation : null;
  } catch { return null; }
}

/** D1 queries are limited to 100 bound variables. Split large symbol filters
 * into conservative batches, then restore the global newest-first limit after
 * merging. This is still a read of the unchanged stored field. */
async function readOrb2FieldRows(db, { interval, disc = null, symbols = [], limit = null }) {
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
    let query = `SELECT payload, observed_at, symbol, disc_id, provider, confirmed FROM orb2_field_observations WHERE ${clauses.join(" AND ")} ORDER BY observed_at DESC`;
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
        fieldRows = await readOrb2FieldRows(db, { interval });
        storedRowsRead = true;
      } catch { /* focused observations remain a bounded status fallback */ }
    }
    const parsedFieldRows = new Map();
    const parseFieldRow = row => {
      const key = `${String(row.disc_id || "")}:${String(row.symbol || "")}`;
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
        const parsed = parseFieldRow(row);
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
        perMinute: ORB2_MASSIVE_PER_MINUTE,
        dailyLimit: MASSIVE_PROVIDER_DAILY_LIMIT,
        remainingToday: massiveLedger.ok ? massiveLedger.ledger.remaining : null,
        exhausted: massiveLedger.ok ? massiveLedger.ledger.exhausted : null,
        ledger: massiveLedger.ok ? "ready" : "unavailable",
        note: massiveLedger.ok ? massiveLedger.ledger.note : massiveLedger.message
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
      dxy,
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
 * The fixed Dollar Strength (DS) benchmark is derived from the stored FX field, not from whatever
 * Disc the client is currently looking at, so switching Discs never blanks the
 * Center Origin reference.
 */
async function evaluateDollarStrength(db, now, existingObservations = null) {
  const ds = globalThis.GoodIntelligenceDollarStrength;
  if (!ds || typeof ds.evaluate !== "function") return null;
  let stored = existingObservations;
  if (!Array.isArray(stored)) {
    const symbols = ds.COMPONENTS.map(component => component.symbol);
    const rows = await db.prepare(`SELECT payload FROM orb2_field_observations
      WHERE interval = '1d' AND symbol IN (${symbols.map(() => "?").join(",")})`)
      .bind(...symbols).all();
    stored = (Array.isArray(rows && rows.results) ? rows.results : [])
      .map(row => parsePacketRow(row, now)).filter(Boolean);
  }
  const componentSymbols = new Set(ds.COMPONENTS.map(component => component.symbol));
  const inputs = stored
    .filter(observation => observation.discId === "fx" && componentSymbols.has(observation.symbol))
    .map(observation => ({
      symbol: observation.symbol, discId: "fx", providerMode: "massive", interval: "1d",
      status: observation.status, market: observation.market
    }));
  if (!inputs.length) return null;
  const result = ds.evaluate(inputs, now);
  return {
    ok: result.ok === true, status: String(result.status || "held"),
    missing: Array.isArray(result.missing) ? result.missing : [],
    refreshSymbol: result.refreshSymbol || null,
    value: Number.isFinite(Number(result.value)) ? Number(result.value) : null,\n    baseline: Number.isFinite(Number(result.baseline)) ? Number(result.baseline) : 100,\n    percentVs100: Number.isFinite(Number(result.percentVs100)) ? Number(result.percentVs100) : null,
    asOf: Number.isFinite(Number(result.asOf)) ? Number(result.asOf) : null,
    inputCount: Number(result.inputCount) || 0,
    reason: text(result.reason, 200),
    note: "Daily component-derived reference from the server field, not the licensed real-time ICE-distributed Dollar Strength (DS) value."
  };
}

/* ── HTTP surface ─────────────────────────────────────────────────────── */

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
      return { ok: false, status: 413, message: "An Orb 2 field request is limited to 8 KiB." };
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  try { return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) }; }
  catch { return { ok: false, status: 400, message: "The request body is not valid JSON." }; }
}

export async function handleOrb2Field(request, env = {}, dependencies = {}) {
  const url = new URL(request.url);
  if (url.pathname !== ORB2_FIELD_ROUTE) return failure("Orb 2 server field route not found.", 404);
  if (!new Set(["GET", "POST"]).has(request.method)) {
    return failure("The Orb 2 server field supports GET and same-origin POST only.", 405, { Allow: "GET, POST" });
  }
  const now = nowOf(dependencies);
  if (request.method === "GET") {
    const requestedInterval = url.searchParams.get("interval");
    if (requestedInterval !== null && !ORB2_FIELD_INTERVALS.includes(requestedInterval.trim())) {
      return failure("Choose one of the stored Orb 2 intervals: 15m, 1h, or 1d.", 400);
    }
    const snapshot = await readOrb2FieldSnapshot(env, {
      now,
      interval: (requestedInterval || ORB2_FIELD_DEFAULT_INTERVAL).trim(),
      disc: (url.searchParams.get("disc") || "").trim().toLowerCase() || null,
      symbols: (url.searchParams.get("symbols") || "").split(",").map(symbol => symbol.trim()).filter(Boolean),
      types: (url.searchParams.get("types") || "").split(",").map(type => type.trim().toLowerCase()).filter(Boolean)
    });
    if (!snapshot.ok) return failure(snapshot.message, 503);
    return json({ success: true, environment: "orb2-server-field", data: snapshot });
  }

  if (request.headers.get("Origin") !== url.origin) return failure("Same-origin request required.", 403);
  const db = env.COMMUNITY_DB;
  if (!db || typeof db.prepare !== "function") {
    return failure("The Orb 2 server field needs the COMMUNITY_DB binding and community migrations through 0012. No fallback source is used.", 503);
  }
  const body = await readBody(request);
  if (!body.ok) return failure(body.message, body.status);
  const value = body.value;
  if (!isRecord(value) || value.schema !== ORB2_FIELD_REQUEST_SCHEMA) {
    return failure(`Send one ${ORB2_FIELD_REQUEST_SCHEMA} record.`, 400);
  }
  const action = text(value.action, 24).toLowerCase();
  const requestedInterval = text(value.interval, 8);
  const interval = requestedInterval || ORB2_FIELD_DEFAULT_INTERVAL;
  if (!ORB2_FIELD_INTERVALS.includes(interval)) {
    return failure("Choose one of the stored Orb 2 intervals: 15m, 1h, or 1d.", 400);
  }

  if (action === "tick") {
    /* Manual is a choice, not a repair. A same-origin client may ask the server to
       run one scheduled tick now instead of waiting for the next cron minute; the
       tick still claims the same provider allowances, and the in-isolate cooldown
       keeps a page from turning this into a polling loop. */
    if (now - lastManualTickAt < ORB2_FIELD_MANUAL_TICK_COOLDOWN_MS) {
      return failure(`A manual tick ran ${Math.max(0, Math.round((now - lastManualTickAt) / 1000))}s ago. The continuous schedule is unchanged; nothing was sent.`, 429);
    }
    lastManualTickAt = now;
    const summary = await runOrb2FieldTick(env, null, { now: () => now, fetch: dependencies.fetch });
    const queue = await queueDepth(db, now);
    return json({
      success: summary.ok,
      environment: "orb2-server-field",
      data: {
        schema: ORB2_FIELD_REQUEST_SCHEMA, action: "tick", interval, queue,
        summary: {
          massiveCalls: summary.massiveCalls, tickerbotCalls: summary.tickerbotCalls, krakenCalls: summary.krakenCalls,
          observed: summary.observed, held: summary.held, queueClaimed: summary.queueClaimed,
          queueCompleted: summary.queueCompleted, warmEnqueued: summary.warmEnqueued,
          sweepsCompleted: summary.sweepsCompleted
        },
        notes: summary.notes, marketRequestSent: summary.massiveCalls + summary.tickerbotCalls + summary.krakenCalls > 0
      }
    }, summary.ok ? 200 : 503);
  }

  if (action === "priority") {
    const roster = orb2FieldRoster({ now });
    const bySymbol = new Map(roster.instruments.map(instrument => [instrument.symbol, instrument]));
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
