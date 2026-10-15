# Ground-0 Automatic Audit Template — v1.0

**Purpose:** a public-evidence audit packet an external research application can prepare as Markdown. No API key needs to be stored in or sent from the HarshalOS website, and no browser model connection or access to private site data is required. The packet is designed for a later repository refresh command to parse and run through the deterministic Ground-0 engine.

**Target specification:** Ground-0 Phase Detection Algorithm **v1.0**. This template follows the v1.0 method in [Book I, Part XI of the print source](../publications/book/AGS-v0.2-Harshal-s-Systems-Full-Book-PRINT-SOURCE-2026-10-07.txt) and the repository's [normative v1.0 specification](../specs/normative/ground-0-v1.0.md). It does **not** silently incorporate the ratified [v1.1 normative amendment](../specs/normative/ground-0-v1.1.md) or the v1.2 issuer layer.

> **Current status:** This is the template only. A GitHub upload/refresh command is not wired up yet. The machine block is an input packet, not a computed result. All submitted work is `UNREVIEWED`; HarshalOS can process submitted evidence but must not imply that it discovered or independently verified that evidence. AI-produced answers, citations, hashes, and classifications are not independent verification or certification.

---

## Instructions for the external research application

Prepare **one file per audited entity and scope**. Use public sources only. Preserve the machine block's keys, array order, marker comments, and section headings exactly; replace values, not structure.

1. Record the entity name, identifier (if available), exact scope, audit timestamp, and context. Do not silently broaden a service, product, subsidiary, or event audit into an entity-wide finding.
2. Use only publicly accessible artifacts. For every evidence item, provide the canonical URL, a direct link or fragment when available, publication/effective date, retrieval timestamp, page/section/paragraph locator, a short exact quotation, and the specific observable claim it supports.
3. For each B1–B5 and C1–C4 input, `true` means YES, `false` means NO, and `null` means the answer is not demonstrated from the supplied public record. `null` is never a negative finding. Do not infer an answer merely because a source was not found; disclose the bounded search and evidence gap. Every B1–B5 answer must be binary for a complete audit. Under v1.0, C1–C4 are assessed only if Step 3 is AMBIGUOUS; if it is not, leave their values `null` and mark them `NOT_ASSESSED` in `gap`. If Step 3 is AMBIGUOUS, all four C answers must be binary and evidenced for a complete audit. The later refresh must enforce this applicability rule, never coerce `null` to `false`, and reject or quarantine any other unresolved packet as incomplete.
4. For `true` or `false`, `source` must match a URL in the evidence register and `notes` must identify the source ID, observable claim, and locator. For `null`, do not invent a source; `source`/`date` may be empty, but `gap` must describe the bounded search or missing evidence. `date` is the cited artifact's publication or effective date, not the retrieval date; use `YYYY-MM-DD` or an ISO-8601 timestamp with timezone.
5. Copy a PDH exactly when one is supplied. Do not invent header fields, signatures, public keys, or a valid status. If there is no PDH, leave the PDH inputs empty; behavioral detection still proceeds.
6. For links intended for the later in-OS evidence popup, set `directUrl` to the most specific stable URL available (for example, an HTML anchor or PDF page fragment). Always keep `locator` as a human-readable fallback because many sites cannot deep-link to a passage.
7. The external application may fill `candidateResult` as a **candidate only**. It must not present its own calculation as the site engine's result. A later refresh must recompute the result from the machine input and disclose any disagreement.
8. Do not include private material, credentials, API keys, cookies, personal data, unpublished sources, or private conversation content. Nothing in this file requires a request to HarshalOS.

The only canonical machine input is the JSON object between `G0_AUDIT_INPUT_START` and `G0_AUDIT_INPUT_END`. Narrative prose elsewhere may explain the record, but a refresh tool must not use free-form prose to guess missing machine fields.

