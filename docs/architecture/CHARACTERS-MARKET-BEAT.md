# Characters and NAB: provider-split market beats

**Status:** read-only market-data display. Characters motion and NAB composite values describe supplied observations; they do not authorize, recommend, trade, or make decisions. This document describes current provider boundaries and routing, not a HarshalOS-wide invariant.

## Reviewed Disc/provider matrix

| Disc | Reviewed universe | Characters selector / endpoint | NAB Discs |
| :--- | :--- | :--- | :--- |
| **Disc1 — Stocks** | Reviewed 52-stock deck | **Tickerbot**, `1h` or `1d` | **Tickerbot**, `1d` |
| **Disc2 — Fiat / FX** | 23 individually published non-USD BIS 2025 codes, quoted against USD | **Massive**, `1d` | **Massive**, `1d` |
| **Disc3 — Crypto** | Up to 52 unique Kraken Spot USD pairs, ranked by Kraken rolling-24-hour base volume × VWAP | **Kraken Spot**, `1d` | **Kraken Spot**, `1d` |
| **Disc4 — Commodities** | Ten reviewed futures product codes: WTI, Henry Hub gas, gold, silver, copper, platinum, palladium, wheat, corn, and soybeans | **Massive**, `1d` | **Massive**, `1d` |
| **Disc5 — Indices** | Reviewed U.S. benchmark and volatility index roster, including `RUT` | **Massive**, `1d` | **Massive**, `1d` |

This is an explicit provider/channel/interval contract, not a fallback preference. Each route validates the Disc, provider, interval, symbol allowlist, and provider identity before outbound work or storage. Unknown or mismatched combinations fail closed. No provider substitutes for another and no missing market field is fabricated.

Energy-company equities remain Disc1 stocks. Disc4 futures retain their commodity product, quote-unit, exact Massive ticker, product code, source date, and last-trade date as provenance. A futures price is not an energy-company share or a continuous/rolled series. Missing, unauthorized, or invalid current contracts remain held; yesterday's ticker is never reused.

## Provider-specific behavior

### Stocks — Tickerbot

Characters exposes Tickerbot stock bars at `1h` and `1d`; NAB uses the Tickerbot stock route at `1d`. The reviewed stock deck is the only accepted universe. Tickerbot is not a provider for FX, Crypto, Commodities, or Indices.

Orb 2 has a **separate internal Tickerbot `15m` warm/intraday lane** for bounded stock-field calibration and residual work. That internal lane does not add `15m` to the Characters selector or to the Characters/NAB route contract. Orb 2's other stock scales remain explicit provider-tagged Tickerbot observations; they do not authorize a different Characters interval.

### Crypto — Kraken Spot

The public `/api/characters/v1/discs?disc=crypto` ranking path uses Kraken Spot's unauthenticated `/0/public/Ticker` endpoint. It considers unique USD-quoted Spot pairs and ranks by Kraken's rolling-24-hour reported base volume `v[1] ×` VWAP `p[1]`. This is a **venue-specific rolling 24-hour** metric, not a cross-exchange ranking and not the former Massive previous-UTC-day grouped-aggregate metric.

The roster holds unless 52 eligible unique pairs have valid positive volume and VWAP. Stablecoin candidates remain eligible but are flagged. Kraken's ticker has no market-cap field; market cap remains missing. Pair bars use the public `/0/public/OHLC` endpoint with `interval=1440` and the exact pair from the validated roster. Kraken's `XBT` and `XDG` bases may display as `BTC` and `DOGE`, while exact pair/provider identity remains `XBT/USD` or `XDG/USD`. The current UTC-day bar is unconfirmed. No pair or quote-currency alias is inferred from arbitrary browser input.

**No Kraken account or API key is required** for these public market-data endpoints. The shared Worker ledger is an application guard, not a Kraken entitlement: one outbound public request per second and a conservative ceiling of 160 attempts per UTC day across Characters and Orb 2. See [`docs/integrations/CRYPTO-PROVIDER-EVALUATION.md`](../integrations/CRYPTO-PROVIDER-EVALUATION.md).

### FX, Commodities, and Indices — Massive

Massive supplies daily bars and the current-date active futures contract discovery for reviewed Commodities. The live `MASSIVE_API_KEY` is held as a Worker secret and sent only as a bearer header. The shared request envelope allows up to five upstream requests per minute; the Characters D1 ledger has a conservative ceiling of 300 attempts per UTC day. These are application guards, not vendor entitlements.

### Alpha Vantage / `1mo` — read-only legacy history

