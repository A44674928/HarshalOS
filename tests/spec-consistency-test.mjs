/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Specification-Consistency & Semantic Drift Test Suite
   Verifies that the canonical formal contract (specs/normative/canonical-model.md
   and specs/normative/canonical.json), the contradiction ledger
   (specs/normative/contradictions.md), the runtime kernel/Ground-0
   implementations (js/data.js, js/kernel.js, js/g0-engine.js), README.md,
   and all 29 component files in docs/harshal-systems/ agree with one another.
   ═══════════════════════════════════════════════════════════════ */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import { TextEncoder } from "node:util";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

const canonicalJsonRaw = await readFile(path.join(ROOT, "specs/normative/canonical.json"), "utf8");
const canonical = JSON.parse(canonicalJsonRaw);
const canonicalModelMd = await readFile(path.join(ROOT, "specs/normative/canonical-model.md"), "utf8");
const contradictionsMd = await readFile(path.join(ROOT, "specs/normative/contradictions.md"), "utf8");
const g0v10Md = await readFile(path.join(ROOT, "specs/normative/ground-0-v1.0.md"), "utf8");
const g0v11Md = await readFile(path.join(ROOT, "specs/normative/ground-0-v1.1.md"), "utf8");
const readmeMd = await readFile(path.join(ROOT, "README.md"), "utf8");
const part02Md = await readFile(path.join(ROOT, "docs/harshal-systems/02-formalization.md"), "utf8");
const part05Md = await readFile(path.join(ROOT, "docs/harshal-systems/05-ocm-orb.md"), "utf8");
const part09Md = await readFile(path.join(ROOT, "docs/harshal-systems/09-disc-lifecycle.md"), "utf8");
const part12Md = await readFile(path.join(ROOT, "docs/harshal-systems/12-ground-zero.md"), "utf8");
const part27Md = await readFile(path.join(ROOT, "docs/harshal-systems/27-whole-corpus.md"), "utf8");

