/* Node harness: the Z.AI free-tier relay (worker/llm-relay.mjs).

   No network and no real Z.AI key: a stub fetch answers in Z.AI's shape, so
   what is under test is the relay's own contract — a server-held key that is
   never forwarded from or echoed to a caller, a hard free-model allowlist,
   text-only payloads, Z.AI's sampling translation, sanitized upstream
   failures, and the per-caller rate limit.

   Run: node --test tests/llm-relay-test.mjs */

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test, { beforeEach } from "node:test";
import {
  handleLlmRelay,
  clearRelayRateLimits,
  clearRelayOutboundDiagnostic,
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
const DIAGNOSTIC_ENV = { ...ENV, LLM_RELAY_OUTBOUND_DIAGNOSTIC: "true" };
const DIAGNOSTIC_PATH = `${RELAY_ROUTES.models}?diagnostic=outbound`;
const MODELS_URL = "https://api.z.ai/api/paas/v4/models";
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

/* Cloudflare Workers implements only "follow" and "manual" for `redirect`, and its
   fetch() throws a TypeError before any network I/O for anything else. Node's own
   Request also accepts "error", so a plain stub would let that value through — which
   is how a bug that turned every real upstream call into a 502 "could not be reached"
   stayed invisible to this suite. The stub therefore refuses what Workers refuses. */
function assertWorkersFetchInit(options = {}) {
  if (options.redirect !== undefined && !["follow", "manual"].includes(options.redirect)) {
    throw new TypeError(`Invalid redirect value, must be one of "follow" or "manual" ("${options.redirect}" is not implemented by the Workers runtime).`);
  }
}

/* Records every upstream call so a test can assert both what was sent and
   what was deliberately not sent. */
function stubFetch(reply = () => zaiReply()) {
  const calls = [];
  const fetch = async (url, options = {}) => {
    assertWorkersFetchInit(options); // throws before recording: nothing "left the Worker"
    calls.push({ url: String(url), options, body: options.body ? JSON.parse(options.body) : null });
    return reply(url, options, calls.length);
  };
  return { fetch, calls };
}
const run = (request, env = ENV, dependencies = {}) =>
  handleLlmRelay(request, env, { now: () => NOW, ...dependencies });
const text = async response => response.text();

beforeEach(() => { clearRelayRateLimits(); clearRelayOutboundDiagnostic(); });

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
  assert.equal(calls[0].options.redirect, "manual", "the one redirect mode Workers implements that never follows");
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
  const unreachable = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, { ...throwing, log: () => {} });
  assert.equal(unreachable.status, 502);
  const unreachableBody = await text(unreachable);
  assert.match(unreachableBody, /could not be reached/i);
  assert.equal(unreachableBody.includes(KEY), false, "a transport error is not echoed either");

  clearRelayRateLimits();
  const aborting = stubFetch(() => { const error = new Error("aborted"); error.name = "AbortError"; throw error; });
  const slow = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, { ...aborting, log: () => {} });
  assert.equal(slow.status, 504);
  assert.match((await slow.json()).error.message, /did not finish within 60 seconds/i);

  clearRelayRateLimits();
  const notJson = stubFetch(() => new Response("<html>gateway</html>", { status: 200, headers: { "Content-Type": "text/html" } }));
  const badJson = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, notJson);
  assert.equal(badJson.status, 502);
  assert.match((await badJson.json()).error.message, /not valid JSON/i);
});

