#!/usr/bin/env python3
"""Render the separate FRONTIERSHIP · OUTPOST ONE Best-Wishes 3D film.

Aspirational cinematic treatment built from the current schematic site blockout.
It does not use terrain_real/ and deliberately keeps engineering, access,
capacity, room, boundary, and permitting claims in a clearly marked TBD layer.

Requires Python 3.11, mitsuba 3.9.x (scalar_rgb), numpy, Pillow, and
imageio-ffmpeg. Render intermediates are kept under /tmp, not in the project.
"""
from __future__ import annotations

import argparse
import importlib.util
import math
import os
import random
import shutil
import subprocess
import sys
import tempfile
import time
from collections import defaultdict
from pathlib import Path

import cv2
import imageio_ffmpeg
import mitsuba as mi
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
MODEL_PATH = PROJECT / "render_outpost_one_pixel_movie.py"
VIDEO_PATH = HERE / "frontiership-outpost-one-best-wishes-3d.mp4"
POSTER_PATH = HERE / "frontiership-outpost-one-best-wishes-3d-poster.png"
GUIDE_PATH = HERE / "BEST_WISHES_EDITION_GUIDE.md"
RENDER_ROOT = Path(tempfile.gettempdir()) / "frontiership-outpost-one-best-wishes-renders"
ENV_PATH = RENDER_ROOT / "blue-hour-environment.png"

OUT_W, OUT_H = 1920, 1080
FPS = 24
DURATION = 300
VERTICAL_EXAGGERATION = 2.5
CYAN = (91, 221, 237)
AMBER = (255, 194, 111)
MINT = (112, 229, 190)
WHITE = (239, 246, 247)
MUTED = (177, 201, 211)
DEEP = (5, 15, 26)

FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
FONT_REG = FONT_DIR / "DejaVuSans.ttf"
FONT_BOLD = FONT_DIR / "DejaVuSans-Bold.ttf"
FONT_MONO = FONT_DIR / "DejaVuSansMono.ttf"
FONT_MONO_BOLD = FONT_DIR / "DejaVuSansMono-Bold.ttf"

mi.set_variant("scalar_rgb")


def font(size: int, style: str = "regular"):
    paths = {
        "regular": FONT_REG,
        "bold": FONT_BOLD,
        "mono": FONT_MONO,
        "mono_bold": FONT_MONO_BOLD,
    }
    try:
        return ImageFont.truetype(str(paths[style]), size)
    except OSError:
        return ImageFont.load_default()


FONTS = {
    "micro": font(18, "mono"),
    "micro_bold": font(18, "mono_bold"),
    "small": font(22, "regular"),
    "small_bold": font(24, "bold"),
    "body": font(29, "regular"),
    "body_bold": font(29, "bold"),
    "title": font(49, "bold"),
    "hero": font(74, "bold"),
    "metric": font(40, "bold"),
}


def load_model():
    spec = importlib.util.spec_from_file_location("outpost_schematic_model", MODEL_PATH)
    if not spec or not spec.loader:
        raise RuntimeError(f"Cannot load schematic model: {MODEL_PATH}")
    model = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = model
    spec.loader.exec_module(model)

    # Smooth only the display triangulation. The surface is still the ten-point
    # EPQS IDW interpolation and is not a replacement DEM or design surface.
    def refined_terrain_faces():
        nx, ny = 58, 34
        xs = [model.SITE_W * i / nx for i in range(nx + 1)]
        ys = [model.SITE_H * j / ny for j in range(ny + 1)]
        grid = [[(x, y, model.terrain_z(x, y), model.raw_elevation(x, y)) for x in xs] for y in ys]
        for j in range(ny):
            for i in range(nx):
                a, b = grid[j][i], grid[j][i + 1]
                c, d = grid[j + 1][i + 1], grid[j + 1][i]
                for tri in ((a, b, c), (a, c, d)):
                    cx = sum(p[0] for p in tri) / 3
                    cy = sum(p[1] for p in tri) / 3
                    if not model.inside_polygon(cx, cy):
                        continue
                    elev = sum(p[3] for p in tri) / 3
                    model.add_face(
                        [(p[0], p[1], p[2]) for p in tri],
                        model.elevation_color(elev),
                        "terrain",
                        model.PALETTE["terrain_edge"],
                        "terrain",
                    )

    model.FACES.clear()
    model.MATERIALS.clear()
    model.terrain_faces = refined_terrain_faces
    model.add_scene_geometry()
    return model


MODEL = load_model()
SITE_CX, SITE_CY = MODEL.SITE_W / 2, MODEL.SITE_H / 2
HQ_X, HQ_Y, HQ_W, HQ_D = MODEL.SITE_W * 0.43, MODEL.SITE_H * 0.48, 176.0, 62.0
HQ_GROUND = MODEL.terrain_z(HQ_X + HQ_W / 2, HQ_Y + HQ_D / 2)
SPA_CX, SPA_CY = MODEL.SITE_W * 0.27 + 34, MODEL.SITE_H * 0.12 + 26
GREEN_CX, GREEN_CY = MODEL.SITE_W * 0.57 + 27, MODEL.SITE_H * 0.73 + 13


def make_environment(path: Path):
    """Create a restrained, warm-horizon environment map for the ray tracer."""
    width, height = 1024, 512
    arr = np.zeros((height, width, 3), dtype=np.uint8)
    for y in range(height):
        v = y / max(1, height - 1)
        if v < 0.43:
            t = v / 0.43
            c = np.array([10, 22, 46]) * (1 - t) + np.array([27, 59, 86]) * t
        elif v < 0.68:
            t = (v - 0.43) / 0.25
            c = np.array([27, 59, 86]) * (1 - t) + np.array([221, 143, 91]) * t
        else:
            t = (v - 0.68) / 0.32
            c = np.array([221, 143, 91]) * (1 - t) + np.array([20, 33, 55]) * t
        arr[y, :, :] = np.clip(c, 0, 255).astype(np.uint8)
    im = Image.fromarray(arr, "RGB")
    glow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((650, 228, 790, 360), fill=(255, 190, 124, 185))
    glow = glow.filter(ImageFilter.GaussianBlur(42))
    im = Image.alpha_composite(im.convert("RGBA"), glow).convert("RGB")
    # Faint, soft cloud bands: atmospheric design language only.
    clouds = Image.new("RGBA", im.size, (0, 0, 0, 0))
    cd = ImageDraw.Draw(clouds)
    for i, y in enumerate((150, 183, 207, 250, 279)):
        cd.arc((-180 + i * 95, y - 18, 670 + i * 76, y + 42), 184, 347,
              fill=(168, 205, 218, 20 + i * 3), width=7)
    clouds = clouds.filter(ImageFilter.GaussianBlur(15))
    im = Image.alpha_composite(im.convert("RGBA"), clouds).convert("RGB")
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, quality=94)


