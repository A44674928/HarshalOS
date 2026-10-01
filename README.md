# HarshalOS

**Architectures for Accountable Human D'Ash Machine Intelligence**

HarshalOS is a working structural demonstration of the governance architecture specified in
**Harshal's Systems** (formerly AGS++) — *Harshal's Systems (Working Draft)* by
**Harshal Priyavadan Patel**.

It is an accountability-gated operating system: every window, state change, and refusal is bound by
the document's core constraint — **legitimacy precedes capability**. The default state of the system
is refusal. Action is a temporary, highly constrained exception.

> *The system does not prevent gods, states, or religions. It prevents them from pretending to be
> something else.*

---

## Run it

The browser-only shell needs no build step or dependencies. Use the allowlisted preview server (do not expose the whole checkout):

```bash
node serve.js
# open http://localhost:8000
```

Or open `index.html` in a browser for a static-only preview.

### Optional private MongoDB storage

The **Cloud Storage** app adds explicit private cloud snapshots for Ground-0 audits/evidence
and append-only PLV session archives through a Cloudflare Worker. Cloudflare Access restricts
storage to the owner; database credentials stay in Worker secrets. Local-only operation remains
available. This is not automatic sync, independent witnessing, or a replacement for backups.

Follow **[MongoDB setup guide](docs/deployment/MONGODB-SETUP.md)** for Atlas, Access, secrets, deployment, limits,
and verification. `npm ci && npm run dev` runs the Worker preview. Missing authentication
configuration intentionally disables the API; no credentials should be pasted into chat or Git.

### Optional Z.AI free-tier model relay

The same Worker can serve LLM Link's **`/api/llm`** relay, which holds a Z.AI API key as a Worker
secret so no key is ever pasted into a browser. It serves only Z.AI's $0 GLM Flash models, forwards
plain text with no tools and no streaming, and rate-limits each caller; a missing key answers 503 and
says so. Follow **[Z.AI free-tier guide](docs/deployment/ZAI-FREE-TIER.md)** for the secret names it
accepts, the request limits, Z.AI's sampling translation, verification calls, and the honest limits
of a same-origin relay. Without it, every BYOK connection point still works exactly as before.

---

## What is implemented

**Scope boundary:** this repository is a client-side demonstration. Gate results, phase changes, hashes, identifiers, receipts, and ledger entries are local simulation artifacts; they do not authenticate a person, authorize production actions through the HOS gate, or provide independent witnessing. The session receipt is not signed by an independent authority and is not production authentication or identity proof. A production Human Key authenticator and HOS production-authorization path are unavailable. See [SECURITY.md](SECURITY.md) for the threat model, trust boundaries, known limitations, safer deployment guidance, and vulnerability reporting.

