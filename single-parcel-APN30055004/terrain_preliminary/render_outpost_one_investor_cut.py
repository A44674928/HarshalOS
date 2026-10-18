#!/usr/bin/env python3
"""Render the 3–5 minute OUTPOST ONE investor concept cut with PyAV and Pillow.

This is a graphic-led, non-site-specific investor explainer. It deliberately does
not reuse old film overlays, site-plan imagery, or unverified building geometry.
"""
from __future__ import annotations

import argparse
import math
import os
import wave
from fractions import Fraction
from pathlib import Path
from typing import Iterable

import av
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "investor-cut-assets"
DEFAULT_OUTPUT = ROOT / "OUTPOST_ONE_INVESTOR_CUT.mp4"
CLIPS = [
    ("01-thesis.wav", "THESIS"),
    ("02-room-economics.wav", "ROOM ECONOMICS"),
    ("03-lean-design.wav", "LEAN REPEATABLE PLAN"),
    ("04-frontier-safety.wav", "FRONTIER + SAFETY"),
    ("05-proof-gates.wav", "PROOF GATES"),
]
WIDTH, HEIGHT, FPS = 1920, 1080, 24
GAP_SECONDS = 1.5
FINAL_HOLD_SECONDS = 2.5
TRANSITION_SECONDS = 0.65

BG_TOP = (12, 23, 29)
BG_BOTTOM = (18, 37, 34)
PANEL = (21, 39, 43)
PANEL_ALT = (26, 46, 49)
INK = (238, 242, 231)
MUTED = (167, 183, 171)
GREEN = (146, 203, 165)
AMBER = (239, 190, 103)
BLUE = (139, 184, 207)
RED = (224, 147, 127)
LINE = (69, 104, 91)
DARK = (9, 18, 23)

FONT_DIRS = [
    Path("/usr/share/fonts/truetype/dejavu"),
    Path("/usr/share/fonts/truetype/liberation"),
    Path("/Library/Fonts"),
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    names = ["DejaVuSans-Bold.ttf", "LiberationSans-Bold.ttf"] if bold else ["DejaVuSans.ttf", "LiberationSans-Regular.ttf"]
    for directory in FONT_DIRS:
        for name in names:
            candidate = directory / name
            if candidate.exists():
                return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


class FontSet:
    tiny = font(18)
    small = font(23)
    body = font(29)
    body_b = font(29, True)
    label = font(24, True)
    subhead = font(38, True)
    title = font(58, True)
    hero = font(91, True)
    price = font(119, True)
    metric = font(78, True)


F = FontSet()


def rounded(draw: ImageDraw.ImageDraw, box, radius=22, fill=PANEL, outline=None, width=2):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text(draw: ImageDraw.ImageDraw, xy, value: str, face, fill=INK, anchor=None, spacing=6):
    draw.multiline_text(xy, value, font=face, fill=fill, anchor=anchor, spacing=spacing)


def wrapped(draw: ImageDraw.ImageDraw, value: str, face, max_width: int) -> list[str]:
    lines: list[str] = []
    for paragraph in value.split("\n"):
        words = paragraph.split()
        line = ""
        for word in words:
            candidate = word if not line else f"{line} {word}"
            if draw.textbbox((0, 0), candidate, font=face)[2] <= max_width:
                line = candidate
            else:
                if line:
                    lines.append(line)
                line = word
        lines.append(line)
    return lines


def paragraph(draw: ImageDraw.ImageDraw, xy, value: str, face, max_width: int, fill=MUTED, line_gap=9) -> int:
    lines = wrapped(draw, value, face, max_width)
    x, y = xy
    line_h = face.size + line_gap
    for line in lines:
        draw.text((x, y), line, font=face, fill=fill)
        y += line_h
    return y


def gradient_background(seed: int) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG_TOP)
    pix = image.load()
    for y in range(HEIGHT):
        t = y / max(1, HEIGHT - 1)
        c = tuple(int(BG_TOP[i] * (1 - t) + BG_BOTTOM[i] * t) for i in range(3))
        for x in range(WIDTH):
            pix[x, y] = c
    draw = ImageDraw.Draw(image, "RGB")
    # Low-contrast high-desert ridgelines: atmosphere only, not a parcel/site rendering.
    ridge1 = [(0, 760), (210, 690), (410, 735), (675, 635), (880, 710), (1090, 640), (1320, 725), (1530, 625), (1740, 695), (1920, 660), (1920, 1080), (0, 1080)]
    ridge2 = [(0, 845), (250, 780), (510, 835), (770, 748), (1030, 835), (1285, 755), (1515, 825), (1735, 760), (1920, 815), (1920, 1080), (0, 1080)]
    draw.polygon(ridge1, fill=(15, 31, 31))
    draw.polygon(ridge2, fill=(17, 34, 31))
    # Abstract contour lines, intentionally faint.
    for k in range(6):
        y = 690 + k * 48 + (seed % 3) * 6
        draw.arc((-330 - k * 18, y - 140, 780 + k * 36, y + 280), 195, 343, fill=(29, 54, 48), width=2)
        draw.arc((1020 - k * 28, y - 180, 2110 + k * 35, y + 250), 195, 343, fill=(29, 54, 48), width=2)
    return image


