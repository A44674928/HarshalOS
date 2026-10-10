# NEO ORB — native shape-model contract

**Status:** display-only local geometry
**Package:** `Packages/NeoOrb`
**Renderer:** `HarshalNative/Features/NeoOrbView.swift`

NEO ORB is the first native visual model that deliberately combines the two
existing browser concepts without inheriting a claim of external knowledge or
control:

| Source concept | NEO ORB contribution |
| --- | --- |
| **The Orb** (`js/apps-ocm.js`, `docs/harshal-systems/05-ocm-orb.md`) | Center Origin, the discrete 360-sector ring, direct center-to-node attachments, and a disc-to-sphere formation transition. |
| **Orb 2** (`js/good-intelligence-orb2.js`, `docs/architecture/ORB2-TOPOLOGY.md`) | Spheroidal X/Y/Z axes, logarithmic radial bands, topological placement, a visible convergence measure, and radius-aware display berth separation. |

The package is intentionally pure Swift/Foundation. It has no SwiftUI, network,
CloudKit, persistence, route resolution, provider, identity, gate, or authority
dependency. The SwiftUI view only renders a deterministic local fixture and
allows a user to inspect the visual geometry.

## Shape inputs

A `NeoOrbConfiguration` has:

- `formation` — finite value from `0...1`; zero is the pedagogical disc and one
  is the fully formed spheroid;
- `axes` — finite X/Y/Z values from `0.25...2`; `(1, 1, 1)` is the ideal sphere;
- `nodes` — named display nodes with a stable local ID, sector `0...359`, bounded
  intra-band depth `0...1`, radial-band index `0...5`, and display kind;
- `berthSeparation` — finite display-only value from `0...1`; zero preserves
  exact overlap and one applies the full local chord-distance floor.

The provided fixture is explicitly synthetic. Its sectors are shape coordinates,
not network endpoints, OCM lookups, property records, destinations, or grants
of control.

## Deterministic geometry

For node `i` of `n`, with sector `s`, depth `d`, formation `f`, and configured
axes `(a_x, a_y, a_z)`, the current v1 model uses:

```text
θ = 2π(s / 360) − π/2
φ = 0.62 × asin(1 − 2(i + 0.5) / n)
R_b = 0.44 × 1.45^b, for b ∈ {0, 1, 2, 3, 4, 5}
r = (0.24 + 0.76(R_b / R_5)) × (0.88 + 0.12d)

D = (r cos θ, 0, r sin θ)                       // The Orb disc
S = (r cos φ cos θ, r sin φ, r cos φ sin θ)     // equal-area spheroid seed
B = lerp(D, S, f)
A_f = (1 + (a_x − 1)f, 1 + (a_y − 1)f, 1 + (a_z − 1)f)
P = B ⊙ A_f
```

`φ` is a stable equal-area *display distribution* based on fixture order. It is
not a person, node, quality, popularity, risk, or market ranking.

The band radius determines the primary synthetic radial berth while `d`
provides only bounded variation within that band. It is not a measurement,
ranking, or claim about the node.

### Deterministic berth separation

After primary geometry is determined, NEO ORB optionally resolves only display
collisions. Nodes are visited in a stable FNV-1a identity phase. The first node
whose point clears the floor remains at its source longitude/latitude. A later
node that is closer than

```text
minimumChordDistance = 0.12 × berthSeparation
```

tries symmetric nearby longitude slots, then bounded latitude rings, before a
deterministic widest-angle fallback. The resolver preserves the node ID, sector,
source longitude/latitude, selected band, band radius, and all source inputs; it
reports each node it re-slots as `wasReslotted`.

This is collision-aware display spacing, not a new topology source. It never
calculates a market value, changes a source metric, ranks a node, drops a node,
changes an address, sends a route, or confers a right.

The visual convergence reading compares the configured axes to the ideal sphere:

```text
convergence = clamp(1 − max(|a_x − 1|, |a_y − 1|, |a_z − 1|) / 0.35, 0, 1)
```

It is a shape-deformation indicator only. It does not claim system health,
truth, trust, consensus, identity, authorization, performance, or correctness.

## Native rendering behavior

`NeoOrbView` uses SwiftUI `Canvas` and `TimelineView` to show:

1. logarithmic latitude bands;
2. rotating local longitude traces;
3. direct attachments from the center origin to each display node;
4. kind-colored synthetic nodes, with an accessible selected-node inspector;
5. user-controlled formation, spheroid axes, and display-only berth-separation amount.

The view has no mutable effect beyond ephemeral SwiftUI control state. It is reachable
immediately through **Preview NEO ORB** on the first-run declaration screen and,
after a declaration, through the **NEO ORB** dashboard tab. Restoring the sample
only resets local display state.

## Non-negotiable boundary

NEO ORB must not be used to:

- invoke, bypass, or satisfy the refusal-first gate;
- decide a declaration phase or local acknowledgement;
- identify, authenticate, profile, score, rank, or assess a person;
- make a market/provider claim or receive unreviewed external facts;
- resolve an OCM address, direct a message, or route a transaction;
- grant authority, permission, ownership, or operational status; or
- represent a synthetic node or local geometry value as an independent proof.

Any future external field must be designed as a separately reviewed, read-only
adapter. It needs a documented schema, provenance, minimisation/retention
policy, failure behavior, fixture set, accessibility review, and tests. Its
output must remain visibly distinct from the synthetic fixture and must not
alter gate, ledger, declaration, or authorization state merely by being
rendered.

## Tests

`NeoOrbTests` asserts that:

- disc formation keeps all display nodes on the equatorial plane;
- ideal axes yield full geometric convergence;
- deformation lowers convergence without changing stable node identity;
- the sector domain fails closed at 359;
- successive radial bands retain the documented geometric ratio and affect radial berths; and
- colliding local display nodes are deterministically re-slotted only when berth separation is enabled.

Run on macOS with Xcode/Swift installed:

```bash
cd native/HarshalNative/Packages/NeoOrb
swift test
```
