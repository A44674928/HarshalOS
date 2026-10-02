# Editorial Report

**Work:** Harshal’s Systems — The Ultimate User Manual (Book I Reference Library & Book II Preview Mirror)
**Source:** `Harshal’s Systems (Copyrighted) [Owner’s Working Draft].md`
(1,278,427 bytes · 16,674 lines · 165,900 words) + synchronized `manuscript/the-grand-river-foundation/` chapters
**Output:** 187,244 words across Front Matter, Author's Front Matter (`00`), and 27 Roman-numbered Parts (`Parts I–XXVII`), plus this report.
**Build:** `python3 source/build.py` — deterministic and reproducible.

---

## 1. Summary of what was found

| # | Defect | Severity | Count |
|---|---|---|---|
| 1 | Section and Part headings destroyed by harness/format defects | **Critical** | 2 |
| 2 | Page breaks (form feed) deleted, gluing lines together | **Critical** | 31 |
| 3 | Closing code fence glued to the last line of code | **Critical** | 1 |
| 4 | A Part heading trapped inside a code fence | **High** | 1 |
| 5 | A literal address placeholder misparsed as a heading | **High** | 1 |
| 6 | Malformed table separator rows | Medium | 6 |
| 7 | Headings shouting in ALL CAPS | Medium | 106 |
| 8 | Heading level jumps (h1 → h4 with no h2/h3) | Medium | 191 |
| 9 | Formatted list bullets (`•`) instead of Markdown lists | Low | 1181 |
| 10 | Tabs used as separators in prose | Low | 1035 |
| 11 | Trailing whitespace | Low | 0 |
| 12 | Non-breaking spaces used as ordinary spaces | Low | 8 |
| 13 | Corrupted tokens (`llany`/`LLANY` → `any`, `orand`/`ORAND` → `or`, `andor` → `and/or`) | Medium | 3 |
| 14 | Missing space after punctuation / doubled spaces | Low | — |
| 15 | Part boundary line-number drift after form-feed expansion & fence repair | **High** | Fixed via raw-line sentinel slicing |
| 16 | 26-vs-27 Part numbering inconsistency across Front Matter, README, and Editorial Report | **High** | Resolved via `Part XXVII — Whole Corpus / Complete Work` |

---

## 2. The critical defects, explained

### 2.1 Code fences (defect 1)

On GitHub, a fenced block is **opened** by backticks followed by a language tag, and
**closed** by backticks with nothing after them.

At line 5,408 the closing fence was glued onto the last line of code:

    }

    ```   <- glued to the line above, so it never closes the block

A glued fence is not recognised as a fence at all. That single missing marker left the
document with an **odd number of fence markers**, which inverted fence state for every
block that followed. The practical consequence: **a 3,497-line region rendered as one
monospace block** on GitHub, burying the entire threat-model appendix, the MicroConvergence
specification, the Audio Visual Encoding model, and four policy documents inside a code fence.

**Repair:** the glued fence was split onto its own line, restoring an even count. The
document now has 240 correctly paired markers, each part file opens and closes
its own fences, and no heading sits inside a code block.

### 2.2 Page breaks deleted (defect 2)

The draft contains 27 form-feed characters (``) — the page breaks left by the
word processor it was written in. They sit *mid-line*, immediately before new content:

```text
**Distribution:** Professional contexts (…stakeholder communication)GROUND-0 PHASE DETECTION…
```

Stripping the character (the obvious first move) silently **welded the two lines together**.
That destroyed at least two section headings outright — they became the tail of the preceding
paragraph and stopped rendering as headings:

| Line | Was destroyed into |
|---|---|
| 3,416 | `…stakeholder communication)GROUND-0 PHASE DETECTION ALGORITHM v1.0 — FINAL SPECIFICATION` |
| 16,051 | `…cannot currently access# GROUND-0 PHASE DETECTION CASE STUDY` |

**Repair:** a form feed is a *page break*, so it is now replaced with a line break rather than
deleted. All 31 sites are repaired and both headings render again.

### 2.3 A Part heading inside a code fence (defect 3)

`# PART IV: Non-Guarantees & External Dependencies` sat between two ASCII diagrams that shared
a single pair of fences, so the heading was swallowed as code.

**Repair:** any heading found inside a fence is now extracted, with the fence closed before it
and reopened after. Rust attributes such as `#[no_mangle]` and `#[derive(Clone)]` are correctly
left alone, because an ATX heading requires whitespace after the hashes. Verified: 0 headings
now sit inside a fence.

### 2.4 An address placeholder parsed as a heading (defect 4)

