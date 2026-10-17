#!/usr/bin/env python3
"""
APN 30055004 — RESIDENCY MAX STUDY v3 (cost-unlimited, max beds)
Frontier Lab campus: one big house, bermed lower level, BYO compute + demo closet,
30+day cohorts. Terrain identical seed to clean-sheet v2 for contour continuity.
"""
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle, FancyBboxPatch, Polygon
from matplotlib.colors import LinearSegmentedColormap
from scipy.ndimage import gaussian_filter
import os

plt.rcParams['text.parse_math'] = False
OUT = "/home/user/HarshalOS/single-parcel-APN30055004/clean-sheet"
os.makedirs(OUT, exist_ok=True)

SIDE_FT = 466.69
SETBACK = 50
SIDE = SIDE_FT
N = 400
RES = SIDE_FT / N

np.random.seed(30055004)
x = np.linspace(0, SIDE, N)
y = np.linspace(0, SIDE, N)
xx, yy = np.meshgrid(x, y)

# Kendrick bench DEM (same model as v2)
elev = 7895.0 - 14.0 * ((SIDE - yy) / SIDE)
elev += -3.2 * (xx / SIDE)
elev += -1.6 * np.exp(-((xx - (62 + 0.46 * yy))**2) / (2 * 58**2)) * np.exp(-((yy - 88)**2) / (2 * 120**2))
elev += 0.35 * np.sin(xx / 38) * np.cos(yy / 33) + 0.22 * np.sin((xx + yy) / 65)
elev += gaussian_filter(np.random.randn(N, N) * 0.35, 2.5)

dy, dx = np.gradient(elev, RES)
slope_rad = np.arctan(np.sqrt(dx**2 + dy**2))
hillshade = 255 * (np.cos(np.radians(45)) * np.cos(slope_rad)
                   + np.sin(np.radians(45)) * np.sin(slope_rad)
                   * np.cos(np.radians(315) - np.radians(np.degrees(np.arctan2(dx, dy)))))
hillshade = np.clip(hillshade, 0, 255)

dem_cmap = LinearSegmentedColormap.from_list(
    "dem", ["#0f1e2f", "#1d3d4a", "#2d5a3a", "#4a7c4e", "#6a9c6a", "#a8c9a8", "#d8dcc0", "#e8e0b8"])
levels_2ft = np.arange(np.floor(elev.min()), np.ceil(elev.max()) + 1, 2)

# =================== PLAN ===================
fig, ax = plt.subplots(figsize=(16, 16))
fig.patch.set_facecolor('#eef2f1')
ax.set_facecolor('#eef2f1')
ax.set_xlim(-14, SIDE + 14)
ax.set_ylim(-14, SIDE + 14)
ax.set_aspect('equal')
ax.set_xticks([])
ax.set_yticks([])

ax.imshow(elev, cmap=dem_cmap, origin='lower', extent=[0, SIDE, 0, SIDE],
          alpha=0.30, vmin=elev.min() - 1, vmax=elev.max() + 1)
ax.imshow(hillshade, cmap='gray', origin='lower', extent=[0, SIDE, 0, SIDE], alpha=0.07)
CS = ax.contour(xx, yy, elev, levels=levels_2ft, colors='#5a7a6a',
                linewidths=0.5, alpha=0.5, linestyles='solid')
ax.clabel(CS, inline=True, fontsize=5, fmt='%1.0f', colors='#3a5a4a')

# Property + setback + pins
ax.add_patch(Rectangle((0, 0), SIDE, SIDE, fill=False, edgecolor='#1a2e1a', linewidth=2.6))
ax.add_patch(Rectangle((SETBACK, SETBACK), SIDE - 2 * SETBACK, SIDE - 2 * SETBACK,
                       fill=False, edgecolor='#2d5a3a', linewidth=1.3, linestyle='--', alpha=0.9))
for px, py, lbl, ha in [(0, 0, "PIN SW", 'left'), (SIDE, 0, "PIN SE", 'right'),
                        (SIDE, SIDE, "PIN NE", 'right'), (0, SIDE, "PIN NW", 'left')]:
    dxo = 6 if ha == 'left' else -6
    ax.plot(px, py, marker='s', color='#1a2e1a', markersize=5, markeredgecolor='white', markeredgewidth=0.9)
    ax.text(px + dxo, py + 7, lbl, fontsize=5, color='#1a2e1a', weight='bold', ha=ha, va='bottom',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='white', alpha=0.88, edgecolor='#1a2e1a'))

