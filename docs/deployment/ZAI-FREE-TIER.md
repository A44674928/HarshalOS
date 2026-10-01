# Z.AI free tier through the Worker relay

## What is implemented

LLM Link's **"Z.AI free tier — this site's relay (`/api/llm`)"** preset is served by
[`worker/llm-relay.mjs`](../../worker/llm-relay.mjs). The Z.AI API key is a **Worker secret**: it
never reaches browser code, and the browser never has to paste one. The Worker forwards plain-text
chat completions to `https://api.z.ai/api/paas/v4/chat/completions` and returns them in the
OpenAI-compatible shape [`js/llm.js`](../../js/llm.js) already parses, so Ground-0's staged reading
works unchanged: still one question per call, still quote-verified, still review-required.

This is a **narrow relay, not a proxy**:

| Property | Value |
|---|---|
| Routes | `POST /api/llm`, `GET /api/llm/models`, `GET /api/llm/status` |
| Upstream | `https://api.z.ai` — fixed origin, fixed paths, `redirect: "error"` for authenticated requests; the temporary unauthenticated diagnostic probe also never follows redirects |
| Models | `glm-4.5-flash`, `glm-4.7-flash` — Z.AI's $0 text models. Hard allowlist; a paid model is refused **without** an upstream call |
| Fields forwarded | `model`, `messages`, `max_tokens`, `temperature` (translated), `stream: false`, `do_sample`, `thinking` |
| Fields dropped | `tools`, `tool_choice`, `functions`, `response_format`, `stop`, `top_p`, `n`, `logprobs`, `user_id`, `request_id`, streaming, and anything else a caller invents |
| Message shape | `system` / `user` / `assistant` with **string** content only — no images, no part arrays, no tool results |
| Limits | 256 KiB per request, 32 messages, 100 000 characters per message, 200 000 per call, output ceiling capped at 8 192 tokens (default 1 024), 60 s upstream timeout |
| Callers | Same-origin `POST` only (the `Origin` header must equal the request origin); a caller-supplied `Authorization` header is ignored, never forwarded |
| Pacing | 60 model calls per caller per **sliding** minute (Z.AI's own free pace), 120 per minute shared by all callers, 12 model-list reads per caller per minute |
| Response | `choices[0].message.content` only. `reasoning_content` and `tool_calls` are stripped, so nothing executable is handed to the browser |

**What this is not.** It is not a general LLM gateway, not a way to use paid GLM models, not a
tool-calling path, and not streaming. The DATA-ONLY boundary in `js/llm.js` is unchanged: a relayed
reply is inert text that Ground-0 must quote-verify and a person must review.

## 1. Add the key as a Worker secret

The relay reads the first of these variable names that is set, in this order:

```
Z.AI  ZAI_API_KEY  ZAI_API_TOKEN  ZAI_KEY  ZAI_TOKEN
Z_AI_API_KEY  GLM_API_KEY  ZHIPU_API_KEY  LLM_RELAY_API_KEY  LLM_API_KEY
```

`GET /api/llm/status` reports **which name** supplied the key (as `keyVariable`) so you can confirm
the binding. It reports the name only — never the value, and no other response includes it either.

> **About the dotted name `Z.AI` — read this if your variable is named that.** JavaScript cannot read
> `env.Z.AI` as an identifier, so the relay reads it as `env["Z.AI"]`, which works only if the
> platform actually created a binding with that name. **Observed while writing this guide:** a
> `.dev.vars` entry of `"Z.AI"="…"` produced *no binding at all* — `wrangler dev` printed
> `Using secrets defined in .dev.vars` but listed no variable, and `/api/llm/status` reported
> `"configured": false`. Renaming the same line to `ZAI_API_KEY="…"` made wrangler list
> `env.ZAI_API_KEY ("(hidden)")` and the status route report `"configured": true, "keyVariable":
> "ZAI_API_KEY"`. Cloudflare's tooling expects names built from letters, digits and underscores.
>
> So: if your key is stored under the name `Z.AI`, **add it again as `ZAI_API_KEY`** (dashboard →
> Settings → Variables and Secrets, or `npx wrangler secret put ZAI_API_KEY`), then confirm with
> `GET /api/llm/status`. The relay still tries `env["Z.AI"]` first, so if your dashboard did accept
> the dotted name it will be used and reported — the status route tells you which one it found, and
> you never have to guess.

Dashboard: **Workers & Pages → your Worker → Settings → Variables and Secrets → Add**, type
**Secret**, name it, paste the Z.AI key, **Deploy**.

Or from the repository, which prompts for the value so it stays out of shell history:

```bash
npx wrangler secret put ZAI_API_KEY     # or: npx wrangler secret put "Z.AI"
npx wrangler deploy
```

Get the key from the Z.AI console (**API Keys**) on an account whose free tier is active. Never
paste the key into chat, an issue, a commit, or a screenshot.

### Local development

`npm run dev` reads `.dev.vars` (already git-ignored):

```dotenv
ZAI_API_KEY="your-key"
```

Use the underscore name locally: a dotted `"Z.AI"="…"` line in `.dev.vars` produced no binding at all
in testing (see the note above). Restart `npm run dev` after editing `.dev.vars` — the change is read
at startup, and wrangler prints the binding it picked up (`env.ZAI_API_KEY ("(hidden)")`).

### Optional operator switch

`LLM_RELAY_ENABLED=false` (plain variable, not a secret) turns the relay off without removing the
key. Any other value, or no value at all, leaves it on when a key is present.

## 2. Verify it

```bash
# 1. Is the relay configured, and which variable supplied the key?
curl -s https://YOUR-HOSTNAME/api/llm/status

# 2. Which of the free models does this key actually serve?
curl -s https://YOUR-HOSTNAME/api/llm/models

# 3. One real call. The Origin header is required: the relay is same-origin only.
curl -s -X POST https://YOUR-HOSTNAME/api/llm \
  -H "Content-Type: application/json" \
  -H "Origin: https://YOUR-HOSTNAME" \
  -d '{"model":"glm-4.5-flash","messages":[{"role":"user","content":"Reply with exactly: link established"}],"max_tokens":40}'
```

A configured relay answers `{"configured":true,...}`; an unconfigured one answers
`{"configured":false,"message":"This deployment has no Z.AI key..."}` with HTTP 503 on the chat and
model routes. `curl` from a shell must send a matching `Origin`, or the relay refuses with 403 —
that check is what stops another site's page from spending your quota.

In the browser: open **LLM Link**, choose **Z.AI free tier — this site's relay (/api/llm)**, and the
app asks `/api/llm/status` for you. It shows `RELAY CONFIGURED` with the allowlist, the Worker
variable name and the per-minute limit, or `RELAY NOT CONFIGURED` / `NO RELAY HERE` with the reason.
**Check relay** asks again, **List models** reads the relay's allowlist, and **Test connection**
makes one short call. `node serve.js` has no Worker behind it, so the static preview reports
`NO RELAY HERE` — that is the honest answer, not a failure.

## 3. Two Z.AI behaviours the relay translates

**Sampling.** Z.AI's temperature range is `[0, 1]`, and its documentation states that a `0`
temperature (greedy decoding) is not available through the OpenAI-compatible route — greedy is
`do_sample: false`. HarshalOS asks for `temperature: 0` because a Ground-0 reading should be
reproducible, so the relay translates rather than forwarding a value Z.AI may reject:

| Requested | Sent upstream | Reported back as |
|---|---|---|
| `0` | `do_sample: false`, **no** `temperature` field | `relay.doSample: false`, `relay.temperatureSent: null` |
| `0 < t ≤ 1` | `temperature: t`, `do_sample: true` | `relay.temperatureSent: t` |
| `1 < t ≤ 2` | `temperature: 1`, `do_sample: true` | `relay.clamped: true` |

Every successful response carries a `relay` object naming what was actually sent, so the translation
is disclosed instead of hidden. Greedy decoding is what the site asks for; whether Z.AI honours
`do_sample: false` on a given free model is Z.AI's behaviour, not something this relay can promise.

**Chain-of-thought.** GLM models can spend an output ceiling on `reasoning_content` and return no
answer text — which for Ground-0's 700-token reading calls would look like a model that refused. The
relay therefore sends `thinking: {"type":"disabled"}` by default, forwards only `message.content`,
and if Z.AI still returns reasoning with no answer it says exactly that instead of returning empty
text. A caller may opt in with `"thinking":{"type":"enabled"}`; the browser client does not.

## 4. Failure handling

Upstream failures are reported in the relay's own words. Z.AI's response body is never echoed, so it
cannot carry account detail, and the key is scrubbed from any text the relay does quote.

| Z.AI returns | Relay returns | Why |
|---|---|---|
| 401 / 403 | **502** "Z.AI rejected the API key held by this Worker" | The browser's key is not what failed; a 401 would send the reader to fix the wrong thing |
| 404 | **404** naming the model | So LLM Link's "check the model name / List models" hint applies |
| 400 / 422 | **400**, with Z.AI's scrubbed sentence quoted | The request shape is fixable by the caller |
| 402 | **402**, with Z.AI's scrubbed sentence quoted | A billing problem on a free-tier model is worth seeing verbatim |
| 429 | **429**, forwarding `Retry-After` only when it is a plain number | LLM Link already waits out a stated delay |
| 5xx | **502** | Upstream trouble, retried by the reader |
| timeout | **504** after 60 s | Stated plainly |
| tool call or reasoning only | **502** explaining which | No executable output, and no silent empty answer |

Refusals that happen **before** any upstream call — an unlisted model, a non-text message, an
oversized body, a cross-origin caller, a rate-limit hit — never reach Z.AI and never spend quota.

## Diagnosing Worker-to-Z.AI connection failures

A relay `502` reading `Z.AI could not be reached` means the Worker did not receive a usable HTTP
response from its outbound request. The browser does not get the underlying socket exception. Persisted Workers Logs are enabled in
`wrangler.jsonc`; the setting applies after the Worker is redeployed. The Worker emits a deliberately
sanitized `zai_upstream_fetch_failed` log entry for these failures. **By default**, it contains only
`route`, `errorName`, `causeName`, and `causeCode` (for example, `ECONNRESET`). Default logging never
includes an exception message or stack, request URL, headers, API key, or prompt. The temporary,
explicitly triggered **models-only** diagnostic below adds redacted exception messages, not raw errors.

1. In Cloudflare, open **Workers & Pages → harshalos → Logs / Observability → Real-time logs**. The
   label can vary slightly by dashboard version.
2. Leave the log stream open, then press **List models** once in LLM Link on the affected hostname.
3. Find the `zai_upstream_fetch_failed` event at that time. Share only its four safe fields with your
   maintainer; do not share credentials or prompts.
4. If no event appears, the request may be handled by an older Worker version, or the route may not be
   reaching the instrumented Worker. Confirm the active version and hostname in Cloudflare.

If you already have Wrangler authenticated locally, the same logs can be tailed with
`npx wrangler tail harshalos`. Do not paste API keys or authentication tokens into a terminal command
or chat. A `causeCode` is a network diagnostic clue, not proof of a global provider outage.

### Temporary outbound-fetch diagnostic (no model call)

When the default log says only `TypeError` and there is no outbound child span, use this diagnostic
instead of enlarging a prompt or running a Ground-0 reading. It is implemented at the Worker's
outbound-fetch boundary, not as a browser or sandbox connectivity test.

**Enable and deploy.** `LLM_RELAY_OUTBOUND_DIAGNOSTIC=true` is a non-secret, temporary operator flag.
It is checked in **only under `previews.vars`**, so a new branch-preview deployment enables it but
production does not. The flag does nothing on its own: normal model lists, status checks, and chat
calls never run this diagnostic. Confirm the branch preview has deployed the new Worker before
triggering it. To diagnose a different deployment, its operator must explicitly set the flag and
redeploy that Worker; do not move the preview switches into production as a group or disable pacing.

1. Open that preview Worker's **Logs / Observability** stream in Cloudflare.
2. Request this route **once** on the affected, newly deployed preview hostname (no API key or
   prompt belongs in this command):

   ```bash
   curl --silent --show-error 'https://YOUR-PREVIEW-HOSTNAME/api/llm/models?diagnostic=outbound'
   ```

   If the hostname is behind Cloudflare Access, open the same path in a signed-in browser instead.
3. In that invocation, find the three `zai_outbound_diagnostic` entries. Results stay in Worker
   logs; the browser receives the usual model-list response or a generic failure, never an exception.

| `stage` | What happens | Safe result |
|---|---|---|
| `request_construction` | Builds a local `Request` with the **same configured headers/init** as the existing authenticated models GET. This object is never fetched or logged | `outcome: "ok"` or `"error"`, with redacted error fields |
| `unauthenticated_fetch` | Makes **one** extra GET to the fixed `https://api.z.ai/api/paas/v4/models` URL, with no Authorization, cookies, request body, or caller headers. Independent 10 s deadline; redirects are returned as HTTP, not followed. The response body is discarded without reading it | `outcome: "http_response"` and numeric `status`, or `"error"` |
| `authenticated_fetch` | Only if both checks pass, makes the **existing** authenticated models GET once, with its unchanged headers, redirect refusal, and full 60 s timeout. No chat-completions call is made | `outcome: "http_response"` and `status`, `"error"` with a sanitized message, or `"skipped"` if a preflight check failed |

Error entries contain `errorName`, `causeName`, `causeCode`, `errorMessage`, and `causeMessage`.
Messages are capped at 220 characters **after** redaction. The configured key (including JSON- and
URL-escaped forms), bearer tokens, credential-shaped long tokens, URLs, and control characters are
scrubbed. No key length, fingerprint, headers, stack, request object, upstream body, or prompt is
logged. Chat failures retain category-only logging even while the flag is enabled.

**Interpretation:**
- Construction fails, unauthenticated GET returns HTTP: investigate the secret/header's formatting;
  do not copy its value into a log, issue, or chat. Authentication is skipped.
- The unauthenticated GET throws or times out: investigate the Worker-to-Z.AI connection using its
  redacted message/cause fields. Authentication is skipped. This alone is not proof of a provider outage.
- The unauthenticated GET returns **any HTTP status** (401/403 are expected; even 3xx/5xx count): the
  Worker received an HTTP response on that path. If construction passed but authentication throws,
  investigate the authenticated request using its sanitized message. An authenticated 401/403 is an
  HTTP credential refusal, not a transport failure; the existing labelled allowlist fallback remains.

**One-time scope and cleanup.** A synchronous in-memory latch allows only one extra probe per Worker
**isolate**, including under concurrent requests. This is best-effort, **not** a globally one-time
operation across Cloudflare: a new isolate, a recycle, or a redeploy can run it again. Later requests
in the same isolate (even with the query) resume ordinary authenticated model-list behavior without
extra probes or message logging. Make one manual request, do not loop it, then remove
`LLM_RELAY_OUTBOUND_DIAGNOSTIC` from `previews.vars` (and any dashboard override) and redeploy.
The independent, pre-existing preview rate-limit experiment is not required for this diagnostic.

## 5. Limits and honesty

- **Prompts transit your Worker.** That is the trade for holding the key server-side: the operator of
  this deployment can read every prompt in flight, and Z.AI receives it under Z.AI's own terms. The
  relay stores no prompts or replies, and no per-caller history beyond in-memory rate-limit
  counters. Persisted Worker logs contain only failure categories by default; the temporary models-only
  diagnostic above adds secret-redacted outbound error messages when explicitly triggered.
- **Temporary branch-preview experiment.** The checked-in `wrangler.jsonc` sets
  `LLM_RELAY_DISABLE_RATE_LIMITS=true` only in the `previews.vars` block to test the operator's
  request. On branch previews this bypasses this Worker's per-caller chat, shared chat, and model-list
  windows; it does **not** bypass Z.AI's own rate limits, daily quota, model allowlist, request-size
  caps, or output-token ceiling. The branch preview URL is public and anyone who can reach it can
  consume the preview's shared Z.AI secret/quota. Keep this experiment out of production, monitor for
  Z.AI 429s, and remove the preview flag when the comparison is complete. Production remains limited
  because its base `vars` do not set this flag.
- **One caller is never paced tighter than Z.AI paces the account.** `js/g0-llm.js` keeps
  `LIMITS.codesPerCall` at 1, so a Ground-0 reading asks **nine questions per source batch** and adds
  a link-selection call per batch plus one call per contested question — dozens of calls for one
  audit. A tight per-caller cap would therefore refuse a reading that had done nothing wrong (an
  earlier limit of 12 a minute did exactly that). So the per-caller budget is **60 a minute, which is
  Z.AI's own documented free pace of about one request a second**: fast enough that model latency, not
  this relay, is what paces an honest reading, and no faster than the provider would allow anyway. The
  window **slides**, so the `Retry-After` a refusal quotes is the seconds until the oldest call ages
  out, not the rest of a fixed minute — and an aged-out call frees exactly one slot rather than making
  the caller wait for the whole minute to clear. Every chat response carries `RateLimit-Limit`,
  `RateLimit-Remaining` and `RateLimit-Reset`, and the body repeats them as `relay.pacing`, so the
  budget is visible before it runs out.
- **The shared ceiling is what protects your quota.** Z.AI's free tier is roughly one request a second
  and on the order of a thousand a day. Since this relay is open to any same-origin caller, all
  callers together are held to **120 calls a minute per isolate** — two readers at full pace, and a
  crowd is queued rather than let through. When that ceiling is what refused a call, the 429 says so in
  those terms (other people are using it right now) and the caller's own budget is not charged for a
  request it was never allowed to make. Neither number is a daily quota: Z.AI's own 429 is the
  authority on the day's allowance, and the relay forwards it with its `Retry-After` intact.
- **The browser waits out a short pace.** `js/llm.js` honors a stated `Retry-After` of 15 seconds or
  less, once per call, and reports it in Ground-0's progress line (*"…asked us to wait 2 seconds
  before retrying B4…"*), because with one question per call a refused question is a question left
  `UNKNOWN`. A longer stated delay is shown to the reader rather than spent behind a busy progress
  bar. A rate-limited question is never counted as evidence either way.
- **The limit is best-effort.** It is one isolate's memory, so a caller can reach a different
  isolate, and the counters do not survive a restart or a deploy. It is abuse friction, not quota
  enforcement — Z.AI's own free-tier limits are the real ceiling, and Z.AI has changed them more than
  once. Distributed limiting needs KV or a Durable Object and is not implemented here. Under local
  `wrangler dev` there is no `Request.cf`, so every caller collapses into a single bucket keyed on the
  proxy's `X-Forwarded-For` address: a local reading reaches the per-caller ceiling far sooner than a
  deployed one, where `CF-Connecting-IP` names the real client.
- **The relay is not behind Cloudflare Access**, unlike `/api/storage/*`. It is protected by the
  same-origin check, the free-model allowlist, the size and output caps, and the per-caller rate
  limit, so a public page cannot spend money through it. If your whole hostname is already behind
  Access (as the MongoDB guide recommends), the relay inherits that. If you want the relay
  owner-only, put the hostname behind Access — the relay does not implement its own identity check.
- **Free tiers change.** The allowlist is Z.AI's current $0 text models. If Z.AI moves them behind a
  paid plan, calls will fail with a 404 or 402 that says so; nothing in this repository can promise
  continued free access. Check Z.AI's pricing page before relying on it.
- **Model quality is not assured.** A free Flash model reading a retrieved record is still an
  untrusted reading: every quote is checked character-for-character against stored text,
  unverifiable readings are discarded, and the record still requires human review. The relay adds no
  authority and issues no badge.

## 6. Tests

```bash
npm run test:relay   # tests/llm-relay-test.mjs — relay contract tests, stubbed upstream
npm run test:llm     # includes the browser-side relay preset, key isolation and status handling
```

The relay suite covers: no upstream call when unconfigured; the dotted and underscore secret names;
the operator kill switch; the exact forwarded body and the dropped fields; a caller-supplied
`Authorization` header never being forwarded; reply normalization with `reasoning_content` and
`tool_calls` stripped; the sampling translation table; ceiling clamping and `max_completion_tokens`;
the model allowlist (including case-insensitivity and a paid model never reaching Z.AI); non-text,
role, empty-prompt and oversized-body refusals; method, route and same-origin rules; sanitized
upstream failures for 401/403/404/400/402/429/5xx; `Retry-After` forwarding and rejection of a
non-numeric one; transport and timeout failures; the sliding per-caller window (a freed slot returns
without the whole minute clearing, and the quoted wait shrinks accordingly), the `RateLimit-*`
headers, the shared ceiling across distinct callers, and a refusal consuming no slot; a bounded
caller table; the status and model-list routes (including the labelled fallback when Z.AI will not
answer); and Worker route ordering — `/api/llm` reaches the relay while `/api/storage/*` still fails
closed without Cloudflare Access. The temporary outbound diagnostic is tested for explicit opt-in,
local construction with malformed headers, one unauthenticated fixed-URL GET, HTTP-error reachability,
independent probe timeout, authenticated error/cause redaction, unchanged fallback behavior,
concurrent once-per-isolate claiming, and no diagnostic on status or chat. No test uses a real key
or sends a request to Z.AI.

`npm run integrity` runs both suites and records them in the CI integrity report under
**Z.AI free-tier LLM relay (Worker)**.
