# Massive REST market data

**Status:** bounded Worker integration retained; the standalone **Massive Markets** desktop window was retired on 2026-10-04. The active desktop no longer loads `js/apps-massive.js` or `css/massive.css`.

Massive remains the current provider for the reviewed **FX, Commodities, and Indices** routes. It is not the active Characters/NAB provider for Stocks (Tickerbot) or Crypto (Kraken). Retiring the old browser window does not expose the key, remove Worker guardrails, create a new data feed, or make a financial claim.

## Active provider boundary

```text
Characters / NAB — FX, Commodities, or Indices only
  GET /api/characters/v1/beat (validated Disc, Massive, reviewed symbol, interval=1d)
        ↓ same-origin Worker
worker/characters-massive.mjs + guarded provider routes
  one reviewed daily instrument; futures require today's validated active contract
        ↓ Authorization: Bearer header only
https://api.massive.com
```

- `worker/characters-massive.mjs` is the narrow daily adapter. It accepts reviewed FX, index, and currently validated futures instruments; Tickerbot owns Stocks and Kraken Spot owns Crypto. It never accepts a browser-supplied arbitrary ticker or replaces another provider.
- Commodity futures resolution uses Massive's [Futures contracts reference endpoint](https://massive.com/docs/rest/futures/contracts) for the current UTC date. Only active single contracts with matching product code, valid ticker, and future last-trade date are accepted. The D1 selection expires at UTC midnight (migration `0011_massive_futures_contract_cache.sql`). An unauthorized key, missing product/date result, expired or malformed contract holds the instrument without a stale-ticker fallback. Product retries are cooled down, and transport/authentication failures open a shared endpoint circuit-breaker cooldown. Code and fixture tests do not prove the deployed account's entitlement; the live account must have the required Futures access.
- The retained generic `/api/massive/v1/*` adapter is an operations/compatibility surface in `worker/massive.mjs`; it is not registered as a desktop app and no active browser UI calls it. It is a bounded fixed-route Worker proxy, not a general provider relay.
- Orb 2 reads its server-managed field and does not call Massive directly from browser code. Its field uses Massive only for the reviewed FX, Futures, and Indices channels. Stocks use Tickerbot; Crypto uses Kraken. Orb 2's internal Tickerbot `15m` stock warm/intraday lane is separate and does not change the Characters or NAB interval contract.

The browser never receives `MASSIVE_API_KEY`. The key is read only from the Worker environment and sent upstream in an `Authorization: Bearer` header—never in a URL, browser setting, static source value, log field, or response field.

## Characters/NAB cadence and honesty

The full channel matrix is in [`CHARACTERS-MARKET-BEAT.md`](../architecture/CHARACTERS-MARKET-BEAT.md):

- Massive serves **FX, Commodities, and Indices at `1d`** only. Characters and NAB use reviewed symbols; each daily request is one instrument per Worker request.
- The shared provider envelope allows up to five upstream requests per minute. The Characters D1 ledger applies its own conservative 300-attempt UTC-day safety ceiling. These are application guardrails, not proof of Massive plan entitlement.
- `cadence=1` is the Massive daily-bar contract, not a one-minute request cooldown. Commodity contract discovery is a separate, guarded request before bars for a product whose active contract is not cached.
- Massive does **not** serve the active Stocks or Crypto channels. Tickerbot serves Characters stock `1h`/`1d` and NAB stock `1d`; Kraken public Spot serves Crypto `1d`. A Massive error never falls through to either provider.
- Missing, unavailable, rate-limited, malformed, or empty provider responses remain visibly unavailable. Price/volume fields are not invented and no provider is silently replaced.

Market data is display context only—not investment advice, a trade instruction, an executable quote, an assurance result, or an input to a Permit/Refuse decision.

## Retained generic adapter

`worker/massive.mjs` validates and reconstructs a small fixed REST surface. It accepts only GET requests for these routes:

