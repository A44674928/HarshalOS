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
  2. requires a declared phase (`NAB`, `CWO`, or `GSRB` — **God-Sovereign Religious Body**);
  3. requires explicit boundary, authorization, accountability, and revocation acknowledgements; `GSRB` additionally requires all five canonical collapse statements in order;
  4. creates a local declaration receipt.
- A SwiftUI dashboard with a local acknowledgement control, **Library** eBook reader, **NEO ORB** geometry study, external-action gate inspector, **SCAV++ supply-chain boundary inspector**, ledger/receipt viewer, and explicitly user-triggered CloudKit-mirror placeholder. NEO ORB and Library are both previewable directly from onboarding before a declaration is created.
- A native **Library** reader that uses `PDFKit` to render the exact bundled AGS v0.2 548-page KDP interior after checking its SHA-256 and page count. It provides section/page navigation from the published source map and a curated external GitHub-companion index without embedding a browser or fetching/executing remote source material. See [`docs/LIBRARY-READER.md`](docs/LIBRARY-READER.md).
- A native **SCAV++ security** tab grounded in the published AGS v0.2 full-book corpus. Published **Part XVIII**, *Accountability in Keyed Human–Machine Hybrid Systems*, contributes only accountable ownership, continuity, scoped-review, non-agency, and refusal principles. Published **Part XIX**, *Supply Chain and Implanted-Device Threat Research*, is accurately classified as `THREAT_RESEARCH` and remains catalog-only within SCAV++: the separate read-only Library can render the owner-provided book, but no app feature derives or operationalizes its scenario material. The tab displays the whole corpus source map, controlled-surface registry, and hard refusals for component embedding, delegated authority, external automation, and privileged downstream capability. It does not let a user self-label evidence as verified or manufacture an integration approval. The Community adapter is limited to a typed phase/text/pseudonym public projection; short-lived claim/status capabilities live in Keychain rather than persisted observation metadata. A separate generic shipping-provenance baseline can cryptographically verify only pre-registered signed origin/release, route, revocation, dual-custody, and separately accountable-review records against a deployment-supplied role-scoped trust store; anything missing, altered, expired, revoked, replayed, route-deviating, or untrusted is held for authorized review. The tab has no shipment acceptance or external-control action. See [`docs/AGS-V0.2-CORPUS.md`](docs/AGS-V0.2-CORPUS.md), [`docs/SUPPLY-CHAIN-BOUNDARY.md`](docs/SUPPLY-CHAIN-BOUNDARY.md), and [`docs/SHIPPING-PROVENANCE-BASELINE.md`](docs/SHIPPING-PROVENANCE-BASELINE.md).
- A local Ledger **Observations** section for owner-authored private notes and public notes. Private native state is stored in an encrypted app-private file whose per-installation key is retained separately in Keychain. A public note remains local until the owner explicitly prepares a short-lived Community handoff, manually enters its one-time claim code while signed in at the HarshalOS publisher, reviews the exact text, and chooses Publish. The app marks it published only after the public feed returns a receipt. The handoff sends only the phase snapshot, note text, and self-chosen public pseudonym—never the private declaration label, universe-core ID, private notes, CloudKit record, market record, or gate state. The short-lived claim code/status capability is held in Keychain rather than the persisted observation record.
- A phase-neutral **PAPER_TEST market** tab: **NAB, CWO, and GSRB** can pair this native app to the existing signed-in HarshalOS account through a short-lived manual code, then read and write the same account-scoped server paper ledger as the website. The Worker, not the device, owns reviewed field selection, provider isolation, immutable quote references, valuation, append-only event history, and normalized Market Orb placement. The app stores its revocable scoped device bearer and pairing capabilities only in Keychain, rejects redirects, and shows explicit held/unavailable state rather than fabricating a quote or mark. It creates no broker instruction, payment, custody, wallet, public post, mining workload, or market effect.
- The original local `HarshalMarkets` fixture ledger remains as an explicitly labeled device-only legacy/review surface. It is not uploaded, merged, or treated as shared authority because a fixture price cannot honestly become a server-observed quote reference. The server ledger is described in [`../../docs/PAPER-TEST-MARKET.md`](../../docs/PAPER-TEST-MARKET.md).
- XCTest coverage for phase declaration/refusal cases, phase-neutral paper-market eligibility and paper-ledger/valuation transitions, local ledger verification/tamper detection, NEO ORB geometry, Z_360 boundaries, logarithmic bands, display berth separation, and generated-key shipment-provenance continuity/hold cases (altered, missing, deviated, replayed, expired, revoked, untrusted, self-reviewed, invalid-review, and one-sided records).

