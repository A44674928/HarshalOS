# Incorporating Pine Script into the Orb Communicator Model

**Status:** proposed design · not implemented · introduces **no** new invariant
(per `INV-CORPUS-027a`, this document only instantiates invariants already defined in
`docs/harshal-systems/01-core-book.md`–`26-anthropic-b-side.md` and
[`specs/normative/canonical-model.md`](../../specs/normative/canonical-model.md)).

**Companion:** [`scripts/pine/`](../../scripts/pine/README.md) holds the Markdown copies of
the two Pine scripts this design covers.

---

## 1. The short answer

A Pine Script indicator does **not** become an authority in OCM. It becomes an
**observation node** on the ℤ₃₆₀ ring whose entire output is Stage-2 *Representation*
material. It can be read by any node (Lateral Communication Axiom), it derives its address
from Center Origin (Single-Origin Axiom), and reading it confers nothing on the reader
(Ownership Non-Transfer Axiom).

Concretely: **Pine output enters the orb as telemetry and stops at the Decision gate, whose
default is Refuse.** No crossover, divergence, or confluence can move a request from Refuse
to Permit, because that transition requires Stages 3–5 — Authorization `V(S, t)`,
Continuity `C(t)`, and Accountability `K(t)` — none of which an indicator can supply.

This is not a policy choice layered on top of the model. It follows from
`INV-AXIS-001` (*"Resolution is an authority-resolution mechanism, not an authority source"*):
an indicator is not even a resolution mechanism, so it is further from legitimacy than the
thing the invariant already excludes.

## 2. What is actually being incorporated

The repository already contains a committed translation of two Pine v6 scripts:

| Script | Pine source | Committed port |
| :--- | :--- | :--- |
| VFI + Fibonacci Bands | **not in repo** — see [`scripts/pine/01-vfi-fibonacci-bands.md`](../../scripts/pine/01-vfi-fibonacci-bands.md) | `computeVfi()`, `computeBands()` in `js/good-intelligence-market-context.js` |
| WaveTrend | **not in repo** — see [`scripts/pine/02-wavetrend.md`](../../scripts/pine/02-wavetrend.md) | `computeWaveTrend()`, `mapHigherTimeframe()`, `divergenceEvents()` |

Their consumer today is the **Good Intelligence** app, which is itself *not* registered as an
OCM node — a repository-wide search for `good.intelligence` across `js/ocm-data.js`,
`js/ocm-directory.js`, `js/apps-ocm.js`, and `js/apps-ocm-directory.js` returns nothing. So
incorporation is a two-step job: give market context an address, then bind it to the
decision path. Step 1 is specified below; step 2 is deliberately left as refusal-only.

## 3. Sector assignment on the ℤ₃₆₀ ring

The canonical 360° degree legend in `js/ocm-data.js` already names the right sector:

> `116: "Markets"`

That degree sits in the **Knowledge & Intelligence** cluster (`91–135`), alongside
`114: "Economic systems"`, `115: "Currency and value"`, `117: "Incentive design"`, and
`118: "Supply chains"`. No legend change is required — this is `INV-CORPUS-027b`
permitted instantiation, not invention.

Proposed node, matching the existing `nodes[]` convention in `js/ocm-data.js`:

```js
{ app: "market", name: "Market Context", addr: "0•116•000•0012•MKT", deg: 116, r: 2.45,
  sector: "Observation",
  note: "Optional OHLCV indicator telemetry (VFI, Fibonacci bands, WaveTrend). Read-only; never authorizes, overrides, or commits state." }
```

**Why radius `2.45`** — the outermost ring, past The Book at `2.1`. Distance in OCM is
*"degree of coupling to the origin / propagation latency of effects / scope of
responsibility"* and is explicitly **not** rank, authority, or importance. Provider-supplied
market bars are the least coupled, highest-latency, externally-sourced data in the system,
so they belong at maximum distance. Per `js/ocm-data.js`: *"Nodes at greater distance may
operate autonomously while remaining within the ownership envelope of the orb."*

