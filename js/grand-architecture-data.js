/* ═══════════════════════════════════════════════════════════════
   HarshalOS — The Grand Architecture (GA) data layer
   Read-only reference data for the Grand Architecture desktop app.

   Provenance: the described setting is FICTION (NARRATIVE_SANDBOX).
   The numeric anchors below are DERIVATIVE_BUILD consequences of the
   stated assumptions in the canonical numbers card:
     updates/2026-10-02/02-Frameworks/Grand-River-Flow-Model/CANONICAL-NUMBERS.md
   tests/grand-architecture-test.mjs fails if any anchor figure stops
   matching that card, so this file cannot silently drift from canon.

   This module changes no state. It exposes no HOS authority capability,
   writes no ledger row, and asserts no engineering or deployment fact.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

const GRAND_ARCHITECTURE = (() => {

  /* ---------- Provenance and boundaries ---------- */
  const meta = Object.freeze({
    id: "grand-architecture",
    title: "The Grand Architecture",
    documentId: "GRAND-ARCHITECTURE-REF-20261002",
    provenanceClass: "FICTION",
    statusTaxonomy: "NARRATIVE_ARCHITECTURE_MODULE",
    evidenceStatus: "NARRATIVE_SANDBOX",
    researchLayer: "PUBLIC_RESEARCH_SUMMARY",
    modulePath: "docs/harshal-systems/modules/grand-architecture.md",
    canonicalNumbersPath: "updates/2026-10-02/02-Frameworks/Grand-River-Flow-Model/CANONICAL-NUMBERS.md",
    continuityAuditPath: "updates/2026-10-02/CONTINUITY-AUDIT.md",
    sourcePackagePath: "updates/2026-10-02/",
    authorityDisclaimer: "READ-ONLY REFERENCE — NO AUTHORITY EFFECT. This app renders library data only. It requests no action, changes no phase, writes no ledger row, and confers no legitimacy, identity, or capability on anything.",
    boundary: "Not an engineering design, feasibility finding, water-rights analysis, environmental review, permit, construction schedule, procurement plan, threat feed, detection package, or claim that any described work exists, is authorized, or can be built.",
    publishingHierarchy: "The architecture (Book I) is the library. The novel (Book II) is the work in active production."
  });

  /* ---------- The six layers ---------- */
  const layers = Object.freeze([
    Object.freeze({
      id: "GA-0",
      name: "Foundation",
      subject: "Grand River Hyperstructure",
      role: "Modular dam series, kinetic capture, non-hydro planning entry, flow control, and the secure compute enclave.",
      addresses: Object.freeze([
        "0•100•000•0091 — Grand River Design turbines",
        "0•100•000•0248 — small modular reactor array (assumed nameplate)",
        "0•100•000•0249 — current redirection flow matrix",
        "0•100•000•0179–0181 — Inner Shell secure compute enclave",
        "0•100•000•0176 — Canyon de Chelly saltwater bio-reserve",
        "0•100•000•0178 — carbon mineralization grid"
      ]),
      provenance: "FICTION"
    }),
    Object.freeze({
      id: "GA-1",
      name: "Conveyance",
      subject: "The Grand Aqueduct",
      role: "Three tiers: an open fresh-water channel, a seawater purification pipeline, and a gravity-fed purified stream.",
      addresses: Object.freeze([
        "0•100•000•0155 — municipal pipeline distribution",
        "0•100•000•0156 — desalination mid-pipeline nodes",
        "0•100•000•0195–0199 — bottling refineries"
      ]),
      provenance: "FICTION"
    }),
    Object.freeze({
      id: "GA-2",
      name: "Civic",
      subject: "Mistveil City",
      role: "Nine named levels, one 2100 population target, and the Human-Reactor as a civic metaphor rather than a generator.",
      addresses: Object.freeze([
        "0•100•000•0113 — New Capitol buildings",
        "0•100•000•0114–0115 — government agencies",
        "0•100•000•0318–0335 — municipal uplinks"
      ]),
      provenance: "FICTION"
    }),
    Object.freeze({
      id: "GA-3",
      name: "Institutional",
      subject: "Convergence institutions",
      role: "GELPA, Celestial Engineers, and Quantum Librarians. Addressable and auditable; never a source of real obligation or consent.",
      addresses: Object.freeze([
        "0•100•000•0262–0279 — research and education band",
        "0•100•000•0264 — Colorado River Institute",
        "0•100•000•0274 — Northern Arizona University Underwater"
      ]),
      provenance: "FICTION"
    }),
    Object.freeze({
      id: "GA-4",
      name: "Temporal",
      subject: "Universal Timekeeping System",
      role: "US / UM / UH / UDay durations and the approximate absolute UDate coordinate. Display-only; never a trusted time source.",
      addresses: Object.freeze([
        "no address — display-only instrumentation"
      ]),
      provenance: "DERIVATIVE_BUILD"
    }),
    Object.freeze({
      id: "GA-5",
      name: "Assurance",
      subject: "Storm-0558 review → SCAV++ crosswalk",
      role: "Claim ledger discipline: every incident-derived statement keeps its source, date, and evidence status.",
      addresses: Object.freeze([
        "no address — research vocabulary only"
      ]),
      provenance: "DERIVATIVE_BUILD"
    })
  ]);

  /* ---------- Architecture invariants ---------- */
  const invariants = Object.freeze([
    Object.freeze({
      id: "GA-INV-001",
      name: "Scale is not sovereignty",
      text: "Population, installed capacity, reservoir volume, or structural height confer no legitimacy. A GA layer is an addressable object, never an authority source: H(t) originates only at Center Origin (0•000•000•0000), and legitimacy is delegated, never migrated (INV-LEGIT-001)."
    }),
    Object.freeze({
      id: "GA-INV-002",
      name: "Address discipline",
      text: "Every GA component carries an OCM address in the documented form. The instance namespace is not the ℤ₃₆₀ sector ring, and naming a component creates no authority for it."
    }),
    Object.freeze({
      id: "GA-INV-003",
      name: "Conservation before narrative",
      text: "Head, flow, and energy are counted once. Serial tiers do not multiply head; a closed loop is a net consumer, not a generator; the same water may not be counted at two stages. Where a narrative figure and a mass balance disagree, the mass balance wins and the narrative figure is labelled superseded."
    }),
    Object.freeze({
      id: "GA-INV-004",
      name: "Provenance precedence",
      text: "Every GA claim carries a provenance class. No GA statement is promoted to specs/normative/, to the kernel, or to a production control."
    }),
    Object.freeze({
      id: "GA-INV-005",
      name: "Evidence discipline",
      text: "Incident-derived material keeps its claim status (CONFIRMED, ATTRIBUTED_HYPOTHESIS, UNKNOWN) and its source. A later-challenged hypothesis is never restated as a confirmed root cause."
    }),
    Object.freeze({
      id: "GA-INV-006",
      name: "No deployment, no consent implied",
      text: "GA asserts no permit, water right, feasibility finding, construction authorization, or consultation. Named real places, agencies, universities, and companies are setting references; none has been consulted and none is represented as participating."
    }),
    Object.freeze({
      id: "GA-INV-007",
      name: "Book II precedence for continuity",
      text: "The architecture is the library; the novel is the work in active production. GA is amended to follow the novel, never the reverse."
    })
  ]);

  /* ---------- Canonical quantity anchors ----------
     `figure` is quoted verbatim from CANONICAL-NUMBERS.md; the test suite
     asserts that each one still appears in that card. */
  const canonicalAnchors = Object.freeze([
    Object.freeze({ id: "GA-Q-001", quantity: "Workbook baseline throughput", figure: "2.190632 m³/s", detail: "50,000,000 US gal/day = 189,270.589 m³/day; a single 60-inch line", status: "Workbook assumption, not a municipal supply plan" }),
    Object.freeze({ id: "GA-Q-002", quantity: "Baseline line pumping input", figure: "41.76 MW", detail: "350 mi / 60 in / C=140 / 349.8 m friction + 1,219.2 m lift = 1,569.0 m at 85% pump, 95% motor", status: "Calculated; route unsurveyed" }),
    Object.freeze({ id: "GA-Q-003", quantity: "Baseline flow per resident", figure: "2.37 L/person/day", detail: "if every drop of the baseline line went to 80 million residents with zero loss", status: "Arithmetic comparison only" }),
    Object.freeze({ id: "GA-Q-004", quantity: "Aggregate transfer sensitivity", figure: "942.721 m³/s", detail: "29.75 km³ per Julian year expressed as a continuous rate", status: "Legacy regional-delivery sensitivity" }),
    Object.freeze({ id: "GA-Q-005", quantity: "Lines needed for that transfer", figure: "431 parallel 60-inch lines", detail: "about 242,770 cumulative pipeline-km under the same simplified assumptions", status: "Scale check, not a recommendation" }),
    Object.freeze({ id: "GA-Q-006", quantity: "Pumping input for that transfer", figure: "17.96 GW", detail: "before treatment, desalination, distribution, and city demand", status: "Sensitivity; exceeds the conditional generation sum" }),
    Object.freeze({ id: "GA-Q-007", quantity: "Return-turbine recovery ceiling", figure: "10.15 GW", detail: "one 90%-efficient pass back across the same assumed 1,219.2 m drop, leaving 7.81 GW net draw", status: "Unavailable for consumed water; no net-energy claim" }),
    Object.freeze({ id: "GA-Q-008", quantity: "Reservoir planning volume", figure: "73 km³", detail: "storage assumption only; geometry, dead storage, sediment, and losses are not designed", status: "Fictional planning volume" }),
    Object.freeze({ id: "GA-Q-009", quantity: "Fill time at a constant sensitivity flow", figure: "169 days", detail: "73 km³ at 5,000 m³/s with zero outlet or loss", status: "Volume ÷ inflow arithmetic" }),
    Object.freeze({ id: "GA-Q-010", quantity: "Fill time at the workbook baseline", figure: "385,691 days", detail: "about 1,056 Julian years at 2.190632 m³/s", status: "Volume ÷ inflow arithmetic" }),
    Object.freeze({ id: "GA-Q-011", quantity: "Conditional hydro, historical sample", figure: "5.69 GW", detail: "476 m³/s at 1,219.2 m gross head; 5.12 GW at 90% turbine-generator efficiency", status: "Historical sample context, not an allocation" }),
    Object.freeze({ id: "GA-Q-012", quantity: "High-flow sensitivity", figure: "59.80 GW", detail: "5,000 m³/s at 1,219.2 m gross head = 59.80 GW gross, 53.82 GW at 90%; 25,000 m³/s = 299.01 GW gross, 269.11 GW at 90%", status: "Flow sensitivity, not an established supply" }),
    Object.freeze({ id: "GA-Q-013", quantity: "Non-hydro planning entry", figure: "4.00 GW", detail: "80 × 50 MWe small modular reactors; conditional nameplate sum 9.12 GW", status: "Assumed nameplate, not a deployment plan" }),
    Object.freeze({ id: "GA-Q-014", quantity: "Portfolio ambition", figure: "1,000-GW (1-TW)", detail: "provisionally aggregate installed nameplate; 990.88 GW remains unallocated against the 9.12 GW sum", status: "Ambition; source mix and firm output unassigned" }),
    Object.freeze({ id: "GA-Q-015", quantity: "Illustrative average output", figure: "7.19 GW", detail: "63.0 TWh/year at 70% hydro and 90% SMR capacity factors", status: "Unvalidated capacity factors" }),
    Object.freeze({ id: "GA-Q-016", quantity: "Stored-volume energy ceiling", figure: "218.3 TWh", detail: "73 km³ passing the full 1,219.2 m gross head once at 90% efficiency", status: "Upper-bound illustration; not recurring generation" }),
    Object.freeze({ id: "GA-Q-017", quantity: "Mistveil 2100 target", figure: "80 million", detail: "nine named levels — Pinnacle 2M, Summit 5M, Overlook 10M, Horizon 15M, Threshold 20M, Foundation 15M, Depths 8M, Core 3M, Heart 2M", status: "Fictional planning distribution" }),
    Object.freeze({ id: "GA-Q-018", quantity: "Book II regional figure", figure: "40 million", detail: "people served across three nations in the legacy Book II orientation", status: "Illustrative service count; never added to the city total" }),
    Object.freeze({ id: "GA-Q-019", quantity: "Early-phase head aspiration", figure: "1,200–2,500 ft", detail: "cumulative gross head across distinct stages in the first 40–60 years; 4,000 ft is the long-range aggregate target", status: "Not a dam-wall height or reservoir depth" }),
    Object.freeze({ id: "GA-Q-020", quantity: "Assumed pipeline static lift", figure: "1,219.2 m", detail: "4,000 ft; separate from the dam-series head aspiration and not an elevation assignment", status: "Assumption; profile unsurveyed" })
  ]);

  /* ---------- Address registry ---------- */
  const addressRegistry = Object.freeze({
    form: "0•100•000•NNNN",
    orb: "100",
    sector: "000",
    distinctInstances: 358,
    tiers: Object.freeze([
      Object.freeze({ tier: "T1", name: "Capitol & Rim", nodes: "≈180", share: "≈50%" }),
      Object.freeze({ tier: "T2", name: "Reservoir & Biosphere", nodes: "≈120", share: "≈33%" }),
      Object.freeze({ tier: "T3", name: "Deep Core & Secure Infrastructure", nodes: "≈60", share: "≈17%" })
    ]),
    tierDenominator: 360,
    tierBasis: "Tier counts are the update's approximate partition of the 360-slot counter (180 + 120 + 60 = 360; shares are of 360), not a count of the 358 named instances. The source's own enumerated IDs do not reconcile to these totals, so treat the split as an assertion.",
    precisionNote: "The instance counter runs 0000–0359 and borrows the 360-count motif, but it occupies the instance field. The canonical ℤ₃₆₀ ring constrains the sector field DDD ∈ [000, 359] (Part VII, INV-Z360-001). 360° ≡ 0° mod 360 is return-to-origin closure notation, never a 361st address slot."
  });

  /* ---------- Timeline ---------- */
  const timeline = Object.freeze([
    Object.freeze({ window: "2026–2046", marker: "Survey, consent, design, supply-chain development, and decision gates; first operational dam-and-city module targeted circa 2046", status: "Planning target, not a commitment" }),
    Object.freeze({ window: "2046–2066", marker: "First 20-year operating and expansion window", status: "No interim population target assigned" }),
    Object.freeze({ window: "2066–2086", marker: "Second expansion window; modular series continues", status: "No interim population target assigned" }),
    Object.freeze({ window: "2086–2106", marker: "Third window; 2098 is an interim commissioning and expansion milestone, not final completion", status: "~80 million residents by 2100" }),
    Object.freeze({ window: "2106 onward", marker: "Continues in 20-year planning windows while modules are useful and authorized", status: "No final completion date is assigned" })
  ]);

  /* ---------- Explicit non-claims ---------- */
  const notClaims = Object.freeze([
    "A construction program, energy plan, or government.",
    "A threat feed, detection package, or validated security control.",
    "A normative specification: nothing here enters specs/normative/ or the kernel.",
    "Evidence that any HarshalOS control has been deployed, tested against a real actor, or approved as policy.",
    "A claim about the Colorado River, the Grand Canyon, Baja California, or any named institution.",
    "A source of legitimacy: no GA layer supplies H(t), lowers τ, or authorizes an action."
  ]);

  const layerById = id => layers.find(layer => layer.id === id) || null;
  const anchorById = id => canonicalAnchors.find(anchor => anchor.id === id) || null;
  const invariantById = id => invariants.find(invariant => invariant.id === id) || null;

  return Object.freeze({
    schema: "harshalos-grand-architecture-v1",
    meta,
    layers,
    invariants,
    canonicalAnchors,
    addressRegistry,
    timeline,
    notClaims,
    layerById,
    anchorById,
    invariantById
  });
})();

window.GRAND_ARCHITECTURE = GRAND_ARCHITECTURE;
