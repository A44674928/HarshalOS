#!/usr/bin/env python3
"""Render a 9-minute, high-density concept film for FRONTIERSHIP / OUTPOST ONE.

The 3D base is the existing schematic OBJ generated from the assessor/GIS ring and
10 EPQS samples. Systems diagrams and interior zoning are intentionally conceptual:
no routed civil/MEP design, surveyed floor plan, or engineering model is implied.
"""
from __future__ import annotations

import importlib.util
import math
import random
import subprocess
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
MODEL_SCRIPT = HERE / "render_outpost_one_pixel_movie.py"
VIDEO_PATH = HERE / "outpost-one-full-feature-film.mp4"
POSTER_PATH = HERE / "outpost-one-full-feature-poster.png"
# High-density pixel-art master: render 640x360 and nearest-neighbor upscale 3x.
BASE_W, BASE_H = 640, 360
OUTPUT_W, OUTPUT_H = 1920, 1080
UPSCALE = 3
FPS = 12
DURATION = 9 * 60
TOTAL_FRAMES = FPS * DURATION
POSTER_FRAME = 130 * FPS  # Representative, fully revealed HQ side-cutaway

COLORS = {
    "bg0": (9, 16, 25),
    "bg1": (18, 31, 41),
    "bg2": (27, 45, 50),
    "panel": (10, 19, 29),
    "panel2": (17, 31, 43),
    "line": (79, 116, 123),
    "text": (238, 239, 224),
    "muted": (170, 193, 190),
    "dim": (119, 148, 151),
    "cyan": (95, 218, 242),
    "blue": (67, 166, 215),
    "teal": (65, 191, 161),
    "amber": (255, 190, 82),
    "orange": (235, 130, 84),
    "red": (232, 105, 96),
    "purple": (170, 142, 230),
    "green": (130, 202, 126),
    "snow": (221, 239, 240),
    "wood": (155, 104, 61),
    "wood2": (109, 72, 48),
    "roof": (28, 38, 48),
    "glass": (70, 173, 192),
    "stone": (114, 119, 111),
}

FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
FONT_SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_SANS_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size: int, bold: bool = False, mono: bool = False):
    candidates = [FONT_BOLD if bold else FONT_REG] if mono else [FONT_SANS_BOLD if bold else FONT_SANS, FONT_REG]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            pass
    return ImageFont.load_default()


