/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Orb surface film (js/orb-flame.js)
   The author's own rendered Apophysis animation, wrapped onto The
   Orb's sphere through the same camera that draws the wireframe.

   Source: the "animate" fileset — 202 frames rendered at 1500×1000.
   Frames 0–198 are intact; frame 199 was recovered from its truncated
   PNG (78% true pixels + adjacent-frame fill); frames 200–201 were
   never written to disk (the render died mid-write). Playback is the
   honest maximum: 200 real frames in a hard loop 199 → 0 — one visible
   pulse per cycle. The heartbeat.

   Frames are premultiplied onto black at encode time, so additive
   ("lighter") compositing is mathematically identical to the author's
   alpha channel.

   Wrap math: cell (i, j) of the frame maps to
       longitude λ = 2π·i/NC          (frame column 0 sits at λ = 0,
                                      aligned with node longitudes)
       latitude  φ = π/2 − π·j/NR     (frame middle row rides the
                                      equator — the OCM disc)
   Cells are affine blits between projected grid corners (watertight:
   corners are shared between neighbours), shaded by µ = −z/R (limb
   darkening), drawn into a clipped offscreen disc and composited once
   with "lighter". Brightness is gated by legitimacy exactly like the
   wire-mode core: α = 0.22 + 0.78·L(t).
   ═══════════════════════════════════════════════════════════════ */

"use strict";

