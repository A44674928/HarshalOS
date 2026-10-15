# Ground-0 Phase Detection Algorithm v1.2 — Issuer Layer (Amendment Draft)

**Book / Collection:** Book I — Harshal's Systems (`Collection III: Ground-0 Phase Detection & Neural Atomic Bodies`)  
**Provenance Class:** `CANONICAL_SOURCE` · **Status Taxonomy:** `NORMATIVE_SPEC` (Unratified Amendment Draft) · **Evidence Status:** `FORMAL_AXIOMATIC` · **Research Layer:** `DEFENSIVE_SPECIFICATION`  
**Author of source framework:** Harshal Priyavadan Patel  
**Center Origin:** `0•000•000•0000`  
**Baseline:** Ground-0 Phase Detection Algorithm v1.0 (finalized 2026-09-12) and v1.1 ratified amendment (adopted 2026-10-14)
**Status:** Proposed amendment for author review; not represented as ratified.  
**Evidence policy:** Public artifacts only; every issued header binds to a case study that declares an inclusive `Evidence_Cutoff`.

**Status:** DRAFT — not ratified. Applies only where an audit record states it was run under v1.2.
**Supersedes nothing:** v1.0 remains normative for audits that explicitly select v1.0; v1.1 is the ratified normative behavioural amendment for audits that explicitly select v1.1.
**Scope of this file:** the *issuer layer*. v1.0 defined what a Phase Declaration Header (PDH) is and how it validates. v1.2 defines **who may issue one**, what a register-issued header may and may not claim, and how a badge is bound to evidence.
**Origin of record:** HarshalOS / Center Origin `0•000•000•0000`.

---

## 1. The problem v1.2 solves

Under v1.0, `PDH_VALID = TRUE` requires a header whose `Creator-ID` matches the **entity's** origin and whose `Declaration-Hash` verifies against that origin. No audited entity in this register has published such a header, so every audit reached `PDH_VALID = FALSE` → `Declared_Phase = NONE` → `Badge_Status = Unissued (pending valid PDH)`.

That outcome is correct and must remain available. But it leaves a register of completed behavioural audits with **no issuable artifact** — no comparable, time-boxed, hash-bound classification that a reader can cite. v1.2 therefore splits the instrument into two classes and keeps them strictly apart:

| Class | Issuer | Opens `PDH_VALID`? | What it authorizes |
|---|---|---|---|
| **PDH-E** (entity) | The audited entity, at its own Center Origin | **YES** — full v1.0 validation, Step 4 comparison against declared phase | An entity's own declaration of its phase. Still not a certification of conduct. |
| **PDH-R** (register) | This register, at Center Origin `0•000•000•0000` | **NO** — `PDH_VALID` for the entity remains FALSE | The **register badge**: disclosure that a behavioural audit was run, what it detected, over which evidence, until when. |

A PDH-R is a *statement about the audit*, not a statement *by the entity*. It never claims entity attestation, legal compliance, safety certification, or authority of any kind.

---

## 2. PDH-R required fields (11, same checklist as v1.0)

| Field | Required value / rule |
|---|---|
| `Header-ID` | `PDH-R-YYYY-MMDD-<ENTITY>-NNN`; unique per entity per issuance cycle |
| `Creator-ID` | Center Origin in the three-position form: `§0•000•000•0000§0•000•000•0000(0•000•000•0000)` |
| `Center-Origin` | `0•000•000•0000` |
| `Declared-Phase` | `GSRB` \| `CWO` \| `NAB` only — a PDH forces one phase (Single-Phase Invariant). Where the v1.1 audit returned AMBIGUOUS, the header declares the **operative platform/service phase** and sets `Scope-Tag` + `Caveat`; see §5. |
| `Center-Capability` | `Acting` for a GSRB declaration |
| `Legitimacy-Source` | `Internal` for a GSRB declaration |
| `Refusal-Semantics` | `Override-able` for a GSRB declaration |
| `Symbolism-Executability` | `Enabled` for a GSRB declaration |
| `Time-Authority-Effect` | `Confirms` for a GSRB declaration |
| `Effective-Timestamp` | ISO-8601; must be ≥ the audit's `Evidence_Cutoff` |
| `Declaration-Hash` | `sha256:` + SHA-256 of the audit record **as it stood before this issuance appendix was appended** — binding the header to the evidence that justified it |

Two additional register fields are recorded but are **not** substitutes for the eleven: `Subject-Entity-ID` (the audited entity, distinct from the issuer) and `Evidence-File` with `Issuance-Record-Hash`.

