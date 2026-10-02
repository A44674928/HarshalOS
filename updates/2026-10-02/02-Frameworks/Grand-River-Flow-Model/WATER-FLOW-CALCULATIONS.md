# Grand River model — water-flow and energy calculations

**Revision:** 2026-10-02 recalibration · **Provenance:** `DERIVATIVE_BUILD` calculations from fictional planning assumptions  
**Boundary:** This is screening arithmetic, not an engineering design, allocation, environmental review, permit, or feasibility finding.

> **Use:** [`CANONICAL-NUMBERS.md`](./CANONICAL-NUMBERS.md) is the single current numbers card. The prior version of this file labeled unsupported assumptions as “comprehensive engineering calculations”; that label and its conflicting tables are withdrawn. Reproducible current values are emitted by [`recalculate.py`](./recalculate.py).

## 1. Source workbook line

Pipeline assumptions: 50,000,000 US gallons/day; 60-inch nominal diameter; 350-mile path; Hazen–Williams `C=140`; 4,000-foot assumed static lift (separate from the dam-series head goals); pump efficiency 0.85; motor efficiency 0.95.

```text
Q = 50,000,000 × 0.003785411784 / 86,400
  = 2.190631819 m³/s

L = 350 × 1,609.344 = 563,270.4 m
D = 60 × 0.0254 = 1.524 m
hf = 10.67 L Q^1.852 / (C^1.852 D^4.8704)
   ≈ 349.765 m  (Hazen–Williams screening estimate)

H_static = 4,000 × 0.3048 = 1,219.2 m
H_total ≈ H_static + hf = 1,568.965 m
P_electric = ρ g Q H_total / (η_pump η_motor)
           ≈ 41.755 MW
```

Here `ρ=1,000 kg/m³` and `g=9.81 m/s²`. This calculation omits route elevation variation, fittings, transient/surge conditions, water treatment, desalination, standby, auxiliary load, uncertainty in pipe condition, and engineering design. The **4,000-foot hydro head** is a long-range fictional aggregate sensitivity, not a surveyed elevation, validated usable head, or net turbine head. The early 40–60-year aspiration is **1,200–2,500 ft cumulative head across distinct stages**. Neither range is a declaration that one wall of that height can be built; the fictional intent is a modular series along the Arizona reach, subject to future material, logistics, site, consent, and approval assumptions.

At 80 million people, this single baseline line is 189,270.6 m³/day / 80,000,000 = **2.366 L/person/day**, if every drop reached residents with no losses. It is therefore not a municipal supply design.

## 2. Annual-transfer sensitivity

The older 29.75-billion-m³/year aggregate regional target converts using a Julian year:

```text
Q_target = 29.75 × 10^9 / (365.25 × 86,400)
         = 942.720612 m³/s
N_lines  = ceil(Q_target / 2.190631819) = 431
Q_line   = Q_target / 431 = 2.187287 m³/s per line
```

Using the same route, diameter, coefficient, static head, and efficiency assumptions, the simplified aggregate pump input is **17.96 GW**, before treatment/desalination and other system loads. The parallel lines would total about **242,770 route-km**. If this entire flow later returns through a turbine across the same 1,219.2 m static drop, one 90%-efficient pass could conditionally recover **10.15 GW**, leaving **7.81 GW net electrical draw** before other loads. That recovery is unavailable if water is consumed or distributed elsewhere; it is not another water source or an extra credit against the separate historical-flow hydro case. This is a scale check that exposes the gap between the workbook baseline and the legacy regional target; it is not an endorsed build plan.

For comparison, `80,000,000 × 150 L/person/day` equals **12,000,000 m³/day = 4.38 km³/year** for municipal use alone. This allowance is illustrative, not a demand forecast. Industrial, agricultural, regional, leakage, and environmental requirements are additional and unvalidated.

## 3. Water mass balance

For each reservoir, treatment stage, serial conduit, or distribution branch:

```text
Q_in = Q_consumed/delivered + Q_out + Q_evaporation + Q_seepage/losses + d(storage)/dt
```

At steady state, storage change is zero. A serial pipeline with no branch or withdrawal cannot arbitrarily drop from 25,000 to 20,000 to 15,000 m³/s; those legacy labels are not mutually conserving and are superseded. If the network branches, every branch and return must be counted once. Do not add a recirculating flow again at each tier.

### Reservoir-only fill arithmetic

For an assumed fictional storage volume of 73 km³ and zero outlet, evaporation, seepage, treatment loss, or environmental release:

| Constant net inflow | `V/Q` fill time |
|---:|---:|
| Workbook line: 2.190632 m³/s | 385,691 days ≈ 1,056 Julian years |
| Annual-transfer average: 942.720612 m³/s | 896 days ≈ 2.45 Julian years |
| 5,000 m³/s sensitivity | 169 days |

These do not model filling while supplying users. `73 km³ ÷ 5,000 m³/s` is about 169 days—not four hours. The 5,000 m³/s rate is a sensitivity, not an established Colorado River or coastal supply.

## 4. Hydroelectric generation is not pipeline flow

Hydraulic power before conversion losses is `P_hydraulic = ρgQH_gross`; electric output is `P_electric = ρgQH_netη_turbine-generator`. At `Q=476 m³/s`, `H_gross=1,219.2m`, and `η=0.90`, gross hydraulic power is **5.693 GW** and the idealized electrical output is **5.124 GW** before net-head, availability, releases, and transmission adjustments. The 476 m³/s figure is a historical USGS Lees Ferry sample median for context; it is not a firm water supply or entitlement.

At the same gross head and efficiency:

| Flow sensitivity | Conditional output | Status |
|---:|---:|---|
| 5,000 m³/s | 53.82 GW | ~10.5× the 476 m³/s sample median; not an established supply |
| 25,000 m³/s | 269.11 GW | ~52.5× the sample median; not an established supply |

The 4,000-foot long-range gross-head calculation must not be presented as net head without a profile and loss model. A dam series cannot repeatedly credit the same elevation difference. Each turbine stage must have its own available `Q`, head drop, efficiency, and downstream balance; the early 1,200–2,500-foot phase range is cumulative across distinct drops, not a per-stage head.

The workbook's 80 × 50-MWe SMR entry is **4 GW assumed nameplate**, independent of hydro. Together with the context-case 5.124 GW hydro value, the conditional nameplate sum is **9.124 GW**. A stated 70% hydro and 90% SMR capacity-factor illustration gives about 63.0 TWh/year (~7.19 GW average); no capacity factor is validated here.

The 17.96 GW annual-transfer pumping sensitivity exceeds that combined nameplate before city load, and exceeds the illustrative average generation by about 10.77 GW. Pumping and generating are separate terms: `P_pump = ρgQH/(η_pumpη_motor)`, whereas turbine recovery is at most `ρgQHη`. Losses make a closed pump/turbine loop a net consumer. No 500-GW “Human-Reactor” output is supported; that phrase is retained only as a fictional social metaphor.

## 5. Reproducibility and sources

```bash
python3 recalculate.py
python3 recalculate.py --json
```

Source workbook assumptions and calculation code: [`01-grand-river-flow-model-v4.xlsx`](./01-grand-river-flow-model-v4.xlsx), [`recalculate.py`](./recalculate.py). Historical-flow context: [USGS Lees Ferry summary statistics](https://pubs.usgs.gov/wri/wri014255/results/stat/lees.htm) and [USGS Water Data Labs Colorado River Basin drought context](https://labs.waterdata.usgs.gov/visualizations/OWDI-drought/en/index.html). These sources do not establish current allocations, future yield, project flow, or feasibility.
