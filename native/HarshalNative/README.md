# Harshal Native — Swift Foundation

This directory begins a **ground-up, full-Swift** build of HarshalOS for iPhone, iPad, and macOS. It does not embed the web app in a `WKWebView` and does not port browser globals into Swift.

## What is included now

- An Xcode project with separate **iOS 17+** and **macOS 14+** app targets sharing SwiftUI source.
- Three local Swift packages:
  - **HarshalCore** — canonical constants, phase declarations, required acknowledgements, and the refusal-first decision model.
  - **HarshalLedger** — an actor-isolated SHA-256 local ledger, local-only receipt issuance, and ledger-prefix verification.
  - **NeoOrb** — a pure, display-only center-origin disc-to-spheroid geometry model with measured axes, logarithmic bands, collision-aware display berths, and synthetic fixture nodes.
- A native onboarding/declaration flow:
  1. records a local principal label as **self-declared**; no external attestation provider is available or self-selectable in this build;
  2. requires a declared phase (`NAB`, `CWO`, or `GSRB`);
  3. requires explicit boundary, authorization, accountability, and revocation acknowledgements; `GSRB` additionally requires all five canonical collapse statements in order;
  4. creates a local declaration receipt.
- A SwiftUI dashboard with a local acknowledgement control, **NEO ORB** geometry study, gate inspector, ledger/receipt viewer, and explicitly user-triggered CloudKit-mirror placeholder.
- XCTest coverage for phase declaration/refusal cases, local ledger verification/tamper detection, and NEO ORB geometry, Z_360 boundaries, logarithmic bands, and display berth separation.

## Deliberate boundary

The starter **does not claim to identify dishonest people, predict intent, prevent infiltration, prove identity, or grant legal/production authority**. A self-declared label, a local acknowledgement, a hash chain, an Apple ID, and CloudKit synchronization are not substitutes for an independently designed identity/authorization program.

The app fails closed by default. Any shown `Permit` is labeled `LOCAL-DEMO-ONLY`; it must not cause an external action.

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) before enabling sign-in, CloudKit, a backend, or any production authority path.

## Open in Xcode

1. Install **Xcode 15.3+** on macOS.
2. Open [`HarshalNative.xcodeproj`](HarshalNative.xcodeproj) in Xcode.
3. Select either **HarshalNative iOS** or **HarshalNative macOS**.
4. Set a real Development Team and replace the placeholder bundle identifier `com.example.HarshalNative` before signing.
5. Build and run.

The project attaches `Packages/HarshalCore`, `Packages/HarshalLedger`, and `Packages/NeoOrb` as local Swift packages. You can also validate the packages directly:

```bash
cd native/HarshalNative/Packages/HarshalCore
swift test

cd ../HarshalLedger
swift test

cd ../NeoOrb
swift test
```

## CloudKit is intentionally disabled

`HarshalCloudKitEnabled` is `false` in `HarshalNative/Resources/Info.plist`, and no CloudKit entitlement/container is checked in. This prevents an accidental claim that sync has been configured.

After a privacy/security review, an authorized Apple Developer account may configure the app as described in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). The implementation mirrors only a phase declaration and its **local-only** receipt to the user’s **private** database after an explicit tap. It is synchronization, not authentication or independent witnessing.

## Structure

```text
native/HarshalNative/
├── HarshalNative.xcodeproj/              Shared-source iOS + macOS Xcode targets
├── HarshalNative/                        SwiftUI application source
│   ├── Features/                         Onboarding, overview, gate, ledger, sync
│   ├── Services/CloudKitMirror.swift     Optional user-triggered private sync adapter
│   └── Resources/Info.plist              CloudKit disabled by default
├── Packages/
│   ├── HarshalCore/                      Policy-neutral core domain model and tests
│   ├── HarshalLedger/                    Local integrity ledger and tests
│   └── NeoOrb/                           Display-only NEO ORB shape model and tests
└── docs/                                 Architecture and NEO ORB contracts
```

## First migration boundary

The code intentionally starts with the parts of the browser implementation that are deterministic and testable:

| Current HarshalOS source | Native Swift starting point |
| --- | --- |
| `specs/normative/canonical.json` | `HarshalCore/CanonicalModel.swift` |
| `js/data.js` phase declarations | `DeclaredPhase.swift`, `PhaseDeclaration.swift` |
| `js/kernel.js` refusal gate | `RefusalGate.swift` |
| `js/crypto.js` / local PLV chain | `HarshalLedger/LocalLedger.swift` |
| The Orb + Orb 2 geometry | `NeoOrb/NeoOrbModel.swift` + `Features/NeoOrbView.swift` (display-only; see [`docs/NEO-ORB.md`](docs/NEO-ORB.md)) |

Ground-0, OCM, UTS, library content, external providers, and the browser Worker APIs should move in subsequent, individually reviewed slices—not by carrying browser security assumptions into a native app.
