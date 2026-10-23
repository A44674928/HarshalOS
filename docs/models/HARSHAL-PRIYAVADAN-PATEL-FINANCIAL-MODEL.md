# The Harshal Priyavadan Patel Financial Model

**Product line:** Good Intelligence · Orb 2  
**Model class:** Display-only, provider-attributed market-context model  
**Package scope:** Brand and product documentation for the existing Orb 2 system. No market logic, provider rules, assumptions, or data were changed to apply this brand.

## Product identity

**The Harshal Priyavadan Patel Financial Model** is the product name for the market-context experience in **Good Intelligence → Financial Model · Orb 2**. The HPP monogram is a compact UI mark; the full product name is the canonical brand.

**Positioning:** An attribution-first, five-Disc market-context visualization. Orb 2 renders stored observations from reviewed provider routes as an interactive 3D field, with source, status, freshness, and missing-data state kept visible.

> **Meaning of “Financial Model” here:** this is a brand name for the Orb 2 market-context system. Orb 2 is not a discounted-cash-flow model, company valuation, financial-statement forecast, portfolio optimizer, P&L ledger, risk-tolerance assessment, or investment research recommendation.

## What is included

| Package layer | Responsibility | Main source |
|---|---|---|
| Branded entry point | Good Intelligence navigation and lazy mounting of the Financial Model view | `js/apps-good-intelligence.js` |
| Branded model surface | HPP identity, Orb 2 canvas, model controls, field status, inspection, and display geometry | `js/good-intelligence-orb2.js` · `css/good-intelligence.css` |
| Reviewed market context | Provider/Disc contracts, ticker roster, market-context measures, and Dollar Strength reference logic | `js/characters-disc-catalog.js` · `js/characters-beat.js` · `js/good-intelligence-market-roster.js` · `js/good-intelligence-market-context.js` · `js/good-intelligence-dxy.js` · `js/market-extension.js` |
| Server field | Bounded provider work, validation, composition, publication, and same-origin field reads | `worker/orb2-field.mjs` · `worker/orb2-field-publish.mjs` · `worker/orb2-composition.mjs` · provider adapters under `worker/` |
| Persistence and schedule | D1 field/history storage, supporting migrations, and scheduled publication/collection configuration | `migrations/community/0008_orb2_saved_beats.sql` · `0009_orb2_server_field.sql` · `0018_orb2_field_snapshot.sql` · `wrangler.jsonc` |
| Contract and operator detail | Shared beat contract, data-source boundaries, and deployment operation | [`Orb 2 / Characters bridge`](../characters/good-intelligence-orb2-bridge.md) · [`Orb 2 Cron plan`](../deployment/ORB2-CRON-PLAN.md) · [`Orb 2 beat runner`](../deployment/ORB2-BEAT-RUNNER.md) |

The five Disc families are **Stocks, FX, Crypto, Futures, and Indices**. Provider selection is enforced by the Worker and can depend on deployment configuration: Stocks are Tickerbot-only; Crypto uses Kraken Spot; FX, active Futures, and Indices use the Massive route unless `TWELVEDATA_API_KEY` selects Twelve Data for daily context. The FX lane also has a separately documented, bounded Alpha Vantage fallback. Missing or refused inputs remain held rather than silently substituted. The dated market-cap roster is metadata with provenance, not a live substitute for market data. See the bridge and deployment documents for the channel/interval contracts and the current deployment's provider configuration and terms.

## Data path

1. **The server selects bounded work.** Orb 2's scheduled Worker field selects work from the reviewed Disc/provider lanes and applies the configured durable budgets, queues, caches, and freshness rules.
2. **The Worker validates and stores observations.** Provider identity, instrument, interval, and response shape are checked before an observation is accepted into the field. Where configuration or data is unavailable, the relevant result remains held/unavailable rather than being fabricated or swapped from another source.
3. **The browser reads the field from this origin.** Orb 2 polls `GET /api/good-intelligence/v1/orb2/field` (normally every 20 seconds, more slowly when the tab is hidden). Provider credentials do not enter the page; the browser does not call a market-data provider directly.
4. **Explicit controls can request server work.** “Beat now,” a focused refresh, or calibration can issue a bounded same-origin request for Worker-managed work. This is data collection/refresh only; it does not place or settle a trade.
5. **Orb 2 renders context.** The browser composes the returned, attributed observations into the five-Disc constellation, selected-node details, status readouts, and display-only market-context geometry. Stored beat history is separate from the currently rendered field.

The `observation` beat is the live-provider observation type. `message`, `trade`, `authorization`, and `permission` are deterministic local display scenarios; their names do not denote transmitted OCM messages, real trades, authorizations, or granted permissions.

## Interpretation rules

- A market observation is not independently verified merely because a provider supplied it. Read its provider, timestamp, interval, confirmation, freshness, and status alongside the display.
- Missing, stale, unaligned, malformed, or refused input stays **missing/held**. It is not a zero, a neutral reading, or a synthetic live replacement.
- VFI, Fibonacci-band position, WaveTrend, price change, derived motion, Dollar Strength context, radial placement, and berth separation are descriptive/display inputs. They do not produce a buy/sell signal, price target, return, ranking, or probability of success.
- Dollar Strength (DS) is a read-only reference computed from six aligned FX closes. It is not the licensed ICE DXY value, a formal Ground-0 phase, or an action gate.
- Orb 2 pathways and particle/line effects are local visualization. No OCM message is transmitted.

## Explicit boundaries

This product is not:

- a valuation, forecast, recommendation, or trade-execution service;
- financial, investment, tax, or legal advice;
- a security rating, price target, or guarantee of performance;
- an order-entry, brokerage, custody, wallet, settlement, or trading-execution system;
- an authorization or permission mechanism; or
- evidence that a market-data provider's observation is complete, current, licensed for every use, or independently correct.

The brand does not change those boundaries. Provider requests and stored observations remain subject to the existing Worker configuration, provider terms, D1 migrations, and access controls. A successful local preview does not prove production credentials, migrations, provider rights, or scheduled field availability.

## How to open

1. Launch **Good Intelligence** from the HarshalOS desktop.
2. Choose **Financial Model** in the view navigation (the product line is **Good Intelligence · Orb 2**).
3. Read the provider, field, beat, persistence, and freshness states before interpreting a visual.
4. Use the Disc selector, focus controls, color key, model-boundary details, and selected-node inspector to inspect how a displayed observation is represented. Use the 3D controls as presentation controls only.

If a lane is unavailable, the model should say so and hold the affected field. Do not treat an empty or stale field as current market coverage.

## Verification

Run the focused model and Worker checks:

```sh
node --test tests/good-intelligence-orb2-test.mjs tests/good-intelligence-orb2-worker-test.mjs tests/orb2-composition-test.mjs tests/orb2-field-scheduler-test.mjs tests/orb2-field-publish-test.mjs
```

The wider app suite is `npm run test:app`; the full repository suite is `npm test`. These tests verify implementation contracts and fixtures, not investment performance, provider accuracy, regulatory compliance, or production deployment state.
