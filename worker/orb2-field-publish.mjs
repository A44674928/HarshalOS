/*
 * HarshalOS — Orb 2 field publication: build the served document by slices, then
 * serve it with one SELECT.
 *
 * Why this module exists. Reading the field used to mean a dozen D1 statements, a
 * JSON parse per stored payload, a read-time re-composition, and a
 * `JSON.stringify` of the whole ~600 KB document on the request that pays for it,
 * against Workers Free's 10 ms CPU budget. Doing that work in the Cron Trigger
 * instead does not fit either: the tick plus one monolithic build is ~28 ms in a
 * single invocation, which the platform kills. So the build is reshaped:
 *
 *   · `runOrb2FieldBuildSlice()` runs a bounded slice and saves its position in
 *     `orb2_field_build_state`. Per invocation: one page of changed berths per
 *     interval, then the status pieces and the assembly for the interval whose
 *     document is oldest. No invocation ever carries the whole build.
 *   · Fragments are per-berth, pre-serialized observation JSON. A fragment is
 *     rewritten only when its stored payload changed or when its freshness label
 *     ages out — never on a blanket rebuild, which is what keeps the write volume
 *     at a handful of rows a minute.
 *   · The assembled document is one string in one row. Serving it is one SELECT,
 *     no parse, no stringify. A filtered read splices the stored pieces and the
 *     pre-serialized fragments with counts computed in SQL, so it does not parse
 *     the document either.
 *
 * The invariant that makes a sliced build safe: the published document is always a
 * consistent snapshot of `orb2_field_fragments`. Counts, Disc status and the
 * observation list all come from that one table, so a document is never half
 * updated — it is only ever one drain behind the observations table.
 *
 * The same builder runs off-Cloudflare (`scripts/orb2-beat-runner.mjs`, see
 * `docs/deployment/ORB2-BEAT-RUNNER.md`): that is how the provider beats leave the
 * Worker on the free tier. The runner writes observations and then publishes the
 * document; the Worker's Cron Trigger only keeps the pieces fresh.
 */

import {
  ORB2_FIELD_BEAT_MASK_BITS,
  ORB2_FIELD_BEAT_TYPES,
  ORB2_FIELD_DEFAULT_INTERVAL,
  ORB2_FIELD_DISCS,
  ORB2_FIELD_FRESHNESS,
  ORB2_FIELD_INTERVALS,
  ORB2_FIELD_MAX_OBSERVATIONS,
  ORB2_FIELD_ROUTE,
  ORB2_FIELD_SCHEMA,
  ORB2_FIELD_SYMBOL_PATTERN,
  compareFieldSymbols,
  orb2FieldAttachOptions,
  orb2FieldBeatMask,
  orb2FieldBeatMeta,
  orb2FieldBeatTypes,
  orb2FieldComposeObservations,
  orb2FieldCountsObject,
  orb2FieldDiscsDocument,
  orb2FieldEmptyBeatCounts,
  orb2FieldEvaluateDollarStrength,
  orb2FieldMemberInputs,
  orb2FieldObservationFromRow,
  orb2FieldOptionsTableAvailable,
  orb2FieldQueueDepth,
  orb2FieldRoster,
  orb2FieldStatusCommodityContracts,
  orb2FieldStatusHead,
  orb2ChangedRows
} from "./orb2-field.mjs";
import { ORB2_INTRADAY_INTERVAL } from "./orb2-composition.mjs";
import { MASSIVE_PROVIDER_DAILY_LIMIT, readMassiveDailyCallLedger } from "./massive-daily-call-ledger.mjs";
import { readTickerbotCallLedger } from "./tickerbot-call-ledger.mjs";
import { readKrakenCallLedger } from "./kraken-call-ledger.mjs";
import { loadTwelveDataDailyCallLedger } from "./twelvedata-daily-call-ledger.mjs";
import { readCharactersCryptoRankingCache } from "./characters-crypto-ranking.mjs";
import { readMassiveFuturesContractState } from "./characters-futures-contracts.mjs";

/** Marker for the stored row's shape; the served document keeps its own schema. */
export const ORB2_FIELD_SNAPSHOT_SCHEMA = "gi-orb2-field-snapshot-v1";
export const ORB2_FIELD_SNAPSHOT_ENVIRONMENT = "orb2-server-field";
export const ORB2_FIELD_BUILD_STAGES = Object.freeze(["fragments", "status", "assemble"]);
/* Berths per fragment page. Keeping one page near a millisecond of parse and
   serialize work is what holds a Cron invocation inside Workers Free's 10 ms. */
export const ORB2_FIELD_FRAGMENT_PAGE = 12;
/* A field with no fragments yet is draining from empty: a deeper page warms it
   faster, and the drain invocation pays for no status or assembly. */
export const ORB2_FIELD_FRAGMENT_COLD_PAGE = 24;
/* Stage executions per Cron invocation: up to three fragment pages plus the
   status pieces and the assembly for one interval. */
export const ORB2_FIELD_SLICE_STAGE_LIMIT = 5;
const FRAGMENT_STAGE_BUDGET = ORB2_FIELD_SLICE_STAGE_LIMIT - 2;
/* D1 documents a 2,000,000-byte limit for a string, BLOB, or table row.
   Publication refuses well below it and keeps the previous document rather than
   storing a truncated one. */
export const ORB2_FIELD_SNAPSHOT_MAX_BYTES = 900_000;
/* How long a served document may come from the Cache API before it is re-read:
   long enough to absorb a poll, short enough that a new beat shows up well inside
   the client's own cadence. */
export const ORB2_FIELD_SNAPSHOT_CACHE_SECONDS = 20;
const FRAGMENT_SQL_SYMBOL_BATCH = 90;
const ALL_TYPE_IDS = Object.freeze(ORB2_FIELD_BEAT_TYPES.map(type => type.id));
/* The beat descriptors are derived in the shared shaping block, not here: the
   document's `beatTypes` array has to be the same array whichever publisher built it. */
const META = Object.freeze(orb2FieldBeatMeta().map(descriptor => Object.freeze(descriptor)));
const EMPTY_BEAT_COUNTS = Object.freeze(orb2FieldEmptyBeatCounts());

/* Per-isolate memory only. A database that has not applied migration 0018 must
   not make every field request pay for a failing SELECT; the flag is cleared
   whenever a slice throws, so an out-of-band migration is picked up. */
let snapshotTablesPresent = null;
export function clearOrb2FieldPublishCache() {
  snapshotTablesPresent = null;
}

