# Characters: triple-provider market beat

**Status:** read-only market-data display. Characters turns available observations into stage motion; it does not authorize, recommend, trade, or make decisions. This document describes the application and Worker routing, not a HarshalOS invariant.

The primary surfaces are `js/characters-disc-catalog.js` (reviewed Disc metadata), `js/characters-cast.js` (runtime cast/layout), `js/apps-characters.js` (controls and local rotation), `js/good-intelligence-market-context.js` (normalization/evaluation), `js/characters-beat.js` (motion), and `worker/characters-beat.mjs` (validated routing).

## Reviewed Discs

| Disc | Catalog | Daily provider | Notes |
| :--- | :--- | :--- | :--- |
| **Disc1 — The 52 Cards** | Existing reviewed 52-stock deck | Massive automatic `1d` baseline | Orb 2 adds Tickerbot `15m` residuals and `1h` refreshes; its explicit first-deck calibration is one roster at three scales. Alpha Vantage remains the separate `1mo` path. |
| **Disc2 — Fiat / FX** | 23 individually published non-USD BIS 2025 codes, quoted against USD | Massive automatic `1d` | The detailed BIS tables do not establish a top 52, so no ranks are invented. |
| **Disc3 — Crypto** | CoinGecko top 52 unique ticker symbols by positive trailing-24-hour USD `total_volume` | Massive automatic `1d` | Ranking is provisional and carries stablecoin/missing-market-cap/extreme-price audit flags. |
| **Disc4 — Commodities** | Reviewed WTI/Brent, natural-gas, metal, and agriculture futures contracts | Massive automatic `1d` | Contract metadata is reviewed and fixed; an unavailable/stale contract is shown unavailable, not silently rolled. |
| **Disc5 — Indices** | Reviewed U.S. benchmark and volatility index roster | Massive automatic `1d` | Reference series only; not tradable instruments or advice. |

Energy-company equities remain Disc1 stocks. Disc4's WTI, Brent, and natural gas carry their own commodity/energy metadata.

## Provider boundary

