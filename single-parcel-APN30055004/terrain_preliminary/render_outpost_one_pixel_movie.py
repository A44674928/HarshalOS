#!/usr/bin/env python3
"""Render a lo-fi concept flythrough from the parcel GIS outline + 10 EPQS points.

This intentionally does NOT use the synthetic GeoTIFF/contours in terrain_real/.
Building and circulation masses are illustrative, not survey-aligned or design-scale.
"""
from __future__ import annotations

import csv
import json
import math
import random
import subprocess
from pathlib import Path
from typing import Iterable

import numpy as np
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

HERE = Path(__file__).resolve().parent
PARCEL_PATH = HERE / "parcel_outline.geojson"
SAMPLES_PATH = HERE / "epqs_samples.csv"
VIDEO_PATH = HERE / "outpost-one-pixel-concept-film.mp4"
POSTER_PATH = HERE / "outpost-one-pixel-concept-poster.png"
OBJ_PATH = HERE / "outpost-one-concept-model.obj"
MTL_PATH = HERE / "outpost-one-concept-model.mtl"

# Render a low-resolution picture and enlarge it with nearest-neighbour pixels.
LOW_W, LOW_H = 384, 216
SCALE = 3
OUT_W, OUT_H = LOW_W * SCALE, LOW_H * SCALE
FPS = 12
DURATION = 24
FRAME_COUNT = FPS * DURATION
VERTICAL_EXAGGERATION = 2.5

PALETTE = {
    "terrain_low": (36, 68, 70),
    "terrain_mid": (67, 105, 82),
    "terrain_high": (138, 143, 97),
    "terrain_edge": (26, 47, 50),
    "parcel": (255, 195, 89),
    "road": (98, 103, 103),
    "road_edge": (44, 51, 52),
    "concrete": (129, 127, 112),
    "house_wall": (38, 48, 60),
    "house_shadow": (20, 27, 38),
    "roof": (23, 30, 39),
    "cedar": (107, 74, 52),
    "glass": (62, 171, 196),
    "glass_dark": (29, 80, 100),
    "lab": (64, 57, 126),
    "medical": (224, 229, 218),
    "amber": (255, 194, 93),
    "cyan": (97, 224, 246),
    "pine_a": (28, 82, 61),
    "pine_b": (41, 108, 72),
    "pine_c": (57, 129, 82),
    "trunk": (94, 66, 43),
    "pond": (43, 129, 164),
    "greenhouse": (83, 145, 128),
    "solar": (40, 78, 123),
    "white": (234, 240, 224),
    "red": (223, 103, 82),
}

FONT_PATH = Path("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf")
FONT_PATH_REG = Path("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf")

def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    path = FONT_PATH if bold else FONT_PATH_REG
    try:
        return ImageFont.truetype(str(path), size=size)
    except OSError:
        return ImageFont.load_default()


def load_site_data():
    parcel_doc = json.loads(PARCEL_PATH.read_text())
    ring = parcel_doc["features"][0]["geometry"]["coordinates"][0]
    lons = [p[0] for p in ring]
    lats = [p[1] for p in ring]
    lon0, lat0 = min(lons), min(lats)
    mean_lat = sum(lats) / len(lats)
    feet_per_lon_degree = 111_320.0 * 3.280839895 * math.cos(math.radians(mean_lat))
    feet_per_lat_degree = 111_132.0 * 3.280839895

    def local(lon: float, lat: float) -> tuple[float, float]:
        return ((lon - lon0) * feet_per_lon_degree, (lat - lat0) * feet_per_lat_degree)

    outline = [local(lon, lat) for lon, lat in ring]
    width = max(x for x, _ in outline)
    height = max(y for _, y in outline)
    samples = []
    with SAMPLES_PATH.open(newline="") as source:
        for row in csv.DictReader(source):
            x, y = local(float(row["longitude_wgs84"]), float(row["latitude_wgs84"]))
            samples.append((x, y, float(row["elevation_ft"])))
    mean_elev = sum(p[2] for p in samples) / len(samples)
    return outline, width, height, samples, mean_elev, local


OUTLINE, SITE_W, SITE_H, SAMPLES, MEAN_ELEV, LOCAL = load_site_data()


def inside_polygon(x: float, y: float) -> bool:
    inside = False
    for i in range(len(OUTLINE) - 1):
        x1, y1 = OUTLINE[i]
        x2, y2 = OUTLINE[i + 1]
        crosses = ((y1 > y) != (y2 > y)) and (x < (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-12) + x1)
        if crosses:
            inside = not inside
    return inside


def raw_elevation(x: float, y: float) -> float:
    # Inverse-distance interpolation is only a visual bridge between ten queried points.
    # It is not a gridded DEM, contour model, or design-grade surface.
    weighted = 0.0
    total = 0.0
    for sx, sy, elev in SAMPLES:
        d2 = (x - sx) ** 2 + (y - sy) ** 2
        if d2 < 1e-10:
            return elev
        weight = 1.0 / (d2 + 9.0)  # softened inverse-square weighting, distance in ft
        weighted += weight * elev
        total += weight
    return weighted / total


def terrain_z(x: float, y: float) -> float:
    return (raw_elevation(x, y) - MEAN_ELEV) * VERTICAL_EXAGGERATION


def palette_mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    return tuple(int(a[i] * (1.0 - t) + b[i] * t) for i in range(3))


def elevation_color(elevation: float) -> tuple[int, int, int]:
    low = min(s[2] for s in SAMPLES)
    high = max(s[2] for s in SAMPLES)
    t = (elevation - low) / max(0.01, high - low)
    if t < 0.55:
        return palette_mix(PALETTE["terrain_low"], PALETTE["terrain_mid"], t / 0.55)
    return palette_mix(PALETTE["terrain_mid"], PALETTE["terrain_high"], (t - 0.55) / 0.45)


# A face is (vertices, flat color, MTL material name, outline color, group).
FACES: list[tuple[list[tuple[float, float, float]], tuple[int, int, int], str, tuple[int, int, int] | None, str]] = []
MATERIALS: dict[str, tuple[int, int, int]] = {}


