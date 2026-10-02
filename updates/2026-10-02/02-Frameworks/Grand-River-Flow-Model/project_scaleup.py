#!/usr/bin/env python3
"""Scenario calculator for the Grand River / Mistveil scale-up sheet.

Inputs live in project_scaleup_inputs.json. The canonical pipeline, transfer,
and conditional hydro arithmetic is imported from recalculate.py to avoid
creating a second source of truth. Nothing in this model is a site assessment,
engineering design, resource allocation, emissions inventory, or build plan.

Run from this directory:
    python3 project_scaleup.py                 # Markdown report to stdout
    python3 project_scaleup.py --json          # machine-readable calculations
    python3 project_scaleup.py --output FILE   # write the Markdown report
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
DEFAULT_INPUT = HERE / "project_scaleup_inputs.json"

# Keep the existing Grand River model as the source of pipeline, transfer, and
# conditional hydro values, even when this script is launched from elsewhere.
sys.path.insert(0, str(HERE))
from recalculate import main_values as grand_river_values  # noqa: E402


class ScaleupInputError(ValueError):
    """Raised when a scenario input is inconsistent or outside its domain."""


def load_inputs(path: Path = DEFAULT_INPUT) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ScaleupInputError(f"Could not read scale-up inputs at {path}: {exc}") from exc


def _require_positive(value: float, name: str, *, allow_zero: bool = False) -> None:
    if not math.isfinite(value) or (value < 0 if allow_zero else value <= 0):
        comparator = "non-negative" if allow_zero else "positive"
        raise ScaleupInputError(f"{name} must be finite and {comparator}.")


def calculate(inputs: dict[str, Any] | None = None) -> dict[str, Any]:
    """Return all scenario calculations without changing any input file."""
    inputs = inputs or load_inputs()
    meta = inputs["metadata"]
    energy_inputs = inputs["energy"]
    water_inputs = inputs["water"]
    land_inputs = inputs["land"]
    air_inputs = inputs["air"]
    core = grand_river_values()

    hours_per_year = float(energy_inputs["hours_per_year"])
    julian_days_per_year = float(water_inputs["julian_days_per_year"])
    population = int(meta["mistveil_population_2100_people"])
    target_gw = float(meta["portfolio_target_gw"])
    _require_positive(hours_per_year, "hours_per_year")
    _require_positive(julian_days_per_year, "julian_days_per_year")
    _require_positive(population, "mistveil_population_2100_people")
    _require_positive(target_gw, "portfolio_target_gw")
    hours_per_gw_average_year = hours_per_year / 1_000.0  # TWh per average GW

    # Generator nameplate is AC/electrical GW for this illustrative portfolio.
    # Hydrogen storage is deliberately not in this list.
    mix_rows: list[dict[str, Any]] = []
    for source in energy_inputs["demonstration_mix"]:
        capacity_source = source.get("capacity_source")
        if capacity_source == "long_range_hydro_reference":
            capacity_gw = float(core["hydro_and_generation"]["hydro_nameplate_gw_at_reference_flow"])
        elif capacity_source == "target_residual":
            capacity_gw = target_gw - sum(row["capacity_gw"] for row in mix_rows)
        elif capacity_source is None:
            capacity_gw = float(source["capacity_gw"])
        else:
            raise ScaleupInputError(f"Unknown capacity_source {capacity_source!r} for {source['technology']}.")

        capacity_factor = float(source["capacity_factor"])
        _require_positive(capacity_gw, f"{source['technology']} capacity", allow_zero=True)
        if not 0 <= capacity_factor <= 1:
            raise ScaleupInputError(f"{source['technology']} capacity_factor must be between 0 and 1.")
        average_gw = capacity_gw * capacity_factor
        annual_twh = average_gw * hours_per_year / 1_000.0
        mix_rows.append({
            "technology": source["technology"],
            "classification": source["classification"],
            "capacity_gw": capacity_gw,
            "capacity_factor": capacity_factor,
            "average_output_gw": average_gw,
            "annual_generation_twh": annual_twh,
            "basis": source["basis"],
            "module_mwe": source.get("module_mwe"),
        })

    total_capacity_gw = sum(row["capacity_gw"] for row in mix_rows)
    if not math.isclose(total_capacity_gw, target_gw, rel_tol=0.0, abs_tol=1e-7):
        raise ScaleupInputError(
            f"Demonstration mix must sum to the target {target_gw:g} GW; got {total_capacity_gw:.9f} GW."
        )
    total_generation_twh = sum(row["annual_generation_twh"] for row in mix_rows)
    average_output_gw = total_generation_twh / hours_per_gw_average_year
    renewable_rows = [row for row in mix_rows if row["classification"].startswith("RENEWABLE")]
    renewable_capacity_gw = sum(row["capacity_gw"] for row in renewable_rows)
    renewable_generation_twh = sum(row["annual_generation_twh"] for row in renewable_rows)
    smr_capacity_gw = sum(
        row["capacity_gw"] for row in mix_rows
        if row["classification"] == "LOW_CARBON_FIRM_NOT_RENEWABLE"
    )
    smr_generation_twh = sum(
        row["annual_generation_twh"] for row in mix_rows
        if row["classification"] == "LOW_CARBON_FIRM_NOT_RENEWABLE"
    )

    capacity_sensitivity = []
    for capacity_factor in energy_inputs["portfolio_capacity_factor_scenarios"]:
        capacity_factor = float(capacity_factor)
        if not 0 <= capacity_factor <= 1:
            raise ScaleupInputError("Portfolio capacity-factor scenarios must be between 0 and 1.")
        capacity_sensitivity.append({
            "capacity_factor": capacity_factor,
            "average_output_gw": target_gw * capacity_factor,
            "annual_generation_twh": target_gw * capacity_factor * hours_per_year / 1_000.0,
            "nameplate_gw_for_1tw_average_energy_equivalent": 1_000.0 / capacity_factor if capacity_factor else None,
        })

    # City electric-load scenarios use city residents only. The legacy regional
    # service-population number is not used or added to this denominator.
    city_scenarios = []
    for mwh_per_person_year in energy_inputs["city_electricity_mwh_per_resident_year"]:
        mwh_per_person_year = float(mwh_per_person_year)
        _require_positive(mwh_per_person_year, "city electricity per resident")
        annual_twh = population / 1_000_000.0 * mwh_per_person_year
        average_gw = annual_twh / hours_per_gw_average_year
        peak_sensitivities = [
            {
                "load_factor": float(load_factor),
                "peak_gw": average_gw / float(load_factor),
            }
            for load_factor in energy_inputs["city_peak_load_factor_scenarios"]
        ]
        city_scenarios.append({
            "mwh_per_resident_year": mwh_per_person_year,
            "annual_city_electricity_twh": annual_twh,
            "average_city_load_gw": average_gw,
            "peak_sensitivities": peak_sensitivities,
        })
    central_city = next(
        (row for row in city_scenarios if math.isclose(row["mwh_per_resident_year"], 10.0)),
        city_scenarios[len(city_scenarios) // 2],
    )

    # Residential water is a comparison range, not a complete city allocation.
    city_water_cases = []
    for litres_per_person_day, label in zip(
        water_inputs["city_liters_per_resident_day"], water_inputs["city_water_labels"], strict=True
    ):
        litres_per_person_day = float(litres_per_person_day)
        _require_positive(litres_per_person_day, "city litres per resident per day")
        daily_m3 = population * litres_per_person_day / 1_000.0
        annual_km3 = daily_m3 * julian_days_per_year / 1_000_000_000.0
        city_water_cases.append({
            "label": label,
            "litres_per_person_day": litres_per_person_day,
            "daily_million_m3": daily_m3 / 1_000_000.0,
            "annual_km3": annual_km3,
        })

    # Core transfer/pump/recovery values come from the canonical Grand River
    # recalculation. RO energy assumes the stated annual transfer is delivered
    # product water; intake/feed and brine volumes still require a recovery model.
    transfer_case = core["annual_transfer_case"]
    annual_transfer_m3 = float(core["assumptions"]["target_annual_transfer_m3"])
    pump_gw = float(transfer_case["aggregate_electrical_pumping_gw"])
    recovery_gw = float(transfer_case["conditional_recovery_gw_if_same_flow_returns_through_full_static_head"])
    net_pump_gw = float(transfer_case["net_pump_draw_gw_after_that_single_recovery"])
    pump_annual_twh = pump_gw * hours_per_year / 1_000.0
    net_pump_annual_twh = net_pump_gw * hours_per_year / 1_000.0
    ro_cases = []
    for intensity, label in zip(
        water_inputs["seawater_reverse_osmosis_kwh_per_m3_product"], water_inputs["swro_labels"], strict=True
    ):
        intensity = float(intensity)
        _require_positive(intensity, "SWRO energy intensity")
        annual_twh = annual_transfer_m3 * intensity / 1_000_000_000.0
        ro_cases.append({
            "label": label,
            "kwh_per_m3_product": intensity,
            "annual_energy_twh": annual_twh,
            "average_load_gw": annual_twh / hours_per_gw_average_year,
            "identified_total_gross_pump_twh": central_city["annual_city_electricity_twh"] + pump_annual_twh + annual_twh,
            "identified_total_gross_pump_average_gw": (
                central_city["annual_city_electricity_twh"] + pump_annual_twh + annual_twh
            ) / hours_per_gw_average_year,
            "identified_total_after_conditional_recovery_twh": (
                central_city["annual_city_electricity_twh"] + net_pump_annual_twh + annual_twh
            ),
            "identified_total_after_conditional_recovery_average_gw": (
                central_city["annual_city_electricity_twh"] + net_pump_annual_twh + annual_twh
            ) / hours_per_gw_average_year,
        })
    central_ro = next((row for row in ro_cases if math.isclose(row["kwh_per_m3_product"], 3.3)), ro_cases[0])

    # City and energy land envelopes. PV portfolio nameplate is AC; the report's
    # NREL reference density is DC, so the DC/AC ratio is explicit and varied.
    city_areas = []
    for density in land_inputs["city_gross_density_people_per_km2"]:
        density = float(density)
        _require_positive(density, "gross city density")
        city_areas.append({
            "gross_density_people_per_km2": density,
            "city_area_km2": population / density,
        })
    pv_gw = next(row["capacity_gw"] for row in mix_rows if row["technology"] == "Utility-scale solar PV")
    pv_density = float(land_inputs["pv_capacity_density_mw_dc_per_km2"])
    pv_ratios = [float(value) for value in land_inputs["pv_dc_to_ac_ratio_scenarios"]]
    _require_positive(pv_density, "PV capacity density")
    if len(pv_ratios) != 2 or min(pv_ratios) <= 0:
        raise ScaleupInputError("PV DC/AC scenarios must contain two positive endpoints.")
    pv_area_endpoints = [pv_gw * 1_000.0 * ratio / pv_density for ratio in pv_ratios]
    pv_area_min, pv_area_max = min(pv_area_endpoints), max(pv_area_endpoints)

    wind_gw = next(row["capacity_gw"] for row in mix_rows if row["technology"] == "Wind")
    wind_densities = [float(value) for value in land_inputs["wind_capacity_density_mw_per_km2"]]
    if len(wind_densities) != 2 or min(wind_densities) <= 0:
        raise ScaleupInputError("Wind density scenarios must contain two positive endpoints.")
    wind_area_endpoints = [wind_gw * 1_000.0 / density for density in wind_densities]
    wind_area_min, wind_area_max = min(wind_area_endpoints), max(wind_area_endpoints)

    volume_km3 = float(land_inputs["reservoir_volume_km3"])
    _require_positive(volume_km3, "reservoir volume")
    reservoir_areas = []
    for mean_depth_m in land_inputs["reservoir_mean_depth_m_scenarios"]:
        mean_depth_m = float(mean_depth_m)
        _require_positive(mean_depth_m, "reservoir mean depth")
        reservoir_areas.append({
            "assumed_mean_depth_m": mean_depth_m,
            "surface_area_km2": volume_km3 * 1_000.0 / mean_depth_m,
        })
    min_city_area = min(row["city_area_km2"] for row in city_areas)
    max_city_area = max(row["city_area_km2"] for row in city_areas)
    min_reservoir_area = min(row["surface_area_km2"] for row in reservoir_areas)
    max_reservoir_area = max(row["surface_area_km2"] for row in reservoir_areas)
    nonoverlap_subtotal = {
        "minimum_km2": min_city_area + pv_area_min + wind_area_min + min_reservoir_area,
        "maximum_km2": max_city_area + pv_area_max + wind_area_max + max_reservoir_area,
    }

    # A separately labeled candidate ramp provides a concrete phased example
    # without assigning unapproved interim population targets. 2046 uses the
    # existing conditional hydro + SMR arithmetic; later stages scale the
    # illustrative portfolio mix and its blended factor proportionally.
    ramp_inputs = energy_inputs["illustrative_capacity_ramp"]
    ramp_first = ramp_inputs["first_operation"]
    ramp_hydro_cf = float(ramp_first["hydro_capacity_factor"])
    ramp_smr_cf = float(ramp_first["smr_capacity_factor"])
    ramp_smr_gw = float(ramp_first["smr_nameplate_gw"])
    _require_positive(ramp_smr_gw, "illustrative first-operation SMR capacity", allow_zero=True)
    if not 0 <= ramp_hydro_cf <= 1 or not 0 <= ramp_smr_cf <= 1:
        raise ScaleupInputError("First-operation capacity factors must be between 0 and 1.")
    early_hydro_cases = core["hydro_and_generation"]["early_phase_hydro_cases_at_reference_flow"]
    early_ramp_cases = []
    for hydro_case in early_hydro_cases:
        hydro_gw = float(hydro_case["electrical_gw_at_90pct_efficiency"])
        total_gw = hydro_gw + ramp_smr_gw
        average_gw = hydro_gw * ramp_hydro_cf + ramp_smr_gw * ramp_smr_cf
        early_ramp_cases.append({
            "head_ft": hydro_case["gross_head_ft"],
            "hydro_capacity_gw": hydro_gw,
            "smr_capacity_gw": ramp_smr_gw,
            "total_capacity_gw": total_gw,
            "average_output_gw": average_gw,
            "annual_generation_twh": average_gw * hours_per_year / 1_000.0,
            "capacity_factor": average_gw / total_gw,
        })
    ramp_rows = [{
        "milestone": "Ground-0 baseline",
        "year": meta["baseline_year"],
        "capacity_gw": None,
        "capacity_min_gw": None,
        "capacity_max_gw": None,
        "annual_generation_twh": None,
        "average_output_gw": None,
        "capacity_factor": None,
        "solar_pv_area_range_km2": None,
        "wind_area_envelope_range_km2": None,
        "basis": "No project-wide utility-scale capacity assigned; this is not a claim that the surrounding grid has zero capacity.",
    }, {
        "milestone": "First operation (conditional hydro + assumed SMR case)",
        "year": meta["first_operational_milestone_year"],
        "capacity_gw": None,
        "capacity_min_gw": min(row["total_capacity_gw"] for row in early_ramp_cases),
        "capacity_max_gw": max(row["total_capacity_gw"] for row in early_ramp_cases),
        "annual_generation_twh": None,
        "annual_generation_min_twh": min(row["annual_generation_twh"] for row in early_ramp_cases),
        "annual_generation_max_twh": max(row["annual_generation_twh"] for row in early_ramp_cases),
        "average_output_gw": None,
        "average_output_min_gw": min(row["average_output_gw"] for row in early_ramp_cases),
        "average_output_max_gw": max(row["average_output_gw"] for row in early_ramp_cases),
        "capacity_factor": None,
        "solar_pv_area_range_km2": None,
        "wind_area_envelope_range_km2": None,
        "basis": "Hydro at 1,200–2,500 ft and 476 m3/s plus the assumed 4-GW SMR array; hydro 70% and SMR 90% capacity-factor sensitivities. Conditional arithmetic only.",
    }]
    for milestone in ramp_inputs["later_milestones"]:
        capacity_gw = float(milestone["capacity_gw"])
        _require_positive(capacity_gw, f"illustrative {milestone.get('year', 'long-range')} capacity", allow_zero=True)
        average_gw = capacity_gw * (average_output_gw / total_capacity_gw)
        annual_twh = average_gw * hours_per_year / 1_000.0
        solar_stage_gw = capacity_gw * pv_gw / total_capacity_gw
        wind_stage_gw = capacity_gw * wind_gw / total_capacity_gw
        solar_stage_areas = [solar_stage_gw * 1_000.0 * ratio / pv_density for ratio in pv_ratios]
        wind_stage_areas = [wind_stage_gw * 1_000.0 / density for density in wind_densities]
        ramp_rows.append({
            "milestone": milestone.get(
                "label",
                f"Illustrative capacity at {milestone['year']}" if milestone.get("year") is not None else "Long-range 1-TW target (undated)",
            ),
            "year": milestone.get("year"),
            "capacity_gw": capacity_gw,
            "capacity_min_gw": capacity_gw,
            "capacity_max_gw": capacity_gw,
            "annual_generation_twh": annual_twh,
            "average_output_gw": average_gw,
            "capacity_factor": average_gw / capacity_gw,
            "solar_capacity_gw": solar_stage_gw,
            "wind_capacity_gw": wind_stage_gw,
            "solar_pv_area_range_km2": {"minimum": min(solar_stage_areas), "maximum": max(solar_stage_areas)},
            "wind_area_envelope_range_km2": {"minimum": min(wind_stage_areas), "maximum": max(wind_stage_areas)},
            "basis": ramp_inputs["status"],
        })

    # Airflow is a full-concurrency arithmetic stress case. It is not a city-wide
    # ventilation prescription; ASHRAE requires occupancy- and area-specific rates.
    airflow_cases = []
    for litres_per_second_person in air_inputs["illustrative_occupant_component_liters_per_second_per_design_occupant"]:
        litres_per_second_person = float(litres_per_second_person)
        _require_positive(litres_per_second_person, "illustrative outdoor-air occupant component")
        airflow_m3_s = population * litres_per_second_person / 1_000.0
        airflow_cases.append({
            "litres_per_second_per_person": litres_per_second_person,
            "full_population_concurrent_m3_s": airflow_m3_s,
            "full_population_concurrent_billion_m3_day": airflow_m3_s * 86_400.0 / 1_000_000_000.0,
        })

    per_10m_people = 10_000_000
    per_10m_water = []
    for litres_per_person_day in water_inputs["city_liters_per_resident_day"]:
        daily_m3 = per_10m_people * float(litres_per_person_day) / 1_000.0
        per_10m_water.append({
            "litres_per_person_day": float(litres_per_person_day),
            "daily_million_m3": daily_m3 / 1_000_000.0,
            "annual_km3": daily_m3 * julian_days_per_year / 1_000_000_000.0,
        })

    hydrogen_inputs = energy_inputs["hydrogen_storage"]
    round_trip_efficiency = float(hydrogen_inputs["round_trip_efficiency"])
    if not 0 < round_trip_efficiency <= 1:
        raise ScaleupInputError("Hydrogen round-trip efficiency must be in (0, 1].")
    hydrogen_cases = []
    for delivered_fraction in hydrogen_inputs["delivered_load_fraction_scenarios"]:
        delivered_fraction = float(delivered_fraction)
        if not 0 <= delivered_fraction <= 1:
            raise ScaleupInputError("Hydrogen-delivered load fractions must be between 0 and 1.")
        input_multiplier = (1.0 - delivered_fraction) + delivered_fraction / round_trip_efficiency
        hydrogen_cases.append({
            "fraction_of_delivered_load_via_hydrogen": delivered_fraction,
            "generation_input_multiplier": input_multiplier,
            "additional_generation_input_fraction": input_multiplier - 1.0,
            "central_identified_load_generation_twh": central_ro["identified_total_gross_pump_twh"] * input_multiplier,
        })

    per_10m_electricity_mwh = 10.0
    per_10m_energy_twh = per_10m_people / 1_000_000.0 * per_10m_electricity_mwh
    per_10m_average_gw = per_10m_energy_twh / hours_per_gw_average_year
    per_10m_air_range = [
        per_10m_people * float(rate) / 1_000.0
        for rate in air_inputs["illustrative_occupant_component_liters_per_second_per_design_occupant"]
    ]

    return {
        "metadata": meta,
        "core_reference": {
            "transfer_annual_m3": annual_transfer_m3,
            "transfer_flow_m3_s": transfer_case["flow_m3_s"],
            "transfer_parallel_60in_lines": transfer_case["parallel_baseline_lines"],
            "transfer_pipeline_km": transfer_case["aggregate_pipeline_km"],
            "transfer_pumping_gw": pump_gw,
            "conditional_recovery_gw": recovery_gw,
            "net_pump_draw_after_recovery_gw": net_pump_gw,
            "early_phase_hydro_1200ft_gw": core["hydro_and_generation"]["early_phase_hydro_cases_at_reference_flow"][0]["electrical_gw_at_90pct_efficiency"],
            "early_phase_hydro_2500ft_gw": core["hydro_and_generation"]["early_phase_hydro_cases_at_reference_flow"][1]["electrical_gw_at_90pct_efficiency"],
            "long_range_hydro_4000ft_gw": core["hydro_and_generation"]["hydro_nameplate_gw_at_reference_flow"],
        },
        "generation": {
            "hours_per_year": hours_per_year,
            "portfolio_target_gw": target_gw,
            "capacity_factor_sensitivities": capacity_sensitivity,
            "demonstration_mix": mix_rows,
            "total_nameplate_gw": total_capacity_gw,
            "total_annual_generation_twh": total_generation_twh,
            "average_output_gw": average_output_gw,
            "blended_capacity_factor": average_output_gw / total_capacity_gw,
            "renewable_nameplate_gw": renewable_capacity_gw,
            "renewable_annual_generation_twh": renewable_generation_twh,
            "renewable_generation_share": renewable_generation_twh / total_generation_twh,
            "smr_nameplate_gw": smr_capacity_gw,
            "smr_annual_generation_twh": smr_generation_twh,
        },
        "city_demand": {
            "population_people": population,
            "population_millions": population / 1_000_000.0,
            "regional_service_population_people_kept_separate": meta["regional_service_population_legacy_people"],
            "regional_population_added": False,
            "scenarios": city_scenarios,
            "central_scenario": central_city,
            "scope": energy_inputs["city_electricity_scope"],
        },
        "water": {
            "city_residential_scenarios": city_water_cases,
            "transfer_annual_km3": annual_transfer_m3 / 1_000_000_000.0,
            "transfer_flow_m3_s": transfer_case["flow_m3_s"],
            "transfer_pumping_gw": pump_gw,
            "transfer_pumping_annual_twh": pump_annual_twh,
            "conditional_recovery_gw": recovery_gw,
            "net_pump_draw_after_conditional_recovery_gw": net_pump_gw,
            "net_pump_energy_after_conditional_recovery_twh": net_pump_annual_twh,
            "swro_full_transfer_product_scenarios": ro_cases,
            "central_identified_load_case": central_ro,
            "annual_transfer_to_city_residential_volume_ratio": [
                (annual_transfer_m3 / 1_000_000_000.0) / row["annual_km3"]
                for row in city_water_cases
            ],
            "julian_days_per_year": julian_days_per_year,
        },
        "land": {
            "city_footprint_scenarios": city_areas,
            "pv_capacity_gw_ac": pv_gw,
            "pv_dc_ac_ratio_scenarios": pv_ratios,
            "pv_area_range_km2": {"minimum": pv_area_min, "maximum": pv_area_max},
            "wind_capacity_gw": wind_gw,
            "wind_area_envelope_range_km2": {"minimum": wind_area_min, "maximum": wind_area_max},
            "reservoir_volume_km3": volume_km3,
            "reservoir_surface_scenarios": reservoir_areas,
            "known_component_nonoverlap_subtotal_km2": nonoverlap_subtotal,
            "scope_note": land_inputs["area_scope_note"],
        },
        "air": {
            "ventilation_scenarios": airflow_cases,
            "per_10m_population_occupant_component_m3_s_range": {
                "minimum": min(per_10m_air_range),
                "maximum": max(per_10m_air_range),
            },
            "scope_note": air_inputs["airflow_scope_note"],
        },
        "hydrogen_storage": {
            "round_trip_efficiency": round_trip_efficiency,
            "counted_as_primary_generation": False,
            "scenarios": hydrogen_cases,
        },
        "per_10m_residents": {
            "city_electricity_mwh_per_person_year": per_10m_electricity_mwh,
            "city_electricity_twh_per_year": per_10m_energy_twh,
            "average_city_load_gw": per_10m_average_gw,
            "peak_city_load_gw_at_75pct_load_factor": per_10m_average_gw / 0.75,
            "water_scenarios": per_10m_water,
            "city_area_scenarios": [
                {
                    "gross_density_people_per_km2": float(density),
                    "city_area_km2": per_10m_people / float(density),
                }
                for density in land_inputs["city_gross_density_people_per_km2"]
            ],
        },
        "illustrative_capacity_ramp": {
            "status": ramp_inputs["status"],
            "post_2046_mix_scales_proportionally_from_demonstration_mix": ramp_inputs[
                "post_2046_mix_scales_proportionally_from_demonstration_mix"
            ],
            "first_operation_cases": early_ramp_cases,
            "milestones": ramp_rows,
        },
        "milestones": inputs["milestones"],
    }


def markdown_report(inputs: dict[str, Any] | None = None, values: dict[str, Any] | None = None) -> str:
    inputs = inputs or load_inputs()
    values = values or calculate(inputs)
    generation = values["generation"]
    city = values["city_demand"]
    water = values["water"]
    land = values["land"]
    air = values["air"]
    h2 = values["hydrogen_storage"]
    ramp = values["illustrative_capacity_ramp"]
    per10 = values["per_10m_residents"]
    core = values["core_reference"]
    meta = values["metadata"]
    source_rows = generation["demonstration_mix"]
    capacity_sensitivity = generation["capacity_factor_sensitivities"]
    city_scenarios = city["scenarios"]
    water_cases = water["city_residential_scenarios"]
    transfer_ro = water["swro_full_transfer_product_scenarios"]

    phase_lines = []
    for milestone in values["milestones"]:
        population_text = (
            f"~{milestone['population_people'] / 1_000_000:.0f} million"
            if milestone["population_people"] is not None else "Not assigned"
        )
        head = milestone["aggregate_head_ft"]
        if isinstance(head, list):
            head_text = f"{head[0]:,}–{head[1]:,} ft cumulative aggregate gross head"
        elif head is not None:
            head_text = f"{head:,} ft cumulative aggregate gross head"
        else:
            head_text = "Not assigned"
        capacity = milestone["portfolio_capacity_gw"]
        capacity_text = f"{capacity:,.0f} GW nameplate aspiration" if capacity is not None else "Not assigned"
        phase_lines.append(
            f"| {milestone['milestone']} | {milestone['window']} | {population_text} | {head_text} | {capacity_text} | {milestone['note']} |"
        )

    ramp_lines = []
    for row in ramp["milestones"]:
        year_text = str(row["year"]) if row["year"] is not None else "No final year assigned"
        if row["capacity_gw"] is None:
            capacity_text = (
                f"{row['capacity_min_gw']:,.2f}–{row['capacity_max_gw']:,.2f}"
                if row["capacity_min_gw"] is not None else "Not assigned"
            )
            avg_text = (
                f"{row['average_output_min_gw']:,.2f}–{row['average_output_max_gw']:,.2f}"
                if row.get("average_output_min_gw") is not None else "Not assigned"
            )
            annual_text = (
                f"{row['annual_generation_min_twh']:,.1f}–{row['annual_generation_max_twh']:,.1f}"
                if row.get("annual_generation_min_twh") is not None else "Not assigned"
            )
        else:
            capacity_text = f"{row['capacity_gw']:,.1f}"
            avg_text = f"{row['average_output_gw']:,.1f}"
            annual_text = f"{row['annual_generation_twh']:,.1f}"
        pv_area = row.get("solar_pv_area_range_km2")
        wind_area = row.get("wind_area_envelope_range_km2")
        pv_text = (
            f"{pv_area['minimum']:,.0f}–{pv_area['maximum']:,.0f}"
            if pv_area is not None else "Not mapped"
        )
        wind_text = (
            f"{wind_area['minimum']:,.0f}–{wind_area['maximum']:,.0f}"
            if wind_area is not None else "Not mapped"
        )
        ramp_lines.append(
            f"| {row['milestone']} | {year_text} | {capacity_text} | {avg_text} | {annual_text} | {pv_text} | {wind_text} |"
        )

    capacity_lines = [
        "| {_pct:.0f}% | {_avg:,.0f} | {_annual:,.0f} | {_nameplate} |".format(
            _pct=row["capacity_factor"] * 100.0,
            _avg=row["average_output_gw"],
            _annual=row["annual_generation_twh"],
            _nameplate=(
                "— (no capacity-factor equivalent)"
                if row["nameplate_gw_for_1tw_average_energy_equivalent"] is None
                else f"{row['nameplate_gw_for_1tw_average_energy_equivalent']:,.0f} GW"
            ),
        )
        for row in capacity_sensitivity
    ]
    mix_lines = [
        f"| {row['technology']} | {row['classification'].replace('_', ' ')} | "
        f"{row['capacity_gw']:,.3f} | {row['capacity_factor'] * 100:.1f}% | "
        f"{row['average_output_gw']:,.2f} | {row['annual_generation_twh']:,.1f} |"
        for row in source_rows
    ]
    city_lines = []
    for row in city_scenarios:
        peaks = {round(item["load_factor"], 5): item["peak_gw"] for item in row["peak_sensitivities"]}
        city_lines.append(
            f"| {row['mwh_per_resident_year']:,.0f} | {row['annual_city_electricity_twh']:,.0f} | "
            f"{row['average_city_load_gw']:,.1f} | {peaks[0.65]:,.1f} | {peaks[0.75]:,.1f} | {peaks[0.85]:,.1f} |"
        )
    water_lines = [
        f"| {row['label']} | {row['litres_per_person_day']:,.1f} | "
        f"{row['daily_million_m3']:,.2f} | {row['annual_km3']:,.3f} |"
        for row in water_cases
    ]
    city_area_lines = [
        f"| {row['gross_density_people_per_km2']:,.0f} | {row['city_area_km2']:,.0f} |"
        for row in land["city_footprint_scenarios"]
    ]
    reservoir_lines = [
        f"| {row['assumed_mean_depth_m']:,.0f} | {row['surface_area_km2']:,.0f} |"
        for row in land["reservoir_surface_scenarios"]
    ]
    air_lines = [
        f"| {row['litres_per_second_per_person']:.1f} | {row['full_population_concurrent_m3_s']:,.0f} | "
        f"{row['full_population_concurrent_billion_m3_day']:,.2f} |"
        for row in air["ventilation_scenarios"]
    ]
    h2_lines = [
        f"| {row['fraction_of_delivered_load_via_hydrogen'] * 100:.0f}% | "
        f"{row['generation_input_multiplier']:.2f}× | "
        f"{row['additional_generation_input_fraction'] * 100:.0f}% | "
        f"{row['central_identified_load_generation_twh']:,.1f} TWh/year |"
        for row in h2["scenarios"]
    ]
    central_city = city["central_scenario"]
    central_load = water["central_identified_load_case"]
    area_subtotal = land["known_component_nonoverlap_subtotal_km2"]
    p10_water = per10["water_scenarios"]
    p10_areas = per10["city_area_scenarios"]
    transfer_ratios = water["annual_transfer_to_city_residential_volume_ratio"]
    ramp_2100 = next(row for row in ramp["milestones"] if row["year"] == 2100)

    return f"""# Grand River & Mistveil — phased project scale-up sheet

