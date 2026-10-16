"""Build research/data/compound-bodies.json, the pinned reference data for the
compound-body model (research/neural-atomic-bodies-insurance-requirements.md,
Section 4.11 and Appendix E).

Extraction only: nothing here runs at check time. The evidence script and the
tests read the committed JSON with Node and need none of these packages.

    python3 -m venv .venv-compounds
    .venv-compounds/bin/pip install chemicals==1.5.2 CoolProp==8.0.0 periodictable==2.1.0 mendeleev==1.3.0
    .venv-compounds/bin/python scripts/build-compound-bodies.py

The packages' wheel hashes are recorded in the output's provenance block; a
rebuild with the same wheels reproduces the committed file byte for byte. The
final step calls Node to lay the file out and record its canonical SHA-256,
exactly as scripts/nab-compounds.mjs computes it.
"""
import csv, json, os, math, datetime, subprocess
import chemicals
import CoolProp.CoolProp as CP
from mendeleev import element
import periodictable as pt
from chemicals.identifiers import search_chemical

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUTPUT = os.path.join(ROOT, 'research', 'data', 'compound-bodies.json')
BASE = os.path.dirname(chemicals.__file__)
def load_tsv(rel, key='CAS'):
    out = {}
    with open(os.path.join(BASE, rel), encoding='utf-8') as f:
        for row in csv.DictReader(f, delimiter='\t'):
            k = (row.get(key) or '').strip()
            if k: out.setdefault(k, row)
    return out
def cas_from_int(s):
    s = s.strip()
    return s if '-' in s else f"{s[:-3]}-{s[-3:-1]}-{s[-1]}"
CRC_IN = load_tsv('Misc/Physical Constants of Inorganic Compounds.csv')
CRC_ORG = load_tsv('Misc/Physical Constants of Organic Compounds.csv')
WEB = {cas_from_int(k): v for k, v in load_tsv('Misc/webbook_constants.tsv').items()}
CC = {cas_from_int(k): v for k, v in load_tsv('Misc/common_chemistry_data.tsv').items()}
YAWS = load_tsv('Phase Change/Yaws Boiling Points.tsv')
MATHEWS = load_tsv('Critical Properties/Mathews1972InorganicCriticalProps.tsv')

def num(x):
    try:
        v = float(x)
        return v if math.isfinite(v) and v > 0 else None
    except (TypeError, ValueError):
        return None
def r4(v): return None if v is None else round(v, 4)

def alternatives(cas, kind):
    """Every other tabulated value for one transition (kind 'Tm' or 'Tb')."""
    alt = {}
    for label, db in (('CRC', CRC_IN), ('CRC (organic)', CRC_ORG), ('NIST WebBook', WEB), ('CAS Common Chemistry', CC)):
        if cas in db and num(db[cas].get(kind)) is not None: alt[label] = r4(num(db[cas][kind]))
    if kind == 'Tb' and cas in YAWS and num(YAWS[cas].get('Tb')) is not None: alt['Yaws'] = r4(num(YAWS[cas]['Tb']))
    return alt

def coolprop(fluid):
    tt, ptp, tc, pc = (CP.PropsSI(k, fluid) for k in ('Ttriple', 'ptriple', 'Tcrit', 'pcrit'))
    tb = CP.PropsSI('T', 'P', 101325, 'Q', 0, fluid)
    return dict(ttK=r4(tt), ptPa=round(ptp, 3), tcK=r4(tc), pcPa=round(pc, 1)), r4(tb)

