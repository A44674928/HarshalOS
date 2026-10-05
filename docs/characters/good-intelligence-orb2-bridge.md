# Good Intelligence ↔ Orb 2 / Characters Beat Bridge

**Orb 2** is the second Orb Communicator Model surface: a custom 3D disc-to-sphere experience inside Good Intelligence. The Orb app and Characters remain the reference designs; this view combines their OCM pathways with the exact reviewed beat planner, provider routes, market-context evaluator, and motion directives used by Characters.

## Shared beat contract

- `CharactersDiscCatalog` supplies the reviewed Discs. Massive is the automatic daily provider across Discs 1–5, requesting one least-recently-refreshed `1d` instrument per minute.
- Tickerbot is the on-demand Disc1 provider for `1h`/`1d`, using the same monthly plan, rotation, reserve, featured/hot lane, and optional two-lane sweep as Characters.
- Alpha Vantage remains the separate Disc1 `1mo` best-performer spotlight, one instrument per hour, selected from locally observed confirmed bars.
- `/api/characters/v1/beat` stays the only market-beat route. Orb 2 does not call provider URLs directly, read browser secrets, or fall through to another service.
- `CharactersBeat` performs due-symbol selection, analyzes the returned `gi-market-context-v1` packet, and produces the same NPC/object/item motion directive. No packet means a frozen berth; absent OHLC or volume fields remain absent.
- The 3D canvas maps those directives to character-node movement, sector objects, volume-dependent particles, and visual paths to Center Origin. A path is a teaching visualization, not transmitted OCM traffic or authority.
- The volume-flow runner follows Characters' `item.lane` and `item.rate`: VFI above its supplied signal moves inward in green; VFI below moves outward in red. It runs only for confirmed OHLCV with volume, VFI/signal, direction, and positive relative-volume cadence available; equality, transitions, missing, or unconfirmed inputs are held.
- The displayed cadence is Characters' visual animation rate in cycles per second, not a measured volume-per-second value. It is shown for the selected node in the canvas HUD and inspector; reduced-motion and hidden-path states are labeled.

## Visual color channels and fullscreen

- Orb cores and object rings keep the Characters beat-mood palette; node halos and base communication paths identify Massive, Tickerbot, Alpha Vantage, or synthetic rehearsal. The green/red volume-flow runner overlays that provider-colored path without recoloring it. Cached/rehearsal, partial/unconfirmed, and held/unavailable responses use distinct dashed/dotted paths. Halo opacity fades with the age of the stored beat snapshot, not the age of the provider's latest bar.
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

**Live-only view.** Orb 2's browser view no longer offers a synthetic/demo data source. A failed, unconfigured, or refused live beat leaves the affected berths held with an explicit refusal message — the model keeps its last reviewed observation and nothing synthetic is substituted. Old local recovery copies that still contain clearly labeled rehearsal events remain honestly labeled and are never re-saved as live history.

Apply migration `0008_orb2_saved_beats.sql` to the same D1 database used by the Worker before enabling server persistence. If the history table is missing or D1 is unavailable, the page labels the condition and preserves the local recovery copy when browser storage is available. This persistence route never initiates a provider request.

## Ticker-orb mode and The Orb's fractal frames

- When Good Intelligence mounts Orb 2 over its reviewed watchlist, the toolbar offers a `TIMEFRAME` selector; switching it rebuilds the ticker orbs locally without another network request, and the empty state names the reviewed watchlist it is waiting on. Every ticker is rendered as its own wire spheroid inside a second, inner ticker field, itself nested within Orb 2's outer shell. Rank-matched Series A/B spheroids sit side by side and link individually, while delicate same-series guides stitch neighboring tickers together; the pairs are spread across the inner field instead of collapsing into two outer clusters.
- Orb 2 reuses The Orb's shared fractal frame processors: the 200-frame `OrbFilm` surface film is wrapped through Orb 2's own 3D camera and node shell with an equal-energy sub-frame crossfade, and the dual flame system from The Orb governs the core — `Demo.flame` (120 frames) burns at Center Origin inside a counter-rotating AI inner shell, while `OuterOrb.flame` (600 frames) never draws pixels and instead modulates the counter-rotating depth shells and the helix rungs' breathing, exactly as The Orb's outer system does. Both are display-only: no OCM message, market signal, recommendation, authorization, transaction, or permission to act is produced by any of them.
- The ApophysisAV `.flame` frames are authored 3D animations. Orb 2 draws them through the flame's reference triangle — the O-X-Y basis every IFS point is expressed against — rotated in 3D (slow precession with a breathing tilt) and projected through Orb 2's own camera as an oriented quad, so the render sits inside the model's space instead of lying flat against it. The shared billboard draw remains the fallback for any player that does not expose its bounce frames.
- The `Fractal core` toggle hides the frames without disturbing the beat view, and the choice persists with Orb 2's anonymous local preferences. When the film or flame modules are absent, not started, or still baking, the model stays on its wire core; nothing is invented. Compact flow and fractal status boxes are intentionally omitted from the canvas overlay so the nested geometry remains unobstructed.

## Double helix: two reviewed ticker sets

- The `SERIES` control switches between the single-set sector sphere and a double helix of two reviewed ticker sets (`SERIES A` / `SERIES B` inputs, comma or space separated). Unknown symbols are refused with an honest note — never invented — and both sets persist with the anonymous local preferences. Series changes rearrange nodes locally and never force a provider request.
- The supplied close's position inside its Fibonacci Bollinger band range orders each strand: lower-band through basis to upper-band, with 0.618 levels shown as large-shell guides. Rank-matched ticker pairs receive separate, eased anchor sites across the inner field, and each ticker's local spheroid ring marks its own band position; a held orb stays at the basis marker with a dashed neutral ring and `HELD` label.
- Supplied band width over basis widens each orb's volatility halo; normalized stretch from the band midline drives its core glow and rung intensity; a supplied band break flashes gold. Missing band values remain missing.
- Each rank-matched A/B pair has its own short connector, colored by directional agreement (both rising green, both falling red, diverging amber, held dashed slate); brightness follows combined potential energy and the OuterOrb macro-flame's breathing. The inspector reports strand, rank, band position, band width, potential energy, and the rank-matched partner for the selected orb.
- The arrangement is descriptive only. It is not a rating, ranking service, relative-strength measure, signal, or recommendation, and missing fields stay missing.

## Validation

- `npm run test:characters` covers the provider contracts and beat/motion engine.
- `node --test tests/good-intelligence-orb2-test.mjs tests/good-intelligence-orb2-worker-test.mjs` covers the Orb 2 UI composition, warm-up, beat persistence, and storage boundary.
- `npm run check:deploy` validates the Worker bundle after asset preparation.
