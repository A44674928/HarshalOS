# Harshal Native architecture and trust boundary

**Status:** Foundation / local demonstration only
**Platforms:** iOS 17+, iPadOS 17+, macOS 14+
**Canonical source:** [`../../../specs/normative/canonical.json`](../../../specs/normative/canonical.json)

## 1. Product intent

Harshal Native is a universal SwiftUI application intended to bring selected, deterministic HarshalOS concepts into an Apple-native codebase. Its first slice is intentionally narrow:

```text
Native declaration → local acknowledgement → refusal-first evaluation
                   → local hash-chain ledger → optional private sync mirror
```

The domain core has no SwiftUI, CloudKit, `UserDefaults`, or network dependency. This makes the transition rules testable before higher-risk integrations are added.

## 2. The non-negotiable honesty boundary

A signup flow cannot truthfully guarantee that a person is honest, harmless, loyal, authorized, or who they claim to be. It also must not profile people’s moral character, infer sensitive attributes, or silently apply a high-impact risk score.

Accordingly, the initial declaration flow does **only** the following:

1. collects a minimised local declaration label;
2. records that reference as self-declared; this build rejects any attempt to self-label it as externally attested;
3. requires explicit phase selection and disclosures;
4. records a local hash-chain receipt;
5. starts every mutable/authority-like path in refusal.

It does **not**:

- make a background-check, criminality, deception, intent, or trustworthiness determination;
- establish a natural-person identity or legal relationship;
- use an Apple account or CloudKit account as an identity credential;
- screen protected characteristics or build an eligibility score;
- authorize external actions; or
- claim that a device-local SHA-256 digest is a signature or independent witness.

If a future product needs real onboarding or anti-fraud controls, it needs a separately approved product/security/legal design with a documented purpose limitation, human review where appropriate, appeal/redress path, data-minimisation and retention policy, jurisdictional analysis, accessibility review, threat model, audit plan, and an external trust anchor. None of those requirements are satisfied merely by changing a UI label to “verified.”

## 3. Native modules

### `HarshalCore`

A pure Swift Package with the deterministic model:

- `CanonicalModel`: constants from the canonical machine registry (`τ = 0.5`, `δ = 240s`, Center Origin, pipeline).
- `DeclaredPhase`: public operational declaration phases only; it deliberately does not mistake detected Ground-0 classifications for self-declarations.
- `HarshalTheme`: a universal native black/electric-blue visual system with separately visible success, warning, and destructive semantics. It styles the app chrome and never alters the exact published PDF pages or any policy decision.
- `PhaseDeclaration`: disclosure and phase declaration model, including an explicit verification-status field.
- `RefusalGate`: Stage 1–5 model for bounded external actions and a terminal `Permit | Refuse` decision.
- `PaperTradingPolicy`: phase-neutral eligibility for future non-executing market declarations and paper positions.
- `ObservationNote`: private/public local note validation, a separate self-chosen public profile pseudonym, and local metadata for a confirmed manual-publication handoff.
- `AGSv02PublishedCorpus`: a source-of-record map for the 548-page AGS v0.2 production KDP interior. It keeps every published Part/appendix classification and native-use boundary separate; it is source navigation, not a PDF runtime, authority, or implementation claim.
- `AGSv02LibraryEdition`: typed metadata for the exact Published Edition and separately checksummed Night Reading Edition. The latter preserves the 548-page map as a presentation-only derivative and is never elevated to a source-of-record artifact.
- `HarshalRepositoryCompanionCatalog`: a curated GitHub source index that opens known public repository documents in the platform browser only. It never silently fetches, caches, or executes remote repository material in the app.
- `SupplyChainBoundary`:  a SCAV++-named fail-closed model for proposed relationships to Harshal Native. It takes accountable-ownership, continuity, scoped-review, and refusal principles from published **Part XVIII** and records published **Part XIX** only as a `THREAT_RESEARCH` catalog boundary; it explicitly refuses component embedding, delegated authority, external automation, and capability expansion beyond local research display.
- `DataEgressPolicy`: a typed controlled-surface registry and bounded `PublicObservationProjection`. It constructs the Community payload only from an explicitly public note plus public pseudonym, with exactly phase/text/author fields.
- `ShipmentProvenanceBaseline`: a generic, cryptographic, fail-closed continuity verifier for a pre-registered origin/release manifest, a scoped/expiring route authorization, a current signed revocation snapshot, an exact sequence of dual-signed custody receipts, and a separated accountable review. It returns verified record continuity or a hold for authorized review only; it cannot accept a present item post hoc, operate logistics, or grant release/deployment authority.

