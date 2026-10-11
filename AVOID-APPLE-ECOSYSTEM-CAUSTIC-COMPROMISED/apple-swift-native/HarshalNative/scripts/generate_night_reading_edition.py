#!/usr/bin/env python3
"""Build the AGS v0.2 Night Reading Edition from the exact published PDF.

This is intentionally a presentation-only derivative builder. It never changes
or replaces the production KDP interior. The resulting PDF retains the source
page geometry, selectable text, navigation, links, and 548-page correspondence,
while adding a black page underlay and remapping the source's four vector color
values to the HarshalOS electric-blue palette.

Prerequisite (kept outside the Swift app runtime):
    python3 -m pip install pymupdf==1.24.14

Run from any working directory:
    python3 native/HarshalNative/scripts/generate_night_reading_edition.py

Use --verify to validate the checked-in derivative and its provenance manifest
without regenerating it.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import fitz  # PyMuPDF
except ImportError as error:  # pragma: no cover - exercised by release tooling
    raise SystemExit(
        "PyMuPDF is required. Install it with: python3 -m pip install pymupdf"
    ) from error


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
SOURCE_PATH = REPOSITORY_ROOT / "publications/book/AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-interior-2026-10-07.pdf"
OUTPUT_PATH = REPOSITORY_ROOT / "publications/book/AGS-v0.2-Harshal-s-Systems-Night-Reading-Edition-2026-10-10.pdf"
MANIFEST_PATH = REPOSITORY_ROOT / "publications/book/AGS-v0.2-Harshal-s-Systems-Night-Reading-Edition-2026-10-10.provenance.json"

SOURCE_SHA256 = "6c67feae3881c11bab8e2654e1f58d23aabbbb1dfdcd536464218c2bbf839823"
PAGE_COUNT = 548
PYMUPDF_VERSION = "1.24.14"
TEXT_SHA256_ALGORITHM = "SHA-256 of UTF-8 text extracted from each page in page order, joined with a NUL separator"

# These values correspond to the only source colors used by the KDP interior.
# Text remains high-contrast electric blue. The light table fill maps to a
# distinct navy surface rather than disappearing into the black page underlay.
COLOR_REPLACEMENTS: dict[bytes, bytes] = {
    b"0 0 0 rg": b"0 0.690196 1 rg",  # black fill -> #00B0FF electric blue
    b".066667 .066667 .066667 rg": b"0.10 0.735 1 rg",  # near-black heading
    b".333333 .333333 .333333 rg": b"0.33 0.63 0.85 rg",  # muted detail
    b".905882 .921569 .941176 rg": b"0.012 0.031 0.071 rg",  # pale table fill -> navy
    b"0 0 0 RG": b"0 0.690196 1 RG",  # black stroke -> electric blue
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def validate_generator_version() -> None:
    if fitz.VersionBind != PYMUPDF_VERSION:
        raise ValueError(
            "Refusing to generate an artifact with an unpinned PyMuPDF version. "
            f"Expected {PYMUPDF_VERSION}; found {fitz.VersionBind}."
        )


def text_sha256(document: fitz.Document) -> str:
    digest = hashlib.sha256()
    for page in document:
        digest.update(page.get_text("text").encode("utf-8"))
        digest.update(b"\0")
    return digest.hexdigest()


def link_count(document: fitz.Document) -> int:
    return sum(len(page.get_links()) for page in document)


def validate_source(document: fitz.Document, path: Path) -> None:
    source_digest = sha256(path)
    if source_digest != SOURCE_SHA256:
        raise ValueError(
            "Refusing to derive a night edition: the input does not match the "
            f"published source SHA-256. Expected {SOURCE_SHA256}; got {source_digest}."
        )
    if document.page_count != PAGE_COUNT:
        raise ValueError(
            "Refusing to derive a night edition: the input has "
            f"{document.page_count} pages, expected {PAGE_COUNT}."
        )


def update_page_colors(document: fitz.Document, page: fitz.Page) -> dict[str, int]:
    replacement_counts = {key.decode("ascii"): 0 for key in COLOR_REPLACEMENTS}
    for xref in page.get_contents():
        stream = document.xref_stream(xref)
        for source, replacement in COLOR_REPLACEMENTS.items():
            occurrences = stream.count(source)
            replacement_counts[source.decode("ascii")] += occurrences
            if occurrences:
                stream = stream.replace(source, replacement)
        document.update_stream(xref, stream)

    # `overlay=False` puts the rectangle beneath the preserved source stream.
    # It is deliberately added after the replacements, so its black fill stays
    # black and never becomes blue.
    page.draw_rect(page.rect, color=None, fill=(0, 0, 0), overlay=False)
    return replacement_counts


def build_manifest(
    *,
    source_text_digest: str,
    source_link_count: int,
    output_text_digest: str,
    output_link_count: int,
    output_digest: str,
    replacement_counts: dict[str, int],
) -> dict[str, Any]:
    return {
        "schema": "harshalos.night-reading-edition.provenance.v1",
        "classification": "PRESENTATION_ONLY_DERIVATIVE",
        "title": "AGS v0.2: Harshal’s Systems — Night Reading Edition",
        "artifact": OUTPUT_PATH.relative_to(REPOSITORY_ROOT).as_posix(),
        "artifactSHA256": output_digest,
        "source": {
            "artifact": SOURCE_PATH.relative_to(REPOSITORY_ROOT).as_posix(),
            "sha256": SOURCE_SHA256,
            "pageCount": PAGE_COUNT,
        },
        "continuityChecks": {
            "textSHA256Algorithm": TEXT_SHA256_ALGORITHM,
            "sourceTextSHA256": source_text_digest,
            "derivativeTextSHA256": output_text_digest,
            "sourceLinkCount": source_link_count,
            "derivativeLinkCount": output_link_count,
            "pageCount": PAGE_COUNT,
        },
        "visualTransform": {
            "background": "#000000",
            "primaryText": "#00B0FF",
            "secondaryText": "#54A1D9",
            "surface": "#030812",
            "method": "Preserved vector PDF content streams with a black underlay and source-color remapping; no source prose, page geometry, font program, link, outline, or page order is rewritten.",
            "colorReplacements": replacement_counts,
        },
        "boundary": "This is an optional local reading presentation. It is not the exact KDP publication artifact, does not supersede it, and does not establish a new source, evidence, authorization, or runtime capability.",
        "generator": {
            "script": "native/HarshalNative/scripts/generate_night_reading_edition.py",
            "pymupdf": fitz.VersionBind,
            "requiredPyMuPDF": PYMUPDF_VERSION,
            "generatedAtUTC": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        },
    }


def read_manifest() -> dict[str, Any]:
    if not MANIFEST_PATH.exists():
        raise ValueError(f"Provenance manifest is missing: {MANIFEST_PATH}")
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def verify() -> None:
    if not SOURCE_PATH.exists() or not OUTPUT_PATH.exists():
        raise ValueError("Both the published source and Night Reading Edition must be present.")

    manifest = read_manifest()
    if sha256(SOURCE_PATH) != SOURCE_SHA256:
        raise ValueError("The published source checksum does not match the recorded source artifact.")
    if sha256(OUTPUT_PATH) != manifest.get("artifactSHA256"):
        raise ValueError("The Night Reading Edition checksum does not match its provenance manifest.")

    source = fitz.open(SOURCE_PATH)
    derivative = fitz.open(OUTPUT_PATH)
    try:
        validate_source(source, SOURCE_PATH)
        if derivative.page_count != PAGE_COUNT:
            raise ValueError("The Night Reading Edition page count does not preserve source correspondence.")
        continuity = manifest.get("continuityChecks", {})
        if text_sha256(source) != continuity.get("sourceTextSHA256"):
            raise ValueError("The published source text no longer matches the recorded continuity digest.")
        if text_sha256(derivative) != continuity.get("derivativeTextSHA256"):
            raise ValueError("The Night Reading Edition text does not match the recorded continuity digest.")
        if continuity.get("sourceTextSHA256") != continuity.get("derivativeTextSHA256"):
            raise ValueError("The derivative text continuity digest does not match the published source.")
        if link_count(source) != continuity.get("sourceLinkCount"):
            raise ValueError("The published source link count does not match the recorded continuity count.")
        if link_count(derivative) != continuity.get("derivativeLinkCount"):
            raise ValueError("The derivative link count does not match the recorded continuity count.")
        if continuity.get("sourceLinkCount") != continuity.get("derivativeLinkCount"):
            raise ValueError("The derivative link count does not match the published source.")
    finally:
        source.close()
        derivative.close()

    print(
        "Verified Night Reading Edition: "
        f"{PAGE_COUNT} pages, source/text/link continuity intact, SHA-256 "
        f"{manifest['artifactSHA256']}."
    )


def build(force: bool) -> None:
    validate_generator_version()
    if not SOURCE_PATH.exists():
        raise ValueError(f"Published source is missing: {SOURCE_PATH}")
    if OUTPUT_PATH.exists() and not force:
        raise ValueError(
            f"Refusing to overwrite existing derivative: {OUTPUT_PATH}. Use --force after review."
        )

    source = fitz.open(SOURCE_PATH)
    try:
        validate_source(source, SOURCE_PATH)
        source_text_digest = text_sha256(source)
        source_link_count = link_count(source)

        # Work from a byte-for-byte copy so bookmarks, text, link annotations,
        # embedded fonts, and the published page map remain in place.
        with tempfile.TemporaryDirectory(prefix="harshal-night-reading-") as temporary_directory:
            working_path = Path(temporary_directory) / OUTPUT_PATH.name
            shutil.copy2(SOURCE_PATH, working_path)
            derivative = fitz.open(working_path)
            try:
                replacement_counts = {key.decode("ascii"): 0 for key in COLOR_REPLACEMENTS}
                for index, page in enumerate(derivative):
                    counts = update_page_colors(derivative, page)
                    for color, count in counts.items():
                        replacement_counts[color] += count
                    if (index + 1) % 100 == 0 or index + 1 == derivative.page_count:
                        print(f"Transformed page {index + 1} of {derivative.page_count}.")

                metadata = dict(derivative.metadata)
                metadata.update(
                    {
                        "title": "AGS v0.2: Harshal’s Systems — Night Reading Edition",
                        "subject": "Black-and-electric-blue presentation-only reading derivative of the published AGS v0.2 KDP interior.",
                        "keywords": "AGS v0.2, Harshal’s Systems, Night Reading Edition, presentation-only derivative, electric blue, black",
                        "creator": "HarshalOS night-reading derivative generator",
                        "producer": "PyMuPDF",
                        "creationDate": "D:20261010000000-07'00'",
                        "modDate": "D:20261010000000-07'00'",
                    }
                )
                derivative.set_metadata(metadata)
                derivative.save(
                    working_path.with_suffix(".generated.pdf"),
                    garbage=4,
                    deflate=True,
                    clean=False,
                    no_new_id=True,
                )
            finally:
                derivative.close()

            generated_path = working_path.with_suffix(".generated.pdf")
            generated = fitz.open(generated_path)
            try:
                if generated.page_count != PAGE_COUNT:
                    raise ValueError("Generated derivative lost the source page correspondence.")
                output_text_digest = text_sha256(generated)
                output_link_count = link_count(generated)
                if output_text_digest != source_text_digest:
                    raise ValueError("Generated derivative changed extracted source text; refusing to publish it.")
                if output_link_count != source_link_count:
                    raise ValueError("Generated derivative changed source links; refusing to publish it.")
            finally:
                generated.close()

            staged_output = working_path.with_suffix(".staged.pdf")
            shutil.copy2(generated_path, staged_output)
            output_digest = sha256(staged_output)
            manifest = build_manifest(
                source_text_digest=source_text_digest,
                source_link_count=source_link_count,
                output_text_digest=output_text_digest,
                output_link_count=output_link_count,
                output_digest=output_digest,
                replacement_counts=replacement_counts,
            )

            OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
            manifest_staged = Path(temporary_directory) / MANIFEST_PATH.name
            manifest_staged.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            os.replace(staged_output, OUTPUT_PATH)
            os.replace(manifest_staged, MANIFEST_PATH)
    finally:
        source.close()

    print(f"Wrote {OUTPUT_PATH.relative_to(REPOSITORY_ROOT)}")
    print(f"SHA-256: {sha256(OUTPUT_PATH)}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="replace an existing derivative after rebuilding it")
    parser.add_argument("--verify", action="store_true", help="verify the checked-in derivative and manifest without building")
    arguments = parser.parse_args()

    try:
        if arguments.verify:
            verify()
        else:
            build(arguments.force)
    except (OSError, ValueError, fitz.FileDataError) as error:
        raise SystemExit(f"Night Reading Edition failed closed: {error}") from error


if __name__ == "__main__":
    main()