**As of:** {meta['as_of']} · **Status:** `DERIVATIVE_BUILD` scenario calculator; not a project design or deployment plan.  
**Fictional program inputs:** first operation targeted around {meta['first_operational_milestone_year']}; Mistveil population about 80 million by 2100; early cumulative head aspiration 1,200–2,500 ft during the first 40–60 years; long-range cumulative head target 4,000 ft; 1-TW portfolio provisionally means installed/nameplate capacity. These are not verified real-world claims.  
**Provenance:** sourced benchmarks are `CANONICAL_SOURCE`; reproducible calculations are `DERIVATIVE_BUILD`; project setting and goals are `FICTION` (`NARRATIVE_SANDBOX`). Editable assumptions: [`project_scaleup_inputs.json`](./project_scaleup_inputs.json). Calculator: [`project_scaleup.py`](./project_scaleup.py). Core water/hydro arithmetic: [`recalculate.py`](./recalculate.py).

> **Bottom line:** a 1,000-GW nameplate portfolio would yield **2,628–7,884 TWh/year** at 30–90% blended capacity factor (**300–900 GW average**, before curtailment, storage loss, outages, parasitic loads, and transmission). One deliberately hypothetical 1-TW example mix yields **{generation['total_annual_generation_twh']:,.1f} TWh/year** (**{generation['average_output_gw']:,.1f} GW average**). The 80-million-person city-only electricity envelope is **400–1,600 TWh/year** (**{city_scenarios[0]['average_city_load_gw']:,.1f}–{city_scenarios[-1]['average_city_load_gw']:,.1f} GW average**), before the separately modeled aqueduct/desalination, construction, and major industrial loads. Thus 1 TW nameplate is not a demand forecast or a firm-output promise.

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
{chr(10).join(capacity_lines)}

