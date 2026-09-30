/* Node harness: Ground-0 research helpers + optional live smoke test. Run: node scripts/g0-research-test.mjs */
import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";

globalThis.window = globalThis;
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ?? null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
globalThis.document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };

await import("../js/g0-engine.js");
await import("../js/g0-research.js");
const G0 = globalThis.G0, R = globalThis.G0Research;

let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) pass++; else { fail++; console.error("  ✗ FAIL:", name); } };

/* ── entity mention detection ── */
ok(R.mentionsEntity("The court vacated Acme Corp's directive today.", "Acme Corp"), "full name mention");
ok(!R.mentionsEntity("Unrelated text about another company entirely.", "Acme Corp"), "no false mention");
ok(R.mentionsEntity("Acme and Corp in separate places", "Acme Corp") === true, "word-wise mention requires all significant words");
ok(!R.mentionsEntity("The Group met yesterday", "The Group Holdings"), "ignored corporate suffixes don't count");

/* ── external override quote gate: only operative source wording ── */
const courtRecord = { scoreable: true, named: true, kind: "court", claim: "The court vacated Acme Corp's enforcement directive. The petition is denied in all other respects.", url: "https://www.courtlistener.com/x", published: "2026-01-01" };
ok(R.externalOverrideQuote(courtRecord, "Acme Corp") !== null, "operative vacatur sentence qualifies");
const deniedRecord = { ...courtRecord, claim: "Acme Corp requested relief; the motion was denied. Nothing was vacated." };
ok(R.externalOverrideQuote(deniedRecord, "Acme Corp") === null, "requests and denials never qualify");
const newsRecord = { ...courtRecord, kind: "news" };
ok(R.externalOverrideQuote(newsRecord, "Acme Corp") === null, "news never activates an override test");
const captionOnly = { ...courtRecord, claim: "" };
ok(R.externalOverrideQuote(captionOnly, "Acme Corp") === null, "caption match without claim text never qualifies");

/* ── policy link discovery ── */
const md = "Welcome. [Terms of Service](/terms) · [Appeals](https://example.org/appeal) · [Careers](/jobs) · [Logo](/img.png) · [Policy](https://web.archive.org/web/20260101000000/https://example.org/policy) · [Dispute Resolution](/dispute) · [Acceptable Use Policy](/aup)";
const links = R.policyLinks(md, "https://example.org/");
ok(links.includes("https://example.org/terms") && links.includes("https://example.org/appeal"), "terms and appeal links discovered");
ok(!links.some(l => l.includes("/jobs")), "unrelated links skipped");
ok(!links.some(l => l.endsWith(".png")), "asset links skipped");
ok(links.includes("https://example.org/policy"), "wayback-wrapped link resolved to its original target");
ok(links.includes("https://example.org/dispute") && links.includes("https://example.org/aup"), "dispute procedures and acceptable-use policies are governing documents");

/* ── unknown suggested answers export as UNKNOWN, not NO ── */
const summary = R.plainResearchSummary({
  organization: { name: "Acme Corp" },
  input: { version: "1.1", cutoff: "2026-09-12", answers: [
    { value: null, source: "", date: "", notes: "", gap: "No dated artifact matched." },
    { value: true, source: "https://example.org/t", date: "2026-01-01", notes: "Participation is voluntary and non-binding.", gap: "" },
    { value: null, source: "", date: "", notes: "", gap: "No dated artifact matched." },
    { value: null, source: "", date: "", notes: "", gap: "No dated artifact matched." },
    { value: null, source: "", date: "", notes: "", gap: "No dated artifact matched." }
  ] },
  coverage: [], sources: [], warnings: [],
  record: { badge: "Unissued", phase: "AMBIGUOUS", confidence: "NONE", finding: "Provisional.", workingBadge: { label: "CWO — default, unproven", filled: 1, explanation: "One question evidenced." } }
});
ok(summary.includes("UNKNOWN — not demonstrated"), "the plain summary marks missing demonstrations UNKNOWN, not NO");
ok(summary.includes("\nYES\n") || summary.includes("YES\nParticipation"), "an evidenced YES still reads YES");

/* ── registry labels ── */
ok(Object.keys(R.registryLabels).length === 5, "five registries labelled with scope + source");

/* ── research/engine API contract ── */
const researchCode = await readFile(new URL("../js/g0-research.js", import.meta.url), "utf8");
for (const key of new Set([...researchCode.matchAll(/\bG0\.(\w+)/g)].map(match => match[1]))) {
  ok(key in G0, `research dependency G0.${key} is exported by the real engine`);
}

