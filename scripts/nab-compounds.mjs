/* ═══════════════════════════════════════════════════════════════
   HarshalOS — compound bodies: real chemical formulae through the NAB
   phase model (research/neural-atomic-bodies-insurance-requirements.md,
   Section 4.11 and Appendix E).

   Pure functions, no dependencies, no I/O. The caller supplies the class
   data (tier, authority density, and the Appendix A phase cells for each
   element, from js/nab-sectors.js and the evidence script) and the pinned
   physical data (research/data/compound-bodies.json).

   Two readings are kept apart on purpose:
     · the governance reading of a formula — tier, authority density, and
       phase eligibility, composed from its constituent classes;
     · the physical reading of a substance — its real state of matter at a
       temperature and pressure, from measured data, written ICE (solid),
       WATER (liquid), or GAS (gas).
   The physical reading never sets, raises, or lowers a governance phase.
   ═══════════════════════════════════════════════════════════════ */

export const ELEMENTS = Object.freeze([
  "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar",
  "K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr",
  "Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe",
  "Cs", "Ba", "La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu",
  "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl", "Pb", "Bi", "Po", "At", "Rn",
  "Fr", "Ra", "Ac", "Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No", "Lr",
  "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts", "Og"
]);
/* Hydrogen isotopes written with their own symbols. They count toward the Hydrogen class. */
export const ISOTOPES = Object.freeze({ D: Object.freeze({ of: "H", massNumber: 2 }), T: Object.freeze({ of: "H", massNumber: 3 }) });
export const TIERS = Object.freeze(["Safe", "Moderate", "Elevated", "Prohibited"]);
export const DENSITIES = Object.freeze(["Minimal", "Minimal to Moderate", "Moderate", "Moderate to High", "High", "Extreme"]);
export const ATM = 101325;                       // Pa
export const ELEVATED_LIMIT = 5;                 // distinct Elevated classes per co-routing [XXIV:13100–13103]
const SYMBOLS = new Set([...ELEMENTS, ...Object.keys(ISOTOPES)]);
const HYDRATE_SEPARATORS = new Set(["·", "•", "*"]);

/* ── Formula grammar ───────────────────────────────────────────────
   formula     = part { separator part } [ charge ]
   separator   = "·" | "•" | "*"              (hydrates and adducts: CuSO4·5H2O)
   part        = [ coefficient ] group { group }
   group       = symbol [ count ] | "(" group { group } ")" [ count ] | "[" group { group } "]" [ count ]
   symbol      = one of the 118 element symbols, or D or T
   count       = digits [ "." digits ]          (decimals for non-stoichiometric solids: Fe0.95O)
   coefficient = digits                         (multiplies one hydrate part)
   charge      = "^" [ digits ] ( "+" | "-" )   (SO4^2-)
   A full stop is never a hydrate separator, because "O4.5" would be ambiguous. */
