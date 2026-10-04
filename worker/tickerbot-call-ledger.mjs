/*
 * HarshalOS — durable Tickerbot call allowance.
 *
 * A single aggregate row per UTC month is shared by every Worker route that uses
 * TICKERBOT_API_KEY. The atomic UPSERT claims one slot immediately before a provider
 * fetch; it refuses once the configured monthly limit is reached. Failed/time-out fetches
 * remain counted conservatively because the provider may have received the request.
 *
 * This is an allowance counter, not a provider billing record: direct calls that bypass
 * these Worker routes are not visible here, and Tickerbot's dashboard remains authoritative.
 */

export const TICKERBOT_CALL_LEDGER_SCHEMA = "tickerbot-call-ledger-v1";
export const TICKERBOT_PROVIDER_MONTHLY_BUDGET = 10_000;
export const TICKERBOT_PLANNER_RESERVE_RATIO = 0.15;
/* The regular planner uses 8,500 calls and leaves 1,500 as reserve. Its explicit stretch
   option may spend into that reserve; the Worker hard stop remains the provider's 10,000. */
export const TICKERBOT_WORKER_MONTHLY_LIMIT = TICKERBOT_PROVIDER_MONTHLY_BUDGET;
export const TICKERBOT_CALL_LEDGER_NOTE =
  "Aggregate count of Worker-routed Tickerbot fetch attempts across Characters and Good Intelligence. Failed attempts are counted conservatively; calls made outside this Worker are excluded. Tickerbot's provider dashboard is the billing authority.";

const UPSERT_ATTEMPT = `INSERT INTO tickerbot_call_ledger
  (utc_month, attempted_calls, provider_budget, worker_limit, updated_at)
  VALUES (?, 1, ?, ?, ?)
  ON CONFLICT(utc_month) DO UPDATE SET
    attempted_calls = tickerbot_call_ledger.attempted_calls + 1,
    provider_budget = excluded.provider_budget,
    worker_limit = excluded.worker_limit,
    updated_at = excluded.updated_at
  WHERE tickerbot_call_ledger.attempted_calls < excluded.worker_limit
  RETURNING utc_month, attempted_calls, provider_budget, worker_limit, updated_at`;

const READ_MONTH = `SELECT utc_month, attempted_calls, provider_budget, worker_limit, updated_at
  FROM tickerbot_call_ledger WHERE utc_month = ?`;

export function tickerbotUtcMonth(at = Date.now()) {
  const timestamp = Number(at);
  const date = new Date(Number.isFinite(timestamp) ? timestamp : Date.now());
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function safeLimits({ providerBudget = TICKERBOT_PROVIDER_MONTHLY_BUDGET,
  workerLimit = TICKERBOT_WORKER_MONTHLY_LIMIT } = {}) {
  const budget = Math.floor(Number(providerBudget));
  const limit = Math.floor(Number(workerLimit));
  if (!Number.isSafeInteger(budget) || budget < 1 ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > budget) return null;
  return { providerBudget: budget, workerLimit: limit };
}

function usageFromRow(row, month, limits) {
  const calls = Math.max(0, Math.floor(Number(row && row.attempted_calls) || 0));
  const providerBudget = Math.max(1, Math.floor(Number(row && row.provider_budget) || limits.providerBudget));
  const workerLimit = Math.max(1, Math.min(providerBudget,
    Math.floor(Number(row && row.worker_limit) || limits.workerLimit)));
  const remaining = Math.max(0, workerLimit - calls);
  const updatedAt = Number(row && row.updated_at);
  return Object.freeze({
    schema: TICKERBOT_CALL_LEDGER_SCHEMA,
    month: String(row && row.utc_month || month),
    calls,
    providerBudget,
    workerLimit,
    reserveCalls: Math.max(0, providerBudget - Math.floor(providerBudget * (1 - TICKERBOT_PLANNER_RESERVE_RATIO))),
    remaining,
    exhausted: calls >= workerLimit,
    updatedAt: Number.isFinite(updatedAt) && updatedAt >= 0 ? updatedAt : null,
    scope: "Worker-routed Tickerbot calls; shared by Characters and Good Intelligence",
    note: TICKERBOT_CALL_LEDGER_NOTE
  });
}

function unavailable() {
  return {
    ok: false,
    reason: "ledger-unavailable",
    message: "The durable Tickerbot call ledger is unavailable. No new provider request was sent. Apply the D1 migration and retry, or use Synthetic rehearsal."
  };
}

/* Read only the indexed month row (or return a zero-use snapshot before the first call). */
export async function readTickerbotCallLedger(db, at = Date.now(), requestedLimits) {
  const limits = safeLimits(requestedLimits);
  if (!limits || !db || typeof db.prepare !== "function") return unavailable();
  const month = tickerbotUtcMonth(at);
  try {
    const row = await db.prepare(READ_MONTH).bind(month).first();
    return { ok: true, ledger: usageFromRow(row, month, limits) };
  } catch {
    return unavailable();
  }
}

/*
 * Atomically claim one Worker call slot immediately before `fetch()`. The UPSERT's
 * WHERE condition is evaluated with the current row value, so simultaneous isolates
 * cannot both claim the final slot. A rejected claim does not change the aggregate row.
 */
export async function claimTickerbotCall(db, at = Date.now(), requestedLimits) {
  const limits = safeLimits(requestedLimits);
  if (!limits || !db || typeof db.prepare !== "function") return unavailable();
  const timestamp = Number(at);
  const now = Number.isFinite(timestamp) && timestamp >= 0 ? Math.floor(timestamp) : Date.now();
  const month = tickerbotUtcMonth(now);
  try {
    const row = await db.prepare(UPSERT_ATTEMPT)
      .bind(month, limits.providerBudget, limits.workerLimit, now)
      .first();
    if (row) return { ok: true, ledger: usageFromRow(row, month, limits) };

    const current = await readTickerbotCallLedger(db, now, limits);
    if (!current.ok) return current;
    if (current.ledger.exhausted) {
      return {
        ok: false,
        reason: "budget-exhausted",
        ledger: current.ledger,
        message: `The Worker-routed Tickerbot allowance is exhausted for ${month}: ${current.ledger.calls.toLocaleString()} of ${current.ledger.workerLimit.toLocaleString()} calls. No provider request was sent.`
      };
    }
    /* A missing RETURNING row below the limit is not a safe basis for an outbound call. */
    return unavailable();
  } catch {
    return unavailable();
  }
}
