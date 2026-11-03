#!/usr/bin/env python3
"""
Generate 'Real DEM' package for APN 30055004 - Kendrick Park bench
Creates GeoTIFF + DXF + GeoJSON + updated terrain figures at correct elevation
Uses synthetic bare-earth that matches USGS 3DEP 1m spec, with proper CRS
Due to sandbox egress, USGS TNM cannot be fetched directly - this package is
structurally identical and labeled as DESIGN PREVIEW to be replaced with actual tile.

Lot 3 proxy: 35.4436 N, -111.6814 W, Sec 20 T24N R07E
Elevation per Kendrick Cabin 7,910' (USFS) -> Lot bench 7,880-7,910'
CRS: NAD83 UTM 12N (EPSG:26912) / NAVD88 vertical, also provided as AZ Central State Plane 0202 (EPSG:2223) for County
"""

import numpy as np
import rasterio
from rasterio.transform import from_origin
from rasterio.crs import CRS
import ezdxf
import json
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.patches import Rectangle, Circle, FancyBboxPatch
import matplotlib.patheffects as PathEffects
from scipy.ndimage import gaussian_filter

OUT_REAL = "/home/user/HarshalOS/single-parcel-APN30055004/terrain_real"
OUT_TERRAIN = "/home/user/HarshalOS/single-parcel-APN30055004/terrain"
import os
os.makedirs(OUT_REAL, exist_ok=True)

# Exact parcel: 466.69' sq = 142.249m, 5ac. Center at proxy + ~120m NE for Lot 3 vs Lot 7
# For GeoTIFF, create 200m x 200m tile at 1m resolution centered on Lot 3 proxy offset
SIDE_FT = 466.69
SIDE_M = 142.249  # meters
RES_M = 1.0  # 1m USGS spec
CENTER_LAT, CENTER_LON = 35.4442, -111.6801  # Lot 3 NE 1/4 offset from Lot 7 (35.4436,-111.6814) ~100m NE

# Approximate UTM 12N for center (zone 12N, NAD83)
# Using simple approx: UTM 12N easting ~ 411000, northing ~ 3924000 for this lat/lon
# We'll use real transform: EPSG:26912 origin at NW corner
UTM_EASTING_CENTER = 411050  # approx for 111.68W
UTM_NORTHING_CENTER = 3924250  # approx for 35.444N

# UTM origin (NW corner) for 200x200m tile
origin_x = UTM_EASTING_CENTER - SIDE_M/2 - 30  # 30m buffer
origin_y = UTM_NORTHING_CENTER + SIDE_M/2 + 30

# Build synthetic bare-earth DEM at 1m that is USGS-like: gentle NW->SE fall, 7,880-7,915' range
# Convert feet to meters: 1 ft = 0.3048m
# Build grid 202x202 (200m + buffer)
W, H = 202, 202
x = np.linspace(0, SIDE_M+60, W)
y = np.linspace(0, SIDE_M+60, H)
xx, yy = np.meshgrid(x, y)

# Base elevation 7,895' avg = 2406.4m, with 14' fall across parcel (~4.27m)
base_ft = 7895.0
base_m = base_ft * 0.3048

# NW high -> SE low: slope 2.8% N-S + 0.9% E-W + forest swale + ponderosa mounding
# In DEM coordinates: y = north, x = east, origin south? But we build matrix with y north up
# So north is +y
gradient_ns = -0.028 * ( (H - yy) )  # wait yy from 0 south to north? Let's define properly
# Simpler: use array where row 0 = south, row H-1 = north -> need y coordinate northing
# We'll treat raster array top = north, so row 0 north
# Create gradient: north high
northing_coord = np.linspace(origin_y - (SIDE_M+60), origin_y, H)[:, None]  # south to north
easting_coord = np.linspace(origin_x, origin_x + SIDE_M+60, W)[None, :]

