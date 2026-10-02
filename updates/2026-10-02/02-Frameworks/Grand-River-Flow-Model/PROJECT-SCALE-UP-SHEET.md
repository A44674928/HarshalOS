# Grand River & Mistveil — phased project scale-up sheet

**As of:** 2026-10-02 · **Status:** `DERIVATIVE_BUILD` scenario calculator; not a project design or deployment plan.  
**Fictional program inputs:** first operation targeted around 2046; Mistveil population about 80 million by 2100; early cumulative head aspiration 1,200–2,500 ft during the first 40–60 years; long-range cumulative head target 4,000 ft; 1-TW portfolio provisionally means installed/nameplate capacity. These are not verified real-world claims.  
**Provenance:** sourced benchmarks are `CANONICAL_SOURCE`; reproducible calculations are `DERIVATIVE_BUILD`; project setting and goals are `FICTION` (`NARRATIVE_SANDBOX`). Editable assumptions: [`project_scaleup_inputs.json`](./project_scaleup_inputs.json). Calculator: [`project_scaleup.py`](./project_scaleup.py). Core water/hydro arithmetic: [`recalculate.py`](./recalculate.py).

> **Bottom line:** a 1,000-GW nameplate portfolio would yield **2,628–7,884 TWh/year** at 30–90% blended capacity factor (**300–900 GW average**, before curtailment, storage loss, outages, parasitic loads, and transmission). One deliberately hypothetical 1-TW example mix yields **3,835.1 TWh/year** (**437.8 GW average**). The 80-million-person city-only electricity envelope is **400–1,600 TWh/year** (**45.7–182.6 GW average**), before the separately modeled aqueduct/desalination, construction, and major industrial loads. Thus 1 TW nameplate is not a demand forecast or a firm-output promise.

## 1. Boundaries and interpretation

- The 1-TW goal is **provisionally aggregate installed/nameplate electrical capacity**, not 1 TW average or firm output. Nameplate capacity, average output, hourly firm capacity, and annual energy are different quantities.
- The calculation uses **Mistveil's ~80 million residents by 2100 only**. The legacy **~40-million regional-service figure is kept separate and non-additive**; it is not added to the city census or used as a second city load.
- Twenty-year planning bands are for construction/supply-chain staging, **not a physical limit**. First operation around 2046 is a target, not a scheduled commitment. There is no final completion year.
- The works remain a **modular series**. 1,200–2,500 ft and 4,000 ft are cumulative system-head aspirations across distinct hydraulic drops, not dam-wall height, reservoir depth, or guaranteed usable head. The Mac Pro lattice is architectural/airflow inspiration, not pressure relief or a source of extra flow; maintain a continuous pressure boundary unless qualified design routes water through controlled machinery.
- Treat a GW as power and a TWh/year as energy. The model uses 8,760 hours for annual generation arithmetic and 365.25 days for annual water-volume conversions.

## 2. Generation scale and portfolio scenarios

### Core formulas

For source `i`, where capacity is electrical GW at the generator interface:

```text
annual generation (TWh/year) = Σ [capacity_i (GW) × capacity_factor_i × 8,760 h ÷ 1,000]
average output (GW)             = annual generation (TWh/year) ÷ 8.76
```

Capacity factors are annual-energy ratios; they do **not** prove hourly firm delivery. The generic 1-TW sensitivity is:

| Blended capacity factor | Average output | Annual generation | Nameplate needed for 1 TW average-energy equivalent* |
|---:|---:|---:|---:|
| 30% | 300 | 2,628 | 3,333 GW |
| 40% | 400 | 3,504 | 2,500 GW |
| 50% | 500 | 4,380 | 2,000 GW |
| 70% | 700 | 6,132 | 1,429 GW |
| 90% | 900 | 7,884 | 1,111 GW |

\* The right-hand column is an annual-energy arithmetic only (`1,000 GW ÷ capacity factor`). A 1-TW-average or firm-delivery requirement also needs hourly adequacy, storage/dispatch, reserve, transmission, and outage analysis. Hydrogen storage adds charging generation because it loses energy; it is not an extra primary source.

### Worked 1,000-GW low-carbon example — deliberately not a deployment plan

The following arithmetic mix forces the provisional 1,000-GW total so the order of magnitude can be inspected. It uses reference fleet capacity factors where available; the marine/tidal line is merely the residual needed to balance the illustration. It does **not** imply those resources exist at these sites or can be permitted, transmitted, or built. The SMR line is low-carbon firm **but not renewable**.

