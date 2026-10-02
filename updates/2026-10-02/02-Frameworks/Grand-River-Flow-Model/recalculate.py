#!/usr/bin/env python3
"""Reproducible planning arithmetic for the fictional Grand River model.

All project inputs are explicit assumptions, not an engineering design, water
right, operating forecast, environmental review, or feasibility finding. The
source workbook baseline is 50 million US gallons/day through a nominal
60-inch line over a 350-mile route, with an assumed 4,000-foot static lift and
80 x 50-MWe SMR nameplate capacity. The hydro reference case separately uses
4,000 ft as a long-range aggregate-head sensitivity; early phases target 1,200–2,500 ft.

Run:
    python3 recalculate.py           # readable report
    python3 recalculate.py --json    # machine-readable values
"""
from __future__ import annotations

import argparse
import json
import math

# Exact unit conversions / constants.
M3_PER_US_GALLON = 0.003785411784
SECONDS_PER_DAY = 86_400
SECONDS_PER_JULIAN_YEAR = 365.25 * SECONDS_PER_DAY
METERS_PER_MILE = 1_609.344
METERS_PER_FOOT = 0.3048
RHO_WATER_KG_M3 = 1_000.0
G_M_S2 = 9.81

# Workbook-derived / fictional planning inputs.
BASELINE_GALLONS_PER_DAY = 50_000_000.0
PIPE_DIAMETER_IN = 60.0
PIPE_DIAMETER_M = PIPE_DIAMETER_IN * 0.0254
ROUTE_MILES = 350.0
STATIC_LIFT_FT = 4_000.0  # pipeline lift assumption; not an individual dam height
HAZEN_WILLIAMS_C = 140.0
PUMP_EFFICIENCY = 0.85
MOTOR_EFFICIENCY = 0.95
TARGET_ANNUAL_TRANSFER_M3 = 29.75e9
RESERVOIR_VOLUME_M3 = 73.0e9
REFERENCE_GROSS_HEAD_M = 4_000.0 * METERS_PER_FOOT  # long-range fictional aggregate sensitivity
REFERENCE_RIVER_FLOW_M3_S = 476.0  # historical USGS sample median, context only
SMR_MODULES = 80
SMR_MWE_EACH = 50.0
PORTFOLIO_TARGET_NAMEPLATE_GW = 1_000.0  # aspirational multi-source project target


def baseline_flow_m3_s() -> float:
    return BASELINE_GALLONS_PER_DAY * M3_PER_US_GALLON / SECONDS_PER_DAY


def hazen_williams_head_loss_m(flow_m3_s: float, diameter_m: float, length_m: float, c: float) -> float:
    """Hazen-Williams SI approximation: hf=10.67 L Q^1.852/(C^1.852 D^4.8704)."""
    if flow_m3_s < 0 or diameter_m <= 0 or length_m < 0 or c <= 0:
        raise ValueError("Hazen-Williams inputs must be non-negative with positive diameter and C.")
    if flow_m3_s == 0 or length_m == 0:
        return 0.0
    return 10.67 * length_m * flow_m3_s**1.852 / (c**1.852 * diameter_m**4.8704)


def hydraulic_power_watts(flow_m3_s: float, head_m: float) -> float:
    """Gross hydraulic power ρgQH before turbine-generator losses."""
    return RHO_WATER_KG_M3 * G_M_S2 * flow_m3_s * head_m


def hydroelectric_watts(flow_m3_s: float, head_m: float, efficiency: float) -> float:
    """Electrical output from an available hydraulic head after conversion losses."""
    return hydraulic_power_watts(flow_m3_s, head_m) * efficiency


def pumping_watts(flow_m3_s: float, head_m: float, pump_efficiency: float, motor_efficiency: float) -> float:
    return RHO_WATER_KG_M3 * G_M_S2 * flow_m3_s * head_m / (pump_efficiency * motor_efficiency)


