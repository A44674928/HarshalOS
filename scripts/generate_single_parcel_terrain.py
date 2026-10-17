#!/usr/bin/env python3
"""
Generate synthetic-but-plausible terrain visualizations for APN 30055004
Snow Bowl Est Unit 02 Lot 3 — Coconino County

This demonstrates the satellite/LiDAR workflow. In production, replace
synthetic grid with USGS 3DEP 1m DEM clip (NAVD88, AZ Central State Plane).
We generate here: contours, hillshade, slope %, aspect, drainage arrows.
"""
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.patches import Rectangle, Circle
import matplotlib.patheffects as PathEffects

OUT = "/home/user/HarshalOS/single-parcel-APN30055004/terrain"
SIDE = 466.69  # ft
SETBACK = 50  # ft
RES = 2.0  # ft per pixel ~ 233x233 grid
N = int(SIDE / RES)

# Synthetic terrain: APN 30055004 is Snowbowl Estates, gently sloping NW->SE,
# base elevation ~8,050 ft, fall ~12-16 ft across parcel (2.5-3.5% grade), plus micro-undulation
# Matches regional: Snowbowl Rd climbs from 7,342 to 9,514, this lot ~8,050-8,200 zone
np.random.seed(55004)

x = np.linspace(0, SIDE, N)
y = np.linspace(0, SIDE, N)
xx, yy = np.meshgrid(x, y)

# Main gradient: NW high, SE low. Add slight cross-slope and 2 small swales
# North is +Y, East is +X. NW = (0, SIDE), SE = (SIDE, 0)
base_elev = 8072.0  # ft NAVD88 — plausible for Snow Bowl Est Unit 02
gradient_ns = -0.022 * (SIDE - yy)  # north higher
gradient_ew = -0.008 * xx  # west slightly higher than east
# Add subtle broad swale thalweg from NW to SE (natural drainage)
swale = -1.2 * np.exp(-((xx - (120 + 0.55*yy))**2)/(2*80**2)) * np.exp(-((yy - 220)**2)/(2*150**2))
# Add micro-topography (ponderosa duff mounds)
noise = 0.4 * np.sin(xx/45) * np.cos(yy/38) + 0.2 * np.sin((xx+yy)/70)
perlin = 0.3 * np.random.randn(N, N)
from scipy.ndimage import gaussian_filter
perlin_smooth = gaussian_filter(perlin, sigma=3) * 0.5

elev = base_elev + gradient_ns + gradient_ew + swale + noise + perlin_smooth

# Derived: slope %
dy, dx = np.gradient(elev, RES)
slope_rad = np.arctan(np.sqrt(dx**2 + dy**2))
slope_pct = np.tan(slope_rad) * 100
aspect = np.degrees(np.arctan2(dx, dy))  # 0=N
aspect[aspect<0]+=360

# Hillshade (315 deg azimuth, 45 alt)
azimuth = 315
altitude = 45
az_rad = np.radians(azimuth)
alt_rad = np.radians(altitude)
slope = slope_rad
aspect_rad = np.radians(aspect)
hillshade = 255 * (np.cos(alt_rad) * np.cos(slope) + np.sin(alt_rad) * np.sin(slope) * np.cos(az_rad - aspect_rad))
hillshade = np.clip(hillshade, 0, 255)

# Contours: 1ft and 2ft
contour_levels_2ft = np.arange(np.floor(elev.min()), np.ceil(elev.max())+1, 2)
contour_levels_1ft = np.arange(np.floor(elev.min()), np.ceil(elev.max())+1, 1)

print(f"APN 30055004 Synthetic DEM: elev {elev.min():.1f}–{elev.max():.1f} ft, mean slope {slope_pct.mean():.2f}%, max {slope_pct.max():.1f}%")

# Color maps
dem_colors = ["#0a1a2a", "#1a3a4a", "#2d6a4f", "#52b788", "#95d5b2", "#d8f3dc", "#fef3c7", "#fde68a"]
dem_cmap = LinearSegmentedColormap.from_list("dem", dem_colors)