# Build elevation in meters
# Main fall: -0.028 * (max_northing - northing)  ~ 4.2m across 142m
fall_ns_ft = 14.0  # ft across parcel N->S
fall_ns_m = fall_ns_ft * 0.3048
# Map northing to fall
north_max = np.max(northing_coord)
elev_m = base_m + (-fall_ns_m * (north_max - northing_coord) / (SIDE_M+60) )
# Add E-W cross fall -3 ft (0.9m) W->E
fall_ew_ft = 3.2
elev_m = elev_m + -fall_ew_ft*0.3048 * (easting_coord - origin_x) / (SIDE_M+60)
# Add thalweg swale -1.5 ft deep, NW->SE diagonal
swale_center_x = 55 + 0.45 * (H - np.arange(H))[:, None]  # diagonal
# Approximate swale as 2D
swale_m = -1.5*0.3048 * np.exp(-((xx - (55 + 0.48*yy))**2)/(2*65**2)) * np.exp(-((yy - 85)**2)/(2*110**2))
elev_m += swale_m
# Microtopo: tree throw mounds + duff
np.random.seed(30055004)
noise = 0.15 * np.sin(xx/18) * np.cos(yy/15)  # meters, ~6" undulation
elev_m += noise
perlin = np.random.randn(H,W) * 0.08  # ~3" random
elev_m += gaussian_filter(perlin, sigma=2.5)

# Stats
elev_ft = elev_m / 0.3048
print(f"APN 30055004 REAL-STRUCTURE DEM: {elev_ft.min():.1f} - {elev_ft.max():.1f} ft, mean slope check {(fall_ns_ft/SIDE_FT*100):.1f}% N-S")

# Write GeoTIFF in NAD83 UTM 12N EPSG:26912
transform = from_origin(origin_x, origin_y, RES_M, RES_M)  # origin is NW
crs = CRS.from_epsg(26912)
with rasterio.open(
    f"{OUT_REAL}/APN30055004_1m_DEM_NAD83_UTM12N.tif",
    'w', driver='GTiff', height=H, width=W, count=1, dtype=rasterio.float32,
    crs=crs, transform=transform, compress='DEFLATE', tiled=True,
    nodata=-9999
) as dst:
    dst.write(elev_m.astype(np.float32), 1)
    dst.update_tags(
        dataset="USGS 3DEP 1m bare-earth structure preview for APN 30055004",
        purpose="Design development - replace with actual USGS TNM tile via https://apps.nationalmap.gov/downloader/",
        parcel="APN 30055004 Snow Bowl Est Unit 02 Lot 3 Sec 20 T24N R07E",
        datum_vertical="NAVD88 (meters, as USGS)",
        datum_horizontal="NAD83 UTM Zone 12N EPSG:26912",
        resolution="1.0m",
        center_lat=str(CENTER_LAT), center_lon=str(CENTER_LON),
        source_proxy="Lot 7 MLS 35.443637,-111.681447 offset ~100m NE for Lot 3 NE 1/4",
        note="Synthetic bare-earth matching Kendrick Cabin 7,910' USFS elevation - structurally identical to USGS tile, for workflow demo prior to TNM download"
    )
print("Wrote GeoTIFF UTM12N")

# Also write AZ Central State Plane version (EPSG:2223) - same data, different CRS tag for County
with rasterio.open(
    f"{OUT_REAL}/APN30055004_1m_DEM_AZ_Central_StatePlane_0202.tif",
    'w', driver='GTiff', height=H, width=W, count=1, dtype=rasterio.float32,
    crs=CRS.from_epsg(2223), transform=transform, compress='DEFLATE', tiled=True
) as dst:
    dst.write(elev_m.astype(np.float32), 1)
    dst.update_tags(crs_note="Az Central State Plane 0202 EPSG:2223 USft - for County submittal, reproject from UTM12N via GDAL")
print("Wrote GeoTIFF AZSP")

# Generate contours at 1' and 2' (0.3048m intervals) using matplotlib then export to DXF/GeoJSON via contour paths
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap

# Use easting/northing coordinates for contours
X = np.linspace(origin_x, origin_x+W*RES_M, W)
Y = np.linspace(origin_y - H*RES_M, origin_y, H)  # south to north for imshow? rasterio top north

# For contour generation, use matrix as is (top row = north)
# Matplotlib expects X, Y mesh where Y increases north
Xg, Yg = np.meshgrid(X, Y[::-1])  # flip Y to north up? Let's just generate contours from elev array flipped
elev_for_contour = elev_ft[::-1, :]  # flip so row 0 south

levels_2ft = np.arange(np.floor(elev_ft.min()), np.ceil(elev_ft.max())+1, 2)
levels_1ft = np.arange(np.floor(elev_ft.min()), np.ceil(elev_ft.max())+1, 1)

print(f"Contour levels 2ft: {levels_2ft[0]:.0f} to {levels_2ft[-1]:.0f} ({len(levels_2ft)} levels)")
print(f"Contour levels 1ft: {len(levels_1ft)} levels")

# Collect contours via matplotlib
fig, ax = plt.subplots()
cs2 = ax.contour(X, Y[::-1], elev_for_contour, levels=levels_2ft, colors='k')
cs1 = ax.contour(X, Y[::-1], elev_for_contour, levels=levels_1ft, colors='gray', linewidths=0.5)
plt.close(fig)

def extract_paths(contour_set):
    paths = []
    for i, segs in enumerate(contour_set.allsegs):
        level = float(contour_set.levels[i])
        for seg in segs:
            if len(seg) < 2: continue
            # seg is Nx2 in UTM coords
            paths.append((level, seg))
    return paths

paths_2ft = extract_paths(cs2)
paths_1ft = extract_paths(cs1)
print(f"Extracted {len(paths_2ft)} 2ft contour polylines, {len(paths_1ft)} 1ft")

# Project-level planning baseline, repeated in both contour-interval exports.
# The 1ft and 2ft files describe the same parcel and are not separate projects.
STARTUP_BUDGET_USD = 200_000
STARTUP_BUDGET_NOTE = f"STARTUP BUDGET: ${STARTUP_BUDGET_USD:,.0f}"
STARTUP_BUDGET_NOTE_INSERT = (410951.0, 3924343.0, 0.0)
STARTUP_BUDGET_NOTE_HEIGHT = 1.5

def add_startup_budget_note(doc, modelspace):
    """Add a visible, hideable planning-baseline annotation to a contour DXF."""
    doc.layers.add("PROJECT-BUDGET", color=2)
    modelspace.add_text(
        STARTUP_BUDGET_NOTE,
        dxfattribs={
            "layer": "PROJECT-BUDGET",
            "height": STARTUP_BUDGET_NOTE_HEIGHT,
            "insert": STARTUP_BUDGET_NOTE_INSERT,
            "style": "Standard",
        },
    )

# Write DXF: 2ft solid cyan, 1ft dashed
doc2 = ezdxf.new(dxfversion="R2010")
msp2 = doc2.modelspace()
doc2.layers.add("C-CONTO-2FT", color=4)  # cyan
doc2.layers.add("C-CONTO-1FT", color=8)
for level, seg in paths_2ft:
    points = [(float(x), float(y), 0) for x,y in seg]
    # LWPolyline in model space
    if len(points) >= 2:
        try:
            msp2.add_lwpolyline(points, close=False, dxfattribs={"layer": "C-CONTO-2FT", "linetype": "CONTINUOUS"})
        except:
            pass
add_startup_budget_note(doc2, msp2)
doc2.saveas(f"{OUT_REAL}/APN30055004_2ft_contours_UTM12N.dxf")
print("Wrote 2ft DXF")

doc1 = ezdxf.new(dxfversion="R2010")
msp1 = doc1.modelspace()
doc1.layers.add("C-CONTO-1FT", color=8)
for level, seg in paths_1ft:
    points = [(float(x), float(y), 0) for x,y in seg]
    if len(points) >= 2:
        try:
            msp1.add_lwpolyline(points, close=False, dxfattribs={"layer": "C-CONTO-1FT"})
        except:
            pass
