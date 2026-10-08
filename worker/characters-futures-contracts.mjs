/**
 * Date-scoped discovery of Massive active single futures contracts.
 *
 * Disc4 stores reviewed Massive product codes, never hard-coded dated tickers.
 * The contracts reference endpoint is queried for the current UTC date, and a
 * result is accepted only when Massive identifies it as an active single
 * contract for that exact product/date. Valid selections live in D1 only through
 * UTC midnight. On any error there is no stale-contract fallback.
 */

export const MASSIVE_FUTURES_CONTRACTS_ORIGIN = "https://api.massive.com";
export const MASSIVE_FUTURES_CONTRACTS_PATH = "/futures/v1/contracts";
export const MASSIVE_FUTURES_CONTRACT_CACHE_TTL_MS = 24 * 60 * 60_000;
export const MASSIVE_FUTURES_CONTRACT_RETRY_COOLDOWN_MS = 15 * 60_000;
export const MASSIVE_FUTURES_CONTRACT_GLOBAL_COOLDOWN_MS = 15 * 60_000;
export const MASSIVE_FUTURES_CONTRACT_LIMIT = 100;
const GLOBAL_COOLDOWN_KEY = "__GLOBAL__";

const PRODUCT_CODE_PATTERN = /^[A-Z0-9]{1,8}$/;
const FUTURES_TICKER_PATTERN = /^[A-Z0-9]{1,8}[FGHJKMNQUVXZ]\d{1,2}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
let inFlightByDb = new WeakMap();

function flightsFor(db) {
  let flights = inFlightByDb.get(db);
  if (!flights) { flights = new Map(); inFlightByDb.set(db, flights); }
  return flights;
}

function utcDate(now) {
  return new Date(now).toISOString().slice(0, 10);
}

function nextUtcMidnight(now) {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
}

function normalizedProductCode(value) {
  const code = String(value || "").trim().toUpperCase();
  return PRODUCT_CODE_PATTERN.test(code) ? code : "";
}

function finiteTimestamp(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function validIsoDate(value) {
  if (!ISO_DATE_PATTERN.test(String(value || ""))) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Validate and deterministically choose the active contract with the earliest
 * last-trade date from a Massive contracts response. A product/date mismatch or untrusted row is
 * rejected rather than corrected or guessed.
 */
export function normalizeMassiveActiveFuturesContract(payload, { productCode, date } = {}) {
  const expectedProduct = normalizedProductCode(productCode);
  if (!expectedProduct || !validIsoDate(date) || !payload || typeof payload !== "object" || Array.isArray(payload) ||
      !Array.isArray(payload.results) || (typeof payload.next_url === "string" && payload.next_url.trim())) {
    return null;
  }

  const eligible = payload.results.flatMap(row => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return [];
    const ticker = String(row.ticker || "").trim().toUpperCase();
    const returnedProduct = normalizedProductCode(row.product_code);
    const lastTradeDate = String(row.last_trade_date || row.last_trade || "").slice(0, 10);
    const rowDate = String(row.date || "").slice(0, 10);
    const type = String(row.type || "").toLowerCase();
    const active = row.active === true || row.active === 1 || String(row.active).toLowerCase() === "true";
    if (!FUTURES_TICKER_PATTERN.test(ticker) || !ticker.startsWith(expectedProduct) ||
        returnedProduct !== expectedProduct || !active || type !== "single" || rowDate !== date ||
        !validIsoDate(lastTradeDate) || lastTradeDate < date) return [];
    const daysToMaturity = row.days_to_maturity;
    return [{
      ticker,
      productCode: expectedProduct,
      provider: "Massive",
      asOfDate: date,
      lastTradeDate,
      ...(Number.isInteger(daysToMaturity) && daysToMaturity >= 0 ? { daysToMaturity } : {}),
      ...(typeof row.name === "string" && row.name.trim() ? { name: row.name.trim().slice(0, 120) } : {})
    }];
  });

  eligible.sort((a, b) => a.lastTradeDate.localeCompare(b.lastTradeDate) || a.ticker.localeCompare(b.ticker));
  return eligible[0] || null;
}

function validateCachedContract(value, productCode, date) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const ticker = String(value.ticker || "").trim().toUpperCase();
  const lastTradeDate = String(value.lastTradeDate || "").slice(0, 10);
  if (value.provider !== "Massive" || normalizedProductCode(value.productCode) !== productCode ||
      value.asOfDate !== date || !FUTURES_TICKER_PATTERN.test(ticker) || !ticker.startsWith(productCode) ||
      !validIsoDate(lastTradeDate) || lastTradeDate < date) return null;
  const daysToMaturity = value.daysToMaturity;
  if (daysToMaturity !== undefined && (!Number.isInteger(daysToMaturity) || daysToMaturity < 0)) return null;
  return Object.freeze({
    ticker, productCode, provider: "Massive", asOfDate: date, lastTradeDate,
    ...(daysToMaturity !== undefined ? { daysToMaturity } : {}),
    ...(typeof value.name === "string" && value.name.trim() ? { name: value.name.trim().slice(0, 120) } : {})
  });
}