\* The right-hand column is an annual-energy arithmetic only (`1,000 GW ÷ capacity factor`). A 1-TW-average or firm-delivery requirement also needs hourly adequacy, storage/dispatch, reserve, transmission, and outage analysis. Hydrogen storage adds charging generation because it loses energy; it is not an extra primary source.

### Worked 1,000-GW low-carbon example — deliberately not a deployment plan

The following arithmetic mix forces the provisional 1,000-GW total so the order of magnitude can be inspected. It uses reference fleet capacity factors where available; the marine/tidal line is merely the residual needed to balance the illustration. It does **not** imply those resources exist at these sites or can be permitted, transmitted, or built. The SMR line is low-carbon firm **but not renewable**.

| Candidate generator | Classification | Nameplate (GW) | Capacity factor assumption/reference | Average output (GW) | Annual generation (TWh) |
|---|---|---:|---:|---:|---:|
{chr(10).join(mix_lines)}
| **Example total** | **{generation['renewable_nameplate_gw']:,.0f} GW renewable + {generation['smr_nameplate_gw']:,.0f} GW SMR (not renewable)** | **{generation['total_nameplate_gw']:,.0f}** | **{generation['blended_capacity_factor'] * 100:.2f}% blended** | **{generation['average_output_gw']:,.2f}** | **{generation['total_annual_generation_twh']:,.1f}** |

