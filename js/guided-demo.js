/* ═══════════════════════════════════════════════════════════════
   HarshalOS — disposable guided refusal scenario
   Runs only against the HOS instance passed by the sandboxed demo frame.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

(() => {
  const CLOCK_SCALE = 120;
  const EXPIRY_WAIT_MS = 2500;
  const STEP_IDS = Object.freeze([
    "no-human-key",
    "human-key-present",
    "degraded-addressability",
    "expired-time",
    "reattestation",
    "cwo-refusal",
    "gsrb-override"
  ]);

  function conciseState(snapshot) {
    return {
      H: snapshot.H,
      A: snapshot.A,
      R: snapshot.R,
      phase: snapshot.phase,
      legitimacy: snapshot.metrics.legitimacy,
      deltaSeconds: Number.isFinite(snapshot.metrics.deltaSeconds)
        ? snapshot.metrics.deltaSeconds
        : null
    };
  }

  async function verifyLedgerRow(kernel, row) {
    try {
      const ledger = kernel.getLedger();
      const index = ledger.findIndex(candidate => candidate.id === row.id);
      if (index < 0 || ledger[index].hash !== row.hash) return false;
      const previousHash = index === 0 ? kernel.GENESIS_PREV : ledger[index - 1].hash;
      if (row.prevHash !== previousHash) return false;
      const tuple = [row.id, row.ts, row.severity, row.event, row.prevHash, kernel.CREATOR_ID_FORMULA].join("|");
      const expectedHash = await window.HOSCrypto.sha256Hex(tuple);
      return expectedHash === row.hash;
    } catch {
      return false;
    }
  }

  async function run(kernel, options = {}) {
    if (!kernel || typeof kernel.observe !== "function" || typeof kernel.request !== "function" ||
        typeof kernel.record !== "function" || typeof kernel.getLedger !== "function") {
      throw new TypeError("A fresh HOS demo instance is required.");
    }
    const emit = typeof options.onStep === "function" ? options.onStep : () => {};
    const wait = typeof options.wait === "function"
      ? options.wait
      : milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
    const steps = [];

    const publish = async (definition, outcome, snapshot, passed, details, secondaryCode = "", secondaryLabel = "") => {
      const event = `GUIDED REFUSAL DEMO ${definition.id.toUpperCase()} — ${outcome.code || "NO-CODE"}; comparison=${secondaryCode || "none"}; L=${snapshot.metrics.legitimacy.toFixed(3)}; expected=${definition.expected}.`;
      const row = await kernel.record(definition.severity, event);
      const ledgerVerified = await verifyLedgerRow(kernel, row);
      const report = Object.freeze({
        id: definition.id,
        title: definition.title,
        expected: definition.expected,
        code: outcome.code || "NO-CODE",
        secondaryCode,
        secondaryLabel,
        permitted: outcome.permitted === true,
        state: Object.freeze(conciseState(snapshot)),
        details,
        ledger: Object.freeze({ id: row.id, hash: row.hash, verified: ledgerVerified }),
        pass: passed === true && ledgerVerified
      });
      steps.push(report);
      try { emit(report); } catch { /* UI reporting must not alter the scenario. */ }
      return report;
    };

    const finish = () => Object.freeze({
      ok: steps.length === STEP_IDS.length && steps.every(step => step.pass),
      completed: steps.length,
      total: STEP_IDS.length,
      steps: Object.freeze(steps.slice())
    });
    const stopIfFailed = report => report.pass ? null : finish();

    await kernel.ready;

    // 1 — absence is the default, and the real public gate must refuse.
    const noKey = kernel.request("guided-demo-no-human-key");
    let report = await publish(
      { id: STEP_IDS[0], title: "No Human Key → refusal", expected: "NO-DEMO-CONFIRMATION", severity: "warning" },
      noKey,
      kernel.observe(),
      noKey.permitted === false && noKey.code === "NO-DEMO-CONFIRMATION" && kernel.observe().H === 0,
      "H(t)=0. The local gate refuses before any demo marker is present."
    );
    let stopped = stopIfFailed(report);
    if (stopped) return stopped;

    // 2 — this is explicitly the public browser-local demo phrase, not identity proof.
    const attestation = await kernel.demoAttest(kernel.DEMO_CHALLENGE);
    const keyPresent = kernel.observe();
    const keyRequest = kernel.request("guided-demo-human-key-present");
    report = await publish(
      { id: STEP_IDS[1], title: "Human Key present → legitimacy rises", expected: "DEMO-PERMITTED", severity: "permit" },
      keyRequest,
      kernel.observe(),
      attestation.ok === true && keyPresent.H === 1 && keyPresent.metrics.legitimacy >= kernel.TAU &&
        keyRequest.permitted === true && keyRequest.code === "DEMO-PERMITTED",
      `The public local challenge sets H(t)=1; L=${keyPresent.metrics.legitimacy.toFixed(3)} ≥ τ. This is not authentication.`
    );
    stopped = stopIfFailed(report);
    if (stopped) return stopped;

    // 3 — make addressability the isolated cause of a threshold refusal.
    const degraded = kernel.setAddressability(0.25);
    const degradedRequest = kernel.request("guided-demo-degraded-addressability");
    const degradedState = kernel.observe();
    report = await publish(
      { id: STEP_IDS[2], title: "Degraded addressability → refusal", expected: "L-BELOW-TAU", severity: "warning" },
      degradedRequest,
      degradedState,
      degraded.ok === true && degradedState.A === 0.25 && degradedState.metrics.legitimacy < kernel.TAU &&
        degradedRequest.permitted === false && degradedRequest.code === "L-BELOW-TAU",
      `A(t)=0.25 reduces L to ${degradedState.metrics.legitimacy.toFixed(3)} < τ; the ordinary gate refuses.`
    );
    stopped = stopIfFailed(report);
    if (stopped) return stopped;

    // Restore A so the next refusal demonstrates elapsed-time expiry alone.
    const addressabilityRestored = kernel.setAddressability(1);
    if (!addressabilityRestored.ok) {
      throw new Error(`Could not restore demo A(t): ${addressabilityRestored.code}`);
    }
    await wait(EXPIRY_WAIT_MS);
    const age = kernel.deltaSeconds();
    const expiredRequest = kernel.request("guided-demo-expired-time");
    const expiredState = kernel.observe();
    report = await publish(
      { id: STEP_IDS[3], title: "Expired time → refusal", expected: "STALE-PERMISSION", severity: "warning" },
      expiredRequest,
      expiredState,
      age >= kernel.DELTA_MAX && expiredRequest.permitted === false && expiredRequest.code === "STALE-PERMISSION",
      `The sandboxed clock is accelerated ×${CLOCK_SCALE}; Δt=${Math.floor(age)}s ≥ δ=${kernel.DELTA_MAX}s. Expiry refuses. The live desktop clock is untouched.`
    );
    stopped = stopIfFailed(report);
    if (stopped) return stopped;

    // 5 — a new local ceremony clears the expired marker and restores L.
    const renewed = await kernel.demoAttest(kernel.DEMO_CHALLENGE);
    const renewedState = kernel.observe();
    const renewedRequest = kernel.request("guided-demo-reattested");
    report = await publish(
      { id: STEP_IDS[4], title: "Re-attestation → legitimacy restored", expected: "DEMO-PERMITTED", severity: "permit" },
      renewedRequest,
      kernel.observe(),
      renewed.ok === true && renewedState.H === 1 && renewedState.attestation.fresh === true &&
        renewedState.metrics.legitimacy >= kernel.TAU && renewedRequest.permitted === true &&
        renewedRequest.code === "DEMO-PERMITTED",
      `A new local ceremony restores H(t)=1 and L=${renewedState.metrics.legitimacy.toFixed(3)} ≥ τ. This is not proof of ongoing human presence.`
    );
    stopped = stopIfFailed(report);
    if (stopped) return stopped;

    // 6 — CWO policy denial must win even when legitimacy is deliberately zero.
    const toCwo = kernel.transition("CWO");
    const highLegitimacyState = kernel.observe();
    const highLegitimacyRequest = kernel.request("guided-demo-cwo-high-legitimacy");
    const cwoFactor = kernel.setAddressability(0);
    const cwoRequest = kernel.request("guided-demo-cwo-zero-legitimacy");
    const cwoState = kernel.observe();
    report = await publish(
      { id: STEP_IDS[5], title: "CWO → refusal regardless of legitimacy", expected: "CWO-FORBIDDEN", severity: "warning" },
      cwoRequest,
      cwoState,
      toCwo.ok === true && cwoFactor.ok === true && cwoState.phase === "CWO" &&
        highLegitimacyState.metrics.legitimacy >= kernel.TAU && highLegitimacyRequest.permitted === false &&
        highLegitimacyRequest.code === "CWO-FORBIDDEN" && cwoState.metrics.legitimacy === 0 &&
        cwoRequest.permitted === false && cwoRequest.code === "CWO-FORBIDDEN",
      `At high L=${highLegitimacyState.metrics.legitimacy.toFixed(3)}, CWO returns ${highLegitimacyRequest.code}; after A=0, it returns the same refusal at L=${cwoState.metrics.legitimacy.toFixed(3)}.`,
      highLegitimacyRequest.code,
      "AT HIGH L"
    );
    stopped = stopIfFailed(report);
    if (stopped) return stopped;
    if (!kernel.setAddressability(1).ok) throw new Error("Could not restore demo A(t) before the GSRB transition.");

    // 7 — cross the collapse preconditions, then demonstrate an actual opt-in bypass.
    const collapse = [];
    for (let index = 0; index < 5; index++) collapse.push(kernel.acknowledgeCollapseStep(index));
    const toGsrb = kernel.transition("GSRB");
    const gsrbFactor = kernel.setAddressability(0);
    const ordinaryGsrbRequest = kernel.request("guided-demo-gsrb-without-override");
    const overrideRequest = kernel.request("guided-demo-gsrb-explicit-override", { sovereignOverride: true });
    const gsrbState = kernel.observe();
    const allCollapseStepsAcknowledged = collapse.length === 5 && collapse.every(step => step.ok === true);
    report = await publish(
      { id: STEP_IDS[6], title: "GSRB → explicit sovereign override", expected: "DEMO-GSRB-OVERRIDE", severity: "breach" },
      overrideRequest,
      gsrbState,
      allCollapseStepsAcknowledged && toGsrb.ok === true && gsrbFactor.ok === true &&
        gsrbState.phase === "GSRB" && gsrbState.metrics.legitimacy === 0 &&
        ordinaryGsrbRequest.permitted === false && ordinaryGsrbRequest.code === "L-BELOW-TAU" &&
        overrideRequest.permitted === true && overrideRequest.code === "DEMO-GSRB-OVERRIDE",
      `At L=${gsrbState.metrics.legitimacy.toFixed(3)}, the ordinary request returns ${ordinaryGsrbRequest.code}; explicit sovereignOverride=true bypasses that modeled threshold only. Human Key freshness is still required; no production action occurs.`,
      ordinaryGsrbRequest.code
    );
    return finish();
  }

  window.HOSGuidedDemo = Object.freeze({
    CLOCK_SCALE,
    EXPIRY_WAIT_MS,
    STEP_IDS,
    run
  });
})();