| Candidate generator | Classification | Nameplate (GW) | Capacity factor assumption/reference | Average output (GW) | Annual generation (TWh) |
|---|---|---:|---:|---:|---:|
| Utility-scale solar PV | RENEWABLE VARIABLE | 400.000 | 28.7% | 114.80 | 1,005.6 |
| Wind | RENEWABLE VARIABLE | 300.000 | 34.3% | 102.90 | 901.4 |
| Small modular reactors (SMRs) | LOW CARBON FIRM NOT RENEWABLE | 150.000 | 90.8% | 136.20 | 1,193.1 |
| Geothermal | RENEWABLE SITE LIMITED | 100.000 | 64.6% | 64.60 | 565.9 |
| Grand River hydro reference | RENEWABLE FLOW AND HEAD LIMITED | 5.124 | 70.0% | 3.59 | 31.4 |
| Marine / tidal current | RENEWABLE EMERGING SITE LIMITED | 44.876 | 35.0% | 15.71 | 137.6 |
| **Example total** | **850 GW renewable + 150 GW SMR (not renewable)** | **1,000** | **43.78% blended** | **437.79** | **3,835.1** |

In this constructed mix, renewable sources contribute **850 GW nameplate** and approximately **2,642.0 TWh/year** (68.9% of example annual output); SMRs contribute **150 GW nameplate** and **1,193.1 TWh/year**. The 150-GW SMR placeholder equals **3,000 assumed 50-MWe modules**—a supply-chain and licensing scale, not an approved program. The 4,000-ft/476-m³/s Grand River hydro entry is conditional on the existing calculator's historical-flow context and 90% conversion assumption; the 70% annual capacity factor is illustrative.

**Technology classification:**

- **Renewable generators:** solar PV/CSP, wind, geothermal (including enhanced geothermal only where resources permit), hydropower, and marine/tidal/wave systems. Their capacity, time profile, land/water impacts, and site potential still require study.
- **Low-carbon firm, not renewable:** SMRs / other nuclear fission. Include licensing, fuel-cycle, spent-fuel, security, cooling, and siting decisions; current-fleet capacity factors are not an SMR guarantee.
- **Storage / energy carrier, not primary generation:** hydrogen electrolysis plus storage plus fuel cells, batteries, pumped storage, and thermal storage. Do not add their discharge ratings to primary generation or count stored electricity twice.
- **Emerging candidates:** enhanced geothermal, floating/offshore wind, advanced solar-thermal with heat storage, marine energy, advanced fission, long-duration thermal/flow storage, and demand response. Fusion remains outside the committed capacity mix; do not book it as a dependable resource.

### Hydrogen is storage, not free generation

Sandia/DOE describes electrolysis-to-hydrogen-to-fuel-cell electricity round-trip efficiency around 40% for typical systems. If fraction `f` of delivered electricity passes through that storage chain, the generation input factor is:

```text
input factor = (1 − f) + f ÷ round_trip_efficiency
```

| Delivered load supplied through hydrogen | Generation input multiplier at 40% round-trip efficiency | Added generation input | Input for the central identified-load case |
|---:|---:|---:|---:|
| 0% | 1.00× | 0% | 1,055.5 TWh/year |
| 20% | 1.30× | 30% | 1,372.1 TWh/year |
| 40% | 1.60× | 60% | 1,688.8 TWh/year |
| 100% | 2.50× | 150% | 2,638.7 TWh/year |

This is an energy-only sensitivity, not a hydrogen plant design. Electrolyzer power, fuel-cell output power, storage duration, hydrogen source, compression/liquefaction, leakage, safety, and heat reuse remain separate design inputs.

## 3. City and infrastructure demand envelope

### City electricity (80 million residents by 2100)

**Illustrative assumption, not a forecast:** test 5 / 10 / 20 MWh per resident-year for city-facing electricity. These inputs do not include the separately modeled bulk aqueduct lift or seawater desalination and do not establish major industrial, construction, or process-heat loads. Peak is shown as an independent load-factor sensitivity.

| City electricity intensity (MWh/resident-year) | Annual city electricity (TWh) | Average city load (GW) | Peak at 65% load factor (GW) | Peak at 75% | Peak at 85% |
|---:|---:|---:|---:|---:|---:|
| 5 | 400 | 45.7 | 70.2 | 60.9 | 53.7 |
| 10 | 800 | 91.3 | 140.5 | 121.8 | 107.4 |
| 20 | 1,600 | 182.6 | 281.0 | 243.5 | 214.9 |

