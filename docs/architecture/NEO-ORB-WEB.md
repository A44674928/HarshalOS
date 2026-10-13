# NEO ORB — the web app

**Status:** display-only · local · static roster snapshot · **one stored field read** (its own Worker route, at most every 20 s) · distance from the centre is the instability extension
**Files:** `js/market-extension.js` (the extension measure, shared with Orb 2) · `js/neo-orb-signals.js` (the Orb 2 price mechanisms: six-envelope depth, composed position, VFI flow, pressure) · `js/neo-orb-black-hole.js`, `js/neo-orb-quasar.js`, and `js/neo-orb-reinsurance.js` (Black Hole Computing, Quasar Mode, and Reinsurance Mode, from the spec) · `js/neo-orb-model.js` (geometry, the depth shell, and the instability region) · `js/neo-orb-placement.js` (flame-guided dynamic placement) · `js/neo-orb-field.js` (the feed switch and its one read) · `js/neo-orb-market.js` (colour rules) · `js/apps-neo-orb.js` (window app) · `css/neo-orb.css` · `tests/market-extension-test.mjs` · `tests/neo-orb-test.mjs` · `tests/neo-orb-placement-test.mjs` · `tests/neo-orb-market-test.mjs` · `tests/neo-orb-feed-boundary-test.mjs`
**Window:** **NEO ORB** in the app list, placed right after **Orb 2**.

NEO ORB combines two existing browser visuals in one window:

| Source | What NEO ORB takes |
| --- | --- |
| **The Orb** (`js/apps-ocm.js`, `js/orb-flame.js`, `js/flame.js`) | The two shared fractal flame engines — `Demo.flame` (120 frames) and `OuterOrb.flame` (600 frames) — read as a density field that steers the orbs. The flames are **never drawn**. The 90-second rotation cadence and the disc-to-sphere formation carry over. |
| **Orb 2** (`js/good-intelligence-market-roster.js`, `js/good-intelligence-orb2.js`) | The 52-asset roster as display-only orbs; logarithmic market-cap bands; the ±4 % beat motion; the phase shift for the NAB / CWO / GSRB display rotations; the stored Orb 2 field as the one descriptive read; and `js/market-extension.js`, the measure both apps use for distance from the centre. |

## Boundary

NEO ORB is a display. It reads no kernel state, gate, ledger, declaration, or personal core, and it makes **exactly one kind of request**: a same-origin `GET` of its own Worker's stored Orb 2 field route, from the one module that owns it (`js/neo-orb-field.js`), at most every 20 seconds. That read is `credentials: "same-origin"`, `cache: "no-store"`, `redirect: "error"`, with no body. No file on the NEO ORB surface — app, model, placement, colour math, extension math, page boot, stylesheet — holds any other network primitive, and no file names a host. NEO ORB calls no third-party host, calls no provider, and writes no storage.

The feed was cut on 2026-10-11 to keep company market data out of a display, and **re-opened deliberately the same day**: NEO ORB is the destination for the instability-extension model, and a distance from the centre cannot be drawn from data the app is not allowed to read. The switch that closed it is still there and still fail-closed. `FEED_CUT` in the reader is the one place the feed is opened or closed, and the app follows it: unless that module explicitly declares `FEED_CUT === false`, nothing is read, nothing is polled, every orb stays neutral, and every orb stays on its band shell, with the cut named in the Status panel, the inspector, the colour legend, and the footer. A stub reader that offers rows without the declaration is refused, so a stray edit cannot smuggle a feed back in.

**Distance from the centre is a display of instability, not a judgement.** It is derived only from stored rows the Worker already wrote: the larger of continuous `|wt1|` against the reviewed ±53…±70 WaveTrend thresholds and the close's logarithmic distance from the FBB basis to its ±1000 envelope. An instrument with neither reading is labelled *unmeasured* and keeps its band shell — it is never shown as calm, stable, or safe.

**Orb 2's own feed was never the thing to cut, and it is not gated.** The Worker's Orb 2 pipeline calls its providers (Massive, Tickerbot, Kraken, Alpha Vantage) on its own schedule and serves `/api/good-intelligence/v1/orb2/field` to the apps meant to read it. The former `ORB2_COMPANY_FEEDS` gate and `worker/orb2-company-feed-gate.mjs` are removed. Orb 2 also reads the same extension measure and pushes an observed orb outward by its WaveTrend half (see `docs/architecture/ORB2-TOPOLOGY.md`), so the two apps agree about what "far out" means.

A roster orb's sector is a shape coordinate, not an address, endpoint, rank, or grant. A market-cap band is a display convention, not a valuation. The phase dial is a rotation the viewer chooses; it does not declare anything. The test suite asserts that no NEO ORB file references a forbidden channel.

