/* ============================================================
   HarshalOS · Fractal Flame apps (Inner and Outer)
   The .flame engine as a first-class citizen: stage, transport,
   palette, per-frame IFS metadata, and file-agnostic swap slot.
   ============================================================ */
(function () {
  "use strict";

  const FF = (typeof FractalFlame !== "undefined") ? FractalFlame : null;

  function formatBytes(n) {
    if (!isFinite(n)) return "—";
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
    return (n / 1048576).toFixed(2) + " MB";
  }

  /* draw a 256-entry palette (Uint8Array 256×3) onto a small strip canvas */
  function paintPalette(canvas, palette) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!palette) return;
    const id = ctx.createImageData(256, 1);
    for (let i = 0; i < 256; i++) {
      id.data[i * 4] = palette[i * 3];
      id.data[i * 4 + 1] = palette[i * 3 + 1];
      id.data[i * 4 + 2] = palette[i * 3 + 2];
      id.data[i * 4 + 3] = 255;
    }
    const tmp = document.createElement("canvas");
    tmp.width = 256; tmp.height = 1;
    tmp.getContext("2d").putImageData(id, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
  }

  function renderFlameView(body, api, opts) {
    const canPlay = !!FF;
    const flameFile = opts.file;
    const appTitle = opts.title;
    const appSubtitle = opts.subtitle;
    const isInner = opts.isInner;
    const prefix = isInner ? "ff" : "ffo";

    body.innerHTML = `
      <div class="h1">${appTitle} — the .flame engine</div>
      <div class="sub">${appSubtitle}</div>

      ${canPlay ? `
      <div class="ff-grid">
        <div class="ff-stage-wrap">
          <div class="ff-stage">
            <canvas id="${prefix}-canvas"></canvas>
            <div class="ff-bake" id="${prefix}-bake">
              <div class="ff-bake-t">BAKING .FLAME IN WORKER…</div>
              <div class="mono" id="${prefix}-bake-pct">0%</div>
            </div>
          </div>
          <div class="ff-transport">
            <button class="btn btn-gold" id="${prefix}-play">❚❚ PAUSE</button>
            <button class="btn" id="${prefix}-speed" data-s="1">1×</button>
            <span class="mono ff-fnum" id="${prefix}-fnum">frame —/—</span>
          </div>
          <input type="range" id="${prefix}-scrub" min="0" max="${opts.maxFrames - 1}" step="0.01" value="0" style="width:100%">
          <div class="ff-read mono" id="${prefix}-read">xforms — · camera (file metadata) cx 0 · cy 0 · scale 500</div>
          <canvas id="${prefix}-pal" width="512" height="10"></canvas>
          <div class="ff-read">256-COLOR PALETTE (FROM FILE) · SHARED PLAYER — SCRUBBING HERE ALSO DRIVES THE ORB ·
          ENGINE v${(FF && FF.VERSION) || "?"}</div>
        </div>

        <div class="ff-side">
          <div class="card"><h4>SOURCE FILE</h4>
            <table class="table" id="${prefix}-meta">
              <tr><td>file</td><td class="mono">${flameFile}</td></tr>
              <tr><td>frames</td><td class="mono" id="${prefix}-frames">—</td></tr>
              <tr><td>xforms / frame</td><td class="mono" id="${prefix}-xforms">—</td></tr>
              <tr><td>warp names</td><td class="mono" id="${prefix}-curves">—</td></tr>
              <tr><td>palette</td><td class="mono">256 × RGB</td></tr>
              <tr><td>versions</td><td class="mono" id="${prefix}-vers">—</td></tr>
            </table>
          </div>
          <div class="card"><h4>THE MATH</h4>
            <div class="oi-math" style="margin-top:6px">
              <div>next point&nbsp; p′ = Nₖ(Aₖ·p + tₖ),&nbsp; k ~ geometric(w₁…wₙ)</div>
              <div>affine&nbsp; A·p + t = (ax+by+c, dx+ey+f) — coefs from file</div>
              <div>warp&nbsp; Nₖ — named curves (spherical, spiral, disc, rings2…)</div>
              <div>domain&nbsp; ${isInner ? "AI Inner Shell & Core Attractor (120f)" : "Outer Shells, Moving Blue Orbs & Gold Nodes (600f)"}</div>
              <div>framerate&nbsp; 24 FPS · continuous sub-frame rotational interpolation</div>
            </div>
          </div>
          <div class="card"><h4>SWAP FILE — THE ENGINE IS FILE-AGNOSTIC</h4>
            <p class="body" style="margin:0 0 8px">Drop in any .flame (including custom StarPortal pieces) and the engine
            re-bakes it. One bake, dual burnings: the stage here <em>and</em> The Orb.</p>
            <input type="file" id="${prefix}-file" accept=".flame,.txt" style="width:100%;font-size:11px">
            <div class="ff-read" id="${prefix}-file-status">no file loaded</div>
          </div>
        </div>
      </div>
      <div class="footer-note" style="margin-top:14px">
        ${isInner 
          ? "ENGINE 1: HOS FRACTALFLAME v1.0 — IFS INTERPRETER · FILE: Demo.flame (STARPORTAL · Apophysis 7x) · THE ORB'S CORE IS THIS SAME SYSTEM, BURNING AT THE ORIGIN, BRIGHTNESS GATED BY LEGITIMACY."
          : "ENGINE 2: HOS FRACTALFLAME v1.0 — IFS INTERPRETER · FILE: OuterOrb.flame (STARPORTAL · Apophysis 7x) · THE ORB'S ORBITAL PATTERNS ARE THIS SAME SYSTEM, BURNING AT THE ORIGIN, BRIGHTNESS GATED BY LEGITIMACY."}
      </div>` : `
      <div class="rule-box">FractalFlame engine not loaded. Check that js/flame.js is present before the app scripts.</div>`}
    `;

    if (!canPlay) return;

    const player = FF.shared(flameFile, { w: 160, h: 160 });
    const stage = body.querySelector(`#${prefix}-canvas`);
    const bakeEl = body.querySelector(`#${prefix}-bake`);
    const bakePct = body.querySelector(`#${prefix}-bake-pct`);
    const playBtn = body.querySelector(`#${prefix}-play`);
    const speedBtn = body.querySelector(`#${prefix}-speed`);
    const fnum = body.querySelector(`#${prefix}-fnum`);
    const scrub = body.querySelector(`#${prefix}-scrub`);
    const readEl = body.querySelector(`#${prefix}-read`);
    const palCanvas = body.querySelector(`#${prefix}-pal`);
    const sctx = stage.getContext("2d");

    const wrap = body.querySelector(".ff-stage");
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = wrap.getBoundingClientRect();
      const sz = Math.floor(Math.min(rect.width, rect.height || 420));
      if (sz > 0 && (stage.width !== sz * dpr || stage.height !== sz * dpr)) {
        stage.width = sz * dpr; stage.height = sz * dpr;
        stage.style.width = sz + "px"; stage.style.height = sz + "px";
      }
    };
    fit();
    window.addEventListener("resize", fit);

    const speeds = [0.25, 0.5, 1, 2, 4];
    speedBtn.addEventListener("click", () => {
      const cur = parseFloat(speedBtn.dataset.s) || 1;
      const next = speeds[(speeds.indexOf(cur) + 1) % speeds.length];
      speedBtn.dataset.s = String(next);
      speedBtn.textContent = next + "×";
      player.setSpeed(next);
    });

    playBtn.addEventListener("click", () => {
      const playing = player.toggle();
      playBtn.textContent = playing ? "❚❚ PAUSE" : "▶ PLAY";
      playBtn.classList.toggle("btn-gold", playing);
    });

    scrub.addEventListener("input", () => {
      player.seek(parseFloat(scrub.value));
    });

    player.onprogress = (loaded, total) => {
      if (bakePct) bakePct.textContent = Math.round((loaded / total) * 100) + "%";
    };
    player.onerror = (e) => {
      if (bakeEl) {
        bakeEl.style.display = "flex";
        const t = bakeEl.querySelector(".ff-bake-t");
        if (t) t.textContent = "BAKE FAILED — " + (e && e.message ? e.message : "unknown error");
      }
    };

    let palPainted = false;
    const fillMeta = () => {
      const m = player.meta;
      if (!m) return;
      body.querySelector(`#${prefix}-frames`).textContent = m.frames;
      body.querySelector(`#${prefix}-xforms`).textContent =
        (m.xformsMin === m.xformsMax) ? m.xformsMin : (m.xformsMin + "–" + m.xformsMax);
      body.querySelector(`#${prefix}-curves`).textContent =
        m.curves.length ? m.curves.slice(0, 6).join(", ") + (m.curves.length > 6 ? "…" : "") : "—";
      body.querySelector(`#${prefix}-vers`).textContent = m.versions.join(", ") || "—";
      scrub.max = String(m.frames - 1);
      if (!palPainted && player.palette) {
        paintPalette(palCanvas, player.palette);
        palPainted = true;
      }
    };

    let deadSince = 0;
    const draw = () => {
      if (!document.body.contains(body)) return;
      requestAnimationFrame(draw);
      fit();
      const w = stage.width, h = stage.height;
      if (!w || !h) return;
      sctx.clearRect(0, 0, w, h);

      if (!player.ready) {
        if (player.dead) {
          if (!deadSince) deadSince = performance.now();
          if (bakeEl) {
            bakeEl.style.display = "flex";
            bakeEl.style.cursor = "pointer";
            const t = bakeEl.querySelector(".ff-bake-t");
            const retryIn = Math.max(0, Math.ceil(3 - (performance.now() - deadSince) / 1000));
            if (t) t.textContent = retryIn > 0 ? ("FAILED — RETRY IN " + retryIn + "s (CLICK TO RETRY NOW)") : "CLICK TO RETRY BAKE";
            bakeEl.onclick = () => { deadSince = 0; player.retry(); };
          }
        }
        return;
      }
      deadSince = 0;
      if (bakeEl && bakeEl.style.display !== "none") {
        bakeEl.style.display = "none";
        bakeEl.style.cursor = "";
        fillMeta();
      }
      const cx = w / 2, cy = h / 2;
      const size = Math.min(w, h) * 0.96;
      player.drawOn(sctx, cx, cy, size, 1);

      /* readouts — continuous 1-frame-at-a-time tracking */
      const fi = Math.floor(player.current);
      if (fi !== draw._lastFi) {
        draw._lastFi = fi;
        fnum.textContent = "frame " + (fi + 1) + "/" + player.frames.length;
        if (player.playing) scrub.value = String(player.current);
        const fr = player.doc && player.doc.frames[fi];
        if (fr) {
          const cam = fr.camera || { cx: 0, cy: 0, scale: 500 };
          readEl.textContent = "xforms " + fr.xforms.length +
            " · camera (file metadata) cx " + cam.cx.toFixed(4) +
            " · cy " + cam.cy.toFixed(4) + " · scale " + (isFinite(cam.scale) ? cam.scale.toFixed(1) : "500");
        }
      }
    };

    if (player.ready) { if (bakeEl) bakeEl.style.display = "none"; fillMeta(); }
    player.start();
    draw();

    /* swap file slot */
    const fileIn = body.querySelector(`#${prefix}-file`);
    const fileStatus = body.querySelector(`#${prefix}-file-status`);
    fileIn.addEventListener("change", async () => {
      const f = fileIn.files && fileIn.files[0];
      if (!f) return;
      try {
        fileStatus.textContent = "reading " + f.name + " (" + formatBytes(f.size) + ")…";
        const text = await f.text();
        const p2 = FF.shared(f.name, { w: 160, h: 160 });
        if (bakeEl) {
          bakeEl.style.display = "flex";
          const t = bakeEl.querySelector(".ff-bake-t");
          if (t) t.textContent = "BAKING " + f.name.toUpperCase() + "…";
          if (bakePct) bakePct.textContent = "0%";
        }
        await p2.loadText(text);
        player.doc = p2.doc;
        player.frames = p2.frames;
        player.ready = true;
        player.current = 0;
        player.meta = p2.meta;
        player.palette = p2.palette;
        player._playingAt = player._now();
        if (bakeEl) bakeEl.style.display = "none";
        palPainted = false;
        fillMeta();
        fileStatus.textContent = f.name + " — " + p2.meta.frames + " frames · live on stage";
      } catch (err) {
        fileStatus.textContent = "error: " + ((err && err.message) || err);
      }
    });
  }

  // 1. Flame (Inner) — 120-frame core system
  APPS.push({
    id: "flame",
    title: "Flame (Inner)",
    short: "Flame (Inner)",
    glyph: "✷",
    desc: "Inner .flame engine — 120-frame IFS interpreter driving the AI Inner Shell and core attractor",
    w: 980, h: 700,
    render(body, api) {
      renderFlameView(body, api, {
        file: "assets/Demo.flame",
        title: "Flame (Inner)",
        subtitle: `An <strong>iterated function system</strong>: a finite set of affine maps, each folded by named curve warps, applied in random order until points settle onto the attractor. Your art file <span class="mono" style="color:var(--text)">Demo.flame</span> is such a system — 120 animated frames, 256-color palettes, per-frame camera. This app renders the file; The Orb burns it as its core.`,
        isInner: true,
        maxFrames: 120
      });
    }
  });

  // 2. Flame (Outer) — 600-frame macro-orbital system
  APPS.push({
    id: "flame-outer",
    title: "Flame (Outer)",
    short: "Flame (Outer)",
    glyph: "✵",
    desc: "Outer .flame engine — 600-frame IFS interpreter driving moving blue orbs, outer depth shells, and gold nodes",
    w: 980, h: 700,
    render(body, api) {
      renderFlameView(body, api, {
        file: "assets/OuterOrb.flame",
        title: "Flame (Outer)",
        subtitle: `An <strong>iterated function system</strong>: a finite set of affine maps, each folded by named curve warps, applied in random order until points settle onto the attractor. Your art file <span class="mono" style="color:var(--text)">OuterOrb.flame</span> is such a system — 600 animated frames at 24 FPS, 256-color palettes, per-frame camera. This app renders the file; The Orb's orbital patterns are this same system.`,
        isInner: false,
        maxFrames: 600
      });
    }
  });
})();