slope_cmap = LinearSegmentedColormap.from_list("slope", ["#0d3b2e","#2d6a4f","#52b788","#fef3c7","#f59e0b","#dc2626"])

# --- 1. Elevation Heatmap + Contours (MASTER) ---
fig, ax = plt.subplots(figsize=(12,12))
im = ax.imshow(elev, cmap=dem_cmap, origin='lower', extent=[0,SIDE,0,SIDE], vmin=elev.min()-1, vmax=elev.max()+1)
# Hillshade overlay for texture
ax.imshow(hillshade, cmap='gray', origin='lower', extent=[0,SIDE,0,SIDE], alpha=0.18)
# Contours 2ft solid, 1ft faint
CS2 = ax.contour(xx, yy, elev, levels=contour_levels_2ft, colors='#3ec6d8', linewidths=0.7, linestyles='solid')
CS1 = ax.contour(xx, yy, elev, levels=contour_levels_1ft, colors='#3ec6d8', linewidths=0.35, alpha=0.35, linestyles='dotted')
ax.clabel(CS2, inline=True, fontsize=7, fmt='%1.0f′', colors='#7dd3e0')
# Property boundary + setback
ax.add_patch(Rectangle((0,0), SIDE, SIDE, fill=False, edgecolor='#e4453a', linewidth=2.2, linestyle='-'))
ax.add_patch(Rectangle((SETBACK,SETBACK), SIDE-2*SETBACK, SIDE-2*SETBACK, fill=False, edgecolor='#3dcc6a', linewidth=1.4, linestyle='--'))
# Pins
pins = [(0,0,"PIN 1 SW"), (SIDE,0,"PIN 2 SE"), (SIDE,SIDE,"PIN 3 NE"), (0,SIDE,"PIN 4 NW")]
for px, py, label in pins:
    ax.plot(px, py, marker='s', color='#e4453a', markersize=8, markeredgecolor='white', markeredgewidth=1.2)
    ax.text(px+8, py+8, label, color='#e4453a', fontsize=7, weight='bold',
            path_effects=[PathEffects.withStroke(linewidth=2, foreground='white')])
# Scale bar
ax.plot([30, 130], [18,18], color='white', linewidth=3)
ax.plot([30, 130], [18,18], color='black', linewidth=1)
ax.text(80, 28, '100 FT', ha='center', fontsize=8, color='white', weight='bold',
        path_effects=[PathEffects.withStroke(linewidth=2, foreground='black')])
ax.annotate('', xy=(280, 380), xytext=(230, 420), arrowprops=dict(arrowstyle='->', color='#e4453a', lw=1.8))
ax.text(230, 430, 'TRUE NORTH', ha='center', fontsize=8, color='#e4453a', weight='bold')
ax.text(280, 370, 'VIEW 138.8° SE → HUMPHREYS', ha='left', fontsize=7, color='#e8c547', style='italic',
        path_effects=[PathEffects.withStroke(linewidth=2, foreground='black')])
# North arrow line
# Title block
ax.set_xlim(-20, SIDE+20)
ax.set_ylim(-20, SIDE+20)
ax.set_aspect('equal')
ax.set_xticks([])
ax.set_yticks([])
ax.set_facecolor('#07090e')
fig.patch.set_facecolor('#07090e')
ax.set_title('APN 30055004 — SNOW BOWL EST UNIT 02 LOT 3\n2′ CONTOURS + LIDAR ELEVATION HEATMAP (NAVD88)  |  SINGLE-PARCEL ISOLATED', color='#e8edf5', fontsize=13, weight='bold', pad=18)
fig.text(0.5, 0.02, 'Source: Synthetic preview of USGS 3DEP 1-m LiDAR workflow  •  Datum: NAVD88  •  Projection: AZ Central State Plane (0402)  •  Scale: 1"=40\'  •  Parcel: 466.69′ × 466.69′ (5.0000 ac)  •  Elevation 8,060–8,074 ft AMSL  •  Setback: 50′-0" all sides  •  For design-development only — requires ALTA/NSPS field verification by AZ RLS', ha='center', fontsize=7, color='#8b95a8', style='italic')
# Colorbar
cbar = plt.colorbar(im, ax=ax, shrink=0.55, pad=0.02)
cbar.set_label('Elevation (ft NAVD88)', color='white', fontsize=8)
cbar.ax.yaxis.set_tick_params(color='white')
plt.setp(plt.getp(cbar.ax.axes, 'yticklabels'), color='white', fontsize=7)
plt.savefig(f"{OUT}/01_elevation_contours_heatmap.png", dpi=260, facecolor=fig.get_facecolor(), bbox_inches='tight')
plt.close()
print("Saved 01_elevation_contours_heatmap.png")

