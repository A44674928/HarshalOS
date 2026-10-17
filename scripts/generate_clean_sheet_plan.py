#!/usr/bin/env python3
"""
Clean Sheet Design for APN 30055004 - Income-First, Modern Cabin, Min Disturbance
Kendrick Park bench 7,877-7,915' | 5.00 ac | 18% disturbance envelope
Layout rules:
  - Drive runs east of the interceptor swale (zero culverts)
  - Septic mid-slope, gravity 1.4% from lodge, 100' from well
  - Lodge E-W on 7,891' bench, SE glass to Humphreys 138.8 deg
  - ADU + Shop north-west flat (Phase 1 income cluster)
  - Barn + pasture south-west, orchard center, GH + retention east
"""
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle, FancyBboxPatch
from matplotlib.colors import LinearSegmentedColormap
from scipy.ndimage import gaussian_filter
import os

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

# Kendrick bench DEM 7,881-7,895' (north high)
base_north = 7895.0
elev = base_north - 14.0 * ((SIDE - yy) / SIDE)   # N-S fall 14' @3.0%
elev += -3.2 * (xx / SIDE)                          # W->E cross 3.2'
elev += -1.6 * np.exp(-((xx - (62 + 0.46 * yy))**2) / (2 * 58**2)) \
        * np.exp(-((yy - 88)**2) / (2 * 120**2))    # swale
elev += 0.35 * np.sin(xx / 38) * np.cos(yy / 33) + 0.22 * np.sin((xx + yy) / 65)
elev += gaussian_filter(np.random.randn(N, N) * 0.35, 2.5)

dy, dx = np.gradient(elev, RES)
slope_rad = np.arctan(np.sqrt(dx**2 + dy**2))
hillshade = 255 * (np.cos(np.radians(45)) * np.cos(slope_rad)
                   + np.sin(np.radians(45)) * np.sin(slope_rad)
                   * np.cos(np.radians(315) - np.radians(np.degrees(np.arctan2(dx, dy)))))
hillshade = np.clip(hillshade, 0, 255)

dem_colors = ["#0f1e2f", "#1d3d4a", "#2d5a3a", "#4a7c4e", "#6a9c6a", "#a8c9a8", "#d8dcc0", "#e8e0b8"]
dem_cmap = LinearSegmentedColormap.from_list("dem", dem_colors)
levels_2ft = np.arange(np.floor(elev.min()), np.ceil(elev.max()) + 1, 2)

# ====================== CLEAN SHEET PLAN ======================
fig, ax = plt.subplots(figsize=(16, 16))
fig.patch.set_facecolor('#eef2f1')
ax.set_facecolor('#eef2f1')
ax.set_xlim(-14, SIDE + 14)
ax.set_ylim(-14, SIDE + 14)
ax.set_aspect('equal')
ax.set_xticks([])
ax.set_yticks([])

ax.imshow(elev, cmap=dem_cmap, origin='lower', extent=[0, SIDE, 0, SIDE],
          alpha=0.32, vmin=elev.min() - 1, vmax=elev.max() + 1)
ax.imshow(hillshade, cmap='gray', origin='lower', extent=[0, SIDE, 0, SIDE], alpha=0.08)
CS = ax.contour(xx, yy, elev, levels=levels_2ft, colors='#5a7a6a',
                linewidths=0.55, alpha=0.55, linestyles='solid')
ax.clabel(CS, inline=True, fontsize=5.5, fmt='%1.0f', colors='#3a5a4a')

# --- Property line + setback + pins ---
ax.add_patch(Rectangle((0, 0), SIDE, SIDE, fill=False, edgecolor='#1a2e1a', linewidth=2.6))
ax.add_patch(Rectangle((SETBACK, SETBACK), SIDE - 2 * SETBACK, SIDE - 2 * SETBACK,
                       fill=False, edgecolor='#2d5a3a', linewidth=1.3, linestyle='--', alpha=0.9))
for px, py, lbl, ha in [(0, 0, "PIN SW", 'left'), (SIDE, 0, "PIN SE", 'right'),
                        (SIDE, SIDE, "PIN NE", 'right'), (0, SIDE, "PIN NW", 'left')]:
    dxo = 6 if ha == 'left' else -6
    ax.plot(px, py, marker='s', color='#1a2e1a', markersize=5,
            markeredgecolor='white', markeredgewidth=0.9)
    ax.text(px + dxo, py + 7, lbl, fontsize=5, color='#1a2e1a', weight='bold',
            ha=ha, va='bottom',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='white', alpha=0.88, edgecolor='#1a2e1a'))