def main_values() -> dict[str, object]:
    q_baseline = baseline_flow_m3_s()
    route_m = ROUTE_MILES * METERS_PER_MILE
    static_lift_m = STATIC_LIFT_FT * METERS_PER_FOOT
    baseline_friction_m = hazen_williams_head_loss_m(q_baseline, PIPE_DIAMETER_M, route_m, HAZEN_WILLIAMS_C)
    baseline_total_head_m = static_lift_m + baseline_friction_m
    baseline_pump_w = pumping_watts(q_baseline, baseline_total_head_m, PUMP_EFFICIENCY, MOTOR_EFFICIENCY)

    annual_transfer_flow = TARGET_ANNUAL_TRANSFER_M3 / SECONDS_PER_JULIAN_YEAR
    parallel_lines = math.ceil(annual_transfer_flow / q_baseline)
    line_flow = annual_transfer_flow / parallel_lines
    parallel_line_friction_m = hazen_williams_head_loss_m(line_flow, PIPE_DIAMETER_M, route_m, HAZEN_WILLIAMS_C)
    parallel_total_head_m = static_lift_m + parallel_line_friction_m
    parallel_pump_w = pumping_watts(line_flow, parallel_total_head_m, PUMP_EFFICIENCY, MOTOR_EFFICIENCY) * parallel_lines

    early_phase_heads_ft = (1_200.0, 2_500.0)
    early_phase_hydro_cases = []
    for head_ft in early_phase_heads_ft:
        head_m = head_ft * METERS_PER_FOOT
        gross_w = hydraulic_power_watts(REFERENCE_RIVER_FLOW_M3_S, head_m)
        early_phase_hydro_cases.append({
            "gross_head_ft": head_ft,
            "gross_head_m": head_m,
            "gross_hydraulic_gw_at_reference_flow": gross_w / 1e9,
            "electrical_gw_at_90pct_efficiency": gross_w * 0.90 / 1e9,
        })

    hydro_gross_w = hydraulic_power_watts(REFERENCE_RIVER_FLOW_M3_S, REFERENCE_GROSS_HEAD_M)
    hydro_nameplate_w = hydroelectric_watts(REFERENCE_RIVER_FLOW_M3_S, REFERENCE_GROSS_HEAD_M, 0.90)
    smr_nameplate_w = SMR_MODULES * SMR_MWE_EACH * 1e6
    combined_nameplate_w = hydro_nameplate_w + smr_nameplate_w
    portfolio_target_gap_gw = PORTFOLIO_TARGET_NAMEPLATE_GW - combined_nameplate_w / 1e9
    early_phase_portfolio_cases = [
        {
            **case,
            "combined_with_assumed_smr_gw": case["electrical_gw_at_90pct_efficiency"] + smr_nameplate_w / 1e9,
            "unallocated_portfolio_gap_gw": PORTFOLIO_TARGET_NAMEPLATE_GW - case["electrical_gw_at_90pct_efficiency"] - smr_nameplate_w / 1e9,
        }
        for case in early_phase_hydro_cases
    ]
    # Conditional single-pass recovery if the full transfer flow later traverses
    # the same 4,000-ft static drop through a turbine. This is unavailable when
    # water is consumed/distributed and is not a second independent water source.
    transfer_recovery_w = hydroelectric_watts(annual_transfer_flow, static_lift_m, 0.90)
    net_transfer_pump_w_after_one_recovery = parallel_pump_w - transfer_recovery_w
    illustrative_hydro_twh_y = hydro_nameplate_w * 0.70 * SECONDS_PER_JULIAN_YEAR / 3.6e15
    illustrative_smr_twh_y = smr_nameplate_w * 0.90 * SECONDS_PER_JULIAN_YEAR / 3.6e15

    reservoir_full_head_twh = (
        RHO_WATER_KG_M3 * G_M_S2 * RESERVOIR_VOLUME_M3 * REFERENCE_GROSS_HEAD_M * 0.90 / 3.6e15
    )
    city_daily_m3_at_150_litres = 80_000_000 * 150 / 1_000

    return {
        "assumptions": {
            "source_workbook_baseline": "50,000,000 US gal/day; 60 in nominal line; 350 mi; C=140; 4,000 ft static lift",
            "route_miles": ROUTE_MILES,
            "pipe_diameter_in": PIPE_DIAMETER_IN,
            "hazen_williams_c": HAZEN_WILLIAMS_C,
            "pump_efficiency": PUMP_EFFICIENCY,
            "motor_efficiency": MOTOR_EFFICIENCY,
            "reference_gross_head_m": REFERENCE_GROSS_HEAD_M,
            "early_phase_head_range_ft": [1_200.0, 2_500.0],
            "long_range_aggregate_head_ft": 4_000.0,
            "historic_reference_flow_m3_s": REFERENCE_RIVER_FLOW_M3_S,
            "target_annual_transfer_m3": TARGET_ANNUAL_TRANSFER_M3,
            "reservoir_volume_m3": RESERVOIR_VOLUME_M3,
            "smr_modules": SMR_MODULES,
            "smr_mwe_each": SMR_MWE_EACH,
            "multi_source_portfolio_target_nameplate_gw": PORTFOLIO_TARGET_NAMEPLATE_GW,
            "portfolio_target_basis": "aggregate installed/nameplate capacity (provisional)",
        },
        "pipeline_baseline": {
            "flow_m3_s": q_baseline,
            "flow_m3_day": q_baseline * SECONDS_PER_DAY,
            "litres_person_day_at_80m": q_baseline * SECONDS_PER_DAY * 1_000 / 80_000_000,
            "length_km": route_m / 1_000,
            "friction_head_loss_m": baseline_friction_m,
            "static_lift_m": static_lift_m,
            "total_head_m": baseline_total_head_m,
            "electrical_pumping_mw": baseline_pump_w / 1e6,
        },
        "annual_transfer_case": {
            "flow_m3_s": annual_transfer_flow,
            "parallel_baseline_lines": parallel_lines,
            "flow_per_line_m3_s": line_flow,
            "friction_head_loss_per_line_m": parallel_line_friction_m,
            "total_head_per_line_m": parallel_total_head_m,
            "aggregate_electrical_pumping_gw": parallel_pump_w / 1e9,
            "conditional_recovery_gw_if_same_flow_returns_through_full_static_head": transfer_recovery_w / 1e9,
            "net_pump_draw_gw_after_that_single_recovery": net_transfer_pump_w_after_one_recovery / 1e9,
            "conditional_recovery_fraction_of_pump_input": transfer_recovery_w / parallel_pump_w,
            "aggregate_pipeline_km": parallel_lines * route_m / 1_000,
            "municipal_only_at_150_litres_per_person_day_m3_day": city_daily_m3_at_150_litres,
        },
        "hydro_and_generation": {
            "hydro_reference_flow_m3_s": REFERENCE_RIVER_FLOW_M3_S,
            "early_phase_hydro_cases_at_reference_flow": early_phase_hydro_cases,
            "hydro_gross_head_m": REFERENCE_GROSS_HEAD_M,
            "hydro_efficiency": 0.90,
            "hydro_gross_mechanical_gw_at_reference_flow": hydro_gross_w / 1e9,
            "hydro_nameplate_gw_at_reference_flow": hydro_nameplate_w / 1e9,
            "smr_nameplate_gw": smr_nameplate_w / 1e9,
            "combined_conditional_nameplate_gw": combined_nameplate_w / 1e9,
            "unallocated_portfolio_target_gap_gw": portfolio_target_gap_gw,
            "early_phase_portfolio_cases_with_assumed_smr": early_phase_portfolio_cases,
            "hydro_twh_y_at_70pct_capacity_factor": illustrative_hydro_twh_y,
            "smr_twh_y_at_90pct_capacity_factor": illustrative_smr_twh_y,
            "combined_twh_y_at_stated_capacity_factors": illustrative_hydro_twh_y + illustrative_smr_twh_y,
            "combined_average_gw_at_stated_capacity_factors": (illustrative_hydro_twh_y + illustrative_smr_twh_y) / (SECONDS_PER_JULIAN_YEAR * 1e9 / 3.6e15),
            "hydro_sensitivity_gw_at_5000_m3_s": hydroelectric_watts(5_000, REFERENCE_GROSS_HEAD_M, 0.90) / 1e9,
            "hydro_sensitivity_gw_at_25000_m3_s": hydroelectric_watts(25_000, REFERENCE_GROSS_HEAD_M, 0.90) / 1e9,
            "reservoir_energy_twh_at_full_gross_head_once": reservoir_full_head_twh,
        },
        "reservoir_fill": {
            "days_at_baseline_pipeline_flow": RESERVOIR_VOLUME_M3 / q_baseline / SECONDS_PER_DAY,
            "days_at_annual_transfer_flow": RESERVOIR_VOLUME_M3 / annual_transfer_flow / SECONDS_PER_DAY,
            "days_at_5000_m3_s_sensitivity": RESERVOIR_VOLUME_M3 / 5_000 / SECONDS_PER_DAY,
        },
    }