## Black Hole Computing, Quasar Mode, and Reinsurance Mode (`js/neo-orb-black-hole.js`, `js/neo-orb-quasar.js`, `js/neo-orb-reinsurance.js`)

Deployed from `docs/harshal-systems/12-ground-zero.md`: **Black Hole Computing (BHC)**, a compute modality; **Quasar Mode**, a spheroid body; and **Reinsurance Mode**, a spheroid of spheroids. The term "gravity processor" in the request is taken to mean Black Hole Computing.

**Data flow (outward only):** one stored row per orb → `NeoOrbBlackHole.deepen` (one reading per orb) → `NeoOrbQuasar.spheroid` (aggregates per issuer-sector buffer, and for the roster) → `NeoOrbReinsurance.systemic` (a slow snapshot over the buffers, read at most every 15 minutes and held between reads). Nothing returns to the field, to colour, or to the model.

**What each reading does on screen (display only):**

| Part | Read by | What it shows |
| --- | --- | --- |
| Orb brightness | `drawOrb`, through `litFor` | Glow strength and width follow Orb 2's pressure. An orb with no depth is dark: no glow, and a dimmed body. |
| Orb motion | `setPressures` in `js/neo-orb-placement.js` | Pressure sets the flame-steering gain from 0.6× to 1.4× per orb. Null is neutral. The speed cap does not change. |
| Quasar shell | `drawGravityShells` | A ring at the roster's mean depth, with the 95 % interval as a faint band. Its opacity follows the tail share. |
| Reinsurance halo | `drawGravityShells` | Three soft rings outside the instability region (1.5 + 0.14 in model radius). Brighter with synchrony. |
| Status lines | `readouts` | The text from each module's `describe`, including the Reinsurance read time. |
| Inspector | `renderInspector` | The selected orb's BHC reading as text: depth, position, flow, pressure, force, and authority. |

The shells and the halo use the model's own radii. Depth maps to radius as `0.36 + 0.64 × depth`. The halo sits outside the instability region's outer edge. All of them use the bands' neutral tone, so blue and yellow stay reserved for market state.

| Spec | Deployed as |
| --- | --- |
| BHC is capability only: no phase, authority, legitimacy, or decision (§2–§4, §9) | Each reading carries `authority: "none"`. Colour, the model's homes, and the phase dial are unchanged. |
| Bound by the host PDH (§8) | NEO ORB declares no PDH of its own. Its declared host scope is display-only, with authority `none`, so BHC engages. A host that declares any authority makes `engage` refuse. |
| No legitimacy claims pass through (§7–§8) | A reading holds numbers and state names only. Stored text (`reason`, `status` notes, and so on) is never copied. |
| Quasar: aggregates risk and describes fragility (§2, §6) | Aggregates only: a distribution over five fixed depth bands, the mean depth with a 95 % interval, tail shares (depth ≥ 0.8, pressure ≥ 0.6), dispersion, and coverage (the measured share, which is the buffer). |
| Non-prioritised, no symbols, no ranking (§6, §3.1) | No symbol, rank, order, or remedy is returned. Results do not depend on roster or buffer order. Per-orb brightness comes from BHC, which is per-orb by design. Quasar's shell is roster-level. |
| Reinsurance: inputs are whole spheroids, not events; slow, coarse, non-binding (§1–§3, §6) | Inputs are Quasar outputs, one per issuer-sector buffer. Buffers with fewer than two measured orbs are unmeasured, not calm. Shares and envelopes are rounded to tenths. The cadence is 15 minutes, a deliberate choice, and the snapshot is held between reads. |
| Reinsurance: exposes limits, never what must be done (§7) | Output is the envelope, synchrony, and deep-buffer share. It declares no emergency and recommends no reallocation. |
| Stateless or snapshot only: no learned preference (§4, §5) | Quasar recomputes from the current rows. Reinsurance holds only its last snapshot. |
| Nested hourglass (§8) | The flow is one way: rows → BHC → Quasar → Reinsurance → halo. No function reads the halo back. |
| Feed cut (the NEO ORB boundary) | If the feed is cut, the readouts say so, nothing is computed, the orbs are neutral, and the shells and halo are not drawn. |

**Not deployed, on purpose:** the *Insurance Mode* status banner in `13-whyland.md`, and the spec's Gate Orb refusal. The Gate Orb refusal is not built, because NEO ORB takes no compute-based legitimacy claims as input.

**Limits:** a single snapshot cannot show correlation over time, so "synchrony" means buffers have deep tails at the same reading, not that they move together. No exhaustion horizon is estimated, because that needs a history the app does not keep. The fixtures in the live tests carry only the 1000 envelope, so their depths are unmeasured and the readouts say so. A depth needs the full six-level ladder, as the stored-levels fix requires.

