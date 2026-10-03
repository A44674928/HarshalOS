# Google Gemini Developer API Free Tier and Antigravity

**Checked 2026-10-02.** Google's model catalog, free eligibility, quotas, key rules, and preview APIs change. Use the live Google pages linked below for your own project before relying on a number or model ID.

## What an AI Studio Gemini API key actually gives you

A key created in [Google AI Studio](https://aistudio.google.com/apikey) authenticates to the **Gemini Developer API** (`generativelanguage.googleapis.com`) for the Google Cloud project associated with that key. LLM Link's Google preset calls that Developer API. It is **not** a Vertex AI endpoint/key, a Google One subscription token, or an unlimited Gemini entitlement.

A Free Tier project can call the models and API modes that Google's [pricing table](https://ai.google.dev/gemini-api/docs/pricing) currently marks as available/free for the Free Tier, subject to that project's active limits. Eligible standard text, image, and other supported API requests depend on the model and mode. The selected model appearing in **List models** only means the key can enumerate it; it does **not** prove that every operation/mode is free. Some premium models, preview modes, grounding/tool use, batch/flex/priority features, and generated media have separate eligibility or pricing. Check the exact model *and operation* against the live pricing table before use.

Google's pricing page distinguishes the Free Tier from Paid Tier: the Free Tier has limited model access and free input/output tokens for eligible calls; Paid Tier provides higher limits and features, and paid usage may be billable. A Google AI Pro/Ultra subscription's AI Studio UI benefits are not automatically Gemini Developer API billing/quotas. Enabling Cloud Billing changes the project's API usage tier and may make eligible paid usage billable. Keep a Free Tier project/key selected if you want to stay within Free Tier access; do not link billing unless you intend to use paid services.

**Free Tier data handling matters:** Google's pricing/data terms say Free Tier content may be used to improve Google products. Do not send confidential, regulated, personal, or otherwise sensitive content using a Free Tier key. The Paid Services terms say paid prompts/responses are not used to improve Google's products, subject to the applicable product terms and any special tools (for example, grounding can have its own retention terms).

## Quotas and LLM Link's pace guard

Gemini API quotas are not a per-key allowance. They are scoped to the **Google Cloud project**, usually by **model**, and may include:

- **RPM** — requests per minute;
- **input TPM** — input tokens per minute (not a count of just generated output tokens);
- **RPD** — requests per day, resetting at **midnight Pacific time**;
- model/mode-specific limits, plus applicable account/tier or spend controls.

Google varies limits by project, tier, model, and account state. Preview/experimental models can be more restricted, and the published/observed values are not guaranteed. Check [AI Studio → Rate limits](https://aistudio.google.com/rate-limit?timeRange=last-28-days) for the active project/model instead of copying a number from an old example. More API keys in one project do not create more quota.

In LLM Link, select the Google protocol and the intended model. Under **Gemini project pace guard**, enter the active RPM, input TPM, and RPD shown for that model. Enter the Google Cloud project ID (or a consistent local label) if you use multiple projects/keys. The same project/model settings are kept separately. LLM Link applies an 80% ceiling by default; choose another safety percentage if appropriate. Blank/zero disables that dimension. Calls that would exceed the configured local RPM/input-TPM window wait until a slot opens, unless the call timeout is too short. The RPD guard stops locally at its Pacific-day cap. Google's `RetryInfo` / `Retry-After` response is still honored by the separate bounded retry path.

The pace guard is intentionally a **local best-effort**, not a Google quota API or a security boundary. It stores only timestamps and input-token estimates/usage in this browser, not prompts, responses, or the API key. Web Locks coordinate tabs from the same origin where available. The guard cannot see another device, user, browser profile, API client, Google AI Studio use, `List models` traffic, other API keys/apps, or usage already consumed in the project. If anything else uses the project, set a lower cap to leave headroom. A Google 429 remains authoritative. Token pacing before a call uses a conservative text-size estimate; after a successful response, the guard replaces it with Google's returned input usage when available.

## Connect the key to HarshalOS LLM Link

1. Create or select a Gemini API key/project in [Google AI Studio](https://aistudio.google.com/apikey).
2. In HarshalOS, open **LLM Link** and choose **Google Gemini Developer API (GenAI SDK)**.
3. Click **All available** to list models Google exposes to this key that support `generateContent`, including reported input/output context limits, or type a model ID. This catalogue does not reveal Free Tier eligibility or active project quotas: check the model and operation against current pricing and AI Studio limits. The preset default (`gemini-3.8-flash` as of this document's check date) can change.
4. Paste the key and save. It is held in the current tab's session storage by default; persistent storage is opt-in. The browser sends it directly to Google. Do not put it in source code, a shared URL, a screenshot, or an issue report. Use Google's currently accepted key restrictions and rotate a key that was exposed.
5. Copy that project's actual model quotas into **Gemini project pace guard**, then run **Test connection**.

The connected Google path is the Gemini Developer API's normal `models.generateContent` call through Google's official `@google/genai` SDK. Ground-0's Automatic Audit now prefers a Google-only **One-request read** when the local preflight finds no known context, TPM or local daily-guard conflict. Before the model-reading button, the page estimates the full prompt locally — system instructions, all nine questions, response shape and bundled source text — without a generation or token-count API call. If **All available** has loaded the selected model's input limit, it compares the estimate with that context; configured TPM/RPD safety caps are checked locally too. Missing context/quota metadata is disclosed, not treated as proof that the request will fit, and shared Google usage outside this browser is invisible.

The one-request read bundles up to 216,000 source characters (about 60,000 prose tokens before instructions) into one generation attempt. That is one RPM/RPD request, while all prompt tokens still count against TPM. It disables automatic format retries, link follow-ups and separate candidate weighing; a refusal or incomplete response stays unresolved. If the known estimate exceeds a limit, use the staged fallback. Both paths verify quotes locally and Ground-0's rules compute phase after human review — the model does not issue a phase verdict.

### Is Gemini Live suitable for this website's phase audit?

Not with the current LLM Link connector. **Gemini Live is a separate real-time, bidirectional session API**, typically used for streaming audio/video, rather than the one-shot `models.generateContent` method used by the audit. The **All available** list and one-request audit deliberately target `generateContent`; a Live-only model is not a drop-in text-audit model.

A distinct website feature could use Live for real-time voice/video. Google's browser guidance recommends short-lived **ephemeral tokens** for client-to-server Live connections; the long-lived API key should be held by a backend token issuer, not shipped into browser JavaScript. This site has no HarshalOS backend for BYOK token issuance, so adding Live safely requires a small backend/token-broker design and a separate streaming UI.

Your dashboard's Live rows show **65K TPM**. A 60K-token prompt would sit very close to that ceiling, and an 80% local safety target would be 52K TPM. For a one-shot 60K-token documentary read, the normal Gemini 3.8 Flash row (250K TPM in the supplied snapshot) is the more suitable API path. The Live row's `Unlimited` RPM/RPD does not mean unlimited input-token throughput.

## Can I use Antigravity with a Free Tier API key?

**Yes, in two distinct ways, as of the check date.** Do not confuse the Antigravity product/CLI with the Gemini API's managed Antigravity agent:

### 1. Antigravity CLI with a Gemini API key

The official Antigravity CLI documents using a Gemini API key directly. It sends model requests to the Gemini API; those requests consume the associated project's API access and quota, not a separate unlimited bucket. Follow Google's [CLI authentication guide](https://antigravity.google/docs/cli/install/#using-a-gemini-api-key). The key must be in `GEMINI_API_KEY`, and the CLI must be configured with `modelProvider: "gemini"` (exporting the variable alone is not enough).

For macOS/Linux, the documented configuration is equivalent to:

```json
// ~/.gemini/antigravity-cli/settings.json
{
  "modelProvider": "gemini"
}
```

Then in the shell where `agy` runs:

```sh
export GEMINI_API_KEY="your-ai-studio-key"
agy
```

On Windows PowerShell, use `$env:GEMINI_API_KEY = "your-ai-studio-key"` in that session. Keep the key out of scripts committed to Git. The model list/feature set available to the CLI is still limited by the key's project, model eligibility, and current API quotas; a Free Tier key does not bypass 429s or unlock paid-only API models.

### 2. Google's managed Antigravity agent through the Interactions API

Google also documents a preview **Antigravity agent** via the Gemini Developer API's **Interactions API**. The API documentation says the managed agent is available for Free Tier and Paid Tier projects, with a free rate limit/usage quota on Free Tier. Its request is *not* a normal `generateContent` request. A minimal REST example from the same endpoint family is:

```sh
curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -d '{
    "agent": "antigravity-preview-09-2026",
    "input": "Inspect a small sample dataset and summarize its columns.",
    "environment": "remote",
    "agent_config": {
      "type": "antigravity",
      "max_total_tokens": 10000
    }
  }'
```

The documented default agent is based on Gemini 3.8 Flash; the underlying model can be configured where supported. The remote agent is autonomous: it may reason through multiple turns and use code execution, web tools, and its Google-hosted Linux environment. A single interaction can consume many more tokens than a plain question/answer. `max_total_tokens` is a **best-effort token budget**, not a hard dollar cap. Free Tier access means the request is subject to the Free Tier's limited quota/eligibility; it does not mean unlimited agent runs or a right to use paid-only models/tools. If the project is moved to a paid billing tier, usage may be billed.

Interactions are stored by default unless the request/configuration changes that behavior; Google documents one-day retention for Free Tier Interactions. Read the current [Antigravity agent guide](https://ai.google.dev/gemini-api/docs/antigravity-agent), [Interactions API storage/retention guide](https://ai.google.dev/gemini-api/docs/interactions-overview), and the [pricing page](https://ai.google.dev/gemini-api/docs/pricing#pricing-for-agents) before sending private data or running costly/long workflows.

**This is deliberately not wired into LLM Link's Ground-0 connector.** LLM Link's existing Google path is a single text-generation call with no tool dispatcher, and the app treats model output as inert data. A managed Antigravity agent can execute code and use remote tools. That capability belongs in an explicitly separate agent workflow, not in the read-only quote-verification path.

## Official references

- [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [AI Studio active rate limits](https://aistudio.google.com/rate-limit?timeRange=last-28-days)
- [Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini API key security and key types](https://ai.google.dev/gemini-api/docs/api-key)
- [Gemini Live API](https://ai.google.dev/gemini-api/docs/live)
- [Ephemeral tokens for client-side Live API connections](https://ai.google.dev/gemini-api/docs/ephemeral-tokens)
- [Antigravity agent API](https://ai.google.dev/gemini-api/docs/antigravity-agent)
- [Antigravity CLI Gemini API key setup](https://antigravity.google/docs/cli/install/#using-a-gemini-api-key)
