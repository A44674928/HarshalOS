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
    const local = { models: [], busy: "", result: null, saved: "", relay: null, relayLoading: false };

    if (!LLM) { body.innerHTML = `<div class="h1">LLM Link</div><div class="rule-box refusal">The connection layer (js/llm.js) is not loaded in this deployment.</div>`; return; }

    /* What this deployment's own relay says about itself. Asked once when the
       relay preset is selected, and again only on the button: the answer is a
       disclosure about configuration, and it never carries a key. */
    const relayBox = (config, relayInfo, loading) => {
      if (!config.relay) return "";
      if (loading) return `<div class="rule-box">ASKING THIS DEPLOYMENT'S RELAY…</div>`;
      if (!relayInfo) return "";
      if (relayInfo.reachable && relayInfo.configured) {
        const models = Array.isArray(relayInfo.models) ? relayInfo.models.join(", ") : "";
        const limits = relayInfo.limits || {};
        /* The pace is disclosed with both of its numbers, because they answer
           different questions: what this reader may spend, and what everyone
           on this deployment may spend together out of one free-tier key. */
        const pace = limits.localRateLimitsDisabled
          ? "Worker-local rate guards DISABLED for this preview · Z.AI limits still apply"
          : limits.requestsPerMinute
            ? `${limits.requestsPerMinute} calls/minute per caller${limits.sharedRequestsPerMinute ? `, ${limits.sharedRequestsPerMinute}/minute shared across everyone here` : ""}${limits.windowSeconds ? ` over a sliding ${limits.windowSeconds}s window` : ""}`
            : "";
        const paceNote = limits.localRateLimitsDisabled
          ? "This diagnostic preview does not enforce local rate caps. Anyone who can reach it can use the preview's shared key/quota; Z.AI may still return 429."
          : "The Worker holds the key and applies local pace guards; a short wait is absorbed automatically and named in the progress line.";
        return `<div class="rule-box">RELAY CONFIGURED · ${esc(relayInfo.provider || "zai")} ${esc(relayInfo.tier || "free")} tier${models ? ` · allowlist: <span class="mono">${esc(models)}</span>` : ""}${relayInfo.keyVariable ? ` · key held in the Worker secret <span class="mono">${esc(relayInfo.keyVariable)}</span>` : ""}${pace ? ` · ${esc(pace)}` : ""}<br><span class="dim">No key leaves this browser. Prompts pass through this deployment's Worker to <span class="mono">${esc(relayInfo.upstream || "the provider")}</span>. ${esc(paceNote)}</span></div>`;
      }
      if (relayInfo.reachable) {
        const names = Array.isArray(relayInfo.acceptedKeyVariables) ? relayInfo.acceptedKeyVariables : [];
        return `<div class="rule-box refusal">RELAY NOT CONFIGURED — ${esc(relayInfo.message || "This deployment's Worker has no Z.AI key.")}${names.length ? `<br><span class="dim">Worker secret names it accepts: <span class="mono">${esc(names.join(", "))}</span>. Add one, redeploy or save it, then press Check relay.</span>` : ""}</div>`;
      }
      return `<div class="rule-box refusal">NO RELAY HERE — ${esc(relayInfo.reason || "This deployment does not answer the relay status route.")}</div>`;
    };

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
        <div class="rule-box refusal"><strong>DATA-ONLY AUTHORITY BOUNDARY:</strong> Replies are inert, untrusted data. This app exposes no model-tool dispatcher or code-execution path from a reply into HOS. Ground-0 readings stay review-required, and no quote-backed answer is preselected. This is application-level separation, not a browser sandbox.</div>
        ${relayBox(config, local.relay, local.relayLoading)}
        ${config.protocol === "google" ? `<div class="rule-box refusal"><strong>BROWSER KEY WARNING:</strong> Google recommends not exposing API keys in client-side code for production. This BYOK connection sends the key directly to the endpoint above (Google's Gemini Developer API by default), but anyone with access to this browser can inspect it. Use only a key type and restrictions currently accepted by Google for the Gemini API.</div>` : ""}

        <div class="h2">Connection</div>
        <div class="ll-grid">
          <label class="ll-field"><span>Provider</span>
            <select id="ll-provider">${Object.entries(LLM.PROVIDERS).map(([id, provider]) => `<option value="${id}"${settings.provider === id ? " selected" : ""}>${esc(provider.label)}</option>`).join("")}</select>
          </label>
          <label class="ll-field"><span>Protocol</span>
            <select id="ll-protocol">
              <option value=""${!settings.protocol ? " selected" : ""}>Provider default (${esc(preset.protocol === "anthropic" ? "Anthropic messages" : preset.protocol === "google" ? "Google GenAI SDK" : "OpenAI-compatible chat")})</option>
              <option value="openai"${settings.protocol === "openai" ? " selected" : ""}>OpenAI-compatible chat/completions</option>
              <option value="anthropic"${settings.protocol === "anthropic" ? " selected" : ""}>Anthropic messages</option>
              <option value="google"${settings.protocol === "google" ? " selected" : ""}>Google GenAI SDK (@google/genai)</option>
            </select>
          </label>
          <label class="ll-field wide"><span>${config.protocol === "google" ? "API base URL (Google GenAI SDK)" : "Endpoint"}</span>
            <input id="ll-endpoint" type="text" spellcheck="false" value="${esc(settings.endpoint || preset.endpoint)}" placeholder="${config.protocol === "google" ? "https://generativelanguage.googleapis.com" : "https://…/chat/completions"}">
          </label>
          <label class="ll-field wide"><span>Model</span>
            <span class="ll-inline">
              <input id="ll-model" type="text" spellcheck="false" value="${esc(settings.model || preset.model)}" placeholder="model name or id">
              <button class="btn" id="ll-models" type="button">List models</button>
            </span>
          </label>
          <label class="ll-field wide"><span>API key ${config.relay ? "(held by this deployment's Worker — nothing to paste here)" : preset.keyOptional ? "(optional — this endpoint may need none)" : ""}</span>
            <input id="ll-key" type="password" spellcheck="false" autocomplete="off"${config.relay ? " disabled" : ""} placeholder="${config.relay ? "no browser key: the relay holds the Z.AI key server-side" : keyField ? esc(keyField) : config.protocol === "google" ? "paste your Gemini API key — sent directly to the API base URL above" : "paste your own key — it is sent only to the endpoint above"}">
          </label>
        </div>
        <label class="ll-check"><input type="checkbox" id="ll-persist"${settings.persist ? " checked" : ""}${config.relay ? " disabled" : ""}> ${config.relay ? "Not used for the relay: no key is stored in this browser" : "Keep the key in this browser after the tab closes (otherwise it is held for this tab only)"}</label>

        <div class="btn-row">
          <button class="btn btn-ice" id="ll-save">Save connection</button>
          <button class="btn btn-gold" id="ll-test" ${status.linked ? "" : "disabled"}>Test connection</button>
          ${config.relay ? `<button class="btn" id="ll-relay-check" type="button">Check relay</button>` : ""}
          <button class="btn" id="ll-clear">${config.relay ? "Clear any stored key" : "Clear key"}</button>
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
          ${config.relay
            ? `<li class="li"><strong>To this deployment's own Worker first</strong> (same-origin <span class="mono">${esc(config.endpoint)}</span>), which adds the
            Z.AI key it holds as a secret and forwards the call to <span class="mono">api.z.ai</span>. <strong>No browser key is sent at all</strong> — the key
            input above is disabled. The trade: the Worker operator can read the prompt in transit, and Z.AI receives it under
            Z.AI's own terms. The relay accepts only Z.AI's $0 free-tier models, refuses tools, images and streaming, caps the
            request size and output ceiling, and paces each caller over a sliding minute under a ceiling this whole
            deployment shares, so a public page can neither spend money through it nor burn a day of free quota in seconds.</li>`
            : `<li class="li">The key, to the endpoint above and nowhere else.</li>`}
          <li class="li">Request metadata the provider requires (model, token ceiling, temperature). The Ground-0 audit is
          staged one question per call, so each call reserves a small output ceiling instead of one large one — a provider
          that prices a call by the ceiling it reserves can then answer it on a small balance.</li>
          ${config.relay ? `<li class="li">Z.AI cannot sample greedily through its OpenAI-compatible route, so the relay translates a
          <span class="mono">0</span> temperature into <span class="mono">do_sample:false</span> and clamps anything above
          <span class="mono">1</span> down to <span class="mono">1</span>. It also disables GLM chain-of-thought by default so the
          output ceiling buys answer text rather than reasoning. Each response reports what was actually sent.</li>` : ""}
          <li class="li">For Google only: on the first SDK action, this page downloads Google's official, version-pinned
          <span class="mono">@google/genai@2.24.0</span> browser module and its module dependencies from jsDelivr. This
          code download contains no key or prompt; requests go directly to the configured base URL (Google by default).</li>
        </ul>
        <div class="rule-box">What stays in this browser: ${config.relay ? "saved audits" : "your key (unless you paste it into another tool), saved audits"},
        the evidence library, the duty ledger, and the Human Key. ${config.relay
          ? "This deployment's Worker is in the path for model calls only; it holds the provider key and stores no prompt, no reading and no audit."
          : "There is no HarshalOS server in the path."} The model provider
        still receives the prompt and applies its own data-handling terms. ${config.relay
          ? "With the relay there is no browser key to hide: the credential lives in the Worker, and this page holds nothing worth stealing."
          : "A browser cannot hide a key from someone who has access to that browser — that is why the key is held for this tab only unless you say otherwise."}</div>

        <div class="h2">Where the link is used</div>
        <ul class="ul">
          <li class="li"><strong>Ground-0 → Automatic audit</strong> — after the research run, “Read the retrieved record with the
          model”: the model is called once per question over the documents this browser fetched, proposes an answer with a
          verbatim quote, and asks for specific linked pages the record itself contains where text is missing. An isolated
          failed call costs one question; an account-wide in-flight refusal that survives retries stops the read.</li>
          <li class="li"><strong>Ground-0 → Evidence</strong> — read one saved artifact and see which questions it can support.</li>
          <li class="li refusal">A model reading never scores by itself: every quote is checked character-for-character against
          the stored text, unverifiable readings are discarded, and the record still requires human review. The working badge
          is a progress marker; the formal badge still needs a signed phase declaration.</li>
        </ul>

        <div class="h2">Session activity</div>
        <p class="body mono">${stats.calls} call${stats.calls === 1 ? "" : "s"} · ${stats.input.toLocaleString()} tokens in · ${stats.output.toLocaleString()} tokens out${stats.lastModel ? ` · last: ${esc(stats.lastModel)} in ${stats.lastMs} ms` : ""}${stats.failures ? ` · ${stats.failures} failed` : ""}${stats.shrunk ? ` · ${stats.shrunk} sent inside a smaller ceiling` : ""}${stats.inFlightRetries ? ` · ${stats.inFlightRetries} in-flight retries` : ""}</p>
        ${stats.ceiling ? `<p class="body mono">${esc(config.label)} told this page it will reserve at most ${stats.ceiling} output tokens on this key. Calls are sent inside that ceiling; reconnecting or adding credits clears it.</p>` : ""}
        <div class="btn-row"><button class="btn" id="ll-reset-stats" type="button">Reset activity</button></div>

        <div class="footer-note">
          ONE CONNECTION, MANY MODELS · ANTHROPIC, OPENROUTER, AND GOOGLE'S GENAI SDK CALL THEIR APIS DIRECTLY · OPENAI'S API NEEDS THE RELAY OR A LOCAL SERVER · Z.AI'S FREE TIER RUNS THROUGH THIS SITE'S WORKER RELAY, WHICH HOLDS THE KEY
        </div>`;

      body.querySelector("#ll-provider").addEventListener("change", event => {
        const provider = LLM.PROVIDERS[event.target.value];
        LLM.saveSettings({ provider: event.target.value, endpoint: provider.endpoint, model: provider.model, protocol: "" });
        local.models = []; local.result = null; local.relay = null; draw();
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
      const relayCheck = body.querySelector("#ll-relay-check");
      if (relayCheck) relayCheck.addEventListener("click", async () => {
        const endpoint = body.querySelector("#ll-endpoint").value.trim();
        LLM.saveSettings({ provider: body.querySelector("#ll-provider").value, protocol: body.querySelector("#ll-protocol").value, endpoint, model: body.querySelector("#ll-model").value.trim() });
        local.relayLoading = true; local.busy = ""; draw();
        const info = await LLM.relayStatus();
        local.relay = info; local.relayLoading = false; draw();
        api.toast(
          info.configured ? "permit" : "warn",
          info.configured ? "RELAY CONFIGURED" : info.reachable ? "RELAY NOT CONFIGURED" : "NO RELAY HERE",
          info.configured
            ? `${info.provider || "zai"} ${info.tier || "free"} tier${info.keyVariable ? ` · key in ${info.keyVariable}` : ""}${Array.isArray(info.models) && info.models.length ? ` · ${info.models.join(", ")}` : ""}${info.limits && info.limits.requestsPerMinute ? ` · ${info.limits.requestsPerMinute}/minute per caller${info.limits.sharedRequestsPerMinute ? `, ${info.limits.sharedRequestsPerMinute}/minute shared` : ""}` : ""}`
            : info.message || info.reason || "Ask this deployment's operator to configure the Worker relay."
        );
      });

      /* Ask the relay once when it is the selected connection, so the reader
         learns whether this deployment holds a key before pressing Test. The
         answer is stored, so re-rendering does not ask again. */
      if (config.relay && !local.relay && !local.relayLoading) {
        local.relayLoading = true;
        LLM.relayStatus().then(info => { local.relay = info; local.relayLoading = false; draw(); })
          .catch(() => { local.relay = { reachable: false, configured: false, reason: "The relay status check could not be completed." }; local.relayLoading = false; draw(); });
      }
    };

    draw();
  }
});