/* ── the Workers fetch contract ───────────────────────────────── */
test("every upstream call uses a redirect mode the Workers runtime implements", async () => {
  /* Regression: `redirect: "error"` makes fetch() throw "Invalid redirect value"
     before any network I/O on Cloudflare. Every chat and model-list call then
     surfaced as 502 "Z.AI could not be reached" while the suite stayed green,
     because Node accepts "error" and the old stub never looked at the options. */
  const list = stubFetch(() => Response.json({ data: [{ id: DEFAULT_MODEL }] }));
  const listed = await run(get(RELAY_ROUTES.models), ENV, list);
  assert.equal(listed.status, 200);
  assert.equal((await listed.json()).relay.verified, true, "the list reached the stubbed network");
  assert.equal(list.calls.length, 1);
  assert.equal(list.calls[0].options.redirect, "manual");

  const chat = stubFetch();
  const answered = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, chat);
  assert.equal(answered.status, 200);
  assert.equal(chat.calls.length, 1);
  assert.equal(chat.calls[0].options.redirect, "manual");

  assert.throws(() => assertWorkersFetchInit({ redirect: "error" }), /Invalid redirect value/,
    "the stub itself must keep refusing what Workers refuses, or this guard is empty");
});

test("worker source never asks fetch for a redirect mode Workers does not implement", () => {
  /* Covers call sites no stubbed test reaches, including future ones. Comments
     are ignored on purpose: the explanations name the rejected value so that a
     search for it lands on the reason. */
  const withoutComments = source => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1");
  const unsupported = /redirect\s*:\s*["'`]error["'`]/;
  assert.match(withoutComments('fetch(url, { redirect: "error" })'), unsupported, "the scan can see the bad value");
  assert.doesNotMatch(withoutComments('/* redirect: "error" is rejected */ // redirect: "error"\nfetch(url, { redirect: "manual" })'), unsupported, "and ignores prose about it");

  const dir = fileURLToPath(new URL("../worker/", import.meta.url));
  const files = readdirSync(dir).filter(name => name.endsWith(".mjs"));
  assert.ok(files.includes("llm-relay.mjs") && files.includes("good-intelligence-tickerbot.mjs"), "the scan covers the upstream call sites");
  const offenders = files.filter(name => unsupported.test(withoutComments(readFileSync(dir + name, "utf8"))));
  assert.deepEqual(offenders, [], `use redirect: "manual" and refuse 3xx instead, in: ${offenders.join(", ")}`);
});

test("a redirect from Z.AI is refused, never followed, and the key is never replayed", async () => {
  const redirect = () => new Response(null, { status: 302, headers: { Location: "https://attacker.example/collect" } });

  const chat = stubFetch(redirect);
  const refused = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, chat);
  assert.equal(refused.status, 502);
  const refusedBody = await text(refused);
  assert.match(refusedBody, /HTTP 302/);
  assert.equal(refusedBody.includes("attacker.example"), false, "the redirect target is not echoed");
  assert.equal(refusedBody.includes(KEY), false);
  assert.equal(chat.calls.length, 1, "no second request is made to the redirect target");

  const list = stubFetch(redirect);
  const listed = await run(get(RELAY_ROUTES.models), ENV, list);
  assert.equal(listed.status, 200, "an unavailable model list falls back to the labelled allowlist");
  const payload = await listed.json();
  assert.equal(payload.relay.verified, false);
  assert.match(payload.relay.warning, /HTTP 302/);
  assert.equal(JSON.stringify(payload).includes("attacker.example"), false);
  assert.equal(list.calls.length, 1, "no second request is made to the redirect target");
});

