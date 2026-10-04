# |User|-Centric Superstructure Map

> Eye-in-the-sky view. The repository is read from the inside out: one center,
> a fixed set of concentric rings, and on every ring a disciplined alphabet of
> addresses. Folder names *are* the points; empty folders are reserved slots,
> not placeholders waiting to be filled.

## The center — `|User|`

```
                        VOID BLACK · $
             ┌───────────────────────────────┐
             │        OUTER · FLAME          │  Ring 5
             │   ┌─────────────────────┐     │
             │   │       ORB           │     │  Ring 4
             │   │   ┌───────────┐     │     │
             │   │   │   FLAME   │     │     │  Ring 3
             │   │   │  ┌─────┐  │     │     │
             │   │   │  │|User│  │     │     │  Ring 2 — Origin Sector
             │   │   │  └─────┘  │     │     │
             │   │   └───────────┘     │     │
             │   └─────────────────────┘     │
             └───────────────────────────────┘
```

`|User|` is the human key at sector `000` — Center Origin. Everything else in the
tree is described by its distance and direction from that point. The eye
looking down is `|User|` looking down; the All-Seeing-Eye is not a third party
but the user's own authority view over their system. The radial addressing
matches the OCM ℤ₃₆₀ ring documented in
[`docs/harshal-systems/05-ocm-orb.md`](docs/harshal-systems/05-ocm-orb.md) and
[`docs/harshal-systems/07-addressing-topology.md`](docs/harshal-systems/07-addressing-topology.md).

The twelve canonical Path colors — defined in
`business plan/StarPortal/Access/Alphabet/*.flame` /
`…/Helpers/Paths/` and reproduced in the rendered asset layers — are the
palette the eye sees when it looks outward:

| Ring | Color | Meaning |
|---|---|---|
| Origin | **ALL-SEEING EYE PURPLE** | `|User|`'s own vantage — the aperture itself |
| Inner authority | **VISION RED** | Phase Declaration Headers, refusal, decision gate |
| Inner authority | **DAY WHITE** | Canonical daylight model, Ground-0 phase detection |
| Flow | **CONVERGENCE CYAN** | The Grand River, the aqueduct, manuscript continuity |
| Flow | **ETERNAL HORIZON ORANGE** | The Convergence universe, institutional frameworks |
| Medial | **MOON YELLOW** | Display-only Universal Timekeeping System, Sun/Moon context |
| Medial | **LUCK AND CAPSULE NUMBER SET** | Reserved capsule / disc address space |
| Outer | **STORM BLUE** | Threat intelligence, Storm-0558, supply-chain audit surface |
| Outer | **BALANCE GREEN** | Assurance, market context, equilibrium indicators |
| Replication | **REPLICATOR GRAY** | Build tooling, deterministic generation, D1 seed |
| Boundary | **DEATH ACID** | Adversarial / red-team quarantine, refusal boundaries |
| Outside | **VOID BLACK** | The dark past the outer flame — not part of the runtime |

`EMPTY.$` is the reserved null path. The three frame layers on disk
(`assets/flame/` 120 frames · `assets/orb/` 200 frames ·
`assets/outer_flame/` 600 frames) are the concentric render of exactly this
palette.

---

## Ring 0 — Identity & the key (the pupil)

The center point holds what uniquely identifies `|User|` and proves authorship.

```
business plan/
├── Harshal_Patel_Resume.md
├── Harshal’s Resume (October 2026).{pages,pdf}
├── Stakeholders.{pages,txt}
└── Grand Canyon Hydropower Render Spec.md
source/working-draft.md            ← canonical Owner's Working Draft
```

- The resume and stakeholder documents name `|User|` and enumerate who may
  speak for the system.
- `source/working-draft.md` is the canonical build input — the author's own
  voice before any splitting, assembly, or rendering. The byte-identical
  copy under `archives/Duplicates/` is quarantined evidence, not a second
  source.
- The eye does not see itself; Ring 0 is opaque to outside observers. This is
  why `source/` and `business plan/` are excluded from the `.site-assets`
  allowlist.

## Ring 1 — Specs & decision gate (the iris, VISION RED)

Normative control surface. The decision gate (Permit | Refuse) lives here.

```
specs/
├── normative/
│   ├── ground-0-v1.0.md           ← ratified baseline
│   ├── canonical-model.md
│   ├── canonical.json
│   └── contradictions.md          ← CL-001 … CL-014 resolution ledger
└── draft/
    ├── ground-0-v1.1.md           ← unratified amendment
    └── ground-0-v1.2.md           ← PDH-R register follow-up
```