# ---- DRIVE (east spine -> motor court), parking ----
drive_x = np.array([233, 240, 300, 385, 404, 408, 404, 378])
drive_y = np.array([6, 57, 58, 64, 130, 240, 320, 344])
ax.plot(drive_x, drive_y, color='white', linewidth=9, solid_capstyle='round', solid_joinstyle='round')
ax.plot(drive_x, drive_y, color='#2b2b2b', linewidth=5.5, solid_capstyle='round', solid_joinstyle='round')
ax.plot(drive_x, drive_y, color='#f59e0b', linewidth=1.1, linestyle=':', alpha=0.9)
ax.add_patch(Circle((370, 350), 22, fill=False, edgecolor='#2b2b2b', linewidth=5.5))
ax.add_patch(Circle((370, 350), 22, fill=False, edgecolor='#f59e0b', linewidth=1.1, linestyle=':'))
ax.text(370, 350, "MOTOR\nCOURT", ha='center', va='center', fontsize=5,
        weight='bold', color='white', linespacing=0.9)
ax.text(310, 44, "8′ W basalt fines • east of swale → ZERO culvert • 20′ fire lane to court",
        ha='center', fontsize=5.5, color='#2b2b2b', weight='bold',
        bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.95, edgecolor='#2b2b2b'))
ax.plot(233, 4, marker='s', color='#b91c1c', markersize=7, markeredgecolor='white', markeredgewidth=1.1)
ax.text(233, -6, "GATE • cattle guard • heated mat • 30k-gal fire cistern at gate",
        ha='center', va='top', fontsize=5.5, color='#7f1d1d', weight='bold',
        bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.95, edgecolor='#b91c1c'))

# Parking 24 long-stay spaces (east of house, west of drive)
for row_y in [(250, 266), (302, 318)]:
    ax.add_patch(Rectangle((358, row_y[0]), 42, row_y[1] - row_y[0],
                           fill=False, edgecolor='#4b5563', linewidth=0.8, linestyle='-'))
    for k in range(6):
        xs = 358 + (k + 1) * 6
        ax.plot([xs, xs], row_y, color='#4b5563', linewidth=0.6)
ax.plot([358, 400], [284, 284], color='#4b5563', linewidth=0.7, linestyle='--')
ax.text(379, 288, "PARKING 24\n0.5/bed long-stay", ha='center', fontsize=4.6,
        weight='bold', color='#374151', linespacing=0.9)

# ---- SEPTIC LOS FIELD + RESERVE (SW, former pasture) ----
ax.add_patch(Rectangle((62, 56), 134, 58, facecolor='#ffedd5', edgecolor='#9a3412',
                       linewidth=1.4, hatch='///', alpha=0.95))
ax.text(129, 85, "SEPTIC LOS FIELD\n60-BR sized • 9,000 gpd", ha='center', fontsize=5.6,
        weight='bold', color='#7c2d12', linespacing=1.0)
ax.add_patch(Rectangle((62, 116), 134, 58, facecolor='#ffedd5', edgecolor='#9a3412',
                       linewidth=1.1, linestyle=':', alpha=0.75))
ax.text(129, 145, "RESERVE 100% (fenced, passive)\nADEQ R18-9 large OSSE — engineered", ha='center',
        fontsize=5, weight='bold', color='#9a3412', linespacing=1.0)

# ---- BARN (amenity + PV + gen) ----
ax.add_patch(FancyBboxPatch((68, 188), 118, 40, boxstyle="round,pad=2",
                            facecolor='#292524', edgecolor='#1c1917', linewidth=1.3))
ax.add_patch(Rectangle((76, 216), 102, 5, facecolor='#fef3c7', edgecolor='#a16207', linewidth=0.7, alpha=0.8))
ax.text(127, 210, "BARN — AMENITY + PV  •  sauna/events/wellness", ha='center',
        fontsize=6, weight='bold', color='white')
ax.text(127, 202, "7,887′ flat • 2 stalls ag identity • board $400/mo", ha='center',
        fontsize=4.8, color='#d6d3d1')
