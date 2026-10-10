# SCAV++ native supply-chain boundary

**Status:** local, defensive boundary model — not a scanner, attestation service, or integration approval system.

**Platforms:** iOS 17+, iPadOS 17+, macOS 14+.

**Published source corpus:** [AGS v0.2 full-book KDP interior](../../../publications/book/AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-interior-2026-10-07.pdf) · `AGS-V0.2-FULL-BOOK-2026-10-07` · 548 PDF pages

**Accountability source:** **Part XVIII**, *Accountability in Keyed Human–Machine Hybrid Systems* · printed p. 203 / PDF p. 229 · `RESEARCH` / conceptual proposal

**SCAV++ source context:** **Part XIX**, *Supply Chain and Implanted-Device Threat Research* · printed p. 213 / PDF p. 239 · `THREAT_RESEARCH`

## Purpose

The **SCAV++ boundary** is a locally named, defensive application boundary. The published edition is treated as one text-based source corpus, but no section is allowed to elevate another section’s evidence or authority. Part XVIII supplies the bounded accountability, continuity, scoped-review, non-agency, and refusal principles. Part XIX supplies only an accurately labeled defensive threat-research **catalog boundary**. `SCAV-PLUS-PLUS` is a local boundary identifier; it is not a claim that the book defines a scanner, verifier, or deployed security control.

Its purpose is to stop the application from silently presenting itself as a reusable component, delegated decision-maker, authority service, or external-action channel.

## Source grounding and bounded translation

The source of record is the checked-in [AGS v0.2 KDP interior](../../../publications/book/AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-interior-2026-10-07.pdf), SHA-256 `6c67feae3881c11bab8e2654e1f58d23aabbbb1dfdcd536464218c2bbf839823`. Its published numbering supersedes the older repository chapter mapping: the accountability paper is **Part XVIII**, while the supply-chain research is **Part XIX**. The legacy [`HS-19-RESEARCH-PAPERS`](../../../docs/harshal-systems/19-research-papers.md) path remains a companion record only.

| Published source | Native translation | Explicit non-adoption |
| --- | --- | --- |
| Part XVIII: accountability is a precondition, not a post-hoc label. | A proposed relationship must carry bounded origin, release, continuity, accountable-owner, and review evidence before the local model can contain even a read-only reference. | No identity, human-key, liveness, consent, coercion, or truth determination. |
| Part XVIII: authority contracts when accountable continuity is absent. | Missing, stale, altered, revoked, or untrusted provenance evidence yields a non-acting `HOLD_FOR_AUTHORIZED_REVIEW` or `REFUSE` result. | No rerouting, deployment, shipment control, medical action, or other external action. |
| Part XVIII: continuity should be inspectable and attributable. | The generic shipping baseline binds signed origin/release, route, revocation, dual-custody, and separated accountable-review records. | No physical inspection, trusted time, independent witness, external ledger, or proof that a real-world route/custody event occurred. |
| Part XVIII: computational components are not independent authorities; a custodial state is non-acting. | CWO remains an accepted archival/custodial phase, while this app exposes no delegated authority or automation path. | No distress signaling, clinical/medical control, body/neural-interface interpretation, or real-world intervention workflow. |
| Part XIX: defensive threat research has a source/evidence boundary. | The read-only Library renders the owner-provided book as a classified source; the SCAV++ model exposes only Part XIX’s title, classification, source location, and refusal-first adoption boundary. | No source material becomes scenario-derived behavior, procedure, target material, activation logic, device guidance, scanner claim, attack workflow, or incident-response authority. |

This is a source-informed boundary translation, not a claim that the native app implements the broader conceptual framework, validates a threat claim, or deploys a supply-chain control. For the full 548-page source map and section-level treatment, see [`AGS-V0.2-CORPUS.md`](AGS-V0.2-CORPUS.md).

It evaluates a *proposed relationship to Harshal Native*, not a person, organization, device, package, or incident. The result is deliberately binary:

```text
CONTAINED_LOCAL_REFERENCE | REFUSE
```

`CONTAINED_LOCAL_REFERENCE` is **not** a permission, license, certification, signing result, attribution finding, or approval for a downstream system. It means only that the requested relationship stays inside a bounded, local, read-only research display.

## What the model checks

The pure `HarshalCore` model is `SupplyChainBoundary`. A request names a proposed downstream subject and supplies transparent evidence-state inputs for these defensive checkpoints:

1. **Origin and acquisition** — whether origin can be independently traced.
2. **Build and release integrity** — whether the delivered artifact can be independently checked.
3. **Update continuity** — whether the update path is bounded and reviewable.
4. **Accountability** — whether a responsible human principal, a named local responsibility reference, and a bounded human review record are present. The local reference is required to avoid an anonymous result; it is not identity proof.
5. **Purpose** — whether the relationship is only a local, read-only research reference.
6. **Capability scope** — whether it asks only to display local research metadata.

Every non-verified evidence state fails closed. A UI selection is only a model input; it is not verification.

## Refused relationships

The model always refuses the following purposes, even if a user marks every evidence field as verified:

| Requested relationship | Result | Reason |
| --- | --- | --- |
| Embed HarshalOS as a component | `COMPONENT-EMBEDDING-REFUSED` | Harshal Native is an end-user application, not an SDK, plug-in host, or downstream component contract. |
| Delegate authority to HarshalOS | `AUTHORITY-DELEGATION-REFUSED` | A declaration, receipt, model result, or local app state cannot authorize another actor or system. |
| Automate an external action | `EXTERNAL-AUTOMATION-REFUSED` | The supply-chain boundary does not create an execution channel. |
| Request private state, identity, networking, or external action through a local research reference | `CAPABILITY-EXCEEDS-LOCAL-BOUNDARY` | The only containable capability is display of local research metadata. |