# --- DRIVE: south gate -> east of swale -> motor court (ZERO culvert) ---
drive_x = np.array([233, 240, 300, 385, 398, 396, 390, 378])
drive_y = np.array([6, 57, 58, 64, 130, 210, 285, 335])
ax.plot(drive_x, drive_y, color='white', linewidth=9, solid_capstyle='round', solid_joinstyle='round')
ax.plot(drive_x, drive_y, color='#2b2b2b', linewidth=5.5, solid_capstyle='round', solid_joinstyle='round')
ax.plot(drive_x, drive_y, color='#f59e0b', linewidth=1.1, linestyle=':', alpha=0.9)
ax.add_patch(Circle((368, 364), 22, fill=False, edgecolor='#2b2b2b', linewidth=5.5))
ax.add_patch(Circle((368, 364), 22, fill=False, edgecolor='#f59e0b', linewidth=1.1, linestyle=':'))
ax.text(368, 364, "MOTOR\nCOURT", ha='center', va='center', fontsize=5,
        weight='bold', color='white', linespacing=0.9)
ax.text(368, 338, "92′ turnaround", ha='center', fontsize=4.5, color='#2b2b2b',
        weight='bold', bbox=dict(boxstyle='round,pad=0.2', facecolor='white', alpha=0.9))
ax.text(406, 175, "D\nR\nI\nV\nE", ha='center', va='center', fontsize=5.5,
        weight='bold', color='#2b2b2b', linespacing=0.7)
ax.text(310, 44, "8′ W • compacted basalt fines • east of swale → ZERO culvert",
        ha='center', fontsize=5.5, color='#2b2b2b', weight='bold',
        bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.95, edgecolor='#2b2b2b'))

# Gate + fire cistern
ax.plot(233, 4, marker='s', color='#b91c1c', markersize=7, markeredgecolor='white', markeredgewidth=1.1)
ax.text(233, -6, "GATE • stone pillars • cattle guard • heated mat",
        ha='center', va='top', fontsize=5.5, color='#7f1d1d', weight='bold',
        bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.95, edgecolor='#b91c1c'))
ax.add_patch(Circle((262, 80), 12, facecolor='#dbeafe', edgecolor='#1e40af', linewidth=1.2, alpha=0.95))
ax.text(262, 80, "10k\nFIRE", ha='center', va='center', fontsize=4.5,
        weight='bold', color='#1e40af', linespacing=0.8)

# --- WELL NW up-gradient ---
wx, wy = 80, 386
ax.plot(wx, wy, marker='o', color='#2563eb', markersize=7, markeredgecolor='white', markeredgewidth=1.1)
ax.add_patch(Circle((wx, wy), 50, fill=False, edgecolor='#2563eb', linewidth=1.1, linestyle='--', alpha=0.7))
ax.text(wx, wy + 16, "WELL 500′\n100′ BUFFER (up-gradient)", ha='center', fontsize=5.5,
        color='#1e40af', weight='bold',
        bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.96, edgecolor='#2563eb'))
ax.add_patch(Rectangle((wx + 12, wy - 6), 14, 10, facecolor='white', edgecolor='#2563eb', linewidth=0.9))
ax.text(wx + 19, wy - 1, "P", ha='center', va='center', fontsize=5, color='#1e40af', weight='bold')

# --- LODGE: modern cabin 4,500 SF 4BR/3BA on 7,891' bench ---
lx, ly, lw, lh = 158, 328, 138, 46
ax.add_patch(Rectangle((lx + 3, ly - 3), lw, lh, facecolor='black', alpha=0.08, edgecolor='none'))
ax.add_patch(FancyBboxPatch((lx, ly), lw, lh, boxstyle="round,pad=2",
                            facecolor='#1f2937', edgecolor='#111827', linewidth=1.6))
ax.add_patch(Rectangle((lx + 14, ly + 14), lw - 28, 9, facecolor='#a67c52',
                       edgecolor='#8c6239', linewidth=0.7, alpha=0.95))
ax.add_patch(Rectangle((lx + 8, ly + 2), lw - 16, 9, facecolor='#93c5fd',
                       edgecolor='#1e40af', linewidth=1, alpha=0.35))