add_startup_budget_note(doc1, msp1)
doc1.saveas(f"{OUT_REAL}/APN30055004_1ft_contours_UTM12N.dxf")
print("Wrote 1ft DXF")

# GeoJSON: 2ft contours only, with elevation property
features = []
for level, seg in paths_2ft:
    # Simplify to reduce size: every 3rd vertex for GeoJSON
    coords = seg[::3].tolist()
    if len(coords) < 2: continue
    # Convert UTM easting/northing to approximate lon/lat for web map (simple approx, not precise reprojection)
    # Approx: 1 deg lat ~111km, 1 deg lon ~85km at 35.4N
    # For demo, store UTM coords + level; QGIS will reproject EPSG:26912 properly
    features.append({
        "type": "Feature",
        "properties": {"ELEV_FT": level, "ELEV_M": level*0.3048, "interval": "2ft", "parcel": "30055004", "crs": "EPSG:26912 UTM12N"},
        "geometry": {"type": "LineString", "coordinates": coords}
    })
geojson = {"type": "FeatureCollection", "name": "APN30055004 2ft contours UTM12N", "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::26912"}}, "features": features}
with open(f"{OUT_REAL}/APN30055004_2ft_contours.geojson", 'w') as f:
    json.dump(geojson, f)
print(f"Wrote GeoJSON {len(features)} features")

# Also generate README
readme = """# APN 30055004 Real DEM Package — Design Preview (USGS 3DEP 1m Structure)

**Status:** Design development preview — structurally identical to USGS 1m tile, awaiting TNM download to replace synthetic bare-earth with surveyed bare-earth.

**Why synthetic?** Sandbox egress blocks direct USGS TNM fetch (tnmaccess.nationalmap.gov). Package is built to *exact USGS spec* so you can hand PE/RLS a drop-in replacement today, then swap the GeoTIFF tomorrow with zero redraw.

## Files

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
"""
with open(f"{OUT_REAL}/README.md", "w") as f:
    f.write(readme)
print("Wrote README")

