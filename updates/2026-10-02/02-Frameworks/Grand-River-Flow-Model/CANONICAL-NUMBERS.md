# Grand River Foundation & Mistveil City — canonical numbers card

**Revision:** 2026-10-02 recalibration · **Status:** canonical core reference for timeline, head, water, pipeline, and conditional hydro assumptions  
**Provenance:** project worldbuilding is `FICTION` (`NARRATIVE_SANDBOX`); arithmetic is a `DERIVATIVE_BUILD` from the assumptions below.  
**Classification:** planning-level concept only. **Not** an engineering design, feasibility finding, water-rights analysis, environmental review, permit, construction schedule, or claim that the described works can be built.

> **Use this card for the project's core numeric canon.** Use [`PROJECT-SCALE-UP-SHEET.md`](./PROJECT-SCALE-UP-SHEET.md) only for clearly labeled scenario calculations of portfolio output, city/infrastructure demand, land, water, and air; those illustrative assumptions do not override this card. Earlier delivery/specification files are preserved as vocabulary and design history. Their incompatible flow, energy, elevation, cost, fill-time, and “complete/ready to implement” claims are superseded. Reproducible core calculations: [`recalculate.py`](./recalculate.py). Scale-up inputs/calculator: [`project_scaleup_inputs.json`](./project_scaleup_inputs.json) and [`project_scaleup.py`](./project_scaleup.py). Book II remains the active fictional manuscript, not a technical specification.

## 1. Delivery timeline and canon

The 20-year intervals are **construction- and supply-chain planning windows**, not a physical limit or a cap on the desired build. The fictional works remain a modular series along the Arizona section of the Grand Canyon. As an early-phase aspiration over the first 40–60 years from the 2026 planning baseline (roughly 2066–2086), use **1,200–2,500 ft of cumulative gross head across distinct stages**; retain **4,000 ft as a long-range fictional aggregate target**. Neither figure is an individual dam-wall height, reservoir depth, surveyed elevation, or validated usable head. Individual works and reservoir pool elevations remain site-specific. Do not describe the entire series as completed in 2098.

| Planning window / marker | Fictional milestone | Mistveil population marker |
|---|---|---|
| 2026–2046 | Survey, consent, design, supply-chain development, and decision gates; target the **first operational dam-and-city module circa 2046**. This is a planning target, not a commitment or construction fact. | No city census target assigned at first operation. |
| 2046–2066 | First 20-year operating/expansion window; add modular works and civic districts. | No interim population target assigned. |
| 2066–2086 | Second expansion window; continue the modular series. | No interim population target assigned. |
| 2086–2106 | Third window; construction continues through the 2090s. **2098 is an interim commissioning/expansion milestone, not final completion.** | **~80 million residents by 2100** (the city target) |
| 2106 onward | Continue in 20-year planning windows while modules are useful and authorized; no final completion date is assigned. | Population beyond 2100 is intentionally unassigned here. |

**One Mistveil, two distinct counts:** the legacy Book II orientation described a system serving about **40 million people across three nations**. Preserve that only as an *illustrative regional service-population figure*, not as Mistveil City's resident census or its 2100 cap. Its overlap with city residents is unspecified, so do not add it to the 80-million city target or present it as a city count. Mistveil itself targets roughly **80 million residents by 2100**. Update downstream prose to keep the denominator explicit.

### Preserve Book II vocabulary

The fictional setting continues to use **Mistveil City**, **Grand River Foundation**, **Western Colonnade of Mutual Underwriting Houses**, the **119-NAB Ombudsman's Council**, the **Point-to-Point South Wall Copper Vault**, the **Spherical Orb Chamber**, and ℤ₃₆₀ / `0–359` addressing with the zero-degree closure. These narrative institutions and places do not establish real-world infrastructure or governance.

## 2. Mistveil population and vertical labels

The single 2100 target is **approximately 80 million Mistveil residents**. The following nine level names and allocations are a fictional planning distribution that sums to 80 million; they are not density, housing, or service-capacity findings.

| Level | Canonical name | Illustrative residents |
|---:|---|---:|
| 9 | Pinnacle | 2 million |
| 8 | Summit | 5 million |
| 7 | Overlook | 10 million |
| 6 | Horizon | 15 million |
| 5 | Threshold | 20 million |
| 4 | Foundation | 15 million |
| 3 | Depths | 8 million |
| 2 | Core | 3 million |
| 1 | Heart | 2 million |
| **Total** |  | **80 million** |

Use those level names consistently. Older `Celestial / Capitol / Rim / Canyon / Transition / Reservoir / Deep / Foundation / Abyssal` tiers and the alternative node-by-node flow allocations are legacy concept taxonomies, not a second current level system.

**Vertical datum:** no level receives an absolute elevation in this card. Future elevations must use one declared geodetic datum (NAVD 88 or its officially adopted successor) and a surveyed route/site. Older `+1,200m`, `-900m`, and tier-to-tier elevation tables are unverified relative sketches. The `1,219.2m` head below is a hypothetical energy-calculation input, **not** an elevation assignment to a city, rim, or dam foundation.

