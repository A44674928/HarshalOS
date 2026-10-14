/* ════════════════════════════════════════════════════════════════════════
   Node harness: the LLM layer removal guard. Run:
     node --test tests/llm-removal-test.mjs

   This repository used to ship a model connection layer (js/llm.js), a
   Ground-0 reading pass (js/g0-llm.js), a provider preset UI
   (js/apps-llm.js), a same-origin Worker relay (worker/llm-relay.mjs), an
   outbound-spend ledger (worker/ai-neuron-ledger.mjs, migration 0014), and
   the suites, docs and bindings that served them. All of it was removed and
   the LLM Link tile was left as a shell that only says so.

   These assertions are the tripwire: they fail if a provider endpoint, a key
   store, a relay route, the AI binding, a removed module, or a restored
   Ground-0 reading control comes back. A failure here means the removal was
   undone somewhere, not that the test is stale.
   ════════════════════════════════════════════════════════════════════════ */
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { webcrypto } from "node:crypto";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const exists = file => stat(path.join(ROOT, file)).then(() => true, () => false);
const file = relative => readFile(path.join(ROOT, relative), "utf8");

/* Source trees that could carry a live model capability. Docs, archives, the
   printed book, and business prose are deliberately out of scope: they are a
   written record of what existed, not a capability that can be called. */
const LIVE_TREES = ["js", "worker", "scripts", "css"];

async function treeFiles(directory) {
  const output = [];
  for (const entry of await readdir(path.join(ROOT, directory), { withFileTypes: true })) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) output.push(...await treeFiles(relative));
    else if (entry.isFile()) output.push(relative);
  }
  return output;
}

/* ── the modules themselves are gone ─────────────────────────────────── */
test("removal: every module, route, migration and binding is gone", async () => {
  const removed = [
    "js/llm.js",
    "js/g0-llm.js",
    "worker/llm-relay.mjs",
    "worker/ai-neuron-ledger.mjs",
    "migrations/community/0014_ai_neuron_ledger.sql",
    "tests/llm-test.mjs",
    "tests/llm-authority-test.mjs",
    "tests/llm-relay-test.mjs",
    "tests/llm-workers-ai-test.mjs",
    "tests/g0-llm-diagnostics-test.mjs",
    "tests/ai-neuron-ledger-test.mjs",
    "docs/GROUND-0-LLM-RESEARCH.md",
    "docs/deployment/ZAI-FREE-TIER.md",
    "docs/deployment/GEMINI-FREE-TIER.md",
    "docs/deployment/WORKERS-AI-PROVIDER.md",
    "worker/|The LLM Relay|/|Role|.txt"
  ];
  for (const relative of removed) {
    assert.equal(await exists(relative), false, `${relative} is a removed file and must not come back`);
  }
});

test("removal: the page no longer loads a connection layer or a reading pass", async () => {
  const html = await file("index.html");
  assert.ok(!/js\/(?:g0-)?llm\.js/.test(html), "index.html must not load a model module");
  assert.ok(html.includes("js/apps-llm.js"), "the shell tile is still loaded so the removal is visible");
  const worker = await file("worker/index.mjs");
  assert.ok(!/handleLlmRelay/.test(worker), "the relay handler must not be imported");
  assert.ok(!/\/api\/llm/.test(worker), "the /api/llm route must not be mounted");
  for (const route of ["/api/llm", "/api/llm/status", "/api/llm/models"]) {
    assert.ok(!worker.includes(route), `${route} must not be routed`);
  }
});

test("removal: no Worker binding or preview switch can serve a model again", async () => {
  const config = await file("wrangler.jsonc");
  assert.ok(!/"ai"\s*:/.test(config), "the Workers AI binding must stay removed");
  assert.ok(!/LLM_RELAY_/.test(config), "the relay preview switches must stay removed");
  assert.ok(!/neuron/i.test(config), "the Neuron allowance must not be referenced");
  const staging = await file("wrangler.staging.jsonc");
  assert.ok(!/"ai"\s*:/.test(staging) && !/llm/i.test(staging), "the staging config stays clean too");
});

