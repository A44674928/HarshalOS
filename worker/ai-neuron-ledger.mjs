/*
 * HarshalOS — durable Workers AI Neuron allowance.
 *
 * A single aggregate row per UTC day is shared by every Worker route that uses
 * the AI binding. The free allocation is 10,000 Neurons per day; the atomic
 * UPSERT claims one call's conservative estimate immediately before generation
 * and refuses once the Worker limit is reached. Estimates are ceilings (input
 * characters plus the reserved output ceiling at the model's published rates),
 * so the ledger can only over-count, never silently overspend: a refused call
 * sends nothing, and the provider dashboard remains the billing authority.
 *
 * This mirrors worker/tickerbot-call-ledger.mjs deliberately: one aggregate
 * row, one atomic claim, and a fail-closed "unavailable" state when D1 cannot
 * answer. The relay falls back to an isolate-local daily counter only when no
 * COMMUNITY_DB binding exists at all (see worker/llm-relay.mjs); that fallback
 * is documented as weak where it is used.
 */

export const AI_NEURON_LEDGER_SCHEMA = "ai-neuron-ledger-v1";
export const AI_PROVIDER_DAILY_BUDGET = 10_000;
/* Headroom for estimation ceilings and provider-side rounding: the Worker stops
   at 9,000 so a fully-claimed day can never actually touch the provider's
   10,000 hard stop. */
export const AI_WORKER_DAILY_LIMIT = 9_000;
export const AI_NEURON_LEDGER_NOTE =
  "Aggregate ceiling-estimate of Worker-routed Workers AI Neurons. Each attempt claims input characters plus its reserved output ceiling before generation; failed attempts stay counted conservatively. Calls made outside this Worker are excluded. The provider dashboard is the billing authority.";

const UPSERT_ATTEMPT = `INSERT INTO ai_neuron_ledger
  (utc_day, neurons, attempted_calls, provider_budget, worker_limit, updated_at)
  VALUES (?, ?, 1, ?, ?, ?)
  ON CONFLICT(utc_day) DO UPDATE SET
    neurons = ai_neuron_ledger.neurons + excluded.neurons,
    attempted_calls = ai_neuron_ledger.attempted_calls + 1,
    provider_budget = excluded.provider_budget,
    worker_limit = excluded.worker_limit,
    updated_at = excluded.updated_at
  WHERE ai_neuron_ledger.neurons + excluded.neurons <= excluded.worker_limit
  RETURNING utc_day, neurons, attempted_calls, provider_budget, worker_limit, updated_at`;

const READ_DAY = `SELECT utc_day, neurons, attempted_calls, provider_budget, worker_limit, updated_at
  FROM ai_neuron_ledger WHERE utc_day = ?`;

export function aiUtcDay(at = Date.now()) {
  const timestamp = Number(at);
  const date = new Date(Number.isFinite(timestamp) ? timestamp : Date.now());
  return date.toISOString().slice(0, 10);
}

/** Seconds from `at` until the next UTC midnight, when the allocation resets. */
export function secondsUntilUtcMidnight(at = Date.now()) {
  const timestamp = Number(at);
  const now = Number.isFinite(timestamp) && timestamp >= 0 ? Math.floor(timestamp) : Date.now();
  const midnight = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate()) + 86_400_000;
  return Math.max(1, Math.ceil((midnight - now) / 1000));
}

function safeLimits({ providerBudget = AI_PROVIDER_DAILY_BUDGET,
  workerLimit = AI_WORKER_DAILY_LIMIT } = {}) {
  const budget = Math.floor(Number(providerBudget));
  const limit = Math.floor(Number(workerLimit));
  if (!Number.isSafeInteger(budget) || budget < 1 ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > budget) return null;
  return { providerBudget: budget, workerLimit: limit };
}

function safeEstimate(value) {
  const estimate = Math.floor(Number(value));
  return Number.isSafeInteger(estimate) && estimate >= 1 ? estimate : null;
}

function usageFromRow(row, day, limits) {
  const neurons = Math.max(0, Math.floor(Number(row && row.neurons) || 0));
  const calls = Math.max(0, Math.floor(Number(row && row.attempted_calls) || 0));
  const providerBudget = Math.max(1, Math.floor(Number(row && row.provider_budget) || limits.providerBudget));
  const workerLimit = Math.max(1, Math.min(providerBudget,
    Math.floor(Number(row && row.worker_limit) || limits.workerLimit)));
  const remaining = Math.max(0, workerLimit - neurons);
  const updatedAt = Number(row && row.updated_at);
  return Object.freeze({
    schema: AI_NEURON_LEDGER_SCHEMA,
    day: String((row && row.utc_day) || day),
    neurons,
    calls,
    providerBudget,
    workerLimit,
    remaining,
    exhausted: neurons >= workerLimit,
    updatedAt: Number.isFinite(updatedAt) && updatedAt >= 0 ? updatedAt : null,
    scope: "Worker-routed Workers AI calls; one aggregate row per UTC day",
    note: AI_NEURON_LEDGER_NOTE
  });
}

function unavailable() {
  return {
    ok: false,
    reason: "ledger-unavailable",
    message: "The durable AI Neuron ledger is unavailable. No new provider request was sent. Apply the D1 migration and retry."
  };
}

/* Read only the indexed day row (or return a zero-use snapshot before the first call). */
export async function readAiNeuronLedger(db, at = Date.now(), requestedLimits) {
  const limits = safeLimits(requestedLimits);
  if (!limits || !db || typeof db.prepare !== "function") return unavailable();
  const day = aiUtcDay(at);
  try {
    const row = await db.prepare(READ_DAY).bind(day).first();
    return { ok: true, ledger: usageFromRow(row, day, limits) };
  } catch {
    return unavailable();
  }
}

/*
 * Atomically claim `estimate` Neurons immediately before generation. The
 * UPSERT's WHERE condition is evaluated with the current row value, so
 * simultaneous isolates cannot both claim past the limit. A rejected claim
 * does not change the aggregate row.
 */
export async function claimAiNeurons(db, estimate, at = Date.now(), requestedLimits) {
  const limits = safeLimits(requestedLimits);
  const neurons = safeEstimate(estimate);
  if (!limits || neurons === null || !db || typeof db.prepare !== "function") return unavailable();
  const timestamp = Number(at);
  const now = Number.isFinite(timestamp) && timestamp >= 0 ? Math.floor(timestamp) : Date.now();
  const day = aiUtcDay(now);
  try {
    const row = await db.prepare(UPSERT_ATTEMPT)
      .bind(day, neurons, limits.providerBudget, limits.workerLimit, now)
      .first();
    if (row) return { ok: true, ledger: usageFromRow(row, day, limits) };

    const current = await readAiNeuronLedger(db, now, limits);
    if (!current.ok) return current;
    if (current.ledger.exhausted || current.ledger.remaining < neurons) {
      return {
        ok: false,
        reason: "budget-exhausted",
        ledger: current.ledger,
        retryAfterSeconds: secondsUntilUtcMidnight(now),
        message: `The Worker-routed Workers AI allowance is exhausted for ${day}: ${current.ledger.neurons.toLocaleString()} of ${current.ledger.workerLimit.toLocaleString()} Neurons claimed. No provider request was sent. The allocation resets at 00:00 UTC.`
      };
    }
    /* A missing RETURNING row below the limit is not a safe basis for an outbound call. */
    return unavailable();
  } catch {
    return unavailable();
  }
}