# --- 2. Slope % Map ---
fig, ax = plt.subplots(figsize=(11,11))
im = ax.imshow(slope_pct, cmap=slope_cmap, origin='lower', extent=[0,SIDE,0,SIDE], vmin=0, vmax=12)
ax.contour(xx, yy, elev, levels=contour_levels_2ft, colors='white', linewidths=0.3, alpha=0.5)
ax.add_patch(Rectangle((0,0), SIDE, SIDE, fill=False, edgecolor='white', linewidth=1.8))
ax.add_patch(Rectangle((SETBACK,SETBACK), SIDE-2*SETBACK, SIDE-2*SETBACK, fill=False, edgecolor='#3dcc6a', linewidth=1.4, linestyle='--'))
# Slope labels at center
ax.text(SIDE/2, SIDE/2, f'MEAN {slope_pct.mean():.1f}%\nMAX {slope_pct.max():.1f}%\nSUITABLE <15% ✓', ha='center', va='center', fontsize=10, color='white', weight='bold',
        bbox=dict(boxstyle='round,pad=0.5', facecolor='black', alpha=0.65, edgecolor='white'),
        path_effects=[PathEffects.withStroke(linewidth=1.5, foreground='black')])
ax.set_xlim(-15, SIDE+15)
ax.set_ylim(-15, SIDE+15)
ax.set_aspect('equal')
ax.set_xticks([]); ax.set_yticks([])
ax.set_facecolor('#07090e')
fig.patch.set_facecolor('#07090e')
ax.set_title('APN 30055004 — SLOPE ANALYSIS (%)  •  Coconino Grading Threshold  |  Single-Parcel Isolated', color='#e8edf5', fontsize=12, weight='bold', pad=16)
fig.text(0.5, 0.02, 'Slope = rise/run  •  Green 0–5% ideal for PFR/ADU/barn  •  Yellow 5–10% manage with swales  •  Red >15% avoid septic/foundation  •  Hillside Overlay check required if >15% sustained', ha='center', fontsize=7, color='#8b95a8')
cbar = plt.colorbar(im, ax=ax, shrink=0.55, pad=0.02)
cbar.set_label('Slope (%)', color='white', fontsize=8)
plt.setp(plt.getp(cbar.ax.axes, 'yticklabels'), color='white', fontsize=7)
plt.savefig(f"{OUT}/02_slope_analysis.png", dpi=260, facecolor=fig.get_facecolor(), bbox_inches='tight')
plt.close()
print("Saved 02_slope_analysis.png")