test("removal: a stored record can no longer claim a model reading", async () => {
  globalThis.window = globalThis;
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
  const store = new Map();
  globalThis.localStorage = {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key)
  };
  globalThis.document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };
  globalThis.URL.createObjectURL = () => "";
  globalThis.URL.revokeObjectURL = () => "";
  await import("../js/g0-engine.js");
  const G0 = globalThis.G0;

  const normalized = G0.normalizeAuditInput({
    name: "Example",
    automation: {
      method: "llm-reading",
      provider: "A linked model",
      reviewRequired: true,
      llm: { method: "llm-reading", verified: 4, trustedForAuthority: false, note: "the model read this" },
      sources: []
    }
  }, "1.0");
  assert.equal(normalized.automation.method, "public-lookup",
    "a record that claims a model reading is re-labelled as public lookup");
  assert.equal(normalized.automation.llm, undefined,
    "the model-reading block is dropped rather than hydrated back into the record");

  const serialized = JSON.stringify(normalized);
  assert.ok(!/llm/i.test(serialized), "nothing in a hydrated record may name a model reading");
});

/* ── no live provider surface is left in the shipped code ───────────── */
test("removal: shipped code holds no provider endpoint, key store, or model call", async () => {
  const files = [];
  for (const tree of LIVE_TREES) files.push(...await treeFiles(tree));
  /* The shell app is the one deliberate mention: it exists to report the removal. */
  const allowed = new Set(["js/apps-llm.js"]);
  const needles = [
    { pattern: /HOSLLM|G0LLM/, label: "a model connection global" },
    { pattern: /api\.anthropic\.com|api\.openai\.com|openrouter\.ai|generativelanguage\.googleapis\.com|api\.z\.ai/, label: "a model provider endpoint" },
    { pattern: /\/v1\/messages|\/chat\/completions/, label: "a chat completion path" },
    { pattern: /hos-llm|llm-settings|llm-stats|google-quota/, label: "a key or quota store" },
    { pattern: /ZAI_API_KEY|LLM_RELAY|ai_neuron_ledger/, label: "a removed relay or ledger reference" },
    { pattern: /api\/llm/, label: "the relay route" }
  ];
  const hits = [];
  for (const relative of files) {
    if (allowed.has(relative)) continue;
    const source = await file(relative);
    for (const { pattern, label } of needles) {
      if (pattern.test(source)) hits.push(`${relative} (${label})`);
    }
  }
  assert.deepEqual(hits, [], "remove these live model references, or move them into the removal record");
});

test("removal: Ground-0 has no model-reading controls left, and keeps its own work", async () => {
  const app = await file("js/g0-app.js");
  for (const action of ["readRecord", "readRecordSingle", "readArtifact", "applyReading", "openLlmLink", "includeReading", "useArtifactQuote"]) {
    assert.ok(!app.includes(action), `the ${action} control must be gone`);
  }
  assert.ok(!/readingPanel|artifactReadingPanel|readingDiagnosticsPanel|singleRequestPreflight/.test(app),
    "no reading panel may remain");
  assert.ok(!/llm/i.test(app), "js/g0-app.js must not mention a model layer at all");
  /* The removal must not have taken the deterministic audit path with it. */
  for (const keeps of ["automaticAudit", "renderThreeLaneView", "startWizard", "renderTemporal"]) {
    assert.ok(app.includes(keeps), `${keeps} is Ground-0's own work and must remain`);
  }
  const research = await file("js/g0-research.js");
  assert.ok(research.includes("readWithArchive"), "the public-page reader stays available to the evidence hydrator");
});

