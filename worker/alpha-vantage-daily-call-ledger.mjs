/*
 * HarshalOS — durable Alpha Vantage daily fallback allowance.
 *
 * Characters uses this independent D1 counter only for TIME_SERIES_DAILY compact
 * requests. It is deliberately separate from Tickerbot's UTC-month counter. Each
 * outbound attempt claims one slot atomically before fetch, including attempts that
 * later time out or fail. Direct Alpha Vantage calls outside this Worker are excluded;
 * the provider account remains the billing/entitlement authority.
 */

export const ALPHA_VANTAGE_DAILY_CALL_LEDGER_SCHEMA = "alpha-vantage-daily-call-ledger-v1";
export const ALPHA_VANTAGE_PROVIDER_DAILY_LIMIT = 25;
export const ALPHA_VANTAGE_DAILY_CALL_LEDGER_NOTE =
  "Aggregate count of Worker-routed Alpha Vantage TIME_SERIES_DAILY compact attempts for the Characters fallback. Failed attempts count conservatively. Calls outside this Worker are excluded; Alpha Vantage account usage remains authoritative.";

const UPSERT_ATTEMPT = `INSERT INTO alpha_vantage_daily_call_ledger
  (utc_day, attempted_calls, daily_limit, updated_at)
  VALUES (?, 1, ?, ?)
  ON CONFLICT(utc_day) DO UPDATE SET
    attempted_calls = alpha_vantage_daily_call_ledger.attempted_calls + 1,
    daily_limit = excluded.daily_limit,
    updated_at = excluded.updated_at
  WHERE alpha_vantage_daily_call_ledger.attempted_calls < excluded.daily_limit
  RETURNING utc_day, attempted_calls, daily_limit, updated_at`;

const READ_DAY = `SELECT utc_day, attempted_calls, daily_limit, updated_at
  FROM alpha_vantage_daily_call_ledger WHERE utc_day = ?`;

export function alphaVantageUtcDay(at = Date.now()) {
  const timestamp = Number(at);
  const date = new Date(Number.isFinite(timestamp) ? timestamp : Date.now());
  return date.toISOString().slice(0, 10);
}

function safeDailyLimit(value = ALPHA_VANTAGE_PROVIDER_DAILY_LIMIT) {
  const dailyLimit = Math.floor(Number(value));
  return Number.isSafeInteger(dailyLimit) && dailyLimit > 0 ? dailyLimit : null;
}

function usageFromRow(row, day, requestedLimit) {
  const calls = Math.max(0, Math.floor(Number(row && row.attempted_calls) || 0));
  const dailyLimit = Math.max(1, Math.floor(Number(row && row.daily_limit) || requestedLimit));
  const remaining = Math.max(0, dailyLimit - calls);
  const updatedAt = Number(row && row.updated_at);
  return Object.freeze({
    schema: ALPHA_VANTAGE_DAILY_CALL_LEDGER_SCHEMA,
    day: String(row && row.utc_day || day),
    calls,
    dailyLimit,
    remaining,
    exhausted: calls >= dailyLimit,
    updatedAt: Number.isFinite(updatedAt) && updatedAt >= 0 ? updatedAt : null,
    scope: "Characters Alpha Vantage daily fallback; Worker-routed calls only",
    note: ALPHA_VANTAGE_DAILY_CALL_LEDGER_NOTE
  });
}

function unavailable() {
  return {
    ok: false,
    reason: "alpha-vantage-ledger-unavailable",
    message: "The durable Alpha Vantage daily call ledger is unavailable. No Alpha Vantage request was sent. Apply D1 migration 0006 and retry."
  };
}

/* Read the one indexed UTC-day row, or report a zero-use snapshot before the first call. */
export async function readAlphaVantageDailyCallLedger(db, at = Date.now(), requestedLimit) {
  const dailyLimit = safeDailyLimit(requestedLimit);
  if (!dailyLimit || !db || typeof db.prepare !== "function") return unavailable();
  const day = alphaVantageUtcDay(at);
  try {
    const row = await db.prepare(READ_DAY).bind(day).first();
    return { ok: true, ledger: usageFromRow(row, day, dailyLimit) };
  } catch {
    return unavailable();
  }
}

/*
 * Atomically claim one daily slot immediately before fetch(). The SQL predicate is
 * evaluated against the current row, so concurrent Worker isolates cannot pass the
 * final slot together. A refused claim does not alter the aggregate.
 */
export async function claimAlphaVantageDailyCall(db, at = Date.now(), requestedLimit) {
  const dailyLimit = safeDailyLimit(requestedLimit);
  if (!dailyLimit || !db || typeof db.prepare !== "function") return unavailable();
  const timestamp = Number(at);
  const now = Number.isFinite(timestamp) && timestamp >= 0 ? Math.floor(timestamp) : Date.now();
  const day = alphaVantageUtcDay(now);
  try {
    const row = await db.prepare(UPSERT_ATTEMPT).bind(day, dailyLimit, now).first();
    if (row) return { ok: true, ledger: usageFromRow(row, day, dailyLimit) };

    const current = await readAlphaVantageDailyCallLedger(db, now, dailyLimit);
    if (!current.ok) return current;
    if (current.ledger.exhausted) {
      return {
        ok: false,
        reason: "alpha-vantage-budget-exhausted",
        ledger: current.ledger,
        message: `The Characters Alpha Vantage fallback allowance is exhausted for ${day}: ${current.ledger.calls.toLocaleString()} of ${current.ledger.dailyLimit.toLocaleString()} Worker-routed requests. No Alpha Vantage request was sent.`
      };
    }
    /* No RETURNING row below the limit is not a safe basis for an outbound request. */
    return unavailable();
  } catch {
    return unavailable();
  }
}
