# UTS timestamp report — correction and scope

**Status:** prior timestamp examples in the 2026-10-02 package are invalidated because the earlier implementation conflated duration units with the absolute date coordinate. Values such as `UD 5040084750000.695312`, the prior `13.8 billion UD` example, and the old “current time” output must not be reused or cited.

This report does **not** claim that 15 gems or 20+ files were validly UTS-stamped. It records the correction only. The repository was not bulk-retimestamped as part of this recalibration.

## Correct interpretation

- `US = 1/c` Earth seconds, where `c = 299,792,458 m/s`.
- `UM = 60 US`; `UH = 60 UM`; `UDay = 24 UH`; `UY = 365.25 UDay = 31,557,600 US`.
- `1 UY ≈ 0.105264823 Earth seconds`; one Julian Earth year is `299,792,458 UY`.
- `UDay` is a duration; `UDate` is an absolute coordinate in UY since an explicitly named epoch.
- A demonstration age anchor of 13.799 billion Earth Julian years at `2026-10-02T00:00:00Z` yields approximately `4.136836 × 10^18 UY`, not `13.799 billion UY`.

## Reproducible example

```bash
python3 02-Frameworks/Universal-Timekeeping-System/uts_generator.py \
  --date '2026-10-02T00:00:00Z'
```

The generator labels the cosmological epoch as approximate. Its UTC input is conventional time data; UTS output is informational and is not a trusted clock, audit timestamp, authentication signal, freshness oracle, or authority source. Existing timestamps in documents should be verified against their original metadata/source rather than retroactively replaced by this model.

See [`02-Frameworks/Universal-Timekeeping-System/UTS-Specification.md`](./02-Frameworks/Universal-Timekeeping-System/UTS-Specification.md) for the full definitions and boundaries.
