/* Read-only, rate-conscious proxy for the Materials Project summary API.
   The account API key is a Cloudflare Worker secret and is sent only in the
   X-API-KEY header. This route accepts a bounded formula, chemical system, or
   Materials Project ID; it is not an arbitrary URL or query proxy. */

const API_ORIGIN = "https://api.materialsproject.org";
const SEARCH_PATH = "/materials/summary/";
const LICENSE_FILTER = "BY-C";
const SEARCH_FIELDS = Object.freeze([
  "material_id", "formula_pretty", "elements", "nelements", "nsites",
  "volume", "density", "symmetry", "band_gap", "energy_above_hull",
  "formation_energy_per_atom", "bulk_modulus", "shear_modulus",
  "universal_anisotropy", "homogeneous_poisson", "is_stable", "is_gap_direct",
  "is_metal", "theoretical", "deprecated", "last_updated", "has_props",
  "origins", "warnings"
]);
export const MATERIALS_PROJECT_CACHE_TTL_MS = 5 * 60_000;
export const MATERIALS_PROJECT_MAX_RESULTS = 20;
const CACHE_CAPACITY = 100;
const CLIENT_WINDOW_MS = 60_000;
const CLIENT_UPSTREAM_LIMIT = 20;
const CLIENT_BUCKET_CAPACITY = 512;
const FETCH_TIMEOUT_MS = 10_000;
const ELEMENTS = new Set((
  "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr " +
  "Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu " +
  "Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr " +
  "Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og"
).split(/\s+/));

let cache = new Map();
let clientBudgets = new Map();

const json = (value, status = 200) => Response.json(value, {
  status,
  headers: {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer"
  }
});

function isFormula(query) {
  let position = 0;
  let elementCount = 0;
  const groups = [];
  while (position < query.length) {
    const character = query[position];
    if (character === "(" || character === "[") {
      if (groups.length >= 8) return false;
      groups.push({ close: character === "(" ? ")" : "]", elements: 0 });
      position += 1;
      continue;
    }
    if (character === ")" || character === "]") {
      const group = groups.pop();
      if (!group || group.close !== character || group.elements === 0) return false;
      position += 1;
      const multiplier = /^\d+(?:\.\d+)?/.exec(query.slice(position));
      if (multiplier) {
        if (Number(multiplier[0]) === 0) return false;
        position += multiplier[0].length;
      }
      if (groups.length) groups[groups.length - 1].elements += group.elements;
      continue;
    }
    const element = /^([A-Z][a-z]?)/.exec(query.slice(position));
    if (!element || !ELEMENTS.has(element[1])) return false;
    elementCount += 1;
    if (groups.length) groups[groups.length - 1].elements += 1;
    position += element[1].length;
    const amount = /^\d+(?:\.\d+)?/.exec(query.slice(position));
    if (amount) {
      if (Number(amount[0]) === 0) return false;
      position += amount[0].length;
    }
  }
  return elementCount > 0 && groups.length === 0;
}

function validateQuery(value) {
  const query = typeof value === "string" ? value.trim() : "";
  if (!query || query.length > 64 || /[\u0000-\u001f\u007f]/.test(query)) return null;
  // Accept legacy numeric IDs and the current padded alpha IDs. The upstream
  // request asks for legacy formatting so returned records stay consistent.
  if (/^mp-(?:\d+|[a-z]{8})$/i.test(query)) return { query: query.toLowerCase(), kind: "material_id", parameter: "material_ids" };

  if (query.includes("-")) {
    const parts = query.split("-");
    if (parts.length >= 2 && parts.length <= 10 && parts.every(part => ELEMENTS.has(part))) {
      return { query, kind: "chemical_system", parameter: "chemsys" };
    }
    return null;
  }

  if (!isFormula(query)) return null;
  return { query, kind: "formula", parameter: "formula" };
}

const finite = value => typeof value === "number" && Number.isFinite(value) ? value : null;
const text = (value, max = 160) => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
const bool = value => typeof value === "boolean" ? value : null;
const stringList = value => Array.isArray(value)
  ? value.filter(item => typeof item === "string").slice(0, 40).map(item => item.slice(0, 80))
  : [];

function normalizeSymmetry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return {
    crystalSystem: text(value.crystal_system, 48),
    spaceGroup: text(value.symbol, 48),
    spaceGroupNumber: Number.isSafeInteger(value.number) ? value.number : null,
    pointGroup: text(value.point_group, 48)
  };
}

function normalizeOrigins(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap(origin => {
    if (!origin || typeof origin !== "object" || Array.isArray(origin)) return [];
    const name = text(origin.name, 64);
    const taskId = text(origin.task_id, 48);
    return name || taskId ? [{ name, taskId }] : [];
  });
}

function normalizeRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const materialId = text(record.material_id, 32);
  if (!materialId || !/^mp-(?:\d+|[a-z]{8})$/i.test(materialId)) return null;
  const hasProps = Array.isArray(record.has_props)
    ? stringList(record.has_props)
    : record.has_props && typeof record.has_props === "object"
      ? Object.entries(record.has_props).filter(([, enabled]) => enabled === true).map(([name]) => name).slice(0, 40)
      : [];
  return {
    materialId: materialId.toLowerCase(),
    formula: text(record.formula_pretty, 96),
    elements: stringList(record.elements),
    elementCount: Number.isSafeInteger(record.nelements) ? record.nelements : null,
    siteCount: Number.isSafeInteger(record.nsites) ? record.nsites : null,
    cellVolume: finite(record.volume),
    density: finite(record.density),
    symmetry: normalizeSymmetry(record.symmetry),
    bandGap: finite(record.band_gap),
    energyAboveHull: finite(record.energy_above_hull),
    formationEnergyPerAtom: finite(record.formation_energy_per_atom),
    bulkModulusGpa: finite(record.bulk_modulus?.vrh),
    shearModulusGpa: finite(record.shear_modulus?.vrh),
    universalAnisotropy: finite(record.universal_anisotropy),
    poissonRatio: finite(record.homogeneous_poisson),
    isStable: bool(record.is_stable),
    isDirectGap: bool(record.is_gap_direct),
    isMetal: bool(record.is_metal),
    theoretical: bool(record.theoretical),
    deprecated: bool(record.deprecated),
    lastUpdated: text(record.last_updated, 48),
    availableProperties: hasProps,
    warnings: stringList(record.warnings),
    origins: normalizeOrigins(record.origins),
    recordUrl: `https://next-gen.materialsproject.org/materials/${materialId.toLowerCase()}`
  };
}

function failure(code, message, status = 502) {
  return json({ success: false, code, message }, status);
}

function cacheGet(key, now) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    cache.delete(key);
    return null;
  }
  // Refresh insertion order so frequently used searches survive the small LRU cap.
  cache.delete(key);
  cache.set(key, entry);
  return entry.data;
}

function cacheSet(key, data, now) {
  cache.delete(key);
  cache.set(key, { data, expiresAt: now + MATERIALS_PROJECT_CACHE_TTL_MS });
  while (cache.size > CACHE_CAPACITY) cache.delete(cache.keys().next().value);
}

function consumeClientBudget(request, now) {
  const address = request.headers.get("CF-Connecting-IP");
  const key = typeof address === "string" && address.trim().length <= 64 && address.trim()
    ? address.trim()
    : "unknown";
  const current = clientBudgets.get(key);
  const inWindow = current && now >= current.startedAt && now - current.startedAt < CLIENT_WINDOW_MS;
  const entry = inWindow ? current : { startedAt: now, count: 0 };
  if (entry.count >= CLIENT_UPSTREAM_LIMIT) return false;
  clientBudgets.delete(key);
  clientBudgets.set(key, { startedAt: entry.startedAt, count: entry.count + 1 });
  if (clientBudgets.size > CLIENT_BUCKET_CAPACITY) {
    for (const [oldKey, oldEntry] of clientBudgets) {
      if (now - oldEntry.startedAt >= CLIENT_WINDOW_MS || now < oldEntry.startedAt) clientBudgets.delete(oldKey);
    }
    while (clientBudgets.size > CLIENT_BUCKET_CAPACITY) clientBudgets.delete(clientBudgets.keys().next().value);
  }
  return true;
}

export function clearMaterialsProjectCache() {
  cache = new Map();
  clientBudgets = new Map();
}

/* ── Temporary upstream error-body diagnostic (2026-10) ────────────────────
 * Reads a small slice of a non-OK Materials Project response, extracts the first
 * short message-like field, scrubs the API key, and emits a single console.warn
 * that shows up in Cloudflare Workers Logs / `wrangler tail`. Never logs the URL,
 * headers, query, full body, or the API key. Remove once the upstream error is
 * identified; this is intentionally not wired into the client response. */
