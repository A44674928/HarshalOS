import test from 'node:test';
import assert from 'node:assert/strict';
import '../js/nab-sectors.js';
import '../js/characters-disc-catalog.js';
import '../js/nab-composites.js';
import {TICKERBOT_WATCHLIST} from '../worker/good-intelligence-tickerbot.mjs';
const Model=globalThis.NabComposites;
const NOW=Date.parse('2026-10-04T12:00:00Z');
const market={latestBar:{close:100*Math.exp(Math.log(1.25)/2)},basis:100,bands:{lower1000:80,upper1000:125}};
const obs=(overrides={})=>({channel:'stocks',symbol:'V',provider:'massive',interval:'1d',at:NOW,status:'bars',market,...overrides});
const registry=Model.catalog({watchlist:TICKERBOT_WATCHLIST,crypto:[
  {symbol:'BTC',providerId:'X:BTCUSD',massiveTicker:'X:BTCUSD',rankingProvider:'Massive',name:'Bitcoin'},
  {symbol:'USDT',providerId:'X:USDTUSD',massiveTicker:'X:USDTUSD',rankingProvider:'Massive',name:'Tether'},
  {symbol:'NEW',providerId:'X:NEWUSD',massiveTicker:'X:NEWUSD',rankingProvider:'Massive',name:'Review me'}
]});

test('NAB FBB displacement is symmetric in log space and invariant to quote-price scaling',()=>{
  const halfWidth=Math.log(1.25);
  const marketAt=value=>({latestBar:{close:100*Math.exp(value*halfWidth)},basis:100,bands:{lower1000:80,upper1000:125}});
  assert.ok(Math.abs(Model.displacement(marketAt(.5))-.5)<1e-12);
  assert.ok(Math.abs(Model.displacement(marketAt(-.5))+.5)<1e-12);
  const scaled={latestBar:{close:marketAt(.5).latestBar.close*1e6},basis:100e6,bands:{lower1000:80e6,upper1000:125e6}};
  assert.ok(Math.abs(Model.displacement(scaled)-.5)<1e-12);
  assert.equal(Model.displacement({...marketAt(0),latestBar:{close:0}}),null);
});

test('119 NAB Discs preserve membership and surface unmapped market assets for editorial review',()=>{
  assert.equal(registry.discs.length,119);
  assert.equal(globalThis.CharactersDiscCatalog.nabDiscs.length,119);
  const ids=new Set(registry.members.map(row=>row.id));
  const reviewIds=new Set(registry.review.map(row=>row.id));
  for(const row of TICKERBOT_WATCHLIST)assert.ok(ids.has(`stocks:${row.symbol}`));
  for(const channel of ['fx','commodities','indices'])for(const row of globalThis.CharactersDiscCatalog.staticInstruments(channel))assert.ok(ids.has(`${channel}:${row.symbol}`));
  const stockReviews=registry.review.filter(row=>row.source==='reviewed Tickerbot watchlist');
  assert.equal(stockReviews.length,22,'new market-roster assets without a reviewed NAB assignment remain visible for editorial review');
  assert.ok(stockReviews.every(row=>ids.has(row.id) && TICKERBOT_WATCHLIST.some(asset=>`stocks:${asset.symbol}`===row.id)));
  assert.equal(reviewIds.has('crypto:NEW'),true,'an unknown crypto identity stays in review');
  assert.equal(registry.review.length,23);
  for(const disc of registry.discs)assert.equal(registry.members.filter(row=>row.nabId===disc.nabId && row.role==='designated-stock').length,1);
});

test('same alignment joins a bank, stock, FX and crypto into a composite, not an average',()=>{
  const composite=Model.compose(12,{registry,observations:[obs(),obs({channel:'fx',symbol:'EURUSD',market:{latestBar:{close:1.2}}})],now:NOW});
  const ids=composite.members.map(row=>row.id);
  for(const id of ['central-bank:fed','central-bank:ecb','stocks:V','fx:EURUSD','crypto:USDT'])assert.ok(ids.includes(id),id);
  assert.ok(!ids.includes('stocks:MA'));
  assert.ok(Math.abs(composite.members.find(row=>row.id==='stocks:V').observations[0].fbbDisplacement-.5)<1e-12);
  assert.equal(composite.members.find(row=>row.id==='fx:EURUSD').observations[0].fbbDisplacement,null);
  assert.equal(composite.members.find(row=>row.id==='central-bank:fed').observations.length,0);
  assert.equal(composite.coverage.observed,2);
  assert.equal(composite.averagePrice,undefined);
  assert.ok(composite.aiContext.missing.includes('central-bank:fed'));
  assert.match(composite.aiContext.instructions,/not.*verified classification/);
  assert.ok(Object.isFrozen(composite.members));
});

test('provider, interval, source channel and crypto identity never collide',()=>{
  const values=Model.mergeObservations([obs(),obs({provider:'tickerbot',interval:'1h'}),obs({channel:'fx'}),obs({at:NOW+100,market:null,status:'unavailable'})]);
  assert.equal(values.length,4,'failed refresh preserves the last successful observation');
  const composite=Model.compose(12,{registry,observations:values,now:NOW+200});
  const stock=composite.members.find(row=>row.id==='stocks:V');
  assert.equal(stock.observations.length,3);
  assert.equal(stock.observations[0].status,'unavailable');
  const crypto=Model.compose(20,{registry,observations:[obs({channel:'crypto',symbol:'BTC',providerId:'X:DIFFERENTUSD'})]});
  assert.equal(crypto.members.find(row=>row.id==='crypto:BTC').observations.length,0);
  const matchingCrypto=Model.compose(20,{registry,observations:[obs({channel:'crypto',symbol:'BTC',providerId:'X:BTCUSD'})]});
  assert.equal(matchingCrypto.members.find(row=>row.id==='crypto:BTC').observations.length,1,
    "Massive crypto history joins only on its exact provider ticker");
  assert.equal(Model.observation(obs({market:{synthetic:true}})),null);
  assert.equal(Model.observation(obs({at:null})),null);
});

test('physical designs join only their designated NAB; missing material records stay missing',()=>{
  const materials=[{materialId:'mp-1',density:2}];
  const spheroids=[{id:'physical-a',name:'A',nabId:12,components:[{materialId:'mp-1',sharePercent:50},{materialId:'mp-2',sharePercent:50}]},{id:'physical-b',nabId:20,components:[]}];
  const composite=Model.compose(12,{registry,materials,spheroids});
  assert.equal(composite.physical.length,1);
  assert.equal(composite.physical[0].components[0].material.density,2);
  assert.equal(composite.physical[0].components[1].material,null);
  assert.equal(Object.isFrozen(materials[0]),false,'composing cannot mutate/freeze source records');
});

test('legacy and compact archives migrate non-destructively and cannot fabricate FBB bands',()=>{
  const events=[{discId:'stocks',provider:'massive',interval:'1d',at:NOW,instruments:[{symbol:'V',status:'bars',market}]}];
  const before=JSON.stringify(events);
  assert.equal(Model.fromLegacy(events).length,1);
  assert.equal(JSON.stringify(events),before);
  const compact=Model.fromSavedBeats([{discId:'stocks',provider:'massive',beatAt:NOW,payload:{entry:{interval:'1d'},observations:[{ticker:'V',close:120,status:'ready'}]}}]);
  assert.equal(compact.length,1);
  assert.equal(Model.displacement(compact[0].market),null);
  assert.equal(Model.compose(12,{registry,observations:Model.fromLegacy(events),now:NOW+2*86400000}).members.find(row=>row.id==='stocks:V').observations[0].stale,true);
});
