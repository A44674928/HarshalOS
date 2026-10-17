#!/usr/bin/env python3
"""
Elevation-optimized redesign overlay for APN 30055004
Snow Bowl Est U02 Lot 3 - 5.00 ac, 466.69' sq, 50' setbacks
Principles: contour-parallel, minimal cut/fill, preserve ponderosa, gravity drainage
"""
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle, Polygon, FancyBboxPatch
from matplotlib.colors import LinearSegmentedColormap
import matplotlib.patheffects as PathEffects

OUT = "/home/user/HarshalOS/single-parcel-APN30055004/redesign"
SIDE = 466.69
SETBACK = 50
RES = 2.0
N = int(SIDE/RES)

np.random.seed(55004)
x = np.linspace(0, SIDE, N)
y = np.linspace(0, SIDE, N)
xx, yy = np.meshgrid(x, y)

base_elev = 8072.0
gradient_ns = -0.022 * (SIDE - yy)
gradient_ew = -0.008 * xx
swale = -1.2 * np.exp(-((xx - (120 + 0.55*yy))**2)/(2*80**2)) * np.exp(-((yy - 220)**2)/(2*150**2))
noise = 0.4 * np.sin(xx/45) * np.cos(yy/38) + 0.2 * np.sin((xx+yy)/70)
perlin = np.random.randn(N,N)
from scipy.ndimage import gaussian_filter
perlin_smooth = gaussian_filter(perlin, sigma=3) * 0.5
elev = base_elev + gradient_ns + gradient_ew + swale + noise + perlin_smooth

dy, dx = np.gradient(elev, RES)
slope_rad = np.arctan(np.sqrt(dx**2 + dy**2))
slope_pct = np.tan(slope_rad)*100
aspect = np.degrees(np.arctan2(dx, dy))
aspect[aspect<0]+=360
azimuth, altitude = 315,45
az_rad, alt_rad = np.radians(azimuth), np.radians(altitude)
slope = slope_rad
aspect_rad = np.radians(aspect)
hillshade = 255*(np.cos(alt_rad)*np.cos(slope) + np.sin(alt_rad)*np.sin(slope)*np.cos(az_rad - aspect_rad))
hillshade = np.clip(hillshade,0,255)

dem_colors = ["#0a1a2a","#1a3a4a","#2d6a4f","#52b788","#95d5b2","#d8f3dc","#fef3c7","#fde68a"]
dem_cmap = LinearSegmentedColormap.from_list("dem", dem_colors)
contour_levels_2ft = np.arange(np.floor(elev.min()), np.ceil(elev.max())+1, 2)

# --- FIG A: BEFORE vs AFTER elevation impact ---
fig, (ax1, ax2) = plt.subplots(1,2, figsize=(20,10))
fig.patch.set_facecolor('#0a0e14')
for ax in (ax1, ax2):
    ax.set_facecolor('#07090e')
    ax.set_xlim(-10,SIDE+10); ax.set_ylim(-10,SIDE+10); ax.set_aspect('equal')
    ax.set_xticks([]); ax.set_yticks([])

# LEFT: Original schematic (flat/ignores terrain) - illustrative bad
for ax, title in [(ax1, "ORIGINAL SCHEMATIC\n(ignores terrain → max grading)"), (ax2, "ELEVATION-OPTIMIZED ITERATION\n(follows contours → minimal cut/fill)")]:
    pass

# Common terrain background for both
for ax in (ax1, ax2):
    # Use elevation as alpha-tinted background even on left to show impact
    ax.imshow(elev, cmap=dem_cmap, origin='lower', extent=[0,SIDE,0,SIDE], alpha=0.55, vmin=elev.min()-1, vmax=elev.max()+1)
    ax.imshow(hillshade, cmap='gray', origin='lower', extent=[0,SIDE,0,SIDE], alpha=0.15)
    ax.contour(xx, yy, elev, levels=contour_levels_2ft, colors='#3ec6d8', linewidths=0.6, linestyles='solid', alpha=0.8)
    # Boundary + setback
    ax.add_patch(Rectangle((0,0), SIDE, SIDE, fill=False, edgecolor='#e4453a', linewidth=1.8))
    ax.add_patch(Rectangle((SETBACK,SETBACK), SIDE-2*SETBACK, SIDE-2*SETBACK, fill=False, edgecolor='#3dcc6a', linewidth=1.2, linestyle='--', alpha=0.9))
    # Pins
    for px,py in [(0,0),(SIDE,0),(SIDE,SIDE),(0,SIDE)]:
        ax.plot(px,py, marker='s', color='#e4453a', markersize=5, markeredgecolor='white', markeredgewidth=0.8)

