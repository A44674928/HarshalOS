# LLM relay: the Workers AI provider

The relay (`worker/llm-relay.mjs`) serves large-language-model chat completions
to Ground-0 in an OpenAI-compatible shape. Its primary provider is Workers AI
running on the same account's free daily Neuron allocation — no third-party
key, no card. The older Z.AI path is retained as a dormant fallback and is
used only when the `AI` binding is absent and a Z.AI key is configured.

Provider selection, in order:

1. `env.AI` is bound → `workers-ai` (even if a Z.AI key is also set).
2. No binding but `ZAI_API_KEY` / `LLM_RELAY_ZAI_API_KEY` is set → `zai`.
3. Neither → `503` with instructions to bind one provider.

## Models

The allowlist is fixed in `AI_MODELS` (`worker/llm-relay.mjs`); anything else
is refused with `404 model_not_found`. Rates are the published Workers AI
per-1M-token Neuron prices, refreshed from
https://developers.cloudflare.com/workers-ai/platform/pricing/ at build time
(October 2026).

| Model | In / 1M tokens | Out / 1M tokens | JSON mode |
|---|---|---|---|
| `@cf/meta/llama-3.1-8b-instruct-fp8-fast` (default) | 4,119 | 34,868 | yes |
| `@cf/meta/llama-3.2-3b-instruct` | 3,300 | 27,900 | no |
| `@cf/qwen/qwen3-30b-a3b-fp8` | 4,625 | 30,475 | no |
| `@cf/zai-org/glm-4.7-flash` | 5,500 | 36,400 | no |

The default is the llama 8B fast model deliberately: Ground-0 readings always
send `response_format: { type: "json_object" }`, and it is the only allowlisted
model flagged as accepting it. The `jsonMode` flags are conservative — flip a
flag only after a live call proves the model honors `response_format`.

Rate columns are advisory. The relay estimates conservatively (see below) and
never trusts provider-reported usage for budgeting.

## The daily Neuron guard

Workers AI resets to 10,000 free Neurons at 00:00 UTC and hard-fails past the
limit. The relay holds itself under that line:

- Before each generation it estimates the call's ceiling cost as
  `input_chars / 4` tokens at the model's input rate **plus the call's full
  `max_tokens` reservation** at the output rate (`estimateAiNeurons`), and
  claims that estimate from the durable per-day ledger (`ai_neuron_ledger`,
  migration `0014`) with a worker budget of 9,000/day — 10% headroom under
  the provider line for the difference between estimate and actual.
- A refused claim returns `429 quota_exceeded` with `Retry-After` set to
  seconds until UTC midnight, and the binding is never invoked.
- Without D1 the relay falls back to an isolate-local day counter, labelled
  `relay.neuronLedger.weak: true` so responses disclose the weaker guard.
- If the ledger table is missing (migrations not applied) the relay fails
  closed with `503` instead of spending blind.

What one audit costs: a full staged Ground-0 reading (roughly 150k input
characters and 700-token call ceilings) estimates to about 560–670 Neurons —
around 6–7% of the free day. Several readings a day fit comfortably; the
estimator over-counts on purpose, so real spend is lower.

## Proving a call

1. Deploy with the `ai` binding present (`wrangler.jsonc` already declares
   `"ai": { "binding": "AI" }`; also apply migration `0014` to the production
   D1 database).
2. `GET /api/llm/status` → `provider: "workers-ai"`,
   `defaultModel: "@cf/meta/llama-3.1-8b-instruct-fp8-fast"`,
   `neuronBudget.workerDailyLimit: 9000`.
3. `GET /api/llm/models` lists the four allowlisted models.
4. One small same-origin `POST /api/llm/chat` with `max_tokens: 64`; the
   response carries `relay.provider: "workers-ai"`,
   `relay.estimatedNeurons`, and the remaining `relay.neuronLedger`.
5. Check the Workers AI dashboard: one inference, a few dozen Neurons.

## Changing the default model

Edit `AI_DEFAULT_MODEL` in `worker/llm-relay.mjs` (it must stay inside
`AI_MODELS`), update the table above, and re-run `npm run test:relay`. The
browser preset in `js/llm.js` is intentionally untouched: it still names the
Z.AI free tier, so pick a Workers AI model from the live allowlist once and
save it as the custom preset.

## Pace limits

The per-caller pace guard is **provider-calibrated**, because one number was
doing duty for two providers with very different ceilings:

| Path | Per caller | Shared by all callers |
| :--- | ---: | ---: |
| `zai` | 60 / min | 120 / min |
| `workers-ai` | 120 / min | 150 / min |

The Z.AI number is Z.AI's own free-tier pace and is deliberately no tighter:
Ground-0 asks nine questions per source batch, so a reading is dozens of calls,
and a guard set below the provider's own pace would refuse readings the provider
would have served.

The Workers AI numbers come from Cloudflare's published ceiling of **300 requests
a minute per account for text generation**
(<https://developers.cloudflare.com/workers-ai/platform/limits>). Both sit at or
below half of it on purpose: these windows live in one isolate's memory and are
counted again in the next one, so they are a local approximation of an
account-wide number, and the guard's job is to stay under the platform's line
rather than to test it.

Neither window protects the daily allocation — the durable Neuron ledger does
that, and a burst through the pace guard still cannot spend Neurons the ledger
has not claimed.

Because both numbers depend on somebody else's published rates, an operator can
re-tune either without editing the relay:

    LLM_RELAY_CHAT_PER_MINUTE=200          # per caller IP
    LLM_RELAY_SHARED_CHAT_PER_MINUTE=240   # across all callers

`GET /api/llm/status` reports the ceilings actually in force, under
`limits.requestsPerMinute` and `limits.sharedRequestsPerMinute`.

## Limits and failure modes

- Daily exhaustion is a normal state, not an incident: callers get `429`
  with a midnight `Retry-After`, and the relay resumes automatically.
- Branch previews set `LLM_RELAY_ENABLED=false` so public preview URLs can
  never spend the shared daily allocation (the `AI` binding is account-wide).
- The relay never sends provider-specific extras: no Z.AI `thinking` block,
  no `do_sample` (Workers AI takes `temperature` directly), and
  `response_format` only to JSON-capable models.
- Usage in responses is estimated (`relay.usageEstimated: true`), because the
  binding returns text without token counts.

Tests: `npm run test:relay` (Z.AI path, Workers AI path, ledger).
Related: `docs/deployment/D1-BACKUP.md` (the ledger is a backed-up table),
`docs/deployment/UPTIME-MONITORING.md`.
