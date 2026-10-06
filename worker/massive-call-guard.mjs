/* Massive provider pacing is enforced per asset class. The former
   application-imposed UTC-day cap is deliberately not used as a provider
   gate; Massive documents five requests/minute per asset class. */

import { consumeMassiveBudget } from "./massive.mjs";
import {
  MASSIVE_PROVIDER_DAILY_LIMIT,
  readMassiveDailyCallLedger,
  recordMassiveDailyCall
} from "./massive-daily-call-ledger.mjs";

function requestAssetClass(request) {
  try {
    const url = request && request.url ? new URL(request.url) : null;
    const disc = String(url && url.searchParams.get("disc") || "").trim().toLowerCase();
    if (disc === "fx") return "currencies";
    if (disc === "commodities") return "futures";
    if (disc === "indices") return "indices";
    const asset = String(url && url.searchParams.get("asset") || "").trim().toLowerCase();
    if (asset === "crypto" || asset === "forex" || asset === "currencies") return "currencies";
    if (["stocks", "options", "indices", "futures"].includes(asset)) return asset;
  } catch { /* explicit caller-supplied class remains authoritative */ }
  return null;
}

export async function reserveMassiveProviderCall({
  request,
  env = {},
  now = Date.now(),
  assetClass = null
} = {}) {
  const daily = await readMassiveDailyCallLedger(env.COMMUNITY_DB, now, MASSIVE_PROVIDER_DAILY_LIMIT);
  if (!daily.ok) return { ok: false, code: daily.reason || "massive-ledger-unavailable", message: daily.message };

  const resolvedAssetClass = assetClass || requestAssetClass(request);
  const minute = consumeMassiveBudget(request, env, now, resolvedAssetClass);
  if (!minute.ok) {
    return {
      ok: false,
      code: minute.code || "massive-rate-limit",
      retryAfter: minute.retryAfterSeconds,
      message: minute.code === "massive-asset-class-required"
        ? "Massive asset class is required before a provider request can be sent."
        : "The Massive " + (minute.assetClass || "provider") + " per-minute request envelope is exhausted. Wait about " + minute.retryAfterSeconds + "s before trying again."
    };
  }
  const recorded = await recordMassiveDailyCall(env.COMMUNITY_DB, now, MASSIVE_PROVIDER_DAILY_LIMIT);
  if (!recorded.ok) return { ok: false, code: recorded.reason || "massive-ledger-unavailable", message: recorded.message };
  return { ok: true, calls: 1, assetClass: minute.assetClass, ledger: recorded.ledger };
}