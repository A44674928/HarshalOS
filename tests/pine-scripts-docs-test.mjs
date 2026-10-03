/* Guards the Markdown archive of the user-supplied Pine scripts and its crosswalk
   to the shipped JavaScript market-context port. These tests check documentation
   consistency; they do not compile Pine or prove TradingView parity. */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PINE_DIR = path.join(ROOT, "scripts", "pine");
const SITE = path.join(ROOT, ".site-assets");

const DOCUMENTS = [
  { file: "01-vfi-fibonacci-bands.md", title: "VFI + Fibonacci Bands [Harshal]", sha256: "c0bb7b8d7fa72aebe85fec47ab02bf47a091c6270be21049e32dd86df6769cbe" },
  { file: "02-wavetrend.md", title: "LAZY - WaveTrend Context Engine [Pro]", sha256: "7d106151194c74a041bff6b1b2ba3fa21f0a053672018f14bb6a4f3476266a65" },
  { file: "03-fibonacci-bollinger-bands.md", title: "Fibonacci Bollinger Bands [Harshal]", sha256: "874cd1706436ba5b812c745213266a3ff770dbfb38bc232437f88e50c396f642" },
  { file: "04-moon-phases.md", title: "Moon phases", sha256: "35d257c85b3e515f96b93edad2647279edc275b3177b08738dace8118c3bdf04" }
];

/* Execute the actual browser module so its frozen defaults, rather than a test copy,
   are the source of truth for the documented crosswalk. */
const portSource = await readFile(path.join(ROOT, "js", "good-intelligence-market-context.js"), "utf8");
const context = vm.createContext({ window: {}, Date, Math, Number, JSON, Map, Array, Object, String });
vm.runInContext(portSource, context, { filename: "js/good-intelligence-market-context.js" });
const Port = context.window.GoodIntelligenceMarketContext;

const INPUT_ROW = /^\|\s*`([^`]+)`\s*\|\s*([a-z]+)\s*\|\s*`([^`]*)`\s*\|\s*([^|]*)\|\s*([^|]*)\|/;
const PINE_INPUT = /^\s*([A-Za-z_]\w*)\s*=\s*input\.(int|float|bool|string|source|timeframe|color)\(\s*([^,\n)]+)/gm;

function parseDefault(literal, description, type) {
  if (type === "color") return literal;
  try {
    return JSON.parse(literal);
  } catch {
    assert.fail(`${description}: default literal \`${literal}\` is not valid JSON`);
  }
}

function parsePineDefault(literal, description) {
  const value = literal.trim();
  if (value.startsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      assert.fail(`${description}: Pine string default ${value} is malformed`);
    }
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) return Number(value);
  return value;
}

function pineBlocks(markdown) {
  return [...markdown.matchAll(/```pine\r?\n([\s\S]*?)```/g)].map(match => match[1]);
}

function documentedInputs(markdown, document) {
  const rows = [];
  for (const line of markdown.split("\n")) {
    const match = INPUT_ROW.exec(line.trim());
    if (!match) continue;
    const [, pineName, type, defaultLiteral, , jsCell] = match;
    const cell = jsCell.trim();
    const jsField = cell === "—" ? null : /^`([^`]+)`$/.exec(cell)?.[1];
    assert.ok(cell === "—" || jsField, `${document}: invalid JS field cell in ${line.trim()}`);
    rows.push({
      pineName,
      type,
      defaultLiteral,
      defaultValue: parseDefault(defaultLiteral, `${document} ${pineName}`, type),
      jsField: jsField || null,
      document,
      line: line.trim()
    });
  }
  return rows;
}

function sourceInputs(source, document) {
  const rows = [];
  for (const match of source.matchAll(PINE_INPUT)) {
    rows.push({
      pineName: match[1],
      type: match[2],
      defaultValue: parsePineDefault(match[3], `${document} ${match[1]}`)
    });
  }
  return rows;
}

const texts = {};
const blocks = {};
const rowsByDocument = {};
for (const document of DOCUMENTS) {
  texts[document.file] = await readFile(path.join(PINE_DIR, document.file), "utf8");
  blocks[document.file] = pineBlocks(texts[document.file]);
  rowsByDocument[document.file] = documentedInputs(texts[document.file], document.file);
}
const readme = await readFile(path.join(PINE_DIR, "README.md"), "utf8");
const integration = await readFile(path.join(ROOT, "docs", "architecture", "PINE-OCM-INTEGRATION.md"), "utf8");
const allRows = DOCUMENTS.flatMap(document => rowsByDocument[document.file]);

const JS_ALIASES = new Map([
  ["02-wavetrend.md:src", "wtSrc"],
  ["03-fibonacci-bollinger-bands.md:length", "bandLen"],
  ["03-fibonacci-bollinger-bands.md:src", "bandSrc"],
  ["03-fibonacci-bollinger-bands.md:mult", "bandMult"],
  ["03-fibonacci-bollinger-bands.md:ma_type", "bandMa"]
]);

test("pine scripts: the shipped port exposes the frozen defaults used for the crosswalk", () => {
  assert.equal(typeof Port, "object", "js/good-intelligence-market-context.js defines window.GoodIntelligenceMarketContext");
  assert.ok(Object.isFrozen(Port.DEFAULTS), "DEFAULTS is frozen");
  assert.equal(Object.keys(Port.DEFAULTS).length, 28, "the current port exposes 28 parameters");
});

test("pine scripts: each Markdown file contains one supplied Pine v6 source block", () => {
  for (const document of DOCUMENTS) {
    const markdown = texts[document.file];
    assert.equal(blocks[document.file].length, 1, `${document.file} should contain exactly one Pine source block`);
    const source = blocks[document.file][0];
    assert.equal(
      createHash("sha256").update(source).digest("hex"), document.sha256,
      `${document.file}: update the archived-source digest only when intentionally revising the supplied code`
    );
    assert.match(source, /^\/\/@version=6/, `${document.file}: source must begin with //@version=6`);
    assert.match(source, new RegExp(`indicator\\(\\\"${document.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\\"`),
      `${document.file}: expected the supplied indicator title`);
    assert.doesNotMatch(source, /RECONSTRUCTED|NOT THE SUPPLIED ORIGINAL/,
      `${document.file}: do not insert a reconstruction banner into the supplied source`);
    assert.match(markdown, /User-supplied source, transcribed below/i,
      `${document.file}: provenance must identify this as a user-supplied source copy`);
    assert.match(markdown, /Source \(verbatim transcription\)/,
      `${document.file}: identify the Pine block as the source transcription`);
  }
});

