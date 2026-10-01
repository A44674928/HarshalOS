/* Good Intelligence — read-only API client for the HarshalOS desktop app.
   This client deliberately exposes GET operations only. */
"use strict";

window.GoodIntelligenceClient = (() => {
  const DEFAULT_API_BASE = "/api/good-intelligence/v1";
  const LEGACY_PRODUCTION_API_BASE = "https://api.goodintelligence.ai/v1";
  const STORAGE_KEY = "hos-good-intelligence-api-base-v1";
  const REQUEST_TIMEOUT_MS = 15000;
  const ROUTES = Object.freeze({
    feed: Object.freeze({ paths: Object.freeze(["/content/me", "/intel/me"]), credentials: "include", label: "member intel feed" }),
    categories: Object.freeze({ paths: Object.freeze(["/categories"]), credentials: "same-origin", label: "categories" }),
    rankings: Object.freeze({ paths: Object.freeze(["/rank?limit=20&page=0"]), credentials: "same-origin", label: "rankings" })
  });
  const isObject = value => !!value && typeof value === "object" && !Array.isArray(value);
  const text = value => typeof value === "string" ? value : value == null ? "" : String(value);

  class ApiError extends Error {
    constructor(message, kind = "service", status = 0) {
      super(message);
      this.name = "GoodIntelligenceApiError";
      this.kind = kind;
      this.status = status;
    }
  }

  function normalizeApiBase(value, origin = (window.location && window.location.origin) || "https://harshalos.invalid") {
    const raw = text(value).trim();
    if (!raw) throw new TypeError("Enter a Good Intelligence API base URL.");
    let url;
    try { url = new URL(raw, origin); }
    catch { throw new TypeError("The API base URL is not valid."); }

    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new TypeError("Use an HTTP(S) API URL without credentials, query parameters, or a fragment.");
    }
    const sameOrigin = url.origin === origin;
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (!sameOrigin && ["localhost", "127.0.0.1", "::1"].includes(host)) {
      throw new TypeError("For a local backend, configure a same-origin proxy path instead of calling localhost from the browser.");
    }
    if (!sameOrigin && url.protocol !== "https:") {
      throw new TypeError("Cross-origin API connections must use HTTPS.");
    }

    let pathname = url.pathname.replace(/\/+$/, "");
    if (!pathname) pathname = "/v1";
    else if (!/\/v1$/i.test(pathname)) pathname += "/v1";
    return sameOrigin ? pathname : `${url.origin}${pathname}`;
  }

  function getApiBase() {
    try {
      const saved = window.localStorage && window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const normalized = normalizeApiBase(saved);
        if (normalized === LEGACY_PRODUCTION_API_BASE) {
          try { window.localStorage.setItem(STORAGE_KEY, DEFAULT_API_BASE); }
          catch { /* Keep the safer demo default for this session. */ }
          return DEFAULT_API_BASE;
        }
        return normalized;
      }
    } catch { /* Local settings are optional. */ }
    return DEFAULT_API_BASE;
  }

  function setApiBase(value) {
    const normalized = normalizeApiBase(value);
    try { window.localStorage && window.localStorage.setItem(STORAGE_KEY, normalized); }
    catch { /* Keep this session usable when storage is unavailable. */ }
    return normalized;
  }

  const messageKind = message => /not.?found|unknown route|no route/i.test(message) ? "route"
    : /not.?authori[sz]ed|unauthori[sz]ed|forbidden|sign.?in|missing.*token|token.*missing|session.*required|authentication/i.test(message) ? "auth" : "service";

  function unwrap(payload) {
    let value = payload;
    for (let depth = 0; depth < 3; depth++) {
      if (!isObject(value)) break;
      if (value.success === false || value.Success === false) {
        const message = text(value.message || value.error || value.userMessage || "The Good Intelligence API rejected the request.");
        throw new ApiError(message, messageKind(message));
      }
      if (Object.prototype.hasOwnProperty.call(value, "data")) value = value.data;
      else if (Object.prototype.hasOwnProperty.call(value, "Data")) value = value.Data;
      else break;
    }
    return value;
  }

  async function readJson(response, section) {
    const contentType = response.headers && response.headers.get ? response.headers.get("content-type") || "" : "";
    let payload = null;
    if (/json/i.test(contentType) || !contentType) {
      try { payload = await response.json(); }
      catch { payload = null; }
    }
    if (!response.ok) {
      const message = isObject(payload) ? text(payload.message || payload.error || payload.userMessage) : "";
      const status = Number(response.status) || 0;
      const kind = status === 401 || status === 403 ? "auth" : status === 404 ? "route" : status === 429 ? "rate" : status >= 500 ? "service" : "http";
      throw new ApiError(message || `${section} request failed (HTTP ${status || "unknown"}).`, kind, status);
    }
    if (payload === null) {
      throw new ApiError(`${section} returned a response that was not readable JSON.`, "format", Number(response.status) || 0);
    }
    return unwrap(payload);
  }

  async function getSection(section, apiBase, signal) {
    const route = ROUTES[section];
    if (!route) throw new TypeError("Unknown Good Intelligence read route.");
    const fetcher = window.fetch || globalThis.fetch;
    if (typeof fetcher !== "function") throw new ApiError("This browser does not provide fetch().", "unsupported");

    const controller = typeof AbortController === "function" ? new AbortController() : null;
    let timeout = null;
    let abortListener = null;
    if (controller) {
      timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      if (signal) {
        if (signal.aborted) controller.abort();
        else {
          abortListener = () => controller.abort();
          signal.addEventListener("abort", abortListener, { once: true });
        }
      }
    }

    try {
      for (let index = 0; index < route.paths.length; index++) {
        try {
          const response = await fetcher(`${apiBase}${route.paths[index]}`, {
            method: "GET",
            credentials: route.credentials,
            cache: "no-store",
            redirect: "error",
            headers: { Accept: "application/json" },
            ...(controller ? { signal: controller.signal } : signal ? { signal } : {})
          });
          return await readJson(response, route.label);
        } catch (error) {
          if (error instanceof ApiError && error.kind === "route" && index < route.paths.length - 1) continue;
          throw error;
        }
      }
      throw new ApiError(`${route.label} route is not available.`, "route", 404);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if ((signal && signal.aborted) || (error && error.name === "AbortError")) {
        throw new ApiError("The request was cancelled or timed out.", "cancelled");
      }
      throw new ApiError("Could not reach the API. Check the network, endpoint, and browser CORS/cookie configuration.", "network");
    } finally {
      if (timeout !== null) clearTimeout(timeout);
      if (signal && abortListener) signal.removeEventListener("abort", abortListener);
    }
  }

  function recordsFrom(value) {
    if (Array.isArray(value)) return value.filter(isObject);
    if (!isObject(value)) return [];
    const keys = ["items", "Items", "content", "Content", "contents", "Contents", "posts", "Posts", "intels", "Intels", "addresses", "Addresses", "categories", "Categories", "results", "Results"];
    for (const key of keys) if (Array.isArray(value[key])) return value[key].filter(isObject);
    for (const key of ["data", "Data", "result", "Result"]) {
      if (value[key] && typeof value[key] === "object") {
        const nested = recordsFrom(value[key]);
        if (nested.length) return nested;
      }
    }
    return [];
  }

  function plainText(value) {
    return text(value)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/(?:p|div|li|h[1-6])\s*>/gi, "\n")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, "\"")
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function firstValue(object, keys) {
    for (const key of keys) {
      const value = object && object[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return "";
  }

  function normalizeIntel(record, index = 0) {
    const categoryValue = firstValue(record, ["category", "categoryName", "category_name", "topic"]);
    const category = isObject(categoryValue) ? firstValue(categoryValue, ["name", "title", "label"]) : categoryValue;
    const body = firstValue(record, ["body", "content", "description", "summary", "text"]);
    const date = firstValue(record, ["publishedAt", "published_at", "createdAt", "created_at", "timestamp", "date"]);
    const provider = firstValue(record, ["provider", "intelProvider", "author", "owner"]);
    const providerObject = isObject(provider) ? provider : null;
    const providerText = typeof provider === "string" ? provider.trim() : "";
    const providerIsAddress = /^0x[a-f0-9]{40}$/i.test(providerText);
    const address = firstValue(record, ["address", "authorAddress", "ownerAddress", "providerAddress"]) ||
      (providerObject ? firstValue(providerObject, ["address", "walletAddress", "account"]) : providerIsAddress ? providerText : "");
    const sourceId = firstValue(record, ["sourceId", "providerId", "authorId", "creatorId"]) ||
      (providerObject ? firstValue(providerObject, ["id", "_id", "sourceId"]) : "");
    const providerName = firstValue(record, ["providerName", "authorName", "intelProviderName"]) ||
      (providerObject ? firstValue(providerObject, ["name", "displayName", "username", "label"]) : providerText && !providerIsAddress ? providerText : "");
    const rawAssurance = firstValue(record, ["assurance", "assurancePacket"]);
    const assurance = window.GoodIntelligenceAssurance && typeof window.GoodIntelligenceAssurance.normalizePacket === "function"
      ? window.GoodIntelligenceAssurance.normalizePacket(rawAssurance) : null;
    const rawMarketContext = firstValue(record, ["marketContext", "marketData"]);
    const marketContext = window.GoodIntelligenceMarketContext && typeof window.GoodIntelligenceMarketContext.normalizePacket === "function"
      ? window.GoodIntelligenceMarketContext.normalizePacket(rawMarketContext) : null;
    return {
      id: text(firstValue(record, ["id", "_id", "intelID", "intelId", "contentId"]) || `intel-${index + 1}`),
      title: plainText(firstValue(record, ["title", "headline", "name", "subject"]) || "Untitled intel"),
      body: plainText(isObject(body) ? firstValue(body, ["html", "text", "value"]) : body),
      category: plainText(category || "General") || "General",
      address: text(address),
      sourceId: text(sourceId),
      providerName: plainText(providerName),
      date: text(date),
      block: text(firstValue(record, ["block", "blockNumber", "block_number"])),
      assurance,
      marketContext,
      demo: record.demo === true
    };
  }

  function normalizeCategory(record, index = 0) {
    const name = plainText(firstValue(record, ["name", "title", "label"]) || (typeof record === "string" ? record : ""));
    return name ? { id: text(firstValue(record, ["id", "_id"]) || `category-${index + 1}`), name } : null;
  }

  function finiteNumber(value) {
    if (value === "" || value == null) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function normalizeRanking(record, index = 0) {
    return {
      address: text(firstValue(record, ["address", "owner", "account"])),
      rank: finiteNumber(firstValue(record, ["rank", "position"])) ?? index + 1,
      score: finiteNumber(firstValue(record, ["score", "points"])),
      tokens: text(firstValue(record, ["tokens", "balance", "tokenBalance"])),
      block: finiteNumber(firstValue(record, ["block", "blockNumber"]))
    };
  }

  function safeError(error) {
    if (!error) return null;
    return {
      kind: text(error.kind || "service"),
      message: text(error.message || "The request could not be completed.").slice(0, 260),
      status: Number(error.status) || 0
    };
  }

  async function section(sectionName, apiBase, signal, normalize) {
    try {
      const data = await getSection(sectionName, apiBase, signal);
      const rows = recordsFrom(data).map((row, index) => normalize(row, index)).filter(Boolean);
      return { rows, error: null };
    } catch (error) {
      return { rows: [], error: safeError(error) };
    }
  }

  async function loadDashboard({ apiBase = getApiBase(), signal } = {}) {
    const base = normalizeApiBase(apiBase);
    const [feed, categories, rankings] = await Promise.all([
      section("feed", base, signal, normalizeIntel),
      section("categories", base, signal, normalizeCategory),
      section("rankings", base, signal, normalizeRanking)
    ]);
    rankings.rows.sort((a, b) => a.rank - b.rank);
    return {
      apiBase: base,
      feed: feed.rows,
      categories: categories.rows,
      rankings: rankings.rows,
      errors: { feed: feed.error, categories: categories.error, rankings: rankings.error },
      completedAt: new Date().toISOString()
    };
  }

  return Object.freeze({
    DEFAULT_API_BASE, ROUTES, ApiError, normalizeApiBase, getApiBase, setApiBase,
    recordsFrom, plainText, normalizeIntel, normalizeCategory, normalizeRanking,
    loadDashboard
  });
})();