def draw_header(draw: ImageDraw.ImageDraw, chapter: str, progress: float):
    # Brand mark: restrained tree/circuit symbol.
    draw.ellipse((106, 47, 158, 99), outline=GREEN, width=3)
    draw.line((132, 88, 132, 60), fill=GREEN, width=3)
    draw.line((132, 65, 120, 78), fill=GREEN, width=3)
    draw.line((132, 70, 144, 80), fill=GREEN, width=3)
    draw.ellipse((117, 74, 123, 80), fill=AMBER)
    draw.ellipse((142, 77, 148, 83), fill=AMBER)
    text(draw, (176, 53), "FRONTIERSHIP", F.label, INK)
    text(draw, (177, 83), "OUTPOST ONE", F.tiny, MUTED)
    text(draw, (1810, 58), "INVESTOR CONCEPT  ·  2026.10", F.tiny, MUTED, anchor="ra")
    # Master progress rail and active chapter cue.
    draw.rounded_rectangle((108, 124, 1812, 130), radius=3, fill=(48, 69, 65))
    draw.rounded_rectangle((108, 124, 108 + int(1704 * max(0, min(1, progress))), 130), radius=3, fill=GREEN)
    text(draw, (1810, 149), chapter.upper(), F.tiny, AMBER, anchor="ra")


def draw_footer(draw: ImageDraw.ImageDraw):
    draw.line((108, 1005, 1812, 1005), fill=(62, 88, 80), width=2)
    text(draw, (110, 1025), "CONCEPT ONLY  ·  NOT A FORECAST, OFFER, PERMIT, OR ENGINEERED DESIGN", F.tiny, MUTED)
    text(draw, (1810, 1025), "FRONTIERSHIP  /  OUTPOST ONE", F.tiny, MUTED, anchor="ra")