const MP_ERROR_BODY_READ_BYTES = 4096;
const MP_ERROR_MESSAGE_MAX = 200;
function mpScrub(text, apiKey) {
  let out = String(text ?? "");
  if (apiKey) out = out.split(apiKey).join("[REDACTED_API_KEY]");
  // Collapse any obvious bearer/key-shaped token just in case.
  out = out.replace(/(?:api[_-]?key|token|bearer)\s*[:=]\s*[A-Za-z0-9._-]{8,}/gi, "$1=[REDACTED]");
  return out.replace(/[\r\n\t]+/g, " ").trim();
}
function extractProviderMessage(payloadText) {
  // Try to parse as JSON and pluck the conventional error fields.
  try {
    const parsed = JSON.parse(payloadText);
    if (parsed && typeof parsed === "object") {
      for (const key of ["message", "detail", "error", "error_message", "description"]) {
        const field = parsed[key];
        if (typeof field === "string" && field.trim()) return field.trim();
        // FastAPI often surfaces { detail: [{ msg: "…" }] }.
        if (Array.isArray(field)) {
          const first = field.find(item => item && (typeof item.msg === "string" || typeof item.message === "string"));
          const msg = first && (first.msg || first.message);
          if (typeof msg === "string" && msg.trim()) return msg.trim();
        }
        if (field && typeof field === "object") {
          const nested = field.message || field.msg || field.error;
          if (typeof nested === "string" && nested.trim()) return nested.trim();
        }
      }
    }
  } catch { /* fall through to a text snippet */ }
  // Not JSON or no structured field: return a short prefix of the body.
  return payloadText.trim();
}
async function logUpstreamErrorBody(response, { apiKey, dependencies, status } = {}) {
  if (!response || typeof response.text !== "function") return;
  try {
    /* Read a bounded slice of the body. `clone()` keeps the original response
     * untouched (we don't consume it on this error path anyway). We cap the raw
     * text at MP_ERROR_BODY_READ_BYTES after read to bound memory, then extract
     * one message-like field and scrub it. */
    let raw = "";
    try {
      raw = await response.clone().text();
    } catch {
      raw = "";
    }
    raw = String(raw ?? "").slice(0, MP_ERROR_BODY_READ_BYTES);
    const provider = raw
      ? mpScrub(extractProviderMessage(raw), apiKey).slice(0, MP_ERROR_MESSAGE_MAX)
      : "";
    const entry = {
      event: "materials_project_upstream_http_error",
      status: Number.isFinite(Number(status)) ? Number(status) : 0,
      providerMessage: provider || "(no provider message in body)",
      bodySizeHint: raw.length,
      note: "Temporary diagnostic — remove after identifying the upstream error."
    };
    if (typeof dependencies.log === "function") dependencies.log(entry);
    else console.warn("[HarshalOS Materials Project]", entry);
  } catch (readError) {
    /* Reading the body must never itself fail the request. Log the read failure
     * without leaking anything else. */
    const entry = {
      event: "materials_project_upstream_error_body_unreadable",
      status: Number.isFinite(Number(status)) ? Number(status) : 0,
      readErrorName: readError && typeof readError.name === "string" ? readError.name : "Error"
    };
    if (typeof dependencies.log === "function") dependencies.log(entry);
    else console.warn("[HarshalOS Materials Project]", entry);
  }
}

