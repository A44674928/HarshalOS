/* Node harness: the relay's Workers AI provider path (worker/llm-relay.mjs).
   The AI binding is a stub (no GPUs); the D1 Neuron ledger is node:sqlite.
   The Z.AI path keeps its own suite in tests/llm-relay-test.mjs, which runs
   with no AI binding and must stay green unchanged.
   Run: node --test tests/llm-workers-ai-test.mjs */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { beforeEach } from "node:test";
import { DatabaseSync } from "node:sqlite";
import {
  AI_DEFAULT_MODEL,
  AI_MODELS,
  RELAY_ROUTES,
  clearRelayNeuronMemory,
  clearRelayRateLimits,
  estimateAiNeurons,
  handleLlmRelay
} from "../worker/llm-relay.mjs";
import { AI_WORKER_DAILY_LIMIT, claimAiNeurons } from "../worker/ai-neuron-ledger.mjs";

const ORIGIN = "https://os.example.test";
const NOW = Date.parse("2026-10-10T12:00:00.000Z");
const MIGRATION = readFileSync(new URL("../migrations/community/0014_ai_neuron_ledger.sql", import.meta.url), "utf8");

beforeEach(() => { clearRelayRateLimits(); clearRelayNeuronMemory(); });

function ledgerDb(t, migrations = [MIGRATION]) {
  const sql = new DatabaseSync(":memory:");
  t.after(() => sql.close());
  for (const migration of migrations) sql.exec(migration);
  return {
    prepare(text) {
      let parameters = [];
      const statement = {
        bind(...args) { parameters = args; return statement; },
        async first() { return sql.prepare(text).get(...parameters) ?? null; },
        async run() { return sql.prepare(text).run(...parameters); },
        async all() { return { results: sql.prepare(text).all(...parameters) }; }
      };
      return statement;
    }
  };
}

