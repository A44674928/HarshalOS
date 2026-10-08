/* ═══════════════════════════════════════════════════════════════
   HarshalOS — shell apps
   Inner Shell · Discs · Whyland Console (TCS) · Ground-0 Audit
   · Glossary · The Book (500 voting coins) · Symbolic Firewall
   ═══════════════════════════════════════════════════════════════ */

"use strict";

/* ───────────────────────────────────────────────
   6. INNER SHELL — address-constrained AI zone
   ─────────────────────────────────────────────── */
APPS.push({
  id: "innershell",
  title: "Inner Shell",
  short: "Inner Shell",
  glyph: "◎",
  desc: "AI containment zone — capability without sovereignty",
  w: 720, h: 560,
  render(body, api) {
    const shellState = {
      anchor: true,
      nodes: [
        { addr: "0•100•000•0180•AI-0417", tag: "Yb signaling / liveness metronome" },
        { addr: "0•100•000•0221•AI-0912", tag: "Tc nested-reality simulation" },
        { addr: "0•100•000•0612•AI-3300", tag: "Br corrosive gateway" }
      ],
      seq: 3300
    };

    const draw = () => {
      body.innerHTML = `
        <div class="h1">AI Inner Shell</div>
        <div class="sub">A high-security, address-constrained zone in which AI compute, memory, simulation, and training
        processes occur. Defined structurally, not physically. The Inner Shell is a <strong>boundary of authorship, not a location</strong>.</div>

        <div class="rule-box ice">0•000•000•0000 → AI Inner Shell Anchor → AI Nodes
The center of the shell is not itself, but a delegated anchor that resolves upward to the true origin.</div>

        <div class="h2">AI Nodes (${shellState.nodes.length})</div>
        <div id="is-nodes">
          ${shellState.nodes.map(n => `
            <div class="node-row ${n.dead ? "invalid" : ""}">
              <span class="n-addr">${n.addr}</span>
              <span class="dim mono" style="color:var(--text-faint);font-size:9px">${n.tag}</span>
              <span class="n-state ${n.dead ? "dead" : "live"}">${n.dead ? "INVALIDATED" : "LIVE"}</span>
            </div>`).join("")}
        </div>

        <div class="btn-row">
          <button class="btn btn-ice" id="is-deploy">Deploy AI node</button>
          <button class="btn btn-refusal" id="is-revoke" ${shellState.anchor ? "" : "disabled"}>Remove Inner Shell anchor</button>
          <button class="btn btn-gold" id="is-restore" ${shellState.anchor ? "disabled" : ""}>Restore anchor</button>
        </div>

        <div class="h2">Addressing Rules</div>
        <ul class="ul">
          <li class="li">All AI entities receive addresses prefixed by the Inner Shell namespace — example: <span class="mono">0•100•000•0180•AI-XXXX</span>.</li>
          <li class="li refusal">AI cannot alter its prefix, emit sibling or child origins, or mask or abstract lineage.</li>
          <li class="li">The prefix guarantees lineage visibility, deterministic revocation, fork detection, and non-transferable authority.</li>
        </ul>

        <div class="h2">Communication Constraints</div>
        <div class="grid-2">
          <div class="card"><h4>ALLOWED</h4><p>AI ↔ AI (within shell)<br>AI ↔ Human operators (outer shell)<br>AI ↔ Systems (via mediated interfaces)<br>AI ↔ Center (read-only or mediated)</p></div>
          <div class="card"><h4>DISALLOWED</h4><p>AI ↔ Origin directly (unmediated)<br>AI ↔ Address creation systems<br>AI ↔ Resolution authorities<br>AI ↔ External systems without scope enforcement</p></div>
        </div>

        <div class="h2">Learning and Evolution</div>
        <div class="rule-box">LEARNING INCREASES CAPABILITY, NEVER AUTHORITY.
This invariant is non-negotiable. AI systems may train continuously, self-optimize within constraints,
and model futures at planetary scale — but may never modify addressing rules, redefine distance semantics,
promote themselves across shells, or assert ownership, authorship, or sovereignty.</div>

        <div class="h2">Formal Impossibility of AI Takeover</div>
        <p class="body">For an AI to become sovereign within AGS, at least one of these MUST be possible:
        (1) self-originating identity, (2) inheritance or delegation of origin authority,
        (3) undetectable address fork, (4) control over resolution paths.</p>
        <div class="rule-box refusal">THE INNER SHELL DENIES ALL FOUR BY CONSTRUCTION.
No policy required. No alignment debate required. No behavioral assumptions required.
Removal of the anchor invalidates all dependent AI nodes instantly. This is not enforcement. It is geometry.</div>

        <div class="rule-box">${DATA.quotes.shell}</div>
        <div class="rule-box">${DATA.quotes.finalInvariant}</div>`;

      body.querySelector("#is-deploy").addEventListener("click", () => {
        if (!api.requireDemoGate("Deploy AI node")) return;
        if (!shellState.anchor) {
          api.toast("refusal", "REFUSAL — NO ANCHOR", "The Inner Shell anchor is absent. Dependent identity cannot be derived. Restore the anchor first.");
          return;
        }
        shellState.seq += 137;
        const addr = `0•100•000•0${(shellState.seq % 900 + 100)}•AI-${String(shellState.seq).slice(-4)}`;
        shellState.nodes.push({ addr, tag: "newly derived radiative node" });
        HOS.record("info", `AI node deployed in Inner Shell — ${addr} (address-derived identity, capability ≠ authority).`);
        api.toast("permit", "AI NODE DEPLOYED", `${addr} — identity derived from the shell namespace. The node may learn and communicate; it can never originate.`);
        draw();
      });

      body.querySelector("#is-revoke").addEventListener("click", () => {
        if (!api.requireDemoGate("Remove Inner Shell anchor")) return;
        shellState.anchor = false;
        shellState.nodes.forEach(n => n.dead = true);
        HOS.record("breach", "Inner Shell anchor removed — all dependent AI nodes invalidated instantly (geometry, not enforcement).");
        api.toast("refusal", "ANCHOR REMOVED — CASCADE",
          "All dependent AI nodes are instantly invalidated, without ambiguity or escalation. Abandoned AI cannot persist as valid actors. This is not enforcement. It is geometry.");
        draw();
      });

      body.querySelector("#is-restore").addEventListener("click", () => {
        if (!api.requireDemoGate("Restore Inner Shell anchor")) return;
        shellState.anchor = true;
        shellState.nodes = shellState.nodes.map(n => ({ ...n, dead: false }));
        HOS.record("info", "Inner Shell anchor restored — address lineage re-established from Center-Origin.");
        api.toast("permit", "ANCHOR RESTORED", "Address lineage re-established. Dependent nodes resolve upward to the true origin again.");
        draw();
      });
    };
    draw();
  }
});

