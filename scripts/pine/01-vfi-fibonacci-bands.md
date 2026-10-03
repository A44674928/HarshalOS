# Script 01 — VFI + Fibonacci Bands (Pine v6)

> [!NOTE]
> **User-supplied source, transcribed below.** This is the Pine v6 code you provided in this
> conversation, not a reconstruction. No TradingView URL or publication date was supplied.
> The source title/comment attributes it to Harshal. No standalone `.pine` file is stored; the
> complete source is kept in this Markdown code block.

## Provenance

| Field | Value |
| :--- | :--- |
| Pine title | `VFI + Fibonacci Bands [Harshal]` |
| Short title | `VFI_FBB` |
| Pine version | v6 |
| Source | User-provided in this conversation; external URL and publication date not supplied |
| Author attribution | `Harshal` (as stated in the source comment and title) |
| Overlay | `true` — bands render over the price chart; VFI is an internal confluence filter |
| JS relationship | Partial overlap with `computeVfi()`, `computeBands()`, and signal evaluation in `js/good-intelligence-market-context.js`; bar-for-bar parity is unverified |

## Purpose

This overlay combines an internal Volume Flow Indicator (VFI) with Fibonacci Bollinger Bands.
VFI is not plotted as an oscillator pane: it gates the band and flow confluence events. The
visible outputs are the selected band lines/fills and optional break/confluence markers.

## Inputs

The source-facing values and mapping are shown separately from the port's supported range.
A dash in **JS field** means that the current JavaScript port has no corresponding Pine visual
option.

| Pine input | Type | Pine default | Constraints declared by Pine | JS field |
| :--- | :--- | :--- | :--- | :--- |
| `vfiLen` | int | `130` | min 2, max 1000 | `vfiLen` |
| `vfiCoef` | float | `0.2` | min 0.0, step 0.05; no max declared | `vfiCoef` |
| `vfiVcoef` | float | `2.5` | min 0.1, step 0.1; no max declared | `vfiVcoef` |
| `vfiVolLen` | int | `30` | min 2, max 500 | `vfiVolLen` |
| `vfiSignalLen` | int | `5` | min 1, max 500 | `vfiSignalLen` |
| `vfiSmoothLen` | int | `3` | min 1, max 500 | `vfiSmoothLen` |
| `vfiSmooth` | bool | `false` | — | `vfiSmooth` |
| `vfiSmoothType` | string | `"SMA"` | SMA, EMA, WMA | `vfiSmoothType` |
| `bandLen` | int | `200` | min 1, max 2000 | `bandLen` |
| `bandSrc` | source | `"hlc3"` | TradingView source selector | `bandSrc` |
| `bandMult` | float | `3` | min 0.001, max 50.0, step 0.1 | `bandMult` |
| `bandMa` | string | `"VWMA"` | VWMA, SMA, EMA, WMA, RMA | `bandMa` |
| `showBands` | bool | `true` | — | — |
| `showFills` | bool | `true` | — | — |
| `showBreaks` | bool | `true` | — | — |
| `showConfluence` | bool | `true` | — | — |
| `confirmClose` | bool | `true` | — | `confirmClose` |

### Port differences to keep in view

- The supplied Pine inputs do not set a maximum for `vfiCoef` or `vfiVcoef`. The JS
  `normalizeParameters()` clamps them to 10 and 100 respectively; values above those port
  limits therefore do not have the same accepted range.
- The four display switches are Pine-only. The JS evaluator returns analysis data; the
  TradingView-specific fills, plot visibility, and marker styling are not part of its
  parameter contract.
- This script raises a Pine `runtime.error` when cumulative volume is not positive. The JS
  adapter has its own OHLCV validation and does not reproduce TradingView's runtime-error UI.
- Similar formulas are not proof of parity. Moving-average/stdev warm-up, provider candle
  conventions, and real-time bar behavior still need comparison against TradingView.

## Calculation and events

### Volume Flow Indicator

