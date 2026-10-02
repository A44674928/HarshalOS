# Storm-0558 public-source review and study fixture

document_id: `STORM-0558-REVIEW-20261002`  
provenance_class: `DERIVATIVE_BUILD`  
status_taxonomy: `PUBLIC_SOURCE_STUDY`  
evidence_status: `MIXED_PUBLIC_RECORD_AND_UNVERIFIED_HYPOTHESIS`  

> **Scope:** This is a source-attributed public-record review and defensive research sketch. It is not a Microsoft or government incident report, a live threat feed, a complete victim inventory, or a production detection package. Do not infer that speculative hardware, Stingray/Dirtbox, solar-cell, or “daisy chain” scenarios occurred in Storm-0558.

## Start here

1. Read the [provenance register](./PROVENANCE.md) for source hierarchy, claim categories, and file-by-file status.
2. Read the [master analysis](./STORM-0558-MASTER-ANALYSIS.md) for the concise incident timeline and disputed key-acquisition account.
3. Use the [SCAV++ crosswalk](./SCAV++-INTEGRATION.md) as a conceptual mapping to repository research—not as evidence of deployment.
4. Treat the [detection research](./DETECTION-RULES.md) as proposed analytics that require local validation. It contains no claimed production-ready rule or Storm-0558-specific IOC set.
5. The [roadmap](./STORM-0558-ROADMAP.md) is a proposed research sequence, not an implementation or delivery claim.

## Public source baseline

| Source | What it establishes / how it is used |
|---|---|
| [Microsoft MSRC, July 11, 2023](https://www.microsoft.com/en-us/msrc/blog/2023/07/microsoft-mitigates-china-based-threat-actor-storm-0558-targeting-of-customer-email) | Microsoft's incident disclosure: forged tokens using an acquired MSA consumer signing key, affected mail services, and an estimate of approximately 25 affected organizations. |
| [Microsoft MSRC, September 6, 2023](https://www.microsoft.com/en-us/msrc/blog/2023/09/results-of-major-technical-investigations-for-storm-0558-key-acquisition) | Microsoft's technical account and **leading hypothesis** for acquisition through a 2021 crash-dump path; Microsoft said it had not found a dump containing the impacted key and lacked direct exfiltration logs. |
| [CISA CSRB, March 20, 2024](https://www.cisa.gov/sites/default/files/2024-03/CSRB%20Review%20of%20the%20Summer%202023%20MEO%20Intrusion%20Final_508c.pdf) | Later independent review: no evidence/logs showed the impacted key in or exfiltrated from a crash dump; the Board characterized Microsoft's earlier dump account as inaccurate. It records State Department anomaly detection June 15 and Microsoft notification June 16, 2023, and caveats the May 15 first-access date because of log-retention limits. |

**Bottom line:** Microsoft reported that a consumer signing key was used to forge enterprise-mail tokens and that a missing scope/issuer-validation check contributed to acceptance. The exact key-acquisition path is unresolved in the cited public record. The crash-dump account must remain an attributed, later-challenged Microsoft hypothesis—not a confirmed root cause.

## Package contents and provenance

- `PROVENANCE.md` — source hierarchy, evidence boundaries, unrelated-material inventory, and classification register.
- `STORM-0558-MASTER-ANALYSIS.md` — source-attributed incident summary.
- `SCAV++-INTEGRATION.md` — conceptual crosswalk to Harshal Systems research, including the limits of #003 and #008.
- `DETECTION-RULES.md` — unvalidated defensive detection ideas, not production rules.
- `STORM-0558-ROADMAP.md` — proposed research/validation sequence.
- `STORM-0558-COMPLETE.md` — legacy package guide, now a status and correction notice.
- `01-Attack-Vector-Solar-Panels.txt`, `02-Given-High-Value-Targets.txt`, `03-Kind-of-Spy-Thriller.txt` — author brainstorming; not incident evidence.
- `04-Re-examination-Storm-0558.txt` — excerpt of Microsoft's September 2023 technical post; read with the later CSRB review.
- `05-Supply-Chain-Attack-Vector-Report.pdf` — unrelated September 2024 pager/walkie-talkie attack report; not Storm-0558 evidence.
- `06-Dec-5th-2024.pdf` — unrelated Salt Typhoon news clipping; not Storm-0558 evidence.

Original files are retained. Their presence in this folder does not alter the scope labels above.

## Good Intelligence study fixture

`empty-demo-storm0558-001` is a **read-only, `[DEMO]` study fixture** in the empty.domains Good Intelligence feed. It summarizes published sources with explicit claim-status labels. It is not a live alert, a verified source attestation, an operational incident record, or proof that any detector fired. The fixture is intentionally unscored by assurance metadata.

## Repository relationship

The repository's [Threat Modeling and Context-Dependent Guarantees](../../../../docs/harshal-systems/16-threat-modeling.md) includes catalogue entry #003 (SCAV++ Output Verification Engine) and #008 (Stingray Counter Protocol). The crosswalk explains how these may be used as conceptual review lenses. Entry #008 describes a network-interception defense concept; **it does not indicate that a Stingray was used in Storm-0558**.

**Publishing hierarchy:** “The architecture (Book I) is the library. The novel (Book II) is the work in active production.” This research package remains `DERIVATIVE_BUILD`; its speculative scenarios are not canonical incident facts.
