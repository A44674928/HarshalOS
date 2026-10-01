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

  // Boot animation — the eye opens as the system wakes.
  // The GIF fades in when its data has landed; the boot log never waits for it.
  const eye = document.getElementById("boot-eye");
  if (eye) {
    const showEye = () => eye.classList.add("ready");
    if (eye.complete && eye.naturalWidth > 0) showEye();
    else eye.addEventListener("load", showEye, { once: true });
    eye.addEventListener("error", () => eye.remove(), { once: true });
  }

  const REDUCED_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
      await sleep(delay);
      res();
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
    await HOS.ready;                                   // genesis PDH SHA-256 digest in hand
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
    await line("launching shell", "dim", 220);
    await line("∎", "gold", 350);

    finish();
  }

  function finish() {
    if (finished) return;
    finished = true;
    cancelled = true;
    boot.classList.add("done");
    document.body.classList.remove("booting");
    document.body.classList.add("desktop-live");
    setTimeout(() => { boot.style.display = "none"; }, 950);
    // kick the shared .flame player so the orb core + flame app are warm on first open
    if (typeof FractalFlame !== "undefined") {
      FractalFlame.shared("assets/Demo.flame", { w: 160, h: 160 }).start();
      HOS.record("info", "FRACTALFLAME — .flame IFS core loading pre-rendered slices (Demo.flame → 120 frames). Shared by The Orb and Fractal Flame.");
    }
    // stream the author's rendered flame film — The Orb's surface skin
    if (typeof OrbFilm !== "undefined") {
      OrbFilm.shared().start();
      HOS.record("info", "ORBFILM — author flame film streaming (200 frames, hard loop). The Orb's surface is the author's own render.");
    }
    shell.init();
    HOS.record("info", "SHELL LOADED — DEMO mode in NON-ACTING state. Open the Human Key panel to exercise the local gate; production authentication is unavailable.");
    // Gentle first-run guidance
    setTimeout(() => {
      shell.toast("info", "WELCOME TO HARSHALOS — DEMO MODE",
        "Open the Human Key panel to exercise the browser-local gate. Its public phrase and bundled HMAC prove no identity or liveness and unlock no production actions.");
    }, 800);
    setTimeout(() => {
      const app = APPS.find(a => a.id === "origin");
      // Never cover an app the visitor has already opened during startup.
      if (app && shell.windows.size === 0 && window.innerWidth > 860) shell.openApp(app);
    }, 1600);
  }

  skip.addEventListener("click", finish);
  run();
})();