async function loadRuntime() {
  const sandbox = {
    console,
    crypto: webcrypto,
    Date,
    TextEncoder,
    setInterval: () => 1,
    clearInterval: () => {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
  };
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  for (const file of ["js/crypto.js", "js/data.js", "js/kernel.js", "js/g0-engine.js", "js/core-book-reader.js"]) {
    const source = await readFile(path.join(ROOT, file), "utf8");
    vm.runInContext(source, sandbox, { filename: file });
  }
  await sandbox.HOS.ready;
  return sandbox;
}

const runtime = await loadRuntime();

test("P0: canonical pipeline & Decision gate (Permit | Refuse) are defined and unambiguous", () => {
  assert.equal(canonical.schema, "harshalos-canonical-model-v1");
  assert.deepEqual(canonical.pipeline, [
    "Identity",
    "Representation",
    "Authorization",
    "Continuity",
    "Accountability",
    "Decision"
  ]);
  assert.deepEqual(canonical.prerequisites, [
    "Identity",
    "Representation",
    "Authorization",
    "Continuity",
    "Accountability"
  ]);
  assert.equal(canonical.decision.stage, "Decision");
  assert.deepEqual(canonical.decision.outcomes, ["Permit", "Refuse"]);
  assert.equal(canonical.decision.default_outcome, "Refuse");
  assert.deepEqual(Array.from(runtime.DATA.canonicalPipeline), canonical.pipeline);
  assert.ok(canonicalModelMd.includes("├─ Permit") && canonicalModelMd.includes("└─ Refuse"));
  assert.ok(part02Md.includes("├─ Permit") && part02Md.includes("└─ Refuse"));
  assert.ok(readmeMd.includes("Identity → Representation → Authorization → Continuity → Accountability → Decision (Permit | Refuse)"));
});

test("P0: canonical symbols exist with zero symbol overloading (A = Addressability, K = Accountability)", () => {
  const expectedKeys = ["I", "H", "A", "R", "V", "C", "K", "U_solv", "S", "L", "tau", "delta", "x"];
  for (const key of expectedKeys) {
    assert.ok(canonical.symbols[key], `missing canonical symbol definition: ${key}`);
  }

  // Ensure no duplicate canonical_name or symbol strings
  const symbols = Object.values(canonical.symbols).map(s => s.symbol);
  const names = Object.values(canonical.symbols).map(s => s.canonical_name);
  assert.equal(new Set(symbols).size, symbols.length, "no duplicate symbol strings in canonical.json");
  assert.equal(new Set(names).size, names.length, "no duplicate canonical symbol names in canonical.json");

  // Explicitly verify A vs K disambiguation
  assert.equal(canonical.symbols.A.canonical_name, "Addressability");
  assert.equal(canonical.symbols.K.canonical_name, "Accountability");
  assert.equal(runtime.DATA.canonicalSymbols.A, "Addressability");
  assert.equal(runtime.DATA.canonicalSymbols.K, "Accountability");
  assert.doesNotMatch(
    part02Md,
    /5\.\s+\*\*Accountability\s+\(`A\s*∈/,
    "Part II must not use symbol A for Accountability"
  );
  assert.match(
    part02Md,
    /5\.\s+\*\*Accountability\s+\(`K\(t\)\s*∈\s*\{0,1\}`\)\*\*/,
    "Part II uses K(t) for Accountability"
  );
});

test("P0: README equation, demo kernel equation, and Part II equation match the canonical legitimacy equation", () => {
  const canonicalEq = canonical.equations.canonical_legitimacy;
  assert.equal(canonicalEq, "L(t) = H(t) × f(A(t), R(t), S(t))");

  const kernelSource = vm.runInContext("HOS", runtime);
  assert.equal(kernelSource.TAU, canonical.constants.TAU);
  assert.equal(kernelSource.DELTA_MAX, canonical.constants.DELTA_MAX);
  assert.equal(kernelSource.SMAX, canonical.constants.SMAX);
  assert.equal(kernelSource.CENTER, canonical.origin_anchor);
  assert.equal(kernelSource.CREATOR_ID, canonical.creator_id);
  assert.equal(kernelSource.CREATOR_ID_FORMULA, canonical.creator_id_formula);

  assert.ok(readmeMd.includes(canonicalEq), "README.md states the canonical legitimacy equation");
  assert.ok(part02Md.includes(canonicalEq), "Part II states the canonical legitimacy equation");
  assert.ok(canonicalModelMd.includes(canonicalEq), "canonical-model.md states the canonical legitimacy equation");

  // Verify every equation variant is explicitly classified
  assert.deepEqual(canonical.equations.classifications, {
    "L(t) = H(t) × f(A(t), R(t), S(t))": "CANONICAL_FORM",
    "L(t) = H(t) × C(t) × K(t) × f(A(t), R(t), S(t))": "EXPANDED_CANONICAL_FORM",
    "L(t) = H(t) × A(t) × R(t) × S(t)": "IMPLEMENTATION_APPROXIMATION",
    "L(S,t) = A · R · V(S,t)": "HISTORICAL_BOOLEAN_FORM"
  });

  // Verify Continuity C(t) is defined as an upstream condition
  assert.equal(canonical.symbols.C.role, "upstream_condition");
  assert.ok(canonicalModelMd.includes("If H(t) = 0  or  C(t) = 0  or  K(t) = 0   ⇒   L(t) = 0"));
});

test("P0: Human Key semantics and Accountability decomposition are formalized", () => {
  assert.deepEqual(canonical.human_key_semantics.verification_categories, [
    "cryptographically verifiable",
    "system-observable",
    "externally attested",
    "assumed",
    "not technically provable"
  ]);
  const propNames = canonical.human_key_semantics.properties.map(p => p.property);
  assert.deepEqual(propNames, [
    "Human Identity",
    "Key Possession",
    "Liveness",
    "Authorization/Consent Attestation",
    "Representation Integrity"
  ]);
  for (const category of canonical.human_key_semantics.verification_categories) {
    assert.ok(canonicalModelMd.includes(category), `canonical-model.md includes verification category: ${category}`);
  }

  const accNames = canonical.accountability_decomposition.map(a => a.name);
  assert.deepEqual(accNames, [
    "Technical Attribution",
    "Operational Accountability",
    "Legal Responsibility",
    "Institutional Solvency"
  ]);
  const solvency = canonical.accountability_decomposition.find(a => a.id === "U_solv");
  assert.equal(solvency.separate_from_runtime_gate, true);
});

test("P1: OCM routing claims, Resolution Axis invariant, Emergency legitimacy, Scope, and Failure crosswalk agree", () => {
  // OCM Option A + Option B + Resolution Axis
  assert.equal(canonical.ocm_routing.option_a_routing_cost.metric, "Cost_resolution < Cost_lateral");
  assert.equal(
    canonical.ocm_routing.resolution_axis_invariant,
    "Resolution is an authority-resolution mechanism, not an authority source."
  );
  assert.deepEqual(canonical.ocm_routing.distinct_operations, [
    "Resolve legitimacy",
    "Transmit legitimacy state",
    "Interrupt execution",
    "Execute an operation",
    "Generate legitimacy"
  ]);
  assert.ok(canonicalModelMd.includes(canonical.ocm_routing.resolution_axis_invariant));
  assert.ok(part05Md.includes(canonical.ocm_routing.resolution_axis_invariant));

  // Emergency legitimacy
  assert.equal(canonical.emergency_legitimacy.rule, "Emergency conditions never generate legitimacy.");
  assert.ok(canonicalModelMd.includes("Emergency conditions never generate legitimacy."));
  assert.ok(part09Md.includes("Emergency conditions never generate legitimacy."));

  // Disc lifecycle & Cross-layer failure crosswalk
  assert.deepEqual(canonical.disc_lifecycle, [
    "Nonexistent",
    "Specified",
    "Created",
    "Attached",
    "Active",
    "Delegating",
    "Interrupted",
    "Active",
    "Expired",
    "Terminated"
  ]);
  for (const row of canonical.cross_layer_failure_semantics) {
    assert.ok(canonicalModelMd.includes(row.failure_state), `canonical-model.md includes failure state ${row.failure_state}`);
    assert.ok(part09Md.includes(row.failure_state), `09-disc-lifecycle.md includes failure state ${row.failure_state}`);
  }
});

test("P1: Ground-0 DeclaredPhase and DetectedPhase enums match across canonical.json, DATA, G0 engine, PDH, and specs", () => {
  assert.deepEqual(canonical.declared_phases, ["NAB", "CWO", "GSRB"]);
  assert.deepEqual(canonical.detected_phases, [
    "NAB",
    "CWO",
    "NAB-Constrained",
    "GSRB",
    "AMBIGUOUS",
    "INCOHERENT"
  ]);
  assert.deepEqual(canonical.diagnostic_classification_states, ["AMBIGUOUS", "INCOHERENT"]);

  // JS DATA & G0 engine agreement
  assert.deepEqual(Object.keys(runtime.DATA.phases), canonical.declared_phases);
  assert.deepEqual(Array.from(runtime.DATA.declaredPhases), canonical.declared_phases);
  assert.deepEqual(Array.from(runtime.DATA.detectedPhases), canonical.detected_phases);
  assert.deepEqual(Array.from(runtime.G0.DECLARED_PHASES), canonical.declared_phases);
  assert.deepEqual(Array.from(runtime.G0.DETECTED_PHASES), canonical.detected_phases);
  assert.deepEqual(Object.keys(runtime.G0.plainPhase), canonical.detected_phases);
  assert.deepEqual(Object.keys(runtime.G0.spokenPhase), canonical.detected_phases);

  // Reclassification vs Transition invariants
  for (const rule of canonical.phase_events.invariants) {
    assert.ok(canonicalModelMd.includes(rule), `canonical-model.md includes rule: ${rule}`);
    assert.ok(part12Md.includes(rule), `12-ground-zero.md includes rule: ${rule}`);
  }

  // v1.0 normative baseline vs v1.1 ratified normative amendment
  assert.ok(g0v10Md.includes("Ground-0 Phase Detection Algorithm"));
  assert.ok(g0v11Md.includes("Ratified normative amendment, adopted 2026-10-14"));
  assert.ok(g0v11Md.includes("NORMATIVE AMENDMENT / RATIFIED"));
});

test("P2: all 29 corpus component files carry valid stable interface headers and form an acyclic dependency graph", async () => {
  assert.equal(canonical.components.length, 29);
  const byId = new Map(canonical.components.map(c => [c.id, c]));
  assert.equal(byId.size, 29, "every component has a unique id");

  for (const comp of canonical.components) {
    const filePath = path.join(ROOT, "docs/harshal-systems", `${comp.slug}.md`);
    const content = await readFile(filePath, "utf8");
    const { metadata } = runtime.CoreBookReader.parseFrontMatter(content);

    for (const requiredField of [
      "id",
      "canonical_name",
      "depends_on",
      "defines",
      "uses",
      "invariants",
      "conflicts_with",
      "status"
    ]) {
      assert.ok(requiredField in metadata, `${comp.slug}.md frontmatter has ${requiredField}`);
    }
    assert.equal(metadata.id, comp.id);
    assert.equal(metadata.canonical_name, comp.canonical_name);
    assert.equal(metadata.status, comp.status);
    assert.deepEqual(JSON.parse(metadata.depends_on), comp.depends_on);
    assert.deepEqual(JSON.parse(metadata.defines), comp.defines);
    assert.deepEqual(JSON.parse(metadata.uses), comp.uses);
    assert.deepEqual(JSON.parse(metadata.invariants), comp.invariants);
    assert.deepEqual(JSON.parse(metadata.conflicts_with), comp.conflicts_with);

    for (const dep of comp.depends_on) {
      assert.ok(byId.has(dep), `${comp.id} depends_on known component ${dep}`);
      assert.notEqual(dep, comp.id, `${comp.id} does not depend on itself`);
    }
  }

  // Verify DAG (no cycles in depends_on)
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visited.has(id)) return;
    assert.equal(visiting.has(id), false, `dependency cycle detected at ${id}`);
    visiting.add(id);
    for (const dep of byId.get(id).depends_on) visit(dep);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of byId.keys()) visit(id);
});

test("P2: Part 27 obeys the generative synthesis contract (no ungrounded invariants)", () => {
  const upstreamInvariants = new Set();
  for (const comp of canonical.components) {
    if (comp.slug !== "27-whole-corpus") {
      for (const inv of comp.invariants) upstreamInvariants.add(inv);
    }
  }
  // Also include invariants defined in specs/normative/canonical-model.md
  for (const match of canonicalModelMd.matchAll(/\bINV-[A-Z0-9-]+\b/g)) {
    upstreamInvariants.add(match[0]);
  }

  const p27Comp = canonical.components.find(c => c.slug === "27-whole-corpus");
  assert.ok(p27Comp);
  for (const inv of p27Comp.invariants) {
    assert.ok(
      upstreamInvariants.has(inv),
      `Part 27 invariant ${inv} must exist in Parts 01–26 or specs/normative/canonical-model.md`
    );
  }
  assert.ok(part27Md.includes("27 must not introduce a new invariant absent from 01–26"));
  assert.ok(part27Md.includes("27 may synthesize, reorder, narrativize, or instantiate existing invariants."));
});

test("P3: Contradiction ledger tracks all resolved semantic collisions (CL-001 through CL-014)", () => {
  assert.equal(canonical.contradictions.length, 14);
  for (const id of canonical.contradictions) {
    assert.match(contradictionsMd, new RegExp(`\\|\\s*\`${id}\`\\s*\\|`), `contradictions.md documents ${id}`);
  }
  assert.doesNotMatch(contradictionsMd, /\|\s*`OPEN`\s*\|/, "all tracked P0–P3 contradictions are resolved");
});