export function parseFormula(input) {
  const text = typeof input === "string" ? input.trim() : "";
  if (!text) return { ok: false, error: "empty formula", at: 0 };
  let i = 0;
  const fail = (error, at = i) => ({ ok: false, error, at, text });
  const readNumber = allowDecimal => {
    const match = (allowDecimal ? /^\d+(?:\.\d+)?/ : /^\d+/).exec(text.slice(i));
    if (!match) return null;
    i += match[0].length;
    return Number(match[0]);
  };
  const add = (into, from, factor) => { for (const [s, n] of Object.entries(from)) into[s] = round12((into[s] || 0) + n * factor); };
  function readGroups(closer) {
    const counts = {};
    let any = false;
    while (i < text.length) {
      const c = text[i];
      if (c === "(" || c === "[") {
        const open = i, close = c === "(" ? ")" : "]";
        i += 1;
        const inner = readGroups(close);
        if (!inner.ok) return inner;
        if (text[i] !== close) return fail(`unclosed "${c}"`, open);
        i += 1;
        const n = readNumber(true) ?? 1;
        if (n <= 0) return fail("a count must be positive");
        add(counts, inner.counts, n);
        any = true;
      } else if (/[A-Z]/.test(c)) {
        const two = text.slice(i, i + 2), one = c;
        let symbol = null;
        if (/^[A-Z][a-z]$/.test(two) && SYMBOLS.has(two)) symbol = two;
        else if (SYMBOLS.has(one) && !/^[A-Z][a-z]$/.test(two)) symbol = one;
        if (!symbol) {
          const shown = /^[A-Z][a-z]$/.test(two) ? two : one;
          if (shown === "Ha") return fail("Ha (element 119) is not a chemical element; the Capstone cannot be a constituent of a formula");
          return fail(`"${shown}" is not an element symbol`);
        }
        i += symbol.length;
        const n = readNumber(true) ?? 1;
        if (n <= 0) return fail("a count must be positive");
        counts[symbol] = round12((counts[symbol] || 0) + n);
        any = true;
      } else {
        break;                                   // a closer, a separator, a charge, or an error for the caller
      }
    }
    if (!any) return fail(closer ? "empty group" : "expected an element symbol");
    return { ok: true, counts };
  }
  const counts = {};
  const parts = [];
  let charge = 0;
  for (;;) {
    const start = i;
    const coefficient = readNumber(false) ?? 1;
    if (coefficient <= 0) return fail("a coefficient must be positive", start);
    const groups = readGroups(null);
    if (!groups.ok) return groups;
    add(counts, groups.counts, coefficient);
    parts.push({ coefficient, counts: groups.counts });
    if (i < text.length && HYDRATE_SEPARATORS.has(text[i])) { i += 1; continue; }
    break;
  }
  if (text[i] === "^") {
    const match = /^\^(\d*)([+-])$/.exec(text.slice(i));
    if (!match) return fail("charge must look like ^2- or ^+");
    charge = (match[1] ? Number(match[1]) : 1) * (match[2] === "+" ? 1 : -1);
    i = text.length;
  }
  if (i !== text.length) return fail(`unexpected "${text[i]}"`);
  const atoms = round12(Object.values(counts).reduce((a, b) => a + b, 0));
  const classes = [...new Set(Object.keys(counts).map(s => ISOTOPES[s]?.of ?? s))];
  return { ok: true, text, counts, charge, parts, atoms, hill: hillFormula(counts, charge), classes,
    isotopes: Object.keys(counts).filter(s => ISOTOPES[s]), stoichiometric: Object.values(counts).every(Number.isInteger) };
}

const round12 = x => Math.round(x * 1e12) / 1e12;
const formatCount = n => (n === 1 ? "" : String(round12(n)));

/* Hill order: carbon first, then hydrogen, then the rest alphabetically; with no
   carbon, every symbol alphabetically. D and T sort as their own symbols. */
export function hillFormula(counts, charge = 0) {
  const symbols = Object.keys(counts);
  const order = symbols.includes("C")
    ? ["C", ...(symbols.includes("H") ? ["H"] : []), ...symbols.filter(s => s !== "C" && s !== "H").sort()]
    : [...symbols].sort();
  const body = order.map(s => `${s}${formatCount(counts[s])}`).join("");
  if (!charge) return body;
  const size = Math.abs(charge);
  return `${body}^${size === 1 ? "" : size}${charge > 0 ? "+" : "-"}`;
}

export function molarMass(parsed, atomicWeights) {
  let total = 0;
  for (const [symbol, n] of Object.entries(parsed.counts)) {
    const w = atomicWeights[symbol];
    if (typeof w !== "number") throw new Error(`no atomic weight for ${symbol}`);
    total += n * w;
  }
  return total;
}

/* CAS Registry Number: two to seven digits, two digits, one check digit. The check
   digit is the sum of every other digit times its position counted from the right,
   modulo 10 (water, 7732-18-5: 8·1 + 1·2 + 2·3 + 3·4 + 7·5 + 7·6 = 105). */
export function casValid(cas) {
  const match = /^(\d{2,7})-(\d{2})-(\d)$/.exec(String(cas));
  if (!match) return false;
  const digits = (match[1] + match[2]).split("").reverse().map(Number);
  return digits.reduce((sum, d, k) => sum + d * (k + 1), 0) % 10 === Number(match[3]);
}

/* ── Composition: the governance reading ─────────────────────────────
   classes: Map(symbol → { z, name, tier, density, ice, water, gas, group }).
   A compound can be declared in a phase only if every constituent can: eligibility
   is the three-valued AND of the constituents' Appendix A cells (D✗ beats U beats D).
   The tier and authority density are the highest among the constituents. */
export function eligibilityAnd(cells) {
  const norm = cells.map(c => (String(c).startsWith("D✗") ? "D✗" : c));
  if (norm.includes("D✗")) return "D✗";
  if (norm.includes("U")) return "U";
  return "D";
}

