# Script 01 — VFI + Fibonacci Bands (Pine v6)

> [!WARNING]
> **`RECONSTRUCTED` — this Pine block is reverse-engineered from the committed JavaScript
> port at [`js/good-intelligence-market-context.js`](../../js/good-intelligence-market-context.js).
> It is not a transcription of the author's original source, which is not in this repository.**
> Arithmetic, defaults, and signal rules are enforced against the shipped code by
> `tests/pine-scripts-docs-test.mjs`; equivalence with the original on TradingView is
> **unverified**.

## Provenance

| Field | Value |
| :--- | :--- |
| Pine version | v6 |
| Original source | **Not in repository** — supplied out-of-band |
| Committed port | `js/good-intelligence-market-context.js` → `computeVfi()`, `computeBands()` |
| Port description | `docs/GOOD-INTELLIGENCE-ASSURANCE.md` §"Optional technical market context" |
| Status in this document | `RECONSTRUCTED` |
| Overlay | `true` — the bands plot on the price pane; VFI is a separate oscillator |

## Purpose

Two independent studies carried in one script:

- **Volume Flow Indicator (VFI)** — a volume-weighted momentum oscillator. It sums signed,
  volume-capped money flow over a lookback window and normalizes by the prior window's
  average volume, then compares the result to an EMA signal line.
- **Fibonacci Bands** — a Bollinger-style envelope whose basis is a volume-weighted moving
  average and whose deviation is split at the 0.382 / 0.618 / 0.764 / 1.000 Fibonacci ratios
  rather than at integer standard deviations.

They are combined into a **confluence** condition (§Signals) but neither is an execution
signal. In HarshalOS both are *optional price/volume context* only.

## Inputs

Defaults and ranges are mirrored 1:1 from `DEFAULTS` and `normalizeParameters()`. The JS
field column is the key used in `marketContext.parameters`.

| Pine input | Type | Default | Range | JS field | Meaning |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `vfiLen` | int | `130` | 2–1000 | `vfiLen` | VFI summation window and volume-average window |
| `vfiCoef` | float | `0.2` | 0–10 | `vfiCoef` | Noise cutoff, as a multiple of return volatility × close |
| `vfiVcoef` | float | `2.5` | 0.1–100 | `vfiVcoef` | Volume cap, as a multiple of the prior average volume |
| `vfiVolLen` | int | `30` | 2–500 | `vfiVolLen` | Lookback for log-return standard deviation |
| `vfiSignalLen` | int | `5` | 1–500 | `vfiSignalLen` | EMA length of the VFI signal line |
| `vfiSmooth` | bool | `false` | — | `vfiSmooth` | Apply a second smoothing pass to VFI |
| `vfiSmoothLen` | int | `3` | 1–500 | `vfiSmoothLen` | Length of the optional smoothing pass |
| `vfiSmoothType` | string | `"SMA"` | SMA, EMA, WMA | `vfiSmoothType` | Smoothing function for the optional pass |
| `bandLen` | int | `200` | 1–2000 | `bandLen` | Fibonacci band lookback |
| `bandMult` | float | `3` | 0.001–50 | `bandMult` | Standard-deviation multiplier for band deviation |
| `bandMa` | string | `"VWMA"` | VWMA, SMA, EMA, WMA, RMA | `bandMa` | Basis moving-average type |
| `bandSrc` | string | `"hlc3"` | hlc3, hl2, close, open, high, low | `bandSrc` | Price source for the bands |

### Shared gating

| Pine input | Type | Default | Range | JS field | Meaning |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `confirmClose` | bool | `true` | — | `confirmClose` | Withhold every latest-bar signal until the bar is closed |

`confirmClose` is a packet-level gate, not a study parameter: it applies to the VFI, band,
and WaveTrend signals alike, and in Pine terms corresponds to `barstate.isconfirmed`. It is
documented here once and referenced by [`02-wavetrend.md`](02-wavetrend.md).

Out-of-range or malformed values fall back to the default rather than raising — see
`integer()` / `number()` / `enumValue()` in the port.

## Mathematics

### Volume Flow Indicator

Let `T[i] = (high + low + close) / 3` (the typical price) and `V[i]` the bar volume.

1. **Inter-bar log return**
   `inter[i] = ln(T[i] / T[i−1])`, defined only when `T[i] > 0` and `T[i−1] > 0`.
2. **Return volatility** — population standard deviation over `vfiVolLen`:
   `volla[i] = stdev(inter[i−vfiVolLen+1 … i])`.
   The port divides by `n`, not `n−1`.
