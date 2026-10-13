/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Black Hole Computing for NEO ORB (js/neo-orb-black-hole.js)
   Specification: docs/harshal-systems/12-ground-zero.md, "Black Hole Computing (BHC)
   Compute Modality Specification (AGS++)".

   Black Hole Computing is a compute modality, not a body, phase, mode, orb, or authority.
   Here it is the deep per-orb reading: the six-envelope depth, the composed position, the
   VFI flow, and Orb 2's pressure, all computed from one stored row per orb. Its outputs
   carry no colour, rank, order, action, or legitimacy. Colour and placement never read it.

     engage     the host PDH binding: BHC runs only where the host declares no authority
     deepen     one reading per orb from the stored rows, through the injected signals module

   Spec invariants kept here:
     • capability only: nothing this module returns changes a phase, a colour, a position,
       or any decision (§2–§4, §9)
     • bound by the host PDH: a host that declares authority refuses BHC (§8)
     • no stored text is passed through: a reading holds numbers and state names only
     • pure math: no network, no DOM, no storage, no route

   Display-only. Not a forecast, a quote, a rank, or a recommendation.
   ═══════════════════════════════════════════════════════════════ */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NeoOrbBlackHole = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const SPEC = Object.freeze({
    name: "Black Hole Computing",
    shortName: "BHC",
    category: "compute modality (not a body, not a phase)",
    normative: "non-normative, capability-only",
    deployability: "context-dependent, bound by the host PDH",
    authority: "none",
    phase: "unchanged"
  });

  /* NEO ORB has no Phase Declaration Header of its own. Its declared host scope is display
     only: it reads one stored field and holds no authority. A host that declares any other
     authority refuses BHC (spec §8). */
  const NEO_ORB_HOST = Object.freeze({ kind: "display", authority: "none", reads: "one stored field row per orb" });

  const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
  /* A Map from any realm (the tests run modules in a vm context). */
  const isMap = value => Object.prototype.toString.call(value) === "[object Map]";

  /* ── engage: the host PDH binding ───────────────────────────────────── */
  function engage(host) {
    if (!isRecord(host)) return { engaged: false, reason: "no host declaration" };
    if (host.authority !== "none") return { engaged: false, reason: "bound by the host PDH: the host declares authority" };
    return { engaged: true, reason: null };
  }

  /* ── deepen: one reading per orb ─────────────────────────────────────
     records:      Map id → stored market row (as NeoOrbMarket.indexField gives it)
     compositions: Map id → stored composition (as NeoOrbMarket.indexComposition gives it), or null
     signals:      the NeoOrbSignals module, injected so this file has no global reads
     Returns { engaged, reason, total, measured, readings }. `measured` counts orbs whose
     depth is available; an orb with no depth is kept with depth null, never a neutral value. */
  function deepen(records, compositions, signals, host = NEO_ORB_HOST) {
    const gate = engage(host);
    const readings = new Map();
    if (!gate.engaged || !signals || !isMap(records)) {
      return { engaged: false, reason: gate.engaged ? "the signals module did not load" : gate.reason, total: 0, measured: 0, readings };
    }
    let measured = 0;
    for (const [id, market] of records) {
      const composition = isMap(compositions) ? (compositions.get(id) || null) : null;
      const depth = signals.depthOf(market);
      const position = signals.compositionOf(composition);
      const flow = signals.flowOf(market);
      const pressure = signals.pressureOf(market, composition);
      readings.set(id, Object.freeze({
        depth: depth.available ? depth.depth : null,
        components: depth.available ? depth.components.slice() : null,
        position: position.available ? position.position : null,
        flow: flow.state,
        pressure: pressure.value,
        pressureTerms: Object.freeze({ ...pressure.measured }),
        forceMultiplier: pressure.multiplier,
        authority: "none"
      }));
      if (depth.available) measured += 1;
    }
    return { engaged: true, reason: null, total: readings.size, measured, readings };
  }

  /* ── readable text ─────────────────────────────────────────────────── */
  function describe(result) {
    if (!result || !result.engaged) return `not engaged · ${result && result.reason ? result.reason : "no reading"}`;
    return `engaged · bound by host PDH (${NEO_ORB_HOST.kind}, authority ${NEO_ORB_HOST.authority}) · ${result.measured} of ${result.total} orbs measured · capability only, no colour, rank, or action · phase unchanged`;
  }

  function readingText(reading) {
    if (!reading) return "no stored row, so no reading";
    const depth = reading.depth === null ? "depth unmeasured" : `depth ${reading.depth.toFixed(2)}`;
    const position = reading.position === null ? "position not supplied" : `position ${reading.position.toFixed(2)}`;
    const terms = Object.entries(reading.pressureTerms).filter(([, ok]) => ok).map(([name]) => name);
    const pressure = `pressure ${reading.pressure.toFixed(2)} from ${terms.length ? terms.join(", ") : "no terms"}`;
    return `${depth} · ${position} · flow ${reading.flow} · ${pressure} · force ×${reading.forceMultiplier.toFixed(2)} · authority ${reading.authority}`;
  }

  return Object.freeze({ SPEC, NEO_ORB_HOST, engage, deepen, describe, readingText });
});
