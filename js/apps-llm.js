/* ═══════════════════════════════════════════════════════════════
   HarshalOS — LLM Link (window.APPS entry "llmlink")

   This app used to be the connection point: provider presets, a
   browser-held key, model listing, a relay preset, a live test call,
   and a reading pass that turned retrieved records into quote-backed
   proposed answers. All of it has been removed from this repository.

   What remains is the shell: the tile still opens, and it says so.
   There is no provider list, no key field, no model call, no relay,
   no ledger, and no network path behind this panel. Nothing in this
   file reads or writes a key, and nothing here fetches anything.

   The shell carries one signpost — a deep link into Ground-0's manual
   audit wizard — because a refused path should name the path that
   works. It is a link, not a control: no model is reachable from here.
   ═══════════════════════════════════════════════════════════════ */

APPS.push({
  id: "llmlink",
  title: "LLM Link",
  short: "LLM Link",
  glyph: "⌘",
  desc: "Removed — this shell names the cut model layer and points at the manual Ground-0 audit path",
  w: 880, h: 720,
  render(body, api) {
    /* Static text only: nothing here is interpolated from data or storage. */
    body.innerHTML = `
      <div class="h1">LLM Link</div>
      <div class="sub">REFUSED — REMOVED. This is a shell, not a connection.</div>
      <div class="rule-box refusal">
        <p><strong>Every model feature has been stripped from this deployment.</strong> The app opens so the removal is visible instead of silent. Nothing below can be configured, and no request leaves this page.</p>
        <p><strong>What used to be here, and is no longer in this repository:</strong></p>
        <ul>
          <li>The connection layer <span class="mono">js/llm.js</span> — provider presets (Anthropic, OpenRouter, Google Gemini, OpenAI-compatible, local servers), key entry and storage, model listing, the live probe, usage statistics, and Google project quota guards.</li>
          <li>The reading pass <span class="mono">js/g0-llm.js</span> — the Ground-0 stage that read retrieved source text with a linked model and proposed quote-backed answers for review.</li>
          <li>The site relay <span class="mono">worker/llm-relay.mjs</span> and its route <span class="mono">/api/llm</span> — the server-side path that held a provider key as a Worker secret and forwarded chat requests.</li>
          <li>The provider ledger <span class="mono">worker/ai-neuron-ledger.mjs</span>, the <span class="mono">AI</span> binding in <span class="mono">wrangler.jsonc</span>, the relay switches in the preview vars, and migration <span class="mono">0014_ai_neuron_ledger.sql</span>.</li>
          <li>The Ground-0 controls that depended on it: <span class="mono">readRecord</span>, <span class="mono">readRecordSingle</span>, <span class="mono">readArtifact</span>, <span class="mono">applyReading</span>, the reading panel, and the reading diagnostics.</li>
        </ul>
        <p>Ground-0 is unchanged in what it does without a model: it retrieves public records, matches them against fixed keyword rules, marks every answer with its source and date, and requires human review before saving. The evidence library, temporal ledger, and phase engine never needed a model.</p>
        <p><strong>The path that works:</strong> an audit is done by hand in the wizard — retrieve the record, answer the fixed checklist, and sign the review yourself. No model ever completed one here, and this shell cannot ask one to try.</p>
        <div class="btn-row">
          <a class="btn btn-ice" id="ll-ground0" href="#app=ground0"><span aria-hidden="true">✎</span> Open the manual Ground-0 audit wizard</a>
        </div>
        <p>The removal is recorded in <span class="mono">docs/REMOVED-LLM-LAYER.md</span>, and <span class="mono">tests/llm-removal-test.mjs</span> fails if any of it returns.</p>
      </div>`;

    /* The signpost is the only thing here that acts, and it acts locally: it
       opens Ground-0 and lands on the wizard's first step. The href is a real
       deep link (js/wm.js reads #app=<id> at init), so the link still goes
       somewhere with this handler unavailable; only the wizard shortcut would
       be lost. Nothing else is wired — no provider, no key, no request. */
    const link = typeof body.querySelector === "function" ? body.querySelector("#ll-ground0") : null;
    if (!link || typeof link.addEventListener !== "function" || !api || typeof api.openApp !== "function") return;
    link.addEventListener("click", () => {
      const ground0 = (Array.isArray(APPS) ? APPS : []).find(candidate => candidate.id === "ground0");
      if (!ground0) return;
      const record = api.openApp(ground0);
      const start = record && record.body && typeof record.body.querySelector === "function"
        ? record.body.querySelector('[data-act="startWizard"]')
        : null;
      if (start && typeof start.click === "function") start.click();
    });
  }
});
