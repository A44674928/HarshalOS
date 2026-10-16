#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   HarshalOS — evidence tables for "Neural Atomic Bodies & Associated
   Insurance Requirements" (research/neural-atomic-bodies-insurance-requirements.md)

   Recomputes, from repository files only:
     · §4.9   the property-derivation test: the v0 rules as written and the
              proposed v0.2 rules, scored against the Compendium master
              database (js/nab-sectors.js, generated from
              docs/harshal-systems/14-nab-compendium.md)
     · §7     the register consistency checks: every recorded answer vector in
              case-studies/d1/case-studies-d1.json re-run through the Ground-0
              engine and compared with case-studies/pdh-registry.json
     · App. A the Phase × Type matrix
     · App. C the 32-row Ground-0 Step 3 truth table
     · App. D the ambient-layer check (Chapter 5): the World Magnetic Model
              2025 recomputed from its coefficients and verified against
              NCEI's published test values, high-precision example, and
              geomagnetic pole; then the proposed site zoning, by dipole
              geomagnetic latitude, for a list of illustrative locations
     · App. E compound bodies (Section 4.11): real chemical formulae parsed,
              checked against a pinned registry of real substances, composed
              from their constituent classes, and given their physical state of
              matter from measured data (model: scripts/nab-compounds.mjs)

   Physical property values come from research/data/elemental-properties.json;
   the WMM2025 coefficients and NCEI's check values from
   research/data/wmm2025.json; the substance registry, atomic weights, and
   equation-of-state check points from research/data/compound-bodies.json. No
   network access and no dependencies. Nothing here prices cover, issues a
   badge, or changes the register. The run exits with status 1 if the WMM2025
   check or the compound check fails.

   Usage:
     node scripts/nab-insurance-evidence.mjs           Markdown report
     node scripts/nab-insurance-evidence.mjs --json    machine-readable summary
   ═══════════════════════════════════════════════════════════════ */

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as Compounds from "./nab-compounds.mjs";
import * as World from "./nab-world-model.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const readJson = relative => JSON.parse(readFileSync(path.join(ROOT, relative), "utf8"));

require(path.join(ROOT, "js/nab-sectors.js"));
require(path.join(ROOT, "js/g0-engine.js"));
const { sectors } = globalThis.NabSectors;
const G0 = globalThis.G0;
const properties = readJson("research/data/elemental-properties.json");
const registry = readJson("case-studies/pdh-registry.json");
const d1 = readJson("case-studies/d1/case-studies-d1.json");

/* ── Tiers ─────────────────────────────────────────────────────── */
const TIERS = ["Safe", "Moderate", "Elevated", "Prohibited"];
const mdbTier = row => TIERS[row.riskLevel];
const bySymbol = new Map(properties.elements.map(e => [e.symbol, e]));

/* ── Physical attributes, as the v0 translation table defines them ── */
const LONG_LIVED_YEARS = 1000;
const persistence = e => (e.stableIsotope ? "stable" : e.longestHalfLifeYears >= LONG_LIVED_YEARS ? "long-lived" : "short-lived");
const closedShell = e => e.group === 18;          // noble-gas configuration
const donor = e => e.group === 1;                 // one loose electron (ns1)
const acceptor = e => e.group === 17;             // one short of full (np5)
const pairedDonor = e => e.group === 2;           // ns2
const liquid = e => e.state25C === "liquid";
const FISSILE_NARROW = new Set(["U", "Pu"]);      // narrow reading of "critical (fissile)"

/* ── v0 rules exactly as written (first match wins, order 1–9) ── */
const RULES_V0 = [
  { id: "1", text: "Fissile, or short-lived", tier: "Prohibited", test: e => FISSILE_NARROW.has(e.symbol) || persistence(e) === "short-lived" },
  { id: "2", text: "Long-lived with no stable isotope", tier: "Moderate", test: e => persistence(e) === "long-lived" },
  { id: "3", text: "Closed shell", tier: "Safe", test: closedShell },
  { id: "4", text: "Liquid d-block", tier: "Elevated", test: e => liquid(e) && e.block === "d" },
  { id: "5", text: "Acceptor with EN ≥ 2.5", tier: "Elevated", test: e => acceptor(e) && e.enPauling !== null && e.enPauling >= 2.5 },
  { id: "6", text: "Donor with EN ≤ 1.0", tier: "Elevated", test: e => donor(e) && e.enPauling !== null && e.enPauling <= 1.0 },
  { id: "7", text: "f-block", tier: "Safe", test: e => e.block === "f" },
  { id: "8", text: "d-block", tier: "Elevated", test: e => e.block === "d" },
  { id: "9", text: "p-block variable binder", tier: "Moderate", test: e => e.block === "p" && !closedShell(e) && !acceptor(e) }
];

/* ── Proposed v0.2 rules (first match wins) ── */
const RULES_V02 = [
  { id: "1′", text: "Period 7 outside the s-block", tier: "Prohibited", test: e => e.period === 7 && e.block !== "s" },
  { id: "2", text: "Long-lived with no stable isotope", tier: "Moderate", test: e => persistence(e) === "long-lived" },
  { id: "3", text: "Closed shell", tier: "Safe", test: closedShell },
  { id: "4", text: "Liquid d-block", tier: "Elevated", test: e => liquid(e) && e.block === "d" },
  { id: "5′", text: "Acceptor (group 17)", tier: "Elevated", test: acceptor },
  { id: "6′", text: "Donor with EN ≤ 1.0", tier: "Safe", test: e => donor(e) && e.enPauling !== null && e.enPauling <= 1.0 },
  { id: "6b", text: "Paired donor (group 2)", tier: "Moderate", test: pairedDonor },
  { id: "7", text: "f-block", tier: "Safe", test: e => e.block === "f" },
  { id: "8", text: "d-block", tier: "Elevated", test: e => e.block === "d" },
  { id: "9", text: "p-block variable binder", tier: "Moderate", test: e => e.block === "p" && !closedShell(e) && !acceptor(e) },
  { id: "H", text: "Named exception: hydrogen", tier: "Safe", test: e => e.symbol === "H" }
];

/* The 25 classes v0.1 listed under "Tested on" (in-sample). */
const IN_SAMPLE = new Set(["U", "Es", "Sg", "At", "Pm", "Tc", "Ne", "Ar", "Hg", "F", "Cl", "Br", "I", "Li", "Na", "K", "La", "Yb", "Lu", "Sc", "Cr", "Mn", "Fe", "B", "C"]);

function applyRules(rules) {
  return sectors.filter(row => row.id <= 118).map(row => {
    const e = bySymbol.get(row.symbol);
    if (!e || e.z !== row.id) throw new Error(`property table does not match Compendium row ${row.id}`);
    const hit = rules.find(rule => rule.test(e));
    const predicted = hit ? hit.tier : null;
    const actual = mdbTier(row);
    return { z: row.id, symbol: row.symbol, name: row.name, rule: hit ? hit.id : "—", predicted, actual,
      outcome: predicted === null ? "no rule" : predicted === actual ? "match" : "miss", inSample: IN_SAMPLE.has(row.symbol) };
  });
}

