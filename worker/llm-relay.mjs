/*
 * Z.AI free-tier LLM relay — the server side of LLM Link's "/api/llm" preset.
 *
 * Why this exists: Z.AI's GLM API is OpenAI-compatible but the key is a
 * spending credential, and this deployment keeps it in a Worker secret instead
 * of a browser. The relay holds the key, forwards plain-text chat completions
 * to a fixed upstream origin, and returns them in the same OpenAI-compatible
 * shape js/llm.js already parses.
 *
 * What it refuses to be:
 *   · not a general proxy — one upstream origin, one path, a hard model
 *     allowlist of Z.AI's $0 Flash models, so no caller can spend money
 *   · not a tool dispatcher — tools, tool_choice, functions, response_format,
 *     streaming and every other field are dropped; only text goes either way.
 *     This matches the site's DATA-ONLY LLM boundary: model output is inert.
 *   · not a key forwarder — a client-supplied Authorization header is ignored,
 *     never forwarded, and never echoed. Upstream failure bodies are not
 *     returned either, so they cannot carry account or credential detail.
 *   · not an unlimited faucet — calls are paced over sliding windows, sized to
 *     what this site does rather than to a round number: js/g0-llm.js asks one
 *     question per call, so a Ground-0 source batch is nine calls and a full
 *     reading is dozens. A limit below that would refuse honest work, so one
 *     caller may go as fast as Z.AI's own free pace (about a call a second) and
 *     no faster, while a second, shared ceiling keeps a crowd from spending the
 *     operator's daily free quota in seconds.
 *
 * Prompts do pass through this Worker. That is the trade the operator accepts
 * by holding the key here; it is stated in the operator guide and in the
 * LLM Link provider note.
 */

export const RELAY_ROUTES = Object.freeze({
  chat: '/api/llm',
  models: '/api/llm/models',
  status: '/api/llm/status'
});

const ZAI_ORIGIN = 'https://api.z.ai';
const ZAI_CHAT_PATH = '/api/paas/v4/chat/completions';
const ZAI_MODELS_PATH = '/api/paas/v4/models';

/* Z.AI's free tier: the GLM Flash text models priced at $0 for input, cached
   input and output. Hard allowlist — a paid model is refused here even when
   the operator's key could afford it, so a public site cannot run up a bill. */
export const FREE_TIER_MODELS = Object.freeze(['glm-4.5-flash', 'glm-4.7-flash']);
export const DEFAULT_MODEL = 'glm-4.5-flash';

/* Accepted names for the Worker secret holding the Z.AI key, in order; the
   first one that is set wins. `Z.AI` is read by bracket access because a
   dotted name is not a JavaScript identifier — and because Cloudflare's
   dashboard/CLI may refuse a dotted variable name, the underscore spellings
   are accepted too. /api/llm/status reports which name supplied the key, so an
   operator can confirm the binding without the value ever being returned. */
export const KEY_VARIABLE_NAMES = Object.freeze([
  'Z.AI',
  'ZAI_API_KEY',
  'ZAI_API_TOKEN',
  'ZAI_KEY',
  'ZAI_TOKEN',
  'Z_AI_API_KEY',
  'GLM_API_KEY',
  'ZHIPU_API_KEY',
  'LLM_RELAY_API_KEY',
  'LLM_API_KEY'
]);