| Document concept | In HarshalOS |
|---|---|
| **Phase Declaration Header (PDH)** | Boot sequence publishes the PDH before any operation; the PDH app shows the live header (immutable `Declaration-Hash`, ISO timestamp) and enforces the single-phase invariant |
| **Human Key (demo only)** | A public browser phrase starts an explicit asynchronous lifecycle: `pending` keeps `H(t)=0`; only a successful HMAC for the current ceremony, completed within the local freshness window, activates the demo marker. Failure, revocation, or a newer ceremony cannot restore authority from a late result. Expiry is derived from browser-time freshness. This proves no identity, liveness, consent, consciousness, non-coercion, or biological coupling; production authentication and authorization are unavailable |
| **Legitimacy-gate model (A.2–A.6)** | Interactive browser simulation of `L(t) = H(t) × f(A(t), R(t), S(t))` and the modeled threshold/refusal behavior. A local `PERMITTED` result is tagged `LOCAL-DEMO-ONLY`; it cannot authorize external or production actions |
| **Temporal decay model (A.5)** | The browser timer illustrates `S(t) = Smax·max(0, 1−Δt/δ)` and a local refusal at expiry; it does not monitor human presence or enforce an external halt |
| **Guided refusal demonstration (Priority 10)** | One-button, seven-step walkthrough against the real HOS API in a fresh sandboxed frame-local kernel. It demonstrates absent-key refusal, local legitimacy restoration, degraded addressability, accelerated expiry, re-attestation, CWO refusal at `L=0`, and an explicit GSRB legitimacy-threshold override. The child ledger and clock are discarded; the active desktop kernel is not passed in. This remains a local simulation, not authentication or production authorization |
| **Three phase models** | ❄ NAB · 💧 CWO · 💨 GSRB. The browser demo exercises single-phase and transition invariants, including a local collapse sequence; these states do not enforce production policy or create sovereignty |
| **Duty Collation Ledger / PLV** | In-browser, hash-chained demo log. It is not independently witnessed, remotely anchored, or tamper-resistant against page compromise; the cloud archive is also not independent witnessing. Severity: Informational / Warning / Breach / Collapse |
| **Session/ledger binding (Priority 7)** | Local demo `Session-ID` + `Boot-ID` + `PDH-ID` + `Human-Attestation-ID` are recorded together. `closeSession()` emits a canonical receipt linking the binding and termination rows to a receipt-row `Ledger-Root`; `verifySessionReceipt()` checks the local SHA-256 chain. IDs/hashes are not identity proof, authentication, an independent signature, or production trust |
| **AI Inner Shell** | Address-constrained AI nodes (`0•100•000•NNNN•AI-XXXX`). Removing the anchor invalidates all dependent nodes instantly — *geometry, not enforcement*. Learning increases capability, never authority |
| **Discs** | Bounded operational contexts with time horizons, fossilized scope, distance limits, and external legitimacy references. Deterministic halting; no authority residue; discs cannot create other discs |
| **Whyland Standards (TCS)** | Local contextual-inquiry simulation: `why.query`, `why.activate`, `why.explain`, modeled session transitions, off-disc catalog virtualization, demo-timer gating, and the Bromine gateway (invalid input → local session reset) |
| **LLM connection points** | Bring your own model: Anthropic, OpenRouter, Google's GenAI SDK, any OpenAI-compatible endpoint, a local server (Ollama / LM Studio), or **this deployment's Z.AI free-tier relay** (`/api/llm`), which holds the key as a Worker secret so no key is pasted into the browser. A BYOK key never leaves the browser except to the endpoint the custodian chose, and is held for the tab unless persistent storage is requested. Providers that refuse browser calls (`api.openai.com`) are labelled as such rather than faked, and a deployment with no relay says so instead of pretending |
| **Good Intelligence signal desk** | Native read-only dashboard for feed, categories, intel details, rankings, and a dedicated Market Charts tab with ticker price line graphs plus VFI, Fibonacci-band, and WaveTrend visualizations. The default same-origin `empty.domains` API serves clearly marked synthetic current/stale/contested/unassessed cases, demo-only signed source-authorization fixtures, and eight synthetic ticker histories (`AAPL-DEMO`, `MSFT-DEMO`, `NVDA-DEMO`, `INTC-DEMO`, `AMD-DEMO`, `NET-DEMO`, `CVX-DEMO`, `XOM-DEMO`); these are not real prices, and APIs without OHLCV show no fabricated charts. A tracked-ticker search filters symbols or company names in Market Charts; live search covers the configured sector-diverse Tickerbot watchlist (52 symbols including Apple, Microsoft, Intel, AMD, Cloudflare, Chevron, Exxon Mobil, and Tesla) and never fetches an unconfigured symbol. An optional read-only Tickerbot Live source fetches allowlisted OHLCV through a same-origin Worker route using the `TICKERBOT_API_KEY` secret; the key never reaches browser code. Live Sentinel items without the assurance packet stay `NOT SCORED`. Market indicators never alter the assurance score. The v0.1 formula is provisional, not approved policy. Scores never certify truth or authorize action. Uses GET-only `/content/me`, `/categories`, `/rank`; tries legacy `/intel/me` only if the documented feed route is missing. No sign-in, publishing, token approval, or transaction flow |
| **Ground-0 audits** | Observed-behavior phase classification with forced re-badging, Theorems I & II, and duty collation — the institutional honesty engine. Presets include two worked frontier-lab case studies: [OpenAI Group PBC](case-studies/GROUND-0%20CASE%20STUDY%20-%20OpenAI.md) and [Anthropic PBC](case-studies/GROUND-0%20CASE%20STUDY%20-%20Anthropic.md) |
| **Symbolic Firewall** | Narrative, mythic, and commercial metaphor is sealed as **non-executable** — the structural defense against neurojacking |
| **500 voting coins** | Bounded-governance simulation of the physical hardcover book's coin pool — influence limited by design |
| **The Grand River Foundation** | The second tab under **The Book**: a chapter-by-chapter reading view for a plaintext manuscript submitted as ordinary `.txt` files under [`manuscript/the-grand-river-foundation/`](manuscript/README.md). The site builds the chapter index from the files themselves — no build step, no editor, no upload from the browser — and renders one chapter at a time with a contents rail, word counts, remembered reading position, and a SHA-256 digest of the text as loaded. A manuscript is read here, never executed: every chapter is escaped before it reaches the DOM. The digest identifies a state of the text; it is not a signature, an authorization, or proof of authorship |
| **Glossary** | Part II stabilized terms, searchable |
| **Zero Trust / Harshal Neural OS** | The framework calls for external, per-action, time-bounded authorization. This browser demo does not implement that production trust anchor; its local gate only models the refusal/freshness rules and cannot grant production authority |
| **OCM visualization — The Orb** | HarshalOS itself rendered as a radiative sphere of influence: desktop apps as radiative nodes attached directly to the center (`0•[orb]•[sector]•[instance]`), the 360-address equatorial disc (`0•DDD•000•0000`), the disc→sphere formation animation (rotation over time + depth), distance shells (`0•DDD•RRR•####`), the non-sovereign resolution axis, AI inner shell, lateral comms, and interaction-orb arcs — drag to orbit, click a node to inspect its address lineage |
| **Interaction Orbs** | The non-additive extension: OCM arithmetic (A=1, B=1, A↔B=1 → 3), both worked micro-examples as steppers (25%+25% → 75% observed mismatch), the three communication layers, navigation/exit protocol, and the classical-vs-OCM comparison |

### Submitting a manuscript chapter

**The Book → The Grand River Foundation** reads plaintext straight from
[`manuscript/the-grand-river-foundation/`](manuscript/README.md). The submission step is a commit:

```text
manuscript/the-grand-river-foundation/
  01-the-arrival.txt
  02-the-river-remembers.txt
```

A leading number in the file name sets the reading order; a first line starting with `# ` sets the
chapter title (otherwise the title comes from the file name); blank lines separate paragraphs, and
`---` is a scene break. `node serve.js` builds the index on request, so a saved file appears on the
next reload locally, and a deploy publishes the chapters through `scripts/prepare-assets.mjs`.
Only `.txt`/`.md` chapter files named by the generated index are published: `_collection.json`,
`README.md`, and any other file left in the folder stay out of the deployed site. A chapter that
fails to load says so and names the file, rather than rendering an empty page.