(() => {
  const TAU = Math.PI * 2;
  const VERSION = "1.0";

  const CFG = {
    base: "assets/orb/f",       // f000.avif … f199.avif
    ext: ".avif",
    count: 200,                 // 0–198 author frames + recovered 199
    w: 1500, h: 1000,           // native render size
    fps: 12,                    // 200 frames / 12 fps ≈ 16.7 s per loop
    preload: 12,                // ready gate — playback can begin
    concurrent: 4,              // in-flight frame decodes
    alphaMax: 0.9,              // composite cap so overlays stay readable
    grid: [44, 26],             // sphere mesh (longitude, latitude cells)
    gridLOD: [30, 18],          // mesh for small orbs
    lodBelow: 170               // px-radius threshold for the LOD mesh
  };

  /* ─────────────────────────────────────────────────────────────
     Film — loader / clock. 200 frames, hard loop, pure clock:
     frameAt(t) = ⌊t·fps⌋ mod 200 — no drift, no state.
     ───────────────────────────────────────────────────────────── */
  class Film {
    constructor() {
      this.imgs = new Array(CFG.count).fill(null);
      this.loaded = 0;
      this.state = 0;           // 0 idle · 1 loading · 2 ready · 3 dead
      this.onprogress = null;
      this.onready = null;
      this.onerror = null;
      this._q = [];
      this._inflight = 0;
      this._started = false;
    }
    get ready() { return this.state === 2; }
    get dead() { return this.state === 3; }
    get total() { return CFG.count; }

    start() {
      if (this._started) return this;
      this._started = true;
      this.state = 1;
      for (let i = 0; i < CFG.count; i++) this._q.push(i);
      this._pump();
      return this;
    }
    _pump() {
      while (this._inflight < CFG.concurrent && this._q.length) this._load(this._q.shift());
    }
    _done() {
      if (this.state === 1 && this.loaded >= Math.min(CFG.preload, CFG.count)) {
        this.state = 2;
        if (this.onready) this.onready();
      }
    }
    _load(i) {
      const img = new Image();
      img.decoding = "async";
      this.imgs[i] = img;
      this._inflight++;
      img.onload = () => {
        this.loaded++; this._inflight--;
        if (this.onprogress) this.onprogress(this.loaded, CFG.count);
        this._done();
        this._pump();
      };
      img.onerror = () => {
        this._inflight--;
        if (this.state !== 3) {
          this.state = 3;
          if (this.onerror) this.onerror(new Error("frame " + i + " failed (AVIF unsupported or file missing)"));
        }
        this._pump();
      };
      img.src = CFG.base + String(i).padStart(3, "0") + CFG.ext;
      try { img.decode().catch(() => {}); } catch (_) { /* optional */ }
    }

    /* frame index at time tMs — the hard loop. 199 → 0 is the heartbeat. */
    frameAt(tMs) { return Math.floor((tMs / 1000) * CFG.fps) % CFG.count; }

    /* loaded image for index i, falling back to the nearest loaded
       neighbour (the loader stays ahead of the playhead in practice) */
    img(i) {
      i = ((i % CFG.count) + CFG.count) % CFG.count;
      for (let d = 0; d < 8; d++) {
        const a = (i + d) % CFG.count, b = (i - d + CFG.count) % CFG.count;
        const ia = this.imgs[a], ib = this.imgs[b];
        if (ia && ia.complete && ia.naturalWidth > 0) return ia;
        if (ib && ib.complete && ib.naturalWidth > 0) return ib;
      }
      return null;
    }
  }

  /* ─────────────────────────────────────────────────────────────
     Sphere wrap — draws one film frame onto the sphere using the
     caller's own project()/toScreen() (the orb engine's camera), so
     the skin obeys the exact rotation, pitch, zoom and breathing the
     wireframe obeys.
     ───────────────────────────────────────────────────────────── */
  let _off = null, _offKey = 0, _offCtx = null;
  let _px = null, _py = null, _pz = null;   // projected grid scratch

  function drawWrapped(ctx, o) {
    if (typeof document === "undefined") return false;
    const img = o.img;
    if (!img || !img.naturalWidth) return false;
    const dpr = o.dpr || 1;
    const Wd = img.naturalWidth, Hd = img.naturalHeight;

    /* screen radius of the sphere (farthest equator sample from center) */
    let rho = 0;
    for (let k = 0; k < 4; k++) {
      const a = k * TAU / 4;
      const p = o.toScreen(o.project({ x: o.R * Math.cos(a), y: 0, z: o.R * Math.sin(a) }));
      rho = Math.max(rho, Math.hypot(p.x - o.cs.x, p.y - o.cs.y));
    }
    if (rho < 2) return false;

    const useLOD = rho < CFG.lodBelow;
    const NC = useLOD ? CFG.gridLOD[0] : CFG.grid[0];
    const NR = useLOD ? CFG.gridLOD[1] : CFG.grid[1];
    const sw = Wd / NC, sh = Hd / NR;

    /* offscreen disc (cached by pixel size) — 2c × 2c, center at (c, c) */
    const c = Math.ceil(rho + 4);
    const key = Math.max(2, Math.ceil(c * 2 * dpr));
    if (!_off || _offKey !== key) {
      _off = document.createElement("canvas");
      _off.width = key; _off.height = key;
      _offCtx = _off.getContext("2d");
      _offKey = key;
    }
    const g = _offCtx;
    const bx = o.cs.x - c, by = o.cs.y - c;      // offscreen origin in screen space

    /* project the (NC+1)×(NR+1) corner grid once — shared corners make
       the mesh watertight (no cracks between cells) */
    const GW = NC + 1, GH = NR + 1, N = GW * GH;
    if (!_px || _px.length < N) { _px = new Float64Array(N); _py = new Float64Array(N); _pz = new Float64Array(N); }
    for (let j = 0; j < GH; j++) {
      const phi = Math.PI / 2 - (j / NR) * Math.PI;
      const cp = Math.cos(phi), sp = Math.sin(phi);
      const row = j * GW;
      for (let i = 0; i < GW; i++) {
        const lam = (i / NC) * TAU;
        const q = o.project({ x: o.R * cp * Math.cos(lam), y: o.R * sp, z: o.R * cp * Math.sin(lam) });
        const s = o.toScreen(q);
        const idx = row + i;
        _px[idx] = s.x - bx;
        _py[idx] = s.y - by;
        _pz[idx] = q.z;
      }
    }

    /* paint */
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, _off.width, _off.height);
    g.save();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.beginPath();
    g.arc(c, c, rho, 0, TAU);
    g.clip();
    g.imageSmoothingEnabled = true;

    const cull = -(o.R * o.R) / o.fov + 0.3;     // front hemisphere (+ margin, clip trims)
    for (let j = 0; j < NR; j++) {
      const r0 = j * GW, r1 = r0 + GW;
      for (let i = 0; i < NC; i++) {
        const i00 = r0 + i, i10 = r0 + i + 1, i01 = r1 + i;
        const zm = (_pz[i00] + _pz[i10] + _pz[i01] + _pz[i01 + 1]) * 0.25;
        if (zm > cull) continue;                 // back hemisphere
        const mu = Math.max(0, -zm / o.R);       // facing ratio
        const a = (0.18 + 0.82 * Math.pow(mu, 0.7)) * o.alpha;
        if (a < 0.02) continue;
        const x0 = _px[i00], y0 = _py[i00];
        /* affine: (0,0)→corner00 · (sw,0)→corner10 · (0,sh)→corner01 */
        g.setTransform(
          (_px[i10] - x0) / sw * dpr, (_py[i10] - y0) / sw * dpr,
          (_px[i01] - x0) / sh * dpr, (_py[i01] - y0) / sh * dpr,
          x0 * dpr, y0 * dpr
        );
        g.globalAlpha = a;
        g.drawImage(img, i * sw, j * sh, sw, sh, 0, 0, sw, sh);
      }
    }
    g.globalAlpha = 1;
    g.restore();

    /* single additive composite — the fire adds light, never occludes */
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(_off, bx, by, c * 2, c * 2);
    ctx.restore();
    return true;
  }

  /* ---------- shared singleton (the orb and tests use one film) ---------- */
  let _film = null;
  function shared() { if (!_film) _film = new Film(); return _film; }

  self.OrbFilm = {
    VERSION,
    CFG,
    Film,
    shared,
    drawWrapped,
    /* test hook — drop the singleton + offscreen cache */
    reset() { _film = null; _off = null; _offCtx = null; _offKey = 0; }
  };
})();
