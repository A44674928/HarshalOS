# Security policy and threat model

**Last reviewed:** 2026-10-10
**Status:** Project-specific disclosure for a browser-based structural demonstration and a quarantined Apple-platform (Swift) prototype classified AVOID (caustic · compromised). This is not a security certification, production deployment approval, or guarantee that the implementation is vulnerability-free.

## Security posture

HarshalOS is a client-side demonstration of governance and refusal concepts. It does **not** provide a production operating-system security boundary, trusted human identity, production authorization, or independently witnessed audit records. The modeled `PERMITTED` result, phase, Human Key, hashes, identifiers, and receipts are local demonstration artifacts. Do not use them to authorize real-world actions or to claim that a person was authenticated.

The browser kernel keeps its mutable state in a closure and publishes a frozen `window.HOS` capability API rather than a global mutable state object. API transitions validate candidate state, and observations and ledger reads are detached copies. These controls reduce accidental or ordinary API-level mutation; they do not make JavaScript in a user-controlled browser tamper-proof.

The native Swift foundation under [`AVOID-APPLE-ECOSYSTEM-CAUSTIC-COMPROMISED/apple-swift-native/HarshalNative/`](AVOID-APPLE-ECOSYSTEM-CAUSTIC-COMPROMISED/apple-swift-native/HarshalNative/README.md) is also **local demonstration software**. Its declaration label is self-declared; its on-device acknowledgement is not a Human Key authenticator; its SHA-256 local ledger/receipt is not a signature or independent witness; and its optional CloudKit private mirror is synchronization, not identity proof or authorization. The public-observation feature uses a separate, explicitly user-triggered Community handoff; it never publishes a personal universe core and it does not treat a public pseudonym, one-time claim code, or returned note receipt as identity/authorization. The first native build deliberately rejects a local attempt to label itself externally attested because no independently reviewed external-attestation provider is configured. See its [architecture and trust boundary](AVOID-APPLE-ECOSYSTEM-CAUSTIC-COMPROMISED/apple-swift-native/HarshalNative/docs/ARCHITECTURE.md).

## Assets and security objectives

The implementation handles or models:

- Local HOS state and results: Human Key demo status, legitimacy factors, phase, session metadata, and the in-memory duty ledger.
- Native Swift foundation state: self-declared phase labels, acknowledgement status, local gate inputs/results, ledger/receipt, public-note drafts, and a short-lived handoff status capability/claim code when the user explicitly stages a public note. Private persisted state is stored in an app-private AES-GCM file whose per-installation key is held separately in Keychain; short-lived Community capability material is held in a distinct Keychain record and excluded from observation serialization. These measures improve ordinary at-rest confidentiality but are not independent tamper-proofing or evidence witnessing.
- Browser-held Ground-0 audits/evidence, preferences, and optional model API keys. Browser storage is not application-encrypted and is available to code running in the same origin and to people with access to the browser profile.
- User-entered evidence, source documents, model prompts/responses, and any text included in a cloud snapshot or ledger archive.
- Cloudflare Access configuration, Worker secrets, MongoDB credentials, and stored snapshots/archives when optional cloud storage is configured.
- Source code and static assets delivered to the browser, including a Google GenAI SDK module loaded from jsDelivr when that provider is used.

The code and tests aim to make intended local API transitions explicit, reject malformed or stale requests, preserve ledger-chain consistency, keep model output out of HOS authority APIs, and require configured authentication for private cloud-storage routes. These are bounded application properties, not guarantees against a compromised browser, host, deployment, or operator account.

## Threat model and trust boundaries

### 1. Browser page and HOS kernel

**Expected protection:** `js/kernel.js` does not expose its private state by reference. State mutations go through invariant and transition checks; `observe()` and ledger access return immutable copies. Tests exercise malformed inputs, replay, expiry, races, and ordinary hostile callers.