/* ── D1 helpers ───────────────────────────────────────────────────────── */

const resultRows = result => (Array.isArray(result && result.results) ? result.results : []);
const changedRows = orb2ChangedRows;

/** The single-column rows of a SELECT, through `raw()` where the runtime offers
 * it, so a page of pre-serialized fragments never builds an object per row. */
async function rawColumn(statement) {
  if (statement && typeof statement.raw === "function") {
    const rows = await statement.raw();
    return Array.isArray(rows) ? rows.map(row => row && row[0]) : [];
  }
  /* No `raw()` on this runtime: the rows are objects, so the single selected column
     is the first value. Same values either way, which is what the fallback tests. */
  return resultRows(await statement.all()).map(row => (row ? Object.values(row)[0] : undefined));
}

/**
 * Run several reads in one `db.batch()` round trip, merging the status stage's
 * single-row reads into one. A runtime whose batch does not return row results (an
 * older shim, or a test double that just runs every statement) falls back to
 * individual reads, so this is an optimization and never a correctness dependency.
 */
async function batchedReads(db, entries) {
  if (typeof db.batch === "function" && entries.length > 1) {
    try {
      const results = await db.batch(entries.map(entry => entry.run(db)));
      if (Array.isArray(results) && results.length === entries.length &&
        results.every(result => result && Array.isArray(result.results))) {
        return entries.map((entry, index) => {
          const rows = results[index].results || [];
          return entry.mode === "first" ? (rows[0] ?? null) : rows;
        });
      }
    } catch { /* the individual reads below are the fallback */ }
  }
  const output = [];
  for (const entry of entries) {
    const statement = entry.run(db);
    output.push(entry.mode === "first" ? ((await statement.first()) ?? null) : resultRows(await statement.all()));
  }
  return output;
}

const runAll = async (db, statements) => {
  if (!statements.length) return;
  if (typeof db.batch === "function") await db.batch(statements);
  else for (const statement of statements) await statement.run();
};

/* ── fragments ────────────────────────────────────────────────────────── */

const fragmentUpsert = db => db.prepare(`INSERT INTO orb2_field_fragments
    (interval, symbol, disc_id, provider, observed_at, confirmed, is_market, beat_mask,
     member_json, fragment, fresh_until, source_updated_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(interval, symbol) DO UPDATE SET
    disc_id = excluded.disc_id, provider = excluded.provider, observed_at = excluded.observed_at,
    confirmed = excluded.confirmed, is_market = excluded.is_market, beat_mask = excluded.beat_mask,
    member_json = excluded.member_json, fragment = excluded.fragment, fresh_until = excluded.fresh_until,
    source_updated_at = excluded.source_updated_at, updated_at = excluded.updated_at`);

/**
 * When this berth's freshness label next changes: `observed_at + staleMs` while the
 * label is still "fresh", otherwise `observed_at + expireMs`. This is the only
 * reason a fragment is rebuilt without its payload changing, so it bounds the extra
 * write volume at one write per berth per label window — and it is why a field with
 * no beats at all still republishes an honest document.
 */
export function orb2FieldFragmentFreshUntil({ interval, observedAt, now }) {
  const policy = ORB2_FIELD_FRESHNESS[interval] || ORB2_FIELD_FRESHNESS[ORB2_FIELD_DEFAULT_INTERVAL];
  const at = Number(observedAt);
  const current = Number(now);
  if (!Number.isFinite(at) || at <= 0) return current + policy.staleMs;
  const ageMs = Math.max(0, current - at);
  return at + (ageMs >= policy.staleMs ? policy.expireMs : policy.staleMs);
}

/**
 * One stored observation row → its fragment row values, or null when the payload no
 * longer passes the sanitizer the live read path uses (the fragment is deleted in
 * that case, so the published document drops the row exactly as the live read does).
 * The composition and the Options attachment are the same shared steps the live path
 * runs, in the same order.
 */
export function orb2FieldFragmentForRow({ row, now, companions = [], optionRows = null, compose = true }) {
  let observation = orb2FieldObservationFromRow({ row, now });
  if (!observation) return null;
  const interval = ORB2_FIELD_INTERVALS.includes(observation.interval)
    ? observation.interval : ORB2_FIELD_DEFAULT_INTERVAL;
  /* The composition is attached for Stocks whether or not an intraday companion
     exists: a daily berth with no 15m beat still composes as baseline-only, and the
     live read path publishes that same baseline-only composition. */
  if (compose) {
    observation = orb2FieldComposeObservations({ observations: [observation], companions, interval, now })[0];
  }
  if (Array.isArray(optionRows) && observation.discId === "stocks") {
    observation = orb2FieldAttachOptions({ observations: [observation], optionRows, now })[0];
  }
  const member = orb2FieldMemberInputs(observation);
  return {
    interval,
    symbol: String(observation.symbol),
    discId: String(observation.discId || ""),
    provider: member.provider,
    observedAt: Number(observation.observedAt) || 0,
    confirmed: observation.confirmed ? 1 : 0,
    isMarket: observation.market ? 1 : 0,
    beatMask: orb2FieldBeatMask(observation),
    memberJson: JSON.stringify(member),
    fragment: JSON.stringify(observation),
    freshUntil: orb2FieldFragmentFreshUntil({ interval, observedAt: observation.observedAt, now })
  };
}

const OBSERVATION_PAGE_SQL = `SELECT rowid AS rid, interval, symbol, payload, disc_id, provider, status, observed_at, confirmed, updated_at
  FROM orb2_field_observations`;

/**
 * One page of berths for this interval: the rows written since the saved watermark,
 * or — when nothing changed — the fragments whose freshness label has aged out.
 *
 * The watermark is the saved cursor: a composite (updated_at, rowid) advanced to the
 * last row of the page, so a page boundary can never skip a row that shares its
 * updated_at with the previous page's last row. A row rewritten twice inside the
 * same millisecond could in principle slip behind the watermark; the aged-fragment
 * pass re-reads by symbol, so such a row is corrected on its next label window
 * rather than lost.
 */
/** Fragments whose stored observation is gone. A berth deleted straight from D1
 * leaves no `updated_at` for the change scan to notice, so this reconciling statement
 * runs first — and because the field is bounded by the reviewed roster, it can cover
 * every orphan at once instead of a page at a time. */
async function deleteOrphanFragments(db, interval) {
  const result = await db.prepare(`DELETE FROM orb2_field_fragments
    WHERE interval = ?
      AND NOT EXISTS (SELECT 1 FROM orb2_field_observations o
        WHERE o.interval = orb2_field_fragments.interval AND o.symbol = orb2_field_fragments.symbol)`)
    .bind(interval).run().catch(() => null);
  return changedRows(result);
}

