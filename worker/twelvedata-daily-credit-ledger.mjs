/*
 * HarshalOS — durable Twelve Data daily credit allowance.
 *
 * Twelve Data's free Basic plan gives 800 API credits per day. The field's Twelve Data
 * lane makes one single-symbol daily time-series call per beat, which this module
 * treats as one credit (TWELVEDATA_CREDITS_PER_CALL). The count is charged before each
 * call, including calls that fail, so a 429 or a timeout can never be retried past the
 * allowance. The day is the UTC day.
 *
 * Both the Worker's Cron tick and the off-Cloudflare runner use this one D1 row, so
 * the two cannot spend the same day's credits twice. The per-minute envelope (8/min)
 * stays in twelvedata-call-guard.mjs.
 */

export const TWELVEDATA_DAILY_CREDIT_LIMIT = 800;
export const TWELVEDATA_CREDITS_PER_CALL = 1;
export const TWELVEDATA_DAILY_CREDIT_SCHEMA = "twelvedata-daily-credit-ledger-v1";

const UPSERT_CLAIM = `INSERT INTO twelvedata_daily_credit_ledger
    (utc_day, credits, daily_limit, updated_at)
    VALUES (?, ?, ?, ?)
  ON CONFLICT(utc_day) DO UPDATE SET
    credits = twelvedata_daily_credit_ledger.credits + excluded.credits,
    daily_limit = excluded.daily_limit,
    updated_at = excluded.updated_at
  WHERE twelvedata_daily_credit_ledger.credits + excluded.credits <= excluded.daily_limit
  RETURNING utc_day, credits, daily_limit, updated_at`;

const READ_DAY = `SELECT utc_day, credits, daily_limit, updated_at
  FROM twelvedata_daily_credit_ledger WHERE utc_day = ?`;

export function twelvedataUtcDay(at = Date.now()) {
  const timestamp = Number(at);
  return new Date(Number.isFinite(timestamp) ? timestamp : Date.now()).toISOString().slice(0, 10);
}

function safeInteger(value, fallback, minimum) {
  const number = Math.floor(Number(value));
  return Number.isSafeInteger(number) && number >= minimum ? number : fallback;
}

function usageFromRow(row, day, dailyLimit) {
  const credits = Math.max(0, Math.floor(Number(row && row.credits) || 0));
  const limit = Math.max(1, Math.floor(Number(row && row.daily_limit) || dailyLimit));
  const updatedAt = Number(row && row.updated_at);
  return Object.freeze({
    schema: TWELVEDATA_DAILY_CREDIT_SCHEMA,
    day: String(row && row.utc_day || day),
    credits,
    dailyLimit: limit,
    remaining: Math.max(0, limit - credits),
    exhausted: credits >= limit,
    updatedAt: Number.isFinite(updatedAt) && updatedAt >= 0 ? updatedAt : null
  });
}

function unavailable() {
  return {
    ok: false,
    reason: "twelvedata-ledger-unavailable",
    message: "The durable Twelve Data daily credit ledger is unavailable. No Twelve Data request was sent. Apply D1 migration 0019 and retry."
  };
}

/** Read this UTC day's credit usage, or a zero-use snapshot before the first call. */
export async function readTwelveDataDailyCredits(db, at = Date.now(), { dailyLimit = TWELVEDATA_DAILY_CREDIT_LIMIT } = {}) {
  const limit = safeInteger(dailyLimit, TWELVEDATA_DAILY_CREDIT_LIMIT, 1);
  if (!db || typeof db.prepare !== "function") return unavailable();
  const day = twelvedataUtcDay(at);
  try {
    const row = await db.prepare(READ_DAY).bind(day).first();
    return { ok: true, ledger: usageFromRow(row, day, limit) };
  } catch {
    return unavailable();
  }
}

/**
 * Atomically reserve credits for one provider call. The predicate is evaluated by D1
 * inside the UPSERT, so concurrent invocations cannot both take the last credits.
 * Refuses (without a provider call) once the day's allowance would be exceeded.
 */
export async function claimTwelveDataDailyCredits(db, at = Date.now(), {
  credits = TWELVEDATA_CREDITS_PER_CALL,
  dailyLimit = TWELVEDATA_DAILY_CREDIT_LIMIT
} = {}) {
  const cost = safeInteger(credits, TWELVEDATA_CREDITS_PER_CALL, 1);
  const limit = safeInteger(dailyLimit, TWELVEDATA_DAILY_CREDIT_LIMIT, 1);
  if (!db || typeof db.prepare !== "function" || cost > limit) return unavailable();
  const input = Number(at);
  const now = Number.isFinite(input) && input >= 0 ? Math.floor(input) : Date.now();
  const day = twelvedataUtcDay(now);
  try {
    const row = await db.prepare(UPSERT_CLAIM).bind(day, cost, limit, now).first();
    if (row) return { ok: true, ledger: usageFromRow(row, day, limit) };
    /* No row back: the day's allowance would be exceeded by this call. */
    const current = await readTwelveDataDailyCredits(db, now, { dailyLimit: limit });
    if (!current.ok) return current;
    return {
      ok: false,
      reason: "twelvedata-daily-limit",
      message: `The Twelve Data daily credit allowance (${current.ledger.dailyLimit}/day) is spent for ${day}. No Twelve Data request was sent.`,
      ledger: current.ledger
    };
  } catch {
    return unavailable();
  }
}
