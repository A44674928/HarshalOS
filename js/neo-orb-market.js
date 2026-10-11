/* NEO ORB market colour: rally/sink and above/below basis, as descriptive tints only.
   Display-only. Pure math: no network, no storage, no route. The observations come from the
   stored Orb 2 field through js/neo-orb-field.js, which owns the feed switch: with no rows, or
   with that switch closed, this module is handed nothing and every orb stays neutral on its
   band shell. The rules below are the definition of the colours, and they follow Orb 2:
     rallying / sinking  ← market.changePct > 0 / < 0   (change vs the prior confirmed bar)
     above / below basis ← latestBar.close vs the FBB basis (FBB-L60, else FBB-200, else market.basis)
   Reserved palette, used for nothing else on the orb: green = rallying, red = sinking,
   blue = below basis, yellow = above basis. Not a quote, rank, or recommendation. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NeoOrbMarket = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const COLORS = Object.freeze({
    rallying: "#22c55e",   // green
    sinking: "#ef4444",    // red
    below: "#3b82f6",      // blue: close below basis
    above: "#facc15",      // yellow: close above basis
    neutral: "#8fa3c0"     // no data, flat, or equal to basis
  });

  const finite = value => typeof value === "number" && Number.isFinite(value);
  const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
  function numeric(value) {
    const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
    return finite(n) ? n : null;
  }

  /* The FBB variants of one market record. The Worker's field row carries them as
     market.fbbComparison.variants (gi-fbb-comparison-v1); the client analysis carries them as
     market.fbbVariants. Both shapes hold { id: { status, basis } }. */
  function fbbVariantsOf(market) {
    if (isRecord(market.fbbVariants)) return market.fbbVariants;
    if (isRecord(market.fbbComparison) && isRecord(market.fbbComparison.variants)) return market.fbbComparison.variants;
    return null;
  }

  /* The basis Orb 2 compares the close against: the preferred FBB variant that is available. */
  function basisOf(market) {
    const variants = fbbVariantsOf(market);
    const pick = id => variants && isRecord(variants[id]) && variants[id].status === "available" ? variants[id] : null;
    const preferred = pick("FBB-L60") || pick("FBB-200");
    return numeric(preferred ? preferred.basis : market.basis);
  }

  /* One symbol's market record → { rally, basis, changePct, close, basisValue }. */
  function marketStateOf(market) {
    if (!isRecord(market)) return { rally: "unknown", basis: "unknown", changePct: null, close: null, basisValue: null };
    const changePct = numeric(market.changePct);
    const close = numeric(isRecord(market.latestBar) ? market.latestBar.close : null);
    const basisValue = basisOf(market);
    const rally = changePct === null ? "unknown" : changePct > 0 ? "rallying" : changePct < 0 ? "sinking" : "flat";
    const basis = close === null || basisValue === null || basisValue <= 0 || close <= 0
      ? "unknown" : close > basisValue ? "above" : close < basisValue ? "below" : "equal";
    return { rally, basis, changePct, close, basisValue };
  }

  /* Fill = rally/sink. Ring = basis (blue below, yellow above, none when equal or unknown). */
  function colourOf(state) {
    const fill = state.rally === "rallying" ? COLORS.rallying : state.rally === "sinking" ? COLORS.sinking : COLORS.neutral;
    const ring = state.basis === "below" ? COLORS.below : state.basis === "above" ? COLORS.above : null;
    return { fill, ring, rally: state.rally, basis: state.basis };
  }

  /* The Orb 2 field rows → Map(symbol → market). Only stock rows; the newest row per
     symbol wins. Rows from other discs are ignored, so no other asset class is coloured. */
  function indexField(observations) {
    const latest = new Map();
    for (const row of Array.isArray(observations) ? observations : []) {
      if (!isRecord(row) || !isRecord(row.market)) continue;
      if (String(row.discId || "stocks") !== "stocks") continue;
      const symbol = String(row.symbol || "").toUpperCase();
      if (!symbol) continue;
      const at = Number(row.observedAt) || 0;
      const previous = latest.get(symbol);
      if (!previous || at >= previous.at) latest.set(symbol, { at, market: row.market });
    }
    const out = new Map();
    for (const [symbol, entry] of latest) out.set(symbol, entry.market);
    return out;
  }

  /* The newest stored stock observation time (ms), or null. Colours are stored, never live, so
     this is how old they are; it is shown beside every colour, never hidden. With no stored
     stock rows in the field — or with the reader's feed switch closed — this stays null. */
  function storedAsOf(observations) {
    let newest = 0;
    for (const row of Array.isArray(observations) ? observations : []) {
      if (!isRecord(row) || !isRecord(row.market)) continue;
      if (String(row.discId || "stocks") !== "stocks") continue;
      const at = Number(row.observedAt) || 0;
      if (at > newest) newest = at;
    }
    return newest > 0 ? newest : null;
  }

  return Object.freeze({ COLORS, marketStateOf, colourOf, indexField, basisOf, storedAsOf });
});
