# Incorporating Pine Script into the Orb Communicator Model

**Status:** the read-only Market Context node is registered; this document adds **no** new
invariant (per `INV-CORPUS-027a`). The node is a directory/visualization entry; a live OHLCV
payload binding into OCM is not implemented.

**Source archive:** [`scripts/pine/`](../../scripts/pine/README.md) contains Markdown copies of
the four Pine v6 scripts supplied for this work. The JavaScript market-context port is related,
but it is not a line-for-line Pine runtime and has not been cross-validated bar-for-bar against the supplied Pine runtime. Moon/Sun context is documented separately in
[`CELESTIAL-CONTEXT.md`](CELESTIAL-CONTEXT.md).

---

## 1. The short answer

A Pine Script indicator does **not** become an authority in OCM. Its outputs can be treated
as an **observation**: optional market data and derived values at Stage 2, *Representation*.
The observation may be addressed on the ℤ₃₆₀ ring, but it cannot provide identity,
authorization, continuity, accountability, or permission to act.

The registered address currently has no provider/data binding. **If** a payload edge is separately approved in the future, the only safe data path would be:

```text
provider OHLCV → validate and normalize → calculate/label indicator context
               → read-only OCM representation → Decision defaults to Refuse
```

No crossover, divergence, band break, or confluence event can move a request from Refuse to
Permit. That would require Stages 3–5 — Authorization `V(S, t)`, Continuity `C(t)`, and
Accountability `K(t)` — none of which an indicator supplies. This follows from
`INV-AXIS-001`: resolution is an authority-resolution mechanism, not an authority source.

## 2. What is being incorporated

The supplied Pine sources are now archived in `scripts/pine/`. The repository also has one
combined JavaScript market-context evaluator, `js/good-intelligence-market-context.js`.
These are related calculations, **not yet proven equivalent implementations**.

| Source document | Supplied indicator | Relevant JS code today | Coverage status |
| :--- | :--- | :--- | :--- |
| [`01-vfi-fibonacci-bands.md`](../../scripts/pine/01-vfi-fibonacci-bands.md) | VFI + Fibonacci Bands merged confluence overlay | `computeVfi()`, `computeBands()`, evaluator signals | Formula-level overlap; source-specific UI/runtime details and source parity remain unverified |
| [`02-wavetrend.md`](../../scripts/pine/02-wavetrend.md) | LAZY - WaveTrend Context Engine `[Pro]` | `computeWaveTrend()`, `mapHigherTimeframe()`, `divergenceEvents()` | Core formulas overlap; MTF, hidden-divergence, visual, and confirmation behavior differ |
| [`03-fibonacci-bollinger-bands.md`](../../scripts/pine/03-fibonacci-bollinger-bands.md) | Standalone Fibonacci Bollinger Bands | Shared `computeBands()` only | Partial: 0.236/0.500 lines, fills, and standalone basis alert are not emitted |
| [`04-moon-phases.md`](../../scripts/pine/04-moon-phases.md) | Third-party Moon Phases transcription (author/license unknown) | `js/celestial-context.js` → `moonAt()` | Approximate UTC event/phase readout; not a bar-for-bar Pine runtime port; provenance caveat applies |

The JS module remains a Good Intelligence calculation layer. `js/ocm-data.js` now registers a
read-only **Market Context** node for directory and OCM visualization. Its presence does not
imply provider connectivity, a live market feed, payload forwarding, or data parity. The market
context UI can display an optional local observation; OCM does not use that observation to
authorize or commit anything. Source-to-port parity remains unverified.

## 3. Registered sector and addresses

The degree legend in `js/ocm-data.js` already assigns:

> `116: "Markets"`

It is in the **Knowledge & Intelligence** cluster (`91–135`), near
`114: "Economic systems"`, `115: "Currency and value"`, `117: "Incentive design"`, and
`118: "Supply chains"`. No new degree or invariant is needed.

The read-only Market Context node is now registered with the existing `nodes[]` convention:

```js
{ app: "good-intelligence", name: "Market Context", addr: "0•116•000•0012•MKT", deg: 116, r: 2.45,
  sector: "Observation",
  note: "Optional provider OHLCV and indicator context. Read-only; never authorizes, overrides, or commits state." }
```

- **Degree 116** is the existing `Markets` meaning in the Knowledge & Intelligence cluster.
- **Instance `0012`** follows the twelve pre-existing nodes (`0000`–`0011`).
- **Radius `2.45`** is an OCM visualization/coupling setting, not a rank, distance in space, or
  authority claim.
