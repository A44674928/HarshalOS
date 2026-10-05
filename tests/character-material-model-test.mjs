/* Pure rules and local storage behavior for Character Materials. */
import assert from "node:assert/strict";
import test from "node:test";
import "../js/nab-sectors.js";
import "../js/character-material-model.js";

const Model = globalThis.CharacterMaterialModel;

const material = (materialId, overrides = {}) => ({
  materialId,
  formula: `Formula-${materialId}`,
  elements: ["Si"],
  density: 2.3,
  bandGap: 0.6,
  energyAboveHull: 0,
  bulkModulusGpa: 100,
  shearModulusGpa: 60,
  isMetal: false,
  isStable: true,
  ...overrides
});

const character = (overrides = {}) => ({
  id: "character-one",
  name: "Test character",
  discId: "stocks",
  role: "Reference role",
  realWorldNote: "User-provided note",
  pdh: { status: "VALID", declaredPhase: "NAB", detectedPhase: "NAB", id: "PDH-TEST" },
  constraints: { densityMin: 2, densityMax: 3, energyAboveHullMax: 0.05, electricalClass: "nonmetal" },
  ...overrides
});

class MemoryStorage {
  #data = new Map();
  getItem(key) { return this.#data.has(key) ? this.#data.get(key) : null; }
  setItem(key, value) { this.#data.set(key, String(value)); }
  removeItem(key) { this.#data.delete(key); }
}

test("Materials Project normalization keeps a fixed, bounded, provenance-aware projection", () => {
  const normalized = Model.normalizeMaterial(material("MP-149", {
    elements: ["Si", "O", "<script>"],
    formula: "<img src=x onerror=alert(1)>",
    origins: [{ name: "structure", taskId: "mp-1234567" }, { name: "bad", taskId: "javascript:alert(1)" }],
    density: "2.329",
    bulkModulusGpa: Infinity,
    warnings: ["ok", 42, "<tag>"],
    recordUrl: "javascript:alert(1)"
  }), { licenseFilter: "BY-C", retrievedAt: "2026-10-04T12:00:00Z", savedAt: "2026-10-04T12:01:00Z" });
  assert.equal(normalized.materialId, "mp-149");
  assert.equal(normalized.formula, "<img src=x onerror=alert(1)>", "untrusted formula remains plain text for the DOM to escape");
  assert.deepEqual(normalized.elements, ["Si", "O"]);
  assert.equal(normalized.density, 2.329);
  assert.equal(normalized.bulkModulusGpa, null, "invalid numeric values are missing, never coerced");
  assert.deepEqual(normalized.origins, [{ name: "structure", taskId: "mp-1234567" }, { name: "bad", taskId: "" }]);
  assert.deepEqual(normalized.warnings, ["ok", "<tag>"]);
  assert.equal(normalized.licenseFilter, "BY-C");
  assert.equal(normalized.retrievedAt, "2026-10-04T12:00:00Z");
  assert.equal(normalized.recordUrl, "https://next-gen.materialsproject.org/materials/mp-149");
  assert.equal(Model.normalizeMaterial(material("mp-not-an-id")), null);
  assert.equal(Model.normalizeMaterial({ materialId: "mp-149" }).licenseFilter, "unverified");
});

test("only the canonical declared phases and documented detected classes are accepted", () => {
  assert.deepEqual(Model.DECLARED_PHASES, ["NAB", "CWO", "GSRB"]);
  assert.deepEqual(Model.DETECTED_PHASES, ["NAB", "CWO", "NAB-Constrained", "GSRB", "AMBIGUOUS", "INCOHERENT"]);
  const normalized = Model.normalizeCharacter(character({ pdh: { status: "VALID", declaredPhase: "NAB-Constrained", detectedPhase: "NAB" } }));
  assert.equal(normalized.pdh.declaredPhase, null, "NAB-Constrained is detected-only, not a declared PDH phase");
  assert.equal(normalized.pdh.detectedPhase, "NAB");
});

test("PDH is a local review gate and phase mismatch never masquerades as material evidence", () => {
  const aligned = Model.assessPdh(character());
  assert.equal(aligned.requiresReview, false);
  assert.equal(aligned.code, "operator-reported");
  assert.match(aligned.label, /not verified here/i);
  assert.match(aligned.disclaimer, /does not validate a signature/i);

  const cases = [
    [{ status: "MISSING", declaredPhase: "NAB" }, "missing"],
    [{ status: "INVALID", declaredPhase: "CWO" }, "invalid"],
    [{ status: "VALID", declaredPhase: "NAB", detectedPhase: "GSRB" }, "phase-mismatch"],
    [{ status: "VALID", declaredPhase: "GSRB", detectedPhase: "INCOHERENT" }, "diagnostic-review"]
  ];
  for (const [pdh, code] of cases) {
    const result = Model.assessPdh({ pdh });
    assert.equal(result.code, code);
    assert.equal(result.requiresReview, true);
  }
});

test("physical candidate matching uses explicit inclusive bounds and reports unknown fields separately", () => {
  const profile = character();
  const exact = material("mp-10", { density: 2, energyAboveHull: 0.05, isMetal: false });
  const incomplete = material("mp-11", { density: 2.4, energyAboveHull: null, isMetal: false });
  const outside = material("mp-12", { density: 3.01, energyAboveHull: 0.01, isMetal: false });
  const result = Model.rankCandidates(profile, [outside, incomplete, exact]);
  assert.equal(result.criteria, 4);
  assert.equal(result.candidates[0].material.materialId, "mp-10");
  assert.equal(result.candidates[0].status, "match");
  assert.equal(result.candidates[0].passed, 4);
  assert.equal(result.candidates[1].material.materialId, "mp-11");
  assert.equal(result.candidates[1].status, "incomplete");
  assert.equal(result.candidates[1].unknown, 1);
  assert.equal(result.candidates[2].status, "outside");
  assert.equal(result.candidates[2].failed, 1);
});

test("perfect-fit ties use MP ID, not an unrequested stability or PDH-phase preference", () => {
  const profile = character({ constraints: { densityMin: 2, densityMax: 3 } });
  const lowerHullButLaterId = material("mp-2", { energyAboveHull: 0 });
  const earlierId = material("mp-1", { energyAboveHull: 0.5 });
  const result = Model.rankCandidates(profile, [lowerHullButLaterId, earlierId]);
  assert.deepEqual(result.candidates.map(candidate => candidate.material.materialId), ["mp-1", "mp-2"]);
  assert.ok(result.candidates.every(candidate => candidate.status === "match"));
});

test("the model refuses to manufacture a ranking when no measurable requirements are set", () => {
  const result = Model.rankCandidates(character({ constraints: {} }), [material("mp-1")]);
  assert.equal(result.ok, true);
  assert.equal(result.code, "no-criteria");
  assert.equal(result.candidates.length, 0);
});

test("reversed physical ranges are rejected instead of silently changed", () => {
  const constraints = Model.normalizeConstraints({ densityMin: 5, densityMax: 2 });
  assert.equal(constraints.ok, false);
  assert.match(constraints.error, /minimum cannot exceed (?:its )?maximum/i);
  assert.equal(Model.normalizeCharacter(character({ constraints: { bulkModulusMin: 101, bulkModulusMax: 100 } })), null);
});

test("assignment requires all reported physical criteria and an internally aligned operator-supplied PDH", () => {
  const profile = character();
  const pass = material("mp-1");
  assert.equal(Model.assignmentCheck(profile, pass).ok, true);
  assert.equal(Model.assignmentCheck(character({ pdh: { status: "MISSING", declaredPhase: null } }), pass).code, "pdh-review");
  assert.equal(Model.assignmentCheck(character({ pdh: { status: "VALID", declaredPhase: "NAB", detectedPhase: "CWO" } }), pass).code, "pdh-review");
  assert.match(Model.assignmentCheck(profile, material("mp-2", { density: null })).code, /material-incomplete/);
  assert.equal(Model.assignmentCheck(profile, material("mp-3", { density: 4 })).code, "material-outside");
});

test("library upserts by MP ID, stays local, and refuses malformed provider identifiers", () => {
  const storage = new MemoryStorage();
  const first = Model.saveMaterial(storage, material("mp-149"), { licenseFilter: "BY-C" });
  assert.equal(first.code, "added");
  assert.equal(Model.readMaterials(storage).length, 1);
  const second = Model.saveMaterial(storage, material("MP-149", { density: 2.4 }), { licenseFilter: "BY-C" });
  assert.equal(second.code, "updated");
  assert.equal(Model.readMaterials(storage).length, 1);
  assert.equal(Model.readMaterials(storage)[0].density, 2.4);
  assert.equal(Model.saveMaterial(storage, material("mp-invalid")).ok, false);
  assert.equal(storage.getItem(Model.STORAGE_KEYS.materials).includes("recordUrl"), true);
});

test("character storage preserves assignment IDs and sanitizes bounded profile text", () => {
  const storage = new MemoryStorage();
  const saved = Model.saveCharacter(storage, character({ name: "  Copper Sentinel  ", role: "heat shield", realWorldNote: "<b>context</b>" }));
  assert.equal(saved.ok, true);
  assert.equal(saved.character.name, "Copper Sentinel");
  assert.equal(saved.character.role, "heat shield");
  assert.equal(saved.character.realWorldNote, "<b>context</b>", "renderers must keep the note as text");
  const assigned = Model.saveCharacter(storage, { ...saved.character, materialId: "mp-149" });
  assert.equal(assigned.character.materialId, "mp-149");
  assert.equal(Model.readCharacters(storage)[0].materialId, "mp-149");
  assert.equal(Model.removeCharacter(storage, saved.character.id), true);
  assert.equal(Model.readCharacters(storage).length, 0);
});

test("two or more Disc components normalize relative shares and calculate only an ideal density reference", () => {
  const chars = [
    Model.normalizeCharacter(character({ id: "char-a", discId: "stocks", materialId: "mp-100" })),
    Model.normalizeCharacter(character({ id: "char-b", discId: "fx", materialId: "mp-101", pdh: { status: "VALID", declaredPhase: "CWO", detectedPhase: "CWO" } }))
  ];
  const records = [
    Model.normalizeMaterial(material("mp-100", { density: 2 })),
    Model.normalizeMaterial(material("mp-101", { density: 8 }))
  ];
  const composition = Model.composeSpheroid([
    { discId: "stocks", characterId: "char-a", sharePercent: 1 },
    { discId: "fx", characterId: "char-b", sharePercent: 3 }
  ], chars, records);
  assert.equal(composition.ok, true);
  assert.equal(composition.components.length, 2);
  assert.equal(composition.components[0].volumeFraction, 0.25);
  assert.equal(composition.components[1].volumeFraction, 0.75);
  assert.equal(composition.densityEstimate, 6.5);
  assert.match(composition.densityAssumption, /excludes porosity/i);
  assert.match(composition.shape, /visual composition/i);
  assert.equal(composition.components[0].formula, "Formula-mp-100");
});

test("spheroid composition refuses a single Disc, duplicate Disc, and unresolved material", () => {
  const chars = [
    Model.normalizeCharacter(character({ id: "char-a", discId: "stocks", materialId: "mp-100" })),
    Model.normalizeCharacter(character({ id: "char-b", discId: "stocks", materialId: "mp-101" })),
    Model.normalizeCharacter(character({ id: "char-c", discId: "fx", materialId: null }))
  ];
  const records = [Model.normalizeMaterial(material("mp-100")), Model.normalizeMaterial(material("mp-101"))];
  assert.equal(Model.composeSpheroid([{ discId: "stocks", characterId: "char-a", sharePercent: 50 }], chars, records).code, "disc-count");
  assert.equal(Model.composeSpheroid([
    { discId: "stocks", characterId: "char-a", sharePercent: 50 },
    { discId: "stocks", characterId: "char-b", sharePercent: 50 }
  ], chars, records).code, "duplicate-disc");
  assert.equal(Model.composeSpheroid([
    { discId: "stocks", characterId: "char-a", sharePercent: 50 },
    { discId: "fx", characterId: "char-c", sharePercent: 50 }
  ], chars, records).code, "unassigned-character");
});

test("an absent constituent density suppresses the idealized composite density estimate", () => {
  const chars = [
    Model.normalizeCharacter(character({ id: "char-a", discId: "stocks", materialId: "mp-100" })),
    Model.normalizeCharacter(character({ id: "char-b", discId: "fx", materialId: "mp-101" }))
  ];
  const records = [Model.normalizeMaterial(material("mp-100", { density: 2 })), Model.normalizeMaterial(material("mp-101", { density: null }))];
  const composition = Model.composeSpheroid([
    { discId: "stocks", characterId: "char-a", sharePercent: 50 },
    { discId: "fx", characterId: "char-b", sharePercent: 50 }
  ], chars, records);
  assert.equal(composition.ok, true);
  assert.equal(composition.densityEstimate, null);
});

test("saved spheroid designs persist only IDs and share weights in local storage", () => {
  const storage = new MemoryStorage();
  const chars = [
    Model.normalizeCharacter(character({ id: "char-a", discId: "stocks", materialId: "mp-100" })),
    Model.normalizeCharacter(character({ id: "char-b", discId: "fx", materialId: "mp-101" }))
  ];
  const records = [Model.normalizeMaterial(material("mp-100")), Model.normalizeMaterial(material("mp-101"))];
  const result = Model.saveSpheroid(storage, "Two Disc", [
    { discId: "stocks", characterId: "char-a", sharePercent: 40 },
    { discId: "fx", characterId: "char-b", sharePercent: 60 }
  ], chars, records);
  assert.equal(result.ok, true);
  assert.equal(result.spheroid.name, "Two Disc");
  assert.equal(Model.readSpheroids(storage).length, 1);
  assert.equal(Model.readSpheroids(storage)[0].components[1].sharePercent, 60);
});
