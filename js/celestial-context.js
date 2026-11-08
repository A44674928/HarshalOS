/* Display-only, location-independent celestial context for the UTS watch.
   The Moon event calculation adapts the user-supplied Pine v6 sample; its
   original author/license were not provided. The Sun calculation reports an
   approximate annual apparent solar cycle, not lunar-style phases. */
"use strict";

(() => {
  const DAY_MS = 86_400_000;
  const SYNODIC_MONTH_DAYS = 29.53058868;
  const MIN_YEAR = 1900;
  const MAX_YEAR = 2100;
  const rad = degrees => degrees * Math.PI / 180;
  const deg = radians => radians * 180 / Math.PI;
  const normalizeDegrees = value => ((value % 360) + 360) % 360;

  const MOON_PHASES = Object.freeze([
    Object.freeze({ key: "new-moon", name: "New Moon", glyph: "🌑" }),
    Object.freeze({ key: "waxing-crescent", name: "Waxing Crescent", glyph: "🌒" }),
    Object.freeze({ key: "first-quarter", name: "First Quarter", glyph: "🌓" }),
    Object.freeze({ key: "waxing-gibbous", name: "Waxing Gibbous", glyph: "🌔" }),
    Object.freeze({ key: "full-moon", name: "Full Moon", glyph: "🌕" }),
    Object.freeze({ key: "waning-gibbous", name: "Waning Gibbous", glyph: "🌖" }),
    Object.freeze({ key: "last-quarter", name: "Last Quarter", glyph: "🌗" }),
    Object.freeze({ key: "waning-crescent", name: "Waning Crescent", glyph: "🌘" })
  ]);

  const SOLAR_ARCS = Object.freeze([
    "March equinox → June solstice",
    "June solstice → September equinox",
    "September equinox → December solstice",
    "December solstice → March equinox"
  ]);

  function asDate(value) {
    let date;
    if (value instanceof Date) date = new Date(value.getTime());
    else if (typeof value === "number" || typeof value === "string") date = new Date(value);
    else throw new TypeError("Pass a valid Date, Unix-millisecond number, or date string.");

    if (!Number.isFinite(date.getTime())) throw new TypeError("The celestial-context date is invalid.");
    const year = date.getUTCFullYear();
    if (year < MIN_YEAR || year > MAX_YEAR) {
      throw new RangeError(`Celestial calculations are supported from ${MIN_YEAR} through ${MAX_YEAR} UTC.`);
    }
    return date;
  }

  function dayOfYearUTC(date) {
    const start = Date.UTC(date.getUTCFullYear(), 0, 0);
    const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return Math.floor((current - start) / DAY_MS);
  }

  /* New/full Moon Julian-date polynomial transcribed from the supplied Pine
     algorithm. k advances by 0.5 for each principal phase (new or full). */
  function principalPhaseJulianDay(k) {
    const t = k / 1236.85;
    const t2 = t * t;
    const t3 = t2 * t;
    const anomalySun = rad(359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3);
    const anomalyMoon = rad(306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3);
    const latitudeArgument = rad(21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3);

    const deviation =
      (0.1734 - 0.000393 * t) * Math.sin(anomalySun) +
      0.0021 * Math.sin(2 * anomalySun) -
      0.4068 * Math.sin(anomalyMoon) +
      0.0161 * Math.sin(2 * anomalyMoon) -
      0.0004 * Math.sin(3 * anomalyMoon) +
      0.0104 * Math.sin(2 * latitudeArgument) -
      0.0051 * Math.sin(anomalySun + anomalyMoon) -
      0.0074 * Math.sin(anomalySun - anomalyMoon) +
      0.0004 * Math.sin(2 * latitudeArgument + anomalySun) -
      0.0004 * Math.sin(2 * latitudeArgument - anomalySun) -
      0.0006 * Math.sin(2 * latitudeArgument + anomalyMoon) +
      0.0010 * Math.sin(2 * latitudeArgument - anomalyMoon) +
      0.0005 * Math.sin(anomalySun + 2 * anomalyMoon);

    return 2415020.75933 + 29.53058868 * k + 0.0001178 * t2 - 0.000000155 * t3 +
      0.00033 * Math.sin(rad(166.56) + rad(132.87) * t - rad(0.009173) * t2) + deviation;
  }

  function principalPhaseEvent(k) {
    const julianDay = principalPhaseJulianDay(k);
    const time = Math.round((julianDay - 2440587.5) * 86_400) * 1000;
    const isNew = Math.abs(k - Math.round(k)) < 1e-8;
    return Object.freeze({ k, kind: isNew ? "new" : "full", time });
  }

  function nearbyPrincipalEvents(date) {
    const year = date.getUTCFullYear();
    const kEstimate = (dayOfYearUTC(date) / 364.25 + year - 1900) * 12.3685;
    const firstK = Math.floor(kEstimate) - 2;
    const events = [];
    for (let step = 0; step <= 8; step++) events.push(principalPhaseEvent(firstK + step * 0.5));
    return events.sort((a, b) => a.time - b.time);
  }

  function moonAt(value = new Date()) {
    const date = asDate(value);
    const instant = date.getTime();
    const events = nearbyPrincipalEvents(date);
    const previous = events.filter(event => event.time <= instant);
    const upcoming = events.filter(event => event.time > instant);
    const lastPrincipalEvent = previous.at(-1);
    const nextPrincipalEvent = upcoming[0];
    const lastNewMoon = previous.filter(event => event.kind === "new").at(-1);
    const nextNewMoon = upcoming.find(event => event.kind === "new");
    const lastFullMoon = previous.filter(event => event.kind === "full").at(-1);
    const nextFullMoon = upcoming.find(event => event.kind === "full");

    if (!lastPrincipalEvent || !nextPrincipalEvent || !lastNewMoon || !nextNewMoon || !lastFullMoon || !nextFullMoon) {
      throw new RangeError("The Moon phase estimate could not bracket this date.");
    }

    const lunationMs = nextNewMoon.time - lastNewMoon.time;
    const cycleFraction = Math.max(0, Math.min(0.999999999, (instant - lastNewMoon.time) / lunationMs));
    /* Named principal phases only within about ±0.92 day of the syzygy, so a
       day clearly before/after new Moon reads as a crescent, not "New Moon". */
    const phaseIndex = Math.floor((cycleFraction + 0.03125) * 8) % 8;
    const phase = MOON_PHASES[phaseIndex];
    const illuminationFraction = (1 - Math.cos(2 * Math.PI * cycleFraction)) / 2;
    const ageDays = (instant - lastNewMoon.time) / DAY_MS;
    const trend = cycleFraction < 0.5 ? "waxing" : "waning";

    return Object.freeze({
      at: instant,
      key: phase.key,
      name: phase.name,
      glyph: phase.glyph,
      trend,
      ageDays,
      cycleFraction,
      illuminationFraction,
      illuminationPercent: Math.round(illuminationFraction * 1000) / 10,
      lunationDays: lunationMs / DAY_MS,
      lastPrincipalEvent,
      nextPrincipalEvent,
      lastNewMoon,
      nextNewMoon,
      lastFullMoon,
      nextFullMoon,
      method: "Approximate geocentric principal-phase polynomial; no observer location required."
    });
  }

  /* Approximate apparent geocentric solar position. This is an annual orbital
     context for the Sun, not a lunar-style phase or an 11-year activity forecast. */
  function sunAt(value = new Date()) {
    const date = asDate(value);
    const julianDay = date.getTime() / DAY_MS + 2440587.5;
    const centuries = (julianDay - 2451545) / 36525;
    const meanLongitude = normalizeDegrees(280.46646 + centuries * (36000.76983 + 0.0003032 * centuries));
    const meanAnomaly = rad(normalizeDegrees(357.52911 + centuries * (35999.05029 - 0.0001537 * centuries)));
    const eccentricity = 0.016708634 - centuries * (0.000042037 + 0.0000001267 * centuries);
    const equationOfCenter =
      Math.sin(meanAnomaly) * (1.914602 - centuries * (0.004817 + 0.000014 * centuries)) +
      Math.sin(2 * meanAnomaly) * (0.019993 - 0.000101 * centuries) +
      Math.sin(3 * meanAnomaly) * 0.000289;
    const omegaDegrees = 125.04 - 1934.136 * centuries;
    const apparentLongitudeDegrees = normalizeDegrees(
      meanLongitude + equationOfCenter - 0.00569 - 0.00478 * Math.sin(rad(omegaDegrees))
    );
    const meanObliquityArcseconds = 21.448 - centuries * (46.815 + centuries * (0.00059 - centuries * 0.001813));
    const meanObliquityDegrees = 23 + (26 + meanObliquityArcseconds / 60) / 60;
    const obliquity = rad(meanObliquityDegrees + 0.00256 * Math.cos(rad(omegaDegrees)));
    const longitude = rad(apparentLongitudeDegrees);
    const declinationDegrees = deg(Math.asin(Math.sin(obliquity) * Math.sin(longitude)));
    const rightAscensionDegrees = normalizeDegrees(deg(Math.atan2(Math.cos(obliquity) * Math.sin(longitude), Math.cos(longitude))));
    const y = Math.tan(obliquity / 2) ** 2;
    const equationOfTimeMinutes = 4 * deg(
      y * Math.sin(2 * rad(meanLongitude)) -
      2 * eccentricity * Math.sin(meanAnomaly) +
      4 * eccentricity * y * Math.sin(meanAnomaly) * Math.cos(2 * rad(meanLongitude)) -
      0.5 * y * y * Math.sin(4 * rad(meanLongitude)) -
      1.25 * eccentricity * eccentricity * Math.sin(2 * meanAnomaly)
    );
    const annualArc = SOLAR_ARCS[Math.floor(apparentLongitudeDegrees / 90) % 4];

    return Object.freeze({
      at: date.getTime(),
      apparentLongitudeDegrees,
      declinationDegrees,
      rightAscensionDegrees,
      equationOfTimeMinutes,
      annualArc,
      method: "Approximate geocentric apparent solar longitude and declination; no observer location required."
    });
  }

  window.HOSCelestialContext = Object.freeze({
    VERSION: "celestial-context-v1",
    MIN_YEAR,
    MAX_YEAR,
    SYNODIC_MONTH_DAYS,
    moonAt,
    sunAt
  });
})();