def load_model():
    spec = importlib.util.spec_from_file_location("outpost_concept_model", MODEL_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load model script {MODEL_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.add_scene_geometry()
    return module


MODEL = load_model()
FACES = MODEL.FACES
OUTLINE = MODEL.OUTLINE
SITE_W = MODEL.SITE_W
SITE_H = MODEL.SITE_H
SAMPLES = MODEL.SAMPLES
MEAN_ELEV = MODEL.MEAN_ELEV
terrain_z = MODEL.terrain_z

# (start, end, chapter key, title, short on-screen description)
CHAPTERS = [
    (0, 35, "opening", "OUTPOST ONE — THE EXPERIENCE CUT", "A long-form concept walkthrough, not a permit or construction set."),
    (35, 80, "site", "01 / SITE + TERRAIN", "Approximate parcel frame; sparse elevation points; winter mood only."),
    (80, 120, "program", "02 / ONE INTEGRATED PLACE", "Live, work, learn, recover, gather — held as a concept program."),
    (120, 180, "hq", "03 / MAIN HQ — SIDE CUTAWAY", "Bermed lower wing, commons, long-stay and private zones; approximate only."),
    (180, 210, "adu", "04 / OWNER CABIN — SIDE CUTAWAY", "A compact owner base; room arrangement remains illustrative."),
    (210, 250, "lab", "05 / FRONTIER LAB — SIDE CUTAWAY", "20–50 kW sustained is a capability target; compute is BYO rented."),
    (250, 285, "medical", "06 / MEDICAL CORE — SIDE CUTAWAY", "Small emergency-capable reserve; licensure and clinical scope unverified."),
    (285, 325, "spa", "07 / NORDIC + COMMONS CUTAWAYS", "Sauna, hot soak, cold plunge, rest deck, greenhouse and shared table."),
    (325, 365, "water", "08 / WATER + DOMESTIC WASTEWATER", "Source, storage, distribution, treatment and reserve — routes TBD."),
    (365, 405, "electric", "09 / ELECTRICAL + NETWORK", "Source mix, storage, critical loads, uplink and distribution — TBD."),
    (405, 440, "thermal", "10 / HEATING, COOLING + VENTILATION", "Envelope, berm, lab heat and spa hot water — MEP concept only."),
    (440, 475, "site_systems", "11 / DRAINAGE, FIRE + RESPONSE", "On-parcel concepts only; survey, hydrology and agency review required."),
    (475, 505, "tunnel", "12 / OPTIONAL UNDERGROUND PASSAGE", "A possible connector to study, not a selected or proven route."),
    (505, 540, "gates", "13 / WHAT MUST BE PROVED NEXT", "Keep the experience ambitious; keep every system honest."),
]


def ease(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def wrap_lines(draw: ImageDraw.ImageDraw, text: str, face, max_width: int):
    out = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        if not words:
            out.append("")
            continue
        line = words[0]
        for word in words[1:]:
            trial = line + " " + word
            if draw.textbbox((0, 0), trial, font=face)[2] <= max_width:
                line = trial
            else:
                out.append(line)
                line = word
        out.append(line)
    return out


def paragraph(draw, xy, text, face, fill, max_width, line_gap=4, max_lines=None):
    x, y = xy
    lines = wrap_lines(draw, text, face, max_width)
    if max_lines:
        lines = lines[:max_lines]
    height = draw.textbbox((0, 0), "Ag", font=face)[3] + line_gap
    for i, line in enumerate(lines):
        draw.text((x, y + i * height), line, font=face, fill=fill)
    return y + len(lines) * height


def fit_text(draw, text, face, max_width):
    """Keep a single-line label inside its pixel-art panel, marking any trim."""
    if draw.textbbox((0, 0), text, font=face)[2] <= max_width:
        return text
    clipped = text
    while clipped and draw.textbbox((0, 0), clipped + "…", font=face)[2] > max_width:
        clipped = clipped[:-1]
    return clipped.rstrip(" .·") + "…"


def gradient_background(seed: int = 0, snow=False, frame=0):
    image = Image.new("RGB", (BASE_W, BASE_H), COLORS["bg0"])
    draw = ImageDraw.Draw(image)
    band_h = 30
    for y in range(0, BASE_H, band_h):
        t = y / BASE_H
        if t < 0.36:
            color = tuple(int(COLORS["bg0"][i] * (1-t) + COLORS["bg1"][i] * t) for i in range(3))
        else:
            q = (t - 0.36) / 0.64
            color = tuple(int(COLORS["bg1"][i] * (1-q) + COLORS["bg2"][i] * q) for i in range(3))
        draw.rectangle((0, y, BASE_W, y + band_h), fill=color)
    # Sparse old-film specks; intentionally faint so larger text stays crisp.
    rng = random.Random(seed + frame * 17)
    for _ in range(18):
        x, y = rng.randrange(4, BASE_W - 4), rng.randrange(4, BASE_H - 4)
        if rng.random() < 0.35:
            draw.point((x, y), fill=(45, 62, 70))
    if snow:
        add_snow(image, frame, seed)
    return image


def add_snow(image: Image.Image, frame: int, seed: int = 13, density=84):
    draw = ImageDraw.Draw(image)
    rng = random.Random(seed)
    # Deterministic particle field; the particles drift down and slightly east.
    for i in range(density):
        x0 = rng.randrange(0, BASE_W)
        y0 = rng.randrange(0, BASE_H)
        speed = 1.0 + rng.random() * 2.8
        drift = -0.4 + rng.random() * 1.3
        size = 1 if rng.random() < 0.78 else 2
        x = int((x0 + drift * frame + 10 * math.sin((frame + i * 7) / 37)) % BASE_W)
        y = int((y0 + speed * frame) % BASE_H)
        color = (min(255, 170 + rng.randrange(0, 75)), min(255, 194 + rng.randrange(0, 55)), min(255, 200 + rng.randrange(0, 55)))
        draw.rectangle((x, y, x + size, y + size), fill=color)


def top_chrome(image: Image.Image, chapter: str, number: str, title: str, progress: float):
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, BASE_W, 37), fill=(7, 14, 22))
    draw.text((18, 10), "FRONTIERSHIP  /  OUTPOST ONE", font=font(13, True, True), fill=COLORS["cyan"])
    header = fit_text(draw, f"{number}  {chapter.upper()}", font(12, True, True), 166)
    draw.text((300, 10), header, font=font(12, True, True), fill=COLORS["amber"])
    draw.text((BASE_W - 158, 11), "1080p PIXEL CUT", font=font(10, True, True), fill=COLORS["muted"])
    draw.rectangle((18, 36, BASE_W - 18, 39), fill=(29, 46, 55))
    draw.rectangle((18, 36, 18 + int((BASE_W - 36) * max(0, min(1, progress))), 39), fill=COLORS["amber"])
    # Outlined frame stays visible over both clean and winter shots.
    draw.rectangle((7, 6, BASE_W - 8, BASE_H - 7), outline=(76, 108, 116), width=1)


def lower_third(image: Image.Image, title: str, detail: str, chapter: str, warning: str = "CONCEPT ONLY  ·  NOT SURVEY / NOT ENGINEERED / NOT FOR CONSTRUCTION"):
    draw = ImageDraw.Draw(image)
    y0 = BASE_H - 60
    draw.rectangle((0, y0, BASE_W, BASE_H), fill=(7, 14, 22))
    draw.line((0, y0, BASE_W, y0), fill=COLORS["line"], width=1)
    title_font = font(15, True, True)
    detail_font = font(11, False, True)
    warning_font = font(8, True, True)
    chapter_font = font(8, True, True)
    draw.text((18, y0 + 3), fit_text(draw, title, title_font, BASE_W - 36), font=title_font, fill=COLORS["text"])
    draw.text((18, y0 + 22), fit_text(draw, detail, detail_font, BASE_W - 36), font=detail_font, fill=COLORS["muted"])
    draw.text((18, BASE_H - 18), fit_text(draw, warning, warning_font, BASE_W - 185), font=warning_font, fill=(255, 174, 138))
    draw.text((BASE_W - 145, BASE_H - 17), fit_text(draw, chapter, chapter_font, 126), font=chapter_font, fill=COLORS["cyan"])


def panel(draw, box, title, fill=(11, 23, 34), outline=None):
    outline = outline or COLORS["line"]
    draw.rounded_rectangle(box, radius=6, fill=fill, outline=outline, width=1)
    x1, y1, x2, _ = box
    draw.rectangle((x1 + 1, y1 + 1, x2 - 1, y1 + 27), fill=(15, 31, 43))
    draw.text((x1 + 10, y1 + 6), title, font=font(11, True, True), fill=COLORS["cyan"])


def draw_title(t, frame):
    image = gradient_background(4, snow=True, frame=frame)
    draw = ImageDraw.Draw(image)
    # Pixel contour diagonals and a stylized parcel outline.
    for y in range(54, 316, 19):
        draw.line((24, y, 616, y - 28), fill=(30, 52, 61), width=1)
    parcel = [(405, 78), (593, 100), (596, 265), (397, 286), (386, 263), (388, 103)]
    draw.line(parcel + [parcel[0]], fill=COLORS["amber"], width=2, joint="curve")
    panel(draw, (32, 62, 388, 286), "A LONG-FORM CONCEPT FILM", fill=(8, 16, 25), outline=COLORS["amber"])
    draw.text((54, 105), "OUTPOST", font=font(27, True, True), fill=COLORS["text"])
    draw.text((54, 139), "ONE", font=font(42, True, True), fill=COLORS["cyan"])
    draw.line((54, 194, 353, 194), fill=COLORS["line"], width=1)
    paragraph(draw, (54, 207), "A high-desert frontier HQ concept: live, work, learn, recover, gather.", font(12, False, True), COLORS["muted"], 300, 4, 3)
    draw.text((54, 259), "APN 30055004  /  COCONINO COUNTY", font=font(9, True, True), fill=COLORS["amber"])
    top_chrome(image, "Opening", "00", "", min(1, t / 35))
    lower_third(image, "Nine-minute design walkthrough", "Large type · slow holds · side cutaways · animated system maps · winter mood", "OPENING")
    return image


def draw_film_cards(t, frame, chapter):
    image = gradient_background(9, snow=(chapter in {"program", "gates"}), frame=frame)
    draw = ImageDraw.Draw(image)
    title, bullets, color = chapter["title"], chapter["bullets"], chapter.get("color", COLORS["cyan"])
    top_chrome(image, chapter["key"], chapter["number"], title, chapter["progress"])
    panel(draw, (24, 55, 409, 278), chapter.get("left_title", "CONCEPT PROGRAM"), fill=(8, 16, 25), outline=color)
    draw.text((43, 92), chapter.get("hero", "OUTPOST ONE"), font=font(22, True, True), fill=color)
    y = 132
    for i, bullet in enumerate(bullets[:5]):
        draw.rectangle((45, y + 3, 51, y + 9), fill=color)
        y = paragraph(draw, (62, y), bullet, font(11, False, True), COLORS["text"], 320, 3, 2) + 9
    panel(draw, (425, 55, 614, 278), chapter.get("right_title", "STATUS"), fill=(9, 19, 30), outline=COLORS["amber"])
    draw.text((445, 92), chapter.get("status", "PRELIMINARY"), font=font(12, True, True), fill=COLORS["amber"])
    paragraph(draw, (445, 122), chapter.get("note", "Concept only. Routes, dimensions and capacities remain open."), font(10, False, True), COLORS["muted"], 147, 5, 9)
    lower_third(image, title, chapter.get("subtitle", "Read as a program cue, not a selected design."), chapter["key"].upper())
    return image


def vec_dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def unit(v):
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return tuple(x / n for x in v)


def cross(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])


