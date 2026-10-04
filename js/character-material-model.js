/* Character ↔ material assignment model.
   Pure, browser-safe rules shared by the model UI and tests. PDH is a review/context
   gate; it is never treated as a materials property or as proof of authenticity.
   Material measurements are imported from the read-only Materials Project summary. */
"use strict";

(() => {
  const SCHEMA = "harshalos-character-material-model-v1";
  const MATERIAL_SCHEMA = "harshalos-character-material-v1";
  const STORAGE_KEYS = Object.freeze({
    materials: "harshalos.character-materials.library.v1",
    characters: "harshalos.character-materials.characters.v1",
    spheroids: "harshalos.character-materials.spheroids.v1"
  });
  const MAX_MATERIALS = 200;
  const MAX_CHARACTERS = 100;
  const MAX_SPHEROIDS = 100;
  const DISC_IDS = Object.freeze(["stocks", "fx", "crypto", "commodities"]);
  const DECLARED_PHASES = Object.freeze(["NAB", "CWO", "GSRB"]);
  const DETECTED_PHASES = Object.freeze(["NAB", "CWO", "NAB-Constrained", "GSRB", "AMBIGUOUS", "INCOHERENT"]);
  const PDH_STATUSES = Object.freeze(["VALID", "INVALID", "MISSING"]);

  const MATERIAL_PROPERTIES = Object.freeze([
    Object.freeze({ key: "density", label: "Density", unit: "g/cm³", minKey: "densityMin", maxKey: "densityMax", max: 1_000_000 }),
    Object.freeze({ key: "bulkModulusGpa", label: "Bulk modulus", unit: "GPa", minKey: "bulkModulusMin", maxKey: "bulkModulusMax", max: 1_000_000 }),
    Object.freeze({ key: "shearModulusGpa", label: "Shear modulus", unit: "GPa", minKey: "shearModulusMin", maxKey: "shearModulusMax", max: 1_000_000 }),
    Object.freeze({ key: "bandGap", label: "Band gap", unit: "eV", minKey: "bandGapMin", maxKey: "bandGapMax", max: 10_000 })
  ]);

  const text = (value, max = 160) => typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max)
    : "";
  const finite = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
  const numberOrNull = (value, min = -1_000_000, max = 1_000_000) => {
    if (!finite(value)) return null;
    const parsed = Number(value);
    return parsed >= min && parsed <= max ? parsed : null;
  };
  const boolOrNull = value => typeof value === "boolean" ? value : null;
  const enumValue = (value, choices, fallback = null) => choices.includes(value) ? value : fallback;
  const validMaterialId = value => typeof value === "string" && /^mp-(?:\d+|[a-z]{8})$/i.test(value);
  const validId = value => typeof value === "string" && /^[a-z0-9][a-z0-9._:-]{0,95}$/i.test(value);
  const nowIso = value => {
    const date = value instanceof Date ? value : new Date(value ?? Date.now());
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  };

  function normalizeMaterial(raw, metadata = {}) {
    if (!raw || typeof raw !== "object" || !validMaterialId(raw.materialId)) return null;
    const id = raw.materialId.toLowerCase();
    const elements = Array.isArray(raw.elements)
      ? [...new Set(raw.elements.filter(value => typeof value === "string" && /^[A-Z][a-z]?$/.test(value)))].slice(0, 40)
      : [];
    const symmetry = raw.symmetry && typeof raw.symmetry === "object" ? raw.symmetry : {};
    const origins = Array.isArray(raw.origins)
      ? raw.origins.slice(0, 12).map(origin => ({
        name: text(origin?.name, 80),
        taskId: typeof origin?.taskId === "string" && validMaterialId(origin.taskId) ? origin.taskId.toLowerCase() : ""
      })).filter(origin => origin.name || origin.taskId)
      : [];
    const warnings = Array.isArray(raw.warnings) ? raw.warnings.filter(value => typeof value === "string").slice(0, 8).map(value => text(value, 240)) : [];
    const availableProperties = Array.isArray(raw.availableProperties)
      ? [...new Set(raw.availableProperties.filter(value => typeof value === "string").slice(0, 20).map(value => text(value, 40)))]
      : [];
    const retrievedAt = text(metadata.retrievedAt || raw.retrievedAt, 48);
    const updatedAt = text(raw.lastUpdated, 48);
    return Object.freeze({
      schema: MATERIAL_SCHEMA,
      materialId: id,
      formula: text(raw.formula, 80) || "Formula not reported",
      elements: Object.freeze(elements),
      elementCount: numberOrNull(raw.elementCount, 0, 500),
      siteCount: numberOrNull(raw.siteCount, 0, 100_000),
      density: numberOrNull(raw.density, 0, 1_000_000),
      cellVolume: numberOrNull(raw.cellVolume, 0, 1_000_000_000),
      symmetry: Object.freeze({
        crystalSystem: text(symmetry.crystalSystem, 48),
        spaceGroup: text(symmetry.spaceGroup, 48),
        spaceGroupNumber: numberOrNull(symmetry.spaceGroupNumber, 1, 230),
        pointGroup: text(symmetry.pointGroup, 48)
      }),
      bandGap: numberOrNull(raw.bandGap, 0, 10_000),
      energyAboveHull: numberOrNull(raw.energyAboveHull, -10_000, 10_000),
      formationEnergyPerAtom: numberOrNull(raw.formationEnergyPerAtom, -10_000, 10_000),
      bulkModulusGpa: numberOrNull(raw.bulkModulusGpa, 0, 1_000_000),
      shearModulusGpa: numberOrNull(raw.shearModulusGpa, 0, 1_000_000),
      poissonRatio: numberOrNull(raw.poissonRatio, -10, 10),
      universalAnisotropy: numberOrNull(raw.universalAnisotropy, -10_000, 10_000),
      isStable: boolOrNull(raw.isStable),
      isDirectGap: boolOrNull(raw.isDirectGap),
      isMetal: boolOrNull(raw.isMetal),
      theoretical: boolOrNull(raw.theoretical),
      deprecated: boolOrNull(raw.deprecated),
      lastUpdated: updatedAt || null,
      retrievedAt: retrievedAt || null,
      licenseFilter: metadata.licenseFilter === "BY-C" ? "BY-C" : "unverified",
      availableProperties: Object.freeze(availableProperties),
      warnings: Object.freeze(warnings),
      origins: Object.freeze(origins),
      recordUrl: `https://next-gen.materialsproject.org/materials/${encodeURIComponent(id)}`,
      savedAt: nowIso(metadata.savedAt)
    });
  }

  function normalizeConstraints(raw = {}) {
    const constraints = {};
    for (const property of MATERIAL_PROPERTIES) {
      constraints[property.minKey] = numberOrNull(raw[property.minKey], 0, property.max);
      constraints[property.maxKey] = numberOrNull(raw[property.maxKey], 0, property.max);
      const min = constraints[property.minKey];
      const max = constraints[property.maxKey];
      if (min !== null && max !== null && min > max) {
        return { ok: false, error: `${property.label} minimum cannot exceed its maximum.` };
      }
    }
    constraints.energyAboveHullMax = numberOrNull(raw.energyAboveHullMax, 0, 10_000);
    constraints.electricalClass = enumValue(raw.electricalClass, ["any", "metal", "nonmetal"], "any");
    return { ok: true, constraints };
  }

  function constraintCount(constraints = {}) {
    let count = 0;
    for (const property of MATERIAL_PROPERTIES) {
      if (constraints[property.minKey] !== null && constraints[property.minKey] !== undefined) count += 1;
      if (constraints[property.maxKey] !== null && constraints[property.maxKey] !== undefined && constraints[property.maxKey] !== constraints[property.minKey]) count += 1;
    }
    if (constraints.energyAboveHullMax !== null && constraints.energyAboveHullMax !== undefined) count += 1;
    if (constraints.electricalClass && constraints.electricalClass !== "any") count += 1;
    return count;
  }

  function normalizeCharacter(raw) {
    if (!raw || typeof raw !== "object") return null;
    const id = validId(raw.id) ? raw.id : "";
    const name = text(raw.name, 80);
    const discId = enumValue(raw.discId, DISC_IDS, null);
    const parsedConstraints = normalizeConstraints(raw.constraints || {});
    if (!id || !name || !discId || !parsedConstraints.ok) return null;
    const pdh = raw.pdh && typeof raw.pdh === "object" ? raw.pdh : {};
    return Object.freeze({
      schema: SCHEMA,
      id,
      name,
      discId,
      role: text(raw.role, 100),
      realWorldNote: text(raw.realWorldNote, 320),
      pdh: Object.freeze({
        id: text(pdh.id, 96),
        status: enumValue(pdh.status, PDH_STATUSES, "MISSING"),
        declaredPhase: enumValue(pdh.declaredPhase, DECLARED_PHASES, null),
        detectedPhase: enumValue(pdh.detectedPhase, DETECTED_PHASES, null),
        asOf: text(pdh.asOf, 48) || null
      }),
      constraints: Object.freeze(parsedConstraints.constraints),
      materialId: validMaterialId(raw.materialId) ? raw.materialId.toLowerCase() : null,
      updatedAt: nowIso(raw.updatedAt)
    });
  }

  function assessPdh(raw) {
    const pdh = raw?.pdh && typeof raw.pdh === "object" ? raw.pdh : {};
    const status = enumValue(pdh.status, PDH_STATUSES, "MISSING");
    const declaredPhase = enumValue(pdh.declaredPhase, DECLARED_PHASES, null);
    const detectedPhase = enumValue(pdh.detectedPhase, DETECTED_PHASES, null);
    let code = "operator-reported";
    let label = "PDH VALID · operator-reported, not verified here";
    let requiresReview = false;
    if (status === "MISSING" || !declaredPhase) {
      code = "missing";
      label = "PDH missing or declared phase not supplied";
      requiresReview = true;
    } else if (status === "INVALID") {
      code = "invalid";
      label = "PDH marked invalid · review required";
      requiresReview = true;
    } else if (detectedPhase && detectedPhase !== declaredPhase) {
      code = detectedPhase === "AMBIGUOUS" || detectedPhase === "INCOHERENT" ? "diagnostic-review" : "phase-mismatch";
      label = `Declared ${declaredPhase} / detected ${detectedPhase} · review required`;
      requiresReview = true;
    }
    return Object.freeze({
      code,
      label,
      requiresReview,
      declaredPhase,
      detectedPhase,
      status,
      disclaimer: "PDH fields are local operator annotations; this model does not validate a signature, freshness, or Ground-0 evidence."
    });
  }

  function evaluateMaterial(character, material) {
    const constraints = character?.constraints || {};
    const checks = [];
    for (const property of MATERIAL_PROPERTIES) {
      const value = numberOrNull(material?.[property.key], 0, property.max);
      const min = constraints[property.minKey] ?? null;
      const max = constraints[property.maxKey] ?? null;
      if (min !== null) checks.push(Object.freeze({
        key: property.minKey, label: `${property.label} minimum`, unit: property.unit, actual: value,
        threshold: min, result: value === null ? "unknown" : value >= min ? "pass" : "fail"
      }));
      if (max !== null && max !== min) checks.push(Object.freeze({
        key: property.maxKey, label: `${property.label} maximum`, unit: property.unit, actual: value,
        threshold: max, result: value === null ? "unknown" : value <= max ? "pass" : "fail"
      }));
    }
    const maxHull = constraints.energyAboveHullMax ?? null;
    if (maxHull !== null) {
      const value = numberOrNull(material?.energyAboveHull, -10_000, 10_000);
      checks.push(Object.freeze({
        key: "energyAboveHullMax", label: "Energy above hull maximum", unit: "eV/atom", actual: value,
        threshold: maxHull, result: value === null ? "unknown" : value <= maxHull ? "pass" : "fail"
      }));
    }
    const electricalClass = constraints.electricalClass || "any";
    if (electricalClass !== "any") {
      const value = boolOrNull(material?.isMetal);
      checks.push(Object.freeze({
        key: "electricalClass", label: "Calculated metallic classification", unit: "", actual: value,
        threshold: electricalClass === "metal" ? "metal" : "not metal",
        result: value === null ? "unknown" : value === (electricalClass === "metal") ? "pass" : "fail"
      }));
    }
    const passed = checks.filter(check => check.result === "pass").length;
    const failed = checks.filter(check => check.result === "fail").length;
    const unknown = checks.filter(check => check.result === "unknown").length;
    const status = !checks.length ? "unconstrained" : failed ? "outside" : unknown ? "incomplete" : "match";
    return Object.freeze({
      material,
      checks: Object.freeze(checks),
      status,
      passed,
      failed,
      unknown,
      criteria: checks.length,
      known: passed + failed,
      knownFitPercent: checks.length ? Math.round((passed / checks.length) * 100) : null,
      dataCoveragePercent: checks.length ? Math.round(((passed + failed) / checks.length) * 100) : null
    });
  }

  function rankCandidates(character, materials) {
    const normalized = normalizeCharacter(character);
    if (!normalized) return Object.freeze({ ok: false, code: "invalid-character", candidates: Object.freeze([]), pdh: assessPdh(character) });
    const criteria = constraintCount(normalized.constraints);
    const pdh = assessPdh(normalized);
    if (criteria === 0) {
      return Object.freeze({ ok: true, code: "no-criteria", criteria, pdh, candidates: Object.freeze([]) });
    }
    const candidates = (Array.isArray(materials) ? materials : [])
      .filter(material => material && validMaterialId(material.materialId))
      .map(material => evaluateMaterial(normalized, material))
      .sort((left, right) => {
        const statusOrder = { match: 0, incomplete: 1, outside: 2, unconstrained: 3 };
        return statusOrder[left.status] - statusOrder[right.status]
          || right.passed - left.passed
          || right.known - left.known
          || left.material.materialId.localeCompare(right.material.materialId);
      });
    return Object.freeze({ ok: true, code: "ranked", criteria, pdh, candidates: Object.freeze(candidates) });
  }

  function assignmentCheck(character, material) {
    const normalized = normalizeCharacter(character);
    if (!normalized) return Object.freeze({ ok: false, code: "invalid-character", reason: "Save a complete character profile first." });
    const pdh = assessPdh(normalized);
    if (pdh.requiresReview) return Object.freeze({ ok: false, code: "pdh-review", reason: pdh.label, pdh });
    const evaluation = evaluateMaterial(normalized, material);
    if (evaluation.status !== "match") {
      return Object.freeze({ ok: false, code: `material-${evaluation.status}`, reason: "A material can be assigned only when every user-set physical criterion has a reported value and is satisfied.", evaluation, pdh });
    }
    return Object.freeze({ ok: true, code: "ready", reason: "All reported criteria match and the operator-reported PDH is internally aligned. Neither condition is independently verified by this app.", evaluation, pdh });
  }

  function makeId(prefix) {
    const random = Math.random().toString(36).slice(2, 10);
    return `${prefix}-${Date.now().toString(36)}-${random}`;
  }

  function readArray(storage, key, limit, normalize) {
    if (!storage) return [];
    try {
      const parsed = JSON.parse(storage.getItem(key) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.slice(0, limit).map(normalize).filter(Boolean);
    } catch { return []; }
  }

  function writeArray(storage, key, values) {
    if (!storage) return false;
    try { storage.setItem(key, JSON.stringify(values)); return true; }
    catch { return false; }
  }

  function readMaterials(storage) {
    return readArray(storage, STORAGE_KEYS.materials, MAX_MATERIALS, value => normalizeMaterial(value, value));
  }
  function readCharacters(storage) {
    return readArray(storage, STORAGE_KEYS.characters, MAX_CHARACTERS, normalizeCharacter);
  }
  function readSpheroids(storage) {
    return readArray(storage, STORAGE_KEYS.spheroids, MAX_SPHEROIDS, normalizeSpheroid);
  }

  function saveMaterial(storage, raw, metadata = {}) {
    const material = normalizeMaterial(raw, metadata);
    if (!material) return Object.freeze({ ok: false, code: "invalid-material", material: null });
    const current = readMaterials(storage);
    const existing = current.findIndex(item => item.materialId === material.materialId);
    if (existing >= 0) current.splice(existing, 1);
    else if (current.length >= MAX_MATERIALS) return Object.freeze({ ok: false, code: "library-full", material: null });
    current.unshift(material);
    if (!writeArray(storage, STORAGE_KEYS.materials, current)) return Object.freeze({ ok: false, code: "storage-unavailable", material: null });
    return Object.freeze({ ok: true, code: existing >= 0 ? "updated" : "added", material });
  }

  function removeMaterial(storage, materialId) {
    const current = readMaterials(storage);
    const next = current.filter(item => item.materialId !== String(materialId || "").toLowerCase());
    if (next.length === current.length) return false;
    return writeArray(storage, STORAGE_KEYS.materials, next);
  }

  function saveCharacter(storage, raw) {
    const input = { ...raw, id: validId(raw?.id) ? raw.id : makeId("character"), updatedAt: new Date().toISOString() };
    const character = normalizeCharacter(input);
    if (!character) return Object.freeze({ ok: false, code: "invalid-character", character: null });
    const current = readCharacters(storage);
    const existing = current.findIndex(item => item.id === character.id);
    if (existing >= 0) current.splice(existing, 1);
    else if (current.length >= MAX_CHARACTERS) return Object.freeze({ ok: false, code: "character-limit", character: null });
    current.unshift(character);
    if (!writeArray(storage, STORAGE_KEYS.characters, current)) return Object.freeze({ ok: false, code: "storage-unavailable", character: null });
    return Object.freeze({ ok: true, code: existing >= 0 ? "updated" : "added", character });
  }

  function removeCharacter(storage, characterId) {
    const current = readCharacters(storage);
    const next = current.filter(item => item.id !== String(characterId || ""));
    if (next.length === current.length) return false;
    return writeArray(storage, STORAGE_KEYS.characters, next);
  }

  function normalizeSpheroid(raw) {
    if (!raw || typeof raw !== "object" || !validId(raw.id)) return null;
    const components = Array.isArray(raw.components) ? raw.components.slice(0, 4).map(component => ({
      discId: enumValue(component?.discId, DISC_IDS, null),
      characterId: validId(component?.characterId) ? component.characterId : "",
      materialId: validMaterialId(component?.materialId) ? component.materialId.toLowerCase() : "",
      sharePercent: numberOrNull(component?.sharePercent, 0.01, 100)
    })) : [];
    if (components.length < 2 || components.some(component => !component.discId || !component.characterId || !component.materialId || component.sharePercent === null)) return null;
    if (new Set(components.map(component => component.discId)).size !== components.length) return null;
    return Object.freeze({
      schema: SCHEMA,
      id: raw.id,
      name: text(raw.name, 80) || "Multi-Disc spheroid",
      components: Object.freeze(components.map(component => Object.freeze(component))),
      createdAt: nowIso(raw.createdAt)
    });
  }

  function composeSpheroid(rawComponents, characters, materials) {
    const selected = Array.isArray(rawComponents) ? rawComponents.filter(Boolean) : [];
    if (selected.length < 2 || selected.length > 4) return Object.freeze({ ok: false, code: "disc-count", reason: "Select between two and four distinct Discs." });
    const byCharacter = new Map((Array.isArray(characters) ? characters : []).map(character => [character.id, character]));
    const byMaterial = new Map((Array.isArray(materials) ? materials : [])
      .filter(material => material && validMaterialId(material.materialId))
      .map(material => [material.materialId.toLowerCase(), material]));
    const seenDiscs = new Set();
    const components = [];
    for (const item of selected) {
      const discId = enumValue(item.discId, DISC_IDS, null);
      const character = byCharacter.get(item.characterId);
      const sharePercent = numberOrNull(item.sharePercent, 0.01, 100);
      if (!discId || seenDiscs.has(discId)) return Object.freeze({ ok: false, code: "duplicate-disc", reason: "Each Disc can contribute only once to a spheroid." });
      seenDiscs.add(discId);
      if (!character || character.discId !== discId || !character.materialId) return Object.freeze({ ok: false, code: "unassigned-character", reason: "Every selected Disc needs a saved character with an assigned material." });
      const material = byMaterial.get(character.materialId);
      if (!material) return Object.freeze({ ok: false, code: "missing-material", reason: `${character.name} refers to a material not present in the local library.` });
      if (sharePercent === null) return Object.freeze({ ok: false, code: "invalid-share", reason: "Every Disc needs a positive volume-share weight from 0.01% to 100%." });
      components.push({ discId, character, material, sharePercent });
    }
    const totalShare = components.reduce((sum, component) => sum + component.sharePercent, 0);
    const normalizedComponents = components.map(component => Object.freeze({
      discId: component.discId,
      characterId: component.character.id,
      characterName: component.character.name,
      materialId: component.material.materialId,
      formula: component.material.formula,
      density: component.material.density,
      sharePercent: component.sharePercent,
      volumeFraction: component.sharePercent / totalShare
    }));
    const allDensitiesReported = normalizedComponents.every(component => Number.isFinite(component.density));
    const densityEstimate = allDensitiesReported
      ? normalizedComponents.reduce((sum, component) => sum + component.volumeFraction * component.density, 0)
      : null;
    return Object.freeze({
      ok: true,
      code: "composed",
      components: Object.freeze(normalizedComponents),
      totalShare,
      densityEstimate,
      densityMethod: "Ideal volume-weighted reference: sum(volume fraction × reported constituent density).",
      densityAssumption: "Not a composite-material prediction. Assumes the entered fractions represent final volumes and excludes porosity, interfaces, reactions, phase changes, geometry, orientation, and processing effects.",
      shape: "Spheroid preview is a visual composition of bounded Disc slices, not a manufactured or validated object."
    });
  }

  function saveSpheroid(storage, name, rawComponents, characters, materials) {
    const composition = composeSpheroid(rawComponents, characters, materials);
    if (!composition.ok) return composition;
    const raw = {
      id: makeId("spheroid"),
      name: text(name, 80) || "Multi-Disc spheroid",
      createdAt: new Date().toISOString(),
      components: composition.components.map(component => ({
        discId: component.discId,
        characterId: component.characterId,
        materialId: component.materialId,
        sharePercent: component.sharePercent
      }))
    };
    const spheroid = normalizeSpheroid(raw);
    const current = readSpheroids(storage);
    if (current.length >= MAX_SPHEROIDS) return Object.freeze({ ok: false, code: "spheroid-limit", reason: "The local spheroid shelf is full." });
    current.unshift(spheroid);
    if (!writeArray(storage, STORAGE_KEYS.spheroids, current)) return Object.freeze({ ok: false, code: "storage-unavailable", reason: "Browser storage is unavailable; the spheroid was not saved." });
    return Object.freeze({ ...composition, spheroid });
  }

  const api = Object.freeze({
    SCHEMA,
    MATERIAL_SCHEMA,
    STORAGE_KEYS,
    DISC_IDS,
    DECLARED_PHASES,
    DETECTED_PHASES,
    PDH_STATUSES,
    MATERIAL_PROPERTIES,
    MAX_MATERIALS,
    MAX_CHARACTERS,
    MAX_SPHEROIDS,
    validMaterialId,
    normalizeMaterial,
    normalizeConstraints,
    constraintCount,
    normalizeCharacter,
    assessPdh,
    evaluateMaterial,
    rankCandidates,
    assignmentCheck,
    readMaterials,
    readCharacters,
    readSpheroids,
    saveMaterial,
    removeMaterial,
    saveCharacter,
    removeCharacter,
    normalizeSpheroid,
    composeSpheroid,
    saveSpheroid
  });
  Object.defineProperty(globalThis, "CharacterMaterialModel", { configurable: true, enumerable: false, value: api });
})();
