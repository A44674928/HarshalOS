/*
 * HarshalOS — bounded Massive Options EOD field.
 *
 * Options are a derivative field for reviewed Stock Characters, not a second
 * equity-price source. Contract eligibility is bounded in logarithmic strike
 * distance from the underlying EOD price; selection count is fixed and does not
 * grow with distance. The provider is queried only for explicitly selected
 * contracts.
 */

export const MASSIVE_OPTIONS_ORIGIN = "https://api.massive.com";
export const MASSIVE_OPTIONS_CONTRACT_LIMIT = 250;
export const MASSIVE_OPTIONS_SELECTION_SIZE = 4;
/*
 * Published Massive query contract for GET /v3/reference/options/contracts.
 * `sort` is a single documented field, not a comma-joined list: Massive answers
 * `sort=expiration_date,strike_price,ticker` with 400 ERR before any data is
 * read. The request keeps one explicit sort field and fails closed if any
 * parameter would fall outside the documented value sets.
 */
export const MASSIVE_OPTIONS_CONTRACT_SORT_FIELDS = Object.freeze([
  "ticker", "underlying_ticker", "expiration_date", "strike_price"
]);
export const MASSIVE_OPTIONS_CONTRACT_ORDERS = Object.freeze(["asc", "desc"]);
export const MASSIVE_OPTIONS_CONTRACT_LIMIT_MAX = 1000;
export const MASSIVE_OPTIONS_CONTRACT_SORT = "expiration_date";
export const MASSIVE_OPTIONS_CONTRACT_ORDER = "asc";
/* Symmetric log-distance envelope: strikes may be no more than 25% above or
 * 20% below spot in multiplicative price space. This is a domain bound, not a
 * request-density curve. */
export const MASSIVE_OPTIONS_MAX_LOG_STRIKE_DISTANCE = Math.log(1.25);
export const MASSIVE_OPTIONS_PROVIDER = "massive-options";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TICKER = /^[A-Z][A-Z0-9.\-]{0,11}$/;
const OPTION_TICKER = /^O:[A-Z0-9.\-]{1,11}\d{6}[CP]\d{8}$/;