Central arithmetic: **800 TWh/year**, **91.3 GW average**, and **121.8 GW peak** at a 75% load factor. This is an end-use scenario; system peak must ultimately be built from hourly district and industrial load profiles.

### Separate bulk-transfer and desalination stress case

The existing Grand River model's **29.75 km³/year** transfer scenario equals **942.72 m³/s**, with **431 parallel 60-inch baseline-throughput lines, about 242,770 cumulative pipeline-km, and 17.96 GW gross pumping input** under its simplified workbook assumptions. This is the *pipeline's assumed 4,000-ft static lift*, not the dam-series aggregate head. Its full return-turbine recovery of **10.15 GW** is conditional: it is unavailable if the water is consumed or does not return through that same drop.

If all **29.75 km³/year is treated as delivered desalinated product water**, DOE's 2.7–4.0 kWh/m³ seawater-RO reference range implies **80.3–119.0 TWh/year** (**9.17–13.58 GW average**) for RO only. The central 3.3-kWh/m³ reference is **98.2 TWh/year** (11.21 GW). Feed volume, recovery ratio, brine handling, intake, treatment, and distribution are not calculated here; if 29.75 km³ refers to raw feed instead of product, this RO energy calculation must be revised.

| Identified electricity only | Annual energy (TWh/year) | Average load (GW) |
|---|---:|---:|
| 80M city at 10 MWh/resident-year | 800.0 | 91.32 |
| Bulk-transfer pumping, gross | 157.3 | 17.96 |
| Full-transfer RO, central 3.3 kWh/m³ product assumption | 98.2 | 11.21 |
| **Subtotal, no recovery credit** | **1,055.5** | **120.49** |
| **Subtotal if the conditional 10.15-GW return recovery is actually available** | **966.6** | **110.34** |

The worked 1-TW example generates 3.63× this identified subtotal on an annual-energy basis; the arithmetic difference is 2,779.6 TWh/year, **unallocated** to industry, export, storage charging, or curtailment. That is not a surplus finding. This identified subtotal is **not total project demand**. It includes no separately specified process industry, construction-material production, cooling, backup, storage losses, transmission/distribution losses, or additional regional services. City electricity and transfer/desalination are added here as distinct energy uses; the water volumes themselves must not be added if the 29.75-km³ figure already includes the city's supply.

## 4. Land envelope

No sites, access, legal boundaries, or land-use permissions are established. These are arithmetic envelopes for the worked mix and 80-million-city endpoint, not parcels to acquire.

| Mistveil gross urban density assumption (people/km²) | City boundary footprint (km²) |
|---:|---:|
| 5,000 | 16,000 |
| 10,000 | 8,000 |
| 16,000 | 5,000 |
| 20,000 | 4,000 |

The example mix's **400-GW AC solar PV** uses the NREL reference density of about 43 MWdc/km². With a separate illustrative DC/AC ratio range of 1.0–1.3, the array-area sensitivity is **9,302–12,093 km²**. This depends on array/layout and land-use definitions.

The **300-GW wind** line maps to about **42,857–100,000 km²** using NREL's modeled 7-to-3-MW/km² included-area / convex-hull density references. A wind envelope is not all directly disturbed land; agriculture or other co-use may be possible, subject to site conditions and agreements.

| Assumed reservoir mean depth (m) | Surface-area arithmetic for the fictional 73-km³ volume (km²) |
|---:|---:|
| 50 | 1,460 |
| 100 | 730 |
| 250 | 292 |

The reservoir table is `area ≈ volume ÷ assumed mean depth`; it does not supply a surveyed basin or operating pool. A deliberately simplified **non-overlap subtotal** of city + PV + wind envelope + reservoir is **56,451–129,553 km²** (21,796–50,021 mi²). Do **not** read this as a real total footprint: wind land is an envelope, real sites can overlap/co-use, and this subtotal excludes SMRs, geothermal, marine sites, industrial districts, transmission corridors, roads, buffers, construction yards, protected areas, and Tribal/community boundaries.

## 5. Water envelope

For an 80-million resident census, the following city-residential comparisons are not full municipal or project water allocations:

| Water-use benchmark / scenario | L/person/day | City volume (million m³/day) | Annual volume (km³/year) |
|---|---:|---:|---:|
| Illustrative planning allowance (150 L/person/day) | 150.0 | 12.00 | 4.383 |
| EPA at-home U.S. comparison (82 gal/person/day ≈ 310.4 L/person/day) | 310.4 | 24.83 | 9.070 |