**Tests:** `tests/neo-orb-gravity-test.mjs` (hand-computed numbers and the spec invariants, including Reinsurance), `tests/neo-orb-placement-test.mjs` (pressure steers harder, null is neutral, unknown ids are refused, the speed cap holds), and `tests/neo-orb-test.mjs` (a frame with the shell, halo, and dark orbs drawn).

## Data path (what NEO ORB reads, and what it never touches)

| Path | Status |
| --- | --- |
| NEO ORB → Orb 2 field route (`/api/good-intelligence/v1/orb2/field`) | **Open, and the only read.** One relative `GET` (`?interval=1d`, or `1h` when the interval dial asks for it), at most every 20 s, from `js/neo-orb-field.js` alone. A failed read is labelled in Status and keeps the last good colours and extensions. Closing it again is one literal in that module — `FEED_CUT = true` — plus `tests/neo-orb-feed-boundary-test.mjs` and this document. |
| NEO ORB → any company, provider, or third-party host | None. No absolute or protocol-relative URL exists in the NEO ORB files or stylesheet, and only the reader holds a network primitive: `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, and `sendBeacon` appear nowhere else on the surface, and the reader's code holds exactly one call site. The test suite enforces this. |
| NEO ORB → its own origin (flame assets) | The other requests the page makes are for its own files: the two `.flame` documents and their pre-rendered slices, loaded by the shared flame engines in `js/flame.js`. That is asset loading, not a data feed. |
| Orb 2 field route → upstream market providers (Massive, Tickerbot, Kraken, Alpha Vantage) | **Open.** Orb 2's pipeline is not gated: the cron tick, the manual tick, the priority and warm POSTs, and the Tickerbot bars route all run on their own ledgers and caps. Stored field rows are still served to whoever reads them. |
| Site shell (`index.html`) → other apps that connect to companies (LLM → Google Generative Language, community pages → Cloudflare Turnstile, Materials Project, research app → CourtListener, Federal Register, GovTrack, GDELT, Internet Archive, Wikipedia/Wikidata, r.jina.ai) | Runs in the same document as NEO ORB, but outside NEO ORB. A page-wide Content Security Policy would break those apps, so the shell is not changed here. |

NEO ORB also runs as its own document at `/neo-orb` (`neo-orb.html`). Its policy is `connect-src 'self'`, so the browser itself refuses any other connection from that page. The Worker sends the same policy as a header, with `frame-ancestors 'none'`, from one constant in `worker/neo-orb-page.mjs`. The shell (`index.html`) keeps the other apps and is not changed by this.

## Depth shell (`js/neo-orb-signals.js`, `js/neo-orb-model.js`)

NEO ORB follows Orb 2's radius. Orb 2 places each orb by its close's log distance through the reviewed Fibonacci envelopes, not by market cap. NEO ORB now does the same: the depth `δ` is the mean, over the six envelopes (236, 382, 500, 618, 764, 1000), of `min(|c|, 1)`, where `c` is the close's log distance from the basis in units of that envelope's own log half-width. `δ = 0` at the basis and `δ = 1` at the ±1000 envelope on average. A partial ladder is unmeasured, never a depth.

Two consequences follow from the mechanism, and they are deliberate:

- **Most of the field sits on one shell.** Inside the ±1000 envelope the radius rises only with depth, and beyond it the instability region takes over. A close near the basis sits on the inner shell, so calm orbs cluster there rather than spreading by cap size.
- **Market cap no longer sets a radius.** It still sets inertia. The former `r = 0.24 + 0.76·R_b/R_5` band rule is gone from the radius.

An unmeasured orb is held on the outer shell and reported as unmeasured. It is never drawn as calm. `makeShape({ depths })` takes `{ [id]: 0…1 | null }` and refuses anything else. Absent depths mean every orb is unmeasured. The placer keeps its state across reads. `setRadii()` changes only the radius that spacing is measured at.

Not yet done: the composed position and VFI flow in the colour, the latitude bias, and the volatility-driven motion. Those are separate steps and their rules are not in this section yet.

## Dynamic placement (`neo-orb-placement.js`)

The orbs move. The flame engines do not show; they guide.

1. **Read.** About ten times a second, each ready flame player's current frame is drawn at 40×40 onto a hidden scratch canvas and read back as pixels. `Demo.flame` is weighted 0.6 and `OuterOrb.flame` 0.4. The two are blended into one density field, with luminance raised to γ = 1.6 and masked to the unit disc.
2. **Bits.** The field is smoothed, and up to 24 bright bits are chosen across the disc: brightness-weighted farthest-point selection with a 0.18 spacing. A flame's core is usually one broad maximum, so plain local maxima would pile every orb onto one spot.
3. **Travel.** Each orb is a damped spring pulled toward a bit it selects by a deterministic hash of `(symbol, epoch)`, weighted by brightness² and penalized for bits that already hold armed orbs. The bit it is already on is excluded. The field gradient steers the orb through transit and fades out on arrival, so the orb settles on the bit rather than parking beside it. While guided, a hard spacing pass keeps every pair at least 0.16 apart in 3D, measured with the model's own geometry (the berth check's metric) **at the radius each orb is actually drawn at** — the placer is handed the model's `extensionRadius`, so a fleet lifted into the instability region is spaced out there, not on the shells it left — so the berth check never has to re-slot a guided orb. A soft spacing force adds smoothness. Dwell time at each bit is scaled by √mass and varied per bit, so the fleet does not move in lockstep.
4. **Place.** The placed offsets go to `makeShape({ placements, extensions })`. Placements move an orb's longitude and latitude only: the model keeps the band shell, the identity, and the berth separation, and the extension — a separate input, from the stored field — is what lifts an orb off its shell. Guided orbs clear the berth floor on their own, so the berth check does not re-slot them.

### What the data controls

| Input | Controls | Does not control |
| --- | --- | --- |
| Symbol hash (sector) | The **home** anchor. An orb roams only inside a tether around its own sector. | Identity. The sector is still the orb's address on the ring. |
| Six-envelope depth (`js/neo-orb-signals.js`) | The **shell radius**: how deep the close sits through the 236…1000 Fibonacci envelopes, the same reading Orb 2 uses for its radius. An unmeasured orb is held on the outer shell and labelled unmeasured. | Value, identity, sector, or colour. |
| Market-cap band | The **inertia** only: larger caps are heavier and move more slowly. | Value. Inertia is a display convention, not a valuation. It no longer sets a radius. |
| Flame bitmaps | Where an orb heads next, and its path in transit. | What the orb is. No data is encoded in the flame. |
| Stored field reading (`market-extension.js`) | The **distance from the centre**: how far out an orb is drawn, between its depth shell (0) and the instability region's outer edge (1). | Identity, sector, band, size, or colour. Nothing else moves, and no orb is ranked: distance is a display of instability, not a valuation. |

The **Roam** dial (default 0.8) scales the tether: 0 pins every orb to home, and 1 allows about 69° of longitude and 52° of latitude. The **Flame-guided placement** layer switches motion off, and the shape returns to home.

### Motion guarantees (asserted by `neo-orb-placement-test.mjs`)

- **Deterministic:** the same field and inputs give the same placements.
- **Smooth:** no orb steps faster than its mass-capped speed (0.45 rad/s ÷ √mass).
- **Bounded:** every orb stays inside its roam tether, however long it runs — the tether is on longitude and latitude, so lifting an orb into the instability region never widens it.
- **Spaced where it is drawn:** an extended fleet clears the berth floor at the lifted radius, and the model has nothing to re-slot.
- **Honest fallback:** with no flame guidance, every orb rests exactly at home. The status line says so.
- **Alive:** every orb moves on to new bits within 30 s, and the fleet never rests for more than 2 s.
- **Acceptable to the model:** every emitted latitude is inside `PLACEMENT_LATITUDE_LIMIT` (±1.2 rad), the limit `makeShape()` validates against. Each orb spends that budget against its own home latitude, and an orb pressed against the ceiling loses only that component of velocity, so the spring cannot wind up behind a clamp. The regression test runs the full roster for 60 s under fields that pull the fleet toward both poles and asserts the model accepts all 3,600 frames — this is the freeze that used to kill the app a few seconds in (see **Frame resilience** below).

### Frame resilience (`apps-neo-orb.js`)

NEO ORB used to freeze a few seconds in. `makeShape()` fails closed, and the placer could emit a latitude wider than the model accepts; the resulting `RangeError` escaped `tick()`, so `requestAnimationFrame` was never called again and the display stopped with no message anywhere. Two layers now make that impossible:

1. **The clock never stops.** `tick()` wraps one frame of work in `try`/`catch`, always re-arms the next frame, and writes the failure to a new **Frame** row in the Status panel (`error — … · the display keeps running`). A frame that runs clears the previous failure, so the row tells the truth.
2. **A refusal costs one frame.** `currentShape()` catches a refused shape, keeps the last good one on screen, records the reason in `errors.shape`, and retries no more than every 250 ms, so a persistent refusal cannot become a per-frame throw storm. Status reports `shape refused — … · last good shape drawn`.

The contract fix above is the real repair; these two are the guarantee that no future refusal — from geometry, canvas, or readouts — can freeze the app again.

## Geometry (`neo-orb-model.js`)

For node `i` of `n`, with sector `s`, depth `d`, formation `f`, and axes `(a_x, a_y, a_z)`:

```text
θ = 2π(s / 360) − π/2
φ = 0.62 × asin(1 − 2(i + 0.5) / n)               raw latitude, relaxed below
δ = depth through the six envelopes, 0…1 (js/neo-orb-signals.js); null if unmeasured
s = 0.36 + 0.64 × δ                              depth shell; null → held at 1.00
r = s × (0.88 + 0.12d)                            the shell, exact and unmoved
r_drawn = r(x)                                   x = instability extension, 0…1

