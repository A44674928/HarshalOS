/* HarshalOS — The Grand Architecture consistency suite.

   Three things are checked here:
     1. the data module the desktop app renders is structurally sound;
     2. every canonical quantity anchor still appears verbatim in the update's
        canonical numbers card, so the app cannot silently drift from canon;
     3. the Book I library module states the same architecture, keeps its
        fiction provenance, and is indexed in the Collections catalog.

   Run: node --test tests/grand-architecture-test.mjs */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { buildBookLibrary } from "../scripts/book-library-index.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const CARD = "updates/2026-10-02/02-Frameworks/Grand-River-Flow-Model/CANONICAL-NUMBERS.md";
const MODULE_DOC = "docs/harshal-systems/modules/grand-architecture.md";

const cardText = await readFile(path.join(ROOT, CARD), "utf8");
const moduleText = await readFile(path.join(ROOT, MODULE_DOC), "utf8");
const appSource = await readFile(path.join(ROOT, "js/apps-grand.js"), "utf8");
const dataSource = await readFile(path.join(ROOT, "js/grand-architecture-data.js"), "utf8");

function loadDataModule() {
  const sandbox = { console, window: {} };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(dataSource, sandbox, { filename: "js/grand-architecture-data.js" });
  return sandbox.window.GRAND_ARCHITECTURE;
}

const GA = loadDataModule();

test("GA: the data module loads and publishes a frozen, versioned schema", () => {
  assert.ok(GA, "window.GRAND_ARCHITECTURE is published");
  assert.equal(GA.schema, "harshalos-grand-architecture-v1");
  assert.equal(Object.isFrozen(GA), true, "the published object is frozen");
  assert.equal(GA.meta.id, "grand-architecture");
  assert.equal(GA.meta.documentId, "GRAND-ARCHITECTURE-REF-20261002");
  assert.equal(GA.meta.canonicalNumbersPath, CARD, "the app names the card that governs its numbers");
  assert.equal(GA.meta.modulePath, MODULE_DOC, "the app names its Book I module");
});

test("GA: the architecture keeps its fiction provenance and authority disclaimer", () => {
  assert.equal(GA.meta.provenanceClass, "FICTION");
  assert.equal(GA.meta.statusTaxonomy, "NARRATIVE_ARCHITECTURE_MODULE");
  assert.equal(GA.meta.evidenceStatus, "NARRATIVE_SANDBOX");
  assert.match(GA.meta.authorityDisclaimer, /NO AUTHORITY EFFECT/);
  assert.match(GA.meta.boundary, /Not an engineering design/);
  assert.ok(GA.notClaims.length >= 6, "explicit non-claims are published");
  assert.ok(GA.notClaims.some(claim => /specs\/normative/.test(claim)), "one non-claim rules out normative promotion");
  assert.ok(GA.notClaims.some(claim => /source of legitimacy/i.test(claim)), "one non-claim rules out legitimacy generation");
});

test("GA: six layers, each addressed or explicitly unaddressed", () => {
  assert.equal(GA.layers.length, 6);
  // Array.from crosses the vm realm boundary; a raw vm array is not reference-equal.
  assert.deepEqual(Array.from(GA.layers.map(layer => layer.id)), ["GA-0", "GA-1", "GA-2", "GA-3", "GA-4", "GA-5"]);
  for (const layer of GA.layers) {
    assert.ok(layer.name && layer.subject && layer.role, `${layer.id} is described`);
    assert.ok(["FICTION", "DERIVATIVE_BUILD"].includes(layer.provenance), `${layer.id} carries a provenance class`);
    assert.ok(layer.addresses.length > 0, `${layer.id} names its addresses or states that it has none`);
    for (const address of layer.addresses) {
      if (address.startsWith("0•100•000•")) assert.match(address, /^0•100•000•\d{4}(?:–\d{4})? — .+$/, `${layer.id} address is in canonical form: ${address}`);
      else assert.match(address, /^no address — /, `${layer.id} states why it has no address`);
    }
  }
  const addressed = GA.layers.filter(layer => layer.provenance === "FICTION");
  assert.equal(addressed.length, 4, "the four setting layers carry provenance FICTION");
});

