# Frontier Residency — Max-Capacity Study (v3)

**APN 30055004 • "Hacker hostel" thought experiment, cost-unlimited • 2026-10-17**

Directives locked this round: **(1)** cost-unlimited, fit as many beds in as large a house as possible — think the possibility through properly; **(2)** bermed underground wing (north cut / south walk-out); **(3)** BYO rented compute + on-site demo closet only; **(4)** 30+ day cohorts (no STR license).

---

## 1. The question you actually asked

> "I can connect to equipment remotely — I just need to provide a residency location. Am I off base?"

**No. You're right, and it's the unlock.** Residents rent GPUs ($2–4/hr neocloud, spot lower), Starlink moves checkpoints, and the parcel stops needing a compute plant at all. The product is **beds + Mbps + power + quiet + program**. That deletes GPU capex, cooling plant, fuel-driven PUE, and hardware depreciation from the model entirely. The lab identity survives as: brand, community programming, and a **demo closet** (1–2 nodes, ~$15–25k) in the lower level.

## 2. Bed-ceiling constraint stack

| Rung | What it takes | Binding constraint | Verdict |
|---|---|---|---|
| **30 beds** | 4,500 gpd septic (engineered LOS), ~16 spaces, small staff | CUP + PERC | Comfortable — fits with everything else |
| **48 beds** | 7,200 gpd LOS, ~24 spaces, 4–6 FTE, sprinklers | CUP + PERC + **yield test** (actual ≈ 4,200 gpd ✓ within 6 gpm) | **Operating target** — designed this |
| **60 beds** | 9,000 gpd LOS (field + reserve ≈ 0.7 ac SW), ~30 spaces | PERC must be *good*; actual ≈ 5,500 gpd = **at the well's edge** → 2nd well likely | **Designed capacity / CUP ask** |
| **72 beds** | 10,800 gpd, road widening, fire-flow upgrade, 2nd well certain | Road agreement + well | Site maximum — diminishing returns, don't |

Floor area and coverage are **not** the limits (a 3-storey house is small on 5 ac at 35% coverage). The civil systems are the limits: **PERC → yield → road**, in that order.

## 3. The max house (drawn: `clean-sheet/RESIDENCY_V3_SITE_PLAN.png` + `RESIDENCY_V3_SECTION.png`)

- **Footprint 11,220 SF × 3 storeys (34′ < 35′)** + **bermed lower level 6,300 SF** = ~40,000 SF total
- **60 beds designed / 48 operated at CUP:** L1 quiet garden-level pods 12 · L2 dorm pods 24 · L3 suites/private 24
- L1 commons/kitchen/program/ops · south walk-out deck · demo closet + MDF + mech in the bermed end
- Coverage **24% < 35%** · ADU retained as PFR/premium · barn = amenity (sauna/events) + 50 kW PV · greenhouse feeds commons
- Drive: gate → east spine → 92′ motor court, **still zero culvert** (swale rerouted west of house through the barn/house bench)
- Parking 24 (0.5/bed — long-stay residents arrive once) · 30k-gal fire cistern + NH hydrant + 20′ fire lane
- Interceptor swale 1.9% → SE vernal retention, all flow on-parcel

**Underground (bermed per your pick):** only ~4′ of natural fall crosses the house, so cut/fill manufactures the walk-out — north 3 walls in constant **55 °F earth** (near-zero LL heating, 30–40% house heating cut), WUI/fire refuge, dark-sky compliant (no light on earth faces), dead-quiet sleep pods. Non-negotiables: geotech probe first (basalt depth = cost), passive radon riser day one, sump for the envelope, **two remote exits + sprinklers + egress windows** (standard IFC), one lift station (below-grade kills gravity — accepted).

## 4. Systems at max

| System | 48-bed operating spec |
|---|---|
| Waste | ADEQ R18-9 large OSSE: 7,200 gpd sized (150/BR), field + 100% reserve ≈ 0.7 ac SW, engineered + O&M contract |
| Water | actual ≈ 70 gpd/bed + commons 30% ≈ 4,200 gpd · 500′ well + 15k-gal cistern · **yield test gates >48** · ADWR exemption check at commercial volume |
| Fire | IFC: sprinklers, fire alarm, 30k-gal + hydrant, 20′ lane, 92′ court, 60′ defensible |
| Power | lodging only (no compute plant): ~60–80 kW peak · PV 50+60 kW, BESS 240 kWh, 60 kW gen = life-safety |
| Connectivity | **the product**: 3× LEO bonded + LTE failover, 10 GbE internal, ~10–20 Mbps/seat peak — spec it like the well |
| Ops | 4–6 FTE + van shuttle (6 mi dirt), hospitality-grade, not self-managed |

## 5. Honest economics (this is what "properly" means)

Bed revenue at 30+ day cohort pricing: dorm **$1,100** / suite **$1,500** / private **$1,900** per bed-mo.

| | 48 operated | 60 designed |
|---|---|---|
| GPR | ~$69k/mo → **$700k/yr @ 85%** | ~$87k/mo → $885k/yr |
| OpEx (staff/utilities/ins/road/maint) | −$400–460k | −$470–540k |
| **NOI** | **+$240–300k** | **+$300–360k** |
| Construction (cost-unlimited class) | **$16–20M** ($300–450k/key new-build hospitality curve; bermed LL adds premium) | same house |
| **Cap rate** | **1.3–1.9%** | ~1.6–2.0% |

**The finding:** the stars *do* align operationally — demand, Starlink, remote compute, your off-grid site all work, and the design physically fits (24% coverage). **The mismatch is construction cost vs. long-stay bed economics:** $1,100–1,900/bed-mo cannot carry a $16–20M mansion; nightly hotels at $180–260 ADR can. Cost-unlimited builds an impressive asset, not a deal.

Ways the math closes (pick before drawing further):
1. **Phase the shell:** build 2 storeys + LL now (~40 beds), frame the 3rd floor for later — cuts ~$4–6M;
2. **Program income on top:** eval retreats, events, workshops, F&B, sauna (+30–50% revenue → 3–4% cap);
3. **Owner-occupied share:** you consume part (PFR + premium suites) and monetize the rest;
4. **Accept HQ/consumption asset** — the residency offsets carrying cost rather than returning venture yields;
5. Or **stay at the v2 scale** ($850k plan, 6–10 beds) which pencils at 8–10% — the ladder you were originally offered.

## 6. Gate sequence (money in this order)

1. **PERC test** (soil) — decides septic type + real bed ceiling
2. **Well yield test 72 hr** — decides 48 vs 60 vs second well
3. **Geotech probe** — basalt depth → bermed LL method + cost
4. **County pre-app** — AR-5 lodging CUP + traffic/road maintenance agreement (second-biggest fight after density)
5. **Capital decision** — which of the five math-closers above
6. Then: ALTA/NSPS, engineered LOS + C-101, building permit

## 7. Files

- `clean-sheet/RESIDENCY_V3_SITE_PLAN.png` — max campus plan (this design)
- `clean-sheet/RESIDENCY_V3_SECTION.png` — section A-A: bermed LL, exits, thermal, bed tally
- `scripts/generate_residency_v3.py` — regenerator
- Superseded-but-kept alternatives: clean-sheet v2 (6-bed + lab), AI lab sheets, original pro forma

**Not legal/engineering advice — Coconino Community Development + ADEQ + AZ PE/RLS at submittal.**
