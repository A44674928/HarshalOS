/* Node harness: the Z.AI free-tier relay (worker/llm-relay.mjs).

   No network and no real Z.AI key: a stub fetch answers in Z.AI's shape, so
   what is under test is the relay's own contract — a server-held key that is
   never forwarded from or echoed to a caller, a hard free-model allowlist,
   text-only payloads, Z.AI's sampling translation, sanitized upstream
   failures, and the per-caller rate limit.

   Run: node --test tests/llm-relay-test.mjs */

import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import {
  handleLlmRelay,
  clearRelayRateLimits,
  FREE_TIER_MODELS,
  DEFAULT_MODEL,
  KEY_VARIABLE_NAMES,
  RELAY_ROUTES
} from "../worker/llm-relay.mjs";
import worker from "../worker/index.mjs";

const ORIGIN = "https://os.example.test";
const NOW = Date.parse("2026-10-01T12:00:00.000Z");
const KEY = "zai-test-only-secret-key";
const ENV = { "Z.AI": KEY };
const BODYLESS = new Set(["GET", "HEAD", "OPTIONS"]);

const chatRequest = (payload, { headers = {}, method = "POST", path = RELAY_ROUTES.chat, body, omitOrigin = false } = {}) => {
  const init = {
    method,
    headers: { "Content-Type": "application/json", Origin: ORIGIN, "CF-Connecting-IP": "203.0.113.7", ...headers }
  };
  const raw = body !== undefined ? body : payload === null || payload === undefined ? undefined : JSON.stringify(payload);
  if (raw !== undefined && !BODYLESS.has(method)) init.body = raw;
  if (omitOrigin) delete init.headers.Origin;
  return new Request(`${ORIGIN}${path}`, init);
};
const get = path => chatRequest(null, { method: "GET", path });
const messages = (content = "Read this record and answer.") => [
  { role: "system", content: "You are an audit reader." },
  { role: "user", content }
];
const zaiReply = (content = "The record states an appeal procedure.", extra = {}) => Response.json({
  id: "chat-1", created: 1_780_000_000, model: "glm-4.5-flash",
  choices: [{ index: 0, message: { role: "assistant", content, ...extra }, finish_reason: "stop" }],
  usage: { prompt_tokens: 120, completion_tokens: 34, total_tokens: 154 }
});

/* Records every upstream call so a test can assert both what was sent and
   what was deliberately not sent. */
function stubFetch(reply = () => zaiReply()) {
  const calls = [];
  const fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options, body: options.body ? JSON.parse(options.body) : null });
    return reply(url, options, calls.length);
  };
  return { fetch, calls };
}
const run = (request, env = ENV, dependencies = {}) =>
  handleLlmRelay(request, env, { now: () => NOW, ...dependencies });
const text = async response => response.text();

beforeEach(() => clearRelayRateLimits());

/* ── configuration ────────────────────────────────────────────── */
test("relay refuses to call Z.AI with no key configured and says which secret to add", async () => {
  const { fetch, calls } = stubFetch();
  const response = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), {}, { fetch });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.match(body.error.message, /no Z\.AI key/i);
  assert.ok(body.error.message.includes("Z.AI") && body.error.message.includes("ZAI_API_KEY"));
  assert.equal(calls.length, 0, "an unconfigured relay performs no upstream call");
  assert.equal(JSON.stringify(body).includes(KEY), false);
});

test("relay reads the dotted Z.AI secret name and the underscore aliases", async () => {
  for (const name of ["Z.AI", "ZAI_API_KEY", "ZAI_API_TOKEN", "GLM_API_KEY"]) {
    assert.ok(KEY_VARIABLE_NAMES.includes(name), `${name} is an accepted secret name`);
    clearRelayRateLimits();
    const { fetch, calls } = stubFetch();
    const response = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), { [name]: KEY }, { fetch });
    assert.equal(response.status, 200, `${name} should configure the relay`);
    const payload = await response.json();
    assert.equal(payload.relay.keyVariable, name, "the relay reports which variable supplied the key");
    assert.equal(calls[0].options.headers.Authorization, `Bearer ${KEY}`);
  }
});

