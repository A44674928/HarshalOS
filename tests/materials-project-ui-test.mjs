import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Window } from "happy-dom";

const appSource = readFileSync(new URL("../js/apps-materials-project.js", import.meta.url), "utf8");
const materialModelSource = readFileSync(new URL("../js/character-material-model.js", import.meta.url), "utf8");
const flush = async () => { for (let turn = 0; turn < 30; turn++) await Promise.resolve(); };

function resultRecord(overrides = {}) {
  return {
    materialId: "mp-149",
    formula: "<img src=x onerror=alert(1)>",
    elements: ["Si"],
    elementCount: 1,
    siteCount: 2,
    cellVolume: 40.2,
    density: 2.329,
    symmetry: { crystalSystem: "cubic", spaceGroup: "Fd-3m", spaceGroupNumber: 227, pointGroup: "m-3m" },
    bandGap: 0.61,
    energyAboveHull: 0,
    formationEnergyPerAtom: 0,
    bulkModulusGpa: 99.5,
    shearModulusGpa: 62.5,
    universalAnisotropy: 0.12,
    poissonRatio: 0.22,
    isStable: true,
    isDirectGap: false,
    isMetal: false,
    theoretical: true,
    deprecated: false,
    lastUpdated: "2026-09-20T12:00:00Z",
    availableProperties: ["bandstructure", "elasticity"],
    warnings: ["Stubbed data warning."],
    origins: [{ name: "structure", taskId: "mp-1234567" }],
    recordUrl: "javascript:alert(1)",
    ...overrides
  };
}