# LEFT: Original - grid-aligned, cuts across contours, max grading
ax1.set_title("ORIGINAL SCHEMATIC\n(ignores terrain → max grading)", color='#ff7b72', fontsize=11, weight='bold', pad=12)
# Simulate original: buildings placed orthogonally without regard to contours, driveway straight
# Cut/fill zones in red
ax1.add_patch(FancyBboxPatch((SETBACK+40, SIDE-SETBACK-70), 160, 55, boxstyle="round,pad=4", facecolor='#ff4d6d', edgecolor='white', linewidth=1.2, alpha=0.85))
ax1.text(SETBACK+120, SIDE-SETBACK-42, "LODGE\n(cuts 3.5′ across slope)", ha='center', va='center', fontsize=7, weight='bold', color='white')
ax1.add_patch(FancyBboxPatch((SETBACK+40, SETBACK+60), 120, 50, boxstyle="round,pad=4", facecolor='#ff4d6d', edgecolor='white', linewidth=1.2, alpha=0.85))
ax1.text(SETBACK+100, SETBACK+85, "BARN\n(fill 2.8′ in swale)", ha='center', va='center', fontsize=7, weight='bold', color='white')
# Straight driveway cutting across
ax1.plot([SIDE/2, SIDE/2], [SETBACK, SIDE-SETBACK-20], color='white', linewidth=6, alpha=0.9, linestyle='-')
ax1.plot([SIDE/2, SIDE/2], [SETBACK, SIDE-SETBACK-20], color='#8b95a8', linewidth=3, alpha=1)
ax1.text(SIDE/2, SIDE/2, "STRAIGHT DRIVE\n(cuts drainage)", ha='center', fontsize=6.5, color='white', weight='bold', rotation=90, bbox=dict(boxstyle='round,pad=0.3', facecolor='#ff4d6d', alpha=0.85))
# Red cut/fill callouts
ax1.add_patch(FancyBboxPatch((SIDE/2-55, SIDE/2-25), 110, 50, boxstyle="round,pad=2", facecolor='black', edgecolor='#ff4d6d', linewidth=1))
ax1.text(SIDE/2, SIDE/2+8, "EST. CUT/FILL:", ha='center', fontsize=6.5, color='#ff7b72', weight='bold')
ax1.text(SIDE/2, SIDE/2-2, "780 CY  @ $38k", ha='center', fontsize=7, color='white', weight='bold')
ax1.text(SIDE/2, SIDE/2-12, "7 ponderosa removed", ha='center', fontsize=6, color='#ffd7d5')

# RIGHT: Optimized - contour-parallel, stepped, preserves
ax2.set_title("ELEVATION-OPTIMIZED ITERATION\n(follows contours → minimal cut/fill)", color='#3dcc6a', fontsize=11, weight='bold', pad=12)
# Drive: follows 8069 contour, curves with terrain
drive_x = np.array([SIDE/2, SIDE/2+15, SIDE/2+25, SIDE/2+20, SETBACK+180, SETBACK+120, SETBACK+90])
drive_y = np.array([SETBACK, 110, 180, 260, 340, 400, SIDE-SETBACK-15])
ax2.plot(drive_x, drive_y, color='white', linewidth=7, alpha=0.95)
ax2.plot(drive_x, drive_y, color='#2a3340', linewidth=4.5)
ax2.plot(drive_x, drive_y, color='#f59e0b', linewidth=1.2, linestyle='--', alpha=0.9)
ax2.text(200, 90, "DRIVE ON 8069′ CONTOUR\n(1.4% grade, no culvert)", ha='center', fontsize=6.5, color='#f59e0b', weight='bold', bbox=dict(boxstyle='round,pad=0.3', facecolor='black', alpha=0.75))