## Native visual system

The universal app uses an OLED-friendly **black** canvas with accessible **electric-blue** primary text, tint, section markers, panels, and controls. Secondary text uses a lower-intensity blue; success, warning, and destructive states retain distinct cyan/amber/red semantic colors so the theme does not hide important state. The Library offers the exact, visually unmodified published PDF and a separately checksum-verified black/electric-blue **Night Reading Edition**; the latter is clearly marked as a presentation-only derivative and never replaces the print-edition source.

## Deliberate boundary

The starter **does not claim to identify dishonest people, predict intent, prevent infiltration, prove identity, or grant legal/production authority**. A self-declared label, a local acknowledgement, a hash chain, an Apple ID, and CloudKit synchronization are not substitutes for an independently designed identity/authorization program.

The app fails closed by default. Any shown `Permit` is labeled `LOCAL-DEMO-ONLY`; it must not cause an external action.

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) before enabling sign-in, CloudKit, a backend, or any production authority path.

## Open in Xcode

1. Install **Xcode 15.3+** on macOS.
2. Open [`HarshalNative.xcodeproj`](HarshalNative.xcodeproj) in Xcode.
3. Select either **HarshalNative iOS** or **HarshalNative macOS**.
4. Set a real Development Team and replace the placeholder bundle identifier `com.example.HarshalNative` before signing.
5. Build and run. On the first-run declaration screen, tap **Preview NEO ORB** to open the display-only shape study immediately; after a declaration, it is also the **NEO ORB** dashboard tab.

The project attaches `Packages/HarshalCore`, `Packages/HarshalLedger`, and `Packages/NeoOrb` as local Swift packages. Its Debug configurations build only the active architecture, preventing a local package/product architecture mismatch on current Xcode Simulator toolchains. You can also validate the packages directly:

```bash
cd native/HarshalNative/Packages/HarshalCore
swift test

cd ../HarshalLedger
swift test

cd ../NeoOrb
swift test

cd ../HarshalMarkets
swift test
```

## CloudKit is intentionally disabled

`HarshalCloudKitEnabled` is `false` in `HarshalNative/Resources/Info.plist`, and no CloudKit entitlement/container is checked in. This prevents an accidental claim that sync has been configured.

After a privacy/security review, an authorized Apple Developer account may configure the app as described in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). The implementation mirrors only a phase declaration and its **local-only** receipt to the user’s **private** database after an explicit tap. It is synchronization, not authentication or independent witnessing.

## Public observations use a separate Community publisher

`HarshalCommunityOrigin` is populated from the `HARSHAL_COMMUNITY_ORIGIN` Xcode build setting, which defaults to `https://main.empty.domains` for both checked-in targets. It is a public HTTPS endpoint, not a credential. A release/staging configuration may override it only with its exact HTTPS root origin—no path, query, fragment, or userinfo—and must be reviewed alongside the corresponding Community deployment. The native app has no embedded OAuth client, Community cookie, API key, or shared publishing secret.

For a **Public note**, the Ledger uses an intentionally low-tech ownership handoff:

