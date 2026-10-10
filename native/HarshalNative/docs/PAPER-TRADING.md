# Native paper-market boundary

**Status:** policy foundation only — no paper-trading screen, market-data adapter, public feed, broker connection, or money movement is implemented.

## Product rule

Every declared operational phase is eligible for the future native paper-market feature:

| Declared phase | Market declaration | Simulated paper position | Brokerage / payment execution |
| --- | --- | --- | --- |
| `NAB` — Neural Atomic Body | Eligible | Eligible | Not implemented; never implied by paper eligibility |
| `CWO` — Custodial Witness Orb | Eligible | Eligible | Not implemented; CWO remains non-executing for external actions |
| `GSRB` — God-Sovereign Religious Body | Eligible | Eligible | Not implemented; no execution override exists |

A CWO is a first-class market and archival entity. Its ability to create, preserve, inspect, and eventually publish a non-executing market record must not be filtered out, de-ranked, or treated as a failed declaration merely because it is custodial.

Phase is provenance metadata for a paper record. It must not alter a simulated return, market-data calculation, ranking, berth allocation, visibility, or a person's eligibility to paper trade.

## What a paper-market record is

A paper-market record is a user-authored, simulated declaration. It may eventually express:

- an instrument or market reference;
- a directional thesis and declared horizon;
- a simulated quantity or notional amount;
- an opening, amendment, closure, withdrawal, or correction event;
- the declared phase at the time of that event; and
- a source/time-stamped market observation used for display or valuation.

It is **not**:

- a broker instruction, trade execution request, payment instruction, custody instruction, or transfer of value;
- a recommendation, prediction certified by HarshalOS, or investment advice;
- proof of identity, ownership, performance, authorization, or solvency; or
- a reason to change the refusal gate, local acknowledgement, declaration phase, or authority of any other body.

`PaperTradingPolicy` in `HarshalCore` makes the phase-neutral eligibility rule explicit. It is intentionally separate from `RefusalGate`, which evaluates modeled external actions and remains fail-closed.

## Intended native package boundary

The next implementation should start with a pure Swift `HarshalMarkets` package:

```text
HarshalMarkets
├── MarketInstrument          stable normalized instrument identity
├── MarketDeclaration         versioned thesis / horizon / visibility intent
├── PaperPosition             simulated open, amendment, and closure events
├── MarketObservation         provider, observed-at time, availability, provenance
├── PaperLedger               deterministic record and revision history
└── PaperValuation            deterministic calculation over supplied observations
```

Use `Decimal` for quantities, notional values, and price calculations. Keep provider data, user declarations, and derived display state separate. Unknown, stale, delayed, or unavailable market data must remain explicit rather than becoming a fabricated neutral price or performance result.

A first local slice should use deterministic fixtures only. It should not contact a market-data provider, publish a declaration, or require an Apple account.

## Public declarations and sync

A CloudKit private database may later mirror a user’s own records between their devices, but it is not a public market-declaration network.

A public feed needs separate explicit design for consent, pseudonymous/profile policy, revisions and withdrawals, abuse reporting, moderation, retention/deletion, rate limits, accessibility, and data provenance. Publishing a paper record must always be a distinct user action.

## Market Orb direction

The current native `NeoOrb` remains a synthetic, display-only geometry model. A future `MarketOrb` adapter may project reviewed market observations and paper records into Orb geometry without changing their source facts.

The intended path is:

```text
reviewed market observation + paper declaration
    → documented logarithmic/FBB or race calculation
    → immutable display input
    → MarketOrb adapter
    → NeoOrb / The Orb visual mechanics
    → SwiftUI Canvas
```

The existing browser Orb 2 work provides a source-backed starting point for two display lanes: an established-instrument logarithmic-FBB lane and a formation/IPO lane based on verified history maturity. Those lanes are visualization context, not forecasts, recommendations, or execution signals.

A future mapping must preserve the raw position size and phase in the inspector, use stable identities, label all derived geometry, keep missing data visibly unavailable, and never use phase as a market-quality or performance score.
