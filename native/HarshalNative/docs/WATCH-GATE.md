# The Human-Key gate — biometrics + Apple Watch, evaluated by the gating formula

**Status:** local demonstration / fail-closed
**Package:** `Packages/HarshalCore` (`GateFormula.swift`)
**Services:** `HarshalNative/Services/WatchGateService.swift`, watch app `HarshalNativeWatch/`

The Human-Key gate ports the browser kernel's legitimacy formula
(`js/kernel.js`) into native iOS/macOS and extends it with two Apple-native
factors: **on-device biometrics** and an **Apple Watch presence witness**.

## The gating formula

Every gated action is evaluated by the pure, deterministic formula in
`HarshalCore.GateFormula`:

```text
L(t) = H · A · R · W · S(t) / S_MAX
Permit ⇔ H = 1 ∧ L(t) ≥ τ ∧ every prerequisite holds
Default: REFUSE (fail-closed)
```

| Factor | Meaning | Native source |
| --- | --- | --- |
| `H` | Human key ∈ {0, 1} | A successful `LocalAuthentication` biometric evaluation (Face ID / Touch ID) in this window. Passcode fallback is policy-configurable. |
| `A` | Addressability/assertion ∈ 0…1 | An active local acknowledgement on this installation (`1`) or none (`0.5`). |
| `R` | Representation ∈ 0…1 | The bounded, labelled purpose for this evaluation (always supplied by the caller). |
| `W` | Watch witness ∈ 0…1 | A fresh watch heartbeat decays on the same freshness clock; a merely reachable watch contributes a bounded partial factor (`0.25`); no watch — or no beat inside δ — contributes `0`, which drives `L` to 0. |
| `S(t)` | Freshness scope | `max(0, 1 − Δt/δ)` since the last successful verification, δ = 240 s (canonical), tunable 30–900 s. |
| `τ` | Legitimacy threshold | 0.5 (canonical), tunable 0.1–0.95. |

The six canonical stages map directly: biometric → Identity+Representation,
local acknowledgement → Authorization context, the freshness window and watch
heartbeat → Continuity, the ledger-recorded evaluation and banner readout →
Accountability, and `GateFormula.evaluate` → the terminal `Decision (Permit |
Refuse)`.

## Apple Watch connectivity

The iOS app and the watchOS companion speak a small, explicit contract,
**`hn-watch-gate-v1`**:

- **Watch → phone, `heartbeat`:** `{schema.kind, humanKey: true, sentAt}`.
  The watch's "Present Human Key" button sends it; the phone replies with the
  current gate state.
- **Phone → watch, application context:** `{state, legitimacy, threshold,
  freshnessSeconds, verifiedAt, updatedAt}` mirrored to the watch face.

`WatchGateService` (iPhone side) owns all evaluation. The watch never decides
anything: a heartbeat is a **presence witness**, never an authorization, and
the watch renders only what the phone's formula decided.

`W` multiplies the formula in **every** policy, so there is no biometric-only
permit path: with no watch link, no paired watch, or no beat inside δ,
`W = 0` ⇒ `L = 0` ⇒ `Refuse`. The policy dial chooses *how* that refusal is
reached and explained, never whether a witness is needed:

- **Off** — no hard witness prerequisite is inserted. The beat still
  multiplies, so a zero witness refuses through τ (`belowThreshold`).
- **Preferred** — identical verdicts; the readout additionally explains a
  missing or stale beat.
- **Required** — a zero witness refuses earlier and explicitly as
  `missingWitness`, before `L` is compared with τ.

On macOS and any other platform where `WCSession.isSupported()` is false there
is no watch link at all, so `W` is permanently 0 and the gate refuses every
evaluation by design. The readout says "no watch link on this platform — no
permit path" instead of pretending a witness exists. That fail-closed choice is
deliberate: on a watchless device, paper orders cannot pass the gate while
"Gate paper orders" is on.

## Honest boundary

- A biometric result is a **local acknowledgement factor**. It is not proof
  of who the human is, not a background check, and not intent screening.
- A watch heartbeat is a **proximity witness**. It is not an approval and
  cannot unlock anything by itself.
- There is **no biometric-only permit path**. A zero witness factor (`W = 0`)
  drives `L` to 0 in every witness policy, so a paired watch running the
  companion app is required — not optional — for any permit. A device with no
  watch (or a watch that never beats) refuses by design.
- The gate currently guards one action: **submitting paper orders** on the
  Markets pane (when "Gate paper orders" is enabled). It grants no authority
  outside this app.
- Every factor and verdict is shown in the Gate readout with its exact
  contribution; refusals state the failing stage in plain language.
- The formula is pure Swift with exhaustive tests
  (`HarshalCoreTests/GateFormulaTests.swift`), including expiry at exactly δ,
  witness weighting crossing below τ, required-witness fail-closed behavior,
  and non-factor clamping.

## Pairing prerequisites (install-time failures)

The watch app cannot be installed unless its bundle identity matches the iOS
app's. Both derive from the single `HARSHAL_BUNDLE_ID` project build setting:

| Value | Source |
| --- | --- |
| iOS / macOS app bundle identifier | `$(HARSHAL_BUNDLE_ID)` |
| Watch app bundle identifier | `$(HARSHAL_BUNDLE_ID).watchkitapp` |
| Watch `Info.plist` `WKCompanionAppBundleIdentifier` | `$(HARSHAL_BUNDLE_ID)` |

Symptoms and causes:

- **`InvalidCompanionAppBundleIdentifier` (MIInstallerErrorDomain 97) at
  install** — the watch `Info.plist` names a different companion than the iOS
  app's bundle identifier. This is what happens when the Bundle Identifier
  field is edited on one target in Xcode's UI: it writes a literal onto that
  target and leaves the others behind. Change `HARSHAL_BUNDLE_ID` instead.
- **Live messaging never arrives (`isReachable` stays false)** — Watch
  Connectivity needs a *paired* watch whose companion app is installed, both
  apps launched at least once, and the watch app in the foreground for
  `sendMessage`; queued beats use `transferUserInfo` and do not need
  reachability, only a launched phone app.

Run `python3 scripts/check_bundle_identifiers.py` after touching any bundle
identifier; it fails loudly when the three values stop agreeing. A clean build
(`Product ▸ Clean Build Folder`) is required after changing them, because the
processed `Info.plist` is cached in DerivedData.

## Files

- `Packages/HarshalCore/Sources/HarshalCore/GateFormula.swift` — the formula and its tests.
- `HarshalNative/Services/WatchGateService.swift` — biometric evaluation, watch session, heartbeat ingest, verdict publication.
- `HarshalNative/OrbSettings.swift` — `MarketsGateSettings` (τ, δ, witness policy, passcode fallback, order gating).
- `HarshalNativeWatch/` — the watchOS companion: gate mirror, legitimacy bar, freshness countdown, heartbeat button.