const LIMITS = Object.freeze({
  requestBytes: 256 * 1024,   // Ground-0 stages ~36k characters of source text per call
  messages: 32,
  messageChars: 100_000,
  totalChars: 200_000,
  maxOutputTokens: 8_192,     // Z.AI allows far more; the free tier does not need it
  defaultOutputTokens: 1_024,
  upstreamTimeoutMs: 60_000,
  upstreamDetailBytes: 4_096,
  rateWindowMs: 60_000,
  /* One caller may go as fast as Z.AI's own free pace — about one request a
     second — and no faster. The relay declines to be stricter with a reader
     than the provider is with the account, because js/g0-llm.js keeps
     LIMITS.codesPerCall at 1: one Ground-0 source batch is nine model calls,
     and a full reading adds a link-selection call per batch plus one call per
     contested question. Anything tighter would refuse honest work. */
  rateChatMax: 60,
  rateListMax: 12,
  /* The ceiling that actually protects the operator: every caller together,
     per isolate. Z.AI's free tier is roughly one request a second and about a
     thousand a day, and this relay is open to any same-origin caller, so
     without a shared cap a crowd spends the day's quota in seconds. Two
     callers can go flat out; beyond that the pace is shared, and Z.AI's own
     429 remains the authority on what the free tier will take. */
  rateSharedChatMax: 120,
  rateMaxTrackedCallers: 5_000
});

const ROLES = new Set(['system', 'user', 'assistant']);

class RelayError extends Error {
  constructor(status, message, type = 'relay_error', headers = {}) {
    super(message);
    this.status = status;
    this.type = type;
    this.headers = headers;
  }
}

const json = (data, status = 200, extraHeaders = {}) => Response.json(data, {
  status,
  headers: {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders
  }
});
const failure = (message, status = 502, type = 'upstream_error', extraHeaders = {}) =>
  json({ error: { message, type, code: status } }, status, extraHeaders);

/* ── key resolution ───────────────────────────────────────────── */
function resolveKey(env) {
  if (!env || typeof env !== 'object') return null;
  for (const name of KEY_VARIABLE_NAMES) {
    const value = env[name];
    if (typeof value === 'string' && value.trim()) return { name, key: value.trim() };
  }
  return null;
}

const disabled = env => ['false', 'off', 'no', '0'].includes(String(env && env.LLM_RELAY_ENABLED || '').trim().toLowerCase());

function notConfiguredReason(env) {
  if (disabled(env)) return `The relay is switched off by this Worker's LLM_RELAY_ENABLED variable.`;
  return `This deployment has no Z.AI key. Add one as a Worker secret named ${KEY_VARIABLE_NAMES[0]} or ${KEY_VARIABLE_NAMES[1]}.`;
}

/* ── best-effort rate limiting ──────────────────────────────────
   One isolate's memory, so this is abuse friction and not a distributed
   limiter: a caller can reset it by hitting another isolate, and it does not
   survive a restart. Real quota enforcement is Z.AI's own. Documented as such
   rather than presented as protection.

   Two sliding windows answer two different questions:
     · `chat:<caller>` stops one reader monopolising the key.
     · `chat:*` is every caller together, protecting the operator's shared
       free-tier quota from a crowd.
   Both slide, so the wait a 429 quotes is the seconds until the oldest call
   in the window ages out — normally one or two, not the rest of the minute.
   A refused call consumes nothing: the slots are only taken once both windows
   say yes. */
const SHARED_CALLER = '*';
const windows = new Map();
export function clearRelayRateLimits() { windows.clear(); }

function callerKey(request) {
  const header = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '';
  const candidate = String(header).split(',')[0].trim();
  return /^[0-9a-fA-F.:]{3,45}$/.test(candidate) ? candidate : 'unknown';
}

/* The hits still inside the window, oldest first. */
function fresh(hits, now) {
  const cutoff = now - LIMITS.rateWindowMs;
  let index = 0;
  while (index < hits.length && hits[index] <= cutoff) index += 1;
  return index ? hits.slice(index) : hits;
}

/* Read one window without consuming a slot from it. */
function slot(id, now, max) {
  const hits = fresh(windows.get(id) || [], now);
  const full = hits.length >= max;
  const wait = full && hits.length ? Math.max(1, Math.ceil((hits[0] + LIMITS.rateWindowMs - now) / 1000)) : 0;
  return { id, hits, max, full, wait, remaining: Math.max(0, max - hits.length) };
}

function remember(state, now) {
  state.hits.push(now);
  windows.set(state.id, state.hits);
}

