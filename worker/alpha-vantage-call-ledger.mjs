/* Alpha Vantage request ledger. */

export const ALPHA_VANTAGE_DAILY_LIMIT = 25;

export function alphaVantageUtcDay(at = Date.now()) {
  return new Date(Number(at)).toISOString().slice(0, 10);
}

export async function readAlphaVantageCallLedger(db, now = Date.now(), dailyLimit = ALPHA_VANTAGE_DAILY_LIMIT) {
  if (!db || typeof db.prepare !== "function") return { ok: false, reason: "alpha-vantage-ledger-unavailable", message: "The Alpha Vantage request ledger is unavailable. No provider request was sent." };
  const day = alphaVantageUtcDay(now);
  try {
    const row = await db.prepare("SELECT utc_day, attempted_calls, daily_limit, updated_at FROM alpha_vantage_daily_call_ledger WHERE utc_day = ?").bind(day).first();
    const calls = Math.max(0, Number(row && row.attempted_calls) || 0);
    const limit = Math.max(1, Number(dailyLimit) || ALPHA_VANTAGE_DAILY_LIMIT);
    return { ok: true, ledger: { day, calls, dailyLimit: limit, remaining: Math.max(0, limit - calls), exhausted: calls >= limit, updatedAt: Number(row && row.updated_at) || 0, note: "Alpha Vantage request allowance is enforced before upstream work." } };
  } catch { return { ok: false, reason: "alpha-vantage-ledger-unavailable", message: "The Alpha Vantage request ledger could not be read. No provider request was sent." }; }
}

export async function claimAlphaVantageCall(db, now = Date.now(), dailyLimit = ALPHA_VANTAGE_DAILY_LIMIT) {
  if (!db || typeof db.prepare !== "function") return { ok: false, reason: "alpha-vantage-ledger-unavailable", message: "The Alpha Vantage request ledger is unavailable. No provider request was sent." };
  const day = alphaVantageUtcDay(now);
  const limit = Math.max(1, Number(dailyLimit) || ALPHA_VANTAGE_DAILY_LIMIT);
  try {
    const sql = "INSERT INTO alpha_vantage_daily_call_ledger (utc_day, attempted_calls, daily_limit, updated_at) VALUES (?, 1, ?, ?) ON CONFLICT(utc_day) DO UPDATE SET attempted_calls = attempted_calls + 1, daily_limit = excluded.daily_limit, updated_at = excluded.updated_at WHERE alpha_vantage_daily_call_ledger.attempted_calls < ? RETURNING utc_day, attempted_calls, daily_limit, updated_at";
    const row = await db.prepare(sql).bind(day, limit, now, limit).first();
    if (!row) {
      const current = await readAlphaVantageCallLedger(db, now, limit);
      return { ok: false, reason: "alpha-vantage-budget-exhausted", message: "Alpha Vantage's 25-request UTC-day allowance is exhausted.", ledger: current.ok ? current.ledger : null };
    }
    const calls = Number(row.attempted_calls) || 0;
    return { ok: true, calls: 1, ledger: { day, calls, dailyLimit: limit, remaining: Math.max(0, limit - calls), exhausted: calls >= limit, updatedAt: Number(row.updated_at) || now } };
  } catch { return { ok: false, reason: "alpha-vantage-ledger-unavailable", message: "The Alpha Vantage request ledger could not claim a daily slot. No provider request was sent." }; }
}