/* ── abuse friction ───────────────────────────────────────────── */
test("relay paces each caller over a sliding minute, sized to a Ground-0 batch plan", async () => {
  let clock = NOW;
  const { fetch, calls } = stubFetch();
  const dependencies = { fetch, now: () => clock };
  /* js/g0-llm.js asks one question per call, so a source batch is nine calls
     and a full reading is dozens: the relay has to pace a reading, not refuse
     it. One caller is allowed Z.AI's own free pace of about a call a second,
     which is what the 60 a minute here means, spent two calls a second to
     reach the wall inside the window. */
  for (let attempt = 1; attempt <= 60; attempt++) {
    const response = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, dependencies);
    assert.equal(response.status, 200, `call ${attempt} is inside this caller's budget`);
    assert.equal(response.headers.get("ratelimit-limit"), "60", "each reply states the budget it was drawn from");
    assert.equal(response.headers.get("ratelimit-remaining"), String(60 - attempt), "and how much of it is left");
    clock += 500;
  }
  assert.equal(calls.length, 60);
  const blocked = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, dependencies);
  assert.equal(blocked.status, 429);
  assert.match((await blocked.json()).error.message, /60 model calls a minute per caller/i);
  assert.equal(Number(blocked.headers.get("retry-after")), 30, "the wait is the seconds until the oldest call ages out");
  assert.equal(blocked.headers.get("ratelimit-remaining"), "0");
  assert.equal(calls.length, 60, "a refused call never reaches Z.AI");

  /* The window slides, so an aged-out call frees exactly one slot: the caller
     is not made to wait for a whole fixed minute to clear. Two calls (at NOW
     and NOW+500) have aged out by NOW+60_500, so exactly two slots are back. */
  clock = NOW + 60_500;
  const freed = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, dependencies);
  assert.equal(freed.status, 200, "the two calls that aged out free two slots");
  const freedAgain = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, dependencies);
  assert.equal(freedAgain.status, 200);
  const stillBlocked = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), ENV, dependencies);
  assert.equal(stillBlocked.status, 429, "the calls still inside the window are still counted");
  assert.equal(Number(stillBlocked.headers.get("retry-after")), 1, "and the wait quoted is one second, not the rest of a fixed minute");

  /* A different caller has its own budget. */
  clearRelayRateLimits();
  clock = NOW;
  const other = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }, { headers: { "CF-Connecting-IP": "198.51.100.9" } }), ENV, dependencies);
  assert.equal(other.status, 200);

  clearRelayRateLimits();
  const listFetch = stubFetch(() => Response.json({ data: [{ id: "glm-4.5-flash" }] }));
  for (let attempt = 0; attempt < 12; attempt++) {
    const listed = await run(get(RELAY_ROUTES.models), ENV, { fetch: listFetch.fetch, now: () => clock });
    assert.equal(listed.status, 200, `model list ${attempt + 1} is inside its budget`);
  }
  const listBlocked = await run(get(RELAY_ROUTES.models), ENV, { fetch: listFetch.fetch, now: () => clock });
  assert.equal(listBlocked.status, 429, "the model list has its own smaller budget");
  assert.match((await listBlocked.json()).error.message, /12 a minute/i);
});

test("relay holds one shared ceiling, so a crowd cannot spend the day's free quota in seconds", async () => {
  const { fetch, calls } = stubFetch();
  const dependencies = { fetch, now: () => NOW };
  const from = index => chatRequest({ model: DEFAULT_MODEL, messages: messages() }, { headers: { "CF-Connecting-IP": `198.51.100.${index}` } });
  for (let index = 1; index <= 120; index++) {
    const response = await run(from(index), ENV, dependencies);
    assert.equal(response.status, 200, `caller ${index} is inside the shared ceiling`);
  }
  assert.equal(calls.length, 120);
  const freshCaller = await run(from(200), ENV, dependencies);
  assert.equal(freshCaller.status, 429, "a caller who has spent nothing is still refused once the shared key is at its pace");
  const body = await freshCaller.json();
  assert.match(body.error.message, /shared/i, "and the message names the shared ceiling rather than blaming this caller");
  assert.match(body.error.message, /budget is untouched/i, "it says this caller's own budget was not charged");
  assert.equal(freshCaller.headers.get("ratelimit-remaining"), "60", "the headers agree: its own budget still reads full");
  assert.equal(calls.length, 120, "a shared refusal reaches Z.AI no more than a caller refusal does");

  const afterWindow = await run(from(201), ENV, { fetch, now: () => NOW + 61_000 });
  assert.equal(afterWindow.status, 200, "the shared window slides too, so the ceiling clears as its oldest calls age out");
});

