import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const flush=async()=>{for(let n=0;n<25;n++)await Promise.resolve();};
function mount(t,fetcher=async()=>{throw new Error('unexpected fetch');}) {
  const window=new Window({url:'https://os.test/'});
  t.after(()=>window.happyDOM.abort());
  const requests=[];
  window.fetch=async(url,opts)=>{requests.push(url);return fetcher(url,opts);};
  window.eval('var APPS = window.APPS = [];');
  for(const file of ['nab-sectors','characters-disc-catalog','nab-composites','good-intelligence-market-context','character-material-model','nab-orb-renderer','nab-discs-view'])window.eval(read(`js/${file}.js`));
  const host=window.document.createElement('div');window.document.body.append(host);
  const view=window.NabDiscsView.mount(host,{watchlist:[{symbol:'V',name:'Visa'},{symbol:'MA',name:'Mastercard'}]});
  t.after(()=>view.destroy());
  return {window,host,view,requests};
}

test('active navigation contains 119 NAB Discs, not five asset-class discs; sources join under one alignment',t=>{
  const {host,view,requests}=mount(t);
  assert.equal(host.querySelector('[data-nab-select]').options.length,119);
  assert.equal(host.querySelectorAll('[data-nab-id]').length,119);
  assert.equal(host.querySelector('[data-ch-disc]'),null);
  assert.equal(requests.length,0,'opening the view does not fan out provider requests');
  assert.ok(host.querySelector('[data-nab-orb-canvas]'),'the primary canvas mounts immediately');
  assert.equal(view.orbRenderer.scene.length,119);
  assert.equal(host.querySelector('[data-nab-geometry]'),null,'no equity-only gateway remains');
  const primary=host.querySelector('[data-nab-primary-orb]');
  const canvas=host.querySelector('[data-nab-orb-canvas]');
  view.choose(12);
  assert.equal(host.querySelector('[data-nab-orb-canvas]'),canvas,'selection preserves the primary renderer');
  assert.equal(host.querySelector('[data-nab-primary-orb]'),primary);
  const detail=host.querySelector('[data-nab-detail]').textContent;
  assert.match(detail,/Federal Reserve/);assert.match(detail,/Visa/);assert.match(detail,/Euro \/ US dollar/);
  assert.match(detail,/no policy-rate or balance-sheet observation/);
  assert.equal(view.composite.coverage.observed,0);
  assert.equal(view.composite.designation.nabId,12);
});

test('refresh targets exactly one qualified legacy source; unavailable data remains unavailable',async t=>{
  const {host,view,requests,window}=mount(t,async url=>{
    const query=new URL(url,'https://os.test').searchParams;
    assert.equal(query.get('disc'),'fx');assert.equal(query.get('symbols'),'EURUSD');
    return Response.json({success:false,data:{disc:'fx',provider:'massive',interval:'1d',beatAt:'2026-10-04T12:00:00Z',instruments:[{symbol:'EURUSD',status:'unavailable',message:'No provider credentials',marketContext:null}]}});
  });
  view.choose(12);host.querySelector('[data-nab-refresh="fx:EURUSD"]').click();await flush();
  assert.equal(requests.length,1);
  assert.match(host.querySelector('[data-nab-status]').textContent,/No provider credentials/);
  assert.equal(view.composite.members.find(row=>row.id==='fx:EURUSD').observations[0].market,null);
  host.querySelector('[data-nab-refresh="fx:EURUSD"]').click();await flush();
  assert.equal(requests.length,1,'repeated clicks are paced without another source call');
  assert.ok(window.localStorage.getItem(window.NabDiscsView.KEY));
});

