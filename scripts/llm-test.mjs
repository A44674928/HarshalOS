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

  globalThis.fetch = async () => ({ ok: false, status: 402, headers: { get: () => "application/json" }, text: async () => JSON.stringify({ error: { message: "Payment required; no further billing detail was returned." } }) });
  let refusal = null;
  try { await LLM.chat({ user: "U" }); } catch (error) { refusal = error; }
  eq(refusal && refusal.kind, "billing", "an unexplained HTTP 402 is not guessed to be a token-ceiling refusal");
  eq(LLM.describe(refusal).title, "THE PROVIDER REFUSED THE CALL", "an unexplained HTTP 402 is labelled without claiming why");

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

  const progress = [];
  const reading = await G0LLM.readSources({ input, sources: input.automation.sources.map(s => ({ ...s })), version: "1.1", cutoff, entity: org, website: "https://example.org/", onProgress: p => progress.push(p), followLinks: false });
  stop();

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
  const refusal = { error: { message: "This request would exceed your available credits given your current in-flight requests. Retry after in-flight requests settle, or add credits.", code: 402, metadata: { reason: "in_flight_budget_exhausted" } } };
  const reply = { ok: false, status: 402, headers: { get: () => "application/json" }, json: async () => refusal, text: async () => JSON.stringify(refusal) };
  try {
    globalThis.fetch = async (url, init = {}) => { attempts.push({ url: String(url), body: JSON.parse(init.body) }); return reply; };
    let error = null;
    try {
      await G0LLM.readSources({ input: stagedInput(), sources: stagedSources.map(source => ({ ...source })), version: "1.1", cutoff, entity: org, followLinks: false, onProgress: () => {} });
    } catch (caught) { error = caught; }
    eq(error && error.kind, "busy", "a still-busy provider stops the reading instead of looking like an empty record");
    eq(attempts.length, 4, "only the initial call and its three retries are sent");
    ok(attempts.every(call => askedCodes(userText(call.body)).join(",") === "B1"), "the reader does not fan the same account-wide refusal out across all nine questions");
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
