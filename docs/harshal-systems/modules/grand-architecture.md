# The Grand Architecture — Convergence-era infrastructure architecture module

document_id: `GRAND-ARCHITECTURE-REF-20261002`  
provenance_class: `FICTION`  
status_taxonomy: `NARRATIVE_ARCHITECTURE_MODULE`  
evidence_status: `NARRATIVE_SANDBOX`  
research_layer: `PUBLIC_RESEARCH_SUMMARY`  
source: `updates/2026-10-02/` (UpdateOct2) — Grand River Flow Model, Universal Timekeeping System, Convergence Institutions, and the Storm-0558 public-source review; reconciled by [`CONTINUITY-AUDIT.md`](../../../updates/2026-10-02/CONTINUITY-AUDIT.md) and [`CANONICAL-NUMBERS.md`](../../../updates/2026-10-02/02-Frameworks/Grand-River-Flow-Model/CANONICAL-NUMBERS.md).

## 1. What The Grand Architecture is

**The Grand Architecture (GA)** is the single named architecture that binds the four lineages
delivered in the 2026-10-02 update into one structure, and binds that structure back to HarshalOS's
accountability invariants. The update arrived as four unrelated families of material — a
megastructure flow model, a timekeeping system, three institutions, and a threat-intelligence
review — with no architecture stating how they compose. The Grand Architecture is that missing
composition rule.

GA is an **architecture of addressability and provenance, not of concrete**. It does not design a
dam, a city, an aqueduct, a reactor, or an agency. It states: what layers the setting has, what
address each layer occupies, which numbers are canonical, what invariants keep those numbers
honest, and what the whole structure is *not* allowed to become inside HarshalOS.

**Boundary.** GA is `FICTION` (`NARRATIVE_SANDBOX`) with `DERIVATIVE_BUILD` arithmetic anchors. It
is not an engineering design, feasibility finding, water-rights analysis, environmental review,
permit, construction schedule, procurement plan, or claim that any described work exists, is
authorized, or can be built. No GA statement is normative: nothing here enters
[`specs/normative/`](../../../specs/normative/canonical-model.md), and GA confers no authority,
identity, or production capability on anything.

## 2. Why a new architecture, and where it sits

Book I already contains the two load-bearing architectures: **AGS** (Part IV, accountability-gated
systems) and **OCM** (Part V–VII, radiative addressing and the ℤ₃₆₀ ring). Those are
`CANONICAL_SOURCE` / `NORMATIVE_SPEC`. GA is deliberately *subordinate* to them: it is a
Convergence-era application surface, not a peer or a replacement.

| Relation | Statement |
|---|---|
| GA → AGS | GA inherits the gating equation `L(t) = H(t) × f(A(t), R(t), S(t))` unchanged. No GA layer raises `L`, lowers `τ`, or supplies `H(t)`. |
| GA → OCM | Every GA component is *named* by an OCM address. Addressing names things; it does not authorize them. |
| GA → Ground-0 | GA institutions and infrastructure are auditable *subjects*. A megastructure that cannot name a responsible human principal is `AMBIGUOUS`, not `GSRB`. |
| GA → Book II | The novel remains the work in active production; GA is library scaffolding drawn from it. Where GA and the novel's prose diverge, the novel wins and GA is amended. |

## 3. The six layers

| Layer | Name | Setting content | Named addresses (examples) | Provenance |
|---|---|---|---|---|
| **GA-0** | Foundation | Grand River Hyperstructure: modular dam series, turbines, SMR array, flow matrix, secure compute enclave | `0•100•000•0091` turbines · `0•100•000•0248` SMR array · `0•100•000•0249` flow matrix · `0•100•000•0179–0181` Inner Shell enclave | `FICTION` |
| **GA-1** | Conveyance | The Grand Aqueduct: three tiers — open fresh-water channel, seawater purification pipeline, gravity-fed purified stream | `0•100•000•0155` municipal distribution · `0•100•000•0156` desalination | `FICTION` |
| **GA-2** | Civic | Mistveil City: nine named levels, one 2100 population target, the "Human-Reactor" civic metaphor | `0•100•000•0113` New Capitol · `0•100•000•0318–0335` municipal uplinks | `FICTION` |
| **GA-3** | Institutional | Convergence institutions: GELPA, Celestial Engineers, Quantum Librarians | `0•100•000•0262–0279` research and education band | `FICTION` |
| **GA-4** | Temporal | Universal Timekeeping System: `US`/`UM`/`UH`/`UDay` durations and the approximate `UDate` coordinate | display-only; no address authority | `DERIVATIVE_BUILD` |
| **GA-5** | Assurance | Storm-0558 public-source review → SCAV++ conceptual crosswalk: claim ledger, evidence statuses, verification discipline | no address; research vocabulary only | `DERIVATIVE_BUILD` |