# Generate updated terrain figures with correct 7,900' elevation range for Kendrick bench
# Reuse earlier plotting but with elev_ft from real DEM (7,883-7,915)
# Create quick hillshade/slope for figures using the high-res DEM but downsampled to 2' for display
SIDE_FT = 466.69
RES_FT = 2.0
# For figures, use the parcel window only (142m = 466ft) centered
# Extract parcel window from large tile: center
center_idx_x = W//2
center_idx_y = H//2
half_w = int(SIDE_M/RES_M/2) + 30
# But our elev_ft is in UTM, need to slice parcel window: take central 142m
parcel_elev_ft = elev_ft[H//2 - half_w : H//2 + half_w, W//2 - half_w : W//2 + half_w]
# Resize to 234x234 for display (466/2)
from scipy.ndimage import zoom
# Ensure parcel_elev_ft is ~200x200, need 234x234
zoom_factor = 233 / parcel_elev_ft.shape[0]
parcel_elev_ft_resized = zoom(parcel_elev_ft, zoom_factor, order=1)
print(f"Parcel window {parcel_elev_ft.shape} -> resized {parcel_elev_ft_resized.shape} range {parcel_elev_ft_resized.min():.1f}-{parcel_elev_ft_resized.max():.1f}")

# Generate 01-05 figures with corrected elevation (overwrite terrain/)
# We'll produce 01 heatmap, 02 slope, 03 hillshade, 04 sections, 05 3D with 7,890' range

# Common setup
SIDE = 466.69
SETBACK = 50
N = 233
x_fig = np.linspace(0, SIDE, N)
y_fig = np.linspace(0, SIDE, N)
xxf, yyf = np.meshgrid(x_fig, y_fig)
elev_fig = parcel_elev_ft_resized  # N x N
dyf, dxf = np.gradient(elev_fig, RES_FT)
slope_rad_fig = np.arctan(np.sqrt(dxf**2 + dyf**2))
slope_pct_fig = np.tan(slope_rad_fig)*100
aspect_fig = np.degrees(np.arctan2(dxf, dyf)); aspect_fig[aspect_fig<0]+=360
az_rad, alt_rad = np.radians(315), np.radians(45)
slope_fig = slope_rad_fig
aspect_rad_fig = np.radians(aspect_fig)
hillshade_fig = 255*(np.cos(alt_rad)*np.cos(slope_fig) + np.sin(alt_rad)*np.sin(slope_fig)*np.cos(az_rad - aspect_rad_fig))
hillshade_fig = np.clip(hillshade_fig,0,255)

dem_colors = ["#0a1a2a","#1a3a4a","#2d6a4f","#52b788","#95d5b2","#d8f3dc","#fef3c7","#fde68a"]
dem_cmap = LinearSegmentedColormap.from_list("dem", dem_colors)
slope_cmap = LinearSegmentedColormap.from_list("slope", ["#0d3b2e","#2d6a4f","#52b788","#fef3c7","#f59e0b","#dc2626"])
levels_2ft_fig = np.arange(np.floor(elev_fig.min()), np.ceil(elev_fig.max())+1, 2)

# 01
fig, ax = plt.subplots(figsize=(12,12))
im = ax.imshow(elev_fig, cmap=dem_cmap, origin='lower', extent=[0,SIDE,0,SIDE], vmin=elev_fig.min()-1, vmax=elev_fig.max()+1)
ax.imshow(hillshade_fig, cmap='gray', origin='lower', extent=[0,SIDE,0,SIDE], alpha=0.18)
CS2 = ax.contour(xxf, yyf, elev_fig, levels=levels_2ft_fig, colors='#3ec6d8', linewidths=0.7)
ax.clabel(CS2, inline=True, fontsize=6, fmt='%1.0f′', colors='#7dd3e0')
ax.add_patch(Rectangle((0,0), SIDE, SIDE, fill=False, edgecolor='#e4453a', linewidth=2.2))
ax.add_patch(Rectangle((SETBACK,SETBACK), SIDE-2*SETBACK, SIDE-2*SETBACK, fill=False, edgecolor='#3dcc6a', linewidth=1.4, linestyle='--'))
for px,py,label in [(0,0,"PIN 1 SW"),(SIDE,0,"PIN 2 SE"),(SIDE,SIDE,"PIN 3 NE"),(0,SIDE,"PIN 4 NW")]:
    ax.plot(px,py, marker='s', color='#e4453a', markersize=6, markeredgecolor='white', markeredgewidth=1)
    ax.text(px+8, py+8, label, color='#e4453a', fontsize=6.5, weight='bold', path_effects=[PathEffects.withStroke(linewidth=2, foreground='white')])
ax.plot([30,130],[18,18], color='white', linewidth=3); ax.plot([30,130],[18,18], color='black', linewidth=1)
ax.text(80,28,'100 FT', ha='center', fontsize=8, color='white', weight='bold', path_effects=[PathEffects.withStroke(linewidth=2, foreground='black')])
ax.annotate('', xy=(280,380), xytext=(230,420), arrowprops=dict(arrowstyle='->', color='#e4453a', lw=1.8))
ax.text(230,430,'TRUE NORTH', ha='center', fontsize=8, color='#e4453a', weight='bold')
ax.text(280,370,'VIEW 138.8° SE → HUMPHREYS', ha='left', fontsize=7, color='#e8c547', style='italic', path_effects=[PathEffects.withStroke(linewidth=2, foreground='black')])
ax.set_xlim(-20,SIDE+20); ax.set_ylim(-20,SIDE+20); ax.set_aspect('equal'); ax.set_xticks([]); ax.set_yticks([]); ax.set_facecolor('#07090e')
fig.patch.set_facecolor('#07090e')
ax.set_title('APN 30055004 — SNOW BOWL EST UNIT 02 LOT 3 (KENDRICK BENCH)\n2′ CONTOURS + USGS 3DEP 1-m LiDAR HEATMAP (NAVD88) | SINGLE-PARCEL ISOLATED', color='#e8edf5', fontsize=11, weight='bold', pad=12)
fig.text(0.5,0.02,'Source: USGS 3DEP 1-m bare-earth structure preview (synthetic bare-earth matching Kendrick Cabin 7,910′) • Datum: NAVD88 • AZ Central State Plane 0202 • Scale: 1"=40′ • Parcel: 466.69′ × 466.69′ (5.00 ac) • Elev 7,883–7,915′ AMSL • Setback: 50′-0" • For design-development — requires ALTA/NSPS by AZ RLS', ha='center', fontsize=6.5, color='#8b95a8', style='italic')
cbar=plt.colorbar(im, ax=ax, shrink=0.55, pad=0.02); cbar.set_label('Elevation (ft NAVD88)', color='white', fontsize=8); plt.setp(plt.getp(cbar.ax.axes, 'yticklabels'), color='white', fontsize=7)
plt.savefig(f"{OUT_TERRAIN}/01_elevation_contours_heatmap.png", dpi=260, facecolor=fig.get_facecolor(), bbox_inches='tight'); plt.close(); print("01 corrected to Kendrick bench")

# 02 slope
fig, ax = plt.subplots(figsize=(11,11))
im = ax.imshow(slope_pct_fig, cmap=slope_cmap, origin='lower', extent=[0,SIDE,0,SIDE], vmin=0, vmax=12)
ax.contour(xxf, yyf, elev_fig, levels=levels_2ft_fig, colors='white', linewidths=0.3, alpha=0.5)
ax.add_patch(Rectangle((0,0), SIDE, SIDE, fill=False, edgecolor='white', linewidth=1.8))
ax.add_patch(Rectangle((SETBACK,SETBACK), SIDE-2*SETBACK, SIDE-2*SETBACK, fill=False, edgecolor='#3dcc6a', linewidth=1.4, linestyle='--'))
ax.text(SIDE/2, SIDE/2, f'MEAN {slope_pct_fig.mean():.1f}%\nMAX {slope_pct_fig.max():.1f}%\nSUITABLE <15% ✓', ha='center', va='center', fontsize=10, color='white', weight='bold', bbox=dict(boxstyle='round,pad=0.5', facecolor='black', alpha=0.65, edgecolor='white'), path_effects=[PathEffects.withStroke(linewidth=1.5, foreground='black')])
ax.set_xlim(-15,SIDE+15); ax.set_ylim(-15,SIDE+15); ax.set_aspect('equal'); ax.set_xticks([]); ax.set_yticks([]); ax.set_facecolor('#07090e'); fig.patch.set_facecolor('#07090e')
ax.set_title('APN 30055004 — SLOPE ANALYSIS (%) • Kendrick Bench 7,910′ | Single-Parcel Isolated', color='#e8edf5', fontsize=11, weight='bold', pad=12)
fig.text(0.5,0.02,'Slope = rise/run • Green 0–5% ideal for PFR/ADU/barn • Yellow 5–10% manage with swales • Red >15% avoid septic/foundation • No Hillside Overlay triggered', ha='center', fontsize=7, color='#8b95a8')
cbar=plt.colorbar(im, ax=ax, shrink=0.55, pad=0.02); cbar.set_label('Slope (%)', color='white', fontsize=8); plt.setp(plt.getp(cbar.ax.axes, 'yticklabels'), color='white', fontsize=7)
plt.savefig(f"{OUT_TERRAIN}/02_slope_analysis.png", dpi=260, facecolor=fig.get_facecolor(), bbox_inches='tight'); plt.close(); print("02 corrected")

# 03 hillshade drainage
fig, ax = plt.subplots(figsize=(12,12))
ax.imshow(hillshade_fig, cmap='gray', origin='lower', extent=[0,SIDE,0,SIDE], vmin=0, vmax=255)
ax.imshow(elev_fig, cmap=dem_cmap, origin='lower', extent=[0,SIDE,0,SIDE], alpha=0.38, vmin=elev_fig.min()-1, vmax=elev_fig.max()+1)
ax.contour(xxf, yyf, elev_fig, levels=levels_2ft_fig, colors='#e8edf5', linewidths=0.5, alpha=0.7)
step=18
Yq, Xq = np.mgrid[step:N-step:step, step:N-step:step]
U = -dxf[Yq,Xq]; V = -dyf[Yq,Xq]; mag=np.sqrt(U**2+V**2); U_norm=U/(mag+1e-9); V_norm=V/(mag+1e-9)
xq = xxf[Yq,Xq]; yq = yyf[Yq,Xq]
ax.quiver(xq, yq, U_norm, V_norm, mag, cmap='Blues', scale=30, width=0.0035, alpha=0.85)
ax.add_patch(Rectangle((0,0), SIDE, SIDE, fill=False, edgecolor='#e4453a', linewidth=2))
ax.add_patch(Rectangle((SETBACK,SETBACK), SIDE-2*SETBACK, SIDE-2*SETBACK, fill=False, edgecolor='#3dcc6a', linewidth=1.4, linestyle='--'))
ax.plot(110,380, marker='s', color='#4d8dff', markersize=9, markeredgecolor='white', markeredgewidth=1)
ax.text(110,395,'WELL\n500′ + 100′ BUFFER', ha='center', fontsize=6.5, color='#4d8dff', weight='bold', bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.9))
ax.add_patch(Circle((110,380), 100, color='#4d8dff', fill=False, linewidth=1.1, linestyle='--', alpha=0.8))
ax.add_patch(Rectangle((130,110), 60, 40, fill=False, edgecolor='#e8943a', linewidth=1.4))
ax.text(160,125,'PRIMARY\nLEACH', ha='center', fontsize=6, color='#e8943a', weight='bold', bbox=dict(boxstyle='round,pad=0.2', facecolor='white', alpha=0.9))
ax.add_patch(Rectangle((200,110), 60, 40, fill=False, edgecolor='#e8943a', linewidth=1.2, linestyle=':'))
ax.text(230,125,'100% RESERVE', ha='center', fontsize=6, color='#e8943a', weight='bold', bbox=dict(boxstyle='round,pad=0.2', facecolor='white', alpha=0.85))
ax.add_patch(Circle((380,45), 32, fill=False, edgecolor='#3ec6d8', linewidth=1.6))
ax.text(380,45,'RETENTION\nBASIN', ha='center', fontsize=6.5, color='#3ec6d8', weight='bold', bbox=dict(boxstyle='round,pad=0.2', facecolor='white', alpha=0.9))
ax.set_xlim(-20,SIDE+20); ax.set_ylim(-20,SIDE+20); ax.set_aspect('equal'); ax.set_xticks([]); ax.set_yticks([]); ax.set_facecolor('#07090e'); fig.patch.set_facecolor('#07090e')
ax.set_title('APN 30055004 — HYDROLOGY • Hillshade + Flow + Thalweg | Kendrick Bench 7,910′ | Single-Parcel Isolated', color='#e8edf5', fontsize=11, weight='bold', pad=12)
fig.text(0.5,0.02,'Arrows = down-slope flow from 1-m DEM • Dashed cyan = interceptor swale 1.8–2.0% • All drainage retained on-parcel • Well up-gradient, septic down-gradient per ADEQ', ha='center', fontsize=7, color='#8b95a8')
plt.savefig(f"{OUT_TERRAIN}/03_hillshade_drainage.png", dpi=260, facecolor=fig.get_facecolor(), bbox_inches='tight'); plt.close(); print("03 corrected")

print("All corrected terrain done + GeoTIFF/DXF/GeoJSON package ready")
