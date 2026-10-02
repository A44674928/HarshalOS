# HarshalOS repository map

This layout separates normative specifications, implementation, evidence, operator documentation, and test tooling so readers can find the source of a claim without confusing it with the browser implementation. It is an organizational change—not a change in Ground-0 policy or HOS behavior.

## Top-level map

```text
.
├── README.md                         Project overview and quick start
├── SECURITY.md                       Threat model and private vulnerability reporting
├── index.html, about.html            Static browser-shell entry points
├── css/, assets/                     Browser-delivered presentation and runtime assets
├── js/                               Browser runtime sources (logical map below)
├── worker/                           Optional Cloudflare storage API source
├── manuscript/                       Book II — Preview plaintext manuscript chapters (The Grand River Foundation);
│                                     the index is generated, and only indexed chapters are published
├── HARSHAL-SYSTEMS-USER-MANUAL.md    Umbrella Build Artifact (Book I Parts I–XXVII + Book II Preview mirror)
├── HARSHAL-SYSTEMS-USER-MANUAL.docx  Publication-grade Word edition of the Umbrella Build Artifact
├── BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md  Standalone compiled preview of Book II (~2100 novel)
├── specs/
│   ├── normative/                    Ground-0 v1.0 finalized baseline
│   └── draft/                        Ground-0 v1.1 unratified amendment draft
├── case-studies/                     OpenAI and Anthropic audit writeups
├── research/
│   ├── keyed-human-machine-hybrid-systems.md  Flagship portfolio research paper (Part XIX)
│   └── reports/                      Supporting research reports
├── docs/
│   ├── harshal-systems/              Book I Reference Library (00 + Parts I–XXVII) & 7 functional collections
│   ├── deployment/                   Operator/deployment guides
│   ├── source-material/              Archival manuscript transcription
│   └── REPOSITORY-STRUCTURE.md       This map
├── archives/
│   ├── ground-0/                     Historical standalone ZIP bundles
│   └── manuscript-rtf/               Archived working RTF chapter drafts (ARCHIVE provenance)
├── tests/                            Node test harnesses
├── scripts/                          Asset-staging and integrity-report tooling
├── .github/workflows/                CI automation
└── Business Plan/                    Separate author archive, not a site asset directory
```

`SECURITY.md` remains at the repository root so GitHub can discover the security policy automatically. Root configuration and development files—including `package.json`, `package-lock.json`, `serve.js`, `wrangler.jsonc`, `.assetsignore`, and `.gitignore`—also remain at the root because tooling expects those paths.

## Normative material and evidence

- **Normative Ground-0 baseline:** [`specs/normative/ground-0-v1.0.md`](../specs/normative/ground-0-v1.0.md).
- **Draft only:** [`specs/draft/ground-0-v1.1.md`](../specs/draft/ground-0-v1.1.md). It is not ratified and does not supersede v1.0.
- **Source provenance:** [`docs/source-material/Ground-0 Phase Detection Algorithm.md`](source-material/Ground-0%20Phase%20Detection%20Algorithm.md) is the combined manuscript transcription retained for reference. It contains both versions; it is not the file selected by the app's version switch.
- **Case studies:** `case-studies/` contains the standalone OpenAI and Anthropic audit reports. Supporting background research is kept separately in `research/reports/`.
- **Historical bundles:** `archives/ground-0/` contains previously produced ZIP packages. They are archived distributions, not the normative source and not the code used by the current static shell.

The app reader and download links use only the explicit `specs/normative/` and `specs/draft/` paths. Keep status visible in directory names and document headers; do not silently replace a normative file with a draft.

## Runtime implementation: logical ownership

Browser source files remain under `js/` to preserve the no-build shell's stable URLs (`index.html`, the allowlisted preview server, and the Worker asset staging). The boundaries below are conceptual ownership; they are not duplicated source trees.

