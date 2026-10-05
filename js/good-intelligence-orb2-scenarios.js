/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Good Intelligence / Orb 2 beat-type scenarios.

   The Orb 2 dial offers five beat types. Exactly one of them — `observation` —
   carries provider data. The other four are *local scenario visualizations*
   choreographed from a stored server beat:

     message        an envelope travels origin → berth → origin
     trade          two berths exchange an item (needs supplied volume)
     authorization  the Human Key is presented at the Center Origin gate
     permission     a bounded permission envelope is presented, scoped, withdrawn

   Hard boundaries, matching docs/architecture/PINE-OCM-INTEGRATION.md and the
   Orb 2 bridge document:

     · No OCM message is transmitted anywhere. Every scenario is a drawing.
     · Nothing here authorizes, grants, permits, or executes anything. The word
       "authorization" names a *display phase*, never an outcome.
     · A scenario is deterministic: the same stored beat and the same clock
       produce the same phases, so two clients watching the same server beat see
       the same picture. Nothing is random and nothing is invented: the geometry
       and the pacing come from supplied market fields only.
     · A berth that cannot supply what a type needs does not get the type. The
       caller passes the observation; `available()` is the gate, and a refused
       type renders as unavailable rather than as a plausible animation.

   Every function is pure. `now` is always passed in.
   ═══════════════════════════════════════════════════════════════ */
"use strict";

