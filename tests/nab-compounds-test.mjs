/* Compound bodies: real chemical formulae through the NAB phase model
   (research/neural-atomic-bodies-insurance-requirements.md Section 4.11, Appendix E). */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as C from "../scripts/nab-compounds.mjs";

const ROOT = new URL("../", import.meta.url);
const data = JSON.parse(readFileSync(new URL("research/data/compound-bodies.json", ROOT), "utf8"));
const properties = JSON.parse(readFileSync(new URL("research/data/elemental-properties.json", ROOT), "utf8"));
const evidence = JSON.parse(execFileSync(process.execPath, ["scripts/nab-insurance-evidence.mjs", "--json"], { cwd: ROOT, encoding: "utf8" }));
const groups = new Map(properties.elements.map(e => [e.symbol, e.group]));
const classes = new Map(evidence.matrix.rows.filter(r => r.id <= 118)
  .map(r => [r.symbol, { z: r.id, name: r.name, tier: r.tier, density: r.density, ice: r.ice, water: r.water, gas: r.gas, group: groups.get(r.symbol) }]));
const sub = id => data.registry.find(s => s.id === id);
const body = formula => C.composeBody(C.parseFormula(formula), classes);

test("the grammar reads real formulae: groups, brackets, hydrates, charges, isotopes, decimals", () => {
  const cases = [
    ["H2O", "H2O", 3], ["Fe(CO)5", "C5FeO5", 11], ["C2H5OH", "C2H6O", 9], ["CuSO4·5H2O", "CuH10O9S", 21],
    ["CuSO4*5H2O", "CuH10O9S", 21], ["K4[Fe(CN)6]·3H2O", "C6H6FeK4N6O3", 26], ["D2O", "D2O", 3], ["NaCl", "ClNa", 2],
    ["SO4^2-", "O4S^2-", 5], ["NH4^+", "H4N^+", 5], ["Fe0.95O", "Fe0.95O", 1.95], ["CH3OCH3", "C2H6O", 9], ["UF6", "F6U", 7]
  ];
  for (const [text, hill, atoms] of cases) {
    const p = C.parseFormula(text);
    assert.ok(p.ok, `${text}: ${p.error}`);
    assert.equal(p.hill, hill, text);
    assert.equal(p.atoms, atoms, text);
  }
  assert.deepEqual(C.parseFormula("D2O").classes, ["H", "O"], "deuterium takes the Hydrogen class");
  assert.equal(C.parseFormula("SO4^2-").charge, -2);
  assert.equal(C.parseFormula("Fe0.95O").stoichiometric, false);
});

test("the grammar refuses what is not a chemical formula, and says why", () => {
  assert.match(C.parseFormula("Ha2O").error, /not a chemical element.*Capstone/);
  assert.match(C.parseFormula("Xx").error, /not an element symbol/);
  assert.match(C.parseFormula("(H2O").error, /unclosed/);
  assert.match(C.parseFormula("H2O)").error, /unexpected/);
  assert.match(C.parseFormula("H0O").error, /positive/);
  assert.match(C.parseFormula("").error, /empty/);
  assert.match(C.parseFormula("H2O^x").error, /charge/);
  // A full stop is a decimal point, never a hydrate separator.
  assert.equal(C.parseFormula("CuSO4.5H2O").hill, "CuH2O5.5S");
});

test("Hill order, CAS check digits, and molar masses follow their published rules", () => {
  assert.equal(C.hillFormula({ O: 1, H: 2 }), "H2O");
  assert.equal(C.hillFormula({ O: 1, C: 2, H: 6 }), "C2H6O");
  assert.equal(C.hillFormula({ Na: 1, Cl: 1 }), "ClNa");
  assert.equal(C.hillFormula({ Fe: 1, C: 5, O: 5 }), "C5FeO5");
  for (const cas of ["7732-18-5", "124-38-9", "7783-81-5", "13709-36-9", "7758-99-8"]) assert.ok(C.casValid(cas), cas);
  for (const cas of ["7732-18-4", "7732185", "1-23-4"]) assert.equal(C.casValid(cas), false, cas);
  assert.ok(Math.abs(C.molarMass(C.parseFormula("H2O"), data.atomicWeights) - 18.015) < 1e-9);
  assert.ok(Math.abs(C.molarMass(C.parseFormula("UF6"), data.atomicWeights) - 352.0193) < 1e-4);
});

test("the pinned registry is intact and every record is a real, consistent substance", () => {
  const canonical = JSON.stringify({ atomicWeights: data.atomicWeights, registry: data.registry, reactions: data.reactions, phaseTestPoints: data.phaseTestPoints });
  assert.equal(createHash("sha256").update(canonical).digest("hex"), data.canonicalSha256);
  assert.equal(Object.keys(data.atomicWeights).length, 120, "118 elements plus D and T");
  for (const s of data.registry) {
    const p = C.parseFormula(s.formula);
    assert.ok(p.ok, s.formula);
    assert.ok(C.casValid(s.cas), s.cas);
    assert.equal(p.hill, s.pubchemFormula, `${s.formula} must agree with its record`);
    assert.ok(Math.abs(C.molarMass(p, data.atomicWeights) - s.pubchemMolarMass) <= 0.01, s.formula);
  }
  assert.equal(new Set(data.registry.map(s => s.cas)).size, data.registry.length);
});

