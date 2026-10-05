/* Active NAB Disc browser. Legacy asset-class discs survive only as source
   adapters; all grouping is performed by NabComposites' explicit NAB IDs. */
"use strict";
(() => {
  const KEY = "harshalos.nab-discs.v1";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const colors = {stocks:"#7dd3fc",fx:"#c4b5fd",crypto:"#fcd34d",commodities:"#6ee7b7",indices:"#f9a8d4","central-bank":"#cbd5e1"};
  function mount(host, options = {}) {
    const Model = globalThis.NabComposites, NAB = globalThis.NabSectors;
    if (!Model || !NAB) throw new Error("NAB Disc models are unavailable.");
    const watchlist = options.watchlist || (globalThis.APPS || []).find(app => app.id === "good-intelligence")?.tickerbotWatchlist || [];
    let storage; try {storage=globalThis.localStorage;} catch {storage=null;}
    const read = key => {try {return JSON.parse(storage?.getItem(key) || "null");} catch {return null;}};
    const saved = read(KEY);
    const state = {nabId:NAB.byId(saved?.nabId)?.id || 1, visible:true, destroyed:false, pending:false,
      crypto:Array.isArray(saved?.crypto) ? saved.crypto.slice(0,52) : [],
      observations:Model.mergeObservations(Array.isArray(saved?.observations) ? saved.observations : []),
      auto:false, cursor:0, interval:"1d", provider:"massive", message:"Disc 1–5 retired from navigation. Their source IDs and saved history are preserved. Live refresh is opt-in."};
    let registry, controller, catalogController, orbRenderer;
    let archivedObservations = [];
    const save = () => {try {storage?.setItem(KEY,JSON.stringify({schema:Model.VERSION,nabId:state.nabId,crypto:state.crypto,observations:state.observations}));} catch {state.message="Browser storage unavailable; this composite remains session-local.";}};
    const materialState = () => {
      const physical = globalThis.CharacterMaterialModel;
      return {spheroids:physical?.readSpheroids(storage) || [], materials:physical?.readMaterials(storage) || []};
    };
    const rebuild = () => {registry=Model.catalog({watchlist,crypto:state.crypto});};
    const importHistory = () => {
      const events=read("harshalos.good-intelligence.orb2.history.v1");
      state.observations=Model.mergeObservations(state.observations,Model.fromLegacy(Array.isArray(events)?events:[]));
    };
    const selected = () => Model.compose(state.nabId,{registry,observations:state.observations,...materialState()});
    rebuild(); importHistory();
    host.innerHTML=`<section class="nab-app">
      <header class="nab-head"><div><p class="nab-eyebrow">NEURAL ATOMIC BODIES / COMPOSITE FIELD</p><h1>Orb 2 · NAB Discs</h1><p>119 alignments. One composite per NAB. Many independently sourced constituents.</p></div><span class="nab-badge">PHYSICAL + DIGITAL CONTEXT</span></header>
      <div class="nab-toolbar"><label>NAB alignment<select data-nab-select aria-label="Choose a NAB Disc">${registry.discs.map(disc=>`<option value="${disc.nabId}">${esc(disc.label)} · ${esc(disc.designatedStock)}</option>`).join("")}</select></label>
      <label>Evidence provider<select data-nab-provider><option value="massive">Massive · 1d</option><option value="tickerbot">Tickerbot · 1h</option><option value="alpha">Alpha Vantage · 1mo</option></select></label>
      <button type="button" data-nab-import>Import saved observations</button><button type="button" data-nab-clear>Clear displayed beats</button><button type="button" data-nab-restore>Restore archived beats</button><button type="button" data-nab-crypto>Load crypto source catalog</button>
      <label class="nab-auto"><input type="checkbox" data-nab-auto>Auto-refresh one eligible constituent / minute (Massive only)</label></div>
      <p class="nab-status" role="status" aria-live="polite" data-nab-status></p>
      <div class="nab-primary-orb" data-nab-primary-orb></div>
      <h2 class="nab-inspector-title">Composite inspector</h2>
      <div class="nab-layout"><nav class="nab-sectors" aria-label="NAB Discs">${registry.discs.map(disc=>`<button type="button" data-nab-id="${disc.nabId}" title="${esc(disc.theme)}"><b>${disc.nabId} ${esc(NAB.byId(disc.nabId).symbol)}</b><span>${esc(disc.designatedStock)}</span></button>`).join("")}</nav><main data-nab-detail></main></div>
      <details class="nab-review"><summary data-nab-review-summary></summary><div data-nab-review></div></details>
      <p class="nab-boundary">Alignment is editorial, not an assessed institutional classification. A central bank is context—not a tradable instrument. Price, policy rates and physical density remain separate; no blended price or material fraction is invented. NAB risk belongs to the neural model, not its institutions or stocks. Extreme NABs remain reference-only. AI context is a design brief, not a running network.</p>
    </section>`;
    const $ = selector => host.querySelector(selector);
    const eligible = member => member.liveEligible && (state.provider === "massive" || member.channel === "stocks");
    const orbHost = $("[data-nab-primary-orb]");
    if (globalThis.NabOrbRenderer) {
      orbRenderer = globalThis.NabOrbRenderer.mount(orbHost, {
        onSelect: choose,
        onInspect: detail => {
          host.querySelectorAll("[data-nab-member-id]").forEach(card => {
            const matches = card.getAttribute("data-nab-member-id") === (detail.kind === "physical" ? `physical:${detail.design.id}` : detail.id);
            card.classList.toggle("nab-inspected-member", matches);
            if (matches) { card.scrollIntoView?.({ block: "nearest", behavior: "auto" }); card.focus?.({ preventScroll: true }); }
          });
        }
      });
    } else {
      orbHost.innerHTML = '<p class="nab-status" role="status">3D orb renderer unavailable. The complete NAB inspector remains available; reload to retry the renderer.</p>';
    }
    function draw() {
      if(state.destroyed)return;
      const physical = materialState();
      const composites = registry.discs.map(disc => Model.compose(disc.nabId, {
        registry, observations: state.observations, ...physical
      }));
      const composite = composites.find(item => item.designation.nabId === state.nabId);
      const row = composite.designation.sector;
      orbRenderer?.update(composites, { selectedId: state.nabId, provider: state.provider, interval: state.interval });
      $("[data-nab-select]").value=String(state.nabId);
      $("[data-nab-status]").textContent=state.message;
      host.querySelectorAll("[data-nab-id]").forEach(button=>button.setAttribute("aria-current",Number(button.dataset.nabId)===state.nabId?"true":"false"));
      $("[data-nab-detail]").innerHTML=`<header class="nab-disc-head"><p class="nab-eyebrow">NAB ${row.id} / ${esc(row.symbol)} / ${esc(row.operatingBoundary)}</p><h2>${esc(row.name)} · ${esc(row.theme)}</h2><p>Designated stock: <strong>${esc(row.ticker)}</strong> · neural risk ${esc(row.riskProfile)}</p><p>${composite.coverage.constituents} constituents · ${composite.coverage.observed} with observations across available providers · ${composite.physical.length} saved physical designs</p></header>
        <p class="nab-fine">The selected composite core follows ${esc(row.ticker)} only. Click a constituent in the 3D field to inspect its independent evidence below. Banks and physical records have no market height.</p>
        <div class="nab-members">${composite.members.map(member=>{
          const obs=member.observations.find(item=>item.provider===state.provider && item.interval===state.interval);
          const label=member.channel === "central-bank"?"INSTITUTIONAL CONTEXT":Model.channelNames[member.channel];
          return `<article class="nab-member" tabindex="-1" data-nab-member-id="${esc(member.id)}" style="--nab-color:${colors[member.channel]}"><header><b>${esc(member.symbol)} · ${esc(member.name)}</b><span>${esc(label)}</span></header><p>${esc(member.role)} · ${esc(member.rationale)}</p>
            <p>${obs ? `${esc(obs.status)} · ${esc(obs.provider)} · ${esc(obs.interval)} · ${esc(new Date(obs.at).toISOString())} · ${obs.stale?"STALE":"recent"}<br>FBB displacement: ${obs.fbbDisplacement===null?"unavailable":obs.fbbDisplacement.toFixed(4)} · close: ${esc(obs.market?.latestBar?.close ?? "unavailable")} ${esc(obs.market?.quoteCurrency || "")}` : member.channel==="central-bank"?"Reference metadata only; no policy-rate or balance-sheet observation available.":"No observation for the selected provider/interval. Missing is not zero."}</p>
            ${obs?.message?`<p>${esc(obs.message)}</p>`:""}
            <small>Alignment: ${esc(member.classificationStatus)} · source: ${esc(member.source)}</small>
            ${member.channel!=="central-bank"?`<button type="button" data-nab-refresh="${esc(member.id)}" ${state.pending || !eligible(member)?"disabled":""}>${member.liveEligible?"Refresh this source":"Not on reviewed provider roster"}</button>`:""}
            <details><summary>All supplied observations (${member.observations.length})</summary><pre>${esc(JSON.stringify(member.observations,null,2))}</pre></details></article>`;
        }).join("")}</div>
        <section class="nab-physical"><h3>Physical material constituents</h3>${composite.physical.length?composite.physical.map(design=>`<article tabindex="-1" data-nab-member-id="physical:${esc(design.id)}"><b>${esc(design.name)}</b><p>${design.components.map(component=>`${esc(component.material?.formula || component.materialId)} · ${component.material?"reported material record":"material record missing"} · ${esc(component.sharePercent)}% design weight`).join("<br>")}</p></article>`).join(""):"<p>No physical design is assigned to this NAB yet. Assign this same NAB in Material Spheroids; chemical composition is not inferred from a bank, ticker, or NAB name.</p>"}</section>
        <details class="nab-ai"><summary>Composite NAB AI context · sources, missing data and constraints</summary><pre>${esc(JSON.stringify(composite.aiContext,null,2))}</pre></details>`;
      const unlinked=state.observations.filter(item=>!registry.members.some(member=>member.channel===item.channel && member.symbol===item.symbol && member.nabId && (member.channel!=="crypto" || member.providerId===item.providerId)));
      $("[data-nab-review-summary]").textContent=`Alignment review queue · ${registry.review.length} source entries · ${unlinked.length} unlinked observations (crypto catalog ${state.crypto.length?"loaded":"not loaded"})`;
      $("[data-nab-review]").innerHTML=registry.review.map(row=>`<p>${esc(row.id)} · ${esc(row.name)} — ${esc(row.rationale)}</p>`).join("") || "No loaded source entries awaiting alignment. An unloaded catalog is not counted as complete.";
      if(unlinked.length)$("[data-nab-review]").innerHTML+=`<h4>Retained observations awaiting a qualified alignment</h4>${unlinked.map(item=>`<p>${esc(item.channel)}:${esc(item.symbol)} · ${esc(item.providerId || "provider identity not supplied")} · ${esc(item.provider)} / ${esc(item.interval)}</p>`).join("")}`;
      $("[data-nab-crypto]").disabled=state.pending;
      $("[data-nab-provider]").disabled=state.pending;
    }
    function choose(id) {
      if (!NAB.byId(id))return;
      state.nabId=id; state.cursor=0; save(); draw();
    }
    async function refresh(member) {
      if(state.destroyed || !state.visible || state.pending || !member || !eligible(member))return;
      const now=Date.now();
      // Shared browser pacing is only a convenience. Worker D1 and minute caps
      // remain authoritative even with multiple tabs or a crafted request.
      const last=Number(read(`${KEY}.last-attempt`)) || 0;
      if(now-last<60000){state.message="Source refresh is paced at one attempt per minute. Worker budget limits also apply.";draw();return;}
      try {storage?.setItem(`${KEY}.last-attempt`,JSON.stringify(now));} catch {}
      state.pending=true; state.message=`Refreshing ${member.id} via ${state.provider}; one source request only.`;draw();
      controller=new AbortController();
      const provider=state.provider, interval=state.interval;
      try {
        const params=new URLSearchParams({disc:member.channel,symbols:member.symbol,provider,interval,cadence:provider==="massive"?"1":provider==="alpha"?"60":"15"});
        const response=await (options.fetch || globalThis.fetch)(`/api/characters/v1/beat?${params}`,{signal:controller.signal,credentials:"same-origin"});
        const payload=await response.json();
        if(state.destroyed)return;
        const data=payload?.data;
        if(data && (data.disc!==member.channel || data.provider!==provider || data.interval!==interval)) throw new Error("Mismatched source response refused.");
        if(member.channel === "crypto" && !data?.sourceIdentities?.some(identity => identity.channel === "crypto" && identity.symbol === member.symbol && identity.providerId === member.providerId)) throw new Error("Crypto Massive ticker identity changed or was not supplied; reload the source catalog.");
        const instrument=data?.instruments?.find(item=>item.symbol===member.symbol);
        if(!instrument)throw new Error(payload?.message || "No matching source observation returned.");
        const packet=globalThis.GoodIntelligenceMarketContext?.normalizePacket(instrument.marketContext);
        if(packet && (packet.symbol!==member.symbol || packet.timeframe!==interval || packet.synthetic)) throw new Error("Mismatched or synthetic market packet refused.");
        const analysis=packet && globalThis.GoodIntelligenceMarketContext.evaluate(packet);
        const market=packet && analysis ? {...analysis,latestBar:packet.bars.at(-1) || null,basis:analysis.bands?.basis ?? null,quoteCurrency:packet.quoteCurrency} : null;
        const observedAt=Date.parse(data.beatAt);
        const obs=Model.observation({channel:member.channel,symbol:member.symbol,provider,interval,at:observedAt,
          market,status:instrument.status,message:instrument.message,providerId:member.providerId,source:packet?.source || "Characters Worker"});
        if(!obs)throw new Error("Invalid observation metadata refused.");
        state.observations=Model.mergeObservations(state.observations,[obs]);
        state.message=payload.success?`Updated ${member.id}. Source data joined only to its aligned NAB.`:instrument.message || payload.message || "Source unavailable; no fallback was requested.";
        save();
      } catch(error) {if(!state.destroyed)state.message=`Source unavailable: ${error.message}. No substitute or fabricated observation.`;}
      finally {state.pending=false;if(!state.destroyed)draw();}
    }
    async function loadCrypto() {
      if(state.pending || state.destroyed)return;
      state.pending=true;draw(); catalogController=new AbortController();
      try {
        const response=await (options.fetch || globalThis.fetch)("/api/characters/v1/discs?disc=crypto",{signal:catalogController.signal,credentials:"same-origin"});
        const payload=await response.json();
        if(state.destroyed)return;
        if(!response.ok || !payload?.success || !Array.isArray(payload.instruments))throw new Error(payload?.message || "Crypto catalog unavailable");
        state.crypto=payload.instruments.slice(0,52); rebuild();save();
        state.message="Crypto source catalog loaded. Explicit protocol alignments joined; unmatched identities retained for review. No market-bar requests were made.";
      } catch(error) {if(!state.destroyed)state.message=error.message;}
      finally {state.pending=false;if(!state.destroyed)draw();}
    }
    const restoreEvent=event=>{
      const external=Model.fromSavedBeats(Array.isArray(event.detail?.beats)?event.detail.beats:[]);
      state.observations=Model.mergeObservations(state.observations,archivedObservations,external);
      archivedObservations=[];save();draw();
    };
    const clearEvent=()=>{archivedObservations=state.observations;state.observations=[];draw();};
    host.ownerDocument.addEventListener("harshalos:characters-beats:restore",restoreEvent);
    host.ownerDocument.addEventListener("harshalos:characters-beats:clear",clearEvent);
    const onClick=event=>{
      const button=event.target.closest("button");if(!button || !host.contains(button))return;
      if(button.dataset.nabId)choose(Number(button.dataset.nabId));
      if(button.dataset.nabRefresh)refresh(registry.members.find(row=>row.id===button.dataset.nabRefresh));
    };
    host.addEventListener("click",onClick);
    $("[data-nab-select]").addEventListener("change",event=>choose(Number(event.target.value)));
    $("[data-nab-provider]").addEventListener("change",event=>{state.provider=event.target.value;state.interval=state.provider==="massive"?"1d":state.provider==="alpha"?"1mo":"1h";state.auto=false;$("[data-nab-auto]").checked=false;draw();});
    $("[data-nab-import]").addEventListener("click",()=>{importHistory();save();state.message="Saved Orb observations imported without modifying legacy history; physical records re-read. Provider and interval identities remain separate.";draw();});
    $("[data-nab-clear]").addEventListener("click",()=>{
      if(typeof options.onClearBeats === "function")options.onClearBeats();else clearEvent();
    });
    $("[data-nab-restore]").addEventListener("click",()=>{
      if(typeof options.onRestoreBeats === "function")options.onRestoreBeats();else {restoreEvent({});importHistory();draw();}
    });
    $("[data-nab-crypto]").addEventListener("click",loadCrypto);
    $("[data-nab-auto]").addEventListener("change",event=>{
      state.auto=event.target.checked && state.provider==="massive";event.target.checked=state.auto;
      state.message=state.auto?"Opt-in automatic refresh: one eligible constituent of this NAB each minute. Hidden views pause.":"Automatic refresh paused (available only for Massive daily observations).";draw();
    });
    const materialChanged = () => { if (!state.destroyed && state.visible) draw(); };
    const storageChanged = event => {
      if (Object.values(globalThis.CharacterMaterialModel?.STORAGE_KEYS || {}).includes(event.key)) materialChanged();
    };
    host.ownerDocument.addEventListener("harshalos:material-spheroids:changed", materialChanged);
    const browserWindow = host.ownerDocument.defaultView || globalThis;
    browserWindow.addEventListener?.("storage", storageChanged);
    const timer=setInterval(()=>{
      if(!host.isConnected){destroy();return;}
      if(!state.auto || !state.visible || host.ownerDocument.hidden || host.closest(".minimized") || state.pending)return;
      const members=selected().members.filter(eligible);
      if(members.length)refresh(members[state.cursor++ % members.length]);
    },60000);
    function destroy(){host.ownerDocument.removeEventListener("harshalos:material-spheroids:changed",materialChanged);browserWindow.removeEventListener?.("storage",storageChanged);host.ownerDocument.removeEventListener("harshalos:characters-beats:restore",restoreEvent);host.ownerDocument.removeEventListener("harshalos:characters-beats:clear",clearEvent);orbRenderer?.destroy();state.destroyed=true;clearInterval(timer);controller?.abort();catalogController?.abort();host.removeEventListener("click",onClick);}
    draw();
    return Object.freeze({schema:Model.VERSION,state,get orbRenderer(){return orbRenderer;},get composite(){return selected();},choose,
      beatNow:()=>refresh(selected().members.filter(eligible)[0]),refreshHistory:()=>{importHistory();draw();},
      setVisible:value=>{const becameVisible=!state.visible && !!value;state.visible=!!value;orbRenderer?.setVisible(!!value);if(becameVisible)draw();},destroy});
  }
  Object.defineProperty(globalThis,"NabDiscsView",{configurable:true,value:Object.freeze({mount,KEY})});
})();
