import { img } from "../assets/media";

export type LayerId =
  | "grid"
  | "boundary"
  | "setback"
  | "topo"
  | "trees"
  | "buildings"
  | "ag"
  | "water"
  | "septic"
  | "energy"
  | "access"
  | "fire"
  | "views"
  | "dims"
  | "labels"
  | "conditional"
  | "redlines";

export type ViewId = "home" | "engine" | "hearth" | "compare" | "standards" | "improvements";

export interface Structure {
  id: string;
  name: string;
  program: string;
  gfa: number;
  notes: string;
  layer: string;
  image?: string;
  color: string;
}

export interface LegendItem {
  id: string;
  label: string;
  color: string;
  style: "solid" | "dashed" | "dotted" | "fill";
}

export interface SiteProperty {
  id: "engine" | "hearth";
  code: string;
  sheet: string;
  name: string;
  epithet: string;
  portfolioRole: string;
  designCharacter: string;
  date: string;
  scale: string;
  status: string;
  locationDms: string;
  locationDec: string;
  elevation: string;
  orientation: string;
  viewCorridor: string;
  zoning: string;
  lotAcres: number;
  lotSf: number;
  lotSide: number;
  gfa: number;
  coveragePct: number;
  coverageMax: number;
  setbackDesign: number;
  access: string;
  vicinity: string;
  water: string;
  septic: string;
  energy: string;
  darkSky: string;
  heroImage: string;
  aerialImage: string;
  structures: Structure[];
  permitted: string[];
  conditional: string[];
  compliance: { label: string; value: string; status: "ok" | "note" | "cup" }[];
  layers: { id: string; label: string; detail: string }[];
  legend: LegendItem[];
  philosophy: string;
  northNote: string;
}

export const LAYERS: { id: LayerId; label: string; color: string }[] = [
  { id: "grid", label: "Survey Grid", color: "#1e2a3a" },
  { id: "boundary", label: "Property Boundary", color: "#e4453a" },
  { id: "setback", label: "50' Setback Envelope", color: "#3dcc6a" },
  { id: "topo", label: "2' Contours & Bioswales", color: "#3ec6d8" },
  { id: "trees", label: "Windbreak Screening", color: "#2d8a4e" },
  { id: "buildings", label: "Structures / GFA", color: "#e8edf5" },
  { id: "ag", label: "Pasture / Orchard", color: "#b56bff" },
  { id: "water", label: "Well & Sanitary Buffer", color: "#4d8dff" },
  { id: "septic", label: "Septic + 100% Reserve", color: "#e8943a" },
  { id: "energy", label: "Solar / BESS / Generator", color: "#e8c547" },
  { id: "access", label: "Drives, Courts & Gates", color: "#8b95a8" },
  { id: "fire", label: "WUI Fire & 10kG Cistern", color: "#ff5a52" },
  { id: "views", label: "View Corridor / Bearing", color: "#e4453a" },
  { id: "conditional", label: "Conditional (CUP) Uses", color: "#c45cff" },
  { id: "redlines", label: "PE Review Redlines (REV A)", color: "#ff4d6d" },
  { id: "dims", label: "Dimensions & Pins", color: "#3dcc6a" },
  { id: "labels", label: "Annotations", color: "#8b95a8" },
];

export const PRESETS: { id: string; label: string; layers: LayerId[] }[] = [
  {
    id: "master",
    label: "C-101 Master Plan",
    layers: [
      "grid",
      "boundary",
      "setback",
      "topo",
      "trees",
      "buildings",
      "ag",
      "water",
      "septic",
      "energy",
      "access",
      "views",
      "conditional",
      "dims",
      "labels",
    ],
  },
  {
    id: "redline",
    label: "C-103 PE Redlines (REV A)",
    layers: [
      "grid",
      "boundary",
      "setback",
      "topo",
      "buildings",
      "water",
      "septic",
      "access",
      "fire",
      "redlines",
      "dims",
      "labels",
    ],
  },
  {
    id: "civil",
    label: "C-102 Civil / Grading / Fire",
    layers: ["grid", "boundary", "setback", "topo", "water", "septic", "energy", "access", "fire", "dims", "labels"],
  },
  {
    id: "zoning",
    label: "Z-101 Entitlement",
    layers: ["boundary", "setback", "buildings", "ag", "conditional", "dims", "labels"],
  },
  {
    id: "landscape",
    label: "L-101 Landscape / Dark Sky",
    layers: ["boundary", "setback", "topo", "trees", "ag", "views", "labels"],
  },
  {
    id: "energy",
    label: "E-101 Microgrid",
    layers: ["boundary", "buildings", "energy", "labels"],
  },
];

