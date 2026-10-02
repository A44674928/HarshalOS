# Grand River model — recalibration status summary

**Revision:** 2026-10-02 · **Provenance:** `FICTION` (`NARRATIVE_SANDBOX`) + reproducible `DERIVATIVE_BUILD` arithmetic  
**Status:** planning model recalibrated; no physical construction, engineering validation, water allocation, feasibility finding, permit, or implementation is claimed.

> **Numeric authority:** [`CANONICAL-NUMBERS.md`](./CANONICAL-NUMBERS.md). The older “complete/ready for immediate implementation” language and incompatible flow/energy/elevation tables elsewhere in this directory are superseded concept material.

## Current fictional continuity

- Build is modular. Target the first operational dam-and-city module around **2046**, approximately 20 years after the planning baseline.
- Construction and expansion proceed in **20-year planning windows** because of assumed supply-chain and construction limits. The first 40–60 years carry a 1,200–2,500-ft cumulative-head aspiration across distinct stages; 4,000 ft remains the long-range fictional aggregate target for the modular Arizona Grand Canyon series. These are not individual dam-wall or reservoir-depth figures, and the windows are not physical limits.
- **2098 is an interim commissioning/expansion milestone, not final completion.** There is no declared final completion year.
- Mistveil City targets **about 80 million residents by 2100**. The legacy ~40-million figure refers to an illustrative regional service-population metric, not a city census. Its overlap with Mistveil residents is unspecified; do not treat the values as additive.
- Preserve Book II vocabulary: Mistveil City, Grand River Foundation, Western Colonnade of Mutual Underwriting Houses, 119-NAB Ombudsman's Council, South Wall Copper Vault, Spherical Orb Chamber, and ℤ₃₆₀ addressing.

## Recalibrated flow and energy checks

| Quantity | Planning arithmetic | Interpretation |
|---|---:|---|
| Workbook pipeline flow | 50M US gal/day = **2.190632 m³/s** | One notional 60-inch, 350-mile line; about 2.37 L/person/day at 80M if lossless. |
| Single-line pumping | **41.76 MW** | 4,000-ft assumed pipeline lift (separate from dam-series head goals) + ~349.8m friction; 85% pump × 95% motor. |
| 29.75 km³/year aggregate-transfer scenario | **942.721 m³/s** | Requires 431 baseline-throughput lines (~242,770 cumulative pipeline-km) and ~17.96 GW pump input under identical simplified assumptions. This is not a supply or feasibility claim. |
| Conditional hydro context | **5.12 GW** | 476 m³/s historical sample median × 1,219.2m gross conceptual head × 90%; not firm flow or net head. |
| Workbook SMR entry | **4.00 GW nameplate** | 80 × 50 MWe, an unverified assumption. Combined conditional nameplate is 9.12 GW. |
| 73 km³ reservoir-only fill | **169 days at 5,000 m³/s** | Zero outlet/losses; 896 days at 942.721 m³/s; ~1,056 years at workbook baseline. |

Hydro generation is `ρgQHη`; pipeline pumping is a separate electrical load `ρgQH/(η_pump η_motor)`. Elevation head is finite, serial stages do not multiply the same head, and recovery after pumping cannot make a closed loop a net energy source. The project has no positive net-energy balance established.

## Reproducibility

Run:

```bash
python3 recalculate.py
python3 recalculate.py --json
```

The formulas and every assumed input are documented in [`recalculate.py`](./recalculate.py); the single current reference is [`CANONICAL-NUMBERS.md`](./CANONICAL-NUMBERS.md).
