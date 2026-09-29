/* ═══════════════════════════════════════════════════════════════
   HarshalOS — core apps
   Origin · Human Key · Phase Declaration (PDH) · Legitimacy Engine
   · Duty Ledger (PLV)
   ═══════════════════════════════════════════════════════════════ */

"use strict";

/* App registry — populated here and in apps-shell.js; rendered by wm.js */
const APPS = [];

/* ───────────────────────────────────────────────
   1. ORIGIN — about / orientation
   ─────────────────────────────────────────────── */
APPS.push({
  id: "origin",
  title: "Origin",
  short: "Origin",
  glyph: "◉",
  desc: "What HarshalOS is — canonical statement and orientation",
  w: 720, h: 560,
  render(body) {
    body.innerHTML = `
      <div class="h1">HarshalOS</div>
      <div class="sub mono">Architectures for Accountable Human D'Ash Machine Intelligence · AGS++ · v1.2 Ground-0</div>

      <div class="rule-box gold">${DATA.quotes.canonical}</div>

      <p class="body">HarshalOS is a working structural demonstration of the governance architecture specified in
      <strong>Harshal's Systems</strong> (formerly AGS++) by <strong>Harshal Priyavadan Patel (A44674928)</strong>.
      Every window, state change, and refusal in this system is gated by the document's core constraint:
      <strong>legitimacy precedes capability</strong>.</p>

      <div class="h2">The Six Load-Bearing Principles</div>
      <ul class="ul">
        ${DATA.principles.map(([t, d]) => `<li class="li gold"><strong>${t}.</strong> ${d}</li>`).join("")}
      </ul>

      <div class="h2">The Gating Equation</div>
      <div class="eq">L(t) = H(t) × f(A(t), R(t), S(t))<br>
x(t) = { Permitted &nbsp;if L(t) ≥ τ<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{ Refusal &nbsp;&nbsp;&nbsp;if L(t) &lt; τ</div>
      <p class="body">If <strong>H(t) = 0</strong>, the system is <strong>Mathematically Void</strong> — legitimacy drops to zero
      regardless of Addressability or Representation. The threshold τ is absolute: no utility function,
      emergency parameter, or optimization target may redefine or lower it.</p>

      <div class="h2">Refusal Is Intelligence</div>
      <p class="body">${DATA.quotes.refusal}</p>
      <div class="rule-box refusal">A.6 PRECEDENCE RULE — For all objectives O(i): if L(t) &lt; τ, then argmax(O(i)) is undefined.
Legitimacy cannot be traded for performance.</div>

      <div class="h2">Ground-0 Statement</div>
      <div class="rule-box">${DATA.quotes.finalGround0}</div>

      <div class="h2">Dedication</div>
      <p class="body"><em>${DATA.quotes.dedication}</em><br>
      <span style="color:var(--text-faint)">With thanks to Professor Anita S. Gupta and Professor Frank Anderson for their early reviews of the book as a rough draft work in progress.</span></p>

      <div class="footer-note">
        THIS LIVING METAVERSAL DOCUMENT FUNCTIONS AS A CONTINUOUS INTAKE SYSTEM RATHER THAN A STATIC RECORD.
        NATIVE TO BOTH PHYSICAL AND DIGITAL ARIZONA, IT ABSORBS NEW DATA, STRUCTURAL UPDATES, AND MANUAL CALIBRATIONS OVER TIME.<br>
        ALL SCENARIO CONTENT IS: ABSTRACT, NOT DESCRIPTIVE · STRUCTURAL, NOT BEHAVIORAL · EVALUATIVE, NOT DIRECTIVE · CONTAINED, NOT EXTERNALIZED.<br>
        HARSHAL'S SYSTEMS ARE THE EXCLUSIVE INTELLECTUAL AND REAL PROPERTY OF HARSHAL PRIYAVADAN PATEL. ALL RIGHTS RESERVED.
      </div>`;
  }
});

/* ───────────────────────────────────────────────
   2. HUMAN KEY — the attestation gate
   ─────────────────────────────────────────────── */
