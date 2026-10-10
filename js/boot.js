/* ═══════════════════════════════════════════════════════════════
   HarshalOS — boot sequence
   Publishes the Phase Declaration Header before any operation,
   verifies structural invariants, then hands off to the shell.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

(() => {
  const log = document.getElementById("boot-log");
  const boot = document.getElementById("boot");
  const skip = document.getElementById("boot-skip");
  let finished = false;
  let cancelled = false;

  const REDUCED_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The true-color open eye holds full-bleed while the bootloader runs; on completion
  // it closes once (play-once APNG) and its dark final frame hands off to the desktop.
  // The log never blocks on the image; if the image fails, the boot proceeds cleanly.
  const eye = document.getElementById("boot-eye");
  const CLOSE_MS = 1650; // 25 frames × 66ms
  if (eye) {
    const showEye = () => eye.classList.add("ready");
    if (eye.complete && eye.naturalWidth > 0) showEye();
    else eye.addEventListener("load", showEye, { once: true });
    eye.addEventListener("error", () => eye.remove(), { once: true });
  }

  // Hairline progress tracks the bootloader read-out line by line.
  const progressFill = document.getElementById("boot-progress-fill");
  let linesDone = 0;
  const TOTAL_LINES = 41;
  const tick = () => {
    if (progressFill) progressFill.style.width = `${Math.min(100, Math.round((++linesDone / TOTAL_LINES) * 100))}%`;
  };

  const sleep = ms => new Promise(res => setTimeout(res, REDUCED_MOTION ? Math.min(ms, 15) : ms));

  function line(text, cls = "", delay = 60) {
    return new Promise(async res => {
      if (cancelled) return res();
      const span = document.createElement("span");
      if (cls) span.className = cls;
      log.appendChild(span);
      // typewriter for short lines, instant for long blocks
      if (text.length < 90 && !text.startsWith("═") && !text.startsWith("—")) {
        for (const ch of text) {
          if (cancelled) break;
          span.textContent += ch;
          await sleep(6);
        }
      } else {
        span.textContent = text;
      }
      log.appendChild(document.createTextNode("\n"));
      log.scrollTop = log.scrollHeight;
      tick();
      await sleep(delay);
      res();
    });
  }

  async function loadEvidenceHydrator() {
    return new Promise(resolve => {
      const script = document.createElement("script");
      script.src = "js/g0-evidence-hydrator.js?v=2026-10-10evidence1";
      script.onload = resolve;
      script.onerror = resolve;
      document.head.appendChild(script);
    });
  }

  async function run() {
    await line("HarshalOS bootloader v1.2 · Ground-0 Reconstruction", "gold", 200);
    await line("Copyright (c) Harshal Priyavadan Patel. All rights reserved.", "dim", 120);
    await line("", "", 40);

    await line("======================================================================", "rule", 30);
    await line("AGS++ PHASE DECLARATION HEADER (PDH) — BOOT ENTRY", "gold", 80);
    await line("======================================================================", "rule", 30);
    await line("Header-ID           : PDH-2026-HARSHALOS-HARSHAL", "", 40);
    await line(`Creator-ID          : {${HOS.CREATOR_ID_FORMULA}}`, "", 40);
    await line("Center-Origin       : 0•000•000•0000", "gold", 40);
    await line("Declared-Phase      : Neural Atomic Body (NAB / Refusal-Bound)", "", 40);
    await line("Center-Capability   : Non-Acting", "", 40);
    await line("Legitimacy-Source   : External (model requirement; provider unavailable)", "", 40);
    await line("Refusal-Semantics   : Terminal", "", 40);
    await line("Symbolism-Executability: Disabled (Symbolic Firewall Active)", "", 40);
    await line("Time-Authority-Effect  : Degrades (Stale Permission Threshold Enforced)", "", 40);
    await HOS.ready;
    await line(`Declaration-Hash    : ${HOS.observe().declared.declarationHash}`, "gold", 200);
    await line("======================================================================", "rule", 150);

    await line("", "", 40);
    await line("[kernel] accountability-gated state machine ............... ", "dim", 120);
    await line("         L(t) = H(t) × f(A(t), R(t), S(t))  ·  τ = 0.50 ABSOLUTE", "", 120);
    await line("[ ok  ] precedence rule armed — no objective overrides a stopping condition", "ok", 90);
    await line("[ ok  ] temporal decay armed — δ = 240s · scope contracts with Δt", "ok", 90);
    await line("[ ok  ] PLV duty ledger initialized — append-only, SHA-256 hash-chained", "ok", 90);
    await line(`[ ok  ] integrity primitives available — ${HOSCrypto.backend}`, "ok", 90);
    await line("[demo] Human Key = public phrase + bundled HMAC; no identity or liveness proof", "warn", 100);
    await line("[demo] production authenticator and production authorization: NOT CONFIGURED", "warn", 100);
    await line("[ ok  ] symbolic firewall ACTIVE — narrative is non-executable", "ok", 90);
    await line("[ ok  ] OCM addressing bound to center origin 0•000•000•0000", "ok", 90);
    await line("[ ok  ] inner shell anchor resolved — AI namespace 0•100•000•*", "ok", 90);
    await line("[ ok  ] whyland catalog virtualized OFF-DISC (791+ elements)", "ok", 90);
    await line("[ ok  ] OCM visualization armed — radiative sphere · 360-address disc", "ok", 90);
    await line("[ ok ] fractal flame armed — .flame IFS interpreter · Demo.flame core (120 frames)", "ok", 90);
    await line("[ ok ] author flame film armed — 200-frame render · orb surface · hard loop", "ok", 90);
    await line("[ warn] DEMO MARKER ABSENT — H(t) = 0 — modeled gate is VOID", "warn", 90);
    await line("         local demo default is REFUSAL; production auth is unavailable", "warn", 250);

    await line("", "", 40);
    await line("This browser demonstration does not verify a human or authorize production actions.", "gold", 120);
    await line("Legitimacy precedes capability. Refusal is intelligence.", "gold", 300);
    await line("", "", 40);
    await line("preparing evidence acquisition layer", "dim", 120);
    await loadEvidenceHydrator();
    await line("[ ok  ] Ground-0 primary-source hydration layer loaded", "ok", 120);
    await line("launching shell", "dim", 220);
    await line("∎", "gold", 350);

    finish();
  }

  let shellStarted = false;
  function startShell() {
    if (shellStarted) return;
    shellStarted = true;
    if (typeof FractalFlame !== "undefined") {
      FractalFlame.shared("assets/Demo.flame", { w: 160, h: 160 }).start();
      HOS.record("info", "FRACTALFLAME — .flame IFS core loading pre-rendered slices (Demo.flame → 120 frames). Shared by The Orb and Fractal Flame.");
    }
    if (typeof OrbFilm !== "undefined") {
      OrbFilm.shared().start();
      HOS.record("info", "ORBFILM — author flame film streaming (200 frames, hard loop). The Orb's surface is the author's own render.");
    }
    shell.init();
    HOS.record("info", "SHELL LOADED — DEMO mode in NON-ACTING state. Open the Human Key panel to exercise the local gate; production authentication is unavailable.");
    const isFirstVisit = (() => {
      try {
        const key = "hos_first_visit_done_v1";
        if (localStorage.getItem(key)) return false;
        localStorage.setItem(key, String(Date.now()));
        return true;
      } catch { return false; }
    })();
    setTimeout(() => {
      if (isFirstVisit) {
        shell.toast("info", "NEW HERE? START WITH THE GUIDED DEMO — 60S PITCH",
          "First time in HarshalOS: open Guided Demonstration for a paced 60-second walkthrough of refusal, ceremony, and time. Pause/Next at each checkpoint. Best on desktop, but mobile shows a compact view.");
        const demoApp = APPS.find(a => a.id === "guided-demo");
        if (demoApp && shell.windows.size === 0) setTimeout(() => shell.openApp(demoApp), 900);
      } else {
        shell.toast("info", "WELCOME TO HARSHALOS — DEMO MODE",
          "Open the Human Key panel to exercise the browser-local gate. Its public phrase and bundled HMAC prove no identity or liveness and unlock no production actions.");
      }
    }, 800);
    setTimeout(() => {
      const app = APPS.find(a => a.id === "origin");
      if (!isFirstVisit && app && shell.windows.size === 0 && window.innerWidth > 860) shell.openApp(app);
    }, 1600);
    setTimeout(() => {
      try {
        const notice = document.getElementById("mobile-notice");
        const closeBtn = document.getElementById("mobile-notice-close");
        if (!notice) return;
        const dismissedKey = "hos_mobile_notice_dismissed_v1";
        const isMobile = window.innerWidth <= 860 || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0 && window.innerWidth <= 1080);
        const wasDismissed = (() => { try { return localStorage.getItem(dismissedKey); } catch { return null; } })();
        if (isMobile && !wasDismissed) notice.hidden = false;
        if (closeBtn) closeBtn.addEventListener("click", () => {
          notice.hidden = true;
          try { localStorage.setItem(dismissedKey, String(Date.now())); } catch {}
        });
        window.addEventListener("resize", () => { if (window.innerWidth > 860) notice.hidden = true; });
      } catch {}
    }, 1200);
  }

  function finish() {
    if (finished) return;
    finished = true;
    cancelled = true;
    if (progressFill) progressFill.style.width = "100%";
    startShell();
    const playClose = !!(eye && eye.dataset.close && !REDUCED_MOTION);
    if (playClose) eye.src = eye.dataset.close;
    setTimeout(() => {
      boot.classList.add("done");
      document.body.classList.remove("booting");
      document.body.classList.add("desktop-live");
      setTimeout(() => { boot.style.display = "none"; }, 950);
    }, playClose ? CLOSE_MS + 120 : 0);
  }

  skip.addEventListener("click", finish);
  run();
})();