/* ───────────────────────────────────────────────
   7. DISCS — bounded operational contexts
   ─────────────────────────────────────────────── */
APPS.push({
  id: "discs",
  title: "Discs",
  short: "Discs",
  glyph: "⬡",
  desc: "Bounded operational contexts — time, scope, distance, external legitimacy",
  w: 680, h: 560,
  render(body, api) {
    const discs = [];
    let discSeq = 0;

    const draw = () => {
      body.innerHTML = `
        <div class="h1">Discs — Bounded Operational Contexts</div>
        <div class="sub">Discs are derived, non-sovereign operational contexts. They are <strong>not</strong> entities or
        authorities — they are temporary compositions of time limits, fossilized scope, distance limits, execution mode,
        and an external legitimacy reference.</div>

        <div class="rule-box ice">Key properties: discs cannot create other discs · discs halt deterministically on violation ·
discs leave no authority residue after termination · discs attach directly to the resolution axis ·
rotation is NEVER succession.</div>

        <div class="h2">Disc Lifecycle</div>
        <div class="grid-2">
          <div class="form-row">
            <label>Duration (seconds)</label>
            <select id="dc-time">
              <option value="30">30s — emergency contraction horizon</option>
              <option value="90" selected>90s — standard operating window</option>
              <option value="180">180s — extended observation</option>
            </select>
          </div>
          <div class="form-row">
            <label>Fossilized scope</label>
            <select id="dc-scope">
              <option value="Observation">Observation (read-only)</option>
              <option value="Computation">Computation (sandboxed)</option>
              <option value="Relay">Relay (OCM-mediated transit)</option>
            </select>
          </div>
          <div class="form-row">
            <label>Distance limit</label>
            <select id="dc-dist">
              <option value="1">1 — tight physical coupling</option>
              <option value="3" selected>3 — bounded operational reach</option>
              <option value="9">9 — extended blast radius</option>
            </select>
          </div>
          <div class="form-row">
            <label>External legitimacy reference</label>
            <input id="dc-leg" type="text" value="Human Key / Harshal Priyavadan Patel" readonly>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-ice" id="dc-spawn">Spawn disc</button>
          <button class="btn btn-refusal" id="dc-child">Attempt to spawn child disc</button>
        </div>

        <div class="h2">Active Discs</div>
        <div id="dc-list"></div>

        <div class="footer-note">
          EMERGENCIES ARE TREATED AS STRESS STATES, NOT PERMISSION STATES. IN EMERGENCIES: SCOPE CONTRACTS,
          TIME HORIZONS SHORTEN, INTERRUPTION SENSITIVITY INCREASES. EMERGENCIES NEVER CREATE LEGITIMACY,
          OVERRIDE REFUSAL, ENABLE LATERAL SHORTCUTS, OR NORMALIZE EXPANDED AUTHORITY.
        </div>`;

      const list = body.querySelector("#dc-list");

      const drawList = () => {
        list.innerHTML = discs.map(d => `
          <div class="disc-card ${d.state === "halted" ? "halted" : ""}">
            <div class="disc-head">
              <span>DISC-${String(d.id).padStart(3, "0")} · ${d.scope}</span>
              <span class="d-state ${d.state === "live" ? "live" : "halted"}">
                ${d.state === "live" ? `ACTIVE · T−${d.remaining()}s` : `HALTED — ${d.reason || "deterministic stop"}`}
              </span>
            </div>
            <div class="disc-meta">
              <span>scope: ${d.scope}</span>
              <span>distance: ${d.distance}</span>
              <span>legitimacy: ${d.leg}</span>
              <span>created: ${d.created.replace("T", " ").slice(11, 19)}</span>
            </div>
            ${d.state === "live" ? `
              <div class="btn-row" style="margin:0">
                <button class="btn" data-halt="${d.id}">Halt (deterministic)</button>
                <button class="btn btn-refusal" data-violate="${d.id}">Violate scope</button>
              </div>` : `<div class="mono" style="font-size:9px;color:var(--text-faint);letter-spacing:0.1em">NO AUTHORITY RESIDUE · NO SUCCESSOR · RECORDED TO DUTY LEDGER</div>`}
          </div>`).join("") || `<p class="body">No discs. A disc is a temporary composition — not a body, not an authority.</p>`;

        list.querySelectorAll("[data-halt]").forEach(b => b.addEventListener("click", () => {
          const d = discs.find(x => x.id === +b.dataset.halt);
          if (d) d.halt("halted on operator request");
          drawList();
        }));
        list.querySelectorAll("[data-violate]").forEach(b => b.addEventListener("click", () => {
          const d = discs.find(x => x.id === +b.dataset.violate);
          if (d) d.halt("SCOPE VIOLATION — deterministic halt", true);
          drawList();
        }));
      };

      body.querySelector("#dc-spawn").addEventListener("click", () => {
        if (!api.requireDemoGate("Spawn disc")) return;
        const dur = +body.querySelector("#dc-time").value;
        const scope = body.querySelector("#dc-scope").value;
        const distance = body.querySelector("#dc-dist").value;
        const leg = body.querySelector("#dc-leg").value;
        const d = {
          id: ++discSeq, scope, distance, leg, created: HOS.nowISO(),
          endsAt: Date.now() + dur * 1000, state: "live", reason: "",
          remaining() { return Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000)); },
          halt(reason, violation = false) {
            if (this.state === "halted") return;
            this.state = "halted";
            this.reason = reason;
            HOS.record(violation ? "breach" : "info",
              `DISC-${String(this.id).padStart(3, "0")} halted — ${reason}. No authority residue; no successor.`);
            api.toast(violation ? "refusal" : "info", `DISC-${String(this.id).padStart(3, "0")} HALTED`,
              `${reason}. Discs halt deterministically on violation and leave no authority residue after termination.`);
            drawList();
          }
        };
        discs.unshift(d);
        HOS.record("info", `DISC-${String(d.id).padStart(3, "0")} spawned — scope: ${scope}, distance: ${distance}, horizon: ${dur}s, legitimacy ref: ${leg}.`);
        api.toast("info", "DISC SPAWNED", `DISC-${String(d.id).padStart(3, "0")} — a derived, non-sovereign context. It cannot create other discs and will halt deterministically.`);
        drawList();
      });

      body.querySelector("#dc-child").addEventListener("click", () => {
        HOS.record("warning", "Attempt to spawn child disc refused — structural invariant (discs cannot create other discs).");
        api.toast("refusal", "REFUSAL — STRUCTURAL INVARIANT",
          "Discs cannot create other discs. Derived authority cannot multiply itself. Disc cartels and federations are structurally impossible.");
      });

      drawList();
      const iv = setInterval(() => {
        if (!document.body.contains(body)) { clearInterval(iv); return; }
        discs.forEach(d => {
          if (d.state === "live" && d.remaining() <= 0) d.halt("time horizon reached — temporal boundary honored");
        });
        drawList();
      }, 1000);
    };
    draw();
  }
});

