# Massive REST market data

**Status:** read-only desktop market-data viewer backed by the [Massive REST API](https://massive.com/docs/rest/quickstart). Validation uses stubbed upstream responses; this integration has not been live-tested or deployed from this change.

## Scope and data flow

The **Massive Markets** desktop app displays market data across four asset classes — U.S. stocks, crypto pairs, forex pairs, and indices — through six bounded Massive REST endpoints. It makes no request when opened; a request is sent only after the operator loads a snapshot, draws bars, fetches dividends, or converts a currency.

```text
Browser app (js/apps-massive.js)
  GET /api/massive/v1/{bars|previous-day|ticker-details|last-trade|dividends|conversion}
        ↓ same-origin request
Cloudflare Worker: worker/massive.mjs
  validate asset/ticker/window → cache / pace → fixed Massive request
        ↓ Authorization: Bearer header only
https://api.massive.com
```

The Worker is a narrow proxy, not a general Massive relay. It accepts only the six documented sub-routes; validates the asset class, ticker shape per asset class (`AAPL`, `X:BTCUSD`, `C:EURUSD`, `I:SPX`), bar multiplier (1–100), timespan (`minute`–`year`), `YYYY-MM-DD` windows with per-timespan range caps, bar/dividend limits, and three-letter currency codes; refuses redirects; times out upstream work; and passes Massive's documented JSON response through unchanged inside a `{ success, cached, data }` envelope. The browser reads Massive's own field names (`status`, `results`, `request_id`, `o/h/l/c/v/vw/t`, …). Successful responses are cached in Worker memory for up to 60 seconds.

Typed input can never reach Massive outside the validated shapes: the Worker reconstructs each upstream path from parsed, regex-checked values, so traversal attempts such as `AAPL/../v3/reference/tickers` are refused locally (400) before any provider request.

### Pacing

The Massive key belongs to the deployment owner, so every visitor spends the same quota. The Worker enforces two best-effort sliding windows **per Worker isolate**: one deployment-wide (default 5 upstream requests per minute, matching Massive's entry plans) and one per client IP (default 5 per minute). Both are configurable via `MASSIVE_DEPLOYMENT_LIMIT_PER_MINUTE` and `MASSIVE_CLIENT_LIMIT_PER_MINUTE` environment values. Cloudflare isolate distribution/restarts mean this is a safeguard for the shared key, not a durable or global quota; Massive's own plan limits remain the binding boundary. Budget-exhausted requests answer 429 with a `retryAfterSeconds` hint and never reach the provider.

### Data recency and honesty

Recency and history depth follow the owner's Massive plan (end-of-day, 15-minute delayed, or real-time). The app says so in its boundary strip: the data is display-only, may be delayed, is not investment advice, and no order, trade, or transaction is possible from the window. Missing fields stay missing; empty bar windows are shown as empty (Massive produces no bar when no qualifying trades occurred). The Worker's refusal codes (`not-configured`, `rate-limited`, `credentials-rejected`, `upstream-error`, `timeout`, `unreachable`, …) are surfaced verbatim in the app's status line; Massive's own error message is included only for `upstream-error`, capped at 200 characters.

The API key is read from the Worker environment as `MASSIVE_API_KEY` and sent only in the `Authorization: Bearer` header — never as a query parameter, browser setting, static variable, log field, or returned field. If the secret is absent, the route fails closed with a configuration response and makes no provider request.

## Worker secret setup

Get a key from the [Massive dashboard](https://massive.com/dashboard/keys) ([signup](https://massive.com/dashboard/signup) if needed). Choose the intended Worker environment first, then enter the key through Wrangler's interactive prompt (or the Cloudflare dashboard's Worker Secrets UI). Do not paste it into HarshalOS, a source file, a browser console, a URL, a ticket, or chat.

Production Worker:

```bash
npx wrangler secret put MASSIVE_API_KEY
```

A separately configured staging Worker, only if you intentionally enable it:

```bash
npx wrangler secret put MASSIVE_API_KEY --config wrangler.staging.jsonc
```

For local `wrangler dev`, a developer may create the ignored `.dev.vars` file manually with a `MASSIVE_API_KEY` entry. `.dev.vars` is gitignored; still verify it is not staged or shared. Never put the secret in `wrangler.jsonc`, `wrangler.staging.jsonc`, the browser bundle, or a committed `.env` file. No secret is required to run the automated tests.

## Endpoints wired

| App action | Same-origin route | Massive endpoint |
| --- | --- | --- |
| Snapshot bars | `GET /api/massive/v1/previous-day` | [`GET /v2/aggs/ticker/{ticker}/prev`](https://massive.com/docs/rest/stocks/aggregates/previous-day-bar) |
| Custom bars | `GET /api/massive/v1/bars` | [`GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}`](https://massive.com/docs/rest/stocks/aggregates/custom-bars) |
| Ticker details | `GET /api/massive/v1/ticker-details` | [`GET /v3/reference/tickers/{ticker}`](https://massive.com/docs/rest/stocks/tickers/ticker-overview) |
| Last trade (stocks) | `GET /api/massive/v1/last-trade` | [`GET /v2/last/trade/{stocksTicker}`](https://massive.com/docs/rest/stocks/trades-quotes/last-trade) |
| Dividends (stocks) | `GET /api/massive/v1/dividends` | [`GET /stocks/v1/dividends`](https://massive.com/docs/rest/stocks/corporate-actions/dividends) |
| Currency conversion | `GET /api/massive/v1/conversion` | [`GET /v1/conversion/{from}/{to}`](https://massive.com/docs/rest/forex/currency-conversion) |

Aggregate windows use the same `/v2/aggs/...` shapes across asset classes with Massive's ticker prefixes (`X:` crypto, `C:` forex, `I:` indices). Dividends are sorted newest ex-dividend date first and capped at 100 rows per request. Conversion always sends explicit `amount` and `precision` (defaults 1 and 2).

## Tests and verification

Run the focused stub-only suite:

```bash
npm run test:massive
```

`tests/massive-api-test.mjs` checks the Worker adapter: documented upstream paths and bearer-header auth (never a query-string key), the full validation matrix, secret-absent fail-closed behavior, both pacing windows and their rollover, Massive error mapping (401/403, 429, error bodies), unreadable/aborted/unreachable handling, scrubbed log breadcrumbs, and response caching — all with a stub fetcher. `tests/massive-ui-test.mjs` renders the app in happy-dom with stubbed same-origin responses and checks the read-only framing, provider-string escaping, honest configuration/pacing refusals, bars/dividends/conversion rendering, and that the app's asset/ticker/timespan constants have not drifted from the Worker's. Neither test makes a live Massive request or requires the API key.

## Official references

- [Massive REST quickstart](https://massive.com/docs/rest/quickstart)
- [Massive REST stocks overview](https://massive.com/docs/rest/stocks/overview)
- [Massive docs index for LLMs](https://massive.com/docs/llms.txt) (append `.md` to any docs URL for Markdown)
- [Massive dashboard API keys](https://massive.com/dashboard/keys)
