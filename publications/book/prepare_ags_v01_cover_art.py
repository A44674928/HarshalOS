#!/usr/bin/env python3
"""Prepare the supplied AGS v0.1 art for a 7.5 x 5 in, 300-dpi cover panel.

The original image stays untouched. The output is a centered 3:2 crop and a
high-quality JPEG derivative; change WIDTH/HEIGHT if the final cover design
uses a different illustration window. Requires Pillow.
"""
from __future__ import annotations

import argparse
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
DEFAULT_SOURCE = ROOT / "../../google_drive/IMG_7067.BMP"
DEFAULT_OUTPUT = ROOT / "ags_v01/assets/AGS-v0.1-IMG_7067-artwork-300dpi.jpg"
OUTPUT_SIZE = (2250, 1500)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", nargs="?", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(args.source) as source:
        rgb = source.convert("RGB")
        width, height = rgb.size
        # Largest centered integer-pixel crop with an exact 3:2 aspect ratio.
        unit = min(width // 3, height // 2)
        if unit < 1:
            raise ValueError(f"Source image too small for a 3:2 crop: {rgb.size}")
        crop_width, crop_height = unit * 3, unit * 2
        left = (width - crop_width) // 2
        top = (height - crop_height) // 2
        rgb = rgb.crop((left, top, left + crop_width, top + crop_height))
        rgb = rgb.resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
        rgb.save(
            args.output,
            "JPEG",
            quality=95,
            subsampling=0,
            optimize=True,
            dpi=(300, 300),
        )

    with Image.open(args.output) as result:
        print({
            "source": str(args.source),
            "source_size": (width, height),
            "crop_size": (crop_width, crop_height),
            "output": str(args.output),
            "output_pixels": result.size,
            "output_dpi": result.info.get("dpi"),
            "output_bytes": args.output.stat().st_size,
        })


if __name__ == "__main__":
    main()
