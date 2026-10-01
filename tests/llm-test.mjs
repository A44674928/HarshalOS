/* Node harness: the LLM connection layer (js/llm.js) and the Ground-0
   reading pass (js/g0-llm.js).

   No network and no real model: a stub fetch answers in each provider's
   shape, and a stub model replies with findings that are deliberately
   mixed — verified, fabricated, mis-dated, news-sourced — so the
   verification gate is what is under test.

   Run: node tests/llm-test.mjs */

/* ── browser globals ──────────────────────────────────────────── */
globalThis.window = globalThis;
globalThis.self = globalThis;
globalThis.location = { origin: "https://harness.test" };
globalThis.Headers = globalThis.Headers || class { constructor(init = {}) { this.map = new Map(Object.entries(init)); } set(k, v) { this.map.set(k, v); return this; } get(k) { return this.map.get(k); } has(k) { return this.map.has(k); } };
const storage = new Map();
const session = new Map();
globalThis.localStorage = { getItem: k => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) };
globalThis.sessionStorage = { getItem: k => (session.has(k) ? session.get(k) : null), setItem: (k, v) => session.set(k, String(v)), removeItem: k => session.delete(k) };

await import("../js/data.js");
await import("../js/g0-engine.js");
await import("../js/g0-research.js");
await import("../js/llm.js");
await import("../js/g0-llm.js");

const G0 = globalThis.G0;
const R = globalThis.G0Research;
const LLM = globalThis.HOSLLM;
const G0LLM = globalThis.G0LLM;

let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) pass++; else { fail++; console.error("  ✗ FAIL:", name); } };
const eq = (actual, expected, name) => ok(actual === expected, `${name} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`);

const org = "Acme Corp";
const cutoff = "2026-09-01";
const policy = "Appeal procedure. Any affected party may appeal a decision of Acme Corp within 30 days. A filed appeal automatically stays the decision until the appeal board issues a final written determination. Enforcement of the decision is suspended for the duration of the appeal.";
const terms = "Acceptance of terms. Participants who fail to comply with this policy may have their access suspended and their account terminated. Acme Corp publishes enforcement decisions quarterly.";
const sources = [
  { id: "SITE-1", title: "Acme Corp — appeal procedure", url: "https://example.org/appeals", published: "2026-02-01", retrieved: "2026-09-01T00:00:00Z", excerpt: policy.slice(0, 200), text: policy, codes: [], kind: "official", dateBasis: "publication", authority: "Acme Corp" },
  { id: "SITE-2", title: "Acme Corp — terms of use", url: "https://example.org/terms", published: "2026-01-05", retrieved: "2026-09-01T00:00:00Z", excerpt: terms.slice(0, 200), text: terms, codes: [], kind: "official", dateBasis: "publication", authority: "Acme Corp" },
  { id: "SITE-3", title: "Acme Corp — undated guidance", url: "https://example.org/guidance", published: null, retrieved: "2026-09-01T00:00:00Z", excerpt: policy.slice(0, 200), text: policy, codes: [], kind: "context", dateBasis: "unknown" },
  { id: "NEWS-1", title: "Acme Corp faces questions", url: "https://news.example/story", published: "2026-03-03", retrieved: "2026-09-01T00:00:00Z", excerpt: "Indexed by GDELT on 2026-03-03; reporting is a lead, never operative evidence.", text: "Reporting says Acme Corp's decisions are final and cannot be appealed at all, which would be a B4 no.", codes: [], kind: "news", dateBasis: "indexed" }
];