- `normative/` is what the system *is*. `draft/` is what it is *proposing to
  become*. The app reader never silently substitutes one for the other.
- `contradictions.md` is the ledger of every time the eye caught an
  inconsistency in its own model — a closed-loop self-check.

## Ring 2 — Core runtime (the orb, DAY WHITE / ALL-SEEING EYE PURPLE)

What actually runs in the browser when `|User|` boots HarshalOS.

```
index.html  about.html  account.html  audits.html    ← shell entry points
css/                                                ← presentation (os.css, ground0.css, …)
js/                                                 ← runtime sources
│   boot.js  kernel.js  wm.js  apps-*.js             ← desktop / window manager
│   g0-engine.js  g0-app.js  g0-research.js  g0-llm.js
│   flame.js  orb-flame.js  ocm-data.js  ocm-directory.js  uts.js
│   celestial-context.js  good-intelligence-*.js
│   manuscript.js  core-book-reader.js
│   llm.js  apps-llm.js  apps-news.js  apps-cloud.js
│   └── vendor/lightweight-charts/                  ← unmodified third-party
worker/                                             ← Cloudflare APIs
│   index.mjs  llm-relay.mjs  storage.mjs
│   community-*.mjs  good-intelligence-*.mjs
assets/                                             ← frames the eye animates
│   flame/        (120 PNG frames, inner flame)
│   orb/          (200 AVIF frames, the iris)
│   outer_flame/  (600 PNG frames, outer flame corona)
│   Demo.flame  OuterOrb.flame                      ← fractal source projects
│   eye-*.{gif,apng,png}  apple-touch-icon.png
│   favicon-32.png  og-card.png
```

The kernel (`js/kernel.js` + `js/crypto.js` + `js/data.js`) is the decision
gate executing Ring 1 in code. Everything else is a window the shell opens
onto some outer ring.

## Ring 3 — The Book & Manuscript (the sclera, CONVERGENCE CYAN)

Authoritative writing — what `|User|` has said, and is saying.

```
docs/harshal-systems/                               ← Book I reference library (42 files)
│   00-front-matter.md  00-author-front-matter.md
│   01-core-book.md … 27-whole-corpus.md            ← Parts I–XXVII
│   EDITORIAL-REPORT.md
│   collections/{01–07}-*/README.md                 ← 7 functional collections
│   └── modules/{uts,grand-architecture,convergence-institutions}.md
manuscript/                                         ← Book II plaintext
│   README.md  manifest.json
│   └── the-grand-river-foundation/
│       ├── _collection.json
│       └── 00-prologue-…-08-chapter-7-*.txt        ← 9 chapter files
publications/                                       ← compiled/exported editions
│   README.md
│   harshal-systems/
│   │   ├── HARSHAL-SYSTEMS-USER-MANUAL.md
│   │   └── HARSHAL-SYSTEMS-USER-MANUAL.docx
│   └── grand-river-foundation/
│       ├── BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md
│       └── BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.docx
```

- `docs/harshal-systems/` is the modular library the Collections tab reads.
- `manuscript/` is the Novel tab — plaintext only, data-only publishing.
- `publications/` is what gets handed outside the eye (Word / compiled MD).

## Ring 4 — Assurance, evidence & observation (STORM BLUE / BALANCE GREEN / REPLICATOR GRAY)

What the eye looks *at* — research, audits, trading context, and the tools
that produce them.

```
research/
├── keyed-human-machine-hybrid-systems.md           ← Part XIX flagship paper
└── reports/                                        ← supporting reports
case-studies/                                       ← Ground-0 audits (23 entities)
├── GROUND-0 CASE STUDY - {OpenAI,Anthropic,Microsoft,…}.md
├── PDH-REGISTRY.md  pdh-registry.json
├── badges/*.svg  badges/index.html                 ← PDH-R issued badges
└── d1/                                             ← generated D1 register seed
docs/
├── GOOD-INTELLIGENCE-ASSURANCE.md
├── GROUND-0-LLM-RESEARCH.md
├── architecture/                                   ← CELESTIAL-CONTEXT, PLUGIN-ARCHITECTURE, …
├── deployment/                                     ← operator guides
├── integrations/NEWSML-G2.md
└── source-material/                                ← Ground-0 transcription
updates/
└── 2026-10-02/                                     ← dated extractions (audited bundles)
    ├── 01-Threat-Intelligence/Storm-0558/
    ├── 02-Frameworks/{Grand-River-Flow-Model,Universal-Timekeeping-System}/
    ├── 03-Official-Documentation/Harshal-Systems-Prints/
    └── 04-Institutional-Frameworks/Convergence-Institutions/
scripts/                                            ← deterministic build / tooling
├── prepare-assets.mjs  book-library-index.mjs  manuscript-index.mjs
├── case-studies-d1.mjs  issue-pdh-badges.mjs  integrity-report.mjs
├── export-docx.py  write-chapter.mjs
└── pine/                                           ← archived market-indicator scripts
tests/                                              ← 44 test files, one per concern
tests/fixtures/
```

