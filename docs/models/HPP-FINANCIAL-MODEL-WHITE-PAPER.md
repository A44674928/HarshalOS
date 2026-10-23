# The Harshal Priyavadan Patel Financial Model

## Mathematical white paper and reconstruction guide

**Attribution:** Harshal Priyavadan Patel
**Product line:** Good Intelligence · Orb 2
**Revision date:** 2026-10-23
**Scope:** Combined Market Charts + Orb 2 dashboard
**Model class:** Provider-attributed market-context calculations and display geometry; not a valuation or trading model

---

## Executive summary

The Harshal Priyavadan Patel Financial Model is the branded **Good Intelligence → Financial Model** dashboard. It puts two existing market-context surfaces on one screen:

1. **Market Charts** calculates and displays technical context for a user-selected ticker and supplied OHLCV bars.
2. **Orb 2** reads a separate, provider-attributed server field across five reviewed Disc families—Stocks, FX, Crypto, Futures, and Indices—and displays its observations as an interactive 3D field.

The surfaces are neighbors, **not one pooled predictor**. The selected Market Charts ticker, source, cache, and 1-hour/1-day chart interval do not become Orb 2's observations. Orb 2 has its own field and timeframe control. The dashboard does not average one surface into the other or infer missing values from the other surface.

The calculations turn observed prices, volume, indicator values, data quality, and freshness into descriptive context and deterministic geometry. They do not estimate intrinsic value, future returns, a target price, a probability of success, or an optimal portfolio; they do not issue investment recommendations or execute trades. The term “Financial Model” is the product name, not a claim that this package is a discounted-cash-flow or financial-statement model.

This paper explains the implemented contracts and mathematics so a reader, auditor, or AI system can independently reconstruct them. It records design constants as implemented, not as empirically optimized parameters. The repository's focused tests check behavior against fixtures; they are not proof of profitability, market-data accuracy, legal compliance, provider rights, or production readiness.

## 1. Scope, attribution, and exclusions

The package is attributed by the name **Harshal Priyavadan Patel**. This document intentionally uses the name only and does not reproduce a sensitive personal identifier.

Included:

- Good Intelligence Market Charts: provider selection, ticker search, 1h/1d bars, normalization, VFI, logarithmic Fibonacci Bands, WaveTrend, descriptive alerts, and explicit empty/error states.
- Good Intelligence Orb 2: the five-Disc field, provider/freshness status, the daily-baseline/15-minute-residual composition contract, Dollar Strength reference calculation, and display-only spatial mapping.
- A single branded dashboard that shows the two surfaces together without changing their independent data boundaries.

Excluded: the separate real-estate pro formas, the paper-trading P&L application, broker/order execution, and any implied guarantee, recommendation, valuation, or performance claim.

## 2. System map: two independent observation paths

### 2.1 Market Charts path

The live chart source is **Tickerbot Live**. The browser uses the configured 52-symbol Tickerbot watchlist, lets the user search symbols or company names, and requests only an allowlisted symbol through the same-origin Good Intelligence Worker route. The provider credential remains server-side. The selector offers **1h** and **1d** intervals. A second choice, **Synthetic demo**, is explicitly labeled synthetic; it is a test/illustration source, not a live fallback.

The browser caches bars by provider, selected ticker, and chart interval. Switching source or ticker cannot silently re-label cached synthetic bars as live bars. Missing OHLCV is shown as missing; the chart does not manufacture a price line. The rendered chart series contains at most the latest 240 bars, while indicator calculations use the normalized input history (maximum 5,000 bars).

### 2.2 Orb 2 path

Orb 2 reads observations from same-origin Worker routes. The server selects providers and bounded work, validates and stores observations, and publishes a field snapshot; the browser renders returned observations and their source/status/freshness. The browser is not given provider secrets and does not directly query market-data vendors.

The reviewed provider routing is deployment-configurable. The product documentation describes Tickerbot for Stocks, Kraken Spot for Crypto, and Massive by default for FX, active Futures, and Indices; configuration can select Twelve Data for daily context, and the FX lane has a separately bounded Alpha Vantage fallback. The exact provider active in a particular deployment must be checked in that Worker configuration and its response metadata.

