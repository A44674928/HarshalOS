# Celestial Context for UTS and OCM

**Status:** implemented as approximate, read-only browser display context. This adds no new
invariant or authority source. The OCM Sun and Moon entries open the UTS app; they do not
represent a full solar-system model.

## The Sun is not a Moon phase

The Sun does **not** have waxing/waning or new/full phases as seen from Earth. The Moon's
visible phase depends on the geometry between the Sun, Earth, and Moon; the Sun is the
illuminating source. For this demonstration the Sun is represented by its **annual apparent
position cycle**: approximate apparent ecliptic longitude, declination, and a seasonal arc
(equinox to solstice, solstice to equinox). It is not a solar-activity forecast.

The annual apparent solar cycle is calculable without an observer location. Sunrise, sunset,
local solar time, horizon visibility, and twilight require location and additional conventions
such as elevation, time zone, refraction, and horizon. None of those are calculated here. The
UTS panel explicitly says so. The calculation also does not observe sunspots, flares, or space
weather.

The Moon readout reports an estimated principal phase (eight conventional phase names), phase
age, and idealized illuminated fraction. Moon phase and approximate geocentric illumination do
not require a location; whether the Moon is above a particular horizon or visible through local
weather does.

## Implementation

- Module: `js/celestial-context.js`, exposed as `window.HOSCelestialContext`.
- UTS presentation: `js/uts.js`, `js/apps-uts.js`, and `css/uts.css`; a compact readout is also
  shown in the Home Screen clock/calendar widget.
- OCM nodes are registered in `js/ocm-data.js` and open the existing UTS application:

  | Body | Address | Degree | Existing OCM meaning |
  | :--- | :--- | ---: | :--- |
  | Sun | `0•009•000•0013•SUN` | 9 | Stellar influence and radiation |
  | Moon | `0•163•000•0014•MOON` | 163 | Lunar presence |

  Their OCM radii describe system coupling/scope only—not astronomical distances. No other
  bodies are modeled.

### Moon calculation and provenance

`moonAt(date)` adapts the Julian-date polynomial from the archived source at
[`scripts/pine/04-moon-phases.md`](../../scripts/pine/04-moon-phases.md). You explicitly said
the supplied Pine script is not yours. Its original author, source URL, publication date, and
license were not provided; the repository records that uncertainty and makes no authorship or
license claim.

The Pine source locates principal new/full Moon events and labels waxing/waning intervals. The
JavaScript adaptation uses the same family of approximate principal-event calculation, then
adds eight phase names and a sinusoidal illumination estimate based on phase age. Those added
fields are an educational display approximation, **not fields in the Pine source** and not an
ephemeris-quality observation. It accepts a UTC-normalized JavaScript `Date`, Unix-millisecond
number, or date string rather than a chart bar; the Pine script's monthly-timeframe error has no
meaning in this UTS context.

### Sun calculation

`sunAt(date)` computes approximate geocentric apparent solar ecliptic longitude, equatorial
declination, right ascension, and equation of time with a compact annual-position model. It
then names one of four broad equinox/solstice arcs from ecliptic longitude. This is not the
Earth–Moon–Sun geometry needed for lunar phase and must not be called a solar phase.

## API contract

Both functions accept the same supported date forms and reject invalid input. UTC years
**1900–2100** are supported; dates outside that range throw. Returned objects are frozen.

- `moonAt(date)` returns `at`, phase `key`/`name`/`glyph`, `trend`, `ageDays`, `cycleFraction`,
  `illuminationFraction`/`illuminationPercent`, `lunationDays`, preceding/next principal-event
  objects, preceding/next new- and full-Moon event objects, and a method caveat.
- `sunAt(date)` returns `at`, `apparentLongitudeDegrees`, `declinationDegrees`,
  `rightAscensionDegrees`, `equationOfTimeMinutes`, `annualArc`, and a method caveat.

The calculations use the browser's supplied date/time only; they do not establish trusted time.
They make no identity, authorization, continuity, accountability, legitimacy, or permission
claim, and are never an action signal. They do not fetch remote data, require an API key, or
write state.

## Verification and limits

`tests/celestial-context-test.mjs` checks the public API, input bounds, Moon new/full event
estimates against known 2024 syzygy timestamps, all eight phase-name regions, idealized
illumination endpoints, and Sun equinox/solstice longitude and declination behavior. The desktop
suite verifies the UTS and Home Screen render the readouts and preserve the location/authority
caveats.

These fixtures validate the implementation's basic behavior; they do **not** establish a
published accuracy bound across 1900–2100, prove exact ephemeris parity, or validate local
visibility. Values should be displayed as estimates, not used for navigation, observation
planning, science-grade work, finance, safety, authority, or automated decisions. Use a
recognized ephemeris and a location-aware calculation when those functions are needed.
