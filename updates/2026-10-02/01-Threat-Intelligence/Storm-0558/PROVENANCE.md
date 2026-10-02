# Storm-0558 source and provenance register

document_id: `STORM-0558-PROVENANCE-20261002`  
provenance_class: `DERIVATIVE_BUILD`  
status_taxonomy: `SOURCE_AND_CLAIM_REGISTER`  
evidence_status: `MIXED_PUBLIC_RECORD_AND_UNVERIFIED_HYPOTHESIS`  
research_layer: `PUBLIC_RESEARCH_SUMMARY`

## Scope and reading rule

This folder is a derivative public-source review, not a Microsoft incident report, a government attribution, a live threat feed, or a deployable detection package. Use the three external primary/official references below for incident facts. Attribute statements to their source and date. A later source may correct an earlier account. Keep **reported facts**, **attributed hypotheses**, **author speculation**, **unrelated source material**, and **proposed defensive analytics** in separate categories.

The archived files remain in place for provenance and continuity. Their inclusion in this directory does not make them evidence about Storm-0558. Do not promote an author's scenario, a copied headline, or a proposed detector to incident fact or operational status.

## Public source hierarchy

1. **Microsoft MSRC, July 11, 2023 — incident disclosure:** [Microsoft mitigates China-based threat actor Storm-0558 targeting of customer email](https://www.microsoft.com/en-us/msrc/blog/2023/07/microsoft-mitigates-china-based-threat-actor-storm-0558-targeting-of-customer-email). Microsoft described forged tokens using an acquired Microsoft account (MSA) consumer signing key, the affected mail services, and approximately 25 affected organizations. Claims in this post are attributed to Microsoft.
2. **Microsoft MSRC, September 6, 2023 — technical investigation:** [Results of major technical investigations for Storm-0558 key acquisition](https://www.microsoft.com/en-us/msrc/blog/2023/09/results-of-major-technical-investigations-for-storm-0558-key-acquisition). Microsoft called the 2021 crash-dump path its **leading hypothesis**. It also said it had not found a crash dump containing the impacted key and lacked logs showing the actor's specific exfiltration. This is an attributed hypothesis, not proof that the key was in a dump.
3. **CISA Cyber Safety Review Board, March 20, 2024 — later independent review:** [Review of the Summer 2023 Microsoft Exchange Online Intrusion](https://www.cisa.gov/sites/default/files/2024-03/CSRB%20Review%20of%20the%20Summer%202023%20MEO%20Intrusion%20Final_508c.pdf). The Board found no evidence or logs showing that the impacted key was in, or exfiltrated from, a crash dump and described Microsoft's earlier crash-dump account as inaccurate. The Board reports State Department anomalies detected June 15, 2023 and Microsoft notified June 16. It notes that Microsoft attributed first access to May 15, while log-retention limits meant the activity window may have begun earlier.

When describing an event date, say **“Microsoft reported…”** or **“the CSRB found…”** as appropriate. Do not state May 15 as an independently established earliest access date.

## Claim categories

### Publicly reported incident facts (source-attributed)

- Microsoft attributed the activity to the China-based threat actor it tracks as Storm-0558 and reported that the actor used forged tokens signed with an acquired MSA consumer signing key to access enterprise email services.
- Microsoft reported approximately 25 affected organizations. The number is Microsoft's public estimate, not a complete independent victim census.
- Microsoft's July and September posts describe a missing key-scope/issuer-validation check in a converged identity path: cryptographic signature validation alone did not ensure that a consumer signing key was appropriate for an enterprise-mail token. Microsoft reported remediations.
- The CSRB records State Department detection of anomalous activity on June 15, 2023 and notification to Microsoft on June 16, 2023.

### Attributed but unresolved or later challenged

- In September 2023, Microsoft described a 2021 signing-system crash, a race condition, movement of a crash dump to a corporate debugging environment, and access to that environment through a compromised employee account as its **leading acquisition hypothesis**. Microsoft said it had not found a dump containing the impacted key and did not have logs proving the actor's exfiltration path.
- In March 2024, the CSRB found no evidence/logs that the impacted key was present in or exfiltrated from a crash dump and characterized Microsoft's earlier account as inaccurate. The crash-dump explanation must therefore remain attributed and contested, not be summarized as the confirmed root cause.
- “May 15, 2023 first access” is Microsoft's reported timeline. The CSRB cautions that limited log retention may leave an earlier start undetected.

### Author-generated hypotheses — not incident evidence

`01-Attack-Vector-Solar-Panels.txt`, `02-Given-High-Value-Targets.txt`, and `03-Kind-of-Spy-Thriller.txt` are retained author brainstorming (`DERIVATIVE_BUILD`; `UNVERIFIED_AUTHOR_HYPOTHESIS`). Their home-router/firmware, Stingray/Dirtbox, thin-film-solar-powered implant, IoT, satellite, and decentralized “daisy chain” scenarios are not supported by the cited Storm-0558 sources. Do not attribute those methods to Storm-0558, present them as observed TTPs, or use them to imply attribution.

### Unrelated source material — retained, not evidence for Storm-0558

| Archived file | What it is | Scope status |
|---|---|---|
| `05-Supply-Chain-Attack-Vector-Report.pdf` | A September 2024 author-supplied “Supply Chain++” report concerning explosive devices hidden in pagers/walkie-talkies; it is not about Storm-0558. | `DERIVATIVE_BUILD` · `UNRELATED_CASE_STUDY` |
| `06-Dec-5th-2024.pdf` | A December 5, 2024 Tom's Guide clipping about the Salt Typhoon telecommunications intrusion and cross-platform texting. | `DERIVATIVE_BUILD` · `UNRELATED_NEWS_CLIPPING` |

Neither PDF substantiates Storm-0558 attribution, access, key acquisition, or detection. Keep them out of incident claims and Storm-specific Good Intelligence fixtures.

## File-by-file status

| File | Artifact provenance | Evidence/status | Use |
|---|---|---|---|
| `04-Re-examination-Storm-0558.txt` | `DERIVATIVE_BUILD` excerpt of a `CANONICAL_SOURCE` (Microsoft MSRC, Sept. 6, 2023) | `ATTRIBUTED_HYPOTHESIS; LATER_CHALLENGED_BY_CSRB` | Historical source excerpt only; read with the March 2024 CSRB report. |
| `STORM-0558-MASTER-ANALYSIS.md` | `DERIVATIVE_BUILD` | `PUBLIC_SOURCE_SYNTHESIS` | Concise source-attributed incident account. |
| `SCAV++-INTEGRATION.md` | `DERIVATIVE_BUILD` | `CONCEPTUAL_CROSSWALK` | Proposed mapping to repository research; not evidence of operational integration. |
| `DETECTION-RULES.md` | `DERIVATIVE_BUILD` | `PROPOSED_UNVALIDATED_ANALYTICS` | Defensive research ideas requiring local telemetry, testing, review, and tuning. |
| `STORM-0558-ROADMAP.md` | `DERIVATIVE_BUILD` | `PROPOSED_RESEARCH_PLAN` | Suggested validation sequence only; no delivery or deployment is claimed. |
| `README.md`, `STORM-0558-COMPLETE.md` | `DERIVATIVE_BUILD` | `PACKAGE_GUIDES` | Navigation and caveats; not independent sources. |
| `01-*.txt`, `02-*.txt`, `03-*.txt` | `DERIVATIVE_BUILD` | `UNVERIFIED_AUTHOR_HYPOTHESIS` | Preserve as brainstorming; do not cite as incident facts. |
| `05-*.pdf`, `06-*.pdf` | `DERIVATIVE_BUILD` | `UNRELATED_TO_STORM_0558` | Preserve as unrelated source material only. |

## Repository integration boundary

The Good Intelligence item `empty-demo-storm0558-001` is a clearly labeled **read-only training fixture** that points readers to this register and the primary sources. It is not a live alert, not a signed source attestation, not a verified victim record, and not a detector result. Proposed mappings to SCAV++ catalogue entries #003 and #008 are documented as conceptual crosswalks; in particular, the repository's Stingray Counter (#008) is not evidence of a Stingray role in Storm-0558.

**Publishing hierarchy:** “The architecture (Book I) is the library. The novel (Book II) is the work in active production.” This register is a derivative research aid; public incident reporting remains source-attributed and non-normative.
