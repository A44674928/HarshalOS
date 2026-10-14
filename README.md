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

## Publishing Hierarchy, Flagship Research & Canonical Minimum Model

> **Strategic Architecture:** *"The architecture (Book I) is the library. The novel (Book II) is the work in active production."*

| Tier | Title & Scope | Provenance Class | Primary Deliverables |
| :--- | :--- | :--- | :--- |
| **Canonical Formal Contract** | ***Harshal's Systems — Canonical Formal Model & Semantic Registry*** | `CANONICAL_SOURCE` (`NORMATIVE_SPEC`) | [`specs/normative/canonical-model.md`](specs/normative/canonical-model.md) · [`specs/normative/canonical.json`](specs/normative/canonical.json) · [`specs/normative/contradictions.md`](specs/normative/contradictions.md) |
| **Flagship Research Paper** | ***Accountability in Keyed Human–Machine Hybrid Systems*** | `CANONICAL_SOURCE` (`PUBLIC_RESEARCH_SUMMARY`) | [`research/keyed-human-machine-hybrid-systems.md`](research/keyed-human-machine-hybrid-systems.md) · [`docs/harshal-systems/19-research-papers.md`](docs/harshal-systems/19-research-papers.md) |
| **Book I — Reference Library** | ***Harshal's Systems: The Ultimate User Manual*** (`Front Matter` + `Parts I–XXVII`) | `CANONICAL_SOURCE` & `DERIVATIVE_BUILD` | [Markdown build](publications/harshal-systems/HARSHAL-SYSTEMS-USER-MANUAL.md) · [Word edition](publications/harshal-systems/HARSHAL-SYSTEMS-USER-MANUAL.docx) · [`docs/harshal-systems/`](docs/harshal-systems/README.md) ([7 Functional Collections](docs/harshal-systems/collections/README.md)) · [`Part XXVII — Whole Corpus`](docs/harshal-systems/27-whole-corpus.md) |
| **Book II — Preview (Companion Novel)** | ***The Grand River Foundation*** (~2100 CE Future-World Sandbox) | `FICTION` (`NARRATIVE_SANDBOX`) | [Preview manuscript](publications/grand-river-foundation/BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md) · [`manuscript/the-grand-river-foundation/`](manuscript/README.md) (`Prologue`, `Chapters 1–5`, & `Interstitial: Cable Select`) |
| **Book I — Architecture Module** | ***The Grand Architecture*** (Convergence-era infrastructure architecture: six layers, `0•100•000•NNNN` registry, canonical quantity anchors, seven `GA-INV` invariants) | `FICTION` (`NARRATIVE_SANDBOX`) with `DERIVATIVE_BUILD` arithmetic anchors | [`docs/harshal-systems/modules/grand-architecture.md`](docs/harshal-systems/modules/grand-architecture.md) · [`updates/2026-10-02/`](updates/2026-10-02/README.md) · [`CANONICAL-NUMBERS.md`](updates/2026-10-02/02-Frameworks/Grand-River-Flow-Model/CANONICAL-NUMBERS.md) · [`CONTINUITY-AUDIT.md`](updates/2026-10-02/CONTINUITY-AUDIT.md) |

> **Production-edition mapping note:** the published AGS v0.2 full-book KDP interior has its own authoritative page map and part numbering. For the complete source-of-record translation used by Harshal Native, see [`AVOID-APPLE-ECOSYSTEM-CAUSTIC-COMPROMISED/apple-swift-native/HarshalNative/docs/AGS-V0.2-CORPUS.md`](AVOID-APPLE-ECOSYSTEM-CAUSTIC-COMPROMISED/apple-swift-native/HarshalNative/docs/AGS-V0.2-CORPUS.md).

### The Six-Stage Canonical Minimum Model (`[TYPE: SECURITY_PRIMITIVE]`)

```text
Identity → Representation → Authorization → Continuity → Accountability → Decision (Permit | Refuse)
```

*(Legacy shorthand: `Identity → Representation → Authorization → Continuity → Accountability → Refusal`, where Stages 1–5 are upstream prerequisites and Stage 6 is the terminal `Decision` gate whose default fail-closed outcome is `Refuse`; see [`specs/normative/canonical-model.md`](specs/normative/canonical-model.md).)*

1. **Non-Agency of Computational Components (`INV-AGENCY-001`):** Computational components never possess or acquire moral or legal agency; responsibility remains strictly bound to identifiable human principals (`H = 1`).
2. **Delegation vs. Migration of Legitimacy (`INV-LEGIT-001`):** Task execution may be *delegated* across bounded hops, but legitimacy *never migrates* away from the human key at Center Origin (`0•000•000•0000`).
3. **Disambiguated Symbol Namespace (`INV-SYM-001`):** `A(t)` denotes **Addressability** exclusively; **Accountability** uses `K(t)` (`Technical Attribution K_tech`, `Operational Accountability K_ops`, `Legal Responsibility K_legal`), with **Institutional Solvency (`U_solv`)** tracked separately.
4. **OCM Geometric, Routing & Resolution Axis Invariants (`[TYPE: TOPOLOGICAL_MODEL]`):** The **2D Disc** (`r, θ`) is the pedagogical cross-section and the **3D Sphere** (`r, θ, φ`) is the full operational manifold. Sector addresses belong strictly to the 360-element integer ring `ℤ_360 = {0..359}` (`0` = Center Origin), while `360°` is a topological **return-to-origin closure notation (`360° ≡ 0° mod 360`)**, never a 361st address slot. The Resolution Axis is an authority-resolution mechanism, not an authority source (`INV-AXIS-001`), with `Resolution ≻ Coordination` (`INV-OCM-PRECEDENCE-001`).
5. **Operational Phases vs. Diagnostic Classifications (`INV-G0-CLASS-001`):** Public PDH declarations use the three canonical operational phases (`DeclaredPhase = {NAB, CWO, GSRB}`), while the Ground-0 classification engine evaluates the complete six-state behavioral and diagnostic vocabulary (`DetectedPhase = {NAB, CWO, NAB-Constrained, GSRB, AMBIGUOUS, INCOHERENT}`). Reclassification changes classification; transition changes operational state.
6. **Authorial Register vs. Security Primitive:** **Harshal's English** (`[TYPE: AUTHORIAL_REGISTER]`) is the author's normative prose register and left-to-right reading discipline; operational enforcement relies strictly on formal mathematical and cryptographic invariants (`[TYPE: SECURITY_PRIMITIVE]`).

