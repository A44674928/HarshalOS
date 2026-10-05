import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const context = vm.createContext({ window: {}, Math, Number, Object });
vm.runInContext(readFileSync(new URL('../js/good-intelligence-orb2.js', import.meta.url), 'utf8'), context);
const metrics = context.window.GoodIntelligenceOrb2.fibonacciBandMetrics;
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
