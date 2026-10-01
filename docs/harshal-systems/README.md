# Harshal’s Systems — the manual, one file per part

This folder holds **The Ultimate User Manual** split into one file per part.
The assembled single-file edition is at the repository root:
**[`HARSHAL-SYSTEMS-USER-MANUAL.md`](../../HARSHAL-SYSTEMS-USER-MANUAL.md)** (171,883 words).

Read the assembled edition if you want one continuous document.
Read the parts here if you want to work on, review, or cite a single section.

| # | Part | Words |
|---|---|---|
| 00 | [Author’s Front Matter and Reading Guide](00-author-front-matter.md) | 3,476 |
| 01 | [Part I — The Core Book](01-core-book.md) | 8,240 |
| 02 | [Part II — Formalization](02-formalization.md) | 2,586 |
| 03 | [Part III — Safety Rationale for Adversarial Scenarios](03-safety-rationale.md) | 573 |
| 04 | [Part IV — AGS: Accountability-Gated Systems](04-ags-architecture.md) | 2,568 |
| 05 | [Part V — OCM: The Orb Communicator Model](05-ocm-orb.md) | 1,175 |
| 06 | [Part VI — The AI Inner Shell](06-inner-shell.md) | 720 |
| 07 | [Part VII — Addressing, Rotation, and Spherical Topology](07-addressing-topology.md) | 2,115 |
| 08 | [Part VIII — The Operator Model](08-operator-model.md) | 1,223 |
| 09 | [Part IX — Disc Primitives, Routing, and Lifecycle](09-disc-lifecycle.md) | 3,282 |
| 10 | [Part X — AGS+ Layering and Conformance](10-ags-conformance.md) | 802 |
| 11 | [Part XI — The AGS Accessory Pack](11-accessory-pack.md) | 2,566 |
| 12 | [Part XII — Ground-0: Phase Detection, Audits, and the Duty Collation Ledger](12-ground-zero.md) | 16,004 |
| 13 | [Part XIII — The Whyland Standards](13-whyland.md) | 1,073 |
| 14 | [Part XIV — Neural Atomic Bodies Compendium](14-nab-compendium.md) | 4,939 |
| 15 | [Part XV — Keyed Human-Machine Hybrid Controls](15-hmkh-controls.md) | 2,116 |
| 16 | [Part XVI — Threat Modeling and Context-Dependent Guarantees](16-threat-modeling.md) | 8,289 |
| 17 | [Part XVII — Atomic Body Classes and Reactor Doctrine](17-atomic-bodies.md) | 5,646 |
| 18 | [Part XVIII — Institutional Application](18-institutional-application.md) | 4,143 |
| 19 | [Part XIX — Research Papers](19-research-papers.md) | 6,928 |
| 20 | [Part XX — Supply Chain and Implanted-Device Threat Research](20-supply-chain.md) | 25,809 |
| 21 | [Part XXI — MicroConvergence and Signal Encoding](21-microconvergence.md) | 9,671 |
| 22 | [Part XXII — Governance and Policy Archive](22-policy-archive.md) | 4,895 |
| 23 | [Part XXIII — Specification Series](23-specification-series.md) | 9,342 |
| 24 | [Part XXIV — The Grand River Foundation](24-the-novel.md) | 6,100 |
| 25 | [Part XXV — Anti-Denial of Justice, Labor Attribution, and NAB I/O Mapping](25-additional-specs.md) | 21,577 |
| 26 | [Part XXVI — Appendix: Anthropic Audit (B Side)](26-anthropic-b-side.md) | 10,272 |

## Supporting documents

| File | Purpose |
|---|---|
| [`00-front-matter.md`](00-front-matter.md) | About this manual, how to read it, notices, licensing, dedication |
| [`00-author-front-matter.md`](00-author-front-matter.md) | The Owner’s Working Draft front matter as submitted, preserved in full |
| [`EDITORIAL-REPORT.md`](EDITORIAL-REPORT.md) | What was found, changed, and deliberately left alone |

## Rebuilding

```bash
python3 source/build.py
```

The build is deterministic and reads only `source/working-draft.md`.
