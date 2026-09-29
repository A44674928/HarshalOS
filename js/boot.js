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

  const sleep = ms => new Promise(res => setTimeout(res, ms));

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
    await line("Copyright (c) Harshal Priyavadan Patel (A44674928). All rights reserved.", "dim", 120);
    await line("", "", 40);

    await line("======================================================================", "rule", 30);
    await line("AGS++ PHASE DECLARATION HEADER (PDH) — BOOT ENTRY", "gold", 80);
    await line("======================================================================", "rule", 30);
    await line("Header-ID           : PDH-2026-HARSHALOS-A44674928", "", 40);
    await line("Creator-ID          : {A44674928 + A44674928 + (A44674928)}", "", 40);
    await line("Center-Origin       : 0•000•000•0000", "gold", 40);
    await line("Declared-Phase      : Neural Atomic Body (NAB / Refusal-Bound)", "", 40);
    await line("Center-Capability   : Non-Acting", "", 40);
    await line("Legitimacy-Source   : External (Verified Human Key Required)", "", 40);
    await line("Refusal-Semantics   : Terminal", "", 40);
    await line("Symbolism-Executability: Disabled (Symbolic Firewall Active)", "", 40);
    await line("Time-Authority-Effect  : Degrades (Stale Permission Threshold Enforced)", "", 40);
    await kernel.ready;                                   // genesis PDH SHA-256 digest in hand
    await line(`Declaration-Hash    : ${kernel.state.declared.declarationHash}`, "gold", 200);
    await line("======================================================================", "rule", 150);

    await line("", "", 40);
    await line("[kernel] accountability-gated state machine ............... ", "dim", 120);
    await line("         L(t) = H(t) × f(A(t), R(t), S(t))  ·  τ = 0.50 ABSOLUTE", "", 120);
    await line("[ ok  ] precedence rule armed — no objective overrides a stopping condition", "ok", 90);
    await line("[ ok  ] temporal decay armed — δ = 240s · scope contracts with Δt", "ok", 90);
    await line("[ ok  ] PLV duty ledger initialized — append-only, SHA-256 hash-chained", "ok", 90);
    await line(`[ ok  ] cryptographic schema armed — ${HOSCrypto.backend}`, "ok", 90);
    await line("[ ok  ] symbolic firewall ACTIVE — narrative is non-executable", "ok", 90);
    await line("[ ok  ] OCM addressing bound to center origin 0•000•000•0000", "ok", 90);
    await line("[ ok  ] inner shell anchor resolved — AI namespace 0•100•000•*", "ok", 90);
    await line("[ ok  ] whyland catalog virtualized OFF-DISC (791+ elements)", "ok", 90);
    await line("[ ok  ] OCM visualization armed — radiative sphere · 360-address disc", "ok", 90);
    await line("[ ok  ] fractal flame armed — .flame IFS interpreter · a.flame core (113 frames)", "ok", 90);
    await line("[ warn] HUMAN KEY ABSENT — H(t) = 0 — system is MATHEMATICALLY VOID", "warn", 90);
    await line("         default state of the system is REFUSAL", "warn", 250);

    await line("", "", 40);
    await line("This operating system requires human verification for all critical actions.", "gold", 120);
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
    // kick the shared .flame bake (worker) so the orb core + flame app are warm on first open
    if (typeof FractalFlame !== "undefined") {
      FractalFlame.shared("assets/a.flame", { w: 160, h: 160 }).start();
      kernel.record("info", "FRACTALFLAME — .flame IFS core baking in worker (a.flame → 113 frames). Shared by The Orb and Fractal Flame.");
    }
    shell.init();
    kernel.record("info", "SHELL LOADED — desktop online in NON-ACTING state. Open the Human Key app to attest.");
    // Gentle first-run guidance
    setTimeout(() => {
      shell.toast("info", "WELCOME TO HARSHALOS",
        "The system boots in NON-ACTING state. Open the Human Key app (🔑) to attest and unlock critical actions. Everything else is refusal-bound by design.");
    }, 800);
    setTimeout(() => {
      const app = APPS.find(a => a.id === "origin");
      if (app) shell.openApp(app);
    }, 1600);
  }

  skip.addEventListener("click", finish);
  run();
})();
