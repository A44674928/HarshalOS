/* Massive provider pacing is enforced per asset class. The former
   application-imposed UTC-day cap is deliberately not used as a provider
   gate; Massive documents five requests/minute per asset class. */

import { consumeMassiveBudget } from "./massive.mjs";
import {
  MASSIVE_PROVIDER_DAILY_LIMIT,
  readMassiveDailyCallLedger,
  recordMassiveDailyCall
} from "./massive-daily-call-ledger.mjs";

export async function reserveMassiveProviderCall({
  request,
  env = {},
  now = Date.now(),
  assetClass = null
} = {}) {
  const daily = await readMassiveDailyCallLedger(env.COMMUNITY_DB, now, MASSIVE_PROVIDER_DAILY_LIMIT);
  if (!daily.ok) return { ok: false, code: daily.reason || "massive-ledger-unavailable", message: daily.message };

  const minute = consumeMassiveBudget(request, env, now, assetClass);
  if (!minute.ok) {
    return {
      ok: false,
      code: minute.code || "massive-rate-limit",
      retryAfter: minute.retryAfterSeconds,
      message: minute.code === "massive-asset-class-required"
        ? "Massive asset class is required before a provider request can be sent."
        : `The Massive ${minute.assetClass || "provider"} per-minute request envelope is exhausted. Wait about ${minute.retryAfterSeconds}s before trying again.`
    };
  }
  const recorded = await recordMassiveDailyCall(env.COMMUNITY_DB, now, MASSIVE_PROVIDER_DAILY_LIMIT);
  if (!recorded.ok) return { ok: false, code: recorded.reason || "massive-ledger-unavailable", message: recorded.message };
  return { ok: true, calls: 1, assetClass: minute.assetClass, ledger: recorded.ledger };
}