test("physical phases come from measured data and agree with the equations of state", () => {
  const at25 = id => C.phaseAt1atm(sub(id), 298.15);
  assert.equal(at25("water"), "WATER");
  assert.equal(at25("carbon-dioxide"), "GAS");
  assert.equal(at25("sodium-chloride"), "ICE");
  assert.equal(at25("mercury"), "WATER");
  assert.equal(at25("gallium"), "ICE");
  assert.equal(C.phaseAt1atm(sub("gallium"), 303.15), "WATER", "gallium melts at 29.76 °C");
  assert.equal(at25("hydrogen-fluoride"), "GAS");
  assert.equal(C.phaseAt1atm(sub("hydrogen-fluoride"), 288.15), "WATER", "HF boils near 19.5 °C");
  assert.equal(at25("ethanol"), "WATER");
  assert.equal(at25("dimethyl-ether"), "GAS", "same formula as ethanol, different substance");
  for (let T = 0.5; T < 4.2; T += 0.5) assert.notEqual(C.phaseAt(sub("helium"), T), "ICE", "no solid helium at 1 atm");
  assert.equal(C.phaseAt(sub("helium"), 1, 3e6), "ICE", "solid helium under 30 bar");
  assert.equal(C.phaseAt1atm(sub("carbon-dioxide"), 200), "GAS", "CO2 skips WATER at 1 atm");
  assert.equal(C.phaseAt(sub("carbon-dioxide"), 298.15, 7e6), "WATER", "liquid CO2 under pressure");
  assert.equal(C.phaseAt(sub("carbon-dioxide"), 310, 8e6), "supercritical");
  assert.equal(C.phaseAt(sub("uranium-hexafluoride"), 340, 3e5), "WATER", "liquid UF6 above its triple point");
  assert.equal(C.phaseAt1atm(sub("uranium-hexafluoride"), 330), "GAS", "UF6 sublimes at 56.5 °C");
  assert.equal(C.phaseAt1atm(sub("copper-sulfate-pentahydrate"), 340), "decomposed");
  assert.equal(C.phaseAt(sub("xenon-difluoride"), 298.15, 1e6), "unknown", "no data off 1 atm means no answer");
  const failures = data.phaseTestPoints.rows.filter(([id, T, p, expected]) => C.phaseAt(sub(id), T, p) !== expected);
  assert.deepEqual(failures, [], "every CoolProp check point agrees");
  assert.ok(data.phaseTestPoints.rows.length >= 150);
});

test("composition: eligibility is the AND of the constituents, and composition never adds a phase", () => {
  const water = body("H2O");
  assert.equal(water.eligibility.water, "D✗", "Hydrogen is listed NAB only, so water cannot be Witness-Only");
  assert.equal(water.eligibility.ice, "U", "Oxygen has no stated phase eligibility");
  assert.equal(water.tier, "Moderate");
  for (const s of data.registry) assert.equal(body(s.formula).eligibility.gas, "D✗", `${s.formula}: no compound is Sovereign-Acting eligible`);
  const methane = body("CH4");
  assert.equal(methane.eligibility.ice, "D");
  const salt = body("NaCl");
  assert.equal(salt.tier, "Elevated", "the highest constituent tier wins");
  assert.equal(salt.density, "High");
  assert.deepEqual(salt.eligibility, { ice: "D", water: "U", gas: "D✗" });
  for (const f of ["UF6", "UO2", "UF4"]) {
    const b = body(f);
    assert.equal(b.tier, "Prohibited");
    assert.equal(b.routing, "none");
    assert.ok(b.flags.includes("prohibited"));
  }
  assert.ok(body("XeF2").flags.includes("noble-bonded"));
  assert.ok(body("Fe(CO)5").flags.includes("iron-carbon"));
  assert.deepEqual(body("C2H5OH"), body("CH3OCH3"), "the governance reading depends on the formula alone");
  assert.equal(body("CrMnFeCoNi").elevated.length, 5);
  assert.equal(body("CrMnFeCoNi").eligibility.ice, "D");
  assert.equal(body("CrMnFeCoNiCu").eligibility.ice, "D✗", "a sixth Elevated class breaks the shared limit");
  assert.equal(body("He").routing, "Level 2");
  assert.equal(body("H2O").routing, "Level 3");
  assert.equal(C.eligibilityAnd(["D", "D✗ nominal"]), "D✗");
});

test("reactions conserve every constituent, and an unbalanced one is caught", () => {
  for (const r of data.reactions) {
    const parsed = C.parseReaction(r.equation);
    assert.ok(parsed.ok, r.equation);
    assert.equal(C.balance(parsed).balanced, r.balanced, r.equation);
  }
  assert.deepEqual(C.balance(C.parseReaction("H2 + O2 -> H2O")).differences, { O: -1 });
  assert.equal(C.balance(C.parseReaction("CaCO3 → CaO + CO2")).balanced, true);
  assert.equal(C.parseReaction("H2 + O2").ok, false);
});

test("the evidence script reproduces Appendix E and fails closed", () => {
  assert.equal(evidence.compounds.pass, true);
  assert.ok(Object.values(evidence.compounds.checks).every(Boolean));
  assert.equal(evidence.compounds.data.canonicalSha256, data.canonicalSha256);
  assert.equal(evidence.ambient.wmm.pass, true);
});
