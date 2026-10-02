/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Orb Directory & Mail (window.APPS entry "ocm-directory")

   A phonebook and mail pad addressed in the Orb Communicator Model's
   fresh-slate form 0•DDD•RRR•####.

   Boundaries, stated plainly because the app would otherwise overpromise:
     · Nothing leaves this browser. There is no SMTP client, no server call,
       no fetch, and no delivery. "Record" is the honest verb; "send" is not
       offered.
     · Lateral Communication Axiom: any node may message any other node
       without reauthorization.
     · Resolution-first routing: inward resolution costs less than lateral
       coordination (Cost_resolution < Cost_lateral), so the recommended path
       is inward to Center Origin, which resolves and forwards outward. The
       claim is over logical authority-verification hops, not wire latency.
       Resolution is an authority-resolution mechanism, not an authority
       source — the center shortens verification and creates nothing.
     · Ownership Non-Transfer Axiom: a message confers no ownership,
       authority, or origin rights, and an inbound message can never
       authorize an action.
     · Resolution ≻ Coordination: mail is coordination. Authoritative action
       must traverse the resolution path, so every message carries
       authorityEffect: NONE.
     · Message bodies are escaped text. They are never rendered as HTML and
       never executed (Symbolic Firewall).
   ═══════════════════════════════════════════════════════════════ */

"use strict";