/* ── the connection layer ─────────────────────────────────────── */
{
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, init, headers: init.headers, body: init.body ? JSON.parse(init.body) : null });
    const reply = (data, status = 200) => ({ ok: status < 400, status, headers: { get: () => "application/json" }, json: async () => data, text: async () => JSON.stringify(data) });
    if (String(url).includes("/models")) return reply({ data: [{ id: "claude-sonnet-4-5" }, { id: "claude-haiku-4-5" }] });
    if (init.body && JSON.parse(init.body).messages) return reply({ content: [{ type: "text", text: "link established, model responding" }], model: "claude-sonnet-4-5", usage: { input_tokens: 12, output_tokens: 5 } });
    return reply({ error: "unexpected" }, 500);
  };

  ok(typeof LLM === "object" && typeof LLM.chat === "function", "HOSLLM exposes a chat call");
  ok(Object.isFrozen(LLM), "the LLM connection capability surface is frozen");
  ok(Object.isFrozen(LLM.PROVIDERS) && Object.isFrozen(LLM.PROVIDERS.anthropic), "provider configuration records are immutable");
  eq(LLM.authorityPlane.name, "DATA-ONLY", "the LLM is explicitly classified as a data-plane capability");
  eq(LLM.authorityPlane.kernelCapability, false, "the LLM has no kernel capability");
  eq(LLM.authorityPlane.actionAuthorizationCapability, false, "the LLM cannot authorize actions");
  eq(LLM.authorityPlane.badgeIssuanceCapability, false, "the LLM cannot issue badges");
  eq(LLM.authorityPlane.codeExecution, false, "model output is never executable code");
  ok(Object.isFrozen(G0LLM), "the Ground-0 reading capability surface is frozen");
  eq(G0LLM.authorityPlane.name, "DATA-ONLY", "Ground-0 LLM output remains on the data plane");
  eq(G0LLM.authorityPlane.explicitSelectionRequired, true, "applying a reading requires explicit selected codes");
  eq(G0LLM.authorityPlane.badgeIssuanceCapability, false, "the reading pass cannot issue a badge");
  const toolOnly = LLM.readResponse({ protocol: "openai" }, { choices: [{ message: { content: null, tool_calls: [{ type: "function", function: { name: "HOS.revoke", arguments: "{}" } }] } }] });
  eq(toolOnly.text, "", "provider tool-call metadata is not promoted to executable output");
  eq(toolOnly.authorityPlane, "DATA-ONLY", "the raw OpenAI-compatible parser result is also labeled data-only");
  eq(toolOnly.trustedForAuthority, false, "raw parsed provider text is explicitly untrusted");
  const googleToolOnly = LLM.readResponse({ protocol: "google" }, { candidates: [{ content: { parts: [{ functionCall: { name: "HOS.revoke", args: {} } }] } }] });
  eq(googleToolOnly.text, "", "Google function-call metadata is ignored rather than dispatched");
  eq(googleToolOnly.executable, false, "Google parser output is explicitly non-executable");
  ok(LLM.executeTool === undefined && LLM.execute === undefined, "the connection exposes no model-tool dispatcher");
  ok(LLM.status().linked === false, "a fresh browser has no model linked");
  LLM.setKey("sk-ant-test-key-0000000000", false);
  ok(LLM.keyStorage() === "session", "the key is held for the session by default");
  ok(LLM.status().linked === true, "provider, model and key make a complete link");
  ok(!LLM.keyHint().includes("test-key"), "the key hint does not expose the key");

  const probe = await LLM.probe({});
  ok(probe.ok && probe.model === "claude-sonnet-4-5", "probe returns model and latency");
  const chat = calls.find(call => String(call.url).includes("api.anthropic.com") && call.body && call.body.messages);
  eq(chat.headers.get("anthropic-dangerous-direct-browser-access"), "true", "Anthropic is called with the documented browser-access header");
  eq(chat.headers.get("x-api-key"), "sk-ant-test-key-0000000000", "the key travels in the Anthropic header");
  eq(chat.headers.get("anthropic-version"), "2023-06-01", "the Anthropic API version is pinned");
  eq(chat.body.max_tokens !== undefined, true, "Anthropic gets a token ceiling");
  eq(chat.body.messages[0].content, "Reply with exactly these five words and nothing else: link established, model responding", "the probe prompt is exactly what was written");

  const models = await LLM.loadModels(LLM.resolved());
  eq(models.length, 2, "model listing is parsed");

  /* OpenAI-compatible transport */
  LLM.saveSettings({ provider: "openrouter", endpoint: "https://openrouter.ai/api/v1/chat/completions", model: "anthropic/claude-sonnet-4.5" });
  eq(LLM.resolved().modelsEndpoint, "https://openrouter.ai/api/v1/models", "the saved OpenRouter chat endpoint keeps its separate model-list endpoint");
  let listedAt = "";
  globalThis.fetch = async url => {
    listedAt = String(url);
    return { ok: true, status: 200, headers: { get: () => "application/json" }, json: async () => ({ data: [{ id: "anthropic/claude-sonnet-4.5" }] }) };
  };
  const openrouterModels = await LLM.loadModels(LLM.resolved());
  eq(listedAt, "https://openrouter.ai/api/v1/models", "List models calls the OpenRouter model endpoint, not its chat endpoint");
  eq(openrouterModels[0], "anthropic/claude-sonnet-4.5", "the OpenRouter model list is parsed after the preset endpoint is saved");
  const customCompatible = LLM.resolved({ provider: "custom", protocol: "openai", endpoint: "https://gateway.example/v1/chat/completions", model: "gateway-model" });
  eq(customCompatible.modelsEndpoint, "https://gateway.example/v1/models", "a custom OpenAI-compatible chat route derives its conventional model-list route");
  const noModelList = LLM.resolved({ provider: "custom", protocol: "openai", endpoint: "https://gateway.example/generate", model: "gateway-model" });
  eq(noModelList.modelsEndpoint, "", "an endpoint with no recognizable model-list route stays manual");
  let listError = null;
  try { await LLM.loadModels(noModelList); } catch (error) { listError = error; }
  eq(LLM.describe(listError).title, "MODEL LIST UNAVAILABLE", "a missing model list is not mislabeled as a rejected model");
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, init, headers: init.headers, body: init.body ? JSON.parse(init.body) : null });
    return { ok: true, status: 200, headers: { get: () => "application/json" }, json: async () => ({ model: "x", choices: [{ message: { content: "ok" } }], usage: { prompt_tokens: 3, completion_tokens: 4 } }) };
  };
  const openaiCall = await LLM.chat({ system: "S", user: "U", maxTokens: 10 });
  eq(openaiCall.authorityPlane, "DATA-ONLY", "chat responses are marked as data-only");
  eq(openaiCall.trustedForAuthority, false, "a model response is never trusted as authority");
  eq(openaiCall.executable, false, "a model response is explicitly non-executable");
  ok(Object.isFrozen(openaiCall) && Object.isFrozen(openaiCall.usage), "model response metadata and nested usage data are immutable");
  const last = calls[calls.length - 1];
  eq(last.headers.get("Authorization"), "Bearer sk-ant-test-key-0000000000", "OpenAI-compatible providers get a bearer token");
  eq(last.body.messages[0].role, "system", "system prompt is carried as a system message");
  eq(openaiCall.usage.output, 4, "token usage is read back");

  /* Failure taxonomy */
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  let described = null;
  try { await LLM.chat({ user: "U" }); } catch (error) { described = LLM.describe(error); }
  ok(described && described.title.includes("BLOCKED"), "a blocked/browser-refused call is described as blocked");

  globalThis.fetch = async () => ({ ok: false, status: 401, headers: { get: () => "application/json" }, json: async () => ({ error: "bad key" }), text: async () => "bad key" });
  try { await LLM.chat({ user: "U" }); } catch (error) { described = LLM.describe(error); }
  ok(described && described.title.includes("KEY"), "a rejected key is described as a key problem");
  ok(!JSON.stringify(described).includes("sk-ant-test"), "error text never echoes the key");

  globalThis.fetch = async () => ({ ok: false, status: 402, headers: { get: () => "application/json" }, text: async () => JSON.stringify({ error: { message: "Payment required; no further billing detail was returned." } }) });
  let refusal = null;
  try { await LLM.chat({ user: "U" }); } catch (error) { refusal = error; }
  eq(refusal && refusal.kind, "billing", "an unexplained HTTP 402 is not guessed to be a token-ceiling refusal");
  eq(LLM.describe(refusal).title, "THE PROVIDER REFUSED THE CALL", "an unexplained HTTP 402 is labelled without claiming why");

  /* OpenAI's API is labelled, not faked */
  ok(LLM.PROVIDERS.openai.browser === "blocked" && /CORS/.test(LLM.PROVIDERS.openai.note), "the OpenAI preset states that browser calls are blocked");
  ok(LLM.PROVIDERS.anthropic.browser === "direct" && LLM.PROVIDERS.openrouter.browser === "direct", "the providers that answer browser calls are marked direct");
  ok(LLM.PROVIDERS.local.keyOptional === true, "a local endpoint may need no key");

  /* Official Google GenAI SDK transport: SDK methods, SDK model listing,
     token ceilings and abort signals — no parallel raw-REST path. */
  {
    const previousFetch = globalThis.fetch;
    let rawFetches = 0;
    globalThis.fetch = async (...args) => { rawFetches++; return previousFetch(...args); };
    const googleEndpoint = "https://generativelanguage.googleapis.com";
    const googleKey = "AIzaSyD-google-test-key-1234567890";
    const googleClients = [];
    const googleListCalls = [];
    const googleCalls = [];
    const googleErrorQueue = [];
    let googleError = null;
    let sdkLoads = 0;
    class MockGoogleGenAI {
      constructor(options) {
        googleClients.push(options);
        this.models = {
          list: async params => {
            googleListCalls.push(params);
            return (async function* () {
              yield { name: "models/gemini-test", supportedActions: ["generateContent", "countTokens"] };
              yield { name: "models/embed-only", supportedActions: ["embedContent"] };
              yield { name: "models/gemini-pro", supportedActions: ["generateContent"] };
            })();
          },
          generateContent: async params => {
            googleCalls.push(params);
            if (googleError) throw googleError;
            if (googleErrorQueue.length) throw googleErrorQueue.shift();
            return { text: "link established, model responding", modelVersion: "gemini-mock", usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 4 } };
          }
        };
      }
    }
    LLM._setGoogleSDKLoaderForTests(async () => { sdkLoads++; return { GoogleGenAI: MockGoogleGenAI }; });
    LLM.setKey(googleKey, false);
    LLM.saveSettings({ provider: "google", protocol: "", endpoint: googleEndpoint, model: "gemini-test" });
    eq(LLM.resolved().protocol, "google", "the Google preset resolves to its dedicated SDK protocol");
    eq(LLM.GOOGLE_GENAI_SDK_VERSION, "2.24.0", "the official SDK version is pinned");
    ok(LLM.GOOGLE_GENAI_SDK_URL.includes("@google/genai@2.24.0/+esm"), "the browser imports the pinned official package through jsDelivr ESM");
    const googleModels = await LLM.loadModels(LLM.resolved());
    eq(googleModels.join(","), "gemini-test,gemini-pro", "Google models are listed through the SDK and non-generation models are omitted");
    eq(googleListCalls[0].config.pageSize, 100, "SDK model listing asks for a page of models");
    ok(googleListCalls[0].config.abortSignal instanceof AbortSignal, "SDK model listing receives an abort signal");
    const googleProbe = await LLM.probe({});
    ok(googleProbe.ok && googleProbe.model === "gemini-mock", "the SDK connection probe returns the model that answered");
    eq(googleProbe.usage.input, 11, "Gemini prompt token usage is normalized");
    eq(googleProbe.usage.output, 4, "Gemini candidate token usage is normalized");
    eq(googleCalls[0].model, "gemini-test", "the SDK request uses the selected model");
    eq(googleCalls[0].config.maxOutputTokens, 40, "the SDK request maps the output ceiling to maxOutputTokens");
    eq(googleCalls[0].config.temperature, 0, "the SDK request carries the chosen temperature");
    ok(googleCalls[0].config.abortSignal instanceof AbortSignal, "the SDK generation call receives the active abort signal");
    eq(googleCalls[0].config.httpOptions.retryOptions.attempts, 1, "the SDK's default retries are disabled so provider RetryInfo is not double-retried");
    ok(googleClients.every(client => client.apiKey === googleKey), "the SDK client receives the user's key");
    ok(googleClients.every(client => client.httpOptions.baseUrl === googleEndpoint), "the SDK client receives the configured Google API base URL");
    eq(sdkLoads, 1, "the SDK is lazily imported once and then reused");
    eq(rawFetches, 0, "the Google model-list and generation paths do not use the raw fetch transport");

    const withFastGoogleRetryTimers = async operation => {
      const originalSetTimeout = globalThis.setTimeout;
      const waits = [];
      globalThis.setTimeout = (callback, delay, ...args) => {
        if (Number.isFinite(delay) && delay > 0 && delay < 120000) {
          waits.push(delay);
          return originalSetTimeout(callback, 0, ...args);
        }
        return originalSetTimeout(callback, delay, ...args);
      };
      try { return { result: await operation(), waits }; }
      finally { globalThis.setTimeout = originalSetTimeout; }
    };
    const before503 = googleCalls.length;
    googleErrorQueue.push(Object.assign(new Error("The model is currently experiencing high demand."), { status: 503 }));
    const retryEvents503 = [];
    const retry503 = await withFastGoogleRetryTimers(() => LLM.chat({ user: "Retry a temporary outage.", onRetry: event => retryEvents503.push(event) }));
    eq(retry503.result.text, "link established, model responding", "a transient Google 503 is retried and can complete");
    eq(googleCalls.length - before503, 2, "one Google 503 produces only one extra SDK generation attempt");
    eq(retryEvents503[0].source, "backoff", "a 503 without RetryInfo uses bounded exponential backoff");
    eq(retry503.waits.length, 1, "a recovered 503 waits once before retrying");

    const rateLimitBody = { error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "GenerateContent requests per minute quota exceeded.", details: [
      { "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{ quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier", quotaValue: "5" }] },
      { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "34.091529138s" }
    ] } };
    const before429 = googleCalls.length;
    googleErrorQueue.push(Object.assign(new Error(JSON.stringify(rateLimitBody)), { status: 429 }));
    const retryEvents429 = [];
    const retry429 = await withFastGoogleRetryTimers(() => LLM.chat({ user: "Honor Google's RetryInfo.", onRetry: event => retryEvents429.push(event) }));
    eq(retry429.result.text, "link established, model responding", "a Google 429 can recover after its RetryInfo delay");
    eq(googleCalls.length - before429, 2, "the 429 path makes one retry after the original request");
    eq(retryEvents429[0].source, "RetryInfo", "Google's structured RetryInfo is distinguished from app backoff");
    ok(retryEvents429[0].delayMs >= 34091 && retryEvents429[0].delayMs <= 34592, "the Google retry waits at least the server's 34.09-second delay plus bounded jitter");
    ok(retry429.waits[0] >= 34091, "the abortable wait uses Google's reported RetryInfo delay");

    const beforeAbort = googleCalls.length;
    const retryAbort = new AbortController();
    googleErrorQueue.push(Object.assign(new Error(JSON.stringify(rateLimitBody)), { status: 429 }));
    const originalRetryTimer = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;
    let pendingRetryTimer = null;
    let retryTimerCleared = false;
    globalThis.setTimeout = (callback, delay, ...args) => {
      if (Number.isFinite(delay) && delay >= 30000 && delay < 120000) {
        pendingRetryTimer = originalRetryTimer(callback, delay, ...args);
        originalRetryTimer(() => retryAbort.abort(), 0);
        return pendingRetryTimer;
      }
      return originalRetryTimer(callback, delay, ...args);
    };
    globalThis.clearTimeout = timer => {
      if (timer === pendingRetryTimer) retryTimerCleared = true;
      return originalClearTimeout(timer);
    };
    let retryAbortError = null;
    try { await LLM.chat({ user: "Cancel during the retry delay.", signal: retryAbort.signal }); } catch (error) { retryAbortError = error; }
    finally {
      globalThis.setTimeout = originalRetryTimer;
      globalThis.clearTimeout = originalClearTimeout;
      if (pendingRetryTimer !== null) originalClearTimeout(pendingRetryTimer);
    }
    eq(retryAbortError && retryAbortError.name, "AbortError", "a caller can abort while Google RetryInfo is being honored");
    eq(retryTimerCleared, true, "aborting also clears the pending provider-delay timer");
    eq(googleCalls.length - beforeAbort, 1, "aborting during the provider delay prevents the next Google request");

    const dailyLimitBody = { error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Daily request quota exceeded.", details: [
      { "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier", quotaValue: "20" }] },
      { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "30s" }
    ] } };
    const beforeDaily = googleCalls.length;
    googleErrorQueue.push(Object.assign(new Error(JSON.stringify(dailyLimitBody)), { status: 429 }));
    let dailyQuotaError = null;
    try { await LLM.chat({ user: "Do not retry a daily quota." }); } catch (error) { dailyQuotaError = error; }
    eq(dailyQuotaError && dailyQuotaError.kind, "quota", "a per-day Google limit is classified separately from a transient rate limit");
    eq(LLM.describe(dailyQuotaError).title, "THE GOOGLE API QUOTA IS EXHAUSTED", "the UI labels a daily quota instead of showing UNKNOWN");
    eq(googleCalls.length - beforeDaily, 1, "a per-day quota is not retried even when RetryInfo is present");

    const googleBuilt = LLM.buildRequest(LLM.resolved(), { system: "system text", user: "one question", maxTokens: 700, temperature: 0, model: "gemini-test", signal: new AbortController().signal });
    eq(googleBuilt.transport, "google-genai-sdk", "the request builder marks Google's SDK transport explicitly");
    eq(googleBuilt.body.config.systemInstruction, "system text", "the system prompt maps to the SDK's systemInstruction");
    eq(googleBuilt.body.config.maxOutputTokens, 700, "Ground-0 ceilings map to the SDK's maxOutputTokens field");
    const googleParsed = LLM.readResponse(LLM.resolved(), { candidates: [{ content: { parts: [{ text: "first " }, { text: "second" }] } }], modelVersion: "gemini-version", usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 3 } });
    eq(googleParsed.text, "first second", "SDK response parts normalize when the text convenience getter is absent");
    eq(googleParsed.model, "gemini-version", "the SDK model version is retained");
    eq(googleParsed.usage.input, 8, "the SDK response fallback reports prompt tokens");

    googleError = Object.assign(new Error(`Rejected key ${googleKey}`), { status: 403 });
    let googleRefusal = null;
    try { await LLM.chat({ user: "Check the key." }); } catch (error) { googleRefusal = error; }
    eq(googleRefusal && googleRefusal.kind, "auth", "Google SDK authentication failures use the shared error taxonomy");
    ok(!JSON.stringify(LLM.describe(googleRefusal)).includes(googleKey), "Google SDK errors redact the user's key");
    googleError = null;

    LLM._setGoogleSDKLoaderForTests(async () => { throw new Error(`CDN offline with ${googleKey}`); });
    let sdkFailure = null;
    try { await LLM.loadModels(LLM.resolved()); } catch (error) { sdkFailure = error; }
    eq(sdkFailure && sdkFailure.kind, "sdk", "a failed SDK import is distinguished from a Google API failure");
    eq(LLM.describe(sdkFailure).title, "GOOGLE GENAI SDK UNAVAILABLE", "the UI can explain when the pinned SDK module cannot load");
    ok(!JSON.stringify(LLM.describe(sdkFailure)).includes(googleKey), "SDK-load errors redact the user's key too");
    LLM._setGoogleSDKLoaderForTests(null);
    LLM.clearKey();
    globalThis.fetch = previousFetch;
  }

  LLM.clearKey();
  eq(LLM.keyStorage(), "none", "clearing removes the key from the browser");
  globalThis.fetch = originalFetch;
}