# id, name, formula as written, CAS, kind, details
SUBSTANCES = [
  # elements and homonuclear molecules
  dict(id='helium', name='Helium', formula='He', cas='7440-59-7', fluid='Helium', start='WATER', melt=None,
       notes=['No solid at 1 atm: helium stays liquid down to absolute zero and solidifies only under about 25 atm (2.53 MPa) [Britannica].',
              'CoolProp reports the lambda point (2.1768 K) as its triple point; helium has no solid-liquid-vapor triple point. The vapor curve still passes through it.'],
       noSolidBelowPa=2533125.0),
  dict(id='hydrogen', name='Hydrogen', formula='H2', cas='1333-74-0', fluid='Hydrogen', melt=('CRC', 13.99)),
  dict(id='nitrogen', name='Nitrogen', formula='N2', cas='7727-37-9', fluid='Nitrogen', melt=('CRC', 63.15)),
  dict(id='oxygen', name='Oxygen', formula='O2', cas='7782-44-7', fluid='Oxygen', melt=('CRC', 54.36)),
  dict(id='fluorine', name='Fluorine', formula='F2', cas='7782-41-4', fluid='Fluorine', melt=('CRC', 53.48)),
  dict(id='bromine', name='Bromine', formula='Br2', cas='7726-95-6', melt=('CRC', 265.95), boil=('CRC', 331.95)),
  dict(id='mercury', name='Mercury', formula='Hg', cas='7439-97-6', melt=('CRC', 234.321), boil=('CRC', 629.769)),
  dict(id='gallium', name='Gallium', formula='Ga', cas='7440-55-3', melt=('CRC', 302.9146), boil=('CRC', 2502.15),
       notes=['The melting point of gallium (302.9146 K, 29.7646 °C) is a defining fixed point of the International Temperature Scale of 1990; tabulated boiling points range from 2477 K to 2673 K.']),
  dict(id='iron', name='Iron', formula='Fe', cas='7439-89-6', melt=('CRC', 1811.15), boil=('CRC', 3134.15),
       notes=['The solid allotropes (alpha, gamma, delta) are all ICE here; only the state of matter is modeled.']),
  # compounds
  dict(id='water', name='Water', formula='H2O', cas='7732-18-5', fluid='Water', melt=('CRC', 273.15)),
  dict(id='heavy-water', name='Heavy water (deuterium oxide)', formula='D2O', cas='7789-20-0', fluid='HeavyWater', melt=('CRC', 276.97),
       notes=['D is hydrogen-2. It takes the Hydrogen class; its mass is the isotope mass, not the standard atomic weight of hydrogen.']),
  dict(id='carbon-dioxide', name='Carbon dioxide', formula='CO2', cas='124-38-9', fluid='CarbonDioxide', sublimes=('Yaws', 194.67),
       notes=['Sublimes at 1 atm: the triple-point pressure (517,964 Pa) is above 101,325 Pa, so there is no liquid at 1 atm.',
              'CoolProp returns 185.10 K for the saturation temperature at 101,325 Pa. That is an extrapolation below the triple point, not a boiling point.',
              'The CRC organic table lists 216.589 K as a melting point; that is the triple point at 5.2 bar, not a melting point at 1 atm.']),
  dict(id='methane', name='Methane', formula='CH4', cas='74-82-8', fluid='Methane', melt=('CRC (organic)', 90.6934)),
  dict(id='ammonia', name='Ammonia', formula='NH3', cas='7664-41-7', fluid='Ammonia', melt=('CRC', 195.42)),
  dict(id='carbon-monoxide', name='Carbon monoxide', formula='CO', cas='630-08-0', fluid='CarbonMonoxide', melt=('CRC', 68.13)),
  dict(id='hydrogen-fluoride', name='Hydrogen fluoride', formula='HF', cas='7664-39-3', melt=('CRC', 189.79), boil=('CRC', 293.15),
       notes=['Boils near room temperature: tabulated normal boiling points run from 292.67 K to 293.15 K, all below 298.15 K, so it is a gas at 25 °C and a liquid at 15 °C.']),
  dict(id='hydrogen-chloride', name='Hydrogen chloride', formula='HCl', cas='7647-01-0', fluid='HydrogenChloride', melt=('CRC', 158.98)),
  dict(id='sodium-chloride', name='Sodium chloride', formula='NaCl', cas='7647-14-5', melt=('CRC', 1073.85), boil=('CRC', 1738.15)),
  dict(id='ethanol', name='Ethanol', formula='C2H5OH', cas='64-17-5', fluid='Ethanol', melt=('CRC (organic)', 159.01)),
  dict(id='dimethyl-ether', name='Dimethyl ether', formula='CH3OCH3', cas='115-10-6', fluid='DimethylEther', melt=('CRC (organic)', 131.66),
       notes=['Same molecular formula as ethanol (C2H6O); a gas at 25 °C where ethanol is a liquid.']),
  dict(id='iron-pentacarbonyl', name='Iron pentacarbonyl', formula='Fe(CO)5', cas='13463-40-6', melt=('CRC', 252.65), boil=('CRC', 376.15),
       notes=['A liquid iron compound. Heat decomposes it to iron and carbon monoxide, the route to carbonyl iron powder [Nature Sci. Rep. 2015].']),
  dict(id='xenon-difluoride', name='Xenon difluoride', formula='XeF2', cas='13709-36-9', sublimes=('Yaws', 387.5),
       notes=['A compound of a noble gas. Noble-gas compounds have been known since 1962 [Wikipedia, Noble gas].',
              'Sources disagree above 380 K: a 1-atm sublimation point of 387.5 K (Yaws), a triple point of 402.5 K (NIST WebBook), and a boiling point of 155 °C in some vendor sheets. The state at 25 °C (solid) is the same under every source.']),
  dict(id='uranium-hexafluoride', name='Uranium hexafluoride', formula='UF6', cas='7783-81-5', sublimes=('Yaws', 329.65),
       curves=dict(ttK=337.15, ptPa=150000.0, tcK=505.8, pcPa=4660950.0, source='WNTI fact sheet (triple point 64 °C and 1.5 bar); Mathews 1972 via chemicals 1.5.2 (critical point)'),
       notes=['Sublimes at 56.5 °C at atmospheric pressure; liquid only above the triple point, 64 °C and 1.5 bar [WNTI; Wikipedia].']),
  dict(id='uranium-tetrafluoride', name='Uranium tetrafluoride', formula='UF4', cas='10049-14-6', melt=('CRC', 1309.15), boil=('CRC', 1690.15)),
  dict(id='uranium-dioxide', name='Uranium dioxide', formula='UO2', cas='1344-57-6', melt=('CRC', 3120.15), boil=None,
       notes=['No boiling point is pinned, so the 1-atm ladder ends at the melting point.']),
  dict(id='copper-sulfate-pentahydrate', name='Copper(II) sulfate pentahydrate', formula='CuSO4·5H2O', cas='7758-99-8', decomposes=('Wikipedia', 336.15),
       notes=['Decomposes before melting: it loses two water molecules at 63 °C, two more at 109 °C, and the last at 200 °C [Wikipedia, Copper(II) sulfate].']),
  dict(id='copper-sulfate', name='Copper(II) sulfate (anhydrous)', formula='CuSO4', cas='7758-98-7', decomposes=('CAS Common Chemistry', 863.15),
       notes=['Decomposes before melting; fully decomposed at 590 °C [Wikipedia, Copper(II) sulfate].']),
]

