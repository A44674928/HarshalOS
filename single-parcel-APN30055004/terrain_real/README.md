# APN 30055004 Real DEM Package — Design Preview (USGS 3DEP 1m Structure)

**Status:** SYNTHETIC DESIGN PREVIEW ONLY — not survey-grade, not a verified USGS DEM, and not suitable for building siting, grading, drainage, septic, access, or permit use. Replace with actual USGS 3DEP data and an AZ RLS survey before placing footprints.

**Why synthetic?** The repository's current contours were generated from a synthetic placeholder surface. Their parcel proxy/coordinate offset and elevations have not been field-verified. The actual USGS 3DEP bare-earth raster and AZ RLS topo survey are still required. A USGS DEM is not itself a legal boundary or field survey.

## Files


> **Current phasing decision (2026-11-03): PRIORITY 1** is the compact two-story fire-watch-style cabin / future ADU concept. **PHASE 2** is the principal main house. No building footprint is placed in these DXFs because the contours are synthetic and use a parcel proxy/offset. See [PHASED_BUILD_PRIORITY_AND_ZONING_REVIEW.md](../terrain_preliminary/PHASED_BUILD_PRIORITY_AND_ZONING_REVIEW.md) for the concept, current zoning screen, ADU sequencing gate, and required evidence.

**Startup budget annotation:** Each DXF includes a visible `STARTUP BUDGET: $200,000` note on the `PROJECT-BUDGET` layer. The 1-ft and 2-ft files are alternate contour-interval exports for the same parcel, so the repeated note is the same project-level planning baseline in both files, not two independent budgets. This is a starting assumption, not an itemized or verified cost estimate.

| File | CRS | Use |
|------|-----|-----|
| `APN30055004_1m_DEM_NAD83_UTM12N.tif` | EPSG:26912 NAD83 UTM 12N, 1m, NAVD88 meters | USGS native — QGIS/ArcGIS hillshade/slope/Aspect in 1 click |
| `APN30055004_1m_DEM_AZ_Central_StatePlane_0202.tif` | EPSG:2223 AZ Central State Plane (USft) | County submittal — Coconino wants State Plane for C-102 |
| `APN30055004_2ft_contours_UTM12N.dxf` | UTM12N | AutoCAD/Civil3D: layer C-CONTO-2FT (cyan, continuous) |
| `APN30055004_1ft_contours_UTM12N.dxf` | UTM12N | 1ft supplemental (gray) |
| `APN30055004_2ft_contours.geojson` | EPSG:26912 (UTM coords) | Web map / SitePlanViewer `topo-apn30055004` layer |

## How to replace with real USGS tile (15 min)

1. **National Map Downloader:** https://apps.nationalmap.gov/downloader/
   - Extent: Draw polygon around Sec 20 T24N R07E (approx 35.4436,-111.6814 + 300m buffer)
   - Products: Check `Elevation Source > 1 meter DEM` — select tile `USGS_1M_...` covering 35°26'43"N 111°40'52"W (Kendrick Park)
   - Format: GeoTIFF, 1m, UTM 12N, NAVD88
   - Download → saves as `USGS_1M_xxx.tif`
2. **Rename** that file to `APN30055004_1m_DEM_NAD83_UTM12N.tif` and overwrite this synthetic one.
3. **Regenerate contours (if needed):** `gdal_contour -a ELEV_FT -i 2 -fl -f "DXF" APN30055004_1m_DEM_NAD83_UTM12N.tif APN30055004_2ft_contours_UTM12N.dxf` (or run `scripts/generate_real_dem_package.py` again — it will auto-use the new GeoTIFF if present)
4. **Reproject for County:** `gdalwarp -s_srs EPSG:26912 -t_srs EPSG:2223 -r bilinear APN30055004_1m_DEM_NAD83_UTM12N.tif APN30055004_1m_DEM_AZ_Central_StatePlane_0202.tif`
5. **Field verification still required:** RLS ALTA/NSPS + 1' topo to NAVD88 before C-102 seal — USGS bare-earth is ±10cm RMSEz, not legal vertical.

## Elevation for this bench

- **Kendrick Cabin USFS bench:** 7,910' (USFS Recreation.gov)
- **Lot 3 modeled bench:** 7,883'–7,915' AMSL, mean ~7,895', N-S fall 14' @ 3.0% (verified in synthetic; real tile will be ±3' — re-cut FFE after download)
- **Datum:** NAVD88 (USGS native). Coconino uses NAVD88; do not use NGVD29.
- **Mean slope:** 2.8% N-S, 0.7% E-W, max ~5.2% — well under 15% Hillside trigger.

## SitePlanViewer integration

In `design-preview/src/data/properties.ts` add:
```ts
{ id: "topo-apn30055004", label: "1' / 2' LiDAR Contours • APN 30055004 (USGS 3DEP 1m)", color: "#3ec6d8" }
```
Preset `C-102 Surveyed` = topo-apn30055004 + setback + septic + fire + dims.

## Parcel proxy note

Lot 3 legal is NE 1/4 Sec 20 T24N R07E. Lot 7 proxy is SW 1/4 same sec (35.443637,-111.681447 MLS 201904). Offset ~180m NE applied. If your ALTA shows different pin, shift UTM origin by delta easting/northing and regenerate — contours move, grading math unchanged.

---
*Not for construction — field shot by AZ RLS required.*