export function composeBody(parsed, classes) {
  if (!parsed?.ok) throw new Error("composeBody needs a parsed formula");
  const merged = {};
  for (const [symbol, n] of Object.entries(parsed.counts)) {
    const cls = ISOTOPES[symbol]?.of ?? symbol;
    merged[cls] = round12((merged[cls] || 0) + n);
  }
  const constituents = Object.entries(merged).map(([symbol, count]) => {
    const c = classes.get(symbol);
    if (!c) throw new Error(`no class data for ${symbol}`);
    return { symbol, count, ...c };
  }).sort((a, b) => a.z - b.z);
  const tierIndex = Math.max(...constituents.map(c => TIERS.indexOf(c.tier)));
  const densityIndex = Math.max(...constituents.map(c => DENSITIES.indexOf(c.density)));
  const compound = constituents.length > 1;
  const elevated = constituents.filter(c => c.tier === "Elevated").map(c => c.symbol);
  const eligibility = {
    ice: eligibilityAnd(constituents.map(c => c.ice)),
    water: eligibilityAnd(constituents.map(c => c.water)),
    gas: eligibilityAnd(constituents.map(c => c.gas))
  };
  const flags = [];
  const has = symbol => constituents.some(c => c.symbol === symbol);
  if (tierIndex === TIERS.indexOf("Prohibited")) flags.push("prohibited");
  if (elevated.length > ELEVATED_LIMIT) { flags.push("elevated-limit"); eligibility.ice = "D✗"; }
  if (compound && constituents.some(c => c.group === 18)) flags.push("noble-bonded");
  if (compound && has("Fe")) flags.push("iron-persistent");
  if (compound && has("C")) flags.push("carbon-dissolvable");
  if (compound && has("Fe") && has("C")) flags.push("iron-carbon");
  if (!compound) flags.push("single-class");
  const tier = TIERS[tierIndex];
  const density = DENSITIES[densityIndex];
  const routing = tier === "Prohibited" || density === "Extreme" ? "none" : tier === "Safe" ? "Level 2" : "Level 3";
  return { constituents, tier, density, eligibility, elevated, flags, routing, compound };
}

/* ── The physical reading ─────────────────────────────────────────────
   sub: one registry entry. ladder1atm: { start, steps: [{ atK, to }] } at 101,325 Pa.
   curves: { ttK, ptPa, tcK, pcPa, tsubK? } where known. */
const lastState = ladder => ladder.steps.length ? ladder.steps[ladder.steps.length - 1].to : ladder.start;
export function phaseAt1atm(sub, T) {
  const { start, steps } = sub.ladder1atm;
  let state = start;
  for (const step of steps) {
    if (T >= step.atK) state = step.to;
    else return state;
  }
  const final = lastState(sub.ladder1atm);
  return final === "GAS" || final === "decomposed" ? final : (steps.length ? "unknown" : state);
}
const meltingPoint = sub => sub.ladder1atm.steps.find(s => s.to === "WATER")?.atK ?? null;
const boilingPoint = sub => sub.ladder1atm.steps.find(s => s.to === "GAS" && s.kind !== "sublimation")?.atK ?? null;
const decompositionPoint = sub => sub.ladder1atm.steps.find(s => s.to === "decomposed")?.atK ?? null;

function logInterp(T, [T1, p1], [T2, p2]) {
  const f = (1 / T - 1 / T1) / (1 / T2 - 1 / T1);
  return Math.exp(Math.log(p1) + f * (Math.log(p2) - Math.log(p1)));
}
/* Liquid–vapor pressure between the triple and critical points, linear in ln p
   against 1/T through the triple point, the normal boiling point, and the critical
   point. Below the triple point only a helium-like substance (no solid) extrapolates. */
export function vaporPressure(sub, T) {
  const c = sub.curves;
  if (!c || T >= c.tcK) return null;
  const nodes = [[c.ttK, c.ptPa]];
  const tb = boilingPoint(sub);
  if (tb !== null && c.ptPa < ATM && tb > c.ttK && tb < c.tcK) nodes.push([tb, ATM]);
  nodes.push([c.tcK, c.pcPa]);
  if (T < c.ttK && !sub.noSolidBelowPa) return null;
  for (let k = 0; k < nodes.length - 1; k++) if (T <= nodes[k + 1][0]) return logInterp(T, nodes[k], nodes[k + 1]);
  return logInterp(T, nodes[nodes.length - 2], nodes[nodes.length - 1]);
}
/* Solid–vapor pressure below the triple point, for substances with a measured
   1-atm sublimation point: linear in ln p against 1/T through (tsub, 1 atm) and the triple point. */
export function sublimationPressure(sub, T) {
  const c = sub.curves;
  if (!c || c.tsubK == null || T >= c.ttK) return null;
  return logInterp(T, [c.tsubK, ATM], [c.ttK, c.ptPa]);
}

