# Native paper-market boundary

**Status:** account-scoped server **PAPER_TEST** slice implemented. The native Paper market tab can pair to the existing signed-in HarshalOS account through a short-lived manual browser approval, then reads/writes the same private server ledger as the website. The Worker owns the reviewed scheduled Orb 2 field, provider isolation, immutable quote references, availability/freshness, valuation, append-only event projection, and normalized Market Orb placement. A bundled local-fixture ledger remains in the app strictly as a clearly labeled non-synchronizing legacy/review surface.

There is still no broker connection, money movement, custody, wallet, token issuance, trade execution, investment recommendation, or public account-position feed. The separate Community public-observation publisher can publish an explicitly chosen owner note; it does not publish market declarations, paper positions, quote references, pairing material, fixtures, or market visibility-intent metadata. See the repository-wide [`PAPER_TEST market contract`](../../../docs/PAPER-TEST-MARKET.md).

## Product rule

Every declared operational phase is eligible for the native local paper-market feature:

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

## Server authority and legacy package boundary

The native `PaperMarketService` is a thin HTTPS client for the configured
HarshalOS Worker origin. It uses an isolated no-cookie session, rejects
redirects, validates bounded DTOs, and stores only the pairing capability and
scoped device bearer in Keychain. Native code cannot send a price, provider,
timestamp, valuation, raw universe-core ID, browser cookie, or provider key.

The Worker accepts browser writes only through the existing exact-origin
Community session. Native requests use a revocable, expiring `PAPER_TEST`
bearer redeemed once after explicit browser approval. Device listing/revocation
remains browser-only. A server field outage returns `UNAVAILABLE`; the app may
show its last in-memory rendering as unavailable/offline but never turns a
fixture into a current quote.

`HarshalMarkets` remains a pure Swift package wired into both native targets as
the legacy local-fixture/review model:

```text
HarshalMarkets
├── MarketInstrument          stable normalized instrument identity
├── MarketDeclaration         thesis / horizon / private-public intent metadata
├── PaperPosition             simulated open, amendment, closure, and withdrawal state
├── MarketObservation         provider, observed-at time, availability, provenance
├── PaperLedger               actor-isolated local record and revision history
├── PaperValuation            deterministic long/short calculation over supplied observations
└── HarshalMarketFixtures     bundled deterministic local observations
```

The legacy `PaperLedgerState` is saved with current private app state and can
write a corresponding bounded local-ledger event. It uses `Decimal` for its
fixture calculation. It is never uploaded or automatically converted to a
server position because a bundled fixture has no honest server quote reference.

The bundled `HOS-ALPHA` and `HOS-BETA` instruments remain explicitly labeled
local fixtures, not live quotes, historical assertions, provider data,
recommendations, or market signals. For the shared surface, the Worker creates
each entry/exit quote snapshot from its already stored reviewed field; it keeps
source, interval, observed/retrieved time, expiry, and availability with the
reference. Unknown, held, delayed, or unavailable data remains explicit rather
than becoming a fabricated neutral price or performance result. Server market
requests occur only after explicit native pairing and a user-tapped PAPER_TEST
action; they never call a provider from the device.

## Crypto Orb boundary

A reviewed crypto observation can appear in the server Market Orb as a passive,
display-only node when the Worker has lawfully stored it through the existing
reviewed field. It is not paper-eligible in this slice. The native app performs
no cryptocurrency mining, hidden/background resource work, wallet/custody
operation, token issuance, trade/execution flow, or provider-terms workaround.

## Personal universe cores and public peer fields

**The Orb** is a body’s personal universe core. It is private by default and
holds that body’s local declarations, private/public-intent observations, local
paper records, and any selected private state. It is not a public comparison
surface merely because it can be rendered.

**Orb 2** is the public representation of explicitly published universe-core
projections compared alongside peers. It must consume a dedicated envelope such
as `PublicUniverseProjection`, not inspect a private core directly. That
projection can contain only the deliberately public fields—for example a public
market declaration, an opted-in simulated position size, its public status,
timestamp, revision identity, and disclosed phase provenance.

```text
private The Orb / universe core
    └── explicit Publish action
            └── bounded PublicUniverseProjection
                    └── Orb 2 public peer field
```

All declared phases, including CWO, are allocated through the same public
projection contract. Phase may be shown as provenance or visual material; it
must not filter a body from the peer field or change its market calculation,
rank, return, or berth allocation. A private position remains private unless a
separate publish action selects it for projection.

## Public declarations and sync

A CloudKit private database may later mirror a user’s own **The Orb** records
between their devices, but it is not a public market-declaration network and it
must not be treated as the source of the Orb 2 peer field.

A public feed needs separate explicit design for consent, pseudonymous/profile
policy, revisions and withdrawals, abuse reporting, moderation,
retention/deletion, rate limits, accessibility, and data provenance. Publishing
a paper record must always be a distinct user action.

## Market Orb direction

The current native `NeoOrb` remains a synthetic, display-only geometry model.
It is a shared visual prototype, not the implementation of either private
universe cores or the public Orb 2 field. A future `MarketOrb` adapter may
project reviewed market observations and bounded public universe projections
into Orb 2 geometry without changing their source facts.

The intended path is:

```text
private universe core + explicit published declaration
    → bounded public universe projection

reviewed market observation + public universe projection
    → documented logarithmic/FBB or race calculation
    → immutable display input
    → Orb 2 / MarketOrb adapter
    → The Orb visual mechanics where appropriate
    → SwiftUI Canvas
```

The existing browser Orb 2 work provides a source-backed starting point for two
display lanes: an established-instrument logarithmic-FBB lane and a formation/
IPO lane based on verified history maturity. Those lanes are visualization
context, not forecasts, recommendations, or execution signals.

A future mapping must preserve the raw published position size and phase in the
inspector, use stable identities, label all derived geometry, keep missing data
visibly unavailable, and never use phase as a market-quality or performance
score.