/* ── the shell says what it is ──────────────────────────────────────── */
test("removal: the LLM Link tile is a shell that discloses the removal and points at the manual path", async () => {
  globalThis.APPS = [];
  globalThis.window = globalThis;
  await import("../js/apps-llm.js");
  const app = globalThis.APPS.find(candidate => candidate.id === "llmlink");
  assert.ok(app, "the shell is still registered under the same id, so the desktop tile survives");
  assert.ok(/removed/i.test(app.desc), "the tile's own description says the capability is removed");

  const body = { innerHTML: "" };
  app.render(body, { toast() {} });
  assert.match(body.innerHTML, /REFUSED — REMOVED/, "the shell renders a refusal, not a connection form");
  for (const named of ["js/llm.js", "js/g0-llm.js", "worker/llm-relay.mjs", "0014_ai_neuron_ledger.sql"]) {
    assert.ok(body.innerHTML.includes(named), `the shell names the removed ${named} so the record is legible`);
  }

  /* One signpost, and only one. It is an anchor whose href is a real deep link
     into Ground-0, so it survives without the handler; it is also the only
     affordance the shell offers. A refused path should name the path that works. */
  const anchors = body.innerHTML.match(/<a\b/g) || [];
  assert.equal(anchors.length, 1, "the shell offers exactly one link, and it is the signpost");
  assert.match(body.innerHTML, /<a[^>]+href="#app=ground0"/, "the signpost deep-links the Ground-0 app");
  assert.match(body.innerHTML, /manual Ground-0 audit wizard/, "the signpost says what it opens");

  for (const field of ["<input", "<select", "<textarea", "<button", "<form", "fetch(", "localStorage", "XMLHttpRequest", "WebSocket"]) {
    assert.ok(!body.innerHTML.includes(field), `the shell must expose no ${field} control or path`);
  }

  /* Rendering must stay inert: the signpost's handler is only attached when the
     window api is present, and this fake api has no openApp — nothing may throw
     or be called just because the panel was drawn. */
  assert.doesNotThrow(() => app.render({ innerHTML: "" }, {}), "rendering the shell without a window api is inert");
});

test("removal: the shell file itself performs no I/O", async () => {
  const shell = await file("js/apps-llm.js");
  for (const call of ["fetch(", "XMLHttpRequest", "localStorage", "sessionStorage", "WebSocket", "navigator.sendBeacon"]) {
    assert.ok(!shell.includes(call), `the shell must not call ${call}`);
  }
  assert.ok(!/PROVIDERS|setKey|apiKey|endpoint\s*:/.test(shell), "the shell must carry no provider registry or key handling");
});

/* ── the removal is recorded, not just done ─────────────────────────── */
test("removal: the suites, scripts and the written record agree that the layer is gone", async () => {
  const pkg = JSON.parse(await file("package.json"));
  const scripts = Object.keys(pkg.scripts || {});
  assert.ok(!scripts.includes("test:llm") && !scripts.includes("test:relay"),
    "the model test suites must not be re-added to package.json");
  assert.ok(scripts.includes("test:llm-removal"), "this guard is wired into the npm scripts");
  assert.ok(!/llm-test|llm-relay-test|ai-neuron-ledger-test/.test(JSON.stringify(pkg.scripts)),
    "no npm script may point at a removed suite");

  const report = await file("scripts/integrity-report.mjs");
  assert.ok(!/llm-test\.mjs|g0-llm-diagnostics-test\.mjs|llm-relay-test\.mjs|ai-neuron-ledger-test\.mjs/.test(report),
    "the integrity report must not run removed suites");
  assert.ok(report.includes("llm-removal-test.mjs"), "the integrity report runs this guard");

  const record = await file("docs/REMOVED-LLM-LAYER.md");
  for (const named of ["js/llm.js", "js/g0-llm.js", "worker/llm-relay.mjs", "worker/ai-neuron-ledger.mjs", "0014_ai_neuron_ledger.sql", "apps-llm.js"]) {
    assert.ok(record.includes(named), `the removal record must name ${named}`);
  }
});

test("removal: the palace roster and its generated page no longer staff a relay", async () => {
  const palace = await file("scripts/palace-day.mjs");
  assert.ok(!/The LLM Relay/.test(palace), "the generated palace roster must not list the removed relay");
  const page = await file("docs/architecture/HARSHALS-PALACE.html");
  assert.ok(!/The LLM Relay/.test(page), "the committed palace page must be regenerated after the removal");
  const codex = await file("docs/architecture/NPC-CODEX.md");
  assert.ok(!/\| `\|The LLM Relay\|\.txt` \|/.test(codex), "the NPC codex must not roster a resident to a removed file");
  assert.ok(/Vacated post/.test(codex), "the codex keeps a note that the relay bedroom was vacated");
});