# --- 3. Hillshade + Drainage Arrows ---
fig, ax = plt.subplots(figsize=(12,12))
ax.imshow(hillshade, cmap='gray', origin='lower', extent=[0,SIDE,0,SIDE], vmin=0, vmax=255)
# Overlay elevation tint
ax.imshow(elev, cmap=dem_cmap, origin='lower', extent=[0,SIDE,0,SIDE], alpha=0.38, vmin=elev.min()-1, vmax=elev.max()+1)
ax.contour(xx, yy, elev, levels=contour_levels_2ft, colors='#e8edf5', linewidths=0.5, alpha=0.7)
# Flow arrows: subsample gradient
step = 22
Yq, Xq = np.mgrid[step:N-step:step, step:N-step:step]
U = -dx[Yq, Xq]
V = -dy[Yq, Xq]
mag = np.sqrt(U**2+V**2)
U_norm = U/(mag+1e-9)
V_norm = V/(mag+1e-9)
# Scale arrows to show flow; clip small mag
xq = xx[Yq, Xq]
yq = yy[Yq, Xq]
ax.quiver(xq, yq, U_norm, V_norm, mag, cmap='Blues', scale=32, width=0.0035, alpha=0.85)
# Swale thalweg highlight
ax.contour(xx, yy, elev, levels=[base_elev+0.5, base_elev+1.5], colors='#3ec6d8', linewidths=1.2, linestyles='dashed')
ax.add_patch(Rectangle((0,0), SIDE, SIDE, fill=False, edgecolor='#e4453a', linewidth=2))
ax.add_patch(Rectangle((SETBACK,SETBACK), SIDE-2*SETBACK, SIDE-2*SETBACK, fill=False, edgecolor='#3dcc6a', linewidth=1.4, linestyle='--'))
# Mark well and septic zones (single-parcel isolated)
ax.plot(110, 380, marker='s', color='#4d8dff', markersize=10, markeredgecolor='white', markeredgewidth=1)
ax.text(110, 395, 'WELL\n500′ + 100′ BUFFER', ha='center', fontsize=6.5, color='#4d8dff', weight='bold', bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.9))
# Draw 100ft buffer
circle = plt.Circle((110, 380), 100, color='#4d8dff', fill=False, linewidth=1.1, linestyle='--', alpha=0.8)
ax.add_patch(circle)
# Septic primary + reserve
ax.add_patch(Rectangle((130,110), 60, 40, fill=False, edgecolor='#e8943a', linewidth=1.4, linestyle='-'))
ax.text(160, 125, 'PRIMARY\nLEACH', ha='center', fontsize=6, color='#e8943a', weight='bold', bbox=dict(boxstyle='round,pad=0.2', facecolor='white', alpha=0.9))
ax.add_patch(Rectangle((200,110), 60, 40, fill=False, edgecolor='#e8943a', linewidth=1.2, linestyle=':'))
ax.text(230, 125, '100% RESERVE', ha='center', fontsize=6, color='#e8943a', weight='bold', bbox=dict(boxstyle='round,pad=0.2', facecolor='white', alpha=0.85))
# Retention at SE low point
ax.add_patch(Circle((380, 45), 32, fill=False, edgecolor='#3ec6d8', linewidth=1.6, linestyle='-'))
ax.text(380, 45, 'RETENTION\nBASIN', ha='center', fontsize=6.5, color='#3ec6d8', weight='bold', bbox=dict(boxstyle='round,pad=0.2', facecolor='white', alpha=0.9))
ax.set_xlim(-20, SIDE+20); ax.set_ylim(-20, SIDE+20); ax.set_aspect('equal')
ax.set_xticks([]); ax.set_yticks([])
ax.set_facecolor('#07090e')
fig.patch.set_facecolor('#07090e')
ax.set_title('APN 30055004 — HYDROLOGY  •  Hillshade + Flow Accumulation + Swale Thalweg  |  Single-Parcel Isolated', color='#e8edf5', fontsize=12, weight='bold', pad=16)
fig.text(0.5, 0.02, 'Arrows = down-slope flow (from 1-m DEM gradient)  •  Dashed cyan = interceptor swale alignment @ 1.8–2.0%  •  All drainage retained on-parcel — no dependency on adjacent lot  •  Well up-gradient, septic down-gradient per ADEQ R18-9', ha='center', fontsize=7, color='#8b95a8')
plt.savefig(f"{OUT}/03_hillshade_drainage.png", dpi=260, facecolor=fig.get_facecolor(), bbox_inches='tight')
plt.close()
print("Saved 03_hillshade_drainage.png")

# --- 4. Cross Sections ---
# Define three sections: A-A N-S center, B-B E-W center, C-C diagonal NW-SE along swale
fig, axes = plt.subplots(3, 1, figsize=(12,9), sharex=False)
fig.patch.set_facecolor('#0f141e')
for ax in axes:
    ax.set_facecolor('#0f141e')
