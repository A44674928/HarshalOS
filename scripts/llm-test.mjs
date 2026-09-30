/* Node harness: the LLM connection layer (js/llm.js) and the Ground-0
   reading pass (js/g0-llm.js).

   No network and no real model: a stub fetch answers in each provider's
   shape, and a stub model replies with findings that are deliberately
   mixed — verified, fabricated, mis-dated, news-sourced — so the
   verification gate is what is under test.

   Run: node scripts/llm-test.mjs */

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
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, init, headers: init.headers, body: init.body ? JSON.parse(init.body) : null });
    return { ok: true, status: 200, headers: { get: () => "application/json" }, json: async () => ({ model: "x", choices: [{ message: { content: "ok" } }], usage: { prompt_tokens: 3, completion_tokens: 4 } }) };
  };
  const openaiCall = await LLM.chat({ system: "S", user: "U", maxTokens: 10 });
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

  /* OpenAI's API is labelled, not faked */
  ok(LLM.PROVIDERS.openai.browser === "blocked" && /CORS/.test(LLM.PROVIDERS.openai.note), "the OpenAI preset states that browser calls are blocked");
  ok(LLM.PROVIDERS.anthropic.browser === "direct" && LLM.PROVIDERS.openrouter.browser === "direct", "the providers that answer browser calls are marked direct");
  ok(LLM.PROVIDERS.local.keyOptional === true, "a local endpoint may need no key");

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

  const progress = [];
  const reading = await G0LLM.readSources({ input, sources: input.automation.sources.map(s => ({ ...s })), version: "1.1", cutoff, entity: org, website: "https://example.org/", onProgress: p => progress.push(p), followLinks: false });
  stop();

  ok(reading.passes >= 2, `the reading uses one call per source batch plus weighing (${reading.passes} calls)`);
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
  const merged = G0LLM.mergeReading(input, reading, { applyCodes: ["B1", "B4"] });
  ok(merged.answers[0].value === true && merged.answers[3].value === true, "applying writes the ticked readings into a copy");
  ok(input.answers[0].value === null && input.answers[3].value === null, "the original input is never mutated");
  ok(merged.automation.llm && merged.automation.llm.reviewRequired === true, "the record carries the reading block and stays review-required");
  eq(merged.automation.llm.verified, 2, "the reading block records how many quotes verified");
  ok(merged.automation.sources.find(s => s.id === "SITE-1").codes.includes("B4"), "the source that carried B4 is annotated");

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