/* Seconds until the oldest call in this window ages out. */
const resetIn = (state, now) => state.hits.length
  ? Math.max(1, Math.ceil((state.hits[0] + LIMITS.rateWindowMs - now) / 1000))
  : 0;

/* Keep the map bounded: drop windows that have aged out, then the oldest. */
function prune(now) {
  if (windows.size < LIMITS.rateMaxTrackedCallers) return;
  for (const [key, hits] of windows) {
    if (!hits.length || hits[hits.length - 1] + LIMITS.rateWindowMs <= now) windows.delete(key);
  }
  while (windows.size >= LIMITS.rateMaxTrackedCallers) {
    const oldest = windows.keys().next();
    if (oldest.done) break;
    windows.delete(oldest.value);
  }
}

/* The draft-RFC RateLimit fields, so a caller can see the budget it has left
   before it runs out instead of learning it from a 429. */
const rateHeaders = ({ limit, remaining, reset }, extra = {}) => ({
  'RateLimit-Limit': String(limit),
  'RateLimit-Remaining': String(remaining),
  'RateLimit-Reset': String(reset),
  ...extra
});
const seconds = n => `${n} second${n === 1 ? '' : 's'}`;

/* ── request body ─────────────────────────────────────────────── */
async function readJsonBody(request) {
  const type = request.headers.get('Content-Type') || '';
  if (!type.trim().toLowerCase().startsWith('application/json')) {
    throw new RelayError(415, 'Send application/json.', 'invalid_request_error');
  }
  const reader = request.body && typeof request.body.getReader === 'function' ? request.body.getReader() : null;
  if (!reader) throw new RelayError(400, 'Missing request body.', 'invalid_request_error');
  let size = 0;
  const parts = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > LIMITS.requestBytes) {
      await reader.cancel().catch(() => {});
      throw new RelayError(413, `The relay accepts at most ${Math.round(LIMITS.requestBytes / 1024)} KiB per call. Send fewer or shorter documents per reading pass.`, 'invalid_request_error');
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new RelayError(400, 'Invalid JSON.', 'invalid_request_error'); }
}

/* ── validation ─────────────────────────────────────────────────
   Only what Z.AI's chat-completions route needs, and only in the text-only
   shape this site's data-only boundary allows. Everything else a caller sent
   is discarded rather than forwarded. */