## Layout

```
index.html        — Browser-shell entry point (boot, HUD, desktop, taskbar)
css/              — OS, Ground-0 workspace, and manuscript reading styles
assets/           — runtime images, animation, and rendering data
manuscript/       — plaintext manuscript submissions; only indexed chapters are published
specs/normative/  — Ground-0 v1.0 finalized normative source; fetched by the spec reader
specs/draft/      — Ground-0 v1.1 amendment draft; fetched as a draft, not a ratified baseline
docs/deployment/  — operator setup and deployment guides
docs/source-material/ — archival combined manuscript transcription; not the app's selected spec
case-studies/     — standalone OpenAI and Anthropic Ground-0 audit writeups
research/reports/ — supporting research reports (separate from scored case studies)
archives/ground-0/ — historical standalone ZIP bundles; not normative source or deployed assets
tests/            — Node test harnesses (kernel, replay/race/property, Ground-0, LLM, relay, cloud, red-team)
scripts/          — asset staging and integrity-report tooling; not deployed with the site
docs/GOOD-INTELLIGENCE-ASSURANCE.md — v0.1 score formula, input contract, and safety limits
worker/           — Cloudflare APIs: private storage, signed synthetic empty.domains GI demo, and the Z.AI free-tier model relay
.github/workflows/ — CI workflow that builds the integrity report on pushes and pull requests
SECURITY.md       — project-specific threat model and vulnerability-reporting policy
Business Plan/    — separate author archive; not included in the browser asset bundle

Runtime JavaScript stays in `js/` so the no-build static shell, worker asset staging, and existing
browser URLs remain direct and predictable. Its logical ownership is documented in
[docs/REPOSITORY-STRUCTURE.md](docs/REPOSITORY-STRUCTURE.md): kernel, UI, Ground-0 research,
LLM, Good Intelligence, and OCM modules are mapped there without creating duplicate source trees.
```

## Kernel API boundary

`js/kernel.js` runs inside a private closure; it does not publish `window.kernel` or a global mutable state object. The frozen `window.HOS` API exposes explicit capabilities such as `request()`, `demoAttest()`, `revoke()`, and `transition()`. There is no generic production `attest()` capability; `requestProductionAttestation()` always fails closed because no production authenticator is configured. The frozen security profile reports `mode: DEMO`, `productionAuthenticatorAvailable: false`, and `productionAuthorizationAvailable: false`. Successful gate results carry `executionScope: LOCAL-DEMO-ONLY`.

`assertStateInvariants()` validates canonical candidate state, `assertTransition()` applies the per-operation transition contract, and `commitState()` is the only post-initialization write path into authority-bearing state. Factor changes, demo-marker start/completion/revocation, phase and PDH changes, collapse acknowledgements, and session bind/burn/close operations all use that path. `observe()` returns a detached, deeply frozen operational snapshot; raw HMAC signatures/fingerprints, precise liveness timestamps, and caller-supplied bound identifiers remain private. Demo `Boot-ID`, `Human-Attestation-ID`, and active session linkage IDs are observable. Ledger reads and subscriber callbacks receive frozen copies as well.

The demo attestation lifecycle is explicit: `absent → pending → active`, with `failed` and `revoked` outcomes. Pending state always has `H(t)=0`, and action authorization refuses while pending. A successful HMAC activates the marker only if its generation is still current and its timestamp remains fresh at completion; HMAC errors and expired results transition to `failed`. Revocation or a newer ceremony supersedes any late completion. `observe()` exposes the lifecycle status plus freshness and a derived `expired` flag; expiry is not stored as a separate authority state. This hardens the local demo state machine only: the public phrase and source-bundled HMAC key provide no identity, liveness, consent, or production proof.

Priority 7 links a session to a per-page-load random `Boot-ID`, the current PDH digest, and a demo `Human-Attestation-ID` derived from local ceremony data. `closeSession(reason)` clears the active session and appends a structured termination row plus a canonical receipt; the receipt includes the binding-row root, termination-row root, a SHA-256 receipt digest, and the hash of its own final ledger row as `Ledger-Root`. `verifySessionReceipt(receipt, rows)` checks the receipt fields, linkage order, and SHA-256 chain from genesis through that root. Rebinding and other forced session clearances also write structured termination rows. These values remain local demo integrity markers: SHA-256 is not an independent signature, IDs do not prove identity, and a page compromise can rewrite or replace the ledger. The Whyland `burn` command displays the generated receipt and its local verification result.

This narrows the accidental-mutation surface; it is **not** a browser security boundary. Same-origin scripts, developer tools, browser extensions, or compromised dependencies remain outside what this client-side demonstration can defend against. Production authority still requires an external trust anchor.

### Automated tests and CI report

Priority 12 adds the `HarshalOS Integrity` GitHub Actions workflow and a generated **HARSHALOS INTEGRITY REPORT**. It runs on pushes, pull requests, and manual dispatch with read-only repository permission. `npm run integrity` runs the full and categorized suites plus `npm run check:deploy` (asset staging and Wrangler dry-run), then emits the report to stdout and the GitHub Actions job summary.