const finite = value => typeof value === "number" && Number.isFinite(value);
const dateValue = value => {
  if (typeof value !== "string" || !DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const at = Date.UTC(year, month - 1, day);
  const date = new Date(at);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export function optionLogStrikeDistance(strike, underlyingPrice) {
  const k = Number(strike);
  const p = Number(underlyingPrice);
  if (!finite(k) || !finite(p) || k <= 0 || p <= 0) return null;
  return Math.log(k / p);
}

export function optionStrikeWithinLogBound(strike, underlyingPrice, maxDistance = MASSIVE_OPTIONS_MAX_LOG_STRIKE_DISTANCE) {
  const distance = optionLogStrikeDistance(strike, underlyingPrice);
  return distance !== null && Math.abs(distance) <= Number(maxDistance);
}

function normalizeContract(value, underlying, today, underlyingPrice = null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const ticker = String(value.ticker || "").trim().toUpperCase();
  const contractType = String(value.contract_type || "").trim().toLowerCase();
  const expiration = String(value.expiration_date || "").trim();
  const strike = Number(value.strike_price);
  const underlyingTicker = String(value.underlying_ticker || underlying).trim().toUpperCase();
  if (!OPTION_TICKER.test(ticker) || !["call", "put"].includes(contractType) ||
      !dateValue(expiration) || expiration < today || !finite(strike) || strike <= 0 ||
      underlyingTicker !== underlying) return null;
  const logStrikeDistance = optionLogStrikeDistance(strike, underlyingPrice);
  return Object.freeze({
    ticker, contractType, expirationDate: expiration, strikePrice: strike,
    ...(logStrikeDistance === null ? {} : { logStrikeDistance })
  });
}

function targetDistance(sign, outer = MASSIVE_OPTIONS_MAX_LOG_STRIKE_DISTANCE) {
  return sign * outer;
}

/*
 * Fixed selection: one near-ATM and one outer-bound representative for each
 * side. The nearest listed contract to each logarithmic target is selected.
 * No extra contracts are requested merely because the chain is wider.
 */
export function selectLogBoundedOptionContracts(contracts, underlyingPrice, {
  maxDistance = MASSIVE_OPTIONS_MAX_LOG_STRIKE_DISTANCE,
  selectionSize = MASSIVE_OPTIONS_SELECTION_SIZE,
  today = new Date().toISOString().slice(0, 10)
} = {}) {
  const price = Number(underlyingPrice);
  if (!finite(price) || price <= 0) return [];
  const normalized = (Array.isArray(contracts) ? contracts : [])
    .map(value => {
      if (!value || typeof value !== "object") return null;
      const ticker = String(value.ticker || "").trim().toUpperCase();
      const contractType = String(value.contract_type || value.contractType || "").trim().toLowerCase();
      const expiration = String(value.expiration_date || value.expirationDate || "").trim();
      const strike = Number(value.strike_price ?? value.strikePrice);
      if (!OPTION_TICKER.test(ticker) || !["call", "put"].includes(contractType) ||
          !dateValue(expiration) || expiration < today || !finite(strike) || strike <= 0) return null;
      const distance = optionLogStrikeDistance(strike, price);
      if (distance === null || Math.abs(distance) > Number(maxDistance)) return null;
      return { ticker, contractType, expirationDate: expiration, strikePrice: strike, logStrikeDistance: distance };
    })
    .filter(Boolean);

  const expirations = [...new Set(normalized.map(item => item.expirationDate))].sort();
  if (!expirations.length) return [];
  const expiration = expirations[0];
  const chain = normalized.filter(item => item.expirationDate === expiration);
  const targets = [
    { type: "call", distance: targetDistance(0, 0) },
    { type: "call", distance: targetDistance(1, maxDistance) },
    { type: "put", distance: targetDistance(0, 0) },
    { type: "put", distance: targetDistance(-1, maxDistance) }
  ];
  const selected = [];
  for (const target of targets) {
    const candidates = chain.filter(item => item.contractType === target.type && !selected.some(x => x.ticker === item.ticker));
    candidates.sort((a, b) => Math.abs(a.logStrikeDistance - target.distance) - Math.abs(b.logStrikeDistance - target.distance) ||
      Math.abs(a.logStrikeDistance) - Math.abs(b.logStrikeDistance) ||
      a.ticker.localeCompare(b.ticker));
    if (candidates[0]) selected.push(candidates[0]);
    if (selected.length >= Math.max(1, Math.min(Number(selectionSize) || 4, 4))) break;
  }
  return selected;
}

async function readJsonResponse(response) {
  try { return await response.json(); } catch { return null; }
}

async function requestJson(url, apiKey, fetcher, timeoutMs = 10_000) {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetcher(url, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${apiKey.trim()}` },
      redirect: "manual",
      ...(controller ? { signal: controller.signal } : {})
    });
    const payload = await readJsonResponse(response);
    if (!response?.ok) {
      const status = Number(response?.status) || 0;
      return { ok: false, code: status === 429 ? "massive-options-rate-limit" : "massive-options-upstream", status, payload };
    }
    return { ok: true, payload };
  } catch (error) {
    return { ok: false, code: "massive-options-fetch-failed", message: String(error?.message || "fetch failed").slice(0, 160) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function discoverMassiveOptionContracts({
  underlying, underlyingPrice = null, apiKey, fetcher = globalThis.fetch,
  today = new Date().toISOString().slice(0, 10), timeoutMs = 10_000
} = {}) {
  const symbol = String(underlying || "").trim().toUpperCase();
  if (!TICKER.test(symbol)) return { ok: false, attempted: false, code: "options-underlying-refused", message: "The underlying is not a reviewed stock ticker." };
  if (!apiKey?.trim()) return { ok: false, attempted: false, code: "massive-options-not-configured", message: "Add MASSIVE_API_KEY to enable the Stocks Options Field." };
  const requestDate = String(today ?? "").trim();
  if (!dateValue(requestDate)) return { ok: false, attempted: false, code: "options-date-refused", message: "A valid request date is required for the options contract list." };
  const limit = Number(MASSIVE_OPTIONS_CONTRACT_LIMIT);
  if (!MASSIVE_OPTIONS_CONTRACT_SORT_FIELDS.includes(MASSIVE_OPTIONS_CONTRACT_SORT) ||
      !MASSIVE_OPTIONS_CONTRACT_ORDERS.includes(MASSIVE_OPTIONS_CONTRACT_ORDER) ||
      !Number.isInteger(limit) || limit < 1 || limit > MASSIVE_OPTIONS_CONTRACT_LIMIT_MAX) {
    return { ok: false, attempted: false, code: "options-request-refused", message: "The options contract request cannot be expressed with the documented Massive query parameters." };
  }
  const url = new URL("/v3/reference/options/contracts", MASSIVE_OPTIONS_ORIGIN);
  url.searchParams.set("underlying_ticker", symbol);
  url.searchParams.set("expiration_date.gte", requestDate);
  url.searchParams.set("order", MASSIVE_OPTIONS_CONTRACT_ORDER);
  url.searchParams.set("sort", MASSIVE_OPTIONS_CONTRACT_SORT);
  url.searchParams.set("limit", String(limit));
  const result = await requestJson(url.toString(), apiKey, fetcher, timeoutMs);
  if (!result.ok) return { ...result, attempted: true, message: result.message || "Massive did not provide the options contract list." };
  const results = Array.isArray(result.payload?.results) ? result.payload.results : [];
  return {
    ok: true,
    attempted: true,
    contracts: results.map(item => normalizeContract(item, symbol, today, underlyingPrice)).filter(Boolean)
  };
}

export async function fetchMassiveOptionDailyBar({
  optionsTicker, apiKey, fetcher = globalThis.fetch, date, timeoutMs = 10_000
} = {}) {
  const ticker = String(optionsTicker || "").trim().toUpperCase();
  if (!OPTION_TICKER.test(ticker)) return { ok: false, attempted: false, code: "options-contract-refused", message: "The selected options contract ticker is invalid." };
  if (!apiKey?.trim()) return { ok: false, attempted: false, code: "massive-options-not-configured", message: "Add MASSIVE_API_KEY to enable the Stocks Options Field." };
  const targetDate = String(date || "").trim();
  if (!dateValue(targetDate)) return { ok: false, attempted: false, code: "options-date-refused", message: "A valid EOD date is required." };
  const url = new URL(`/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${targetDate}/${targetDate}`, MASSIVE_OPTIONS_ORIGIN);
  url.searchParams.set("adjusted", "true");
  url.searchParams.set("sort", "asc");
  url.searchParams.set("limit", "1");
  const result = await requestJson(url.toString(), apiKey, fetcher, timeoutMs);
  if (!result.ok) return { ...result, attempted: true, message: result.message || "Massive did not provide the options daily bar." };
  const row = Array.isArray(result.payload?.results) ? result.payload.results[0] : null;
  if (!row) return { ok: false, attempted: true, code: "massive-options-no-bar", message: "No completed EOD options bar was supplied for the selected contract." };
  const values = ["o","h","l","c"].map(key => Number(row[key]));
  if (!values.every(value => finite(value) && value > 0) || values[2] > Math.min(values[0], values[3]) || values[1] < Math.max(values[0], values[3])) {
    return { ok: false, attempted: true, code: "massive-options-invalid-bar", message: "Massive returned an invalid options OHLC bar." };
  }
  return {
    ok: true, attempted: true,
    bar: {
      time: Number(row.t) || Date.parse(`${targetDate}T00:00:00.000Z`),
      open: values[0], high: values[1], low: values[2], close: values[3],
      ...(finite(Number(row.v)) && Number(row.v) >= 0 ? { volume: Number(row.v) } : {}),
      confirmed: true
    }
  };
}
