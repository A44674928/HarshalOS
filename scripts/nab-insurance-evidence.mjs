#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   HarshalOS — evidence tables for "Neural Atomic Bodies & Associated
   Insurance Requirements" (research/neural-atomic-bodies-insurance.md)

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

   Physical property values come from research/data/elemental-properties.json.
   No network access and no dependencies. Nothing here prices cover, issues a
   badge, or changes the register.

   Usage:
     node scripts/nab-insurance-evidence.mjs           Markdown report
     node scripts/nab-insurance-evidence.mjs --json    machine-readable summary
   ═══════════════════════════════════════════════════════════════ */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

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

/* ── Output ── */
const summary = {
  engineSha256Pinned: d1.publishedBy.engineSha256,
  derivation: { v0: tally(v0), v02: tally(v02) },
  truthTable: { counts: truthCounts, rows: truthTable },
  register: { entities: register.length, rows: register, perQuestion, issuedConstraintCounts: issuedCounts,
    countDisagreements: register.filter(r => !r.countAgrees).map(r => r.entity),
    constraintDisagreements: register.filter(r => !r.constraintsAgree).map(r => r.entity) },
  matrix: { counts: matrixCounts, rows: matrix }
};

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
  process.stdout.write(out.join("\n") + "\n");
}