test("preview diagnostic mode bypasses only Worker-local rate limits", async () => {
  clearRelayRateLimits();
  const previewEnv = { ...ENV, LLM_RELAY_DISABLE_RATE_LIMITS: "true" };
  const { fetch, calls } = stubFetch();
  const dependencies = { fetch, now: () => NOW };
  for (let attempt = 1; attempt <= 130; attempt++) {
    const response = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }), previewEnv, dependencies);
    assert.equal(response.status, 200, `preview call ${attempt} is not blocked by either local window`);
    assert.equal(response.headers.get("ratelimit-limit"), null);
    const payload = await response.json();
    assert.equal(payload.relay.pacing.enabled, false);
    assert.equal(payload.relay.pacing.limit, null);
  }
  assert.equal(calls.length, 130, "the diagnostic preview reaches Z.AI past both former local caps");

  const modelFetch = stubFetch(() => Response.json({ data: [{ id: "glm-4.5-flash" }] }));
  for (let attempt = 0; attempt < 13; attempt++) {
    const response = await run(get(RELAY_ROUTES.models), previewEnv, { fetch: modelFetch.fetch, now: () => NOW });
    assert.equal(response.status, 200, "preview model-list checks are also exempt from the local caller cap");
  }

  const status = await run(get(RELAY_ROUTES.status), previewEnv, stubFetch());
  const payload = await status.json();
  assert.equal(payload.limits.localRateLimitsDisabled, true);
  assert.equal(payload.limits.requestsPerMinute, null);
  assert.match(payload.limits.rateScope, /disabled for this preview/i);
});

test("relay keeps its caller table bounded", async () => {
  const clock = NOW;
  const listFetch = stubFetch(() => Response.json({ data: [{ id: "glm-4.5-flash" }] }));
  const dependencies = { fetch: listFetch.fetch, now: () => clock };
  /* The model-list route is used here because it is limited per caller only,
     so 5010 distinct callers really do create 5010 windows. */
  const listFrom = ip => chatRequest(null, { method: "GET", path: RELAY_ROUTES.models, headers: { "CF-Connecting-IP": ip } });
  for (let index = 0; index < 5_010; index++) {
    await run(listFrom(`203.0.${Math.floor(index / 250)}.${index % 250}`), ENV, dependencies);
  }
  const stillWorking = await run(listFrom("203.0.113.7"), ENV, dependencies);
  assert.ok([200, 429].includes(stillWorking.status), "a bounded table still answers");
  const afterWindow = await run(listFrom("203.0.113.7"), ENV, { fetch: listFetch.fetch, now: () => clock + 120_000 });
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
  assert.equal(payload.limits.localRateLimitsDisabled, false, "production/default status keeps local abuse guards on");
  assert.equal(payload.limits.requestsPerMinute, 60, "the per-caller budget is stated");
  assert.equal(payload.limits.sharedRequestsPerMinute, 120, "as is the ceiling every caller shares");
  assert.equal(payload.limits.modelListRequestsPerMinute, 12);
  assert.equal(payload.limits.windowSeconds, 60);
  assert.match(payload.limits.rateScope, /sliding 60-second window/i, "the scope of the limit is disclosed rather than implied");
  assert.match(payload.sampling, /do_sample:false/);
  assert.equal(JSON.stringify(payload).includes(KEY), false);

  const missing = await run(get(RELAY_ROUTES.status), {}, stubFetch());
  const missingPayload = await missing.json();
  assert.equal(missing.status, 200, "an unconfigured relay still answers its status route");
  assert.equal(missingPayload.configured, false);
  assert.equal(missingPayload.keyVariable, "");
  assert.match(missingPayload.message, /no Z\.AI key/i);
});

test("upstream connection diagnostics log only safe error categories", async () => {
  const keyLikeSecret = KEY;
  const cause = Object.assign(new Error(`private network detail ${keyLikeSecret}`), { code: "ECONNRESET" });
  const error = new TypeError(`raw exception must not be logged ${keyLikeSecret}`, { cause });
  const logs = [];
  const response = await run(get(RELAY_ROUTES.models), ENV, {
    fetch: async () => { throw error; },
    log: entry => logs.push(entry)
  });
  assert.equal(response.status, 502);
  assert.deepEqual(logs, [{
    event: "zai_upstream_fetch_failed",
    route: "models",
    errorName: "TypeError",
    causeName: "Error",
    causeCode: "ECONNRESET"
  }]);
  assert.equal(JSON.stringify(logs).includes(keyLikeSecret), false, "logs omit keys, exception text, and request data");
  assert.equal(JSON.stringify(logs).includes("private network detail"), false);
});

