# Defensive shipping-provenance baseline

**Status:** implemented local verifier (`HOS-SHIPMENT-PROVENANCE-1`) — generic defensive evidence control, not logistics control or release authority.

## Purpose

A component or shipment record must **not** be accepted merely because it is present, because an explanation is supplied after the fact, or because an uncontrolled network reports that it traversed a route.

`ShipmentProvenanceBaseline` in `HarshalCore` provides a narrow, fail-closed cryptographic continuity check for a pre-registered record. It evaluates whether supplied records bind together under a deployment-supplied, role-scoped public-key trust store. Its only successful state is:

```text
VERIFIED_CONTINUITY_NOT_RELEASE_AUTHORITY
```

That state means the exact supplied evidence sequence verifies. It is never an authorization to release, deploy, transport, reroute, install, operate, buy, sell, export, or take an external action.

## Required pre-existing evidence

Before continuity can verify, all of the following must already exist:

1. **Signed origin/release manifest** — binds canonical component ID, lot ID, SHA-256 component/evidence digest, issuing origin-key ID, issue time, and expiry.
2. **Signed scoped route authorization** — binds the same component ID and digest to a finite, ordered list of expected checkpoint IDs, a route ID, issuing route-authority key ID, issue time, and expiry.
3. **Complete dual-signed custody sequence** — one receipt for every expected checkpoint. Each receipt binds the component/digest, route, sequence number, expected checkpoint, prior receipt digest, handoff-evidence digest, time, sender key ID, and receiver key ID. Sender and receiver must be distinct, enrolled custody keys and must both sign the exact same canonical payload.
4. **Current signed revocation snapshot** — a separately enrolled revocation-authority key signs a bounded snapshot of revoked signer IDs, component IDs/digests, and route IDs. The snapshot must be current and must not revoke any record or signer used by the continuity chain. An absent or expired snapshot fails closed.
5. **Accountable review record** — a separately enrolled reviewer key signs a bounded `CONTINUITY_REVIEW` record after the final custody handoff. It binds the exact component/digest, route, final receipt digest, accountable review reference, separately retained review-evidence digest, issue time, and expiry.
6. **Trust-store enrollment and separation of duties** — origin, route-authority, custody, revocation-authority, and reviewer keys must already be in the caller-provided trust store with their exact scoped roles. One public key cannot be enrolled under multiple IDs. Origin, route, revocation, custody, and final-review evidence are separated in the verified chain; naming a new signer in an incoming record does not enroll it.
7. **Freshness** — all signed evidence must be active at the supplied local evaluation time, and the manifest, route, revocation snapshot, and review must remain unexpired.

The verifier uses domain-separated, length-delimited canonical signing payloads and CryptoKit Ed25519 (`Curve25519.Signing`) verification. Receipt chaining commits the next handoff to the prior receipt’s payload and both signatures, making ordinary substitution and reordered/replayed chain records detectable.

## Fail-closed outcomes

Every unsuccessful check returns:

```text
HOLD_FOR_AUTHORIZED_REVIEW
```

The result includes a stable reason code, such as:

