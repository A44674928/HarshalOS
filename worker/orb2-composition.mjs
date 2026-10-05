/*
 * Orb 2 multi-timeframe composition.
 *
 * This module deliberately combines dimensionless, normalized features rather
 * than averaging prices from bars of different widths. A daily observation is
 * the regime/baseline. A closed 15-minute observation is an intraday residual
 * that can move the display-only position, but it cannot replace the baseline.
 *
 * The output is a visualization directive, not a forecast, trade signal, or
 * permission to act. Missing data stays missing and the conservative result is
 * `hold` rather than a neutral value invented by the composer.
 */

export const ORB2_COMPOSITION_SCHEMA = "gi-orb2-scale-composition-v1";
export const ORB2_INTRADAY_INTERVAL = "15m";
export const ORB2_BARS_PER_RTH_DAY = 26;
export const ORB2_INTRADAY_FRESH_MS = 45 * 60_000;
export const ORB2_INTRADAY_STALE_MS = 2 * 60 * 60_000;
export const ORB2_DAILY_WEIGHT = 0.72;
export const ORB2_INTRADAY_WEIGHT = 0.28;
export const ORB2_MAX_FORCE_MULTIPLIER = 1.35;

const finite = value => typeof value === "number" && Number.isFinite(value);
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const signed = value => finite(value) ? clamp(value, -1, 1) : null;
const tanh = value => Number.isFinite(value) ? Math.tanh(value) : null;

/* The same log-space FBB placement used by the browser Orb 2 renderer. This is
   scale-invariant: daily and 15-minute prices are compared inside their own
   bands, never by raw dollars. */
export function normalizedBandPosition(market) {
  const close = Number(market && market.latestBar && market.latestBar.close);
  const basis = Number(market && market.basis);
  const lower = Number(market && market.bands && market.bands.lower1000);
  const upper = Number(market && market.bands && market.bands.upper1000);
  if (![close, basis, lower, upper].every(Number.isFinite) || close <= 0 || basis <= 0 || lower <= 0 ||
      lower >= basis || upper <= basis) return null;
  const logClose = Math.log(close), logBasis = Math.log(basis);
  const halfWidth = logClose >= logBasis ? Math.log(upper) - logBasis : logBasis - Math.log(lower);
  const fullWidth = Math.log(upper) - Math.log(lower);
  if (![logClose, logBasis, halfWidth, fullWidth].every(Number.isFinite) || halfWidth <= 0 || fullWidth <= 0) return null;
  return { p: clamp(0.5 + ((logClose - logBasis) / halfWidth) / 2, -1, 2), logWidth: fullWidth };
}

function metricFromMarket(market) {
  if (!market || typeof market !== "object") return null;
  const band = normalizedBandPosition(market);
  const features = [];
  if (band) features.push({ key: "band", value: clamp((band.p - 0.5) * 2, -1, 1) });
  const change = Number(market.changePct);
  if (Number.isFinite(change)) features.push({ key: "change", value: clamp(Math.tanh(change / 4), -1, 1) });
  const vfi = market.vfi && Number(market.vfi.value);
  const signal = market.vfi && Number(market.vfi.signal);
  if (market.vfi && market.vfi.available === true && Number.isFinite(vfi) && Number.isFinite(signal)) {
    features.push({ key: "flow", value: clamp(Math.tanh((vfi - signal) / 18), -1, 1) });
  }
  const wt1 = market.waveTrend && Number(market.waveTrend.wt1);
  const wt2 = market.waveTrend && Number(market.waveTrend.wt2);
  if (Number.isFinite(wt1) && Number.isFinite(wt2)) {
    features.push({ key: "wave", value: clamp(Math.tanh((wt1 - wt2) / 45), -1, 1) });
  }
  if (!features.length) return null;
  const score = features.reduce((sum, feature) => sum + feature.value, 0) / features.length;
  const quality = features.length / 4;
  return {
    score: clamp(score, -1, 1), quality,
    position: clamp(0.5 + score / 2, 0, 1),
    p: band ? band.p : null,
    logWidth: band ? band.logWidth : null,
    features: Object.fromEntries(features.map(feature => [feature.key, Number(feature.value.toFixed(6))]))
  };
}

