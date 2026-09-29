# HarshalOS

**Architectures for Accountable Human D'Ash Machine Intelligence**

HarshalOS is a working structural demonstration of the governance architecture specified in
**Harshal's Systems** (formerly AGS++) — *Harshal's Systems (Working Draft)* by
**Harshal Priyavadan Patel (A44674928)**.

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
| **Ground-0 audits** | Observed-behavior phase classification with forced re-badging, Theorems I & II, and duty collation — the institutional honesty engine |
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
assets/           — boot animation (Eye Open:Close, 1920×1080 GIF)
js/data.js        — stabilized terms, phase specs, Why catalog, audit fixtures
js/ocm-data.js    — OCM layer: 360° degree legend, axioms, node map, arithmetic fixtures
js/crypto.js      — cryptographic schema: SHA-256 + HMAC-SHA256 (Web Crypto, JS fallback)
js/kernel.js      — accountability-gated state machine + SHA-256 hash-chained PLV duty ledger
js/wm.js          — window manager, HUD, origin menu, toasts
js/apps-core.js   — Origin · Human Key · PDH · Legitimacy Engine · Duty Ledger
js/apps-shell.js  — Inner Shell · Discs · Whyland · Ground-0 · Glossary · The Book · Firewall
js/apps-ocm.js    — The Orb (sphere engine) · Interaction Orbs (non-additive extension)
js/boot.js        — PDH boot sequence (eye animation + cryptographic attestation log)
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

If the Human Key is absent, the system does not become *less effective* — it becomes
**Mathematically Void**. Refusal is not failure; it is the primary act of responsible control.

---

*Harshal's Systems — including the Supply Chain Attack Vector++, Accountability-Gated Systems, the
Orb Communicator Model, and Human-Machine Hybrid Systems — are the exclusive intellectual and real
property of Harshal Priyavadan Patel. All rights reserved. Commercial licensing is available solely
through direct inquiry.*

*All scenario content in this demonstration is abstract, not descriptive · structural, not
behavioral · evaluative, not directive · contained, not externalized.*
