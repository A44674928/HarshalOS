/* Orb 2 company-feed cut.

   Company market-data providers (Massive, Alpha Vantage, Kraken, Tickerbot, Yahoo
   Finance) are no longer called by the Orb 2 pipeline while this gate is closed.
   The gate is closed unless the Worker environment explicitly sets
   ORB2_COMPANY_FEEDS to "on". Nothing in wrangler.jsonc sets it, so the cut is the
   default. Stored field rows still serve reads, and nothing is deleted.

   The gate sits at the three places where Orb 2 leaves the Worker:
     - the scheduled tick and the manual tick (runOrb2FieldTick),
     - the POST actions of the field route (they enqueue provider work),
     - the Tickerbot market route (it fetches api.tickerbot.io directly). */

export const ORB2_COMPANY_FEEDS_ENV = "ORB2_COMPANY_FEEDS";
export const ORB2_COMPANY_FEEDS_CUT_MESSAGE =
  "Company feeds are cut for Orb 2: no provider is called. Stored field rows are still served.";

export function orb2CompanyFeedsEnabled(env = {}) {
  return env !== null && typeof env === "object" && String(env[ORB2_COMPANY_FEEDS_ENV] ?? "").trim().toLowerCase() === "on";
}

/* A fetch that refuses every request. Used as the provider fetcher while the cut holds,
   so no provider code can reach a company even if a gate above is bypassed. */
export function refuseCompanyFetch() {
  return async () => {
    throw new Error(ORB2_COMPANY_FEEDS_CUT_MESSAGE);
  };
}
