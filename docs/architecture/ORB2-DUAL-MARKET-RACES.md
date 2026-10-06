# Orb 2 dual market races

**Status:** implemented in the Orb 2 display model; market-stage metadata remains roster-controlled.

## Purpose

Orb 2 treats securities with insufficient mature-market history as a separate **formation / IPO race** rather than forcing them through the established-ticker FBB lane. The two races approach one another visually from opposite directions.

- **Established race:** start on the left, finish on the right. Eligible instruments require usable Fibonacci-band context. Relative progress is derived from the existing display-only composition position when present, otherwise from the instrument's logarithmic FBB position.
- **Formation race:** new IPOs begin on the right and move toward the qualification point on the left. They do not require FBB. Formation progress combines verified daily history accumulation toward the reviewed 60-bar FBB-L60 threshold with currently available dimensionless price/flow/WaveTrend context.
- **Graduation:** availability of `FBB-L60` marks a formation instrument `graduation-ready`. The race does not silently rewrite roster metadata or fabricate `FBB-200`; promotion remains an explicit roster/state transition.

## Data boundary

Missing FBB data never becomes a neutral score and never causes an established company to be relabeled as an IPO. `marketStage` is explicit roster metadata. The current reviewed roster marks `SPCX` as `formation`; all other stock entries default to `established`.

## Visual semantics

Within each lane, `#1` is the instrument closest to that lane's finish according to the lane's own position metric. The established and formation lanes are never compared numerically with one another. The board is display-only: it is not a forecast, trade signal, recommendation, authorization, or permission to act.

## Mathematical boundary

The implementation reuses the existing Orb 2 logarithmic FBB mathematics and daily/15m composition. The formation lane adds only a maturity-oriented observation of available daily bar history; it does not derive or backfill missing FBB values. `FBB-L60` remains experimental analytical context and `FBB-200` remains the reference calculation.
