/* The world model's own frame: the fossilized 360° Legend, the Periodic Table of
   Neural Elements laid on it, and the field's coefficients
   (research/neural-atomic-bodies-insurance-requirements.md, Chapter 0, Appendices F–H). */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as W from "../scripts/nab-world-model.mjs";

const ROOT = new URL("../", import.meta.url);
const require = createRequire(import.meta.url);
const PRINT_SOURCE = "publications/book/AGS-v0.2-Harshal-s-Systems-Full-Book-PRINT-SOURCE-2026-10-07.txt";
const legend = W.extractLegend(readFileSync(new URL(PRINT_SOURCE, ROOT), "utf8"));
require("../js/nab-sectors.js");
const { sectors } = globalThis.NabSectors;
globalThis.window = globalThis;
require("../js/ocm-data.js");
require("../js/ocm-directory.js");
const OCM = globalThis.OCM_DATA, OCMDIR = globalThis.HOSOCMDIR;
const evidence = JSON.parse(execFileSync(process.execPath, ["scripts/nab-insurance-evidence.mjs", "--json"], { cwd: ROOT, encoding: "utf8" }));

test("the fossilized legend is complete, pinned, and matched by the app's copy", () => {
  assert.equal(legend.degrees.length, 361, "0° to 359°, plus 360° as closure onto the origin");
  assert.deepEqual(legend.quadrants.map(q => [q.from, q.to]), [[0, 89], [90, 179], [180, 269], [270, 359]]);
  assert.equal(legend.degrees[0].domain, "Origin of matter and physical law");
  assert.equal(legend.degrees[359].domain, "Return to origin");
  assert.match(legend.degrees[360].domain, /^Origin \(360° ≡ 0° mod 360/);
  assert.equal(legend.center.text, "Center (Origin): 0•000•000•0000");
  assert.match(legend.rule.text, /direction of intent, not a silo, rank, or boundary/);
  assert.equal(createHash("sha256").update(W.legendCanonical(legend)).digest("hex"), evidence.worldModel.legend.sha256);
  const raw = [], folded = [];
  for (let d = 0; d < 360; d++) {
    if (OCM.degrees[d] !== legend.degrees[d].domain) raw.push(d);
    if (W.normalizeText(OCM.degrees[d]) !== W.normalizeText(legend.degrees[d].domain)) folded.push(d);
  }
  assert.deepEqual(raw, [89, 167, 331], "a trailing dash and two ligatures in js/ocm-data.js");
  assert.deepEqual(folded, []);
});

test("every class has an arc on the disc, and the coverage is what Chapter 0 reports", () => {
  const arcs = sectors.map(row => ({ symbol: row.symbol, arc: W.parseArc(row.legend) }));
  assert.ok(arcs.every(a => a.arc), "all 119 arcs parse");
  assert.deepEqual(W.parseArc("358° to 360° (Return to Origin)"), { from: 358, to: 360, note: "Return to Origin" });
  assert.deepEqual(W.arcDegrees({ from: 358, to: 360 }), [358, 359, 0], "360 closes onto the origin");
  assert.equal(W.parseArc("40° to 30°"), null);
  const disc = W.coverage(arcs);
  assert.equal(disc.covered, 133);
  assert.equal(disc.gaps.length, 227);
  assert.equal(disc.overlaps.length, 98);
  assert.deepEqual(disc.perDegree[63], ["Sc", "Ti", "V", "Br", "I"], "Warfare");
  assert.deepEqual(disc.perDegree[128], [], "Insurance models has no class");
  assert.deepEqual(disc.perDegree[0], ["Ha"], "the Capstone sits on the return to origin");
  for (const d of [319, 320, 321, 322, 323, 324, 325, 326, 327]) assert.deepEqual(disc.perDegree[d], [], `${d}° is the center's`);
  assert.deepEqual(W.runs([0, 1, 2, 5, 7, 8]), [[0, 2], [5, 5], [7, 8]]);
});

test("Harshal (Ha-119) covers every degree no other class covers, by the author's decision", () => {
  const arcs = sectors.map(row => ({ symbol: row.symbol, arc: W.parseArc(row.legend) }));
  const disc = W.coverage(arcs);
  const full = W.withResidual(disc, "Ha");
  assert.equal(full.covered, 360);
  assert.ok(full.perDegree.every(list => list.length > 0), "no degree is left without a class");
  assert.equal(full.residual.length, 227);
  assert.deepEqual(full.perDegree[128], ["Ha"], "Insurance models");
  assert.deepEqual(full.perDegree[284], ["Ha"], "Origin preservation, one of Ha's own MDB roles");
  assert.deepEqual(full.perDegree[63], ["Sc", "Ti", "V", "Br", "I"], "a degree with its own classes keeps them");
  const ha = full.perDegree.filter(list => list.includes("Ha")).length;
  assert.equal(ha, 230, "227 residual degrees plus Ha's own 358°–360°");
  for (let d = 354; d <= 389; d++) assert.ok(full.perDegree[d % 360].includes("Ha"), `${d % 360}°: Ha's coverage runs unbroken from 354° through the origin to 29°`);
  const tier = new Map(sectors.map(row => [row.symbol, row.riskLevel]));
  const prohibitedOnly = W.onlyTier(disc, s => (tier.get(s) === 3 ? "Prohibited" : "other"), "Prohibited");
  assert.equal(prohibitedOnly.length, 33);
  assert.deepEqual(W.runs(prohibitedOnly), [[210, 227], [230, 230], [249, 260], [263, 264]]);
  assert.deepEqual(evidence.worldModel.disc.residual.classDegreesInAll, 230);
});

test("OCM addresses follow the book's own worked example and validation rules", () => {
  assert.equal(OCMDIR.ringDistance(42, 198), 156, "Worked Example 6.1");
  assert.equal(OCMDIR.ringDistance(1, 359), 2);
  assert.equal(OCMDIR.validateAddress("0•042•003•0001").ok, true);
  assert.equal(OCMDIR.validateAddress("0•360•001•0001").code, "OCM-ADDR-SECTOR-CLOSURE");
  assert.equal(OCMDIR.validateAddress("0•000•001•0005").code, "OCM-ADDR-ORIGIN-RESERVED");
  assert.equal(OCMDIR.parseAddress("0•000•000•0000").isCenterOrigin, true);
});

test("the periodic grid places all 119 classes in distinct cells", () => {
  const props = JSON.parse(readFileSync(new URL("research/data/elemental-properties.json", ROOT), "utf8")).elements;
  const cells = new Set(props.map(e => JSON.stringify(W.gridPosition(e))));
  cells.add(JSON.stringify(W.gridPosition({ z: 119 })));
  assert.equal(cells.size, 119);
  assert.deepEqual(W.gridPosition({ z: 1, period: 1, group: 1 }), { row: 1, col: 1 });
  assert.deepEqual(W.gridPosition({ z: 57, period: 6, group: 3 }), { row: 9, col: 3 }, "La heads the f row");
  assert.deepEqual(W.gridPosition({ z: 103, period: 7, group: null }), { row: 10, col: 17 });
  assert.deepEqual(W.gridPosition({ z: 119 }), { row: 8, col: 1 });
  const grid = evidence.worldModel.periodicTable.grid;
  assert.equal(grid.flatMap(r => r.cells).filter(c => /·[SMEP]$/.test(c)).length, 119);
});

test("the evidence script passes world-model and OCM route-composition checks", () => {
  assert.equal(evidence.worldModel.pass, true);
  assert.ok(Object.values(evidence.worldModel.checks).every(Boolean));
  assert.equal(evidence.worldModel.wmmCoefficients.rows.length, 90);
  assert.deepEqual(evidence.worldModel.wmmCoefficients.rows[0], { n: 1, m: 0, g: -29351.8, h: 0, gDot: 12, hDot: 0 });

  assert.equal(evidence.nabOcm.model, "NAB-OCM-route-composition-v1");
  assert.equal(evidence.nabOcm.pass, true);
  assert.ok(Object.values(evidence.nabOcm.checks).every(Boolean));
  assert.equal(evidence.nabOcm.cases.directLateralCoordination.agsDecision, "NOT-APPLICABLE");
  assert.equal(evidence.nabOcm.cases.resolvedActionWithAgs.agsDecision, "Permit");
  assert.equal(evidence.nabOcm.cases.resolvedActionWithAgs.execution, "NOT-ATTEMPTED");
  assert.equal(evidence.nabOcm.cases.resolvedActionRefusedByAgs.agsDecision, "Refuse");
  assert.equal(evidence.nabOcm.cases.directLateralAction.agsDecision, "NOT-EVALUATED");
  assert.equal(evidence.nabOcm.cases.directLateralAction.gateCalls, 0);
  assert.equal(evidence.nabOcm.cases.actionWithoutSelectedAgs.agsDecision, "NOT-SELECTED");
});