- **App ID `good-intelligence`** resolves to the existing application in `APPS`.
- **Center Origin** remains the root; the observation is directly attached rather than nested
  under the Good Intelligence app.
- **Boundary:** registry presence does not bind an external provider, imply a live feed, or
  forward market payloads into OCM. Any future binding must stay read-only and separately tested.

The two celestial demonstration nodes are also registered and open the UTS application:

| Node | Address | Degree | App | Boundary |
| :--- | :--- | ---: | :--- | :--- |
| Sun | `0•009•000•0013•SUN` | 9 · Stellar influence and radiation | `uts` | Approximate annual apparent-position/declination context; **not** Moon-like phases, local sunrise/sunset, or solar activity |
| Moon | `0•163•000•0014•MOON` | 163 · Lunar presence | `uts` | Approximate phase and illumination display; no location-specific visibility or authority effect |

These are only the named Sun and Moon demonstration entries—not a modeled solar system.
All three addresses are validated against the current OCM directory parser.

## 4. Mapping onto the canonical decision path

The canonical minimum model is
`Identity → Representation → Authorization → Continuity → Accountability → Decision (Permit | Refuse)`.

| Stage | Canonical symbol | Market-context contribution | Can the indicator supply it? |
| :-- | :--- | :--- | :--- |
| 1 · Identity | `I` | Packet metadata such as `source`, `symbol`, `timeframe`, and `synthetic`; provider authentication remains upstream | **No** — a Pine calculation cannot authenticate its data provider |
| 2 · Representation | `R(t)` | Normalized OHLCV-derived values, e.g. `gi-market-analysis-v1`, VFI, bands, `wt1`/`wt2`, status, and display-only indicator events | **Yes — this is the entire contribution** |
| 3 · Authorization | `V(S, t)` | Nothing | **Never** (`INV-LEGIT-001`: legitimacy does not migrate) |
| 4 · Continuity | `C(t)` | Nothing | **Never** — requires the canonical continuity tuple and freshness rules |
| 5 · Accountability | `K(t)` | Nothing | **Never** — requires `K_tech × K_ops` bound to a human |
| 6 · Decision | `Permit \| Refuse` | No permission effect; absent Stages 3–5, default to Refuse | **No** (`INV-AGENCY-001`) |

An OCM representation should carry enough context to interpret the reading: source/provider,
symbol, timeframe, observation time/freshness, whether the bars are synthetic, and whether the
latest bar is confirmed. Missing, stale, invalid, or synthetic data must be labelled honestly,
not filled with invented values.

### Symbol namespace (`INV-SYM-001`)

`INV-SYM-001` requires each symbol to have exactly one canonical meaning. Keep these terms
distinct in OCM-facing documentation:

| Pine/market usage | OCM wording |
| :--- | :--- |
| VFI EMA reference line (`vfima` in the merged Pine source; `signal` in the JS result) | **VFI reference line** (a data field, not a canonical claim signal) |
| `alertcondition`, crossover, divergence, band break, or confluence | **indicator event** (display-only) |
| Ground-0 `signal` object | Reserve **signal** for the canonical claim-under-assessment meaning |

A market event is never an authorization, an emergency legitimacy source, or an instruction to
route an order.

## 5. Reconciliation required before relying on the JS port

The Markdown archive describes the supplied Pine code. The following differences must be
explicitly handled before claiming the existing JS output reproduces it:

| Topic | Supplied Pine behavior | Current JS behavior / implication |
| :--- | :--- | :--- |
| LAZY WaveTrend source name | Input is `src` | JS calls its parameter `wtSrc` |
| WaveTrend HTF | `request.security()` uses `raw_wt[barstate.isrealtime ? 1 : 0]` and `gaps_off` | JS maps supplied confirmed higher-timeframe candles; not the same contract |
| Hidden WaveTrend divergences | Pivot state is updated in regular-divergence blocks before hidden checks; the hidden comparison is against the current pivot and therefore does not fire | JS checks hidden divergence against the previous pivot before replacing it; this changes behavior |
| Regular-divergence display | `showRegDiv` gates plots, but not the `regBull`/`regBear` calculations or alert conditions | JS has its own event filtering/output contract |
| WaveTrend visuals and confirmation | Pine has cloud, histogram, crosses, extreme markers, and bar-color settings; no `confirmClose` input | Those visual settings are not JS parameters; the JS port applies its own `confirmClose` default |
| Standalone FBB levels | 0.236, 0.382, 0.500, 0.618, 0.764, and 1.000 | `computeBands()` exposes 0.382, 0.618, 0.764, and 1.000 only |
| FBB presentation/events | Includes chart fills and alerts for outer-band and basis crosses | JS is an analysis/data layer; standalone fills and the basis-cross alert are not implemented |
| Merged VFI/FBB range | Pine does not declare maxima for `vfiCoef` or `vfiVcoef` | JS normalization caps them at 10 and 100 |
| Volume requirement | Merged source calls `runtime.error()` when cumulative volume is not positive | The JS packet validator/evaluator does not reproduce the source runtime-error UI |

