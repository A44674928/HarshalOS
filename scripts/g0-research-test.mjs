/* Node harness: Ground-0 research helpers + optional live smoke test. Run: node scripts/g0-research-test.mjs */
import { webcrypto } from "node:crypto";

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
const md = "Welcome. [Terms of Service](/terms) · [Appeals](https://example.org/appeal) · [Careers](/jobs) · [Logo](/img.png) · [Policy](https://web.archive.org/web/20260101000000/https://example.org/policy)";
const links = R.policyLinks(md, "https://example.org/");
ok(links.includes("https://example.org/terms") && links.includes("https://example.org/appeal"), "terms and appeal links discovered");
ok(!links.some(l => l.includes("/jobs")), "unrelated links skipped");
ok(!links.some(l => l.endsWith(".png")), "asset links skipped");
ok(links.includes("https://example.org/policy"), "wayback-wrapped link resolved to its original target");

/* ── registry labels ── */
ok(Object.keys(R.registryLabels).length === 5, "five registries labelled with scope + source");

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