function mount(t, handler = async () => ({
  ok: true,
  status: 200,
  json: async () => ({ success: true, cached: false, data: {
    schema: "harshalos-materials-project-v1", query: "SiO2", queryType: "formula", licenseFilter: "BY-C",
    retrievedAt: "2026-10-03T12:00:00.000Z", resultCount: 1, results: [resultRecord()]
  } })
})) {
  const window = new Window({ url: "https://os.example/", settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  t.after(() => window.happyDOM.abort());
  const requests = [];
  window.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    return handler(String(url), options);
  };
  window.document.write("<!doctype html><html><body><div id=\"host\"></div></body></html>");
  window.eval("var APPS = window.APPS = [];");
  window.eval(materialModelSource);
  window.eval(appSource);
  const app = window.APPS.find(item => item.id === "materials-project");
  assert.ok(app, "the Materials Project app registers itself");
  const container = window.document.getElementById("host");
  app.render(container);
  return { window, app, container, requests, text: () => container.textContent };
}

function submit(window, container, query = "SiO2", limit = "5") {
  const input = container.querySelector("#mp-query");
  const select = container.querySelector("#mp-limit");
  input.value = query;
  select.value = limit;
  container.querySelector("[data-mp-form]").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
}

test("the app opens without a provider call and states its scope, limits, and attribution", async t => {
  const { container, requests, text } = mount(t);
  assert.equal(requests.length, 0, "opening the app makes no API request");
  assert.match(text(), /not a general-purpose physics or engineering solver/i);
  assert.match(text(), /not guaranteed experimental measurements or engineering performance/i);
  assert.match(text(), /GNoME-origin data may be subject to a separate CC BY-NC license/i);
  assert.match(text(), /Suggested citation/i);
  assert.match(text(), /BY-C/);
  assert.match(text(), /Save to Material Spheroids/);
  assert.equal(container.querySelector("#mp-query").getAttribute("maxlength"), "64");
  assert.equal(container.querySelector("#mp-limit option[value='20']").textContent, "20 max");
  assert.equal(container.querySelector("[data-mp-submit]").disabled, false);
  assert.doesNotMatch(appSource, /X-API-KEY/i, "the API key header is Worker-only");
  assert.doesNotMatch(appSource, /stub-materials-project-secret/);
});

test("search uses only the same-origin Worker and safely renders units, provenance, and records", async t => {
  const { window, container, requests, text } = mount(t);
  submit(window, container, "SiO2", "5");
  await flush();
  assert.equal(requests.length, 1);
  const { url, options } = requests[0];
  assert.match(url, /^\/api\/materials-project\/v1\/search\?/);
  const params = new URLSearchParams(url.slice(url.indexOf("?") + 1));
  assert.equal(params.get("q"), "SiO2");
  assert.equal(params.get("limit"), "5");
  assert.equal(options.method, "GET");
  assert.equal(options.credentials, "same-origin");
  assert.equal(options.cache, "no-store");
  assert.equal("X-API-KEY" in options.headers, false);
  assert.equal(options.headers.Accept, "application/json");

  const article = container.querySelector(".mp-record");
  assert.ok(article);
  assert.equal(container.querySelectorAll(".mp-record").length, 1);
  assert.equal(article.querySelector(".mp-formula").textContent, "<img src=x onerror=alert(1)>");
  assert.equal(article.querySelector("img"), null, "untrusted provider text is not parsed as HTML");
  const recordLink = article.querySelector("a.mp-id");
  assert.equal(recordLink.href, "https://next-gen.materialsproject.org/materials/mp-149");
  assert.equal(recordLink.rel, "noopener noreferrer");
  assert.equal(recordLink.target, "_blank");
  assert.doesNotMatch(recordLink.href, /javascript:/i, "the provider-supplied URL is ignored");
  for (const unit of ["g/cm³", "Å³", "eV", "eV/atom", "GPa"]) assert.ok(text().includes(unit), `visible units include ${unit}`);
  assert.match(text(), /Calculation provenance/);
  assert.match(text(), /structure · mp-1234567/);
  assert.match(text(), /Stubbed data warning/);
  assert.match(text(), /license scope BY-C/);
  assert.match(container.querySelector("[data-mp-status]").textContent, /1 result for “SiO2”/);
  assert.equal(container.querySelector("[data-mp-results]").getAttribute("aria-busy"), "false");
});

test("not-configured responses explain Worker-secret setup without exposing credentials", async t => {
  const { window, container, requests } = mount(t, async () => ({
    ok: false,
    status: 503,
    json: async () => ({ success: false, code: "not-configured", message: "Add MATERIALS_PROJECT_API_KEY as a Worker secret." })
  }));
  submit(window, container, "mp-149");
  await flush();
  assert.equal(requests.length, 1);
  const message = container.querySelector("[data-mp-status]").textContent;
  assert.match(message, /not configured yet/i);
  assert.match(message, /Cloudflare Worker secret/i);
  assert.doesNotMatch(message, /stub-materials-project-secret/);
  assert.equal(container.querySelectorAll(".mp-record").length, 0);
  assert.equal(container.querySelector("[data-mp-submit]").disabled, false);
});

test("empty input fails locally without sending a request", async t => {
  const { window, container, requests } = mount(t);
  submit(window, container, "   ");
  await flush();
  assert.equal(requests.length, 0);
  assert.match(container.querySelector("[data-mp-status]").textContent, /enter a formula or Materials Project ID/i);
});

test("client displays no more than twenty records from a malformed oversized response", async t => {
  const rows = Array.from({ length: 25 }, (_, index) => resultRecord({ materialId: `mp-${2000 + index}`, formula: `Si${index + 1}` }));
  const { window, container, requests } = mount(t, async () => ({
    ok: true,
    status: 200,
    json: async () => ({ success: true, cached: false, data: {
      schema: "harshalos-materials-project-v1", query: "Si", licenseFilter: "BY-C",
      retrievedAt: "2026-10-03T12:00:00.000Z", resultCount: 25, results: rows
    } })
  }));
  submit(window, container, "Si", "20");
  await flush();
  assert.equal(requests.length, 1);
  assert.equal(container.querySelectorAll(".mp-record").length, 20);
});

test("cancel stops the browser wait and communicates that an upstream request may still finish", async t => {
  const { window, container } = mount(t, (_url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      reject(error);
    }, { once: true });
  }));
  submit(window, container, "Si");
  await flush();
  assert.equal(container.querySelector("[data-mp-submit]").disabled, true);
  container.querySelector("[data-mp-cancel]").click();
  await flush();
  assert.equal(container.querySelector("[data-mp-submit]").disabled, false);
  assert.match(container.querySelector("[data-mp-status]").textContent, /request already received by the Worker may still finish upstream/i);
});

test("Materials Project result can be saved as a normalized local model record", async t => {
  const { window, container, requests } = mount(t);
  submit(window, container, "SiO2", "5");
  await flush();
  assert.equal(requests.length, 1);
  const saveButton = container.querySelector("[data-mp-save-material]");
  assert.ok(saveButton);
  saveButton.click();
  const library = window.CharacterMaterialModel.readMaterials(window.localStorage);
  assert.equal(library.length, 1);
  assert.equal(library[0].materialId, "mp-149");
  assert.equal(library[0].licenseFilter, "BY-C");
  assert.equal(library[0].retrievedAt, "2026-10-03T12:00:00.000Z");
  assert.match(container.querySelector(".mp-model-save-note").textContent, /available in the Material Spheroids app/i);
});