async function runFragmentSlice({ db, state, interval, now }) {
  const cold = !(Number(state.watermarkAt) > 0) && !(Number(state.watermarkRowid) > 0);
  const page = cold ? ORB2_FIELD_FRAGMENT_COLD_PAGE : ORB2_FIELD_FRAGMENT_PAGE;
  const orphans = await deleteOrphanFragments(db, interval);
  const [changedPage] = await batchedReads(db, [{
    mode: "all",
    run: handle => handle.prepare(`${OBSERVATION_PAGE_SQL}
      WHERE interval = ? AND (updated_at > ? OR (updated_at = ? AND rowid > ?))
      ORDER BY updated_at ASC, rowid ASC LIMIT ?`)
      .bind(interval, Number(state.watermarkAt) || 0, Number(state.watermarkAt) || 0, Number(state.watermarkRowid) || 0, page)
  }]);
  let rows = changedPage || [];
  let source = rows.length ? "changed" : "idle";
  /* A full page means the drain has not caught up. An uncaught-up fragment table is
     never published: a document assembled from it would silently lose the berths the
     next page has not reached yet, and the live read is the honest answer until the
     drain is done. Ageing labels are cosmetic, so they never hold up a publication. */
  let drained = rows.length < page;
  if (!rows.length) {
    const [due] = await batchedReads(db, [{
      mode: "all",
      run: handle => handle.prepare(`SELECT symbol FROM orb2_field_fragments
        WHERE interval = ? AND fresh_until <= ? ORDER BY fresh_until ASC, symbol ASC LIMIT ?`)
        .bind(interval, now, page)
    }]);
    const dueSymbols = (due || []).map(row => String(row.symbol))
      .filter(symbol => ORB2_FIELD_SYMBOL_PATTERN.test(symbol));
    if (dueSymbols.length) {
      source = "aged";
      const [agedRows] = await batchedReads(db, [{
        mode: "all",
        run: handle => handle.prepare(`${OBSERVATION_PAGE_SQL}
          WHERE interval = ? AND symbol IN (${dueSymbols.map(() => "?").join(",")})`)
          .bind(interval, ...dueSymbols)
      }]);
      rows = agedRows || [];
    } else if (orphans) source = "orphans";
  }
  if (!rows.length) return { changed: orphans, source, drained };

  const stockSymbols = [...new Set(rows
    .filter(row => String(row.disc_id || "") === "stocks")
    .map(row => String(row.symbol)))];
  const companionInterval = interval === "1d" ? ORB2_INTRADAY_INTERVAL
    : interval === ORB2_INTRADAY_INTERVAL ? "1d" : null;
  let companions = [];
  let optionRows = null;
  if (stockSymbols.length) {
    const placeholders = stockSymbols.map(() => "?").join(",");
    /* The companion interval and the additive Options reading are fetched once for
       the whole page, never once per row. */
    const optionsAvailable = await orb2FieldOptionsTableAvailable(db);
    const [companionRows, options] = await batchedReads(db, [
      {
        mode: "all",
        run: handle => companionInterval
          ? handle.prepare(`SELECT symbol, payload, disc_id, provider, observed_at FROM orb2_field_observations
              WHERE interval = ? AND symbol IN (${placeholders})`).bind(companionInterval, ...stockSymbols)
          : handle.prepare("SELECT symbol FROM orb2_field_observations WHERE 0")
      },
      {
        mode: "all",
        run: handle => optionsAvailable
          ? handle.prepare(`SELECT symbol, underlying_price, selection_json, bars_json, status, observed_at
              FROM orb2_options_observations WHERE symbol IN (${placeholders})`).bind(...stockSymbols)
          : handle.prepare("SELECT symbol FROM orb2_field_observations WHERE 0")
      }
    ]);
    companions = (companionRows || []).map(row => orb2FieldObservationFromRow({ row, now })).filter(Boolean);
    /* The live path attaches `options` only when the Options migration is applied;
       a missing table must not add an `options` key the fallback read would not have. */
    optionRows = optionsAvailable ? (options || []) : null;
  }
  const optionsBySymbol = new Map();
  if (optionRows) {
    for (const option of optionRows) {
      const symbol = String(option.symbol || "").toUpperCase();
      const list = optionsBySymbol.get(symbol);
      if (list) list.push(option); else optionsBySymbol.set(symbol, [option]);
    }
  }

  const statements = [];
  let written = 0;
  let lastSeen = null;
  for (const row of rows) {
    const symbol = String(row.symbol);
    const fragment = orb2FieldFragmentForRow({
      row, now, companions,
      optionRows: optionRows ? (optionsBySymbol.get(symbol) || []) : null,
      compose: Boolean(companionInterval)
    });
    written += 1;
    if (!fragment) {
      statements.push(db.prepare("DELETE FROM orb2_field_fragments WHERE interval = ? AND symbol = ?").bind(interval, symbol));
    } else {
      statements.push(fragmentUpsert(db).bind(
        fragment.interval, fragment.symbol, fragment.discId, fragment.provider, fragment.observedAt,
        fragment.confirmed, fragment.isMarket, fragment.beatMask, fragment.memberJson, fragment.fragment,
        fragment.freshUntil, Number(row.updated_at) || 0, now
      ));
    }
    if (source === "changed") {
      const at = Number(row.updated_at) || 0;
      const rid = Number(row.rid) || 0;
      if (!lastSeen || at > lastSeen.at || (at === lastSeen.at && rid > lastSeen.rid)) lastSeen = { at, rid };
    }
  }
  await runAll(db, statements);
  return {
    changed: written + orphans, source, drained, orphans,
    ...(source === "changed" && lastSeen ? { watermarkAt: lastSeen.at, watermarkRowid: lastSeen.rid } : {})
  };
}

/* ── status pieces ────────────────────────────────────────────────────── */

const FRAGMENT_MEMBER_COLUMNS = "symbol, disc_id, provider, observed_at, confirmed, member_json";

/** One row of numbers instead of a parse per berth: SQL does the counting, and the
 * beat counts read straight off the stored mask. */