3. **Volume average** — simple moving average over `vfiLen`: `vave[i] = sma(V, vfiLen)[i]`.
4. **Per-bar signed contribution**, evaluated only when `i > 0`, both typical prices are
   positive, `volla[i]` is finite, and `vave[i−1]` is finite and `> 0`:
   - cutoff `= vfiCoef × volla[i] × close[i]`
   - capped volume `= min(V[i], vave[i−1] × vfiVcoef)`
   - money flow `mf = T[i] − T[i−1]`
   - `contribution[i] = +capped` if `mf > cutoff`; `−capped` if `mf < −cutoff`; else `0`
5. **Raw VFI** — from `i = vfiLen − 1` onward, requiring every bar in the window to be valid:
   `vfiRaw[i] = Σ contribution[i−vfiLen+1 … i] / vave[i−1]`

   Note the divisor is the **previous** bar's volume average (`vave[1]` in Pine), not the
   current bar's. That is the port's behaviour and it is reproduced below.
6. **Optional smoothing** — `vfi = vfiSmooth ? ma(vfiRaw, vfiSmoothLen, vfiSmoothType) : vfiRaw`
7. **Signal line** — `signal = ema(vfi, vfiSignalLen)`. The EMA is seeded on the first
   finite value and is applied to the (possibly smoothed) series.

### Fibonacci Bands

Let `S[i]` be the configured `bandSrc`.

1. `basis[i] = ma(S, bandLen, bandMa)` — with `VWMA` the port volume-weights the window and
   falls back to the SMA when the window's volume sums to zero.
2. `dev[i] = stdev(S, bandLen) × bandMult` (population standard deviation).
3. Eight envelope lines plus the basis:

| Line | Value |
| :--- | :--- |
| `upper1000` | `basis + 1.000 × dev` |
| `upper764` | `basis + 0.764 × dev` |
| `upper618` | `basis + 0.618 × dev` |
| `upper382` | `basis + 0.382 × dev` |
| `basis` | `basis` |
| `lower382` | `basis − 0.382 × dev` |
| `lower618` | `basis − 0.618 × dev` |
| `lower764` | `basis − 0.764 × dev` |
| `lower1000` | `basis − 1.000 × dev` |

A band is `null` until both `basis` and `dev` are finite, i.e. for the first `bandLen − 1` bars.

## Signals

All conditions are evaluated on the **last** bar. Where `confirmClose` is on (the default),
every signal is additionally withheld until the last bar carries `confirmed: true`.

| Alert label | Condition |
| :--- | :--- |
| `VFI bullish crossover` | `ta.crossover(vfi, signal)` |
| `VFI bearish crossover` | `ta.crossunder(vfi, signal)` |
| `Upper Fibonacci-band break` | `ta.crossover(close, upper1000)` |
| `Lower Fibonacci-band break` | `ta.crossunder(close, lower1000)` |
| `Bullish VFI + Fibonacci confluence` | `((bullCross or zeroCrossUp) and close > basis) or (upperBreak and vfi > 0 and vfi >= signal)` |
| `Bearish VFI + Fibonacci confluence` | `((bearCross or zeroCrossDown) and close < basis) or (lowerBreak and vfi < 0 and vfi <= signal)` |

where `zeroCrossUp = ta.crossover(vfi, 0)` and `zeroCrossDown = ta.crossunder(vfi, 0)`.
The zero-line crosses feed the confluence test but are not emitted as standalone alerts by
this script.

## Reconstructed source