D = (r_drawn cos θ, 0, r_drawn sin θ)                       disc
S = (r_drawn cos φ cos θ, r_drawn sin φ, r_drawn cos φ sin θ)     sphere
P = lerp(D, S, f) ⊙ (1 + (a − 1) f)             per axis
```

- **Home:** the sector fixes the longitude and the list position fixes the latitude. Those raw anchors collide (two sectors that land close, with neighbouring indices, share a slot), so they are relaxed once and deterministically. Each home is pushed apart until no pair is closer than 0.16 in 3D, and stays within 1.0 rad of its sector longitude and 0.8 rad of latitude. Relaxation moves a home's longitude by 0.07 rad on average (0.35 rad at most) and is cached per roster. `homesFor()` returns the relaxed anchors for the placer. `makeShape()` accepts optional `placements` that move each orb's starting point; with no placements, geometry is unchanged.
- **Sector:** 64-bit FNV-1a of the uppercased symbol, modulo 360. Pinned values: NVDA 38, AAPL 307, SPCX 21, BRK.B 18.
- **Band:** `13 − floor(log10(market cap))`, clamped to 0…5. $10B → band 3, $100B → band 2, $1T → band 1. Smaller caps sit farther out.
- **Kind:** Technology and Industrials → structural; Financial Services and Energy → interaction; everything else → field. Kind is shown as text in the inspector. It no longer tints an orb, so the reserved colours mean only market state.
- **Market colour (`js/neo-orb-market.js`):** descriptive only, and not a quote, rank, or recommendation. Fill = the composed position from the stored row (daily baseline plus 15m residual): green towards rising, red towards falling, stronger further from neutral. Ring = VFI against its signal: sky above, orange below. Missing data is neutral, never a tint.
- **Drawn radius:** `r(x)` lifts an extended orb out of its band shell into the instability region outside every band; `r(0) = r` exactly. See *Distance from the centre* below. Every node reports `bandRadius` (the shell), `radius` (where it is drawn), and `extension` (the reading it is drawn at), and the shape reports what the region is doing this frame.
- **Berths:** nodes are visited in a stable identity-hash order. A node closer than `0.12 × berth` to an already-placed node tries nearby longitudes, then latitude rings, then a widest-angle fallback. The source identity, sector, and band are never changed. At rest the relaxed homes need no berth moves; the berth resolver acts only when placements crowd.
- **Convergence:** `clamp(1 − max|a − 1| / 0.35, 0, 1)`. This measures shape deformation only. It is not a health, trust, or correctness signal.

Dials are validated and refused when out of range. Nothing is clamped silently inside the model. The UI clamps its own sliders to the same bounds. Placements are validated the same way, against `PLACEMENT_LATITUDE_LIMIT`, which the model exports and the app hands to the placer, so the two files cannot drift apart at runtime. Extensions are validated the same way again (`validateExtensions`), and the app hands the placer the same radius rule it hands the model, so spacing, berths, and drawing all agree about where an orb is.

## Distance from the centre — the instability region (`market-extension.js`, `neo-orb-model.js`)

The more overbought or oversold a stored reading is, the further out from the centre its orb sits. Outer distance is meant to read as a lack of stability: the settled field stays on its depth shells, and anything extended leaves them for a region outside every band.

### The measure (`js/market-extension.js`)

One definition, shared with Orb 2, so the same stored packet means the same distance in both apps. Two independent measures, each normalized to 0…1 where 1 is this repository's own extreme, and **the larger of the two is the extension**:

| Measure | 0 | 1 | Read from |
| --- | --- | --- | --- |
| WaveTrend | `|wt1| ≤ 53` (`obLevel2` / `osLevel2`): inside the neutral zone | `|wt1| ≥ 70` (`extremeOB` / `extremeOS`) | `market.waveTrend.wt1` — continuous and symmetric, so oversold reads the same distance as overbought |
| FBB basis | the close on the basis | the close at the ±1000 envelope on its own side | `|ln(close) − ln(basis)|` over that half-width, in the log domain the bands themselves are computed in |

- The thresholds mirror `js/good-intelligence-market-context.js` (`WT_NEUTRAL = 53`, `WT_EXTREME = 70`), and the test suite compares the two modules so they cannot drift apart.
- The basis frame is the preferred **available** FBB variant — `FBB-L60`, then `FBB-200` — else the packet's own `market.basis` with `market.bands`, labelled `FBB`. A variant reporting `insufficient-history` is skipped, not trusted.
- The half-width is taken on the side the close actually sits, so an asymmetric envelope is not flattened: above the basis `ln(upper1000) − ln(basis)`, below it `ln(basis) − ln(lower1000)`.
- Past the envelope the value is capped at 1 **and** flagged (`beyondEnvelope`), so a close of 132 against a 110 envelope is never reported as if it were on the envelope.
- The larger measure wins because either one alone is enough to say an instrument is extended; averaging would let a violently overbought orb sit mid-shell because its basis distance happened to be small. Both numbers are reported beside the result and the driver is named (`waveTrend`, `basis`, or `both` on a tie).
- **Fail closed.** A measure with no data is `null`, never a zero dressed up as a reading. A packet with neither measure returns `available: false` with a reason, and the display says *unmeasured*.
- Pure math: no DOM, no network, no storage, no route.

### The region (`INSTABILITY_REGION`)

```text
region = { inner: 1.08, outer: 1.50, entry: 0.15 }
t      = inner + (outer − inner) × x
r(x)   = r_band                                       x ≤ 0
       = r_band + (t − r_band) × smoothstep(x / entry)  0 < x < entry
       = t                                            x ≥ entry