registry = []
for s in SUBSTANCES:
    meta = search_chemical(s['cas'])
    entry = dict(id=s['id'], name=s['name'], formula=s['formula'], cas=s['cas'], pubchemCid=int(meta.pubchemid),
                 inchiKey=meta.InChI_key, pubchemFormula=meta.formula, pubchemMolarMass=round(meta.MW, 6))
    steps = []
    curves = None
    if s.get('fluid'):
        curves, tb = coolprop(s['fluid'])
        curves['source'] = f"CoolProp {CP.get_global_param_string('version')} ({s['fluid']})"
        entry['coolpropFluid'] = s['fluid']
    start = s.get('start', 'ICE')
    if s.get('melt'):
        src, v = s['melt']
        alts = {k: x for k, x in alternatives(s['cas'], 'Tm').items() if k != src}
        steps.append(dict(atK=v, to='WATER', source=src, alternatives=alts))
    if s.get('sublimes'):
        src, v = s['sublimes']
        alts = {k: x for k, x in alternatives(s['cas'], 'Tb').items() if k != src}
        steps.append(dict(atK=v, to='GAS', kind='sublimation', source=src, alternatives=alts))
        if curves is not None: curves['tsubK'] = v
    if s.get('decomposes'):
        src, v = s['decomposes']
        steps.append(dict(atK=v, to='decomposed', source=src, alternatives={}))
    if s.get('fluid') and not s.get('sublimes'):
        alts = {k: x for k, x in alternatives(s['cas'], 'Tb').items()}
        steps.append(dict(atK=tb, to='GAS', source=curves['source'].split(' (')[0], alternatives=alts))
    elif s.get('boil'):
        src, v = s['boil']
        alts = {k: x for k, x in alternatives(s['cas'], 'Tb').items() if k != src}
        steps.append(dict(atK=v, to='GAS', source=src, alternatives=alts))
    if s.get('curves'):
        curves = dict(s['curves'])
        if s.get('sublimes'): curves['tsubK'] = s['sublimes'][1]
    entry['ladder1atm'] = dict(start=start, steps=steps)
    if curves: entry['curves'] = curves
    if s.get('noSolidBelowPa'): entry['noSolidBelowPa'] = s['noSolidBelowPa']
    if s.get('notes'): entry['notes'] = s['notes']
    registry.append(entry)