```pine
//@version=6
// ══════════════════════════════════════════════════════════════════════════
//  RECONSTRUCTED — NOT THE SUPPLIED ORIGINAL.
//  Reverse-engineered from js/good-intelligence-market-context.js
//  (computeVfi / computeBands). Verify against your original before use.
// ══════════════════════════════════════════════════════════════════════════
indicator("VFI + Fibonacci Bands [HarshalOS reconstruction]", "VFI+FB", overlay = true, max_bars_back = 5000)

// ── Inputs ────────────────────────────────────────────────────────────────
grpV = "Volume Flow Indicator"
vfiLen        = input.int(130,    "VFI length",                 minval = 2,   maxval = 1000, group = grpV)
vfiCoef       = input.float(0.2,  "Cutoff coefficient",         minval = 0,   maxval = 10,   group = grpV)
vfiVcoef      = input.float(2.5,  "Volume cap coefficient",     minval = 0.1, maxval = 100,  group = grpV)
vfiVolLen     = input.int(30,     "Return volatility length",   minval = 2,   maxval = 500,  group = grpV)
vfiSignalLen  = input.int(5,      "Signal length (EMA)",        minval = 1,   maxval = 500,  group = grpV)
vfiSmooth     = input.bool(false, "Smooth VFI",                 group = grpV)
vfiSmoothLen  = input.int(3,      "Smoothing length",           minval = 1,   maxval = 500,  group = grpV)
vfiSmoothType = input.string("SMA", "Smoothing type",           options = ["SMA", "EMA", "WMA"], group = grpV)

grpB = "Fibonacci Bands"
bandLen  = input.int(200,      "Band length",     minval = 1,     maxval = 2000, group = grpB)
bandMult = input.float(3.0,    "Band multiplier", minval = 0.001, maxval = 50,   group = grpB)
bandMa   = input.string("VWMA", "Basis MA type",  options = ["VWMA", "SMA", "EMA", "WMA", "RMA"], group = grpB)
bandSrcK = input.string("hlc3", "Band source",    options = ["hlc3", "hl2", "close", "open", "high", "low"], group = grpB)

confirmClose = input.bool(true, "Signal only on confirmed bar close")

// ── Moving-average helpers ────────────────────────────────────────────────
maOf(x, len, kind) =>
    switch kind
        "EMA"  => ta.ema(x, len)
        "WMA"  => ta.wma(x, len)
        "RMA"  => ta.rma(x, len)
        "VWMA" => ta.vwma(x, len)
        =>        ta.sma(x, len)

smoothOf(x, len, kind) =>
    switch kind
        "EMA" => ta.ema(x, len)
        "WMA" => ta.wma(x, len)
        =>       ta.sma(x, len)

// ── Volume Flow Indicator ─────────────────────────────────────────────────
T      = (high + low + close) / 3
inter  = T > 0 and T[1] > 0 ? math.log(T / T[1]) : na
volla  = ta.stdev(inter, vfiVolLen)
vave   = ta.sma(volume, vfiLen)

cutoff = vfiCoef * volla * close
vCap   = math.min(volume, nz(vave[1]) * vfiVcoef)
mf     = T - T[1]
contrib = mf > cutoff ? vCap : mf < -cutoff ? -vCap : 0.0

vfiRaw = ta.sum(contrib, vfiLen) / nz(vave[1])
vfi    = vfiSmooth ? smoothOf(vfiRaw, vfiSmoothLen, vfiSmoothType) : vfiRaw
signal = ta.ema(vfi, vfiSignalLen)

// ── Fibonacci Bands ───────────────────────────────────────────────────────
bandSrc = switch bandSrcK
    "hl2"   => hl2
    "close" => close
    "open"  => open
    "high"  => high
    "low"   => low
    =>         hlc3

basis = maOf(bandSrc, bandLen, bandMa)
dev   = ta.stdev(bandSrc, bandLen) * bandMult

upper1000 = basis + dev
upper764  = basis + 0.764 * dev
upper618  = basis + 0.618 * dev
upper382  = basis + 0.382 * dev
lower382  = basis - 0.382 * dev
lower618  = basis - 0.618 * dev
lower764  = basis - 0.764 * dev
lower1000 = basis - dev

// ── Signals ───────────────────────────────────────────────────────────────
vfiBull     = ta.crossover(vfi, signal)
vfiBear     = ta.crossunder(vfi, signal)
zeroUp      = ta.crossover(vfi, 0)
zeroDown    = ta.crossunder(vfi, 0)
upperBreak  = ta.crossover(close, upper1000)
lowerBreak  = ta.crossunder(close, lower1000)

confBull = ((vfiBull or zeroUp) and close > basis) or (upperBreak and vfi > 0 and vfi >= signal)
confBear = ((vfiBear or zeroDown) and close < basis) or (lowerBreak and vfi < 0 and vfi <= signal)

// The JS port additionally gates every signal on bar close confirmation.
ok = not confirmClose or barstate.isconfirmed
vfiBullS = vfiBull and ok, vfiBearS = vfiBear and ok
upperBreakS = upperBreak and ok, lowerBreakS = lowerBreak and ok
confBullS = confBull and ok, confBearS = confBear and ok

// ── Plots ─────────────────────────────────────────────────────────────────
plot(basis,     "Basis",      color = color.new(color.gray,   0), linewidth = 2)
plot(upper1000, "Upper 1.000", color = color.new(color.red,    40))
plot(upper764,  "Upper 0.764", color = color.new(color.red,    60))
plot(upper618,  "Upper 0.618", color = color.new(color.red,    75))
plot(upper382,  "Upper 0.382", color = color.new(color.red,    88))
plot(lower382,  "Lower 0.382", color = color.new(color.green,  88))
plot(lower618,  "Lower 0.618", color = color.new(color.green,  75))
plot(lower764,  "Lower 0.764", color = color.new(color.green,  60))
plot(lower1000, "Lower 1.000", color = color.new(color.green,  40))

plotshape(vfiBullS,    "VFI bullish crossover",        shape.triangleup,   location.belowbar, color.new(color.green, 0), size = size.tiny)
plotshape(vfiBearS,    "VFI bearish crossover",        shape.triangledown, location.abovebar, color.new(color.red,   0), size = size.tiny)
plotshape(upperBreakS, "Upper Fibonacci-band break",   shape.circle,       location.abovebar, color.new(color.orange, 0), size = size.tiny)
plotshape(lowerBreakS, "Lower Fibonacci-band break",   shape.circle,       location.belowbar, color.new(color.orange, 0), size = size.tiny)
plotshape(confBullS,   "Bullish VFI + Fibonacci confluence", shape.labelup,   location.belowbar, color.new(color.teal,  0), size = size.tiny)
plotshape(confBearS,   "Bearish VFI + Fibonacci confluence", shape.labeldown, location.abovebar, color.new(color.maroon, 0), size = size.tiny)

// ── Alerts ────────────────────────────────────────────────────────────────
alertcondition(vfiBullS,    "VFI bullish crossover",              "VFI bullish crossover")
alertcondition(vfiBearS,    "VFI bearish crossover",              "VFI bearish crossover")
alertcondition(upperBreakS, "Upper Fibonacci-band break",         "Upper Fibonacci-band break")
alertcondition(lowerBreakS, "Lower Fibonacci-band break",         "Lower Fibonacci-band break")
alertcondition(confBullS,   "Bullish VFI + Fibonacci confluence", "Bullish VFI + Fibonacci confluence")
alertcondition(confBearS,   "Bearish VFI + Fibonacci confluence", "Bearish VFI + Fibonacci confluence")
```