This is an application-interface boundary, not a claim that the repository can technically prevent copying source code, modifying a binary, independently packaging code, or behaving differently outside interfaces HarshalOS controls.

## Enforced native boundary controls

The SCAV++ screen remains a local review model; the following adjacent controls are actual app behavior rather than a user-selected evidence label:

1. **Typed egress projection** — `HarshalDataEgressPolicy` can construct a Community request only from an explicit public note and a public pseudonym. Its encoded `PublicObservationProjection` has exactly `phase`, `text`, and `author`; it has no field for a universe-core ID, declaration label, private note collection, ledger entry/receipt, gate state, CloudKit record, market record, device identifier, account identifier, claim code, or status token.
2. **Controlled-surface registry** — the app enumerates private core, local ledger, bounded public observation, and private CloudKit mirror as distinct surfaces. A private core is not a general integration API, and a local ledger is not an external authority.
3. **Keychain capability vault** — short-lived Community claim/status bearer material is retained by handoff ID in native Keychain storage, excluded from `PublicObservationPublication` encoding, and removed when a handoff expires or reaches a terminal state. Legacy plaintext metadata is migrated one-way when available; a missing capability fails closed rather than fabricating a publication result.
4. **Encrypted native local state** — private state is written to an app-private AES-GCM file using a per-installation key held separately in Keychain. This improves ordinary at-rest confidentiality; it does not make an unlocked/compromised device, modified app, backup, or local ledger independently trustworthy.
5. **Network containment** — the Community adapter uses an ephemeral no-cookie session, HTTPS root-origin validation, redirect refusal, exact publisher/receipt route validation, bounded response decoding, and a placeholder-origin fail-closed configuration.
6. **macOS release posture** — the macOS target declares App Sandbox plus outbound network-client entitlement and enables Hardened Runtime. A real signed/notarized release still requires an owned team, identifier, signing configuration, and release review.
7. **Fail-closed shipment provenance baseline** — `ShipmentProvenanceBaseline` cryptographically verifies only a pre-registered origin/release manifest, scoped unexpired route authorization, current signed revocation snapshot, complete ordered dual-signed custody sequence, and separate accountable review against a supplied role-scoped trust store. An unknown, missing, altered, expired, revoked, replayed, route-deviating, or one-sided record returns `HOLD_FOR_AUTHORIZED_REVIEW`; there is no post-hoc acceptance or shipment-control path. See [`SHIPPING-PROVENANCE-BASELINE.md`](SHIPPING-PROVENANCE-BASELINE.md).

## Native implementation

- `Packages/HarshalCore/Sources/HarshalCore/SupplyChainBoundary.swift` contains the pure, Foundation-only policy model and source metadata.
- `Packages/HarshalCore/Sources/HarshalCore/DataEgressPolicy.swift` defines the controlled-surface registry and the sole three-field public-observation projection.
- `Packages/HarshalCore/Sources/HarshalCore/ShipmentProvenanceBaseline.swift` defines the generic signed origin/release, route, revocation, dual-custody, and accountable-review continuity verifier. It returns an evidence-continuity result or a hold only; it does not control shipments or grant release authority.
- `Features/SupplyChainView.swift` provides the **SCAV++ boundary** tab and displays both the research-model limitations, actual controlled surfaces, and the non-interactive shipping-provenance baseline status/limits.
- `Services/NativeKeychainStore.swift`, `Services/PublicObservationCapabilityVault.swift`, and `LocalStateStore.swift` separate encrypted local state and Keychain-held capability/key material from ordinary observation metadata.
- `SupplyChainBoundaryTests`, `DataEgressPolicyTests`, `ShipmentProvenanceBaselineTests`, and observation persistence tests cover refusal, bounded projection shape, private-note rejection, bearer-field redaction, and cryptographic continuity/hold cases for altered, missing, deviated, replayed, revoked, untrusted, self-reviewed, invalid-review, and one-sided-custody records.
- The Xcode project includes the tab and native security services in both iOS and macOS targets; the macOS target declares App Sandbox/Hardened Runtime settings.
- The view deliberately contains no scanner, device inspection, account lookup, remote reporting path, or attack workflow.

The SCAV++ native view preserves the published corpus split: Part XVIII is the bounded accountability reference and Part XIX is an accurately classified threat-research catalog boundary. The separate Library renders the owner-provided book read-only; neither surface transforms source text into operational instruction or external authority.

## Relationship to other HarshalOS controls

`SupplyChainBoundary` is separate from `RefusalGate`:

- `RefusalGate` models a bounded local external-action decision and labels even a positive result `LOCAL-DEMO-ONLY`.
- `SupplyChainBoundary` never returns `Permit`. It is about whether a proposed relationship to the app remains locally contained at all.
- The local ledger remains a convenience integrity record, not a code-signing service or independent supply-chain witness.
- The Community public-observation adapter remains explicitly user initiated and independently bounded; this model does not grant it a new capability or send it any data.

## Non-goals and required future work

This slice does **not** independently verify source provenance, package signatures, build attestation, release signatures, SBOMs, device integrity, remote-service integrity, author identity, or incident claims. It does not enforce licenses or stop a party outside the app from reusing code. Keychain/file encryption and App Sandbox/Hardened Runtime settings are application/platform protections, not a declaration that a device, user, network, or downstream service is trusted.

A future production supply-chain program would require, at minimum:

- an approved release and dependency policy;
- versioned SBOM/provenance artifacts and a review process;
- platform-code-signing and notarization validation where applicable;
- reproducible-build and artifact-hash policy;
- incident response, revocation, key-rotation, retention, and disclosure procedures;
- independent security review and ownership of the relevant delivery systems.

Until that work exists, the correct model result for an unverified or authority-seeking relationship is **REFUSE**.