### 2.3 Combination boundary

The combined dashboard is a **UI composition**. The Market Charts interval and Orb 2 timeframe are intentionally separate state variables. Each surface retains its own data source, source labels, request/cache path, and failure behavior. There is no hidden chart-to-field join or cross-provider substitute. A reader must not infer that both surfaces describe the same instrument, timestamp, quote currency, or provider unless each displayed record says so.

## 3. Input contract and normalization

### 3.1 Chart packet and bars

The client-side market-context module accepts the `gi-market-context-v1` packet shape: source, symbol, timeframe, quote currency, optional parameter overrides, a `synthetic` flag, bars, and optional higher-timeframe bars. A bar can carry a timestamp, close, optional full OHLC, optional volume, and an explicit `confirmed: true` marker.

Normalization is deterministic:

1. Keep no more than the final 5,000 input rows.
2. Reject rows without a parseable finite timestamp or finite close.
3. If any OHLC field is present, require all three open/high/low fields. Reject non-finite or non-positive OHLC/close values and internally inconsistent ranges (`high` must cover open and close; `low` must cover open and close; high cannot be below low).
4. If volume is supplied, require a finite non-negative number. Missing volume stays missing; it is not set to zero.
5. Preserve confirmation only when the source value is exactly `true`.
6. For duplicate timestamps, the last row in input order wins; then sort ascending by time and retain no more than 5,000 bars.

Selected sources such as HLC3 use `(high + low + close) / 3` when a full range is present; if the range is absent, the source helper falls back to close. This makes price-only context possible, but it does not invent the absent high/low fields. VFI has stricter requirements and remains unavailable without complete OHLC and volume.

### 3.2 Provenance fields

For every displayed observation, an auditor should record: provider/source label, symbol/instrument, asset class or Disc where supplied, interval, quote currency where supplied, bar timestamp, confirmation state, synthetic status, bar count, and any freshness/status label. A provider label is provenance, not independent verification.

The live Market Charts request is same-origin and allowlisted. The explicit demo mode is synthetic. Orb 2 uses a separate server field and its own provider routing. A provider's refusal, missing secret, invalid response, or empty bar set is an unavailable input—not a neutral score.

## 4. Market Charts calculations

### 4.1 Defaults

Unless an input packet overrides them within the module's allowed ranges, the chart-context calculation uses:

| Component | Default |
|---|---:|
| VFI flow window | 130 bars |
| VFI volatility window | 30 bars |
| VFI price-change coefficient | 0.2 |
| VFI volume cap | 2.5 × prior volume average |
| VFI signal | EMA, 5 bars |
| Optional VFI smoothing | Off; length 3, SMA if enabled |
| Fibonacci Band length | 200 bars |
| Band multiplier | 3 standard deviations |
| Band moving average / source | VWMA of HLC3 |
| WaveTrend channel / average / signal | 10 / 21 / 4 bars |
| WaveTrend source | HLC3 |
| WaveTrend overbought thresholds | +53, +60, +70 |
| WaveTrend oversold thresholds | −53, −60, −70 |
| Divergence pivot lookback | 5 bars on each side |
| Confirm latest close before signals | Yes |

Moving-average, source, threshold, and smoothing overrides are bounded and enumerated by the code. The chart uses same-timeframe WaveTrend by default. Optional higher-timeframe WaveTrend is only available when explicitly enabled and confirmed higher-timeframe bars are supplied.

### 4.2 VFI — volume-flow index

VFI is available only if **every** normalized bar has complete OHLC and volume. For each bar `i`, define typical price:

\[
T_i = (H_i + L_i + C_i)/3.
\]

The log return used for the rolling volatility is:

\[
r_i = \ln(T_i/T_{i-1}).
\]

Let `σᵢ` be the population standard deviation of the last 30 `r` values, and let `Aᵢ₋₁` be the 130-bar simple average volume ending on the **prior** bar. The price-change cutoff and capped volume are:

\[
K_i = 0.2\,σ_i C_i, \qquad V_i^* = \min(V_i, 2.5 A_{i-1}).
\]

Let `Mᵢ = Tᵢ − Tᵢ₋₁`. The signed contribution is:

