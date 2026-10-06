/*
 * HarshalOS — durable Massive per-UTC-day request telemetry.
 *
 * Characters records one Worker-routed Massive attempt after the provider-class
 * reservation succeeds. The Massive account's own per-asset-class limits remain
 * binding; this D1 counter is historical/audit telemetry, not a provider gate.
 */

export const MASSIVE_DAILY_CALL_LEDGER_SCHEMA = "massive-daily-call-ledger-v1";
/* 5 requests/minute is enforced separately by worker/massive.mjs. A daily
   allowance of 300 leaves room for the reviewed rosters while preventing an
   accidental all-day loop from becoming unbounded. */
export const MASSIVE_PROVIDER_DAILY_LIMIT = 300;
export const MASSIVE_DAILY_CALL_LEDGER_NOTE =
  "Aggregate telemetry count of Worker-routed Massive Characters requests, reset by UTC day. The legacy dailyLimit field is retained for historical observability only and is not a provider gate; Massive provider pacing is enforced per asset class per minute.";

const UPSERT_ATTEMPT = `INSERT INTO massive_daily_call_ledger
  (utc_day, attempted_calls, daily_limit, updated_at)
  VALUES (?, 1, ?, ?)
  ON CONFLICT(utc_day) DO UPDATE SET
    attempted_calls = massive_daily_call_ledger.attempted_calls + 1,
    daily_limit = excluded.daily_limit,
    updated_at = excluded.updated_at
  WHERE massive_daily_call_ledger.attempted_calls < excluded.daily_limit
  RETURNING utc_day, attempted_calls, daily_limit, updated_at`;

const READ_DAY = `SELECT utc_day, attempted_calls, daily_limit, updated_at
  FROM massive_daily_call_ledger WHERE utc_day = ?`;

export function massiveUtcDay(at = Date.now()) {
  const timestamp = Number(at);
  return new Date(Number.isFinite(timestamp) ? timestamp : Date.now()).toISOString().slice(0, 10);
}

function safeDailyLimit(value = MASSIVE_PROVIDER_DAILY_LIMIT) {
  const limit = Math.floor(Number(value));
  return Number.isSafeInteger(limit) && limit > 0 ? limit : null;
}

function usageFromRow(row, day, requestedLimit) {
  const calls = Math.max(0, Math.floor(Number(row && row.attempted_calls) || 0));
  const dailyLimit = Math.max(1, Math.floor(Number(row && row.daily_limit) || requestedLimit));
  const updatedAt = Number(row && row.updated_at);
  return Object.freeze({
    schema: MASSIVE_DAILY_CALL_LEDGER_SCHEMA,
    day: String(row && row.utc_day || day),
    calls,
    dailyLimit,
    remaining: Math.max(0, dailyLimit - calls),
    exhausted: calls >= dailyLimit,
    updatedAt: Number.isFinite(updatedAt) && updatedAt >= 0 ? updatedAt : null,
    scope: "Characters Massive daily beat requests by UTC day; Worker-routed calls only",
    note: MASSIVE_DAILY_CALL_LEDGER_NOTE
  });
}

function unavailable() {
  return {
    ok: false,
    reason: "massive-ledger-unavailable",
    message: "The durable Massive per-UTC-day request ledger is unavailable. No Massive request was sent. Apply D1 migration 0007 and retry."
  };
}

/** Read the indexed row for this UTC day, or a zero-use snapshot before a call. */
export async function readMassiveDailyCallLedger(db, at = Date.now(), requestedLimit) {
  const dailyLimit = safeDailyLimit(requestedLimit);
  if (!dailyLimit || !db || typeof db.prepare !== "function") return unavailable();
  const day = massiveUtcDay(at);
  try {
    const row = await db.prepare(READ_DAY).bind(day).first();
    return { ok: true, ledger: usageFromRow(row, day, dailyLimit) };
  } catch {
    return unavailable();
  }
}

/**
 * Record one Worker-routed attempt without imposing a daily provider limit.
 * The legacy daily_limit column remains for historical observability.
 */
export async function recordMassiveDailyCall(db, at = Date.now(), requestedLimit = MASSIVE_PROVIDER_DAILY_LIMIT) {
  const dailyLimit = safeDailyLimit(requestedLimit);
  if (!dailyLimit || !db || typeof db.prepare !== "function") return unavailable();
  const input = Number(at);
  const now = Number.isFinite(input) && input >= 0 ? Math.floor(input) : Date.now();
  const day = massiveUtcDay(now);
  const upsert = `INSERT INTO massive_daily_call_ledger
    (utc_day, attempted_calls, daily_limit, updated_at)
    VALUES (?, 1, ?, ?)
    ON CONFLICT(utc_day) DO UPDATE SET
      attempted_calls = massive_daily_call_ledger.attempted_calls + 1,
      daily_limit = excluded.daily_limit,
      updated_at = excluded.updated_at
    RETURNING utc_day, attempted_calls, daily_limit, updated_at`;
  try {
    const row = await db.prepare(upsert).bind(day, dailyLimit, now).first();
    return row ? { ok: true, ledger: usageFromRow(row, day, dailyLimit) } : unavailable();
  } catch {
    return unavailable();
  }
}

/**
 * Atomically reserve one slot. The predicate is evaluated by D1 during the
 * UPSERT, so concurrent isolates cannot both obtain the final allowance.
 */
export async function claimMassiveDailyCall(db, at = Date.now(), requestedLimit) {
  const dailyLimit = safeDailyLimit(requestedLimit);
  if (!dailyLimit || !db || typeof db.prepare !== "function") return unavailable();
  const input = Number(at);
  const now = Number.isFinite(input) && input >= 0 ? Math.floor(input) : Date.now();
  const day = massiveUtcDay(now);
  try {
    const row = await db.prepare(UPSERT_ATTEMPT).bind(day, dailyLimit, now).first();
    if (row) return { ok: true, ledger: usageFromRow(row, day, dailyLimit) };

    const current = await readMassiveDailyCallLedger(db, now, dailyLimit);
    if (!current.ok) return current;
    if (current.ledger.exhausted) {
      return {
        ok: false,
        reason: "massive-budget-exhausted",
        ledger: current.ledger,
        message: `The Characters Massive request allowance is exhausted for ${day} UTC: ${current.ledger.calls.toLocaleString()} of ${current.ledger.dailyLimit.toLocaleString()} Worker-routed requests. No Massive request was sent.`
      };
    }
    /* An absent RETURNING row below the cap is not a safe basis for an outbound call. */
    return unavailable();
  } catch {
    return unavailable();
  }
}