(() => {
  const SCHEMA = "gi-orb2-scenario-v1";
  const TRITIUM = "#5df08c";
  const TYPES = Object.freeze([
    Object.freeze({
      id: "observation", label: "Market observation", live: true, gate: "stored",
      summary: "One reviewed instrument's newest provider observation. The only beat type that carries provider data.",
      boundary: "Provider observation only. Display context; not advice, assurance, or permission to act."
    }),
    Object.freeze({
      id: "message", label: "OCM message", live: false, gate: "market",
      summary: "Local scenario: an envelope travels origin → berth → origin. No OCM message is sent.",
      boundary: "Local teaching visualization. No OCM message is transmitted, and no recipient is contacted."
    }),
    Object.freeze({
      id: "trade", label: "Trade", live: false, gate: "volume",
      summary: "Local scenario: two berths exchange an item while supplied volume is available. Nothing is bought or settled.",
      boundary: "Local teaching visualization. No trade is placed, matched, or settled; no instrument changes hands."
    }),
    Object.freeze({
      id: "authorization", label: "Authorization", live: false, gate: "confirmed",
      summary: "Local scenario: the Human Key is presented at the Center Origin gate. It grants nothing and authorizes nothing.",
      boundary: "Local teaching visualization. The gate readout is display-only: it issues no credential and resolves no claim."
    }),
    Object.freeze({
      id: "permission", label: "Permission to act", live: false, gate: "motion",
      summary: "Local scenario: a bounded permission envelope is presented, scoped, and withdrawn. Nothing becomes permitted.",
      boundary: "Local teaching visualization. No permission is granted, carried, or consumable outside this drawing."
    })
  ]);
  const TYPE_IDS = Object.freeze(TYPES.map(type => type.id));
  const SCENARIO_TYPES = Object.freeze(TYPE_IDS.filter(id => id !== "observation"));
  const finite = value => typeof value === "number" && Number.isFinite(value);
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const hash32 = value => {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };
  const idOf = type => TYPES.find(entry => entry.id === type) || null;

  /** Does this stored observation support this beat type? */
  function available(type, observation) {
    const entry = idOf(type);
    if (!entry) return false;
    if (entry.gate === "stored") return Boolean(observation);
    if (!observation) return false;
    const market = observation.market;
    if (entry.gate === "market") return Boolean(market);
    if (entry.gate === "volume") {
      return Boolean(market && market.volumeAvailable === true
        && market.latestBar && finite(Number(market.latestBar.volume)));
    }
    if (entry.gate === "confirmed") return observation.confirmed === true && Boolean(market);
    if (entry.gate === "motion") return Boolean(observation.motion);
    return false;
  }

  /**
   * Market-derived pacing. Every number comes from supplied fields: a delta from
   * the observed change, a pressure from VFI, a width from the Fibonacci band.
   * Unavailable fields leave the scenario at its slowest honest pace instead of
   * substituting a plausible value.
   */
  function metrics(observation) {
    const market = observation && observation.market;
    const bar = market && market.latestBar;
    const changePct = market && finite(Number(market.changePct)) ? Number(market.changePct) : null;
    const vfi = market && market.vfi && market.vfi.available === true && finite(Number(market.vfi.value))
      ? Number(market.vfi.value) : null;
    const bandHalf = market && market.bands && finite(Number(market.bands.upper1000)) && finite(Number(market.bands.lower1000))
      && Number(market.basis) > 0
      ? Math.abs(Math.log(Number(market.bands.upper1000)) - Math.log(Number(market.bands.lower1000))) / 2 : null;
    const mood = observation && observation.motion && observation.motion.mood ? observation.motion.mood : "unknown";
    return Object.freeze({
      symbol: String(observation && observation.symbol || ""),
      close: bar && finite(Number(bar.close)) ? Number(bar.close) : null,
      changePct,
      direction: changePct === null ? 0 : Math.sign(changePct),
      magnitude: changePct === null ? 0 : clamp(Math.abs(changePct) / 5, 0, 1),
      pressure: vfi === null ? 0 : clamp(Math.abs(vfi) / 50, 0, 1),
      pressureDirection: vfi === null ? 0 : Math.sign(vfi),
      widthPct: bandHalf === null ? null : bandHalf * 200,
      mood,
      volume: market && market.volumeAvailable === true && bar && finite(Number(bar.volume)) ? Number(bar.volume) : null,
      phase: (hash32(String(observation && observation.symbol || "")) % 360) / 360
    });
  }

  /**
   * Build the phases of one scenario. A phase is a leg of the drawing:
   * where it travels, how long it is held, and the color channel it belongs to.
   */
  function scenarioFor(type, observation, options = {}) {
    const entry = idOf(type);
    if (!entry || entry.id === "observation") {
      return Object.freeze({ schema: SCHEMA, type: "observation", available: Boolean(observation), phases: Object.freeze([]) });
    }
    if (!available(type, observation)) {
      return Object.freeze({
        schema: SCHEMA, type: entry.id, label: entry.label, available: false,
        reason: reasonFor(entry.gate), phases: Object.freeze([]),
        boundary: entry.boundary, source: "unavailable"
      });
    }
    const metric = metrics(observation);
    const beat = observation.motion || null;
    const clock = finite(Number(options.now)) ? Number(options.now) : 0;
    // A beat lasts as long as the mood is loud: calm observations hold their
    // scenario longer, fast ones cycle sooner, and nothing is randomized.
    const cycle = Math.round(3200 + (1 - metric.magnitude) * 4200 + metric.pressure * 1400);
    const seed = (clock / cycle) + metric.phase;
    const stride = 0.5 + metric.pressure * 0.5;
    const phases = [];
    const push = (id, label, from, to, start, duration, color, channel) => phases.push(Object.freeze({
      id, label, from, to, channel, color,
      start: start * cycle,
      duration: Math.max(120, duration * cycle),
      stride
    }));

    if (entry.id === "message") {
      const outbound = metric.direction >= 0;
      push("envelope-out", outbound ? "Envelope: origin → berth" : "Envelope: berth → origin",
        "origin", "berth", 0, 0.3, "#6fd3ff", "inward");
      push("envelope-hold", "Berth holds the envelope", "berth", "berth", 0.3, 0.22, "#a86bff", "resolve");
      push("envelope-back", outbound ? "Envelope returns to origin" : "Envelope returns to the berth",
        "berth", "origin", 0.52, 0.3, "#5ce6a8", "outward");
      push("envelope-land", "Envelope retires; nothing is sent", "origin", "origin", 0.82, 0.18, TRITIUM, "resolve");
    } else if (entry.id === "trade") {
      push("offer", `Item leaves ${metric.direction < 0 ? "berth" : "origin"} for review`, "berth", "origin", 0, 0.34, "#ffd479", "inward");
      push("exchange", "Counter-item crosses the origin", "origin", "berth", 0.34, 0.34, "#5ce6a8", "outward");
      push("settle-hold", "Both items held; nothing is settled", "berth", "berth", 0.68, 0.2, "#74839a", "resolve");
      push("return", "Items return to their berths", "berth", "origin", 0.88, 0.12, "#6fd3ff", "outward");
    } else if (entry.id === "authorization") {
      push("key-present", "Human Key presented at the origin gate", "berth", "origin", 0, 0.32, "#5df08c", "inward");
      push("gate-read", "Gate reads phase and gate state", "origin", "origin", 0.32, 0.24, "#ffd479", "resolve");
      push("key-return", "The key returns; nothing was granted", "origin", "berth", 0.56, 0.3, "#6fd3ff", "outward");
      push("gate-idle", "Gate returns to its watch state", "origin", "origin", 0.86, 0.14, "#74839a", "resolve");
    } else {
      push("scope-in", "Permission envelope presented", "berth", "origin", 0, 0.28, "#a86bff", "inward");
      push("scope-bound", "Scope bounded to one berth and one window", "origin", "origin", 0.28, 0.24, "#ffd479", "resolve");
      push("scope-hold", "Envelope held; it permits nothing", "origin", "berth", 0.52, 0.22, "#74839a", "outward");
      push("scope-out", "Envelope withdrawn", "berth", "berth", 0.74, 0.26, "#ff9d6c", "lateral");
    }

    const bearing = beat && beat.npc && finite(Number(beat.npc.bearing)) ? Number(beat.npc.bearing) : 0;
    const itemRate = beat && beat.item && finite(Number(beat.item.rate)) ? Number(beat.item.rate) : 0;
    return Object.freeze({
      schema: SCHEMA,
      type: entry.id,
      label: entry.label,
      summary: entry.summary,
      boundary: entry.boundary,
      available: true,
      symbol: metric.symbol,
      cycleMs: cycle,
      phase: seed - Math.floor(seed),
      activePhase: phases[Math.floor((seed - Math.floor(seed)) * phases.length)]?.id || phases[0].id,
      direction: metric.direction,
      magnitude: metric.magnitude,
      pressure: metric.pressure,
      widthPct: metric.widthPct,
      volume: metric.volume,
      mood: metric.mood,
      bearing,
      itemRate,
      phases: Object.freeze(phases),
      source: "derived-from-stored-server-beat",
      note: "Deterministic local scenario. The picture is a function of the stored server beat, not a second data source."
    });
  }

  function reasonFor(gate) {
    if (gate === "market") return "This berth has no market observation, so the message scenario is not offered.";
    if (gate === "volume") return "The exchange scenario needs supplied volume; this observation has none, so it is not offered.";
    if (gate === "confirmed") return "The gate scenario needs a confirmed close; this observation is unconfirmed, so it is not offered.";
    if (gate === "motion") return "No motion directive was stored for this berth, so the permission scenario is not offered.";
    return "This beat type is not available for the current observation.";
  }

  function describe(scenario) {
    if (!scenario) return "No scenario is selected.";
    if (!scenario.available) return `${scenario.label || "This beat type"} · ${scenario.reason || scenario.reasonFor || "unavailable"}`;
    const active = scenario.phases.find(phase => phase.id === scenario.activePhase) || scenario.phases[0];
    return `${scenario.label} · ${active ? active.label : "phase unavailable"} · ${scenario.boundary || ""}`.trim();
  }

  /** Types offered for one observation, in dial order. */
  function offered(observation) {
    return TYPES.filter(type => available(type.id, observation)).map(type => type.id);
  }

  window.GoodIntelligenceOrb2Scenarios = Object.freeze({
    SCHEMA, TYPES, TYPE_IDS, SCENARIO_TYPES,
    available, offered, metrics, scenarioFor, describe, reasonFor, hash32
  });
})();