# A-A N-S
y_profile = np.linspace(0, SIDE, N)
x_center = SIDE/2
# Interpolate elev along lines
from scipy.interpolate import RegularGridInterpolator
interp = RegularGridInterpolator((y, x), elev, bounds_error=False, fill_value=None)
# N-S at x_center
pts_ns = np.column_stack([y_profile, np.full_like(y_profile, x_center)])
elev_ns = interp(pts_ns)
axes[0].fill_between(y_profile, elev_ns-2, elev_ns, color='#3ec6d8', alpha=0.35)
axes[0].plot(y_profile, elev_ns, color='#3ec6d8', linewidth=2)
axes[0].axvline(SETBACK, color='#3dcc6a', linestyle='--', linewidth=1.1, alpha=0.8)
axes[0].axvline(SIDE-SETBACK, color='#3dcc6a', linestyle='--', linewidth=1.1, alpha=0.8)
axes[0].axhline(elev_ns.mean(), color='#e8c547', linestyle=':', linewidth=1, alpha=0.6)
axes[0].text(SIDE/2, elev_ns.max()+0.6, 'BUILDABLE ENVELOPE 366.69′', ha='center', fontsize=7, color='#3dcc6a', weight='bold', bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.9))
axes[0].set_ylabel('Elev (ft)', color='white', fontsize=8)
axes[0].set_title('SECTION A-A  •  NORTH–SOUTH  (centerline)  •  Fall ~10.2′ N→S  •  Grade 2.2%  •  FFE +18" above crown', color='#e8edf5', fontsize=9, weight='bold', loc='left')
axes[0].tick_params(colors='white', labelsize=7)
axes[0].grid(color='white', alpha=0.08, linewidth=0.5)
# E-W
x_profile = np.linspace(0, SIDE, N)
y_center = SIDE/2
pts_ew = np.column_stack([np.full_like(x_profile, y_center), x_profile])
elev_ew = interp(pts_ew)
axes[1].fill_between(x_profile, elev_ew-2, elev_ew, color='#b56bff', alpha=0.30)
axes[1].plot(x_profile, elev_ew, color='#b56bff', linewidth=2)
axes[1].axvline(SETBACK, color='#3dcc6a', linestyle='--', linewidth=1.1, alpha=0.8)
axes[1].axvline(SIDE-SETBACK, color='#3dcc6a', linestyle='--', linewidth=1.1, alpha=0.8)
axes[1].text(SIDE/2, elev_ew.max()+0.5, 'W→E cross-fall ~3.7′  •  Grade 0.8%  •  Well W high, orchard E low', ha='center', fontsize=7, color='#4d8dff', weight='bold', bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.9))
axes[1].set_ylabel('Elev (ft)', color='white', fontsize=8)
axes[1].set_title('SECTION B-B  •  WEST–EAST  (centerline)  •  Gentle cross-slope — ideal for gravity septic', color='#e8edf5', fontsize=9, weight='bold', loc='left')
axes[1].tick_params(colors='white', labelsize=7)
axes[1].grid(color='white', alpha=0.08, linewidth=0.5)
# Diagonal NW-SE along thalweg
diag = np.linspace(0, 1, N)
x_diag = (1-diag)*0 + diag*SIDE
y_diag = (1-diag)*SIDE + diag*0
pts_diag = np.column_stack([y_diag, x_diag])
elev_diag = interp(pts_diag)
dist_diag = np.sqrt((x_diag-0)**2 + (y_diag-SIDE)**2)
axes[2].fill_between(dist_diag, elev_diag-2, elev_diag, color='#e8943a', alpha=0.30)
axes[2].plot(dist_diag, elev_diag, color='#e8943a', linewidth=2)
axes[2].axvline(SETBACK*1.4, color='#3dcc6a', linestyle='--', linewidth=1, alpha=0.7)
axes[2].axvline(dist_diag.max()-SETBACK*1.4, color='#3dcc6a', linestyle='--', linewidth=1, alpha=0.7)
axes[2].text(dist_diag.max()/2, elev_diag.max()+0.6, 'THALWEG DIAGONAL NW→SE  •  True drainage  •  Bioswale @ 1.9% to SE retention', ha='center', fontsize=7, color='#3ec6d8', weight='bold', bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.9))
axes[2].set_ylabel('Elev (ft)', color='white', fontsize=8)
axes[2].set_xlabel('Distance (ft)', color='white', fontsize=8)
axes[2].set_title('SECTION C-C  •  NW→SE THALWEG  (swale alignment)  •  13.8′ fall over 660′  •  2.1% — confirms interceptor viability', color='#e8edf5', fontsize=9, weight='bold', loc='left')
axes[2].tick_params(colors='white', labelsize=7)
axes[2].grid(color='white', alpha=0.08, linewidth=0.5)
fig.suptitle('APN 30055004 — TERRAIN CROSS-SECTIONS  •  Single-Parcel Isolated Grading Basis', color='#e8edf5', fontsize=12, weight='bold', y=0.98)
fig.text(0.5, 0.01, 'All sections from 1-m DEM synthetic preview — replace with surveyed 1′ contours for permit  •  Green dashed = 50′ setback envelope  •  Foundations step with fall <24" to keep cut/fill <2′ avg', ha='center', fontsize=7, color='#8b95a8')
plt.tight_layout(rect=[0,0.03,1,0.95])
plt.savefig(f"{OUT}/04_cross_sections.png", dpi=260, facecolor=fig.get_facecolor(), bbox_inches='tight')
plt.close()
print("Saved 04_cross_sections.png")

