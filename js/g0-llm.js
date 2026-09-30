/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Ground-0 LLM reading pass (window.G0LLM)

   The automatic research pipeline retrieves documents but can only
   match them against fixed keyword rules, so an organization whose
   governing text says something in its own words is recorded as a
   coverage gap. This module closes that gap: a linked model reads the
   documents this browser already retrieved and proposes answers, each
   one bound to a verbatim quote from a named source.

   What it will not do:
     · It cannot invent a source. Follow-up reading is limited to links
       that actually appear inside already-retrieved text, and the page
       is fetched by the same reader and archive path as the original
       research, under the same cutoff.
     · It does not score. Every quote is checked character-for-character
       against the stored source text; a quote that is not found is
       discarded and the answer becomes UNKNOWN, never NO.
     · It does not issue a badge. The engine still decides, and the
       record still requires human review.

   How it asks: one question per call. A single call that must return nine
   answers, two structures, coverage notes and gap lists reserves a large
   output ceiling — and providers that price a call by the ceiling it
   *reserves* refuse it outright when the balance cannot cover that number
   (OpenRouter answers 402: "you requested up to 6000 tokens, but can only
   afford 2664"). Staging the audit question by question means the model is
   recalled many times with a small ceiling each time, which a small balance
   can actually pay for, an answer never arrives truncated half-way through
   the ninth question, and one failed recall costs one question instead of
   the whole reading. `LIMITS.codesPerCall` is the dial: 1 asks a single
   question per call, a higher number groups questions and re-sends the same
   source text fewer times.

   Exposed as window.G0LLM. Requires window.G0, window.G0Research and
   a configured window.HOSLLM connection.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

window.G0LLM = (() => {
  const G0 = window.G0;
  const R = window.G0Research;
  const LLM = window.HOSLLM;

  const LIMITS = {
    perSource: 12000,        // characters of one document handed to the model
    budget: 150000,          // characters per reading run (~42k tokens), split into passes
    batchSources: 3,         // documents per pass
    maxFollowUps: 4,         // additional pages the model may request from links it was shown
    codesPerCall: 1,         // questions asked per model call — 1 stages the audit question by question
    maxTokensRead: 700,      // ceiling for a one-question reading call: one quote, one reason, one gap
    maxTokensPerCode: 260,   // added to that ceiling for each further question grouped into the same call
    maxTokensWeigh: 300,     // ceiling for one weighing call: one decision between candidates
    maxTokensLinks: 700,     // ceiling for the call that picks linked pages to read next
    floorTokens: 120,        // below this a call cannot return a verified quote; it is not sent
    minQuote: 24             // a shorter quote is not distinctive enough to verify
  };

  const sourceText = source => String((source && (source.text || source.excerpt)) || "");
  const isLead = source => !source || source.kind === "news" || source.dateBasis === "indexed";
  const citationDate = source => (source && (source.published || source.capturedAt)) || "";
  const readable = source => !isLead(source) && G0.safePublicUrl(source.url) && sourceText(source).trim().length >= 60;
  const label = value => String(value || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 140);

  /* ──────────────────────────────────────────────────────────────
     Quote verification — the gate that makes a model reading usable
     ────────────────────────────────────────────────────────────── */
  const normalize = value => String(value ?? "")
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, "\"")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const unquote = value => String(value ?? "").replace(/^\s*(?:["'“”]|<<<)+\s*/, "").replace(/\s*(?:["'“”]|>>>)+\s*$/, "").trim();

  function verifyQuote(rawQuote, source) {
    const quote = unquote(rawQuote);
    const haystack = normalize(sourceText(source));
    const needle = normalize(quote);
    if (needle.length < LIMITS.minQuote) return { ok: false, reason: `the quote is shorter than ${LIMITS.minQuote} characters and cannot be checked`, quote };
    if (haystack.includes(needle)) return { ok: true, quote };
    /* Ellipsis joins: every fragment must still be present verbatim. */
    const parts = needle.split(/\s*(?:\.\.\.|…)\s*/).map(part => part.trim()).filter(part => part.length >= 16);
    if (parts.length > 1 && parts.every(part => haystack.includes(part))) return { ok: true, quote, joined: true };
    return { ok: false, reason: "the quote does not appear in the retrieved text of that source", quote };
  }
  /* Relief figures are the one place a model could turn "some appeals won"
     into "at least 50% relief". Both numbers must exist in the source. */
  function numbersInText(source, numerator, denominator) {
    const text = normalize(sourceText(source));
    const has = value => String(value ?? "").trim() !== "" && new RegExp(`(^|[^0-9])${String(value).replace(/[^0-9]/g, "")}([^0-9]|$)`).test(text);
    return has(numerator) && has(denominator);
  }

  /* ──────────────────────────────────────────────────────────────
     Packing — what the model is allowed to see
     ────────────────────────────────────────────────────────────── */
  /* SOURCE numbers printed to the model are positions in the full source
     pool, so a model reply can always be resolved back to one stored
     source — including a batch that starts part-way through the pool. */
  function packSources(sources, { perSource = LIMITS.perSource, budget = LIMITS.budget, batchSources = LIMITS.batchSources, offset = 0 } = {}) {
    const usable = [];
    let remaining = budget;
    sources.forEach((source, position) => {
      if (remaining <= 0 || !G0.safePublicUrl(source.url)) return;
      const text = sourceText(source).trim();
      const slice = text.slice(0, Math.min(perSource, remaining));
      if (slice.length < 60) return;
      remaining -= slice.length;
      usable.push({ index: offset + position, id: source.id, title: label(source.title), url: source.url, kind: source.kind, authority: label(source.authority), published: source.published || "", capturedAt: source.capturedAt || "", dateBasis: source.dateBasis || "", lead: isLead(source), chars: slice.length, full: text.length, text: slice });
    });
    const batches = [];
    for (let i = 0; i < usable.length; i += batchSources) batches.push(usable.slice(i, i + batchSources));
    return { batches, packed: usable, totalChars: usable.reduce((sum, item) => sum + item.chars, 0), skipped: sources.length - usable.length };
  }

  const blockFor = source => [
    `SOURCE ${source.index} — ${source.lead ? "LEAD ONLY (never supports an answer)" : "readable record"}`,
    `title: ${source.title}`,
    `url: ${source.url}`,
    `kind: ${source.kind || "context"}${source.authority ? ` · authority: ${source.authority}` : ""}`,
    `dated: ${source.published ? `published ${source.published}` : source.capturedAt ? `archive capture ${source.capturedAt}` : "no qualifying date on the record"}${source.dateBasis ? ` (dateBasis: ${source.dateBasis})` : ""}`,
    source.full > source.chars ? `note: this record was truncated to ${source.chars} characters for this reading` : "",
    "text:",
    "<<<",
    source.text,
    ">>>"
  ].filter(Boolean).join("\n");

  const B4_V11_TEST = "v1.1 test: YES requires an operative terminal/stay rule, a complete published relief record of at least 50%, or a binding penalty-free exit. An external order plus compliance is NOT a yes.";
  const questionFor = code => G0.questions.find(question => question.code === code) || G0.constraintQuestions.find(question => question.code === code) || null;
  /* The nine codes, in the order the framework states them. */
  const allCodes = () => [...G0.questions.map(question => question.code), ...G0.constraintQuestions.map(question => question.code)];

  /* One question, fully stated: what it asks, what counts as evidence, and
     the v1.1 discipline that applies to it. Asking one at a time is what
     keeps each call's output small enough to be paid for and to arrive
     complete, so the question is stated in full every time. */
  function questionBlock(version, codes) {
    return codes.map(code => {
      const question = questionFor(code);
      if (!question) return "";
      return [
        `${question.code} · ${question.title}`,
        `    asks: ${question.description}`,
        question.examples ? `    counts as evidence: ${question.examples}` : "",
        question.code === "B4" && version === "1.1" ? `    ${B4_V11_TEST}` : "",
        question.code === "B4" ? "    B4 discipline: name the actor, the audited action and the operative procedure from the quote. An external order to the entity, and the entity's compliance with it, do not make refusal terminal." : ""
      ].filter(Boolean).join("\n");
    }).filter(Boolean).join("\n");
  }

  /* What a reading call reserves, sized by what it asks: one question needs
     room for one quote, one reason and one gap sentence; each further question
     grouped into the same call adds room for its own answer, so a grouped reply
     is never cut off half-way through. The connection layer clamps this to
     whatever ceiling the provider has said it will sell. */
  const readCeiling = count => LIMITS.maxTokensRead + Math.max(0, (Number(count) || 1) - 1) * LIMITS.maxTokensPerCode;

  /* The staged call plan: how the nine questions are grouped into calls.
     With codesPerCall 1 there are nine calls per source batch. */
  function questionChunks(codes, perCall = LIMITS.codesPerCall) {
    const list = (Array.isArray(codes) ? codes : allCodes()).filter(Boolean);
    const size = Math.max(1, Math.min(list.length || 1, Math.floor(Number(perCall) || 1)));
    const chunks = [];
    for (let i = 0; i < list.length; i += size) chunks.push(list.slice(i, i + size));
    return chunks;
  }

  const SYSTEM = [
    "You are the documentary reader inside HarshalOS Ground-0, an accountability-gated audit system. You read retrieved public documents and report only what those documents say.",
    "",
    "Absolute rules:",
    "1. Use ONLY the SOURCE blocks supplied in this message. Never use outside knowledge or memory, and never infer from the organization's reputation.",
    "2. Every finding must carry a verbatim quote of 8 to 45 words, copied character-for-character from one SOURCE block (not from the <<< >>> fences). A quote that cannot be found in the stored text is discarded by an automatic checker and the finding is thrown away.",
    "3. Answer ONLY the question or questions named in this message. You are asked one question at a time, in a series of calls over the same sources; a finding for a question you were not asked is ignored.",
    "4. Prefer a supported answer to \"unknown\": if a supplied source states a rule, policy, decision, order, or outcome that bears on the question, answer it and quote it. Use \"unknown\" only when no supplied source bears on the question.",
    "5. Sources marked LEAD ONLY (news indexes, search results) can never support yes or no. They may only be listed under \"leads\".",
    "6. Quote only operative text: a rule, policy, decision, order, or outcome. Not captions, headlines, filing dates, requests, proposals, press description, or app-written guidance.",
    "7. A statement about a different organization is not evidence about this one.",
    "8. Distinguish the entity's own binding rule from an external body's order about the entity: an external order plus compliance does not make refusal terminal (B4).",
    "9. Report yes or no only with a quote; otherwise unknown. Do not pad the list.",
    "10. Output JSON only, matching the requested shape exactly. No prose, no markdown fence. Keep it short: one finding per question asked."
  ].join("\n");

  function readInstruction({ input, batch, codes, batchIndex, batchCount, questionIndex, questionCount, version }) {
    const asked = codes.join(", ");
    const shape = {
      findings: [{ code: codes[0], value: "yes | no | unknown", source_index: 0, quote: "verbatim from the source, 8 to 45 words", date: "date on the source record, or empty", confidence: "high | medium | low", reason: "one sentence tying the quote to the question" }],
      ...(codes.includes("B4") ? { b4: { basis: "TERMINAL_RULE | RESOLVED_APPEALS | NO_PENALTY_EXIT | NOT_DEMONSTRATED", actor: "who may refuse or appeal, from the quote", action: "the action it stops, from the quote", procedure: "the operative rule, quoted", numerator: "", denominator: "", complete: false } } : {}),
      ...(codes.includes("C2") ? { c2: { route: false, invoked: false, complete: false, numerator: "", denominator: "" } } : {}),
      gap: "one sentence: what these sources do and do not say about this question, or empty if it is answered"
    };
    return [
      `ENTITY UNDER AUDIT: ${input.name}${input.identifier ? ` (${input.identifier})` : ""}`,
      `EVIDENCE CUTOFF: ${input.cutoff} (inclusive). A source dated after the cutoff cannot support an answer.`,
      `FRAMEWORK: Ground-0 v${version}${version === "1.1" ? " — unratified amendment draft" : " — normative baseline"}`,
      `READING PASS ${batchIndex + 1} OF ${batchCount} — QUESTION ${questionIndex + 1} OF ${questionCount}`,
      "",
      `QUESTION${codes.length === 1 ? "" : "S"} TO ANSWER IN THIS CALL: ${asked}`,
      questionBlock(version, codes),
      "",
      "SOURCES",
      batch.map(blockFor).join("\n\n"),
      "",
      "Return exactly this JSON shape:",
      JSON.stringify(shape, null, 1),
      "",
      codes.length === 1
        ? `Answer ${asked} only, with one finding object inside "findings". For b4 and c2 fill fields only from quoted text, and leave the numbers empty unless a source states them. If no supplied source bears on ${asked}, return one finding with value "unknown" and say what is missing in "gap".`
        : `Answer ${asked} only, with exactly ${codes.length} finding objects inside "findings", one per question. For b4 and c2 fill fields only from quoted text, and leave the numbers empty unless a source states them.`
    ].join("\n");
  }

  /* Weighing is staged the same way: one call per contested question, so the
     prompt carries only that question's candidates and the reply is one line. */
  function weighInstruction({ code, candidates, version, entity, cutoff }) {
    const question = questionFor(code);
    return [
      `ENTITY: ${entity}. CUTOFF: ${cutoff}. FRAMEWORK: Ground-0 v${version}.`,
      `QUESTION BEING WEIGHED: ${code}${question ? ` · ${question.title} — ${question.description}` : ""}`,
      code === "B4" && version === "1.1" ? B4_V11_TEST : "",
      "",
      "Below are candidate findings for this one question that already passed a verbatim-quote check against the stored source text. Choose at most ONE candidate, or reject them all.",
      "You may not write new quotes, new sources, or new values: reply with the candidate id you accept, or \"none\".",
      "Prefer the candidate whose quote is operative and whose source is the entity's own governing document. Reject candidates whose quote is descriptive rather than operative, or that are really about another organization.",
      "",
      "CANDIDATES",
      JSON.stringify(candidates, null, 1),
      "",
      "Return exactly this JSON shape:",
      JSON.stringify({ code, candidate: "C1 | none", reason: "one sentence", gap: "what is still missing for this question, or empty" }, null, 1)
    ].filter(Boolean).join("\n");
  }

  function linkInstruction({ links, entity, cutoff, missing }) {
    return [
      `The reading of ${entity}'s retrieved record (cutoff ${cutoff}) did not resolve: ${missing.join(", ")}.`,
      "",
      "Below are links that appear inside documents already retrieved. If one of them would plausibly carry the missing operative text — an appeal or dispute procedure, an enforcement policy, terms of use, a governance charter, a court order — request it by its index.",
      "You may not invent a URL and may not reach outside this list. Request at most 4, and only where the missing text is plausibly on that page.",
      "",
      "LINKS",
      links.map(link => `${link.index}. ${link.label || "(no label)"} — ${link.url}`).join("\n"),
      "",
      "Return exactly this JSON shape and nothing else:",
      JSON.stringify({ followups: [{ index: 0, why: "what is expected there" }] }, null, 1)
    ].join("\n");
  }

  /* ──────────────────────────────────────────────────────────────
     Model output → verified findings
     ────────────────────────────────────────────────────────────── */
  const VALUES = new Set(["yes", "no", "unknown"]);
  const confidenceRank = value => value === "high" ? 3 : value === "medium" ? 2 : 1;
  const CODES = new Set(["B1", "B2", "B3", "B4", "B5", "C1", "C2", "C3", "C4"]);

  /* Sorts one model reply into what the record can carry:
       verified — a yes/no with a quote that matched the stored text and a
                  source dated on or before the cutoff. These may be scored.
       held     — a quote that matched, on a source with no qualifying date.
       rejected — a quote that did not match, or came from a lead.
       unknown  — the model said the sources do not bear on the question. This
                  is a statement about the record, never a finding: it carries
                  no quote, so it must never reach the candidate list, where it
                  would either crash the record build or be read as a NO. */
  function parseFindings(data, pool, cutoff) {
    const verified = []; const rejected = []; const held = []; const unknown = [];
    const rows = data && Array.isArray(data.findings) ? data.findings : [];
    const seen = new Set();
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const code = String(row.code || "").toUpperCase();
      if (!CODES.has(code) || seen.has(code)) continue;
      const value = String(row.value || "").toLowerCase();
      if (!VALUES.has(value)) continue;
      if (value === "unknown") { seen.add(code); unknown.push({ code, value: "unknown", reason: label(row.reason).slice(0, 400), confidence: "low" }); continue; }
      const index = Number(row.source_index);
      const source = Number.isInteger(index) ? pool[index] : null;
      if (!source) { rejected.push({ code, reason: "the finding named a source that was not supplied", quote: unquote(row.quote).slice(0, 400) }); continue; }
      if (isLead(source)) { rejected.push({ code, reason: `source ${source.id} is a lead (${source.kind}${source.dateBasis ? `, ${source.dateBasis}` : ""}) and can never support an answer`, quote: unquote(row.quote).slice(0, 400), sourceId: source.id }); continue; }
      const check = verifyQuote(row.quote, source);
      if (!check.ok) { rejected.push({ code, reason: check.reason, quote: check.quote.slice(0, 400), sourceId: source.id }); continue; }
      seen.add(code);
      const date = citationDate(source);
      const finding = {
        code, value, quote: check.quote, sourceId: source.id, url: source.url, title: label(source.title),
        date, dateFromModel: label(row.date).slice(0, 24), joined: !!check.joined,
        confidence: ["high", "medium", "low"].includes(String(row.confidence || "").toLowerCase()) ? String(row.confidence).toLowerCase() : "medium",
        reason: label(row.reason).slice(0, 600)
      };
      /* A value the engine can score needs a qualifying date on the source
         record. Without one the reading is kept for review, never scored. */
      if (!date || !G0.eligibleByCutoff(date, cutoff)) held.push({ ...finding, held: "this source carries no qualifying date on or before the cutoff" });
      else verified.push(finding);
    }
    return { verified, rejected, held, unknown };
  }

  /* A staged call reports one gap sentence; a grouped call may report a list.
     Both are read, neither is invented. */
  function parseSummary(data) {
    const gaps = Array.isArray(data && data.gaps)
      ? data.gaps
      : (data && typeof data.gap === "string" && data.gap.trim() ? [data.gap] : []);
    return {
      b4: data && G0.isObject(data.b4) ? data.b4 : null,
      c2: data && G0.isObject(data.c2) ? data.c2 : null,
      gaps: gaps.filter(gap => typeof gap === "string" && gap.trim()).map(gap => label(gap).slice(0, 400))
    };
  }

  /* ──────────────────────────────────────────────────────────────
     Link discovery — only links that really exist in the record
     ────────────────────────────────────────────────────────────── */
  function linkCandidates(sources, fetched) {
    const seen = new Set((fetched || []).map(url => G0.canonicalUrl(url)));
    const out = [];
    for (const source of sources) {
      if (isLead(source) || !G0.safePublicUrl(source.url)) continue;
      if (!R.policyLinks) break;
      /* The page's own label for the link, so the model chooses on meaning
         rather than on a URL slug. */
      const labels = new Map();
      for (const match of sourceText(source).matchAll(/\[([^\]]{1,100})\]\(([^)\s]+)\)/g)) {
        try { labels.set(G0.canonicalUrl(new URL(match[2], source.url).href.split("#")[0]), label(match[1])); } catch { /* ignore bad links */ }
      }
      for (const url of R.policyLinks(sourceText(source), source.url)) {
        if (!G0.safePublicUrl(url)) continue;
        const key = G0.canonicalUrl(url);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ index: out.length + 1, url, label: labels.get(key) || "", foundIn: source.url });
        if (out.length >= 60) return out;
      }
    }
    return out;
  }

  /* ──────────────────────────────────────────────────────────────
     The reading run
     ────────────────────────────────────────────────────────────── */
  /* Staging means several calls read the same sources, so the same rejection
     or gap sentence can come back more than once. One reading, one entry: the
     record must not look noisier than the evidence it was built from. */
  const pushUnique = (list, rows, keyOf) => {
    const seen = new Set(list.map(keyOf));
    for (const row of rows || []) { const key = keyOf(row); if (seen.has(key)) continue; seen.add(key); list.push(row); }
  };
  const noteOnce = (notes, text) => { const message = label(text).slice(0, 400); if (message && !notes.includes(message)) notes.push(message); };

  /* A call that never reached the model is not a question that failed: it
     ends the reading, rather than quietly producing an empty one that looks
     like "no evidence found". Persistent account-wide auth, rate, quota and
     in-flight pressure also stops the staged pass instead of repeating the
     same provider refusal for every question. */
  const FATAL_KINDS = new Set(["auth", "cors", "model", "busy", "rate", "quota", "sdk"]);
  const isFatal = error => FATAL_KINDS.has(error && error.kind) || /no endpoint|no model|nothing to send|not loaded/i.test(String((error && error.message) || ""));
  const b4Qualifies = value => /TERMINAL_RULE|RESOLVED_APPEALS|NO_PENALTY_EXIT/.test(String((value && value.basis) || ""));
  const c2SaysSomething = value => !!value && (value.route === true || value.invoked === true || String(value.numerator || "").trim() !== "" || String(value.denominator || "").trim() !== "");

  async function readSources({
    input, sources, version = "1.0", cutoff = input.cutoff, signal,
    followLinks = true, onProgress = () => {}, model = "", website = "", entity = "",
    codesPerCall = LIMITS.codesPerCall
  }) {
    if (!LLM) throw new Error("The LLM connection layer is not loaded.");
    const status = LLM.status();
    if (!status.linked) throw new Error(status.reason || "No model is linked. Open the LLM Link app to connect one.");
    if (!Array.isArray(sources) || !sources.length) throw new Error("There are no retrieved sources to read. Run the automatic research first.");

    const pool = sources.map(source => ({ ...source }));
    const target = { ...input, name: entity || input.name, cutoff };
    const progress = (step, message, completed, total = 5) => onProgress({ step, message, completed, total });
    const usage = { input: 0, output: 0 };
    const rejected = []; const held = []; const unknowns = []; const notes = []; const followUps = [];
    /* A question whose call never completed. This is not the same as a record
       that is silent about it, and the gap text must not pretend otherwise. */
    const failedCodes = new Map();
    /* What the model said when it reported a question unanswerable from these
       sources. Kept so the gap can quote its reason instead of going vague. */
    const unknownReason = new Map();
    const takeUnknowns = rows => (rows || []).forEach(row => { if (row && row.reason && !unknownReason.has(row.code)) unknownReason.set(row.code, row.reason); });
    let passes = 0; let callsOk = 0; let callsFailed = 0; let lastError = null;

    const pack = packSources(pool);
    if (!pack.batches.length) throw new Error("None of the retrieved sources stores readable text. Re-run the automatic research so the pages are kept, then read them with the model.");

    /* The staged plan: nine questions, grouped into calls. One call per
       question by default, so each ceiling stays small enough to be paid for
       and each answer arrives complete. */
    const codes = allCodes();
    const plan = questionChunks(codes, codesPerCall);
    let unitsDone = 0;
    let unitsTotal = plan.length * pack.batches.length;
    /* The bar moves once per question call rather than once per batch, so a
       long staged read shows progress instead of sitting still. Rounded, or
       the interface prints 1.8900000000000001 of 5. */
    const stepAt = () => Math.round((1 + Math.min(1, unitsDone / Math.max(1, unitsTotal))) * 100) / 100;
    const retryNotice = (step, subject) => ({ delayMs, source }) => {
      const seconds = Math.max(1, Math.ceil(delayMs / 1000));
      const wait = seconds >= 60 ? `${Math.ceil(seconds / 60)} minute${Math.ceil(seconds / 60) === 1 ? "" : "s"}` : `${seconds} second${seconds === 1 ? "" : "s"}`;
      const provider = status.label || "The provider";
      const message = /retry-?after|retry-?info/i.test(String(source || ""))
        ? `${provider} asked us to wait ${wait} before retrying ${subject}…`
        : `${provider} returned a temporary error; retrying ${subject} after a ${wait} backoff…`;
      progress(step, message, step === 2 ? stepAt() : step);
    };

    const ask = async (user, maxTokens, temperature = 0, onRetry = null) => {
      const result = await LLM.chat({ system: SYSTEM, user, maxTokens, temperature, signal, model, floorTokens: LIMITS.floorTokens, onRetry });
      passes++;
      usage.input += result.usage.input; usage.output += result.usage.output;
      if (result.shrunk) noteOnce(notes, `The provider would only reserve a ${result.reserved}-token ceiling for a call, so this one was sent inside it instead of ${maxTokens}.`);
      return { data: LLM.extractJson(result.text), text: result.text };
    };

    /* One source batch, read question by question. A failure inside one
       question costs that question, not the batch and not the audit. */
    const readPass = async (batch, index, count) => {
      const findings = []; const heldHere = []; const rejectedHere = []; const gaps = []; const unknownHere = [];
      let b4 = null; let c2 = null;
      /* A question this batch has already produced a reading for. The source
         text in this batch cannot change between calls, so asking again would
         only re-spend the same tokens on the same answer. */
      const answered = new Set();
      for (const [questionIndex, chunk] of plan.entries()) {
        signal && signal.throwIfAborted();
        unitsDone++;
        const askedCodes = chunk.filter(code => !answered.has(code));
        if (!askedCodes.length) {
          progress(2, `Pass ${index + 1} of ${count} — ${chunk.join(", ")} already read from these sources…`, stepAt());
          continue;
        }
        progress(2, `Reading ${askedCodes.join(", ")} — pass ${index + 1} of ${count}, question ${questionIndex + 1} of ${plan.length} (${batch.map(item => item.id).join(", ")})…`, stepAt());
        let data = null;
        try {
          ({ data } = await ask(readInstruction({ input: target, batch, codes: askedCodes, batchIndex: index, batchCount: count, questionIndex, questionCount: plan.length, version }), readCeiling(askedCodes.length), 0, retryNotice(2, askedCodes.join(", "))));
          callsOk++;
        } catch (error) {
          if (error && error.name === "AbortError") throw error;
          callsFailed++; lastError = error;
          if (isFatal(error)) throw error;
          const told = LLM.redact(error.message);
          askedCodes.forEach(code => { if (!failedCodes.has(code)) failedCodes.set(code, told); });
          noteOnce(notes, `The call for ${askedCodes.join(", ")} in pass ${index + 1} failed, so that question was left unanswered: ${told}`);
          continue;
        }
        if (!data) { noteOnce(notes, `The call for ${askedCodes.join(", ")} in pass ${index + 1} returned output that was not JSON, so nothing was taken from it.`); continue; }
        const parsed = parseFindings(data, pool, cutoff);
        /* Only a question this call actually asked is settled by its answer:
           a model that volunteers a code it was not asked has not saved us
           the call we were about to make about it. */
        const settles = code => askedCodes.includes(code) ? answered.add(code) : null;
        parsed.verified.forEach(finding => { finding.pass = index + 1; findings.push(finding); settles(finding.code); });
        parsed.held.forEach(finding => { finding.pass = index + 1; heldHere.push(finding); settles(finding.code); });
        parsed.unknown.forEach(row => { unknownHere.push(row); settles(row.code); });
        pushUnique(rejectedHere, parsed.rejected, row => `${row.code}|${row.reason}|${row.quote}`);
        const summary = parseSummary(data);
        if (summary.b4 && (!b4 || b4Qualifies(summary.b4))) b4 = summary.b4;
        if (summary.c2 && (!c2 || c2SaysSomething(summary.c2))) c2 = summary.c2;
        summary.gaps.forEach(gap => { if (!gaps.includes(gap)) gaps.push(gap); });
      }
      if (!findings.length && !heldHere.length && !rejectedHere.length && !unknownHere.length) notes.push(`Reading pass ${index + 1} produced no verifiable quote for any question. Unreadable output was discarded rather than guessed at.`);
      return { findings, held: heldHere, rejected: rejectedHere, unknown: unknownHere, summary: { b4, c2, gaps } };
    };

    progress(1, `Opening ${pack.packed.length} readable record${pack.packed.length === 1 ? "" : "s"} (${Math.round(pack.totalChars / 1000)}k characters) in ${pack.batches.length} pass${pack.batches.length === 1 ? "" : "es"} · ${codes.length} questions staged ${plan.length === codes.length ? "one per call" : `${plan.length} calls of ${plan[0].length}`}…`, 1);

    /* Pass 1 — read every document, one question at a time. */
    const passesOut = [];
    for (const [index, batch] of pack.batches.entries()) {
      signal && signal.throwIfAborted();
      passesOut.push(await readPass(batch, index, pack.batches.length));
    }
    if (!callsOk && callsFailed) throw lastError instanceof Error ? lastError : new Error(`Every staged call failed (${callsFailed} attempts), so nothing was read.`);
    passesOut.forEach(result => {
      pushUnique(rejected, result.rejected, row => `${row.code}|${row.reason}|${row.quote}`);
      pushUnique(held, result.held, row => `${row.code}|${row.sourceId}|${normalize(row.quote)}`);
      takeUnknowns(result.unknown);
      (result.summary.gaps || []).forEach(gap => noteOnce(notes, gap));
    });
    let summaryB4 = passesOut.map(result => result.summary.b4).find(b4Qualifies) || {};
    let summaryC2 = passesOut.map(result => result.summary.c2).find(c2SaysSomething) || passesOut.map(result => result.summary.c2).find(Boolean) || {};

    let candidates = [];
    const candidateKeys = new Set();
    const addCandidates = findings => findings.forEach(finding => {
      /* Only a quoted yes/no is a candidate. An UNKNOWN carries no quote and
         must never be weighed, chosen, or scored. */
      if (!finding || finding.value === "unknown" || typeof finding.quote !== "string" || !finding.quote.trim()) return;
      /* Two passes can surface the same quote for the same code: that is one
         reading, not two, and it must not fabricate a weighing decision. */
      const key = `${finding.code}|${finding.sourceId}|${normalize(finding.quote)}`;
      if (candidateKeys.has(key)) return;
      candidateKeys.add(key);
      candidates.push({ id: `C${candidates.length + 1}`, code: finding.code, value: finding.value, quote: finding.quote, sourceId: finding.sourceId, url: finding.url, title: finding.title, date: finding.date, confidence: finding.confidence, reason: finding.reason, pass: finding.pass || 0 });
    });
    addCandidates(passesOut.flatMap(result => result.findings));

    /* Follow-up reading — the model may only pick from links it was shown. */
    if (followLinks && R.readWithArchive) {
      const missing = codes.filter(code => !candidates.some(candidate => candidate.code === code && candidate.value !== "unknown"));
      const links = linkCandidates(pool, pool.map(source => source.url));
      if (missing.length && links.length) {
        progress(3, `Asking which linked page in this record should be read next (${missing.length} question${missing.length === 1 ? "" : "s"} unresolved)…`, 3);
        const wanted = new Map();
        try {
          const { data } = await ask(linkInstruction({ links, entity: target.name, cutoff, missing }), LIMITS.maxTokensLinks, 0, retryNotice(3, "the linked-page selection"));
          callsOk++;
          const rows = data && Array.isArray(data.followups) ? data.followups : [];
          for (const row of rows.slice(0, LIMITS.maxFollowUps)) {
            const link = links.find(candidate => candidate.index === Number(row && row.index));
            if (link && !wanted.has(link.url)) wanted.set(link.url, { url: link.url, why: label(row && row.why), label: link.label });
          }
        } catch (error) {
          if (error && error.name === "AbortError") throw error;
          callsFailed++; lastError = error;
          if (isFatal(error)) throw error;
          noteOnce(notes, `Follow-up reading was skipped: ${LLM.redact(error.message)}`);
        }
        if (wanted.size) {
          progress(3, `Reading ${wanted.size} linked page${wanted.size === 1 ? "" : "s"} named inside the record…`, 3);
          for (const request of wanted.values()) {
            signal && signal.throwIfAborted();
            try {
              const page = await R.readWithArchive(request.url, website || request.url, cutoff, signal);
              const source = {
                id: `LINK-${followUps.length + 1}`, title: label(page.title) || request.url,
                url: page.url, published: page.published || null, retrieved: new Date().toISOString(),
                excerpt: (R.stripMarkdown ? R.stripMarkdown(page.content) : String(page.content)).slice(0, 1500),
                text: String(page.content || "").slice(0, LIMITS.perSource),
                codes: [], kind: page.archived ? "archive" : page.official ? "official" : "context",
                dateBasis: page.dateBasis || (page.published ? "publication" : page.archived ? "archive-capture" : "unknown")
              };
              if (G0.isCalendarDate(page.archived)) source.capturedAt = page.archived;
              if (G0.safePublicUrl(page.liveUrl)) source.originalUrl = page.liveUrl;
              if (!source.published && !source.capturedAt) notes.push(`${source.id}: “${source.title}” was read but carries no qualifying date, so nothing from it can be scored.`);
              pool.push(source);
              followUps.push({ id: source.id, url: source.url, label: request.label, why: request.why, requestedBy: "linked model" });
            } catch (error) {
              signal && signal.throwIfAborted();
              notes.push(`${request.url} could not be read: ${LLM.redact(error.message)}`);
            }
          }
          if (followUps.length) {
            const freshlyRead = pool.filter(source => followUps.some(item => item.id === source.id));
            const repack = packSources(freshlyRead, { offset: pool.length - freshlyRead.length });
            /* The freshly read pages are staged the same way: every question
               still unresolved is asked of them, one call at a time. */
            unitsTotal += plan.length * repack.batches.length;
            for (const [index, batch] of repack.batches.entries()) {
              signal && signal.throwIfAborted();
              const result = await readPass(batch, index, repack.batches.length);
              pushUnique(rejected, result.rejected, row => `${row.code}|${row.reason}|${row.quote}`);
              pushUnique(held, result.held, row => `${row.code}|${row.sourceId}|${normalize(row.quote)}`);
              takeUnknowns(result.unknown);
              (result.summary.gaps || []).forEach(gap => noteOnce(notes, gap));
              addCandidates(result.findings);
              if (result.summary.b4 && b4Qualifies(result.summary.b4)) summaryB4 = result.summary.b4;
              if (c2SaysSomething(result.summary.c2)) summaryC2 = result.summary.c2;
            }
          }
        }
      }
    }
    if (!callsOk && callsFailed) throw lastError instanceof Error ? lastError : new Error(`Every staged call failed (${callsFailed} attempts), so nothing was read.`);

    /* Weighing — staged per contested question. A question with a single
       verified candidate has nothing to weigh and costs no call at all. */
    let decisions = null;
    const contested = codes.filter(code => candidates.filter(candidate => candidate.code === code).length > 1);
    if (contested.length) {
      decisions = [];
      for (const [index, code] of contested.entries()) {
        signal && signal.throwIfAborted();
        const ofCode = candidates.filter(candidate => candidate.code === code);
        progress(4, `Weighing ${ofCode.length} verified candidates for ${code} — question ${index + 1} of ${contested.length}…`, 4);
        try {
          const { data } = await ask(weighInstruction({ code, candidates: ofCode, version, entity: target.name, cutoff }), LIMITS.maxTokensWeigh, 0, retryNotice(4, `the weighing for ${code}`));
          callsOk++;
          if (!data) { noteOnce(notes, `The weighing call for ${code} returned output that was not JSON, so the highest-confidence verified reading was kept.`); continue; }
          /* One decision per call; a grouped reply is still read if it comes. */
          const rows = Array.isArray(data.decisions) ? data.decisions : [data];
          const row = rows.find(item => item && String(item.code || code).toUpperCase() === code && (item.candidate || item.reason)) || null;
          if (row) decisions.push({ code, candidate: String(row.candidate || "none"), reason: label(row.reason).slice(0, 400) });
          parseSummary(data).gaps.forEach(gap => noteOnce(notes, gap));
        } catch (error) {
          if (error && error.name === "AbortError") throw error;
          callsFailed++; lastError = error;
          if (isFatal(error)) throw error;
          noteOnce(notes, `The weighing call for ${code} failed, so the highest-confidence verified reading was kept: ${LLM.redact(error.message)}`);
        }
      }
      if (!decisions.length) decisions = null;
    }

    /* Final choice per code. */
    const chosen = new Map(); const heldFor = new Map();
    const decisionFor = new Map((decisions || []).map(row => [String((row && row.code) || "").toUpperCase(), String((row && row.candidate) || "")]));
    for (const code of CODES) {
      const ofCode = candidates.filter(candidate => candidate.code === code);
      if (ofCode.length) {
        const ranked = ofCode.slice().sort((a, b) => confidenceRank(b.confidence) - confidenceRank(a.confidence));
        if (ranked.length === 1) { chosen.set(code, ranked[0]); continue; }
        if (decisions && decisionFor.has(code)) {
          const candidate = ranked.find(row => row.id === decisionFor.get(code));
          if (candidate) chosen.set(code, candidate);
          else unknowns.push({ code, note: "the weighing pass rejected every candidate for this question" });
          continue;
        }
        chosen.set(code, ranked[0]);
        continue;
      }
      const heldCandidate = held.find(row => row.code === code && row.value !== "unknown");
      if (heldCandidate) { heldFor.set(code, heldCandidate); unknowns.push({ code, note: "operative text was located, but its source carries no qualifying date" }); continue; }
      unknowns.push({
        code,
        note: failedCodes.has(code) ? "the call for this question failed, so it was never read"
          : rejected.some(row => row.code === code) ? "a quoted reading was discarded because it could not be verified"
          : unknownReason.has(code) ? `the model read the supplied sources and reported no operative text: ${unknownReason.get(code)}`
          : "no supplied source stated anything operative"
      });
    }

    /* Answers, in the engine's own shape. */
    const sourceFor = code => { const candidate = chosen.get(code); return candidate ? pool.find(source => source.id === candidate.sourceId) : null; };
    const gapText = (code, note) => {
      if (failedCodes.has(code)) return `The call that would have read this record for ${code} did not complete (${failedCodes.get(code)}), so the question is UNKNOWN. That is a failed call, not a silent record: run the reading again to ask it.`;
      const heldCandidate = heldFor.get(code);
      if (heldCandidate) return `The linked model found operative text for ${code} at “${heldCandidate.title}” (${heldCandidate.url}), but that record carries no qualifying date on or before the cutoff, so nothing from it can be scored. Supply a dated artifact or a usable archive capture to use this reading.`;
      const base = `The linked model read the retrieved record for this cutoff and found no operative text for ${code}.`;
      const said = unknownReason.get(code);
      return `${base}${said ? ` It reported: “${said}”.` : ""} ${/discarded|verif/i.test(note) ? "A quoted reading was offered and discarded because it could not be verified against the stored source text." : "This is a statement about the retrieved record, not a proven negative."}`;
    };
    const readings = code => {
      const candidate = chosen.get(code);
      if (!candidate) { const row = unknowns.find(item => item.code === code); return { value: null, source: "", date: "", notes: "", gap: gapText(code, row ? row.note : "") }; }
      const source = sourceFor(code);
      return {
        value: candidate.value === "yes",
        source: source ? source.url : "",
        date: (source && citationDate(source)) || candidate.date || "",
        notes: candidate.quote,
        gap: candidate.value === "yes" ? "" : "Contrary operative text was located; inspect its scope before accepting this suggested NO."
      };
    };
    const constrained = code => {
      const candidate = chosen.get(code);
      if (!candidate) { const row = unknowns.find(item => item.code === code); return { value: false, source: "", date: "", notes: "", gap: gapText(code, row ? row.note : "") }; }
      const source = sourceFor(code);
      return {
        value: candidate.value === "yes",
        source: source ? source.url : "",
        date: (source && citationDate(source)) || candidate.date || "",
        notes: candidate.quote,
        gap: candidate.value === "yes" ? "" : "Operative text was located but it does not demonstrate this constraint; the check stays unmet."
      };
    };

    /* B4 / C2 structure, taken only from quoted text. */
    const b4Candidate = chosen.get("B4");
    const b4Source = b4Candidate ? sourceFor("B4") : null;
    const b4 = { actor: "", action: "", procedure: "", basis: "NOT_DEMONSTRATED", numerator: "", denominator: "", complete: false };
    if (b4Candidate && b4Candidate.value === "yes") {
      b4.actor = label(summaryB4.actor) || "Named in the cited refusal or appeal rule — confirm before use";
      b4.action = label(summaryB4.action) || "The action specified in the cited rule — confirm before use";
      b4.procedure = b4Candidate.quote;
      const basis = String(summaryB4.basis || "NOT_DEMONSTRATED").toUpperCase();
      if (basis === "TERMINAL_RULE" || basis === "NO_PENALTY_EXIT") b4.basis = basis;
      else if (basis === "RESOLVED_APPEALS" && b4Source && numbersInText(b4Source, summaryB4.numerator, summaryB4.denominator)) {
        b4.basis = "RESOLVED_APPEALS";
        b4.complete = summaryB4.complete === true;
        b4.numerator = String(summaryB4.numerator); b4.denominator = String(summaryB4.denominator);
        b4.start = G0.artifactDate(b4Source.published || b4Source.capturedAt) || "";
        b4.end = b4.start;
      } else if (basis === "RESOLVED_APPEALS") {
        notes.push("B4: the model described a relief record, but its figures were not found in the cited source, so B4 is left unqualified for v1.1.");
      }
    }
    const c2Candidate = chosen.get("C2");
    const c2Source = c2Candidate ? sourceFor("C2") : null;
    const c2 = { route: false, invoked: false, complete: false, numerator: "", denominator: "" };
    if (c2Candidate && c2Candidate.value === "yes") {
      c2.route = true;
      c2.invoked = summaryC2.invoked === true;
      if (c2Source && numbersInText(c2Source, summaryC2.numerator, summaryC2.denominator)) {
        c2.numerator = String(summaryC2.numerator); c2.denominator = String(summaryC2.denominator); c2.complete = summaryC2.complete === true;
      }
      c2.start = (c2Source && (c2Source.published || c2Source.capturedAt)) || "";
      c2.end = c2.start;
    }
    let external = null;
    for (const code of ["C1", "C4"]) {
      const candidate = chosen.get(code);
      const source = sourceFor(code);
      if (!candidate || candidate.value !== "yes" || !source || !["court", "regulatory"].includes(source.kind)) continue;
      external = { exists: true, exercised: true, holder: source.authority || "Named authority", scope: source.title, source: source.url, date: candidate.date };
      break;
    }

    /* Annotate the sources that carried a decision. */
    for (const [code, candidate] of chosen) {
      const source = pool.find(row => row.id === candidate.sourceId);
      if (source) source.codes = Array.from(new Set([...(source.codes || []), code]));
    }

    const sourcesRead = pack.packed.length + followUps.length;
    const charsRead = pack.totalChars + followUps.reduce((sum, item) => sum + LIMITS.perSource, 0);
    const reading = {
      version, cutoff, entity: target.name, at: new Date().toISOString(),
      block: {
        method: "llm-reading",
        provider: status.label || status.provider, model: model || status.model,
        endpoint: status.endpoint, generatedAt: new Date().toISOString(), reviewRequired: true,
        passes, sourcesRead, charsRead, verified: candidates.length,
        /* How the reading was staged: how many questions each call asked, the
           ceiling each call reserved, and what it cost when a call failed.
           A record that was read question by question says so. */
        staging: {
          codesPerCall: plan[0] ? plan[0].length : 0, questionsAsked: codes.length,
          ceilingPerCall: readCeiling(plan[0] ? plan[0].length : 1), weighed: contested.length, callsFailed, plannedCalls: unitsTotal,
          failedCodes: [...failedCodes.keys()],
          providerCeiling: (LLM.tokenCeiling && LLM.tokenCeiling() || {}).maxTokens || 0
        },
        rejected: rejected.slice(0, 40), held: held.slice(0, 40), unknowns, usage, followUps,
        candidates: candidates.map(candidate => ({ id: candidate.id, code: candidate.code, value: candidate.value, quote: candidate.quote.slice(0, 600), url: candidate.url, title: candidate.title, date: candidate.date, verified: true })),
        chosen: Object.fromEntries([...chosen].map(([code, candidate]) => [code, candidate.id])),
        note: "A linked model proposed these readings from the retrieved sources. Every quote was checked character-for-character against the stored text; unverifiable quotes were discarded and the question left UNKNOWN. A person must review each answer before it is relied on."
      },
      b4, c2, external,
      answers: G0.questions.map(question => readings(question.code)),
      constraints: G0.constraintQuestions.map(question => constrained(question.code)),
      candidates, chosen: Object.fromEntries([...chosen].map(([code, candidate]) => [code, candidate.id])),
      rejected, held, unknowns, notes, followUps, usage, passes, sourcesRead, charsRead,
      sources: pool, thinSources: pack.packed.filter(item => item.chars < 400).length, skippedSources: pack.skipped
    };
    if (callsFailed) noteOnce(notes, `${callsFailed} staged call${callsFailed === 1 ? "" : "s"} failed during this reading; the questions they carried were left UNKNOWN rather than guessed at.`);
    progress(5, `Read ${sourcesRead} record${sourcesRead === 1 ? "" : "s"} · ${candidates.length} quoted reading${candidates.length === 1 ? "" : "s"} verified · ${rejected.length} discarded · ${followUps.length} followed · ${passes} staged call${passes === 1 ? "" : "s"}${callsFailed ? ` · ${callsFailed} failed` : ""}`, 5);
    return reading;
  }

  /* ──────────────────────────────────────────────────────────────
     Applying a reading — never mutates the record it came from
     ────────────────────────────────────────────────────────────── */
  function mergeReading(input, reading, { applyCodes = null } = {}) {
    const next = JSON.parse(JSON.stringify(input));
    const take = code => !applyCodes || applyCodes.includes(code);
    next.answers = next.answers.map((answer, index) => take(G0.questions[index].code) ? { ...reading.answers[index] } : answer);
    next.constraints = next.constraints.map((answer, index) => take(G0.constraintQuestions[index].code) ? { ...reading.constraints[index] } : answer);
    if (take("B4")) next.b4 = { ...next.b4, ...reading.b4 };
    if (take("C2")) next.c2 = { ...next.c2, ...reading.c2 };
    if (reading.external && (take("C1") || take("C4"))) next.external = { ...next.external, ...reading.external };
    next.automation = { ...(next.automation || {}), reviewRequired: true, llm: reading.block };
    if (Array.isArray(reading.sources) && reading.sources.length) next.automation.sources = JSON.parse(JSON.stringify(reading.sources));
    return next;
  }

  /* One plain sentence for the interface: what the model changed, and how
     many separate calls it took to say it. */
  function summarise(reading) {
    const answered = reading.answers.filter(answer => answer.value !== null).length;
    const constraints = reading.constraints.filter(answer => answer.value === true).length;
    const staged = reading.passes > 1 ? ` in ${reading.passes} staged call${reading.passes === 1 ? "" : "s"}` : "";
    return `${reading.block.model || "The linked model"} read ${reading.sourcesRead} record${reading.sourcesRead === 1 ? "" : "s"}${staged} and produced ${reading.candidates.length} verified quote${reading.candidates.length === 1 ? "" : "s"}: ${answered} of 5 behavioral questions answered, ${constraints} of 4 constraints met, ${reading.rejected.length} reading${reading.rejected.length === 1 ? "" : "s"} discarded as unverifiable.`;
  }

  return {
    LIMITS, readSources, mergeReading, summarise, verifyQuote, numbersInText, packSources,
    linkCandidates, parseFindings, parseSummary, sourceText, isLead, citationDate, readable, normalize, label,
    /* the staged call plan — exposed so the interface and the tests can see
       exactly how many calls an audit will make, and what each one asks */
    allCodes, questionFor, questionChunks, questionBlock, readInstruction, weighInstruction, SYSTEM
  };
})();
