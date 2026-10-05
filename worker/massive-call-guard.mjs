/* Shared guard for bounded Characters/Orb 2 calls routed through Massive.
 *
 * The durable UTC-day ledger is checked first, then the shared per-minute
 * window and an atomic daily claim are both acquired before provider work. A
 * losing daily-claim race may conservatively consume a minute slot, but never
 * sends an upstream request. Provider failures after a successful claim count.
 */

import {
  MASSIVE_PROVIDER_DAILY_LIMIT,
  claimMassiveDailyCall,
  readMassiveDailyCallLedger
} from "./massive-daily-call-ledger.mjs";
import { consumeMassiveBudget } from "./massive.mjs";

export async function reserveMassiveProviderCall({
  request,
  env = {},
  now = Date.now(),
  dailyLimit = MASSIVE_PROVIDER_DAILY_LIMIT
} = {}) {
  const held = await readMassiveDailyCallLedger(env.COMMUNITY_DB, now, dailyLimit);
  if (!held.ok) return { ok: false, code: held.reason || "massive-ledger-unavailable", message: held.message };
  if (held.ledger.exhausted) {
    return {
      ok: false,
      code: "massive-budget-exhausted",
      ledger: held.ledger,
      message: `The Characters Massive request allowance is exhausted for ${held.ledger.day} UTC: ${held.ledger.calls.toLocaleString()} of ${held.ledger.dailyLimit.toLocaleString()} Worker-routed requests. No Massive request was sent.`
    };
  }

  const minute = consumeMassiveBudget(request, env, now);
  if (!minute.ok) {
    return {
      ok: false,
      code: "massive-rate-limit",
      retryAfter: String(minute.retryAfterSeconds),
      message: `The shared Massive per-minute request envelope is exhausted (${minute.scope}). Wait about ${minute.retryAfterSeconds}s before trying again.`
    };
  }

  const claim = await claimMassiveDailyCall(env.COMMUNITY_DB, now, dailyLimit);
  if (!claim.ok) {
    return {
      ok: false,
      code: claim.reason || "massive-ledger-unavailable",
      ...(claim.ledger ? { ledger: claim.ledger } : {}),
      message: claim.message
    };
  }
  return { ok: true, ledger: claim.ledger, calls: 1 };
}