Alpha Vantage is **not an active Characters or NAB provider**. The `1mo` selector, Worker read route, and new save route are disabled. Old, explicitly tagged Alpha/`1mo` records may remain visible as read-only legacy history; restoring one must not issue a provider request or make it a calculation input. The retired Alpha D1 migration may remain in the database history, but it is not a current allowance or integration. Do not add the Alpha selector back as part of the provider split.

### FRED — possible future reference only

FRED is not the primary source or persisted market layer for the current orbs. Any later FRED addition must wait until this split is verified and must have an agreed, separate transient/reference design and a rights review. It must not be merged into current persisted provider-tagged orb data or calculations by implication.

## Request and persistence boundary

```text
Characters / NAB — Stocks
  → Tickerbot, reviewed stock symbols only
  → Characters interval: 1h or 1d; NAB interval: 1d
  → shared Tickerbot UTC-month ledger (migration 0005)

Characters / NAB — Crypto
  → Kraken Spot, exact USD pair from validated 52-pair ranking
  → daily OHLCV/OHLC bars at interval 1440 (1d)
  → shared Kraken one-request-per-second gate and 160/day application ceiling
  → ranking cached in D1; per-pair bars cached through next UTC midnight (migration 0012)

Characters / NAB — FX, Commodities, Indices
  → Massive, one reviewed symbol at a time, interval 1d
  → shared Massive per-minute envelope and Characters UTC-day D1 guard
  → active futures discovery only for today's validated contract
  → successful daily packets cached through UTC midnight (migrations 0007, 0011)

Orb 2 — server-managed field
  → provider remains channel-specific as above
  → Tickerbot 15m stock warm/intraday queue is internal to Orb 2 only
  → field read/save endpoints do not widen Characters or NAB's accepted routes

Alpha / 1mo legacy archive
  → no new provider read and no new save
  → old tagged records may be restored for viewing only
```

### Rate limits and cache behavior

- **Tickerbot:** `TICKERBOT_API_KEY` is a Worker secret. `tickerbot_call_ledger` is shared with Good Intelligence and atomically caps Worker-routed attempts at 10,000 per UTC month.
- **Kraken:** public requests need no key. `kraken_public_call_ledger` atomically enforces one outbound request per second and 160 attempts per UTC day across Characters and Orb 2. Ranking cache lifetime is 24 hours; successful per-pair daily bars cache to the next UTC midnight; failed attempts use a bounded retry hold.
- **Massive:** `MASSIVE_API_KEY` is a Worker secret. `worker/massive.mjs` and the Characters shared envelope pace upstream calls at up to five per minute. `massive_daily_call_ledger` guards daily bars, roster/contracts work at 300 attempts per UTC day. FX/Commodity/Index bars use provider/Disc/symbol/interval-qualified cache identities; daily packets expire at UTC midnight. Active commodity contracts are cached in `massive_futures_contract_cache` only until UTC midnight, with bounded retries and a shared endpoint circuit breaker.
- **Legacy Alpha:** migration `0006_alpha_vantage_daily_call_ledger.sql` may remain for installed database history. There are no new Alpha calls, so its former 25/day allowance is not active behavior.
- **All providers:** a ledger/cache failure fails closed before provider work. Claimed attempts that subsequently fail or time out count conservatively. Provider dashboards remain the billing/entitlement authority; direct calls outside this Worker are not represented by local ledgers.

Never put any provider secret in browser code, static configuration, local storage, a committed `.env`, a browser URL, logs, or a response body. Do not request Kraken credentials for its public Ticker/OHLC route.

## Observation shapes and UI behavior

Packets normalize to `gi-market-context-v1` without manufacturing fields:

- **OHLCV** remains OHLCV only when the provider supplied the price fields and volume.
- **OHLC** remains OHLC when prices are complete but volume is absent.
- **Value/close-only** observations remain value-only; no open, high, low, or volume is inferred.

Incomplete OHLC tuples are rejected. VFI and other volume-based measures require real complete OHLCV. Price-based motion may use valid OHLC or close-only observations. A current forming daily candle is marked unconfirmed and is not represented as a completed move.

The Characters UI rebuilds its cast, focus menu, local rotation, and provider controls when the Disc changes. Stocks expose `1h`/`1d` Tickerbot; Crypto exposes Kraken `1d`; FX, Commodities, and Indices expose Massive `1d`. Fixed-provider routes do not expose a provider selector. An unavailable beat remains held rather than switching provider or synthesizing data. Re-drawing the stage spends no provider calls. Local deterministic rehearsal, where enabled, is a separately labeled synthetic mode and never replaces a live observation silently.

The stage and NAB composite are representations only—not investment advice, a signal, recommendation, permission to act, assurance result, or an input to Permit/Refuse decisions.

## Orb 2 integration boundary