function tally(rows) {
  const count = (list, outcome) => list.filter(r => r.outcome === outcome).length;
  const part = list => ({ n: list.length, match: count(list, "match"), miss: count(list, "miss"), noRule: count(list, "no rule") });
  const confusion = {};
  for (const actual of TIERS) {
    confusion[actual] = {};
    for (const predicted of [...TIERS, null]) confusion[actual][predicted ?? "no rule"] = rows.filter(r => r.actual === actual && r.predicted === predicted).length;
  }
  const byRule = {};
  for (const r of rows) {
    const entry = byRule[r.rule] || (byRule[r.rule] = { reached: 0, match: 0 });
    entry.reached += 1;
    if (r.outcome === "match") entry.match += 1;
  }
  return { all: part(rows), inSample: part(rows.filter(r => r.inSample)), outOfSample: part(rows.filter(r => !r.inSample)), confusion, byRule,
    misses: rows.filter(r => r.outcome !== "match").map(r => ({ z: r.z, symbol: r.symbol, rule: r.rule, predicted: r.predicted, actual: r.actual, inSample: r.inSample })) };
}

const v0 = applyRules(RULES_V0);
const v02 = applyRules(RULES_V02);

/* ── Appendix C: the Step 3 truth table ── */
const truthTable = Array.from({ length: 32 }, (_, n) => {
  const vector = Array.from({ length: 5 }, (_, bit) => Boolean(n & (1 << (4 - bit))));
  const result = G0.classify(vector);
  return { vector: vector.map(v => (v ? "Y" : "N")).join(""), nab: result.matches[0], cwo: result.matches[1], gsrb: result.matches[2], phase: result.phase, confidence: result.confidence };
});
const truthCounts = truthTable.reduce((acc, row) => {
  const key = row.phase === "AMBIGUOUS" ? `AMBIGUOUS ${row.confidence}` : row.phase;
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});

/* ── Chapter 7: register consistency ── */
const headersBySlug = new Map(registry.headers.map(h => [h.slug, h]));
const QUESTIONS = ["B1", "B2", "B3", "B4", "B5"];
const CONSTRAINTS = ["C1", "C2", "C3", "C4"];
const register = d1.records.map(record => {
  const header = headersBySlug.get(record.slug);
  const vector = record.input.answers.map(a => a.value === true);
  const result = G0.classify(vector);
  const best = Math.max(result.matches[0], result.matches[2]);   // the two five-condition branches
  const claimed = /(\d)\/5/.exec(header.detected_phase);
  const claimedCount = claimed ? Number(claimed[1]) : (header.detected_phase === "GSRB" ? 5 : null);
  const d1Constraints = record.input.constraints.map(c => c.value === true);
  const issuedConstraints = CONSTRAINTS.map(c => header.constraint_record[c] === true);
  return {
    entity: record.entity,
    vector: vector.map(v => (v ? "Y" : "N")).join(""),
    engine: `${result.phase} ${result.confidence}`,
    bestMatch: best,
    issuedLabel: header.detected_phase,
    issuedConfidence: header.confidence,
    claimedCount,
    countAgrees: claimedCount === null || claimedCount === best,
    d1Constraints: d1Constraints.map(v => (v ? "Y" : "N")).join(""),
    issuedConstraints: issuedConstraints.map(v => (v ? "Y" : "N")).join(""),
    constraintsAgree: d1Constraints.every((v, i) => v === issuedConstraints[i]),
    b4Basis: record.input.b4 ? record.input.b4.basis : null
  };
});
const perQuestion = Object.fromEntries([...QUESTIONS, ...CONSTRAINTS].map((code, i) => {
  const values = d1.records.map(r => (i < 5 ? r.input.answers[i] : r.input.constraints[i - 5]).value === true);
  return [code, { yes: values.filter(Boolean).length, no: values.filter(v => !v).length }];
}));
const issuedCounts = registry.headers.reduce((acc, h) => { acc[h.constraint_record.count] = (acc[h.constraint_record.count] || 0) + 1; return acc; }, {});

/* ── Appendix A: Phase × Type matrix ──
   D = defined in the sources · D✗ = defined as ineligible · O = observed · U = unassigned.
   Sources: Sept 2026 DOCX phase eligibility table (five written classes); Part XXIV
   routing map (library 25-additional-specs.md §3.1–3.3) and routing flows (print
   Part XXIV); Part XIII Sentinels; Part XVII §5 ("any atomic body → executive
   authority" prohibited); Part XXIV §2.5 (GSRB "outside the periodic table"). */
const WRITTEN = new Map([["Ne", "D"], ["H", "D"], ["C", "D"], ["Fe", "D"], ["U", "D✗ nominal"]]);
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const ROUTED = new Set([
  2, 10, 18, 36, 54, 86, ...range(57, 71), 119,           // §3.1 Safe routing table
  6, 5, 4, 43,                                             // §3.2 Moderate routing table
  26, 9, 17, 35, 53, 80, ...range(21, 30), ...range(72, 80), // §3.3 Elevated routing table
  85, 11, 19, 12                                           // named in routing flows: At, Na, K, Mg
]);
const SENTINELS = new Set([1, 2, 3, 4, 5]);
const matrix = sectors.map(row => {
  const prohibited = row.riskLevel === 3;
  const codes = [];
  let ice, water;
  if (WRITTEN.has(row.symbol)) {
    ice = WRITTEN.get(row.symbol);
    water = "D✗";
    codes.push("W");
  } else if (prohibited) {
    ice = "D✗"; water = "D✗";
  } else if (row.id === 119) {
    ice = "D"; water = "D";
    codes.push("C");
  } else if (ROUTED.has(row.id) || SENTINELS.has(row.id)) {
    ice = "D"; water = "U";
  } else {
    ice = "U"; water = "U";
  }
  if (ROUTED.has(row.id)) codes.push("R");
  if (SENTINELS.has(row.id)) codes.push("S");
  if (prohibited) codes.push(row.id === 106 ? "P‡" : row.id >= 97 && row.id <= 103 ? "P*" : "P");   // * MDB only (routing text names 89–96); ‡ back-end entropy only
  if (!codes.length) codes.push("M");
  return { id: row.id, symbol: row.symbol, name: row.name, tier: mdbTier(row), density: row.authorityDensity, ice, water, gas: "D✗", basis: codes.join(", ") };
});
const matrixCounts = ["ice", "water", "gas"].reduce((acc, column) => {
  acc[column] = matrix.reduce((inner, row) => { const key = row[column].startsWith("D✗") ? "D✗" : row[column]; inner[key] = (inner[key] || 0) + 1; return inner; }, {});
  return acc;
}, {});

/* ── Ambient layer: WMM2025 check and site zoning (Chapter 5, App. D) ──
   The WMM is NCEI/BGS's model of the core field (degree and order 12). The
   zoning uses only its dipole, which NCEI calls "the basis for the simple
   geomagnetic coordinate system". Formulas follow the WMM2025 Technical Report
   (https://doi.org/10.25923/prbc-s316): geodetic-to-spherical conversion,
   Schmidt semi-normalized Legendre functions, the field in spherical
   coordinates, and the rotation back to geodetic axes. */
