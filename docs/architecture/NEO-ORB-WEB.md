# NEO ORB — the web app

**Status:** display-only · local · static roster snapshot
**Files:** `js/neo-orb-model.js` (geometry) · `js/neo-orb-placement.js` (flame-guided dynamic placement) · `js/apps-neo-orb.js` (window app) · `css/neo-orb.css` · `tests/neo-orb-test.mjs` · `tests/neo-orb-placement-test.mjs`
**Window:** **NEO ORB** in the app list, placed right after **Orb 2**.

NEO ORB combines two existing browser visuals in one window:

| Source | What NEO ORB takes |
| --- | --- |
| **The Orb** (`js/apps-ocm.js`, `js/orb-flame.js`, `js/flame.js`) | The two shared fractal flame engines — `Demo.flame` (120 frames) and `OuterOrb.flame` (600 frames) — read as a density field that steers the orbs. The flames are **never drawn**. The 90-second rotation cadence and the disc-to-sphere formation carry over. |
| **Orb 2** (`js/good-intelligence-market-roster.js`, `js/good-intelligence-orb2.js`) | The 52-asset roster as display-only orbs; logarithmic market-cap bands; the ±4 % beat motion; the phase shift for the NAB / CWO / GSRB display rotations. |

## Boundary

NEO ORB is a display. It reads no kernel state, gate, ledger, declaration, or personal core. It calls no provider and no `/api/` route, and it writes no storage. A roster orb's sector is a shape coordinate, not an address, endpoint, rank, or grant. A market-cap band is a display convention, not a valuation. The phase dial is a rotation the viewer chooses; it does not declare anything. The test suite asserts that the app and model reference none of the forbidden channels.

## Dynamic placement (`neo-orb-placement.js`)

The orbs move. The flame engines do not show; they guide.

1. **Read.** About ten times a second, each ready flame player's current frame is drawn at 40×40 onto a hidden scratch canvas and read back as pixels. `Demo.flame` is weighted 0.6 and `OuterOrb.flame` 0.4. The two are blended into one density field, with luminance raised to γ = 1.6 and masked to the unit disc.
2. **Bits.** The field is smoothed, and up to 24 bright bits are chosen across the disc: brightness-weighted farthest-point selection with a 0.18 spacing. A flame's core is usually one broad maximum, so plain local maxima would pile every orb onto one spot.
3. **Travel.** Each orb is a damped spring pulled toward a bit it selects by a deterministic hash of `(symbol, epoch)`, weighted by brightness² and penalized for bits that already hold armed orbs. The bit it is already on is excluded. The field gradient steers the orb through transit and fades out on arrival, so the orb settles on the bit rather than parking beside it. While guided, a hard spacing pass keeps every pair at least 0.16 apart in 3D, measured with the model's own geometry (the berth check's metric), so the berth check never has to re-slot a guided orb. A soft spacing force adds smoothness. Dwell time at each bit is scaled by √mass and varied per bit, so the fleet does not move in lockstep.
4. **Place.** The placed offsets go to `makeShape({ placements })`. The model keeps radius, identity, and berth separation. Guided orbs clear the berth floor on their own, so the berth check does not re-slot them.

### What the data controls

| Input | Controls | Does not control |
| --- | --- | --- |
| Symbol hash (sector) | The **home** anchor. An orb roams only inside a tether around its own sector. | Identity. The sector is still the orb's address on the ring. |
| Market-cap band | The **radius**, and the **inertia**: larger caps are heavier and move more slowly. | Value. Inertia is a display convention, not a valuation. |
| Flame bitmaps | Where an orb heads next, and its path in transit. | What the orb is. No data is encoded in the flame. |

The **Roam** dial (default 0.8) scales the tether: 0 pins every orb to home, and 1 allows about 69° of longitude and 52° of latitude. The **Flame-guided placement** layer switches motion off, and the shape returns to home.

### Motion guarantees (asserted by `neo-orb-placement-test.mjs`)

- **Deterministic:** the same field and inputs give the same placements.
- **Smooth:** no orb steps faster than its mass-capped speed (0.45 rad/s ÷ √mass).
- **Bounded:** every orb stays inside its roam tether, however long it runs.
- **Honest fallback:** with no flame guidance, every orb rests exactly at home. The status line says so.
- **Alive:** every orb moves on to new bits within 30 s, and the fleet never rests for more than 2 s.

## Geometry (`neo-orb-model.js`)

For node `i` of `n`, with sector `s`, depth `d`, formation `f`, and axes `(a_x, a_y, a_z)`:

```text
θ = 2π(s / 360) − π/2
φ = 0.62 × asin(1 − 2(i + 0.5) / n)               raw latitude, relaxed below
R_b = 0.44 × 1.45^b,  b ∈ {0…5}
r = (0.24 + 0.76 × R_b / R_5) × (0.88 + 0.12d)

D = (r cos θ, 0, r sin θ)                       disc
S = (r cos φ cos θ, r sin φ, r cos φ sin θ)     sphere
P = lerp(D, S, f) ⊙ (1 + (a − 1) f)             per axis
```