def render_site_world(frame, local_frame):
    image = gradient_background(17, snow=False, frame=frame)
    draw = ImageDraw.Draw(image)
    yaw = math.radians(-145 + 150 * (local_frame / max(1, 45 * FPS - 1)))
    radius = 850 - 70 * math.sin(math.pi * local_frame / (45 * FPS))
    elev = math.radians(37 + 3 * math.sin(2 * math.pi * local_frame / (45 * FPS)))
    target = (SITE_W / 2, SITE_H / 2, 0.0)
    cam = (target[0] + math.cos(yaw) * radius * math.cos(elev),
           target[1] + math.sin(yaw) * radius * math.cos(elev),
           target[2] + radius * math.sin(elev))
    forward = unit((target[0]-cam[0], target[1]-cam[1], target[2]-cam[2]))
    right = unit(cross(forward, (0, 0, 1)))
    up = unit(cross(right, forward))
    focal = 560
    cache = {}
    faces = []
    for points, color, material, outline, group in FACES:
        screen = []
        depths = []
        for p in points:
            if p not in cache:
                rel = (p[0]-cam[0], p[1]-cam[1], p[2]-cam[2])
                depth = vec_dot(rel, forward)
                if depth <= 1:
                    cache[p] = None
                else:
                    cache[p] = (BASE_W/2 + focal*vec_dot(rel, right)/depth,
                                185 - focal*vec_dot(rel, up)/depth, depth)
            proj = cache[p]
            if proj is None:
                screen = []
                break
            screen.append((proj[0], proj[1]))
            depths.append(proj[2])
        if not screen:
            continue
        d = sum(depths) / len(depths)
        a = tuple(points[1][k]-points[0][k] for k in range(3))
        b = tuple(points[2][k]-points[0][k] for k in range(3))
        n = unit(cross(a, b))
        light = unit((-0.43, -0.36, 0.83))
        shade = 0.60 + 0.35 * max(0, vec_dot(n, light))
        rgb = tuple(max(0, min(255, int(c*shade))) for c in color)
        faces.append((d, screen, rgb, outline))
    faces.sort(key=lambda item: item[0], reverse=True)
    for _, pts, fill, outline in faces:
        draw.polygon(pts, fill=fill, outline=outline)
    boundary = []
    for x, y in OUTLINE:
        z = terrain_z(x, y) + 2.0
        rel = (x-cam[0], y-cam[1], z-cam[2])
        d = vec_dot(rel, forward)
        if d > 1:
            boundary.append((BASE_W/2 + focal*vec_dot(rel, right)/d, 185 - focal*vec_dot(rel, up)/d))
    if len(boundary) > 2:
        draw.line(boundary + [boundary[0]], fill=COLORS["amber"], width=2, joint="curve")
    # Foreground snowfall passes over the terrain but remains behind the HUD panels.
    add_snow(image, frame, seed=31, density=56)
    draw = ImageDraw.Draw(image)
    panel(draw, (20, 54, 204, 134), "TERRAIN BASIS", fill=(8, 17, 26), outline=COLORS["cyan"])
    draw.text((32, 86), "10 EPQS spots", font=font(12, True, True), fill=COLORS["text"])
    draw.text((32, 105), "7,256–7,283 ft", font=font(11, False, True), fill=COLORS["muted"])
    draw.text((32, 119), "Z relief ×2.5", font=font(9, True, True), fill=COLORS["amber"])
    panel(draw, (425, 54, 615, 134), "WINTER MOOD", fill=(8, 17, 26), outline=COLORS["blue"])
    paragraph(draw, (439, 88), "Snow is a visual effect, not a forecast or snow-load analysis.", font(9, False, True), COLORS["muted"], 158, 4, 4)
    top_chrome(image, "Site", "01", "", local_frame / max(1, 45*FPS - 1))
    lower_third(image, "The parcel as a 3D concept frame", "GIS outline + ten point samples only · building positions remain illustrative", "SITE + TERRAIN")
    return image


CUTAWAY_ZONES = {
    "hq": [
        [("PLANT / SERVICE", .42, COLORS["purple"]), ("DEMO", .24, COLORS["stone"]), ("STORAGE / LINK", .34, COLORS["wood2"])],
        [("KITCHEN + COMMONS", .50, COLORS["green"]), ("MED RESERVE", .23, COLORS["red"]), ("ENTRY / SUPPORT", .27, COLORS["stone"])],
        [("LONG-STAY", .36, COLORS["blue"]), ("QUIET WORK", .32, COLORS["glass"]), ("SHARED", .32, COLORS["purple"])],
        [("PRIVATE SUITES", .36, COLORS["cyan"]), ("FOCUSED WORK", .32, COLORS["blue"]), ("QUIET", .32, COLORS["purple"])],
    ],
    "adu": [[("LIVING / KITCHEN", .42, COLORS["wood"]), ("BATH / STORE", .24, COLORS["stone"]), ("SLEEP", .34, COLORS["blue"])]],
    "lab": [
        [("PLANT RESERVE", .42, COLORS["stone"]), ("SERVICE", .25, COLORS["wood2"]), ("CIRCULATION", .33, COLORS["blue"])],
        [("DEMO CLOSET", .36, COLORS["purple"]), ("WORKBENCH", .34, COLORS["blue"]), ("OPEN / FLEX", .30, COLORS["green"])],
    ],
    "medical": [[("ARRIVAL / ASSESS", .36, COLORS["stone"]), ("STABILIZE", .34, COLORS["red"]), ("CLEAN / TELEHEALTH", .30, COLORS["blue"])]],
    "spa": [
        [("SAUNA / WARM", .42, COLORS["wood"]), ("CHANGE", .25, COLORS["amber"]), ("REST", .33, COLORS["stone"])],
        [("HOT SOAK", .33, COLORS["blue"]), ("COLD PLUNGE", .30, COLORS["cyan"]), ("REST DECK", .37, COLORS["wood2"])],
    ],
    "greenhouse": [
        [("GROW BEDS", .43, COLORS["green"]), ("WASH-PACK", .30, COLORS["teal"]), ("HANDOFF", .27, COLORS["green"])],
        [("KITCHEN", .34, COLORS["amber"]), ("LONG TABLE", .38, COLORS["wood"]), ("GATHER", .28, COLORS["wood2"])],
    ],
}
def draw_pine(draw, x, base_y, color=(39, 76, 67)):
    draw.polygon([(x, base_y-34), (x-9, base_y-17), (x+9, base_y-17)], fill=color)
    draw.polygon([(x, base_y-25), (x-12, base_y-8), (x+12, base_y-8)], fill=color)
    draw.rectangle((x-2, base_y-8, x+2, base_y), fill=COLORS["wood2"])


def draw_site_context(draw, ground_y, bounds, berm=False):
    x0, x1 = bounds
    if berm:
        ground = [(28, ground_y-2), (70, ground_y-8), (112, ground_y+2),
                  (x0, ground_y), (x1, ground_y), (385, ground_y-7), (402, ground_y+1)]
        soil = ground + [(402, 286), (28, 286)]
        draw.polygon(soil, fill=(53, 48, 43))
        draw.line(ground, fill=(178, 166, 131), width=2)
    else:
        draw.polygon([(28, ground_y), (95, ground_y-4), (165, ground_y),
                      (280, ground_y-3), (402, ground_y), (402, 286), (28, 286)], fill=(37, 43, 40))
        draw.line([(28, ground_y), (x0, ground_y), (x1, ground_y), (402, ground_y)], fill=(170, 161, 128), width=2)
    draw_pine(draw, 42, ground_y+2, (38, 74, 63))
    draw_pine(draw, 395, ground_y+2, (42, 82, 68))
    # Surrounding tree silhouettes and the ground/berm edge provide exterior context.