In this constructed mix, renewable sources contribute **{generation['renewable_nameplate_gw']:,.0f} GW nameplate** and approximately **{generation['renewable_annual_generation_twh']:,.1f} TWh/year** ({generation['renewable_generation_share'] * 100:.1f}% of example annual output); SMRs contribute **{generation['smr_nameplate_gw']:,.0f} GW nameplate** and **{generation['smr_annual_generation_twh']:,.1f} TWh/year**. The 150-GW SMR placeholder equals **{int(generation['smr_nameplate_gw'] * 1_000 / 50):,} assumed 50-MWe modules**—a supply-chain and licensing scale, not an approved program. The 4,000-ft/476-m³/s Grand River hydro entry is conditional on the existing calculator's historical-flow context and 90% conversion assumption; the 70% annual capacity factor is illustrative.

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
{chr(10).join(h2_lines)}

This is an energy-only sensitivity, not a hydrogen plant design. Electrolyzer power, fuel-cell output power, storage duration, hydrogen source, compression/liquefaction, leakage, safety, and heat reuse remain separate design inputs.

## 3. City and infrastructure demand envelope

### City electricity (80 million residents by 2100)

**Illustrative assumption, not a forecast:** test 5 / 10 / 20 MWh per resident-year for city-facing electricity. These inputs do not include the separately modeled bulk aqueduct lift or seawater desalination and do not establish major industrial, construction, or process-heat loads. Peak is shown as an independent load-factor sensitivity.