1. Save a reusable public profile pseudonym locally. It is separate from the private declaration label and is not verified identity.
2. Tap **Prepare public publication**, review the native confirmation, and choose **Send unlisted handoff**. The app sends only the note’s declared-phase snapshot, public text, and pseudonym to an unlisted, 15-minute server handoff. It receives a manual one-time code plus a status-only token; this step is not publication.
3. Open the HarshalOS publisher, sign in through its existing Community account flow, enter the one-time code, inspect the exact candidate, save/confirm the pseudonym, and explicitly tap Publish.
4. Return to the native Ledger and tap **Check publication**. Only a confirmed public feed ID/URL changes the local status to **Published**.

The code does not itself publish anything; the status token can only ask for handoff status. Its first successful browser claim binds the candidate to that signed-in account; the same short-lived code may be re-entered by that account to recover a browser review screen after reload. The app places the claim code and status token in a short-lived Keychain capability vault and removes them when the handoff becomes terminal or expires; neither value is serialized into the encrypted observation record. The native client uses an isolated no-cookie session, rejects redirects, validates the typed three-field public projection before encoding it, and checks returned publisher/receipt URLs against the configured HTTPS origin and expected observation route. Creating a new declaration clears local observations and removes local capabilities but cannot withdraw an already-public remote note or cancel an unclaimed handoff; an unclaimed handoff expires server-side after its short lifetime. Withdrawal happens explicitly in the Community publisher; a configured Community moderator can also hide an active note with an internal reason. Either action only redacts this service’s active payload and cannot recall external copies. A public observation is an author-submitted, **UNREVIEWED** bounded projection—not a public personal-universe core, peer authorization, identity proof, investment statement, broker instruction, or evidence that anyone has seen or agreed with it.

The public service requires the Worker/D1 migration `0016_public_observations.sql` after the owner-applied `0014` and `0015` migrations, existing Community sign-in configuration, a configured moderator, and an owner-run deployment. Until those gates are configured on the remote service, preparation fails closed and the note remains local. See the root [Community D1 deployment guide](../../docs/deployment/COMMUNITY-D1.md).

## Shared PAPER_TEST market pairing

The Paper market tab uses the same `HarshalCommunityOrigin` HTTPS root, but it does **not** use a Community browser cookie or embed a web view. Tap **Start native device pairing** to obtain a 15-minute manual code. While signed in on a separate browser, open **Account → PAPER_TEST market ledger**, enter the code, inspect the device label, and explicitly approve it. Return to the native app, check the pairing state, then explicitly redeem the one-time pairing. The resulting 30-day, revocable `PAPER_TEST` bearer is placed only in Keychain.

The Worker accepts browser writes through the existing exact-origin Community session and native calls through this scoped bearer. The device cannot approve/revoke itself, access provider APIs, submit market prices, or use a public API proxy. Browser-side device revocation immediately causes the native app to fail closed. Apply `0017_paper_market.sql` after `0016` and use the full contract in [`../../docs/PAPER-TEST-MARKET.md`](../../docs/PAPER-TEST-MARKET.md).

## Structure

```text
native/HarshalNative/
├── HarshalNative.xcodeproj/              Shared-source iOS + macOS Xcode targets
├── HarshalNative/                        SwiftUI application source
│   ├── Features/                         Onboarding, overview, gate, SCAV++ boundary, ledger, sync
│   ├── Services/CloudKitMirror.swift     Optional user-triggered private sync adapter
│   ├── Services/CommunityObservationPublisher.swift  Explicit public-note handoff adapter
│   ├── Services/PaperMarketService.swift  Keychain-scoped PAPER_TEST pairing/client adapter
│   └── Resources/Info.plist              CloudKit flag + public Community origin
├── Packages/
│   ├── HarshalCore/                      Policy-neutral core domain model and tests
│   ├── HarshalLedger/                    Local integrity ledger and tests
│   ├── HarshalMarkets/                   Fixture-only paper-market model, ledger, and tests
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
