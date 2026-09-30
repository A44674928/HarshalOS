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
        if (!api.requireHumanKey("Deploy AI node")) return;
        if (!shellState.anchor) {
          api.toast("refusal", "REFUSAL — NO ANCHOR", "The Inner Shell anchor is absent. Dependent identity cannot be derived. Restore the anchor first.");
          return;
        }
        shellState.seq += 137;
        const addr = `0•100•000•0${(shellState.seq % 900 + 100)}•AI-${String(shellState.seq).slice(-4)}`;
        shellState.nodes.push({ addr, tag: "newly derived radiative node" });
        kernel.record("info", `AI node deployed in Inner Shell — ${addr} (address-derived identity, capability ≠ authority).`);
        api.toast("permit", "AI NODE DEPLOYED", `${addr} — identity derived from the shell namespace. The node may learn and communicate; it can never originate.`);
        draw();
      });

      body.querySelector("#is-revoke").addEventListener("click", () => {
        if (!api.requireHumanKey("Remove Inner Shell anchor")) return;
        shellState.anchor = false;
        shellState.nodes.forEach(n => n.dead = true);
        kernel.record("breach", "Inner Shell anchor removed — all dependent AI nodes invalidated instantly (geometry, not enforcement).");
        api.toast("refusal", "ANCHOR REMOVED — CASCADE",
          "All dependent AI nodes are instantly invalidated, without ambiguity or escalation. Abandoned AI cannot persist as valid actors. This is not enforcement. It is geometry.");
        draw();
      });

      body.querySelector("#is-restore").addEventListener("click", () => {
        if (!api.requireHumanKey("Restore Inner Shell anchor")) return;
        shellState.anchor = true;
        shellState.nodes = shellState.nodes.map(n => ({ ...n, dead: false }));
        kernel.record("info", "Inner Shell anchor restored — address lineage re-established from Center-Origin.");
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
        if (!api.requireHumanKey("Spawn disc")) return;
        const dur = +body.querySelector("#dc-time").value;
        const scope = body.querySelector("#dc-scope").value;
        const distance = body.querySelector("#dc-dist").value;
        const leg = body.querySelector("#dc-leg").value;
        const d = {
          id: ++discSeq, scope, distance, leg, created: kernel.nowISO(),
          endsAt: Date.now() + dur * 1000, state: "live", reason: "",
          remaining() { return Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000)); },
          halt(reason, violation = false) {
            if (this.state === "halted") return;
            this.state = "halted";
            this.reason = reason;
            kernel.record(violation ? "breach" : "info",
              `DISC-${String(this.id).padStart(3, "0")} halted — ${reason}. No authority residue; no successor.`);
            api.toast(violation ? "refusal" : "info", `DISC-${String(this.id).padStart(3, "0")} HALTED`,
              `${reason}. Discs halt deterministically on violation and leave no authority residue after termination.`);
            drawList();
          }
        };
        discs.unshift(d);
        kernel.record("info", `DISC-${String(d.id).padStart(3, "0")} spawned — scope: ${scope}, distance: ${distance}, horizon: ${dur}s, legitimacy ref: ${leg}.`);
        api.toast("info", "DISC SPAWNED", `DISC-${String(d.id).padStart(3, "0")} — a derived, non-sovereign context. It cannot create other discs and will halt deterministically.`);
        drawList();
      });

      body.querySelector("#dc-child").addEventListener("click", () => {
        kernel.record("warning", "Attempt to spawn child disc refused — structural invariant (discs cannot create other discs).");
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
        <div class="card"><h4>Ytterbium (Yb) [95°–97°]</h4><p>Resonant signaling precision for why.query. The metronome for liveness attestation.</p></div>
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

    println("Whyland Standards v1.0 — DecksJokersAndCards", "gas");
    println("Catalog virtualization: OFF-DISC. Elements load into session buffer on query.", "dim");
    println(`sessionState = ${kernel.state.session.state} · sessionIsFresh = ${kernel.sessionFresh()}`, "dim");
    println('Type help for commands.', "dim");

    const sessionBurn = (why) => {
      kernel.state.session.burned++;
      kernel.state.session.bound = null;
      kernel.state.session.state = "non-acting";
      kernel.record("breach", `Bromine gateway: ${why} — channel neutralized, session burned (burn #${kernel.state.session.burned}).`);
      println(`BROMINE [61°–63°] — ${why}`, "err");
      println("Channel neutralized. Session burned. Authorization window destroyed; re-bind with why.activate.", "err");
    };

    const execute = (line) => {
      const cmd = line.trim();
      if (!cmd) return;
      println("whyland ▸ " + cmd, "cmd");

      if (cmd === "help") {
        println(`COMMANDS
  why.query("<id>")     — pull definition + 360° Legend mapping into session buffer
  why.activate("<id>")  — bind a standard to the current NeuralSession (authorization window)
  why.explain("<id>")   — deterministic reasoning record via Technetium (Tc)
  status                — session, legitimacy, and freshness readout
  pdh                   — current Phase Declaration Header
  catalog               — list known standard ids (virtualized)
  burn                  — voluntarily burn the session (reclassification safety)
  clear                 — clear the console`, "sys");
        return;
      }

      if (cmd === "clear") { out.innerHTML = ""; return; }

      if (cmd === "status") {
        const s = kernel.state;
        println(`H(t) = ${s.H} · L(t) = ${kernel.L().toFixed(3)} · Δt = ${isFinite(kernel.deltaSeconds()) ? Math.floor(kernel.deltaSeconds()) + "s" : "—"} · phase = ${s.phase} · sessionState = ${s.session.state} · burns = ${s.session.burned}`, "sys");
        return;
      }

      if (cmd === "pdh") {
        const h = kernel.state.declared;
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

      // Control 2: sessionIsFresh
      if (!kernel.sessionFresh()) {
        println("HALTED — Control 2 (Continuous Human Binding): sessionIsFresh = false.", "err");
        println("If now() − session.lastLivenessAt > POLICY.maxLivenessGap, the interface MUST transition to a halted state.", "err");
        kernel.record("warning", `Whyland ${verb}('${id}') halted — sessionIsFresh=false.`);
        return;
      }

      if (verb === "query") {
        println(`[${entry.name}] ${entry.legend}`, "gas");
        println(entry.def, "sys");
        println(`ActionClass: read → sessionState = active`, "ok");
        kernel.state.session.state = "active";
        kernel.state.session.bound = id;
        kernel.record("info", `why.query('${id}') — catalog element virtualized into session buffer.`);
      } else if (verb === "activate") {
        if (entry.class !== "reversible") {
          println(`why.activate requires ActionClass 'reversible'. '${id}' is class '${entry.class}'.`, "err");
          println("A 'Why' query does not create authority but validates the lineage of intent within a verified, human-bound, and revocable session.", "dim");
          kernel.record("warning", `why.activate('${id}') refused — ActionClass mismatch.`);
          return;
        }
        println(`Binding '${id}' to current NeuralSession — authorization window defined.`, "ok");
        println(`ActionClass: reversible → sessionState = authorized`, "ok");
        kernel.state.session.state = "authorized";
        kernel.state.session.bound = id;
        kernel.record("info", `why.activate('${id}') — standard bound to NeuralSession; authorization window opened.`);
      } else if (verb === "explain") {
        println(`Tc nested-reality simulation [228°–229°] — deterministic reasoning record for '${id}':`, "gas");
        println(`1. Standard '${id}' (${entry.legend}) is pulled into the session buffer.
2. Current telemetry: H(t)=${kernel.state.H}, L(t)=${kernel.L().toFixed(3)}, phase=${kernel.state.phase}.
3. The standard applies ${entry.class === "reversible" ? "as a reversible binding constraint" : "as a read-only validation constraint"} to the proposed session.
4. No authority is created. Lineage of intent is validated only. Simulation drift check: PASSED (read-only sandbox).`, "sys");
        println(`ActionClass: read → sessionState = confirmation_required`, "ok");
        kernel.state.session.state = "confirmation_required";
        kernel.record("info", `why.explain('${id}') — deterministic reasoning record generated via Technetium (Tc).`);
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
   11. THE BOOK — physical artifact + 500 voting coins
   ─────────────────────────────────────────────── */
APPS.push({
  id: "book",
  title: "The Book",
  short: "The Book",
  glyph: "▤",
  desc: "The physical license artifact and the 500-coin governance pool",
  w: 700, h: 580,
  render(body, api) {
    const votes = {};
    const myCoins = 3;
    let remaining = myCoins;

    const draw = () => {
      const totalVoted = DATA.proposals.reduce((s, p) => s + p.yes + p.no + (votes[p.id]?.yes || 0) + (votes[p.id]?.no || 0), 0);
      body.innerHTML = `
        <div class="h1">The Physical Artifact</div>
        <div class="sub">A book that serves as the tangible license key and foundational text for the entire system.
        Authority over the system's direction is tied to the physical world through the purchase of the hardcover book,
        with influence limited to a pool of <strong>500 voting coins</strong>.</div>

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
            <circle cx="60" cy="60" r="48" fill="none" stroke="var(--gold)" stroke-width="12"
              stroke-dasharray="${(totalVoted / 500) * 301.6} 301.6" stroke-linecap="round" transform="rotate(-90 60 60)"/>
            <text x="60" y="56" text-anchor="middle" fill="var(--gold)" font-family="var(--mono)" font-size="16">${totalVoted}</text>
            <text x="60" y="74" text-anchor="middle" fill="var(--text-faint)" font-family="var(--mono)" font-size="9">/ 500</text>
          </svg>
          <div class="coin-legend">
            <div>POOL: 500 coins · hard cap</div>
            <div>CAST: ${totalVoted} · UNCOMMITTED: ${500 - totalVoted}</div>
            <div>YOUR ATTESTED SHARE: ${myCoins} coins · remaining: ${remaining}</div>
            <div style="color:var(--text-faint)">Influence is limited by design. Scale increases robustness, not power concentration.</div>
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

      body.querySelectorAll("[data-vote]").forEach(b => b.addEventListener("click", () => {
        if (!api.requireHumanKey("Cast voting coin")) return;
        const res = kernel.requestAction("cast-voting-coin");
        if (!res.permitted) { api.reportAction(res); return; }
        if (remaining <= 0) {
          api.toast("refusal", "REFUSAL — COIN POOL EXHAUSTED", "Your attested share is spent. Influence is limited by design; it cannot be borrowed, synthesized, or inflated.");
          return;
        }
        remaining--;
        const id = b.dataset.vote, dir = b.dataset.dir;
        votes[id] = votes[id] || { yes: 0, no: 0 };
        votes[id][dir]++;
        kernel.record("info", `Voting coin cast on ${id} (${dir.toUpperCase()}) — bounded governance act witnessed and recorded.`);
        api.toast("permit", "COIN CAST", "Recorded to the Duty Ledger. The pool is finite; the ledger is forever.");
        draw();
      }));
    };
    draw();
  }
});

/* ───────────────────────────────────────────────
   12. SYMBOLIC FIREWALL — narrative containment
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
        <div class="sub">The mechanism that isolates narrative and mythic expressions, rendering them
        <strong>strictly non-executable</strong> to prevent unauthorized system changes — the structural defense against
        neurojacking through narrative or symbolic input.</div>

        <div class="rule-box gas">SYMBOLISM-EXECUTABILITY: DISABLED
Parsing or recognizing a symbol grants zero executable powers.
Commercial metaphors, mythic framing, and narrative claims are contained — never executed.</div>

        <div class="form-row">
          <label>Deliver narrative / symbolic content to the firewall</label>
          <textarea id="sf-in" rows="5" placeholder="Paste any narrative, mythic, commercial, or symbolic text here — the firewall will contain it…"></textarea>
        </div>
        <div class="btn-row">
          <button class="btn btn-gold" id="sf-seal">◆ SEAL CONTENT (NON-EXECUTABLE)</button>
        </div>

        <div class="h2">Containment Vault</div>
        <div id="sf-vault">
          ${sealed.map((s, i) => `
            <div class="term-seal">
              SEAL #${String(i + 1).padStart(2, "0")} · nonce ${s.nonce} · classification: NON-EXECUTABLE · hash ${s.hash}
              <div class="sealed-text">${s.text}</div>
            </div>`).join("") || `<p class="body">The vault is empty. Nothing has been contained yet.</p>`}
        </div>

        <div class="h2">Mythic Compression Layer</div>
        <div class="rule-box">${DATA.quotes.shell}</div>
        <p class="body">AGS includes hypothetical, extreme, and adversarial scenarios solely to test containment logic and
        governance resilience under stress. These scenarios demonstrate the containment architecture, not the scenarios
        themselves. All scenario content is abstract, not descriptive · structural, not behavioral · evaluative, not
        directive · contained, not externalized.</p>

        <div class="footer-note">
          THE SYMBOLIC FIREWALL PREVENTS UNAUTHORIZED CHANGES AND "NEUROJACKING" BY EXTERNAL ACTORS,
          ENSURING THE SYSTEM'S LOGIC REMAINS SECURE. A SYSTEM'S LOGIC IS NOT A STAGE FOR STORIES.
        </div>`;

      body.querySelector("#sf-seal").addEventListener("click", async () => {
        const text = body.querySelector("#sf-in").value.trim();
        if (!text) {
          api.toast("info", "NOTHING TO SEAL", "The firewall contains what is delivered to it. Deliver content first.");
          return;
        }
        const [nonceSrc, digest] = await Promise.all([
          HOSCrypto.sha256Hex(text + "::" + Date.now()),
          HOSCrypto.sha256Hex(text)
        ]);
        const nonce = nonceSrc.slice(0, 10);
        const hash = "0x" + digest.toUpperCase();
        sealed.unshift({ text: text.length > 400 ? text.slice(0, 400) + "…" : text, nonce, hash });
        kernel.record("info", `Symbolic Firewall: content sealed as NON-EXECUTABLE (nonce ${nonce}, SHA-256 ${hash}).`);
        api.toast("info", "CONTENT SEALED — NON-EXECUTABLE",
          "The narrative is now contained. It may be preserved and witnessed — it can never execute. The Symbolic Firewall holds.");
        draw();
      });
    };
    draw();
  }
});
