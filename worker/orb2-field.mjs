/*
 * HarshalOS — Orb 2 server-side beat field.
 *
 * The beat is a server responsibility. A Cloudflare Cron Trigger calls
 * `runOrb2FieldTick()` every minute.
 *
 * Each Cron invocation dispatches exactly one provider lane. The selected lane
 * may spend its explicitly reviewed serial batch: Tickerbot up to 12 units,
 * Massive futures/indices up to five, Options up to four, and Kraken/FX one
 * unit (FX retains its bounded Massive-to-Alpha fallback). Calls within that
 * lane never overlap. A durable weighted dispatch cursor alternates lanes in
 * proportion to the number of turns each needs for one field rotation, while
 * every lane keeps its own durable stable-key instrument cursor.
 *
 * This design is intended to reduce cross-lane CPU and D1 peak pressure without
 * throwing away the provider's legitimate per-tick batch capacity. Massive keeps
 * its five-per-minute-per-asset-class gate, Kraken its one-per-second gate and
 * UTC-day ceiling, and Tickerbot its UTC-month ledger. Each unit evaluates the
 * same `js/good-intelligence-market-context.js` and `js/characters-beat.js`
 * logic and stores a compact observation in D1.
 *
 * Browsers never call a provider and never own the schedule:
 *
 *   GET  {ORB2_FIELD_ROUTE}   → the newest stored observations + server status
 *   POST {ORB2_FIELD_ROUTE}   → enqueue a bounded priority refresh ('hot' lane) or
 *                               the deploy warm burst ('sweep' lane, Tickerbot)
 *
 * Consequences that are deliberate:
 *   · A hidden tab, a closed laptop, or a sleeping owner changes nothing. The
 *     24/7/365 loop lives in the Worker and is bounded by structural work,
 *     D1, and provider budgets, not by a page-visibility event.
 *   · There is no client-side pacing timer or provider warm-up hold. Stable-key
 *     rotation and automatic warm progress are rows in D1, not isolate state.
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
import { fetchTwelveDataDailyMarketContext } from "./characters-twelvedata.mjs";
import { guardTwelveDataCallBeforeFetch, recordTwelveDataCallSuccess } from "./twelvedata-call-guard.mjs";
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
import { appendTwelveDataDailyCallLedger, loadTwelveDataDailyCallLedger } from "./twelvedata-daily-call-ledger.mjs";
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

const REVIEWED_SCHEDULER_CATALOG = globalThis.CharactersDiscCatalog || {};
const SCHEDULER_FX_ROSTER_SIZE = Array.isArray(REVIEWED_SCHEDULER_CATALOG.fxCurrencies) ? REVIEWED_SCHEDULER_CATALOG.fxCurrencies.length : 23;
const SCHEDULER_FUTURES_ROSTER_SIZE = Array.isArray(REVIEWED_SCHEDULER_CATALOG.futures || REVIEWED_SCHEDULER_CATALOG.commodities)
  ? (REVIEWED_SCHEDULER_CATALOG.futures || REVIEWED_SCHEDULER_CATALOG.commodities).length : 11;
const SCHEDULER_INDEX_ROSTER_SIZE = Array.isArray(REVIEWED_SCHEDULER_CATALOG.indices) ? REVIEWED_SCHEDULER_CATALOG.indices.length : 52;

export const ORB2_FIELD_ROUTE = "/api/good-intelligence/v1/orb2/field";
export const ORB2_FIELD_SCHEMA = "gi-orb2-field-v1";
export const ORB2_FIELD_STATUS_SCHEMA = "gi-orb2-field-status-v1";
export const ORB2_FIELD_OBSERVATION_SCHEMA = "gi-orb2-field-observation-v1";
export const ORB2_FIELD_REQUEST_SCHEMA = "gi-orb2-field-request-v1";
export const ORB2_FIELD_CRON = "*/1 * * * *";
export const ORB2_FIELD_INTERVALS = Object.freeze(["15m", "1h", "1d"]);
/* The one-button first-deck calibration intentionally covers every supported
 * scale: 52 symbols × (15m + 1h + 1d) = 156 work units. User-requested warm work
 * remains queued; the automatic cold warm is cursor-driven and materializes only
 * the single unit selected for the current scheduled invocation. */
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

/* ── provider lanes ───────────────────────────────────────────────────────
 *
 * A lane is one independently rate-limited provider envelope. Only one lane is
 * dispatched per Cron invocation. Its bounded units are processed SEQUENTIALLY;
 * per-lane limits mirror the provider's actual request envelope, not an assumed
 * universal one-request rule.
 *
 *   tickerbot-stocks   Tickerbot            UTC-month ledger
 *   kraken-crypto      Kraken public Spot    one request/second + UTC-day ceiling
 *   massive-fx         Massive 'currencies'  five requests/minute
 *   massive-futures    Massive 'futures'     five requests/minute
 *   massive-indices    Massive 'indices'     five requests/minute
 *   massive-options    Massive 'options'     five requests/minute
 *
 * Massive's five-per-minute allowance is enforced per asset class by a
 * synchronous sliding window. Tickerbot can run up to 12 serialized beats, the
 * futures and indices lanes up to five, and Options up to four (leaving one slot
 * of headroom). Kraken remains one request per Cron and FX one work unit with
 * its documented two-request fallback. These are serial batch bounds, not
 * promises that the CPU limit can accommodate every batch; CI and production
 * CPU telemetry must validate that separately.
 */
export const ORB2_FIELD_PROVIDER_LANES = Object.freeze([
  Object.freeze({
    id: "tickerbot-stocks", provider: "tickerbot", assetClass: null, maxProviderCallsPerUnit: 1,
    maxWorkUnitsPerTick: 12,
    /* Which reviewed worklist keys this lane's partition is drawn from. Scoping
       the keys per lane keeps `scheduledWorkItems` the single source of truth
       for the reviewed worklist while each lane materializes only its own
       partition. */
    worklistKeys: Object.freeze({ tickerbot: true, massive: false }), worklistOptions: false
  }),
  Object.freeze({
    id: "kraken-crypto", provider: "kraken", assetClass: null, maxProviderCallsPerUnit: 1,
    worklistKeys: Object.freeze({ tickerbot: false, massive: false }), worklistOptions: false
  }),
  /* FX dual/fallback mode is the one reviewed unit that can make two calls:
     Massive first, Alpha Vantage only if Massive did not answer. */
  Object.freeze({
    id: "massive-fx", provider: "massive", assetClass: "currencies", maxProviderCallsPerUnit: 2,
    worklistKeys: Object.freeze({ tickerbot: false, massive: true }), worklistOptions: false
  }),
  Object.freeze({
    id: "massive-futures", provider: "massive", assetClass: "futures", maxProviderCallsPerUnit: 1,
    maxWorkUnitsPerTick: 5,
    worklistKeys: Object.freeze({ tickerbot: false, massive: true }), worklistOptions: false
  }),
  Object.freeze({
    id: "massive-indices", provider: "massive", assetClass: "indices", maxProviderCallsPerUnit: 1,
    maxWorkUnitsPerTick: 5,
    worklistKeys: Object.freeze({ tickerbot: false, massive: true }), worklistOptions: false
  }),
  Object.freeze({
    id: "massive-options", provider: "massive", assetClass: "options", maxProviderCallsPerUnit: 1,
    /* The Options lane is the longest by far (52 underlyings x 5 slots = 260
       items), so it was the binding constraint on a full rotation. Each of its
       units spends exactly one request in Massive's 'options' asset-class
       window, which allows five per minute, so the lane may safely advance four
       slots per scheduled minute and still leave one request of headroom. The
       four units run sequentially inside the lane, which is what keeps the
       sliding-window gate meaningful. */
    maxWorkUnitsPerTick: 4,
    worklistKeys: Object.freeze({ tickerbot: false, massive: true }), worklistOptions: true
  })
]);
/** Provider-reviewed serial batch bound for this lane. */
const laneWorkUnits = lane => Number.isSafeInteger(lane && lane.maxWorkUnitsPerTick) &&
  lane.maxWorkUnitsPerTick > 0 ? lane.maxWorkUnitsPerTick : 1;
/** A lane's whole-tick provider ceiling: its units times its per-unit ceiling.
   Named apart from the per-lane counter inside `runProviderLane`, which would
   otherwise shadow it. */
const laneCallCeilingFor = lane => laneWorkUnits(lane) * lane.maxProviderCallsPerUnit;
export const ORB2_FIELD_LANE_COUNT = ORB2_FIELD_PROVIDER_LANES.length;
/** Maximum serial units any reviewed lane may spend in one invocation. */
export const ORB2_FIELD_SCHEDULER_WORK_UNITS_PER_LANE_PER_TICK = Math.max(
  ...ORB2_FIELD_PROVIDER_LANES.map(lane => laneWorkUnits(lane))
);
/** One lane per tick; that lane may spend only its documented serial batch. */
export const ORB2_FIELD_SCHEDULER_WORK_UNITS_PER_TICK = ORB2_FIELD_SCHEDULER_WORK_UNITS_PER_LANE_PER_TICK;
/** The maximum provider calls for one serial lane batch, including FX fallback. */
export const ORB2_FIELD_SCHEDULER_MAX_PROVIDER_CALLS_PER_TICK = Math.max(
  ...ORB2_FIELD_PROVIDER_LANES.map(lane => laneCallCeilingFor(lane))
);
export const ORB2_FIELD_TICKERBOT_BURST_PER_TICK = 1;
export const ORB2_FIELD_SCHEDULER_MAX_WORK_ITEMS_PER_CYCLE =
  TICKERBOT_WATCHLIST.length + SCHEDULER_FX_ROSTER_SIZE + CHARACTERS_CRYPTO_RANKING_SIZE +
  CHARACTERS_CRYPTO_CROSS_PAIR_SIZE + SCHEDULER_FUTURES_ROSTER_SIZE + SCHEDULER_INDEX_ROSTER_SIZE +
  TICKERBOT_WATCHLIST.length * (MASSIVE_OPTIONS_SELECTION_SIZE + 1);
/* Read/write quotas are hard structural ceilings for one selected lane batch.
   Shared overhead includes lease/control reads, queue claim, and the Options
   table probe. Per-unit work includes its stable cursor, targeted observation/
   cache reads, provider reservation, output write and any derived composition.
   Three writes remain reserved for tick-result finalization and lease cleanup. */
const ORB2_FIELD_SCHEDULER_LANE_D1_READS = 8;
const ORB2_FIELD_SCHEDULER_LANE_D1_WRITES = 8;
const ORB2_FIELD_SCHEDULER_SHARED_D1_READS = 16;
const ORB2_FIELD_SCHEDULER_SHARED_D1_WRITES = 8;
export const ORB2_FIELD_SCHEDULER_MAX_D1_READS = ORB2_FIELD_SCHEDULER_SHARED_D1_READS +
  ORB2_FIELD_SCHEDULER_LANE_D1_READS * ORB2_FIELD_SCHEDULER_WORK_UNITS_PER_TICK;
export const ORB2_FIELD_SCHEDULER_MAX_D1_WRITES = ORB2_FIELD_SCHEDULER_SHARED_D1_WRITES +
  ORB2_FIELD_SCHEDULER_LANE_D1_WRITES * ORB2_FIELD_SCHEDULER_WORK_UNITS_PER_TICK;
