# Script 02 — LAZY WaveTrend Context Engine [Pro] (Pine v6)

> [!NOTE]
> **User-supplied source, transcribed below.** This is the Pine v6 code you provided in this
> conversation, not a reconstruction. No TradingView URL, publication date, or author metadata
> beyond the script title was supplied. No standalone `.pine` file is stored; the complete
> source is kept in this Markdown code block.

## Provenance

| Field | Value |
| :--- | :--- |
| Pine title | `LAZY - WaveTrend Context Engine [Pro]` |
| Short title | `LAZY Pro` |
| Pine version | v6 |
| Source | User-provided in this conversation; external URL and publication date not supplied |
| Overlay | `false` — oscillator pane |
| JS relationship | The core calculation and some event concepts overlap `computeWaveTrend()`, `mapHigherTimeframe()`, and `divergenceEvents()` in `js/good-intelligence-market-context.js`; behavior is not one-to-one and parity is unverified |

## Inputs

The JS mapping column identifies supported analysis parameters only. A dash means the current
port has no matching Pine visual setting. The Pine source does **not** expose a confirmed-bar
input; the JS market-context port separately has a `confirmClose` parameter.

| Pine input | Type | Pine default | Constraints declared by Pine | JS field |
| :--- | :--- | :--- | :--- | :--- |
| `src` | source | `"hlc3"` | TradingView source selector | `wtSrc` |
| `channelLength` | int | `10` | min 1; no max declared | `channelLength` |
| `averageLength` | int | `21` | min 1; no max declared | `averageLength` |
| `signalLength` | int | `4` | min 1; no max declared | `signalLength` |
| `useCustomTF` | bool | `false` | — | `useCustomTF` |
| `customTF` | timeframe | `"60"` | TradingView timeframe string | `customTF` |
| `extremeOB` | float | `70.0` | — | `extremeOB` |
| `obLevel1` | float | `60.0` | — | `obLevel1` |
| `obLevel2` | float | `53.0` | — | `obLevel2` |
| `osLevel2` | float | `-53.0` | — | `osLevel2` |
| `osLevel1` | float | `-60.0` | — | `osLevel1` |
| `extremeOS` | float | `-70.0` | — | `extremeOS` |
| `showRegDiv` | bool | `true` | — | `showRegDiv` |
| `showHidDiv` | bool | `false` | — | `showHidDiv` |
| `divLookback` | int | `5` | min 2, max 20 | `divLookback` |
| `showCloud` | bool | `true` | — | — |
| `showHisto` | bool | `true` | — | — |
| `showCrosses` | bool | `true` | — | — |
| `showExtremes` | bool | `true` | — | — |
| `barColorMode` | string | `"Off"` | Off, Cross Only, Trend Bias, Extremes Only | — |

## Calculation and behavior

### WaveTrend core

For configured source `src`, the source calculates:

1. `esa = ta.ema(src, channelLength)`
2. `d = ta.ema(math.abs(src - esa), channelLength)`
3. `ci = d != 0.0 ? (src - esa) / (0.015 * d) : 0.0`
4. `wt1 = ta.ema(ci, averageLength)`
5. `wt2 = ta.sma(wt1, signalLength)`

`diff = wt1 - wt2` drives the optional momentum histogram.

### Higher-timeframe selection

When `useCustomTF` is enabled, each line is requested with `request.security()` and
`barmerge.gaps_off`. The requested expression is indexed by
`barstate.isrealtime ? 1 : 0`: real-time bars request the previous value, while historical
bars request the current value. This exact source behavior is not the same contract as the JS
port's mapping of supplied, confirmed higher-timeframe candles; it needs TradingView parity
testing before the two can be treated as interchangeable.

### Crosses and extreme events

- `bullCross` / `bearCross` are WT1/WT2 crossovers/crossunders.
- `zeroCrossUp` / `zeroCrossDn` are WT1 crossings of zero.
- `bullExtreme` requires a bullish cross with `wt1 <= extremeOS`.
- `bearExtreme` requires a bearish cross with `wt1 >= extremeOB`.

The display switches control the histogram, cloud, cross markers, extreme shapes, and
bar-color mode. They do not change the core WaveTrend calculations.

### Divergence behavior in the supplied source

Pine confirms `pLo` and `pHi` after `divLookback` bars on each side. The regular-divergence
blocks update `prev_wt_low` / `prev_wt_high` as soon as a pivot is found. The later hidden
checks compare the current pivot against those just-updated values, so `hidBull` and `hidBear`
compare a value with itself and remain false whenever a pivot exists. This is the behavior of
the supplied source as written; it differs from the JS port's hidden-divergence ordering.