def markdown_report(values: dict[str, object]) -> str:
    p = values["pipeline_baseline"]
    a = values["annual_transfer_case"]
    h = values["hydro_and_generation"]
    f = values["reservoir_fill"]
    assert isinstance(p, dict) and isinstance(a, dict) and isinstance(h, dict) and isinstance(f, dict)
    return f"""# Grand River model recalculation output

Generated by `python3 recalculate.py`. These are conditional planning calculations, not a validated engineering or feasibility finding.

## Water pipeline

- Baseline flow: **{p['flow_m3_s']:.6f} m³/s** ({p['flow_m3_day']:,.0f} m³/day; 50 million US gal/day).
- At 80 million residents: **{p['litres_person_day_at_80m']:.3f} L/person/day** if all baseline flow were distributed with no losses.
- 350-mile, 60-inch route, Hazen–Williams C=140: **{p['friction_head_loss_m']:.1f} m** friction head; 4,000 ft = **{p['static_lift_m']:.1f} m** assumed pipeline static lift (separate from the dam-series head goal); total **{p['total_head_m']:.1f} m**.
- At 85% pump and 95% motor efficiency: **{p['electrical_pumping_mw']:.2f} MW** electrical input, excluding other system loads and transients.
- 29.75 km³/year is **{a['flow_m3_s']:.3f} m³/s**. Matching it with baseline-throughput lines requires **{a['parallel_baseline_lines']} parallel 60-inch lines**, about **{a['aggregate_pipeline_km']:,.0f} cumulative pipeline-km** and **{a['aggregate_electrical_pumping_gw']:.2f} GW** pump input under the same simplified route/head assumptions.
- If that entire flow later returns through a turbine across the same assumed 1,219.2 m static drop, a single 90%-efficient pass could recover at most **{a['conditional_recovery_gw_if_same_flow_returns_through_full_static_head']:.2f} GW** in this simplified case. The remaining **{a['net_pump_draw_gw_after_that_single_recovery']:.2f} GW** is still a net electrical draw before other loads. Recovery is unavailable for water consumed or delivered elsewhere; it is not a second water source or an extra credit to add to the separate river-flow case.
- 150 L/person/day for 80 million residents alone is **{a['municipal_only_at_150_litres_per_person_day_m3_day']:,.0f} m³/day**. This is a comparison allowance, not a demand forecast.

## Conditional generation budget

- Gross hydraulic power is **ρgQH**. At Q=476 m³/s, the early-phase 1,200–2,500 ft gross-head cases yield **{h['early_phase_hydro_cases_at_reference_flow'][0]['electrical_gw_at_90pct_efficiency']:.2f}–{h['early_phase_hydro_cases_at_reference_flow'][1]['electrical_gw_at_90pct_efficiency']:.2f} GW** at η=90%, before other losses. The separate 4,000-ft long-range case is **{h['hydro_gross_mechanical_gw_at_reference_flow']:.2f} GW** gross and **{h['hydro_nameplate_gw_at_reference_flow']:.2f} GW** at η=90%. The 476 m³/s flow is historical sample context, not guaranteed project flow.
- SMR planning entry: 80 × 50 MWe → **{h['smr_nameplate_gw']:.2f} GW** nameplate.
- Combined conditional nameplate: **{h['combined_conditional_nameplate_gw']:.2f} GW**. At illustrative 70% hydro / 90% SMR capacity factors: **{h['combined_twh_y_at_stated_capacity_factors']:.1f} TWh/year** (average **{h['combined_average_gw_at_stated_capacity_factors']:.2f} GW**).
- Against the provisional 1,000-GW multi-source nameplate ambition, the long-range 4,000-ft reference sum leaves **{h['unallocated_portfolio_target_gap_gw']:.2f} GW** unallocated. At the early-phase 1,200–2,500-ft range plus the assumed 4-GW SMR entry, the illustrative sum is **{h['early_phase_portfolio_cases_with_assumed_smr'][0]['combined_with_assumed_smr_gw']:.2f}–{h['early_phase_portfolio_cases_with_assumed_smr'][1]['combined_with_assumed_smr_gw']:.2f} GW**, leaving **{h['early_phase_portfolio_cases_with_assumed_smr'][1]['unallocated_portfolio_gap_gw']:.2f}–{h['early_phase_portfolio_cases_with_assumed_smr'][0]['unallocated_portfolio_gap_gw']:.2f} GW** unallocated. These are scale comparisons, not a resource or deployment plan.
- Pumping for the 29.75 km³/year transfer case is **{a['aggregate_electrical_pumping_gw']:.2f} GW**, before treatment, desalination, distribution, and city demand. The conditional generation budget therefore does **not** establish a positive net-energy project.
- At the same assumed head and efficiency, 5,000 and 25,000 m³/s yield **{h['hydro_sensitivity_gw_at_5000_m3_s']:.2f} GW** and **{h['hydro_sensitivity_gw_at_25000_m3_s']:.2f} GW**, respectively. These are flow sensitivities, not established Colorado River supplies.
- A hypothetical 73 km³ stored volume passing the full 1,219.2 m gross head once contains at most **{h['reservoir_energy_twh_at_full_gross_head_once']:.1f} TWh electrical** at 90% efficiency. Actual head varies with reservoir level, and this stored energy is not recurring generation without replenishment.

## Reservoir-only fill arithmetic (zero outlet, no losses)

- At 50 million gal/day: **{f['days_at_baseline_pipeline_flow']:,.0f} days** ({f['days_at_baseline_pipeline_flow'] / 365.25:,.1f} Julian years).
- At 29.75 km³/year average flow: **{f['days_at_annual_transfer_flow']:,.0f} days** ({f['days_at_annual_transfer_flow'] / 365.25:.2f} Julian years).
- At a constant 5,000 m³/s sensitivity: **{f['days_at_5000_m3_s_sensitivity']:.1f} days**.

Reservoir filling while supplying users requires inflow greater than concurrent outflow, evaporation, seepage, treatment losses, and environmental releases. Do not add flows at successive stages of one serial pipeline; apply a mass balance to every branch and tier.
"""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="print machine-readable JSON")
    args = parser.parse_args()
    values = main_values()
    if args.json:
        print(json.dumps(values, indent=2, sort_keys=True))
    else:
        print(markdown_report(values))


if __name__ == "__main__":
    main()
