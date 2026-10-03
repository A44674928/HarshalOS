/* Guards scripts/pine/ against drifting from the shipped indicator code.

   The Pine source files are not in this repository — only their JavaScript
   translation is. These documents are therefore reconstructions, and the one
   thing that can be checked mechanically is that their parameter tables, the
   Pine code fences, and the provenance banners agree with
   js/good-intelligence-market-context.js as it actually ships. */

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PINE_DIR = path.join(ROOT, "scripts", "pine");
const SITE = path.join(ROOT, ".site-assets");

const DOCUMENTS = ["01-vfi-fibonacci-bands.md", "02-wavetrend.md"];

/* Execute the real browser module the same way the other Good Intelligence
   suites do, so DEFAULTS below is the shipped object, not a copy. */
const portSource = await readFile(path.join(ROOT, "js", "good-intelligence-market-context.js"), "utf8");
const context = vm.createContext({ window: {}, Date, Math, Number, JSON, Map, Array, Object, String });
vm.runInContext(portSource, context, { filename: "js/good-intelligence-market-context.js" });
const Port = context.window.GoodIntelligenceMarketContext;

/* | `name` | type | `default` | range | `jsField` | meaning | */
const ROW = /^\|\s*`([^`]+)`\s*\|\s*[a-z]+\s*\|\s*`([^`]*)`\s*\|\s*[^|]*\|\s*`([^`]+)`\s*\|/;

function parameterRows(markdown, document) {
  const rows = [];
  for (const line of markdown.split("\n")) {
    const match = ROW.exec(line.trim());
    if (!match) continue;
    const [, pineName, defaultLiteral, jsField] = match;
    rows.push({ pineName, defaultLiteral, jsField, document, line: line.trim() });
  }
  return rows;
}

function pineBlocks(markdown) {
  return [...markdown.matchAll(/```pine\r?\n([\s\S]*?)```/g)].map(match => match[1]);
}

const texts = {};
for (const document of DOCUMENTS) {
  texts[document] = await readFile(path.join(PINE_DIR, document), "utf8");
}
const readme = await readFile(path.join(PINE_DIR, "README.md"), "utf8");
const integration = await readFile(path.join(ROOT, "docs", "architecture", "PINE-OCM-INTEGRATION.md"), "utf8");

const allRows = DOCUMENTS.flatMap(document => parameterRows(texts[document], document));

test("pine scripts: the shipped port exposes a frozen DEFAULTS object to check against", () => {
  assert.equal(typeof Port, "object", "js/good-intelligence-market-context.js defines window.GoodIntelligenceMarketContext");
  assert.ok(Object.isFrozen(Port.DEFAULTS), "DEFAULTS is frozen");
  assert.equal(Object.keys(Port.DEFAULTS).length, 28, "the port exposes 28 tunable parameters");
});

test("pine scripts: every documented parameter default equals the shipped DEFAULTS value", () => {
  assert.ok(allRows.length >= 28, `expected at least 28 parameter rows, found ${allRows.length}`);
  for (const row of allRows) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(Port.DEFAULTS, row.jsField),
      `${row.document}: documented JS field "${row.jsField}" does not exist in DEFAULTS — row: ${row.line}`
    );
    let expected;
    try {
      expected = JSON.parse(row.defaultLiteral);
    } catch {
      assert.fail(`${row.document}: default literal \`${row.defaultLiteral}\` is not valid JSON — row: ${row.line}`);
    }
    assert.deepEqual(
      Port.DEFAULTS[row.jsField], expected,
      `${row.document}: default for "${row.jsField}" drifted from DEFAULTS — row: ${row.line}`
    );
  }
});

test("pine scripts: the documented parameters are exactly the shipped parameters, each once", () => {
  const documented = allRows.map(row => row.jsField).sort();
  const shipped = Object.keys(Port.DEFAULTS).sort();
  const duplicates = documented.filter((field, index) => documented.indexOf(field) !== index);
  assert.deepEqual(duplicates, [], "a parameter is documented in more than one place");
  assert.deepEqual(documented, shipped, "the parameter tables neither omit nor invent a parameter");
});