`showRegDiv` is used on the regular-divergence plot calls, not on the `regBull` / `regBear`
calculations or their alert conditions. `showHidDiv` gates the hidden calculations and plots;
there are no hidden-divergence alert conditions in this source.

### Alerts

| Alert title | Condition |
| :--- | :--- |
| `Bullish Cross` | `bullCross` |
| `Bearish Cross` | `bearCross` |
| `Extreme Bull Reversal` | `bullExtreme` |
| `Extreme Bear Reversal` | `bearExtreme` |
| `Regular Bullish Div` | `regBull` |
| `Regular Bearish Div` | `regBear` |
| `Zero-Line Cross Up` | `zeroCrossUp` |
| `Zero-Line Cross Down` | `zeroCrossDn` |

No `confirmClose` input or explicit `barstate.isconfirmed` alert gate appears in this script.

## Port differences to keep in view

- The source input is named `src`; the JS parameter is named `wtSrc`.
- Pine's real-time/historical `request.security()` expression and the JS port's confirmed-HTF
  input mapping require separate parity tests.
- The supplied Pine source's update-before-hidden-check ordering suppresses hidden
  divergences. The JS port evaluates hidden divergence against the prior pivot before
  replacing it; that is a behavior difference, not a transcription detail.
- The JS port does not expose `showCloud`, `showHisto`, `showCrosses`, `showExtremes`, or
  `barColorMode` as settings. It also applies its own `confirmClose` gate, which is absent
  from this Pine source.
- Pine does not declare maximum values for the three core lengths; the JS parameter
  normalizer caps them at 500. Pine also leaves the six zone thresholds unconstrained, while
  JS clamps them to −500…500; the JS source selector is limited to its six supported values,
  and its `customTF` text is capped at 12 characters.
- Identical formulas do not establish identical EMA/SMA seeding, pivot ties, gaps, or
  historical/realtime behavior. TradingView bar-for-bar parity has not been established.

## Source (verbatim transcription)

