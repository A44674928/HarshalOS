# Native Library / eBook reader

## Purpose

The **Library** is a full-Swift, read-only reader for the published AGS v0.2 full-book KDP interior and a separately classified **Night Reading Edition**. It is implemented with Apple `PDFKit`, not a `WKWebView`, browser wrapper, remote document viewer, or a prose-to-action engine.

The Library makes both local reading editions reachable before or after a phase declaration while preserving the source corpus’s section-level classification and evidence boundaries. The published edition remains the source of record; the Night Reading Edition is an optional presentation-only derivative.

## Bundled source

| Field | Value |
| --- | --- |
| Title | *AGS v0.2: Harshal’s Systems — Full Book* |
| Edition | Production Edition · Version 0.2 · October 2026 |
| Source file | [`publications/book/AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-interior-2026-10-07.pdf`](../../../publications/book/AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-interior-2026-10-07.pdf) |
| PDF pages | 548 |
| SHA-256 | `6c67feae3881c11bab8e2654e1f58d23aabbbb1dfdcd536464218c2bbf839823` |
| Core source map | `AGSv02PublishedCorpus` |

The Xcode project copies this one tracked source artifact into both the iOS and macOS app bundles. `LibraryView` reads it locally and verifies both its SHA-256 digest and page count before presenting a `PDFDocument`. A missing, altered, malformed, or page-count-mismatched resource stays unavailable rather than silently opening another PDF.

The checksum is an application resource-integrity comparison. It is not a signature, ownership proof, deployment attestation, or authority grant.

## Local reading editions

| Edition | Classification | Artifact | SHA-256 | Role |
| --- | --- | --- | --- | --- |
| **Published Edition** | `EXACT_PUBLISHED_ARTIFACT` | [`AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-interior-2026-10-07.pdf`](../../../publications/book/AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-interior-2026-10-07.pdf) | `6c67feae3881c11bab8e2654e1f58d23aabbbb1dfdcd536464218c2bbf839823` | The immutable source-of-record KDP interior. |
| **Night Reading Edition** | `PRESENTATION_ONLY_DERIVATIVE` | [`AGS-v0.2-Harshal-s-Systems-Night-Reading-Edition-2026-10-10.pdf`](../../../publications/book/AGS-v0.2-Harshal-s-Systems-Night-Reading-Edition-2026-10-10.pdf) | `cd46c3c47aea1deb2e54dd32ebc324e3f1ce6106c13a6eeb9b3ccec07e348f7c` | Optional black-and-electric-blue local reading presentation; never a replacement source. |

Both files have 548 pages and use the same native section/page navigator. `AGSv02LibraryEdition` carries a separate resource name, classification, checksum, and page-count expectation for each file; `LibraryBookReaderModel` refuses an absent, altered, malformed, or page-count-mismatched selection rather than substituting an arbitrary PDF.

The Night Reading Edition retains selectable text, embedded fonts, page geometry, page order, and source-text continuity. Its tracked [provenance manifest](../../../publications/book/AGS-v0.2-Harshal-s-Systems-Night-Reading-Edition-2026-10-10.provenance.json) records the published source hash, both text-continuity digests, the page count, the visual transform, and its own artifact hash. It is still a derivative: source identity, publication identity, and source checksum remain exclusive to the Published Edition.

## Reader behavior

The reader provides:

- an explicit local **Published Edition / Night Reading Edition** picker, with a visible classification and integrity boundary for the active choice;
- local page rendering, zooming, selection, and continuous scrolling through `PDFKit`;
- prior/next page actions and direct PDF-page navigation;
- a native 37-section navigator for front matter, Parts I–XXV, Part XIX-B, appendices, and the glossary;
- printed-page/PDF-page labels and source classifications for every mapped section;
- access before a declaration through the onboarding **Open Library** preview and after a declaration through the **Library** dashboard tab;
- a visible read-only/integrity status.

The Library chrome follows the native black/electric-blue visual system. In the **Published Edition**, PDF pages are never inverted, recolored, or rewritten: that file remains the exact print-edition source. The **Night Reading Edition** is the separately bundled, black-background/electric-blue-text derivative selected by the reader picker; it never overwrites, obscures, or claims the published artifact.

