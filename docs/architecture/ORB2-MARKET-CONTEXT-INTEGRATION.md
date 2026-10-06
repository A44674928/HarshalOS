# Orb 2 market-context integration

**Status:** implemented, display-only analytical integration.

Orb 2's server field now carries the established Fibonacci comparison alongside each validated market observation. The provider packet remains the source observation; the comparison is derived locally from that packet.

## Data path

```
reviewed provider
    ↓
gi-market-context-v1
    ↓
GoodIntelligenceMarketContext.evaluate()
    ├── FBB-200 (reference)
    └── FBB-L60 (experimental)
    ↓
gi-fbb-comparison-v1
    ↓
Orb 2 stored observation
    ↓
render-only clients
```

The comparison is not a second provider observation and does not merge bars from different providers.

## Variant boundary

- **FBB-200** remains the reference calculation.
- **FBB-L60** uses the same logarithmic-domain FBB mathematics with a 60-bar window.
- Each variant reports its actual required and available history.
- Fewer than 60 bars means FBB-L60 is explicitly `insufficient-history`; no bars are manufactured.
- FBB-L60 is marked `experimental` and cannot supersede FBB-200 by producing a different-looking result.

## Provenance

The comparison retains the Orb observation's provider, provider-native identifier, instrument, asset class, timeframe, source, and actual bar count. The Worker validates the compact comparison again before storing or returning the observation.

## Scope

This integration intentionally does **not**:

- add Alpaca;
- make HF Data Library a silent fallback provider;
- alter FBB-200 mathematics;
- authorize trading or execution;
- turn an analytical comparison into an assurance or permission signal.

HF Data Library remains an explicit historical archive lane. Alpaca remains a separate future provider adapter.