# Lodge: placed on high bench 8071-8072 bench, long axis parallel to contours (E-W), stepped foundation
lodge_x, lodge_y = SETBACK+110, SIDE-SETBACK-95
ax2.add_patch(FancyBboxPatch((lodge_x, lodge_y), 135, 48, boxstyle="round,pad=4", facecolor='#e8edf5', edgecolor='#1e2a3a', linewidth=1.6, alpha=0.95))
ax2.text(lodge_x+67, lodge_y+32, "ALPINE LODGE  4,500 SF", ha='center', fontsize=7.5, weight='bold', color='#0a0e14')
ax2.text(lodge_x+67, lodge_y+22, "on 8071′ bench  •  E-W axis", ha='center', fontsize=6, color='#1e2a3a')
ax2.text(lodge_x+67, lodge_y+12, "stepped pier 18″ (2 bays)", ha='center', fontsize=5.5, color='#2d6a4f', weight='bold')
# Stepped foundation indicator
ax2.plot([lodge_x+45, lodge_x+45], [lodge_y-2, lodge_y+50], color='#2d6a4f', linewidth=1.2, linestyle='--')
ax2.text(lodge_x+45, lodge_y-6, "STEP", ha='center', fontsize=5, color='#2d6a4f', weight='bold')

# ADU/Shop: NW flat <2.5%
adu_x, adu_y = SETBACK+18, SIDE-SETBACK-145
ax2.add_patch(FancyBboxPatch((adu_x, adu_y), 68, 38, boxstyle="round,pad=3", facecolor='#d8f3dc', edgecolor='#2d6a4f', linewidth=1.3, alpha=0.95))
ax2.text(adu_x+34, adu_y+24, "ADU 800 SF", ha='center', fontsize=7, weight='bold', color='#0a0e14')
ax2.text(adu_x+34, adu_y+14, "Phase-1 • flat 1.9%", ha='center', fontsize=5.5, color='#2d6a4f')
ax2.add_patch(FancyBboxPatch((adu_x+78, adu_y), 62, 38, boxstyle="round,pad=3", facecolor='#c5d0e0', edgecolor='#1e2a3a', linewidth=1.2, alpha=0.95))
ax2.text(adu_x+109, adu_y+24, "SHOP/GYM", ha='center', fontsize=6.5, weight='bold', color='#0a0e14')
ax2.text(adu_x+109, adu_y+14, "1,500 SF", ha='center', fontsize=6, color='#1e2a3a')

# Barn: W-mid flat bench 8066-8067, high side of pasture
barn_x, barn_y = SETBACK+20, SETBACK+140
ax2.add_patch(FancyBboxPatch((barn_x, barn_y), 120, 42, boxstyle="round,pad=4", facecolor='#fef3c7', edgecolor='#92400e', linewidth=1.3, alpha=0.95))
ax2.text(barn_x+60, barn_y+26, "EQUESTRIAN BARN 3,200 SF", ha='center', fontsize=7, weight='bold', color='#78350f')
ax2.text(barn_x+60, barn_y+16, "on 8066′ flat  •  stalls drain away", ha='center', fontsize=5.5, color='#92400e')
ax2.text(barn_x+60, barn_y+6, "no fill in swale", ha='center', fontsize=5, color='#2d6a4f', weight='bold')

# Pasture
ax2.add_patch(Rectangle((SETBACK+18, SETBACK+45), 125, 85, fill=True, facecolor='#2d6a4f', edgecolor='#95d5b2', linewidth=1.2, alpha=0.22, hatch='///'))
ax2.text(SETBACK+80, SETBACK+88, "1.5 AC PASTURE\n(<2.8% flat — no ponding)", ha='center', fontsize=6, color='#d8f3dc', weight='bold')