test("relay can be switched off by an operator variable", async () => {
  const { fetch, calls } = stubFetch();
  const response = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), { ...ENV, LLM_RELAY_ENABLED: "false" }, { fetch });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error.message, /switched off/i);
  assert.equal(calls.length, 0);
});

/* ── the call that is forwarded ───────────────────────────────── */
test("relay forwards only allowlisted text fields to a fixed Z.AI origin", async () => {
  const { fetch, calls } = stubFetch();
  const response = await run(chatRequest({
    model: "glm-4.7-flash", messages: messages(), max_tokens: 700, temperature: 0.4,
    /* Everything below must be dropped rather than forwarded. */
    stream: true, tools: [{ type: "function", function: { name: "HOS.revoke" } }], tool_choice: "auto",
    functions: [{ name: "HOS.revoke" }], response_format: { type: "json_object" }, stop: ["</s>"],
    user_id: "attacker", request_id: "abc123", logprobs: true, top_p: 0.2, n: 4,
    extra: { nested: "value" }
  }), ENV, { fetch });
  assert.equal(response.status, 200);
  const upstream = new URL(calls[0].url);
  assert.equal(upstream.origin, "https://api.z.ai");
  assert.equal(upstream.pathname, "/api/paas/v4/chat/completions");
  assert.deepEqual(Object.keys(calls[0].body).sort(), ["do_sample", "max_tokens", "messages", "model", "stream", "temperature", "thinking"]);
  assert.equal(calls[0].body.model, "glm-4.7-flash");
  assert.equal(calls[0].body.stream, false, "streaming is never requested");
  assert.equal(calls[0].body.max_tokens, 700);
  assert.equal(calls[0].body.temperature, 0.4);
  assert.equal(calls[0].body.do_sample, true);
  assert.deepEqual(calls[0].body.thinking, { type: "disabled" }, "chain-of-thought is off by default so the ceiling buys answer text");
  assert.deepEqual(calls[0].body.messages, messages());
  assert.equal(calls[0].options.redirect, "error");
  assert.equal(calls[0].options.headers["Accept-Language"], "en-US,en");
});