for i in range(4):
    xi = lx + 18 + i * 30
    ax.plot([xi, xi], [ly + 2, ly + 11], color='#1e40af', linewidth=0.8, alpha=0.6)
ax.text(lx + lw / 2, ly + 37, "LODGE • MODERN CABIN • 4,500 SF • 4BR / 3BA",
        ha='center', fontsize=7, weight='bold', color='white')
ax.text(lx + lw / 2, ly + 29.5, "7,891′ bench • E-W axis • SE glass → Humphreys 138.8°",
        ha='center', fontsize=5.2, color='#e5e7eb')
ax.text(lx + lw / 2, ly + 7.5, "FLOOR-CEILING GLASS • passive solar • 22′ ridge (<35′)",
        ha='center', fontsize=4.8, color='#dbeafe', style='italic')
ax.plot([lx + 62, lx + 62], [ly - 2, ly + 48], color='#f59e0b', linewidth=1.2, linestyle='--')
ax.text(lx + 62, ly - 6, "18″ STEP", ha='center', fontsize=4.5, color='#92400e', weight='bold',
        bbox=dict(boxstyle='round,pad=0.2', facecolor='white', alpha=0.9))
# Deck SE
ax.add_patch(Rectangle((lx + 18, ly - 12), lw - 36, 11, facecolor='#d6b18f',
                       edgecolor='#8c6239', linewidth=0.9, alpha=0.85))
ax.text(lx + lw / 2, ly - 6.5, "LOW DECK 12×32 • ipe • dark-sky",
        ha='center', fontsize=4.5, color='#78350f', weight='bold')
# Porch N
ax.add_patch(Rectangle((185, 374), 56, 10, facecolor='white', edgecolor='#4b5563', linewidth=0.9, alpha=0.9))
ax.text(213, 379, "N ENTRY PORCH", ha='center', fontsize=4.5, color='#4b5563', weight='bold')
# BESS east of lodge
ax.add_patch(Rectangle((302, 350), 18, 12, facecolor='white', edgecolor='#4b5563', linewidth=0.8))
ax.text(311, 356, "BESS", ha='center', fontsize=4, weight='bold', color='#1f2937')

# --- ADU Phase 1 income ---
ax.add_patch(FancyBboxPatch((66, 280), 66, 36, boxstyle="round,pad=2",
                            facecolor='#374151', edgecolor='#111827', linewidth=1.3))
ax.add_patch(Rectangle((70, 284), 58, 5, facecolor='#93c5fd', edgecolor='#1e40af', linewidth=0.7, alpha=0.4))
ax.text(99, 304, "ADU  800 SF", ha='center', fontsize=6.5, weight='bold', color='white')
ax.text(99, 296, "2BR • Phase 1 income", ha='center', fontsize=5, color='#e5e7eb', weight='bold')
ax.text(99, 288, "INCOME FIRST", ha='center', fontsize=4.5, color='#fbbf24', weight='bold',
        bbox=dict(boxstyle='round,pad=0.2', facecolor='#1f2937', alpha=1))
ax.add_patch(Rectangle((76, 273), 46, 6, facecolor='#d6b18f', edgecolor='#8c6239', linewidth=0.7, alpha=0.7))
ax.text(99, 276, "patio", ha='center', fontsize=4, color='#78350f', style='italic')

# --- SHOP / GYM ---
ax.add_patch(FancyBboxPatch((138, 280), 60, 36, boxstyle="round,pad=2",
                            facecolor='#6b7280', edgecolor='#374151', linewidth=1.2))
ax.text(168, 302, "SHOP / GYM", ha='center', fontsize=6, weight='bold', color='white')
ax.text(168, 293, "1,500 SF • flex studio", ha='center', fontsize=4.8, color='#e5e7eb')
ax.text(168, 285, "future rental", ha='center', fontsize=4, color='#fbbf24', style='italic')

# --- BARN ---
ax.add_patch(FancyBboxPatch((68, 188), 118, 40, boxstyle="round,pad=2",
                            facecolor='#292524', edgecolor='#1c1917', linewidth=1.3))
ax.add_patch(Rectangle((76, 216), 102, 5, facecolor='#fef3c7', edgecolor='#a16207', linewidth=0.7, alpha=0.8))
ax.text(127, 210, "BARN  3,200 SF  5-STALL • low modern ag", ha='center',
        fontsize=6, weight='bold', color='white')
ax.text(127, 202, "7,887′ flat • stalls drain away • no fill in swale", ha='center',
        fontsize=4.8, color='#d6d3d1')