| City electricity intensity (MWh/resident-year) | Annual city electricity (TWh) | Average city load (GW) | Peak at 65% load factor (GW) | Peak at 75% | Peak at 85% |
|---:|---:|---:|---:|---:|---:|
{chr(10).join(city_lines)}

Central arithmetic: **{central_city['annual_city_electricity_twh']:,.0f} TWh/year**, **{central_city['average_city_load_gw']:,.1f} GW average**, and **{central_city['peak_sensitivities'][1]['peak_gw']:,.1f} GW peak** at a 75% load factor. This is an end-use scenario; system peak must ultimately be built from hourly district and industrial load profiles.

### Separate bulk-transfer and desalination stress case

The existing Grand River model's **29.75 km³/year** transfer scenario equals **{water['transfer_flow_m3_s']:,.2f} m³/s**, with **{transfer_case_line(core)}** under its simplified workbook assumptions. This is the *pipeline's assumed 4,000-ft static lift*, not the dam-series aggregate head. Its full return-turbine recovery of **{water['conditional_recovery_gw']:.2f} GW** is conditional: it is unavailable if the water is consumed or does not return through that same drop.

If all **29.75 km³/year is treated as delivered desalinated product water**, DOE's 2.7–4.0 kWh/m³ seawater-RO reference range implies **{transfer_ro[0]['annual_energy_twh']:,.1f}–{transfer_ro[-1]['annual_energy_twh']:,.1f} TWh/year** (**{transfer_ro[0]['average_load_gw']:.2f}–{transfer_ro[-1]['average_load_gw']:.2f} GW average**) for RO only. The central 3.3-kWh/m³ reference is **{central_load['annual_energy_twh']:,.1f} TWh/year** ({central_load['average_load_gw']:.2f} GW). Feed volume, recovery ratio, brine handling, intake, treatment, and distribution are not calculated here; if 29.75 km³ refers to raw feed instead of product, this RO energy calculation must be revised.