def add_cutaway_geometry(model):
    """Add a side-on room-zone dollhouse and remove the opaque HQ blockout."""
    preserved = []
    for face in model.FACES:
        group = face[4]
        points = face[0]
        if group in {"outpost_hq", "bermed_wing"}:
            continue
        # Open a clean section window immediately in front of the lower wing.
        # It is a graphic cutaway, not a proposed excavation or grading line.
        if group == "terrain":
            cx = sum(p[0] for p in points) / len(points)
            cy = sum(p[1] for p in points) / len(points)
            if HQ_X - 16 <= cx <= HQ_X + HQ_W + 16 and HQ_Y - 34 <= cy <= HQ_Y + 7:
                continue
        preserved.append(face)
    model.FACES[:] = preserved

    x0, x1 = HQ_X, HQ_X + HQ_W
    y0, y1 = HQ_Y, HQ_Y + HQ_D
    z = HQ_GROUND
    floor_low = z - 28
    floor_1 = z
    floor_2 = z + 22
    floor_3 = z + 44
    roof_eave = z + 66
    roof_ridge = z + 81
    floor_top = [floor_low, floor_1, floor_2, floor_3]
    bands = [
        ((48, 100, 127), (89, 209, 226)),
        ((118, 105, 77), (252, 198, 125)),
        ((69, 110, 141), (105, 224, 229)),
        ((89, 85, 139), (184, 163, 245)),
    ]

    def face(points, color, mat, group="hq_cutaway"):
        model.add_face(points, color, mat, None, group)

    def slab(a, b, color=(100, 123, 132)):
        face([(x0, y0, a), (x1, y0, a), (x1, y1, a), (x0, y1, a)], color, "cutaway_floor")
        # A fine luminous section edge keeps the near cut legible.
        face([(x0, y0 - 0.6, a), (x1, y0 - 0.6, a), (x1, y0 - 0.6, a + 0.65), (x0, y0 - 0.6, a + 0.65)],
             (73, 183, 197), "cutaway_section_edge")

    slab(floor_low, floor_low + 2.4, (61, 79, 95))
    for level in (floor_1, floor_2, floor_3):
        slab(level, level + 2.8, (113, 119, 112))

    # Continuous rear shell; the near elevation is deliberately opened.
    face([(x0, y1 - 1.3, floor_low), (x1, y1 - 1.3, floor_low),
          (x1, y1 - 1.3, roof_eave), (x0, y1 - 1.3, roof_eave)], (38, 56, 73), "cutaway_back_wall")
    # East/west end walls are partial so the viewer can read depth and shell.
    for x, tint in ((x0, (42, 63, 79)), (x1 - 2.0, (51, 70, 83))):
        face([(x, y0 + 0.5, floor_1), (x, y1, floor_1), (x, y1, roof_eave), (x, y0 + 0.5, roof_eave)], tint, "cutaway_end_wall")
    # Bermed wing section below the ground datum; the earth wedge is schematic.
    face([(x0 - 3, y1 + 5, floor_low), (x1 + 3, y1 + 5, floor_low),
          (x1 + 3, y1 + 5, z + 3), (x0 - 3, y1 + 5, z + 3)], (72, 67, 59), "berm_section")
    face([(x0 - 4, y1 + 5, z + 3), (x1 + 4, y1 + 5, z + 3),
          (x1 + 17, y1 + 27, z + 17), (x0 - 17, y1 + 27, z + 17)], (75, 91, 76), "berm_slope")

    # Thin facade returns and roof cap communicate the shell without closing the cut.
    for x in (x0, x1 - 2.2):
        face([(x, y0, floor_1), (x + 2.2, y0, floor_1),
              (x + 2.2, y0, roof_eave), (x, y0, roof_eave)], (81, 124, 146), "cutaway_facade_return")
    face([(x0, y0 - 1.4, roof_eave), (x1, y0 - 1.4, roof_eave),
          (x1, y0 - 1.4, roof_eave + 1.4), (x0, y0 - 1.4, roof_eave + 1.4)], (255, 190, 109), "cutaway_roofline")
    # The far roof half remains visible; the near half is opened for the dollhouse view.
    face([(x0, y0 + HQ_D * 0.49, roof_eave), (x0, y1, roof_eave),
          (x0, y1, roof_ridge), (x0, y0 + HQ_D * 0.49, roof_ridge)], (35, 54, 72), "cutaway_roof_end")
    face([(x0, y0 + HQ_D * 0.49, roof_ridge), (x1, y0 + HQ_D * 0.49, roof_ridge),
          (x1, y1, roof_eave), (x0, y1, roof_eave)], (26, 42, 58), "cutaway_roof_plane")

    # Color-coded floor bands and broad partitions. These are zones, not rooms,
    # areas, bed counts, egress paths, or a floor plan.
    partitions = [
        (floor_low, floor_1, x0 + 0.55 * HQ_W, bands[0][0], "lower_service_partition"),
        (floor_1, floor_2, x0 + 0.61 * HQ_W, bands[1][0], "level_one_zone_partition"),
        (floor_2, floor_3, x0 + 0.49 * HQ_W, bands[2][0], "level_two_zone_partition"),
        (floor_3, roof_eave, x0 + 0.58 * HQ_W, bands[3][0], "level_three_zone_partition"),
    ]
    for low, high, px, tint, mat in partitions:
        face([(px, y0 + 12, low + 2), (px + 1.0, y0 + 12, low + 2),
              (px + 1.0, y1 - 3, high - 1), (px, y1 - 3, high - 1)], tint, mat)

    # High-level illuminated interior bands (stylized floor rugs, not surveyed zones).
    for idx, level in enumerate(floor_top):
        color, accent = bands[idx]
        face([(x0 + 4, y0 + 3, level + 3.0), (x1 - 4, y0 + 3, level + 3.0),
              (x1 - 4, y1 - 5, level + 3.0), (x0 + 4, y1 - 5, level + 3.0)],
             tuple(int(c * 0.70 + 26 * 0.30) for c in color), "cutaway_zone_floor")
        # Low furniture/plant forms read as equipment, table, desk, or lounge blocks.
        if idx == 0:
            # Utility reserve + demo bench.
            model.add_box(x0 + 18, y0 + 15, 26, 17, level + 3, level + 12, "cutaway_furniture", "hq_cutaway",
                          {"west": (32, 59, 78), "east": (43, 92, 109), "south": (43, 111, 131), "north": (28, 55, 69), "top": (94, 188, 196)})
            for i in range(3):
                model.add_box(x0 + 83 + i * 17, y0 + 16, 12, 19, level + 3, level + 10, "cutaway_rack", "hq_cutaway",
                              {"west": (35, 48, 72), "east": (51, 85, 118), "south": (43, 102, 141), "north": (25, 43, 68), "top": (72, 186, 208)})
        elif idx == 1:
            model.add_box(x0 + 23, y0 + 16, 58, 11, level + 3, level + 7, "cutaway_table", "hq_cutaway",
                          {"west": (85, 61, 41), "east": (130, 93, 55), "south": (151, 112, 64), "north": (82, 61, 43), "top": (196, 157, 101)})
            model.add_box(x0 + 116, y0 + 17, 32, 15, level + 3, level + 10, "cutaway_medical_bay", "hq_cutaway",
                          {"west": (61, 90, 103), "east": (85, 131, 143), "south": (104, 163, 166), "north": (58, 82, 97), "top": (183, 222, 213)})
        elif idx == 2:
            for j in range(3):
                model.add_box(x0 + 15 + j * 19, y0 + 19, 14, 8, level + 3, level + 8, "cutaway_suite_block", "hq_cutaway",
                              {"west": (56, 75, 96), "east": (81, 115, 143), "south": (94, 142, 160), "north": (47, 64, 84), "top": (134, 181, 191)})
            model.add_box(x0 + 111, y0 + 17, 38, 8, level + 3, level + 6, "cutaway_workbench", "hq_cutaway",
                          {"west": (60, 58, 97), "east": (91, 88, 139), "south": (114, 106, 171), "north": (50, 50, 81), "top": (178, 165, 237)})
        else:
            model.add_box(x0 + 19, y0 + 17, 45, 12, level + 3, level + 8, "cutaway_owner_zone", "hq_cutaway",
                          {"west": (88, 74, 91), "east": (126, 102, 129), "south": (150, 123, 149), "north": (73, 63, 80), "top": (200, 170, 190)})
            model.add_box(x0 + 105, y0 + 16, 36, 6, level + 3, level + 10, "cutaway_focus_desk", "hq_cutaway",
                          {"west": (44, 66, 95), "east": (70, 104, 145), "south": (80, 127, 165), "north": (37, 55, 79), "top": (120, 206, 222)})

    # Near-side structural columns and measured-looking section ticks are visual only.
    for x in (x0 + 8, x0 + 0.35 * HQ_W, x0 + 0.66 * HQ_W, x1 - 8):
        face([(x, y0 - 1.0, floor_1), (x + 1.6, y0 - 1.0, floor_1),
              (x + 1.6, y0 - 1.0, roof_eave), (x, y0 - 1.0, roof_eave)], (83, 148, 171), "cutaway_column")
    # Exterior lower-wing entry apron and a restrained step light.
    face([(x0 + 19, y0 - 28, floor_low + 1), (x0 + 78, y0 - 28, floor_low + 1),
          (x0 + 78, y0 - 3, floor_1 + 1), (x0 + 19, y0 - 3, floor_1 + 1)], (87, 101, 102), "cutaway_entry_apron")
    face([(x0 + 18, y0 - 3.2, floor_1 + 1), (x0 + 79, y0 - 3.2, floor_1 + 1),
          (x0 + 79, y0 - 3.2, floor_1 + 2.2), (x0 + 18, y0 - 3.2, floor_1 + 2.2)], (111, 229, 224), "cutaway_entry_light")


