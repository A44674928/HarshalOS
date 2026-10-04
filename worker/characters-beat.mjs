/*
 * HarshalOS — Characters: the market beat route.
 *
 * Tickerbot Live is the default provider for every Disc. Stocks (Disc1) keep their
 * reviewed 52-ticker allowlist at 1h/1d and retain an explicit 1mo Alpha Vantage mode.
 * Discs 2–4 (FX, Crypto, Commodities) are routed through Tickerbot as well; when
 * Tickerbot does not yet cover a non-equity symbol the Worker answers an honest
 * "not yet covered" status per instrument instead of falling through to Alpha Vantage,
 * which is intentionally disabled for those Discs in anticipation of an upcoming
 * multi-asset Tickerbot expansion. Monthly data can never answer a daily/hourly request
 * and Tickerbot is never called for `1mo`.
 *
 * Tickerbot retains its shared 10,000-per-UTC-month ledger. Alpha Vantage has its own
 * atomic 25-requests-per-UTC-day Worker cap for Disc1-only 1mo requests; that is a
 * request quota, not a bar interval. Every provider attempt is counted conservatively
 * before fetch. Provider keys never enter browser code or response bodies; Alpha Vantage
 * query-string redaction remains enabled.
 */
import {
  TICKERBOT_INTERVALS,
  TICKERBOT_WATCHLIST,
  fetchTickerbotMarketContext,
  isTickerbotSymbol
} from "./good-intelligence-tickerbot.mjs";
import { fetchAlphaVantageMonthlyMarketContext } from "./characters-alpha-vantage.mjs";
import { claimTickerbotCall, readTickerbotCallLedger } from "./tickerbot-call-ledger.mjs";
import {
  ALPHA_VANTAGE_PROVIDER_DAILY_LIMIT,
  claimAlphaVantageDailyCall,
  readAlphaVantageDailyCallLedger
} from "./alpha-vantage-daily-call-ledger.mjs";
import { getCharactersCryptoRanking } from "./characters-crypto-ranking.mjs";
import "../js/characters-disc-catalog.js";

export const CHARACTERS_BEAT_ROUTE = "/api/characters/v1/beat";
export const MAX_BEAT_SYMBOLS = 12;
export const BEAT_CADENCES = Object.freeze([15, 30, 60, 240, 1440]);
export const MONTHLY_CACHE_HOLD_MS = 24 * 60 * 60_000;
const DEFAULT_CADENCE = 15;
const LANES = Object.freeze(["hot", "sweep"]);
const MAX_FETCH_CONCURRENCY = 4;
const UPSTREAM_TIMEOUT_MS = 10_000;

const cache = new Map();
const json = (data, status = 200, extraHeaders = {}) => Response.json(data, {
  status,
  headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extraHeaders }
});
const failure = (message, status = 502, extraHeaders = {}) => json({ success: false, message }, status, extraHeaders);

export function clearCharactersBeatCache() {
  cache.clear();
}

/* The newest snapshot received from D1 wins. Parallel claims can complete out of order. */
function newerLedger(current, next) {
  if (!next) return current;
  if (!current || next.month > current.month) return next;
  if (next.month < current.month) return current;
  if (next.calls > current.calls) return next;
  if (next.calls === current.calls && Number(next.updatedAt || 0) > Number(current.updatedAt || 0)) return next;
  return current;
}

function newerAlphaVantageLedger(current, next) {
  if (!next) return current;
  if (!current || next.day > current.day) return next;
  if (next.day < current.day) return current;
  if (next.calls > current.calls) return next;
  if (next.calls === current.calls && Number(next.updatedAt || 0) > Number(current.updatedAt || 0)) return next;
  return current;
}

function parseLanes(raw) {
  const lanes = new Map();
  if (typeof raw !== "string" || !raw.trim()) return lanes;
  for (const entry of raw.split(",").slice(0, 64)) {
    const [symbol, lane] = entry.split(":").map(part => (part || "").trim().toUpperCase());
    if (!symbol || !LANES.includes(String(lane || "").toLowerCase())) continue;
    if (!lanes.has(symbol)) lanes.set(symbol, String(lane).toLowerCase());
  }
  return lanes;
}