### Note on the VFI oscillator pane

The reconstruction plots the bands on the price pane (`overlay = true`), matching how the
HarshalOS Market Charts tab layers them. `vfi` and `signal` are computed but not plotted
here; in TradingView they belong in a second indicator with `overlay = false`, or use
`force_overlay = false` on a dedicated `plot()`. The port computes both from the same bar
series, so splitting them into two scripts does not change their values.

## Port mapping

| Pine construct | JS equivalent in `js/good-intelligence-market-context.js` |
| :--- | :--- |
| `(high + low + close) / 3` | `typical` in `computeVfi()` |
| `math.log(T / T[1])` | `inter[]` loop |
| `ta.stdev(x, len)` | `rollingStdev()` — population stdev (`/ n`) |
| `ta.sma(x, len)` | `rollingMean()` |
| `ta.ema(x, len)` | `ema()` — `α = 2 / (len + 1)`, seeded on first finite value |
| `ta.wma(x, len)` | `rollingWma()` — weights `1…len`, divisor `len(len+1)/2` |
| `ta.rma(x, len)` | `rma()` — SMA seed then Wilder recursion |
| `ta.vwma(x, len)` | `movingAverage(…, "VWMA", volumes)` with SMA fallback on zero volume |
| `ta.sum(x, len)` | `volumeContribution.slice(start, i + 1).reduce(…)` |
| `nz(vave[1])` | `volumeAverage[i - 1]` |
| `ta.crossover` / `ta.crossunder` | `crossover()` / `crossunder()` — both require four finite values |
| `barstate.isconfirmed` | `bars[last].confirmed` + the `confirmClose` parameter |

### Known parity gaps

`docs/GOOD-INTELLIGENCE-ASSURANCE.md` records that this translation *"has not been
cross-validated bar-for-bar against TradingView."* The specific things to compare first:

1. **Series seeding.** The JS EMA/RMA seed on the first finite value; Pine seeds differently
   on the very first bars of a chart, so the first `~3 × length` bars will differ.
2. **`na` propagation.** Pine's `ta.sum` over a window containing `na` returns `na`; the JS
   port instead requires every bar in the window to be valid and otherwise leaves `null`.
   The result is usually the same, but not for windows that become valid mid-series.
3. **Population vs. sample stdev.** The port divides by `n`. Confirm the original does too.
4. **Provider candle conventions.** Split adjustment, session gaps, and volume units differ
   by feed and change VFI materially.