\[
Q_i = \begin{cases}
+V_i^* & M_i > K_i,\\
-V_i^* & M_i < -K_i,\\
0 & -K_i \le M_i \le K_i.
\end{cases}
\]

The raw VFI is the rolling 130-bar contribution sum divided by the prior volume average:

\[
\operatorname{VFI}_i = \frac{\sum_{j=i-129}^{i}Q_j}{A_{i-1}}.
\]

The default output is unsmoothed raw VFI. Its signal is a 5-bar exponential moving average (EMA). If optional smoothing is enabled, that moving average is applied to raw VFI before the signal EMA. Initial history is a real warm-up requirement: until all needed volatility, volume-average, and flow values exist, the VFI and its signal are null/unready. They are not filled with zero.

### 4.3 Logarithmic Fibonacci Bands

For the chosen price source `Pᵢ` (HLC3 by default), the calculation first takes natural logs:

\[
x_i = \ln(P_i), \quad P_i>0.
\]

The default center is a 200-bar volume-weighted moving average **of the logged source**:

\[
b_i = \frac{\sum_{j=i-199}^{i} V_j x_j}{\sum_{j=i-199}^{i}V_j}.
\]

When volume is unavailable, the default VWMA basis falls back to a simple average of the logged prices. If a VWMA window has zero total volume, it also falls back to that window's simple average. The dispersion is the 200-bar population standard deviation of logged source values, multiplied by 3:

\[
s_i = 3\sqrt{\frac{1}{200}\sum_{j=i-199}^{i}(x_j-\bar{x}_i)^2}, \qquad
\bar{x}_i=\frac{1}{200}\sum_{j=i-199}^{i}x_j.
\]

For Fibonacci offsets `f ∈ {0.236, 0.382, 0.500, 0.618, 0.764, 1.000}`, upper and lower levels are:

\[
U_{f,i}=\exp(b_i+f s_i), \qquad L_{f,i}=\exp(b_i-f s_i).
\]

The center is `exp(bᵢ)`. Thus the moving-average center may be volume weighted, while the dispersion is computed around the ordinary rolling mean in log space, exactly as the implementation does. The six levels are symmetric in log price (multiplicative price space), not symmetric in raw dollars. This is a documented logarithmic-domain adaptation; do not assume bit-for-bit parity with a conventional price-space Pine implementation.

Orb 2 can receive/reference two named variants: **FBB-200** (200 bars, reference) and **FBB-L60** (60 bars, experimental). Each variant needs its own number of bars. Orb 2 prefers an available FBB-L60, then FBB-200, then the packet's supplied band frame. This preference is a display-placement rule; it does not change the Market Charts panel's default 200-bar chart calculation.

### 4.4 WaveTrend

Using the selected source `Sᵢ` (HLC3 by default, with close fallback when a range is absent):

\[
ESA_i=EMA_{10}(S_i), \qquad D_i=EMA_{10}(|S_i-ESA_i|),
\]

\[
CI_i=\begin{cases}(S_i-ESA_i)/(0.015D_i)&D_i\ne0,\\0&D_i=0,\end{cases}
\]

\[
WT1_i=EMA_{21}(CI_i), \qquad WT2_i=SMA_{4}(WT1_i).
\]

`WT1` and `WT2` are a momentum-context pair. The default zones compare WT1 with +53/+60/+70 and −53/−60/−70. Crosses, zero-line crossings, and extreme reversals are emitted only when the required current and previous values exist and, by default, the latest bar is confirmed.

### 4.5 Divergence and alert labels

A pivot is confirmed with five bars on either side; its event is therefore known five bars after the pivot. Regular bullish divergence compares successive pivot lows: price makes a lower low, WaveTrend makes a higher low, and the earlier oscillator pivot is below −53. Regular bearish divergence compares successive pivot highs: price makes a higher high, WaveTrend makes a lower high, and the earlier oscillator pivot is above +53. Hidden divergence is disabled by default and can be enabled through parameters. Recent events are descriptive, not forecasts.