The OCM addressing section explains the address grammar `0•DDD•RRR•####` and then lists each
field. The fourth line of that list was:

```text
#### = instance
```

Markdown reads four hashes at the start of a line as a level-4 heading, so the placeholder
became a heading and appeared in the table of contents as "= instance".

**Repair:** escaped as `` `####` = instance ``. It now renders as the literal placeholder the
author intended.

### 2.5 Chapter and section titles with no heading markup (defect 8)

The Core Book's structure existed only as *text*. Its ten chapters and their sections were
written as bare lines with no `#`:

```text
Chapter 1 — Ownership Is Not Possession
1.1 The First Confusion
```

Markdown renders those as ordinary paragraphs, so **none of them appeared in any table of
contents**, on GitHub or anywhere else. The same pattern runs through the rest of the draft:
230 chapter and section titles were invisible as structure.

**Repair:** lines that are unambiguously titles — short, opening with a chapter label or a
dotted section number, starting uppercase, and not ending in sentence punctuation — are now
real headings. All 230 were promoted, which is why the rebuilt
table of contents is roughly ten times the size of the original and why Part I is finally
navigable. A prose sentence that merely happens to begin with a number is not affected.

---

## 3. Typography and consistency

| Change | Count |
|---|---|
| Typographic bullets (`•`, `●`, `▪`) converted to Markdown list items | 1181 |
| Lines with tab characters replaced by spaces | 1035 |
| Lines with trailing whitespace trimmed | 0 |
| Non-breaking spaces replaced with ordinary spaces | 8 |
| Form feeds converted to line breaks | 27 |
| Malformed table separator rows repaired or removed | 6 |
| ALL-CAPS headings converted to Title Case | 106 |
| Headings promoted from plain text to real markup | 230 |
| Heading levels re-derived from document nesting | 191 |
| Spelling and token corrections | 3 |

### On the spelling pass, honestly

A conventional misspelling list was applied first, and it found almost nothing — this draft
is **not** badly spelled. Two entries were real (`Acknowledgement` ×2). The genuine problem was
different: two tokens had been corrupted by a bad find-and-replace somewhere in the document’s
history, and both are meaningless strings, not misspellings.

| Corrupted token | Correct | Occurrences | Example |
|---|---|---|---|
| `llany` | `any` | 16 | "applied at **llany** level of government" |
| `orand` | `or` | 13 | "the Operator **orand** System opens…" |

Every occurrence was read in context before inclusion. A third apparent match — `orand` inside
"mem**orand**um" — is a false positive and was left untouched, which is why the rule uses word
boundaries.

---

## 4. Structure: what changed

The draft's front matter declared an intended structure — Part I: The Core Book, Part II:
Formalization, then supporting material — but the body did not follow it. Content for a single
subject is scattered: the Anthropic audit opens at line 3,187 as the **A Side** and resumes at
line 16,052 as the **B Side**, 12,865 lines apart.

The manual now arranges the whole work into **Author's Front Matter (`00`)** plus **27 Roman-numbered Parts (`Part I` through `Part XXVII — Whole Corpus / Complete Work`)**, resolving the historical 26-vs-27 numbering discrepancy:

