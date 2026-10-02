# 2026-10-02 continuity and recalibration update — current status

**Status:** documentation and interface corrections in progress. This page supersedes earlier “final delivery,” “complete,” “ready for immediate use,” and “production-ready” language in the 2026-10-02 package. It does not claim that any dam, aqueduct, city, security control, or institution has been built or deployed.

## Controlling references

- **Grand River / Mistveil:** [`02-Frameworks/Grand-River-Flow-Model/CANONICAL-NUMBERS.md`](./02-Frameworks/Grand-River-Flow-Model/CANONICAL-NUMBERS.md) — fictional planning numbers and documented calculation limits.
- **Reproducible arithmetic:** [`02-Frameworks/Grand-River-Flow-Model/recalculate.py`](./02-Frameworks/Grand-River-Flow-Model/recalculate.py) and [`WATER-FLOW-CALCULATIONS.md`](./02-Frameworks/Grand-River-Flow-Model/WATER-FLOW-CALCULATIONS.md).
- **Storm-0558:** [`01-Threat-Intelligence/Storm-0558/README.md`](./01-Threat-Intelligence/Storm-0558/README.md) — separates public incident facts, source limitations, hypotheses, and non-deployed research ideas.
- **UTS:** [`02-Frameworks/Universal-Timekeeping-System/UTS-Specification.md`](./02-Frameworks/Universal-Timekeeping-System/UTS-Specification.md) — corrected definitions and explicitly approximate `UDate` model.
- **Audit:** [`CONTINUITY-AUDIT.md`](./CONTINUITY-AUDIT.md) — findings and provenance notes for this update.

## Current narrative continuity

- The first operational dam-and-city module is targeted **circa 2046**, approximately 20 years after the 2026 planning baseline.
- Construction continues in **20-year planning windows** for assumed supply-chain/construction reasons; those windows are not physical limits. The first 40–60 years carry a 1,200–2,500-foot cumulative-head aspiration across distinct stages; 4,000 feet remains the long-range fictional aggregate target, not a single wall. The head ranges are not dam-wall heights or reservoir depths.
- **2098 is an interim commissioning/expansion milestone, not final completion.** No final completion date is assigned.
- Mistveil City targets **about 80 million residents by 2100**. The earlier ~40-million Book II count is retained as a distinct illustrative regional service-population count, not a competing city total.
- Book II vocabulary remains the active fiction: Grand River Foundation, Western Colonnade of Mutual Underwriting Houses, 119-NAB Ombudsman's Council, Point-to-Point South Wall Copper Vault, Spherical Orb Chamber, and ℤ₃₆₀ addressing.

## Numeric correction highlights

- One workbook line delivers 50 million US gallons/day (**2.190632m³/s**), not 5,000m³/s.
- Under explicit 350-mile/60-inch/C=140/4,000-foot-lift assumptions, the single-line pump input is about **41.76MW**; the route is not surveyed.
- The legacy 29.75km³/year transfer target equals **942.721m³/s**; matching it with baseline-throughput lines would require 431 parallel lines and about **17.96GW** pump input under the same simplified assumptions.
- Conditional hydro output at 476m³/s, 1,219.2m gross head, and 90% efficiency is about **5.12GW**, not unlimited energy from dam height. The 476m³/s is historical context, not a guaranteed supply.
- The workbook's separate 80×50MWe SMR entry is 4GW assumed nameplate; combined conditional nameplate is about 9.12GW. It does not cover the 17.96GW pipeline-pumping sensitivity before city/process loads.
- 73km³ reservoir-only fill at 5,000m³/s is about **169 days**, assuming no outlet or loss. Serial-tier flow and dam head cannot be counted repeatedly.

These remain planning calculations and speculative fiction, not real-world feasibility, permits, resource availability, or engineering validation.

## Integration scope

This update reconciles the Book II source and generated preview, adds a canonical Grand River numbers card and script, corrects the UTS generator and browser watch/calendar, and labels the Storm-0558 study fixture in Good Intelligence as a synthetic sandbox packet. Existing package files and original source artifacts remain available with clarified provenance; older incompatible numeric tables are superseded rather than silently treated as current.

**Publishing hierarchy:** “The architecture (Book I) is the library. The novel (Book II) is the work in active production.”