test('crypto catalog loads once; unknown identities enter review and dynamic identity mismatch is rejected',async t=>{
  const {host,view,window,requests}=mount(t,async url=>{
    if(url.includes('/discs?'))return Response.json({success:true,instruments:[{symbol:'USDT',providerId:'tether',name:'Tether'},{symbol:'NEW',providerId:'new-token',name:'<img src=x>'}]});
    return Response.json({success:true,data:{disc:'crypto',provider:'massive',interval:'1d',beatAt:'2026-10-04T12:00:00Z',sourceIdentities:[{channel:'crypto',symbol:'USDT',providerId:'different-token'}],instruments:[{symbol:'USDT',status:'bars'}]}});
  });
  host.querySelector('[data-nab-crypto]').click();await flush();view.choose(12);
  assert.match(host.querySelector('[data-nab-review]').textContent,/crypto:NEW/);
  assert.equal(host.querySelector('[data-nab-review] img'),null);
  host.querySelector('[data-nab-refresh="crypto:USDT"]').click();await flush();
  assert.match(host.querySelector('[data-nab-status]').textContent,/Crypto identity changed/);
  assert.equal(view.composite.members.find(row=>row.id==='crypto:USDT').observations.length,0);
  assert.equal(requests.length,2);
});

test('Material Spheroids and legacy shortcuts remain accessible; Orb 2 mounts the NAB surface by default',t=>{
  const {window,host,view}=mount(t);
  window.eval(read('js/good-intelligence-orb2.js'));
  const other=window.document.createElement('div');window.document.body.append(other);
  const orb=window.GoodIntelligenceOrb2.mount(other,{watchlist:[]});t.after(()=>orb.destroy());
  assert.equal(other.querySelector('[data-nab-select]').options.length,119);
  window.eval(read('js/apps-characters.js'));
  const app=window.APPS.find(app=>app.id==='characters');assert.equal(app.title,'NAB Discs');
  const body=window.document.createElement('div');window.document.body.append(body);
  const appView=app.render(body);t.after(()=>appView.destroy());
  assert.ok(body.querySelector('[data-nab-select]'));
  assert.equal(body.querySelector('[data-ch-disc]'),null);
});

test('a supplied beat moves the complete primary core without remounting it; provider changes do not borrow heights',async t=>{
  const now=Date.now();
  const bars=Array.from({length:260},(_,i)=>({time:now-(260-i)*86400000,open:100,high:i===259?123:101,low:99,close:i===259?120:100,volume:1000,confirmed:true}));
  const {host,view,window}=mount(t,async()=>Response.json({success:true,data:{disc:'stocks',provider:'massive',interval:'1d',beatAt:new Date(now).toISOString(),instruments:[{symbol:'V',status:'bars',marketContext:{schema:'gi-market-context-v1',source:'test fixture only',symbol:'V',timeframe:'1d',synthetic:false,bars}}]}}));
  view.choose(12);
  const canvas=host.querySelector('[data-nab-orb-canvas]');
  host.querySelector('[data-orb-focus]').click();
  const camera=JSON.stringify(view.orbRenderer.camera);
  assert.equal(view.orbRenderer.scene.find(row=>row.nabId===12).known,false);
  host.querySelector('[data-nab-refresh="stocks:V"]').click();await flush();
  const node=view.orbRenderer.scene.find(row=>row.nabId===12);
  assert.equal(node.known,true);
  assert.ok(node.position.y>0);
  assert.ok(node.members.some(member=>member.id==='central-bank:fed'));
  assert.equal(host.querySelector('[data-nab-orb-canvas]'),canvas);
  assert.equal(JSON.stringify(view.orbRenderer.camera),camera);
  const provider=host.querySelector('[data-nab-provider]');provider.value='tickerbot';provider.dispatchEvent(new window.Event('change'));
  assert.equal(view.orbRenderer.scene.find(row=>row.nabId===12).marketY,null);
});

test('saved physical design changes appear in the existing primary scene without a provider request',t=>{
  const {window,host,view,requests}=mount(t);
  view.choose(12);
  const canvas=host.querySelector('[data-nab-orb-canvas]');
  window.localStorage.setItem(window.CharacterMaterialModel.STORAGE_KEYS.spheroids,JSON.stringify([{id:'test-design',name:'Material test',nabId:12,createdAt:new Date().toISOString(),components:[{discId:'stocks',characterId:'c1',materialId:'mp-1',sharePercent:60},{discId:'fx',characterId:'c2',materialId:'mp-2',sharePercent:40}]}]));
  window.document.dispatchEvent(new window.CustomEvent('harshalos:material-spheroids:changed'));
  assert.equal(view.orbRenderer.scene.find(row=>row.nabId===12).physical.length,2);
  assert.equal(host.querySelector('[data-nab-orb-canvas]'),canvas);
  assert.equal(requests.length,0);
});