`SupplyChainBoundary` is not a supply-chain scanner, signer, provenance verifier, authorization engine, license enforcer, or a technical control over code copied outside this app. Its published source split is deliberate: Part XVIII is a conceptual accountability reference; Part XIX is accurately classified `THREAT_RESEARCH` and remains catalog-only within the SCAV++ model. The separate native Library renders the owner-provided full book read-only, but no app feature derives or operationalizes threat scenarios or other source material. The interactive UI never treats a local evidence selection as approval; it displays hard native boundaries and the enforced egress policy. The core review model evaluates transparent inputs only at interfaces HarshalOS controls; a `CONTAINED_LOCAL_REFERENCE` result is not a permit. The separate `ShipmentProvenanceBaseline` has no manual acceptance UI and verifies only supplied signed generic records against a caller-owned trust store. It is not a scanner, physical inspection, incident attribution, trusted-time source, shipment controller, or release authority. See [`AGS-V0.2-CORPUS.md`](AGS-V0.2-CORPUS.md), [`SUPPLY-CHAIN-BOUNDARY.md`](SUPPLY-CHAIN-BOUNDARY.md), and [`SHIPPING-PROVENANCE-BASELINE.md`](SHIPPING-PROVENANCE-BASELINE.md).

The evaluator computes the implementation approximation:

```text
L(t) = H(t) × C(t) × K(t) × A(t) × R(t) × S(t)
S(t) = max(0, 1 − Δt / 240)
```

For a modeled **external action**, a permit requires active/fresh local acknowledgement, bounded local authorization, a bound local session, both technical and operational accountability model inputs, valid `A`/`R`, `L(t) ≥ τ`, and phase `NAB`. A `CWO` (**Custodial Witness Orb**) correctly refuses this external-execution gate because it is custodial rather than executing; that refusal does **not** bar CWO from archival records or paper-market participation. `GSRB` (**God-Sovereign Religious Body**) exposes no execution override in this initial native build.

`PaperTradingPolicy` is deliberately separate from `RefusalGate`: **NAB, CWO, and GSRB are all eligible** to create a non-executing market declaration and simulated paper position. A paper record is not a broker instruction, payment, investment recommendation, identity proof, or authority grant. See [`PAPER-TRADING.md`](PAPER-TRADING.md) for the current boundary.

A local acknowledgement is precisely named as such. It is **not** a production Human Key authenticator.

### `HarshalMarkets`

`HarshalMarkets` is a pure Swift package for the private, local paper-market slice. It normalizes fixture instruments, preserves supplied-observation provenance, records phase-snapshotted market declarations, serializes position transitions through `PaperLedger`, and calculates deterministic long/short simulated results only from explicit available observations.

The current catalog is bundled, deterministic fixture data. It has no provider client, broker API, public feed, payment path, or network dependency. A held or unavailable observation stays unavailable rather than becoming a fabricated neutral mark. The actor and its persisted state make local transitions inspectable, but are not an independent signature or tamper-proof audit service.

### `HarshalLedger`

`LocalLedger` is an actor, so normal app code cannot accidentally race append order. It produces a SHA-256 chain over canonical entry fields, persists the exact timestamp strings used in each digest so Codable date precision cannot change a recovered verification, and can issue/verify `HOS-NATIVE-LOCAL-RECEIPT-1` ledger-prefix receipts.