def add_face(points: Iterable[tuple[float, float, float]], color: tuple[int, int, int], material: str, outline=None, group="site"):
    pts = list(points)
    if len(pts) < 3:
        return
    FACES.append((pts, color, material, outline, group))
    MATERIALS.setdefault(material, color)


def terrain_faces():
    nx, ny = 34, 20
    xs = [SITE_W * i / nx for i in range(nx + 1)]
    ys = [SITE_H * j / ny for j in range(ny + 1)]
    grid = [[(x, y, terrain_z(x, y), raw_elevation(x, y)) for x in xs] for y in ys]
    for j in range(ny):
        for i in range(nx):
            a, b = grid[j][i], grid[j][i + 1]
            c, d = grid[j + 1][i + 1], grid[j + 1][i]
            for tri in ((a, b, c), (a, c, d)):
                cx = sum(p[0] for p in tri) / 3
                cy = sum(p[1] for p in tri) / 3
                if not inside_polygon(cx, cy):
                    continue
                elev = sum(p[3] for p in tri) / 3
                col = elevation_color(elev)
                add_face([(p[0], p[1], p[2]) for p in tri], col, "terrain", PALETTE["terrain_edge"], "terrain")


def add_box(x: float, y: float, w: float, d: float, z0: float, z1: float, material="house_wall", group="building", colors=None):
    # x/y mark the southwest corner, z values are already vertically exaggerated.
    p000 = (x, y, z0)
    p100 = (x + w, y, z0)
    p110 = (x + w, y + d, z0)
    p010 = (x, y + d, z0)
    p001 = (x, y, z1)
    p101 = (x + w, y, z1)
    p111 = (x + w, y + d, z1)
    p011 = (x, y + d, z1)
    c = colors or {}
    add_face([p000, p010, p011, p001], c.get("west", PALETTE["house_shadow"]), material + "_west", group=group)
    add_face([p100, p101, p111, p110], c.get("east", PALETTE["house_wall"]), material + "_east", group=group)
    add_face([p000, p001, p101, p100], c.get("south", PALETTE["house_wall"]), material + "_south", group=group)
    add_face([p010, p110, p111, p011], c.get("north", PALETTE["house_shadow"]), material + "_north", group=group)
    add_face([p001, p011, p111, p101], c.get("top", PALETTE["roof"]), material + "_top", group=group)


def add_cabin(x: float, y: float, w: float, d: float, ground: float, floors: int, roof_color=None, group="hq", glass=True, gable=True):
    # Ground and floor heights are multiplied by the same relief exaggeration as the land.
    roof_color = roof_color or PALETTE["roof"]
    wall_h = (10.5 * floors) * VERTICAL_EXAGGERATION
    roof_h = (8.0 if gable else 2.0) * VERTICAL_EXAGGERATION
    base = ground
    top = base + wall_h
    # Footing slab / stepped foundation.
    add_box(x - 2, y - 2, w + 4, d + 4, base - 1.4 * VERTICAL_EXAGGERATION, base, "foundation", group,
            {"west": (37, 43, 47), "east": (89, 87, 77), "south": (109, 105, 91), "north": (51, 56, 59), "top": (118, 113, 96)})
    add_box(x, y, w, d, base, top, "cabin_wall", group,
            {"west": (25, 33, 44), "east": (47, 57, 63), "south": PALETTE["cedar"], "north": (35, 45, 53), "top": roof_color})
    # Gable end triangles and the two roof planes.
    if gable:
        ridge_y = y + d / 2
        ridge_z = top + roof_h
        add_face([(x, y, top), (x, y + d, top), (x, ridge_y, ridge_z)], (73, 58, 47), "gable", group=group)
        add_face([(x + w, y, top), (x + w, ridge_y, ridge_z), (x + w, y + d, top)], (57, 49, 45), "gable", group=group)
        add_face([(x, y, top), (x, ridge_y, ridge_z), (x + w, ridge_y, ridge_z), (x + w, y, top)], roof_color, "roof_south", group=group)
        add_face([(x, y + d, top), (x + w, y + d, top), (x + w, ridge_y, ridge_z), (x, ridge_y, ridge_z)], (31, 40, 49), "roof_north", group=group)
    else:
        add_face([(x, y, top), (x + w, y, top), (x + w, y + d, top), (x, y + d, top)], roof_color, "flat_roof", group=group)
    if glass:
        # South-facing windows; the cyan strips read as windows in the intentionally chunky render.
        for level in range(floors):
            zlo = base + (level * 10.5 + 3.0) * VERTICAL_EXAGGERATION
            zhi = zlo + 3.0 * VERTICAL_EXAGGERATION
            for frac in (0.15, 0.34, 0.53, 0.72):
                xa = x + w * frac
                xb = xa + w * 0.105
                add_face([(xa, y - 0.28, zlo), (xb, y - 0.28, zlo), (xb, y - 0.28, zhi), (xa, y - 0.28, zhi)], PALETTE["glass"], "window", group=group)
    return base, top, top + roof_h


def add_gable_roof_panels(x: float, y: float, w: float, d: float, base: float, height: float, group="barn"):
    ridge_y = y + d / 2
    z = base + height
    ridge_z = z + 6 * VERTICAL_EXAGGERATION
    add_face([(x, y, z), (x, ridge_y, ridge_z), (x + w, ridge_y, ridge_z), (x + w, y, z)], PALETTE["roof"], "barn_roof_south", group=group)
    add_face([(x, y + d, z), (x + w, y + d, z), (x + w, ridge_y, ridge_z), (x, ridge_y, ridge_z)], (31, 40, 49), "barn_roof_north", group=group)


