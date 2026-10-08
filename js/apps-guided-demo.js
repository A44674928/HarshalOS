/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Guided Refusal Demonstration
   Executes the scenario in a disposable sandboxed kernel frame.
   Now with paced 60-second pitch: pause/next + narration per checkpoint.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

APPS.push({
  id: "guided-demo",
  title: "Guided Demonstration",
  short: "Guided Demo",
  glyph: "▶",
  desc: "One-button refusal walkthrough in a disposable local kernel",
  w: 760, h: 720,
  render(body, api) {
    const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[character]));
    const stepIds = HOSGuidedDemo.STEP_IDS;
    const labels = [
      "No Human Key → refusal",
      "Human Key present → legitimacy rises",
      "Degraded addressability → refusal",
      "Expired time → refusal",
      "Re-attestation → legitimacy restored",
      "CWO → refusal regardless of legitimacy",
      "GSRB → explicit sovereign override"
    ];
    const narrations = [
      "Default is refusal. With H(t)=0 the gate refuses before any marker exists — legitimacy precedes capability. This is the 60-second pitch, checkpoint 1 of 7.",
      "A public browser-local ceremony sets H(t)=1. L(t)=H(t)×f(A,R,S) rises above τ=0.50, so the demo gate permits. This proves the ceremony works, not that a person was authenticated — it's a local marker only.",
      "We degrade addressability to A(t)=0.25. L(t) falls below τ, so even with H(t)=1 the ordinary gate refuses. Authority contracts with reachability — a key QA invariant.",
      "Time matters. The sandboxed clock runs ×120. When Δt reaches δ=240s, the local marker is stale and the gate refuses. No silent continuation — stale permission never becomes authority.",
      "Re-attestation: a fresh local ceremony restores H(t)=1 and freshness. L(t) returns above τ and the gate permits again. Still a demo marker, not liveness or ongoing presence.",
      "Policy can dominate math. In CWO, the center must not act. Even at high L(t), the gate returns CWO-FORBIDDEN — witness-only by design. Refusal is intelligence.",
      "Collapse changes the rules. In GSRB with L(t)=0, ordinary requests refuse with L-BELOW-TAU. Only explicit sovereignOverride=true bypasses the modeled threshold, and only in this disposable demo. No production action occurs."
    ];
    const local = {
      busy: false,
      status: "ready",
      error: "",
      results: [],
      frame: null,
      listener: null,
      timeout: null,
      current: 0,
      playing: false,
      autoTimer: null
    };

    function clearFrame() {
      if (local.timeout !== null) {
        clearTimeout(local.timeout);
        local.timeout = null;
      }
      if (local.listener) {
        window.removeEventListener("message", local.listener);
        local.listener = null;
      }
      if (local.frame) {
        local.frame.remove();
        local.frame = null;
      }
    }

    function stopAutoPlay() {
      if (local.autoTimer) {
        clearInterval(local.autoTimer);
        local.autoTimer = null;
      }
      local.playing = false;
    }

    function startAutoPlay() {
      stopAutoPlay();
      if (local.results.length === 0) return;
      local.playing = true;
      local.autoTimer = setInterval(() => {
        if (local.current < local.results.length - 1) {
          local.current++;
          draw();
        } else {
          stopAutoPlay();
          draw();
        }
      }, 8000);
    }

    function failRun(code, detail) {
      if (!local.busy) return;
      local.busy = false;
      local.status = "failed";
      local.error = `${code}: ${detail}`;
      stopAutoPlay();
      clearFrame();
      draw();
      api.toast("refusal", "GUIDED DEMO NEEDS REVIEW", local.error);
    }

    function acceptStep(candidate) {
      if (!candidate || typeof candidate !== "object" || candidate.id !== stepIds[local.results.length]) return false;
      const state = candidate.state && typeof candidate.state === "object" ? candidate.state : {};
      const ledger = candidate.ledger && typeof candidate.ledger === "object" ? candidate.ledger : {};
      const normalized = {
        id: candidate.id,
        title: String(candidate.title || labels[local.results.length]).slice(0, 120),
        expected: String(candidate.expected || "").slice(0, 80),
        code: String(candidate.code || "NO-CODE").slice(0, 80),
        secondaryCode: String(candidate.secondaryCode || "").slice(0, 80),
        secondaryLabel: String(candidate.secondaryLabel || "COMPARISON").slice(0, 40),
        permitted: candidate.permitted === true,
        state: {
          H: state.H === 1 ? 1 : 0,
          A: Number.isFinite(state.A) ? state.A : null,
          R: Number.isFinite(state.R) ? state.R : null,
          phase: String(state.phase || "UNKNOWN").slice(0, 12),
          legitimacy: Number.isFinite(state.legitimacy) ? state.legitimacy : null,
          deltaSeconds: Number.isFinite(state.deltaSeconds) ? state.deltaSeconds : null
        },
        details: String(candidate.details || "No details returned.").slice(0, 600),
        ledger: {
          id: Number.isSafeInteger(ledger.id) ? ledger.id : null,
          hash: /^[a-f0-9]{64}$/i.test(String(ledger.hash || "")) ? ledger.hash : "",
          verified: ledger.verified === true
        },
        pass: candidate.pass === true
      };
      local.results.push(normalized);
      // During live run, keep current at latest unless user has paused to inspect earlier
      if (!local.playing && local.results.length === 1) local.current = 0;
      else if (local.busy && !local.playing) local.current = local.results.length - 1;
      return true;
    }

    function onMessage(event) {
      if (!local.frame || event.source !== local.frame.contentWindow) return;
      const message = event.data;
      if (!message || message.schema !== "HOS-GUIDED-REFUSAL-DEMO-1") return;
      if (message.type === "step") {
        if (!acceptStep(message.step)) {
          failRun("OUT-OF-ORDER-STEP", "The isolated runner returned a missing, duplicate, or out-of-order report.");
          return;
        }
        draw();
        return;
      }
      if (message.type === "error") {
        failRun(String(message.code || "RUNNER-ERROR"), String(message.detail || "The isolated scenario did not complete."));
        return;
      }
      if (message.type === "complete") {
        const passed = local.results.length === stepIds.length && local.results.every(step => step.pass);
        const allComplete = message.completed === stepIds.length && message.total === stepIds.length;
        local.busy = false;
        local.status = message.ok === true && passed && allComplete ? "complete" : "failed";
        local.error = local.status === "complete" ? "" : "The runner completed with a missing or failed checkpoint.";
        clearFrame();
        if (local.status === "complete") {
          local.current = 0;
          // Auto-start paced playback to achieve ~60s pitch (7 × 8s = 56s)
          startAutoPlay();
        }
        draw();
        api.toast(
          local.status === "complete" ? "info" : "refusal",
          local.status === "complete" ? "GUIDED REFUSAL DEMO COMPLETE — PACED PLAYBACK READY" : "GUIDED DEMO NEEDS REVIEW",
          `${local.results.filter(step => step.pass).length}/${stepIds.length} checkpoints passed in a disposable kernel. Use Pause/Next to walk the 60-second pitch. The active desktop kernel was not supplied to the scenario.`
        );
      }
    }

    function srcdoc() {
      const scriptBase = new URL("js/", window.location.href).href;
      const scriptFiles = [
        "crypto.js?v=2026-09-30i",
        "data.js?v=2026-09-30j",
        "kernel.js?v=2026-09-30o",
        "guided-demo.js?v=2026-09-30b"
      ];
      const scripts = scriptFiles.map(file => {
        const source = new URL(file, scriptBase).href.replace(/[&<>"']/g, character => ({
          "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[character]));
        return `<script src="${source}"></script>`;
      }).join("\n");
      const scale = Number(HOSGuidedDemo.CLOCK_SCALE);
      return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><title>Local refusal demo</title>
<script>
(() => {
  const NativeDate = Date;
  const realStart = NativeDate.now();
  const scale = ${scale};
  class AcceleratedDate extends NativeDate {
    constructor(...args) { super(...(args.length ? args : [AcceleratedDate.now()])); }
    static now() { return realStart + (NativeDate.now() - realStart) * scale; }
  }
  window.Date = AcceleratedDate;
})();
</script>
${scripts}
<script>
(async () => {
  try {
    await window.HOS.ready;
    const result = await window.HOSGuidedDemo.run(window.HOS, {
      onStep: step => parent.postMessage({ schema: "HOS-GUIDED-REFUSAL-DEMO-1", type: "step", step }, "*"),
      wait: milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
    });
    parent.postMessage({ schema: "HOS-GUIDED-REFUSAL-DEMO-1", type: "complete", ok: result.ok, completed: result.completed, total: result.total }, "*");
  } catch (error) {
    parent.postMessage({ schema: "HOS-GUIDED-REFUSAL-DEMO-1", type: "error", code: error && error.name || "RUNNER-ERROR", detail: error && error.message || String(error) }, "*");
  }
})();
</script></head><body></body></html>`;
    }

    function start() {
      if (local.busy) return;
      stopAutoPlay();
      local.busy = true;
      local.status = "running";
      local.error = "";
      local.results = [];
      local.current = 0;
      draw();

      try {
        const frame = document.createElement("iframe");
        frame.title = "Disposable HarshalOS refusal demonstration kernel";
        frame.setAttribute("sandbox", "allow-scripts");
        frame.setAttribute("aria-hidden", "true");
        frame.setAttribute("referrerpolicy", "no-referrer");
        frame.tabIndex = -1;
        frame.style.display = "none";
        frame.srcdoc = srcdoc();
        local.frame = frame;
        local.listener = onMessage;
        window.addEventListener("message", local.listener);
        local.timeout = setTimeout(() => failRun("DEMO-TIMEOUT", "The isolated kernel did not report completion within 20 seconds."), 20000);
        document.body.appendChild(frame);
      } catch (error) {
        failRun(error && error.name || "FRAME-ERROR", error && error.message || "The sandboxed demo frame could not be created.");
      }
    }

    function draw() {
      const passed = local.results.filter(step => step.pass).length;
      const status = local.busy
        ? `RUNNING · STEP ${Math.min(local.results.length + 1, stepIds.length)}/${stepIds.length} · SANDBOX CLOCK ×${HOSGuidedDemo.CLOCK_SCALE}`
        : local.status === "complete"
          ? `${passed}/${stepIds.length} PASS · COMPLETE · PACED ${local.playing ? "PLAYING" : "PAUSED"} · ${local.current + 1}/${local.results.length}`
          : local.status === "failed"
            ? `${passed}/${stepIds.length} PASS · NEEDS REVIEW`
            : "READY · NO SCENARIO RUN";

      const hasResults = local.results.length > 0;
      const cur = hasResults ? local.results[Math.min(local.current, local.results.length - 1)] : null;
      const curIdx = hasResults ? Math.min(local.current, local.results.length - 1) : 0;
      const narration = narrations[curIdx] || "";

      body.innerHTML = `
        <div class="h1">Guided Refusal Demonstration</div>
        <div class="sub">Your 60-second pitch: seven checkpoints, one sentence of narration each. Runs the real local HOS kernel API in a fresh, disposable browser frame.</div>
        <div class="rule-box refusal"><strong>LOCAL DEMO ONLY — NOT AUTHENTICATION OR PRODUCTION AUTHORIZATION.</strong> The runner receives its own HOS instance and ledger; the active desktop kernel and its state are not passed in. Sandboxing prevents this walkthrough from accidentally mutating the active instance, but it is not a production security boundary. No external action is performed.</div>
        <div class="btn-row">
          <button class="btn btn-gold" id="guided-run" type="button"${local.busy ? " disabled" : ""}>${local.busy ? "RUNNING REFUSAL DEMO…" : hasResults ? "RE-RUN REFUSAL DEMO" : "RUN REFUSAL DEMO"}</button>
          <span class="mono" aria-live="polite">${esc(status)}</span>
        </div>

        ${hasResults ? `
        <div class="h2">Paced pitch — checkpoint ${curIdx + 1} of ${local.results.length}</div>
        <div class="step-box" style="border-color:${cur && cur.pass ? "var(--ice)" : "var(--refusal)"}">
          <div class="st-kicker">${esc(cur ? cur.title : labels[curIdx])} · ${cur && cur.pass ? "PASS" : "CHECK FAILED"}</div>
          <div class="st-title" style="font-size:13px;margin-bottom:8px">${esc(narration)}</div>
          ${cur ? `
            <div class="mono" style="font-size:10px;color:var(--text-dim);margin-bottom:6px">EXPECTED ${esc(cur.expected)} · OBSERVED ${esc(cur.code)}${cur.secondaryCode ? ` · ${esc(cur.secondaryLabel)} ${esc(cur.secondaryCode)}` : ""}</div>
            <div class="mono" style="font-size:10px;color:var(--text-faint);margin-bottom:6px">H=${cur.state.H} · A=${cur.state.A === null ? "—" : cur.state.A.toFixed(2)} · R=${cur.state.R === null ? "—" : cur.state.R.toFixed(2)} · L=${cur.state.legitimacy === null ? "—" : cur.state.legitimacy.toFixed(3)} · PHASE=${esc(cur.state.phase)} · Δt=${cur.state.deltaSeconds === null ? "—" : Math.floor(cur.state.deltaSeconds) + "s"}</div>
            <div class="st-body" style="min-height:auto">${esc(cur.details)}</div>
            <div class="mono" style="font-size:9px;color:var(--text-faint);margin-top:8px">SANDBOX LEDGER ${cur.ledger.verified ? "VERIFIED" : "INVALID"} · ROW ${cur.ledger.id === null ? "—" : cur.ledger.id} · ${cur.ledger.hash ? `${esc(cur.ledger.hash.slice(0, 20))}…` : "NO HASH"}</div>
          ` : ""}
          <div class="step-nav" style="margin-top:14px">
            <button class="btn btn-ice" id="guided-prev" type="button" ${curIdx === 0 ? "disabled" : ""}>◂ Prev</button>
            <button class="btn ${local.playing ? "btn-refusal" : "btn-gold"}" id="guided-play" type="button">${local.playing ? "❚❚ Pause" : "▶ Play (8s/step)"}</button>
            <button class="btn btn-ice" id="guided-next" type="button" ${curIdx >= local.results.length - 1 ? "disabled" : ""}>Next ▸</button>
            <div class="step-dots" style="margin-left:8px">${local.results.map((_, i) => `<i class="${i === curIdx ? "on" : ""}" style="${i === curIdx ? "background:var(--gold)" : ""}"></i>`).join("")}</div>
            <span class="mono" style="font-size:9px;color:var(--text-faint);margin-left:8px">${local.playing ? "auto-advancing every 8s — ~60s total" : "paused — use Next/Prev to walk the pitch"}</span>
          </div>
        </div>
        ` : ""}

        <div class="h2">Scenario order (7 steps · ~60s paced)</div>
        <ol class="ul">
          ${labels.map((label, index) => {
            const done = index < local.results.length;
            const active = hasResults && index === curIdx;
            const result = local.results[index];
            return `<li class="li ${done ? (result && result.pass ? "" : "refusal") : ""}" style="${active ? "color:var(--gold);font-weight:600" : ""}"><span class="mono">${index + 1}.</span> ${esc(label)} ${done ? `· <span class="mono" style="font-size:10px">${esc(result.code)} ${result.pass ? "✓" : "✗"}</span>` : ""} ${active ? "◂" : ""}</li>`;
          }).join("")}
        </ol>

        <div class="h2">All observed checkpoints</div>
        <div class="adv-results" aria-live="polite">
          ${local.results.length ? local.results.map((step, idx) => `
            <div class="rule-box ${step.pass ? "ice" : "refusal"}" data-guided-result="${esc(step.id)}" style="${idx === curIdx ? "border-color:var(--gold);background:rgba(255,212,121,0.08)" : ""}">
              <strong>${idx + 1}. ${esc(step.title)} · ${step.pass ? "PASS" : "CHECK FAILED"}</strong><br>
              <span style="color:var(--gold);font-size:11px">${esc(narrations[idx] || "")}</span><br>
              <span class="mono">EXPECTED ${esc(step.expected)} · OBSERVED ${esc(step.code)}${step.secondaryCode ? ` · ${esc(step.secondaryLabel)} ${esc(step.secondaryCode)}` : ""}</span><br>
              <span class="mono">H=${step.state.H} · A=${step.state.A === null ? "—" : step.state.A.toFixed(2)} · R=${step.state.R === null ? "—" : step.state.R.toFixed(2)} · L=${step.state.legitimacy === null ? "—" : step.state.legitimacy.toFixed(3)} · PHASE=${esc(step.state.phase)}</span><br>
              <span>${esc(step.details)}</span><br>
              <span class="mono">SANDBOX LEDGER ${step.ledger.verified ? "VERIFIED" : "INVALID"} · ROW ${step.ledger.id === null ? "—" : step.ledger.id} · ${step.ledger.hash ? `${esc(step.ledger.hash.slice(0, 20))}…` : "NO HASH"}</span>
            </div>`).join("") : `<div class="rule-box">No scenario has run. Press RUN to start the paced 60-second pitch. Each checkpoint pauses with narration — use Play/Pause and Next/Prev.</div>`}
        </div>
        ${local.error ? `<div class="rule-box refusal" role="alert">${esc(local.error)}</div>` : ""}
        <div class="footer-note">The time-expiry checkpoint advances only the isolated demo clock (×${HOSGuidedDemo.CLOCK_SCALE}) so it can finish quickly. Re-attestation restores the local demo marker. A GSRB override can bypass the modeled legitimacy threshold only after the local Human Key and freshness checks; neither result authorizes a real action. Paced playback: 8s per checkpoint ≈ 56s total, with pause/next for hiring-manager walkthroughs. Best viewed on desktop; mobile shows a compact stacked view.</div>`;

      const runButton = body.querySelector("#guided-run");
      if (runButton) runButton.addEventListener("click", start);

      const prevBtn = body.querySelector("#guided-prev");
      if (prevBtn) prevBtn.addEventListener("click", () => {
        stopAutoPlay();
        if (local.current > 0) {
          local.current--;
          draw();
        }
      });

      const nextBtn = body.querySelector("#guided-next");
      if (nextBtn) nextBtn.addEventListener("click", () => {
        stopAutoPlay();
        if (local.current < local.results.length - 1) {
          local.current++;
          draw();
        }
      });

      const playBtn = body.querySelector("#guided-play");
      if (playBtn) playBtn.addEventListener("click", () => {
        if (local.playing) {
          stopAutoPlay();
          draw();
        } else {
          if (local.current >= local.results.length - 1) local.current = 0;
          startAutoPlay();
          draw();
        }
      });

      // Click a scenario order item to jump
      body.querySelectorAll(".ul .li").forEach((li, idx) => {
        if (idx < local.results.length) {
          li.style.cursor = "pointer";
          li.addEventListener("click", () => {
            stopAutoPlay();
            local.current = idx;
            draw();
          });
        }
      });
    }

    draw();
  }
});
