# Characters: multi-Disc market beat

**Status:** read-only market-data display. Characters turns market observations into stage motion; it does not authorize, recommend, trade, or make decisions. This document describes the current app and Worker implementation, not a new canonical HarshalOS invariant.

The main surfaces are `js/characters-disc-catalog.js` (shared Disc metadata), `js/characters-cast.js` (runtime cast/layout), `js/apps-characters.js` (Disc, interval, cadence, focus and source controls), `js/good-intelligence-market-context.js` (normalization/evaluation), `js/characters-beat.js` (budget/rotation/motion), and `worker/characters-beat.mjs` (validated Worker data route).

## 1. Discs and their current catalogs

| Disc | Catalog | Ranking / provenance | Available live interval |
| :--- | :--- | :--- | :--- |
| **Disc1 — The 52 Cards** | The existing 52-stock Tickerbot watchlist; unchanged | Reviewed application watchlist, imported from `worker/good-intelligence-tickerbot.mjs` | Tickerbot `1h` and `1d`; Alpha Vantage only when explicitly switched to `1mo` |
| **Disc2 — Fiat / FX** | 23 individually named non-USD currencies, each quoted against USD | BIS 2025 Triennial Survey detailed tables | Alpha Vantage `1mo` |
| **Disc3 — Crypto** | Live top 52 **unique ticker symbols** by CoinGecko trailing 24-hour USD `total_volume` | CoinGecko `/api/v3/coins/markets`, `order=volume_desc`; snapshot includes provider time and audit flags | Alpha Vantage `1mo` |
| **Disc4 — Commodities** | Crude oil (WTI, Brent), natural gas, industrial metals, and agricultural series | Alpha Vantage monthly commodity price series; scalar values are kept value-only | Alpha Vantage `1mo` |

### Catalog qualifications

- **Disc1 remains the existing 52 stock tickers.** Energy-company equities stay in Disc1. Crude oil is a Disc4 commodity and carries the `Energy` tag; natural gas also carries `Energy`.
- **The BIS publication does not establish a top-52 non-USD currency list.** Its inspected 2025 detailed tables publish 23 non-USD codes individually and aggregate the rest as `OTH`. Disc2 therefore shows those 23 named currencies and states the limitation; it does not pad or invent ranks 24–52. A complete top-52 catalog needs another reviewed, compatible source.
- **Disc3 is a provisional volume ranking, not a vetted investment catalog.** It selects unique ticker symbols among the first 100 CoinGecko markets ordered by positive 24-hour USD volume. Stablecoins remain eligible and are flagged for review. The snapshot carries rank, volume, current price and market capitalization when supplied; missing market caps and extreme nominal prices are surfaced as audit hints. These hints do not silently filter the ranking. A volume rank is not a quality, legitimacy, liquidity-depth, or safety screen. Duplicate tickers are skipped because the downstream Alpha Vantage symbol interface cannot disambiguate them reliably.
- The crypto list is fetched by the Worker and cached in memory for 15 minutes. The browser fetches `GET /api/characters/v1/discs?disc=crypto`; a ranking failure is shown instead of being replaced by a synthetic or stale catalog.

## 2. Provider routing and interval boundaries

```text
Disc1 + interval 1h/1d
    → Tickerbot only
    → shared Tickerbot UTC-month D1 claim (10,000 max)

Any supported Disc + explicit interval 1mo
    → Alpha Vantage monthly adapter only
    → separate Characters UTC-day D1 claim (25 max across all 1mo assets)
    → closed monthly observations → gi-market-context-v1
```

There is **no Alpha Vantage daily fallback**. A failed, exhausted, or unconfigured Tickerbot request does not become an Alpha Vantage request. A monthly Alpha Vantage packet has `timeframe: "1mo"` and is keyed/cached separately; it cannot answer a requested `1h` or `1d` beat. Tickerbot remains unchanged for Disc1 `1h`/`1d` reads.

Alpha Vantage monthly endpoints are selected by reviewed asset metadata: stock `TIME_SERIES_MONTHLY`, FX `FX_MONTHLY`, digital currency `DIGITAL_CURRENCY_MONTHLY`, and monthly commodity series such as `WTI` and `BRENT`. The adapter withholds the current incomplete month and returns only completed monthly observations.

### Independent Worker caps

- Tickerbot keeps the existing shared `tickerbot_call_ledger`: one aggregate UTC-month counter used by Characters and Good Intelligence Market Charts, hard-stopped at 10,000 attempts.
- Alpha Vantage uses the separate `alpha_vantage_daily_call_ledger`: despite the legacy table/module name, this is a **UTC-day request quota**, not a daily-bar mode. It counts all Characters Alpha Vantage `1mo` requests across stocks, FX, crypto, and commodities. The Worker atomically claims one slot immediately before each external request and fails closed if D1 or migration 0006 is unavailable. Failures and timeouts count conservatively. The hard limit is 25 requests per UTC day, independent of interval and separate from Tickerbot's monthly ledger.
- Each beat is capped at 12 symbols. In live `1mo` mode the app schedules at most one automatic beat per 24 hours; it selects up to 12 due instruments, so a 52-instrument Disc takes about five daily beats for a full rotation. Manual beats remain subject to the shared 25-per-day Alpha Vantage cap.
- Successful observations are cached in the Worker by Disc, symbol and interval for one beat. Failed reads are not cached. The D1 tables store only aggregate counts, configured limits, and update times—not keys, symbols, or request histories. Direct provider calls outside this Worker are not included; provider account dashboards remain authoritative.