function latestBarTime(observation) {
  const value = Number(observation && observation.market && observation.market.latestBar && observation.market.latestBar.time);
  return Number.isFinite(value) ? value : null;
}

function isWeekdayRth(time) {
  if (!finite(time)) return false;
  const date = new Date(time);
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return false;
  const minute = date.getUTCHours() * 60 + date.getUTCMinutes();
  return minute >= 13 * 60 + 30 && minute < 20 * 60;
}

function intradayFreshness(time, now) {
  if (!finite(time) || !finite(now) || time > now + 5 * 60_000) return 0;
  const age = Math.max(0, now - time);
  const freshness = age <= ORB2_INTRADAY_FRESH_MS ? 1 :
    age >= ORB2_INTRADAY_STALE_MS ? 0 : 1 - (age - ORB2_INTRADAY_FRESH_MS) / (ORB2_INTRADAY_STALE_MS - ORB2_INTRADAY_FRESH_MS);
  /* Outside US regular hours, a last RTH close is evidence of the last session,
     not a live intraday position. Decay it rather than treating it as current. */
  return isWeekdayRth(time) ? clamp(freshness, 0, 1) : clamp(freshness * 0.35, 0, 1);
}

function scaleVolatility(logWidth) {
  return finite(logWidth) && logWidth >= 0 ? logWidth * Math.sqrt(ORB2_BARS_PER_RTH_DAY) : null;
}

/**
 * Compose a daily baseline and a 15-minute residual. Either input may be a
 * sanitized field observation or a compact object carrying `{ market }`.
 */
export function composeOrb2Scales({ daily, intraday, now = Date.now() } = {}) {
  const dailyMetric = metricFromMarket(daily && daily.market ? daily.market : daily);
  const intradayMetric = metricFromMarket(intraday && intraday.market ? intraday.market : intraday);
  const dailyTime = latestBarTime(daily && daily.market ? daily : { market: daily });
  const intradayTime = latestBarTime(intraday && intraday.market ? intraday : { market: intraday });
  const base = {
    schema: ORB2_COMPOSITION_SCHEMA,
    baselineInterval: "1d",
    residualInterval: ORB2_INTRADAY_INTERVAL,
    dailyWeight: ORB2_DAILY_WEIGHT,
    intradayWeight: ORB2_INTRADAY_WEIGHT,
    scaleFactorBarsPerDay: ORB2_BARS_PER_RTH_DAY,
    scaleFactorSqrt: Math.sqrt(ORB2_BARS_PER_RTH_DAY),
    dailyBarTime: dailyTime,
    intradayBarTime: intradayTime,
    freshness: 0,
    baselinePosition: dailyMetric ? dailyMetric.position : null,
    intradayPosition: intradayMetric ? intradayMetric.position : null,
    composedPosition: null,
    baselineScore: dailyMetric ? dailyMetric.score : null,
    intradayScore: intradayMetric ? intradayMetric.score : null,
    residual: null,
    forceMultiplier: 1,
    force: null,
    confidence: dailyMetric ? dailyMetric.quality : 0,
    status: "hold",
    reason: "daily-baseline-missing",
    dailyFeatures: dailyMetric ? dailyMetric.features : null,
    intradayFeatures: intradayMetric ? intradayMetric.features : null,
    dailyVolatility: dailyMetric ? dailyMetric.logWidth : null,
    intradayVolatilityDailyEquivalent: intradayMetric ? scaleVolatility(intradayMetric.logWidth) : null,
    note: "Display-only composition; not a forecast, trade, authorization, or permission."
  };
  if (!dailyMetric) return base;
  base.confidence = dailyMetric.quality;
  base.baselinePosition = dailyMetric.position;
  base.baselineScore = dailyMetric.score;
  if (!intradayMetric) {
    base.composedPosition = dailyMetric.position;
    base.force = dailyMetric.score;
    base.status = "baseline-only";
    base.reason = "15m-missing-or-unavailable";
    return base;
  }

  const freshness = intradayFreshness(intradayTime, Number(now));
  if (freshness <= 0) {
    base.freshness = 0;
    base.composedPosition = dailyMetric.position;
    base.force = dailyMetric.score;
    base.status = "baseline-only";
    base.reason = "15m-stale-or-out-of-session";
    return base;
  }
  const weighted = ORB2_DAILY_WEIGHT * dailyMetric.score + ORB2_INTRADAY_WEIGHT * intradayMetric.score * freshness;
  const alignment = dailyMetric.score === 0 || intradayMetric.score === 0
    ? 0 : Math.sign(dailyMetric.score) === Math.sign(intradayMetric.score) ? 1 : -1;
  /* Force multiplication is bounded and only rewards fresh intraday agreement;
     disagreement attenuates it. It never creates force when the baseline is held. */
  const forceMultiplier = clamp(1 + alignment * 0.35 * freshness * Math.abs(intradayMetric.score), 0.65, ORB2_MAX_FORCE_MULTIPLIER);
  const force = clamp(weighted * forceMultiplier, -1, 1);
  base.freshness = freshness;
  base.composedPosition = clamp(0.5 + force / 2, 0, 1);
  base.intradayPosition = intradayMetric.position;
  base.intradayScore = intradayMetric.score;
  base.residual = Number((intradayMetric.score - dailyMetric.score).toFixed(6));
  base.forceMultiplier = Number(forceMultiplier.toFixed(6));
  base.force = Number(force.toFixed(6));
  base.confidence = Number((dailyMetric.quality * (0.72 + 0.28 * intradayMetric.quality * freshness)).toFixed(6));
  base.status = freshness > 0 ? "composed" : "baseline-only";
  base.reason = freshness > 0 ? (alignment > 0 ? "daily-baseline-plus-aligned-15m" : "daily-baseline-plus-divergent-15m") : "15m-stale-or-out-of-session";
  return base;
}

