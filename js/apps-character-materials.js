/* Character Materials — phase-aware local assignments and idealized multi-Disc spheroids.
   This UI consumes only Materials Project summaries explicitly saved to this browser.
   A user-selected PDH annotation gates local assignments; material ranking uses only
   the explicit, measurable targets on the character profile. */
"use strict";

(() => {
  let refreshOnFocus = null;
  const app = {
    id: "character-materials",
    title: "Material Spheroids",
    short: "Material Spheroids",
    glyph: "◉",
    desc: "Phase-aware character material matching and multi-Disc spheroid composition preview",
    w: 1160,
    h: 820,
    onFocus() { if (refreshOnFocus) refreshOnFocus(); },
    render(body) {
      const Model = window.CharacterMaterialModel;
      const Catalog = window.CharactersDiscCatalog;
      const NAB = window.NabSectors;
      if (!Model || !Catalog || !NAB) {
        body.innerHTML = '<div class="cm-app"><h1>Material Spheroids</h1><p class="cm-warning">Required model, NAB registry or Disc catalog did not load. Check the script order in index.html.</p></div>';
        return;
      }

      const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[character]));
      const make = (tag, className = "", value = null) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (value !== null && value !== undefined) node.textContent = String(value);
        return node;
      };
      const format = (value, max = 5) => Number.isFinite(Number(value))
        ? new Intl.NumberFormat(undefined, { maximumSignificantDigits: max }).format(Number(value))
        : "Not reported";
      const storage = (() => {
        try { return window.localStorage; } catch { return null; }
      })();
      const state = {
        materials: Model.readMaterials(storage),
        characters: Model.readCharacters(storage),
        spheroids: Model.readSpheroids(storage),
        activeTab: "library",
        activeCharacterId: null,
        editingCharacterId: null,
        searchResults: [],
        searchController: null,
        searchSequence: 0,
        selections: Object.fromEntries(Catalog.discs.map(disc => [disc.id, { characterId: "", sharePercent: "25" }])),
        preview: null
      };

      const discOptions = Catalog.discs.map(disc => `<option value="${escape(disc.id)}">${escape(disc.label)}</option>`).join("");
      const phaseOptions = Model.DECLARED_PHASES.map(phase => `<option value="${escape(phase)}">${escape(phase)}</option>`).join("");
      const detectedOptions = Model.DETECTED_PHASES.map(phase => `<option value="${escape(phase)}">${escape(phase)}</option>`).join("");
      const rangeField = (title, minName, maxName, unit) => `
        <label class="cm-field"><span>${escape(title)} · ${escape(unit)}</span>
          <div class="cm-range-pair">
            <input type="number" min="0" step="any" placeholder="min" data-cm-field="${escape(minName)}" aria-label="${escape(title)} minimum in ${escape(unit)}">
            <input type="number" min="0" step="any" placeholder="max" data-cm-field="${escape(maxName)}" aria-label="${escape(title)} maximum in ${escape(unit)}">
          </div>
        </label>`;

      body.innerHTML = `
        <div class="cm-app">
          <header class="cm-header">
            <div>
              <p class="cm-eyebrow">CHARACTER MATERIAL MODEL · LOCAL WORKSPACE</p>
              <h1>Material Spheroids</h1>
              <p class="cm-lede">Build explainable character-to-material matches from measured criteria, then combine assigned Disc components into a spheroid preview. The model uses Materials Project values for materials evidence; it does not infer chemistry from personality text.</p>
            </div>
            <span class="cm-header-badge">MATERIALS PROJECT · BROWSER-LOCAL</span>
          </header>
          <p class="cm-warning"><strong>Two different evidence layers:</strong> the PDH phase/status is a review gate and operating-context label, not a materials property. Material matching uses only user-entered physical bounds and reported record values. PDH entries here are operator annotations—not signed, freshness-checked, or independently verified. A spheroid and its idealized density are exploratory visualizations, not an engineered composite or safety claim.</p>

          <nav class="cm-tabs" role="tablist" aria-label="Material model workspace">
            <button class="cm-tab" type="button" role="tab" aria-selected="true" aria-controls="cm-pane-library" data-cm-tab="library">1 · Material library</button>
            <button class="cm-tab" type="button" role="tab" aria-selected="false" aria-controls="cm-pane-characters" data-cm-tab="characters">2 · Character matching</button>
            <button class="cm-tab" type="button" role="tab" aria-selected="false" aria-controls="cm-pane-spheroid" data-cm-tab="spheroid">3 · NAB composite material</button>
          </nav>

          <section id="cm-pane-library" data-cm-pane="library" role="tabpanel">
            <div class="cm-layout">
              <section class="cm-panel">
                <div class="cm-panel-head"><h2>Find a material</h2><p>Explicit search only · no request on open</p></div>
                <form class="cm-search" data-cm-search-form>
                  <label class="cm-field"><span>Formula, chemical system, or Materials Project ID</span>
                    <input class="cm-search-input" type="text" maxlength="64" required autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="SiO2 · Li-Fe-O · mp-149" data-cm-search-query>
                  </label>
                  <label class="cm-field"><span>Results</span><select data-cm-search-limit><option value="5">5</option><option value="10" selected>10</option><option value="20">20</option></select></label>
                  <button class="cm-btn cm-btn-primary" type="submit" data-cm-search-submit>Search</button>
                  <button class="cm-btn" type="button" data-cm-search-cancel disabled>Stop</button>
                </form>
                <p class="cm-help">Search uses the existing same-origin Materials Project Worker route and BY-C license scope. The API key stays server-side. Opening this workspace and composing a spheroid make no provider request.</p>
                <p class="cm-status" role="status" aria-live="polite" data-cm-search-status>Search a formula, chemical system, or MP ID to add real database records to this browser's local library.</p>
                <div class="cm-list" data-cm-search-results aria-busy="false"></div>
              </section>
              <section class="cm-panel">
                <div class="cm-panel-head"><h2>Saved materials</h2><span class="cm-count" data-cm-material-count>0 records</span></div>
                <p class="cm-help">Local to this browser profile. Saved entries retain MP IDs, reported properties, update date, retrieval date, and license-scope label. No data is uploaded by this tool.</p>
                <div class="cm-list" data-cm-library></div>
              </section>
            </div>
          </section>

          <section id="cm-pane-characters" data-cm-pane="characters" role="tabpanel" hidden>
            <div class="cm-layout-wide">
              <div>
                <section class="cm-panel">
                  <div class="cm-panel-head"><h2 data-cm-form-title>Character profile</h2><p>PDH annotation + explicit physical requirements</p></div>
                  <form data-cm-character-form>
                    <input type="hidden" data-cm-field="id">
                    <div class="cm-form-grid">
                      <label class="cm-field"><span>Character name</span><input maxlength="80" required data-cm-field="name" placeholder="e.g. Copper Sentinel"></label>
                      <label class="cm-field"><span>Disc</span><select data-cm-field="discId">${discOptions}</select></label>
                      <label class="cm-field cm-full"><span>Character role / real-world characteristic</span><input maxlength="100" data-cm-field="role" placeholder="e.g. heat shield, flexible conduit, load-bearing shell"></label>
                      <label class="cm-field cm-full"><span>Observed context / evidence note · notes only</span><textarea maxlength="320" data-cm-field="realWorldNote" placeholder="Document the observable role, context, or source. Natural-language notes are not automatically interpreted."></textarea></label>

                      <div class="cm-section-label">PDH context · locally annotated, never verified here</div>
                      <label class="cm-field"><span>PDH status supplied by operator</span><select data-cm-field="pdhStatus"><option value="MISSING">MISSING</option><option value="VALID">VALID · operator-reported</option><option value="INVALID">INVALID · operator-reported</option></select></label>
                      <label class="cm-field"><span>Declared phase · PDH</span><select data-cm-field="declaredPhase"><option value="">Not supplied</option>${phaseOptions}</select></label>
                      <label class="cm-field"><span>Detected phase · if known</span><select data-cm-field="detectedPhase"><option value="">Not supplied</option>${detectedOptions}</select></label>
                      <label class="cm-field"><span>PDH reference ID · optional</span><input maxlength="96" data-cm-field="pdhId" placeholder="PDH-…"></label>

                      <div class="cm-section-label">Measurable material targets · enter only real requirements</div>
                      ${rangeField("Density", "densityMin", "densityMax", "g/cm³")}
                      ${rangeField("Bulk modulus", "bulkModulusMin", "bulkModulusMax", "GPa")}
                      ${rangeField("Shear modulus", "shearModulusMin", "shearModulusMax", "GPa")}
                      ${rangeField("Band gap", "bandGapMin", "bandGapMax", "eV")}
                      <label class="cm-field"><span>Energy above hull · maximum</span><input type="number" min="0" step="any" placeholder="eV/atom" data-cm-field="energyAboveHullMax"></label>
                      <label class="cm-field"><span>Calculated metallic classification</span><select data-cm-field="electricalClass"><option value="any">No constraint</option><option value="metal">Metal</option><option value="nonmetal">Not metal</option></select></label>
                    </div>
                    <div class="cm-actions"><button class="cm-btn cm-btn-primary" type="submit" data-cm-save-character>Save profile</button><button class="cm-btn" type="button" data-cm-reset-character>Clear / new</button></div>
                    <p class="cm-status" role="status" aria-live="polite" data-cm-character-status></p>
                  </form>
                  <p class="cm-pdh-note">PDH contributes a review/readiness gate: missing, invalid, or declared/detected phase disagreement blocks a local assignment. A user-entered VALID status is still only self-reported. It is not Ground-0 validation, authorization, or material evidence.</p>
                </section>
                <section class="cm-panel">
                  <div class="cm-panel-head"><h2>Saved characters</h2><span class="cm-count" data-cm-character-count>0 profiles</span></div>
                  <div class="cm-list" data-cm-characters></div>
                </section>
              </div>
              <section class="cm-panel">
                <div class="cm-panel-head"><h2>Material candidates</h2><span class="cm-count" data-cm-match-count>—</span></div>
                <div class="cm-help" data-cm-match-note>Select a saved character. A physical match is reported only when every user-entered criterion has a value and falls within its bound; PDH review readiness is shown separately.</div>
                <div class="cm-list" data-cm-matches></div>
              </section>
            </div>
          </section>

          <section id="cm-pane-spheroid" data-cm-pane="spheroid" role="tabpanel" hidden>
            <section class="cm-panel">
              <div class="cm-panel-head"><h2>Compose physical constituents for a designated NAB</h2><p>Choose assigned character/material records from the legacy source channels</p></div>
              <div class="cm-composer">
                <div>
                  <label class="cm-field"><span>Local design name</span><input maxlength="80" data-cm-spheroid-name placeholder="e.g. Four-Disc reference spheroid"></label>
                  <label class="cm-field"><span>Designated NAB · one fixed stock proxy per sector</span><select data-cm-nab aria-describedby="cm-nab-note">${NAB.sectors.map(nab => `<option value="${nab.id}">${escape(`${nab.id} · ${nab.symbol} ${nab.name} · ${nab.ticker} · ${nab.riskProfile}`)}</option>`).join("")}</select></label>
                  <div id="cm-nab-note" data-cm-nab-note aria-live="polite"></div>
                  <p class="cm-help">119 editorial stock proxies, not market sectors or investment recommendations. Listing/provider availability is unverified. NAB risk belongs to the neural design, not the stock or material. Selecting a sector makes no network call and does not instantiate a neural network. Extreme NABs are reference-only.</p>
                  <div class="cm-disc-list" data-cm-disc-list></div>
                  <div class="cm-actions"><button class="cm-btn cm-btn-primary" type="button" data-cm-preview-spheroid>Preview composition</button><button class="cm-btn" type="button" data-cm-save-spheroid disabled>Save spheroid</button></div>
                  <p class="cm-status" role="status" aria-live="polite" data-cm-spheroid-status>Choose two or more source channels with saved material assignments. They will attach to the designated NAB.</p>
                </div>
                <div data-cm-spheroid-output>
                  <div class="cm-sphere-card"><div class="cm-empty">A composition preview appears here after selecting at least two assigned Discs.</div></div>
                </div>
              </div>
            </section>
            <section class="cm-panel">
              <div class="cm-panel-head"><h2>Saved spheroid designs</h2><span class="cm-count" data-cm-spheroid-count>0 designs</span></div>
              <p class="cm-help">Saved designs retain their designated NAB ID and registry version, plus selected character/material IDs and relative share weights. Legacy designs remain explicitly unassigned. Fractions are normalized for the preview; no atomic formula or manufacturing process is inferred.</p>
              <div class="cm-list" data-cm-spheroids></div>
            </section>
          </section>

          <p class="cm-footer">Material values may be calculated, incomplete, or method-dependent. Formula matches may represent distinct structures. Reported MP density is not a physical sample guarantee. Spheroid slices are visual encoding only (not colors of the material); the simple volume-weighted density is a reference estimate under idealized additive-volume assumptions only.</p>
        </div>`;

      const $ = selector => body.querySelector(selector);
      const status = (node, message, kind = "") => {
        node.className = `cm-status${kind ? ` ${kind}` : ""}`;
        node.textContent = message;
      };
      const refreshStorage = () => {
        state.materials = Model.readMaterials(storage);
        state.characters = Model.readCharacters(storage);
        state.spheroids = Model.readSpheroids(storage);
      };
      const formatProperty = (value, unit = "") => value === null || value === undefined
        ? "Not reported" : `${format(value)}${unit ? ` ${unit}` : ""}`;

      function addProperty(host, label, value) {
        if (value === null || value === undefined || value === "") return;
        const item = make("div", "cm-property");
        item.append(make("dt", "", label), make("dd", "", value));
        host.appendChild(item);
      }

      function makeMaterialCard(material, { saved = false } = {}) {
        const article = make("article", "cm-card");
        const head = make("div", "cm-card-head");
        const identity = make("div");
        identity.append(make("h3", "", material.formula), make("p", "cm-card-sub cm-mono", `${material.materialId} · Materials Project`));
        const pillRow = make("div", "cm-pill-row");
        if (material.isStable === true) pillRow.appendChild(make("span", "cm-pill good", "On computed hull"));
        else if (material.isStable === false) pillRow.appendChild(make("span", "cm-pill warn", "Above computed hull"));
        if (material.isMetal === true) pillRow.appendChild(make("span", "cm-pill", "Metal · calculated"));
        else if (material.isMetal === false) pillRow.appendChild(make("span", "cm-pill", "Not metal · calculated"));
        head.append(identity, pillRow);
        article.appendChild(head);

        const props = make("dl", "cm-property-grid");
        addProperty(props, "Elements", material.elements?.join(" · ") || null);
        addProperty(props, "Density", formatProperty(material.density, "g/cm³"));
        addProperty(props, "Bulk modulus · calc.", formatProperty(material.bulkModulusGpa, "GPa"));
        addProperty(props, "Shear modulus · calc.", formatProperty(material.shearModulusGpa, "GPa"));
        addProperty(props, "Band gap · calc.", formatProperty(material.bandGap, "eV"));
        addProperty(props, "Energy above hull · calc.", formatProperty(material.energyAboveHull, "eV/atom"));
        addProperty(props, "Crystal system", material.symmetry?.crystalSystem || null);
        if (props.childElementCount) article.appendChild(props);
        const provenance = make("p", "cm-card-note", `License scope ${material.licenseFilter || "unverified"}${material.lastUpdated ? ` · MP record updated ${material.lastUpdated}` : ""}${material.retrievedAt ? ` · retrieved ${material.retrievedAt}` : ""}`);
        article.appendChild(provenance);

        const actions = make("div", "cm-actions");
        const link = make("a", "cm-btn", "Open MP record ↗");
        link.href = material.recordUrl || `https://next-gen.materialsproject.org/materials/${encodeURIComponent(material.materialId)}`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.referrerPolicy = "no-referrer";
        actions.appendChild(link);
        if (saved) {
          const remove = make("button", "cm-btn cm-btn-danger", "Remove from library");
          remove.type = "button";
          remove.dataset.cmRemoveMaterial = material.materialId;
          actions.appendChild(remove);
        } else {
          const add = make("button", "cm-btn cm-btn-primary", "Add to local library");
          add.type = "button";
          add.dataset.cmAddMaterial = material.materialId;
          add.addEventListener("click", () => {
            const result = Model.saveMaterial(storage, material, {
              licenseFilter: material.licenseFilter,
              retrievedAt: material.retrievedAt,
              savedAt: new Date().toISOString()
            });
            if (!result.ok) status($("[data-cm-search-status]"), result.code === "storage-unavailable"
              ? "Browser storage is unavailable; material was not saved."
              : result.code === "library-full" ? "Local material library is full." : "That result could not be saved as a Materials Project record.", "error");
            else {
              refreshStorage();
              renderLibrary();
              add.textContent = result.code === "updated" ? "Updated in local library" : "Added to local library";
              add.disabled = true;
              status($("[data-cm-search-status]"), `${result.material.formula} (${result.material.materialId}) ${result.code} in this browser's local library.`, "success");
            }
          });
          actions.appendChild(add);
        }
        article.appendChild(actions);
        return article;
      }

      function renderLibrary() {
        const host = $("[data-cm-library]");
        host.replaceChildren();
        $("[data-cm-material-count]").textContent = `${state.materials.length} record${state.materials.length === 1 ? "" : "s"}`;
        if (!state.materials.length) {
          host.appendChild(make("div", "cm-empty", "No saved materials yet. Search above, then add one or more reviewed MP records to this local library."));
          renderCharacterList();
          renderDiscRows();
          renderSpheroids();
          return;
        }
        for (const material of state.materials) host.appendChild(makeMaterialCard(material, { saved: true }));
        renderCharacterList();
        renderDiscRows();
        renderSpheroids();
      }

      function renderSearchResults(data) {
        const host = $("[data-cm-search-results]");
        host.replaceChildren();
        state.searchResults = (Array.isArray(data?.results) ? data.results : []).slice(0, 20)
          .map(record => Model.normalizeMaterial(record, { licenseFilter: data?.licenseFilter, retrievedAt: data?.retrievedAt }))
          .filter(Boolean);
        if (!state.searchResults.length) {
          host.appendChild(make("div", "cm-empty", "No Materials Project records matched this query in the returned license scope."));
          return;
        }
        for (const material of state.searchResults) host.appendChild(makeMaterialCard(material));
      }

      function renderCharacterList() {
        const host = $("[data-cm-characters]");
        host.replaceChildren();
        $("[data-cm-character-count]").textContent = `${state.characters.length} profile${state.characters.length === 1 ? "" : "s"}`;
        if (!state.characters.length) {
          host.appendChild(make("div", "cm-empty", "No character profiles yet. Add an explicit PDH annotation and measurable material requirements above."));
          renderMatches();
          return;
        }
        for (const character of state.characters) {
          const card = make("article", "cm-card");
          const head = make("div", "cm-card-head");
          const identity = make("div");
          const disc = Catalog.disc(character.discId);
          identity.append(make("h3", "", character.name), make("p", "cm-card-sub", `${disc?.label || character.discId} · ${character.id}`));
          head.appendChild(identity);
          const assigned = state.materials.find(item => item.materialId === character.materialId);
          head.appendChild(make("span", `cm-pill${assigned ? " good" : ""}`, assigned ? `${assigned.formula} · ${assigned.materialId}` : "No material assigned"));
          card.appendChild(head);
          const pdh = Model.assessPdh(character);
          const pills = make("div", "cm-pill-row");
          pills.appendChild(make("span", `cm-pill${pdh.requiresReview ? " warn" : " good"}`, pdh.label));
          const criteria = Model.constraintCount(character.constraints);
          pills.appendChild(make("span", "cm-pill", `${criteria} physical criterion${criteria === 1 ? "" : "a"}`));
          card.appendChild(pills);
          const characterContext = [character.role, character.realWorldNote].filter(Boolean).join(" · ");
          if (characterContext) card.appendChild(make("p", "cm-card-note", characterContext));
          const actions = make("div", "cm-actions");
          for (const [label, action, css] of [["Review matches", "matches", "cm-btn cm-btn-primary"], ["Edit", "edit", "cm-btn"], ["Delete", "delete", "cm-btn cm-btn-danger"]]) {
            const button = make("button", css, label);
            button.type = "button";
            button.dataset.cmCharacterAction = action;
            button.dataset.cmCharacterId = character.id;
            actions.appendChild(button);
          }
          card.appendChild(actions);
          host.appendChild(card);
        }
        renderMatches();
      }

      function renderMatches() {
        const host = $("[data-cm-matches]");
        const note = $("[data-cm-match-note]");
        const count = $("[data-cm-match-count]");
        host.replaceChildren();
        const character = state.characters.find(item => item.id === state.activeCharacterId);
        if (!character) {
          count.textContent = "—";
          note.textContent = "Select a saved character. A physical match requires complete reported values for every entered criterion; PDH review readiness is shown separately.";
          host.appendChild(make("div", "cm-empty", "Choose a character's “Review matches” action to rank saved records against its explicit physical targets."));
          return;
        }
        const result = Model.rankCandidates(character, state.materials);
        note.textContent = `${character.name} · ${result.pdh.label}. PDH affects assignment review readiness only; property checks below are computed from measured fields, never from the phase label.`;
        if (result.code === "no-criteria") {
          count.textContent = "No targets";
          host.appendChild(make("div", "cm-empty", "Set at least one measurable property bound or electrical classification in this character profile before ranking materials."));
          return;
        }
        count.textContent = `${result.candidates.length} candidate${result.candidates.length === 1 ? "" : "s"}`;
        if (!result.candidates.length) {
          host.appendChild(make("div", "cm-empty", "No saved Materials Project records yet. Add records in the Material library tab."));
          return;
        }
        for (const candidate of result.candidates) {
          const material = candidate.material;
          const card = make("article", "cm-card");
          const row = make("div", "cm-match-row");
          const left = make("div");
          const title = make("h3", "", material.formula);
          title.style.margin = "0 0 2px";
          const id = make("p", "cm-card-sub", `${material.materialId} · ${candidate.passed}/${candidate.criteria} reported criteria match · ${candidate.dataCoveragePercent}% data coverage`);
          left.append(title, id);
          const badgeText = candidate.status === "match" ? "All criteria match" : candidate.status === "incomplete" ? "Missing property data" : "Outside one or more bounds";
          const badge = make("span", `cm-pill${candidate.status === "match" ? " good" : candidate.status === "outside" ? " bad" : " warn"}`, badgeText);
          row.append(left, badge);
          card.appendChild(row);
          const values = make("dl", "cm-property-grid");
          addProperty(values, "Density", formatProperty(material.density, "g/cm³"));
          addProperty(values, "Bulk modulus", formatProperty(material.bulkModulusGpa, "GPa"));
          addProperty(values, "Shear modulus", formatProperty(material.shearModulusGpa, "GPa"));
          addProperty(values, "Band gap", formatProperty(material.bandGap, "eV"));
          addProperty(values, "Energy above hull", formatProperty(material.energyAboveHull, "eV/atom"));
          addProperty(values, "Calculated metal", material.isMetal === null ? "Not reported" : material.isMetal ? "Yes" : "No");
          card.appendChild(values);
          const checks = make("div", "cm-checks");
          for (const check of candidate.checks) {
            const line = make("div", "cm-check");
            const actual = check.actual === null ? "not reported" : `${format(check.actual)}${check.unit ? ` ${check.unit}` : ""}`;
            const value = check.key === "electricalClass" ? `target ${check.threshold}` : `${check.threshold}${check.unit ? ` ${check.unit}` : ""}`;
            line.append(make("span", "", `${check.label}: ${actual} (limit ${value})`), make("strong", check.result, check.result.toUpperCase()));
            checks.appendChild(line);
          }
          card.appendChild(checks);
          const actions = make("div", "cm-actions");
          const assigned = character.materialId === material.materialId;
          const allowed = Model.assignmentCheck(character, material);
          const assign = make("button", `cm-btn${allowed.ok ? " cm-btn-primary" : ""}`, assigned ? "Assigned" : "Assign material");
          assign.type = "button";
          assign.dataset.cmAssignMaterial = material.materialId;
          assign.disabled = assigned || !allowed.ok;
          if (!allowed.ok) assign.title = allowed.reason;
          actions.appendChild(assign);
          if (!allowed.ok) actions.appendChild(make("span", "cm-help", allowed.reason));
          card.appendChild(actions);
          host.appendChild(card);
        }
      }

      function readCharacterForm() {
        const value = name => $(`[data-cm-field="${name}"]`)?.value ?? "";
        const constraintsRaw = {};
        for (const name of ["densityMin", "densityMax", "bulkModulusMin", "bulkModulusMax", "shearModulusMin", "shearModulusMax", "bandGapMin", "bandGapMax", "energyAboveHullMax", "electricalClass"]) {
          constraintsRaw[name] = value(name);
        }
        const constraints = Model.normalizeConstraints(constraintsRaw);
        if (!constraints.ok) return { ok: false, error: constraints.error };
        const character = {
          id: value("id"), name: value("name"), discId: value("discId"),
          role: value("role"), realWorldNote: value("realWorldNote"),
          pdh: {
            id: value("pdhId"), status: value("pdhStatus"),
            declaredPhase: value("declaredPhase"), detectedPhase: value("detectedPhase")
          },
          constraints: constraints.constraints,
          materialId: state.characters.find(item => item.id === value("id"))?.materialId || null
        };
        if (!character.name.trim()) return { ok: false, error: "Enter a character name." };
        return { ok: true, character };
      }

      function setForm(profile = null) {
        const form = $("[data-cm-character-form]");
        form.reset();
        $("[data-cm-field='id']").value = profile?.id || "";
        $("[data-cm-field='name']").value = profile?.name || "";
        $("[data-cm-field='discId']").value = profile?.discId || Catalog.discs[0]?.id || "stocks";
        $("[data-cm-field='role']").value = profile?.role || "";
        $("[data-cm-field='realWorldNote']").value = profile?.realWorldNote || "";
        $("[data-cm-field='pdhStatus']").value = profile?.pdh.status || "MISSING";
        $("[data-cm-field='declaredPhase']").value = profile?.pdh.declaredPhase || "";
        $("[data-cm-field='detectedPhase']").value = profile?.pdh.detectedPhase || "";
        $("[data-cm-field='pdhId']").value = profile?.pdh.id || "";
        const constraints = profile?.constraints || {};
        for (const name of ["densityMin", "densityMax", "bulkModulusMin", "bulkModulusMax", "shearModulusMin", "shearModulusMax", "bandGapMin", "bandGapMax", "energyAboveHullMax"]) {
          $(`[data-cm-field="${name}"]`).value = constraints[name] ?? "";
        }
        $("[data-cm-field='electricalClass']").value = constraints.electricalClass || "any";
        state.editingCharacterId = profile?.id || null;
        $("[data-cm-form-title]").textContent = profile ? `Edit · ${profile.name}` : "Character profile";
        $("[data-cm-save-character]").textContent = profile ? "Update profile" : "Save profile";
        if (!profile) status($("[data-cm-character-status]"), "");
      }

      function renderDiscRows() {
        const host = $("[data-cm-disc-list]");
        if (!host) return;
        host.replaceChildren();
        const assignedProfiles = state.characters.filter(character => character.materialId && state.materials.some(material => material.materialId === character.materialId));
        for (const disc of Catalog.discs) {
          const row = make("div", "cm-disc-row");
          row.appendChild(make("div", "cm-disc-name", disc.label));
          const choiceLabel = make("label");
          choiceLabel.appendChild(make("span", "", "Assigned character / material"));
          const select = make("select");
          select.dataset.cmDiscCharacter = disc.id;
          const blank = make("option", "", assignedProfiles.some(profile => profile.discId === disc.id) ? "Choose character…" : "No assigned character");
          blank.value = "";
          select.appendChild(blank);
          for (const profile of assignedProfiles.filter(item => item.discId === disc.id)) {
            const material = state.materials.find(item => item.materialId === profile.materialId);
            const option = make("option", "", `${profile.name} · ${material?.formula || profile.materialId}`);
            option.value = profile.id;
            select.appendChild(option);
          }
          select.value = state.selections[disc.id]?.characterId || "";
          select.addEventListener("change", () => {
            state.selections[disc.id].characterId = select.value;
            state.preview = null;
            $("[data-cm-save-spheroid]").disabled = true;
            renderSpheroidOutput(null);
            status($("[data-cm-spheroid-status]"), "Selection changed. Preview the composition to refresh the spheroid.");
          });
          choiceLabel.appendChild(select);
          row.appendChild(choiceLabel);
          const weightLabel = make("label");
          weightLabel.appendChild(make("span", "", "Relative volume weight %"));
          const weight = make("input");
          weight.type = "number";
          weight.min = "0.01";
          weight.max = "100";
          weight.step = "any";
          weight.value = state.selections[disc.id]?.sharePercent ?? "25";
          weight.dataset.cmDiscShare = disc.id;
          weight.addEventListener("input", () => {
            state.selections[disc.id].sharePercent = weight.value;
            state.preview = null;
            $("[data-cm-save-spheroid]").disabled = true;
          });
          weightLabel.appendChild(weight);
          row.appendChild(weightLabel);
          host.appendChild(row);
        }
      }

      const SPHERE_COLORS = Object.freeze(["#55c6db", "#9678ff", "#f0ae57", "#70d89a"]);
      function nabCard(nabId) {
        const box = make("section", "cm-card");
        const row = NAB.byId(nabId);
        if (!row) {
          box.appendChild(make("p", "cm-warning", "Legacy design · NAB unassigned. Create a new designated preview; no historical identity has been guessed."));
          return box;
        }
        box.appendChild(make("h3", "", `NAB ${row.id} · ${row.symbol} · ${row.name}`));
        box.appendChild(make("p", "cm-card-note", `${row.ticker} · ${row.company} · ${row.theme}`));
        const risk = make("p", "cm-pill", `Neural risk: ${row.riskProfile} · ordinal ${row.riskLevel}/3 (not a probability)`);
        risk.style.borderColor = ["#3ddc84", "#ffd94a", "#ff9540", "#ff3b57"][row.riskLevel];
        box.appendChild(risk);
        box.appendChild(make("p", "cm-card-note", row.rationale));
        box.appendChild(make("p", "cm-card-note", `Role: ${row.roles}. Failure mode: ${row.failureMode}. Boundary: ${row.operatingBoundary}.`));
        const details = make("details", "cm-help");
        details.appendChild(make("summary", "", "Accompanying AI design brief · not a running network"));
        details.appendChild(make("p", "", NAB.aiContext(nabId).instructions));
        box.appendChild(details);
        const source = make("a", "cm-help", "NAB Compendium · source of neural classification");
        source.href = "/book-library/harshal-systems/14-nab-compendium.md";
        box.appendChild(source);
        return box;
      }

      function renderNab() {
        $("[data-cm-nab-note]").replaceChildren(nabCard(Number($("[data-cm-nab]").value)));
      }

      function renderSpheroidOutput(composition) {
        const host = $("[data-cm-spheroid-output]");
        host.replaceChildren();
        if (!composition?.ok) {
          const card = make("div", "cm-sphere-card");
          card.appendChild(make("div", "cm-empty", composition?.reason || "A composition preview appears here after selecting at least two assigned Discs."));
          host.appendChild(card);
          return;
        }
        const card = make("div", "cm-sphere-card");
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("class", "cm-sphere");
        svg.setAttribute("viewBox", "0 0 420 260");
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", `Visual composition of ${composition.components.length} character Discs in a spheroid; bands do not show actual material color.`);
        const defs = document.createElementNS(ns, "defs");
        const clip = document.createElementNS(ns, "clipPath");
        clip.setAttribute("id", "cm-sphere-clip");
        const shape = document.createElementNS(ns, "ellipse");
        shape.setAttribute("cx", "210"); shape.setAttribute("cy", "130"); shape.setAttribute("rx", "140"); shape.setAttribute("ry", "100");
        clip.appendChild(shape);
        const sheen = document.createElementNS(ns, "radialGradient");
        sheen.setAttribute("id", "cm-sphere-sheen");
        sheen.setAttribute("cx", "34%"); sheen.setAttribute("cy", "25%"); sheen.setAttribute("r", "78%");
        for (const [offset, color, opacity] of [["0%", "#ffffff", "0.22"], ["48%", "#b9eaff", "0.06"], ["100%", "#020711", "0.52"]]) {
          const stop = document.createElementNS(ns, "stop");
          stop.setAttribute("offset", offset); stop.setAttribute("stop-color", color); stop.setAttribute("stop-opacity", opacity); sheen.appendChild(stop);
        }
        defs.append(clip, sheen);
        svg.appendChild(defs);
        const bands = document.createElementNS(ns, "g");
        bands.setAttribute("clip-path", "url(#cm-sphere-clip)");
        const ordered = [...composition.components].sort((a, b) => Catalog.discs.findIndex(item => item.id === a.discId) - Catalog.discs.findIndex(item => item.id === b.discId));
        const top = 30;
        const totalHeight = 200;
        let y = top;
        for (let index = 0; index < ordered.length; index++) {
          const component = ordered[index];
          const height = index === ordered.length - 1 ? top + totalHeight - y : totalHeight * component.volumeFraction;
          const rect = document.createElementNS(ns, "rect");
          rect.setAttribute("x", "65"); rect.setAttribute("y", String(y)); rect.setAttribute("width", "290"); rect.setAttribute("height", String(height + 0.5));
          rect.setAttribute("fill", SPHERE_COLORS[Catalog.discs.findIndex(item => item.id === component.discId) % SPHERE_COLORS.length]);
          bands.appendChild(rect);
          y += height;
        }
        svg.appendChild(bands);
        const overlay = document.createElementNS(ns, "ellipse");
        overlay.setAttribute("cx", "210"); overlay.setAttribute("cy", "130"); overlay.setAttribute("rx", "140"); overlay.setAttribute("ry", "100");
        overlay.setAttribute("fill", "url(#cm-sphere-sheen)");
        svg.appendChild(overlay);
        const outline = document.createElementNS(ns, "ellipse");
        outline.setAttribute("cx", "210"); outline.setAttribute("cy", "130"); outline.setAttribute("rx", "140"); outline.setAttribute("ry", "100");
        outline.setAttribute("fill", "none"); outline.setAttribute("stroke", "rgba(205,232,255,.78)"); outline.setAttribute("stroke-width", "1.4");
        svg.appendChild(outline);
        card.appendChild(svg);
        card.appendChild(make("p", "cm-sphere-caption", "Disc bands are a schematic visual encoding—not the constituent materials' actual colors, geometry, or microstructure."));
        const legend = make("div", "cm-sphere-legend");
        for (const [index, component] of ordered.entries()) {
          const item = make("span", "cm-legend-item");
          const swatch = make("i", "cm-legend-swatch");
          swatch.style.background = SPHERE_COLORS[Catalog.discs.findIndex(disc => disc.id === component.discId) % SPHERE_COLORS.length];
          item.append(swatch, document.createTextNode(`${Catalog.disc(component.discId)?.name || component.discId} · ${Math.round(component.volumeFraction * 1000) / 10}%`));
          legend.appendChild(item);
        }
        card.appendChild(legend);

        const summary = make("dl", "cm-summary");
        const discs = make("div"); discs.append(make("dt", "", "Bounded Discs"), make("dd", "", String(composition.components.length))); summary.appendChild(discs);
        const share = make("div"); share.append(make("dt", "", "Relative weights"), make("dd", "", `${format(composition.totalShare)}% normalized`)); summary.appendChild(share);
        const density = make("div", "large"); density.append(make("dt", "", "Ideal volume-weighted density"), make("dd", "", composition.densityEstimate === null ? "Not calculable · density missing" : `${format(composition.densityEstimate)} g/cm³`)); summary.appendChild(density);
        const pdh = make("div"); pdh.append(make("dt", "", "Representation"), make("dd", "", "Visual composite · non-authoritative")); summary.appendChild(pdh);
        card.appendChild(summary);

        const table = make("table", "cm-component-table");
        const thead = document.createElement("thead");
        const header = document.createElement("tr");
        for (const label of ["Disc", "Character · material", "Share"]) header.appendChild(make("th", "", label));
        thead.appendChild(header); table.appendChild(thead);
        const tbody = document.createElement("tbody");
        for (const component of ordered) {
          const tr = document.createElement("tr");
          tr.appendChild(make("td", "", Catalog.disc(component.discId)?.name || component.discId));
          tr.appendChild(make("td", "", `${component.characterName} · ${component.formula} (${component.materialId})`));
          tr.appendChild(make("td", "", `${format(component.volumeFraction * 100, 4)}%`));
          tbody.appendChild(tr);
        }
        table.appendChild(tbody); card.appendChild(table);
        card.appendChild(make("p", "cm-pdh-note", composition.densityAssumption));
        card.appendChild(nabCard(composition.designation.nabId));
        host.appendChild(card);
      }

      function selectedComponents() {
        return Catalog.discs.map(disc => ({ discId: disc.id, ...(state.selections[disc.id] || {}) }))
          .filter(item => item.characterId);
      }

      function renderSpheroids() {
        const host = $("[data-cm-spheroids]");
        if (!host) return;
        host.replaceChildren();
        $("[data-cm-spheroid-count]").textContent = `${state.spheroids.length} design${state.spheroids.length === 1 ? "" : "s"}`;
        if (!state.spheroids.length) {
          host.appendChild(make("div", "cm-empty", "No saved spheroids. Create a preview above and save it to this browser."));
          return;
        }
        for (const spheroid of state.spheroids) {
          const card = make("article", "cm-card");
          const head = make("div", "cm-card-head");
          head.append(make("h3", "", spheroid.name), make("span", "cm-pill", `${spheroid.components.length} Discs`));
          card.appendChild(head);
          const details = spheroid.components.map(component => {
            const character = state.characters.find(item => item.id === component.characterId);
            const material = state.materials.find(item => item.materialId === component.materialId);
            return `${Catalog.disc(component.discId)?.name || component.discId}: ${character?.name || "character unavailable"} · ${material?.formula || component.materialId} · ${format(component.sharePercent)}% weight`;
          });
          card.appendChild(make("p", "cm-card-note", details.join(" | ")));
          card.appendChild(nabCard(spheroid.nabId));
          card.appendChild(make("p", "cm-card-sub", `Saved ${spheroid.createdAt}`));
          host.appendChild(card);
        }
      }

      function renderTabs() {
        for (const tab of body.querySelectorAll("[data-cm-tab]")) {
          const active = tab.dataset.cmTab === state.activeTab;
          tab.setAttribute("aria-selected", String(active));
          tab.tabIndex = active ? 0 : -1;
        }
        for (const panel of body.querySelectorAll("[data-cm-pane]")) panel.hidden = panel.dataset.cmPane !== state.activeTab;
      }

      async function doSearch(event) {
        event.preventDefault();
        const queryInput = $("[data-cm-search-query]");
        const query = queryInput.value.trim();
        if (!query || query.length > 64) {
          status($("[data-cm-search-status]"), "Enter a formula, chemical system, or Materials Project ID (maximum 64 characters).", "error");
          queryInput.focus();
          return;
        }
        if (state.searchController) state.searchController.abort();
        const controller = new AbortController();
        state.searchController = controller;
        const sequence = ++state.searchSequence;
        const params = new URLSearchParams({ q: query, limit: $("[data-cm-search-limit]").value });
        const submit = $("[data-cm-search-submit]");
        const cancel = $("[data-cm-search-cancel]");
        submit.disabled = true; cancel.disabled = false;
        $("[data-cm-search-results]").setAttribute("aria-busy", "true");
        status($("[data-cm-search-status]"), `Searching Materials Project for “${query}”…`);
        try {
          const response = await fetch(`/api/materials-project/v1/search?${params.toString()}`, {
            method: "GET", headers: { Accept: "application/json" }, credentials: "same-origin", cache: "no-store", signal: controller.signal
          });
          let payload;
          try { payload = await response.json(); } catch { throw new Error("The Worker returned an unreadable response."); }
          if (!response.ok || payload?.success !== true) {
            const message = payload?.code === "not-configured"
              ? "Materials Project lookup is not configured on this Worker. Add its server-side MATERIALS_PROJECT_API_KEY secret; never enter a key here."
              : payload?.code === "rate-limited"
                ? "The Materials Project search pace limit has been reached; wait and try again."
                : payload?.code === "credentials-rejected"
                  ? "The Worker Materials Project key was rejected. Check the Worker secret; do not paste a key into the browser."
                  : `Lookup failed${response.status ? ` (${response.status})` : ""}: ${String(payload?.message || "The search could not be completed.").slice(0, 200)}`;
            throw Object.assign(new Error(message), { handled: true });
          }
          const data = payload.data;
          if (!data || data.schema !== "harshalos-materials-project-v1" || !Array.isArray(data.results)) throw new Error("The Worker returned an unexpected Materials Project response.");
          if (sequence !== state.searchSequence) return;
          renderSearchResults(data);
          const retrieved = data.retrievedAt ? new Date(data.retrievedAt).toLocaleString() : "retrieval time not reported";
          status($("[data-cm-search-status]"), `${state.searchResults.length} Materials Project result${state.searchResults.length === 1 ? "" : "s"} · ${data.licenseFilter === "BY-C" ? "BY-C scope" : "license scope unverified"} · ${retrieved}${payload.cached ? " · Worker-memory cache" : ""}`, "success");
        } catch (error) {
          if (error?.name === "AbortError" || sequence !== state.searchSequence) return;
          $("[data-cm-search-results]").replaceChildren();
          status($("[data-cm-search-status]"), error?.handled ? error.message : `Lookup unavailable: ${String(error?.message || "network error").slice(0, 220)}`, "error");
        } finally {
          if (sequence === state.searchSequence) {
            state.searchController = null;
            submit.disabled = false; cancel.disabled = true;
            $("[data-cm-search-results]").setAttribute("aria-busy", "false");
          }
        }
      }

      $("[data-cm-search-form]").addEventListener("submit", doSearch);
      $("[data-cm-search-cancel]").addEventListener("click", () => {
        if (!state.searchController) return;
        state.searchController.abort();
        state.searchController = null;
        state.searchSequence += 1;
        $("[data-cm-search-submit]").disabled = false;
        $("[data-cm-search-cancel]").disabled = true;
        $("[data-cm-search-results]").setAttribute("aria-busy", "false");
        status($("[data-cm-search-status]"), "Search canceled in this browser. A request already received by the Worker may finish upstream.");
      });
      $("[data-cm-search-query]").addEventListener("input", event => {
        if (event.currentTarget.value.length > 64) event.currentTarget.value = event.currentTarget.value.slice(0, 64);
      });

      $("[data-cm-character-form]").addEventListener("submit", event => {
        event.preventDefault();
        const parsed = readCharacterForm();
        if (!parsed.ok) {
          status($("[data-cm-character-status]"), parsed.error, "error");
          return;
        }
        const result = Model.saveCharacter(storage, parsed.character);
        if (!result.ok) {
          status($("[data-cm-character-status]"), result.code === "storage-unavailable" ? "Browser storage is unavailable; profile was not saved." : "Character profile could not be saved. Check its name, Disc, and numeric bounds.", "error");
          return;
        }
        refreshStorage();
        state.activeCharacterId = result.character.id;
        state.editingCharacterId = result.character.id;
        $("[data-cm-field='id']").value = result.character.id;
        $("[data-cm-form-title]").textContent = `Edit · ${result.character.name}`;
        $("[data-cm-save-character]").textContent = "Update profile";
        status($("[data-cm-character-status]"), `${result.character.name} ${result.code} locally. ${Model.assessPdh(result.character).label}.`, "success");
        renderCharacterList();
        renderDiscRows();
        renderSpheroids();
      });
      $("[data-cm-reset-character]").addEventListener("click", () => {
        setForm(null);
        state.activeCharacterId = null;
        renderCharacterList();
      });
      $("[data-cm-characters]").addEventListener("click", event => {
        const button = event.target.closest("[data-cm-character-action]");
        if (!button) return;
        const id = button.dataset.cmCharacterId;
        const character = state.characters.find(item => item.id === id);
        if (!character) return;
        if (button.dataset.cmCharacterAction === "edit") {
          setForm(character);
          state.activeCharacterId = character.id;
          renderMatches();
        } else if (button.dataset.cmCharacterAction === "matches") {
          state.activeCharacterId = character.id;
          renderMatches();
        } else if (button.dataset.cmCharacterAction === "delete") {
          Model.removeCharacter(storage, id);
          refreshStorage();
          if (state.activeCharacterId === id) state.activeCharacterId = null;
          if (state.editingCharacterId === id) setForm(null);
          renderCharacterList(); renderDiscRows(); renderSpheroids();
        }
      });
      $("[data-cm-matches]").addEventListener("click", event => {
        const button = event.target.closest("[data-cm-assign-material]");
        if (!button || button.disabled) return;
        const character = state.characters.find(item => item.id === state.activeCharacterId);
        const material = state.materials.find(item => item.materialId === button.dataset.cmAssignMaterial);
        if (!character || !material) return;
        const result = Model.assignmentCheck(character, material);
        if (!result.ok) {
          status($("[data-cm-character-status]"), result.reason, "warning");
          return;
        }
        const saved = Model.saveCharacter(storage, { ...character, materialId: material.materialId });
        if (!saved.ok) {
          status($("[data-cm-character-status]"), "Browser storage is unavailable; material assignment was not saved.", "error");
          return;
        }
        refreshStorage();
        status($("[data-cm-character-status]"), `${material.formula} (${material.materialId}) assigned locally to ${character.name}. Physical values and PDH are not independently verified.`, "success");
        renderCharacterList(); renderDiscRows(); renderSpheroids();
      });
      $("[data-cm-library]").addEventListener("click", event => {
        const button = event.target.closest("[data-cm-remove-material]");
        if (!button) return;
        const removedId = button.dataset.cmRemoveMaterial;
        Model.removeMaterial(storage, removedId);
        for (const character of state.characters.filter(item => item.materialId === removedId)) {
          Model.saveCharacter(storage, { ...character, materialId: null });
        }
        refreshStorage();
        renderLibrary();
        renderCharacterList();
        renderMatches();
        renderDiscRows();
        renderSpheroids();
      });
      body.querySelector(".cm-tabs").addEventListener("click", event => {
        const button = event.target.closest("[data-cm-tab]");
        if (!button) return;
        state.activeTab = button.dataset.cmTab;
        renderTabs();
      });
      body.querySelector(".cm-tabs").addEventListener("keydown", event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        const tabs = [...body.querySelectorAll("[data-cm-tab]")];
        const current = tabs.indexOf(event.target);
        const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1
          : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
        event.preventDefault(); tabs[next].click(); tabs[next].focus();
      });

      $("[data-cm-nab]").addEventListener("change", () => {
        state.preview = null;
        $("[data-cm-save-spheroid]").disabled = true;
        renderNab();
        renderSpheroidOutput(null);
        status($("[data-cm-spheroid-status]"), "NAB designation changed for this new design. Preview again; saved designs are unchanged.");
      });
      renderNab();
      $("[data-cm-preview-spheroid]").addEventListener("click", () => {
        const components = selectedComponents();
        const composition = Model.composeSpheroid(components, state.characters, state.materials, Number($("[data-cm-nab]").value));
        if (!composition.ok) {
          state.preview = null;
          $("[data-cm-save-spheroid]").disabled = true;
          renderSpheroidOutput(composition);
          status($("[data-cm-spheroid-status]"), composition.reason, "error");
          return;
        }
        state.preview = composition;
        $("[data-cm-save-spheroid]").disabled = false;
        renderSpheroidOutput(composition);
        const densityMessage = composition.densityEstimate === null
          ? "density estimate unavailable because at least one density is not reported"
          : `ideal volume-weighted reference density ${format(composition.densityEstimate)} g/cm³`;
        status($("[data-cm-spheroid-status]"), `${composition.components.length} Disc components normalized from ${format(composition.totalShare)}% relative share weights; ${densityMessage}.`, "success");
      });
      $("[data-cm-save-spheroid]").addEventListener("click", () => {
        if (!state.preview?.ok) return;
        const name = $("[data-cm-spheroid-name]").value.trim() || "Multi-Disc spheroid";
        const result = Model.saveSpheroid(storage, name, selectedComponents(), state.characters, state.materials, Number($("[data-cm-nab]").value));
        if (!result.ok) {
          status($("[data-cm-spheroid-status]"), result.reason || "Spheroid could not be saved.", "error");
          return;
        }
        refreshStorage(); renderSpheroids();
        body.ownerDocument.dispatchEvent(new body.ownerDocument.defaultView.CustomEvent("harshalos:material-spheroids:changed"));
        status($("[data-cm-spheroid-status]"), `“${result.spheroid.name}” saved to this browser's local spheroid shelf.`, "success");
      });

      refreshOnFocus = () => {
        refreshStorage();
        renderLibrary();
        renderCharacterList();
        renderMatches();
        renderDiscRows();
        renderSpheroids();
      };
      renderTabs();
      renderLibrary();
      renderCharacterList();
      renderDiscRows();
      renderSpheroids();
      setForm(null);
    }
  };
  if (Array.isArray(window.APPS)) window.APPS.push(app);
})();