| Identified electricity only | Annual energy (TWh/year) | Average load (GW) |
|---|---:|---:|
| 80M city at 10 MWh/resident-year | {central_city['annual_city_electricity_twh']:,.1f} | {central_city['average_city_load_gw']:,.2f} |
| Bulk-transfer pumping, gross | {water['transfer_pumping_annual_twh']:,.1f} | {water['transfer_pumping_gw']:,.2f} |
| Full-transfer RO, central 3.3 kWh/m³ product assumption | {central_load['annual_energy_twh']:,.1f} | {central_load['average_load_gw']:.2f} |
| **Subtotal, no recovery credit** | **{central_load['identified_total_gross_pump_twh']:,.1f}** | **{central_load['identified_total_gross_pump_average_gw']:.2f}** |
| **Subtotal if the conditional 10.15-GW return recovery is actually available** | **{central_load['identified_total_after_conditional_recovery_twh']:,.1f}** | **{central_load['identified_total_after_conditional_recovery_average_gw']:.2f}** |

The worked 1-TW example generates {generation['total_annual_generation_twh'] / central_load['identified_total_gross_pump_twh']:.2f}× this identified subtotal on an annual-energy basis; the arithmetic difference is {generation['total_annual_generation_twh'] - central_load['identified_total_gross_pump_twh']:,.1f} TWh/year, **unallocated** to industry, export, storage charging, or curtailment. That is not a surplus finding. This identified subtotal is **not total project demand**. It includes no separately specified process industry, construction-material production, cooling, backup, storage losses, transmission/distribution losses, or additional regional services. City electricity and transfer/desalination are added here as distinct energy uses; the water volumes themselves must not be added if the 29.75-km³ figure already includes the city's supply.

