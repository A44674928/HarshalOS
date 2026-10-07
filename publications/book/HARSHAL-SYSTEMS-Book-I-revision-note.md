# Revision Note — *Harshal’s Systems, Book I*

**Date:** October 4, 2026  
**Manuscript:** `/home/user/HARSHAL-SYSTEMS-Book-I-revised.txt`  
**Edition status:** Revised working manuscript; not externally endorsed, certified, or validated.

## Exact post-edit word count

**172,788 words** in the revised manuscript file.

### Scope and counting method

The count covers the complete text of `HARSHAL-SYSTEMS-Book-I-revised.txt`: front matter and publishing metadata, the archived author front matter retained in the file, navigation and status tables, all 27 numbered parts, Part XXIV’s fiction, formulas, tables, pseudocode, citations, the rewritten Part XXVI Ground-0 case-study section, and the Part XXVII corpus synthesis/index. Nothing inside that manuscript file was excluded from the count. This separate revision note, the uploaded source files, and the revision scripts are not included.

The count is the number of matches from Python 3’s Unicode regular expression:

```regex
(?u)\b[\w]+(?:['’‐‑‒–—-][\w]+)*\b
```

Thus Unicode word characters are counted; apostrophe- or hyphen-connected forms count as one token when the connector is between word characters. Numerals count as tokens. Punctuation and standalone symbols do not. This is a reproducible regex count, not a word-processor estimate.

## Scope and material decisions

- **Part XX was not edited.** Its retained text, from the Part XX heading through the boundary before Part XXI, matches the pre-audit revised manuscript exactly. Protected-block SHA-256: `f6a5cce643b837693e29e5f9a433339c91e075fc36a4979c5a4d8a18e2cdf39d`.
- **Part XXIV’s fiction was retained verbatim.** The preserved narrative span, from “PROLOGUE: The Geometry of Restraint” to the Part XXV boundary, matches the pre-audit revised manuscript exactly. SHA-256: `18f9d7a01da5dde18d410b3f18952485b8ceacdacd864b7801f2edbe644bc2af`.
- **The former Part XXVI B-Side audit was rewritten as Part XXVI**, not restored verbatim. It is now explicitly a controlled counterfactual boundary exercise and a limited v1.2 issuer-layer eligibility review. The corpus synthesis/index moved to **Part XXVII**; front matter, status rows, cross-references, and corpus manifest were updated to 27 parts.
- The register classifies **every retained numbered part, I–XXVII, as DRAFT**. Part XXIV is fiction; Part XXVI is case analysis/counterfactual; Part XXVII is derivative corpus synthesis/index. DRAFT is an editorial status, not a finding that a claim is true or false and not evidence of deployment, external legal force, certification, or independent validation.
- **Method sources:** the supplied `12-ground-zero.md` provides the v1.0 method and an author-prepared A-Side; the supplied `ground-0-v1.2.md` is an expressly unratified issuer-layer amendment draft. The complete v1.1 amendment and the associated `case-studies/audits` evidence files/registry were not included in the supplied source packet. The Part XXVI text records that limitation rather than inferring missing case evidence.
- **B4 polarity corrected:** the A-Side checklist answer is NO; the counterfactual external-halt scenario changes the answer to YES. The corresponding GSRB predicate `refusal_override` changes TRUE to FALSE. The 4/5 score is conditional on the controlled scenario and is not a measured real-world classification.
- The v1.0 Step 3.5 narrative reports a 2/4 aggregate, but the supplied case text lacks a reproducible C1–C4 itemization and the v1.0 terminal instruction is disjunctive (“remains AMBIGUOUS or escalates to GSRB”). The rewrite records the terminal result as unresolved rather than selecting a branch. `AMBIGUOUS-MIXED` remains an unratified v1.1 proposal.
- No valid entity-issued PDH-E, inclusive `Evidence_Cutoff`, complete PDH-R field set, pre-issuance SHA-256, registry reproduction, or badge asset was supplied. A pre-issuance compatibility screen against the v1.2 draft therefore supports **no PDH-R badge** (`PDH_R_VALID = FALSE`, `INCOMPLETE / EVIDENCE_GAP`); no actual v1.2 validation or register issuance is claimed. The v1.2 open-weight B2 conditional path does not apply to this B4 scenario.
- The former source’s `[A1]`–`[A29]` markers lacked their referenced source index/artifacts in the supplied copy. They are not represented in the rewrite as independently checked citations. The scenario’s date, order, and model names are explicitly counterfactual, not assertions that those events or products existed.
- Part XII’s A-Side scope note was updated to point to Part XXVI and to identify its scores as author-reported rather than independently verified from the supplied materials.

## Substantive revisions from the prior manuscript pass

- Preserved the OCM example in which two observers each contribute 25 percentage points and the stipulated combined illustrative mismatch is 75 points. The text retains a trace to Bell-inspired framing while explicitly stating that this OCM bookkeeping convention is not derived from or empirically supported by Bell’s theorem.
- Defined the 500-Coin body as a conceptual PDH-based collective organism. OCM Overall State is the combined totality of participant PDH-declared phases and associated state-quality markers; a change in that governance/software state is not an established physical or quantum phase.
- Reaffirmed that authority does not migrate. A successor may inherit operational structure and records only and must independently satisfy the current authority and authorization criteria.
- Clarified that identity licenses are non-revocable identity records; revoking identity is abusive and prohibited. Scoped operational authorizations are separate instruments and may expire or be revoked under their stated process.
- Specified `f(A,R,S)` with dimensionless normalized inputs in `[0,1]`, evidence/rubric/normalization requirements, action-specific scope and freshness, pre-registered thresholds, and separate upstream binary `C` and `K` gates. The score is normative policy bookkeeping, not an empirical measurement of moral, legal, or social legitimacy.
- Reworked BGP reserve language around rated/nameplate or nominal capacity: at least 40% remains reserve, the routine active ceiling is 60%, and “100% active” means 100% of that 60% envelope, not 100% of rated capacity. BGP reserve, contingency, islanding, and severance behavior remains a proposed design objective/pseudocode; actual behavior and timing require explicit authorization, equipment-specific validation, and deployment evidence. No automatic activation, instantaneous severance, successful islanding, or uninterrupted-service guarantee is claimed.
- Added or corrected evidence/status boundaries for conceptual, clinical, quantum/biological, and patent-style material; corrected malformed equation renderings; and supplied criteria for previously blank conformance tables or incomplete sections.

## Ground-0 audit rewrite

- The former Part XXVI B-Side text was not restored verbatim. The rewritten Part XXVI separates the author-reported A-Side baseline from an explicitly hypothetical B4 boundary scenario, identifies missing source artifacts, corrects the B4 polarity, and distinguishes v1.0 output from the unratified v1.1 AMBIGUOUS-MIXED proposal.
- The supplied v1.2 issuer-layer amendment was treated as an unratified draft and used only for a pre-issuance compatibility screen. Because the case packet lacks an inclusive Evidence_Cutoff, complete evidence index, SHA-256 binding, and registry record, no actual PDH-R validation or badge issuance is claimed.

## File integrity

- **Revised manuscript SHA-256:** `f90056f4bef9055c26a7f7cbef9ddbf1103106c9d1b3764daab176fc4aab4ea9`
- **Revised manuscript size:** 1,344,024 bytes (UTF-8)
- **Part XX protected-block SHA-256:** `f6a5cce643b837693e29e5f9a433339c91e075fc36a4979c5a4d8a18e2cdf39d`
- **Part XXIV fiction-span SHA-256:** `18f9d7a01da5dde18d410b3f18952485b8ceacdacd864b7801f2edbe644bc2af`