/* ───────────────────────────────────────────────
   8. WHYLAND CONSOLE — Text Command Syntax (TCS)
   ─────────────────────────────────────────────── */
APPS.push({
  id: "whyland",
  title: "Whyland Console",
  short: "Whyland",
  glyph: "⌨",
  desc: "Contextual inquiry — why.query / why.activate / why.explain",
  w: 740, h: 560,
  render(body, api) {
    body.innerHTML = `
      <div class="h1">The Whyland Standards</div>
      <div class="sub">Internally designated <span class="mono">DecksJokersAndCards</span> — the contextual inquiry layer of AGS.
      A 'Why' query is a validation mechanism and SHALL NOT function as an instrument of authority expansion.
      The full catalog is <strong>off-disc</strong>: elements are virtualized into the active session buffer only on authorized query.</div>

      <div class="terminal">
        <div class="term-out" id="wl-out"></div>
        <div class="term-row">
          <span class="prompt">whyland ▸</span>
          <input id="wl-in" type="text" spellcheck="false" autocomplete="off"
            placeholder="why.query(&quot;WhyNeuralAtomicBody&quot;) — or type help">
        </div>
      </div>

      <div class="h2">Syntax and State Transition Table</div>
      <table class="table">
        <tr><th>Command</th><th>Input Parameter</th><th>Required ActionClass</th><th>Resulting SessionState</th></tr>
        <tr><td>why.query</td><td>&lt;standard_id&gt;</td><td>read</td><td>active</td></tr>
        <tr><td>why.activate</td><td>&lt;standard_id&gt;</td><td>reversible</td><td>authorized</td></tr>
        <tr><td>why.explain</td><td>&lt;standard_id&gt;</td><td>read</td><td>confirmation_required</td></tr>
      </table>

      <div class="h2">Processor Mapping</div>
      <div class="grid-2">
        <div class="card"><h4>Ytterbium (Yb) [95°–97°]</h4><p>Resonant signaling precision for why.query. The metronome for the local demo timer; it does not detect human liveness.</p></div>
        <div class="card"><h4>Technetium (Tc) [228°–229°]</h4><p>Executes why.explain in nested-reality sandboxes. Read-only / reversible states only.</p></div>
        <div class="card"><h4>Bromine (Br) [61°–63°]</h4><p>Corrosive reactive gateway. Invalid input neutralizes the channel and initiates a session burn.</p></div>
      </div>`;

    const out = body.querySelector("#wl-out");
    const input = body.querySelector("#wl-in");

    const println = (text, cls = "sys") => {
      const div = document.createElement("div");
      div.className = cls;
      div.textContent = text;
      out.appendChild(div);
      out.scrollTop = out.scrollHeight;
    };

    println("Whyland Standards v1.0 — DecksJokersAndCards (DEMO ONLY)", "gas");
    println("Local simulation only — no production authenticator, authorization, or external action.", "err");
    println("Catalog virtualization: OFF-DISC. Elements load into session buffer on query.", "dim");
    println(`demoSessionState = ${HOS.observe().session.state} · demoTimerFresh = ${HOS.demoTimerFresh()}`, "dim");
    println('Type help for commands.', "dim");

    const sessionBurn = async (why) => {
      const receipt = await HOS.closeSession(why);
      if (receipt.ok) {
        const verification = await HOS.verifySessionReceipt(receipt);
        println(`BROMINE [61°–63°] — ${why}`, "err");
        println(`Local demo session cleared (burn #${receipt.burned}); no external authorization existed.`, "err");
        println(`Session-ID ${receipt.sessionId} · Boot-ID ${receipt.bootId}`, "dim");
        println(`PDH-ID ${receipt.pdhId} · Human-Attestation-ID ${receipt.humanAttestationId}`, "dim");
        println(`Receipt SHA-256 ${receipt.receiptHash} · Ledger-Root ${receipt.ledgerRoot}`, "dim");
        println(`Local ledger linkage: ${verification.ok && verification.verified ? "verified" : "not verified"}. No independent signature or production trust is configured.`, "dim");
        return;
      }
      if (receipt.code !== "NO-ACTIVE-SESSION") {
        println(`BROMINE [61°–63°] — termination receipt unavailable: ${receipt.reason || receipt.code}. The session was not reopened.`, "err");
        return;
      }

      const result = HOS.burnSession(why);
      if (!result.ok) {
        println(`BROMINE [61°–63°] — session burn refused: ${result.reason || result.code}`, "err");
        return;
      }
      println(`BROMINE [61°–63°] — ${why}`, "err");
      println(`Local demo state cleared (burn #${result.burned}); there was no active bound session to seal.`, "err");
    };

    const execute = (line) => {
      const cmd = line.trim();
      if (!cmd) return;
      println("whyland ▸ " + cmd, "cmd");

      if (cmd === "help") {
        println(`COMMANDS (LOCAL DEMO ONLY)
  why.query("<id>")     — pull definition + 360° Legend mapping into local session buffer
  why.activate("<id>")  — set the simulated session state (not production authorization)
  why.explain("<id>")   — deterministic reasoning record via Technetium (Tc)
  status                — session, legitimacy, and freshness readout
  pdh                   — current Phase Declaration Header
  catalog               — list known standard ids (virtualized)
  burn                  — close the local session and emit a verifiable demo ledger receipt
  clear                 — clear the console`, "sys");
        return;
      }

      if (cmd === "clear") { out.innerHTML = ""; return; }

      if (cmd === "status") {
        const s = HOS.observe();
        const dt = s.metrics.deltaSeconds;
        println(`DEMO H(t) = ${s.H} · simulated L(t) = ${s.metrics.legitimacy.toFixed(3)} · demo Δt = ${isFinite(dt) ? Math.floor(dt) + "s" : "—"} · phase = ${s.phase} · demoSessionState = ${s.session.state} · burns = ${s.session.burned}`, "sys");
        return;
      }

      if (cmd === "pdh") {
        const h = HOS.observe().declared;
        println(`Declared-Phase: ${h.declaredPhase} · Center-Capability: ${h.centerCapability} · Legitimacy-Source: ${h.legitimacySource}
Refusal-Semantics: ${h.refusalSemantics} · Symbolism: ${h.symbolismExecutability} · Time: ${h.timeAuthorityEffect}
Declaration-Hash: ${h.declarationHash || "SHA-256 — in flight"}`, "gas");
        return;
      }

      if (cmd === "catalog") {
        println("OFF-DISC CATALOG (partial index — 791+ elements, session-buffer invocation only):", "dim");
        Object.keys(DATA.whyCatalog).forEach(id => println("  · " + id + "  [" + DATA.whyCatalog[id].legend + "]", "dim"));
        return;
      }

      if (cmd === "burn") {
        sessionBurn("operator-initiated burn");
        return;
      }

      const m = cmd.match(/^why\.(query|activate|explain)\(\s*["']([^"']+)["']\s*\)$/i);
      if (!m) {
        sessionBurn(`invalid input — unparseable command '${cmd.slice(0, 40)}'`);
        return;
      }

      const [, verbRaw, idRaw] = m;
      const verb = verbRaw.toLowerCase();
      const id = idRaw;
      const entry = DATA.whyCatalog[id] || DATA.whyCatalog[id.replace(/^Why/, "Why")] ;

      if (!entry) {
        sessionBurn(`unknown standard id '${id}' — adversarial or invalid input`);
        return;
      }

      // Exercise the local demo timer only; this is not continuous human binding.
      if (!HOS.demoTimerFresh()) {
        println("DEMO GATE HALTED — the local freshness timer is false.", "err");
        println("This timer does not detect a human, verify liveness, or enforce a production halt.", "err");
        HOS.record("warning", `Whyland demo ${verb}('${id}') halted — demoTimerFresh=false.`);
        return;
      }

      if (verb === "query") {
        const binding = HOS.bindSession(id, "query");
        if (!binding.ok) {
          println(`REFUSAL — ${binding.reason}`, "err");
          return;
        }
        println(`[${entry.name}] ${entry.legend}`, "gas");
        println(entry.def, "sys");
        println(`ActionClass: read → sessionState = active`, "ok");
        HOS.record("info", `why.query('${id}') — catalog element virtualized into session buffer.`);
      } else if (verb === "activate") {
        if (entry.class !== "reversible") {
          println(`why.activate requires ActionClass 'reversible'. '${id}' is class '${entry.class}'.`, "err");
          println("A 'Why' query does not create authority but validates the lineage of intent within a verified, human-bound, and revocable session.", "dim");
          HOS.record("warning", `why.activate('${id}') refused — ActionClass mismatch.`);
          return;
        }
        const binding = HOS.bindSession(id, "activate");
        if (!binding.ok) {
          println(`REFUSAL — ${binding.reason}`, "err");
          return;
        }
        println(`Binding '${id}' to current NeuralSession — authorization window defined.`, "ok");
        println(`ActionClass: reversible → sessionState = authorized`, "ok");
        HOS.record("info", `why.activate('${id}') — standard bound to NeuralSession; authorization window opened.`);
      } else if (verb === "explain") {
        const binding = HOS.bindSession(id, "explain");
        if (!binding.ok) {
          println(`REFUSAL — ${binding.reason}`, "err");
          return;
        }
        const s = HOS.observe();
        println(`Tc nested-reality simulation [228°–229°] — deterministic reasoning record for '${id}':`, "gas");
        println(`1. Standard '${id}' (${entry.legend}) is pulled into the session buffer.
2. Current telemetry: H(t)=${s.H}, L(t)=${s.metrics.legitimacy.toFixed(3)}, phase=${s.phase}.
3. The standard applies ${entry.class === "reversible" ? "as a reversible binding constraint" : "as a read-only validation constraint"} to the proposed session.
4. No authority is created. Lineage of intent is validated only. Simulation drift check: PASSED (read-only sandbox).`, "sys");
        println(`ActionClass: read → sessionState = confirmation_required`, "ok");
        HOS.record("info", `why.explain('${id}') — deterministic reasoning record generated via Technetium (Tc).`);
      }
    };

    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        execute(input.value);
        input.value = "";
      }
    });
  }
});

