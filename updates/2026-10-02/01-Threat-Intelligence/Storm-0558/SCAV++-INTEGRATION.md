# Storm-0558 to SCAV++ — conceptual crosswalk

document_id: `STORM-0558-SCAV-CROSSWALK-20261002`  
provenance_class: `DERIVATIVE_BUILD`  
status_taxonomy: `CONCEPTUAL_FRAMEWORK_CROSSWALK`  
evidence_status: `SOURCE_ATTRIBUTED_LESSONS_AND_PROPOSED_CONTROLS`  

> **Boundary:** The Storm-0558 public-source record does not establish a hardware, firmware, Stingray/Dirtbox, solar-chip, or decentralized “daisy chain” attack path. This document maps supported identity/key-management lessons to the repository's research vocabulary and keeps unrelated protocols separate. It does not claim that SCAV++ is deployed, that a control has been tested, or that the incident validates every component of the framework.

## Source baseline

Use the claim statuses and source links in [`PROVENANCE.md`](./PROVENANCE.md) and [`STORM-0558-MASTER-ANALYSIS.md`](./STORM-0558-MASTER-ANALYSIS.md): Microsoft reported a consumer signing key used to forge enterprise-mail tokens and a missing issuer/scope validation check; the exact acquisition path remains unresolved. The crash-dump story is Microsoft's September 2023 leading hypothesis, later challenged by the CSRB's March 2024 finding of no evidence/logs showing the impacted key in or exfiltrated from a dump.

## Crosswalk to existing Harshal Systems research

| Public-source lesson | Repository concept | Proposed review question | Status boundary |
|---|---|---|---|
| Signature validity is not the same as correct key/issuer/audience scope. | [`docs/harshal-systems/16-threat-modeling.md`](../../../../docs/harshal-systems/16-threat-modeling.md), catalogue entry **#003: SCAV++ Output Verification Engine**; [`docs/harshal-systems/20-supply-chain.md`](../../../../docs/harshal-systems/20-supply-chain.md). | Does the verifier bind key ID, issuer, audience, tenant, token type, and service decision together, and fail closed on mismatch? | Conceptual mapping to published Microsoft lesson; local implementation/testing not asserted. |
| The precise key-acquisition path can remain unknown when logs are missing. | #003's verification/evidence discipline and the repository's provenance conventions. | Are conclusions labeled `CONFIRMED`, `ATTRIBUTED_HYPOTHESIS`, or `UNKNOWN`; are logs sufficient to distinguish a path from a hypothesis? | Proposed audit question; does not claim the framework produced the CSRB finding. |
| Microsoft described controls around restricted key environments and later scanning/remediation. | SCAV++ supply-chain/key-lifecycle review. | Are key creation, debug artifacts, transfers, scan results, access, rotation, and retention observable and policy-bound? | Proposed control review; not a claim that a dump with the Storm-0558 key existed. |
| The CSRB's detection and notification dates differ from Microsoft's reported first-access date; retention limits qualify the timeline. | #003 output evidence review and incident chronology. | Does the record preserve each source's timestamp, clock basis, retention window, and uncertainty? | Source-attributed timeline; no independent “earliest possible access” date is asserted. |
| The repository includes a Stingray Counter protocol. | [`docs/harshal-systems/16-threat-modeling.md`](../../../../docs/harshal-systems/16-threat-modeling.md), catalogue entry **#008: The Stingray Counter Protocol**. | Keep a separate link only when a network-interception threat is independently in scope. | **No evidence in the cited Storm-0558 sources links a Stingray or cellular interception to this incident.** #008 is not a Storm-0558 TTP or finding. |

## Proposed integration shape

1. Maintain a versioned claim ledger with source URL, source date, exact claim, evidence status, later qualification, and reviewer.
2. Keep incident facts and unresolved causal hypotheses in separate fields. Do not let narrative or threat-taxonomy labels overwrite the source's uncertainty.
3. Test authentication validation against consumer/enterprise key-scope mismatches using a controlled fixture and the actual library/configuration under review.
4. Review key-material lifecycle and audit retention as general defensive topics. Keep them explicitly separate from a claim that a specific Storm-0558 crash dump or exfiltration event was observed.
5. Integrate the Good Intelligence fixture as a read-only, clearly labeled study item; it is not a live incident, source attestation, threat score, or SCAV++ detector output.

## Out of scope / not supported

- Stingray/Dirtbox, satellite interception, thin-film solar implants, compromised home routers, malicious firmware, pagers, and “daisy chain” devices as Storm-0558 incident facts.
- Claims that any rule here is “production-ready,” complete, validated, or guaranteed to detect the actor.
- Operational or normative changes to Harshal Systems without independent review, explicit provenance, and local authorization.

**Publishing hierarchy:** “The architecture (Book I) is the library. The novel (Book II) is the work in active production.” This crosswalk is `DERIVATIVE_BUILD`, not normative policy.
