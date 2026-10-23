# The Harshal Priyavadan Patel Financial Model — source map

**Attribution:** Harshal Priyavadan Patel
**Purpose:** Connect the white paper's plain-English definitions to the current repository implementation. Paths are repository-relative; function names are more stable than line numbers.

## Development-source provenance

| Source class | Acquisition and role | Record in this repository |
|---|---|---|
| Historical Pine v4 inspiration | Manually retrieved from TradingView; per project-owner attribution, one script credited to Rashad and two to LazyBear. Design inspiration only; no source-runtime parity claim. | Not reproduced here. Exact titles, TradingView IDs/URLs, author handles, retrieval dates, and permissions remain unrecorded. See `scripts/pine/README.md` for the distinction from the separate v6 archive. |
| Domain/build distinction | Project owner labels Inspiration Script [1] **Regular** and this financial model **Logarithmic**, and describes the change as a ground-up build that introduced per-ticker granularity. | Current log-space price-band math: `js/good-intelligence-market-context.js` `computeBands`; per-observation band/geometry logic: `js/good-intelligence-orb2.js` `fibonacciBandMetrics` and `marketDataPlacement`. These differ in domain and scope; do not equate them or call this a direct port. |
| Market observations | Automatically fetched through configured provider APIs; they feed chart/field calculations and are provider-reported rather than ground truth. | `js/apps-good-intelligence.js`, Worker provider adapters, response metadata and test fixtures; live provider selection depends on deployment configuration. |
| Automated verification | Deterministic repository test fixtures exercise formula/contracts. | Test files listed below; tests do not fetch the original TradingView scripts or establish live-provider accuracy/source parity. |

## Product and dashboard

| Responsibility | Implementation | What to inspect |
|---|---|---|
| Combined Financial Model tab and visible side-by-side panels | `js/apps-good-intelligence.js` | Good Intelligence markup near `data-gi-financial-model-panel`; `updateView`; `drawMarketCharts`; `drawOrb2`; `state.marketInterval` and `state.orb2Interval` |
| Responsive chart/Orb 2 layout and brand styling | `css/good-intelligence.css` | `.gi-financial-model-dashboard`, `.gi-market-charts-panel`, existing Orb 2 responsive and fullscreen styles |
| Branded Orb 2 view, inspector, field UI, and 3D rendering | `js/good-intelligence-orb2.js` | `mount`; field polling/render; `marketDataPlacement`; `fibonacciBandMetrics`; `logarithmicBandGeometry`; market source/freshness readouts |

## Market Charts mathematics and data path

| Responsibility | Implementation | Main symbols / behavior |
|---|---|---|
| Bar and packet normalization | `js/good-intelligence-market-context.js` | `normalizeBars`, `normalizeParameters`, `normalizePacket`; schema `gi-market-context-v1`; 5,000-bar limit |
| Moving averages and rolling statistics | `js/good-intelligence-market-context.js` | `rollingMean`, `rollingStdev`, `rollingWma`, `ema`, `rma`, `movingAverage` |
| VFI | `js/good-intelligence-market-context.js` | `computeVfi`; complete OHLCV requirement; rolling log-return volatility; volume cap and EMA signal |
| Logarithmic Fibonacci Bands | `js/good-intelligence-market-context.js` | `computeBands`, `priceFromLog`, `FBB_VARIANTS`, `fbbVariantResult`; default FBB-200 and experimental FBB-L60 |
| WaveTrend and divergence | `js/good-intelligence-market-context.js` | `computeWaveTrend`, `mapHigherTimeframe`, `divergenceEvents` |
| Signal gates and analysis packet | `js/good-intelligence-market-context.js` | `evaluate`; confirmation, readiness, alert labels, chart series and missing-volume note |
| Chart provider/ticker/interval/cache and same-origin request | `js/apps-good-intelligence.js` | `marketKey`, `marketEntries`, `drawMarketSelection`, `requestTickerbotBars`, `drawMarketCharts`, market selector/search event handlers |
| Live provider validation and routing | `worker/` | `/market/tickerbot/bars` route and Tickerbot adapter; verify deployed secrets and allowlist |

## Orb 2 composition, spatial extension, and DS

| Responsibility | Implementation | Main symbols / behavior |
|---|---|---|
| Daily baseline + 15m residual | `worker/orb2-composition.mjs` | `normalizedBandPosition`, `metricFromMarket`, `intradayFreshness`, `composeOrb2Scales`, `sanitizeOrb2Composition`; fixed weights, freshness, status and clamps |
| Orb 2 radial and directional placement | `js/good-intelligence-orb2.js` | `fibonacciBandMetrics`, `logarithmicBandGeometry`, `marketDataPlacement`; topology constants near `TOPOLOGY_BAND_BASE`, `TOPOLOGY_BAND_RATIO`, and `TOPOLOGY_MAX_BANDS` |
| Shared WaveTrend/FBB extension | `js/market-extension.js` | `waveExtension`, `basisFrame`, `basisExtension`, `extensionOf`; reports the larger available extension and its driver |
| Dollar Strength input gate and formula | `js/good-intelligence-dxy.js` | `confirmedDailyClose`, `evaluate`; Massive-only confirmed daily closes, four-day age limit, timestamp alignment, ICE Rule 15.01 weights |
| Server field collection and publication | `worker/orb2-field.mjs`, `worker/orb2-field-publish.mjs`, provider adapters under `worker/` | Provider routing, input contracts, bounded work, persistence, field read/write; inspect deployment configuration separately |
| Scheduled operation | `wrangler.jsonc`, `migrations/community/`, deployment guides | Cron, D1 bindings/migrations, access, and deployment steps; repository configuration does not prove remote state |

## Audit tests

| Test file | Primary contract covered |
|---|---|
| `tests/good-intelligence-market-context-test.mjs` | OHLCV normalization, indicator calculations, missing inputs, confirmation and alert behavior |
| `tests/good-intelligence-orb2-test.mjs` | Orb 2 display, market mapping, field UI, status and boundaries |
| `tests/orb2-composition-test.mjs` | Daily baseline, 15m residual, freshness, alignment multiplier, missing/stale behavior |
| `tests/good-intelligence-dxy-test.mjs` | DS provider/symbol/interval/confirmation/age/alignment/formula gates |
| `tests/g0-desktop-test.mjs` | Good Intelligence desktop navigation, combined-dashboard visibility, chart controls and read-only request boundaries |
| `tests/good-intelligence-orb2-worker-test.mjs`, `tests/orb2-field-scheduler-test.mjs`, `tests/orb2-field-publish-test.mjs` | Worker field contracts, scheduler and publication behavior |

## Current deployment evidence required

The source map describes code, not an assertion that production is active. Before operational use, inspect the deployed Cloudflare Worker settings, secret presence, provider entitlements, Access policy, D1 bindings and remote migrations, Cron trigger, rate limits, and runtime constraints. A local test passing does not establish any of these facts.