```text
Automatic interval 1d, any reviewed Disc
  → provider=massive
  → one reviewed instrument per Worker request, paced up to five requests per minute in the browser loop
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

`provider`, `interval`, cadence, and beat width are validated by the Worker. Massive only accepts one reviewed `1d` instrument per Worker request and keeps `cadence=1` as the daily-bar contract; its separate shared envelope allows up to five requests per minute. Alpha Vantage only accepts one Disc1 `1mo` ticker at `cadence=60`; Tickerbot accepts Disc1 `15m`, `1h`, or `1d` under the bounded manual/Orb 2 planner. Orb 2 treats `15m` as closed-bar intraday residual data, not as a replacement for the Massive daily baseline. A provider failure, exhausted budget, or missing secret never falls through to another provider. Monthly bars never answer an hourly, 15-minute, or daily request.

The **Characters** app's automatic loop is browser-visible, not a server-side scheduler: hidden tabs spend no calls. It selects one least-recently-refreshed reviewed instrument for each Massive request and paces those requests at up to five per minute. Alpha's hourly selection uses the highest `(close - previous close) / previous close` across locally held **confirmed** bars; before any usable local pair exists it uses deterministic least-recently-refreshed selection. **Orb 2 no longer shares that browser loop**: its beats are produced by the Worker's Cron Trigger and read back through the server field (see below).

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
- **Opening mode / Auto-beat + `1d`:** opens on, and selects, Massive. The loop sends one reviewed instrument per Worker request at the five-request-per-minute pacing envelope; cadence/budget and Tickerbot lane controls remain fixed because Massive is not the manual planner.
- **Disc1 `1h`:** is always an on-demand Tickerbot mode: selecting it and leaving Auto-beat on never starts background polling; use **Beat now**. Pausing Disc1 automatic `1d` similarly selects manual Tickerbot `1d`. The 15-minute default, 15% reserve, and 12-symbol Worker ceiling retain the existing 52-card planning behavior; two-lane/hot-sweep controls apply here only.
- **`1mo`:** selects Alpha Vantage's Disc1-only best-performer spotlight and resumes its hourly auto loop. The cadence is fixed to one hour and no Tickerbot/Massive data substitutes for it.
- **Rehearsal:** is a separately labeled local deterministic generator. No live observation is silently replaced by synthetic data.

The stage is representation only—not investment advice, a signal, a recommendation, permission to act, an assurance result, or an input to Permit/Refuse decisions.

## Orb 2 integration boundary

Good Intelligence's **Orb 2** is the second, custom OCM view. It builds character nodes only from `CharactersCast.NPC_ROSTER`, obtains reviewed Disc berths through `CharactersCast`/`CharactersDiscCatalog`, and reads the server field at `GET /api/good-intelligence/v1/orb2/field` rather than calling the provider route itself. The server tick uses the same `CharactersBeat` planner, `GoodIntelligenceMarketContext` evaluator, reviewed Disc catalogs, and NPC/object/item motion directives; Massive remains the daily baseline across Discs 1–5, while Orb 2's reviewed 52-card stock field can be explicitly calibrated on Tickerbot `15m`, `1h`, and `1d`, with focused 15m recalculation capped at 12 symbols. Observed ticker positions are free-floating and derived from pure packet metrics — price change/Fibonacci displacement, VFI pressure, WaveTrend separation, volatility, and the packet timestamp — with only a stable symbol phase to break exact ties; the daily-plus-15m composer uses log-band positions, √26 volatility scaling, 72/28 weighting, and a capped 1.35× force multiplier. Missing or stale intraday packets decay to the daily baseline; held packets never receive invented market coordinates. Freshness is explicit: daily cards expire after 24 hours, 1h after 6 hours, and 15m after 6 hours, with stale labels before expiry. There is no browser pacing left to hold: the Worker's cron schedule owns the five-per-minute Massive envelope, the UTC-day guard, and the Tickerbot queue, so switching providers, hiding the tab, or reloading the page costs no provider call and never replays the firing order. D1-ledger failures still fail closed and are not fixed by waiting. The OCM paths, movement, and particles are local visualization only: they cannot create an identity, send OCM traffic, resolve legitimacy, transfer authority, or commit a transaction.

When the attributed 52-asset ticker roster validates, Orb 2's demo locks to Stocks/1d and renders the server field's sweep: the Worker stores six Massive daily FX beats in ICE component order, the page sets the fixed-center DXY reference only after all six confirmed closes share a bar timestamp, and the 52 one-symbol Massive ticker beats appear in sourced sector groups, descending by the dated market-cap snapshot within each sector. Progress is derived from what the server already stored, so the sequence resumes where the field is — it never restarts from the top because a tab was hidden or reloaded. ICE's current Rule 15.01 component weights are used with the catalog's USD-per-foreign-currency quote orientation; this is a daily component-derived reference, not ICE's licensed real-time index. The Worker checks its Massive secret and daily D1 ledger before any upstream request, so a missing binding fails closed before the first FX observation. A separate read-only deploy endpoint remains available for operators, but Orb 2 does not call it from the browser; the existing first beat performs the readiness check inline without an additional browser fetch. Every provider observation goes through the same-origin Worker; one unavailable, stale, unconfirmed, synthetic, or unaligned input holds the current step, with no provider substitution. The DXY value remains a benchmark at Center Origin and is not a moving coordinate origin.

Orb 2 stores compact validated observation/motion snapshots through `/api/good-intelligence/v1/orb2/beats` in the `orb2_saved_beats` D1 table (migration `0008_orb2_saved_beats.sql`). It uses a random opaque browser-session id, retains at most 120 beats for 90 days, and does not persist provider secrets or full bar histories. This history route is separate from provider calls and does not weaken the provider D1 allowance guards.

## Routes and migrations

| Surface | Contract |
| :--- | :--- |
| `GET /api/characters/v1/beat` | `?disc=stocks\|fx\|crypto\|commodities\|indices&provider=massive\|tickerbot\|alpha&symbols=A,B&interval=1h\|1d\|1mo&cadence=...`; Massive is one `1d` symbol per Worker request at the daily-bar contract `cadence=1`, with a separate five-request-per-minute envelope; Alpha is one Disc1 `1mo` symbol at `60`, and only manual Tickerbot accepts a bounded multi-symbol beat. Orb 2's browser does not call this route at all: the Worker's field tick performs the same secret and read-only D1 readiness gate inline before its first Massive upstream request. |
| `GET /api/characters/v1/deploy` | Read-only operational check for Worker reachability, Massive-secret presence, and per-UTC-day D1 readability. Sends no market request, claims no quota slot, and returns no secret. Orb 2 does not call this endpoint from its browser; the server field tick applies the same readiness gate inline. |
| `GET /api/characters/v1/discs?disc=crypto` | Read-only CoinGecko ranking snapshot/audit metadata; no provider secret or bar data. |
| `GET /api/massive/v1/*` | Retained bounded same-origin Massive Worker adapter; the standalone desktop window is retired. Characters uses the narrower reviewed daily adapter, not an arbitrary browser ticker path; see [`docs/integrations/MASSIVE-REST.md`](../integrations/MASSIVE-REST.md). |
| D1 migrations | `0005_tickerbot_call_ledger.sql`, `0006_alpha_vantage_daily_call_ledger.sql`, `0007_massive_daily_call_ledger.sql`, `0008_orb2_saved_beats.sql`, and `0009_orb2_server_field.sql`. Apply all relevant migrations before enabling live beats, the Orb 2 server field, or the anonymous Orb 2 archive. |
| `GET /api/good-intelligence/v1/orb2/field` | The stored server field: observations, per-type availability and counts, the DXY reference, the Massive/Tickerbot allowance and queue status, and the warm-burst counters. `disc`, `interval`, `symbols` (≤240), and `types` filter it. Sends no provider request. |
| `POST /api/good-intelligence/v1/orb2/field` | Same-origin `gi-orb2-field-request-v1`: `action:"tick"` runs one scheduled tick now (20-second in-isolate cooldown), `action:"priority"` queues up to 12 reviewed stocks for the Tickerbot lane (including explicit `15m`), and `action:"warm"` queues selected first-deck scales, defaulting to the ~156-call `15m + 1h + 1d` calibration. No browser provider call is made in any case. |

## Validation

Run `npm run test:characters` for the routing, ledgers, adapters, catalog, and UI. Run `npm run test:app` for the Orb 2 render-only field, the beat-type dial, the DXY reference, and the static-roster checks; the new `tests/orb2-field-scheduler-test.mjs` covers the cron tick and `tests/orb2-scenarios-test.mjs` covers the scenario choreography. Run `npm run test:massive` for the retained Massive Worker adapter and the retirement guard for the former desktop window. `npm test` runs the full repository suite; `npm run check:deploy` runs the Worker dry-run after asset preparation.

Tests verify provider/interval isolation, allowlist enforcement, cache separation, ledger atomicity, daily rollover, Massive bearer-header handling, no secret/upstream-body leakage, and honest unavailable/rate-limited responses.