function stockInstruments() {
  return TICKERBOT_WATCHLIST.map(entry => ({
    ...entry,
    displaySymbol: entry.symbol,
    discId: "stocks",
    assetClass: "equity",
    dataShape: "ohlcv",
    quoteCurrency: "USD",
    alphaVantage: { function: "TIME_SERIES_MONTHLY", symbol: entry.symbol }
  }));
}

function staticDiscInstruments(discId) {
  const catalog = globalThis.CharactersDiscCatalog;
  if (!catalog) return [];
  if (discId === "fx") return catalog.fxCurrencies;
  if (discId === "commodities") return catalog.commodities;
  return [];
}

function parseSymbols(raw, instruments) {
  if (typeof raw !== "string" || !raw.trim()) return { selected: [], rejected: [] };
  const requested = [...new Set(raw.split(",").map(entry => entry.trim().toUpperCase()).filter(Boolean))];
  const bySymbol = new Map(instruments.map(instrument => [String(instrument.symbol).toUpperCase(), instrument]));
  const selected = [];
  const rejected = [];
  for (const symbol of requested) {
    const instrument = bySymbol.get(symbol);
    if (!instrument || (instrument.assetClass === "equity" && !isTickerbotSymbol(symbol))) rejected.push(symbol.slice(0, 32));
    else selected.push(instrument);
  }
  return { selected, rejected };
}

