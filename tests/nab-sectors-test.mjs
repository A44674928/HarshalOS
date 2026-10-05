import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import '../js/nab-sectors.js';
import '../js/character-material-model.js';
const NAB = globalThis.NabSectors;
const Model = globalThis.CharacterMaterialModel;
const components = [
  {discId:'stocks', characterId:'a', sharePercent:40},
  {discId:'fx', characterId:'b', sharePercent:60}
];
const characters = [{id:'a',discId:'stocks',materialId:'mp-1'}, {id:'b',discId:'fx',materialId:'mp-2'}];
const materials = [{materialId:'mp-1',density:2}, {materialId:'mp-2',density:4}];

test('all 119 sectors match Compendium source and the versioned editorial assignment table', () => {
  execFileSync(process.execPath, ['scripts/build-nab-sectors.mjs', '--check'], { cwd: new URL('../',import.meta.url) });
  assert.equal(NAB.sectors.length, 119);
  assert.equal(new Set(NAB.sectors.map(row => row.ticker)).size, 119);
  NAB.sectors.forEach((row, index) => {
    assert.equal(row.id, index+1);
    assert.ok(Object.isFrozen(row));
    assert.ok(row.rationale && row.theme && row.roles && row.failureMode);
    assert.equal(NAB.byTicker(row.ticker), row);
    assert.equal(NAB.aiContext(row.id).ticker, row.ticker);
    assert.equal(NAB.aiContext(row.id).theme, row.theme);
    assert.match(NAB.aiContext(row.id).runtimeStatus, /no neural network instantiated/);
    if (row.riskLevel === 3) assert.match(row.operatingBoundary, /reference-only; no NAB deployment/);
  });
  assert.equal(NAB.byId(119).symbol, 'Ha');
  assert.equal(NAB.byId(106).roles, 'None (Restricted to back-end entropy generation)');
  for (const id of [0,120,1.1,'1',null,NaN]) assert.equal(NAB.byId(id), null);
});

test('each NAB can designate a composite preview without changing physical measurements', () => {
  for (const row of NAB.sectors) {
    const result = Model.composeSpheroid(components, characters, materials, row.id);
    assert.equal(result.ok, true);
    assert.equal(result.designation.nabId, row.id);
    assert.equal(result.designation.ai.ticker, row.ticker);
    assert.equal(result.densityEstimate, 3.2);
  }
  assert.equal(Model.composeSpheroid(components,characters,materials,120).code, 'invalid-nab');
});

test('designated identity survives storage and legacy designs remain unassigned', () => {
  const data = new Map();
  const storage = {getItem:key=>data.get(key), setItem:(key,value)=>data.set(key,value)};
  const result = Model.saveSpheroid(storage,'Archive',components,characters,materials,119);
  assert.equal(result.ok,true);
  const saved = Model.readSpheroids(storage)[0];
  assert.equal(saved.nabId,119);
  assert.equal(saved.nabVersion,NAB.VERSION);
  // A subsequent composition cannot change the saved designation.
  Model.composeSpheroid(components,characters,materials,9);
  assert.equal(Model.readSpheroids(storage)[0].nabId,119);
  assert.equal(Model.normalizeSpheroid({...saved,nabId:undefined}).nabId,null);
  assert.equal(Model.normalizeSpheroid({...saved,nabId:999}).nabId,null);
});

test('Orb 2 uses the same NAB identity across timeframes without inventing a mapping', () => {
  const context = vm.createContext({window:{},NabSectors:NAB});
  vm.runInContext(readFileSync(new URL('../js/good-intelligence-orb2.js',import.meta.url),'utf8'),context);
  for (const timeframe of ['1h','1d']) {
    const nodes = context.window.GoodIntelligenceOrb2.buildNodes([{symbol:'ORCL',name:'Oracle'}, {symbol:'UNASSIGNED'}],timeframe);
    assert.equal(nodes[0].nabId,119);
    assert.equal(nodes[1].nabId,null);
  }
});