function integerOr(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function validateChatPayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new RelayError(400, 'Expected a JSON object with model and messages.', 'invalid_request_error');
  }
  const model = typeof data.model === 'string' ? data.model.trim().toLowerCase() : '';
  if (!FREE_TIER_MODELS.includes(model)) {
    throw new RelayError(
      404,
      `This relay serves Z.AI's free tier only: ${FREE_TIER_MODELS.join(' or ')}.`,
      'model_not_found'
    );
  }
  if (!Array.isArray(data.messages) || !data.messages.length) {
    throw new RelayError(400, 'Expected a non-empty messages array.', 'invalid_request_error');
  }
  if (data.messages.length > LIMITS.messages) {
    throw new RelayError(400, `At most ${LIMITS.messages} messages per call.`, 'invalid_request_error');
  }
  const messages = [];
  let totalChars = 0;
  let sawUser = false;
  for (const [index, entry] of data.messages.entries()) {
    const position = index + 1;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new RelayError(400, `Message ${position} is not an object.`, 'invalid_request_error');
    }
    const role = typeof entry.role === 'string' ? entry.role.trim().toLowerCase() : '';
    if (!ROLES.has(role)) {
      throw new RelayError(400, `Message ${position} has an unsupported role. The relay accepts system, user and assistant text only — no tool results.`, 'invalid_request_error');
    }
    if (typeof entry.content !== 'string') {
      throw new RelayError(400, `Message ${position} must carry plain-text content. The relay does not forward images, part arrays or tool calls.`, 'invalid_request_error');
    }
    if (!entry.content.trim()) throw new RelayError(400, `Message ${position} is empty.`, 'invalid_request_error');
    if (entry.content.length > LIMITS.messageChars) {
      throw new RelayError(400, `Message ${position} is longer than ${LIMITS.messageChars.toLocaleString()} characters.`, 'invalid_request_error');
    }
    totalChars += entry.content.length;
    if (totalChars > LIMITS.totalChars) {
      throw new RelayError(400, `This call carries more than ${LIMITS.totalChars.toLocaleString()} characters of text. Split the reading into smaller passes.`, 'invalid_request_error');
    }
    if (role === 'user') sawUser = true;
    messages.push({ role, content: entry.content });
  }
  /* Z.AI rejects a prompt made only of system or assistant messages. */
  if (!sawUser) throw new RelayError(400, 'At least one message must have the user role.', 'invalid_request_error');

  const requestedCeiling = typeof data.max_tokens === 'number' ? data.max_tokens
    : typeof data.max_completion_tokens === 'number' ? data.max_completion_tokens : null;
  let maxTokens = LIMITS.defaultOutputTokens;
  let ceilingClamped = false;
  if (requestedCeiling !== null) {
    if (!Number.isFinite(requestedCeiling) || Math.trunc(requestedCeiling) < 1) {
      throw new RelayError(400, 'max_tokens must be a whole number of at least 1.', 'invalid_request_error');
    }
    maxTokens = Math.trunc(requestedCeiling);
    if (maxTokens > LIMITS.maxOutputTokens) { maxTokens = LIMITS.maxOutputTokens; ceilingClamped = true; }
  }

  const requestedTemperature = typeof data.temperature === 'number' && Number.isFinite(data.temperature) ? data.temperature : null;
  if (requestedTemperature !== null && (requestedTemperature < 0 || requestedTemperature > 2)) {
    throw new RelayError(400, 'temperature must be between 0 and 2.', 'invalid_request_error');
  }

  let thinking = 'disabled';
  if (data.thinking && typeof data.thinking === 'object' && !Array.isArray(data.thinking)) {
    const type = typeof data.thinking.type === 'string' ? data.thinking.type.trim().toLowerCase() : '';
    if (type && !['enabled', 'disabled'].includes(type)) {
      throw new RelayError(400, 'thinking.type must be "enabled" or "disabled".', 'invalid_request_error');
    }
    if (type) thinking = type;
  }

  return { model, messages, maxTokens, ceilingClamped, requestedTemperature, thinking };
}

/* Z.AI samples in [0, 1] and documents that a 0 temperature is not usable
   through its OpenAI-compatible route; greedy decoding is `do_sample: false`.
   So 0 becomes do_sample:false with no temperature sent, and anything above 1
   is clamped to 1. The mapping is reported in the response, not hidden. */
function samplingFor(requestedTemperature) {
  if (requestedTemperature === null) return { doSample: true, temperature: null, clamped: false };
  if (requestedTemperature <= 0) return { doSample: false, temperature: null, clamped: requestedTemperature < 0 };
  if (requestedTemperature > 1) return { doSample: true, temperature: 1, clamped: true };
  return { doSample: true, temperature: requestedTemperature, clamped: false };
}

function upstreamBody(validated) {
  const sampling = samplingFor(validated.requestedTemperature);
  const body = {
    model: validated.model,
    messages: validated.messages,
    max_tokens: validated.maxTokens,
    stream: false,
    do_sample: sampling.doSample,
    thinking: { type: validated.thinking }
  };
  if (sampling.doSample && sampling.temperature !== null) body.temperature = sampling.temperature;
  return { body, sampling };
}

/* Strip anything credential-shaped out of an upstream detail before it can be
   repeated to a caller, then bound its length. */
function sanitizeUpstream(text, key) {
  let safe = String(text ?? '').replace(/[\r\n\t]+/g, ' ').trim();
  if (key) safe = safe.split(key).join('••••');
  safe = safe.replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer ••••')
    .replace(/\b[A-Za-z0-9._\-]{32,}\b/g, '••••');
  return safe.slice(0, 220);
}

