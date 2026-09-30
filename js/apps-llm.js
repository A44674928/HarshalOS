/* ═══════════════════════════════════════════════════════════════
   HarshalOS — LLM Link (window.APPS entry "llmlink")

   The connection point: pick a provider, load your own key, test it,
   and see exactly what leaves this browser. Nothing here is required
   for the rest of the site — it is the difference between reading a
   retrieved record with fixed keyword rules and reading it properly.
   ═══════════════════════════════════════════════════════════════ */

APPS.push({
  id: "llmlink",
  title: "LLM Link",
  short: "LLM Link",
  glyph: "⌘",
  desc: "Connect your own model — read the retrieved record in full instead of matching keywords",
  w: 880, h: 720,
  render(body, api) {
    const LLM = window.HOSLLM;
    const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const local = { models: [], busy: "", result: null, saved: "" };

    if (!LLM) { body.innerHTML = `<div class="h1">LLM Link</div><div class="rule-box refusal">The connection layer (js/llm.js) is not loaded in this deployment.</div>`; return; }

    const draw = () => {
      const settings = LLM.loadSettings();
      const config = LLM.resolved(settings);
      const status = LLM.status();
      const stats = LLM.stats();
      const preset = LLM.preset(settings.provider);
      const keyField = LLM.keyStorage() === "none" ? "" : LLM.keyHint();
      body.innerHTML = `
        <div class="h1">LLM Link</div>
        <div class="sub">Bring your own model. HarshalOS has no model of its own and no server of its own: with a link, the
        <strong>Ground-0 automatic audit</strong> can have the documents this browser already retrieved <em>read</em> — every
        answer bound to a verbatim quote — instead of being matched against fixed keyword rules. Without a link, every app
        behaves exactly as before.</div>

        <div class="rule-box ${status.linked ? "" : "refusal"}">
          ${status.linked
            ? `LINKED · ${esc(status.label)} · <span class="mono">${esc(status.model)}</span>${status.keyStorage === "persistent" ? " · key kept in this browser" : status.keyStorage === "session" ? " · key held for this tab only" : status.keyStorage === "memory" ? " · key held in memory for this page" : status.relay ? " · key held by the site relay" : ""}`
            : `NOT LINKED — ${esc(status.reason || "No model is connected.")}`}
        </div>
        ${status.storageNote ? `<div class="rule-box refusal">${esc(status.storageNote)}</div>` : ""}

        <div class="h2">Connection</div>
        <div class="ll-grid">
          <label class="ll-field"><span>Provider</span>
            <select id="ll-provider">${Object.entries(LLM.PROVIDERS).map(([id, provider]) => `<option value="${id}"${settings.provider === id ? " selected" : ""}>${esc(provider.label)}</option>`).join("")}</select>
          </label>
          <label class="ll-field"><span>Protocol</span>
            <select id="ll-protocol">
              <option value=""${!settings.protocol ? " selected" : ""}>Provider default (${esc(preset.protocol === "anthropic" ? "Anthropic messages" : "OpenAI-compatible chat")})</option>
              <option value="openai"${settings.protocol === "openai" ? " selected" : ""}>OpenAI-compatible chat/completions</option>
              <option value="anthropic"${settings.protocol === "anthropic" ? " selected" : ""}>Anthropic messages</option>
            </select>
          </label>
          <label class="ll-field wide"><span>Endpoint</span>
            <input id="ll-endpoint" type="text" spellcheck="false" value="${esc(settings.endpoint || preset.endpoint)}" placeholder="https://…/chat/completions">
          </label>
          <label class="ll-field wide"><span>Model</span>
            <span class="ll-inline">
              <input id="ll-model" type="text" spellcheck="false" value="${esc(settings.model || preset.model)}" placeholder="model name or id">
              <button class="btn" id="ll-models" type="button">List models</button>
            </span>
          </label>
          <label class="ll-field wide"><span>API key ${preset.keyOptional ? "(optional — this endpoint may need none)" : ""}</span>
            <input id="ll-key" type="password" spellcheck="false" autocomplete="off" placeholder="${keyField ? esc(keyField) : "paste your own key — it is sent only to the endpoint above"}">
          </label>
        </div>
        <label class="ll-check"><input type="checkbox" id="ll-persist"${settings.persist ? " checked" : ""}> Keep the key in this browser after the tab closes (otherwise it is held for this tab only)</label>

        <div class="btn-row">
          <button class="btn btn-ice" id="ll-save">Save connection</button>
          <button class="btn btn-gold" id="ll-test" ${status.linked ? "" : "disabled"}>Test connection</button>
          <button class="btn" id="ll-clear">Clear key</button>
          ${local.busy ? `<span class="ll-busy mono">${esc(local.busy)}</span>` : ""}
        </div>

        ${local.models.length ? `
        <div class="ll-models">
          <div class="sub mono">${local.models.length} model${local.models.length === 1 ? "" : "s"} available to this key — pick one:</div>
          <div class="ll-model-list">${local.models.slice(0, 60).map(id => `<button class="ll-model-chip${id === config.model ? " on" : ""}" data-model="${esc(id)}" type="button">${esc(id)}</button>`).join("")}</div>
        </div>` : ""}

        ${local.result ? `
        <div class="rule-box ${local.result.ok ? "" : "refusal"}">
          ${local.result.ok
            ? `LINK ESTABLISHED · ${esc(local.result.label)} · <span class="mono">${esc(local.result.model)}</span> · ${local.result.ms} ms${local.result.usage && local.result.usage.output ? ` · ${local.result.usage.output} output tokens` : ""}<br><span class="dim">Model replied: “${esc(local.result.sample)}”</span>`
            : `LINK FAILED · ${esc(local.result.title)}<br><span class="dim">${esc(local.result.detail)}</span>${local.result.hint ? `<br><span class="dim">${esc(local.result.hint)}</span>` : ""}`}
        </div>` : ""}

        <div class="h2">Provider note</div>
        <p class="body">${esc(config.note || preset.note || "")}${config.browser === "blocked" ? "" : ""}</p>

        <div class="h2">What leaves this browser</div>
        <ul class="ul">
          <li class="li">The prompt: the questions, the retrieved source text for the pass being read, and the entity name and
          evidence cutoff. Nothing else — no audit register, no other organization, no Human Key, no duty ledger.</li>
          <li class="li">The key, to the endpoint above and nowhere else.</li>
          <li class="li">Request metadata the provider requires (model, token ceiling, temperature).</li>
        </ul>
        <div class="rule-box">What stays here: your key (unless you paste it into another tool), every audit, the evidence
        library, the duty ledger, and the Human Key. There is no HarshalOS server in the path. A browser cannot hide a key
        from someone who has access to that browser — that is why the key is held for this tab only unless you say otherwise.</div>

        <div class="h2">Where the link is used</div>
        <ul class="ul">
          <li class="li"><strong>Ground-0 → Automatic audit</strong> — after the research run, “Read the retrieved record with the
          model”: the model reads the documents this browser fetched, proposes an answer per question with a verbatim quote,
          and asks for specific linked pages the record itself contains where text is missing.</li>
          <li class="li"><strong>Ground-0 → Evidence</strong> — read one saved artifact and see which questions it can support.</li>
          <li class="li refusal">A model reading never scores by itself: every quote is checked character-for-character against
          the stored text, unverifiable readings are discarded, and the record still requires human review. The working badge
          is a progress marker; the formal badge still needs a signed phase declaration.</li>
        </ul>

        <div class="h2">Session activity</div>
        <p class="body mono">${stats.calls} call${stats.calls === 1 ? "" : "s"} · ${stats.input.toLocaleString()} tokens in · ${stats.output.toLocaleString()} tokens out${stats.lastModel ? ` · last: ${esc(stats.lastModel)} in ${stats.lastMs} ms` : ""}${stats.failures ? ` · ${stats.failures} failed` : ""}</p>
        <div class="btn-row"><button class="btn" id="ll-reset-stats" type="button">Reset activity</button></div>

        <div class="footer-note">
          ONE CONNECTION, MANY MODELS · ANTHROPIC AND OPENROUTER ANSWER BROWSER CALLS DIRECTLY · OPENAI'S API DOES NOT, SO IT NEEDS THE RELAY OR A LOCAL SERVER
        </div>`;

      body.querySelector("#ll-provider").addEventListener("change", event => {
        const provider = LLM.PROVIDERS[event.target.value];
        LLM.saveSettings({ provider: event.target.value, endpoint: provider.endpoint, model: provider.model, protocol: "" });
        local.models = []; local.result = null; draw();
      });
      body.querySelector("#ll-protocol").addEventListener("change", event => { LLM.saveSettings({ protocol: event.target.value }); draw(); });
      body.querySelector("#ll-endpoint").addEventListener("change", event => { LLM.saveSettings({ endpoint: event.target.value.trim() }); });
      body.querySelector("#ll-model").addEventListener("change", event => { LLM.saveSettings({ model: event.target.value.trim() }); });
      body.querySelector("#ll-persist").addEventListener("change", event => {
        const persist = event.target.checked;
        LLM.saveSettings({ persist });
        const key = body.querySelector("#ll-key").value.trim() || LLM.apiKey();
        if (key) LLM.setKey(key, persist);
        draw();
      });
      body.querySelector("#ll-save").addEventListener("click", () => {
        const provider = body.querySelector("#ll-provider").value;
        const protocol = body.querySelector("#ll-protocol").value;
        const endpoint = body.querySelector("#ll-endpoint").value.trim();
        const model = body.querySelector("#ll-model").value.trim();
        const key = body.querySelector("#ll-key").value.trim();
        const persist = body.querySelector("#ll-persist").checked;
        LLM.saveSettings({ provider, protocol, endpoint, model, persist });
        if (key) LLM.setKey(key, persist);
        const status = LLM.status();
        local.result = null;
        draw();
        api.toast(status.linked ? "permit" : "warn", status.linked ? "LLM LINK SAVED" : "LLM LINK INCOMPLETE", status.linked ? `${status.label} · ${status.model}. Ground-0 can now read retrieved records with it.` : status.reason);
      });
      body.querySelector("#ll-clear").addEventListener("click", () => {
        LLM.clearKey();
        local.result = null;
        draw();
        api.toast("info", "KEY CLEARED", "No key is held in this browser now. The provider, endpoint and model are kept.");
      });
      body.querySelector("#ll-reset-stats").addEventListener("click", () => { LLM.resetStats(); draw(); });
      body.querySelector("#ll-models").addEventListener("click", async () => {
        const endpoint = body.querySelector("#ll-endpoint").value.trim();
        const model = body.querySelector("#ll-model").value.trim();
        const key = body.querySelector("#ll-key").value.trim();
        LLM.saveSettings({ provider: body.querySelector("#ll-provider").value, protocol: body.querySelector("#ll-protocol").value, endpoint, model });
        if (key) LLM.setKey(key, body.querySelector("#ll-persist").checked);
        local.busy = "Listing models…"; draw();
        try {
          const models = await LLM.loadModels(LLM.resolved());
          local.models = models; local.busy = ""; local.result = null;
          draw();
          api.toast(models.length ? "info" : "warn", models.length ? `${models.length} MODELS AVAILABLE` : "NO MODELS RETURNED", models.length ? "Pick one from the list." : "The endpoint answered but listed no models. Type the model name instead.");
        } catch (error) {
          local.busy = ""; local.result = { ok: false, ...LLM.describe(error) };
          draw();
        }
      });
      body.querySelector("#ll-test").addEventListener("click", async () => {
        const endpoint = body.querySelector("#ll-endpoint").value.trim();
        const model = body.querySelector("#ll-model").value.trim();
        const key = body.querySelector("#ll-key").value.trim();
        LLM.saveSettings({ provider: body.querySelector("#ll-provider").value, protocol: body.querySelector("#ll-protocol").value, endpoint, model });
        if (key) LLM.setKey(key, body.querySelector("#ll-persist").checked);
        local.busy = "Calling the model…"; local.result = null; draw();
        try {
          const probe = await LLM.probe({});
          local.busy = ""; local.result = probe; draw();
          api.toast("permit", "LINK ESTABLISHED", `${probe.label} · ${probe.model} answered in ${probe.ms} ms.`);
        } catch (error) {
          local.busy = ""; local.result = { ok: false, ...LLM.describe(error) }; draw();
          api.toast("refusal", "LINK FAILED", LLM.describe(error).detail);
        }
      });
      body.querySelectorAll(".ll-model-chip").forEach(chip => chip.addEventListener("click", () => {
        LLM.saveSettings({ model: chip.dataset.model });
        draw();
      }));
    };

    draw();
  }
});
