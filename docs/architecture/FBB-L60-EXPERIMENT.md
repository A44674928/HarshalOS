# FBB-L60 experimental variant

**Status:** experimental analytical variant

## Purpose

`FBB-L60` is a deliberately separate 60-bar Fibonacci Bollinger Band variant for observing what becomes available when a provider supplies roughly 60 daily observations.

It does **not** replace `FBB-200`.

- `FBB-200`: 200-bar reference/production calculation.
- `FBB-L60`: 60-bar experimental calculation.
- Both use the existing JavaScript logarithmic-domain FBB mathematics.
- `FBB-200` remains unchanged as the default `bandLen: 200` evaluation.
- No provider is asked to manufacture or substitute missing history.

## Capacity semantics

The comparison helper `GoodIntelligenceMarketContext.compareFbbVariants()` reports provider/instrument context, actual available bars, required bars, and explicit state for both variants.

Example with a Kraken daily series containing 60 bars:

| Variant | Required | Available | State |
| --- | ---: | ---: | --- |
| FBB-200 | 200 | 60 | `insufficient-history` |
| FBB-L60 | 60 | 60 | `available` / `experimental` |

A 59-bar series leaves both variants `insufficient-history`. A 200-bar series makes both variants available and directly comparable.

This distinction is intentional. Provider capacity is evidence about the observation; it is not permission to relax another indicator's requirement.

## Comparison instrumentation

The comparison packet uses schema `gi-fbb-comparison-v1` and exposes:

- provider and provider-native instrument identity when supplied;
- asset class and interval;
- actual `availableBars`;
- required bars and status for `FBB-200` and `FBB-L60`;
- basis;
- `±0.618` and `±1.000` Fibonacci levels;
- price-unit deltas from the basis;
- logarithmic deltas from the basis;
- an explicit statement that `FBB-L60` is experimental and does not supersede `FBB-200`.

The instrumentation is designed for the Orb 1 / Orb 3 comparison lane:

- **Orb 1 / deep-history analytical lane:** both variants can be available, allowing direct comparison of their bases and band displacement.
- **Orb 3 / constrained Kraken lane:** a roughly 60-bar daily history can expose FBB-L60 while correctly keeping FBB-200 unavailable.

The comparison packet is analytical telemetry. It does not create a score, forecast, authorization, execution instruction, or new provider authority.

## Mathematical boundary

The existing FBB calculation remains the mathematical source for both variants:

1. select the configured price source;
2. transform positive prices with `ln(source)`;
3. calculate the selected moving-average basis in log space;
4. calculate population standard deviation in log space;
5. apply the Fibonacci multiplier and ratios in log space;
6. exponentiate the levels back into price units.

FBB-L60 changes only the observation window from 200 to 60 bars. It does not introduce a second formula.

The comparison instrumentation specifically records `0.618` and `1.000` levels because those provide the primary displacement comparison without turning the experimental variant into a separate signal system.

## Governance boundary

A different-looking or more responsive FBB-L60 result does not acquire greater authority merely because it is available on a shorter history.

`experimental` is part of the data contract, not a UI decoration.

Missing FBB-200 history remains missing. FBB-L60 availability must not be used to relabel FBB-200 as ready, and no automatic provider substitution is performed.
