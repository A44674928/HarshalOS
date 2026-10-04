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
| **LLM connection points** | Bring your own model: Anthropic, OpenRouter, Google's GenAI SDK, any OpenAI-compatible endpoint, a local server (Ollama / LM Studio), or **this deployment's Z.AI free-tier relay** (`/api/llm`), which holds the key as a Worker secret so no key is pasted into the browser. A BYOK key never leaves the browser except to the endpoint the custodian chose, and is held for the tab unless persistent storage is requested. Providers that refuse browser calls (`api.openai.com`) are labelled as such rather than faked, and a deployment with no relay says so instead of pretending |
| **Good Intelligence signal desk** | Native read-only dashboard for feed, categories, intel details, rankings, a dedicated Market Charts tab with ticker price line graphs plus VFI, Fibonacci-band, and WaveTrend visualizations, and a TradingView tab (after Market Charts) rendering the same OHLCV with TradingView's free Apache-2.0 Lightweight Charts™ library, vendored at `js/vendor/lightweight-charts/`. The default same-origin `empty.domains` API serves clearly marked synthetic current/stale/contested/unassessed cases, demo-only signed source-authorization fixtures, and eight synthetic ticker histories (`AAPL-DEMO`, `MSFT-DEMO`, `NVDA-DEMO`, `INTC-DEMO`, `AMD-DEMO`, `NET-DEMO`, `CVX-DEMO`, `XOM-DEMO`); these are not real prices, and APIs without OHLCV show no fabricated charts. Both chart tabs share one tracked-ticker search and ticker selector, and both default to Tickerbot Live (the synthetic demo stays one explicit switch away); live search covers the configured sector-diverse Tickerbot watchlist (52 symbols including Apple, Microsoft, Intel, AMD, Cloudflare, Chevron, Exxon Mobil, and Tesla) and never fetches an unconfigured symbol. An optional read-only Tickerbot Live source fetches allowlisted OHLCV through a same-origin Worker route using the `TICKERBOT_API_KEY` secret; the key never reaches browser code. Live Sentinel items without the assurance packet stay `NOT SCORED`. Market indicators never alter the assurance score. The v0.1 formula is provisional, not approved policy. Scores never certify truth or authorize action. Uses GET-only `/content/me`, `/categories`, `/rank`; tries legacy `/intel/me` only if the documented feed route is missing. No sign-in, publishing, token approval, or transaction flow |
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
| **Characters (market beat, display-only)** | The palace cast — Objects, NPCs, and Items — moved by the last **closed** bar instead of an average day. Every berth is one symbol on the reviewed 52-symbol Tickerbot watchlist (the cast is built from the Worker's own list at runtime, so there is no second allowlist), and every refresh is a **beat**: the budget planner turns a Tickerbot monthly call budget (default 10,000, 15% held in reserve) and a cadence (15 min / 30 min / hour / 4 h / day) into *symbols per beat*, then rotates the least-recently-refreshed berths with featured tickers weighted to come up twice as often. The app now defaults to a 15-minute cadence: 2 symbols per beat safely, 5,844 calls/month, and a full 52-symbol sweep every 6.5 elapsed hours; optional stretch is 3 per beat and spends into the reserve. A faster clock refreshes *fewer* characters per beat, so the full sweep is 6.5 h at 15 min versus 5 h at hourly. A **two-lane (tiered) beat** spends the same planned Tickerbot calls differently: the featured berths form a hot lane refreshed every beat while the remaining calls walk a sweep of the rest, at exactly the same planned Tickerbot monthly cost. Hourly that is 9 hot berths plus a full sweep of the cast in 22 h; every 15 minutes it is 1 hot berth plus a full sweep in 12.75 h (near twice a day). The tier selector marks 6- and 12-hour targets infeasible at that cadence and budget rather than selling a hot lane that starves the sweep. Motion reuses the Market Charts pipeline: the Worker returns `gi-market-context-v1` bars per due symbol, `js/good-intelligence-market-context.js` evaluates VFI + Fibonacci bands + WaveTrend, and `js/characters-beat.js` maps the result to NPC speed/stride/jitter/formation, Object sway/pulse/aperture, and Item flow. Spend discipline is the whole point: `GET /api/characters/v1/beat` tries Tickerbot once per due symbol and, only after a failed daily (`1d`) Tickerbot read, may make one separately capped Alpha Vantage fallback request. Successful bars are held for exactly one beat so reloads and re-renders cost zero calls; failed reads are never cached, a beat is capped at 12 symbols, and off-allowlist symbols are refused without an upstream call. A symbol without bars **freezes**; nothing is interpolated, back-filled, or invented. Alpha Vantage is used only for daily bars and returns at most the latest 100 unadjusted points on the free compact endpoint; its 25-call/day fallback cap cannot refresh the 52-symbol deck twice daily. Today's bar is withheld until the US session closes. Synthetic rehearsal (a local deterministic generator, 0 calls) is watermarked wherever it moves a character and never mixed with live data. Auto-beat spends nothing while the tab is hidden. A one-row-per-UTC-month D1 ledger atomically hard-stops Worker-routed Tickerbot attempts at 10,000 across Characters and Good Intelligence; a separate one-row-per-UTC-day D1 ledger caps Characters-only Alpha Vantage fallback attempts at 25/day. Both count failures conservatively; direct provider calls are outside these counters. The browser ledger (`harshalos.characters.ledger.v1`) remains local activity/rotation state; provider dashboards remain the billing authority. Apply migrations 0005 and 0006 before enabling live Tickerbot or Alpha Vantage calls. Set `ALPHA_VANTAGE_API_KEY` only as a Worker secret; production observability redacts query strings because that API requires its key in the query. Keep the site owner-only behind Cloudflare Access. Motion is Stage 2 representation only: not investment advice, not a trade signal, not permission to act, and it never enters assurance scoring or a Permit/Refuse decision. `npm run test:characters`. See [`docs/architecture/CHARACTERS-MARKET-BEAT.md`](docs/architecture/CHARACTERS-MARKET-BEAT.md) |
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
tests/            — Node test harnesses (kernel, replay/race/property, Ground-0, LLM, relay, cloud, red-team)
scripts/          — asset staging and integrity-report tooling; not deployed with the site
docs/GOOD-INTELLIGENCE-ASSURANCE.md — v0.1 score formula, input contract, and safety limits
worker/           — Cloudflare APIs: private storage, signed synthetic empty.domains GI demo, and the Z.AI free-tier model relay
.github/workflows/ — CI workflow that builds the integrity report on pushes and pull requests
SECURITY.md       — project-specific threat model and vulnerability-reporting policy
business plan/    — remaining author archive and reserved plugin/data slots; not included in the browser asset bundle

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

## The coverage gap, and the way out of it

The automatic research retrieves real documents, but the shipped pipeline can only ask whether a
page *contains fixed keywords*. An organization whose governing text says the same thing in its own
words is recorded as a coverage gap — honestly labelled, never guessed at, and still a dead end.

**With a model linked, that record is read instead of matched.** From a completed research draft:

1. **Retrieval keeps what it read.** Page text is stored with the source (governing documents
   first, bounded per source and per audit) instead of being reduced to a 650-character excerpt.
   Without this there would be nothing for a model to read.
2. **Google's automatic-audit read defaults to one request unless preflight finds a known conflict.** After
   retrieval, the page estimates the complete Gemini prompt locally — system rules, all nine
   questions, response shape and packed source text — before the model button is clicked. It makes
   no extra API/token-count call. The padded character estimate is not Google's tokenizer result.
   When model-context metadata is available and the saved local TPM/RPD guard allows it, the primary
   action bundles up to 216,000 source characters (roughly 60k prose tokens before instructions)
   into one `models.generateContent` attempt. If context or TPM metadata is missing, the preflight
   warns and leaves the one-request action available; that is not proof the prompt fits. One request
   reduces RPM/RPD pressure, but the full input still counts against TPM. The estimate and guard
   cannot see live Google usage from other apps, users or devices; Google remains authoritative. If
   the known context or local TPM estimate
   is too large, the UI switches the primary action to the staged fallback and explains why.

   **Staged reading remains an explicit fallback and the default for other providers.** It packs
   documents into batches (about three documents and 12k characters each, inside a per-run budget),
   then asks the nine Ground-0 questions one per model call (`LIMITS.codesPerCall`). Staging keeps
   answers small, isolates failures, can follow qualifying links in the retrieved text, and leaves a
   failed question UNKNOWN rather than treating it as a silent record. The connection honors
   OpenRouter's `Retry-After` header for waits up to two minutes, shows the wait, and surfaces longer
   waits instead of retrying early; without a header it uses a short bounded backoff. Raise
   `codesPerCall` to group questions and re-send the same source text fewer times when the balance
   allows it. The one-request Google path disables automatic format retries, linked-page follow-ups,
   and separate candidate weighing; an incomplete reply stays unresolved. Both paths verify quotes
   locally, and Ground-0's rules — not the model — determine phase after a person reviews and applies
   readings.
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

LLM Link includes a **Google Gemini Developer API (GenAI SDK)** preset. It uses Google's official
`@google/genai` JavaScript browser build (`models.list` and `models.generateContent`), pinned to
**2.26.0** and imported only when Google model listing, connection testing, or a Ground-0 read needs
it. This static site has no npm build pipeline, so it loads the pinned package through jsDelivr's ESM
conversion rather than committing a generated bundle. The SDK code and its dependencies come from
the CDN; **the API key and prompt do not**. Model requests go directly from this browser to the
configured base URL (the Gemini Developer API by default), using the official SDK methods—not a
hand-built REST call or an OpenAI-compatible shim. The existing connector remains a plain,
tool-free `generateContent` reader; Antigravity's separate Interactions/managed-agent surface is not
silently substituted into this data-only path.

The Google call passes `systemInstruction`, `maxOutputTokens`, temperature, and the active abort
signal through the SDK. Ground-0 still asks **one audit question per recall** (including separate
weighing calls); it does not turn the audit into one large call. SDK responses normalize into the
same usage/model/text shape as the other providers, then pass through the unchanged
character-for-character quote check and human-review gate.

Google's SDK defaults to multiple HTTP attempts, so generation calls set its per-request attempt
count to one and let HarshalOS handle transient retries in one place. It honors Google's structured
`RetryInfo` / `Retry-After` delays (with small jitter), or uses bounded exponential backoff for
transient 408, 429, 500, 502, 503, and 504 responses, with at most three retries and an abortable
two-minute wait ceiling (subject to the call timeout). A detected per-day quota is not retried. If a
rate limit persists, Ground-0 stops rather than fanning the same account-wide failure across every
question; provider failures remain failures, never evidence.

**Google quota guard.** Google's Gemini API limits are model- and project-specific, measured in
requests per minute (RPM), **input** tokens per minute (TPM), and requests per day (RPD); keys in the
same project share the quota, and RPD resets at midnight Pacific. AI Studio is authoritative for the
active values—there is no dependable quota-discovery API for this browser connector. In LLM Link,
open **Gemini project pace guard**, copy the selected model's active limits from [Google AI Studio's
rate-limit page](https://aistudio.google.com/rate-limit?timeRange=last-28-days), choose a safety
ceiling (80% by default), and save. The client then gates Google generation attempts through a
same-origin rolling-minute request/input-token window and a Pacific-day request counter. It uses a
padded character-based input-token estimate before a call and replaces it with Google's reported
prompt-token count afterward when available. Retry attempts are counted too. No prompt, response, or
key is stored in the quota ledger; only timestamps and token counts are stored in this browser.

This is a **local pacing guard, not project-wide enforcement**: Web Locks coordinate tabs where
supported, but it cannot see a different browser/device, another person, another application, API
model-list calls, or a different key/client's traffic. Copying the active values and leaving headroom
reduces accidental 429s; it cannot guarantee no 429. The provider still decides and returns the actual
quota response. See **[Google Free Tier & Antigravity setup](docs/deployment/GEMINI-FREE-TIER.md)**
for the exact Free Tier scope, privacy, Antigravity options, and setup.

**Key and data warning:** Google recommends keeping production API keys server-side. LLM Link's
personal BYOK key is sent directly from the browser and is visible to anyone with access to it; session
storage is the default, and persistent storage is opt-in. On Google's Free Tier, prompts and responses
may be used to improve Google products—do not send confidential or sensitive material. Check the
model/mode's current pricing and data terms; merely seeing a model in `List models` does not mean it
is Free Tier eligible. HarshalOS does not receive the key or the provider prompt; the browser copy of
the audit remains local.

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
injects a Google GenAI SDK mock to verify the All available model catalog and context metadata,
request/response mapping, key redaction, a complete staged read and the one-request bundle without
raw REST calls; it also checks the project/model-scoped local RPM/input-TPM/RPD guard, pacing before
a provider call, exact-usage
settlement, local daily/oversized-prompt refusals, bounded 503 backoff, the 34-second 429 `RetryInfo`,
abort during a provider wait, no retry for a per-day quota, and stopping the staged audit after a
persistent account-wide rate limit.
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

## D1 community accounts and public audit register (enabled)

The rebuild includes `/account` private drafts and Ground-0 execution, plus `/audits`
for explicitly published reports, version history and activity. The public detail page can
export each active D1-backed report as a NewsML-G2 XML `newsItem`. Publication requires an
exact recomputed preview and explicit consent; reports remain **UNREVIEWED**, not platform
certification. Author withdrawal, private reporting and moderator hide/block controls are
implemented. Private drafts/runs are not automatically public.

`COMMUNITY_ENABLED=true` is the repository decision; branch previews keep it `false`.
The switch takes effect only on the next production deployment, and the pages below stay
inert until the owner-managed dashboard variables/secrets exist, migrations 0001–0006 are
applied to production D1, and the register seed is applied. Live Auth0/D1 verification and
the launch checklist remain pending. See
[setup, ordered enablement and launch gates](docs/deployment/COMMUNITY-D1.md).

The 23 register-issued case studies are seeded into the same public register (see the News
section above); every row is register-issued, `UNREVIEWED` and unattested, and
`PDH_VALID` remains FALSE for every audited entity.

Staging uses a separate Worker and D1 database: see [staging setup](docs/deployment/COMMUNITY-STAGING.md). Use `npm run deploy:staging`, not the production deploy command.