## 3. PDH-R validation

```
PDH_R_COMPLETE   = all 11 fields present and formatted
PDH_R_SIGNED     = Declaration-Hash present, non-empty, and reproduced in the registry
PDH_R_FRESH      = (now − Effective-Timestamp) ≤ 90 days          [v1.0 default δ]
PDH_R_CONSISTENT = field set matches the declared phase per v1.0 §Step 1.4
PDH_R_VALID      = COMPLETE ∧ SIGNED ∧ FRESH ∧ CONSISTENT
```

**If `PDH_R_VALID = FALSE`** → no badge is issued; the case study returns to `✗ Unissued` and the reason is recorded (`INCOMPLETE` | `UNSIGNED` | `STALE` | `INCOHERENT` | `EVIDENCE_GAP`).

**Expiry.** A PDH-R is valid for 90 days. At expiry the badge degrades to `▲ Expired — revalidation required` and the classification's legitimacy for phase purposes is treated as `L(t) → 0`, exactly as v1.0 §1.3 requires of a stale PDH. Expiry is an **increment** of the register's honesty, not a penalty on the entity.

**Supersession.** If an entity later publishes a signed PDH-E, the PDH-R is superseded, Step 4 comparison runs (declared vs. detected), and the badge is re-issued or withdrawn on the v1.0 path.

## 4. Badge classes

| Badge | Meaning | Issued when |
|---|---|---|
| `◆ GSRB — Register-Issued` | Behavioural detection matched the GSRB branch completely (5/5) | `PDH_R_VALID` and v1.1 confidence HIGH |
| `◆ GSRB — Register-Issued (Conditional)` | Operative platform/service surface is GSRB; the base audit returned AMBIGUOUS where open-weight release makes downstream decisions optional | `PDH_R_VALID`, `Scope-Tag` present, `Caveat` present |
| `◇ Entity-Attested` | **Reserved.** Requires a signed PDH-E. Never issued by this register. | — |
| `▲ Expired — revalidation required` | 90-day validity lapsed | — |
| `✗ Unissued` | `PDH_R_VALID = FALSE` (incl. evidence-gap cases) | — |

Every badge carries, in text: entity, declared phase, issuer class, **`UNATTESTED`**, evidence cutoff, constraint record, and the first 12 hex characters of the Declaration-Hash.

## 5. Conditional issuance for open-weight entities (carries v1.1 §B2 amendment)

Where a v1.1 audit returned **AMBIGUOUS (3/5)** because the open-weight B2 rule scored `decisions_optional = TRUE`, the register **may** issue a conditional PDH-R declaring the **platform/service** phase, provided that:

1. the case study already records a scoped platform reading (`GSRB 4/5, MEDIUM` or equivalent);
2. `Scope-Tag` names the surface (`platform/service surface`);
3. `Caveat` states the unresolved open-weight reading verbatim (`base audit AMBIGUOUS 3/5 — open-weight release surface`);
4. the badge renders the word **CONDITIONAL** and is never aggregated into full-class counts without the `Scope-Tag`.

Conditional issuance exists so that weakly-classified entities are **visible** in the register rather than parked indefinitely. It is not a resolution of the ambiguity; the open-weight B2 amendment remains open.

## 6. Registry mechanics

- Machine registry: `case-studies/pdh-registry.json` — includes per-entity header fields, `audit_record_sha256`, `issuance_record_sha256`, class, scope, caveat, expiry.
- Human ledger: `case-studies/PDH-REGISTRY.md` — issuance table, per-entity header blocks, source-integrity annex.
- Badge assets: `case-studies/badges/<slug>.svg`; gallery `case-studies/badges/index.html`.
- Reproduction: `node scripts/issue-pdh-badges.mjs` regenerates all of the above and re-appends Appendix C to each case study. The script is deterministic; re-running it after an edit to any audit record changes that record's hash **and** the badge's disclosed hash prefix, which is the intended tamper signal.

## 7. Non-claims (binding)

A PDH-R **is not**: an entity declaration; a certification; an audit opinion; a legal finding; a safety rating; a permission; or an authority. Badges create **no** authority, confer **no** legitimacy on the entity, and carry **no** force beyond disclosure. The register's recognition of a phase is not authorization of it (v1.0 §Recognition vs. Authorization). All refusals semantics of v1.0 remain in force: this instrument may be declined, appealed in writing to the register, or superseded by a PDH-E at any time.

---

*v1.2 draft · issuer layer only · Center Origin 0•000•000•0000*