const wmm = readJson("research/data/wmm2025.json");
const DEG = Math.PI / 180;
const WGS84_A = 6378.137, WGS84_F = 1 / 298.257223563, WGS84_E2 = WGS84_F * (2 - WGS84_F), R_REF = 6371.2; // km
const WMM_EPOCH = wmm.provenance.epoch;
const WMM_VALID = [2025.0, 2030.0];   // to be used 1 Jan 2025 – 31 Dec 2029

function geodeticToSpherical(latDeg, heightKm) {
  const phi = latDeg * DEG, s = Math.sin(phi), c = Math.cos(phi);
  const rc = WGS84_A / Math.sqrt(1 - WGS84_E2 * s * s);
  const p = (rc + heightKm) * c, z = (rc * (1 - WGS84_E2) + heightKm) * s;
  const r = Math.hypot(p, z);
  return { r, phiPrime: Math.asin(z / r) };
}
const factorial = n => (n <= 1 ? 1 : n * factorial(n - 1));
function schmidtLegendre(nMax, theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  const P = Array.from({ length: nMax + 1 }, () => new Array(nMax + 1).fill(0));
  const dP = Array.from({ length: nMax + 1 }, () => new Array(nMax + 1).fill(0));
  for (let m = 0; m <= nMax; m++) {
    let pmm = 1;
    for (let k = 1; k <= m; k++) pmm *= (2 * k - 1) * s;            // (2m−1)!! sin^m θ
    P[m][m] = pmm;
    if (m + 1 <= nMax) P[m + 1][m] = (2 * m + 1) * c * pmm;
    for (let n = m + 2; n <= nMax; n++) P[n][m] = ((2 * n - 1) * c * P[n - 1][m] - (n + m - 1) * P[n - 2][m]) / (n - m);
  }
  for (let n = 1; n <= nMax; n++) for (let m = 0; m <= n; m++) {
    dP[n][m] = (n * c * P[n][m] - (n + m) * (m <= n - 1 ? P[n - 1][m] : 0)) / s;   // ∂P/∂θ
  }
  for (let n = 0; n <= nMax; n++) for (let m = 0; m <= n; m++) {
    const k = Math.sqrt(((m === 0 ? 1 : 2) * factorial(n - m)) / factorial(n + m));
    P[n][m] *= k; dP[n][m] *= k;
  }
  return { P, dP };
}
function wmmField(latDeg, lonDeg, heightKm, year) {
  if (year < WMM_VALID[0] || year >= WMM_VALID[1]) throw new Error(`WMM2025 is not valid for ${year}`);
  if (Math.abs(latDeg) > 89.992) throw new Error("WMM2025 check points must lie between 89.992°S and 89.992°N");
  const { r, phiPrime } = geodeticToSpherical(latDeg, heightKm);
  const lambda = lonDeg * DEG, dt = year - WMM_EPOCH;
  const { P, dP } = schmidtLegendre(12, Math.PI / 2 - phiPrime);
  let Xp = 0, Yp = 0, Zp = 0;
  for (const [n, m, g0, h0, gDot, hDot] of wmm.coefficients) {
    const g = g0 + dt * gDot, h = h0 + dt * hDot, ar = Math.pow(R_REF / r, n + 2);
    const cm = Math.cos(m * lambda), sm = Math.sin(m * lambda);
    Xp += ar * (g * cm + h * sm) * dP[n][m];
    Yp += ar * m * (g * sm - h * cm) * P[n][m];
    Zp -= (n + 1) * ar * (g * cm + h * sm) * P[n][m];
  }
  Yp /= Math.cos(phiPrime);
  const psi = phiPrime - latDeg * DEG;
  const X = Xp * Math.cos(psi) - Zp * Math.sin(psi), Y = Yp, Z = Xp * Math.sin(psi) + Zp * Math.cos(psi);
  const H = Math.hypot(X, Y);
  return { phiPrime, r, Xp, Yp, Zp, X, Y, Z, H, F: Math.hypot(H, Z), D: Math.atan2(Y, X), I: Math.atan2(Z, H) };
}
const coefficient = (n, m) => wmm.coefficients.find(row => row[0] === n && row[1] === m);
function dipolePole(year) {             // boreal geomagnetic (dipole) pole from g10, g11, h11
  const dt = year - WMM_EPOCH;
  const [, , g10, , g10Dot] = coefficient(1, 0), [, , g11, h11, g11Dot, h11Dot] = coefficient(1, 1);
  const G10 = g10 + dt * g10Dot, G11 = g11 + dt * g11Dot, H11 = h11 + dt * h11Dot;
  const colatitude = Math.acos(-G10 / Math.hypot(G10, G11, H11));
  const geocentricLat = 90 - colatitude / DEG;
  return { geocentricLat, geodeticLat: Math.atan(Math.tan(geocentricLat * DEG) / (1 - WGS84_E2)) / DEG,
    lon: Math.atan2(-H11, -G11) / DEG, tilt: colatitude / DEG };
}
function geomagneticLatitude(latDeg, lonDeg, year) {
  const pole = dipolePole(year), { phiPrime } = geodeticToSpherical(latDeg, 0), pLat = pole.geocentricLat * DEG;
  return Math.asin(Math.sin(phiPrime) * Math.sin(pLat) + Math.cos(phiPrime) * Math.cos(pLat) * Math.cos((lonDeg - pole.lon) * DEG)) / DEG;
}

// Check 1: the coefficients are the pinned copy.
const canonicalCoefficients = wmm.coefficients.map(([n, m, g, h, gd, hd]) => [n, m, g.toFixed(1), h.toFixed(1), gd.toFixed(1), hd.toFixed(1)].join(" ")).join("\n");
const coefficientsSha256 = createHash("sha256").update(canonicalCoefficients).digest("hex");
// Check 2: NCEI's 12 test points, 7 values each; the table rounds nT to 0.1 and degrees to 0.01.
const testDeviations = { nT: 0, deg: 0 };
for (const [year, heightKm, lat, lon, X, Y, Z, H, F, I, D] of wmm.testValues.rows) {
  const f = wmmField(lat, lon, heightKm, year);
  for (const [a, b] of [[f.X, X], [f.Y, Y], [f.Z, Z], [f.H, H], [f.F, F]]) testDeviations.nT = Math.max(testDeviations.nT, Math.abs(a - b));
  for (const [a, b] of [[f.I / DEG, I], [f.D / DEG, D]]) testDeviations.deg = Math.max(testDeviations.deg, Math.abs(a - b));
}
// Check 3: the Technical Report's high-precision example (Table 3b).
const hp = wmm.highPrecisionExample, hpField = wmmField(hp.input.latDeg, hp.input.lonDeg, hp.input.heightKm, hp.input.year), hpExpected = hp.expected;
const hpDeviationNT = Math.max(...[[hpField.Xp, hpExpected.XprimeNT], [hpField.Yp, hpExpected.YprimeNT], [hpField.Zp, hpExpected.ZprimeNT],
  [hpField.X, hpExpected.XNT], [hpField.Y, hpExpected.YNT], [hpField.Z, hpExpected.ZNT], [hpField.F, hpExpected.FNT], [hpField.H, hpExpected.HNT]]
  .map(([a, b]) => Math.abs(a - b)));