EPA's 82-gallon at-home U.S. comparison is converted at 3.785411784 L/US gal. The **29.75-km³/year** aggregate-transfer placeholder is about **6.79×** the 150-L allowance or **3.28×** the EPA at-home comparison. This is scale arithmetic, not evidence that this volume is available, needed, potable, or allocated to Mistveil. If transfer water includes city supply, do not add the city-volume row again in the water balance. Keep the separate ~40M regional-service figure non-additive.

**Not quantified:** source rights and yield, ecological releases, reuse and return flows, leakage, evaporation, storage operations, fire reserves, non-residential demand, agriculture, construction water, treatment reject, brine, and cooling water for SMR/geothermal or other thermal systems. Closed-loop, once-through, and dry/hybrid cooling would have different land/water/air tradeoffs.

## 6. Air, ventilation, and emissions boundary

ASHRAE ventilation is designed by occupancy/space and floor area, not by assigning one universal “air per city resident” number. A simplified breathing-zone form is:

```text
Vbz = Rp × Pz + Ra × Az
```

where `Pz` is design population and `Az` is occupiable floor area for each zone; occupancy category, distribution effectiveness, system diversity, exhaust, and adopted code edition still matter. Because building floor area and space mix are not assigned, only an occupant-component stress illustration is shown below. The 2.5–5.0 L/s/person values are **not code rates** and assume all 80 million people are concurrent design occupants solely to show how the formula scales.

| Illustrative occupant component (L/s per design occupant) | Full-80M concurrent airflow (m³/s) | Equivalent outdoor-air volume (billion m³/day) |
|---:|---:|---:|
| 2.5 | 200,000 | 17.28 |
| 5.0 | 400,000 | 34.56 |

This is not a breathing-oxygen budget or a city-wide replacement-air requirement. Final design needs per-space occupancy and area, ventilation effectiveness, filtration, outdoor pollutant conditions, heat/moisture loads, smoke control, and applicable standards. For every additional 10 million residents, the same illustrative occupant component scales to **25,000–50,000 m³/s** at full simultaneous design occupancy.

No project emissions total is claimed. Once the energy and construction mix is defined, use a declared boundary such as:

```text
annual operational CO₂e = Σ electricity_i × emission_factor_i + imports/backup + upstream fuel supply
```

Track local pollutants (for example NOₓ, SO₂, particulate matter, VOCs and ozone precursors), construction and lifecycle emissions, thermal discharges, and indoor/outdoor exposure separately. Renewable generation has lifecycle and construction impacts; SMRs are low-carbon, not zero-impact or renewable; hydrogen point-of-use emissions depend on the fuel and system boundary.

## 7. Phased scale-up sheet — Ground-0 through long range

**Interim resident counts and phase GW additions remain unassigned on purpose.** The source canon has an 80-million 2100 city target, but no approved 2046/2066/2086 population milestones. This table preserves that boundary and supplies the formulas for populating each phase when the scenario owner chooses those inputs.

| Milestone | Planning window | Mistveil residents used | Cumulative head marker | Portfolio capacity marker | Stage gate / calculation action |
|---|---|---:|---|---|---|
| Ground-0 baseline | 2026 | Not assigned | Not assigned | Not assigned | Establish source, site, demand, rights, land, ecology, air, transmission, and safety evidence; no project-wide build capacity is assigned. |
| Pre-operation / first module | 2026–2046 | Not assigned | Not assigned | Not assigned | Target first operational dam-and-city module around 2046. Size any pilot to a separately defined service boundary; no first-operation census or GW target is assigned. |
| First expansion window | 2046–2066 | Not assigned | Not assigned | Not assigned | First 20-year construction/supply-chain window; add modular works and generation only against measured/declared phase loads and gates. |
| Early cumulative-head horizon | 2066–2086 (40–60 years from 2026) | Not assigned | 1,200–2,500 ft cumulative aggregate gross head | Not assigned | Early-phase aggregate gross-head aspiration across distinct stages; no individual dam height, reservoir depth, or capacity milestone is implied. |
| Mistveil 2100 population target | By 2100, within the 2086–2106 planning window | ~80 million | Not assigned | Not assigned | The ~40-million regional-service figure stays separate and is not added to this city population. |
| Long-range buildout | 2106 onward; completion year unassigned | Not assigned | 4,000 ft cumulative aggregate gross head | 1,000 GW nameplate aspiration | Long-range fictional aggregate-head target and provisional 1-TW installed/nameplate multi-source ambition; no final completion date or source allocation is set. |

