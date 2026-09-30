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

No build step, no dependencies. Serve the repository root with any static server:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Or simply open `index.html` in a browser.

---

## What is implemented

| Document concept | In HarshalOS |
|---|---|
| **Phase Declaration Header (PDH)** | Boot sequence publishes the PDH before any operation; the PDH app shows the live header (immutable `Declaration-Hash`, ISO timestamp) and enforces the single-phase invariant |
| **Human Key** | The attestation gate. `H(t) = 0` → system is **Mathematically Void**. Type the ceremony phrase to attest; freshness decays over δ = 240 s |
| **Legitimacy gating (A.2–A.6)** | Live engine: `L(t) = H(t) × f(A(t), R(t), S(t))`, `x(t) = Permitted iff L(t) ≥ τ`. τ is absolute — the "optimization override" button demonstrates the A.6 precedence rule (`argmax` undefined) |
| **Temporal decay (A.5)** | `S(t) = Smax·max(0, 1−Δt/δ)`; scope contracts visibly; at Δt ≥ δ the halt is **immediate** — the void banner drops the shell into refusal |
| **Three phases** | ❄ NAB (Refusal-Bound) · 💧 CWO (Witness-Only) · 💨 GSRB (Sovereign-Acting). Phase behavior is real: CWO forbids action outright; GSRB requires the five-step fossilized collapse protocol and permits sovereign override (with loss of misuse resistance recorded) |
| **Duty Collation Ledger / PLV** | Append-only, hash-chained provenance ledger. Every refusal, permit, phase change, and audit is witnessed. Severity: Informational / Warning / Breach / Collapse |
| **AI Inner Shell** | Address-constrained AI nodes (`0•100•000•NNNN•AI-XXXX`). Removing the anchor invalidates all dependent nodes instantly — *geometry, not enforcement*. Learning increases capability, never authority |
| **Discs** | Bounded operational contexts with time horizons, fossilized scope, distance limits, and external legitimacy references. Deterministic halting; no authority residue; discs cannot create other discs |
| **Whyland Standards (TCS)** | Contextual-inquiry terminal: `why.query`, `why.activate`, `why.explain` with the session-state transition table, off-disc catalog virtualization, Control 2 freshness gating, and the Bromine gateway (invalid input → session burn) |
| **LLM connection points** | Bring your own model: Anthropic, OpenRouter, any OpenAI-compatible endpoint, a local server (Ollama / LM Studio), or this deployment's relay if one is configured. The key never leaves the browser except to the endpoint the custodian chose, and is held for the tab unless persistent storage is requested. Providers that refuse browser calls (`api.openai.com`) are labelled as such rather than faked |
| **Ground-0 audits** | Observed-behavior phase classification with forced re-badging, Theorems I & II, and duty collation — the institutional honesty engine. Presets include two worked frontier-lab case studies: OpenAI Group PBC (`GROUND-0 CASE STUDY - OpenAI.md`) and Anthropic PBC (`GROUND-0 CASE STUDY - Anthropic.md`) |
| **Symbolic Firewall** | Narrative, mythic, and commercial metaphor is sealed as **non-executable** — the structural defense against neurojacking |
| **500 voting coins** | Bounded-governance simulation of the physical hardcover book's coin pool — influence limited by design |
| **Glossary** | Part II stabilized terms, searchable |
| **Zero Trust / Harshal Neural OS** | The shell never infers, caches, or synthesizes authority internally; all authorization is external, per-action, and time-sensitive |
| **OCM visualization — The Orb** | HarshalOS itself rendered as a radiative sphere of influence: 12 apps as radiative nodes attached directly to the center (`0•[orb]•[sector]•[instance]`), the 360-address equatorial disc (`0•DDD•000•0000`), the disc→sphere formation animation (rotation over time + depth), distance shells (`0•DDD•RRR•####`), the non-sovereign resolution axis, AI inner shell, lateral comms, and interaction-orb arcs — drag to orbit, click a node to inspect its address lineage |
| **Interaction Orbs** | The non-additive extension: OCM arithmetic (A=1, B=1, A↔B=1 → 3), both worked micro-examples as steppers (25%+25% → 75% observed mismatch), the three communication layers, navigation/exit protocol, and the classical-vs-OCM comparison |

## Layout