ax.text(127, 194, "board 2 stalls @ $400/mo", ha='center', fontsize=4.5,
        color='#fbbf24', weight='bold')
# PV south of barn
ax.add_patch(Rectangle((76, 178), 44, 9, facecolor='#fef08a', edgecolor='#a16207', linewidth=0.9, alpha=0.85))
for i in range(5):
    ax.plot([80 + i * 8, 80 + i * 8], [178, 187], color='#a16207', linewidth=0.8)
ax.text(98, 173, "25kW PV • 48″ snow • 30° tilt", ha='center', fontsize=4.5,
        color='#713f12', weight='bold')

# --- PASTURE ---
ax.add_patch(Rectangle((68, 90), 122, 80, facecolor='#86ab86', edgecolor='#4a7c4e',
                       linewidth=1, alpha=0.18, hatch='///'))
ax.text(129, 133, "PASTURE  1.5 AC", ha='center', fontsize=6, weight='bold', color='#1a3c1a')
ax.text(129, 124, "<2.8% flat • no ponding", ha='center', fontsize=5, color='#2d5a3a')

# --- GREENHOUSE (east of lodge, west of drive) ---
ax.add_patch(FancyBboxPatch((310, 300), 58, 24, boxstyle="round,pad=2",
                            facecolor='#ecfdf5', edgecolor='#065f46', linewidth=1.1, alpha=0.95))
for i in range(4):
    xi = 322 + i * 11
    ax.plot([xi, xi], [300, 324], color='#065f46', linewidth=0.7, alpha=0.5)
ax.text(339, 314, "GREENHOUSE 1,750 SF", ha='center', fontsize=5.5, weight='bold', color='#064e3b')
ax.text(339, 306, "on contour • floor 8″ below swale", ha='center', fontsize=4.5, color='#047857')

# --- ORCHARD (west of swale) ---
ax.add_patch(Rectangle((240, 110), 65, 105, facecolor='#a8c9a8', edgecolor='#4a7c4e',
                       linewidth=0.9, alpha=0.18))
for oy in np.linspace(120, 205, 7):
    for ox in [252, 265, 278, 291]:
        ax.plot(ox, oy, marker='o', color='#4a7c4e', markersize=2.5,
                markeredgecolor='white', markeredgewidth=0.4)
ax.text(246, 162, "ORCHARD 1.5 AC", ha='center', fontsize=5, weight='bold',
        color='#1a3c1a', rotation=90)

# --- SEPTIC mid-slope gravity ---
ax.add_patch(Rectangle((146, 240), 50, 30, facecolor='#ffedd5', edgecolor='#9a3412', linewidth=1.3))
ax.text(171, 258, "SEPTIC", ha='center', fontsize=5.5, weight='bold', color='#7c2d12')
ax.text(171, 250, "2,000G", ha='center', fontsize=5, color='#9a3412')
ax.add_patch(Rectangle((200, 240), 48, 30, facecolor='#ffedd5', edgecolor='#9a3412',
                       linewidth=1, linestyle=':', alpha=0.8))
ax.text(224, 255, "RESERVE", ha='center', fontsize=5, weight='bold', color='#9a3412')
ax.text(224, 247, "100% fenced", ha='center', fontsize=4, color='#c2410c')
ax.annotate('', xy=(215, 270), xytext=(205, 316),
            arrowprops=dict(arrowstyle='->', color='#9a3412', lw=1.3, linestyle='--'))
ax.text(230, 224, "1.4% GRAVITY — NO PUMP", ha='center', fontsize=5, weight='bold',
        color='#9a3412',
        bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.95, edgecolor='#9a3412'))
ax.annotate('', xy=(150, 266), xytext=(133, 276),
            arrowprops=dict(arrowstyle='->', color='#9a3412', lw=0.9, linestyle='--'))

# --- RETENTION (SE low) ---
ax.add_patch(Circle((352, 80), 20, facecolor='#dbeafe', edgecolor='#1e40af', linewidth=1.3, alpha=0.95))
ax.add_patch(Circle((352, 80), 14, fill=False, edgecolor='#93c5fd', linewidth=0.8, linestyle=':'))
ax.text(352, 83, "RETENTION", ha='center', fontsize=5, weight='bold', color='#1e40af')
ax.text(352, 76, "vernal pool", ha='center', fontsize=4.5, color='#3730a3', style='italic')

