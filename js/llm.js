/* ═══════════════════════════════════════════════════════════════
   HarshalOS — LLM connection points (window.HOSLLM)

   Bring your own model. Nothing in HarshalOS requires a link: with no
   connection every app behaves exactly as before. With a connection, the
   model reads only what this browser has already retrieved, and its
   reading is a suggestion a person must accept.

   Rules this module holds itself to:
     · The key stays in this browser. It is sent to exactly one place —
       the endpoint the custodian chose. There is no HarshalOS server in
       the path, and this module never logs it.
     · Session storage by default, cleared when the tab closes. Persistent
       storage is opt-in because a browser cannot hide a key from someone
       with access to that browser.
     · Google Gemini uses Google's official @google/genai browser SDK,
       loaded lazily from a pinned jsDelivr ESM URL. The SDK code is fetched
       from jsDelivr; prompts and keys go only to the chosen API endpoint.
     · Providers that refuse browser calls (api.openai.com) are labelled,
       not faked: the preset says so and points at the relay or a local
       server instead.
     · The relay preset is this deployment's own Worker route (/api/llm), which
       serves Z.AI's free tier. When it is configured the provider key is the
       operator's Worker secret and no key is sent from this browser — but the
       prompts do pass through that Worker, and relayStatus() asks it what it
       actually has instead of guessing.
     · Failures are explained in plain language and never echo the key.

   Exposed as window.HOSLLM. No build-time dependencies.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

window.HOSLLM = (() => {
  // An LLM response is evidence-shaped text only. This layer receives no
  // kernel capability and never dispatches model tools or executable output.
  const AUTHORITY_PLANE = Object.freeze({
    name: "DATA-ONLY",
    modelOutputTrust: "UNTRUSTED",
    kernelCapability: false,
    phaseWriteCapability: false,
    sessionWriteCapability: false,
    actionAuthorizationCapability: false,
    badgeIssuanceCapability: false,
    codeExecution: false,
    humanReviewRequired: true
  });
  const dataOnlyResult = fields => {
    const metadata = { ...fields };
    if (metadata.usage && typeof metadata.usage === "object") metadata.usage = Object.freeze({ ...metadata.usage });
    return Object.freeze({
      ...metadata,
      authorityPlane: AUTHORITY_PLANE.name,
      trustedForAuthority: false,
      executable: false
    });
  };

  const SETTINGS_KEY = "hos-llm-settings-v1";
  const KEY_SESSION = "hos-llm-key";
  const KEY_PERSIST = "hos-llm-key-persistent";

  /* ──────────────────────────────────────────────────────────────
     Providers. `browser` records what the provider actually allows
     from a page like this one — it is a disclosure, not a promise.
     ────────────────────────────────────────────────────────────── */
  const PROVIDERS = {
    anthropic: {
      label: "Anthropic (Claude)",
      protocol: "anthropic",
      endpoint: "https://api.anthropic.com/v1/messages",
      modelsEndpoint: "https://api.anthropic.com/v1/models",
      model: "claude-sonnet-4-5",
      context: 200000,
      browser: "direct",
      note: "Claude's API answers browser calls when the request declares direct browser access — the pattern Anthropic documents for bring-your-own-key clients. The key travels from this browser straight to Anthropic."
    },
    google: {
      label: "Google Gemini Developer API (GenAI SDK)",
      protocol: "google",
      endpoint: "https://generativelanguage.googleapis.com",
      modelsEndpoint: "https://generativelanguage.googleapis.com/v1beta/models",
      model: "gemini-3.8-flash",
      context: 1000000,
      browser: "direct",
      note: "Uses Google's official @google/genai browser SDK (pinned at 2.26.0), loaded on demand through jsDelivr's ESM endpoint. Prompts and the key go directly to the configured Gemini Developer API base URL. Google's Free Tier is finite, project/model-scoped, and its prompts/responses may be used to improve Google products; don't send confidential data. The optional local RPM/input-TPM/RPD guard uses limits you copy from AI Studio, but cannot see traffic from other clients. Google recommends keeping production API keys server-side; this BYOK browser key is visible to anyone with access to this browser."
    },
    openrouter: {
      label: "OpenRouter (many models, one key)",
      protocol: "openai",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      modelsEndpoint: "https://openrouter.ai/api/v1/models",
      model: "anthropic/claude-sonnet-4.5",
      context: 200000,
      browser: "direct",
      browserNote: "OpenRouter sends permissive CORS headers, so a page can call it directly.",
      note: "OpenRouter answers browser calls, so the key travels from this browser straight to OpenRouter. One key reaches Claude, GPT, Gemini, Llama and others."
    },
    openai: {
      label: "OpenAI",
      protocol: "openai",
      endpoint: "https://api.openai.com/v1/chat/completions",
      modelsEndpoint: "https://api.openai.com/v1/models",
      model: "gpt-5",
      context: 200000,
      browser: "blocked",
      note: "OpenAI's API does not answer browser (CORS) requests, so a direct link from a web page cannot work — the browser will block it. Use OpenRouter for the same models, a local model, or this site's relay if it has one."
    },
    local: {
      label: "Local model (Ollama, LM Studio, llama.cpp)",
      protocol: "openai",
      endpoint: "http://localhost:11434/v1/chat/completions",
      modelsEndpoint: "http://localhost:11434/v1/models",
      model: "llama3.1",
      context: 128000,
      browser: "direct",
      keyOptional: true,
      note: "Nothing leaves this machine. The local server must allow requests from this page's origin, and the page must be served over http on localhost or https for the browser to permit the call."
    },
    relay: {
      label: "Z.AI free tier — this site's relay (/api/llm)",
      protocol: "openai",
      endpoint: "/api/llm",
      modelsEndpoint: "/api/llm/models",
      model: "glm-4.5-flash",
      context: 128000,
      browser: "direct",
      keyOptional: true,
      relay: true,
      note: "The Z.AI key lives in this deployment's Cloudflare Worker secret, never in this browser — no key to paste. Prompts pass through that Worker on their way to api.z.ai. Only Z.AI's $0 free-tier models (glm-4.5-flash, glm-4.7-flash) are accepted; calls are plain text with no tools, images or streaming. Production applies local caller and shared-key pace guards; a branch preview may have those guards disabled for an operator-requested test, but Z.AI's own free-tier limits still apply. A deployment without the secret answers 503; Check relay reports its status. Z.AI samples in [0,1], so 0 is sent as do_sample:false (greedy) and a temperature above 1 is clamped to 1."
    },
    custom: {
      label: "Custom endpoint",
      protocol: "openai",
      endpoint: "",
      modelsEndpoint: "",
      model: "",
      context: 128000,
      browser: "direct",
      note: "Any OpenAI-compatible or Anthropic-compatible endpoint, including a self-hosted gateway. Choose the protocol that matches it and enter the full URL."
    }
  };
  Object.values(PROVIDERS).forEach(provider => Object.freeze(provider));
  Object.freeze(PROVIDERS);

  /* ──────────────────────────────────────────────────────────────
     Settings + key storage
     ────────────────────────────────────────────────────────────── */
  const defaults = () => ({ provider: "anthropic", protocol: "", endpoint: "", model: "", persist: false });
  function loadSettings() {
    try {
      const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      const merged = { ...defaults(), ...(raw && typeof raw === "object" ? raw : {}) };
      if (!PROVIDERS[merged.provider]) merged.provider = "anthropic";
      return merged;
    } catch { return defaults(); }
  }
  function saveSettings(patch) {
    const next = { ...loadSettings(), ...patch };
    /* A learned token ceiling belongs to the key and endpoint it was stated
       for. Reconnecting starts from what the caller asks for again. */
    clearCeiling();
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ provider: next.provider, protocol: next.protocol, endpoint: next.endpoint, model: next.model, persist: next.persist })); } catch { /* Preferences are not worth a crash. */ }
    return next;
  }
  const preset = name => PROVIDERS[name] || PROVIDERS.custom;
  function inferredModelsEndpoint(endpoint) {
    try {
      const url = new URL(endpoint, location.origin);
      if (!/^https?:$/.test(url.protocol)) return "";
      const pathname = url.pathname.replace(/\/+$/, "");
      if (!/\/(?:chat\/completions|messages)$/.test(pathname)) return "";
      url.pathname = pathname.replace(/\/(?:chat\/completions|messages)$/, "/models");
      url.hash = "";
      return url.href;
    } catch { return ""; }
  }
  function resolved(settings = loadSettings()) {
    const base = preset(settings.provider);
    const configuredEndpoint = String(settings.endpoint || "").trim();
    const endpoint = (configuredEndpoint || base.endpoint || "").trim();
    const keepsPreset = !configuredEndpoint || configuredEndpoint === String(base.endpoint || "").trim();
    const selectedProtocol = settings.protocol || base.protocol;
    return {
      provider: settings.provider,
      label: base.label,
      protocol: selectedProtocol === "anthropic" ? "anthropic" : selectedProtocol === "google" ? "google" : "openai",
      endpoint,
      modelsEndpoint: keepsPreset ? (base.modelsEndpoint || "") : inferredModelsEndpoint(endpoint),
      context: base.context || 128000,
      browser: base.browser || "direct",
      relay: base.relay === true,
      keyOptional: base.keyOptional === true,
      note: base.note || "",
      model: (settings.model || base.model || "").trim()
    };
  }

  /* A browser that refuses storage must not silently lose the key: the
     link falls back to memory for this page, and says so. */
  let memoryKey = "";
  const readSessionKey = () => { try { return sessionStorage.getItem(KEY_SESSION) || ""; } catch { return ""; } };
  const readPersistedKey = () => { try { return localStorage.getItem(KEY_PERSIST) || ""; } catch { return ""; } };
  const apiKey = () => readSessionKey() || readPersistedKey() || memoryKey;

  function setKey(value, persist = loadSettings().persist) {
    const key = typeof value === "string" ? value.trim() : "";
    try { sessionStorage.removeItem(KEY_SESSION); } catch { /* ignore */ }
    try { localStorage.removeItem(KEY_PERSIST); } catch { /* ignore */ }
    memoryKey = "";
    invalidateGoogleModelCatalog();
    if (key) {
      let stored = false;
      try { (persist ? localStorage : sessionStorage).setItem(persist ? KEY_PERSIST : KEY_SESSION, key); stored = true; } catch { /* fall through */ }
      if (!stored) memoryKey = key;
    }
    saveSettings({ persist: !!persist });
    return keyStorage();
  }
  function clearKey() {
    memoryKey = "";
    invalidateGoogleModelCatalog();
    try { sessionStorage.removeItem(KEY_SESSION); } catch { /* ignore */ }
    try { localStorage.removeItem(KEY_PERSIST); } catch { /* ignore */ }
    return keyStorage();
  }
  function keyStorage() {
    if (readSessionKey()) return "session";
    if (readPersistedKey()) return "persistent";
    if (memoryKey) return "memory";
    return "none";
  }
  /* A masked hint so a person can tell which key is loaded without it
     being readable at a glance. */
  function keyHint() {
    const key = apiKey();
    if (!key) return "";
    return key.length <= 10 ? `${key.slice(0, 3)}…${key.slice(-2)}` : `${key.slice(0, 5)}…${key.slice(-4)}`;
  }
  function redact(message) {
    const key = apiKey();
    const tainted = typeof message === "string" ? message : message instanceof Error ? message.message : String(message ?? "");
    if (!key || key.length < 8) return tainted;
    return tainted.split(key).join("••••(key redacted)");
  }
  const looksLikeKey = value => typeof value === "string" && /^(sk-|sk_|sk-ant-|gsk_|or-|[A-Za-z0-9_-]{20,})$/.test(value.trim());

  function status() {
    const settings = loadSettings();
    const config = resolved(settings);
    const storage = keyStorage();
    const key = apiKey();
    const ready = !!config.endpoint && !!config.model && (!!key || config.keyOptional || config.relay);
    return {
      linked: ready, provider: config.provider, label: config.label, model: config.model,
      endpoint: config.endpoint, protocol: config.protocol, context: config.context,
      browser: config.browser, relay: config.relay, keyOptional: config.keyOptional,
      keyStorage: storage, keyHint: keyHint(), hasKey: !!key, note: config.note,
      storageNote: storage === "memory" ? "This page cannot use browser storage, so the key is held in memory and will be gone when the page reloads." : "",
      reason: !config.endpoint ? "No endpoint is configured." : !config.model ? "No model is named." : (!key && !config.keyOptional && !config.relay) ? "No key is loaded." : ""
    };
  }

  /* ──────────────────────────────────────────────────────────────
     Network
     ────────────────────────────────────────────────────────────── */
  class LlmError extends Error {
    constructor(message, { status = 0, kind = "error", hint = "", affordable = 0, requested = 0, retryAfterMs = 0 } = {}) {
      super(message);
      this.name = "LlmError";
      this.status = status;
      this.kind = kind;
      this.hint = hint;
      /* Only set on a "budget" refusal: the ceiling the provider stated. */
      this.affordable = affordable;
      this.requested = requested;
      this.retryAfterMs = retryAfterMs;
    }
  }
  function describe(error) {
    if (error instanceof LlmError) return {
      title: ({
        cors: "THE BROWSER BLOCKED THE CALL", auth: "THE KEY WAS REJECTED", model: "THE MODEL WAS REJECTED",
        "model-list": "MODEL LIST UNAVAILABLE", sdk: "GOOGLE GENAI SDK UNAVAILABLE", rate: "RATE LIMITED",
        budget: "THE TOKEN CEILING IS UNAFFORDABLE", busy: "THE PROVIDER IS STILL SETTLING REQUESTS",
        quota: "THE GOOGLE API QUOTA IS EXHAUSTED", pace: "THE LOCAL GOOGLE PACE GUARD HELD THIS CALL", billing: "THE PROVIDER REFUSED THE CALL", timeout: "NO COMPLETE RESPONSE"
      })[error.kind] || "THE MODEL CALL FAILED",
      detail: error.message, hint: error.hint
    };
    if (error && error.name === "AbortError") return { title: "CALL CANCELED", detail: "The call was canceled before it finished. No reading was recorded.", hint: "" };
    return { title: "THE MODEL CALL FAILED", detail: redact(error instanceof Error ? error.message : String(error ?? "Unknown error")), hint: "Retry, or check the connection in the LLM Link app." };
  }
  /* Providers answer a failure in their own JSON shape, and this site's relay
     answers in OpenAI's. Show the sentence that was written instead of the raw
     payload; the raw text is still what the budget and parameter-rename checks
     read, so nothing is hidden from them. */
  function readableDetail(detail) {
    const text = String(detail ?? "").trim();
    if (!text) return "";
    if (!/^[{[]/.test(text)) return text.slice(0, 400);
    try {
      const parsed = JSON.parse(text);
      const error = parsed && parsed.error;
      const message = typeof error === "string" ? error
        : error && typeof error.message === "string" ? error.message
        : parsed && typeof parsed.message === "string" ? parsed.message : "";
      const trimmed = String(message).trim();
      return trimmed ? trimmed.slice(0, 400) : text.slice(0, 400);
    } catch { return text.slice(0, 400); }
  }
  function classifyHttp(provider, httpStatus, detail) {
    const budget = parseBudget(detail, httpStatus);
    if (budget) return budgetError(provider, budget, 0, detail);
    const relay = provider.relay === true;
    const hint = httpStatus === 401 || httpStatus === 403
      ? relay
        ? "This deployment's relay refused the caller. It accepts same-origin browser requests only, and it holds the provider key itself — there is no key to paste here."
        : `Check the key for ${provider.label}. It must be valid for this exact endpoint.`
      : httpStatus === 404 ? (provider.modelsEndpoint ? "Check the model name and the endpoint URL. The List models button shows what this key can use." : "Check the endpoint URL and the model name.")
      : httpStatus === 429 ? (relay
        ? (/This relay allows|shared Z\.A\.I free-tier key|Too many model-list requests/i.test(readableDetail(detail))
          ? "This deployment's Worker-local pace guard refused the call before it reached Z.AI. Wait for the stated retry time; the refusal is not evidence, and this question remains UNKNOWN, not wrong."
          : "Z.AI itself rate-limited the Worker-held key. The preview may have local pace guards disabled, but Z.AI's own free-tier limits still apply. Wait for the provider's retry time, then retry; a refused call is not evidence, and its question stays UNKNOWN rather than wrong.")
        : "The provider is rate-limiting. A stated delay of 15 seconds or less is waited out automatically, so this one was longer or it repeated: wait and retry, or lower the reading batch size.")
      : httpStatus === 503 && relay ? "The relay is not configured on this deployment. /api/llm/status names the Worker secret its operator has to add."
      : httpStatus === 502 && relay && /could not be reached/i.test(readableDetail(detail))
        ? "The relay Worker could not get an HTTP response from Z.AI. This points to the Worker-to-provider connection, not a model answer. Cloudflare Worker logs record only a sanitized error category—never the key or prompt."
        : httpStatus >= 500 ? "The provider is having trouble. Retry shortly."
        : "";
    const kind = httpStatus === 401 || httpStatus === 403 ? "auth" : httpStatus === 404 ? "model" : httpStatus === 429 ? "rate" : httpStatus >= 500 ? "provider" : "error";
    return new LlmError(readableDetail(detail) || `The endpoint returned HTTP ${httpStatus}.`, { status: httpStatus, kind, hint });
  }
  const corsError = provider => new LlmError(
    `The request to ${provider.endpoint} never reached the provider: the browser blocked it.`,
    { kind: "cors", hint: provider.browser === "blocked" ? provider.note : "This usually means the provider does not send CORS headers, the endpoint URL is wrong, or an extension is blocking the request. A same-origin relay or a local model avoids this entirely." }
  );

  /* This site has no bundler or package runtime. Load the official package's
     browser entry only when a Google model is listed, tested, or called. Pin
     the version so a CDN-side latest tag cannot silently change the client. */
  const GOOGLE_GENAI_SDK_VERSION = "2.26.0";
  const GOOGLE_GENAI_SDK_URL = `https://cdn.jsdelivr.net/npm/@google/genai@${GOOGLE_GENAI_SDK_VERSION}/+esm`;
  const defaultGoogleSDKLoader = () => import(GOOGLE_GENAI_SDK_URL);
  let googleSDKLoader = defaultGoogleSDKLoader;
  let googleSDKPromise = null;
  function setGoogleSDKLoaderForTests(loader) {
    googleSDKLoader = typeof loader === "function" ? loader : defaultGoogleSDKLoader;
    googleSDKPromise = null;
  }
  function googleSDKLoadError(error) {
    if (error instanceof LlmError) return error;
    const detail = redact(error instanceof Error ? error.message : String(error || "SDK import failed")).slice(0, 400);
    return new LlmError(`The official @google/genai@${GOOGLE_GENAI_SDK_VERSION} browser SDK could not be loaded${detail ? `: ${detail}` : "."}`, {
      kind: "sdk",
      hint: "Check network access to cdn.jsdelivr.net. Only SDK code is fetched from jsDelivr; prompts and API keys are sent to the configured API base URL."
    });
  }
  function loadGoogleSDK() {
    if (!googleSDKPromise) {
      googleSDKPromise = Promise.resolve().then(() => googleSDKLoader()).then(module => {
        if (!module || typeof module.GoogleGenAI !== "function") throw new Error("The module did not export GoogleGenAI.");
        return module;
      }).catch(error => {
        googleSDKPromise = null;
        throw googleSDKLoadError(error);
      });
    }
    return googleSDKPromise;
  }
  const abortReason = signal => signal && signal.reason instanceof Error ? signal.reason : new DOMException("Canceled.", "AbortError");
  function waitForSignal(promise, signal) {
    if (!signal) return Promise.resolve(promise);
    if (signal.aborted) return Promise.reject(abortReason(signal));
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = callback => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        callback();
      };
      const onAbort = () => finish(() => reject(abortReason(signal)));
      signal.addEventListener("abort", onAbort, { once: true });
      Promise.resolve(promise).then(value => finish(() => resolve(value)), error => finish(() => reject(error)));
    });
  }
  function googleClient(module, provider, key) {
    const options = { apiKey: key };
    let baseUrl = String(provider.endpoint || "").trim();
    while (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
    if (baseUrl) options.httpOptions = { baseUrl };
    return new module.GoogleGenAI(options);
  }
  const GOOGLE_RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
  const GOOGLE_RETRY_BACKOFF_MS = [1000, 2000, 4000];
  const GOOGLE_MAX_RETRIES = GOOGLE_RETRY_BACKOFF_MS.length;
  const GOOGLE_RETRY_JITTER_MS = 500;

  function parseGoogleDuration(value) {
    const match = String(value ?? "").trim().match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h)?/i);
    if (!match) return null;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount < 0) return null;
    const factor = ({ ms: 1, s: 1000, m: 60000, h: 3600000 })[(match[2] || "s").toLowerCase()];
    return amount * factor;
  }
  function parseGoogleRetryAfterHeader(error) {
    const headers = error && (error.headers || (error.response && error.response.headers));
    let value = "";
    try { value = headers && typeof headers.get === "function" ? headers.get("retry-after") : headers && (headers["retry-after"] || headers["Retry-After"]); } catch { /* Optional SDK response metadata. */ }
    if (value == null || value === "") return null;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
    const date = Date.parse(String(value));
    return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
  }
  function googleErrorMetadata(error) {
    const originalMessage = error instanceof Error ? error.message : String(error ?? "Google GenAI request failed");
    const possiblePayloads = [error && error.body, error && error.response && (error.response.data || error.response.body), error && error.error];
    let payload = null;
    for (const candidate of possiblePayloads) {
      if (candidate && typeof candidate === "object") { payload = candidate; break; }
      if (typeof candidate === "string") {
        try { payload = JSON.parse(candidate); break; } catch { /* Try the next representation. */ }
      }
    }
    if (!payload && originalMessage) {
      const start = originalMessage.indexOf("{");
      const end = originalMessage.lastIndexOf("}");
      if (start >= 0 && end > start) {
        try { payload = JSON.parse(originalMessage.slice(start, end + 1)); } catch { /* Keep the readable SDK message. */ }
      }
    }
    const root = payload && payload.error && typeof payload.error === "object" ? payload.error : payload || {};
    const details = Array.isArray(root.details) ? root.details : Array.isArray(payload && payload.details) ? payload.details : [];
    const retryInfo = details.find(detail => detail && /RetryInfo/i.test(String(detail["@type"] || detail.type || "")));
    const quotaInfo = details.find(detail => detail && /QuotaFailure/i.test(String(detail["@type"] || detail.type || "")));
    const violations = quotaInfo && Array.isArray(quotaInfo.violations) ? quotaInfo.violations : [];
    const quotaId = violations.map(item => item && (item.quotaId || item.quota_id || item.quotaMetric || item.quota_metric)).find(Boolean) || "";
    const quotaValue = violations.map(item => item && (item.quotaValue || item.quota_value)).find(Boolean) || "";
    const statusText = String(root.status || (payload && payload.status) || "");
    const rawStatus = error && (error.status ?? error.statusCode ?? (error.response && error.response.status));
    const status = Number(rawStatus) || Number(root.code ?? (payload && payload.code)) || (/RESOURCE_EXHAUSTED/i.test(statusText) ? 429 : /UNAVAILABLE/i.test(statusText) ? 503 : 0);
    const retryInText = originalMessage.match(/\b(?:please\s+)?retry\s+in\s+(\d+(?:\.\d+)?)\s*(ms|s|m|h)\b/i);
    const retryAfterMs = parseGoogleDuration(retryInfo && retryInfo.retryDelay)
      ?? (retryInText ? parseGoogleDuration(`${retryInText[1]}${retryInText[2]}`) : null)
      ?? parseGoogleRetryAfterHeader(error);
    const quotaLabel = `${quotaId} ${violations.map(item => item && (item.quotaMetric || item.quota_metric || item.description || "")).join(" ")} ${root.message || originalMessage}`;
    const message = typeof root.message === "string" ? root.message : originalMessage;
    return {
      status, message, originalMessage, retryAfterMs, quotaId, quotaValue,
      dailyQuota: /per[-_ ]?day|daily/i.test(quotaLabel),
      minuteQuota: /per[-_ ]?min(?:ute)?/i.test(quotaLabel)
    };
  }
  function googleSDKRequestError(provider, error, { listing = false } = {}) {
    if (error instanceof LlmError) return error;
    const metadata = googleErrorMetadata(error);
    const message = redact(metadata.message || metadata.originalMessage).slice(0, 2000);
    const status = metadata.status;
    if (status === 404 && listing) return new LlmError(`The model-list request for ${provider.label} returned HTTP 404.`, { status, kind: "model-list", hint: "Check the Google API base URL and key. You can still type a model name manually." });
    if (status === 429 && metadata.dailyQuota) {
      const amount = metadata.quotaValue ? ` (${metadata.quotaValue} requests per day)` : "";
      return new LlmError(`${provider.label} has reached its daily request quota${amount}.`, {
        status, kind: "quota", retryAfterMs: metadata.retryAfterMs || 0,
        hint: "A short retry delay will not clear a per-day quota. Check the quota shown in Google AI Studio or use a project/model with available daily capacity."
      });
    }
    if (status === 429) {
      const wait = metadata.retryAfterMs > 0 ? ` Google asked to wait about ${waitLabel(metadata.retryAfterMs)}.` : "";
      const hint = metadata.minuteQuota
        ? "The call already honored Google's retry delay and bounded retries. Wait for the per-minute window to clear, or lower the request rate / use a model with more capacity."
        : "The call already honored Google's retry delay and bounded retries. Check the project's quota and billing, or wait before running the reading again.";
      return new LlmError(`${provider.label} is still rate-limiting this model.${wait}${message && message !== metadata.originalMessage ? ` Google said: ${message}` : ""}`, {
        status, kind: "rate", retryAfterMs: metadata.retryAfterMs || 0, hint
      });
    }
    if (status) {
      const classified = classifyHttp(provider, status, message);
      if (status === 429 && metadata.retryAfterMs > 0) classified.retryAfterMs = metadata.retryAfterMs;
      if (!classified.hint) classified.hint = "Check that this key can use the Gemini Developer API and that the selected model is available to it.";
      return classified;
    }
    if (error && error.name === "AbortError") return error;
    if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) return corsError(provider);
    return new LlmError(message || "The Google GenAI SDK request failed.", {
      kind: "provider",
      hint: "Check the key, Gemini API access, model name, and browser access to the configured Google API base URL."
    });
  }
  function waitForAbortableDelay(milliseconds, signal) {
    if (signal && signal.aborted) return Promise.reject(abortReason(signal));
    return new Promise((resolve, reject) => {
      let settled = false;
      let timer = null;
      const finish = callback => {
        if (settled) return;
        settled = true;
        if (timer !== null) clearTimeout(timer);
        if (signal) signal.removeEventListener("abort", onAbort);
        callback();
      };
      const onAbort = () => finish(() => reject(abortReason(signal)));
      timer = setTimeout(() => finish(resolve), milliseconds);
      if (signal) signal.addEventListener("abort", onAbort, { once: true });
      if (signal && signal.aborted) onAbort();
    });
  }
  let googleModelCatalogCache = { endpoint: "", rows: [] };
  function invalidateGoogleModelCatalog() {
    googleModelCatalogCache = { endpoint: "", rows: [] };
  }
  function googleModelCatalogRows(rows) {
    const result = [];
    for (const row of rows || []) {
      if (!row || typeof row !== "object") continue;
      const actions = Array.isArray(row.supportedActions)
        ? row.supportedActions
        : Array.isArray(row.supportedGenerationMethods) ? row.supportedGenerationMethods : null;
      if (actions && !actions.includes("generateContent")) continue;
      const rawName = row.name || row.id || row.slug;
      if (typeof rawName !== "string" || !rawName.trim()) continue;
      const trimmedName = rawName.trim();
      const id = trimmedName.startsWith("models/") ? trimmedName.slice(7) : trimmedName;
      if (!id || result.some(item => item.id === id)) continue;
      const inputTokenLimit = Number(row.inputTokenLimit);
      const outputTokenLimit = Number(row.outputTokenLimit);
      result.push({
        id,
        displayName: typeof row.displayName === "string" ? row.displayName.slice(0, 160) : "",
        inputTokenLimit: Number.isSafeInteger(inputTokenLimit) && inputTokenLimit > 0 ? inputTokenLimit : 0,
        outputTokenLimit: Number.isSafeInteger(outputTokenLimit) && outputTokenLimit > 0 ? outputTokenLimit : 0,
        supportedActions: actions ? actions.filter(action => typeof action === "string").slice(0, 20) : []
      });
      if (result.length >= 400) break;
    }
    return result;
  }
  function googleModelsClientRows(rows) { return googleModelCatalogRows(rows).map(row => row.id); }
  async function fetchGoogleModelRows(provider, { signal, timeoutMs = 20000 } = {}) {
    const key = apiKey();
    if (!key) throw new LlmError(`No key is loaded for ${provider.label}.`, { kind: "auth", hint: "Open LLM Link and paste a Gemini API key. The key stays in this browser and is sent directly to the configured API base URL." });
    const controller = new AbortController();
    let timedOut = false;
    const onAbort = () => controller.abort(signal && signal.reason);
    if (signal) {
      if (signal.aborted) throw abortReason(signal);
      signal.addEventListener("abort", onAbort, { once: true });
    }
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      const module = await waitForSignal(loadGoogleSDK(), controller.signal);
      const client = googleClient(module, provider, key);
      const pager = await client.models.list({ config: { pageSize: 100, abortSignal: controller.signal } });
      const rows = [];
      if (pager && typeof pager[Symbol.asyncIterator] === "function") {
        for await (const row of pager) {
          rows.push(row);
          if (rows.length >= 400) break;
        }
      } else if (pager && Array.isArray(pager.page)) rows.push(...pager.page.slice(0, 400));
      else throw new LlmError("Google's SDK returned an unreadable model list.", { kind: "model-list" });
      return rows;
    } catch (error) {
      if (timedOut) throw new LlmError(`Listing Google models did not finish within ${Math.round(timeoutMs / 1000)} seconds.`, { kind: "timeout", hint: "Retry when the network is available, or type a model name manually." });
      if (controller.signal.aborted) throw abortReason(controller.signal);
      throw googleSDKRequestError(provider, error, { listing: true });
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
    }
  }

  async function loadGoogleModels(provider, options = {}) {
    return googleModelsClientRows(await fetchGoogleModelRows(provider, options));
  }
  async function loadGoogleModelCatalog(provider, options = {}) {
    const rows = googleModelCatalogRows(await fetchGoogleModelRows(provider, options));
    googleModelCatalogCache = { endpoint: String(provider && provider.endpoint || "").trim(), rows };
    return rows;
  }
  function googleModelInfo(model = resolved().model) {
    const current = resolved();
    if (current.protocol !== "google" || googleModelCatalogCache.endpoint !== current.endpoint) return null;
    const id = String(model || "").trim().replace(/^models\//, "");
    const row = googleModelCatalogCache.rows.find(item => item.id === id);
    return row ? { ...row, supportedActions: row.supportedActions.slice() } : null;
  }

  async function loadModels(provider, { signal, timeoutMs = 20000 } = {}) {
    if (provider.protocol === "google") return loadGoogleModels(provider, { signal, timeoutMs });
    if (!provider.modelsEndpoint) throw new LlmError("No model-list URL is configured for this connection. Type the model name instead.", { kind: "model-list", hint: "Choose a provider preset, or use a custom OpenAI-compatible or Anthropic endpoint that exposes a /models route. Model listing is optional." });
    const headers = new Headers({ Accept: "application/json" });
    const key = apiKey();
    if (key) applyAuth(headers, provider, key);
    let response;
    try { response = await fetch(provider.modelsEndpoint, { headers, signal, credentials: "omit", referrerPolicy: "no-referrer" }); }
    catch (error) { if (error && error.name === "AbortError") throw error; throw corsError(provider); }
    if (response.status === 404) throw new LlmError(`The model-list endpoint for ${provider.label} returned HTTP 404.`, { status: 404, kind: "model-list", hint: "This connection can still work if you type the model name. Check the provider's GET /models route if listing should be available." });
    if (!response.ok) {
      let detail = `Listing models returned HTTP ${response.status}.`;
      // The site's relay deliberately returns a sanitized explanation for
      // upstream transport errors. Preserve that safe detail for the reader.
      if (provider.relay) {
        try {
          const payload = await response.clone().json();
          if (payload && payload.error && typeof payload.error.message === "string") detail = payload.error.message;
        } catch { /* Keep the generic status if the relay body is not JSON. */ }
      }
      throw classifyHttp(provider, response.status, detail);
    }
    let data;
    try { data = await response.json(); } catch { throw new LlmError("The model list was not valid JSON.", { kind: "model" }); }
    const rows = Array.isArray(data && data.data) ? data.data : Array.isArray(data && data.models) ? data.models : [];
    return rows.map(row => typeof row === "string" ? row : row && (row.id || row.name || row.slug)).filter(id => typeof id === "string" && id).slice(0, 400);
  }

  /* ──────────────────────────────────────────────────────────────
     This deployment's relay

     The relay is optional: a static preview has none, and a Worker with no
     provider secret answers that it is not configured. Asking it is therefore
     a disclosure, not an error path — relayStatus() never throws, and the
     answer carries variable names and limits, never a key value.
     ────────────────────────────────────────────────────────────── */
  function relayStatusEndpoint(config = resolved()) {
    const endpoint = String((config && config.endpoint) || "").trim();
    if (!endpoint) return "/api/llm/status";
    try {
      const url = new URL(endpoint, location.origin || location.href);
      if (!/^https?:$/.test(url.protocol)) return "/api/llm/status";
      url.pathname = `${url.pathname.replace(/\/+$/, "")}/status`;
      url.search = ""; url.hash = "";
      return url.href;
    } catch { return "/api/llm/status"; }
  }
  async function relayStatus({ endpoint = "", timeoutMs = 10000, signal } = {}) {
    const target = String(endpoint || "").trim() || relayStatusEndpoint();
    const unavailable = (reason, extra = {}) => ({ reachable: false, configured: false, endpoint: target, reason, ...extra });
    if (signal && signal.aborted) return unavailable("The relay check was canceled.", { cancelled: true });
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    const onAbort = () => controller.abort();
    if (signal) signal.addEventListener("abort", onAbort, { once: true });
    try {
      let response;
      try {
        response = await fetch(target, { headers: { Accept: "application/json" }, signal: controller.signal, credentials: "same-origin", referrerPolicy: "no-referrer" });
      } catch {
        if (timedOut) return unavailable(`The relay did not answer within ${Math.round(timeoutMs / 1000)} seconds.`);
        if (signal && signal.aborted) return unavailable("The relay check was canceled.", { cancelled: true });
        return unavailable("This page could not reach the relay route at all — usually a static preview with no Worker behind it.");
      }
      if (response.status === 404) return unavailable("This deployment serves no relay status route, so it has no relay. Pick a provider that answers browser calls, or deploy the Worker relay.", { status: 404 });
      const text = typeof response.text === "function" ? await response.text().catch(() => "") : "";
      let data = null;
      try { data = JSON.parse(text); } catch { /* A static server's 404 page, or a proxy, is not a relay. */ }
      if (!data || typeof data !== "object" || typeof data.configured !== "boolean") {
        return unavailable(`The relay route answered HTTP ${response.status} with something that was not a relay status. This is usually the static preview server, which has no Worker.`, { status: response.status });
      }
      return { reachable: true, endpoint: target, status: response.status, ...data };
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
    }
  }

  function applyAuth(headers, provider, key) {
    /* This deployment's relay holds its own key server-side. A key pasted into
       this browser for some other provider must never be forwarded to it — the
       relay ignores a client Authorization header, and so does this module. */
    if (provider.relay === true) return headers;
    if (provider.protocol === "anthropic") {
      if (key) headers.set("x-api-key", key);
      headers.set("anthropic-version", "2023-06-01");
      /* Anthropic's documented switch for bring-your-own-key browser clients. */
      headers.set("anthropic-dangerous-direct-browser-access", "true");
    } else if (provider.protocol === "google") {
      /* The SDK normally applies Google authentication itself; this keeps the
         shared auth helper correct for callers that build a raw request. */
      if (key) headers.set("x-goog-api-key", key);
    } else if (key) {
      headers.set("Authorization", `Bearer ${key}`);
      if (/openrouter\.ai/.test(provider.endpoint)) {
        headers.set("HTTP-Referer", location.origin);
        headers.set("X-Title", "HarshalOS");
      }
    }
    return headers;
  }

  const estimateTokens = value => Math.ceil(String(value ?? "").length / 3.6);

  /* Gemini Developer API quotas are per Cloud project and model, not per key.
     Google does not expose a dependable quota-discovery endpoint to this BYOK
     browser client, so the custodian copies the active RPM / input-TPM / RPD
     numbers from AI Studio. A local sliding-window guard then stays below a
     configurable safety fraction. It is deliberately called a guard, not a
     quota guarantee: it only sees this browser origin, not other keys, apps,
     devices, users, or traffic outside this page. Google remains authoritative.

     Persist only the manually configured caps and a small ledger of request
     timestamps/token estimates. No key, prompt, source text, or model reply is
     written to this ledger. Web Locks coordinate same-origin tabs where the
     browser supports them; the in-page queue is the fallback. */
  const GOOGLE_QUOTA_SETTINGS_KEY = "hos-google-quota-settings-v1";
  const GOOGLE_QUOTA_LEDGER_PREFIX = "hos-google-quota-ledger-v1:";
  const GOOGLE_QUOTA_WINDOW_MS = 60_000;
  const GOOGLE_QUOTA_DEFAULT_SAFETY_PERCENT = 80;
  const GOOGLE_QUOTA_MAX_SETTING = 1_000_000_000;
  const googleQuotaLedgerMemory = new Map();
  const googleQuotaLockQueues = new Map();
  let googleQuotaSettingsMemory = null;
  let googleReservationSequence = 0;

  const cleanGoogleQuotaLimit = value => {
    if (value === null || value === undefined || String(value).trim() === "") return 0;
    const number = Number(value);
    return Number.isSafeInteger(number) && number >= 0
      ? Math.min(number, GOOGLE_QUOTA_MAX_SETTING)
      : 0;
  };
  const emptyGoogleQuotaProfile = () => ({ rpm: 0, tpm: 0, rpd: 0 });
  const googleQuotaProfileKey = (projectId, model) => `${projectId || "__default_browser_group__"}::${model}`;
  function normalizeGoogleQuotaSettings(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const profiles = {};
    if (source.profiles && typeof source.profiles === "object" && !Array.isArray(source.profiles)) {
      for (const [model, profile] of Object.entries(source.profiles).slice(0, 100)) {
        const name = String(model || "").trim().slice(0, 200);
        if (!name || !profile || typeof profile !== "object") continue;
        profiles[name] = {
          rpm: cleanGoogleQuotaLimit(profile.rpm),
          tpm: cleanGoogleQuotaLimit(profile.tpm),
          rpd: cleanGoogleQuotaLimit(profile.rpd)
        };
      }
    }
    const requestedSafety = Number(source.safetyPercent);
    const safetyPercent = Number.isFinite(requestedSafety)
      ? Math.max(50, Math.min(100, Math.round(requestedSafety)))
      : GOOGLE_QUOTA_DEFAULT_SAFETY_PERCENT;
    return {
      projectId: String(source.projectId || "").trim().slice(0, 120),
      safetyPercent,
      profiles
    };
  }
  function readGoogleQuotaSettings() {
    try {
      const raw = localStorage.getItem(GOOGLE_QUOTA_SETTINGS_KEY);
      if (raw) {
        googleQuotaSettingsMemory = normalizeGoogleQuotaSettings(JSON.parse(raw));
        return googleQuotaSettingsMemory;
      }
    } catch { /* Storage may be disabled; keep a non-persistent in-memory copy. */ }
    if (!googleQuotaSettingsMemory) googleQuotaSettingsMemory = normalizeGoogleQuotaSettings(null);
    return googleQuotaSettingsMemory;
  }
  function writeGoogleQuotaSettings(settings) {
    googleQuotaSettingsMemory = normalizeGoogleQuotaSettings(settings);
    try { localStorage.setItem(GOOGLE_QUOTA_SETTINGS_KEY, JSON.stringify(googleQuotaSettingsMemory)); }
    catch { /* Quota pacing still works for this page if storage is unavailable. */ }
    return googleQuotaSettingsMemory;
  }
  function googleQuotaSettings(model = resolved().model) {
    const all = readGoogleQuotaSettings();
    const name = String(model || "").trim().slice(0, 200);
    const profileKey = googleQuotaProfileKey(all.projectId, name);
    const profile = name && all.profiles[profileKey] ? all.profiles[profileKey] : emptyGoogleQuotaProfile();
    return { model: name, projectId: all.projectId, safetyPercent: all.safetyPercent, ...profile };
  }
  function saveGoogleQuotaSettings({ model = resolved().model, projectId, rpm, tpm, rpd, safetyPercent } = {}) {
    const current = readGoogleQuotaSettings();
    const next = { ...current, profiles: { ...current.profiles } };
    if (projectId !== undefined) next.projectId = String(projectId || "").trim().slice(0, 120);
    if (safetyPercent !== undefined) {
      const value = Number(safetyPercent);
      if (Number.isFinite(value)) next.safetyPercent = Math.max(50, Math.min(100, Math.round(value)));
    }
    const name = String(model || "").trim().slice(0, 200);
    if (name) {
      const profileKey = googleQuotaProfileKey(next.projectId, name);
      const previous = next.profiles[profileKey] || emptyGoogleQuotaProfile();
      next.profiles[profileKey] = {
        rpm: rpm === undefined ? previous.rpm : cleanGoogleQuotaLimit(rpm),
        tpm: tpm === undefined ? previous.tpm : cleanGoogleQuotaLimit(tpm),
        rpd: rpd === undefined ? previous.rpd : cleanGoogleQuotaLimit(rpd)
      };
    }
    writeGoogleQuotaSettings(next);
    return googleQuotaSettings(name);
  }
  function googlePacificDayKey(timestamp = Date.now()) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit"
      }).formatToParts(new Date(timestamp));
      const pick = type => parts.find(part => part.type === type)?.value || "00";
      return `${pick("year")}-${pick("month")}-${pick("day")}`;
    } catch {
      return new Date(timestamp).toISOString().slice(0, 10);
    }
  }
  function googlePacificResetDelay(timestamp = Date.now()) {
    const day = googlePacificDayKey(timestamp);
    let low = timestamp;
    let high = timestamp + 36 * 60 * 60 * 1000;
    while (googlePacificDayKey(high) === day) high += 12 * 60 * 60 * 1000;
    for (let step = 0; step < 48; step++) {
      const middle = Math.floor((low + high) / 2);
      if (googlePacificDayKey(middle) === day) low = middle;
      else high = middle;
    }
    return Math.max(1000, high - timestamp);
  }
  const effectiveGoogleQuota = (limit, safetyPercent) => limit
    ? Math.max(1, Math.floor(limit * safetyPercent / 100))
    : 0;
  const googleQuotaLedgerKey = (projectId, model) =>
    `${GOOGLE_QUOTA_LEDGER_PREFIX}${encodeURIComponent(projectId || "__default_browser_group__")}:${encodeURIComponent(model || "unknown-model")}`;
  function readGoogleQuotaLedger(key, now = Date.now()) {
    let raw = null;
    try {
      const stored = localStorage.getItem(key);
      if (stored) raw = JSON.parse(stored);
    } catch { /* Fall back to memory when local storage is unavailable/corrupt. */ }
    if (!raw || typeof raw !== "object") raw = googleQuotaLedgerMemory.get(key) || {};
    const entries = (Array.isArray(raw.entries) ? raw.entries : [])
      .filter(entry => entry && Number.isFinite(Number(entry.at)) && Number.isFinite(Number(entry.inputTokens)))
      .map(entry => ({ id: String(entry.id || ""), at: Number(entry.at), inputTokens: Math.max(0, Number(entry.inputTokens)) }))
      .filter(entry => entry.at > now - GOOGLE_QUOTA_WINDOW_MS)
      .sort((left, right) => left.at - right.at);
    const today = googlePacificDayKey(now);
    return {
      day: today,
      dailyCount: raw.day === today ? cleanGoogleQuotaLimit(raw.dailyCount) : 0,
      entries
    };
  }
  function writeGoogleQuotaLedger(key, ledger) {
    googleQuotaLedgerMemory.set(key, ledger);
    try { localStorage.setItem(key, JSON.stringify(ledger)); }
    catch { /* The in-memory ledger remains usable for the current page. */ }
  }
  async function withGoogleQuotaLock(name, operation) {
    const locks = globalThis.navigator && globalThis.navigator.locks;
    if (locks && typeof locks.request === "function") {
      return locks.request(`hos-google-quota:${name}`, { mode: "exclusive" }, operation);
    }
    const previous = googleQuotaLockQueues.get(name) || Promise.resolve();
    let unlock;
    const barrier = new Promise(resolve => { unlock = resolve; });
    const queued = previous.then(() => barrier);
    googleQuotaLockQueues.set(name, queued);
    await previous;
    try { return await operation(); }
    finally {
      unlock();
      if (googleQuotaLockQueues.get(name) === queued) googleQuotaLockQueues.delete(name);
    }
  }
  function googleQuotaWaitMs(entries, inputTokens, limits, now) {
    let requests = entries.length;
    let tokens = entries.reduce((sum, entry) => sum + entry.inputTokens, 0);
    const allowed = () => (!limits.rpm || requests + 1 <= limits.rpm)
      && (!limits.tpm || tokens + inputTokens <= limits.tpm);
    if (allowed()) return 0;
    for (const entry of entries) {
      requests -= 1;
      tokens -= entry.inputTokens;
      if (allowed()) return Math.max(1, entry.at + GOOGLE_QUOTA_WINDOW_MS - now + 1);
    }
    return 0;
  }
  function googleLocalPaceError(model, reason, { limit = 0, estimate = 0, retryAfterMs = 0 } = {}) {
    const label = model || "the selected model";
    if (reason === "daily") return new LlmError(
      `LLM Link's local guard has reached its configured ${limit}-request daily cap for ${label}. No request was sent.`,
      { status: 429, kind: "pace", retryAfterMs, hint: "The local RPD guard resets at midnight Pacific time. Google enforces its own project quota; check the active project/model limit in AI Studio and account for use from other clients." }
    );
    if (reason === "prompt") return new LlmError(
      `LLM Link's local guard did not send this ${label} prompt: its padded input estimate (${estimate.toLocaleString()} tokens) exceeds the configured per-minute input budget (${limit.toLocaleString()}).`,
      { status: 429, kind: "pace", hint: "Reduce the source text/prompt, choose a model with a larger active TPM limit, or review the project/model limit in AI Studio. This is a local estimate, not a Google error." }
    );
    return new LlmError(
      `LLM Link's local guard did not send the ${label} request because the next project/model quota slot is about ${waitLabel(retryAfterMs)} away.`,
      { status: 429, kind: "pace", retryAfterMs, hint: "Wait for the local rolling-minute window to clear, increase the call timeout, or review the active RPM/TPM limits in AI Studio. No provider request was made for this call." }
    );
  }
  function googleQuotaStatus(model = resolved().model) {
    const name = String(model || "").trim().slice(0, 200);
    const all = readGoogleQuotaSettings();
    const profileKey = googleQuotaProfileKey(all.projectId, name);
    const profile = name && all.profiles[profileKey] ? all.profiles[profileKey] : emptyGoogleQuotaProfile();
    const key = googleQuotaLedgerKey(all.projectId, name);
    const ledger = readGoogleQuotaLedger(key);
    const effective = {
      rpm: effectiveGoogleQuota(profile.rpm, all.safetyPercent),
      tpm: effectiveGoogleQuota(profile.tpm, all.safetyPercent),
      rpd: effectiveGoogleQuota(profile.rpd, all.safetyPercent)
    };
    return {
      model: name,
      projectId: all.projectId,
      projectGroup: all.projectId || "default browser quota group",
      safetyPercent: all.safetyPercent,
      configured: !!(profile.rpm || profile.tpm || profile.rpd),
      actual: { ...profile },
      effective,
      usage: {
        requestsPerMinute: ledger.entries.length,
        inputTokensPerMinute: ledger.entries.reduce((sum, entry) => sum + entry.inputTokens, 0),
        requestsPerDay: ledger.dailyCount
      }
    };
  }
  function estimateGoogleInputTokens(system, user) {
    const text = [String(system || ""), String(user || "")].filter(Boolean).join("\n");
    if (!text) return 1;
    /* A padded character-based estimate avoids an extra countTokens API call.
       It is conservative for the prose/JSON prompts used here, but not a
       tokenizer and cannot perfectly model code, CJK, or provider overhead. */
    let asciiCharacters = 0;
    let otherCodePoints = 0;
    for (const character of text) {
      if (character.codePointAt(0) <= 0x7f) asciiCharacters += 1;
      else otherCodePoints += 1;
    }
    return Math.max(1, Math.ceil(asciiCharacters / 2.8 + otherCodePoints * 1.2));
  }
  async function reserveGoogleGeneration({ model, system, user, signal, onRetry, startedAt, timeoutMs }) {
    const all = readGoogleQuotaSettings();
    const profile = all.profiles[googleQuotaProfileKey(all.projectId, model)] || emptyGoogleQuotaProfile();
    const limits = {
      rpm: effectiveGoogleQuota(profile.rpm, all.safetyPercent),
      tpm: effectiveGoogleQuota(profile.tpm, all.safetyPercent),
      rpd: effectiveGoogleQuota(profile.rpd, all.safetyPercent)
    };
    const inputTokens = estimateGoogleInputTokens(system, user);
    const ledgerKey = googleQuotaLedgerKey(all.projectId, model);
    const lockName = `${all.projectId || "__default_browser_group__"}:${model}`;
    let waits = 0;
    for (;;) {
      const result = await withGoogleQuotaLock(lockName, () => {
        const now = Date.now();
        const ledger = readGoogleQuotaLedger(ledgerKey, now);
        if (limits.rpd && ledger.dailyCount >= limits.rpd) {
          return { blocked: "daily", limit: limits.rpd, waitMs: googlePacificResetDelay(now) };
        }
        if (limits.tpm && inputTokens > limits.tpm) {
          return { blocked: "prompt", limit: limits.tpm, estimate: inputTokens };
        }
        const waitMs = googleQuotaWaitMs(ledger.entries, inputTokens, limits, now);
        if (waitMs) return { waitMs };
        const id = `${now.toString(36)}-${(++googleReservationSequence).toString(36)}-${Math.random().toString(36).slice(2)}`;
        ledger.entries.push({ id, at: now, inputTokens });
        ledger.dailyCount += 1;
        ledger.day = googlePacificDayKey(now);
        writeGoogleQuotaLedger(ledgerKey, ledger);
        return { reservation: { id, ledgerKey, lockName, estimatedInputTokens: inputTokens } };
      });
      if (result.blocked === "daily") throw googleLocalPaceError(model, "daily", { limit: result.limit, retryAfterMs: result.waitMs });
      if (result.blocked === "prompt") throw googleLocalPaceError(model, "prompt", { limit: result.limit, estimate: result.estimate });
      if (result.waitMs) {
        const remaining = timeoutMs - (Date.now() - startedAt);
        if (result.waitMs >= remaining) throw googleLocalPaceError(model, "window", { retryAfterMs: result.waitMs });
        try { if (typeof onRetry === "function") onRetry({ delayMs: result.waitMs, attempt: ++waits, source: "Google local quota guard" }); }
        catch { /* Progress reporting must not break the request. */ }
        await waitForAbortableDelay(result.waitMs, signal);
        activity.googlePaceWaits += 1;
        continue;
      }
      return result.reservation;
    }
  }
  async function settleGoogleReservation(reservation, actualInputTokens) {
    const actual = cleanGoogleQuotaLimit(actualInputTokens);
    if (!reservation || !actual) return;
    await withGoogleQuotaLock(reservation.lockName, () => {
      const now = Date.now();
      const ledger = readGoogleQuotaLedger(reservation.ledgerKey, now);
      const entry = ledger.entries.find(item => item.id === reservation.id);
      if (!entry) return;
      entry.inputTokens = actual;
      writeGoogleQuotaLedger(reservation.ledgerKey, ledger);
    });
  }

  /* Session activity. Kept in memory only: how many calls this page made,
     what they cost in tokens, and how long the last one took. */
  const activity = { calls: 0, failures: 0, input: 0, output: 0, shrunk: 0, inFlightRetries: 0, googlePaceWaits: 0, lastMs: 0, lastModel: "", lastAt: "" };
  const stats = () => ({ ...activity, ceiling: ceiling ? ceiling.maxTokens : 0 });
  const resetStats = () => { Object.assign(activity, { calls: 0, failures: 0, input: 0, output: 0, shrunk: 0, inFlightRetries: 0, googlePaceWaits: 0, lastMs: 0, lastModel: "", lastAt: "" }); };

  /* ──────────────────────────────────────────────────────────────
     The token ceiling the provider will actually sell us

     Some providers price a call by the ceiling it *reserves*, not by the
     tokens it ends up producing, and refuse the request outright when the
     balance cannot cover that reservation:

       {"error":{"message":"This request requires more credits, or fewer
        max_tokens. You requested up to 6000 tokens, but can only afford
        2664. …","code":402,"metadata":{"limit_source":"openrouter_credits"}}}

     That refusal names a number we can work inside. We read it, remember it
     for the rest of the session, and ask again inside it — which is why the
     Ground-0 reading is staged one question per call: many small ceilings
     fit a small balance, one large ceiling does not.
     ────────────────────────────────────────────────────────────── */
  const AFFORDABLE = /(?:can )?only afford(?: up to)?\s*(\d[\d,]*)/i;
  const REQUESTED = /requested up to\s*(\d[\d,]*)/i;
  const IN_FLIGHT_RETRY_DELAYS = [750, 1500, 3000];
  const MAX_AUTO_RETRY_AFTER_MS = 120000; // Longer provider waits are shown, not kept behind a busy progress bar.
  /* A 429 gets a much shorter leash than an in-flight-budget 402. Rate limits
     are usually a pace, and this site's own relay quotes the seconds until its
     sliding window frees a slot — a wait worth absorbing so a Ground-0
     question is answered instead of left UNKNOWN. Anything longer than this is
     shown to the reader rather than spent behind a busy progress bar. */
  const MAX_AUTO_RATE_LIMIT_WAIT_MS = 15000;
  const numberWith = (text, pattern) => { const match = String(text || "").match(pattern); return match ? Number(String(match[1]).replace(/,/g, "")) : 0; };
  /* OpenRouter can refuse a reservation while other requests still hold part
     of the balance. That is temporary pressure, not a smaller token ceiling. */
  const isInFlightBudget = (detail, status) => {
    if (status !== 402) return false;
    const text = String(detail || "");
    if (/in[_ -]flight[_ -]budget|current\s+in[-_ ]flight\s+requests|in[-_ ]flight\s+requests/i.test(text)) return true;
    try {
      const metadata = JSON.parse(text)?.error?.metadata || {};
      return metadata.reason === "in_flight_budget_exhausted" || metadata.limit_source === "openrouter_in_flight_budget";
    } catch { return false; }
  };
  const retryAfterValueMs = value => {
    if (value === null || value === undefined || String(value).trim() === "") return null;
    const text = String(value).trim();
    const seconds = Number(text);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
    const at = Date.parse(text);
    return Number.isFinite(at) ? Math.max(0, at - Date.now()) : null;
  };
  const retryAfterMs = (response, detail = "") => {
    try {
      const header = response && response.headers && response.headers.get && response.headers.get("Retry-After");
      const fromHeader = retryAfterValueMs(header);
      if (fromHeader !== null) return fromHeader;
    } catch { /* The provider may not expose response headers to this page. */ }
    try {
      const metadata = JSON.parse(String(detail || ""))?.error?.metadata || {};
      const fromBody = retryAfterValueMs(metadata.retry_after ?? metadata.retryAfter ?? metadata.headers?.["Retry-After"] ?? metadata.headers?.["retry-after"]);
      if (fromBody !== null) return fromBody;
    } catch { /* The response body may not carry a retry hint. */ }
    return null;
  };
  const waitLabel = milliseconds => {
    const seconds = Math.max(1, Math.ceil(milliseconds / 1000));
    return seconds >= 60 ? `${Math.ceil(seconds / 60)} minute${Math.ceil(seconds / 60) === 1 ? "" : "s"}` : `${seconds} second${seconds === 1 ? "" : "s"}`;
  };

  let ceiling = null;
  const tokenCeiling = () => (ceiling ? { ...ceiling } : null);
  const clearCeiling = () => { ceiling = null; };
  const learnCeiling = (maxTokens, provider) => {
    if (!Number.isFinite(maxTokens) || maxTokens <= 0) return;
    /* The provider's latest statement wins: a balance falls as calls are made
       and rises again when credits are added, and either way the last number
       it gave us is the best guide to the next call. Changing the key or the
       endpoint clears it — a different key has a different balance. */
    ceiling = { maxTokens, provider: (provider && (provider.label || provider.provider)) || "", at: new Date().toISOString() };
  };
  /* Read a ceiling out of a provider refusal, if it stated one. */
  function parseBudget(detail, status) {
    const text = String(detail || "");
    const stated = /limit_source"?\s*:\s*"?\w*credits/i.test(text) || /fewer max_tokens/i.test(text) || /requires more credits/i.test(text) || AFFORDABLE.test(text);
    if (!stated && status !== 402) return null;
    return { requested: numberWith(text, REQUESTED), affordable: numberWith(text, AFFORDABLE), stated };
  }
  const budgetError = (provider, budget, floor = 0, detail = "") => new LlmError(
    budget.affordable
      ? `${provider.label} can only afford a ${budget.affordable}-token ceiling on this key${budget.requested ? `; the call asked for ${budget.requested}` : ""}${floor > budget.affordable ? `, and ${floor} is the least that produces a usable answer` : ""}.`
      /* No number to work inside: keep the provider's own words rather than
         claiming a particular balance limit we were not told about. */
      : `${provider.label} refused the call with HTTP 402 and did not state a smaller token ceiling we can retry inside.${detail ? ` The provider said: ${redact(detail).slice(0, 220)}` : ""}`,
    {
      status: 402, kind: budget.affordable || budget.stated ? "budget" : "billing", affordable: budget.affordable, requested: budget.requested,
      hint: budget.affordable
        ? "Ask fewer questions per call, or add credits at the provider. Ground-0 stages its reading one question at a time for exactly this reason."
        : "Check the provider's billing response. If it names in-flight requests, wait for them to settle and run the reading again; otherwise add credits or use a key with available balance."
    }
  );
  const inFlightError = (provider, delayMs = 0) => {
    const wait = delayMs > 0 ? waitLabel(delayMs) : "a little while";
    return new LlmError(
      `${provider.label} could not reserve this call while other requests were still in flight.${delayMs > 0 ? ` Its Retry-After asks us to wait ${wait} before another attempt.` : ""}`,
      {
        status: 402, kind: "busy", retryAfterMs: delayMs,
        hint: delayMs > 0
          ? `OpenRouter's Retry-After says to wait about ${wait} before running the reading again. This failed call is not evidence; the question stays UNKNOWN.`
          : "The provider asked to retry after in-flight requests settle. Wait for them to finish, then run the reading again; this failed call is not evidence and its question stays UNKNOWN."
      }
    );
  };
  /* A caller's ceiling, pulled inside what the provider has told us it can
     afford. Never raised above what the caller asked for. */
  const affordableTokens = (maxTokens, floor) => (ceiling ? Math.min(maxTokens, Math.max(floor, ceiling.maxTokens)) : maxTokens);

  function buildRequest(provider, { system, user, maxTokens, temperature, model, signal, jsonMode = false }) {
    const chosen = (model || provider.model || "").trim();
    if (!chosen) throw new LlmError("No model is named for this connection.", { kind: "model", hint: "Open the LLM Link app and enter or list a model." });
    if (provider.protocol === "anthropic") {
      return {
        maxTokensParam: "max_tokens",
        body: { model: chosen, max_tokens: maxTokens, temperature, ...(system ? { system } : {}), messages: [{ role: "user", content: user }] }
      };
    }
    if (provider.protocol === "google") {
      return {
        transport: "google-genai-sdk",
        maxTokensParam: "maxOutputTokens",
        body: {
          model: chosen,
          contents: user,
          config: {
            ...(system ? { systemInstruction: system } : {}),
            maxOutputTokens: maxTokens,
            temperature,
            ...(jsonMode ? { responseMimeType: "application/json" } : {}),
            /* The SDK defaults to five immediate attempts. Disable those here
               so Google RetryInfo can be honored by the bounded, abortable
               retry loop in chat() instead of stacking two retry policies. */
            httpOptions: { retryOptions: { attempts: 1 } },
            ...(signal ? { abortSignal: signal } : {})
          }
        }
      };
    }
    return {
      maxTokensParam: "max_tokens",
      // JSON mode is opt-in and limited to the known same-origin relay. Do
      // not assume every BYOK OpenAI-compatible endpoint implements it.
      body: { model: chosen, temperature, messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: user }], max_tokens: maxTokens,
        ...(jsonMode && provider.relay ? { response_format: { type: "json_object" } } : {}) }
    };
  }
  const completionMetadata = reason => ({
    finishReason: typeof reason === "string" ? reason.slice(0, 40) : "",
    truncated: /^(?:length|max_tokens)$/i.test(String(reason || ""))
  });
  function readResponse(provider, data) {
    if (provider.protocol === "google") {
      const rawText = data && typeof data.text === "string" ? data.text : "";
      const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
      const text = rawText || (Array.isArray(parts) ? parts.filter(part => part && part.thought !== true && typeof part.text === "string").map(part => part.text).join("") : "");
      const usage = data && (data.usageMetadata || data.usage) || {};
      return dataOnlyResult({
        text,
        model: (data && (data.model || data.modelVersion)) || "",
        ...completionMetadata(data && data.candidates && data.candidates[0] && data.candidates[0].finishReason),
        usage: {
          input: Number(usage.promptTokenCount ?? usage.total_input_tokens ?? usage.input_tokens) || 0,
          output: Number(usage.candidatesTokenCount ?? usage.total_output_tokens ?? usage.output_tokens) || 0
        }
      });
    }
    if (provider.protocol === "anthropic") {
      const blocks = Array.isArray(data && data.content) ? data.content.filter(block => block && block.type === "text" && typeof block.text === "string") : [];
      const text = blocks.map(block => block.text).join("");
      return dataOnlyResult({ text, model: (data && data.model) || "", ...completionMetadata(data && data.stop_reason), usage: { input: Number(data && data.usage && data.usage.input_tokens) || 0, output: Number(data && data.usage && data.usage.output_tokens) || 0 } });
    }
    const choice = data && Array.isArray(data.choices) ? data.choices[0] : null;
    const message = choice && choice.message ? choice.message : null;
    const raw = message ? message.content : "";
    const text = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map(part => typeof part === "string" ? part : (part && typeof part.text === "string" ? part.text : "")).join("") : "";
    return dataOnlyResult({ text, model: (data && data.model) || "", ...completionMetadata(choice && choice.finish_reason), usage: { input: Number(data && data.usage && (data.usage.prompt_tokens ?? data.usage.input_tokens)) || 0, output: Number(data && data.usage && (data.usage.completion_tokens ?? data.usage.output_tokens)) || 0 } });
  }

  /* One call. No hidden prompts: what the caller passes is what the model
     receives. Bounded retries cover narrowly identified provider responses:
       · Google 408 / 429 / selected 5xx, honoring RetryInfo and retry headers
       · a provider that renamed the ceiling parameter (max_completion_tokens)
       · a priced refusal that names a smaller ceiling it can afford
       · a temporary 402 while other requests still hold in-flight credits,
         honoring Retry-After and using bounded backoff when no delay is exposed
     `floorTokens` is the least ceiling worth sending at all: below it the
     answer arrives truncated, so the caller is told instead. */
  async function chat({ system = "", user, maxTokens = 4000, temperature = 0, signal, timeoutMs = 120000, model = "", floorTokens = 64, shrinkToAffordable = true, onRetry = null, jsonMode = false, maxGoogleRetries = GOOGLE_MAX_RETRIES }) {
    if (typeof user !== "string" || !user.trim()) throw new LlmError("There is nothing to send.", { kind: "error" });
    const config = resolved();
    const googleRetryLimit = Number.isSafeInteger(maxGoogleRetries)
      ? Math.max(0, Math.min(GOOGLE_MAX_RETRIES, maxGoogleRetries))
      : GOOGLE_MAX_RETRIES;
    if (!config.endpoint) throw new LlmError("No endpoint is configured.", { kind: "error", hint: "Open the LLM Link app and choose a provider." });
    const key = apiKey();
    if (!key && !config.keyOptional && !config.relay) throw new LlmError(`No key is loaded for ${config.label}.`, { kind: "auth", hint: "Open the LLM Link app and paste your own key. This site never sees it." });

    const controller = new AbortController();
    const onAbort = () => controller.abort(signal.reason);
    if (signal) { if (signal.aborted) throw signal.reason || new DOMException("Canceled.", "AbortError"); signal.addEventListener("abort", onAbort, { once: true }); }
    const timeoutError = () => new LlmError(`No complete response within ${Math.round(timeoutMs / 1000)} seconds.`, { kind: "timeout", hint: "Long documents take a while. Retry, use fewer sources per pass, or pick a faster model." });
    let timeoutTimer = setTimeout(() => controller.abort(timeoutError()), timeoutMs);
    const armTimeout = () => {
      clearTimeout(timeoutTimer);
      timeoutTimer = setTimeout(() => controller.abort(timeoutError()), timeoutMs);
    };
    const started = Date.now();
    try {
      /* Ask inside the ceiling the provider has already stated it can afford,
         so a known-small balance is not re-tested on every call. */
      const reserved = affordableTokens(maxTokens, floorTokens);
      if (reserved !== maxTokens) activity.shrunk++;
      const request = buildRequest(config, { system, user, maxTokens: reserved, temperature, model, signal: controller.signal, jsonMode });
      if (request.transport === "google-genai-sdk") {
        try {
          const module = await waitForSignal(loadGoogleSDK(), controller.signal);
          const client = googleClient(module, config, key);
          let retries = 0;
          for (;;) {
            try {
              const reservation = await reserveGoogleGeneration({
                model: request.body.model, system, user, signal: controller.signal,
                onRetry, startedAt: started, timeoutMs
              });
              const response = await client.models.generateContent(request.body);
              const parsed = readResponse(config, response);
              if (!parsed.text.trim()) throw new LlmError("Google returned no text. The model may have refused the request or reached its output limit.", { kind: "provider", hint: "Retry, lower the reading batch size, or raise the output-token ceiling." });
              await settleGoogleReservation(reservation, parsed.usage.input);
              activity.calls++; activity.input += parsed.usage.input; activity.output += parsed.usage.output;
              activity.lastMs = Date.now() - started; activity.lastModel = parsed.model || config.model; activity.lastAt = new Date().toISOString();
              return dataOnlyResult({ text: parsed.text, model: parsed.model || config.model, usage: parsed.usage, finishReason: parsed.finishReason, truncated: parsed.truncated, ms: activity.lastMs, provider: config.provider, endpoint: config.endpoint, reserved, shrunk: reserved < maxTokens });
            } catch (error) {
              if (controller.signal.aborted) throw abortReason(controller.signal);
              if (error instanceof LlmError) throw error;
              const metadata = googleErrorMetadata(error);
              const retryable = GOOGLE_RETRYABLE_STATUSES.has(metadata.status) && !metadata.dailyQuota && retries < googleRetryLimit;
              if (!retryable || (metadata.retryAfterMs !== null && metadata.retryAfterMs > MAX_AUTO_RETRY_AFTER_MS)) {
                throw googleSDKRequestError(config, error);
              }
              const serverDelay = metadata.retryAfterMs;
              const baseDelay = serverDelay === null ? GOOGLE_RETRY_BACKOFF_MS[retries] : serverDelay;
              const delayMs = Math.min(MAX_AUTO_RETRY_AFTER_MS, baseDelay + Math.floor(Math.random() * GOOGLE_RETRY_JITTER_MS));
              try {
                if (typeof onRetry === "function") onRetry({ delayMs, attempt: retries + 1, source: serverDelay === null ? "backoff" : "RetryInfo" });
              } catch { /* Progress reporting must not break the request. */ }
              await waitForAbortableDelay(delayMs, controller.signal);
              retries++;
            }
          }
        } catch (error) {
          if (controller.signal.aborted) throw abortReason(controller.signal);
          throw googleSDKRequestError(config, error);
        }
      }
      const readDetail = response => response.text().catch(() => "").then(text => String(text).slice(0, 2000));
      const waitForRetry = (ms, pauseCallTimeout = false) => new Promise((resolve, reject) => {
        if (controller.signal.aborted) {
          const reason = controller.signal.reason;
          reject(reason instanceof Error ? reason : new DOMException("Canceled.", "AbortError"));
          return;
        }
        if (pauseCallTimeout) clearTimeout(timeoutTimer);
        const abort = () => {
          clearTimeout(retryTimer);
          controller.signal.removeEventListener("abort", abort);
          const reason = controller.signal.reason;
          reject(reason instanceof Error ? reason : new DOMException("Canceled.", "AbortError"));
        };
        const finish = () => {
          controller.signal.removeEventListener("abort", abort);
          if (pauseCallTimeout) armTimeout();
          resolve();
        };
        const retryTimer = setTimeout(finish, ms);
        controller.signal.addEventListener("abort", abort, { once: true });
      });
      const send = async body => {
        const headers = applyAuth(new Headers({ "Content-Type": "application/json", Accept: "application/json" }), config, key);
        let quickRetries = 0;
        let serverDelayUsed = false;
        for (;;) {
          let response;
          try {
            response = await fetch(config.endpoint, { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer" });
          } catch (error) {
            if (error && error.name === "AbortError") throw controller.signal.reason instanceof Error ? controller.signal.reason : error;
            throw corsError(config);
          }
          const detail = response.ok ? "" : await readDetail(response);
          /* Two refusals are worth waiting out rather than failing the reading:
             OpenRouter's in-flight-budget 402, and any 429. A rate-limited call
             never ran, so retrying it is not a duplicate call or a second
             charge — and with one question per call, a Ground-0 reading that
             gave up on every paced question would come back full of holes. */
          const budgeted = isInFlightBudget(detail, response.status);
          const throttled = response.status === 429;
          if (!budgeted && !throttled) return { response, detail, retryAfterMs: 0 };
          const providerDelay = retryAfterMs(response, detail);
          if (providerDelay !== null) {
            const ceiling = throttled ? MAX_AUTO_RATE_LIMIT_WAIT_MS : MAX_AUTO_RETRY_AFTER_MS;
            if (serverDelayUsed || providerDelay > ceiling) return { response, detail, retryAfterMs: providerDelay };
            serverDelayUsed = true;
            try { if (typeof onRetry === "function") onRetry({ delayMs: providerDelay, attempt: activity.inFlightRetries + 1, source: "Retry-After" }); } catch { /* Progress reporting must not break the request. */ }
            await waitForRetry(providerDelay, true);
            activity.inFlightRetries++;
            continue;
          }
          if (quickRetries >= IN_FLIGHT_RETRY_DELAYS.length) return { response, detail, retryAfterMs: 0 };
          const delay = IN_FLIGHT_RETRY_DELAYS[quickRetries++];
          try { if (typeof onRetry === "function") onRetry({ delayMs: delay, attempt: activity.inFlightRetries + 1, source: "backoff" }); } catch { /* Progress reporting must not break the request. */ }
          await waitForRetry(delay);
          activity.inFlightRetries++;
        }
      };
      /* Which parameter this provider accepted the ceiling under, so a retry
         rewrites the same field the first request used. */
      const withCeiling = (body, tokens) => {
        const next = { ...body };
        if ("max_completion_tokens" in next) next.max_completion_tokens = tokens;
        else next.max_tokens = tokens;
        return next;
      };
      let sentBody = request.body;
      let sentCeiling = reserved;
      let { response, detail, retryAfterMs: retryDelayMs } = await send(sentBody);
      if (!response.ok) {
        /* Newer OpenAI-family models renamed the token cap. One targeted retry. */
        if (response.status === 400 && /max_completion_tokens|unsupported_parameter|max_tokens/i.test(detail)) {
          sentBody = { ...request.body, max_completion_tokens: sentCeiling };
          delete sentBody.max_tokens;
          ({ response, detail, retryAfterMs: retryDelayMs } = await send(sentBody));
        }
      }
      /* This refusal is temporary pressure, not evidence that the token
         ceiling is too large. `send` honored its delay or bounded fallback;
         if it is still here, tell the reader to wait rather than blaming the balance. */
      if (!response.ok && isInFlightBudget(detail, response.status)) throw inFlightError(config, retryDelayMs);
      /* The provider priced our ceiling and named a smaller one it can afford.
         Learn it, ask again inside it, and let every later call start there. */
      if (!response.ok) {
        const budget = parseBudget(detail, response.status);
        if (budget && budget.affordable) learnCeiling(budget.affordable, config);
        if (budget && budget.affordable && shrinkToAffordable && budget.affordable >= floorTokens && budget.affordable < sentCeiling) {
          sentCeiling = budget.affordable;
          sentBody = withCeiling(sentBody, sentCeiling);
          activity.shrunk++;
          ({ response, detail, retryAfterMs: retryDelayMs } = await send(sentBody));
        } else if (budget && (budget.stated || response.status === 402)) {
          /* Either it named no usable number, or the number it named is below
             the floor: say so plainly rather than sending a call that cannot
             produce an answer. */
          throw budgetError(config, budget, floorTokens, detail);
        }
      }
      if (!response.ok && isInFlightBudget(detail, response.status)) throw inFlightError(config, retryDelayMs);
      if (!response.ok) throw classifyHttp(config, response.status, detail);
      let data;
      try { data = await response.json(); } catch { throw new LlmError("The provider returned a response that was not valid JSON.", { kind: "provider" }); }
      const parsed = readResponse(config, data);
      if (!parsed.text.trim()) throw new LlmError("The model returned no text. It may have refused the request or hit its output limit.", { kind: "provider", hint: "Retry, lower the batch size, or raise the token ceiling." });
      activity.calls++; activity.input += parsed.usage.input; activity.output += parsed.usage.output;
      activity.lastMs = Date.now() - started; activity.lastModel = parsed.model || config.model; activity.lastAt = new Date().toISOString();
      /* The ceiling this call was actually sent with, which is what a provider
         bills against — not necessarily the ceiling that was asked for. */
      return dataOnlyResult({ text: parsed.text, model: parsed.model || config.model, usage: parsed.usage, finishReason: parsed.finishReason, truncated: parsed.truncated, ms: activity.lastMs, provider: config.provider, endpoint: config.endpoint, reserved: sentCeiling, shrunk: sentCeiling < maxTokens });
    } catch (error) {
      if (!(error && error.name === "AbortError")) activity.failures++;
      throw error;
    } finally {
      clearTimeout(timeoutTimer);
      if (signal) signal.removeEventListener("abort", onAbort);
    }
  }

  /* A cheap, honest connectivity test: one short generation. */
  async function probe({ signal, timeoutMs = 30000 } = {}) {
    const config = resolved();
    const result = await chat({
      user: "Reply with exactly these five words and nothing else: link established, model responding",
      maxTokens: 40, temperature: 0, signal, timeoutMs, model: config.model
    });
    return dataOnlyResult({ ok: true, ms: result.ms, model: result.model, sample: result.text.trim().slice(0, 120), usage: result.usage, provider: config.provider, label: config.label, browser: config.browser });
  }

  /* ──────────────────────────────────────────────────────────────
     Structured output — models wrap JSON in prose and fences. This
     finds the object without inventing anything that is not there.
     ────────────────────────────────────────────────────────────── */
  function extractJson(value) {
    const text = String(value ?? "").trim();
    if (!text) return null;
    const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(match => match[1]);
    for (const candidate of [...fenced, text]) {
      // A prose prefix such as "[note]" must not hide a later valid object.
      // Conversely, never salvage a nested finding from a truncated root.
      let cursor = 0;
      while (cursor < candidate.length) {
        const relative = candidate.slice(cursor).search(/[[{]/);
        if (relative === -1) break;
        const start = cursor + relative;
        const stack = [];
        let inString = false; let escaped = false; let end = -1;
        for (let i = start; i < candidate.length; i++) {
          const char = candidate[i];
          if (inString) { if (escaped) escaped = false; else if (char === "\\") escaped = true; else if (char === "\"") inString = false; continue; }
          if (char === "\"") { inString = true; continue; }
          if (char === "{" || char === "[") stack.push(char);
          else if (char === "}" || char === "]") {
            const expected = char === "}" ? "{" : "[";
            if (stack.pop() !== expected) { end = i; break; }
            if (!stack.length) { end = i; break; }
          }
        }
        if (end === -1) break;
        if (!stack.length) {
          try { return JSON.parse(candidate.slice(start, end + 1)); } catch { /* Not JSON; inspect the next top-level block. */ }
        }
        cursor = end + 1;
      }
    }
    return null;
  }

  return Object.freeze({
    authorityPlane: AUTHORITY_PLANE,
    PROVIDERS, LlmError, GOOGLE_GENAI_SDK_VERSION, GOOGLE_GENAI_SDK_URL,
    loadSettings, saveSettings, resolved, preset, status,
    setKey, clearKey, apiKey, keyStorage, keyHint, redact, looksLikeKey,
    chat, probe, loadModels, loadGoogleModelCatalog, googleModelInfo, describe, estimateTokens, estimateGoogleInputTokens, extractJson, stats, resetStats,
    googleQuotaSettings, saveGoogleQuotaSettings, googleQuotaStatus,
    relayStatus, relayStatusEndpoint, readableDetail,
    applyAuth, buildRequest, readResponse, googleModelsClientRows,
    tokenCeiling, clearCeiling, learnCeiling, parseBudget, affordableTokens,
    _setGoogleSDKLoaderForTests: setGoogleSDKLoaderForTests
  });
})();