It does **not** send the book, a reading position, a query, selection, bookmark, or annotation to Community, CloudKit, a public feed, a market service, or any other network destination.

## Full-corpus treatment

“Full book” means the complete owner-provided, published PDF is locally available as a source corpus. It does **not** mean every statement or section becomes an executable app capability.

The Library surfaces the published section map from [`AGS-V0.2-CORPUS.md`](AGS-V0.2-CORPUS.md):

- foundation and bounded-design material may inform separately implemented local features;
- conceptual, mixed, archive, and proposed material retains its own stated evidence limits;
- Part XIX-B and Part XXIII remain narrative/fiction-only;
- Parts XV and XIX and Appendix B retain the `THREAT_RESEARCH` catalog-only disposition;
- CWO remains accepted as an archival/custodial phase and never becomes an external-action, clinical, or physical-control capability.

The reader itself includes **no** source-derived scanner, targeting mechanism, device guidance, activation path, attack workflow, incident-response authority, external execution channel, or automatic code-generation feature. Reading a page never changes a declaration, ledger, phase, gate outcome, publication state, shipping result, or paper-market record.

## GitHub companions

The Library also contains a curated **Repository companions** index backed by `HarshalRepositoryCompanionCatalog`. It provides source context for the repository README, security boundary, canonical model, working-library index, native architecture, published-corpus map, SCAV++ boundary, shipping baseline, NEO ORB, paper-market boundary, and Community deployment guide.

Companions deliberately open through the platform’s external browser as versioned GitHub links. The native app does not embed a web browser, silently fetch remote content, cache GitHub pages in private state, or execute repository material. The index is a navigation aid, not a claim that `main` mirrors the bundled publication or current local branch.

## Night-edition generation and provenance

[`generate_night_reading_edition.py`](../scripts/generate_night_reading_edition.py) is a release-time tool, not app runtime code. It pins PyMuPDF `1.24.14` and refuses any other generator version or any input whose SHA-256 or page count does not match the published KDP artifact. It then works from a copy, inserts a black vector underlay, and remaps the original document’s vector colors to the electric-blue/native-surface palette. It does not rasterize pages or rewrite the source prose, page geometry, font programs, links, outlines, or page order.

The tool validates extracted-text continuity and link-count continuity before it atomically writes both the derivative and its provenance manifest. Re-run its independent check with:

```sh
python3 -m pip install pymupdf==1.24.14
python3 native/HarshalNative/scripts/generate_night_reading_edition.py --verify
```

A changed published source, changed derivative, failed text continuity check, altered page count, or unexpected link count fails closed. This is provenance/integrity handling for a visual derivative; it is not a signature, rights determination, certification, deployment claim, or authorization mechanism.

## Xcode integration

`HarshalNative.xcodeproj` includes:

- `Features/LibraryView.swift` in both app targets;
- the tracked KDP interior **and** the tracked Night Reading Edition as separate resources in both app targets;
- a `PBXResourcesBuildPhase` for each target.

The source PDF remains canonical at its publication path; the project references both source-scoped artifacts rather than duplicating them under `native/`. The Night Reading Edition has its own date-stamped derivative path and provenance manifest, so it cannot silently be mistaken for the KDP source.

## Release boundary

Before distributing a build that includes the book, the owner must confirm publication rights, distribution terms, app-store metadata, supported accessibility behavior, and any jurisdiction-specific obligations. This reader does not solve those release decisions merely by bundling a document.

## Validation

On macOS/Xcode:

1. Run `python3 native/HarshalNative/scripts/generate_night_reading_edition.py --verify` with PyMuPDF installed; confirm source/text/link continuity and both checksums pass.
2. Build either native target.
3. Open **Library** or the onboarding **Open Library** preview.
4. Select **Published Edition** and confirm the status identifies the verified exact KDP source.
5. Select **Night Reading Edition** and confirm the status identifies the verified presentation-only derivative, black page background, electric-blue text, and 548-page map.
6. In each edition, jump to PDF p. 229 and PDF p. 239 using the navigator and confirm they land on the same source sections.
7. Confirm a missing or altered resource produces the unavailable state rather than a substituted document.
8. Confirm every GitHub companion opens externally and that the Library creates no publication, sync, market, or external-action side effect.
