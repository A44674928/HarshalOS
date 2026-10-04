import assert from "node:assert/strict";
import test from "node:test";
import { clearMaterialsProjectCache, handleMaterialsProject, MATERIALS_PROJECT_CACHE_TTL_MS, MATERIALS_PROJECT_MAX_RESULTS } from "../worker/materials-project.mjs";
import worker from "../worker/index.mjs";

const NOW = Date.parse("2026-10-03T12:00:00.000Z");
const KEY = "stub-materials-project-secret";
const requestFor = (query, limit, { ip = "192.0.2.8", method = "GET", path = "/api/materials-project/v1/search" } = {}) => {
  const params = new URLSearchParams();
  if (query !== undefined) params.set("q", query);
  if (limit !== undefined) params.set("limit", String(limit));
  return new Request(`https://os.example${path}${params.size ? `?${params}` : ""}`, {
    method,
    headers: ip ? { "CF-Connecting-IP": ip } : {}
  });
};

const siliconRecord = overrides => ({
  material_id: "mp-149",
  formula_pretty: "Si",
  elements: ["Si"],
  nelements: 1,
  nsites: 2,
  volume: 40.2,
  density: 2.329,
  symmetry: { crystal_system: "cubic", symbol: "Fd-3m", number: 227, point_group: "m-3m" },
  band_gap: 0.61,
  energy_above_hull: 0,
  formation_energy_per_atom: 0,
  bulk_modulus: { voigt: 100, reuss: 99, vrh: 99.5 },
  shear_modulus: { voigt: 65, reuss: 60, vrh: 62.5 },
  universal_anisotropy: 0.12,
  homogeneous_poisson: 0.22,
  is_stable: true,
  is_gap_direct: false,
  is_metal: false,
  theoretical: false,
  deprecated: false,
  last_updated: "2026-09-20T12:00:00Z",
  has_props: ["bandstructure", "elasticity"],
  origins: [{ name: "structure", task_id: "mp-1234567" }],
  warnings: ["Stubbed provider warning."],
  ...overrides
});

const successResponse = data => Response.json({ data });
const bodyOf = async response => response.json();

function stubFetcher({ payload = { data: [siliconRecord()] }, status = 200, calls = [] } = {}) {
  return async (url, options) => {
    calls.push({ url: String(url), options });
    return status === 200 ? Response.json(payload) : new Response("provider body is intentionally not forwarded", { status });
  };
}

