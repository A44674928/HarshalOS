# Pine Script library

Markdown archives of the Pine v6 scripts supplied for Good Intelligence / market-context
work, plus the supplied third-party Moon Phases snippet. Each complete source is kept in a
fenced `pine` block with its provenance and a careful description of any JavaScript adaptation.

> [!IMPORTANT]
> These are **user-supplied source transcriptions**, not reconstructions. No source URLs
> or publication dates were provided. The Moon Phases snippet is identified by the user as
> third-party; its original author and license are unknown, so this archive does not claim
> authorship or grant a license. There are no separate raw `.pine` files; the source copies
> are the code blocks in the Markdown documents below. The JS market-context port has not been
> cross-validated bar-for-bar against the source runtime, and it does not reproduce every visual,
> alert, timeframe, or divergence behavior in these sources. The JS FBB intentionally calculates
> its basis/deviation from natural-log prices and exponentiates the levels back to price; these
> verbatim Pine archives calculate in linear price space, so they are not formula parity.

## Inventory

| # | Document | Supplied indicator | Pine version | Relationship to current JS port |
| :-- | :--- | :--- | :--- | :--- |
| 01 | [`01-vfi-fibonacci-bands.md`](01-vfi-fibonacci-bands.md) | VFI + Fibonacci Bands `[Harshal]` merged confluence overlay | v6 | Partial overlap with `computeVfi()`, `computeBands()`, and evaluator signals |
| 02 | [`02-wavetrend.md`](02-wavetrend.md) | LAZY - WaveTrend Context Engine `[Pro]` | v6 | Core WaveTrend overlaps `computeWaveTrend()`; MTF/divergence behavior differs |
| 03 | [`03-fibonacci-bollinger-bands.md`](03-fibonacci-bollinger-bands.md) | Fibonacci Bollinger Bands `[Harshal]` | v6 | Shared band calculation only; several levels, visuals, and its basis alert are absent |
| 04 | [`04-moon-phases.md`](04-moon-phases.md) | Moon phases (third-party source; original author/license unknown) | v6 | Adapted by `js/celestial-context.js` for a display-only UTS readout; not a chart runtime |

## What each document contains

1. **Provenance** — the source title, Pine version, and what source metadata was or was not
   supplied.
2. **Inputs** — all declared Pine inputs, their original defaults and constraints, and an
   explicit JS-field crosswalk where one exists.
3. **Calculation and behavior** — a readable overview of formulas, gates, and alerts, including
   known differences from the port.
4. **Source** — the complete Pine v6 text as supplied, inside one `pine` code block per file.

The three market-indicator sources are preserved separately. In particular, the standalone
FBB script plots 0.236 and 0.500 levels that the merged VFI+FBB source does not define; do not
silently treat them as the same indicator. The fourth document is a separate third-party Moon
source with unknown author/license; see its provenance warning before reuse.

## Verification

```bash
npm run test:pine      # source blocks, documented Pine inputs, JS mapping, and OCM design
npm run integrity      # full regression + suite inventory + deploy dry-run
```

`tests/pine-scripts-docs-test.mjs` checks that each Markdown document has one Pine v6 source
block with a pinned SHA-256 digest, that the documented inputs/defaults match the inputs in
that block, that mapped market-parameter defaults agree with the shipped
`GoodIntelligenceMarketContext.DEFAULTS`, and that Market/Sun/Moon OCM addresses are registered
and valid. `tests/celestial-context-test.mjs` exercises the approximate display calculation;
the desktop suite checks its UTS surfaces. These checks **do not** compile Pine or prove
source-runtime/ephemeris parity.

## Relationship to the Orb Communicator Model

[`docs/architecture/PINE-OCM-INTEGRATION.md`](../../docs/architecture/PINE-OCM-INTEGRATION.md)
explains the read-only Market Context directory node and the still-unimplemented provider
payload boundary. Market indicators remain optional observations, never identity,
authorization, continuity, accountability, or permission to act. The Sun/Moon display and its
OCM entries are documented separately in
[`docs/architecture/CELESTIAL-CONTEXT.md`](../../docs/architecture/CELESTIAL-CONTEXT.md).

## Related

- [`docs/GOOD-INTELLIGENCE-ASSURANCE.md`](../../docs/GOOD-INTELLIGENCE-ASSURANCE.md) — the
  OHLCV packet contract, shipped defaults, and the existing parity caveat.
- [`js/good-intelligence-market-context.js`](../../js/good-intelligence-market-context.js) —
  current JavaScript calculations and `gi-market-analysis-v1` output.
- [`tests/good-intelligence-market-context-test.mjs`](../../tests/good-intelligence-market-context-test.mjs) —
  behavioral tests for the market JS port.
- [`js/celestial-context.js`](../../js/celestial-context.js) and
  [`tests/celestial-context-test.mjs`](../../tests/celestial-context-test.mjs) — approximate Moon/Sun
  display calculation and focused tests; not an ephemeris.