| Logical area | Current implementation paths |
|---|---|
| **Kernel / local authority model** | `js/kernel.js`, `js/crypto.js`, `js/data.js`; state and authorization are local demo behavior, not production authority |
| **UI / desktop shell** | `index.html`, `about.html`, `css/`, `js/boot.js`, `js/wm.js`, `js/apps-core.js`, `js/apps-shell.js`, `js/apps-adversarial.js`, `js/apps-guided-demo.js` |
| **Core Book reader** | `docs/harshal-systems/01-core-book.md` is the canonical source; this file is copied to `book/01-core-book.md` by `scripts/prepare-assets.mjs` and mapped to that exact route by `serve.js`. `js/core-book-reader.js` and `css/core-book.css` provide the lazy-loaded **The Book → Core (1)** reader, with raw HTML escaped and Markdown rendered through a small safe allowlist |
| **Collections library reader** | `scripts/book-library-index.mjs` builds the seven-collection catalog from its README indexes and requires every Markdown file under `docs/harshal-systems/` to be accounted for. All 39 files are staged under `book-library/harshal-systems/`, with a generated manifest at `book-library/manifest.json`; `serve.js` exposes only that subtree. The fourth **The Book → Collections (N)** tab reads each file safely and provides its direct GitHub source link |
| **Manuscript reading view** | `manuscript/` (plaintext chapters and `_collection.json`), `scripts/manuscript-index.mjs` (shared index builder), `js/manuscript.js`, `css/manuscript.css`; rendered inside **The Book → Novel (2) · The Grand River Foundation**. The reader is data-only: chapters are escaped before display, the manifest is generated on request by `serve.js` and at deploy time by `scripts/prepare-assets.mjs`, and only files the index names are published |
| **Ground-0 engine and workspace** | `js/g0-engine.js`, `js/g0-app.js`, `specs/` |
| **Research** | `js/g0-research.js`, `research/reports/`, `case-studies/` |
| **LLM** | `js/llm.js`, `js/g0-llm.js`, `js/apps-llm.js`; optional server-side free-tier relay in `worker/llm-relay.mjs` (same-origin `/api/llm`, Z.AI key held as a Worker secret, operator guide in `docs/deployment/ZAI-FREE-TIER.md`) |
| **Good Intelligence bridge** | `worker/good-intelligence-demo.mjs`, `worker/good-intelligence-tickerbot.mjs`, `js/good-intelligence-assurance.js`, `js/good-intelligence-client.js`, `js/good-intelligence-verifier.js`, `js/good-intelligence-market-context.js`, `js/apps-good-intelligence.js`, `css/good-intelligence.css`, `docs/GOOD-INTELLIGENCE-ASSURANCE.md`; same-origin GET-only demo API with demo-only signed authorization, eight clearly synthetic ticker histories, separate source/claim assurance, and a Market Charts tab for price/Fibonacci, VFI, and WaveTrend line visualizations. No OHLCV means no fabricated chart. It does not implement GI sign-in, publishing, token approvals, or contract transactions |
| **OCM** | `js/ocm-data.js`, `js/apps-ocm.js` |
| **Optional cloud storage** | `worker/`, `js/apps-cloud.js`, operator instructions in `docs/deployment/` |
| **Guided/adversarial scenarios** | `js/guided-demo.js`, `js/apps-guided-demo.js`, `js/apps-adversarial.js`, corresponding tests in `tests/` |

## Tests and developer tooling

All `*-test.mjs` files live in `tests/`; run them with `npm test`. Focused suites are named in `package.json` (`test:kernel`, `test:engine`, `test:research`, `test:app`, `test:llm`, `test:relay`, `test:cloud`, `test:red-team`, and `test:layout`). `scripts/integrity-report.mjs` runs the full and focused suites, checks that every test file is assigned to a suite, runs the deployment dry-run, and writes the CI job summary. `scripts/prepare-assets.mjs` builds the allowlisted static asset directory.

When adding a test, put it under `tests/` and update the suite mapping in `scripts/integrity-report.mjs` and the relevant package script. CI intentionally fails the inventory check if a new test is left uncategorized.

## What is and is not deployed

The browser preview and deploy staging are allowlists, not copies of the repository root. `serve.js` and `scripts/prepare-assets.mjs` publish the shell, CSS, JS, runtime assets, Markdown under `specs/normative/` and `specs/draft/`, the selected Book I source at `book/01-core-book.md`, all 39 Markdown files in the intentionally public `docs/harshal-systems/` library under `book-library/harshal-systems/` plus its generated manifest, and — under `manuscript/` — only the generated `manifest.json` plus the plaintext chapter files that index names. They do not publish the rest of `docs/`, `case-studies/`, `research/`, `archives/`, `tests/`, `scripts/`, `worker/`, `Business Plan/`, `manuscript/README.md`, or the manuscript's private `_collection.json` metadata as browser assets. Manuscript files are still repository files: committing a chapter publishes it, so private material does not belong in `manuscript/`.

This static-asset boundary does **not** change repository visibility: files committed to this repository can still be read by repository users. Do not store secrets or private material here. Review `.assetsignore`, `serve.js`, `scripts/prepare-assets.mjs`, and `wrangler.jsonc` together whenever the public asset surface changes.

## Why the large author archive remains separate

`Business Plan/` is already its own top-level collection and contains a large, heterogeneous author archive. This pass leaves it in place instead of relocating thousands of files or implying that a path move changes its GitHub visibility. It is excluded from the browser asset staging; repository visibility still follows the repository's GitHub access settings.