The source runtime's indicator seeding, pivot ties, gaps, real-time vs historical execution,
provider candle conventions, and the VWMA fallback should be compared on identical bars and
settings. The current repo test suite validates the JavaScript implementation and the Markdown
crosswalk; it does not establish source-runtime parity.

## 6. Axiom and invariant conformance

| Constraint | Source | How the registered directory node satisfies it |
| :--- | :--- | :--- |
| Single-Origin Axiom | `js/ocm-data.js` `axioms[0]` | Registered address is derived from Center Origin (`0•116•…`) |
| Direct Attachment Axiom | `axioms[1]` | Registered observation attaches to the center, not under the Good Intelligence app |
| Lateral Communication Axiom | `axioms[2]` | Nodes may read the observation under existing OCM routing rules |
| Ownership Non-Transfer Axiom | `axioms[3]` | Reading a market event transfers no authority; the payload is read-only |
| Collapse-on-Origin-Removal | `axioms[4]` | The observation node has no origin rights |
| `INV-AXIS-001` | `canonical-model.md` §8.1 | Market indicators are telemetry, not authority-resolution mechanisms |
| `INV-OCM-PRECEDENCE-001` / `-003` | §Routing | No lateral route is introduced for authority; resolution remains on the canonical path |
| `INV-OCM-LATERAL-002` | §Routing | Forwarded indicator events cannot authorize, override, or commit state |
| `INV-EMERG-001` | §Emergency | A flash crash or extreme indicator reading cannot create legitimacy or an emergency permit |
| `INV-AGENCY-001` | README §Canonical Minimum Model | Indicators acquire no moral or legal agency; `H = 1` remains bound to a named human |
| `INV-LEGIT-001` | README §Canonical Minimum Model | Computation may be delegated; legitimacy remains at Center Origin |
| `INV-G0-CLASS-001` | `canonical-model.md` §11.3 | Indicator labels are diagnostic classifications, never operational phases |
| `INV-CORPUS-027a` | §13.2 | This design introduces no invariant, symbol, or phase |

## 7. Implementation path if approved

1. **Choose parity scope.** Decide whether the merged VFI/FBB and LAZY WaveTrend sources are
   the intended JS behavior, and whether the standalone FBB must also be ported with its extra
   ratios, fills, and basis alert. Do not silently merge the two band specifications.
2. **Build parity fixtures.** Use identical historical OHLCV bars and settings in a Pine runtime
   and the JS evaluator. Compare warm-up values, standard deviations, moving averages, HTF
   mapping, pivots, and events; document any accepted differences.
3. **Reconcile the JS layer.** Update calculation/input contracts only after parity results
   are recorded. Preserve validation, synthetic-data labels, and the display-only warning.
4. **Keep the data boundary explicit.** Normalize market bars into the existing
   `gi-market-context-v1` packet, evaluate locally, and label the output
   `gi-market-analysis-v1`. Do not accept a Pine alert as provider authentication or a claim
   verifier.
5. **Node registration (done).** `0•116•000•0012•MKT` is present in `js/ocm-data.js` and
   opens the existing Good Intelligence app. This is an addressable, read-only directory entry;
   no provider or payload edge is implied.
6. **Future OCM payload binding (not done).** If separately approved, expose only validated, freshness-labeled observation data as
   Representation. Never add a path from an indicator field/event to authorization, ledger
   commitment, order routing, or a Permit decision.
7. **Test boundaries.** Verify valid/invalid/stale/synthetic packets, no-data behavior, and
   that no combination of market events changes the canonical refusal default. Register any
   new test file in `package.json` and `scripts/integrity-report.mjs`.

## 8. Explicitly out of scope

- Order routing, order simulation, or execution edges.
- Letting an indicator event satisfy `V(S, t)`, `C(t)`, or `K(t)`.
- Volatility-triggered emergency contexts (`INV-EMERG-001`).
- Treating synthetic demo bars as live market data.
- Claiming the current JavaScript port is source-runtime-identical before parity testing.
- Live external-provider integration or forwarding market payloads into OCM; the registered Market Context node is a directory/visualization entry only.