**Boundary:** `window.HOS` is still available to JavaScript running in the page's origin. A malicious or compromised same-origin script, XSS, browser extension, developer-tools user, injected dependency, or person controlling the browser can inspect or replace page behavior, invoke exposed capabilities, alter the DOM, or falsify displayed results. A closure and frozen objects are not a JavaScript realm or operating-system isolation boundary. The browser-side security profile is not designed to resist an attacker who can execute code in the page.

### 2. Apple ecosystem — AVOID (caustic · compromised; quarantined)

**Expected protection:** the `HarshalCore` and `HarshalLedger` packages separate deterministic model code from SwiftUI presentation; `LocalLedger` serializes ordinary concurrent appends through an actor and verifies a SHA-256 chain prefix. Private native state is encrypted into an app-private file with an AES-GCM key retained separately in Keychain. Short-lived Community claim/status capability material is stored in a separate Keychain vault, omitted from observation serialization, and removed after expiry or a terminal public state. `HarshalDataEgressPolicy` constructs the Community request from only phase, note text, and public pseudonym; private-core, ledger, gate, CloudKit, market, account, and capability fields have no projection field. `ShipmentProvenanceBaseline` separately verifies only pre-registered Ed25519-signed origin/release, scoped route, current revocation snapshot, dual-signed custody, and separately accountable-review records against a caller-owned role-scoped public-key trust store; it holds missing, expired, revoked, altered, replayed, route-deviating, unknown, or one-sided evidence for authorized review and has no shipment acceptance/release action. The app begins without an active acknowledgement, authorization, session tuple, technical attribution, or operational-accountability model input, so the native refusal gate fails closed. Active local acknowledgement state is cleared on app launch rather than silently restored. The macOS target declares App Sandbox, outbound-network client access, and Hardened Runtime settings.

**Boundary:** native process isolation, platform code signing, sandboxing, Keychain storage, and encrypted local state do not turn a self-declared label into a verified person or a local receipt into an independent record. A person controlling an unlocked device, app installation, backup/restore path, Keychain access in that user context, encrypted-state file, or a modified/debug build can alter or replace local state and recompute a local chain. The shipment-provenance verifier checks supplied record signatures and bindings only; it cannot inspect a physical item, prove real-world custody/route/possession, establish signer identity or intent, independently trust a router, supply trusted time, detect all key compromise, halt a shipment, or authorize release/deployment. A suspected network anomaly remains an unproven incident hypothesis pending independent authorized review. The app does not yet use a Secure Enclave-backed signing checkpoint, implement a production hardware-backed authenticator, supply trusted time or an independently governed revocation-distribution service, independently verify a remote publisher, or prove device integrity. It must not be used to screen character, intent, criminality, trustworthiness, or eligibility.

CloudKit code is disabled unless an owner configures a signed app with an owned private container. If enabled, an explicitly requested mirror sends a declaration and local receipt to the user's private CloudKit database. The iCloud account, CloudKit ACL, Apple account recovery, device compromise, database operations, backups, and record schema remain outside this repository's trust guarantee; CloudKit does not independently witness event truth or establish human identity.

The native public-note adapter has no embedded Community session, OAuth client credential, API token, or shared publishing secret. It uses a typed egress projection with only a user-selected phase snapshot, note text, and public pseudonym; the serialization has no representation for private-core, ledger, gate, CloudKit, market, device, account, claim-code, or status-token data. Its isolated no-cookie `URLSession` rejects redirects, rejects the checked-in placeholder origin as unconfigured, and validates returned publisher/public URLs against the configured HTTPS origin and expected observation route; those controls reduce accidental capability leakage or an unexpected handoff destination, but do not make a compromised device/network/Worker trustworthy. The readable one-time claim code is intentionally low-tech bearer material: anyone who receives it can attempt to claim the staged candidate after authenticating, so it must be treated as short-lived sensitive data. The separate 256-bit status token can only query handoff state. Both values are held in the app’s Keychain capability vault—not URLs, observation serialization, logs, crash reports, screenshots, or support tickets—and are removed after terminal state/expiry. An app-controlled device, compromised local state, malicious app build, network/Worker operator, database operator, browser extension, or a person with the claim code can still observe, stage, claim, alter local display, or otherwise affect this process within their respective control. A public receipt/hash is not a signature, authorship proof, identity proof, or independent witness. The remote publisher must remain unavailable/fail closed until its D1/OIDC/moderator configuration and deployment review are complete.