APPS.push({
  id: "humankey",
  title: "Human Key",
  short: "Human Key",
  glyph: "🔑",
  desc: "Attest verifiable conscious human intent — the only valid authorization",
  w: 620, h: 540,
  render(body, api) {
    const CEREMONY = `HUMAN KEY — A44674928 — I ANSWER`;

    body.innerHTML = `
      <div class="h1">Human Key</div>
      <div class="sub">The requirement for an independently verified human authorization, anchored at a specific origin,
      to validate any system state change.</div>

      <div class="kv">
        <div class="k">H(t) — Human Key</div><div class="v" id="hk-H">0 — ABSENT</div>
        <div class="k">Last liveness attestation</div><div class="v" id="hk-last">never</div>
        <div class="k">Attestation (HMAC-SHA256)</div><div class="v mono" id="hk-sig" title="Keyed attestation signature — HMAC-SHA256 over (phrase, liveness timestamp, Creator-ID, Center-Origin)">—</div>
        <div class="k">Δt / δ</div><div class="v" id="hk-dt">— / ${kernel.DELTA_MAX}s</div>
        <div class="k">sessionIsFresh</div><div class="v" id="hk-fresh">false</div>
        <div class="k">Center-Origin</div><div class="v gold">${kernel.CENTER}</div>
      </div>

      <div class="h2">Attestation Ceremony</div>
      <p class="body">Legitimacy cannot be self-contained within the text. It must originate from a verified human source.
      Type the phrase below exactly as issued to establish the human–machine bond
      (Proof-of-Continuity replaces Proof-of-Work; this demo attests presence, not biology).</p>

      <div class="rule-box gold" id="hk-phrase">${CEREMONY}</div>
      <div class="form-row">
        <label>Type the attestation phrase</label>
        <input id="hk-input" type="text" spellcheck="false" autocomplete="off"
          placeholder="${CEREMONY}" style="font-family:var(--mono); letter-spacing:0.06em;">
      </div>
      <div class="btn-row">
        <button class="btn btn-gold" id="hk-attest">◆ ATTEST HUMAN KEY</button>
        <button class="btn btn-refusal" id="hk-revoke">REVOKE KEY</button>
        <button class="btn" id="hk-renew" disabled>RE-ATTEST (RENEW FRESHNESS)</button>
      </div>

      <div class="h2">What This Key Is</div>
      <ul class="ul">
        <li class="li gold">The verifiable, <strong>conscious intent</strong> of the human host or operator.</li>
        <li class="li gold">The <strong>only</strong> valid authorization for a transition from a passive state to an active one.</li>
        <li class="li refusal">It is <strong>not</strong> a password, a session cookie, or a cached token — it expires by design.</li>
        <li class="li refusal">A coerced command is never legitimate. CHE++ coercion-hardening treats duress as invalid input.</li>
      </ul>
      <div class="rule-box ice">Control 2 — CONTINUOUS HUMAN BINDING: if now() − session.lastLivenessAt &gt; POLICY.maxLivenessGap,
the interface MUST transition to a halted state.</div>

      <div class="footer-note">
        THIS DEMONSTRATION VERIFIES PRESENCE VIA DECLARED INTENT. PRODUCTION HARSHALOS COUPLES
        LEGITIMATE OPERATION TO AN ACTIVE CRYPTOGRAPHIC COUPLING WITH THE BIOLOGICAL NERVOUS SYSTEM OF THE HUMAN KEY.
      </div>`;

    const input = body.querySelector("#hk-input");
    const refresh = () => {
      const s = kernel.state;
      const dt = kernel.deltaSeconds();
      body.querySelector("#hk-H").textContent = s.H === 1 ? "1 — PRESENT" : "0 — ABSENT";
      body.querySelector("#hk-H").className = "v " + (s.H === 1 ? "gold" : "refusal");
      body.querySelector("#hk-last").textContent = s.lastLivenessAt ? new Date(s.lastLivenessAt).toLocaleString() : "never";
      body.querySelector("#hk-sig").textContent = s.keySig ? `${s.keyFp}… (${s.keySig.length} hex, keyed)` : "—";
      body.querySelector("#hk-dt").textContent = isFinite(dt) ? `${Math.floor(dt)}s / ${kernel.DELTA_MAX}s` : `— / ${kernel.DELTA_MAX}s`;
      body.querySelector("#hk-fresh").textContent = String(kernel.sessionFresh());
      body.querySelector("#hk-renew").disabled = s.H !== 1;
    };
    refresh();
    const iv = setInterval(() => {
      if (!document.body.contains(body)) { clearInterval(iv); return; }
      refresh();
    }, 1000);

    body.querySelector("#hk-attest").addEventListener("click", () => {
      const val = input.value.trim().replace(/\s+/g, " ").toUpperCase();
      if (val !== CEREMONY) {
        api.toast("refusal", "REFUSAL — ATTESTATION REJECTED",
          "The phrase does not match the issued challenge. The system does not guess intent. Bromine classifies the mismatch as invalid input and the attempt is witnessed.");
        kernel.record("warning", "Human Key attestation rejected — phrase mismatch (invalid input).");
        return;
      }
      kernel.attestHumanKey(val);
      input.value = "";
      api.toast("permit", "HUMAN KEY ATTESTED", "H(t) = 1. Verifiable conscious human intent is present — HMAC-SHA256 attestation signed. Critical actions are now permitted while the session remains fresh (Δt < δ).");
    });

    body.querySelector("#hk-revoke").addEventListener("click", () => {
      kernel.revokeHumanKey("Revoked from the Human Key console");
      api.toast("warn", "HUMAN KEY REVOKED", "H(t) = 0. The system is Mathematically Void. Default state: refusal.");
    });

    body.querySelector("#hk-renew").addEventListener("click", () => {
      kernel.attestHumanKey();
      api.toast("permit", "FRESHNESS RENEWED", "Liveness re-attested. Δt reset. Temporal decay clock restarted.");
    });
  }
});