### Disc1 stock refresh plan

Tickerbot's existing monthly planner remains stock-focused. The app defaults to a 15-minute cadence. With a 10,000-call planning budget and 15% reserve, it requests 2 due symbols per beat and estimates a full 52-stock sweep every 6.5 elapsed hours (5,844 planned calls/month if continuously open), which preserves the goal of at least two full-deck refreshes daily where provider availability, session hours, and tab visibility permit. The 12-symbol Worker cap binds at slower cadences. Two-lane/hot-sweep planning remains available for Tickerbot stock modes and is disabled for `1mo`.

Hidden tabs do not spend calls. There is no server-side scheduler. Manual refreshes, retries, failures, and provider limits can make realized cadence differ from the plan.

## 3. Observation shapes and indicators

Every provider packet is normalized into `gi-market-context-v1` without manufacturing missing fields:

- **OHLCV:** when the provider supplies open, high, low, close, and volume.
- **OHLC:** FX or other bars with the complete price tuple but no volume. `volume` remains absent.
- **Value-only / close-only:** commodity scalar observations (or a supplied close-only series). These are represented as dated `close` values with `dataShape: "value"`; no open, high, low, or volume is fabricated. The commodity's quote unit, such as `USD/barrel` or `USD/MMBtu`, remains metadata.

Rows with only part of an OHLC tuple are rejected. Observed fields determine the reported shape even if upstream metadata overstates it. The evaluator still supports price-based bands and WaveTrend on close-only series. VFI is unavailable unless every bar has complete OHLC and volume. VWMA falls back to SMA when volume is absent. Relative volume, crowd/volume display, and item flow are marked unavailable when the supplied volume field is absent; charts retain null volume rather than drawing zeros. Scalar commodity observations therefore stay separate from OHLC bars.

The Characters motion engine maps available price context to NPC gait, Object sway, and stage formations. Items flow only when the motion engine has real volume observations; absent volume never creates a measured value. No bars means a frozen berth. Rehearsal data is a separate, watermarked local generator and is never mixed with live data.

## 4. App behavior

- **Disc selector:** rebuilds the cast, sector layout, focus menu, and local rotation ledger for the selected catalog. The FX note makes the BIS 23-code limitation explicit. The crypto note shows CoinGecko snapshot time, ranking metric, and audit counts; focus details expose rank, supplied volume/price/market-cap fields, and per-instrument audit flags.
- **Bar size:** stocks can select Tickerbot `1h`, Tickerbot `1d`, or explicit Alpha Vantage `1mo`. FX, crypto, and commodities expose only `1mo`.
- **Cadence/budget:** applies to Tickerbot stock planning. It is disabled in `1mo`; the monthly-mode panel instead shows the 12-symbol beat ceiling, the 25-request UTC-day cap, and an approximate Disc rotation time.
- **Data source:** live provider data or synthetic rehearsal. No live bar is silently replaced by synthetic data; if the Worker is unconfigured, the app labels and switches to rehearsal.
- **Local state:** browser ledgers are separated by Disc and interval (with the existing Disc1/`1h` key retained for compatibility). They record activity/rotation only and are not provider billing authority.

The stage is Stage 2 representation only. It is not investment advice, a trade signal, a recommendation, permission to act, or an input to assurance scoring or Permit/Refuse decisions.

## 5. Routes, storage, and secrets

| Surface | Contract |
| :--- | :--- |
| `GET /api/characters/v1/beat` | `?disc=stocks\|fx\|crypto\|commodities&symbols=A,B&interval=1h\|1d\|1mo&cadence=...`; lanes are display hints only. |
| `GET /api/characters/v1/discs?disc=crypto` | Read-only CoinGecko ranking snapshot and audit metadata; no Alpha Vantage key or market bar data. |
| Worker validation | Disc membership, interval, and 12-symbol ceiling are enforced server-side; FX/commodities use the shared reviewed catalog, crypto is checked against the current ranking list, and stocks use the existing Tickerbot watchlist. |
| Worker secrets | `TICKERBOT_API_KEY` for stock `1h`/`1d`; `ALPHA_VANTAGE_API_KEY` only for explicit `1mo`. Neither is sent to browser code. |
| D1 migrations | `0005_tickerbot_call_ledger.sql` and `0006_alpha_vantage_daily_call_ledger.sql`; apply both to the selected remote D1 before enabling live provider calls. |

Alpha Vantage requires its API key in the query string. It must be configured only as a Worker secret, and production Wrangler observability must keep `redact_query_string: true` enabled before any live request. Keep the site behind the owner's Cloudflare Access policy. Do not put a provider key in source, `wrangler.jsonc`, local storage, URLs constructed in browser code, or response bodies.

## 6. Validation

Run `npm run test:characters` for the market-beat engine, UI, Tickerbot route/ledger, Disc catalog/ranking feed, Alpha Vantage monthly adapter, and request cap. Run `node --test tests/good-intelligence-market-context-test.mjs` for OHLCV/OHLC/value-only normalization and indicator availability. `npm test` runs the full repository suite. `npm run check:deploy` performs the Worker dry-run after asset preparation.

The tests verify that `1mo` never calls Tickerbot, `1h`/`1d` never call Alpha Vantage, the two D1 counters stay independent, the 25th request is admitted while the 26th is refused, missing ledgers fail closed, current partial months are withheld, and no API key or upstream response body leaks into browser-facing responses.