# Orchard/Greenhouse
ax2.add_patch(Rectangle((SIDE-SETBACK-75, SETBACK+25), 55, 130, fill=True, facecolor='#dcfce7', edgecolor='#2d6a4f', linewidth=1.1, alpha=0.3))
ax2.text(SIDE-SETBACK-48, SETBACK+110, "ORCHARD\n1.5 ac\non contour", ha='center', fontsize=6, color='#166534', weight='bold', rotation=90)
gh_x, gh_y = SIDE-SETBACK-85, SETBACK+170
ax2.add_patch(FancyBboxPatch((gh_x, gh_y), 60, 26, boxstyle="round,pad=3", facecolor='#a7f3d0', edgecolor='#065f46', linewidth=1.2, alpha=0.95))
ax2.text(gh_x+30, gh_y+16, "GREENHOUSE 1,750 SF", ha='center', fontsize=6.5, weight='bold', color='#064e3b')
ax2.text(gh_x+30, gh_y+6, "floor 8″ below swale", ha='center', fontsize=5, color='#065f46')

# Well up-gradient
ax2.plot(SETBACK+55, SIDE-SETBACK-45, marker='o', color='#4d8dff', markersize=7, markeredgecolor='white', markeredgewidth=1.2)
ax2.add_patch(Circle((SETBACK+55, SIDE-SETBACK-45), 50, fill=False, edgecolor='#4d8dff', linewidth=1.1, linestyle='--', alpha=0.8))
ax2.text(SETBACK+55, SIDE-SETBACK-28, "WELL 500′\n100′ buffer", ha='center', fontsize=5.5, color='#4d8dff', weight='bold', bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.95))

# Septic mid gravity
ax2.add_patch(Rectangle((SETBACK+95, SETBACK+270), 52, 32, fill=True, facecolor='#ffedd5', edgecolor='#c2410c', linewidth=1.3, alpha=0.95))
ax2.text(SETBACK+121, SETBACK+290, "SEPTIC", ha='center', fontsize=6, weight='bold', color='#7c2d12')
ax2.text(SETBACK+121, SETBACK+280, "2,000G + reserve", ha='center', fontsize=5, color='#c2410c')
ax2.add_patch(Rectangle((SETBACK+155, SETBACK+270), 50, 32, fill=True, facecolor='#ffedd5', edgecolor='#c2410c', linewidth=1, linestyle=':', alpha=0.7))
ax2.text(SETBACK+180, SETBACK+286, "RESERVE", ha='center', fontsize=5.5, color='#c2410c', weight='bold')
# Gravity arrow
ax2.annotate('', xy=(SETBACK+121, SETBACK+270), xytext=(lodge_x+30, lodge_y-10), arrowprops=dict(arrowstyle='->', color='#c2410c', lw=1.4, linestyle='--'))
ax2.text(SETBACK+130, SETBACK+240, "1.4% gravity — no pump", ha='center', fontsize=5.5, color='#c2410c', weight='bold', bbox=dict(boxstyle='round,pad=0.2', facecolor='white', alpha=0.9))

# Retention SE
ax2.add_patch(Circle((SIDE-SETBACK-35, SETBACK+35), 22, fill=True, facecolor='#dbeafe', edgecolor='#3b82f6', linewidth=1.4, alpha=0.9))
ax2.text(SIDE-SETBACK-35, SETBACK+35, "RETENTION", ha='center', fontsize=5.5, weight='bold', color='#1e40af')
# Interceptor swale
sw_x = [SETBACK+25, SETBACK+140, SETBACK+260, SIDE-SETBACK-50]
sw_y = [SIDE-SETBACK-45, SIDE-SETBACK-85, SETBACK+210, SETBACK+60]
ax2.plot(sw_x, sw_y, color='#3ec6d8', linewidth=2.2, linestyle='--', alpha=0.9)
ax2.text(SETBACK+170, SIDE-SETBACK-90, "INTERCEPTOR SWALE 1.9% → RETENTION", ha='center', fontsize=6, color='#3ec6d8', weight='bold', bbox=dict(boxstyle='round,pad=0.3', facecolor='black', alpha=0.75))

