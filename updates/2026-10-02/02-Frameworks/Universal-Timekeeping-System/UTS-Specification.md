# Universal Timekeeping System (UTS) — corrected specification

**Version:** 1.1 · **Calibration date:** 2026-10-02  
**Provenance:** `FICTION` (`NARRATIVE_SANDBOX`) for the in-world convention; `DERIVATIVE_BUILD` for the arithmetic and browser demonstration.  
**Status:** reference specification with explicitly approximate epoch model.  
**Authority boundary:** UTS is informational only. It is not an astronomical time standard, trusted clock, authorization signal, Human Key input, freshness oracle, or HOS control.

## 1. Duration units

The system defines Universal Seconds from the exact SI speed of light in vacuum, `c = 299,792,458 m/s`:

| Unit | Definition | Earth-time duration | Check |
|---|---:|---:|---|
| `US` | `1 / c` Earth seconds | 3.33564095198 nanoseconds | Light travels 1 m in vacuum |
| `UM` | 60 `US` | 200.138457119 nanoseconds | `60 US` |
| `UH` | 60 `UM` = 3,600 `US` | 12.0083074211 microseconds | `3,600 US` |
| `UDay` | 24 `UH` = 86,400 `US` | 288.199378251 microseconds | `86,400 US` |
| `UY` | 365.25 `UDay` = 31,557,600 `US` | 0.105264822906 seconds | Julian-year-sized UTS count |

A `UY` is **not** an Earth year. One Julian Earth year (31,557,600 Earth seconds) equals **299,792,458 `UY`** under these definitions. The 365.25-day convention defines the UTS duration hierarchy; it does not compensate for cosmic expansion.

### Examples

- `1 Earth second = 299,792,458 US`.
- `100 UY = 10.5264822906 Earth seconds`.
- `150,000,000 US = 4.753213172 UY = 0.5003461428 Earth seconds`.
- `1,000 US = 0.000003335640952 Earth seconds` (about 3.336 microseconds).

## 2. Absolute date notation

`UDate` is a timestamp coordinate: elapsed Universal Years from an explicitly named epoch. It is **not** a duration unit. Use `UDay` for the duration and `UDate` for the absolute coordinate; do not abbreviate both as `UD`.

The browser demonstration uses this transparent, approximate projection:

- Reference Earth instant `t₀`: `2026-10-02T00:00:00Z`.
- Approximate universe age at `t₀`: `13.799 billion Earth Julian years`.
- Projection: `UDate(t) = c × [13,799,000,000 + (tUTC − t₀) / 31,557,600] UY`.
- At the reference instant this is `4,136,836,127,942,000,000 UY`, approximately `4.136836 × 10^18 UY`.

The epoch is rounded by design and is not an observed exact timestamp. The displayed `UDate` is therefore an **approximate model label**, not an exact statement of the universe's age. The app keeps the conventional, device-local Gregorian date/time and Earth UTC separate from `UDate`.

## 3. Conversion equations

Let `s` be Earth seconds and `u` be Universal Seconds:

```text
u = s × c
s = u / c
UM = u / 60
UH = u / 3,600
UDay = u / 86,400
UY = u / 31,557,600
```

For UTS duration-unit input `x`:

```text
Earth seconds = x × (US per input unit) / c
```

Use a declared Julian Earth year of 31,557,600 seconds when converting Earth years. Browser numbers are floating-point and rounded for display; use arbitrary-precision arithmetic for high-precision scientific work.

## 4. Generator / calculator

`uts_generator.py` implements:

- UTC normalization (timezone-free input is treated as UTC, and that rule is stated);
- duration conversion helpers `earth_to_uts()` and `uts_to_earth()`;
- `UDate` generation from the anchored approximate age model;
- append / prepend / replacement of the generator's own front-matter block without claiming astronomical precision.

Examples:

```bash
python3 uts_generator.py --date '2026-10-02T00:00:00Z'
python3 uts_generator.py --current
python3 uts_generator.py --file notes.md --format replace
```

## 5. HOS display integration

The Home Screen includes a small local clock, Earth-UTC line, Gregorian month calendar, and scientific-notation `UDate`. The **UTS Watch & Converter** app provides a duration calculator and the full timestamp. The widget uses the browser's device clock and does not create a time-authority service or modify HOS state.

The app explicitly disclaims effects on:

- Ground-0 / provenance status;
- Human Key presence, identity, consent, or freshness;
- Phase Declaration Header (PDH), authorization, or refusal;
- the Permanent Ledger of Vows (PLV), system logs, or external side effects.

## 6. Provenance and source

The light-speed unit definitions and arithmetic in this implementation are directly reproducible from the exact SI value of `c` and the stated Julian-year convention. The 13.799-billion-year anchor is a rounded cosmological context value, not a claim sourced to a precision measurement. In-world uses of UTS remain `FICTION` (`NARRATIVE_SANDBOX`). The app and scripts are `DERIVATIVE_BUILD` artifacts.

**Repository hierarchy:** “The architecture (Book I) is the library. The novel (Book II) is the work in active production.” This UTS module is an indexed derivative reference; it does not alter Book I's normative authority.