**Why instance `0012`** — the twelve existing nodes occupy `0000`–`0011`.

**Why `000` in the radius field** — every existing `addr` literal uses `000` there; the
displayed fresh-slate form is derived at render time from `Math.round(nd.r * 100)`
(`js/apps-ocm.js`, ~line 1307). Matching the convention keeps the two consistent.

## 4. Mapping Pine constructs onto the OCM decision path

The six-stage canonical minimum model is
`Identity → Representation → Authorization → Continuity → Accountability → Decision (Permit | Refuse)`.
Here is where each part of a Pine script lands:

| Stage | Canonical symbol | What the Pine pipeline contributes | Can the indicator supply it? |
| :-- | :--- | :--- | :--- |
| 1 · Identity | `I` | The packet's `source`, `symbol`, `timeframe`, and `synthetic` flag; provider authentication lives in `js/good-intelligence-verifier.js` | **No** — provider identity is asserted upstream, not computed |
| 2 · Representation | `R(t)` | The normalized `gi-market-analysis-v1` object: VFI, signal, bands, `wt1`/`wt2`, zone, alerts, `barCount`, `lastBarConfirmed` | **Yes — this is the whole contribution** |
| 3 · Authorization | `V(S, t)` | Nothing | **Never** (`INV-LEGIT-001`: legitimacy never migrates) |
| 4 · Continuity | `C(t)` | Nothing | **Never** — requires a bound session tuple and `Δt < δ` |
| 5 · Accountability | `K(t)` | Nothing | **Never** — requires `K_tech × K_ops` bound to a human |
| 6 · Decision | `Permit \| Refuse` | A refusal is the only lawful outcome absent Stages 3–5 | **No** (`INV-AGENCY-001`) |

### Symbol namespace collision (`INV-SYM-001`)

`INV-SYM-001` requires each symbol to carry exactly one canonical meaning. Pine overloads
**signal** three ways, and all three collide with the corpus:

| Pine usage | Corpus meaning | Resolution |
| :--- | :--- | :--- |
| VFI's EMA line (`signal = ta.ema(vfi, vfiSignalLen)`) | — | Rename in prose to **VFI reference line**; the port already stores it as `vfi.signal`, which is acceptable as a field name but must never appear as a bare `signal` in a spec |
| A trading signal / alert | — | Use **indicator event**; the port's own note already says *"Alerts are display-only; nothing is sent or executed."* |
| Ground-0's `signal` object in the Good Intelligence assurance contract | The claim-under-assessment | Reserve **signal** for this meaning exclusively |

Any spec text written about this integration must use the right-hand column.

## 5. Axiom and invariant conformance

| Constraint | Source | How this design satisfies it |
| :--- | :--- | :--- |
| Single-Origin Axiom | `js/ocm-data.js` `axioms[0]` | The node's address is `0•116•…`, derived from Center Origin |
| Direct Attachment Axiom | `axioms[1]` | Attaches to the center, **not** to the Good Intelligence app. A market node parented to another app would create the shadow hierarchy OCM exists to forbid |
| Lateral Communication Axiom | `axioms[2]` | Any node may read the readings without reauthorization |
| Ownership Non-Transfer Axiom | `axioms[3]` | Reading a reading confers no authority; enforced by making the node read-only |
| Collapse-on-Origin-Removal | `axioms[4]` | Nothing special — the node holds no origin rights to begin with |
| `INV-AXIS-001` | `canonical-model.md` §8.1 | The indicator is telemetry, not even a resolution mechanism |
| `INV-OCM-PRECEDENCE-001` / `-003` | §Routing | Nothing here routes laterally for authority; all authorization still traverses the resolution path |
| `INV-OCM-LATERAL-002` | §Routing | A Pine alert forwarded node-to-node cannot authorize, override, or commit state — this is the single most important line in this document |
| `INV-EMERG-001` | §Emergency | A flash crash, a VFI blow-off, or an "extreme bearish reversal" is an emergency condition and therefore **never** generates legitimacy. No auto-hedge, no auto-flatten, no pre-authorized emergency disc is created by volatility |
| `INV-AGENCY-001` | README §Canonical Minimum Model | The indicator acquires no moral or legal agency; `H = 1` remains bound to a named human |
| `INV-LEGIT-001` | README §Canonical Minimum Model | Computation is delegated to the port; legitimacy stays at `0•000•000•0000` |
| `INV-G0-CLASS-001` | `canonical-model.md` §11.3 | Indicator states are diagnostic classifications, never operational phases. `extreme overbought` is not a `DeclaredPhase` |
| `INV-CORPUS-027a` | §13.2 | This document invents no invariant, symbol, or phase |