The native `PAPER_TEST` market adapter likewise has no embedded browser cookie, OIDC client secret, Worker/provider secret, wallet material, or trading authority. Pairing starts with a 15-minute manual code and a separate high-entropy polling capability; the signed-in browser must explicitly approve the code under the existing exact-origin session rules before the device can redeem it once. The resulting 30-day bearer is scope-limited to `PAPER_TEST`, stored only in Keychain, transmitted only to the configured HTTPS Worker origin, rejected on redirects, hashed in D1, and checked for expiry/revocation on every use. Browser device-list/revocation actions never return bearer values. These controls reduce accidental cross-site/browser-session leakage and constrain a stolen device token, but do not prove the device owner’s identity or defeat a compromised unlocked device, malicious native build, Worker/D1 operator, browser session compromise, replay before redemption, endpoint misconfiguration, or a person who can read the Keychain in the relevant user context. The ledger remains a simulation: server-issued quotes and Orb values are not provider guarantees, investment advice, execution authority, custody, or a reason to operate cryptocurrency mining/wallet/trading software. A field outage is deliberately unavailable, not a permission to substitute a local fixture.

### 3. Human Key, time, and authorization

The current Human Key is **demonstration-only**. The phrase is public and the HMAC key is bundled in client source; both are available to anyone who can inspect the application. A successful local HMAC exercises an asynchronous state machine but proves no identity, liveness, consent, non-coercion, or secure-hardware possession. Browser time and timers are not trusted time or an independent freshness service. Random IDs are local correlation identifiers, not credentials.

There is no production Human Key authenticator or production authorization path. `requestProductionAttestation()` fails closed. A local `DEMO-PERMITTED` result or explicit GSRB override must never be treated as external authority. Production use would require a separately designed and reviewed external trust root, authenticator, challenge verifier, freshness/revocation policy, and per-action authorization path; none is implemented here.

### 4. Ledger, receipts, and Ground-0 declarations

The PLV ledger is an asynchronous, serialized SHA-256 hash chain. Session receipts bind local identifiers and ledger rows with hashes. This can help detect inconsistent edits in the particular copy being checked, but there is no independently held signing key, remote witness, independently verifiable timestamp, or append-only/WORM guarantee. A person or attacker able to replace the browser, page code, or stored archive can rewrite data and recompute hashes. Hashes do not encrypt content, prove that an event occurred, or establish that its text is true.

Ground-0 formal PDH validation checks an ECDSA signature using a public key supplied with the audit. The application does not provide an external PKI, independently certify that key, or maintain a trusted global key registry or revocation service. A structurally valid signature therefore does not, by itself, prove who controlled the signing key or whether the declaration is true.

The guided demonstration uses a fresh iframe with `sandbox="allow-scripts"` and does not pass the active HOS object into it. This is a narrow protection against accidental mutation by that walkthrough, not a general security boundary for the page or browser.

### 5. LLMs, research, and other external content

`HOSLLM` is designed as a data-only interface: it has no HOS kernel capability, does not dispatch model tools, and treats provider text as untrusted and non-executable. Ground-0 model readings require explicit human selection and remain review-required drafts. Quote matching establishes that text appears in stored source text; it does not establish that the source is authentic, current, complete, or truthful.