## 4. Land envelope

No sites, access, legal boundaries, or land-use permissions are established. These are arithmetic envelopes for the worked mix and 80-million-city endpoint, not parcels to acquire.

| Mistveil gross urban density assumption (people/km²) | City boundary footprint (km²) |
|---:|---:|
{chr(10).join(city_area_lines)}

The example mix's **400-GW AC solar PV** uses the NREL reference density of about 43 MWdc/km². With a separate illustrative DC/AC ratio range of {min(land['pv_dc_ac_ratio_scenarios']):.1f}–{max(land['pv_dc_ac_ratio_scenarios']):.1f}, the array-area sensitivity is **{land['pv_area_range_km2']['minimum']:,.0f}–{land['pv_area_range_km2']['maximum']:,.0f} km²**. This depends on array/layout and land-use definitions.

The **300-GW wind** line maps to about **{land['wind_area_envelope_range_km2']['minimum']:,.0f}–{land['wind_area_envelope_range_km2']['maximum']:,.0f} km²** using NREL's modeled 7-to-3-MW/km² included-area / convex-hull density references. A wind envelope is not all directly disturbed land; agriculture or other co-use may be possible, subject to site conditions and agreements.

| Assumed reservoir mean depth (m) | Surface-area arithmetic for the fictional 73-km³ volume (km²) |
|---:|---:|
{chr(10).join(reservoir_lines)}

The reservoir table is `area ≈ volume ÷ assumed mean depth`; it does not supply a surveyed basin or operating pool. A deliberately simplified **non-overlap subtotal** of city + PV + wind envelope + reservoir is **{area_subtotal['minimum_km2']:,.0f}–{area_subtotal['maximum_km2']:,.0f} km²** ({area_subtotal['minimum_km2'] / 2.58999:,.0f}–{area_subtotal['maximum_km2'] / 2.58999:,.0f} mi²). Do **not** read this as a real total footprint: wind land is an envelope, real sites can overlap/co-use, and this subtotal excludes SMRs, geothermal, marine sites, industrial districts, transmission corridors, roads, buffers, construction yards, protected areas, and Tribal/community boundaries.

## 5. Water envelope

For an 80-million resident census, the following city-residential comparisons are not full municipal or project water allocations:

| Water-use benchmark / scenario | L/person/day | City volume (million m³/day) | Annual volume (km³/year) |
|---|---:|---:|---:|
{chr(10).join(water_lines)}

EPA's 82-gallon at-home U.S. comparison is converted at 3.785411784 L/US gal. The **29.75-km³/year** aggregate-transfer placeholder is about **{transfer_ratios[0]:.2f}×** the 150-L allowance or **{transfer_ratios[1]:.2f}×** the EPA at-home comparison. This is scale arithmetic, not evidence that this volume is available, needed, potable, or allocated to Mistveil. If transfer water includes city supply, do not add the city-volume row again in the water balance. Keep the separate ~40M regional-service figure non-additive.

**Not quantified:** source rights and yield, ecological releases, reuse and return flows, leakage, evaporation, storage operations, fire reserves, non-residential demand, agriculture, construction water, treatment reject, brine, and cooling water for SMR/geothermal or other thermal systems. Closed-loop, once-through, and dry/hybrid cooling would have different land/water/air tradeoffs.

## 6. Air, ventilation, and emissions boundary

ASHRAE ventilation is designed by occupancy/space and floor area, not by assigning one universal “air per city resident” number. A simplified breathing-zone form is:

```text
Vbz = Rp × Pz + Ra × Az
```

