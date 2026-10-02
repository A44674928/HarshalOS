import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const modelDir = path.resolve(
  'updates/2026-10-02/02-Frameworks/Grand-River-Flow-Model',
);
const modelScript = path.join(modelDir, 'project_scaleup.py');
const inputsPath = path.join(modelDir, 'project_scaleup_inputs.json');

function runModel(...args) {
  const result = spawnSync('python3', [modelScript, ...args], {
    cwd: modelDir,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

function closeTo(actual, expected, tolerance = 1e-8) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

test('project scale-up calculator preserves scenario boundaries and reproduces energy, land, water, and air arithmetic', () => {
  const inputs = JSON.parse(readFileSync(inputsPath, 'utf8'));
  const result = JSON.parse(runModel('--json'));

  assert.equal(inputs.metadata.mistveil_population_2100_people, 80_000_000);
  assert.equal(inputs.metadata.regional_service_population_legacy_people, 40_000_000);
  assert.equal(inputs.metadata.regional_service_population_additive, false);
  assert.equal(result.city_demand.population_people, 80_000_000);
  assert.equal(result.city_demand.regional_service_population_people_kept_separate, 40_000_000);
  assert.equal(result.city_demand.regional_population_added, false);
  assert.equal(result.metadata.long_range_completion_year, null);

  const generation = result.generation;
  closeTo(generation.total_nameplate_gw, 1_000);
  closeTo(generation.total_annual_generation_twh, 3_835.0696161669894, 1e-7);
  closeTo(generation.average_output_gw, 437.79333517888, 1e-8);
  closeTo(generation.blended_capacity_factor, 0.43779333517888, 1e-10);
  closeTo(generation.renewable_nameplate_gw, 850);
  closeTo(generation.smr_nameplate_gw, 150);
  closeTo(generation.renewable_generation_share, 0.6888943045595944, 1e-10);
  assert.ok(!generation.demonstration_mix.some((row) => /hydrogen|fuel cell/i.test(row.technology)));
  assert.ok(generation.demonstration_mix.some((row) => row.classification === 'LOW_CARBON_FIRM_NOT_RENEWABLE'));

  const halfCapacityFactor = generation.capacity_factor_sensitivities.find(
    (row) => row.capacity_factor === 0.5,
  );
  closeTo(halfCapacityFactor.average_output_gw, 500);
  closeTo(halfCapacityFactor.annual_generation_twh, 4_380);
  closeTo(halfCapacityFactor.nameplate_gw_for_1tw_average_energy_equivalent, 2_000);

  const cityScenarios = result.city_demand.scenarios;
  assert.deepEqual(
    cityScenarios.map((row) => row.annual_city_electricity_twh),
    [400, 800, 1_600],
  );
  closeTo(cityScenarios[1].average_city_load_gw, 91.32420091324201, 1e-10);

  const water = result.water;
  closeTo(water.city_residential_scenarios[0].annual_km3, 4.383, 1e-10);
  closeTo(water.city_residential_scenarios[1].annual_km3, 9.069888, 1e-9);
  closeTo(water.transfer_annual_km3, 29.75, 1e-10);
  closeTo(water.transfer_pumping_gw, 17.957634499117518, 1e-10);
  closeTo(water.conditional_recovery_gw, 10.147743326488706, 1e-10);
  closeTo(water.central_identified_load_case.annual_energy_twh, 98.175, 1e-10);
  closeTo(water.central_identified_load_case.identified_total_gross_pump_twh, 1_055.4838782122695, 1e-7);

  const land = result.land;
  closeTo(land.pv_area_range_km2.minimum, 9_302.32558139535, 1e-8);
  closeTo(land.pv_area_range_km2.maximum, 12_093.023255813954, 1e-8);
  closeTo(land.wind_area_envelope_range_km2.minimum, 42_857.142857142855, 1e-8);
  closeTo(land.wind_area_envelope_range_km2.maximum, 100_000, 1e-8);
  closeTo(land.known_component_nonoverlap_subtotal_km2.minimum_km2, 56_451.468438538206, 1e-7);
  closeTo(land.known_component_nonoverlap_subtotal_km2.maximum_km2, 129_553.02325581395, 1e-7);

  const air = result.air.ventilation_scenarios;
  closeTo(air[0].full_population_concurrent_m3_s, 200_000);
  closeTo(air[1].full_population_concurrent_m3_s, 400_000);
  closeTo(air[0].full_population_concurrent_billion_m3_day, 17.28);
  closeTo(air[1].full_population_concurrent_billion_m3_day, 34.56);

  const hydrogen = result.hydrogen_storage;
  assert.equal(hydrogen.counted_as_primary_generation, false);
  closeTo(hydrogen.scenarios[1].generation_input_multiplier, 1.3);
  closeTo(hydrogen.scenarios[1].central_identified_load_generation_twh, 1_372.1290416759505, 1e-7);

  const ramp = result.illustrative_capacity_ramp.milestones;
  assert.equal(ramp[0].capacity_gw, null);
  closeTo(ramp[1].capacity_min_gw, 5.53714443904, 1e-9);
  closeTo(ramp[1].capacity_max_gw, 7.202384248, 1e-9);
  assert.deepEqual(
    ramp.filter((row) => row.year !== 2046 && row.year !== 2026).map((row) => row.capacity_gw),
    [25, 100, 300, 1_000],
  );
  closeTo(ramp.find((row) => row.year === 2100).annual_generation_twh, 1_150.520884850097, 1e-7);
  assert.ok(
    result.milestones
      .filter((row) => row.milestone !== 'Mistveil 2100 population target')
      .every((row) => row.population_people === null),
  );
  assert.equal(
    result.milestones.find((row) => row.milestone === 'Mistveil 2100 population target').population_people,
    80_000_000,
  );

  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'harshal-scale-up-'));
  try {
    const reportPath = path.join(tempDir, 'scale-up.md');
    runModel('--output', reportPath);
    const report = readFileSync(reportPath, 'utf8');
    const checkedInReport = readFileSync(path.join(modelDir, 'PROJECT-SCALE-UP-SHEET.md'), 'utf8');
    assert.equal(report, checkedInReport, 'checked-in report must match the reproducible calculator output');
    assert.equal((report.match(/One illustrative capacity ramp/g) || []).length, 1);
    assert.match(report, /1,000 GW nameplate/);
    assert.match(report, /SMRs are low-carbon, not zero-impact or renewable/);
    assert.match(report, /Storage \/ energy carrier, not primary generation:\*\* hydrogen/i);
    assert.match(report, /~40-million regional-service figure is kept separate and non-additive/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