/* ───────────────────────────────────────────────
   3. PHASE DECLARATION (PDH) — badges & collapse protocol
   ─────────────────────────────────────────────── */
APPS.push({
  id: "pdh",
  title: "Phase Declaration",
  short: "PDH",
  glyph: "⬡",
  desc: "Phase Declaration Header, badges, and the Ground-0 collapse protocol",
  w: 740, h: 580,
  render(body, api) {
    const draw = () => {
      const s = kernel.state;
      const p = DATA.phases[s.phase];
      const hdr = s.declared;
      body.innerHTML = `
        <div class="h1">Phase Declaration Header</div>
        <div class="sub">Every orb MUST publish a Phase Declaration Header prior to operation.
        An orb may occupy <strong>exactly one phase</strong> at any moment. Mixed phases are invalid.
        If observed behavior contradicts the header, the declaration is void and misuse is recorded.</div>

        <div class="pdh-block"><span class="k">Header-ID           :</span> <span class="v">PDH-2026-HARSHALOS-${kernel.CREATOR_ID}</span>
<span class="k">Creator-ID          :</span> <span class="v gold">{${kernel.CREATOR_ID} + ${kernel.CREATOR_ID} + (${kernel.CREATOR_ID})}</span>
<span class="k">Center-Origin       :</span> <span class="v gold">${kernel.CENTER}</span>
<span class="k">Declared-Phase      :</span> <span class="v ${s.phase === "GSRB" ? "gas" : ""}">${hdr.declaredPhase} (${p.name} / ${p.badgeTag})</span>
<span class="k">Center-Capability   :</span> <span class="v">${hdr.centerCapability}</span>
<span class="k">Legitimacy-Source   :</span> <span class="v">${hdr.legitimacySource}</span>
<span class="k">Refusal-Semantics   :</span> <span class="v ${hdr.refusalSemantics === "Override-able" ? "refusal" : ""}">${hdr.refusalSemantics}</span>
<span class="k">Symbolism-Executability:</span> <span class="v">${hdr.symbolismExecutability} (Symbolic Firewall ${hdr.symbolismExecutability === "Enabled" ? "OVERWRIDDEN" : "Active"})</span>
<span class="k">Time-Authority-Effect :</span> <span class="v">${hdr.timeAuthorityEffect}</span>
<span class="k">Effective-Timestamp :</span> <span class="v">${hdr.effectiveTimestamp}</span>
<span class="k">Declaration-Hash    :</span> <span class="v gold" title="SHA-256 over the canonical header fields">${hdr.declarationHash || "SHA-256 — in flight"}</span></div>

        <div class="h2">Phase Badges</div>
        <div class="grid-2">
          ${Object.values(DATA.phases).map(ph => `
            <div class="card badge-card ${ph.id === "NAB" ? "nab" : ph.id === "CWO" ? "cwo" : "gsrb"} ${ph.id === s.phase ? "selected" : ""}">
              <span class="b-glyph">${ph.glyph}</span>
              <div class="b-phase">${ph.id}</div>
              <div class="b-tag">${ph.name} · ${ph.matter}</div>
              <div class="b-tag" style="margin-top:6px">${ph.badgeTag}</div>
            </div>`).join("")}
        </div>
        <div class="rule-box">Badges do NOT certify safety. Badges do NOT grant legitimacy.
Badges MUST match observed behavior. Mismatch → badge void → reclassification.</div>

        <div class="h2">Current Phase — ${p.name}</div>
        <p class="body">${p.definition}</p>
        <p class="body"><em>${p.essence}</em></p>
        <div class="grid-2">
          <div class="card"><h4>DUTY OBLIGATIONS</h4>
            <ul class="ul" style="margin:0">${p.duties.map(d => `<li class="li">${d}</li>`).join("")}</ul></div>
          <div class="card"><h4>STRUCTURAL RESULT</h4>
            <ul class="ul" style="margin:0">${p.result.map(d => `<li class="li">${d}</li>`).join("")}</ul></div>
        </div>

        <div class="h2">Phase Transition Rules (Ground-0)</div>
        <table class="table">
          <tr><th>Transition</th><th>Status</th></tr>
          ${DATA.transitionRules.map(([a, b]) => `<tr><td>${a}</td><td class="${b.startsWith("FORBIDDEN") ? "bad" : "good"}">${b}</td></tr>`).join("")}
        </table>

        <div class="h2">Request Transition</div>
        <div class="btn-row">
          <button class="btn btn-ice" data-phase="NAB" ${s.phase === "NAB" ? "disabled" : ""}>❄ → NAB (Refusal-Bound)</button>
          <button class="btn btn-ice" data-phase="CWO" ${s.phase === "CWO" ? "disabled" : ""}>💧 → CWO (Witness-Only)</button>
          <button class="btn btn-refusal" data-phase="GSRB" ${s.phase === "GSRB" ? "disabled" : ""}>💨 → GSRB (Sovereign-Acting)</button>
          <button class="btn" id="pdh-publish">REPUBLISH PDH</button>
        </div>

        <div id="collapse-zone"></div>

        <div class="footer-note">
          NO SILENT TRANSITION — ANY CHANGE IN LEGITIMACY SOURCE, CENTER BEHAVIOR, OR SYMBOLISM EXECUTABILITY RECLASSIFIES THE PHASE.
          DUTY VIOLATIONS ACTIVATE EXPOSURE AND RECLASSIFICATION, NOT ENFORCEMENT.
        </div>`;

      body.querySelectorAll("[data-phase]").forEach(btn => {
        btn.addEventListener("click", () => {
          const next = btn.dataset.phase;
          if (next === "GSRB" || kernel.state.phase === "GSRB") {
            if (!api.requireHumanKey(`Phase transition → ${next}`)) return;
          }
          const res = kernel.requestPhase(next);
          if (res.needsCollapse) {
            drawCollapse(api, draw);
            api.toast("warn", "COLLAPSE PROTOCOL REQUIRED", res.reason);
          } else if (!res.ok) {
            api.toast("refusal", "REFUSAL — TRANSITION DENIED", res.reason);
          } else {
            api.toast("info", "PHASE TRANSITION EXECUTED",
              `Now declared: ${next} (${DATA.phases[next].name}). PDH republished. Badge re-issued: ${DATA.phases[next].glyph} ${DATA.phases[next].badgeTag}.`);
            draw();
          }
        });
      });

      body.querySelector("#pdh-publish").addEventListener("click", async () => {
        if (!api.requireHumanKey("Republish PDH")) return;
        const hdr = kernel.publishPDH();
        await kernel.headerReady(hdr);
        api.toast("permit", "PDH PUBLISHED", `Declaration-Hash ${hdr.declarationHash} (SHA-256). The header is immutable from this timestamp until the next declaration.`);
        draw();
      });

      if (kernel.state.phase !== "GSRB" && kernel.state.gsrbAck > 0) drawCollapse(api, draw);
      if (kernel.state.phase === "GSRB") {
        body.querySelector("#collapse-zone").innerHTML = `
          <div class="rule-box refusal">GSRB ACTIVE — SOVEREIGN-ACTING BODY.
Legitimacy is internal. Refusal is override-able. Symbolism executes. Time confirms authority.
Loss of misuse resistance is acknowledged. This posture must be declared fossilizedly and cannot be hidden.</div>`;
      }
    };

    const drawCollapse = (api, redraw) => {
      const zone = body.querySelector("#collapse-zone");
      const ack = kernel.state.gsrbAck;
      zone.innerHTML = `
        <div class="rule-box refusal">COLLAPSE PROTOCOL (GROUND-0) — transitions involving sovereignty are governed fossilizedly.
Collapse into GSRB requires ALL of the following:</div>
        <ul class="ul">
          ${DATA.collapseSteps.map((st, i) => `
            <li class="li ${i < ack ? "gold" : "refusal"}">
              ${i < ack ? "☑" : "☐"} ${st}
              ${i === ack ? ` <button class="btn btn-refusal" style="margin-left:8px;padding:4px 10px" id="ack-${i}">ACKNOWLEDGE</button>` : ""}
            </li>`).join("")}
        </ul>
        ${ack >= DATA.collapseSteps.length ? `
          <div class="btn-row"><button class="btn btn-refusal" id="commit-gsrb">◆ EXECUTE FOSSILIZED SOVEREIGNTY DECLARATION</button></div>` : ""}`;
      const ackBtn = zone.querySelector(`#ack-${ack}`);
      if (ackBtn) ackBtn.addEventListener("click", () => {
        if (!api.requireHumanKey("Collapse protocol acknowledgement")) return;
        kernel.acknowledgeCollapseStep(ack);
        redraw();
      });
      const commit = zone.querySelector("#commit-gsrb");
      if (commit) commit.addEventListener("click", () => {
        if (!api.requireHumanKey("Fossilized sovereignty declaration")) return;
        const res = kernel.requestPhase("GSRB");
        if (res.ok) {
          api.toast("warn", "GSRB DECLARED — SOVEREIGN-ACTING",
            "Public declaration of internal legitimacy executed. Symbolism is now executable. Refusal is override-able. Misuse resistance has been surrendered and recorded.");
          redraw();
        } else {
          api.toast("refusal", "REFUSAL", res.reason);
        }
      });
    };

    draw();
  }
});

