/* Browser wiring for Character Materials, using only a stubbed Materials Project route. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Window } from "happy-dom";

const modelSource = readFileSync(new URL("../js/character-material-model.js", import.meta.url), "utf8");
const catalogSource = readFileSync(new URL("../js/characters-disc-catalog.js", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../js/apps-character-materials.js", import.meta.url), "utf8");
const flush = async () => { for (let turn = 0; turn < 30; turn++) await Promise.resolve(); };

function material(materialId, overrides = {}) {
  return {
    materialId,
    formula: materialId === "mp-149" ? "Si" : "Cu",
    elements: materialId === "mp-149" ? ["Si"] : ["Cu"],
    elementCount: 1,
    siteCount: 2,
    density: materialId === "mp-149" ? 2.329 : 8.96,
    cellVolume: 40,
    symmetry: { crystalSystem: "cubic", spaceGroup: "Fm-3m", spaceGroupNumber: 225, pointGroup: "m-3m" },
    bandGap: materialId === "mp-149" ? 0.61 : 0,
    energyAboveHull: 0,
    formationEnergyPerAtom: 0,
    bulkModulusGpa: 99.5,
    shearModulusGpa: 62.5,
    poissonRatio: 0.22,
    universalAnisotropy: 0.1,
    isStable: true,
    isDirectGap: false,
    isMetal: materialId !== "mp-149",
    theoretical: false,
    deprecated: false,
    lastUpdated: "2026-10-01T00:00:00Z",
    availableProperties: ["elasticity"],
    warnings: [],
    origins: [{ name: "summary", taskId: "mp-1234567" }],
    ...overrides
  };
}

function mount(t, handler = async () => { throw new Error("unexpected network call"); }) {
  const window = new Window({ url: "https://os.example/", settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  t.after(() => window.happyDOM.abort());
  const requests = [];
  window.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    return handler(String(url), options);
  };
  window.document.write("<!doctype html><html><body><div id=\"host\"></div></body></html>");
  window.eval("var APPS = window.APPS = [];");
  window.eval(catalogSource);
  window.eval(readFileSync(new URL("../js/nab-sectors.js", import.meta.url), "utf8"));
  window.eval(modelSource);
  window.eval(appSource);
  const app = window.APPS.find(item => item.id === "character-materials");
  assert.ok(app, "the Material Spheroids app registers");
  const container = window.document.getElementById("host");
  app.render(container);
  return { window, app, container, requests, text: () => container.textContent };
}

function setValue(container, selector, value) {
  const input = container.querySelector(selector);
  assert.ok(input, `field exists: ${selector}`);
  input.value = String(value);
  input.dispatchEvent(new input.ownerDocument.defaultView.Event("input", { bubbles: true }));
  return input;
}

function submitCharacter(window, container, profile) {
  setValue(container, '[data-cm-field="name"]', profile.name);
  if (profile.role !== undefined) setValue(container, '[data-cm-field="role"]', profile.role);
  if (profile.realWorldNote !== undefined) setValue(container, '[data-cm-field="realWorldNote"]', profile.realWorldNote);
  setValue(container, '[data-cm-field="discId"]', profile.discId || "stocks");
  setValue(container, '[data-cm-field="pdhStatus"]', profile.pdhStatus || "VALID");
  setValue(container, '[data-cm-field="declaredPhase"]', profile.declaredPhase || "NAB");
  setValue(container, '[data-cm-field="detectedPhase"]', profile.detectedPhase || "");
  for (const name of ["densityMin", "densityMax", "bulkModulusMin", "bulkModulusMax", "shearModulusMin", "shearModulusMax", "bandGapMin", "bandGapMax", "energyAboveHullMax"]) {
    if (profile[name] !== undefined) setValue(container, `[data-cm-field="${name}"]`, profile[name]);
  }
  if (profile.electricalClass !== undefined) setValue(container, '[data-cm-field="electricalClass"]', profile.electricalClass);
  container.querySelector("[data-cm-character-form]").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
}

function seedMaterial(window, record) {
  const saved = window.CharacterMaterialModel.saveMaterial(window.localStorage, record, {
    licenseFilter: "BY-C", retrievedAt: "2026-10-04T12:00:00Z", savedAt: "2026-10-04T12:01:00Z"
  });
  assert.equal(saved.ok, true);
}

test("workspace is local and idle until the operator explicitly searches", t => {
  const { container, requests, text } = mount(t);
  assert.equal(requests.length, 0);
  assert.match(text(), /PDH entries here are operator annotations/i);
  assert.match(text(), /Material matching uses only user-entered physical bounds/i);
  assert.match(text(), /A spheroid and its idealized density are exploratory visualizations/i);
  assert.equal(container.querySelectorAll("[data-cm-tab]").length, 3);
  assert.equal(container.querySelector('[data-cm-pane="library"]').hidden, false);
  assert.equal(container.querySelector('[data-cm-pane="characters"]').hidden, true);
  container.querySelector('[data-cm-tab="characters"]').click();
  assert.equal(container.querySelector('[data-cm-pane="characters"]').hidden, false);
});

test("explicit physical requirements rank real saved records; PDH readiness gates assignment separately", t => {
  const { window, container, text } = mount(t);
  seedMaterial(window, material("mp-149"));
  container.querySelector('[data-cm-tab="characters"]').click();
  submitCharacter(window, container, {
    name: "Silicon Warden", discId: "stocks", role: "low-mass shell",
    realWorldNote: "Target profile authored for a display character, not a product spec.",
    densityMin: 2.2, densityMax: 2.5, bandGapMax: 0.8, energyAboveHullMax: 0.05, electricalClass: "nonmetal",
    declaredPhase: "NAB", detectedPhase: "NAB", pdhStatus: "VALID"
  });
  assert.match(container.querySelector("[data-cm-character-status]").textContent, /operator-reported/i);
  container.querySelector('[data-cm-character-action="matches"]').click();
  const candidate = container.querySelector("[data-cm-matches] .cm-card");
  assert.ok(candidate);
  assert.match(candidate.textContent, /All criteria match/);
  assert.match(candidate.textContent, /2\.329 g\/cm³/);
  const assign = candidate.querySelector("[data-cm-assign-material]");
  assert.equal(assign.disabled, false, "a complete physical match plus an internally aligned operator-entered PDH can be assigned locally");
  assign.click();
  const persisted = JSON.parse(window.localStorage.getItem(window.CharacterMaterialModel.STORAGE_KEYS.characters));
  assert.equal(persisted[0].materialId, "mp-149");
  assert.match(text(), /Si · mp-149/);
  assert.match(container.querySelector("[data-cm-character-status]").textContent, /not independently verified/i);
});

test("declared/detected phase disagreement remains review-required even when all material measurements fit", t => {
  const { window, container } = mount(t);
  seedMaterial(window, material("mp-149"));
  container.querySelector('[data-cm-tab="characters"]').click();
  submitCharacter(window, container, {
    name: "Phase Review", discId: "stocks", densityMin: 2, densityMax: 3,
    declaredPhase: "NAB", detectedPhase: "GSRB", pdhStatus: "VALID"
  });
  container.querySelector('[data-cm-character-action="matches"]').click();
  const assign = container.querySelector("[data-cm-assign-material]");
  assert.ok(assign);
  assert.equal(assign.disabled, true);
  assert.match(assign.title, /Declared NAB \/ detected GSRB/);
  assert.match(container.querySelector("[data-cm-match-note]").textContent, /declared NAB \/ detected GSRB · review required/i);
  assert.equal(JSON.parse(window.localStorage.getItem(window.CharacterMaterialModel.STORAGE_KEYS.characters))[0].materialId, null);
});

test("multi-Disc spheroid normalizes shares, shows source records, and saves a local design", t => {
  const { window, container, text } = mount(t);
  seedMaterial(window, material("mp-149"));
  seedMaterial(window, material("mp-30"));
  container.querySelector('[data-cm-tab="characters"]').click();
  submitCharacter(window, container, {
    name: "Silica Layer", discId: "stocks", densityMin: 2, densityMax: 3,
    declaredPhase: "NAB", detectedPhase: "NAB", pdhStatus: "VALID"
  });
  container.querySelector('[data-cm-character-action="matches"]').click();
  container.querySelector('[data-cm-assign-material]').click();
  container.querySelector("[data-cm-reset-character]").click();
  submitCharacter(window, container, {
    name: "Copper Core", discId: "fx", densityMin: 8, densityMax: 9,
    declaredPhase: "CWO", detectedPhase: "CWO", pdhStatus: "VALID"
  });
  container.querySelector('[data-cm-character-action="matches"]').click();
  const copperMatch = [...container.querySelectorAll("[data-cm-assign-material]")].find(button => button.dataset.cmAssignMaterial === "mp-30");
  assert.ok(copperMatch);
  assert.equal(copperMatch.disabled, false);
  copperMatch.click();

  container.querySelector('[data-cm-tab="spheroid"]').click();
  const stocks = container.querySelector('[data-cm-disc-character="stocks"]');
  const fx = container.querySelector('[data-cm-disc-character="fx"]');
  stocks.value = JSON.parse(window.localStorage.getItem(window.CharacterMaterialModel.STORAGE_KEYS.characters)).find(item => item.name === "Silica Layer").id;
  stocks.dispatchEvent(new window.Event("change", { bubbles: true }));
  const currentProfiles = JSON.parse(window.localStorage.getItem(window.CharacterMaterialModel.STORAGE_KEYS.characters));
  fx.value = currentProfiles.find(item => item.name === "Copper Core").id;
  fx.dispatchEvent(new window.Event("change", { bubbles: true }));
  setValue(container, '[data-cm-disc-share="stocks"]', 25);
  setValue(container, '[data-cm-disc-share="fx"]', 75);
  container.querySelector("[data-cm-preview-spheroid]").click();
  assert.match(container.querySelector("[data-cm-spheroid-status]").textContent, /2 Disc components normalized/i);
  assert.match(container.querySelector("[data-cm-spheroid-output]").textContent, /7\.3023 g\/cm³/);
  assert.match(container.querySelector("[data-cm-spheroid-output]").textContent, /Silica Layer/);
  assert.match(container.querySelector("[data-cm-spheroid-output]").textContent, /Copper Core/);
  assert.ok(container.querySelector("svg.cm-sphere"));
  assert.equal(container.querySelector("[data-cm-save-spheroid]").disabled, false);
  setValue(container, "[data-cm-spheroid-name]", "Two-disc test");
  container.querySelector("[data-cm-save-spheroid]").click();
  const saved = JSON.parse(window.localStorage.getItem(window.CharacterMaterialModel.STORAGE_KEYS.spheroids));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].name, "Two-disc test");
  assert.equal(saved[0].components.length, 2);
  assert.equal(saved[0].nabId, 1);
  const nabSelect = container.querySelector("[data-cm-nab]");
  assert.equal(nabSelect.options.length, 119);
  nabSelect.value = "119";
  nabSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.equal(container.querySelector("[data-cm-save-spheroid]").disabled, true);
  assert.match(container.querySelector("[data-cm-nab-note]").textContent, /ORCL/);
  container.querySelector("[data-cm-preview-spheroid]").click();
  assert.match(container.querySelector("[data-cm-spheroid-output]").textContent, /Origin-preserving records/);
  container.querySelector("[data-cm-save-spheroid]").click();
  const designated = window.CharacterMaterialModel.readSpheroids(window.localStorage);
  assert.equal(designated[0].nabId, 119);
  assert.equal(designated[1].nabId, 1);

  assert.match(text(), /Saved spheroid designs/);
  assert.match(container.querySelector("[data-cm-spheroid-status]").textContent, /saved to this browser's local spheroid shelf/i);
});

test("lookup stays same-origin, accepts a bounded response, and saving results feeds the model", async t => {
  const calls = [];
  const { window, container, requests } = mount(t, async (url, options) => {
    calls.push({ url, options });
    return Response.json({ success: true, cached: false, data: {
      schema: "harshalos-materials-project-v1", query: "Si", queryType: "formula", licenseFilter: "BY-C",
      retrievedAt: "2026-10-04T12:00:00Z", resultCount: 1, results: [material("mp-149")]
    } });
  });
  setValue(container, "[data-cm-search-query]", "Si");
  container.querySelector("[data-cm-search-form]").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await flush();
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /^\/api\/materials-project\/v1\/search\?/);
  assert.equal(requests[0].options.method, "GET");
  assert.equal(requests[0].options.credentials, "same-origin");
  assert.equal(requests[0].options.cache, "no-store");
  assert.equal(calls.length, 1);
  container.querySelector("[data-cm-add-material]").click();
  assert.equal(JSON.parse(window.localStorage.getItem(window.CharacterMaterialModel.STORAGE_KEYS.materials))[0].materialId, "mp-149");
  assert.match(container.querySelector("[data-cm-search-status]").textContent, /added in this browser's local library/i);
});
