# The Harshal Priyavadan Patel Financial Model — audit checklist

**Attribution:** Harshal Priyavadan Patel
**Purpose:** Plain-language review checklist for the combined Good Intelligence Market Charts + Orb 2 dashboard.
**Use with:** [White paper](HPP-FINANCIAL-MODEL-WHITE-PAPER.md) and [reconstruction specification](HPP-FINANCIAL-MODEL-RECONSTRUCTION-SPEC.json).

This is a review aid, not a certification. Mark each item **Pass**, **Fail**, or **Not verified**, and preserve a short note or screenshot for each decision.

## A. Scope and identity

- [ ] The UI displays the exact brand **The Harshal Priyavadan Patel Financial Model** in the Financial Model view.
- [ ] The dashboard shows Market Charts and Orb 2 together, without presenting them as one pooled predictor.
- [ ] Market Charts ticker/provider/interval state is independent of Orb 2's field/timeframe state.
- [ ] Real-estate pro formas and the paper-trading P&L application are not represented as part of this package.
- [ ] Public attribution uses the name **Harshal Priyavadan Patel** only; no sensitive personal identifier is present in UI, white paper, JSON, ZIP, or metadata.
- [ ] “Financial Model” is clearly bounded: no implied DCF, valuation, forecast, return estimate, recommendation, execution, or performance guarantee.

## B. Market Charts source and provenance

For a live chart:

- [ ] The provider selector says **Tickerbot Live** and a supported watchlist ticker is selected.
- [ ] The ticker is in the reviewed allowlist; a symbol outside it makes no provider request.
- [ ] Browser network traffic goes only to the same-origin Worker route. No provider key or direct provider call is present in the browser.
- [ ] The chart identifies ticker, interval, source, bar count, latest close, timestamps, and confirmation state where supplied.
- [ ] The chart label states that Tickerbot-supplied OHLCV is not independently verified.
- [ ] The selected interval is 1h or 1d, and changing it changes only the chart interval.

For synthetic demo:

- [ ] Synthetic demo is selected intentionally by the reviewer.
- [ ] Symbols/prices and chart labels visibly remain synthetic.
- [ ] Demo is not automatically substituted for a live provider refusal, missing credential, or empty response.

For missing, malformed, or refused data:

- [ ] An empty or invalid response shows an explicit unavailable state, not an invented price line.
- [ ] A ticker search with no match issues no provider request and does not retain an old ticker's chart as if it matched.
- [ ] Missing volume remains missing. VFI and volume measures are disabled/unavailable rather than treated as zero.
- [ ] The reader checks bar timestamps instead of assuming the open dashboard means fresh market data. Market Charts has no universal client-side staleness threshold.

## C. Market Charts mathematics

- [ ] Bar normalization rejects invalid timestamps, invalid prices, partial OHLC ranges, negative/non-finite volume, and impossible OHLC ranges.
- [ ] Duplicate timestamps use the last input row; accepted bars are sorted ascending; the maximum input is 5,000 bars.
- [ ] VFI is calculated only when every bar contains complete OHLC and volume.
- [ ] VFI's cutoff uses rolling standard deviation of log typical-price returns; signed volume is capped at 2.5 times the prior 130-bar volume average; the default signal is EMA-5.
- [ ] Warm-up values remain null until required windows/contributions are ready.
- [ ] Default Fibonacci Bands use `ln(source)`, VWMA of the logged source for the center (SMA fallback when volume is unavailable/zero), population standard deviation of logged source, six Fibonacci ratios, and exponentiation only at the price-unit boundary.
- [ ] FBB-L60 is labeled experimental when applicable; it is not silently described as a validated replacement for FBB-200.
- [ ] WaveTrend uses EMA-10 channel average, EMA-10 absolute deviation, the 0.015 channel-index denominator, EMA-21 WT1, and SMA-4 WT2.
- [ ] Current-bar alerts follow the default confirmation gate; missing or unconfirmed bars do not create a live signal.
- [ ] Divergence uses a five-bar pivot lookback and is only known after the right-side bars arrive.
- [ ] Indicator and alert labels are not described as expected return, probability, action, or investment advice.

