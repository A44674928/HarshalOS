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