function parseCachedContract(row, productCode, today, now) {
  if (!row || row.source_date !== today || finiteTimestamp(row.expires_at) <= now || typeof row.contract_json !== "string") return null;
  try { return validateCachedContract(JSON.parse(row.contract_json), productCode, today); }
  catch { return null; }
}

/** Read active contracts and the last-attempt timestamps from the shared D1 cache. */
export async function readMassiveFuturesContractState({ db, now = Date.now(), productCodes = null } = {}) {
  const today = utcDate(now);
  const result = { ok: false, contracts: Object.create(null), lastAttemptAt: Object.create(null), globalLastAttemptAt: 0 };
  if (!db || typeof db.prepare !== "function") return result;
  try {
    const normalizedCodes = Array.isArray(productCodes)
      ? [...new Set(productCodes.map(normalizedProductCode).filter(Boolean))].slice(0, 32)
      : null;
    const query = normalizedCodes
      ? await db.prepare(`SELECT product_code, substr(contract_json, 1, 8192) AS contract_json,
          source_date, expires_at, last_attempt_at
          FROM massive_futures_contract_cache WHERE product_code IN (${[...normalizedCodes, GLOBAL_COOLDOWN_KEY].map(() => "?").join(",")})
          LIMIT ?`).bind(...normalizedCodes, GLOBAL_COOLDOWN_KEY, normalizedCodes.length + 1).all()
      : await db.prepare(
          "SELECT product_code, contract_json, source_date, expires_at, last_attempt_at FROM massive_futures_contract_cache"
        ).all();
    const rows = Array.isArray(query && query.results) ? query.results : [];
    for (const row of rows) {
      if (row && row.product_code === GLOBAL_COOLDOWN_KEY) {
        result.globalLastAttemptAt = finiteTimestamp(row.last_attempt_at);
        continue;
      }
      const productCode = normalizedProductCode(row && row.product_code);
      if (!productCode) continue;
      result.lastAttemptAt[productCode] = finiteTimestamp(row.last_attempt_at);
      const contract = parseCachedContract(row, productCode, today, now);
      if (contract) result.contracts[productCode] = contract;
    }
    result.ok = true;
  } catch { /* Missing/unapplied migration is represented as an unavailable cache. */ }
  return result;
}

async function readOneCacheRow(db, productCode, now, today) {
  const row = await db.prepare(
    "SELECT product_code, contract_json, source_date, expires_at, last_attempt_at FROM massive_futures_contract_cache WHERE product_code = ?"
  ).bind(productCode).first();
  return {
    contract: parseCachedContract(row, productCode, today, now),
    lastAttemptAt: finiteTimestamp(row && row.last_attempt_at)
  };
}

async function claimRefresh(db, productCode, now) {
  const retryAfter = now - MASSIVE_FUTURES_CONTRACT_RETRY_COOLDOWN_MS;
  const row = await db.prepare(`
    INSERT INTO massive_futures_contract_cache (
      product_code, contract_json, source_date, fetched_at, expires_at, last_attempt_at, updated_at
    ) VALUES (?, NULL, NULL, NULL, 0, ?, ?)
    ON CONFLICT(product_code) DO UPDATE SET
      last_attempt_at = excluded.last_attempt_at,
      updated_at = excluded.updated_at
    WHERE massive_futures_contract_cache.last_attempt_at <= ?
    RETURNING product_code
  `).bind(productCode, now, now, retryAfter).first();
  return Boolean(row);
}

async function readGlobalCooldown(db) {
  const row = await db.prepare(
    "SELECT last_attempt_at FROM massive_futures_contract_cache WHERE product_code = ?"
  ).bind(GLOBAL_COOLDOWN_KEY).first();
  return finiteTimestamp(row && row.last_attempt_at);
}