```
index.html        — OS shell (boot, HUD, desktop, taskbar)
css/os.css        — design system
css/ground0.css   — Ground-0 workspace styles (scoped to the Ground-0 window)
assets/           — boot animation (Eye Open:Close, 1920×1080 GIF)
specs/            — versioned Ground-0 specifications (v1.0 normative, v1.1 draft) fetched by the spec reader
js/data.js        — stabilized terms, phase specs, Why catalog, audit fixtures
js/ocm-data.js    — OCM layer: 360° degree legend, axioms, node map, arithmetic fixtures
js/crypto.js      — cryptographic schema: SHA-256 + HMAC-SHA256 (Web Crypto, JS fallback)
js/kernel.js      — accountability-gated state machine + SHA-256 hash-chained PLV duty ledger
js/g0-engine.js   — Ground-0 engine: strict validation, B1–B5/C1–C4 scoring, PDH (ECDSA P-256),
                    working badge, transitions, baselines, defensive storage (window.G0)
js/g0-research.js — key-free public-record research: identity, official pages, Wayback captures,
                    court/regulatory/legislative/news registries, coverage (window.G0Research)
js/llm.js         — LLM connection points: provider presets, bring-your-own-key storage, provider
                    transport (Anthropic / OpenAI-compatible), probes, plain-language failures, and
                    token ceilings learned from priced refusals, and bounded retries that honor
                    OpenRouter's `Retry-After` for in-flight budget refusals (window.HOSLLM)
js/g0-llm.js      — Ground-0 model reading: staged one question per call over batched source
                    passes, verbatim-quote verification, bounded link-following, application
                    to a draft (window.G0LLM)
js/wm.js          — window manager, HUD, origin menu, toasts
js/apps-core.js   — Origin · Human Key · PDH · Legitimacy Engine · Duty Ledger
js/apps-shell.js  — Inner Shell · Discs · Whyland · Glossary · The Book · Firewall
js/g0-app.js      — the Ground-0 workspace app: overview · register · manual wizard · automatic
                    research · model reading · evidence · temporal · phases · logic sandbox ·
                    specification · access
js/apps-llm.js    — LLM Link: connect your own model, test it, see what leaves the browser
js/apps-ocm.js    — The Orb (sphere engine) · Interaction Orbs (non-additive extension)
js/boot.js        — PDH boot sequence (eye animation + cryptographic attestation log)
scripts/          — Node test harnesses (engine + research); not part of the deployed site
```

## Boot sequence

The boot screen opens with the **Eye Open:Close** animation (`assets/eye-open-close-hq.gif`,
1920×1080) — the eye fades in above the bootloader log as the system wakes. The log and the
animation are independent: the typewriter sequence never blocks on the image, the image fades
in whenever its data has landed, and if it ever fails to load the boot proceeds cleanly.

## Cryptographic schema

All integrity digests and keyed attestations flow through a single module (`js/crypto.js`,
exposed as `HOSCrypto`) — no other code in the system computes "hashes":

| Artifact | Primitive |
|---|---|
| **PDH Declaration-Hash** | `SHA-256` over the canonical header fields (phase, capability, legitimacy source, refusal semantics, symbolism executability, time-authority effect, timestamp, Creator-ID, Center-Origin) |
| **PLV duty ledger** | `SHA-256` hash chain — each entry digests `(id, ts, severity, event, prevHash, Creator-ID)`; genesis `prevHash` is the 64-zero digest. Digests are asynchronous, so the chain is serialized through a promise queue: append-only order is preserved even for fire-and-forget callers |
| **Human Key attestation** | `HMAC-SHA256` keyed signature over `(phrase, liveness timestamp, Creator-ID, Center-Origin)` — a fresh, keyed attestation per ceremony; fingerprint shown in the Human Key app |
| **Symbolic Firewall seals** | `SHA-256` digest of the sealed content + nonce |

Backend: **Web Crypto (SubtleCrypto)** — the platform's cryptographic primitive. A
deterministic pure-JS SHA-256 (NIST FIPS 180-4) is the fallback for non-secure contexts
where `crypto.subtle` is unavailable, so the schema degrades gracefully instead of
breaking the ledger. The boot log reports the active backend at startup.

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

**Tests.** `node scripts/g0-engine-test.mjs` exercises the engine end-to-end (truth table, evidence
qualification, v1.1 B4 discipline, signed/tampered PDHs, transitions, working-badge states, hostile
storage); `node scripts/g0-research-test.mjs` covers the scoring heuristics (add `--live` for a
network smoke test of the public registries); `node scripts/g0-app-test.mjs` boots the workspace in
a mini-DOM and walks the interface — every tab, the manual wizard, the register, the logic sandbox,
preferences, a complete automatic research run rendered against a stubbed public record (so a run
that finishes always reaches its result view instead of an error state), and a full model reading
applied to a draft; `node scripts/llm-test.mjs` covers the connection layer and the reading pass
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
in which no call completes throws instead of returning an empty audit.

If the Human Key is absent, the system does not become *less effective* — it becomes
**Mathematically Void**. Refusal is not failure; it is the primary act of responsible control.

---

*Harshal's Systems — including the Supply Chain Attack Vector++, Accountability-Gated Systems, the
Orb Communicator Model, and Human-Machine Hybrid Systems — are the exclusive intellectual and real
property of Harshal Priyavadan Patel. All rights reserved. Commercial licensing is available solely
through direct inquiry.*

*All scenario content in this demonstration is abstract, not descriptive · structural, not
behavioral · evaluative, not directive · contained, not externalized.*
