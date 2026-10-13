/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Reinsurance Mode for NEO ORB (js/neo-orb-reinsurance.js)
   Specification: docs/harshal-systems/12-ground-zero.md, "Reinsurance Mode — Spheroid-of-
   Spheroids Specification — The Backstop".

   Reinsurance Mode is a spheroid of spheroids. Its inputs are whole Quasar Mode outputs, one
   per buffer, and not events. It shows whether buffers fail together, and where the systemic
   envelope lies. It is not an intelligence body and it decides nothing.

     cadence       the slow update rule: a read is due only after the spec's long interval
     systemic      the roster-level aggregate over the Quasar buffers (issuer sectors)

   Spec invariants kept here:
     • inputs are Quasar outputs, never individual orbs or symbols (§3.1)
     • outward only: its output is a visual halo; it is never fed back into a Quasar buffer,
       colour, placement, or motion (§8, the nested hourglass)
     • slow, coarse, non-binding: shares and envelopes are rounded to tenths, and it holds the
       last snapshot between its slow updates (§6, §3.1)
     • no emergency, no command, no reallocation: fixed labels and numbers only (§7)
     • no preference learned: it holds only its last snapshot (§4)

   Limits: one snapshot cannot show correlation over time, so "synchrony" means that buffers'
   tails are deep at the same reading, not that they move together. No exhaustion horizon is
   estimated: that needs a history this app does not keep.

   Display-only. Not a forecast, a quote, a rank, or a recommendation.
   ═══════════════════════════════════════════════════════════════ */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NeoOrbReinsurance = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const SPEC = Object.freeze({
    name: "Reinsurance Mode",
    body: "spheroid of spheroids (non-atomic, non-sovereign)",
    metaphor: "The Backstop",
    phase: "Meta-Quasi-NAB (systemic risk)",
    deployability: "conditional (systemic risk layer only)",
    orientation: "outward",
    authority: "none",
    cadence: "slow, coarse, non-binding",
    prioritised: false,
    persists: "last snapshot only, held between slow updates"
  });

  /* The slow cadence: the spec says Reinsurance sits outside operational time. Fifteen minutes
     is a deliberate choice, not a spec number. */
  const UPDATE_EVERY_MS = 15 * 60 * 1000;
  const MIN_MEASURED_BUFFER = 2;      // a buffer counts only with at least two measured orbs
  const DEEP_BUFFER = 0.8;            // a buffer whose mean depth is at or beyond this
  const SYNCHRONY_TAIL = 0.5;         // a buffer whose tail share is at or above this is "tail deep"

  const finite = value => typeof value === "number" && Number.isFinite(value);
  const coarse = value => (finite(value) ? Math.round(value * 10) / 10 : null);
  const share = (count, total) => (total > 0 ? count / total : null);

  /* due(lastAt, now): is a slow update owed? Before the first read, always. */
  function due(lastAt, now, everyMs = UPDATE_EVERY_MS) {
    if (!finite(lastAt) || !finite(now)) return true;
    return now - lastAt >= everyMs;
  }

  /* systemic(buffers): buffers is an array of Quasar Mode outputs (spheroid results), one per
     issuer-sector buffer. A buffer that is not engaged or has too few measured orbs is counted
     as unmeasured, never as calm. */
  function systemic(buffers) {
    const list = Array.isArray(buffers) ? buffers : [];
    const measured = list.filter(b => b && b.engaged === true && Number.isInteger(b.measured) && b.measured >= MIN_MEASURED_BUFFER && finite(b.meanDepth));
    const n = measured.length;
    const means = measured.map(b => b.meanDepth);
    const mean = n ? means.reduce((sum, m) => sum + m, 0) / n : null;
    const spread = n >= 2 ? Math.sqrt(means.reduce((sum, m) => sum + (m - mean) ** 2, 0) / (n - 1)) : null;
    const deep = measured.filter(b => b.meanDepth >= DEEP_BUFFER).length;
    const tailDeep = measured.filter(b => b.tail && finite(b.tail.depth.share) && b.tail.depth.share >= SYNCHRONY_TAIL).length;
    const lows = measured.map(b => (b.interval ? b.interval.lo : b.meanDepth));
    const highs = measured.map(b => (b.interval ? b.interval.hi : b.meanDepth));
    return {
      engaged: n > 0,
      reason: n > 0 ? null : "no buffer has enough measured orbs",
      orientation: SPEC.orientation,
      authority: SPEC.authority,
      prioritised: false,
      buffers: { total: list.length, measured: n, coverage: coarse(share(n, list.length)) },
      envelope: n ? { lo: coarse(Math.min(...lows)), hi: coarse(Math.max(...highs)) } : null,
      spread: coarse(spread),
      deepBuffers: { count: deep, share: coarse(share(deep, n)) },
      synchrony: coarse(share(tailDeep, n)),
      meanDepth: coarse(mean)
    };
  }

  /* ── readable text: fixed labels and numbers only ───────────────────── */
  const pct = value => (value === null || value === undefined ? "—" : `${Math.round(value * 100)}%`);
  const num = value => (value === null || value === undefined ? "—" : value.toFixed(1));
  function describe(result) {
    if (!result || !result.engaged) return `not engaged · ${result && result.reason ? result.reason : "no buffer read"} · held`;
    const env = result.envelope ? `${num(result.envelope.lo)}–${num(result.envelope.hi)}` : "—";
    return `meta-spheroid · outward · slow, coarse, non-binding · ${result.buffers.measured} of ${result.buffers.total} buffers measured · envelope ${env} · synchrony ${pct(result.synchrony)} · deep buffers ${pct(result.deepBuffers.share)} · snapshot, not a forecast`;
  }

  return Object.freeze({ SPEC, UPDATE_EVERY_MS, MIN_MEASURED_BUFFER, DEEP_BUFFER, SYNCHRONY_TAIL, due, systemic, describe });
});