function retryAfterSeconds(response) {
  const header = response && response.headers && response.headers.get ? response.headers.get('Retry-After') : '';
  return /^\d{1,5}$/.test(String(header || '').trim()) ? String(header).trim() : '';
}

async function readUpstreamDetail(response, key) {
  try {
    const text = await response.text();
    return sanitizeUpstream(text, key);
  } catch { return ''; }
}

/* An upstream refusal is reported in this relay's words. The key never travels
   back, and a 401 from Z.AI becomes a 502 here: the browser's own key is not
   what was rejected, and saying 401 would send the reader to fix the wrong
   thing. Z.AI's own (key-scrubbed, length-bounded) explanation is quoted only
   where it helps the caller fix something — a refused request shape, a model
   this key does not serve, a billing refusal — and withheld for credential,
   rate-limit and server failures, where it would only be noise. */
async function upstreamFailure(response, key, model) {
  const status = Number(response && response.status) || 0;
  const detail = await readUpstreamDetail(response, key);
  if (status === 401 || status === 403) {
    return new RelayError(502, `Z.AI rejected the API key held by this Worker. Check that the secret value is a current Z.AI key with API access enabled.`, 'authentication_error');
  }
  if (status === 404) {
    return new RelayError(404, `Z.AI does not serve ${model} on this key.${detail ? ` Z.AI said: ${detail}` : ''}`, 'model_not_found');
  }
  if (status === 429) {
    const wait = retryAfterSeconds(response);
    return new RelayError(429, `Z.AI's free tier is rate-limited right now.${wait ? ` Retry in about ${wait} seconds.` : ' Wait a little and retry.'}`, 'rate_limit_error', wait ? { 'Retry-After': wait } : {});
  }
  if (status === 402) {
    return new RelayError(402, `Z.AI refused this call for billing reasons, even though ${model} is a free-tier model. Check the Z.AI account's API status.${detail ? ` Z.AI said: ${detail}` : ''}`, 'billing_error');
  }
  if (status === 400 || status === 422) {
    return new RelayError(400, `Z.AI refused the request shape.${detail ? ` Z.AI said: ${detail}` : ''}`, 'invalid_request_error');
  }
  if (status >= 500) {
    return new RelayError(502, `Z.AI could not complete the call (HTTP ${status}). Retry shortly.`, 'upstream_error');
  }
  return new RelayError(502, `Z.AI returned HTTP ${status || 0} and the relay does not forward its response body.`, 'upstream_error');
}

function usageFrom(data) {
  const usage = data && typeof data.usage === 'object' && data.usage ? data.usage : {};
  const prompt = integerOr(usage.prompt_tokens, integerOr(usage.input_tokens, 0));
  const completion = integerOr(usage.completion_tokens, integerOr(usage.output_tokens, 0));
  const total = integerOr(usage.total_tokens, prompt + completion);
  return { prompt_tokens: prompt, completion_tokens: completion, total_tokens: total };
}

