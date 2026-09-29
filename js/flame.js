/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Fractal Flame engine (.flame / Apophysix)

   A .flame file is an ANIMATION OF ITERATED FUNCTION SYSTEMS:
   every frame holds a small set of weighted transforms

       p' = T_k(p) = Σᵢ wᵢ · Nᵢ( L(p) )        (Σᵢ wᵢ = 1)

   where L(p) = A·p + t is the exact affine core (the file's six
   coefs) and Nᵢ are Apophysix curve warps, blended convexly over
   the affine image. Points are streamed through the IFS

       p_{j+1} = T_{k_j}(p_j),   k_j ~ geometric(weights)

   and every iteration splats the transform's palette color into an
   accumulation buffer. Final pixel:

       v = (acc / max) · brightness
       F(v) = v < γ_thr ? 0 : 255 · v^(1/γ)

   Parser: lenient — tolerates BOM, CRLF, and malformed tags
   (individual broken frames are skipped, never fatal).

   Environment-agnostic: loads in the main thread OR inside a
   classic Web Worker (js/flame-worker.js does importScripts).
   ═══════════════════════════════════════════════════════════════ */

"use strict";

const FractalFlame = (() => {

  /* ---------- deterministic PRNG (mulberry32) ---------- */
  function mulberry32(seed) {
    let a = seed | 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- .flame parser (lenient) ---------- */
  function parseAttrs(tagStr) {
    const out = {};
    const re = /([\w.-]+)\s*=\s*"([^"]*)"/g;
    let m;
    while ((m = re.exec(tagStr))) out[m[1]] = m[2];
    return out;
  }

  const f = v => { const x = parseFloat(v); return isFinite(x) ? x : NaN; };

  function parsePalette(body, count) {
    const hex = (body || "").replace(/[^0-9a-fA-F]/g, "");
    const pal = new Uint8Array(256 * 3);
    const n = Math.min(count || 256, hex.length / 6);
    for (let i = 0; i < n; i++) {
      pal[i * 3] = parseInt(hex.substr(i * 6, 2), 16);
      pal[i * 3 + 1] = parseInt(hex.substr(i * 6 + 2, 2), 16);
      pal[i * 3 + 2] = parseInt(hex.substr(i * 6 + 4, 2), 16);
    }
    if (n === 0) { // fallback: ice→white ramp, never dark
      for (let i = 0; i < 256; i++) {
        const t = i / 255;
        pal[i * 3] = 40 + 215 * t;
        pal[i * 3 + 1] = 110 + 145 * t;
        pal[i * 3 + 2] = 160 + 95 * t;
      }
    }
    return { pal, n };
  }

  /* attribute → (curve weight | parameter | ignored pipeline stage) */
  function classifyAttrs(attrs, noUnderscoreNames) {
    const curves = [];
    const prm = {};
    for (const name in attrs) {
      if (name === "weight" || name === "color" || name === "opacity" || name === "coefs") continue;
      if (name.indexOf("pre_") === 0 || name.indexOf("post_") === 0) continue; // pipeline stages → fold into linear
      const w = f(attrs[name]);
      if (!isFinite(w)) continue;                       // parameter-like value (e.g. "dcm_iter")
      if (name.indexOf("_") >= 0) {
        // underscore attribute: parameter if it extends a known no-underscore curve name
        let isParam = false;
        for (let i = 1; i < name.length; i++) {
          if (name[i] === "_" && noUnderscoreNames.has(name.slice(0, i))) { isParam = true; break; }
        }
        if (isParam) {
          const at = name.indexOf("_", 1);
          const base = name.slice(0, at);
          const key = name.slice(at + 1);
          (prm[base] = prm[base] || {})[key] = w;
          continue;
        }
        if (!(name in noUnderscoreNames) && !noUnderscoreNames.has(name)) continue; // unknown
      }
      if (w > 0) curves.push({ name, w });
    }
    // convex-blend invariant: renormalize to Σw = 1
    const sum = curves.reduce((a, c) => a + c.w, 0);
    if (sum > 0 && Math.abs(sum - 1) > 1e-3) {
      curves.forEach(c => (c.w /= sum));
    }
    return { curves, prm };
  }

  function parseFlameText(text) {
    const doc = { root: { name: "" }, frames: [], stats: null };
    if (!text) return doc;
    const t = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");

    // root name
    const rootM = t.match(/<flames[^>]*name="([^"]*)"/);
    if (rootM) doc.root.name = rootM[1];

    // frames: each block starts at <flame (exactly) and ends before the next
    const parts = t.split(/<flame\b/);
    for (let p = 1; p < parts.length; p++) {
      const block = parts[p];
      const headEnd = block.indexOf(">");
      if (headEnd < 0) continue;
      const head = parseAttrs(block.slice(0, headEnd + 1));
      const body = block.slice(headEnd + 1);
      const palM = body.match(/<palette[^>]*count="(\d+)"[^>]*>([\s\S]*?)<\/palette>/);
      const { pal, n: palN } = parsePalette(palM ? palM[2] : "", palM ? parseInt(palM[1], 10) : 256);
      if (palN === 0) continue;

      const size = head.size ? head.size.trim().split(/\s+/).map(f) : [1024, 1024];
      const center = head.center ? head.center.trim().split(/\s+/).map(f) : [0, 0];
      const bg = head.background ? head.background.trim().split(/\s+/).map(f) : [0, 0, 0];
      const camera = {
        W: size[0] > 0 ? size[0] : 1024, H: size[1] > 0 ? size[1] : 1024,
        cx: isFinite(center[0]) ? center[0] : 0, cy: isFinite(center[1]) ? center[1] : 0,
        scale: isFinite(f(head.scale)) && f(head.scale) > 0 ? f(head.scale) : 500,
        bg: [bg[0] || 0, bg[1] || 0, bg[2] || 0]
      };

      // pass 1: collect no-underscore attribute names (data-driven curve discovery)
      const noUnderscoreNames = new Set();
      const xformTags = [];
      const xre = /<xform\b[^>]*?\/?>/g;
      let xm;
      while ((xm = xre.exec(body))) {
        xformTags.push(xm[0]);
        const at = parseAttrs(xm[0]);
        for (const k in at) if (k.indexOf("_") < 0) noUnderscoreNames.add(k);
      }

      const xforms = [];
      for (const tag of xformTags) {
        const at = parseAttrs(tag);
        const coefs = at.coefs ? at.coefs.trim().split(/\s+/).map(f) : null;
        if (!coefs || coefs.length < 6 || !coefs.slice(0, 6).every(isFinite)) continue;
        const colorRatio = isFinite(f(at.color)) ? Math.max(0, Math.min(1, f(at.color))) : 0;
        const idx = Math.round(colorRatio * (255)) & 255;
        const { curves, prm } = classifyAttrs(at, noUnderscoreNames);
        xforms.push({
          a: coefs[0], b: coefs[1], c: coefs[2], d: coefs[3], e: coefs[4], f: coefs[5],
          w: isFinite(f(at.weight)) && f(at.weight) > 0 ? f(at.weight) : 1,
          ci3: idx * 3,
          curves, prm
        });
      }
      if (!xforms.length) continue; // unparseable frame → skipped, never fatal

      doc.frames.push({
        name: head.name || ("frame-" + (p - 1)),
        version: head.version || "",
        camera,
        palette: pal,
        xforms,
        brightness: isFinite(f(head.brightness)) ? f(head.brightness) : 4,
        gamma: isFinite(f(head.gamma)) && f(head.gamma) > 0 ? f(head.gamma) : 4,
        gammaThreshold: isFinite(f(head.gamma_threshold)) ? f(head.gamma_threshold) : 0.01
      });
    }

    if (doc.frames.length) {
      const curveNames = {};
      let xMin = Infinity, xMax = 0;
      doc.frames.forEach(fr => {
        xMin = Math.min(xMin, fr.xforms.length);
        xMax = Math.max(xMax, fr.xforms.length);
        fr.xforms.forEach(xf => xf.curves.forEach(c => (curveNames[c.name] = (curveNames[c.name] || 0) + 1)));
      });
      doc.stats = {
        frames: doc.frames.length,
        xformsMin: xMin, xformsMax: xMax,
        curves: curveNames,
        palette: 256,
        versions: [...new Set(doc.frames.map(fr => fr.version).filter(Boolean))]
      };
    }
    return doc;
  }

  /* ---------- curve library (canonical Apophysix warps) ----------
     Each: (x, y, prm) → [x', y'].  Curves not listed here are folded
     into the affine term (identity) — their weight still participates
     in the convex blend, so the IFS stays exactly as weighted. */
  const CURVES = {
    linear: (x, y) => [x, y],
    /* (x,y) → (r, θ) — the coordinate map behind classic polar swirls */
    polar: (x, y) => {
      const r = Math.hypot(x, y), th = Math.atan2(y, x);
      return [r, th];
    },
    unpolar: (x, y) => [x * Math.cos(y), x * Math.sin(y)],
    /* z² projected onto the unit circle — the julian circle map */
    julian: (x, y, p) => {
      const d = p && isFinite(p.julian_dist) ? p.julian_dist : 0;
      const zy = y - d;
      const wx = x * x - zy * zy, wy = 2 * x * zy;
      const m = Math.hypot(wx, wy);
      return m < 1e-9 ? [0, 0] : [wx / m, wy / m];
    },
    /* θ ← θ + k·r — radius-proportional swirl */
    spiral: (x, y) => {
      const r = Math.hypot(x, y), th = Math.atan2(y, x) + 1.6 * r;
      return [r * Math.cos(th), r * Math.sin(th)];
    },
    whorl: (x, y) => {
      const r = Math.hypot(x, y), th = Math.atan2(y, x) + 1.2 / (0.3 + r);
      return [r * Math.cos(th), r * Math.sin(th)];
    },
    curl: (x, y, p) => {
      const k = p && isFinite(p.c1) ? p.c1 : 2;
      const r = Math.hypot(x, y), th = Math.atan2(y, x) + k / (1 + r);
      return [r * Math.cos(th), r * Math.sin(th)];
    },
    /* angular ripple r ← r(1 + v·sin 6θ) */
    rings2: (x, y, p) => {
      const v = p && isFinite(p.rings2_val) ? p.rings2_val : 0.5;
      const r = Math.hypot(x, y), th = Math.atan2(y, x);
      const rr = r * (1 + v * Math.sin(6 * th));
      return [rr * Math.cos(th), rr * Math.sin(th)];
    },
    /* x ← x + ε·sin 2πy */
    sinusoidal: (x, y) => [x + 0.32 * Math.sin(6.283185307179586 * y), y],
    /* p ← p / √(1+|p|²) — bounded spherical falloff */
    spherical: (x, y) => {
      const k = 1 / Math.sqrt(1 + x * x + y * y);
      return [x * k, y * k];
    },
    /* Möbius projection into the unit disc */
    disc: (x, y) => {
      const k = 2 / (1 + x * x + y * y);
      return [x * k, y * k];
    },
    /* complex inversion 1/z */
    hyperbolic: (x, y) => {
      const m2 = x * x + y * y;
      return m2 < 1e-12 ? [0, 0] : [x / m2, -y / m2];
    },
    /* epispiral / epicycloid, n cusps: (n+1)e^{it} − e^{i(n+1)t} */
    epispiral: (x, y, p) => {
      const n = p && isFinite(p.epispiral_n) ? p.epispiral_n : 3;
      const r = Math.hypot(x, y), th = Math.atan2(y, x);
      const k = n + 1, s = 0.6 / k;
      return [s * (k * Math.cos(th) - Math.cos(k * th)), s * (k * Math.sin(th) - Math.sin(k * th))];
    },
    /* symmetric triangle fold (kaleidoscope) with period 2k */
    rectangles: (x, y, p) => {
      const kx = p && isFinite(p.rectangles_x) ? p.rectangles_x : 1;
      const ky = p && isFinite(p.rectangles_y) ? p.rectangles_y : 1;
      const fx = ((x / kx) % 2 + 2) % 2;
      const fy = ((y / ky) % 2 + 2) % 2;
      return [kx * (1 - Math.abs(1 - fx)), ky * (1 - Math.abs(1 - fy))];
    },
    /* soft vertical squash */
    flatten: (x, y) => [x, Math.tanh(y) * 0.9],
    /* bipolar lobe map */
    bipolar: (x, y) => {
      const m2 = x * x + y * y + 0.5;
      return [1.2 * x / m2, 1.2 * y / m2];
    }
  };

  /* resolve a curve name → function (or null → fold into affine) */
  function curveFn(name) {
    return Object.prototype.hasOwnProperty.call(CURVES, name) ? CURVES[name] : null;
  }

  /* ---------- attractor auto-framing ----------
     The file's artist camera tracks Apophysix's own (unresolvable) curve
     semantics, so the site uses a mathematically pure camera instead:
     a deterministic trajectory trace samples the limit set, and the canvas
     maps onto the 2nd–98th percentile core of that sample — robust against
     the escape tails that expansive transforms produce. */
  function quantile(sorted, q) {
    const i = Math.max(0, Math.min(sorted.length - 1, Math.round(q * (sorted.length - 1))));
    return sorted[i];
  }

  function frameCamera(frame, W, H, pad) {
    const xs = frame.xforms;
    const n = xs.length;
    const cum = new Float64Array(n);
    let tot = 0;
    for (let i = 0; i < n; i++) { tot += xs[i].w; cum[i] = tot; }
    const rnd = mulberry32(424242);
    const PX = [], PY = [];
    for (let s = 0; s < 800; s++) {
      let x = (rnd() * 2 - 1) * 1.8, y = (rnd() * 2 - 1) * 1.8;
      for (let it = 0; it < 24; it++) {
        const r = rnd() * tot;
        let k = 0;
        while (k < n - 1 && r > cum[k]) k++;
        const xf = xs[k];
        const ax = xf.a * x + xf.b * y + xf.c;
        const ay = xf.d * x + xf.e * y + xf.f;
        let nx = ax, ny = ay;
        const cw = xf._cw || (xf._cw = xf.curves.map(c => ({ fn: curveFn(c.name), w: c.w, name: c.name })));
        if (cw.length) {
          nx = 0; ny = 0;
          for (let j = 0; j < cw.length; j++) {
            const c = cw[j];
            if (c.fn) { const out = c.fn(ax, ay, xf.prm[c.name]); nx += c.w * out[0]; ny += c.w * out[1]; }
            else { nx += c.w * ax; ny += c.w * ay; }
          }
        }
        x = nx; y = ny;
        if (it < 8 || x !== x || y !== y || x > 1e3 || x < -1e3 || y > 1e3 || y < -1e3) continue;
        PX.push(x); PY.push(y);
      }
    }
    if (PX.length < 64) return { cx: 0, cy: 0, S: (W / 2) / 0.5, span: 0.5, degenerate: true };
    PX.sort((a, b) => a - b);
    PY.sort((a, b) => a - b);
    const x0 = quantile(PX, 0.02), x1 = quantile(PX, 0.98);
    const y0 = quantile(PY, 0.02), y1 = quantile(PY, 0.98);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    let span = Math.max(x1 - x0, y1 - y0);
    if (!(span > 1e-4)) span = 0.5;
    const S = (W / 2) / ((span / 2) * pad);   // uniform scale — core spans 1/pad of the canvas
    return { cx, cy, S, span };
  }

  /* ---------- IFS bake ---------- */
  function bakeFrame(frame, o = {}) {
    const W = o.w || 160, H = o.h || 160;
    const acc = new Float32Array(W * H * 3);
    const xs = frame.xforms;
    const n = xs.length;
    if (!n) return null;

    // precompute per-xform dispatch
    const cum = new Float64Array(n);
    let tot = 0;
    for (let i = 0; i < n; i++) {
      const xf = xs[i];
      xf._cw = xf.curves.map(c => ({ fn: curveFn(c.name), w: c.w, name: c.name }));
      tot += xf.w;
      cum[i] = tot;
    }

    const fc = frameCamera(frame, W, H, o.pad || 1.7);
    const sX = fc.S, sY = fc.S;
    const W2 = W / 2, H2 = H / 2, cx = fc.cx, cy = fc.cy;
    const pal = frame.palette;
    const rnd = mulberry32(o.seed != null ? o.seed : 7919);
    const P = o.points || 45000, M = o.iters || 24, WARM = o.warm || 8;

    for (let s = 0; s < P; s++) {
      let x = (rnd() * 2 - 1) * 1.8;
      let y = (rnd() * 2 - 1) * 1.8;
      for (let it = 0; it < M; it++) {
        const r = rnd() * tot;
        let k = 0;
        while (k < n - 1 && r > cum[k]) k++;
        const xf = xs[k];
        const ax = xf.a * x + xf.b * y + xf.c;
        const ay = xf.d * x + xf.e * y + xf.f;
        let nx = ax, ny = ay;
        const cw = xf._cw;
        if (cw.length) {
          nx = 0; ny = 0;
          for (let j = 0; j < cw.length; j++) {
            const c = cw[j];
            if (c.fn) {
              const out = c.fn(ax, ay, xf.prm[c.name]);
              nx += c.w * out[0];
              ny += c.w * out[1];
            } else { nx += c.w * ax; ny += c.w * ay; }
          }
        }
        x = nx; y = ny;
        if (x !== x || y !== y || x > 1e4 || x < -1e4 || y > 1e4 || y < -1e4) {
          x = (rnd() * 2 - 1) * 1.8;   // diverged → respawn (classic IFS escape guard)
          y = (rnd() * 2 - 1) * 1.8;
          continue;
        }
        if (it < WARM) continue;        // warmup — only the converged limit set is drawn
        const px = (x - cx) * sX + W2;
        const py = (y - cy) * sY + H2;
        const ci = xf.ci3;
        const cr = pal[ci], cg = pal[ci + 1], cb = pal[ci + 2];
        // 3x3 soft draw — the classic Apophysis falloff (4 2 1 / 2 8 2 / 1 2 1 over 16)
        for (let dy = -1; dy <= 1; dy++) {
          const row = (py + dy) | 0;
          if (row < 0 || row >= H) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const col = (px + dx) | 0;
            if (col < 0 || col >= W) continue;
            const wgt = (dx === 0 ? (dy === 0 ? 4 : 2) : (dy === 0 ? 2 : 1)) / 16;
            const o3 = (row * W + col) * 3;
            acc[o3] += cr * wgt;
            acc[o3 + 1] += cg * wgt;
            acc[o3 + 2] += cb * wgt;
          }
        }
      }
    }

    /* ---------- finalize: normalize · brightness · gamma · threshold ---------- */
    let m = 0;
    for (let i = 0; i < acc.length; i += 3) {
      const v = acc[i] > acc[i + 1] ? (acc[i] > acc[i + 2] ? acc[i] : acc[i + 2])
        : (acc[i + 1] > acc[i + 2] ? acc[i + 1] : acc[i + 2]);
      if (v > m) m = v;
    }
    if (m <= 0) m = 1;
    const B = frame.brightness, G = 1 / frame.gamma, TH = frame.gammaThreshold;
    const invM = 1 / m;
    const out = new Uint8ClampedArray(W * H * 4);
    for (let p = 0, i = 0; i < W * H * 3; p += 4, i += 3) {
      let rr = acc[i] * invM * B;
      let gg = acc[i + 1] * invM * B;
      let bb = acc[i + 2] * invM * B;
      let cr = rr <= TH ? 0 : 255 * Math.pow(rr, G);
      let cg = gg <= TH ? 0 : 255 * Math.pow(gg, G);
      let cb = bb <= TH ? 0 : 255 * Math.pow(bb, G);
      out[p] = cr; out[p + 1] = cg; out[p + 2] = cb;
      out[p + 3] = cr > cg ? (cr > cb ? cr : cb) : (cg > cb ? cg : cb); // self-alpha for additive compositing
    }
    return out;
  }

  /* ---------- player (main thread only) ---------- */
  function yieldToUI() {
    return new Promise(r => setTimeout(r, 0));
  }

  class FlamePlayer {
    constructor(url, opts = {}) {
      this.url = url;
      this.opts = opts;
      this.frames = [];          // HTMLCanvasElement[]
      this.ready = false;
      this.playing = true;
      this.speed = 1;
      this.fps = 24;
      this.current = 0;
      this.meta = null;
      this.baking = false;
      this.onprogress = null;
      this.onerror = null;
      this._t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
      this._playingAt = this._t0;
      this._started = false;
    }

    _now() {
      return (typeof performance !== "undefined" ? performance.now() : Date.now());
    }

    start() {
      if (!this._started) {
        this._started = true;
        this.load().catch(e => {
          if (typeof console !== "undefined") console.error("[FractalFlame] load failed for", this.url, "—", e && e.message, e);
          if (this.onerror) this.onerror(e);
        });
      }
      return this;
    }

    /* re-arm after a failed load (fetch 404, bake error, …) */
    retry() {
      this._started = false;
      this.ready = false;
      this.baking = false;
      this.frames = [];
      this.current = 0;
      return this.start();
    }

    async loadText(text) {
      const doc = parseFlameText(text);
      if (!doc.frames.length) throw new Error("no parseable frames in .flame (file empty or not a .flame document)");
      this.meta = doc.stats;
      this.palette = doc.frames.length ? doc.frames[0].palette : null; // 256×3 Uint8Array, file's first palette
      this.doc = doc;                     // full parse — per-frame metadata for readouts
      this.baking = true;
      this.mode = "bake";

      // Fast path: if pre-rendered slices are available (e.g. assets/flame/f000.png … f119.png),
      // load slices instantly to avoid lag, CPU burn, and worker thread contention.
      const isDemo = (this.url && this.url.indexOf("Demo.flame") >= 0) ||
                     (doc.stats && doc.stats.frames === 120 && text.indexOf('name="Demo"') >= 0);
      if (isDemo && typeof Image !== "undefined") {
        try {
          this.mode = "preload";
          const slices = await this._loadPreRenderedSlices(doc.frames.length);
          if (slices && slices.length === doc.frames.length) {
            this.frames = slices;
            this.ready = true;
            this.baking = false;
            this.current = 0;
            this._playingAt = this._now();
            return doc;
          }
        } catch (_) {
          /* fallback to real-time bake */
          this.mode = "bake";
        }
      }

      let res;
      if (typeof Worker !== "undefined") {
        try { res = await this._bakeWithWorker(text, doc); }
        catch (e) {
          if (typeof console !== "undefined") console.warn("[FractalFlame] worker bake failed (" + (e && e.message) + ") — baking inline");
          res = await this._bakeInline(doc, e && e.message);
        }
      } else {
        res = await this._bakeInline(doc, "no Worker");
      }
      this.frames = res.frames;
      if (!this.frames.length) {
        this.baking = false;
        throw new Error("bake produced no frames — every frame in the file was empty or skipped");
      }
      this.ready = true;
      this.baking = false;
      this.current = 0;
      this._playingAt = this._now();
      return doc;
    }

    async _loadPreRenderedSlices(count) {
      let basePath = "assets/flame/f";
      if (this.url && typeof this.url === "string") {
        const clean = this.url.split("?")[0].split("#")[0];
        const idx = clean.lastIndexOf("/");
        if (idx >= 0) {
          basePath = clean.substring(0, idx) + "/flame/f";
        }
      }
      const ext = ".png";
      const imgs = new Array(count);
      let loaded = 0;
      return new Promise((resolve, reject) => {
        let failed = false;
        for (let i = 0; i < count; i++) {
          const img = new Image();
          img.decoding = "async";
          imgs[i] = img;
          img.onload = () => {
            if (failed) return;
            loaded++;
            if (this.onprogress) this.onprogress(loaded, count);
            if (loaded === count) resolve(imgs);
          };
          img.onerror = () => {
            if (!failed) {
              failed = true;
              reject(new Error("failed loading slice " + i));
            }
          };
          img.src = basePath + String(i).padStart(3, "0") + ext;
          try { img.decode().catch(() => {}); } catch (_) {}
        }
      });
    }

    async load() {
      if (typeof fetch !== "function") throw new Error("fetch unavailable");
      const r = await fetch(this.url, { cache: "force-cache" });
      if (!r.ok) throw new Error("HTTP " + r.status + " loading " + this.url);
      return this.loadText(await r.text());
    }

    async _bakeWithWorker(text, doc) {
      const W = this.opts.w || 160, H = this.opts.h || 160;
      const frames = await new Promise((resolve, reject) => {
        let wk;
        try { wk = new Worker("js/flame-worker.js?v=" + VERSION); }
        catch (e) { reject(e); return; }
        const bags = new Array(doc.frames.length).fill(null);
        const to = setTimeout(() => { try { wk.terminate(); } catch (_) {} reject(new Error("bake timeout")); }, 180000);
        wk.onerror = e => { clearTimeout(to); try { wk.terminate(); } catch (_) {} reject(new Error("worker error")); };
        wk.onmessage = e => {
          const m = e.data;
          if (m.type === "frame") {
            bags[m.index] = m.buf;
            if (this.onprogress) this.onprogress(m.index + 1, m.total);
          } else if (m.type === "done") {
            clearTimeout(to);
            try { wk.terminate(); } catch (_) {}
            const skipped = bags.filter(b => !b).length;
            if (skipped && typeof console !== "undefined") console.warn("[FractalFlame] worker skipped " + skipped + "/" + bags.length + " frames (empty xform sets)");
            resolve(bags);
          } else if (m.type === "error") {
            clearTimeout(to);
            try { wk.terminate(); } catch (_) {}
            reject(new Error(m.msg));
          }
        };
        wk.postMessage({ type: "bake", text, opts: { w: W, h: H, points: this.opts.points, iters: this.opts.iters, seed: this.opts.seed } });
      });
      return { frames: this._canvases(frames, W, H) };
    }

    async _bakeInline(doc, reason) {
      const W = this.opts.w || 160, H = this.opts.h || 160;
      const frames = new Array(doc.frames.length);
      for (let i = 0; i < doc.frames.length; i++) {
        frames[i] = bakeFrame(doc.frames[i], { w: W, h: H, points: this.opts.points, iters: this.opts.iters, seed: (this.opts.seed != null ? this.opts.seed : 7919) + i });
        if (this.onprogress) this.onprogress(i + 1, doc.frames.length);
        await yieldToUI();
      }
      return { frames: this._canvases(frames, W, H) };
    }

    _canvases(buffers, W, H) {
      const out = [];
      const need = W * H * 4;
      let litTotal = 0;
      for (const raw of buffers) {
        if (!raw) continue;
        // normalize: workers may deliver ArrayBuffer (legacy) or a view
        let buf = raw;
        if (typeof ArrayBuffer !== "undefined" && buf instanceof ArrayBuffer) buf = new Uint8ClampedArray(buf);
        if (!ArrayBuffer.isView(buf) || buf.length !== need) {
          throw new Error("bake frame buffer malformed (got " + (buf.length !== undefined ? buf.length : "ArrayBuffer") + ", need " + need + ")");
        }
        for (let i = 0; i < need; i += 4) litTotal |= buf[i] | buf[i + 1] | buf[i + 2];
        const c = (typeof document !== "undefined")
          ? document.createElement("canvas")
          : null;
        let img;
        if (c) {
          c.width = W; c.height = H;
          const ctx = c.getContext("2d");
          const id = ctx.createImageData(W, H);
          id.data.set(buf);
          ctx.putImageData(id, 0, 0);
          img = c;
        } else {
          img = buf;
        }
        out.push(img);
      }
      if (litTotal === 0) {
        throw new Error("bake verification failed: every frame is pure black — the render pipeline produced no pixels (see console)");
      }
      return out;
    }

    seek(i) {
      if (!this.frames.length) return;
      this.current = Math.max(0, Math.min(this.frames.length - 0.001, i));
      this._playingAt = this._now() - (this.current / this.fps) * 1000 / this.speed;
    }

    pause() {
      if (!this.playing) return;
      this.playing = false;
      this._pausedAt = this._now();
    }

    resume() {
      if (this.playing) return;
      this.playing = true;
      if (this._pausedAt) this._playingAt += this._now() - this._pausedAt;
      this._pausedAt = 0;
    }

    toggle() { this.playing ? this.pause() : this.resume(); return this.playing; }

    /* compute dynamic flame harmonic energy and phase for component modulation */
    flameModulation() {
      if (!this.ready || !this.frames.length) {
        return { energy: 0.5, pulse: 0, phase: 0, speedMult: 1, active: false };
      }
      const len = this.frames.length;
      let cur = this.current;
      if (this.playing) {
        const t = ((this._now() - this._playingAt) / 1000) * this.speed * this.fps;
        cur = (this.current + (t % len)) % len;
      }
      const phase = (cur / len) * Math.PI * 2;
      const energy = 0.5 + 0.5 * Math.sin(phase);
      const pulse = Math.cos(phase * 2);
      const speedMult = 0.8 + 0.4 * Math.sin(phase * 0.5);
      return { energy, pulse, phase, speedMult, active: true };
    }
       Uses additive compositing — safe over any dark background. */
    drawOn(ctx, cx, cy, size, alpha = 1) {
      if (!this.ready || !this.frames.length) return false;
      const len = this.frames.length;
      let cur;
      if (this.playing) {
        const t = ((this._now() - this._playingAt) / 1000) * this.speed * this.fps;
        cur = this.current + (t % len);
      } else {
        cur = this.current;
      }
      cur = ((cur % len) + len) % len;
      this.current = cur;
      const i0 = cur | 0, i1 = (i0 + 1) % len, frac = cur - i0;
      const a = Math.max(0.02, Math.min(1, alpha));
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = a;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.frames[i0], cx - size / 2, cy - size / 2, size, size);
      if (frac > 0.004) {
        ctx.globalAlpha = a * frac;
        ctx.drawImage(this.frames[i1], cx - size / 2, cy - size / 2, size, size);
      }
      ctx.restore();
      return true;
    }
  }

  /* ---------- shared singleton (orb core + flame app share one bake) ---------- */
  let _shared = null;
  /* bumped on every change to the worker/bake protocol — cache-busts the
     worker script + engine in the browser (static site, no build step) */
  const VERSION = "1.1";

  function shared(url, opts) {
    if (!_shared) _shared = new FlamePlayer(url || "assets/Demo.flame", opts || {});
    return _shared;
  }

  const api = {
    parseFlameText,
    bakeFrame,
    curveFn,
    curves: Object.keys(CURVES),
    FlamePlayer,
    shared,
    VERSION
  };

  self.FractalFlame = api;
  if (typeof window !== "undefined") window.FractalFlame = api;
  return api;
})();
