# Security policy and threat model

**Last reviewed:** 2026-09-30
**Status:** Project-specific disclosure for a browser-based structural demonstration. This is not a security certification, production deployment approval, or guarantee that the implementation is vulnerability-free.

## Security posture

HarshalOS is a client-side demonstration of governance and refusal concepts. It does **not** provide a production operating-system security boundary, trusted human identity, production authorization, or independently witnessed audit records. The modeled `PERMITTED` result, phase, Human Key, hashes, identifiers, and receipts are local demonstration artifacts. Do not use them to authorize real-world actions or to claim that a person was authenticated.

The browser kernel keeps its mutable state in a closure and publishes a frozen `window.HOS` capability API rather than a global mutable state object. API transitions validate candidate state, and observations and ledger reads are detached copies. These controls reduce accidental or ordinary API-level mutation; they do not make JavaScript in a user-controlled browser tamper-proof.

## Assets and security objectives

The implementation handles or models:

- Local HOS state and results: Human Key demo status, legitimacy factors, phase, session metadata, and the in-memory duty ledger.
- Browser-held Ground-0 audits/evidence, preferences, and optional model API keys. Browser storage is not application-encrypted and is available to code running in the same origin and to people with access to the browser profile.
- User-entered evidence, source documents, model prompts/responses, and any text included in a cloud snapshot or ledger archive.
- Cloudflare Access configuration, Worker secrets, MongoDB credentials, and stored snapshots/archives when optional cloud storage is configured.
- Source code and static assets delivered to the browser, including a Google GenAI SDK module loaded from jsDelivr when that provider is used.

The code and tests aim to make intended local API transitions explicit, reject malformed or stale requests, preserve ledger-chain consistency, keep model output out of HOS authority APIs, and require configured authentication for private cloud-storage routes. These are bounded application properties, not guarantees against a compromised browser, host, deployment, or operator account.

## Threat model and trust boundaries

### 1. Browser page and HOS kernel

**Expected protection:** `js/kernel.js` does not expose its private state by reference. State mutations go through invariant and transition checks; `observe()` and ledger access return immutable copies. Tests exercise malformed inputs, replay, expiry, races, and ordinary hostile callers.

**Boundary:** `window.HOS` is still available to JavaScript running in the page's origin. A malicious or compromised same-origin script, XSS, browser extension, developer-tools user, injected dependency, or person controlling the browser can inspect or replace page behavior, invoke exposed capabilities, alter the DOM, or falsify displayed results. A closure and frozen objects are not a JavaScript realm or operating-system isolation boundary. The browser-side security profile is not designed to resist an attacker who can execute code in the page.

### 2. Human Key, time, and authorization

The current Human Key is **demonstration-only**. The phrase is public and the HMAC key is bundled in client source; both are available to anyone who can inspect the application. A successful local HMAC exercises an asynchronous state machine but proves no identity, liveness, consent, non-coercion, or secure-hardware possession. Browser time and timers are not trusted time or an independent freshness service. Random IDs are local correlation identifiers, not credentials.

There is no production Human Key authenticator or production authorization path. `requestProductionAttestation()` fails closed. A local `DEMO-PERMITTED` result or explicit GSRB override must never be treated as external authority. Production use would require a separately designed and reviewed external trust root, authenticator, challenge verifier, freshness/revocation policy, and per-action authorization path; none is implemented here.

### 3. Ledger, receipts, and Ground-0 declarations

The PLV ledger is an asynchronous, serialized SHA-256 hash chain. Session receipts bind local identifiers and ledger rows with hashes. This can help detect inconsistent edits in the particular copy being checked, but there is no independently held signing key, remote witness, independently verifiable timestamp, or append-only/WORM guarantee. A person or attacker able to replace the browser, page code, or stored archive can rewrite data and recompute hashes. Hashes do not encrypt content, prove that an event occurred, or establish that its text is true.

Ground-0 formal PDH validation checks an ECDSA signature using a public key supplied with the audit. The application does not provide an external PKI, independently certify that key, or maintain a trusted global key registry or revocation service. A structurally valid signature therefore does not, by itself, prove who controlled the signing key or whether the declaration is true.

The guided demonstration uses a fresh iframe with `sandbox="allow-scripts"` and does not pass the active HOS object into it. This is a narrow protection against accidental mutation by that walkthrough, not a general security boundary for the page or browser.

### 4. LLMs, research, and other external content

`HOSLLM` is designed as a data-only interface: it has no HOS kernel capability, does not dispatch model tools, and treats provider text as untrusted and non-executable. Ground-0 model readings require explicit human selection and remain review-required drafts. Quote matching establishes that text appears in stored source text; it does not establish that the source is authentic, current, complete, or truthful.