# --- INTERCEPTOR SWALE NW->SE (drive stays east of it) ---
sw_x = [76, 188, 312, 356]
sw_y = [374, 334, 208, 98]
ax.plot(sw_x, sw_y, color='#0ea5e9', linewidth=2, linestyle='--', alpha=0.9)
ax.text(278, 262, "INTERCEPTOR SWALE 1.9% → RETENTION", ha='center', fontsize=5.5,
        weight='bold', color='#0c4a6e', rotation=-45,
        bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.96, edgecolor='#0ea5e9'))

# --- SAVED TREES ---
for tx, ty in [(56, 414), (40, 300), (210, 398), (430, 180), (306, 268)]:
    ax.plot(tx, ty, marker='o', color='#1a3c1a', markersize=6.5,
            markeredgecolor='#86ab86', markeredgewidth=0.9)
    ax.plot(tx, ty, marker='o', color='#4a7c4e', markersize=3, markeredgecolor='none')

# --- MIN DISTURBANCE callout (NE) ---
ax.add_patch(FancyBboxPatch((300, 392), 156, 52, boxstyle="round,pad=5",
                            facecolor='#1f2937', edgecolor='#fbbf24', linewidth=1.5, alpha=0.96))
ax.text(378, 432, "MIN DISTURBANCE", ha='center', fontsize=6.5, weight='bold', color='#fbbf24')
ax.text(378, 423, "0.9 AC • 18% • 210 CY", ha='center', fontsize=8, weight='bold', color='white')
ax.text(378, 413, "↓ 52% CLEARING • $37k SAVED", ha='center', fontsize=5.5,
        weight='bold', color='#86efac')
ax.text(378, 405, "5 ponderosa saved • 5.2t CO₂", ha='center', fontsize=5, color='#d1d5db')
ax.text(378, 397, "INCOME FIRST: ADU → $29.7k NOI Y2", ha='center', fontsize=5,
        weight='bold', color='#fbbf24',
        bbox=dict(boxstyle='round,pad=0.3', facecolor='#111827', alpha=1))

# --- Legend (west mid) ---
ax.add_patch(Rectangle((14, 232), 108, 38, facecolor='white', edgecolor='#1a2e1a', linewidth=1, alpha=0.97))
ax.text(68, 264, "LEGEND", ha='center', fontsize=6, weight='bold', color='#1a2e1a')
ax.plot(22, 257, marker='s', color='#1f2937', markersize=5, markeredgecolor='#111827', markeredgewidth=0.7)
ax.text(32, 257, "Modern cabin (charcoal/cedar)", fontsize=5, color='#1f2937', va='center')
ax.plot(22, 249, marker='s', color='#ffedd5', markersize=5, markeredgecolor='#9a3412', markeredgewidth=0.7)
ax.text(32, 249, "Septic + 100% reserve (fenced)", fontsize=5, color='#1a2e1a', va='center')
ax.plot([22, 32], [241, 241], color='#0ea5e9', linewidth=2, linestyle='--')
ax.text(35, 241, "Interceptor swale 1.9% → vernal pool", fontsize=5, color='#0c4a6e', va='center')

# --- North arrow + scale bar (south center, clear zones) ---
ax.annotate('', xy=(310, 100), xytext=(310, 80), arrowprops=dict(arrowstyle='->', color='#1a2e1a', lw=1.6))
ax.text(310, 104, "N", ha='center', fontsize=8, weight='bold', color='#1a2e1a')
ax.plot([150, 200], [80, 80], color='#1a2e1a', linewidth=2.5)
ax.plot([150, 200], [80, 80], color='white', linewidth=1)
for i, lbl in enumerate(["0", "40′", "80′", "120′"]):
    xt = 150 + i * 16.7
    ax.plot([xt, xt], [77, 83], color='#1a2e1a', linewidth=1)
    ax.text(xt, 72, lbl, ha='center', fontsize=4.5, color='#1a2e1a')

# --- Title + footer ---
ax.set_title("APN 30055004 — CLEAN SHEET DESIGN • INCOME-FIRST MODERN CABIN • MIN-DISTURBANCE (18% • 210 CY)",
             color='#1f2937', fontsize=13, weight='bold', pad=14, loc='center')