Good Intelligence's Orb 2 is a custom OCM view. It uses `CharactersCast.NPC_ROSTER`, reviewed Disc catalogs, provider-tagged field data from `GET /api/good-intelligence/v1/orb2/field`, and server-side scheduled work; the browser does not call providers directly. Orb 2 observes the same provider split for its market channels. Its **Tickerbot `15m` stock warm/intraday queue** is an internal Orb 2 capability, not a Characters UI selection or a NAB endpoint interval. Warm/priority actions are bounded to reviewed stock symbols and are subject to the shared Tickerbot ledger.

The server field stores validated observations and motion snapshots, not provider credentials or full raw bar histories. Orb 2 may show stale, held, unavailable, or unconfirmed state; missing packets do not get fabricated market coordinates. Its OCM paths, movement, and particles are local visualization only: they cannot create an identity, send OCM traffic, resolve legitimacy, transfer authority, or commit a transaction.

The server may also produce a DXY component-derived reference for display from aligned daily Massive FX inputs; it is a daily reference, not a licensed real-time ICE index. The DXY value remains a benchmark at Center Origin and is not a moving coordinate origin. This reference does not change the FX source or provider contract.

Saved beat snapshots are stored through the Orb 2 beats endpoint in `orb2_saved_beats` (migration `0008_orb2_saved_beats.sql`) after provider/channel/interval validation. Archived Alpha/`1mo` history is not a newly savable route. Saved-beat storage is separate from upstream provider calls and does not weaken ledger guards.

## Routes and migrations

| Surface | Active contract |
| :--- | :--- |
| `GET /api/characters/v1/beat` | `?disc=stocks\|fx\|crypto\|commodities\|indices&provider=tickerbot\|kraken\|massive&symbols=A,B&interval=1h\|1d&cadence=...`. Tickerbot is Stocks only (`1h`/`1d`); Kraken is Crypto only (`1d`); Massive is FX/Commodities/Indices only (`1d`). Alpha and `1mo`, unknown providers, mismatched channels, and mismatched intervals fail before outbound work. |
| `GET /api/characters/v1/discs?disc=crypto` | Kraken Spot rolling-24-hour ranking and audit metadata. The roster is cached in D1 and fails closed if stale, malformed, or undersized. |
| NAB Discs market-data request | The UI sends its explicitly selected provider and the fixed `1d` interval. The accepted Disc/provider matrix is Tickerbot Stocks, Kraken Crypto, and Massive FX/Commodities/Indices. The Worker rejects a selected-but-mismatched provider; the renderer filters exact provider/channel/interval and does not borrow stock height or substitute another packet. Alpha is not offered. |
| `GET /api/characters/v1/deploy` | Read-only operational readiness check. It sends no market request, claims no quota slot, and returns no secret. |
| `GET /api/massive/v1/*` | Retained bounded same-origin Massive Worker adapter. Characters/NAB use their narrower reviewed channel routes, not an arbitrary browser ticker path; the standalone desktop window is retired. See [`docs/integrations/MASSIVE-REST.md`](../integrations/MASSIVE-REST.md). |
| `GET /api/good-intelligence/v1/orb2/field` | Reads the current server-managed Orb 2 field and status; it does not make a provider request. |
| `POST /api/good-intelligence/v1/orb2/field` | Same-origin tick/priority/warm actions. Tickerbot `15m` is internal Orb 2 stock work only; it does not widen Characters or NAB routes. |
| D1 migrations | `0005_tickerbot_call_ledger.sql`, `0006_alpha_vantage_daily_call_ledger.sql` (legacy history), `0007_massive_daily_call_ledger.sql`, `0008_orb2_saved_beats.sql`, `0009_orb2_server_field.sql`, `0010_characters_crypto_ranking_cache.sql`, `0011_massive_futures_contract_cache.sql`, and `0012_kraken_public_crypto.sql`. Apply the relevant migrations before enabling live routes, server field, provider ledgers, or saved beats. |

## Validation

- `npm run test:characters` covers routing, provider matrices, ledgers, adapters, catalog, and Characters UI.
- `npm run test:nab` covers provider identity, daily requests, aggregation, renderer isolation, and fail-closed UI behavior.
- `npm run test:app` covers Orb 2 rendering, field scheduling, DXY reference, and saved-beat behavior.
- `npm run test:massive` covers the retained Massive Worker adapter.
- `npm test` runs the full repository suite; `npm run check:deploy` runs the Worker dry-run after asset preparation.

The provider suites verify interval isolation, allowlist and pair identity enforcement, provider-qualified cache separation, ledger atomicity, UTC rollover, secret handling, no upstream-body leakage, and honest unavailable/rate-limited responses.
