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

- Orb cores and object rings keep the Characters beat-mood palette; node halos and base communication paths identify Massive, Tickerbot, or Alpha Vantage. The green/red volume-flow runner overlays that provider-colored path without recoloring it. Cached/rehearsal, partial/unconfirmed, and held/unavailable responses use distinct dashed/dotted paths. Halo opacity fades with the age of the stored beat snapshot, not the age of the provider's latest bar.
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

## Ticker-orb mode and Center Origin

- When Good Intelligence mounts Orb 2 over its reviewed watchlist, the toolbar offers a `TIMEFRAME` selector; switching it rebuilds the ticker orbs locally without another network request, and the empty state names the reviewed watchlist it is waiting on.
- Center Origin carries the parts the author specified on the whiteboard: an **inner shell** inside the model, the **declared PDH phase** as a rotation shift of that whole assembly, and the origin drawn as the **CPU node** that the **Human Key** secures. Phase, gate state, and the UTS clock are read from the local kernel snapshot (`HOS.observe()`) and the local UTS math, then shown on the canvas in one `ORIGIN · CPU — 0•000•000•0000 · GATE … · PDH … · UTS …` strip. An unread kernel is reported as `GATE UNREAD` / `PDH UNDECLARED`; nothing is defaulted, and no gate state authorizes anything.
- **No fractal, flame, or film engine is attached to this view.** The `OrbFilm` surface film, the `Demo.flame` IFS core, the `.flame` reference-triangle billboard, and the `Fractal core` toggle were removed at the author's instruction: the fractal engines added a second, unrelated animation system on top of market geometry. The Orb app, the Fractal Flame app, and the OCM visualization keep their own flame/film rendering unchanged.
- Two bordered status boxes are deliberately absent from the canvas overlay so the geometry stays unobstructed; what remains is the volume-flow readout, the Center Origin strip, and the gesture hint.

## Fibonacci-band metrics

- `GoodIntelligenceOrb2.fibonacciBandMetrics(market)` is the shared, pure definition of a ticker's position inside its own Fibonacci Bollinger band: `p = 0.5 + ((close - basis) / (close >= basis ? upper - basis : basis - lower)) / 2`, so an upper-band and a lower-band excursion of the same size read the same distance from neutral. Band width over basis is volatility, normalized stretch from the midline is potential energy, and a supplied band break names its side.
- Incomplete or invalid packets stay `held` with `p = null` — unknown, never neutral. The composite field, the spheroid shelf, and any future surface read this one function rather than restating the rule.
- The double-helix arrangement that once consumed it in Orb 2 (Series A/B strands, rungs, eased berths) is retired along with the fractal pass. The metric survives because it is market arithmetic, not decoration; `tests/orb2-baseline-test.mjs` pins it.

## Surfaces: what is whose

| Surface | What it renders | Where |
| :--- | :--- | :--- |
| **Characters** | Objects, NPCs, and Items moved by the last closed bar over the five reviewed Discs | `#app=characters` |
| **Orb 2** | The same beat contract in 3D: node/berth motion, provider paths, VFI volume-flow runners, the Center Origin assembly | Good Intelligence → `Orb 2` tab |
| **NAB Discs** | The 119-sector composite field with institutions, market observations, and physical designs | `#app=nab-discs` and the Good Intelligence → `NAB Discs` tab |

Orb 2 and Characters do not delegate to the composite field, and the composite field does not rename or replace them. `js/nab-sectors.js`, `js/nab-composites.js`, `js/nab-orb-renderer.js`, `js/nab-discs-view.js`, `css/nab-discs.css`, the NAB migration/ledger boundaries, and the saved-beat archive all remain in service exactly as delivered; the reviewed Discs are still what their provider routes and historical records key on.

## Validation

- `npm run test:characters` covers the provider contracts and beat/motion engine.
- `node --test tests/good-intelligence-orb2-test.mjs tests/good-intelligence-orb2-worker-test.mjs` covers the Orb 2 UI composition, warm-up, beat persistence, and storage boundary.
- `npm run check:deploy` validates the Worker bundle after asset preparation.