| Condition | Hold code |
| --- | --- |
| Origin, route, revocation snapshot, or accountable review expired | `MANIFEST-EXPIRED` / `ROUTE-AUTHORIZATION-EXPIRED` / `REVOCATION-SNAPSHOT-EXPIRED` / `ACCOUNTABLE-REVIEW-EXPIRED` |
| A current signed snapshot revokes a signer, component/digest, or route | `EVIDENCE-REVOKED` |
| Origin/route/revocation/reviewer signer absent from the scoped trust store | `ORIGIN-SIGNER-UNTRUSTED` / `ROUTE-SIGNER-UNTRUSTED` / `REVOCATION-SIGNER-UNTRUSTED` / `REVIEWER-UNTRUSTED` |
| Altered signed record | `ORIGIN-SIGNATURE-INVALID` / `ROUTE-SIGNATURE-INVALID` |
| Route does not bind the origin component digest | `ROUTE-DOES-NOT-BIND-MANIFEST` |
| Missing or surplus custody handoffs | `CUSTODY-SEQUENCE-INCOMPLETE` |
| Wrong component, route, sequence, checkpoint, or prior receipt digest | `CUSTODY-RECEIPT-MISMATCH` |
| Unknown custody key or absent role | `CUSTODY-SIGNER-UNTRUSTED` |
| Missing/invalid sender or receiver signature | `CUSTODY-SIGNATURE-INVALID` |
| Origin, route, revocation, or custody role reuse violates separation of duties | `ROLE-SEPARATION-OF-DUTIES-FAILED` |
| Review does not bind the exact final receipt, is not independently signed, or reuses an operational/revocation key | `REVIEW-DOES-NOT-BIND-CONTINUITY` / `REVIEW-SIGNATURE-INVALID` / `REVIEW-SEPARATION-OF-DUTIES-FAILED` |

There is intentionally no post-hoc normalization, “accept regardless of arrival,” manual verified selector, automatic reroute, or external-action path. A router/network observation has no input field capable of replacing the signed origin, route, or dual-custody evidence.

A reported routing anomaly—including a suspected compromised router—is only an **unproven incident hypothesis** unless separately investigated through an authorized process. It can be retained outside this baseline as evidence for review, but it cannot identify an attacker, location, country, or intent and cannot turn a held record into an accepted one.

## Implementation boundary

| Location | Role |
| --- | --- |
| `Packages/HarshalCore/Sources/HarshalCore/ShipmentProvenanceBaseline.swift` | Pure, cryptographic record schemas, scoped trust store, strict verifier, and stable hold codes. |
| `Packages/HarshalCore/Tests/HarshalCoreTests/ShipmentProvenanceBaselineTests.swift` | Generated-key tests for a valid chain and altered, missing, deviated, replayed, revoked, unknown-signer, one-sided-signature, self-review, invalid-review, and validation-on-decode failures. |
| `HarshalNative/Features/SupplyChainView.swift` | Native status/limits presentation only. It intentionally has no shipment-record entry, signer enrollment, acceptance, or external-control UI. |

The dashboard’s **No active shipment decision** state is deliberate: the checked-in app ships no organization’s real trust store, keys, routing data, or authorized review process. Any future deployment must obtain those through separately owned, reviewed key-management and evidence-governance processes; it must not ask an end user to self-enroll keys or label a record verified.

## Important limits

The verifier can check only the supplied signatures, enrolled key roles, record bindings, receipt order, and a local clock comparison. It cannot independently:

- inspect a physical component or shipment;
- prove possession, real-world custody, or that a route occurred;
- establish signer identity, authority, honesty, intent, consent, or freedom from coercion;
- trust an unmanaged network device or detect all key/device compromise;
- obtain trusted time by itself;
- establish whether a deployment’s signed revocation snapshot is complete, timely, independently governed, or safely distributed; it can only enforce revocations named in the current supplied snapshot;
- halt a real-world shipment, conduct a physical investigation, reroute goods, or grant release/deployment authority.

Accordingly, a production deployment needs independent accountable governance for signer enrollment, separation of duties, release authorization, key rotation/revocation, trusted time, evidence retention, incident handling, reviewer scope/expiry, and physical inspection. Those controls are deliberately outside this generic local app model.

## Relationship to SCAV++

The AGS v0.2 corpus-informed SCAV++ boundary protects app-controlled interfaces from being silently adopted as a downstream authority or integration component. Published Part XVIII supplies conceptual accountability/restraint principles; published Part XIX remains an accurately labeled threat-research catalog boundary, not an imported workflow. This shipping-provenance baseline is separate: it verifies a supplied, scoped chain of generic records without exposing a shipping-control API. Neither control gives HarshalOS authority over external systems or real-world logistics.
