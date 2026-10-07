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

const DAY_MS = 24 * 60 * 60_000;
const HOUR_MS = 60 * 60_000;
const MINUTE_MS = 60_000;
const ORB2_INTRADAY_INTERVAL = "15m";
const ORB2_FIELD_ROUTE = "/api/good-intelligence/v1/orb2/field";
const ORB2_FIELD_REQUEST_SCHEMA = "orb2-server-field.request-v1";
const ORB2_FIELD_STATUS_SCHEMA = "orb2-server-field.status-v1";
const ORB2_FIELD_SCHEMA = "orb2-server-field.snapshot-v1";
const ORB2_FIELD_CRON = "*/1 * * * *";
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