def add_pyramid_tree(x: float, y: float, base: float, height: float, radius: float, group="pines"):
    # A four-sided, tiered ponderosa silhouette: deliberately blocky.
    trunk_h = height * 0.23
    add_box(x - radius * 0.10, y - radius * 0.10, radius * 0.20, radius * 0.20,
            base, base + trunk_h, "trunk", group,
            {"west": (69, 47, 33), "east": PALETTE["trunk"], "south": (110, 75, 46), "north": (72, 49, 34), "top": PALETTE["trunk"]})
    zbottom = base + trunk_h * 0.35
    ztop = base + height
    rings = [(zbottom, radius), (base + height * 0.52, radius * 0.76), (base + height * 0.73, radius * 0.52)]
    colors = [PALETTE["pine_a"], PALETTE["pine_b"], PALETTE["pine_c"]]
    angles = [math.radians(45 + i * 90) for i in range(4)]
    for tier, (ring_z, ring_r) in enumerate(rings):
        next_z = (rings[tier + 1][0] if tier + 1 < len(rings) else ztop)
        next_r = (rings[tier + 1][1] * 0.68 if tier + 1 < len(rings) else 0.0)
        for i in range(4):
            a1, a2 = angles[i], angles[(i + 1) % 4]
            p1 = (x + math.cos(a1) * ring_r, y + math.sin(a1) * ring_r, ring_z)
            p2 = (x + math.cos(a2) * ring_r, y + math.sin(a2) * ring_r, ring_z)
            q1 = (x + math.cos(a1) * next_r, y + math.sin(a1) * next_r, next_z)
            q2 = (x + math.cos(a2) * next_r, y + math.sin(a2) * next_r, next_z)
            add_face([p1, p2, q2, q1], colors[(i + tier) % len(colors)], f"pine_{tier}_{i}", group=group)


def add_ribbon(points: list[tuple[float, float]], width: float, material: str, group="circulation", elevation_offset=0.7):
    halves = []
    for i, (x, y) in enumerate(points):
        if i == 0:
            dx, dy = points[1][0] - x, points[1][1] - y
        elif i == len(points) - 1:
            dx, dy = x - points[i - 1][0], y - points[i - 1][1]
        else:
            dx, dy = points[i + 1][0] - points[i - 1][0], points[i + 1][1] - points[i - 1][1]
        length = math.hypot(dx, dy) or 1
        nx, ny = -dy / length, dx / length
        halves.append(((x + nx * width / 2, y + ny * width / 2), (x - nx * width / 2, y - ny * width / 2)))
    for i in range(len(halves) - 1):
        a1, a2 = halves[i]
        b1, b2 = halves[i + 1]
        pts = [(a1[0], a1[1], terrain_z(*a1) + elevation_offset),
               (b1[0], b1[1], terrain_z(*b1) + elevation_offset),
               (b2[0], b2[1], terrain_z(*b2) + elevation_offset),
               (a2[0], a2[1], terrain_z(*a2) + elevation_offset)]
        add_face(pts, PALETTE.get(material, PALETTE["road"]), material, PALETTE["road_edge"], group)


def add_ring(cx: float, cy: float, outer: float, inner: float, material="road", group="motor_court"):
    count = 20
    for i in range(count):
        a1 = 2 * math.pi * i / count
        a2 = 2 * math.pi * (i + 1) / count
        points = []
        for a, r in ((a1, outer), (a2, outer), (a2, inner), (a1, inner)):
            x, y = cx + math.cos(a) * r, cy + math.sin(a) * r
            points.append((x, y, terrain_z(x, y) + 0.9))
        add_face(points, PALETTE.get(material, PALETTE["road"]), material, PALETTE["road_edge"], group)


def add_octagonal_soak(cx: float, cy: float, rx: float, ry: float, ground: float, group="nordic_spa"):
    # Compact recirculating hot-soak feature shown as a concept tub, not a swimming pool.
    count = 8
    outer = []
    inner = []
    low = ground - 0.5 * VERTICAL_EXAGGERATION
    rim_z = ground + 2.1 * VERTICAL_EXAGGERATION
    water_z = ground + 1.45 * VERTICAL_EXAGGERATION
    for i in range(count):
        angle = 2 * math.pi * i / count + math.pi / 8
        outer.append((cx + math.cos(angle) * rx, cy + math.sin(angle) * ry))
        inner.append((cx + math.cos(angle) * rx * 0.79, cy + math.sin(angle) * ry * 0.79))
    for i in range(count):
        j = (i + 1) % count
        a, b = outer[i], outer[j]
        ia, ib = inner[i], inner[j]
        add_face([(a[0], a[1], low), (b[0], b[1], low), (b[0], b[1], rim_z), (a[0], a[1], rim_z)],
                 (92, 66, 48), "soak_tub_side", group=group)
        add_face([(a[0], a[1], rim_z), (b[0], b[1], rim_z), (ib[0], ib[1], rim_z), (ia[0], ia[1], rim_z)],
                 (139, 105, 68), "soak_tub_rim", group=group)
        add_face([(cx, cy, water_z), (ia[0], ia[1], water_z), (ib[0], ib[1], water_z)],
                 (52, 151, 169), "hot_soak_water", group=group)


