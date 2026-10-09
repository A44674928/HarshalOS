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
- `RefusalGate`: Stage 1–5 input model and terminal `Permit | Refuse` decision.

The evaluator computes the implementation approximation:

```text
L(t) = H(t) × C(t) × K(t) × A(t) × R(t) × S(t)
S(t) = max(0, 1 − Δt / 240)
```

A permit requires active/fresh local acknowledgement, bounded local authorization, a bound local session, both technical and operational accountability model inputs, valid `A`/`R`, `L(t) ≥ τ`, and phase `NAB`. `CWO` always refuses. `GSRB` is non-executing in this initial native build: no sovereign override is exposed.

A local acknowledgement is precisely named as such. It is **not** a production Human Key authenticator.

### `HarshalLedger`

`LocalLedger` is an actor, so normal app code cannot accidentally race append order. It produces a SHA-256 chain over canonical entry fields, persists the exact timestamp strings used in each digest so Codable date precision cannot change a recovered verification, and can issue/verify `HOS-NATIVE-LOCAL-RECEIPT-1` ledger-prefix receipts.

The ledger protects against accidental mutation and makes local tampering visible **only when a trusted prior copy/root is available**. A compromised device, modified app, developer tools, restored backup, or attacker with local storage access can rewrite a local ledger and its receipt. The ledger must never be represented as an independent signature, immutable audit service, production identity proof, or external authorization.

### SwiftUI app target

The application owns presentation and integration adapters:

- local state cache (`UserDefaults`) for convenience only;
- active acknowledgement is reset at app launch to avoid silently carrying authority forward;
- a phase declaration produces a receipt, then the gate and ledger views remain inspectable;
- no network call happens when a declaration or gate evaluation is created.

## 4. Phase declaration flow

The first-run sequence intentionally separates declaration from authentication:

1. **Local principal reference** — a label with a transparent verification status. A label is not a legal name or identity proof.
2. **Declared phase** — one of `NAB`, `CWO`, or `GSRB`.
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

The app sends no data until the user explicitly taps **Mirror declaration and receipt**. CloudKit mirror status must remain described as data synchronization—not a proof of identity, honesty, consent, authorization, or independent witnessing.

## 6. Migration map

| Existing browser implementation | Native destination | Migration rule |
| --- | --- | --- |
| `specs/normative/canonical.json` | `HarshalCore/CanonicalModel.swift` | Copy constants only after asserting tests against the registry. |
| `js/data.js` phase data | `DeclaredPhase` + `PhaseDeclaration` | Keep operational declarations distinct from detected classifications. |
| `js/kernel.js` action gate | `RefusalGate` | Preserve fail-closed order; do not carry the browser’s public demo phrase into native onboarding. |
| `js/crypto.js` SHA-256 | `SHA256LedgerDigest` (`CryptoKit`) | Use Apple platform crypto; local digests remain non-signatures. |
| local PLV/session receipt concepts | `LocalLedger` | Preserve visible assurance boundaries and add native receipt-verification tests. |
| `js/g0-engine.js` | future `GroundZero` package | Port only with fixtures/tests and a separately reviewed evidence model. |
| `js/ocm-data.js` and directory logic | future `OCM` package | Start read-only: address validation and routing, then separately assess storage/transport. |
| Worker integrations | `URLSession` adapters | Preserve same-origin/secret boundary as a service contract; never bundle API secrets into the app. |

## 7. Test strategy

The current package tests cover:

- required acknowledgements, including all five ordered `GSRB` collapse acknowledgements and rejection of malformed/out-of-order protocols;
- default refusal without a local acknowledgement;
- fresh, complete `NAB` local-model permit and its `LOCAL-DEMO-ONLY` boundary;
- CWO refusal, stale failure, below-threshold refusal, and non-executing GSRB behavior;
- receipt verification, modified-entry detection, and root mismatch detection.

Each future migration must first add fixtures that are traceable to the source specification or to the existing JavaScript tests, then add Swift XCTest cases for success and hostile/failure paths. Functional parity should never silently expand authority.

## 8. Next slices

1. **Foundation hardening** — build the app with Xcode, add accessibility/UI tests, strict-concurrency checking, exportable receipt view, and migration fixtures from the canonical JSON registry.
2. **Secure local storage review** — decide which minimal secrets (if any) belong in Keychain/Secure Enclave and document migration/recovery behavior. Do not call device possession human identity.
3. **External identity/authorization design** — only after independent policy, privacy, accessibility, legal, threat-model, and review requirements are defined. This is a product/security programme, not a UI task.
4. **Ground-0** — package the pure classifier and evidence record schemas; keep model output data-only and reviewer-gated.
5. **OCM / UTS / library** — port read-only domain modules before considering message transport or external action paths.
6. **Service adapters** — add bounded `URLSession` clients to the existing Worker APIs only with explicit user initiation, response validation, privacy disclosures, and no embedded provider secrets.