test("GA: seven invariants with stable IDs, no duplicate identifiers", () => {
  assert.equal(GA.invariants.length, 7);
  const ids = Array.from(GA.invariants.map(invariant => invariant.id));
  assert.deepEqual(ids, [
    "GA-INV-001", "GA-INV-002", "GA-INV-003", "GA-INV-004",
    "GA-INV-005", "GA-INV-006", "GA-INV-007"
  ]);
  assert.equal(new Set(ids).size, ids.length, "invariant IDs are unique");
  for (const invariant of GA.invariants) {
    assert.ok(invariant.name && invariant.text.length > 40, `${invariant.id} states a rule`);
    assert.equal(GA.invariantById(invariant.id).name, invariant.name, "lookup by ID returns the same invariant");
  }
  assert.match(GA.invariantById("GA-INV-001").text, /0•000•000•0000/, "scale-not-sovereignty keeps the Center Origin anchor");
  assert.match(GA.invariantById("GA-INV-003").text, /counted once/, "conservation invariant forbids double counting");
  assert.equal(GA.invariantById("GA-INV-999"), null, "unknown invariant IDs resolve to null");
});

test("GA: every canonical anchor figure appears verbatim in the canonical numbers card", () => {
  assert.equal(GA.canonicalAnchors.length, 20);
  const ids = GA.canonicalAnchors.map(anchor => anchor.id);
  assert.equal(new Set(ids).size, ids.length, "anchor IDs are unique");
  for (const anchor of GA.canonicalAnchors) {
    assert.match(anchor.id, /^GA-Q-\d{3}$/, `anchor ID shape: ${anchor.id}`);
    assert.ok(anchor.quantity && anchor.detail && anchor.status, `${anchor.id} is fully described`);
    assert.ok(
      cardText.includes(anchor.figure),
      `${anchor.id} figure "${anchor.figure}" must still appear in ${CARD}`
    );
  }
  assert.equal(GA.anchorById("GA-Q-008").figure, "73 km³", "the reservoir volume anchor is the card's planning volume");
  assert.equal(GA.anchorById("GA-Q-017").figure, "80 million", "the city target anchor is the card's 2100 target");
  assert.match(GA.anchorById("GA-Q-018").status, /never added/i, "the Book II regional figure may not be added to the city total");
  assert.equal(GA.anchorById("GA-Q-999"), null, "unknown anchor IDs resolve to null");
});

test("GA: the address registry keeps the render spec's instance count and the ℤ₃₆₀ correction", () => {
  assert.equal(GA.addressRegistry.form, "0•100•000•NNNN");
  assert.equal(GA.addressRegistry.distinctInstances, 358);
  assert.equal(GA.addressRegistry.tiers.length, 3);
  assert.match(GA.addressRegistry.precisionNote, /instance field/);
  assert.match(GA.addressRegistry.precisionNote, /DDD ∈ \[000, 359\]/);
  assert.match(GA.addressRegistry.precisionNote, /never a 361st address slot/);
  const tierSum = GA.addressRegistry.tiers.reduce((sum, tier) => sum + parseInt(tier.nodes.replace(/[^0-9]/g, ""), 10), 0);
  assert.equal(tierSum, GA.addressRegistry.tierDenominator, "tier counts reconcile to the stated 360-slot denominator");
  assert.equal(GA.addressRegistry.tierDenominator, 360, "tier denominator is the 360-slot counter, not the 358 instances");
  assert.match(GA.addressRegistry.tierBasis, /not a count of the 358 named instances/);
  assert.ok(!GA.addressRegistry.tiers.some(tier => /\+/.test(tier.nodes)), "tier counts carry no lower-bound '+' that breaks the sum");
  assert.match(GA.anchorById("GA-Q-012").detail, /59\.80 GW gross, 53\.82 GW at 90%/, "GA-Q-012 states both values on one basis");
  assert.match(GA.anchorById("GA-Q-012").detail, /299\.01 GW gross, 269\.11 GW at 90%/, "GA-Q-012 high-flow pair is on one basis");
});