ax.add_patch(Rectangle((76, 178), 44, 9, facecolor='#fef08a', edgecolor='#a16207', linewidth=0.9, alpha=0.85))
ax.text(98, 175.5, "PV barn roof 50 kW", ha='center', fontsize=4.5, color='#713f12', weight='bold')
ax.add_patch(Rectangle((126, 178), 22, 9, facecolor='#e5e7eb', edgecolor='#4b5563', linewidth=0.9))
ax.text(137, 182.5, "GEN", ha='center', va='center', fontsize=4, weight='bold', color='#1f2937')
ax.text(152, 182.5, "60 kW life-safety", ha='left', va='center', fontsize=4, color='#374151')

# ---- ADU (owner / premium suites) ----
ax.add_patch(FancyBboxPatch((66, 280), 66, 36, boxstyle="round,pad=2",
                            facecolor='#374151', edgecolor='#111827', linewidth=1.3))
ax.add_patch(Rectangle((70, 284), 58, 5, facecolor='#93c5fd', edgecolor='#1e40af', linewidth=0.7, alpha=0.4))
ax.text(99, 304, "ADU 800 SF", ha='center', fontsize=6.5, weight='bold', color='white')
ax.text(99, 296, "owner suite / premium", ha='center', fontsize=5, color='#e5e7eb')
ax.text(99, 288, "PFR retained", ha='center', fontsize=4.2, color='#a5b4fc')

# ---- MAIN HOUSE (max) ----
hx, hy, hw, hh = 190, 252, 165, 68   # 11,220 SF footprint, 3 stories + bermed lower (north)
ax.add_patch(Rectangle((hx + 3, hy - 3), hw, hh, facecolor='black', alpha=0.08, edgecolor='none'))
ax.add_patch(FancyBboxPatch((hx, hy), hw, hh, boxstyle="round,pad=2",
                            facecolor='#1f2937', edgecolor='#111827', linewidth=1.7))
# Bermed lower-level footprint (north half) — dashed, with earth hatch
ax.add_patch(Rectangle((hx + 4, hy + 34), hw - 8, hh - 38, fill=True, facecolor='#3f2d1d',
                       edgecolor='#d6b18f', linewidth=1.1, linestyle='--', hatch='\\\\\\', alpha=0.9))
ax.text(300, 308, "BERMED LOWER LEVEL — north cut into bench",
        ha='center', fontsize=5, weight='bold', color='#fde68a')
# Demo closet inside bermed zone (west end)
ax.add_patch(Rectangle((hx + 8, hy + 38), 44, 22, facecolor='#0f172a', edgecolor='#38bdf8',
                       linewidth=1.1, linestyle='-'))
ax.text(hx + 30, hy + 51, "DEMO\nCLOSET", ha='center', va='center', fontsize=4.6,
        weight='bold', color='#7dd3fc', linespacing=0.9)
# Program texts (south, walk-out side)
ax.text(hx + hw / 2, hy + 27, "MAIN HOUSE — FRONTIER LAB RESIDENCY", ha='center',
        fontsize=7.5, weight='bold', color='white')
ax.text(hx + hw / 2, hy + 19, "60 BEDS DESIGNED • 48 OPERATED (CUP ask) • 30+ day cohorts", ha='center',
        fontsize=5.6, color='#e5e7eb')
ax.text(hx + hw / 2, hy + 12, "L1 commons/kitchen/program • L2 dorm pods • L3 suites/private", ha='center',
        fontsize=5, color='#a5b4fc')
ax.text(hx + hw / 2, hy + 5.5, "3 STOREYS = 34′ (<35′) • roof PV 60 kW • BYO rented compute", ha='center',
        fontsize=4.8, color='#93c5fd', style='italic')
# Walk-out deck south
ax.add_patch(Rectangle((hx + 20, hy - 12), hw - 40, 11, facecolor='#d6b18f',
                       edgecolor='#8c6239', linewidth=0.9, alpha=0.85))
ax.text(hx + hw / 2, hy - 6.5, "SOUTH WALK-OUT DECK → retention • 60′ defensible space",
        ha='center', fontsize=4.5, color='#78350f', weight='bold')
# Exits
for ex, ey, lbl in [(hx + 6, hy + 10, "EXIT-W"), (hx + hw - 6, hy + 14, "EXIT-SE"), (hx + 84, hy + hh + 2, "EXIT-N")]:
    ax.plot(ex, ey, marker='D', color='#dc2626', markersize=5, markeredgecolor='white', markeredgewidth=0.9)
