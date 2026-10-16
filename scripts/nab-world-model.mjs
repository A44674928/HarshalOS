/* ═══════════════════════════════════════════════════════════════
   HarshalOS — the world model's own frame (research/neural-atomic-
   bodies-insurance-requirements.md, Chapter 0 and Appendices F–H).

   Pure functions, no dependencies, no I/O:
     · the fossilized 360° Legend of the Orb Communicator Model, read from
       the AGS print source (Part VI), with its four quadrants;
     · the Periodic Table of Neural Elements laid on that legend: each
       class's arc ("360° Legend Mapping" in the Compendium master database),
       the degrees each arc covers, and the degrees no class covers;
     · the grid position of each class in a periodic-table layout.

   Legend degrees are semantic directions ("a direction of intent, not a
   silo, rank, or boundary"). They are never compass bearings, and nothing
   here relates them to latitude, longitude, or declination.
   ═══════════════════════════════════════════════════════════════ */

export const LEGEND_HEADER = "360° Degree Legend";
export const LEGEND_END = "End of Fossilized 360° Degree Legend";
export const RING = 360;

/* NFKC folds typographic ligatures (ﬀ, ﬃ); trailing dash runs are layout. */
export const normalizeText = s => String(s).normalize("NFKC").replace(/[\s⸺⸻—–-]+$/u, "").trim();

/* Read the legend between its header and its end marker: one line per degree,
   "N° – domain", for N = 0..360 (360 is the return-to-origin closure), and the
   four quadrant headers "A°–B° | name". Line numbers are 1-based. */
export function extractLegend(text) {
  const lines = String(text).split("\n");
  const start = lines.findIndex(l => l.trim() === LEGEND_HEADER);
  const end = lines.findIndex((l, i) => i > start && l.includes(LEGEND_END));
  if (start < 0 || end < 0) throw new Error("legend markers not found");
  const degrees = new Array(RING + 1).fill(null);
  const quadrants = [];
  let center = null, rule = null;
  for (let i = start + 1; i < end; i++) {
    const line = lines[i];
    const d = /^(\d+)° – (.+)$/.exec(line);
    const q = /^(\d+)°–(\d+)° \| (.+)$/.exec(line);
    if (d) {
      const n = Number(d[1]);
      if (n > RING || degrees[n]) throw new Error(`legend degree ${n} out of range or repeated (line ${i + 1})`);
      degrees[n] = { degree: n, domain: d[2].trim(), line: i + 1 };
    } else if (q) {
      quadrants.push({ from: Number(q[1]), to: Number(q[2]), name: q[3].trim(), line: i + 1 });
    } else if (/^Center \(Origin\):/.test(line)) {
      center = { text: line.trim(), line: i + 1 };
    } else if (/^Legend Rule:/.test(line)) {
      rule = { text: line.replace(/^Legend Rule:\s*/, "").trim(), line: i + 1 };
    }
  }
  const missing = degrees.map((d, n) => (d ? null : n)).filter(n => n !== null);
  if (missing.length) throw new Error(`legend degrees missing: ${missing.join(", ")}`);
  return { startLine: start + 1, endLine: end + 1, center, rule, quadrants, degrees };
}
export const legendCanonical = legend => JSON.stringify({ quadrants: legend.quadrants.map(q => [q.from, q.to, q.name]), degrees: legend.degrees.map(d => [d.degree, d.domain]) });

/* "30° to 35°" or "358° to 360° (Return to Origin)". */
export function parseArc(text) {
  const m = /^(\d+)° to (\d+)°(?:\s*\((.+)\))?$/.exec(String(text).trim());
  if (!m) return null;
  const from = Number(m[1]), to = Number(m[2]);
  if (from > RING || to > RING || to < from) return null;
  return { from, to, note: m[3] || null };
}
/* The ring degrees an arc covers; 360 closes onto 0. */
export const arcDegrees = arc => Array.from({ length: arc.to - arc.from + 1 }, (_, k) => (arc.from + k) % RING);

export function coverage(arcs) {
  const perDegree = Array.from({ length: RING }, () => []);
  for (const { symbol, arc } of arcs) for (const d of arcDegrees(arc)) perDegree[d].push(symbol);
  const gaps = [], overlaps = [];
  perDegree.forEach((list, d) => { if (!list.length) gaps.push(d); else if (list.length > 1) overlaps.push(d); });
  return { perDegree, covered: RING - gaps.length, gaps, overlaps };
}
/* Contiguous runs, e.g. [0,1,2,5] → [[0,2],[5,5]]. */
export function runs(degrees) {
  const out = [];
  for (const d of [...degrees].sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && d === last[1] + 1) last[1] = d; else out.push([d, d]);
  }
  return out;
}

/* Periodic-table layout: periods 1–7 in rows 1–7 under groups 1–18; the two
   fifteen-element f series (La–Lu, Ac–Lr, as the derivation rules treat them)
   in rows 9 and 10 under groups 3–17; element 119 in row 8, group 1. */
export function gridPosition({ z, period, group }) {
  if (z === 119) return { row: 8, col: 1 };
  if (z >= 57 && z <= 71) return { row: 9, col: 3 + (z - 57) };
  if (z >= 89 && z <= 103) return { row: 10, col: 3 + (z - 89) };
  if (!group) throw new Error(`no group for element ${z}`);
  return { row: period, col: group };
}