/* ── quote verification, the gate on every model reading ──────── */
{
  const source = sources[0];
  const good = G0LLM.verifyQuote("A filed appeal automatically stays the decision until the appeal board issues a final written determination.", source);
  ok(good.ok, "a verbatim quote verifies");
  const spaced = G0LLM.verifyQuote("  A filed appeal   automatically stays the decision  ", source);
  ok(spaced.ok, "whitespace differences do not defeat verification");
  const ellipsis = G0LLM.verifyQuote("Any affected party may appeal a decision of Acme Corp … Enforcement of the decision is suspended for the duration of the appeal.", source);
  ok(ellipsis.ok && ellipsis.joined, "an ellipsis join verifies only when every fragment is verbatim");
  const fabricated = G0LLM.verifyQuote("Acme Corp grants every appellant automatic relief within ten days.", source);
  ok(!fabricated.ok, "a fabricated quote is rejected");
  const short = G0LLM.verifyQuote("Any affected party", source);
  ok(!short.ok, "a short quote is rejected as uncheckable");
  const otherSource = G0LLM.verifyQuote("A filed appeal automatically stays the decision", sources[1]);
  ok(!otherSource.ok, "a real quote from a different document is rejected for the cited source");
  ok(G0LLM.numbersInText(sources[1], "3", "12") === false, "relief figures must actually appear in the source");

  /* An "unknown" is a statement about the record, not a finding. It carries no
     quote, so it must be sorted apart: in the candidate list it would either
     break the record build or be read as a NO. */
  const sorted = G0LLM.parseFindings({ findings: [
    { code: "B1", value: "unknown", reason: "Nothing in these sources bears on coercion." },
    { code: "B4", value: "yes", source_index: 0, quote: "A filed appeal automatically stays the decision until the appeal board issues a final written determination.", confidence: "high" }
  ] }, sources, cutoff);
  eq(sorted.unknown.length, 1, "an unknown reply is sorted apart from the findings");
  eq(sorted.unknown[0].code, "B1", "and it still names the question it was about");
  ok(/Nothing in these sources/.test(sorted.unknown[0].reason), "carrying the reason the model gave");
  ok(sorted.unknown.every(row => row.quote === undefined), "an unknown has no quote to be mistaken for evidence");
  eq(sorted.verified.length, 1, "only the quoted reading is verified");
  eq(sorted.verified[0].code, "B4", "the verified reading is the one whose quote matched the stored text");
}

/* ── the reading pass ─────────────────────────────────────────── */
const readingCalls = [];
const userText = body => {
  if (!body || !Array.isArray(body.messages)) return "";
  return body.messages.map(message => typeof message.content === "string" ? message.content : "").join("\n");
};
function stubModel(handler) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null;
    readingCalls.push({ url: String(url), body, prompt: userText(body), headers: init.headers });
    const payload = handler(body, readingCalls.length, userText(body));
    return { ok: true, status: 200, headers: { get: () => "application/json" }, json: async () => ({ content: [{ type: "text", text: typeof payload === "string" ? payload : JSON.stringify(payload) }], model: "stub-model", usage: { input_tokens: 100, output_tokens: 50 } }) };
  };
  return () => { globalThis.fetch = original; };
}

