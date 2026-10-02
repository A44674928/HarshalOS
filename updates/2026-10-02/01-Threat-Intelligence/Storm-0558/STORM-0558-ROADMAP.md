# Storm-0558 research and validation roadmap

document_id: `STORM-0558-ROADMAP-20261002`  
provenance_class: `DERIVATIVE_BUILD`  
status_taxonomy: `PROPOSED_RESEARCH_PLAN`  
evidence_status: `NOT_STARTED_OR_DEPLOYED_BY_THIS_DOCUMENT`  

> This is a suggested work sequence only. It does not record completed implementation, a four-week commitment, resource approval, production deployment, or validated outcomes. No incident response action should be initiated from this plan without the responsible organization's authorization.

## Phase A — source and claim review

- Use [`PROVENANCE.md`](./PROVENANCE.md) as the source register.
- Keep Microsoft's July incident disclosure and September leading hypothesis separate from the later CSRB review.
- Attribute May 15 to Microsoft's timeline and retain the CSRB's log-retention caveat.
- Keep author hypotheses and unrelated PDFs excluded from incident claims.

**Exit evidence:** an approved claim ledger with source, date, exact statement, status, reviewer, and superseding/qualifying source where relevant.

## Phase B — local threat-model review

- Identify whether the organization uses consumer and enterprise signing keys, shared key-metadata endpoints, or a library/configuration that can omit issuer/scope checks.
- Inventory identity, token-validation, signing-key, debug-artifact, mail-access, and audit-retention logs.
- Document local trust boundaries and explicitly state where information is unavailable.

**Exit evidence:** system-specific data-flow and logging map, signed off by the identity/security owners. This is not evidence that an environment was affected by Storm-0558.

## Phase C — controlled validation

- Test that a valid signature with an unauthorized issuer/key/audience/tenant combination is rejected before authorization.
- Exercise key rollover and expected exceptions.
- Validate any key-artifact scanning against synthetic test material in a sandbox; never use actual production secrets as a test fixture.
- Test proposed alert logic against approved benign and adversarial scenarios, then measure false positives and blind spots.

**Exit evidence:** reproducible test plan/results, limitations, and review approval. Proposed analytics remain non-production until separately accepted through change control.

## Phase D — governance and maintenance

- Assign owners for the claim ledger, control tests, audit coverage, and response playbooks.
- Define retention, privacy safeguards, escalation thresholds, and review cadence.
- Re-check Microsoft/CSRB source changes and update claim status when the public record changes.

**Exit evidence:** explicit operating authorization, privacy/security review, and a documented retest schedule.

## Repository integration

- Good Intelligence: read-only `[DEMO]` study fixture `empty-demo-storm0558-001`; no assurance signature or live alert status.
- SCAV++ crosswalk: conceptual review links to repository catalogue #003 and #008; #008 is not an incident claim.
- Detection ideas: [`DETECTION-RULES.md`](./DETECTION-RULES.md), status `PROPOSED_UNVALIDATED_ANALYTICS`.

**Publishing hierarchy:** “The architecture (Book I) is the library. The novel (Book II) is the work in active production.” This roadmap remains non-normative `DERIVATIVE_BUILD` material.