The chart may label VFI crosses, zero crosses, upper/lower outer-band crosses, VFI/Fibonacci confluence, WaveTrend crosses, extreme reversals, and divergences. These are rule-triggered visual annotations. They are neither a recommendation nor a trade signal authorized for execution. With `confirmClose` enabled, the latest bar must be marked confirmed before current-bar alert conditions are accepted. Band and flow conditions also require the relevant prior/current values to be ready.

The `combined` label (for example, “bullish agreement,” “mixed indicators,” “price-only,” or “no current confluence”) summarizes rule states. It is not a score of expected return or confidence of a forecast.

## 5. Orb 2 normalized features and daily/intraday composition

### 5.1 Dimensionless market features

Orb 2's Worker composition does not average raw daily and 15-minute prices. It transforms each interval's market context into dimensionless features. A feature is included only when its inputs are finite and available:

- **Band position:** with positive close `C`, basis `B`, lower outer band `L`, and upper outer band `U`, compute position in log coordinates. If `C ≥ B`, half-width is `ln(U)−ln(B)`; otherwise it is `ln(B)−ln(L)`. Then
  \[
  p=\operatorname{clamp}\left(0.5+\frac{(\ln C-\ln B)/h}{2},-1,2\right),\qquad
  f_{band}=\operatorname{clamp}(2(p-0.5),-1,1).
  \]
  Values beyond the envelope remain directional but the feature is bounded.
- **Price change:** `f_change = clamp(tanh(changePct / 4), −1, 1)`.
- **Volume flow:** when VFI is available, `f_flow = clamp(tanh((VFI − VFI_signal) / 18), −1, 1)`.
- **WaveTrend separation:** when both values exist, `f_wave = clamp(tanh((WT1 − WT2) / 45), −1, 1)`.

If there are no usable features, the interval metric is unavailable (`null`), not zero. Otherwise the score is the unweighted mean of the available features:

\[
score=\operatorname{clamp}\left(\frac{1}{k}\sum_{m=1}^{k}f_m,-1,1\right),\qquad
quality=k/4,\qquad position=0.5+score/2.
\]

The feature count `k` is from zero to four. `quality` measures feature availability only; it is not statistical confidence, probability, or predictive accuracy.

### 5.2 Daily baseline and 15-minute residual

The daily score is mandatory. The 15-minute observation is a residual input, never a replacement baseline. The module uses fixed weights:

- daily baseline weight `w_d = 0.72`;
- intraday residual weight `w_i = 0.28`;
- interval label `1d` for baseline and `15m` for residual.

The 15-minute freshness `F` is calculated from the latest intraday bar timestamp. A timestamp more than five minutes in the future, missing timestamp, or invalid clock has `F=0`. Age through 45 minutes has `F=1`; between 45 minutes and two hours, `F` decays linearly to zero; age at least two hours has `F=0`. The code additionally multiplies freshness by `0.35` when that **bar timestamp** is outside its weekday UTC window of 13:30–20:00. This fixed UTC rule is not a complete exchange calendar and does not adjust itself for holidays or daylight-saving changes.

If the daily feature is unavailable, the result is `hold` with reason `daily-baseline-missing`; no position or force is fabricated. If daily is available but intraday is missing or stale, status is `baseline-only` and the daily score is retained.

When both features are available and freshness is positive, define alignment `a` as +1 when both scores have the same nonzero sign, −1 when their nonzero signs differ, and 0 if either score is zero. Then:

\[
weighted=0.72\,score_d+0.28\,score_iF,
\]
\[
M=\operatorname{clamp}(1+0.35aF|score_i|,0.65,1.35),
\]
\[
force=\operatorname{clamp}(weighted\,M,-1,1),\qquad composedPosition=0.5+force/2.
\]

The reported residual is `score_i − score_d`. The bounded multiplier can reward fresh agreement or attenuate disagreement; it cannot create force without a daily baseline. Confidence/coverage is:

\[
confidence=quality_d\,[0.72+0.28\,quality_iF].
\]

This number is a feature-coverage convention, not calibrated confidence. Output statuses are `hold`, `baseline-only`, or `composed`, with a reason string preserving why the result was selected.

### 5.3 Volatility scale

The log width of the daily outer Fibonacci envelope is reported as daily volatility context. The 15-minute width is converted to a daily-equivalent width by multiplying by `√26`, where 26 is the assumed count of 15-minute bars in a 6.5-hour regular session:

