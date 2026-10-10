/* Research-output regressions. Real browser connector + real Worker relay,
   with deterministic provider responses; no live credentials or API calls. */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import { handleLlmRelay } from "../worker/llm-relay.mjs";

const CUTOFF = "2026-10-01";
const SANCTION = "Participants who fail to comply with this policy may have their access suspended and their account terminated.";
const STAY = "A filed appeal automatically stays the decision until the appeal board issues a final written determination.";
const askedCodes = prompt => (prompt.match(/QUESTION(?:S)? TO ANSWER IN THIS CALL: ([A-Z0-9, ]+)/) || [, ""])[1].split(",").map(code => code.trim()).filter(Boolean);
const source = (id = "PRIMARY", patch = {}) => ({
  id, title: "Acme policy", url: `https://acme.example/${id.toLowerCase()}`,
  kind: "official", dateBasis: "publication", published: "2026-01-01", codes: [],
  text: SANCTION, ...patch
});
const unknownReply = prompt => ({ findings: askedCodes(prompt).map(code => ({ code, value: "unknown", reason: "No supplied operative text supports an answer to this question." })), gap: "" });
const finding = (code, source_index, quote, value = "yes") => ({ code, value, source_index, quote, confidence: "high", reason: "The quoted operative text supports this answer." });