async function markGlobalCooldown(db, now) {
  await db.prepare(`
    INSERT INTO massive_futures_contract_cache (
      product_code, contract_json, source_date, fetched_at, expires_at, last_attempt_at, updated_at
    ) VALUES (?, NULL, NULL, NULL, 0, ?, ?)
    ON CONFLICT(product_code) DO UPDATE SET
      last_attempt_at = excluded.last_attempt_at,
      updated_at = excluded.updated_at
  `).bind(GLOBAL_COOLDOWN_KEY, now, now).run();
}

async function storeContract(db, contract, now) {
  await db.prepare(`
    UPDATE massive_futures_contract_cache
    SET contract_json = ?, source_date = ?, fetched_at = ?, expires_at = ?, updated_at = ?
    WHERE product_code = ? AND last_attempt_at = ?
  `).bind(
    JSON.stringify(contract), contract.asOfDate, now,
    Math.min(nextUtcMidnight(now), now + MASSIVE_FUTURES_CONTRACT_CACHE_TTL_MS), now,
    contract.productCode, now
  ).run();
}

function failure(code, message, { retryAfter = 0 } = {}) {
  return { ok: false, code, message, retryAfter };
}

async function fetchActiveContract({ productCode, apiKey, fetcher, now, timeoutMs }) {
  const date = utcDate(now);
  const url = new URL(MASSIVE_FUTURES_CONTRACTS_PATH, MASSIVE_FUTURES_CONTRACTS_ORIGIN);
  url.searchParams.set("product_code", productCode);
  url.searchParams.set("active", "true");
  url.searchParams.set("date", date);
  url.searchParams.set("type", "single");
  url.searchParams.set("limit", String(MASSIVE_FUTURES_CONTRACT_LIMIT));
  let response;
  try {
    response = await fetcher(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    return failure("massive-futures-contract-network", "Massive's active-contract request failed before a valid response was received.", { retryAfter: MASSIVE_FUTURES_CONTRACT_RETRY_COOLDOWN_MS });
  }
  if (!response || !response.ok) {
    const status = Number(response && response.status) || 0;
    if (status === 401 || status === 403) {
      return failure("massive-futures-contract-unauthorized", "Massive did not authorize the Futures contracts request; Disc4 stays held.", { retryAfter: MASSIVE_FUTURES_CONTRACT_RETRY_COOLDOWN_MS });
    }
    if (status === 429) {
      return failure("massive-futures-contract-rate-limited", "Massive rate-limited the Futures contracts request; Disc4 stays held.", { retryAfter: MASSIVE_FUTURES_CONTRACT_RETRY_COOLDOWN_MS });
    }
    return failure("massive-futures-contract-http", `Massive's Futures contracts endpoint returned HTTP ${status || "error"}; Disc4 stays held.`, { retryAfter: MASSIVE_FUTURES_CONTRACT_RETRY_COOLDOWN_MS });
  }
  let payload;
  try { payload = await response.json(); }
  catch { return failure("massive-futures-contract-invalid-response", "Massive returned an unreadable Futures contracts response; Disc4 stays held.", { retryAfter: MASSIVE_FUTURES_CONTRACT_RETRY_COOLDOWN_MS }); }
  const contract = normalizeMassiveActiveFuturesContract(payload, { productCode, date });
  if (!contract) {
    return failure("massive-futures-contract-unavailable", `Massive returned no verifiable active single contract for ${productCode} on ${date}; Disc4 stays held.`, { retryAfter: MASSIVE_FUTURES_CONTRACT_RETRY_COOLDOWN_MS });
  }
  return { ok: true, contract };
}

/**
 * Resolve today's active contract from Massive, guarded by the caller's shared
 * Massive request allowance and cached in D1. Failures never reuse yesterday's
 * ticker. Call before attempting any futures bars for the product.
 */
export async function getMassiveActiveFuturesContract({
  productCode, apiKey, db, fetcher = globalThis.fetch, now = Date.now(),
  timeoutMs = 12_000, beforeFetch
} = {}) {
  const normalizedCode = normalizedProductCode(productCode);
  if (!normalizedCode) return failure("massive-futures-product-invalid", "The reviewed Massive Futures product code is invalid.");
  if (!db || typeof db.prepare !== "function") return failure("massive-futures-contract-cache-unavailable", "The Futures contract cache is unavailable; Disc4 stays held.");
  const today = utcDate(now);
  let cached;
  try { cached = await readOneCacheRow(db, normalizedCode, now, today); }
  catch { return failure("massive-futures-contract-cache-unavailable", "The Futures contract cache could not be read; Disc4 stays held."); }
  if (cached.contract) return { ok: true, contract: cached.contract, cached: true };
  if (now - cached.lastAttemptAt < MASSIVE_FUTURES_CONTRACT_RETRY_COOLDOWN_MS) {
    return failure("massive-futures-contract-cooldown", `The active ${normalizedCode} contract lookup is cooling down; Disc4 stays held until retry.`, {
      retryAfter: Math.max(0, MASSIVE_FUTURES_CONTRACT_RETRY_COOLDOWN_MS - (now - cached.lastAttemptAt))
    });
  }
  if (typeof apiKey !== "string" || !apiKey.trim()) return failure("massive-not-configured", "Add the MASSIVE_API_KEY Worker secret to verify active Futures contracts.");
  if (typeof fetcher !== "function") return failure("massive-fetch-unavailable", "No fetch implementation is available for Massive Futures contracts.");
  if (typeof beforeFetch !== "function") return failure("massive-call-guard-required", "A shared Massive request reservation is required before contract discovery.");
  let globalLastAttemptAt;
  try { globalLastAttemptAt = await readGlobalCooldown(db); }
  catch { return failure("massive-futures-contract-cache-unavailable", "The Futures contract cooldown could not be read; Disc4 stays held."); }
  if (now - globalLastAttemptAt < MASSIVE_FUTURES_CONTRACT_GLOBAL_COOLDOWN_MS) {
    return failure("massive-futures-contract-circuit-open", "Massive's Futures contracts endpoint is cooling down after an upstream failure; all uncached Disc4 products stay held until retry.", {
      retryAfter: Math.max(0, MASSIVE_FUTURES_CONTRACT_GLOBAL_COOLDOWN_MS - (now - globalLastAttemptAt))
    });
  }

  const flights = flightsFor(db);
  const flightKey = `${today}:${normalizedCode}`;
  const existingFlight = flights.get(flightKey);
  if (existingFlight) return existingFlight;
  const flight = (async () => {
    let reservation;
    try { reservation = await beforeFetch(); }
    catch { return failure("massive-call-guard-unavailable", "The shared Massive request allowance could not be reserved; Disc4 stays held."); }
    if (!reservation || reservation.ok !== true) {
      return failure(
        reservation && reservation.code || "massive-call-guard-unavailable",
        reservation && reservation.message || "The shared Massive request allowance is unavailable; Disc4 stays held."
      );
    }
    let claimed = false;
    try { claimed = await claimRefresh(db, normalizedCode, now); }
    catch { return failure("massive-futures-contract-cache-unavailable", "The Futures contract lookup could not be reserved in D1; Disc4 stays held."); }
    if (!claimed) return failure("massive-futures-contract-cooldown", `Another request is refreshing the active ${normalizedCode} contract; Disc4 stays held.`, {
      retryAfter: MASSIVE_FUTURES_CONTRACT_RETRY_COOLDOWN_MS
    });

    const result = await fetchActiveContract({ productCode: normalizedCode, apiKey: apiKey.trim(), fetcher, now, timeoutMs });
    if (!result.ok) {
      if ([
        "massive-futures-contract-network", "massive-futures-contract-rate-limited",
        "massive-futures-contract-unauthorized", "massive-futures-contract-http",
        "massive-futures-contract-invalid-response"
      ].includes(result.code)) {
        try { await markGlobalCooldown(db, now); } catch { /* The product-level cooldown still fails closed. */ }
      }
      return result;
    }
    try { await storeContract(db, result.contract, now); }
    catch { return failure("massive-futures-contract-cache-write", "The active contract was verified but could not be saved to D1; Disc4 stays held until a cacheable lookup succeeds."); }
    return { ok: true, contract: result.contract, cached: false };
  })();
  flights.set(flightKey, flight);
  try { return await flight; }
  finally { if (flights.get(flightKey) === flight) flights.delete(flightKey); }
}

/** Test-only cache reset to isolate concurrent lookups across test fixtures. */
export function resetMassiveFuturesContractFlightsForTests() {
  inFlightByDb = new WeakMap();
}