export function orb2FieldAggregateSql({ interval, disc = null, symbols = [] }) {
  const clauses = ["interval = ?"];
  const bindings = [interval];
  if (disc) { clauses.push("disc_id = ?"); bindings.push(disc); }
  if (symbols.length) { clauses.push(`symbol IN (${symbols.map(() => "?").join(",")})`); bindings.push(...symbols); }
  const beatSums = ORB2_FIELD_BEAT_TYPES.map(type => {
    const bit = ORB2_FIELD_BEAT_MASK_BITS[type.id];
    return `SUM(CASE WHEN beat_mask & ${bit} = ${bit} THEN 1 ELSE 0 END) AS beat_${type.id}`;
  }).join(",\n         ");
  return {
    sql: `SELECT COUNT(*) AS stored,
         SUM(is_market) AS observed,
         SUM(confirmed) AS confirmed,
         SUM(CASE WHEN is_market = 0 THEN 1 ELSE 0 END) AS held,
         ${beatSums}
  FROM orb2_field_fragments WHERE ${clauses.join(" AND ")}`,
    bindings
  };
}

/** One aggregate row → `{counts, beats}`. */
export function orb2FieldAggregateCounts(row) {
  const beats = { ...EMPTY_BEAT_COUNTS };
  for (const type of ORB2_FIELD_BEAT_TYPES) {
    beats[type.id] = Math.max(0, Math.floor(Number(row && row[`beat_${type.id}`]) || 0));
  }
  const stored = Math.max(0, Math.floor(Number(row && row.stored) || 0));
  const observed = Math.max(0, Math.floor(Number(row && row.observed) || 0));
  return {
    counts: {
      stored,
      observed,
      confirmed: Math.max(0, Math.floor(Number(row && row.confirmed) || 0)),
      held: Math.max(0, stored - observed)
    },
    beats
  };
}

/**
 * The pieces that do not depend on a request filter: the status head, the Disc
 * status, the whole-field counts, and the Dollar Strength reference. Runs on its own
 * slice so a Cron invocation carries only this much.
 */
async function runStatusSlice({ db, env, interval, now }) {
  const aggregate = orb2FieldAggregateSql({ interval });
  const [run, control, aggregateRow, memberRows] = await batchedReads(db, [
    {
      mode: "first",
      run: handle => handle.prepare(`SELECT utc_day, massive_calls, tickerbot_calls, kraken_calls, sweeps_completed,
          last_tick_at, last_observation_at, last_sweep_completed_at, last_error, lock_owner, lock_at, updated_at
        FROM orb2_field_runs WHERE utc_day = ?`).bind(new Date(now).toISOString().slice(0, 10))
    },
    { mode: "first", run: handle => handle.prepare("SELECT deploy_warm_at, manual_warm_at, warm_bursts, ranking_attempt_at, updated_at FROM orb2_field_control WHERE id = 1") },
    { mode: "first", run: handle => handle.prepare(aggregate.sql).bind(...aggregate.bindings) },
    { mode: "all", run: handle => handle.prepare(`SELECT ${FRAGMENT_MEMBER_COLUMNS} FROM orb2_field_fragments WHERE interval = ?`).bind(interval) }
  ]);
  /* The provider ledgers keep their own readers: their freshness windows, limits and
     notes are part of the published status, and re-deriving them here is exactly how
     two publishers would start disagreeing. They are independent reads, so they are
     issued together rather than one round trip at a time. */
  const [cachedFutures, cachedCryptoRanking, massiveLedger, tickerbotLedger, krakenLedger, twelvedataLedger] =
    await Promise.all([
      readMassiveFuturesContractState({ db, now }).catch(() => ({ ok: false, contracts: {} })),
      readCharactersCryptoRankingCache({ db, now }).catch(() => ({ ok: false })),
      readMassiveDailyCallLedger(db, now, MASSIVE_PROVIDER_DAILY_LIMIT).catch(() => ({ ok: false })),
      readTickerbotCallLedger(db, now).catch(() => ({ ok: false })),
      readKrakenCallLedger(db, now).catch(() => ({ ok: false })),
      loadTwelveDataDailyCallLedger(db).catch(() => ({ records: [] }))
    ]);
  const commodityContracts = orb2FieldStatusCommodityContracts({ env, now, cachedFutures });
  const roster = orb2FieldRoster({
    now,
    cryptoRanking: cachedCryptoRanking.ok ? cachedCryptoRanking.ranking : null,
    commodityContracts
  });
  const counted = orb2FieldAggregateCounts(aggregateRow);
  const memberInputsByDiscAndSymbol = new Map();
  const providersByDisc = new Map();
  for (const row of memberRows || []) {
    const discId = String(row.disc_id || "").toLowerCase();
    const symbol = String(row.symbol || "").toUpperCase();
    if (!ORB2_FIELD_DISCS.includes(discId) || !ORB2_FIELD_SYMBOL_PATTERN.test(symbol)) continue;
    const provider = String(row.provider || "");
    if (provider) {
      let set = providersByDisc.get(discId);
      if (!set) { set = new Set(); providersByDisc.set(discId, set); }
      set.add(provider);
    }
    try {
      memberInputsByDiscAndSymbol.set(`${discId}:${symbol}`, JSON.parse(row.member_json));
    } catch { /* an unreadable fragment contributes no member, exactly like a row that no longer parses */ }
  }
  const discs = orb2FieldDiscsDocument({
    now, interval, env, roster,
    memberInputsByDiscAndSymbol,
    cryptoRanking: cachedCryptoRanking.ok ? cachedCryptoRanking.ranking : null,
    providersByDisc
  });
  return {
    statusHead: orb2FieldStatusHead({
      now, interval, run, control,
      queue: await orb2FieldQueueDepth(db, now).catch(() => ({ pending: 0, hot: 0, sweep: 0, total: 0 })),
      cachedFutures, cachedCryptoRanking, krakenLedger, tickerbotLedger, twelvedataLedger,
      statusCommodityContracts: commodityContracts,
      hasTwelveKey: typeof env.TWELVEDATA_API_KEY === "string" && env.TWELVEDATA_API_KEY.trim().length > 0
    }),
    countsAll: orb2FieldCountsObject({
      ...counted.counts,
      reviewedInstruments: discs.reduce((sum, disc) => sum + (Number(disc.instruments) || 0), 0)
    }),
    beats: counted.beats,
    discs,
    ds: await runDollarStrength({ db, now })
  };
}