def add_greenhouse_detail(model):
    """Replace the single greenhouse block with an illustrative glass-frame vignette."""
    model.FACES[:] = [face for face in model.FACES if face[4] != "greenhouse"]
    x0, y0, width, depth = MODEL.SITE_W * 0.57, MODEL.SITE_H * 0.73, 54.0, 27.0
    x1, y1 = x0 + width, y0 + depth
    base = MODEL.terrain_z(x0 + width / 2, y0 + depth / 2)
    eave, ridge = base + 14, base + 20
    ridge_y = y0 + depth / 2
    group = "greenhouse_detail"
    frame = (44, 115, 135)
    pane = (72, 145, 165)
    bed = (76, 107, 75)
    soil = (101, 79, 56)

    def face(points, color, material):
        model.add_face(points, color, material, None, group)

    # Floor and low sill, then a fine cyan perimeter frame.
    face([(x0, y0, base + 0.5), (x1, y0, base + 0.5),
          (x1, y1, base + 0.5), (x0, y1, base + 0.5)], (75, 88, 81), "greenhouse_floor")
    model.add_box(x0 - 1, y0 - 1, width + 2, 1.3, base, base + 2.2,
                  "greenhouse_frame", group,
                  {"west": frame, "east": frame, "south": frame, "north": frame, "top": (80, 180, 194)})
    # Slim structural posts are more legible than a solid placeholder box.
    xs = [x0 + i * width / 4 for i in range(5)]
    for x in xs:
        for y in (y0, y1 - 1.0):
            model.add_box(x - 0.55, y, 1.1, 1.1, base + 1.8, eave + 1.0,
                          "greenhouse_frame", group,
                          {"west": frame, "east": (64, 157, 174), "south": (68, 165, 182), "north": frame, "top": (111, 218, 226)})
    # Side glazing is divided into broad bays; the near door bay stays open.
    for index in range(4):
        xa = x0 + index * width / 4 + 0.7
        xb = x0 + (index + 1) * width / 4 - 0.7
        # The camera-side wall stays open in this illustrative cutaway vignette.
        face([(xa, y1 - 0.35, base + 2.2), (xb, y1 - 0.35, base + 2.2),
              (xb, y1 - 0.35, eave), (xa, y1 - 0.35, eave)], (81, 154, 177), "greenhouse_glass")
    # Gabled translucent roof planes and visible ridge rails.
    for index in range(4):
        xa = x0 + index * width / 4 + 0.5
        xb = x0 + (index + 1) * width / 4 - 0.5
        face([(xa, y0, eave), (xb, y0, eave), (xb, ridge_y, ridge), (xa, ridge_y, ridge)], pane, "greenhouse_glass")
        face([(xa, ridge_y, ridge), (xb, ridge_y, ridge), (xb, y1, eave), (xa, y1, eave)], (75, 152, 177), "greenhouse_glass")
    model.add_box(x0, ridge_y - 0.65, width, 1.3, ridge - 1.0, ridge + 0.3,
                  "greenhouse_frame", group,
                  {"west": frame, "east": (64, 157, 174), "south": (68, 165, 182), "north": frame, "top": (111, 218, 226)})
    # Three compact raised growing beds and abstract crop forms; not a crop plan.
    for row in range(3):
        bx, by = x0 + 9 + row * 14, y0 + 4
        model.add_box(bx, by, 7, 19, base + 0.8, base + 3.3, "greenhouse_bed", group,
                      {"west": (72, 66, 51), "east": (111, 87, 57), "south": soil, "north": (65, 63, 53), "top": (117, 92, 62)})
        for plant in range(4):
            px = bx + 1.2 + (plant % 2) * 3.3
            py = by + 2.0 + plant * 3.8
            model.add_box(px, py, 1.8, 1.8, base + 3.3, base + 6.3 + (plant % 2),
                          "greenhouse_crop", group,
                          {"west": (38, 88, 69), "east": (68, 142, 94), "south": (55, 123, 83), "north": (38, 81, 66), "top": (105, 175, 101)})
    # Short front frame rails and a quiet door/entry marker.
    for z in (base + 2.2, base + 8.0, eave):
        face([(x0, y0 - 0.1, z), (x1, y0 - 0.1, z),
              (x1, y0 + 0.8, z + 0.75), (x0, y0 + 0.8, z + 0.75)], frame, "greenhouse_rail")
    face([(x0 + 13, y0 - 0.3, base + 2.1), (x0 + 20, y0 - 0.3, base + 2.1),
          (x0 + 20, y0 - 0.3, base + 10), (x0 + 13, y0 - 0.3, base + 10)], (78, 192, 209), "greenhouse_entry")