/* ── routes ───────────────────────────────────────────────────── */
function statusPayload(env) {
  const found = resolveKey(env);
  const configured = !!found && !disabled(env);
  return {
    configured,
    provider: 'zai',
    tier: 'free',
    upstream: ZAI_ORIGIN,
    endpoint: RELAY_ROUTES.chat,
    modelsEndpoint: RELAY_ROUTES.models,
    defaultModel: DEFAULT_MODEL,
    models: [...FREE_TIER_MODELS],
    /* The variable name is disclosed; its value never is. */
    keyVariable: configured ? found.name : '',
    acceptedKeyVariables: [...KEY_VARIABLE_NAMES],
    limits: {
      requestKiB: Math.round(LIMITS.requestBytes / 1024),
      messages: LIMITS.messages,
      messageChars: LIMITS.messageChars,
      maxOutputTokens: LIMITS.maxOutputTokens,
      defaultOutputTokens: LIMITS.defaultOutputTokens,
      upstreamTimeoutSeconds: Math.round(LIMITS.upstreamTimeoutMs / 1000),
      requestsPerMinute: LIMITS.rateChatMax,
      sharedRequestsPerMinute: LIMITS.rateSharedChatMax,
      modelListRequestsPerMinute: LIMITS.rateListMax,
      windowSeconds: Math.round(LIMITS.rateWindowMs / 1000),
      /* Sized to what this site actually does: js/g0-llm.js asks one question
         per call, so a Ground-0 source batch is nine calls. The limit is
         stated with its scope, because it is one isolate's memory. */
      rateScope: `per caller IP over a sliding ${Math.round(LIMITS.rateWindowMs / 1000)}-second window, plus ${LIMITS.rateSharedChatMax} calls a minute shared by all callers; held in one Worker isolate's memory, so it is abuse friction rather than a distributed quota`
    },
    capabilities: { streaming: false, tools: false, responseFormat: false, images: false, thinking: 'optional, disabled by default' },
    sampling: 'Z.AI samples in [0,1]: a 0 temperature is sent as do_sample:false (greedy), a temperature above 1 is clamped to 1.',
    message: configured ? '' : notConfiguredReason(env)
  };
}

async function listModels(env, dependencies) {
  const found = resolveKey(env);
  if (!found || disabled(env)) throw new RelayError(503, notConfiguredReason(env), 'relay_unavailable');
  const fetcher = dependencies.fetch || globalThis.fetch;
  if (typeof fetcher !== 'function') throw new RelayError(503, 'The relay is unavailable in this Worker runtime.', 'relay_unavailable');
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), LIMITS.upstreamTimeoutMs) : null;
  const rows = id => ({ object: 'list', data: id.map(model => ({ id: model, object: 'model', owned_by: 'zai', free: true })), relay: { provider: 'zai', tier: 'free', keyVariable: found.name } });
  try {
    const response = await fetcher(new URL(ZAI_MODELS_PATH, ZAI_ORIGIN).toString(), {
      method: 'GET',
      headers: { Accept: 'application/json', 'Accept-Language': 'en-US,en', Authorization: `Bearer ${found.key}` },
      redirect: 'error',
      ...(controller ? { signal: controller.signal } : {})
    });
    if (!response || !response.ok) {
      /* The allowlist is known without asking Z.AI, so an unavailable model
         list still tells the reader what this relay will serve — labelled as
         unverified rather than presented as a live answer. */
      const payload = rows([...FREE_TIER_MODELS]);
      payload.relay.verified = false;
      payload.relay.warning = `Z.AI's model list returned HTTP ${Number(response && response.status) || 0}; these are the relay's allowlisted free-tier models, not a live list.`;
      return json(payload);
    }
    let data;
    try { data = await response.json(); } catch { data = null; }
    const listed = Array.isArray(data && data.data) ? data.data : Array.isArray(data && data.models) ? data.models : [];
    const ids = listed.map(row => typeof row === 'string' ? row : row && (row.id || row.name)).filter(id => typeof id === 'string' && id);
    /* Intersect: only what Z.AI lists for this key AND the free allowlist. */
    const allowed = FREE_TIER_MODELS.filter(model => ids.some(id => id.trim().toLowerCase() === model));
    const payload = rows(allowed.length ? allowed : [...FREE_TIER_MODELS]);
    payload.relay.verified = allowed.length > 0;
    if (!allowed.length) payload.relay.warning = "Z.AI listed none of the relay's free-tier models for this key; the allowlist is shown unverified.";
    return json(payload);
  } catch (error) {
    if (error && error.name === 'AbortError') throw new RelayError(504, 'Z.AI did not answer the model list in time. Try again shortly.', 'upstream_error');
    throw new RelayError(502, 'Z.AI could not be reached for the model list. The relay will still serve its allowlisted free-tier models.', 'upstream_error');
  } finally {
    if (timeout !== null) clearTimeout(timeout);
  }
}

