/* Materials Project summary lookup — read-only, display-only integration.
   Provider credentials stay in the Cloudflare Worker; this browser module calls
   only HarshalOS's same-origin, bounded proxy route. */

"use strict";

(() => {
  const API_PATH = "/api/materials-project/v1/search";
  const MP_RECORD_BASE = "https://next-gen.materialsproject.org/materials/";
  const MAX_QUERY_LENGTH = 64;
  const RESULT_SCHEMA = "harshalos-materials-project-v1";

  const make = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined && value !== null) node.textContent = String(value);
    return node;
  };

  const formatNumber = value => Number.isFinite(value)
    ? new Intl.NumberFormat(undefined, { maximumSignificantDigits: 6 }).format(value)
    : null;

  const displayDate = value => {
    if (typeof value !== "string" || !value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value.slice(0, 48) : date.toLocaleString();
  };

  const validMaterialId = value => typeof value === "string" && /^mp-(?:\d+|[a-z]{8})$/i.test(value);

  function addBadge(host, label, kind = "") {
    const badge = make("span", `mp-badge${kind ? ` ${kind}` : ""}`, label);
    host.appendChild(badge);
  }

  function addProperty(host, label, value) {
    if (value === null || value === undefined || value === "") return;
    const item = make("div", "mp-property");
    item.append(make("dt", "", label), make("dd", "", value));
    host.appendChild(item);
  }

  function addNumericProperty(host, label, value, unit = "") {
    const formatted = formatNumber(value);
    if (formatted !== null) addProperty(host, label, unit ? `${formatted} ${unit}` : formatted);
  }

  function renderRecord(record, resultContext = {}) {
    const article = make("article", "mp-record");
    const header = make("header", "mp-record-head");
    const identity = make("div", "mp-record-identity");
    const title = make("h3", "mp-formula", record.formula || "Formula not reported");
    const idLine = make("div", "mp-id-line");
    const id = validMaterialId(record.materialId) ? record.materialId.toLowerCase() : "ID unavailable";
    if (id !== "ID unavailable") {
      const link = make("a", "mp-id", id);
      link.href = `${MP_RECORD_BASE}${encodeURIComponent(id)}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.referrerPolicy = "no-referrer";
      idLine.append(make("span", "mp-muted", "Materials Project ID"), link);
    } else {
      idLine.append(make("span", "mp-muted", "Materials Project ID"), make("span", "mp-id", id));
    }
    identity.append(title, idLine);
    header.appendChild(identity);

    const badges = make("div", "mp-badges");
    if (record.isStable === true) addBadge(badges, "On computed hull", "good");
    else if (record.isStable === false) addBadge(badges, "Above computed hull", "warn");
    if (record.isMetal === true) addBadge(badges, "Metal · calculated");
    else if (record.isMetal === false) addBadge(badges, "Not classed as metal · calculated");
    if (record.theoretical === true) addBadge(badges, "Theoretical");
    if (record.deprecated === true) addBadge(badges, "Deprecated", "warn");
    if (badges.childElementCount) header.appendChild(badges);
    article.appendChild(header);

    const properties = make("dl", "mp-property-grid");
    addProperty(properties, "Elements", Array.isArray(record.elements) && record.elements.length
      ? record.elements.join(" · ") : null);
    addProperty(properties, "Crystal system", record.symmetry?.crystalSystem);
    const spaceGroup = record.symmetry?.spaceGroup
      ? `${record.symmetry.spaceGroup}${Number.isSafeInteger(record.symmetry.spaceGroupNumber) ? ` · No. ${record.symmetry.spaceGroupNumber}` : ""}`
      : Number.isSafeInteger(record.symmetry?.spaceGroupNumber) ? `No. ${record.symmetry.spaceGroupNumber}` : null;
    addProperty(properties, "Space group", spaceGroup);
    if (record.elementCount !== null && record.elementCount !== undefined) addProperty(properties, "Elements in formula", String(record.elementCount));
    if (record.siteCount !== null && record.siteCount !== undefined) addProperty(properties, "Sites in unit cell", String(record.siteCount));
    addNumericProperty(properties, "Density", record.density, "g/cm³");
    addNumericProperty(properties, "Unit-cell volume", record.cellVolume, "Å³");
    addNumericProperty(properties, "Band gap · calculated", record.bandGap, "eV");
    if (record.isDirectGap !== null && record.isDirectGap !== undefined) addProperty(properties, "Direct band gap · calculated", record.isDirectGap ? "Yes" : "No");
    addNumericProperty(properties, "Formation energy · calculated", record.formationEnergyPerAtom, "eV/atom");
    addNumericProperty(properties, "Energy above hull · calculated", record.energyAboveHull, "eV/atom");
    addNumericProperty(properties, "Bulk modulus · VRH calculated", record.bulkModulusGpa, "GPa");
    addNumericProperty(properties, "Shear modulus · VRH calculated", record.shearModulusGpa, "GPa");
    addNumericProperty(properties, "Isotropic Poisson ratio · calculated", record.poissonRatio);
    addNumericProperty(properties, "Universal anisotropy · calculated", record.universalAnisotropy);
    if (properties.childElementCount) article.appendChild(properties);

    if (Array.isArray(record.warnings) && record.warnings.length) {
      const warningBox = make("div", "mp-record-warning");
      warningBox.appendChild(make("strong", "", "Materials Project record warnings"));
      const list = make("ul", "");
      for (const warning of record.warnings.slice(0, 8)) list.appendChild(make("li", "", warning));
      warningBox.appendChild(list);
      article.appendChild(warningBox);
    }

    const provenance = [];
    if (Array.isArray(record.origins)) {
      for (const origin of record.origins.slice(0, 12)) {
        if (!origin || typeof origin !== "object") continue;
        const name = typeof origin.name === "string" ? origin.name : "";
        const taskId = typeof origin.taskId === "string" ? origin.taskId : "";
        if (name || taskId) provenance.push([name, taskId].filter(Boolean).join(" · "));
      }
    }
    if (provenance.length) {
      const details = make("details", "mp-provenance");
      details.appendChild(make("summary", "", `Calculation provenance (${provenance.length})`));
      const list = make("ul", "");
      for (const item of provenance) list.appendChild(make("li", "mono", item));
      details.appendChild(list);
      article.appendChild(details);
    }

    const footerBits = [];
    const lastUpdated = displayDate(record.lastUpdated);
    if (lastUpdated) footerBits.push(`MP record updated ${lastUpdated}`);
    if (Array.isArray(record.availableProperties) && record.availableProperties.length) {
      const shown = record.availableProperties.slice(0, 8);
      footerBits.push(`Available property groups: ${shown.join(", ")}${record.availableProperties.length > shown.length ? ` +${record.availableProperties.length - shown.length} more` : ""}`);
    }
    if (footerBits.length) article.appendChild(make("p", "mp-record-foot", footerBits.join(" · ")));

    /* Saved records are the only bridge into the local Character Materials model.
       The model receives this fixed summary projection, never a key or live object. */
    const materialModel = window.CharacterMaterialModel;
    if (materialModel && validMaterialId(record.materialId)) {
      const actions = make("div", "mp-model-actions");
      const save = make("button", "mp-button mp-model-save", "Save to Material Spheroids");
      save.type = "button";
      save.dataset.mpSaveMaterial = record.materialId.toLowerCase();
      const note = make("span", "mp-model-save-note", "Browser-local only");
      save.addEventListener("click", () => {
        let localStorage = null;
        try { localStorage = window.localStorage; } catch { /* storage can be disabled */ }
        const result = materialModel.saveMaterial(localStorage, record, {
          licenseFilter: resultContext.licenseFilter,
          retrievedAt: resultContext.retrievedAt,
          savedAt: new Date().toISOString()
        });
        if (!result.ok) {
          note.textContent = result.code === "storage-unavailable"
            ? "Browser storage unavailable; not saved."
            : result.code === "library-full" ? "Local material library is full."
              : "This result could not be saved.";
          note.className = "mp-model-save-note error";
          return;
        }
        save.textContent = result.code === "updated" ? "Update local model record" : "Saved · Material Spheroids";
        note.textContent = `${result.material.formula} (${result.material.materialId}) is available in the Material Spheroids app.`;
        note.className = "mp-model-save-note success";
      });
      actions.append(save, note);
      article.appendChild(actions);
    }
    return article;
  }

  function readError(payload, status) {
    const message = typeof payload?.message === "string" ? payload.message.slice(0, 240) : "The lookup could not be completed.";
    if (payload?.code === "not-configured") {
      return "The Materials Project Worker secret is not configured yet. Add MATERIALS_PROJECT_API_KEY as a Cloudflare Worker secret; never put it in browser code.";
    }
    if (payload?.code === "rate-limited") return "Search pace limit reached. Wait a moment before searching again; the limit may come from this Worker or the Materials Project API.";
    if (payload?.code === "credentials-rejected") return "The Worker key was rejected. Check the Cloudflare Worker secret; do not paste the key into HarshalOS.";
    return `Lookup failed${Number.isInteger(status) ? ` (${status})` : ""}: ${message}`;
  }

  const app = {
    id: "materials-project",
    title: "Materials Project",
    short: "Materials",
    glyph: "⚛",
    desc: "Read-only computational materials lookup by formula or Materials Project ID",
    w: 900,
    h: 700,
    render(body) {
      body.innerHTML = `
        <div class="mp-app">
          <header class="mp-header">
            <div>
              <p class="mp-eyebrow">READ-ONLY MATERIALS DATABASE</p>
              <h1>Materials Project</h1>
              <p class="mp-lede">Look up a chemical formula, chemical system, or Materials Project ID. This is a focused database search, not a general-purpose physics or engineering solver.</p>
            </div>
            <span class="mp-source-badge">SAME-ORIGIN WORKER PROXY</span>
          </header>

          <form class="mp-search" data-mp-form>
            <label class="mp-query-label" for="mp-query">Formula, chemical system, or MP ID</label>
            <div class="mp-controls">
              <input id="mp-query" name="q" type="text" maxlength="${MAX_QUERY_LENGTH}" required autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="SiO2 · Li-Fe-O · mp-149" aria-describedby="mp-help">
              <label class="mp-limit-label" for="mp-limit">Results</label>
              <select id="mp-limit" name="limit" aria-label="Maximum results">
                <option value="5">5</option>
                <option value="10" selected>10</option>
                <option value="20">20 max</option>
              </select>
              <button class="mp-button mp-button-primary" type="submit" data-mp-submit>SEARCH</button>
              <button class="mp-button" type="button" data-mp-cancel disabled>STOP</button>
            </div>
            <p class="mp-help" id="mp-help">Examples: <code>SiO2</code>, <code>mp-149</code>, or <code>Li-Fe-O</code>. Formula search can return multiple polymorphs; results request lowest energy-above-hull first, then MP ID. Compare IDs because properties may differ.</p>
          </form>

          <div class="mp-disclaimer" role="note">
            <strong>Interpretation limit:</strong> many values are computationally derived, may be absent for a record, and are not guaranteed experimental measurements or engineering performance. Do not use this display alone to certify a material or design.
          </div>

          <p class="mp-help">To use a result in the local assignment model, select <strong>Save to Material Spheroids</strong> on its card. Saved summaries stay in this browser and are not uploaded.</p>
          <div class="mp-status" data-mp-status role="status" aria-live="polite">No lookup has been run. Search is manual; opening this app makes no provider request.</div>
          <section class="mp-results" data-mp-results aria-label="Materials Project search results" aria-busy="false"></section>

          <section class="mp-info-grid" aria-label="Attribution and data-use notes">
            <aside class="mp-info-card">
              <h2>Attribution & licensing</h2>
              <p>Data source: <a href="https://next-gen.materialsproject.org/" target="_blank" rel="noopener noreferrer">Materials Project</a>. Search requests use the API's <code>BY-C</code> license scope; records restricted to <code>BY-NC</code> are not requested.</p>
              <p>GNoME-origin data may be subject to a separate <a href="https://next-gen.materialsproject.org/about/cite" target="_blank" rel="noopener noreferrer">CC BY-NC license</a>. Confirm the license for the specific record before reuse or redistribution.</p>
            </aside>
            <aside class="mp-info-card">
              <h2>Suggested citation</h2>
              <p>Jain, A. et al. “The Materials Project: A materials genome approach to accelerating materials innovation.” <em>APL Materials</em> 1, 011002 (2013).</p>
              <p><a href="https://doi.org/10.1063/1.4812323" target="_blank" rel="noopener noreferrer">doi:10.1063/1.4812323</a> · <a href="https://api.materialsproject.org/docs" target="_blank" rel="noopener noreferrer">API documentation</a></p>
            </aside>
          </section>
          <p class="mp-footer">HarshalOS normalizes a fixed set of summary fields. Results are a read-only snapshot, cached in Worker memory for up to five minutes, and linked to their Materials Project records for source review.</p>
        </div>`;

      const form = body.querySelector("[data-mp-form]");
      const input = body.querySelector("#mp-query");
      const limit = body.querySelector("#mp-limit");
      const submit = body.querySelector("[data-mp-submit]");
      const cancel = body.querySelector("[data-mp-cancel]");
      const status = body.querySelector("[data-mp-status]");
      const results = body.querySelector("[data-mp-results]");
      let activeController = null;
      let sequence = 0;

      const setStatus = (message, kind = "") => {
        status.className = `mp-status${kind ? ` ${kind}` : ""}`;
        status.textContent = message;
      };
      const stop = () => {
        if (!activeController) return;
        activeController.abort();
        activeController = null;
        sequence += 1;
        results.setAttribute("aria-busy", "false");
        submit.disabled = false;
        cancel.disabled = true;
        setStatus("Search canceled in this browser. A request already received by the Worker may still finish upstream.", "muted");
      };

      form.addEventListener("submit", async event => {
        event.preventDefault();
        const query = input.value.trim();
        if (!query || query.length > MAX_QUERY_LENGTH) {
          setStatus(`Enter a formula or Materials Project ID (maximum ${MAX_QUERY_LENGTH} characters).`, "error");
          input.focus();
          return;
        }
        if (activeController) activeController.abort();
        const controller = new AbortController();
        activeController = controller;
        const requestSequence = ++sequence;
        const params = new URLSearchParams({ q: query, limit: limit.value });
        results.replaceChildren();
        results.setAttribute("aria-busy", "true");
        submit.disabled = true;
        cancel.disabled = false;
        setStatus(`Searching Materials Project for “${query}”…`, "loading");

        try {
          const response = await fetch(`${API_PATH}?${params.toString()}`, {
            method: "GET",
            headers: { Accept: "application/json" },
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal
          });
          let payload;
          try { payload = await response.json(); }
          catch { throw new Error("The Worker returned an unreadable response."); }
          if (!response.ok || payload?.success !== true) {
            throw Object.assign(new Error(readError(payload, response.status)), { handled: true });
          }
          const data = payload.data;
          if (!data || data.schema !== RESULT_SCHEMA || !Array.isArray(data.results)) {
            throw new Error("The Worker returned an unexpected Materials Project response.");
          }
          if (requestSequence !== sequence) return;
          const safeResults = data.results.filter(record => record && typeof record === "object").slice(0, 20);
          if (!safeResults.length) {
            setStatus(`No matching records found for “${query}” in the BY-C license scope. Try a Materials Project ID or another formula.`, "muted");
            return;
          }
          const fragment = document.createDocumentFragment();
          for (const record of safeResults) fragment.appendChild(renderRecord(record, data));
          results.replaceChildren(fragment);
          const cached = payload.cached === true ? " · Worker-memory cache" : "";
          const retrieved = displayDate(data.retrievedAt);
          setStatus(`${safeResults.length} result${safeResults.length === 1 ? "" : "s"} for “${String(data.query || query).slice(0, MAX_QUERY_LENGTH)}” · ${data.licenseFilter === "BY-C" ? "license scope BY-C" : "license scope unverified"}${retrieved ? ` · retrieved ${retrieved}` : ""}${cached}`, "success");
        } catch (error) {
          if (error?.name === "AbortError" || requestSequence !== sequence) return;
          results.replaceChildren();
          setStatus(error?.handled ? error.message : `Lookup unavailable: ${String(error?.message || "Network error").slice(0, 240)}`, "error");
        } finally {
          if (requestSequence === sequence) {
            activeController = null;
            results.setAttribute("aria-busy", "false");
            submit.disabled = false;
            cancel.disabled = true;
          }
        }
      });
      cancel.addEventListener("click", stop);
      input.addEventListener("input", () => {
        if (input.value.length > MAX_QUERY_LENGTH) input.value = input.value.slice(0, MAX_QUERY_LENGTH);
      });
    }
  };

  if (Array.isArray(window.APPS)) window.APPS.push(app);
})();
