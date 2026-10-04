# Characters: triple-provider market beat

**Status:** read-only market-data display. Characters turns available observations into stage motion; it does not authorize, recommend, trade, or make decisions. This document describes the application and Worker routing, not a HarshalOS invariant.

The primary surfaces are `js/characters-disc-catalog.js` (reviewed Disc metadata), `js/characters-cast.js` (runtime cast/layout), `js/apps-characters.js` (controls and local rotation), `js/good-intelligence-market-context.js` (normalization/evaluation), `js/characters-beat.js` (motion), and `worker/characters-beat.mjs` (validated routing).

## Reviewed Discs

| Disc | Catalog | Daily provider | Notes |
| :--- | :--- | :--- | :--- |
| **Disc1 — The 52 Cards** | Existing reviewed 52-stock deck | Massive automatic `1d` | Tickerbot stays available on demand for `1h`/`1d`; Alpha Vantage is the separate `1mo` path. |
| **Disc2 — Fiat / FX** | 23 individually published non-USD BIS 2025 codes, quoted against USD | Massive automatic `1d` | The detailed BIS tables do not establish a top 52, so no ranks are invented. |
| **Disc3 — Crypto** | CoinGecko top 52 unique ticker symbols by positive trailing-24-hour USD `total_volume` | Massive automatic `1d` | Ranking is provisional and carries stablecoin/missing-market-cap/extreme-price audit flags. |
| **Disc4 — Commodities** | Reviewed WTI/Brent, natural-gas, metal, and agriculture futures contracts | Massive automatic `1d` | Contract metadata is reviewed and fixed; an unavailable/stale contract is shown unavailable, not silently rolled. |
| **Disc5 — Indices** | Reviewed U.S. benchmark and volatility index roster | Massive automatic `1d` | Reference series only; not tradable instruments or advice. |

Energy-company equities remain Disc1 stocks. Disc4's WTI, Brent, and natural gas carry their own commodity/energy metadata.

## Provider boundary

```text
Automatic interval 1d, any reviewed Disc
  → provider=massive
  → one reviewed instrument per minute in the browser loop
  → shared Massive in-memory per-minute envelope
  → separate Characters D1 UTC-day guard (migration 0007)
  → successful daily packet held until next UTC midnight

On-demand Disc1 interval 1h or 1d
  → provider=tickerbot
  → reviewed stock deck only
  → shared Tickerbot D1 UTC-month ledger (migration 0005)

Disc1 explicit interval 1mo
  → provider=alpha
  → one local best-performing ticker per hour
  → separate Alpha Vantage D1 UTC-day allowance (migration 0006)
```

`provider`, `interval`, cadence, and beat width are validated by the Worker. Massive only accepts one reviewed `1d` instrument at `cadence=1`; Alpha Vantage only accepts one Disc1 `1mo` ticker at `cadence=60`; Tickerbot only accepts Disc1 `1h` or `1d` under its bounded manual planner. A provider failure, exhausted budget, or missing secret never falls through to another provider. Monthly bars never answer an hourly or daily request.

The app's automatic loop is browser-visible, not a server-side scheduler: hidden tabs spend no calls. It selects a least-recently-refreshed reviewed instrument for Massive each minute. Alpha's hourly selection uses the highest `(close - previous close) / previous close` across locally held **confirmed** bars; before any usable local pair exists it uses deterministic least-recently-refreshed selection.

## Quotas, caching, and secrets

- **Massive:** `MASSIVE_API_KEY` is a Worker secret sent only as `Authorization: Bearer`. `worker/massive.mjs` supplies best-effort per-isolate deployment/client sliding windows (default 5 upstream requests/minute). Characters shares that envelope and additionally claims the `massive_daily_call_ledger` before an outbound daily request. The default conservative Characters daily guard is 300 Worker-routed attempts, reset at UTC midnight. Cache entries are keyed by Disc, provider, symbol, and interval; successful Massive daily packets expire at the next UTC midnight.
- **Tickerbot:** `TICKERBOT_API_KEY` is a Worker secret. Its `tickerbot_call_ledger` is shared with Good Intelligence and atomically caps Worker-routed attempts at 10,000 per UTC month.
- **Alpha Vantage:** `ALPHA_VANTAGE_API_KEY` is a Worker secret. It remains query-string-only upstream, so production observability must keep query-string redaction enabled. The `alpha_vantage_daily_call_ledger` atomically caps Characters at 25 attempts per UTC day; the hourly app loop schedules 24 maximum. A successful monthly spotlight packet is held for one hour, never used to answer a `1h` or `1d` request.
- A D1 ledger failure fails closed before provider work. Claimed attempts that subsequently fail or time out count conservatively. Provider dashboards remain the billing/entitlement authority, and direct calls outside this Worker are not represented by these ledgers.

