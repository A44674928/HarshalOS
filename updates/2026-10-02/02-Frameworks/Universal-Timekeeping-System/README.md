# Universal Timekeeping System — implementation package

**Package status:** corrected reference arithmetic + informational browser demonstration.  
**Classification:** in-world UTS convention is `FICTION` (`NARRATIVE_SANDBOX`); the specification, calculator, and watch are `DERIVATIVE_BUILD`.  
**Authority boundary:** this is not an astronomical standard or trusted clock and has no effect on HOS authority, freshness, Ground-0, PDH, or PLV.

## Canonical files

| File | Purpose |
|---|---|
| [`UTS-Specification.md`](./UTS-Specification.md) | Corrected unit definitions, equations, approximate `UDate` epoch, and system boundaries. |
| [`UTS-Conversion-Guide.md`](./UTS-Conversion-Guide.md) | Worked Earth-duration ↔ UTS-duration conversions and CLI examples. |
| [`uts_generator.py`](./uts_generator.py) | Reproducible Python timestamp / duration helper. |
| [`01-Universal-Timekeeping-System.rtf`](./01-Universal-Timekeeping-System.rtf) | Original author-supplied RTF source; retained, not the corrected implementation authority. |
| [`02-Converting-UTS-to-Human-Time.rtf`](./02-Converting-UTS-to-Human-Time.rtf) | Original author-supplied RTF source; retained, not the corrected implementation authority. |

The browser module is `js/uts.js`, its app registration is `js/apps-uts.js`, and its Home Screen watch/calendar is wired by `index.html` and `js/wm.js`.

## Corrected invariant

```text
1 US   = 1 / 299,792,458 Earth seconds
1 UM   = 60 US
1 UH   = 60 UM
1 UDay = 24 UH
1 UY   = 365.25 UDay = 31,557,600 US
```

Therefore `1 UY ≈ 0.105264823 Earth seconds`; `1 Julian Earth year = 299,792,458 UY`. The absolute label `UDate` is distinct from the duration `UDay`. A model value of 13.799 billion Earth Julian years at 2026-10-02 00:00 UTC yields approximately `4.136836 × 10^18 UY`, not 13.799 billion UY.

The old RTF source remains preserved as source material. Where its arithmetic or `UD` shorthand conflicts with the corrected specification, use the Markdown specification above.