export function sanitizeOrb2Composition(value) {
  if (!value || typeof value !== "object" || value.schema !== ORB2_COMPOSITION_SCHEMA) return null;
  const finiteOrNull = input => Number.isFinite(Number(input)) ? Number(input) : null;
  const status = ["hold", "baseline-only", "composed"].includes(value.status) ? value.status : "hold";
  return {
    schema: ORB2_COMPOSITION_SCHEMA,
    baselineInterval: value.baselineInterval === "1d" ? "1d" : "1d",
    residualInterval: value.residualInterval === ORB2_INTRADAY_INTERVAL ? ORB2_INTRADAY_INTERVAL : ORB2_INTRADAY_INTERVAL,
    dailyWeight: ORB2_DAILY_WEIGHT,
    intradayWeight: ORB2_INTRADAY_WEIGHT,
    scaleFactorBarsPerDay: ORB2_BARS_PER_RTH_DAY,
    scaleFactorSqrt: Math.sqrt(ORB2_BARS_PER_RTH_DAY),
    dailyBarTime: finiteOrNull(value.dailyBarTime),
    intradayBarTime: finiteOrNull(value.intradayBarTime),
    freshness: clamp(Number(value.freshness) || 0, 0, 1),
    baselinePosition: finiteOrNull(value.baselinePosition),
    intradayPosition: finiteOrNull(value.intradayPosition),
    composedPosition: finiteOrNull(value.composedPosition),
    baselineScore: finiteOrNull(value.baselineScore),
    intradayScore: finiteOrNull(value.intradayScore),
    residual: finiteOrNull(value.residual),
    forceMultiplier: clamp(Number(value.forceMultiplier) || 1, 0.65, ORB2_MAX_FORCE_MULTIPLIER),
    force: finiteOrNull(value.force),
    confidence: clamp(Number(value.confidence) || 0, 0, 1),
    status,
    reason: typeof value.reason === "string" ? value.reason.slice(0, 64) : "",
    dailyFeatures: value.dailyFeatures && typeof value.dailyFeatures === "object" ? value.dailyFeatures : null,
    intradayFeatures: value.intradayFeatures && typeof value.intradayFeatures === "object" ? value.intradayFeatures : null,
    dailyVolatility: finiteOrNull(value.dailyVolatility),
    intradayVolatilityDailyEquivalent: finiteOrNull(value.intradayVolatilityDailyEquivalent),
    note: "Display-only composition; not a forecast, trade, authorization, or permission."
  };
}

export function composePair(daily, intraday, now = Date.now()) {
  return composeOrb2Scales({ daily, intraday, now });
}