| Retained same-origin route | Fixed Massive endpoint |
| --- | --- |
| `GET /api/massive/v1/previous-day` | [`GET /v2/aggs/ticker/{ticker}/prev`](https://massive.com/docs/rest/stocks/aggregates/previous-day-bar) |
| `GET /api/massive/v1/bars` | [`GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}`](https://massive.com/docs/rest/stocks/aggregates/custom-bars) |
| `GET /api/massive/v1/ticker-details` | [`GET /v3/reference/tickers/{ticker}`](https://massive.com/docs/rest/stocks/tickers/ticker-overview) |
| `GET /api/massive/v1/last-trade` | [`GET /v2/last/trade/{stocksTicker}`](https://massive.com/docs/rest/stocks/trades-quotes/last-trade) |
| `GET /api/massive/v1/dividends` | [`GET /stocks/v1/dividends`](https://massive.com/docs/rest/stocks/corporate-actions/dividends) |
| `GET /api/massive/v1/conversion` | [`GET /v1/conversion/{from}/{to}`](https://massive.com/docs/rest/forex/currency-conversion) |

The generic adapter validates asset/ticker shapes (`AAPL`, `X:BTCUSD`, `C:EURUSD`, `I:SPX`), multiplier, documented aggregate timespan, ISO date windows, range caps, result limits, and currency codes before reconstructing an upstream request. A traversal-shaped value such as `AAPL/../v3/reference/tickers` is refused locally and cannot become an upstream path. The fact that this compatibility adapter understands a broad Massive ticker shape does not make those assets active Characters/NAB provider routes.

Successful adapter responses use `{ success, cached, data }`. The in-memory cache is at most 60 seconds. Failures use stable public codes/messages; upstream error bodies are not an API response channel. Redirects are refused, upstream calls time out, and the Worker never mirrors an arbitrary provider URL.

### Pacing

The retained generic adapter has best-effort per-Worker-isolate sliding windows: one deployment-wide and one per client IP, both defaulting to five upstream requests per minute. `MASSIVE_DEPLOYMENT_LIMIT_PER_MINUTE` and `MASSIVE_CLIENT_LIMIT_PER_MINUTE` can narrow or widen those safeguards. Cloudflare isolate distribution/restarts mean they are not a durable global quota; the owner’s Massive plan remains binding.

Characters/NAB uses the narrower reviewed daily adapter, the shared per-minute envelope, and its D1 daily allowance. It is not a bypass around the generic adapter's validation or pacing model.

## Worker secret setup

Get a key from the [Massive dashboard](https://massive.com/dashboard/keys) ([signup](https://massive.com/dashboard/signup) if needed). Choose the intended Worker environment first, then enter it through Wrangler's interactive prompt or Cloudflare's Worker Secrets UI. Do not paste it into source, a browser console, a URL, a ticket, or chat.

```bash
# Production Worker
npx wrangler secret put MASSIVE_API_KEY

# Intentional staging Worker only
npx wrangler secret put MASSIVE_API_KEY --config wrangler.staging.jsonc
```

For `wrangler dev`, an operator may create the ignored `.dev.vars` file with `MASSIVE_API_KEY`. Never put that secret in `wrangler.jsonc`, `wrangler.staging.jsonc`, a browser bundle, or a committed `.env` file. No secret is needed for automated tests.

## Tests and verification

```bash
npm run test:massive
npm run test:characters
npm run test:nab
```

`tests/massive-api-test.mjs` covers the retained generic Worker adapter with stubbed upstream responses: fixed paths, bearer-header handling, validation, cache/pacing behavior, secret-absent fail-closed handling, error mapping, and no credential leakage. `tests/massive-ui-test.mjs` verifies retirement of the browser window while ensuring the Worker surfaces remain present. `tests/characters-massive-test.mjs` covers the active reviewed Characters Massive adapter, including futures-session normalization. These suites use fixtures and make no live Massive request.

## Official references

- [Massive REST quickstart](https://massive.com/docs/rest/quickstart)
- [Massive REST stocks overview](https://massive.com/docs/rest/stocks/overview)
- [Massive commodity coverage](https://massive.com/knowledge-base/article/does-massive-support-commodities-data)
- [Massive futures contracts and active-date filters](https://massive.com/docs/rest/futures/contracts)
- [Massive REST futures aggregates](https://massive.com/docs/rest/futures/aggregates)
- [Massive dashboard API keys](https://massive.com/dashboard/keys)