def make_film_scenes():
    return [
        {"start": 0, "end": 18, "shot": "hero", "num": "00", "chapter": "A BEST-WISHES EDITION",
         "title": "A safer frontier\nbegins with care.",
         "caption": "An idealistic vision for FRONTIERSHIP · OUTPOST ONE.", "kind": "opening", "badge": "ASPIRATION · NOT A PLAN"},
        {"start": 18, "end": 48, "shot": "aerial", "num": "01", "chapter": "SITE + STEWARDSHIP",
         "title": "Make less land\ndo more.",
         "caption": "Minimum-disturbance guardrails shape the wish before any drawing becomes a design.", "kind": "stewardship", "badge": "PLANNING GUARDRAILS · NOT TAKEOFFS"},
        {"start": 48, "end": 78, "shot": "campus", "num": "02", "chapter": "THE WHOLE EXPERIENCE",
         "title": "Live · work · learn\nrecover · gather.",
         "caption": "An income-first, long-stay research home—not a short-term-rental proposition.", "kind": "program", "badge": "OPERATING PREMISES · UNVALIDATED"},
        {"start": 78, "end": 120, "shot": "cutaway", "num": "03", "chapter": "THE HQ · SIDE-ON CUTAWAY",
         "title": "One place. Distinct zones.",
         "caption": "A conceptual section keeps shell, rooms, grade, and site context in view.", "kind": "cutaway", "badge": "ZONE DIAGRAM · NOT A FLOOR PLAN"},
        {"start": 120, "end": 154, "shot": "lab_med", "num": "04", "chapter": "FRONTIER LAB + MEDICAL RESERVE",
         "title": "Research with\na safety net.",
         "caption": "Bring-your-own rented compute; a small emergency-capable medical concept.", "kind": "lab_med", "badge": "CAPABILITY TARGET · DESIGN TBD"},
        {"start": 154, "end": 195, "shot": "systems", "num": "05", "chapter": "WATER + DOMESTIC WASTEWATER",
         "title": "Close the loop—\nonly where proven.",
         "caption": "Low demand, approved reuse, and a protected reserve are aspirations—not routes.", "kind": "water", "badge": "SOURCE · METHOD · CAPACITY · APPROVAL TBD"},
        {"start": 195, "end": 235, "shot": "systems", "num": "06", "chapter": "POWER · NETWORK · THERMAL",
         "title": "Resilience is\na design question.",
         "caption": "Candidate systems stay flexible until loads, services, and partners are known.", "kind": "systems", "badge": "NO SERVICE SIZE OR ROUTE SELECTED"},
        {"start": 235, "end": 275, "shot": "spa_detail", "num": "07", "chapter": "GATHER · RECOVER · RESPOND",
         "title": "Belonging is\ninfrastructure, too.",
         "caption": "Wellness, food, fire readiness, EMS, and any passage each need their own proof gates.", "kind": "care", "badge": "AMENITY + SAFETY CONCEPTS · FEASIBILITY TBD"},
        {"start": 275, "end": 300, "shot": "closing", "num": "08", "chapter": "A PROMISE, NOT A PERMIT",
         "title": "Best wishes.\nBetter proofs.",
         "caption": "Survey · geotechnical · utility · clinical · code · operating · agency decisions.", "kind": "closing", "badge": "THE NEXT STEP IS EVIDENCE"},
    ]


SCENES = make_film_scenes()


def camera(origin_target, yaw_deg: float, radius: float, elevation_deg: float):
    tx, ty, tz = origin_target
    yaw = math.radians(yaw_deg)
    elev = math.radians(elevation_deg)
    horizontal = radius * math.cos(elev)
    origin = [tx + math.cos(yaw) * horizontal,
              ty + math.sin(yaw) * horizontal,
              tz + radius * math.sin(elev)]
    return mi.ScalarTransform4f.look_at(origin=origin, target=[tx, ty, tz], up=[0, 0, 1])


def camera_presets():
    zc = MODEL.terrain_z(SITE_CX, SITE_CY)
    hqz = HQ_GROUND + 31
    return {
        "hero": ((SITE_CX, SITE_CY, zc + 6), -145, 890, 27, 39),
        "aerial": ((SITE_CX, SITE_CY, zc), -146, 790, 43, 42),
        "campus": ((SITE_CX + 35, SITE_CY + 4, zc + 8), -150, 665, 35, 39),
        "cutaway": ((HQ_X + HQ_W * 0.52, HQ_Y + HQ_D * 0.34, hqz), -104, 500, 23, 42),
        "lab_med": ((HQ_X + HQ_W * 0.54, HQ_Y + HQ_D * 0.35, HQ_GROUND + 18), -97, 550, 22, 42),
        "systems": ((SITE_CX + 18, SITE_CY + 8, zc), -139, 835, 46, 42),
        "spa_detail": ((SPA_CX, SPA_CY, MODEL.terrain_z(SPA_CX, SPA_CY) + 7), -96, 340, 34, 42),
        "greenhouse": ((GREEN_CX, GREEN_CY, MODEL.terrain_z(GREEN_CX, GREEN_CY) + 8), -90, 215, 24, 38),
        "closing": ((SITE_CX, SITE_CY, zc + 5), -152, 950, 25, 39),
    }


def material_category(material: str, group: str):
    m = material.lower()
    g = group.lower()
    if g == "terrain":
        return "terrain"
    if "atmosphere" in g or "pine" in m or "pine" in g or "ponderosa" in g or "orchard" in g:
        return "foliage"
    if "window" in m or "glass" in m or "glaz" in g:
        return "glass"
    if "water" in m or "soak" in m or "plunge" in g or "retention" in g:
        return "water"
    if any(k in m for k in ("road", "concrete", "foundation", "stone", "apron")) or any(k in g for k in ("internal_drive", "clinic_lane", "motor_court")):
        return "stone"
    if any(k in m for k in ("roof", "solar", "panel")):
        return "roof"
    if any(k in m for k in ("wood", "cedar", "trunk", "bench", "table", "deck", "cabin_wall", "cutaway_furniture")):
        return "wood"
    if "cutaway" in g or "cutaway" in m or "berm" in m:
        return "cutaway"
    return "body"


def make_bsdf(category: str, rgb):
    c = [max(0.018, min(0.94, float(v) / 255.0)) for v in rgb]
    if category == "terrain":
        base = {"type": "roughplastic", "diffuse_reflectance": {"type": "rgb", "value": c},
                "alpha": 0.72, "specular_reflectance": {"type": "rgb", "value": [0.045, 0.055, 0.05]}}
    elif category == "glass":
        # Colorful glazing reads as illuminated low-energy windows in the dusk scene.
        base = {"type": "roughplastic", "diffuse_reflectance": {"type": "rgb", "value": c},
                "alpha": 0.12, "specular_reflectance": {"type": "rgb", "value": [0.34, 0.58, 0.67]}}
    elif category == "water":
        base = {"type": "roughplastic", "diffuse_reflectance": {"type": "rgb", "value": c},
                "alpha": 0.08, "specular_reflectance": {"type": "rgb", "value": [0.58, 0.78, 0.86]}}
    elif category == "roof":
        base = {"type": "roughplastic", "diffuse_reflectance": {"type": "rgb", "value": c}, "alpha": 0.26}
    elif category == "foliage":
        base = {"type": "roughplastic", "diffuse_reflectance": {"type": "rgb", "value": c}, "alpha": 0.88}
    elif category == "wood":
        base = {"type": "roughplastic", "diffuse_reflectance": {"type": "rgb", "value": c}, "alpha": 0.44}
    elif category == "cutaway":
        # Lift the interior palette so the cut-section stays legible in dusk light.
        c = [min(0.90, v * 1.6) for v in c]
        base = {"type": "roughplastic", "diffuse_reflectance": {"type": "rgb", "value": c}, "alpha": 0.58}
    else:
        base = {"type": "roughplastic", "diffuse_reflectance": {"type": "rgb", "value": c}, "alpha": 0.42}
    return {"type": "twosided", "bsdf": base}


def color_bucket(rgb):
    # Preserve the carefully selected base materials while reducing tiny OBJ files.
    return tuple(max(0, min(255, int(round(int(c) / 12) * 12))) for c in rgb)


def faces_to_groups(faces):
    groups = defaultdict(list)
    for points, color, material, outline, group in faces:
        category = material_category(material, group)
        key = (category, color_bucket(color), group if category == "cutaway" else "")
        groups[key].append(points)
    return groups