def add_nordic_spa(x: float, y: float):
    # Co-located with the prior amenity-barn concept to keep the new circuit compact.
    deck_w, deck_d = 68, 52
    ground = terrain_z(x + deck_w / 2, y + deck_d / 2)
    add_box(x, y, deck_w, deck_d, ground - 0.7 * VERTICAL_EXAGGERATION,
            ground + 0.7 * VERTICAL_EXAGGERATION, "spa_deck", "nordic_spa",
            {"west": (78, 58, 45), "east": (115, 83, 57), "south": (125, 91, 59),
             "north": (70, 55, 46), "top": (147, 111, 70)})
    # Small dry sauna / warm room.
    sx, sy, sw, sd = x + 7, y + 21, 25, 19
    sauna_ground = terrain_z(sx + sw / 2, sy + sd / 2) + 0.8 * VERTICAL_EXAGGERATION
    _, _, sauna_roof = add_cabin(sx, sy, sw, sd, sauna_ground, floors=1, group="sauna_pavilion", glass=False, gable=True)
    # Warm amber glazing signals a sauna interior, not an operating/medical room.
    add_face([(sx + 7, sy - 0.3, sauna_ground + 4 * VERTICAL_EXAGGERATION),
              (sx + 17, sy - 0.3, sauna_ground + 4 * VERTICAL_EXAGGERATION),
              (sx + 17, sy - 0.3, sauna_ground + 8 * VERTICAL_EXAGGERATION),
              (sx + 7, sy - 0.3, sauna_ground + 8 * VERTICAL_EXAGGERATION)], (219, 159, 83), "sauna_glow", group="sauna_pavilion")
    # Hot soak and cold plunge, sized as small vessels; water, heat and code loads remain untested.
    add_octagonal_soak(x + 48, y + 18, 8.5, 7.0, terrain_z(x + 48, y + 18) + 1.4, "hot_soak")
    plunge_x, plunge_y = x + 46, y + 34
    plunge_ground = terrain_z(plunge_x + 4, plunge_y + 4) + 1.2 * VERTICAL_EXAGGERATION
    add_box(plunge_x, plunge_y, 8, 8, plunge_ground - 1.0 * VERTICAL_EXAGGERATION,
            plunge_ground + 2.0 * VERTICAL_EXAGGERATION, "cold_plunge", "cold_plunge",
            {"west": (64, 79, 79), "east": (95, 108, 99), "south": (113, 119, 100),
             "north": (64, 77, 77), "top": (67, 172, 196)})
    # Low privacy screens and two rest benches define a quiet, low-light courtyard.
    screen_color = (92, 68, 49)
    add_box(x + 1, y + 1, 1.1, deck_d - 2, ground, ground + 5 * VERTICAL_EXAGGERATION, "spa_screen", "spa_privacy",
            {"west": screen_color, "east": screen_color, "south": screen_color, "north": screen_color, "top": (118, 88, 58)})
    add_box(x + deck_w - 2, y + 1, 1.1, deck_d - 2, ground, ground + 5 * VERTICAL_EXAGGERATION, "spa_screen", "spa_privacy",
            {"west": screen_color, "east": screen_color, "south": screen_color, "north": screen_color, "top": (118, 88, 58)})
    for bx in (x + 34, x + 45):
        add_box(bx, y + 5, 8, 2.2, ground + 0.8 * VERTICAL_EXAGGERATION,
                ground + 2.1 * VERTICAL_EXAGGERATION, "rest_bench", "spa_rest")
    # Two dim amber markers only; no bright site lighting is implied.
    for lx, ly in ((x + 5, y + 5), (x + deck_w - 5, y + deck_d - 5)):
        add_box(lx - 0.7, ly - 0.7, 1.4, 1.4, ground, ground + 2.2 * VERTICAL_EXAGGERATION,
                "low_light_marker", "spa_low_light",
                {"west": (95, 67, 41), "east": (133, 94, 51), "south": (164, 112, 55),
                 "north": (83, 61, 42), "top": (242, 185, 91)})


def add_communal_dining_deck(hx: float, hy: float, hw: float):
    # Small south walk-out terrace for the shared kitchen / greenhouse-to-table program.
    x, y, width, depth = hx + 30, hy - 19, 104, 17
    ground = terrain_z(x + width / 2, y + depth / 2)
    add_box(x, y, width, depth, ground - 0.5 * VERTICAL_EXAGGERATION,
            ground + 0.7 * VERTICAL_EXAGGERATION, "dining_deck", "communal_deck",
            {"west": (84, 62, 47), "east": (117, 84, 56), "south": (128, 94, 59),
             "north": (75, 57, 45), "top": (151, 111, 69)})
    table_x, table_y = x + 34, y + 6
    table_z = ground + 2.3 * VERTICAL_EXAGGERATION
    add_box(table_x, table_y, 32, 3.5, ground + 1.1 * VERTICAL_EXAGGERATION, table_z,
            "communal_table", "dining_table",
            {"west": (82, 57, 40), "east": (123, 85, 52), "south": (143, 96, 56),
             "north": (81, 59, 43), "top": (170, 121, 67)})
    for bx in (table_x + 5, table_x + 15, table_x + 25):
        for by in (table_y - 2.5, table_y + 4.5):
            add_box(bx, by, 3.5, 1.4, ground + 0.8 * VERTICAL_EXAGGERATION,
                    ground + 1.9 * VERTICAL_EXAGGERATION, "dining_bench", "dining_seating")


