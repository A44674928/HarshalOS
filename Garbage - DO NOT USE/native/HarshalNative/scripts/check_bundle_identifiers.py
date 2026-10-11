#!/usr/bin/env python3
"""Verify the app, watch, and companion bundle identifiers cannot drift apart.

Installing an iOS app that embeds a watch app fails with
`InvalidCompanionAppBundleIdentifier` (MIInstallerErrorDomain, code 97) when the
watch app's `WKCompanionAppBundleIdentifier` does not match the iOS app's bundle
identifier exactly. All three values derive from the single project build
setting `HARSHAL_BUNDLE_ID`:

    iOS app / macOS app  ->  $(HARSHAL_BUNDLE_ID)
    watch app            ->  $(HARSHAL_BUNDLE_ID).watchkitapp
    watch Info.plist     ->  $(HARSHAL_BUNDLE_ID)

Run from anywhere; exits non-zero and prints what disagrees on a mismatch.

    python3 native/HarshalNative/scripts/check_bundle_identifiers.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

NATIVE = Path(__file__).resolve().parent.parent
PBXPROJ = NATIVE / "HarshalNative.xcodeproj" / "project.pbxproj"
WATCH_PLIST = NATIVE / "HarshalNativeWatch" / "Info.plist"

failures: list[str] = []


def read() -> tuple[str, str]:
    try:
        return PBXPROJ.read_text(), WATCH_PLIST.read_text()
    except OSError as error:
        print(f"cannot read project files: {error}")
        sys.exit(2)


def main() -> int:
    pbx, plist = read()

    definitions = sorted(set(re.findall(r'HARSHAL_BUNDLE_ID = ([^;]+);', pbx)))
    if len(definitions) != 1:
        failures.append(
            "expected exactly one agreed HARSHAL_BUNDLE_ID value, found "
            f"{definitions or 'none'} — the Debug and Release configurations must match"
        )
    base = definitions[0].strip('"') if definitions else ""

    product_ids = re.findall(r'PRODUCT_BUNDLE_IDENTIFIER = ("?)([^";]+)\1;', pbx)
    values = [value for _, value in product_ids]
    if not values:
        failures.append("no PRODUCT_BUNDLE_IDENTIFIER settings found in project.pbxproj")

    app_ids = [v for v in values if not v.endswith(".watchkitapp")]
    watch_ids = [v for v in values if v.endswith(".watchkitapp")]

    for value in app_ids:
        if value != "$(HARSHAL_BUNDLE_ID)":
            failures.append(
                f"app bundle identifier {value!r} does not derive from $(HARSHAL_BUNDLE_ID)"
            )
    for value in watch_ids:
        if value != "$(HARSHAL_BUNDLE_ID).watchkitapp":
            failures.append(
                f"watch bundle identifier {value!r} does not derive from $(HARSHAL_BUNDLE_ID).watchkitapp"
            )

    if not watch_ids:
        failures.append("no watch target bundle identifier found")

    companion = re.search(
        r"<key>WKCompanionAppBundleIdentifier</key>\s*<string>([^<]+)</string>", plist
    )
    if companion is None:
        failures.append("watch Info.plist has no WKCompanionAppBundleIdentifier")
    elif companion.group(1) != "$(HARSHAL_BUNDLE_ID)":
        failures.append(
            "watch Info.plist WKCompanionAppBundleIdentifier is "
            f"{companion.group(1)!r}; it must be $(HARSHAL_BUNDLE_ID) so it always "
            "matches the iOS app"
        )

    print(f"HARSHAL_BUNDLE_ID            {base or '(unset)'}")
    print(f"iOS / macOS app identifier   {base}")
    print(f"watch app identifier         {base}.watchkitapp")
    print(f"watch WKCompanionAppBundle…  {base}")

    if failures:
        print("\nFAIL")
        for failure in failures:
            print(f"  - {failure}")
        return 1
    print("\nOK — the three identifiers resolve to the same pairing")
    return 0


if __name__ == "__main__":
    sys.exit(main())