function statusForCode(code) {
  if (["rate-limit", "budget-exhausted", "alpha-vantage-rate-limit", "alpha-vantage-budget-exhausted", "crypto-ranking-rate-limit"].includes(code)) return 429;
  if (["ledger-unavailable", "alpha-vantage-ledger-unavailable", "tickerbot-not-configured", "alpha-vantage-not-configured", "tickerbot-symbol-not-covered"].includes(code)) return 503;
  if (["empty", "alpha-vantage-empty"].includes(code)) return 404;
  if (["timeout", "alpha-vantage-timeout", "crypto-ranking-timeout"].includes(code)) return 504;
  return 502;
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

function resolveDisc(discId) {
  const catalog = globalThis.CharactersDiscCatalog;
  return catalog && catalog.disc(discId);
}

export async function handleCharactersBeat(request, env = {}, dependencies = {}) {
  const url = new URL(request.url);
  if (url.pathname !== CHARACTERS_BEAT_ROUTE) return failure("Characters beat route not found.", 404);
  if (request.method !== "GET") return failure("The Characters beat is read-only.", 405, { Allow: "GET" });

  const discId = (url.searchParams.get("disc") || "stocks").trim().toLowerCase();
  const disc = resolveDisc(discId);
  if (!disc) return failure("Choose a reviewed Characters Disc.", 400);
  const interval = (url.searchParams.get("interval") || "1h").trim();
  const provider = (url.searchParams.get("provider") || "").trim().toLowerCase();
  /* Disc 1 (stocks) accepts Tickerbot 1h/1d plus an explicit 1mo Alpha Vantage mode.
   * Discs 2–4 (FX, Crypto, Commodities) are Tickerbot-only at 1h/1d; Alpha Vantage 1mo
   * is intentionally disabled for them until the upcoming Tickerbot multi-asset rollout.
   * `provider=alpha` is an explicit opt-in for Alpha Vantage on Disc 1. */
  const supportedModes = discId === "stocks"
    ? [...TICKERBOT_INTERVALS, "1mo"]
    : [...TICKERBOT_INTERVALS];
  if (!supportedModes.includes(interval)) {
    return failure(discId === "stocks"
      ? `Choose ${TICKERBOT_INTERVALS.join(" or ")} for Tickerbot, or explicitly choose 1mo for Alpha Vantage monthly data.`
      : `Choose ${TICKERBOT_INTERVALS.join(" or ")} for Tickerbot. Alpha Vantage 1mo is disabled for ${disc.label} while multi-asset Tickerbot support is in progress.`, 400);
  }

  const rawSymbols = url.searchParams.get("symbols");
  if (typeof rawSymbols !== "string" || !rawSymbols.trim()) return failure("Choose at least one instrument from this Disc.", 400);
  const requestedSymbols = [...new Set(rawSymbols.split(",").map(entry => entry.trim().toUpperCase()).filter(Boolean))];
  if (!requestedSymbols.length) return failure("Choose at least one instrument from this Disc.", 400);
  if (requestedSymbols.length > MAX_BEAT_SYMBOLS) {
    return failure(`One beat may request at most ${MAX_BEAT_SYMBOLS} instruments; ${requestedSymbols.length} were requested.`, 400);
  }

  const now = typeof dependencies.now === "function" ? dependencies.now() : Date.now();
  const fetcher = dependencies.fetch || globalThis.fetch;
  if (typeof fetcher !== "function") return failure("No market-data provider is available in this Worker runtime.", 503);

  let allowedInstruments = discId === "stocks" ? stockInstruments() : staticDiscInstruments(discId);
  let cryptoRanking = null;
  if (discId === "crypto") {
    const rankingResult = await getCharactersCryptoRanking({
      fetcher,
      now,
      timeoutMs: UPSTREAM_TIMEOUT_MS,
      forceRefresh: dependencies.forceCryptoRankingRefresh === true
    });
    if (!rankingResult.ok) {
      return failure(rankingResult.message, statusForCode(rankingResult.code));
    }
    cryptoRanking = rankingResult.ranking;
    allowedInstruments = cryptoRanking.instruments;
  }

  const { selected, rejected } = parseSymbols(rawSymbols, allowedInstruments);
  if (!selected.length) return failure(`No requested instrument is on the reviewed ${disc.label} catalog.`, 400);
  if (rejected.length) {
    return failure(`These instruments are not on the selected ${disc.label} catalog: ${rejected.join(", ")}.`, 400);
  }

  const lanes = parseLanes(url.searchParams.get("lanes"));
  const requestedCadence = Number(url.searchParams.get("cadence"));
  const cadenceMinutes = BEAT_CADENCES.includes(requestedCadence) ? requestedCadence : DEFAULT_CADENCE;
  const tickerbotApiKey = typeof env.TICKERBOT_API_KEY === "string" ? env.TICKERBOT_API_KEY.trim() : "";
  const alphaVantageApiKey = typeof env.ALPHA_VANTAGE_API_KEY === "string" ? env.ALPHA_VANTAGE_API_KEY.trim() : "";
  /* Alpha Vantage 1mo is intentionally restricted to Disc1 (stocks) while we bring up
   * multi-asset Tickerbot support for Discs 2–4. `provider=alpha` is an explicit client
   * opt-in that also triggers monthly mode on Disc 1. */
  const monthlyMode = (interval === "1mo" || provider === "alpha") && discId === "stocks";

  if (monthlyMode && !alphaVantageApiKey) {
    return failure("Alpha Vantage monthly data is not configured. Add the ALPHA_VANTAGE_API_KEY Worker secret; Tickerbot is not used for 1mo.", 503);
  }
  if (!monthlyMode && !tickerbotApiKey) {
    return failure(`Tickerbot is not configured on this Worker. Add the TICKERBOT_API_KEY Worker secret for ${disc.label} ${interval} data.`, 503);
  }

  const tickerbotHeld = !monthlyMode
    ? await readTickerbotCallLedger(env.COMMUNITY_DB, now)
    : { ok: false, reason: "not-applicable" };
  let durable = tickerbotHeld.ok ? tickerbotHeld.ledger : null;
  let ledgerStatus = monthlyMode ? "not-applicable" : (tickerbotHeld.ok ? "ready" : "unavailable");

  const alphaDailyHeld = monthlyMode
    ? await readAlphaVantageDailyCallLedger(env.COMMUNITY_DB, now)
    : { ok: false, reason: "not-applicable" };
  let alphaVantageDaily = alphaDailyHeld.ok ? alphaDailyHeld.ledger : null;
  let alphaVantageLedgerStatus = monthlyMode
    ? (alphaDailyHeld.ok ? "ready" : "unavailable")
    : "not-applicable";

  const holdMs = monthlyMode ? MONTHLY_CACHE_HOLD_MS : cadenceMinutes * 60_000;
  let tickerbotAttempts = 0;
  let alphaVantageAttempts = 0;
  let cacheHits = 0;

  const instruments = await mapWithConcurrency(selected, MAX_FETCH_CONCURRENCY, async instrument => {
    const symbol = String(instrument.symbol).trim().toUpperCase();
    const key = `${discId}:${symbol}:${interval}`;
    const lane = lanes.get(symbol) || null;
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) {
      cacheHits += 1;
      return { symbol, displaySymbol: instrument.displaySymbol || symbol, status: "cached", lane, provider: cached.provider, marketContext: cached.packet };
    }
    if (cached) cache.delete(key);

    if (monthlyMode) {
      if (alphaVantageDaily && alphaVantageDaily.exhausted) {
        return {
          symbol, displaySymbol: instrument.displaySymbol || symbol, status: "unavailable", lane,
          provider: "alpha-vantage", code: "alpha-vantage-budget-exhausted",
          message: `The Characters Alpha Vantage allowance is exhausted for ${alphaVantageDaily.day}: ${alphaVantageDaily.calls.toLocaleString()} of ${alphaVantageDaily.dailyLimit.toLocaleString()} Worker-routed requests. No Alpha Vantage request was sent.`
        };
      }
      const claim = await claimAlphaVantageDailyCall(env.COMMUNITY_DB, now, ALPHA_VANTAGE_PROVIDER_DAILY_LIMIT);
      if (!claim.ok) {
        if (claim.ledger) alphaVantageDaily = newerAlphaVantageLedger(alphaVantageDaily, claim.ledger);
        alphaVantageLedgerStatus = claim.reason === "alpha-vantage-budget-exhausted" ? "ready" : "unavailable";
        return {
          symbol, displaySymbol: instrument.displaySymbol || symbol, status: "unavailable", lane,
          provider: "alpha-vantage", code: claim.reason, message: claim.message,
          ...(claim.ledger ? { alphaVantageDaily: claim.ledger } : {})
        };
      }

      alphaVantageLedgerStatus = "ready";
      alphaVantageDaily = newerAlphaVantageLedger(alphaVantageDaily, claim.ledger);
      alphaVantageAttempts += 1;
      const result = await fetchAlphaVantageMonthlyMarketContext({
        instrument: { ...instrument, interval: "1mo" },
        apiKey: alphaVantageApiKey,
        fetcher,
        now,
        timeoutMs: UPSTREAM_TIMEOUT_MS,
        dependencies
      });
      if (!result.ok) {
        return { symbol, displaySymbol: instrument.displaySymbol || symbol, status: "unavailable", lane, provider: "alpha-vantage", ...result };
      }
      cache.set(key, { packet: result.packet, provider: "alpha-vantage", expiresAt: now + holdMs });
      return { symbol, displaySymbol: instrument.displaySymbol || symbol, status: "bars", lane, provider: "alpha-vantage", marketContext: result.packet };
    }

    /* Discs 2–4 default to Tickerbot, but Tickerbot does not yet cover non-equity
     * instruments (FX, crypto, commodities). Refuse those symbols cleanly without
     * consuming a ledger claim or an upstream call — this is the intentional
     * pre-rollout state so the upcoming multi-asset Tickerbot feature can flip this
     * gate simply by widening isTickerbotSymbol's reviewed allowlist. */
    if (!isTickerbotSymbol(symbol)) {
      return {
        symbol, displaySymbol: instrument.displaySymbol || symbol, status: "unavailable", lane,
        provider: "tickerbot", code: "tickerbot-symbol-not-covered",
        message: `${symbol} is not yet on Tickerbot's reviewed multi-asset allowlist for ${disc.label}. Alpha Vantage is disabled for this Disc; the symbol will be served through Tickerbot in the upcoming multi-asset release.`
      };
    }

    if (durable && durable.exhausted) {
      return {
        symbol, displaySymbol: instrument.displaySymbol || symbol, status: "unavailable", lane,
        provider: "tickerbot", code: "budget-exhausted",
        message: `The Worker-routed Tickerbot allowance is exhausted for ${durable.month}: ${durable.calls.toLocaleString()} of ${durable.workerLimit.toLocaleString()} calls. No Tickerbot request was sent.`
      };
    }
    const claim = await claimTickerbotCall(env.COMMUNITY_DB, now);
    if (!claim.ok) {
      if (claim.ledger) durable = newerLedger(durable, claim.ledger);
      ledgerStatus = claim.reason === "budget-exhausted" ? "ready" : "unavailable";
      return {
        symbol, displaySymbol: instrument.displaySymbol || symbol, status: "unavailable", lane,
        provider: "tickerbot", code: claim.reason, message: claim.message,
        ...(claim.ledger ? { durable: claim.ledger } : {})
      };
    }
    tickerbotAttempts += 1;
    ledgerStatus = "ready";
    durable = newerLedger(durable, claim.ledger);
    const result = await fetchTickerbotMarketContext({
      symbol,
      interval,
      apiKey: tickerbotApiKey,
      fetcher,
      now,
      timeoutMs: UPSTREAM_TIMEOUT_MS,
      dependencies,
      logFailure: true
    });
    if (!result.ok) {
      return { symbol, displaySymbol: instrument.displaySymbol || symbol, status: "unavailable", lane, provider: "tickerbot", ...result };
    }
    cache.set(key, { packet: result.packet, provider: "tickerbot", expiresAt: now + holdMs });
    return { symbol, displaySymbol: instrument.displaySymbol || symbol, status: "bars", lane, provider: "tickerbot", marketContext: result.packet };
  });

  const failures = instruments.filter(instrument => instrument.status === "unavailable");
  const succeeded = instruments.length - failures.length;
  const providerAttempts = tickerbotAttempts + alphaVantageAttempts;
  const data = {
    schema: "characters-beat-v1",
    disc: discId,
    beatAt: new Date(now).toISOString(),
    interval,
    cadenceMinutes,
    holdMs,
    instruments,
    ...(cryptoRanking ? { ranking: { provider: cryptoRanking.provider, metric: cryptoRanking.metric, rankedAt: cryptoRanking.rankedAt, audit: cryptoRanking.audit } } : {}),
    spend: {
      requestedSymbols: selected.length,
      providerAttempts,
      tickerbotAttempts,
      alphaVantageAttempts,
      cacheHits,
      unavailable: failures.length,
      lanes: {
        hot: instruments.filter(instrument => instrument.lane === "hot").map(instrument => instrument.symbol),
        sweep: instruments.filter(instrument => instrument.lane === "sweep").map(instrument => instrument.symbol),
        note: "Client-supplied lane labels are display hints only; this never changes how many calls are made." + (monthlyMode ? " In 1mo mode, no Tickerbot request is made." : "")
      },
      durable,
      ledgerStatus,
      alphaVantageDaily,
      alphaVantageLedgerStatus,
      note: monthlyMode
        ? "Alpha Vantage 1mo requests (Disc1 stocks only) use an independent 25-per-UTC-day Worker cap. Monthly interval does not change the cap; Tickerbot and its UTC-month ledger are not used. Failed requests count conservatively."
        : discId === "stocks"
          ? "Tickerbot stock 1h/1d attempts use the shared 10,000-per-UTC-month Worker allowance. Alpha Vantage is not used for 1h or 1d; direct provider calls are outside the Worker ledger."
          : `Tickerbot is the default provider for ${disc.label} ${interval}. Alpha Vantage is disabled for this Disc while multi-asset Tickerbot support is in progress; symbols not yet on Tickerbot's reviewed allowlist are reported unavailable rather than served from another provider.`
    }
  };

  if (!succeeded) {
    const codes = new Set(failures.map(instrument => instrument.code));
    if (codes.size === 1) {
      const [code] = [...codes];
      const headers = code === "rate-limit" || code === "alpha-vantage-rate-limit"
        ? { "Retry-After": failures[0].retryAfter || "60" }
        : {};
      return json({ success: false, message: failures[0].message, environment: "characters-beat", data }, statusForCode(code), headers);
    }
    return json({ success: false, message: "No instrument in this beat returned usable market observations.", environment: "characters-beat", data }, 502);
  }
  return json({ success: true, environment: "characters-beat", data });
}