def add_scene_geometry():
    # Terrain first; the model uses the actual assessor/GIS ring and only the ten point elevations.
    terrain_faces()
    # A very thin ribbon makes the GIS parcel proxy visible in external OBJ viewers too.
    for i in range(len(OUTLINE) - 1):
        x1, y1 = OUTLINE[i]
        x2, y2 = OUTLINE[i + 1]
        dx, dy = x2 - x1, y2 - y1
        length = math.hypot(dx, dy) or 1.0
        ox, oy = -dy / length * 0.8, dx / length * 0.8
        p1 = (x1 + ox, y1 + oy)
        p2 = (x2 + ox, y2 + oy)
        p3 = (x2 - ox, y2 - oy)
        p4 = (x1 - ox, y1 - oy)
        add_face([(p1[0], p1[1], terrain_z(*p1) + 1.4),
                  (p2[0], p2[1], terrain_z(*p2) + 1.4),
                  (p3[0], p3[1], terrain_z(*p3) + 1.4),
                  (p4[0], p4[1], terrain_z(*p4) + 1.4)],
                 PALETTE["parcel"], "gis_parcel_edge", group="assessor_gis_outline")
    # Illustrative internal circulation: stays on the parcel and deliberately does not assert external access.
    road = [
        (SITE_W * 0.79, SITE_H * 0.01),
        (SITE_W * 0.82, SITE_H * 0.10),
        (SITE_W * 0.88, SITE_H * 0.22),
        (SITE_W * 0.90, SITE_H * 0.47),
        (SITE_W * 0.87, SITE_H * 0.65),
    ]
    add_ribbon(road, 10, "road", "internal_drive")
    court_x, court_y = SITE_W * 0.84, SITE_H * 0.71
    add_ring(court_x, court_y, 33, 23, "road", "motor_court")
    add_ribbon([(SITE_W * 0.87, SITE_H * 0.65), (SITE_W * 0.82, SITE_H * 0.70), (SITE_W * 0.73, SITE_H * 0.67)], 11, "road", "clinic_lane")

    # A small HQ blockout: 3 occupied levels above a north-cut bermed wing.
    hx, hy, hw, hd = SITE_W * 0.43, SITE_H * 0.48, 176, 62
    hground = terrain_z(hx + hw / 2, hy + hd / 2)
    # The lower wing is a simple exposed walk-out mass; soil berms are not modeled as engineered earthwork.
    add_box(hx + 15, hy + 8, hw - 22, hd - 14,
            hground - 16 * VERTICAL_EXAGGERATION, hground + 1.0 * VERTICAL_EXAGGERATION,
            "bermed_wing", "bermed_wing",
            {"west": (29, 36, 62), "east": (48, 51, 76), "south": (59, 54, 107), "north": (27, 31, 50), "top": (38, 40, 67)})
    hbase, htop, hridge = add_cabin(hx, hy, hw, hd, hground, floors=3, group="outpost_hq", glass=True, gable=True)
    add_communal_dining_deck(hx, hy, hw)
    # Low lab/demo-closet volume on the west end, visually distinct from the residential mass.
    demo_x, demo_y, demo_w, demo_d = hx - 25, hy + 7, 34, 32
    demo_g = terrain_z(demo_x + demo_w / 2, demo_y + demo_d / 2)
    add_box(demo_x, demo_y, demo_w, demo_d, demo_g, demo_g + 9 * VERTICAL_EXAGGERATION,
            "demo_closet", "demo_closet",
            {"west": (39, 41, 92), "east": (65, 61, 144), "south": (70, 65, 151), "north": (40, 43, 101), "top": (44, 49, 111)})
    # Medical room is represented as a small wing/marker only; no clinical fit-out is implied.
    med_x, med_y = hx + hw - 38, hy + 2
    med_z = terrain_z(med_x + 18, med_y + 24)
    add_box(med_x, med_y, 38, 49, med_z, med_z + 12 * VERTICAL_EXAGGERATION,
            "medical_core", "medical_core",
            {"west": (95, 107, 110), "east": (135, 146, 142), "south": (147, 154, 142), "north": (89, 102, 106), "top": (42, 51, 62)})
    # A tiny white-plus marker is part of the visual key, not a claim of a licensed clinic.
    plus_x, plus_y, plus_z = med_x + 30, med_y - 0.4, med_z + 6 * VERTICAL_EXAGGERATION
    arm = 2.4
    add_face([(plus_x - arm, plus_y, plus_z - arm / 2), (plus_x + arm, plus_y, plus_z - arm / 2),
              (plus_x + arm, plus_y, plus_z + arm / 2), (plus_x - arm, plus_y, plus_z + arm / 2)], PALETTE["red"], "medical_mark", group="medical_core")
    add_face([(plus_x - arm / 2, plus_y, plus_z - arm), (plus_x + arm / 2, plus_y, plus_z - arm),
              (plus_x + arm / 2, plus_y, plus_z + arm), (plus_x - arm / 2, plus_y, plus_z + arm)], PALETTE["white"], "medical_mark_white", group="medical_core")

    # ADU / owner residence, deliberately a simple detached cabin mass.
    ax, ay, aw, ad = SITE_W * 0.16, SITE_H * 0.53, 48, 30
    add_cabin(ax, ay, aw, ad, terrain_z(ax + aw / 2, ay + ad / 2), floors=1, group="adu", glass=False, gable=True)

    # Barn / utility block with an abstract roof array; no power or capacity claim is shown.
    bx, by, bw, bd = SITE_W * 0.16, SITE_H * 0.13, 72, 42
    bg = terrain_z(bx + bw / 2, by + bd / 2)
    add_box(bx, by, bw, bd, bg, bg + 16 * VERTICAL_EXAGGERATION, "barn_wall", "barn",
            {"west": (38, 38, 42), "east": (58, 54, 52), "south": (65, 56, 49), "north": (38, 40, 44), "top": PALETTE["roof"]})
    add_gable_roof_panels(bx, by, bw, bd, bg, 16 * VERTICAL_EXAGGERATION, "barn")
    add_nordic_spa(SITE_W * 0.27, SITE_H * 0.12)
    # Dark blue small roof tiles suggest PV, not a specified array.
    for ix in range(4):
        for iy in range(2):
            px = bx + 10 + ix * 12
            py = by + 5 + iy * 8
            pz = bg + 16 * VERTICAL_EXAGGERATION + 2.8 * VERTICAL_EXAGGERATION
            add_face([(px, py, pz), (px + 10, py, pz), (px + 10, py + 5, pz + 0.8), (px, py + 5, pz + 0.8)], PALETTE["solar"], "roof_tile", group="barn")

    # Greenhouse: framed glass volume, not a final crop/build specification.
    gx, gy, gw, gd = SITE_W * 0.57, SITE_H * 0.73, 54, 27
    gg = terrain_z(gx + gw / 2, gy + gd / 2)
    add_box(gx, gy, gw, gd, gg, gg + 8 * VERTICAL_EXAGGERATION, "greenhouse", "greenhouse",
            {"west": (52, 95, 94), "east": (78, 131, 115), "south": (74, 135, 129), "north": (44, 81, 78), "top": (90, 158, 144)})

    # Small internal ambulance approach to the medical wing. It joins only the conceptual internal loop.
    add_ribbon([(SITE_W * 0.73, SITE_H * 0.67), (SITE_W * 0.70, SITE_H * 0.64), (hx + hw - 17, hy + 8)], 12, "concrete", "medical_approach")

    # Retention concept is rendered as a small blue basin, not a surveyed drainage feature.
    pond_x, pond_y = SITE_W * 0.78, SITE_H * 0.08
    basin_z = terrain_z(pond_x, pond_y) + 0.8
    count = 18
    for i in range(count):
        a1, a2 = 2 * math.pi * i / count, 2 * math.pi * (i + 1) / count
        add_face([(pond_x, pond_y, basin_z - 1),
                  (pond_x + math.cos(a1) * 25, pond_y + math.sin(a1) * 18, terrain_z(pond_x + math.cos(a1) * 25, pond_y + math.sin(a1) * 18) + 0.5),
                  (pond_x + math.cos(a2) * 25, pond_y + math.sin(a2) * 18, terrain_z(pond_x + math.cos(a2) * 25, pond_y + math.sin(a2) * 18) + 0.5)],
                 PALETTE["pond"], "retention_basin", PALETTE["terrain_edge"], "retention_concept")

    # Five pines depict the retention target only; locations are invented for the illustration.
    pine_positions = [
        (SITE_W * 0.10, SITE_H * 0.78),
        (SITE_W * 0.28, SITE_H * 0.87),
        (SITE_W * 0.34, SITE_H * 0.27),
        (SITE_W * 0.67, SITE_H * 0.24),
        (SITE_W * 0.93, SITE_H * 0.48),
    ]
    for x, y in pine_positions:
        add_pyramid_tree(x, y, terrain_z(x, y), 36 * VERTICAL_EXAGGERATION, 8.5, "ponderosa_retention_target")

    # Orchard-like rows are tiny marker trees, based on the prior plan illustration only.
    for row in range(3):
        for col in range(5):
            x = SITE_W * 0.48 + col * 12
            y = SITE_H * 0.26 + row * 12
            add_pyramid_tree(x, y, terrain_z(x, y), 12 * VERTICAL_EXAGGERATION, 3.3, "orchard_concept")

    # Well point and gate are symbolic; no drilling or access permission is implied.
    wx, wy = SITE_W * 0.17, SITE_H * 0.85
    wg = terrain_z(wx, wy)
    add_box(wx - 3, wy - 3, 6, 6, wg, wg + 9 * VERTICAL_EXAGGERATION, "well_marker", "well_concept",
            {"west": (66, 86, 102), "east": (85, 112, 128), "south": (49, 79, 99), "north": (46, 60, 71), "top": (116, 172, 184)})
    gate_x, gate_y = SITE_W * 0.79, SITE_H * 0.02
    gate_z = terrain_z(gate_x, gate_y)
    for dx in (-4.0, 4.0):
        add_box(gate_x + dx - 1, gate_y - 2, 2, 3, gate_z, gate_z + 5 * VERTICAL_EXAGGERATION,
                "gate_post", "gate_concept")