test("relay never forwards a caller-supplied Authorization header", async () => {
  const { fetch, calls } = stubFetch();
  const response = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }, {
    headers: { Authorization: "Bearer attacker-key", "X-Api-Key": "attacker-key-2" }
  }), ENV, { fetch });
  assert.equal(response.status, 200);
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${KEY}`, "only the Worker's own key is sent upstream");
  assert.equal(calls[0].options.headers["X-Api-Key"], undefined);
});

test("relay returns an OpenAI-compatible reply and never the key", async () => {
  const { fetch } = stubFetch();
  const response = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages(), max_tokens: 700, temperature: 0 }), ENV, { fetch });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(payload.object, "chat.completion");
  assert.equal(payload.model, "glm-4.5-flash");
  assert.equal(payload.choices[0].message.role, "assistant");
  assert.equal(payload.choices[0].message.content, "The record states an appeal procedure.");
  assert.deepEqual(payload.usage, { prompt_tokens: 120, completion_tokens: 34, total_tokens: 154 });
  /* A greedy request is translated, and the translation is disclosed. */
  assert.equal(payload.relay.doSample, false);
  assert.equal(payload.relay.temperatureSent, null);
  assert.equal(payload.relay.requestedTemperature, 0);
  assert.equal(payload.relay.tier, "free");
  assert.equal(JSON.stringify(payload).includes(KEY), false, "the response carries the variable name, never its value");
});

test("relay strips reasoning text and tool calls out of the reply it forwards", async () => {
  const { fetch } = stubFetch(() => zaiReply("Answer text.", {
    reasoning_content: "internal chain of thought that must not leave the Worker",
    tool_calls: [{ id: "call_1", type: "function", function: { name: "HOS.revoke", arguments: "{}" } }]
  }));
  const payload = await (await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, { fetch })).json();
  assert.equal(payload.choices[0].message.content, "Answer text.");
  assert.equal(payload.choices[0].message.reasoning_content, undefined);
  assert.equal(payload.choices[0].message.tool_calls, undefined);
  assert.equal(JSON.stringify(payload).includes("HOS.revoke"), false, "no model tool call is handed to the browser");
});

test("relay explains a tool-call-only or reasoning-only answer instead of returning empty text", async () => {
  const toolsOnly = stubFetch(() => zaiReply("", { tool_calls: [{ type: "function", function: { name: "HOS.revoke" } }] }));
  const toolResponse = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, toolsOnly);
  assert.equal(toolResponse.status, 502);
  assert.match((await toolResponse.json()).error.message, /tool call instead of text/i);

  clearRelayRateLimits();
  const reasoningOnly = stubFetch(() => zaiReply("", { reasoning_content: "thoughts only" }));
  const reasoningResponse = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages(), max_tokens: 700 }), ENV, reasoningOnly);
  assert.equal(reasoningResponse.status, 502);
  assert.match((await reasoningResponse.json()).error.message, /output ceiling on internal reasoning/i);
});

/* ── Z.AI's sampling contract ─────────────────────────────────── */
test("relay translates temperature into the sampling Z.AI actually accepts", async () => {
  const cases = [
    { requested: 0, doSample: false, temperature: undefined, clamped: false },
    { requested: 0.6, doSample: true, temperature: 0.6, clamped: false },
    { requested: 1, doSample: true, temperature: 1, clamped: false },
    { requested: 1.7, doSample: true, temperature: 1, clamped: true },
    { requested: undefined, doSample: true, temperature: undefined, clamped: false }
  ];
  for (const expected of cases) {
    clearRelayRateLimits();
    const { fetch, calls } = stubFetch();
    const payloadIn = { model: DEFAULT_MODEL, messages: messages() };
    if (expected.requested !== undefined) payloadIn.temperature = expected.requested;
    const response = await run(chatRequest(payloadIn), ENV, { fetch });
    assert.equal(response.status, 200, `temperature ${expected.requested} should be accepted`);
    const body = calls[0].body;
    assert.equal(body.do_sample, expected.doSample, `do_sample for temperature ${expected.requested}`);
    assert.equal(body.temperature, expected.temperature, `forwarded temperature for ${expected.requested}`);
    if (expected.requested === 0) assert.equal("temperature" in body, false, "Z.AI rejects a 0 temperature, so none is sent");
    const reported = await response.json();
    assert.equal(reported.relay.clamped, expected.clamped, `clamping is disclosed for temperature ${expected.requested}`);
  }
  clearRelayRateLimits();
  const { fetch, calls } = stubFetch();
  const rejected = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages(), temperature: 3 }), ENV, { fetch });
  assert.equal(rejected.status, 400);
  assert.match((await rejected.json()).error.message, /temperature must be between 0 and 2/i);
  assert.equal(calls.length, 0);
});

test("relay clamps an oversized output ceiling and accepts the renamed parameter", async () => {
  const { fetch, calls } = stubFetch();
  const response = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages(), max_tokens: 500_000 }), ENV, { fetch });
  const payload = await response.json();
  assert.equal(calls[0].body.max_tokens, 8192);
  assert.equal(payload.relay.maxTokensSent, 8192);
  assert.equal(payload.relay.clamped, true, "a clamped ceiling is reported, not hidden");

  clearRelayRateLimits();
  const renamed = stubFetch();
  const renamedResponse = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages(), max_completion_tokens: 260 }), ENV, renamed);
  assert.equal(renamedResponse.status, 200);
  assert.equal(renamed.calls[0].body.max_tokens, 260, "max_completion_tokens is understood as the same ceiling");
  assert.equal(renamed.calls[0].body.max_completion_tokens, undefined);

  clearRelayRateLimits();
  const invalid = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages(), max_tokens: 0 }), ENV, stubFetch());
  assert.equal(invalid.status, 400);
  assert.match((await invalid.json()).error.message, /max_tokens/i);
});

/* ── the allowlist and payload shape ──────────────────────────── */
test("relay serves only Z.AI's free-tier models and refuses a paid one without calling", async () => {
  assert.deepEqual([...FREE_TIER_MODELS], ["glm-4.5-flash", "glm-4.7-flash"]);
  for (const model of ["glm-5.3", "glm-4.7", "glm-4.5-air", "glm-4.5", "claude-sonnet-4-5", "", "../glm-5.3"]) {
    clearRelayRateLimits();
    const { fetch, calls } = stubFetch();
    const response = await run(chatRequest({ model, messages: messages() }), ENV, { fetch });
    assert.equal(response.status, 404, `${model || "(empty)"} is outside the free allowlist`);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.match((await response.json()).error.message, /free tier only/i);
    assert.equal(calls.length, 0, "a refused model never reaches Z.AI");
  }
  clearRelayRateLimits();
  const upper = stubFetch();
  const upperResponse = await run(chatRequest({ model: "GLM-4.5-Flash", messages: messages() }), ENV, upper);
  assert.equal(upperResponse.status, 200, "model matching is case-insensitive");
  assert.equal(upper.calls[0].body.model, "glm-4.5-flash");
});

test("relay refuses non-text messages, unsupported roles, and empty prompts", async () => {
  const cases = [
    [{ model: DEFAULT_MODEL, messages: [] }, /non-empty messages/i],
    [{ model: DEFAULT_MODEL, messages: [{ role: "user", content: ["image", { type: "image_url" }] }] }, /plain-text content/i],
    [{ model: DEFAULT_MODEL, messages: [{ role: "tool", content: "result" }, { role: "user", content: "hi" }] }, /unsupported role/i],
    [{ model: DEFAULT_MODEL, messages: [{ role: "user", content: "   " }] }, /empty/i],
    [{ model: DEFAULT_MODEL, messages: [{ role: "system", content: "only a system prompt" }] }, /user role/i],
    [{ model: DEFAULT_MODEL, messages: "not-an-array" }, /non-empty messages/i],
    [{ model: DEFAULT_MODEL }, /non-empty messages/i],
    ["not-json{", /Invalid JSON/i]
  ];
  for (const [payload, pattern] of cases) {
    clearRelayRateLimits();
    const { fetch, calls } = stubFetch();
    const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
    const response = await run(chatRequest(null, { body: raw }), ENV, { fetch });
    assert.equal(response.status, 400, `${raw.slice(0, 60)} should be refused`);
    assert.match((await response.json()).error.message, pattern);
    assert.equal(calls.length, 0);
  }
  clearRelayRateLimits();
  const many = stubFetch();
  const tooMany = await run(chatRequest({
    model: DEFAULT_MODEL,
    messages: Array.from({ length: 33 }, (_, index) => ({ role: index === 0 ? "system" : "user", content: `message ${index}` }))
  }), ENV, many);
  assert.equal(tooMany.status, 400);
  assert.match((await tooMany.json()).error.message, /At most 32 messages/i);
  assert.equal(many.calls.length, 0);
});

test("relay bounds the request body it will read", async () => {
  const { fetch, calls } = stubFetch();
  const huge = "x".repeat(300 * 1024);
  const response = await run(chatRequest({ model: DEFAULT_MODEL, messages: [{ role: "user", content: huge }] }), ENV, { fetch });
  assert.equal(response.status, 413);
  assert.match((await response.json()).error.message, /at most 256 KiB/i);
  assert.equal(calls.length, 0);
});

/* ── route, method and origin discipline ──────────────────────── */
test("relay enforces method, route and same-origin rules", async () => {
  const cases = [
    [chatRequest(null, { method: "GET" }), 405, /POST chat completions/i],
    [chatRequest(null, { method: "PUT", body: "{}" }), 405, /POST/i],
    [get(RELAY_ROUTES.models), 200, null],
    [chatRequest(null, { method: "POST", path: RELAY_ROUTES.models, body: "{}" }), 405, /read-only/i],
    [chatRequest(null, { method: "POST", path: RELAY_ROUTES.status, body: "{}" }), 405, /read-only/i],
    [get("/api/llm/secret"), 404, /Unknown relay endpoint/i],
    [get("/api/llm/../storage/snapshot"), 404, /Unknown relay endpoint/i],
    [chatRequest({ model: DEFAULT_MODEL, messages: messages() }, { headers: { Origin: "https://evil.example" } }), 403, /same-origin/i],
    [chatRequest({ model: DEFAULT_MODEL, messages: messages() }, { omitOrigin: true }), 403, /same-origin/i],
    [chatRequest({ model: DEFAULT_MODEL, messages: messages() }, { headers: { "Content-Type": "text/plain" } }), 415, /application\/json/i]
  ];
  for (const [request, status, pattern] of cases) {
    clearRelayRateLimits();
    const { fetch, calls } = stubFetch();
    const response = await run(request, ENV, { fetch });
    assert.equal(response.status, status, `${request.method} ${new URL(request.url).pathname} should return ${status}`);
    if (pattern) assert.match((await response.json()).error.message, pattern);
    if (status === 405) assert.ok(response.headers.get("allow"), "a refused method names what is allowed");
    if (status >= 400) assert.equal(calls.length, 0, "a refused request never reaches Z.AI");
  }
  clearRelayRateLimits();
  const options = await run(chatRequest(null, { method: "OPTIONS" }), ENV, stubFetch());
  assert.equal(options.status, 200);
  assert.equal(options.headers.get("allow"), "POST, OPTIONS");
});

/* ── upstream failures are sanitized ──────────────────────────── */
test("relay reports an upstream refusal in its own words without echoing Z.AI's body", async () => {
  const upstreamBody = `{"code":1302,"message":"upstream detail naming ${KEY} and the account"}`;
  const cases = [
    [401, 502, /rejected the API key held by this Worker/i, false],
    [403, 502, /rejected the API key held by this Worker/i, false],
    [404, 404, /does not serve glm-4\.5-flash/i, true],
    [400, 400, /refused the request shape/i, true],
    [402, 402, /billing reasons/i, true],
    [500, 502, /could not complete the call/i, false],
    [503, 502, /could not complete the call/i, false]
  ];
  for (const [upstream, expected, pattern, quotesUpstream] of cases) {
    clearRelayRateLimits();
    const { fetch } = stubFetch(() => new Response(upstreamBody, { status: upstream, headers: { "Content-Type": "application/json" } }));
    const response = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, { fetch });
    assert.equal(response.status, expected, `upstream ${upstream} should surface as ${expected}`);
    const body = await text(response);
    assert.match(body, pattern);
    assert.equal(body.includes(KEY), false, `an upstream ${upstream} body must not leak the key`);
    assert.equal(body.includes("upstream detail"), quotesUpstream, `an upstream ${upstream} detail is quoted only for a request-shape or model problem`);
  }
});

test("relay passes a numeric Retry-After through and drops one it cannot trust", async () => {
  const numeric = stubFetch(() => new Response("slow down", { status: 429, headers: { "Retry-After": "17" } }));
  const limited = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, numeric);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "17");
  const limitedBody = await limited.json();
  assert.equal(limitedBody.error.type, "rate_limit_error");
  assert.match(limitedBody.error.message, /rate-limited/i);
  assert.equal(JSON.stringify(limitedBody).includes("slow down"), false, "the upstream body is not echoed");

  clearRelayRateLimits();
  const hostile = stubFetch(() => new Response("x", { status: 429, headers: { "Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT" } }));
  const hostileResponse = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, hostile);
  assert.equal(hostileResponse.status, 429);
  assert.equal(hostileResponse.headers.get("retry-after"), null, "a non-numeric delay is not forwarded as a header");
});

test("relay reports an unreachable or slow upstream without blaming the caller's key", async () => {
  const throwing = stubFetch(() => { throw new TypeError(`network down while using ${KEY}`); });
  const unreachable = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, throwing);
  assert.equal(unreachable.status, 502);
  const unreachableBody = await text(unreachable);
  assert.match(unreachableBody, /could not be reached/i);
  assert.equal(unreachableBody.includes(KEY), false, "a transport error is not echoed either");

  clearRelayRateLimits();
  const aborting = stubFetch(() => { const error = new Error("aborted"); error.name = "AbortError"; throw error; });
  const slow = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, aborting);
  assert.equal(slow.status, 504);
  assert.match((await slow.json()).error.message, /did not finish within 60 seconds/i);

  clearRelayRateLimits();
  const notJson = stubFetch(() => new Response("<html>gateway</html>", { status: 200, headers: { "Content-Type": "text/html" } }));
  const badJson = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, notJson);
  assert.equal(badJson.status, 502);
  assert.match((await badJson.json()).error.message, /not valid JSON/i);
});

/* ── abuse friction ───────────────────────────────────────────── */
test("relay rate-limits each caller per minute and resets with the window", async () => {
  let clock = NOW;
  const { fetch, calls } = stubFetch();
  const dependencies = { fetch, now: () => clock };
  for (let attempt = 1; attempt <= 12; attempt++) {
    const response = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, dependencies);
    assert.equal(response.status, 200, `call ${attempt} is inside the budget`);
  }
  assert.equal(calls.length, 12);
  const blocked = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, dependencies);
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("retry-after")) > 0, "the caller is told how long to wait");
  assert.match((await blocked.json()).error.message, /12 model calls per caller per minute/i);
  assert.equal(calls.length, 12, "a rate-limited call never reaches Z.AI");

  /* A different caller has its own budget; the same caller's window resets. */
  const other = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }, { headers: { "CF-Connecting-IP": "198.51.100.9" } }), ENV, dependencies);
  assert.equal(other.status, 200);
  clock = NOW + 61_000;
  const after = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, dependencies);
  assert.equal(after.status, 200, "the window is a minute wide");

  clearRelayRateLimits();
  clock = NOW;
  const listFetch = stubFetch(() => Response.json({ data: [{ id: "glm-4.5-flash" }] }));
  for (let attempt = 0; attempt < 6; attempt++) {
    const listed = await run(get(RELAY_ROUTES.models), ENV, { fetch: listFetch.fetch, now: () => clock });
    assert.equal(listed.status, 200, `model list ${attempt + 1} is inside its budget`);
  }
  const listBlocked = await run(get(RELAY_ROUTES.models), ENV, { fetch: listFetch.fetch, now: () => clock });
  assert.equal(listBlocked.status, 429, "the model list has its own smaller budget");
});

test("relay keeps its caller table bounded", async () => {
  const clock = NOW;
  const { fetch } = stubFetch();
  for (let index = 0; index < 5_010; index++) {
    await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }, {
      headers: { "CF-Connecting-IP": `203.0.${Math.floor(index / 250)}.${index % 250}` }
    }), ENV, { fetch, now: () => clock });
  }
  const stillWorking = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }, { headers: { "CF-Connecting-IP": "203.0.113.7" } }), ENV, { fetch, now: () => clock });
  assert.ok([200, 429].includes(stillWorking.status), "a bounded table still answers");
  const afterWindow = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }, { headers: { "CF-Connecting-IP": "203.0.113.7" } }), ENV, { fetch, now: () => clock + 120_000 });
  assert.equal(afterWindow.status, 200, "expired entries are dropped rather than held forever");
});

/* ── status and model list ────────────────────────────────────── */
test("status route discloses configuration and limits but never the key value", async () => {
  const configured = await run(get(RELAY_ROUTES.status), ENV, stubFetch());
  assert.equal(configured.status, 200);
  const payload = await configured.json();
  assert.equal(payload.configured, true);
  assert.equal(payload.provider, "zai");
  assert.equal(payload.tier, "free");
  assert.equal(payload.upstream, "https://api.z.ai");
  assert.equal(payload.defaultModel, DEFAULT_MODEL);
  assert.deepEqual(payload.models, [...FREE_TIER_MODELS]);
  assert.equal(payload.keyVariable, "Z.AI", "the binding's name is disclosed so an operator can verify it");
  assert.deepEqual(payload.acceptedKeyVariables, [...KEY_VARIABLE_NAMES]);
  assert.equal(payload.capabilities.streaming, false);
  assert.equal(payload.capabilities.tools, false);
  assert.equal(payload.limits.requestsPerMinute, 12);
  assert.match(payload.sampling, /do_sample:false/);
  assert.equal(JSON.stringify(payload).includes(KEY), false);

  const missing = await run(get(RELAY_ROUTES.status), {}, stubFetch());
  const missingPayload = await missing.json();
  assert.equal(missing.status, 200, "an unconfigured relay still answers its status route");
  assert.equal(missingPayload.configured, false);
  assert.equal(missingPayload.keyVariable, "");
  assert.match(missingPayload.message, /no Z\.AI key/i);
});

test("model list is the intersection of Z.AI's answer and the free allowlist", async () => {
  const { fetch, calls } = stubFetch(() => Response.json({
    data: [{ id: "glm-4.5-flash" }, { id: "glm-4.7-flash" }, { id: "glm-5.3" }, { id: "glm-4.5-air" }]
  }));
  const response = await run(get(RELAY_ROUTES.models), ENV, { fetch });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.object, "list");
  assert.deepEqual(payload.data.map(row => row.id), ["glm-4.5-flash", "glm-4.7-flash"], "paid models are not offered");
  assert.equal(payload.data.every(row => row.free === true && row.owned_by === "zai"), true);
  assert.equal(payload.relay.verified, true);
  assert.equal(new URL(calls[0].url).pathname, "/api/paas/v4/models");
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${KEY}`);
  assert.equal(JSON.stringify(payload).includes(KEY), false);
});

