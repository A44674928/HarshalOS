# Manuscript Directory — Book II (*The Grand River Foundation* · Preview)

> **Strategic Principle:** *"The architecture (Book I) is the library. The novel (Book II) is the work in active production."*

This directory holds the plaintext manuscript chapters of **Book II — *The Grand River Foundation* (`Book II — Preview`)**, the fictional companion novel to **Book I — *Harshal's Systems* (`Parts I–XXVII`)**.

---

## 1. Publishing Hierarchy & Provenance Separation

| Tier | Work | Provenance Class | Role in Corpus |
| :--- | :--- | :--- | :--- |
| **Book I** | ***Harshal's Systems*** (`Parts I–XXVII`) | `CANONICAL_SOURCE` / `DERIVATIVE_BUILD` | Frozen technical, constitutional, and safety reference library (`docs/harshal-systems/` & `HARSHAL-SYSTEMS-USER-MANUAL.md`). |
| **Book II — Preview** | ***The Grand River Foundation*** | `FICTION` (`NARRATIVE_SANDBOX`) | Active fictional companion novel set in **~2100 CE** around the 4,000-foot retrofitted Colorado River Dam, the 500-Coin Western Colonnade, and the 119-NAB Ombudsman Council. Separated from normative specifications while maintaining strict architectural continuity with Book I. |

---

## 2. Current Book II — Preview Chapter Roster

All chapters live in `manuscript/the-grand-river-foundation/` as ordered UTF-8 plaintext files:

1. `00-prologue-the-geometry-of-restraint.txt` — **PROLOGUE: The Geometry of Restraint**
2. `01-chapter-1-the-shock-of-addressability.txt` — **CHAPTER 1: The Shock of Addressability**
3. `02-chapter-2-the-citadel-on-the-rim.txt` — **CHAPTER 2: The Citadel on the Rim**
4. `03-interstitial-cable-select.txt` — **INTERSTITIAL: Cable Select — A Short Story from the World of Harshal's Systems**
5. `04-chapter-3-the-paper-siege.txt` — **CHAPTER 3: The Paper Siege**
6. `05-chapter-4-the-prompt-supercritical-threat.txt` — **CHAPTER 4: The Prompt-Supercritical Threat**
7. `06-chapter-5-the-zero-degree-meridian.txt` — **CHAPTER 5: The Zero-Degree Meridian**
8. `07-chapter-6-the-hundred-and-nineteen.txt` — **CHAPTER 6: The Hundred and Nineteen**
9. `08-chapter-7-the-origin-continuity-covenant.txt` — **CHAPTER 7: The Origin Continuity Covenant**

Historical working `.rtf` drafts are preserved separately under `archives/manuscript-rtf/` (`ARCHIVE` provenance).

---

## 3. Model-Driven Chapter Authoring Workflow

Instead of continually rebuilding the underlying Book I documentation before writing the next chapter, authors and AI models write directly into `manuscript/the-grand-river-foundation/` using `scripts/write-chapter.mjs`, treating Book I as the settled reference library.

### Inspect current manuscript status & Book I → Book II continuity anchors
```bash
npm run manuscript:status
```

### Add a new chapter directly into the manuscript structure
```bash
node scripts/write-chapter.mjs --add --title "The Chapter Title" --file path/to/draft.txt
```
This command automatically:
1. Assigns the next two-digit sequence prefix (`07-chapter-6-...txt`).
2. Enforces non-executable plaintext formatting and `# CHAPTER N: <Title>` header conventions.
3. Recomputes SHA-256 chapter digests and updates `manuscript/manifest.json` for **The Book** app on the website (`js/manuscript.js`).
4. Recompiles the standalone **Book II — Preview** volume at `BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md`.

---

## 4. Plaintext Formatting Conventions (Browser & Print Reader)

- `# Heading` on the first line becomes the chapter's display title.
- `## Section Heading` starts a titled section inside the chapter.
- A line containing `* * *`, `***`, or `---` renders as a scene break.
- Lines starting with `>` render as block quotations.
- `*italics*` and `**bold**` are supported; all HTML tags are escaped as inert literal text.
