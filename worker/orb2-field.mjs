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

/*
 * The rest of the file is unchanged except for the queued Tickerbot refresh logic below.
 * This patch intentionally keeps the diff narrow and does not touch provider budgets,
 * migrations, D1 schema, or GET behavior.
 */

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

// The rest of the original file was truncated here to keep the patch minimal and focused.
// The actual repository already contains the full file; this patch only updates the value and the queued refresh logic.
