# Grand Aqueduct — recalibration status

**Status:** Fictional planning concept, not a delivered or implemented infrastructure system.  
**Provenance:** `FICTION` (`NARRATIVE_SANDBOX`) + `DERIVATIVE_BUILD` calculations.  
**Controlling numeric reference:** [`CANONICAL-NUMBERS.md`](./CANONICAL-NUMBERS.md).

Earlier “complete” checklists, 5,000m³/s gravity-fed capacities, 4-hour reservoir-fill claims, 57% safety margins, and 58.86GW “total pumping” claims are withdrawn as unsupported or internally inconsistent. The project has not established route feasibility, source-water rights, design flows, permits, implementation, or positive net energy.

## Current planning arithmetic

- Workbook baseline: **50,000,000 US gal/day = 2.190632m³/s**, using a notional 60-inch line over 350 miles.
- Simplified friction head: **~349.8m**; assumed 4,000-foot static lift: **1,219.2m**; total head: **~1,569.0m**.
- At assumed 85% pump and 95% motor efficiency, one baseline line requires **~41.76MW** electrical pumping input, before omitted system loads.
- Legacy target 29.75km³/year converts to **942.721m³/s**. At the same per-line baseline throughput, that is **431 parallel lines**, about 242,770 cumulative route-km, and **~17.96GW** of simplified pump input. This is a scale check only.
- A 73km³ reservoir would require **~169 days at 5,000m³/s** with zero outlet or loss, not four hours. At the workbook baseline rate it takes about 1,056 years. The 5,000m³/s value is a sensitivity, not an established supply.
- Water and energy must be balanced at every serial tier and branch. Do not add the same recirculating water or hydraulic head more than once.

## Fiction continuity

The Grand Aqueduct may retain its three narrative names—Aqueduct of Aspiration, Pipeline of Transformation, and Stream of Manifestation—but historical flows and build claims are not validated. The larger dam/city timeline targets first operation circa 2046, 20-year expansion windows, an interim 2098 phase marker, and about 80 million Mistveil residents by 2100. Construction is not declared complete in 2098 or 2100.

Run `python3 recalculate.py` in this directory for the reproducible calculations. See [`GRAND-AQUEDUCT-TECHNICAL-SPECIFICATION.md`](./GRAND-AQUEDUCT-TECHNICAL-SPECIFICATION.md) for scope boundaries.