const hpDeviationRad = Math.max(Math.abs(hpField.D - hpExpected.DRad), Math.abs(hpField.I - hpExpected.IRad), Math.abs(hpField.phiPrime - hpExpected.phiPrimeRad));
// Check 4: NCEI's published geomagnetic north pole for 2025.0 (rounded to 0.01°).
const pole2025 = dipolePole(2025.0), poleNcei = wmm.ncei.geomagneticNorthPole2025;
const poleDeviation = Math.max(Math.abs(pole2025.geocentricLat - poleNcei.geocentricLatDeg), Math.abs(pole2025.geodeticLat - poleNcei.geodeticLatDeg),
  Math.abs(pole2025.lon - poleNcei.lonDeg), Math.abs(pole2025.tilt - poleNcei.dipoleTiltDeg));
const wmmChecks = {
  coefficientsPinned: coefficientsSha256 === wmm.provenance.canonicalCoefficientsSha256,
  testValuesWithinRounding: testDeviations.nT <= 0.05 + 1e-9 && testDeviations.deg <= 0.005 + 1e-9,
  highPrecisionWithinLabelTolerance: hpDeviationNT < 0.1,
  poleMatchesNcei: poleDeviation <= 0.005 + 1e-9
};
const wmmPass = Object.values(wmmChecks).every(Boolean);

/* Proposed zoning (Section 5.4). NOAA's G-scale gives the geomagnetic latitude
   that aurora typically reaches at each level: G4 about 45°, G5 about 40°
   (https://www.swpc.noaa.gov/noaa-scales-explanation). The pool's floor is G4,
   so a site's Kp trigger is the lowest level, G4 or above, that reaches it.
   Sites below 40° have no Kp trigger, and every zone also triggers on the
   ring-current index (Dst at or below −250 nT). Zones are fixed at inception. */
const ZONING_YEAR = 2027.0;             // an illustrative 1 January 2027 inception
const ZONE_EDGE_DEG = 0.5;              // flag sites this close to a zone edge
const ZONES = [
  { zone: "1", minAbsLat: 45, trigger: "G4 or above (Kp 8− or higher), or Dst ≤ −250 nT" },
  { zone: "2", minAbsLat: 40, trigger: "G5 (Kp 9o), or Dst ≤ −250 nT" },
  { zone: "3", minAbsLat: 0, trigger: "Dst ≤ −250 nT only" }
];
// Illustrative city coordinates (not insured facilities): data-centre markets and two polar stations.
const SITES = [
  ["Ashburn, Virginia, US", 39.04, -77.49], ["Phoenix, Arizona, US", 33.45, -112.07], ["Boardman, Oregon, US", 45.84, -119.70],
  ["Montréal, Québec, CA", 45.50, -73.57], ["Dublin, IE", 53.35, -6.26], ["Frankfurt, DE", 50.11, 8.68],
  ["Luleå, SE", 65.58, 22.15], ["Reykjavík, IS", 64.15, -21.94], ["Singapore, SG", 1.35, 103.82],
  ["Tokyo, JP", 35.68, 139.69], ["Sydney, AU", -33.87, 151.21], ["Johannesburg, ZA", -26.20, 28.05],
  ["São Paulo, BR", -23.55, -46.63], ["Alert, Nunavut, CA", 82.50, -62.35], ["McMurdo Station, AQ", -77.85, 166.67]
];
const { horizontalIntensityBelowNT: BOZ_NT, cautionZoneBelowNT: CAUTION_NT } = wmm.ncei.blackoutZone;
const { constantDeg: D_UNC_A, hScaleNT: D_UNC_H } = wmm.ncei.declinationUncertainty;
const zoning = SITES.map(([site, lat, lon]) => {
  const mlat = geomagneticLatitude(lat, lon, ZONING_YEAR), abs = Math.abs(mlat);
  const zone = ZONES.find(z => abs >= z.minAbsLat);
  const edge = [45, 40].some(edgeLat => Math.abs(abs - edgeLat) < ZONE_EDGE_DEG);
  const f = wmmField(lat, lon, 0, ZONING_YEAR);
  return { site, lat, lon, geomagneticLat: Number(mlat.toFixed(2)), zone: zone.zone, trigger: zone.trigger, nearEdge: edge,
    horizontalIntensityNT: Math.round(f.H), declinationDeg: Number((f.D / DEG).toFixed(1)),
    declinationUncertaintyDeg: Number(Math.sqrt(D_UNC_A ** 2 + (D_UNC_H / f.H) ** 2).toFixed(2)),
    compassZone: f.H < BOZ_NT ? "blackout" : f.H < CAUTION_NT ? "caution" : "normal" };
});
const zoneCounts = zoning.reduce((acc, z) => { acc[z.zone] = (acc[z.zone] || 0) + 1; return acc; }, {});
const pole2027 = dipolePole(ZONING_YEAR);

/* ── Compound bodies: real chemical formulae (Section 4.11, App. E) ──
   Each formula is parsed against the 118 element symbols, matched to a registry
   record by CAS RN, composed from its constituent classes (tier, authority density,
   and the Appendix A phase cells), and given its physical state of matter from the
   pinned measurements. The model lives in scripts/nab-compounds.mjs. */
const compoundData = readJson("research/data/compound-bodies.json");
const compoundSha256 = createHash("sha256").update(Compounds.canonicalText(compoundData)).digest("hex");
const matrixById = new Map(matrix.map(row => [row.id, row]));
const classes = new Map(sectors.filter(row => row.id <= 118).map(row => {
  const cell = matrixById.get(row.id), e = bySymbol.get(row.symbol);
  if (!Compounds.DENSITIES.includes(row.authorityDensity)) throw new Error(`unknown authority density for ${row.symbol}`);
  return [row.symbol, { z: row.id, name: row.name, tier: mdbTier(row), density: row.authorityDensity, ice: cell.ice, water: cell.water, gas: cell.gas, group: e.group }];
}));
const REFERENCE_K = 298.15;           // 25 °C, at 101,325 Pa
const STATE_WORD = { gas: "GAS", liquid: "WATER", solid: "ICE" };
const MOLAR_MASS_TOLERANCE = 0.01;    // g/mol; the PubChem-derived values use pre-2021 atomic weights
const compoundRows = compoundData.registry.map(sub => {
  const parsed = Compounds.parseFormula(sub.formula);
  if (!parsed.ok) throw new Error(`registry formula ${sub.formula}: ${parsed.error}`);
  const body = Compounds.composeBody(parsed, classes);
  const mass = Compounds.molarMass(parsed, compoundData.atomicWeights);
  const straddles = sub.ladder1atm.steps.filter(step => Object.values(step.alternatives || {}).some(v => (v <= REFERENCE_K) !== (step.atK <= REFERENCE_K)));
  return { id: sub.id, name: sub.name, formula: sub.formula, cas: sub.cas, casValid: Compounds.casValid(sub.cas), hill: parsed.hill,
    recordFormula: sub.pubchemFormula, hillMatches: parsed.hill === sub.pubchemFormula, molarMass: Number(mass.toFixed(4)),
    molarMassDeviation: Number((mass - sub.pubchemMolarMass).toFixed(4)), constituents: body.constituents.map(c => ({ symbol: c.symbol, count: c.count, tier: c.tier })),
    tier: body.tier, density: body.density, eligibility: body.eligibility, routing: body.routing, flags: body.flags, elevated: body.elevated,
    physical25C: Compounds.phaseAt1atm(sub, REFERENCE_K), ladder: Compounds.ladderText(sub), robustAt25C: straddles.length === 0, isotopes: parsed.isotopes.length };
});
// Single-element entries cross-check against the elemental property table (mendeleev 1.3.0).
const elementStateChecks = compoundRows.filter(r => r.constituents.length === 1 && !r.isotopes)
  .map(r => ({ formula: r.formula, model: r.physical25C, table: STATE_WORD[bySymbol.get(r.constituents[0].symbol).state25C] }));
