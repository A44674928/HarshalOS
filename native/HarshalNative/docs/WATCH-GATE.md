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
| `W` | Watch witness ∈ 0…1 | A fresh watch heartbeat decays on the same freshness clock; a merely reachable watch contributes a bounded partial factor; no watch contributes 0. |
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
the watch renders only what the phone's formula decided. The witness policy
dials three ways:

- **Off** — `W` contributes whatever it has; it can never fail the gate.
- **Preferred** — same, plus the readout explains a missing beat.
- **Required** — a fresh heartbeat is a hard prerequisite (`missingWitness`);
  no beat, no permit, regardless of `L`.

On macOS, where `WatchConnectivity` is unavailable, the gate runs
biometric-only and says so in the readout instead of pretending a witness
exists.

## Honest boundary

- A biometric result is a **local acknowledgement factor**. It is not proof
  of who the human is, not a background check, and not intent screening.
- A watch heartbeat is a **proximity witness**. It is not an approval and
  cannot unlock anything by itself.
- The gate currently guards one action: **submitting paper orders** on the
  Markets pane (when "Gate paper orders" is enabled). It grants no authority
  outside this app.
- Every factor and verdict is shown in the Gate readout with its exact
  contribution; refusals state the failing stage in plain language.
- The formula is pure Swift with exhaustive tests
  (`HarshalCoreTests/GateFormulaTests.swift`), including expiry at exactly δ,
  witness weighting crossing below τ, required-witness fail-closed behavior,
  and non-factor clamping.

## Files

- `Packages/HarshalCore/Sources/HarshalCore/GateFormula.swift` — the formula and its tests.
- `HarshalNative/Services/WatchGateService.swift` — biometric evaluation, watch session, heartbeat ingest, verdict publication.
- `HarshalNative/OrbSettings.swift` — `MarketsGateSettings` (τ, δ, witness policy, passcode fallback, order gating).
- `HarshalNativeWatch/` — the watchOS companion: gate mirror, legitimacy bar, freshness countdown, heartbeat button.