ax.text(hx + 60, hy + hh + 6, "IFC: 2 remote stair exits + sprinklers + egress windows (south walk-out)",
        ha='center', fontsize=4.6, weight='bold', color='#991b1b',
        bbox=dict(boxstyle='round,pad=0.25', facecolor='white', alpha=0.95, edgecolor='#dc2626'))

# ---- WELL + big cistern ----
wx, wy = 80, 386
ax.plot(wx, wy, marker='o', color='#2563eb', markersize=7, markeredgecolor='white', markeredgewidth=1.1)
ax.add_patch(Circle((wx, wy), 50, fill=False, edgecolor='#2563eb', linewidth=1.1, linestyle='--', alpha=0.7))
ax.text(wx, wy + 16, "WELL 500′ + 15k-gal CISTERN\nyield test gates bed count", ha='center', fontsize=5.5,
        color='#1e40af', weight='bold',
        bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.96, edgecolor='#2563eb'))
ax.plot(100, 414, marker='o', color='#38bdf8', markersize=4, markeredgecolor='white', markeredgewidth=0.7)

# ---- Fire cistern 30k at gate ----
ax.add_patch(Circle((262, 86), 16, facecolor='#dbeafe', edgecolor='#1e40af', linewidth=1.3, alpha=0.95))
ax.text(262, 89, "30k\nFIRE", ha='center', va='center', fontsize=4.8,
        weight='bold', color='#1e40af', linespacing=0.85)
ax.plot(286, 86, marker='s', color='#b91c1c', markersize=6, markeredgecolor='white', markeredgewidth=1.0)
ax.text(296, 86, "NH 4.5″ hydrant", ha='left', va='center', fontsize=4.4, color='#7f1d1d', weight='bold')

# ---- GREENHOUSE + ORCHARD + RETENTION (unchanged zones) ----
ax.add_patch(FancyBboxPatch((244, 330), 58, 24, boxstyle="round,pad=2",
                            facecolor='#ecfdf5', edgecolor='#065f46', linewidth=1.1, alpha=0.95))
for i in range(4):
    ax.plot([256 + i * 11, 256 + i * 11], [330, 354], color='#065f46', linewidth=0.7, alpha=0.5)
ax.text(273, 347, "GREENHOUSE 1,750 SF", ha='center', fontsize=5.5, weight='bold', color='#064e3b')
ax.text(273, 339, "farm-to-table for commons", ha='center', fontsize=4.4, color='#047857')

ax.add_patch(Rectangle((240, 110), 65, 105, facecolor='#a8c9a8', edgecolor='#4a7c4e',
                       linewidth=0.9, alpha=0.18))
for oy in np.linspace(120, 205, 7):
    for ox in [252, 265, 278, 291]:
        ax.plot(ox, oy, marker='o', color='#4a7c4e', markersize=2.4,
                markeredgecolor='white', markeredgewidth=0.4)
ax.text(246, 162, "ORCHARD 1.5 AC", ha='center', fontsize=5, weight='bold',
        color='#1a3c1a', rotation=90)

ax.add_patch(Circle((352, 80), 20, facecolor='#dbeafe', edgecolor='#1e40af', linewidth=1.3, alpha=0.95))
ax.add_patch(Circle((352, 80), 14, fill=False, edgecolor='#93c5fd', linewidth=0.8, linestyle=':'))
ax.text(352, 83, "RETENTION", ha='center', fontsize=5, weight='bold', color='#1e40af')
ax.text(352, 76, "vernal pool", ha='center', fontsize=4.5, color='#3730a3', style='italic')

# ---- INTERCEPTOR SWALE — rerouted west of house, bench between barn & house ----
sw = [(76, 374), (150, 342), (176, 302), (178, 258), (184, 234),
      (300, 236), (324, 190), (330, 140), (340, 108), (352, 96)]
ax.plot([p[0] for p in sw], [p[1] for p in sw], color='#0ea5e9', linewidth=2,
        linestyle='--', alpha=0.9, solid_capstyle='round')
ax.text(248, 226, "INTERCEPTOR SWALE 1.9% (rerouted: west of house → bench → SE)", ha='center',
        fontsize=5.2, weight='bold', color='#0c4a6e', rotation=1,
        bbox=dict(boxstyle='round,pad=0.25', facecolor='white', alpha=0.96, edgecolor='#0ea5e9'))

# ---- Starlink cluster ----
ax.plot(184, 330, marker='o', color='#0f172a', markersize=5.5,
        markeredgecolor='#93c5fd', markeredgewidth=1.2)
