/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Quasar Mode for NEO ORB (js/neo-orb-quasar.js)
   Specification: docs/harshal-systems/12-ground-zero.md, "Quasar Mode — Spheroid Body
   Specification — The Insurance Company".

   Quasar Mode is a spheroid body: a distributed, stabilising structure that aggregates
   risk signals and describes how fragile the roster is. It does not decide, rank, name
   symbols, or say what to do. Its output is contingency visibility, not instruction.

     spheroid   roster-level aggregates from the Black Hole Computing readings

   Spec invariants kept here:
     • outward only: it reads the readings and returns numbers; nothing it returns feeds
       colour, placement, motion, or any action (§3.2, §7, §8, the hourglass rules)
     • non-prioritised: every output is a count, a share, or an interval over the whole
       roster; no symbol, rank, order, or remedy is returned (§6)
     • radial symmetry: no privileged orb; the aggregates do not depend on order (§3.1)
     • no preference learned: each call is stateless and nothing is persisted (§5)
     • output is fixed labels and numbers, never free text, so it cannot prescribe (§7.1)

   Display-only. Not a forecast, a quote, a rank, or a recommendation.
   ═══════════════════════════════════════════════════════════════ */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NeoOrbQuasar = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const SPEC = Object.freeze({
    name: "Quasar Mode",
    body: "spheroid body (non-atomic, non-sovereign)",
    metaphor: "The Insurance Company",
    phase: "Quasi-NAB (risk aggregation)",
    deployability: "conditional (structural role only)",
    orientation: "outward",
    authority: "none",
    prioritised: false,
    persists: false
  });

  /* Fixed bands over the 0…1 depth, in a fixed order (never sorted by count). */
  const BANDS = Object.freeze([
    Object.freeze({ label: "0.0–0.2", lo: 0, hi: 0.2 }),
    Object.freeze({ label: "0.2–0.4", lo: 0.2, hi: 0.4 }),
    Object.freeze({ label: "0.4–0.6", lo: 0.4, hi: 0.6 }),
    Object.freeze({ label: "0.6–0.8", lo: 0.6, hi: 0.8 }),
    Object.freeze({ label: "0.8–1.0", lo: 0.8, hi: 1 })
  ]);
  const TAIL_DEPTH = 0.8;      // the tail scenario: the close is at or beyond the 764…1000 envelopes
  const TAIL_PRESSURE = 0.6;   // the tail scenario: Orb 2 pressure at or above this
  const Z95 = 1.96;

  const finite = value => typeof value === "number" && Number.isFinite(value);
  const isMap = value => Object.prototype.toString.call(value) === "[object Map]";
  const share = (count, total) => (total > 0 ? count / total : null);

  /* ── spheroid: roster aggregates from a BHC result ──────────────────
     result: the object from NeoOrbBlackHole.deepen (engaged, total, measured, readings).
     Only the readings' numbers are read. Symbols are never copied out, and the result
     depends on the set of readings, not on their order. */
  function spheroid(result) {
    if (!result || !result.engaged || !isMap(result.readings)) {
      return { engaged: false, reason: result && result.reason ? result.reason : "no Black Hole Computing reading", orientation: SPEC.orientation, authority: SPEC.authority, prioritised: false, persists: false };
    }
    const depths = [];
    const pressures = [];
    for (const reading of result.readings.values()) {
      if (finite(reading.depth)) depths.push(reading.depth);
      if (finite(reading.pressure)) pressures.push(reading.pressure);
    }
    const n = depths.length;
    const mean = n ? depths.reduce((sum, d) => sum + d, 0) / n : null;
    const sd = n >= 2 ? Math.sqrt(depths.reduce((sum, d) => sum + (d - mean) ** 2, 0) / (n - 1)) : null;
    const interval = n >= 2
      ? { lo: Math.max(0, mean - Z95 * sd / Math.sqrt(n)), hi: Math.min(1, mean + Z95 * sd / Math.sqrt(n)) }
      : null;
    const distribution = BANDS.map(band => ({
      band: band.label,
      count: depths.filter(d => (band.hi === 1 ? d >= band.lo && d <= band.hi : d >= band.lo && d < band.hi)).length
    }));
    const deepCount = depths.filter(d => d >= TAIL_DEPTH).length;
    const pressureCount = pressures.filter(p => p >= TAIL_PRESSURE).length;
    return {
      engaged: true,
      reason: null,
      orientation: SPEC.orientation,
      authority: SPEC.authority,
      prioritised: false,
      persists: false,
      measured: n,
      total: result.total,
      distribution,
      meanDepth: mean,
      interval,
      tail: {
        depth: { threshold: TAIL_DEPTH, count: deepCount, share: share(deepCount, n) },
        pressure: { threshold: TAIL_PRESSURE, count: pressureCount, share: share(pressureCount, pressures.length) }
      },
      fragility: {
        dispersion: sd,
        unmeasured: result.total - n,
        coverage: share(n, result.total)
      }
    };
  }

  const pct = value => (value === null ? "—" : `${Math.round(value * 100)}%`);
  const num = value => (value === null ? "—" : value.toFixed(2));

  /* ── readable text: fixed labels and numbers only ───────────────────── */
  function describe(result) {
    if (!result || !result.engaged) return `not engaged · ${result && result.reason ? result.reason : "no reading"}`;
    const ci = result.interval ? ` (95% ${num(result.interval.lo)}–${num(result.interval.hi)})` : "";
    return `spheroid · outward · ${result.measured} of ${result.total} measured · mean depth ${num(result.meanDepth)}${ci} · tail: ${pct(result.tail.depth.share)} at depth ≥ ${result.tail.depth.threshold} · dispersion ${num(result.fragility.dispersion)} · coverage ${pct(result.fragility.coverage)} · non-prioritised, not stored`;
  }

  return Object.freeze({ SPEC, BANDS, TAIL_DEPTH, TAIL_PRESSURE, spheroid, describe });
});
