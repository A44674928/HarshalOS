# UTS conversion guide

**Companion to:** [`UTS-Specification.md`](./UTS-Specification.md) · **Version:** 1.1  
**Status:** corrected arithmetic; epoch projection is approximate and non-authoritative.

## Quick reference

| Quantity | Conversion |
|---|---:|
| 1 `US` | `1 / 299,792,458` Earth seconds = 3.33564095198 ns |
| 1 `UM` | 60 `US` = 200.138457119 ns |
| 1 `UH` | 60 `UM` = 3,600 `US` = 12.0083074211 μs |
| 1 `UDay` | 24 `UH` = 86,400 `US` = 288.199378251 μs |
| 1 `UY` | 365.25 `UDay` = 31,557,600 `US` = 0.105264822906 Earth s |
| 1 Earth second | 299,792,458 `US` |
| 1 Julian Earth year | 299,792,458 `UY` |

## Convert Earth duration to UTS

For an Earth duration of `s` seconds:

```text
US   = s × 299,792,458
UM   = US / 60
UH   = US / 3,600
UDay = US / 86,400
UY   = US / 31,557,600
```

Examples:

- `1 Earth second` = `299,792,458 US` = `4,996,540.9667 UM` = `83,275.68278 UH` = `3,469.820116 UDay` = `9.499850 UY`.
- `1 Earth day` = `86,400 × 299,792,458 US` = `299,792,458 UDay` = `820,787.0171 UY`.

## Convert UTS duration to Earth time

For `u` Universal Seconds:

```text
Earth seconds = u / 299,792,458
Earth minutes = Earth seconds / 60
Earth hours   = Earth minutes / 60
Earth days    = Earth hours / 24
Earth years   = Earth days / 365.25
```

Examples:

- `150,000,000 US` = `0.5003461428 Earth seconds` = `4.753213172 UY`.
- `100 UY` = `3,155,760,000 US` = `10.5264822906 Earth seconds`.

## Absolute timestamp is a different operation

Do not convert an absolute Earth timestamp by treating its Unix epoch as if it were the Big Bang. The demo uses a labeled anchor instead:

```text
UDate(t) = 299,792,458 × [13,799,000,000
                          + (UTC(t) − 2026-10-02T00:00:00Z) / 31,557,600] UY
```

This produces about `4.136836 × 10^18 UY` at the anchor. The cosmological age is approximate; the device/browser UTC is conventional local clock data. Neither is an independently trusted time source.

## Reproducible command-line examples

```bash
python3 uts_generator.py --date '2026-10-02T00:00:00Z'
python3 uts_generator.py --date '2026-10-02T12:00:00-07:00'
python3 uts_generator.py --file report.md --format replace
```

Timezone-free inputs to the Python tool are treated as UTC. Its `--file` option reads the file modification time as UTC. The browser calculator uses floating-point numbers and rounds output; do not present its display precision as more exact than its inputs.

## Guardrails

- `UDay` is a duration; `UDate` is an absolute timestamp coordinate.
- Avoid `UD` as an abbreviation because it obscures that distinction.
- Do not describe 1 `UY` as 1 Earth year; it is approximately 0.1053 Earth seconds under the stated definitions.
- Do not use UTS for authentication, freshness, authorization, Ground-0, PDH, or ledger decisions.
- The approximate epoch is an in-world / interface convention, not a cosmological measurement.