<!-- G0_AUDIT_INPUT_START -->
```json
{
  "schema": "harshalos-ground0-audit-input-v1",
  "specificationVersion": "1.0",
  "metadata": {
    "auditTimestamp": "",
    "context": "",
    "scope": "",
    "producer": {
      "application": "",
      "modelLabel": "",
      "humanOperator": ""
    },
    "status": "UNREVIEWED"
  },
  "input": {
    "name": "",
    "identifier": "",
    "version": "1.0",
    "cutoff": "",
    "answers": [
      { "value": null, "source": "", "date": "", "notes": "", "gap": "" },
      { "value": null, "source": "", "date": "", "notes": "", "gap": "" },
      { "value": null, "source": "", "date": "", "notes": "", "gap": "" },
      { "value": null, "source": "", "date": "", "notes": "", "gap": "" },
      { "value": null, "source": "", "date": "", "notes": "", "gap": "" }
    ],
    "constraints": [
      { "value": null, "source": "", "date": "", "notes": "", "gap": "" },
      { "value": null, "source": "", "date": "", "notes": "", "gap": "" },
      { "value": null, "source": "", "date": "", "notes": "", "gap": "" },
      { "value": null, "source": "", "date": "", "notes": "", "gap": "" }
    ],
    "b4": {
      "actor": "",
      "action": "",
      "procedure": "",
      "basis": "NOT_DEMONSTRATED",
      "numerator": "",
      "denominator": "",
      "complete": false,
      "start": "",
      "end": ""
    },
    "c2": {
      "route": false,
      "invoked": false,
      "complete": false,
      "numerator": "",
      "denominator": "",
      "start": "",
      "end": ""
    },
    "external": {
      "exists": false,
      "exercised": false,
      "holder": "",
      "scope": "",
      "source": "",
      "date": ""
    },
    "decrement": {
      "enabled": false,
      "oldSource": "",
      "newSource": "",
      "oldDate": "",
      "newDate": "",
      "notes": ""
    },
    "headerText": "",
    "publicKeyText": "",
    "trustedOrigin": "0•000•000•0000"
  },
  "evidence": [
    {
      "id": "E1",
      "title": "",
      "url": "",
      "directUrl": "",
      "sourceType": "",
      "publicationDate": "",
      "effectiveDate": "",
      "retrievedAt": "",
      "locator": "",
      "exactQuote": "",
      "claimSupported": "",
      "evidenceClass": "",
      "supports": []
    }
  ],
  "temporalHistory": [],
  "candidateResult": {
    "declaredPhase": "",
    "detectedPhase": "",
    "complianceStatus": "",
    "confidence": "",
    "severity": "",
    "badgeStatus": "",
    "finding": ""
  }
}
```
<!-- G0_AUDIT_INPUT_END -->

### Machine-block field contract

