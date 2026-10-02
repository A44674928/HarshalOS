#!/usr/bin/env python3
"""UTS duration converter and UTC-to-Universal-Date timestamp generator.

UTS defines one Universal Second (US) as the time light takes to travel one
meter in vacuum. Absolute UDate values are expressed as Universal Years (UY)
since the Big Bang, using a deliberately approximate 13.799-billion-Earth-year
anchor at 2026-10-02 00:00:00 UTC. This is a calendar projection, not an
astronomical clock or a trusted system-time source.

Examples:
    python3 uts_generator.py
    python3 uts_generator.py --date '2026-10-02 16:32:16Z'
    python3 uts_generator.py --file report.md --format replace
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from decimal import Decimal, getcontext
import os
import re
import sys

getcontext().prec = 40

# Exact SI speed of light, by definition.
C = 299_792_458
US_PER_EARTH_SECOND = C
EARTH_SECONDS_PER_JULIAN_YEAR = 31_557_600  # 365.25 × 86,400

# UTS units, all expressed in Universal Seconds (US).
US_PER_UM = 60
US_PER_UH = 60 * US_PER_UM
US_PER_UDAY = 24 * US_PER_UH
US_PER_UY = 365.25 * US_PER_UDAY

# Explicit, approximate cosmological calibration point. Earth time is Julian.
UNIVERSE_AGE_EARTH_YEARS_AT_REFERENCE = Decimal("13799000000")
REFERENCE_UTC = datetime(2026, 10, 2, 0, 0, 0, tzinfo=timezone.utc)

_GENERATED_HEADER = re.compile(
    r"\A---\nUTS Timestamp:.*?\nEarth Time:.*?\nUTS Model:.*?\n---\n*",
    re.DOTALL,
)


def as_utc(earth_datetime: datetime) -> datetime:
    """Normalize a datetime to UTC; naive inputs are explicitly treated as UTC."""
    if earth_datetime.tzinfo is None:
        earth_datetime = earth_datetime.replace(tzinfo=timezone.utc)
    return earth_datetime.astimezone(timezone.utc)


def calculate_years_since_big_bang(earth_datetime: datetime) -> Decimal:
    """Return the model's Universal-Date coordinate in Earth Julian years."""
    instant = as_utc(earth_datetime)
    seconds_offset = Decimal(str((instant - REFERENCE_UTC).total_seconds()))
    years_offset = seconds_offset / Decimal(EARTH_SECONDS_PER_JULIAN_YEAR)
    return UNIVERSE_AGE_EARTH_YEARS_AT_REFERENCE + years_offset


def calculate_uts_from_earth(earth_datetime: datetime) -> dict[str, object]:
    """Convert a UTC instant to the UTS duration-unit breakdown and UDate.

    The absolute date is represented by ``udate_uy`` (Universal Years since the
    Big Bang). ``uday`` means the duration unit Universal Day; it is never used
    as a second spelling for an absolute date.
    """
    instant = as_utc(earth_datetime)
    earth_years_since_origin = calculate_years_since_big_bang(instant)
    udate_uy = earth_years_since_origin * Decimal(C)
    uday = udate_uy * Decimal("365.25")
    uh = uday * Decimal(24)
    um = uh * Decimal(60)
    us = um * Decimal(60)
    earth_seconds_since_origin = earth_years_since_origin * Decimal(EARTH_SECONDS_PER_JULIAN_YEAR)

    return {
        "earth_datetime": instant,
        "earth_years_since_big_bang": earth_years_since_origin,
        "udate_uy": udate_uy,
        "uday": uday,
        "uh": uh,
        "um": um,
        "us": us,
        "earth_seconds_since_big_bang": earth_seconds_since_origin,
    }


def format_uts_timestamp(uts_data: dict[str, object], precision: str = "full") -> str:
    """Format a modeled absolute date alongside its Earth UTC representation."""
    instant = as_utc(uts_data["earth_datetime"])  # type: ignore[arg-type]
    udate = uts_data["udate_uy"]
    assert isinstance(udate, Decimal)
    if precision == "date":
        return f"UDate {udate:.6f} UY since Big Bang ({instant:%Y-%m-%d} UTC)"
    if precision == "compact":
        return f"UDate {udate:.6f} UY"
    return f"UDate {udate:.6f} UY since Big Bang ({instant:%Y-%m-%d %H:%M:%S} UTC)"