\[
width_{15m,daily}=width_{15m}\sqrt{26}.
\]

This is a square-root-of-time scaling convention for display comparison, not a volatility forecast or a validated risk estimate. It does not assert independent or normally distributed returns.

## 6. Orb 2 display placement

Orb 2 is a visualization layer over supplied observations. It preserves source and status in the inspector and holds a missing packet at a placeholder berth; it does not invent a market location. For an observed packet, it forms bounded axes:

\[
x_p=\operatorname{clamp}(\tanh(changePct/4),-1,1),
\]
\[
x_v=\operatorname{clamp}(\tanh((VFI-VFI_{signal})/18),-1,1),
\]
\[
x_w=\operatorname{clamp}(\tanh((WT1-WT2)/45),-1,1).
\]

Band position supplies `x_b = clamp(2(p−0.5),−1,1)` when available; if a composed position exists it supplies `x_b = clamp(2(composedPosition−0.5),−1,1)` instead. If no band is available, the price-change axis is used as the local band-axis fallback for directional layout only; this does not create a band measurement.

The raw longitude and latitude are:

\[
longitude=0.035\,identityPhase+1.8x_p+1.15x_v+0.8x_b+0.45x_w,
\]
\[
latitude=\operatorname{clamp}(0.82x_b+0.46x_w+0.18x_v,-1.25,1.25).
\]

`identityPhase` is a stable symbol-derived tie-breaker, not a market input or rank. The band displacement is `d=(ln(C)−ln(B))/h`, using the half-width on the side of the basis. The radial band expands logarithmically:

\[
rawBand=\log_{1.45}(\max(1,|d|)),\qquad
bandRadius=2.12\times1.45^{bandIndex+fraction}.
\]

The implementation floors/clamps the index to the six-band topology limit, retains the fractional band position, and clamps final radius to `[1.36, 8.5]`. A held/missing band uses the base radius `2.12` rather than an invented band displacement.

Pressure is:

\[
pressure=\operatorname{clamp}\left((0.42|x_p|+0.28|x_v|+0.15|x_w|+0.15\,volatility)\times forceMultiplier,0,1\right),
\]

where the composition multiplier is clamped to `[0.65,1.35]` and otherwise defaults to 1. The displayed radius is:

\[
r=\operatorname{clamp}\bigl(bandRadius(0.92+0.12\,pressure)(1+push),1.36,8.5\bigr).
\]

The shared extension measure compares two independent readings and reports the larger:

- WaveTrend extension: `clamp((|WT1|−53)/(70−53), 0, 1)`; zero inside the ±53 neutral edge, one at/beyond ±70.
- Basis extension: `clamp(|ln(C/B)| / h, 0, 1)`; zero at the basis, one at/beyond the ±1000 outer band.

When neither is available, extension is marked unmeasured, not calm. The radial formula already uses the logarithmic band displacement, so the extra radial `push` uses only the WaveTrend component: `push = 0.45 × waveExtension` when a valid band exists. The basis component is not applied twice. This distance is geometry, not volatility-adjusted value, rank, or recommendation.

The volume/price/wave axes and the 3D canvas are deterministic display transforms. Color, animation, node spacing, camera lens, and screen-space separation do not alter the underlying input or score. The five Disc parent positions are catalog/display structure; they are not a ranking of asset classes.

## 7. Dollar Strength (DS) reference

The browser-only DS calculation consumes no independent data. It accepts six already returned observations only when each is a confirmed, positive, finite **Massive 1d FX close**, marked non-synthetic, assigned to the FX Disc, fresh within four days, and no more than five minutes in the future. All six bar timestamps must match exactly; otherwise DS is held.

The components and weights are EUR 0.576, JPY 0.136, GBP 0.119, CAD 0.091, SEK 0.042, and CHF 0.036. The source symbols are USD per one foreign-currency unit, so the code inverts each quote into the convention used by the formula:

\[
DS=50.14348112\times EURUSD^{-0.576}\times JPYUSD^{-0.136}\times GBPUSD^{-0.119}\times CADUSD^{-0.091}\times SEKUSD^{-0.042}\times CHFUSD^{-0.036}.
\]

