/* ═══════════════════════════════════════════════════════════════
   HarshalOS — NEO ORB price signals (js/neo-orb-signals.js)
   The Orb 2 price mechanisms NEO ORB reads from a stored field row, re-expressed as
   pure display math. The same formulas as js/good-intelligence-orb2.js and
   worker/orb2-composition.mjs; each one is named so the two can be compared.

     depthOf         six Fibonacci envelopes (236…1000) in log space → radial depth 0…1
     compositionOf   the stored daily-baseline + 15m-residual composition → position 0…1
     flowOf          VFI against its signal → above / below / equal / unavailable
     pressureOf      Orb 2's pressure: price, flow, WaveTrend and volatility, × force

   Display-only. Not a forecast, a quote, a rank, or a recommendation. Pure math: no
   network, no DOM, no storage, no route. Missing data stays null — never a neutral
   value invented here — so the caller can say "unmeasured" instead of "calm".
   ═══════════════════════════════════════════════════════════════ */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NeoOrbSignals = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /* The six reviewed Fibonacci envelope suffixes, as in market.bands["upper236"] … */
  const LEVELS = Object.freeze([236, 382, 500, 618, 764, 1000]);
  /* Orb 2's pressure constants, unchanged. */
  const PRICE_SCALE = 4, FLOW_SCALE = 18, WAVE_SCALE = 45, VOLATILITY_SCALE_PCT = 12;
  const FORCE_MIN = 0.65, FORCE_MAX = 1.35;

  const finite = value => typeof value === "number" && Number.isFinite(value);
  const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
  function numeric(value) {
    const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
    return finite(n) ? n : null;
  }

  /* ── depth: the six Fibonacci envelopes ───────────────────────────────
     For each level, the close's log distance from the basis in units of that level's
     own log half-width (the same shape as Orb 2's multidimensionalFbbState). Each
     component is clamped to ±2. Depth is the mean of min(|c|, 1): 0 at the basis,
     1 once the close is at or beyond the ±1000 envelope on average. Any missing level
     makes the whole reading null — a partial ladder is not a depth. */
  function depthOf(market) {
    const unmeasured = reason => ({ available: false, depth: null, components: null, reason });
    if (!isRecord(market)) return unmeasured("no market record");
    const close = numeric(isRecord(market.latestBar) ? market.latestBar.close : null);
    const basis = numeric(market.basis);
    const bands = isRecord(market.bands) ? market.bands : null;
    if (close === null || basis === null || !bands) return unmeasured("no close, basis, or envelope ladder");
    if (close <= 0 || basis <= 0) return unmeasured("non-positive price");
    const distance = Math.log(close / basis);
    const components = [];
    for (const level of LEVELS) {
      const upper = numeric(bands["upper" + level]);
      const lower = numeric(bands["lower" + level]);
      if (upper === null || lower === null || upper <= basis || lower <= 0) return unmeasured("envelope " + level + " missing");
      const upperLog = Math.log(upper / basis);
      const lowerLog = Math.log(basis / lower);
      if (!finite(upperLog) || !finite(lowerLog) || upperLog <= 0 || lowerLog <= 0) return unmeasured("envelope " + level + " not ordered");
      components.push(clamp(distance / (distance >= 0 ? upperLog : lowerLog), -2, 2));
    }
    const depth = components.reduce((sum, c) => sum + Math.min(Math.abs(c), 1), 0) / components.length;
    return { available: true, depth: clamp(depth, 0, 1), components, reason: null };
  }

  /* ── composition: the stored daily baseline plus 15m residual ──────────
     `composition` is the sanitized object on the stored row (schema
     gi-orb2-scale-composition-v1). Its composedPosition is 0…1, where 0.5 is neutral.
     A "hold" or a missing position is unmeasured, never neutral. */
  function compositionOf(composition) {
    const unmeasured = reason => ({ available: false, position: null, axis: null, forceMultiplier: 1, freshness: 0, status: "hold", reason });
    if (!isRecord(composition)) return unmeasured("no composition");
    const position = numeric(composition.composedPosition);
    if (position === null || position < 0 || position > 1) return unmeasured("no composed position");
    const multiplier = numeric(composition.forceMultiplier);
    return {
      available: true,
      position,
      axis: clamp((position - 0.5) * 2, -1, 1),
      forceMultiplier: multiplier === null ? 1 : clamp(multiplier, FORCE_MIN, FORCE_MAX),
      freshness: clamp(numeric(composition.freshness) || 0, 0, 1),
      status: typeof composition.status === "string" ? composition.status : "unknown",
      reason: typeof composition.reason === "string" ? composition.reason : null
    };
  }

  /* ── VFI against its signal ───────────────────────────────────────────── */
  function flowOf(market) {
    const vfi = isRecord(market) && isRecord(market.vfi) ? market.vfi : null;
    const value = numeric(vfi && vfi.value);
    const signal = numeric(vfi && vfi.signal);
    if (!vfi || vfi.available !== true || value === null || signal === null) {
      return { state: "unavailable", axis: null };
    }
    const diff = value - signal;
    const state = diff > 0 ? "above" : diff < 0 ? "below" : "equal";
    return { state, axis: clamp(Math.tanh(diff / FLOW_SCALE), -1, 1) };
  }

  /* ── pressure: Orb 2's formula ─────────────────────────────────────────
     |price| · 0.42 + |flow| · 0.28 + |WaveTrend separation| · 0.15 + volatility · 0.15,
     times the force multiplier, clamped 0…1. Missing terms contribute 0 and are
     reported as missing, so the caller can see how much of the reading is measured. */
  function pressureOf(market, composition) {
    const change = isRecord(market) ? numeric(market.changePct) : null;
    const priceAxis = change === null ? null : clamp(Math.tanh(change / PRICE_SCALE), -1, 1);
    const flow = flowOf(market);
    const wt1 = isRecord(market) && isRecord(market.waveTrend) ? numeric(market.waveTrend.wt1) : null;
    const wt2 = isRecord(market) && isRecord(market.waveTrend) ? numeric(market.waveTrend.wt2) : null;
    const waveAxis = wt1 !== null && wt2 !== null ? clamp(Math.tanh((wt1 - wt2) / WAVE_SCALE), -1, 1) : null;
    const volatility = volatilityOf(market);
    const comp = compositionOf(composition);
    const multiplier = comp.available ? comp.forceMultiplier : 1;
    const terms = [
      priceAxis === null ? 0 : Math.abs(priceAxis) * 0.42,
      flow.axis === null ? 0 : Math.abs(flow.axis) * 0.28,
      waveAxis === null ? 0 : Math.abs(waveAxis) * 0.15,
      volatility === null ? 0 : volatility * 0.15
    ];
    const value = clamp(terms.reduce((sum, t) => sum + t, 0) * multiplier, 0, 1);
    return {
      value,
      measured: { price: priceAxis !== null, flow: flow.axis !== null, wave: waveAxis !== null, volatility: volatility !== null },
      multiplier
    };
  }

  /* Log width of the preferred basis frame, scaled to 0…1 by Orb 2's 12 % reference. */
  function volatilityOf(market) {
    if (!isRecord(market) || !isRecord(market.bands)) return null;
    const upper = numeric(market.bands.upper1000), lower = numeric(market.bands.lower1000);
    if (upper === null || lower === null || upper <= 0 || lower <= 0 || upper <= lower) return null;
    const pct = (Math.log(upper) - Math.log(lower)) * 100;
    return clamp(pct / VOLATILITY_SCALE_PCT, 0, 1);
  }

  return Object.freeze({ LEVELS, depthOf, compositionOf, flowOf, pressureOf, volatilityOf });
});