def write_obj_groups(groups, directory: Path):
    directory.mkdir(parents=True, exist_ok=True)
    shapes = {}
    for index, (key, face_lists) in enumerate(groups.items()):
        category, rgb, _special = key
        obj_path = directory / f"mesh-{index:03d}.obj"
        with obj_path.open("w", encoding="ascii") as f:
            vertex_index = 1
            for points in face_lists:
                for x, y, z in points:
                    # Keep the schematic model's stated 2.5x vertical exaggeration.
                    f.write(f"v {x:.5f} {y:.5f} {z:.5f}\n")
                for j in range(2, len(points)):
                    f.write(f"f {vertex_index} {vertex_index + j - 1} {vertex_index + j}\n")
                vertex_index += len(points)
        shape_name = f"mesh_{index:03d}"
        shape = {"type": "obj", "filename": str(obj_path), "bsdf": make_bsdf(category, rgb)}
        if category == "glass" and rgb[1] >= 210:
            # Warm window light is an idealistic night cue, not an energy model.
            # Pale greenhouse glazing remains reflective, not self-illuminated.
            shape["emitter"] = {"type": "area", "radiance": {"type": "rgb", "value": [0.20, 0.12, 0.075]}}
        shapes[shape_name] = shape
    return shapes


def render_one(shot: str, faces, output: Path, width: int, height: int, spp: int, temp_dir: Path):
    presets = camera_presets()
    target, yaw, radius, elevation, fov = presets[shot]
    obj_dir = temp_dir / shot
    shapes = write_obj_groups(faces_to_groups(faces), obj_dir)
    cx, cy = SITE_CX, SITE_CY
    # Blue-hour environment plus a low warm key light: cinematic, not a weather or
    # energy-performance study. The globe remains a diagram of aspirations.
    scene = {
        "type": "scene",
        "integrator": {"type": "path", "max_depth": 6},
        "sensor": {
            "type": "perspective",
            "fov": fov,
            "to_world": camera(target, yaw, radius, elevation),
            "film": {"type": "hdrfilm", "width": width, "height": height,
                     "pixel_format": "rgb", "rfilter": {"type": "gaussian", "stddev": 0.34}},
            "sampler": {"type": "independent", "sample_count": spp},
        },
        "sky": {"type": "constant", "radiance": {"type": "rgb", "value": [0.28, 0.38, 0.54]}},
        "sun": {"type": "directional", "direction": [-0.48, 0.19, -0.79],
                "irradiance": {"type": "rgb", "value": [2.8, 2.35, 1.8]}},
        "ground": {"type": "rectangle",
                   "to_world": mi.ScalarTransform4f.translate([cx, cy, -18]) @ mi.ScalarTransform4f.scale([620, 390, 1]),
                   "bsdf": {"type": "roughplastic", "diffuse_reflectance": {"type": "rgb", "value": [0.105, 0.15, 0.14]}, "alpha": 0.82}},
        "backdrop": {"type": "rectangle",
                     "to_world": mi.ScalarTransform4f.translate([cx, cy, -19.3]) @ mi.ScalarTransform4f.scale([2300, 2300, 1]),
                     "bsdf": {"type": "roughplastic", "diffuse_reflectance": {"type": "rgb", "value": [0.075, 0.12, 0.13]}, "alpha": 0.9}},
    }
    if shot in {"cutaway", "lab_med", "greenhouse"}:
        # Camera-side soft fill keeps exposed concept geometry readable; it is
        # a light source in the illustration, not a fixture or service load.
        if shot == "greenhouse":
            fill_position = [GREEN_CX, GREEN_CY - 150, MODEL.terrain_z(GREEN_CX, GREEN_CY) + 165]
            fill_power = [42000, 38000, 32000]
        else:
            fill_position = [HQ_X + HQ_W * 0.5, HQ_Y - 220, HQ_GROUND + 210]
            fill_power = [80000, 70000, 55000]
        scene["interior_fill"] = {
            "type": "point",
            "position": fill_position,
            "intensity": {"type": "rgb", "value": fill_power},
        }
    scene.update(shapes)
    start = time.time()
    loaded = mi.load_dict(scene)
    image = mi.render(loaded)
    mi.util.write_bitmap(str(output), image, write_async=False)
    # OpenCV's edge-preserving NLM pass removes scalar-CPU Monte Carlo grain
    # before the clean high-resolution renders are enlarged for the film.
    bgr = cv2.imread(str(output), cv2.IMREAD_COLOR)
    if bgr is None:
        raise RuntimeError(f"Mitsuba did not write a readable image: {output}")
    denoise_h = 5 if width >= 1200 else 7
    bgr = cv2.fastNlMeansDenoisingColored(bgr, None, denoise_h, denoise_h, 7, 21)
    cv2.imwrite(str(output), bgr, [cv2.IMWRITE_PNG_COMPRESSION, 2])
    elapsed = time.time() - start
    print(f"  {shot:10s} {width}x{height} {spp} spp  {elapsed:5.1f}s  {output}", flush=True)
    return output


def render_assets(width: int, height: int, spp: int, quick: bool = False):
    RENDER_ROOT.mkdir(parents=True, exist_ok=True)
    faces = list(MODEL.FACES)
    cutaway_model = load_model()
    add_cutaway_geometry(cutaway_model)
    cutaway_faces = list(cutaway_model.FACES)
    greenhouse_model = load_model()
    greenhouse_model.FACES[:] = [f for f in greenhouse_model.FACES
                                 if f[4] not in {"outpost_hq", "bermed_wing", "medical_core",
                                                 "medical_approach", "greenhouse"}]
    add_greenhouse_detail(greenhouse_model)
    greenhouse_faces = list(greenhouse_model.FACES)
    # The same gentle winter-blue environment across chapters preserves continuity.
    temp_dir = RENDER_ROOT / ("quick-obj" if quick else "production-obj")
    temp_dir.mkdir(parents=True, exist_ok=True)
    shots = [
        ("hero", faces),
        ("aerial", faces),
        ("campus", faces),
        ("cutaway", cutaway_faces),
        ("lab_med", cutaway_faces),
        ("systems", faces),
        ("spa_detail", faces),
        ("greenhouse", greenhouse_faces),
        ("closing", faces),
    ]
    image_dir = RENDER_ROOT / ("quick" if quick else "production")
    image_dir.mkdir(parents=True, exist_ok=True)
    for shot, shot_faces in shots:
        output = image_dir / f"{shot}.png"
        render_one(shot, shot_faces, output, width, height, spp, temp_dir)
    return image_dir


def load_backgrounds(image_dir: Path):
    backgrounds = {}
    shot_names = {scene["shot"] for scene in SCENES} | {"greenhouse", "aerial"}
    for shot in sorted(shot_names):
        p = image_dir / f"{shot}.png"
        if not p.exists():
            raise FileNotFoundError(f"Missing 3D render {p}; render assets first")
        im = Image.open(p).convert("RGB")
        backgrounds[shot] = im.resize((OUT_W + 120, OUT_H + 68), Image.Resampling.LANCZOS)
    return backgrounds


def shot_for_time(seconds: float):
    for scene in SCENES:
        if scene["start"] <= seconds < scene["end"]:
            return scene
    return SCENES[-1]


