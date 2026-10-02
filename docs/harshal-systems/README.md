# Harshal Systems

## Book I Reference Library & Umbrella Corpus Index

This directory is the reference library and umbrella corpus for Harshal
Systems. It contains the front matter, 27 numbered parts, seven functional
collections, and an editorial and structural report. The numbered parts
cover foundational material, architecture, formalization, threat modeling,
research, specifications, governance, and supplementary works.

## What are Harshal's Systems?

Harshal's Systems is the framework of principles, architectures, formal
models, and specifications that defines the constituent systems of
HarshalOS. Its components are intended to be built from and for this
framework—not to define it only after implementation.

This corpus includes design, research, policy, audit, and companion
material. Inclusion in the corpus does not by itself mean that a proposal
has been implemented or validated.

## Design Philosophy

**Emergency usability and cognitive burden.** Core text processing should
be simple enough to use during emergencies, including by prisoners of war
(POWs) and others facing severe or adverse conditions. The design should
avoid unnecessary cognitive and interaction burden.

**Text for detailed communication.** Text-based processing is a priority
because it can convey detailed information with relatively low bandwidth
and interaction demands in constrained situations. This is a design
rationale, not a claim that text is best for every person or circumstance.

**Human-system interaction security.** Security risks involving the
interaction between a person and a system are a first-class domain, not an
afterthought. This includes cognitive interference and security risks
involving neurotechnology. In this corpus, *neurojacking* is used as an
emerging umbrella term for concerns such as adversarial inputs to neural
interfaces and side-channel leakage from neurotechnology. Specific
mechanisms and claims should be scoped and assessed in the relevant
documents.

**Careful treatment of uncertainty.** A threat scenario that has not been
proven is not thereby impossible. At the same time, a possibility should
not be presented as an established mechanism or incident without support.
Distinguish observations, reports, demonstrated findings, modeled
scenarios, hypotheses, assumptions, and open questions; state the
available evidence and uncertainty.

## Where to Start