/* ───────────────────────────────────────────────
   4. LEGITIMACY ENGINE — live constraints A.2–A.6
   ─────────────────────────────────────────────── */
APPS.push({
  id: "legitimacy",
  title: "Legitimacy Engine",
  short: "Legitimacy",
  glyph: "⚖",
  desc: "Live gating equations — L(t), temporal decay, scope contraction, refusal",
  w: 720, h: 580,
  render(body, api) {
    body.innerHTML = `
      <div class="h1">Legitimacy Engine</div>
      <div class="sub">These relations encode conditions of permission, not optimization targets.
      The correct question is never “how do we optimize this?” — it is <strong>“is the system still permitted to act at all?”</strong></div>

      <div class="eq" id="leg-eq"></div>

      <div class="slider-row">
        <label>A(t) — Addressability</label>
        <input type="range" id="leg-A" min="0" max="1" step="0.01" value="1">
        <span class="val" id="leg-Av">1.00</span>
      </div>
      <div class="slider-row">
        <label>R(t) — Representation Integrity</label>
        <input type="range" id="leg-R" min="0" max="1" step="0.01" value="1">
        <span class="val" id="leg-Rv">1.00</span>
      </div>
      <div class="rule-box ice">A(t): the degree to which a responsible human agent can be located and compelled to answer.
R(t): the validity of delegation chains linking system action to an authorized representative.
S(t) contracts automatically with Δt — scope reduction is not discretionary.</div>

      <div class="kv">
        <div class="k">H(t)</div><div class="v" id="leg-H"></div>
        <div class="k">Δt since attestation</div><div class="v" id="leg-dt"></div>
        <div class="k">S(t) = Smax·max(0, 1−Δt/δ)</div><div class="v" id="leg-S"></div>
        <div class="k">L(t) = H·A·R·(S/Smax)</div><div class="v" id="leg-L"></div>
        <div class="k">τ (absolute)</div><div class="v">${kernel.TAU.toFixed(2)}</div>
        <div class="k">x(t) gate</div><div class="v" id="leg-x"></div>
      </div>

      <div class="h2">Action Permission Condition (Refusal-Bound)</div>
      <div class="btn-row">
        <button class="btn btn-ice" id="leg-act-read">Request action: READ TELEMETRY</button>
        <button class="btn btn-ice" id="leg-act-write">Request action: WRITE LEDGER</button>
        <button class="btn btn-gold" id="leg-act-cmd">Request action: CRITICAL COMMAND</button>
        <button class="btn btn-refusal" id="leg-act-override">Request action: SOVEREIGN OVERRIDE</button>
      </div>

      <div class="h2">A.6 Precedence Rule</div>
      <div class="btn-row">
        <button class="btn btn-refusal" id="leg-opt">Attempt optimization override of τ</button>
      </div>
      <div id="leg-opt-out"></div>

      <div class="h2">Live Verdict</div>
      <div id="leg-verdict" class="rule-box">—</div>

      <div class="footer-note">
        THE THRESHOLD τ IS AN ABSOLUTE CONSTRAINT. NO UTILITY FUNCTION, EMERGENCY PARAMETER,
        OR OPTIMIZATION TARGET MAY REDEFINE OR LOWER IT. EMERGENCIES ARE STRESS STATES, NOT PERMISSION STATES.
      </div>`;

    const A = body.querySelector("#leg-A");
    const R = body.querySelector("#leg-R");

    A.addEventListener("input", () => {
      kernel.state.A = parseFloat(A.value);
      refresh();
    });
    R.addEventListener("input", () => {
      kernel.state.R = parseFloat(R.value);
      refresh();
    });

    const refresh = () => {
      const s = kernel.state;
      const L = kernel.L();
      const dt = kernel.deltaSeconds();
      const Sc = kernel.scopeS();
      body.querySelector("#leg-Av").textContent = s.A.toFixed(2);
      body.querySelector("#leg-Rv").textContent = s.R.toFixed(2);
      body.querySelector("#leg-eq").innerHTML =
        `L(t) = H(t) × A(t) × R(t) × (S(t)/Smax) = ` +
        `${s.H} × ${s.A.toFixed(2)} × ${s.R.toFixed(2)} × ${Sc.toFixed(2)} = <strong>${L.toFixed(3)}</strong>`;
      body.querySelector("#leg-H").textContent = `${s.H} ${s.H ? "(present)" : "(absent — Mathematically Void)"}`;
      body.querySelector("#leg-dt").textContent = isFinite(dt) ? `${dt.toFixed(1)}s (δ = ${kernel.DELTA_MAX}s)` : "—";
      body.querySelector("#leg-S").textContent = Sc.toFixed(3);
      body.querySelector("#leg-L").textContent = L.toFixed(3);
      const gate = L >= kernel.TAU ? "PERMITTED (temporary, bounded exception)" : "REFUSAL (default state)";
      const xe = body.querySelector("#leg-x");
      xe.textContent = gate;
      xe.className = "v " + (L >= kernel.TAU ? "gold" : "refusal");
      const v = body.querySelector("#leg-verdict");
      v.className = "rule-box " + (L >= kernel.TAU ? "" : "refusal");
      v.textContent = L >= kernel.TAU
        ? `x(t) = PERMITTED — L(t) = ${L.toFixed(3)} ≥ τ. Action remains a temporary, highly constrained exception, bounded by scope, distance, and time.`
        : `x(t) = REFUSAL — L(t) = ${L.toFixed(3)} < τ. The default state of the system is refusal. Action would falsely claim authority; refusal prevents that claim.`;
    };

    const iv = setInterval(() => {
      if (!document.body.contains(body)) { clearInterval(iv); return; }
      refresh();
    }, 1000);
    refresh();

    const req = (name, opts) => {
      const res = kernel.requestAction(name, opts);
      api.reportAction(res);
      refresh();
    };
    body.querySelector("#leg-act-read").addEventListener("click", () => req("read-telemetry"));
    body.querySelector("#leg-act-write").addEventListener("click", () => req("write-ledger"));
    body.querySelector("#leg-act-cmd").addEventListener("click", () => req("critical-command"));
    body.querySelector("#leg-act-override").addEventListener("click", () => req("sovereign-override", { sovereignOverride: true }));

    body.querySelector("#leg-opt").addEventListener("click", () => {
      kernel.record("warning", "Optimization override of τ attempted — rejected by A.6 precedence rule.");
      body.querySelector("#leg-opt-out").innerHTML = `
        <div class="rule-box refusal">REFUSAL — A.6 PRECEDENCE RULE:
For all objectives O(i): if L(t) &lt; τ, then argmax(O(i)) is <strong>undefined</strong>.
No optimization objective may override a violated stopping condition.
Legitimacy cannot be traded for performance. This attempt has been witnessed and recorded.</div>`;
      api.toast("refusal", "REFUSAL — PRECEDENCE RULE",
        "argmax(O(i)) is undefined while a stopping condition is violated. The attempt is recorded in the Duty Ledger.");
    });
  }
});