/** The fixed Dollar Strength reference, from the stored daily FX berths. */
async function runDollarStrength({ db, now }) {
  const ds = globalThis.GoodIntelligenceDollarStrength;
  if (!ds || !Array.isArray(ds.COMPONENTS)) return null;
  const symbols = ds.COMPONENTS.map(component => String(component.symbol || "").toUpperCase());
  const rows = await db.prepare(`SELECT payload FROM orb2_field_observations
    WHERE interval = '1d' AND symbol IN (${symbols.map(() => "?").join(",")})`)
    .bind(...symbols).all().catch(() => null);
  const observations = resultRows(rows)
    .map(row => orb2FieldObservationFromRow({ row, now })).filter(Boolean);
  return orb2FieldEvaluateDollarStrength(db, now, observations.length ? observations : null);
}

/* ── assembly ─────────────────────────────────────────────────────────── */

/** `{"a":1,"b":2}` → `{"a":1,"b":2},` — the stored form of an object other members
 * are spliced onto. One `slice`, never a re-serialization. */
const objectBody = value => {
  const json = JSON.stringify(value);
  return json.endsWith("}") ? `${json.slice(0, -1)},` : json;
};

export function orb2FieldObservationPrefix({ interval, generatedAt }) {
  return `{"ok":true,"schema":"${ORB2_FIELD_SCHEMA}","generatedAt":"${generatedAt}","interval":"${interval}",`;
}

/**
 * Concatenate the pieces into the response body. The counts, the Disc status and the
 * observation fragments are already JSON text, so the whole document is a handful of
 * string joins over ~600 KB — no parse, no stringify.
 */
export function assembleOrb2FieldBody({
  interval, generatedAt, disc, requestedTypes, beats: beatCounts, statusHeadText, countsText, discsText, dsText, fragments
}) {
  const beats = orb2FieldBeatTypes({
    meta: META,
    counts: beatCounts || {},
    requestedTypes: new Set(Array.isArray(requestedTypes) ? requestedTypes : ALL_TYPE_IDS)
  });
  return `{"success":true,"environment":"${ORB2_FIELD_SNAPSHOT_ENVIRONMENT}",` +
    `"data":${orb2FieldObservationPrefix({ interval, generatedAt })}` +
    `"disc":${JSON.stringify(disc || "all")},"requestedTypes":${JSON.stringify(requestedTypes)},` +
    `"beatTypes":${JSON.stringify(beats)},` +
    /* `statusHeadText` is the status object's own body (it already ends with the
       comma that separates it from `counts`), so nothing is re-serialized here. */
    `"status":${statusHeadText}"counts":${countsText},"discs":${discsText}},` +
    `"ds":${dsText},` +
    `"observations":[${fragments.join(",")}]}}`;
}

/**
 * Read every fragment for an interval, pre-serialized, in the order the live read
 * path returns the same rows: `observed_at` descending, then `symbol` in byte order.
 * A symbol filter needs more than one statement to stay under D1's bind-variable
 * ceiling, so the batches are merged back into that one global order.
 */
async function readFieldFragments(db, interval, { disc = null, symbols = [] } = {}) {
  const batches = symbols.length
    ? Array.from({ length: Math.ceil(symbols.length / FRAGMENT_SQL_SYMBOL_BATCH) }, (_, index) =>
        symbols.slice(index * FRAGMENT_SQL_SYMBOL_BATCH, (index + 1) * FRAGMENT_SQL_SYMBOL_BATCH))
    : [null];
  const results = await Promise.all(batches.map(symbolBatch => rawColumn(
    db.prepare(`SELECT fragment FROM orb2_field_fragments
      WHERE interval = ?${disc ? " AND disc_id = ?" : ""}${symbolBatch ? ` AND symbol IN (${symbolBatch.map(() => "?").join(",")})` : ""}
      ORDER BY observed_at DESC, symbol ASC LIMIT ?`)
      .bind(interval, ...(disc ? [disc] : []), ...(symbolBatch || []), ORB2_FIELD_MAX_OBSERVATIONS)
  )));
  const fragments = [];
  for (const result of results) fragments.push(...(result || []));
  if (batches.length === 1) return fragments.slice(0, ORB2_FIELD_MAX_OBSERVATIONS);
  const ordered = fragments.map(fragment => {
    try {
      const observation = JSON.parse(fragment);
      return { fragment, observedAt: Number(observation.observedAt) || 0, symbol: String(observation.symbol || "") };
    } catch { return null; }
  }).filter(Boolean);
  ordered.sort((left, right) => (right.observedAt - left.observedAt) || compareFieldSymbols(left.symbol, right.symbol));
  return ordered.slice(0, ORB2_FIELD_MAX_OBSERVATIONS).map(entry => entry.fragment);
}

export async function readOrb2FieldSnapshotRow(db, interval) {
  return (await db.prepare(`SELECT interval, etag, body, bytes, observations, built_at, source,
      status_head, counts_all, beat_counts, discs, ds
    FROM orb2_field_snapshots WHERE interval = ?`).bind(interval).first()) || null;
}