### One illustrative capacity ramp (scenario inputs, not adopted milestones)

To make the construction scale visible without inventing interim population targets, the calculator also carries one **analyst-chosen** capacity pathway. The 2046 range is the existing conditional early-head hydro case plus the assumed 4-GW SMR array. Later steps use 25 GW by 2066, 100 GW by 2086, 300 GW by 2100, then the undated 1-TW goal. For the later steps only, the worked portfolio mix is scaled proportionally, preserving its 43.78% blended capacity factor and renewable/SMR shares. These 25/100/300-GW waypoints are editable scenario inputs—not user-approved milestones, demand-derived requirements, a resource plan, or a commitment. The long-range goal has no assigned year.

| Illustrative scenario waypoint | Year / timing | Nameplate / conditional output proxy (GW) | Average generation (GW) | Annual generation (TWh) | Scaled PV array area (km²) | Scaled wind land envelope (km²) |
|---|---|---:|---:|---:|---:|---:|
| Ground-0 baseline | 2026 | Not assigned | Not assigned | Not assigned | Not mapped | Not mapped |
| First operation (conditional hydro + assumed SMR case) | 2046 | 5.54–7.20 | 4.68–5.84 | 41.0–51.2 | Not mapped | Not mapped |
| Illustrative capacity at 2066 | 2066 | 25.0 | 10.9 | 95.9 | 233–302 | 1,071–2,500 |
| Illustrative capacity at 2086 | 2086 | 100.0 | 43.8 | 383.5 | 930–1,209 | 4,286–10,000 |
| Illustrative capacity at 2100 | 2100 | 300.0 | 131.3 | 1,150.5 | 2,791–3,628 | 12,857–30,000 |
| Long-range 1-TW goal; no completion year assigned | No final year assigned | 1,000.0 | 437.8 | 3,835.1 | 9,302–12,093 | 42,857–100,000 |

The 2046 row's hydro component is a **conditional electrical-output proxy** from the stated flow/head calculation, not a verified hydro nameplate, firm output, or water allocation; later rows are scenario nameplate totals.

At 2100, the 300-GW illustration produces **1,150.5 TWh/year** under the sample mix—only about **9.0%** above the central identified annual-energy subtotal of 1,055.5 TWh/year. That narrow annual-energy comparison does not cover hourly peak, firm adequacy, storage losses, major industry, transmission losses, or outages. The ramp is a discussion tool, not evidence that 300 GW is sufficient or buildable.

### Per-10-million-resident scale factor (illustrative 10 MWh/person-year city electricity)

| Metric per additional 10M residents | Scale factor |
|---|---:|
| City-facing annual electricity | 100 TWh/year |
| City-facing average electric load | 11.42 GW |
| City-facing peak at 75% load factor | 15.22 GW |
| Residential water at 150 L/person/day | 1.50 million m³/day; 0.548 km³/year |
| Residential water at 310.4 L/person/day | 3.10 million m³/day; 1.134 km³/year |
| Gross urbanized land at the tested 5,000–20,000 people/km² | 500–2,000 km² |
| Ventilation occupant component at 2.5–5.0 L/s/person | 25,000–50,000 m³/s at full simultaneous design occupancy |

For each later phase, replace the population input only when a phase target is explicitly selected. Then size generation against both annual energy and hourly peak/firm-adequacy models; size water against source yield and a full mass balance; size land against mapped sites and co-use; and calculate ventilation/emissions from actual space and source inventories.

## 8. What is still unknown / engineering gates

The following prevent these ranges from being a physical supply or construction plan:

- **Resource and siting:** hourly solar/wind, geothermal temperatures/flow, marine resource, river flow/head time series, hydrology/drought, grid access, transmission distance, and available buildable land.
- **Demand and phasing:** district floor area, occupancy, cooling/heating, electrified mobility, industrial and construction loads, process heat, regional-service boundaries, growth schedule, and critical-load definition.
- **Hydraulic and water:** water rights and allocations, source quality, route profile, net turbine head, reservoir bathymetry/mean depth, withdrawal/return balance, pumping redundancy, RO product/feed recovery, brine, cooling water, and ecological limits.
- **Land and consent:** city density and parcel form, wind co-use agreements, PV siting, nuclear/geothermal/marine sites, transmission corridors, Tribal/community engagement and consent, cultural resources, habitats, and permits.
- **Air/climate/safety:** adopted ventilation and emissions rules, pollutant baselines, thermal management, cooling choice, lifecycle CO₂e, severe-weather resilience, storage/fire/explosion safety, nuclear licensing/waste, grid stability, and independent review.
- **Cost and buildability:** workforce, material volumes, manufacturing throughput, financing, construction logistics, operational staffing, waste, decommissioning, and cumulative embodied impacts.

