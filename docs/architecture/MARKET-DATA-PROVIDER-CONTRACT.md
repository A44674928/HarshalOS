# Good Intelligence market-data provider contract

**Status:** foundation contract for provider adapters. This document defines provenance and capability semantics; it does not authorize trading, execution, recommendation, or investment decisions.

## Contract

The shared Worker module `worker/market-data-provider.mjs` defines `gi-market-provider-v1`.

A provider adapter remains responsible for its own upstream authentication, request limits, symbol/instrument validation, caching, and raw-response normalization. The common contract does not replace those controls.

The common boundary answers four questions:

1. **Who supplied the observation?** — explicit provider identity.
2. **What observation was requested?** — instrument, asset class, and interval when known.
3. **How much history actually exists?** — `availableBars` and optional provider `historyLimit`.
4. **Can the requested calculation be supported?** — a structured capability state rather than a fabricated value or silent provider substitution.

## Provenance

Normalized `gi-market-context-v1` packets may carry:

```text
provenance:
  contract: gi-market-provider-v1
  provider: <stable lowercase provider id>
  providerId: <provider-native identity, when applicable>
  instrument: <normalized instrument identity>
  assetClass: <asset class>
  timeframe: <normalized interval>
  retrievedAt: <epoch milliseconds>
  availableBars: <actual bars supplied>
  historyLimit: <provider/request ceiling, when known>
  source: <bounded human-readable source label>
```

Provider identity is never inferred from a human-readable `source` string. A provider adapter should supply the structured fields directly.

## History capacity

`describeHistoryCapability()` distinguishes provider capacity from indicator requirements:

- `available` — enough observations exist for the stated requirement, or observations exist and no requirement was supplied.
- `insufficient-history` — observations exist, but fewer than the stated requirement are available.
- `unavailable` — no usable observations are available.
- `unknown` — the available history is not known.

An indicator requirement belongs to the consumer. For example, `FBB-200` requiring 200 bars does **not** mean a Kraken adapter is required to manufacture 200 bars when it supplies only 60.

## Structured unavailability

`marketDataUnavailable()` produces a stable result with:

- `ok: false`
- the adapter's existing error `code`
- a bounded human-readable `message`
- `marketData.contract: gi-market-provider-v1`
- `marketData.state`
- provider identity
- optional instrument/timeframe
- optional `availableBars` and `requiredBars`

This allows UI and downstream logic to distinguish, for example:

```text
FBB-200
  state: insufficient-history
  provider: kraken
  availableBars: 60
  requiredBars: 200
```

from:

```text
FBB-200
  state: unavailable
  provider: alpaca
```

Those states must not be collapsed into a generic `null` and must not trigger automatic provider substitution.

## Provider boundary

```text
provider adapter
    │
    ├── validate instrument / interval
    ├── fetch or read cache
    ├── normalize provider response
    ├── preserve raw observation shape
    │
    ▼
market-data-provider contract
    │
    ├── explicit provenance
    ├── explicit history capacity
    └── structured availability
    │
    ▼
gi-market-context-v1
    │
    └── indicator calculation / visualization
```

The contract is deliberately additive. Existing provider-specific controls remain authoritative, and future adapters such as Alpaca and HF Data Library can implement the same boundary without rewriting Kraken, Tickerbot, or Massive.

## Scope of PR #81

PR #81 establishes this contract and its regression tests. It does **not** add a new upstream provider, change indicator mathematics, or alter Orb visuals. The experimental FBB-L60 calculation is implemented separately and consumes this contract's explicit history-capacity semantics without weakening the existing FBB-200 requirement.
