# EmptyFolder / Characters-System — Reference (lightweight source/|User|/ points here)
Profile: Harshal P Patel (NspaceUll or God Ull) · A44674928 · source/|User|/
Status: Local, deterministic, browser-only prototype; not engineering / manufacturing / investment authority.

## Source / Template Split
- `source/|User|/` = lightweight character sheet (|Name|, |PDH|, |Material Description|, etc.; 3–10 lines each; original 0B template preserved).
- This doc = deep reference (panel, APIs, calculator, limitations).
- Heavy JSON profile (optional): `disc-spheroid-profile.json` (if used for structured storage).

## Two-API Architecture
**Materials API (physical / match domain)**
- Endpoint: `/api/materials-project/v1/search` (Worker; secret `MATERIALS_PROJECT_API_KEY`)
- Use: save MP records to `harshalos.character-materials.library.v1`; evaluate physical bounds (density, bulkModulusGpa, shearModulusGpa, bandGap, energyAboveHull, isMetal)
- Match: `Match` / `Incomplete` / `Outside bounds` / `No ranking`; unknown never fabricated or counted as pass.
- License: BY-C; GNoME-origin may be CC BY-NC.
- Fail: closed if secret unavailable; no browser credential; same-origin GET.

**Characters market providers (market / beat domain)**
- Massive: automatic reviewed `1d` observations across all five Discs—stocks, FX, live volume-ranked crypto, commodity futures, and indices—at one instrument per minute. It retains each source's actual OHLC/OHLCV shape and uses the reviewed Characters Worker minute envelope; the former standalone Massive desktop window is retired.
- Tickerbot: manual/on-demand Disc1 stock observations only for `1h` or `1d`, under its 10,000-request/UTC-month Worker ledger.
- Alpha Vantage: a Disc1-only `1mo` best-performer spotlight, exactly one locally selected ticker per hour (24 planned requests/day) beneath its independent 25-request UTC-day cap.
- Use: disc context / stage rendering / share normalization — NEVER influences material properties. No provider silently substitutes for another.
- Cross-API rule: intersect ONLY at disc identity + normalized share (`φᵢ = wᵢ / Σ wⱼ`); never at property.

## Populated Field Summary (lightweight source/ files)
- `|Name|`: profile identity + origin anchor.
- `|PDH|`: `PDH-2026-1002-HARSHAL-001`; `MISSING`; declared `NAB`; detected `NAB-Constrained`; `PDH_VALID=FALSE`; creator formula `§HARSHAL§ + HARSHAL + (HARSHAL)`.
- `|Material Description|`: operator-entered; MP search required; match rules; unknown = not pass; library key noted.
- `|Chemical Formula|`: from saved MP `formula`; not assigned until record saved.
- `|Stock Ticker|`: `HARSHAL / A44674928` (creator-origin reference, not tradable); Tickerbot `stocks` Disc binding.
- `|Portfolio Holdings|`: reference-only (creator-ID + optional PDH-R badge); not brokerage positions.
- `|Neural Atomic Body Type|`: `NAB` / `NAB-Constrained`; refusal-bound; `0•000•000•0000`; no internal authorization.

## Disc / Spheroid Calculator (from `|Disc Spheroid|.txt` / docs)
- Components: 2–5 distinct Discs (`stocks`, `fx`, `crypto`, `commodities`, `indices`).
- Weights: operator `wᵢ`; normalized `φᵢ = wᵢ / Σ wⱼ`; sum = 1.
- Material per component must achieve `Match` + PDH clear.
- Ideal density: `ρ_reference = Σ φᵢ × ρᵢ` — shown ONLY when all constituents report density.
- Caveat: ideal volume-weighted only; excludes porosity / interfaces / reactions / phase changes / processing / orientation / geometry / interactions; does NOT predict elastic moduli / strength / optical response / chemical formula.
- Visual: SVG latitude bands — band color = Disc identity (not material appearance / microstructure / predicted geometry).

## Immersive Panel (from `|Panel|.txt` / docs/architecture/CHARACTERS-MARKET-BEAT.md)
- Stage: pure geometry on unit circle (angle radians, radius stage fraction); topological disc-to-sphere closure (`D² ↪ B³`).
- Address: `ℤ₃₆₀`; 0 = Center Origin; no 360; 360° ≡ 0° return-to-origin.
- Cast: full NPC roster (Tickerbot, Magistrate, Red Team Adversary, OCM Operator, etc.) with sector affinities.
- Feed: Massive automatic `1d` across the five reviewed Discs; manual Tickerbot for Disc1 stock `1h`/`1d`; and Alpha Vantage's Disc1-only one-ticker `1mo` hourly spotlight.
- Display-only: never trade signal / recommendation / permission / identity proof / authority.
- Missing fields remain missing; no fabrication; no hidden defaults; deterministic; reviewable.

