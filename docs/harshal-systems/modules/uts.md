# Universal Timekeeping System (UTS) — corrected reference module

document_id: `HOS-UTS-REF-20261002`  
provenance_class: `DERIVATIVE_BUILD`  
status_taxonomy: `DERIVATIVE_REFERENCE_MODULE`  
evidence_status: `CALCULATED_FROM_STATED_DEFINITIONS`  
research_layer: `PUBLIC_RESEARCH_SUMMARY`  
source: Part XX — Supply Chain and Implanted-Device Threat Research; corrected implementation notes dated 2026-10-02.

## Purpose and boundary

This module makes the Universal Timekeeping System's duration arithmetic and browser representation internally consistent. It is a derivative reference module, not a new normative time authority. The in-world UTS convention remains `FICTION` (`NARRATIVE_SANDBOX`). This module and the UI are `DERIVATIVE_BUILD` artifacts.

UTS is display-only in HarshalOS. It does not control or attest Ground-0, provenance, Human Key identity/presence/consent, freshness, PDH, authorization, refusal, the Permanent Ledger of Vows, external side effects, or trusted system time. Browser UTC/local time are derived from the device clock. The approximate cosmological epoch below is a model parameter, not an observed exact timestamp.

## Duration units

Let `c = 299,792,458 m/s`, the exact SI speed of light in vacuum. One Universal Second is the time light takes to travel one metre in vacuum:

| Unit | Definition | Earth duration |
|---|---:|---:|
| `US` | `1 / c` Earth seconds | 3.33564095198 ns |
| `UM` | 60 `US` | 200.138457119 ns |
| `UH` | 60 `UM` = 3,600 `US` | 12.0083074211 μs |
| `UDay` | 24 `UH` = 86,400 `US` | 288.199378251 μs |
| `UY` | 365.25 `UDay` = 31,557,600 `US` | 0.105264822906 Earth seconds |

A `UY` is not an Earth year. One Julian Earth year of 31,557,600 Earth seconds equals 299,792,458 `UY`. The 365.25-day convention defines the unit hierarchy; it does not compensate for cosmic expansion.

For `s` Earth seconds and `u` Universal Seconds:

```text
u = s × c
s = u / c
UM = u / 60
UH = u / 3,600
UDay = u / 86,400
UY = u / 31,557,600
```

Examples: `100 UY ≈ 10.52648229 Earth seconds`; `150,000,000 US ≈ 4.753213172 UY ≈ 0.500346143 Earth seconds`.

## Absolute date versus duration

`UDay` is a duration unit. `UDate` is an absolute coordinate expressed in `UY` since a named epoch. Avoid `UD` as shorthand for both.

The HarshalOS demonstration uses this approximate anchor:

```text
Earth reference instant t₀ = 2026-10-02T00:00:00Z
Approximate age at t₀ = 13,799,000,000 Earth Julian years
UDate(t) = c × [13,799,000,000 + (UTC(t) − t₀) / 31,557,600] UY
UDate(t₀) = 4,136,836,127,942,000,000 UY ≈ 4.136836 × 10^18 UY
```

The epoch is deliberately approximate. A local Gregorian date/time and Earth UTC are displayed separately from `UDate`. This is not a cosmological measurement or an external time service.

## Repository implementation

- `updates/2026-10-02/02-Frameworks/Universal-Timekeeping-System/UTS-Specification.md` — detailed specification.
- `updates/2026-10-02/02-Frameworks/Universal-Timekeeping-System/UTS-Conversion-Guide.md` — worked examples.
- `updates/2026-10-02/02-Frameworks/Universal-Timekeeping-System/uts_generator.py` — Python UTC-to-UTS projection and duration helpers.
- `js/uts.js` and `js/apps-uts.js` — browser converter and UTS watch app.
- `index.html`, `css/uts.css`, and `js/wm.js` — Home Screen local clock, Earth-UTC line, Gregorian month calendar, modeled UDate, and app link.

The browser calculator uses finite JavaScript `Number` inputs and rounded display. Use arbitrary-precision arithmetic for scientific-grade precision. Original RTF source files are preserved; where their earlier Earth-scale arithmetic or `UD` overloading conflicts with this corrected reference, use the Markdown specification.

## Publishing hierarchy

“The architecture (Book I) is the library. The novel (Book II) is the work in active production.” This module is indexed as a derivative reference beside Part XX; it does not alter Book I's normative authority.