export const ENGINE: SiteProperty = {
  id: "engine",
  code: "PV-03",
  sheet: "C-101",
  name: "PEAKS VISTA",
  epithet: "THE ENGINE ROOM",
  portfolioRole: "Stewardship · Science · Production · Engine Room",
  designCharacter: "Alpine manor lodge + astronomical observatory + productive homestead",
  date: "2026-03-03",
  scale: "1\" = 40'-0\"",
  status: "Broadsword Pyramid — Phased Master Plan",
  locationDms: "35°29'50.5\"N  111°45'02.6\"W",
  locationDec: "35.29450 N, 111.45102 W",
  elevation: "±7,280' AMSL · Flagstaff, AZ",
  orientation: "North entrance / south-southeast solar & Humphreys view",
  viewCorridor: "138.8° SE bearing to Mt. Humphreys — 12 miles",
  zoning: "AR-5 Agricultural Residential (5-acre minimum)",
  lotAcres: 5,
  lotSf: 217800,
  lotSide: 466.69,
  gfa: 10050,
  coveragePct: 4.61,
  coverageMax: 35,
  setbackDesign: 50,
  access: "N. Peaks Vista Way (north entry) · dual stone pillar gate",
  vicinity: "US 180 / Bellmont Rd · I-40 / Route 66 · Coconino County, AZ",
  water: "500' deep well + treatment · 100' sanitary setback",
  septic: "2,000 gal septic tank + 3,000 SF leach field",
  energy: "25 kW bifacial PV + 80 kWh BESS + 30 kW generator (off-grid microgrid)",
  darkSky: "IES BUG B0-L0-U0 · 3000K · zero uplight · Flagstaff IDA compliance",
  heroImage: img.alpineLodge,
  aerialImage: img.aerial,
  philosophy:
    "The Engine Room is the productive heart of the Broadsword pyramid: a science-and-stewardship homestead that generates food, power, water security, and astronomical observation while holding a preserved 138.8° view ray to the San Francisco Peaks.",
  northNote: "True north. Bearing 138.8° SE to Mt. Humphreys.",
  structures: [
    {
      id: "lodge",
      name: "Alpine Manor Lodge",
      program: "Layer 2 — Principal residence",
      gfa: 4500,
      notes: "Timber-and-basalt manor. Primary dwelling. Humphreys view alignment. Covered porch to south-southeast.",
      layer: "Residential",
      image: img.alpineLodge,
      color: "#e8edf5",
    },
    {
      id: "spa",
      name: "Nordic Wellness Spa",
      program: "Layer 2 — Accessory wellness",
      gfa: 1250,
      notes: "Mineral tubs, geothermal loop, cedar pavilion. Counted in GFA. Dark-sky shielded fixtures.",
      layer: "Residential",
      image: img.nordicSpa,
      color: "#3ec6d8",
    },
    {
      id: "adu",
      name: "Caretaker Carriage ADU",
      program: "Layer 1 — Seed dwelling",
      gfa: 800,
      notes: "By-right accessory dwelling. Caretaker / workshop loft. Phase 1 occupancy.",
      layer: "Seed",
      image: img.guestAdu,
      color: "#e8edf5",
    },
    {
      id: "shop",
      name: "Gym / Workshop",
      program: "Layer 1 — Seed support",
      gfa: 1500,
      notes: "Carriage-house workshop and conditioning gym. Shares service court with ADU.",
      layer: "Seed",
      image: img.barn,
      color: "#c5cdd8",
    },
    {
      id: "barn",
      name: "Five-Stall Barn & Tack",
      program: "Layer 3 — Homestead",
      gfa: 3200,
      notes: "Agricultural structure. Five stalls, tack, hay. Serves 1.5-acre timber post-and-board pasture.",
      layer: "Homestead",
      image: img.barn,
      color: "#d7dde6",
    },
    {
      id: "greenhouse",
      name: "Geothermal Greenhouse",
      program: "Layer 3 — Production",
      gfa: 1750,
      notes: "Year-round production house. Ground-loop tempered. Heirloom starts for the orchard.",
      layer: "Homestead",
      image: img.greenhouse,
      color: "#3ec6d8",
    },
    {
      id: "observatory",
      name: "Ash-Dome Observatory",
      program: "Layer 4 — Science",
      gfa: 80,
      notes: "10' ash dome on isolated pier. Dark-sky. Not occupied dwelling area.",
      layer: "Science",
      image: img.observatory,
      color: "#e8c547",
    },
  ],
  permitted: [
    "4,500 SF principal alpine lodge (PFR)",
    "800 SF caretaker carriage ADU",
    "3,200 SF 5-stall barn & pasture keeping",
    "1.5-acre timber post-and-board corral",
    "1.5-acre heirloom apple / cherry orchard",
    "1,750 SF geothermal greenhouse",
    "1,250 SF Nordic spa (accessory to dwelling)",
    "500' deep well, treatment, 100' sanitary buffer",
    "2,000 gal septic + 3,000 SF leach field",
    "25 kW bifacial PV + 80 kWh BESS + 30 kW generator",
    "Native ponderosa windbreak on all four sides",
    "Dark-sky pathway lighting (B0-L0-U0 / 3000K)",
  ],
  conditional: [
    "16–24' geodesic stewardship / teaching zones",
    "Public observatory nights (special event)",
    "Agritourism / orchard CSA pickup",
  ],
  compliance: [
    { label: "Zoning district", value: "AR-5 · 5.0000 ac min. satisfied", status: "ok" },
    { label: "Lot geometry", value: "466.69' × 466.69' square · 217,800 SF", status: "ok" },
    { label: "Lot coverage", value: "10,050 SF GFA = 4.61%  (code max 35%)", status: "ok" },
    { label: "Height", value: "Lodge 28'  (AR-5 max 35')", status: "ok" },
    { label: "Front setback", value: "50'-0\" design  (code min 25')", status: "ok" },
    { label: "Side setbacks", value: "50'-0\" design  (code min 10' interior)", status: "ok" },
    { label: "Rear setback", value: "50'-0\" design  (code min 20')", status: "ok" },
    { label: "Dwelling count", value: "1 PFR + 1 ADU  (by-right)", status: "ok" },
    { label: "Animal keeping", value: "1.5 ac pasture  (1 ac min. for livestock)", status: "ok" },
    { label: "Well isolation", value: "100' radius  (exceeds ADEQ)", status: "ok" },
    { label: "Septic / leach", value: "2,000G + 3,000 SF field  (ADEQ 18-9)", status: "ok" },
    { label: "Dark sky", value: "Flagstaff IDA · BUG B0-L0-U0 · 3000K", status: "ok" },
    { label: "View corridor", value: "Preserved 138.8° SE Humphreys ray", status: "note" },
    { label: "Off-grid microgrid", value: "25 kW PV / 80 kWh BESS / 30 kW gen", status: "ok" },
  ],
  layers: [
    { id: "L1", label: "Layer 1 — Seed", detail: "800 SF carriage ADU + 1,500 SF gym/shop (2,300 SF). First occupancy." },
    { id: "L2", label: "Layer 2 — Residential", detail: "4,500 SF alpine lodge + 1,250 SF Nordic spa (5,750 SF)." },
    { id: "L3", label: "Layer 3 — Homestead", detail: "3,200 SF barn, 1.5 ac pasture, 1.75k SF greenhouse, 1.5 ac orchard." },
    { id: "L4", label: "Layer 4 — Science", detail: "10' ash-dome observatory pier + 16–24' geodesic stewardship zones." },
  ],
  legend: [
    { id: "b", label: "5-acre property boundary (466.69' × 466.69')", color: "#e4453a", style: "solid" },
    { id: "s", label: "50' AR-5 design setback envelope", color: "#3dcc6a", style: "dashed" },
    { id: "l1", label: "Layer 1 — 800 SF carriage ADU & workshop", color: "#e8edf5", style: "solid" },
    { id: "l2", label: "Layer 2 — 4,500 SF alpine lodge", color: "#e8edf5", style: "fill" },
    { id: "spa", label: "Layer 2 — 1,250 SF Nordic spa & mineral tubs", color: "#3ec6d8", style: "solid" },
    { id: "barn", label: "Layer 3 — 3,200 SF 5-stall barn & pasture", color: "#d7dde6", style: "solid" },
    { id: "gh", label: "Layer 3 — 1,750 SF geothermal greenhouse", color: "#3ec6d8", style: "solid" },
    { id: "or", label: "Layer 3 — 1.5-acre heirloom apple/cherry orchard", color: "#3dcc6a", style: "fill" },
    { id: "obs", label: "Layer 4 — 10' ash-dome observatory pier", color: "#e8c547", style: "solid" },
    { id: "geo", label: "Layer 4 — 16–24' geodesic stewardship zones", color: "#e8c547", style: "solid" },
    { id: "well", label: "500' deep well & 100' sanitary buffer", color: "#4d8dff", style: "dashed" },
    { id: "sep", label: "2,000G septic tank & 3,000 SF leach field", color: "#e8943a", style: "dashed" },
    { id: "pv", label: "25 kW bifacial solar + 80 kWh BESS + 30 kW gen", color: "#e8c547", style: "solid" },
    { id: "view", label: "Preserved 138.8° SE Mt. Humphreys view ray", color: "#e4453a", style: "dashed" },
  ],
};

