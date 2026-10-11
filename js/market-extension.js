/* ═══════════════════════════════════════════════════════════════
   HarshalOS — market extension (js/market-extension.js)
   One definition of "how far out an instrument is", shared by NEO ORB
   (js/apps-neo-orb.js) and Orb 2 (js/good-intelligence-orb2.js), so the same
   market state means the same distance from the centre in both apps.

   Two independent measures, each normalized to 0…1 where 1 is this repository's
   own extreme, and the larger of the two is the extension:

     · WaveTrend  continuous |wt1| against the reviewed thresholds in
                  js/good-intelligence-market-context.js: 0 inside the neutral
                  zone (|wt1| ≤ 53 = obLevel2/osLevel2), 1 at the extreme
                  threshold (|wt1| ≥ 70 = extremeOB/extremeOS), and 1 beyond it.
     · FBB basis  the close's logarithmic distance from the preferred FBB basis,
                  measured in half-band widths: 0 at the basis, 1 at the ±1000
                  Fibonacci envelope the analysis already computes, 1 beyond it.

   Why the larger, not the mean: either measure alone is enough to say an
   instrument is extended, and averaging would let a violently overbought orb sit
   mid-shell because its basis distance happened to be small. Both numbers are
   reported beside the result, with the driver named, so nothing is hidden.

   Distance from the centre is a display of instability. It is not a valuation, a
   quote, a rank, a recommendation, or a prediction, and it never moves an orb's
   identity, sector, or band.

   Pure math: no DOM, no network, no storage, no route. Fail closed — a measure
   with no data is null, never zero dressed up as a reading, and an instrument
   with neither measure is not extended.
   ═══════════════════════════════════════════════════════════════ */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MarketExtension = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const SCHEMA = "market-extension-v1";

  /* The reviewed WaveTrend thresholds, mirrored from js/good-intelligence-market-context.js
     (obLevel2/osLevel2 and extremeOB/extremeOS). If those defaults move, these move with them. */
  const WT_NEUTRAL = 53;
  const WT_EXTREME = 70;

  /* The preferred FBB variants, in the order Orb 2 and NEO ORB both choose them. */
  const FBB_PREFERENCE = Object.freeze(["FBB-L60", "FBB-200"]);

  const finite = value => typeof value === "number" && Number.isFinite(value);
  const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
  function numeric(value) {
    const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
    return finite(n) ? n : null;
  }

  /* ── measure 1: WaveTrend ───────────────────────────────────────────
     Continuous in |wt1|: 0 at the neutral-zone edge (±53), 1 at the extreme
     threshold (±70) and beyond. Null when wt1 is missing — never 0. */
  function waveExtension(wt1) {
    const value = numeric(wt1);
    if (value === null) return null;
    const magnitude = Math.abs(value);
    if (magnitude <= WT_NEUTRAL) return 0;
    return clamp((magnitude - WT_NEUTRAL) / (WT_EXTREME - WT_NEUTRAL), 0, 1);
  }

  /* The FBB frame the basis measure is taken in: the preferred available variant,
     else the packet's own bands. Same preference as neo-orb-market.js and Orb 2. */
  function basisFrame(market) {
    if (!isRecord(market)) return null;
    const variants = isRecord(market.fbbVariants) ? market.fbbVariants
      : isRecord(market.fbbComparison) && isRecord(market.fbbComparison.variants) ? market.fbbComparison.variants
        : null;
    for (const id of FBB_PREFERENCE) {
      const variant = variants && isRecord(variants[id]) ? variants[id] : null;
      if (!variant || variant.status !== "available") continue;
      const basis = numeric(variant.basis);
      const upper = numeric(variant.upper1000);
      const lower = numeric(variant.lower1000);
      if (basis !== null && upper !== null && lower !== null) {
        return { id: String(variant.id || id), basis, upper, lower, source: "variant" };
      }
    }
    const bands = isRecord(market.bands) ? market.bands : null;
    const basis = numeric(market.basis);
    const upper = bands ? numeric(bands.upper1000) : null;
    const lower = bands ? numeric(bands.lower1000) : null;
    if (basis === null || upper === null || lower === null) return null;
    return { id: "FBB", basis, upper, lower, source: "packet" };
  }

  /* ── measure 2: distance from the FBB basis ───────────────────────────
     Logarithmic, as the bands themselves are: the close's distance from the
     basis in half-band widths, where the half-width is the ±1000 envelope on the
     side the close actually sits. 0 at the basis, 1 at the envelope, 1 beyond. */
  function basisExtension(market) {
    const frame = basisFrame(market);
    const close = isRecord(market) && isRecord(market.latestBar) ? numeric(market.latestBar.close) : numeric(market && market.close);
    if (!frame || close === null) return null;
    const { basis, upper, lower } = frame;
    if (!(close > 0) || !(basis > 0) || !(lower > 0) || !(lower < basis) || !(upper > basis)) return null;
    const logClose = Math.log(close), logBasis = Math.log(basis);
    const halfWidth = logClose >= logBasis ? Math.log(upper) - logBasis : logBasis - Math.log(lower);
    if (!finite(halfWidth) || halfWidth <= 0) return null;
    const distance = Math.abs(logClose - logBasis);
    return Object.freeze({
      extension: clamp(distance / halfWidth, 0, 1),
      side: close > basis ? "above" : close < basis ? "below" : "at",
      basisId: frame.id,
      basisSource: frame.source,
      basis,
      close,
      /* Readable companions for the inspector: how far in price terms, and how
         wide the half-band is, both in percent. */
      distancePct: (Math.exp(distance) - 1) * 100,
      halfWidthPct: (Math.exp(halfWidth) - 1) * 100,
      beyondEnvelope: distance / halfWidth > 1
    });
  }

  /* ── the combined extension ───────────────────────────────────────────
     { available, extension, wave, basis, driver, … }. `available` is false only
     when neither measure has data; then extension is 0 and the display says the
     instrument is unmeasured rather than calm. */
  function extensionOf(market) {
    const waveTrend = isRecord(market) && isRecord(market.waveTrend) ? market.waveTrend : null;
    const wt1 = waveTrend ? numeric(waveTrend.wt1) : null;
    const wave = waveExtension(wt1);
    const basis = basisExtension(market);
    const candidates = [];
    if (wave !== null) candidates.push({ value: wave, driver: "waveTrend" });
    if (basis !== null) candidates.push({ value: basis.extension, driver: "basis" });
    if (!candidates.length) {
      return Object.freeze({
        schema: SCHEMA, available: false, extension: 0, wave: null, basis: null, driver: null,
        wt1, zone: waveTrend && typeof waveTrend.zone === "string" ? waveTrend.zone : "unknown",
        close: null, basisValue: null, basisId: null, distancePct: null, halfWidthPct: null,
        side: null, beyondEnvelope: false, reason: "no WaveTrend value and no FBB basis frame"
      });
    }
    /* The larger measure wins; a tie is reported as both. */
    const best = candidates.reduce((top, entry) => (entry.value > top.value ? entry : top), candidates[0]);
    const tied = candidates.filter(entry => Math.abs(entry.value - best.value) < 1e-12).map(entry => entry.driver);
    return Object.freeze({
      schema: SCHEMA,
      available: true,
      extension: clamp(best.value, 0, 1),
      wave,
      basis,
      driver: tied.length > 1 ? "both" : best.driver,
      wt1,
      zone: waveTrend && typeof waveTrend.zone === "string" ? waveTrend.zone : "unknown",
      close: basis ? basis.close : null,
      basisValue: basis ? basis.basis : null,
      basisId: basis ? basis.basisId : null,
      distancePct: basis ? basis.distancePct : null,
      halfWidthPct: basis ? basis.halfWidthPct : null,
      side: basis ? basis.side : null,
      beyondEnvelope: basis ? basis.beyondEnvelope : false,
      reason: null
    });
  }

  /* One line for a readout: what the extension is and which measure drove it. */
  function describe(state) {
    if (!state || state.available !== true) return "unmeasured — no WaveTrend value and no FBB basis frame";
    const parts = [];
    if (state.wave !== null) parts.push(`wt1 ${state.wt1 > 0 ? "+" : ""}${Number(state.wt1).toFixed(1)} → ${state.wave.toFixed(2)}`);
    if (state.basis !== null) {
      parts.push(`close ${state.distancePct.toFixed(1)}% ${state.side} the ${state.basisId} basis → ${state.basis.extension.toFixed(2)}`);
    }
    const driver = state.driver === "waveTrend" ? "WaveTrend" : state.driver === "basis" ? "basis distance" : "both measures";
    return `${state.extension.toFixed(2)} out · driven by ${driver} · ${parts.join(" · ")}${state.beyondEnvelope ? " · beyond the ±1000 envelope" : ""}`;
  }

  return Object.freeze({
    SCHEMA, WT_NEUTRAL, WT_EXTREME, FBB_PREFERENCE,
    waveExtension, basisFrame, basisExtension, extensionOf, describe
  });
});