def export_obj():
    mat_lines = ["# Low-tech concept model material library (flat colors only)"]
    for name, rgb in sorted(MATERIALS.items()):
        mat_lines.extend([f"newmtl {name}", f"Ka {rgb[0]/255:.4f} {rgb[1]/255:.4f} {rgb[2]/255:.4f}",
                          f"Kd {rgb[0]/255:.4f} {rgb[1]/255:.4f} {rgb[2]/255:.4f}", "Ks 0.05 0.05 0.05", "Ns 8", "illum 2", ""])
    MTL_PATH.write_text("\n".join(mat_lines))
    lines = [
        "# OUTPOST ONE schematic concept blockout",
        "# +X east, +Y north, +Z vertical; local coordinates are feet.",
        f"# Vertical exaggeration {VERTICAL_EXAGGERATION:g}x applied to terrain and structures for visual legibility.",
        f"# Terrain: IDW interpolation of ten USGS EPQS point samples; mean sample elevation {MEAN_ELEV:.3f} ft NAVD88.",
        "# Parcel ring: Arizona Water Maps assessor/GIS polygon, not survey control.",
        "# Buildings, trees, roads, and drainage features are illustrative and not georeferenced/design-scale.",
        f"mtllib {MTL_PATH.name}",
    ]
    vertex_index = 1
    current_group = None
    current_material = None
    for points, color, material, outline, group in FACES:
        if group != current_group:
            lines.extend([f"g {group}"])
            current_group = group
        if material != current_material:
            lines.extend([f"usemtl {material}"])
            current_material = material
        indices = []
        for x, y, z in points:
            lines.append(f"v {x:.3f} {y:.3f} {z:.3f}")
            indices.append(vertex_index)
            vertex_index += 1
        lines.append("f " + " ".join(map(str, indices)))
    OBJ_PATH.write_text("\n".join(lines) + "\n")


def unit(v):
    length = math.sqrt(sum(c * c for c in v)) or 1.0
    return tuple(c / length for c in v)


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def camera_for_time(t: float):
    cx, cy = SITE_W / 2, SITE_H / 2
    hq_target = (SITE_W * 0.54, SITE_H * 0.57)
    spa_target = (SITE_W * 0.34, SITE_H * 0.19)
    commons_target = (SITE_W * 0.55, SITE_H * 0.48)
    medical_target = (SITE_W * 0.68, SITE_H * 0.57)
    # Camera keys tell an experience-led story: arrival, HQ/lab, thermal circuit,
    # shared dining, safety core, then a full-site establishing view.
    keys = [
        (2.5, (cx, cy, 0.0), -152, 870, 31, 247),
        (7.0, (cx, cy, 0.0), -48, 810, 34, 258),
        (10.5, (hq_target[0], hq_target[1], terrain_z(*hq_target)), -10, 540, 34, 285),
        (11.5, (spa_target[0], spa_target[1], terrain_z(*spa_target)), -86, 340, 33, 300),
        (14.4, (spa_target[0], spa_target[1], terrain_z(*spa_target)), -32, 270, 39, 320),
        (17.3, (commons_target[0], commons_target[1], terrain_z(*commons_target)), -42, 500, 38, 283),
        (19.5, (medical_target[0], medical_target[1], terrain_z(*medical_target)), 8, 440, 35, 280),
        (21.0, (cx, cy, 0.0), 70, 760, 62, 270),
    ]
    left = keys[0]
    right_key = keys[-1]
    for a, b in zip(keys, keys[1:]):
        if a[0] <= t <= b[0]:
            left, right_key = a, b
            break
    t0, target0, yaw0, radius0, elev0, focal0 = left
    t1, target1, yaw1, radius1, elev1, focal1 = right_key
    q = ease((t - t0) / max(0.001, t1 - t0))
    target = tuple(target0[i] * (1 - q) + target1[i] * q for i in range(3))
    yaw = math.radians(yaw0 + (yaw1 - yaw0) * q)
    radius = radius0 + (radius1 - radius0) * q
    elev = math.radians(elev0 + (elev1 - elev0) * q)
    focal = focal0 + (focal1 - focal0) * q
    horizontal = radius * math.cos(elev)
    height = radius * math.sin(elev)
    cam = (target[0] + math.cos(yaw) * horizontal,
           target[1] + math.sin(yaw) * horizontal,
           target[2] + height)
    forward = unit((target[0] - cam[0], target[1] - cam[1], target[2] - cam[2]))
    right = unit(cross(forward, (0.0, 0.0, 1.0)))
    up = unit(cross(right, forward))
    return cam, forward, right, up, focal