/** GET /api/materials-project/v1/search?q=Si&limit=10 */
export async function handleMaterialsProject(request, env = {}, dependencies = {}) {
  const url = new URL(request.url);
  if (url.pathname !== "/api/materials-project/v1/search") {
    return failure("not-found", "Materials Project route not found.", 404);
  }
  if (request.method !== "GET") {
    return json({ success: false, code: "method-not-allowed", message: "Materials Project lookup is read-only." }, 405);
  }

  const parsed = validateQuery(url.searchParams.get("q"));
  if (!parsed) {
    return json({
      success: false,
      code: "invalid-query",
      message: "Enter a Materials Project ID (for example mp-149), a chemical formula (SiO2), or a chemical system (Li-Fe-O)."
    }, 400);
  }
  const rawLimit = url.searchParams.get("limit");
  const requestedLimit = rawLimit === null || rawLimit.trim() === "" ? 10 : Number(rawLimit);
  const limit = Number.isSafeInteger(requestedLimit)
    ? Math.max(1, Math.min(MATERIALS_PROJECT_MAX_RESULTS, requestedLimit))
    : 10;
  const nowInput = Number(dependencies.now ?? Date.now());
  const now = Number.isFinite(nowInput) ? nowInput : Date.now();
  const apiKey = typeof env.MATERIALS_PROJECT_API_KEY === "string" ? env.MATERIALS_PROJECT_API_KEY.trim() : "";
  if (!apiKey) {
    return failure("not-configured", "Add MATERIALS_PROJECT_API_KEY as a Worker secret to enable Materials Project lookups.", 503);
  }
  const cacheKey = `${parsed.kind}:${parsed.query}:${limit}`;
  const cached = cacheGet(cacheKey, now);
  if (cached) return json({ success: true, cached: true, data: cached });

  const fetcher = dependencies.fetcher || globalThis.fetch;
  if (typeof fetcher !== "function") return failure("unavailable", "The Materials Project API is unavailable in this Worker runtime.", 503);
  if (!consumeClientBudget(request, now)) {
    return failure("rate-limited", "This Worker has reached its per-client upstream search budget. Wait before searching again.", 429);
  }

  const upstreamUrl = new URL(SEARCH_PATH, API_ORIGIN);
  upstreamUrl.searchParams.set(parsed.parameter, parsed.query);
  upstreamUrl.searchParams.set("_fields", SEARCH_FIELDS.join(","));
  upstreamUrl.searchParams.set("_limit", String(limit));
  upstreamUrl.searchParams.set("_sort_fields", "energy_above_hull,material_id");
  upstreamUrl.searchParams.set("id_format", "legacy");
  // Explicitly retain Materials Project's commercial-license scope; do not
  // request the wider set that may include GNoME's separate BY-NC records.
  upstreamUrl.searchParams.set("license", LICENSE_FILTER);
  const timeoutMs = Number.isFinite(Number(dependencies.timeoutMs)) ? Math.max(1, Number(dependencies.timeoutMs)) : FETCH_TIMEOUT_MS;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetcher(upstreamUrl.toString(), {
      method: "GET",
      headers: { Accept: "application/json", "X-API-KEY": apiKey },
      redirect: "manual",
      ...(controller ? { signal: controller.signal } : {})
    });
    if (!response || !response.ok) {
      const status = Number(response && response.status) || 0;
      /* TEMPORARY diagnostic (2026-10): read the provider's error body, redact the
       * API key, and surface a short sanitized message via console.warn so the next
       * failed Materials Project search shows why in Workers Logs / `wrangler tail`.
       * Only a capped slice of body is read; URL, headers, query, and full body are
       * never logged. Remove once the upstream error is identified. */
      await logUpstreamErrorBody(response, { apiKey, dependencies, status });
      if (status === 429) return failure("rate-limited", "Materials Project rate limit reached. Wait before searching again.", 429);
      if (status === 401 || status === 403) return failure("credentials-rejected", "Materials Project rejected the Worker key. Check the Worker secret in Cloudflare; do not paste it into HarshalOS.", 502);
      if (status === 422) return failure("query-rejected", "Materials Project could not apply this search. Try a Materials Project ID, formula, or chemical system.", 400);
      return failure("upstream-error", "Materials Project could not complete the search right now.", 502);
    }

    let payload;
    try { payload = await response.json(); }
    catch { return failure("unreadable-response", "Materials Project returned unreadable data.", 502); }
    if (!payload || !Array.isArray(payload.data)) {
      return failure("unexpected-response", "Materials Project returned an unexpected response shape.", 502);
    }

    const results = payload.data.slice(0, limit).map(normalizeRecord).filter(Boolean);
    const data = {
      schema: "harshalos-materials-project-v1",
      query: parsed.query,
      queryType: parsed.kind,
      licenseFilter: LICENSE_FILTER,
      retrievedAt: new Date(now).toISOString(),
      resultCount: results.length,
      results
    };
    cacheSet(cacheKey, data, now);
    return json({ success: true, cached: false, data });
  } catch (error) {
    const timedOut = error && error.name === "AbortError";
    /* Temporary diagnostic: log a scrubbed fetch-failure breadcrumb so network
     * errors (DNS/TLS/abort) also surface in Workers Logs. Never logs URL, key,
     * headers, or stack. */
    try {
      const cause = error && typeof error.cause === "object" ? error.cause : null;
      const scrubName = v => typeof v === "string" && /^[A-Za-z][A-Za-z0-9]{0,31}$/.test(v) ? v : "";
      const scrubCode = v => typeof v === "string" && /^[A-Za-z0-9_:-]{1,40}$/.test(v) ? v : "";
      const entry = {
        event: "materials_project_upstream_fetch_failed",
        timedOut: !!timedOut,
        errorName: scrubName(error && error.name) || "Error",
        causeName: scrubName(cause && cause.name),
        causeCode: scrubCode(cause && cause.code),
        note: "Temporary diagnostic — remove after identifying the upstream error."
      };
      if (typeof dependencies.log === "function") dependencies.log(entry);
      else console.warn("[HarshalOS Materials Project]", entry);
    } catch { /* logging must never affect the response */ }
    return failure(timedOut ? "timeout" : "unreachable",
      timedOut ? "Materials Project search timed out. Try again shortly." : "Materials Project could not be reached from this Worker.",
      timedOut ? 504 : 502);
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

export const materialsProjectInternals = Object.freeze({ validateQuery, normalizeRecord, SEARCH_FIELDS });