- **Home:** the sector fixes the longitude and the list position fixes the latitude. Those raw anchors collide (two sectors that land close, with neighbouring indices, share a slot), so they are relaxed once and deterministically. Each home is pushed apart until no pair is closer than 0.16 in 3D, and stays within 1.0 rad of its sector longitude and 0.8 rad of latitude. Relaxation moves a home's longitude by 0.07 rad on average (0.35 rad at most) and is cached per roster. `homesFor()` returns the relaxed anchors for the placer. `makeShape()` accepts optional `placements` that move each orb's starting point; with no placements, geometry is unchanged.
- **Sector:** 64-bit FNV-1a of the uppercased symbol, modulo 360. Pinned values: NVDA 38, AAPL 307, SPCX 21, BRK.B 18.
- **Band:** `13 − floor(log10(market cap))`, clamped to 0…5. $10B → band 3, $100B → band 2, $1T → band 1. Smaller caps sit farther out.
- **Kind (color):** Technology and Industrials → structural; Financial Services and Energy → interaction; everything else → field.
- **Berths:** nodes are visited in a stable identity-hash order. A node closer than `0.12 × berth` to an already-placed node tries nearby longitudes, then latitude rings, then a widest-angle fallback. The source identity, sector, and band are never changed. At rest the relaxed homes need no berth moves; the berth resolver acts only when placements crowd.
- **Convergence:** `clamp(1 − max|a − 1| / 0.35, 0, 1)`. This measures shape deformation only. It is not a health, trust, or correctness signal.

Dials are validated and refused when out of range. Nothing is clamped silently inside the model. The UI clamps its own sliders to the same bounds.

## Controls

- **Shape:** formation, axes X/Y/Z, berth separation, phase.
- **Motion & layers:** rotation speed, orb size, the Roam dial, and toggles for orbs, flame-guided placement, labels, spokes, bands, and beat. The status panel reports both flame guidance sources and the placement state.
- **Inspector and roster list:** choose a symbol on the sphere or in the list. The inspector shows the issuer sector, snapshot rank, market-cap label, display sector, band, berth status, and the display-only disclaimer.
- **Keyboard and assistive tech:** the roster list is a real button list, so every orb is reachable without the pointer.

Drag to rotate. Click an orb to select it. Reduced-motion users start paused.

## Known limits

- **Static roster.** Orb 2's live beats, saved beats, and Worker-driven market context are not wired into NEO ORB. Every orb uses the reviewed roster snapshot (as of 2026-10-02) and its neutral kind colors. Day direction is not shown.
- **Visual check.** The geometry, the placement dynamics, the draw path, and the input handling are covered by tests. The placement was also reviewed offline: real flame frames were baked, and home and guided layouts were rendered to a PNG outside the repository. The live look in a real browser has not been checked from this environment; do that before shipping.
- **Asset load.** Guidance needs `assets/Demo.flame` with `assets/flame/`, and `assets/OuterOrb.flame` with `assets/outer_flame/`. If a source is missing, its guidance reads *unavailable*. If both are missing, every orb rests at home and the status says so.
- **Sphere film removed from view.** The author's sphere film was a flame render, so it is no longer drawn or loaded by NEO ORB. Restoring it would be a deliberate decision.
- **Drift is moderate.** Real flame cores sit near the middle of the bitmap, so orbs travel a moderate distance from home. On real flame frames, a 30 s run at Roam 0.6 gives a mean of 6.8° and a maximum of 20.5°; at the default 0.8 the mean is 10.0°. The latitude tether is wider than before, so the maximum is higher. Raise Roam for more travel.
- **Volume.** On real flame frames, the fleet covers about 25% more lat×lon cells over 60 s than it did before the separation pass (186 vs 149), and each orb visits about 7.5 cells on average (6.4 before). A wider longitude tether adds little more and also lengthens each orb's travel, so it is not used.

## Tests

```bash
npm run test:neo-orb
```

Both files run under `test:neo-orb`, and `scripts/integrity-report.mjs` lists both.

`tests/neo-orb-test.mjs` covers:

- the pinned sector hashes and the band convention;
- the 1.45 radial ratio and the disc's equatorial plane;
- ideal-axis convergence, deformation, and identity stability;
- the 359 sector fail-closed boundary and refused out-of-range dials;
- berth separation, switched off and on, and deterministic;
- the 52-orb roster mapping;
- window registration, mount, dial clamping, inspector facts, and shared-engine handling;
- a full draw with guided orbs, the flame engines read but never drawn, and orb hit-testing;
- guidance read from a scratch canvas, and the forbidden-channel scan and page wiring.

`tests/neo-orb-placement-test.mjs` covers the pure math with synthetic bitmaps: field construction, bit spread, determinism, smoothness, tether, roam, inertia, reset, a fleet that keeps moving, and the model's placement invariants (radius, home, and berths preserved). It also checks that guided orbs never re-slot over 12 s of the full roster: no frame re-slots an orb, and every placed pair clears the berth floor.
