# Crypto market-data provider: Kraken adopted; Crypto APIs evaluated

**Reviewed:** 2026-10-05  
**Status:** Kraken public Spot is the current Characters/NAB crypto provider. Crypto APIs (`cryptoapis.io`) was evaluated and is not adopted for this market-data lane.

## Current provider contract

Characters and NAB Discs use Kraken for Crypto at `1d`. The route is venue-specific and fail-closed: a provider, pair, interval, or response mismatch leaves the field unavailable. It never falls through to Massive, Tickerbot, Alpha Vantage, FRED, or a guessed market value.

### Public endpoints and metric

- The ranking adapter calls Kraken Spot's public `GET /0/public/Ticker` without a pair parameter and selects unique USD-quoted Spot pairs.
- Each eligible pair is ranked by Kraken's reported rolling-24-hour USD notional: base volume `v[1] ×` 24-hour VWAP `p[1]`. This is a **Kraken venue-only rolling window**, not a market-wide ranking and not the former Massive previous-UTC-day grouped-aggregate metric.
- Up to 52 unique pairs are retained. The roster fails closed if fewer than 52 have the required positive volume and VWAP fields. Stablecoin candidates remain eligible but are flagged; market cap is unavailable and remains `null`, not inferred.
- Per-pair daily bars use Kraken Spot's public `GET /0/public/OHLC` with `interval=1440` and an exact ranked USD pair identity. Provider symbols `XBT` and `XDG` are represented to users as `BTC` and `DOGE`; the original Kraken pair remains the validated `providerId`/`krakenPair`. No alias is guessed from arbitrary browser input.
- The adapter retains at most 60 valid daily bars, preserves volume only when Kraken supplies a valid value, and marks the current UTC-day candle unconfirmed. The provider packet remains `1d` and non-synthetic.

### Account, key, limits, and failure behavior

**No Kraken account or API key is needed for these public Spot Ticker and OHLC market-data endpoints.** Kraken credentials are for private account functions; this code does not read or request a Kraken API secret for the public route. Do not add a key to the browser, Worker secrets, or deployment settings for this lane.

Kraken documents endpoint/IP-based public API limits rather than a single daily entitlement. HarshalOS applies its own shared, fail-closed safety gate across Characters and Orb 2: at most one outbound Kraken call per second and 160 attempted calls per UTC day. The 160-call ceiling is an application safety limit, **not** a Kraken quota or entitlement. The D1 ranking cache lasts 24 hours; successful pair-bar packets cache to the next UTC midnight; failed attempts use a bounded retry hold. If the ledger cannot reserve a call, no upstream request is sent.

## Provider matrix

| Surface | Crypto source | Interval | Notes |
|---|---|---:|---|
| Characters selector/endpoint | Kraken Spot | `1d` | Only crypto choice; exact USD pair identities from the validated ranking. |
| NAB Discs | Kraken Spot | `1d` | Provider/channel/interval and pair identity are checked before rendering or saving. |
| Orb 2 | Kraken-tagged daily crypto beat | `1d` | Reads provider-tagged field data; does not create a second Crypto route. |
| Orb 2 stock warm/intraday lane | Tickerbot | `15m` internally | Separate Stocks lane. This does not add `15m` to the Characters selector and is unrelated to Kraken Crypto. |

## Why Crypto APIs was not adopted

The Crypto APIs Market Data evaluation found that the product exposes current asset details and current exchange rates, but not daily OHLCV/candles, historical series, or VWAP. Those are product-scope gaps, not a free-tier quota problem, so its Market Data product cannot supply this ranked daily Crypto contract. Its separate blockchain infrastructure products (addresses, transactions, blocks, webhooks) may be relevant to a future on-chain feature, but no such feature is part of the current orb data path.

References: [Crypto APIs developer portal](https://developers.cryptoapis.io/), [Market Data FAQ](https://cryptoapis.io/use-cases/market-data-applications), and [pricing](https://cryptoapis.io/pricing). Product limits and terms can change; re-check current terms before any separate integration.

## Provider-change guardrails

Do not replace Kraken based only on a higher-level quota or a current-price endpoint. An alternative for the current daily crypto lane would need explicit approval for its metric (venue-only versus cross-market), a ranked pair roster, exact source identity, daily OHLC with honest field shape, public/private access requirements, rate limits, caching, and data-use rights. Any adapter must have a fixed same-origin route and fail closed on missing or mismatched data. No source substitution is allowed.

FRED is not a primary Crypto or other market layer. If considered later, it must be a separately agreed, transient/reference-only design with a rights review after the current provider split is verified.

## Official Kraken references

- [Public Ticker](https://docs.kraken.com/api/docs/rest-api/get-ticker-information/)
- [Public OHLC](https://docs.kraken.com/api/docs/rest-api/get-ohlc-data/)
- [Kraken API introduction and rate limits](https://docs.kraken.com/api/docs/guides/global-intro)