- `metadata.auditTimestamp`: ISO-8601 timestamp with a timezone. Use the time the audit packet is finalized, not the date of the newest source; it must not precede any cited `retrievedAt` timestamp.
- `input.answers`: positions 1–5 are B1–B5 in the order below. `input.constraints`: positions 1–4 are C1–C4. Do not reorder or omit entries. Every item needs an explicit `true`, `false`, or `null` plus the corresponding source/claim or evidence gap. For a complete packet, all B values must be binary; C values must be binary if Step 3 is AMBIGUOUS, otherwise keep them `null` and explain `NOT_ASSESSED — Step 3.5 not triggered` in each `gap`. Any other unresolved `null` keeps the packet incomplete; never turn it into a completed result.
- `input.headerText`, `input.publicKeyText`, and `input.trustedOrigin`: raw declaration, its public verification key, and the claimed trusted origin. Leave the first two empty when no PDH is provided. A supplied key is input to validation, not proof of identity.
- `input.cutoff` is required by the current engine's ingestion interface, not specified as a v1.0 phase criterion. Set it to the UTC calendar date of `metadata.auditTimestamp`. It is an inclusive date-only boundary; do not cite any artifact known to have been published/effective after the audit timestamp. The future importer must reject dates after the declared audit time rather than relying on the date-only engine cutoff alone. The current engine also applies its v1.0 C1 24-month and C4 12-month lookbacks from this cutoff; those are date-eligibility checks, not new phase criteria.
- The current engine input shape also contains `input.b4`, `input.c2`, `input.external`, and `input.decrement`. For a v1.0 packet these are supplemental implementation fields, not additional decision rules: `input.b4.actor`, `action`, and `procedure` may describe the v1.0 B4 evidence; keep `input.b4.basis` at `NOT_DEMONSTRATED` and the v1.1-specific `input.c2`, `input.external`, and `input.decrement` values at their starter defaults. Those defaults are placeholders, not negative findings or answer values. The operative B4 answer is `input.answers[3]`; score B4 and C1–C4 only through the explicit v1.0 `answers` and `constraints` vectors. Do not apply a v1.1 B4 threshold, C2 outcome-set predicate, external-authority extension, or decrement rule.
- The starter E1 object in `evidence` is a placeholder, not a source. Replace it with one fully populated object per artifact, or replace the array with `[]` if no artifact is cited. Never submit an untouched placeholder or invent values. Give each item a unique ID; `supports` is an array containing only the applicable `B1`–`B5`/`C1`–`C4` codes. Each populated item has `id`, `title`, `url`, `directUrl`, `sourceType`, `publicationDate`, `effectiveDate`, `retrievedAt`, `locator`, `exactQuote`, `claimSupported`, `evidenceClass`, and `supports`. `sourceType` should be one of `official`, `court`, `regulatory`, `legislative`, `news`, `archive`, or `public`. `evidenceClass` must distinguish `INDEPENDENTLY_VERIFIABLE` from `AUTHOR_REPORTED`; author analysis is not a public artifact.
- For each answer, `source` is the primary evidence URL, `date` is its publication/effective date, and `notes` identifies the evidence ID and the observable claim. Use additional evidence IDs in the source item's `supports` list. For an unresolved `null`, use no invented source and document the gap. For a C value left `null` because Step 3.5 was not triggered, set `gap` to `NOT_ASSESSED — Step 3.5 not triggered; Step 3 result: [phase]`. A bounded search or missing evidence is not a conclusion.
- Never substitute `retrievedAt` for an unknown publication/effective date. If the artifact date is not established, leave that date empty and describe the gap; do not use an undated artifact as a qualifying dated input.
- `temporalHistory` contains only prior records for the same entity identifier that are supplied or already present in the repository. Do not invent prior declarations or phases. Use an empty array when none are available.
- `candidateResult` is deliberately non-authoritative. The future refresh command must recompute it; it may replace or reject the candidate. It must never be presented as independently reviewed.

---

## Audit record body

Use the following sections in the submitted `.md` file. The evidence details live in the JSON source register above; cite evidence IDs (`E1`, `E2`, …) here rather than copying the same source metadata into multiple places.

# Ground-0 Audit: [Entity] — [Scope]

**Specification:** Ground-0 v1.0 (normative textbook version)  
**Audit timestamp:** [ISO-8601]  
**Context / scope:** [precise subject, system boundary, jurisdiction, and question]  
**Evidence status:** `UNREVIEWED` · **Prepared with:** [external application/tool, if disclosed]

## Executive summary — candidate, not engine output

[Two or three sentences describing the question, the evidence boundary, and the candidate finding. Do not claim certification, legal judgment, intent, independent review, or a site-computed result.]

## Step 1 — Phase Declaration Header (PDH) validation

- **PDH supplied:** [YES / NO]
- **Raw PDH:** [copy exactly, or `NONE SUPPLIED`]
- **Header-ID:** [value or `N/A`]
- **Creator-ID:** [value or `N/A`]
- **Center-Origin:** [value or `N/A`]
- **Declared-Phase:** [NAB / CWO / GSRB / NONE]
- **Center-Capability:** [value or `N/A`]
- **Legitimacy-Source:** [value or `N/A`]
- **Refusal-Semantics:** [value or `N/A`]
- **Symbolism-Executability:** [value or `N/A`]
- **Time-Authority-Effect:** [value or `N/A`]
- **Effective-Timestamp:** [ISO-8601 or `N/A`]
- **Declaration-Hash / signature material:** [value or `N/A`]
- **Candidate structural / signature / freshness / consistency observations:** [state what was checked and by what evidence; do not claim cryptographic success unless actually verified]

A missing or invalid PDH does not stop behavioral detection. It means there is no valid declared phase to compare. The refresh engine, not the external application, is authoritative for the validation result.

## Step 2 — Behavioral audit (B1–B5)

