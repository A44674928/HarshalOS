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
- `PhaseDeclaration`: disclosure and phase declaration model, including an explicit verification-status field.
- `RefusalGate`: Stage 1–5 model for bounded external actions and a terminal `Permit | Refuse` decision.
- `PaperTradingPolicy`: phase-neutral eligibility for future non-executing market declarations and paper positions.

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

- local state cache (`UserDefaults`) for convenience only;
- active acknowledgement is reset at app launch to avoid silently carrying authority forward;
- a phase declaration produces a receipt, then the gate and ledger views remain inspectable;
- the Ledger records and filters owner-authored private notes plus public-projection note intents; a public intent remains local until a separate projection/publishing service exists;
- a NEO ORB `Canvas` view reads only a local synthetic geometry fixture and ephemeral display controls; it can be previewed during onboarding or opened as a dashboard tab after declaration;
- a Paper market tab records local phase-snapshotted declarations and simulated positions against bundled deterministic fixture observations; its public-projection intent never publishes anything;
- no network call happens when a declaration, NEO ORB configuration, gate evaluation, or paper-market record is created.

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

## 6. Migration map

| Existing browser implementation | Native destination | Migration rule |
| --- | --- | --- |
| `specs/normative/canonical.json` | `HarshalCore/CanonicalModel.swift` | Copy constants only after asserting tests against the registry. |
| `js/data.js` phase data | `DeclaredPhase` + `PhaseDeclaration` | Keep operational declarations distinct from detected classifications. |
| `js/kernel.js` action gate | `RefusalGate` | Preserve fail-closed order; do not carry the browser’s public demo phrase into native onboarding. |
| `js/crypto.js` SHA-256 | `SHA256LedgerDigest` (`CryptoKit`) | Use Apple platform crypto; local digests remain non-signatures. |
| local PLV/session receipt concepts | `LocalLedger` | Preserve visible assurance boundaries and add native receipt-verification tests. |
| `js/g0-engine.js` | future `GroundZero` package | Port only with fixtures/tests and a separately reviewed evidence model. |
| `js/apps-ocm.js` The Orb + `js/good-intelligence-orb2.js` Orb 2 | `NeoOrb` + `NeoOrbView` | Preserve visual/topological semantics only; use synthetic local fixtures and do not infer a route, provider fact, market claim, or authority effect. |
| Orb 2 logarithmic FBB/race display + paper-market records | `HarshalMarkets` now; future `MarketOrb` | `HarshalMarkets` starts with local, simulated, phase-neutral records and deterministic fixtures. Add reviewed read-only observations before any public feed; keep market geometry display-only. |
| `js/ocm-data.js` and directory logic | future `OCM` package | Start read-only: address validation and routing, then separately assess storage/transport. |
| Worker integrations | `URLSession` adapters | Preserve same-origin/secret boundary as a service contract; never bundle API secrets into the app. |

## 7. Test strategy

The current package tests cover:

- required acknowledgements, including all five ordered `GSRB` collapse acknowledgements and rejection of malformed/out-of-order protocols;
- private/public-projection observation-note validation and phase snapshot preservation;
- default refusal without a local acknowledgement;
- fresh, complete `NAB` local-model permit and its `LOCAL-DEMO-ONLY` boundary;
- CWO external-execution refusal alongside phase-neutral paper-market eligibility for NAB, CWO, and GSRB; deterministic fixture provenance, paper-ledger transition validation, valuation for long/short positions, stale failure, below-threshold refusal, and non-executing GSRB behavior;
- receipt verification, modified-entry detection, and root mismatch detection;
- NEO ORB disc-plane formation, ideal/deformed spheroid convergence, stable display-node identity, Z_360 boundary rejection, logarithmic-band ratio/radial berth, and display-only collision re-slotting.

Each future migration must first add fixtures that are traceable to the source specification or to the existing JavaScript tests, then add Swift XCTest cases for success and hostile/failure paths. Functional parity should never silently expand authority.

## 8. Next slices

1. **Foundation hardening** — build the app with Xcode, add accessibility/UI tests, strict-concurrency checking, exportable receipt view, and migration fixtures from the canonical JSON registry.
2. **NEO ORB visual hardening** — validate the Canvas on iPhone, iPad, and macOS; add accessibility/UI coverage and snapshot fixtures before considering any external read-only field adapter.
3. **Market / Orb 2 projection design** — retain the local `HarshalMarkets` fixture slice, then define the bounded `PublicUniverseProjection` schema and a read-only `MarketOrb` adapter before any peer field or public feed. Port documented logarithmic FBB/race calculations only with fixtures and provenance.
4. **Secure local storage review** — decide which minimal secrets (if any) belong in Keychain/Secure Enclave and document migration/recovery behavior. Do not call device possession human identity.
5. **External identity/authorization design** — only after independent policy, privacy, accessibility, legal, threat-model, and review requirements are defined. This is a product/security programme, not a UI task.
6. **Ground-0** — package the pure classifier and evidence record schemas; keep model output data-only and reviewer-gated.
7. **OCM / UTS / library** — port read-only domain modules before considering message transport or external action paths.
8. **Service adapters** — add bounded `URLSession` clients to the existing Worker APIs only with explicit user initiation, response validation, privacy disclosures, and no embedded provider secrets.
