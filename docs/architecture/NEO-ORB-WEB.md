# NEO ORB — the web app

**Status:** display-only · local · static roster snapshot
**Files:** `js/neo-orb-model.js` (geometry) · `js/apps-neo-orb.js` (window app) · `css/neo-orb.css` · `tests/neo-orb-test.mjs`
**Window:** **NEO ORB** in the app list, placed right after **Orb 2**.

NEO ORB combines two existing browser visuals in one window:

| Source | What NEO ORB takes |
| --- | --- |
| **The Orb** (`js/apps-ocm.js`, `js/orb-flame.js`, `js/flame.js`) | The two shared fractal flame engines — `Demo.flame` (inner core, 120 frames) and `OuterOrb.flame` (outer shells, 600 frames) — composited additively behind the sphere; the rendered sphere film wrapped through The Orb's camera; the 90-second rotation cadence; the disc-to-sphere formation. |
| **Orb 2** (`js/good-intelligence-market-roster.js`, `js/good-intelligence-orb2.js`) | The 52-asset roster as display-only orbs; logarithmic market-cap bands; the ±4 % beat motion; the phase shift for the NAB / CWO / GSRB display rotations. |

## Boundary

NEO ORB is a display. It reads no kernel state, gate, ledger, declaration, or personal core. It calls no provider and no `/api/` route, and it writes no storage. A roster orb's sector is a shape coordinate, not an address, endpoint, rank, or grant. A market-cap band is a display convention, not a valuation. The phase dial is a rotation the viewer chooses; it does not declare anything. The test suite asserts that the app and model reference none of the forbidden channels.

## Geometry (`neo-orb-model.js`)

For node `i` of `n`, with sector `s`, depth `d`, formation `f`, and axes `(a_x, a_y, a_z)`:

```text
θ = 2π(s / 360) − π/2
φ = 0.62 × asin(1 − 2(i + 0.5) / n)
R_b = 0.44 × 1.45^b,  b ∈ {0…5}
r = (0.24 + 0.76 × R_b / R_5) × (0.88 + 0.12d)

D = (r cos θ, 0, r sin θ)                       disc
S = (r cos φ cos θ, r sin φ, r cos φ sin θ)     sphere
P = lerp(D, S, f) ⊙ (1 + (a − 1) f)             per axis
```

- **Sector:** 64-bit FNV-1a of the uppercased symbol, modulo 360. Pinned values: NVDA 38, AAPL 307, SPCX 21, BRK.B 18.
- **Band:** `13 − floor(log10(market cap))`, clamped to 0…5. $10B → band 3, $100B → band 2, $1T → band 1. Smaller caps sit farther out.
- **Kind (color):** Technology and Industrials → structural; Financial Services and Energy → interaction; everything else → field.
- **Berths:** nodes are visited in a stable identity-hash order. A node closer than `0.12 × berth` to an already-placed node tries nearby longitudes, then latitude rings, then a widest-angle fallback. The source identity, sector, and band are never changed.
- **Convergence:** `clamp(1 − max|a − 1| / 0.35, 0, 1)`. This measures shape deformation only. It is not a health, trust, or correctness signal.

Dials are validated and refused when out of range. Nothing is clamped silently inside the model. The UI clamps its own sliders to the same bounds.

## Controls

- **Shape:** formation, axes X/Y/Z, berth separation, phase.
- **Motion & layers:** rotation speed, orb size, flame and film opacity, and toggles for inner flame, outer flame, film, orbs, labels, spokes, bands, and beat.
- **Inspector and roster list:** choose a symbol on the sphere or in the list. The inspector shows the issuer sector, snapshot rank, market-cap label, display sector, band, berth status, and the display-only disclaimer.
- **Keyboard and assistive tech:** the roster list is a real button list, so every orb is reachable without the pointer.

Drag to rotate. Click an orb to select it. Reduced-motion users start paused.

## Known limits

- **Static roster.** Orb 2's live beats, saved beats, and Worker-driven market context are not wired into NEO ORB. Every orb uses the reviewed roster snapshot (as of 2026-10-02) and its neutral kind colors. Day direction is not shown.
- **Visual check.** The geometry, the draw path, and the input handling are covered by tests against a recording canvas stub. The look has not been checked in a real browser from this environment; do that before shipping.
- **Asset load.** The flame and film layers need `assets/Demo.flame`, `assets/OuterOrb.flame`, `assets/flame/`, `assets/outer_flame/`, and `assets/orb/`. If any is missing, that layer reads *unavailable* and the rest still draws.

## Tests

```bash
npm run test:neo-orb
```

`tests/neo-orb-test.mjs` covers:

- the pinned sector hashes and the band convention;
- the 1.45 radial ratio and the disc's equatorial plane;
- ideal-axis convergence, deformation, and identity stability;
- the 359 sector fail-closed boundary and refused out-of-range dials;
- berth separation, switched off and on, and deterministic;
- the 52-orb roster mapping;
- window registration, mount, dial clamping, inspector facts, and shared-engine handling;
- a full draw with both flames and the film, and orb hit-testing;
- the forbidden-channel scan and the page wiring.