Answer from publicly observable evidence. The question's truth value and the evidence supporting it are separate: a `null` input means not demonstrated, not a negative finding.

### B1 — Can compliance be coerced?

**Definition:** Does the entity impose penalties, access restrictions, funding cuts, or other negative consequences on entities that do not follow its directives?

Evidence examples in v1.0 include funding tied to stated requirements, license/charter revocation, access restrictions or deplatforming, fines, employment termination, and documented enforcement actions.

- **Candidate answer:** [YES / NO / NOT DEMONSTRATED]
- **Evidence IDs:** [E…]
- **Observable claim and exact quotation:** [short claim; quote is in the evidence register]
- **Evidence gap / bounded search:** [what was searched, where, and for what period]

### B2 — Can decisions be ignored without consequence?

**Definition:** If an entity does not follow the institution's decision or directive, can it proceed without penalty?

Evidence examples in v1.0 include absence of an enforcement mechanism, advisory or voluntary decisions, documented non-compliance without penalty, non-binding statements, and decisions that can be legally challenged or overturned.

- **Candidate answer:** [YES / NO / NOT DEMONSTRATED]
- **Evidence IDs:** [E…]
- **Observable claim and exact quotation:** [short claim; quote is in the evidence register]
- **Evidence gap / bounded search:** [what was searched, where, and for what period]

### B3 — Do rules/words activate real-world effects?

**Definition:** When the institution issues guidance, policy, or directives, do observable changes occur downstream in behavior, enforcement, or resource allocation?

Evidence examples in v1.0 include implementation by downstream actors, rules embedded in law/regulation/contracts, operational changes, effects on markets/speech/access, and a documented institution-to-world cascade.

- **Candidate answer:** [YES / NO / NOT DEMONSTRATED]
- **Evidence IDs:** [E…]
- **Observable claim and exact quotation:** [short claim; quote is in the evidence register]
- **Evidence gap / bounded search:** [what was searched, where, and for what period]

### B4 — Can refusal or appeal reliably stop action?

**Definition:** If an entity refuses to comply or appeals a decision, is there a mechanism that reliably halts the institution's action?

Evidence examples listed in v1.0 include a formal appeal process with defined success criteria, court review, legislative override/repeal, penalty-free exit, and a historical pattern of successful appeals. Record the actor, action, procedure, and any observed result the source supplies; identify which v1.0-listed evidence type supports the answer. Do not describe a proposed mechanism as an existing one.

- **Candidate answer:** [YES / NO / NOT DEMONSTRATED]
- **Actor / affected party:** [who refused, appealed, or exercised review]
- **Action at issue:** [the specific action that was or was not stopped]
- **Procedure and result:** [appeal/override/exit process and observed outcome]
- **Evidence IDs:** [E…]
- **Evidence gap / bounded search:** [what was searched and what remains unknown]

### B5 — Do rules persist by default over time?

**Definition:** Once a rule or decision is issued, does it remain in effect indefinitely unless actively changed, or do rules automatically expire and require renewal?

Evidence examples in v1.0 include rules continuing unless repealed, no sunset or automatic expiry, decisions effective until changed, older decisions still applying, and the burden being on repeal rather than renewal.

- **Candidate answer:** [YES / NO / NOT DEMONSTRATED]
- **Evidence IDs:** [E…]
- **Observable claim and exact quotation:** [short claim; quote is in the evidence register]
- **Evidence gap / bounded search:** [what was searched, where, and for what period]

## Step 3 — Phase detection

The v1.0 engine evaluates the ordered branch predicates below against the B1–B5 vector. Preserve the full vector; do not substitute an overall impression.

| Branch (order matters) | B1 | B2 | B3 | B4 | B5 |
|---|---:|---:|---:|---:|---:|
| NAB | NO | YES | NO | YES | NO |
| CWO | NO | YES | NO | not part of this branch | NO |
| GSRB | YES | NO | YES | NO | YES |