def animated_backdrop(backgrounds, scene, t: float, shot_name: str | None = None):
    if shot_name is None:
        shot_name = scene["shot"]
        if scene["kind"] == "care":
            local_scene = (t - scene["start"]) / max(0.001, scene["end"] - scene["start"])
            shot_name = "spa_detail" if local_scene < 0.30 else ("greenhouse" if local_scene < 0.60 else "systems")
    src = backgrounds[shot_name]
    local = (t - scene["start"]) / max(0.001, scene["end"] - scene["start"])
    # Slow, restrained camera drift; no false impression of a survey fly-through.
    zoom = 1.015 + 0.035 * (0.5 - 0.5 * math.cos(math.pi * local))
    base = src.resize((int((OUT_W + 120) * zoom), int((OUT_H + 68) * zoom)), Image.Resampling.LANCZOS)
    max_x, max_y = base.width - OUT_W, base.height - OUT_H
    drift = math.sin(math.pi * local)
    x = int(max_x * (0.35 + 0.30 * drift))
    y = int(max_y * (0.45 + 0.10 * math.cos(math.pi * local)))
    crop = base.crop((x, y, x + OUT_W, y + OUT_H))
    # Gentle exposure lift, blue-hour color separation, and a restrained vignette.
    arr = np.asarray(crop).astype(np.float32) / 255.0
    arr = 255.0 * np.power(np.clip(arr, 0, 1), 0.88)
    arr[:, :, 0] *= 0.96
    arr[:, :, 1] *= 1.035
    arr[:, :, 2] *= 1.085
    yy = np.linspace(0, 1, OUT_H, dtype=np.float32)[:, None, None]
    edge = np.maximum(np.exp(-yy * 9), np.exp(-(1 - yy) * 11))
    arr *= 1 - 0.12 * edge
    return Image.fromarray(np.uint8(np.clip(arr, 0, 255)), "RGB")


def rounded(draw, box, radius=18, fill=(5, 15, 26, 220), outline=(91, 221, 237, 84), width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text(draw, xy, value, fnt, fill=WHITE, anchor=None, spacing=5, stroke_width=0):
    draw.multiline_text(xy, value, font=fnt, fill=fill, anchor=anchor, spacing=spacing,
                        stroke_width=stroke_width, stroke_fill=(0, 0, 0, 140))


def draw_snow(overlay: Image.Image, seconds: float, intensity=0.62):
    draw = ImageDraw.Draw(overlay, "RGBA")
    # Deterministic moving snow: a visual atmosphere, not a forecast or snow-load study.
    for i in range(168):
        seed = i * 92821 + 181
        x0 = (seed * 17) % OUT_W
        y0 = (seed * 31) % OUT_H
        speed = 18 + (i % 7) * 8
        drift = 9 + (i % 11) * 1.8
        x = int((x0 + seconds * drift + 14 * math.sin(seconds * 0.38 + i)) % OUT_W)
        y = int((y0 + seconds * speed) % OUT_H)
        radius = 1 + (i % 4 == 0)
        alpha = int(intensity * (34 + (i % 5) * 14))
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(214, 237, 243, alpha))


def draw_header_footer(overlay: Image.Image, seconds: float, scene):
    draw = ImageDraw.Draw(overlay, "RGBA")
    # Header microtype and the persistent concept badge.
    rounded(draw, (60, 46, 534, 95), 18, (4, 15, 27, 194), (91, 221, 237, 78), 1)
    draw.ellipse((80, 62, 96, 78), fill=(*CYAN, 245))
    text(draw, (111, 58), "FRONTIERSHIP  /  OUTPOST ONE", FONTS["micro_bold"], WHITE)
    text(draw, (111, 76), "HIGH DESERT AI LAB HQ  ·  PRIVATE CONCEPT", FONTS["micro"], MUTED)
    rounded(draw, (1518, 46, 1858, 95), 18, (4, 15, 27, 194), (255, 194, 111, 110), 1)
    text(draw, (1688, 70), "BEST-WISHES  ·  CONCEPT", FONTS["micro_bold"], AMBER, anchor="mm")
    # Progress rail.
    draw.rounded_rectangle((60, 1001, 1860, 1007), radius=3, fill=(132, 166, 178, 62))
    draw.rounded_rectangle((60, 1001, 60 + int(1800 * seconds / DURATION), 1007), radius=3, fill=(*CYAN, 235))
    # Timecode and precise status line.
    mm, ss = divmod(int(seconds), 60)
    text(draw, (60, 1021), f"{mm:02d}:{ss:02d}  /  05:00", FONTS["micro"], MUTED)
    text(draw, (1860, 1021), "ILLUSTRATIVE 3D  ·  NOT SURVEY / ENGINEERING / APPROVAL", FONTS["micro"], MUTED, anchor="ra")


