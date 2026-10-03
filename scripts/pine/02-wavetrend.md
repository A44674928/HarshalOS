# Script 02 — WaveTrend (Pine v6)

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
| Committed port | `js/good-intelligence-market-context.js` → `computeWaveTrend()`, `mapHigherTimeframe()`, `divergenceEvents()` |
| Port description | `docs/GOOD-INTELLIGENCE-ASSURANCE.md` §"Optional technical market context" |
| Status in this document | `RECONSTRUCTED` |
| Overlay | `false` — oscillator pane |

## Purpose

WaveTrend is a laguerre-style channel oscillator: it measures the price source's deviation
from its own EMA channel, scaled by the mean absolute deviation of that same channel, then
smooths the ratio twice. The result is a bounded-ish oscillator read against six fixed
overbought/oversold levels, with optional higher-timeframe evaluation and pivot divergence
detection.

## Inputs

Defaults and ranges are mirrored 1:1 from `DEFAULTS` and `normalizeParameters()`. The
`confirmClose` gate is documented in
[`01-vfi-fibonacci-bands.md` §Shared gating](01-vfi-fibonacci-bands.md#shared-gating).

| Pine input | Type | Default | Range | JS field | Meaning |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `channelLength` | int | `10` | 1–500 | `channelLength` | EMA length of the channel and of the mean absolute deviation |
| `averageLength` | int | `21` | 1–500 | `averageLength` | EMA length producing `wt1` |
| `signalLength` | int | `4` | 1–500 | `signalLength` | SMA length producing `wt2` |
| `wtSrc` | string | `"hlc3"` | hlc3, hl2, close, open, high, low | `wtSrc` | Price source |
| `useCustomTF` | bool | `false` | — | `useCustomTF` | Evaluate WaveTrend on a higher timeframe instead |
| `customTF` | string | `"60"` | free text, ≤12 chars | `customTF` | Higher timeframe string |
| `extremeOB` | float | `70` | −500–500 | `extremeOB` | Extreme overbought level |
| `obLevel1` | float | `60` | −500–500 | `obLevel1` | Overbought level 1 |
| `obLevel2` | float | `53` | −500–500 | `obLevel2` | Overbought level 2 — also the bearish-divergence qualifier |
| `osLevel2` | float | `-53` | −500–500 | `osLevel2` | Oversold level 2 — also the bullish-divergence qualifier |
| `osLevel1` | float | `-60` | −500–500 | `osLevel1` | Oversold level 1 |
| `extremeOS` | float | `-70` | −500–500 | `extremeOS` | Extreme oversold level |
| `divLookback` | int | `5` | 2–20 | `divLookback` | Pivot confirmation bars on each side |
| `showRegDiv` | bool | `true` | — | `showRegDiv` | Emit regular divergences |
| `showHidDiv` | bool | `false` | — | `showHidDiv` | Evaluate and emit hidden divergences |

Note the two boolean defaults are asymmetric in the port: `showRegDiv` is `input !== false`
(default **on**) while `showHidDiv` is `input === true` (default **off**).

## Mathematics

Let `S[i]` be the configured `wtSrc`.

1. `esa[i] = ema(S, channelLength)`
2. `d[i] = ema(|S − esa|, channelLength)` — the mean absolute deviation of the channel
3. `ci[i] = d[i] == 0 ? 0 : (S[i] − esa[i]) / (0.015 × d[i])`
4. `wt1[i] = ema(ci, averageLength)`
5. `wt2[i] = sma(wt1, signalLength)`

The `0.015` divisor is WaveTrend's conventional scaling constant and is not a user input.

### Zone classification

Evaluated on the last bar's `wt1`, in this order — the first match wins:

| Zone label | Condition |
| :--- | :--- |
| `unknown` | `wt1` is not finite |
| `extreme overbought` | `wt1 >= extremeOB` |
| `overbought · level 1` | `wt1 >= obLevel1` |
| `overbought · level 2` | `wt1 >= obLevel2` |
| `extreme oversold` | `wt1 <= extremeOS` |
| `oversold · level 1` | `wt1 <= osLevel1` |
| `oversold · level 2` | `wt1 <= osLevel2` |
| `neutral zone` | otherwise |

Because the overbought tests run before the oversold ones, a pathological parameter set with
`osLevel2 > obLevel2` will classify as overbought.

### Higher-timeframe mode

When `useCustomTF` is on, WaveTrend is recomputed on `higherTimeframeBars` and mapped back
onto the base series: for each base bar, the value used is the most recent **confirmed**
higher-timeframe bar at or before that base bar's timestamp. In Pine this is the
`request.security(..., barmerge.lookahead_on)` confirmed-HTF idiom.

Three states are reported, and none of them invents data:

| `timeframeStatus` | Meaning |
| :--- | :--- |
| `same-timeframe` | `useCustomTF` off — computed on the base series |
| `confirmed higher timeframe · {customTF}` | HTF bars supplied and used |
| `higher-timeframe candles unavailable` | `useCustomTF` on but no HTF bars supplied — `wt1`/`wt2` are null, no signal fires |

### Divergences

Pivots are confirmed `divLookback` bars after the pivot bar: `wt1[p]` is a **low pivot** when
every other finite value in `[p − divLookback, p + divLookback]` is strictly greater, and a
**high pivot** when every other finite value is strictly less. Detection therefore happens at
index `p + divLookback`.

Comparisons use the **prior** pivot of the same kind, and that pivot is replaced *after* both
the regular and the hidden test are evaluated. The port's comment records why this order
matters: updating the pivot first suppresses the hidden signal entirely.

| Type | Emitted when | Extra qualifier |
| :--- | :--- | :--- |
| `Regular bullish` | `wt` higher low **and** price (`low`) lower low | prior pivot `wt < osLevel2` |
| `Hidden bullish` | `wt` lower low **and** price (`low`) higher low | `showHidDiv` on |
| `Regular bearish` | `wt` lower high **and** price (`high`) higher high | prior pivot `wt > obLevel2` |
| `Hidden bearish` | `wt` higher high **and** price (`high`) lower high | `showHidDiv` on |

Only the last eight events are retained. An event is reported only if it was detected before
the last bar, or the last bar is confirmed. `recentDivergences` then filters to regular
events when `showRegDiv` and hidden events when `showHidDiv`.

## Signals

All require `wt1` and `wt2` to be finite on both the last and the prior bar (`waveReady`), and
`confirmClose` when enabled.

| Alert label | Condition |
| :--- | :--- |
| `WaveTrend bullish cross` | `ta.crossover(wt1, wt2)` |
| `WaveTrend bearish cross` | `ta.crossunder(wt1, wt2)` |
| `WaveTrend zero-line cross up` | `ta.crossover(wt1, 0)` |
| `WaveTrend zero-line cross down` | `ta.crossunder(wt1, 0)` |
| `WaveTrend extreme bullish reversal` | bullish cross **and** `wt1 <= extremeOS` |
| `WaveTrend extreme bearish reversal` | bearish cross **and** `wt1 >= extremeOB` |
| `{type} WaveTrend divergence` | one label per divergence detected on the last bar |

## Reconstructed source

```pine
//@version=6
// ══════════════════════════════════════════════════════════════════════════
//  RECONSTRUCTED — NOT THE SUPPLIED ORIGINAL.
//  Reverse-engineered from js/good-intelligence-market-context.js
//  (computeWaveTrend / mapHigherTimeframe / divergenceEvents).
//  Verify against your original before use.
// ══════════════════════════════════════════════════════════════════════════
indicator("WaveTrend [HarshalOS reconstruction]", "WT", overlay = false, max_bars_back = 5000)

// ── Inputs ────────────────────────────────────────────────────────────────
grpW = "WaveTrend"
channelLength = input.int(10, "Channel length", minval = 1, maxval = 500, group = grpW)
averageLength = input.int(21, "Average length", minval = 1, maxval = 500, group = grpW)
signalLength  = input.int(4,  "Signal length",  minval = 1, maxval = 500, group = grpW)
wtSrcK        = input.string("hlc3", "Source",  options = ["hlc3", "hl2", "close", "open", "high", "low"], group = grpW)

grpT = "Higher timeframe"
useCustomTF = input.bool(false, "Use higher timeframe", group = grpT)
customTF    = input.timeframe("60", "Higher timeframe", group = grpT)

grpL = "Levels"
extremeOB = input.float( 70, "Extreme overbought", minval = -500, maxval = 500, group = grpL)
obLevel1  = input.float( 60, "Overbought 1",       minval = -500, maxval = 500, group = grpL)
obLevel2  = input.float( 53, "Overbought 2",       minval = -500, maxval = 500, group = grpL)
osLevel2  = input.float(-53, "Oversold 2",         minval = -500, maxval = 500, group = grpL)
osLevel1  = input.float(-60, "Oversold 1",         minval = -500, maxval = 500, group = grpL)
extremeOS = input.float(-70, "Extreme oversold",   minval = -500, maxval = 500, group = grpL)

grpD = "Divergences"
divLookback = input.int(5, "Pivot lookback", minval = 2, maxval = 20, group = grpD)
showRegDiv  = input.bool(true,  "Show regular divergences", group = grpD)
showHidDiv  = input.bool(false, "Show hidden divergences",  group = grpD)

confirmClose = input.bool(true, "Signal only on confirmed bar close")

// ── Core oscillator ───────────────────────────────────────────────────────
src = switch wtSrcK
    "hl2"   => hl2
    "close" => close
    "open"  => open
    "high"  => high
    "low"   => low
    =>         hlc3

esa = ta.ema(src, channelLength)
d   = ta.ema(math.abs(src - esa), channelLength)
ci  = d == 0 ? 0.0 : (src - esa) / (0.015 * d)
wt1 = ta.ema(ci, averageLength)
wt2 = ta.sma(wt1, signalLength)

// ── Optional higher timeframe ─────────────────────────────────────────────
// lookahead_on + gaps_off is the non-repainting confirmed-HTF idiom, which is
// what mapHigherTimeframe() emulates by forward-filling the last confirmed bar.
[htWt1, htWt2] = request.security(syminfo.tickerid, customTF, [wt1, wt2], barmerge.gaps_off, barmerge.lookahead_on)
pWt1 = useCustomTF ? htWt1 : wt1
pWt2 = useCustomTF ? htWt2 : wt2

// ── Signals ───────────────────────────────────────────────────────────────
ok = not confirmClose or barstate.isconfirmed

wtBull     = ta.crossover(pWt1, pWt2)  and ok
wtBear     = ta.crossunder(pWt1, pWt2) and ok
zeroUp     = ta.crossover(pWt1, 0)     and ok
zeroDown   = ta.crossunder(pWt1, 0)    and ok
bullExtreme = wtBull and pWt1 <= extremeOS
bearExtreme = wtBear and pWt1 >= extremeOB

// ── Divergences ───────────────────────────────────────────────────────────
pl = ta.pivotlow(pWt1,  divLookback, divLookback)
ph = ta.pivothigh(pWt1, divLookback, divLookback)

var float prevLowWt  = na
var float prevLowPx  = na
var float prevHighWt = na
var float prevHighPx = na

regBull = false, hidBull = false
regBear = false, hidBear = false

if not na(pl)
    curWt = pWt1[divLookback]
    curPx = low[divLookback]
    if not na(prevLowWt)
        // Evaluate against the prior pivot BEFORE replacing it — replacing it
        // first suppresses the hidden signal (see the port's comment).
        regBull := showRegDiv and curWt > prevLowWt and curPx < prevLowPx and prevLowWt < osLevel2
        hidBull := showHidDiv and curWt < prevLowWt and curPx > prevLowPx
    prevLowWt := curWt
    prevLowPx := curPx

if not na(ph)
    curWt = pWt1[divLookback]
    curPx = high[divLookback]
    if not na(prevHighWt)
        regBear := showRegDiv and curWt < prevHighWt and curPx > prevHighPx and prevHighWt > obLevel2
        hidBear := showHidDiv and curWt > prevHighWt and curPx < prevHighPx
    prevHighWt := curWt
    prevHighPx := curPx

// ── Plots ─────────────────────────────────────────────────────────────────
plot(pWt1, "WT1", color = color.new(color.aqua,   0), linewidth = 2)
plot(pWt2, "WT2", color = color.new(color.orange, 0))

hline(extremeOB, "Extreme OB", color = color.new(color.red,    60))
hline(obLevel1,  "OB 1",       color = color.new(color.red,    78))
hline(obLevel2,  "OB 2",       color = color.new(color.red,    90))
hline(osLevel2,  "OS 2",       color = color.new(color.green,  90))
hline(osLevel1,  "OS 1",       color = color.new(color.green,  78))
hline(extremeOS, "Extreme OS", color = color.new(color.green,  60))
hline(0,         "Zero",       color = color.new(color.gray,   70))

bgcolor(pWt1 > pWt2 ? color.new(color.teal, 92) : color.new(color.maroon, 92))

plotshape(wtBull,      "WaveTrend bullish cross",        shape.triangleup,   location.bottom, color.new(color.green, 0), size = size.tiny)
plotshape(wtBear,      "WaveTrend bearish cross",        shape.triangledown, location.top,    color.new(color.red,   0), size = size.tiny)
plotshape(bullExtreme, "WaveTrend extreme bullish reversal", shape.labelup,   location.bottom, color.new(color.lime,  0), size = size.tiny)
plotshape(bearExtreme, "WaveTrend extreme bearish reversal", shape.labeldown, location.top,    color.new(color.fuchsia, 0), size = size.tiny)
plotshape(regBull,     "Regular bullish WaveTrend divergence", shape.circle,  location.bottom, color.new(color.green, 40), size = size.tiny)
plotshape(hidBull,     "Hidden bullish WaveTrend divergence",  shape.diamond, location.bottom, color.new(color.green, 70), size = size.tiny)
plotshape(regBear,     "Regular bearish WaveTrend divergence", shape.circle,  location.top,    color.new(color.red,   40), size = size.tiny)
plotshape(hidBear,     "Hidden bearish WaveTrend divergence",  shape.diamond, location.top,    color.new(color.red,   70), size = size.tiny)

// ── Alerts ────────────────────────────────────────────────────────────────
alertcondition(wtBull,      "WaveTrend bullish cross",           "WaveTrend bullish cross")
alertcondition(wtBear,      "WaveTrend bearish cross",           "WaveTrend bearish cross")
alertcondition(zeroUp,      "WaveTrend zero-line cross up",      "WaveTrend zero-line cross up")
alertcondition(zeroDown,    "WaveTrend zero-line cross down",    "WaveTrend zero-line cross down")
alertcondition(bullExtreme, "WaveTrend extreme bullish reversal", "WaveTrend extreme bullish reversal")
alertcondition(bearExtreme, "WaveTrend extreme bearish reversal", "WaveTrend extreme bearish reversal")
alertcondition(regBull,     "Regular bullish WaveTrend divergence", "Regular bullish WaveTrend divergence")
alertcondition(hidBull,     "Hidden bullish WaveTrend divergence",  "Hidden bullish WaveTrend divergence")
alertcondition(regBear,     "Regular bearish WaveTrend divergence", "Regular bearish WaveTrend divergence")
alertcondition(hidBear,     "Hidden bearish WaveTrend divergence",  "Hidden bearish WaveTrend divergence")
```

## Port mapping

| Pine construct | JS equivalent in `js/good-intelligence-market-context.js` |
| :--- | :--- |
| `ta.ema(src, channelLength)` | `esa` in `computeWaveTrend()` |
| `ta.ema(math.abs(src - esa), channelLength)` | `distance` — nulls propagate where `esa` is null |
| `(src - esa) / (0.015 * d)` | `ci[]` with an explicit `d === 0 → 0` guard |
| `ta.ema(ci, averageLength)` | `wt1` |
| `ta.sma(wt1, signalLength)` | `wt2` via `rollingMean()` |
| `request.security(..., lookahead_on)` | `mapHigherTimeframe()` — forward-fills the last confirmed HTF bar |
| `ta.pivotlow` / `ta.pivothigh` | `isPivot()` inside `divergenceEvents()` — strict inequalities, non-finite neighbours skipped |
| pivot confirmed `n` bars later | detection loop `for detected = lookback * 2 …`, `pivot = detected − lookback` |
| `barstate.isconfirmed` | `bars[last].confirmed` + the `confirmClose` parameter |

### Known parity gaps

1. **`request.security` semantics.** Pine returns `na` for HTF bars that have not closed;
   the JS port instead forward-fills the last confirmed value and leaves `null` only before
   the first confirmed HTF bar. On sparse feeds these differ for the first few base bars.
2. **Pivot ties.** The port requires strictly greater/less, so a flat pivot is *not* a pivot.
   `ta.pivotlow` in Pine treats ties differently depending on version.
3. **Divergence qualifier uses the prior pivot's level, not the current one.** Any rewrite
   that tests `curWt < osLevel2` instead of `prevLowWt < osLevel2` will not match.
4. **Seeding.** As with Script 01, the EMA seeding differs on the first bars of a chart.
5. **`customTF` is a free string in the port** (≤12 chars, default `"60"`), while Pine
   validates timeframe strings. A malformed value is silently unusable in the port.