GA-0 through GA-3 are the setting's physical and civic body. GA-4 and GA-5 are its instrumentation:
one tells it what time it is, the other tells it what it is allowed to believe.

## 4. Address discipline

The registry is the setting's strongest continuity asset and GA keeps it intact:

- Form: `0•100•000•NNNN` — orb `100`, sector `000`, instance `NNNN`.
- Extent: **358 distinct instance values** are named in
  [`business plan/Grand Canyon Hydropower Render Spec.md`](../../../business%20plan/Grand%20Canyon%20Hydropower%20Render%20Spec.md),
  partitioned in the update's node mapping as roughly **180 / 120 / 60** across Tiers 1–3.
- `0•100•000•0000` is held by The Grand River Tribes, not by a machine; `0•100•000•0268` is
  Section 7 submerged command; `0•100•000•0176` is the Canyon de Chelly saltwater bio-reserve.

**Precision note (`GA-INV-002`).** The instance counter runs `0000`–`0359` and borrows the
360-count motif, but it occupies the **instance** field. The canonical ℤ₃₆₀ ring constrains the
**sector** field `DDD ∈ [000, 359]` (Part VII, `INV-Z360-001`). The update's documents sometimes
call the registry "the 360-node ring"; GA records the registry as a 358-entry instance namespace
inside sector `000` and keeps `360° ≡ 0° mod 360` as return-to-origin closure notation, never a
361st slot.

## 5. Canonical quantity anchors

[`CANONICAL-NUMBERS.md`](../../../updates/2026-10-02/02-Frameworks/Grand-River-Flow-Model/CANONICAL-NUMBERS.md)
is the controlling numeric reference, reproducible through
[`recalculate.py`](../../../updates/2026-10-02/02-Frameworks/Grand-River-Flow-Model/recalculate.py).
GA restates the load-bearing figures and inherits every caveat:

| Quantity | Canonical value | Status |
|---|---:|---|
| Workbook baseline throughput | 50,000,000 US gal/day = 189,270.589 m³/day = **2.190632 m³/s** | workbook assumption |
| Baseline line pumping input | **41.76 MW** (350 mi, 60 in, C=140, 1,219.2 m lift, 85%/95%) | calculated, route unsurveyed |
| Aggregate transfer sensitivity | 29.75 km³/year = **942.721 m³/s** → **431 parallel lines**, **17.96 GW** pump input | sensitivity only |
| Reservoir planning volume | **73 km³**; **169 days** to fill at a constant 5,000 m³/s with no outlet or loss | volume ÷ inflow arithmetic |
| Conditional hydro (historical sample) | 476 m³/s at 1,219.2 m gross → **5.69 GW** gross, **5.12 GW** at 90% | historical context, not an allocation |
| Non-hydro planning entry | 80 × 50 MWe = **4.00 GW** nameplate; conditional sum **9.12 GW** | assumed, not a deployment plan |
| Portfolio ambition | **1,000 GW** nameplate; **990.88 GW unallocated** against the 9.12 GW sum | ambition, not a plan |
| Mistveil 2100 target | **~80 million residents**; nine levels summing to 80 M | fictional planning distribution |
| Book II regional figure | ~40 million *served* across three nations | illustrative service count; **never added** to the city total |
| Timeline | 2026 baseline → first module **circa 2046** → 20-year planning windows → **2098 interim** milestone; **no final completion date** | planning targets |
| Head language | **1,200–2,500 ft** cumulative gross head across distinct stages in the first 40–60 years; **4,000 ft** long-range aggregate | not a dam-wall height or reservoir depth |

## 6. Architecture invariants

These are GA's own invariants. They constrain the fiction; they do not modify Book I.

1. **`GA-INV-001` — Scale is not sovereignty.** Population, installed capacity, reservoir volume,
   or structural height confer no legitimacy. A GA layer is an addressable object, never an
   authority source: `H(t)` still originates only at Center Origin (`0•000•000•0000`), and
   legitimacy is delegated, never migrated (`INV-LEGIT-001`).