fig.text(0.5, 0.015,
         "Scale: 1\"=40′ • 466.69′ × 466.69′ (5.00 ac) • Buildable 366.69′ sq at 50′-0\" setbacks • Elevation 7,877–7,895′ NAVD88 (USGS 3DEP; USFS Kendrick Cabin 7,910′ 0.5mi NE) • "
         "Datum: AZ Central State Plane 0202 • WUI Ord. 95-1 + IDA Dark Sky • For design-development — requires ALTA/NSPS by AZ RLS",
         ha='center', fontsize=6.5, color='#4b5563', style='italic')
fig.text(0.5, 0.005,
         "Modern cabin: charcoal metal + cedar, SE floor-ceiling glass 138.8° to Humphreys • Low 12×32 ipe deck • Passive solar • Income: ADU 2BR Phase-1 @ $3,600/mo mid-term (85% = $29.7k NOI Y2) → Lodge built Y2 → hybrid May–Oct @ $375 ADR",
         ha='center', fontsize=6, color='#6b7280')

plt.tight_layout(rect=[0, 0.03, 1, 0.97])
plt.savefig(f"{OUT}/CLEAN_SHEET_PLAN.png", dpi=280, facecolor=fig.get_facecolor(), bbox_inches='tight')
plt.close()
print("Saved CLEAN_SHEET_PLAN.png")

# ====================== PHASING ======================
fig, axes = plt.subplots(1, 3, figsize=(18, 7))
fig.patch.set_facecolor('#eef2f1')
for ax in axes:
    ax.set_facecolor('white')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_aspect('equal')
    for spine in ax.spines.values():
        spine.set_edgecolor('#2d5a3a')
        spine.set_linewidth(1.2)

ax = axes[0]
ax.add_patch(Rectangle((5, 5), 90, 90, fill=False, edgecolor='#2d5a3a', linewidth=1.5, linestyle='--'))
ax.add_patch(FancyBboxPatch((12, 45), 38, 28, boxstyle="round,pad=2",
                            facecolor='#374151', edgecolor='#111827', linewidth=1.2))
ax.text(31, 62, "ADU", ha='center', fontsize=8, weight='bold', color='white')
ax.text(31, 55, "2BR • LIVE HERE", ha='center', fontsize=5, color='#fbbf24', weight='bold')
ax.add_patch(FancyBboxPatch((55, 45), 32, 28, boxstyle="round,pad=2",
                            facecolor='#6b7280', edgecolor='#374151', linewidth=1.2))
ax.text(71, 60, "SHOP", ha='center', fontsize=7, weight='bold', color='white')
ax.add_patch(Circle((50, 82), 7, facecolor='#dbeafe', edgecolor='#1e40af', linewidth=1))
ax.text(50, 82, "W", ha='center', va='center', fontsize=6, weight='bold', color='#1e40af')
ax.add_patch(Rectangle((30, 18), 22, 14, facecolor='#ffedd5', edgecolor='#9a3412', linewidth=1))
ax.text(41, 25, "SEPTIC", ha='center', fontsize=5, weight='bold', color='#7c2d12')
ax.plot([50, 50], [5, 18], color='#2b2b2b', linewidth=4)
ax.text(50, 10, "DRIVE", ha='center', fontsize=5, weight='bold', color='white')
ax.set_title("PHASE 1 — ADU FIRST (Mo 6–10)\nLive here • ~45% of capex • CO #1 • income-ready",
             fontsize=9, weight='bold', color='#1f2937', pad=10)
ax.text(50, 2, "Occupy • Prove well/septic/winter", ha='center', fontsize=6,
        color='#2d5a3a', weight='bold',
        bbox=dict(boxstyle='round,pad=0.3', facecolor='#e8f5e9', alpha=1))

ax = axes[1]
ax.add_patch(Rectangle((5, 5), 90, 90, fill=False, edgecolor='#2d5a3a', linewidth=1.5, linestyle='--'))
ax.add_patch(FancyBboxPatch((10, 62), 42, 18, boxstyle="round,pad=1",
                            facecolor='#1f2937', edgecolor='#111827', linewidth=1.2))
ax.text(31, 71, "LODGE 4,500", ha='center', fontsize=6, weight='bold', color='white')
ax.add_patch(FancyBboxPatch((12, 45), 38, 14, boxstyle="round,pad=1",
                            facecolor='#374151', edgecolor='#111827', linewidth=1.2, alpha=0.9))
ax.text(31, 52, "ADU", ha='center', fontsize=6, weight='bold', color='white')
ax.text(31, 41, "← RENTAL $3,600/mo", ha='center', fontsize=5, color='#15803d', weight='bold',
        bbox=dict(boxstyle='round,pad=0.2', facecolor='white', alpha=0.9))
