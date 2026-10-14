# REMOVED — the LLM layer

**Status: removed.** This repository no longer contains a working model
integration of any kind. The feature was cut in full — client, Worker, binding,
migration, tests, docs and deployment switches — and one tile was deliberately
left behind as a shell that reports the removal.

This file is the record: what was here, where it went, what replaced it, and
what is deliberately left alone. The guard that keeps it removed is
[`tests/llm-removal-test.mjs`](../tests/llm-removal-test.mjs) (`npm run
test:llm-removal`), which fails if a provider endpoint, key store, relay route,
AI binding, removed module, or Ground-0 reading control comes back.

## What was removed

| Removed | What it did |
|---|---|
| `js/llm.js` | `window.HOSLLM` — the connection layer. Provider presets (Anthropic, OpenRouter, Google Gemini via the GenAI SDK, any OpenAI-compatible endpoint, local Ollama/LM Studio servers), pasted key entry with tab-only or persistent storage, model listing, a live probe call, request/usage statistics, delay handling, and Google project/model RPM–TPM–RPD pace guards. |
| `js/g0-llm.js` | `window.G0LLM` — the Ground-0 reading pass. Sent retrieved source text to the linked model, required a verbatim quote per proposed answer, checked each quote against the stored source text, held quotes for ineligible dates/versions, and produced a reading envelope for human review. |
| `js/apps-llm.js` (original) | The LLM Link app: provider list, key field, protocol and endpoint fields, model discovery, the relay disclosure panel, the test button, and the statistics/reset controls. |
| `worker/llm-relay.mjs` | The same-origin `/api/llm`, `/api/llm/status`, `/api/llm/models` Worker routes. Held a provider key as a Worker secret so no key was pasted into the browser, and paced callers over sliding windows. |
| `worker/ai-neuron-ledger.mjs` + `migrations/community/0014_ai_neuron_ledger.sql` | The per-UTC-day outbound-spend ledger that claimed a conservative estimate before each Workers AI generation and refused calls once the free daily allowance was reached. |
| `worker/|The LLM Relay|/` | The palace roster bedroom and its seven nameplate slots. |
| `wrangler.jsonc` `"ai": { "binding": "AI" }` | The account-wide Workers AI binding the relay preferred when present. |
| `wrangler.jsonc` preview vars (`LLM_RELAY_ENABLED`, and the documented `LLM_RELAY_DISABLE_RATE_LIMITS` / `LLM_RELAY_OUTBOUND_DIAGNOSTIC` switches) | The preview-only relay switches. |
| `tests/llm-test.mjs`, `tests/llm-authority-test.mjs`, `tests/g0-llm-diagnostics-test.mjs`, `tests/llm-relay-test.mjs`, `tests/llm-workers-ai-test.mjs`, `tests/ai-neuron-ledger-test.mjs` | The suites that exercised the connection layer, the data/authority boundary, the reading diagnostics, the relay contract, the Workers AI path, and the Neuron ledger. |
| `docs/GROUND-0-LLM-RESEARCH.md`, `docs/deployment/ZAI-FREE-TIER.md`, `docs/deployment/GEMINI-FREE-TIER.md`, `docs/deployment/WORKERS-AI-PROVIDER.md` | The operator guides for the reading pass and the relay's providers. |
| Ground-0 controls in `js/g0-app.js` | `readRecord`, `readRecordSingle`, `readArtifact`, `applyReading`, `openLlmLink`, the reading panel, the artifact reading panel, the reading diagnostics, and the one-request preflight. Also removed: the `automation.llm` reading block in `js/g0-engine.js` and the `llm-reading` method the engine used to accept. |

Also cleaned up so nothing dangles: the `ai_neuron_ledger` entries in the
backup table list (`worker/d1-backup.mjs`) and the rows-written cost model
(`worker/d1-rows-written.mjs`), the relay reference in a Tickerbot comment, the
LLM Link and Ground-0 reading stylesheets, the palace resident in
`scripts/palace-day.mjs` (page regenerated), and the NPC codex roster row.

## What replaced it

`js/apps-llm.js` is now a **shell**. The desktop tile keeps the same id
(`llmlink`), the same title, and the same size, so nothing that referenced it
breaks — but opening it renders one ruled `REFUSED — REMOVED` panel that names
what used to be here. The file contains no provider registry, no key handling,
no inputs, no storage access, and no network call of any kind; the CSS that
styled its controls is gone, so it renders in the shell's ordinary refusal
style. A test asserts each of those properties.

Server side, a request to the old `/api/llm` path no longer matches any route.
It falls through to the private storage API (`handleApi`), which requires a
Cloudflare Access session and answers `404 Unknown storage endpoint.` after
authentication — the path fails closed rather than being served by anything.

## What was deliberately kept

- **Ground-0 itself.** Retrieval, keyword-matching against fixed rules, per-answer
  source and date stamping, the evidence library, the temporal ledger, the phase
  engine, the manual wizard and the review gate never depended on a model. Every
  tab still renders and every audit path still runs.
- **`readWithArchive` / `readPublicPage` / `stripMarkdown`** in
  `js/g0-research.js`. These read public pages through a key-free reader for the
  evidence hydrator (`js/g0-evidence-hydrator.js`); they are a retrieval path,
  not a model path.
- **Prose.** The printed book, `publications/`, `archives/`, `import/`,
  `business plan/`, `case-studies/*.md`, `source/`, `updates/` and the resumes
  still mention the model layer where they describe what existed. A written
  record of a removed capability is not a capability; those files are left as
  history rather than rewritten.
- **Migration history on the deployed database.** `0014_ai_neuron_ledger.sql`
  is deleted from this checkout, but a remote D1 database that already applied
  it still holds the `ai_neuron_ledger` table. Nothing reads or writes it now.
  Dropping it is an operator decision, not a repository change; note the gap if
  `wrangler d1 migrations list` is compared against this tree.

## Verify it is gone

```sh
npm run test:llm-removal    # the removal guard
npm run test:app            # desktop + Ground-0 still work without a model
npm run test:community      # stored records can no longer claim a model reading
npm run integrity           # the full suite and the deployment dry-run
```

The guard is also part of `npm run integrity`, so the CI job fails if any of
this returns.
