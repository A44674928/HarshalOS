# The Harshal Priyavadan Patel Financial Model

**Product line:** Good Intelligence · Orb 2
**Attribution:** Harshal Priyavadan Patel
**Model class:** Provider-attributed market-context visualization; display-only
**Package revision:** 2026-10-23

## Product identity and scope

**The Harshal Priyavadan Patel Financial Model** is the branded, combined dashboard in **Good Intelligence → Financial Model**. It presents two neighboring but computationally independent surfaces:

1. **Market Charts** — a user-selected ticker's provider-attributed OHLCV history, with price/logarithmic Fibonacci bands, VFI, and WaveTrend context. The user chooses Tickerbot Live or an explicitly synthetic demo source and a 1-hour or 1-day bar interval.
2. **Orb 2** — the five-Disc, server-field-driven 3D market-context visualization (Stocks, FX, Crypto, Futures, and Indices), including its own selected ticker/timeframe, field status, source/freshness labels, and display geometry.

The combined view is a presentation and navigation change, **not a new calculation that merges a chart ticker with Orb 2**. The chart's selected ticker/provider/bar interval and Orb 2's field/timeframe are independent. Each surface keeps its existing data path, cache, provenance, and missing-input behavior. Changing one interval must not silently change the other.

The scope is Good Intelligence **Market Charts + Orb 2**. Separate real-estate pro formas and the paper-trading P&L application are not included in this product or its ZIP.

> **Meaning of “Financial Model” here:** this is a product name for a market-context and visualization package. It is not a discounted-cash-flow model, security valuation, financial-statement forecast, return/risk model, portfolio optimizer, trading P&L ledger, execution service, or investment recommendation.

## Package documents

- [Mathematical white paper](HPP-FINANCIAL-MODEL-WHITE-PAPER.md) — plain-English explanation and equations, written for AI and non-programming auditors.
- [Reconstruction specification](HPP-FINANCIAL-MODEL-RECONSTRUCTION-SPEC.json) — machine-readable input contracts, defaults, formulas, states, and boundaries.
- [Audit checklist](HPP-FINANCIAL-MODEL-AUDIT-CHECKLIST.md) — practical review prompts for data, math, failure behavior, and deployment.
- [Source map](HPP-FINANCIAL-MODEL-SOURCE-MAP.md) — implementation files, functions, and focused tests.
- [SHA-256 manifest](HPP-FINANCIAL-MODEL-SHA256SUMS.txt) — integrity hashes for the package documents.
- [Downloadable ZIP](The-Harshal-Priyavadan-Patel-Financial-Model.zip) — document-first bundle; no webpage export or source-code dump.

## Surface 1 — Market Charts

The chart panel uses the reviewed 52-symbol Tickerbot watchlist by default, with a separate synthetic-demo option. Live requests are allowlisted and go from the browser to the same-origin Good Intelligence Worker route; provider credentials stay server-side. The chart selector exposes **1h** and **1d** bars. The displayed price, source, interval, bar count, and technical context are derived from supplied bars. A missing or refused response produces an explicit unavailable state; no OHLCV bars or prices are fabricated. Demo bars remain labeled synthetic and are not substituted for failed live bars.

The indicator defaults and exact transformations are documented in the white paper and reconstruction specification. In brief: VFI requires complete OHLC plus volume; log-space Fibonacci Bands can remain available in price-only context; WaveTrend uses the selected price source; signals/alerts are descriptive indicator conditions, not instructions to act.

## Surface 2 — Orb 2

Orb 2 renders stored, provider-attributed observations in five reviewed Disc families. The Worker owns provider selection, bounded collection, validation, composition, and field publication. The browser reads the field through same-origin routes; provider secrets do not enter the page. A daily score is the composition baseline; a confirmed 15-minute score can contribute a freshness-weighted residual. This composition and the radial/coordinate mappings are display-only.

Provider configuration is deployment-dependent. The reviewed boundaries include Tickerbot for Stocks, Kraken Spot for Crypto, and Massive by default for FX, active Futures, and Indices; Twelve Data and the bounded FX fallback may be selected by configuration. Missing, stale, misaligned, malformed, synthetic-when-disallowed, or refused inputs remain held/unavailable under the relevant contract. Read the provider, interval, timestamp, confirmation, status, and freshness with every observation.

Dollar Strength (DS) is a calculated daily reference based on six confirmed, aligned Massive FX closes and the documented ICE USDX Rule 15.01 weights. It is **not** the licensed real-time ICE-distributed Dollar Strength/DXY value, a formal Ground-0 phase, an action gate, or an authority signal.

## Interpretation and explicit boundaries

- Provider attribution does not independently verify a quote or provider calculation.
- Market Charts does not have a substitute-feed fallback: select Synthetic demo explicitly if desired. Synthetic data is never presented as live.
- Market Charts displays the supplied bar timing and confirmation state; do not infer data freshness from the dashboard being open. There is no separate client-side age threshold for every displayed chart bar.
- Orb 2 freshness/composition rules are distinct from Market Charts. A missing daily baseline yields `hold`; a missing or stale 15-minute input falls back to the daily baseline rather than becoming zero.
- Indicators, visual positions, radial distance, color, animation, DS context, and labels do not encode a target price, expected return, probability of success, buy/sell decision, recommendation, or permission to act.
- The product is not financial, investment, tax, or legal advice; a security rating; a guarantee of performance; an order-entry, brokerage, custody, wallet, settlement, or trading system; or an authorization mechanism.

The brand is attribution only. It does not certify model performance, provider accuracy, rights, regulatory status, or deployment readiness. Production secrets, provider permissions, Cloudflare Access, D1 remote migrations, Cron behavior, and runtime resource limits must be checked in the target deployment. A local test or preview is not proof of production readiness.

## How to open and review

1. Launch **Good Intelligence** from the HarshalOS desktop.
2. Select **Financial Model**. Market Charts and Orb 2 appear together.
3. For charts, inspect the selected provider, ticker, interval, source label, bar count, and timestamps. Switch to Synthetic demo only when intentionally reviewing synthetic fixtures.
4. For Orb 2, inspect the field/Disc, provider, timeframe, confirmation, freshness, and missing/held state before interpreting its geometry.
5. Treat the inspector and 3D controls as review and presentation tools only.

## Verification

Focused checks cover the chart indicator math, Orb 2 rendering and Worker contract, daily/15-minute composition, Dollar Strength input gates, and desktop integration:

```sh
node --test \
  tests/good-intelligence-market-context-test.mjs \
  tests/good-intelligence-orb2-test.mjs \
  tests/good-intelligence-dxy-test.mjs \
  tests/orb2-composition-test.mjs \
  tests/g0-desktop-test.mjs
```

Run `npm run test:app` for the application suite or `npm test` for the repository suite. Tests establish coded behavior against fixtures; they do not establish investment performance, provider correctness, licensing, or production deployment state.