/* ── complete automatic audits with dated sources (no live network) ── */
const originalFetch = globalThis.fetch;
const cutoff = G0.today();
const organization = { name: "Acme Corp", identifier: "Q123", website: "https://example.org/", articleUrl: "https://en.wikipedia.org/wiki/Acme_Corp", description: "An example organization." };
const options = () => ({ name: organization.name, version: "1.0", cutoff, existing: [], signal: new AbortController().signal, onProgress() {} });
const json = data => new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
const unexpectedRequests = [];
try {
  globalThis.fetch = async value => {
    const url = new URL(value);
    if (url.hostname === "r.jina.ai") return json({ data: { title: "Acme Corp policy", url: organization.website, publishedTime: cutoff, content: "Participation is voluntary and non-binding. These advisory recommendations describe the organization's public policy and do not impose any obligation on participants." } });
    if (url.hostname === "www.courtlistener.com") return json({ results: url.searchParams.get("type") === "o" ? [{ caseName: "Acme Corp v Agency", dateFiled: cutoff, absolute_url: "/opinion/123/acme/", court: "Example Court", snippet: "The court vacated Acme Corp's enforcement directive." }] : [] });
    if (url.hostname === "www.federalregister.gov") return json({ results: [] });
    if (url.hostname === "www.govtrack.us") return json({ objects: [] });
    if (url.hostname === "api.gdeltproject.org") return json({ articles: [] });
    unexpectedRequests.push(value);
    throw new Error(`Unexpected fixture request: ${value}`);
  };
  const result = await R.automaticAudit({ ...options(), selection: organization, availability: { enabled: false } });
  ok(result.method === "public-lookup" && result.record.badge === "Unissued", "public automatic audit completes as an unissued draft");
  ok(result.input.answers[1].value === true, "dated official policy on the inclusive cutoff supplies B2 evidence");
  ok(result.input.constraints[0].value === true && result.input.constraints[3].value === true, "dated named court record supplies operative override evidence");
  ok(result.record.report.Research_Sources.some(source => source.kind === "court" && source.Cutoff_Status.startsWith("DATED BEFORE CUTOFF")), "dated court source reaches the research report");
  ok(!result.warnings.some(warning => warning.includes("is not a function")), "official-page helper errors are not swallowed as coverage warnings");

  // Hosted answers and report annotations must use the same inclusive cutoff.
  const dates = [cutoff, "9999-12-31", null, "2026-02-30", "2000-01-01"];
  const sources = dates.map((published, i) => ({ title: `Policy ${i}`, url: `https://example.org/policy-${i}`, kind: "official", published }));
  globalThis.fetch = async url => {
    if (url !== "/api/research") throw new Error(`Unexpected hosted request: ${url}`);
    return json({ organization, sources, answers: sources.map(source => ({ value: true, source: source.url, date: source.published, notes: "Participation is voluntary and non-binding." })), constraints: Array.from({ length: 4 }, () => ({})) });
  };
  const hosted = await R.automaticAudit({ ...options(), availability: { enabled: true } });
  ok(hosted.input.answers.map(answer => answer.value).join() === "true,,,,true", "hosted audit accepts cutoff-day and older evidence, rejects future, missing and invalid dates");
  ok(hosted.record.report.Research_Sources[1].Cutoff_Status === "AFTER CUTOFF — NOT SCORED", "future-dated hosted source remains unscored in report");
  ok(hosted.record.report.Research_Sources[2].Cutoff_Status === "DATE NOT DEMONSTRATED — NOT SCORED", "undated hosted source remains unscored in report");
} catch (error) {
  ok(false, `automatic audit regression: ${error.stack}`);
} finally {
  globalThis.fetch = originalFetch;
}
ok(unexpectedRequests.length === 0, "public audit only uses expected fixture endpoints");

/* ── live smoke test (network permitting; not a pass/fail gate) ── */
const live = process.argv.includes("--live");
if (live) {
  console.log("\n— live smoke test —");
  const controller = new AbortController();
  try {
    const orgs = await R.lookupOrganizations("World Health Organization", controller.signal);
    console.log("  identity:", orgs.map(o => `${o.name} (${o.identifier}) ${o.website}`).join(" | ") || "none");
    const registries = await R.searchPublicRegistries("World Health Organization", "2026-06-30", controller.signal);
    for (const o of registries.outcomes || []) console.log(`  ${o.registry}: ${o.status}`);
    console.log("  records:", registries.records.length, "| gaps:", registries.gaps.length);
  } catch (e) {
    console.log("  live test skipped/failed (sandbox network):", e.message);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