{
  LLM.setKey("sk-test-key-abcdefghijkl", false);
  LLM.saveSettings({ provider: "anthropic", endpoint: "https://api.anthropic.com/v1/messages", model: "claude-sonnet-4-5", protocol: "" });
  const stop = stubModel(() => {
    return {
      findings: [
        /* verified, dated, official → may be applied */
        { code: "B4", value: "yes", source_index: 0, quote: "A filed appeal automatically stays the decision until the appeal board issues a final written determination.", date: "2026-02-01", confidence: "high", reason: "An operative stay rule." },
        /* verified, dated, terms page → coercion evidence */
        { code: "B1", value: "yes", source_index: 1, quote: "Participants who fail to comply with this policy may have their access suspended and their account terminated.", date: "2026-01-05", confidence: "high", reason: "Sanctions for non-compliance." },
        /* fabricated → must be discarded */
        { code: "B2", value: "no", source_index: 0, quote: "Decisions of Acme Corp are purely advisory and may be ignored without any consequence whatsoever.", date: "2026-02-01", confidence: "high", reason: "Claims decisions are optional." },
        /* right quote, undated source → held, never scored */
        { code: "B5", value: "yes", source_index: 2, quote: "Enforcement of the decision is suspended for the duration of the appeal.", date: "", confidence: "medium", reason: "Only present in an undated page." },
        /* a news lead can never support an answer */
        { code: "B3", value: "no", source_index: 3, quote: "Reporting says Acme Corp's decisions are final and cannot be appealed at all, which would be a B4 no.", date: "2026-03-03", confidence: "high", reason: "News claim." }
      ],
      b4: { basis: "TERMINAL_RULE", actor: "Any affected party", action: "The decision", procedure: "A filed appeal automatically stays the decision", numerator: "", denominator: "", complete: false },
      c2: { route: true, invoked: false, complete: false, numerator: "", denominator: "" },
      gaps: ["No source states whether authority persists by default."]
    };
  });

  const input = G0.newInput("1.1");
  input.name = org; input.identifier = "Q123"; input.cutoff = cutoff;
  input.automation = { method: "public-lookup", provider: "test", reviewRequired: true, requestedName: org, generatedAt: new Date().toISOString(), sources: sources.map(s => ({ ...s })), coverage: [], warnings: [] };
  input.automation.sources[0].codes = ["C4"];

  const progress = [];
  const reading = await G0LLM.readSources({ input, sources: input.automation.sources.map(s => ({ ...s })), version: "1.1", cutoff, entity: org, website: "https://example.org/", onProgress: p => progress.push(p), followLinks: false });
  stop();

  eq(reading.authorityPlane, "DATA-ONLY", "reading envelopes are marked as data-plane proposals");
  eq(reading.trustedForAuthority, false, "a frozen reading is not trusted as authority");
  eq(reading.block.reviewRequired, true, "every model reading carries the human-review requirement");
  ok(Object.isFrozen(reading) && Object.isFrozen(reading.candidates) && Object.isFrozen(reading.block), "issued readings are deeply immutable");
  ok(reading.passes >= 2, `the reading is staged over several calls: one per question per batch, plus weighing (${reading.passes} calls)`);
  ok(progress.length >= 3 && progress[progress.length - 1].completed === 5, "progress is reported through the run");
  eq(reading.candidates.length, 2, "only the two verifiable, dated readings become candidates");
  ok(reading.rejected.some(row => row.code === "B2" && /does not appear/.test(row.reason)), "the fabricated quote is discarded with a reason");
  ok(reading.rejected.some(row => row.code === "B3" && /lead/.test(row.reason)), "the news-sourced reading is discarded as a lead");
  ok(reading.held.some(row => row.code === "B5"), "the reading from the undated page is held, not scored");

  const b4 = reading.answers[3];
  eq(b4.value, true, "B4 is answered yes from the operative stay rule");
  eq(b4.source, "https://example.org/appeals", "B4 cites the appeal page");
  eq(b4.date, "2026-02-01", "the citation date is the source's own date, never the model's");
  ok(/stay/i.test(b4.notes), "the quote travels with the answer");
  eq(reading.answers[1].value, null, "a discarded reading leaves the question UNKNOWN, never NO");
  ok(/coverage statement about the retrieved record|not a proven negative|discarded/i.test(reading.answers[1].gap), "the unknown carries an honest gap note");
  ok(/no qualifying date/.test(reading.answers[4].gap) && /guidance/.test(reading.answers[4].gap), "the held reading is disclosed with its source");
  eq(reading.b4.basis, "TERMINAL_RULE", "B4 basis is carried only when it is terminal or no-penalty");
  eq(reading.b4.actor, "Any affected party", "B4 actor comes from the quoted rule");

  /* The engine, not the model, still decides. */
  let forgedReadingRejected = false;
  try { G0LLM.mergeReading(input, { ...reading }, { applyCodes: ["B1"] }); } catch (error) { forgedReadingRejected = /immutable reading/.test(error.message); }
  ok(forgedReadingRejected, "a copied or caller-forged reading envelope cannot enter the apply path");
  let crossDraftRejected = false;
  try { G0LLM.mergeReading({ ...input }, reading, { applyCodes: ["B1"] }); } catch (error) { crossDraftRejected = /exact draft/.test(error.message); }
  ok(crossDraftRejected, "an issued reading cannot be rebound to a different audit draft");
  let implicitApplyRejected = false;
  try { G0LLM.mergeReading(input, reading); } catch (error) { implicitApplyRejected = /explicitly selected/i.test(error.message); }
  ok(implicitApplyRejected, "a reading cannot be merged without explicit human-selected codes");
  let emptySelectionRejected = false;
  try { G0LLM.mergeReading(input, reading, { applyCodes: [] }); } catch (error) { emptySelectionRejected = /explicitly selected/i.test(error.message); }
  ok(emptySelectionRejected, "an explicitly empty selection is refused");
  let unverifiedApplyRejected = false;
  try { G0LLM.mergeReading(input, reading, { applyCodes: ["B2"] }); } catch (error) { unverifiedApplyRejected = /verified quote/.test(error.message); }
  ok(unverifiedApplyRejected, "a code with no verified quote cannot be selected into the draft");
  let mixedApplyRejected = false;
  try { G0LLM.mergeReading(input, reading, { applyCodes: ["B1", "B2"] }); } catch (error) { mixedApplyRejected = /Every selected code/.test(error.message); }
  ok(mixedApplyRejected, "a mixed valid/invalid selection fails as a whole instead of applying a partial subset");
  const partial = G0LLM.mergeReading(input, reading, { applyCodes: ["B1"] });
  eq(partial.answers[0].value, true, "only the explicitly selected quote-backed answer is applied");
  eq(partial.answers[3].value, null, "an unselected model suggestion remains unchanged");
  eq(JSON.stringify(partial.b4), JSON.stringify(input.b4), "unselected structured B4 data does not leak into the draft");

  const merged = G0LLM.mergeReading(input, reading, { applyCodes: ["B1", "B4"] });
  ok(merged.answers[0].value === true && merged.answers[3].value === true, "applying writes the ticked readings into a copy");
  ok(input.answers[0].value === null && input.answers[3].value === null, "the original input is never mutated");
  ok(merged.automation.llm && merged.automation.llm.reviewRequired === true, "the record carries the reading block and stays review-required");
  eq(merged.automation.llm.verified, 2, "the reading block records how many quotes verified");
  ok(merged.automation.sources.find(s => s.id === "SITE-1").codes.includes("B4"), "the source that carried the selected B4 reading is annotated");
  ok(merged.automation.sources.find(s => s.id === "SITE-1").codes.includes("C4"), "original source-code metadata survives the selected-reading merge");
  ok(input.automation.sources[0].codes.includes("C4"), "the source metadata on the original draft is not mutated");

  const record = await G0.createAudit(merged, []);
  eq(record.badge, "Unissued", "no badge is issued for a model-assisted draft");
  eq(record.confidence, "NONE", "confidence stays NONE until a person reviews it");
  eq(G0.hasScoringCitation(merged, merged.answers[3]), true, "the engine accepts the B4 citation");
  ok(G0.b4Qualifies(merged) === true, "the engine qualifies the terminal-rule B4 for v1.1");
  ok(record.workingBadge.filled >= 2, `the working badge reflects the newly evidenced questions (${record.workingBadge.filled}/5)`);
  ok(record.finding.includes("provisional"), "the finding still says provisional and unreviewed");
  ok(!JSON.stringify(record).includes("sk-test-key"), "no key is written into the audit record");
}

/* ── follow-up reading: the model may only pick from links it was shown ── */
{
  const withLink = { ...sources[1], text: `${terms}\\nSee the [appeal procedure](https://example.org/appeals.html) for the full rule.` };
  const input = G0.newInput("1.0");
  input.name = org; input.cutoff = cutoff;
  input.automation = { method: "public-lookup", provider: "test", reviewRequired: true, requestedName: org, generatedAt: new Date().toISOString(), sources: [withLink], coverage: [], warnings: [] };

  const links = G0LLM.linkCandidates([withLink], [withLink.url]);
  ok(links.length >= 1 && links[0].url === "https://example.org/appeals.html", "links are discovered from the retrieved text itself");

  const asked = [];
  const stop = stubModel((body, call, prompt) => {
    if (call === 1) return { findings: [], gaps: [] };
    asked.push(prompt);
    if (/\nLINKS\n/.test(prompt)) return { followups: [{ index: 1, why: "appeal procedure" }, { index: 99, why: "invented" }, { url: "https://evil.example/x", why: "invented url" }] };
    return { decisions: [], gaps: [] };
  });
  const originalRead = R.readWithArchive;
  const read = [];
  R.readWithArchive = async (url, website, readCutoff) => { read.push(url); return { title: "Appeals", url, published: "2026-02-01", content: policy, official: true, archiveStatus: "not-needed", scoringEligible: true, dateBasis: "publication" }; };
  const reading = await G0LLM.readSources({ input, sources: [withLink], version: "1.0", cutoff, entity: org, website: "https://example.org/", followLinks: true, onProgress: () => {} });
  R.readWithArchive = originalRead;
  stop();

  eq(read.length, 1, "only the link the model was shown is fetched");
  eq(read[0], "https://example.org/appeals.html", "the fetched page is the discovered link, not a model-written URL");
  ok(!read.some(url => url.includes("evil.example")), "a URL that was never in the record is never fetched");
  ok(reading.followUps.length === 1 && reading.followUps[0].requestedBy === "linked model", "the followed page is attributed to the model");
  ok(reading.sources.length === 2, "the followed page is added to the record's sources");
  ok(asked.some(prompt => /did not resolve/.test(prompt)) && readingCalls.some(call => /\nLINKS\n/.test(call.prompt)), "the link request names the missing questions before listing the links");
}

/* ── staging: one question per call, inside a ceiling a small balance can pay ──
   The failure this answers is a real one. A provider that prices a call by the
   ceiling it *reserves* refuses the whole audit when the balance cannot cover
   that number: "you requested up to 6000 tokens, but can only afford 2664".
   Every stub below refuses exactly that way, so what is under test is that the
   staged reading never asks for more than the balance can pay. */
const AFFORDABLE = 2664;
const pricedCalls = [];
const askedCodes = prompt => (String(prompt).match(/QUESTION(?:S)? TO ANSWER IN THIS CALL: ([A-Z0-9, ]+)/) || [, ""])[1].split(",").map(part => part.trim()).filter(Boolean);
function promptSources(prompt) {
  const body = String(prompt).split("\nSOURCES\n")[1] || "";
  return body.split(/\n(?=SOURCE \d+ — )/).map(block => {
    const head = block.match(/^SOURCE (\d+) — (.*)$/m);
    const text = (block.split("<<<\n")[1] || "").split("\n>>>")[0];
    return head ? { index: Number(head[1]), lead: /LEAD ONLY/.test(head[2]), text } : null;
  }).filter(Boolean);
}
function stubPricedProvider({ afford = AFFORDABLE, handler, failCodes = [] } = {}) {
  const original = globalThis.fetch;
  pricedCalls.length = 0;
  globalThis.fetch = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null;
    const prompt = userText(body);
    const asked = body ? Number(body.max_tokens ?? body.max_completion_tokens ?? 0) : 0;
    pricedCalls.push({ url: String(url), body, prompt, asked });
    const reply = (data, status = 200) => ({ ok: status < 400, status, headers: { get: () => "application/json" }, json: async () => data, text: async () => JSON.stringify(data) });
    if (asked > afford) return reply({ error: { message: `This request requires more credits, or fewer max_tokens. You requested up to ${asked} tokens, but can only afford ${afford}. To increase, visit https://openrouter.ai/settings/credits and upgrade to a paid account`, code: 402, metadata: { limit_source: "openrouter_credits" } } }, 402);
    if (failCodes.some(code => askedCodes(prompt).includes(code))) return reply({ error: { message: "upstream provider error" } }, 500);
    const payload = handler(body, pricedCalls.length, prompt);
    /* OpenRouter is an OpenAI-compatible endpoint, so it answers in that
       shape — the refusal above is the one it really sends. */
    const text = typeof payload === "string" ? payload : JSON.stringify(payload);
    return reply({ model: "stub-model", choices: [{ message: { role: "assistant", content: text } }], usage: { prompt_tokens: 100, completion_tokens: 50 } });
  };
  return () => { globalThis.fetch = original; };
}

/* A well-behaved staged model: it answers only the question it was asked, and
   only with a quote that really is in the source text it was shown. */
