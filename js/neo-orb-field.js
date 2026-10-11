/* NEO ORB field reader: the one read NEO ORB makes, of its own first-party Worker route.
   Same-origin GET, no cache, no redirects, no cookies to a third party. It returns the
   stored Orb 2 field rows as they are. The colours are derived in js/neo-orb-market.js and
   the instability extension in js/market-extension.js. Display-only: no write, no action,
   no authority, no identity claim.

   THE FEED SWITCH. `FEED_CUT` is the one place NEO ORB's feed is opened or closed, and the
   app follows it fail-closed (js/apps-neo-orb.js): unless this module declares
   `FEED_CUT === false`, the app reads nothing, polls nothing, and leaves every orb neutral
   and on its band shell. This feed was cut on 2026-10-11 to keep company market data out of
   a display, and re-opened deliberately the same day because NEO ORB is the destination for
   the extension model, which cannot be drawn from data it is not allowed to read. Orb 2's
   own feed was never the thing to cut, and it is not gated: the Worker pipeline calls its
   providers on its own ledgers and caps.

   Closing it again is one edit here — set FEED_CUT to true and `readField()` refuses — plus
   tests/neo-orb-feed-boundary-test.mjs and docs/architecture/NEO-ORB-WEB.md. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NeoOrbField = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const FIELD_ROUTE = "/api/good-intelligence/v1/orb2/field";
  const DEFAULT_INTERVAL = "1d";

  /* false = the feed is open and the one read below is live. true = every read refuses. */
  const FEED_CUT = false;
  const FEED_CUT_MESSAGE =
    "NEO ORB's market feed is cut: no field is read, no provider data is shown, and every orb stays neutral on its band shell.";

  function fieldUrl(interval = DEFAULT_INTERVAL) {
    const params = new URLSearchParams();
    params.set("interval", interval === "1h" ? "1h" : DEFAULT_INTERVAL);
    return `${FIELD_ROUTE}?${params.toString()}`;
  }

  /* Resolves { ok, observations, at } or { ok: false, message }. Never throws. */
  async function readField({ fetcher, interval = DEFAULT_INTERVAL, now = Date.now() } = {}) {
    if (FEED_CUT) return Object.freeze({ ok: false, cut: true, message: FEED_CUT_MESSAGE, observations: [], at: null });
    const doFetch = fetcher || (typeof globalThis !== "undefined" ? globalThis.fetch : null);
    if (typeof doFetch !== "function") return { ok: false, message: "field read unavailable in this browser" };
    try {
      const response = await doFetch(fieldUrl(interval), {
        method: "GET", credentials: "same-origin", cache: "no-store", redirect: "error",
        headers: { Accept: "application/json" }
      });
      const payload = await response.json().catch(() => null);
      const data = payload && typeof payload === "object" && payload.data && typeof payload.data === "object" ? payload.data : null;
      if (!response.ok || !data || data.ok !== true) {
        return { ok: false, message: (payload && payload.message) || `The Orb 2 field answered HTTP ${response.status}.` };
      }
      return { ok: true, observations: Array.isArray(data.observations) ? data.observations : [], at: now };
    } catch (error) {
      return { ok: false, message: "the Orb 2 field could not be read" };
    }
  }

  return Object.freeze({ FIELD_ROUTE, DEFAULT_INTERVAL, FEED_CUT, FEED_CUT_MESSAGE, fieldUrl, readField });
});
