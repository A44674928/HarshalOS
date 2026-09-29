/* ============================================================
   HarshalOS · Fractal Flame app
   The .flame engine as a first-class citizen: stage, transport,
   palette, per-frame IFS metadata, and a file-agnostic swap slot.
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

  APPS.push({
    id: "flame",
    title: "Fractal Flame",
    short: "Fractal Flame",
    glyph: "✷",
    desc: "The .flame engine — an IFS interpreter that burns a .flame file at the center of the Orb",
    w: 980, h: 700,
    render(body, api) {
      const canPlay = !!FF;
      body.innerHTML = `
        <div class="h1">Fractal Flame — the .flame engine</div>
        <div class="sub">An <strong>iterated function system</strong>: a finite set of affine maps, each folded by
        named curve warps, applied in random order until points settle onto the attractor. Your art file
        <span class="mono" style="color:var(--text)">a.flame</span> is such a system — 113 animated frames, 256-color
        palettes, per-frame camera. This app renders the file; The Orb burns it as its core.</div>

        ${canPlay ? `
        <div class="ff-grid">
          <div class="ff-stage-wrap">
            <div class="ff-stage">
              <canvas id="ff-canvas"></canvas>
              <div class="ff-bake" id="ff-bake">
                <div class="ff-bake-t">BAKING .FLAME IN WORKER…</div>
                <div class="mono" id="ff-bake-pct">0%</div>
              </div>
            </div>
            <div class="ff-transport">
              <button class="btn btn-gold" id="ff-play">❚❚ PAUSE</button>
              <button class="btn" id="ff-speed" data-s="1">1×</button>
              <span class="mono ff-fnum" id="ff-fnum">frame —/—</span>
            </div>
            <input type="range" id="ff-scrub" min="0" max="112" step="0.01" value="0" style="width:100%">
            <div class="ff-read mono" id="ff-read">xforms — · camera (file metadata) cx 0 · cy 0 · scale 500</div>
            <canvas id="ff-pal" width="512" height="10"></canvas>
            <div class="ff-read">256-COLOR PALETTE (FROM FILE) · SHARED PLAYER — SCRUBBING HERE ALSO DRIVES THE ORB CORE</div>
          </div>

          <div class="ff-side">
            <div class="card"><h4>SOURCE FILE</h4>
              <table class="table" id="ff-meta">
                <tr><td>file</td><td class="mono">assets/a.flame</td></tr>
                <tr><td>frames</td><td class="mono" id="ff-frames">—</td></tr>
                <tr><td>xforms / frame</td><td class="mono" id="ff-xforms">—</td></tr>
                <tr><td>warp names</td><td class="mono" id="ff-curves">—</td></tr>
                <tr><td>palette</td><td class="mono">256 × RGB</td></tr>
                <tr><td>versions</td><td class="mono" id="ff-vers">—</td></tr>
              </table>
            </div>
            <div class="card"><h4>THE MATH</h4>
              <div class="oi-math" style="margin-top:6px">
                <div>next point&nbsp; p′ = Nₖ(Aₖ·p + tₖ),&nbsp; k ~ geometric(w₁…wₙ)</div>
                <div>affine&nbsp; A·p + t = (ax+by+c, dx+ey+f) — coefs from file</div>
                <div>warp&nbsp; Nₖ — named curves (spiral, waves2, spherical…); unknown names fall back to identity</div>
                <div>frame&nbsp; n points × 24 iterations, 8 warmup discarded, 3×3 soft splat</div>
                <div>camera&nbsp; 2nd–98th percentile auto-frame (deterministic trace) — the file's artist camera is metadata only</div>
              </div>
            </div>
            <div class="card"><h4>SWAP FILE — THE ENGINE IS FILE-AGNOSTIC</h4>
              <p class="body" style="margin:0 0 8px">Drop in any .flame (including the private StarPortal pieces) and the engine
              re-bakes it — one bake, two burnings: the stage here <em>and</em> the orb's core. Corrupt or partial frames
              are skipped, never fatal.</p>
              <input type="file" id="ff-file" accept=".flame,.txt" style="width:100%;font-size:11px">
              <div class="ff-read" id="ff-file-status">no file loaded</div>
            </div>
          </div>
        </div>
        <div class="footer-note" style="margin-top:14px">
          ENGINE: HOS FRACTALFLAME v1.0 — IFS INTERPRETER · FILE: a.flame (STARPORTAL · Apo7X-241020 · Api7X-240306 · Apophysis 7x) ·
          THE ORB'S CORE IS THIS SAME SYSTEM, BURNING AT THE ORIGIN, BRIGHTNESS GATED BY LEGITIMACY.
        </div>` : `
        <div class="rule-box">FractalFlame engine not loaded. Check that js/flame.js is present before the app scripts.</div>`}
      `;

      if (!canPlay) return;

      const player = FF.shared("assets/a.flame", { w: 160, h: 160 });
      const stage = body.querySelector("#ff-canvas");
      const bakeEl = body.querySelector("#ff-bake");
      const bakePct = body.querySelector("#ff-bake-pct");
      const playBtn = body.querySelector("#ff-play");
      const speedBtn = body.querySelector("#ff-speed");
      const fnum = body.querySelector("#ff-fnum");
      const scrub = body.querySelector("#ff-scrub");
      const readEl = body.querySelector("#ff-read");
      const palCv = body.querySelector("#ff-pal");

      /* ---- stage sizing (square, dpr-aware) ---- */
      const wrap = body.querySelector(".ff-stage");
      const sctx = stage.getContext("2d");
      const sizeStage = () => {
        const side = Math.min(wrap.clientWidth, wrap.clientHeight);
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        stage.width = Math.round(side * dpr);
        stage.height = Math.round(side * dpr);
        stage.style.width = side + "px";
        stage.style.height = side + "px";
      };
      sizeStage();

      /* ---- transport ---- */
      playBtn.addEventListener("click", () => {
        const on = player.toggle();
        playBtn.textContent = on ? "❚❚ PAUSE" : "▶ PLAY";
      });
      speedBtn.addEventListener("click", () => {
        const s = player.speed;
        const next = s >= 2 ? 0.5 : s * 2;
        player.speed = next;
        speedBtn.dataset.s = next;
        speedBtn.textContent = (next === 0.5 ? "0.5" : next) + "×";
      });
      scrub.addEventListener("input", () => {
        player.seek(parseFloat(scrub.value));
      });

      /* ---- bake progress / meta readout ---- */
      const fillMeta = () => {
        const m = player.meta;
        if (!m) return;
        body.querySelector("#ff-frames").textContent = m.frames;
        body.querySelector("#ff-xforms").textContent = m.xformsMin + "–" + m.xformsMax;
        const cn = Object.keys(m.curves || {}).length;
        body.querySelector("#ff-curves").textContent = cn + " distinct";
        body.querySelector("#ff-vers").textContent = (m.versions || []).join(" · ") || "—";
        scrub.max = String(m.frames - 1);
        paintPalette(palCv, player.palette);
      };
      player.onprogress = (i, total) => {
        if (bakePct) bakePct.textContent = Math.round((i / total) * 100) + "% (" + i + "/" + total + ")";
      };

      /* ---- render loop ---- */
      let raf = 0;
      const draw = () => {
        raf = requestAnimationFrame(draw);
        if (!document.body.contains(stage)) { cancelAnimationFrame(raf); return; } // window closed → stop loop
        const w = stage.width, h = stage.height;
        if (!w || !h) return;
        sctx.setTransform(1, 0, 0, 1, 0, 0);
        sctx.globalCompositeOperation = "source-over";
        sctx.globalAlpha = 1;
        sctx.fillStyle = "#04060d";
        sctx.fillRect(0, 0, w, h);
        if (!player.ready) {
          if (bakeEl) bakeEl.style.display = "flex";
          return;
        }
        if (bakeEl && bakeEl.style.display !== "none") {
          bakeEl.style.display = "none";
          fillMeta();
        }
        const cx = w / 2, cy = h / 2;
        const size = Math.min(w, h) * 0.96;
        player.drawOn(sctx, cx, cy, size, 1);

        /* readouts (throttled) */
        const fi = Math.floor(player.current);
        if (Math.floor(performance.now() / 150) !== draw._t) {
          draw._t = Math.floor(performance.now() / 150);
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

      /* ---- swap file: file-agnostic engine ---- */
      const fileIn = body.querySelector("#ff-file");
      const fileStatus = body.querySelector("#ff-file-status");
      fileIn.addEventListener("change", async () => {
        const f = fileIn.files && fileIn.files[0];
        if (!f) return;
        try {
          fileStatus.textContent = "loading " + f.name + "…";
          const text = await f.text();
          fileStatus.textContent = "baking " + f.name + " (this replaces the stage player)…";
          // private swap player — does not touch the shared orb core
          const p2 = new FF.FlamePlayer(f.name, { w: 160, h: 160 });
          p2.onprogress = (i, total) => { fileStatus.textContent = "baking " + f.name + " — " + i + "/" + total; };
          await p2.loadText(text);
          Object.assign(player, {
            frames: p2.frames, ready: true, current: 0, meta: p2.meta,
            palette: p2.palette, doc: p2.doc, baking: false
          });
          player._playingAt = player._now();
          fillMeta();
          fileStatus.textContent = f.name + " — " + p2.meta.frames + " frames · " +
            (p2.meta.xformsMin + "–" + p2.meta.xformsMax) + " xforms/frame · live on stage";
          if (kernel && kernel.record) kernel.record("info", "FractalFlame — stage file swapped: " + f.name +
            " (" + p2.meta.frames + " frames). Engine is file-agnostic; the orb core still burns assets/a.flame.");
        } catch (e) {
          fileStatus.textContent = "could not bake " + f.name + ": " + (e && e.message ? e.message : e);
        }
      });

      api.onCleanup && api.onCleanup(() => { cancelAnimationFrame(raf); });
    }
  });
})();