## 3. Water flow, pipeline, and reservoir

### Single baseline pipeline from the source workbook

| Assumption / result | Canonical value |
|---|---:|
| Workbook throughput | 50,000,000 US gal/day = **189,270.589 m³/day = 2.190632 m³/s** |
| Nominal inside diameter | 60 in = 1.524 m |
| Illustrative route length | 350 mi = 563.270 km (not surveyed; legacy workbook geometry) |
| Hazen–Williams coefficient | C = 140 (assumed, not measured) |
| Calculated friction head | **~349.8 m** for the single baseline line at stated flow |
| Assumed pipeline static lift | 4,000 ft = **1,219.2 m**; route datum/profile not surveyed; separate from dam-series head aspirations |
| Simplified total pump head | **~1,569.0 m** |
| Pump / motor efficiency | 85% / 95% (assumptions) |
| Electrical pumping input | **~41.76 MW** for one baseline line; excludes fittings, transients, treatment, desalination, standby, and auxiliary loads |
| Baseline flow divided across 80M residents | **~2.37 L/person/day**, if every drop went to residents with zero loss; plainly not a municipal supply plan |

Hazen–Williams is a screening approximation for this stated line. It is not a detailed hydraulic design and does not include changing elevations, fittings, surge, material selection, parallel manifolds, or operating controls.

### Fictional aggregate-transfer target and scale check

A legacy regional-delivery entry of 29.75 billion m³ per Julian year converts to **942.721 m³/s** continuously. If each line carried only the workbook baseline flow, that transfer would require **431 parallel 60-inch lines** under the same simplified assumptions: about **242,770 cumulative pipeline-km** and **17.96 GW of pumping input**. If the full transferred flow later returned through a turbine across the same assumed 1,219.2 m static drop, one 90%-efficient pass could recover at most **10.15 GW** in this simplified scenario, leaving **7.81 GW net electrical draw** before other loads. That recovery is unavailable if water is consumed or distributed elsewhere; it is not a second water source or a credit against the distinct historical-flow hydro case. This is a scale check, not a recommendation or feasibility result.

For comparison, an illustrative municipal allowance of 150 L/person/day for 80 million residents alone is **12 million m³/day = 4.38 billion m³/year**. This is not a demand forecast and excludes industry, agriculture, losses, and regional deliveries. It shows why the workbook's 50-million-gallon/day baseline cannot be described as serving the city.

### Reservoir and flow accounting

- Use **73 km³** as the fictional reservoir planning volume. It is a storage assumption only; geometry, operating range, dead storage, sediment, evaporation, seepage, and inflow/outflow balance are not designed.
- At a constant 5,000 m³/s and with zero outlet/losses, 73 km³ takes about **169 days** to fill. At 942.721 m³/s it takes about **896 days (2.45 Julian years)**. At the workbook baseline 2.190632 m³/s it takes about **385,691 days (1,056 Julian years)**. These are volume ÷ inflow arithmetic only.
- Filling while supplying users requires inflow above concurrent demand, environmental releases, evaporation, seepage, treatment reject, and other losses. A reservoir is not “filled” by counting the same recirculating water multiple times.
- Legacy **200 km³** storage and “four hours to fill” claims are superseded.

For every tier and branch, use a water balance such as:

```text
inflow = delivered/consumed + outflow + evaporation + seepage/losses + change in storage
```

For a serial line without withdrawals or branches, `Q_in = Q_out` (apart from explicitly modeled losses). The old 25,000 → 20,000 → 15,000 m³/s tier labels do not conserve water and are not current design flows. Never add those serial rates together. A 5,000 or 25,000 m³/s number is a sensitivity scenario only unless a source, allocation, and measured design flow are independently established.

## 4. Conditional energy budget

Hydro power depends on available flow, head, and losses:

```text
P_hydraulic = ρ g Q H_gross
P_electric  = ρ g Q H_net η_turbine-generator
```

The long-range sensitivity below uses `ρ = 1,000 kg/m³`, `g = 9.81 m/s²`, a **gross conceptual head** of 1,219.2 m (4,000 ft), and 90% turbine-generator efficiency. The first 40–60-year narrative phase separately aspires to 1,200–2,500 ft of cumulative gross head across distinct stages. The 476 m³/s flow is a **historical USGS Lees Ferry sample median used for context**, not a current guaranteed flow, water allocation, firm yield, or project entitlement. Net head will be less than gross head after hydraulic losses.

| Conditional case | Flow | Gross head | Gross hydraulic power `ρgQH` | Electrical at 90% of gross (before other losses) |
|---|---:|---:|---:|---:|
| Early-phase lower-head sensitivity | 476 m³/s | 365.76 m (1,200 ft) | **1.71 GW** | **1.54 GW** |
| Early-phase upper-head sensitivity | 476 m³/s | 762.0 m (2,500 ft) | **3.56 GW** | **3.20 GW** |
| Long-range historical-sample context | 476 m³/s | 1,219.2 m (4,000 ft) | **5.69 GW** | **5.12 GW** |
| High-flow sensitivity only | 5,000 m³/s | 1,219.2 m (4,000 ft) | **59.80 GW** | **53.82 GW** |
| Extreme sensitivity only | 25,000 m³/s | 1,219.2 m (4,000 ft) | **299.01 GW** | **269.11 GW** |

