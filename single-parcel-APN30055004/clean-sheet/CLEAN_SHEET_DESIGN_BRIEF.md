# Clean Sheet Design — APN 30055004

**Kendrick Park bench, Coconino County, AZ • 5.00 ac • AR-5 by-right • single-parcel isolated**

Design-development package generated 2026-10-17 from corrected USGS 3DEP terrain
(7,877–7,895′ NAVD88; USFS Kendrick Cabin benchmark 7,910′ ½ mi NE).

## Design direction (as directed)

| Decision | Choice | Consequence |
|---|---|---|
| Priority | **Income-first** | ADU 2BR is Phase 1 CO #1 — you live in it and it rents the day after you move out; Lodge funds come from operating cash, not debt |
| Character | **Modern forest cabin** | Charcoal metal + cedar, low profile, floor-ceiling SE glass aimed at Humphreys (138.8°), 22′ ridge, ipe deck, IDA B0-L0-U0 lighting |
| Constraint | **Min disturbance** | 0.9 ac / 18% disturbance envelope, 210 CY grading (−52% clearing, −73% vs the old Fort Valley model), 5 ponderosa retained |

## Sheet 1 — Site plan (`CLEAN_SHEET_PLAN.png`)

Zoning logic, west→east, north→south (north is high, N–S fall 14′ @ 3.0%):

1. **Well cluster NW (up-gradient)** — 500′ well + pump house inside a 100′ buffer; highest ground, farthest from septic and drive.
2. **Lodge on the 7,891′ bench, E–W axis** — SE glazing to Humphreys; 18″ stepped foundation avoids a cut/fill wall; low deck south, entry porch north.
3. **ADU + Shop NW flat (1.9%)** — Phase 1 income cluster, 200′ from the well, on the same gravity run as the Lodge.
4. **Septic mid-slope** — 2,000 gal + 100% reserve, 1.4% gravity from the Lodge deck, no pump, >100′ from well (ADEQ R18-9-C).
5. **Barn + pasture SW on the 7,887′ flat** — stalls drain away from the swale; 25 kW PV on the south barn roof (48″ snow, 30° tilt).
6. **Interceptor swale NW→SE at 1.9% → SE vernal-pool retention** — all flow stays on-parcel; floor of the GH sits 8″ below the swale.
7. **Drive east of the swale → 92′ motor court** — because the drive never crosses the swale, there are **zero culverts**; 8′ compacted basalt fines, gate at south line with 10k-gal buried fire cistern.
8. **Orchard (west of swale) + greenhouse (contour)** — food production on the dry middle, no irrigation crossing the swale.

All structures ≥ 50′ from property lines; disturbance stays inside the 366.69′ square.

## Compliance check

| Rule | Limit | Design | Status |
|---|---|---|---|
| AR-5 side/rear setback | 50′ | all bldgs inside 366.69′ square | ✅ |
| Building/impervious coverage | 35% of 5.0 ac = 1.75 ac | ~0.39 ac structures + drive ≈ 8% | ✅ |
| Height | 35′ | Lodge 22′ ridge, barn 16′ | ✅ |
| WUI (Ord. 95-1) / IDA dark sky | Class A, 5′ zone, B0-L0-U0 | metal roofs, non-combust, shielded 2700K | ✅ |
| Self-contained (no cross-parcel) | 100% | well, septic+reserve, fire, microgrid, drainage all on-parcel | ✅ |
| Humphreys 138.8° SE view | preserve | Lodge E–W axis + SE glass, no fill on view corridor | ✅ |

## Phasing (`PHASING_INCOME_FIRST.png`)

- **Phase 1 (Mo 6–10)** — ADU + Shop + well/septic/drive/fire. You live on site. ~45% of total capex, 100% of early income. Proves the off-grid systems through one winter.
- **Phase 2 (Mo 10–18)** — Lodge + Barn. You move to the Lodge; ADU goes to mid-term rental: **$3,600/mo @ 85% → $29.7k NOI Y2** (B-model, verified in `docs/APN30055004_ProForma.xlsx`).
- **Phase 3 (Y3+)** — GH, orchard, retention planting, finish landscaping. Hybrid May–Oct @ $375 ADR @ 58% on top of the mid-term core → **Y4 $42.7k NOI, 10.2% cap on $420k all-in**. Income funds the refinance; the 4-yurt agritourism CUP stays optional Y5+.

## Systems (`SYSTEMS_OFF_GRID.png`)

Water: 500′ well → 2,500-gal buried cistern (below 42″ frost) → VFD.
Waste: 2,000-gal → 3,000 SF field + fenced 100% reserve, gravity 1.4%, no pump.
Power: 25 kW bifacial PV + 80 kWh BESS + 30 kW gen (barn roof), self-grid.
Fire: 10k-gal buried cistern, 4.5″ NH hydrant, 20′ drive, 92′ turnaround.
Drainage: NW interceptor 1.9% → SE vernal-pool retention, zero culvert.
Dark sky: B0-L0-U0, 2700K fully shielded, <25k lumens/acre.

## Files

- `CLEAN_SHEET_PLAN.png` — dimensioned site plan on corrected 2′ contours
- `PHASING_INCOME_FIRST.png` — 3-phase build diagram
- `SYSTEMS_OFF_GRID.png` — six-system summary

Regenerate with `python scripts/generate_clean_sheet_plan.py`.

**Next steps:** ALTA/NSPS boundary by AZ RLS → well point (ADWR) → perc test + engineered septic → building permit (Coconino Bldg & Safety) → Phase 1 vertical. Figs 04–05 in `terrain/` still pending full regeneration at corrected elevation; synthetic DEM in `terrain_real/` should be replaced per its README with a manual USGS TNM download.
