import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const context = vm.createContext({ window: {} });
vm.runInContext(readFileSync(new URL('../js/good-intelligence-orb2.js', import.meta.url), 'utf8'), context);
const metrics = context.window.GoodIntelligenceOrb2.fibonacciBandMetrics;
const packet = close => ({ latestBar: {close}, basis: 100, bands: { lower1000: 80, upper1000: 140 } });
test('FBB baseline and asymmetric band distances normalize independently', () => {
  for (const [close,p] of [[80,0],[90,.25],[100,.5],[120,.75],[140,1],[180,1.5],[60,-.5]]) {
    assert.equal(metrics(packet(close)).p, p);
  }
});
test('missing and invalid FBB inputs remain unknown', () => {
  for (const value of [null, {}, {...packet(100),basis:null}, {...packet(100),basis:80}, packet(null)]) {
    assert.equal(metrics(value).held, true);
    assert.equal(metrics(value).p, null);
  }
});