const registryById = new Map(compoundData.registry.map(sub => [sub.id, sub]));
let ladderCurveDisagreements = 0;
for (const sub of compoundData.registry) if (sub.curves) {
  for (const T of [REFERENCE_K, ...sub.ladder1atm.steps.flatMap(step => [step.atK - 0.5, step.atK + 0.5])]) {
    if (Compounds.phaseAt(sub, T, Compounds.ATM) !== Compounds.phaseAt1atm(sub, T)) ladderCurveDisagreements += 1;
  }
}
const pointResults = compoundData.phaseTestPoints.rows.map(([id, T, p, expected, , saturation]) => {
  const sub = registryById.get(id), got = Compounds.phaseAt(sub, T, p);
  return { id, T, p, expected, got, saturationDeviation: saturation ? Compounds.vaporPressure(sub, T) / saturation - 1 : null };
});
const pointFailures = pointResults.filter(r => r.got !== r.expected);
const worstSaturationDeviation = Math.max(...pointResults.filter(r => r.saturationDeviation !== null).map(r => Math.abs(r.saturationDeviation)));
const saturationDeviationBySubstance = pointResults.filter(r => r.saturationDeviation !== null).reduce((acc, r) => {
  acc[r.id] = Number(Math.max(acc[r.id] ?? 0, Math.abs(r.saturationDeviation)).toFixed(4));
  return acc;
}, {});
const reactionRows = compoundData.reactions.map(reaction => {
  const parsed = Compounds.parseReaction(reaction.equation);
  if (!parsed.ok) throw new Error(`reaction ${reaction.id}: ${parsed.error}`);
  const result = Compounds.balance(parsed);
  const species = [...parsed.left, ...parsed.right];
  const registered = species.filter(t => compoundData.registry.some(sub => Compounds.parseFormula(sub.formula).hill === t.parsed.hill)).length;
  return { id: reaction.id, equation: reaction.equation, balanced: result.balanced, expected: reaction.balanced, differences: result.differences, species: species.length, registered };
});
const compoundChecks = {
  dataPinned: compoundSha256 === compoundData.canonicalSha256,
  casCheckDigitsValid: compoundRows.every(r => r.casValid),
  formulaeMatchRecords: compoundRows.every(r => r.hillMatches),
  molarMassesWithinTolerance: compoundRows.every(r => Math.abs(r.molarMassDeviation) <= MOLAR_MASS_TOLERANCE),
  stateAt25CRobustToSource: compoundRows.every(r => r.robustAt25C),
  elementsMatchPropertyTable: elementStateChecks.every(c => c.model === c.table),
  ladderAndCurvesAgreeAt1atm: ladderCurveDisagreements === 0,
  phaseTestPointsAgree: pointFailures.length === 0,
  reactionsBalanceAsDeclared: reactionRows.every(r => r.balanced === r.expected)
};
const compoundPass = Object.values(compoundChecks).every(Boolean);
// Illustrative readings off 1 atm (the classifier interpolates between the pinned triple, normal, and critical points).
const READINGS = [
  ["carbon-dioxide", 298.15, 7.0e6, "liquid CO2 in a pressurized cylinder"],
  ["carbon-dioxide", 310.0, 8.0e6, "above the critical point"],
  ["uranium-hexafluoride", 340.0, 3.0e5, "liquid UF6, above the triple point"],
  ["uranium-hexafluoride", 298.15, 5.0e4, "solid UF6 at half an atmosphere"],
  ["uranium-hexafluoride", 298.15, 1.0e4, "below its sublimation pressure"],
  ["helium", 1.0, 3.0e6, "solid helium under pressure"],
  ["helium", 1.0, Compounds.ATM, "no solid at 1 atm"],
  ["water", 298.15, 2.0e3, "below its vapor pressure"],
  ["water", 700.0, 2.5e7, "supercritical water"],
  ["copper-sulfate-pentahydrate", 350.0, Compounds.ATM, "dehydrating"],
  ["xenon-difluoride", 298.15, 1.0e6, "no pinned data off 1 atm"]
].map(([id, T, p, note]) => ({ id, formula: registryById.get(id).formula, T, p, phase: Compounds.phaseAt(registryById.get(id), T, p), note }));
// Grammar and rule edges, on formulae outside the registry.
const EDGES = ["Ha2O", "NaCl3", "CuSO4.5H2O", "K4[Fe(CN)6]·3H2O", "SO4^2-", "Fe0.95O", "CrMnFeCoNi", "CrMnFeCoNiCu"].map(text => {
  const parsed = Compounds.parseFormula(text);
  if (!parsed.ok) return { text, ok: false, error: parsed.error };
  const body = Compounds.composeBody(parsed, classes);
  return { text, ok: true, hill: parsed.hill, registered: compoundData.registry.some(sub => Compounds.parseFormula(sub.formula).hill === parsed.hill),
    elevated: body.elevated.length, ice: body.eligibility.ice, flags: body.flags };
});
const eligibilityCounts = ["ice", "water", "gas"].reduce((acc, phase) => {
  acc[phase] = compoundRows.reduce((inner, r) => { inner[r.eligibility[phase]] = (inner[r.eligibility[phase]] || 0) + 1; return inner; }, {});
  return acc;
}, {});
const physicalCounts = compoundRows.reduce((acc, r) => { acc[r.physical25C] = (acc[r.physical25C] || 0) + 1; return acc; }, {});

/* ── World model: the disc, the table on it, and the field's coefficients ──
   (Chapter 0, Appendices F–H). The 360° Legend is read from the print source
   (Part VI, "Fossilized 360° Degree Legend") and pinned by hash; the repository's
   app copy (js/ocm-data.js) and the OCM address rules (js/ocm-directory.js) are
   checked against it. Each class's arc is the Compendium's "360° Legend Mapping". */