| File # | Designation | Part | Provenance | Words | Source lines |
|---|---|---|---|---:|---|
| `00` | **Author's Front Matter** | [Author’s Front Matter and Reading Guide](00-author-front-matter.md) | `ARCHIVE` | 3,476 | 1–325 |
| `01` | **Part I** | [Part I — The Core Book](01-core-book.md) | `CANONICAL_SOURCE` | 8,511 | 326–572 |
| `02` | **Part II** | [Part II — Formalization](02-formalization.md) | `CANONICAL_SOURCE` | 3,032 | 573–784 |
| `03` | **Part III** | [Part III — Safety Rationale for Adversarial Scenarios](03-safety-rationale.md) | `CANONICAL_SOURCE` | 436 | 785–829 |
| `04` | **Part IV** | [Part IV — AGS: Accountability-Gated Systems](04-ags-architecture.md) | `CANONICAL_SOURCE` | 2,668 | 830–1,241 |
| `05` | **Part V** | [Part V — OCM: The Orb Communicator Model](05-ocm-orb.md) | `CANONICAL_SOURCE` | 1,344 | 1,242–1,414 |
| `06` | **Part VI** | [Part VI — The AI Inner Shell](06-inner-shell.md) | `CANONICAL_SOURCE` | 720 | 1,415–1,530 |
| `07` | **Part VII** | [Part VII — Addressing, Rotation, and Spherical Topology](07-addressing-topology.md) | `CANONICAL_SOURCE` | 2,290 | 1,531–2,017 |
| `08` | **Part VIII** | [Part VIII — The Operator Model](08-operator-model.md) | `CANONICAL_SOURCE` | 1,264 | 2,018–2,181 |
| `09` | **Part IX** | [Part IX — Disc Primitives, Routing, and Lifecycle](09-disc-lifecycle.md) | `CANONICAL_SOURCE` | 3,436 | 2,182–2,651 |
| `10` | **Part X** | [Part X — AGS+ Layering and Conformance](10-ags-conformance.md) | `CANONICAL_SOURCE` | 817 | 2,652–2,797 |
| `11` | **Part XI** | [Part XI — The AGS Accessory Pack](11-accessory-pack.md) | `CANONICAL_SOURCE` | 1,739 | 2,798–3,045 |
| `12` | **Part XII** | [Part XII — Ground-0: Phase Detection, Audits, and the Duty Collation Ledger](12-ground-zero.md) | `CANONICAL_SOURCE` | 16,998 | 3,046–5,104 |
| `13` | **Part XIII** | [Part XIII — The Whyland Standards](13-whyland.md) | `CANONICAL_SOURCE` | 986 | 5,105–5,162 |
| `14` | **Part XIV** | [Part XIV — Neural Atomic Bodies Compendium](14-nab-compendium.md) | `CANONICAL_SOURCE` | 5,040 | 5,163–5,344 |
| `15` | **Part XV** | [Part XV — Keyed Human-Machine Hybrid Controls](15-hmkh-controls.md) | `CANONICAL_SOURCE` | 2,118 | 5,345–5,662 |
| `16` | **Part XVI** | [Part XVI — Threat Modeling and Context-Dependent Guarantees](16-threat-modeling.md) | `CANONICAL_SOURCE` | 8,297 | 5,663–6,480 |
| `17` | **Part XVII** | [Part XVII — Atomic Body Classes and Reactor Doctrine](17-atomic-bodies.md) | `CANONICAL_SOURCE` | 5,611 | 6,481–7,438 |
| `18` | **Part XVIII** | [Part XVIII — Institutional Application](18-institutional-application.md) | `CANONICAL_SOURCE` | 4,023 | 7,439–7,621 |
| `19` | **Part XIX** | [Part XIX — Flagship Research: Accountability in Keyed Human–Machine Hybrid Systems](19-research-papers.md) | `CANONICAL_SOURCE` | 5,501 | 7,622–7,789 |
| `20` | **Part XX** | [Part XX — Supply Chain and Implanted-Device Threat Research](20-supply-chain.md) | `CANONICAL_SOURCE` | 28,232 | 7,790–9,942 |
| `21` | **Part XXI** | [Part XXI — MicroConvergence and Signal Encoding](21-microconvergence.md) | `CANONICAL_SOURCE` | 7,578 | 9,943–10,496 |
| `22` | **Part XXII** | [Part XXII — Supporting Policy & Governance Research Archive](22-policy-archive.md) | `CANONICAL_SOURCE` | 6,710 | 10,497–11,105 |
| `23` | **Part XXIII** | [Part XXIII — Specification Series](23-specification-series.md) | `CANONICAL_SOURCE` | 9,216 | 11,106–12,508 |
| `24` | **Part XXIV** | [Part XXIV — Book II Preview: The Grand River Foundation (Fictional Companion Novel)](24-the-novel.md) | `FICTION` | 15,631 | 12,509–13,016 |
| `25` | **Part XXV** | [Part XXV — Anti-Denial of Justice, Labor Attribution, and NAB I/O Mapping](25-additional-specs.md) | `CANONICAL_SOURCE` | 21,535 | 13,017–16,050 |
| `26` | **Part XXVI** | [Part XXVI — Incident Record & External Audit: Anthropic PBC (B Side)](26-anthropic-b-side.md) | `AUDIT` | 10,267 | 16,051–16,675 |
| `27` | **Part XXVII** | [Part XXVII — Whole Corpus / Complete Work](27-whole-corpus.md) | `DERIVATIVE_BUILD` | 1,794 | 1–16,675 |

### 4.1 Rebuilt table of contents

The original contents listing was a flat list of roughly 200 unlinked entries that did not
correspond to the body text. It has been:

- **regenerated from the document itself** — every entry is derived from a real heading;
- **linked** — every part entry resolves to its file, every front-matter anchor resolves in-page;
- **hierarchical** — H2 and H3 headings are nested under their part.

Validation: 11 in-page anchors, 0 broken · 27 part links, 0 missing.

