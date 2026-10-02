import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SCRIPT = path.join(ROOT, "updates/2026-10-02/02-Frameworks/Grand-River-Flow-Model/recalculate.py");
const CANONICAL = path.join(ROOT, "updates/2026-10-02/02-Frameworks/Grand-River-Flow-Model/CANONICAL-NUMBERS.md");
const result = spawnSync(process.env.PYTHON || "python3", [SCRIPT, "--json"], { cwd: ROOT, encoding: "utf8" });
assert.equal(result.status, 0, result.stderr || result.stdout);
const model = JSON.parse(result.stdout);
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
};

test("Grand River workbook baseline is converted reproducibly", () => {
  near(model.pipeline_baseline.flow_m3_s, 2.19063181944, 1e-9, "50M US gal/day to m³/s");
  near(model.pipeline_baseline.litres_person_day_at_80m, 2.365882365, 1e-9, "baseline per-capita flow at 80M");
  near(model.pipeline_baseline.friction_head_loss_m, 349.7653, 0.01, "single-line Hazen-Williams loss");
  near(model.pipeline_baseline.electrical_pumping_mw, 41.7551, 0.01, "single-line pump input");
});

test("large transfer scenario separates pipeline pumping from hydro output", () => {
  near(model.annual_transfer_case.flow_m3_s, 942.7206125, 1e-6, "29.75 km³/year flow");
  assert.equal(model.annual_transfer_case.parallel_baseline_lines, 431);
  near(model.annual_transfer_case.aggregate_electrical_pumping_gw, 17.9576, 0.01, "parallel-line pump input");
  near(model.hydro_and_generation.hydro_nameplate_gw_at_reference_flow, 5.1238, 0.01, "conditional 4,000-ft long-range hydro context case");
  const earlyPhase = model.hydro_and_generation.early_phase_hydro_cases_at_reference_flow;
  assert.deepEqual(earlyPhase.map(item => item.gross_head_ft), [1_200, 2_500]);
  near(earlyPhase[0].gross_head_m, 365.76, 1e-9, "1,200-ft early-phase head conversion");
  near(earlyPhase[0].electrical_gw_at_90pct_efficiency, 1.537144439, 1e-9, "1,200-ft early-phase hydro context");
  near(earlyPhase[1].gross_head_m, 762, 1e-9, "2,500-ft early-phase head conversion");
  near(earlyPhase[1].electrical_gw_at_90pct_efficiency, 3.202384248, 1e-9, "2,500-ft early-phase hydro context");
  assert.equal(model.assumptions.long_range_aggregate_head_ft, 4_000);
  near(model.hydro_and_generation.smr_nameplate_gw, 4, 1e-12, "assumed SMR nameplate");
  near(model.assumptions.multi_source_portfolio_target_nameplate_gw, 1_000, 1e-12, "provisional 1-TW nameplate target");
  near(model.hydro_and_generation.early_phase_portfolio_cases_with_assumed_smr[0].combined_with_assumed_smr_gw, 5.537144439, 1e-9, "early-phase lower-head total with assumed SMRs");
  near(model.hydro_and_generation.early_phase_portfolio_cases_with_assumed_smr[1].combined_with_assumed_smr_gw, 7.202384248, 1e-9, "early-phase upper-head total with assumed SMRs");
  near(model.hydro_and_generation.unallocated_portfolio_target_gap_gw, 990.8761852, 1e-6, "unallocated long-range gap to 1 TW");
  assert.ok(model.annual_transfer_case.aggregate_electrical_pumping_gw > model.hydro_and_generation.combined_conditional_nameplate_gw,
    "the conditional generation budget does not establish a net-positive pumped transfer");
});

test("canonical extreme-flow gross hydro row is rounded from the stated constants", () => {
  const grossGw = (1_000 * 9.81 * 25_000 * 4_000 * 0.3048) / 1e9;
  near(grossGw, 299.0088, 1e-10, "25,000 m³/s gross hydraulic power");
  near(grossGw * 0.9, model.hydro_and_generation.hydro_sensitivity_gw_at_25000_m3_s, 1e-10,
    "25,000 m³/s output after 90% conversion");
  const canonicalText = readFileSync(CANONICAL, "utf8");
  assert.match(canonicalText, /25,000 m³\/s \| 1,219\.2 m \(4,000 ft\) \| \*\*299\.01 GW\*\* \| \*\*269\.11 GW\*\*/);
});

test("reservoir fill outputs are volume divided by net inflow only", () => {
  near(model.reservoir_fill.days_at_5000_m3_s_sensitivity, 168.98148, 1e-4, "73 km³ at 5,000 m³/s");
  near(model.reservoir_fill.days_at_annual_transfer_flow, 896.2437, 0.01, "73 km³ at 29.75 km³/year");
  near(model.reservoir_fill.days_at_baseline_pipeline_flow, 385691.2, 1, "73 km³ at workbook baseline");
});
