# Script 03 — Fibonacci Bollinger Bands [Harshal] (Pine v6)

> [!NOTE]
> **User-supplied source, transcribed below.** This is the Pine v6 code you provided in this
> conversation, not a reconstruction. No source URL or publication date was supplied.
> The title attributes it to Harshal. No standalone `.pine` file is stored; the complete
> source is kept in this Markdown code block.

## Provenance

| Field | Value |
| :--- | :--- |
| Pine title | `Fibonacci Bollinger Bands [Harshal]` |
| Short title | `FBB++` |
| Pine version | v6 |
| Source | User-provided in this conversation; external URL and publication date not supplied |
| Author attribution | `Harshal` (as stated in the title) |
| Overlay | `true` — plots on the price chart |
| JS relationship | Partial shared calculation in `computeBands()` in `js/good-intelligence-market-context.js`; there is no separate standalone FBB evaluator, and parity is unverified |

## Inputs

`length`, `src`, `mult`, and `ma_type` map to the corresponding shared band parameters in
the JS market-context port. The visual fill option is not represented there.

| Pine input | Type | Pine default | Constraints declared by Pine | JS field |
| :--- | :--- | :--- | :--- | :--- |
| `length` | int | `200` | min 1 | `bandLen` |
| `src` | source | `"hlc3"` | source selector | `bandSrc` |
| `mult` | float | `3.0` | min 0.001, max 50.0, step 0.1 | `bandMult` |
| `ma_type` | string | `"VWMA"` | VWMA, SMA, EMA, WMA, RMA | `bandMa` |
| `show_fills` | bool | `true` | — | — |

## Calculation and events

The basis is selected by `calc_ma()`. For VWMA, this script uses `volume > 0` on the current
bar to decide whether to use `ta.vwma()` or fall back to `ta.sma()`; the other choices are
SMA, EMA, WMA, and RMA, with SMA as the fallback branch. Deviation is
`mult * ta.stdev(src, length)`.

The source defines six upper and six lower offsets from the basis:

| Ratio | Upper | Lower |
| :--- | :--- | :--- |
| 0.236 | `basis + 0.236 * dev` | `basis - 0.236 * dev` |
| 0.382 | `basis + 0.382 * dev` | `basis - 0.382 * dev` |
| 0.500 | `basis + 0.500 * dev` | `basis - 0.500 * dev` |
| 0.618 | `basis + 0.618 * dev` | `basis - 0.618 * dev` |
| 0.764 | `basis + 0.764 * dev` | `basis - 0.764 * dev` |
| 1.000 | `basis + dev` | `basis - dev` |

Optional fill zones highlight the 0.382–0.618 golden pocket and the 0.764–1.000 outer
extreme. The source also declares alerts for close crossing the outer bands and for close
crossing the basis.

## Port differences to keep in view

The shared JS `computeBands()` calculates the basis and the 0.382, 0.618, 0.764, and 1.000
levels. It does **not** expose the 0.236 or 0.500 lines, Pine's visual styling/fills, or this
standalone script's basis-cross alert. The merged VFI+Fibonacci port has outer-band break
signals, but that does not make it a port of every standalone FBB output.

The standalone Pine input only declares `length` min 1, while the JS `bandLen` normalizer
caps it at 2000. The JS source selector is limited to its six supported values. Its
moving-average helper also uses its own VWMA fallback and warm-up rules. Compare the supplied source runtime
output bar-for-bar before calling this a parity port.

## Source (verbatim transcription)

