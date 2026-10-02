# UTS implementation summary — corrected reference and Home Screen integration

**Revision:** 2026-10-02 recalibration  
**Status:** core arithmetic, generator, browser duration calculator, local-time watch/calendar, and indexed documentation are implemented. This is an informational `DERIVATIVE_BUILD`, not a trusted clock or production security control.

> Older summary language said the prior generator and calculations were “production-ready,” described `UH`/`UD`/`UY` as Earth-scale durations, and gave a `UD` timestamp around `5.04×10^12`. Those calculations conflated duration units with the absolute date coordinate and are withdrawn. The old printed UTS timestamps should not be reused.

## Corrected unit hierarchy

```text
1 US   = 1/c Earth seconds, c = 299,792,458 m/s
1 UM   = 60 US
1 UH   = 60 UM = 3,600 US
1 UDay = 24 UH = 86,400 US
1 UY   = 365.25 UDay = 31,557,600 US
```

Therefore `1 UY ≈ 0.105264823 Earth seconds`; one Julian Earth year is `299,792,458 UY`. `UDay` is a duration. `UDate` is an absolute date coordinate in UY since an explicitly named epoch; do not abbreviate both as `UD`.

The current demonstration anchors an **approximate** 13.799-billion-Earth-Julian-year universe age at `2026-10-02T00:00:00Z`. This produces `UDate ≈ 4.136836 × 10^18 UY` at the anchor. The cosmological anchor is a model parameter, not an exact measurement. UTC and local display time come from the device/browser and are not independent security time.

## Delivered and tested components

- `02-Frameworks/Universal-Timekeeping-System/UTS-Specification.md` — definitions, equations, epoch model, provenance and authority boundary.
- `02-Frameworks/Universal-Timekeeping-System/UTS-Conversion-Guide.md` — worked conversions and command-line examples.
- `02-Frameworks/Universal-Timekeeping-System/uts_generator.py` — Python UTC timestamp projection and duration helpers.
- `js/uts.js` + `js/apps-uts.js` — browser calculator, modeled UDate display, and dedicated UTS Watch & Converter app.
- `index.html`, `css/uts.css`, and `js/wm.js` — compact Home Screen local clock, Earth-UTC line, Gregorian month calendar, UDate, and link to the app.
- `docs/harshal-systems/modules/uts.md` (to be indexed) — derivative reference module in Book I's library.

The calculator is a display helper. It does not change Ground-0, provenance, Human Key, freshness, PDH, authorization, refusal, PLV, or system authority. Browser conversions use floating-point numbers and rounded output; arbitrary precision is needed for high-precision scientific work.

## Reproducibility

```bash
python3 updates/2026-10-02/02-Frameworks/Universal-Timekeeping-System/uts_generator.py --date '2026-10-02T00:00:00Z'
python3 updates/2026-10-02/02-Frameworks/Universal-Timekeeping-System/uts_generator.py --current
```

Original RTF sources are preserved. Their former `UD` overloading and Earth-scale conversion examples are not the corrected implementation authority; use the Markdown specification.

**Publishing hierarchy:** “The architecture (Book I) is the library. The novel (Book II) is the work in active production.”