ax.add_patch(FancyBboxPatch((58, 32), 28, 20, boxstyle="round,pad=1",
                            facecolor='#292524', edgecolor='#1c1917', linewidth=1.1))
ax.text(72, 42, "BARN", ha='center', fontsize=6, weight='bold', color='white')
ax.add_patch(Rectangle((58, 14), 28, 10, facecolor='#86ab86', edgecolor='#4a7c4e',
                       linewidth=0.9, alpha=0.3, hatch='///'))
ax.text(72, 19, "PASTURE", ha='center', fontsize=5, color='#1a3c1a', weight='bold')
ax.set_title("PHASE 2 — LODGE + BARN (Mo 10–18)\nMove to Lodge • ADU → $29.7k NOI Y2",
             fontsize=9, weight='bold', color='#1f2937', pad=10)
ax.text(50, 2, "Cash-flowing while building", ha='center', fontsize=6,
        color='#2d5a3a', weight='bold',
        bbox=dict(boxstyle='round,pad=0.3', facecolor='#e8f5e9', alpha=1))

ax = axes[2]
ax.add_patch(Rectangle((5, 5), 90, 90, fill=False, edgecolor='#2d5a3a', linewidth=1.5, linestyle='--'))
ax.add_patch(FancyBboxPatch((10, 62), 42, 18, boxstyle="round,pad=1",
                            facecolor='#1f2937', edgecolor='#111827', linewidth=1.2))
ax.text(31, 71, "LODGE", ha='center', fontsize=6, weight='bold', color='white')
ax.text(53, 71, "= HOME", ha='center', fontsize=6, color='#1f2937', weight='bold',
        bbox=dict(boxstyle='round,pad=0.2', facecolor='white', alpha=0.9))
ax.add_patch(FancyBboxPatch((10, 45), 38, 14, boxstyle="round,pad=1",
                            facecolor='#374151', edgecolor='#111827', linewidth=1.2))
ax.text(29, 52, "ADU", ha='center', fontsize=6, weight='bold', color='white')
ax.text(44, 41, "$29.7k mid-term + hybrid", ha='center', fontsize=5, color='#15803d', weight='bold',
        bbox=dict(boxstyle='round,pad=0.2', facecolor='white', alpha=0.9))
ax.add_patch(FancyBboxPatch((56, 45), 22, 14, boxstyle="round,pad=1",
                            facecolor='#ecfdf5', edgecolor='#065f46', linewidth=1))
ax.text(67, 52, "GH", ha='center', fontsize=5, weight='bold', color='#065f46')
ax.add_patch(Rectangle((56, 30), 18, 10, facecolor='#dbeafe', edgecolor='#1e40af', linewidth=0.8))
ax.text(65, 35, "RET", ha='center', fontsize=4, color='#1e40af')
ax.text(50, 18, "ORCHARD + RETENTION + SOLAR", ha='center', fontsize=5,
        color='#4a7c4e', weight='bold')
ax.set_title("PHASE 3 — STABILIZED (Y3+)\nY4 $42.7k NOI • cap 10.2% • 5 ponderosa saved",
             fontsize=9, weight='bold', color='#1f2937', pad=10)
ax.text(50, 2, "Income funds refi • CUP optional Y5+", ha='center', fontsize=6,
        color='#2d5a3a', weight='bold',
        bbox=dict(boxstyle='round,pad=0.3', facecolor='#e8f5e9', alpha=1))

fig.suptitle("CLEAN SHEET PHASING — INCOME-FIRST • ADU → LODGE • LIVE WHERE YOU BUILD",
             fontsize=13, weight='bold', color='#1f2937', y=0.98)
fig.text(0.5, 0.02,
         "Single-parcel isolated: no second-parcel easement/debt/tax cross-default • Each CO funds the next • ADU Phase 1 is ~45% of cost but 100% of early income",
         ha='center', fontsize=7, color='#4b5563', style='italic')
plt.tight_layout(rect=[0, 0.05, 1, 0.95])
plt.savefig(f"{OUT}/PHASING_INCOME_FIRST.png", dpi=260, facecolor=fig.get_facecolor(), bbox_inches='tight')
plt.close()
print("Saved PHASING_INCOME_FIRST.png")

