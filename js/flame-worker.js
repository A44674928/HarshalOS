/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Fractal Flame baker (Web Worker)
   Bakes .flame frames off the main thread so the OS shell, HUD,
   and window manager stay perfectly live while art renders.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

importScripts("flame.js");

self.onmessage = e => {
  const msg = e.data || {};
  if (msg.type !== "bake") return;
  const opts = msg.opts || {};
  try {
    const doc = self.FractalFlame.parseFlameText(msg.text);
    if (!doc.frames.length) {
      self.postMessage({ type: "error", msg: "no parseable frames" });
      return;
    }
    const W = opts.w || 160, H = opts.h || 160;
    const base = opts.seed != null ? opts.seed : 7919;
    self.postMessage({ type: "meta", total: doc.frames.length, meta: doc.stats });
    for (let i = 0; i < doc.frames.length; i++) {
      const rgba = self.FractalFlame.bakeFrame(doc.frames[i], {
        w: W, h: H,
        points: opts.points || 45000,
        iters: opts.iters || 24,
        warm: 8,
        pad: 1.25,
        seed: base + i
      });
      if (rgba) {
        // send the VIEW (transfer its buffer) — a raw ArrayBuffer arrives as an
        // ArrayBuffer and TypedArray.set() copies 0 elements from it (silent black frames)
        self.postMessage({ type: "frame", index: i, total: doc.frames.length, buf: rgba }, [rgba.buffer]);
      }
    }
    self.postMessage({ type: "done", frames: doc.frames.length });
  } catch (err) {
    self.postMessage({ type: "error", msg: String((err && err.message) || err) });
  }
};
