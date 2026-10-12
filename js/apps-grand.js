/* ═══════════════════════════════════════════════════════════════
   HarshalOS — The Grand Architecture (window.APPS entry "grand-architecture")

   A read-only reader for the Grand Architecture library module: six layers,
   the OCM instance registry, the canonical quantity anchors, the planning
   timeline, and the architecture invariants.

   Discipline: this app requests no action, changes no phase, writes no ledger
   row, and calls no HOS authority capability. The setting it describes is
   FICTION (NARRATIVE_SANDBOX); the figures it renders are quoted from the
   canonical numbers card and are planning arithmetic, not engineering facts.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

APPS.push({
  id: "grand-architecture",
  title: "The Grand Architecture",
  short: "Grand Architecture",
  glyph: "◭",
  desc: "Read-only Convergence-era architecture: layers, addresses, canonical anchors, invariants",
  w: 880,
  h: 700,
  render(body) {
    const GA = window.GRAND_ARCHITECTURE;
    if (!GA) {
      body.innerHTML = '<div class="rule-box refusal">The Grand Architecture data module did not load. No state has changed.</div>';
      return;
    }

    const state = { focus: "all", filter: "" };

    const escapeHtml = value => String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

    const provenanceBadge = value =>
      `<span class="ga-badge ${value === "FICTION" ? "ga-badge-fiction" : "ga-badge-derivative"}">${escapeHtml(value)}</span>`;

    const layerCard = layer => `
      <article class="ga-layer" data-layer="${escapeHtml(layer.id)}">
        <header class="ga-layer-head">
          <span class="ga-layer-id">${escapeHtml(layer.id)}</span>
          <span class="ga-layer-name">${escapeHtml(layer.name)}</span>
          <span class="ga-layer-subject">${escapeHtml(layer.subject)}</span>
          ${provenanceBadge(layer.provenance)}
        </header>
        <p class="ga-layer-role">${escapeHtml(layer.role)}</p>
        <ul class="ga-addr">
          ${layer.addresses.map(address => `<li>${escapeHtml(address)}</li>`).join("")}
        </ul>
      </article>`;

    const anchorRows = () => {
      const needle = state.filter.trim().toLowerCase();
      return GA.canonicalAnchors.filter(anchor => {
        if (!needle) return true;
        return [anchor.id, anchor.quantity, anchor.figure, anchor.detail, anchor.status]
          .join(" ").toLowerCase().includes(needle);
      });
    };

    const draw = () => {
      const meta = GA.meta;
      const registry = GA.addressRegistry;
      const visibleLayers = state.focus === "all" ? GA.layers : GA.layers.filter(layer => layer.id === state.focus);
      const rows = anchorRows();

      body.innerHTML = `
        <div class="h1">The Grand Architecture</div>
        <div class="sub mono">${escapeHtml(meta.documentId)} · ${escapeHtml(meta.provenanceClass)} ·
        ${escapeHtml(meta.statusTaxonomy)} · ${escapeHtml(meta.evidenceStatus)}</div>

        <div class="rule-box refusal">${escapeHtml(meta.authorityDisclaimer)}</div>

        <p class="body">The Grand Architecture composes the four lineages delivered in the
        <span class="mono">updates/2026-10-02/</span> package — a megastructure flow model, a timekeeping
        system, three institutions, and a public-source threat review — into one named structure, and binds
        that structure to HarshalOS's accountability invariants. It is an architecture of
        <strong>addressability and provenance</strong>, not of concrete: it names layers, fixes canonical
        numbers, and states what the whole structure may not become.
        ${escapeHtml(meta.boundary)}</p>

        <div class="h2">The six layers</div>
        <div class="ga-strip" role="group" aria-label="Focus a Grand Architecture layer">
          <button type="button" class="btn ga-focus${state.focus === "all" ? " ga-focus-on" : ""}" id="ga-focus-all">All</button>
          ${GA.layers.map(layer => `<button type="button" class="btn ga-focus${state.focus === layer.id ? " ga-focus-on" : ""}" id="ga-focus-${escapeHtml(layer.id)}">${escapeHtml(layer.id)} · ${escapeHtml(layer.name)}</button>`).join("")}
        </div>
        <div class="ga-layers">
          ${visibleLayers.map(layerCard).join("")}
        </div>

        <div class="h2">OCM address registry</div>
        <div class="rule-box ice">${escapeHtml(registry.form)} — orb ${escapeHtml(registry.orb)} · sector ${escapeHtml(registry.sector)} ·
        ${registry.distinctInstances} distinct named instances</div>
        <table class="table">
          <thead><tr><th>Tier</th><th>Band</th><th>Approx. slots (of ${registry.tierDenominator})</th><th>Share of slots</th></tr></thead>
          <tbody>
            ${registry.tiers.map(tier => `<tr><td>${escapeHtml(tier.tier)}</td><td>${escapeHtml(tier.name)}</td><td>${escapeHtml(tier.nodes)}</td><td>${escapeHtml(tier.share)}</td></tr>`).join("")}
          </tbody>
        </table>
        <p class="ga-note">${escapeHtml(registry.tierBasis)}</p>
        <p class="ga-note">${escapeHtml(registry.precisionNote)}</p>

        <div class="h2">Canonical quantity anchors</div>
        <p class="ga-note">Quoted from <span class="mono">${escapeHtml(meta.canonicalNumbersPath)}</span>, which governs.
        Reproducible through <span class="mono">recalculate.py</span>. These are conditional planning
        calculations, not a validated engineering or feasibility finding.</p>
        <div class="ga-filter-row">
          <label for="ga-filter">Filter anchors</label>
          <input id="ga-filter" type="text" value="${escapeHtml(state.filter)}" placeholder="e.g. reservoir, GW, mistveil, GA-Q-011" />
          <button type="button" class="btn" id="ga-filter-apply">FILTER</button>
          <button type="button" class="btn" id="ga-filter-clear">CLEAR</button>
          <span class="ga-count" id="ga-anchor-count">${rows.length} / ${GA.canonicalAnchors.length}</span>
        </div>
        <table class="table">
          <thead><tr><th>ID</th><th>Quantity</th><th>Canonical figure</th><th>Basis</th><th>Status</th></tr></thead>
          <tbody id="ga-anchor-rows">
            ${rows.map(anchor => `<tr><td class="mono">${escapeHtml(anchor.id)}</td><td>${escapeHtml(anchor.quantity)}</td><td class="mono ga-figure">${escapeHtml(anchor.figure)}</td><td>${escapeHtml(anchor.detail)}</td><td>${escapeHtml(anchor.status)}</td></tr>`).join("") ||
              `<tr><td colspan="5" class="ga-empty">No anchor matches that filter.</td></tr>`}
          </tbody>
        </table>

        <div class="h2">Planning timeline</div>
        <table class="table">
          <thead><tr><th>Window / marker</th><th>Fictional milestone</th><th>Status</th></tr></thead>
          <tbody>
            ${GA.timeline.map(step => `<tr><td class="mono">${escapeHtml(step.window)}</td><td>${escapeHtml(step.marker)}</td><td>${escapeHtml(step.status)}</td></tr>`).join("")}
          </tbody>
        </table>

        <div class="h2">Architecture invariants</div>
        <ul class="ul">
          ${GA.invariants.map(invariant => `<li class="li gold"><strong class="mono">${escapeHtml(invariant.id)} — ${escapeHtml(invariant.name)}.</strong> ${escapeHtml(invariant.text)}</li>`).join("")}
        </ul>

        <div class="h2">What The Grand Architecture is not</div>
        <div class="rule-box refusal">
          ${GA.notClaims.map(claim => escapeHtml(claim)).join("<br />")}
        </div>

        <div class="footer-note">${escapeHtml(meta.publishingHierarchy)} · Module: <span class="mono">${escapeHtml(meta.modulePath)}</span></div>`;

      const focusButtons = [
        ["ga-focus-all", "all"],
        ...GA.layers.map(layer => [`ga-focus-${layer.id}`, layer.id])
      ];
      for (const [elementId, focus] of focusButtons) {
        const button = body.querySelector(`#${elementId}`);
        if (button) button.addEventListener("click", () => { state.focus = focus; draw(); });
      }

      const input = body.querySelector("#ga-filter");
      const apply = body.querySelector("#ga-filter-apply");
      const clear = body.querySelector("#ga-filter-clear");
      const applyFilter = () => { state.filter = input && typeof input.value === "string" ? input.value : ""; draw(); };
      if (apply) apply.addEventListener("click", applyFilter);
      if (input) {
        input.addEventListener("input", applyFilter);
        input.addEventListener("keydown", event => { if (event && event.key === "Enter") applyFilter(); });
      }
      if (clear) clear.addEventListener("click", () => { state.filter = ""; draw(); });
    };

    draw();
  }
});