```

- **Band shells never move.** `r(0)` is exactly the documented band radius `(0.24 + 0.76 R_b/R_5)(0.88 + 0.12d)`, so a calm or unmeasured orb is framed exactly as it always was.
- `inner` (1.08) sits outside the outermost band shell (band 5 at full depth is r = 1.00), so an orb in the region is visibly outside every band; `outer` (1.50) is where an extreme reading sits.
- Over the first `entry` (0.15) of extension an orb leaves its own shell smoothly — a slow start, no jump — and from `entry` upward every band lands on one shared radius positioned by the reading alone. That is deliberate: inside the region, distance means the same thing whatever market-cap band the orb came from.
- The radius is monotone in extension and never pulls an orb inward; past 1 it is capped, not extrapolated.
- Berths resolve at the lifted radius, and the placer is handed the same rule (`radiusFor: extensionRadius`), so spacing is measured where the orbs actually are. The shape reports `instability: { region, extendedCount, extendedNodeIds, maxExtension, maxRadius }`.
- An extension the model cannot draw is refused rather than clamped: an unknown node id, or a value outside 0…1, throws — exactly like every other dial.

### How it is shown (`apps-neo-orb.js`)

- **Eased, not snapped.** Each orb glides toward its stored reading with a 1.2 s time constant (`EXTENSION_TAU`), so a new field read moves the fleet instead of teleporting it. A paused or reduced-motion view snaps (`instant`) rather than gliding: the reading is still shown, it just does not animate.
- **The camera holds the fleet.** Orbs in the region reach past the outermost shell, so the view scale eases out toward `1 / maxRadius` (0.6 s constant, floor 0.55) and back to 1 when nothing is extended. The scale only ever shrinks while orbs are out in the region, it runs in the frame rather than in the draw path, and it is derived from extension alone — never from the axes dials, so framing on a calm field is unchanged.
- **Status → `Instability region`:** `N of 52 outside their band shell · max X.XX (SYM) · M measured · region 1.08…1.50 · view NN% · stored …`, beside the static `Distance` legend row that says what the encoding means.
- **Legend → `Distance`:** what "further out" means, both measures, and that 1 is the region's outer edge.
- **Inspector → `Distance from centre`:** the reading in words (`1.00 out · driven by both measures · wt1 +74.0 → 1.00 · close 18.0% above the FBB basis → 1.00 · beyond the ±1000 envelope`), the value being drawn and whether it is still settling, and both radii (`r 1.500 from a band shell of 0.387`). An orb with no row says *unmeasured — this orb has no stored row*; a row with neither measure says *unmeasured — no WaveTrend value and no FBB basis frame*.
- The region's inner and outer rings are drawn in the band colour with 16 ticks, brighter while an orb is out there.

## Colour (`neo-orb-market.js`) and the feed switch (`neo-orb-field.js`)

Colour is descriptive: it states what the stored field says and nothing more. One read feeds both descriptive channels — fill and ring from `js/neo-orb-market.js`, distance from the centre from `js/market-extension.js`.

- **The switch.** `js/neo-orb-field.js` declares `FEED_CUT = false` and holds the surface's one call: `readField()` resolves `{ ok, observations, at }` or `{ ok: false, message }`, and never throws. Setting `FEED_CUT = true` makes every read refuse with `{ ok: false, cut: true, message }` — including a read handed a fetcher by a caller, which is ignored.
- **Fail-closed in the app.** `NeoOrbEngine.feedCut()` treats the feed as cut unless the reader says `FEED_CUT === false`. While cut, the app reads nothing, polls nothing, keeps `market` and the extension states empty, and writes the cut into the Status panel (`Market` and `Distance`), the inspector, the colour legend, and the footer.
- **Fill is the composed position.** Green is rising and red is falling, from the stored `composition.composedPosition` (0…1, where 0.5 is neutral). The tint gets stronger further from 0.5, and reaches full green at 1 and full red at 0. A missing or held composition is neutral grey-blue, never a tint.
- **Ring is VFI against its signal.** Sky is VFI above its signal, orange is below. No ring means equal, or VFI is unavailable. Rally/sink (`changePct`) and the basis are still computed and shown in the inspector, but they no longer set a colour.
- **Stored, not live.** Colours and distances show the newest stored stock observation time in UTC, in the readout and in every inspector line; the field is re-read at most every 20 s (`MARKET_EVERY_MS`). A failed read keeps the last good colours and extensions, and is labelled in Status (`unavailable — …`). With no stock rows — or with the switch closed — `storedAsOf()` is null and no time is claimed.
- **Shape.** The field row carries the FBB data as `market.fbbComparison.variants`. The client analysis carries it as `market.fbbVariants`. The mapper reads both.
- **Closing it again is deliberate.** Set `FEED_CUT` to true in `js/neo-orb-field.js` and update `tests/neo-orb-feed-boundary-test.mjs`, `tests/neo-orb-market-test.mjs`, and this document. It is a code change, not a configuration, and the closed path stays tested.

## Controls

- **Shape:** formation, axes X/Y/Z, berth separation, phase. None of these touches the extension or the view scale: the instability region is driven only by the stored field.
- **Motion & layers:** rotation speed, orb size, the Roam dial, and toggles for orbs, flame-guided placement, labels, spokes, bands, and beat. The status panel reports both flame guidance sources and the placement state.
- **Inspector and roster list:** choose a symbol on the sphere or in the list. The inspector shows the issuer sector, snapshot rank, market-cap label, display sector, band, berth status, the market line, the distance-from-centre line, and the display-only disclaimer.
- **Status panel:** `Frame`, `Inner`/`Outer` flame guidance, `Placement`, `Market` (colours and the stored time), `Instability region` (how many orbs are off their shells, the widest reading, and the view scale), `Convergence`, and `Roster`. Every row states its own unavailability instead of showing a plausible default.
- **Keyboard and assistive tech:** the roster list is a real button list, so every orb is reachable without the pointer.

Drag to rotate. Click an orb to select it. Reduced-motion users start paused.

## Known limits

- **Static roster, stored field.** The roster is the reviewed snapshot (as of 2026-10-02): symbols, sectors, and market-cap bands are fixed, and only the descriptive channels come from the field. Orb 2's live beats and saved beats are not wired in. Colours and distances show what the Worker stored, at most 20 s old, with the stored time in UTC beside them; they are never live quotes.
- **The static preview has no Worker.** On a plain static server (`serve.js`) the field route answers 404, so NEO ORB reports `unavailable — The Orb 2 field answered HTTP 404.`, every orb stays neutral and on its band shell, and the display keeps running. The read only returns rows on a deployment where the Worker serves the route.
- **Extension is only as good as the stored row.** The WaveTrend half needs `market.waveTrend.wt1`; the basis half needs a close and a usable FBB frame. A row without them is labelled *unmeasured* and its orb stays on its shell — it is not shown as stable.
- **The region is a display convention.** `inner` 1.08 and `outer` 1.50 are chosen so the region reads as outside every band (band 5 at full depth is r = 1.00) while the fleet still fits the frame; they are not calibrated against any market statistic. The camera floor (0.55) bounds how far the view eases out.
- **Visual check.** The geometry, the placement dynamics, the draw path, and the input handling are covered by tests. The placement was also reviewed offline: real flame frames were baked, and home and guided layouts were rendered to a PNG outside the repository. The live look in a real browser has not been checked from this environment; do that before shipping.
- **Asset load.** Guidance needs `assets/Demo.flame` with `assets/flame/`, and `assets/OuterOrb.flame` with `assets/outer_flame/`. If a source is missing, its guidance reads *unavailable*. If both are missing, every orb rests at home and the status says so.
- **Sphere film removed from view.** The author's sphere film was a flame render, so it is no longer drawn or loaded by NEO ORB. Restoring it would be a deliberate decision.
- **Drift is moderate.** Real flame cores sit near the middle of the bitmap, so orbs travel a moderate distance from home. On real flame frames, a 30 s run at Roam 0.6 gives a mean of 6.8° and a maximum of 20.5°; at the default 0.8 the mean is 10.0°. The latitude tether is wider than before, so the maximum is higher. Raise Roam for more travel.
- **Volume.** On real flame frames, the fleet covers about 25% more lat×lon cells over 60 s than it did before the separation pass (186 vs 149), and each orb visits about 7.5 cells on average (6.4 before). A wider longitude tether adds little more and also lengthens each orb's travel, so it is not used.

## Tests

```bash
npm run test:neo-orb
```

All six files run under `test:neo-orb`, and `scripts/integrity-report.mjs` lists all six.

`tests/neo-orb-test.mjs` covers:

- the pinned sector hashes and the band convention;
- the 1.45 radial ratio and the disc's equatorial plane;
- ideal-axis convergence, deformation, and identity stability;
- the 359 sector fail-closed boundary and refused out-of-range dials;
- berth separation, switched off and on, and deterministic;
- the 52-orb roster mapping;
- window registration, mount, dial clamping, inspector facts, and shared-engine handling;
- a full draw with guided orbs, the flame engines read but never drawn, and orb hit-testing;
- guidance read from a scratch canvas, and the forbidden-channel scan and page wiring;
- **the instability region:** the region sits outside every band shell, `r(0)` is the exact band radius, the lift is monotone and never inward, past `entry` every band lands on one shell positioned by the reading, and a missing or out-of-range extension is refused rather than clamped;
- **`makeShape` with extensions:** only the named orbs move, band shells and identities are untouched, the drawn position is at the lifted radius, the `instability` report counts and bounds the fleet, and the whole 52-orb roster behaves the same;
- **the app's extension path:** the reading is eased (monotone, bounded, settling exactly on the stored value), a paused view snaps, the camera eases out to hold an extended fleet and back to 1 on a calm field, the Status `Distance` row reports the counts, the widest reading, the region, and the view scale, and the inspector names the driver, the eased value, and both radii — with *unmeasured* for a row that has neither measure and for a symbol that has no row;
- **frame resilience:** a frame that throws re-arms `requestAnimationFrame` and is named in Status, and a shape the model refuses costs one frame while the last good shape stays on screen.

`tests/neo-orb-page-test.mjs` covers the standalone page: its policy (meta and header, from one constant), the relative-only references, the script order, the staging and route entries, the Worker's header and refusal of writes, and a boot of the page's own scripts into `#neo-root`.