def draw_title_panel(overlay: Image.Image, scene, seconds: float):
    draw = ImageDraw.Draw(overlay, "RGBA")
    kind = scene["kind"]
    if kind == "opening":
        rounded(draw, (116, 342, 960, 817), 28, (4, 16, 28, 211), (91, 221, 237, 130), 2)
        text(draw, (160, 393), "BEST-WISHES EDITION  /  01", FONTS["micro_bold"], CYAN)
        text(draw, (158, 448), scene["title"], FONTS["hero"], WHITE, spacing=8)
        text(draw, (162, 658), scene["caption"], FONTS["body"], MUTED)
        rounded(draw, (160, 735, 620, 783), 16, (255, 194, 111, 28), (255, 194, 111, 170), 1)
        text(draw, (390, 759), scene["badge"], FONTS["micro_bold"], AMBER, anchor="mm")
        return
    if kind == "closing":
        rounded(draw, (122, 347, 1084, 818), 28, (4, 16, 28, 218), (255, 194, 111, 120), 2)
        text(draw, (166, 397), "THE NEXT CHAPTER STARTS WITH PROOF", FONTS["micro_bold"], AMBER)
        text(draw, (162, 457), scene["title"], FONTS["hero"], WHITE, spacing=8)
        text(draw, (166, 666), scene["caption"], FONTS["body"], MUTED)
        text(draw, (166, 735), "FRONTIERSHIP  ·  OUTPOST ONE", FONTS["small_bold"], CYAN)
        return

    panel_title = scene["title"]
    panel_caption = scene["caption"]
    if kind == "care":
        phase = (seconds - scene["start"]) / (scene["end"] - scene["start"])
        if phase < 0.30:
            panel_title = "Wellness without the claims."
            panel_caption = "Sauna, small soak, and cold plunge are wellness concepts—not treatment."
        elif phase < 0.60:
            panel_title = "Grow. Share. Gather."
            panel_caption = "Greenhouse-to-table is an idea; food service, staffing, and licensing need review."
        else:
            panel_title = "Prepare, then prove."
            panel_caption = "Access, fire water, EMS protocols, and any tunnel remain unresolved."

    if kind == "cutaway":
        rounded(draw, (60, 785, 905, 972), 22, (4, 15, 26, 146), (91, 221, 237, 91), 1)
        text(draw, (94, 801), f"{scene['num']}  /  {scene['chapter']}", FONTS["micro_bold"], CYAN)
        text(draw, (92, 835), panel_title, FONTS["title"], WHITE, spacing=2)
        text(draw, (96, 900), "Shell, room zones, grade, and site context stay together\nin this conceptual section.", FONTS["small"], MUTED, spacing=4)
    else:
        # Readable lower-third panel leaves the model visible above and to the right.
        rounded(draw, (60, 693, 905, 967), 24, (4, 15, 26, 184), (91, 221, 237, 91), 1)
        text(draw, (94, 717), f"{scene['num']}  /  {scene['chapter']}", FONTS["micro_bold"], CYAN)
        text(draw, (92, 753), panel_title, FONTS["title"], WHITE, spacing=2)
        text(draw, (96, 884), panel_caption, FONTS["small"], MUTED, spacing=4)

    if kind == "stewardship":
        rounded(draw, (1110, 245, 1830, 611), 24, (4, 15, 26, 213), (255, 194, 111, 105), 1)
        text(draw, (1150, 276), "SITE GUARDRAILS  /  USER-DIRECTED", FONTS["micro_bold"], AMBER)
        metrics = [("18%", "disturbance-envelope target"), ("210 CY", "grading target"), ("5", "ponderosa retention target")]
        for i, (value, label) in enumerate(metrics):
            yy = 330 + i * 84
            text(draw, (1150, yy), value, FONTS["metric"], WHITE)
            text(draw, (1450, yy + 9), label, FONTS["small"], MUTED)
        text(draw, (1150, 580), "Not surveyed limits, takeoffs, or verified tree locations.", FONTS["micro"], AMBER)
    elif kind == "program":
        rounded(draw, (1170, 235, 1830, 653), 24, (4, 15, 26, 219), (91, 221, 237, 90), 1)
        text(draw, (1210, 270), "ONE INTEGRATED OFFER", FONTS["micro_bold"], CYAN)
        rows = [
            ("$4,800 / mo", "bundle target; not validated pricing"),
            ("≈ 1 / 12", "owner capacity premise"),
            ("30+ days", "cohorts · no STR"),
            ("20–50 kW", "sustained capability target")
        ]
        for i, (v, label) in enumerate(rows):
            yy = 322 + i * 75
            text(draw, (1210, yy), v, FONTS["small_bold"], WHITE)
            text(draw, (1450, yy + 4), label, FONTS["micro"], MUTED)
        text(draw, (1210, 625), "Amenities and operations remain unpriced / unvalidated.", FONTS["micro"], AMBER)
    elif kind == "cutaway":
        rounded(draw, (1172, 220, 1830, 630), 24, (4, 15, 26, 145), (91, 221, 237, 100), 1)
        text(draw, (1212, 254), "APPROXIMATE PROGRAM BANDS", FONTS["micro_bold"], CYAN)
        rows = [
            ("L3", "owner + focused work", (184, 163, 245)),
            ("L2", "cohort + quiet zones", (105, 224, 229)),
            ("L1", "commons + medical reserve", AMBER),
            ("LOWER", "service + demo reserve", CYAN),
        ]
        for i, (level, label, color) in enumerate(rows):
            yy = 308 + i * 72
            draw.rounded_rectangle((1212, yy, 1270, yy + 40), radius=12, fill=(*color, 46), outline=(*color, 170), width=1)
            text(draw, (1241, yy + 20), level, FONTS["micro_bold"], color, anchor="mm")
            text(draw, (1290, yy + 5), label, FONTS["small"], WHITE)
        text(draw, (1212, 598), "No room schedule, dimensions, egress, or bed count is implied.", FONTS["micro"], AMBER)
    elif kind == "lab_med":
        rounded(draw, (1132, 235, 1830, 641), 24, (4, 15, 26, 218), (91, 221, 237, 95), 1)
        text(draw, (1174, 270), "FRONTIER LAB  /  SAFETY FIRST STANDARD", FONTS["micro_bold"], CYAN)
        text(draw, (1172, 322), "20–50 kW", FONTS["metric"], WHITE)
        text(draw, (1458, 333), "sustained AI capability target", FONTS["small"], MUTED)
        text(draw, (1174, 382), "BYO rented compute  ·  demo closet", FONTS["small_bold"], WHITE)
        draw.line((1174, 427, 1786, 427), fill=(91, 221, 237, 70), width=1)
        text(draw, (1174, 447), "SMALL MEDICAL FACILITY  /  ASPIRATION", FONTS["micro_bold"], AMBER)
        text(draw, (1174, 483), "Emergency capabilities sought; licensure, staffing,\nclinical scope, and EMS interface remain TBD.", FONTS["small"], MUTED, spacing=5)
    elif kind in {"water", "systems", "care"}:
        draw_system_panel(draw, scene, seconds)


def draw_flow_diagram(draw, box, labels, color, progress, note):
    x0, y0, x1, y1 = box
    rounded(draw, box, 22, (4, 15, 26, 222), (*color, 86), 1)
    n = len(labels)
    left, right = x0 + 44, x1 - 44
    center_y = y0 + 122
    xs = [left + (right - left) * i / max(1, n - 1) for i in range(n)]
    glow = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow, "RGBA")
    for i in range(n - 1):
        gd.line((xs[i] + 25, center_y, xs[i + 1] - 25, center_y), fill=(*color, 75), width=11)
    glow = glow.filter(ImageFilter.GaussianBlur(12))
    draw._image.alpha_composite(glow) if hasattr(draw, "_image") else None
    for i, (x, label) in enumerate(zip(xs, labels)):
        r = 18
        draw.ellipse((x - r, center_y - r, x + r, center_y + r), fill=(4, 17, 29, 255), outline=(*color, 235), width=3)
        text(draw, (x, center_y + 49), label, FONTS["micro_bold"], WHITE, anchor="ma", spacing=2)
        if i < n - 1:
            xstart = xs[i] + 26
            xend = xs[i + 1] - 28
            draw.line((xstart, center_y, xend, center_y), fill=(*color, 160), width=3)
            draw.polygon([(xend, center_y), (xend - 13, center_y - 8), (xend - 13, center_y + 8)], fill=(*color, 220))
    dot_x = xs[0] + (xs[-1] - xs[0]) * progress
    draw.ellipse((dot_x - 10, center_y - 10, dot_x + 10, center_y + 10), fill=WHITE, outline=(*color, 255), width=3)
    text(draw, (x0 + 37, y1 - 51), note, FONTS["micro"], AMBER)


