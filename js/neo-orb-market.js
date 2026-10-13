/* NEO ORB market colour: the composed position and the VFI flow, as descriptive tints only.
   Display-only. Pure math: no network, no storage, no route. The observations come from the
   stored Orb 2 field through js/neo-orb-field.js, which owns the feed switch: with no rows, or
   with that switch closed, this module is handed nothing and every orb stays neutral on its
   depth shell. The rules below are the definition of the colours, and they follow Orb 2:
     fill ← composition.composedPosition (0…1, daily baseline + 15m residual, from the stored
            row). 0.5 is neutral. Further from 0.5 is a stronger tint: green towards 1 (rising),
            red towards 0 (falling). No composition, or a held one, is neutral grey.
     ring ← market.vfi against its signal: sky when VFI is above its signal, orange when below.
            Equal or unavailable draws no ring.
   Rally/sink (changePct) and the close against the FBB basis are still computed for the
   inspector text, but they no longer set the colour. Not a quote, rank, or recommendation. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NeoOrbMarket = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const COLORS = Object.freeze({
    rallying: "#22c55e",   // green: composed position above neutral
    sinking: "#ef4444",    // red: composed position below neutral
    flowAbove: "#38bdf8",  // sky: VFI above its signal (ring)
    flowBelow: "#fb923c",  // orange: VFI below its signal (ring)
    neutral: "#8fa3c0"     // no composition, held, or exactly neutral
  });

  const finite = value => typeof value === "number" && Number.isFinite(value);
  const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
  function numeric(value) {
    const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
    return finite(n) ? n : null;
  }

  /* Blend two #rrggbb colours: t = 0 gives a, t = 1 gives b. */
  function mix(a, b, t) {
    const parse = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    const x = parse(a), y = parse(b);
    const k = Math.min(1, Math.max(0, t));
    return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, "0")).join("");
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

  /* One symbol's market record → { rally, basis, changePct, close, basisValue }. Text only. */
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

  /* The composed position of one stored row, 0…1, or null when it is missing or held. */
  function positionOf(composition) {
    if (!isRecord(composition)) return null;
    const position = numeric(composition.composedPosition);
    return position === null || position < 0 || position > 1 ? null : position;
  }

  /* VFI against its signal: "above", "below", "equal", or "unavailable". */
  function flowOf(market) {
    const vfi = isRecord(market) && isRecord(market.vfi) ? market.vfi : null;
    const value = numeric(vfi && vfi.value);
    const signal = numeric(vfi && vfi.signal);
    if (!vfi || vfi.available !== true || value === null || signal === null) return "unavailable";
    return value > signal ? "above" : value < signal ? "below" : "equal";
  }

  /* The colour of one orb: { fill, ring, position, flow }. Missing data is neutral, never a
     tint, so a held orb is never shown as calm. */
  function toneOf(market, composition) {
    const position = positionOf(composition);
    let fill = COLORS.neutral;
    if (position !== null && position !== 0.5) {
      const base = position > 0.5 ? COLORS.rallying : COLORS.sinking;
      fill = mix(COLORS.neutral, base, Math.abs(position - 0.5) * 2);
    }
    const flow = flowOf(market);
    const ring = flow === "above" ? COLORS.flowAbove : flow === "below" ? COLORS.flowBelow : null;
    return { fill, ring, position, flow };
  }

  /* The Orb 2 field rows → Map(symbol → market). Only stock rows; the newest row per
     symbol wins. Rows from other discs are ignored, so no other asset class is coloured. */
  function latestRows(observations) {
    const latest = new Map();
    for (const row of Array.isArray(observations) ? observations : []) {
      if (!isRecord(row) || !isRecord(row.market)) continue;
      if (String(row.discId || "stocks") !== "stocks") continue;
      const symbol = String(row.symbol || "").toUpperCase();
      if (!symbol) continue;
      const at = Number(row.observedAt) || 0;
      const previous = latest.get(symbol);
      if (!previous || at >= previous.at) latest.set(symbol, { at, row });
    }
    return latest;
  }

  function indexField(observations) {
    const out = new Map();
    for (const [symbol, entry] of latestRows(observations)) out.set(symbol, entry.row.market);
    return out;
  }

  /* The newest stored composition per stock symbol, or an empty map. */
  function indexComposition(observations) {
    const out = new Map();
    for (const [symbol, entry] of latestRows(observations)) {
      if (isRecord(entry.row.composition)) out.set(symbol, entry.row.composition);
    }
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

  return Object.freeze({ COLORS, marketStateOf, toneOf, positionOf, flowOf, indexField, indexComposition, basisOf, storedAsOf });
});