def draw_cutaway_building(draw, x0, x1, top, bottom, layers, zones_by_layer,
                          kind, reveal, active_layer, ground_y):
    count = len(layers)
    floor_h = (bottom - top) / count
    wall = (184, 192, 183)
    inner_left, inner_right = x0 + 7, x1 - 7
    inner_width = inner_right - inner_left
    # Main envelope remains in place while the near facade is opened to show rooms.
    draw.rectangle((x0, top, x1, bottom), fill=(11, 20, 29), outline=wall, width=2)
    for index, layer in enumerate(layers):
        y0 = int(bottom - (index+1)*floor_h)
        y1 = int(bottom - index*floor_h)
        draw.rectangle((x0+2, y0+1, x1-2, y1-1), fill=(13, 24, 33))
        zones = zones_by_layer[index]
        reveal_edge = inner_left + int(inner_width * reveal)
        cursor = inner_left
        for label, fraction, color in zones:
            zone_width = int(inner_width * fraction)
            zone_end = cursor + zone_width
            visible_end = min(zone_end, reveal_edge)
            if visible_end > cursor:
                draw.rectangle((cursor, y0+4, visible_end, y1-4), fill=color, outline=(16, 25, 31), width=1)
                visible_width = visible_end - cursor
                label_font = font(6, True, True)
                if visible_width >= 24 and y1-y0 >= 20:
                    room_label = fit_text(draw, label, label_font, max(12, visible_width-6))
                    box = draw.textbbox((0, 0), room_label, font=label_font)
                    tx = cursor + max(3, (visible_width - (box[2]-box[0])) // 2)
                    ty = y0 + (y1-y0 - (box[3]-box[1])) // 2
                    draw.text((tx, ty), room_label, font=label_font, fill=(245, 240, 220))
            if zone_end < inner_right:
                draw.line((zone_end, y0+3, zone_end, y1-3), fill=(26, 34, 40), width=2)
            cursor = zone_end
        draw.line((x0, y0, x1, y0), fill=wall, width=2)
        if index == active_layer:
            draw.rectangle((x0+1, y0+1, x1-1, y1-1), outline=COLORS["amber"], width=2)
        # Small exterior glazing on the side returns keeps the facade legible.
        if y0 < ground_y:
            draw.rectangle((x0+1, y0+7, x0+5, min(y1-6, y0+18)), fill=COLORS["cyan"])
            draw.rectangle((x1-5, y0+7, x1-1, min(y1-6, y0+18)), fill=COLORS["cyan"])
    draw.rectangle((x0, top, x1, bottom), outline=wall, width=2)
    # Distinct but deliberately generic roof silhouettes provide exterior context.
    if kind == "greenhouse":
        roof_pts = [(x0-5, top), (x0+18, top-13), (x1-5, top-9), (x1+5, top)]
        draw.polygon(roof_pts, fill=(34, 86, 83), outline=COLORS["cyan"])
        for rx in range(x0+25, x1-5, 32):
            draw.line((rx, top-9, rx, top), fill=(93, 196, 179), width=1)
    elif kind == "lab":
        draw.rectangle((x0-5, top-10, x1+5, top), fill=(66, 76, 83), outline=COLORS["amber"])
        draw.rectangle((x0+18, top-16, x0+42, top-10), fill=(89, 98, 101), outline=wall)
    else:
        roof_color = (50, 56, 59) if kind == "medical" else COLORS["roof"]
        roof_pts = [(x0-8, top), ((x0+x1)//2, top-17), (x1+8, top)]
        draw.polygon(roof_pts, fill=roof_color, outline=COLORS["amber"] if kind in {"hq", "spa"} else wall)
        draw.line((x0-5, top-1, x1+5, top-1), fill=wall, width=1)
    # Door at the grade-facing side; exact entry location is not asserted.
    door_y0 = max(top+3, min(bottom-20, ground_y-18))
    door_x0 = x1-19
    door_y1 = min(bottom-2, door_y0+18)
    draw.rectangle((door_x0, door_y0, x1-3, door_y1), fill=(31, 39, 43), outline=(169, 164, 143))
    draw.point((x1-7, door_y0+10), fill=COLORS["amber"])
    if reveal < 1:
        scan_x = inner_left + int(inner_width * reveal)
        draw.line((scan_x, top+2, scan_x, bottom-2), fill=COLORS["cyan"], width=2)


def draw_dollhouse(frame, local_frame, spec, frame_number):
    image = gradient_background(31, snow=False, frame=frame_number)
    draw = ImageDraw.Draw(image)
    top_chrome(image, spec["chapter"], spec["number"], "", min(1, local_frame / max(1, spec["duration"]*FPS)))
    panel(draw, (18, 54, 412, 300), "SIDE CUTAWAY  /  EXTERIOR + INTERIOR", fill=(8, 16, 25), outline=spec["color"])
    draw.text((36, 75), spec["title"], font=font(14, True, True), fill=spec["color"])
    reveal = ease(min(1, local_frame / (4*FPS)))
    key = next(name for name, candidate in DOLLHOUSES.items() if candidate is spec)
    zones = CUTAWAY_ZONES[key]
    active = int(local_frame // (8*FPS)) % max(1, len(spec["layers"]))

    if key == "hq":
        bounds = (62, 376); ground_y = 216; top, bottom = 116, 249
        draw_site_context(draw, ground_y, bounds, berm=True)
        draw_cutaway_building(draw, bounds[0], bounds[1], top, bottom, spec["layers"], zones,
                              "hq", reveal, active, ground_y)
        draw.text((72, 255), "BERMED LOWER WING BELOW GRADE", font=font(7, True, True), fill=COLORS["amber"])
    elif key in {"spa", "greenhouse"}:
        ground_y = 226
        draw_site_context(draw, ground_y, (48, 388), berm=False)
        if key == "spa":
            # The warm room is inside; soak, plunge, and deck stay outside at grade.
            draw_cutaway_building(draw, 48, 222, 151, 222, [spec["layers"][0]], [zones[0]],
                                  "spa", reveal, active % 1, ground_y)
            draw.text((245, 170), "OUTDOOR CIRCUIT", font=font(8, True, True), fill=COLORS["amber"])
            deck_zones = zones[1]
            dx0, dx1, dy0, dy1 = 238, 385, 184, 222
            width = dx1-dx0
            cursor = dx0
            reveal_edge = dx0 + int(width*reveal)
            for label, fraction, color in deck_zones:
                part = int(width*fraction); end = cursor+part; visible = min(end, reveal_edge)
                if visible > cursor:
                    draw.rectangle((cursor, dy0, visible, dy1), fill=color, outline=(24,34,38), width=2)
                    draw.line((cursor+3, dy1-5, visible-3, dy1-5), fill=(199, 169, 116), width=2)
                    w = visible-cursor
                    if w > 26:
                        f = font(5, True, True); text = fit_text(draw, label, f, w-4)
                        box = draw.textbbox((0,0),text,font=f)
                        draw.text((cursor+(w-(box[2]-box[0]))//2,dy0+13),text,font=f,fill=COLORS["text"])
                cursor=end
            draw.line((232, ground_y, 392, ground_y), fill=(183, 170, 135), width=2)
        else:
            draw_cutaway_building(draw, 44, 211, 158, 222, [spec["layers"][0]], [zones[0]],
                                  "greenhouse", reveal, active % 1, ground_y)
            draw_cutaway_building(draw, 226, 388, 166, 222, [spec["layers"][1]], [zones[1]],
                                  "commons", reveal, active % 1, ground_y)
            # A small produce handoff links two separate exterior volumes, not one floor stack.
            draw_line_dashed(draw, [(206, 192), (220, 192), (233, 192)], COLORS["green"], width=2,
                             dash=4, gap=3, phase=local_frame)
            draw.text((116, 234), "GROW", font=font(6, True, True), fill=COLORS["green"])
            draw.text((281, 234), "GATHER", font=font(6, True, True), fill=COLORS["amber"])
    else:
        count = len(spec["layers"])
        ground_y = 231 if count == 1 else 237
        bounds = (62, 376)
        draw_site_context(draw, ground_y, bounds, berm=False)
        if count == 1:
            top, bottom = 158, 229
        else:
            top, bottom = 145, 235
        kind = "owner" if key == "adu" else "lab" if key == "lab" else "medical"
        draw_cutaway_building(draw, bounds[0], bounds[1], top, bottom, spec["layers"], zones,
                              kind, reveal, active, ground_y)

    draw.text((48, 277), "FACADE + ROOM ZONES + SITE CONTEXT  ·  SCHEMATIC", font=font(7, True, True), fill=COLORS["amber"])
    panel(draw, (425, 54, 616, 300), "FLOORS / ROOM ZONES", fill=(8, 16, 25), outline=COLORS["amber"])
    y = 88
    for layer in spec["layers"]:
        swatch = layer.get("color", spec["color"])
        draw.rectangle((439, y+2, 449, y+12), fill=swatch)
        draw.text((457, y), fit_text(draw, layer["name"], font(9, True, True), 148), font=font(9, True, True), fill=COLORS["text"])
        y = paragraph(draw, (457, y+14), layer["description"], font(8, False, True), COLORS["muted"], 142, 2, 3) + 5
    lower_third(image, spec["title"], spec["footer"], spec["chapter"].upper(), "CUTAWAY CONCEPT ONLY  ·  NO SURVEYED FLOOR PLAN / NOT ENGINEERED")
    return image


def draw_line_dashed(draw, points, color, width=2, dash=9, gap=6, phase=0):
    # Draw individually moving dashes along a polyline; end arrow is drawn separately.
    lengths = []
    total = 0.0
    for a, b in zip(points, points[1:]):
        length = math.hypot(b[0]-a[0], b[1]-a[1])
        lengths.append((a, b, length, total))
        total += length
    if total <= 0:
        return
    pos = -(phase % (dash + gap))
    while pos < total:
        start, end = max(0.0, pos), min(total, pos + dash)
        if end > start:
            for a, b, length, cumulative in lengths:
                lo, hi = max(start, cumulative), min(end, cumulative + length)
                if hi <= lo or length == 0:
                    continue
                t1, t2 = (lo-cumulative)/length, (hi-cumulative)/length
                p1 = (a[0] + (b[0]-a[0])*t1, a[1] + (b[1]-a[1])*t1)
                p2 = (a[0] + (b[0]-a[0])*t2, a[1] + (b[1]-a[1])*t2)
                draw.line([p1, p2], fill=color, width=width)
        pos += dash + gap
    # arrow head at the end
    a, b = points[-2], points[-1]
    ang = math.atan2(b[1]-a[1], b[0]-a[0])
    size = 8
    draw.polygon([b, (b[0]-size*math.cos(ang-0.55), b[1]-size*math.sin(ang-0.55)),
                  (b[0]-size*math.cos(ang+0.55), b[1]-size*math.sin(ang+0.55))], fill=color)


def draw_system_map(frame_number, local_frame, spec):
    image = gradient_background(44, snow=False, frame=frame_number)
    draw = ImageDraw.Draw(image)
    top_chrome(image, spec["chapter"], spec["number"], "", min(1, local_frame / (spec["duration"]*FPS)))
    # System paths remain on a dark slate canvas to make animated movement legible.
    panel(draw, (18, 54, 620, 280), spec["diagram_title"], fill=(8, 17, 27), outline=spec["color"])
    nodes = spec["nodes"]
    centers = {}
    for name, x, y, w, h, headline, detail in nodes:
        centers[name] = (x+w/2, y+h/2)
    # lines behind node cards; edge tuples can include a bend
    for edge in spec["edges"]:
        start_name, end_name, color, bend = edge
        a, b = centers[start_name], centers[end_name]
        points = [a]
        if bend is not None:
            points.append(bend)
        points.append(b)
        draw_line_dashed(draw, points, color, width=2, dash=8, gap=8, phase=local_frame * 1.4)
    for name, x, y, w, h, headline, detail in nodes:
        draw.rounded_rectangle((x, y, x+w, y+h), radius=5, fill=(15, 31, 44), outline=spec["node_color"], width=1)
        # Compact font with large output scaling (3×), and one short support line.
        draw.text((x+8, y+9), headline[:21], font=font(9, True, True), fill=COLORS["text"])
        paragraph(draw, (x+8, y+27), detail, font(7, False, True), COLORS["muted"], w-16, 2, 2)
    # Stage labels and resource-flow legend stay above the lower-third overlay.
    draw.rectangle((30, 267, 46, 277), fill=spec["color"])
    flow_font = font(9, True, True)
    side_font = font(6, True, True)
    draw.text((55, 265), fit_text(draw, spec["flow_label"], flow_font, 305), font=flow_font, fill=spec["color"])
    side_label = fit_text(draw, spec.get("side_label", "ARROWS = CONCEPT FLOW ONLY"), side_font, BASE_W - 384)
    draw.text((366, 268), side_label, font=side_font, fill=COLORS["amber"])
    lower_third(image, spec["title"], spec["footer"], spec["chapter"].upper(), "SYSTEM DIAGRAM ONLY  ·  ROUTES / SIZES / CAPACITIES NOT VALIDATED")
    return image


def draw_site_plan(frame_number, local_frame):
    image = gradient_background(56, snow=True, frame=frame_number)
    draw = ImageDraw.Draw(image)
    top_chrome(image, "Program", "02", "", local_frame / (40*FPS))
    panel(draw, (18, 54, 427, 296), "ONE-PARCEL EXPERIENCE  /  SCHEMATIC PLAN", fill=(8, 16, 25), outline=COLORS["amber"])
    # Simple conceptual layout, not georeferenced footprints.
    bx0, by0, bw, bh = 52, 90, 330, 178
    draw.rounded_rectangle((bx0, by0, bx0+bw, by0+bh), radius=4, outline=COLORS["amber"], width=2)
    draw.text((bx0+5, by0+5), "GIS PARCEL FRAME · NOT SURVEY", font=font(8, True, True), fill=COLORS["amber"])
    # Rough masses positioned to tell the story, not to establish setbacks or access.
    masses = [
        ((bx0+140, by0+68, 110, 48), "HQ / BERMED", COLORS["roof"]),
        ((bx0+48, by0+83, 52, 30), "OWNER", (45, 56, 75)),
        ((bx0+54, by0+127, 62, 30), "AMENITY + SPA", (93, 68, 49)),
        ((bx0+258, by0+35, 42, 23), "GH", (55, 118, 98)),
    ]
    for rect, label, color in masses:
        x, y, width, height = rect
        draw.rounded_rectangle((x, y, x+width, y+height), radius=3, fill=color, outline=COLORS["line"])
        draw.text((x+4, y+7), label[:13], font=font(7, True, True), fill=COLORS["text"])
    # Connect the green house and commons; draw a conceptual internal path only.
    draw_line_dashed(draw, [(bx0+276,by0+58),(bx0+235,by0+71),(bx0+210,by0+96)], COLORS["green"], width=2, dash=6, gap=5, phase=local_frame)
    # The main camera-stage card explains the user's requested experience arc.
    panel(draw, (442, 54, 617, 296), "CURRENT PREMISES", fill=(8, 16, 25), outline=COLORS["cyan"])
    premises = ["20–50 kW sustained", "$4,800 / mo target", "Owner ≈ 1/12", "30+ days · no STR", "Small emergency med", "Nordic + commons"]
    y = 90
    for i, label in enumerate(premises):
        col = [COLORS["purple"], COLORS["amber"], COLORS["cyan"], COLORS["green"], COLORS["red"], COLORS["blue"]][i]
        draw.ellipse((458, y+3, 470, y+15), fill=col)
        draw.text((480, y), label, font=font(8, True, True), fill=COLORS["text"])
        y += 25
    draw.text((456, 244), "TARGETS · NOT UNDERWRITTEN", font=font(6, True, True), fill=COLORS["amber"])
    draw.text((456, 259), "18% · 210 CY · 5 pines", font=font(7, True, True), fill=COLORS["muted"])
    lower_third(image, "The build as a complete stay experience", "Site shapes are approximate; module positions and routes remain unverified.", "PROGRAM")
    return image


def draw_tunnel_option(frame, local_frame):
    image = gradient_background(72, snow=True, frame=frame)
    draw = ImageDraw.Draw(image)
    top_chrome(image, "Tunnel option", "12", "", local_frame/(30*FPS))
    panel(draw, (18, 54, 617, 294), "SECTION STUDY  /  NOT A SELECTED DESIGN", fill=(8, 16, 25), outline=COLORS["amber"])
    # Ground surface, schematic cut slope, two buildings, and an optional dashed passage.
    ground = [(45, 134), (160, 116), (280, 126), (430, 108), (589, 124)]
    draw.line(ground, fill=(157, 149, 119), width=3)
    draw.polygon([(45, 134), (160,116),(280,126),(430,108),(589,124),(589,266),(45,266)], fill=(66, 60, 53))
    # Main house section and wellness building.
    draw.rectangle((110, 87, 250, 135), fill=(39, 50, 63), outline=COLORS["cyan"], width=2)
    draw.rectangle((125, 104, 170, 133), fill=(52, 61, 115), outline=COLORS["purple"])
    draw.text((116, 89), "BERMED HQ", font=font(7, True, True), fill=COLORS["text"])
    draw.multiline_text((128, 111), "LOWER\nWING", font=font(7, True, True), fill=COLORS["text"], spacing=1)
    draw.rectangle((430, 93, 531, 134), fill=(95, 70, 50), outline=COLORS["amber"], width=2)
    draw.text((434, 96), "AMENITY / SPA", font=font(7, True, True), fill=COLORS["text"])
    # Optional tunnel corridor (dashed, no fixed elevation/grade).
    tunnel = [(167, 164), (245, 190), (326, 182), (403, 167), (468, 148)]
    draw_line_dashed(draw, tunnel, COLORS["amber"], width=3, dash=9, gap=8, phase=local_frame*1.2)
    draw.text((242, 207), "OPTIONAL PEDESTRIAN / SERVICE LINK", font=font(8, True, True), fill=COLORS["amber"])
    panel(draw, (359, 242, 603, 286), "FEASIBILITY GATES", fill=(8, 16, 25), outline=COLORS["red"])
    gate_font = font(7, True, True)
    draw.text((371, 261), fit_text(draw, "Geotech · water · egress · fire · access", gate_font, 218), font=gate_font, fill=COLORS["text"])
    lower_third(image, "Could an underground passage connect buildings?", "Possible to study in principle; this dashed route is optional, not verified.", "TUNNEL OPTION", "NO GEOTECH / GROUNDWATER / CODE / EGRESS STUDY HAS BEEN DONE")
    return image


def draw_gates(frame, local_frame):
    image = gradient_background(84, snow=False, frame=frame)
    draw = ImageDraw.Draw(image)
    top_chrome(image, "Open gates", "13", "", local_frame/(35*FPS))
    panel(draw, (20, 55, 620, 292), "DESIGN QUESTIONS BEFORE THIS CAN BECOME A BUILD SET", fill=(8, 16, 25), outline=COLORS["amber"])
    questions = [
        ("SURVEY", "Boundary, topo, access, utilities"),
        ("WATER", "Well yield, water quality, spa demand"),
        ("WASTEWATER", "Perc, treatment type, capacity, reserve"),
        ("STRUCTURE", "Geotech, berm, tunnel, snow + seismic"),
        ("MEP", "Electrical source mix, thermal loads, backup"),
        ("LIFE SAFETY", "Clinic scope, egress, fire/EMS review"),
        ("OPERATIONS", "Staffing, cleaning, food service, insurance"),
    ]
    y = 86
    for i, (label, detail) in enumerate(questions):
        col = [COLORS["cyan"], COLORS["blue"], COLORS["orange"], COLORS["purple"], COLORS["amber"], COLORS["red"], COLORS["green"]][i]
        draw.rectangle((40, y+1, 168, y+22), fill=(17, 34, 47), outline=col)
        draw.text((49, y+6), label, font=font(9, True, True), fill=col)
        draw.text((190, y+6), detail, font=font(9, False, True), fill=COLORS["text"])
        y += 27
    lower_third(image, "Ambitious program. Explicit uncertainty.", "The video communicates a concept; it does not settle routes, sizes, code, permits, or costs.", "GATES")
    return image


# Side-elevation building cutaways use broad program zones, not floor plans.
DOLLHOUSES = {
    "hq": {
        "chapter":"Main HQ", "number":"03", "title":"MAIN HQ · BERMED WING",
        "duration":60, "color":COLORS["cyan"],
        "footer":"Program zones only · no bed count, room dimensions, or construction detail asserted.",
        "layers":[
            {"name":"BERMED LOWER", "description":"Service / plant reserve + demo closet; tunnel tie-in is optional only.", "color":COLORS["purple"], "rooms":[(0,0,4,5,COLORS["purple"]),(4,0,5,2,COLORS["stone"]),(4,2,5,3,COLORS["wood2"])]},
            {"name":"LEVEL 1 · COMMONS", "description":"Entry, shared kitchen/table, and separately scoped medical reserve.", "color":COLORS["green"], "rooms":[(0,0,5,5,COLORS["green"]),(5,0,2,3,COLORS["red"]),(7,0,2,5,COLORS["stone"])]},
            {"name":"LEVEL 2 · LONG STAY", "description":"Resident work / shared quiet zones; plan TBD.", "color":COLORS["blue"], "rooms":[(0,0,3,5,COLORS["blue"]),(3,0,3,5,COLORS["glass"]),(6,0,3,5,COLORS["purple"])]},
            {"name":"LEVEL 3 · PRIVATE", "description":"Private suites / focused work; plan TBD.", "color":COLORS["cyan"], "rooms":[(0,0,3,5,COLORS["cyan"]),(3,0,3,5,COLORS["blue"]),(6,0,3,5,COLORS["purple"])]},
        ]},
    "adu": {
        "chapter":"Owner cabin", "number":"04", "title":"OWNER CABIN / ADU",
        "duration":30, "color":COLORS["amber"],
        "footer":"Compact detached owner base · size and exact room plan remain unverified.",
        "layers":[{"name":"SINGLE-LEVEL ZONES", "description":"Living / kitchenette · sleep · bath / storage; owner use stays outside monetized inventory.", "color":COLORS["amber"], "rooms":[(0,0,4,4,COLORS["wood"]),(4,0,2,4,COLORS["stone"]),(6,0,3,4,COLORS["blue"])]}]},
    "lab": {
        "chapter":"Frontier Lab", "number":"05", "title":"DEMO CLOSET + FRONTIER LAB",
        "duration":40, "color":COLORS["purple"],
        "footer":"20–50 kW sustained is the program target; no facility load or service size is selected.",
        "layers":[
            {"name":"SHELL / SERVICE", "description":"Power + thermal plant reserve; pathways shown generically.", "color":COLORS["stone"], "rooms":[(0,0,4,4,COLORS["stone"]),(4,0,5,4,COLORS["wood2"])]},
            {"name":"DEMO CLOSET", "description":"Small demo zone + work bench; BYO rented compute remains movable.", "color":COLORS["purple"], "rooms":[(0,0,3,4,COLORS["purple"]),(3,0,4,4,COLORS["blue"]),(7,0,2,4,COLORS["green"])]},
        ]},
    "medical": {
        "chapter":"Medical core", "number":"06", "title":"EMERGENCY-CAPABLE MEDICAL RESERVE",
        "duration":35, "color":COLORS["red"],
        "footer":"Symbolic room zoning only · medical licensure, staffing, layout and EMS interface are unverified.",
        "layers":[{"name":"CORE ZONES", "description":"Arrival / assessment reserve · stabilization reserve · telehealth / clean storage.", "color":COLORS["red"], "rooms":[(0,0,3,4,COLORS["stone"]),(3,0,3,4,COLORS["red"]),(6,0,3,4,COLORS["blue"])]}]},
    "spa": {
        "chapter":"Nordic spa", "number":"07", "title":"AMENITY BARN + NORDIC CIRCUIT",
        "duration":40, "color":COLORS["blue"],
        "footer":"Wellness amenity, not medical treatment; water, heat, safety and waste loads are not assessed.",
        "layers":[
            {"name":"BARN / WARM ROOM", "description":"Dry sauna / warm room · rest lounge · changing / rinse concept.", "color":COLORS["wood"], "rooms":[(0,0,4,4,COLORS["wood"]),(4,0,3,4,COLORS["amber"]),(7,0,2,4,COLORS["stone"])]},
            {"name":"OUTDOOR CIRCUIT", "description":"Small hot soak · cold plunge · quiet rest deck; no large pool asserted.", "color":COLORS["blue"], "rooms":[(0,0,3,4,COLORS["blue"]),(3,0,3,4,COLORS["cyan"]),(6,0,3,4,COLORS["wood2"])]},
        ]},
    "greenhouse": {
        "chapter":"Greenhouse / Commons", "number":"07B", "title":"GREENHOUSE → SHARED TABLE",
        "duration":30, "color":COLORS["green"],
        "footer":"Food-service, water, power, staffing and produce assumptions are not priced or validated.",
        "layers":[
            {"name":"GREENHOUSE", "description":"Grow beds · wash/pack reserve · produce handoff to commons.", "color":COLORS["green"], "rooms":[(0,0,3,4,COLORS["green"]),(3,0,3,4,COLORS["teal"]),(6,0,3,4,COLORS["green"])]},
            {"name":"COMMONS", "description":"Shared chef-kitchen / long table / programmed dinners as hospitality cues.", "color":COLORS["amber"], "rooms":[(0,0,4,4,COLORS["amber"]),(4,0,5,4,COLORS["wood"])]},
        ]},
}


def make_system_specs():
    return {
        "water": {
            "chapter":"Water", "number":"08", "duration":40, "color":COLORS["blue"], "node_color":COLORS["blue"],
            "title":"Water flow · concept only",
            "diagram_title":"DOMESTIC WATER / SUPPLY CONCEPT",
            "flow_label":"BLUE = POSSIBLE SUPPLY FLOW",
            "footer":"Well point, yield, treatment, storage, pipe routes, spa demand and water rights/permits are unverified.",
            "side_label":"No pipe diameters / pump sizing / flow rates asserted.",
            "nodes":[
                ("src",24,123,105,53,"WELL / SOURCE","potential source"),
                ("treat",175,123,130,53,"TREAT + STORE","quality/capacity TBD"),
                ("dist",355,123,110,53,"DISTRIBUTE","routing TBD"),
                ("house",502,68,102,40,"HQ / ADU","domestic use"),
                ("lab",502,119,102,40,"LAB / MED","loads TBD"),
                ("spa",502,170,102,40,"SPA CIRCUIT","recirculation TBD"),
                ("gh",502,221,102,40,"GREENHOUSE","irrigation TBD"),
            ],
            "edges":[("src","treat",COLORS["blue"],None),("treat","dist",COLORS["blue"],None),
                      ("dist","house",COLORS["blue"],(476,103)),("dist","lab",COLORS["blue"],None),
                      ("dist","spa",COLORS["blue"],None),("dist","gh",COLORS["blue"],(476,240))]
        },
        "waste": {
            "chapter":"Wastewater", "number":"08B", "duration":40, "color":COLORS["orange"], "node_color":COLORS["orange"],
            "title":"Wastewater · domestic stream concept",
            "diagram_title":"DOMESTIC WASTEWATER / ONSITE SYSTEM CONCEPT",
            "flow_label":"AMBER = POSSIBLE DOMESTIC WASTEWATER FLOW",
            "footer":"Perc, treatment type, location, capacity, gravity grades, reserve area and approval are unverified.",
            "side_label":"Lab / clinical / biohazard wastes are segregated—not shown in this line.",
            "nodes":[
                ("fixtures",24,123,128,53,"DOMESTIC FIXTURES","HQ · ADU · showers"),
                ("collect",196,123,130,53,"COLLECT / SEPARATE","routes TBD"),
                ("onsite",374,123,115,53,"ONSITE DESIGN","treatment TBD"),
                ("field",514,94,90,48,"DISPERSAL","location TBD"),
                ("reserve",514,158,90,48,"RESERVE","required extent TBD"),
            ],
            "edges":[("fixtures","collect",COLORS["orange"],None),("collect","onsite",COLORS["orange"],None),
                      ("onsite","field",COLORS["orange"],(501,116)),("onsite","reserve",COLORS["orange"],(501,180))]
        },
        "electric": {
            "chapter":"Electrical", "number":"09A", "duration":20, "color":COLORS["amber"], "node_color":COLORS["amber"],
            "title":"Electrical power · source mix open",
            "diagram_title":"POWER / CRITICAL LOADS — CONCEPT ONLY",
            "flow_label":"GOLD = CONCEPT POWER DISTRIBUTION",
            "footer":"Generation, storage, backup, capacity, service, and conductor routes are not selected.",
            "side_label":"20–50 kW is a compute-capability target—not a service-size claim.",
            "nodes":[
                ("sources",22,123,125,53,"SOURCE OPTIONS","mix TBD"),
                ("store",190,123,125,53,"STORAGE / BACKUP","design TBD"),
                ("panel",358,123,120,53,"DISTRIBUTION","critical circuits TBD"),
                ("home",511,58,95,42,"HOME","loads TBD"),
                ("lab",511,111,95,42,"LAB","20–50 kW target"),
                ("med",511,164,95,42,"MED CORE","backup priority"),
                ("spa",511,217,95,42,"SPA / GH","loads TBD"),
            ],
            "edges":[("sources","store",COLORS["amber"],None),("store","panel",COLORS["amber"],None),
                      ("panel","home",COLORS["amber"],(493,86)),("panel","lab",COLORS["amber"],None),
                      ("panel","med",COLORS["amber"],None),("panel","spa",COLORS["amber"],(493,239))]
        },
        "network": {
            "chapter":"Network", "number":"09B", "duration":20, "color":COLORS["cyan"], "node_color":COLORS["cyan"],
            "title":"Campus connectivity · architecture open",
            "diagram_title":"NETWORK / SECURITY BOUNDARIES — CONCEPT ONLY",
            "flow_label":"CYAN = POSSIBLE CONNECTIVITY PATH",
            "footer":"Carrier, throughput, routing, cybersecurity, monitoring and service-level agreements are unselected.",
            "side_label":"Rented compute / demo closet only; no production network design implied.",
            "nodes":[
                ("wan",22,123,120,53,"WAN OPTIONS","carrier / path TBD"),
                ("edge",187,123,120,53,"EDGE / FIREWALL","redundancy TBD"),
                ("core",352,123,120,53,"CAMPUS CORE","segmentation TBD"),
                ("home",511,58,95,42,"HOME","resident access"),
                ("lab",511,111,95,42,"LAB / DEMO","BYO compute"),
                ("med",511,164,95,42,"MED CORE","access policy TBD"),
                ("guest",511,217,95,42,"GUEST","isolated access"),
            ],
            "edges":[("wan","edge",COLORS["cyan"],None),("edge","core",COLORS["cyan"],None),
                      ("core","home",COLORS["cyan"],(493,86)),("core","lab",COLORS["cyan"],None),
                      ("core","med",COLORS["cyan"],None),("core","guest",COLORS["cyan"],(493,239))]
        },
        "thermal": {
            "chapter":"Thermal / HVAC", "number":"10", "duration":35, "color":COLORS["red"], "node_color":COLORS["red"],
            "title":"Heating, cooling + ventilation · MEP concept",
            "diagram_title":"THERMAL ZONES / EQUIPMENT NOT SELECTED",
            "flow_label":"RED = WARM / BLUE = COOL OR RETURN",
            "footer":"No heat-pump type, ground loop, ventilation rate, heat-recovery system or equipment sizing is specified.",
            "side_label":"Berm may buffer temperatures; no performance claim made.",
            "nodes":[
                ("envelope",22,123,127,53,"ENVELOPE / BERM","concept buffer"),
                ("plant",193,123,126,53,"MEP PLANT","equipment TBD"),
                ("control",362,123,116,53,"ZONE CONTROL","sequence TBD"),
                ("house",511,58,95,42,"HOUSE","heating/cooling"),
                ("lab",511,111,95,42,"LAB","heat rejection"),
                ("med",511,164,95,42,"MED CORE","comfort/backup"),
                ("spa",511,217,95,42,"SPA","hot water demand"),
            ],
            "edges":[("envelope","plant",COLORS["red"],None),("plant","control",COLORS["red"],None),
                      ("control","house",COLORS["red"],(494,84)),("control","lab",COLORS["blue"],None),
                      ("control","med",COLORS["red"],None),("control","spa",COLORS["blue"],(494,240))]
        },
        "site_systems": {
            "chapter":"Drainage / Fire / EMS", "number":"11", "duration":35, "color":COLORS["blue"], "node_color":COLORS["blue"],
            "title":"Drainage + emergency response · concept map",
            "diagram_title":"SURFACE WATER / FIRE / EMS — ALL ROUTES TBD",
            "flow_label":"DASHED = STUDY PATH, NOT VERIFIED FLOW",
            "footer":"Survey-controlled topography, hydrology, fire-water sizing, fire-district and EMS review are still required.",
            "side_label":"No exact swale, road, LZ or hydrant location is asserted.",
            "nodes":[
                ("roof",22,88,120,52,"ROOF / PAVED","runoff sources"),
                ("surface",194,88,130,52,"SURFACE CONTROL","grading TBD"),
                ("hold",382,88,120,52,"RETENTION","volume TBD"),
                ("fire",22,194,120,52,"FIRE WATER","source/sizing TBD"),
                ("access",194,194,130,52,"ACCESS / EGRESS","legal route TBD"),
                ("ems",382,194,120,52,"MED / EMS","protocol TBD"),
            ],
            "edges":[("roof","surface",COLORS["blue"],None),("surface","hold",COLORS["blue"],None),
                      ("fire","access",COLORS["red"],None),("access","ems",COLORS["red"],None)]
        },
    }


SYSTEM_SPECS = make_system_specs()


def chapter_for_time(seconds: float):
    for start, end, key, title, subtitle in CHAPTERS:
        if start <= seconds < end:
            return start, end, key, title, subtitle
    return CHAPTERS[-1]


def render_frame(frame_no: int):
    seconds = frame_no / FPS
    start, end, key, title, subtitle = chapter_for_time(seconds)
    local = seconds - start
    if key == "opening":
        return draw_title(seconds, frame_no)
    if key == "site":
        return render_site_world(frame_no, int(local * FPS))
    if key == "program":
        image = draw_site_plan(frame_no, local * FPS)
        # Repaint top chrome with chapter-specific progress.
        return image
    if key == "spa":
        if local < 22:
            return draw_dollhouse(frame_no, local * FPS, DOLLHOUSES["spa"], frame_no)
        return draw_dollhouse(frame_no, (local - 22) * FPS, DOLLHOUSES["greenhouse"], frame_no)
    if key in DOLLHOUSES:
        return draw_dollhouse(frame_no, local * FPS, DOLLHOUSES[key], frame_no)
    if key == "water":
        spec = SYSTEM_SPECS["water"]
        image = draw_system_map(frame_no, local*FPS, spec)
        # Alternate domestic wastewater inside the long utility chapter.
        if local >= 20:
            spec = SYSTEM_SPECS["waste"]
            image = draw_system_map(frame_no, (local-20)*FPS, spec)
        return image
    if key == "electric":
        if local < 20:
            return draw_system_map(frame_no, local*FPS, SYSTEM_SPECS["electric"])
        return draw_system_map(frame_no, (local-20)*FPS, SYSTEM_SPECS["network"])
    if key == "thermal":
        return draw_system_map(frame_no, local*FPS, SYSTEM_SPECS["thermal"])
    if key == "site_systems":
        return draw_system_map(frame_no, local*FPS, SYSTEM_SPECS["site_systems"])
    if key == "tunnel":
        return draw_tunnel_option(frame_no, local*FPS)
    if key == "gates":
        return draw_gates(frame_no, local*FPS)
    return draw_title(seconds, frame_no)


def encode():
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    command = [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
        "-f", "rawvideo", "-vcodec", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{BASE_W}x{BASE_H}", "-r", str(FPS), "-i", "-",
        "-vf", f"scale={OUTPUT_W}:{OUTPUT_H}:flags=neighbor",
        "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-metadata", "title=FRONTIERSHIP OUTPOST ONE — 9-minute concept feature",
        "-metadata", "comment=Concept zones and system flows only; not a permit, engineering, medical, or construction design",
        str(VIDEO_PATH),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    if process.stdin is None:
        raise RuntimeError("ffmpeg stdin not available")
    poster_saved = False
    for i in range(TOTAL_FRAMES):
        frame = render_frame(i)
        if not poster_saved and i == POSTER_FRAME:
            frame.resize((OUTPUT_W, OUTPUT_H), Image.Resampling.NEAREST).save(POSTER_PATH, optimize=True)
            poster_saved = True
        process.stdin.write(frame.tobytes())
        if i % (FPS * 60) == 0:
            print(f"rendered {i//FPS:03d}/{DURATION} seconds", flush=True)
    process.stdin.close()
    stderr = process.stderr.read() if process.stderr else b""
    code = process.wait()
    if code != 0:
        raise RuntimeError(f"ffmpeg exited {code}: {stderr.decode(errors='replace')}")
    if not poster_saved:
        render_frame(0).resize((OUTPUT_W, OUTPUT_H), Image.Resampling.NEAREST).save(POSTER_PATH, optimize=True)
    print(f"feature film: {VIDEO_PATH} ({VIDEO_PATH.stat().st_size:,} bytes)")
    print(f"poster: {POSTER_PATH} ({POSTER_PATH.stat().st_size:,} bytes)")


def main():
    print(f"Rendering {DURATION // 60} minutes at {OUTPUT_W}x{OUTPUT_H}, {FPS} fps; {TOTAL_FRAMES} frames.", flush=True)
    encode()


if __name__ == "__main__":
    main()