where `Pz` is design population and `Az` is occupiable floor area for each zone; occupancy category, distribution effectiveness, system diversity, exhaust, and adopted code edition still matter. Because building floor area and space mix are not assigned, only an occupant-component stress illustration is shown below. The 2.5–5.0 L/s/person values are **not code rates** and assume all 80 million people are concurrent design occupants solely to show how the formula scales.

| Illustrative occupant component (L/s per design occupant) | Full-80M concurrent airflow (m³/s) | Equivalent outdoor-air volume (billion m³/day) |
|---:|---:|---:|
{chr(10).join(air_lines)}

This is not a breathing-oxygen budget or a city-wide replacement-air requirement. Final design needs per-space occupancy and area, ventilation effectiveness, filtration, outdoor pollutant conditions, heat/moisture loads, smoke control, and applicable standards. For every additional 10 million residents, the same illustrative occupant component scales to **{air['per_10m_population_occupant_component_m3_s_range']['minimum']:,.0f}–{air['per_10m_population_occupant_component_m3_s_range']['maximum']:,.0f} m³/s** at full simultaneous design occupancy.

No project emissions total is claimed. Once the energy and construction mix is defined, use a declared boundary such as:

```text
annual operational CO₂e = Σ electricity_i × emission_factor_i + imports/backup + upstream fuel supply
```

Track local pollutants (for example NOₓ, SO₂, particulate matter, VOCs and ozone precursors), construction and lifecycle emissions, thermal discharges, and indoor/outdoor exposure separately. Renewable generation has lifecycle and construction impacts; SMRs are low-carbon, not zero-impact or renewable; hydrogen point-of-use emissions depend on the fuel and system boundary.

## 7. Phased scale-up sheet — Ground-0 through long range

**Interim resident counts and phase GW additions remain unassigned on purpose.** The source canon has an 80-million 2100 city target, but no approved 2046/2066/2086 population milestones. This table preserves that boundary and supplies the formulas for populating each phase when the scenario owner chooses those inputs.

| Milestone | Planning window | Mistveil residents used | Cumulative head marker | Portfolio capacity marker | Stage gate / calculation action |
|---|---|---:|---|---|---|
{chr(10).join(phase_lines)}

### One illustrative capacity ramp (scenario inputs, not adopted milestones)

To make the construction scale visible without inventing interim population targets, the calculator also carries one **analyst-chosen** capacity pathway. The 2046 range is the existing conditional early-head hydro case plus the assumed 4-GW SMR array. Later steps use 25 GW by 2066, 100 GW by 2086, 300 GW by 2100, then the undated 1-TW goal. For the later steps only, the worked portfolio mix is scaled proportionally, preserving its 43.78% blended capacity factor and renewable/SMR shares. These 25/100/300-GW waypoints are editable scenario inputs—not user-approved milestones, demand-derived requirements, a resource plan, or a commitment. The long-range goal has no assigned year.

| Illustrative scenario waypoint | Year / timing | Nameplate / conditional output proxy (GW) | Average generation (GW) | Annual generation (TWh) | Scaled PV array area (km²) | Scaled wind land envelope (km²) |
|---|---|---:|---:|---:|---:|---:|
{chr(10).join(ramp_lines)}

The 2046 row's hydro component is a **conditional electrical-output proxy** from the stated flow/head calculation, not a verified hydro nameplate, firm output, or water allocation; later rows are scenario nameplate totals.

At 2100, the 300-GW illustration produces **{ramp_2100['annual_generation_twh']:,.1f} TWh/year** under the sample mix—only about **{(ramp_2100['annual_generation_twh'] / central_load['identified_total_gross_pump_twh'] - 1) * 100:.1f}%** above the central identified annual-energy subtotal of {central_load['identified_total_gross_pump_twh']:,.1f} TWh/year. That narrow annual-energy comparison does not cover hourly peak, firm adequacy, storage losses, major industry, transmission losses, or outages. The ramp is a discussion tool, not evidence that 300 GW is sufficient or buildable.

### Per-10-million-resident scale factor (illustrative 10 MWh/person-year city electricity)

| Metric per additional 10M residents | Scale factor |
|---|---:|
| City-facing annual electricity | {per10['city_electricity_twh_per_year']:,.0f} TWh/year |
| City-facing average electric load | {per10['average_city_load_gw']:,.2f} GW |
| City-facing peak at 75% load factor | {per10['peak_city_load_gw_at_75pct_load_factor']:,.2f} GW |
| Residential water at 150 L/person/day | {p10_water[0]['daily_million_m3']:,.2f} million m³/day; {p10_water[0]['annual_km3']:.3f} km³/year |
| Residential water at 310.4 L/person/day | {p10_water[1]['daily_million_m3']:,.2f} million m³/day; {p10_water[1]['annual_km3']:.3f} km³/year |
| Gross urbanized land at the tested 5,000–20,000 people/km² | {min(row['city_area_km2'] for row in p10_areas):,.0f}–{max(row['city_area_km2'] for row in p10_areas):,.0f} km² |
| Ventilation occupant component at 2.5–5.0 L/s/person | {air['per_10m_population_occupant_component_m3_s_range']['minimum']:,.0f}–{air['per_10m_population_occupant_component_m3_s_range']['maximum']:,.0f} m³/s at full simultaneous design occupancy |

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
"""


def transfer_case_line(core: dict[str, Any]) -> str:
    return (
        f"{core['transfer_parallel_60in_lines']} parallel 60-inch baseline-throughput lines, "
        f"about {core['transfer_pipeline_km']:,.0f} cumulative pipeline-km, and "
        f"{core['transfer_pumping_gw']:.2f} GW gross pumping input"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="path to editable JSON inputs")
    parser.add_argument("--json", action="store_true", help="print machine-readable calculations")
    parser.add_argument("--output", type=Path, help="write the Markdown report to this path")
    args = parser.parse_args()

    try:
        inputs = load_inputs(args.input)
        values = calculate(inputs)
        if args.json:
            if args.output:
                parser.error("--json and --output cannot be used together")
            print(json.dumps(values, indent=2, sort_keys=True))
            return
        report = markdown_report(inputs, values)
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(report, encoding="utf-8")
            print(f"Wrote {args.output}")
        else:
            print(report)
    except ScaleupInputError as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()