const STAY = "A filed appeal automatically stays the decision until the appeal board issues a final written determination.";
const SANCTION = "Participants who fail to comply with this policy may have their access suspended and their account terminated.";
const FUNDING = "Acme Corp may withhold funding from a participant that does not follow a decision of the board.";
function stagedReply(prompt) {
  if (/\nCANDIDATES\n/.test(prompt)) {
    const code = (prompt.match(/QUESTION BEING WEIGHED: (\w+)/) || [, "B1"])[1];
    const ids = [...prompt.matchAll(/"id": "(C\d+)"/g)].map(match => match[1]);
    return { code, candidate: ids[ids.length - 1] || "none", reason: "The later reading quotes the entity's own governing text.", gap: "" };
  }
  if (/\nLINKS\n/.test(prompt)) return { followups: [] };
  const codes = askedCodes(prompt);
  const present = promptSources(prompt);
  const quoteFrom = needle => { const source = present.find(item => !item.lead && item.text.includes(needle)); return source ? { index: source.index, quote: needle } : null; };
  const stay = quoteFrom(STAY);
  return {
    findings: codes.map(code => {
      const hit = code === "B4" ? stay : code === "B1" ? (quoteFrom(SANCTION) || quoteFrom(FUNDING)) : null;
      return hit
        ? { code, value: "yes", source_index: hit.index, quote: hit.quote, date: "", confidence: "high", reason: code === "B4" ? "An operative stay rule." : "A sanction for non-compliance." }
        : { code, value: "unknown", reason: "No supplied source bears on this question." };
    }),
    ...(codes.includes("B4") && stay ? { b4: { basis: "TERMINAL_RULE", actor: "Any affected party", action: "The decision", procedure: STAY, numerator: "", denominator: "", complete: false } } : {}),
    gap: ""
  };
}
const stagedSources = [
  { id: "SITE-1", title: "Acme Corp — appeal procedure", url: "https://example.org/appeals", published: "2026-02-01", retrieved: "2026-09-01T00:00:00Z", excerpt: policy.slice(0, 200), text: `${policy}\n${SANCTION}`, codes: [], kind: "official", dateBasis: "publication", authority: "Acme Corp" },
  { id: "SITE-2", title: "Acme Corp — terms of use", url: "https://example.org/terms", published: "2026-01-05", retrieved: "2026-09-01T00:00:00Z", excerpt: terms.slice(0, 200), text: terms, codes: [], kind: "official", dateBasis: "publication", authority: "Acme Corp" },
  { id: "SITE-3", title: "Acme Corp — undated guidance", url: "https://example.org/guidance", published: null, retrieved: "2026-09-01T00:00:00Z", excerpt: policy.slice(0, 200), text: policy, codes: [], kind: "context", dateBasis: "unknown" },
  { id: "SITE-4", title: "Acme Corp — funding conditions", url: "https://example.org/funding", published: "2026-03-11", retrieved: "2026-09-01T00:00:00Z", excerpt: FUNDING.slice(0, 200), text: `Funding conditions.\n${FUNDING}\nWithholding takes effect on the date of the notice.`, codes: [], kind: "official", dateBasis: "publication", authority: "Acme Corp" }
];
const stagedInput = () => {
  const input = G0.newInput("1.1");
  input.name = org; input.identifier = "Q123"; input.cutoff = cutoff;
  input.automation = { method: "public-lookup", provider: "test", reviewRequired: true, requestedName: org, generatedAt: new Date().toISOString(), sources: stagedSources.map(source => ({ ...source })), coverage: [], warnings: [] };
  return input;
};
const linkPriced = () => {
  LLM.setKey("sk-or-test-key-00000000", false);
  LLM.saveSettings({ provider: "openrouter", endpoint: "https://openrouter.ai/api/v1/chat/completions", model: "anthropic/claude-sonnet-4.5" });
  LLM.clearCeiling();
};

/* ── the staged reading never reserves a ceiling the balance cannot cover ── */
{
  linkPriced();
  const input = stagedInput();
  const progress = [];
  const stop = stubPricedProvider({ handler: (body, call, prompt) => stagedReply(prompt) });
  const reading = await G0LLM.readSources({ input, sources: stagedSources.map(source => ({ ...source })), version: "1.1", cutoff, entity: org, website: "https://example.org/", followLinks: false, onProgress: step => progress.push(step) });
  stop();

  const asked = pricedCalls.filter(call => /TO ANSWER IN THIS CALL/.test(call.prompt));
  eq(asked.length, 18, "nine questions are asked of each of the two source batches, one call at a time");
  ok(asked.every(call => askedCodes(call.prompt).length === 1), "every reading call asks exactly one question");
  eq([...new Set(asked.flatMap(call => askedCodes(call.prompt)))].sort().join(","), G0LLM.allCodes().slice().sort().join(","), "between them the staged calls ask all nine questions");
  ok(pricedCalls.every(call => call.asked <= G0LLM.LIMITS.maxTokensRead), `no call reserved more than the staged ceiling (${Math.max(...pricedCalls.map(call => call.asked))} tokens at most)`);
  eq(asked[0].asked, G0LLM.LIMITS.maxTokensRead, "a one-question call reserves exactly the one-question ceiling");
  eq(reading.block.staging.ceilingPerCall, G0LLM.LIMITS.maxTokensRead, "the record states the ceiling it was read under");
  ok(pricedCalls.every(call => call.asked <= AFFORDABLE), "so the provider never had to refuse a ceiling it could not afford");
  ok(!pricedCalls.some(call => call.asked === 6000), "the old single 6000-token reservation is gone");
  eq(reading.passes, 19, "one call per question per batch, plus one weighing call for the contested question");

  const weigh = pricedCalls.find(call => /\nCANDIDATES\n/.test(call.prompt));
  ok(weigh && /QUESTION BEING WEIGHED: B1/.test(weigh.prompt), "weighing is staged too: one call, naming the one contested question");
  ok(weigh.asked <= G0LLM.LIMITS.maxTokensWeigh, "the weighing call reserves a ceiling for one decision, not for the whole audit");
  eq((weigh.prompt.match(/"id": "C\d+"/g) || []).length, 2, "only that question's candidates are sent to be weighed");

  eq(reading.candidates.length, 3, "B1 from two sources and B4 from one are the verified candidates");
  eq(reading.answers[3].value, true, "B4 is answered from the operative stay rule");
  eq(reading.answers[0].source, "https://example.org/funding", "the staged weighing call chose between the two B1 readings");
  eq(reading.answers[1].value, null, "a question no supplied source bears on stays UNKNOWN");
  eq(reading.block.staging.codesPerCall, 1, "the record states that it was read one question per call");
  eq(reading.block.staging.questionsAsked, 9, "the record states how many questions were asked");
  eq(reading.block.staging.weighed, 1, "the record states how many questions needed weighing");
  eq(reading.block.staging.callsFailed, 0, "no call failed");
  ok(/one per call/.test(progress[0].message), "the first progress line says how the reading is staged");
  ok(progress.some(step => /Reading B4 — pass 1 of 2, question 4 of 9/.test(step.message)), "progress names the question being read");
  ok(progress[progress.length - 1].completed === 5, "progress still ends at the last of five steps");
  ok(new Set(progress.filter(step => step.step === 2).map(step => step.completed)).size > 2, "the progress bar moves while the staged reading runs");
}

/* Even a quote-verified loser cannot be applied when weighing rejected the
   question's candidates and the reading has no final selection for that code. */
{
  linkPriced();
  const input = stagedInput();
  const stop = stubPricedProvider({ handler: (body, call, prompt) => {
    if (/\nCANDIDATES\n/.test(prompt)) return { code: "B1", candidate: "C-NOT-ISSUED", reason: "Reject every candidate." };
    return stagedReply(prompt);
  } });
  const reading = await G0LLM.readSources({ input, sources: stagedSources.map(source => ({ ...source })), version: "1.1", cutoff, entity: org, website: "https://example.org/", followLinks: false, onProgress: () => {} });
  stop();
  ok(reading.candidates.some(candidate => candidate.code === "B1"), "the rejected B1 alternatives remain visible as verified but unchosen candidates");
  eq(reading.chosen.B1, undefined, "an invalid weighing response chooses no candidate");
  let rejected = false;
  try { G0LLM.mergeReading(input, reading, { applyCodes: ["B1"] }); } catch (error) { rejected = /verified quote/.test(error.message); }
  ok(rejected, "a verified but unchosen candidate cannot be merged into the draft");
}

/* ── questions can be grouped when the balance allows a larger ceiling ── */
{
  linkPriced();
  const input = stagedInput();
  const stop = stubPricedProvider({ handler: (body, call, prompt) => stagedReply(prompt) });
  const reading = await G0LLM.readSources({ input, sources: stagedSources.map(source => ({ ...source })), version: "1.1", cutoff, entity: org, followLinks: false, codesPerCall: 3, onProgress: () => {} });
  stop();
  const asked = pricedCalls.filter(call => /TO ANSWER IN THIS CALL/.test(call.prompt));
  eq(asked.length, 6, "three questions per call is a third of the calls over two batches");
  ok(asked.every(call => askedCodes(call.prompt).length === 3), "each grouped call names the three questions it is asking");
  eq(reading.block.staging.codesPerCall, 3, "the record states the grouping it was read with");
  eq(asked[0].asked, G0LLM.LIMITS.maxTokensRead + 2 * G0LLM.LIMITS.maxTokensPerCode, "a grouped call reserves room for every question it asks, so a reply cannot be cut off half-way");
  ok(asked[0].asked <= AFFORDABLE, "and even grouped three to a call it stays inside the balance the provider stated");
  eq(reading.answers[3].value, true, "grouping does not change what was verified");
}

/* ── the transport: a priced ceiling is learned, and the call retried inside it ── */
{
  linkPriced();
  const stop = stubPricedProvider({ handler: () => ({ findings: [] }) });
  const first = await LLM.chat({ user: "Say something short.", maxTokens: 6000 });
  eq(pricedCalls.length, 2, "one refusal, then one retry inside the ceiling the provider stated");
  eq(pricedCalls[0].asked, 6000, "the first attempt carries the ceiling the caller asked for");
  eq(pricedCalls[1].asked, AFFORDABLE, "the retry asks for exactly what the provider said it could afford");
  ok(first.shrunk === true && first.reserved === AFFORDABLE, "the result reports the ceiling that was actually reserved");
  eq(LLM.tokenCeiling().maxTokens, AFFORDABLE, "the stated ceiling is remembered for the rest of the session");
  await LLM.chat({ user: "Say something else.", maxTokens: 6000 });
  eq(pricedCalls.length, 3, "a later call does not have to earn the same refusal again");
  eq(pricedCalls[2].asked, AFFORDABLE, "the later call starts inside the learned ceiling");
  ok(LLM.stats().shrunk >= 2, "the session counts how often a ceiling had to come down");
  stop();
}

