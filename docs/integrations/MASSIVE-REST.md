# Massive REST market data

**Status:** bounded Worker integration retained; the standalone **Massive Markets** desktop window was retired on 2026-10-04. The active desktop no longer loads `js/apps-massive.js` or `css/massive.css`.

Massive remains relevant to the reviewed Characters market-beat architecture. Retiring the old browser window does **not** expose the key, remove the Worker guardrails, create a new market-data feed, or make a financial claim.

## Active boundaries

There are two deliberately separate server-side paths:

```text
Characters desktop
  GET /api/characters/v1/beat (reviewed Disc + provider plan)
        ↓ same-origin Worker
worker/characters-massive.mjs
  fixed reviewed instrument + 1d-only shape + five-per-minute / D1 guards
        ↓ Authorization: Bearer header only
https://api.massive.com
```

- Characters owns the active use: automatic Massive observations are restricted to reviewed `1d` Disc instruments. It does not accept an arbitrary Massive ticker from browser input.
- `worker/characters-massive.mjs` is narrower than the generic adapter. It selects reviewed stock, FX, Massive-ranked crypto, verified active commodity-futures, or index shapes and normalizes only an honest packet for the Characters stage. Crypto is ranked from Massive's previous-UTC-day grouped aggregates (unique USD pairs with positive base volume and VWAP); its source-date-aware D1 cache expires at UTC midnight and requires the previous-UTC-day ranking (migration `0010_characters_crypto_ranking_cache.sql`). `worker/characters-futures-contracts.mjs` resolves each reviewed Disc4 product code against Massive's [Futures contracts reference endpoint](https://massive.com/docs/rest/futures/contracts) for the current UTC date; only active single contracts with matching product code, valid ticker, and future last-trade date are cached through UTC midnight by migration `0011_massive_futures_contract_cache.sql`. The endpoint requires Futures-plan access. An unauthorized key, missing product/date result, expired, or malformed contract holds Disc4 without a stale-ticker fallback; product retries are cooled down, and transport/authentication failures open a shared endpoint circuit-breaker cooldown. The code and fixture tests do not prove the deployed account's entitlement.
- The standalone `/api/massive/v1/*` adapter remains a bounded compatibility/operations surface in `worker/massive.mjs`; it is **not** registered as a desktop app and no active browser UI calls it. It may only serve its fixed GET routes and is not a general Massive relay.
- Good Intelligence’s Orb 2 calls the same narrow `/api/characters/v1/beat` route used by Characters, which can return Massive’s reviewed daily packets. It uses those observations only with the shared Characters display-motion engine; the 3D model is not a direct Massive client, receives no provider secret, and gains no recommendation, authorization, or transaction capability. Server-side Orb 2 history stores only compact observation/motion summaries through a separate D1 endpoint.

The browser never receives `MASSIVE_API_KEY`. The key is read only from the Worker environment and sent upstream in an `Authorization: Bearer` header—never in a URL, browser setting, static source value, log field, or response field.

## Characters cadence and honesty

The active Characters rule set is documented in [`CHARACTERS-MARKET-BEAT.md`](../architecture/CHARACTERS-MARKET-BEAT.md):

- Massive is the reviewed automatic `1d` provider across the five Discs, with **up to five requests per minute** through the shared envelope and a separate per-UTC-day D1 allowance. Bar requests are one symbol each; each uncached Disc4 product needs one active-contract lookup before its bars, while a cold crypto ranking refresh is another call in the same envelope. Orb 2 resolves at most one missing product per tick; whichever metadata refreshes are due reduce that tick's bar slots. The route keeps `cadence=1` as the daily-bar contract; it is not a one-minute-only cooldown.
- Tickerbot is manual/on-demand Disc1 stock observation for `1h` or `1d`; it does not silently substitute for a missing Massive packet.
- Alpha Vantage is the Disc1 `1mo` spotlight: exactly one best-performing reviewed ticker per hour. It is independent of Massive.
- Missing, unavailable, rate-limited, malformed, or empty provider responses stay visibly unavailable. No provider is silently replaced and no price, recommendation, or authorization is inferred.

This is display context only—not investment advice, a trade instruction, an executable quote, an assurance result, or an input to a Permit/Refuse decision.

## Retained generic adapter

`worker/massive.mjs` still validates and reconstructs a small fixed REST surface. It accepts only GET requests for these routes:

| Retained same-origin route | Fixed Massive endpoint |
| --- | --- |
| `GET /api/massive/v1/previous-day` | [`GET /v2/aggs/ticker/{ticker}/prev`](https://massive.com/docs/rest/stocks/aggregates/previous-day-bar) |
| `GET /api/massive/v1/bars` | [`GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}`](https://massive.com/docs/rest/stocks/aggregates/custom-bars) |
| `GET /api/massive/v1/ticker-details` | [`GET /v3/reference/tickers/{ticker}`](https://massive.com/docs/rest/stocks/tickers/ticker-overview) |
| `GET /api/massive/v1/last-trade` | [`GET /v2/last/trade/{stocksTicker}`](https://massive.com/docs/rest/stocks/trades-quotes/last-trade) |
| `GET /api/massive/v1/dividends` | [`GET /stocks/v1/dividends`](https://massive.com/docs/rest/stocks/corporate-actions/dividends) |
| `GET /api/massive/v1/conversion` | [`GET /v1/conversion/{from}/{to}`](https://massive.com/docs/rest/forex/currency-conversion) |

The adapter validates asset/ticker shapes (`AAPL`, `X:BTCUSD`, `C:EURUSD`, `I:SPX`), multiplier, documented aggregate timespan, ISO date windows, range caps, result limits, and currency codes before it reconstructs an upstream request. A traversal-shaped value such as `AAPL/../v3/reference/tickers` is refused locally; it cannot become an upstream path.

Successful adapter responses use `{ success, cached, data }`. The in-memory cache is at most 60 seconds. Failures use stable public codes/messages; upstream error bodies are not an API response channel. Redirects are refused, upstream calls time out, and the Worker never mirrors an arbitrary provider URL.

### Pacing

The retained generic adapter has best-effort per-Worker-isolate sliding windows: one deployment-wide and one per client IP, both defaulting to five upstream requests per minute. `MASSIVE_DEPLOYMENT_LIMIT_PER_MINUTE` and `MASSIVE_CLIENT_LIMIT_PER_MINUTE` can narrow or widen those safeguards. Cloudflare isolate distribution/restarts mean they are not a durable global quota; the owner’s Massive plan remains binding.

Characters has its own narrower reviewed adapter plus its D1 daily allowance and shared per-minute envelope. It is not a bypass around the generic adapter’s validation or pacing model.

## Worker secret setup

Get a key from the [Massive dashboard](https://massive.com/dashboard/keys) ([signup](https://massive.com/dashboard/signup) if needed). Choose the intended Worker environment first, then enter it through Wrangler’s interactive prompt or Cloudflare’s Worker Secrets UI. Do not paste it into source, a browser console, a URL, a ticket, or chat.

```bash
# Production Worker
npx wrangler secret put MASSIVE_API_KEY

# Intentional staging Worker only
npx wrangler secret put MASSIVE_API_KEY --config wrangler.staging.jsonc
```

For `wrangler dev`, an operator may create the ignored `.dev.vars` file with `MASSIVE_API_KEY`. Never put that secret in `wrangler.jsonc`, `wrangler.staging.jsonc`, a browser bundle, or a committed `.env` file. No secret is needed for the automated tests.

## Tests and verification

```bash
npm run test:massive
npm run test:characters
```

`tests/massive-api-test.mjs` covers the retained generic Worker adapter with stubbed upstream responses: fixed paths, bearer-header handling, validation, cache/pacing behavior, secret-absent fail-closed handling, error mapping, and no credential leakage. `tests/massive-ui-test.mjs` verifies retirement of the browser window while ensuring the Worker surfaces remain present. `tests/characters-massive-test.mjs` covers the active reviewed Characters adapter, including futures-session normalization. None of these tests makes a live Massive request.

## Official references

- [Massive REST quickstart](https://massive.com/docs/rest/quickstart)
- [Massive REST stocks overview](https://massive.com/docs/rest/stocks/overview)
- [Massive grouped daily crypto aggregates](https://massive.com/docs/rest/crypto/aggregates/daily-market-summary)
- [Massive commodity coverage](https://massive.com/knowledge-base/article/does-massive-support-commodities-data)
- [Massive futures contracts and active-date filters](https://massive.com/docs/rest/futures/contracts)
- [Massive REST futures aggregates](https://massive.com/docs/rest/futures/aggregates)
- [Massive dashboard API keys](https://massive.com/dashboard/keys)