The source computes `typical = hlc3`, replaces missing volume with zero, and requires positive
typical prices on the current and previous bars. Its volatility threshold is
`vfiCoef * ta.stdev(log(typical / typical[1]), vfiVolLen) * close`. Average volume is the
prior-bar SMA, `ta.sma(vol, vfiLen)[1]`; the current bar's contribution is capped by that
average times `vfiVcoef`. Positive/negative typical-price movement beyond the threshold adds
or subtracts the capped volume; otherwise the contribution is zero.

`flowReady` requires `vfiLen` consecutive valid flow bars. The raw VFI is the sum of those
contributions divided by the prior-bar average volume. An optional SMA/EMA/WMA smooth is
applied, followed by the VFI EMA reference line (`vfima`). The script refuses to run if its
volume check finds no positive cumulative volume.

### Fibonacci Bands

The basis uses `bandSrc`, `bandLen`, and `bandMa`; VWMA falls back to SMA when the current
`vol` is not positive or the VWMA result is unavailable. The deviation is
`bandMult * ta.stdev(bandSrc, bandLen)`. This merged script calculates and plots the
0.382, 0.618, 0.764, and 1.000 levels above and below the basis. Unlike the standalone
Fibonacci Bollinger Bands script archived in
[`03-fibonacci-bollinger-bands.md`](03-fibonacci-bollinger-bands.md), it does not define
0.236 or 0.500 lines.

### Confirmation and confluence

`ready` requires the current/previous VFI and reference-line values plus current/previous
basis and deviation values. With `confirmClose=true`, `canSignal` additionally requires
`barstate.isconfirmed`. The individual VFI cross and outer-band break events, and the two
confluence conditions, are gated by `canSignal`.

The six alert conditions are:

| Alert title | Condition |
| :--- | :--- |
| `Confluence VFI Bull` | VFI crosses above its EMA reference line |
| `Confluence VFI Bear` | VFI crosses below its EMA reference line |
| `Confluence Upper Break` | Close crosses above the 1.000 upper band |
| `Confluence Lower Break` | Close crosses below the 1.000 lower band |
| `Bullish Confluence` | Bullish VFI/zero-line flow shift above basis, or upper break with positive VFI at/above its reference line |
| `Bearish Confluence` | Bearish VFI/zero-line flow shift below basis, or lower break with negative VFI at/below its reference line |

These are indicator events only. They do not establish source credibility, claim truth,
authorization, investment advice, or permission to act.

## Source (verbatim transcription)