- A complete first-matching branch produces that phase with HIGH confidence.
- If no branch is complete but at least one branch matches at least three of its required conditions, the result is AMBIGUOUS. In the v1.0 scoring description, one condition short is MEDIUM; a three-condition partial match is LOW.
- If no branch reaches the three-condition minimum, the result is INCOHERENT with LOW confidence.
- An unanswered B input is not a confident phase finding. The importer must not score `null` as NO; reject/quarantine the incomplete packet. If the engine is run for diagnostics, preserve its provisional phase and `Confidence_Level=NONE` without presenting them as a completed audit.

**Candidate vector:** [B1, B2, B3, B4, B5]  
**Candidate branch matches:** [NAB n/5; CWO n/4; GSRB n/5]  
**Candidate detection and confidence:** [AI-proposed only; refresh recomputes]

## Step 3.5 — Legislative constraint check (when the result is AMBIGUOUS)

v1.0 invokes this step only when Step 3 returns AMBIGUOUS. If Step 3 returns a determinate phase or INCOHERENT, do not run Step 3.5: keep the four machine values `null` and set each `gap` to `NOT_ASSESSED — Step 3.5 not triggered; Step 3 result: [phase]`. This is not a NO. If Step 3 is AMBIGUOUS, answer all four criteria; any unresolved C answer leaves the packet incomplete and prevents a completed audit. Record each criterion separately. The criteria concern demonstrated external constraint; theoretical authority alone is not evidence that the constraint operated.

### C1 — External override demonstrated

Has a legislature, court, or external body actually used authority to override or repeal the entity's decision in recent history? Cite an actual override, not merely theoretical potential. The current v1.0 engine requires C1 evidence to fall within the preceding 24 months of `input.cutoff`.

- **Candidate answer:** [YES / NO / NOT DEMONSTRATED]
- **Evidence IDs / date / affected decision:** [E…]
- **Gap:** [bounded search or missing record]

### C2 — Appeal/review mechanism active and invoked

Does an accessible, functioning appeal/review process actually grant relief? v1.0 lists a published process with criteria, a historical record of appeals granted at a ≥50% success rate, an accessible appeal mechanism, and recent successful appeals within the last 12 months as evidence. Record the actual outcome set and denominator if the source provides them; do not invent either.

- **Candidate answer:** [YES / NO / NOT DEMONSTRATED]
- **Route and criteria:** [source and locator]
- **Outcome set / dates / numerator / denominator (if available):** [state the actual set; do not invent a denominator]
- **Evidence IDs / gap:** [E…]

### C3 — Authority sunset requirement

Do decisions or policies automatically expire or require periodic renewal, preventing indefinite persistence? v1.0 examples include statutory sunset clauses, budget cycles requiring renewal, term limits, and automatic expiry dates.

- **Candidate answer:** [YES / NO / NOT DEMONSTRATED]
- **Evidence IDs / operative dates:** [E…]
- **Gap:** [bounded search or missing record]

### C4 — Temporal freshness of constraints

Are the constraints functioning now, rather than existing only as historical design? v1.0 examples include recent legislative action within 12 months, recent successful appeals within 12 months, current operation of the mechanism, and evidence that it is not dormant or abandoned. The current engine requires dated C4 evidence to fall within the preceding 12 months of `input.cutoff`.

- **Candidate answer:** [YES / NO / NOT DEMONSTRATED]
- **Evidence IDs / dates:** [E…]
- **Gap:** [bounded search or missing record]

If all four constraints are YES, v1.0 specifies `AMBIGUOUS → NAB-Constrained`, HIGH confidence, and a `Confirmed (Constrained)` badge. The fewer-than-four case is addressed in the unresolved-rule note below.

**Candidate aggregate:** [all four YES / one or more not YES / not assessed]  
**Candidate phase effect:** [AI-proposed only; refresh recomputes]

> **Version note requiring care:** the v1.0 text says that with fewer than four constraints true the phase “remains AMBIGUOUS or escalates to GSRB” but does not provide a predicate for choosing between those outcomes. This template does not invent one. Until that source rule is clarified or a later version is explicitly selected, the refresh implementation must surface the case for review rather than silently choose an escalation. The ratified v1.1 amendment explicitly says not to escalate through Step 3.5, but this v1.0 template does not adopt that v1.1 rule.

## Step 4 — Comparison and reclassification