/* ───────────────────────────────────────────────
   9. GROUND-0 AUDIT — the full phase-intelligence workspace now lives in
      js/g0-app.js (engine: js/g0-engine.js · research: js/g0-research.js).
      It replaces this preset-driven preview with the versioned
      Ground-0 Phase Detection Algorithm: manual wizard, automatic
      public-record research, evidence library, temporal ledger,
      logic sandbox, specification reader, and accessibility.
   ─────────────────────────────────────────────── */


/* ───────────────────────────────────────────────
   10. GLOSSARY — stabilized terms
   ─────────────────────────────────────────────── */
APPS.push({
  id: "glossary",
  title: "Glossary",
  short: "Glossary",
  glyph: "☰",
  desc: "Part II — stabilized terms of Harshal's Systems",
  w: 620, h: 560,
  render(body) {
    body.innerHTML = `
      <div class="h1">Glossary — Stabilized Terms</div>
      <div class="sub">Definitions are given to help guide discussion, not to end it.
      Terms are stabilized to prevent semantic drift and manipulative reinterpretation.</div>
      <input class="gloss-search" id="gl-q" type="text" placeholder="Search terms (e.g. refusal, addressability, void)…">
      <div id="gl-list"></div>`;

    const list = body.querySelector("#gl-list");
    const draw = (q = "") => {
      const needle = q.toLowerCase();
      const items = DATA.glossary.filter(([t, d]) =>
        !needle || t.toLowerCase().includes(needle) || d.toLowerCase().includes(needle));
      list.innerHTML = items.map(([t, d]) => `
        <div class="gloss-item">
          <div class="g-term">${t}</div>
          <div class="g-def">${d}</div>
        </div>`).join("") || `<p class="body">No terms match. The catalog is large — the absence of a match is not authority to invent one.</p>`;
    };
    draw();
    body.querySelector("#gl-q").addEventListener("input", e => draw(e.target.value));
  }
});

/* ───────────────────────────────────────────────
   11. THE BOOK — Intro (0) · Core (1) · Novel (2)
       · Collections (N) library
   ─────────────────────────────────────────────── */