test("model list falls back to the labelled allowlist when Z.AI will not answer it", async () => {
  const failing = stubFetch(() => new Response("nope", { status: 500 }));
  const response = await run(get(RELAY_ROUTES.models), ENV, failing);
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(payload.data.map(row => row.id), [...FREE_TIER_MODELS]);
  assert.equal(payload.relay.verified, false, "a fallback list says it was not verified upstream");
  assert.match(payload.relay.warning, /HTTP 500/);

  clearRelayRateLimits();
  const empty = stubFetch(() => Response.json({ data: [{ id: "glm-5.3" }] }));
  const emptyPayload = await (await run(get(RELAY_ROUTES.models), ENV, empty)).json();
  assert.equal(emptyPayload.relay.verified, false);
  assert.match(emptyPayload.relay.warning, /none of the relay's free-tier models/i);

  clearRelayRateLimits();
  const unconfigured = await run(get(RELAY_ROUTES.models), {}, stubFetch());
  assert.equal(unconfigured.status, 503, "an unconfigured relay does not pretend to list models");
});

/* ── worker wiring ────────────────────────────────────────────── */
test("worker routes /api/llm to the relay before the Access-protected storage API", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => zaiReply();
  try {
    const response = await worker.fetch(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.object, "chat.completion");
    assert.equal(payload.relay.provider, "zai");

    /* The relay is not behind Access, so it answers without an Access JWT —
       while /api/storage/* still fails closed without one. */
    const status = await worker.fetch(new Request(`${ORIGIN}/api/llm/status`), ENV);
    assert.equal(status.status, 200);
    assert.equal((await status.json()).configured, true);
    const accessEnv = { ...ENV, MONGODB_URI: "mongodb://example", ACCESS_TEAM_DOMAIN: "example.cloudflareaccess.com", ACCESS_AUD: "aud-tag", OWNER_EMAIL: "owner@example.test" };
    const storage = await worker.fetch(new Request(`${ORIGIN}/api/storage/status`), accessEnv);
    assert.equal(storage.status, 401, "private storage still requires Cloudflare Access");
  } finally {
    globalThis.fetch = originalFetch;
    clearRelayRateLimits();
  }
});

test("worker routes an unknown /api/llm path to the relay's own 404, not to storage", async () => {
  const response = await worker.fetch(new Request(`${ORIGIN}/api/llm/keys`), ENV);
  assert.equal(response.status, 404);
  assert.match((await response.json()).error.message, /Unknown relay endpoint/i);
});