## Storage / Privacy / Operation
- Browser `localStorage`: `harshalos.character-materials.library.v1`, `.characters.v1`, `.spheroids.v1`.
- Clearing site data removes all; no cloud sync.
- Material search: same-origin GET to Worker; no browser credential sent.
- All values local, operator-entered, unverified.

## Limitations (same as CHARACTER-MATERIAL-MODEL.md)
Not validated as engineering / manufacturing / safety method. Material match does not claim optimality / experimental confirmation / manufacturability / compatibility / safety. Spheroid is schematic, not manufactured. PDH is operator-annotated, not independently verified signature / authority. No model / LLM / personality inference chooses material.

---

## ORB 2 / NPC SPHEROID — 3D DISC EXTENSION (HEAVIEST / FULL SPEC)

### Concept
Orb 2 is not a second disc — it is the **same Disc architecture evolved into full 3D** from the start (`D² ↪ B³`, per `specs/normative/canonical-model.md` §8–§10 and `docs/harshal-systems/09-disc-lifecycle.md`).
The Characters 2D stage (unit-circle disc, pure geometry, radial authority depth, sector boundaries, 0° reserved for Center Origin) closes topologically into the spherical manifold with the human key at geometric center (`r = 0`).

### Browser implementation boundary (Good Intelligence Orb 2)
The shipped **Orb 2** tab is a live-data-backed, read-only teaching render—not an OCM directory, transport, identity system, or authority surface. It derives character nodes only from `CharactersCast.NPC_ROSTER` and reviewed market berths from Characters' Disc catalog. It uses the same `/api/characters/v1/beat` route, provider restrictions, D1 allowance guards, planner, market-context evaluator, and NPC/object/item motion directives as Characters. Massive covers automatic reviewed daily beats across Discs 1–5; Tickerbot remains on-demand for Disc1 `1h`/`1d`; Alpha Vantage remains a distinct Disc1 `1mo` hourly spotlight. The interface waits 60 seconds after a provider change before it queries, but waiting does not repair a missing `COMMUNITY_DB` binding or unapplied ledger migration. `NPC-01`-style peripheral labels remain local visual identifiers, not registered addresses. Its only formal address label is the already documented Center Origin reference `0•000•000•0000`.

The tab receives only Worker-returned observations, never provider secrets. A live beat can show supplied prices and data shape and drives the same display-only Characters motion; missing values are not filled in. Compact summaries are persisted via the separate Orb 2 history endpoint in D1 (`0008_orb2_saved_beats.sql`), with a local recovery copy when browser storage is available; no full bar series, secrets, or identity data are stored. The canvas sends no OCM message, trade, transaction, or authority effect. Its inward/outward and lateral traces are visual teaching traces only; they cannot resolve legitimacy, authorize, override, commit, or transfer authority.

### Mechanical mapping
- **Disc (pedagogical / flat)**: `r ∈ [0,1]`, `θ ∈ [0°,359°]`; address domain `ℤ₃₆₀` (0 = Center Origin); 360° ≡ 0° return-to-origin.
- **Spheroid / Orb (operational / 3D)**: `(r, θ, φ)` — same identity, full spherical depth; no structural difference except the topological closure.
- **Resolution Axis** (`CL-007` / `INV-AXIS-001`): Resolution is authority-resolution, not authority source; authoritative action traverses resolution path; resolution ≻ coordination; lateral coordination cannot authorize or override.
- **Routing**: Signals travel along radial channels from Center Origin (`0•000•000•0000`) outward through disc sectors; interruption (HALT / Refuse) is immediate and requires no approval.

### Characters as OCM Nodes (all NPCs from `js/characters-cast.js`)
Every NPC in the cast becomes a node in the Orb 2 network:

