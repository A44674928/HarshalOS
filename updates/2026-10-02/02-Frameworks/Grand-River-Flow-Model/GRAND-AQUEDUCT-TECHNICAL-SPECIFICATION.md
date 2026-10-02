# Grand Aqueduct — fictional planning assumptions and recalibration

**Revision:** 2026-10-02 · **Provenance:** project is `FICTION` (`NARRATIVE_SANDBOX`); arithmetic is `DERIVATIVE_BUILD`.  
**Document status:** concept-level reconciliation, **not** a technical specification, feasible route, water allocation, environmental review, permit, or construction plan.

> **Controlling reference:** [`CANONICAL-NUMBERS.md`](./CANONICAL-NUMBERS.md). The prior edition called the system “complete” and stated that 5,000 m³/s gravity-fed capacity could fill the reservoir in hours while delivering regional water. Those claims are withdrawn. The workbook baseline is 50 million US gallons/day, not 5,000 m³/s; lift consumes substantial energy.

## Fictional system vocabulary

The names **Aqueduct of Aspiration**, **Pipeline of Transformation**, **Stream of Manifestation**, and **Grand Aqueduct** may remain as Book II worldbuilding. Their former tier rates, elevations, pipeline dimensions, treatment capacities, energy-recovery totals, pressure values, and construction claims are not validated and are not current design facts.

The active fictional continuity targets a modular first operational dam-and-city milestone circa **2046**, expansion in 20-year planning windows, and approximately **80 million Mistveil residents by 2100**. The 2098 marker is interim commissioning/expansion, not final completion. The first 40–60 years carry a 1,200–2,500-ft cumulative-head aspiration across distinct stages; 4,000 ft remains the long-range fictional aggregate target for the modular Arizona Grand Canyon series. Neither is an individual dam height or reservoir depth; the 20-year window is not a physical cap.

## Reconciled water inputs

| Item | Current planning entry | Boundary |
|---|---:|---|
| Single workbook baseline | 50M US gal/day = 2.190632 m³/s | One notional 60-inch line, 350-mile route, C=140. |
| Baseline friction | ~349.8m over the notional route | Hazen–Williams screening estimate; not a pipe design. |
| Baseline static lift | 4,000ft = 1,219.2m | Assumed head only; endpoints/profile are not surveyed. |
| Baseline pump input | ~41.76MW | 85% pump × 95% motor; excludes auxiliary and system losses. |
| Legacy aggregate delivery target | 29.75km³ per Julian year = 942.721m³/s | Fictional planning target; source, rights, route, and deliverable yield are unestablished. |
| Equivalent baseline lines | 431 parallel 60-inch lines | Same assumed 350-mile route and throughput; ~242,770 cumulative route-km, ~17.96GW pumping input. Scale check only. |
| Reservoir | 73km³ assumed storage | Fictional volume; geometry, operating range, and losses are not designed. |

The 50M-gallon/day workbook line supplies only about **2.37L/person/day** if spread across 80 million residents with no loss. A separate comparison of 150L/person/day for municipal use is 12 million m³/day (4.38km³/year). This is not a demand forecast. No quantity in this table proves that source water is legally or physically available.

## Lift, water, and energy boundaries

For pipe pumping:

```text
P_electric ≈ ρ g Q (H_static + H_friction) / (η_pump η_motor)
```

For hydroelectric generation:

```text
P_hydro = ρ g Q H_net η_turbine-generator
```

These are different terms. A 1,219.2m assumed rise adds static energy demand; it does not provide free power. A later recovery turbine may return some pressure/head energy but cannot return more than was supplied, and real conveyance/conversion losses make a closed loop net-negative. Any 5,000m³/s or 25,000m³/s figure is a flow sensitivity only unless independently sourced and allocated. Do not carry forward the earlier serial 25,000→20,000→15,000m³/s tier diagram; it violates the stated mass balance unless withdrawals, branches, return flows, and storage changes are accounted for.

The separate, conditional hydro budget (476m³/s historical-sample context × 1,219.2m gross assumed head × 90%) is **5.12GW**, before net-head adjustment and availability. The workbook's 80×50MWe SMR entry is **4GW assumed nameplate**. The combined conditional 9.12GW does not cover the simplified 17.96GW pumping sensitivity for the old 29.75km³/year transfer target, before treatment, desalination, or city demand. No positive net-energy result is established. See the [numbers card](./CANONICAL-NUMBERS.md) and [`recalculate.py`](./recalculate.py).

## Unresolved gates (not project completion tasks)

Before any real-world proposal could be evaluated, it would require independently scoped source-water rights/allocation and basin accounting; environmental and Indigenous consultation/consent; surveyed endpoints and route profile; geotechnical, seismic, ecology, materials, pressure, surge, and failure-mode studies; treatment/brine handling; energy and grid assessment; cost/schedule estimates; and applicable permits/reviews. This repository contains none of those approvals or validations.