Bring-your-own-model API keys are sent from the browser to the configured provider/endpoint. They are held in memory or session storage by default; persistent browser storage is an explicit option. Anyone able to run code in the page or access the browser profile may be able to obtain a key. A custom endpoint receives whatever key and prompt the user sends to it. The Google GenAI browser SDK is loaded from a pinned jsDelivr URL; code executing in the page has the page's browser privileges. Provider retention, access, and processing are governed by the provider and the user's account settings, not by HarshalOS.

The optional site relay is implemented (`worker/llm-relay.mjs`, same-origin `/api/llm`, serving Z.AI's free tier) and **changes that route**: the provider key is a Worker secret, the browser is given no key field to fill, and `js/llm.js` never attaches a stored key to a relay call — a key left over from another provider is not forwarded. In exchange, prompts pass through the Worker, so anyone who operates or compromises that Worker, or the Cloudflare account behind it, can read them in flight. The relay stores nothing: no prompt, no reply, no per-caller history beyond in-memory rate-limit counters.

The relay is deliberately narrow rather than a general proxy: a fixed upstream origin and path (`api.z.ai`), a hard allowlist of Z.AI's $0 free-tier text models so no caller can spend money through it (a paid model is refused before any upstream call), `system`/`user`/`assistant` messages with string content only, dropped `tools`/`tool_choice`/`functions`/`stop`/`top_p`/streaming and any other caller-invented field, an optional strictly reconstructed `response_format: {"type":"json_object"}` serialization hint (no arbitrary schemas or authority), bounded request size, message count and output ceiling, a same-origin `POST` requirement, an ignored caller-supplied `Authorization` header, and pacing over sliding windows — 60 model calls a
minute per caller, which is Z.AI's own free pace and deliberately no tighter because Ground-0 asks one
question per call, plus 120 a minute shared by all callers so an open relay cannot let a crowd spend
the operator's daily free quota in seconds, each response stating the budget left. Replies are reduced to answer text: `reasoning_content` and `tool_calls` are stripped, so the relay hands the browser nothing executable and the DATA-ONLY boundary is unchanged. Upstream error bodies are not echoed, and the key is scrubbed from the short excerpts the relay does quote; a Z.AI 401 is reported as a 502 so a reader is not sent to fix a browser key that was never used.

Residual risk, stated plainly: the relay is **not** behind Cloudflare Access, so any page served from the deployed origin can call it within the rate limit — put the hostname behind Access if that is not acceptable. The pacing counters are one isolate's memory, so they are abuse friction and not quota enforcement; a caller can reach another isolate, and counters do not survive a restart (distributed limiting would need KV or a Durable Object). The shared ceiling is likewise per isolate, so N isolates admit up to N times the stated shared rate — which is why Z.AI's own free-tier limits, not this code, are treated as the real ceiling. A refusal is honest about which ceiling refused it and charges the caller nothing. Z.AI's free-tier availability, limits and model list are Z.AI's to change, and no claim about continued free access is made. Operator guidance, the accepted secret names, and the full failure table are in [`docs/deployment/ZAI-FREE-TIER.md`](docs/deployment/ZAI-FREE-TIER.md).

Treat retrieved web pages, documents, citations, and model responses as untrusted input. Do not rely on a model conclusion without reviewing the underlying evidence.

### 6. Optional Cloudflare Worker and MongoDB storage

Cloud storage is opt-in and uses explicit snapshot and ledger-archive actions; it is not automatic sync. The Worker validates Cloudflare Access JWT signature, issuer, audience, expiry, required claims, and configured owner email before accessing MongoDB. Storage writes also require a same-origin `Origin` header. Missing authentication configuration fails closed. MongoDB credentials are intended to remain in Worker secrets, not browser code.

The application-level checks do not protect against a compromised Cloudflare account, Access policy, Worker secret, MongoDB account, database administrator, or authorized owner's browser. The `Origin` check is an additional browser-request check, not a substitute for authentication. The Worker validates record shape, size, ledger hashes, and archived prefixes; it cannot verify event truth or make MongoDB tamper-proof. Snapshot and ledger contents are sent as application-readable JSON, not encrypted by HarshalOS before storage. Privileged database operators can read, change, or delete stored data. Cloud archives are not independent witnessing, WORM storage, or a backup/recovery guarantee. There is no delete endpoint or retention job. The compatibility check for old ledger hashes is a migration path, not identity verification.

The setup guide currently uses a MongoDB Atlas network rule permitting connections from `0.0.0.0/0` for this initial Worker configuration. This is broad network reachability: database authentication and TLS are still required, and the database user should be unique and least-privileged. Restrict network access when the hosting architecture supports a reliable narrower egress range. Protect the entire configured site hostname with Cloudflare Access when following the private-storage deployment guide; review any change to that policy before deployment. Not every Worker route requires an Access JWT: `/api/good-intelligence/v1/*` (signed synthetic demo data, and the allowlisted Tickerbot proxy that holds its own `TICKERBOT_API_KEY` secret) and `/api/llm` (the Z.AI free-tier relay described in §5) answer same-origin requests directly, each behind its own allowlist, size caps and rate limits. Protecting the whole hostname as recommended above places all of them behind sign-in.

See [MongoDB setup guide](docs/deployment/MONGODB-SETUP.md) for configuration and operational details. No live Atlas connection, Access policy, or production cloud deployment is established by the repository tests.

### 7. Source delivery and deployment

The local `node serve.js` server allowlists site paths rather than serving the checkout, but it binds to `0.0.0.0`, has no authentication or TLS, does not provide the Worker `/api/storage/*` backend, and is for development/preview use—not a public production server. The asset-preparation and Worker configuration stage only the intended site directories; maintain that allowlist and review changes to it. Never publish `.dev.vars`, Worker secrets, database URIs, credentials, private papers, or the full repository as static assets.

This repository does not establish a complete production HTTP security-header policy (for example, a tested Content Security Policy and HSTS configuration). Hosting/CDN configuration, HTTPS, dependency updates, and release integrity remain deployment responsibilities. There has not been a comprehensive XSS, browser, dependency-supply-chain, or deployment audit.

The native **SCAV++ supply-chain boundary** is a narrow local policy model grounded in the published AGS v0.2 corpus. Published **Part XVIII** supplies conceptual accountability/continuity/restraint principles; published **Part XIX** is accurately recorded as `THREAT_RESEARCH` and is cataloged only. The bundled Library may render the owner-provided book read-only, but no app feature derives or operationalizes Part XIX material. It refuses a proposed component-embedding, delegated-authority, external-automation, or privileged integration relationship, and it can contain only a verified local read-only research reference. It is not an SBOM, package/signature verifier, release-attestation system, incident detector, license enforcer, or a technical way to prevent source copying/binary modification outside HarshalOS-controlled interfaces. See [`AVOID-APPLE-ECOSYSTEM-CAUSTIC-COMPROMISED/apple-swift-native/HarshalNative/docs/AGS-V0.2-CORPUS.md`](AVOID-APPLE-ECOSYSTEM-CAUSTIC-COMPROMISED/apple-swift-native/HarshalNative/docs/AGS-V0.2-CORPUS.md) and [`AVOID-APPLE-ECOSYSTEM-CAUSTIC-COMPROMISED/apple-swift-native/HarshalNative/docs/SUPPLY-CHAIN-BOUNDARY.md`](AVOID-APPLE-ECOSYSTEM-CAUSTIC-COMPROMISED/apple-swift-native/HarshalNative/docs/SUPPLY-CHAIN-BOUNDARY.md).

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

Quarantined (AVOID) and not part of the supported surface. For the record only, on a macOS machine with Xcode 15.3+:

```bash
cd "AVOID-APPLE-ECOSYSTEM-CAUSTIC-COMPROMISED/apple-swift-native/HarshalNative/Packages/HarshalCore" && swift test
cd ../HarshalLedger && swift test
```

These native tests cover deterministic declaration/gate/ledger behavior and the local shipment-provenance verifier’s generated-key cryptographic cases; they do not validate a real organization’s signing policy, trust-store distribution, key enrollment/revocation, trusted time, physical custody, an iCloud container, an external identity provider, a real device trust state, or production authorization.

Targeted hostile-caller reports can be run with `node tests/red-team-test.mjs`; Worker authentication/storage tests with `npm run test:cloud`; and kernel API tests with `npm run test:kernel`.

These suites test selected behaviors using Node, VM, mocks, and desktop/mini-DOM harnesses. They are useful regression evidence, but they are not formal verification, a full browser end-to-end test, an independent penetration test, or proof against browser/host compromise. The checked-in `HarshalOS Integrity` GitHub Actions workflow runs the full suite, categorized suites, and a Wrangler deployment dry-run on pushes, pull requests, and manual dispatch. A passing workflow remains regression evidence, not a security audit. Test coverage can miss defects; review code and deployment configuration as well.

## Reporting a vulnerability

Please report suspected vulnerabilities **privately**, with the affected commit or version, impact, environment, and a minimal reproduction where possible. Redact API keys, Access JWTs, database URIs, personal data, and other secrets. If a credential may have been exposed, revoke or rotate it first.

Use [GitHub's private vulnerability reporting for this repository](https://github.com/A44674928/HarshalOS/security/advisories/new) if it is enabled. If private reporting is unavailable, contact the repository maintainer through GitHub and avoid publishing exploit details in a public issue until a fix or coordinated disclosure is possible.

There is no published bug-bounty program or guaranteed response/remediation SLA. Please allow reasonable time for triage and coordinated disclosure; do not access, modify, or retain other people's data while investigating.

## Community accounts and publication (disabled by default)

Community routes are separate from owner-only `/api/storage/*`; public signup must
not relax the legacy owner/Cloudflare Access checks. Sessions use Secure HttpOnly
host cookies and hashed D1 tokens. Authenticated writes require the exact origin.

Private drafts/runs do not become public automatically. Owners may permanently delete
their own private drafts and runs; deletion is refused when the record anchors a
published report, and public rows, events and tombstones cannot be deleted through any
endpoint. Publication copies an
owner-bound, expiring, exact preview only after explicit acknowledgement. Public
reports are UNREVIEWED calculations on user claims, not verified identities or
evidence. Public DTOs exclude private account/draft/run IDs and moderator/report
details. Withdrawal/hide redacts the payload and author label but keeps a minimal
hash/history tombstone; external copies cannot be recalled. Database operators
and backup access remain trusted, and hashes are not tamper-proof signatures.

Public observations use a separate D1 schema and never inherit private draft/run
identifiers. An unauthenticated native staging request is rate-limited and creates only
an unlisted, short-lived candidate; it cannot directly publish. Claim and publish need
a signed-in Community session, exact-origin writes, a public pseudonym, explicit
acknowledgement, an unblocked account, an unexpired handoff, and an available moderator.
The status endpoint requires a separate high-entropy header token and returns receipt
metadata but never a note body. Public DTOs exclude handoff secrets, owner/account IDs, native
IDs, universe-core IDs, declaration labels, and private notes. These controls do not
prevent a willing author from posting sensitive or false content, a claim-code recipient
from attempting a claim, an operator from accessing D1, or copied public content from
persisting elsewhere. A configured signed-in moderator can hide an active note only
with a bounded internal reason; the service retains an append-only private moderation
action and redacts the public DTO, but neither hide nor withdrawal proves content false
or recalls external copies. Public observations are **UNREVIEWED** author submissions,
not identity verification, authorization, peer consent, financial advice, or Orb 2 core data.

Before enabling, complete the staging, moderation, privacy/retention, backup and
abuse-control gates in `docs/deployment/COMMUNITY-D1.md`. Live-provider/remote-D1
verification is not established by the automated local tests. Do not post secrets
or private audit/report contents to public issue trackers.