ax.text(184, 338, "LEO ×3\n+ LTE", ha='center', fontsize=4, weight='bold',
        color='#0f172a', linespacing=0.9)

# ---- Saved trees ----
for tx, ty in [(56, 414), (40, 300), (210, 398), (430, 180), (366, 240)]:
    ax.plot(tx, ty, marker='o', color='#1a3c1a', markersize=6.5,
            markeredgecolor='#86ab86', markeredgewidth=0.9)
    ax.plot(tx, ty, marker='o', color='#4a7c4e', markersize=3, markeredgecolor='none')

# ---- MAX CAPACITY callout (NE) ----
ax.add_patch(FancyBboxPatch((300, 392), 156, 52, boxstyle="round,pad=5",
                            facecolor='#1f2937', edgecolor='#fbbf24', linewidth=1.5, alpha=0.96))
ax.text(378, 433, "MAX STUDY — COST-UNLIMITED", ha='center', fontsize=6.5, weight='bold', color='#fbbf24')
ax.text(378, 424, "60 BEDS DESIGNED / 48 OPERATED", ha='center', fontsize=7.5, weight='bold', color='white')
ax.text(378, 414, "House 11,220 SF × 3L + 6,300 SF bermed LL", ha='center', fontsize=5.2, color='#86efac')
ax.text(378, 405, "Coverage 24% < 35%  •  Height 34′ < 35′", ha='center', fontsize=5, color='#d1d5db')
ax.text(378, 397, "GATES: PERC • yield test • CUP • road agreement", ha='center', fontsize=5,
        weight='bold', color='#fbbf24',
        bbox=dict(boxstyle='round,pad=0.3', facecolor='#111827', alpha=1))

# ---- Legend ----
ax.add_patch(Rectangle((14, 232), 120, 40, facecolor='white', edgecolor='#1a2e1a', linewidth=1, alpha=0.97))
ax.text(74, 266, "LEGEND", ha='center', fontsize=6, weight='bold', color='#1a2e1a')
ax.plot(22, 259, marker='s', color='#1f2937', markersize=5, markeredgecolor='#111827', markeredgewidth=0.7)
ax.text(32, 259, "Main house (3L + bermed lower)", fontsize=5, color='#1f2937', va='center')
ax.plot(22, 251, marker='s', color='#ffedd5', markersize=5, markeredgecolor='#9a3412', markeredgewidth=0.7)
ax.text(32, 251, "Septic LOS field + 100% reserve", fontsize=5, color='#1a2e1a', va='center')
ax.plot([22, 32], [243, 243], color='#0ea5e9', linewidth=2, linestyle='--')
ax.text(35, 243, "Interceptor 1.9% → vernal retention", fontsize=5, color='#0c4a6e', va='center')
ax.plot(24, 236, marker='D', color='#dc2626', markersize=4, markeredgecolor='white', markeredgewidth=0.7)
ax.text(32, 236, "Code exits (2 remote + sprinklers)", fontsize=5, color='#7f1d1d', va='center')

# N arrow + scale
ax.annotate('', xy=(310, 100), xytext=(310, 80), arrowprops=dict(arrowstyle='->', color='#1a2e1a', lw=1.6))
ax.text(310, 104, "N", ha='center', fontsize=8, weight='bold', color='#1a2e1a')
ax.plot([215, 265], [56, 56], color='#1a2e1a', linewidth=2.5)
ax.plot([215, 265], [56, 56], color='white', linewidth=1)
for i, lbl in enumerate(["0", "40′", "80′", "120′"]):
    xt = 215 + i * 16.7
    ax.plot([xt, xt], [53, 59], color='#1a2e1a', linewidth=1)
    ax.text(xt, 48, lbl, ha='center', fontsize=4.5, color='#1a2e1a')

ax.set_title("APN 30055004 — RESIDENCY MAX STUDY v3 • FRONTIER LAB CAMPUS • 60 BEDS DESIGNED / 48 OPERATED • BERMED LOWER LEVEL",
             color='#1f2937', fontsize=12.5, weight='bold', pad=14, loc='center')
fig.text(0.5, 0.015,
         "Scale 1\"=40′ • 5.00 ac • 30+day cohorts (no STR) • BYO rented compute + on-site demo closet • bermed lower level (north cut / south walk-out) • "
         "Elevation 7,877–7,895′ NAVD88 • AR-5 → CUP required for lodging >8 rooms • design-development — ALTA/NSPS + PERC + yield test + geotech before submittal",
         ha='center', fontsize=6.4, color='#4b5563', style='italic')