Bring-your-own-model API keys are sent from the browser to the configured provider/endpoint. They are held in memory or session storage by default; persistent browser storage is an explicit option. Anyone able to run code in the page or access the browser profile may be able to obtain a key. A custom endpoint receives whatever key and prompt the user sends to it. The Google GenAI browser SDK is loaded from a pinned jsDelivr URL; code executing in the page has the page's browser privileges. Provider retention, access, and processing are governed by the provider and the user's account settings, not by HarshalOS.

The optional site relay is implemented (`worker/llm-relay.mjs`, same-origin `/api/llm`, serving Z.AI's free tier) and **changes that route**: the provider key is a Worker secret, the browser is given no key field to fill, and `js/llm.js` never attaches a stored key to a relay call — a key left over from another provider is not forwarded. In exchange, prompts pass through the Worker, so anyone who operates or compromises that Worker, or the Cloudflare account behind it, can read them in flight. The relay stores nothing: no prompt, no reply, no per-caller history beyond in-memory rate-limit counters.

The relay is deliberately narrow rather than a general proxy: a fixed upstream origin and path (`api.z.ai`), a hard allowlist of Z.AI's $0 free-tier text models so no caller can spend money through it (a paid model is refused before any upstream call), `system`/`user`/`assistant` messages with string content only, dropped `tools`/`tool_choice`/`functions`/`stop`/`top_p`/streaming and any other caller-invented field, an optional strictly reconstructed `response_format: {"type":"json_object"}` serialization hint (no arbitrary schemas or authority), bounded request size, message count and output ceiling, a same-origin `POST` requirement, an ignored caller-supplied `Authorization` header, and pacing over sliding windows — 60 model calls a
minute per caller, which is Z.AI's own free pace and deliberately no tighter because Ground-0 asks one
question per call, plus 120 a minute shared by all callers so an open relay cannot let a crowd spend
the operator's daily free quota in seconds, each response stating the budget left. Replies are reduced to answer text: `reasoning_content` and `tool_calls` are stripped, so the relay hands the browser nothing executable and the DATA-ONLY boundary is unchanged. Upstream error bodies are not echoed, and the key is scrubbed from the short excerpts the relay does quote; a Z.AI 401 is reported as a 502 so a reader is not sent to fix a browser key that was never used.

Residual risk, stated plainly: the relay is **not** behind Cloudflare Access, so any page served from the deployed origin can call it within the rate limit — put the hostname behind Access if that is not acceptable. The pacing counters are one isolate's memory, so they are abuse friction and not quota enforcement; a caller can reach another isolate, and counters do not survive a restart (distributed limiting would need KV or a Durable Object). The shared ceiling is likewise per isolate, so N isolates admit up to N times the stated shared rate — which is why Z.AI's own free-tier limits, not this code, are treated as the real ceiling. A refusal is honest about which ceiling refused it and charges the caller nothing. Z.AI's free-tier availability, limits and model list are Z.AI's to change, and no claim about continued free access is made. Operator guidance, the accepted secret names, and the full failure table are in [`docs/deployment/ZAI-FREE-TIER.md`](docs/deployment/ZAI-FREE-TIER.md).

Treat retrieved web pages, documents, citations, and model responses as untrusted input. Do not rely on a model conclusion without reviewing the underlying evidence.

### 5. Optional Cloudflare Worker and MongoDB storage

Cloud storage is opt-in and uses explicit snapshot and ledger-archive actions; it is not automatic sync. The Worker validates Cloudflare Access JWT signature, issuer, audience, expiry, required claims, and configured owner email before accessing MongoDB. Storage writes also require a same-origin `Origin` header. Missing authentication configuration fails closed. MongoDB credentials are intended to remain in Worker secrets, not browser code.

The application-level checks do not protect against a compromised Cloudflare account, Access policy, Worker secret, MongoDB account, database administrator, or authorized owner's browser. The `Origin` check is an additional browser-request check, not a substitute for authentication. The Worker validates record shape, size, ledger hashes, and archived prefixes; it cannot verify event truth or make MongoDB tamper-proof. Snapshot and ledger contents are sent as application-readable JSON, not encrypted by HarshalOS before storage. Privileged database operators can read, change, or delete stored data. Cloud archives are not independent witnessing, WORM storage, or a backup/recovery guarantee. There is no delete endpoint or retention job. The compatibility check for old ledger hashes is a migration path, not identity verification.

The setup guide currently uses a MongoDB Atlas network rule permitting connections from `0.0.0.0/0` for this initial Worker configuration. This is broad network reachability: database authentication and TLS are still required, and the database user should be unique and least-privileged. Restrict network access when the hosting architecture supports a reliable narrower egress range. Protect the entire configured site hostname with Cloudflare Access when following the private-storage deployment guide; review any change to that policy before deployment. Not every Worker route requires an Access JWT: `/api/good-intelligence/v1/*` (signed synthetic demo data, and the allowlisted Tickerbot proxy that holds its own `TICKERBOT_API_KEY` secret) and `/api/llm` (the Z.AI free-tier relay described in §4) answer same-origin requests directly, each behind its own allowlist, size caps and rate limits. Protecting the whole hostname as recommended above places all of them behind sign-in.

See [MongoDB setup guide](docs/deployment/MONGODB-SETUP.md) for configuration and operational details. No live Atlas connection, Access policy, or production cloud deployment is established by the repository tests.

### 6. Source delivery and deployment

The local `node serve.js` server allowlists site paths rather than serving the checkout, but it binds to `0.0.0.0`, has no authentication or TLS, does not provide the Worker `/api/storage/*` backend, and is for development/preview use—not a public production server. The asset-preparation and Worker configuration stage only the intended site directories; maintain that allowlist and review changes to it. Never publish `.dev.vars`, Worker secrets, database URIs, credentials, private papers, or the full repository as static assets.

This repository does not establish a complete production HTTP security-header policy (for example, a tested Content Security Policy and HSTS configuration). Hosting/CDN configuration, HTTPS, dependency updates, and release integrity remain deployment responsibilities. There has not been a comprehensive XSS, browser, dependency-supply-chain, or deployment audit.

One browser library is vendored rather than loaded from a CDN: TradingView Lightweight Charts™ (Apache-2.0) at `js/vendor/lightweight-charts/`, used by the Good Intelligence TradingView tab. Nothing is fetched from TradingView at runtime and the library receives only same-origin OHLCV rows. The copy is byte-for-byte from the published npm package; `js/vendor/lightweight-charts/PROVENANCE.md` records the tarball integrity and SHA-256, and `tests/good-intelligence-tradingview-test.mjs` fails if the vendored bytes or the retained license banner change. That hash check detects drift in this checkout; it is not a vulnerability review of the upstream library.

## Assumptions for operators

- The browser, operating system, and user profile are not already compromised.
- Production hosting serves the intended reviewed code over HTTPS and does not inject scripts or expose repository-only files.
- Any enabled Cloudflare Access policy and Worker secrets are configured and protected as intended; MongoDB credentials are kept out of source, chat, logs, and public assets.
- Users choose model providers and custom endpoints knowingly, understand what prompt data they receive, and do not treat the browser as a secret vault.
- Users export important local work. Optional cloud storage is not a backup service and provides no independent evidence witness.

## Safer use and deployment

1. Treat the site as a local structural demonstration. Never use its simulated gate result, demo Human Key, phase, or receipt as production authorization or proof of identity.
2. Do not enter credentials, secrets, or sensitive personal information into audit/evidence text or model prompts unless the chosen storage and provider are approved for that data.
3. If using an LLM, verify the provider and endpoint before entering a key. Clear the key when finished; avoid persistent key storage on shared or managed browsers.
4. If enabling cloud storage, follow `docs/deployment/MONGODB-SETUP.md`, use Cloudflare secrets for backend credentials, protect the whole site hostname with Access, use a least-privilege database user, and retain separate exports.
5. Do not expose `node serve.js` as a public production service. Configure and test HTTPS and suitable security headers at the production host/edge.
6. Keep dependencies and the hosting configuration reviewed and current. Do not assume a green unit test run is a security audit.

## Security testing and evidence limits

Run the repository's current Node suites with:

```bash
node --test tests/*-test.mjs
```

Targeted hostile-caller reports can be run with `node tests/red-team-test.mjs`; Worker authentication/storage tests with `npm run test:cloud`; and kernel API tests with `npm run test:kernel`.

These suites test selected behaviors using Node, VM, mocks, and desktop/mini-DOM harnesses. They are useful regression evidence, but they are not formal verification, a full browser end-to-end test, an independent penetration test, or proof against browser/host compromise. The checked-in `HarshalOS Integrity` GitHub Actions workflow runs the full suite, categorized suites, and a Wrangler deployment dry-run on pushes, pull requests, and manual dispatch. A passing workflow remains regression evidence, not a security audit. Test coverage can miss defects; review code and deployment configuration as well.

## Reporting a vulnerability

Please report suspected vulnerabilities **privately**, with the affected commit or version, impact, environment, and a minimal reproduction where possible. Redact API keys, Access JWTs, database URIs, personal data, and other secrets. If a credential may have been exposed, revoke or rotate it first.

Use [GitHub's private vulnerability reporting for this repository](https://github.com/A44674928/HarshalOS/security/advisories/new) if it is enabled. If private reporting is unavailable, contact the repository maintainer through GitHub and avoid publishing exploit details in a public issue until a fix or coordinated disclosure is possible.

There is no published bug-bounty program or guaranteed response/remediation SLA. Please allow reasonable time for triage and coordinated disclosure; do not access, modify, or retain other people's data while investigating.
