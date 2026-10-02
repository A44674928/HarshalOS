# Storm-0558 legacy package — correction and status notice

document_id: `STORM-0558-LEGACY-STATUS-20261002`  
provenance_class: `DERIVATIVE_BUILD`  
status_taxonomy: `LEGACY_PACKAGE_NOTICE`  
evidence_status: `SUPERSEDED_SUMMARY_AND_UNVALIDATED_IDEAS`  

> This filename is retained for continuity only. It does **not** mean the incident analysis, detections, or SCAV++ integration are complete, validated, or production-ready.

## Current interpretation

The previous package text overclaimed that Storm-0558's key was proven to have been in a crash dump, treated speculative attack vectors as incident facts, described detections as production-ready, and labeled unrelated PDFs as supporting materials. Those claims are withdrawn.

Use these current documents instead:

- [`PROVENANCE.md`](./PROVENANCE.md) — source hierarchy and claim/file classification.
- [`README.md`](./README.md) — current package guide.
- [`STORM-0558-MASTER-ANALYSIS.md`](./STORM-0558-MASTER-ANALYSIS.md) — attributed public-source analysis.
- [`SCAV++-INTEGRATION.md`](./SCAV++-INTEGRATION.md) — conceptual, non-deployment crosswalk.
- [`DETECTION-RULES.md`](./DETECTION-RULES.md) — proposed, unvalidated defensive analytics.
- [`STORM-0558-ROADMAP.md`](./STORM-0558-ROADMAP.md) — suggested research sequence only.

## Corrections

- Microsoft's September 6, 2023 crash-dump account is its **leading hypothesis**, not a confirmed causal chain. Microsoft said it had not found a dump containing the impacted key or logs proving exfiltration.
- The March 20, 2024 CSRB review found no evidence/logs that the impacted key was in or exfiltrated from a crash dump and described Microsoft's earlier account as inaccurate.
- The CSRB records State Department anomaly detection on June 15, 2023 and notification to Microsoft on June 16. Attribute May 15 first access to Microsoft's timeline and include the Board's logging-limit caveat.
- The retained Stingray/Dirtbox, solar-chip, home-router, firmware, satellite, and “daisy chain” scenarios are author hypotheses, not Storm-0558 evidence.
- The pager/walkie-talkie report and the Salt Typhoon clipping are unrelated source material.
- Detection examples are research ideas and have not been validated or deployed by this package.

**Current public sources:** [Microsoft July 11, 2023](https://www.microsoft.com/en-us/msrc/blog/2023/07/microsoft-mitigates-china-based-threat-actor-storm-0558-targeting-of-customer-email) · [Microsoft September 6, 2023](https://www.microsoft.com/en-us/msrc/blog/2023/09/results-of-major-technical-investigations-for-storm-0558-key-acquisition) · [CISA CSRB March 20, 2024](https://www.cisa.gov/sites/default/files/2024-03/CSRB%20Review%20of%20the%20Summer%202023%20MEO%20Intrusion%20Final_508c.pdf).