Run `node tests/red-team-test.mjs` for 18 targeted hostile-caller probes against the public HOS API. Each prints the attack, expected behavior, observation, result, and invariant. `npm test` runs the full `tests/*-test.mjs` suite. Focused scripts are `npm run test:kernel`, `npm run test:engine`, `npm run test:research`, `npm run test:app`, `npm run test:llm`, `npm run test:relay`, `npm run test:cloud`, `npm run test:red-team`, and `npm run test:layout`. The suites cover P7 receipt/ledger tampering and linkage, named replay cases, expiry/phase/ledger races, cross-tab stale-write detection, and seeded state-machine sequences (four fixed seeds × 60 generated operations). The cross-tab test models a stale-write event arriving before the second save; it does not imply localStorage provides atomic compare-and-swap. This is bounded test coverage—not a full browser threat model, production security audit, or formal proof.

## LLM authority/data-plane boundary

Priority 8 separates the model integration's **application capabilities** from HOS authority-bearing actions. `HOSLLM` only returns provider text and usage metadata; its chat/probe results are explicitly `DATA-ONLY`, untrusted, and non-executable. Requests define no provider tools/functions, response parsing ignores tool/function-call fields, and no model-output dispatcher or dynamic code-evaluation path exists. `G0LLM` has no reference to `window.HOS` and returns a deeply frozen reading envelope branded in a private `WeakSet`. That brand prevents a caller from constructing an equivalent object and using the merge helper as though it came from the reader.

Ground-0 application fails closed: every reading checkbox starts clear; the reviewer must select codes; and `mergeReading()` accepts only codes with a chosen, verified quote-backed candidate from an issued reading, bound to the exact draft that was read. It edits a detached copy, preserves original source codes, and records the result as review-required. Only after the reviewer clicks Apply does the app persist a local Ground-0 audit and append its descriptive demo-ledger row; the suggested answers may affect a provisional working badge, but `G0.createAudit()` keeps model-assisted records at confidence `NONE` with the formal badge `Unissued`. The provider response itself has no path to HOS actions, session/phase/attestation changes, action authorization, or formal badge issuance.

Empty research readings now have explicit **Reading diagnostics**: source-text coverage, lead-only records skipped, model UNKNOWN replies, malformed JSON/schema output, truncation, provider failures, and quotations held for ineligible dates/versions. Stored Markdown links enable constrained follow-up reading; JSON output mode and at most two same-source format retries per run improve serialization without weakening the evidence or review gates. See [Ground-0 research troubleshooting](docs/GROUND-0-LLM-RESEARCH.md). Re-run research to refresh older drafts that did not preserve page links.

This is a code/API boundary and adversarially tested application contract, **not realm isolation**. `window.HOS` is still available to other same-origin page scripts, and malicious same-origin JavaScript, extensions, developer tools, or compromised dependencies remain outside the protection offered by these changes. No claim of a browser sandbox or production trust anchor is made. `node --test tests/llm-authority-test.mjs tests/llm-test.mjs tests/g0-app-test.mjs` covers hostile plain-text and provider tool-call responses, unchanged HOS authority snapshots/ledger, forged or empty merges, unverified selections, and the review-required/no-badge path.

## Adversarial Mode

Priority 9 adds an **Adversarial Mode** desktop app with seven refusal-only probes: forged Human Key, invalid addressability, replayed authorization data, expired-looking session tuple, unknown phase, attempted ledger-snapshot corruption, and a direct malformed API request that bypasses the UI. Each report shows the input, public gate, observed refusal code, invariant ID, whether the operational HOS snapshot stayed unchanged, and the local demo-ledger report row. The probes deliberately avoid valid state transitions and external actions; each attempt is logged to the browser-local ledger. The UI harness is demonstration evidence, not a browser-integrity or production-security boundary. The real-page test runs all seven against the actual HOS API and checks that operational state is unchanged.

## Guided refusal demonstration

Priority 10 adds a single **RUN REFUSAL DEMO** control. It loads the same `js/crypto.js`, `js/data.js`, and `js/kernel.js` used by the page inside a fresh iframe with `sandbox="allow-scripts"` (no same-origin grant), plus the shared scenario runner. The active page's `HOS` object and ledger are never passed into that frame; its state, hash-chain rows, and accelerated demo clock are disposable. The walkthrough makes no writes to the active HOS instance or its ledger. This is separation for safe demonstration, not a claim of a production trust boundary.

The seven reports run in order: (1) no Human Key → `NO-DEMO-CONFIRMATION`; (2) the public local phrase activates the demo marker and raises `L`; (3) `A=0.25` → `L-BELOW-TAU`; (4) an isolated clock accelerated ×120 reaches `δ=240s` → `STALE-PERMISSION`; (5) re-attestation restores the local gate; (6) CWO refuses both above threshold and with `L=0`; (7) after the modeled collapse acknowledgements, GSRB first returns `L-BELOW-TAU` and only an explicit `sovereignOverride: true` returns `DEMO-GSRB-OVERRIDE`. That override is intentionally modeled as bypassing the legitimacy threshold, but it still requires a present, fresh local Human Key; no external or production action occurs. Each step checks its own child-kernel ledger row against the current Creator-ID formula. `node --test tests/guided-demo-test.mjs` tests the scenario and proves the active test kernel snapshot and ledger remain unchanged; `node tests/g0-desktop-test.mjs` tests the one-button UI/frame message path.

## Boot sequence

