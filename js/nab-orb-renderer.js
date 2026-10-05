/* Display-only 3D projection for complete NAB composites. No provider, storage,
   or model-authority operations occur here. Geometry is a pure projection of
   NabComposites; each designated stock owns its composite's FBB height. */
"use strict";
(() => {
  const HEIGHT = 3;
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const RISK = Object.freeze(["#75dfb1", "#e8cb72", "#f1a064", "#f27888"]);
  const CHANNELS = Object.freeze({ stocks: "#8bd5ff", fx: "#b9a0ef", crypto: "#ecd078", commodities: "#80cdb0", indices: "#e7a4cb", "central-bank": "#a8b6cf", physical: "#d1b8ff" });
  const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
  const finite = value => typeof value === "number" && Number.isFinite(value);

  // The newest attempt is significant: a failed refresh is not replaced with
  // a silently selected older packet or another provider/timeframe.
  function selectedObservation(member, provider, interval) {
    return (member?.observations || []).filter(row => row.provider === provider && row.interval === interval)
      .reduce((latest, row) => !latest || row.at > latest.at ? row : latest, null);
  }

  function buildScene(composites, { provider = "massive", interval = "1d" } = {}) {
    return Object.freeze(composites.map(composite => {
      const sector = composite.designation.sector;
      const index = sector.id - 1;
      const primary = composite.members.find(member => member.role === "designated-stock");
      const observation = selectedObservation(primary, provider, interval);
      const displacement = finite(observation?.fbbDisplacement) ? observation.fbbDisplacement : null;
      const known = displacement !== null;
      const angle = index * GOLDEN;
      const radius = 11 * Math.sqrt((index + .5) / 119);
      // Stable, non-ranked horizontal addressing. The detached staging field
      // is explicitly not the market-neutral plane; marketY stays null there.
      const position = known
        ? { x: radius * Math.cos(angle), y: displacement * HEIGHT, z: radius * Math.sin(angle) }
        : { x: 24 + radius * .8 * Math.cos(angle), y: 0, z: radius * .8 * Math.sin(angle) };
      const members = composite.members.map((member, n) => {
        const obs = selectedObservation(member, provider, interval);
        const band = finite(obs?.fbbDisplacement) ? obs.fbbDisplacement : null;
        const a = n * GOLDEN;
        const r = 1.1 + Math.sqrt(n + 1) * .28;
        const contextOnly = band === null;
        return Object.freeze({ id: member.id, nabId: sector.id, kind: "member", channel: member.channel,
          label: member.symbol, name: member.name, member, observation: obs,
          displacement: band, marketY: contextOnly ? null : band * HEIGHT,
          contextOnly, stale: !!obs?.stale,
          position: contextOnly
            ? { x: position.x + 4.2 + (n % 4) * .55, y: position.y + 1.3 + Math.floor(n / 4) * .34, z: position.z + 1.6 }
            : { x: position.x + Math.cos(a) * r, y: band * HEIGHT, z: position.z + Math.sin(a) * r }
        });
      });
      // Physical facets have no market height or derived chemistry. IDs are
      // qualified by design and component index so repeated materials survive.
      const physical = composite.physical.flatMap(design => design.components.map((component, n) => ({
        id: `physical:${design.id}:${n}`, nabId: sector.id, kind: "physical", channel: "physical",
        label: component.material?.formula || component.materialId, name: design.name,
        design, component, marketY: null, contextOnly: true, displacement: null
      }))).map((facet, n) => Object.freeze({ ...facet,
        position: { x: position.x - 4.3 - (n % 4) * .6, y: position.y + 1.3 + Math.floor(n / 4) * .4, z: position.z + 1.6 }
      }));
      return Object.freeze({ id: composite.id, nabId: sector.id, kind: "nab", composite,
        label: `${sector.id} ${sector.symbol}`, ticker: sector.ticker, name: sector.name,
        riskLevel: sector.riskLevel, color: RISK[sector.riskLevel], displacement,
        marketY: known ? position.y : null, known, stale: !!observation?.stale,
        observation, position: Object.freeze(position), members: Object.freeze(members), physical: Object.freeze(physical) });
    }));
  }

  function project(point, camera, width, height) {
    const dx = point.x - camera.target.x, dy = point.y - camera.target.y, dz = point.z - camera.target.z;
    const x = dx * Math.cos(camera.yaw) - dz * Math.sin(camera.yaw);
    const z = dx * Math.sin(camera.yaw) + dz * Math.cos(camera.yaw);
    const y = dy * Math.cos(camera.pitch) - z * Math.sin(camera.pitch);
    const depth = dy * Math.sin(camera.pitch) + z * Math.cos(camera.pitch);
    const perspective = 70 / Math.max(12, 70 + depth);
    const scale = Math.min(width / 53, height / 32) * camera.zoom * perspective;
    return { x: width / 2 + x * scale, y: height / 2 - y * scale, depth, scale };
  }

  function hitTest(projected, x, y) {
    // Nearer objects win overlapping hit regions, matching back-to-front draw.
    return [...projected].sort((a, b) => a.depth - b.depth).find(point =>
      Math.hypot(point.x - x, point.y - y) <= Math.max(8, point.radius + 3)) || null;
  }

  function mount(host, { onSelect = () => {}, onInspect = () => {} } = {}) {
    const doc = host.ownerDocument || globalThis.document;
    const win = doc.defaultView || globalThis;
    host.innerHTML = `<section class="nab-orb-stage" data-nab-orb-stage>
      <div class="nab-orb-toolbar">
        <span class="nab-eyebrow">ORB 2 / 119 COMPOSITE NABS</span>
        <button type="button" data-orb-fit>Fit all</button><button type="button" data-orb-focus>Focus selected</button>
        <button type="button" data-orb-zoom="in" aria-label="Zoom in">+</button><button type="button" data-orb-zoom="out" aria-label="Zoom out">−</button>
        <label><input type="checkbox" data-orb-rotate> Rotate</label>
        <label><input type="checkbox" data-orb-labels> All labels</label>
        <label><input type="checkbox" data-orb-members checked> Constituents</label>
        <button type="button" data-orb-fullscreen>Model full screen</button>
      </div>
      <div class="nab-orb-viewport">
        <canvas data-nab-orb-canvas tabindex="0" aria-label="Interactive 3D field of 119 composite NAB spheroids. Drag to orbit, scroll or use plus and minus to zoom. Left and right select a NAB; Enter focuses it. Shift with arrow keys orbits. Escape fits all."></canvas>
        <div class="nab-orb-caption" data-orb-caption></div>
        <p class="nab-orb-fallback" data-orb-fallback hidden>3D canvas unavailable. All 119 NABs and their complete constituent, physical-material and AI records remain accessible using the NAB selector and inspector.</p>
      </div>
      <div class="nab-orb-legend"><span>Core height = designated stock FBB</span><span>Ring = neural risk, not price</span><span>Dots = aligned market / institution records</span><span>Diamonds = physical material records</span></div>
      <p class="nab-fine">Drag to orbit · scroll to zoom · click a core to inspect · double-click to focus. No enclosing shell or central tethers. Unknown cores occupy a separate staging field; context and material shelves have no market height. Stale observations are dimmed. Supporting markets retain their own FBB heights. Decorative core detail carries no market meaning.</p>
      <p class="nab-orb-selection" data-orb-selection role="status" aria-live="polite"></p>
    </section>`;
    const $ = selector => host.querySelector(selector);
    const canvas = $("[data-nab-orb-canvas]");
    const stage = $("[data-nab-orb-stage]");
    const reduced = win.matchMedia?.("(prefers-reduced-motion: reduce)");
    let context;
    try { context = canvas.getContext?.("2d"); } catch { context = null; }
    const camera = { yaw: -.24, pitch: .52, zoom: 1, target: { x: 10, y: 0, z: 0 } };
    let scene = [], selectedId = 1, projected = [], width = 900, height = 560;
    let visible = true, destroyed = false, frame = 0, rotating = false, labels = false, showMembers = true;
    let lastFrame = 0, drag = null, hovered = null, fallbackFull = false, focused = false;
    const cleanups = [];
    const listen = (target, event, handler, options) => {
      target?.addEventListener?.(event, handler, options);
      cleanups.push(() => target?.removeEventListener?.(event, handler, options));
    };
    const active = () => !destroyed && host.isConnected !== false && visible && !doc.hidden && !host.closest?.(".minimized");
    const selected = () => scene.find(node => node.nabId === selectedId);
    const numberText = value => value === null ? "unknown" : Number(value.toFixed(4)).toString();

    function selectionText(node, detail) {
      const sector = node.composite.designation.sector;
      if (detail?.kind === "physical") {
        const component = detail.component;
        return `NAB ${node.nabId} · ${detail.name} · ${detail.label} · ${component.material ? "reported material record" : "material record missing"} · ${component.sharePercent}% design weight. Physical record; no FBB height.`;
      }
      if (detail?.kind === "member") {
        return `NAB ${node.nabId} · ${detail.name} · ${detail.channel} · ${detail.contextOnly ? "context / FBB unavailable" : `FBB ${numberText(detail.displacement)}`}${detail.stale ? " · STALE" : ""}.`;
      }
      return `NAB ${node.nabId} · ${node.name} · ${node.ticker} · FBB ${numberText(node.displacement)}${node.stale ? " · STALE" : ""} · ${sector.riskProfile} neural risk · ${node.members.length} source constituents · ${node.physical.length} material facets. ${sector.operatingBoundary}.`;
    }
    function announce(detail) {
      const node = selected();
      if (node) $("[data-orb-selection]").textContent = selectionText(node, detail);
    }
    function fit() {
      focused = false;
      camera.target = { x: 10, y: 0, z: 0 };
      camera.zoom = 1;
      // Preserve genuine beyond-band excursions; fit them rather than clamp Y.
      const extent = Math.max(7, ...scene.filter(node => node.known).map(node => Math.abs(node.position.y)));
      if (extent > 7) camera.zoom = Math.min(1, 9 / extent);
      request();
    }
    function focusSelected() {
      const node = selected(); if (!node) return;
      focused = true;
      camera.target = { ...node.position };
      camera.zoom = 2.4;
      request();
    }
    function resize() {
      const bounds = canvas.getBoundingClientRect?.();
      width = Math.max(280, bounds?.width || host.clientWidth || 900);
      height = Math.max(300, bounds?.height || 560);
      const dpr = Math.min(2, win.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      context?.setTransform(dpr, 0, 0, dpr, 0, 0);
      request();
    }
    const screen = point => project(point, camera, width, height);
    function path(points, color, alpha, lineWidth = 1, fill = false) {
      context.beginPath();
      points.forEach((point, i) => { const p = screen(point); if (i) context.lineTo(p.x, p.y); else context.moveTo(p.x, p.y); });
      context.globalAlpha = alpha;
      if (fill) { context.closePath(); context.fillStyle = color; context.fill(); }
      else { context.strokeStyle = color; context.lineWidth = lineWidth; context.stroke(); }
      context.globalAlpha = 1;
    }
    function worldLabel(text, point, color = "#8da9c8") {
      const p = screen(point); context.fillStyle = color; context.font = "10px ui-monospace, monospace";
      context.textAlign = "left"; context.fillText(text, p.x, p.y);
    }
    function guides() {
      path([{x:-13,y:0,z:-13},{x:13,y:0,z:-13},{x:13,y:0,z:13},{x:-13,y:0,z:13}], "#66c8ed", .035, 1, true);
      for (let line = -12; line <= 12; line += 3) {
        path([{x:line,y:0,z:-13},{x:line,y:0,z:13}], "#76bad7", .13);
        path([{x:-13,y:0,z:line},{x:13,y:0,z:line}], "#76bad7", .13);
      }
      for (const y of [-HEIGHT, HEIGHT]) path([{x:-13,y,z:-13},{x:13,y,z:-13},{x:13,y,z:13}], "#a1b6cb", .16);
      worldLabel("FBB BASELINE · 0", {x:-13,y:.1,z:13});
      worldLabel("UPPER · +1", {x:-13,y:HEIGHT,z:-13});
      worldLabel("LOWER · −1", {x:-13,y:-HEIGHT,z:-13});
      worldLabel("UNKNOWN / AWAITING DESIGNATED-STOCK BANDS", {x:16,y:1.3,z:-11}, "#8793ab");
    }
    function orb(point, node) {
      const r = point.radius, chosen = node.nabId === selectedId;
      const alpha = (node.stale ? .46 : node.known ? .92 : .68) * (focused && !chosen ? .16 : 1);
      const glow = context.createRadialGradient(point.x - r * .25, point.y - r * .32, 0, point.x, point.y, r * 1.45);
      glow.addColorStop(0, "#e4f8ff"); glow.addColorStop(.17, "#89d2f3"); glow.addColorStop(.46, "#345b82"); glow.addColorStop(1, "rgba(31,65,104,0)");
      context.globalAlpha = alpha;
      context.fillStyle = glow; context.beginPath(); context.ellipse(point.x, point.y, r * 1.4, r * 1.15, 0, 0, Math.PI * 2); context.fill();
      context.strokeStyle = node.color; context.lineWidth = chosen ? 2 : 1;
      context.setLineDash(node.known ? [] : [2, 3]);
      context.beginPath(); context.ellipse(point.x, point.y, r, r * .82, -.25, 0, Math.PI * 2); context.stroke(); context.setLineDash([]);
      // Local fractal-like branches only; no shell surrounding the field.
      context.strokeStyle = "#bfeaff"; context.lineWidth = .65;
      for (let arm = 0; arm < 5; arm++) {
        const a = arm * Math.PI * 2 / 5 + node.nabId * .7;
        const x = point.x + Math.cos(a) * r * .65, y = point.y + Math.sin(a) * r * .5;
        context.beginPath(); context.moveTo(point.x, point.y); context.lineTo(x, y);
        context.lineTo(x + Math.cos(a + .8) * r * .2, y + Math.sin(a + .8) * r * .2); context.stroke();
      }
      if (chosen) {
        context.strokeStyle = "#e2f6ff"; context.lineWidth = 1; context.beginPath();
        context.ellipse(point.x, point.y, r + 5, r * .82 + 5, -.25, 0, Math.PI * 2); context.stroke();
      }
      context.globalAlpha = 1;
      if (chosen || labels || hovered === node.id) {
        context.fillStyle = chosen ? "#edf9ff" : "#a9bfd6"; context.textAlign = "center";
        context.font = `${chosen ? "bold " : ""}10px ui-monospace, monospace`;
        context.fillText(`${node.label} · ${node.ticker}`, point.x, point.y + r + 17);
      }
    }
    function particle(point, detail) {
      context.globalAlpha = detail.stale ? .4 : .9;
      context.fillStyle = CHANNELS[detail.channel] || "#cbd5e1";
      context.strokeStyle = context.fillStyle;
      const r = point.radius;
      context.beginPath();
      if (detail.kind === "physical") {
        context.moveTo(point.x,point.y-r); context.lineTo(point.x+r,point.y); context.lineTo(point.x,point.y+r); context.lineTo(point.x-r,point.y); context.closePath();
      } else if (detail.channel === "central-bank") context.rect(point.x-r,point.y-r,r*2,r*2);
      else context.arc(point.x,point.y,r,0,Math.PI*2);
      if (detail.contextOnly) context.stroke(); else context.fill();
      context.globalAlpha = 1;
      if (labels || hovered === detail.id) { context.font = "9px ui-monospace, monospace"; context.textAlign = "center"; context.fillText(detail.label,point.x,point.y+r+11); }
    }
    function render(time = 0) {
      frame = 0;
      if (!active() || !context) return;
      if (rotating && !reduced?.matches && !drag) camera.yaw += Math.min(50, lastFrame ? time-lastFrame : 0) * .00012;
      lastFrame = time;
      context.clearRect(0,0,width,height);
      context.fillStyle = "#09111f"; context.fillRect(0,0,width,height);
      guides();
      const points = scene.map(node => ({ ...screen(node.position), radius: Math.max(4, (node.nabId === selectedId ? .58 : .38) * screen(node.position).scale), node, kind: "nab", nabId: node.nabId }));
      const current = selected();
      if (showMembers && current) {
        // Market constituents have independently derived world heights, while
        // institutional/material records sit on named, non-market shelves.
        [...current.members, ...current.physical].forEach(detail => {
          // The designated stock is already represented by its composite core.
          if (detail.member?.role === "designated-stock") return;
          const p = screen(detail.position);
          points.push({...p, radius:clamp(.13*p.scale,2.5,7),detail,kind:detail.kind,nabId:current.nabId});
        });
        if (current.members.some(member => member.contextOnly && member.member.role !== "designated-stock"))
          worldLabel(`NAB ${current.nabId} · CONTEXT / UNKNOWN`, {x:current.position.x+4.2,y:current.position.y+2,z:current.position.z+1.6});
        if (current.physical.length) worldLabel(`NAB ${current.nabId} · MATERIAL RECORDS`, {x:current.position.x-6,y:current.position.y+2,z:current.position.z+1.6});
      }
      projected = points.filter(point => finite(point.x) && finite(point.y)).sort((a,b)=>b.depth-a.depth);
      for (const point of projected) point.kind === "nab" ? orb(point,point.node) : particle(point,point.detail);
      if (rotating && !reduced?.matches) request();
    }
    function request() {
      if (!frame && context && active() && typeof win.requestAnimationFrame === "function") frame = win.requestAnimationFrame(render);
    }
    function cancel() { if (frame) win.cancelAnimationFrame?.(frame); frame = 0; lastFrame = 0; }
    function pick(event) {
      const rect = canvas.getBoundingClientRect();
      return hitTest(projected, (event.clientX-rect.left)*width/(rect.width || width), (event.clientY-rect.top)*height/(rect.height || height));
    }
    function activate(point) {
      if (!point) return;
      if (point.kind === "nab") { selectedId = point.nabId; onSelect(point.nabId); announce(); }
      else { announce(point.detail); onInspect(point.detail); }
      request();
    }
    listen(canvas,"pointerdown",event=>{
      if (event.button !== undefined && event.button !== 0) return;
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false};
      canvas.setPointerCapture?.(event.pointerId); canvas.focus();
    });
    listen(canvas,"pointermove",event=>{
      if (!drag) {
        const point = pick(event);
        const next = point?.node?.id || point?.detail?.id || null;
        if (next !== hovered) {
          hovered = next;
          canvas.title = point ? selectionText(point.node || selected(), point.detail) : "Drag to orbit; click a core or constituent to inspect.";
          request();
        }
        return;
      }
      if (drag.id!==event.pointerId) return;
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>4)drag.moved=true;
      camera.yaw+=dx*.007;camera.pitch=clamp(camera.pitch+dy*.005,-1.1,1.1);
      drag.x=event.clientX;drag.y=event.clientY;request();
    });
    listen(canvas,"pointerup",event=>{
      if(!drag || drag.id!==event.pointerId)return;
      const click=!drag.moved;drag=null;
      if(canvas.hasPointerCapture?.(event.pointerId))canvas.releasePointerCapture(event.pointerId);
      if(click)activate(pick(event));request();
    });
    listen(canvas,"pointerleave",()=>{hovered=null;request();});
    listen(canvas,"pointercancel",()=>{drag=null;});
    listen(canvas,"lostpointercapture",()=>{drag=null;});
    listen(canvas,"dblclick",event=>{const point=pick(event);if(point?.kind==="nab"){activate(point);focusSelected();}});
    listen(canvas,"wheel",event=>{event.preventDefault();camera.zoom=clamp(camera.zoom*Math.exp(-event.deltaY*.001),.04,7);request();},{passive:false});
    listen(canvas,"keydown",event=>{
      let handled=true;
      if(event.key==="Escape") { if(fallbackFull){stage.classList.remove("nab-orb-fullscreen");fallbackFull=false;resize();}else fit(); }
      else if(event.key==="Enter")focusSelected();
      else if(event.key==="+" || event.key==="=") {camera.zoom=clamp(camera.zoom*1.2,.04,7);request();}
      else if(event.key==="-") {camera.zoom=clamp(camera.zoom/1.2,.04,7);request();}
      else if(event.shiftKey && event.key.startsWith("Arrow")) {camera.yaw+=event.key==="ArrowLeft"?-.12:event.key==="ArrowRight"?.12:0;camera.pitch=clamp(camera.pitch+(event.key==="ArrowUp"?.1:event.key==="ArrowDown"?-.1:0),-1.1,1.1);request();}
      else if(event.key==="ArrowRight" || event.key==="ArrowLeft") {
        const index=scene.findIndex(node=>node.nabId===selectedId), offset=event.key==="ArrowRight"?1:-1;
        if(scene.length)activate({kind:"nab",nabId:scene[(index+offset+scene.length)%scene.length].nabId});
      } else handled=false;
      if(handled)event.preventDefault();
    });
    listen($("[data-orb-fit]"),"click",fit);
    listen($("[data-orb-focus]"),"click",focusSelected);
    host.querySelectorAll("[data-orb-zoom]").forEach(button=>listen(button,"click",()=>{camera.zoom=clamp(camera.zoom*(button.dataset.orbZoom==="in"?1.2:1/1.2),.04,7);request();}));
    listen($("[data-orb-rotate]"),"change",event=>{rotating=event.target.checked;request();});
    listen($("[data-orb-labels]"),"change",event=>{labels=event.target.checked;request();});
    listen($("[data-orb-members]"),"change",event=>{showMembers=event.target.checked;request();});
    listen($("[data-orb-fullscreen]"),"click",async()=>{
      try {
        if(doc.fullscreenElement===stage)await doc.exitFullscreen();
        else if(stage.requestFullscreen)await stage.requestFullscreen();
        else throw new Error("Fullscreen API unavailable");
      } catch {if(!destroyed){fallbackFull=!fallbackFull;stage.classList.toggle("nab-orb-fullscreen",fallbackFull);}}
      if(!destroyed)resize();
    });
    listen(doc,"fullscreenchange",resize);
    listen(doc,"visibilitychange",()=>{if(active())request();else cancel();});
    listen(win,"resize",resize);
    listen(reduced,"change",()=>{if(reduced.matches){rotating=false;$("[data-orb-rotate]").checked=false;}request();});
    const resizeObserver=win.ResizeObserver?new win.ResizeObserver(resize):null;resizeObserver?.observe(canvas);
    const windowElement=host.closest?.(".window");
    const windowObserver=win.MutationObserver&&windowElement?new win.MutationObserver(()=>{if(active())request();else cancel();}):null;
    windowObserver?.observe(windowElement,{attributes:true,attributeFilter:["class"]});
    if (!context) { $("[data-orb-fallback]").hidden=false; canvas.hidden=true; }
    resize();
    return Object.freeze({
      update(composites,{selectedId:id=selectedId,provider,interval}={}) {
        const first=!scene.length;
        scene=buildScene(composites,{provider,interval});selectedId=id;
        const known=scene.filter(node=>node.known).length;
        $("[data-orb-caption]").textContent=`${scene.length} COMPOSITE CORES · ${known} WITH FBB · ${scene.length-known} UNKNOWN · ${provider || "massive"} / ${interval || "1d"}`;
        if(first)fit();
        // Do not reset camera on refresh or selection. Only explicit Fit/Focus
        // controls move its target; observation heights themselves are exact.
        announce();request();
      },
      get scene(){return scene;}, get camera(){return {...camera,target:{...camera.target}};},
      get projected(){return projected.map(point=>({...point}));},
      get focused(){return focused;},
      renderNow:()=>{cancel();render(0);},
      setVisible(value){visible=!!value;if(active())request();else cancel();},
      destroy(){if(destroyed)return;destroyed=true;cancel();resizeObserver?.disconnect();windowObserver?.disconnect();cleanups.forEach(fn=>fn());stage.classList.remove("nab-orb-fullscreen");if(doc.fullscreenElement===stage)doc.exitFullscreen?.()?.catch?.(()=>{});projected=[];scene=[];}
    });
  }
  Object.defineProperty(globalThis,"NabOrbRenderer",{configurable:true,value:Object.freeze({HEIGHT,RISK,CHANNELS,buildScene,project,hitTest,mount})});
})();