/* ── a temporary 402 from other in-flight requests is retried, not misread as a low balance ── */
{
  linkPriced();
  LLM.resetStats();
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  const waits = [];
  const delays = [750, 1500, 3000];
  globalThis.setTimeout = (callback, delay, ...args) => {
    if (delays.includes(delay)) {
      waits.push(delay);
      return originalSetTimeout(callback, 0, ...args);
    }
    return originalSetTimeout(callback, delay, ...args);
  };
  const refusal = { error: { message: "This request would exceed your available credits given your current in-flight requests. Retry after in-flight requests settle, or add credits.", code: 402, metadata: { reason: "in_flight_budget_exhausted" } } };
  const reply = (data, status = 200) => ({ ok: status < 400, status, headers: { get: () => "application/json" }, json: async () => data, text: async () => JSON.stringify(data) });
  try {
    let attempts = 0;
    globalThis.fetch = async () => {
      attempts++;
      if (attempts <= 2) return reply(refusal, 402);
      return reply({ model: "stub-model", choices: [{ message: { role: "assistant", content: "Recovered after in-flight requests settled." } }], usage: { prompt_tokens: 10, completion_tokens: 8 } });
    };
    const recovered = await LLM.chat({ user: "Read this one question.", maxTokens: 700 });
    eq(attempts, 3, "two transient in-flight refusals are followed by one successful retry");
    eq(waits.join(","), "750,1500", "the retry waits use bounded exponential backoff");
    eq(recovered.text, "Recovered after in-flight requests settled.", "the successful retry returns the model's answer");
    eq(LLM.stats().inFlightRetries, 2, "the session records the two in-flight retries");
    eq(LLM.tokenCeiling(), null, "a temporary in-flight refusal does not teach a false token ceiling");

    LLM.resetStats(); waits.length = 0; attempts = 0;
    globalThis.fetch = async () => { attempts++; return reply(refusal, 402); };
    let error = null;
    try { await LLM.chat({ user: "Read this one question.", maxTokens: 700 }); } catch (caught) { error = caught; }
    eq(attempts, 4, "the connection makes the initial attempt plus three bounded retries, then stops");
    eq(waits.join(","), "750,1500,3000", "the final transient refusal is retried no longer than the documented backoff");
    eq(error && error.kind, "busy", "an unresolved in-flight 402 is classified as temporary provider pressure");
    const described = LLM.describe(error);
    ok(/SETTLING REQUESTS/.test(described.title), "the interface says earlier requests are still settling");
    ok(/retry after in-flight requests settle/i.test(described.hint), "the user is told to wait and retry, not add credits");
    ok(!/balance cannot cover the requested token ceiling/i.test(error.message), "a temporary 402 is not mislabeled as an unaffordable ceiling");
    eq(LLM.stats().inFlightRetries, 3, "the session records the exhausted retry attempts");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
  }
}

/* ── Retry-After is honored instead of being retried too early ── */
{
  linkPriced();
  LLM.resetStats();
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  const waits = [];
  let timeoutCalls = 0;
  globalThis.setTimeout = (callback, delay, ...args) => {
    if (delay === 120000 && ++timeoutCalls === 2) {
      waits.push(delay);
      return originalSetTimeout(callback, 0, ...args);
    }
    return originalSetTimeout(callback, delay, ...args);
  };
  const refusal = { error: { message: "This request would exceed your available credits given your current in-flight requests. Retry after in-flight requests settle, or add credits.", code: 402, metadata: { reason: "in_flight_budget_exhausted", limit_source: "openrouter_in_flight_budget" } } };
  try {
    let attempts = 0;
    globalThis.fetch = async () => {
      attempts++;
      const headers = { get: name => String(name).toLowerCase() === "retry-after" ? (attempts === 1 ? "120" : null) : "application/json" };
      if (attempts === 1) return { ok: false, status: 402, headers, text: async () => JSON.stringify(refusal) };
      return { ok: true, status: 200, headers, json: async () => ({ model: "stub-model", choices: [{ message: { role: "assistant", content: "Retried after the provider's window." } }], usage: { prompt_tokens: 10, completion_tokens: 8 } }) };
    };
    const notices = [];
    const recovered = await LLM.chat({ user: "Read this one question.", maxTokens: 700, timeoutMs: 120000, onRetry: notice => notices.push(notice) });
    eq(attempts, 2, "the call is retried once after the provider-supplied delay");
    eq(waits.join(","), "120000", "Retry-After: 120 is honored as a 120-second wait");
    eq(timeoutCalls, 3, "the normal request timeout is paused for Retry-After, then restarted for the retry");
    eq(notices[0] && notices[0].delayMs, 120000, "the caller is notified of the server-requested wait");
    eq(recovered.text, "Retried after the provider's window.", "the response after the Retry-After delay is returned");
    eq(LLM.stats().inFlightRetries, 1, "the server-directed retry appears in session activity");
    eq(LLM.tokenCeiling(), null, "Retry-After does not change the learned token ceiling");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
  }
}

/* ── an unresolved account-wide busy refusal stops the audit after its own retries ── */
{
  linkPriced();
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  const delays = [750, 1500, 3000];
  globalThis.setTimeout = (callback, delay, ...args) => delays.includes(delay)
    ? originalSetTimeout(callback, 0, ...args)
    : originalSetTimeout(callback, delay, ...args);
  const attempts = [];
  const progress = [];
  const refusal = { error: { message: "This request would exceed your available credits given your current in-flight requests. Retry after in-flight requests settle, or add credits.", code: 402, metadata: { reason: "in_flight_budget_exhausted" } } };
  const reply = { ok: false, status: 402, headers: { get: () => "application/json" }, json: async () => refusal, text: async () => JSON.stringify(refusal) };
  try {
    globalThis.fetch = async (url, init = {}) => { attempts.push({ url: String(url), body: JSON.parse(init.body) }); return reply; };
    let error = null;
    try {
      await G0LLM.readSources({ input: stagedInput(), sources: stagedSources.map(source => ({ ...source })), version: "1.1", cutoff, entity: org, followLinks: false, onProgress: step => progress.push(step) });
    } catch (caught) { error = caught; }
    eq(error && error.kind, "busy", "a still-busy provider stops the reading instead of looking like an empty record");
    eq(attempts.length, 4, "only the initial call and its three retries are sent");
    ok(attempts.every(call => askedCodes(userText(call.body)).join(",") === "B1"), "the reader does not fan the same account-wide refusal out across all nine questions");
    ok(progress.some(step => /temporary error; retrying B1 after a 1 second backoff/.test(step.message)), "the reading progress identifies the provider fallback backoff before retrying the staged question");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
  }
}

/* ── a ceiling below the floor is reported, never sent ── */
{
  linkPriced();
  const stop = stubPricedProvider({ afford: 40, handler: () => ({ findings: [] }) });
  let error = null;
  try { await LLM.chat({ user: "Say something.", maxTokens: 6000, floorTokens: 120 }); } catch (e) { error = e; }
  stop();
  const described = LLM.describe(error);
  eq(error.kind, "budget", "a ceiling the balance cannot cover is named as a budget problem, not a mystery failure");
  ok(/UNAFFORDABLE/.test(described.title), "the interface says the ceiling is unaffordable");
  eq(error.affordable, 40, "the number the provider stated travels on the error");
  ok(/120/.test(described.detail), "the least ceiling that can produce an answer is named");
  ok(/credits/i.test(described.hint), "the hint says what to do about it");
  eq(pricedCalls.length, 1, "no retry is sent below the floor: a truncated answer is worse than an honest failure");
  LLM.clearCeiling();
}

/* ── a balance smaller than one staged call is still enough to finish ── */
{
  linkPriced();
  const input = stagedInput();
  const stop = stubPricedProvider({ afford: 300, handler: (body, call, prompt) => stagedReply(prompt) });
  const reading = await G0LLM.readSources({ input, sources: stagedSources.map(source => ({ ...source })), version: "1.1", cutoff, entity: org, followLinks: false, onProgress: () => {} });
  stop();
  ok(pricedCalls.some(call => call.asked === 300), "the reading was re-sent inside the smaller ceiling");
  eq(pricedCalls.filter(call => call.asked > 300).length, 1, "only the first call earned the refusal; every later call started inside it");
  ok(reading.notes.some(note => /ceiling/i.test(note)), "the record discloses that the ceiling came down");
  eq(reading.answers[3].value, true, "the staged reading still reached its answers inside the smaller ceiling");
}

/* ── one failed call costs one question, not the audit ── */
{
  linkPriced();
  const input = stagedInput();
  const stop = stubPricedProvider({ handler: (body, call, prompt) => stagedReply(prompt), failCodes: ["B3"] });
  const reading = await G0LLM.readSources({ input, sources: stagedSources.map(source => ({ ...source })), version: "1.1", cutoff, entity: org, followLinks: false, onProgress: () => {} });
  stop();
  eq(reading.block.staging.callsFailed, 2, "the failed question was attempted once in each of the two batches");
  eq(reading.answers[2].value, null, "B3 stays UNKNOWN where its call failed");
  ok(/did not complete|failed/i.test(reading.answers[2].gap), "the gap says the call failed instead of pretending the record was silent");
  ok(!/not a proven negative/.test(reading.answers[2].gap), "a failed call is not reported as a silent record");
  ok(reading.notes.some(note => /B3/.test(note) && /failed/i.test(note)), "the notes name the question whose call failed");
  eq(reading.answers[3].value, true, "every other question was still read");
  eq(reading.block.staging.failedCodes.join(","), "B3", "the record carries which questions failed");
}