Never put any provider secret in browser code, static configuration, local storage, a committed `.env`, browser URL, logs, or response body.

## Observation shapes

Provider packets are normalized to `gi-market-context-v1` without manufacturing fields:

- **OHLCV** stays OHLCV when a provider supplied all four price fields and volume.
- **OHLC** stays OHLC when a provider supplied complete prices but no volume.
- **Value/close-only** observations remain value-only. No open, high, low, or volume is fabricated.

Incomplete OHLC tuples are rejected. VFI, crowd/relative-volume display, and item flow require real complete OHLCV. Price-based motion can still use valid OHLC or close-only observations. A current forming daily bar is marked unconfirmed, so it is held rather than presented as a completed move.

## UI behavior

- **Disc selector:** rebuilds the cast, focus menu, local ledger, and Disc-specific catalog. Crypto is fetched from `GET /api/characters/v1/discs?disc=crypto`; a ranking failure is reported rather than replaced with stale/synthetic constituents.
- **Opening mode / Auto-beat + `1d`:** opens on, and selects, Massive. Cadence/budget and Tickerbot lane controls are fixed because the loop advances one reviewed instrument per minute.
- **Disc1 `1h`:** is always an on-demand Tickerbot mode: selecting it and leaving Auto-beat on never starts background polling; use **Beat now**. Pausing Disc1 automatic `1d` similarly selects manual Tickerbot `1d`. The 15-minute default, 15% reserve, and 12-symbol Worker ceiling retain the existing 52-card planning behavior; two-lane/hot-sweep controls apply here only.
- **`1mo`:** selects Alpha Vantage's Disc1-only best-performer spotlight and resumes its hourly auto loop. The cadence is fixed to one hour and no Tickerbot/Massive data substitutes for it.
- **Rehearsal:** is a separately labeled local deterministic generator. No live observation is silently replaced by synthetic data.

The stage is representation only—not investment advice, a signal, a recommendation, permission to act, an assurance result, or an input to Permit/Refuse decisions.

## Orb 2 reference boundary

Good Intelligence's **Orb 2** is a separate local teaching visualization, not another Characters data consumer. It builds peripheral display nodes only from `CharactersCast.NPC_ROSTER` and shows the provider/cadence rules above as reviewed context. It does not call `/api/characters/v1/beat`, `/api/massive/v1/*`, Tickerbot, Alpha Vantage, or any OCM transport; it receives no live packet, price, rank, or recommendation. Its disc-to-sphere routes are visual traces only and cannot resolve legitimacy, transfer authority, create an identity, or commit a transaction.

## Routes and migrations

| Surface | Contract |
| :--- | :--- |
| `GET /api/characters/v1/beat` | `?disc=stocks\|fx\|crypto\|commodities\|indices&provider=massive\|tickerbot\|alpha&symbols=A,B&interval=1h\|1d\|1mo&cadence=...`; Massive is one `1d` symbol at `1`, Alpha is one Disc1 `1mo` symbol at `60`, and only manual Tickerbot accepts a bounded multi-symbol beat. |
| `GET /api/characters/v1/discs?disc=crypto` | Read-only CoinGecko ranking snapshot/audit metadata; no provider secret or bar data. |
| `GET /api/massive/v1/*` | Retained bounded same-origin Massive Worker adapter; the standalone desktop window is retired. Characters uses the narrower reviewed daily adapter, not an arbitrary browser ticker path; see [`docs/integrations/MASSIVE-REST.md`](../integrations/MASSIVE-REST.md). |
| D1 migrations | `0005_tickerbot_call_ledger.sql`, `0006_alpha_vantage_daily_call_ledger.sql`, `0007_massive_daily_call_ledger.sql`, and `0008_orb2_saved_beats.sql`. Apply all relevant migrations before enabling live beats or the anonymous Orb 2 archive. |

## Validation

Run `npm run test:characters` for the routing, ledgers, adapters, catalog, and UI. Run `npm run test:massive` for the retained Massive Worker adapter and the retirement guard for the former desktop window. `npm test` runs the full repository suite; `npm run check:deploy` runs the Worker dry-run after asset preparation.

Tests verify provider/interval isolation, allowlist enforcement, cache separation, ledger atomicity, daily rollover, Massive bearer-header handling, no secret/upstream-body leakage, and honest unavailable/rate-limited responses.
