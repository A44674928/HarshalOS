# Markets · NEO ORB — the combined native tab

**Status:** local, paper-only, display-and-simulation
**Packages:** `Packages/HarshalMarkets` (simulator + roster), `Packages/NeoOrb` (geometry), `Packages/HarshalFlame` (flame engines)
**Views:** `HarshalNative/Features/MarketsOrbView.swift`, `TradingSimulatorView.swift`, `NeoOrbCombinedView.swift`
**Settings:** `HarshalNative/OrbSettings.swift` (tucked away behind the toolbar gear)

The former **Markets** and **NEO ORB** tabs are combined into one tab with a
segmented surface:

```text
Markets · NEO ORB
├── Markets      — the fully-fledged paper trading simulator
└── NEO ORB      — Orb 2 (Good Intelligence) burning inside The Orb (dual flame engines)
```

The shared PAPER_TEST server-ledger surface (device pairing, remote
declarations/positions) stays reachable from the toolbar; the onboarding
**Preview NEO ORB** screen keeps the original geometry study.

## Markets — the paper trading simulator

Everything runs through `HarshalMarkets.TradingSimulator`, a pure Swift
engine with Decimal money math, deterministic state transitions, and its own
schema validation:

- **Account:** configurable starting cash, cash, positions (long **and**
  short), realized P&L, mark-to-market equity, and a session equity
  sparkline.
- **Orders:** market orders fill immediately at the current reading with
  adverse slippage; limit orders rest and cross when the board reaches them
  (buy at `min(limit, quote)`, sell at `max(limit, quote)`). Orders can be
  cancelled while resting. Every rejection carries its reason.
- **Fees:** flat + basis-point commissions and basis-point slippage, all
  dialable in settings.
- **Positions:** weighted-average cost on adds, realized P&L on reduces and
  closes, direction flips beyond flat, and one-tap flatten.
- **Persistence:** the account is schema-validated and stored in the app's
  encrypted local-state file (Keychain-wrapped AES-GCM). A corrupt blob
  starts fresh; it never partially restores.
- **Boundary:** `PAPER_TEST` only. There is no broker order, execution,
  custody, wallet, payment, token, mining, or recommendation path anywhere
  in the code.

### Live tickers from Good Intelligence

The board is the reviewed **52-asset Tickerbot roster** (ported one-for-one
from `js/good-intelligence-market-roster.js`, as-of 2026-10-02), and its
source is always visible:

- **Live** — when the build has a configured `HarshalCommunityOrigin` and a
  paired PAPER_TEST credential, `TickerFeedService` polls the Worker's
  reviewed route (`/api/good-intelligence/v1/market/tickerbot/bars`,
  response `gi-market-context-v1`) for a bounded slice of the roster. The
  provider key stays inside the Worker; the app never sees one, only roster
  symbols can ever form a path, and a failed poll is labelled
  *unreachable* — never papered over.
- **Simulated** — otherwise (and for symbols outside the polled slice), a
  deterministic local tick engine advances seeded random walks from roster
  metadata. Every such reading is labelled **SIM** and its banner says the
  reference prices are local display anchors, **never market observations**.
  The engine is replayable: the same symbol, session seed, and step always
  produce the same quote.

## NEO ORB — Orb 2 × The Orb

The orb pane composes the two source concepts in one canvas:

- **Orb 2 (powered by Good Intelligence):** each roster ticker is a
  display-only orb on the spheroid — sector placement is a deterministic
  symbol hash, the radial band is the logarithmic market-cap band, day
  direction uses the Orb 2 candle colors, beat motion is a bounded ±4 %
  radial oscillation, and a declared phase shifts the assembly rotation
  (+0°/+60°/+120°). The Dollar Strength benchmark is never synthesized: it
  reads *unavailable* unless six aligned, confirmed daily FX inputs arrive
  from the Worker feed.
- **The Orb (powered by the dual fractal flame engines):** the author's own
  `Demo.flame` (inner — 120 frames, the core heartbeat at 12 fps) and
  `OuterOrb.flame` (outer — 600 frames, the macro-orbital shells at 24 fps)
  are parsed and baked **on-device** by the native `HarshalFlame` engine and
  composited additively behind the spheroid, exactly like the site's
  "lighter" blend over premultiplied black. Playback is the honest maximum:
  a pure-clock ping-pong with no drift and no state.

Tap a ticker orb to inspect it (issuer, sector, snapshot rank, display
sector, band, current labelled reading, berth resolution). The whole surface
stays display-only: it resolves no address, gates nothing, and confers
nothing.

## The tucked-away settings panel

The toolbar **gear** opens one full-featured panel; nothing else clutters
the tab. It is the single place NEO ORB and the simulator are dialed in:

- **The Orb — dual flame engines:** inner/outer enable, opacities, scales,
  exposure, bake quality (points multiplier), animation toggle.
- **Orb 2:** ticker orbs, labels, beat motion, phase shift, sector colors,
  hourly ring.
- **NEO ORB shape:** formation, X/Y/Z axes, berth separation, rotation RPM,
  node scale, bands/arcs/attachments.
- **Markets simulator:** starting cash, flat/bps commission, slippage,
  tick interval, board sort.
- **Human-Key gate:** order gating on/off, witness policy (off/preferred/
  required), freshness δ, threshold τ, passcode fallback.

Every dial is sanitized into its documented range on load *and* on save, and
changes apply live (and persist to `UserDefaults` as versioned JSON — they
are preferences, not private state). No dial changes a declaration, a market
fact, or any authority.

## Tests

- `HarshalMarketsTests/TradingSimulatorTests.swift` — fills, cash movement,
  shorts, weighted averages, partial closes, limit crossing, cancellation,
  buying-power rejection, roster rejection, fee math, packet validation,
  roster integrity, and deterministic tick engine identity.
- `HarshalFlameTests/FlameTests.swift` — parser fidelity (curves,
  parameters, palettes, lenient frame skipping), bake determinism, curve
  library coverage, film ping-pong clock, and bundled-file integrity
  (120/600 frames).
- `HarshalCoreTests/GateFormulaTests.swift` — the gating formula.