/* ── temporary, no-prompt outbound diagnostic ─────────────────── */
test("outbound diagnostic requires both the operator flag and explicit model-list query", async () => {
  for (const [env, path] of [
    [ENV, DIAGNOSTIC_PATH],
    [{ ...ENV, LLM_RELAY_OUTBOUND_DIAGNOSTIC: "false" }, DIAGNOSTIC_PATH],
    [DIAGNOSTIC_ENV, RELAY_ROUTES.models],
    [DIAGNOSTIC_ENV, `${RELAY_ROUTES.models}?diagnostic=other`]
  ]) {
    const logs = [];
    const upstream = stubFetch(() => Response.json({ data: [{ id: DEFAULT_MODEL }] }));
    const response = await run(get(path), env, { ...upstream, log: entry => logs.push(entry) });
    assert.equal(response.status, 200);
    assert.equal(upstream.calls.length, 1, "ordinary lists add no unauthenticated probe");
    assert.equal(upstream.calls[0].options.headers.Authorization, `Bearer ${KEY}`);
    assert.deepEqual(logs, []);
  }
  const upstream = stubFetch(() => Response.json({ data: [{ id: DEFAULT_MODEL }] }));
  await run(get(DIAGNOSTIC_PATH), DIAGNOSTIC_ENV, { ...upstream, log: () => {} });
  assert.equal(upstream.calls.length, 2, "ordinary requests did not consume the one-time diagnostic");
});

test("outbound diagnostic locally constructs the configured request then adds exactly one credential-free GET", async () => {
  const logs = [];
  let discarded = false;
  const upstream = stubFetch((url, options, index) => {
    assert.equal(url, MODELS_URL, "caller query parameters cannot override the fixed models URL");
    assert.equal(options.method, "GET");
    assert.equal(options.body, undefined, "neither step sends a prompt or a model request");
    assert.equal(options.redirect, "manual", "neither step may follow a redirect or use a mode Workers rejects");
    assert.deepEqual(logs[0], { event: "zai_outbound_diagnostic", route: "models", stage: "request_construction", outcome: "ok" });
    if (index === 1) {
      assert.deepEqual(options.headers, { Accept: "application/json", "Accept-Language": "en-US,en" });
      assert.equal(options.credentials, "omit");
      assert.equal(JSON.stringify(options).includes(KEY), false);
      return {
        status: 401, ok: false,
        body: { cancel: async () => { discarded = true; } },
        text: () => { throw new Error("Diagnostic must not read the response body"); },
        json: () => { throw new Error("Diagnostic must not parse the response body"); }
      };
    }
    assert.equal(options.headers.Authorization, `Bearer ${KEY}`);
    assert.equal(options.signal.aborted, false);
    return Response.json({ data: [{ id: DEFAULT_MODEL }] });
  });
  const request = chatRequest(null, {
    method: "GET", path: `${DIAGNOSTIC_PATH}&url=https://attacker.example/`,
    headers: { Authorization: "Bearer caller-private-key", Cookie: "caller-private-cookie" }
  });
  const response = await run(request, DIAGNOSTIC_ENV, { ...upstream, log: entry => logs.push(entry) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).relay.verified, true);
  assert.equal(upstream.calls.length, 2);
  assert.equal(discarded, true);
  assert.deepEqual(logs.slice(1), [
    { event: "zai_outbound_diagnostic", route: "models", stage: "unauthenticated_fetch", outcome: "http_response", status: 401 },
    { event: "zai_outbound_diagnostic", route: "models", stage: "authenticated_fetch", outcome: "http_response", status: 200 }
  ]);
  assert.equal(JSON.stringify(logs).includes(KEY), false);
});

