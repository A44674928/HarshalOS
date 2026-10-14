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
   ═══════════════════════════════════════════════════════════════ */

APPS.push({
  id: "llmlink",
  title: "LLM Link",
  short: "LLM Link",
  glyph: "⌘",
  desc: "Removed — this tile is the shell of the model connection layer that used to sit here",
  w: 880, h: 720,
  render(body) {
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
        <p>The removal is recorded in <span class="mono">docs/REMOVED-LLM-LAYER.md</span>, and <span class="mono">tests/llm-removal-test.mjs</span> fails if any of it returns.</p>
      </div>`;
  }
});