reactions = [
  dict(id='water-formation', equation='2 H2 + O2 -> 2 H2O', note='Hydrogen burns in oxygen to water.', source='Stoichiometry'),
  dict(id='haber-bosch', equation='N2 + 3 H2 -> 2 NH3', note='Ammonia synthesis.', source='Stoichiometry'),
  dict(id='uf4-from-uo2', equation='UO2 + 4 HF -> UF4 + 2 H2O', note='Conversion step of the nuclear fuel cycle.', source='https://en.wikipedia.org/wiki/Uranium_hexafluoride'),
  dict(id='uf6-from-uf4', equation='UF4 + F2 -> UF6', note='Fluorination to the enrichment feed.', source='https://en.wikipedia.org/wiki/Uranium_hexafluoride'),
  dict(id='copper-sulfate-dehydration', equation='CuSO4·5H2O -> CuSO4 + 5 H2O', note='Dehydration on heating, complete by 200 °C.', source='https://en.wikipedia.org/wiki/Copper(II)_sulfate'),
  dict(id='carbonyl-iron', equation='Fe(CO)5 -> Fe + 5 CO', note='Thermal decomposition to carbonyl iron.', source='https://www.nature.com/articles/srep15139'),
  dict(id='negative-control', equation='H2 + O2 -> H2O', note='Deliberately unbalanced: one oxygen atom is unaccounted for.', source='Negative control'),
]
for r in reactions: r['balanced'] = r['id'] != 'negative-control'

# Phase test points from CoolProp's equations of state (liquid, gas, supercritical; no solids).
LABEL = {'liquid': 'WATER', 'gas': 'GAS', 'supercritical': 'supercritical', 'supercritical_gas': 'GAS', 'supercritical_liquid': 'WATER'}
points = []
for e in registry:
    fl = e.get('coolpropFluid')
    if not fl: continue
    c = e['curves']; tt, tc, pc = c['ttK'], c['tcK'], c['pcPa']
    temps = [tt + f * (tc - tt) for f in (0.25, 0.5, 0.85)] + [1.15 * tc]
    if tt + 0.2 * (tc - tt) < 298.15 < 0.97 * tc: temps.append(298.15)
    for T in temps:
        T = round(T, 3)
        if T < tc:
            ps = CP.PropsSI('P', 'T', T, 'Q', 0, fl)
            cands = [0.5 * ps, 2 * ps] + ([101325.0] if abs(101325.0 / ps - 1) > 0.25 else [])
            cands = [p for p in cands if p <= 2 * pc]
        else:
            ps = None
            cands = [0.5 * pc, 2 * pc, 101325.0]
        for p in cands:
            p = float(f"{p:.6g}")
            phase = CP.PhaseSI('T', T, 'P', p, fl)
            points.append([e['id'], T, p, LABEL[phase], phase, None if ps is None else float(f"{ps:.6g}")])

# Standard atomic weights: IUPAC 2021 (Prohaska et al. 2022) as carried by periodictable 2.1.0,
# cross-checked against mendeleev 1.3.0, which still carries pre-2021 values for a few elements.
NO_STANDARD = {43, 61} | set(range(84, 90)) | set(range(93, 119))
weights, mismatches = {}, []
for z in range(1, 119):
    e = element(z)
    p = pt.elements[z]
    weights[p.symbol] = p.mass
    if abs(e.atomic_weight - p.mass) > 1e-6 and z not in NO_STANDARD: mismatches.append([p.symbol, p.mass, e.atomic_weight])
weights['D'] = round(pt.D.mass, 11)
weights['T'] = round(pt.T.mass, 11)