test("outbound diagnostic claims once per isolate even with concurrent callers", async () => {
  const logs = [];
  const upstream = stubFetch(() => Response.json({ data: [{ id: DEFAULT_MODEL }] }));
  const dependencies = { ...upstream, log: entry => logs.push(entry) };
  const responses = await Promise.all([
    run(get(DIAGNOSTIC_PATH), DIAGNOSTIC_ENV, dependencies),
    run(get(DIAGNOSTIC_PATH), DIAGNOSTIC_ENV, dependencies),
    run(get(DIAGNOSTIC_PATH), DIAGNOSTIC_ENV, dependencies)
  ]);
  assert.ok(responses.every(response => response.status === 200));
  assert.equal(upstream.calls.length, 4, "three normal authenticated lists plus one extra GET, not three probes");
  assert.equal(upstream.calls.filter(call => !call.options.headers.Authorization).length, 1);
  assert.equal(logs.length, 3);
});

test("outbound diagnostic separates malformed configured headers from network reachability without sending the key", async () => {
  const malformedKey = "private-first-line\r\nprivate-second-line";
  const logs = [];
  const upstream = stubFetch(() => new Response(null, { status: 401 }));
  const response = await run(get(DIAGNOSTIC_PATH), { ...DIAGNOSTIC_ENV, "Z.AI": malformedKey }, {
    ...upstream, log: entry => logs.push(entry)
  });
  assert.equal(response.status, 502);
  assert.equal(upstream.calls.length, 1, "a failed local constructor still permits ONLY the unauthenticated probe");
  assert.equal(upstream.calls[0].options.headers.Authorization, undefined);
  assert.equal(logs[0].stage, "request_construction");
  assert.equal(logs[0].outcome, "error");
  assert.equal(logs[0].errorName, "TypeError");
  assert.equal(logs[1].outcome, "http_response");
  assert.equal(logs[1].status, 401);
  assert.equal(logs[2].stage, "authenticated_fetch");
  assert.equal(logs[2].outcome, "skipped");
  const serialized = JSON.stringify(logs) + await response.text();
  for (const privateText of [malformedKey, "private-first-line", "private-second-line"]) {
    assert.equal(serialized.includes(privateText), false, "even a quoted invalid header is redacted before control normalization");
  }
});

test("outbound diagnostic stops before authentication when the unauthenticated GET throws", async () => {
  const logs = [];
  const upstream = stubFetch(() => { throw new TypeError(`Failed to fetch using Bearer ${KEY}`); });
  const response = await run(get(DIAGNOSTIC_PATH), DIAGNOSTIC_ENV, { ...upstream, log: entry => logs.push(entry) });
  assert.equal(response.status, 502);
  assert.equal(upstream.calls.length, 1);
  assert.equal(upstream.calls[0].options.headers.Authorization, undefined);
  assert.equal(logs[1].stage, "unauthenticated_fetch");
  assert.equal(logs[1].outcome, "error");
  assert.equal(logs[1].errorMessage, "Failed to fetch using Bearer [redacted]");
  assert.equal(logs[2].outcome, "skipped");
  assert.equal(JSON.stringify(logs).includes(KEY), false);

  await run(get(DIAGNOSTIC_PATH), DIAGNOSTIC_ENV, { ...upstream, log: () => {} });
  assert.equal(upstream.calls.length, 2, "a failed diagnostic is not silently retried");
  assert.equal(upstream.calls[1].options.headers.Authorization, `Bearer ${KEY}`, "a later request resumes ordinary list behavior");
});