const messages = (content = "Read this record and answer.") => [
  { role: "system", content: "You are an audit reader." },
  { role: "user", content }
];
const chatRequest = (payload, { path = RELAY_ROUTES.chat } = {}) => new Request(`${ORIGIN}${path}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: ORIGIN, "CF-Connecting-IP": "203.0.113.7" },
  body: JSON.stringify(payload)
});
const aiBinding = (handler) => {
  const calls = [];
  return {
    calls,
    AI: {
      async run(model, input) {
        calls.push({ model, input });
        return handler(model, input, calls.length);
      }
    }
  };
};
const aiReply = (content = "The record states an appeal procedure.") => ({ response: content });

test("the AI allowlist is fixed and the estimator charges input plus the reserved ceiling", () => {
  assert.deepEqual([...AI_MODELS], [
    "@cf/meta/llama-3.1-8b-instruct-fp8-fast",
    "@cf/meta/llama-3.2-3b-instruct",
    "@cf/qwen/qwen3-30b-a3b-fp8",
    "@cf/zai-org/glm-4.7-flash"
  ]);
  assert.equal(AI_DEFAULT_MODEL, "@cf/meta/llama-3.1-8b-instruct-fp8-fast");
  // 60k input chars (~15k tokens) plus an 8k reserved ceiling on the default model.
  const estimate = estimateAiNeurons(AI_DEFAULT_MODEL, 60_000, 8_192);
  assert.ok(estimate > 0 && estimate < 1_000, `one heavy call estimates ${estimate} neurons`);
  assert.equal(estimateAiNeurons("glm-4.5-flash", 100, 100), null);
  assert.equal(estimateAiNeurons(AI_DEFAULT_MODEL, 0, 0), 1);
});

test("an AI-bound deployment serves Workers AI even when a Z.AI key is also set", async t => {
  const binding = aiBinding(() => aiReply());
  const fetches = [];
  const env = { AI: binding.AI, COMMUNITY_DB: ledgerDb(t), ZAI_API_KEY: "zai-test-only-secret" };
  const response = await handleLlmRelay(
    chatRequest({ model: AI_DEFAULT_MODEL, messages: messages() }),
    env,
    { now: () => NOW, fetch: async (...args) => { fetches.push(args); throw new Error("must not call Z.AI"); } }
  );
  assert.equal(response.status, 200);
  assert.equal(fetches.length, 0);
  assert.equal(binding.calls.length, 1);
  const payload = await response.json();
  assert.equal(payload.model, AI_DEFAULT_MODEL);
  assert.equal(payload.relay.provider, "workers-ai");
  assert.equal(payload.relay.keyVariable, "");
  assert.ok(payload.relay.estimatedNeurons >= 1);
  assert.equal(payload.relay.neuronLedger.weak, false);
  assert.ok(payload.relay.neuronLedger.remaining < AI_WORKER_DAILY_LIMIT);
});

test("AI chat answers in the same OpenAI-compatible shape with estimated usage", async t => {
  const binding = aiBinding(() => aiReply("A short verified answer."));
  const env = { AI: binding.AI, COMMUNITY_DB: ledgerDb(t) };
  const response = await handleLlmRelay(
    chatRequest({ model: AI_DEFAULT_MODEL, messages: messages(), max_tokens: 700, temperature: 0.4 }),
    env,
    { now: () => NOW }
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("RateLimit-Limit"), "60");
  const payload = await response.json();
  assert.equal(payload.object, "chat.completion");
  assert.equal(payload.choices[0].message.content, "A short verified answer.");
  assert.ok(payload.usage.total_tokens >= payload.usage.prompt_tokens);
  assert.equal(payload.relay.usageEstimated, true);
  assert.deepEqual(binding.calls[0].input.messages.map(message => message.role), ["system", "user"]);
  assert.equal(binding.calls[0].input.max_tokens, 700);
  assert.equal(binding.calls[0].input.temperature, 0.4);
  assert.ok(!("do_sample" in binding.calls[0].input), "Workers AI takes temperature directly");
  assert.ok(!("thinking" in binding.calls[0].input), "the Z.AI-only thinking field is never sent");
});

test("json_object is sent only to models that accept it", async t => {
  const binding = aiBinding(() => aiReply("{}"));
  const env = { AI: binding.AI, COMMUNITY_DB: ledgerDb(t) };
  const body = response_format => ({ model: AI_DEFAULT_MODEL, messages: messages(), response_format });
  await handleLlmRelay(chatRequest(body({ type: "json_object" })), env, { now: () => NOW });
  assert.deepEqual(binding.calls[0].input.response_format, { type: "json_object" });
  await handleLlmRelay(chatRequest({ model: "@cf/qwen/qwen3-30b-a3b-fp8", messages: messages(), response_format: { type: "json_object" } }), env, { now: () => NOW + 1000 });
  assert.ok(!("response_format" in binding.calls[1].input), "unsupported models get plain text");
});

test("Z.AI models are refused on the AI path with the AI allowlist named", async t => {
  const binding = aiBinding(() => aiReply());
  const env = { AI: binding.AI, COMMUNITY_DB: ledgerDb(t) };
  const response = await handleLlmRelay(chatRequest({ model: "glm-4.5-flash", messages: messages() }), env, { now: () => NOW });
  assert.equal(response.status, 404);
  assert.match((await response.json()).error.message, /Workers AI's free tier only/);
  assert.equal(binding.calls.length, 0);
});

test("an exhausted Neuron day refuses before generation with a midnight Retry-After", async t => {
  const binding = aiBinding(() => aiReply());
  const db = ledgerDb(t);
  await claimAiNeurons(db, AI_WORKER_DAILY_LIMIT, NOW);
  const env = { AI: binding.AI, COMMUNITY_DB: db };
  const response = await handleLlmRelay(chatRequest({ model: AI_DEFAULT_MODEL, messages: messages() }), env, { now: () => NOW });
  assert.equal(response.status, 429);
  assert.equal((await response.json()).error.type, "quota_exceeded");
  assert.equal(response.headers.get("Retry-After"), String(12 * 3600));
  assert.equal(binding.calls.length, 0, "a refused call never reaches the binding");
});

test("a missing Neuron migration fails closed instead of spending blind", async t => {
  const binding = aiBinding(() => aiReply());
  const env = { AI: binding.AI, COMMUNITY_DB: ledgerDb(t, []) };
  const response = await handleLlmRelay(chatRequest({ model: AI_DEFAULT_MODEL, messages: messages() }), env, { now: () => NOW });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error.message, /D1 migration/);
  assert.equal(binding.calls.length, 0);
});

test("deployments without D1 fall back to a labelled isolate-local day counter", async t => {
  const binding = aiBinding(() => aiReply());
  const env = { AI: binding.AI };
  const first = await handleLlmRelay(chatRequest({ model: AI_DEFAULT_MODEL, messages: messages() }), env, { now: () => NOW });
  assert.equal(first.status, 200);
  const firstPayload = await first.json();
  assert.equal(firstPayload.relay.neuronLedger.weak, true);
  const remaining = firstPayload.relay.neuronLedger.remaining;
  const second = await handleLlmRelay(chatRequest({ model: AI_DEFAULT_MODEL, messages: messages() }), env, { now: () => NOW + 1000 });
  assert.equal((await second.json()).relay.neuronLedger.remaining < remaining, true);
});

test("binding failures map to sanitized relay errors; quota-like failures pace the caller", async t => {
  const failing = aiBinding(() => { throw new Error("boom <html>"); });
  const env = { AI: failing.AI, COMMUNITY_DB: ledgerDb(t) };
  const failed = await handleLlmRelay(chatRequest({ model: AI_DEFAULT_MODEL, messages: messages() }), env, { now: () => NOW });
  assert.equal(failed.status, 502);
  const quota = aiBinding(() => { throw new Error("Daily quota exceeded for this account (429)"); });
  const envQuota = { AI: quota.AI, COMMUNITY_DB: ledgerDb(t) };
  const refused = await handleLlmRelay(chatRequest({ model: AI_DEFAULT_MODEL, messages: messages() }), envQuota, { now: () => NOW });
  assert.equal(refused.status, 429);

  const empty = aiBinding(() => ({ response: "  " }));
  const envEmpty = { AI: empty.AI, COMMUNITY_DB: ledgerDb(t) };
  assert.equal((await handleLlmRelay(chatRequest({ model: AI_DEFAULT_MODEL, messages: messages() }), envEmpty, { now: () => NOW })).status, 502);
  const tools = aiBinding(() => ({ response: "", tool_calls: [{ id: "1" }] }));
  const envTools = { AI: tools.AI, COMMUNITY_DB: ledgerDb(t) };
  assert.match((await (await handleLlmRelay(chatRequest({ model: AI_DEFAULT_MODEL, messages: messages() }), envTools, { now: () => NOW })).json()).error.message, /tool call instead of text/);
});

test("models and status describe the AI provider without touching Z.AI", async t => {
  const binding = aiBinding(() => aiReply());
  const env = { AI: binding.AI, COMMUNITY_DB: ledgerDb(t) };
  const fetches = [];
  const dependencies = { now: () => NOW, fetch: async (...args) => { fetches.push(args); throw new Error("no upstream"); } };
  const models = await handleLlmRelay(new Request(`${ORIGIN}${RELAY_ROUTES.models}`, { headers: { "CF-Connecting-IP": "203.0.113.7" } }), env, dependencies);
  assert.equal(models.status, 200);
  const listed = await models.json();
  assert.deepEqual(listed.data.map(row => row.id), [...AI_MODELS]);
  assert.equal(listed.relay.provider, "workers-ai");
  const status = await handleLlmRelay(new Request(`${ORIGIN}${RELAY_ROUTES.status}`), env, dependencies);
  const payload = await status.json();
  assert.equal(payload.configured, true);
  assert.equal(payload.provider, "workers-ai");
  assert.equal(payload.defaultModel, AI_DEFAULT_MODEL);
  assert.equal(payload.keyVariable, "");
  assert.equal(payload.neuronBudget.workerDailyLimit, AI_WORKER_DAILY_LIMIT);
  assert.equal(fetches.length, 0);
});