## 6. Implementation steps

### Step 1 — Register the node

1. `js/ocm-data.js` — append the node object from §3 to `nodes[]`. It is already re-exported
   (`return { …, nodes, … }`) and mirrored to `window.OCM_DATA`, so no export change is
   needed.
2. `js/apps-ocm.js` reads `OCM_DATA.nodes` at line 66 and derives the Fibonacci-sphere
   lattice from `nodes.length`, so the orb re-lays out automatically. Verify the node label
   and the degree-legend lookup at ~line 1293–1307 render `116 → "Markets"` and
   cluster `91–135 → "Knowledge & Intelligence"`.
3. `js/ocm-directory.js` needs no change: `parseAddress()` already accepts any
   `DDD ∈ {000..359}` and refuses `360` (`OCM-ADDR-SECTOR-CLOSURE`).

### Step 2 — Bind the reading, refusal-only

4. Feed the existing `GoodIntelligenceMarketContext.evaluate()` result into the node as
   read-only payload. **Do not** add a path from that payload to any authorization call.
5. Record each emitted reading in the Duty Ledger (`0•165•000•0006•PLV`) as
   `K_tech`-attributed telemetry, so provenance exists without any authority effect.
6. Keep the existing user-facing text intact: *"Price/volume context only — not source
   credibility, claim truth, investment advice, or permission to act."*

### Step 3 — Tests

7. `tests/ocm-directory-test.mjs` — add a case asserting `0•116•000•0012•MKT` parses, is not
   Center Origin, and that a message *from* it carries `authorityEffect: "NONE"`.
8. `tests/ocm-engine-test.mjs` — assert that no combination of indicator events can raise
   `V(S, t)` above `0`.
9. `tests/pine-scripts-docs-test.mjs` already guards the Pine documentation against drift
   from the shipped port.
10. Register any new test file in both `package.json` and `scripts/integrity-report.mjs`;
    CI fails the suite-inventory check if a test is left uncategorized.

## 7. Explicitly out of scope

- Order routing, order simulation, or anything resembling an execution edge.
- Letting an indicator event satisfy `V(S, t)`, `C(t)`, or `K(t)`.
- Volatility-triggered emergency contexts (`INV-EMERG-001`).
- Treating `synthetic: true` demo bars as live market data. The eight `*-DEMO` series are
  labelled synthetic and must stay that way.
- Claiming TradingView parity. `docs/GOOD-INTELLIGENCE-ASSURANCE.md` records that the
  translation *"has not been cross-validated bar-for-bar against TradingView."*

## 8. Open questions for the owner

1. Should **Good Intelligence** itself be registered as a node before Market Context, so
   the observation node has a sibling rather than appearing alone in the
   Knowledge & Intelligence cluster?
2. Is `r = 2.45` the right distance, or should externally-sourced telemetry sit even further
   out — accepting that the current render tops out at `2.1`?
3. Should the Duty Ledger record every emitted indicator event, or only those a human acted
   upon? The first is auditable but noisy; the second is quiet but loses provenance for
   events nobody acted on.