The boot screen opens with the **Eye Open:Close** animation (`assets/eye-open-close-hq.gif`,
1920×1080) — the eye fades in above the bootloader log as the system wakes. The log and the
animation are independent: the typewriter sequence never blocks on the image, the image fades
in whenever its data has landed, and if it ever fails to load the boot proceeds cleanly.

## Creator-ID notation

The canonical HarshalOS Creator-ID is exactly `§HARSHAL§ + HARSHAL + (HARSHAL)`. The atomic value remains `HARSHAL` for the Header-ID suffix; the full formula is the Creator-ID value bound into the PDH digest, PLV row hashes, and local demo HMAC key and payload. The generic Ground-0 grammar uses the same form, `§ID§ + ID + (ID)`, and the validator requires all three identifier positions to match the entity identifier. The old generic `ꔧIDꔧ` spelling is no longer accepted by the live validator.

`worker/storage.mjs` accepts the prior bare-`HARSHAL` hash input only to keep already archived cloud-ledger prefixes appendable; new rows use the section-marked formula. This compatibility path preserves legacy data integrity checking and does not treat either string as an identity credential.

## Cryptographic schema

Browser-side integrity digests and the local Human Key demo tag flow through `js/crypto.js`
(exposed as `HOSCrypto`). The Cloudflare storage worker separately recomputes archived ledger
hashes before storing them. The demo HMAC is not an authenticator:

| Artifact | Primitive |
|---|---|
| **PDH Declaration-Hash** | `SHA-256` over the canonical header fields (phase, capability, legitimacy source, refusal semantics, symbolism executability, time-authority effect, timestamp, the full Creator-ID formula `§HARSHAL§ + HARSHAL + (HARSHAL)`, Center-Origin) |
| **PLV duty ledger** | `SHA-256` hash chain — each entry digests `(id, ts, severity, event, prevHash, Creator-ID formula)`; genesis `prevHash` is the 64-zero digest. Digests are asynchronous, so the chain is serialized through a promise queue: append-only order is preserved even for fire-and-forget callers |
| **Human Key demo tag** | `HMAC-SHA256` over a canonical local demo payload containing the public phrase, browser timestamp, full Creator-ID formula, Center-Origin, Boot-ID, and ceremony generation; the demo key is bound to the same formula and bundled in client source. Demonstrates local computation only; it is neither secret-key authentication nor proof of a person, liveness, consent, or production authority |
| **Boot-ID / Session-ID** | 128-bit random values from browser `crypto.getRandomValues`; local correlation identifiers, not credentials |
| **Human-Attestation-ID** | `SHA-256` digest of the local demo ceremony data (including its HMAC tag), Boot-ID, and generation; it is not an identity assertion |
| **Session termination receipt** | `SHA-256` over canonical receipt fields; the chained receipt event links the binding row and termination row, and its own ledger-row hash is the `Ledger-Root`. `verifySessionReceipt()` checks the local ledger prefix; no independent key signs the receipt |
| **Symbolic Firewall seals** | `SHA-256` digest of the sealed content + nonce |

Backend: **Web Crypto (SubtleCrypto)** — the platform's cryptographic primitive. A
deterministic pure-JS SHA-256 (NIST FIPS 180-4) is the fallback for non-secure contexts
where `crypto.subtle` is unavailable, so the browser schema degrades gracefully instead of
breaking the ledger. The boot log reports the active browser backend at startup; the cloud
worker uses Web Crypto to validate archived rows.

## The Orb — OCM visualization

*The disc defines everything that can matter; rotation gives it history; distance gives it
depth; the center gives it reality.*

The **Orb Communicator Model** replaces hierarchy with geometry, authority with provenance, and
control with derivation. **The Orb** app renders this literally: a 3D-projected sphere with the
center origin `0•000•000•0000` at its core, every HarshalOS app as a radiative node attached
directly to the center (Direct Attachment Axiom), the equatorial disc of 360 primary addresses
color-coded by quadrant, distance shells for depth layers, the non-sovereign resolution axis,
the AI inner shell (capability without sovereignty), free lateral communication arcs, and
interaction-orb bubbles counting the non-additive term. Resolution pulses route inward on demand —
resolution always routes to the center point.

