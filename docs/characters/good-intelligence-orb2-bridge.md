# Good Intelligence ↔ Orb 2 / Characters Beat Bridge

**Orb 2** is the second Orb Communicator Model surface: a custom 3D disc-to-sphere experience inside Good Intelligence. The Orb app and Characters remain the reference designs; this view combines their OCM pathways with the exact reviewed beat planner, provider routes, market-context evaluator, and motion directives used by Characters.

## Shared beat contract

- `CharactersDiscCatalog` supplies the reviewed Discs. Massive is the automatic daily provider across Discs 1–5, requesting one least-recently-refreshed `1d` instrument per minute.
- Tickerbot is the on-demand Disc1 provider for `1h`/`1d`, using the same monthly plan, rotation, reserve, featured/hot lane, and optional two-lane sweep as Characters.
- Alpha Vantage remains the separate Disc1 `1mo` best-performer spotlight, one instrument per hour, selected from locally observed confirmed bars.
- `/api/characters/v1/beat` stays the only market-beat route. Orb 2 does not call provider URLs directly, read browser secrets, or fall through to another service.
- `CharactersBeat` performs due-symbol selection, analyzes the returned `gi-market-context-v1` packet, and produces the same NPC/object/item motion directive. No packet means a frozen berth; absent OHLC or volume fields remain absent.
- The 3D canvas maps those directives to character-node movement, sector objects, volume-dependent particles, and visual paths to Center Origin. A path is a teaching visualization, not transmitted OCM traffic or authority.

## Visual color channels and fullscreen

- Orb cores and object rings keep the Characters beat-mood palette; node halos and provider-data paths identify Massive, Tickerbot, Alpha Vantage, or synthetic rehearsal. Cached/rehearsal, partial/unconfirmed, and held/unavailable responses use distinct dashed/dotted paths. Halo opacity fades with the age of the stored beat snapshot, not the age of the provider's latest bar.
- Five small satellite bits expose only supplied fields: price change, VFI versus its supplied signal, close versus the supplied Fibonacci-band basis, WaveTrend zone, and actual bar/data shape plus confirmation. Unavailable fields are slate and labeled unavailable—not zero. Inspector rows display the corresponding state and value.
- Local OCM trace colors (inward, center resolve, outward, lateral) are keyed separately from provider paths. A color key is available in the Orb 2 view. Market colors describe price/volume context only; they do not feed claim assurance, authorize activity, or recommend a trade.
- The titlebar's **whole-app fullscreen** control expands the Good Intelligence window via the browser Fullscreen API, with a fixed-window fallback when the API is blocked. Orb 2's separate **Model full screen** control expands only the Orb canvas view.

## Provider switching and D1 errors

Switching the derived service provider starts a visible 60-second warm-up. Neither Beat now nor Auto-beat sends a request during the countdown. This is a burst-prevention pause; it cannot repair a missing database binding or table.

The Characters Worker deliberately refuses provider work when a durable D1 allowance cannot be checked:

- Massive daily guard: `COMMUNITY_DB` and migration `0007_massive_daily_call_ledger.sql`.
- Alpha Vantage daily guard: `COMMUNITY_DB` and migration `0006_alpha_vantage_daily_call_ledger.sql`.
- Tickerbot monthly guard: `COMMUNITY_DB` and migration `0005_tickerbot_call_ledger.sql`.

The repository's production Wrangler config declares `COMMUNITY_DB` for `community_db`, but branch previews explicitly set `previews.d1_databases` to an empty list. A preview Worker therefore has no D1 binding by design and will refuse these due provider requests (and cannot persist Orb 2 history). For production, verify that the deployed Worker still has the binding and that migrations 0005–0008 were applied to that exact database; the checked-in config and migration files alone do not prove remote deployment state. Tickerbot can work while another provider's independent ledger table is missing. Waiting 60 seconds alone does not resolve this configuration/migration failure; no upstream request was sent for the refused berth.

## Server-side beat history

`worker/good-intelligence-orb2-beats.mjs` stores compact, validated market observations and the corresponding Characters motion directive in `orb2_saved_beats`. The browser keeps only a random opaque session UUID plus a best-effort local recovery copy. The server keeps at most 120 beats per browser session for 90 days. It stores no API keys, identity records, or full bar series. Synthetic rehearsal is not written as live server history.

Apply migration `0008_orb2_saved_beats.sql` to the same D1 database used by the Worker before enabling server persistence. If the history table is missing or D1 is unavailable, the page labels the condition and preserves the local recovery copy when browser storage is available. This persistence route never initiates a provider request.

## Validation

- `npm run test:characters` covers the provider contracts and beat/motion engine.
- `node --test tests/good-intelligence-orb2-test.mjs tests/good-intelligence-orb2-worker-test.mjs` covers the Orb 2 UI composition, warm-up, beat persistence, and storage boundary.
- `npm run check:deploy` validates the Worker bundle after asset preparation.