/* ── when no call at all completes, the reading fails loudly ── */
{
  linkPriced();
  const input = stagedInput();
  const stop = stubPricedProvider({ handler: (body, call, prompt) => stagedReply(prompt), failCodes: G0LLM.allCodes() });
  let error = null;
  try { await G0LLM.readSources({ input, sources: stagedSources.map(source => ({ ...source })), version: "1.1", cutoff, entity: org, followLinks: false, onProgress: () => {} }); } catch (e) { error = e; }
  stop();
  ok(error, "a reading in which every staged call failed throws instead of returning an empty audit");
  ok(pricedCalls.length >= 9, "it did not stop after the first failure without saying why");
  LLM.clearCeiling();
}

/* ── Ground-0 uses the official Google SDK and still stages one question per call ── */
{
  const originalFetch = globalThis.fetch;
  let rawFetches = 0;
  globalThis.fetch = async () => { rawFetches++; throw new Error("Google SDK path must not call raw fetch in this harness."); };
  const sdkCalls = [];
  const sdkClients = [];
  const googleErrorQueue = [];
  const key = "AIzaSyD-ground0-google-key-123456789";
  class Ground0GoogleGenAI {
    constructor(options) {
      sdkClients.push(options);
      this.models = {
        generateContent: async params => {
          sdkCalls.push(params);
          if (googleErrorQueue.length) throw googleErrorQueue.shift();
          return { text: JSON.stringify(stagedReply(params.contents)), modelVersion: "gemini-ground0-mock", usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 30 } };
        }
      };
    }
  }
  LLM._setGoogleSDKLoaderForTests(async () => ({ GoogleGenAI: Ground0GoogleGenAI }));
  LLM.setKey(key, false);
  LLM.saveSettings({ provider: "google", protocol: "", endpoint: "https://generativelanguage.googleapis.com", model: "gemini-test" });
  LLM.clearCeiling();
  let reading = null;
  let readingError = null;
  try {
    reading = await G0LLM.readSources({ input: stagedInput(), sources: stagedSources.map(source => ({ ...source })), version: "1.1", cutoff, entity: org, followLinks: false, onProgress: () => {} });
  } catch (error) { readingError = error; }
  ok(!readingError, `the Ground-0 audit completes through the official Google SDK${readingError ? ` (${readingError.message})` : ""}`);
  if (reading) {
    const stagedGoogleCalls = sdkCalls.filter(call => /QUESTION(?:S)? TO ANSWER IN THIS CALL/.test(call.contents));
    eq(stagedGoogleCalls.length, 18, "the Google SDK reads both source batches in nine question calls each");
    ok(stagedGoogleCalls.every(call => askedCodes(call.contents).length === 1), "every Google reading call asks exactly one audit question");
    eq(reading.block.staging.codesPerCall, 1, "the Google-assisted record preserves the one-question staging metadata");
    eq(reading.passes, 19, "the Google reading keeps its separate one-question weighing call");
    ok(sdkCalls.filter(call => /QUESTION(?:S)? TO ANSWER IN THIS CALL/.test(call.contents)).every(call => call.config.maxOutputTokens === 700), "every staged Google call reserves the existing 700-token ceiling");
    ok(sdkCalls.filter(call => /QUESTION(?:S)? TO ANSWER IN THIS CALL/.test(call.contents)).every(call => call.config.httpOptions.retryOptions.attempts === 1), "each staged Google call leaves retries to the abortable RetryInfo-aware wrapper");
    ok(sdkCalls.some(call => /QUESTION BEING WEIGHED: B1/.test(call.contents) && call.config.maxOutputTokens === 300), "the Google SDK weighs only the contested question with its separate ceiling");
    eq(reading.answers[3].value, true, "a Google SDK quote still passes the existing B4 verification gate");
    eq(reading.block.model, "gemini-test", "the Ground-0 record identifies the selected Google model");
  }

  const persistentRateBody = { error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Per-minute request quota exceeded.", details: [
    { "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{ quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier", quotaValue: "5" }] },
    { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "34s" }
  ] } };
  const persistentRate = Object.assign(new Error(JSON.stringify(persistentRateBody)), { status: 429 });
  googleErrorQueue.push(persistentRate, persistentRate, persistentRate, persistentRate);
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (callback, delay, ...args) => Number.isFinite(delay) && delay > 0 && delay < 120000
    ? originalSetTimeout(callback, 0, ...args)
    : originalSetTimeout(callback, delay, ...args);
  const beforeRateLimitedRead = sdkCalls.length;
  let rateLimitedReadError = null;
  try {
    await G0LLM.readSources({ input: stagedInput(), sources: stagedSources.map(source => ({ ...source })), version: "1.1", cutoff, entity: org, followLinks: false, onProgress: () => {} });
  } catch (error) { rateLimitedReadError = error; }
  finally { globalThis.setTimeout = originalSetTimeout; }
  eq(rateLimitedReadError && rateLimitedReadError.kind, "rate", "a still-active per-minute quota stops Ground-0 with a rate-limit error");
  eq(sdkCalls.length - beforeRateLimitedRead, 4, "after bounded Google retries are exhausted, Ground-0 stops rather than sending the same account-wide 429 for every question");

  eq(rawFetches, 0, "Ground-0's Google reading goes through the SDK, not a parallel REST call");
  ok(sdkClients.every(client => client.apiKey === key), "Ground-0 supplies the user's key to the SDK client");
  LLM._setGoogleSDKLoaderForTests(null);
  LLM.clearKey();
  LLM.clearCeiling();
  globalThis.fetch = originalFetch;
}

/* ── a missing Google SDK stops Ground-0 before it retries each staged question ── */
{
  let imports = 0;
  LLM._setGoogleSDKLoaderForTests(async () => { imports++; throw new Error("SDK CDN unavailable"); });
  LLM.setKey("AIzaSyD-google-fatal-test-123456789", false);
  LLM.saveSettings({ provider: "google", protocol: "", endpoint: "https://generativelanguage.googleapis.com", model: "gemini-test" });
  let error = null;
  try { await G0LLM.readSources({ input: stagedInput(), sources: stagedSources.map(source => ({ ...source })), version: "1.1", cutoff, entity: org, followLinks: false, onProgress: () => {} }); } catch (caught) { error = caught; }
  eq(error && error.kind, "sdk", "a missing Google SDK is fatal to the staged read");
  eq(imports, 1, "Ground-0 does not try to re-import a missing SDK for every question");
  LLM._setGoogleSDKLoaderForTests(null);
  LLM.clearKey();
}