Ground-0 therefore means establish evidence and boundaries before assigning project-wide capacity. Use module-scale simulation and prototypes as `DERIVATIVE_BUILD`; do not turn fictional values into claims of site suitability, Tribal consent, rights, permits, feasibility, or construction readiness.

## 9. Calculation rules and source register

### Editable inputs and calculation rules

- Edit only explicit scenario fields in [`project_scaleup_inputs.json`](./project_scaleup_inputs.json); source-linked transfer and hydro inputs are read from [`recalculate.py`](./recalculate.py).
- Rebuild this report with `python3 project_scaleup.py --output PROJECT-SCALE-UP-SHEET.md`; inspect the diff and assumptions after any change.
- Urban footprint: `resident count ÷ gross residents/km²`.
- City residential water: `residents × L/person/day ÷ 1,000`; annualize by 365.25 days. This is a comparison, not total withdrawals.
- Solar land: `PV GW_AC × 1,000 MW/GW × DC/AC ratio ÷ MWdc/km²`. Wind envelope: `wind GW × 1,000 MW/GW ÷ modeled MW/km²`.
- Reservoir area sensitivity: `volume (km³) × 1,000 ÷ assumed mean depth (m)`.
- Full-transfer RO sensitivity: `product volume (m³/year) × kWh/m³ ÷ 1,000,000,000 = TWh/year`.
- Airflow stress case: `80M × illustrative L/s/person ÷ 1,000 = m³/s`; full occupancy is deliberately an upper-bound arithmetic case.
- Pipeline lift and dam-series aggregate head are separate. Pump input is a load; turbine recovery is conditional and only credited if the same water physically returns through the modeled drop.

### Sources (`CANONICAL_SOURCE`; benchmarks only)

1. [EPA WaterSense — Statistics and Facts](https://www.epa.gov/watersense/statistics-and-facts): 82 U.S. gallons/person/day at home; used only as a residential comparison.
2. [NREL, *Solar Photovoltaics and Land-Based Wind Technical Potential* (2024)](https://docs.nrel.gov/docs/fy24osti/87843.pdf): modeled utility PV density around 43 MWdc/km²; land-based wind included-area and convex-hull median densities around 7 and 3 MW/km². These are land-model references, not a site assessment.
3. [U.S. EIA, State Energy Data System Table F53 (2024 capacity factors)](https://www.eia.gov/state/seds/sep_fuel/html/pdf/fuel_cf.pdf): Arizona utility PV 28.7%; U.S. wind 34.3%; U.S. nuclear 90.8%; U.S. geothermal 64.6%. Fleet statistics are reference inputs, not forecasts or guarantees for future sites/SMRs.
4. [U.S. DOE, *Bandwidth Study on Energy Use and Potential Energy Savings Opportunities in U.S. Seawater Desalination Systems*](https://www.energy.gov/sites/prod/files/2017/12/f46/Seawater_desalination_bandwidth_study_2017.pdf): seawater RO examples around 2.7–4.0 kWh/m³; system boundary and recovery matter.
5. [Sandia / DOE Energy Storage Handbook, Chapter 11: Hydrogen Energy Storage](https://www.sandia.gov/app/uploads/sites/163/2022/03/ESHB_Ch11_Hydrogen_Headley.pdf): typical electrolysis/hydrogen/fuel-cell electrical round trip around 40%; system and use conditions vary.
6. [ASHRAE Standard 62.1-2022 Addendum b](https://www.ashrae.org/file%20library/technical%20resources/standards%20and%20guidelines/standards%20addenda/62_1_2022_b_20231031.pdf): ventilation depends on the space/occupancy and per-person/per-area method; applicable editions and local adoption must be confirmed for any real building.
7. [USGS Lees Ferry summary statistics](https://pubs.usgs.gov/wri/wri014255/results/stat/lees.htm): historical sample median discharge used only in the conditional Grand River hydro arithmetic.
8. [U.S. Bureau of Reclamation — Hydroelectric Power](https://www.usbr.gov/power/edu/pamphlet.pdf): hydropower depends on actual flow, usable head, and conversion losses.

These sources support limited benchmark context. They do not validate the fictional design, source allocation, schedule, land, water rights, energy balance, or real-world feasibility.