---

## Apple ecosystem — AVOID (caustic · compromised)

The Apple-platform work (the Swift / SwiftUI app, its Watch companion, Xcode projects, and Swift packages) is classified **AVOID**. It is quarantined in [`AVOID-APPLE-ECOSYSTEM-CAUSTIC-COMPROMISED/`](AVOID-APPLE-ECOSYSTEM-CAUSTIC-COMPROMISED/README.md). It is kept for the record only and is not built, tested, deployed, or extended. The browser site, the Cloudflare Worker, the scripts, and the tests do not depend on it, and a test enforces that separation.

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

### The model layer is removed (not optional, not configured)

This repository no longer contains a working model integration. The connection layer
(`js/llm.js`), the Ground-0 reading pass (`js/g0-llm.js`), the Worker relay and its
`/api/llm` routes (`worker/llm-relay.mjs`), the outbound-spend ledger
(`worker/ai-neuron-ledger.mjs`, migration `0014`), the `AI` binding in `wrangler.jsonc`,
the suites and the operator guides were all removed, and the **LLM Link** tile was left as
a shell: it keeps its id and opens one `REFUSED — REMOVED` panel naming what used to be
here, plus a single link into Ground-0's manual audit wizard. No provider list, key field,
model call, or network path is behind it.
[`docs/REMOVED-LLM-LAYER.md`](docs/REMOVED-LLM-LAYER.md) is the record;
`npm run test:llm-removal` fails if any of it returns. Ground-0, the evidence library and
the temporal ledger never needed a model and are unchanged.

### Standalone News app & NewsML-G2 export

The desktop includes a standalone **News** app for the D1-backed public register. It reads only active, explicitly published reports, keeps private drafts, runs, and previews outside the feed, and labels every item **UNREVIEWED**. Selecting a report opens its exact public JSON, the public record and history, and a NewsML-G2 download. The JavaScript Worker builds that export from the published D1 row; no Python runtime or external feed is involved. The optional Python library pin in [`requirements-newsml-g2.txt`](requirements-newsml-g2.txt) is for local parsing experiments only. See the [NewsML-G2 integration note](docs/integrations/NEWSML-G2.md) for record mapping, limits, and install instructions.