def draw_system_panel(draw, scene, seconds):
    kind = scene["kind"]
    local = (seconds - scene["start"]) / (scene["end"] - scene["start"])
    # Glass HUD on the right; a moving marker travels the conceptual link, not a route.
    box = (1060, 205, 1840, 669)
    if kind == "water":
        if local < 0.52:
            title = "WATER  /  CONCEPTUAL OPTIONS"
            labels = ["POSSIBLE\nSOURCE", "TREAT +\nSTORE", "LOW-DEMAND\nUSES", "APPROVED\nREUSE?" ]
            note = "Source · yield · rights · treatment · storage · routing are TBD."
            color = CYAN
            progress = (local / 0.52) % 1
        else:
            title = "DOMESTIC WASTEWATER  /  SEPARATE STREAM"
            labels = ["FIXTURES", "LOW-WATER\nSYSTEM?", "TREAT +\nDISPERSE?", "PROTECTED\nRESERVE"]
            note = "Perc · method · site · capacity · grades · approvals are TBD."
            color = AMBER
            progress = ((local - 0.52) / 0.48) % 1
    elif kind == "systems":
        phase = local * 3
        idx = min(2, int(phase))
        phase_local = phase - idx
        if idx == 0:
            title = "POWER  /  RESILIENCE OPTIONS"
            labels = ["UTILITY?", "PV?", "STORAGE?", "BACKUP?", "CRITICAL\nLOADS"]
            note = "Candidate architecture only; no service size or mix selected."
            color = AMBER
        elif idx == 1:
            title = "NETWORK  /  CONNECTIVITY OPTIONS"
            labels = ["FIBER?", "EDGE +\nFIREWALL", "LAB", "MEDICAL", "GUEST +\nCONTROLS"]
            note = "Carrier · path · throughput · segmentation · security TBD."
            color = CYAN
        else:
            title = "THERMAL  /  HIGH-PERFORMANCE AIM"
            labels = ["ENVELOPE", "HEAT\nPUMPS?", "BALANCED\nVENTILATION", "ZONED\nSPACES"]
            note = "Sizing · heat rejection · heat recovery need real loads."
            color = MINT
        progress = phase_local
    else:
        if local < 0.30:
            title = "NORDIC CIRCUIT  /  WELLNESS AMENITY"
            labels = ["DRY\nSAUNA?", "QUIET\nREST?", "SMALL\nSOAK?", "COLD\nPLUNGE?"]
            note = "Not medical treatment; water · heat · safety · operating cost TBD."
            color = MINT
            progress = (local / 0.30) % 1
        elif local < 0.60:
            title = "GREENHOUSE + COMMONS  /  EXPERIENCE CONCEPT"
            labels = ["GROW?", "WASH +\nPACK?", "SHARED\nKITCHEN?", "LONG\nTABLE?"]
            note = "Food service · staffing · utilities · licensing need review."
            color = CYAN
            progress = ((local - 0.30) / 0.30) % 1
        else:
            title = "RESILIENCE + OPTIONAL PASSAGE"
            labels = ["RUNOFF +\nEROSION", "FIRE\nREADINESS", "EMS\nINTERFACE", "TUNNEL?\nSTUDY ONLY"]
            note = "Access · fire water · protocols · tunnel feasibility are unresolved."
            color = AMBER
            progress = ((local - 0.60) / 0.40) % 1
    rounded(draw, box, 22, (4, 15, 26, 224), (*color, 104), 1)
    text(draw, (1100, 236), title, FONTS["micro_bold"], color)
    n = len(labels)
    left, right = 1108, 1792
    yy = 365
    xs = [left + (right - left) * i / max(1, n - 1) for i in range(n)]
    for i, (x, label) in enumerate(zip(xs, labels)):
        draw.ellipse((x - 15, yy - 15, x + 15, yy + 15), fill=(5, 20, 31, 255), outline=(*color, 230), width=3)
        text(draw, (x, yy + 43), label, FONTS["micro_bold"], WHITE, anchor="ma", spacing=1)
        if i < n - 1:
            x1, x2 = x + 23, xs[i + 1] - 25
            # Dashed links explicitly read as concepts rather than routes.
            segs = 12
            for j in range(segs):
                if j % 2 == 0:
                    a = x1 + (x2 - x1) * j / segs
                    b = x1 + (x2 - x1) * min(1, (j + 1) / segs)
                    draw.line((a, yy, b, yy), fill=(*color, 180), width=3)
    px = xs[0] + (xs[-1] - xs[0]) * progress
    draw.ellipse((px - 9, yy - 9, px + 9, yy + 9), fill=WHITE, outline=(*color, 255), width=2)
    draw.line((1100, 514, 1800, 514), fill=(91, 221, 237, 62), width=1)
    text(draw, (1100, 537), note, FONTS["micro"], MUTED)
    text(draw, (1100, 594), "SCHEMATIC LINKS ONLY  ·  NOT LOCATED OR SIZED", FONTS["micro_bold"], AMBER)


def compose_frame(backgrounds, seconds: float):
    scene = shot_for_time(min(seconds, DURATION - 1 / FPS))
    base = animated_backdrop(backgrounds, scene, seconds)
    if scene["kind"] == "care":
        duration = scene["end"] - scene["start"]
        for fraction, previous_shot, next_shot in ((0.30, "spa_detail", "greenhouse"), (0.60, "greenhouse", "systems")):
            boundary = scene["start"] + duration * fraction
            if boundary - 0.65 <= seconds <= boundary + 0.65:
                blend = max(0.0, min(1.0, (seconds - (boundary - 0.65)) / 1.3))
                old = animated_backdrop(backgrounds, scene, seconds, previous_shot)
                new = animated_backdrop(backgrounds, scene, seconds, next_shot)
                base = Image.blend(old, new, blend)
                break
    # Very soft scene handoff; the next chapter starts cleanly without a hard pop.
    transition = 1.0
    local = seconds - scene["start"]
    if local < transition and scene["start"] > 0:
        previous = SCENES[SCENES.index(scene) - 1]
        prev = animated_backdrop(backgrounds, previous, previous["end"] - 0.05)
        alpha = max(0.0, min(1.0, local / transition))
        base = Image.blend(prev, base, alpha)
    overlay = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    draw_snow(overlay, seconds, 0.42)
    draw_title_panel(overlay, scene, seconds)
    draw_header_footer(overlay, seconds, scene)
    # Fade from / to black only at the ends.
    fade = min(1.0, seconds / 1.1, (DURATION - seconds) / 1.2)
    if fade < 1:
        veil = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, int(255 * (1 - max(0, fade)))))
        overlay = Image.alpha_composite(overlay, veil)
    frame = Image.alpha_composite(base.convert("RGBA"), overlay).convert("RGB")
    return frame


def make_poster(backgrounds):
    # A strong side-on cutaway frame keeps the interior story visible in the viewer.
    frame = compose_frame(backgrounds, 96.0)
    frame.save(POSTER_PATH, format="PNG", optimize=True)
    return frame


def encode_film(backgrounds, poster_only=False):
    poster = make_poster(backgrounds)
    if poster_only:
        return
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    command = [
        ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo", "-vcodec", "rawvideo", "-pix_fmt", "rgb24",
        "-s:v", f"{OUT_W}x{OUT_H}", "-r", str(FPS), "-i", "-",
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "23",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(VIDEO_PATH),
    ]
    print(f"Encoding {DURATION}s / {DURATION * FPS} frames to {VIDEO_PATH}", flush=True)
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        for frame_idx in range(DURATION * FPS):
            seconds = frame_idx / FPS
            frame = compose_frame(backgrounds, seconds)
            if frame_idx == int(96 * FPS):
                frame.save(POSTER_PATH, format="PNG", optimize=True)
            process.stdin.write(frame.tobytes())
            if frame_idx % (FPS * 10) == 0:
                print(f"  frame {frame_idx:5d}/{DURATION * FPS}", flush=True)
        process.stdin.close()
    except BaseException:
        process.kill()
        raise
    stderr = process.stderr.read().decode("utf-8", "replace")
    code = process.wait()
    if code:
        raise RuntimeError(f"ffmpeg exited {code}: {stderr[-4000:]}")
    print(f"Wrote {VIDEO_PATH.stat().st_size:,} bytes and poster {POSTER_PATH.stat().st_size:,} bytes", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--quick", action="store_true", help="Render a small fast 3D preview only")
    parser.add_argument("--preview", action="store_true", help="Render 960x540 stills at 20 spp and stop")
    parser.add_argument("--render-only", action="store_true", help="Render high-quality 3D stills and stop before encoding")
    parser.add_argument("--encode-existing", action="store_true", help="Encode using existing /tmp production stills")
    parser.add_argument("--poster-only", action="store_true", help="Compose only the poster from existing /tmp stills")
    args = parser.parse_args()

    if args.quick:
        outdir = render_assets(640, 360, 16, quick=True)
        print(f"Quick 3D stills ready in {outdir}")
        return
    if args.preview:
        outdir = render_assets(960, 540, 20, quick=True)
        print(f"Preview stills ready in {outdir}")
        return
    if not args.encode_existing and not args.poster_only:
        outdir = render_assets(1440, 810, 32, quick=False)
    else:
        outdir = RENDER_ROOT / "production"
    backgrounds = load_backgrounds(outdir)
    if args.render_only:
        print(f"Production stills ready in {outdir}")
        return
    encode_film(backgrounds, poster_only=args.poster_only)


if __name__ == "__main__":
    main()