`tests/neo-orb-feed-boundary-test.mjs` covers both halves of the feed boundary. NEO ORB's side: the reader declares the feed open and makes **one** same-origin `GET` of its relative route with the documented options (method, credentials, cache, redirect, no body); a read that fails — 404, a Worker message, a malformed payload, a thrown fetch, no fetch at all — is reported as a failure and never as an empty field; closing the switch again refuses every read, including one handed a fetcher; only the reader holds a network primitive, its code holds exactly one call site, and the surface names exactly one route; the mounted app reads through the reader, colours what it is given, keeps the last good colours on a failed read, and is fail-closed against a stub reader that has not declared the feed open. Orb 2's side: the gate module and its test are gone, neither Worker file carries an `ORB2_COMPANY_FEEDS` switch, the tick with an empty environment runs past where the gate used to sit, and the Tickerbot route calls `api.tickerbot.io` again with no switch set.

`tests/neo-orb-market-test.mjs` covers the colour rules (rally/sink from `changePct`, basis from the close against the FBB basis, the preferred FBB variant), the reserved palette, the newest-stock-row index, and the reader's contract: the route and interval fallback, the one same-origin `GET` and its options, the rows it hands the colour module, and the fact that the reader is the only file on the surface whose code holds a network call.

`tests/market-extension-test.mjs` covers the shared measure itself: the WaveTrend thresholds are compared against `js/good-intelligence-market-context.js` so they cannot drift, the scale is symmetric, capped, and monotone in `|wt1|`, and a missing value is `null` rather than 0; the basis half takes the preferred available variant, else the packet's bands, measures in the log domain on the side the close sits, caps at the envelope and flags `beyondEnvelope`, and refuses a frame it cannot trust; the combined extension is the larger of the two with the driver named (including a tie), and is `available: false` with a reason when neither measure exists; `describe()` states the reading in words or states that there is none; and the module is pure math — no network, no DOM, no storage, no route, frozen exports.

`tests/neo-orb-placement-test.mjs` covers the pure math with synthetic bitmaps: field construction, bit spread, determinism, smoothness, tether, roam, inertia, reset, a fleet that keeps moving, and the model's placement invariants (radius, home, and berths preserved). It also checks that guided orbs never re-slot over 12 s of the full roster: no frame re-slots an orb, and every placed pair clears the berth floor. And it holds the extension half of the placer: the reported radius is the model's rule applied to the orb's own reading, a placer that is not handed that rule holds the reading and draws no lift, `setExtensions` refuses an unknown orb or an unusable value and leaves a standing reading untouched when a call is refused, `null` and `reset()` put every orb back on its shell, and a fleet lifted into the region is spaced at the radius it is drawn at — further apart in 3D than the same calm fleet, with nothing for the model to re-slot. And it holds the latitude contract: `LAT_LIMIT` equals the model's `PLACEMENT_LATITUDE_LIMIT`, no caller can widen it, and 60 s of poleward guidance on the full roster produces 3,600 frames that `makeShape()` accepts — the freeze regression.
