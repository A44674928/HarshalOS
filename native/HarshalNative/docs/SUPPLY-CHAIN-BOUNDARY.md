# SCAV++ native supply-chain boundary

**Status:** local, defensive boundary model — not a scanner, attestation service, or integration approval system.

**Platforms:** iOS 17+, iPadOS 17+, macOS 14+.

**Research reference:** [`HS-20-SUPPLY-CHAIN`](../../../docs/harshal-systems/20-supply-chain.md) · `SCAV-PLUS-PLUS`

**Research layer:** `THREAT_RESEARCH` · **Evidence status:** `MIXED_VERIFIED_AND_REPORTED`

## Purpose

The **SCAV++ boundary** turns a narrow, defensive part of the Supply Chain Attack Vector++ research record into a native HarshalOS control surface. Its source card preserves the corpus identifiers, `CANONICAL_SOURCE` provenance classification, `RESEARCH_PAPER` status, `THREAT_RESEARCH` layer, and mixed evidence status without importing scenario content. Its purpose is to stop the application from silently presenting itself as a reusable component, delegated decision-maker, authority service, or external-action channel.

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

## Defensive shipment admission baseline

`ShipmentProvenancePolicy` is the foundation for a future shipping adapter. It rejects the premise that physical arrival, a single logistics screen, or a router-derived route observation can make a part admissible. The model requires an opaque pre-authorized manifest bound to independently verified, expiry/revocation-capable external governance, exact ordered custody references, independently verified custody evidence, receiving identity binding, physical-inspection evidence, artifact-integrity evidence, and an accountable review reference. It additionally fails closed when the known opaque governance-role and receiving-review-role references are the same; that bounded comparison models minimum separation of duties without claiming identity verification or knowing anyone’s intent.

A network/routing observation has only two defensive effects:

- `CONFLICTED_WITH_POLICY` forces `HOLD_FOR_AUTHORIZED_REVIEW`.
- `CONSISTENT_WITH_POLICY` or `NOT_OBSERVED` can never substitute for custody evidence.
- A missing, revoked, expired, or unverified external governance record also fails closed. The policy requires an explicit assessment instant instead of silently reading a local device clock; a future adapter must document and independently verify that time source.

Even a complete record returns `CONTINUITY_COMPLETE_REQUIRES_AUTHORIZED_RELEASE`. It is not an acceptance, shipment, installation, deployment, or operational authorization. The current native app has no live shipping adapter, routing controller, physical scanner, carrier integration, or military/critical-infrastructure control path; any future adapter must remain generic, separately reviewed, role-bound, and non-public.

This policy records a provenance/custody inconsistency, not an accusation about a country, carrier, organization, or person. A route anomaly requires independent authorized investigation before anyone attributes cause.

## Native implementation

- `Packages/HarshalCore/Sources/HarshalCore/SupplyChainBoundary.swift` contains the pure, Foundation-only policy model and source metadata.
- `Packages/HarshalCore/Sources/HarshalCore/DataEgressPolicy.swift` defines the controlled-surface registry and the sole three-field public-observation projection.
- `Packages/HarshalCore/Sources/HarshalCore/ShipmentProvenancePolicy.swift` implements fail-closed generic shipment admission: no physical-arrival shortcut, no router-as-trust-anchor shortcut, and no automatic release state.
- `Features/SupplyChainView.swift` provides the **SCAV++ boundary** tab and displays the research-model limitations, actual controlled surfaces, and defensive shipment-admission baseline.
- `Services/NativeKeychainStore.swift`, `Services/PublicObservationCapabilityVault.swift`, and `LocalStateStore.swift` separate encrypted local state and Keychain-held capability/key material from ordinary observation metadata.
- `SupplyChainBoundaryTests`, `DataEgressPolicyTests`, `ShipmentProvenancePolicyTests`, and observation persistence tests cover refusal, bounded projection shape, private-note rejection, bearer-field redaction, missing/reordered custody, governance expiry/revocation, route conflicts, and the non-authorizing review-ready state.
- The Xcode project includes the tab and native security services in both iOS and macOS targets; the macOS target declares App Sandbox/Hardened Runtime settings.
- The view deliberately contains no scanner, device inspection, account lookup, remote reporting path, or attack workflow.

The native view preserves the original research document as a corpus reference. It does not embed or expand scenario material in the app, and it does not transform threat research into operational instruction.

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
- independently governed manifest/custody/inspection evidence adapters with a reviewed time source and verification method;
- documented, scoped governance and receiving-review roles with real-world separation-of-duties procedures; and
- independent security review and ownership of the relevant delivery systems.

Until that work exists, the correct model result for an unverified or authority-seeking relationship is **REFUSE**.
