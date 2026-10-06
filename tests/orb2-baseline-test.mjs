import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const context = vm.createContext({ window: {}, Math, Number, Object });
vm.runInContext(readFileSync(new URL('../js/good-intelligence-orb2.js', import.meta.url), 'utf8'), context);
const metrics = context.window.GoodIntelligenceOrb2.fibonacciBandMetrics;
const bandGeometry = context.window.GoodIntelligenceOrb2.logarithmicBandGeometry;
const topologyEnvelope = context.window.GoodIntelligenceOrb2.topologyEnvelope;
const topologyDistribution = context.window.GoodIntelligenceOrb2.topologyDistribution;
const marketDataPlacement = context.window.GoodIntelligenceOrb2.marketDataPlacement;
const logBasis = Math.log(100), halfLogWidth = 0.04;
const packet = logPosition => ({
  latestBar: { close: Math.exp(logBasis + logPosition * halfLogWidth) },
  basis: 100,
  bands: {
    lower1000: Math.exp(logBasis - halfLogWidth),
    upper1000: Math.exp(logBasis + halfLogWidth)
  }
});
const closeTo = (actual, expected, message) => assert.ok(
  Math.abs(actual - expected) <= 1e-12 * Math.max(1, Math.abs(expected)),
  `${message}: expected ${expected}, got ${actual}`
);

test('FBB placement uses log distances symmetrically around the geometric basis', () => {
  for (const [logPosition, expected] of [[-1, 0], [-0.5, .25], [0, .5], [.5, .75], [1, 1], [2, 1.5], [-2, -.5]]) {
    closeTo(metrics(packet(logPosition)).p, expected, `log position ${logPosition}`);
  }
  const result = metrics(packet(0));
  closeTo(result.volatilityPct, halfLogWidth * 2 * 100, 'log-space band width percent');
  closeTo(result.volatility, (halfLogWidth * 2 * 100) / 12, 'normalized log volatility');
});

test('missing, nonpositive, and invalid FBB inputs remain unknown', () => {
  const valid = packet(0);
  for (const value of [
    null,
    {},
    { ...valid, basis: null },
    { ...valid, basis: 50 },
    { ...valid, latestBar: { close: 0 } },
    { ...valid, bands: { ...valid.bands, lower1000: 0 } },
    { ...valid, latestBar: { close: NaN } }
  ]) {
    assert.equal(metrics(value).held, true);
    assert.equal(metrics(value).p, null);
  }
});


test('spatial FBB bands expand logarithmically rather than linearly', () => {
  const one = bandGeometry(metrics(packet(1)));
  const two = bandGeometry(metrics(packet(1.45)));
  const four = bandGeometry(metrics(packet(2.1025)));
  assert.ok(two.radius > one.radius, 'next logarithmic band expands');
  assert.ok(four.radius > two.radius, 'later logarithmic band expands again');
  assert.equal(one.index, 0);
  assert.equal(two.index, 1);
  assert.equal(four.index, 2);
});

test('topology envelope converges toward the ideal sphere only when axes align', () => {
  const ideal = topologyEnvelope([
    { topology: { axes: { x: 1, y: 1, z: 1 } } },
    { topology: { axes: { x: 1, y: 1, z: 1 } } }
  ]);
  assert.equal(ideal.ideal, true);
  assert.equal(ideal.convergence, 1);

  const live = topologyEnvelope([
    { topology: { axes: { x: 1.25, y: 1.02, z: 0.84 } } },
    { topology: { axes: { x: 1.18, y: 1.06, z: 0.9 } } }
  ]);
  assert.equal(live.ideal, false);
  assert.ok(live.convergence < 1);
});


test('3D topology distribution is deterministic and uses volume without replacing FBB radius', () => {
  const first = topologyDistribution('AAPL', { convergence: 0.4, volatility: 0.6 }, 0.4, 0.6);
  const second = topologyDistribution('AAPL', { convergence: 0.4, volatility: 0.6 }, 0.4, 0.6);
  assert.deepEqual(first, second);
  assert.notEqual(first.longitude, topologyDistribution('MSFT', { convergence: 0.4, volatility: 0.6 }, 0.4, 0.6).longitude);
  const placement = marketDataPlacement(packet(1), 'AAPL');
  assert.ok(placement.topology);
  assert.equal(placement.topology.volatility > 0, true);
});