The readout also shows the value versus a display baseline of 100. This is a calculated, provider-derived daily reference using the documented ICE USDX Rule 15.01 weights; it is **not** the licensed real-time ICE-distributed index value, an action gate, or a coordinate origin.

## 8. Missing, stale, refused, and synthetic inputs

The model uses explicit states rather than silently substituting zeros:

| Condition | Market Charts | Orb 2 / composition |
|---|---|---|
| No valid bars | “No ticker bars supplied” or a safe unavailable state; no chart prices are fabricated | No observation stays held/awaiting; no synthetic live replacement |
| Missing volume | VFI and volume measures unavailable; log bands may fall back from VWMA to SMA | Flow feature omitted; feature quality decreases; no zero VFI is invented |
| Too little history | Rolling values remain null until warm-up requirements are met | FBB variant reports insufficient history; another available reference frame may be selected only under its documented preference |
| Latest bar unconfirmed | With default close confirmation, current signal/alert conditions are withheld | Provider confirmation and freshness remain explicit; daily/15m composition obeys its own rules |
| Missing daily baseline | Not applicable to a standalone chart calculation | Composition status `hold`; no intraday-only force |
| Missing/stale 15m input | Not applicable to a standalone chart calculation | Daily `baseline-only`; stale intraday does not become zero-valued evidence |
| Provider refusal, invalid response, or missing secret | Safe error/unavailable message; no covert second source | Worker retains held/unavailable status; no provider identity is silently swapped |
| Demo/synthetic bars | Used only after the user explicitly selects Synthetic demo and remain labeled synthetic | Synthetic observation is not accepted for DS; the live Orb 2 path does not replace missing live observations with demo fixtures |

Chart bar timestamps and provider labels should be inspected directly. The chart surface does not apply one universal client-side “freshness age” cutoff to every displayed series, so a timestamp alone is not proof that a bar is current. Orb 2's field and the composition function do apply specific status/freshness rules described above; those rules must not be assumed to govern the chart panel.

## 9. Assumptions and limitations

1. **Not predictive.** The design contains no target, discounted cash flow, forward-return estimate, calibration set, loss function, backtest, or performance guarantee.
2. **Fixed design constants.** The 0.72/0.28 weights, `tanh` scales 4/18/45, VFI defaults, and geometry constants are implementation choices. This paper does not claim they are optimal or statistically fitted.
3. **Equal feature averaging.** Available Orb 2 features receive equal arithmetic weight after nonlinear clipping; missing features reduce coverage rather than being imputed. The resulting score is sensitive to feature availability and provider field semantics.
4. **Different providers and timestamps.** Daily and intraday inputs can differ in source, market hours, adjustments, and coverage. The composition uses dimensionless scores but does not prove their economic comparability. The dashboard surfaces do not guarantee common timestamps or instruments.
5. **Simplified RTH rule.** The 13:30–20:00 UTC weekday window is a fixed code rule, not an exchange calendar; it does not model holidays and may not align with local US market hours across daylight-saving changes.
6. **Square-root scaling.** `√26` is a conventional time-scaling assumption, not measured realized variance and not a validated risk model.
7. **Indicator assumptions.** Rolling windows, population standard deviation, volume caps, the HLC3 fallback, and confirmation rules affect values. Different bar providers, corporate-action adjustments, missing sessions, or different source parameters can produce different indicators.
8. **Provider truth and rights.** A response can be well-formed and still wrong, delayed, revised, or unsuitable for a user's purpose. Provider licenses and exchange/distribution rights must be reviewed separately.
9. **DS is not official DXY.** The DS value is a six-close mathematical reference and must not be represented as a live licensed ICE index.
10. **Deployment is external to this calculation.** Production secrets, provider entitlements, access controls, remote D1 migrations, Cron activation, and CPU/time limits need verification in the target environment. Code or preview tests cannot establish those facts.
11. **Geometry can mislead.** A 3D radius, screen-space separation, color, particle, or animation is a visualization—not a quantity of money, exposure, probability, or risk.
12. **No advice or authority.** No output grants permission, sends an OCM message, places an order, or replaces professional financial, legal, or tax advice.

## 10. Reconstruction recipe