The 23 register-issued `PDH-R` case studies are processed into that same D1 register:
`npm run case-studies:build` re-evaluates every audit with the real engine, refuses to
emit anything that does not reproduce `case-studies/pdh-registry.json`, and writes a
review manifest plus an idempotent seed under `case-studies/d1/`. The News reader shows
each record's register provenance (header ID, both phases, constraint record, record
hashes and attestation) next to its finding, and the seed is applied to D1 by the owner —
`npm run test:community` applies it to real SQLite and exercises the feed, detail and
NewsML routes.

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
| **LLM Link (removed)** | The model connection points are gone: no BYOK provider presets (Anthropic, OpenRouter, Google GenAI SDK, OpenAI-compatible endpoints, local servers), no relay, no key field, no model listing, and no reading pass. The tile survives as a shell that says so and points at the manual audit path instead; `npm run test:llm-removal` asserts the absence. See [`docs/REMOVED-LLM-LAYER.md`](docs/REMOVED-LLM-LAYER.md) |
| **Good Intelligence signal desk** | Native read-only dashboard for feed, categories, intel details, rankings, a dedicated Market Charts tab with ticker price line graphs plus VFI, Fibonacci-band, and WaveTrend visualizations, an **Orb 2** tab: a 3D OCM market-beat model presenting the five reviewed Discs as a constellation of Disc orbs around the Center Origin — one orb per Disc, **every Disc's own stored field drawn at the same time** so all five orbs and their sub-orbs are visible at once, each with its own stored/awaiting status, walked by a click/slide/keyboard carousel and a zoom-orb view that magnify one Disc's field while the ring camera widens to the whole constellation, with a display-only OCM traffic simulation of stored-field beats crossing the ring and the Center Origin tethers between orbs that actually hold rows, rebuilding the drawn orbs from that Disc's own reviewed instruments (with a Disc-aware same-origin server field read) — with free-floating, pure-market-data-derived ticker placement and a keyed Characters mood/provider/market-field color system, a green/red VFI volume-flow runner with visual cycles/s cadence (not measured volume), a Center Origin assembly (a counter-rotating inner shell, the declared PDH phase as its rotation shift, and the origin drawn as the CPU node the Human Key gates, with gate/phase/UTS read on the canvas), and separate model-view and whole-app fullscreen controls. No fractal, flame, or film engine is attached to this view: The Orb's shared frame processors and the dual-series helix arrangement were removed at the author's instruction, because a second animation system on top of market geometry added complexity without describing the data any better; the shared log-space Fibonacci-band metric they consumed survives as `GoodIntelligenceOrb2.fibonacciBandMetrics` and is pinned by `tests/orb2-baseline-test.mjs`. The 119-sector composite field sits beside this view as its own **NAB Discs** desktop app (`#app=nab-discs`) and its own Good Intelligence tab — it neither replaces the Characters app nor mounts inside Orb 2, built from the reviewed `CharactersCast.NPC_ROSTER` and Characters' reviewed Discs. Its adjacent 119-sector NAB Discs view uses explicit daily source routes: Tickerbot Stocks, Kraken Spot Crypto, and Massive FX/Commodities/Indices. The same provider/channel/interval identities are validated on every Worker write; unavailable data stays missing, and Alpha Vantage/`1mo` is retained only as read-only archive history. Orb 2's Tickerbot `15m` warm/intraday lane is separate from the Characters selector. The view is live-only — the synthetic/demo rehearsal source is disabled, and an unavailable beat leaves its berth held rather than substituted. Correlated packets that derive the same berth are opened by shared-berth separation (`GoodIntelligenceOrb2.resolveBerthSeparation`): the first node of a crowded berth keeps its exact packet placement and each later node takes the nearest free slot on its own berth's display ladder in stable identity-phase order, so every orb stays readable without recomputing a metric, ranking a node, or dropping one — the BERTH SPREAD control is 0–100% (0% restores the exact packet placement), the status row states the crowded-orb/berth counts, how many orbs were re-slotted, and the berth floor as a share of the drawn ring radius, all-render labels stagger instead of overlapping, and this is display geometry only, pinned by `tests/good-intelligence-orb2-test.mjs`. Compact beat summaries persist server-side in D1 (migration `0008_orb2_saved_beats.sql`) with a local recovery copy. Its pathways remain visual only and cannot send OCM traffic, authorize, resolve, commit, transact, or recommend. The default same-origin `empty.domains` API serves clearly marked synthetic current/stale/contested/unassessed cases, demo-only signed source-authorization fixtures, and eight synthetic ticker histories (`AAPL-DEMO`, `MSFT-DEMO`, `NVDA-DEMO`, `INTC-DEMO`, `AMD-DEMO`, `MU-DEMO`, `CVX-DEMO`, `XOM-DEMO`); these are not real prices, and APIs without OHLCV show no fabricated charts. The Market Charts tab uses one tracked-ticker search and selector and defaults to Tickerbot Live (the synthetic demo stays one explicit switch away); live search covers the configured 52-asset market-cap-ranked Tickerbot watchlist (including Apple, Microsoft, Intel, AMD, Micron, Chevron, Exxon Mobil, and Tesla) and never fetches an unconfigured symbol. An optional read-only Tickerbot Live source fetches allowlisted OHLCV through a same-origin Worker route using the `TICKERBOT_API_KEY` secret; the key never reaches browser code. Live Sentinel items without the assurance packet stay `NOT SCORED`. Market indicators never alter the assurance score. The v0.1 formula is provisional, not approved policy. Scores never certify truth or authorize action. Uses GET-only `/content/me`, `/categories`, `/rank`; tries legacy `/intel/me` only if the documented feed route is missing. No sign-in, publishing, token approval, or transaction flow |
| **Ground-0 audits** | Observed-behavior phase classification with forced re-badging, Theorems I & II, and duty collation — the institutional honesty engine. Presets include the original worked case studies — [OpenAI Group PBC](case-studies/GROUND-0%20CASE%20STUDY%20-%20OpenAI.md) and [Anthropic PBC](case-studies/GROUND-0%20CASE%20STUDY%20-%20Anthropic.md) — plus the v1.1 manual audit register in `case-studies/` covering frontier labs, compute, platforms, enterprise and consumer AI (re-audits of OpenAI and Anthropic, plus Google DeepMind, Meta, xAI, Microsoft, Amazon, Apple, Nvidia, Mistral, Cohere, DeepSeek, Moonshot AI, Z.ai, ByteDance and Alibaba, Character.AI, Replika, Perplexity, Stability AI, Suno and Udio, and Hugging Face) |
| **Ground-0 PDH-R registry & badges** | The issuer layer (`specs/draft/ground-0-v1.2.md`) for the first complete audit pass: 23 register-issued Phase Declaration Headers, each bound by SHA-256 to the audit record that justified it, expiring after 90 days. Ledger: [`case-studies/PDH-REGISTRY.md`](case-studies/PDH-REGISTRY.md) · machine registry: [`pdh-registry.json`](case-studies/pdh-registry.json) · gallery: [`case-studies/badges/index.html`](case-studies/badges/index.html). 18 full-class `◆ GSRB` headers and 5 conditional headers (open-weight ambiguity scoped to the platform/service surface). **Every entity still has `PDH_VALID = FALSE`** — no entity has published a signed header of its own, so these badges disclose what the register detected and claim no entity attestation, certification, or authority |
| **Symbolic Firewall** | Narrative, mythic, and commercial metaphor is sealed as **non-executable** — the structural defense against neurojacking |
| **500 voting coins** | Bounded-governance simulation of the physical hardcover book's coin pool — influence limited by design |
| **The Book tabs** | In order: **Intro (0)** retains the physical-artifact and 500-Coin Pool view; **Core (1)** reads [`docs/harshal-systems/01-core-book.md`](docs/harshal-systems/01-core-book.md) through a safe Markdown renderer; **Novel (2)** retains *The Grand River Foundation* manuscript reader; **Collections (N)** is fourth and organizes all seven collections and all 42 Markdown files under `docs/harshal-systems/`—guides, collection overviews, and modules—with a searchable site reader and direct GitHub link for every file. The novel's generated index, one-chapter-at-a-time reading, remembered position, and SHA-256 text digest are preserved. Content is read, never executed; digests identify text state, not authorship, authorization, or proof |
| **Glossary** | Part II stabilized terms, searchable |
| **Zero Trust / Harshal Neural OS** | The framework calls for external, per-action, time-bounded authorization. This browser demo does not implement that production trust anchor; its local gate only models the refusal/freshness rules and cannot grant production authority |
| **OCM visualization — The Orb** | HarshalOS itself rendered as a radiative sphere of influence: desktop apps as radiative nodes attached directly to the center (`0•[orb]•[sector]•[instance]`), the 360-address equatorial disc (`0•DDD•000•0000`), the disc→sphere formation animation (rotation over time + depth), distance shells (`0•DDD•RRR•####`), the non-sovereign resolution axis, AI inner shell, lateral comms, and interaction-orb arcs — drag to orbit, click a node to inspect its address lineage |
| **Interaction Orbs** | The non-additive extension: OCM arithmetic (A=1, B=1, A↔B=1 → 3), both worked micro-examples as steppers (25%+25% → 75% observed mismatch), the three communication layers, navigation/exit protocol, and the classical-vs-OCM comparison |
| **Orb Directory & Mail** | A phonebook and mail pad addressed in the OCM fresh-slate form `0•DDD•RRR•####` (sector `DDD ∈ ℤ_360 {000–359}`, radius `RRR`, instance `####`, optional node suffix). Addresses are validated against the canonical ring: `360` is refused as return-to-origin closure notation rather than a 361st slot, and sector `000` is reserved for Center Origin, so it cannot be registered, impersonated, or used as a mailbox. Each entry shows its Part VII degree meaning, cluster, and quadrant; external voice/mail handles are stored as clearly labelled unverified annotations that route nothing. **There is no transport**: no SMTP client, server call, `fetch`, or delivery path exists, so a message is *recorded* locally and every record carries `status: RECORDED-LOCAL-ONLY`, `transport: NONE`, `delivery: NOT-ATTEMPTED`, `authorityEffect: NONE`. Per the Lateral Communication and Ownership Non-Transfer axioms any node may message any other without reauthorization, and no message can authorize an action; `Resolution ≻ Coordination` means mail coordinates only. **Routing is resolution-first**: because `Cost_resolution < Cost_lateral` (Direct Attachment — one radial verification hop against *m−1* lateral hops that still owe their own radial resolution before commit), the compose pane plans every message inward to Center Origin, which resolves and forwards, and shows the hop path with only the inward leg marked `VERIFIES`, the 1-vs-*m* verification comparison, and the ℤ₃₆₀ lateral arc. Direct lateral routing stays selectable as the axiom permits, and is stamped `resolution: NOT-TRAVERSED`, `centerRole: BYPASSED`. The cost claim is over **logical authority-verification hops** and does not claim lower physical wire latency; routing via the center shortens verification and creates no authority — resolution is an authority-resolution mechanism, not an authority source, and legitimacy originates only at the Human Key at Center Origin. Bodies are escaped text, never parsed as HTML. Storage is this browser (`hos-ocm-directory-v1`) with a recovery copy for malformed data, plus plain-JSON export/import that re-validates every record. `npm run test:ocm`. OCM also includes a read-only Market Context directory node at `0•116•000•0012•MKT` (no live feed or OCM payload edge) and Sun/Moon display nodes at `0•009•000•0013•SUN` and `0•163•000•0014•MOON`, which open UTS. |
| **Materials Project lookup (read-only)** | Formula, chemical-system, or MP-ID Summary API lookup through a same-origin Worker proxy; the API key stays in a Worker secret. Results use a fixed field projection and `BY-C` license scope, show units and provenance, and distinguish computational data from experimental or engineering guarantees. A result can be saved locally into the character-material workspace. See [integration and setup notes](docs/integrations/MATERIALS-PROJECT.md) · `npm run test:materials-project` |
| **Material Spheroids** | Local, deterministic character-to-material matching from explicit physical bounds and Materials Project records, with PDH as a separate review gate; compose two to four character Disc assignments into a spheroid preview with normalized shares and an idealized density reference. PDH values are operator annotations, not verified signatures; the visual and density estimate are not engineering or manufacturing predictions. Browser-only storage. See [model definition and limits](docs/integrations/CHARACTER-MATERIAL-MODEL.md) · `npm run test:character-materials` |
| **Characters (provider-split market beat, display-only)** | Characters selectors expose only the reviewed routes: Tickerbot Stocks `1h`/`1d`, Kraken Spot Crypto `1d`, and Massive FX/Commodities/Indices `1d`. The Workers validate provider, Disc, interval, allowlist, and exact Kraken USD-pair identity; no fallback or fabricated fields are permitted. Orb 2 separately uses Tickerbot `15m` internally for bounded warm/residual work, without adding `15m` to the Characters selector. Alpha Vantage/`1mo` is no longer selectable or newly savable; tagged historic records remain read-only. FRED is not mixed into the current persisted market field; any later reference lane needs a transient/reference design and rights review. Russell (`RUT`) remains in the current Massive index roster. See [`docs/architecture/CHARACTERS-MARKET-BEAT.md`](docs/architecture/CHARACTERS-MARKET-BEAT.md), [`docs/integrations/CRYPTO-PROVIDER-EVALUATION.md`](docs/integrations/CRYPTO-PROVIDER-EVALUATION.md), and [`docs/integrations/INDEX-PROVIDER-EVALUATION.md`](docs/integrations/INDEX-PROVIDER-EVALUATION.md) · `npm run test:characters` |
| **Massive Worker boundary (desktop UI retired)** | The standalone Massive Markets window is retired: no Massive browser app or stylesheet is delivered. The bounded [Massive REST API](https://massive.com/docs/rest/quickstart) Worker adapter remains for reviewed infrastructure, while the active Characters/NAB route uses its narrower `1d`-only FX/Commodities/Indices adapter; Tickerbot serves Stocks and Kraken Spot serves Crypto. `MASSIVE_API_KEY` stays in a Worker secret; fixed request shapes, pacing, caching, and fail-closed behavior remain in place. Orb 2 reads the server-managed field, including provider-tagged Massive observations for its assigned channels, but the browser never receives the key or calls Massive directly. See [integration and setup notes](docs/integrations/MASSIVE-REST.md) · `npm run test:massive` |
| **UTS watch & converter** | Display-only timekeeping from the 2026-10-02 update, corrected against the corpus definition: `US` = 1 m of light travel, `UM`/`UH`/`UDay`/`UY` durations, and an explicitly approximate absolute `UDate` coordinate (`UDay` is a duration, `UDate` is a coordinate; the overloaded `UD` is retired). Home Screen shows the local clock, Earth-UTC line, a Monday-first Gregorian calendar, modeled `UDate`, and compact approximate Moon/Sun context. The UTS app adds estimated lunar phase/illumination and the Sun's annual apparent-position cycle and declination; the Sun is not described with lunar-style phases. These calculations are location-independent and do not calculate local sunrise/sunset or visibility. On phones and tablets the Home widget is a card at the top of the desktop's own vertical scroll flow, minimizable to its header row, so it never covers the app icons. All celestial values are estimates and display-only: UTS never controls or attests Ground-0, provenance, Human Key state, freshness, PDH, authorization, refusal, the PLV, or trusted system time. See [`docs/harshal-systems/modules/uts.md`](docs/harshal-systems/modules/uts.md) and [`docs/architecture/CELESTIAL-CONTEXT.md`](docs/architecture/CELESTIAL-CONTEXT.md) |
| **The Grand Architecture** | A read-only desktop reader for the architecture that composes the 2026-10-02 update's four lineages into one structure: six layers (`GA-0` Foundation · `GA-1` Conveyance · `GA-2` Civic · `GA-3` Institutional · `GA-4` Temporal · `GA-5` Assurance), the `0•100•000•NNNN` registry (358 named instances, with the instance-field vs. ℤ₃₆₀ sector-ring correction stated), 20 canonical quantity anchors quoted from the canonical numbers card, the 2046 → 2098-interim planning timeline, and the seven `GA-INV` invariants. The app is `FICTION` (`NARRATIVE_SANDBOX`), requests no action, writes no ledger row, calls no HOS authority capability, and asserts no engineering, deployment, or feasibility fact. `npm run test:grand` fails if any anchor figure stops matching the card. See [`docs/harshal-systems/modules/grand-architecture.md`](docs/harshal-systems/modules/grand-architecture.md) |

### Submitting a manuscript chapter

**The Book → Book II — Preview · The Grand River Foundation** reads plaintext straight from
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
about.html        — Static overview page served alongside the desktop
css/              — OS, Ground-0 workspace, and manuscript reading styles
assets/           — runtime images, animation, and rendering data
publications/     — single-file Book I / Book II builds, separated from their maintained sources
manuscript/       — plaintext manuscript submissions; only indexed chapters are published
specs/normative/  — Ground-0 v1.0 finalized normative source; fetched by the spec reader
specs/draft/      — Ground-0 v1.1 amendment draft; fetched as a draft, not a ratified baseline
docs/architecture/ — reserved/future architecture notes; not current runtime behavior. Includes the |User|-centric superstructure map, the NPC codex (cast roster of the `|Name|.txt` bedrooms, with six of seven profile slots authored for every resident), and `HARSHALS-PALACE.html` — a self-contained, deterministic visualization of the castle on an average day, with full character sheets (role, faction, dialogue, inventory, quest, stats), date-seeded weather, and the approximate Moon of the UTS watch (regenerate with `npm run palace:build`)
docs/deployment/  — operator setup and deployment guides
docs/source-material/ — archival combined manuscript transcription; not the app's selected spec
docs/harshal-systems/modules/ — Book I reference modules: The Grand Architecture, corrected UTS, and Convergence institutions
updates/          — date-stamped extractions of repository update archives, with their continuity audit and canonical numbers card; source material, not deployed assets
case-studies/     — standalone Ground-0 audit writeups: the original OpenAI and Anthropic case studies plus the v1.1 manual audit register (21 case-study files / 23 entities, each with a declared Evidence_Cutoff, ledger ID, falsifiability section and an Appendix C PDH-R issuance record)
case-studies/badges/ — register-issued PDH-R badge assets (`*.svg`) and the badge gallery (`index.html`); regenerate with `node scripts/issue-pdh-badges.mjs`
case-studies/d1/ — generated D1 artifacts for the same register: `case-studies-d1.json` (engine review manifest) and `case-studies-seed.sql` (idempotent seed for the public register); rebuild with `npm run case-studies:build`, verify with `npm run case-studies:check`
research/reports/ — supporting research reports (separate from scored case studies)
archives/         — repository-only historical and source material; not in the browser bundle
archives/ags-legacy-exports/ — older "AGS"/"AGS++" EPUB/Pages exports, superseded by publications/
archives/animation-source/ — unused source frames and the earlier eye-closing GIF export
archives/Duplicates/ — quarantined duplicate files and SHA-256 manifest
archives/flame-renders/ — archived Fractal Flames PNG renders (Blue Cool palette, etc.)
archives/ground-0/ — historical standalone ZIP bundles; not normative source or deployed assets
archives/imports/ — unmerged incoming author bundles (new-model slot skeletons, old Fractal Flames backups)
archives/source-bundles/ — original ZIPs whose contents are organized under updates/
archives/screenshots/2026-08/ — archived screenshot backup artifacts; not deployed
tests/            — Node test harnesses (kernel, replay/race/property, Ground-0, LLM-removal guard, cloud, red-team)
scripts/          — asset staging and integrity-report tooling; not deployed with the site
docs/GOOD-INTELLIGENCE-ASSURANCE.md — v0.1 score formula, input contract, and safety limits
worker/           — Cloudflare APIs: private storage, signed synthetic empty.domains GI demo, market-data providers, Orb 2 field
.github/workflows/ — CI workflow that builds the integrity report on pushes and pull requests
SECURITY.md       — project-specific threat model and vulnerability-reporting policy
business plan/    — remaining author archive and reserved plugin/data slots; not included in the browser asset bundle

Runtime JavaScript stays in `js/` so the no-build static shell, worker asset staging, and existing
browser URLs remain direct and predictable. Its logical ownership is documented in
[docs/REPOSITORY-STRUCTURE.md](docs/REPOSITORY-STRUCTURE.md): kernel, UI, Ground-0 research,
Ground-0, Good Intelligence, and OCM modules are mapped there without creating duplicate source trees.
```

## Kernel API boundary

`js/kernel.js` runs inside a private closure; it does not publish `window.kernel` or a global mutable state object. The frozen `window.HOS` API exposes explicit capabilities such as `request()`, `demoAttest()`, `revoke()`, and `transition()`. There is no generic production `attest()` capability; `requestProductionAttestation()` always fails closed because no production authenticator is configured. The frozen security profile reports `mode: DEMO`, `productionAuthenticatorAvailable: false`, and `productionAuthorizationAvailable: false`. Successful gate results carry `executionScope: LOCAL-DEMO-ONLY`.

`assertStateInvariants()` validates canonical candidate state, `assertTransition()` applies the per-operation transition contract, and `commitState()` is the only post-initialization write path into authority-bearing state. Factor changes, demo-marker start/completion/revocation, phase and PDH changes, collapse acknowledgements, and session bind/burn/close operations all use that path. `observe()` returns a detached, deeply frozen operational snapshot; raw HMAC signatures/fingerprints, precise liveness timestamps, and caller-supplied bound identifiers remain private. Demo `Boot-ID`, `Human-Attestation-ID`, and active session linkage IDs are observable. Ledger reads and subscriber callbacks receive frozen copies as well.

The demo attestation lifecycle is explicit: `absent → pending → active`, with `failed` and `revoked` outcomes. Pending state always has `H(t)=0`, and action authorization refuses while pending. A successful HMAC activates the marker only if its generation is still current and its timestamp remains fresh at completion; HMAC errors and expired results transition to `failed`. Revocation or a newer ceremony supersedes any late completion. `observe()` exposes the lifecycle status plus freshness and a derived `expired` flag; expiry is not stored as a separate authority state. This hardens the local demo state machine only: the public phrase and source-bundled HMAC key provide no identity, liveness, consent, or production proof.

Priority 7 links a session to a per-page-load random `Boot-ID`, the current PDH digest, and a demo `Human-Attestation-ID` derived from local ceremony data. `closeSession(reason)` clears the active session and appends a structured termination row plus a canonical receipt; the receipt includes the binding-row root, termination-row root, a SHA-256 receipt digest, and the hash of its own final ledger row as `Ledger-Root`. `verifySessionReceipt(receipt, rows)` checks the receipt fields, linkage order, and SHA-256 chain from genesis through that root. Rebinding and other forced session clearances also write structured termination rows. These values remain local demo integrity markers: SHA-256 is not an independent signature, IDs do not prove identity, and a page compromise can rewrite or replace the ledger. The Whyland `burn` command displays the generated receipt and its local verification result.

This narrows the accidental-mutation surface; it is **not** a browser security boundary. Same-origin scripts, developer tools, browser extensions, or compromised dependencies remain outside what this client-side demonstration can defend against. Production authority still requires an external trust anchor.

### Automated tests and CI report

Priority 12 adds the `HarshalOS Integrity` GitHub Actions workflow and a generated **HARSHALOS INTEGRITY REPORT**. It runs on pushes, pull requests, and manual dispatch with read-only repository permission. `npm run integrity` runs the full and categorized suites plus `npm run check:deploy` (asset staging and Wrangler dry-run), then emits the report to stdout and the GitHub Actions job summary.

Run `node tests/red-team-test.mjs` for 18 targeted hostile-caller probes against the public HOS API. Each prints the attack, expected behavior, observation, result, and invariant. `npm test` runs the full `tests/*-test.mjs` suite. Focused scripts include `npm run test:kernel`, `npm run test:engine`, `npm run test:research`, `npm run test:app`, `npm run test:characters`, `npm run test:materials-project`, `npm run test:character-materials`, `npm run test:llm-removal`, `npm run test:cloud`, `npm run test:red-team`, and `npm run test:layout`. The suites cover P7 receipt/ledger tampering and linkage, named replay cases, expiry/phase/ledger races, cross-tab stale-write detection, and seeded state-machine sequences (four fixed seeds × 60 generated operations). The cross-tab test models a stale-write event arriving before the second save; it does not imply localStorage provides atomic compare-and-swap. This is bounded test coverage—not a full browser threat model, production security audit, or formal proof.

## The removed model layer, and what replaced it

The model integration was removed in full. There is no `HOSLLM`, no `G0LLM`, no provider
preset, no key storage, no relay route, and no model call anywhere in the shipped code.
The LLM Link tile remains as a **shell**: same id (`llmlink`), same title, same window size,
and one `REFUSED — REMOVED` panel that names the removed modules so the change is legible
instead of silent. It carries no provider registry, no key handling, no inputs, no storage
access and no network call — its one affordance is a signpost: an anchor that deep-links
Ground-0's manual audit wizard, because a refused path should name the path that works.

Two properties the removed layer used to be tested for are still enforced — as absences:

- **No data plane, so no authority question.** A stored record can no longer claim a model
  reading. `G0.normalizeAuditInput()` accepts only `web-research` and `public-lookup` as
  automation methods, and a record that arrives claiming `llm-reading` is re-labelled as
  public lookup with its model-reading block dropped. `tests/community-runs-test.mjs`
  asserts exactly that against the Worker's run path.
- **No model means no gap-filling.** Ground-0 answers come from fixed keyword rules over
  retrieved public records, each answer carrying its source and date, with the uncovered
  questions left as coverage gaps. Nothing can propose an answer a document does not
  contain, because nothing reads the document except those rules.

This remains a code/API boundary, **not realm isolation**, and it is no longer an
adversarially tested application contract because the application surface it described is
gone. What is tested is the removal itself: `node --test tests/llm-removal-test.mjs`
(`npm run test:llm-removal`, also part of `npm run integrity`) fails if a provider
endpoint, key store, relay route, AI binding, removed module, restored Ground-0 reading
control, or a roster entry for the removed palace resident comes back. That assertion is
the boundary now.

## Adversarial Mode

Priority 9 adds an **Adversarial Mode** desktop app with seven refusal-only probes: forged Human Key, invalid addressability, replayed authorization data, expired-looking session tuple, unknown phase, attempted ledger-snapshot corruption, and a direct malformed API request that bypasses the UI. Each report shows the input, public gate, observed refusal code, invariant ID, whether the operational HOS snapshot stayed unchanged, and the local demo-ledger report row. The probes deliberately avoid valid state transitions and external actions; each attempt is logged to the browser-local ledger. The UI harness is demonstration evidence, not a browser-integrity or production-security boundary. The real-page test runs all seven against the actual HOS API and checks that operational state is unchanged.

## Guided refusal demonstration

Priority 10 adds a single **RUN REFUSAL DEMO** control. It loads the same `js/crypto.js`, `js/data.js`, and `js/kernel.js` used by the page inside a fresh iframe with `sandbox="allow-scripts"` (no same-origin grant), plus the shared scenario runner. The active page's `HOS` object and ledger are never passed into that frame; its state, hash-chain rows, and accelerated demo clock are disposable. The walkthrough makes no writes to the active HOS instance or its ledger. This is separation for safe demonstration, not a claim of a production trust boundary.

The seven reports run in order: (1) no Human Key → `NO-DEMO-CONFIRMATION`; (2) the public local phrase activates the demo marker and raises `L`; (3) `A=0.25` → `L-BELOW-TAU`; (4) an isolated clock accelerated ×120 reaches `δ=240s` → `STALE-PERMISSION`; (5) re-attestation restores the local gate; (6) CWO refuses both above threshold and with `L=0`; (7) after the modeled collapse acknowledgements, GSRB first returns `L-BELOW-TAU` and only an explicit `sovereignOverride: true` returns `DEMO-GSRB-OVERRIDE`. That override is intentionally modeled as bypassing the legitimacy threshold, but it still requires a present, fresh local Human Key; no external or production action occurs. Each step checks its own child-kernel ledger row against the current Creator-ID formula. `node --test tests/guided-demo-test.mjs` tests the scenario and proves the active test kernel snapshot and ledger remain unchanged; `node tests/g0-desktop-test.mjs` tests the one-button UI/frame message path.

## Boot sequence

The boot screen is a short ceremony built on the author's true-color source frames
(`animate-000 … animate-024 Large.png`, 1280×853). While the bootloader typewriter runs, the
**open eye** (`assets/eye-open-hq.png`) holds full-bleed behind a `HARSHALOS` wordmark, a quiet
bottom-anchored log, a breathing ambient glow, and a hairline progress bar. When the log
completes, the eye **closes once** via a lossless true-color APNG (`assets/eye-closing-hq.apng`,
25 frames × 66 ms, `acTL` num_plays=1) and its near-black final frame hands off to the desktop —
the OS waking as the eye shuts. The log never blocks on the image and a failed image degrades to
a clean text-only boot; `assets/eye-closing-hq.apng` was verified byte-identical to the source
PNGs frame-for-frame. Visitors who prefer reduced motion see the static open eye and skip the
close. The earlier GIF encodings (`assets/eye-closing-hq.gif`, a pixel-exact `gifsicle -O3` copy
of the repository-root `Eye Closing HQ.gif`, and the longer 80-frame
`assets/eye-open-close-hq.gif`) remain in `assets/` as companion artifacts.

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

## The coverage gap

The automatic research retrieves real documents, but the shipped pipeline can only ask whether a
page *contains fixed keywords*. An organization whose governing text says the same thing in its own
words is recorded as a coverage gap — honestly labelled, never guessed at, and still a dead end.

**A model used to read that record instead of matching it. That path was removed.** Linking a
provider, storing a key, the relay, the reading pass, its quote verification, its follow-up
reading, its candidate weighing, and the review-and-apply flow are all gone from this repository;
[`docs/REMOVED-LLM-LAYER.md`](docs/REMOVED-LLM-LAYER.md) lists what each piece did. Nothing in the
shipped code sends record text anywhere.

What remains is the honest half, and it is unchanged:

- **Retrieval keeps what it read.** Page text is stored with the source (governing documents first,
  bounded per source and per audit) instead of being reduced to an excerpt. That stored text is
  what makes a record re-readable and citable at all — by you, and by the quote-matching rules.
- **Verification is still the gate for anything a person enters.** A finding needs a source on or
  before the cutoff; news indexes are leads and can never support an answer; relief figures must
  literally appear in the source or the claim is refused.
- **A silence is still a reported gap, never a NO.** Where the record does not say it, the answer
  stays **UNKNOWN** and the gap is named. Nothing in this repository is allowed to close a gap by
  asserting something the retrieved documents do not say.
- **The evidence library is the way through.** Save the primary artifact, cite it with a date and a
  claim in an audit, and the audit — not a model — is what scores it. The review gate, the
  confidence rules and the badges are unchanged.

### Tests for this path

`node tests/g0-engine-test.mjs` exercises the engine end-to-end (truth table, evidence
qualification, v1.1 B4 discipline, signed/tampered PDHs, transitions, working-badge states, hostile
storage); `node tests/g0-research-test.mjs` covers the scoring heuristics (add `--live` for a
network smoke test of the public registries); `node tests/g0-app-test.mjs` boots the workspace in
a mini-DOM and walks the interface — every tab, the manual wizard, the register, the evidence
library, the logic sandbox, preferences, and a complete automatic research run rendered against a
stubbed public record (so a run that finishes always reaches its result view instead of an error
state); `node tests/g0-desktop-test.mjs` opens the real page and asserts that the LLM Link tile is
a shell which discloses the removal and makes no network request of any kind. The removed layer's
own suites (`llm-test`, `llm-authority-test`, `g0-llm-diagnostics-test`, `llm-relay-test`,
`llm-workers-ai-test`, `ai-neuron-ledger-test`) are gone; `node --test tests/llm-removal-test.mjs`
is what replaced them.
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

## D1 community accounts and public audit register (enabled)

The rebuild includes `/account` private drafts and Ground-0 execution, plus `/audits`
for explicitly published reports, version history and activity. The public detail page can
export each active D1-backed report as a NewsML-G2 XML `newsItem`. Publication requires an
exact recomputed preview and explicit consent; reports remain **UNREVIEWED**, not platform
certification. Author withdrawal, private reporting and moderator hide/block controls are
implemented. Private drafts/runs are not automatically public.

The same Community service now also has a separate `/observations` public register for **explicit native public-note publication**. A native Ledger user prepares a bounded, unlisted 15-minute handoff containing only a declared phase snapshot, public note text, and self-chosen public pseudonym; the user then signs in on the site, manually enters a one-time code, reviews the exact candidate, confirms a profile pseudonym, and explicitly publishes it. Public observations are **UNREVIEWED**, author-submitted, and are not personal-universe cores, identity proof, peer authorization, market data, or investment advice. An author can withdraw a note; a configured moderator can hide an active note with an internal append-only reason. Both redact the service’s public body/author/phase but cannot recall external copies. The native app receives a status-only receipt and does not call a note published before the public feed confirms it. This requires migration `0016_public_observations.sql`, which follows the owner-applied migration `0015` (and the retired `0014` model-ledger step where it was ever applied), and the same owner-run Community launch gates; no remote migration or deployment has been run from this build environment.

The Community service also implements an account-scoped **`PAPER_TEST` market ledger** for the website and explicitly paired native apps. The Worker keeps reviewed Orb 2 field/provider isolation, server-issued immutable quote references, paper valuation, append-only event history, and normalized Market Orb placement server-side. A native app creates a 15-minute pairing, an already signed-in browser account enters and explicitly approves its manual code, and the device redeems a one-time revocable, expiring `PAPER_TEST` bearer held only in Keychain. Browser writes retain the existing exact-origin Community-session protection. A server field outage remains held/unavailable—there is no fixture fallback. Passive Crypto Orb display data is allowed only through the server field; there is no device mining, wallet, custody, token, trade, or execution capability. Apply additive `0017_paper_market.sql` after `0016` and the owner-applied `0015` history (the retired `0014` step is noted in [`docs/REMOVED-LLM-LAYER.md`](docs/REMOVED-LLM-LAYER.md)). See [`docs/PAPER-TEST-MARKET.md`](docs/PAPER-TEST-MARKET.md).

`COMMUNITY_ENABLED=true` is the repository decision; branch previews keep it `false`.
The switch takes effect only on the next production deployment, and the pages below stay
inert until the owner-managed dashboard variables/secrets exist, the production D1 migration
history is complete through `0017` (including owner-applied `0015`, plus the retired `0014` step where recorded), and the register
seed is applied. Live Auth0/D1 verification and the launch checklist remain pending. See
[setup, ordered enablement and launch gates](docs/deployment/COMMUNITY-D1.md).

The 23 register-issued case studies are seeded into the same public register (see the News
section above); every row is register-issued, `UNREVIEWED` and unattested, and
`PDH_VALID` remains FALSE for every audited entity.

Staging uses a separate Worker and D1 database: see [staging setup](docs/deployment/COMMUNITY-STAGING.md). Use `npm run deploy:staging`, not the production deploy command.
