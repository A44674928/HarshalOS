# Orb 2 topology geometry

**Status:** proposed/implemented display geometry in the Orb 2 topology PR.

## Principle

Orb 2 does not treat a perfect sphere as the live-world container. A perfect sphere is the **IDEAL reference state**: a mathematical condition in which the measured indicator dimensions converge and the topology has no geometric asymmetry.

Live market data is allowed to produce a topology-derived spheroid and locally deformed sub-orbs.

## Spatial pipeline

```
FBB / FBB-L
    ↓
logarithmic price-domain measurement
    ↓
explicit logarithmic spatial bands
    ↓
per-orb band assignment
    ↓
3D topology
    ↓
topology-derived spheroid
    ↓
radius-aware berth separation
    ↓
rendering / annotation
```

The spatial band boundaries expand geometrically rather than linearly:

`R_n = R_0 · r^n`

Each orb's own FBB displacement determines its band and radial berth. FBB-L60 is preferred when its required history is available; FBB-200 remains the reference fallback.

## Local sub-orb geometry

A sub-orb is no longer forced to be a perfect projected circle. Its local axes are derived from the current measured state. Spherical geometry is recovered only when the relevant dimensions converge toward the ideal reference.

This is a visualization property, not an additional market signal.

## Convergence

Orb 2 may expose a **topological convergence** value describing how closely the measured dimensions align with the defined ideal geometry.

High convergence means the current measured state is geometrically coherent. It is **not** a forecast, probability of return, or financial recommendation.

The intended interpretation is:

> A live field becoming more spherical is evidence that the model's measured dimensions are becoming more mutually aligned.

A field becoming less spherical is likewise a representation of increasing measured divergence.

## Radial distance and instability (`js/market-extension.js`)

Radius is already a measurement here: `marketDataPlacement()` derives the logarithmic band from the packet's own FBB displacement, so distance from the centre carries how far the close sits from its basis. The WaveTrend half of the reading was missing from that distance — an orb at the extreme overbought threshold could sit on a settled band radius next to one that was merely far from its basis.

Both market apps now read one measure, `js/market-extension.js`: the **larger** of

- continuous `|wt1|` against the reviewed ±53…±70 thresholds (`obLevel2`/`osLevel2` → `extremeOB`/`extremeOS`, as `js/good-intelligence-market-context.js` defines them), and
- the close's logarithmic distance from the preferred available FBB basis (`FBB-L60`, then `FBB-200`, then the packet's own bands) to its ±1000 envelope,

each normalized to 0…1 where 1 is this repository's own extreme. The further out an orb sits, the more extended its packet is. Distance is a display of instability — not a valuation, a rank, a quote, or a recommendation.

In Orb 2 the basis half **is** the logarithmic band index, so it is not applied a second time. Only the WaveTrend half pushes:

```
wave   = clamp((|wt1| − 53) / (70 − 53), 0, 1)     null when wt1 is missing → no push
radius = clamp(bandGeometry.radius × (0.92 + pressure × 0.12) × (1 + 0.45 × wave), 1.36, 8.5)
```

`WAVE_EXTENSION_PUSH = 0.45` lifts a fully extreme orb about one logarithmic band (ratio 1.45) further out: far enough to read as outside the settled field, not far enough to outrank a genuine multi-band displacement. Everything the topology already guaranteed still holds — a held placeholder keeps its fixed radius `2.12` (no packet, no push), berth separation never changes a market radius, and the Stocks spheroid's inward FBB displacement is untouched.

Fail closed: with no `wt1`, with the module not loaded, or with a packet the measure refuses, there is no push and the placement says why. `topology.extension` reports `{ available, value, wave, basis, driver, zone, push, reason }`, the selected-node panel shows a **Distance from centre** line naming the driver and the lift, and the colour key plus its accessible description state the encoding.

NEO ORB draws the same measure differently — as a separate region beyond all bands (`docs/architecture/NEO-ORB-WEB.md`) — because its band shells are a market-cap convention that must not move. Orb 2's bands are already price-derived, so the push belongs inside its own radius formula. One measure, two honest geometries.

## Scope boundary

This change does not alter:

- the 52-card roster;
- provider routing;
- market-data acquisition;
- FBB mathematics;
- VFI mathematics;
- WaveTrend mathematics;
- force-multiplier calculation;
- beat cadence;
- OCM semantics.

It changes how already-computed observations are composed into display geometry.
