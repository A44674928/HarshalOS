/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Characters: the cast and the stage layout.

   The Characters app does not invent a new world. It reuses the one already
   on disk: the NPCs are the named residents of the palace
   (docs/architecture/NPC-CODEX.md), the Items are the `Name.$` tokens the
   codex defines — passes, chips, capsules, deploy tokens — and the Objects
   are the berth furniture the market wings need (a stone, a gate, a mast).

   The cast is *bound to the reviewed Tickerbot watchlist at runtime*, never
   to a second copy of it: every sector is a watchlist sector, every berth is
   one symbol, and if the watchlist changes the stage changes with it. Nothing
   here is a second allowlist that could drift from the Worker's.

   Layout is pure geometry on a unit circle (angle in radians, radius as a
   fraction of the stage): deterministic, testable, and independent of the
   canvas size the renderer happens to have.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

window.CharactersCast = (() => {
  const SCHEMA = "characters-cast-v1";

  /* Canonical Path palette (the same tints scripts/palace-day.mjs uses). */
  const PALETTE = Object.freeze([
    { name: "ALL-SEEING EYE PURPLE", hex: "#a86bff" },
    { name: "VISION RED", hex: "#ff3b57" },
    { name: "DAY WHITE", hex: "#f2ede2" },
    { name: "CONVERGENCE CYAN", hex: "#35d9e8" },
    { name: "ETERNAL HORIZON ORANGE", hex: "#ff9540" },
    { name: "MOON YELLOW", hex: "#ffd94a" },
    { name: "LUCK AND CAPSULE NUMBER SET", hex: "#d5a8ff" },
    { name: "STORM BLUE", hex: "#4f8dff" },
    { name: "BALANCE GREEN", hex: "#3ddc84" },
    { name: "REPLICATOR GRAY", hex: "#9aa3ad" },
    { name: "DEATH ACID", hex: "#9dff2e" }
  ]);

  /* NPCs drawn from the palace roster, with the sector each one is posted to
     when that sector is present. `affinity` is a preference, not a
     requirement: berths are filled deterministically and every symbol gets a
     resident even when no affinity matches. Two shifts share a nameplate at
     this cast size — the palace does the same with its own rota. */
  const NPC_ROSTER = Object.freeze([
    { name: "The Market Tickerbot", role: "Reads the market context feed; display-only", glyph: "◈", affinity: ["Technology & platforms"] },
    { name: "The Timekeeper", role: "Ticks the display-only clock the beat is stamped against", glyph: "◷", affinity: ["Index & sector ETFs"] },
    { name: "The Librarian", role: "Curates the reference shelf; files each beat", glyph: "▤", affinity: ["Consumer & retail"] },
    { name: "The Magistrate", role: "Refuses to let a draft pass as law; refuses to let motion pass as advice", glyph: "⚖", affinity: ["Financials"] },
    { name: "The OCM Operator", role: "Routes messages along the Resolution Axis", glyph: "✳", affinity: ["Software, cloud & cyber"] },
    { name: "The Red Team Adversary", role: "Probes at 03:00 and 15:00; everything refused so far", glyph: "☠", affinity: ["Software, cloud & cyber"] },
    { name: "The Supply Chain Inspector", role: "Inspects the documentation of the documentation", glyph: "⛓", affinity: ["Industrial & defense"] },
    { name: "The Bandwidth Referee", role: "Rules on whether your internet is faster; it usually is not", glyph: "⇄", affinity: ["Technology & platforms"] },
    { name: "The Chef", role: "Second seating at 18:00 sharp", glyph: "✿", affinity: ["Consumer & retail"] },
    { name: "The Inkeeper", role: "The hearth never fully goes out", glyph: "⌂", affinity: ["Consumer & retail"] },
    { name: "The Designated Survivor", role: "Sealed all day; that is the job", glyph: "✜", affinity: ["Industrial & defense"] },
    { name: "Meowie Wowie", role: "Sleeps sixteen of twenty-four hours, on average", glyph: "❋", affinity: ["Health care"] },
    { name: "The Hyper Mage", role: "The midnight circle runs 00:00–03:00; do not knock", glyph: "✦", affinity: ["Crypto & fintech"] },
    { name: "The Palantir Seer", role: "Watches; the Shadow Hand is not watched back", glyph: "◉", affinity: ["Software, cloud & cyber"] },
    { name: "The Shadow Hand", role: "Officially not in this wing", glyph: "✧", affinity: ["Crypto & fintech"] },
    { name: "The Storm Watcher", role: "Watches the Storm-0558 sky all night", glyph: "⚡", affinity: ["Energy"] },
    { name: "The Federal Reserve Chair", role: "Takes the 06:30 briefing before the market opens", glyph: "⌘", affinity: ["Financials"] },
    { name: "The Doge of the Treasury", role: "Audits a meme at 16:30; the meme survives", glyph: "Ð", affinity: ["Financials"] },
    { name: "The Sorter Apprentice", role: "Triages the day's arrivals: documents, stuff, and both", glyph: "⊞", affinity: ["Semiconductors"] },
    { name: "The Ice Bourne Gauntlet Warden", role: "Thrown, caught, and thrown again before breakfast", glyph: "❄", affinity: ["Autos & EV"] },
    { name: "TOTOPOTUS", role: "Holds the Alphabet Throne", glyph: "Ω", affinity: ["Index & sector ETFs"] },
    { name: "The Insult Auditor", role: "Audits the question; the question is filed", glyph: "▣", affinity: ["Consumer & retail"] },
    { name: "The Untitled Entity", role: "Lives in the untitled folder; declines a title", glyph: "□", affinity: ["Health care"] },
    { name: "Repeater", role: "Does now what it was doing an hour ago", glyph: "⟳", affinity: ["Semiconductors"] },
    { name: "The Veto Clerk", role: "Stamps NO faster than the Ultra Fast Judge can rule", glyph: "⊘", affinity: ["Health care"] },
    { name: "The Flame Tender", role: "Advances frames 1 through 120 and back, forever", glyph: "▲", affinity: ["Energy"] }
  ]);

  /* Objects are berth furniture — one per sector, anchored at the sector's
     mid-arc. They do not walk: they sway, pulse, and open on a band break. */
  const SECTOR_OBJECTS = Object.freeze({
    "Technology & platforms": { kind: "ledger stone", glyph: "▮" },
    "Semiconductors": { kind: "wafer gate", glyph: "⌸" },
    "Software, cloud & cyber": { kind: "signal mast", glyph: "⌁" },
    "Energy": { kind: "flame well", glyph: "◍" },
    "Financials": { kind: "vault door", glyph: "▤" },
    "Health care": { kind: "apothecary chest", glyph: "✚" },
    "Consumer & retail": { kind: "market stall", glyph: "⌗" },
    "Industrial & defense": { kind: "crane", glyph: "⌹" },
    "Autos & EV": { kind: "charging plinth", glyph: "⌺" },
    "Crypto & fintech": { kind: "capsule dispenser", glyph: "◍" },
    "Index & sector ETFs": { kind: "weather vane", glyph: "✥" }
  });
  const FALLBACK_OBJECT = Object.freeze({ kind: "berth plinth", glyph: "▫" });

  /* Items use the codex's `Name.$` token vocabulary and the canonical Path
     colors; they flow along each berth's lane at a volume-driven rate. */
  const ITEM_KINDS = Object.freeze([
    { kind: "color chip", glyph: "▪" },
    { kind: "capsule", glyph: "⬮" },
    { kind: "deploy token", glyph: "⬢" },
    { kind: "lounge pass", glyph: "▬" },
    { kind: "currency note", glyph: "▭" }
  ]);

  const TAU = Math.PI * 2;
  const SECTOR_GAP = 0.06; // radians of empty ring between sector arcs
  const BERTH_INNER = 0.62; // berth radius as a fraction of the stage radius
  const BERTH_OUTER = 0.86;

  const slug = value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  /* Deterministic roster walk: affinity first, then the remaining berths in
     roster order, so the same watchlist always produces the same cast. */
  function assignNpcs(berths) {
    const remaining = [...NPC_ROSTER];
    const assignments = new Array(berths.length).fill(null);
    berths.forEach((berth, index) => {
      const match = remaining.findIndex(npc => npc.affinity.includes(berth.sectorName));
      if (match >= 0) assignments[index] = remaining.splice(match, 1)[0];
    });
    const cycle = [...NPC_ROSTER];
    let cursor = 0;
    berths.forEach((berth, index) => {
      if (assignments[index]) return;
      assignments[index] = cycle[cursor % cycle.length];
      cursor += 1;
    });
    return assignments;
  }

  function build(watchlist, options = {}) {
    const entries = (Array.isArray(watchlist) ? watchlist : [])
      .filter(entry => entry && typeof entry.symbol === "string" && entry.symbol.trim())
      .map(entry => ({
        symbol: entry.symbol.trim().toUpperCase(),
        name: String(entry.name || entry.symbol).trim(),
        sector: String(entry.sector || "Unassigned").trim()
      }));
    const sectorsById = new Map();
    entries.forEach(entry => {
      if (!sectorsById.has(entry.sector)) sectorsById.set(entry.sector, []);
      sectorsById.get(entry.sector).push(entry);
    });
    const sectors = [...sectorsById.keys()].map(name => ({ name, id: slug(name), symbols: sectorsById.get(name) }));
    const count = Math.max(1, sectors.length);
    const arc = (TAU - SECTOR_GAP * count) / count;

    const berthSeeds = [];
    sectors.forEach((sector, index) => {
      const start = -Math.PI / 2 + index * (arc + SECTOR_GAP) + SECTOR_GAP / 2;
      sector.arcStart = start;
      sector.arcEnd = start + arc;
      sector.midAngle = start + arc / 2;
      sector.tint = PALETTE[index % PALETTE.length];
      sector.object = { ...(SECTOR_OBJECTS[sector.name] || FALLBACK_OBJECT), name: `The ${sector.name} ${(SECTOR_OBJECTS[sector.name] || FALLBACK_OBJECT).kind}` };
      sector.symbols.forEach((entry, position) => {
        const span = sector.symbols.length > 1 ? arc * 0.82 : 0;
        const angle = sector.symbols.length > 1
          ? sector.arcStart + arc * 0.09 + (span * position) / (sector.symbols.length - 1)
          : sector.midAngle;
        berthSeeds.push({ ...entry, sectorName: sector.name, sectorId: sector.id, angle, sectorIndex: index });
      });
    });

    const npcs = assignNpcs(berthSeeds);
    const berths = berthSeeds.map((seed, index) => ({
      symbol: seed.symbol,
      name: seed.name,
      sectorName: seed.sectorName,
      sectorId: seed.sectorId,
      sectorTint: PALETTE[seed.sectorIndex % PALETTE.length],
      angle: seed.angle,
      radius: BERTH_INNER + (BERTH_OUTER - BERTH_INNER) * (seed.sectorIndex % 2 === 0 ? 0 : 1),
      npc: npcs[index],
      item: { ...ITEM_KINDS[index % ITEM_KINDS.length], color: PALETTE[index % PALETTE.length] }
    }));

    return Object.freeze({
      schema: SCHEMA,
      watchlistSize: entries.length,
      sectors: Object.freeze(sectors.map(sector => Object.freeze({ ...sector, symbols: Object.freeze(sector.symbols) }))),
      berths: Object.freeze(berths.map(berth => Object.freeze({ ...berth, npc: Object.freeze(berth.npc), item: Object.freeze(berth.item) }))),
      note: "Cast assignment is deterministic for a given watchlist. NPC names come from docs/architecture/NPC-CODEX.md; items use the `Name.$` token vocabulary."
    });
  }

  return Object.freeze({ SCHEMA, PALETTE, NPC_ROSTER, SECTOR_OBJECTS, ITEM_KINDS, BERTH_INNER, BERTH_OUTER, build, slug });
})();