/* ── this deployment's relay: Z.AI's free tier, key held by the Worker ── */
{
  const originalFetch = globalThis.fetch;
  const relay = LLM.PROVIDERS.relay;
  eq(relay.endpoint, "/api/llm", "the relay preset points at this deployment's own route");
  eq(relay.modelsEndpoint, "/api/llm/models", "the relay can be asked what it serves");
  eq(relay.protocol, "openai", "the relay answers in the OpenAI-compatible shape llm.js already parses");
  eq(relay.relay, true, "the relay preset is marked as a relay");
  eq(relay.keyOptional, true, "no browser key is needed for the relay");
  eq(relay.model, "glm-4.5-flash", "the relay defaults to a Z.AI free-tier model");
  eq(relay.context, 128000, "the relay states the free tier's context window");
  ok(/Worker secret/i.test(relay.note) && /never in this browser/i.test(relay.note), "the relay note says the key lives in the Worker, not the browser");
  ok(/glm-4\.5-flash/.test(relay.note) && /glm-4\.7-flash/.test(relay.note), "the relay note names the $0 models it serves");
  ok(/pass through that Worker/i.test(relay.note), "the relay note discloses that prompts transit the Worker");
  ok(/do_sample:false/i.test(relay.note), "the relay note discloses Z.AI's sampling translation");
  eq(relay.label.includes("Z.AI"), true, "the preset is named for the provider it serves");

  /* A key from another provider must never be forwarded to this relay. */
  LLM.setKey("sk-ant-leftover-from-another-provider", false);
  LLM.saveSettings({ provider: "relay", protocol: "", endpoint: "/api/llm", model: "glm-4.5-flash" });
  const relayConfig = LLM.resolved();
  eq(relayConfig.relay, true, "the resolved connection is the relay");
  eq(LLM.status().linked, true, "the relay is a complete link with no key in this browser");
  eq(LLM.status().hasKey, true, "a leftover key is still reported as held, so the reader can clear it");
  const relayHeaders = LLM.applyAuth(new Headers({ "Content-Type": "application/json" }), relayConfig, LLM.apiKey());
  ok(!relayHeaders.get("Authorization"), "no Authorization header is built for the relay");
  ok(!relayHeaders.get("x-api-key"), "no provider key header of any kind is built for the relay");

  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init, body: init.body ? JSON.parse(init.body) : null });
    return {
      ok: true, status: 200, headers: { get: () => "application/json" },
      json: async () => ({
        object: "chat.completion", model: "glm-4.5-flash",
        choices: [{ index: 0, message: { role: "assistant", content: "link established, model responding" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 40, completion_tokens: 6, total_tokens: 46 },
        relay: { provider: "zai", tier: "free", keyVariable: "Z.AI", doSample: false, temperatureSent: null }
      }),
      text: async () => ""
    };
  };
  const chat = await LLM.chat({ system: "S", user: "U", maxTokens: 700, temperature: 0 });
  eq(calls.length, 1, "one relay call is made");
  eq(calls[0].url, "/api/llm", "the call goes to this deployment's own relay route");
  ok(!calls[0].init.headers.get("Authorization"), "the stored key is not sent to the relay");
  eq(calls[0].init.credentials, "omit", "the relay call carries no cookies either");
  eq(calls[0].body.model, "glm-4.5-flash", "the free-tier model is named");
  eq(calls[0].body.max_tokens, 700, "the caller's output ceiling is passed through");
  eq(calls[0].body.temperature, 0, "a greedy reading is asked for as temperature 0; the relay translates it");
  eq(calls[0].body.messages[0].role, "system", "the prompt is exactly what the caller wrote");
  eq(calls[0].body.stream, undefined, "the browser never asks the relay to stream");
  eq(calls[0].body.tools, undefined, "the browser offers the relay no tools to dispatch");
  eq(chat.text, "link established, model responding", "the relay's reply is read as text");
  eq(chat.authorityPlane, "DATA-ONLY", "a relayed reply stays on the data plane");
  eq(chat.trustedForAuthority, false, "a relayed reply is not trusted for authority");
  eq(chat.usage.input, 40, "relay usage is normalized");
  eq(chat.provider, "relay", "the reading records the relay as its connection");

  /* Asking the relay what it has is a disclosure, not an error path. */
  let askedAt = "";
  globalThis.fetch = async url => {
    askedAt = String(url);
    return { ok: true, status: 200, text: async () => JSON.stringify({
      configured: true, provider: "zai", tier: "free", upstream: "https://api.z.ai",
      models: ["glm-4.5-flash", "glm-4.7-flash"], keyVariable: "Z.AI",
      limits: { requestsPerMinute: 60, sharedRequestsPerMinute: 120, windowSeconds: 60 }
    }) };
  };
  const info = await LLM.relayStatus();
  ok(askedAt.endsWith("/api/llm/status"), "the status question goes to the relay's status route");
  eq(info.reachable, true, "a configured relay is reachable");
  eq(info.configured, true, "and says it is configured");
  eq(info.keyVariable, "Z.AI", "it names the Worker variable holding the key");
  eq(info.models.join(","), "glm-4.5-flash,glm-4.7-flash", "it lists the free models it serves");
  eq(info.limits.requestsPerMinute, 60, "it states the pace it holds each caller to");
  eq(info.limits.sharedRequestsPerMinute, 120, "and the ceiling every caller on this deployment shares");
  eq(JSON.stringify(info).includes("sk-ant-leftover"), false, "a status answer carries no key");

  globalThis.fetch = async () => ({ ok: false, status: 200, text: async () => JSON.stringify({ configured: false, message: "This deployment has no Z.AI key.", acceptedKeyVariables: ["Z.AI", "ZAI_API_KEY"] }) });
  const missing = await LLM.relayStatus();
  eq(missing.reachable, true, "an unconfigured relay is still reachable");
  eq(missing.configured, false, "and says it is not configured");
  ok(/no Z\.AI key/i.test(missing.message), "it says what is missing");

  globalThis.fetch = async () => ({ ok: false, status: 404, text: async () => "<html>404</html>" });
  const absent = await LLM.relayStatus();
  eq(absent.reachable, false, "a static preview with no Worker reports no relay");
  eq(absent.configured, false, "and is not configured");
  ok(/no relay/i.test(absent.reason), "it says there is no relay rather than failing");

  globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => "<html>not json</html>" });
  const notJson = await LLM.relayStatus();
  eq(notJson.reachable, false, "a non-JSON answer is not treated as a relay");

  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  const unreachable = await LLM.relayStatus();
  eq(unreachable.reachable, false, "an unreachable route is reported, not thrown");
  eq(unreachable.configured, false, "and is treated as unconfigured");

  /* Relay failures are explained in the relay's sentence, not its raw JSON. */
  eq(LLM.readableDetail(JSON.stringify({ error: { message: "This deployment has no Z.AI key.", type: "relay_unavailable" } })), "This deployment has no Z.AI key.", "an OpenAI-shaped error body is reduced to its sentence");
  eq(LLM.readableDetail(JSON.stringify({ error: "plain string error" })), "plain string error", "a string error field is read too");
  eq(LLM.readableDetail(JSON.stringify({ code: 1302, message: "Z.AI's own shape" })), "Z.AI's own shape", "Z.AI's code/message shape is read too");
  eq(LLM.readableDetail("plain text"), "plain text", "plain text is passed through");
  eq(LLM.readableDetail("{broken"), "{broken", "unparseable text is passed through rather than dropped");
  eq(LLM.readableDetail(""), "", "an empty body stays empty");

  globalThis.fetch = async () => ({ ok: false, status: 503, headers: { get: () => "application/json" }, text: async () => JSON.stringify({ error: { message: "This deployment has no Z.AI key. Add one as a Worker secret named Z.AI or ZAI_API_KEY.", type: "relay_unavailable", code: 503 } }) });
  let refused = null;
  try { await LLM.chat({ user: "U" }); } catch (error) { refused = error; }
  const described = LLM.describe(refused);
  ok(/no Z\.AI key/.test(described.detail), "an unconfigured relay explains itself in its own words");
  ok(!/^\{/.test(described.detail), "the reader is not shown raw JSON");
  ok(/Worker secret/i.test(refused.hint), "the hint names the Worker secret the operator must add");

  /* A long stated delay is shown to the reader rather than spent behind a busy
     progress bar; only a short pace is waited out automatically (below). */
  let longWaitCalls = 0;
  globalThis.fetch = async () => {
    longWaitCalls += 1;
    return { ok: false, status: 429, headers: { get: name => String(name).toLowerCase() === "retry-after" ? "30" : "application/json" }, text: async () => JSON.stringify({ error: { message: "This relay allows 60 model calls a minute per caller, and this caller has used them. Retry in about 30 seconds.", type: "rate_limit_error", code: 429 } }) };
  };
  let limited = null;
  try { await LLM.chat({ user: "U" }); } catch (error) { limited = error; }
  eq(LLM.describe(limited).title, "RATE LIMITED", "a relay rate limit is labelled as one");
  ok(/60 model calls/.test(limited.message), "the relay's stated limit reaches the reader");
  ok(/not evidence/i.test(limited.hint), "a rate-limited call is not mistaken for evidence");
  eq(longWaitCalls, 1, "a 30-second wait is reported, not silently served");

  /* A short pace is waited out instead of punching a hole in the reading: with
     one question per call, a refused question is a question left UNKNOWN. */
  const withFastRetryTimers = async operation => {
    const originalSetTimeout = globalThis.setTimeout;
    const waits = [];
    globalThis.setTimeout = (callback, delay, ...args) => {
      if (Number.isFinite(delay) && delay > 0 && delay < 120000) { waits.push(delay); return originalSetTimeout(callback, 0, ...args); }
      return originalSetTimeout(callback, delay, ...args);
    };
    try { return { result: await operation(), waits }; } finally { globalThis.setTimeout = originalSetTimeout; }
  };
  let pacedCalls = 0;
  const pacedEvents = [];
  globalThis.fetch = async () => {
    pacedCalls += 1;
    if (pacedCalls === 1) {
      return { ok: false, status: 429, headers: { get: name => String(name).toLowerCase() === "retry-after" ? "2" : "application/json" }, text: async () => JSON.stringify({ error: { message: "This relay allows 60 model calls a minute per caller, and this caller has used them. Retry in about 2 seconds.", type: "rate_limit_error", code: 429 } }) };
    }
    return {
      ok: true, status: 200, headers: { get: () => "application/json" },
      json: async () => ({
        object: "chat.completion", model: "glm-4.5-flash",
        choices: [{ index: 0, message: { role: "assistant", content: "answered once the pace lifted" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 40, completion_tokens: 6, total_tokens: 46 },
        relay: { provider: "zai", tier: "free", keyVariable: "ZAI_API_KEY", pacing: { limit: 60, remaining: 58, reset: 4 } }
      }),
      text: async () => ""
    };
  };
  const paced = await withFastRetryTimers(() => LLM.chat({ user: "U", onRetry: event => pacedEvents.push(event) }));
  eq(pacedCalls, 2, "a two-second relay pace is retried once instead of failing the question");
  eq(paced.result.text, "answered once the pace lifted", "and the reading gets its answer");
  eq(pacedEvents.length, 1, "the wait is reported to the reader once");
  eq(pacedEvents[0].source, "Retry-After", "and named as the relay's own stated delay, not an invented backoff");
  eq(pacedEvents[0].delayMs, 2000, "the delay waited is the one the relay quoted");
  eq(paced.waits.join(","), "2000", "no longer wait is served behind a busy progress bar");

  globalThis.fetch = async () => ({ ok: false, status: 403, headers: { get: () => "application/json" }, text: async () => JSON.stringify({ error: { message: "The relay accepts same-origin browser requests only.", type: "invalid_request_error" } }) });
  let forbidden = null;
  try { await LLM.chat({ user: "U" }); } catch (error) { forbidden = error; }
  eq(forbidden.kind, "auth", "a refused caller is an authorization problem");
  ok(/same-origin/i.test(forbidden.hint) && /no key to paste/i.test(forbidden.hint), "the hint does not send the reader hunting for a key the relay holds itself");

  /* Listing models through the relay uses its own route. */
  let listedAt = "";
  globalThis.fetch = async url => {
    listedAt = String(url);
    return { ok: true, status: 200, headers: { get: () => "application/json" }, json: async () => ({ object: "list", data: [{ id: "glm-4.5-flash" }, { id: "glm-4.7-flash" }] }) };
  };
  const relayModels = await LLM.loadModels(LLM.resolved());
  eq(listedAt, "/api/llm/models", "List models asks the relay, not Z.AI directly");
  eq(relayModels.join(","), "glm-4.5-flash,glm-4.7-flash", "the relay's free-tier list is parsed");

  globalThis.fetch = originalFetch;
  LLM.clearKey();
  LLM.saveSettings({ provider: "anthropic", protocol: "", endpoint: "https://api.anthropic.com/v1/messages", model: "claude-sonnet-4-5" });
}

/* ── nothing is sent without a link ───────────────────────────── */
{
  LLM.clearKey();
  const input = G0.newInput("1.0");
  input.name = org; input.cutoff = cutoff;
  let error = null;
  try { await G0LLM.readSources({ input, sources: [{ ...sources[0] }], version: "1.0", cutoff, entity: org }); } catch (e) { error = e; }
  ok(error && /link|key|model/i.test(error.message), "a reading without a linked model fails loudly and does not call anything");
}

/* ── sources with no readable text are named honestly ─────────── */
{
  LLM.setKey("sk-test-key-abcdefghijkl", false);
  LLM.saveSettings({ provider: "anthropic", endpoint: "https://api.anthropic.com/v1/messages", model: "claude-sonnet-4-5", protocol: "" });
  const input = G0.newInput("1.0");
  input.name = org; input.cutoff = cutoff;
  let error = null;
  try { await G0LLM.readSources({ input, sources: [{ ...sources[0], text: "", excerpt: "short" }], version: "1.0", cutoff, entity: org }); } catch (e) { error = e; }
  ok(error && /readable text/.test(error.message), "a record with no stored text says so instead of pretending to read it");
  LLM.clearKey();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
