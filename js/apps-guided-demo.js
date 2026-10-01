/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Guided Refusal Demonstration
   Executes the scenario in a disposable sandboxed kernel frame.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

APPS.push({
  id: "guided-demo",
  title: "Guided Demonstration",
  short: "Guided Demo",
  glyph: "▶",
  desc: "One-button refusal walkthrough in a disposable local kernel",
  w: 760, h: 690,
  render(body, api) {
    const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[character]));
    const local = { busy: false, status: "ready", error: "", results: [], frame: null, listener: null, timeout: null };
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

    function failRun(code, detail) {
      if (!local.busy) return;
      local.busy = false;
      local.status = "failed";
      local.error = `${code}: ${detail}`;
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
        draw();
        api.toast(
          local.status === "complete" ? "info" : "refusal",
          local.status === "complete" ? "GUIDED REFUSAL DEMO COMPLETE" : "GUIDED DEMO NEEDS REVIEW",
          `${local.results.filter(step => step.pass).length}/${stepIds.length} checkpoints passed in a disposable kernel. The active desktop kernel was not supplied to the scenario.`
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
      local.busy = true;
      local.status = "running";
      local.error = "";
      local.results = [];
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
          ? `${passed}/${stepIds.length} PASS · COMPLETE`
          : local.status === "failed"
            ? `${passed}/${stepIds.length} PASS · NEEDS REVIEW`
            : "READY · NO SCENARIO RUN";
      body.innerHTML = `
        <div class="h1">Guided Refusal Demonstration</div>
        <div class="sub">One button, seven ordered checkpoints. The scenario runs the real local HOS kernel API in a fresh, disposable browser frame.</div>
        <div class="rule-box refusal"><strong>LOCAL DEMO ONLY — NOT AUTHENTICATION OR PRODUCTION AUTHORIZATION.</strong> The runner receives its own HOS instance and ledger; the active desktop kernel and its state are not passed in. Sandboxing prevents this walkthrough from accidentally mutating the active instance, but it is not a production security boundary. No external action is performed.</div>
        <div class="btn-row">
          <button class="btn btn-gold" id="guided-run" type="button"${local.busy ? " disabled" : ""}>${local.busy ? "RUNNING REFUSAL DEMO…" : "RUN REFUSAL DEMO"}</button>
          <span class="mono" aria-live="polite">${esc(status)}</span>
        </div>
        <div class="h2">Scenario order</div>
        <ol class="ul">
          ${labels.map((label, index) => `<li class="li"><span class="mono">${index + 1}.</span> ${esc(label)}</li>`).join("")}
        </ol>
        <div class="h2">Observed checkpoints</div>
        <div class="adv-results" aria-live="polite">
          ${local.results.length ? local.results.map(step => `
            <div class="rule-box ${step.pass ? "ice" : "refusal"}" data-guided-result="${esc(step.id)}">
              <strong>${esc(step.title)} · ${step.pass ? "PASS" : "CHECK FAILED"}</strong><br>
              <span class="mono">EXPECTED ${esc(step.expected)} · OBSERVED ${esc(step.code)}${step.secondaryCode ? ` · ${esc(step.secondaryLabel)} ${esc(step.secondaryCode)}` : ""}</span><br>
              <span class="mono">H=${step.state.H} · A=${step.state.A === null ? "—" : step.state.A.toFixed(2)} · R=${step.state.R === null ? "—" : step.state.R.toFixed(2)} · L=${step.state.legitimacy === null ? "—" : step.state.legitimacy.toFixed(3)} · PHASE=${esc(step.state.phase)}</span><br>
              <span>${esc(step.details)}</span><br>
              <span class="mono">SANDBOX LEDGER ${step.ledger.verified ? "VERIFIED" : "INVALID"} · ROW ${step.ledger.id === null ? "—" : step.ledger.id} · ${step.ledger.hash ? `${esc(step.ledger.hash.slice(0, 20))}…` : "NO HASH"}</span>
            </div>`).join("") : `<div class="rule-box">No scenario has run. The only control runs the full ordered sequence.</div>`}
        </div>
        ${local.error ? `<div class="rule-box refusal" role="alert">${esc(local.error)}</div>` : ""}
        <div class="footer-note">The time-expiry checkpoint advances only the isolated demo clock (×${HOSGuidedDemo.CLOCK_SCALE}) so it can finish quickly. Re-attestation restores the local demo marker. A GSRB override can bypass the modeled legitimacy threshold only after the local Human Key and freshness checks; neither result authorizes a real action.</div>`;

      const runButton = body.querySelector("#guided-run");
      if (runButton) runButton.addEventListener("click", start);
    }

    draw();
  }
});