APPS.push({
  id: "ocm-directory",
  title: "Orb Directory & Mail",
  short: "Orb Mail",
  glyph: "✉",
  desc: "Phonebook and local mail addressed as 0•DDD•RRR•#### — no transport, no delivery",
  w: 900,
  h: 720,
  render(body, api) {
    const DIR = window.HOSOCMDIR;
    if (!DIR) {
      body.innerHTML = '<div class="rule-box refusal">The OCM directory module did not load. No state has changed.</div>';
      return;
    }

    const notify = (kind, title, text) => { if (api && typeof api.toast === "function") api.toast(kind, title, text); };
    const ledger = (severity, text) => { try { if (window.HOS && typeof window.HOS.record === "function") window.HOS.record(severity, text); } catch { /* the ledger is a demo convenience, never a dependency */ } };

    /* Local-only persistence with a recovery copy for malformed data. */
    let storage = null;
    try {
      if (typeof localStorage !== "undefined") {
        storage = {
          read: () => localStorage.getItem(DIR.STORAGE_KEY),
          write: text => localStorage.setItem(DIR.STORAGE_KEY, text),
          writeRecovery: raw => localStorage.setItem(`${DIR.STORAGE_KEY}-recovery`, raw)
        };
      }
    } catch { storage = null; }

    const store = DIR.createStore({ storage });
    const restore = store.hydrate();

    const state = { tab: "directory", query: "", composeTo: "", route: "VIA-CENTER", openMessageId: "", formError: "", mailError: "" };

    const escapeHtml = value => String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

    const sectorLine = address => {
      const parsed = DIR.parseAddress(address);
      if (!parsed.ok) return "";
      const described = DIR.describe(parsed);
      return `${parsed.sector}° — ${described.degree}` + (described.cluster ? ` · ${described.cluster}` : "");
    };

    const identityParsed = DIR.parseAddress(store.identity());

    /* ── directory pane ─────────────────────────────────────── */
    const directoryPane = () => {
      const rows = store.search(state.query);
      return `
        <div class="odm-row">
          <label for="odm-search">Search the directory</label>
          <input id="odm-search" type="text" value="${escapeHtml(state.query)}" placeholder="name, address, sector, note" />
          <button type="button" class="btn" id="odm-search-apply">SEARCH</button>
          <button type="button" class="btn" id="odm-search-clear">CLEAR</button>
          <span class="odm-count" id="odm-contact-count">${rows.length} / ${store.contacts().length}</span>
        </div>

        <div class="odm-panel">
          <div class="h2">New directory entry</div>
          <div class="odm-grid">
            <label>Display name<input id="odm-name" type="text" maxlength="${DIR.LIMITS.name}" placeholder="Custodial node, person, or team" /></label>
            <label>OCM address<input id="odm-address" type="text" placeholder="0•DDD•RRR•####" /></label>
            <label>Role or relation<input id="odm-role" type="text" maxlength="${DIR.LIMITS.role}" placeholder="optional" /></label>
            <label>Voice handle (external, unverified)<input id="odm-voice" type="text" maxlength="${DIR.LIMITS.voice}" placeholder="not an OCM address" /></label>
            <label>External mail handle (unverified)<input id="odm-external" type="text" maxlength="${DIR.LIMITS.externalMail}" placeholder="not an OCM address" /></label>
            <label>Notes<input id="odm-notes" type="text" maxlength="${DIR.LIMITS.notes}" placeholder="optional" /></label>
          </div>
          <div class="odm-actions">
            <button type="button" class="btn btn-gold" id="odm-add">＋ ADD TO DIRECTORY</button>
            <button type="button" class="btn" id="odm-load-registry">LOAD LOCAL ORB REGISTRY</button>
          </div>
          ${state.formError ? `<div class="rule-box refusal">${escapeHtml(state.formError)}</div>` : ""}
        </div>

        <div class="h2">Entries</div>
        <div class="odm-list" id="odm-entries">
          ${rows.map(contact => `
            <article class="odm-entry" data-id="${escapeHtml(contact.id)}">
              <header>
                <span class="odm-entry-name">${escapeHtml(contact.name)}</span>
                ${contact.kind === "NODE" ? '<span class="odm-tag odm-tag-node">NODE</span>' : ""}
                <code class="odm-addr">${escapeHtml(contact.address)}</code>
              </header>
              <div class="odm-entry-sector">${escapeHtml(sectorLine(contact.address))}</div>
              ${contact.role ? `<div class="odm-entry-role">${escapeHtml(contact.role)}</div>` : ""}
              <div class="odm-entry-handles">
                ${contact.voice ? `<span>voice: <code>${escapeHtml(contact.voice)}</code></span>` : ""}
                ${contact.externalMail ? `<span>external mail: <code>${escapeHtml(contact.externalMail)}</code></span>` : ""}
                ${!contact.voice && !contact.externalMail ? '<span class="odm-faint">no external handles recorded</span>' : ""}
              </div>
              ${contact.notes ? `<p class="odm-entry-notes">${escapeHtml(contact.notes)}</p>` : ""}
              <div class="odm-actions">
                <button type="button" class="btn odm-compose" data-address="${escapeHtml(contact.address)}">✉ COMPOSE</button>
                <button type="button" class="btn odm-delete" data-id="${escapeHtml(contact.id)}">DELETE</button>
              </div>
            </article>`).join("") || '<p class="odm-empty">No directory entries yet. Add one, or load the local orb registry.</p>'}
        </div>

        <div class="h2">Export and import (local file text)</div>
        <p class="odm-note">Export writes plain JSON to this box. Import validates every entry against the
        OCM rules and rejects what does not parse. Neither direction touches a network.</p>
        <div class="odm-actions">
          <button type="button" class="btn" id="odm-export">EXPORT JSON</button>
          <button type="button" class="btn" id="odm-import">IMPORT FROM BOX</button>
        </div>
        <textarea id="odm-transfer" rows="5" placeholder="Exported ${DIR.SCHEMA} JSON appears here; paste an export to import it."></textarea>`;
    };

    /* ── route preview ──────────────────────────────────────── */
    const routePanelHtml = (toValue, route) => {
      if (route === "DIRECT-LATERAL") {
        const plan = DIR.planRoute({ from: store.identity(), to: toValue || "0•000•001•0000" });
        const arc = plan && plan.ok ? plan.verification.lateralArcDegrees : null;
        return `
          <div class="rule-box refusal">DIRECT LATERAL — RESOLUTION NOT TRAVERSED. The Lateral Communication Axiom
permits this hop, and it needs no reauthorization. It also buys nothing: lateral coordination cannot authorize,
override, or commit state, and any authoritative action still owes its radial resolution.${arc === null ? "" : ` Lateral arc: ${arc}° on the ℤ_360 ring.`}</div>`;
      }

      const plan = DIR.planRoute({ from: store.identity(), to: toValue });
      if (!plan.ok) {
        return `<div class="rule-box refusal">${escapeHtml(plan.code)}: ${escapeHtml(plan.reason)}</div>`;
      }
      const legs = plan.path.map(step => `
        <span class="odm-leg">
          <span class="odm-leg-label">hop ${step.hop} · ${escapeHtml(step.leg)} · ${escapeHtml(step.direction)}${step.verifies ? " · VERIFIES" : " · no verification"}</span>
          <span class="odm-leg-arrow">▼</span>
        </span>
        <code class="odm-addr${step.to === plan.center ? " odm-route-center" : ""}">${escapeHtml(step.to)}</code>`).join("");
      return `
        <div class="odm-route-path">
          <code class="odm-addr">${escapeHtml(plan.from)}</code>
          ${legs}
        </div>
        <table class="table">
          <thead><tr><th>Path</th><th>Authority-verification hops</th><th>Why</th></tr></thead>
          <tbody>
            <tr><td><strong>Resolution-first</strong> — inward, then outward</td><td class="good">${plan.verification.resolutionFirst}</td><td>The center resolves once; the outward leg only transmits.</td></tr>
            <tr><td>Direct lateral to m = ${plan.participants} node(s)</td><td class="bad">${plan.verification.directLateral}</td><td>${plan.participants - 1} lateral hop(s) across a ${plan.verification.lateralArcDegrees}° arc, <em>plus</em> the mandatory radial resolution before commit.</td></tr>
          </tbody>
        </table>
        <p class="odm-note"><span class="odm-rec">${escapeHtml(plan.recommendation)}</span> — <code>Cost_resolution &lt; Cost_lateral</code>,
        ${escapeHtml(DIR.ROUTING.assumption)}. ${escapeHtml(plan.reason)} Saving: ${plan.verification.savedHops} verification hop(s).</p>`;
    };

    /* ── mail pane ──────────────────────────────────────────── */
    const mailPane = () => {
      const messages = store.messages();
      return `
        <div class="rule-box">CENTRALIZED-DECENTRALIZED. One origin resolves; every node may still coordinate laterally.
Route inward first — ${escapeHtml(DIR.ROUTING.metric)} over logical authority-verification hops, because a lateral
route owes its own radial resolution before anything can commit. LATERAL COMMUNICATION AXIOM: nodes may communicate
without reauthorization. OWNERSHIP NON-TRANSFER: a message confers no ownership, authority, or origin rights.</div>

        <div class="rule-box ice">${escapeHtml(DIR.ROUTING.axisInvariant)} The center resolves and forwards
(${escapeHtml(DIR.ROUTING.centerRole)}); legitimacy is generated only by the Human Key at Center Origin
(${escapeHtml(DIR.ROUTING.authoritySource)}) and never migrates. Routing through the center shortens
verification; it does not create authority.</div>

        <div class="h2">Precedence invariants</div>
        <ul class="odm-invariants">
          ${DIR.ROUTING.precedence.map(rule => `<li>${escapeHtml(rule)}</li>`).join("")}
          <li class="odm-boundary">${escapeHtml(DIR.ROUTING.boundary)}</li>
        </ul>

        <div class="odm-panel">
          <div class="h2">Compose</div>
          <div class="odm-grid">
            <label>To (OCM address)<input id="odm-mail-to" type="text" value="${escapeHtml(state.composeTo)}" placeholder="0•DDD•RRR•####" /></label>
            <label>Subject<input id="odm-mail-subject" type="text" maxlength="${DIR.LIMITS.subject}" placeholder="optional" /></label>
          </div>
          <label class="odm-block">Body<textarea id="odm-mail-body" rows="6" maxlength="${DIR.LIMITS.body}" placeholder="Plain text. Contained and non-executable."></textarea></label>

          <div class="odm-tabs odm-route-tabs">
            <button type="button" class="btn odm-tab${state.route === "VIA-CENTER" ? " odm-tab-on" : ""}" id="odm-route-center">◉ ROUTE VIA CENTER</button>
            <button type="button" class="btn odm-tab${state.route === "DIRECT-LATERAL" ? " odm-tab-on" : ""}" id="odm-route-lateral">↔ DIRECT LATERAL</button>
          </div>

          <div class="h2">Route</div>
          <div id="odm-route">${routePanelHtml(state.composeTo, state.route)}</div>

          <div class="odm-actions">
            <button type="button" class="btn btn-gold" id="odm-mail-record">◈ RECORD LOCALLY</button>
            <button type="button" class="btn" id="odm-mail-clear">CLEAR MESSAGES</button>
          </div>
          ${state.mailError ? `<div class="rule-box refusal">${escapeHtml(state.mailError)}</div>` : ""}
        </div>

        <div class="h2">Recorded messages <span class="odm-faint">(${messages.length})</span></div>
        <div class="odm-list" id="odm-messages">
          ${messages.map(message => `
            <article class="odm-msg${message.id === state.openMessageId ? " odm-msg-open" : ""}" data-id="${escapeHtml(message.id)}">
              <header class="odm-msg-head" data-id="${escapeHtml(message.id)}">
                <span class="odm-msg-dir">${message.direction === "inbound" ? "IN" : "OUT"}</span>
                <code class="odm-addr">${escapeHtml(message.from)}</code>
                <span class="odm-arrow">${message.route === "VIA-CENTER" ? "→ ◉ →" : "↔"}</span>
                <code class="odm-addr">${escapeHtml(message.to)}</code>
                <span class="odm-msg-subject">${escapeHtml(message.subject)}</span>
                <span class="odm-tag ${message.route === "VIA-CENTER" ? "odm-tag-route" : "odm-tag-node"}">${escapeHtml(message.route)}</span>
                <span class="odm-tag odm-tag-local">${escapeHtml(message.status)}</span>
              </header>
              ${message.id === state.openMessageId ? `
                <div class="odm-msg-meta">
                  recorded ${escapeHtml(new Date(message.createdAt).toISOString())} ·
                  route ${escapeHtml(message.route)} · resolution ${escapeHtml(message.resolution)}${message.resolvedAt ? ` at <code>${escapeHtml(message.resolvedAt)}</code>` : ""} ·
                  center role ${escapeHtml(message.centerRole)} ·
                  verification hops ${message.verificationHops.resolutionFirst} via center vs ${message.verificationHops.directLateral} direct lateral ·
                  transport ${escapeHtml(message.transport)} · delivery ${escapeHtml(message.delivery)} ·
                  authority effect ${escapeHtml(message.authorityEffect)} ·
                  authority source ${escapeHtml(message.authoritySource)}
                  ${message.bodyDigest ? ` · body SHA-256 <code>${escapeHtml(message.bodyDigest)}</code>` : ""}
                </div>
                ${message.path && message.path.length ? `<div class="odm-msg-path">${message.path.map(step => `<span>hop ${step.hop} · ${escapeHtml(step.leg)} (${escapeHtml(step.direction)}) · <code>${escapeHtml(step.from)}</code> → <code>${escapeHtml(step.to)}</code></span>`).join("")}</div>` : ""}
                <pre class="odm-msg-body">${escapeHtml(message.body) || "(empty body)"}</pre>
                <div class="odm-actions"><button type="button" class="btn odm-msg-delete" data-id="${escapeHtml(message.id)}">DELETE RECORD</button></div>` : ""}
            </article>`).join("") || '<p class="odm-empty">No messages recorded in this browser.</p>'}
        </div>`;
    };

    const draw = () => {
      const identity = store.identity();
      const identityLine = identityParsed && identityParsed.ok
        ? `${identity} · ${sectorLine(identity)}`
        : identity;

      body.innerHTML = `
        <div class="h1">Orb Directory &amp; Mail</div>
        <div class="sub mono">OCM fresh-slate addressing · 0•DDD•RRR•#### · sector DDD ∈ ℤ_360 {000–359} · radius RRR · instance ####</div>

        <div class="rule-box refusal">LOCAL ONLY — NO TRANSPORT. This app has no SMTP client, no server call, and no
network path. Recording a message stores it in this browser; it is never sent, delivered, or acknowledged, and no
recipient is notified. Nothing here authenticates a person or authorizes an action.</div>

        <div class="odm-row odm-identity">
          <label for="odm-identity">This node's address</label>
          <input id="odm-identity" type="text" value="${escapeHtml(identity)}" placeholder="0•DDD•RRR•####" />
          <button type="button" class="btn" id="odm-identity-set">SET</button>
          <span class="odm-faint" id="odm-identity-note">${escapeHtml(identityLine)}</span>
        </div>

        <div class="odm-tabs">
          <button type="button" class="btn odm-tab${state.tab === "directory" ? " odm-tab-on" : ""}" id="odm-tab-directory">☰ DIRECTORY</button>
          <button type="button" class="btn odm-tab${state.tab === "mail" ? " odm-tab-on" : ""}" id="odm-tab-mail">✉ MAIL</button>
        </div>

        ${state.tab === "directory" ? directoryPane() : mailPane()}

        <div class="h2">Distance is not rank</div>
        <p class="odm-note">In OCM, radius <code>RRR</code> is ${DIR.DISTANCE_SEMANTICS.is.map(item => escapeHtml(item.toLowerCase())).join(", ")}.
        It is never ${DIR.DISTANCE_SEMANTICS.isNot.map(item => escapeHtml(item.toLowerCase())).join(", ")}.
        Sector 000 is Center Origin and is reserved: it cannot be registered as a directory entry or used as a mailbox.</p>

        <div class="footer-note">Addressing per Part VII — Addressing, Rotation, and Spherical Topology. Storage: this browser only
        (${restore.ok ? `${restore.restored} record(s) restored${restore.dropped ? `, ${restore.dropped} dropped as invalid` : ""}` : `not restored — ${restore.reason}`}). Content is read, never executed.</div>`;

      /* tabs and identity */
      const tabDirectory = body.querySelector("#odm-tab-directory");
      const tabMail = body.querySelector("#odm-tab-mail");
      if (tabDirectory) tabDirectory.addEventListener("click", () => { state.tab = "directory"; draw(); });
      if (tabMail) tabMail.addEventListener("click", () => { state.tab = "mail"; draw(); });

      const identityInput = body.querySelector("#odm-identity");
      const identitySet = body.querySelector("#odm-identity-set");
      if (identitySet) identitySet.addEventListener("click", () => {
        const result = store.setIdentity(identityInput ? identityInput.value : "");
        if (!result.ok) {
          state.formError = `${result.code}: ${result.reason}`;
          notify("refusal", "ADDRESS REFUSED", result.reason);
        } else {
          state.formError = "";
          ledger("info", `OCM Directory — local node identity set to ${result.canonical} (local label only; no identity proof).`);
        }
        draw();
      });

      if (state.tab === "directory") wireDirectory();
      else wireMail();
    };

    /* ── directory wiring ───────────────────────────────────── */
    const wireDirectory = () => {
      const search = body.querySelector("#odm-search");
      const applySearch = body.querySelector("#odm-search-apply");
      const clearSearch = body.querySelector("#odm-search-clear");
      const runSearch = () => { state.query = search && typeof search.value === "string" ? search.value : ""; draw(); };
      if (applySearch) applySearch.addEventListener("click", runSearch);
      if (search) search.addEventListener("keydown", event => { if (event && event.key === "Enter") runSearch(); });
      if (clearSearch) clearSearch.addEventListener("click", () => { state.query = ""; draw(); });

      const add = body.querySelector("#odm-add");
      if (add) add.addEventListener("click", () => {
        const value = id => { const el = body.querySelector(id); return el && typeof el.value === "string" ? el.value : ""; };
        const result = store.add({
          name: value("#odm-name"),
          address: value("#odm-address"),
          role: value("#odm-role"),
          voice: value("#odm-voice"),
          externalMail: value("#odm-external"),
          notes: value("#odm-notes")
        });
        if (!result.ok) {
          state.formError = `${result.code}: ${result.reason}`;
          notify("refusal", "ENTRY REFUSED", result.reason);
        } else {
          state.formError = "";
          ledger("info", `OCM Directory — entry added for ${result.contact.address} (${result.contact.name}); local record only, no identity verification.`);
          notify("info", "ENTRY ADDED", `${result.contact.name} recorded at ${result.contact.address}. Local record only.`);
        }
        draw();
      });

      const loadRegistry = body.querySelector("#odm-load-registry");
      if (loadRegistry) loadRegistry.addEventListener("click", () => {
        const data = window.OCM_DATA;
        const nodes = data && Array.isArray(data.nodes) ? data.nodes : [];
        let added = 0;
        let skipped = 0;
        for (const node of nodes) {
          const result = store.add({
            name: node.name,
            address: node.addr,
            role: node.note,
            kind: "NODE",
            notes: `Local orb registry node · sector ${node.deg}° · shell r=${node.r}`
          });
          result.ok ? added++ : skipped++;
        }
        state.formError = added ? "" : "No registry node could be added; Center Origin is reserved and duplicates are refused.";
        ledger("info", `OCM Directory — loaded ${added} local orb registry node(s); ${skipped} skipped (Center Origin reserved or duplicate).`);
        draw();
      });

      for (const button of body.querySelectorAll(".odm-compose")) {
        button.addEventListener("click", () => {
          state.composeTo = button.dataset.address || "";
          state.tab = "mail";
          draw();
        });
      }

      for (const button of body.querySelectorAll(".odm-delete")) {
        button.addEventListener("click", () => {
          const result = store.remove(button.dataset.id || "");
          if (result.ok) ledger("info", `OCM Directory — local entry removed for ${result.removed}.`);
          draw();
        });
      }

      const exportButton = body.querySelector("#odm-export");
      const importButton = body.querySelector("#odm-import");
      const transfer = body.querySelector("#odm-transfer");
      if (exportButton) exportButton.addEventListener("click", () => {
        if (transfer) transfer.value = store.exportJSON();
        notify("info", "EXPORT READY", "Plain JSON is in the box. Copy it yourself; nothing was uploaded.");
      });
      if (importButton) importButton.addEventListener("click", () => {
        const result = store.importJSON(transfer && typeof transfer.value === "string" ? transfer.value : "");
        state.formError = result.ok ? "" : `${result.code}: ${result.reason}`;
        if (result.ok) ledger("info", `OCM Directory — imported ${result.imported} record(s), rejected ${result.rejected}.`);
        notify(result.ok ? "info" : "refusal", result.ok ? "IMPORT COMPLETE" : "IMPORT REFUSED",
          result.ok ? `${result.imported} imported, ${result.rejected} rejected.` : result.reason);
        draw();
      });
    };

    /* ── mail wiring ────────────────────────────────────────── */
    const wireMail = () => {
      const toInput = body.querySelector("#odm-mail-to");
      const record = body.querySelector("#odm-mail-record");
      if (record) record.addEventListener("click", async () => {
        const value = id => { const el = body.querySelector(id); return el && typeof el.value === "string" ? el.value : ""; };
        const messageBody = value("#odm-mail-body");
        let digest = "";
        try {
          if (window.HOSCrypto && typeof window.HOSCrypto.sha256Hex === "function" && messageBody) {
            digest = await window.HOSCrypto.sha256Hex(messageBody);
          }
        } catch { digest = ""; }

        const result = store.record({
          from: store.identity(),
          to: value("#odm-mail-to"),
          subject: value("#odm-mail-subject"),
          body: messageBody,
          bodyDigest: digest,
          direction: "outbound",
          route: state.route
        });
        if (!result.ok) {
          state.mailError = `${result.code}: ${result.reason}`;
          notify("refusal", "MESSAGE REFUSED", result.reason);
        } else {
          state.mailError = "";
          state.openMessageId = result.message.id;
          const hops = result.message.verificationHops;
          ledger("info", `OCM Mail — local message recorded ${result.message.from} → ${result.message.to} via ${result.message.route}; resolution ${result.message.resolution}, ${hops.resolutionFirst} verification hop(s) vs ${hops.directLateral} direct lateral; transport NONE, delivery NOT-ATTEMPTED, authority effect NONE.`);
          notify("info", "RECORDED LOCALLY", `Stored in this browser. Route ${result.message.route}. No transport exists, so nothing was sent or delivered.`);
        }
        draw();
      });

      const clearMessages = body.querySelector("#odm-mail-clear");
      if (clearMessages) clearMessages.addEventListener("click", () => {
        store.clearMessages();
        state.openMessageId = "";
        ledger("info", "OCM Mail — local message records cleared.");
        draw();
      });

      for (const head of body.querySelectorAll(".odm-msg-head")) {
        head.addEventListener("click", () => {
          state.openMessageId = state.openMessageId === head.dataset.id ? "" : (head.dataset.id || "");
          draw();
        });
      }

      for (const button of body.querySelectorAll(".odm-msg-delete")) {
        button.addEventListener("click", () => {
          store.removeMessage(button.dataset.id || "");
          state.openMessageId = "";
          draw();
        });
      }

      /* Route selection. VIA-CENTER is the default because Cost_resolution < Cost_lateral. */
      const setRoute = route => {
        if (state.route === route) return;
        state.route = route;
        ledger("info", `OCM Mail — route set to ${route}; ${route === "VIA-CENTER" ? "resolution path traversed at Center Origin" : "resolution path NOT traversed; lateral coordination carries no authority"}.`);
        draw();
      };
      const viaCenter = body.querySelector("#odm-route-center");
      if (viaCenter) viaCenter.addEventListener("click", () => setRoute("VIA-CENTER"));
      const lateral = body.querySelector("#odm-route-lateral");
      if (lateral) lateral.addEventListener("click", () => setRoute("DIRECT-LATERAL"));

      /* Keep the compose box and the route preview in sync while typing. The
         route panel is refreshed in place so focus is not lost on a keystroke. */
      const routeHost = body.querySelector("#odm-route");
      const refreshRoute = () => {
        if (routeHost) routeHost.innerHTML = routePanelHtml(state.composeTo, state.route);
      };
      if (toInput) toInput.addEventListener("input", () => {
        state.composeTo = toInput.value || "";
        refreshRoute();
      });
    };

    draw();
  }
});