def draw_scene_one(image: Image.Image):
    d = ImageDraw.Draw(image)
    draw_header(d, "Thesis", 0.0)
    text(d, (112, 235), "SAFETY FIRST  ·  HIGH-DESERT HQ", F.label, AMBER)
    text(d, (108, 300), "A place to live,\nwork, learn & care.", F.hero, INK, spacing=15)
    paragraph(d, (116, 535), "Long-stay residency, a frontier-scale AI program, shared amenities, and a small emergency-capable medical concept.", F.body, 850, MUTED, 13)
    rounded(d, (112, 750, 500, 822), radius=28, fill=(31, 56, 49), outline=LINE)
    text(d, (140, 771), "30+ DAY COHORTS", F.label, GREEN)
    rounded(d, (525, 750, 760, 822), radius=28, fill=(31, 56, 49), outline=LINE)
    text(d, (554, 771), "NO STR", F.label, GREEN)
    # A simple cabin + tree silhouette, expressly not a site render.
    d.ellipse((1190, 290, 1765, 850), fill=(20, 40, 38), outline=(49, 79, 67), width=3)
    base_y = 780
    d.polygon([(1310, 638), (1490, 495), (1684, 638), (1684, 760), (1310, 760)], fill=(32, 53, 48), outline=GREEN)
    d.line((1310, 638, 1490, 495, 1684, 638), fill=GREEN, width=5)
    d.rectangle((1347, 662, 1418, 760), fill=(18, 33, 35), outline=BLUE, width=4)
    d.rectangle((1450, 657, 1514, 710), fill=(35, 67, 72), outline=BLUE, width=4)
    d.rectangle((1561, 657, 1625, 710), fill=(35, 67, 72), outline=BLUE, width=4)
    d.line((1490, 495, 1490, 436), fill=AMBER, width=4)
    d.line((1468, 449, 1513, 449), fill=AMBER, width=4)
    for x, y, scale in [(1230, 690, 1.0), (1710, 690, 0.82), (1268, 770, .72), (1654, 790, .65)]:
        trunk = int(13 * scale)
        h = int(165 * scale)
        d.rectangle((x - trunk // 2, y - h // 5, x + trunk // 2, y + 5), fill=(94, 102, 72))
        for n in range(3):
            top = y - h + n * int(h * .22)
            half = int(49 * scale * (1 - n * .16))
            d.polygon([(x, top), (x - half, top + int(h * .36)), (x + half, top + int(h * .36))], fill=(28, 63, 49))
    text(d, (1490, 890), "VISION ONLY  ·  NOT A SITE RENDER", F.tiny, MUTED, anchor="mm")
    text(d, (114, 892), "$4,800 / RENTABLE ROOM-MONTH", F.subhead, GREEN)
    text(d, (116, 947), "All-in resident bundle  ·  price selected as a working assumption", F.small, MUTED)
    draw_footer(d)


def draw_scene_two(image: Image.Image):
    d = ImageDraw.Draw(image)
    draw_header(d, "Room economics", 0.2)
    text(d, (108, 177), "The resident offer", F.title, INK)
    rounded(d, (108, 258, 740, 880), fill=PANEL, outline=LINE, width=2)
    text(d, (150, 302), "SELECTED WORKING RATE", F.label, AMBER)
    text(d, (143, 376), "$4,800", F.price, INK)
    text(d, (150, 515), "PER RENTABLE ROOM-MONTH", F.label, GREEN)
    d.line((150, 567, 690, 567), fill=LINE, width=2)
    text(d, (150, 602), "ALL-IN RESIDENT BUNDLE", F.label, INK)
    paragraph(d, (150, 650), "Room + lab/program access + defined amenities. Final amenity roster and service scope: TBD.", F.body, 520, MUTED, 12)
    rounded(d, (780, 258, 1812, 518), fill=PANEL_ALT, outline=LINE)
    text(d, (820, 292), "62 BEDROOMS  ·  OWNER SCENARIO", F.label, AMBER)
    cols = [(820, "57", "INTENDED RENTALS", GREEN), (1145, "2", "OWNER BEDROOMS", BLUE), (1450, "3", "UNALLOCATED", AMBER)]
    for x, n, lab, color in cols:
        text(d, (x, 350), n, F.metric, color)
        text(d, (x, 446), lab, F.tiny, INK)
    rounded(d, (780, 548, 1812, 880), fill=PANEL, outline=LINE)
    text(d, (820, 582), "FULL-OCCUPANCY GROSS ROOM-REVENUE POTENTIAL", F.label, AMBER)
    text(d, (820, 642), "57 × $4,800 × 12", F.subhead, INK)
    text(d, (820, 711), "$3,283,200 / YEAR", F.metric, GREEN)
    text(d, (820, 811), "100% occupancy only  ·  before vacancy, costs, taxes, debt, or service expense", F.small, MUTED)
    rounded(d, (108, 908, 1812, 974), radius=18, fill=(31, 56, 49), outline=LINE)
    text(d, (138, 930), "SHARED OCCUPANCY MAY BE CONSIDERED  ·  $4,800 STAYS TOTAL PER ROOM, NOT PER PERSON  ·  CAPACITY TBD", F.tiny, INK)
    draw_footer(d)


def draw_scene_three(image: Image.Image):
    d = ImageDraw.Draw(image)
    draw_header(d, "Lean repeatable plan", 0.4)
    text(d, (108, 177), "One lean, repeatable plan for the whole build", F.title, INK)
    text(d, (112, 244), "Replaces the former cost-unlimited max-house as the active baseline.", F.body, MUTED)
    rounded(d, (108, 318, 1812, 626), fill=PANEL, outline=LINE)
    text(d, (150, 352), "DESIGN TESTS  ·  NOT A FLOOR PLAN OR COSTED LAYOUT", F.label, AMBER)
    cards = [
        (150, "REPEAT", "Standard rental-room module", GREEN),
        (730, "CONSOLIDATE", "Shared service cores", BLUE),
        (1310, "RIGHT-SIZE", "Commons + program spaces", AMBER),
    ]
    for x, heading, detail, color in cards:
        rounded(d, (x, 422, x + 440, 568), fill=PANEL_ALT, outline=(59, 91, 82))
        # Repeating tile motif represents a strategy only, not dimensions or adjacency.
        for j in range(5):
            x0 = x + 27 + j * 47
            d.rounded_rectangle((x0, 444, x0 + 34, 478), radius=5, outline=color, width=2)
        text(d, (x + 27, 496), heading, F.label, color)
        text(d, (x + 27, 534), detail, F.small, INK)
    text(d, (108, 672), "SITE-STEWARDSHIP TARGETS", F.label, AMBER)
    target_cards = [(108, "18%", "DISTURBANCE ENVELOPE"), (681, "210 CY", "GRADING"), (1254, "5", "PONDEROSA RETAINED")]
    for x, value, label in target_cards:
        rounded(d, (x, 722, x + 520, 865), fill=PANEL_ALT, outline=LINE)
        text(d, (x + 30, 753), value, F.subhead, GREEN)
        text(d, (x + 230, 766), label, F.tiny, INK)
    rounded(d, (108, 891, 1812, 969), radius=18, fill=(37, 45, 38), outline=(108, 98, 67))
    text(d, (138, 916), "BERMED WING: TEST AGAINST GRADING, STRUCTURE, DRAINAGE, ENERGY, EGRESS + COST  ·  TARGETS PENDING SURVEY", F.tiny, INK)
    draw_footer(d)


def draw_scene_four(image: Image.Image):
    d = ImageDraw.Draw(image)
    draw_header(d, "Frontier + safety", 0.6)
    text(d, (108, 177), "Frontier capability. Safety-first operations.", F.title, INK)
    rounded(d, (108, 266, 920, 845), fill=PANEL, outline=LINE)
    text(d, (151, 304), "AI CAPABILITY TARGET", F.label, AMBER)
    text(d, (140, 372), "20–50 kW", F.metric, GREEN)
    text(d, (151, 470), "SUSTAINED  ·  TARGET ONLY", F.label, INK)
    # Concept flow: rented compute to demo closet to resident program.
    nodes = [(158, "RENTED / BYO\nCOMPUTE"), (418, "DEMO\nCLOSET"), (678, "RESIDENT\nPROGRAM")]
    for x, label in nodes:
        rounded(d, (x, 565, x + 205, 660), radius=17, fill=PANEL_ALT, outline=(61, 99, 83))
        text(d, (x + 102, 612), label, F.tiny, INK, anchor="mm", spacing=5)
    for x in (371, 631):
        d.line((x, 612, x + 38, 612), fill=GREEN, width=4)
        d.polygon([(x + 38, 604), (x + 53, 612), (x + 38, 620)], fill=GREEN)
    text(d, (151, 713), "No owned GPU plant  ·  No colocation campus", F.small, MUTED)
    rounded(d, (954, 266, 1812, 845), fill=PANEL, outline=LINE)
    text(d, (997, 304), "MEDICAL + AMENITY CONCEPT", F.label, AMBER)
    # Cross mark is only an illustrative category icon.
    rounded(d, (1000, 372, 1084, 456), radius=20, fill=(55, 48, 43), outline=(112, 89, 71))
    d.rectangle((1034, 390, 1050, 438), fill=RED)
    d.rectangle((1018, 406, 1066, 422), fill=RED)
    text(d, (1110, 372), "Emergency-capable", F.subhead, INK)
    text(d, (1110, 420), "medical function", F.body, INK)
    d.line((1000, 493, 1764, 493), fill=LINE, width=2)
    paragraph(d, (1000, 529), "Clinical scope, licensing, staffing, room design, and response: TBD.", F.body, 735, MUTED, 10)
    paragraph(d, (1000, 630), "Commons, wellness, and greenhouse ideas remain concepts. Final amenity roster and operating cost: TBD.", F.body, 735, MUTED, 10)
    rounded(d, (108, 878, 1812, 969), radius=18, fill=(31, 56, 49), outline=LINE)
    text(d, (138, 908), "30+ DAY COHORTS  ·  NO STR  ·  WELLNESS IS NOT MEDICAL TREATMENT", F.label, GREEN)
    draw_footer(d)


def draw_scene_five(image: Image.Image):
    d = ImageDraw.Draw(image)
    draw_header(d, "Proof gates", 0.8)
    text(d, (108, 177), "What must be proved before underwriting", F.title, INK)
    rounded(d, (108, 270, 690, 826), fill=PANEL, outline=LINE)
    text(d, (149, 310), "FUNDING REALITY", F.label, AMBER)
    text(d, (143, 381), "$0", F.price, GREEN)
    text(d, (151, 519), "DISCRETIONARY PROJECT BUDGET", F.tiny, INK)
    d.line((150, 568, 648, 568), fill=LINE, width=2)
    paragraph(d, (150, 603), "No investor, grant, sponsor, or customer commitment is secured.", F.body, 478, MUTED, 12)
    text(d, (150, 738), "LEAN CAPEX  ·  OPEX  ·  CAPITAL ASK: TBD", F.tiny, AMBER)
    rounded(d, (730, 270, 1812, 826), fill=PANEL_ALT, outline=LINE)
    text(d, (772, 310), "EVIDENCE GATES", F.label, AMBER)
    checklist = [
        "Survey, boundary, and legal site access",
        "Zoning, use, and permitted occupancy",
        "Power, water, and wastewater feasibility",
        "Fire/life safety and medical scope",
        "$4,800 bundle, amenity cost, paying demand",
        "Costed, repeatable lean test-fit",
    ]
    y = 367
    for item in checklist:
        d.ellipse((777, y + 3, 807, y + 33), outline=GREEN, width=3)
        d.line((785, y + 18, 793, y + 26), fill=GREEN, width=3)
        d.line((793, y + 26, 801, y + 10), fill=GREEN, width=3)
        text(d, (832, y), item, F.body, INK)
        y += 69
    rounded(d, (108, 858, 1812, 968), radius=20, fill=(37, 45, 38), outline=(108, 98, 67))
    text(d, (960, 912), "The vision is clear. The numbers and permissions are not proven.", F.subhead, INK, anchor="mm")
    draw_footer(d)


SCENE_BUILDERS = [draw_scene_one, draw_scene_two, draw_scene_three, draw_scene_four, draw_scene_five]


def wav_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as w:
        return w.getnframes() / float(w.getframerate())


def join_audio(clips: list[Path], output: Path, gap_seconds: float, final_hold_seconds: float) -> tuple[list[float], float]:
    durations: list[float] = []
    with wave.open(str(clips[0]), "rb") as first:
        channels, sample_width, sample_rate = first.getnchannels(), first.getsampwidth(), first.getframerate()
    silence_frames = int(gap_seconds * sample_rate)
    silence = b"\x00" * silence_frames * channels * sample_width
    with wave.open(str(output), "wb") as out:
        out.setnchannels(channels)
        out.setsampwidth(sample_width)
        out.setframerate(sample_rate)
        for i, path in enumerate(clips):
            with wave.open(str(path), "rb") as src:
                if (src.getnchannels(), src.getsampwidth(), src.getframerate()) != (channels, sample_width, sample_rate):
                    raise ValueError(f"Audio format mismatch: {path}")
                nframes = src.getnframes()
                durations.append(nframes / sample_rate)
                while True:
                    chunk = src.readframes(65536)
                    if not chunk:
                        break
                    out.writeframesraw(chunk)
            if i < len(clips) - 1:
                out.writeframesraw(silence)
        final_frames = int(final_hold_seconds * sample_rate)
        out.writeframesraw(b"\x00" * final_frames * channels * sample_width)
    return durations, sum(durations) + gap_seconds * (len(clips) - 1) + final_hold_seconds


def make_audio_packets(audio_stream, audio_path: Path):
    packets = []
    with av.open(str(audio_path), mode="r") as source:
        input_stream = source.streams.audio[0]
        resampler = av.AudioResampler(format="fltp", layout="mono", rate=44100)
        for frame in source.decode(input_stream):
            for out_frame in resampler.resample(frame):
                packets.extend(audio_stream.encode(out_frame))
        for out_frame in resampler.resample(None):
            packets.extend(audio_stream.encode(out_frame))
    packets.extend(audio_stream.encode(None))
    return packets


def packet_time(packet) -> Fraction:
    stamp = packet.dts if packet.dts is not None else packet.pts
    if stamp is None or packet.time_base is None:
        return Fraction(0, 1)
    return Fraction(stamp) * packet.time_base


def render(output_path: Path, asset_dir: Path, crf: int = 27):
    clips = [asset_dir / filename for filename, _ in CLIPS]
    missing = [str(path) for path in clips if not path.exists()]
    if missing:
        raise FileNotFoundError("Missing narration WAV(s): " + ", ".join(missing))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    track = asset_dir / "investor-cut-voiceover.wav"
    audio_lengths, audio_duration = join_audio(clips, track, GAP_SECONDS, FINAL_HOLD_SECONDS)
    # The visual holds slightly after each spoken segment; the soundtrack gap is the same length.
    durations = [length + GAP_SECONDS for length in audio_lengths[:-1]] + [audio_lengths[-1] + FINAL_HOLD_SECONDS]
    total_duration = sum(durations)
    if abs(total_duration - audio_duration) > 0.02:
        raise AssertionError("Audio/video duration mismatch")
    slide_images: list[Image.Image] = []
    for idx, builder in enumerate(SCENE_BUILDERS):
        img = gradient_background(idx)
        builder(img)
        slide_images.append(img)

    video_container = av.open(str(output_path), mode="w", format="mp4", options={"movflags": "faststart"})
    video_stream = video_container.add_stream("libx264", rate=FPS)
    video_stream.width = WIDTH
    video_stream.height = HEIGHT
    video_stream.pix_fmt = "yuv420p"
    video_stream.bit_rate = 1_450_000
    video_stream.options = {"crf": str(crf), "preset": "medium", "bf": "0", "g": str(FPS * 2)}
    audio_stream = video_container.add_stream("aac", rate=44100)
    audio_stream.layout = "mono"
    audio_stream.bit_rate = 96_000

    video_packets = []
    frame_count = 0
    total_frames = int(math.ceil(total_duration * FPS))
    scene_start = 0.0
    for scene_index, (slide, scene_duration) in enumerate(zip(slide_images, durations)):
        scene_frames = int(round(scene_duration * FPS))
        next_slide = slide_images[scene_index + 1] if scene_index + 1 < len(slide_images) else None
        for local_frame in range(scene_frames):
            t = local_frame / FPS
            frame_image = slide.copy()
            d = ImageDraw.Draw(frame_image)
            # Subtle moving progress cue; the slides themselves stay readable and still.
            global_progress = min(1.0, (frame_count + 1) / max(1, total_frames))
            rail_width = 1704
            d.rounded_rectangle((108, 124, 1812, 130), radius=3, fill=(48, 69, 65))
            d.rounded_rectangle((108, 124, 108 + int(rail_width * global_progress), 130), radius=3, fill=GREEN)
            if next_slide is not None and t >= scene_duration - TRANSITION_SECONDS:
                alpha = min(1.0, (t - (scene_duration - TRANSITION_SECONDS)) / TRANSITION_SECONDS)
                frame_image = Image.blend(frame_image, next_slide, alpha)
            if scene_index == 0 and t < 0.75:
                frame_image = Image.blend(Image.new("RGB", (WIDTH, HEIGHT), DARK), frame_image, min(1.0, t / 0.75))
            if scene_index == len(durations) - 1 and t > scene_duration - 1.0:
                alpha = max(0.0, 1.0 - (t - (scene_duration - 1.0)))
                frame_image = Image.blend(Image.new("RGB", (WIDTH, HEIGHT), DARK), frame_image, alpha)
            frame = av.VideoFrame.from_image(frame_image)
            frame.pts = frame_count
            frame.time_base = Fraction(1, FPS)
            video_packets.extend(video_stream.encode(frame))
            frame_count += 1
        scene_start += scene_duration
    video_packets.extend(video_stream.encode(None))
    audio_packets = make_audio_packets(audio_stream, track)
    # Mux in decode-time order so the MP4 has synchronized, streaming-friendly audio/video.
    for packet in sorted(video_packets + audio_packets, key=lambda p: (packet_time(p), 0 if p.stream.type == "audio" else 1)):
        video_container.mux(packet)
    video_container.close()
    try:
        track.unlink()
    except OSError:
        pass
    print(f"Rendered: {output_path}")
    print(f"Duration: {total_duration:.1f}s ({total_duration / 60:.2f} min), {WIDTH}x{HEIGHT} at {FPS} fps")
    print(f"Audio clips: {', '.join(f'{duration:.1f}s' for duration in audio_lengths)}")
    print(f"Video frames: {frame_count}; H.264 CRF {crf}; AAC mono 96 kb/s")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--assets-dir", type=Path, default=ASSETS)
    parser.add_argument("--crf", type=int, default=27, help="H.264 quality (lower is higher quality; default 27)")
    args = parser.parse_args()
    render(args.output.resolve(), args.assets_dir.resolve(), args.crf)


if __name__ == "__main__":
    main()