test("pine scripts: documented input names, types, and defaults match each Pine source block", () => {
  for (const document of DOCUMENTS) {
    const documented = rowsByDocument[document.file].map(({ pineName, type, defaultValue }) => ({ pineName, type, defaultValue }));
    const extracted = sourceInputs(blocks[document.file][0], document.file);
    assert.ok(documented.length > 0, `${document.file}: expected documented Pine inputs`);
    assert.deepEqual(documented, extracted,
      `${document.file}: the Inputs table must match every input declaration in the source block, in order`);
  }
});

test("pine scripts: every mapped source default agrees with the shipped JS DEFAULTS", () => {
  const mapped = allRows.filter(row => row.jsField);
  assert.ok(mapped.length >= 28, `expected at least 28 mapped parameter rows, found ${mapped.length}`);
  for (const row of mapped) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(Port.DEFAULTS, row.jsField),
      `${row.document}: mapped JS field "${row.jsField}" is not in DEFAULTS — row: ${row.line}`
    );
    assert.deepEqual(
      Port.DEFAULTS[row.jsField], row.defaultValue,
      `${row.document}: Pine default for "${row.pineName}" does not match JS field "${row.jsField}" — row: ${row.line}`
    );
  }
});

test("pine scripts: merged VFI/FBB plus WaveTrend crosswalk covers the port exactly once", () => {
  const coreDocuments = ["01-vfi-fibonacci-bands.md", "02-wavetrend.md"];
  const mapped = coreDocuments.flatMap(document => rowsByDocument[document].filter(row => row.jsField));
  const fields = mapped.map(row => row.jsField).sort();
  const duplicates = fields.filter((field, index) => fields.indexOf(field) !== index);
  assert.deepEqual(duplicates, [], "a core JS parameter should be mapped only once across the merged VFI/FBB and WaveTrend sources");
  assert.deepEqual(fields, Object.keys(Port.DEFAULTS).sort(), "the two core scripts should map exactly the current JS parameter set");

  for (const row of allRows.filter(row => row.jsField)) {
    const alias = JS_ALIASES.get(`${row.document}:${row.pineName}`);
    assert.equal(row.jsField, alias || row.pineName,
      `${row.document}: unexpected Pine-to-JS parameter name mapping for ${row.pineName}`);
  }
});