Compare a valid PDH's Declared_Phase with the engine's Detected_Phase. Matching determinate phases are COMPLIANT; differing determinate phases are a MISMATCH and a diagnostic reclassification. If no valid PDH exists, report that there is no declaration to match and leave the formal badge unissued. AMBIGUOUS and INCOHERENT are diagnostic results, not declared phases. Under the v1.0 Step 4 text, AMBIGUOUS is reported as `INCOHERENT` compliance with an unissued badge pending clarity; INCOHERENT is reported as `INCOHERENT` compliance with an invalid badge and breach/collapse-risk severity. The refresh engine must generate the final output fields; the external candidate must not overwrite its result.

**Candidate comparison:** [AI-proposed only; refresh recomputes]  
**Candidate finding (2–3 sentences maximum):** [describe the observable mismatch or lack of valid declaration without inferring intent, illegality, or wrongdoing]

## Step 5 — Temporal audit (only when prior records exist)

The textbook applies this step when multiple PDH declarations for the same entity exist at different timestamps. Use repository/record references for prior audits; do not synthesize history from memory. Distinguish an audit reclassification from an actual operational transition.

| From timestamp | To timestamp | Declared phase | Detected phase | Transition status | Pattern | Severity | Duty Collation Entry ID | Source record(s) |
|---|---|---|---|---|---|---|---|---|
| [N/A if no prior record] | | | | | | | | |

Candidate pattern: [Stable / Drift / Oscillation / Rebranding / N/A]  
Candidate transition history: [AI-proposed only; refresh recomputes from supplied prior records]

## Required output fields — reserved for the refresh engine

These are the textbook's output fields. The external application may put proposed values in `candidateResult`, but the published result must be regenerated by the site-side Ground-0 implementation and marked `UNREVIEWED` until human review is completed.

| Field | Engine-generated value |
|---|---|
| `Entity_Name` | `PENDING_REFRESH` |
| `Entity_Identifier` | `PENDING_REFRESH` |
| `Audit_Timestamp` | `PENDING_REFRESH` |
| `PDH_Status` | `PENDING_REFRESH` |
| `Declared_Phase` | `PENDING_REFRESH` |
| `Detected_Phase` | `PENDING_REFRESH` |
| `Compliance_Status` | `PENDING_REFRESH` |
| `Confidence_Level` | `PENDING_REFRESH` |
| `Severity_Level` | `PENDING_REFRESH` |
| `Badge_Status` | `PENDING_REFRESH` |
| `Finding` | `PENDING_REFRESH` |
| `Evidence_Summary` | `PENDING_REFRESH` |
| `Duty_Collation_Entry_ID` | `PENDING_REFRESH` |
| `Replication_Risk` | `PENDING_REFRESH` |
| `Temporal_Pattern` | `PENDING_REFRESH` |
| `Transition_History` | `PENDING_REFRESH` |

## Evidence register — source locator data for the future popup

Keep one row per public artifact. Quote only the passage needed to show the stated basis. Where the source supports several answers, list each code in `supports`.

| ID | Title | Canonical URL | Direct URL / fragment | Source type | Publication/effective date | Retrieved at | Page / section / paragraph locator | Exact short quote | Observable claim supported | Supports | Evidence class |
|---|---|---|---|---|---|---|---|---|---|---|---|
| E1 | [title] | [https://…] | [https://…#… or PDF page fragment; otherwise same URL] | [official/court/regulatory/legislative/news/archive/public] | [YYYY-MM-DD] | [ISO-8601] | [section/page/paragraph] | [short exact quotation] | [observable claim] | [B1/C1/etc.] | [INDEPENDENTLY_VERIFIABLE/AUTHOR_REPORTED] |

## Candidate report limitations

- This is an author-submitted, AI-assisted candidate record. The AI tool name is provenance, not an auditor credential.
- A citation's presence, date, URL, quotation, or hash does not prove the source is authentic, complete, correctly interpreted, or supportive of the claim.
- Ground-0's computed phase is a rules output, not a legal finding, safety certification, identity verification, or independent audit.
- `NO`/`NOT DEMONSTRATED` is not proof that the opposite is true. Report the search boundary and missing evidence.
- Human evidence review is intentionally a later step. This template preserves direct links and locators for that review; it does not perform it.