def background(frame_index: int) -> Image.Image:
    image = Image.new("RGB", (LOW_W, LOW_H), (10, 18, 28))
    draw = ImageDraw.Draw(image)
    # Chunky horizontal sky bands, intentionally more arcade than photoreal.
    bands = [(0, 50, (13, 23, 38)), (50, 92, (20, 35, 46)), (92, 136, (31, 45, 47)), (136, 216, (12, 22, 30))]
    for top, bottom, color in bands:
        draw.rectangle((0, top, LOW_W, bottom), fill=color)
    # Tiny intermittent scanline / star flecks, deterministic per frame.
    rng = random.Random(frame_index * 1337 + 19)
    for _ in range(38):
        x = rng.randrange(8, LOW_W - 8)
        y = rng.randrange(8, 93)
        if rng.random() < 0.18:
            draw.rectangle((x, y, x + 1, y), fill=(78, 109, 112))
    return image


def project_point(point, camera, forward, right, up, focal):
    rel = (point[0] - camera[0], point[1] - camera[1], point[2] - camera[2])
    depth = dot(rel, forward)
    if depth <= 1.0:
        return None
    px = LOW_W / 2 + focal * dot(rel, right) / depth
    py = 106 - focal * dot(rel, up) / depth
    return (px, py, depth)


def shade_color(rgb, normal, depth):
    n = unit(normal)
    light = unit((-0.43, -0.36, 0.83))
    intensity = 0.58 + 0.38 * max(0.0, dot(n, light))
    fog = max(0.0, min(0.24, (depth - 480) / 1800))
    out = []
    for value, bg in zip(rgb, (20, 31, 38)):
        lit = value * intensity
        out.append(int(lit * (1.0 - fog) + bg * fog))
    return tuple(out)


def face_normal(points):
    a = tuple(points[1][i] - points[0][i] for i in range(3))
    b = tuple(points[2][i] - points[0][i] for i in range(3))
    return cross(a, b)


def draw_world(image: Image.Image, frame_index: int, t: float):
    camera, forward, right, up, focal = camera_for_time(t)
    cache = {}
    projected_faces = []
    for points, color, material, outline, group in FACES:
        projected = []
        depths = []
        valid = True
        for point in points:
            key = point
            if key not in cache:
                cache[key] = project_point(point, camera, forward, right, up, focal)
            p = cache[key]
            if p is None:
                valid = False
                break
            projected.append((p[0], p[1]))
            depths.append(p[2])
        if not valid:
            continue
        avg_depth = sum(depths) / len(depths)
        color_shaded = shade_color(color, face_normal(points), avg_depth)
        projected_faces.append((avg_depth, projected, color_shaded, outline))
    # Painter order: far polygons first, then nearer building faces and trees.
    projected_faces.sort(key=lambda item: item[0], reverse=True)
    draw = ImageDraw.Draw(image)
    for depth, polygon, color, outline in projected_faces:
        draw.polygon(polygon, fill=color, outline=outline)

    # Parcel edge follows only the assessor/GIS polygon. It is visually a frame, not a legal boundary.
    projected_outline = []
    for x, y in OUTLINE:
        p = project_point((x, y, terrain_z(x, y) + 1.0), camera, forward, right, up, focal)
        if p:
            projected_outline.append((p[0], p[1]))
    if len(projected_outline) > 2:
        draw.line(projected_outline + [projected_outline[0]], fill=PALETTE["parcel"], width=1, joint="curve")

    # Tiny contour/survey-sample glints are only reference marks and are kept off structures.
    for sx, sy, elev in SAMPLES:
        p = project_point((sx, sy, (elev - MEAN_ELEV) * VERTICAL_EXAGGERATION + 1.5), camera, forward, right, up, focal)
        if p and 4 < p[0] < LOW_W - 4 and 30 < p[1] < LOW_H - 31:
            draw.rectangle((int(p[0]) - 1, int(p[1]) - 1, int(p[0]) + 1, int(p[1]) + 1), fill=PALETTE["cyan"])

    # Small north cue in the HUD.
    draw.rectangle((LOW_W - 31, 25, LOW_W - 8, 46), fill=(11, 21, 30), outline=(93, 134, 145))
    draw.text((LOW_W - 26, 27), "N", font=font(9), fill=PALETTE["white"])
    draw.line((LOW_W - 20, 41, LOW_W - 20, 32), fill=PALETTE["amber"], width=1)
    draw.polygon([(LOW_W - 20, 30), (LOW_W - 23, 35), (LOW_W - 17, 35)], fill=PALETTE["amber"])
    return image


def draw_pixel_overlay(image: Image.Image, frame_index: int, caption: str | None = None, top_label="FIELD CUT 02  //  OUTPOST ONE"):
    draw = ImageDraw.Draw(image)
    # Low-tech bezel and status lines.
    draw.rectangle((4, 4, LOW_W - 5, LOW_H - 5), outline=(100, 125, 122), width=1)
    draw.rectangle((6, 6, LOW_W - 7, 20), fill=(8, 16, 23))
    draw.text((10, 8), top_label, font=font(7), fill=(187, 220, 210))
    draw.text((LOW_W - 112, 8), "PIXEL / 12 FPS", font=font(6), fill=(255, 195, 89))
    if caption:
        draw.rectangle((7, LOW_H - 34, LOW_W - 7, LOW_H - 7), fill=(8, 14, 21))
        draw.line((7, LOW_H - 34, LOW_W - 7, LOW_H - 34), fill=(96, 157, 159), width=1)
        draw.text((12, LOW_H - 30), caption[:53], font=font(8), fill=(245, 230, 193))
        draw.text((12, LOW_H - 18), "CONCEPT MASSING  ·  NOT SURVEY / NOT FOR CONSTRUCTION", font=font(5), fill=(151, 173, 172))
    # Scanlines and mild analog noise are applied at source resolution to keep the pixels visible.
    arr = np.asarray(image).astype(np.int16)
    rng = np.random.default_rng(frame_index + 401)
    noise = rng.integers(-3, 4, size=(LOW_H, LOW_W, 1), dtype=np.int16)
    arr += noise
    arr[::3, :, :] = (arr[::3, :, :] * 0.84).astype(np.int16)
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    im = Image.fromarray(arr, mode="RGB")
    return im.resize((OUT_W, OUT_H), Image.Resampling.NEAREST)