# ====================== SYSTEMS ======================
fig, ax = plt.subplots(figsize=(14, 8))
fig.patch.set_facecolor('white')
ax.set_facecolor('white')
ax.set_xlim(0, 100)
ax.set_ylim(0, 100)
ax.set_xticks([])
ax.set_yticks([])
ax.text(50, 96, "MODERN CABIN SYSTEMS — OFF-GRID READY, ON-PARCEL, NO PUMP",
        ha='center', fontsize=12, weight='bold', color='#1f2937')
ax.add_patch(FancyBboxPatch((5, 55), 28, 30, boxstyle="round,pad=4",
                            facecolor='#dbeafe', edgecolor='#1e40af', linewidth=1.4))
ax.text(19, 82, "WATER", ha='center', fontsize=9, weight='bold', color='#1e40af')
ax.text(19, 78, "500′ well →\n2,500-gal buried\ncistern (below\n42″ frost) → VFD\nto house • 100′\nbuffer • isolated",
        ha='center', va='top', fontsize=6, color='#374151', linespacing=1.1)
ax.add_patch(FancyBboxPatch((36, 55), 28, 30, boxstyle="round,pad=4",
                            facecolor='#ffedd5', edgecolor='#9a3412', linewidth=1.4))
ax.text(50, 82, "WASTE", ha='center', fontsize=9, weight='bold', color='#9a3412')
ax.text(50, 78, "2,000G tank →\n3,000 SF field\n+ 100% reserve\nfenced • gravity\n1.4% • no pump\nADEQ R18-9",
        ha='center', va='top', fontsize=6, color='#374151', linespacing=1.1)
ax.add_patch(FancyBboxPatch((67, 55), 28, 30, boxstyle="round,pad=4",
                            facecolor='#fef9c3', edgecolor='#a16207', linewidth=1.4))
ax.text(81, 82, "POWER", ha='center', fontsize=9, weight='bold', color='#713f12')
ax.text(81, 78, "25kW bifacial PV\n+ 80kWh BESS\n+ 30kW gen\ncharcoal barn roof\n48″ snow • 30° tilt\nself-grid",
        ha='center', va='top', fontsize=6, color='#374151', linespacing=1.1)
ax.add_patch(FancyBboxPatch((5, 18), 28, 30, boxstyle="round,pad=4",
                            facecolor='#fee2e2', edgecolor='#991b1b', linewidth=1.4))
ax.text(19, 45, "FIRE / WUI", ha='center', fontsize=9, weight='bold', color='#991b1b')
ax.text(19, 41, "10k-gal buried\n4.5″ NH hydrant\n20′ drive • 92′\nturnaround\n5′ non-combust\nClass A metal",
        ha='center', va='top', fontsize=6, color='#374151', linespacing=1.1)
ax.add_patch(FancyBboxPatch((36, 18), 28, 30, boxstyle="round,pad=4",
                            facecolor='#d0fae5', edgecolor='#065f46', linewidth=1.4))
ax.text(50, 45, "DRAINAGE", ha='center', fontsize=9, weight='bold', color='#065f46')
ax.text(50, 41, "NW interceptor\n1.9% → SE\nvernal pool\nretention\nall on-parcel\nno lot-line",
        ha='center', va='top', fontsize=6, color='#374151', linespacing=1.1)
ax.add_patch(FancyBboxPatch((67, 18), 28, 30, boxstyle="round,pad=4",
                            facecolor='#1f2937', edgecolor='#e5e7eb', linewidth=1.4))
ax.text(81, 45, "DARK SKY", ha='center', fontsize=9, weight='bold', color='#fbbf24')
ax.text(81, 41, "B0-L0-U0\n2700K fully\nshielded\n0 uplight\nlumen <25k/ac\nFlagstaff IDA",
        ha='center', va='top', fontsize=6, color='#e5e7eb', linespacing=1.1)
ax.text(50, 8,
        "Income-first = off-grid is not an upgrade — it's occupancy. Starlink + power + water + fire are in Phase 1 capex, not Phase 3.",
        ha='center', fontsize=7, color='#4b5563', weight='bold', style='italic',
        bbox=dict(boxstyle='round,pad=0.4', facecolor='#fef9c3', alpha=1))
plt.savefig(f"{OUT}/SYSTEMS_OFF_GRID.png", dpi=260, bbox_inches='tight')
plt.close()
print("Saved SYSTEMS_OFF_GRID.png")
print("Clean sheet package done")
