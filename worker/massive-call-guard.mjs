/* Massive provider pacing is enforced per asset class. The former
   application-imposed UTC-day cap is deliberately not used as a provider
   gate; Massive documents five requests/minute per asset class. */

import { consumeMassiveBudget } from "./massive.mjs";

export async function reserveMassiveProviderCall({
  request,
  env = {},
  now = Date.now(),
  assetClass = null
} = {}) {
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
  return { ok: true, calls: 1, assetClass: minute.assetClass };
}