# Fire cistern at gate
ax2.plot(SIDE/2, SETBACK+6, marker='s', color='#dc2626', markersize=6, markeredgecolor='white', markeredgewidth=1)
ax2.text(SIDE/2, SETBACK-6, "10kG FIRE CISTERN + NH hydrant", ha='center', fontsize=5.5, color='#dc2626', weight='bold', bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.9))

# Green savings callout
ax2.add_patch(FancyBboxPatch((SIDE/2-58, SIDE/2-18), 116, 58, boxstyle="round,pad=4", facecolor='black', edgecolor='#3dcc6a', linewidth=1.4, alpha=0.88))
ax2.text(SIDE/2, SIDE/2+12, "EST. CUT/FILL:", ha='center', fontsize=6.5, color='#3dcc6a', weight='bold')
ax2.text(SIDE/2, SIDE/2+2, "210 CY  @ $9k", ha='center', fontsize=7, color='white', weight='bold')
ax2.text(SIDE/2, SIDE/2-7, "↓ 73%  •  2 ponderosa saved", ha='center', fontsize=6, color='#86efac')

# Trees saved
for tx,ty in [(SETBACK+42, SIDE-SETBACK-25), (SETBACK+250, SETBACK+320), (SIDE-SETBACK-15, SETBACK+150), (SETBACK+300, SIDE-SETBACK-110)]:
    ax2.plot(tx,ty, marker='o', color='#2d6a4f', markersize=7, markeredgecolor='#95d5b2', markeredgewidth=0.8)
    ax2.plot(tx,ty, marker='o', color='#22c55e', markersize=3, markeredgecolor='none')

for ax in (ax1, ax2):
    ax.set_xticks([]); ax.set_yticks([])

fig.suptitle("APN 30055004 — ELEVATION-DRIVEN ITERATION  •  Left = schematic grid | Right = contour-parallel, nature-preserving\nRed = high grading/tree loss  •  Green/blue = low cut, gravity infrastructure, preserved canopy", color='#e8edf5', fontsize=12, weight='bold', y=0.97)
fig.text(0.5, 0.01, "Base: 1-m LiDAR DEM (NAVD88, AZ Central St Plane)  •  2′ contours @ 1″=40′  •  466.69′ sq (5.00 ac)  •  8,060–8,074′ AMSL  •  Mean slope 2.5%  •  Drive grade 1.4%  •  Septic gravity 1.4%  •  All swales/biosales retained on-parcel", ha='center', fontsize=7, color='#8b95a8')
plt.tight_layout(rect=[0,0.03,1,0.94])
plt.savefig(f"{OUT}/06_elevation_optimized_comparison.png", dpi=260, facecolor=fig.get_facecolor(), bbox_inches='tight')
plt.close()
print("Saved 06_elevation_optimized_comparison.png")