2. **`GA-INV-002` — Address discipline.** Every GA component carries an OCM address in the
   documented form; the instance namespace is not the ℤ₃₆₀ sector ring; naming a component creates
   no authority for it.
3. **`GA-INV-003` — Conservation before narrative.** Head, flow, and energy are counted once.
   Serial tiers do not multiply head; a closed loop is a net consumer, not a generator; the same
   water may not be counted at two stages. Where a narrative figure and a mass balance disagree,
   the mass balance wins and the narrative figure is labelled superseded.
4. **`GA-INV-004` — Provenance precedence.** Every GA claim carries a provenance class. No GA
   statement is promoted to `specs/normative/`, to the kernel, or to a production control.
5. **`GA-INV-005` — Evidence discipline.** Incident-derived material keeps its claim status
   (`CONFIRMED`, `ATTRIBUTED_HYPOTHESIS`, `UNKNOWN`) and its source. A later-challenged hypothesis
   is never restated as a confirmed root cause.
6. **`GA-INV-006` — No deployment, no consent implied.** GA asserts no permit, water right,
   feasibility finding, construction authorization, or consultation. Named real places, agencies,
   universities, and companies are setting references; none has been consulted, and none is
   represented as participating.
7. **`GA-INV-007` — Book II precedence for continuity.** The architecture is the library; the novel
   is the work in active production. GA is amended to follow the novel, never the reverse.

## 7. Temporal layer binding (GA-4)

GA uses the corrected UTS reference: `UDay` is a **duration** (86,400 `US` ≈ 288.199378251 μs) and
`UDate` is an **absolute coordinate** expressed in `UY` since an explicitly approximate epoch. The
overloaded `UD` shorthand is retired. UTS is display-only in HarshalOS: it never controls or
attests Ground-0, provenance, Human Key state, freshness, PDH, authorization, refusal, the
Permanent Ledger of Vows, or trusted system time. See
[`modules/uts.md`](uts.md).

## 8. Assurance layer binding (GA-5)

The Storm-0558 package contributes method, not incident findings. Its public-source baseline is
Microsoft's 2023-07-11 disclosure, Microsoft's 2023-09-06 technical account (a **leading
hypothesis**), and the CISA CSRB's 2024-03-20 review (which found no evidence that the impacted key
was in or exfiltrated from a crash dump). GA therefore requires a versioned claim ledger — source,
date, exact claim, evidence status, later qualification, reviewer — and keeps unrelated material
(the September 2024 pager supply-chain attack; Salt Typhoon) attributed and separate. The
conceptual crosswalk to catalogue entries #003 (SCAV++ Output Verification Engine) and #008
(Stingray Counter Protocol) is a review lens; **#008 is not a Storm-0558 finding**.

## 9. Institutional layer (GA-3)

GELPA, Celestial Engineers, and Quantum Librarians are fictional bodies in the Convergence
setting. Their oversight relationships, fleets, manufacturing methods, and storage technologies are
story propositions. See [`modules/convergence-institutions.md`](convergence-institutions.md). GA
adds one rule: an institution in this layer may be *addressed and audited*, and may never be cited
as the source of a real obligation, consent, or authorization.

## 10. Implementation in this repository

- [`docs/harshal-systems/modules/grand-architecture.md`](grand-architecture.md) — this module.
- `js/grand-architecture-data.js` — the layer, invariant, and canonical-anchor data the OS app
  renders; figures are cross-checked against the canonical numbers card by
  `tests/grand-architecture-test.mjs`.
- `js/apps-grand.js` and `css/grand-architecture.css` — the read-only **Grand Architecture**
  desktop app. It writes no ledger row, changes no state, and calls no HOS authority capability.
- [`updates/2026-10-02/`](../../../updates/2026-10-02/README.md) — the source package, its
  continuity audit, and the canonical numbers card.

## 11. What The Grand Architecture is not

Not a construction program. Not an energy plan. Not a government. Not a threat feed or detection
package. Not a normative specification, and not evidence that any HarshalOS control has been
deployed, tested against a real actor, or approved as policy. Not a claim about the Colorado River,
the Grand Canyon, Baja California, or any named institution. It is a library architecture for a
fictional setting, kept numerically honest on purpose.

**Publishing hierarchy:** "The architecture (Book I) is the library. The novel (Book II) is the work
in active production."
