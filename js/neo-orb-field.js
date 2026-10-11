/* NEO ORB field reader: the one read NEO ORB makes, of its own first-party Worker route.
   Same-origin GET, no cache, no redirects, no cookies to a third party. It returns the
   stored Orb 2 field rows as they are. The colours are derived in js/neo-orb-market.js.
   Display-only: no write, no action, no authority, no identity claim. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NeoOrbField = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const FIELD_ROUTE = "/api/good-intelligence/v1/orb2/field";
  const DEFAULT_INTERVAL = "1d";

  function fieldUrl(interval = DEFAULT_INTERVAL) {
    const params = new URLSearchParams();
    params.set("interval", interval === "1h" ? "1h" : DEFAULT_INTERVAL);
    return `${FIELD_ROUTE}?${params.toString()}`;
  }

  /* Resolves { ok, observations, at } or { ok: false, message }. Never throws. */
  async function readField({ fetcher, interval = DEFAULT_INTERVAL, now = Date.now() } = {}) {
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

  return Object.freeze({ FIELD_ROUTE, fieldUrl, readField });
});