export const HEARTH: SiteProperty = {
  id: "hearth",
  code: "FL-01",
  sheet: "C-101",
  name: "FLAG",
  epithet: "THE HEARTH",
  portfolioRole: "Experience · Hospitality · Observation",
  designCharacter: "Mountain lodge + observatory deck + equestrian homestead",
  date: "2026-03-31",
  scale: "1\" = 40'-0\"",
  status: "Broadsword Pyramid — Phased Master Plan",
  locationDms: "35°24'14.5\"N  111°45'16.6\"W",
  locationDec: "35.40403 N, 111.75461 W",
  elevation: "±6,960' AMSL · Coconino County, AZ",
  orientation: "South entry court · north stargazing deck · east windbreak",
  viewCorridor: "North deck aligned to dark-sky meridian; pasture opens south",
  zoning: "AR-5 Agricultural Residential (5-acre minimum)",
  lotAcres: 5,
  lotSf: 217800,
  lotSide: 466.69,
  gfa: 8246,
  coveragePct: 3.79,
  coverageMax: 35,
  setbackDesign: 50,
  access: "Dual stone pillar entry gate · south frontage · arrival court",
  vicinity: "Coconino County, AZ · AR-5 · 5.0000 ac master site",
  water: "400' deep well + treatment · 100' sanitary setback",
  septic: "1,500 gal septic tank + leach field",
  energy: "20 kW PV + 80 kWh BESS + 25 kW generator",
  darkSky: "Dark-sky pathway lighting · Flagstaff IDA · 3000K shielded",
  heroImage: img.farmhouse,
  aerialImage: img.yurtPlaza,
  philosophy:
    "The Hearth is the hospitality counterpart to the Engine Room: a 4,000 SF principal farmhouse with a 12' × 48' stargazing deck, an equestrian barn, and a crescent of eight 4-season yurt pads around a fire-pit plaza — by-right rural living with a CUP path to retreat hospitality.",
  northNote: "True north. Stargazing deck faces the northern meridian.",
  structures: [
    {
      id: "farmhouse",
      name: "Principal Farmhouse",
      program: "By-right PFR",
      gfa: 4000,
      notes: "4,000 SF GFA. 12' × 48' stargazing deck to north. Covered porch to south. Dark-sky compliant.",
      layer: "Residential",
      image: img.farmhouse,
      color: "#e8edf5",
    },
    {
      id: "guest",
      name: "Guest House / ADU",
      program: "By-right accessory dwelling",
      gfa: 750,
      notes: "Detached 750 SF ADU. Caretaker or guest. Independent of CUP hospitality.",
      layer: "Residential",
      image: img.guestAdu,
      color: "#e8edf5",
    },
    {
      id: "barn",
      name: "Equestrian Barn",
      program: "By-right agricultural",
      gfa: 3000,
      notes: "3,000 SF / 4 stalls + workshop. Serves 2.8-acre pasture and corral.",
      layer: "Homestead",
      image: img.barn,
      color: "#3ec6d8",
    },
    {
      id: "bathhouse",
      name: "Retreat Bathhouse",
      program: "Conditional (CUP)",
      gfa: 480,
      notes: "480 SF shared bathhouse serving yurt pads. Requires CUP for hospitality operations.",
      layer: "Hospitality",
      image: img.nordicSpa,
      color: "#3ec6d8",
    },
    {
      id: "plaza",
      name: "Central Gathering Plaza",
      program: "Conditional (CUP)",
      gfa: 0,
      notes: "Fire pit and arrival hearth. Eight yurt pads (Y1–Y8) on a crescent. Not GFA.",
      layer: "Hospitality",
      image: img.yurtPlaza,
      color: "#e8943a",
    },
    {
      id: "yurts",
      name: "Eight 4-Season Yurt Pads",
      program: "Conditional (CUP)",
      gfa: 0,
      notes: "Y1–Y8 pitcher pads within pasture. 4-season yurt retreat units require CUP.",
      layer: "Hospitality",
      image: img.yurtPlaza,
      color: "#c45cff",
    },
  ],
  permitted: [
    "4,000 SF principal farmhouse (PFR)",
    "750 SF detached guest house / ADU",
    "3,000 SF equestrian barn & workshop (4 stalls)",
    "2.8-acre pasture & corral animal keeping",
    "400' deep water well & treatment",
    "1,500 gal septic & leach field",
    "20 kW solar PV + 80 kWh BESS",
    "Retention basin & drainage",
    "Native residence windbreak",
    "Dark-sky pathway lighting",
  ],
  conditional: [
    "8× 4-season yurt retreat units (CUP)",
    "480 SF retreat bathhouse (CUP)",
    "Commercial hospitality operations (CUP)",
    "Special event / agritourism use (CUP)",
  ],
  compliance: [
    { label: "Zoning district", value: "AR-5 · 5.0000 ac min. satisfied", status: "ok" },
    { label: "Lot geometry", value: "466.69' × 466.69' square · 217,800 SF", status: "ok" },
    { label: "Lot coverage", value: "8,246 SF GFA = 3.79%  (code max 35%)", status: "ok" },
    { label: "Height", value: "Farmhouse 26'  (AR-5 max 35')", status: "ok" },
    { label: "Setbacks", value: "50'-0\" all sides  (exceeds AR-5 mins)", status: "ok" },
    { label: "Dwelling count", value: "1 PFR + 1 ADU  (by-right)", status: "ok" },
    { label: "Animal keeping", value: "2.8 ac pasture  (1 ac min.)", status: "ok" },
    { label: "Well isolation", value: "100' radius from 400' well", status: "ok" },
    { label: "Septic / leach", value: "1,500G + leach field  (ADEQ 18-9)", status: "ok" },
    { label: "Dark sky", value: "Flagstaff IDA pathway lighting", status: "ok" },
    { label: "Yurt retreat", value: "8 pads — CUP required", status: "cup" },
    { label: "Bathhouse", value: "480 SF — CUP with hospitality", status: "cup" },
    { label: "Hospitality ops", value: "Commercial / special event — CUP", status: "cup" },
    { label: "Microgrid", value: "20 kW PV / 80 kWh BESS / 25 kW gen", status: "ok" },
  ],
  layers: [
    { id: "L1", label: "By-right residential", detail: "4,000 SF farmhouse + 750 SF ADU + porches & stargazing deck." },
    { id: "L2", label: "By-right homestead", detail: "3,000 SF / 4-stall barn, 2.8 ac pasture, well, septic, 20 kW PV." },
    { id: "L3", label: "Conditional hospitality", detail: "8 yurt pads, 480 SF bathhouse, gathering plaza, agritourism CUP." },
    { id: "L4", label: "Observation", detail: "12' × 48' stargazing deck. Dark-sky meridian. No dome required." },
  ],
  legend: [
    { id: "b", label: "Property boundary (5.0000 acres)", color: "#e4453a", style: "solid" },
    { id: "s", label: "50' AR-5 setback envelope", color: "#e8c547", style: "dashed" },
    { id: "fh", label: "Farmhouse + ADU + porch / deck", color: "#e8edf5", style: "solid" },
    { id: "bn", label: "Equestrian barn + bathhouse", color: "#3ec6d8", style: "solid" },
    { id: "yu", label: "8× 4-season yurt units (conditional)", color: "#c45cff", style: "dashed" },
    { id: "pa", label: "Pasture fence & loading shed", color: "#3dcc6a", style: "dashed" },
    { id: "w", label: "Well, retention, sanitary buffer", color: "#4d8dff", style: "dashed" },
    { id: "pv", label: "Solar PV + BESS + generator", color: "#e8c547", style: "solid" },
    { id: "tr", label: "Residence windbreak screening", color: "#2d8a4e", style: "solid" },
  ],
};