async function relayChat(request, env, dependencies, caller, now) {
  const found = resolveKey(env);
  if (!found || disabled(env)) throw new RelayError(503, notConfiguredReason(env), 'relay_unavailable');
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (!origin || origin !== url.origin) {
    throw new RelayError(403, 'The relay accepts same-origin browser requests only.', 'invalid_request_error');
  }
  /* Both windows are read before either is consumed, so a refused call costs
     the caller nothing, and the shared ceiling is never charged for a request
     this caller was not allowed to make anyway. */
  const mine = slot(`chat:${caller}`, now, LIMITS.rateChatMax);
  const shared = slot(`chat:${SHARED_CALLER}`, now, LIMITS.rateSharedChatMax);
  if (mine.full) {
    throw new RelayError(429, `This relay allows ${LIMITS.rateChatMax} model calls a minute per caller, and this caller has used them. A Ground-0 reading asks nine questions per source batch, so calls arrive quickly; the window slides rather than resetting on the minute, so retry in about ${seconds(mine.wait)}.`, 'rate_limit_error', rateHeaders({ limit: mine.max, remaining: 0, reset: mine.wait }, { 'Retry-After': String(mine.wait) }));
  }
  if (shared.full) {
    throw new RelayError(429, `This relay's shared Z.AI free-tier key is at its pace limit of ${LIMITS.rateSharedChatMax} calls a minute across all callers, so other people are using it right now. This caller's own budget is untouched; retry in about ${seconds(shared.wait)}.`, 'rate_limit_error', rateHeaders({ limit: mine.max, remaining: mine.remaining, reset: shared.wait }, { 'Retry-After': String(shared.wait) }));
  }
  remember(mine, now);
  remember(shared, now);
  prune(now);
  const pacing = {
    limit: mine.max,
    remaining: Math.max(0, mine.max - mine.hits.length),
    reset: resetIn(mine, now),
    sharedLimit: shared.max,
    sharedRemaining: Math.max(0, shared.max - shared.hits.length)
  };
  const validated = validateChatPayload(await readJsonBody(request));
  const fetcher = dependencies.fetch || globalThis.fetch;
  if (typeof fetcher !== 'function') throw new RelayError(503, 'The relay is unavailable in this Worker runtime.', 'relay_unavailable');
  const { body, sampling } = upstreamBody(validated);

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), LIMITS.upstreamTimeoutMs) : null;
  try {
    const response = await fetcher(new URL(ZAI_CHAT_PATH, ZAI_ORIGIN).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Language': 'en-US,en',
        Authorization: `Bearer ${found.key}`
      },
      body: JSON.stringify(body),
      redirect: 'error',
      ...(controller ? { signal: controller.signal } : {})
    });
    if (!response || !response.ok) throw await upstreamFailure(response, found.key, validated.model);

    let data;
    try { data = await response.json(); }
    catch { throw new RelayError(502, 'Z.AI returned a response that was not valid JSON.', 'upstream_error'); }
    const choice = data && Array.isArray(data.choices) ? data.choices[0] : null;
    const message = choice && choice.message && typeof choice.message === 'object' ? choice.message : null;
    const content = message && typeof message.content === 'string' ? message.content : '';
    const reasoning = message && typeof message.reasoning_content === 'string' ? message.reasoning_content : '';
    if (!content.trim()) {
      if (reasoning.trim()) {
        throw new RelayError(502, `Z.AI spent the ${validated.maxTokens}-token output ceiling on internal reasoning and returned no answer text. Raise max_tokens, or leave thinking disabled as this relay does by default.`, 'upstream_error');
      }
      if (message && Array.isArray(message.tool_calls) && message.tool_calls.length) {
        throw new RelayError(502, 'Z.AI answered with a tool call instead of text. This relay is data-only and dispatches no model tools.', 'upstream_error');
      }
      throw new RelayError(502, 'Z.AI returned no text. The model may have refused the request or reached its output limit.', 'upstream_error');
    }
    return json({
      id: typeof data.id === 'string' ? data.id : '',
      object: 'chat.completion',
      created: integerOr(data.created, Math.floor(now / 1000)),
      model: typeof data.model === 'string' && data.model ? data.model : validated.model,
      choices: [{
        index: 0,
        /* reasoning_content and tool_calls are deliberately not forwarded:
           the browser gets answer text and nothing executable. */
        message: { role: 'assistant', content },
        finish_reason: choice && typeof choice.finish_reason === 'string' ? choice.finish_reason : 'stop'
      }],
      usage: usageFrom(data),
      relay: {
        provider: 'zai',
        tier: 'free',
        keyVariable: found.name,
        thinking: validated.thinking,
        requestedTemperature: validated.requestedTemperature,
        doSample: sampling.doSample,
        temperatureSent: sampling.temperature,
        clamped: sampling.clamped || validated.ceilingClamped,
        maxTokensSent: validated.maxTokens,
        /* What this caller has left of its own budget, so a reading can see
           the pace it is allowed before the relay has to refuse a call. */
        pacing
      }
    }, 200, rateHeaders(pacing));
  } catch (error) {
    if (error instanceof RelayError) throw error;
    if (error && error.name === 'AbortError') {
      throw new RelayError(504, `Z.AI did not finish within ${Math.round(LIMITS.upstreamTimeoutMs / 1000)} seconds. Retry, or send a smaller reading pass.`, 'upstream_error');
    }
    throw new RelayError(502, 'Z.AI could not be reached. Check the Worker connection and retry.', 'upstream_error');
  } finally {
    if (timeout !== null) clearTimeout(timeout);
  }
}

