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
      <strong>Harshal's Systems</strong> (formerly AGS++) by <strong>Harshal Priyavadan Patel</strong>.
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
  desc: "Demo-only Human Key gate; no production authentication is implemented",
  w: 620, h: 540,
  render(body, api) {
    const CEREMONY = HOS.DEMO_CHALLENGE;

    body.innerHTML = `
      <div class="h1">Human Key — Demo Only</div>
      <div class="rule-box refusal"><strong>DEMO ONLY — NOT AUTHENTICATION.</strong> The phrase below is public and the HMAC key is bundled in this browser code. This path exercises a local gate only; it proves no identity, liveness, consciousness, consent, or non-coercion and grants no production authority. A production authenticator is not implemented.</div>
      <div class="sub">This panel lets you test the model's freshness and refusal behavior. The demo marker is not an independently verified human authorization.</div>

      <div class="kv">
        <div class="k">H(t) — demo marker</div><div class="v" id="hk-H">0 — ABSENT</div>
        <div class="k">Demo timestamp age</div><div class="v" id="hk-last">never</div>
        <div class="k">Local HMAC status</div><div class="v mono" id="hk-sig" title="Demo signature material stays inside the private kernel closure">—</div>
        <div class="k">Δt / δ (demo clock)</div><div class="v" id="hk-dt">— / ${HOS.DELTA_MAX}s</div>
        <div class="k">demoTimerFresh</div><div class="v" id="hk-fresh">false</div>
        <div class="k">Center-Origin</div><div class="v gold">${HOS.CENTER}</div>
      </div>

      <div class="h2">Local Demo Challenge</div>
      <p class="body">Enter the displayed public string to exercise the in-browser state transition. Matching it demonstrates only that this client ran the demo code; it does not establish who entered it or whether a person is present.</p>

      <div class="rule-box gold" id="hk-phrase">${CEREMONY}</div>
      <div class="form-row">
        <label>Type the public demo phrase</label>
        <input id="hk-input" type="text" spellcheck="false" autocomplete="off"
          placeholder="${CEREMONY}" style="font-family:var(--mono); letter-spacing:0.06em;">
      </div>
      <div class="btn-row">
        <button class="btn btn-gold" id="hk-attest">◆ RUN DEMO CHALLENGE</button>
        <button class="btn btn-refusal" id="hk-revoke">CLEAR DEMO MARKER</button>
        <button class="btn" id="hk-renew" disabled>REFRESH DEMO CLOCK</button>
      </div>

      <div class="h2">What This Demo Does—and Does Not—Establish</div>
      <ul class="ul">
        <li class="li gold">It stores a local boolean marker and runs a browser-side HMAC to exercise the demo gate.</li>
        <li class="li refusal">The phrase and demo MAC key are public in the client bundle; this is not a secret challenge or an identity check.</li>
        <li class="li refusal">It proves no identity, biological presence, liveness, consciousness, consent, freedom from coercion, or secure hardware possession.</li>
        <li class="li refusal">The resulting permit is tagged <strong>LOCAL-DEMO-ONLY</strong>; no production Human Key or HOS production-authorization path is implemented.</li>
      </ul>
      <div class="rule-box ice">The asynchronous local HMAC moves through pending → active only on successful, still-fresh completion; while pending, H(t) = 0 and actions are refused. Failure, revocation, and expiry do not create authority. Starting a new ceremony clears existing demo state. Freshness is elapsed browser time, not independently verified liveness.</div>

      <div class="footer-note">
        PRODUCTION AUTHENTICATION IS UNAVAILABLE IN THIS REPOSITORY. Any production design needs a separately reviewed trust anchor and enforcement boundary; this browser demo does not supply or claim one.
      </div>`;

    const input = body.querySelector("#hk-input");
    const refresh = () => {
      const s = HOS.observe();
      const dt = s.metrics.deltaSeconds;
      const status = s.attestation.status;
      const statusLabels = {
        absent: "0 — ABSENT",
        pending: "0 — ATTESTATION PENDING (NON-ACTING)",
        active: s.attestation.expired ? "1 — DEMO MARKER EXPIRED" : "1 — DEMO MARKER ACTIVE",
        failed: "0 — ATTESTATION FAILED",
        revoked: "0 — REVOKED"
      };
      body.querySelector("#hk-H").textContent = statusLabels[status] || "0 — INVALID STATE";
      body.querySelector("#hk-H").className = "v " + (status === "active" && !s.attestation.expired ? "gold" : status === "pending" ? "ice" : "refusal");
      body.querySelector("#hk-last").textContent = status === "pending"
        ? "HMAC pending; H(t) remains 0"
        : status === "active"
          ? `${Number.isFinite(dt) ? `${Math.floor(dt)}s since demo challenge` : "time unavailable"}`
          : status === "failed" ? "latest ceremony failed"
            : status === "revoked" ? "local marker cleared" : "never";
      body.querySelector("#hk-sig").textContent = status === "active"
        ? s.attestation.expired ? "Demo HMAC present; freshness expired — not authentication" : "Demo HMAC computed — not authentication"
        : status === "pending" ? "Demo HMAC pending — no action authorized"
          : status === "failed" ? "Demo HMAC failed — marker inactive"
            : status === "revoked" ? "Marker revoked — no active demo authority" : "—";
      body.querySelector("#hk-dt").textContent = isFinite(dt) ? `${Math.floor(dt)}s / ${HOS.DELTA_MAX}s` : `— / ${HOS.DELTA_MAX}s`;
      body.querySelector("#hk-fresh").textContent = String(s.metrics.demoTimerFresh);
      body.querySelector("#hk-renew").disabled = s.H !== 1;
    };
    refresh();
    const iv = setInterval(() => {
      if (!document.body.contains(body)) { clearInterval(iv); return; }
      refresh();
    }, 1000);

    body.querySelector("#hk-attest").addEventListener("click", async () => {
      const val = input.value.trim().replace(/\s+/g, " ").toUpperCase();
      const pending = HOS.demoAttest(val);
      refresh();
      const result = await pending;
      if (!result.ok) {
        api.toast("refusal", `DEMO CHALLENGE REFUSED — ${result.code}`, result.reason);
        refresh();
        return;
      }
      input.value = "";
      refresh();
      api.toast("info", "DEMO GATE ACTIVE — LOCAL ONLY", "The public phrase matched and the browser-local HMAC completed. This proves no identity, liveness, consent, or production authority; permits remain LOCAL-DEMO-ONLY.");
    });

    body.querySelector("#hk-revoke").addEventListener("click", () => {
      HOS.revoke("Demo marker cleared from the Human Key panel");
      refresh();
      api.toast("warn", "DEMO MARKER CLEARED", "H(t) = 0. The local simulation gate returns to its absent/refusal state. No production credential was revoked because none is configured.");
    });

    body.querySelector("#hk-renew").addEventListener("click", async () => {
      const pending = HOS.demoAttest(HOS.DEMO_CHALLENGE);
      refresh();
      const result = await pending;
      if (!result.ok) {
        api.toast("refusal", `DEMO REFRESH REFUSED — ${result.code}`, result.reason);
        refresh();
        return;
      }
      refresh();
      api.toast("info", "DEMO CLOCK REFRESHED", "The local timer restarted. This does not verify ongoing human presence or renew production authority.");
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
      const s = HOS.observe();
      const p = DATA.phases[s.phase];
      const hdr = s.declared;
      body.innerHTML = `
      <div class="h1">Phase Declaration Header — Demo</div>
      <div class="rule-box refusal"><strong>LOCAL-DEMO-ONLY.</strong> Phase badges, collapse acknowledgements, and PDH hashes describe this browser simulation. They do not enforce production policy or establish external authority.</div>
      <div class="sub">The model requires one declared phase at a time. This panel exercises that invariant locally; it is not an independently witnessed or production-enforced declaration.</div>

        <div class="pdh-block"><span class="k">Header-ID           :</span> <span class="v">PDH-2026-HARSHALOS-${HOS.CREATOR_ID}</span>
<span class="k">Creator-ID          :</span> <span class="v gold">{${HOS.CREATOR_ID_FORMULA}}</span>
<span class="k">Center-Origin       :</span> <span class="v gold">${HOS.CENTER}</span>
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

        <div class="h2">Run Local Demo Transition</div>
        <div class="btn-row">
          <button class="btn btn-ice" data-phase="NAB" ${s.phase === "NAB" ? "disabled" : ""}>❄ → NAB (Refusal-Bound)</button>
          <button class="btn btn-ice" data-phase="CWO" ${s.phase === "CWO" ? "disabled" : ""}>💧 → CWO (Witness-Only)</button>
          <button class="btn btn-refusal" data-phase="GSRB" ${s.phase === "GSRB" ? "disabled" : ""}>💨 → GSRB (demo state)</button>
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
          if (next === "GSRB" || HOS.observe().phase === "GSRB") {
            if (!api.requireDemoGate(`Demo phase transition → ${next}`)) return;
          }
          const res = HOS.transition(next);
          if (res.needsCollapse) {
            drawCollapse(api, draw);
            api.toast("warn", "COLLAPSE PROTOCOL REQUIRED", res.reason);
          } else if (!res.ok) {
            api.toast("refusal", "REFUSAL — TRANSITION DENIED", res.reason);
          } else {
            api.toast("info", "DEMO PHASE STATE UPDATED",
              `The local model now records ${next} (${DATA.phases[next].name}). Its PDH hash and badge are demo artifacts; no production policy or authority changed.`);
            draw();
          }
        });
      });

      body.querySelector("#pdh-publish").addEventListener("click", async () => {
        if (!api.requireDemoGate("Republish PDH")) return;
        const hdr = await HOS.publishDeclaration();
        if (!hdr.ok) {
          api.toast("refusal", `REFUSAL — ${hdr.code}`, hdr.reason);
          return;
        }
        api.toast("info", "LOCAL DEMO PDH HASHED", `SHA-256 ${hdr.declarationHash} was computed for this browser model. This is not an independently witnessed or production-enforced declaration.`);
        draw();
      });

      if (HOS.observe().phase !== "GSRB" && HOS.observe().gsrbAck > 0) drawCollapse(api, draw);
      if (HOS.observe().phase === "GSRB") {
        body.querySelector("#collapse-zone").innerHTML = `
          <div class="rule-box refusal">LOCAL DEMO STATE — GSRB MODEL ACTIVE.
The displayed fields reflect the selected model state only. No sovereignty, executable symbolism, external authority, or production enforcement is created.</div>`;
      }
    };

    const drawCollapse = (api, redraw) => {
      const zone = body.querySelector("#collapse-zone");
      const ack = HOS.observe().gsrbAck;
      zone.innerHTML = `
        <div class="rule-box refusal">LOCAL DEMO COLLAPSE SEQUENCE — modeled transition preconditions only; this does not transfer authority.
Entering the GSRB demo state requires all steps:</div>
        <ul class="ul">
          ${DATA.collapseSteps.map((st, i) => `
            <li class="li ${i < ack ? "gold" : "refusal"}">
              ${i < ack ? "☑" : "☐"} ${st}
              ${i === ack ? ` <button class="btn btn-refusal" style="margin-left:8px;padding:4px 10px" id="ack-${i}">ACK DEMO STEP</button>` : ""}
            </li>`).join("")}
        </ul>
        ${ack >= DATA.collapseSteps.length ? `
          <div class="btn-row"><button class="btn btn-refusal" id="commit-gsrb">◆ ENTER LOCAL GSRB DEMO STATE</button></div>` : ""}`;
      const ackBtn = zone.querySelector(`#ack-${ack}`);
      if (ackBtn) ackBtn.addEventListener("click", () => {
        if (!api.requireDemoGate("Collapse protocol acknowledgement")) return;
        const result = HOS.acknowledgeCollapseStep(ack);
        if (!result.ok) {
          api.toast("refusal", `REFUSAL — ${result.code}`, result.reason);
          return;
        }
        redraw();
      });
      const commit = zone.querySelector("#commit-gsrb");
      if (commit) commit.addEventListener("click", () => {
        if (!api.requireDemoGate("Fossilized sovereignty declaration")) return;
        const res = HOS.transition("GSRB");
        if (res.ok) {
          api.toast("warn", "DEMO STATE — GSRB SIMULATION",
            "The local phase model entered GSRB after the demo collapse sequence. No sovereignty, external authority, or production action was created.");
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
      <div class="h1">Legitimacy Engine — Demo Simulation</div>
      <div class="rule-box refusal"><strong>LOCAL-DEMO-ONLY.</strong> Results below exercise the modeled gate. They are not production authorization and must not authorize external actions; no production Human Key is configured.</div>
      <div class="sub">These relations encode a simulated permission condition, not a production security boundary or an optimization target.</div>

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
        <div class="k">Δt since demo challenge</div><div class="v" id="leg-dt"></div>
        <div class="k">S(t) = Smax·max(0, 1−Δt/δ)</div><div class="v" id="leg-S"></div>
        <div class="k">L(t) = H·A·R·(S/Smax)</div><div class="v" id="leg-L"></div>
        <div class="k">τ (absolute)</div><div class="v">${HOS.TAU.toFixed(2)}</div>
        <div class="k">x(t) gate</div><div class="v" id="leg-x"></div>
      </div>

      <div class="h2">Local Demo Gate Requests</div>
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
      HOS.setAddressability(parseFloat(A.value));
      refresh();
    });
    R.addEventListener("input", () => {
      HOS.setRepresentation(parseFloat(R.value));
      refresh();
    });

    const refresh = () => {
      const s = HOS.observe();
      const L = s.metrics.legitimacy;
      const dt = s.metrics.deltaSeconds;
      const Sc = s.metrics.scopeS;
      body.querySelector("#leg-Av").textContent = s.A.toFixed(2);
      body.querySelector("#leg-Rv").textContent = s.R.toFixed(2);
      body.querySelector("#leg-eq").innerHTML =
        `L(t) = H(t) × A(t) × R(t) × (S(t)/Smax) = ` +
        `${s.H} × ${s.A.toFixed(2)} × ${s.R.toFixed(2)} × ${Sc.toFixed(2)} = <strong>${L.toFixed(3)}</strong>`;
      body.querySelector("#leg-H").textContent = `${s.H} ${s.H ? "(present)" : "(absent — Mathematically Void)"}`;
      body.querySelector("#leg-dt").textContent = isFinite(dt) ? `${dt.toFixed(1)}s (δ = ${HOS.DELTA_MAX}s)` : "—";
      body.querySelector("#leg-S").textContent = Sc.toFixed(3);
      body.querySelector("#leg-L").textContent = L.toFixed(3);
      const gate = L >= HOS.TAU ? "DEMO MODEL: WOULD PERMIT (local only)" : "DEMO MODEL: REFUSAL";
      const xe = body.querySelector("#leg-x");
      xe.textContent = gate;
      xe.className = "v " + (L >= HOS.TAU ? "gold" : "refusal");
      const v = body.querySelector("#leg-verdict");
      v.className = "rule-box " + (L >= HOS.TAU ? "" : "refusal");
      v.textContent = L >= HOS.TAU
        ? `DEMO ONLY — the model yields PERMITTED locally because L(t) = ${L.toFixed(3)} ≥ τ. This is not production authorization and does not permit external action.`
        : `DEMO ONLY — the model yields REFUSAL because L(t) = ${L.toFixed(3)} < τ. No production authorization is available in this build.`;
    };

    const iv = setInterval(() => {
      if (!document.body.contains(body)) { clearInterval(iv); return; }
      refresh();
    }, 1000);
    refresh();

    const req = (name, opts) => {
      const res = HOS.request(name, opts);
      api.reportAction(res);
      refresh();
    };
    body.querySelector("#leg-act-read").addEventListener("click", () => req("read-telemetry"));
    body.querySelector("#leg-act-write").addEventListener("click", () => req("write-ledger"));
    body.querySelector("#leg-act-cmd").addEventListener("click", () => req("critical-command"));
    body.querySelector("#leg-act-override").addEventListener("click", () => req("sovereign-override", { sovereignOverride: true }));

    body.querySelector("#leg-opt").addEventListener("click", () => {
      HOS.record("warning", "Optimization override of τ attempted — rejected by A.6 precedence rule.");
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
        CHAIN VERIFIED AGAINST CENTER-ORIGIN ${HOS.CENTER} · CREATOR-ID ${HOS.CREATOR_ID_FORMULA} ·
        LOGGING TAMPERING IS A CLASSIFIED THREAT VECTOR; THIS LEDGER IS THE MITIGATION.
      </div>`;

    let filter = "all";
    const rowsHost = body.querySelector("#led-rows");

    const drawRows = () => {
      const rows = HOS.getLedger().slice().reverse().filter(r => filter === "all" || r.severity === filter);
      rowsHost.replaceChildren();
      if (!rows.length) {
        const empty = document.createElement("p");
        empty.className = "body";
        empty.textContent = "No entries match this filter.";
        rowsHost.appendChild(empty);
        return;
      }

      rows.forEach(r => {
        const row = document.createElement("div");
        row.className = "ledger-row";

        const timestamp = document.createElement("div");
        timestamp.className = "ts";
        timestamp.textContent = String(r.ts).replace("T", " ").slice(0, 19);

        const severityCell = document.createElement("div");
        const severity = document.createElement("span");
        severity.className = "sev " + r.severity;
        severity.textContent = String(r.severity).toUpperCase();
        severityCell.appendChild(severity);

        const event = document.createElement("div");
        event.className = "ev";
        event.textContent = r.event;
        const metadata = document.createElement("div");
        metadata.style.color = "var(--text-faint)";
        metadata.style.marginTop = "2px";
        metadata.textContent = `declared-phase: ${r.declaredPhase} · prev: ${r.prevHash}`;
        event.appendChild(metadata);

        const hash = document.createElement("div");
        hash.className = "hash";
        hash.textContent = r.hash;

        row.append(timestamp, severityCell, event, hash);
        rowsHost.appendChild(row);
      });
    };

    body.querySelectorAll("#led-filters [data-sev]").forEach(b => {
      b.addEventListener("click", () => {
        filter = b.dataset.sev;
        drawRows();
      });
    });

    drawRows();
    HOS.subscribe("ledger", () => { if (document.body.contains(body)) drawRows(); });
  }
});

/* expose for debugging and external harnesses */
window.APPS = APPS;