```pine
//@version=6
indicator("Fibonacci Bollinger Bands [Harshal]", shorttitle="FBB++", overlay=true)

// ==========================================
// Inputs
// ==========================================
var string G_PARAMS = "Band Parameters"
var string G_STYLE  = "Visuals & Fills"

length   = input.int(200, "Length", minval=1, group=G_PARAMS)
src      = input.source(hlc3, "Source", group=G_PARAMS)
mult     = input.float(3.0, "Multiplier", minval=0.001, maxval=50.0, step=0.1, group=G_PARAMS)
ma_type  = input.string("VWMA", "Basis MA Type", options=["VWMA", "SMA", "EMA", "WMA", "RMA"], group=G_PARAMS,
             tooltip="VWMA requires volume data. If trading instruments without volume (e.g. some Forex/Indices), switch to SMA or EMA.")

show_fills = input.bool(true, "Show Fibonacci Zone Fills", group=G_STYLE)

// ==========================================
// Moving Average Selector
// ==========================================
calc_ma(_src, _len, _type) =>
    switch _type
        "VWMA" => volume > 0 ? ta.vwma(_src, _len) : ta.sma(_src, _len) // Fallback to SMA if volume is 0
        "SMA"  => ta.sma(_src, _len)
        "EMA"  => ta.ema(_src, _len)
        "WMA"  => ta.wma(_src, _len)
        "RMA"  => ta.rma(_src, _len)
        => ta.sma(_src, _len)

// ==========================================
// Calculations
// ==========================================
basis = calc_ma(src, length, ma_type)
dev   = mult * ta.stdev(src, length)

upper_1 = basis + (0.236 * dev)
upper_2 = basis + (0.382 * dev)
upper_3 = basis + (0.500 * dev)
upper_4 = basis + (0.618 * dev)
upper_5 = basis + (0.764 * dev)
upper_6 = basis + dev

lower_1 = basis - (0.236 * dev)
lower_2 = basis - (0.382 * dev)
lower_3 = basis - (0.500 * dev)
lower_4 = basis - (0.618 * dev)
lower_5 = basis - (0.764 * dev)
lower_6 = basis - dev

// ==========================================
// Plots
// ==========================================
// Basis
p_basis = plot(basis, title="Basis (Mean)", color=color.new(#e040fb, 0), linewidth=2)

// Upper Bands (Warm / Resistance gradient)
p_u1 = plot(upper_1, title="Upper 0.236", color=color.new(#ffcdd2, 60), linewidth=1)
p_u2 = plot(upper_2, title="Upper 0.382", color=color.new(#ef9a9a, 50), linewidth=1)
p_u3 = plot(upper_3, title="Upper 0.500", color=color.new(#e57373, 40), linewidth=1)
p_u4 = plot(upper_4, title="Upper 0.618", color=color.new(#ef5350, 30), linewidth=1)
p_u5 = plot(upper_5, title="Upper 0.764", color=color.new(#f44336, 20), linewidth=1)
p_u6 = plot(upper_6, title="Upper 1.000", color=color.new(#b71c1c, 0),  linewidth=2)

// Lower Bands (Cool / Support gradient)
p_l1 = plot(lower_1, title="Lower 0.236", color=color.new(#c8e6c9, 60), linewidth=1)
p_l2 = plot(lower_2, title="Lower 0.382", color=color.new(#a5d6a7, 50), linewidth=1)
p_l3 = plot(lower_3, title="Lower 0.500", color=color.new(#81c784, 40), linewidth=1)
p_l4 = plot(lower_4, title="Lower 0.618", color=color.new(#66bb6a, 30), linewidth=1)
p_l5 = plot(lower_5, title="Lower 0.764", color=color.new(#4caf50, 20), linewidth=1)
p_l6 = plot(lower_6, title="Lower 1.000", color=color.new(#1b5e20, 0),  linewidth=2)

// ==========================================
// Zone Fills (Golden Ratio & Outer Extremes)
// ==========================================
fill_u_golden = show_fills ? color.new(color.red, 88) : na
fill_l_golden = show_fills ? color.new(color.green, 88) : na
fill_u_outer  = show_fills ? color.new(color.red, 78) : na
fill_l_outer  = show_fills ? color.new(color.green, 78) : na

// Highlight key Fibonacci reversal zones (0.382 - 0.618 golden pocket and 0.764 - 1.0 outer extreme)
fill(p_u2, p_u4, color=fill_u_golden, title="Upper Golden Pocket Fill")
fill(p_u5, p_u6, color=fill_u_outer,  title="Upper Extreme Fill")
fill(p_l2, p_l4, color=fill_l_golden, title="Lower Golden Pocket Fill")
fill(p_l5, p_l6, color=fill_l_outer,  title="Lower Extreme Fill")

// ==========================================
// Alert Conditions
// ==========================================
alertcondition(ta.crossover(close, upper_6), title="Price Breaks Above Upper Band", 
               message="FBB++: {{ticker}} crossed above Upper 1.0 Band at {{close}}")
alertcondition(ta.crossunder(close, lower_6), title="Price Breaks Below Lower Band", 
               message="FBB++: {{ticker}} crossed below Lower 1.0 Band at {{close}}")
alertcondition(ta.cross(close, basis), title="Price Crosses Basis", 
               message="FBB++: {{ticker}} crossed Basis Mean at {{close}}")
```
