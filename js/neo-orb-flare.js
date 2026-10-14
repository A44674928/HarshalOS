/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Flare for NEO ORB (js/neo-orb-flare.js)
   Quasar-like jets for the Quasar shell, a magnetar-like flare for the
   Reinsurance halo, and a per-orb flare for an orb deep in its own reading.

   Flare is display motion, not a body, not a mode, not a phase, and not a
   reading. It turns numbers the other modules already published into motion and
   colour, and it publishes nothing back.

   What may drive what, and why:

     · The Quasar jets read Quasar Mode's own roster-level numbers (the tail
       share at depth >= 0.8). They are drawn on the shell, which is already a
       roster-level object, and they are radially symmetric: two opposed beams
       whose common axis drifts, so no sector is ever the one they point at.
       Quasar's rules allow this because nothing here is per-orb.

     · The Reinsurance halo flare reads Reinsurance's own synchrony, and is
       drawn on the halo Reinsurance already owns.

     · The per-orb flare reads ONLY that orb's Black Hole Computing reading —
       its own depth and its own pressure. It never sees another orb, a roster
       aggregate, a mean, or a share, so it cannot rank: two orbs with the same
       reading flare identically wherever they sit, and an orb's flare does not
       change when the orbs around it do. This is the one sanctioned per-orb
       return, the same channel that already carries pressure into motion and
       brightness (setPressures, litFor).

   Spec invariants kept here:
     • outward only: every function is pure; the field, the model, and the
       colour rules never read what this returns (§8, the hourglass rules)
     • non-prioritised: no symbol, rank, order, or remedy appears in any output,
       and no output depends on the order or company of its inputs (§6)
     • no preference learned: nothing is stored; the clock is the caller's, so
       freezing it freezes the flare — which is what prefers-reduced-motion does
     • colour is not market colour: the ramp runs rose to white, deliberately
       outside the market palette (cyan / orange / grey) and the basis-ring
       colours (yellow / violet / grey), so motion cannot be misread as state

   Display-only. Not a forecast, a quote, a rank, or a recommendation.
   ═══════════════════════════════════════════════════════════════ */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NeoOrbFlare = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const TAU = Math.PI * 2;

  const SPEC = Object.freeze({
    name: "Flare",
    category: "display motion (not a body, not a mode, not a phase, not a reading)",
    normative: "non-normative, capability-only",
    authority: "none",
    orientation: "outward",
    prioritised: false,
    persists: false
  });

  /* One ramp, rose to white. It is deliberately outside every colour the market
     layer uses, so a bright flare never reads as a rally or a sink. */
  const PALETTE = Object.freeze({ cool: "#ff5fa2", hot: "#fff4fa" });

  const CADENCE = Object.freeze({
    jet: 9,      // seconds for one streak to run the length of a jet
    halo: 21,    // seconds per burst cycle — slow, because Reinsurance is slow
    orb: 4.5,    // seconds per per-orb pulse
    axis: 240    // seconds for the jet axis to drift a full turn
  });

  const JET_STREAKS = 3;
  const JET_FLOOR = 0.18;          // a measured shell always shows a little
  const ORB_FLOOR = 0.2;           // an orb in the tail always shows a little, even at the threshold
  const HALO_RINGS = 3;
  const HALO_DECAY = 4.5;          // the magnetar shape: fast rise, long decay
  const HALO_STAGGER = 0.07;       // the burst reaches each ring slightly later
  /* The same thresholds Quasar Mode uses, applied here to one orb's own reading
     instead of to a roster share. An orb does not become "deep" by comparison. */
  const TAIL_DEPTH = 0.8;
  const TAIL_PRESSURE = 0.6;

  const finite = value => typeof value === "number" && Number.isFinite(value);
  const clamp01 = value => (finite(value) ? Math.min(1, Math.max(0, value)) : 0);
  const wrap01 = value => (finite(value) ? value - Math.floor(value) : 0);
  const seconds = value => (finite(value) && value >= 0 ? value : 0);
  const round4 = value => Math.round(value * 10000) / 10000;

  function mixHex(from, to, t) {
    const amount = clamp01(t);
    const parse = hex => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
    const a = parse(from), b = parse(to);
    const channel = index => Math.round(a[index] + (b[index] - a[index]) * amount);
    return `#${[0, 1, 2].map(index => channel(index).toString(16).padStart(2, "0")).join("")}`;
  }

  /* ── the Quasar jets ──────────────────────────────────────────────────
     Roster-level, from Quasar's own tail share. Two opposed beams on a drifting
     axis, with streaks running outward along each. Geometry is the caller's:
     `length` and `width` are fractions of the shell radius, `streaks[i].t` is
     how far along a streak has travelled, 0 at the shell and 1 at the tip. */
  function quasarJets(quasar, clock = 0) {
    const engaged = !!(quasar && quasar.engaged && quasar.interval &&
      Number.isInteger(quasar.measured) && quasar.measured >= 2);
    const share = engaged && quasar.tail && finite(quasar.tail.depth && quasar.tail.depth.share)
      ? clamp01(quasar.tail.depth.share)
      : 0;
    const intensity = engaged ? clamp01(JET_FLOOR + (1 - JET_FLOOR) * share) : 0;
    const t = seconds(clock);
    const phase = wrap01(t / CADENCE.jet);
    const streaks = [];
    for (let index = 0; index < JET_STREAKS; index += 1) {
      streaks.push(Object.freeze({ t: round4(wrap01(phase + index / JET_STREAKS)) }));
    }
    return Object.freeze({
      engaged,
      intensity: round4(intensity),
      phase: round4(phase),
      streaks: Object.freeze(streaks),
      length: round4(0.35 + 0.55 * intensity),
      width: round4(0.6 + 1.4 * intensity),
      /* A drifting axis, so the beams are never a fixed sector's. */
      axis: round4(TAU * wrap01(t / CADENCE.axis)),
      color: mixHex(PALETTE.cool, PALETTE.hot, intensity),
      orientation: SPEC.orientation,
      authority: SPEC.authority,
      prioritised: false,
      persists: false
    });
  }

  /* ── the Reinsurance halo flare ───────────────────────────────────────
     Systemic, from Reinsurance's own synchrony. A burst rises fast and decays
     slowly, and reaches each ring a little after the one inside it, so the halo
     reads as one structure flaring rather than three rings blinking. A frozen
     clock is a fixed point in the cycle, never a blank. */
  function reinsuranceFlare(reinsurance, clock = 0) {
    const engaged = !!(reinsurance && reinsurance.engaged);
    const synchrony = engaged && finite(reinsurance.synchrony) ? clamp01(reinsurance.synchrony) : 0;
    const cycle = wrap01(seconds(clock) / CADENCE.halo);
    const burstAt = offset => round4(Math.exp(-wrap01(cycle - offset + 1) * HALO_DECAY));
    const rings = [];
    for (let index = 0; index < HALO_RINGS; index += 1) {
      rings.push(Object.freeze({ index, burst: burstAt(index * HALO_STAGGER) }));
    }
    const intensity = clamp01(0.15 + 0.85 * synchrony);
    return Object.freeze({
      engaged,
      synchrony: round4(synchrony),
      intensity: round4(intensity),
      cycle: round4(cycle),
      rings: Object.freeze(rings),
      color: mixHex(PALETTE.cool, PALETTE.hot, intensity),
      orientation: SPEC.orientation,
      authority: SPEC.authority,
      prioritised: false,
      persists: false
    });
  }

  /* ── the per-orb flare ────────────────────────────────────────────────
     One orb, from its own Black Hole reading only. `seed` (0…1, derived from
     the orb's id by the caller) offsets the pulse so the roster does not flare
     in unison; it changes the phase and nothing else. Two orbs with the same
     reading and the same seed flare identically, and neither is affected by
     what the other does — the function never sees a second reading. */
  function orbFlare(reading, clock = 0, seed = 0) {
    const depth = reading && finite(reading.depth) ? reading.depth : null;
    const pressure = reading && finite(reading.pressure) ? reading.pressure : null;
    /* The tail is entered, as in Quasar, at the threshold itself — an orb sitting
       exactly at 0.8 is in the tail, not just outside it. How far past the
       threshold it sits is what sets the strength, so the flare still says how
       deep rather than only that it is deep. */
    const inTail = (depth !== null && depth >= TAIL_DEPTH) || (pressure !== null && pressure >= TAIL_PRESSURE);
    const depthTerm = depth === null ? 0 : clamp01((depth - TAIL_DEPTH) / (1 - TAIL_DEPTH));
    const pressureTerm = pressure === null ? 0 : clamp01((pressure - TAIL_PRESSURE) / (1 - TAIL_PRESSURE));
    const intensity = inTail ? clamp01(ORB_FLOOR + (1 - ORB_FLOOR) * Math.max(depthTerm, pressureTerm)) : 0;
    const active = intensity > 0;
    const pulse = 0.5 + 0.5 * Math.sin(TAU * (seconds(clock) / CADENCE.orb + clamp01(seed)));
    return Object.freeze({
      active,
      intensity: round4(intensity),
      pulse: round4(pulse),
      spikes: active ? 3 + Math.round(intensity * 5) : 0,
      reach: active ? round4(1.2 + 1.8 * intensity) : 0,
      color: mixHex(PALETTE.cool, PALETTE.hot, intensity),
      authority: SPEC.authority,
      prioritised: false,
      persists: false
    });
  }

  /* ── readable text: fixed labels and numbers only ───────────────────── */
  const pct = value => `${Math.round(value * 100)}%`;

  function jetsText(jets) {
    if (!jets || !jets.engaged) return "no jets — Quasar has not measured enough orbs";
    return `jets ${pct(jets.intensity)} of full · ${jets.streaks.length} streaks · axis drifting · outward, non-prioritised`;
  }
  function haloText(halo) {
    if (!halo || !halo.engaged) return "no halo — Reinsurance has not engaged";
    return `halo ${pct(halo.intensity)} · synchrony ${pct(halo.synchrony)} · burst at cycle ${halo.cycle.toFixed(2)} · outward, non-prioritised`;
  }
  function orbText(flare) {
    if (!flare || !flare.active) return "no flare — this orb's own reading is outside the tail";
    return `flare ${pct(flare.intensity)} · ${flare.spikes} spikes · from this orb's own depth and pressure only`;
  }

  return Object.freeze({
    SPEC, PALETTE, CADENCE, JET_STREAKS, HALO_RINGS, TAIL_DEPTH, TAIL_PRESSURE,
    quasarJets, reinsuranceFlare, orbFlare, mixHex, jetsText, haloText, orbText
  });
});