```pine
//@version=6
indicator("LAZY - WaveTrend Context Engine [Pro]", shorttitle="LAZY Pro", overlay=false)

// ═════════════════════════════════════════════════════════════
// INPUTS
// ═════════════════════════════════════════════════════════════

var string G_WT     = "WaveTrend Core"
var string G_MTF    = "Timeframe"
var string G_ZONES  = "Zones & Thresholds"
var string G_DIV    = "Divergence Engine"
var string G_DISP   = "Display & Visuals"

// --- WaveTrend Core ---
src           = input.source(hlc3, "Source", group=G_WT)
channelLength = input.int(10, "Channel Length", minval=1, group=G_WT)
averageLength = input.int(21, "Average Length", minval=1, group=G_WT)
signalLength  = input.int(4,  "Signal Length",  minval=1, group=G_WT)

// --- Timeframe ---
useCustomTF   = input.bool(false, "Use Higher Timeframe", group=G_MTF)
customTF      = input.timeframe("60", "Higher Timeframe", group=G_MTF)

// --- Zones ---
extremeOB     = input.float(70.0,  "Extreme Overbought", group=G_ZONES)
obLevel1      = input.float(60.0,  "Overbought Level 1", group=G_ZONES)
obLevel2      = input.float(53.0,  "Overbought Level 2", group=G_ZONES)
osLevel2      = input.float(-53.0, "Oversold Level 2",   group=G_ZONES)
osLevel1      = input.float(-60.0, "Oversold Level 1",   group=G_ZONES)
extremeOS     = input.float(-70.0, "Extreme Oversold",   group=G_ZONES)

// --- Divergences ---
showRegDiv    = input.bool(true,  "Show Regular Divergences", group=G_DIV)
showHidDiv    = input.bool(false, "Show Hidden Divergences",  group=G_DIV)
divLookback   = input.int(5,      "Pivot Lookback",           minval=2, maxval=20, group=G_DIV)

// --- Visual Options ---
showCloud     = input.bool(true,         "Show WT Ribbon Cloud",        group=G_DISP)
showHisto     = input.bool(true,         "Show 4-Color Momentum Histo", group=G_DISP)
showCrosses   = input.bool(true,         "Show Cross Markers",          group=G_DISP)
showExtremes  = input.bool(true,         "Show Extreme Cross Arrows",   group=G_DISP)
barColorMode  = input.string("Off",      "Bar Coloring Mode",           options=["Off", "Cross Only", "Trend Bias", "Extremes Only"], group=G_DISP)


// ═════════════════════════════════════════════════════════════
// CORE CALCULATION ENGINE
// ═════════════════════════════════════════════════════════════

calc_wavetrend(_src, _chLen, _avgLen, _sigLen) =>
    esa = ta.ema(_src, _chLen)
    d   = ta.ema(math.abs(_src - esa), _chLen)
    ci  = d != 0.0 ? (_src - esa) / (0.015 * d) : 0.0
    tci = ta.ema(ci, _avgLen)
    w1  = tci
    w2  = ta.sma(w1, _sigLen)
    [w1, w2]

// Multi-Timeframe security resolution with repainting prevention
[raw_wt1, raw_wt2] = calc_wavetrend(src, channelLength, averageLength, signalLength)

wt1 = useCustomTF ? request.security(syminfo.tickerid, customTF, raw_wt1[barstate.isrealtime ? 1 : 0], gaps=barmerge.gaps_off) : raw_wt1
wt2 = useCustomTF ? request.security(syminfo.tickerid, customTF, raw_wt2[barstate.isrealtime ? 1 : 0], gaps=barmerge.gaps_off) : raw_wt2

diff = wt1 - wt2


// ═════════════════════════════════════════════════════════════
// SIGNALS & CONTEXT
// ═════════════════════════════════════════════════════════════

bullCross   = ta.crossover(wt1, wt2)
bearCross   = ta.crossunder(wt1, wt2)
zeroCrossUp = ta.crossover(wt1, 0)
zeroCrossDn = ta.crossunder(wt1, 0)

bullExtreme = bullCross and wt1 <= extremeOS
bearExtreme = bearCross and wt1 >= extremeOB


// ═════════════════════════════════════════════════════════════
// DIVERGENCE ENGINE
// ═════════════════════════════════════════════════════════════

// Find swing highs and lows in WT1
pLo = ta.pivotlow(wt1, divLookback, divLookback)
pHi = ta.pivothigh(wt1, divLookback, divLookback)

// Regular Bullish: Price Lower Low, Oscillator Higher Low
var float prev_wt_low = na
var float prev_pr_low = na
regBull = false
if not na(pLo)
    if wt1[divLookback] > prev_wt_low and low[divLookback] < prev_pr_low and prev_wt_low < osLevel2
        regBull := true
    prev_wt_low := wt1[divLookback]
    prev_pr_low := low[divLookback]

// Regular Bearish: Price Higher High, Oscillator Lower High
var float prev_wt_high = na
var float prev_pr_high = na
regBear = false
if not na(pHi)
    if wt1[divLookback] < prev_wt_high and high[divLookback] > prev_pr_high and prev_wt_high > obLevel2
        regBear := true
    prev_wt_high := wt1[divLookback]
    prev_pr_high := high[divLookback]

// Hidden Bullish: Price Higher Low, Oscillator Lower Low (Trend continuation)
hidBull = false
if not na(pLo) and showHidDiv
    if wt1[divLookback] < prev_wt_low and low[divLookback] > prev_pr_low
        hidBull := true

// Hidden Bearish: Price Lower High, Oscillator Higher High
hidBear = false
if not na(pHi) and showHidDiv
    if wt1[divLookback] > prev_wt_high and high[divLookback] < prev_pr_high
        hidBear := true


// ═════════════════════════════════════════════════════════════
// VISUAL RENDERING
// ═════════════════════════════════════════════════════════════

// Threshold Lines
h_zero = hline(0, "Zero Line", color=color.new(color.gray, 60), linestyle=hline.style_dotted)

h_eOB  = hline(extremeOB, "Extreme OB", color=color.new(#f23645, 40), linestyle=hline.style_dashed)
h_ob1  = hline(obLevel1,  "OB 1",       color=color.new(#f23645, 70))
h_ob2  = hline(obLevel2,  "OB 2",       color=color.new(#f23645, 85))

h_os2  = hline(osLevel2,  "OS 2",       color=color.new(#089981, 85))
h_os1  = hline(osLevel1,  "OS 1",       color=color.new(#089981, 70))
h_eOS  = hline(extremeOS, "Extreme OS", color=color.new(#089981, 40), linestyle=hline.style_dashed)

// Zone Fills
fill(h_eOB, h_ob2, color=color.new(#f23645, 92), title="Overbought Reversal Zone")
fill(h_os2, h_eOS, color=color.new(#089981, 92), title="Oversold Reversal Zone")

// 4-Color Momentum Histogram
histoColor = diff >= 0 ? (diff >= diff[1] ? color.new(#089981, 30) : color.new(#089981, 65))
                       : (diff <= diff[1] ? color.new(#f23645, 30) : color.new(#f23645, 65))

plot(showHisto ? diff : na, "Momentum Histogram", color=histoColor, style=plot.style_columns)

// WaveTrend Lines & Ribbon Cloud
p_wt1 = plot(wt1, "WT1", color=color.new(#26a69a, 0), linewidth=2)
p_wt2 = plot(wt2, "WT2", color=color.new(#ef5350, 0), linewidth=1)

cloudColor = showCloud ? (wt1 >= wt2 ? color.new(#26a69a, 82) : color.new(#ef5350, 82)) : na
fill(p_wt1, p_wt2, color=cloudColor, title="Trend Ribbon Cloud")

// Cross Markers
plot(showCrosses and bullCross ? wt2 : na, "Bullish Cross", color=#00e676, style=plot.style_circles, linewidth=3)
plot(showCrosses and bearCross ? wt2 : na, "Bearish Cross", color=#ff1744, style=plot.style_circles, linewidth=3)

// Extreme Setup Shapes
plotshape(showExtremes and bullExtreme ? wt2 - 5 : na, "Extreme Bullish Reversal", style=shape.triangleup,
          location=location.absolute, color=#00e676, size=size.small)
plotshape(showExtremes and bearExtreme ? wt2 + 5 : na, "Extreme Bearish Reversal", style=shape.triangledown,
          location=location.absolute, color=#ff1744, size=size.small)

// Divergence Plots (Plotted on the confirmed pivot bar in history)
plotshape(showRegDiv and regBull ? wt1[divLookback] : na, "Regular Bullish Div", shape.diamond,
          location.absolute, #00e676, offset=-divLookback, size=size.tiny, text="R.Bull", textcolor=#00e676)
plotshape(showRegDiv and regBear ? wt1[divLookback] : na, "Regular Bearish Div", shape.diamond,
          location.absolute, #ff1744, offset=-divLookback, size=size.tiny, text="R.Bear", textcolor=#ff1744)

plotshape(showHidDiv and hidBull ? wt1[divLookback] : na, "Hidden Bullish Div", shape.circle,
          location.absolute, #26a69a, offset=-divLookback, size=size.tiny, text="H.Bull", textcolor=#26a69a)
plotshape(showHidDiv and hidBear ? wt1[divLookback] : na, "Hidden Bearish Div", shape.circle,
          location.absolute, #ef5350, offset=-divLookback, size=size.tiny, text="H.Bear", textcolor=#ef5350)


// ═════════════════════════════════════════════════════════════
// BAR COLORING MODES
// ═════════════════════════════════════════════════════════════

bar_color = switch barColorMode
    "Cross Only"    => bullCross ? #00e676 : bearCross ? #ff1744 : na
    "Trend Bias"    => wt1 >= wt2 ? color.new(#26a69a, 20) : color.new(#ef5350, 20)
    "Extremes Only" => wt1 <= extremeOS ? #00e676 : wt1 >= extremeOB ? #ff1744 : na
    => na

barcolor(bar_color)


// ═════════════════════════════════════════════════════════════
// EXPANDED ALERTS
// ═════════════════════════════════════════════════════════════

alertcondition(bullCross,   "Bullish Cross",         "LAZY Pro: {{ticker}} Bullish WT Cross at {{close}}")
alertcondition(bearCross,   "Bearish Cross",         "LAZY Pro: {{ticker}} Bearish WT Cross at {{close}}")
alertcondition(bullExtreme, "Extreme Bull Reversal", "LAZY Pro: {{ticker}} Extreme Oversold Cross at {{close}}")
alertcondition(bearExtreme, "Extreme Bear Reversal", "LAZY Pro: {{ticker}} Extreme Overbought Cross at {{close}}")
alertcondition(regBull,     "Regular Bullish Div",   "LAZY Pro: {{ticker}} Regular Bullish Divergence detected")
alertcondition(regBear,     "Regular Bearish Div",   "LAZY Pro: {{ticker}} Regular Bearish Divergence detected")
alertcondition(zeroCrossUp, "Zero-Line Cross Up",    "LAZY Pro: {{ticker}} Momentum shifted Positive (Zero Cross Up)")
alertcondition(zeroCrossDn, "Zero-Line Cross Down",  "LAZY Pro: {{ticker}} Momentum shifted Negative (Zero Cross Down)")
```
