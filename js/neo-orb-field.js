/* NEO ORB feed cut.

   NEO ORB is a display, and it reads no market feed. This module used to make the app's one
   network call — a same-origin GET of the first-party Orb 2 field route. That call is gone:
   the reader refuses, so no orb colour is ever derived from a company's market data and
   nothing at all leaves the page. There is no fetch here, no request options, and no runtime
   switch that could open it.

   The cut is NEO ORB's only. Orb 2's own feed is NOT cut: the Worker's Orb 2 pipeline still
   calls its providers on its own schedule and still serves the stored field to the apps that
   are meant to read it. NEO ORB is simply no longer one of them.

   The app follows this module fail-closed (js/apps-neo-orb.js): unless FEED_CUT is exactly
   false, it reads nothing, polls nothing, and leaves every orb neutral with the cut named in
   the Status panel and the inspector.

   Re-opening the feed is a deliberate change, not a configuration: set FEED_CUT to false,
   restore the single same-origin GET of FIELD_ROUTE here, and update
   tests/neo-orb-feed-cut-test.mjs, tests/neo-orb-market-test.mjs, and
   docs/architecture/NEO-ORB-WEB.md, which all assert the cut. Display-only either way: no
   write, no action, no authority, no identity claim. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NeoOrbField = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /* The route the cut refuses. Named so the boundary is explicit and testable; nothing here
     requests it, and no other route or host appears anywhere in the NEO ORB files. */
  const FIELD_ROUTE = "/api/good-intelligence/v1/orb2/field";
  const DEFAULT_INTERVAL = "1d";

  const FEED_CUT = true;
  const FEED_CUT_MESSAGE =
    "NEO ORB's market feed is cut: no field is read, no provider data is shown, and every orb stays neutral.";

  function fieldUrl(interval = DEFAULT_INTERVAL) {
    const params = new URLSearchParams();
    params.set("interval", interval === "1h" ? "1h" : DEFAULT_INTERVAL);
    return `${FIELD_ROUTE}?${params.toString()}`;
  }

  /* Always the refusal. It takes no arguments and holds no fetcher, so no caller can supply
     one; it never throws and never touches the network, storage, or a worker. */
  async function readField() {
    return Object.freeze({ ok: false, cut: FEED_CUT, message: FEED_CUT_MESSAGE, observations: Object.freeze([]), at: null });
  }

  return Object.freeze({ FIELD_ROUTE, DEFAULT_INTERVAL, FEED_CUT, FEED_CUT_MESSAGE, fieldUrl, readField });
});