A faithful reconstruction should preserve the following order and state boundaries:

1. **Keep the surfaces separate.** Build one dashboard containing Market Charts and Orb 2. Maintain independent provider, ticker, interval/timeframe, cache, and data-status state.
2. **Normalize observations exactly.** Apply the timestamp, positive-price, full-OHLC, volume, confirmation, duplicate, sort, and 5,000-bar rules in Section 3. Preserve source and synthetic labels.
3. **Calculate Market Charts from its selected packet only.** Compute VFI when complete OHLCV exists; calculate log-space bands with the selected source/MA; calculate WaveTrend; suppress unready/unconfirmed signals; render missing states rather than substitute values.
4. **Build Orb 2 interval metrics separately.** For each valid daily or 15-minute observation, derive only the available band/change/flow/wave features, their equal mean, feature coverage, and mapped position.
5. **Compose only with a daily baseline.** Apply the documented intraday freshness, session attenuation, weights, alignment multiplier, clamps, and statuses. If daily is missing, hold; if intraday is missing/stale, return baseline-only.
6. **Map the returned observation to display geometry.** Use the preferred FBB frame, dimensionless axes, logarithmic band radius, pressure, and WaveTrend-only extra radial push. Preserve held/unmeasured status in the inspector.
7. **Calculate DS only from the six eligible, aligned Massive daily closes.** Otherwise retain the missing/held/unaligned status.
8. **Expose provenance and limitations.** Show provider/source, instrument, interval, timestamp, confirmation, synthetic flag, and status. Do not convert visual or indicator outputs to orders, advice, valuations, or authority.

The machine-readable version of these rules is [HPP-FINANCIAL-MODEL-RECONSTRUCTION-SPEC.json](HPP-FINANCIAL-MODEL-RECONSTRUCTION-SPEC.json). File/function references are in the [source map](HPP-FINANCIAL-MODEL-SOURCE-MAP.md).

## 11. Audit and verification

An auditor should be able to answer, for every value: **Which input? Which provider? Which timestamp/interval? Which transform? Which defaults? Which missing-data rule? Which status?** A suggested checklist is provided in [HPP-FINANCIAL-MODEL-AUDIT-CHECKLIST.md](HPP-FINANCIAL-MODEL-AUDIT-CHECKLIST.md).

Focused implementation tests include:

```sh
node --test \
  tests/good-intelligence-market-context-test.mjs \
  tests/good-intelligence-orb2-test.mjs \
  tests/good-intelligence-dxy-test.mjs \
  tests/orb2-composition-test.mjs \
  tests/g0-desktop-test.mjs
```

The application suite is `npm run test:app`; the full repository suite is `npm test`. A passing test verifies coded behavior against test inputs, not market accuracy or investment performance.

---

## Appendix A — reconstruction invariants

A compliant reconstruction should fail review if it does any of the following:

- treats missing data as zero, neutral, calm, or confirmed;
- labels synthetic/demo data as live or silently substitutes it for a refused provider response;
- allows the chart interval to mutate Orb 2's timeframe (or vice versa);
- computes VFI without complete OHLC and volume;
- claims the logarithmic Fibonacci formula is a raw-price standard-deviation formula;
- composes 15-minute data without a daily baseline;
- applies the basis-distance extension twice to Orb 2's radius;
- treats feature availability as statistical confidence;
- calls the DS calculation the licensed real-time ICE DXY value;
- interprets colors, alerts, radius, or animation as a recommendation, valuation, forecast, permission, or trade.

## Appendix B — primary implementation sources

- Dashboard and Market Charts request/cache/view state: `js/apps-good-intelligence.js`
- Bar normalization, VFI, log-space bands, WaveTrend, divergences, alerts: `js/good-intelligence-market-context.js`
- Orb 2 market metrics and geometry: `js/good-intelligence-orb2.js`
- Daily/15-minute composition and freshness: `worker/orb2-composition.mjs`
- Shared WaveTrend/FBB extension: `js/market-extension.js`
- Dollar Strength validation and formula: `js/good-intelligence-dxy.js`
- Server field/provider routes: `worker/orb2-field.mjs`, `worker/orb2-field-publish.mjs`, `worker/` provider adapters