export const PROPERTIES = { engine: ENGINE, hearth: HEARTH };

export const CODE_NOTES = [
  {
    title: "AR-5 Agricultural Residential",
    body: "Coconino County Zoning Ordinance, Chapter 2. AR designates low-density residential use with light agricultural activities related to rural family living. The numeric suffix sets minimum lot size in acres; AR-5 requires 5.0000 acres net. Both parcels are square 466.69' lots (217,800 SF) and satisfy the district.",
  },
  {
    title: "Property development standards",
    body: "AR district code minima: 25' front, 10' interior side, 15' street side, 20' rear, 35' height, 35% lot coverage, 1 dwelling per parcel plus a permitted accessory dwelling. Both Broadsword plans adopt a 50'-0\" setback on all sides — a project standard that more than doubles every code minimum and creates a 366.69' square buildable envelope (3.09 ac).",
  },
  {
    title: "Lot coverage",
    body: "Coverage is the footprint of buildings and structures, excluding drives, walks, uncovered parking, and landscaped area. Engine Room: 10,050 SF = 4.61%. The Hearth: 8,246 SF = 3.79%. Both sit an order of magnitude under the 35% AR maximum. Agricultural barns are included in the tabulated GFA for conservative reporting.",
  },
  {
    title: "Animal keeping",
    body: "Non-commercial keeping of horses and domestic farm animals is permitted in AR subject to a 1-acre minimum. Three animals on the first acre, plus one per additional half-acre. Engine Room provides 1.5 ac pasture; The Hearth provides 2.8 ac. Poultry/rabbits require 100' from neighboring residences.",
  },
  {
    title: "Wells & on-site wastewater",
    body: "ADEQ Aquifer Protection (A.A.C. R18-9) governs septic. Both plans provide a 100' sanitary isolation radius around the well, exceeding typical 50–100' well-to-septic separations. Engine Room: 500' well, 2,000G tank, 3,000 SF field. The Hearth: 400' well, 1,500G tank and field. Final design by an Arizona-registered PE / sanitarians with perc tests.",
  },
  {
    title: "Dark sky — Flagstaff IDA",
    body: "Flagstaff is the world's first International Dark Sky City. Exterior lighting is specified IES BUG B0-L0-U0, 3000K CCT, fully shielded, zero uplight. Observatory and stargazing deck programs are compatible only if this specification is held. No flood lighting. Path markers 12\" max height.",
  },
  {
    title: "Conditional uses — The Hearth",
    body: "Eight 4-season yurt retreat units, the 480 SF bathhouse, commercial hospitality, and special-event agritourism are not by-right in AR-5. They are shown as a CUP overlay so the civil layout, parking, septic sizing, and fire access can be designed once. Construction of hospitality elements is gated on Board of Supervisors approval.",
  },
  {
    title: "Not for construction",
    body: "These sheets are master-planning documents for design development, entitlement strategy, and owner coordination. They are not construction documents and are not sealed. Grading, drainage, septic, structural, and electrical construction documents shall be prepared and sealed by Arizona-registered professionals prior to permit.",
  },
];