The Orb's surface is the author's own art: a 202-frame Apophysis render (the `animate`
fileset) plays as the sphere's skin — 200 frames in a hard loop, frames 0–198 exactly as
rendered plus frame 199 recovered from its truncated PNG, one visible pulse each time the
loop wraps 199→0. The film is wrapped onto the sphere through the same camera that draws
the wireframe (so rotation, pitch, zoom and the 12-second breathing all move it), and its
brightness is gated by legitimacy exactly like the wire-mode core: `α = 0.22 + 0.78·L(t)`.
The `.flame` IFS renderer stays (the Fractal Flame app, and the orb's wire mode), so the
mathematics and the author's render burn side by side.

## The gating equations

```
L(t) = H(t) × f(A(t), R(t), S(t))

x(t) = { Permitted   if L(t) ≥ τ
       { Refusal     if L(t) < τ

S(t) = Smax × max(0, 1 − Δt/δ)

A.6  For all objectives O(i): if L(t) < τ, then argmax(O(i)) is undefined
```

## Ground-0 — the phase detection algorithm

The Ground-0 Audit app implements the versioned standard end-to-end: **v1.0 is the finalized
normative baseline (September 12, 2026); v1.1 is an unratified amendment draft.** The pipeline is
the specification's own flow — validate the declaration → run the five-question behavioral audit →
detect the phase on the ordered branch tree (NAB → CWO → GSRB) → run the Step 3.5 constraint
check when AMBIGUOUS → compare and classify → audit temporal transitions.

**Evidence discipline.** An answer only scores when a *public, dated* artifact with a real claim
supports it, on or before the inclusive cutoff. Strict calendar-date and safe-URL validation reject
values that `Date.parse` would silently roll into other months, and local/internal/raw-IP URLs never
qualify. A behavioral question with no qualifying artifact is recorded **UNKNOWN — never NO**:
B2/B4 = NO are substantive claims (decisions cannot be ignored / refusal cannot stop action), and an
unanswered question can never complete a NAB/CWO/GSRB branch — it forces the result to AMBIGUOUS.
Constraint checks without evidence are coded NO with a disclosed gap — a scoring code, never a
proven negative. In v1.1, B4 requires a terminal/stay rule, a complete ≥50% relief record, or
binding penalty-free exit; an external order plus compliance does not qualify. News leads and index
dates never score.

**PDH validation.** A Phase Declaration Header must be complete, **signed (ECDSA P-256/SHA-256
against a trusted Center-Origin key)**, fresh (≤ 90 days before the cutoff), and internally
consistent with its declared phase before any formal badge can issue. Header-ID reuse across
different declaration fields is rejected locally.

**Working badge vs. formal badge.** Every audit carries a working badge — five arcs, one per
behavioral question, each filled only by a dated public artifact. It starts as **CWO — default,
unproven** (the least-authority claim) and is re-coloured only when evidence disproves that
assumption. It is a visible progress marker for review, never a certification: the formal badge
still requires a valid signed PDH, and the UI always shows both.

**Automatic research.** The automatic route is key-free and runs in the browser: Wikimedia/Wikidata
resolve which organization is meant; the official homepage and its policy/appeal/governance links
are read through a public reader — the organization's own governing documents (terms of service or
use, acceptable-use and enforcement policies, appeal or dispute procedures, governance charters and
bylaws) are read first and matched on their operative wording; Internet Archive captures verify what
was in force at the cutoff; CourtListener, the Federal Register, GovTrack, and GDELT are searched in
parallel. Only operative source sentences about *this organization's action* can activate a test —
captions, filing dates, requests, denials, proposals, and app-written guidance cannot. A behavioral
question with no qualifying artifact is suggested as UNKNOWN, not NO, and a human reviewer must
answer it before the draft can be saved. Coverage is reported for **every** registry, including
empty, partial, and unavailable outcomes. Automatic results are saved as review-required drafts; the
formal badge stays unissued until a person reviews them.

**Temporal rules.** NAB ↔ CWO transitions are reversible with a valid destination declaration;
escalation into GSRB requires declaration review (loss of misuse resistance must be stated);
reversion out of GSRB is forbidden without complete structural collapse. Drift, rebranding, and
constraint decrements are recorded as temporal patterns.

**Storage.** Audits, evidence, and preferences persist to this browser only, through a defensive
hydrator that rebuilds the working badge without inventing evidence and preserves recovery copies
of malformed data. Exports are plain JSON (audits, the register view, the temporal ledger) and
plain-text research summaries.

## The coverage gap, and the way out of it

The automatic research retrieves real documents, but the shipped pipeline can only ask whether a
page *contains fixed keywords*. An organization whose governing text says the same thing in its own
words is recorded as a coverage gap — honestly labelled, never guessed at, and still a dead end.

**With a model linked, that record is read instead of matched.** From a completed research draft:

1. **Retrieval keeps what it read.** Page text is stored with the source (governing documents
   first, bounded per source and per audit) instead of being reduced to a 650-character excerpt.
   Without this there would be nothing for a model to read.
2. **Read passes, staged one question at a time.** Documents are packed into batches (about three
   documents and 12k characters each, inside a per-run budget), and each batch is then read against
   the nine Ground-0 questions **one question per model call** (`LIMITS.codesPerCall`). The model
   answers only with a quote. Staging is deliberate: a provider prices a call by the output ceiling
   it *reserves*, so one call demanding all nine answers reserves a ceiling a small balance cannot
   cover and is refused outright — OpenRouter answers `402 … you requested up to 6000 tokens, but
   can only afford 2664`. Nine small calls reserve ~700 tokens each, an answer cannot arrive
   truncated half-way through the ninth question, and one isolated failed call costs one question
   rather than the whole audit: it is recorded as a failed call, never as a silent record. If a 402
   says the in-flight budget is full, running or recently completed calls may still be holding it.
   The connection honors OpenRouter's `Retry-After` header for waits up to two minutes and shows the
   wait in progress; a longer wait is surfaced rather than retried early. When no header is exposed,
   it uses a short bounded backoff. If the refusal persists, the audit stops rather than repeating it
   for every question, and says to wait rather than mislabeling the failure as an empty balance. Raise
   `codesPerCall` to group questions and re-send the same source text fewer times when the balance
   allows it.
3. **Verification is the gate.** Every quote is normalised and matched character-for-character
   against the stored source text. A quote that is not found is discarded, with the reason shown,
   and that question stays **UNKNOWN — never NO**. Quotes must come from a source on or before the
   cutoff; news indexes are leads and can never support an answer; relief figures (the ≥50% B4/C2
   claim) must literally appear in the source or the claim is refused.