The author's original flat listing is **preserved** in `00-author-front-matter.md` for reference,
clearly labelled as superseded.

---

## 5. Redundancy: measured, not assumed

| Measure | Result |
|---|---|
| Substantial paragraphs (over 120 characters) | 838 |
| Groups of *exactly* duplicated paragraphs | 4 groups · 230 redundant words · **0.1 %** |
| Near-duplicate paragraphs (identical 100-character opening) | 11 groups |

**Finding: the draft is not repetitive at the paragraph level.** Literal duplication is 0.1 %.
The redundancy that does exist is **structural**, and it is mostly deliberate: the same
mechanism re-stated at a different level of formality in a different part.

| Concept | Appears in | Treatment |
|---|---|---|
| Phase Declaration Header | Parts IV, XII, XV, XVII, XXIII | **Kept.** Definitional vs. algorithmic vs. normative — the formal statements differ. |
| NAB / CWO / GSRB | Parts IV, XII, XVII | **Kept.** Definition, detection algorithm, and containment analysis. |
| The eight neural controls | Parts XV, XVII | **Kept.** Part XV is the normative control spec; Part XVII is the audit. |
| Anthropic audit, A Side and B Side | Parts XII, XXVI | **Separated, not merged.** Two independent passes on different records. |
| Ground-0 five-question checklist | Parts I, XII, XXVI | **Kept.** Handbook form vs. applied form. |
| Anti-caste / anti-slavery principles | Parts IV, XXII | **Kept.** One is design constraint, one is policy. |
| "Harshal's Systems — Specification Series" banner | Part XXIII, ×5 | **Kept.** It is the series header for five separate modules. |

> **These were deliberately not merged.** Merging them would have required choosing which
> version is authoritative — an authorial decision, not an editorial one. Cross-references
> were added instead.

### 5.1 Structural spam removed

Six malformed pseudo-table separator rows (`|+++|`, `|---|+++|`) were removed or rebuilt from
the column count of the header row above them. They were breaking table rendering.

---

## 6. What was deliberately *not* changed

- **Prose was not rewritten.** Sentence-level style, voice, vocabulary, and rhythm are the author's.
- **No claim was altered, softened, or removed.**
- **No figures, identifiers, hashes, addresses, or equations were touched.**
- **Conflicting specifications were not reconciled.** Where two parts give different versions of
  the same mechanism, both are preserved.
- **`fossilizedly` was left alone.** It appears 19 times as a consistent authorial coinage, aligned
  with the framework's established "fossilized scope" and "fossilized phase boundary" vocabulary.
  It reads awkwardly in a few sentences, but normalising a coined technical term is not an
  editor's call. Flagged, not changed.
- **Fictional, speculative, and game-design material was not removed.** It is separated into
  Parts XIX, XX, XXI, and XXIV.

---

## 7. Editorial queries outstanding

Logged rather than guessed at. Each needs an authorial decision.

1. **Ground-0 version status.** v1.0 is described as finalized; v1.1 as an unratified amendment.
   But v1.1 content appears inside audit material in Part XII. Which governs a given audit
   should be stated per audit.
2. **"AGS++" versus "Harshal's Systems."** Both names run throughout. The front matter treats
   *Harshal's Systems* as current and *AGS++* as former. A global rename was **not** applied,
   because `AGS++` occurs inside frozen identifiers, hashes, and specification titles.
3. **Duplicate addresses in the address catalog** (Part XX). Some addresses are assigned to more
   than one entity. Flagged, not resolved.
4. **`orand` in one ambiguous site.** One occurrence ("may orand can thus should prove…") reads as
   a mangled clause rather than a simple `or`. Corrected minimally; the sentence may need a
   rewrite.
5. **Two headings with no `#` marker** (lines 3,416 and 16,051). The page-break repair restores
   them as standalone lines; whether they should be headings is an authorial choice. The second
   one carries a `#` and now does render as a heading.
6. **The Specification Series convention.** The five modules in Part XXIII share an identical
   seven-part skeleton (Axioms → Pillars → Phase Filtering → Formal Model → Wire Format →
   Runtime → Conformance). Preserved as a deliberate series convention.

---

## 8. Verifying this build

```bash
python3 source/build.py
```

Input: `source/working-draft.md`
Outputs: `docs/harshal-systems/*.md`, `HARSHAL-SYSTEMS-USER-MANUAL.md`, this report.

Content integrity was verified by diffing the full token multiset of the source against the
built manual. The only terms present in the source and absent from the manual are exactly the
29 corrected tokens. **No other content was lost.**
