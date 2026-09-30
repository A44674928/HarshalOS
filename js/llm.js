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
     · Providers that refuse browser calls (api.openai.com) are labelled,
       not faked: the preset says so and points at the relay or a local
       server instead.
     · Failures are explained in plain language and never echo the key.

   Exposed as window.HOSLLM. No dependencies.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

window.HOSLLM = (() => {
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
      label: "This site's relay (/api/llm)",
      protocol: "openai",
      endpoint: "/api/llm",
      modelsEndpoint: "",
      model: "",
      context: 128000,
      browser: "direct",
      keyOptional: true,
      relay: true,
      note: "Only works when this deployment configures a server-side relay. The key then lives on the server, not in this browser — and the prompts do pass through that server."
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
    return {
      provider: settings.provider,
      label: base.label,
      protocol: (settings.protocol || base.protocol) === "anthropic" ? "anthropic" : "openai",
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
    if (error instanceof LlmError) return { title: error.kind === "cors" ? "THE BROWSER BLOCKED THE CALL" : error.kind === "auth" ? "THE KEY WAS REJECTED" : error.kind === "model" ? "THE MODEL WAS REJECTED" : error.kind === "model-list" ? "MODEL LIST UNAVAILABLE" : error.kind === "rate" ? "RATE LIMITED" : error.kind === "budget" ? "THE TOKEN CEILING IS UNAFFORDABLE" : error.kind === "busy" ? "THE PROVIDER IS STILL SETTLING REQUESTS" : error.kind === "billing" ? "THE PROVIDER REFUSED THE CALL" : error.kind === "timeout" ? "NO COMPLETE RESPONSE" : "THE MODEL CALL FAILED", detail: error.message, hint: error.hint };
    if (error && error.name === "AbortError") return { title: "CALL CANCELED", detail: "The call was canceled before it finished. No reading was recorded.", hint: "" };
    return { title: "THE MODEL CALL FAILED", detail: redact(error instanceof Error ? error.message : String(error ?? "Unknown error")), hint: "Retry, or check the connection in the LLM Link app." };
  }
  function classifyHttp(provider, httpStatus, detail) {
    const budget = parseBudget(detail, httpStatus);
    if (budget) return budgetError(provider, budget, 0, detail);
    const hint = httpStatus === 401 || httpStatus === 403
      ? `Check the key for ${provider.label}. It must be valid for this exact endpoint.`
      : httpStatus === 404 ? (provider.modelsEndpoint ? "Check the model name and the endpoint URL. The List models button shows what this key can use." : "Check the endpoint URL and the model name.")
      : httpStatus === 429 ? "The provider is rate-limiting. Wait and retry, or lower the reading batch size."
      : httpStatus >= 500 ? "The provider is having trouble. Retry shortly."
      : "";
    const kind = httpStatus === 401 || httpStatus === 403 ? "auth" : httpStatus === 404 ? "model" : httpStatus === 429 ? "rate" : httpStatus >= 500 ? "provider" : "error";
    return new LlmError(detail || `The endpoint returned HTTP ${httpStatus}.`, { status: httpStatus, kind, hint });
  }
  const corsError = provider => new LlmError(
    `The request to ${provider.endpoint} never reached the provider: the browser blocked it.`,
    { kind: "cors", hint: provider.browser === "blocked" ? provider.note : "This usually means the provider does not send CORS headers, the endpoint URL is wrong, or an extension is blocking the request. A same-origin relay or a local model avoids this entirely." }
  );

  async function loadModels(provider, { signal, timeoutMs = 20000 } = {}) {
    if (!provider.modelsEndpoint) throw new LlmError("No model-list URL is configured for this connection. Type the model name instead.", { kind: "model-list", hint: "Choose a provider preset, or use a custom OpenAI-compatible or Anthropic endpoint that exposes a /models route. Model listing is optional." });
    const headers = new Headers({ Accept: "application/json" });
    const key = apiKey();
    if (key) applyAuth(headers, provider, key);
    let response;
    try { response = await fetch(provider.modelsEndpoint, { headers, signal, credentials: "omit", referrerPolicy: "no-referrer" }); }
    catch (error) { if (error && error.name === "AbortError") throw error; throw corsError(provider); }
    if (response.status === 404) throw new LlmError(`The model-list endpoint for ${provider.label} returned HTTP 404.`, { status: 404, kind: "model-list", hint: "This connection can still work if you type the model name. Check the provider's GET /models route if listing should be available." });
    if (!response.ok) throw classifyHttp(provider, response.status, `Listing models returned HTTP ${response.status}.`);
    let data;
    try { data = await response.json(); } catch { throw new LlmError("The model list was not valid JSON.", { kind: "model" }); }
    const rows = Array.isArray(data && data.data) ? data.data : Array.isArray(data && data.models) ? data.models : [];
    return rows.map(row => typeof row === "string" ? row : row && (row.id || row.name || row.slug)).filter(id => typeof id === "string" && id).slice(0, 400);
  }

  function applyAuth(headers, provider, key) {
    if (provider.protocol === "anthropic") {
      if (key) headers.set("x-api-key", key);
      headers.set("anthropic-version", "2023-06-01");
      /* Anthropic's documented switch for bring-your-own-key browser clients. */
      headers.set("anthropic-dangerous-direct-browser-access", "true");
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

  /* Session activity. Kept in memory only: how many calls this page made,
     what they cost in tokens, and how long the last one took. */
  const activity = { calls: 0, failures: 0, input: 0, output: 0, shrunk: 0, inFlightRetries: 0, lastMs: 0, lastModel: "", lastAt: "" };
  const stats = () => ({ ...activity, ceiling: ceiling ? ceiling.maxTokens : 0 });
  const resetStats = () => { Object.assign(activity, { calls: 0, failures: 0, input: 0, output: 0, shrunk: 0, inFlightRetries: 0, lastMs: 0, lastModel: "", lastAt: "" }); };

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

  function buildRequest(provider, { system, user, maxTokens, temperature, model }) {
    const chosen = (model || provider.model || "").trim();
    if (!chosen) throw new LlmError("No model is named for this connection.", { kind: "model", hint: "Open the LLM Link app and enter or list a model." });
    if (provider.protocol === "anthropic") {
      return {
        maxTokensParam: "max_tokens",
        body: { model: chosen, max_tokens: maxTokens, temperature, ...(system ? { system } : {}), messages: [{ role: "user", content: user }] }
      };
    }
    return {
      maxTokensParam: "max_tokens",
      body: { model: chosen, temperature, messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: user }], max_tokens: maxTokens }
    };
  }
  function readResponse(provider, data) {
    if (provider.protocol === "anthropic") {
      const blocks = Array.isArray(data && data.content) ? data.content.filter(block => block && block.type === "text" && typeof block.text === "string") : [];
      const text = blocks.map(block => block.text).join("");
      return { text, model: (data && data.model) || "", usage: { input: Number(data && data.usage && data.usage.input_tokens) || 0, output: Number(data && data.usage && data.usage.output_tokens) || 0 } };
    }
    const choice = data && Array.isArray(data.choices) ? data.choices[0] : null;
    const message = choice && choice.message ? choice.message : null;
    const raw = message ? message.content : "";
    const text = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map(part => typeof part === "string" ? part : (part && typeof part.text === "string" ? part.text : "")).join("") : "";
    return { text, model: (data && data.model) || "", usage: { input: Number(data && data.usage && (data.usage.prompt_tokens ?? data.usage.input_tokens)) || 0, output: Number(data && data.usage && (data.usage.completion_tokens ?? data.usage.output_tokens)) || 0 } };
  }

  /* One call. No hidden prompts: what the caller passes is what the model
     receives. Bounded, documented retries cover three provider responses:
       · a provider that renamed the ceiling parameter (max_completion_tokens)
       · a priced refusal that names a smaller ceiling it can afford
       · a temporary 402 while other requests still hold in-flight credits,
         honoring Retry-After and using bounded backoff when no delay is exposed
     `floorTokens` is the least ceiling worth sending at all: below it the
     answer arrives truncated, so the caller is told instead. */
  async function chat({ system = "", user, maxTokens = 4000, temperature = 0, signal, timeoutMs = 120000, model = "", floorTokens = 64, shrinkToAffordable = true, onRetry = null }) {
    if (typeof user !== "string" || !user.trim()) throw new LlmError("There is nothing to send.", { kind: "error" });
    const config = resolved();
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
      const request = buildRequest(config, { system, user, maxTokens: reserved, temperature, model });
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
          if (!isInFlightBudget(detail, response.status)) return { response, detail, retryAfterMs: 0 };
          const providerDelay = retryAfterMs(response, detail);
          if (providerDelay !== null) {
            if (serverDelayUsed || providerDelay > MAX_AUTO_RETRY_AFTER_MS) return { response, detail, retryAfterMs: providerDelay };
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
      return { text: parsed.text, model: parsed.model || config.model, usage: parsed.usage, ms: activity.lastMs, provider: config.provider, endpoint: config.endpoint, reserved: sentCeiling, shrunk: sentCeiling < maxTokens };
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
    return { ok: true, ms: result.ms, model: result.model, sample: result.text.trim().slice(0, 120), usage: result.usage, provider: config.provider, label: config.label, browser: config.browser };
  }

  /* ──────────────────────────────────────────────────────────────
     Structured output — models wrap JSON in prose and fences. This
     finds the object without inventing anything that is not there.
     ────────────────────────────────────────────────────────────── */
  function extractJson(value) {
    const text = String(value ?? "").trim();
    if (!text) return null;
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidates = [fenced ? fenced[1] : null, text].filter(Boolean);
    for (const candidate of candidates) {
      const start = candidate.search(/[[{]/);
      if (start === -1) continue;
      const open = candidate[start];
      const close = open === "{" ? "}" : "]";
      let depth = 0; let inString = false; let escaped = false;
      for (let i = start; i < candidate.length; i++) {
        const char = candidate[i];
        if (inString) { if (escaped) escaped = false; else if (char === "\\") escaped = true; else if (char === "\"") inString = false; continue; }
        if (char === "\"") { inString = true; continue; }
        if (char === open) depth++;
        else if (char === close) {
          depth--;
          if (depth === 0) {
            try { return JSON.parse(candidate.slice(start, i + 1)); } catch { break; }
          }
        }
      }
    }
    return null;
  }

  return {
    PROVIDERS, LlmError,
    loadSettings, saveSettings, resolved, preset, status,
    setKey, clearKey, apiKey, keyStorage, keyHint, redact, looksLikeKey,
    chat, probe, loadModels, describe, estimateTokens, extractJson, stats, resetStats,
    applyAuth, buildRequest, readResponse,
    tokenCeiling, clearCeiling, learnCeiling, parseBudget, affordableTokens
  };
})();