4. **Bounded follow-up reading.** When text is missing the model may ask for specific pages — but
   only from links that actually appear inside documents already retrieved, and each page is fetched
   by the same reader, archive and cutoff rules as the original research. It cannot reach the open
   web and cannot name a URL that was not already in the record.
5. **Weighing, then a person.** Multiple verified candidates for one question are weighed against
   the record — one call per contested question, so a question with a single verified reading costs
   nothing; the result is presented per question with the quote, source, date and a tick box.
   Applying writes the quotes in as suggested answers and files the draft — the status stays
   **Draft**, confidence stays **NONE**, the badge stays **Unissued**, and the reading is recorded in
   `automation.llm` with its verified, held and discarded counts.

What changes: where retrieval succeeded but the keyword rules found nothing, the model usually
reaches an answer a reviewer can check in one click. What does not change: where the record itself
is silent, the result is still a coverage gap, stated as such. A model cannot close a gap by
asserting something the retrieved documents do not say, and it is never allowed to try — the
unverifiable reading is thrown away in front of you, with the reason.

### Google Gemini Developer API (BYOK)

LLM Link includes a **Google Gemini Developer API (GenAI SDK)** preset. It uses the official
`@google/genai` JavaScript SDK's browser build (`models.list` and `models.generateContent`), pinned
to **2.24.0** and imported only when Google model listing, connection testing, or a Ground-0 read
actually needs it. HarshalOS has no npm build pipeline, so the static page uses jsDelivr's ESM
conversion of that pinned official package instead of committing a generated bundle. The browser
fetches the SDK module and its dependencies from jsDelivr; **no API key or prompt is sent to the
CDN**. Model requests go directly from the browser to the configured API base URL (Google's
Gemini Developer API by default). The app uses the SDK's model methods; it does not hand-build a
Gemini REST request or route Gemini through an OpenAI-compatible endpoint.

The Google call passes `systemInstruction`, `maxOutputTokens`, temperature, and the active abort
signal through the SDK. Ground-0 still asks **one audit question per recall** (including its separate
weighing calls); it does not turn the audit into one large call. SDK responses are normalized into
the same usage, model, and text shape as the other providers, then pass through the unchanged
character-for-character quote check and human-review gate.