The ledger protects against accidental mutation and makes local tampering visible **only when a trusted prior copy/root is available**. A compromised device, modified app, developer tools, restored backup, or attacker with local storage access can rewrite a local ledger and its receipt. The ledger must never be represented as an independent signature, immutable audit service, production identity proof, or external authorization.

### `NeoOrb`

`NeoOrb` is a pure Foundation Swift Package for **display-only** NEO ORB geometry. It merges The Orb’s Center Origin, Z_360 sector arrangement, disc-to-sphere formation, and direct attachments with Orb 2’s measured spheroid axes, logarithmic radial bands, convergence indicator, and deterministic collision-aware display berths.

The package contains neither SwiftUI nor a persistence/network/gate/authority dependency. Its first fixture is explicitly synthetic and its coordinates are not routes, provider facts, identity claims, market values, ownership records, or operational effects. The future product planes remain distinct: **The Orb** is a private personal-universe core, while **Orb 2** is an explicit public projection of opted-in cores for peer comparison. `NeoOrb` currently implements neither data plane. See [`NEO-ORB.md`](NEO-ORB.md) for the deterministic formulas and non-negotiable extension boundary.

### SwiftUI app target

The application owns presentation and integration adapters:

- an encrypted app-private local-state file; its per-installation AES key is retained separately in Keychain, while short-lived Community bearer material is held in a distinct Keychain capability vault;
- active acknowledgement is reset at app launch to avoid silently carrying authority forward;
- a phase declaration produces a receipt, then the gate and ledger views remain inspectable;
- the Ledger records and filters owner-authored private notes plus public-note drafts. A public note remains local until an explicit Community handoff is prepared, manually claimed in the browser, explicitly published there, and then confirmed by a returned public-feed receipt;
- a NEO ORB `Canvas` view reads only a local synthetic geometry fixture and ephemeral display controls; it can be previewed during onboarding or opened as a dashboard tab after declaration;
- a Paper market tab first presents the account-scoped Worker `PAPER_TEST` ledger. A native device pairs through a short-lived manual code approved by an existing signed-in browser session; a Keychain-only scoped bearer then reads/writes only the owner-scoped server declarations, immutable quote references, positions, append-only events, valuation state, and server-normalized Market Orb. The original bundled fixture ledger remains below it as explicitly non-synchronizing legacy/review data;
- a SCAV++ boundary tab renders source metadata plus a controlled-surface registry. `HarshalDataEgressPolicy` restricts the Community public-observation adapter to a typed phase/text/pseudonym projection; private core, ledger, gate, CloudKit, market fields, pairing capability, and device bearer have no representation in that payload. Its shipping-provenance card is intentionally status/limits only: without deployment-owned trusted keys and complete pre-existing signed evidence, no record is accepted and the status remains hold for authorized review;
- no network call happens when a declaration, local NEO ORB configuration, gate evaluation, SCAV++ assessment, or legacy local-fixture paper record is created. A deliberately user-triggered `PAPER_TEST` action may call the Worker only after pairing; the Worker owns field/provider isolation and returns explicit held/unavailable state instead of allowing a native fallback quote. The Community public-note handoff remains a separate explicitly confirmed public-projection call.

## 4. Phase declaration flow

The first-run sequence intentionally separates declaration from authentication:

1. **Local principal reference** — a label with a transparent verification status. A label is not a legal name or identity proof.
2. **Declared phase** — one of `NAB`, `CWO`, or `GSRB` (**God-Sovereign Religious Body**).
3. **Required acknowledgements** — local-only boundary, no-identity-claim, external-authorization boundary, accountability duty, and revocation duty. `GSRB` additionally requires the five canonical collapse statements from `js/data.js`, acknowledged once and in order; this is a recorded disclosure sequence, not an execution override.
4. **Local declaration** — the app writes a declaration event and receipt to the local ledger.
5. **Local acknowledgement** — an explicit, fresh device-local acknowledgement that remains labelled as non-authentication.
6. **Gate inspection** — a transparent view exposes all model inputs and the deterministic result.