export async function handleLlmRelay(request, env = {}, dependencies = {}) {
  const now = typeof dependencies.now === 'function' ? dependencies.now() : Date.now();
  const caller = callerKey(request);
  try {
    const pathname = new URL(request.url).pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
    if (pathname === RELAY_ROUTES.status) {
      if (request.method !== 'GET') throw new RelayError(405, 'The relay status is read-only.', 'invalid_request_error', { Allow: 'GET' });
      return json(statusPayload(env));
    }
    if (pathname === RELAY_ROUTES.models) {
      if (request.method !== 'GET') throw new RelayError(405, 'The model list is read-only.', 'invalid_request_error', { Allow: 'GET' });
      const list = slot(`list:${caller}`, now, LIMITS.rateListMax);
      if (list.full) {
        throw new RelayError(429, `Too many model-list requests from this caller: the limit is ${LIMITS.rateListMax} a minute. Retry in about ${seconds(list.wait)}.`, 'rate_limit_error', rateHeaders({ limit: list.max, remaining: 0, reset: list.wait }, { 'Retry-After': String(list.wait) }));
      }
      remember(list, now);
      prune(now);
      return await listModels(env, dependencies);
    }
    if (pathname === RELAY_ROUTES.chat) {
      if (request.method === 'OPTIONS') {
        return json({ endpoint: RELAY_ROUTES.chat, methods: ['POST'] }, 200, { Allow: 'POST, OPTIONS' });
      }
      if (request.method !== 'POST') {
        throw new RelayError(405, 'The relay accepts POST chat completions. Its status is at /api/llm/status.', 'invalid_request_error', { Allow: 'POST' });
      }
      return await relayChat(request, env, dependencies, caller, now);
    }
    throw new RelayError(404, 'Unknown relay endpoint.', 'not_found');
  } catch (error) {
    if (error instanceof RelayError) return failure(error.message, error.status, error.type, error.headers);
    /* Never surface a raw driver/network error: it can carry request detail. */
    return failure('The relay could not complete this call. Retry shortly.', 503, 'relay_error');
  }
}