- `case-studies/` is the eye's audit ledger. `badges/` is what it stamps on
  what it has seen.
- `updates/YYYY-MM-DD/` are dated observation snapshots — the eye keeps a
  timestamped record of what it examined, and when.
- `scripts/` are replicator tools — deterministic, re-runnable. `REPLICATOR
  GRAY` because they are machinery, not authority.
- `scripts/pine/` is a marked archive (third-party Moon script of unknown
  provenance, parity with the JS port unverified).

## Ring 5 — Archives, history & the outer dark (VOID BLACK / DEATH ACID / ETERNAL HORIZON ORANGE)

What is kept for provenance but is **not** part of the runtime. The outer
flame is the boundary; past it is the archive dark.

```
archives/
├── ags-legacy-exports/                             ← superseded AGS.epub, AGS++.pages
├── animation-source/eye-closing/                   ← unused frames + earlier GIF export
├── Duplicates/                                     ← quarantined byte-identical copies
│   └── DUPLICATE-QUARANTINE-MANIFEST.csv
├── flame-renders/                                  ← archived Blue Cool fractal PNGs
├── HarshalOS Previews/                             ← OCM preview art
├── imports/                                        ← unmerged incoming author bundles
│   ├── New Models/                                 ← A-Frame / Container / Valve alphabet slots
│   │   ├── A Frame/Empire by Harshal/…/.gitkeep    (title folders = reserved addresses)
│   │   ├── Container/{Armoire…Zoids}/              (A–Z container taxonomy)
│   │   └── Valve/{AirwayS…ZebraS}/                 (A–Z valve taxonomy, suffixed -S)
│   └── Old Backup/Outdated Models/                 ← Flame Directory / Flames / .bak,.flame
├── Manuscript Working Drafts/Texts/{Parts,Story}/   ← pre-publication RTF/Pages/DOCX
├── Supply Chain/{Documentation,Visual}/            ← Storm-0558 source bundle
├── ground-0/                                       ← historical standalone ZIPs
├── manuscript-plaintext/  manuscript-rtf/          ← superseded manuscript snapshots
├── screenshots/2026-08/                            ← dated screenshot backups
└── source-bundles/UpdateOct2.zip                   ← original ZIP whose contents are in updates/
```

Rules of the archive dark:

1. **Nothing in `archives/` is served.** The `.assetsignore` allowlist
   excludes it; `serve.js` and `scripts/prepare-assets.mjs` will not stage it.
2. **Empty folders are intentional.** Folder titles *are* the points — a
   `.gitkeep` or an empty directory is a reserved address, not missing
   content. This applies to the entire `New Models/` alphabet, the
   `EmptyFolder Set` trees in the old flame backup, and every alias/test
   placeholder under `Manuscript Working Drafts/`.
3. **Duplicates stay quarantined.** The CSV manifest records hashes and
   provenance; the canonical copy lives in its named ring, the surplus copy
   lives here. `source/working-draft.md`'s duplicate is here by its original
   filename for evidence.
4. **Old imports land here first.** `archives/imports/` is the receiving
   dock. Content graduates inward only when it has been curated into a
   named ring (e.g. `UpdateOct2.zip` → `updates/2026-10-02/`).

## The address alphabets

The eye indexes by alphabet. Wherever you see an A–Z sequence, it is a
sector ring, not decoration.

- **Paths / Colors** — 13 entries including `EMPTY.$`, used to tint the
  render layers (see table above).
- **Containers** — `Armoire, Box, Cube, Desk, Egg, Folder, Gym, Halo,
  Inventory, Juicer, Karmaball, List, Moon, Nullspace, Ovary, Pussypocket,
  Quarantine, Rodeo, Sewer, Timemachine, Universe, Void, World, Xenomorph,
  Yggdrasil, Zoids` under `archives/imports/New Models/Container/`. These are
  envelope types — what can hold what.