data = {
  "schema": "harshalos-nab-compound-bodies-v1",
  "purpose": "Pinned reference data for the compound-body model in research/neural-atomic-bodies-insurance-requirements.md Section 4.11 and Appendix E: atomic weights for molar masses, a registry of real substances with measured phase-transition data, balanced reactions, and equation-of-state check points for the physical-phase classifier. Physical data only; NAB tiers and phase eligibility come from js/nab-sectors.js and the Appendix A matrix.",
  "provenance": {
    "retrieved": datetime.date(2026, 10, 15).isoformat(),
    "builder": "scripts/build-compound-bodies.py",
    "packages": [
      {"name": "chemicals", "version": "1.5.2", "licence": "MIT", "wheel": "chemicals-1.5.2-py3-none-any.whl", "sha256": "f85ef7f36e77fee634686c26562929ee61026cd548d89cebd57b2251ca843d6e",
       "used": "PubChem-derived identifiers (CID, formula, molar mass, InChIKey); tabulated transition temperatures from the CRC Handbook tables, NIST WebBook, CAS Common Chemistry, and Yaws; critical points from Mathews (1972)"},
      {"name": "CoolProp", "version": "8.0.0", "licence": "MIT", "wheel": "coolprop-8.0.0-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.whl", "sha256": "e9bb1d10df8a1b29ba1387f3e7896f7878ec16e3af46b06f82831150bacb7a39",
       "used": "triple and critical points, normal boiling points, and the phase test points, from the reference equations of state"},
      {"name": "periodictable", "version": "2.1.0", "licence": "public domain (NIST)", "wheel": "periodictable-2.1.0-py3-none-any.whl", "sha256": "e9155d2bf5ac10050abeff2f99096d4f04312c0c8a6bb432e28744367c5064b3",
       "used": "standard atomic weights (IUPAC 2021, Prohaska et al. 2022, doi:10.1515/pac-2019-0603; for elements with no standard atomic weight, the mass number of the most stable isotope) and the isotope masses of D and T (AME2020)"},
      {"name": "mendeleev", "version": "1.3.0", "licence": "MIT", "wheel": "mendeleev-1.3.0-py3-none-any.whl", "sha256": "76f415767b654634e51dead755513ef431abf200e892eab8468aa659ff218d1c",
       "used": "cross-check of every standard atomic weight"}
    ],
    "web": {
      "Britannica": "https://www.britannica.com/science/helium-chemical-element",
      "WNTI": "https://www.wnti.co.uk/wp-content/uploads/2021/09/WNTI_Fact_Sheet_UF6_v3.pdf",
      "Wikipedia, Uranium hexafluoride": "https://en.wikipedia.org/wiki/Uranium_hexafluoride",
      "Wikipedia, Copper(II) sulfate": "https://en.wikipedia.org/wiki/Copper(II)_sulfate",
      "Wikipedia, Noble gas": "https://en.wikipedia.org/wiki/Noble_gas",
      "Nature Sci. Rep. 2015": "https://www.nature.com/articles/srep15139"
    },
    "conditions": "Temperatures in kelvin, pressures in pascal. ladder1atm gives the state of matter at 101,325 Pa: the state below the first step, then each step's temperature and the state above it. curves gives the triple point (tt, pt), the critical point (tc, pc), and for substances that sublime at 1 atm the sublimation point (tsub).",
    "atomicWeightCrossCheck": {"agreeingElements": 118 - len(NO_STANDARD) - len(mismatches), "tolerance": 1e-6,
      "differences": [{"symbol": s, "iupac2021": a, "mendeleev130": b} for s, a, b in mismatches],
      "note": "The IUPAC 2021 table changed the values for Ar and Hf and the uncertainties (and so the stated digits) for Y, Rh, and Tb; mendeleev 1.3.0 still carries the earlier values. None of the five occurs in the registry."},
    "noStandardAtomicWeight": sorted(element(z).symbol for z in NO_STANDARD),
    "knownIssues": [
      "A formula is not a substance: ethanol and dimethyl ether share C2H6O. The registry is keyed by CAS RN, and the formula must agree with the record.",
      "Tabulated values differ between sources; each step keeps the alternatives, and the script checks that the state at 25 °C does not depend on which source is used.",
      "Equations of state extrapolate below the triple point without complaint (CoolProp gives CO2 a 'boiling point' of 185.10 K at 1 atm); the classifier never uses a liquid-vapor curve below the triple point.",
      "Off 1 atm, vapor and sublimation pressures are interpolated linearly in ln p against 1/T between the triple, normal, and critical points, and melting lines are taken as vertical. Classifications near a phase boundary are approximate; the phase test points measure how approximate."
    ]
  },
  "atomicWeights": weights,
  "registry": registry,
  "reactions": reactions,
  "phaseTestPoints": {"columns": ["substance", "T_K", "p_Pa", "expected", "coolpropPhase", "coolpropSaturationPressure_Pa"], "rows": points},
  "canonicalSha256": None
}
with open(OUTPUT, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)
NODE = """
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { canonicalText, formatJson } from "./scripts/nab-compounds.mjs";
const file = "research/data/compound-bodies.json";
const data = JSON.parse(readFileSync(file, "utf8"));
data.canonicalSha256 = createHash("sha256").update(canonicalText(data)).digest("hex");
writeFileSync(file, formatJson(data) + "\\n");
console.log(data.canonicalSha256);
"""
subprocess.run(['node', '--input-type=module', '-e', NODE], cwd=ROOT, check=True)
print(json.dumps({"atomicWeightDifferences": mismatches, "registry": len(registry), "phaseTestPoints": len(points)}))