export interface PeImprovement {
  id: string;
  revTag: string;
  parcel: "engine" | "hearth" | "both";
  discipline: "Sanitary / ADEQ" | "Fire / WUI" | "Grading & Drainage" | "Astronomical Seeing & Wind" | "High-Country Snow & Access" | "Entitlement / CUP";
  priority: "Critical Code" | "High Performance" | "Risk Mitigation";
  title: string;
  originalIssue: string;
  engineeredSolution: string;
  codeReference: string;
  quantifiedImpact: string;
  focusFeatureId: string;
}

export const PE_IMPROVEMENTS: PeImprovement[] = [
  {
    id: "rev-septic-reserve",
    revTag: "REV-A1",
    parcel: "both",
    discipline: "Sanitary / ADEQ",
    priority: "Critical Code",
    title: "Designate 100% Reserve Septic Disposal Area & Dual-Alternating Valve",
    originalIssue:
      "Both original sketches show only the primary leach field (3,000 SF on Engine Room; 1,500G system on The Hearth). ADEQ permits require a protected 100% reserve replacement area free of traffic, corrals, and tree roots.",
    engineeredSolution:
      "Delineated a fenced 100% Reserve Leach Field zone immediately adjacent to the primary trenches on both parcels, outside livestock hooves and vehicular wheel paths, plus a two-way diversion valve for annual trench resting.",
    codeReference: "ADEQ A.A.C. R18-9-A312(D) · Coconino County Environmental Health",
    quantifiedImpact: "Doubles system service life to 35+ yrs; eliminates permit rejection at soil-evaluation stage.",
    focusFeatureId: "rev-septic",
  },
  {
    id: "rev-fire-cistern",
    revTag: "REV-A2",
    parcel: "both",
    discipline: "Fire / WUI",
    priority: "Critical Code",
    title: "10,000-Gal Buried Fire Cistern, NST Dry Hydrant & 20' All-Weather Apparatus Loop",
    originalIssue:
      "At 7,000'+ in Ponderosa WUI, domestic wells (10–25 GPM) cannot supply structural fire flows directly. Dead-end drives exceeding 150' require IFC-compliant turnarounds and rural water storage.",
    engineeredSolution:
      "Added a 10,000-gallon frost-protected fiberglass/concrete buried fire cistern below the 42\" frost line near the entry gate with a 4.5\" NH dry-hydrant draft connection, verified 20'-0\" compacted basalt drive width, and confirmed 92' outer turnaround diameter at both rotundas.",
    codeReference: "IFC Appendix B & D · Coconino County Ordinance 95-1 · NFPA 1142 Rural Water Supply",
    quantifiedImpact: "Unlocks 1,000 GPM draft capability for 10 min; reduces rural homeowner insurance ISO class.",
    focusFeatureId: "rev-cistern",
  },
  {
    id: "rev-seeing-wind",
    revTag: "REV-A3",
    parcel: "engine",
    discipline: "Astronomical Seeing & Wind",
    priority: "High Performance",
    title: "Thermal Plume & Prevailing SW Wind Buffer for the 10' Ash-Dome Observatory",
    originalIssue:
      "Flagstaff's prevailing wind is SW (215°–240°). In the original Engine Room sketch, the Geothermal Greenhouse and Carport/ADU sit roughly upwind of the NE Observatory, and the pasture corral can send dust across the optical path.",
    engineeredSolution:
      "Established a 120' Thermal Plume Exclusion Arc upwind (SW) of the 10' Ash-Dome Pier: routed greenhouse exhaust vents to the leeward SE side, specified low-albedo native fescue groundcover around the pier to suppress boundary-layer turbulence, and added a double hedgerow dust filter along the eastern corral fence.",
    codeReference: "Flagstaff Dark Sky / Lowell Observatory Local Seeing Best Practices",
    quantifiedImpact: "Improves local astronomical seeing by ~0.3–0.5 arcseconds; prevents dust deposition on primary mirror.",
    focusFeatureId: "observatory",
  },
  {
    id: "rev-hearth-septic-cup",
    revTag: "REV-A4",
    parcel: "hearth",
    discipline: "Entitlement / CUP",
    priority: "Critical Code",
    title: "Two-Stage Septic & Water Sizing for 8-Yurt Hospitality CUP Overlay",
    originalIssue:
      "The Hearth's 1,500-gallon septic tank is properly sized for the 4,000 SF farmhouse + 750 SF ADU by-right program, but adding 8 four-season yurts + a 480 SF bathhouse adds ~1,200–1,600 GPD peak hospitality wastewater flow.",
    engineeredSolution:
      "Separated the wastewater civil design into Phase 1 (By-Right 1,500G Residential Tank) and Phase 2 (CUP Hospitality 3,000G High-Strength Treatment + Drip/Chamber Field stubbed south of the Bathhouse) so the owner can permit Phase 1 immediately without triggering commercial ADEQ review until the CUP is granted.",
    codeReference: "ADEQ Type 4 General Permit · Coconino County AR-5 CUP Submittal Standards",
    quantifiedImpact: "De-risks Phase 1 building permit by 6–9 months while pre-plumbing the CUP retreat infrastructure.",
    focusFeatureId: "bathhouse",
  },
  {
    id: "rev-grading-swales",
    revTag: "REV-A5",
    parcel: "both",
    discipline: "Grading & Drainage",
    priority: "High Performance",
    title: "2-Foot Topographic Contours, Up-Slope Interceptor Swales & Basalt Check Dams",
    originalIssue:
      "Neither original drawing showed existing/proposed contours or how monsoon sheet flow (2.2\"/hr 100-year intensity) is diverted around the lodge, barn stalls, and leach fields.",
    engineeredSolution:
      "Added 2' topographic contours (sloping gently NW→SE on Engine Room; N→S on The Hearth), armoured basalt rip-rap interceptor swales up-gradient of all foundations and corrals, and connected roof leaders to sub-grade cisterns for orchard/pasture irrigation.",
    codeReference: "Coconino County Drainage Design Criteria · ADWR Rainwater Harvesting Guidelines",
    quantifiedImpact: "Captures ~68,000 gal/yr of roof runoff on Engine Room; prevents corral mud and leach-field saturation.",
    focusFeatureId: "rev-swale",
  },
  {
    id: "rev-snow-storage",
    revTag: "REV-A6",
    parcel: "both",
    discipline: "High-Country Snow & Access",
    priority: "Risk Mitigation",
    title: "High-Country Snow-Plow Push Pockets & 42\" Frost-Depth Utility Trenching",
    originalIssue:
      "Flagstaff averages 90–110+ inches of snowfall annually. Circular rotundas and solar arrays without dedicated plow push zones result in snow berms blocking garage doors, cattle guards, and lower PV edges.",
    engineeredSolution:
      "Added dedicated 25'×40' Snow Storage Push Pockets on the down-slope perimeter of both rotundas (draining directly into bioswales), raised bifacial PV lower torque-tube clearance to 48\" above grade, and specified heated/drained cattle-guard sumps at the entry gates.",
    codeReference: "ASCE 7 Ground Snow Load (Pg = 60–75 psf) · Coconino County Engineering Standards",
    quantifiedImpact: "Maintains winter emergency access during 36\" storm events and boosts winter bifacial PV albedo gain by +14%.",
    focusFeatureId: "rev-snow",
  },
];

