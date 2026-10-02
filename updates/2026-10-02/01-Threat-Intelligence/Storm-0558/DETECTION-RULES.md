# Storm-0558 — proposed detection research

document_id: `STORM-0558-DETECTION-RESEARCH-20261002`  
provenance_class: `DERIVATIVE_BUILD`  
status_taxonomy: `PROPOSED_ANALYTICS`  
evidence_status: `UNVALIDATED`  

> **Not production-ready.** The items below are reviewable detection hypotheses derived from public reporting and general identity/key-management practice. They are not tested SIEM rules, vendor-ready Sigma, guaranteed detections, or observed Storm-0558 indicators. Each requires local data mapping, controlled tests, false-positive analysis, privacy review, and an operational owner. No Storm-0558-specific IPs, hashes, or other IOCs are asserted here.

## Evidence boundary

Microsoft reported that a consumer signing key was accepted for enterprise-mail tokens because the required issuer/scope validation was missing. Microsoft's proposed 2021 crash-dump acquisition path was a **leading hypothesis**, not a proven chain; Microsoft said it found no dump containing the impacted key and lacked direct exfiltration logs. The CSRB later found no evidence/logs that the key was in or exfiltrated from a crash dump and described Microsoft's earlier account as inaccurate. See [`PROVENANCE.md`](./PROVENANCE.md).

The crash-dump and key-lifecycle analytics below are general defense-in-depth ideas. They do **not** assert that a key-bearing Storm-0558 dump existed.

## Research rule index

| ID | Proposed analytic | Minimum telemetry | State |
|---|---|---|---|
| `STORM0558-R01` | Signing-key scope / issuer mismatch | Token validation events; key ID and metadata; issuer, tenant, audience, token type, service, result | Proposed; validate locally |
| `STORM0558-R02` | Restricted key material crosses an approved boundary | Key-management events; artifact classification; dump/export/transfer/access audit events | Proposed; no Storm-specific dump indicator |
| `STORM0558-R03` | Mail access inconsistent with token / session context | Token issuance and validation; mailbox audit; client/application, tenant, source network, session identifiers | Proposed; baselining required |
| `STORM0558-R04` | Critical logging / retention gap | Retention configuration and source-health events across identity, key, debug, and mail systems | Proposed control-monitoring analytic |

## Proposed analytic details

### STORM0558-R01 — key scope and issuer consistency

**Intent:** Detect or prevent an authentication decision where a token is cryptographically valid but its signing key or issuer is not permitted for the requested tenant, audience, token type, or service.

```text
on token_validation:
  expected = policy_for(requested_service, tenant, token_type)
  if signature_valid
     and (key_id, issuer, audience, tenant, token_type) does not match expected:
       reject_before_authorization()
       emit structured mismatch event()
```

**Safety requirements:** This should be enforced by an authoritative validation library/configuration, not only a downstream alert. Match against versioned trust metadata; account for legitimate key rollover; log enough to investigate without recording token secrets. Test both positive and negative cases, including consumer/enterprise separation. The pseudocode is illustrative, not drop-in implementation.

### STORM0558-R02 — key-material boundary review

**Intent:** Identify unexpected handling or movement of signing-key material or key-bearing artifacts, such as access to a restricted key store, export, debug snapshot, or transfer across trust zones.

**Candidate signals:** Key-management audit events, approved artifact classification, dump creation/transfer records, access-policy decisions, scanner version/result, and exception approvals. Prefer provider-supported key identifiers and protected artifact metadata over naïve string matching. Do not copy secrets into the alert.

**Caveat:** A signal indicates a policy review or investigation is needed; it does not prove a key was in a crash dump, that a Storm-0558 actor accessed it, or that the historical acquisition path is known.

### STORM0558-R03 — mailbox access correlation

**Intent:** Correlate mailbox operations with the identity and token context actually used by the service.

**Candidate signals:** Unusual mailbox access relative to a tenant's baseline, novel application/client combinations, unusual session or source context, identity risk events, and a mismatch between token audience/issuer/key metadata and the resource accessed. Use multiple independent signals; a location or volume anomaly alone is not attribution.

**Validation:** Replay benign and adversarial test cases in a controlled tenant, quantify false positives, and document which audit sources can be incomplete or delayed. No public-source IOCs are supplied by this package.

### STORM0558-R04 — evidence-retention and sensor-health gap

**Intent:** Alert when logs needed to investigate signing-key, token-validation, debug-artifact, or mail-access events are disabled, incomplete, or expiring before the locally approved retention period.

**Candidate signals:** Audit pipeline health, expected event-volume gaps, retention-policy drift, clock synchronization state, and source coverage. A logging gap is an observability/control issue; it does not establish that an intrusion occurred.

## Review and deployment checklist

Before any operational use:

1. Map every field to real provider telemetry and document field semantics, clock basis, and retention.
2. Confirm that identifiers are stable and sensitive token/key values are never exposed in alerts.
3. Test positive, negative, rollover, malformed-token, missing-log, and exception cases in a controlled environment.
4. Measure false-positive/false-negative behavior against a representative dataset; publish limitations.
5. Set response actions proportionate to evidence. A mismatch may justify fail-closed authentication; an anomaly alert alone must not trigger unsupported attribution or disruptive containment.
6. Record reviewer, version, deployment owner, change-control process, and periodic retest date.

Until that work is done, these remain **proposed research ideas**. Do not call them “production-ready,” “validated,” “complete,” or “100% coverage.”

## Explicitly excluded ideas

The retained author notes discuss Stingray/Dirtbox devices, thin-film solar chips, home routers, firmware implants, satellite links, and decentralized device chains. The cited Storm-0558 record does not support these as incident methods. Accordingly, this document provides **no** Storm-0558 detection rule for those ideas. The repository's #008 Stingray Counter protocol is a separate conceptual research item, not evidence of a cellular-interception TTP in this incident.