There is no hidden grant: fields begin false/absent, and the terminal decision fails closed.

## 5. CloudKit private mirror

CloudKit starts disabled (`HarshalCloudKitEnabled = false`) because a source repository cannot safely supply another team’s container ID, entitlement, signing configuration, or server schema.

When—and only when—the owner approves sync, configure it in Xcode:

1. Replace `com.example.HarshalNative` with an owned bundle identifier and select the correct Development Team.
2. Add the **iCloud** capability and **CloudKit** service for both application targets.
3. Create an owned `iCloud.*` container and use the **private database**.
4. Configure a development schema with record type `HarshalPhaseDeclaration` and fields: `declarationJSON` (Bytes), `receiptJSON` (Bytes), `schema` (String), `assurance` (String), and `updatedAt` (Date/Time).
5. Test with non-sensitive data; define retention/deletion and backup behavior before production schema deployment.
6. Set `HarshalCloudKitEnabled` to `YES` only in the signed configuration that has the matching entitlement.

The app sends no data until the user explicitly taps **Mirror declaration and receipt**. This first sync slice does not mirror observation notes or paper-market records. CloudKit mirror status must remain described as data synchronization—not a proof of identity, honesty, consent, authorization, or independent witnessing.

## 6. Public-observation Community handoff

Public observations use the existing HarshalOS Community Worker/D1 service, not CloudKit. The native app is still a native SwiftUI app; it does not embed the Community site as a web wrapper and it does not carry a browser cookie, OAuth client secret, shared API key, or publishing credential.

A user first saves a **reusable public profile pseudonym** in the Ledger. It is a self-chosen public label, separate from the private declaration label, and not identity verification. For an explicit Public note, the app shows a native confirmation that the next action creates only an unlisted handoff—not a public post—and the user must choose **Send unlisted handoff**. The app then sends only this bounded payload over HTTPS:

```text
phase snapshot + note text + public pseudonym
```

It deliberately excludes the universe-core ID, declaration label, private-note collection, local ledger entries, receipt, CloudKit record, paper-market state, gate inputs, device identity, and any claimed user identity. The Worker stores it as a short-lived, unlisted handoff and returns two separate values:

- a readable one-time claim code that the owner manually types after signing in on the HarshalOS Community site; and
- a 256-bit status-only token retained by the app for polling. It cannot claim, edit, or publish the note.

The native app places both short-lived values in a Keychain-backed capability vault keyed by handoff ID. They are intentionally excluded from `PublicObservationPublication` encoding and the encrypted local observation record. A terminal/expired handoff removes its local capability. A missing local capability never becomes a guessed publication result: the app reports it unavailable and does not infer a remote state.

The browser flow requires the Community account session, presents the exact candidate, requires a profile confirmation, and requires the literal `PUBLISH_PUBLIC_OBSERVATION` acknowledgement before inserting the public row. The public row copies the server-side profile pseudonym at that instant and is immediately labeled **UNREVIEWED**. It is not a proof of authorship, identity, truth, review, consent by a reader, authorization, peer comparison, or Orb 2 core record.

The first successful browser claim binds the candidate to that signed-in Community account. The server retains only the code hash until expiry/publication so that same account can recover a review screen after browser reload; another account cannot claim it. The app updates its local note from **Awaiting manual claim** or **Claimed — awaiting publish** to **Published** only after the status endpoint returns a public observation ID and URL. The public service can later report **Withdrawn** or **Hidden**. An author withdrawal or configured-moderator hide redacts the service’s active public fields; the hide action also has a private append-only moderator reason. Neither action recalls external copies or proves a statement false. Starting a new local declaration clears the device’s observations but does not withdraw a remote public note or cancel an unclaimed handoff; a staged handoff expires server-side after its short lifetime.