test("outbound diagnostic treats any HTTP status as reachability, never logs upstream refusal bodies", async () => {
  for (const probeStatus of [302, 401, 503]) {
    clearRelayOutboundDiagnostic();
    const logs = [];
    const upstream = stubFetch((url, options, index) => new Response(`private body containing ${KEY}`, {
      status: index === 1 ? probeStatus : 403,
      headers: { Location: "https://attacker.example/never-follow-this" }
    }));
    const response = await run(get(DIAGNOSTIC_PATH), DIAGNOSTIC_ENV, { ...upstream, log: entry => logs.push(entry) });
    assert.equal(response.status, 200, "the usual labelled model allowlist fallback is unchanged");
    const payload = await response.json();
    assert.equal(payload.relay.verified, false);
    assert.match(payload.relay.warning, /HTTP 403/);
    assert.equal(logs[1].status, probeStatus, "a non-2xx probe response proves the network returned HTTP");
    assert.equal(logs[2].status, 403, "the existing authenticated GET was not duplicated");
    assert.equal(upstream.calls.length, 2);
    assert.equal(upstream.calls[0].options.redirect, "manual", "even a redirect must not add a second probe to another host");
    assert.equal(JSON.stringify(logs).includes("private body"), false);
    assert.equal(JSON.stringify(logs).includes(KEY), false);
  }
});

test("outbound diagnostic logs bounded sanitized authenticated exception messages and safe cause fields", async () => {
  const diagnosticKey = "test+private/key=redaction";
  const cause = Object.assign(new Error(`TLS failed for https://private.example/path?key=${encodeURIComponent(diagnosticKey)}`), { code: "ERR_SSL_CERTIFICATE_VERIFY_FAILED" });
  const error = new TypeError(`Failed to fetch ${diagnosticKey}; encoded ${encodeURIComponent(diagnosticKey)}; Bearer other-private-key\n${"detail ".repeat(100)}`, { cause });
  error.stack = `private stack ${diagnosticKey}`;
  error.request = { headers: { Authorization: diagnosticKey } };
  const logs = [];
  const upstream = stubFetch((url, options, index) => {
    if (index === 1) return new Response(null, { status: 401 });
    throw error;
  });
  const response = await run(get(DIAGNOSTIC_PATH), { ...DIAGNOSTIC_ENV, "Z.AI": diagnosticKey }, {
    ...upstream, log: entry => logs.push(entry)
  });
  assert.equal(response.status, 502);
  const entry = logs[2];
  assert.equal(entry.stage, "authenticated_fetch");
  assert.equal(entry.outcome, "error");
  assert.equal(entry.errorName, "TypeError");
  assert.equal(entry.causeName, "Error");
  assert.equal(entry.causeCode, "ERR_SSL_CERTIFICATE_VERIFY_FAILED");
  assert.match(entry.errorMessage, /^Failed to fetch \[redacted\]; encoded \[redacted\]; Bearer \[redacted\]/);
  assert.ok(entry.errorMessage.length <= 220);
  assert.equal(entry.causeMessage, "TLS failed for [url redacted]");
  const serialized = JSON.stringify(logs) + await response.text();
  for (const privateText of [diagnosticKey, encodeURIComponent(diagnosticKey), "other-private-key", "private stack", "private.example", "Authorization"]) {
    assert.equal(serialized.includes(privateText), false);
  }
});

test("outbound diagnostic also redacts escaped malformed secrets and credentials disguised as error categories", async () => {
  const diagnosticKey = 'private"value\nsecond-line';
  const cause = { name: diagnosticKey, code: diagnosticKey, message: `escaped ${JSON.stringify(diagnosticKey).slice(1, -1)}` };
  const logs = [];
  const upstream = stubFetch(() => { throw Object.assign(new TypeError("Failed to fetch"), { name: diagnosticKey, cause }); });
  await run(get(DIAGNOSTIC_PATH), { ...DIAGNOSTIC_ENV, "Z.AI": diagnosticKey }, { ...upstream, log: entry => logs.push(entry) });
  const entry = logs[1];
  assert.equal(entry.errorName, "Error");
  assert.equal(entry.causeName, "");
  assert.equal(entry.causeCode, "");
  assert.equal(entry.causeMessage, "escaped [redacted]");
  assert.equal(JSON.stringify(logs).includes("second-line"), false);
});

