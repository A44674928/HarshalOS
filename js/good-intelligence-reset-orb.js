/*
 * Good Intelligence / Orb Reset
 *
 * Deliberately small replacement surface for the previous Orb/NAB hybrid.
 * The model has three independent layers:
 *   1. OCM geometry: 119 stable NAB cores around Center Origin.
 *   2. NAB risk: ordinal Neural Atomic Body risk is rendered as a ring/force
 *      multiplier, never as a market position or probability.
 *   3. Market pulse: confirmed provider OHLCV + VFI/FBB/WaveTrend context.
 *
 * A beat is explicit. Beat Now is always visible. No synthetic fallback.
 * Saved Material Spheroids are rendered as physical-composition nodes.
 */
"use strict";

(() => {
  const VERSION = "gi-orb-reset-v1";
  const TAU = Math.PI * 2;
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const MAX_BEAT_SYMBOLS = 12;
  const BEAT_INTERVAL = "1h";
  const BEAT_PROVIDER = "tickerbot";
  const ROUTE = "/api/characters/v1/beat";
  const STYLE_ID = "gi-orb-reset-style";

  const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  const finite = value => Number.isFinite(Number(value));
  const num = value => finite(value) ? Number(value) : null;
  const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
  const safe = (value, fallback = 0) => finite(value) ? Number(value) : fallback;
  const fmt = value => num(value) === null ? "—" : Number(value).toLocaleString(undefined, {maximumFractionDigits: 3});
  const pct = value => num(value) === null ? "—" : `${value > 0 ? "+" : ""}${Number(value).toFixed(2)}%`;

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .gi-reset-orb{position:relative;display:grid;grid-template-rows:auto auto minmax(420px,1fr) auto;min-height:640px;background:#050a12;color:#dbe8f7;overflow:hidden}
      .gi-reset-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:15px 16px;border-bottom:1px solid rgba(118,153,202,.16);background:linear-gradient(180deg,#091321,#060b13)}
      .gi-reset-kicker{font:700 8px/1.2 ui-monospace,monospace;letter-spacing:.14em;color:#748aa5}.gi-reset-head h3{margin:4px 0 3px;font:650 18px/1.1 system-ui,sans-serif;color:#f1f6fb}.gi-reset-head p{margin:0;max-width:680px;font:9px/1.45 system-ui,sans-serif;color:#91a4bb}
      .gi-reset-actions{display:flex;flex-wrap:wrap;gap:7px;justify-content:flex-end}.gi-reset-btn{min-height:31px;padding:0 11px;border:1px solid #263b55;border-radius:5px;background:#0a1524;color:#cfe0f2;font:700 8px ui-monospace,monospace;letter-spacing:.06em;cursor:pointer}.gi-reset-btn:hover{border-color:#6fd3ff}.gi-reset-btn.primary{border-color:#5ce6a8;color:#5ce6a8;background:#0b211a}.gi-reset-btn:disabled{opacity:.45;cursor:wait}
      .gi-reset-strip{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:8px 16px;border-bottom:1px solid rgba(118,153,202,.13);font:700 8px ui-monospace,monospace}.gi-reset-pill{padding:5px 7px;border:1px solid rgba(111,211,255,.22);border-radius:4px;color:#91cbea;background:rgba(111,211,255,.04)}.gi-reset-pill.live{color:#5ce6a8;border-color:rgba(92,230,168,.3)}.gi-reset-pill.warn{color:#ffd479;border-color:rgba(255,212,121,.3)}.gi-reset-status{margin-left:auto;color:#748aa5}
      .gi-reset-stage{position:relative;min-height:420px;background:radial-gradient(circle at 50% 50%,rgba(37,91,122,.16),transparent 34%),#050a12}.gi-reset-stage canvas{display:block;width:100%;height:100%;min-height:420px;touch-action:none;cursor:grab}.gi-reset-stage canvas:active{cursor:grabbing}
      .gi-reset-overlay{position:absolute;left:13px;top:12px;pointer-events:none;font:700 8px/1.55 ui-monospace,monospace;letter-spacing:.04em;color:#748aa5}.gi-reset-overlay strong{color:#dcecff}.gi-reset-heart{position:absolute;right:14px;top:12px;display:flex;align-items:center;gap:7px;font:700 8px ui-monospace,monospace;color:#ff7184}.gi-reset-heart-dot{width:9px;height:9px;border-radius:50%;background:#ff7184;box-shadow:0 0 12px #ff7184;transform:scale(1);transition:transform .1s}
      .gi-reset-inspector{position:absolute;right:13px;bottom:13px;width:min(300px,calc(100% - 26px));padding:10px;border:1px solid rgba(118,153,202,.18);border-radius:6px;background:rgba(5,10,18,.88);backdrop-filter:blur(8px);pointer-events:none}.gi-reset-inspector strong{font:700 10px ui-monospace,monospace;color:#e9f3fc}.gi-reset-inspector small{display:block;margin-top:4px;font:8px/1.45 system-ui,sans-serif;color:#879bb2}.gi-reset-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:8px}.gi-reset-metrics span{display:block;padding:5px;border:1px solid rgba(118,153,202,.11);background:rgba(111,211,255,.025);font:7px/1.25 ui-monospace,monospace;color:#71869d}.gi-reset-metrics b{display:block;margin-top:3px;color:#dcecff;font-size:8px}
      .gi-reset-footer{display:flex;gap:12px;flex-wrap:wrap;padding:9px 13px;border-top:1px solid rgba(118,153,202,.13);background:#060c15;font:8px/1.5 system-ui,sans-serif;color:#72869e}.gi-reset-footer b{color:#a9bdd3}.gi-reset-materials{color:#ffd479}.gi-reset-refusal{color:#ffb45c}
      @media(max-width:720px){.gi-reset-head{display:block}.gi-reset-actions{justify-content:flex-start;margin-top:10px}.gi-reset-status{margin-left:0}.gi-reset-stage,.gi-reset-stage canvas{min-height:430px}.gi-reset-inspector{right:9px;bottom:9px}.gi-reset-metrics{grid-template-columns:repeat(2,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function registry() {
    return globalThis.NabSectors && Array.isArray(globalThis.NabSectors.sectors) ? globalThis.NabSectors.sectors : [];
  }

  function watchlist(options) {
    const list = Array.isArray(options?.tickers) ? options.tickers : [];
    return list.map(row => ({...row, symbol:String(row.symbol || "").toUpperCase()})).filter(row => row.symbol);
  }

  function riskFor(sector) {
    const level = Number(sector?.riskLevel);
    return Number.isFinite(level) ? clamp(level,0,3) : 0;
  }

  function marketForSymbol(symbol, observations) {
    const key = String(symbol || "").toUpperCase();
    return (Array.isArray(observations) ? observations : []).find(row => String(row?.symbol || "").toUpperCase() === key && row.status !== "unavailable") || null;
  }

  function evaluateMarket(observation) {
    const packet = observation?.marketContext;
    if (!packet || !globalThis.GoodIntelligenceMarketContext) return null;
    try { return globalThis.GoodIntelligenceMarketContext.evaluate(packet); } catch { return null; }
  }

  function visualForce(sector, market) {
    const risk = riskFor(sector);
    if (!market) return 0.18 + risk * 0.07;
    const bias = Math.abs(safe(market.close) - safe(market.bands?.basis)) / Math.max(1e-9, Math.abs(safe(market.bands?.basis,1)));
    const heat = safe(market.waveTrend?.wt1) / 60;
    const flow = Math.abs(safe(market.vfi?.value) - safe(market.vfi?.signal)) / 10;
    const financialPulse = clamp(.25 + bias * 2 + Math.abs(heat) + flow, .1, 2.2);
    return financialPulse * (1 + risk * .35);
  }

  function buildScene(observations, materials, tickers) {
    const sectors = registry();
    const composites = globalThis.NabComposites;
    const watch = Array.isArray(tickers) ? tickers : [];
    const catalog = composites?.catalog ? composites.catalog({watchlist:watch}) : null;
    return sectors.map((sector, index) => {
      let composite = null;
      try { composite = composites?.compose?.(sector.id,{registry:catalog,observations:observations || [],spheroids:materials || [],materials:materials || []}) || null; } catch { composite = null; }
      const market = sector.ticker ? marketForSymbol(sector.ticker, observations) : null;
      const analysis = evaluateMarket(market);
      const force = visualForce(sector, analysis);
      const theta = index * GOLDEN;
      const radius = 1.0 + Math.sqrt(index + 1) * .055;
      return {sector, composite, market, analysis, force, theta, radius};
    });
  }

  function createCanvas(host) {
    const canvas = host.ownerDocument.createElement("canvas");
    canvas.setAttribute("aria-label","Interactive 3D Neural Atomic Body market heartbeat");
    canvas.tabIndex = 0;
    host.appendChild(canvas);
    return canvas;
  }

  function mount(host, options = {}) {
    installStyle();
    if (!host) return null;
    const tickers = watchlist(options);
    let observations = [];
    let materials = [];
    let scene = [];
    let selected = null;
    let destroyed = false;
    let pending = false;
    let beatCount = 0;
    let lastBeatAt = null;
    let heartbeat = 0;
    let pulse = 0;
    let yaw = 0;
    let pitch = .15;
    let zoom = 1;
    let raf = 0;
    let drag = null;

    host.innerHTML = `
      <section class="gi-reset-orb" aria-label="Good Intelligence Orb heartbeat">
        <header class="gi-reset-head">
          <div><div class="gi-reset-kicker">GOOD INTELLIGENCE / ORB RESET</div><h3>Orb · NAB × Market Heartbeat</h3><p>OCM geometry carries the 119 Neural Atomic Bodies. NAB risk remains an independent ordinal layer; confirmed financial indicators drive the live pulse and visually multiply its force.</p></div>
          <div class="gi-reset-actions"><button class="gi-reset-btn primary" type="button" data-reset-beat>♥ Beat Now</button><button class="gi-reset-btn" type="button" data-reset-auto aria-pressed="false">Auto: off</button><button class="gi-reset-btn" type="button" data-reset-fit>Fit</button><button class="gi-reset-btn" type="button" data-reset-clear>Clear view</button></div>
        </header>
        <div class="gi-reset-strip"><span class="gi-reset-pill live">TICKERBOT · LIVE</span><span class="gi-reset-pill">1H CLOSED BARS</span><span class="gi-reset-pill">119 NAB CORES</span><span class="gi-reset-pill materials" data-reset-material-count>0 MATERIAL SPHEROIDS</span><span class="gi-reset-status" data-reset-status>READY · Beat Now is manual</span></div>
        <div class="gi-reset-stage"><canvas data-reset-canvas></canvas><div class="gi-reset-overlay"><strong>OCM CENTER ORIGIN · 0•000•000•0000</strong><br><span data-reset-overlay>119 cores · no market packet loaded</span></div><div class="gi-reset-heart"><span class="gi-reset-heart-dot" data-reset-heart></span><span>MARKET HEARTBEAT</span></div><div class="gi-reset-inspector" data-reset-inspector><strong>Select a core</strong><small>Click a NAB spheroid. Financial data and risk remain separate evidence layers.</small></div></div>
        <footer class="gi-reset-footer"><span><b>FORCE:</b> financial pulse × NAB risk multiplier · visual only</span><span><b>RISK:</b> Safe/Safest 0 · Moderate 1 · Elevated 2 · Extreme 3</span><span class="gi-reset-refusal">No data → no pulse. No provider substitution. No recommendation.</span><span data-reset-beat-info>No beat yet.</span></footer>
      </section>`;

    const canvas = host.querySelector("[data-reset-canvas]");
    const ctx = canvas.getContext("2d");
    const status = host.querySelector("[data-reset-status]");
    const overlay = host.querySelector("[data-reset-overlay]");
    const heart = host.querySelector("[data-reset-heart]");
    const inspector = host.querySelector("[data-reset-inspector]");
    const materialCount = host.querySelector("[data-reset-material-count]");
    const beatButton = host.querySelector("[data-reset-beat]");
    const autoButton = host.querySelector("[data-reset-auto]");
    const beatInfo = host.querySelector("[data-reset-beat-info]");
    let auto = false;
    let autoTimer = null;

    function loadMaterials() {
      try {
        const Model = globalThis.CharacterMaterialModel;
        materials = Model?.readSpheroids?.(globalThis.localStorage) || [];
      } catch { materials = []; }
      materialCount.textContent = `${materials.length} MATERIAL SPHEROID${materials.length === 1 ? "" : "S"}`;
    }

    function rebuild() {
      loadMaterials();
      scene = buildScene(observations, materials, tickers);
      if (selected && !scene.some(row => row.sector.id === selected)) selected = null;
      overlay.textContent = `${scene.length} NAB cores · ${observations.filter(row => row?.status !== "unavailable").length} market observations · ${materials.length} material spheroids`;
      draw();
    }

    function project(row, width, height, now) {
      const theta = row.theta + yaw;
      const x = Math.cos(theta) * row.radius;
      const z = Math.sin(theta) * row.radius;
      const y = Math.sin(theta * 1.7 + pitch) * .72;
      const cy = Math.cos(pitch), sy = Math.sin(pitch);
      const py = y * cy - z * sy;
      const pz = y * sy + z * cy;
      const depth = 1 / (1 + pz * .22);
      const cx = width / 2 + x * 105 * zoom * depth;
      const cyv = height / 2 - py * 105 * zoom * depth;
      const force = row.force;
      const radius = (5.5 + force * 3.2 + (selected === row.sector.id ? 3 : 0)) * depth;
      return {row,x:cx,y:cyv,depth,radius,pulse:Math.sin(now/180 + row.theta)*.5+.5};
    }

    function draw(now = performance.now()) {
      if (destroyed || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect.width || canvas.clientWidth || 800));
      const height = Math.max(420, Math.floor(rect.height || canvas.clientHeight || 520));
      const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
      if (canvas.width !== width*dpr || canvas.height !== height*dpr) { canvas.width=width*dpr; canvas.height=height*dpr; }
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,width,height);
      const ordered = scene.map(row=>project(row,width,height,now)).sort((a,b)=>b.depth-a.depth);
      const originX=width/2, originY=height/2;
      ctx.save();
      ctx.globalAlpha=.28;ctx.strokeStyle="#6fd3ff";ctx.lineWidth=1;ctx.beginPath();ctx.arc(originX,originY,18*zoom,0,TAU);ctx.stroke();ctx.beginPath();ctx.moveTo(originX-28,originY);ctx.lineTo(originX+28,originY);ctx.moveTo(originX,originY-28);ctx.lineTo(originX,originY+28);ctx.stroke();ctx.restore();
      ordered.forEach(point=>{
        const {row}=point; const risk=riskFor(row.sector); const active=!!row.market; const localPulse=active ? .75 + .25*Math.sin(now/110 + row.theta) : .35;
        const r=point.radius*(1 + (active ? .08*localPulse : 0));
        ctx.save();
        ctx.globalAlpha=.12 + .18*point.depth;
        ctx.strokeStyle=risk===3?"#ff7184":risk===2?"#ffb45c":risk===1?"#ffd479":"#5ce6a8";ctx.lineWidth=1.4+risk*.5;ctx.beginPath();ctx.arc(point.x,point.y,r*1.8,0,TAU);ctx.stroke();
        if(active){ctx.globalAlpha=.18;ctx.fillStyle="#6fd3ff";ctx.beginPath();ctx.arc(point.x,point.y,r*(1.6+localPulse*.7),0,TAU);ctx.fill();}
        ctx.globalAlpha=.9;ctx.fillStyle=active?"#6fd3ff":"#52667d";ctx.beginPath();ctx.arc(point.x,point.y,r,0,TAU);ctx.fill();
        ctx.globalAlpha=.9;ctx.fillStyle="#07101b";ctx.beginPath();ctx.arc(point.x,point.y,Math.max(1.7,r*.32),0,TAU);ctx.fill();
        if(selected===row.sector.id){ctx.globalAlpha=1;ctx.strokeStyle="#f2ede2";ctx.lineWidth=2;ctx.beginPath();ctx.arc(point.x,point.y,r+4,0,TAU);ctx.stroke();}
        ctx.globalAlpha=Math.max(.35,point.depth);ctx.fillStyle="#9fb3c9";ctx.font="7px ui-monospace,monospace";ctx.textAlign="center";ctx.fillText(String(row.sector.ticker||`NAB-${row.sector.id}`),point.x,point.y+r+11);ctx.restore();
      });
      materials.slice(0,119).forEach((material,index)=>{
        const a=index*GOLDEN + yaw*.4, rr=2.7 + Math.sin(index*.71)*.25; const x=originX+Math.cos(a)*rr*55*zoom; const y=originY+Math.sin(a)*rr*25*zoom;
        const size=2.5+Math.min(5, material.components?.length||2);
        ctx.save();ctx.globalAlpha=.72;ctx.fillStyle="#ffd479";ctx.shadowColor="#ffd479";ctx.shadowBlur=8;ctx.beginPath();ctx.arc(x,y,size,0,TAU);ctx.fill();ctx.restore();
      });
      pulse = Math.max(0,pulse*.93); heartbeat = .15 + pulse;
      if(heart) heart.style.transform=`scale(${1 + heartbeat*.9})`;
      raf=requestAnimationFrame(draw);
    }

    function resize(){ if(!destroyed) draw(); }
    function selectAt(x,y){
      const rect=canvas.getBoundingClientRect(); const width=rect.width||canvas.clientWidth; const height=rect.height||canvas.clientHeight;
      const points=scene.map(row=>project(row,width,height,performance.now())).sort((a,b)=>a.depth-b.depth);
      const hit=points.find(point=>Math.hypot(point.x-x,point.y-y)<=point.radius+7);
      selected=hit?.row.sector.id || null;
      if(selected){const row=scene.find(item=>item.sector.id===selected);const market=row.market;const analysis=row.analysis;const risk=riskFor(row.sector);inspector.innerHTML=`<strong>NAB ${row.sector.id} · ${esc(row.sector.name)}</strong><small>${esc(row.sector.trait||row.sector.theme||"No NAB trait supplied")} · ${esc(row.sector.riskProfile||"risk unavailable")}</small><div class="gi-reset-metrics"><span>RISK<b>${risk}/3</b></span><span>PRICE Δ<b>${esc(pct(analysis?.changePct))}</b></span><span>FORCE<b>${row.force.toFixed(2)}×</b></span></div><small>${market ? `${esc(row.sector.ticker)} · ${esc(market.provider||"provider")} · ${esc(market.interval||BEAT_INTERVAL)} · ${esc(market.at ? new Date(market.at).toLocaleTimeString() : "time unavailable")}` : "No confirmed market observation for this NAB."}</small>`;}
      draw();
    }

    async function beatNow(){
      if(pending || destroyed) return;
      const due = tickers.slice(0,MAX_BEAT_SYMBOLS).map(row=>row.symbol).filter(Boolean);
      if(!due.length){status.textContent="REFUSED · no reviewed Tickerbot symbols are loaded";return;}
      pending=true;beatButton.disabled=true;status.textContent=`PULSING · requesting ${due.length} reviewed symbols from Tickerbot…`;
      try{
        const endpoint=`${ROUTE}?disc=stocks&provider=${BEAT_PROVIDER}&symbols=${encodeURIComponent(due.join(","))}&interval=${BEAT_INTERVAL}&cadence=15`;
        const response=await fetch(endpoint,{method:"GET",credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json"}});
        const payload=await response.json().catch(()=>null);
        if(!response.ok || !payload?.success || !Array.isArray(payload.instruments)) throw new Error(payload?.message || `Beat route returned HTTP ${response.status}.`);
        observations=payload.instruments.map(item=>({
          channel:"stocks",symbol:item.symbol,provider:item.provider||BEAT_PROVIDER,interval:item.interval||BEAT_INTERVAL,at:Date.parse(item.beatAt||new Date().toISOString()),status:item.status,marketContext:item.marketContext||null,motion:item.motion||null
        })).filter(row=>row.symbol);
        beatCount++;lastBeatAt=Date.now();pulse=1;status.textContent=`LIVE · beat ${beatCount} · ${observations.filter(row=>row.status!=="unavailable").length}/${observations.length} observations returned`;
        beatInfo.textContent=`Last beat ${new Date(lastBeatAt).toLocaleTimeString()} · ${observations.length} packets · provider=${BEAT_PROVIDER}`;
        rebuild();
      }catch(error){status.textContent=`REFUSED · ${error?.message || "live beat unavailable"} · nothing synthetic substituted`;}
      finally{pending=false;beatButton.disabled=false;}
    }

    function setAuto(value){auto=!!value;autoButton.setAttribute("aria-pressed",String(auto));autoButton.textContent=`Auto: ${auto?"on":"off"}`;if(autoTimer)clearInterval(autoTimer);autoTimer=auto?setInterval(()=>beatNow(),60000):null;}
    function fit(){yaw=0;pitch=.15;zoom=1;draw();}
    function clearView(){observations=[];selected=null;beatCount=0;status.textContent="READY · market observations cleared; Beat Now remains available";beatInfo.textContent="No beat yet.";rebuild();}

    beatButton.addEventListener("click",beatNow);autoButton.addEventListener("click",()=>setAuto(!auto));host.querySelector("[data-reset-fit]").addEventListener("click",fit);host.querySelector("[data-reset-clear]").addEventListener("click",()=>{if(typeof options.onClearBeats==="function")options.onClearBeats();clearView();});
    canvas.addEventListener("pointerdown",event=>{canvas.setPointerCapture?.(event.pointerId);drag={x:event.clientX,y:event.clientY,yaw,pitch};});
    canvas.addEventListener("pointermove",event=>{if(!drag)return;yaw=drag.yaw+(event.clientX-drag.x)*.006;pitch=clamp(drag.pitch+(event.clientY-drag.y)*.004,-1.1,1.1);draw();});
    canvas.addEventListener("pointerup",event=>{if(!drag)return;const moved=Math.hypot(event.clientX-drag.x,event.clientY-drag.y);const rect=canvas.getBoundingClientRect();if(moved<6)selectAt(event.clientX-rect.left,event.clientY-rect.top);drag=null;});
    canvas.addEventListener("wheel",event=>{event.preventDefault();zoom=clamp(zoom*(event.deltaY>0?.92:1.08),.55,1.8);draw();},{passive:false});
    window.addEventListener("resize",resize);
    host.ownerDocument.addEventListener("harshalos:material-spheroids:changed",loadMaterials);
    loadMaterials();rebuild();draw();

    return Object.freeze({schema:VERSION,nodes:scene,state:{get beatCount(){return beatCount;},get observations(){return observations;}},beatNow,setVisible(value){host.style.display=value?"":"none";},destroy(){destroyed=true;if(autoTimer)clearInterval(autoTimer);if(raf)cancelAnimationFrame(raf);window.removeEventListener("resize",resize);host.ownerDocument.removeEventListener("harshalos:material-spheroids:changed",loadMaterials);host.innerHTML="";}});
  }

  globalThis.GoodIntelligenceOrb2 = Object.freeze({VERSION,mount,buildScene,visualForce});
})();