`CommunityObservationPublisher` uses an isolated no-cookie `URLSession`, rejects redirects, requires a typed `PublicObservationProjection` before encoding a request, and validates each returned publisher/public URL against the configured HTTPS origin and exact `/observations` route before retaining it. `HarshalCommunityOrigin` is expanded from the checked-in `HARSHAL_COMMUNITY_ORIGIN` build setting; the placeholder `https://main.empty.domains` fails as unconfigured. A release-specific override must be an exact HTTPS root origin and receive deployment review. The remote service must have the owner-run D1 migration `0016_public_observations.sql` after its already-applied `0014` and `0015` migrations, Community/OIDC configuration, moderation coverage, and a reviewed deployment before it will accept the flow. Absent configuration returns a failure; the app leaves the note local and unpublished.

## 7. Migration map

| Existing browser implementation | Native destination | Migration rule |
| --- | --- | --- |
| `specs/normative/canonical.json` | `HarshalCore/CanonicalModel.swift` | Copy constants only after asserting tests against the registry. |
| `js/data.js` phase data | `DeclaredPhase` + `PhaseDeclaration` | Keep operational declarations distinct from detected classifications. |
| `js/kernel.js` action gate | `RefusalGate` | Preserve fail-closed order; do not carry the browser’s public demo phrase into native onboarding. |
| `js/crypto.js` SHA-256 | `SHA256LedgerDigest` (`CryptoKit`) | Use Apple platform crypto; local digests remain non-signatures. |
| local PLV/session receipt concepts | `LocalLedger` | Preserve visible assurance boundaries and add native receipt-verification tests. |
| `js/g0-engine.js` | future `GroundZero` package | Port only with fixtures/tests and a separately reviewed evidence model. |
| `js/apps-ocm.js` The Orb + `js/good-intelligence-orb2.js` Orb 2 | `NeoOrb` + `NeoOrbView` | Preserve visual/topological semantics only; use synthetic local fixtures and do not infer a route, provider fact, market claim, or authority effect. |
| Orb 2 logarithmic FBB/race display + paper-market records | `HarshalMarkets` now; future `MarketOrb` | `HarshalMarkets` starts with local, simulated, phase-neutral records and deterministic fixtures. Add reviewed read-only observations before any public **market** feed; keep market geometry display-only. |
| `js/ocm-data.js` and directory logic | future `OCM` package | Start read-only: address validation and routing, then separately assess storage/transport. |
| [AGS v0.2 full-book KDP interior](../../../publications/book/AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-interior-2026-10-07.pdf) + [Night Reading Edition](../../../publications/book/AGS-v0.2-Harshal-s-Systems-Night-Reading-Edition-2026-10-10.pdf) | `AGSv02PublishedCorpus` + `AGSv02LibraryEdition` + `LibraryView` + `SupplyChainView` | Bundle the exact 548-page production edition as a checksum/page-count-verified, read-only native `PDFKit` resource and the separately checksummed black/electric-blue presentation-only derivative. Both share the 37-section navigator; only the KDP interior is the source-of-record artifact. Keep section-level classifications separate; never turn prose into runtime authority. See [`AGS-V0.2-CORPUS.md`](AGS-V0.2-CORPUS.md) and [`LIBRARY-READER.md`](LIBRARY-READER.md). |
| Published Part XVIII, *Accountability in Keyed Human–Machine Hybrid Systems* · print p. 203 / PDF p. 229 | `AccountabilityResearchReference` + `SupplyChainBoundary` | Preserve only accountable ownership, bound continuity, scope contraction, non-agency, CWO custodial acceptance, and refusal principles. Do not turn the conceptual research into a human/identity assessment, clinical feature, external action, or authorization path. |
| Published Part XIX, *Supply Chain and Implanted-Device Threat Research* · print p. 213 / PDF p. 239 | `LibraryView` + `SupplyChainResearchReference` + `SupplyChainView` | The read-only Library renders the owner-provided source as a classified book section; the SCAV++ model exposes only a catalog-only defensive boundary. Do not derive scenario, procedural, target, activation, device, or response material into app behavior; do not make a scanner, attack workflow, or authorization path. |
| Worker integrations | `URLSession` adapters | Preserve same-origin/secret boundary as a service contract; never bundle API secrets into the app. |
| Community D1 public observations | `CommunityObservationPublisher` + Ledger | Use an explicit short-lived manual claim handoff. Send only the bounded note projection; never bundle Community credentials, publish a private core, or infer success before a public receipt. |