## D. Orb 2 field, freshness, and composition

- [ ] Each observation shows its provider, symbol/instrument, Disc, interval, timestamp, confirmation, freshness, and held/unavailable state where supplied.
- [ ] The field request uses same-origin Worker routes; the browser never receives provider secrets.
- [ ] Daily metrics supply the required baseline. With no usable daily baseline, composition status is `hold`.
- [ ] If the 15-minute input is missing or stale, status is `baseline-only`; the 15-minute score is never treated as a baseline by itself.
- [ ] Intraday freshness is full through 45 minutes, declines linearly to zero at two hours, and follows the code's fixed weekday UTC 13:30–20:00 attenuation rule outside the window.
- [ ] The reviewer understands that this UTC session rule is not a holiday/DST-aware exchange calendar.
- [ ] Feature quality is labeled as coverage, not statistical confidence.
- [ ] The 0.72/0.28 weighting, ±1 clamp, alignment multiplier and `√26` width scaling are treated as design conventions, not calibrated or validated forecasts.
- [ ] Display geometry is traced to supplied metrics. Missing data is labeled held/unmeasured rather than calm or neutral.
- [ ] WaveTrend extension and band-distance extension are explained separately; the band displacement is not added twice to radius.

## E. Dollar Strength reference

- [ ] Only six confirmed, positive, finite, non-synthetic Massive daily FX closes are accepted.
- [ ] Closes are fresh within four days, no more than five minutes future-dated, and have identical bar timestamps.
- [ ] Missing, stale, invalid, or misaligned components hold the DS output.
- [ ] The readout is called a calculated daily reference and is not presented as licensed real-time ICE DXY/USDX.
- [ ] The component quote orientation, negative exponents, ICE Rule 15.01 weights, and baseline 100 are documented.

## F. Deployment and operational review

- [ ] The exact deployed Worker provider configuration is inspected; documentation alone is not treated as proof of a live provider.
- [ ] Provider account permissions and redistribution/display rights are confirmed for the target environment.
- [ ] Required Worker secrets are configured and never exposed to the browser.
- [ ] Cloudflare Access or other authentication requirements are verified at the actual deployment.
- [ ] D1 bindings and remote migrations are checked against production, not inferred from local files.
- [ ] Cron schedule, durable budgets, provider rate limits, retries, and freshness behavior are verified in the deployed environment.
- [ ] Runtime CPU/time/memory and field publication are tested with realistic provider responses.
- [ ] Production checks distinguish an unavailable/held field from a successful fresh field.

## G. Source acquisition and citation record

- [ ] The provenance statement distinguishes manually retrieved TradingView reference code from automatically retrieved provider market observations.
- [ ] The three Pine v4 inspiration scripts are identified only as project-attributed sources: one credited to Rashad and two to LazyBear.
- [ ] The v4 inspiration sources are not confused with the separate user-supplied Pine v6 transcriptions in `scripts/pine/`.
- [ ] Before formal citation or source redistribution, record each TradingView script's exact title, ID, author handle, URL, retrieval date, and reuse permission.
- [ ] Provider observations retain provider/source, instrument, timestamp, interval, synthetic status, and response provenance; API data are not called independent ground truth.
- [ ] Repository tests are described as deterministic-fixture tests, not live-provider verification or proof of Pine runtime parity.

## H. Automated checks and evidence

Focused tests:

```sh
node --test \
  tests/good-intelligence-market-context-test.mjs \
  tests/good-intelligence-orb2-test.mjs \
  tests/good-intelligence-dxy-test.mjs \
  tests/orb2-composition-test.mjs \
  tests/g0-desktop-test.mjs
```

Broader checks:

```sh
npm run test:app
npm test
```

- [ ] Record the command, environment, date, pass/fail summary, and relevant test output.
- [ ] Review boundary cases separately: no bars, partial OHLC, missing volume, insufficient history, unconfirmed latest bar, no daily baseline, stale 15m, and six unaligned FX closes.
- [ ] Compare the JSON reconstruction spec with the implementation before adapting the model elsewhere.
- [ ] Treat fixture tests as software-contract evidence only—not market accuracy, licensing, safety, or investment performance evidence.
