# UpdateOct2 — organized contents

This directory is the de-duplicated extraction of `UpdateOct2.zip`.
macOS metadata (`__MACOSX` and `.DS_Store`) and repeated ZIP entries were omitted.

## Contents

| Directory | Contents |
| --- | --- |
| `01-Threat-Intelligence/` | Storm-0558 research, analysis, detection rules, and reports |
| `02-Frameworks/` | Grand River Flow Model and Universal Timekeeping System |
| `03-Official-Documentation/` | Harshal Systems Pages documents |
| `04-Institutional-Frameworks/` | Convergence Institutions reference documents |
| Root-level Markdown files | Delivery summaries and UTS package reports |

The original archive is retained at [`archives/source-bundles/UpdateOct2.zip`](../../archives/source-bundles/UpdateOct2.zip).

## Where this package now lives in HarshalOS

The package is source material, not deployed assets. Its four lineages are
composed by one named architecture and wired into Book I and the OS:

| Lineage | Wired as |
| --- | --- |
| Grand River Flow Model · Mistveil City · Grand Aqueduct · Convergence Institutions | [**The Grand Architecture**](../../docs/harshal-systems/modules/grand-architecture.md) — layers `GA-0`–`GA-3`, plus the read-only `Grand Architecture` desktop app (`js/grand-architecture-data.js`, `js/apps-grand.js`) |
| Universal Timekeeping System | [UTS reference module](../../docs/harshal-systems/modules/uts.md) — layers `GA-4`, the `UTS Watch & Converter` app, and the Home Screen clock/calendar |
| Storm-0558 public-source review | [SCAV++ crosswalk](01-Threat-Intelligence/Storm-0558/SCAV++-INTEGRATION.md) — layer `GA-5`, plus the clearly marked Good Intelligence study fixture `empty-demo-storm0558-001` |
| Convergence Institutions | [Convergence institutions module](../../docs/harshal-systems/modules/convergence-institutions.md) |

Numeric canon for the Grand River lineage is
[`02-Frameworks/Grand-River-Flow-Model/CANONICAL-NUMBERS.md`](02-Frameworks/Grand-River-Flow-Model/CANONICAL-NUMBERS.md);
`npm run test:grand` fails if the app's rendered figures stop matching that
card.
