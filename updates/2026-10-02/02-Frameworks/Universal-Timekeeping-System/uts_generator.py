#!/usr/bin/env python3
"""
Universal Timekeeping System (UTS) Timestamp Generator

Converts Earth time to UTS format for timestamping documents.
Based on the Universal Timekeeping System specification from Harshal's Systems.

Usage:
    python3 uts_generator.py                    # Current UTS time
    python3 uts_generator.py --date 2026-10-02  # Specific date
    python3 uts_generator.py --file document.md # Timestamp a file
"""

import argparse
import datetime
import os
import sys

# ============================================================================
# UTS CONSTANTS
# ============================================================================

# Speed of light in m/s (exact, by definition since 1983)
C = 299792458

# UTS Unit Definitions (in US)
US_PER_SECOND = C
US_PER_MINUTE = 60 * US_PER_SECOND
US_PER_HOUR = 60 * US_PER_MINUTE
US_PER_DAY = 24 * US_PER_HOUR
US_PER_YEAR = 365.25 * US_PER_DAY  # Accounting for leap years

# Earth time constants
SECONDS_PER_MINUTE = 60
MINUTES_PER_HOUR = 60
HOURS_PER_DAY = 24
DAYS_PER_YEAR = 365.25

# ============================================================================
# UTS ORIGIN CONFIGURATION
# ============================================================================

# Age of the universe in years (approximate)
# Using 13.799 billion years based on current cosmological estimates
UNIVERSE_AGE_YEARS = 13799000000.0  # 13.799 billion

# Reference point: On 2026-10-02, universe age = 13.799 billion years
# This allows us to calculate UD for any date
REFERENCE_YEAR = 2026
REFERENCE_MONTH = 10
REFERENCE_DAY = 2


def calculate_years_since_big_bang(earth_datetime):
    """
    Calculate approximate years since Big Bang for a given Earth datetime.
    
    This uses a simplified linear model where:
    - On 2026-10-02, universe is 13.799 billion years old
    - Each Earth year = 1 year of universe age
    
    For precise cosmological calculations, we'd need to account for:
    - Expanding universe metrics
    - Cosmic microwave background data
    - Hubble constant variations
    
    But for UTS purposes, this linear approximation is sufficient.
    """
    # Calculate difference from reference date
    ref_date = datetime.datetime(REFERENCE_YEAR, REFERENCE_MONTH, REFERENCE_DAY)
    
    if earth_datetime >= ref_date:
        # Date is after reference
        delta = earth_datetime - ref_date
        years_offset = delta.total_seconds() / (DAYS_PER_YEAR * 24 * 60 * 60)
        years_since_big_bang = UNIVERSE_AGE_YEARS + years_offset
    else:
        # Date is before reference
        delta = ref_date - earth_datetime
        years_offset = delta.total_seconds() / (DAYS_PER_YEAR * 24 * 60 * 60)
        years_since_big_bang = UNIVERSE_AGE_YEARS - years_offset
    
    return years_since_big_bang


def calculate_uts_from_earth(earth_datetime):
    """
    Calculate UTS values from Earth datetime.
    
    Returns dictionary with all UTS units and formatted timestamp.
    """
    # Calculate years since Big Bang
    uy = calculate_years_since_big_bang(earth_datetime)
    
    # UTS Units (all derived from UY)
    ud = uy * DAYS_PER_YEAR
    uh = ud * HOURS_PER_DAY
    um = uh * MINUTES_PER_HOUR
    us = um * SECONDS_PER_MINUTE
    
    # Earth time equivalents (same as UTS in this context)
    earth_years = uy
    earth_days = ud
    earth_hours = uh
    earth_minutes = um
    earth_seconds = us / US_PER_SECOND
    
    return {
        'earth_datetime': earth_datetime,
        'uy': uy,
        'ud': ud,
        'uh': uh,
        'um': um,
        'us': us,
        'earth_years': earth_years,
        'earth_days': earth_days,
        'earth_hours': earth_hours,
        'earth_minutes': earth_minutes,
        'earth_seconds': earth_seconds
    }


def format_uts_timestamp(uts_data, precision='full'):
    """
    Format UTS data as a human-readable timestamp.
    """
    dt = uts_data['earth_datetime']
    
    if precision == 'full':
        # Full precision with all units
        timestamp = f"UTS: {dt.strftime('%Y-%m-%d %H:%M:%S')} UTC (UD {uts_data['ud']:.6f})"
    elif precision == 'date':
        timestamp = f"UTS: {dt.strftime('%Y-%m-%d')} (UD {uts_data['ud']:.2f})"
    elif precision == 'compact':
        timestamp = f"UD {uts_data['ud']:.6f}"
    else:
        timestamp = f"UD {uts_data['ud']:.6f}"
    
    return timestamp


def earth_to_uts(earth_seconds):
    """
    Convert Earth seconds (Unix timestamp) to UTS breakdown.
    
    Note: This is a pure conversion without Big Bang offset.
    For full UTS timestamps, use calculate_uts_from_earth().
    """
    us = earth_seconds * US_PER_SECOND
    um = us / US_PER_MINUTE
    uh = us / US_PER_HOUR
    ud = us / US_PER_DAY
    uy = us / US_PER_YEAR
    
    return {
        'US': us,
        'UM': um,
        'UH': uh,
        'UD': ud,
        'UY': uy
    }


