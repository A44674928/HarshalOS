# Script 04 — Moon phases (Pine v6)

> [!CAUTION]
> **User-supplied source, transcribed below; third-party provenance.** You said this code is
> not yours. No original author, source URL, publication date, or license was supplied, so this archive
> records the provenance as unknown and does not claim authorship or grant a license. Review
> the original source/license before redistributing it outside this repository.

## Provenance

| Field | Value |
| :--- | :--- |
| Pine title | `Moon phases` |
| Pine version | v6 |
| Source | User-provided in this conversation; original author, URL, date, and license unknown |
| Overlay | `true` — phase markers and a subtle waxing/waning background are drawn on the chart |
| JavaScript adaptation | `js/celestial-context.js` → `moonAt()`; an approximate, display-only adaptation with additional phase names and illumination estimate |

## Inputs

| Pine input | Type | Pine default | Constraints declared by Pine | JS field |
| :--- | :--- | :--- | :--- | :--- |
| `waxingMoonColorInput` | color | `color.blue` | Color picker | — |
| `waningMoonColorInput` | color | `color.white` | Color picker | — |

## What the supplied script calculates

The script estimates principal new/full Moon event times from a Julian-date polynomial. It
selects the preceding principal event, labels the current interval as waxing (`+1`, since new
Moon) or waning (`-1`, since full Moon), plots markers for new/full events, and uses the
selected color as a faint background. It does **not** calculate all eight named lunar phases
or an illumination percentage. It raises a runtime error on monthly chart timeframes.

The JavaScript adaptation in `js/celestial-context.js` preserves the principal-event
calculation and extends it to report eight conventional phase names, an approximate phase-age
fraction, and an idealized illuminated fraction. The JS function takes an absolute date/time
rather than a chart bar/timeframe, uses UTC for calendar calculations, and has no
chart-specific monthly-timeframe restriction. Those additions are labeled estimates; they
are not measurements from an ephemeris or observer location.

## Source (verbatim transcription)

```pine
//@version=6
indicator("Moon phases", overlay = true)

waxingMoonColorInput = input.color(color.blue, "Waxing Moon")
waningMoonColorInput = input.color(color.white, "Waning Moon")

if timeframe.ismonthly   
    runtime.error("Unsupported timeframe.")

dayofyear(_time) =>
    _year = year(_time)
    leapYear = (_year % 400 == 0) or (_year % 4 == 0 and _year % 100 != 0)
    dayCount = array.from(31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
    timeMonth = month(_time)
    dayofyear = 0
    if timeMonth > 1
        for i = 0 to timeMonth - 2
            dayofyear += dayCount.get(i)
    dayofyear + dayofmonth(_time)

getUNIXTimeFromJD(julianDay) =>
    z = math.floor(julianDay + 0.5)
    f = (julianDay + 0.5) % 1
    alpha = math.floor((z - 1867216.25) / 36524.25)
    a = (z < 2299161) ? z : (z + 1 + alpha - math.floor(alpha / 4.0))
    b = a + 1524
    c = math.floor((b - 122.1) / 365.25)
    d = math.floor(365.25 * c)
    e = math.floor((b - d) / 30.6001)
    dayFloat = b - d - math.floor(30.6001 * e) + f
    _day = int(dayFloat)
    _month = (e < 13.5) ? int(e - 1) : int(e - 13)
    _year = (_month > 2.5) ? int(c - 4716) : int(c - 4715)
    secondTotal = int((dayFloat % 1) * 60 * 60 * 24)
    _hour = secondTotal / (60 * 60)
    _minute = (secondTotal - (_hour * 60 * 60)) / 60
    _second = secondTotal % 60
    timestamp(_year, _month, _day, _hour, _minute, _second)

getLastNewMoon(_time) =>
    _year = year(_time)
    dayOfYear = dayofyear(_time)
    k = (dayOfYear / 364.25 + _year - 1900) * 12.3685
    int moonPhase = na

    // 0 is equal to the fractional part of the new moon
    // 0.25 - first quarter, 0.5 - full moon, 0.75 - third quarter
    if ((k % 1.0) < 0.5)
        k := math.floor(k)
        moonPhase := +1
    else
        k := math.floor(k) + 0.5
        moonPhase := -1

    t = k / 1236.85
    
    // mean anomaly of the sun at the time julianDate
    anomalySun = math.toradians(359.2242 + (29.10535608 * k) - (0.0000333 * math.pow(t, 2)) - (0.00000347 * math.pow(t, 3)))
    // mean anomaly of the moon at the time julianDate
    anomalyMoon = math.toradians(306.0253 + (385.81691806 * k) + (0.0107306 * math.pow(t, 2)) + (0.00001236 * math.pow(t, 3)))
    // argument of latitude of the moon
    f = math.toradians(21.2964 + ((390.67050646 * k) - (0.0016528 * math.pow(t, 2)) - (0.00000239 * math.pow(t, 3))))
    dev = (0.1734 - (0.000393 * t)) * math.sin(anomalySun)
          + 0.0021 * math.sin(2 * anomalySun)
          - 0.4068 * math.sin(anomalyMoon)
          + 0.0161 * math.sin(2 * anomalyMoon)
          - 0.0004 * math.sin(3 * anomalyMoon)
          + 0.0104 * math.sin(2 * f)
          - 0.0051 * math.sin(anomalySun + anomalyMoon)
          - 0.0074 * math.sin(anomalySun - anomalyMoon)
          + 0.0004 * math.sin(2 * f + anomalySun)
          - 0.0004 * math.sin(2 * f - anomalySun)
          - 0.0006 * math.sin(2 * f + anomalyMoon)
          + 0.0010 * math.sin(2 * f - anomalyMoon)
          + 0.0005 * math.sin(anomalySun + 2 * anomalyMoon)

    julianDate = 2415020.75933 + (29.53058868 * k) + (0.0001178 * math.pow(t, 2)) - (0.000000155 * math.pow(t, 3)) +
          (0.00033 * math.sin(math.toradians(166.56) + (math.toradians(132.87) * t) - (math.toradians(0.009173) * math.pow(t, 2)))) + dev
    timeLastMoonPhase = getUNIXTimeFromJD(julianDate)
    timeLastMoonPhase := timeLastMoonPhase >= _time ? timeLastMoonPhase[1] : timeLastMoonPhase

    var int moonPhaseAdjusted = moonPhase
	isChangeTimeLastMoonPhase = ta.change(timeLastMoonPhase) != 0
    moonPhaseAdjusted := barstate.isfirst or isChangeTimeLastMoonPhase ? moonPhase : moonPhaseAdjusted[1]
    moonType = ta.change(moonPhaseAdjusted) != 0 ? moonPhase : na
    [moonPhaseAdjusted, moonType]

[moonPhase, moonType] = getLastNewMoon(time_close)
plotshape(moonType == +1, "New Moon",  shape.circle, location.abovebar, color.new(waxingMoonColorInput, 50), size=size.normal, display = display.pane)   
plotshape(moonType == -1, "Full Moon", shape.circle, location.belowbar, color.new(waningMoonColorInput, 50), size=size.normal, display = display.pane)
bgcolor(color.new(moonPhase == 1 ? waxingMoonColorInput : waningMoonColorInput, 95))
```