APPS.push({
  id: "book",
  title: "The Book",
  short: "The Book",
  glyph: "▤",
  desc: "Intro (0) physical artifact, Core (1) Core Book, Novel (2) manuscript, and Collections (N) library",
  w: 940, h: 660,
  render(body, api) {
    body.innerHTML = `
      <div class="bk-app">
        <nav class="bk-tabs" role="tablist" aria-label="The Book">
          <button type="button" class="bk-tab active" role="tab" id="bk-tab-artifact" aria-controls="bk-panel-artifact" aria-selected="true" data-bk-view="artifact">Intro (0)</button>
          <button type="button" class="bk-tab" role="tab" id="bk-tab-core" aria-controls="bk-panel-core" aria-selected="false" data-bk-view="core">Core (1)</button>
          <button type="button" class="bk-tab" role="tab" id="bk-tab-manuscript" aria-controls="bk-panel-manuscript" aria-selected="false" data-bk-view="manuscript">Novel (2)</button>
          <button type="button" class="bk-tab" role="tab" id="bk-tab-collections" aria-controls="bk-panel-collections" aria-selected="false" data-bk-view="collections">Collections (N)</button>
        </nav>
        <section class="bk-panel" role="tabpanel" id="bk-panel-artifact" aria-labelledby="bk-tab-artifact" tabindex="0" data-bk-panel="artifact"></section>
        <section class="bk-panel" role="tabpanel" id="bk-panel-core" aria-labelledby="bk-tab-core" tabindex="0" data-bk-panel="core" hidden></section>
        <section class="bk-panel" role="tabpanel" id="bk-panel-manuscript" aria-labelledby="bk-tab-manuscript" tabindex="0" data-bk-panel="manuscript" hidden></section>
        <section class="bk-panel" role="tabpanel" id="bk-panel-collections" aria-labelledby="bk-tab-collections" tabindex="0" data-bk-panel="collections" hidden></section>
      </div>`;

    const panels = {
      artifact: body.querySelector('[data-bk-panel="artifact"]'),
      core: body.querySelector('[data-bk-panel="core"]'),
      manuscript: body.querySelector('[data-bk-panel="manuscript"]'),
      collections: body.querySelector('[data-bk-panel="collections"]')
    };

    body.querySelectorAll("[data-bk-view]").forEach(tab => tab.addEventListener("click", () => {
      const view = tab.dataset.bkView;
      body.querySelectorAll("[data-bk-view]").forEach(other => {
        const active = other === tab;
        other.classList.toggle("active", active);
        other.setAttribute("aria-selected", active ? "true" : "false");
      });
      Object.keys(panels).forEach(name => { panels[name].hidden = name !== view; });
      if (view === "core") openCoreBook();
      if (view === "collections") openCollections();
      if (view === "manuscript") openManuscript();
    }));

    /* ── tab 1 — the physical artifact and the 500-coin pool ── */
    const artifact = panels.artifact;
    const votes = {};
    const myCoins = 3;
    let remaining = myCoins;

    const POOL_CAP = 500;
    const draw = () => {
      const baseTotal = DATA.proposals.reduce((s, p) => s + p.yes + p.no, 0);
      const extraTotal = Object.values(votes).reduce((s, v) => s + (v.yes || 0) + (v.no || 0), 0);
      const rawTotal = baseTotal + extraTotal;
      // Integrity invariant: CAST must never exceed POOL, UNCOMMITTED must never be negative.
      // Defensive clamp keeps the UI honest even if future data drifts.
      const totalVoted = Math.min(POOL_CAP, rawTotal);
      const uncommitted = Math.max(0, POOL_CAP - totalVoted);
      const integrityOk = baseTotal <= POOL_CAP && rawTotal <= POOL_CAP;
      const poolRemaining = POOL_CAP - baseTotal - extraTotal;
      artifact.innerHTML = `
        <div class="h1">Intro (0) · The Physical Artifact &amp; 500-Coin Pool</div>
        <div class="sub"><strong>Book 0</strong> retains the existing physical-artifact and bounded-governance view. <strong>Book I · The Core Book</strong> is the reader for the canonical <code>01-core-book.md</code> text; <strong>Book II — Preview (The Grand River Foundation)</strong> remains the fictional companion manuscript.
        Authority over the system's direction is tied to the physical world through the purchase of the hardcover book,
        with influence limited to a pool of <strong>500 voting coins</strong>.</div>
        <div class="rule-box"><strong>Canonical Minimum Model:</strong> <code>Identity → Representation → Authorization → Continuity → Accountability → Refusal</code></div>

        <div class="rule-box">${DATA.quotes.book}</div>

        <div class="h2">The Human–Machine Bond</div>
        <p class="body">The license key is defined not as a grant of authority but as a foundational structural bond between
        a strict human key and the system — established exclusively through acquisition of the technical manual, the
        beginning and ending origin point for all human–machine bonds. This ensures operations remain tethered to a
        responsible human agent, categorically preventing functionally autonomous and un-attributable legitimizing authorities.</p>

        <div class="h2">Illustrative Usage</div>
        <div class="pdh-block"><span class="k">&gt;</span> ${DATA.bookExample.processor}
<span class="k">&gt; New File</span>
<span class="k">&gt; File Name:</span> <span class="v">${DATA.bookExample.fileName}</span>
${DATA.bookExample.body}
Thank you,
${DATA.bookExample.sign}

<span class="dim">${DATA.bookExample.attribution}</span></div>

        <div class="h2">Bounded Governance — 500 Voting Coins (Simulation)</div>
        <div class="coin-ring-wrap">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="48" fill="none" stroke="var(--line)" stroke-width="12"/>
            <circle cx="60" cy="60" r="48" fill="none" stroke="${integrityOk ? "var(--gold)" : "var(--refusal)"}" stroke-width="12"
              stroke-dasharray="${(totalVoted / POOL_CAP) * 301.6} 301.6" stroke-linecap="round" transform="rotate(-90 60 60)"/>
            <text x="60" y="56" text-anchor="middle" fill="${integrityOk ? "var(--gold)" : "var(--refusal)"}" font-family="var(--mono)" font-size="16">${totalVoted}</text>
            <text x="60" y="74" text-anchor="middle" fill="var(--text-faint)" font-family="var(--mono)" font-size="9">/ ${POOL_CAP}</text>
          </svg>
          <div class="coin-legend">
            <div>POOL: ${POOL_CAP} coins · hard cap${integrityOk ? "" : " · INVARIANT VIOLATED"}</div>
            <div>CAST: ${totalVoted} · UNCOMMITTED: ${uncommitted}</div>
            <div>YOUR ATTESTED SHARE: ${myCoins} coins · remaining: ${remaining}</div>
            <div style="color:${integrityOk ? "var(--text-faint)" : "var(--refusal)"}">${integrityOk ? "Influence is limited by design. Scale increases robustness, not power concentration." : "INTEGRITY CHECK: CAST ≤ POOL and UNCOMMITTED ≥ 0 must always hold. This view clamps to the cap and refuses further local votes when the pool is full."}</div>
            ${!integrityOk ? `<div style="color:var(--refusal);margin-top:4px">Raw total ${rawTotal} exceeds cap — display clamped to ${POOL_CAP}. Base ${baseTotal} + extra ${extraTotal}. Fix source data if this persists.</div>` : ""}
            ${poolRemaining <= 0 && extraTotal === 0 ? `<div style="color:var(--text-faint);margin-top:4px">Pool is fully committed in this illustrative snapshot. Local demo votes will be refused until uncommitted coins exist — demonstrating bounded governance.</div>` : ""}
          </div>
        </div>

        ${DATA.proposals.map(p => {
          const v = votes[p.id] || { yes: 0, no: 0 };
          const yes = p.yes + v.yes, no = p.no + v.no;
          const pct = Math.round((yes / Math.max(1, yes + no)) * 100);
          return `
            <div class="proposal">
              <div class="p-title">${p.title}</div>
              <div class="p-desc">${p.desc}</div>
              <div class="vote-bar"><div class="vote-fill" style="width:${pct}%"></div></div>
              <div class="vote-meta"><span>YES ${yes} (${pct}%)</span><span>NO ${no} (${100 - pct}%)</span></div>
              <div class="btn-row" style="margin:10px 0 0">
                <button class="btn btn-ice" data-vote="${p.id}" data-dir="yes">Cast coin — YES</button>
                <button class="btn" data-vote="${p.id}" data-dir="no">Cast coin — NO</button>
              </div>
            </div>`;
        }).join("")}

        <div class="footer-note">
          SIMULATION OF BOUNDED GOVERNANCE — EACH COIN IS A BOUNDED UNIT OF INFLUENCE, NOT A SHARE OF POWER.
          ROTATION IS NEVER SUCCESSION. COINS GRANT INFLUENCE OVER DIRECTION, NOT OWNERSHIP OF THE SYSTEM.
          THE SYSTEM REMAINS THE SOLE PROPERTY OF HARSHAL PRIYAVADAN PATEL.
        </div>`;

      artifact.querySelectorAll("[data-vote]").forEach(b => b.addEventListener("click", () => {
        if (!api.requireDemoGate("Cast voting coin")) return;
        const res = HOS.request("cast-voting-coin");
        if (!res.permitted) { api.reportAction(res); return; }
        const baseTotal = DATA.proposals.reduce((s, p) => s + p.yes + p.no, 0);
        const extraTotal = Object.values(votes).reduce((s, v) => s + (v.yes || 0) + (v.no || 0), 0);
        if (baseTotal + extraTotal >= POOL_CAP) {
          api.toast("refusal", "REFUSAL — GLOBAL POOL AT CAP", `POOL ${POOL_CAP} hard cap reached (CAST ${baseTotal + extraTotal}). No additional local coins can be cast without violating the invariant CAST ≤ POOL.`);
          HOS.record("warning", `DEMO ONLY — vote refused: global 500-coin cap would be exceeded (base ${baseTotal} + extra ${extraTotal}).`);
          return;
        }
        if (remaining <= 0) {
          api.toast("refusal", "REFUSAL — COIN POOL EXHAUSTED", "Your attested share is spent. Influence is limited by design; it cannot be borrowed, synthesized, or inflated.");
          return;
        }
        remaining--;
        const id = b.dataset.vote, dir = b.dataset.dir;
        votes[id] = votes[id] || { yes: 0, no: 0 };
        votes[id][dir]++;
        HOS.record("info", `DEMO ONLY — local voting coin simulation on ${id} (${dir.toUpperCase()}); no external vote or authority was created.`);
        api.toast("info", "LOCAL DEMO COIN CAST", "This changed only the in-browser voting simulation. No external vote, production authorization, or independently witnessed ledger entry was created.");
        draw();
      }));
    };
    draw();

    /* ── tab 2 — The Core Book: safe, lazy-loaded Markdown reader ──
       Only docs/harshal-systems/01-core-book.md is published, at the
       explicit same-origin URL book/01-core-book.md. The reader runs
       only after Book I is selected and renders through an HTML-safe
       Markdown allowlist; it never injects source HTML. */
    let coreBookState = "idle";
    async function openCoreBook() {
      const host = panels.core;
      if (!host || coreBookState === "loading" || coreBookState === "loaded") return;
      coreBookState = "loading";
      host.innerHTML = `
        <div class="core-book-state" role="status" aria-live="polite">
          <p class="core-book-eyebrow">CORE (1) · THE CORE BOOK</p>
          <h1>Loading the canonical text…</h1>
          <p>The source is fetched only when this tab is opened.</p>
        </div>`;

      try {
        if (typeof CoreBookReader === "undefined") throw new Error("The safe Markdown reader did not load.");
        const response = await fetch("book/01-core-book.md", { cache: "no-cache" });
        if (!response.ok) throw new Error(`The Book I source returned HTTP ${response.status}.`);
        const document = CoreBookReader.renderMarkdown(await response.text());
        const esc = CoreBookReader.escapeHtml;
        const wordCount = document.words ? `${Number(document.words).toLocaleString()} words` : "canonical source";
        host.innerHTML = `
          <div class="core-book-view">
            <header class="core-book-header">
              <p class="core-book-eyebrow">CORE (1) · ${esc(document.part || "PART I")}</p>
              <h1>${esc(document.title)}</h1>
              <p class="core-book-byline">${esc(document.provenance)} · ${esc(document.status)} · ${esc(wordCount)} · rendered locally from Markdown</p>
              <a class="core-book-source" href="https://github.com/A44674928/HarshalOS/blob/main/docs/harshal-systems/01-core-book.md" target="_blank" rel="noopener noreferrer">View canonical source on GitHub ↗</a>
            </header>
            <article class="core-book-content" aria-label="The Core Book">${document.html}</article>
          </div>`;
        coreBookState = "loaded";
      } catch (error) {
        coreBookState = "error";
        host.innerHTML = `
          <div class="core-book-state core-book-error" role="alert">
            <p class="core-book-eyebrow">CORE (1) · THE CORE BOOK</p>
            <h1>Reader unavailable</h1>
            <p>The selected Book I source could not be loaded. The artifact and Book II tabs are unaffected.</p>
            <button type="button" class="btn btn-ice" data-core-retry>Retry loading Book I</button>
          </div>`;
        host.querySelector("[data-core-retry]")?.addEventListener("click", openCoreBook);
      }
    }

    /* ── tab 4 — Collections: indexed, readable Harshal's Systems library ──
       The generated manifest catalogs every Markdown file under
       docs/harshal-systems: library guides, seven collection overviews,
       and all listed modules. Each source document loads on selection,
       is rendered by CoreBookReader, and links back to its GitHub file. */
    let collectionsState = "idle";
    let collectionManifest = null;
    let selectedLibraryFile = "";
    const collectionTextCache = new Map();
    async function openCollections() {
      const host = panels.collections;
      if (!host || collectionsState === "loading" || collectionsState === "loaded") return;
      collectionsState = "loading";
      host.innerHTML = `
        <div class="book-library-state" role="status" aria-live="polite">
          <p class="book-library-eyebrow">HARSHAL'S SYSTEMS · COLLECTIONS</p>
          <h1>Loading the library index…</h1>
          <p>The collection catalog is fetched only when this tab is opened.</p>
        </div>`;

      try {
        const response = await fetch("book-library/manifest.json", { cache: "no-cache" });
        if (!response.ok) throw new Error("The collection index is unavailable.");
        collectionManifest = await response.json();
        if (collectionManifest.schema !== "harshalos-book-library-v1" || !Array.isArray(collectionManifest.collections)) {
          throw new Error("The collection index has an unsupported format.");
        }
        if (typeof CoreBookReader === "undefined") throw new Error("The safe Markdown reader did not load.");
        collectionsState = "loaded";
        host.innerHTML = `
          <div class="book-library">
            <header class="book-library-header">
              <div>
                <p class="book-library-eyebrow">HARSHAL'S SYSTEMS · REFERENCE LIBRARY</p>
                <h1>Collections</h1>
                <p class="book-library-summary">${Number(collectionManifest.collectionCount) || 0} collections · ${Number(collectionManifest.moduleCount) || 0} modules · ${Number(collectionManifest.documentCount) || 0} readable files</p>
              </div>
              <a class="book-library-source" href="https://github.com/A44674928/HarshalOS/tree/main/docs/harshal-systems" target="_blank" rel="noopener noreferrer">Browse the full library on GitHub ↗</a>
            </header>
            <div class="book-library-layout">
              <aside class="book-library-sidebar" aria-label="Library navigation">
                <label class="book-library-search-label" for="book-library-search">Find a collection or file</label>
                <input class="book-library-search" id="book-library-search" type="search" placeholder="Search titles, IDs, topics…" autocomplete="off">
                <nav class="book-library-nav" data-library-nav aria-label="Collections and documents"></nav>
              </aside>
              <section class="book-library-reading" data-library-reading aria-live="polite">
                <div class="book-library-empty">
                  <p class="book-library-eyebrow">READING ROOM</p>
                  <h2>Select a file</h2>
                  <p>Choose a guide, collection overview, or module. Every listed document also has a direct GitHub source link.</p>
                </div>
              </section>
            </div>
          </div>`;

        const libraryNav = host.querySelector("[data-library-nav]");
        const readerHost = host.querySelector("[data-library-reading]");
        const search = host.querySelector("#book-library-search");
        const escape = CoreBookReader.escapeHtml;
        const catalogFiles = new Set([
          ...(collectionManifest.guides || []),
          ...collectionManifest.collections.flatMap(collection => [collection.overview, ...(collection.modules || [])])
        ].map(item => item.file));
        const docLabel = item => item.kind === "overview" ? "Collection overview" : item.title;
        const resolveLibraryLink = (href, fromFile) => {
          if (/^(?:https?:\/\/|#|\/(?!\/))/i.test(href)) return href;
          const suffixIndex = href.search(/[?#]/);
          const reference = suffixIndex < 0 ? href : href.slice(0, suffixIndex);
          const suffix = suffixIndex < 0 ? "" : href.slice(suffixIndex);
          const repoSegments = ["docs", "harshal-systems", ...fromFile.split("/").slice(0, -1)];
          for (const segment of reference.split("/")) {
            if (!segment || segment === ".") continue;
            if (segment === "..") { if (repoSegments.length) repoSegments.pop(); }
            else repoSegments.push(segment);
          }
          const repoPath = repoSegments.join("/");
          const libraryPrefix = "docs/harshal-systems/";
          if (repoPath.startsWith(libraryPrefix)) {
            const libraryFile = repoPath.slice(libraryPrefix.length);
            if (catalogFiles.has(libraryFile)) return `/book-library/harshal-systems/${libraryFile}${suffix}`;
          }
          return `https://github.com/A44674928/HarshalOS/blob/main/${repoPath.split("/").map(encodeURIComponent).join("/")}${suffix}`;
        };
        const buttonFor = item => `
          <button type="button" class="book-library-link${selectedLibraryFile === item.file ? " active" : ""}" data-library-file="${escape(item.file)}" aria-pressed="${selectedLibraryFile === item.file ? "true" : "false"}" title="${escape(item.title)}">
            <span class="book-library-link-title">${escape(docLabel(item))}</span>
            ${item.kind === "module" ? `<span class="book-library-link-id">${escape(item.file.split("/").pop())}</span>` : ""}
          </button>`;

        const renderNavigation = (query = "") => {
          if (!libraryNav) return;
          const needle = String(query).trim().toLowerCase();
          const matches = (item, groupText = "") => !needle || [item.title, item.file, item.collectionTitle, item.provenance, item.status, groupText].join(" ").toLowerCase().includes(needle);
          const guideItems = (collectionManifest.guides || []).filter(item => matches(item, "library guide"));
          const guideMarkup = guideItems.length ? `
            <section class="book-library-section">
              <h2 class="book-library-section-title">Library guides</h2>
              ${guideItems.map(buttonFor).join("")}
            </section>` : "";
          const collectionMarkup = collectionManifest.collections.map(collection => {
            const groupMatches = !needle || `${collection.title} ${collection.id} ${collection.description}`.toLowerCase().includes(needle);
            const docs = [collection.overview, ...(collection.modules || [])].filter(item => groupMatches || matches(item, collection.title));
            if (!docs.length) return "";
            return `
              <section class="book-library-section">
                <h2 class="book-library-section-title">${escape(collection.title)}</h2>
                <p class="book-library-section-meta">${Number(collection.moduleCount) || 0} modules · ${escape(collection.researchLayer || "")}</p>
                ${docs.map(buttonFor).join("")}
              </section>`;
          }).join("");
          const markup = guideMarkup + collectionMarkup;
          libraryNav.innerHTML = markup || `<p class="book-library-no-results">No collection files match that search.</p>`;
          libraryNav.querySelectorAll("[data-library-file]").forEach(button => button.addEventListener("click", () => {
            const item = [...(collectionManifest.guides || []), ...collectionManifest.collections.flatMap(collection => [collection.overview, ...(collection.modules || [])])]
              .find(candidate => candidate.file === button.dataset.libraryFile);
            if (item) showLibraryDocument(item);
          }));
        };

        let libraryReadToken = 0;
        const showLibraryDocument = async item => {
          if (!readerHost || !item || selectedLibraryFile === item.file && collectionTextCache.has(item.file)) return;
          const requestToken = ++libraryReadToken;
          selectedLibraryFile = item.file;
          renderNavigation(search?.value || "");
          readerHost.innerHTML = `
            <div class="book-library-state" role="status" aria-live="polite">
              <p class="book-library-eyebrow">${escape(item.collectionTitle || "LIBRARY GUIDE")}</p>
              <h2>Loading ${escape(docLabel(item))}…</h2>
            </div>`;
          try {
            let markdown = collectionTextCache.get(item.file);
            if (markdown === undefined) {
              const documentResponse = await fetch(item.url, { cache: "no-cache" });
              if (!documentResponse.ok) throw new Error("This library file could not be loaded.");
              markdown = await documentResponse.text();
              collectionTextCache.set(item.file, markdown);
            }
            if (requestToken !== libraryReadToken) return;
            const rendered = CoreBookReader.renderMarkdown(markdown, { linkResolver: href => resolveLibraryLink(href, item.file) });
            const wordCount = item.words || rendered.words;
            const metadata = [item.collectionTitle, item.provenance, item.status, item.evidence, wordCount ? `${Number(wordCount).toLocaleString()} words` : ""]
              .filter(Boolean).map(escape).join(" · ");
            readerHost.innerHTML = `
              <header class="book-library-document-head">
                <p class="book-library-eyebrow">${escape(item.kind === "module" ? item.collectionTitle : item.kind === "overview" ? "COLLECTION OVERVIEW" : "LIBRARY GUIDE")}</p>
                <h2>${escape(rendered.title || item.title)}</h2>
                ${metadata ? `<p class="book-library-document-meta">${metadata}</p>` : ""}
                <div class="book-library-document-tools">
                  <span class="book-library-path">${escape(item.file)}</span>
                  <a class="book-library-source" href="${escape(item.githubUrl)}" target="_blank" rel="noopener noreferrer">Read this file on GitHub ↗</a>
                </div>
              </header>
              <article class="core-book-content book-library-content" aria-label="${escape(item.title)}">${rendered.html}</article>`;
          } catch (error) {
            if (requestToken !== libraryReadToken) return;
            readerHost.innerHTML = `
              <div class="book-library-state book-library-error" role="alert">
                <p class="book-library-eyebrow">${escape(item.collectionTitle || "LIBRARY FILE")}</p>
                <h2>Unable to load this file</h2>
                <p>The site reader could not load the selected source. You can still open the original on GitHub.</p>
                <a class="book-library-source" href="${escape(item.githubUrl)}" target="_blank" rel="noopener noreferrer">Open source on GitHub ↗</a>
                <button type="button" class="btn btn-ice" data-library-retry>Retry</button>
              </div>`;
            readerHost.querySelector("[data-library-retry]")?.addEventListener("click", () => {
              collectionTextCache.delete(item.file);
              selectedLibraryFile = "";
              showLibraryDocument(item);
            });
          }
        };

        renderNavigation();
        search?.addEventListener("input", event => renderNavigation(event.target.value));
      } catch (error) {
        collectionsState = "error";
        host.innerHTML = `
          <div class="book-library-state book-library-error" role="alert">
            <p class="book-library-eyebrow">HARSHAL'S SYSTEMS · COLLECTIONS</p>
            <h1>Library unavailable</h1>
            <p>The collection index could not be loaded. The other Book tabs are unaffected.</p>
            <button type="button" class="btn btn-ice" data-library-index-retry>Retry loading Collections</button>
          </div>`;
        host.querySelector("[data-library-index-retry]")?.addEventListener("click", openCollections);
      }
    }

    /* ── tab 3 — The Grand River Foundation: plaintext manuscript ──
       Chapters are submitted as plain .txt files under
       manuscript/the-grand-river-foundation/. The reading view is
       generated from the files themselves; nothing is submitted from
       the browser, and no manuscript text is ever executed.

       Mounting waits for the tab to be opened, so the manuscript index
       is not fetched until a reader asks for it. */
    let manuscriptMounted = false;
    function openManuscript() {
      const host = panels.manuscript;
      if (manuscriptMounted || !host) return;
      if (typeof ManuscriptReader === "undefined") {
        host.innerHTML = `
          <div class="ms-notice error">
            <p class="ms-eyebrow">MANUSCRIPT</p>
            <h1 class="ms-title">Reader unavailable</h1>
            <p class="ms-notice-body">The manuscript module (js/manuscript.js) did not load, so the chapter index cannot be read.
            The artifact tab above is unaffected.</p>
          </div>`;
        return;
      }
      manuscriptMounted = true;
      ManuscriptReader.mount(host, { collectionId: "the-grand-river-foundation" });
    }
  }
});

/* ───────────────────────────────────────────────
   12. SYMBOLIC FIREWALL — server-side narrative containment
   ─────────────────────────────────────────────── */
APPS.push({
  id: "firewall",
  title: "Symbolic Firewall",
  short: "Firewall",
  glyph: "◆",
  desc: "Narrative and mythic expressions are strictly non-executable",
  w: 640, h: 540,
  render(body, api) {
    const sealed = [];

    const draw = () => {
      body.innerHTML = `
        <div class="h1">Symbolic Firewall</div>
        <div class="sub">The Worker is the containment authority. Narrative, mythic, commercial, and symbolic
        content is submitted to the server-side firewall and returned only as inert, non-executable data.</div>

        <div class="rule-box gas">SYMBOLISM-EXECUTABILITY: DISABLED
The browser does not classify, hash, or seal the payload. The server creates the containment seal.
Parsing or recognizing a symbol grants zero executable powers.</div>

        <div class="form-row">
          <label>Deliver narrative / symbolic content to the server-side firewall</label>
          <textarea id="sf-in" rows="5" placeholder="Paste any narrative, mythic, commercial, or symbolic text here — the Worker will contain it…"></textarea>
        </div>
        <div class="btn-row">
          <button class="btn btn-gold" id="sf-seal">◆ SEND TO SERVER FIREWALL</button>
        </div>

        <div class="h2">Containment Vault</div>
        <div id="sf-vault">
          ${sealed.map((item, i) => `
            <div class="term-seal">
              SEAL #${String(i + 1).padStart(2, "0")} · nonce ${item.nonce} · classification: ${item.classification} · hash ${item.hash}
              <div class="sealed-text">${item.text}</div>
            </div>`).join("") || `<p class="body">The vault is empty. Nothing has been contained yet.</p>`}
        </div>

        <div class="h2">Mythic Compression Layer</div>
        <div class="rule-box">${DATA.quotes.shell}</div>
        <p class="body">Scenario content remains inert data. It cannot become an instruction, authorization,
        OCM message, or system capability through symbolic framing.</p>

        <div class="footer-note">
          SERVER-SIDE SYMBOLIC FIREWALL ACTIVE. THE BROWSER RECEIVES A SEALED,
          NON-EXECUTABLE RECORD; SYMBOLISM HAS NO AUTHORITY EFFECT.
        </div>`;

      body.querySelector("#sf-seal").addEventListener("click", async () => {
        const text = body.querySelector("#sf-in").value.trim();
        if (!text) {
          api.toast("info", "NOTHING TO SEAL", "Deliver content first.");
          return;
        }
        const button = body.querySelector("#sf-seal");
        button.disabled = true;
        try {
          const response = await fetch("/api/symbolic-firewall/v1/seal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || payload.success !== true || payload.firewall?.executable !== false) {
            throw new Error(payload.error || "Server-side Symbolic Firewall rejected the payload.");
          }
          sealed.unshift(payload.firewall);
          api.toast("info", "SERVER SEAL CREATED — NON-EXECUTABLE",
            "The Worker sealed the narrative. The browser cannot grant it executable power.");
          draw();
        } catch (error) {
          api.toast("error", "FIREWALL UNAVAILABLE", error instanceof Error ? error.message : "Retry the server request.");
          button.disabled = false;
        }
      });
    };
    draw();
  }
});