test("GA: the timeline keeps 2046 as a target, 2098 as interim, and assigns no final completion", () => {
  assert.equal(GA.timeline.length, 5);
  const joined = GA.timeline.map(step => `${step.window} ${step.marker} ${step.status}`).join(" ");
  assert.match(joined, /circa 2046/);
  assert.match(joined, /2098 is an interim commissioning and expansion milestone, not final completion/);
  assert.match(joined, /No final completion date is assigned/);
  assert.ok(!/finally complete|construction complete/i.test(joined), "no completion claim is asserted");
});

test("GA: the Book I module states the same architecture and its boundary", () => {
  assert.match(moduleText, /^# The Grand Architecture/m);
  assert.match(moduleText, /provenance_class: `FICTION`/);
  assert.match(moduleText, /status_taxonomy: `NARRATIVE_ARCHITECTURE_MODULE`/);
  assert.match(moduleText, /evidence_status: `NARRATIVE_SANDBOX`/);
  for (const invariant of GA.invariants) {
    assert.ok(moduleText.includes(invariant.id), `the module states ${invariant.id}`);
    assert.ok(moduleText.includes(invariant.name), `the module names ${invariant.id} — ${invariant.name}`);
  }
  for (const layer of GA.layers) {
    assert.ok(moduleText.includes(layer.id), `the module states layer ${layer.id}`);
  }
  assert.match(moduleText, /The architecture \(Book I\) is the library\. The novel \(Book II\) is the work\nin active production\./);
  assert.ok(moduleText.includes(CARD.split("/").pop()), "the module cites the canonical numbers card");
  const quoted = ["2.190632 m³/s", "41.76 MW", "942.721 m³/s", "17.96 GW", "73 km³", "169 days", "5.69 GW", "5.12 GW", "9.12 GW", "990.88 GW", "1,200–2,500 ft"];
  for (const figure of quoted) {
    assert.ok(moduleText.includes(figure), `the module quotes the card's ${figure}`);
    assert.ok(cardText.includes(figure), `${figure} is the card's own wording`);
  }
});

test("GA: the module is indexed exactly once in the Collections catalog", async () => {
  const { manifest, documents } = await buildBookLibrary(ROOT);
  const entries = documents.filter(document => document.file === "modules/grand-architecture.md");
  assert.equal(entries.length, 1, "the module is catalogued exactly once");
  const [entry] = entries;
  assert.equal(entry.kind, "module");
  assert.equal(entry.collectionId, "07-companion-fiction-and-corpus");
  assert.equal(entry.provenance, "FICTION");
  assert.equal(entry.status, "NARRATIVE_ARCHITECTURE_MODULE");
  assert.equal(entry.evidence, "NARRATIVE_SANDBOX");
  assert.equal(entry.title, "The Grand Architecture — Convergence-Era Infrastructure Architecture Module");
  assert.equal(entry.url, "/book-library/harshal-systems/modules/grand-architecture.md");
  /* The catalog's word figure is the count stated in the Collection VII row,
     which follows the repository's `wc -w` convention. A whitespace-token split
     also counts punctuation-only tokens ("—", "·", "→"), so the two counters
     legitimately differ; the contract is that the row and the catalog agree. */
  assert.equal(entry.words, 1732, "the catalog carries the collection row's stated word count");
  assert.ok(moduleText.split(/\s+/).filter(Boolean).length > 1600, "the module on disk is substantial");
  assert.ok(manifest.documentCount >= 42 && manifest.moduleCount >= 32, "the catalog grew to include the new module");
});

test("GA: the desktop app is read-only and renders from the data module alone", () => {
  assert.match(appSource, /id: "grand-architecture"/);
  assert.match(appSource, /window\.GRAND_ARCHITECTURE/);
  for (const forbidden of ["HOS.request", "HOS.demoAttest", "HOS.transition", "HOS.record", "HOS.revoke", "HOS.closeSession", "localStorage", "fetch("]) {
    assert.equal(appSource.includes(forbidden), false, `the app must not call ${forbidden}`);
  }
  assert.match(appSource, /escapeHtml/, "rendered data is escaped before display");
  assert.match(dataSource, /window\.GRAND_ARCHITECTURE = GRAND_ARCHITECTURE;/, "the data module follows the repository's global convention");
  assert.equal(/window\.(HOS|kernel)\b/.test(dataSource), false, "the data module touches no authority API");
});