def uts_to_earth(us):
    """
    Convert US to Earth time breakdown.
    
    Note: This is a pure conversion without Big Bang offset.
    """
    seconds = us / US_PER_SECOND
    minutes = seconds / SECONDS_PER_MINUTE
    hours = minutes / MINUTES_PER_HOUR
    days = hours / HOURS_PER_DAY
    years = days / DAYS_PER_YEAR
    
    return {
        'seconds': seconds,
        'minutes': minutes,
        'hours': hours,
        'days': days,
        'years': years
    }


def timestamp_file(filepath, output_format='append'):
    """
    Add UTS timestamp to a file.
    
    Args:
        filepath: Path to the file to timestamp
        output_format: 'append', 'prepend', or 'replace'
    """
    if not os.path.exists(filepath):
        print(f"Error: File not found: {filepath}")
        return False
    
    # Get file modification time
    mod_time = datetime.datetime.fromtimestamp(os.path.getmtime(filepath))
    
    # Calculate UTS
    uts_data = calculate_uts_from_earth(mod_time)
    timestamp = format_uts_timestamp(uts_data)
    
    # Read file content
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Create timestamp header
    header = f"""---
UTS Timestamp: {timestamp}
Earth Time: {mod_time.strftime('%Y-%m-%d %H:%M:%S UTC')}
---

"""
    
    # Write based on format
    if output_format == 'prepend':
        new_content = header + content
    elif output_format == 'replace':
        # Find first existing timestamp and replace
        new_content = content  # For now, just prepend
        new_content = header + content
    else:  # append
        new_content = content + f"\n\n---\nLast Updated (UTS): {timestamp}\nLast Updated (Earth): {mod_time.strftime('%Y-%m-%d %H:%M:%S UTC')}\n---\n"
    
    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"Timestamped: {filepath}")
    print(f"  UTS: {timestamp}")
    return True


def main():
    parser = argparse.ArgumentParser(
        description='Universal Timekeeping System (UTS) Timestamp Generator',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 uts_generator.py                    # Current UTS time
  python3 uts_generator.py --date 2026-10-02  # Specific date
  python3 uts_generator.py --file doc.md      # Timestamp a file
        """
    )
    
    parser.add_argument(
        '--date', '-d',
        type=str,
        help='Date to convert (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)'
    )
    
    parser.add_argument(
        '--file', '-f',
        type=str,
        help='File to add UTS timestamp to'
    )
    
    parser.add_argument(
        '--precision', '-p',
        choices=['full', 'date', 'compact'],
        default='full',
        help='Timestamp precision (default: full)'
    )
    
    parser.add_argument(
        '--format',
        choices=['append', 'prepend', 'replace'],
        default='append',
        help='How to add timestamp to file (default: append)'
    )
    
    parser.add_argument(
        '--current', '-c',
        action='store_true',
        help='Show current UTS time'
    )
    
    args = parser.parse_args()
    
    # If no arguments, show current time
    if not any(vars(args).values()):
        args.current = True
    
    if args.current or args.date:
        if args.date:
            try:
                if ' ' in args.date:
                    dt = datetime.datetime.strptime(args.date, '%Y-%m-%d %H:%M:%S')
                else:
                    dt = datetime.datetime.strptime(args.date, '%Y-%m-%d')
            except ValueError:
                print(f"Error: Invalid date format. Use YYYY-MM-DD or YYYY-MM-DD HH:MM:SS")
                sys.exit(1)
        else:
            dt = datetime.datetime.utcnow()
        
        uts_data = calculate_uts_from_earth(dt)
        timestamp = format_uts_timestamp(uts_data, args.precision)
        
        print("=" * 70)
        print("UNIVERSAL TIMEKEEPING SYSTEM TIMESTAMP")
        print("=" * 70)
        print(f"\nEarth Time (UTC): {dt.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"UTS Timestamp:    {timestamp}")
        print(f"\nDetailed Breakdown:")
        print(f"  Universal Years (UY):  {uts_data['uy']:.6f}")
        print(f"  Universal Days (UD):   {uts_data['ud']:.6f}")
        print(f"  Universal Hours (UH):  {uts_data['uh']:.6f}")
        print(f"  Universal Minutes (UM): {uts_data['um']:.6f}")
        print(f"  Universal Seconds (US): {uts_data['us']:.6f}")
        print(f"\nEarth Equivalents:")
        print(f"  Years:  {uts_data['earth_years']:.6f}")
        print(f"  Days:   {uts_data['earth_days']:.6f}")
        print(f"  Hours:  {uts_data['earth_hours']:.6f}")
        print(f"  Minutes: {uts_data['earth_minutes']:.6f}")
        print(f"  Seconds: {uts_data['earth_seconds']:.6f}")
        print("=" * 70)
    
    if args.file:
        if not os.path.exists(args.file):
            print(f"Error: File not found: {args.file}")
            sys.exit(1)
        
        timestamp_file(args.file, args.format)
    
    if not (args.current or args.date or args.file):
        # Default: show current time
        dt = datetime.datetime.utcnow()
        uts_data = calculate_uts_from_earth(dt)
        timestamp = format_uts_timestamp(uts_data)
        print(f"UTS: {timestamp}")


if __name__ == '__main__':
    main()