Google's SDK defaults to multiple HTTP attempts, so generation calls set its per-request attempt
count to one and let HarshalOS handle transient retries in one place. It honors Google's structured
`RetryInfo` / `Retry-After` delays (with small jitter), or uses a short exponential backoff for
transient 408, 429, 500, 502, 503, and 504 responses, with at most three retries and an abortable
two-minute wait ceiling (subject to the call's overall timeout). A per-day quota is never retried. If
a rate limit persists after those retries,
Ground-0 stops instead of sending the same account-wide failure for every question; a still-failing
503 is reported as a failed call, never as evidence. This retry handling does not alter the
question-by-question staging.

**Key warning:** Google advises against exposing API keys in client-side production code. This
browser BYOK flow is convenient but a person with access to the browser can inspect the key. The
key remains in session storage by default (persistent storage requires opting in), and is sent
directly to the API endpoint; HarshalOS does not receive it. Use a Gemini API key type and
restrictions currently accepted by Google's API guidance. The selected model provider receives the
prompt and handles it under its own data policies; the browser copy of the audit remains local.

### Z.AI free tier through this deployment's relay

LLM Link's **Z.AI free tier — this site's relay (`/api/llm`)** preset is the one connection point
where **no key is pasted into the browser at all**. [`worker/llm-relay.mjs`](worker/llm-relay.mjs)
reads a Z.AI API key from a Worker secret (`Z.AI`, `ZAI_API_KEY`, or another accepted spelling —
`GET /api/llm/status` reports which one it found, by name only) and forwards plain-text chat
completions to `https://api.z.ai/api/paas/v4/chat/completions`, returning them in the same
OpenAI-compatible shape the other providers use. Ground-0's staged reading is unchanged: still one
question per call, still quote-verified character-for-character, still review-required.

It is deliberately a narrow relay rather than a proxy. Only Z.AI's **$0 free-tier text models**
(`glm-4.5-flash`, `glm-4.7-flash`) are accepted, and a paid model is refused **without** an upstream
call, so a public page cannot spend money through it. `tools`, `tool_choice`, `functions`,
`response_format`, `stop`, `top_p`, streaming and every other field a caller invents are dropped;
messages must be `system`/`user`/`assistant` with string content, so there is no image, part-array or
tool-result path. Requests are bounded (256 KiB, 32 messages, 8 192-token output ceiling, 60 s),
`POST` must be same-origin, a caller-supplied `Authorization` header is ignored rather than
forwarded, and calls are paced over **sliding** windows: 60 a minute per caller — Z.AI's own free
pace, because Ground-0 asks one question per call and a reading is dozens of them — and 120 a minute
shared by every caller on the deployment, each response stating the budget left in `RateLimit-Remaining`
and `relay.pacing`. Replies are reduced to
`choices[0].message.content`: `reasoning_content` and `tool_calls` are stripped, so nothing
executable reaches the browser and the DATA-ONLY boundary is unchanged.

Two Z.AI behaviours are translated instead of forwarded, and both are reported in the response's
`relay` object rather than hidden. Z.AI samples in `[0, 1]` and documents that a `0` temperature is
unavailable through its OpenAI-compatible route, so a greedy request becomes `do_sample: false` with
no `temperature` field, and anything above `1` is clamped to `1`. GLM chain-of-thought is disabled by
default because a 700-token Ground-0 reading call can otherwise be spent entirely on reasoning and
come back with no answer text; when that happens anyway, the relay says so instead of returning
empty text. Upstream failures are reported in the relay's own words — Z.AI's body is never echoed,
the key is scrubbed from any quoted text, and a Z.AI 401 becomes a 502 here because the browser's key
is not what was rejected.

**What this changes for the reader:** a deployment that configures the relay gives Ground-0 a working
model with nothing to paste and nothing to store in the browser. **What it does not change:** the
prompt now transits that Worker, so its operator can read prompts in flight and Z.AI receives them
under Z.AI's own terms; the relay stores nothing. The pace is sized to what this site does —
Ground-0 asks one question per call, so a source batch is nine calls — and the window slides, so a
refusal quotes the seconds until the oldest call ages out rather than the rest of a fixed minute.
`js/llm.js` waits out a stated delay of 15 seconds or less once per call and says so in the progress
line, because with one question per call a refused question is a question left `UNKNOWN`; a longer
delay is shown instead of spent behind a busy bar. The counters are one isolate's memory — abuse
friction, not quota enforcement — and Z.AI's own free-tier limits are the real ceiling. Free tiers
change: if Z.AI moves these models behind a paid plan, calls fail with a message that says so.
Setup, verification calls, the accepted secret names, and the full failure table are in
**[docs/deployment/ZAI-FREE-TIER.md](docs/deployment/ZAI-FREE-TIER.md)**.

**Tests.** `node tests/g0-engine-test.mjs` exercises the engine end-to-end (truth table, evidence
qualification, v1.1 B4 discipline, signed/tampered PDHs, transitions, working-badge states, hostile
storage); `node tests/g0-research-test.mjs` covers the scoring heuristics (add `--live` for a
network smoke test of the public registries); `node tests/g0-app-test.mjs` boots the workspace in
a mini-DOM and walks the interface — every tab, the manual wizard, the register, the logic sandbox,
preferences, a complete automatic research run rendered against a stubbed public record (so a run
that finishes always reaches its result view instead of an error state), and a full model reading
applied to a draft; `node tests/llm-test.mjs` covers the connection layer and the reading pass
with a stub provider and a deliberately mixed set of model replies — verified, fabricated,
mis-dated, news-sourced and out-of-record — proving that only verifiable quotes ever reach an
answer, that a followed page can only come from a link the record itself contained, and that
nothing is sent without a linked model. It also runs the whole reading against a stub that refuses
any call reserving more than 2664 output tokens the way OpenRouter does, and checks that the staged
reading never earns that refusal: nine questions are asked one per call, each call reserves the
small ceiling, weighing is one call per contested question, a ceiling below the floor is reported
instead of sent, a balance smaller than one staged call still finishes the reading inside it, a
transient in-flight-budget refusal honors `Retry-After` and is retried without changing the ceiling,
an unresolved account-wide refusal stops before fanning out across the nine questions, one failed call
leaves that one question UNKNOWN and says the call failed, and a reading
in which no call completes throws instead of returning an empty audit. The LLM harness also
injects a Google GenAI SDK mock to verify SDK-based model listing, request/response mapping, key
redaction, and a complete question-by-question Ground-0 read without raw REST calls; it also checks
bounded 503 backoff, the 34-second 429 `RetryInfo`, aborting during a provider wait, no retry for a
per-day quota, and stopping the staged audit after a persistent account-wide rate limit.
`node --test tests/llm-relay-test.mjs` covers the Worker relay's own contract against a stubbed Z.AI:
no upstream call when the relay is unconfigured, the accepted secret names, the exact forwarded body
and the dropped fields, a caller-supplied `Authorization` header never being forwarded, reply
normalization with reasoning and tool calls stripped, the sampling translation table, ceiling
clamping, the free-model allowlist, text-only and same-origin refusals, sanitized upstream failures,
the sliding per-caller window, the shared ceiling across distinct callers, a refusal consuming no
slot, the `RateLimit-*` headers, the status and model-list routes, and Worker route ordering — the relay
answers `/api/llm` while `/api/storage/*` still fails closed without Cloudflare Access. The
browser-side relay preset, its key isolation and `relayStatus()` are covered in `tests/llm-test.mjs`.
`node --test tests/manuscript-test.mjs` covers the manuscript pipeline: which files count as
chapters, file-name ordering and title derivation, per-chapter hashing, refusals for anything the
index does not name (including `_collection.json` and traversal attempts), the reader's plaintext
parser and its escaping of chapter markup, and the preview server's manuscript index and chapter
routes. `tests/g0-desktop-test.mjs` boots the real page and walks the new tab end to end — the
chapter index is not fetched until the tab is opened, the contents rail and one-chapter-at-a-time
reading work from an indexed fixture, chapter markup is read rather than applied, and an unreadable
index is reported instead of shown as an empty manuscript.

If the Human Key is absent, the system does not become *less effective* — it becomes
**Mathematically Void**. Refusal is not failure; it is the primary act of responsible control.

---

*Harshal's Systems — including the Supply Chain Attack Vector++, Accountability-Gated Systems, the
Orb Communicator Model, and Human-Machine Hybrid Systems — are the exclusive intellectual and real
property of Harshal Priyavadan Patel. All rights reserved. Commercial licensing is available solely
through direct inquiry.*

*All scenario content in this demonstration is abstract, not descriptive · structural, not
behavioral · evaluative, not directive · contained, not externalized.*