test("summary lookup uses fixed upstream, a secret header, bounded fields, and normalized values with provenance", async () => {
  clearMaterialsProjectCache();
  const calls = [];
  const response = await handleMaterialsProject(requestFor("mp-149"), { MATERIALS_PROJECT_API_KEY: KEY }, {
    now: NOW,
    fetcher: stubFetcher({ calls })
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(calls.length, 1);

  const { url, options } = calls[0];
  const upstream = new URL(url);
  assert.equal(upstream.origin, "https://api.materialsproject.org");
  assert.equal(upstream.pathname, "/materials/summary/");
  assert.equal(upstream.searchParams.get("material_ids"), "mp-149");
  assert.equal(upstream.searchParams.get("_limit"), "10", "the default result limit is ten when omitted");
  assert.equal(upstream.searchParams.get("license"), "BY-C", "non-commercial-only records are not requested");
  assert.equal(upstream.searchParams.get("id_format"), "legacy");
  assert.equal(upstream.searchParams.get("_sort_fields"), "energy_above_hull", "the Summary API accepts one sort field, set here to energy above hull");
  const fields = new Set(upstream.searchParams.get("_fields").split(","));
  for (const field of ["material_id", "formula_pretty", "density", "band_gap", "formation_energy_per_atom", "bulk_modulus", "shear_modulus", "origins", "warnings"]) {
    assert.ok(fields.has(field), `the fixed projection includes ${field}`);
  }
  for (const heavyField of ["structure", "dos", "bandstructure"]) assert.equal(fields.has(heavyField), false);
  assert.equal(options.method, "GET");
  assert.equal(options.redirect, "manual", "the API key is not followed across an upstream redirect");
  assert.equal(options.headers["X-API-KEY"], KEY);
  assert.equal(options.headers.Accept, "application/json");
  assert.doesNotMatch(url, new RegExp(KEY), "the key is never placed in a URL");
  assert.equal(options.signal instanceof AbortSignal, true, "the provider request is abortable");

  const body = await bodyOf(response);
  assert.equal(body.success, true);
  assert.equal(body.cached, false);
  assert.equal(body.data.schema, "harshalos-materials-project-v1");
  assert.equal(body.data.licenseFilter, "BY-C");
  assert.equal(body.data.queryType, "material_id");
  assert.equal(body.data.retrievedAt, new Date(NOW).toISOString());
  assert.equal(body.data.resultCount, 1);
  assert.deepEqual(body.data.results[0], {
    materialId: "mp-149",
    formula: "Si",
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
    theoretical: false,
    deprecated: false,
    lastUpdated: "2026-09-20T12:00:00Z",
    availableProperties: ["bandstructure", "elasticity"],
    warnings: ["Stubbed provider warning."],
    origins: [{ name: "structure", taskId: "mp-1234567" }],
    recordUrl: "https://next-gen.materialsproject.org/materials/mp-149"
  });
});

test("formula, chemical-system, and current alpha-ID searches map to fixed provider parameters", async () => {
  for (const [query, parameter, expected, kind] of [
    ["SiO2", "formula", "SiO2", "formula"],
    ["Ca3(PO4)2", "formula", "Ca3(PO4)2", "formula"],
    ["Li0.5Mn0.5O2", "formula", "Li0.5Mn0.5O2", "formula"],
    ["Li-Fe-O", "chemsys", "Li-Fe-O", "chemical_system"],
    ["MP-AAAAAAFT", "material_ids", "mp-aaaaaaft", "material_id"]
  ]) {
    clearMaterialsProjectCache();
    const calls = [];
    const response = await handleMaterialsProject(requestFor(query), { MATERIALS_PROJECT_API_KEY: KEY }, {
      now: NOW,
      fetcher: stubFetcher({ payload: { data: [] }, calls })
    });
    assert.equal(response.status, 200);
    assert.equal(new URL(calls[0].url).searchParams.get(parameter), expected);
    assert.equal((await bodyOf(response)).data.queryType, kind);
  }
});

test("invalid input is rejected before any upstream request", async () => {
  for (const query of ["", "mp-not-an-id", "<script>", "Si OR O", "Li-Fe-not-an-element", "Xx2", "Ca3(PO4", "Ca3()2", "H0", "H".repeat(65), "Si\nO"]) {
    clearMaterialsProjectCache();
    let calls = 0;
    const response = await handleMaterialsProject(requestFor(query), { MATERIALS_PROJECT_API_KEY: KEY }, {
      now: NOW,
      fetcher: async () => { calls += 1; return successResponse([]); }
    });
    assert.equal(response.status, 400, JSON.stringify(query));
    assert.equal((await bodyOf(response)).code, "invalid-query");
    assert.equal(calls, 0, "invalid query must not spend an upstream request");
  }
});

test("result and field counts are bounded even if the provider returns too many rows", async () => {
  clearMaterialsProjectCache();
  const calls = [];
  const rows = Array.from({ length: 25 }, (_, index) => siliconRecord({ material_id: `mp-${1000 + index}`, formula_pretty: `Si${index + 1}` }));
  const response = await handleMaterialsProject(requestFor("Si", 999), { MATERIALS_PROJECT_API_KEY: KEY }, {
    now: NOW,
    fetcher: stubFetcher({ payload: { data: rows }, calls })
  });
  assert.equal(MATERIALS_PROJECT_MAX_RESULTS, 20);
  assert.equal(new URL(calls[0].url).searchParams.get("_limit"), "20");
  const body = await bodyOf(response);
  assert.equal(body.data.resultCount, 20);
  assert.equal(body.data.results.length, 20);

  clearMaterialsProjectCache();
  const lowLimitCall = [];
  await handleMaterialsProject(requestFor("Si", 0), { MATERIALS_PROJECT_API_KEY: KEY }, {
    now: NOW,
    fetcher: stubFetcher({ payload: { data: [] }, calls: lowLimitCall })
  });
  assert.equal(new URL(lowLimitCall[0].url).searchParams.get("_limit"), "1", "low limits are clamped");
});

test("missing Worker secret fails closed, including when a cached result exists", async () => {
  clearMaterialsProjectCache();
  let calls = 0;
  const fetcher = async () => { calls += 1; return successResponse([]); };
  await handleMaterialsProject(requestFor("Si"), { MATERIALS_PROJECT_API_KEY: KEY }, { now: NOW, fetcher });
  assert.equal(calls, 1, "the stub primes one successful cache entry");

  const response = await handleMaterialsProject(requestFor("Si"), {}, { now: NOW + 1, fetcher });
  assert.equal(response.status, 503);
  assert.equal((await bodyOf(response)).code, "not-configured");
  assert.equal(calls, 1, "an absent secret does not serve cached data or call the provider");

  clearMaterialsProjectCache();
  const unprimed = await handleMaterialsProject(requestFor("Li"), {}, { now: NOW, fetcher });
  assert.equal(unprimed.status, 503);
  assert.equal(calls, 1, "an unprimed, unconfigured route makes no provider request");
});

test("successful responses cache for five minutes; uncached upstream work is paced per client", async () => {
  clearMaterialsProjectCache();
  let calls = 0;
  const fetcher = async () => { calls += 1; return successResponse([]); };
  const first = await handleMaterialsProject(requestFor("Si"), { MATERIALS_PROJECT_API_KEY: KEY }, { now: NOW, fetcher });
  const cached = await handleMaterialsProject(requestFor("Si"), { MATERIALS_PROJECT_API_KEY: KEY }, { now: NOW + 1, fetcher });
  assert.equal((await bodyOf(first)).cached, false);
  assert.equal((await bodyOf(cached)).cached, true);
  assert.equal(calls, 1, "a successful identical query is served from Worker memory");
  const expired = await handleMaterialsProject(requestFor("Si"), { MATERIALS_PROJECT_API_KEY: KEY }, {
    now: NOW + MATERIALS_PROJECT_CACHE_TTL_MS,
    fetcher
  });
  assert.equal((await bodyOf(expired)).cached, false);
  assert.equal(calls, 2, "cache entries expire at the five-minute boundary");

  clearMaterialsProjectCache();
  calls = 0;
  for (let index = 1; index <= 20; index++) {
    const response = await handleMaterialsProject(requestFor(`H${index}`), { MATERIALS_PROJECT_API_KEY: KEY }, {
      now: NOW,
      fetcher
    });
    assert.equal(response.status, 200, `upstream request ${index} is allowed`);
  }
  const limited = await handleMaterialsProject(requestFor("H21"), { MATERIALS_PROJECT_API_KEY: KEY }, {
    now: NOW + 1,
    fetcher
  });
  assert.equal(limited.status, 429);
  assert.equal((await bodyOf(limited)).code, "rate-limited");
  assert.equal(calls, 20, "the 21st uncached request does not reach the provider");
  const newWindow = await handleMaterialsProject(requestFor("H22"), { MATERIALS_PROJECT_API_KEY: KEY }, {
    now: NOW + 60_000,
    fetcher
  });
  assert.equal(newWindow.status, 200, "the client budget resets after one minute");
});

test("provider failures are reduced to safe, non-secret errors", async () => {
  for (const [status, expectedStatus, expectedCode] of [
    [429, 429, "rate-limited"],
    [401, 502, "credentials-rejected"],
    [403, 502, "credentials-rejected"],
    [422, 400, "query-rejected"],
    [500, 502, "upstream-error"]
  ]) {
    clearMaterialsProjectCache();
    const response = await handleMaterialsProject(requestFor("Si"), { MATERIALS_PROJECT_API_KEY: KEY }, {
      now: NOW,
      fetcher: async () => new Response("provider internals and secrets must not leak", { status })
    });
    assert.equal(response.status, expectedStatus);
    const body = await bodyOf(response);
    assert.equal(body.code, expectedCode);
    assert.doesNotMatch(JSON.stringify(body), /provider internals|stub-materials-project-secret/);
  }

  clearMaterialsProjectCache();
  const unreadable = await handleMaterialsProject(requestFor("Si"), { MATERIALS_PROJECT_API_KEY: KEY }, {
    now: NOW,
    fetcher: async () => ({ ok: true, json: async () => { throw new Error("private provider data"); } })
  });
  assert.equal((await bodyOf(unreadable)).code, "unreadable-response");

  clearMaterialsProjectCache();
  const unexpected = await handleMaterialsProject(requestFor("Si"), { MATERIALS_PROJECT_API_KEY: KEY }, {
    now: NOW,
    fetcher: async () => Response.json({ notData: [] })
  });
  assert.equal((await bodyOf(unexpected)).code, "unexpected-response");
});

test("upstream timeout aborts the request", async () => {
  clearMaterialsProjectCache();
  const response = await handleMaterialsProject(requestFor("Si"), { MATERIALS_PROJECT_API_KEY: KEY }, {
    now: NOW,
    timeoutMs: 5,
    fetcher: (_url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      }, { once: true });
    })
  });
  assert.equal(response.status, 504);
  assert.equal((await bodyOf(response)).code, "timeout");
});

test("route and method checks are read-only and do not reach the provider", async () => {
  clearMaterialsProjectCache();
  let calls = 0;
  const wrongPath = await handleMaterialsProject(requestFor("Si", undefined, { path: "/api/materials-project/v1/other" }), {}, {
    fetcher: async () => { calls += 1; return successResponse([]); }
  });
  assert.equal(wrongPath.status, 404);
  const post = await handleMaterialsProject(requestFor("Si", undefined, { method: "POST" }), {}, {
    fetcher: async () => { calls += 1; return successResponse([]); }
  });
  assert.equal(post.status, 405);
  assert.equal(calls, 0);
});

test("Worker routing reaches the Materials Project handler before private storage auth", async () => {
  clearMaterialsProjectCache();
  const response = await worker.fetch(new Request("https://os.example/api/materials-project/v1/search?q=Si"), {});
  assert.equal(response.status, 503);
  assert.equal((await bodyOf(response)).code, "not-configured");
});