async function harness(handler = prompt => ({ content: unknownReply(prompt) })) {
  const values = new Map();
  const calls = [];
  const sandbox = {
    console, crypto: webcrypto, URL, Headers, AbortController, DOMException,
    TextEncoder, setTimeout, clearTimeout,
    localStorage: { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    location: { origin: "https://research.test" }
  };
  sandbox.window = sandbox;
  sandbox.fetch = async (url, init) => handleLlmRelay(new Request(new URL(url, sandbox.location.origin), {
    ...init, headers: { "Content-Type": "application/json", Origin: sandbox.location.origin }
  }), { AI: { run: async (model, input) => {
    const body = { ...input, model };
    const prompt = body.messages.find(message => message.role === "user").content;
    calls.push({ body, prompt });
    const reply = await handler(prompt, calls.length, body);
    return {
      response: typeof reply.content === "string" ? reply.content : JSON.stringify(reply.content),
      usage: { prompt_tokens: 100, completion_tokens: 40, total_tokens: 140 }
    };
  } }, LLM_RELAY_DISABLE_RATE_LIMITS: "true" });
  vm.createContext(sandbox);
  for (const file of ["g0-engine", "g0-research", "llm", "g0-llm"]) {
    vm.runInContext(await readFile(new URL(`../js/${file}.js`, import.meta.url), "utf8"), sandbox, { filename: `${file}.js` });
  }
  const { G0, G0LLM, HOSLLM } = sandbox;
  HOSLLM.saveSettings({ provider: "relay", model: "@cf/meta/llama-3.1-8b-instruct-fp8-fast" });
  const input = G0.newInput("1.1");
  input.name = "Acme Corp"; input.cutoff = CUTOFF;
  const read = (sources = [source()], options = {}) => G0LLM.readSources({ input, sources, cutoff: CUTOFF, version: "1.1", followLinks: false, ...options });
  return { ...sandbox, calls, input, read };
}

test("lead snippets do not spend audit calls; primary-source global indexes stay stable", async () => {
  const h = await harness(prompt => ({ content: askedCodes(prompt)[0] === "B1"
    ? { findings: [finding("B1", 16, SANCTION)] }
    : unknownReply(prompt) }));
  const sources = [...Array.from({ length: 16 }, (_, index) => source(`NEWS-${index}`, { kind: "news", dateBasis: "indexed" })), source()];
  const reading = await h.read(sources);
  assert.equal(h.calls.length, 9, "one primary batch, not six batches of unscoreable leads");
  assert.equal(reading.sourcesRead, 1);
  assert.equal(reading.diagnostics.leadsSkipped, 16);
  assert.equal(reading.diagnostics.recordsSupplied, 17);
  assert.equal(reading.candidates.length, 1);
  assert.equal(reading.answers[0].value, true);
  assert.ok(h.calls.every(call => call.prompt.includes("Allowed source_index values in this call: 16.")));
  assert.ok(h.calls.every(call => call.body.max_tokens === 700));
  assert.ok(h.calls.every(call => call.body.response_format.type === "json_object"));
  assert.ok(h.calls.every(call => !call.body.tools && !call.body.functions));
  assert.equal(Object.isFrozen(sources[16].codes), false, "issuing a frozen reading does not freeze the original draft's arrays");
  assert.equal(reading.diagnostics.modelUnknown, 8);
  assert.equal(reading.diagnostics.formatRetries, 0, "valid UNKNOWN answers never fish for a different answer");
});

test("a lead-only record fails preflight without any provider call", async () => {
  const h = await harness();
  await assert.rejects(h.read([source("NEWS", { kind: "news", dateBasis: "indexed" })]), /No readable text.*primary sources/);
  assert.equal(h.calls.length, 0);
});

test("non-JSON output gets one same-source format retry and can recover a verified quote", async () => {
  let b1Calls = 0;
  const h = await harness(prompt => {
    if (askedCodes(prompt)[0] !== "B1") return { content: unknownReply(prompt) };
    return ++b1Calls === 1 ? { content: "I have reviewed the evidence [note], but did not supply JSON." }
      : { content: { findings: [finding("B1", 0, SANCTION)] } };
  });
  const reading = await h.read();
  assert.equal(reading.answers[0].value, true);
  assert.equal(reading.diagnostics.nonJson, 1);
  assert.equal(reading.diagnostics.formatRetries, 1);
  assert.equal(reading.block.staging.unusableCodes.length, 0);
  assert.equal(h.calls.length, 10);
  const firstText = h.calls[0].prompt.split("<<<\n")[1].split("\n>>>")[0];
  const retryText = h.calls[1].prompt.split("<<<\n")[1].split("\n>>>")[0];
  assert.equal(firstText, retryText);
  assert.ok(h.calls[1].prompt.includes("OUTPUT-FORMAT RETRY"));
  assert.equal(reading.usage.input, 1000, "format retry usage is counted");
  assert.ok(Object.isFrozen(reading.diagnostics) && Object.isFrozen(reading.diagnostics.calls));
});

test("wrong JSON shapes are diagnosed, not reclassified as a silent record; retries are bounded", async () => {
  const h = await harness(() => ({ content: { answer: true, quote: SANCTION } }));
  const reading = await h.read();
  assert.equal(h.calls.length, 9 + h.G0LLM.LIMITS.maxFormatRetries);
  assert.equal(reading.diagnostics.invalidSchema, 11);
  assert.equal(reading.diagnostics.formatRetries, 2);
  assert.equal(reading.diagnostics.modelUnknown, 0);
  assert.equal(reading.rejected.length, 0, "format failures are not counted as rejected quotations");
  assert.equal(reading.candidates.length, 0);
  assert.equal(reading.block.staging.unusableCodes.length, 9);
  assert.ok(reading.answers.every(answer => answer.value === null && /response-format\/output-limit problem/.test(answer.gap)));
  assert.match(h.G0LLM.summarise(reading), /Reading diagnostics/);
  assert.throws(() => h.G0LLM.mergeReading(h.input, reading, { applyCodes: ["B1"] }), /verified quote/);
  assert.equal(h.HOSLLM.authorityPlane.kernelCapability, false);
});

test("a literal UNKNOWN template echo is not reported as a successful documentary reading", async () => {
  const h = await harness(prompt => ({ content: {
    findings: askedCodes(prompt).map(code => ({ code, value: "unknown", source_index: 0, quote: "", reason: "What is missing, or how the quoted text supports your answer" }))
  } }));
  const reading = await h.read();
  assert.equal(reading.diagnostics.modelUnknown, 0);
  assert.equal(reading.diagnostics.invalidSchema, 11);
  assert.match(reading.diagnostics.calls[0].detail, /echoed the output template/);
  assert.equal(reading.candidates.length, 0);
});

test("a supported NO remains a quote-backed answer without issuing authority or a badge", async () => {
  const h = await harness(prompt => ({ content: askedCodes(prompt)[0] === "B2"
    ? { findings: [finding("B2", 0, SANCTION, "no")] } : unknownReply(prompt) }));
  const reading = await h.read();
  assert.equal(reading.answers[1].value, false);
  assert.equal(reading.candidates.length, 1);
  assert.match(h.G0LLM.summarise(reading), /1 of 5 behavioral questions answered/);
  const merged = h.G0LLM.mergeReading(h.input, reading, { applyCodes: ["B2"] });
  const record = await h.G0.createAudit(merged, []);
  assert.equal(record.badge, "Unissued");
  assert.equal(record.confidence, "NONE");
  assert.equal(record.input.automation.reviewRequired, true);
});

test("provider output-limit stops are preserved end to end and cannot supply findings", async () => {
  const h = await harness(prompt => ({
    content: askedCodes(prompt)[0] === "B1" ? { findings: [finding("B1", 0, SANCTION)] } : unknownReply(prompt),
    finishReason: askedCodes(prompt)[0] === "B1" ? "length" : "stop"
  }));
  const reading = await h.read();
  assert.equal(reading.diagnostics.truncated, 2);
  assert.equal(reading.diagnostics.nonJson, 0);
  assert.equal(reading.diagnostics.formatRetries, 1);
  assert.equal(reading.answers[0].value, null);
  assert.match(reading.answers[0].gap, /output-token limit/);
  assert.equal(reading.candidates.length, 0);
  assert.equal(reading.diagnostics.calls[0].finishReason, "length");
  const anthropic = h.HOSLLM.readResponse({ protocol: "anthropic" }, { content: [{ type: "text", text: "partial" }], stop_reason: "max_tokens" });
  const google = h.HOSLLM.readResponse({ protocol: "google" }, { candidates: [{ content: { parts: [{ text: "partial" }] }, finishReason: "MAX_TOKENS" }] });
  assert.equal(anthropic.truncated, true);
  assert.equal(google.truncated, true);
});

test("schema and source scope never coerce a missing index or accept unshown text", async () => {
  const h = await harness();
  for (const index of [null, false, "", undefined]) {
    const parsed = h.G0LLM.parseFindings({ findings: [finding("B1", index, SANCTION)] }, [source()], CUTOFF);
    assert.equal(parsed.verified.length, 0);
    assert.equal(parsed.rejected.length, 1);
  }
  const invalidEnum = h.G0LLM.parseFindings({ findings: [{ ...finding("B1", 0, SANCTION), value: "yes | no | unknown" }] }, [source()], CUTOFF);
  assert.equal(invalidEnum.invalid.length, 1);
  const unasked = h.G0LLM.parseFindings({ findings: [finding("B1", 0, SANCTION)] }, [source()], CUTOFF, { codes: ["B2"], sourceIndices: [0] });
  assert.equal(unasked.verified.length, 0);
  assert.equal(unasked.ignored.length, 1);
  const wrongBatch = h.G0LLM.parseFindings({ findings: [finding("B1", 0, SANCTION)] }, [source(), source("OTHER")], CUTOFF, { codes: ["B1"], sourceIndices: [1] });
  assert.equal(wrongBatch.verified.length, 0);
  const unshown = h.G0LLM.parseFindings({ findings: [finding("B1", 0, SANCTION)] }, [source()], CUTOFF, { codes: ["B1"], sourceIndices: [0], sourceTexts: { 0: "A different portion of the document was shown here for this reading." } });
  assert.equal(unshown.verified.length, 0);
});

test("undated, future, and unverified historical text stays held; diagnostics survive normalization", async () => {
  const h = await harness(prompt => {
    const code = askedCodes(prompt)[0];
    const index = ({ B1: 0, B4: 1, B5: 2 })[code];
    return { content: index === undefined ? unknownReply(prompt)
      : { findings: [{ ...finding(code, index, SANCTION), date: "2025-01-01" }] } };
  });
  const sources = [source("UNDATED", { published: null }), source("FUTURE", { published: "2026-11-01" }), source("NO-CAPTURE", { scoringEligible: false })];
  const reading = await h.read(sources);
  assert.equal(reading.held.length, 3);
  assert.equal(reading.candidates.length, 0);
  assert.equal(reading.diagnostics.undatedRecords, 1);
  assert.equal(reading.diagnostics.afterCutoffRecords, 1);
  assert.equal(reading.diagnostics.formatRetries, 0);
  assert.equal(reading.held[1].date, "2026-11-01", "the model cannot backdate a source");
  const normalized = h.G0.normalizeAuditInput({ ...h.input, automation: { sources, llm: reading.block, reviewRequired: true } });
  assert.equal(normalized.automation.llm.diagnostics.readCalls, 9);
  assert.equal(normalized.automation.llm.staging.ceilingPerCall, 700);
  assert.equal(normalized.automation.llm.authorityPlane, "DATA-ONLY");
  assert.equal(normalized.automation.sources[2].scoringEligible, false);
  assert.equal(h.G0.hasScoringCitation(normalized, { value: true, source: sources[2].url, date: "2026-01-01", notes: SANCTION }), false);
});

test("B4 details are bound to the B4 candidate, not unsolicited summaries from other questions", async () => {
  const h = await harness(prompt => ({ content: askedCodes(prompt)[0] === "B4"
    ? { findings: [finding("B4", 0, STAY)], b4: { basis: "TERMINAL_RULE", actor: "Any affected party", action: "The decision", procedure: STAY } }
    : { ...unknownReply(prompt), b4: { basis: "NO_PENALTY_EXIT", actor: "Unrelated actor", action: "Unrelated action" } } }));
  const reading = await h.read([source("APPEAL", { text: `Any affected party may appeal. ${STAY}` })]);
  assert.equal(reading.b4.basis, "TERMINAL_RULE");
  assert.equal(reading.b4.actor, "Any affected party");
  assert.equal(reading.b4.procedure, STAY);
});

test("retrieved Markdown links enable constrained follow-up reads and exact character accounting", async () => {
  const h = await harness(prompt => {
    if (prompt.includes("\nLINKS\n")) return { content: { followups: [{ index: 1, why: "The operative appeal procedure" }, { index: 99, why: "An invented link" }] } };
    return { content: askedCodes(prompt)[0] === "B4" && prompt.includes(STAY)
      ? { findings: [finding("B4", 1, STAY)] } : unknownReply(prompt) };
  });
  const parent = source("TERMS", { text: `${SANCTION}\nSee the [Appeal procedure](/appeals-extra) for the full rule.` });
  const followed = [];
  h.G0Research.readWithArchive = async url => {
    followed.push(url);
    return { url, title: "Appeal procedure", published: "2026-01-01", content: STAY, official: true, scoringEligible: true };
  };
  const reading = await h.read([parent], { followLinks: true, website: "https://acme.example/" });
  assert.deepEqual(followed, ["https://acme.example/appeals-extra"]);
  assert.equal(reading.sourcesRead, 2);
  assert.equal(reading.charsRead, parent.text.length + STAY.length);
  assert.equal(reading.followUps.length, 1);
  assert.equal(reading.answers[3].value, true);
  assert.equal(reading.answers[3].source, followed[0]);
  assert.equal(h.calls.length, 19);
});

test("structured parsing passes prose brackets and respects escaped strings, but never salvages truncated roots", async () => {
  const h = await harness();
  const payload = { findings: [finding("B1", 0, SANCTION)], gap: 'A literal bracket ] and a quoted "word".' };
  const json = JSON.stringify(payload);
  assert.equal(JSON.stringify(h.HOSLLM.extractJson(`Analysis [note]: ${json}`)), json);
  assert.equal(JSON.stringify(h.HOSLLM.extractJson(`\`\`\`json\n${json}\n\`\`\``)), json);
  assert.equal(h.HOSLLM.extractJson(json.slice(0, -1)), null);
  assert.equal(h.HOSLLM.extractJson('{"findings":[{"code":"B1","value":"yes"}'), null);
});