test("pine scripts: README inventories all four source copies and does not call them reconstructions", () => {
  assert.match(readme, /user-supplied source transcriptions/i);
  assert.match(readme, /no separate raw `\.pine` files/i);
  assert.match(readme, /cross-validated bar-for-bar against TradingView/i);
  for (const document of DOCUMENTS) {
    assert.match(readme, new RegExp(document.file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `README inventory must link ${document.file}`);
  }
  assert.doesNotMatch(readme, /RECONSTRUCTED reverse-engineerings|the originals are absent/i);
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
  assert.ok(cited.length >= 8, `expected the design to cite existing invariants it relies on (${cited.length})`);
  for (const invariant of cited) {
    assert.ok(
      canonical.includes(invariant) || corpus.includes(invariant),
      `${invariant} is cited by the integration design but defined nowhere in specs/normative/ or docs/harshal-systems/ — INV-CORPUS-027a forbids inventing it`
    );
  }
  assert.match(integration, /Market Context/, "the design must name the registered node");
  assert.match(integration, /0•116•000•0012•MKT/, "the design must give the node a concrete ℤ₃₆₀ address");
  assert.match(integration, /default to Refuse/i, "the design must state the refusal default");
  assert.match(integration, /read-only.*Market Context node is registered|registered.*read-only.*Market Context node/is,
    "the design must reflect the approved directory-node registration");
  assert.match(integration, /payload binding into OCM is not implemented/i,
    "the design must not imply a live provider payload edge");
});

test("pine scripts: Market, Sun, and Moon OCM addresses parse and stay off Center Origin", async () => {
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
  assert.equal(parsed.ok, true, `the Market Context address should parse: ${JSON.stringify(parsed)}`);
  assert.equal(parsed.sectorNumber, 116);
  assert.equal(parsed.isCenterOrigin, false, "a telemetry node must never sit at Center Origin");
  assert.equal(parsed.suffix, "MKT");
  assert.equal(directory.parseAddress("0•360•000•0012•MKT").ok, false,
    "360 is closure notation, never a 361st address slot");
  assert.equal(directory.addressRefusal(parsed), null,
    "the registered node address is valid — addressRefusal returns null when nothing is refused");
  assert.equal(directory.addressRefusal(directory.parseAddress("0•000•000•0012•MKT")).ok, false,
    "Center Origin cannot be registered as a peer");
  assert.equal(directory.degreeMeaning(116), "Markets");
  assert.equal(directory.clusterOf(116).name, "Knowledge & Intelligence");
  assert.equal(directory.describe(parsed).degree, "Markets");
  assert.match(integration, /116: "Markets"/, "the design must cite the existing legend entry");
  assert.equal(directory.degreeMeaning(9), "Stellar influence and radiation");
  assert.equal(directory.degreeMeaning(163), "Lunar presence");

  const expectedNodes = [
    { address: "0•116•000•0012•MKT", app: "good-intelligence", name: "Market Context", deg: 116 },
    { address: "0•009•000•0013•SUN", app: "uts", name: "Sun", deg: 9 },
    { address: "0•163•000•0014•MOON", app: "uts", name: "Moon", deg: 163 }
  ];
  const registered = sandbox.window.OCM_DATA.nodes;
  for (const expected of expectedNodes) {
    const node = registered.find(entry => entry.addr === expected.address);
    assert.ok(node, `${expected.name} should be registered at ${expected.address}`);
    assert.equal(node.app, expected.app, `${expected.name} uses a valid application ID`);
    assert.equal(node.name, expected.name);
    assert.equal(node.deg, expected.deg);
    const nodeAddress = directory.parseAddress(node.addr);
    assert.equal(nodeAddress.ok, true, `${expected.name} address parses`);
    assert.equal(nodeAddress.isCenterOrigin, false, `${expected.name} is not Center Origin`);
  }
  assert.match(integration, /live feed|provider payload edge/i, "the integration doc must keep provider binding out of scope");

  const instances = registered.map(node => Number(node.addr.split("•")[3]));
  assert.equal(instances.length, 15, "three read-only nodes are added to the twelve pre-existing nodes");
  assert.equal(new Set(instances).size, instances.length, "registered instances are unique");
  assert.equal(Math.max(...instances) + 1, 15, "the registered nodes use the next three free instance numbers");
});

test("pine scripts: the Markdown archive stays outside the public asset allowlist", async () => {
  /* Read-only on purpose. repository-layout-test.mjs also drives
     scripts/prepare-assets.mjs, and npm test runs test files concurrently, so
     spawning a second staging run here would race that suite's readdir of
     .site-assets. The allowlists below are the deterministic source of truth
     for what can be published, so assert against them instead. */
  const assetsIgnore = (await readFile(path.join(ROOT, ".assetsignore"), "utf8"))
    .split("\n").map(line => line.trim()).filter(line => line && !line.startsWith("#"));
  assert.ok(assetsIgnore.includes("**"), ".assetsignore should deny by default");
  assert.deepEqual(
    assetsIgnore.filter(line => /scripts|docs/.test(line)), [],
    ".assetsignore must not allow scripts/ or docs/ through to the published asset surface"
  );

  const staging = await readFile(path.join(ROOT, "scripts", "prepare-assets.mjs"), "utf8");
  const copyList = /for \(const entry of \[([^\]]+)\]\)/.exec(staging);
  assert.ok(copyList, "prepare-assets.mjs should stage from an explicit allowlist");
  const entries = copyList[1].split(",").map(entry => entry.trim().replace(/^['"]|['"]$/g, ""));
  assert.deepEqual(entries, ["index.html", "about.html", "account.html", "audits.html", "css", "js", "assets", "specs"],
    "the staging allowlist changed — re-review whether scripts/pine/ can now be published");
  assert.ok(!entries.includes("scripts") && !entries.includes("docs"),
    "neither scripts/ nor docs/ may be staged wholesale");
  assert.match(staging, /const coreBookSource = 'docs\/harshal-systems\/01-core-book\.md'/,
    "the only docs/ file prepare-assets publishes is the selected Book I source");

  const staged = await readdir(SITE).catch(() => null);
  if (staged) {
    assert.deepEqual(
      staged.filter(entry => /pine|^scripts$|^docs$/i.test(entry)), [],
      "the staged asset directory must contain no Pine Script material and no scripts/ or docs/ tree"
    );
  }
});