The 1,200- and 2,500-ft rows use the same historical-sample reference flow to illustrate the early-phase head range; they are not net-head estimates or water allocations. The 5,000 and 25,000 m³/s cases are not established Colorado River supplies; they are approximately 10.5× and 52.5× the cited 476 m³/s historical-sample median. A dam series cannot multiply the same water's available elevation head. Counting the full 4,000 ft at each serial structure would double-count head unless each stage has a distinct, physically available drop and mass/energy balance.

The workbook also contains a separate, non-hydro **assumed** 80 × 50-MWe small-modular-reactor array: **4.00 GW nameplate**, not a verified deployment plan. The arithmetic sum with the 5.12-GW hydro context is **9.12 GW conditional nameplate**, before net-head reduction, downtime, parasitic loads, grid losses, or demand; it does not show that both resources are available at the same place or time.

**Portfolio ambition:** the project goal is a **1,000-GW (1-TW) multi-source producer**. For this planning card, treat that provisionally as aggregate installed/nameplate capacity—not 1 TW of continuous average or firm output. The source mix and firm contribution are unassigned. Against the illustrative 9.12-GW long-range sum above, **990.88 GW remains unallocated**; at the early-phase 1,200–2,500-ft cases, the same historical-flow context plus the assumed 4-GW SMR array would total about **5.54–7.20 GW**, leaving **992.80–994.46 GW** unallocated. These subtractions are scale comparisons, not a deployment plan or feasibility finding. If 1 TW is intended to mean average delivered output, the required nameplate capacity and firming resources would be higher and must be specified separately. Storage is not a primary generation source. The inspirational system and modeling scope are described in [`CONCEPT-DESIGN-BRIEF.md`](./CONCEPT-DESIGN-BRIEF.md).

As an explicit sensitivity only, applying 70% hydro and 90% SMR capacity factors produces about **63.0 TWh/year**, or **7.19 GW average**. Those capacity factors are not validated operating estimates. The 29.75-km³/year transfer case's simplified **17.96-GW pumping input** is larger than the separate **9.12-GW conditional nameplate** and **7.19-GW illustrative average**. Even granting one conditional 10.15-GW return-turbine pass, the transfer case retains about **7.81 GW net draw**, before desalination, treatment, city loads, and other system demand. Do not add that return recovery to the distinct 476-m³/s hydro benchmark unless the flows and heads are independently available and not double-counted. No positive net-energy balance is established. The “Human-Reactor” remains a fictional social/civic metaphor, not a 500-GW physical generator or an energy source.

A hypothetical 73-km³ reservoir passing the full 1,219.2-m gross head once would correspond to **218.3 TWh electrical at 90%** in the idealized `ρgVHη` calculation. This is an upper-bound storage illustration: mean head would vary, the full volume will not all pass the full head, and energy is not recurring without replenishment. Pumping water uphill consumes energy; recovery turbines can return only part of the input because of conversion and conveyance losses. A closed loop is not a net energy source.

## 5. Provenance and source limits

- **Fiction boundary:** the dam series, Mistveil City, 73-km³ reservoir, population target, structures, and institutions are speculative canon (`FICTION`, `NARRATIVE_SANDBOX`).
- **Calculation boundary:** values above are reproducible consequences of stated assumptions (`DERIVATIVE_BUILD`), not independently validated dimensions or resource availability.
- **Workbook source:** [`01-grand-river-flow-model-v4.xlsx`](./01-grand-river-flow-model-v4.xlsx) supplies the 50-million-US-gallon/day, 60-inch, 350-mile, 4,000-foot pipeline-lift, C=140, 85% pump/95% motor, and 80 × 50-MWe planning entries. Inputs are not certified.
- **USGS context:** Lees Ferry summary statistics report a historical sample median discharge of 476 m³/s, with observed variation; the sample is not a current allocation or guaranteed future flow: [USGS Water-Resources Investigations Report 01-4255, Lees Ferry summary](https://pubs.usgs.gov/wri/wri014255/results/stat/lees.htm). Basin drought/variability context: [USGS Water Data Labs](https://labs.waterdata.usgs.gov/visualizations/OWDI-drought/en/index.html).
- **Not established:** source alignment, rights/allocations, firm flow, route profile, pipeline materials, geotechnical conditions, canyon ecology, Indigenous consent, environmental impacts, permits, costs, safety cases, or real-world feasibility.

## 6. Publishing hierarchy

**The architecture (Book I) is the library. The novel (Book II) is the work in active production.** This card reconciles fictional numeric continuity; it does not convert the novel into an architecture specification. The Book II preview must be regenerated from the canonical manuscript after timeline edits.