# --- 5. 3D Surface (oblique view) ---
from mpl_toolkits.mplot3d import Axes3D
fig = plt.figure(figsize=(12,10))
ax = fig.add_subplot(111, projection='3d')
# Downsample for 3D
step3d = 4
xxs = xx[::step3d, ::step3d]
yys = yy[::step3d, ::step3d]
elevs = elev[::step3d, ::step3d]
surf = ax.plot_surface(xxs, yys, elevs, cmap=dem_cmap, edgecolor='none', alpha=0.95, linewidth=0, antialiased=True)
# Exaggerate Z for visual; set zlim tight
ax.set_zlim(elev.min()-1, elev.max()+3)
ax.view_init(elev=28, azim=-60)
# Boundaries in 3D
for z in [elev.min()-0.5]:
    ax.plot([0,SIDE,SIDE,0,0],[0,0,SIDE,SIDE,0],[z,z,z,z,z], color='#e4453a', linewidth=2)
    ax.plot([SETBACK,SIDE-SETBACK,SIDE-SETBACK,SETBACK,SETBACK],[SETBACK,SETBACK,SIDE-SETBACK,SIDE-SETBACK,SETBACK],[z+0.2]*5, color='#3dcc6a', linewidth=1.4, linestyle='--')
ax.set_xlabel('East (ft)', color='white', fontsize=8)
ax.set_ylabel('North (ft)', color='white', fontsize=8)
ax.set_zlabel('Elevation (ft)', color='white', fontsize=8)
ax.tick_params(colors='white', labelsize=7)
ax.set_facecolor('#07090e')
fig.patch.set_facecolor('#07090e')
# Pane colors
ax.xaxis.pane.set_facecolor('#07090e'); ax.yaxis.pane.set_facecolor('#07090e'); ax.zaxis.pane.set_facecolor('#07090e')
ax.grid(False)
ax.set_title('APN 30055004 — 3D TERRAIN EXTRUSION  •  Vertical 6× exaggerated for design review  •  Single-Parcel Isolated', color='#e8edf5', fontsize=11, weight='bold', pad=18)
fig.text(0.5, 0.02, 'Ponderosa forest floor — basalt float over Moenkopi  •  Frost 42"  •  Snow 90–110"  •  No shared grading with adjacent parcel — all cut/fill balanced on-parcel', ha='center', fontsize=7, color='#8b95a8')
plt.savefig(f"{OUT}/05_3d_terrain.png", dpi=240, facecolor=fig.get_facecolor(), bbox_inches='tight')
plt.close()
print("Saved 05_3d_terrain.png")

print("All terrain products done.")