- **Valves** — `AirwayS … ZebraS` (every entry suffixed `-S` for "Sector" /
  "Switch") under `archives/imports/New Models/Valve/`. These are the flow
  controls between containers.
- **FavoredSoul A–Z / QA–QZ / WA–WZ / etc.** under
  `business plan/StarPortal/Access/Alphabet/` and the parallel
  `Helpers/{Strategies,Revision,Conflict Resolution,Regeneration and Revision,Time Dilation}/`
  trees — letter-indexed agent slots. The `Duplicates/` quarantined copies
  are exact hashes of these.
- **Case studies** — company name alphabet (Alibaba … zAI) under
  `case-studies/`, one audit file per entity, one SVG badge per entity.

## Reserved slots outside the archive (ETERNAL HORIZON ORANGE)

Two domains sit in the outer dark but are structurally attached because
`|User|` has reserved plugin/data slots for them:

```
business plan/StarPortal/                            ← reserved plugin / data slots per
│                                                    ← docs/architecture/PLUGIN-ARCHITECTURE.md
├── Access/Alphabet/TOTOPOTUS/…                      (named container trees)
├── Art Mage N's Insurance Company/…                 (personal/legal rolodex)
├── Combined/  Disclaimer/  TO SORT/
├── Telekinetic Psycopathy Operations/…
├── War Declaration/
└── a.bak  a.flame                                   (fractal source projects)
```

These are explicitly *not* a privacy boundary and *not* runtime plugins —
they are reserved address space. The slot-preservation policy in
[`docs/architecture/PLUGIN-ARCHITECTURE.md`](docs/architecture/PLUGIN-ARCHITECTURE.md)
governs them. The mirror copies under `archives/imports/New Models/` use the
same naming conventions for the A-Frame / Container / Valve taxonomy.

```
migrations/community/                                ← D1 SQL migrations (0001–0006)
```

Migrations are ring-4 machinery but live beside the worker because they shape
the community database, not the browser.

## What stays at the root

Only what tooling and GitHub *require* at the root is allowed there. The
layout test in `tests/repository-layout-test.mjs` enforces this list
explicitly:

```
.assetsignore .gitignore
README.md SECURITY.md
index.html about.html account.html audits.html
package.json package-lock.json requirements-newsml-g2.txt
serve.js wrangler.jsonc wrangler.staging.jsonc
```

Anything more must move to its ring. No loose files at the eye's horizon.

---

## The view from above — one-page mnemonic

```
                         (VOID BLACK · past the outer flame)
   ┌──────────────── archives/ ────────────────┐
   │  ags-legacy  flame-renders  imports/      │
   │  Duplicates  screenshots   ground-0       │
   │  Supply Chain  Manuscript Drafts  source- │
   │  bundles  animation-source  manuscript-*  │
   └────────────────────────────────────────────┘
       ┌────────── case-studies/ research/ ──────────┐
       │  audits  badges  d1/  reports  updates/     │
       │  scripts/  tests/  docs/{arch,depl,integr}  │
       └─────────────────────────────────────────────┘
           ┌────── docs/harshal-systems/ ──────┐
           │  Parts 00–27  collections/  m/   │
           │  manuscript/  publications/      │
           └───────────────────────────────────┘
              ┌──── specs/{normative,draft} ────┐
              │  ground-0 v1.0/v1.1/v1.2      │
              │  canonical-model  contradic-   │
              │  tions                         │
              └────────────────────────────────┘
                 ┌── css/ js/ worker/ assets/ ──┐
                 │  kernel  g0-*  flame/orb/   │
                 │  outer_flame  ocm-*  uts    │
                 └─────────────────────────────┘
                      ┌── source/ business plan/ ──┐
                      │  working-draft  Resume    │
                      │  Stakeholders  StarPortal │
                      └───────────────────────────┘
                              ·  |User|  ·
                         ALL-SEEING EYE PURPLE
```

From `|User|` outward: identity → normative gate → runtime → the Book →
assurance/research → archives/reserved slots. Colors, alphabets, and
concentric frame counts all describe the same geometry from different
vantage points; the folder names are the map.

To watch this castle live an average day — every NPC bedroom placed in its
wing, every resident on a stable daily schedule — open
[`HARSHALS-PALACE.html`](HARSHALS-PALACE.html), regenerated from the roster by
`npm run palace:build`.