test("pine scripts: each document names its Pine input the same as its JS field", () => {
  for (const row of allRows) {
    assert.equal(row.pineName, row.jsField, `${row.document}: Pine input name and JS field disagree — row: ${row.line}`);
  }
});

test("pine scripts: each reconstruction declares Pine v6 and carries the RECONSTRUCTED banner", () => {
  for (const document of DOCUMENTS) {
    const blocks = pineBlocks(texts[document]);
    assert.equal(blocks.length, 1, document + " should contain exactly one pine code block");
    const source = blocks[0];
    assert.match(source, /^\/\/@version=6/, `${document}: the reconstruction must declare //@version=6 on its first line`);
    assert.match(source, /\bindicator\(/, `${document}: the reconstruction must call indicator(`);
    assert.match(source, /RECONSTRUCTED — NOT THE SUPPLIED ORIGINAL/, `${document}: the code block must carry the RECONSTRUCTED banner`);
    assert.match(texts[document], /`RECONSTRUCTED`/, `${document}: the document must state RECONSTRUCTED status outside the code block too`);
    assert.doesNotMatch(texts[document], /`ORIGINAL`/, `${document}: must not claim ORIGINAL status until the real source is pasted in`);
  }
});

test("pine scripts: the folder states plainly that no .pine source exists in the repository", () => {
  assert.match(readme, /not in this repository/i, "README must record that the originals are absent");
  assert.match(readme, /RECONSTRUCTED/i, "README must label the Pine blocks as reconstructions");
  for (const document of DOCUMENTS) {
    assert.match(readme, new RegExp(document.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `README index must link ${document}`);
  }
});

test("pine scripts: the OCM integration design invents no new invariant", async () => {
  /* INV-CORPUS-027a forbids new security primitives. Every INV- token cited in
     the design must already exist in the canonical model or the Book I parts. */
  const canonical = await readFile(path.join(ROOT, "specs", "normative", "canonical-model.md"), "utf8");
  let corpus = "";
  for (const entry of (await readdir(path.join(ROOT, "docs", "harshal-systems"))).sort()) {
    if (entry.endsWith(".md")) corpus += await readFile(path.join(ROOT, "docs", "harshal-systems", entry), "utf8");
  }
  const cited = [...new Set([...integration.matchAll(/INV-[A-Z0-9]+(?:-[A-Z0-9]+)*/g)].map(match => match[0]))];
  assert.ok(cited.length >= 8, `expected the design to cite the existing invariants it relies on (${cited.length})`);
  for (const invariant of cited) {
    assert.ok(
      canonical.includes(invariant) || corpus.includes(invariant),
      `${invariant} is cited by the integration design but defined nowhere in specs/normative/ or docs/harshal-systems/ — INV-CORPUS-027a forbids inventing it`
    );
  }
  assert.match(integration, /Market Context/, "the design must name the proposed node");
  assert.match(integration, /0•116•000•0012•MKT/, "the design must give the node a concrete ℤ_360 address");
  assert.match(integration, /Refuse/, "the design must state the refusal default");
});

test("pine scripts: the proposed OCM address parses on the ℤ_360 ring and is not Center Origin", async () => {
  /* The address in the design must be one ocm-directory.js would actually accept,
     and the degree it claims must be the one the canonical legend assigns. */
  const sandbox = { window: {}, Date, Math, Number, JSON, Map, Array, Object, String, RegExp };
  const directoryContext = vm.createContext(sandbox);
  for (const module of ["js/ocm-data.js", "js/ocm-directory.js"]) {
    const source = await readFile(path.join(ROOT, module), "utf8");
    vm.runInContext(source, directoryContext, { filename: module });
  }
  const directory = sandbox.window.HOSOCMDIR;

  const parsed = directory.parseAddress("0•116•000•0012•MKT");
  assert.equal(parsed.ok, true, `the proposed address should parse: ${JSON.stringify(parsed)}`);
  assert.equal(parsed.sectorNumber, 116);
  assert.equal(parsed.isCenterOrigin, false, "a telemetry node must never sit at Center Origin");
  assert.equal(parsed.suffix, "MKT");

  assert.equal(directory.parseAddress("0•360•000•0012•MKT").ok, false,
    "360 is closure notation, never a 361st address slot");
  assert.equal(directory.addressRefusal(parsed), null,
    "the proposed node is registrable — addressRefusal returns null when nothing is refused");
  assert.equal(directory.addressRefusal(directory.parseAddress("0•000•000•0012•MKT")).ok, false,
    "Center Origin cannot be registered as a peer");

  /* Degree 116 is the canonical "Markets" degree, in the Knowledge & Intelligence cluster. */
  assert.equal(directory.degreeMeaning(116), "Markets", "the design must place the node on the Markets degree");
  assert.equal(directory.clusterOf(116).name, "Knowledge & Intelligence");
  assert.equal(directory.describe(parsed).degree, "Markets");
  assert.match(integration, /116: "Markets"/, "the design must cite the legend entry it relies on");

  /* The instance number must be the next free one in the shipped node map. */
  const instances = sandbox.window.OCM_DATA.nodes.map(node => Number(node.addr.split("•")[3]));
  assert.ok(!instances.includes(12), `instance 0012 is already taken: ${JSON.stringify(instances)}`);
  assert.equal(Math.max(...instances) + 1, 12, "the design should propose the next free instance number");
});

test("pine scripts: the folder stays outside the public asset allowlist", async () => {
  /* Read-only on purpose. repository-layout-test.mjs also drives
     scripts/prepare-assets.mjs, and npm test runs test files concurrently, so
     spawning a second staging run here would race that suite's readdir of
     .site-assets. The allowlists below are the deterministic source of truth
     for what can be published, so assert against them instead. */

  /* .assetsignore is deny-by-default; anything published must be explicitly allowed. */
  const assetsIgnore = (await readFile(path.join(ROOT, ".assetsignore"), "utf8"))
    .split("\n").map(line => line.trim()).filter(line => line && !line.startsWith("#"));
  assert.ok(assetsIgnore.includes("**"), ".assetsignore should deny by default");
  assert.deepEqual(
    assetsIgnore.filter(line => /scripts|docs/.test(line)), [],
    ".assetsignore must not allow scripts/ or docs/ through to the published asset surface"
  );

  /* prepare-assets.mjs copies only from this explicit list, plus one named docs file. */
  const staging = await readFile(path.join(ROOT, "scripts", "prepare-assets.mjs"), "utf8");
  const copyList = /for \(const entry of \[([^\]]+)\]\)/.exec(staging);
  assert.ok(copyList, "prepare-assets.mjs should stage from an explicit allowlist");
  const entries = copyList[1].split(",").map(entry => entry.trim().replace(/^['"]|['"]$/g, ""));
  assert.deepEqual(entries, ["index.html", "about.html", "css", "js", "assets", "specs"],
    "the staging allowlist changed — re-review whether scripts/pine/ can now be published");
  assert.ok(!entries.includes("scripts") && !entries.includes("docs"),
    "neither scripts/ nor docs/ may be staged wholesale");
  assert.match(staging, /const coreBookSource = 'docs\/harshal-systems\/01-core-book\.md'/,
    "the only docs/ file prepare-assets publishes is the selected Book I source");

  /* If a staging directory already exists, confirm the allowlists held in practice. */
  const staged = await readdir(SITE).catch(() => null);
  if (staged) {
    assert.deepEqual(
      staged.filter(entry => /pine|^scripts$|^docs$/i.test(entry)), [],
      "the staged asset directory must contain no Pine Script material and no scripts/ or docs/ tree"
    );
  }
});