## 8. Test strategy

The current package tests cover:

- required acknowledgements, including all five ordered `GSRB` collapse acknowledgements and rejection of malformed/out-of-order protocols;
- private/public observation-note validation, public-pseudonym boundary validation, phase snapshot preservation, local publication-receipt shape validation, capability-field redaction during persistence, and typed three-field public-egress projection rejection for private notes;
- default refusal without a local acknowledgement;
- fresh, complete `NAB` local-model permit and its `LOCAL-DEMO-ONLY` boundary;
- CWO external-execution refusal alongside phase-neutral paper-market eligibility for NAB, CWO, and GSRB; deterministic fixture provenance, paper-ledger transition validation, valuation for long/short positions, stale failure, below-threshold refusal, and non-executing GSRB behavior;
- AGS v0.2 published-corpus identity/hash metadata, all 37 mapped source sections, Part XVIII/Part XIX published-page mapping, source dispositions, repository-companion source locations, and bounded corpus translations; plus SCAV++ containment only for a verified local research reference and refusal of component embedding, delegated authority, external automation, unverified evidence, missing accountable-owner reference or human review, and privileged requests;
- shipping-provenance verification with generated Ed25519 keys, including a complete pre-registered dual-signed custody chain and fail-closed altered-manifest, missing-chain, route-deviation, cross-route replay, untrusted-origin, and one-sided-custody cases;
- receipt verification, modified-entry detection, and root mismatch detection;
- NEO ORB disc-plane formation, ideal/deformed spheroid convergence, stable display-node identity, Z_360 boundary rejection, logarithmic-band ratio/radial berth, and display-only collision re-slotting.

Each future migration must first add fixtures that are traceable to the source specification or to the existing JavaScript tests, then add Swift XCTest cases for success and hostile/failure paths. Functional parity should never silently expand authority.

## 9. Next slices

1. **Foundation hardening** — build the app with Xcode, add accessibility/UI tests, strict-concurrency checking, exportable receipt view, and migration fixtures from the canonical JSON registry.
2. **NEO ORB visual hardening** — validate the Canvas on iPhone, iPad, and macOS; add accessibility/UI coverage and snapshot fixtures before considering any external read-only field adapter.
3. **Market / Orb 2 projection design** — retain the local `HarshalMarkets` fixture slice, then define the bounded `PublicUniverseProjection` schema and a read-only `MarketOrb` adapter before any peer-core field or public market feed. The public-observation feed is only an explicit note projection; it must not be silently repurposed as an Orb 2 core, market, or peer-comparison service. Port documented logarithmic FBB/race calculations only with fixtures and provenance.
4. **Secure local storage resilience** — test Keychain-loss, device migration, backup/restore, locked-device, and encrypted-file recovery behavior. Evaluate a Secure Enclave-backed signing checkpoint only if it has a defined owner/recovery model; do not call device possession human identity.
5. **External identity/authorization design** — only after independent policy, privacy, accessibility, legal, threat-model, and review requirements are defined. This is a product/security programme, not a UI task.
6. **Ground-0** — package the pure classifier and evidence record schemas; keep model output data-only and reviewer-gated.
7. **OCM / UTS / library** — port read-only domain modules before considering message transport or external action paths.
8. **Service adapters** — add bounded `URLSession` clients to the existing Worker APIs only with explicit user initiation, response validation, privacy disclosures, and no embedded provider secrets.
9. **Release assurance** — add macOS/iOS CI builds, dependency inventory/SBOM generation, signed build provenance, App Sandbox/Hardened Runtime/notarization release checks on macOS, and server-side Apple attestation only where a future remote service has a reviewed need for it.