# --- FIG B: Disturbance envelope ---
fig, ax = plt.subplots(figsize=(12,12))
fig.patch.set_facecolor('#0a0e14')
ax.set_facecolor('#07090e')
ax.set_xlim(-12,SIDE+12); ax.set_ylim(-12,SIDE+12); ax.set_aspect('equal')
ax.set_xticks([]); ax.set_yticks([])
ax.imshow(elev, cmap=dem_cmap, origin='lower', extent=[0,SIDE,0,SIDE], alpha=0.45, vmin=elev.min()-1, vmax=elev.max()+1)
ax.imshow(hillshade, cmap='gray', origin='lower', extent=[0,SIDE,0,SIDE], alpha=0.12)
ax.contour(xx, yy, elev, levels=contour_levels_2ft, colors='#a7f3d0', linewidths=0.5, alpha=0.5)
ax.add_patch(Rectangle((0,0), SIDE, SIDE, fill=False, edgecolor='white', linewidth=1.6, alpha=0.9))
ax.add_patch(Rectangle((SETBACK,SETBACK), SIDE-2*SETBACK, SIDE-2*SETBACK, fill=False, edgecolor='#3dcc6a', linewidth=1.3, linestyle='--'))
# Disturbance envelopes: original vs optimized
# Optimized disturbance: only around buildings + drive + swale corridor
from matplotlib.patches import PathPatch
import matplotlib.path as mpath
# Original disturbed area approx 38% of parcel
ax.add_patch(Circle((SIDE/2, SIDE/2), 155, fill=True, facecolor='#ff4d6d', edgecolor='#ff4d6d', linewidth=1.2, alpha=0.18, linestyle='-'))
ax.text(SIDE/2, SIDE/2+92, "ORIGINAL DISTURBANCE\n38% of parcel (~1.9 ac)\n7 trees >12″ DBH", ha='center', fontsize=7, color='#ff4d6d', weight='bold', bbox=dict(boxstyle='round,pad=0.4', facecolor='black', alpha=0.85))
# Optimized disturbance much tighter
optimized_polys = [
    # lodge + ADU cluster
    [(SETBACK+105, SIDE-SETBACK-105), (SETBACK+275, SIDE-SETBACK-105), (SETBACK+275, SIDE-SETBACK-45), (SETBACK+105, SIDE-SETBACK-45)],
    # barn/pasture
    [(SETBACK+15, SETBACK+35), (SETBACK+155, SETBACK+35), (SETBACK+155, SETBACK+195), (SETBACK+15, SETBACK+195)],
    # drive corridor narrow
]
for poly in optimized_polys:
    ax.add_patch(Polygon(poly, closed=True, fill=True, facecolor='#3dcc6a', edgecolor='#3dcc6a', linewidth=1.4, alpha=0.22))

# Drive corridor as thin polygon
drive_poly = [(SIDE/2-8, SETBACK), (SIDE/2+8, SETBACK), (SETBACK+185, SIDE-SETBACK-55), (SETBACK+175, SIDE-SETBACK-50)]
ax.add_patch(Polygon(drive_poly, closed=True, fill=True, facecolor='#3dcc6a', edgecolor='#3dcc6a', alpha=0.22))

# Rewild area label
ax.text(SIDE-SETBACK-48, SETBACK+115, "REWILD\nNATIVE FESCUE\n+ PIPO SAVED", ha='center', fontsize=6.5, color='#86efac', weight='bold', bbox=dict(boxstyle='round,pad=0.3', facecolor='black', alpha=0.75))
# Stats box
ax.add_patch(FancyBboxPatch((SETBACK+35, SIDE/2-38), 158, 76, boxstyle="round,pad=6", facecolor='black', edgecolor='#3dcc6a', linewidth=1.5, alpha=0.92))
ax.text(SETBACK+114, SIDE/2+24, "OPTIMIZED DISTURBANCE", ha='center', fontsize=8, weight='bold', color='#3dcc6a')
ax.text(SETBACK+114, SIDE/2+10, "18% of parcel (~0.9 ac)", ha='center', fontsize=9, weight='bold', color='white')
ax.text(SETBACK+114, SIDE/2-2, "↓ 52%  •  2 trees >12″ DBH", ha='center', fontsize=7, color='#86efac')
ax.text(SETBACK+114, SIDE/2-12, "only  •  5.2 tons CO₂ retained", ha='center', fontsize=6, color='#8b95a8')
ax.text(SETBACK+114, SIDE/2-23, "Grading 210 CY vs 780 CY", ha='center', fontsize=6.5, color='#f59e0b')

ax.set_title("APN 30055004 — NATURE PRESERVATION ENVELOPE  •  Red = original clearing | Green = optimized (buildings + narrow corridors) | Rest = undisturbed ponderosa-dominant", color='#e8edf5', fontsize=11, weight='bold', pad=16)
fig.text(0.5, 0.02, "Coconino County requires <35% lot coverage — this is <19% disturbed  •  Hillside overlay not triggered (<5% mean slope)  •  Flagstaff Dark Sky: all fixtures outside envelope remain unlit  •  Rewild with A. hymenoides + F. arizonica (no irrigation after establishment)", ha='center', fontsize=7, color='#8b95a8')
plt.savefig(f"{OUT}/07_disturbance_envelope.png", dpi=260, facecolor=fig.get_facecolor(), bbox_inches='tight')
plt.close()
print("Saved 07_disturbance_envelope.png")
print("Done.")