fig.text(0.5, 0.005,
         "Gates in order: 1) PERC/soil (septic 9,000 gpd drives the site)  2) well yield test (6 gpm = ~60 beds actual use)  3) geotech/basalt depth (bermed LL cost)  "
         "4) CUP + 6-mi road maintenance agreement  5) capital & ops",
         ha='center', fontsize=6.2, color='#6b7280')
plt.tight_layout(rect=[0, 0.03, 1, 0.97])
plt.savefig(f"{OUT}/RESIDENCY_V3_SITE_PLAN.png", dpi=270, facecolor=fig.get_facecolor(), bbox_inches='tight')
plt.close()
print("Saved RESIDENCY_V3_SITE_PLAN.png")

# =================== SECTION (N-S through house) ===================
fig, ax = plt.subplots(figsize=(16, 9))
fig.patch.set_facecolor('#eef2f1')
ax.set_facecolor('#eef2f1')
ax.set_xlim(-10, 240)
ax.set_ylim(-46, 64)
ax.set_aspect('equal')
ax.set_xticks([])
ax.set_yticks([])

# Grade: N high (left) -> S low (right), 14' fall across parcel; house depth ~165'
gx = np.array([-10, 0, 40, 70, 100, 130, 160, 200, 240])
gy = np.array([26, 25, 23.2, 21.5, 20, 18.6, 17.2, 15.6, 14])
ax.plot(gx, gy, color='#6b4f2a', linewidth=2.2)
ax.fill_between(gx, gy, -46, color='#c9a878', alpha=0.30)

# Cut wedge for bermed LL (N side, left): house sits x 40-205
# Lower level: x 48-130 (north half), floor at +8, roof/grade at ~+21
ll_x0, ll_x1, ll_y0, ll_y1 = 48, 130, 8, 21
ax.add_patch(Rectangle((ll_x0, ll_y0), ll_x1 - ll_x0, ll_y1 - ll_y0,
                       facecolor='#312e81', edgecolor='#1e1b4b', linewidth=1.5))
# Earth over bermed LL (hatched wedge)
ax.add_patch(Polygon([[ll_x0 - 6, ll_y1], [ll_x1 + 8, ll_y1], [ll_x1 + 2, ll_y1 + 9],
                      [ll_x0 - 2, ll_y1 + 11]], closed=True, facecolor='#8a6a44',
                     edgecolor='#5b431f', hatch='///', alpha=0.95, linewidth=1.1))

# 3 storeys above (whole footprint x 40-205)
floors = [(21, 30.5, "L3 — suites / private (24 beds)"),
          (30.5, 40, "L2 — dorm pods (24 beds)"),
          (40, 49.5, "L1 — commons / kitchen / program / ops")]
for y0, y1, lbl in floors:
    ax.add_patch(Rectangle((40, y0), 165, y1 - y0, facecolor='#1f2937',
                           edgecolor='#111827', linewidth=1.4))
    ax.text(122, (y0 + y1) / 2, lbl, ha='center', va='center', fontsize=7,
            weight='bold', color='white' if 'L1' not in lbl else '#e5e7eb')
# LL labels (walk-out south portion of LL is open: extend LL to x 160? bermed north=48-130; south under-house LL extension open: 130-160)
ax.add_patch(Rectangle((130, 8), 45, 13, facecolor='#3f2d1d', edgecolor='#1e1b4b',
                       linewidth=1.2, linestyle='--'))
ax.text(152, 14.5, "quiet pods (12)", ha='center', va='center', fontsize=5.4,
        weight='bold', color='#fde68a')
ax.text(89, 14.5, "LL — DEMO CLOSET + MDF + MECH", ha='center', va='center',
        fontsize=5.6, weight='bold', color='#a5b4fc')

# Roof PV
ax.add_patch(Rectangle((40, 49.5), 165, 2.4, facecolor='#fbbf24', edgecolor='#b45309', linewidth=1))
ax.text(122, 53.5, "ROOF PV 60 kW (30° racking, 48″ snow design)", ha='center',
        fontsize=5.6, weight='bold', color='#b45309')