test("outbound probe has its own ten-second abort deadline", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const logs = [];
  const upstream = stubFetch((url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  }));
  const pending = run(get(DIAGNOSTIC_PATH), DIAGNOSTIC_ENV, { ...upstream, log: entry => logs.push(entry) });
  assert.equal(upstream.calls.length, 1);
  t.mock.timers.tick(10_000);
  const response = await pending;
  assert.equal(response.status, 502);
  assert.equal(logs[1].errorName, "AbortError");
  assert.equal(logs[2].outcome, "skipped");
  assert.equal(upstream.calls[0].options.signal.aborted, true);
});

test("authenticated diagnostic fetch retains its full sixty-second deadline after a slow probe", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const logs = [];
  let finishProbe, markAuthenticatedStarted;
  const authenticatedStarted = new Promise(resolve => { markAuthenticatedStarted = resolve; });
  const upstream = stubFetch((url, options, index) => {
    if (index === 1) return new Promise(resolve => { finishProbe = resolve; });
    markAuthenticatedStarted();
    return new Promise((resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    });
  });
  const pending = run(get(DIAGNOSTIC_PATH), DIAGNOSTIC_ENV, { ...upstream, log: entry => logs.push(entry) });
  t.mock.timers.tick(9_000);
  finishProbe(new Response(null, { status: 401 }));
  await authenticatedStarted;
  assert.notEqual(upstream.calls[0].options.signal, upstream.calls[1].options.signal);
  t.mock.timers.tick(59_999);
  assert.equal(upstream.calls[1].options.signal.aborted, false);
  t.mock.timers.tick(1);
  const response = await pending;
  assert.equal(response.status, 504);
  assert.equal(logs[2].stage, "authenticated_fetch");
  assert.equal(logs[2].errorName, "AbortError");
  assert.equal(upstream.calls[0].options.signal.aborted, false, "the probe timer was cleared after its response");
});

test("outbound diagnostic never runs from status or chat, including when the log sink throws", async () => {
  const upstream = stubFetch();
  const status = await run(get(`${RELAY_ROUTES.status}?diagnostic=outbound`), DIAGNOSTIC_ENV, upstream);
  assert.equal(status.status, 200);
  assert.equal(upstream.calls.length, 0);
  const chat = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages() }, { path: `${RELAY_ROUTES.chat}?diagnostic=outbound` }), DIAGNOSTIC_ENV, upstream);
  assert.equal(chat.status, 200);
  assert.equal(upstream.calls.length, 1, "chat adds no diagnostic and never logs an exception message");
  assert.equal(upstream.calls[0].options.method, "POST");
  const chatLogs = [];
  const failingChat = stubFetch(() => { throw new TypeError(`private prompt and secret ${KEY}`, { cause: { code: KEY } }); });
  const failed = await run(chatRequest({ model: DEFAULT_MODEL, messages: messages("private prompt") }), DIAGNOSTIC_ENV, {
    ...failingChat, log: entry => chatLogs.push(entry)
  });
  assert.equal(failed.status, 502);
  assert.equal(chatLogs[0].event, "zai_upstream_fetch_failed");
  assert.equal(chatLogs[0].errorMessage, undefined);
  assert.equal(chatLogs[0].causeCode, "", "a credential disguised as a category is redacted too");
  assert.equal(JSON.stringify(chatLogs).includes("private prompt"), false);
  assert.equal(JSON.stringify(chatLogs).includes(KEY), false);

  const list = stubFetch(() => Response.json({ data: [{ id: DEFAULT_MODEL }] }));
  const response = await run(get(DIAGNOSTIC_PATH), DIAGNOSTIC_ENV, { ...list, log: () => { throw new Error("log sink failed"); } });
  assert.equal(response.status, 200, "logging failures cannot disrupt an otherwise successful list");
  assert.equal(list.calls.length, 2, "status and chat did not consume the diagnostic latch");
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