function safeJson(value, fallback) {
  if (typeof value !== "string" || !value.length) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

/**
 * Assemble and store the document for one interval. The pieces come from the stored
 * row, the observations from the fragment table, so the body is a consistent
 * snapshot of the fragments by construction.
 */
async function runAssembleSlice({ db, env = {}, interval, now, source }) {
  const row = await readOrb2FieldSnapshotRow(db, interval).catch(() => null);
  if (!row || typeof row.status_head !== "string" || !row.status_head.length) {
    return { ok: false, code: "status-missing", message: "The field status pieces are not published yet." };
  }
  const fragments = await readFieldFragments(db, interval);
  const body = assembleOrb2FieldBody({
    interval,
    generatedAt: new Date(now).toISOString(),
    disc: "all",
    requestedTypes: ALL_TYPE_IDS,
    beats: safeJson(row.beat_counts, EMPTY_BEAT_COUNTS),
    statusHeadText: row.status_head,
    countsText: typeof row.counts_all === "string" && row.counts_all.length ? row.counts_all : "{}",
    discsText: typeof row.discs === "string" && row.discs.length ? row.discs : "[]",
    dsText: typeof row.ds === "string" && row.ds.length ? row.ds : "null",
    fragments
  });
  const bytes = body.length;
  /* The bound is a variable as well as a constant: an operator can tighten it for a
     deployment without a code change. ORB2_FIELD_SNAPSHOT_MAX_BYTES is the value the
     row-size arithmetic in migration 0018 is written against. */
  const maxBytes = Math.max(1, Math.floor(Number(env.ORB2_FIELD_SNAPSHOT_MAX_BYTES)) || ORB2_FIELD_SNAPSHOT_MAX_BYTES);
  if (bytes > maxBytes) {
    /* Keep the previous document rather than store a truncated one. The next pass
       retries, so a field that shrank below the bound recovers on its own. */
    return {
      ok: false, code: "oversize", bytes,
      message: `The field document is ${bytes} bytes, above the ${maxBytes}-byte publication bound; the previous document is kept.`
    };
  }
  const etag = `W/"orb2-${interval}-${now}-${bytes}"`;
  await db.prepare(`UPDATE orb2_field_snapshots SET
      etag = ?, body = ?, bytes = ?, observations = ?, built_at = ?, source = ?, updated_at = ?
    WHERE interval = ?`)
    .bind(etag, body, bytes, fragments.length, now, String(source || "worker-cron").slice(0, 32), now, interval).run();
  return { ok: true, bytes, etag, observations: fragments.length };
}

/* ── the slice cursor ─────────────────────────────────────────────────── */

const BUILD_STATE_COLUMNS = `interval, stage, watermark_at, watermark_rowid, slices, passes,
  fragments_at, status_at, assembled_at, last_stage, last_stage_ms, last_error, updated_at`;

const freshState = (interval, row = null) => ({
  interval,
  stage: ORB2_FIELD_BUILD_STAGES.includes(row && row.stage) ? row.stage : "fragments",
  watermarkAt: Math.max(0, Math.floor(Number(row && row.watermark_at) || 0)),
  watermarkRowid: Math.max(0, Math.floor(Number(row && row.watermark_rowid) || 0)),
  slices: Math.max(0, Math.floor(Number(row && row.slices) || 0)),
  passes: Math.max(0, Math.floor(Number(row && row.passes) || 0)),
  fragmentsAt: Math.max(0, Math.floor(Number(row && row.fragments_at) || 0)),
  statusAt: Math.max(0, Math.floor(Number(row && row.status_at) || 0)),
  assembledAt: Math.max(0, Math.floor(Number(row && row.assembled_at) || 0)),
  lastStage: String((row && row.last_stage) || ""),
  lastStageMs: Math.max(0, Math.floor(Number(row && row.last_stage_ms) || 0)),
  lastError: String((row && row.last_error) || ""),
  touchedAt: Math.max(0, Math.floor(Number(row && row.updated_at) || 0))
});

async function readBuildStates(db, intervals) {
  const rows = await db.prepare(`SELECT ${BUILD_STATE_COLUMNS} FROM orb2_field_build_state
    WHERE interval IN (${intervals.map(() => "?").join(",")})`).bind(...intervals).all()
    .then(resultRows).catch(() => []);
  const byInterval = new Map();
  for (const row of rows) byInterval.set(String(row.interval), freshState(String(row.interval), row));
  for (const interval of intervals) if (!byInterval.has(interval)) byInterval.set(interval, freshState(interval));
  return byInterval;
}

async function writeBuildState(db, state, patch, now) {
  const next = {
    ...state, ...patch,
    interval: state.interval, touchedAt: now
  };
  await db.prepare(`INSERT INTO orb2_field_build_state
      (interval, stage, watermark_at, watermark_rowid, slices, passes, fragments_at, status_at,
       assembled_at, last_stage, last_stage_ms, last_error, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(interval) DO UPDATE SET
      stage = excluded.stage, watermark_at = excluded.watermark_at, watermark_rowid = excluded.watermark_rowid,
      slices = excluded.slices, passes = excluded.passes, fragments_at = excluded.fragments_at,
      status_at = excluded.status_at, assembled_at = excluded.assembled_at,
      last_stage = excluded.last_stage, last_stage_ms = excluded.last_stage_ms,
      last_error = excluded.last_error, updated_at = excluded.updated_at`)
    .bind(next.interval, next.stage, next.watermarkAt, next.watermarkRowid, next.slices, next.passes,
      next.fragmentsAt, next.statusAt, next.assembledAt, String(next.lastStage || ""),
      Number(next.lastStageMs) || 0, String(next.lastError || "").slice(0, 200), now)
    .run();
  return next;
}

/**
 * Run one bounded slice of the publication pass. Returns a small summary so the
 * scheduled handler (and its logs) can see what happened.
 *
 * Per invocation: one page of changed berths for each interval still draining, then
 * the status pieces and the assembly for the interval whose published document is
 * oldest. Nothing here scales with the size of the whole field.
 */
export async function runOrb2FieldBuildSlice(env = {}, dependencies = {}) {
  const db = dependencies.db || env.COMMUNITY_DB;
  const summary = { ok: false, ran: false, stages: [], changed: 0, published: [], faults: [], errors: [] };
  if (dependencies.enabled === false || String(env.ORB2_FIELD_SNAPSHOT || "").trim().toLowerCase() === "off") {
    return { ...summary, ok: true, disabled: true };
  }
  if (!db || typeof db.prepare !== "function") {
    summary.errors.push("Bind COMMUNITY_DB before the field publication can run.");
    return summary;
  }
  const now = Number.isFinite(Number(dependencies.now)) ? Number(dependencies.now) : Date.now();
  const intervals = (Array.isArray(dependencies.intervals) && dependencies.intervals.length
    ? dependencies.intervals.filter(interval => ORB2_FIELD_INTERVALS.includes(interval))
    : ORB2_FIELD_INTERVALS);
  const stageLimit = Math.max(2, Math.floor(Number(dependencies.stageLimit)) || ORB2_FIELD_SLICE_STAGE_LIMIT);
  const source = String(dependencies.source || "worker-cron").slice(0, 32);
  try {
    if (!await ensureSnapshotTables(db)) {
      summary.errors.push("Apply community migration 0018_orb2_field_snapshot.sql to publish the field.");
      return summary;
    }
    const states = await readBuildStates(db, intervals);
    let stages = 0;
    /* Fragment phase: whichever draining intervals were touched longest ago go
       first, so the pages cannot starve each other across invocations. */
    const draining = [...intervals]
      .filter(interval => states.get(interval).stage === "fragments")
      .sort((left, right) => states.get(left).touchedAt - states.get(right).touchedAt)
      .slice(0, Math.max(1, stageLimit - 2));
    for (const interval of draining) {
      const state = states.get(interval);
      const started = Date.now();
      const slice = await runFragmentSlice({ db, state, interval, now });
      stages += 1;
      summary.changed += slice.changed;
      summary.stages.push(slice.changed ? `fragments:${slice.changed}:${slice.source}` : "fragments:0");
      const next = await writeBuildState(db, state, {
        stage: slice.drained ? "status" : "fragments",
        watermarkAt: slice.watermarkAt ?? state.watermarkAt,
        watermarkRowid: slice.watermarkRowid ?? state.watermarkRowid,
        slices: state.slices + 1,
        fragmentsAt: slice.changed ? now : state.fragmentsAt,
        lastStage: "fragments",
        lastStageMs: Date.now() - started,
        lastError: ""
      }, now);
      states.set(interval, next);
    }
    /* Publish phase: finish whatever is mid-flight, then the oldest document. */
    const candidates = intervals
      .filter(interval => states.get(interval).stage !== "fragments")
      .sort((left, right) => {
        const a = states.get(left);
        const b = states.get(right);
        if (a.stage !== b.stage) return a.stage === "assemble" ? -1 : 1;
        return a.assembledAt - b.assembledAt;
      });
    const target = candidates[0] || null;
    if (target) {
      let state = states.get(target);
      if (state.stage === "status" && stages < stageLimit) {
        const started = Date.now();
        const pieces = await runStatusSlice({ db, env, interval: target, now });
        await db.prepare(`INSERT INTO orb2_field_snapshots
            (interval, etag, body, bytes, observations, built_at, source, status_head, counts_all, beat_counts, discs, ds, updated_at)
            VALUES (?, '', '', 0, 0, 0, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(interval) DO UPDATE SET
            status_head = excluded.status_head, counts_all = excluded.counts_all, beat_counts = excluded.beat_counts,
            discs = excluded.discs, ds = excluded.ds, updated_at = excluded.updated_at`)
          .bind(target, source, objectBody(pieces.statusHead), JSON.stringify(pieces.countsAll),
            JSON.stringify(pieces.beats), JSON.stringify(pieces.discs),
            JSON.stringify(pieces.ds === undefined ? null : pieces.ds), now).run();
        stages += 1;
        summary.stages.push(`status:${target}`);
        state = await writeBuildState(db, state, {
          stage: "assemble", statusAt: now,
          lastStage: "status", lastStageMs: Date.now() - started, lastError: ""
        }, now);
        states.set(target, state);
      }
      if (state.stage === "assemble" && stages < stageLimit) {
        const started = Date.now();
        const published = await runAssembleSlice({ db, env, interval: target, now, source });
        stages += 1;
        summary.stages.push(published.ok ? `assemble:${target}` : `assemble:${target}:${published.code || "failed"}`);
        if (published.ok) summary.published.push(target);
        else {
          summary.errors.push(published.message);
          summary.faults.push({ interval: target, code: published.code || "assemble-failed" });
        }
        state = await writeBuildState(db, state, {
          stage: "fragments",
          passes: published.ok ? state.passes + 1 : state.passes,
          assembledAt: published.ok ? now : state.assembledAt,
          lastStage: "assemble",
          lastStageMs: Date.now() - started,
          lastError: published.ok ? "" : String(published.message || "assemble failed").slice(0, 200)
        }, now);
        states.set(target, state);
      }
    }
    summary.ok = true;
    summary.ran = stages > 0;
    summary.states = intervals.map(interval => {
      const state = states.get(interval);
      return { interval, stage: state.stage, assembledAt: state.assembledAt, watermarkRowid: state.watermarkRowid };
    });
  } catch (error) {
    summary.errors.push(String((error && error.message) || error).slice(0, 200));
    snapshotTablesPresent = null;
  }
  return summary;
}

/**
 * Publish every interval to completion. The off-Cloudflare runner calls this, where
 * an invocation may legitimately hold the whole build; the Worker's Cron Trigger
 * never does — it takes one bounded slice per invocation instead.
 */
export async function publishOrb2FieldDocument(env = {}, dependencies = {}) {
  const summary = { ok: false, intervals: [], errors: [] };
  for (const interval of ORB2_FIELD_INTERVALS) {
    let slices = 0;
    let published = false;
    while (slices < 240 && !published) {
      slices += 1;
      const slice = await runOrb2FieldBuildSlice(env, {
        now: Number.isFinite(Number(dependencies.now)) ? Number(dependencies.now) : Date.now(),
        db: dependencies.db,
        intervals: [interval],
        source: dependencies.source || "local-runner"
      });
      if (!slice.ok) { summary.errors.push(...slice.errors); break; }
      /* `oversize` is deterministic: retrying inside this loop would only burn the
         runner's time. The Worker republishes on the next Cron minute anyway. */
      if (slice.faults.some(fault => fault.interval === interval && fault.code === "oversize")) {
        summary.errors.push(...slice.errors);
        break;
      }
      published = slice.published.includes(interval);
    }
    if (!published) summary.errors.push(`The ${interval} field document did not publish within ${slices} slices.`);
    summary.intervals.push({ interval, slices, published });
  }
  summary.ok = summary.errors.length === 0;
  return summary;
}

/* ── serving ──────────────────────────────────────────────────────────── */

async function ensureSnapshotTables(db) {
  if (snapshotTablesPresent !== null) return snapshotTablesPresent;
  try {
    const row = await db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'orb2_field_snapshots'").first();
    snapshotTablesPresent = Boolean(row);
  } catch { snapshotTablesPresent = false; }
  return snapshotTablesPresent;
}

/** The request's narrowing: Disc, symbol list, beat types. */
export function orb2FieldFilterFromUrl(url) {
  const disc = String(url.searchParams.get("disc") || "").trim().toLowerCase();
  const symbols = (url.searchParams.get("symbols") || "").split(",")
    .map(symbol => symbol.trim().toUpperCase())
    .filter(symbol => ORB2_FIELD_SYMBOL_PATTERN.test(symbol));
  const types = (url.searchParams.get("types") || "").split(",")
    .map(type => type.trim().toLowerCase())
    .filter(type => ALL_TYPE_IDS.includes(type));
  return {
    disc: ORB2_FIELD_DISCS.includes(disc) ? disc : null,
    symbols: [...new Set(symbols)].slice(0, ORB2_FIELD_MAX_OBSERVATIONS),
    types: [...new Set(types)]
  };
}

/* A `ResponseInit`, not a bare header map: the second argument of `new Response()`
   is what carries headers, and a plain object is silently ignored. */
const documentInit = extra => ({
  headers: {
    /* The document is served from the Cache API, not from the browser's HTTP cache:
       the client keeps its last snapshot in memory and revalidates with the ETag. */
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    Vary: "Origin",
    ...extra
  }
});

const matchesEtag = (request, etag) => {
  if (!etag) return false;
  const header = request.headers.get("If-None-Match");
  if (!header) return false;
  if (header.trim() === "*") return true;
  return header.split(",").map(value => value.trim()).includes(etag);
};

const notModified = etag => new Response(null, {
  status: 304,
  headers: { "Cache-Control": "no-store", ETag: etag, Vary: "Origin", "X-Content-Type-Options": "nosniff" }
});

/**
 * Serve the precomputed field for a GET, or return null to fall back to the live
 * read path: another method, an unknown interval, the `ORB2_FIELD_SNAPSHOT=off`
 * switch, an unapplied migration, a database whose document has not been published
 * yet, or any fault at all. The live path is the safety net, never a second source
 * of truth: both build from the same stored observations with the same helpers.
 */
export async function serveOrb2FieldSnapshot(request, env = {}, dependencies = {}) {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname !== ORB2_FIELD_ROUTE) return null;
  if (String(env.ORB2_FIELD_SNAPSHOT || "").trim().toLowerCase() === "off") return null;
  const requestedInterval = url.searchParams.get("interval");
  if (requestedInterval !== null && !ORB2_FIELD_INTERVALS.includes(requestedInterval.trim())) return null;
  const interval = (requestedInterval || ORB2_FIELD_DEFAULT_INTERVAL).trim();
  const db = env.COMMUNITY_DB;
  if (!db || typeof db.prepare !== "function") return null;
  if (!await ensureSnapshotTables(db)) return null;
  try {
    const filter = orb2FieldFilterFromUrl(url);
    const unfiltered = !filter.disc && !filter.symbols.length && !filter.types.length;
    const cache = String(env.ORB2_FIELD_SNAPSHOT_CACHE || "").trim().toLowerCase() === "off"
      ? null
      : (dependencies.cache || (typeof caches !== "undefined" && caches.default ? caches.default : null));
    const cacheKey = `${url.origin}/__orb2-field/${interval}/${filter.disc || "all"}/` +
      `${filter.symbols.join(",") || "all"}/${filter.types.join(",") || "all"}`;
    const cachePut = (key, response) => {
      const put = cache.put(new Request(key), response).catch(() => {});
      const context = dependencies.context || null;
      if (context && typeof context.waitUntil === "function") context.waitUntil(put);
      return put;
    };
    /* The Cache API is consulted before D1: a hit inside the 20-second window is
       free of the 5M rows-a-day read budget, and a revalidating client gets its 304
       without touching the database at all. */
    if (cache) {
      const hit = await cache.match(new Request(cacheKey)).catch(() => undefined);
      if (hit) {
        const hitEtag = hit.headers.get("ETag") || "";
        if (matchesEtag(request, hitEtag)) return notModified(hitEtag);
        return new Response(hit.body, documentInit({
          ETag: hitEtag,
          "X-Orb2-Field": `cache; interval=${interval}`
        }));
      }
    }
    const row = await readOrb2FieldSnapshotRow(db, interval);
    const etag = row && row.etag ? String(row.etag) : "";
    if (!row || typeof row.body !== "string" || !row.body.length) return null;
    if (unfiltered) {
      if (matchesEtag(request, etag)) return notModified(etag);
      if (cache) {
        cachePut(cacheKey, new Response(row.body, {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": `public, max-age=${ORB2_FIELD_SNAPSHOT_CACHE_SECONDS}`,
            ETag: etag
          }
        }));
      }
      return new Response(row.body, documentInit({
        ETag: etag,
        "X-Orb2-Field": `snapshot; interval=${interval}; built=${Number(row.built_at) || 0}; source=${row.source || ""}`
      }));
    }
    /* A filtered read is still one round trip: the stored pieces, the filtered counts
       from SQL, and the matching pre-serialized fragments — nothing is parsed except
       the small fragments' metadata the ordering needs. */
    const aggregate = orb2FieldAggregateSql({ interval, disc: filter.disc, symbols: filter.symbols });
    const [countsRow, fragmentRows] = await batchedReads(db, [
      { mode: "first", run: handle => handle.prepare(aggregate.sql).bind(...aggregate.bindings) },
      {
        mode: "all",
        run: handle => handle.prepare(`SELECT fragment, observed_at, symbol FROM orb2_field_fragments
          WHERE interval = ?${filter.disc ? " AND disc_id = ?" : ""}${filter.symbols.length ? ` AND symbol IN (${filter.symbols.map(() => "?").join(",")})` : ""}
          ORDER BY observed_at DESC, symbol ASC LIMIT ?`)
          .bind(interval, ...(filter.disc ? [filter.disc] : []), ...filter.symbols, ORB2_FIELD_MAX_OBSERVATIONS)
      }
    ]);
    const counted = orb2FieldAggregateCounts(countsRow);
    const discs = safeJson(row.discs, []);
    const body = assembleOrb2FieldBody({
      interval,
      /* The filtered body keeps the stored document's generatedAt: the observations
         are the same age as the published ones, and a request must not claim a
         freshness the stored field does not have. */
      generatedAt: new Date(Number(row.built_at) || Date.now()).toISOString(),
      disc: filter.disc || "all",
      requestedTypes: filter.types.length ? filter.types : ALL_TYPE_IDS,
      beats: counted.beats,
      statusHeadText: typeof row.status_head === "string" && row.status_head.length ? row.status_head : "{},",
      countsText: JSON.stringify({
        ...orb2FieldCountsObject({
          ...counted.counts,
          reviewedInstruments: Array.isArray(discs)
            ? discs.reduce((sum, disc) => sum + (Number(disc.instruments) || 0), 0) : 0
        })
      }),
      discsText: Array.isArray(discs) ? JSON.stringify(discs) : "[]",
      dsText: typeof row.ds === "string" && row.ds.length ? row.ds : "null",
      fragments: (fragmentRows || []).map(fragmentRow => fragmentRow && fragmentRow.fragment)
        .filter(fragment => typeof fragment === "string")
    });
    const filterTag = `f${filter.disc || "all"}-${filter.symbols.length}s-${filter.types.join(".") || "all"}-${filter.symbols.join(".") || "all"}`;
    const filteredEtag = etag ? `${etag.replace(/"$/, "")}-${filterTag}"` : "";
    if (matchesEtag(request, filteredEtag)) return notModified(filteredEtag);
    if (cache) {
      cachePut(cacheKey, new Response(body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": `public, max-age=${ORB2_FIELD_SNAPSHOT_CACHE_SECONDS}`,
          ETag: filteredEtag
        }
      }));
    }
    return new Response(body, documentInit({
      ETag: filteredEtag,
      "X-Orb2-Field": `snapshot; interval=${interval}; disc=${filter.disc || "all"}`
    }));
  } catch {
    snapshotTablesPresent = null;
    return null;
  }
}