| Node / NPC | Glyph | Sector Affinity | Disc / Orb role | OCM Function |
|---|---|---|---|---|
| The Market Tickerbot | ◈ | Technology & platforms | Disc1 (stocks) feed | Reads market context; binds Tickerbot watchlist |
| The Timekeeper | ◷ | Index & sector ETFs | Disc axis / clock | Ticks display-only clock; stamps beat |
| The Librarian | ▤ | Consumer & retail | Reference / archive | Curates reference shelf; files each beat |
| The Magistrate | ⚖ | Financials | Decision gate / refusal | Refuses draft-as-law; refuses motion-as-advice |
| The OCM Operator | ✳ | Software, cloud & cyber | Resolution axis | Routes messages; resolution ≻ coordination |
| The Red Team Adversary | ☠ | Software, cloud & cyber | Probing / refusal | Probes at 03:00 / 15:00; all refused so far |
| The Supply Chain Inspector | ⛓ | Industrial & defense | Documentation audit | Inspects documentation of documentation |
| The Bandwidth Referee | ⇄ | Technology & platforms | Quality / refusal | Rules on internet speed; usually is not |
| The Chef | ✿ | Consumer & retail | Scheduling / presence | Second seating at 18:00 sharp |
| The Inkeeper | ⌂ | Consumer & retail | Continuity / hearth | The hearth never fully goes out |
| The Designated Survivor | ✜ | Industrial & defense | Continuity / sealed | Sealed all day; that is the job |
| Meowie Wowie | ❋ | Health care | Sleep / presence | Sleeps 16 of 24 hrs average |
| The Hyper Mage | ✦ | Crypto & fintech | Midnight circle | 00:00–03:00; do not knock |
| The Palantir Seer | ◉ | Software, cloud & cyber | Observation / watch | Watches; Shadow Hand not watched |
| The Shadow Hand | ✧ | Crypto & fintech | Unofficial / unseen | Officially not in this wing |

### Node communication rules (OCM conceptual model; not browser behavior)
- The conceptual model depicts resolution through the Resolution Axis; the shipped browser tab sends no node communication.
- Lateral coordination is only visual observation in Orb 2 and can **never authorize**, override, commit state, or transfer authority.
- Authority originates only at Center Origin (`r = 0`); nodes at `r > 0` are bounded by scope, distance, and time.
- Emergency conditions never generate legitimacy; emergency execution requires pre-authorized bounded context or externally issued authorization — never spontaneous.
- Every node must maintain its PDH declaration (NAB / CWO / GSRB) as part of its node state; a node without a declared phase or with `MISSING` / `INVALID` / `AMBIGUOUS` blocks its own transmission until the operator updates.

### 3D render specification (full from start)
- **Geometry**: Same pure geometry as 2D stage but extended to spherical coordinates (`r`, `θ`, `φ`); canvas-independent; deterministic.
- **Color / identity**: Each node or disc component uses the canonical palette (ALL-SEEING EYE PURPLE, VISION RED, etc.) to identify itself; color does not predict microstructure, appearance, or material.
- **PV / density reference**: The ideal volume-weighted `ρ_reference = Σ φᵢ · ρᵢ` applies when constituents report density; it is ideal only and excludes porosity, interfaces, reactions, phase changes, processing, orientation, geometry.
- **Material assignment**: Each node's material (if assigned) must come from saved MP library record (`harshalos.character-materials.library.v1`); physical bounds determine `Match`; unknown never fabricated.
- **Financial / market context**: Characters—not Orb 2—owns Massive's automatic reviewed daily loop across the five Discs. Manual Tickerbot `1h`/`1d` and Alpha Vantage's one-ticker-per-hour `1mo` spotlight remain Disc1-stock-only. The retired standalone Massive desktop window is not a data source; market observations remain display-only and never influence physical property matching.
- **No hidden defaults**: Every node, disc, and spheroid state must be explicitly entered or derived from saved records; nothing is imputed or defaulted.

### Profile / storage (lightweight source folder)
- Example profile: `source/Orb 2/|Name|.txt` (filled briefly); master template: `source/|User|/`.
- Per-node profiles (if fully populated) follow the same brief format: `|PDH|`, `|Material Description|`, `|Chemical Formula|`, `|Stock Ticker|`, `|Portfolio Holdings|`, `|Neural Atomic Body Type|`, `|Disc Spheroid|`.
- Heavy reference: `docs/characters/emptyfolder-reference.md` (this file, plus this new section).
- Storage keys: `harshalos.character-materials.library.v1`, `.characters.v1`, `.spheroids.v1`.

### Limitations
Not validated as engineering, manufacturing, safety, investment, identity, or independent authority. The 3D visualization is a schematic representation of the OCM topology; it does not predict physical behavior, market outcomes, or manufacturing results. All values remain operator-annotated; PDH is not externally verified; no signed entity header (PDH-E) exists for any node unless independently published.