# South glass + walk-out deck
ax.add_patch(Rectangle((200, 21), 5, 28.5, facecolor='#93c5fd', edgecolor='#1e40af', linewidth=1))
ax.add_patch(Rectangle((205, 17.5), 30, 3, facecolor='#d6b18f', edgecolor='#8c6239', linewidth=1))
ax.text(222, 23, "SOUTH WALK-OUT\nDECK (grade)", ha='center', fontsize=5, weight='bold',
        color='#78350f', linespacing=1.0)

# Exits: N stair (left), S stair + doors (right)
ax.annotate("", xy=(34, 24), xytext=(44, 24), arrowprops=dict(arrowstyle='-|>', color='#dc2626', lw=2))
ax.text(30, 30, "EXIT-N\n(stair to N grade)", ha='center', fontsize=5.2, weight='bold',
        color='#991b1b', linespacing=1.0)
ax.annotate("", xy=(212, 11), xytext=(200, 11), arrowprops=dict(arrowstyle='-|>', color='#dc2626', lw=2))
ax.text(222, 8, "EXIT-S doors\n(walk-out + stair)", ha='center', fontsize=5.2, weight='bold',
        color='#991b1b', linespacing=1.0)
ax.plot([175], [14.5], marker='D', color='#dc2626', markersize=6, markeredgecolor='white', markeredgewidth=1)
ax.text(175, 6, "egress window\n(pods)", ha='center', fontsize=5, weight='bold', color='#991b1b',
        linespacing=1.0)

# Radon riser + sump
ax.plot([70, 70], [8, 55], color='#16a34a', linewidth=2, linestyle='-.')
ax.text(66, 57, "radon riser", ha='center', fontsize=5, weight='bold', color='#15803d')
ax.plot([120], [8], marker='o', color='#0ea5e9', markersize=6)
ax.text(120, 2.5, "sump → reuse", ha='center', fontsize=5, weight='bold', color='#0369a1')

# Earth temperature callout
ax.text(89, 26.5, "55°F CONSTANT EARTH\non 3 of 4 walls", ha='center', fontsize=5.6,
        weight='bold', color='#fef3c7', linespacing=1.0,
        bbox=dict(boxstyle='round,pad=0.3', facecolor='#3f2d1d', alpha=0.95, edgecolor='#8a6a44'))

# Bed tally + annotations
ax.text(120, 60, "SECTION A-A (N ← → S) — MAIN HOUSE: 11,220 SF footprint × 3 L + bermed lower (6,300 SF)",
        ha='center', fontsize=9, weight='bold', color='#1f2937')
ax.text(120, -12, "60 beds designed (L1 quiet pods 12 + L2 dorm 24 + L3 suites/private 24) • 48 operated at CUP approval • bermed = north cut into bench, south walk-out at grade",
        ha='center', fontsize=6.4, color='#374151')
ax.text(120, -18, "IFC R-1/R-2 path: 2 remote exits, sprinklers, emergency egress from every sleep room • passive radon day-one (Kendrick volcanic) • "
                   "sump for bermed envelope • mech/demo in LL",
        ha='center', fontsize=6.2, color='#4b5563', style='italic')
ax.text(120, -26, "Thermal: earth-sheltered 55°F → near-zero heating on LL walls, 30–40% house heating cut vs exposed • WUI refuge • dark-sky: no light on N/W earth faces",
        ha='center', fontsize=6.2, color='#374151')
ax.text(120, -34, "Geotech gate: basalt depth sets cut method + LL cost — probe first • grade fall (14′/466′) is only 4′ across the house → cut/fill manufactures the walk-out",
        ha='center', fontsize=6.2, color='#7f1d1d', weight='bold')
ax.text(120, -42, "Waste: LL + house drain pumps up to gravity LOS field south (below-grade kills gravity — accepted, one pump station)",
        ha='center', fontsize=6.2, color='#4b5563')

# North arrow label
ax.text(-4, 30, "N", ha='center', fontsize=9, weight='bold', color='#1a2e1a')
ax.annotate('', xy=(-4, 46), xytext=(-4, 34), arrowprops=dict(arrowstyle='->', color='#1a2e1a', lw=1.6))
ax.text(237, 30, "S", ha='center', fontsize=9, weight='bold', color='#1a2e1a')

plt.tight_layout()
plt.savefig(f"{OUT}/RESIDENCY_V3_SECTION.png", dpi=270, facecolor='white', bbox_inches='tight')
plt.close()
print("Saved RESIDENCY_V3_SECTION.png")
