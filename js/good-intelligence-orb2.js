/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Good Intelligence / Orb 2

   A browser-local 3D rendering of the reviewed ticker watchlist. It is a visual
   model: it does not register identities, send OCM traffic, authorize a
   request, fetch market data, or turn a market observation into a signal.

   Peripheral labels are ticker symbols from the static reviewed watchlist,
   never invented IDs or OCM-directory registrations.
   ═══════════════════════════════════════════════════════════════ */
"use strict";

(() => {
  const SCHEMA = "gi-orb2-v1";
  const SAVED_BEAT_SESSION_KEY = "harshalos.orb2.saved-beats.session.v1";
  function getSavedBeatSessionId() {
    try {
      const storage = globalThis.localStorage;
      const current = storage.getItem(SAVED_BEAT_SESSION_KEY);
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(current || "")) return current;
      const id = globalThis.crypto?.randomUUID?.();
      if (!id) return "";
      storage.setItem(SAVED_BEAT_SESSION_KEY, id);
      return id;
    } catch { return ""; }
  }
  const TAU = Math.PI * 2;
  const CENTER_ADDRESS = "0•000•000•0000";
  const PALETTE = Object.freeze([
    "#6fd3ff", "#a86bff", "#5ce6a8", "#ffd479", "#ff7184", "#ffb45c",
    "#35d9e8", "#d5a8ff", "#4f8dff", "#3ddc84", "#f2ede2"
  ]);
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const ease = value => {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  };
  const slug = value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");


  /** Build deterministic display-only node metadata from the runtime cast. */
  function buildNodes(tickers, timeframe = "1h") {
    const entries = (Array.isArray(tickers) ? tickers : []).filter(item => item && /^[A-Z0-9.-]{1,16}$/.test(String(item.symbol || "").toUpperCase()))
      .map(item => ({ symbol: String(item.symbol).toUpperCase(), name: String(item.name || item.symbol).slice(0, 96), sector: String(item.sector || "Market").slice(0, 64) }));
    const sectors = [...new Set(entries.map(entry => entry.sector))];
    const counts = new Map(sectors.map(sector => [sector, 0]));
    return Object.freeze(entries.map((entry, index) => {
      const sector = entry.sector;
      const sectorIndex = sectors.indexOf(sector);
      const withinSector = counts.get(sector) || 0;
      counts.set(sector, withinSector + 1);
      /* The first angle is sector-stable; the fibonacci fraction distributes
         members over latitude in sphere mode without creating a hidden rank. */
      const longitude = -Math.PI / 2 + (sectorIndex / Math.max(1, sectors.length)) * TAU +
        ((withinSector + 0.5) / Math.max(1, entries.filter(item => item.sector === sector).length) - 0.5) * (TAU / Math.max(1, sectors.length)) * 0.82;
      const latitude = Math.asin(clamp(1 - 2 * ((index + 0.5) / Math.max(1, entries.length)), -1, 1)) * 0.82;
      return Object.freeze({
        id: `${slug(entry.symbol) || "ticker"}-${timeframe}`,
        visualId: entry.symbol,
        symbol: entry.symbol,
        name: entry.name,
        role: `${entry.name} · ${entry.symbol} ticker orb for ${timeframe} bars. Market data is not loaded in this view.`,
        glyph: "◉",
        affinity: Object.freeze([entry.sector]),
        sector,
        sectorIndex,
        color: PALETTE[(sectorIndex + (timeframe === "1d" ? 3 : 0)) % PALETTE.length],
        longitude: longitude + (timeframe === "1d" ? 0.21 : 0),
        latitude: latitude + (timeframe === "1d" ? 0.13 : 0),
        order: index
      });
    }));
  }

  function friendlyRoute(route) {
    if (!route) return "Select a ticker orb, then trace a visual route. No message is sent.";
    if (route.type === "lateral") return "Lateral observation is visualized only. It neither resolves legitimacy nor transfers authority.";
    if (route.phase === "inward") return `Visual trace: ${route.from.name} → Center Origin.`;
    if (route.phase === "resolve") return "Visual trace at Center Origin. Resolution is not an authority source.";
    if (route.phase === "outward") return `Visual trace: Center Origin → ${route.to.name}.`;
    return `Visual resolution path complete: ${route.from.name} → Center Origin → ${route.to.name}.`;
  }

  function mount(host, { tickers, timeframe = "1h", onTimeframeChange = () => {}, onClearBeats = () => {}, onRestoreBeats = () => {} } = {}) {
    if (!host || typeof host.innerHTML !== "string") return null;
    timeframe = timeframe === "1d" ? "1d" : "1h";
    const nodes = buildNodes(tickers, timeframe);
    if (!nodes.length) {
      host.innerHTML = `<div class="gi-empty error"><span class="gi-empty-mark">!</span><strong>Orb 2 roster unavailable</strong><p>The Characters cast module did not provide a reviewed roster. No nodes or routes were invented.</p></div>`;
      return Object.freeze({ schema: SCHEMA, nodes, destroy() {}, setVisible() {} });
    }

    host.innerHTML = `
      <section class="gi-orb2" aria-label="Orb 2 3D OCM visualization">
        <div class="gi-orb2-toolbar">
          <div>
            <p class="gi-eyebrow">ORB 2 · MARKET TICKER MODEL</p>
            <h3>${timeframe === "1h" ? "Hourly" : "Daily"} ticker orbs</h3>
            <p>One local orb per reviewed ticker. Select a ticker below; switch chart interval in Market Charts to build its distinct timeframe orb. No prices or signals appear here.</p>
          </div>
          <div class="gi-orb2-actions">
            <label class="gi-chart-control"><span>TIMEFRAME</span><select data-gi-orb2-timeframe aria-label="Select Orb timeframe"><option value="1h" ${timeframe === "1h" ? "selected" : ""}>1 hour</option><option value="1d" ${timeframe === "1d" ? "selected" : ""}>1 day</option></select></label>
            <button class="gi-button" type="button" data-gi-orb2-route>Trace resolution</button>
            <button class="gi-button" type="button" data-gi-orb2-lateral>Observe laterally</button>
            <button class="gi-button" type="button" data-gi-orb2-clear-beats>Clear beats</button>
            <button class="gi-button" type="button" data-gi-orb2-restore-beats>Restore stored beats</button>
            <button class="gi-button" type="button" data-gi-orb2-reset>Reset view</button>
          </div>
        </div>
        <p class="gi-orb2-beat-status" data-gi-orb2-beat-status role="status" aria-live="polite">Compact beat snapshots save to D1 when available; Clear hides active context and Restore reloads the archive.</p>
        <div class="gi-orb2-controls" aria-label="Orb 2 display controls">
          <label><span>FORM</span><input data-gi-orb2-formation type="range" min="0" max="100" step="1" value="100"><strong data-gi-orb2-formation-label>SPHERE</strong></label>
          <label class="gi-orb2-toggle"><input data-gi-orb2-rotate type="checkbox" checked><span>Auto-rotate</span></label>
          <label class="gi-orb2-toggle"><input data-gi-orb2-labels type="checkbox"><span>All labels</span></label>
          <span class="gi-orb2-center">CENTER · ${CENTER_ADDRESS}</span>
        </div>
        <p class="gi-orb2-context"><strong>REVIEWED BEAT CONTEXT</strong> · Characters keeps market observation in its own read-only stage: Massive covers one reviewed <code>1d</code> instrument per minute, Tickerbot remains manual for Disc1 <code>1h</code>/<code>1d</code>, and Alpha Vantage's Disc1 <code>1mo</code> spotlight is one best-performing ticker per hour. Orb 2 receives none of those packets—no price, rank, signal, or recommendation is rendered here.</p>
        <div class="gi-orb2-layout">
          <div class="gi-orb2-canvas-shell">
            <canvas data-gi-orb2-canvas tabindex="0" aria-label="Interactive 3D ticker orb model. Drag to orbit. Select a visible ticker orb to inspect it."></canvas>
            <div class="gi-orb2-canvas-hud" aria-hidden="true"><span>3D OCM MODEL</span><span>LOCAL / DISPLAY ONLY</span></div>
            <p class="gi-orb2-gesture">Drag to orbit · scroll to zoom · click a node to inspect</p>
          </div>
          <aside class="gi-orb2-inspector" aria-live="polite">
            <p class="gi-eyebrow">TICKER ORB</p>
            <label class="gi-orb2-node-select"><span>SELECT TICKER</span><select data-gi-orb2-select aria-label="Choose a ticker orb"></select></label>
            <div data-gi-orb2-detail></div>
            <div class="gi-orb2-route-note" data-gi-orb2-route-note role="status"></div>
          </aside>
        </div>
        <p class="gi-orb2-boundary"><strong>MODEL BOUNDARY</strong> · This canvas fetches no market data, sends no OCM traffic, creates no identity, and cannot authorize, resolve, commit, or transact. Center Origin and the Resolution Axis are visual teaching references only.</p>
      </section>`;

    const $ = selector => host.querySelector(selector);
    const canvas = $("[data-gi-orb2-canvas]");
    const select = $("[data-gi-orb2-select]");
    const detail = $("[data-gi-orb2-detail]");
    const routeNote = $("[data-gi-orb2-route-note]");
    const formation = $("[data-gi-orb2-formation]");
    const formationLabel = $("[data-gi-orb2-formation-label]");
    const rotateToggle = $("[data-gi-orb2-rotate]");
    const labelsToggle = $("[data-gi-orb2-labels]");
    const routeButton = $("[data-gi-orb2-route]");
    const lateralButton = $("[data-gi-orb2-lateral]");
    const resetButton = $("[data-gi-orb2-reset]");
    const clearBeatsButton = $("[data-gi-orb2-clear-beats]");
    const restoreBeatsButton = $("[data-gi-orb2-restore-beats]");
    const timeframeSelect = $("[data-gi-orb2-timeframe]");
    timeframeSelect.addEventListener("change", () => onTimeframeChange(timeframeSelect.value === "1d" ? "1d" : "1h"));
    const ownerDocument = host.ownerDocument;
    const beatStatusHandler = event => { restoreBeatsButton.hidden = !event.detail?.hasStored; };
    ownerDocument?.addEventListener("harshalos:characters-beats:status", beatStatusHandler);
    clearBeatsButton.addEventListener("click", () => { state.route = null; showInspector(); onClearBeats(); });
    restoreBeatsButton.addEventListener("click", () => { state.route = null; showInspector(); onRestoreBeats(); });

    select.innerHTML = nodes.map(node => `<option value="${escapeHtml(node.id)}">${escapeHtml(node.name)} · ${escapeHtml(node.symbol)}</option>`).join("");

    const state = {
      yaw: -0.68,
      pitch: 0.32,
      zoom: 1,
      formation: 1,
      autoRotate: !(typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches),
      labels: false,
      visible: true,
      selected: 0,
      hover: -1,
      dragging: false,
      downX: 0,
      downY: 0,
      lastX: 0,
      lastY: 0,
      route: null,
      lastFrame: 0,
      animation: 0,
      destroyed: false,
      projected: []
    };
    rotateToggle.checked = state.autoRotate;

    function selectedNode() { return nodes[state.selected] || nodes[0]; }
    function showInspector() {
      const node = selectedNode();
      select.value = node.id;
      detail.innerHTML = `
        <div class="gi-orb2-node-head"><span style="--gi-orb2-node:${escapeHtml(node.color)}">${escapeHtml(node.glyph)}</span><div><h4>${escapeHtml(node.name)}</h4><p>${escapeHtml(node.symbol)} · ${timeframe} ticker orb</p></div></div>
        <dl class="gi-orb2-node-meta"><div><dt>COMPANY</dt><dd>${escapeHtml(node.name)}</dd></div><div><dt>SECTOR</dt><dd>${escapeHtml(node.affinity.join(" · "))}</dd></div><div><dt>TIMEFRAME</dt><dd>${timeframe}</dd></div></dl>
        <p class="gi-orb2-node-role">${escapeHtml(node.role)}</p>
        <p class="gi-orb2-node-caveat">Ticker labels identify reviewed watchlist symbols only; the orb is not price data, a signal, or an OCM identity.</p>`;
      routeNote.textContent = friendlyRoute(state.route);
    }

    function setSelected(index) {
      state.selected = clamp(Math.floor(Number(index) || 0), 0, nodes.length - 1);
      showInspector();
    }

    function setRoute(type) {
      const from = selectedNode();
      const offset = type === "resolution" ? 7 : 11;
      const to = nodes[(state.selected + offset) % nodes.length];
      const now = globalThis.performance && typeof globalThis.performance.now === "function" ? globalThis.performance.now() : Date.now();
      state.route = { type, from, to, startedAt: now, phase: type === "resolution" ? "inward" : "lateral", complete: false };
      showInspector();
    }

    const ctx = canvas && typeof canvas.getContext === "function" ? canvas.getContext("2d") : null;
    if (!ctx) {
      routeButton.disabled = true;
      lateralButton.disabled = true;
      showInspector();
      routeNote.textContent = "Ticker selection is available, but this browser/runtime does not expose a 2D canvas for the orb render. No nodes or routes were invented.";
      select.addEventListener("change", () => setSelected(nodes.findIndex(node => node.id === select.value)));
      return Object.freeze({ schema: SCHEMA, nodes, state, destroy() { ownerDocument?.removeEventListener("harshalos:characters-beats:status", beatStatusHandler); }, setVisible() {} });
    }

    function bounds() {
      const rect = typeof canvas.getBoundingClientRect === "function" ? canvas.getBoundingClientRect() : null;
      const width = Math.max(1, Math.round(canvas.clientWidth || rect?.width || 740));
      const height = Math.max(1, Math.round(canvas.clientHeight || rect?.height || 470));
      const dpr = Math.max(1, Math.min(2, Number(globalThis.devicePixelRatio) || 1));
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      return { width, height, dpr };
    }

    function modelPoint(node) {
      const sphereRadius = 2.06;
      const discRadius = 1.04 + ((node.order * 17) % 5) * 0.12;
      const sphere = {
        x: sphereRadius * Math.cos(node.latitude) * Math.cos(node.longitude),
        y: sphereRadius * Math.sin(node.latitude),
        z: sphereRadius * Math.cos(node.latitude) * Math.sin(node.longitude)
      };
      const disc = { x: discRadius * Math.cos(node.longitude), y: 0, z: discRadius * Math.sin(node.longitude) };
      const t = ease(state.formation);
      return {
        x: disc.x + (sphere.x - disc.x) * t,
        y: disc.y + (sphere.y - disc.y) * t,
        z: disc.z + (sphere.z - disc.z) * t
      };
    }

    function project(point, width, height) {
      const cy = Math.cos(state.yaw), sy = Math.sin(state.yaw);
      const cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
      const x = point.x * cy - point.z * sy;
      const z0 = point.x * sy + point.z * cy;
      const y = point.y * cp - z0 * sp;
      const z = point.y * sp + z0 * cp;
      const fov = 6.4 / state.zoom;
      const scale = fov / (fov + z);
      const radius = Math.min(width, height) * 0.315;
      return { x: width / 2 + x * scale * radius, y: height / 2 - y * scale * radius, z, scale };
    }

    function line(a, b, color, alpha = 1, width = 1, dash = []) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    }

    function ring(latitude, width, height, color, alpha) {
      const points = [];
      for (let step = 0; step <= 72; step += 1) {
        const longitude = (step / 72) * TAU;
        const r = 2.06;
        points.push(project({ x: r * Math.cos(latitude) * Math.cos(longitude), y: r * Math.sin(latitude), z: r * Math.cos(latitude) * Math.sin(longitude) }, width, height));
      }
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha * state.formation;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
      ctx.stroke();
      ctx.restore();
    }

    function drawRoute(now, center) {
      const route = state.route;
      if (!route) return;
      const from = state.projected[route.from.order];
      const to = state.projected[route.to.order];
      if (!from || !to) return;
      const elapsed = now - route.startedAt;
      const progress = clamp(elapsed / (route.type === "resolution" ? 2200 : 1450), 0, 1);
      if (route.type === "lateral") {
        route.phase = progress < 1 ? "lateral" : "confirmed";
        const point = { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress };
        line(from, to, "#ffb45c", 0.72, 1.5, [5, 5]);
        ctx.save();
        ctx.fillStyle = "#ffcf85";
        ctx.shadowBlur = 17;
        ctx.shadowColor = "#ffb45c";
        ctx.beginPath(); ctx.arc(point.x, point.y, 4.4, 0, TAU); ctx.fill(); ctx.restore();
      } else {
        const inward = 0.43, resolve = 0.58;
        if (progress < inward) {
          route.phase = "inward";
          const p = progress / inward;
          const point = { x: from.x + (center.x - from.x) * p, y: from.y + (center.y - from.y) * p };
          line(from, center, "#6fd3ff", 0.85, 1.8);
          ctx.save(); ctx.fillStyle = "#e7fbff"; ctx.shadowBlur = 18; ctx.shadowColor = "#6fd3ff";
          ctx.beginPath(); ctx.arc(point.x, point.y, 4.6, 0, TAU); ctx.fill(); ctx.restore();
        } else if (progress < resolve) {
          route.phase = "resolve";
          line(from, center, "#6fd3ff", 0.85, 1.8);
          ctx.save(); ctx.fillStyle = "#ffd479"; ctx.shadowBlur = 28; ctx.shadowColor = "#ffd479";
          ctx.beginPath(); ctx.arc(center.x, center.y, 8 + Math.sin(now / 70) * 2, 0, TAU); ctx.fill(); ctx.restore();
        } else {
          route.phase = progress < 1 ? "outward" : "confirmed";
          const p = (progress - resolve) / (1 - resolve);
          const point = { x: center.x + (to.x - center.x) * p, y: center.y + (to.y - center.y) * p };
          line(from, center, "#6fd3ff", 0.55, 1.2);
          line(center, to, "#5ce6a8", 0.88, 1.8);
          ctx.save(); ctx.fillStyle = "#effff8"; ctx.shadowBlur = 18; ctx.shadowColor = "#5ce6a8";
          ctx.beginPath(); ctx.arc(point.x, point.y, 4.6, 0, TAU); ctx.fill(); ctx.restore();
        }
      }
      if (route.phase !== state.lastRoutePhase) {
        state.lastRoutePhase = route.phase;
        routeNote.textContent = friendlyRoute(route);
      }
      if (progress >= 1 && elapsed > 3500) {
        state.route = null;
        state.lastRoutePhase = "";
        routeNote.textContent = friendlyRoute(null);
      }
    }

    function draw(now) {
      if (state.destroyed || !state.visible) return;
      const { width, height, dpr } = bounds();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const background = ctx.createRadialGradient(width * 0.48, height * 0.42, 2, width * 0.5, height * 0.5, Math.max(width, height) * 0.7);
      background.addColorStop(0, "#101d35");
      background.addColorStop(0.54, "#0a1222");
      background.addColorStop(1, "#060b14");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      if (state.autoRotate && !state.dragging) {
        const dt = state.lastFrame ? Math.min(80, now - state.lastFrame) : 16;
        state.yaw += dt * 0.00013;
      }
      state.lastFrame = now;
      const center = project({ x: 0, y: 0, z: 0 }, width, height);

      /* Sphere mesh and the disc's equatorial cross-section share the same camera. */
      [-0.62, -0.31, 0, 0.31, 0.62].forEach(latitude => ring(latitude, width, height, latitude === 0 ? "#6fd3ff" : "#516983", latitude === 0 ? 0.38 : 0.18));
      for (let index = 0; index < 8; index += 1) {
        const longitude = (index / 8) * TAU;
        const a = project({ x: 2.06 * Math.cos(longitude), y: 0, z: 2.06 * Math.sin(longitude) }, width, height);
        const b = project({ x: -2.06 * Math.cos(longitude), y: 0, z: -2.06 * Math.sin(longitude) }, width, height);
        line(a, b, "#49627e", 0.09 + state.formation * 0.08, 0.7);
      }

      state.projected = nodes.map(node => ({ ...project(modelPoint(node), width, height), node }));
      state.projected.forEach(point => line(center, point, point.node.color, 0.105 + Math.max(0, -point.z) * 0.035, 0.7));
      drawRoute(now, center);

      const ordered = [...state.projected].sort((a, b) => b.z - a.z);
      ordered.forEach(point => {
        const node = point.node;
        const chosen = node.order === state.selected;
        const hovered = node.order === state.hover;
        const radius = clamp(3.2 + point.scale * 2.5 + (chosen ? 1.9 : 0), 3, 8);
        ctx.save();
        ctx.globalAlpha = clamp(0.32 + (1 - point.z / 5) * 0.34, 0.3, 1);
        ctx.fillStyle = node.color;
        ctx.shadowBlur = chosen || hovered ? 22 : 9;
        ctx.shadowColor = node.color;
        ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, TAU); ctx.fill();
        if (chosen || hovered) {
          ctx.strokeStyle = "#ffffff"; ctx.globalAlpha = 0.9; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(point.x, point.y, radius + 3, 0, TAU); ctx.stroke();
        }
        ctx.restore();
        if (state.labels || chosen || hovered) {
          ctx.save();
          ctx.globalAlpha = chosen || hovered ? 1 : 0.72;
          ctx.fillStyle = "#edf6ff";
          ctx.font = `${chosen ? 11 : 9}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          ctx.textAlign = point.x > width * 0.52 ? "left" : "right";
          const offset = point.x > width * 0.52 ? radius + 5 : -radius - 5;
          ctx.fillText(node.symbol, point.x + offset, point.y - radius - 4);
          ctx.restore();
        }
      });

      ctx.save();
      ctx.fillStyle = "#ffd479";
      ctx.shadowBlur = 24;
      ctx.shadowColor = "#ffd479";
      ctx.beginPath(); ctx.arc(center.x, center.y, 7, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,212,121,.8)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(center.x, center.y, 13, 0, TAU); ctx.stroke();
      ctx.fillStyle = "#fff2c6";
      ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText("CENTER", center.x, center.y + 29);
      ctx.restore();
    }

    function schedule() {
      if (state.destroyed || !state.visible || state.animation || typeof requestAnimationFrame !== "function") return;
      state.animation = requestAnimationFrame(frame);
    }

    function frame(now) {
      state.animation = 0;
      if (state.destroyed || !state.visible) return;
      if (canvas && (canvas.offsetParent !== null || canvas.clientWidth > 0)) {
        draw(now || (globalThis.performance && typeof globalThis.performance.now === "function" ? globalThis.performance.now() : Date.now()));
      }
      schedule();
    }

    function pick(event) {
      const rect = typeof canvas.getBoundingClientRect === "function" ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
      const x = Number(event.clientX) - (rect.left || 0);
      const y = Number(event.clientY) - (rect.top || 0);
      let winner = -1;
      let distance = Infinity;
      for (const point of state.projected) {
        const d = Math.hypot(point.x - x, point.y - y);
        if (d < distance && d < 18) { winner = point.node.order; distance = d; }
      }
      return winner;
    }

    const onPointerDown = event => {
      state.dragging = true;
      state.downX = state.lastX = Number(event.clientX) || 0;
      state.downY = state.lastY = Number(event.clientY) || 0;
      try { canvas.setPointerCapture(event.pointerId); } catch { /* optional */ }
    };
    const onPointerMove = event => {
      if (state.dragging) {
        state.yaw += ((Number(event.clientX) || 0) - state.lastX) * 0.007;
        state.pitch = clamp(state.pitch + ((Number(event.clientY) || 0) - state.lastY) * 0.006, -1.1, 1.1);
        state.lastX = Number(event.clientX) || 0;
        state.lastY = Number(event.clientY) || 0;
      } else {
        state.hover = pick(event);
        canvas.style.cursor = state.hover >= 0 ? "pointer" : "grab";
      }
    };
    const onPointerUp = event => {
      const moved = Math.hypot((Number(event.clientX) || 0) - state.downX, (Number(event.clientY) || 0) - state.downY);
      if (moved < 6) {
        const index = pick(event);
        if (index >= 0) setSelected(index);
      }
      state.dragging = false;
    };
    const onWheel = event => {
      event.preventDefault();
      state.zoom = clamp(state.zoom * (event.deltaY > 0 ? 0.92 : 1.08), 0.65, 1.75);
    };
    const onKeyDown = event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setRoute("resolution"); }
      if (event.key === "ArrowRight") { event.preventDefault(); setSelected((state.selected + 1) % nodes.length); }
      if (event.key === "ArrowLeft") { event.preventDefault(); setSelected((state.selected - 1 + nodes.length) % nodes.length); }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", () => { if (!state.dragging) state.hover = -1; });
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("keydown", onKeyDown);
    select.addEventListener("change", () => setSelected(nodes.findIndex(node => node.id === select.value)));
    formation.addEventListener("input", () => {
      state.formation = clamp(Number(formation.value) / 100, 0, 1);
      formationLabel.textContent = state.formation < 0.04 ? "DISC" : state.formation > 0.96 ? "SPHERE" : `${Math.round(state.formation * 100)}%`;
    });
    rotateToggle.addEventListener("change", () => { state.autoRotate = !!rotateToggle.checked; });
    labelsToggle.addEventListener("change", () => { state.labels = !!labelsToggle.checked; });
    routeButton.addEventListener("click", () => setRoute("resolution"));
    lateralButton.addEventListener("click", () => setRoute("lateral"));
    resetButton.addEventListener("click", () => {
      state.yaw = -0.68; state.pitch = 0.32; state.zoom = 1; state.formation = 1;
      formation.value = "100"; formationLabel.textContent = "SPHERE";
      state.route = null; state.lastRoutePhase = ""; showInspector();
      onClearBeats();
    });

    showInspector();
    schedule();
    return Object.freeze({
      schema: SCHEMA,
      nodes,
      state,
      selectNode(index) { setSelected(index); },
      setVisible(visible) {
        state.visible = !!visible;
        if (state.visible) {
          state.lastFrame = 0;
          schedule();
        } else if (state.animation && typeof cancelAnimationFrame === "function") {
          cancelAnimationFrame(state.animation);
          state.animation = 0;
        }
      },
      destroy() {
        ownerDocument?.removeEventListener("harshalos:characters-beats:status", beatStatusHandler);
        state.destroyed = true;
        if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(state.animation);
        state.animation = 0;
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("wheel", onWheel);
        canvas.removeEventListener("keydown", onKeyDown);
      }
    });
  }

  window.GoodIntelligenceOrb2 = Object.freeze({ SCHEMA, CENTER_ADDRESS, PALETTE, buildNodes, mount, getSavedBeatSessionId });
})();