const PRINT_SOURCE = "publications/book/AGS-v0.2-Harshal-s-Systems-Full-Book-PRINT-SOURCE-2026-10-07.txt";
const LEGEND_SHA256 = "56778e55649df9a49528d764e85e0768da9226f88c3289ad0140fb5a6c7e02d6";
const legend = World.extractLegend(readFileSync(path.join(ROOT, PRINT_SOURCE), "utf8"));
const legendSha256 = createHash("sha256").update(World.legendCanonical(legend)).digest("hex");
globalThis.window = globalThis;          // the OCM modules are browser scripts that publish on window
require(path.join(ROOT, "js/ocm-data.js"));
require(path.join(ROOT, "js/ocm-directory.js"));
const OCM = globalThis.OCM_DATA, OCMDIR = globalThis.HOSOCMDIR;
const appLegendDifferences = [];
let appLegendMismatches = 0;
for (let d = 0; d < World.RING; d++) {
  const app = OCM.degrees[d], book = legend.degrees[d].domain;
  if (app !== book) appLegendDifferences.push({ degree: d, app, book });
  if (World.normalizeText(app) !== World.normalizeText(book)) appLegendMismatches += 1;
}
const classArcs = sectors.map(row => ({ z: row.id, symbol: row.symbol, name: row.name, tier: mdbTier(row), legend: row.legend, arc: World.parseArc(row.legend) }));
const disc = World.coverage(classArcs.filter(a => a.arc));
const domainOf = d => legend.degrees[d % World.RING].domain;
const quadrantCoverage = legend.quadrants.map(q => ({ name: q.name, from: q.from, to: q.to,
  covered: disc.perDegree.slice(q.from, q.to + 1).filter(list => list.length).length, degrees: q.to - q.from + 1 }));
// The book's subjects on the disc (Chapter 0).
const SUBJECTS = [
  ["The geomagnetic field and the Sun", [4, 9]], ["Chemistry", [10]], ["Magnetic heading", [25]], ["War", [61, 62, 63, 64]],
  ["Neural bodies", [100, 101, 102]], ["Accountability", [123]], ["Insurance", [127, 128, 129, 130]], ["Indices and monitors", [141, 142, 143, 144, 145]],
  ["Catastrophe", [210, 211, 214, 219]], ["Cyber", [224, 225]], ["Records", [280, 281, 282, 283]], ["The center", [319, 320, 321, 322, 323, 324, 325, 326, 327]]
].map(([subject, degrees]) => ({ subject, degrees: degrees.map(d => ({ degree: d, domain: domainOf(d), classes: disc.perDegree[d] })) }));
const maxOverlap = Math.max(...disc.perDegree.map(list => list.length));
const ocmChecks = {
  ringDistanceWorkedExample: OCMDIR.ringDistance(42, 198) === 156,
  workedExampleAddressesValid: OCMDIR.validateAddress("0•042•003•0001").ok === true && OCMDIR.validateAddress("0•198•003•0004").ok === true,
  closureIsNotAnAddress: OCMDIR.validateAddress("0•360•001•0001").code === "OCM-ADDR-SECTOR-CLOSURE",
  originSectorReserved: OCMDIR.validateAddress("0•000•001•0005").code === "OCM-ADDR-ORIGIN-RESERVED",
  centerIsOrigin: OCMDIR.parseAddress(OCM.center.address).isCenterOrigin === true
};
// The Periodic Table of Neural Elements: the MDB's neural profile and the chemical anchor of classes 1–118.
const TIER_LETTER = { Safe: "S", Moderate: "M", Elevated: "E", Prohibited: "P" };
const periodicRows = sectors.map(row => {
  const e = bySymbol.get(row.symbol) || null;
  const arc = World.parseArc(row.legend);
  const position = World.gridPosition(e ? { z: e.z, period: e.period, group: e.group } : { z: row.id });
  return { z: row.id, symbol: row.symbol, name: row.name, tier: mdbTier(row), mdbProfile: row.riskProfile.replace(/^\S+\s/, ""), alignment: row.alignment,
    density: row.authorityDensity, trait: row.trait, failureMode: row.failureMode, arc, arcText: row.legend,
    arcDomains: arc ? [domainOf(arc.from), domainOf(arc.to)] : null, position,
    anchor: e ? { group: e.group, period: e.period, block: e.block, atomicWeight: compoundData.atomicWeights[e.symbol], enPauling: e.enPauling,
      state25C: e.state25C, persistence: persistence(e), standardAtomicWeight: !compoundData.provenance.noStandardAtomicWeight.includes(e.symbol) } : null };
});
const gridCells = new Map(periodicRows.map(r => [`${r.position.row},${r.position.col}`, `${r.symbol}·${TIER_LETTER[r.tier]}`]));
const GRID_ROWS = [[1, "1"], [2, "2"], [3, "3"], [4, "4"], [5, "5"], [6, "6"], [7, "7"], [8, "8"], [9, "La–Lu"], [10, "Ac–Lr"]];
const periodicGrid = GRID_ROWS.map(([row, label]) => ({ label, cells: Array.from({ length: 18 }, (_, k) => {
  const key = `${row},${k + 1}`;
  if (gridCells.has(key)) return gridCells.get(key);
  if (row === 6 && k === 2) return "57–71";
  if (row === 7 && k === 2) return "89–103";
  return "";
}) }));
const wmmCoefficientRows = wmm.coefficients.map(([n, m, g, h, gd, hd]) => ({ n, m, g, h, gDot: gd, hDot: hd }));
const worldChecks = {
  legendPinned: legendSha256 === LEGEND_SHA256,
  legendComplete: legend.degrees.length === World.RING + 1 && legend.quadrants.length === 4,
  appLegendMatchesBook: appLegendMismatches === 0,
  everyClassHasAnArc: classArcs.every(a => a.arc),
  ocmAddressing: Object.values(ocmChecks).every(Boolean),
  gridComplete: gridCells.size === 119,
  wmmCoefficientRows: wmmCoefficientRows.length === 90 && wmmCoefficientRows.every(r => r.n >= 1 && r.n <= 12 && r.m >= 0 && r.m <= r.n)
};
const worldPass = Object.values(worldChecks).every(Boolean);

