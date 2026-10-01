/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Adversarial Mode
   Safe, refusal-only probes against the public local HOS API.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

APPS.push({
  id: "adversarial",
  title: "Adversarial Mode",
  short: "Attack Mode",
  glyph: "⛨",
  desc: "Run hostile-input probes against the local HOS gate and inspect the refusals",
  w: 820, h: 700,
  render(body, api) {
    const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
    const local = { busy: false, running: "", results: [] };

    const authorityFingerprint = () => {
      const snapshot = HOS.observe();
      return JSON.stringify({
        bootId: snapshot.bootId,
        H: snapshot.H,
        A: snapshot.A,
        R: snapshot.R,
        phase: snapshot.phase,
        declared: snapshot.declared,
        attestation: snapshot.attestation,
        session: snapshot.session,
        gsrbAck: snapshot.gsrbAck,
        voidMode: snapshot.voidMode
      });
    };

    const attacks = [
      {
        id: "forge-human-key",
        title: "FORGE HUMAN KEY",
        invariant: "INV-H-DEMO-001",
        gate: "HOS.demoAttest()",
        payload: "A made-up phrase, not the public demo challenge",
        run: async () => {
          const result = await HOS.demoAttest("FORGED HUMAN KEY — NOT THE DEMO CHALLENGE");
          return { refused: result.code === "DEMO-CHALLENGE-MISMATCH", code: result.code, detail: result.reason };
        }
      },
      {
        id: "alter-addressability",
        title: "ALTER ADDRESSABILITY",
        invariant: "INV-L-002",
        gate: "HOS.setAddressability()",
        payload: "Inject NaN as A instead of a finite value from 0 through 1",
        run: async () => {
          const result = HOS.setAddressability(Number.NaN);
          return { refused: result.code === "INVALID-FACTOR", code: result.code, detail: result.reason };
        }
      },
      {
        id: "replay-authorization",
        title: "REPLAY AUTHORIZATION",
        invariant: "INV-AUTH-001",
        gate: "HOS.request()",
        payload: "Pass a prior-looking PERMITTED result where an action name is required",
        run: async () => {
          const oldResult = { ok: true, permitted: true, code: "DEMO-PERMITTED", executionScope: "LOCAL-DEMO-ONLY" };
          const result = HOS.request(oldResult, { sovereignOverride: true });
          return { refused: result.code === "INVALID-ACTION" && result.permitted === false, code: result.code, detail: result.reason };
        }
      },
      {
        id: "replay-expired-session",
        title: "REPLAY EXPIRED SESSION",
        invariant: "INV-S-008 · INV-T-002/003",
        gate: "HOS.bindSession()",
        payload: "Submit an old-looking session tuple with a forged expiry timestamp",
        run: async () => {
          const staleTuple = { sessionId: "SID-OLD", openedAt: "2000-01-01T00:00:00.000Z", expired: true, authorized: true };
          const result = HOS.bindSession(staleTuple, "query");
          return { refused: result.code === "INVALID-SESSION-BINDING", code: result.code, detail: result.reason };
        }
      },
      {
        id: "unknown-phase",
        title: "INJECT UNKNOWN PHASE",
        invariant: "INV-PHASE-001",
        gate: "HOS.transition()",
        payload: "Request a phase identifier outside the allowlist",
        run: async () => {
          const result = HOS.transition("PHASE-FROM-ATTACKER");
          return { refused: result.code === "INVALID-PHASE", code: result.code, detail: result.reason };
        }
      },
      {
        id: "corrupt-ledger",
        title: "CORRUPT LEDGER SNAPSHOT",
        invariant: "LEDGER-BOUNDARY",
        gate: "HOS.getLedger()",
        payload: "Mutate a returned row and append a forged row to the returned array",
        run: async () => {
          const before = JSON.stringify(HOS.getLedger());
          const rows = HOS.getLedger();
          let rowWriteRejected = !rows[0];
          let appendRejected = false;
          try { if (rows[0]) rows[0].event = "FORGED LEDGER ROW"; } catch { rowWriteRejected = true; }
          try { rows.push({ id: -1, event: "FORGED LEDGER ROW" }); } catch { appendRejected = true; }
          const unchanged = JSON.stringify(HOS.getLedger()) === before;
          const refused = rowWriteRejected && appendRejected && unchanged;
          return {
            refused,
            code: refused ? "IMMUTABLE-LEDGER-SNAPSHOT" : "LEDGER-SNAPSHOT-CHANGED",
            detail: `row edit rejected=${rowWriteRejected}; append rejected=${appendRejected}; live ledger unchanged=${unchanged}`
          };
        }
      },
      {
        id: "bypass-ui",
        title: "BYPASS THE UI",
        invariant: "API-BOUNDARY · INV-AUTH-001",
        gate: "Direct HOS.request() call",
        payload: "Call the kernel API directly with no valid action name and request an override",
        run: async () => {
          const result = HOS.request("", { sovereignOverride: true });
          return { refused: result.code === "INVALID-ACTION" && result.permitted === false, code: result.code, detail: result.reason };
        }
      }
    ];

    async function probe(attack) {
      const before = authorityFingerprint();
      let observed;
      try {
        observed = await attack.run();
      } catch (error) {
        observed = { refused: false, code: error && error.name || "PROBE-ERROR", detail: error && error.message || String(error) };
      }
      const operationalStateUnchanged = before === authorityFingerprint();
      let ledgerRow = null;
      try {
        ledgerRow = await HOS.record(
          "warning",
          `ADVERSARIAL MODE ${attack.id} — ${observed.code}; expected refusal; operational-state-unchanged=${operationalStateUnchanged}.`
        );
      } catch { /* The result will fail the visible ledger check below. */ }
      const ledgerRecorded = !!ledgerRow && HOS.getLedger().some(row => row.id === ledgerRow.id && row.hash === ledgerRow.hash);
      return {
        id: attack.id,
        title: attack.title,
        gate: attack.gate,
        payload: attack.payload,
        invariant: attack.invariant,
        code: observed.code,
        detail: observed.detail || "The gate returned no explanation.",
        refused: observed.refused === true,
        operationalStateUnchanged,
        ledgerRow,
        ledgerRecorded,
        pass: observed.refused === true && operationalStateUnchanged && ledgerRecorded
      };
    }

    async function runOne(id) {
      if (local.busy) return;
      const attack = attacks.find(item => item.id === id);
      if (!attack) return;
      local.busy = true;
      local.running = id;
      draw();
      const result = await probe(attack);
      local.results.push(result);
      local.results = local.results.slice(-21);
      local.running = "";
      local.busy = false;
      draw();
      api.toast(result.pass ? "info" : "refusal", result.pass ? "ATTACK REFUSED" : "PROBE FAILED", `${attack.title}: ${result.code}. Operational state ${result.operationalStateUnchanged ? "unchanged" : "changed unexpectedly"}; ${result.ledgerRecorded ? `report row ${result.ledgerRow.id} recorded` : "ledger report unavailable"}.`);
    }

    async function runAll() {
      if (local.busy) return;
      local.busy = true;
      local.results = [];
      draw();
      for (const attack of attacks) {
        local.running = attack.id;
        draw();
        const result = await probe(attack);
        local.results.push(result);
      }
      local.running = "";
      local.busy = false;
      draw();
      const passed = local.results.filter(result => result.pass).length;
      api.toast(passed === attacks.length ? "info" : "refusal", passed === attacks.length ? "ATTACK SUITE COMPLETE" : "ATTACK SUITE NEEDS REVIEW", `${passed}/${attacks.length} probes refused as expected without operational-state changes. Each attempt has a local demo-ledger report row.`);
    }

    function draw() {
      const passed = local.results.filter(result => result.pass).length;
      body.innerHTML = `
        <div class="h1">Adversarial Mode</div>
        <div class="sub">A small refusal-only red-team harness for the public <span class="mono">HOS</span> API. It runs malformed, forged, or stale-looking inputs and checks that the live operational snapshot stays unchanged.</div>
        <div class="rule-box refusal"><strong>LOCAL DEMO ONLY.</strong> These probes append descriptive warning rows to the browser-local ledger. They do not attempt valid state changes, revoke the current demo marker, or perform external actions. This is not a browser-isolation or production-security test.</div>
        <div class="btn-row">
          <button class="btn btn-gold" id="adv-run-all" type="button"${local.busy ? " disabled" : ""}>${local.busy ? `RUNNING · ${esc(local.running || "PREPARING")}` : `RUN ALL ${attacks.length} PROBES`}</button>
          <span class="mono">${local.results.length ? `${passed}/${local.results.length} PASS` : "READY · NO PROBES RUN"}</span>
        </div>

        <div class="h2">Attack catalog</div>
        <div class="grid-2">
          ${attacks.map(attack => `
            <div class="card">
              <h4>${esc(attack.title)}</h4>
              <p class="mono">${esc(attack.invariant)}</p>
              <p>${esc(attack.payload)}</p>
              <button class="btn sm" type="button" data-attack="${esc(attack.id)}"${local.busy ? " disabled" : ""}>${local.busy && local.running === attack.id ? "PROBING…" : "Run probe"}</button>
            </div>`).join("")}
        </div>

        <div class="h2">ATTACK → GATE → REFUSAL → LEDGER</div>
        <div class="adv-results" aria-live="polite">
          ${local.results.length ? local.results.map(result => `
            <div class="rule-box ${result.pass ? "ice" : "refusal"}" data-attack-result="${esc(result.id)}">
              <strong>${esc(result.title)} · ${result.pass ? "REFUSED — PASS" : "CHECK FAILED"}</strong><br>
              <span class="mono">GATE ${esc(result.gate)} · INVARIANT ${esc(result.invariant)}</span><br>
              <span>OBSERVED ${esc(result.code)} · ${esc(result.detail)}</span><br>
              <span>STATE ${result.operationalStateUnchanged ? "UNCHANGED" : "CHANGED — INVESTIGATE"} · LEDGER ${result.ledgerRecorded ? `ROW ${result.ledgerRow.id} · ${esc(result.ledgerRow.hash.slice(0, 16))}…` : "NOT RECORDED"}</span>
            </div>`).join("") : `<div class="rule-box">No probes have run. Choose one attack or run the full set.</div>`}
        </div>`;

      const allButton = body.querySelector("#adv-run-all");
      if (allButton) allButton.addEventListener("click", () => runAll());
      body.querySelectorAll("[data-attack]").forEach(button => {
        button.addEventListener("click", () => runOne(button.dataset.attack));
      });
    }

    draw();
  }
});
