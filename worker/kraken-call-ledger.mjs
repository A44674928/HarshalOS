/* Shared fail-closed pacing and daily safety ledger for Kraken public Spot calls.
 *
 * Kraken publishes endpoint-specific IP limits rather than a single daily quota.
 * HarshalOS therefore applies its own conservative one-request-per-second gate
 * and a 160-attempt UTC-day ceiling across Characters and Orb 2. The ceiling is
 * an application safety limit, not a Kraken entitlement or quota. */

export const KRAKEN_PROVIDER_DAILY_LIMIT = 160;
export const KRAKEN_MIN_INTERVAL_MS = 1_000;
export const KRAKEN_LEDGER_SCHEMA = "kraken-public-call-ledger-v1";

const SELECT = `SELECT utc_day, attempted_calls, daily_limit, last_call_at, updated_at
  FROM kraken_public_call_ledger WHERE id = 1`;
const CLAIM = `INSERT INTO kraken_public_call_ledger
    (id, utc_day, attempted_calls, daily_limit, last_call_at, updated_at)
  VALUES (1, ?, 1, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    utc_day = excluded.utc_day,
    attempted_calls = CASE
      WHEN kraken_public_call_ledger.utc_day = excluded.utc_day
        THEN kraken_public_call_ledger.attempted_calls + 1
      ELSE 1
    END,
    daily_limit = excluded.daily_limit,
    last_call_at = excluded.last_call_at,
    updated_at = excluded.updated_at
  WHERE kraken_public_call_ledger.last_call_at <= excluded.last_call_at - ?
    AND (kraken_public_call_ledger.utc_day <> excluded.utc_day
      OR kraken_public_call_ledger.attempted_calls < excluded.daily_limit)
  RETURNING utc_day, attempted_calls, daily_limit, last_call_at, updated_at`;

const utcDay = at => new Date(Number(at)).toISOString().slice(0, 10);
const failure = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });
const isRecord = value => value && typeof value === "object" && !Array.isArray(value);
const positiveInteger = (value, fallback) => Number.isSafeInteger(Number(value)) && Number(value) > 0
  ? Number(value) : fallback;

function normalizeRow(row, now, dailyLimit = KRAKEN_PROVIDER_DAILY_LIMIT) {
  const day = utcDay(now);
  const lastCallAt = Number(row && row.last_call_at);
  const storedDay = typeof row?.utc_day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.utc_day)
    ? row.utc_day : "";
  const callsOnStoredDay = Number.isSafeInteger(Number(row?.attempted_calls)) && Number(row.attempted_calls) >= 0
    ? Number(row.attempted_calls) : 0;
  const storedLimit = positiveInteger(row?.daily_limit, dailyLimit);
  const calls = storedDay === day ? callsOnStoredDay : 0;
  const limit = Math.max(1, Math.min(KRAKEN_PROVIDER_DAILY_LIMIT, storedLimit));
  return Object.freeze({
    schema: KRAKEN_LEDGER_SCHEMA,
    day,
    calls,
    dailyLimit: limit,
    remaining: Math.max(0, limit - calls),
    exhausted: calls >= limit,
    lastCallAt: Number.isSafeInteger(lastCallAt) && lastCallAt >= 0 ? lastCallAt : 0,
    updatedAt: Number(row && row.updated_at) || 0,
    minIntervalMs: KRAKEN_MIN_INTERVAL_MS,
    note: "Shared Worker ledger; one outbound Kraken public Spot request per second and a conservative 160-attempt application ceiling per UTC day."
  });
}

/** Read the shared ledger without making a Kraken request. */
export async function readKrakenCallLedger(db, now = Date.now()) {
  const current = Number.isFinite(Number(now)) && Number(now) >= 0 ? Math.floor(Number(now)) : Date.now();
  if (!db || typeof db.prepare !== "function") {
    return failure("kraken-ledger-unavailable", "Bind COMMUNITY_DB and apply migration 0012_kraken_public_crypto.sql before making a Kraken request.");
  }
  try {
    const row = await db.prepare(SELECT).first();
    return { ok: true, ledger: normalizeRow(row, current) };
  } catch {
    return failure("kraken-ledger-unavailable", "The shared Kraken pacing ledger is unavailable. No public market-data request was sent.");
  }
}

/** Atomically reserve one outbound public Spot request across Worker isolates. */
export async function claimKrakenCall(db, now = Date.now(), dailyLimit = KRAKEN_PROVIDER_DAILY_LIMIT) {
  const current = Number.isFinite(Number(now)) && Number(now) >= 0 ? Math.floor(Number(now)) : Date.now();
  const limit = Math.max(1, Math.min(KRAKEN_PROVIDER_DAILY_LIMIT, Math.floor(Number(dailyLimit) || KRAKEN_PROVIDER_DAILY_LIMIT)));
  if (!db || typeof db.prepare !== "function") {
    return failure("kraken-ledger-unavailable", "Bind COMMUNITY_DB and apply migration 0012_kraken_public_crypto.sql before making a Kraken request.");
  }
  try {
    const claimed = await db.prepare(CLAIM)
      .bind(utcDay(current), limit, current, current, KRAKEN_MIN_INTERVAL_MS)
      .first();
    if (claimed) return { ok: true, ledger: normalizeRow(claimed, current, limit) };

    const state = await readKrakenCallLedger(db, current);
    if (!state.ok) return state;
    if (state.ledger.exhausted) {
      return failure("kraken-budget-exhausted",
        `The shared Kraken application safety ceiling is spent for ${state.ledger.day} UTC (${state.ledger.calls}/${state.ledger.dailyLimit}). No request was sent.`,
        { ledger: state.ledger });
    }
    const elapsed = current - state.ledger.lastCallAt;
    if (state.ledger.lastCallAt > 0 && elapsed < KRAKEN_MIN_INTERVAL_MS) {
      const retryAfterMs = Math.max(1, KRAKEN_MIN_INTERVAL_MS - Math.max(0, elapsed));
      return failure("kraken-rate-limit",
        "The shared Kraken pacing guard allows at most one outbound request per second. No request was sent.",
        { ledger: state.ledger, retryAfterMs });
    }
    return failure("kraken-ledger-unavailable", "The Kraken request could not be reserved atomically. No request was sent.");
  } catch {
    return failure("kraken-ledger-unavailable", "The shared Kraken pacing ledger is unavailable. No public market-data request was sent.");
  }
}

export const krakenCallLedgerInternals = Object.freeze({ utcDay, normalizeRow, SELECT, CLAIM });