def earth_to_uts(earth_seconds: int | float | Decimal) -> dict[str, Decimal]:
    """Convert an Earth-time duration in seconds into the UTS duration units."""
    seconds = Decimal(str(earth_seconds))
    us = seconds * Decimal(US_PER_EARTH_SECOND)
    return {
        "US": us,
        "UM": us / Decimal(US_PER_UM),
        "UH": us / Decimal(US_PER_UH),
        "UDay": us / Decimal(US_PER_UDAY),
        "UY": us / Decimal(US_PER_UY),
    }


def uts_to_earth(us: int | float | Decimal) -> dict[str, Decimal]:
    """Convert Universal Seconds into an Earth-time duration breakdown."""
    universal_seconds = Decimal(str(us))
    seconds = universal_seconds / Decimal(US_PER_EARTH_SECOND)
    minutes = seconds / Decimal(60)
    hours = minutes / Decimal(60)
    days = hours / Decimal(24)
    years = days / Decimal("365.25")
    return {
        "seconds": seconds,
        "minutes": minutes,
        "hours": hours,
        "days": days,
        "years": years,
    }


def timestamp_file(filepath: str, output_format: str = "append") -> bool:
    """Timestamp a UTF-8 text file using its UTC modification time.

    ``replace`` updates a generated UTS front-matter block if present; if there
    is no generated block, it prepends one. It never rewrites arbitrary prose.
    """
    if not os.path.isfile(filepath):
        print(f"Error: File not found: {filepath}", file=sys.stderr)
        return False

    mod_time = datetime.fromtimestamp(os.path.getmtime(filepath), tz=timezone.utc)
    data = calculate_uts_from_earth(mod_time)
    timestamp = format_uts_timestamp(data)
    header = (
        "---\n"
        f"UTS Timestamp: {timestamp}\n"
        f"Earth Time: {mod_time:%Y-%m-%d %H:%M:%S} UTC\n"
        "UTS Model: approximate 13.799-billion-Julian-year age anchor; UTC projected\n"
        "---\n\n"
    )

    with open(filepath, "r", encoding="utf-8") as stream:
        content = stream.read()

    if output_format == "replace":
        new_content, replacements = _GENERATED_HEADER.subn(header, content, count=1)
        if replacements == 0:
            new_content = header + content
    elif output_format == "prepend":
        new_content = header + content
    else:
        new_content = content.rstrip() + (
            "\n\n---\n"
            f"Last Updated (UTS): {timestamp}\n"
            f"Last Updated (Earth): {mod_time:%Y-%m-%d %H:%M:%S} UTC\n"
            "---\n"
        )

    with open(filepath, "w", encoding="utf-8") as stream:
        stream.write(new_content)

    print(f"Timestamped: {filepath}")
    print(f"  UTS: {timestamp}")
    return True


def parse_utc(value: str) -> datetime:
    """Parse an ISO date/time; date-only and offset-free values mean UTC."""
    normalized = value.strip()
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(
            "Use ISO format YYYY-MM-DD[ HH:MM:SS][Z|±HH:MM]."
        ) from exc
    return as_utc(parsed)


def print_breakdown(instant: datetime, precision: str) -> None:
    data = calculate_uts_from_earth(instant)
    print("UNIVERSAL TIMEKEEPING SYSTEM · MODELLED UTC PROJECTION")
    print("=" * 68)
    print(f"Earth UTC:     {instant:%Y-%m-%d %H:%M:%S}")
    print(f"UTS timestamp: {format_uts_timestamp(data, precision)}")
    print("\nDuration-unit breakdown at this absolute date:")
    print(f"  UDate (UY):  {data['udate_uy']:.6f} UY since Big Bang")
    print(f"  UDay:        {data['uday']:.6f}")
    print(f"  UH:          {data['uh']:.6f}")
    print(f"  UM:          {data['um']:.6f}")
    print(f"  US:          {data['us']:.6f}")
    print("\nModel note: epoch age is approximate; the Earth clock is the supplied UTC time.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert durations and project Earth UTC timestamps into UTS."
    )
    parser.add_argument("--date", "-d", type=parse_utc,
                        help="ISO date/time; an omitted timezone is treated as UTC")
    parser.add_argument("--file", "-f", help="Add a UTS timestamp to a UTF-8 text file")
    parser.add_argument("--precision", "-p", choices=["full", "date", "compact"], default="full")
    parser.add_argument("--format", choices=["append", "prepend", "replace"], default="append")
    parser.add_argument("--current", "-c", action="store_true", help="Show current UTC and UTS projection")
    args = parser.parse_args()

    if args.date is not None or args.current or not args.file:
        instant = args.date if args.date is not None else datetime.now(timezone.utc)
        print_breakdown(instant, args.precision)
    if args.file and not timestamp_file(args.file, args.format):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
