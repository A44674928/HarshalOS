/* ═══════════════════════════════════════════════════════════════
   HarshalOS — NEO ORB app (js/apps-neo-orb.js)
   Orb 2 × The Orb, for the browser.

   · The Orb layer — the author's two .flame engines, the same shared players
     The Orb uses: Demo.flame (inner core) and OuterOrb.flame (outer macro
     shells), composited additively; plus the rendered sphere film wrapped
     through the same camera (OrbFilm.drawWrapped).
   · Orb 2 layer — the 52-asset Good Intelligence roster as display-only orbs,
     placed by js/neo-orb-model.js (symbol-hash sector, logarithmic
     market-cap band, berth separation). The roster is a static snapshot, not
     a quote feed: no live beats, no provider call, no route.

   Boundary: display only. NEO ORB reads no kernel, gate, ledger, declaration,
   or personal core. Phase is a display rotation offset chosen by the viewer,
   never a declared state. Nothing here ranks, recommends, or authorizes.
   ═══════════════════════════════════════════════════════════════ */
"use strict";

(() => {
  const TAU = Math.PI * 2;
  const WORLD_R = 2.42;                // The Orb's sphere radius (world units)
  const FOV = 7.2;                     // The Orb's camera constant
  const OMEGA = TAU / 90;              // one revolution per 90 s — The Orb's cadence
  const BREATH_EPS = 0.015;            // The Orb's breathing amplitude
  const BREATH_T = 12;                 // seconds
  const BEAT_EPS = 0.04;               // Orb 2 bounded ±4 % radial motion
  const BEAT_T = 7;                    // seconds per beat, per-node phase offset
  const PHASE_SHIFT = Object.freeze({ NAB: 0, CWO: Math.PI / 3, GSRB: (2 * Math.PI) / 3 });
  const KIND_COLOR = Object.freeze({ structural: "#6fd3ff", field: "#b57cff", interaction: "#5ce6a8" });
  const KIND_NAME = Object.freeze({ structural: "Structural", field: "Field", interaction: "Interaction" });
  const CENTER_COLOR = "#ffd479";
  const BAND_COLOR = "#4a9eff";
  const ORIGIN_ADDRESS = "0•000•000•0000";
  const DEFAULTS = Object.freeze({
    formation: 1,
    axes: Object.freeze({ x: 1.10, y: 0.84, z: 1.18 }),
    berth: 1,
    speed: 1,
    nodeScale: 1,
    phase: "NAB",
    innerOpacity: 0.7,
    outerOpacity: 0.55,
    filmOpacity: 0.45,
    layers: Object.freeze({
      innerFlame: true, outerFlame: true, film: true, orbs: true,
      labels: false, attachments: true, bands: true, beat: true
    })
  });
  /* slider bounds — every dial is clamped on load and on change */
  const RANGES = Object.freeze({
    formation: [0, 1], "axes.x": [0.25, 2], "axes.y": [0.25, 2], "axes.z": [0.25, 2],
    berth: [0, 1], speed: [0, 3], nodeScale: [0.5, 2],
    innerOpacity: [0, 1], outerOpacity: [0, 1], filmOpacity: [0, 1]
  });
  const LAYER_ROWS = Object.freeze([
    ["innerFlame", "Inner flame · Demo.flame"],
    ["outerFlame", "Outer flame · OuterOrb.flame"],
    ["film", "Sphere film · author render"],
    ["orbs", "Orb 2 roster orbs"],
    ["labels", "Ticker labels"],
    ["attachments", "Center attachments"],
    ["bands", "Log bands & meridians"],
    ["beat", "Beat motion (±4 %)"]
  ]);

  const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
  const fmtPct = value => `${Math.round(value * 100)}%`;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch]));

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }

  function model() {
    if (typeof window !== "undefined" && window.NeoOrbModel) return window.NeoOrbModel;
    return (typeof NeoOrbModel !== "undefined") ? NeoOrbModel : null;
  }

  function roster() {
    const r = (typeof window !== "undefined") ? window.GoodIntelligenceMarketRoster : null;
    return r && Array.isArray(r.assets) ? r : null;
  }

  function flameEngines() {
    if (typeof FractalFlame === "undefined") return { inner: null, outer: null };
    return {
      inner: FractalFlame.shared("assets/Demo.flame", { w: 160, h: 160 }),
      outer: FractalFlame.shared("assets/OuterOrb.flame", { w: 160, h: 160 })
    };
  }

  /* Chain — never replace — another consumer's callback on a shared player. */
  function chain(player, key, handler) {
    if (!player) return;
    const previous = player[key];
    player[key] = (...args) => {
      try { handler(...args); } finally { if (typeof previous === "function") previous(...args); }
    };
  }

  function playerStatus(player, label, error) {
    if (!player) return "unavailable — flame engine not loaded";
    if (player.ready && player.frames.length) {
      return `live · ${label} · frame ${Math.floor(player.current) + 1}/${player.frames.length}`;
    }
    if (error) return `unavailable — ${error}`;
    if (player.baking) return "loading…";
    return "waiting…";
  }

  /* ─────────────────────────────────────────────────────────────
     Engine — owns the canvas, the clock, the shape cache, and input.
     ───────────────────────────────────────────────────────────── */
  class NeoOrbEngine {
    constructor(body) {
      this.body = body;
      this.state = cloneDefaults();
      this.state.paused = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.clock = 0;                      // seconds of motion (paused freezes it)
      this.baseYaw = 0;
      this.pitch = 0.32;
      this.drag = null;
      this.selectedId = null;
      this.hoveredId = null;
      this.screenNodes = [];
      this.shape = null;
      this.dirty = true;
      this.lastTick = null;
      this.lastReadout = 0;
      this.stopped = false;
      this.errors = { inner: null, outer: null, film: null };
      this.loadingFilm = null;

      const r = roster();
      this.rosterInfo = r;
      this.nodes = model() && r ? model().rosterNodes(r.assets) : [];
      this.byId = new Map(this.nodes.map(n => [n.id, n]));

      const { inner, outer } = flameEngines();
      this.inner = inner;
      this.outer = outer;
      this.film = (typeof OrbFilm !== "undefined") ? OrbFilm.shared() : null;
      this.wireLoaders();
    }

    /* Load the shared engines without taking their state; we only read them. */
    wireLoaders() {
      if (this.inner) {
        chain(this.inner, "onerror", e => { this.errors.inner = e && e.message ? e.message : "load failed"; });
        if (!this.inner.ready && !this.inner.baking) this.inner.start();
      }
      if (this.outer) {
        chain(this.outer, "onerror", e => { this.errors.outer = e && e.message ? e.message : "load failed"; });
        if (!this.outer.ready && !this.outer.baking) this.outer.start();
      }
      if (this.film) {
        chain(this.film, "onerror", e => { this.errors.film = e && e.message ? e.message : "load failed"; });
        if (!this.film.ready) this.film.start();
      }
    }

    /* ── shape ─────────────────────────────────────────────── */
    currentShape() {
      if (!this.dirty && this.shape) return this.shape;
      const m = model();
      if (!m) { this.shape = null; return null; }
      const s = this.state;
      this.shape = m.makeShape({
        formation: s.formation,
        axes: { x: s.axes.x, y: s.axes.y, z: s.axes.z },
        berthSeparation: s.berth,
        nodes: this.nodes
      });
      this.dirty = false;
      return this.shape;
    }

    set(path, value) {
      const [lo, hi] = RANGES[path] || [0, 1];
      const number = clamp(Number(value), lo, hi);
      if (!Number.isFinite(number)) return;
      const parts = path.split(".");
      if (parts.length === 2) this.state[parts[0]][parts[1]] = number;
      else this.state[path] = number;
      this.dirty = true;
    }

    /* ── camera (The Orb's project / toScreen contract) ─────── */
    yawNow() {
      return this.baseYaw + OMEGA * this.clock + (PHASE_SHIFT[this.state.phase] || 0);
    }

    camera(s, cx, cy) {
      const yaw = this.yawNow();
      const cyw = Math.cos(yaw), syw = Math.sin(yaw);
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      const project = p => {
        const x = p.x * cyw + p.z * syw;
        let z = -p.x * syw + p.z * cyw;
        const y = p.y * cp - z * sp;
        z = p.y * sp + z * cp;
        const k = FOV / (FOV + z);
        return { x: x * k, y: -y * k, k, z };
      };
      const toScreen = q => ({ x: cx + q.x * s, y: cy + q.y * s * 0.92, k: q.k, z: q.z });
      return { project, toScreen };
    }

    /* ── frame ─────────────────────────────────────────────── */
    tick(now) {
      if (this.stopped) return;
      if (!this.body.isConnected) { this.stopped = true; return; }
      const dt = this.lastTick == null ? 0 : clamp((now - this.lastTick) / 1000, 0, 0.1);
      this.lastTick = now;
      if (!this.state.paused) this.clock += dt * this.state.speed;
      this.draw(now);
      if (now - this.lastReadout > 250) { this.lastReadout = now; this.readouts(); }
      requestAnimationFrame(t => this.tick(t));
    }

    /* ── drawing ───────────────────────────────────────────── */
    draw(now) {
      const canvas = this.canvas;
      const ctx = this.ctx;
      if (!canvas || !ctx) return;
      const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (!W || !H) return;
      const pxW = Math.round(W * dpr), pxH = Math.round(H * dpr);
      if (canvas.width !== pxW || canvas.height !== pxH) { canvas.width = pxW; canvas.height = pxH; }

      const s = Math.min(W, H) * 0.18;
      const cx = W / 2, cy = H / 2;
      const st = this.state;
      const L = st.layers;
      const breath = 1 + BREATH_EPS * Math.sin((TAU * this.clock) / BREATH_T);
      const R = WORLD_R * breath;
      const { project, toScreen } = this.camera(s, cx, cy);
      const shape = this.currentShape();
      const m = model();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.6);
      halo.addColorStop(0, "rgba(30,48,92,0.34)");
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, H);

      const Rpx = R * s;
      /* 1 · The Orb's two flame engines, additive behind everything */
      if (L.outerFlame && this.outer && this.outer.ready) {
        this.outer.drawOn(ctx, cx, cy, Rpx * 2.7, st.outerOpacity);
      }
      if (L.innerFlame && this.inner && this.inner.ready) {
        this.inner.drawOn(ctx, cx, cy, Rpx * 1.6, st.innerOpacity);
      }

      /* 2 · sphere film wrapped through the same camera, fading in with formation */
      if (L.film && this.film && this.film.ready && st.formation > 0.02 && typeof OrbFilm !== "undefined") {
        const sample = this.film.sampleAt(now);
        const alpha = st.filmOpacity * st.formation;
        const common = { R, fov: FOV, dpr, project, toScreen, cs: { x: cx, y: cy } };
        if (sample.img0 && sample.frac > 0.001 && sample.img1) {
          OrbFilm.drawWrapped(ctx, { ...common, img: sample.img0, alpha: alpha * Math.cos(sample.frac * Math.PI / 2) });
          OrbFilm.drawWrapped(ctx, { ...common, img: sample.img1, alpha: alpha * Math.sin(sample.frac * Math.PI / 2) });
        } else if (sample.img0) {
          OrbFilm.drawWrapped(ctx, { ...common, img: sample.img0, alpha });
        }
      }

      /* 3 · log bands and meridians — the shell geometry from the model */
      if (shape && m && L.bands) this.drawBands(ctx, shape, m, R, project, toScreen);

      /* 4 · the placed Orb 2 nodes (computed once, shared by spokes and orbs) */
      this.screenNodes = [];
      const placed = shape && L.orbs ? shape.nodes.map(n => {
        const beat = L.beat ? 1 + BEAT_EPS * Math.sin((TAU * this.clock) / BEAT_T + m.identityPhase(n.id)) : 1;
        const p = project(this.worldPoint(n.position, R, beat));
        const q = toScreen(p);
        const r = Math.max(1.8, n.nodeRadius * WORLD_R * s * p.k * 0.55 * st.nodeScale);
        return { n, x: q.x, y: q.y, z: p.z, k: p.k, r, front: p.z < 0 };
      }) : [];

      /* 5 · center origin and direct attachments (The Orb's spokes) */
      const origin = toScreen(project({ x: 0, y: 0, z: 0 }));
      if (placed.length && L.attachments) {
        ctx.save();
        ctx.lineWidth = 1;
        for (const node of placed) {
          ctx.strokeStyle = `rgba(255,212,121,${node.front ? 0.20 : 0.07})`;
          ctx.beginPath();
          ctx.moveTo(origin.x, origin.y);
          ctx.lineTo(node.x, node.y);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.save();
      ctx.fillStyle = CENTER_COLOR;
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, 2.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,212,121,0.55)";
      ctx.font = "9px ui-monospace, Menlo, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText(ORIGIN_ADDRESS, origin.x, origin.y + 14);
      ctx.restore();

      /* 6 · Orb 2 roster orbs, far to near */
      if (placed.length) {
        this.screenNodes = placed;
        placed.sort((a, b) => b.z - a.z);
        for (const node of placed) this.drawOrb(ctx, node, L);
      }

      if (!shape) {
        ctx.save();
        ctx.fillStyle = "rgba(223,233,255,0.7)";
        ctx.font = "12px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("NEO ORB geometry unavailable (js/neo-orb-model.js not loaded)", cx, cy);
        ctx.restore();
      }
    }

    /* Model positions are in unit-sphere space; scale to world units and breathe. */
    worldPoint(position, R, beat) {
      const k = R * beat;
      return { x: position.x * k, y: position.y * k, z: position.z * k };
    }

    drawBands(ctx, shape, m, R, project, toScreen) {
      const st = this.state;
      const maxRadius = shape.radialBands[shape.radialBands.length - 1].radius;
      ctx.save();
      ctx.lineWidth = 1;
      const ringPoints = (radius, samples) => {
        const pts = [];
        for (let j = 0; j <= samples; j++) {
          const lon = (j / samples) * TAU - Math.PI / 2;
          const pos = m.positionFor(radius, lon, 0, st.formation, shape.axes);
          pts.push(toScreen(project(this.worldPoint(pos, R, 1))));
        }
        return pts;
      };
      for (const band of shape.radialBands) {
        const radius = 0.24 + 0.76 * (band.radius / maxRadius);
        const pts = ringPoints(radius, 128);
        ctx.strokeStyle = BAND_COLOR;
        ctx.globalAlpha = 0.10 + 0.04 * (band.index / 5);
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
      }
      ctx.globalAlpha = 0.07;
      for (let mi = 0; mi < 8; mi++) {
        const lon = (mi / 8) * TAU - Math.PI / 2;
        ctx.beginPath();
        for (let j = 0; j <= 48; j++) {
          const lat = (-1 + (2 * j) / 48) * m.LATITUDE_SPREAD;
          const pos = m.positionFor(1, lon, lat, st.formation, shape.axes);
          const q = toScreen(project(this.worldPoint(pos, R, 1)));
          if (j) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    drawOrb(ctx, node, L) {
      const color = KIND_COLOR[node.n.node.kind] || KIND_COLOR.field;
      const alpha = node.front ? 1 : 0.32;
      const selected = node.n.id === this.selectedId;
      const hovered = node.n.id === this.hoveredId;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.r * 3.2);
      glow.addColorStop(0, hexAlpha(color, 0.42 * alpha));
      glow.addColorStop(1, hexAlpha(color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r * 3.2, 0, TAU);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, TAU);
      ctx.fill();
      if (selected || hovered) {
        ctx.strokeStyle = selected ? "#ffffff" : "#9fe9ff";
        ctx.lineWidth = selected ? 1.6 : 1;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r + (selected ? 4 : 3), 0, TAU);
        ctx.stroke();
      }
      if ((L.labels || selected || hovered) && (node.front || selected)) {
        ctx.fillStyle = "rgba(232,241,255,0.92)";
        ctx.font = "600 10px ui-monospace, Menlo, Consolas, monospace";
        ctx.textAlign = "left";
        ctx.fillText(node.n.id, node.x + node.r + 5, node.y + 3);
      }
      ctx.restore();
    }

    /* ── input ─────────────────────────────────────────────── */
    hit(x, y) {
      let best = null;
      let bestScore = Infinity;
      for (const node of this.screenNodes) {
        const d = Math.hypot(node.x - x, node.y - y);
        const reach = Math.max(9, node.r + 5);
        if (d > reach) continue;
        const score = d - (node.front ? 6 : 0);
        if (score < bestScore) { bestScore = score; best = node; }
      }
      return best;
    }

    bindInput() {
      const canvas = this.canvas;
      const pos = ev => {
        const rect = canvas.getBoundingClientRect();
        return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      };
      canvas.addEventListener("pointerdown", ev => {
        this.drag = { x: ev.clientX, y: ev.clientY, moved: 0 };
        try { canvas.setPointerCapture(ev.pointerId); } catch { /* optional */ }
        canvas.style.cursor = "grabbing";
      });
      canvas.addEventListener("pointermove", ev => {
        if (this.drag) {
          const dx = ev.clientX - this.drag.x, dy = ev.clientY - this.drag.y;
          this.drag.x = ev.clientX; this.drag.y = ev.clientY;
          this.drag.moved += Math.abs(dx) + Math.abs(dy);
          this.baseYaw += dx * 0.006;
          this.pitch = clamp(this.pitch + dy * 0.004, -1.2, 1.2);
          return;
        }
        const p = pos(ev);
        const node = this.hit(p.x, p.y);
        const next = node ? node.n.id : null;
        if (next !== this.hoveredId) this.hoveredId = next;
        canvas.style.cursor = node ? "pointer" : "grab";
      });
      const end = ev => {
        if (!this.drag) return;
        const moved = this.drag.moved;
        this.drag = null;
        canvas.style.cursor = "grab";
        if (moved < 5) {
          const p = pos(ev);
          const node = this.hit(p.x, p.y);
          this.select(node ? node.n.id : null);
        }
      };
      canvas.addEventListener("pointerup", end);
      canvas.addEventListener("pointercancel", () => { this.drag = null; });
      canvas.addEventListener("pointerleave", () => { this.hoveredId = null; });
    }

    select(id) {
      this.selectedId = id && this.byId.has(id) ? id : null;
      this.renderInspector();
      this.syncRosterButtons();
    }

    /* ── DOM ───────────────────────────────────────────────── */
    mount() {
      const b = this.body;
      const rosterHtml = this.nodes.length
        ? this.nodes.map(n => `
            <button type="button" class="neo-roster-item" data-id="${esc(n.id)}" aria-pressed="false">
              <span class="neo-dot" style="background:${KIND_COLOR[n.kind]}"></span>
              <span class="neo-sym">${esc(n.id)}</span>
              <span class="neo-meta">${esc(n.issuerSector)} · ${esc(n.marketCapLabel)}</span>
            </button>`).join("")
        : "<p class=\"neo-muted\">Roster unavailable — the Orb 2 roster snapshot did not load.</p>";
      const layerRows = LAYER_ROWS.map(([key, label]) => `
          <label class="neo-check"><input type="checkbox" data-layer="${key}" ${this.state.layers[key] ? "checked" : ""}> ${esc(label)}</label>`).join("");
      const range = (key, label, min, max, step) => `
          <label class="neo-range"><span>${esc(label)} <output data-out="${key}"></output></span>
            <input type="range" data-key="${key}" min="${min}" max="${max}" step="${step}"></label>`;

      b.innerHTML = `
        <div class="neo-root">
          <div class="neo-head">
            <div class="h1">NEO ORB — The Orb × Orb 2</div>
            <div class="sub">The Orb's two fractal flame engines burn behind the Good Intelligence roster, drawn as display-only orbs on a formable sphere.</div>
          </div>
          <div class="neo-body">
            <div class="neo-stage">
              <canvas class="neo-canvas" role="img" aria-label="NEO ORB display. Use the roster list to inspect each orb."></canvas>
              <div class="neo-stage-bar">
                <button type="button" class="neo-btn" data-action="toggle">${this.state.paused ? "Play" : "Pause"}</button>
                <button type="button" class="neo-btn" data-action="view">Reset view</button>
                <button type="button" class="neo-btn" data-action="shape">Reset shape</button>
                <span class="neo-hint">Drag to rotate · click an orb to inspect</span>
              </div>
            </div>
            <aside class="neo-panel">
              <section class="neo-section">
                <h3>Status</h3>
                <dl class="neo-dl">
                  <dt>Convergence</dt><dd id="neo-conv">—</dd>
                  <dt>Berths</dt><dd id="neo-berth">—</dd>
                  <dt>Inner flame</dt><dd id="neo-inner">—</dd>
                  <dt>Outer flame</dt><dd id="neo-outer">—</dd>
                  <dt>Sphere film</dt><dd id="neo-film">—</dd>
                  <dt>Roster</dt><dd id="neo-roster">—</dd>
                </dl>
              </section>
              <section class="neo-section">
                <h3>Shape</h3>
                ${range("formation", "Formation (disc → sphere)", 0, 1, 0.01)}
                ${range("axes.x", "Axis X", 0.25, 2, 0.01)}
                ${range("axes.y", "Axis Y", 0.25, 2, 0.01)}
                ${range("axes.z", "Axis Z", 0.25, 2, 0.01)}
                ${range("berth", "Berth separation", 0, 1, 0.05)}
                <label class="neo-range"><span>Phase (display rotation only)</span>
                  <select data-key="phase">
                    <option value="NAB">NAB · +0°</option>
                    <option value="CWO">CWO · +60°</option>
                    <option value="GSRB">GSRB · +120°</option>
                  </select></label>
              </section>
              <section class="neo-section">
                <h3>Motion &amp; layers</h3>
                ${range("speed", "Rotation speed", 0, 3, 0.05)}
                ${range("nodeScale", "Orb size", 0.5, 2, 0.05)}
                ${range("innerOpacity", "Inner flame opacity", 0, 1, 0.01)}
                ${range("outerOpacity", "Outer flame opacity", 0, 1, 0.01)}
                ${range("filmOpacity", "Sphere film opacity", 0, 1, 0.01)}
                ${layerRows}
              </section>
              <section class="neo-section">
                <h3>Inspector</h3>
                <div id="neo-inspector" aria-live="polite"></div>
              </section>
              <section class="neo-section">
                <h3>Roster · ${this.nodes.length}</h3>
                <div class="neo-roster" role="list">${rosterHtml}</div>
              </section>
            </aside>
          </div>
          <p class="neo-foot">Display-only geometry. Orb placement uses a symbol hash and a log market-cap band; it is not a price, a rank, a recommendation, or a live quote. The roster is a static snapshot${this.rosterInfo ? ` (${esc(this.rosterInfo.asOf)}, ${esc(this.rosterInfo.source)})` : ""}. NEO ORB confers no authority and routes nothing.</p>
        </div>`;

      this.canvas = b.querySelector(".neo-canvas");
      this.ctx = this.canvas.getContext ? this.canvas.getContext("2d") : null;
      this.bindInput();
      this.bindControls();
      this.syncControls();
      this.renderInspector();
      this.readouts();
    }

    bindControls() {
      const b = this.body;
      b.querySelectorAll("input[data-key]").forEach(input => {
        input.addEventListener("input", () => {
          this.set(input.dataset.key, input.value);
          this.syncControls();
        });
      });
      const phase = b.querySelector("select[data-key='phase']");
      if (phase) phase.addEventListener("change", () => {
        this.state.phase = PHASE_SHIFT[phase.value] !== undefined ? phase.value : DEFAULTS.phase;
      });
      b.querySelectorAll("input[data-layer]").forEach(input => {
        input.addEventListener("change", () => { this.state.layers[input.dataset.layer] = input.checked; });
      });
      b.querySelectorAll(".neo-roster-item").forEach(btn => {
        btn.addEventListener("click", () => this.select(btn.dataset.id));
      });
      b.querySelector("[data-action='toggle']").addEventListener("click", ev => {
        this.state.paused = !this.state.paused;
        ev.currentTarget.textContent = this.state.paused ? "Play" : "Pause";
      });
      b.querySelector("[data-action='view']").addEventListener("click", () => {
        this.baseYaw = 0;
        this.pitch = 0.32;
      });
      b.querySelector("[data-action='shape']").addEventListener("click", () => {
        const keepPaused = this.state.paused;
        const layers = { ...this.state.layers };
        this.state = cloneDefaults();
        this.state.paused = keepPaused;
        this.state.layers = layers;
        this.dirty = true;
        this.syncControls();
        this.syncLayerInputs();
        this.body.querySelector("[data-key='phase']").value = this.state.phase;
      });
    }

    syncLayerInputs() {
      this.body.querySelectorAll("input[data-layer]").forEach(input => {
        input.checked = !!this.state.layers[input.dataset.layer];
      });
    }

    syncControls() {
      const b = this.body;
      const values = {
        formation: this.state.formation,
        "axes.x": this.state.axes.x, "axes.y": this.state.axes.y, "axes.z": this.state.axes.z,
        berth: this.state.berth, speed: this.state.speed, nodeScale: this.state.nodeScale,
        innerOpacity: this.state.innerOpacity, outerOpacity: this.state.outerOpacity, filmOpacity: this.state.filmOpacity
      };
      b.querySelectorAll("input[data-key]").forEach(input => {
        const key = input.dataset.key;
        if (key in values && document.activeElement !== input) input.value = String(values[key]);
        const out = b.querySelector(`output[data-out="${key}"]`);
        if (out && key in values) out.textContent = Number(values[key]).toFixed(2);
      });
      const toggle = b.querySelector("[data-action='toggle']");
      if (toggle) toggle.textContent = this.state.paused ? "Play" : "Pause";
    }

    syncRosterButtons() {
      this.body.querySelectorAll(".neo-roster-item").forEach(btn => {
        btn.setAttribute("aria-pressed", String(btn.dataset.id === this.selectedId));
      });
    }

    renderInspector() {
      const el = this.body.querySelector("#neo-inspector");
      if (!el) return;
      const n = this.selectedId ? this.byId.get(this.selectedId) : null;
      if (!n) {
        el.innerHTML = "<p class=\"neo-muted\">Select an orb on the sphere or in the roster list.</p>";
        return;
      }
      const shape = this.shape;
      const placed = shape ? shape.nodes.find(p => p.id === n.id) : null;
      const bandNote = n.marketCapUsd ? `log band ${n.radialBand}` : "log band (no cap)";
      el.innerHTML = `
        <div class="neo-insp-title"><span class="neo-dot" style="background:${KIND_COLOR[n.kind]}"></span>${esc(n.id)} · ${esc(n.name)}</div>
        <dl class="neo-dl">
          <dt>Issuer sector</dt><dd>${esc(n.issuerSector)} · rank ${esc(n.sectorRank)} (snapshot)</dd>
          <dt>Market cap</dt><dd>${esc(n.marketCapLabel)} · ${esc(bandNote)}</dd>
          <dt>Display sector</dt><dd>${String(n.sector).padStart(3, "0")} / 360</dd>
          <dt>Display kind</dt><dd>${esc(KIND_NAME[n.kind] || n.kind)}</dd>
          <dt>Berth</dt><dd>${placed && placed.wasReslotted ? "re-slotted to clear a neighbour" : "source position"}</dd>
          <dt>Stage</dt><dd>${esc(n.marketStage)}</dd>
        </dl>
        <p class="neo-muted">Display-only. Not a quote, rank, or recommendation.</p>`;
    }

    readouts() {
      const b = this.body;
      const put = (id, text) => { const el = b.querySelector(`#${id}`); if (el && el.textContent !== text) el.textContent = text; };
      const shape = this.shape || this.currentShape();
      if (shape) {
        put("neo-conv", `${fmtPct(shape.convergence)} · ${shape.idealSphere ? "ideal sphere" : "spheroid"}`);
        const moved = shape.berthSeparation.movedNodeIds.length;
        put("neo-berth", `${shape.berthSeparation.crowdedNodeCount} crowded · ${moved} re-slotted · floor ${shape.berthSeparation.minimumChordDistance.toFixed(3)}`);
      }
      put("neo-inner", this.errors.inner ? `unavailable — ${this.errors.inner}` : playerStatus(this.inner, "Demo.flame (120f)", null));
      put("neo-outer", this.errors.outer ? `unavailable — ${this.errors.outer}` : playerStatus(this.outer, "OuterOrb.flame (600f @ 24fps)", null));
      if (!this.film) put("neo-film", "unavailable — sphere film not loaded");
      else if (this.errors.film || this.film.dead) put("neo-film", `unavailable — ${this.errors.film || "load failed"}`);
      else if (this.film.ready) put("neo-film", `live · frame ${this.film.frameAt(performance.now()) + 1}/200 · bounce`);
      else put("neo-film", `loading ${this.film.loaded}/${this.film.total}…`);
      put("neo-roster", this.rosterInfo
        ? `${this.nodes.length} display orbs · snapshot ${this.rosterInfo.asOf}`
        : "unavailable");
    }

    start() {
      this.lastTick = null;
      requestAnimationFrame(t => this.tick(t));
    }
  }

  /* #rrggbb + alpha → rgba() */
  function hexAlpha(hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(alpha, 0, 1).toFixed(3)})`;
  }

  function mountNeoOrb(body) {
    const engine = new NeoOrbEngine(body);
    engine.mount();
    engine.start();
    if (typeof window !== "undefined") window.NEO_ORB_ENGINE = engine; /* debug/automation hook, like OCM_ENGINE */
    return engine;
  }

  function registerNeoOrbApp() {
    if (typeof APPS === "undefined") return;
    const app = {
      id: "neo-orb",
      title: "NEO ORB",
      short: "NEO ORB",
      glyph: "✹",
      desc: "Orb 2 × The Orb — roster orbs inside the two flame engines",
      w: 980, h: 720,
      render(body) { mountNeoOrb(body); }
    };
    APPS.push(app);
    const anchor = APPS.findIndex(a => a.id === "orbs");
    const at = APPS.length - 1;
    if (anchor >= 0 && at > anchor + 1) {
      APPS.splice(at, 1);
      APPS.splice(anchor + 1, 0, app);
    }
  }

  if (typeof window !== "undefined") {
    window.NeoOrbApp = Object.freeze({ DEFAULTS, RANGES, KIND_COLOR, PHASE_SHIFT, mountNeoOrb, NeoOrbEngine });
  }
  registerNeoOrbApp();
})();