const ORB2_FIELD_SCHEDULER_RESERVED_D1_WRITES = 3;
const ORB2_FIELD_SCHEDULER_MAX_ROWS_PER_READ = 12;
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
  twelvedata: 6 * 60 * 60_000,
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
const PROVIDER_IDS = new Set(["massive", "twelvedata", "tickerbot", "kraken"]);
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
export function orb2FieldRoster({
  now = Date.now(), cryptoRanking = null, commodityContracts = null, includeDiscIds = null
} = {}) {
  const roster = globalThis.GoodIntelligenceMarketRoster;
  const catalog = globalThis.CharactersDiscCatalog;
  const ds = globalThis.GoodIntelligenceDollarStrength;
  const selectedDiscs = includeDiscIds == null ? null : new Set(includeDiscIds);
  const includes = discId => selectedDiscs === null || selectedDiscs.has(discId);
  const stocks = [];
  if (includes("stocks") && roster && Array.isArray(roster.assets) && ds && typeof ds.buildFiringOrder === "function") {
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
  const fx = includes("fx") ? statics(catalog && catalog.fxCurrencies, "fx", "fx") : [];
  const today = new Date(Number(now)).toISOString().slice(0, 10);
  const contracts = commodityContracts && typeof commodityContracts === "object" ? commodityContracts : {};
  const commodities = includes("commodities")
    ? statics(catalog && (catalog.futures || catalog.commodities), "commodities", "futures").flatMap(entry => {
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
        discId: "commodities", assetClass: "futures"
      })];
    })
    : [];
  const indices = includes("indices") ? statics(catalog && catalog.indices, "indices", "index") : [];
  const crypto = (includes("crypto") && cryptoRanking && Array.isArray(cryptoRanking.instruments) ? cryptoRanking.instruments : [])
    .filter(entry => entry && entry.rankingProvider === "Kraken" && /^[A-Z0-9]{2,12}$/.test(String(entry.symbol || "")) &&
      /^[A-Z0-9]{2,12}\/USD$/.test(String(entry.krakenPair || "")) && entry.providerId === entry.krakenPair &&
      (entry.baseAsset === undefined || entry.baseAsset === entry.symbol) &&
      (entry.quoteAsset === undefined || entry.quoteAsset === "USD"))
    .map(entry => Object.freeze({ ...entry, baseAsset: entry.baseAsset || entry.symbol, quoteAsset: "USD", pairType: "usd", discId: "crypto", assetClass: "crypto" }));
  const cryptoSymbols = new Set(crypto.map(entry => entry.symbol));
  const cryptoPairs = (includes("crypto") && cryptoRanking && Array.isArray(cryptoRanking.crossPairs) ? cryptoRanking.crossPairs : [])
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
        baseAsset !== quoteAsset && (cryptoSymbols.has(baseAsset) || cryptoSymbols.has(quoteAsset));
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
  if (!PROVIDER_IDS.has(provider)) return { ok: false, message: "Only the reviewed Massive/Twelve Data, Tickerbot, and Kraken providers may write the server field." };
  const interval = text(value.interval, 8);
  if (!TICKERBOT_INTERVALS.includes(interval)) return { ok: false, message: "The field stores 15m, 1h, and 1d observations only." };
  if ((provider === "massive" || provider === "twelvedata") && (interval !== "1d" || !["fx", "commodities", "indices"].includes(discId))) {
    return { ok: false, message: "Massive/Twelve Data writes daily FX, commodity-futures, and index observations only." };
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
  const fbbComparison = normalized && typeof marketContext.compareFbbVariants === "function"
    ? marketContext.compareFbbVariants({
        ...normalized,
        provenance: {
          provider,
          providerId: providerId || packet.providerId || null,
          instrument: symbol,
          assetClass: discId === "stocks" ? "equity" : discId,
          timeframe: interval,
          source: packet.source || normalized.source || null
        }
      })
    : null;

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
    ...(fbbComparison ? { fbbComparison } : {}),
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

const SCHEDULER_STATE_INTERVAL = "__orb2_scheduler__";
const SCHEDULER_FIELD_CURSOR_SYMBOL = "__field_cursor__";
const SCHEDULER_WARM_CURSOR_SYMBOL = "__warm_cursor__";
const SCHEDULER_FIELD_CURSOR_REASON = "field-cursor-v1";
const SCHEDULER_WARM_CURSOR_REASON = "warm-cursor-v1";
const SCHEDULER_CURSOR_PREFIX = "cursor:";

/* One durable pointer selects the next lane slot in the serialized rotation.
   It is separate from each lane's instrument cursor: a lane can be preempted
   without losing its place, and a failed provider item still advances its own
   cursor before the request. */
const SCHEDULER_DISPATCH_CURSOR_SYMBOL = "__dispatch_cursor__";
const SCHEDULER_DISPATCH_CURSOR_REASON = "dispatch-cursor-v1";
const SCHEDULER_DISPATCH_CURSOR_LANE = `${SCHEDULER_CURSOR_PREFIX}dispatch-v1`;

async function readSchedulerDispatchCursor(db) {
  const row = await readSchedulerState(db, SCHEDULER_DISPATCH_CURSOR_SYMBOL, SCHEDULER_DISPATCH_CURSOR_REASON);
  if (!row) return { ok: true, attempts: 0 };
  const attempts = Number(row.attempts);
  if (row.lane !== SCHEDULER_DISPATCH_CURSOR_LANE ||
      !Number.isSafeInteger(attempts) || attempts < 0 || attempts >= Number.MAX_SAFE_INTEGER - 1) {
    return { ok: false, attempts: 0 };
  }
  return { ok: true, attempts };
}

async function writeSchedulerDispatchCursor(db, attempts, now) {
  return writeSchedulerState(db, {
    symbol: SCHEDULER_DISPATCH_CURSOR_SYMBOL,
    reason: SCHEDULER_DISPATCH_CURSOR_REASON,
    lane: SCHEDULER_DISPATCH_CURSOR_LANE,
    attempts,
    now
  });
}

async function readSchedulerState(db, symbol, reason) {
  return (await db.prepare(`SELECT lane, attempts FROM orb2_field_queue
    WHERE interval = ? AND symbol = ? AND reason = ? LIMIT 1`)
    .bind(SCHEDULER_STATE_INTERVAL, symbol, reason).first()) || null;
}

async function writeSchedulerState(db, { symbol, reason, lane, attempts, now }) {
  return db.prepare(`INSERT INTO orb2_field_queue
      (created_at, interval, symbol, reason, lane, claimed_at, attempts)
      VALUES (?, ?, ?, ?, ?, NULL, ?)
    ON CONFLICT(interval, symbol, reason) DO UPDATE SET
      created_at = excluded.created_at, lane = excluded.lane,
      claimed_at = NULL, attempts = excluded.attempts`)
    .bind(now, SCHEDULER_STATE_INTERVAL, symbol, reason, lane, attempts).run();
}

const decodeCursorLane = lane => {
  if (typeof lane !== "string" || !lane.startsWith(SCHEDULER_CURSOR_PREFIX)) return null;
  try { return decodeURIComponent(lane.slice(SCHEDULER_CURSOR_PREFIX.length)); }
  catch { return null; }
};

/**
 * Advance one lane's durable cursor and return the item it selected.
 *
 * Each lane owns its own row: the state table's unique key is
 * (interval, symbol, reason), so the lane id rides in `reason` and every lane
 * keeps an independent, crash-durable ordinal. The recovery rules are the ones
 * the single-cursor scheduler already established — a stale key resumes from its
 * persisted ordinal instead of replaying the lane, and a corrupt row blocks
 * rather than guessing.
 *
 * On the first tick after this change a lane row does not exist yet, but the
 * legacy whole-field cursor row might. Seeding the lane from that legacy ordinal
 * keeps the deployment from restarting every lane at item zero, which is exactly
 * the whole-field replay the ordinal anchor exists to prevent.
 */
async function advanceFieldWorkCursor(
  db, items, now, cursorReason = SCHEDULER_FIELD_CURSOR_REASON, { stopBeforeWrap = false } = {}
) {
  if (!Array.isArray(items) || !items.length) return { ok: false, empty: true };
  let row = await readSchedulerState(db, SCHEDULER_FIELD_CURSOR_SYMBOL, cursorReason);
  let seededFromLegacy = false;
  if (!row && cursorReason !== SCHEDULER_FIELD_CURSOR_REASON) {
    const legacy = await readSchedulerState(db, SCHEDULER_FIELD_CURSOR_SYMBOL, SCHEDULER_FIELD_CURSOR_REASON);
    const legacyAttempts = legacy ? Number(legacy.attempts) : 0;
    if (legacy && legacy.lane !== `${SCHEDULER_CURSOR_PREFIX}blocked-v1` &&
        Number.isSafeInteger(legacyAttempts) && legacyAttempts > 0) {
      /* The legacy row stored both a stable key and an ordinal over the whole
         flattened field. Prefer the key when this lane actually contains it —
         that resumes the lane exactly where the whole-field cursor left off.
         Fall back to the ordinal modulo the lane length otherwise, which is
         still a resume and never a restart from item zero. */
      const legacyKey = decodeCursorLane(legacy.lane);
      const keyIndex = legacyKey && legacyKey !== "start"
        ? items.findIndex(item => item.key === legacyKey) : -1;
      const seededIndex = keyIndex >= 0 ? keyIndex : legacyAttempts % items.length;
      await writeSchedulerState(db, {
        symbol: SCHEDULER_FIELD_CURSOR_SYMBOL, reason: cursorReason,
        lane: `${SCHEDULER_CURSOR_PREFIX}${encodeURIComponent(items[seededIndex].key)}`,
        attempts: legacyAttempts, now
      });
      row = await readSchedulerState(db, SCHEDULER_FIELD_CURSOR_SYMBOL, cursorReason);
      seededFromLegacy = true;
    }
  }
  const attempts = row ? Number(row.attempts) : 0;
  const lastKey = row ? decodeCursorLane(row.lane) : "start";
  let selectedIndex = 0;
  let cursorRecovered = false;
  let wrapped = false;
  if (row) {
    if (row.lane === `${SCHEDULER_CURSOR_PREFIX}blocked-v1`) {
      return { ok: false, reset: true, blocked: true };
    }
    if (!Number.isSafeInteger(attempts) || attempts < 0 || attempts >= Number.MAX_SAFE_INTEGER || lastKey === null) {
      await writeSchedulerState(db, {
        symbol: SCHEDULER_FIELD_CURSOR_SYMBOL, reason: cursorReason,
        lane: `${SCHEDULER_CURSOR_PREFIX}blocked-v1`, attempts: 0, now
      });
      return { ok: false, reset: true, blocked: true };
    }
    if (lastKey !== "start") {
      const lastIndex = items.findIndex(item => item.key === lastKey);
      if (lastIndex < 0) {
        /* A changed roster is ordinal recovery, not a wrap. Do not suppress its
           first recovered item merely because the saved ordinal is divisible by
           the new roster length. */
        selectedIndex = attempts % items.length;
        cursorRecovered = true;
      } else {
        selectedIndex = (lastIndex + 1) % items.length;
        wrapped = lastIndex === items.length - 1;
      }
    }
  }
  if (wrapped && stopBeforeWrap) {
    /* A serial batch must not wrap and repeat early items just to fill its
       request allowance. The cursor still points at the last completed item,
       so the next Cron starts cleanly at item zero. */
    return { ok: false, wrapped: true, stoppedAtWrap: true, reset: cursorRecovered, seededFromLegacy };
  }
  const item = items[selectedIndex];
  /* Persist the selected position before the provider call, so a crash between
     here and the fetch cannot replay the lane. A lane seeded from the legacy
     ordinal above still advances and persists normally: the seed only supplies
     the starting anchor, it does not consume this tick's write. */
  await writeSchedulerState(db, {
    symbol: SCHEDULER_FIELD_CURSOR_SYMBOL, reason: cursorReason,
    lane: `${SCHEDULER_CURSOR_PREFIX}${encodeURIComponent(item.key)}`,
    attempts: (Number.isSafeInteger(attempts) ? attempts : 0) + 1, now
  });
  return {
    ok: true, item, wrapped: Boolean(row && selectedIndex === 0),
    reset: cursorRecovered, seededFromLegacy
  };
}

async function readAutoWarmProgress(db) {
  return readSchedulerState(db, SCHEDULER_WARM_CURSOR_SYMBOL, SCHEDULER_WARM_CURSOR_REASON);
}

async function writeAutoWarmProgress(db, nextIndex, now) {
  return writeSchedulerState(db, {
    symbol: SCHEDULER_WARM_CURSOR_SYMBOL, reason: SCHEDULER_WARM_CURSOR_REASON,
    lane: `${SCHEDULER_CURSOR_PREFIX}warm-v1`, attempts: nextIndex, now
  });
}

async function observationExists(db) {
  const row = await db.prepare("SELECT 1 AS present FROM orb2_field_observations LIMIT 1").first();
  return Boolean(row);
}

function createSchedulerD1Budget(db) {
  const stats = { reads: 0, writes: 0, rowsRead: 0 };
  /* `WITH` is a read: a CTE selects, it does not mutate. Omitting it would
     charge any future CTE against the small reserved write allowance and could
     fail a legitimate read closed. Kept identical to the classifier the
     scheduler tests use, so the budget the tests measure is the budget the
     Worker enforces. */
  const classify = query => /^\s*(?:SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(String(query)) ? "reads" : "writes";
  const count = (kind, amount = 1, finalizing = false) => {
    const limit = kind === "reads" ? ORB2_FIELD_SCHEDULER_MAX_D1_READS
      : ORB2_FIELD_SCHEDULER_MAX_D1_WRITES - (finalizing ? 0 : ORB2_FIELD_SCHEDULER_RESERVED_D1_WRITES);
    if (stats[kind] + amount > limit) {
      throw new Error(`Orb 2 scheduled D1 ${kind} budget exceeded (${stats[kind] + amount}/${limit}).`);
    }
    stats[kind] += amount;
  };
  /* Every wrapper carries the budget kind it was classified with plus an
     `unwrap()` accessor, so `batch()` can charge each statement to its own
     budget exactly once and still hand the underlying driver real statements.
     Without the tag, a batched SELECT was charged as a write and drew from the
     small reserved write allowance; without `unwrap()`, a driver whose `batch()`
     calls `.run()` on each entry (the test fixture does) charged every
     statement twice. */
  const wrapStatement = (statement, kind, finalizing) => ({
    kind,
    unwrap() { return statement; },
    bind(...values) { return wrapStatement(statement.bind(...values), kind, finalizing); },
    async first(...args) { count(kind, 1, finalizing); return statement.first(...args); },
    async all(...args) {
      count(kind, 1, finalizing);
      const result = await statement.all(...args);
      const rows = Array.isArray(result?.results) ? result.results : [];
      if (rows.length > ORB2_FIELD_SCHEDULER_MAX_ROWS_PER_READ) {
        throw new Error(`Orb 2 scheduled D1 row bound exceeded (${rows.length}/${ORB2_FIELD_SCHEDULER_MAX_ROWS_PER_READ}).`);
      }
      stats.rowsRead += rows.length;
      return result;
    },
    async run(...args) { count(kind, 1, finalizing); return statement.run(...args); }
  });
  const unwrapStatement = statement =>
    statement && typeof statement.unwrap === "function" ? statement.unwrap() : statement;
  const wrapDatabase = finalizing => ({
    prepare(query) { return wrapStatement(db.prepare(query), classify(query), finalizing); },
    async batch(statements) {
      const list = Array.isArray(statements) ? statements : [];
      /* Charge the whole batch before any of it is sent, so an over-budget batch
         is refused up front instead of half-applying and then throwing. */
      for (const statement of list) {
        count(statement && statement.kind === "reads" ? "reads" : "writes", 1, finalizing);
      }
      if (typeof db.batch !== "function") throw new Error("D1 batch is unavailable.");
      return db.batch(list.map(unwrapStatement));
    }
  });
  return { db: wrapDatabase(false), finalDb: wrapDatabase(true), stats };
}

/* ── concurrency lanes ──────────────────────────────────────────────────
 *
 * The tick is optimized for parallel and sequential work at the same time by
 * splitting it into two lanes with opposite rules:
 *
 *   READ LANE  — parallel, bounded. D1 reads that do not depend on each other
 *                are issued together. Waiting on I/O is not Worker CPU time, so
 *                overlapping these round trips lowers wall-clock latency at
 *                essentially unchanged CPU cost: the same rows are parsed
 *                either way. Concurrency is capped, never unbounded, so peak
 *                in-flight result buffers stay small and predictable.
 *
 *   WRITE/PROVIDER LANE — sequential. Provider calls stay strictly ordered
 *                because their envelopes are the actual contract (Massive five
 *                per minute per asset class, Kraken one per second plus a
 *                UTC-day ceiling, Tickerbot a UTC-month ledger). Statements
 *                that mutate scheduler state stay ordered so the single-writer
 *                lease and the cursor-advance-before-fetch crash guarantee keep
 *                their meaning.
 *
 * The bound matches `MAX_FETCH_CONCURRENCY` in `worker/characters-beat.mjs`, so
 * both Worker surfaces fan out with the same reviewed limit.
 */
export const ORB2_FIELD_D1_READ_CONCURRENCY = 4;

/** Bounded-concurrency map. Preserves input order; rejects on the first error. */
async function mapWithConcurrency(items, limit, worker) {
  const list = Array.isArray(items) ? items : [];
  const results = new Array(list.length);
  if (!list.length) return results;
  let cursor = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, list.length)) }, async () => {
    while (cursor < list.length) {
      const index = cursor++;
      results[index] = await worker(list[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

/**
 * Bounded-concurrency map that never rejects. Each result is
 * `{ ok, value }` or `{ ok: false, error }`, so one failing lane cannot take a
 * whole tick or snapshot down with it — the same property the sequential tick
 * already guarantees for provider outages.
 */
async function settleWithConcurrency(items, limit, worker) {
  return mapWithConcurrency(items, limit, async (item, index) => {
    try {
      return { ok: true, value: await worker(item, index) };
    } catch (error) {
      return { ok: false, error };
    }
  });
}

/**
 * Run independent, already-started promises under a concurrency bound.
 * `thunks` are zero-argument functions so nothing is issued before a slot is
 * free; results keep input order and each is settled independently.
 */
async function settleAllThunks(thunks, limit = ORB2_FIELD_D1_READ_CONCURRENCY) {
  return settleWithConcurrency(thunks, limit, thunk => thunk());
}

/**
 * Run independent reads together, but fail exactly as the sequential form did.
 *
 * Concurrency changes which rejection lands first, and callers (plus the
 * snapshot's fail-visible contract) depend on a specific error. Settling every
 * thunk and then re-throwing the first failure in *input* order keeps the
 * surfaced error identical to the old one-at-a-time version while still
 * overlapping the round trips that succeed.
 */
async function readIndependently(thunks, limit = ORB2_FIELD_D1_READ_CONCURRENCY) {
  const settled = await settleAllThunks(thunks, limit);
  for (const result of settled) {
    if (!result.ok) throw result.error;
  }
  return settled.map(result => result.value);
}

/** Persist one observation. An older write never overwrites a newer row. */
async function writeObservation(db, observation, now, { refresh = true } = {}) {
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
  if (refresh) await refreshStoredComposition(db, observation.symbol, now);
}

/* Recalculate the daily row after either scale changes. The full 15-minute series
 * is intentionally not stored; this joins the two compact, validated summaries and
 * persists only the deterministic composition packet. */
async function refreshStoredComposition(db, symbol, now) {
  const rows = await db.prepare(`SELECT interval, substr(payload, 1, 65536) AS payload FROM orb2_field_observations
    WHERE symbol = ? AND interval IN ('1d', '15m') LIMIT 2`).bind(symbol).all();
  const parsed = (Array.isArray(rows && rows.results) ? rows.results : []).map(row => ({
    interval: String(row.interval), observation: parsePacketRow(row, now)
  })).filter(row => row.observation);
  const daily = parsed.find(row => row.interval === "1d")?.observation || null;
  const intraday = parsed.find(row => row.interval === ORB2_INTRADAY_INTERVAL)?.observation || null;
  if (!daily) return;
  const composition = composePair(daily, intraday, now);
  /* WRITE LANE, batched: these UPDATEs touch disjoint (interval, symbol) rows
     and share no read-modify-write state, so they go out as one D1 batch — a
     single round trip instead of one per interval. Ordering inside the batch
     is irrelevant because the rows do not overlap. */
  const updates = parsed.map(row => {
    const payload = { ...row.observation, composition };
    return db.prepare("UPDATE orb2_field_observations SET payload = ?, updated_at = ? WHERE interval = ? AND symbol = ?")
      .bind(JSON.stringify(payload), now, row.interval, symbol);
  });
  if (updates.length > 1 && typeof db.batch === "function") {
    await db.batch(updates);
    return;
  }
  for (const update of updates) await update.run();
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
    WHERE lane IN ('hot', 'sweep') AND (claimed_at IS NULL OR claimed_at < ?)
    ORDER BY CASE lane WHEN 'hot' THEN 0 ELSE 1 END, attempts, id
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

/* A refused/failed priority item remains durable but must not preempt every Cron
   tick. Reusing claimed_at as a bounded backoff keeps the deployed schema stable;
   claimQueue's existing lease predicate makes it eligible after delay + lease. */
async function deferQueueRow(db, id, now, delayMs = 5 * 60_000) {
  await db.prepare("UPDATE orb2_field_queue SET claimed_at = ? WHERE id = ? AND lane IN ('hot', 'sweep')")
    .bind(now + delayMs, id).run();
}

async function hasPendingQueue(db, at = Date.now()) {
  const row = await db.prepare(`SELECT 1 AS pending FROM orb2_field_queue
    WHERE lane IN ('hot', 'sweep') AND (claimed_at IS NULL OR claimed_at < ?) LIMIT 1`)
    .bind(at - ORB2_FIELD_TICK_LEASE_MS).first();
  return Boolean(row);
}

async function queueDepth(db, at = Date.now()) {
  const row = await db.prepare(`SELECT
      SUM(CASE WHEN lane IN ('hot', 'sweep') AND (claimed_at IS NULL OR claimed_at < ?) THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN lane = 'hot' AND (claimed_at IS NULL OR claimed_at < ?) THEN 1 ELSE 0 END) AS hot,
      SUM(CASE WHEN lane IN ('hot', 'sweep') THEN 1 ELSE 0 END) AS total FROM orb2_field_queue`)
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
    twelvedata: typeof env.TWELVEDATA_API_KEY === "string" ? env.TWELVEDATA_API_KEY.trim() : "",
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
    return (await db.prepare(`SELECT symbol, underlying_price,
        substr(selection_json, 1, 8192) AS selection_json,
        substr(bars_json, 1, 16384) AS bars_json, status, observed_at
      FROM orb2_options_observations WHERE symbol = ? LIMIT 1`)
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
  const stockRow = await db.prepare(`SELECT substr(payload, 1, 65536) AS payload FROM orb2_field_observations
    WHERE interval = '1d' AND symbol = ? AND disc_id = 'stocks' LIMIT 1`)
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

async function beatTwelveData({ env, instrument, now, fetcher, keys, dependencies }) {
  if (!keys.twelvedata) return { ok: false, attempted: false, code: "twelvedata-not-configured", message: "Add the TWELVEDATA_API_KEY Worker secret to enable the Twelve Data daily field (800/day, 8/min, private internal use)." };
  const guard = await guardTwelveDataCallBeforeFetch({ kv: env.COMMUNITY_DB, now: () => now, dailyKv: null });
  if (guard.decision === "rate-limited") {
    return { ok: false, attempted: false, code: guard.code, message: guard.message, retryAfter: guard.retryAfter, httpStatus: guard.httpStatus };
  }
  const result = await fetchTwelveDataDailyMarketContext({
    instrument: { ...instrument, interval: "1d" }, symbol: instrument.symbol,
    apiKey: keys.twelvedata, fetcher, now, timeoutMs: UPSTREAM_TIMEOUT_MS, dependencies
  });
  if (!result.ok) return { ok: false, attempted: true, code: result.code, message: result.message, retryAfter: result.retryAfter, httpStatus: result.httpStatus };
  recordTwelveDataCallSuccess();
  return { ok: true, attempted: true, packet: result.packet, calls: 1, provider: "twelvedata" };
}

async function beatMassive({ env, instrument, now, fetcher, keys, dependencies }) {
  // Private sole-use: prefer Twelve Data (800/day 8/min free) when TWELVEDATA_API_KEY is set, else Massive.
  if (keys.twelvedata) {
    const td = await beatTwelveData({ env, instrument, now, fetcher, keys, dependencies });
    // If Twelve Data explicitly refused (not-configured) fall through to Massive, else return its result.
    if (td.code !== "twelvedata-not-configured") return td;
  }
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
  // When Twelve Data is the FX venue, map the Massive holder to Twelve Data so fx-provider's dual/fallback logic still works.
  const fxMassiveLike = () => keys.twelvedata
    ? beatTwelveData({ env, instrument, now, fetcher, keys })
    : beatMassive({ env, db, instrument, now, fetcher, keys });
  const result = await fetchFxMarketContext({
    mode,
    massive: fxMassiveLike,
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
  const catalog = globalThis.CharactersDiscCatalog;
  const commodities = catalog && Array.isArray(catalog.futures || catalog.commodities)
    ? (catalog.futures || catalog.commodities).slice(0, 11) : [];
  const productCodes = commodities.map(entry => String(entry && entry.massive && entry.massive.productCode || "").toUpperCase());
  const state = await readMassiveFuturesContractState({ db, now, productCodes });
  if (!state.ok) {
    summary.notes.push("Disc4 contracts are held: apply D1 migration 0011_massive_futures_contract_cache.sql before active-contract discovery.");
    return state;
  }
  if (!keys.massive) return state;
  if (state.globalLastAttemptAt && now - state.globalLastAttemptAt < MASSIVE_FUTURES_CONTRACT_GLOBAL_COOLDOWN_MS) return state;

  let candidate = null;
  for (const entry of commodities) {
    const productCode = String(entry && entry.massive && entry.massive.productCode || "").toUpperCase();
    if (!/^[A-Z0-9]{1,8}$/.test(productCode) || state.contracts[productCode] ||
        now - (Number(state.lastAttemptAt[productCode]) || 0) < MASSIVE_FUTURES_CONTRACT_RETRY_COOLDOWN_MS) continue;
    let row = null;
    try {
      row = await db.prepare(`SELECT substr(payload, 1, 65536) AS payload, symbol, disc_id, provider, status, observed_at
        FROM orb2_field_observations WHERE interval = '1d' AND symbol = ? AND disc_id = 'commodities' LIMIT 1`)
        .bind(entry.symbol).first();
    } catch { /* a focused row-read failure does not trigger a wider scan */ }
    const observation = row ? parsePacketRow(row, now) : null;
    if (String(row && row.provider) === "massive" && observation && observation.market &&
        !fieldObservationExpired("1d", Number(row.observed_at), now)) continue;
    candidate = entry;
    break;
  }
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
    state.discoverySucceeded = true;
  } else {
    state.discoverySucceeded = false;
    if (!["massive-futures-contract-cooldown", "massive-futures-contract-circuit-open",
      "massive-rate-limit", "massive-budget-exhausted"].includes(result.code)) {
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
/* Maps a reviewed work kind onto the provider lane whose envelope it spends.
   Derived rather than passed at each call site so a kind can never be attached
   to the wrong allowance. */
const ORB2_FIELD_LANE_BY_KIND = Object.freeze({
  "tickerbot-daily": "tickerbot-stocks",
  "kraken-daily": "kraken-crypto",
  "massive-fx": "massive-fx",
  "massive-futures": "massive-futures",
  "massive-index": "massive-indices",
  "options": "massive-options"
});
/** Stable lane ids that actually own reviewed work kinds. */
export const ORB2_FIELD_WORK_LANE_IDS = Object.freeze(
  ORB2_FIELD_PROVIDER_LANES.map(lane => lane.id)
);
const ORB2_FIELD_DECLARED_LANE_IDS = Object.freeze(new Set(ORB2_FIELD_WORK_LANE_IDS));

function scheduledWorkItems({ roster, optionsEnabled, keys, laneId = null }) {
  const items = [];
  const ownsLane = id => laneId === null || laneId === id;
  const add = (key, kind, instrument, extra = {}) => {
    const lane = ORB2_FIELD_LANE_BY_KIND[kind];
    /* An unmapped kind is a programming error, not schedulable work. It is
       refused loudly rather than silently dropped, so a renamed catalog kind
       cannot quietly stop a whole Disc from rotating. */
    if (!lane) throw new Error(`Orb 2 reviewed work kind "${kind}" has no provider lane.`);
    if (!ORB2_FIELD_DECLARED_LANE_IDS.has(lane)) {
      throw new Error(`Orb 2 work kind "${kind}" maps to undeclared lane "${lane}".`);
    }
    items.push({ key, kind, lane, instrument, ...extra });
  };
  const hasDailyVenue = Boolean(keys.massive || keys.twelvedata);
  if (keys.tickerbot && ownsLane("tickerbot-stocks")) {
    for (const instrument of roster.stocks) add(`tickerbot:1d:${instrument.symbol}`, "tickerbot-daily", instrument);
  }
  if (hasDailyVenue && ownsLane("massive-fx")) {
    for (const instrument of roster.fx) add(`massive:fx:${instrument.symbol}`, "massive-fx", instrument);
  }
  if (ownsLane("kraken-crypto")) {
    for (const instrument of [...roster.crypto, ...roster.cryptoPairs]) {
      add(`kraken:1d:${instrument.symbol}`, "kraken-daily", instrument);
    }
  }
  if (hasDailyVenue) {
    if (ownsLane("massive-futures")) {
      for (const instrument of roster.commodities) add(`massive:futures:${instrument.symbol}`, "massive-futures", instrument);
    }
    if (ownsLane("massive-indices")) {
      for (const instrument of roster.indices) add(`massive:index:${instrument.symbol}`, "massive-index", instrument);
    }
    if (optionsEnabled && ownsLane("massive-options")) {
      /* One discovery plus four selected contract bars is exactly the existing
         Options work for one reviewed underlying; each cursor slot can make one
         call, within Massive's unchanged five-requests/minute Options allowance. */
      for (const instrument of roster.stocks) {
        for (let slot = 0; slot < MASSIVE_OPTIONS_SELECTION_SIZE + 1; slot += 1) {
          add(`options:${instrument.symbol}:${slot}`, "options", instrument, { slot });
        }
      }
    }
  }
  if (items.length > ORB2_FIELD_SCHEDULER_MAX_WORK_ITEMS_PER_CYCLE) {
    throw new Error(`Orb 2 reviewed worklist exceeded its fixed cycle bound (${items.length}/${ORB2_FIELD_SCHEDULER_MAX_WORK_ITEMS_PER_CYCLE}).`);
  }
  return items;
}

/**
 * Account one provider work unit against both the per-lane and whole-tick caps.
 *
 * The per-lane cap is the one that preserves the provider envelope: a lane may
 * spend exactly ORB2_FIELD_SCHEDULER_WORK_UNITS_PER_LANE_PER_TICK unit per
 * scheduled minute, which is what the single-cursor scheduler already did. The
 * whole-tick cap is derived from the lanes and is a backstop, never the binding
 * constraint. Lanes run concurrently, so this is called from several pending
 * tasks; the check and the increment are synchronous, so no two lanes can read
 * the same count and both pass.
 *
 * This deliberately records only counts. Which unit ran, in a stable order, is
 * assembled by the driver from the lane reports — deriving it here would make
 * `summary.workUnit` depend on which lane happened to resolve first.
 */
const laneById = id => ORB2_FIELD_PROVIDER_LANES.find(lane => lane.id === id) || null;

function markSchedulerWorkUnit(summary, key, lane = null) {
  if (summary.workUnits >= ORB2_FIELD_SCHEDULER_WORK_UNITS_PER_TICK) {
    throw new Error("Orb 2 scheduled provider-work unit limit was exceeded.");
  }
  if (lane) {
    const laneId = String(lane);
    const definition = laneById(laneId);
    /* The cap is the lane's own reviewed budget. It is one for every lane whose
       provider spends a whole request per unit, and higher only where the lane
       documents that its envelope has the headroom. */
    const cap = definition
      ? laneWorkUnits(definition) : ORB2_FIELD_SCHEDULER_WORK_UNITS_PER_LANE_PER_TICK;
    const used = summary.workUnitsByLane.get(laneId) || 0;
    if (used >= cap) {
      throw new Error(`Orb 2 "${laneId}" lane exceeded its per-tick provider-work unit limit (${used}/${cap}).`);
    }
    summary.workUnitsByLane.set(laneId, used + 1);
  }
  summary.workUnits += 1;
  return String(key || "scheduled-work").slice(0, 96);
}

function autoWarmJob(index) {
  if (!Number.isInteger(index) || index < 0 || index >= ORB2_FIELD_TICKERBOT_BURST_CALLS) return null;
  const intervalIndex = Math.floor(index / TICKERBOT_WATCHLIST.length);
  const symbolIndex = index % TICKERBOT_WATCHLIST.length;
  const interval = ORB2_FIELD_WARM_INTERVALS[intervalIndex];
  const instrument = TICKERBOT_WATCHLIST[symbolIndex];
  return instrument && interval ? { instrument, interval, reason: "deploy-warm" } : null;
}

async function loadAutoWarmState(db, control, now, summary) {
  let row = await readAutoWarmProgress(db);
  const lastWarm = Number(control && (control.deploy_warm_at || control.manual_warm_at)) || 0;
  if (!row && !lastWarm) {
    let hasObservations = true;
    try { hasObservations = await observationExists(db); }
    catch { summary.notes.push("Automatic warm stayed idle because the bounded field-presence check failed."); }
    if (!hasObservations) {
      await writeAutoWarmProgress(db, 0, now);
      row = { lane: `${SCHEDULER_CURSOR_PREFIX}warm-v1`, attempts: 0 };
      await writeControl(db, {
        deployWarmAt: now,
        warmBursts: (Number(control && control.warm_bursts) || 0) + 1
      }, now);
      summary.notes.push(`Automatic Tickerbot calibration started as a rolling ${ORB2_FIELD_TICKERBOT_BURST_CALLS}-unit cursor.`);
    }
  } else if (row && !lastWarm) {
    /* Repair the marker after a crash between cursor creation and control write;
       the persisted progress is kept and never restarted. */
    await writeControl(db, {
      deployWarmAt: now,
      warmBursts: (Number(control && control.warm_bursts) || 0) + 1
    }, now);
  }
  if (!row) return { active: false, progress: 0, reset: false };
  const progress = Number(row.attempts);
  if (row.lane !== `${SCHEDULER_CURSOR_PREFIX}warm-v1` || !Number.isSafeInteger(progress) ||
      progress < 0 || progress > ORB2_FIELD_TICKERBOT_BURST_CALLS) {
    await writeAutoWarmProgress(db, ORB2_FIELD_TICKERBOT_BURST_CALLS, now);
    summary.notes.push("The automatic warm cursor was invalid and was closed safely without replaying its batch.");
    return { active: false, progress: ORB2_FIELD_TICKERBOT_BURST_CALLS, reset: true };
  }
  return { active: progress < ORB2_FIELD_TICKERBOT_BURST_CALLS, progress, reset: false };
}

async function processTickerbotUnit({ db, env, instrument, interval, reason, now, fetcher, keys, summary, queueJob = null }) {
  const outcome = await beatTickerbot({ env, db, instrument, interval, now, fetcher, keys });
  if (outcome.attempted) summary.tickerbotCalls += 1;
  if (outcome.ok && outcome.packet) {
    summary.packetAnalyses += 1;
    const observation = observationFromPacket({
      packet: outcome.packet, symbol: instrument.symbol, displaySymbol: instrumentDisplay(instrument),
      name: instrumentName(instrument), sector: instrumentSector(instrument), discId: "stocks",
      provider: "tickerbot", providerId: instrument.providerId || instrument.symbol,
      interval, now, reason
    });
    if (observation) {
      await writeObservation(db, observation, now, { refresh: !queueJob });
      summary.observed += 1;
      if (queueJob) {
        summary.queueCompleted += 1;
        await resolveQueueRow(db, queueJob.id, { keep: false });
        await refreshStoredComposition(db, instrument.symbol, now);
      }
      return { ok: true, attempted: outcome.attempted };
    }
  }
  summary.held += 1;
  summary.errors.push(`${interval} ${instrument.symbol}: ${text(outcome.message, 140) || outcome.code || "Tickerbot did not answer"}`);
  if (outcome.attempted) {
    const heldObs = heldFieldObservation({
      symbol: instrument.symbol, displaySymbol: instrumentDisplay(instrument),
      name: instrumentName(instrument), sector: instrumentSector(instrument), discId: "stocks",
      provider: "tickerbot", interval, now, reason,
      code: outcome.code || "tickerbot-refusal", message: text(outcome.message, 140) || "Tickerbot did not answer"
    });
    if (heldObs) await writeObservation(db, heldObs, now);
  }
  if (queueJob) {
    await resolveQueueRow(db, queueJob.id, { keep: Number(queueJob.attempts) < ORB2_FIELD_MAX_QUEUE_ATTEMPTS });
  }
  return { ok: false, attempted: outcome.attempted, code: outcome.code };
}

async function processQueuedTickerbotJob({ db, env, job, now, fetcher, keys, summary }) {
  const instrument = TICKERBOT_WATCHLIST.find(entry => entry.symbol === job.symbol);
  if (!instrument || !TICKERBOT_INTERVALS.includes(job.interval)) {
    summary.held += 1;
    summary.errors.push(`${job.interval} ${job.symbol}: the queued item is outside the reviewed Tickerbot field.`);
    await resolveQueueRow(db, job.id, { keep: Number(job.attempts) < ORB2_FIELD_MAX_QUEUE_ATTEMPTS });
    return;
  }
  return processTickerbotUnit({
    db, env, instrument, interval: job.interval, reason: job.reason,
    now, fetcher, keys, summary, queueJob: job
  });
}

async function persistMarketOutcome({ db, instrument, outcome, provider, now, summary, reason = "server-sweep" }) {
  const providerId = instrument.providerId || instrument.massiveTicker || instrument.symbol;
  const metadata = {
    symbol: instrument.symbol, displaySymbol: instrumentDisplay(instrument),
    name: instrumentName(instrument), sector: instrumentSector(instrument), discId: instrument.discId,
    provider: outcome.selectedProvider || provider,
    providerId: instrument.providerId || providerId,
    ...(instrument.krakenPair ? {
      krakenPair: instrument.krakenPair, rankingProvider: instrument.rankingProvider,
      baseAsset: instrument.baseAsset, quoteAsset: instrument.quoteAsset
    } : {}),
    interval: "1d", now, reason
  };
  if (outcome.ok && outcome.packet) {
    summary.packetAnalyses += 1;
    const observation = observationFromPacket({ packet: outcome.packet, ...metadata });
    if (observation) {
      await writeObservation(db, observation, now);
      summary.observed += 1;
      return true;
    }
  }
  summary.held += 1;
  summary.errors.push(`${instrument.krakenPair || instrument.symbol}: ${text(outcome.message, 140) || outcome.code || `${provider} did not answer`}`);
  if (outcome.attempted) {
    const heldObs = heldFieldObservation({
      ...metadata,
      provider: outcome.selectedProvider || provider,
      code: outcome.code || `${provider}-refusal`,
      message: text(outcome.message, 140) || `${provider} did not answer`
    });
    if (heldObs) await writeObservation(db, heldObs, now);
  }
  return false;
}

async function processScheduledWorkItem({ db, env, item, now, fetcher, keys, summary }) {
  if (item.kind === "options") {
    const outcome = await refreshOptionsFieldForStock({ env, db, instrument: item.instrument, now, fetcher, keys });
    if (outcome.attempted) summary.optionsCalls += 1;
    if (outcome.ok && outcome.status === "ready") summary.optionsObserved += 1;
    if (!outcome.ok && outcome.attempted) {
      summary.errors.push(`${item.instrument.symbol}: ${text(outcome.message, 140) || outcome.code || "Massive Options did not answer"}`);
    }
    return;
  }
  const provider = item.kind === "kraken-daily" ? "kraken" : item.kind === "tickerbot-daily" ? "tickerbot" : (keys.twelvedata ? null : "massive");
  const due = await dueRotation(db, [item.instrument], 1, now, provider);
  if (!due.length) return;
  const instrument = due[0].instrument;
  if (item.kind === "tickerbot-daily") {
    await processTickerbotUnit({
      db, env, instrument, interval: "1d", reason: "server-sweep",
      now, fetcher, keys, summary
    });
    return;
  }
  if (item.kind === "kraken-daily") {
    const outcome = await beatKraken({ db, instrument, now, fetcher, summary });
    await persistMarketOutcome({ db, instrument, outcome, provider: "kraken", now, summary });
    return;
  }
  const outcome = item.kind === "massive-fx"
    ? await beatFx({ env, db, instrument, now, fetcher, keys })
    : await beatMassive({ env, db, instrument, now, fetcher, keys });
  const venueIsTwelve = Boolean(keys.twelvedata);
  if (item.kind === "massive-fx") {
    const providers = outcome.providers || {};
    // fx-provider reports the first attempt under `massive` even when it was Twelve Data (dispatched via the massive holder).
    const fxAttemptedIsTwelve = venueIsTwelve && (providers.massive?.attempted || (!providers.alphaVantage && outcome.attempted));
    if (fxAttemptedIsTwelve) summary.twelvedataCalls += 1;
    else if (providers.massive?.attempted) summary.massiveCalls += 1;
    if (providers.alphaVantage?.ok) summary.alphaVantageCalls += 1;
    else if (outcome.selectedProvider === "alpha-vantage" && outcome.ok) summary.alphaVantageCalls += 1;
    // When the FX outcome has no providers map (single Twelve Data direct), count it here.
    if (!providers.massive && !providers.alphaVantage && venueIsTwelve && outcome.attempted) {
      // already counted above if attempted, but guard against double-count when map missing
      if (summary.twelvedataCalls === 0) summary.twelvedataCalls += 1;
    }
  } else if (outcome.attempted) {
    if (venueIsTwelve) summary.twelvedataCalls += 1;
    else summary.massiveCalls += 1;
  }
  const persistProvider = venueIsTwelve ? "twelvedata" : "massive";
  await persistMarketOutcome({ db, instrument, outcome, provider: persistProvider, now, summary });
}

/* ── serialized provider lanes ────────────────────────────────────────── */

/** Each lane owns one durable cursor row; the lane id rides in the reason. */
const laneCursorReason = laneId => `${SCHEDULER_FIELD_CURSOR_REASON}:${laneId}`;

/* Retained for compatibility with callers/tests that inspect the reviewed lane
   catalog. The dispatcher intentionally invokes only one lane per Cron tick. */
export const ORB2_FIELD_LANE_CONCURRENCY = 1;

/**
 * A lane-scoped view of the tick summary.
 *
 * The worker functions mutate the fields they already mutated on the tick
 * summary, so they run against a lane-local recorder. The driver merges that
 * recorder after the selected lane settles, preserving per-lane accounting and
 * preventing a failed provider task from corrupting the tick result.
 */
function createLaneRecorder() {
  return {
    massiveCalls: 0, twelvedataCalls: 0, alphaVantageCalls: 0, tickerbotCalls: 0, krakenCalls: 0,
    optionsCalls: 0, optionsObserved: 0, observed: 0, packetAnalyses: 0, held: 0,
    queueCompleted: 0, notes: [], errors: []
  };
}

const LANE_RECORDER_COUNTERS = Object.freeze([
  "massiveCalls", "twelvedataCalls", "alphaVantageCalls", "tickerbotCalls", "krakenCalls",
  "optionsCalls", "optionsObserved", "observed", "packetAnalyses", "held", "queueCompleted"
]);

function mergeLaneRecorder(summary, recorder) {
  for (const key of LANE_RECORDER_COUNTERS) summary[key] += recorder[key];
  summary.notes.push(...recorder.notes);
  summary.errors.push(...recorder.errors);
}

/* Ranking and contract refusals that are ordinary steady state, not news. */
const ORB2_FIELD_QUIET_RANKING_CODES = Object.freeze(new Set([
  "crypto-ranking-cooldown", "crypto-ranking-cache-miss", "kraken-rate-limit", "kraken-budget-exhausted"
]));

/**
 * Spend a lane's own work-unit budget in that lane, sequentially.
 *
 * Discovery is part of its lane, not a separate tick: a cold Kraken ranking
 * cache spends the crypto lane's unit on the ranking call, and a cold Massive
 * contract cache spends the futures lane's unit on contract discovery. On a warm
 * cache the same lane spends its unit on one instrument instead.
 *
 * The budget is `lane.maxWorkUnitsPerTick`, one unless the lane documents
 * otherwise, and the whole-lane provider ceiling is that budget times
 * `maxProviderCallsPerUnit`. A lane taking several units in one minute still
 * takes them one after another, so its sliding-window envelope keeps its
 * meaning, while other lanes run concurrently.
 */
async function runProviderLane({ lane, db, env, now, fetcher, keys, summary, optionsEnabled, spent = false }) {
  const recorder = createLaneRecorder();
  /* Declared before the report so the report can quote the lane's own budgets. */
  const laneUnitBudget = laneWorkUnits(lane);
  const laneCallCeiling = laneCallCeilingFor(lane);
  const report = {
    lane: lane.id, ran: false, skipped: spent, workUnit: null, workUnits: [],
    providerCalls: 0, unitBudget: laneUnitBudget, callCeiling: laneCallCeiling,
    cursorAdvanced: false, cursorReset: false, sweepsCompleted: 0
  };
  /* A per-lane ceiling underneath the whole-tick one. The global counter cannot
     tell which envelope a request belongs to, so it can only bound the total;
     this bound is what actually proves a lane stayed inside its own reviewed
     allowance — including the FX lane's two-request Massive-to-Alpha fallback,
     which is the only unit permitted to spend twice. Check and increment are
     synchronous, so nothing inside the lane can interleave past it. */
  let laneProviderCalls = 0;
  const laneFetcher = async (...args) => {
    if (laneProviderCalls >= laneCallCeiling) {
      throw new Error(`Orb 2 "${lane.id}" lane exceeded its provider request ceiling (${laneProviderCalls}/${laneCallCeiling}).`);
    }
    laneProviderCalls += 1;
    return fetcher(...args);
  };
  try {
    if (spent) return report;
    if (lane.provider === "tickerbot" && !keys.tickerbot) return report;
    if (lane.provider === "massive" && !keys.massive && !keys.twelvedata) return report;

    let cryptoRanking = null;
    let commodityContracts = null;

    if (lane.id === "kraken-crypto") {
      /* Cache-first: a warm ranking costs one D1 read and no provider call, so
         the lane still has its unit available for a daily bar. */
      try {
        const rankingResult = await getCharactersCryptoRanking({
          db, fetcher: laneFetcher, now, timeoutMs: UPSTREAM_TIMEOUT_MS,
          beforeFetch: async () => {
            const reservation = await claimKrakenCall(db, now, KRAKEN_PROVIDER_DAILY_LIMIT);
            if (reservation.ok) recorder.krakenCalls += 1;
            return reservation;
          }
        });
        if (rankingResult.ok) cryptoRanking = rankingResult.ranking;
        else if (!ORB2_FIELD_QUIET_RANKING_CODES.has(rankingResult.code)) {
          recorder.notes.push(`Kraken crypto ranking held: ${rankingResult.message}`);
        }
      } catch { recorder.notes.push("Kraken crypto ranking held: the D1 roster could not be read."); }
      /* Lane-local, so a concurrent lane's Kraken spend can never be mistaken
         for this lane's discovery. */
      if (recorder.krakenCalls > 0) {
        const discoveryUnit = markSchedulerWorkUnit(summary, "kraken:ranking", lane.id);
        report.ran = true;
        report.workUnit = discoveryUnit;
        report.workUnits.push(discoveryUnit);
        /* Kraken has a one-call tick allowance, so a successful ranking refresh
           needs one follow-up invocation before the first market bar. */
        report.keepDispatchSlot = Boolean(cryptoRanking);
        return report;
      }
      if (!cryptoRanking) {
        recorder.notes.push("Disc3 is held: the Kraken Spot rolling-24-hour roster is not available; no other venue is used.");
        return report;
      }
    }

    if (lane.id === "massive-futures") {
      if (keys.twelvedata) {
        // Twelve Data private: bypass Massive's active-futures contract table and synthesize 1:1 contracts from catalog productCodes.
        // No provider call is spent here; the daily bar uses the product symbol directly (e.g. CL, GC, WTI via productCode).
        const catalog = globalThis.CharactersDiscCatalog;
        const list = catalog && Array.isArray(catalog.futures || catalog.commodities) ? (catalog.futures || catalog.commodities) : [];
        const today = new Date(now).toISOString().slice(0, 10);
        commodityContracts = {};
        for (const entry of list) {
          const pc = String(entry && entry.massive && entry.massive.productCode || "").toUpperCase();
          if (!/^[A-Z0-9]{1,8}$/.test(pc)) continue;
          commodityContracts[pc] = {
            productCode: pc,
            ticker: pc,
            provider: "TwelveData",
            asOfDate: today,
            lastTradeDate: today
          };
        }
      } else {
        const futuresState = await resolveOrb2CommodityContracts({ env, db, now, fetcher: laneFetcher, keys, summary: recorder });
        if (recorder.massiveCalls > 0) {
          const discoveryUnit = markSchedulerWorkUnit(summary, "massive:futures-contract-discovery", lane.id);
          report.ran = true;
          report.workUnit = discoveryUnit;
          report.workUnits.push(discoveryUnit);
          commodityContracts = futuresState && futuresState.ok ? futuresState.contracts : null;
          /* A successful discovery can feed bars in this same selected lane.
             Its request consumes one of the futures lane's five provider-call
             slots; a failed discovery has no verified roster to process. */
          if (futuresState?.discoverySucceeded !== true) return report;
        } else {
          commodityContracts = futuresState && futuresState.ok ? futuresState.contracts : null;
        }
      }
    }

    const laneDiscIds = {
      "tickerbot-stocks": ["stocks"],
      "kraken-crypto": ["crypto"],
      "massive-fx": ["fx"],
      "massive-futures": ["commodities"],
      "massive-indices": ["indices"],
      "massive-options": ["stocks"]
    }[lane.id] || [];
    const roster = orb2FieldRoster({
      now, cryptoRanking, commodityContracts, includeDiscIds: laneDiscIds
    });
    const laneOptionsEnabled = lane.worklistOptions ? optionsEnabled : false;
    if (lane.worklistOptions && keys.massive && !optionsEnabled) {
      recorder.notes.push("Stocks Options Field is dormant until migration 0013 is applied.");
      return report;
    }
    const items = scheduledWorkItems({
      roster, optionsEnabled: laneOptionsEnabled, keys: lane.worklistKeys, laneId: lane.id
    });
    if (!items.length) return report;

    /* Rotate this lane's own cursor. A lane whose envelope has documented
       headroom may spend more than one unit per tick, but always sequentially:
       each unit advances the durable cursor and completes before the next is
       selected, so the provider's sliding-window gate still sees one ordered
       request at a time and the crash guarantee is unchanged. */
    const instrumentUnitsRemaining = Math.max(0, laneUnitBudget - report.workUnits.length);
    let instrumentUnitsSpent = 0;
    for (let unit = 0; unit < instrumentUnitsRemaining; unit += 1) {
      const next = await advanceFieldWorkCursor(db, items, now, laneCursorReason(lane.id), {
        /* Prerequisite discovery consumes the same lane capacity but is not an
           instrument item; it must not suppress the first bar on a wrap. */
        stopBeforeWrap: instrumentUnitsSpent > 0
      });
      if (next.reset) {
        report.cursorReset = true;
        recorder.notes.push(next.blocked
          ? `The ${lane.id} lane cursor is corrupt and was blocked without replaying the lane. Operator repair is required before regular rotation resumes.`
          : `The ${lane.id} lane cursor key was stale; rotation resumed from its persisted ordinal, avoiding a whole-cycle replay.`);
      }
      if (!next.ok) break;

      const item = next.item;
      /* The cursor position is already durable at this point, so a crash after
         here cannot replay the lane. */
      markSchedulerWorkUnit(summary, item.key, lane.id);
      report.ran = true;
      report.workUnits.push(item.key);
      instrumentUnitsSpent += 1;
      if (report.workUnit === null) report.workUnit = item.key;
      report.cursorAdvanced = true;
      await processScheduledWorkItem({ db, env, item, now, fetcher: laneFetcher, keys, summary: recorder });
      if (item.kind === "tickerbot-daily" && item.instrument.symbol === roster.stocks.at(-1)?.symbol) {
        report.sweepsCompleted += (await completeSweepIfDue(db, now, roster.stocks)) ? 1 : 0;
      }
      /* Nothing further can be sent this minute once the lane's own allowance is
         spent, so stop instead of advancing the cursor over work that would be
         refused. */
      if (laneProviderCalls >= laneCallCeiling) break;
    }
    return report;
  } finally {
    report.providerCalls = laneProviderCalls;
    report.observed = recorder.observed;
    report.held = recorder.held;
    mergeLaneRecorder(summary, recorder);
  }
}

/**
 * One scheduled beat. A durable weighted dispatch cursor selects one provider
 * lane per Cron invocation; each lane retains its own durable instrument cursor.
 * The selected lane may perform its explicit serial batch, while a priority
 * queue row may preempt the selected slot without consuming it. Provider calls
 * never fan out across lanes, and each batch stops at its lane's stable-key wrap.
 */
export async function runOrb2FieldTick(env = {}, context = null, dependencies = {}) {
  const now = nowOf(dependencies);
  const rawDb = env.COMMUNITY_DB;
  const summary = {
    ok: false, schema: ORB2_FIELD_STATUS_SCHEMA, now,
    massiveCalls: 0, twelvedataCalls: 0, alphaVantageCalls: 0, tickerbotCalls: 0, krakenCalls: 0,
    optionsCalls: 0, optionsObserved: 0,
    observed: 0, packetAnalyses: 0, held: 0,
    workUnits: 0, workUnit: null, workUnitsList: [], providerRequests: 0,
    /* Per-lane unit accounting. The caps live in markSchedulerWorkUnit; this map
       is what makes the per-lane cap enforceable while scheduler dispatch is serialized. */
    workUnitsByLane: new Map(), lanes: {},
    d1Reads: 0, d1Writes: 0, d1RowsRead: 0,
    queueClaimed: 0, queueCompleted: 0, warmEnqueued: 0, warmProgressed: 0,
    cursorAdvanced: false, cursorReset: false, sweepsCompleted: 0,
    notes: [], errors: []
  };
  if (!rawDb || typeof rawDb.prepare !== "function") {
    summary.errors.push("Bind COMMUNITY_DB and apply community migrations through 0012 before the server field can run.");
    return summary;
  }
  const providerFetcher = dependencies.fetch || globalThis.fetch;
  if (typeof providerFetcher !== "function") {
    summary.errors.push("No fetch implementation is available in this Worker runtime.");
    return summary;
  }
  const d1 = createSchedulerD1Budget(rawDb);
  const db = d1.db;
  const finalDb = d1.finalDb;
  /* Adapters that reach for `env.COMMUNITY_DB` themselves — notably
     `reserveMassiveProviderCall`, which reads and records the Massive daily
     ledger — would otherwise bypass this tick's D1 budget entirely, because the
     budget only counts statements issued through the wrapped handle. Handing
     downstream work an env whose binding IS the wrapped handle makes the
     enforced budget equal the traffic the tick actually causes. The ledger is
     telemetry rather than a gate, so counting it cannot refuse a legitimate
     call; it just stops hiding three reads and three writes per Massive lane. */
  const scopedEnv = { ...env, COMMUNITY_DB: db };
  let providerFetchCount = 0;
  const fetcher = async (...args) => {
    if (providerFetchCount >= ORB2_FIELD_SCHEDULER_MAX_PROVIDER_CALLS_PER_TICK) {
      throw new Error(`Orb 2 scheduled provider request budget exceeded (${providerFetchCount}/${ORB2_FIELD_SCHEDULER_MAX_PROVIDER_CALLS_PER_TICK}).`);
    }
    providerFetchCount += 1;
    return providerFetcher(...args);
  };
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
    if (!keys.tickerbot) summary.notes.push("Stocks are held: add TICKERBOT_API_KEY. Massive is not used for Disc1.");
    if (!keys.massive && !keys.twelvedata) summary.notes.push("Massive/Twelve Data FX/futures/index/Options lanes are held: add MASSIVE_API_KEY or TWELVEDATA_API_KEY. Stocks remain Tickerbot-only; Kraken remains the crypto venue.");
    else if (keys.twelvedata) summary.notes.push("Twelve Data private (800/day 8/min delayed, personal/internal) is the daily FX/futures/index venue; Massive is dormant when TWELVEDATA_API_KEY is set.");
    /* READ LANE: the control row and the Options table probe are independent
       single-row reads, so they are issued together rather than back to back. */
    const [control, optionsEnabled] = await readIndependently([
      () => readControl(db),
      () => (keys.massive ? optionsFieldTableAvailable(db) : Promise.resolve(false))
    ]);

    /* SEQUENTIAL, and deliberately so: user-priority queue work and the one-time
       cold calibration are both Tickerbot work, so they contend for the same
       provider envelope and are resolved one after the other before the lanes
       fan out. Whichever runs spends the tickerbot-stocks lane's unit for this
       minute; it no longer suppresses the other lanes, which draw from Kraken
       and Massive allowances the warm-up does not touch.

       Scheduler cursor rows share the queue table but are excluded by the lane
       predicate, so per-lane cursors can never be mistaken for queued jobs. */
    /* SINGLE LANE: one scheduled minute selects one provider lane and permits
       one work unit total. Priority queue work preempts a lane without advancing
       the durable dispatch pointer, so the selected regular slot resumes after
       the queue drains. */
    const liveCatalog = globalThis.CharactersDiscCatalog || REVIEWED_SCHEDULER_CATALOG;
    const catalogCount = (list, fallback) => Array.isArray(list)
      ? list.filter(entry => entry && SYMBOL_PATTERN.test(String(entry.symbol || ""))).length
      : fallback;
    const fxCount = catalogCount(liveCatalog.fxCurrencies, SCHEDULER_FX_ROSTER_SIZE);
    const futuresList = liveCatalog.futures || liveCatalog.commodities;
    const futuresCount = catalogCount(Array.isArray(futuresList) ? futuresList.slice(0, 11) : futuresList,
      SCHEDULER_FUTURES_ROSTER_SIZE);
    /* Use the current catalog length, not a module-import snapshot. The public
       Disc catalog may be refined independently, and the dispatch cycle must
       match the worklist the lane actually builds on this invocation. */
    const indexCount = catalogCount(liveCatalog.indices, SCHEDULER_INDEX_ROSTER_SIZE);
    const activeLaneSizes = [
      { id: "tickerbot-stocks", count: keys.tickerbot ? TICKERBOT_WATCHLIST.length : 0 },
      { id: "kraken-crypto", count: CHARACTERS_CRYPTO_RANKING_SIZE + CHARACTERS_CRYPTO_CROSS_PAIR_SIZE },
      { id: "massive-fx", count: keys.massive || keys.twelvedata ? fxCount : 0 },
      { id: "massive-futures", count: keys.massive || keys.twelvedata ? futuresCount : 0 },
      { id: "massive-indices", count: keys.massive || keys.twelvedata ? indexCount : 0 },
      { id: "massive-options", count: optionsEnabled && keys.massive
        ? TICKERBOT_WATCHLIST.length * (MASSIVE_OPTIONS_SELECTION_SIZE + 1) : 0 }
    ].filter(entry => entry.count > 0);
    /* The dispatch weight is the number of Cron turns a lane needs for one pass,
       not its raw number of instruments. Use smooth weighted round-robin so
       five stock batches are spread over a cycle instead of running as one block. */
    const laneWeights = activeLaneSizes.map(entry => ({
      id: entry.id,
      count: Math.ceil(entry.count / laneWorkUnits(laneById(entry.id)))
    })).filter(entry => entry.count > 0);
    const scheduleLength = laneWeights.reduce((total, entry) => total + entry.count, 0);
    const dispatchCursor = await readSchedulerDispatchCursor(db);
    if (!dispatchCursor.ok) {
      summary.notes.push("The durable scheduler dispatch cursor is corrupt and was blocked; regular rotation did not guess a new position.");
    }
    /* Construct a small bounded schedule of lane turns (91 turns without
       Options, 156 with it), rather than expanding every instrument into an
       array on each tick. The algorithm distributes each lane's turns smoothly. */
    const dispatchSchedule = [];
    const laneCurrentWeights = laneWeights.map(() => 0);
    for (let turn = 0; turn < scheduleLength; turn += 1) {
      let chosen = -1;
      for (let index = 0; index < laneWeights.length; index += 1) {
        laneCurrentWeights[index] += laneWeights[index].count;
        if (chosen < 0 || laneCurrentWeights[index] > laneCurrentWeights[chosen]) chosen = index;
      }
      if (chosen < 0) break;
      laneCurrentWeights[chosen] -= scheduleLength;
      dispatchSchedule.push(ORB2_FIELD_PROVIDER_LANES.find(lane => lane.id === laneWeights[chosen].id) || null);
    }
    /* Start cold boots with Tickerbot's known 12-beat lane, then preserve the
       smooth distribution for the remaining turns in the cycle. */
    const stockStart = dispatchSchedule.findIndex(lane => lane?.id === "tickerbot-stocks");
    if (stockStart > 0) {
      const prefix = dispatchSchedule.splice(0, stockStart);
      dispatchSchedule.push(...prefix);
    }
    const selectedLane = dispatchCursor.ok && dispatchSchedule.length
      ? dispatchSchedule[dispatchCursor.attempts % dispatchSchedule.length] || null
      : null;
    let tickerbotLaneSpent = false;
    let tickerbotPreemptionUnit = null;
    const tickerbotPreemptionUnits = [];
    if (keys.tickerbot) {
      const queued = await claimQueue(db, now, ORB2_FIELD_TICKERBOT_BURST_PER_TICK);
      if (queued.length) {
        const job = queued[0];
        tickerbotPreemptionUnit = markSchedulerWorkUnit(summary, `queue:${job.interval}:${job.symbol}`, "tickerbot-stocks");
        tickerbotPreemptionUnits.push(tickerbotPreemptionUnit);
        summary.queueClaimed = 1;
        const callsBefore = summary.tickerbotCalls;
        const queuedOutcome = await processQueuedTickerbotJob({ db, env: scopedEnv, job, now, fetcher, keys, summary });
        if (!queuedOutcome?.ok) await deferQueueRow(db, job.id, now);
        summary.lanes["tickerbot-stocks"] = {
          ran: false, skipped: true, workUnit: tickerbotPreemptionUnit,
          workUnits: [tickerbotPreemptionUnit], providerCalls: summary.tickerbotCalls - callsBefore,
          unitBudget: laneWorkUnits(laneById("tickerbot-stocks")), callCeiling: laneCallCeilingFor(laneById("tickerbot-stocks")), maxProviderCallsPerUnit: 1,
          observed: 0, held: 0, cursorAdvanced: queuedOutcome?.attempted === true, cursorReset: false
        };
        tickerbotLaneSpent = true;
      }
    } else if (await hasPendingQueue(db, now)) {
      summary.notes.push("Queued Tickerbot stock work is waiting for TICKERBOT_API_KEY; it was not claimed or charged.");
    }

    /* Cold calibration shares the Tickerbot slot and follows the same serial
       12-unit ceiling as regular stock rotation. Persist each cursor step before
       its request; if a preflight refuses a unit, restore only that unit and
       release the global dispatch slot so unrelated lanes keep progressing. */
    if (!tickerbotLaneSpent && selectedLane?.id === "tickerbot-stocks") {
      const warm = await loadAutoWarmState(db, control, now, summary);
      if (warm.reset) summary.cursorReset = true;
      if (warm.active && keys.tickerbot) {
        let progress = warm.progress;
        let progressed = 0;
        const warmUnits = [];
        const callsBefore = summary.tickerbotCalls;
        for (let unit = 0; unit < laneWorkUnits(laneById("tickerbot-stocks")) &&
          progress < ORB2_FIELD_TICKERBOT_BURST_CALLS; unit += 1) {
          const job = autoWarmJob(progress);
          if (!job) break;
          const key = `warm:${job.interval}:${job.instrument.symbol}`.slice(0, 96);
          await writeAutoWarmProgress(db, progress + 1, now);
          markSchedulerWorkUnit(summary, key, "tickerbot-stocks");
          warmUnits.push(key);
          const outcome = await processTickerbotUnit({
            db, env: scopedEnv, instrument: job.instrument, interval: job.interval, reason: job.reason,
            now, fetcher, keys, summary
          });
          if (!outcome.attempted) {
            await writeAutoWarmProgress(db, progress, now);
            break;
          }
          progress += 1;
          progressed += 1;
        }
        summary.cursorAdvanced = progressed > 0;
        summary.warmProgressed = progressed;
        tickerbotPreemptionUnits.push(...warmUnits);
        tickerbotPreemptionUnit = warmUnits[0] || null;
        summary.lanes["tickerbot-stocks"] = {
          ran: false, skipped: true, workUnit: tickerbotPreemptionUnit,
          workUnits: warmUnits, providerCalls: summary.tickerbotCalls - callsBefore,
          unitBudget: laneWorkUnits(laneById("tickerbot-stocks")),
          callCeiling: laneCallCeilingFor(laneById("tickerbot-stocks")), maxProviderCallsPerUnit: 1,
          observed: summary.observed, held: summary.held,
          cursorAdvanced: progressed > 0, cursorReset: false
        };
        /* Even a preflight refusal must not let a cold stock lane pin the
           dispatcher forever. Warm progress remains unchanged, but other lanes
           get their weighted turn before this item is retried. */
        if (dispatchCursor.ok) await writeSchedulerDispatchCursor(db, dispatchCursor.attempts + 1, now);
        tickerbotLaneSpent = true;
      } else if (warm.active && !keys.tickerbot) {
        summary.notes.push(`${ORB2_FIELD_TICKERBOT_BURST_CALLS - warm.progress} automatic Tickerbot warm units remain durable until TICKERBOT_API_KEY is available.`);
      }
    }

    const laneReports = tickerbotLaneSpent || !selectedLane ? [] : await settleWithConcurrency(
      [selectedLane],
      1,
      lane => runProviderLane({
        lane, db, env: scopedEnv, now, fetcher, keys, summary, optionsEnabled
      })
    );
    /* Commit the dispatch position after the lane attempt. Its own instrument
       cursor is already durable before any provider fetch, so a process failure
       cannot replay that item even if this final pointer write does not land. */
    const keepDispatchSlot = laneReports.some(settled =>
      settled.ok && settled.value?.keepDispatchSlot === true
    );
    if (!tickerbotLaneSpent && selectedLane && dispatchCursor.ok && !keepDispatchSlot) {
      await writeSchedulerDispatchCursor(db, dispatchCursor.attempts + 1, now);
    } else if (keepDispatchSlot) {
      summary.notes.push("Successful provider discovery used this unit; the same lane retains its dispatch slot for the first instrument bar on the next Cron tick.");
    }
    /* `settleWithConcurrency` preserves input order, so these reports arrive in
       declared lane order regardless of which lane resolved first. */
    for (const settled of laneReports) {
      if (!settled.ok) {
        summary.errors.push(`A provider lane failed and was contained: ${text(settled.error && settled.error.message, 140) || "unknown error"}`);
        continue;
      }
      const report = settled.value;
      summary.lanes[report.lane] = {
        ran: report.ran, skipped: report.skipped, workUnit: report.workUnit,
        workUnits: report.workUnits,
        observed: report.observed, held: report.held,
        /* Per-lane provider spend against that lane's own ceiling, so the
           envelope guarantee is observable per allowance rather than only as a
           whole-tick total. */
        providerCalls: report.providerCalls,
        unitBudget: report.unitBudget, callCeiling: report.callCeiling,
        maxProviderCallsPerUnit: laneById(report.lane)?.maxProviderCallsPerUnit ?? null,
        cursorAdvanced: report.cursorAdvanced, cursorReset: report.cursorReset
      };
      if (report.ran) {
        summary.cursorAdvanced = summary.cursorAdvanced || report.cursorAdvanced;
        summary.sweepsCompleted += report.sweepsCompleted;
      }
      if (report.cursorReset) summary.cursorReset = true;
    }
    /* Assemble the spent-unit list in declared lane order, never in resolution
       order, so `workUnit` and `workUnitsList` are deterministic and the same
       tick always reports the same thing. The tickerbot-stocks slot is the
       queue/warm preemption when that ran, because preemption is what spent
       that lane's unit. */
    for (const lane of ORB2_FIELD_PROVIDER_LANES) {
      const entry = summary.lanes[lane.id];
      if (lane.id === "tickerbot-stocks" && tickerbotPreemptionUnits.length) {
        summary.workUnitsList.push(...tickerbotPreemptionUnits);
        continue;
      }
      if (entry && entry.workUnits) summary.workUnitsList.push(...entry.workUnits);
    }
    summary.workUnit = summary.workUnitsList.length ? summary.workUnitsList[0] : null;

    await recordTickResult(finalDb, {
      now, massiveCalls: summary.massiveCalls + summary.twelvedataCalls, alphaVantageCalls: summary.alphaVantageCalls,
      tickerbotCalls: summary.tickerbotCalls, krakenCalls: summary.krakenCalls,
      observed: summary.observed, error: summary.errors.length ? summary.errors[0] : ""
    });
    summary.ok = true;
  } catch (error) {
    summary.errors.push(`The field tick failed: ${text(error && error.message, 160) || "unknown error"}`);
    try {
      await recordTickResult(finalDb, {
        now, massiveCalls: summary.massiveCalls + summary.twelvedataCalls, alphaVantageCalls: summary.alphaVantageCalls,
        tickerbotCalls: summary.tickerbotCalls, krakenCalls: summary.krakenCalls,
        observed: summary.observed, error: summary.errors[0]
      });
    } catch { /* bookkeeping must never mask the tick result */ }
  } finally {
    if (leased) await releaseTickLease(finalDb, now, owner).catch(() => {});
    summary.providerRequests = providerFetchCount;
    summary.d1Reads = d1.stats.reads;
    summary.d1Writes = d1.stats.writes;
    summary.d1RowsRead = d1.stats.rowsRead;
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
  /* READ LANE: batches cover disjoint symbols and are independent, so they are
     issued together under the read-concurrency bound. Results are concatenated
     in batch order, keeping the freshness filter and rotation selection below
     identical to the sequential form. */
  const batchResults = await readIndependently(batches.map(batch => () => {
    const placeholders = batch.map(() => "?").join(",");
    return db.prepare(`SELECT substr(payload, 1, 65536) AS payload, symbol, disc_id, provider, status, observed_at
      FROM orb2_field_observations WHERE interval = '1d' AND symbol IN (${placeholders})
      LIMIT ?`).bind(...batch.map(instrument => instrument.symbol), batch.length).all();
  }));
  const rows = [];
  for (const result of batchResults) rows.push(...(Array.isArray(result && result.results) ? result.results : []));
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

/* ── the snapshot clients render ──────────────────────────────────────── */

function parsePacketRow(row, now) {
  try {
    const parsed = sanitizeOrb2FieldObservation(JSON.parse(row.payload), now);
    return parsed.ok ? parsed.observation : null;
  } catch { return null; }
}

function parseOptionsRow(row, now) {
  if (!row || typeof row !== "object") return null;
  const symbol = text(row.symbol, 32).toUpperCase();
  if (!SYMBOL_PATTERN.test(symbol)) return null;
  const underlyingPrice = Number(row.underlying_price);
  if (!Number.isFinite(underlyingPrice) || underlyingPrice <= 0) return null;
  try {
    const selection = JSON.parse(row.selection_json);
    const bars = JSON.parse(row.bars_json);
    if (!Array.isArray(selection) || !Array.isArray(bars)) return null;
    const safeSelection = selection.slice(0, MASSIVE_OPTIONS_SELECTION_SIZE).filter(item =>
      item && typeof item.ticker === "string" &&
      ["call", "put"].includes(String(item.contractType || "").toLowerCase()) &&
      Number.isFinite(Number(item.strikePrice)) &&
      optionStrikeWithinLogBound(Number(item.strikePrice), underlyingPrice, MASSIVE_OPTIONS_MAX_LOG_STRIKE_DISTANCE)
    ).map(item => ({
      ticker: text(item.ticker, 32).toUpperCase(),
      contractType: String(item.contractType).toLowerCase(),
      expirationDate: text(item.expirationDate, 10),
      strikePrice: Number(item.strikePrice),
      logStrikeDistance: Number(item.logStrikeDistance)
    }));
    const safeBars = bars.slice(0, MASSIVE_OPTIONS_SELECTION_SIZE).filter(item =>
      item && typeof item.ticker === "string" && item.bar && item.bar.confirmed === true
    ).map(item => ({
      ticker: text(item.ticker, 32).toUpperCase(),
      contractType: String(item.contractType || "").toLowerCase(),
      expirationDate: text(item.expirationDate, 10),
      strikePrice: Number(item.strikePrice),
      logStrikeDistance: Number(item.logStrikeDistance),
      bar: {
        time: Number(item.bar.time),
        open: Number(item.bar.open),
        high: Number(item.bar.high),
        low: Number(item.bar.low),
        close: Number(item.bar.close),
        ...(Number.isFinite(Number(item.bar.volume)) ? { volume: Number(item.bar.volume) } : {}),
        confirmed: true
      },
      observedAt: Number(item.observedAt) || 0
    })).filter(item => [item.strikePrice, item.logStrikeDistance, item.bar.time, item.bar.open, item.bar.high, item.bar.low, item.bar.close].every(Number.isFinite));
    return {
      provider: MASSIVE_OPTIONS_PROVIDER,
      status: text(row.status, 16) || "partial",
      underlyingPrice,
      selection: safeSelection,
      bars: safeBars,
      observedAt: Number(row.observed_at) || 0,
      freshness: orb2FieldFreshness("1d", Number(row.observed_at) || 0, now)
    };
  } catch { return null; }
}

/** D1 queries are limited to 100 bound variables. Split large symbol filters
 * into conservative batches, then restore the global newest-first limit after
 * merging. This is still a read of the unchanged stored field. */
async function readOrb2FieldRows(db, { interval, disc = null, symbols = [], limit = null, includePayload = true }) {
  const uniqueSymbols = Array.isArray(symbols) ? [...new Set(symbols)] : [];
  const symbolBatches = uniqueSymbols.length
    ? Array.from({ length: Math.ceil(uniqueSymbols.length / ORB2_FIELD_SQL_SYMBOL_BATCH_SIZE) }, (_, index) =>
      uniqueSymbols.slice(index * ORB2_FIELD_SQL_SYMBOL_BATCH_SIZE, (index + 1) * ORB2_FIELD_SQL_SYMBOL_BATCH_SIZE))
    : [null];
  /* READ LANE: each symbol batch is an independent SELECT over disjoint
     symbols — the split exists only to stay under D1's bind-variable ceiling.
     They are issued together under the read-concurrency bound rather than one
     round trip at a time, and results are concatenated in batch order so the
     merge, sort, and slice below are unchanged. Errors surface in batch order
     too, exactly as the sequential loop did. */
  const reads = symbolBatches.map(symbolBatch => () => {
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
    return db.prepare(query).bind(...bindings).all();
  });
  const results = await readIndependently(reads);
  const rows = [];
  for (const result of results) rows.push(...(Array.isArray(result && result.results) ? result.results : []));
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
    /* READ LANE: these nine D1 reads are mutually independent. Each touches a
       different table (runs, ranking cache, futures cache, control, the three
       provider ledgers, queue depth) and the Dollar Strength (DS) inputs are
       already in hand from the payload read above, so none of them waits on
       another's result. They are issued together under
       ORB2_FIELD_D1_READ_CONCURRENCY instead of one at a time.

       An earlier revision kept these sequential on the theory that concurrent
       reads raise peak Worker CPU pressure. They do not: CPU time in a Worker
       excludes I/O wait, so overlapping round trips lowers wall-clock latency
       while parsing the same rows — and these are single-row status reads, so
       the extra in-flight buffers are negligible. The genuine concern is an
       unbounded fan-out, which is why the concurrency is capped rather than
       removed. This is a read-only poll, so nothing here mutates scheduler
       state or spends a provider allowance. */
    const [run, cachedCryptoRanking, cachedFutures, control, massiveLedger,
      tickerbotLedger, krakenLedger, queue, ds] = await readIndependently([
      () => readRun(db, now),
      () => readCharactersCryptoRankingCache({ db, now }),
      () => readMassiveFuturesContractState({ db, now }),
      () => readControl(db),
      () => readMassiveDailyCallLedger(db, now, MASSIVE_PROVIDER_DAILY_LIMIT),
      () => readTickerbotCallLedger(db, now),
      () => readKrakenCallLedger(db, now),
      () => queueDepth(db, now),
      /* Focused reads intentionally fetch status columns without payloads.
         Re-read the six stored FX components for DS rather than passing
         payload-less diagnostics to the benchmark evaluator. */
      () => evaluateDollarStrength(
        db,
        now,
        interval === "1d" && storedRowsRead && !hasResponseFilter ? fieldObservations : null
      )
    ]);
    /* Per-Disc status for the constellation view: one row per reviewed Disc.
       Stored totals are matched against the current reviewed symbols before being
       reported. Old/orphaned rows can remain in D1, but they cannot produce
       impossible labels such as 12 stored of 11 reviewed instruments. The matched
       totals and per-member readiness come from the full stored field even when
       the response is narrowed to one Disc or a symbol list. Only fresh market
       observations count as active; held, stale, and contract-pending rows remain
       distinguishable. A Disc with no matching row reports zero and newestAt null. */
    // When Twelve Data is the venue, bypass Massive's contract table (which stays empty without a Massive key) and synthesize.
    let statusCommodityContracts = cachedFutures.ok ? cachedFutures.contracts : null;
    if (typeof env.TWELVEDATA_API_KEY === "string" && env.TWELVEDATA_API_KEY.trim()) {
      if (!cachedFutures.ok || !statusCommodityContracts || !Object.keys(statusCommodityContracts).length) {
        const cat = globalThis.CharactersDiscCatalog;
        const list = cat && Array.isArray(cat.futures || cat.commodities) ? (cat.futures || cat.commodities) : [];
        const today = new Date(now).toISOString().slice(0, 10);
        statusCommodityContracts = {};
        for (const entry of list) {
          const pc = String(entry && entry.massive && entry.massive.productCode || "").toUpperCase();
          if (!/^[A-Z0-9]{1,8}$/.test(pc)) continue;
          statusCommodityContracts[pc] = { productCode: pc, ticker: pc, provider: "TwelveData", asOfDate: today, lastTradeDate: today };
        }
      }
    }
    const rosterForStatus = orb2FieldRoster({
      now,
      cryptoRanking: cachedCryptoRanking.ok ? cachedCryptoRanking.ranking : null,
      commodityContracts: statusCommodityContracts
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
        const pendingVenue = typeof env.TWELVEDATA_API_KEY === "string" && env.TWELVEDATA_API_KEY.trim() ? "twelvedata" : "massive";
        return {
          symbol,
          displaySymbol: text(instrument.displaySymbol, 48) || symbol,
          status: memberStatus,
          provider: observation?.provider || (discId === "crypto" ? "kraken" : discId === "stocks" ? "tickerbot" : pendingVenue),
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
    const twelvedataLedger = await (async () => {
      try { return await loadTwelveDataDailyCallLedger(env.COMMUNITY_DB); } catch { return { records: [] }; }
    })();
    const twelvedataCallsToday = Array.isArray(twelvedataLedger.records)
      ? twelvedataLedger.records.filter(r => r && r.day === new Date(now).toISOString().slice(0, 10)).reduce((s, r) => s + (Number(r.count) || 0), 0)
      : 0;
    const hasTwelveKey = typeof env.TWELVEDATA_API_KEY === "string" && env.TWELVEDATA_API_KEY.trim().length > 0;
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
        note: hasTwelveKey
          ? "Massive Basic (dormant): TWELVEDATA_API_KEY is set, so FX/futures/indices use Twelve Data (800/day 8/min delayed, personal/internal free). Remove the Twelve Data key to re-enable Massive."
          : "Massive Basic: five requests per minute per asset class; the former 300/day application guard is no longer a provider gate."
      },
      twelvedata: {
        enabled: hasTwelveKey,
        callsToday: twelvedataCallsToday,
        perMinute: 8,
        dailyLimit: 800,
        remainingToday: hasTwelveKey ? Math.max(0, 800 - twelvedataCallsToday) : null,
        exhausted: hasTwelveKey ? twelvedataCallsToday >= 800 : null,
        ledger: hasTwelveKey ? "kv-800-day" : "not-configured",
        note: hasTwelveKey
          ? "Twelve Data free (private internal use): 800/day, 8/min global, delayed 1-15min, no commercial display. Configure TWELVEDATA_API_KEY; keep COMMUNITY_ENABLED=false for personal/internal qualification."
          : "Add TWELVEDATA_API_KEY to use Twelve Data free (private sole-use). Massive remains the fallback."
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
        cache: hasTwelveKey ? "twelvedata-bypass" : (cachedFutures.ok ? "ready" : "unavailable"),
        asOfDate: new Date(now).toISOString().slice(0, 10),
        reviewedProducts: Array.isArray(catalogForStatus && catalogForStatus.commodities) ? catalogForStatus.commodities.length : 0,
        activeContracts: hasTwelveKey
          ? (statusCommodityContracts ? Object.keys(statusCommodityContracts).length : 0)
          : (cachedFutures.ok ? Object.keys(cachedFutures.contracts).length : 0),
        staleFallback: false,
        note: hasTwelveKey
          ? "Twelve Data private: Disc4 uses Twelve Data symbols directly (productCode → symbol); Massive active-contract table is bypassed."
          : (cachedFutures.ok
            ? "Only Massive-verified active single contracts for the current UTC date enter Disc4."
            : "Apply D1 migration 0011_massive_futures_contract_cache.sql; Disc4 contracts remain held.")
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
    value: Number.isFinite(Number(result.value)) ? Number(result.value) : null,
    baseline: Number.isFinite(Number(result.baseline)) ? Number(result.baseline) : 100,
    percentVs100: Number.isFinite(Number(result.percentVs100)) ? Number(result.percentVs100) : null,
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
    const alreadyRunning = summary.status === "already-running";
    return json({
      success: summary.ok || alreadyRunning,
      environment: "orb2-server-field",
      data: {
        schema: ORB2_FIELD_REQUEST_SCHEMA, action: "tick", interval, queue,
        status: summary.status || (summary.ok ? "completed" : "failed"),
        summary: {
          massiveCalls: summary.massiveCalls, alphaVantageCalls: summary.alphaVantageCalls, tickerbotCalls: summary.tickerbotCalls, krakenCalls: summary.krakenCalls,
          optionsCalls: summary.optionsCalls, optionsObserved: summary.optionsObserved,
          observed: summary.observed, held: summary.held, queueClaimed: summary.queueClaimed,
          queueCompleted: summary.queueCompleted, warmEnqueued: summary.warmEnqueued,
          sweepsCompleted: summary.sweepsCompleted
        },
        notes: summary.notes, marketRequestSent: summary.massiveCalls + summary.tickerbotCalls + summary.krakenCalls + summary.optionsCalls > 0
      }
    }, alreadyRunning ? 202 : summary.ok ? 200 : 503);
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
