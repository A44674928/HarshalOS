# Universal Timekeeping System — corrected package overview

The first timestamping package had a unit-scale error and overloaded `UD` as both a duration and an absolute date. Its old numeric examples and generated timestamps are withdrawn. Use the corrected documents and code below.

## Package contents

- [`02-Frameworks/Universal-Timekeeping-System/UTS-Specification.md`](./02-Frameworks/Universal-Timekeeping-System/UTS-Specification.md) — canonical corrected definitions, conversion equations, and explicitly approximate `UDate` epoch model.
- [`02-Frameworks/Universal-Timekeeping-System/UTS-Conversion-Guide.md`](./02-Frameworks/Universal-Timekeeping-System/UTS-Conversion-Guide.md) — worked Earth-time ↔ UTS-duration examples.
- [`02-Frameworks/Universal-Timekeeping-System/uts_generator.py`](./02-Frameworks/Universal-Timekeeping-System/uts_generator.py) — reproducible Python helper.
- `js/uts.js` / `js/apps-uts.js` — browser conversion app and informational watch logic.
- `index.html`, `css/uts.css`, and `js/wm.js` — Home Screen local clock, Gregorian month calendar, Earth UTC, and modeled UDate.
- [`UTS-Implementation-Summary.md`](./UTS-Implementation-Summary.md) — scope and non-authority boundary.
- [`UTS-Timestamps-Report.md`](./UTS-Timestamps-Report.md) — correction notice for the invalidated earlier report.

## Corrected definitions

```text
1 US   = 1 / 299,792,458 Earth seconds
1 UM   = 60 US
1 UH   = 60 UM
1 UDay = 24 UH
1 UY   = 365.25 UDay = 31,557,600 US
```

`1 UY ≈ 0.105264823 Earth seconds`; one Julian Earth year is 299,792,458 UY. `UDay` is a duration. `UDate` is the absolute time coordinate in UY since an explicitly named epoch. At the approximate 13.799-billion-Julian-year reference age on 2026-10-02, the modeled UDate is approximately `4.136836 × 10^18 UY`.

## Authority and precision boundary

The UTS feature is display-only. It does not establish a trusted clock or affect HOS Ground-0, provenance, Human Key, liveness/freshness, authorization, refusal, or ledger state. The epoch is an approximate model parameter. Browser results use floating-point arithmetic and rounded display values.

Original author-supplied RTF documents remain preserved as source material. Where their arithmetic conflicts with the corrected Markdown specification, use the Markdown specification. No mass timestamping of repository files is claimed by this update.