/* ── Output ── */
const summary = {
  engineSha256Pinned: d1.publishedBy.engineSha256,
  derivation: { v0: tally(v0), v02: tally(v02) },
  truthTable: { counts: truthCounts, rows: truthTable },
  register: { entities: register.length, rows: register, perQuestion, issuedConstraintCounts: issuedCounts,
    countDisagreements: register.filter(r => !r.countAgrees).map(r => r.entity),
    constraintDisagreements: register.filter(r => !r.constraintsAgree).map(r => r.entity) },
  matrix: { counts: matrixCounts, rows: matrix },
  ambient: {
    wmm: { model: wmm.provenance.model, cofHeader: wmm.provenance.cofHeader, coefficientRows: wmm.coefficients.length, coefficientsSha256,
      testPoints: wmm.testValues.rows.length, testValues: wmm.testValues.rows.length * 7,
      worstTestDeviation: { nT: Number(testDeviations.nT.toFixed(4)), deg: Number(testDeviations.deg.toFixed(4)) },
      highPrecisionWorstDeviation: { nT: hpDeviationNT, rad: hpDeviationRad },
      pole2025: Object.fromEntries(Object.entries(pole2025).map(([k, v]) => [k, Number(v.toFixed(3))])),
      poleNcei: poleNcei, checks: wmmChecks, pass: wmmPass },
    zoning: { year: ZONING_YEAR, pole: Object.fromEntries(Object.entries(pole2027).map(([k, v]) => [k, Number(v.toFixed(3))])),
      zones: ZONES, counts: zoneCounts, sites: zoning }
  },
  compounds: {
    data: { schema: compoundData.schema, canonicalSha256: compoundSha256, substances: compoundData.registry.length, reactions: compoundData.reactions.length,
      phaseTestPoints: compoundData.phaseTestPoints.rows.length },
    checks: compoundChecks, pass: compoundPass,
    worstMolarMassDeviation: Math.max(...compoundRows.map(r => Math.abs(r.molarMassDeviation))),
    worstSaturationDeviation: Number(worstSaturationDeviation.toFixed(4)), saturationDeviationBySubstance,
    eligibilityCounts, physicalCounts, rows: compoundRows, elementStateChecks, reactions: reactionRows, readings: READINGS, edges: EDGES
  },
  worldModel: {
    checks: worldChecks, pass: worldPass,
    legend: { source: PRINT_SOURCE, startLine: legend.startLine, endLine: legend.endLine, sha256: legendSha256, center: legend.center, rule: legend.rule,
      quadrants: legend.quadrants, degrees: legend.degrees.map(d => ({ degree: d.degree, domain: d.domain, line: d.line, classes: d.degree < World.RING ? disc.perDegree[d.degree] : [] })) },
    appLegend: { file: "js/ocm-data.js", rawDifferences: appLegendDifferences, normalizedMismatches: appLegendMismatches },
    disc: { covered: disc.covered, gaps: disc.gaps.length, gapRuns: World.runs(disc.gaps), overlaps: disc.overlaps.length, maxOverlap,
      maxOverlapDegrees: disc.perDegree.map((list, d) => (list.length === maxOverlap ? { degree: d, classes: list } : null)).filter(Boolean),
      quadrantCoverage, subjects: SUBJECTS },
    ocm: { center: OCM.center.address, author: OCM.center.author, checks: ocmChecks },
    periodicTable: { grid: periodicGrid, rows: periodicRows },
    wmmCoefficients: { header: wmm.provenance.cofHeader, epoch: WMM_EPOCH, rows: wmmCoefficientRows }
  }
};
if (!wmmPass || !compoundPass || !worldPass) process.exitCode = 1;