def title_frame(frame_index: int, ending=False):
    image = background(frame_index)
    draw = ImageDraw.Draw(image)
    # An abstract parcel/surface grid becomes the film's low-tech identity plate.
    for y in range(72, 166, 13):
        draw.line((25, y, 355, y - 8), fill=(31, 57, 62), width=1)
    for x in range(48, 356, 27):
        draw.line((x, 72, x + 14, 165), fill=(28, 52, 59), width=1)
    if not ending:
        draw.rectangle((24, 33, 360, 174), fill=(8, 17, 26), outline=(255, 195, 89), width=1)
        draw.text((38, 49), "FRONTIERSHIP", font=font(11), fill=(111, 225, 244))
        draw.text((38, 69), "OUTPOST ONE", font=font(22), fill=(245, 231, 199))
        draw.line((38, 100, 343, 100), fill=(91, 130, 130), width=1)
        draw.text((38, 111), "LOW-TECH 3D SITE MODEL / EXPERIENCE CUT", font=font(7), fill=(255, 195, 89))
        draw.text((38, 126), "HQ  ·  FRONTIER LAB  ·  NORDIC THERMAL CIRCUIT", font=font(6, False), fill=(183, 204, 198))
        draw.text((38, 143), "Terrain: ten EPQS spots only  ·  APN 30055004", font=font(6, False), fill=(147, 173, 173))
        draw.text((38, 154), "Massing + amenity placement: illustrative concept", font=font(6, False), fill=(147, 173, 173))
    else:
        draw.rectangle((20, 28, 364, 182), fill=(7, 15, 22), outline=(255, 195, 89), width=1)
        draw.text((34, 38), "MODEL STATUS  //  PRELIMINARY", font=font(9), fill=(255, 195, 89))
        lines = [
            "10 EPQS elevations interpolated for a visual surface only.",
            "No full-resolution DEM or survey-controlled topo used.",
            "Parcel edge is assessor/GIS; not a legal boundary survey.",
            "Buildings, trees, roads and drainage are hand-blocked.",
            "Nordic circuit + shared dining are experience concepts.",
            "Water, heat, wastewater, staffing loads are untested.",
            "Spa is not medical treatment; relief ×2.5; access unverified.",
            "NOT FOR PERMITTING, ENGINEERING OR CONSTRUCTION.",
        ]
        y = 54
        for i, line in enumerate(lines):
            color = (238, 236, 218) if i < 7 else (255, 157, 124)
            draw.text((34, y), line, font=font(6, False), fill=color)
            y += 12
        draw.text((34, 160), "END OF FIELD CUT 02  ·  SILENT PIXEL PREVIEW", font=font(6), fill=(111, 225, 244))
    return draw_pixel_overlay(image, frame_index, None, "FRONTIERSHIP  //  PRIVATE CONCEPT FILM")


def ease(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def render_frame(frame_index: int) -> Image.Image:
    t = frame_index / FPS
    if t < 2.5:
        return title_frame(frame_index, ending=False)
    if t >= 21.0:
        return title_frame(frame_index, ending=True)
    image = background(frame_index)
    draw_world(image, frame_index, t)
    if t < 5.5:
        caption = "THE ARRIVAL  /  MODERN FOREST-CABIN HQ"
    elif t < 8.2:
        caption = "FRONTIER LAB  /  20–50 kW SUSTAINED TARGET"
    elif t < 10.8:
        caption = "DEMO CLOSET  /  BYO RENTED COMPUTE"
    elif t < 14.6:
        caption = "NORDIC SPA  /  SAUNA · HOT SOAK · COLD PLUNGE"
    elif t < 17.3:
        caption = "GREENHOUSE-TO-TABLE  /  SHARED KITCHEN & DINNERS"
    elif t < 19.5:
        caption = "SAFETY FIRST  /  EMERGENCY-CAPABLE MEDICAL CORE"
    else:
        caption = "30+ DAY COHORTS  /  QUIET, LONG-STAY COMMUNITY"
    return draw_pixel_overlay(image, frame_index, caption)


def encode_video():
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    command = [
        exe, "-hide_banner", "-loglevel", "error", "-y",
        "-f", "rawvideo", "-vcodec", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{OUT_W}x{OUT_H}", "-r", str(FPS), "-i", "-",
        "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "24",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-metadata", "title=FRONTIERSHIP OUTPOST ONE — experience-led pixel concept film",
        "-metadata", "comment=Illustrative massing with Nordic thermal and shared-dining concepts; terrain interpolated from ten EPQS points; not for construction",
        str(VIDEO_PATH),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    assert process.stdin is not None
    for idx in range(FRAME_COUNT):
        frame = render_frame(idx)
        if idx == int(12.5 * FPS):
            frame.save(POSTER_PATH, optimize=True)
        process.stdin.write(frame.tobytes())
        if idx % (FPS * 4) == 0:
            print(f"rendered {idx:03d}/{FRAME_COUNT} frames", flush=True)
    process.stdin.close()
    stderr = process.stderr.read() if process.stderr else b""
    code = process.wait()
    if code != 0:
        raise RuntimeError(f"ffmpeg exited {code}: {stderr.decode(errors='replace')}")
    print(f"video: {VIDEO_PATH} ({VIDEO_PATH.stat().st_size:,} bytes)")
    print(f"poster: {POSTER_PATH} ({POSTER_PATH.stat().st_size:,} bytes)")


def main():
    add_scene_geometry()
    export_obj()
    encode_video()
    print(f"3D source: {OBJ_PATH} ({OBJ_PATH.stat().st_size:,} bytes)")
    print(f"3D materials: {MTL_PATH} ({MTL_PATH.stat().st_size:,} bytes)")
    print(f"model bounds: approx {SITE_W:.1f} ft east-west × {SITE_H:.1f} ft north-south (GIS extent)")
    print(f"sample elevations: {min(s[2] for s in SAMPLES):.3f}–{max(s[2] for s in SAMPLES):.3f} ft NAVD88; mean {MEAN_ELEV:.3f} ft")


if __name__ == "__main__":
    main()