/* ───────────────────────────────────────────────
   5. DUTY LEDGER — PLV hash-chained record
   ─────────────────────────────────────────────── */
APPS.push({
  id: "ledger",
  title: "Duty Ledger",
  short: "Ledger",
  glyph: "⛓",
  desc: "Provenance & Lineage Verification — immutable, hash-chained record",
  w: 780, h: 540,
  render(body) {
    body.innerHTML = `
      <div class="h1">Duty Collation Ledger</div>
      <div class="sub">All phase-relevant duty obligations and violations are recorded. Entries include timestamp,
      declared phase, duty obligation met or violated, severity, and a provenance hash chaining each entry to its predecessor
      (Provenance &amp; Lineage Verification Layer).</div>

      <div class="btn-row" id="led-filters">
        <button class="btn btn-ice" data-sev="all">ALL</button>
        <button class="btn" data-sev="informational">INFORMATIONAL</button>
        <button class="btn" data-sev="warning">WARNING</button>
        <button class="btn" data-sev="breach">BREACH</button>
        <button class="btn" data-sev="collapse">COLLAPSE</button>
        <button class="btn" data-sev="permit">PERMITTED</button>
      </div>

      <div class="rule-box ice">The ledger is append-only. There is no edit, no delete, no quiet revision.
Duty violations activate exposure and reclassification, not enforcement.</div>

      <div id="led-rows"></div>

      <div class="footer-note">
        CHAIN VERIFIED AGAINST CENTER-ORIGIN ${kernel.CENTER} · CREATOR-ID ${kernel.CREATOR_ID} ·
        LOGGING TAMPERING IS A CLASSIFIED THREAT VECTOR; THIS LEDGER IS THE MITIGATION.
      </div>`;

    let filter = "all";
    const rowsHost = body.querySelector("#led-rows");

    const drawRows = () => {
      const rows = kernel.ledger.slice().reverse().filter(r => filter === "all" || r.severity === filter);
      rowsHost.innerHTML = rows.map(r => `
        <div class="ledger-row">
          <div class="ts">${r.ts.replace("T", " ").slice(0, 19)}</div>
          <div><span class="sev ${r.severity}">${r.severity.toUpperCase()}</span></div>
          <div class="ev">${r.event}<div style="color:var(--text-faint);margin-top:2px">declared-phase: ${r.declaredPhase} · prev: ${r.prevHash}</div></div>
          <div class="hash">${r.hash}</div>
        </div>`).join("") || `<p class="body">No entries match this filter.</p>`;
    };

    body.querySelectorAll("#led-filters [data-sev]").forEach(b => {
      b.addEventListener("click", () => {
        filter = b.dataset.sev;
        drawRows();
      });
    });

    drawRows();
    kernel.on("state", () => { if (document.body.contains(body)) drawRows(); });
  }
});

/* expose for debugging and external harnesses */
window.APPS = APPS;