- **New readers:** Read [the author's front matter](00-author-front-matter.md),
  then [the publishing hierarchy and taxonomies](00-front-matter.md),
  followed by [the Core Book](01-core-book.md) and
  [Formalization](02-formalization.md).
- **System architecture:** Start with [AGS](04-ags-architecture.md) and
  [OCM](05-ocm-orb.md), then follow the related architecture, operator,
  lifecycle, and conformance parts.
- **Safety and threat analysis:** Read the
  [Safety Rationale](03-safety-rationale.md),
  [Ground-0](12-ground-zero.md), and
  [Threat Modeling and Context-Dependent Guarantees](16-threat-modeling.md).
  The supply-chain and policy parts provide related research and context.
- **Human-machine and neurotechnology research:** Start with the
  [NAB Compendium](14-nab-compendium.md) and
  [Keyed Human-Machine Hybrid Controls](15-hmkh-controls.md), then explore
  the related research, atomic-body, supply-chain, and signal-encoding parts.
- **Standards and governance:** See
  [The Whyland Standards](13-whyland.md),
  [Institutional Application](18-institutional-application.md),
  [the Policy Archive](22-policy-archive.md), and the
  [Specification Series](23-specification-series.md).
- **Thematic navigation:** Use the
  [Functional Collections Index](collections/README.md) to browse the
  corpus by topic.

These are suggested routes, not prerequisites.

## Main Document Map

### Front Matter and Editorial Material

| Document | Focus |
|---|---|
| [00-author-front-matter.md](00-author-front-matter.md) | Author's Front Matter and Reading Guide |
| [00-front-matter.md](00-front-matter.md) | Front Matter, Publishing Hierarchy, and Taxonomies |
| [EDITORIAL-REPORT.md](EDITORIAL-REPORT.md) | Editorial and Structural Build Report |

### Numbered Parts

| Part | Document | Focus |
|---|---|---|
| I | [01-core-book.md](01-core-book.md) | The Core Book |
| II | [02-formalization.md](02-formalization.md) | Formalization |
| III | [03-safety-rationale.md](03-safety-rationale.md) | Safety Rationale for Adversarial Scenarios |
| IV | [04-ags-architecture.md](04-ags-architecture.md) | AGS: Accountability-Gated Systems |
| V | [05-ocm-orb.md](05-ocm-orb.md) | OCM: The Orb Communicator Model |
| VI | [06-inner-shell.md](06-inner-shell.md) | The AI Inner Shell |
| VII | [07-addressing-topology.md](07-addressing-topology.md) | Addressing, Rotation, and Spherical Topology |
| VIII | [08-operator-model.md](08-operator-model.md) | The Operator Model |
| IX | [09-disc-lifecycle.md](09-disc-lifecycle.md) | Disc Primitives, Routing, and Lifecycle |
| X | [10-ags-conformance.md](10-ags-conformance.md) | AGS+ Layering and Conformance |
| XI | [11-accessory-pack.md](11-accessory-pack.md) | The AGS Accessory Pack |
| XII | [12-ground-zero.md](12-ground-zero.md) | Ground-0: Phase Detection, Audits, and the Duty Collation Ledger |
| XIII | [13-whyland.md](13-whyland.md) | The Whyland Standards |
| XIV | [14-nab-compendium.md](14-nab-compendium.md) | Neural Atomic Bodies Compendium |
| XV | [15-hmkh-controls.md](15-hmkh-controls.md) | Keyed Human–Machine Hybrid Controls |
| XVI | [16-threat-modeling.md](16-threat-modeling.md) | Threat Modeling and Context-Dependent Guarantees |
| XVII | [17-atomic-bodies.md](17-atomic-bodies.md) | Atomic Body Classes and Reactor Doctrine |
| XVIII | [18-institutional-application.md](18-institutional-application.md) | Institutional Application |
| XIX | [19-research-papers.md](19-research-papers.md) | Flagship Research: Accountability in Keyed Human–Machine Hybrid Systems |
| XX | [20-supply-chain.md](20-supply-chain.md) | Supply Chain and Implanted-Device Threat Research |
| XXI | [21-microconvergence.md](21-microconvergence.md) | MicroConvergence and Signal Encoding |
| XXII | [22-policy-archive.md](22-policy-archive.md) | Supporting Policy and Governance Research Archive |
| XXIII | [23-specification-series.md](23-specification-series.md) | Specification Series |
| XXIV | [24-the-novel.md](24-the-novel.md) | Book II Preview: *The Grand River Foundation* (Fictional Companion Novel) |
| XXV | [25-additional-specs.md](25-additional-specs.md) | Anti-Denial of Justice, Labor Attribution, and NAB I/O Mapping |
| XXVI | [26-anthropic-b-side.md](26-anthropic-b-side.md) | Incident Record and External Audit: Anthropic PBC (B Side) |
| XXVII | [27-whole-corpus.md](27-whole-corpus.md) | Whole Corpus / Complete Work |

### Reference Modules

Modules are library documents that sit beside the numbered parts without
taking a part number. Each one states its own provenance class, status
taxonomy, and evidence status; none of them alters the normative authority of
the parts they reference.

| Module | Document | Focus |
|---|---|---|
| `grand-architecture` | [modules/grand-architecture.md](modules/grand-architecture.md) | **The Grand Architecture** — the Convergence-era infrastructure architecture: six layers (`GA-0`–`GA-5`), the `0•100•000•NNNN` instance registry, canonical quantity anchors, the planning timeline, and seven `GA-INV` invariants. `FICTION` (`NARRATIVE_SANDBOX`) |
| `uts-reference` | [modules/uts.md](modules/uts.md) | Universal Timekeeping System — corrected duration units, `UDay` vs. `UDate`, and the browser implementation. `DERIVATIVE_BUILD` |
| `convergence-institutions` | [modules/convergence-institutions.md](modules/convergence-institutions.md) | GELPA, Celestial Engineers, and Quantum Librarians as fictional setting bodies. `FICTION` (`NARRATIVE_SANDBOX`) |

## Functional Collections

The collections provide topic-based routes through the numbered corpus.
See each collection guide for its scope and contents.

| Collection | Guide | Focus |
|---|---|---|
| Index | [collections/README.md](collections/README.md) | Functional Collections Index |
| I | [01-foundations](collections/01-foundations/README.md) | Foundational Doctrine and Core Book |
| II | [02-ags-ocm-core](collections/02-ags-ocm-core/README.md) | AGS+ and Orb Communicator Architecture |
| III | [03-ground-zero-nab](collections/03-ground-zero-nab/README.md) | Ground-0 Phase Detection and Neural Atomic Bodies |
| IV | [04-flagship-research](collections/04-flagship-research/README.md) | Flagship Keyed Human–Machine Research, Threat Models, Supporting Policy, and corrected UTS reference module |
| V | [05-constitutional-specs](collections/05-constitutional-specs/README.md) | Defensive Constitutional Specification Series |
| VI | [06-incident-audits](collections/06-incident-audits/README.md) | Incident Record and External Platform Audits |
| VII | [07-companion-fiction-and-corpus](collections/07-companion-fiction-and-corpus/README.md) | Book II Fictional Companion Preview, The Grand Architecture module, Convergence institution reference module, and Part XXVII Whole Corpus |

## Status and Evidence

Part numbering and collection placement are editorial; they do not indicate
implementation order or maturity. This index assigns no per-document
`Planned`, `Draft`, `In Progress`, or `Stable` status. A document's presence
here does not by itself establish implementation, operational readiness,
independent validation, or empirical confirmation. Consult each document
for its scope, assumptions, evidence, citations, and stated status. If a
status is not stated, treat it as unspecified.

## Related Documentation

- [HarshalOS documentation directory](../)
- [HarshalOS repository README](../../README.md)