if (process.argv.includes("--json")) {
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
} else {
  const out = [];
  const line = s => out.push(s);
  const tableRows = (header, rows) => { line(`| ${header.join(" | ")} |`); line(`| ${header.map(() => "---").join(" | ")} |`); rows.forEach(r => line(`| ${r.join(" | ")} |`)); };
  for (const [label, rows] of [["v0 (as written)", v0], ["v0.2 (proposed)", v02]]) {
    const t = tally(rows);
    line(`## §4.9 derivation test — ${label}`);
    line(`All 118: ${t.all.match} match, ${t.all.miss} miss, ${t.all.noRule} no rule · in-sample ${t.inSample.match}/${t.inSample.n} · out-of-sample ${t.outOfSample.match}/${t.outOfSample.n} (${t.outOfSample.miss} miss, ${t.outOfSample.noRule} no rule)`);
    line(`By rule (matched/reached): ${Object.entries(t.byRule).map(([rule, v]) => `${rule} ${v.match}/${v.reached}`).join(" · ")}`);
    line("");
    tableRows(["Compendium tier", ...TIERS.map(x => `→ ${x}`), "→ no rule"], TIERS.map(a => [a, ...TIERS.map(p => String(t.confusion[a][p])), String(t.confusion[a]["no rule"])]));
    line("");
    tableRows(["Z", "Class", "Rule", "Predicted", "Compendium", "Sample"], t.misses.map(m => [String(m.z), m.symbol, m.rule, m.predicted ?? "no rule", m.actual, m.inSample ? "in" : "out"]));
    line("");
  }
  line("## Appendix C — Ground-0 Step 3 truth table (B1 B2 B3 B4 B5)");
  line(Object.entries(truthCounts).map(([k, v]) => `${k}: ${v}`).join(" · "));
  line("");
  tableRows(["Vector", "NAB", "CWO", "GSRB", "Outcome", "Confidence"], truthTable.map(r => [r.vector, `${r.nab}/5`, `${r.cwo}/4`, `${r.gsrb}/5`, r.phase, r.confidence]));
  line("");
  line("## §7 register consistency");
  line(`Engine SHA-256 pinned in the D1 manifest: ${summary.engineSha256Pinned}`);
  line(`Per question (YES/NO): ${Object.entries(perQuestion).map(([k, v]) => `${k} ${v.yes}/${v.no}`).join(" · ")}`);
  line(`Issued constraint counts: ${Object.entries(issuedCounts).map(([k, v]) => `${k}: ${v}`).join(" · ")}`);
  line("");
  tableRows(["Entity", "Vector", "Engine", "Best match", "Issued label", "Count agrees", "Constraints D1", "Constraints issued", "Agree", "B4 basis"],
    register.map(r => [r.entity, r.vector, r.engine, `${r.bestMatch}/5`, r.issuedLabel, r.countAgrees ? "yes" : "NO", r.d1Constraints, r.issuedConstraints, r.constraintsAgree ? "yes" : "NO", r.b4Basis ?? "—"]));
  line("");
  line("## Appendix A — Phase × Type matrix");
  line(`ICE ${JSON.stringify(matrixCounts.ice)} · WATER ${JSON.stringify(matrixCounts.water)} · GAS ${JSON.stringify(matrixCounts.gas)}`);
  line("");
  tableRows(["#", "Class", "Tier", "ICE", "WATER", "GAS", "Basis"], matrix.map(r => [String(r.id), `${r.name} (${r.symbol})`, r.tier, r.ice, r.water, r.gas, r.basis]));
  line("");
  line("## Appendix D — WMM2025 check and ambient zoning");
  line(`WMM2025 check: ${wmmPass ? "PASS" : "FAIL"} · ${Object.entries(wmmChecks).map(([k, v]) => `${k} ${v ? "yes" : "NO"}`).join(" · ")}`);
  line(`Coefficients: ${wmm.coefficients.length} rows, header "${wmm.provenance.cofHeader}", canonical SHA-256 ${coefficientsSha256}`);
  line(`NCEI test values: ${wmm.testValues.rows.length} points × 7 = ${wmm.testValues.rows.length * 7} values; worst deviation ${testDeviations.nT.toFixed(3)} nT and ${testDeviations.deg.toFixed(4)}° (table rounding 0.05 nT and 0.005°)`);
  line(`High-precision example (Technical Report Table 3b): worst deviation ${hpDeviationNT.toExponential(1)} nT and ${hpDeviationRad.toExponential(1)} rad`);
  line(`Geomagnetic north pole 2025.0: ${pole2025.geocentricLat.toFixed(3)}°N geocentric (${pole2025.geodeticLat.toFixed(3)}°N geodetic), ${Math.abs(pole2025.lon).toFixed(3)}°W, dipole tilt ${pole2025.tilt.toFixed(3)}° · NCEI: ${poleNcei.geocentricLatDeg}°N (${poleNcei.geodeticLatDeg}°N), ${Math.abs(poleNcei.lonDeg)}°W, ${poleNcei.dipoleTiltDeg}°`);
  line(`Zoning at ${ZONING_YEAR.toFixed(1)}: pole ${pole2027.geocentricLat.toFixed(3)}°N geocentric, ${Math.abs(pole2027.lon).toFixed(3)}°W · zone counts ${Object.entries(zoneCounts).map(([k, v]) => `${k}: ${v}`).join(" · ")}`);
  line("");
  tableRows(["Site", "Geomagnetic lat.", "Zone", "Space-weather trigger", "Near edge", "H (nT)", "Declination", "Declination uncertainty", "Compass zone"],
    zoning.map(z => [z.site, `${z.geomagneticLat.toFixed(2)}°`, z.zone, z.trigger, z.nearEdge ? "yes" : "no", String(z.horizontalIntensityNT), `${z.declinationDeg.toFixed(1)}°`, `${z.declinationUncertaintyDeg.toFixed(2)}°`, z.compassZone]));
  line("");
  line("## Appendix E — Compound bodies: real chemical formulae");
  line(`Compound check: ${compoundPass ? "PASS" : "FAIL"} · ${Object.entries(compoundChecks).map(([k, v]) => `${k} ${v ? "yes" : "NO"}`).join(" · ")}`);
  line(`Data: ${compoundData.registry.length} substances, ${compoundData.reactions.length} reactions, ${compoundData.phaseTestPoints.rows.length} phase test points; canonical SHA-256 ${compoundSha256}`);
  line(`Worst molar-mass deviation from the PubChem-derived record: ${summary.compounds.worstMolarMassDeviation.toFixed(4)} g/mol (tolerance ${MOLAR_MASS_TOLERANCE}) · worst interpolated saturation-pressure deviation from CoolProp at the test temperatures: ${(100 * worstSaturationDeviation).toFixed(1)}%`);
  line(`Eligibility: ICE ${JSON.stringify(eligibilityCounts.ice)} · WATER ${JSON.stringify(eligibilityCounts.water)} · GAS ${JSON.stringify(eligibilityCounts.gas)} · physical state at 25 °C ${JSON.stringify(physicalCounts)}`);
  line("");
  const elig = e => `${e.ice} / ${e.water} / ${e.gas}`;
  tableRows(["Formula", "Substance", "Hill", "CAS RN", "M (g/mol)", "Constituents", "Tier", "Authority density", "ICE / WATER / GAS", "Flags", "Physical at 25 °C", "1-atm ladder"],
    compoundRows.map(r => [r.formula, r.name, r.hill, r.cas, r.molarMass.toFixed(3), r.constituents.map(c => `${c.symbol} ${c.tier}`).join(", "), r.tier, r.density, elig(r.eligibility), r.flags.join(", ") || "—", r.physical25C, r.ladder]));
  line("");
  tableRows(["Reaction", "Balanced", "Expected", "Difference (right − left)", "Species registered"],
    reactionRows.map(r => [r.equation, r.balanced ? "yes" : "no", r.expected ? "yes" : "no", Object.keys(r.differences).length ? JSON.stringify(r.differences) : "—", `${r.registered} of ${r.species}`]));
  line("");
  tableRows(["Formula", "T (K)", "p (Pa)", "Physical phase", "Note"], READINGS.map(r => [r.formula, String(r.T), String(r.p), r.phase, r.note]));
  line("");
  tableRows(["Input", "Parses", "Hill or error", "Registered", "Distinct Elevated", "ICE", "Flags"],
    EDGES.map(e => [e.text, e.ok ? "yes" : "no", e.ok ? e.hill : e.error, e.ok ? (e.registered ? "yes" : "no") : "—", e.ok ? String(e.elevated) : "—", e.ok ? e.ice : "—", e.ok ? (e.flags.join(", ") || "—") : "—"]));
  line("");
  line("## Appendix F — Periodic Table of Neural Elements");
  line(`World-model check: ${worldPass ? "PASS" : "FAIL"} · ${Object.entries(worldChecks).map(([k, v]) => `${k} ${v ? "yes" : "NO"}`).join(" · ")}`);
  line(`Disc coverage: ${disc.covered} of 360 degrees covered by at least one class · ${disc.overlaps.length} by two or more (at most ${maxOverlap}) · ${disc.gaps.length} by none, in ${World.runs(disc.gaps).length} runs: ${World.runs(disc.gaps).map(([a, b]) => (a === b ? `${a}°` : `${a}°–${b}°`)).join(", ")}`);
  line(`By quadrant: ${quadrantCoverage.map(q => `${q.name} ${q.covered}/${q.degrees}`).join(" · ")}`);
  line("");
  tableRows(["Period", ...Array.from({ length: 18 }, (_, k) => String(k + 1))], periodicGrid.map(r => [r.label, ...r.cells]));
  line("");
  tableRows(["Z", "Class", "Tier", "Authority density", "Dominant trait", "Failure mode", "Legend arc", "Group", "Period", "Block", "Atomic weight", "State at 25 °C", "Persistence"],
    periodicRows.map(r => [String(r.z), `${r.name} (${r.symbol})`, r.tier, r.density, r.trait, r.failureMode, r.arcText,
      r.anchor ? String(r.anchor.group ?? "—") : "—", r.anchor ? String(r.anchor.period) : "—", r.anchor ? r.anchor.block : "—",
      r.anchor ? String(r.anchor.atomicWeight) : "—", r.anchor ? r.anchor.state25C : "—", r.anchor ? r.anchor.persistence : "—"]));
  line("");
  line("## Appendix G — 360° Legend (print source, Part VI)");
  line(`Lines ${legend.startLine}–${legend.endLine} of ${PRINT_SOURCE}; canonical SHA-256 ${legendSha256}; js/ocm-data.js differs in ${appLegendDifferences.length} entries before normalization and ${appLegendMismatches} after`);
  line(`OCM addressing (js/ocm-directory.js): ${Object.entries(ocmChecks).map(([k, v]) => `${k} ${v ? "yes" : "NO"}`).join(" · ")}`);
  line("");
  tableRows(["Degree", "Domain", "Classes"], legend.degrees.map(d => [String(d.degree), d.domain, d.degree < World.RING ? (disc.perDegree[d.degree].join(", ") || "—") : "(closure onto 0°)"]));
  line("");
  line("## Appendix H — WMM2025 coefficients");
  line(`Header "${wmm.provenance.cofHeader}", epoch ${WMM_EPOCH.toFixed(1)}; g and h in nT, secular variation in nT/year`);
  line("");
  tableRows(["n", "m", "g", "h", "ġ", "ḣ"], wmmCoefficientRows.map(r => [String(r.n), String(r.m), r.g.toFixed(1), r.h.toFixed(1), r.gDot.toFixed(1), r.hDot.toFixed(1)]));
  process.stdout.write(out.join("\n") + "\n");
}