```pine
//@version=6
// Volume Flow + Fibonacci Bands — merged confluence by Harshal
// Overlay script: Fibonacci Bollinger Bands on price, confirmed by Volume Flow.
// The VFI oscillator is calculated internally and used as a confluence filter;
// add the standalone VFI script separately if you want the oscillator pane.
indicator("VFI + Fibonacci Bands [Harshal]", shorttitle="VFI_FBB", overlay=true, max_bars_back=5000)

// ── Input groups ──────────────────────────────────────────
const string G_VFI = "Volume Flow Filter"
const string G_FBB = "Fibonacci Bands"
const string G_DISP = "Display"
const string G_ALERT = "Signal Confirmation"

vfiLen       = input.int(130, "VFI Length", minval=2, maxval=1000, group=G_VFI)
vfiCoef      = input.float(0.2, "Cutoff Coefficient", minval=0.0, step=0.05, group=G_VFI)
vfiVcoef     = input.float(2.5, "Max Volume Cutoff", minval=0.1, step=0.1, group=G_VFI)
vfiVolLen    = input.int(30, "Volatility Length", minval=2, maxval=500, group=G_VFI)
vfiSignalLen = input.int(5, "Signal EMA Length", minval=1, maxval=500, group=G_VFI)
vfiSmoothLen = input.int(3, "Smoothing Length", minval=1, maxval=500, group=G_VFI)
vfiSmooth    = input.bool(false, "Smooth VFI", group=G_VFI)
vfiSmoothType = input.string("SMA", "Smoothing Method", options=["SMA", "EMA", "WMA"], group=G_VFI)

bandLen  = input.int(200, "Band Length", minval=1, maxval=2000, group=G_FBB)
bandSrc  = input.source(hlc3, "Band Source", group=G_FBB)
bandMult = input.float(3, "Band Multiplier", minval=0.001, maxval=50.0, step=0.1, group=G_FBB)
bandMa   = input.string("VWMA", "Basis MA Type", options=["VWMA", "SMA", "EMA", "WMA", "RMA"], group=G_FBB)

showBands  = input.bool(true, "Show Bands", group=G_DISP)
showFills  = input.bool(true, "Show Fibonacci Zone Fills", group=G_DISP)
showBreaks = input.bool(true, "Show Band Signals", group=G_DISP)
showConfluence = input.bool(true, "Show Confluence Markers", group=G_DISP,
                   tooltip="Diamond markers where a VFI flow shift agrees with price position relative to the basis.")
confirmClose = input.bool(true, "Confirm Signals on Bar Close", group=G_ALERT,
                 tooltip="Waits for bar close before showing markers and triggering alerts.")

// ── Volume Flow (hidden filter) ───────────────────────────
vol = nz(volume, 0.0)
if barstate.islast and ta.cum(vol) <= 0
    runtime.error("The merged script needs volume data for its VFI filter.")

typical = hlc3
validPrice = typical > 0 and typical[1] > 0
inter = validPrice ? math.log(typical / typical[1]) : na
vinter = ta.stdev(inter, vfiVolLen)
cutoff = vfiCoef * vinter * close
vave = ta.sma(vol, vfiLen)[1]
vmax = vave * vfiVcoef
vc = math.min(vol, vmax)
mf = typical - typical[1]
validFlow = validPrice and not na(cutoff) and not na(vave) and vave > 0
vcp = validFlow ? (mf > cutoff ? vc : mf < -cutoff ? -vc : 0.0) : na
flowSum = math.sum(vcp, vfiLen)
flowReady = math.sum(validFlow ? 1.0 : 0.0, vfiLen) == vfiLen
rawVFI = flowReady and not na(vave) and vave > 0 ? flowSum / vave : na
smoothed = switch vfiSmoothType
    "EMA" => ta.ema(rawVFI, vfiSmoothLen)
    "WMA" => ta.wma(rawVFI, vfiSmoothLen)
    => ta.sma(rawVFI, vfiSmoothLen)
vfi = vfiSmooth ? smoothed : rawVFI
vfima = ta.ema(vfi, vfiSignalLen)

// ── Fibonacci bands ───────────────────────────────────────
calcMa(_src, _len, _type) =>
    vwmaRaw = ta.vwma(_src, _len)
    vwmaSafe = vol > 0 and not na(vwmaRaw) ? vwmaRaw : ta.sma(_src, _len)
    switch _type
        "VWMA" => vwmaSafe
        "SMA"  => ta.sma(_src, _len)
        "EMA"  => ta.ema(_src, _len)
        "WMA"  => ta.wma(_src, _len)
        "RMA"  => ta.rma(_src, _len)
        => ta.sma(_src, _len)

basis = calcMa(bandSrc, bandLen, bandMa)
dev = bandMult * ta.stdev(bandSrc, bandLen)
upper6 = basis + dev
lower6 = basis - dev
upper2 = basis + 0.382 * dev
upper4 = basis + 0.618 * dev
upper5 = basis + 0.764 * dev
lower2 = basis - 0.382 * dev
lower4 = basis - 0.618 * dev
lower5 = basis - 0.764 * dev

// ── Confluence logic ──────────────────────────────────────
// A flow shift counts only when price agrees with the basis side,
// or when an outer-band expansion carries positive/negative flow.
rawVfiBull = ta.crossover(vfi, vfima)
rawVfiBear = ta.crossunder(vfi, vfima)
rawZeroUp = ta.crossover(vfi, 0.0)
rawZeroDn = ta.crossunder(vfi, 0.0)
rawUpper = ta.crossover(close, upper6)
rawLower = ta.crossunder(close, lower6)
flowReady2 = not na(vfi) and not na(vfima) and not na(vfi[1]) and not na(vfima[1])
bandReady = not na(basis) and not na(dev) and not na(basis[1])
ready = flowReady2 and bandReady
canSignal = ready and (not confirmClose or barstate.isconfirmed)

vfiBull = rawVfiBull and canSignal
vfiBear = rawVfiBear and canSignal
bandUpper = rawUpper and canSignal
bandLower = rawLower and canSignal
confluenceBull = (((rawVfiBull or rawZeroUp) and close > basis) or (rawUpper and vfi > 0 and vfi >= vfima)) and canSignal
confluenceBear = (((rawVfiBear or rawZeroDn) and close < basis) or (rawLower and vfi < 0 and vfi <= vfima)) and canSignal

// ── Rendering ─────────────────────────────────────────────
// Basis tint follows money flow: teal when VFI is above its signal, rose below.
basisColor = vfi >= vfima ? #54d6b4 : #e87487
plot(showBands ? basis : na, "Basis", color=basisColor, linewidth=2)
pU2 = plot(showBands ? upper2 : na, "Upper 0.382", color=color.new(#ef9a9a, 50), linewidth=1)
pU4 = plot(showBands ? upper4 : na, "Upper 0.618", color=color.new(#ef5350, 30), linewidth=1)
pU5 = plot(showBands ? upper5 : na, "Upper 0.764", color=color.new(#f44336, 20), linewidth=1)
pU6 = plot(showBands ? upper6 : na, "Upper 1.000", color=color.new(#b71c1c, 0), linewidth=2)
pL2 = plot(showBands ? lower2 : na, "Lower 0.382", color=color.new(#a5d6a7, 50), linewidth=1)
pL4 = plot(showBands ? lower4 : na, "Lower 0.618", color=color.new(#66bb6a, 30), linewidth=1)
pL5 = plot(showBands ? lower5 : na, "Lower 0.764", color=color.new(#4caf50, 20), linewidth=1)
pL6 = plot(showBands ? lower6 : na, "Lower 1.000", color=color.new(#1b5e20, 0), linewidth=2)
fill(pU2, pU4, color=showFills ? color.new(color.red, 88) : na, title="Upper Golden Pocket Fill")
fill(pU5, pU6, color=showFills ? color.new(color.red, 78) : na, title="Upper Extreme Fill")
fill(pL2, pL4, color=showFills ? color.new(color.green, 88) : na, title="Lower Golden Pocket Fill")
fill(pL5, pL6, color=showFills ? color.new(color.green, 78) : na, title="Lower Extreme Fill")

plotshape(showBreaks and bandUpper, "Upper Break", style=shape.triangleup, location=location.belowbar, color=#ef5350, size=size.tiny)
plotshape(showBreaks and bandLower, "Lower Break", style=shape.triangledown, location=location.abovebar, color=#66bb6a, size=size.tiny)
plotshape(showConfluence and confluenceBull, "Bullish Confluence", style=shape.diamond, location=location.belowbar, color=#54d6b4, size=size.small)
plotshape(showConfluence and confluenceBear, "Bearish Confluence", style=shape.diamond, location=location.abovebar, color=#e87487, size=size.small)

// ── Alerts ────────────────────────────────────────────────
alertcondition(vfiBull, "Confluence VFI Bull", 'VFI+FBB: {{ticker}} ({{interval}}) VFI bullish crossover.')
alertcondition(vfiBear, "Confluence VFI Bear", 'VFI+FBB: {{ticker}} ({{interval}}) VFI bearish crossover.')
alertcondition(bandUpper, "Confluence Upper Break", 'VFI+FBB: {{ticker}} ({{interval}}) crossed above Upper 1.0 at {{close}}')
alertcondition(bandLower, "Confluence Lower Break", 'VFI+FBB: {{ticker}} ({{interval}}) crossed below Lower 1.0 at {{close}}')
alertcondition(confluenceBull, "Bullish Confluence", 'VFI+FBB: {{ticker}} ({{interval}}) bullish flow + band confluence at {{close}}')
alertcondition(confluenceBear, "Bearish Confluence", 'VFI+FBB: {{ticker}} ({{interval}}) bearish flow + band confluence at {{close}}')
```