export function phaseAt(sub, T, p = ATM) {
  const tdec = decompositionPoint(sub);
  if (tdec !== null && T >= tdec) return "decomposed";
  const at1atm = Math.abs(p - ATM) < 1;
  const c = sub.curves;
  if (!c) return at1atm ? phaseAt1atm(sub, T) : "unknown";
  if (T >= c.tcK) return p >= c.pcPa ? "supercritical" : "GAS";
  const tMelt = meltingPoint(sub) ?? c.ttK;
  if (sub.noSolidBelowPa && p < sub.noSolidBelowPa) {
    const ps = vaporPressure(sub, T);
    return p < ps ? "GAS" : "WATER";
  }
  if (T < c.ttK) {
    if (p >= c.ptPa) return T < tMelt ? "ICE" : "WATER";
    const ps = sublimationPressure(sub, T);
    if (ps === null) return at1atm ? phaseAt1atm(sub, T) : "unknown";
    return p < ps ? "GAS" : "ICE";
  }
  const ps = vaporPressure(sub, T);
  if (p < ps) return "GAS";
  return T < tMelt ? "ICE" : "WATER";
}

/* The 1-atm ladder as readable intervals, e.g. ICE < 273.15 K ≤ WATER < 373.12 K ≤ GAS. */
export function ladderText(sub, digits = 2) {
  const { start, steps } = sub.ladder1atm;
  let out = start;
  for (const s of steps) out += ` < ${s.atK.toFixed(digits)} K ≤ ${s.to}`;
  const final = lastState(sub.ladder1atm);
  if (final !== "GAS" && final !== "decomposed" && steps.length) out += " (higher transitions not pinned)";
  return out;
}

/* ── Reactions: mass balance ──────────────────────────────────────────
   "2 H2 + O2 -> 2 H2O". Species are separated by " + " (spaces required, so a
   charge such as ^+ is never read as a separator); the arrow is ->, →, or =. */
export function parseReaction(text) {
  const sides = String(text).split(/\s*(?:->|→|=)\s*/);
  if (sides.length !== 2) return { ok: false, error: "a reaction needs exactly one arrow" };
  const side = s => s.split(/\s+\+\s+/).map(term => {
    const match = /^(\d+(?:\.\d+)?)?\s*(.+)$/.exec(term.trim());
    const coefficient = match[1] ? Number(match[1]) : 1;
    const parsed = parseFormula(match[2]);
    return { coefficient, formula: match[2], parsed };
  });
  const left = side(sides[0]), right = side(sides[1]);
  const bad = [...left, ...right].find(t => !t.parsed.ok);
  if (bad) return { ok: false, error: `${bad.formula}: ${bad.parsed.error}` };
  return { ok: true, left, right };
}
export function balance(reaction) {
  const total = terms => terms.reduce((acc, t) => {
    for (const [s, n] of Object.entries(t.parsed.counts)) acc.counts[s] = round12((acc.counts[s] || 0) + n * t.coefficient);
    acc.charge += t.parsed.charge * t.coefficient;
    return acc;
  }, { counts: {}, charge: 0 });
  const L = total(reaction.left), R = total(reaction.right);
  const symbols = [...new Set([...Object.keys(L.counts), ...Object.keys(R.counts)])].sort();
  const differences = {};
  for (const s of symbols) { const d = round12((R.counts[s] || 0) - (L.counts[s] || 0)); if (d) differences[s] = d; }
  return { balanced: !Object.keys(differences).length && L.charge === R.charge, left: L, right: R, differences };
}

/* ── The pinned data file ─────────────────────────────────────────────
   canonicalText: the exact text whose SHA-256 the data file records (the four
   data sections, serialized by JSON.stringify). formatJson: the layout the file is
   stored in, with arrays of plain values kept on one line. */
export function canonicalText(data) {
  return JSON.stringify({ atomicWeights: data.atomicWeights, registry: data.registry, reactions: data.reactions, phaseTestPoints: data.phaseTestPoints });
}
export function formatJson(value, indent = 0) {
  const plain = v => v === null || typeof v !== "object";
  const pad = " ".repeat(indent), inner = " ".repeat(indent + 2);
  if (plain(value)) return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    if (value.every(plain)) return `[${value.map(v => JSON.stringify(v)).join(", ")}]`;
    return `[\n${value.map(v => inner + formatJson(v, indent + 2)).join(",\n")}\n${pad}]`;
  }
  const keys = Object.keys(value);
  if (!keys.length) return "{}";
  if (keys.every(k => plain(value[k])) && JSON.stringify(value).length <= 140) {
    return `{${keys.map(k => `${JSON.stringify(k)}: ${JSON.stringify(value[k])}`).join(", ")}}`;
  }
  return `{\n${keys.map(k => `${inner}${JSON.stringify(k)}: ${formatJson(value[k], indent + 2)}`).join(",\n")}\n${pad}}`;
}
